#!/usr/bin/env node
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import readline from 'readline';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = path.dirname( fileURLToPath( import.meta.url ) );
const REPO_ROOT = path.resolve( SCRIPT_DIR, '..' );
const SCHEMA_PATH = path.join(
	REPO_ROOT,
	'bin/rtc-browser-analysis-tier.schema.json'
);
const ANALYSIS_GUARD_BIN = path.join(
	REPO_ROOT,
	'bin/rtc-browser-fuzz-analysis-guard-bin'
);
const SHARED_PATH = [
	ANALYSIS_GUARD_BIN,
	path.join( REPO_ROOT, 'node_modules/.bin' ),
	process.env.PATH,
]
	.filter( Boolean )
	.join( path.delimiter );

const args = process.argv.slice( 2 );

if ( args.includes( '--help' ) || args.includes( '-h' ) ) {
	process.stdout.write(
		[
			'Usage: node bin/rtc-browser-fuzz-analysis-tier.mjs <run-output-dir> [--once]',
			'',
			'Scans an RTC browser fuzz triage watcher state file and launches',
			'high-parallel Codex analysis-only jobs for queued signatures.',
			'',
			'Environment:',
			'  RTC_FUZZ_ANALYSIS_INTERVAL_MS=30000',
			'  RTC_FUZZ_ANALYSIS_MAX_PARALLEL=12',
			'  RTC_FUZZ_ANALYSIS_CODEX_TIMEOUT_MS=2700000',
			'  RTC_FUZZ_ANALYSIS_STATE_DIR=<run>/.triage-watcher/analysis-tier',
		].join( '\n' ) + '\n'
	);
	process.exit( 0 );
}

const ONCE = args.includes( '--once' );
const positionalArgs = args.filter( ( arg ) => ! arg.startsWith( '--' ) );
const RUN_DIR = path.resolve(
	positionalArgs[ 0 ] ?? process.env.RTC_FUZZ_TRIAGE_RUN_DIR ?? ''
);

if ( ! RUN_DIR ) {
	throw new Error(
		'Expected a run output directory argument or RTC_FUZZ_TRIAGE_RUN_DIR.'
	);
}

const TRIAGE_STATE_DIR = path.join( RUN_DIR, '.triage-watcher' );
const TRIAGE_STATE_PATH = path.join( TRIAGE_STATE_DIR, 'state.json' );
const STATE_DIR =
	process.env.RTC_FUZZ_ANALYSIS_STATE_DIR ??
	path.join( TRIAGE_STATE_DIR, 'analysis-tier' );
const STATE_PATH = path.join( STATE_DIR, 'state.json' );
const WATCH_INTERVAL_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_ANALYSIS_INTERVAL_MS',
	30000
);
const MAX_PARALLEL = getPositiveIntegerEnv(
	'RTC_FUZZ_ANALYSIS_MAX_PARALLEL',
	12
);
const CODEX_TIMEOUT_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_ANALYSIS_CODEX_TIMEOUT_MS',
	45 * 60 * 1000
);
const MAX_ATTEMPTS = getPositiveIntegerEnv(
	'RTC_FUZZ_ANALYSIS_MAX_ATTEMPTS',
	2
);
const MAX_PER_FAMILY = getPositiveIntegerEnv(
	'RTC_FUZZ_ANALYSIS_MAX_PER_FAMILY',
	2
);
const TRANSIENT_CODEX_STARTUP_BACKOFF_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_ANALYSIS_TRANSIENT_CODEX_STARTUP_BACKOFF_MS',
	5 * 60 * 1000
);
const CONTEXT_DUMP_RECOVERY_MAX_ATTEMPTS = getPositiveIntegerEnv(
	'RTC_FUZZ_ANALYSIS_CONTEXT_DUMP_RECOVERY_MAX_ATTEMPTS',
	1
);
const MAX_COMPACT_EXAMPLES = getPositiveIntegerEnv(
	'RTC_FUZZ_ANALYSIS_MAX_COMPACT_EXAMPLES',
	4
);

const activeJobs = new Map();
let shuttingDown = false;

const TRANSIENT_CODEX_STARTUP_PATTERNS = [
	'Failed to load cloud requirements',
	'workspace-managed policies',
	'failed to refresh available models',
	'error sending request for url (https://chatgpt.com/backend-api/codex/models',
	'http/request failed: error sending request for url',
	'failed to connect to websocket',
	'failed to lookup address information',
	'stream disconnected before completion',
	'wss://chatgpt.com/backend-api/codex/responses',
];

function getPositiveIntegerEnv( name, defaultValue ) {
	const raw = process.env[ name ];
	if ( raw === undefined || raw === '' ) {
		return defaultValue;
	}

	const parsed = Number.parseInt( raw, 10 );
	if ( ! Number.isFinite( parsed ) || parsed <= 0 ) {
		throw new Error( `${ name } must be a positive integer.` );
	}

	return parsed;
}

async function readJson( filePath, fallback ) {
	try {
		return JSON.parse( await fs.readFile( filePath, 'utf8' ) );
	} catch ( error ) {
		if ( error.code === 'ENOENT' ) {
			return fallback;
		}

		throw error;
	}
}

async function writeJson( filePath, value ) {
	await fs.mkdir( path.dirname( filePath ), { recursive: true } );
	const tmpPath = `${ filePath }.tmp-${
		process.pid
	}-${ Date.now() }-${ Math.random().toString( 36 ).slice( 2 ) }`;
	await fs.writeFile( tmpPath, JSON.stringify( value, null, 2 ) + '\n' );
	await fs.rename( tmpPath, filePath );
}

async function readState() {
	return readJson( STATE_PATH, {
		version: 1,
		runDir: RUN_DIR,
		stateDir: STATE_DIR,
		startedAt: new Date().toISOString(),
		updatedAt: null,
		jobs: {},
	} );
}

async function writeState( state ) {
	state.updatedAt = new Date().toISOString();
	await writeJson( STATE_PATH, state );
}

function isProcessAlive( pid ) {
	if ( ! pid ) {
		return false;
	}

	try {
		process.kill( pid, 0 );
		return true;
	} catch {
		return false;
	}
}

async function reconcileJobs( state ) {
	for ( const job of Object.values( state.jobs ) ) {
		const failureKind = await classifyFailedJob( job );
		if ( failureKind ) {
			job.failureKind = failureKind;
		}

		if (
			job.status === 'failed' &&
			( await isTransientCodexStartupFailure( job ) )
		) {
			markTransientCodexStartupRetry( job );
			continue;
		}

		if (
			job.status === 'failed' &&
			failureKind === 'codex-context-dump-stdin' &&
			( job.contextDumpRecoveryAttempts ?? 0 ) <
				CONTEXT_DUMP_RECOVERY_MAX_ATTEMPTS
		) {
			markContextDumpRecoveryRetry( job );
			continue;
		}

		if ( job.status !== 'running' ) {
			continue;
		}

		if ( fsSync.existsSync( job.resultPath ) ) {
			job.status = 'completed';
			job.pid = null;
			job.completedAt = job.completedAt ?? new Date().toISOString();
			continue;
		}

		if ( isProcessAlive( job.pid ) ) {
			continue;
		}

		job.pid = null;
		job.status = job.attempts >= MAX_ATTEMPTS ? 'failed' : 'retry';
		job.completedAt = new Date().toISOString();
		job.durationMs =
			Date.parse( job.completedAt ) - Date.parse( job.startedAt );
		job.exitCode ??= null;
		job.signal ??= 'process-missing';
		job.timedOut ??= false;
		await writeLauncherFailure( job, {
			code: job.exitCode,
			resultPath: job.resultPath,
			signal: job.signal,
			timedOut: job.timedOut,
		} );
	}
}

async function classifyFailedJob( job ) {
	if ( job?.status !== 'failed' ) {
		return null;
	}

	let stderr = '';
	if ( job.stderrPath ) {
		try {
			stderr = await fs.readFile( job.stderrPath, 'utf8' );
		} catch {
			stderr = '';
		}
	}

	if ( stderr.includes( 'Reading additional input from stdin' ) ) {
		return 'codex-context-dump-stdin';
	}

	if ( stderr.includes( 'rtc analysis guard: refusing' ) ) {
		return 'analysis-guard-refusal';
	}

	return null;
}

async function isTransientCodexStartupFailure( job ) {
	if ( ! job?.stderrPath ) {
		return false;
	}

	let stderr;
	try {
		stderr = await fs.readFile( job.stderrPath, 'utf8' );
	} catch {
		return false;
	}

	return TRANSIENT_CODEX_STARTUP_PATTERNS.some( ( pattern ) =>
		stderr.includes( pattern )
	);
}

function markTransientCodexStartupRetry( job ) {
	job.pid = null;
	job.status = 'retry';
	job.transientFailureCount = ( job.transientFailureCount ?? 0 ) + 1;
	job.transientFailureReason = 'codex-startup-connectivity';
	job.nextAttemptAt = new Date(
		Date.now() + TRANSIENT_CODEX_STARTUP_BACKOFF_MS
	).toISOString();
	job.attempts = Math.max( 0, ( job.attempts ?? 1 ) - 1 );
	job.completedAt = new Date().toISOString();
}

function markContextDumpRecoveryRetry( job ) {
	job.pid = null;
	job.status = 'retry';
	job.contextDumpRecoveryAttempts =
		( job.contextDumpRecoveryAttempts ?? 0 ) + 1;
	job.contextDumpRecoveredFromAttempts = job.attempts ?? 0;
	job.contextDumpRecoveryReason = 'codex-context-dump-stdin';
	job.nextAttemptAt = null;
	job.attempts = 0;
	job.completedAt = new Date().toISOString();
}

function getActiveJobHashes( state ) {
	const hashes = new Set( activeJobs.keys() );

	for ( const job of Object.values( state.jobs ) ) {
		if ( job.status === 'running' && isProcessAlive( job.pid ) ) {
			hashes.add( job.hash );
		}
	}

	return hashes;
}

function shouldAnalyzeSignature( signature, job ) {
	if ( ! signature?.hash ) {
		return false;
	}

	if (
		[
			'completed',
			'not-real',
			'infra',
			'known-infra',
			'no-realistic-repro',
		].includes( signature.status )
	) {
		return false;
	}

	if ( signature.status === 'bootstrap-stall' ) {
		return false;
	}

	if ( isStrictPreActionStartupSignature( signature ) ) {
		return false;
	}

	if ( signature.status === 'analysis-gated' ) {
		return false;
	}

	if ( ! job ) {
		return true;
	}

	if ( job.status === 'completed' || job.status === 'running' ) {
		return false;
	}

	if (
		job.status === 'retry' &&
		job.nextAttemptAt &&
		Date.parse( job.nextAttemptAt ) > Date.now()
	) {
		return false;
	}

	if ( job.status === 'failed' && job.attempts >= MAX_ATTEMPTS ) {
		return false;
	}

	return (
		job.status === 'queued' ||
		job.status === 'retry' ||
		job.status === 'failed'
	);
}

function sortSignaturesForAnalysis( a, b ) {
	const statusPriority = {
		queued: 0,
		retry: 1,
		running: 2,
	};
	const aPriority = statusPriority[ a.status ] ?? 3;
	const bPriority = statusPriority[ b.status ] ?? 3;

	if ( aPriority !== bPriority ) {
		return aPriority - bPriority;
	}

	return ( b.count ?? 0 ) - ( a.count ?? 0 );
}

async function launchQueuedAnalysisJobs( sourceState, state ) {
	const activeHashes = getActiveJobHashes( state );
	let familyLaunchCounts = null;
	const signatures = interleaveFirstSignaturePerFamily(
		Object.values( sourceState.signatures ?? {} )
			.filter( ( signature ) =>
				shouldAnalyzeSignature(
					signature,
					state.jobs[ signature.hash ]
				)
			)
			.sort( sortSignaturesForAnalysis )
	);

	for ( const signature of signatures ) {
		if ( activeHashes.size >= MAX_PARALLEL ) {
			return;
		}

		if ( activeHashes.has( signature.hash ) ) {
			continue;
		}

		familyLaunchCounts ??= getFamilyLaunchCounts( sourceState, state );
		const familyKey = signature.familyKey ?? signature.hash;
		if ( ( familyLaunchCounts.get( familyKey ) ?? 0 ) >= MAX_PER_FAMILY ) {
			continue;
		}

		await launchCodexAnalysisJob( sourceState, state, signature );
		activeHashes.add( signature.hash );
		familyLaunchCounts.set(
			familyKey,
			( familyLaunchCounts.get( familyKey ) ?? 0 ) + 1
		);
	}
}

function getFamilyLaunchCounts( sourceState, state ) {
	const signatureByHash = new Map(
		Object.values( sourceState.signatures ?? {} ).map( ( signature ) => [
			signature.hash,
			signature,
		] )
	);
	const counts = new Map();

	for ( const job of Object.values( state.jobs ?? {} ) ) {
		if ( ! [ 'completed', 'running' ].includes( job.status ) ) {
			continue;
		}

		const signature = signatureByHash.get( job.hash );
		const familyKey = signature?.familyKey ?? job.familyKey ?? job.hash;
		if ( ! familyKey ) {
			continue;
		}
		counts.set( familyKey, ( counts.get( familyKey ) ?? 0 ) + 1 );
	}

	return counts;
}

function interleaveFirstSignaturePerFamily( signatures ) {
	const seenFamilies = new Set();
	const firstInFamily = [];
	const duplicateFamilyRest = [];

	for ( const signature of signatures ) {
		const familyKey = signature.familyKey ?? signature.hash;
		if ( seenFamilies.has( familyKey ) ) {
			duplicateFamilyRest.push( signature );
			continue;
		}

		seenFamilies.add( familyKey );
		firstInFamily.push( signature );
	}

	return [ ...firstInFamily, ...duplicateFamilyRest ];
}

function isStrictPreActionStartupSignature( signature ) {
	const facts = signature?.facts;
	if ( ! facts ) {
		return false;
	}

	const normalized = signature.normalized ?? '';
	const equivalenceClass = signature.equivalenceClass ?? '';
	const isStartupFamily = [
		'pre-action-bootstrap-stall',
		'pre-action-awareness-stall',
	].includes( equivalenceClass );
	const hasStartupText =
		/waitForCollaborationReady|collaboration to become ready|setPreferences|_wpCollaborationEnabled|page\.waitForFunction|waitForMutualDiscovery|mutual discovery|awareness/i.test(
			normalized
		);

	if ( ! isStartupFamily && ! hasStartupText ) {
		return false;
	}

	const lastHistoryPhase = String( facts.lastHistoryPhase ?? '' );
	const hasStartupPhase =
		lastHistoryPhase === '' ||
		/seed|bootstrap|open|join|startup|setup|discovery|ready/i.test(
			lastHistoryPhase
		);

	return (
		facts.userCount === 0 &&
		! facts.lastAction &&
		hasStartupPhase &&
		( ! facts.lastHistoryStatus || facts.lastHistoryStatus === 'fail' ) &&
		( facts.reloadCount ?? 0 ) === 0 &&
		( facts.saveCheckpointCount ?? 0 ) === 0 &&
		facts.revisionEligible !== true &&
		( facts.faultTypes?.length ?? 0 ) === 0 &&
		( facts.operationWitnessActions?.length ?? 0 ) === 0 &&
		( facts.operationWitnessScopes?.length ?? 0 ) === 0 &&
		! facts.operationWitnessPhase &&
		[
			'timeout',
			'browser-closed',
			'unknown',
			'collaboration-non-convergence',
		].includes( facts.failureClass )
	);
}

async function launchCodexAnalysisJob( sourceState, state, signature ) {
	const jobDir = path.join( STATE_DIR, 'signatures', signature.hash );
	const resultPath = path.join( jobDir, 'result.json' );
	const promptPath = path.join( jobDir, 'prompt.txt' );
	const stdoutPath = path.join( jobDir, 'events.jsonl' );
	const stderrPath = path.join( jobDir, 'stderr.log' );
	const analysisPath = path.join( jobDir, 'analysis.md' );
	const handoffPath = path.join( jobDir, 'handoff.md' );
	const compactContextPath = path.join( jobDir, 'compact-context.json' );

	await fs.mkdir( jobDir, { recursive: true } );
	const previousJob = state.jobs[ signature.hash ];
	await archivePreviousAttemptArtifacts( jobDir, previousJob?.attempts ?? 0 );
	await fs.writeFile(
		path.join( jobDir, 'failure.json' ),
		JSON.stringify( signature, null, 2 ) + '\n'
	);
	await fs.writeFile(
		compactContextPath,
		JSON.stringify( await buildCompactContext( signature ), null, 2 ) + '\n'
	);
	await fs.writeFile(
		promptPath,
		buildCodexPrompt( sourceState, signature, {
			jobDir,
			analysisPath,
			compactContextPath,
			handoffPath,
		} )
	);

	const job = {
		hash: signature.hash,
		status: 'running',
		attempts: ( previousJob?.attempts ?? 0 ) + 1,
		contextDumpRecoveryAttempts:
			previousJob?.contextDumpRecoveryAttempts ?? 0,
		contextDumpRecoveredFromAttempts:
			previousJob?.contextDumpRecoveredFromAttempts ?? null,
		familyKey: signature.familyKey ?? signature.hash,
		pid: null,
		sourceStatus: signature.status,
		sourceCount: signature.count ?? 0,
		startedAt: new Date().toISOString(),
		completedAt: null,
		jobDir,
		resultPath,
		stdoutPath,
		stderrPath,
		analysisPath,
		compactContextPath,
		handoffPath,
		nextAttemptAt: null,
		timeoutMs: CODEX_TIMEOUT_MS,
		timedOut: false,
	};
	state.jobs[ signature.hash ] = job;
	await writeState( state );

	const child = spawn(
		'codex',
		[
			'exec',
			'-C',
			REPO_ROOT,
			'-m',
			'gpt-5.4',
			'-c',
			'model_reasoning_effort="high"',
			'--dangerously-bypass-approvals-and-sandbox',
			'--output-schema',
			SCHEMA_PATH,
			'--output-last-message',
			resultPath,
			'--json',
			await fs.readFile( promptPath, 'utf8' ),
		],
		{
			cwd: REPO_ROOT,
			env: {
				...process.env,
				PATH: SHARED_PATH,
				RTC_FUZZ_ANALYSIS_JOB_DIR: jobDir,
				RTC_FUZZ_ANALYSIS_REPO_ROOT: REPO_ROOT,
				RTC_FUZZ_ANALYSIS_RUN_DIR: RUN_DIR,
			},
			stdio: [
				'ignore',
				fsSync.openSync( stdoutPath, 'w' ),
				fsSync.openSync( stderrPath, 'w' ),
			],
		}
	);

	job.pid = child.pid;
	activeJobs.set( signature.hash, child );
	await writeState( state );

	let timedOut = false;
	const timeout = setTimeout( () => {
		if ( ! child.killed ) {
			timedOut = true;
			child.kill( 'SIGTERM' );
		}
	}, CODEX_TIMEOUT_MS );

	child.on( 'exit', async ( code, signal ) => {
		clearTimeout( timeout );
		activeJobs.delete( signature.hash );

		const latest = await readState();
		const latestJob = latest.jobs[ signature.hash ];
		if ( ! latestJob ) {
			return;
		}

		latestJob.pid = null;
		latestJob.exitCode = code;
		latestJob.signal = signal;
		latestJob.timedOut = timedOut;
		latestJob.completedAt = new Date().toISOString();
		latestJob.durationMs =
			Date.parse( latestJob.completedAt ) -
			Date.parse( latestJob.startedAt );
		if ( code === 0 && fsSync.existsSync( resultPath ) ) {
			latestJob.status = 'completed';
			latestJob.nextAttemptAt = null;
		} else if ( await isTransientCodexStartupFailure( latestJob ) ) {
			markTransientCodexStartupRetry( latestJob );
		} else {
			latestJob.status =
				latestJob.attempts >= MAX_ATTEMPTS ? 'failed' : 'retry';
			latestJob.nextAttemptAt = null;
			await writeLauncherFailure( latestJob, {
				code,
				resultPath,
				signal,
				timedOut,
			} );
		}
		await writeState( latest );
	} );
}

async function writeLauncherFailure( job, failure ) {
	await fs.writeFile(
		path.join( job.jobDir, 'launcher-failure.json' ),
		JSON.stringify(
			{
				completedAt: job.completedAt,
				durationMs: job.durationMs,
				exitCode: failure.code,
				resultPath: failure.resultPath,
				resultWritten: fsSync.existsSync( failure.resultPath ),
					signal: failure.signal,
					status: job.status,
					failureKind: job.failureKind ?? null,
					timeoutMs: job.timeoutMs,
					timedOut: failure.timedOut,
				},
			null,
			2
		) + '\n'
	);
}

async function archivePreviousAttemptArtifacts( jobDir, attempt ) {
	const stamp = `${ new Date()
		.toISOString()
		.replace( /[:.]/g, '-' ) }-attempt-${ attempt || 'unknown' }`;
	const artifactNames = [
		'analysis.md',
		'compact-context.json',
		'events.jsonl',
		'handoff.md',
		'launcher-failure.json',
		'prompt.txt',
		'result.json',
		'stderr.log',
	];

	await Promise.all(
		artifactNames.map( async ( artifactName ) => {
			const artifactPath = path.join( jobDir, artifactName );
			if ( ! fsSync.existsSync( artifactPath ) ) {
				return;
			}

			await fs.rename(
				artifactPath,
				path.join( jobDir, `${ artifactName }.${ stamp }` )
			);
		} )
	);
}

async function buildCompactContext( signature ) {
	const examples = [];
	for ( const example of ( signature.examples ?? [] ).slice(
		0,
		MAX_COMPACT_EXAMPLES
	) ) {
		examples.push( await buildCompactExampleContext( example ) );
	}

	return {
		signatureHash: signature.hash,
		familyKey: signature.familyKey ?? null,
		equivalenceClass: signature.equivalenceClass ?? null,
		status: signature.status ?? null,
		count: signature.count ?? 0,
		normalized: signature.normalized ?? null,
		examples,
	};
}

async function buildCompactExampleContext( example ) {
	const record = await readSummaryRecord( example );
	return {
		seed: example.seed,
		lineIndex: example.lineIndex,
		summaryPath: example.summaryPath,
		logPath: example.logPath,
		artifactsDir: example.artifactsDir,
		record,
	};
}

async function readSummaryRecord( example ) {
	if ( ! example.summaryPath || ! fsSync.existsSync( example.summaryPath ) ) {
		return null;
	}

	let currentLineIndex = 0;
	const input = readline.createInterface( {
		crlfDelay: Infinity,
		input: fsSync.createReadStream( example.summaryPath, 'utf8' ),
	} );

	for await ( const line of input ) {
		if ( ! line.trim() ) {
			currentLineIndex++;
			continue;
		}

		let record;
		try {
			record = JSON.parse( line );
		} catch {
			currentLineIndex++;
			continue;
		}

		const lineMatches =
			example.lineIndex === undefined ||
			currentLineIndex === example.lineIndex ||
			currentLineIndex + 1 === example.lineIndex;
		const seedMatches =
			example.seed === undefined || record.seed === example.seed;
		if ( lineMatches && seedMatches ) {
			input.close();
			return compactSummaryRecord( record, currentLineIndex );
		}

		currentLineIndex++;
	}

	return null;
}

function compactSummaryRecord( record, lineIndex ) {
	const coverage = record.behavioralCoverage?.[ 0 ] ?? {};
	const historyEvents = coverage.historyEvents ?? [];
	const invariantEvents = coverage.invariantEvents ?? [];
	const operationEvents = coverage.operationEvents ?? [];

	return sanitizeForPrompt( {
		lineIndex,
		kind: record.kind,
		seed: record.seed,
		label: record.label,
		code: record.code,
		signal: record.signal,
		ok: record.ok,
		timedOut: record.timedOut,
		durationMs: record.durationMs,
		classification: record.classification,
		logPath: record.logPath,
		replayPath: record.replayPath,
		artifactsDir: record.artifactsDir,
		outputExcerpt: excerptFailureOutput( record.output ),
		behavioralCoverageSummary: record.behavioralCoverageSummary,
		coverage: {
			actionProfile: coverage.actionProfile,
			actions: coverage.actions,
			blockStats: record.blockStats,
			cdpCoverage: coverage.cdpCoverage ?? record.cdpCoverage,
			collaboratorMode: coverage.collaboratorMode,
			disableParserStress: coverage.disableParserStress,
			disableReload: coverage.disableReload,
			disableRevisionRestore: coverage.disableRevisionRestore,
			disableSyncFaults: coverage.disableSyncFaults,
			faults: coverage.faults,
			initialContentProfile: coverage.initialContentProfile,
			lifecycleEvents: coverage.lifecycleEvents,
			reloadStep: coverage.reloadStep,
			reloads: coverage.reloads,
			revisionRestore: coverage.revisionRestore,
			saveCheckpointSteps: coverage.saveCheckpointSteps,
			status: coverage.status,
			transport: coverage.transport,
			userCount: coverage.userCount,
		},
		historyTail: historyEvents.slice( -12 ),
		failedHistory: historyEvents
			.filter( ( event ) => event.status === 'fail' )
			.slice( -6 ),
		failedInvariants: invariantEvents
			.filter( ( event ) => event.status && event.status !== 'ok' )
			.slice( -12 ),
		notableOperationEvents: operationEvents
			.filter( ( event ) =>
				[ 'missing', 'fail', 'invalidated', 'retired' ].includes(
					event.status
				)
			)
			.slice( -16 ),
	} );
}

function excerptFailureOutput( output ) {
	if ( ! output ) {
		return null;
	}

	const text = String( output ).replace( /\u001b\[[0-9;]*m/g, '' );
	const failureStart = text.search( /\n\s*1\)|Error:|TimeoutError:/ );
	const start =
		failureStart === -1 ? Math.max( 0, text.length - 2400 ) : failureStart;
	return text.slice( start, start + 4000 );
}

function sanitizeForPrompt( value, depth = 0 ) {
	if ( value === null || value === undefined ) {
		return value;
	}

	if ( typeof value === 'string' ) {
		return value.length > 1200
			? `${ value.slice( 0, 1200 ) }...[truncated ${ value.length } chars]`
			: value;
	}

	if ( typeof value !== 'object' ) {
		return value;
	}

	if ( depth > 5 ) {
		return '[truncated-depth]';
	}

	if ( Array.isArray( value ) ) {
		return value.slice( 0, 24 ).map( ( entry ) =>
			sanitizeForPrompt( entry, depth + 1 )
		);
	}

	return Object.fromEntries(
		Object.entries( value ).map( ( [ key, entry ] ) => [
			key,
			sanitizeForPrompt( entry, depth + 1 ),
		] )
	);
}

function buildCodexPrompt( sourceState, signature, paths ) {
	const examples = ( signature.examples ?? [] )
		.map(
			( example ) =>
				`- ${ example.summaryPath }:${ example.lineIndex } seed=${ example.seed } log=${ example.logPath } artifacts=${ example.artifactsDir }`
		)
		.join( '\n' );
	const currentCounts = {};
	for ( const sourceSignature of Object.values(
		sourceState.signatures ?? {}
	) ) {
		currentCounts[ sourceSignature.status ] =
			( currentCounts[ sourceSignature.status ] ?? 0 ) + 1;
	}
	const related = getRelatedAnalysisGateSummaries( sourceState, signature );

	return [
		'You are a high-parallel, analysis-only Codex worker for a Gutenberg RTC browser fuzz run.',
		`Repository: ${ REPO_ROOT }`,
		`Fuzz run directory: ${ RUN_DIR }`,
		`Triage watcher state: ${ TRIAGE_STATE_PATH }`,
		`Analysis job directory: ${ paths.jobDir }`,
		`Failure signature: ${ signature.hash }`,
		`Semantic family key: ${ signature.familyKey ?? 'unknown' }`,
		`Equivalence class: ${ signature.equivalenceClass ?? 'unknown' }`,
		`Current watcher status counts: ${ JSON.stringify( currentCounts ) }`,
		`Related analysis-gated signatures in this run: ${
			related || '(none)'
		}`,
		'',
			'Hard constraint: do not run Playwright, Chrome, npm test, npm run test:e2e, wp-env, docker, or any browser/repro command. This tier is for Codex-heavy thinking only.',
			`Pre-extracted compact context: ${ paths.compactContextPath }`,
			'Start with the compact context file. It contains bounded summaries of the failure examples so you should not need to inspect raw summary/event streams.',
			'Keep filesystem searches scoped to this run directory, this analysis job directory, and directly relevant source files. Do not scan historical artifact trees under test/e2e/artifacts or unrelated old fuzz runs.',
			'Do not run broad `find` or `rg` scans rooted at the repository root, `artifacts/rtc-browser-fuzz`, `test/e2e/artifacts`, or parent directories. Search exact example paths, this run directory, this job directory, and specific source files discovered with `git ls-files` or direct paths.',
			'Do not dump whole summary/event streams or large Playwright error-context files. Never run `cat`, `sed`, `head`, or `tail` directly on `summary.ndjson`, `events.ndjson`, `events.jsonl`, or large files under the fuzz artifacts tree; use the compact context file or compact extractor instead. Do not bypass the guard wrappers with absolute paths such as `/bin/cat` or `/usr/bin/sed`.',
			'When searching trace/network data, always bound output with a specific pattern plus `rg -m 40` or an equivalent small script. Do not emit broad trace/network payloads into the Codex event log.',
			`Compact summary extractor: node bin/rtc-browser-fuzz-extract-summary-record.mjs <summary.ndjson> --seed ${
				signature.examples?.[ 0 ]?.seed ?? '<seed>'
			}`,
			'Allowed work: inspect compact context, small text logs, small error-context excerpts, trace zip metadata/files, source code, existing artifacts from this run, and other analysis-tier outputs from this run. You may use shell commands such as rg, sed, find, unzip, compact node scripts that only read files, and git commands that only read history.',
		'',
		'Failure signature text:',
		signature.normalized,
		'',
		'Examples:',
		examples || '(none)',
		'',
		'Write these durable artifacts before returning:',
		`- ${ paths.analysisPath }: concise analysis, evidence, likely classification, duplicate candidates, and why.`,
		`- ${ paths.handoffPath }: a concrete handoff plan for the lower-parallel deep-triage/repro tier, including what browser repro to attempt if needed.`,
		'',
		'Classify whether this looks like a real correctness bug, infra/harness issue, duplicate of another signature, or uncertain. Prefer specific evidence over generic guesses.',
		'Be duplicate-aggressive: if this is likely real but materially the same mechanism as an existing signature in this run, set isDuplicateOf, shouldDeepTriage=false, and recommendedTriageAction="merge_with_duplicate". Do not spend lower-parallel browser-heavy triage on another variant unless it gives a cleaner repro, a higher user-hit likelihood score, or a genuinely new mechanism.',
		'For pre-action startup/discovery failures with no editor actions and no users successfully joined, prefer classification="likely_infra", shouldDeepTriage=false, and recommendedTriageAction="suppress_as_infra" unless there is strong product evidence.',
		'Score user-hit likelihood as userHitLikelihoodScore from 0 to 5, where 0 means harness-only/not user-visible, 1 means very rare or developer-only, 2 means uncommon edge workflow, 3 means plausible normal collaborative editing workflow, 4 means common workflow or common content shape, and 5 means very likely in default/common use. Explain the score in userHitLikelihoodRationale.',
		'If this needs browser reproduction, provide a realistic Playwright/manual repro plan, but do not run it.',
		'Output only JSON matching the schema.',
	].join( '\n' );
}

function getRelatedAnalysisGateSummaries( sourceState, signature ) {
	const familyKey = signature.familyKey ?? null;
	const equivalenceClass = signature.equivalenceClass ?? null;
	const summaries = [];

	for ( const sourceSignature of Object.values(
		sourceState.signatures ?? {}
	) ) {
		if ( sourceSignature.hash === signature.hash ) {
			continue;
		}

		const gate = sourceSignature.analysisGate;
		if ( ! gate ) {
			continue;
		}

		if (
			sourceSignature.familyKey !== familyKey &&
			sourceSignature.equivalenceClass !== equivalenceClass
		) {
			continue;
		}

		summaries.push(
			`- ${ sourceSignature.hash }: status=${
				sourceSignature.status
			} class=${ gate.classification } action=${
				gate.recommendedTriageAction
			} userHit=${ gate.userHitLikelihoodScore ?? 'unknown' } type=${
				gate.distinctBugType ?? 'unknown'
			} duplicateOf=${ gate.isDuplicateOf ?? 'none' } summary=${
				gate.summary ?? ''
			}`
		);
	}

	return summaries.slice( 0, 20 ).join( '\n' );
}

async function runScanCycle() {
	const sourceState = await readJson( TRIAGE_STATE_PATH, null );
	if ( ! sourceState ) {
		throw new Error(
			`Missing triage watcher state at ${ TRIAGE_STATE_PATH }`
		);
	}

	const state = await readState();
	await reconcileJobs( state );
	await launchQueuedAnalysisJobs( sourceState, state );
	await writeState( state );

	const counts = {};
	for ( const job of Object.values( state.jobs ) ) {
		counts[ job.status ] = ( counts[ job.status ] ?? 0 ) + 1;
	}

	process.stdout.write(
		`[${ new Date().toISOString() }] sourceSignatures=${
			Object.keys( sourceState.signatures ?? {} ).length
		} analysisJobs=${ Object.keys( state.jobs ).length } active=${
			getActiveJobHashes( state ).size
		} counts=${ JSON.stringify( counts ) }\n`
	);
}

async function main() {
	await fs.mkdir( STATE_DIR, { recursive: true } );

	process.on( 'SIGINT', () => {
		shuttingDown = true;
	} );
	process.on( 'SIGTERM', () => {
		shuttingDown = true;
	} );

	do {
		await runScanCycle();

		if ( ONCE ) {
			break;
		}

		await new Promise( ( resolve ) =>
			setTimeout( resolve, WATCH_INTERVAL_MS )
		);
	} while ( ! shuttingDown );
}

main().catch( ( error ) => {
	process.stderr.write( `${ error.stack ?? error.message }\n` );
	process.exitCode = 1;
} );
