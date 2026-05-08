#!/usr/bin/env node

import fs from 'fs/promises';
import fsSync from 'fs';
import crypto from 'crypto';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const REPO_ROOT = path.resolve(
	path.dirname( fileURLToPath( import.meta.url ) ),
	'..'
);
const SCHEMA_PATH = path.join(
	REPO_ROOT,
	'bin/rtc-browser-deep-triage.schema.json'
);
const LOCAL_NODE_BIN = path.join(
	REPO_ROOT,
	'.tooling/node-v20.19.0-darwin-arm64/bin'
);
const SHARED_PATH = [
	LOCAL_NODE_BIN,
	path.join( REPO_ROOT, 'node_modules/.bin' ),
	process.env.PATH ?? '',
].join( path.delimiter );

const args = process.argv.slice( 2 );
const DAEMON = args.includes( '--daemon' );
const GATE_ONLY = args.includes( '--gate-only' );

if ( args.includes( '--help' ) || args.includes( '-h' ) ) {
	process.stdout.write(
		[
			'Usage: node bin/rtc-browser-fuzz-triage-watcher.mjs <run-output-dir> [--once] [--daemon] [--gate-only]',
			'',
			'Scans RTC browser fuzz artifacts, dedupes failures, and launches',
			'independent Codex deep-triage jobs for distinct failure signatures.',
			'',
			'Environment:',
			'  RTC_FUZZ_TRIAGE_INTERVAL_MS=30000',
			'  RTC_FUZZ_TRIAGE_MAX_PARALLEL=2',
			'  RTC_FUZZ_TRIAGE_REPRO_HOURS=3',
			'  RTC_FUZZ_TRIAGE_CODEX_TIMEOUT_MS=<derived from repro hours>',
			'  RTC_FUZZ_TRIAGE_STATE_DIR=<run-output-dir>/.triage-watcher',
			'  RTC_FUZZ_ANALYSIS_STATE_DIR=<run-output-dir>/.triage-watcher/analysis-tier',
			'  RTC_FUZZ_DEEP_ANALYSIS_STATE_DIR=<run-output-dir>/.triage-watcher/deep-analysis-tier',
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

const STATE_DIR =
	process.env.RTC_FUZZ_TRIAGE_STATE_DIR ??
	path.join( RUN_DIR, '.triage-watcher' );
const STATE_PATH = path.join( STATE_DIR, 'state.json' );
const ANALYSIS_STATE_DIR =
	process.env.RTC_FUZZ_ANALYSIS_STATE_DIR ??
	path.join( STATE_DIR, 'analysis-tier' );
const DEEP_ANALYSIS_STATE_DIR =
	process.env.RTC_FUZZ_DEEP_ANALYSIS_STATE_DIR ??
	path.join( STATE_DIR, 'deep-analysis-tier' );
const WATCH_INTERVAL_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_TRIAGE_INTERVAL_MS',
	30000
);
const MAX_PARALLEL = getPositiveIntegerEnv( 'RTC_FUZZ_TRIAGE_MAX_PARALLEL', 2 );
const REPRO_HOURS = getPositiveNumberEnv( 'RTC_FUZZ_TRIAGE_REPRO_HOURS', 3 );
const CODEX_TIMEOUT_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_TRIAGE_CODEX_TIMEOUT_MS',
	Math.ceil( REPRO_HOURS * 60 * 60 * 1000 + 20 * 60 * 1000 )
);

const activeJobs = new Map();
let shuttingDown = false;

async function launchDaemon() {
	await fs.mkdir( STATE_DIR, { recursive: true } );

	const logPath = path.join( STATE_DIR, 'watcher.log' );
	const logHandle = await fs.open( logPath, 'a' );
	const child = spawn(
		process.execPath,
		[
			fileURLToPath( import.meta.url ),
			...args.filter( ( arg ) => arg !== '--daemon' ),
		],
		{
			cwd: REPO_ROOT,
			detached: true,
			env: {
				...process.env,
				PATH: SHARED_PATH,
			},
			stdio: [ 'ignore', logHandle.fd, logHandle.fd ],
		}
	);
	child.unref();
	await logHandle.close();

	process.stdout.write(
		JSON.stringify(
			{
				pid: child.pid,
				runDir: RUN_DIR,
				statePath: STATE_PATH,
				logPath,
			},
			null,
			2
		) + '\n'
	);
}

function getPositiveIntegerEnv( name, fallback ) {
	const rawValue = process.env[ name ];

	if ( ! rawValue ) {
		return fallback;
	}

	const parsedValue = Number.parseInt( rawValue, 10 );

	if ( Number.isNaN( parsedValue ) || parsedValue <= 0 ) {
		throw new Error( `Expected ${ name } to be a positive integer.` );
	}

	return parsedValue;
}

function getPositiveNumberEnv( name, fallback ) {
	const rawValue = process.env[ name ];

	if ( ! rawValue ) {
		return fallback;
	}

	const parsedValue = Number.parseFloat( rawValue );

	if ( Number.isNaN( parsedValue ) || parsedValue <= 0 ) {
		throw new Error( `Expected ${ name } to be a positive number.` );
	}

	return parsedValue;
}

function createInitialState() {
	return {
		version: 1,
		runDir: RUN_DIR,
		stateDir: STATE_DIR,
		startedAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		signatures: {},
	};
}

async function readState() {
	try {
		return JSON.parse( await fs.readFile( STATE_PATH, 'utf8' ) );
	} catch {
		return createInitialState();
	}
}

async function writeState( state ) {
	state.updatedAt = new Date().toISOString();
	await fs.mkdir( STATE_DIR, { recursive: true } );
	await fs.writeFile( STATE_PATH, JSON.stringify( state, null, 2 ) + '\n' );
}

async function findSummaryFiles( directory ) {
	let entries;
	try {
		entries = await fs.readdir( directory, { withFileTypes: true } );
	} catch ( error ) {
		if ( [ 'ENOENT', 'ENOTDIR' ].includes( error.code ) ) {
			return [];
		}
		throw error;
	}
	const files = [];

	for ( const entry of entries ) {
		const entryPath = path.join( directory, entry.name );

		if ( entry.isDirectory() ) {
			if ( entry.name === '.triage-watcher' ) {
				continue;
			}
			files.push( ...( await findSummaryFiles( entryPath ) ) );
			continue;
		}

		if ( entry.isFile() && entry.name === 'summary.ndjson' ) {
			files.push( entryPath );
		}
	}

	return files;
}

async function readFailureCandidates() {
	if ( ! fsSync.existsSync( RUN_DIR ) ) {
		throw new Error( `Run directory does not exist: ${ RUN_DIR }` );
	}

	const summaryFiles = await findSummaryFiles( RUN_DIR );
	const candidates = [];

	for ( const summaryPath of summaryFiles ) {
		const text = await fs.readFile( summaryPath, 'utf8' );
		const lines = text.split( '\n' ).filter( Boolean );

		for ( const [ lineIndex, line ] of lines.entries() ) {
			let record;
			try {
				record = JSON.parse( line );
			} catch {
				continue;
			}

			if ( ! isFailureRecord( record ) ) {
				continue;
			}

			candidates.push( {
				record,
				summaryPath,
				lineIndex: lineIndex + 1,
				signature: getFailureSignature( record ),
			} );
		}
	}

	return candidates;
}

function isFailureRecord( record ) {
	if ( record.kind === 'attempt' ) {
		return record.ok === false;
	}

	return [ 'real-bug', 'not-real', 'infra', 'uncertain' ].includes(
		record.kind
	);
}

function stripAnsi( value ) {
	return value.replace( /\u001b\[[0-9;]*m/g, '' );
}

function getFailureText( record ) {
	if ( record.failureSnippet ) {
		return record.failureSnippet;
	}

	if ( record.output ) {
		return record.output;
	}

	if ( record.codex?.result?.summary ) {
		return record.codex.result.summary;
	}

	return JSON.stringify( record );
}

function getFailureSignature( record ) {
	const text = stripAnsi( getFailureText( record ) );
	const normalized = normalizeFailureText( text );
	const facts = getFailureFacts( record, text );
	const hash = crypto
		.createHash( 'sha1' )
		.update( JSON.stringify( facts ) )
		.update( '\n' )
		.update( normalized )
		.digest( 'hex' )
		.slice( 0, 12 );

	return {
		facts,
		hash,
		normalized,
	};
}

function getPrimaryCoverageRecord( record ) {
	const direct = record.behavioralCoverage?.find(
		( candidate ) => ! candidate.parseError
	);
	if ( direct ) {
		return direct;
	}

	for ( const attempt of record.attempts ?? [] ) {
		const coverage = attempt.behavioralCoverage?.find(
			( candidate ) => ! candidate.parseError
		);
		if ( coverage ) {
			return coverage;
		}
	}

	return null;
}

function classifyFailureText( text ) {
	if ( /rest_meta_database_error/.test( text ) ) {
		return 'rest-meta-database-error';
	}
	if ( /Collaborative state did not converge/i.test( text ) ) {
		return 'collaboration-non-convergence';
	}
	if (
		/Saving failed|editor never left saving|save.*timed out/i.test( text )
	) {
		return 'save-stuck-or-failed';
	}
	if ( /persisted title|title marker/i.test( text ) ) {
		return 'persisted-title-mismatch';
	}
	if ( /persisted content|content marker/i.test( text ) ) {
		return 'persisted-content-mismatch';
	}
	if (
		/Target page, context or browser has been closed|browser has been closed/i.test(
			text
		)
	) {
		return 'browser-closed';
	}
	if ( /TimeoutError:/i.test( text ) ) {
		return 'timeout';
	}
	if ( /Error: expect\(/i.test( text ) ) {
		return 'assertion';
	}
	return 'unknown';
}

function getFailureFacts( record, text ) {
	const coverage = getPrimaryCoverageRecord( record );
	const actions = coverage?.actions ?? [];
	const historyEvents = coverage?.historyEvents ?? [];
	const lastHistoryEvent = historyEvents.at( -1 );
	const lastAction = actions.at( -1 );

	return {
		failureClass: classifyFailureText( text ),
		transport: coverage?.transport ?? 'unknown',
		actionProfile: coverage?.actionProfile ?? 'unknown',
		initialContentProfile: coverage?.initialContentProfile ?? 'unknown',
		coverageStatus: coverage?.status ?? 'unknown',
		lastAction: lastAction?.label ?? null,
		lastHistoryPhase: lastHistoryEvent?.phase ?? null,
		lastHistoryStatus: lastHistoryEvent?.status ?? null,
		reloadCount: coverage?.reloads?.length ?? 0,
		saveCheckpointCount: coverage?.saveCheckpointSteps?.length ?? 0,
		faultTypes: [
			...new Set(
				( coverage?.faults ?? [] ).map(
					( fault ) => `${ fault.type }:${ fault.status ?? 'delay' }`
				)
			),
		].sort(),
		revisionEligible: coverage?.revisionRestore?.eligible === true,
		blockTypes: coverage?.blockStats?.types ?? [],
		userCount: coverage?.userCount ?? 0,
	};
}

function normalizeFailureText( text ) {
	if ( /rest_meta_database_error/.test( text ) ) {
		return 'rest_meta_database_error wp_persisted_preferences';
	}

	const timeout = text.match( /TimeoutError: [^\n]+/ )?.[ 0 ];
	const assertion = text.match( /Error: expect\([^\n]+/ )?.[ 0 ];
	const restError = text.match( /code: '([^']+)'/ )?.[ 0 ];
	const stackLocation = text.match( /at [^(]+\(([^:()]+:\d+):\d+\)/ )?.[ 1 ];

	return [
		timeout,
		assertion,
		restError,
		stackLocation,
		text
			.split( '\n' )
			.map( ( line ) => line.trim() )
			.filter( Boolean )
			.slice( -12 )
			.join( '\n' ),
	]
		.filter( Boolean )
		.join( '\n' )
		.replaceAll( RUN_DIR, '<RUN_DIR>' )
		.replaceAll( REPO_ROOT, '<REPO_ROOT>' );
}

function groupCandidatesBySignature( candidates ) {
	const groups = new Map();

	for ( const candidate of candidates ) {
		const existing = groups.get( candidate.signature.hash ) ?? {
			hash: candidate.signature.hash,
			normalized: candidate.signature.normalized,
			candidates: [],
		};
		existing.candidates.push( candidate );
		groups.set( candidate.signature.hash, existing );
	}

	return [ ...groups.values() ];
}

async function updateDiscoveredSignatures( state, groups ) {
	for ( const group of groups ) {
		const existing = state.signatures[ group.hash ];
		const examples = group.candidates
			.slice( 0, 5 )
			.map( ( candidate ) => ( {
				summaryPath: candidate.summaryPath,
				lineIndex: candidate.lineIndex,
				kind: candidate.record.kind,
				seed: candidate.record.seed ?? null,
				logPath:
					candidate.record.logPath ??
					candidate.record.attempts?.[ 0 ]?.logPath ??
					null,
				artifactsDir:
					candidate.record.artifactsDir ??
					candidate.record.attempts?.[ 0 ]?.artifactsDir ??
					null,
			} ) );

		if ( existing ) {
			existing.lastSeenAt = new Date().toISOString();
			existing.count = group.candidates.length;
			existing.facts =
				existing.facts ??
				group.candidates[ 0 ]?.signature.facts ??
				null;
			existing.examples = mergeExamples( existing.examples, examples );
			continue;
		}

		const jobDir = path.join( STATE_DIR, 'signatures', group.hash );
		state.signatures[ group.hash ] = {
			hash: group.hash,
			status: 'queued',
			facts: group.candidates[ 0 ]?.signature.facts ?? null,
			normalized: group.normalized,
			count: group.candidates.length,
			firstSeenAt: new Date().toISOString(),
			lastSeenAt: new Date().toISOString(),
			attempts: 0,
			jobDir,
			examples,
			resultPath: path.join( jobDir, 'result.json' ),
		};
		await fs.mkdir( jobDir, { recursive: true } );
		await fs.writeFile(
			path.join( jobDir, 'failure.json' ),
			JSON.stringify( state.signatures[ group.hash ], null, 2 ) + '\n'
		);
	}
}

function mergeExamples( currentExamples = [], newExamples = [] ) {
	const byKey = new Map();

	for ( const example of [ ...currentExamples, ...newExamples ] ) {
		byKey.set( `${ example.summaryPath }:${ example.lineIndex }`, example );
	}

	return [ ...byKey.values() ].slice( 0, 10 );
}

async function launchQueuedJobs( state ) {
	const activeHashes = getActiveJobHashes( state );
	const analysisDecisions = await readAnalysisDecisions();
	const deepAnalysisDecisions = await readDeepAnalysisDecisions();
	const sortedSignatures = sortSignaturesForLaunch(
		Object.values( state.signatures ),
		analysisDecisions,
		deepAnalysisDecisions
	);
	const analysisGated = await applyAnalysisGates(
		sortedSignatures,
		analysisDecisions,
		deepAnalysisDecisions
	);
	if ( GATE_ONLY ) {
		state.lastAnalysisGatedCount = analysisGated;
		return;
	}

	for ( const signature of sortedSignatures ) {
		if ( activeHashes.size >= MAX_PARALLEL ) {
			state.lastAnalysisGatedCount = analysisGated;
			return;
		}

		if ( activeHashes.has( signature.hash ) ) {
			continue;
		}

		if ( ! shouldLaunch( signature ) ) {
			continue;
		}

		await launchCodexJob( state, signature );
		activeHashes.add( signature.hash );
	}

	state.lastAnalysisGatedCount = analysisGated;
}

async function applyAnalysisGates(
	signatures,
	analysisDecisions,
	deepAnalysisDecisions
) {
	let analysisGated = 0;

	for ( const signature of signatures ) {
		const gate = getAnalysisGate(
			analysisDecisions.get( signature.hash ),
			deepAnalysisDecisions.get( signature.hash )
		);
		if ( ! gate ) {
			continue;
		}

		if (
			signature.status === 'queued' ||
			signature.status === 'retry' ||
			signature.status === 'analysis-gated'
		) {
			signature.status = 'analysis-gated';
			signature.analysisGate = {
				gatedAt: new Date().toISOString(),
				sourceTier: gate.sourceTier,
				classification: gate.classification,
				confidence: gate.confidence,
				userHitLikelihoodScore: gate.userHitLikelihoodScore,
				userHitLikelihoodRationale: gate.userHitLikelihoodRationale,
				distinctBugType: gate.distinctBugType,
				isDuplicateOf: gate.isDuplicateOf,
				candidateStatus: gate.candidateStatus,
				recommendedTriageAction: gate.recommendedTriageAction,
				summary: gate.summary,
				resultPath: gate.resultPath,
			};
			await writeStatusMarkdown(
				path.join( signature.jobDir, 'STATUS.md' ),
				signature
			);
		}

		analysisGated += 1;
	}

	return analysisGated;
}

function getAnalysisGate( analysisDecision, deepAnalysisDecision ) {
	if ( shouldGateByDeepAnalysis( deepAnalysisDecision ) ) {
		return {
			sourceTier: 'deep-analysis-tier',
			classification: deepAnalysisDecision.classification,
			confidence: deepAnalysisDecision.confidence,
			userHitLikelihoodScore: normalizeUserHitLikelihoodScore(
				deepAnalysisDecision.userHitLikelihoodScore
			),
			userHitLikelihoodRationale:
				deepAnalysisDecision.userHitLikelihoodRationale ?? '',
			distinctBugType: deepAnalysisDecision.distinctBugType,
			isDuplicateOf: deepAnalysisDecision.duplicateOf,
			candidateStatus: deepAnalysisDecision.candidateStatus,
			recommendedTriageAction: deepAnalysisDecision.candidateStatus,
			summary: deepAnalysisDecision.summary,
			resultPath: deepAnalysisDecision.resultPath,
		};
	}

	if ( shouldGateByAnalysis( analysisDecision ) ) {
		return {
			sourceTier: 'analysis-tier',
			classification: analysisDecision.classification,
			confidence: analysisDecision.confidence,
			userHitLikelihoodScore: normalizeUserHitLikelihoodScore(
				analysisDecision.userHitLikelihoodScore
			),
			userHitLikelihoodRationale:
				analysisDecision.userHitLikelihoodRationale ?? '',
			distinctBugType: analysisDecision.distinctBugType,
			isDuplicateOf: analysisDecision.isDuplicateOf,
			candidateStatus: null,
			recommendedTriageAction: analysisDecision.recommendedTriageAction,
			summary: analysisDecision.summary,
			resultPath: analysisDecision.resultPath,
		};
	}

	return null;
}

function normalizeUserHitLikelihoodScore( value ) {
	const parsed =
		typeof value === 'number' ? value : Number.parseInt( value, 10 );
	if ( ! Number.isInteger( parsed ) ) {
		return 0;
	}

	return Math.max( 0, Math.min( 5, parsed ) );
}

async function readAnalysisDecisions() {
	const analysisStatePath = path.join( ANALYSIS_STATE_DIR, 'state.json' );
	let analysisState = null;

	try {
		analysisState = JSON.parse(
			await fs.readFile( analysisStatePath, 'utf8' )
		);
	} catch {
		return new Map();
	}

	const decisions = new Map();
	for ( const job of Object.values( analysisState.jobs ?? {} ) ) {
		if ( job.status !== 'completed' || ! job.resultPath ) {
			continue;
		}

		let result = null;
		try {
			result = JSON.parse( await fs.readFile( job.resultPath, 'utf8' ) );
		} catch {
			continue;
		}

		decisions.set( job.hash, {
			...result,
			resultPath: job.resultPath,
		} );
	}

	return decisions;
}

async function readDeepAnalysisDecisions() {
	const analysisStatePath = path.join(
		DEEP_ANALYSIS_STATE_DIR,
		'state.json'
	);
	let analysisState = null;

	try {
		analysisState = JSON.parse(
			await fs.readFile( analysisStatePath, 'utf8' )
		);
	} catch {
		return new Map();
	}

	const decisions = new Map();
	for ( const job of Object.values( analysisState.jobs ?? {} ) ) {
		if ( job.status !== 'completed' || ! job.resultPath ) {
			continue;
		}

		let result = null;
		try {
			result = JSON.parse( await fs.readFile( job.resultPath, 'utf8' ) );
		} catch {
			continue;
		}

		decisions.set( job.hash, {
			...result,
			resultPath: job.resultPath,
		} );
	}

	return decisions;
}

function shouldGateByAnalysis( analysisDecision ) {
	if ( ! analysisDecision ) {
		return false;
	}

	const gateAction = [
		'merge_with_duplicate',
		'suppress_as_infra',
		'keep_collecting',
	].includes( analysisDecision.recommendedTriageAction );

	return gateAction || analysisDecision.shouldDeepTriage === false;
}

function shouldGateByDeepAnalysis( deepAnalysisDecision ) {
	if ( ! deepAnalysisDecision ) {
		return false;
	}

	if (
		[
			'confirmed_likely_real',
			'needs_realistic_repro_search',
			'needs_more_evidence',
		].includes( deepAnalysisDecision.candidateStatus )
	) {
		return false;
	}

	return [ 'likely_duplicate', 'likely_false_positive' ].includes(
		deepAnalysisDecision.candidateStatus
	);
}

function sortSignaturesForLaunch(
	signatures,
	analysisDecisions,
	deepAnalysisDecisions
) {
	return [ ...signatures ].sort( ( left, right ) => {
		const leftPriority = getAnalysisLaunchPriority(
			analysisDecisions.get( left.hash ),
			deepAnalysisDecisions.get( left.hash )
		);
		const rightPriority = getAnalysisLaunchPriority(
			analysisDecisions.get( right.hash ),
			deepAnalysisDecisions.get( right.hash )
		);

		if ( leftPriority !== rightPriority ) {
			return leftPriority - rightPriority;
		}

		return ( right.count ?? 0 ) - ( left.count ?? 0 );
	} );
}

function getAnalysisLaunchPriority( analysisDecision, deepAnalysisDecision ) {
	if (
		shouldGateByAnalysis( analysisDecision ) ||
		shouldGateByDeepAnalysis( deepAnalysisDecision )
	) {
		return 3;
	}

	if ( deepAnalysisDecision?.candidateStatus === 'confirmed_likely_real' ) {
		return 0;
	}

	if (
		deepAnalysisDecision?.candidateStatus === 'needs_realistic_repro_search'
	) {
		return 0;
	}

	if (
		analysisDecision?.shouldDeepTriage === true &&
		analysisDecision?.recommendedTriageAction === 'prioritize_deep_triage'
	) {
		return 0;
	}

	if ( analysisDecision?.shouldDeepTriage === true ) {
		return 1;
	}

	return 2;
}

function getActiveJobHashes( state ) {
	const hashes = new Set( activeJobs.keys() );

	for ( const signature of Object.values( state.signatures ) ) {
		if (
			signature.status === 'running' &&
			! fsSync.existsSync( signature.resultPath ) &&
			isProcessAlive( signature.pid )
		) {
			hashes.add( signature.hash );
		}
	}

	return hashes;
}

async function reconcileExternallyCompletedJobs( state ) {
	for ( const signature of Object.values( state.signatures ) ) {
		if (
			signature.status !== 'running' ||
			! fsSync.existsSync( signature.resultPath ) ||
			activeJobs.has( signature.hash )
		) {
			continue;
		}

		let result = null;
		try {
			result = JSON.parse(
				await fs.readFile( signature.resultPath, 'utf8' )
			);
		} catch {}

		signature.result = result;
		signature.pid = null;
		signature.lastCompletedAt =
			signature.lastCompletedAt ?? new Date().toISOString();
		signature.status = getStatusFromResult( result, result ? 0 : 1 );
		await writeStatusMarkdown(
			path.join( signature.jobDir, 'STATUS.md' ),
			signature
		);
	}
}

function shouldLaunch( signature ) {
	if (
		[
			'completed',
			'not-real',
			'infra',
			'no-realistic-repro',
			'analysis-gated',
		].includes( signature.status )
	) {
		return false;
	}

	if ( signature.status === 'running' ) {
		if ( fsSync.existsSync( signature.resultPath ) ) {
			return false;
		}

		return ! isProcessAlive( signature.pid );
	}

	return signature.status === 'queued' || signature.status === 'retry';
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

async function launchCodexJob( state, signature ) {
	signature.status = 'running';
	signature.attempts += 1;
	signature.lastStartedAt = new Date().toISOString();

	await fs.mkdir( signature.jobDir, { recursive: true } );
	await fs.writeFile(
		path.join( signature.jobDir, 'prompt.txt' ),
		buildCodexPrompt( signature )
	);
	await writeState( state );

	const stdoutPath = path.join( signature.jobDir, 'events.jsonl' );
	const stderrPath = path.join( signature.jobDir, 'stderr.log' );
	const statusPath = path.join( signature.jobDir, 'STATUS.md' );
	const child = spawn(
		'codex',
		[
			'exec',
			'-C',
			REPO_ROOT,
			'-m',
			'gpt-5.4',
			'-c',
			'model_reasoning_effort="xhigh"',
			'--dangerously-bypass-approvals-and-sandbox',
			'--output-schema',
			SCHEMA_PATH,
			'--output-last-message',
			signature.resultPath,
			'--json',
			await fs.readFile(
				path.join( signature.jobDir, 'prompt.txt' ),
				'utf8'
			),
		],
		{
			cwd: REPO_ROOT,
			env: {
				...process.env,
				PATH: SHARED_PATH,
				RTC_FUZZ_TRIAGE_JOB_DIR: signature.jobDir,
				RTC_FUZZ_TRIAGE_REPRO_HOURS: String( REPRO_HOURS ),
			},
			stdio: [
				'ignore',
				fsSync.openSync( stdoutPath, 'w' ),
				fsSync.openSync( stderrPath, 'w' ),
			],
		}
	);

	signature.pid = child.pid ?? null;
	await writeState( state );

	const timeout = setTimeout( () => {
		child.kill( 'SIGTERM' );
		setTimeout( () => child.kill( 'SIGKILL' ), 5000 ).unref();
	}, CODEX_TIMEOUT_MS );
	const startedAt = Date.now();

	activeJobs.set( signature.hash, child );
	child.on( 'error', async ( error ) => {
		clearTimeout( timeout );
		activeJobs.delete( signature.hash );

		const nextState = await readState();
		const nextSignature = nextState.signatures[ signature.hash ];
		if ( ! nextSignature ) {
			return;
		}

		nextSignature.status = 'retry';
		nextSignature.lastError = error.message;
		nextSignature.lastCompletedAt = new Date().toISOString();
		await writeStatusMarkdown( statusPath, nextSignature );
		await writeState( nextState );
	} );
	child.on( 'close', async ( code, signal ) => {
		clearTimeout( timeout );
		activeJobs.delete( signature.hash );

		const nextState = await readState();
		const nextSignature = nextState.signatures[ signature.hash ];
		if ( ! nextSignature ) {
			return;
		}

		nextSignature.lastCompletedAt = new Date().toISOString();
		nextSignature.durationMs = Date.now() - startedAt;
		nextSignature.exitCode = code;
		nextSignature.signal = signal;
		nextSignature.pid = null;

		let result = null;
		try {
			result = JSON.parse(
				await fs.readFile( nextSignature.resultPath, 'utf8' )
			);
		} catch {}

		nextSignature.result = result;
		nextSignature.status = getStatusFromResult( result, code );
		await writeStatusMarkdown( statusPath, nextSignature );
		await writeState( nextState );
	} );
}

function getStatusFromResult( result, code ) {
	if ( code !== 0 || ! result ) {
		return 'retry';
	}

	if ( result.classification === 'infra' ) {
		return 'infra';
	}

	if ( result.classification === 'not_real' ) {
		return 'not-real';
	}

	if ( result.realisticPlaywrightRepro?.status === 'not_found' ) {
		return 'no-realistic-repro';
	}

	return 'completed';
}

function buildCodexPrompt( signature ) {
	const examples = signature.examples
		.map(
			( example ) =>
				`- ${ example.summaryPath }:${ example.lineIndex } seed=${ example.seed } log=${ example.logPath } artifacts=${ example.artifactsDir }`
		)
		.join( '\n' );

	return [
		'You are an independent deep triage agent for a Gutenberg RTC browser fuzz run.',
		`Working directory: ${ REPO_ROOT }`,
		`Fuzz run directory: ${ RUN_DIR }`,
		`Triage job directory: ${ signature.jobDir }`,
		`Failure signature: ${ signature.hash }`,
		`Maximum realistic-repro search time: ${ REPRO_HOURS } hours`,
		'',
		'Failure signature text:',
		signature.normalized,
		'',
		'Examples:',
		examples,
		'',
		'Required work:',
		'1. Decide whether this is a real Gutenberg/RTC correctness bug, an infra/harness issue, or not real.',
		'2. Score user-hit likelihood as userHitLikelihoodScore from 0 to 5, where 0 means harness-only/not user-visible, 1 means very rare or developer-only, 2 means uncommon edge workflow, 3 means plausible normal collaborative editing workflow, 4 means common workflow or common content shape, and 5 means very likely in default/common use. Explain the score in userHitLikelihoodRationale.',
		'3. Compare the examples and decide whether they are one distinct bug type or duplicates of another signature in the same run.',
		'4. If it may be real, try to reproduce at every useful level: unit, REST/API, browser/manual, and Playwright.',
		'5. A Playwright repro must use real user actions and real editor/browser behavior. Do not use fault injection, artificial route blocking, artificial sleeps as a cause, or direct state mutation as the repro mechanism.',
		'6. If a realistic Playwright repro is not obvious, keep trying in a bounded loop until the repro-hours budget is spent or a realistic repro is found.',
		'7. Write durable artifacts in the triage job directory: analysis.md, bug-report.md for real bugs, false-positive.md for not-real/infra, and any repro files or commands you create.',
		'8. If after the bounded search the issue is not real or cannot be reproduced realistically, document why and recommend keep_fuzzing, suppress_as_infra, or manual_triage as appropriate.',
		'9. Do not revert user changes. If you edit repository files, keep changes narrowly scoped and list them in changedFiles.',
		'10. Keep filesystem searches narrow. Do not run broad `find`/`rg` scans rooted at the repository root, `artifacts/rtc-browser-fuzz`, `test/e2e/artifacts`, or parent directories. Search only the triage job directory, the current fuzz run directory, the listed example artifact directories, and specific source files discovered with `git ls-files` or direct paths.',
		"11. Do not search historical fuzz generations unless an exact related signature path is already listed in this prompt. If you need duplicate context, read this run's watcher/analysis state files instead of walking the artifact tree.",
		'12. The active fuzz environment is the wp-env test environment on port 8950. Check it with: WP_ENV_PORT=8950 WP_BASE_URL=http://localhost:8950 npm run wp-env-test -- status. Do not use npm run wp-env status for this run; that checks a different development environment and may be stopped.',
		'13. Do not stop, start, clean, or reset the shared fuzz environment while fuzz lanes are running. If a reproduction needs a separate environment, create a separate worktree or terminal with a different port and document it.',
		'14. Never run a Playwright repro command against the shared port 8950 environment unless the command sets GUTENBERG_RTC_BROWSER_SKIP_GLOBAL_POST_CLEANUP=1, GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1, WP_ENV_PORT=8950, WP_BASE_URL=http://localhost:8950, and WP_ARTIFACTS_PATH under the triage job directory. The default Playwright global setup deletes all posts and can invalidate active fuzz lanes.',
		'15. Do not run tests or fixtures that call deleteAllPosts(), deleteAllUsers(), wp-env clean, wp-env start, or other destructive shared-environment cleanup against port 8950 while fuzz lanes are active. Use a separate worktree/port for destructive reproduction attempts.',
		'16. You may launch additional codex exec processes or terminal subprocesses for independent repro searches when helpful. Keep every artifact and status file under the triage job directory.',
		'17. Prefer Codex-heavy trace, screenshot, log, and code analysis before starting browser work. Only launch Playwright once you have a concrete hypothesis, and do not run multiple long browser loops concurrently from this job.',
		'18. Do not run `npm run wp-env-test start`, `npm run wp-env start`, or default `.wp-env.test.json` startup from `/Users/danluu/dev/fuzz/gutenberg` or `/Users/danluu/dev/fuzz/gutenberg-rtc-post-content-safe-sync-fuzz`; those are shared fuzz environments. If browser repro work needs a WordPress environment, create a job-local wp-env config under the triage job directory with a unique non-shared port and run `npm exec wp-env --config <that-config> start` only for that isolated environment.',
		'',
		'Output only JSON matching the schema. The JSON should point at the artifacts you wrote.',
	].join( '\n' );
}

async function writeStatusMarkdown( statusPath, signature ) {
	const result = signature.result;
	const lines = [
		`# Deep triage ${ signature.hash }`,
		'',
		`Status: ${ signature.status }`,
		`Attempts: ${ signature.attempts }`,
		`Completed: ${ signature.lastCompletedAt ?? 'not completed' }`,
		'',
	];

	if ( result ) {
		lines.push(
			`Classification: ${ result.classification }`,
			`Confidence: ${ result.confidence }`,
			`User hit likelihood: ${ normalizeUserHitLikelihoodScore(
				result.userHitLikelihoodScore
			) }/5`,
			`User hit likelihood rationale: ${
				result.userHitLikelihoodRationale ?? ''
			}`,
			`Distinct bug type: ${ result.distinctBugType }`,
			`Recommended action: ${ result.recommendedAction }`,
			'',
			'## Summary',
			'',
			result.summary,
			'',
			'## Repro',
			'',
			`Playwright status: ${ result.realisticPlaywrightRepro.status }`,
			`Playwright path: ${
				result.realisticPlaywrightRepro.path ?? 'none'
			}`,
			`Playwright command: ${
				result.realisticPlaywrightRepro.command ?? 'none'
			}`,
			'',
			result.realisticPlaywrightRepro.notes
		);
	} else if ( signature.analysisGate ) {
		lines.push(
			'Deep triage launch was gated by the high-parallel analysis tier.',
			'',
			`Analysis tier: ${
				signature.analysisGate.sourceTier ?? 'analysis-tier'
			}`,
			`Analysis classification: ${ signature.analysisGate.classification }`,
			`Analysis confidence: ${ signature.analysisGate.confidence }`,
			`User hit likelihood: ${ normalizeUserHitLikelihoodScore(
				signature.analysisGate.userHitLikelihoodScore
			) }/5`,
			`User hit likelihood rationale: ${
				signature.analysisGate.userHitLikelihoodRationale ?? ''
			}`,
			`Distinct bug type: ${ signature.analysisGate.distinctBugType }`,
			`Duplicate of: ${ signature.analysisGate.isDuplicateOf ?? 'none' }`,
			`Candidate status: ${
				signature.analysisGate.candidateStatus ?? 'none'
			}`,
			`Recommended triage action: ${ signature.analysisGate.recommendedTriageAction }`,
			`Analysis result: ${ signature.analysisGate.resultPath }`,
			'',
			signature.analysisGate.summary
		);
	} else {
		lines.push(
			'Codex did not produce a parseable result. The watcher will retry this signature.'
		);
	}

	await fs.writeFile( statusPath, lines.join( '\n' ) + '\n' );
}

async function runScanCycle() {
	const state = await readState();
	const candidates = await readFailureCandidates();
	const groups = groupCandidatesBySignature( candidates );
	await updateDiscoveredSignatures( state, groups );
	await reconcileExternallyCompletedJobs( state );
	await launchQueuedJobs( state );
	await writeState( state );
	process.stdout.write(
		`[${ new Date().toISOString() }] candidates=${
			candidates.length
		} signatures=${ groups.length } active=${
			getActiveJobHashes( state ).size
		} analysisGated=${ state.lastAnalysisGatedCount ?? 0 }\n`
	);
}

async function main() {
	await fs.mkdir( STATE_DIR, { recursive: true } );

	if ( DAEMON ) {
		await launchDaemon();
		return;
	}

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
