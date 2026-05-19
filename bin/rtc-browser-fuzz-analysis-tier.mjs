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
const TRIAGE_WATCHER_PATH = path.join(
	REPO_ROOT,
	'bin/rtc-browser-fuzz-triage-watcher.mjs'
);
const NO_ANALYSIS_SENTINEL_PATH = path.join(
	TRIAGE_STATE_DIR,
	'no-analysis.json'
);
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
	1
);
const FAMILY_CAP_ONLY = process.env.RTC_FUZZ_ANALYSIS_FAMILY_CAP_ONLY === '1';
const FORCE_FAMILY_CAP_KEYS = new Set(
	( process.env.RTC_FUZZ_ANALYSIS_FORCE_FAMILY_CAP_KEYS ?? '' )
		.split( ',' )
		.map( ( key ) => key.trim() )
		.filter( Boolean )
);
const STALE_ROOT_GUARD_ENABLED =
	process.env.RTC_FUZZ_ANALYSIS_STALE_ROOT_GUARD !== '0';
const CURRENT_OUTPUT_POINTER_PATH =
	process.env.RTC_FUZZ_ANALYSIS_CURRENT_OUTPUT_POINTER ?? null;
const SUPERVISOR_STATE_PATH =
	process.env.RTC_FUZZ_ANALYSIS_SUPERVISOR_STATE_PATH ?? null;
const ALLOW_STANDALONE_ANALYSIS =
	process.env.RTC_FUZZ_ANALYSIS_ALLOW_STANDALONE === '1' ||
	process.env.RTC_FUZZ_ANALYSIS_ALLOW_OFFLINE === '1' ||
	! STALE_ROOT_GUARD_ENABLED;
const REFRESH_TRIAGE_GATE =
	process.env.RTC_FUZZ_ANALYSIS_REFRESH_TRIAGE_GATE !== '0';
const TRIAGE_GATE_TIMEOUT_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_ANALYSIS_TRIAGE_GATE_TIMEOUT_MS',
	2 * 60 * 1000
);
const TRANSIENT_CODEX_STARTUP_BACKOFF_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_ANALYSIS_TRANSIENT_CODEX_STARTUP_BACKOFF_MS',
	5 * 60 * 1000
);
const NO_ANALYSIS_SENTINEL_COMPATIBILITY_HOURS = getPositiveIntegerEnv(
	'RTC_FUZZ_NO_ANALYSIS_SENTINEL_COMPATIBILITY_HOURS',
	6
);
const CONTEXT_DUMP_RECOVERY_MAX_ATTEMPTS = getPositiveIntegerEnv(
	'RTC_FUZZ_ANALYSIS_CONTEXT_DUMP_RECOVERY_MAX_ATTEMPTS',
	1
);
const MAX_COMPACT_EXAMPLES = getPositiveIntegerEnv(
	'RTC_FUZZ_ANALYSIS_MAX_COMPACT_EXAMPLES',
	4
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
const SEMANTIC_CAP_PRODUCT_EVIDENCE_FAMILIES = new Set( [
	'awareness_loss_after_save_reload',
	'cover_overlay_attribute_canonicalization',
	'fuzz_helper_rest_endpoint_construction',
	'http_awareness_wait_false_timeout_after_reload',
	'late_session_awareness_stall',
	'linebreak_representation_drift',
	'pre_action_bootstrap_stall',
	'reload_rejoin_awareness_stall',
	'rest_meta_database_error',
	'rtc_ws_test_provider_bootstrap_missing_after_reload',
] );
const ACTIVE_ONLY_PRODUCT_EVIDENCE_ANALYSIS_FAMILIES = new Set( [
	'timeout',
	'unknown',
] );
const PRODUCER_NO_ANALYSIS_FAMILY_CAP_REASON_KINDS = new Set( [
	'known-noise',
	'startup-noise',
	'triage-duplicate-noise',
] );
const NO_PRODUCT_KNOWN_NOISE_FAMILIES = new Set( [
	...SEMANTIC_CAP_PRODUCT_EVIDENCE_FAMILIES,
	'pre_action_awareness_stall',
] );
const NO_PRODUCT_INFRA_NOISE_PATTERN =
	/ENOSPC|no space left|wp-env|docker compose|docker.*(?:exited|failed)|mysql.*(?:exited|failed)|dependency failed|Cannot find module|ERR_MODULE_NOT_FOUND|Host system is missing dependencies|playwright install-deps|browser dependencies|request failed: TypeError: fetch failed|GET .*\/wp-json\/|The plugin "[^"]+" isn'?t installed|plugin .*not installed|missing plugin\b|missing theme\b|RequestUtils\.deactivatePlugin|request-utils\/plugins\.ts/i;

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
		RTC_FUZZ_ANALYSIS_STATE_DIR: STATE_DIR,
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
		return 'missing current-output pointer or supervisor state; refusing standalone analysis launch without RTC_FUZZ_ANALYSIS_ALLOW_STANDALONE=1';
	}
	const noAnalysis = await readNoAnalysisSentinel();
	if ( noAnalysis?.preserveProductEvidence === true ) {
		return null;
	}
	return getInactiveSupervisorRunDirReason();
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

function shouldAnalyzeSignature( signature, job, noAnalysis = null ) {
	if ( ! signature?.hash ) {
		return false;
	}

	if (
		[
			'completed',
			'family-capped',
			'not-real',
			'infra',
			'known-infra',
			'no-realistic-repro',
			'source-suppressed',
			'stale-source',
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

	if ( signature.status === 'analysis-gated' ) {
		return false;
	}

	if ( noAnalysis && ! hasSourceProductEvidence( signature ) ) {
		return false;
	}

	if ( getProducerNoAnalysisFamilyCapKey( signature, noAnalysis ) ) {
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

	const noAnalysisFamily = canonicalizeSemanticFamilyKey( noAnalysis.family );
	const signatureFamilies = new Set( [
		getSemanticFamilyKey( signature ),
		getSourceSemanticFamilyKey( signature ),
		canonicalizeSemanticFamilyKey( getAnalysisLaunchFamilyKey( signature ) ),
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
				job.sourceSemanticFamilyKey =
					getSourceSemanticFamilyKey( sourceSignature );
				job.launchFamilyKey = getAnalysisLaunchFamilyKey( sourceSignature );
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
				job.semanticFamilyKey = getSemanticFamilyKey( sourceSignature );
				job.sourceSemanticFamilyKey =
					getSourceSemanticFamilyKey( sourceSignature );
				job.launchFamilyKey = producerFamilyCapKey ?? getAnalysisLaunchFamilyKey( sourceSignature );
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

async function launchQueuedAnalysisJobs( sourceState, state, noAnalysis = null ) {
	const activeHashes = getActiveJobHashes( state );
	let familyLaunchCounts = null;
	state.lastActiveOnlyFamilyThrottleSkips = [];
	state.lastFamilyCapOnlySkips = [];
	for ( const signature of Object.values( sourceState.signatures ?? {} ) ) {
		const producerFamilyCapKey = getProducerNoAnalysisFamilyCapKey(
			signature,
			noAnalysis
		);
		if ( producerFamilyCapKey ) {
			recordFamilyCappedJob( state, signature, producerFamilyCapKey );
		}
	}
	const signatures = interleaveFirstSignaturePerFamily(
		Object.values( sourceState.signatures ?? {} )
			.filter( ( signature ) =>
				shouldAnalyzeSignature(
					signature,
					state.jobs[ signature.hash ],
					noAnalysis
				)
			)
			.sort( sortSignaturesForAnalysis )
	);

	for ( const signature of signatures ) {
		if ( activeHashes.has( signature.hash ) ) {
			continue;
		}

		familyLaunchCounts ??= await getFamilyLaunchCounts(
			sourceState,
			state
		);
		const familyKey = getAnalysisLaunchFamilyKey( signature );
		if (
			( familyLaunchCounts.get( familyKey ) ?? 0 ) >= MAX_PER_FAMILY ||
			FORCE_FAMILY_CAP_KEYS.has( familyKey )
		) {
			if ( isActiveOnlyAnalysisLaunchFamily( signature, familyKey ) ) {
				recordActiveOnlyFamilyThrottleSkip( state, signature, familyKey );
			}
			recordFamilyCappedJob( state, signature, familyKey );
			continue;
		}

		if ( FAMILY_CAP_ONLY ) {
			recordFamilyCapOnlySkip( state, signature, familyKey );
			continue;
		}

		if ( activeHashes.size >= MAX_PARALLEL ) {
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

function recordActiveOnlyFamilyThrottleSkip( state, signature, familyKey ) {
	state.lastActiveOnlyFamilyThrottleSkips ??= [];
	state.lastActiveOnlyFamilyThrottleSkips.push( {
		at: new Date().toISOString(),
		hash: signature.hash,
		familyKey,
		launchFamilyKey: familyKey,
		sourceSemanticFamilyKey: getSourceSemanticFamilyKey( signature ),
		semanticFamilyKey: getSemanticFamilyKey( signature ),
		detailedFamilyKey: signature.familyKey ?? null,
		reason:
			'ambiguous product-evidence timeout/unknown already has an active or completed first-level representative',
	} );
	state.lastActiveOnlyFamilyThrottleSkips =
		state.lastActiveOnlyFamilyThrottleSkips.slice( -50 );
}

function recordFamilyCapOnlySkip( state, signature, familyKey ) {
	state.lastFamilyCapOnlySkips ??= [];
	state.lastFamilyCapOnlySkips.push( {
		at: new Date().toISOString(),
		hash: signature.hash,
		familyKey,
		semanticFamilyKey: getSemanticFamilyKey( signature ),
		detailedFamilyKey: signature.familyKey ?? null,
		reason:
			'family-cap-only housekeeping pass left uncapped product-evidence signature visible for normal analysis',
	} );
	state.lastFamilyCapOnlySkips = state.lastFamilyCapOnlySkips.slice( -50 );
}

function recordFamilyCappedJob( state, signature, familyKey ) {
	const existing = state.jobs[ signature.hash ];
	if ( TERMINAL_JOB_STATUSES.has( existing?.status ) ) {
		return;
	}

	state.jobs[ signature.hash ] = {
		hash: signature.hash,
		status: 'family-capped',
		attempts: existing?.attempts ?? 0,
		familyKey,
		launchFamilyKey: familyKey,
		sourceSemanticFamilyKey: getSourceSemanticFamilyKey( signature ),
		semanticFamilyKey: getSemanticFamilyKey( signature ),
		pid: null,
		sourceStatus: signature.status,
		sourceCount: signature.count ?? 0,
		startedAt: existing?.startedAt ?? new Date().toISOString(),
		completedAt: new Date().toISOString(),
		jobDir:
			existing?.jobDir ??
			path.join( STATE_DIR, 'signatures', signature.hash ),
		resultPath:
			existing?.resultPath ??
			path.join( STATE_DIR, 'signatures', signature.hash, 'result.json' ),
		reason:
			'semantic family already has an active/completed first-level analysis',
		maxPerFamily: MAX_PER_FAMILY,
	};
}

async function getFamilyLaunchCounts( sourceState, state ) {
	const signatureByHash = new Map(
		Object.values( sourceState.signatures ?? {} ).map( ( signature ) => [
			signature.hash,
			signature,
		] )
	);
	const counts = new Map();

	addFamilyLaunchCountsFromJobs( counts, state.jobs, signatureByHash );
	await addCurrentOutputPeerFamilyLaunchCounts( counts );

	return counts;
}

function addFamilyLaunchCountsFromJobs(
	counts,
	jobs,
	signatureByHash,
	{ currentOutputPeer = false } = {}
) {
	for ( const job of Object.values( jobs ?? {} ) ) {
		if ( ! [ 'completed', 'family-capped', 'running' ].includes( job.status ) ) {
			continue;
		}
		if ( job.status === 'running' && ! isProcessAlive( job.pid ) ) {
			continue;
		}

		const signature = signatureByHash.get( job.hash );
		if ( ! shouldCountJobForFamilyCap( job, signature ) ) {
			continue;
		}
		for ( const familyKey of getFamilyLaunchCountKeys( job, signature, {
			currentOutputPeer,
		} ) ) {
			counts.set( familyKey, ( counts.get( familyKey ) ?? 0 ) + 1 );
		}
	}
}

function getFamilyLaunchCountKeys(
	job,
	signature,
	{ currentOutputPeer = false } = {}
) {
	const keys = new Set();
	const sourceFamilyKey = signature
		? getAnalysisLaunchFamilyKey( signature )
		: null;
	if ( sourceFamilyKey ) {
		if ( currentOutputPeer ) {
			if (
				shouldApplyCurrentOutputFamilyCap(
					signature,
					sourceFamilyKey,
					job
				)
			) {
				keys.add( sourceFamilyKey );
			}
		} else if (
			! isActiveOnlyAnalysisLaunchFamily(
				signature,
				sourceFamilyKey
			) ||
			shouldApplyCurrentOutputFamilyCap(
				signature,
				sourceFamilyKey,
				job
			)
		) {
			keys.add( sourceFamilyKey );
		}
	}

	for ( const storedFamilyKey of getStoredJobFamilyCapKeys( job ) ) {
		keys.add( storedFamilyKey );
	}

	return [ ...keys ];
}

async function addCurrentOutputPeerFamilyLaunchCounts( counts ) {
	const peerRunDirs = await getCurrentOutputPeerRunDirs();
	for ( const peerRunDir of peerRunDirs ) {
		const [ peerSourceState, peerAnalysisState ] = await Promise.all( [
			readJson( path.join( peerRunDir, '.triage-watcher/state.json' ), null ),
			readJson(
				path.join(
					peerRunDir,
					'.triage-watcher/analysis-tier/state.json'
				),
				null
			),
		] );
		if ( ! peerAnalysisState?.jobs ) {
			continue;
		}
		const peerSignatureByHash = new Map(
			Object.values( peerSourceState?.signatures ?? {} ).map(
				( signature ) => [ signature.hash, signature ]
			)
		);
		addFamilyLaunchCountsFromJobs(
			counts,
			peerAnalysisState.jobs,
			peerSignatureByHash,
			{ currentOutputPeer: true }
		);
	}
}

function shouldApplyCurrentOutputFamilyCap( signature, familyKey, job = null ) {
	if ( signature ) {
		const semanticFamilyKey = getSemanticFamilyKey( signature );
		return (
			hasProductEvidence( signature ) &&
			( SEMANTIC_CAP_PRODUCT_EVIDENCE_FAMILIES.has(
				semanticFamilyKey
			) ||
				isActiveOnlyAnalysisLaunchFamily( signature, familyKey ) )
		);
	}
	if (
		typeof familyKey === 'string' &&
		familyKey.startsWith( 'active_product_evidence_' )
	) {
		return [ 'completed', 'running' ].includes(
			job?.status ?? 'unknown'
		);
	}
	return SEMANTIC_CAP_PRODUCT_EVIDENCE_FAMILIES.has(
		canonicalizeSemanticFamilyKey( familyKey )
	);
}

function shouldCountJobForFamilyCap( job, signature ) {
	if ( job.status === 'running' ) {
		if ( ! isProcessAlive( job.pid ) ) {
			return false;
		}

		return (
			shouldCountSourceSignatureForFamilyCap( job, signature ) ||
			shouldCountStoredJobForFamilyCap( job )
		);
	}

	if ( hasVisibleLikelyRealJobResult( job ) ) {
		return true;
	}

	return (
		shouldCountSourceSignatureForFamilyCap( job, signature ) ||
		shouldCountStoredJobForFamilyCap( job )
	);
}

function shouldCountSourceSignatureForFamilyCap( job, signature ) {
	if ( ! signature ) {
		return false;
	}

	const familyKey = getAnalysisLaunchFamilyKey( signature );
	if ( ! getSourceSuppressionReason( signature ) ) {
		return true;
	}

	return (
		hasProductEvidence( signature ) &&
		shouldApplyCurrentOutputFamilyCap( signature, familyKey, job )
	);
}

function shouldCountStoredJobForFamilyCap( job ) {
	return getStoredJobFamilyCapKeys( job ).length > 0;
}

function getStoredJobFamilyCapKeys( job ) {
	const keys = new Set();
	for ( const rawFamilyKey of [
		job.launchFamilyKey,
		job.sourceSemanticFamilyKey,
		job.semanticFamilyKey,
		job.familyKey,
		job.hash,
	] ) {
		addStoredJobFamilyCapKey( keys, job, rawFamilyKey );
	}

	const result = readJobResultSync( job );
	for ( const rawFamilyKey of [
		result?.distinctBugType,
		result?.semanticFamilyKey,
		result?.equivalenceClass,
	] ) {
		addStoredJobFamilyCapKey( keys, job, rawFamilyKey );
	}

	return [ ...keys ];
}

function addStoredJobFamilyCapKey( keys, job, rawFamilyKey ) {
	if ( ! rawFamilyKey ) {
		return;
	}
	if (
		typeof rawFamilyKey === 'string' &&
		rawFamilyKey.startsWith( 'active_product_evidence_' )
	) {
		if ( [ 'completed', 'running' ].includes( job.status ) ) {
			keys.add( rawFamilyKey );
		}
		return;
	}
	const familyKey = canonicalizeSemanticFamilyKey( rawFamilyKey );
	if ( SEMANTIC_CAP_PRODUCT_EVIDENCE_FAMILIES.has( familyKey ) ) {
		keys.add( familyKey );
	}
}

function hasVisibleLikelyRealJobResult( job ) {
	const result = readJobResultSync( job );
	if ( result?.classification !== 'likely_real' ) {
		return false;
	}

	return (
		result.recommendedTriageAction !== 'merge_with_duplicate' &&
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

function interleaveFirstSignaturePerFamily( signatures ) {
	const seenFamilies = new Set();
	const firstInFamily = [];
	const duplicateFamilyRest = [];

	for ( const signature of signatures ) {
		const familyKey = getAnalysisLaunchFamilyKey( signature );
		if ( seenFamilies.has( familyKey ) ) {
			duplicateFamilyRest.push( signature );
			continue;
		}

		seenFamilies.add( familyKey );
		firstInFamily.push( signature );
	}

	return [ ...firstInFamily, ...duplicateFamilyRest ];
}

function getAnalysisLaunchFamilyKey( signature ) {
	const semanticFamilyKey = getSourceSemanticFamilyKey( signature );
	if (
		hasProductEvidence( signature ) &&
		ACTIVE_ONLY_PRODUCT_EVIDENCE_ANALYSIS_FAMILIES.has( semanticFamilyKey )
	) {
		const transport = canonicalizeSemanticFamilyKey(
			signature?.facts?.transport ?? 'unknown'
		);
		return `active_product_evidence_${ transport }_${ semanticFamilyKey }`;
	}
	if (
		! hasProductEvidence( signature ) ||
		SEMANTIC_CAP_PRODUCT_EVIDENCE_FAMILIES.has( semanticFamilyKey )
	) {
		return semanticFamilyKey;
	}
	return signature.familyKey ?? semanticFamilyKey ?? signature.hash;
}

function getSourceSemanticFamilyKey( signature ) {
	if (
		isStrictPreActionStartupSignature( signature ) ||
		isSourceGatedStrictPreActionStartupSignature( signature )
	) {
		return 'pre_action_bootstrap_stall';
	}

	if ( isSourceFuzzHelperRestEndpointConstructionSignature( signature ) ) {
		return 'fuzz_helper_rest_endpoint_construction';
	}

	const raw =
		signature?.semanticFamilyKey ??
		signature?.equivalenceClass ??
		signature?.familyKey ??
		signature?.hash ??
		'unknown';
	const family = canonicalizeSemanticFamilyKey( raw );
	if ( family === 'unknown' ) {
		const inferredFamily =
			getProductEvidenceLifecycleSemanticFamily( signature );
		if ( inferredFamily ) {
			return inferredFamily;
		}
	}
	if ( family !== 'pre_action_bootstrap_stall' || ! hasProductEvidence( signature ) ) {
		return family;
	}
	const sourceFamily = canonicalizeSemanticFamilyKey(
		signature?.semanticFamilyKey ??
			signature?.equivalenceClass ??
			signature?.familyKey ??
			signature?.hash ??
			'unknown'
	);
	return sourceFamily === 'pre_action_bootstrap_stall'
		? signature?.familyKey ?? signature?.hash ?? sourceFamily
		: sourceFamily;
}

function isActiveOnlyAnalysisLaunchFamily( signature, familyKey ) {
	return (
		hasProductEvidence( signature ) &&
		typeof familyKey === 'string' &&
		familyKey.startsWith( 'active_product_evidence_' )
	);
}

function getSemanticFamilyKey( signature ) {
	if (
		isStrictPreActionStartupSignature( signature ) ||
		isSourceGatedStrictPreActionStartupSignature( signature )
	) {
		return 'pre_action_bootstrap_stall';
	}

	if ( isFuzzHelperRestEndpointConstructionSignature( signature ) ) {
		return 'fuzz_helper_rest_endpoint_construction';
	}

	const raw =
		signature?.analysisGate?.distinctBugType ??
		signature?.result?.distinctBugType ??
		signature?.semanticFamilyKey ??
		signature?.equivalenceClass ??
		signature?.familyKey ??
		signature?.hash ??
		'unknown';
	const family = canonicalizeSemanticFamilyKey( raw );
	if ( family === 'unknown' ) {
		const inferredFamily =
			getProductEvidenceLifecycleSemanticFamily( signature );
		if ( inferredFamily ) {
			return inferredFamily;
		}
	}
	if ( family !== 'pre_action_bootstrap_stall' || ! hasProductEvidence( signature ) ) {
		return family;
	}
	const sourceFamily = canonicalizeSemanticFamilyKey(
		signature?.semanticFamilyKey ??
			signature?.equivalenceClass ??
			signature?.familyKey ??
			signature?.hash ??
			'unknown'
	);
	return sourceFamily === 'pre_action_bootstrap_stall'
		? signature?.familyKey ?? signature?.hash ?? sourceFamily
		: sourceFamily;
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

function isFuzzHelperRestEndpointConstructionSignature( signature ) {
	const decisionFamily = canonicalizeSemanticFamilyKey(
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

function isSourceFuzzHelperRestEndpointConstructionSignature( signature ) {
	const facts = signature?.facts ?? {};
	const normalized = String( signature?.normalized ?? '' );
	return (
		facts.lastAction === 'insert-media-cross-entity-block' &&
		/collaboration-fuzz\.spec\.ts:(?:4864|4882|4883|4890)\b/.test(
			normalized
		)
	);
}

function canonicalizeSemanticFamilyKey( value ) {
	const normalized = String( value ?? 'unknown' )
		.toLowerCase()
		.replaceAll( '`', '' )
		.replaceAll( "'", '' )
		.replaceAll( '"', '' )
		.replace( /[^a-z0-9]+/g, '_' )
		.replace( /_+/g, '_' )
		.replace( /^_|_$/g, '' );

	if (
		/rest_meta_database_error|rest.*meta.*database|wp_persisted_preferences/.test(
			normalized
		)
	) {
		return 'rest_meta_database_error';
	}
	if (
		/linebreak|newline|br.*serialization|codeblock|preformatted|verse/.test(
			normalized
		)
	) {
		return 'linebreak_representation_drift';
	}
	if ( /cover.*overlay|isuseroverlaycolor/.test( normalized ) ) {
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
	if ( /bootstrap|pre_action.*startup|startup.*discovery/.test( normalized ) ) {
		return 'pre_action_bootstrap_stall';
	}
	if ( /pre_action.*awareness/.test( normalized ) ) {
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
	if ( /operation.*witness.*missing|witness.*loss/.test( normalized ) ) {
		return 'operation_witness_missing';
	}
	return normalized || 'unknown';
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

async function launchCodexAnalysisJob( sourceState, state, signature ) {
	const jobDir = path.join( STATE_DIR, 'signatures', signature.hash );
	const resultPath = path.join( jobDir, 'result.json' );
	const promptPath = path.join( jobDir, 'prompt.txt' );
	const stdoutPath = path.join( jobDir, 'events.jsonl' );
	const stderrPath = path.join( jobDir, 'stderr.log' );
	const analysisPath = path.join( jobDir, 'analysis.md' );
	const handoffPath = path.join( jobDir, 'handoff.md' );
	const compactContextPath = path.join( jobDir, 'compact-context.json' );
	const launchFamilyKey = getAnalysisLaunchFamilyKey( signature );
	const sourceSemanticFamilyKey = getSourceSemanticFamilyKey( signature );

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
				launchFamilyKey,
				sourceSemanticFamilyKey,
			familyKey: signature.familyKey ?? signature.hash,
			semanticFamilyKey: getSemanticFamilyKey( signature ),
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
			semanticFamilyKey: getSemanticFamilyKey( signature ),
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
		`Semantic family key: ${ getSemanticFamilyKey( signature ) }`,
		`Detailed family key: ${ signature.familyKey ?? 'unknown' }`,
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
	const semanticFamilyKey = getSemanticFamilyKey( signature );
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
			getSemanticFamilyKey( sourceSignature ) !== semanticFamilyKey &&
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
			`[${ new Date().toISOString() }] stale run dir: ${ staleRunDirReason }; exiting without launching analysis\n`
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
	const noAnalysis = await readNoAnalysisSentinel();

	const state = await readState();
	state.lastGateOnlyTriageRefresh = gateOnlyRefresh;
	await reconcileJobs( state );
	await suppressJobsWithInactiveSource( state, sourceState, noAnalysis );
	if ( gateOnlyRefresh.status === 'failed' ) {
		state.lastLaunchSkippedForGateOnlyFailure = {
			at: new Date().toISOString(),
			reason:
				'gate-only triage refresh failed; reconciled and suppressed stale/noise jobs but skipped new analysis launches for this pass',
			gateOnlyRefresh,
		};
	} else {
		await launchQueuedAnalysisJobs( sourceState, state, noAnalysis );
	}
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
		} producerNoAnalysis=${ noAnalysis ? 'yes' : 'no' } counts=${ JSON.stringify(
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
