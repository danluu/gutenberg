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
const TRIAGE_WATCHER_PATH = path.join(
	REPO_ROOT,
	'bin/rtc-browser-fuzz-triage-watcher.mjs'
);
const NO_ANALYSIS_SENTINEL_PATH = path.join(
	TRIAGE_STATE_DIR,
	'no-analysis.json'
);
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
const STALE_ROOT_GUARD_ENABLED =
	process.env.RTC_FUZZ_DEEP_ANALYSIS_STALE_ROOT_GUARD !== '0';
const CURRENT_OUTPUT_POINTER_PATH =
	process.env.RTC_FUZZ_DEEP_ANALYSIS_CURRENT_OUTPUT_POINTER ?? null;
const SUPERVISOR_STATE_PATH =
	process.env.RTC_FUZZ_DEEP_ANALYSIS_SUPERVISOR_STATE_PATH ?? null;
const ALLOW_STANDALONE_ANALYSIS =
	process.env.RTC_FUZZ_DEEP_ANALYSIS_ALLOW_STANDALONE === '1' ||
	process.env.RTC_FUZZ_DEEP_ANALYSIS_ALLOW_OFFLINE === '1' ||
	! STALE_ROOT_GUARD_ENABLED;
const REFRESH_TRIAGE_GATE =
	process.env.RTC_FUZZ_DEEP_ANALYSIS_REFRESH_TRIAGE_GATE !== '0';
const TRIAGE_GATE_TIMEOUT_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_DEEP_ANALYSIS_TRIAGE_GATE_TIMEOUT_MS',
	2 * 60 * 1000
);
const NO_ANALYSIS_SENTINEL_COMPATIBILITY_HOURS = getPositiveIntegerEnv(
	'RTC_FUZZ_NO_ANALYSIS_SENTINEL_COMPATIBILITY_HOURS',
	6
);
const NON_ACTIONABLE_SOURCE_STATUSES = new Set( [
	'analysis-gated',
	'bootstrap-stall',
	'completed',
	'family-capped',
	'infra',
	'known-infra',
	'no-realistic-repro',
	'not-real',
	'source-suppressed',
	'stale-source',
] );
const TERMINAL_JOB_STATUSES = new Set( [
	'completed',
	'family-capped',
	'source-suppressed',
	'stale-source',
] );
const ACTIVE_GROUP_STATUSES = new Set( [
	'starting',
	'launching',
	'recovering',
	'running',
] );
const NO_PRODUCT_INFRA_NOISE_PATTERN =
	/ENOSPC|no space left|wp-env|docker compose|docker.*(?:exited|failed)|mysql.*(?:exited|failed)|dependency failed|Cannot find module|ERR_MODULE_NOT_FOUND|Host system is missing dependencies|playwright install-deps|browser dependencies|request failed: TypeError: fetch failed|GET .*\/wp-json\/|The plugin "[^"]+" isn'?t installed|plugin .*not installed|missing plugin\b|missing theme\b|RequestUtils\.deactivatePlugin|request-utils\/plugins\.ts/i;
const NO_PRODUCT_KNOWN_NOISE_FAMILIES = new Set( [
	'awareness_loss_after_save_reload',
	'cover_overlay_attribute_canonicalization',
	'http_awareness_wait_false_timeout_after_reload',
	'late_session_awareness_stall',
	'linebreak_representation_drift',
	'pre_action_awareness_stall',
	'pre_action_bootstrap_stall',
	'reload_rejoin_awareness_stall',
	'rest_meta_database_error',
	'rtc_ws_test_provider_bootstrap_missing_after_reload',
] );
const PRODUCER_NO_ANALYSIS_FAMILY_CAP_REASON_KINDS = new Set( [
	'known-noise',
	'startup-noise',
	'triage-duplicate-noise',
] );

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

function getGateOnlyTriageEnv() {
	const env = {
		...process.env,
		RTC_FUZZ_TRIAGE_STATE_DIR: TRIAGE_STATE_DIR,
		RTC_FUZZ_ANALYSIS_STATE_DIR: ANALYSIS_STATE_DIR,
		RTC_FUZZ_DEEP_ANALYSIS_STATE_DIR: STATE_DIR,
	};

	if ( CURRENT_OUTPUT_POINTER_PATH ) {
		env.RTC_FUZZ_TRIAGE_CURRENT_OUTPUT_POINTER =
			CURRENT_OUTPUT_POINTER_PATH;
	}
	if ( SUPERVISOR_STATE_PATH ) {
		env.RTC_FUZZ_TRIAGE_SUPERVISOR_STATE_PATH =
			SUPERVISOR_STATE_PATH;
	}

	return env;
}

async function refreshGateOnlyTriageState() {
	if ( ! REFRESH_TRIAGE_GATE ) {
		return {
			status: 'disabled',
			at: new Date().toISOString(),
		};
	}

	const startedAt = new Date().toISOString();
	const child = spawn(
		process.execPath,
		[ TRIAGE_WATCHER_PATH, RUN_DIR, '--once', '--gate-only' ],
		{
			cwd: REPO_ROOT,
			env: getGateOnlyTriageEnv(),
			stdio: [ 'ignore', 'pipe', 'pipe' ],
		}
	);
	let stdout = '';
	let stderr = '';
	const append = ( current, chunk ) =>
		`${ current }${ chunk }`.slice( -4000 );
	child.stdout.on( 'data', ( chunk ) => {
		stdout = append( stdout, chunk );
	} );
	child.stderr.on( 'data', ( chunk ) => {
		stderr = append( stderr, chunk );
	} );

	let timedOut = false;
	const timeout = setTimeout( () => {
		timedOut = true;
		try {
			child.kill( 'SIGTERM' );
		} catch {}
	}, TRIAGE_GATE_TIMEOUT_MS );

	const exitCode = await new Promise( ( resolve, reject ) => {
		child.on( 'error', reject );
		child.on( 'close', ( code ) => resolve( code ) );
	} );
	clearTimeout( timeout );

	const result = {
		status: exitCode === 0 && ! timedOut ? 'ok' : 'failed',
		at: startedAt,
		completedAt: new Date().toISOString(),
		exitCode,
		timedOut,
		stdout: stdout.trim(),
		stderr: stderr.trim(),
	};

	if ( result.status !== 'ok' ) {
		return result;
	}

	return result;
}

function isPathInsideRoot( filePath, root ) {
	const relative = path.relative(
		path.resolve( root ),
		path.resolve( filePath )
	);
	return (
		relative === '' ||
		( relative &&
			! relative.startsWith( '..' ) &&
			! path.isAbsolute( relative ) )
		);
}

function getNoAnalysisSentinelExpirationMs( sentinel ) {
	const explicitExpirationMs = Date.parse(
		sentinel?.expiresAt ?? sentinel?.pauseUntil ?? ''
	);
	if ( Number.isFinite( explicitExpirationMs ) ) {
		return explicitExpirationMs;
	}

	const createdAtMs = Date.parse( sentinel?.createdAt ?? '' );
	if ( ! Number.isFinite( createdAtMs ) ) {
		return 0;
	}
	return (
		createdAtMs +
		NO_ANALYSIS_SENTINEL_COMPATIBILITY_HOURS * 60 * 60 * 1000
	);
}

function isActiveNoAnalysisSentinel( sentinel, currentOutput ) {
	if ( sentinel?.preserveProductEvidence !== true || ! sentinel.outputDir ) {
		return false;
	}
	const outputRoot =
		currentOutput?.root ??
		( isPathInsideRoot( RUN_DIR, sentinel.outputDir )
			? sentinel.outputDir
			: null );
	if ( ! outputRoot ) {
		return false;
	}
	if ( path.resolve( sentinel.outputDir ) !== path.resolve( outputRoot ) ) {
		return false;
	}
	return getNoAnalysisSentinelExpirationMs( sentinel ) > Date.now();
}

function getCurrentOutputPointerCandidates() {
	const candidates = [];
	if ( CURRENT_OUTPUT_POINTER_PATH ) {
		candidates.push( CURRENT_OUTPUT_POINTER_PATH );
	} else {
		let dir = RUN_DIR;
		for ( let depth = 0; depth < 8; depth++ ) {
			candidates.push(
				path.join( dir, 'current-output-dir.txt' ),
				path.join( dir, 'current-run-root.txt' )
			);
			const parent = path.dirname( dir );
			if ( parent === dir ) {
				break;
			}
			dir = parent;
		}
	}
	return [
		...new Set(
			candidates.map( ( candidate ) => path.resolve( candidate ) )
		),
	];
}

async function readCurrentOutputRoot() {
	if ( ! STALE_ROOT_GUARD_ENABLED ) {
		return null;
	}

	for ( const pointerPath of getCurrentOutputPointerCandidates() ) {
		try {
			const value = ( await fs.readFile( pointerPath, 'utf8' ) )
				.trim()
				.split( /\r?\n/ )[ 0 ]
				?.trim();
			if ( value ) {
				return {
					root: path.resolve( value ),
					pointerPath,
				};
			}
		} catch {}
	}
	if ( CURRENT_OUTPUT_POINTER_PATH ) {
		return {
			missing: true,
			pointerPath: path.resolve( CURRENT_OUTPUT_POINTER_PATH ),
		};
	}
	return null;
}

async function readActiveSupervisorRunDirSet() {
	if ( ! SUPERVISOR_STATE_PATH ) {
		return null;
	}

	const supervisorState = await readJson( SUPERVISOR_STATE_PATH, null );
	if ( ! supervisorState ) {
		return {
			missing: true,
			path: path.resolve( SUPERVISOR_STATE_PATH ),
		};
	}

	const activeRunDirSet = new Set();
	for ( const group of supervisorState.groups ?? [] ) {
		if ( ! ACTIVE_GROUP_STATUSES.has( group.status ) ) {
			continue;
		}
		const groupDirs =
			group.activeRunDirs?.length > 0
				? group.activeRunDirs
				: group.status === 'recovering'
				? []
				: [ group.currentRunDir ];
		for ( const dir of groupDirs ) {
			if ( dir ) {
				activeRunDirSet.add( path.resolve( dir ) );
			}
		}
	}

	return {
		path: path.resolve( SUPERVISOR_STATE_PATH ),
		activeRunDirSet,
	};
}

async function getCurrentOutputPeerRunDirs() {
	const currentOutput = await readCurrentOutputRoot();
	if ( currentOutput?.missing ) {
		return [];
	}
	const currentOutputRoot = currentOutput?.root ?? null;
	const runDirs = new Set();

	if ( currentOutputRoot ) {
		for ( const dir of await findRunDirsWithTriageState( currentOutputRoot ) ) {
			const resolved = path.resolve( dir );
			if ( resolved !== path.resolve( RUN_DIR ) ) {
				runDirs.add( resolved );
			}
		}
	}

	if ( SUPERVISOR_STATE_PATH ) {
		const supervisorState = await readJson( SUPERVISOR_STATE_PATH, null );
		for ( const group of supervisorState?.groups ?? [] ) {
			if ( ! ACTIVE_GROUP_STATUSES.has( group.status ) ) {
				continue;
			}
			const groupDirs =
				group.activeRunDirs?.length > 0
					? group.activeRunDirs
					: group.status === 'recovering'
					? []
					: [ group.currentRunDir ];
			for ( const dir of groupDirs ) {
				if ( ! dir ) {
					continue;
				}
				const resolved = path.resolve( dir );
				if ( resolved === path.resolve( RUN_DIR ) ) {
					continue;
				}
				if (
					currentOutputRoot &&
					! isPathInsideRoot( resolved, currentOutputRoot )
				) {
					continue;
				}
				runDirs.add( resolved );
			}
		}
	}
	return [ ...runDirs ];
}

async function findRunDirsWithTriageState( root ) {
	const runDirs = [];
	const seen = new Set();

	async function walk( dir, depth ) {
		if ( depth > 7 || seen.has( dir ) ) {
			return;
		}
		seen.add( dir );

		let entries;
		try {
			entries = await fs.readdir( dir, { withFileTypes: true } );
		} catch {
			return;
		}

		for ( const entry of entries ) {
			const entryPath = path.join( dir, entry.name );
			if ( ! entry.isDirectory() ) {
				continue;
			}
			if ( entry.name === '.triage-watcher' ) {
				runDirs.push( dir );
				continue;
			}
			if (
				[
					'node_modules',
					'.git',
					'vendor',
					'test-results',
					'playwright-report',
					'blob-report',
				].includes( entry.name )
			) {
				continue;
			}
			await walk( entryPath, depth + 1 );
		}
	}

	await walk( path.resolve( root ), 0 );
	return runDirs;
}

async function getInactiveSupervisorRunDirReason() {
	const activeSupervisor = await readActiveSupervisorRunDirSet();
	if ( ! activeSupervisor ) {
		return null;
	}
	if ( activeSupervisor.missing ) {
		return `configured supervisor state ${ activeSupervisor.path } is missing or invalid`;
	}
	if ( activeSupervisor.activeRunDirSet.has( path.resolve( RUN_DIR ) ) ) {
		return null;
	}
	return `run dir is not active in supervisor state ${ activeSupervisor.path }`;
}

async function getStaleRunDirReason() {
	const currentOutput = await readCurrentOutputRoot();
	if ( currentOutput ) {
		if ( currentOutput.missing ) {
			return `configured current output pointer ${ currentOutput.pointerPath } is missing or empty`;
		}
		if ( ! isPathInsideRoot( RUN_DIR, currentOutput.root ) ) {
			return `run dir is outside current output root ${ currentOutput.root } from ${ currentOutput.pointerPath }`;
		}
	}
	if (
		! currentOutput &&
		! SUPERVISOR_STATE_PATH &&
		! ALLOW_STANDALONE_ANALYSIS
	) {
		return 'missing current-output pointer or supervisor state; refusing standalone deep-analysis launch without RTC_FUZZ_DEEP_ANALYSIS_ALLOW_STANDALONE=1';
	}
	const noAnalysis = await readNoAnalysisSentinel();
	if ( noAnalysis?.preserveProductEvidence === true ) {
		return null;
	}
	return getInactiveSupervisorRunDirReason();
}

async function readJsonIfPresent( filePath ) {
	return readJson( filePath, null );
}

async function readNoAnalysisSentinel() {
	const sentinel = await readJson( NO_ANALYSIS_SENTINEL_PATH, null );
	const currentOutput = await readCurrentOutputRoot();
	if ( ! isActiveNoAnalysisSentinel( sentinel, currentOutput ) ) {
		return null;
	}
	return sentinel;
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

async function collectCandidates( sourceState, analysisState, noAnalysis = null ) {
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

		const sourceSignature =
			sourceState.signatures?.[ firstJob.hash ] ?? null;
		if ( ! isActionableSourceSignature( sourceSignature, noAnalysis ) ) {
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
				signature: sourceSignature,
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

function isActionableSourceSignature( signature, noAnalysis = null ) {
	if ( ! signature?.hash ) {
		return false;
	}

	if (
		NON_ACTIONABLE_SOURCE_STATUSES.has( signature.status ?? 'unknown' )
	) {
		return false;
	}

	if ( noAnalysis && ! hasSourceProductEvidence( signature ) ) {
		return false;
	}

	if ( getProducerNoAnalysisFamilyCapKey( signature, noAnalysis ) ) {
		return false;
	}

	if ( isSourceGatedStrictPreActionStartupSignature( signature ) ) {
		return false;
	}

	if ( isNoProductInfraNoiseSignature( signature ) ) {
		return false;
	}

	if ( isNoProductKnownNoiseSignature( signature ) ) {
		return false;
	}

	if ( isFuzzHelperRestEndpointConstructionSignature( signature ) ) {
		return false;
	}

	return ! isStrictPreActionStartupSignature( signature );
}

function getSourceSuppressionReason( signature, noAnalysis = null ) {
	if ( ! signature?.hash ) {
		return 'missing-current-source-signature';
	}

	if ( isFuzzHelperRestEndpointConstructionSignature( signature ) ) {
		return 'known-product-evidence-harness-noise-family-fuzz_helper_rest_endpoint_construction';
	}

	const status = signature.status ?? 'unknown';
	if ( NON_ACTIONABLE_SOURCE_STATUSES.has( status ) ) {
		return `source-status-${ status }`;
	}

	if ( isStrictPreActionStartupSignature( signature ) ) {
		return 'strict-pre-action-startup';
	}

	if ( isSourceGatedStrictPreActionStartupSignature( signature ) ) {
		return 'source-gated-pre-action-startup';
	}

	if ( isNoProductInfraNoiseSignature( signature ) ) {
		return 'known-no-product-infra';
	}

	if ( isNoProductKnownNoiseSignature( signature ) ) {
		return `known-no-product-noise-family-${ getSemanticFamilyKey(
			signature
		) }`;
	}

	if ( noAnalysis && ! hasSourceProductEvidence( signature ) ) {
		return `producer-inactive-${ noAnalysis.reasonKind ?? 'noise' }`;
	}

	const producerFamilyCapKey = getProducerNoAnalysisFamilyCapKey(
		signature,
		noAnalysis
	);
	if ( producerFamilyCapKey ) {
		return `producer-family-capped-${ producerFamilyCapKey }`;
	}

	return null;
}

function getProducerNoAnalysisFamilyCapKey( signature, noAnalysis ) {
	if (
		! signature?.hash ||
		! PRODUCER_NO_ANALYSIS_FAMILY_CAP_REASON_KINDS.has(
			noAnalysis?.reasonKind ?? ''
		) ||
		! noAnalysis?.family ||
		hasVisibleLikelyRealDecision( signature )
	) {
		return null;
	}

	if (
		noAnalysis.preserveProductEvidence === true &&
		hasSourceProductEvidence( signature )
	) {
		return null;
	}

	const noAnalysisFamily = normalizeSemanticLabel( noAnalysis.family );
	const signatureFamilies = new Set( [
		getSourceSignatureSemanticFamilyKey( signature ),
		normalizeSemanticLabel( signature.semanticFamilyKey ),
		normalizeSemanticLabel( signature.equivalenceClass ),
		normalizeSemanticLabel( signature.familyKey ),
	] );
	return signatureFamilies.has( noAnalysisFamily ) ? noAnalysisFamily : null;
}

function hasVisibleLikelyRealDecision( signature ) {
	const decision = signature?.analysisGate ?? signature?.result ?? null;
	if ( decision?.classification !== 'likely_real' ) {
		return false;
	}

	return (
		decision.recommendedTriageAction !== 'merge_with_duplicate' &&
		! decision.isDuplicateOf &&
		! decision.duplicateOf
	);
}

function hasProductEvidence( signature ) {
	return (
		hasSourceProductEvidence( signature ) ||
		hasVisibleLikelyRealDecision( signature )
	);
}

function hasSourceProductEvidence( signature ) {
	const facts = signature?.facts ?? {};
	return (
		( facts.userCount ?? 0 ) > 0 ||
		!! facts.lastAction ||
		( facts.reloadCount ?? 0 ) > 0 ||
		( facts.saveCheckpointCount ?? 0 ) > 0 ||
		( facts.autosaveCount ?? 0 ) > 0 ||
		facts.revisionEligible === true ||
		( facts.operationWitnessActions?.length ?? 0 ) > 0 ||
		( facts.operationWitnessScopes?.length ?? 0 ) > 0 ||
		!! facts.operationWitnessPhase
	);
}

function isNoProductInfraNoiseSignature( signature ) {
	if ( ! signature || hasProductEvidence( signature ) ) {
		return false;
	}

	return NO_PRODUCT_INFRA_NOISE_PATTERN.test( signature.normalized ?? '' );
}

function isNoProductKnownNoiseSignature( signature ) {
	if ( ! signature || hasProductEvidence( signature ) ) {
		return false;
	}

	return NO_PRODUCT_KNOWN_NOISE_FAMILIES.has(
		getSemanticFamilyKey( signature )
	);
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
		/waitForCollaborationReady|collaboration (?:session )?to become ready|setPreferences|_wpCollaborationEnabled|page\.waitForFunction|waitForMutualDiscovery|mutual discovery|waitForTestWebSocketAwarenessPeerCount|awareness peer|waitForSyncCycle|Target page, context or browser has been closed|Test timeout|awareness/i.test(
			normalized
		);

	const lastHistoryPhase = String( facts.lastHistoryPhase ?? '' );
	const hasStartupPhase =
		lastHistoryPhase !== '' &&
		/seed|bootstrap|open|join|startup|setup|discovery|ready/i.test(
			lastHistoryPhase
		);

	if ( ! isStartupFamily && ! hasStartupText && ! hasStartupPhase ) {
		return false;
	}

	return (
		facts.userCount === 0 &&
		! facts.lastAction &&
		( ! facts.lastHistoryStatus || facts.lastHistoryStatus === 'fail' ) &&
		( facts.reloadCount ?? 0 ) === 0 &&
		( facts.saveCheckpointCount ?? 0 ) === 0 &&
		( facts.autosaveCount ?? 0 ) === 0 &&
		facts.revisionEligible !== true &&
		( facts.operationWitnessActions?.length ?? 0 ) === 0 &&
		( facts.operationWitnessScopes?.length ?? 0 ) === 0 &&
		! facts.operationWitnessPhase &&
		[
			'timeout',
			'browser-closed',
			'unknown',
			'collaboration-non-convergence',
			'save-stuck-or-failed',
			'assertion',
		].includes( facts.failureClass )
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

function shouldDeepAnalyzeCandidate( candidate, job, noAnalysis = null ) {
	if ( ! candidate?.hash ) {
		return false;
	}

	if ( ! isActionableSourceSignature( candidate.signature, noAnalysis ) ) {
		return false;
	}

	if ( ! job ) {
		return true;
	}

	if ( TERMINAL_JOB_STATUSES.has( job.status ) || job.status === 'running' ) {
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

async function suppressJobsWithInactiveSource(
	state,
	sourceState,
	noAnalysis = null
) {
	for ( const job of Object.values( state.jobs ?? {} ) ) {
		const sourceSignature = sourceState.signatures?.[ job.hash ] ?? null;
			if (
				shouldRestoreProducerFamilyCappedProductEvidenceJob(
					job,
					sourceSignature,
					noAnalysis
				)
			) {
				restoreProducerFamilyCappedProductEvidenceJob(
					job,
					sourceSignature,
					noAnalysis
				);
				continue;
			}
			const reason = getSourceSuppressionReason(
				sourceSignature,
				noAnalysis
			);
			if ( ! reason ) {
				continue;
			}
			const producerFamilyCapKey = getProducerNoAnalysisFamilyCapKey(
				sourceSignature,
				noAnalysis
			);

			if (
				TERMINAL_JOB_STATUSES.has( job.status ) &&
			( job.status !== 'completed' ||
				! shouldSuppressCompletedJobForInactiveSource(
					job,
					sourceSignature
				) )
		) {
			if ( job.status === 'source-suppressed' ) {
				job.sourceSuppressionReason = reason;
				job.sourceStatus = sourceSignature?.status ?? null;
				job.sourceCount = sourceSignature?.count ?? 0;
				if ( sourceSignature ) {
					job.semanticFamilyKey = getSemanticFamilyKey( sourceSignature );
					job.familyKey = sourceSignature.familyKey ?? job.familyKey;
				}
			}
			continue;
		}

		if ( job.status === 'running' && isProcessAlive( job.pid ) ) {
			try {
				process.kill( job.pid, 'SIGTERM' );
			} catch {}
		}

			job.pid = null;
			job.status = producerFamilyCapKey ? 'family-capped' : 'source-suppressed';
			job.completedAt = new Date().toISOString();
			job.sourceSuppressionReason = producerFamilyCapKey
				? `producer no-analysis sentinel capped represented duplicate/noise family ${ producerFamilyCapKey }`
				: reason;
			job.sourceStatus = sourceSignature?.status ?? null;
			job.sourceCount = sourceSignature?.count ?? 0;
			if ( sourceSignature ) {
				job.semanticFamilyKey =
					producerFamilyCapKey ?? getSemanticFamilyKey( sourceSignature );
				job.familyKey = sourceSignature.familyKey ?? job.familyKey;
			}
		}
}

function shouldRestoreProducerFamilyCappedProductEvidenceJob(
	job,
	sourceSignature,
	noAnalysis
) {
	return (
		job?.status === 'family-capped' &&
		noAnalysis?.preserveProductEvidence === true &&
		hasSourceProductEvidence( sourceSignature ) &&
		/producer no-analysis sentinel/i.test(
			job.sourceSuppressionReason ?? job.reason ?? ''
		)
	);
}

function restoreProducerFamilyCappedProductEvidenceJob(
	job,
	sourceSignature,
	noAnalysis
) {
	job.pid = null;
	job.status = 'queued';
	job.completedAt = null;
	job.sourceSuppressionReason = null;
	job.restoredAt = new Date().toISOString();
	job.restoreReason =
		'producer no-analysis sentinel preserves source product-evidence signatures until a real representative analysis exists';
	job.sourceStatus = sourceSignature?.status ?? null;
	job.sourceCount = sourceSignature?.count ?? 0;
	job.producerNoAnalysis = {
		group: noAnalysis.group ?? null,
		reasonKind: noAnalysis.reasonKind ?? null,
		family: noAnalysis.family ?? null,
		reason: noAnalysis.reason ?? null,
		createdAt: noAnalysis.createdAt ?? null,
	};
}

function shouldSuppressCompletedJobForInactiveSource( job, sourceSignature ) {
	if ( hasVisibleLikelyRealJobResult( job ) ) {
		return false;
	}

	if (
		sourceSignature &&
		hasProductEvidence( sourceSignature ) &&
		! isSourceGatedStrictPreActionStartupSignature( sourceSignature )
	) {
		return false;
	}

	return true;
}

async function launchQueuedDeepAnalysisJobs(
	sourceState,
	state,
	candidates,
	relatedSummaries,
	noAnalysis = null
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
				state.jobs[ candidate.hash ],
				noAnalysis
			)
		) {
			continue;
		}

		activeFamilyCounts ??= await getActiveAndCompletedFamilyCounts(
			sourceState,
			state
		);
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

async function getActiveAndCompletedFamilyCounts( sourceState, state ) {
	const signatureByHash = new Map(
		Object.values( sourceState.signatures ?? {} ).map( ( signature ) => [
			signature.hash,
			signature,
		] )
	);
	const counts = new Map();

	addDeepFamilyCountsFromJobs( counts, state.jobs, signatureByHash );
	await addCurrentOutputPeerDeepFamilyCounts( counts );

	return counts;
}

function addDeepFamilyCountsFromJobs(
	counts,
	jobs,
	signatureByHash,
	{ currentOutputPeer = false } = {}
) {
	for ( const job of Object.values( jobs ?? {} ) ) {
		if ( ! isDeepFamilyOccupancyJob( job ) ) {
			continue;
		}
		if ( job.status === 'running' && ! isProcessAlive( job.pid ) ) {
			continue;
		}
		const signature = signatureByHash.get( job.hash );
		if ( ! shouldCountJobForFamilyCap( job, signature ) ) {
			continue;
		}
		const family = job.semanticFamilyKey ?? null;
		if ( ! family ) {
			continue;
		}
		if (
			currentOutputPeer &&
			! shouldApplyCurrentOutputDeepFamilyCap( family, signature )
		) {
			continue;
		}
		counts.set( family, ( counts.get( family ) ?? 0 ) + 1 );
	}
}

function isDeepFamilyOccupancyJob( job ) {
	if ( [ 'completed', 'family-capped', 'running' ].includes( job.status ) ) {
		return true;
	}
	return job.status === 'failed' && job.attempts >= MAX_ATTEMPTS;
}

async function addCurrentOutputPeerDeepFamilyCounts( counts ) {
	const peerRunDirs = await getCurrentOutputPeerRunDirs();
	for ( const peerRunDir of peerRunDirs ) {
		const [ peerSourceState, peerDeepState ] = await Promise.all( [
			readJson( path.join( peerRunDir, '.triage-watcher/state.json' ), null ),
			readJson(
				path.join(
					peerRunDir,
					'.triage-watcher/deep-analysis-tier/state.json'
				),
				null
			),
		] );
		if ( ! peerDeepState?.jobs ) {
			continue;
		}
		const peerSignatureByHash = new Map(
			Object.values( peerSourceState?.signatures ?? {} ).map(
				( signature ) => [ signature.hash, signature ]
			)
		);
		addDeepFamilyCountsFromJobs(
			counts,
			peerDeepState.jobs,
			peerSignatureByHash,
			{ currentOutputPeer: true }
		);
	}
}

function shouldApplyCurrentOutputDeepFamilyCap( family, signature ) {
	if ( signature && ! hasProductEvidence( signature ) ) {
		return false;
	}
	return NO_PRODUCT_KNOWN_NOISE_FAMILIES.has(
		normalizeSemanticLabel( family )
	);
}

function shouldCountJobForFamilyCap( job, signature ) {
	if ( job.status === 'running' ) {
		return (
			!! signature &&
			! getSourceSuppressionReason( signature ) &&
			hasProductEvidence( signature )
		);
	}

	if ( hasVisibleLikelyRealJobResult( job ) ) {
		return true;
	}

	const family = job.semanticFamilyKey ?? null;
	if (
		job.status === 'family-capped' &&
		shouldApplyCurrentOutputDeepFamilyCap( family, signature )
	) {
		return true;
	}
	if ( job.status === 'failed' && job.attempts >= MAX_ATTEMPTS ) {
		return (
			!! signature &&
			hasProductEvidence( signature ) &&
			shouldApplyCurrentOutputDeepFamilyCap( family, signature )
		);
	}

	return (
		!! signature &&
		! getSourceSuppressionReason( signature ) &&
		hasProductEvidence( signature )
	);
}

function hasVisibleLikelyRealJobResult( job ) {
	const result = readJobResultSync( job );
	if ( result?.classification !== 'likely_real' ) {
		return false;
	}

	return (
		result.recommendedTriageAction !== 'merge_with_duplicate' &&
		result.candidateStatus !== 'likely_duplicate' &&
		! result.isDuplicateOf &&
		! result.duplicateOf
	);
}

function readJobResultSync( job ) {
	if ( job.status !== 'completed' || ! job.resultPath ) {
		return null;
	}

	try {
		return JSON.parse( fsSync.readFileSync( job.resultPath, 'utf8' ) );
	} catch {
		return null;
	}
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
		reason: 'semantic family already has enough current-output second-level analysis',
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
	if (
		isStrictPreActionStartupSignature( signature ) ||
		isSourceGatedStrictPreActionStartupSignature( signature )
	) {
		return 'pre_action_bootstrap_stall';
	}
	if ( isFuzzHelperRestEndpointConstructionSignature( signature ) ) {
		return 'fuzz_helper_rest_endpoint_construction';
	}
	const inferredFamily =
		getProductEvidenceLifecycleSemanticFamily( signature );
	if ( inferredFamily ) {
		return inferredFamily;
	}
	const sourceNormalized = normalizeSemanticLabel(
		signature.semanticFamilyKey ?? signature.equivalenceClass ?? signature.familyKey
	);
	if (
		/awareness.*save.*reload|save.*reload.*awareness|http_awareness_loss_after_save_reload/.test(
			sourceNormalized
		)
	) {
		return 'awareness_loss_after_save_reload';
	}
	if (
		/awareness.*reload|reload.*awareness|reload_rejoin|reload.*rejoin|rejoin.*reload|rediscovering?_peers?|peer_rediscovery|sync_cycle/.test(
			sourceNormalized
		)
	) {
		return 'reload_rejoin_awareness_stall';
	}
	if (
		/late.*session.*awareness|late_session_awareness/.test(
			sourceNormalized
		)
	) {
		return 'late_session_awareness_stall';
	}
	const raw =
		result.distinctBugType ??
		signature.semanticFamilyKey ??
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
		/harness.*false.*timeout.*http.*awareness|http.*awareness.*(?:helper|gate|wait).*false.*timeout|waitforawarenesspeercount.*(?:subscribed|subscribe|already|future|satisfied)/.test(
			normalized
		)
	) {
		return 'http_awareness_wait_false_timeout_after_reload';
	}
	if (
		/rtc_ws_test_provider_bootstrap_missing|post_reload_test_ws_provider_missing|test_ws_provider.*missing|websocket.*provider.*(?:global.*absent|missing|bootstrap)|__gutenbergtestwebsocketsync|roomcount_0|tick_null/.test(
			normalized
		)
	) {
		return 'rtc_ws_test_provider_bootstrap_missing_after_reload';
	}
	if ( /bootstrap|pre_action.*startup|startup.*discovery|pre_action.*awareness/.test( normalized ) ) {
		if ( hasProductEvidence( signature ) ) {
			return /bootstrap|pre_action.*startup|startup.*discovery|pre_action.*awareness/.test(
				sourceNormalized
			)
				? signature.familyKey ?? candidate.hash ?? sourceNormalized
				: sourceNormalized;
		}
		return 'pre_action_bootstrap_stall';
	}
	if (
		/awareness.*save.*reload|save.*reload.*awareness|http_awareness_loss_after_save_reload/.test(
			normalized
		)
	) {
		return 'awareness_loss_after_save_reload';
	}
	if (
		/awareness.*reload|reload.*awareness|reload_rejoin|reload.*rejoin|rejoin.*reload|rediscovering?_peers?|peer_rediscovery|sync_cycle/.test(
			normalized
		)
	) {
		return 'reload_rejoin_awareness_stall';
	}
	if ( /late.*session.*awareness|late_session_awareness/.test( normalized ) ) {
		return 'late_session_awareness_stall';
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

function getSourceSignatureSemanticFamilyKey( signature ) {
	if (
		isStrictPreActionStartupSignature( signature ) ||
		isSourceGatedStrictPreActionStartupSignature( signature )
	) {
		return 'pre_action_bootstrap_stall';
	}
	if ( isFuzzHelperRestEndpointConstructionSignature( signature ) ) {
		return 'fuzz_helper_rest_endpoint_construction';
	}
	const inferredFamily =
		getProductEvidenceLifecycleSemanticFamily( signature );
	if ( inferredFamily ) {
		return inferredFamily;
	}
	return normalizeSemanticLabel(
		signature?.semanticFamilyKey ??
			signature?.equivalenceClass ??
			signature?.familyKey ??
			signature?.hash ??
			'unknown'
	);
}

function isFuzzHelperRestEndpointConstructionSignature( signature ) {
	const decisionFamily = normalizeSemanticLabel(
		signature?.analysisGate?.distinctBugType ??
			signature?.result?.distinctBugType ??
			''
	);
	if ( decisionFamily === 'fuzz_helper_rest_endpoint_construction' ) {
		return true;
	}

	const facts = signature?.facts ?? {};
	const normalized = String( signature?.normalized ?? '' );
	return (
		facts.lastAction === 'insert-media-cross-entity-block' &&
		/collaboration-fuzz\.spec\.ts:(?:4864|4882|4883|4890)\b/.test(
			normalized
		)
	);
}

function getProductEvidenceLifecycleSemanticFamily( signature ) {
	if ( ! hasProductEvidence( signature ) ) {
		return null;
	}

	const facts = signature?.facts ?? {};
	if ( ( facts.userCount ?? 0 ) <= 0 ) {
		return null;
	}
	if ( facts.failureClass === 'operation-witness-missing' ) {
		return null;
	}

	const lifecycleContext = String( facts.lifecycleContext ?? '' ).toLowerCase();
	const hasReloadOrSaveContext =
		( facts.reloadCount ?? 0 ) > 0 ||
		( facts.saveCheckpointCount ?? 0 ) > 0 ||
		/reload|save/.test( lifecycleContext );
	if ( ! hasReloadOrSaveContext ) {
		return null;
	}

	const normalized = String( signature?.normalized ?? '' );
	if (
		/waitForSyncCycle|sync cycle timeout|collaboration-utils\.ts:79[0-9]\b|collaboration-utils\.ts:80[0-5]\b|save, refresh, and sync faults|refresh.*sync/i.test(
			normalized
		)
	) {
		return 'reload_rejoin_awareness_stall';
	}

	return null;
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

function preAnalysisGateAttemptHasProductEvidence( attempt ) {
	return (
		( attempt?.userCount ?? 0 ) > 0 ||
		!! attempt?.lastAction ||
		( attempt?.reloadCount ?? 0 ) > 0 ||
		( attempt?.saveCheckpointCount ?? 0 ) > 0 ||
		( attempt?.autosaveCount ?? 0 ) > 0 ||
		attempt?.revisionEligible === true ||
		( attempt?.operationWitnessActions?.length ?? 0 ) > 0 ||
		( attempt?.operationWitnessScopes?.length ?? 0 ) > 0 ||
		!! attempt?.operationWitnessPhase
	);
}

function isNoProductPreActionStartupGate( gate ) {
	if ( gate?.bucket !== 'pre-action-bootstrap-stall' ) {
		return false;
	}
	if ( ( gate.passedRechecks ?? 0 ) > 0 ) {
		return false;
	}
	const attempts = Array.isArray( gate.attempts ) ? gate.attempts : [];
	return (
		! preAnalysisGateAttemptHasProductEvidence( gate ) &&
		! attempts.some( preAnalysisGateAttemptHasProductEvidence )
	);
}

function isPrimaryNoProductPreActionStartupGate( gate ) {
	if ( gate?.bucket !== 'pre-action-bootstrap-stall' ) {
		return false;
	}
	const attempts = Array.isArray( gate.attempts ) ? gate.attempts : [];
	const primaryAttempts = attempts.length > 0 ? attempts : [ gate ];
	return (
		! preAnalysisGateAttemptHasProductEvidence( gate ) &&
		primaryAttempts.length > 0 &&
		primaryAttempts.every(
			( attempt ) =>
				( attempt?.bucket ?? gate.bucket ) ===
					'pre-action-bootstrap-stall' &&
				! preAnalysisGateAttemptHasProductEvidence( attempt )
		)
	);
}

function isSourceGatedStrictPreActionStartupSignature( signature ) {
	return (
		! hasVisibleLikelyRealDecision( signature ) &&
		isPrimaryNoProductPreActionStartupGate(
			signature?.sourcePreAnalysisGate
		)
	);
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
			if ( TERMINAL_JOB_STATUSES.has( latestJob.status ) ) {
				await writeState( latest );
				return;
			}
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

async function markJobsStaleForRunDir(
	state,
	reason,
	sourceState = null,
	noAnalysis = null
) {
	let changed = 0;
	for ( const job of Object.values( state.jobs ?? {} ) ) {
		if ( TERMINAL_JOB_STATUSES.has( job.status ) ) {
			continue;
		}
		const sourceSignature = sourceState?.signatures?.[ job.hash ] ?? null;
		if (
			noAnalysis?.preserveProductEvidence === true &&
			sourceSignature &&
			hasSourceProductEvidence( sourceSignature )
		) {
			continue;
		}
		if ( job.status === 'running' && isProcessAlive( job.pid ) ) {
			try {
				process.kill( job.pid, 'SIGTERM' );
			} catch {}
		}
		job.previousStatus = job.status ?? null;
		job.status = 'stale-source';
		job.pid = null;
		job.completedAt = new Date().toISOString();
		job.staleSourceReason = reason;
		changed += 1;
	}
	state.staleRunDir = {
		at: new Date().toISOString(),
		runDir: RUN_DIR,
		reason,
		changed,
	};
	return changed;
}

async function runScanCycle() {
	const staleRunDirReason = await getStaleRunDirReason();
	if ( staleRunDirReason ) {
		const state = await readState();
		const sourceState = await readJson( TRIAGE_STATE_PATH, null );
		const noAnalysis = await readNoAnalysisSentinel();
		await reconcileJobs( state );
		await markJobsStaleForRunDir(
			state,
			staleRunDirReason,
			sourceState,
			noAnalysis
		);
		await writeState( state );
		shuttingDown = true;
		process.stdout.write(
			`[${ new Date().toISOString() }] stale run dir: ${ staleRunDirReason }; exiting without launching deep analysis\n`
		);
		return;
	}

	const gateOnlyRefresh = await refreshGateOnlyTriageState();
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
	const noAnalysis = await readNoAnalysisSentinel();

	const state = await readState();
	state.lastGateOnlyTriageRefresh = gateOnlyRefresh;
	await reconcileJobs( state );
	await suppressJobsWithInactiveSource( state, sourceState, noAnalysis );
	let candidateCount = 0;
	if ( gateOnlyRefresh.status === 'failed' ) {
		state.lastLaunchSkippedForGateOnlyFailure = {
			at: new Date().toISOString(),
			reason:
				'gate-only triage refresh failed; reconciled and suppressed stale/noise jobs but skipped new deep-analysis launches for this pass',
			gateOnlyRefresh,
		};
	} else {
		const { candidates, relatedSummaries } = await collectCandidates(
			sourceState,
			analysisState,
			noAnalysis
		);
		candidateCount = candidates.length;
		await launchQueuedDeepAnalysisJobs(
			sourceState,
			state,
			candidates,
			relatedSummaries,
			noAnalysis
		);
	}
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
		} candidates=${ candidateCount } deepJobs=${
			Object.keys( state.jobs ).length
		} active=${ getActiveJobHashes( state ).size } counts=${ JSON.stringify(
			counts
		) } producerNoAnalysis=${ noAnalysis ? 'yes' : 'no' }\n`
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
