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
const NO_ANALYSIS_SENTINEL_PATH = path.join( STATE_DIR, 'no-analysis.json' );
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
const NO_ANALYSIS_SENTINEL_COMPATIBILITY_HOURS = getPositiveNumberEnv(
	'RTC_FUZZ_NO_ANALYSIS_SENTINEL_COMPATIBILITY_HOURS',
	6
);
const STALE_ROOT_GUARD_ENABLED =
	process.env.RTC_FUZZ_TRIAGE_STALE_ROOT_GUARD !== '0';
const CURRENT_OUTPUT_POINTER_PATH =
	process.env.RTC_FUZZ_TRIAGE_CURRENT_OUTPUT_POINTER ?? null;
const SUPERVISOR_STATE_PATH =
	process.env.RTC_FUZZ_TRIAGE_SUPERVISOR_STATE_PATH ?? null;
const ALLOW_STANDALONE_TRIAGE_LAUNCH =
	process.env.RTC_FUZZ_TRIAGE_ALLOW_STANDALONE_LAUNCH === '1' ||
	process.env.RTC_FUZZ_TRIAGE_ALLOW_OFFLINE === '1' ||
	! STALE_ROOT_GUARD_ENABLED;
const NON_LAUNCHABLE_SIGNATURE_STATUSES = new Set( [
	'completed',
	'not-real',
	'infra',
	'bootstrap-stall',
	'family-capped',
	'known-infra',
	'no-realistic-repro',
	'analysis-gated',
	'source-suppressed',
	'stale-source',
] );
const EXIT_PRESERVED_SIGNATURE_STATUSES = new Set(
	NON_LAUNCHABLE_SIGNATURE_STATUSES
);
const ACTIVE_GROUP_STATUSES = new Set( [
	'starting',
	'launching',
	'recovering',
	'running',
] );
const NON_ACTIONABLE_ANALYSIS_JOB_STATUSES = new Set( [
	'family-capped',
	'source-suppressed',
	'stale-source',
] );
const VISIBLE_DECISION_PRESERVED_STATUSES = new Set( [
	'bootstrap-stall',
	'family-capped',
	'known-infra',
	'source-suppressed',
	'stale-source',
] );
const SOURCE_RECONCILE_STATUSES = new Set( [ 'queued', 'retry' ] );
const ABSENT_NO_PRODUCT_STALE_STATUSES = new Set( [
	'analysis-gated',
	'completed',
	'queued',
	'retry',
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
const PRODUCT_EVIDENCE_DUPLICATE_PROPAGATION_FAMILIES = new Set( [
	'reload_rejoin_awareness_stall',
] );
const PRODUCER_NO_ANALYSIS_FAMILY_CAP_REASON_KINDS = new Set( [
	'known-noise',
	'startup-noise',
	'triage-duplicate-noise',
] );

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

async function readJsonFile( filePath ) {
	try {
		return JSON.parse( await fs.readFile( filePath, 'utf8' ) );
	} catch {
		return null;
	}
}

async function readActiveSupervisorRunDirSet() {
	if ( ! SUPERVISOR_STATE_PATH ) {
		return null;
	}

	const supervisorState = await readJsonFile( SUPERVISOR_STATE_PATH );
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
		! GATE_ONLY &&
		! currentOutput &&
		! SUPERVISOR_STATE_PATH &&
		! ALLOW_STANDALONE_TRIAGE_LAUNCH
	) {
		return 'missing current-output pointer or supervisor state; refusing direct triage Codex launch without RTC_FUZZ_TRIAGE_ALLOW_STANDALONE_LAUNCH=1';
	}
	const noAnalysis = await readNoAnalysisSentinel();
	if ( noAnalysis?.preserveProductEvidence === true ) {
		return null;
	}
	return getInactiveSupervisorRunDirReason();
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
	let state;
	try {
		state = JSON.parse( await fs.readFile( STATE_PATH, 'utf8' ) );
	} catch {
		state = createInitialState();
	}
	repairMalformedSignatureRecords( state );
	return state;
}

function repairMalformedSignatureRecords( state ) {
	if ( ! state || typeof state !== 'object' ) {
		return;
	}
	if ( ! state.signatures || typeof state.signatures !== 'object' ) {
		state.signatures = {};
		return;
	}

	let repaired = 0;
	for ( const [ key, signature ] of Object.entries( state.signatures ) ) {
		if ( ! signature || typeof signature !== 'object' ) {
			const hash = safeSignatureHashForPath( key );
			const jobDir = path.join( STATE_DIR, 'signatures', hash );
			state.signatures[ key ] = {
				hash,
				status: 'source-suppressed',
				attempts: 0,
				count: 0,
				jobDir,
				examples: [],
				resultPath: path.join( jobDir, 'result.json' ),
				suppressedByWatcher:
					'malformed signature record lacked an object payload',
				suppressedByWatcherAt: new Date().toISOString(),
			};
			repaired += 1;
			continue;
		}

		let changed = false;
		if ( ! signature.hash || typeof signature.hash !== 'string' ) {
			signature.hash = safeSignatureHashForPath( key );
			changed = true;
		}
		if ( ! signature.jobDir || typeof signature.jobDir !== 'string' ) {
			signature.jobDir = path.join(
				STATE_DIR,
				'signatures',
				safeSignatureHashForPath( signature.hash )
			);
			changed = true;
		}
		if (
			! signature.resultPath ||
			typeof signature.resultPath !== 'string'
		) {
			signature.resultPath = path.join( signature.jobDir, 'result.json' );
			changed = true;
		}
		if ( ! Array.isArray( signature.examples ) ) {
			signature.examples = [];
			changed = true;
		}
		if ( ! Number.isFinite( signature.attempts ) ) {
			signature.attempts = 0;
			changed = true;
		}
		if ( ! signature.status || typeof signature.status !== 'string' ) {
			signature.status = hasProductEvidence( signature )
				? 'queued'
				: 'source-suppressed';
			if ( signature.status === 'source-suppressed' ) {
				signature.suppressedByWatcher =
					'malformed signature record lacked a launchable status and had no product evidence';
				signature.suppressedByWatcherAt =
					new Date().toISOString();
			}
			changed = true;
		}
		if ( changed ) {
			repaired += 1;
		}
	}

	if ( repaired > 0 ) {
		state.lastMalformedSignatureRepair = {
			at: new Date().toISOString(),
			count: repaired,
			reason:
				'normalized malformed or legacy signature records so gate-only triage can continue failing closed',
		};
	}
}

function safeSignatureHashForPath( value ) {
	const normalized = String( value ?? 'unknown' )
		.replace( /[^A-Za-z0-9_-]+/g, '-' )
		.replace( /^-+|-+$/g, '' )
		.slice( 0, 128 );
	return normalized || 'unknown';
}

async function readNoAnalysisSentinel() {
	let sentinel;
	try {
		sentinel = JSON.parse(
			await fs.readFile( NO_ANALYSIS_SENTINEL_PATH, 'utf8' )
		);
	} catch {
		return null;
	}
	const currentOutput = await readCurrentOutputRoot();
	if ( ! isActiveNoAnalysisSentinel( sentinel, currentOutput ) ) {
		return null;
	}
	return sentinel;
}

async function writeState( state ) {
	state.updatedAt = new Date().toISOString();
	state.metrics = summarizeStateMetrics( state );
	await fs.mkdir( STATE_DIR, { recursive: true } );
	await fs.writeFile( STATE_PATH, JSON.stringify( state, null, 2 ) + '\n' );
}

function summarizeStateMetrics( state ) {
	const signatures = Object.values( state.signatures ?? {} );
	const suppressedStrictStartup =
		state.suppressedKnownNoise?.strictPreActionStartup ?? {};
	const statusCounts = {};
	const classificationCounts = {};
	const recommendedActionCounts = {};
	const equivalenceClassCounts = {};
	const preDecisionFamilyCounts = {};
	const semanticFamilyCounts = {};
	let likelyRealVisible = 0;
	let likelyRealMerged = 0;
	let likelyRealOracleQuestion = 0;
	let bootstrapStalls = 0;
	let normalizationNoiseCandidates = 0;

	for ( const signature of signatures ) {
		const status = signature.status ?? 'unknown';
		statusCounts[ status ] = ( statusCounts[ status ] ?? 0 ) + 1;

		const equivalenceClass = signature.equivalenceClass ?? 'unknown';
		equivalenceClassCounts[ equivalenceClass ] =
			( equivalenceClassCounts[ equivalenceClass ] ?? 0 ) + 1;

		const preDecisionFamily = getPreDecisionFamilyLabel( signature );
		preDecisionFamilyCounts[ preDecisionFamily ] =
			( preDecisionFamilyCounts[ preDecisionFamily ] ?? 0 ) + 1;

		if (
			equivalenceClass === 'pre-action-bootstrap-stall' ||
			status === 'bootstrap-stall'
		) {
			bootstrapStalls += 1;
		}

		if (
			equivalenceClass === 'linebreak-representation-drift' ||
			isLikelyNormalizationNoise( signature )
		) {
			normalizationNoiseCandidates += 1;
		}

		const decision = getSignatureDecision( signature );
		if ( ! decision ) {
			continue;
		}

		const classification = decision.classification ?? 'unknown';
		classificationCounts[ classification ] =
			( classificationCounts[ classification ] ?? 0 ) + 1;

		const action =
			decision.recommendedTriageAction ??
			decision.candidateStatus ??
			'unknown';
		recommendedActionCounts[ action ] =
			( recommendedActionCounts[ action ] ?? 0 ) + 1;

		const semanticFamily = getSemanticFamilyLabel( signature );
		semanticFamilyCounts[ semanticFamily ] =
			( semanticFamilyCounts[ semanticFamily ] ?? 0 ) + 1;

		if ( classification === 'likely_real' ) {
			if (
				action === 'merge_with_duplicate' ||
				decision.isDuplicateOf ||
				decision.duplicateOf
			) {
				likelyRealMerged += 1;
			} else if (
				signature.equivalenceClass ===
					'linebreak-representation-drift' ||
				isLikelyNormalizationNoise( signature )
			) {
				likelyRealOracleQuestion += 1;
			} else {
				likelyRealVisible += 1;
			}
		}
	}

	const topPreDecisionFamilies = Object.entries( preDecisionFamilyCounts )
		.sort( ( left, right ) => right[ 1 ] - left[ 1 ] )
		.slice( 0, 20 )
		.map( ( [ family, count ] ) => ( { family, count } ) );
	const topSemanticFamilies = Object.entries( semanticFamilyCounts )
		.sort( ( left, right ) => right[ 1 ] - left[ 1 ] )
		.slice( 0, 20 )
		.map( ( [ family, count ] ) => ( { family, count } ) );
	const topPreDecisionFamilyShare =
		signatures.length === 0 || topPreDecisionFamilies.length === 0
			? 0
			: Number(
					(
						topPreDecisionFamilies[ 0 ].count / signatures.length
					).toFixed( 4 )
			  );
	const topDuplicateFamilyShare =
		signatures.length === 0 || topSemanticFamilies.length === 0
			? 0
			: Number(
					(
						topSemanticFamilies[ 0 ].count / signatures.length
					).toFixed( 4 )
			  );

	return {
		updatedAt: new Date().toISOString(),
		signatureCount: signatures.length,
		statusCounts,
		classificationCounts,
		recommendedActionCounts,
		equivalenceClassCounts,
		likelyRealVisible,
		likelyRealMerged,
		likelyRealOracleQuestion,
		bootstrapStalls,
		normalizationNoiseCandidates,
		topPreDecisionFamilyShare,
		topPreDecisionFamilies,
		topDuplicateFamilyShare,
		topSemanticFamilies,
		suppressedKnownNoise: {
			strictPreActionStartup: suppressedStrictStartup,
		},
	};
}

function getSignatureDecision( signature ) {
	return signature.analysisGate ?? signature.result ?? null;
}

function getSemanticFamilyLabel( signature ) {
	const decision = getSignatureDecision( signature );
	return canonicalizeSemanticLabel(
		normalizeSemanticLabel(
			decision?.distinctBugType ??
				signature.equivalenceClass ??
				signature.familyKey ??
				signature.hash
		)
	);
}

function getPreDecisionFamilyLabel( signature ) {
	return canonicalizeSemanticLabel(
		normalizeSemanticLabel(
			signature.equivalenceClass ?? signature.familyKey ?? signature.hash
		)
	);
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

function isLikelyNormalizationNoise( signature ) {
	const semanticFamily = getSemanticFamilyLabel( signature );
	if (
		[
			'linebreak_representation_drift',
			'cover_overlay_attribute_canonicalization',
		].includes( semanticFamily )
	) {
		return true;
	}

	const normalized = signature.normalized ?? '';
	return (
		/(core\/code|core\/preformatted|core\/verse)/.test( normalized ) &&
		/(<br\s*\/?>|\\n|linebreak|newline)/i.test( normalized )
	);
}

function canonicalizeSemanticLabel( normalized ) {
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
	const strictPreActionStartup = createStrictStartupNoiseSummary();

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

			const candidate = {
				record,
				summaryPath,
				lineIndex: lineIndex + 1,
				signature: getFailureSignature( record ),
			};

			if ( shouldSuppressStrictPreActionStartupCandidate( candidate ) ) {
				recordSuppressedStrictStartupNoise(
					strictPreActionStartup,
					candidate
				);
				continue;
			}

			candidates.push( candidate );
		}
	}

	return {
		candidates: coalesceSameSourceCandidates( candidates ),
		suppressedKnownNoise: {
			strictPreActionStartup:
				finalizeStrictStartupNoiseSummary(
					strictPreActionStartup
				),
		},
	};
}

function coalesceSameSourceCandidates( candidates ) {
	const bySource = new Map();

	for ( const candidate of candidates ) {
		const sourceKey = getCandidateSourceKey( candidate );
		const existing = bySource.get( sourceKey );
		if (
			! existing ||
			getCandidateSourcePriority( candidate ) >
				getCandidateSourcePriority( existing )
		) {
			bySource.set( sourceKey, candidate );
		}
	}

	return [ ...bySource.values() ].sort( ( left, right ) => {
		if ( left.summaryPath !== right.summaryPath ) {
			return left.summaryPath.localeCompare( right.summaryPath );
		}
		return left.lineIndex - right.lineIndex;
	} );
}

function getCandidateSourceKey( candidate ) {
	const { record, summaryPath } = candidate;
	const seed = record.seed ?? 'unknown-seed';
	const source =
		record.replayPath ??
		record.logPath ??
		record.artifactsDir ??
		record.attempts?.[ 0 ]?.replayPath ??
		record.attempts?.[ 0 ]?.logPath ??
		record.attempts?.[ 0 ]?.artifactsDir ??
		summaryPath;
	const hasSpecificSource = seed !== 'unknown-seed' || source !== summaryPath;

	return [ seed, source, hasSpecificSource ? '' : candidate.lineIndex ].join(
		'\0'
	);
}

function getCandidateSourcePriority( candidate ) {
	const { record, signature } = candidate;
	let priority = 0;

	if (
		hasProductEvidence( signature ) ||
		recordHasProductEvidenceCoverage( record )
	) {
		priority += 1000;
	}
	if ( ! isDisabledInlineAnalysisCandidate( candidate ) ) {
		priority += 100;
	}
	if ( record.kind !== 'attempt' ) {
		priority += 50;
	}
	if ( record.kind === 'real-bug' ) {
		priority += 25;
	}
	if ( record.failureSnippet || record.output ) {
		priority += 20;
	}
	if (
		record.replayPath ||
		record.logPath ||
		record.artifactsDir ||
		record.attempts?.[ 0 ]?.replayPath ||
		record.attempts?.[ 0 ]?.logPath ||
		record.attempts?.[ 0 ]?.artifactsDir
	) {
		priority += 10;
	}

	return priority;
}

function isDisabledInlineAnalysisCandidate( candidate ) {
	const summary = candidate.record?.codex?.result?.summary ?? '';
	return /Inline Codex analysis is disabled/i.test( summary );
}

function createStrictStartupNoiseSummary() {
	return {
		recordCount: 0,
		identityCount: 0,
		recordsByProfile: {},
		knownNoiseByFamily: {},
		knownNoiseByProfile: {},
		knownStartupNoiseByProfile: {},
		samples: [],
		suppressedHashes: new Set(),
		identityKeys: new Set(),
	};
}

function recordSuppressedStrictStartupNoise( summary, candidate ) {
	const { record, signature, summaryPath, lineIndex } = candidate;
	const family = getStrictStartupKnownNoiseFamily( signature, record );
	const profile = getSignatureMetricProfile( signature );
	const seed = record.seed ?? 'unknown-seed';
	const source =
		record.logPath ??
		record.artifactsDir ??
		record.attempts?.[ 0 ]?.logPath ??
		record.attempts?.[ 0 ]?.artifactsDir ??
		summaryPath;
	const identityKey =
		seed === 'unknown-seed'
			? [ family, profile, source, signature.hash ].join( '\0' )
			: [ family, profile, seed ].join( '\0' );

	summary.recordCount += 1;
	summary.suppressedHashes.add( signature.hash );
	incrementCounter( summary.recordsByProfile, profile );

	if ( ! summary.identityKeys.has( identityKey ) ) {
		summary.identityKeys.add( identityKey );
		summary.identityCount += 1;
		incrementCounter( summary.knownNoiseByFamily, family );
		incrementCounter( summary.knownNoiseByProfile, profile );
		incrementCounter( summary.knownStartupNoiseByProfile, profile );
	}

	if ( summary.samples.length >= 10 ) {
		return;
	}

	summary.samples.push( {
		summaryPath,
		lineIndex,
		kind: record.kind,
		seed: record.seed ?? null,
		family,
		profile,
		transport: signature.facts?.transport ?? 'unknown',
		logPath:
			record.logPath ?? record.attempts?.[ 0 ]?.logPath ?? null,
		artifactsDir:
			record.artifactsDir ??
			record.attempts?.[ 0 ]?.artifactsDir ??
			null,
	} );
}

function finalizeStrictStartupNoiseSummary( summary ) {
	const { identityKeys, suppressedHashes, ...serializableSummary } = summary;
	return {
		...serializableSummary,
		suppressedHashes: [ ...suppressedHashes ],
	};
}

function getStrictStartupKnownNoiseFamily( signature, record = null ) {
	if ( isNoProductPreActionStartupGate( record?.preAnalysisGate ) ) {
		return 'pre_action_bootstrap_stall';
	}
	if ( isStrictPreActionStartupSignature( signature ) ) {
		return 'pre_action_bootstrap_stall';
	}

	const family = getPreDecisionFamilyLabel( signature );
	return family === 'pre_action_awareness_stall'
		? 'pre_action_bootstrap_stall'
		: family;
}

function getSignatureMetricProfile( signature ) {
	return signature?.facts?.actionProfile ?? 'unknown';
}

function incrementCounter( counter, key ) {
	counter[ key ] = ( counter[ key ] ?? 0 ) + 1;
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
	const family = getFailureFamily( facts, normalized );
	const hash = crypto
		.createHash( 'sha1' )
		.update( JSON.stringify( getSignatureHashFacts( facts, family ) ) )
		.update( '\n' )
		.update( normalized )
		.digest( 'hex' )
		.slice( 0, 12 );

	return {
		equivalenceClass: family.equivalenceClass,
		facts,
		familyKey: family.key,
		hash,
		normalized,
	};
}

function getSignatureHashFacts( facts, family ) {
	if ( family.equivalenceClass === 'operation-witness-missing' ) {
		return {
			actionProfile: facts.actionProfile,
			equivalenceClass: family.equivalenceClass,
			failureClass: facts.failureClass,
			lifecycleContext: facts.lifecycleContext,
			operationWitnessActions: facts.operationWitnessActions,
			operationWitnessPhase: facts.operationWitnessPhase,
			operationWitnessScopes: facts.operationWitnessScopes,
			transport: facts.transport,
			userCount: facts.userCount,
		};
	}

	return facts;
}

function getPrimaryCoverageRecord( record ) {
	const records = getBehavioralCoverageRecords( record );
	return (
		records.find( coverageRecordHasProductEvidence ) ??
		records[ 0 ] ??
		null
	);
}

function getBehavioralCoverageRecords( record ) {
	const records = [];
	for ( const coverage of record.behavioralCoverage ?? [] ) {
		if ( ! coverage?.parseError ) {
			records.push( coverage );
		}
	}
	for ( const attempt of record.attempts ?? [] ) {
		for ( const coverage of attempt.behavioralCoverage ?? [] ) {
			if ( ! coverage?.parseError ) {
				records.push( coverage );
			}
		}
	}
	return records;
}

function coverageRecordHasProductEvidence( coverage ) {
	return (
		( coverage?.userCount ?? 0 ) > 0 ||
		( coverage?.actions?.length ?? 0 ) > 0 ||
		( coverage?.reloads?.length ?? 0 ) > 0 ||
		( coverage?.saveCheckpointSteps?.length ?? 0 ) > 0 ||
		( coverage?.autosaveSteps?.length ?? 0 ) > 0 ||
		coverage?.revisionRestore?.eligible === true ||
		( coverage?.operationEvents?.length ?? 0 ) > 0
	);
}

function recordHasProductEvidenceCoverage( record ) {
	if (
		( record.behavioralCoverageSummary?.actionCount ?? 0 ) > 0 ||
		( record.behavioralCoverageSummary?.reloadCount ?? 0 ) > 0 ||
		( record.behavioralCoverageSummary?.saveCheckpointCount ?? 0 ) > 0 ||
		( record.behavioralCoverageSummary?.autosaveCount ?? 0 ) > 0 ||
		( record.behavioralCoverageSummary?.revisionEligibleCount ?? 0 ) > 0
	) {
		return true;
	}

	if (
		Object.entries(
			record.behavioralCoverageSummary?.userCounts ?? {}
		).some(
			( [ userCount, count ] ) =>
				Number( userCount ) > 0 && Number( count ) > 0
		)
	) {
		return true;
	}

	return getBehavioralCoverageRecords( record ).some(
		coverageRecordHasProductEvidence
	);
}

function classifyFailureText( text ) {
	if ( /rest_meta_database_error/.test( text ) ) {
		return 'rest-meta-database-error';
	}
	if ( /RTC operation witness missing/i.test( text ) ) {
		return 'operation-witness-missing';
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

function parseOperationWitnessMissing( text ) {
	const match = text.match(
		/RTC operation witness missing during ([^:]+):\s*(\[[^\n]*\])/i
	);
	if ( ! match ) {
		return null;
	}

	const phase = match[ 1 ].trim();
	let entries = [];
	try {
		entries = JSON.parse( match[ 2 ] );
	} catch {
		entries = [];
	}

	const actionLabels = [
		...new Set(
			entries
				.map( ( entry ) => entry?.actionLabel )
				.filter( Boolean )
				.map( String )
		),
	].sort();
	const scopes = [
		...new Set(
			entries
				.map( ( entry ) => entry?.scope )
				.filter( Boolean )
				.map( String )
		),
	].sort();

	return {
		actionLabels,
		phase,
		scopes,
	};
}

function getLifecycleContext( coverage, witness, lastHistoryEvent ) {
	const phase = `${ witness?.phase ?? '' } ${
		lastHistoryEvent?.phase ?? ''
	}`.toLowerCase();

	if ( /revision/.test( phase ) || coverage?.revisionRestore?.eligible ) {
		return 'revision-restore';
	}
	if ( /late-join/.test( phase ) ) {
		return 'late-join';
	}
	if ( /same-user|rejoin/.test( phase ) ) {
		return 'same-user-rejoin';
	}
	if ( /reload/.test( phase ) || ( coverage?.reloads?.length ?? 0 ) > 0 ) {
		return 'reload';
	}
	if (
		/save|persisted/.test( phase ) ||
		( coverage?.saveCheckpointSteps?.length ?? 0 ) > 0
	) {
		return 'save';
	}
	return 'editing';
}

function getFailureFacts( record, text ) {
	const coverage = getPrimaryCoverageRecord( record );
	const actions = coverage?.actions ?? [];
	const historyEvents = coverage?.historyEvents ?? [];
	const lastHistoryEvent = historyEvents.at( -1 );
	const lastAction = actions.at( -1 );
	const operationWitness = parseOperationWitnessMissing( text );

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
		autosaveCount: coverage?.autosaveSteps?.length ?? 0,
		faultTypes: [
			...new Set(
				( coverage?.faults ?? [] ).map(
					( fault ) => `${ fault.type }:${ fault.status ?? 'delay' }`
				)
			),
		].sort(),
		revisionEligible: coverage?.revisionRestore?.eligible === true,
		blockTypes: coverage?.blockStats?.types ?? [],
		lifecycleContext: getLifecycleContext(
			coverage,
			operationWitness,
			lastHistoryEvent
		),
		operationWitnessActions: operationWitness?.actionLabels ?? [],
		operationWitnessPhase: operationWitness?.phase ?? null,
		operationWitnessScopes: operationWitness?.scopes ?? [],
		userCount: coverage?.userCount ?? 0,
	};
}

function normalizeFailureText( text ) {
	if ( /rest_meta_database_error/.test( text ) ) {
		return 'rest_meta_database_error wp_persisted_preferences';
	}

	const operationWitness = parseOperationWitnessMissing( text );
	if ( operationWitness ) {
		return [
			'RTC operation witness missing',
			`actions=${
				operationWitness.actionLabels.join( ',' ) || 'unknown'
			}`,
			`scopes=${ operationWitness.scopes.join( ',' ) || 'unknown' }`,
			`phase=${ operationWitness.phase || 'unknown' }`,
		].join( ' ' );
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
		.replaceAll( REPO_ROOT, '<REPO_ROOT>' )
		.replace( /seed-\d+/g, 'seed-<n>' )
		.replace( /test-failed-\d+\.(png|webm|zip)/g, 'test-failed-<n>.$1' )
		.replace( /trace\.zip/g, 'trace.zip' )
		.replace( /markerHash":"[^"]+"/g, 'markerHash":"<hash>"' )
		.replace( /markerHash: [a-f0-9]{8,}/gi, 'markerHash: <hash>' );
}

function getFailureEquivalenceClass( facts, normalized ) {
	if ( facts.failureClass === 'operation-witness-missing' ) {
		return 'operation-witness-missing';
	}

	if (
		/(core\/code|core\/preformatted|core\/verse)/.test( normalized ) &&
		/(<br\s*\/?>|\\n)/i.test( normalized ) &&
		facts.failureClass === 'collaboration-non-convergence'
	) {
		return 'linebreak-representation-drift';
	}

	if (
		facts.userCount === 0 &&
		facts.lastHistoryStatus === 'fail' &&
		/(waitForCollaborationReady|setPreferences|_wpCollaborationEnabled|collaboration to become ready|page\.waitForFunction)/i.test(
			normalized
		)
	) {
		return 'pre-action-bootstrap-stall';
	}

	if (
		/waitForMutualDiscovery|mutual discovery|awareness/i.test( normalized )
	) {
		return facts.userCount === 0
			? 'pre-action-awareness-stall'
			: 'late-session-awareness-stall';
	}

	return facts.failureClass;
}

function getBlockFamily( blockTypes = [] ) {
	if ( ! blockTypes.length ) {
		return 'none';
	}

	const structuralTypes = blockTypes.filter( ( blockType ) =>
		[
			'core/group',
			'core/columns',
			'core/column',
			'core/list',
			'core/list-item',
			'core/table',
			'core/table-row',
		].includes( blockType )
	);

	return ( structuralTypes.length ? structuralTypes : blockTypes )
		.slice()
		.sort()
		.join( ',' );
}

function getFailureFamily( facts, normalized ) {
	const equivalenceClass = getFailureEquivalenceClass( facts, normalized );
	if ( equivalenceClass === 'operation-witness-missing' ) {
		const family = {
			actionProfile: facts.actionProfile,
			equivalenceClass,
			failureClass: facts.failureClass,
			lifecycleContext: facts.lifecycleContext,
			operationWitnessActions:
				facts.operationWitnessActions?.join( ',' ) || 'unknown',
			operationWitnessPhase: facts.operationWitnessPhase ?? 'unknown',
			operationWitnessScopes:
				facts.operationWitnessScopes?.join( ',' ) || 'unknown',
			saveCheckpointCount:
				facts.saveCheckpointCount > 0 ? 'has-save-checkpoint' : 'none',
			transport: facts.transport,
			userCount: facts.userCount,
		};

		return {
			key: crypto
				.createHash( 'sha1' )
				.update( JSON.stringify( family ) )
				.digest( 'hex' )
				.slice( 0, 12 ),
			...family,
		};
	}

	const family = {
		actionProfile: facts.actionProfile,
		blockFamily: getBlockFamily( facts.blockTypes ),
		equivalenceClass,
		failureClass: facts.failureClass,
		initialContentProfile: facts.initialContentProfile,
		lastAction: facts.lastAction,
		lastHistoryPhase: facts.lastHistoryPhase,
		revisionEligible: facts.revisionEligible,
		saveCheckpointCount:
			facts.saveCheckpointCount > 0 ? 'has-save-checkpoint' : 'none',
		transport: facts.transport,
		userCount: facts.userCount,
	};

	return {
		key: crypto
			.createHash( 'sha1' )
			.update( JSON.stringify( family ) )
			.digest( 'hex' )
			.slice( 0, 12 ),
		...family,
	};
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
	if ( ! hasSourceProductEvidence( signature ) ) {
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

function groupCandidatesBySignature( candidates ) {
	const groups = new Map();

	for ( const candidate of candidates ) {
		const existing = groups.get( candidate.signature.hash ) ?? {
			equivalenceClass: candidate.signature.equivalenceClass,
			familyKey: candidate.signature.familyKey,
			hash: candidate.signature.hash,
			normalized: candidate.signature.normalized,
			semanticFamilyKey: getSemanticFamilyKey( candidate.signature ),
			candidates: [],
		};
		existing.candidates.push( candidate );
		groups.set( candidate.signature.hash, existing );
	}

	return [ ...groups.values() ];
}

async function updateDiscoveredSignatures( state, groups ) {
	pruneStrictPreActionStartupSignatures( state );
	markStaleSourceSignatures( state, groups );

	for ( const group of groups ) {
		const existing = state.signatures[ group.hash ];
		const suppressedStatus = getSuppressedSignatureStatus(
			group.candidates[ 0 ]?.signature
		);
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
			existing.familyKey =
				existing.familyKey ??
				group.familyKey ??
				group.candidates[ 0 ]?.signature.familyKey ??
				null;
				existing.equivalenceClass =
					existing.equivalenceClass ??
					group.equivalenceClass ??
					group.candidates[ 0 ]?.signature.equivalenceClass ??
					null;
				const refreshedSemanticFamilyKey =
					group.semanticFamilyKey ?? getSemanticFamilyKey( existing );
				if (
					! existing.semanticFamilyKey ||
					existing.semanticFamilyKey === 'unknown' ||
					existing.semanticFamilyKey === existing.familyKey ||
					refreshedSemanticFamilyKey ===
						'fuzz_helper_rest_endpoint_construction'
				) {
					existing.semanticFamilyKey =
						refreshedSemanticFamilyKey ?? null;
				}
				if ( existing.status === 'stale-source' && ! suppressedStatus ) {
				existing.status = 'queued';
				existing.reactivatedFromStaleSourceAt =
					new Date().toISOString();
				delete existing.staleSourceAt;
				delete existing.staleSourceReason;
			}
			if ( suppressedStatus ) {
				markSignatureSuppressedByWatcher(
					existing,
					suppressedStatus
				);
			}
			existing.examples = mergeExamples( existing.examples, examples );
			continue;
		}

		const jobDir = path.join( STATE_DIR, 'signatures', group.hash );
		state.signatures[ group.hash ] = {
			equivalenceClass: group.equivalenceClass,
				familyKey: group.familyKey,
				hash: group.hash,
				semanticFamilyKey:
					group.semanticFamilyKey ??
					getSemanticFamilyKey( group.candidates[ 0 ]?.signature ),
				status: suppressedStatus ?? 'queued',
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
		if ( suppressedStatus ) {
			state.signatures[ group.hash ].suppressedByWatcher =
				getSuppressionReason(
					suppressedStatus,
					state.signatures[ group.hash ]
				);
		}
		await fs.mkdir( jobDir, { recursive: true } );
		await fs.writeFile(
			path.join( jobDir, 'failure.json' ),
			JSON.stringify( state.signatures[ group.hash ], null, 2 ) + '\n'
		);
	}
}

function markStaleSourceSignatures( state, groups ) {
	const currentHashes = new Set( groups.map( ( group ) => group.hash ) );
	let staleCount = 0;

	for ( const signature of Object.values( state.signatures ?? {} ) ) {
		if ( currentHashes.has( signature.hash ) ) {
			continue;
		}

		if (
			shouldMarkAbsentSignatureStale( signature )
		) {
			if ( signature.status === 'running' ) {
				terminateSignatureProcess( signature );
			}
			signature.status = 'stale-source';
		} else {
			continue;
		}

		signature.pid = null;
		signature.staleSourceAt = new Date().toISOString();
		signature.staleSourceReason =
			'signature was absent from the current non-suppressed failure scan';
		staleCount += 1;
	}

	if ( staleCount > 0 ) {
			state.lastStaleSourceReconcile = {
				at: new Date().toISOString(),
				count: staleCount,
				reason:
					'absent queued/retry/no-product terminal source signatures are not launchable triage work',
			};
		}
	}

function shouldMarkAbsentSignatureStale( signature ) {
	if ( SOURCE_RECONCILE_STATUSES.has( signature.status ) ) {
		return true;
	}

	if ( ! ABSENT_NO_PRODUCT_STALE_STATUSES.has( signature.status ) ) {
		return false;
	}

	if ( hasProductEvidence( signature ) ) {
		return false;
	}

	return ! hasVisibleLikelyRealDecision( signature );
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

function markSignatureSuppressedByWatcher( signature, suppressedStatus ) {
	if ( NON_LAUNCHABLE_SIGNATURE_STATUSES.has( signature.status ) ) {
		if ( signature.status === suppressedStatus ) {
			signature.suppressedByWatcher = getSuppressionReason(
				suppressedStatus,
				signature
			);
			signature.suppressedByWatcherAt =
				signature.suppressedByWatcherAt ?? new Date().toISOString();
		}
		return;
	}

	if ( signature.status === 'running' ) {
		terminateSignatureProcess( signature );
	}

	signature.pid = null;
	signature.status = suppressedStatus;
	signature.suppressedByWatcher = getSuppressionReason(
		suppressedStatus,
		signature
	);
	signature.suppressedByWatcherAt = new Date().toISOString();
}

function suppressSourceGatedStrictStartupSignatures( state, suppressedKnownNoise ) {
	const hashes =
		suppressedKnownNoise?.strictPreActionStartup?.suppressedHashes ?? [];
	let suppressed = 0;

	for ( const hash of hashes ) {
		const signature = state.signatures?.[ hash ];
		if ( ! signature ) {
			continue;
		}
		const sourceGatedStrictStartup =
			isSourceGatedStrictPreActionStartupSignature( signature );
		if (
			( ! sourceGatedStrictStartup &&
				hasSourceProductEvidence( signature ) ) ||
			( ! isStrictPreActionStartupSignature( signature ) &&
				! sourceGatedStrictStartup )
		) {
			continue;
		}
		if ( signature.status === 'running' ) {
			terminateSignatureProcess( signature );
		}
		signature.pid = null;
		signature.status = 'bootstrap-stall';
		signature.suppressedByWatcher =
			'source pre-analysis gate classified this record as no-product pre-action startup/discovery failure';
		signature.suppressedByWatcherAt = new Date().toISOString();
		signature.sourcePreAnalysisGate = {
			bucket: 'pre-action-bootstrap-stall',
			source: 'suppressed-known-noise-summary',
		};
		suppressed += 1;
	}

	return suppressed;
}

function suppressProducerInactiveSignatures( state, noAnalysis ) {
	if ( ! noAnalysis ) {
		delete state.producerNoAnalysis;
		return 0;
	}

	let suppressed = 0;
	let restoredProductEvidence = 0;
	for ( const signature of Object.values( state.signatures ?? {} ) ) {
		if (
			shouldRestoreProducerFamilyCappedProductEvidenceSignature(
				signature,
				noAnalysis
			)
		) {
			restoreProducerFamilyCappedProductEvidenceSignature(
				signature,
				noAnalysis
			);
			restoredProductEvidence += 1;
		}
		if ( NON_LAUNCHABLE_SIGNATURE_STATUSES.has( signature.status ) ) {
			continue;
		}
		const familyCapKey = getProducerNoAnalysisFamilyCapKey(
			signature,
			noAnalysis
		);
		if ( familyCapKey ) {
			if ( signature.status === 'running' ) {
				terminateSignatureProcess( signature );
			}
			signature.pid = null;
			signature.status = 'family-capped';
			signature.suppressedByWatcher =
				`producer paused by duplicate/noise policy for represented family ${ familyCapKey }`;
			signature.suppressedByWatcherAt = new Date().toISOString();
			signature.producerNoAnalysis = {
				group: noAnalysis.group ?? null,
				reasonKind: noAnalysis.reasonKind ?? null,
				family: noAnalysis.family ?? null,
				reason: noAnalysis.reason ?? null,
				createdAt: noAnalysis.createdAt ?? null,
			};
			signature.analysisGate = {
				gatedAt: signature.suppressedByWatcherAt,
				sourceTier: 'producer-no-analysis-sentinel',
				classification: null,
				confidence: null,
				userHitLikelihoodScore: 0,
				userHitLikelihoodRationale: '',
				distinctBugType: familyCapKey,
				semanticFamilyKey: familyCapKey,
				isDuplicateOf: null,
				candidateStatus: 'family-capped',
				recommendedTriageAction: 'merge_with_duplicate',
				summary:
					`producer no-analysis sentinel capped represented duplicate/noise family ${ familyCapKey }`,
				resultPath: null,
			};
			suppressed += 1;
			continue;
		}
		if ( hasSourceProductEvidence( signature ) ) {
			continue;
		}
		if ( signature.status === 'running' ) {
			terminateSignatureProcess( signature );
		}
		signature.pid = null;
		signature.status = 'source-suppressed';
		signature.suppressedByWatcher =
			'producer paused by duplicate/noise policy; no product evidence on this signature';
		signature.suppressedByWatcherAt = new Date().toISOString();
		signature.producerNoAnalysis = {
			group: noAnalysis.group ?? null,
			reasonKind: noAnalysis.reasonKind ?? null,
			reason: noAnalysis.reason ?? null,
			createdAt: noAnalysis.createdAt ?? null,
		};
		suppressed += 1;
	}

	state.producerNoAnalysis = {
		...noAnalysis,
		appliedAt: new Date().toISOString(),
		suppressedNoProductEvidenceSignatures: suppressed,
		restoredProductEvidenceSignatures: restoredProductEvidence,
	};
	return suppressed;
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
	const signatureFamilies = new Set(
		[
			getSemanticFamilyKey( signature ),
			signature?.semanticFamilyKey,
			signature?.equivalenceClass,
			signature?.familyKey,
			signature?.analysisGate?.semanticFamilyKey,
			signature?.analysisGate?.distinctBugType,
			signature?.result?.distinctBugType,
		]
			.map( canonicalizeSemanticFamilyKey )
			.filter( Boolean )
	);
	return signatureFamilies.has( noAnalysisFamily ) ? noAnalysisFamily : null;
}

function shouldRestoreProducerFamilyCappedProductEvidenceSignature(
	signature,
	noAnalysis
) {
	if (
		signature?.status !== 'family-capped' ||
		noAnalysis?.preserveProductEvidence !== true ||
		! hasSourceProductEvidence( signature )
	) {
		return false;
	}
	return (
		signature.producerNoAnalysis ||
		signature.analysisGate?.sourceTier === 'producer-no-analysis-sentinel'
	);
}

function restoreProducerFamilyCappedProductEvidenceSignature(
	signature,
	noAnalysis
) {
	signature.pid = null;
	signature.status = 'queued';
	signature.restoredByWatcher =
		'producer no-analysis sentinel preserves source product-evidence signatures until a real representative analysis exists';
	signature.restoredByWatcherAt = new Date().toISOString();
	signature.restoredProducerNoAnalysis = {
		group: noAnalysis.group ?? null,
		reasonKind: noAnalysis.reasonKind ?? null,
		family: noAnalysis.family ?? null,
		reason: noAnalysis.reason ?? null,
		createdAt: noAnalysis.createdAt ?? null,
	};
	if ( signature.analysisGate?.sourceTier === 'producer-no-analysis-sentinel' ) {
		delete signature.analysisGate;
	}
	delete signature.producerNoAnalysis;
	delete signature.suppressedByWatcher;
	delete signature.suppressedByWatcherAt;
}

async function markRunDirStaleSource( state, reason, noAnalysis = null ) {
	let changed = 0;
	for ( const signature of Object.values( state.signatures ?? {} ) ) {
			if (
				[
					'completed',
				'family-capped',
				'infra',
				'known-infra',
				'no-realistic-repro',
				'not-real',
				'source-suppressed',
				'stale-source',
				'bootstrap-stall',
			].includes( signature.status )
		) {
				continue;
			}
			if (
				noAnalysis?.preserveProductEvidence !== true &&
				hasVisibleLikelyRealDecision( signature )
			) {
				continue;
			}
			if (
				noAnalysis?.preserveProductEvidence === true &&
				hasSourceProductEvidence( signature )
			) {
				continue;
			}
			if ( signature.status === 'running' ) {
				terminateSignatureProcess( signature );
			}
		signature.previousStatus = signature.status ?? null;
		signature.status = 'stale-source';
		signature.pid = null;
		signature.staleSourceAt = new Date().toISOString();
		signature.staleSourceReason = reason;
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

function terminateSignatureProcess( signature ) {
	if ( ! signature?.pid || ! isProcessAlive( signature.pid ) ) {
		return;
	}

	try {
		process.kill( signature.pid, 'SIGTERM' );
	} catch {}
}

function pruneStrictPreActionStartupSignatures( state ) {
	let pruned = 0;

	for ( const [ hash, signature ] of Object.entries(
		state.signatures ?? {}
	) ) {
		if ( ! isStrictPreActionStartupSignature( signature ) ) {
			continue;
		}

		terminateSignatureProcess( signature );
		delete state.signatures[ hash ];
		pruned += 1;
	}

	if ( pruned > 0 ) {
		state.lastStrictPreActionStartupPrune = {
			at: new Date().toISOString(),
			count: pruned,
			reason:
				'strict pre-action startup/discovery records are aggregated as known-noise metrics instead of triage signatures',
		};
	}
}

function getSuppressedSignatureStatus( signature ) {
	const facts = signature?.facts;
	if ( ! facts ) {
		return null;
	}

	if (
		facts.failureClass === 'rest-meta-database-error' &&
		/wp_persisted_preferences/.test( signature.normalized ?? '' )
	) {
		return 'known-infra';
	}

	if ( isFuzzHelperRestEndpointConstructionSignature( signature ) ) {
		return 'family-capped';
	}

	if ( isStrictPreActionStartupSignature( signature ) ) {
		return 'bootstrap-stall';
	}

	if ( isSourceGatedStrictPreActionStartupSignature( signature ) ) {
		return 'bootstrap-stall';
	}

	if ( isNoProductInfraNoiseSignature( signature ) ) {
		return 'known-infra';
	}

	if ( isNoProductKnownNoiseSignature( signature ) ) {
		return 'family-capped';
	}

	return null;
}

function shouldSuppressStrictPreActionStartupCandidate( candidate ) {
	if (
		isPrimaryNoProductPreActionStartupGate(
			candidate.record?.preAnalysisGate
		)
	) {
		return true;
	}

	if ( recordHasProductEvidenceCoverage( candidate.record ) ) {
		return false;
	}

	if (
		isNoProductPreActionStartupGate(
			candidate.record?.preAnalysisGate
		)
	) {
		return true;
	}

	if ( isStrictPreActionStartupSignature( candidate.signature ) ) {
		return true;
	}

	return (
		candidate.record?.preAnalysisGate?.bucket ===
			'pre-action-bootstrap-stall' &&
		! hasProductEvidence( candidate.signature )
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
		isPrimaryNoProductPreActionStartupGate(
			signature?.sourcePreAnalysisGate
		)
	);
}

function hasStrictStartupPhase( facts ) {
	const lastHistoryPhase = String( facts?.lastHistoryPhase ?? '' );
	return (
		lastHistoryPhase !== '' &&
		/seed|bootstrap|open|join|startup|setup|discovery|ready/i.test(
			lastHistoryPhase
		)
	);
}

function hasStrictPreActionStartupNoProductFacts( facts ) {
	if ( ! facts ) {
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

function isNoProductInfraNoiseSignature( signature ) {
	if ( ! signature || hasSourceProductEvidence( signature ) ) {
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

function hasStrictPreActionStartupFacts( facts ) {
	return (
		hasStrictStartupPhase( facts ) &&
		hasStrictPreActionStartupNoProductFacts( facts )
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
	const hasStartupPhase = hasStrictStartupPhase( facts );

	if ( ! isStartupFamily && ! hasStartupText && ! hasStartupPhase ) {
		return false;
	}

	return hasStrictPreActionStartupNoProductFacts( facts );
}

function getSuppressionReason( status, signature = null ) {
	if ( status === 'known-infra' ) {
		return 'known no-product infra/setup failure';
	}
	if ( status === 'family-capped' ) {
		if ( isFuzzHelperRestEndpointConstructionSignature( signature ) ) {
			return 'known product-evidence harness noise family fuzz_helper_rest_endpoint_construction';
		}
		return 'known duplicate/noise family';
	}
	return 'pre-action startup/discovery failure';
}

function mergeExamples( currentExamples = [], newExamples = [] ) {
	const byKey = new Map();

	for ( const example of [ ...currentExamples, ...newExamples ] ) {
		byKey.set( `${ example.summaryPath }:${ example.lineIndex }`, example );
	}

	return [ ...byKey.values() ].slice( 0, 10 );
}

async function launchQueuedJobs( state ) {
	const propagatedAnalysisStatusCount =
		await propagateNonActionableAnalysisJobStatuses( state );
	const knownNoiseSuppressedCount = suppressKnownNoiseSignatures( state );
	const analysisDecisions = await readAnalysisDecisions();
	const deepAnalysisDecisions = await readDeepAnalysisDecisions();
	const sortedSignatures = sortSignaturesForLaunch(
		Object.values( state.signatures ),
		analysisDecisions,
		deepAnalysisDecisions
	);
	const visibleAnalysisDecisions = await applyVisibleAnalysisDecisions(
		sortedSignatures,
		analysisDecisions,
		deepAnalysisDecisions
	);
	const analysisGated = await applyAnalysisGates(
		sortedSignatures,
		analysisDecisions,
		deepAnalysisDecisions
	);
	if ( GATE_ONLY ) {
		state.lastVisibleAnalysisDecisionCount = visibleAnalysisDecisions;
		state.lastAnalysisGatedCount = analysisGated;
		state.lastPropagatedAnalysisStatusCount =
			propagatedAnalysisStatusCount;
		state.lastKnownNoiseSuppressedCount = knownNoiseSuppressedCount;
		return;
	}

	const activeHashes = getActiveJobHashes( state );
	for ( const signature of sortedSignatures ) {
		if ( activeHashes.size >= MAX_PARALLEL ) {
			state.lastAnalysisGatedCount = analysisGated;
			state.lastPropagatedAnalysisStatusCount =
				propagatedAnalysisStatusCount;
			state.lastKnownNoiseSuppressedCount = knownNoiseSuppressedCount;
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
	state.lastVisibleAnalysisDecisionCount = visibleAnalysisDecisions;
	state.lastPropagatedAnalysisStatusCount = propagatedAnalysisStatusCount;
	state.lastKnownNoiseSuppressedCount = knownNoiseSuppressedCount;
}

function suppressKnownNoiseSignatures( state ) {
	let suppressed = 0;
	for ( const signature of Object.values( state.signatures ?? {} ) ) {
		const suppressedStatus = getSuppressedSignatureStatus( signature );
		if ( ! suppressedStatus ) {
			continue;
		}
		if ( NON_LAUNCHABLE_SIGNATURE_STATUSES.has( signature.status ) ) {
			continue;
		}
		markSignatureSuppressedByWatcher( signature, suppressedStatus );
		suppressed += 1;
	}
	return suppressed;
}

async function propagateNonActionableAnalysisJobStatuses( state ) {
	const analysisJobs = await readNonActionableAnalysisJobStatuses(
		ANALYSIS_STATE_DIR,
		'analysis-tier'
	);
	const deepAnalysisJobs = await readNonActionableAnalysisJobStatuses(
		DEEP_ANALYSIS_STATE_DIR,
		'deep-analysis-tier'
	);
	const jobsByHash = new Map( [ ...analysisJobs, ...deepAnalysisJobs ] );
	let propagated = 0;

		for ( const [ hash, job ] of jobsByHash ) {
			const signature = state.signatures?.[ hash ];
			if ( ! signature ) {
				continue;
			}
			if (
				shouldPreserveProductEvidenceProducerCappedAnalysisJob(
					signature,
					job
				)
			) {
				continue;
			}
			if (
				! [ 'queued', 'retry', 'running' ].includes( signature.status )
			) {
			continue;
		}

		if ( signature.status === 'running' ) {
			terminateSignatureProcess( signature );
		}

		signature.pid = null;
		signature.status = job.status;
		signature.analysisJobGate = {
			gatedAt: new Date().toISOString(),
			sourceTier: job.sourceTier,
			jobStatus: job.status,
			reason: job.reason ?? getAnalysisJobStatusReason( job.status ),
			resultPath: job.resultPath ?? null,
			propagationReason:
				'analysis/deep-analysis terminal non-actionable job status',
		};
		signature.analysisGate ??= {
			gatedAt: signature.analysisJobGate.gatedAt,
			sourceTier: job.sourceTier,
			classification: null,
			confidence: null,
			userHitLikelihoodScore: 0,
			userHitLikelihoodRationale: '',
			distinctBugType: signature.equivalenceClass ?? 'unknown',
			isDuplicateOf: null,
			candidateStatus: job.status,
			recommendedTriageAction:
				getRecommendedActionForAnalysisJobStatus( job.status ),
			summary: signature.analysisJobGate.reason,
			resultPath: job.resultPath ?? null,
		};
		await writeStatusMarkdown(
			path.join( signature.jobDir, 'STATUS.md' ),
			signature
		);
		propagated += 1;
	}

	if ( propagated > 0 ) {
		state.lastAnalysisStatusPropagation = {
			at: new Date().toISOString(),
			count: propagated,
			sourceTiers: [ 'analysis-tier', 'deep-analysis-tier' ],
			statuses: [ ...NON_ACTIONABLE_ANALYSIS_JOB_STATUSES ],
		};
	}

	return propagated;
}

function shouldPreserveProductEvidenceProducerCappedAnalysisJob(
	signature,
	job
) {
	return (
		job?.status === 'family-capped' &&
		hasSourceProductEvidence( signature ) &&
		/producer no-analysis sentinel/i.test(
			job.sourceSuppressionReason ?? job.reason ?? ''
		)
	);
}

async function readNonActionableAnalysisJobStatuses( stateDir, sourceTier ) {
	const analysisStatePath = path.join( stateDir, 'state.json' );
	let analysisState = null;

	try {
		analysisState = JSON.parse(
			await fs.readFile( analysisStatePath, 'utf8' )
		);
	} catch {
		return new Map();
	}

	const jobs = new Map();
	for ( const job of Object.values( analysisState.jobs ?? {} ) ) {
		if (
			! job.hash ||
			! NON_ACTIONABLE_ANALYSIS_JOB_STATUSES.has( job.status )
		) {
			continue;
		}
		jobs.set( job.hash, {
			...job,
			sourceTier,
		} );
	}

	return jobs;
}

function getAnalysisJobStatusReason( status ) {
	if ( status === 'family-capped' ) {
		return 'semantic family already has an active or completed representative analysis';
	}
	if ( status === 'source-suppressed' ) {
		return 'analysis job was suppressed because the source signature is no longer actionable';
	}
	return 'analysis job source signature is stale';
}

function getRecommendedActionForAnalysisJobStatus( status ) {
	if ( status === 'family-capped' ) {
		return 'merge_with_duplicate';
	}
	if ( status === 'source-suppressed' ) {
		return 'suppress_as_infra';
	}
	return 'keep_collecting';
}

async function applyVisibleAnalysisDecisions(
	signatures,
	analysisDecisions,
	deepAnalysisDecisions
) {
	let applied = 0;

	for ( const signature of signatures ) {
		const visibleDecision = getVisibleAnalysisDecision(
			analysisDecisions.get( signature.hash ),
			deepAnalysisDecisions.get( signature.hash )
		);
		if ( ! visibleDecision ) {
			continue;
		}

		if (
			VISIBLE_DECISION_PRESERVED_STATUSES.has( signature.status ) &&
			! hasSourceProductEvidence( signature )
		) {
			signature.result = visibleDecision;
			signature.visibleAnalysisDecisionAt = new Date().toISOString();
			signature.visibleAnalysisPreservedStatus = signature.status;
			delete signature.analysisGate;
			delete signature.analysisJobGate;
			await writeStatusMarkdown(
				path.join( signature.jobDir, 'STATUS.md' ),
				signature
			);
			applied += 1;
			continue;
		}

		if ( signature.status === 'running' ) {
			terminateSignatureProcess( signature );
		}

		signature.pid = null;
		signature.status = [ 'queued', 'retry', 'running' ].includes(
			signature.status
		)
			? signature.status === 'running'
				? 'queued'
				: signature.status
			: 'queued';
		signature.result = visibleDecision;
		signature.visibleAnalysisDecisionAt = new Date().toISOString();
		delete signature.analysisGate;
		delete signature.analysisJobGate;
		await writeStatusMarkdown(
			path.join( signature.jobDir, 'STATUS.md' ),
			signature
		);
		applied += 1;
	}

	return applied;
}

function getVisibleAnalysisDecision( analysisDecision, deepAnalysisDecision ) {
	if (
		deepAnalysisDecision?.candidateStatus === 'confirmed_likely_real'
	) {
		return {
			...deepAnalysisDecision,
			classification: deepAnalysisDecision.classification ?? 'likely_real',
			recommendedTriageAction:
				deepAnalysisDecision.recommendedTriageAction ??
				deepAnalysisDecision.candidateStatus,
			resultPath: deepAnalysisDecision.resultPath,
			sourceTier: 'deep-analysis-tier',
		};
	}

	if (
		analysisDecision?.classification === 'likely_real' &&
		analysisDecision.recommendedTriageAction !== 'merge_with_duplicate' &&
		! analysisDecision.isDuplicateOf &&
		! analysisDecision.duplicateOf
	) {
		return {
			...analysisDecision,
			resultPath: analysisDecision.resultPath,
			sourceTier: 'analysis-tier',
		};
	}

	return null;
}

async function applyAnalysisGates(
	signatures,
	analysisDecisions,
	deepAnalysisDecisions
) {
	let analysisGated = 0;
	const familyGates = new Map();

	for ( const signature of signatures ) {
		const gate = getAnalysisGate(
			analysisDecisions.get( signature.hash ),
			deepAnalysisDecisions.get( signature.hash )
		);
		if ( ! gate ) {
			continue;
		}
		const familyGate = getPropagatableFamilyGate( signature, gate );
		if ( familyGate && ! familyGates.has( familyGate.semanticFamilyKey ) ) {
			familyGates.set( familyGate.semanticFamilyKey, familyGate );
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
				semanticFamilyKey: getSemanticFamilyKey( signature ),
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

	for ( const signature of signatures ) {
		const semanticFamilyKey = getSemanticFamilyKey( signature );
		const familyGate = familyGates.get( semanticFamilyKey );
		if (
			! familyGate ||
			familyGate.sourceHash === signature.hash ||
			! shouldApplyFamilyGateToSignature( signature, familyGate )
		) {
			continue;
		}

		signature.status = 'analysis-gated';
		signature.analysisGate = {
			gatedAt: new Date().toISOString(),
			sourceTier: familyGate.sourceTier,
			classification: familyGate.classification,
			confidence: familyGate.confidence,
			userHitLikelihoodScore: familyGate.userHitLikelihoodScore,
			userHitLikelihoodRationale:
				familyGate.userHitLikelihoodRationale,
			distinctBugType: familyGate.distinctBugType,
			isDuplicateOf:
				familyGate.isDuplicateOf ?? familyGate.sourceHash,
			candidateStatus: familyGate.candidateStatus,
			recommendedTriageAction:
				familyGate.recommendedTriageAction,
			summary: familyGate.summary,
			resultPath: familyGate.resultPath,
			propagatedFromHash: familyGate.sourceHash,
			propagationReason: 'same-family non-actionable analysis gate',
		};
		await writeStatusMarkdown(
			path.join( signature.jobDir, 'STATUS.md' ),
			signature
		);
		analysisGated += 1;
	}

	return analysisGated;
}

	function getPropagatableFamilyGate( signature, gate ) {
		const semanticFamilyKey = getFamilyGateSemanticFamilyKey(
			signature,
			gate
		);
		if (
			! semanticFamilyKey ||
			! isHighConfidenceNonActionableGate( gate )
		) {
			return null;
		}

		return {
			...gate,
			familyKey: signature.familyKey,
			semanticFamilyKey,
			sourceHash: signature.hash,
			sourceHasProductEvidence: hasProductEvidence( signature ),
		};
	}

function getFamilyGateSemanticFamilyKey( signature, gate ) {
	const decisionFamily = canonicalizeSemanticFamilyKey(
		gate?.distinctBugType ?? ''
	);
	if ( isSafeProductEvidenceHarnessNoiseFamily( decisionFamily ) ) {
		return decisionFamily;
	}
	if (
		PRODUCT_EVIDENCE_DUPLICATE_PROPAGATION_FAMILIES.has(
			decisionFamily
		)
	) {
		return decisionFamily;
	}
	return getSemanticFamilyKey( signature );
}

function isHighConfidenceNonActionableGate( gate ) {
	if ( ! gate ) {
		return false;
	}

	if ( gate.sourceTier === 'deep-analysis-tier' ) {
		return [ 'likely_duplicate', 'likely_false_positive' ].includes(
			gate.candidateStatus
		);
	}

	return (
		[
			'merge_with_duplicate',
			'suppress_as_infra',
			'keep_collecting',
		].includes( gate.recommendedTriageAction ) || gate.isDuplicateOf
	);
}

function shouldApplyFamilyGateToSignature( signature, familyGate ) {
	if (
		! [ 'queued', 'retry' ].includes( signature.status )
	) {
		return false;
	}

	if ( hasVisibleLikelyRealDecision( signature ) ) {
		return false;
	}

	if ( hasProductEvidence( signature ) ) {
		return (
			isSafeProductEvidenceHarnessNoiseFamily(
				familyGate.semanticFamilyKey
			) ||
			( PRODUCT_EVIDENCE_DUPLICATE_PROPAGATION_FAMILIES.has(
				familyGate.semanticFamilyKey
			) &&
				familyGate.recommendedTriageAction ===
					'merge_with_duplicate' )
		);
	}

	return true;
}

function isSafeProductEvidenceHarnessNoiseFamily( semanticFamilyKey ) {
	return [
		'fuzz_helper_rest_endpoint_construction',
		'http_awareness_wait_false_timeout_after_reload',
		'rtc_ws_test_provider_bootstrap_missing_after_reload',
	].includes( semanticFamilyKey );
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
	const sorted = [ ...signatures ].sort( ( left, right ) => {
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
	const seenFamilies = new Set();
	const firstInFamily = [];
	const duplicateFamilyRest = [];

	for ( const signature of sorted ) {
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
		signature.status = getStatusFromResult(
			result,
			result ? 0 : 1,
			signature
		);
		await writeStatusMarkdown(
			path.join( signature.jobDir, 'STATUS.md' ),
			signature
		);
	}
}

function shouldLaunch( signature ) {
	const suppressedStatus = getSuppressedSignatureStatus( signature );
	if ( suppressedStatus ) {
		markSignatureSuppressedByWatcher( signature, suppressedStatus );
		return false;
	}

	if ( NON_LAUNCHABLE_SIGNATURE_STATUSES.has( signature.status ) ) {
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

			if (
				EXIT_PRESERVED_SIGNATURE_STATUSES.has( nextSignature.status )
			) {
				nextSignature.pid = null;
				nextSignature.lastError = error.message;
				nextSignature.lastCompletedAt = new Date().toISOString();
				await writeStatusMarkdown( statusPath, nextSignature );
				await writeState( nextState );
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

			if (
				EXIT_PRESERVED_SIGNATURE_STATUSES.has( nextSignature.status )
			) {
				await writeStatusMarkdown( statusPath, nextSignature );
				await writeState( nextState );
				return;
			}

			let result = null;
			try {
			result = JSON.parse(
				await fs.readFile( nextSignature.resultPath, 'utf8' )
			);
		} catch {}

		nextSignature.result = result;
		nextSignature.status = getStatusFromResult(
			result,
			code,
			nextSignature
		);
		await writeStatusMarkdown( statusPath, nextSignature );
		await writeState( nextState );
	} );
}

function getStatusFromResult( result, code, signature = null ) {
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

	if (
		result.realisticPlaywrightRepro?.status === 'produced' &&
		! hasValidProducedPlaywrightRepro( result, signature )
	) {
		return 'retry';
	}

	return 'completed';
}

function hasValidProducedPlaywrightRepro( result, signature ) {
	const repro = result.realisticPlaywrightRepro;
	const reproPath = repro?.path;
	const command = repro?.command;
	const candidates = [];

	if ( ! reproPath || typeof reproPath !== 'string' ) {
		appendReproValidationNote(
			repro,
			'produced Playwright repro did not include a path'
		);
		return false;
	}

	if ( ! command || typeof command !== 'string' || ! command.trim() ) {
		appendReproValidationNote(
			repro,
			'produced Playwright repro did not include a command'
		);
		return false;
	}

	if ( path.isAbsolute( reproPath ) ) {
		candidates.push( reproPath );
	} else {
		candidates.push(
			path.resolve( signature?.jobDir ?? REPO_ROOT, reproPath ),
			path.resolve( REPO_ROOT, reproPath )
		);
	}

	if ( candidates.some( ( candidate ) => fsSync.existsSync( candidate ) ) ) {
		return true;
	}

	appendReproValidationNote(
		repro,
		`produced Playwright repro path was not found; checked ${ candidates.join(
			', '
		) }`
	);
	return false;
}

function appendReproValidationNote( repro, note ) {
	if ( ! repro ) {
		return;
	}

	repro.status = 'needs_more_time';
	repro.notes = [ repro.notes, `Watcher validation: ${ note }.` ]
		.filter( Boolean )
		.join( '\n' );
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
		`Semantic family key: ${ signature.familyKey ?? 'unknown' }`,
		`Equivalence class: ${ signature.equivalenceClass ?? 'unknown' }`,
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
		`Family key: ${ signature.familyKey ?? 'unknown' }`,
		`Equivalence class: ${ signature.equivalenceClass ?? 'unknown' }`,
		`Attempts: ${ signature.attempts }`,
		`Completed: ${ signature.lastCompletedAt ?? 'not completed' }`,
		'',
	];

	if ( result ) {
		const repro = result.realisticPlaywrightRepro ?? {};
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
			`Recommended action: ${
				result.recommendedAction ??
				result.recommendedTriageAction ??
				'none'
			}`,
			'',
			'## Summary',
			'',
			result.summary ?? '',
			'',
			'## Repro',
			'',
			`Playwright status: ${ repro.status ?? 'not_requested' }`,
			`Playwright path: ${ repro.path ?? 'none' }`,
			`Playwright command: ${ repro.command ?? 'none' }`,
			'',
			repro.notes ?? ''
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

	await fs.mkdir( path.dirname( statusPath ), { recursive: true } );
	await fs.writeFile( statusPath, lines.join( '\n' ) + '\n' );
}

async function runScanCycle() {
	const staleRunDirReason = await getStaleRunDirReason();
	if ( staleRunDirReason ) {
		const state = await readState();
		const noAnalysis = await readNoAnalysisSentinel();
		const staleSourceCount = await markRunDirStaleSource(
			state,
			staleRunDirReason,
			noAnalysis
		);
		await writeState( state );
		shuttingDown = true;
		process.stdout.write(
			`[${ new Date().toISOString() }] stale run dir: ${ staleRunDirReason }; staleSource=${ staleSourceCount }; exiting without queueing or launching triage\n`
		);
		return;
	}

	const state = await readState();
	const noAnalysis = await readNoAnalysisSentinel();
	const { candidates, suppressedKnownNoise } =
		await readFailureCandidates();
		state.suppressedKnownNoise = suppressedKnownNoise;
		const groups = groupCandidatesBySignature( candidates );
		await updateDiscoveredSignatures( state, groups );
		const sourceGatedStartupSuppressed =
			suppressSourceGatedStrictStartupSignatures(
				state,
				suppressedKnownNoise
			);
		await reconcileExternallyCompletedJobs( state );
		const producerSuppressed = suppressProducerInactiveSignatures(
			state,
		noAnalysis
	);
	await launchQueuedJobs( state );
	await writeState( state );
	process.stdout.write(
		`[${ new Date().toISOString() }] candidates=${
			candidates.length
		} suppressedStartup=${
			suppressedKnownNoise.strictPreActionStartup.recordCount
		} signatures=${ groups.length } active=${
			getActiveJobHashes( state ).size
		} analysisGated=${
			state.lastAnalysisGatedCount ?? 0
			} knownNoiseSuppressed=${
				state.lastKnownNoiseSuppressedCount ?? 0
			} sourceGatedStartupSuppressed=${ sourceGatedStartupSuppressed } producerSuppressed=${ producerSuppressed }\n`
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
