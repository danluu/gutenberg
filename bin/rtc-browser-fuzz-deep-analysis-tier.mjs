#!/usr/bin/env node
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = path.dirname( fileURLToPath( import.meta.url ) );
const REPO_ROOT = path.resolve( SCRIPT_DIR, '..' );
const SCHEMA_PATH = path.join(
	REPO_ROOT,
	'bin/rtc-browser-deep-analysis-tier.schema.json'
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
			'Usage: node bin/rtc-browser-fuzz-deep-analysis-tier.mjs <run-output-dir> [--once]',
			'',
			'Consumes first-level RTC fuzz analysis-tier results and launches',
			'a second, deeper Codex-only analysis pass for likely-real candidates.',
			'',
			'Environment:',
			'  RTC_FUZZ_DEEP_ANALYSIS_INTERVAL_MS=45000',
			'  RTC_FUZZ_DEEP_ANALYSIS_MAX_PARALLEL=4',
			'  RTC_FUZZ_DEEP_ANALYSIS_CODEX_TIMEOUT_MS=5400000',
			'  RTC_FUZZ_DEEP_ANALYSIS_STATE_DIR=<run>/.triage-watcher/deep-analysis-tier',
			'  RTC_FUZZ_DEEP_ANALYSIS_MODEL=gpt-5.4',
			'  RTC_FUZZ_DEEP_ANALYSIS_REASONING_EFFORT=xhigh',
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
const ANALYSIS_STATE_DIR = path.join( TRIAGE_STATE_DIR, 'analysis-tier' );
const ANALYSIS_STATE_PATH = path.join( ANALYSIS_STATE_DIR, 'state.json' );
const STATE_DIR =
	process.env.RTC_FUZZ_DEEP_ANALYSIS_STATE_DIR ??
	path.join( TRIAGE_STATE_DIR, 'deep-analysis-tier' );
const STATE_PATH = path.join( STATE_DIR, 'state.json' );
const WATCH_INTERVAL_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_DEEP_ANALYSIS_INTERVAL_MS',
	45000
);
const MAX_PARALLEL = getPositiveIntegerEnv(
	'RTC_FUZZ_DEEP_ANALYSIS_MAX_PARALLEL',
	4
);
const CODEX_TIMEOUT_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_DEEP_ANALYSIS_CODEX_TIMEOUT_MS',
	90 * 60 * 1000
);
const MAX_ATTEMPTS = getPositiveIntegerEnv(
	'RTC_FUZZ_DEEP_ANALYSIS_MAX_ATTEMPTS',
	2
);
const TRANSIENT_CODEX_STARTUP_BACKOFF_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_DEEP_ANALYSIS_TRANSIENT_CODEX_STARTUP_BACKOFF_MS',
	5 * 60 * 1000
);
const CODEX_MODEL = process.env.RTC_FUZZ_DEEP_ANALYSIS_MODEL ?? 'gpt-5.4';
const REASONING_EFFORT =
	process.env.RTC_FUZZ_DEEP_ANALYSIS_REASONING_EFFORT ?? 'xhigh';
const MAX_PER_SEMANTIC_FAMILY = getPositiveIntegerEnv(
	'RTC_FUZZ_DEEP_ANALYSIS_MAX_PER_SEMANTIC_FAMILY',
	1
);
const MAX_HIGH_VALUE_PER_SEMANTIC_FAMILY = getPositiveIntegerEnv(
	'RTC_FUZZ_DEEP_ANALYSIS_MAX_HIGH_VALUE_PER_SEMANTIC_FAMILY',
	2
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

async function readJsonIfPresent( filePath ) {
	return readJson( filePath, null );
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
		if (
			job.status === 'failed' &&
			( await isTransientCodexStartupFailure( job ) )
		) {
			markTransientCodexStartupRetry( job );
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

function getActiveJobHashes( state ) {
	const hashes = new Set( activeJobs.keys() );

	for ( const job of Object.values( state.jobs ) ) {
		if ( job.status === 'running' && isProcessAlive( job.pid ) ) {
			hashes.add( job.hash );
		}
	}

	return hashes;
}

async function collectCandidates( sourceState, analysisState ) {
	const candidates = [];
	const relatedSummaries = [];

	for ( const firstJob of Object.values( analysisState.jobs ?? {} ) ) {
		if (
			firstJob.status !== 'completed' ||
			! firstJob.hash ||
			! firstJob.resultPath ||
			! fsSync.existsSync( firstJob.resultPath )
		) {
			continue;
		}

		const firstResult = await readJsonIfPresent( firstJob.resultPath );
		if ( ! firstResult ) {
			continue;
		}

		if ( isLikelyRealCandidate( firstResult ) ) {
			candidates.push( {
				hash: firstJob.hash,
				firstJob,
				firstResult,
				signature: sourceState.signatures?.[ firstJob.hash ] ?? null,
			} );
		}

		if (
			[ 'likely_real', 'uncertain' ].includes(
				firstResult.classification
			)
		) {
			relatedSummaries.push( {
				hash: firstJob.hash,
				classification: firstResult.classification,
				confidence: firstResult.confidence,
				userHitLikelihoodScore: normalizeUserHitLikelihoodScore(
					firstResult.userHitLikelihoodScore
				),
				action: firstResult.recommendedTriageAction,
				distinctBugType: firstResult.distinctBugType,
				duplicateOf: firstResult.isDuplicateOf,
				summary: firstResult.summary,
			} );
		}
	}

	return {
		candidates: candidates.sort( sortCandidates ),
		relatedSummaries,
	};
}

function isLikelyRealCandidate( firstResult ) {
	if ( ! firstResult?.shouldDeepTriage ) {
		return false;
	}

	if (
		firstResult.recommendedTriageAction === 'merge_with_duplicate' ||
		firstResult.isDuplicateOf
	) {
		return false;
	}

	return [ 'likely_real', 'uncertain' ].includes(
		firstResult.classification
	);
}

function sortCandidates( a, b ) {
	const actionPriority = {
		prioritize_deep_triage: 0,
		normal_deep_triage: 1,
		merge_with_duplicate: 2,
		keep_collecting: 3,
		suppress_as_infra: 4,
	};
	const confidencePriority = {
		high: 0,
		medium: 1,
		low: 2,
	};
	const aAction =
		actionPriority[ a.firstResult.recommendedTriageAction ] ?? 5;
	const bAction =
		actionPriority[ b.firstResult.recommendedTriageAction ] ?? 5;
	if ( aAction !== bAction ) {
		return aAction - bAction;
	}

	const aConfidence = confidencePriority[ a.firstResult.confidence ] ?? 3;
	const bConfidence = confidencePriority[ b.firstResult.confidence ] ?? 3;
	if ( aConfidence !== bConfidence ) {
		return aConfidence - bConfidence;
	}

	const aUserHitLikelihood = normalizeUserHitLikelihoodScore(
		a.firstResult.userHitLikelihoodScore
	);
	const bUserHitLikelihood = normalizeUserHitLikelihoodScore(
		b.firstResult.userHitLikelihoodScore
	);
	if ( aUserHitLikelihood !== bUserHitLikelihood ) {
		return bUserHitLikelihood - aUserHitLikelihood;
	}

	return ( b.signature?.count ?? 0 ) - ( a.signature?.count ?? 0 );
}

function normalizeUserHitLikelihoodScore( value ) {
	const parsed =
		typeof value === 'number' ? value : Number.parseInt( value, 10 );
	if ( ! Number.isInteger( parsed ) ) {
		return 0;
	}

	return Math.max( 0, Math.min( 5, parsed ) );
}

function shouldDeepAnalyzeCandidate( candidate, job ) {
	if ( ! candidate?.hash ) {
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

async function launchQueuedDeepAnalysisJobs(
	sourceState,
	state,
	candidates,
	relatedSummaries
) {
	const activeHashes = getActiveJobHashes( state );
	let activeFamilyCounts = null;

	for ( const candidate of candidates ) {
		if ( activeHashes.size >= MAX_PARALLEL ) {
			return;
		}

		if ( activeHashes.has( candidate.hash ) ) {
			continue;
		}

		if (
			! shouldDeepAnalyzeCandidate(
				candidate,
				state.jobs[ candidate.hash ]
			)
		) {
			continue;
		}

		activeFamilyCounts ??= getActiveAndCompletedFamilyCounts( state );
		const semanticFamily = getSemanticFamilyKey( candidate );
		const familyCount = activeFamilyCounts.get( semanticFamily ) ?? 0;
		if ( familyCount >= getSemanticFamilyCap( candidate ) ) {
			recordFamilyCappedJob( state, candidate, semanticFamily );
			continue;
		}

		await launchCodexDeepAnalysisJob(
			sourceState,
			state,
			candidate,
			relatedSummaries
		);
		activeHashes.add( candidate.hash );
		activeFamilyCounts.set( semanticFamily, familyCount + 1 );
	}
}

function getActiveAndCompletedFamilyCounts( state ) {
	const counts = new Map();

	for ( const job of Object.values( state.jobs ?? {} ) ) {
		if ( ! [ 'running', 'completed' ].includes( job.status ) ) {
			continue;
		}
		const family = job.semanticFamilyKey ?? null;
		if ( ! family ) {
			continue;
		}
		counts.set( family, ( counts.get( family ) ?? 0 ) + 1 );
	}

	return counts;
}

function recordFamilyCappedJob( state, candidate, semanticFamily ) {
	const existing = state.jobs[ candidate.hash ];
	if ( existing?.status === 'family-capped' ) {
		return;
	}

	state.jobs[ candidate.hash ] = {
		hash: candidate.hash,
		status: 'family-capped',
		semanticFamilyKey: semanticFamily,
		firstLevelClassification: candidate.firstResult.classification,
		firstLevelConfidence: candidate.firstResult.confidence,
		firstLevelAction: candidate.firstResult.recommendedTriageAction,
		firstLevelResultPath: candidate.firstJob.resultPath,
		sourceStatus: candidate.signature?.status ?? null,
		sourceCount: candidate.signature?.count ?? 0,
		startedAt: existing?.startedAt ?? new Date().toISOString(),
		completedAt: new Date().toISOString(),
		reason: 'semantic family already has enough active/completed second-level analysis',
	};
}

function getSemanticFamilyCap( candidate ) {
	const key = getSemanticFamilyKey( candidate );
	if (
		/linebreak|newline|br_normalization|isuseroverlaycolor|cover.*overlay/.test(
			key
		)
	) {
		return 1;
	}

	if (
		/blank|empty|collapse|drop|hydration|stale|overwrite|rollback|structural|move|delete|table|persist/.test(
			key
		)
	) {
		return MAX_HIGH_VALUE_PER_SEMANTIC_FAMILY;
	}

	return MAX_PER_SEMANTIC_FAMILY;
}

function getSemanticFamilyKey( candidate ) {
	const result = candidate.firstResult ?? {};
	const signature = candidate.signature ?? {};
	const raw =
		result.distinctBugType ??
		signature.equivalenceClass ??
		signature.familyKey ??
		candidate.hash;
	const normalized = normalizeSemanticLabel( raw );

	if (
		/linebreak|newline|br.*serialization|codeblock|preformatted|verse/.test(
			normalized
		)
	) {
		return 'linebreak_representation_drift';
	}
	if ( /isuseroverlaycolor|cover.*overlay/.test( normalized ) ) {
		return 'cover_overlay_attribute_canonicalization';
	}
	if (
		/awareness.*save.*reload|save.*reload.*awareness|http_awareness_loss_after_save_reload/.test(
			normalized
		)
	) {
		return 'awareness_loss_after_save_reload';
	}
	if (
		/awareness.*reload|reload.*awareness|reload_rejoin/.test( normalized )
	) {
		return 'reload_rejoin_awareness_stall';
	}
	if ( /late.*join|late_join/.test( normalized ) ) {
		return 'late_join_lifecycle';
	}
	if (
		/blank.*content|empty.*content|content.*collapse|collapses_to_empty/.test(
			normalized
		)
	) {
		return 'persisted_content_collapse_or_empty_save';
	}
	if (
		/hydration.*drop|drops_blocks|reload.*drops.*block/.test( normalized )
	) {
		return 'reload_hydration_drops_blocks';
	}
	if (
		/stale.*save|overwrite|title.*revert|stale.*entity/.test( normalized )
	) {
		return 'stale_save_or_entity_overwrite';
	}
	if (
		/move|delete|reorder|table|structural|block_order/.test( normalized )
	) {
		return 'structural_move_delete_or_table_divergence';
	}

	return normalized;
}

function normalizeSemanticLabel( value ) {
	return String( value ?? 'unknown' )
		.toLowerCase()
		.replaceAll( '`', '' )
		.replaceAll( "'", '' )
		.replaceAll( '"', '' )
		.replace( /[^a-z0-9]+/g, '_' )
		.replace( /_+/g, '_' )
		.replace( /^_|_$/g, '' );
}

async function launchCodexDeepAnalysisJob(
	sourceState,
	state,
	candidate,
	relatedSummaries
) {
	const jobDir = path.join( STATE_DIR, 'signatures', candidate.hash );
	const resultPath = path.join( jobDir, 'result.json' );
	const promptPath = path.join( jobDir, 'prompt.txt' );
	const stdoutPath = path.join( jobDir, 'events.jsonl' );
	const stderrPath = path.join( jobDir, 'stderr.log' );
	const deepAnalysisPath = path.join( jobDir, 'deep-analysis.md' );
	const reproHandoffPath = path.join( jobDir, 'repro-handoff.md' );

	await fs.mkdir( jobDir, { recursive: true } );
	await fs.writeFile(
		path.join( jobDir, 'candidate.json' ),
		JSON.stringify(
			{
				signature: candidate.signature,
				firstLevelJob: candidate.firstJob,
				firstLevelResult: candidate.firstResult,
			},
			null,
			2
		) + '\n'
	);
	await fs.writeFile(
		promptPath,
		buildCodexPrompt( sourceState, candidate, relatedSummaries, {
			jobDir,
			deepAnalysisPath,
			reproHandoffPath,
		} )
	);

	const previousJob = state.jobs[ candidate.hash ];
	const job = {
		hash: candidate.hash,
		status: 'running',
		attempts: ( previousJob?.attempts ?? 0 ) + 1,
		pid: null,
		sourceStatus: candidate.signature?.status ?? null,
		sourceCount: candidate.signature?.count ?? 0,
		firstLevelClassification: candidate.firstResult.classification,
		firstLevelConfidence: candidate.firstResult.confidence,
		firstLevelAction: candidate.firstResult.recommendedTriageAction,
		firstLevelResultPath: candidate.firstJob.resultPath,
		semanticFamilyKey: getSemanticFamilyKey( candidate ),
		startedAt: new Date().toISOString(),
		completedAt: null,
		jobDir,
		resultPath,
		stdoutPath,
		stderrPath,
		deepAnalysisPath,
		reproHandoffPath,
		nextAttemptAt: null,
		timeoutMs: CODEX_TIMEOUT_MS,
		timedOut: false,
	};
	state.jobs[ candidate.hash ] = job;
	await writeState( state );

	const child = spawn(
		'codex',
		[
			'exec',
			'-C',
			REPO_ROOT,
			'-m',
			CODEX_MODEL,
			'-c',
			`model_reasoning_effort="${ REASONING_EFFORT }"`,
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
				RTC_FUZZ_DEEP_ANALYSIS_JOB_DIR: jobDir,
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
	activeJobs.set( candidate.hash, child );
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
		activeJobs.delete( candidate.hash );

		const latest = await readState();
		const latestJob = latest.jobs[ candidate.hash ];
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
				timeoutMs: job.timeoutMs,
				timedOut: failure.timedOut,
			},
			null,
			2
		) + '\n'
	);
}

function buildCodexPrompt( sourceState, candidate, relatedSummaries, paths ) {
	const signature = candidate.signature ?? {};
	const firstJob = candidate.firstJob;
	const firstResult = candidate.firstResult;
	const firstAnalysisPath =
		firstJob.analysisPath ??
		path.join(
			ANALYSIS_STATE_DIR,
			'signatures',
			candidate.hash,
			'analysis.md'
		);
	const firstHandoffPath =
		firstJob.handoffPath ??
		path.join(
			ANALYSIS_STATE_DIR,
			'signatures',
			candidate.hash,
			'handoff.md'
		);
	const examples = ( signature.examples ?? [] )
		.slice( 0, 8 )
		.map(
			( example ) =>
				`- ${ example.summaryPath }:${ example.lineIndex } seed=${ example.seed } log=${ example.logPath } artifacts=${ example.artifactsDir }`
		)
		.join( '\n' );
	const related = relatedSummaries
		.filter( ( summary ) => summary.hash !== candidate.hash )
		.filter(
			( summary ) =>
				summary.distinctBugType === firstResult.distinctBugType ||
				summary.duplicateOf === candidate.hash ||
				firstResult.isDuplicateOf === summary.hash
		)
		.slice( 0, 20 )
		.map(
			( summary ) =>
				`- ${ summary.hash }: ${ summary.classification }/${
					summary.confidence
				} userHitLikelihood=${
					summary.userHitLikelihoodScore ?? 'unknown'
				}/5 action=${ summary.action } type=${
					summary.distinctBugType
				} duplicateOf=${ summary.duplicateOf ?? 'none' } summary=${
					summary.summary
				}`
		)
		.join( '\n' );
	const statusCounts = {};
	for ( const sourceSignature of Object.values(
		sourceState.signatures ?? {}
	) ) {
		statusCounts[ sourceSignature.status ] =
			( statusCounts[ sourceSignature.status ] ?? 0 ) + 1;
	}

	return [
		'You are a second-level, analysis-only Codex worker for a Gutenberg RTC browser fuzz run.',
		'This job is intentionally deeper than the first analysis tier. Challenge the first-tier conclusion instead of restating it.',
		`Repository: ${ REPO_ROOT }`,
		`Fuzz run directory: ${ RUN_DIR }`,
		`Triage watcher state: ${ TRIAGE_STATE_PATH }`,
		`First-level analysis state: ${ ANALYSIS_STATE_PATH }`,
		`Deep analysis job directory: ${ paths.jobDir }`,
		`Failure signature: ${ candidate.hash }`,
		`Current watcher status counts: ${ JSON.stringify( statusCounts ) }`,
		'',
		'Hard constraints:',
		'- Do not run Playwright, Chrome, npm test, npm run test:e2e, wp-env, docker, or any browser/repro command.',
		'- Do not edit production/source files. Write only the durable artifacts requested under the deep analysis job directory.',
			'- Keep filesystem searches scoped to the run directory, the first-level job directory, and relevant source files. Do not scan historical artifact trees under test/e2e/artifacts or unrelated old fuzz runs.',
			'- Do not run broad `find` or `rg` scans rooted at the repository root, `artifacts/rtc-browser-fuzz`, `test/e2e/artifacts`, or parent directories. Search exact example paths, this run directory, this job directory, the first-level job directory, and specific source files discovered with `git ls-files` or direct paths.',
			'- Do not bypass the analysis guard wrappers with absolute tool paths such as `/bin/cat`, `/usr/bin/sed`, `/usr/bin/head`, or `/usr/bin/tail`.',
			'',
			'Allowed work:',
			'- Inspect text logs, compact summary extracts, error-context markdown, trace zip metadata/files, first-level analysis artifacts, and relevant source code.',
			'- Do not dump whole summary/event streams or large Playwright error-context files. Never run `cat`, `sed`, `head`, or `tail` directly on `summary.ndjson`, `events.ndjson`, `events.jsonl`, or large files under the fuzz artifacts tree; use `node bin/rtc-browser-fuzz-extract-summary-record.mjs <summary.ndjson> --seed <seed>` or first-level compact context instead.',
			'- When searching trace/network data, always bound output with a specific pattern plus `rg -m 40` or an equivalent small script. Do not emit broad trace/network payloads into the Codex event log.',
			'- Use read-only shell commands such as rg, sed, find scoped to this run, unzip/list trace files, compact jq/node snippets that only read files, and read-only git commands.',
		'',
		'First-level result JSON:',
		JSON.stringify( firstResult, null, 2 ),
		'',
		'First-level artifacts to inspect:',
		`- result: ${ firstJob.resultPath }`,
		`- analysis: ${ firstAnalysisPath }`,
		`- handoff: ${ firstHandoffPath }`,
		'',
		'Failure signature text:',
		signature.normalized ?? '(missing from watcher state)',
		'',
		'Examples:',
		examples || '(none)',
		'',
		'Related first-level likely-real/uncertain signatures:',
		related || '(none found by exact distinctBugType/duplicate links)',
		'',
		'Write these durable artifacts before returning:',
		`- ${ paths.deepAnalysisPath }: detailed mechanism analysis, evidence, false-positive challenges, distinctness/duplicate analysis, likely affected code, severity/user impact, and confidence.`,
		`- ${ paths.reproHandoffPath }: concrete next steps for realistic reproduction at unit/API, manual browser, and Playwright levels using real user actions only; include what evidence would disprove the bug.`,
		'',
		'Depth requirements:',
		'1. Identify the smallest plausible failure mechanism and which layer owns it: Yjs/CRDT sync, provider transport, REST/persistence, editor data store, block serialization, rich text, or test harness.',
		'2. Compare against related signatures and decide whether this is distinct, a duplicate family member, or a symptom of a broader root cause.',
		'3. Score user-hit likelihood as userHitLikelihoodScore from 0 to 5, where 0 means harness-only/not user-visible, 1 means very rare or developer-only, 2 means uncommon edge workflow, 3 means plausible normal collaborative editing workflow, 4 means common workflow or common content shape, and 5 means very likely in default/common use. Explain the score in userHitLikelihoodRationale.',
		'4. Actively look for false-positive explanations: timeout pressure, missing awareness, login/setup failure, helper direct state mutation, invalid fuzz operation, or expected conflict behavior.',
		'5. If still plausibly real, describe realistic repros at every useful level. The Playwright plan must use real editor UI/user actions and real sync behavior, not route blocking, artificial fault injection, direct store mutation, or test-only state mutation.',
		'6. If a realistic repro is not currently credible, say what additional loop/search should be delegated and exactly what would count as success.',
		'Output only JSON matching the schema.',
	].join( '\n' );
}

async function runScanCycle() {
	const sourceState = await readJson( TRIAGE_STATE_PATH, null );
	if ( ! sourceState ) {
		throw new Error(
			`Missing triage watcher state at ${ TRIAGE_STATE_PATH }`
		);
	}

	const analysisState = await readJson( ANALYSIS_STATE_PATH, null );
	if ( ! analysisState ) {
		throw new Error(
			`Missing first-level analysis state at ${ ANALYSIS_STATE_PATH }`
		);
	}

	const state = await readState();
	await reconcileJobs( state );
	const { candidates, relatedSummaries } = await collectCandidates(
		sourceState,
		analysisState
	);
	await launchQueuedDeepAnalysisJobs(
		sourceState,
		state,
		candidates,
		relatedSummaries
	);
	await writeState( state );

	const counts = {};
	for ( const job of Object.values( state.jobs ) ) {
		counts[ job.status ] = ( counts[ job.status ] ?? 0 ) + 1;
	}

	process.stdout.write(
		`[${ new Date().toISOString() }] sourceSignatures=${
			Object.keys( sourceState.signatures ?? {} ).length
		} firstLevelJobs=${
			Object.keys( analysisState.jobs ?? {} ).length
		} candidates=${ candidates.length } deepJobs=${
			Object.keys( state.jobs ).length
		} active=${ getActiveJobHashes( state ).size } counts=${ JSON.stringify(
			counts
		) }\n`
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
