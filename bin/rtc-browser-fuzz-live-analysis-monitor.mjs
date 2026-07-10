#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';

const REPO_ROOT =
	process.env.RTC_FUZZ_LIVE_ANALYSIS_REPO_ROOT ??
	path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const args = process.argv.slice( 2 );
const ONCE = args.includes( '--once' );
const positionalArgs = args.filter( ( arg ) => ! arg.startsWith( '--' ) );
const RUN_ROOT = path.resolve(
	positionalArgs[ 0 ] ?? process.env.RTC_FUZZ_LIVE_ANALYSIS_RUN_ROOT ?? ''
);

if ( args.includes( '--help' ) || args.includes( '-h' ) ) {
	process.stdout.write(
		[
			'Usage: node bin/rtc-browser-fuzz-live-analysis-monitor.mjs <supervised-run-root> [--once]',
			'',
			'Reads supervisor-state.json, discovers active generation directories,',
			'runs gate-only signature discovery, and keeps one Codex-only',
			'analysis-tier tmux session attached to each active generation.',
			'',
			'Environment:',
			'  RTC_FUZZ_LIVE_ANALYSIS_INTERVAL_MS=120000',
			'  RTC_FUZZ_LIVE_ANALYSIS_MAX_PARALLEL=2',
			'  RTC_FUZZ_LIVE_ANALYSIS_MAX_ATTEMPTS=4',
			'  RTC_FUZZ_LIVE_ANALYSIS_CODEX_TIMEOUT_MS=2700000',
			'  RTC_FUZZ_LIVE_ANALYSIS_TMUX_PREFIX=rtc-analysis-live',
			'  RTC_FUZZ_LIVE_ANALYSIS_ENABLE_DEEP=1',
			'  RTC_FUZZ_LIVE_DEEP_ANALYSIS_MAX_PARALLEL=6',
		].join( '\n' ) + '\n'
	);
	process.exit( 0 );
}

if ( ! RUN_ROOT ) {
	throw new Error(
		'Expected a supervised run root argument or RTC_FUZZ_LIVE_ANALYSIS_RUN_ROOT.'
	);
}

const SUPERVISOR_STATE_PATH = path.join( RUN_ROOT, 'supervisor-state.json' );
const CAMPAIGN_ROOT = path.dirname( RUN_ROOT );
const LOG_PATH = path.join( RUN_ROOT, 'live-analysis-monitor.log' );
const STATE_PATH = path.join( RUN_ROOT, 'live-analysis-monitor-state.json' );
const NO_ANALYSIS_SENTINEL_RELATIVE_PATH = path.join(
	'.triage-watcher',
	'no-analysis.json'
);
const EVENTS_PATH = path.join(
	RUN_ROOT,
	'live-analysis-monitor-events.ndjson'
);
const WATCH_INTERVAL_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_LIVE_ANALYSIS_INTERVAL_MS',
	120000
);
const SUPERVISOR_STATE_STALE_TTL_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_LIVE_ANALYSIS_SUPERVISOR_STATE_STALE_TTL_MS',
	Math.max( WATCH_INTERVAL_MS * 3, 10 * 60 * 1000 )
);
const GATE_ONLY_WATCHER_TIMEOUT_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_LIVE_ANALYSIS_TRIAGE_GATE_TIMEOUT_MS',
	2 * 60 * 1000
);
const ANALYSIS_MAX_PARALLEL = getPositiveIntegerEnv(
	'RTC_FUZZ_LIVE_ANALYSIS_MAX_PARALLEL',
	2
);
const ANALYSIS_MAX_ATTEMPTS = getPositiveIntegerEnv(
	'RTC_FUZZ_LIVE_ANALYSIS_MAX_ATTEMPTS',
	4
);
const ANALYSIS_CODEX_TIMEOUT_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_LIVE_ANALYSIS_CODEX_TIMEOUT_MS',
	45 * 60 * 1000
);
const ANALYSIS_INTERVAL_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_LIVE_ANALYSIS_TIER_INTERVAL_MS',
	30000
);
const DEEP_ANALYSIS_ENABLED =
	process.env.RTC_FUZZ_LIVE_ANALYSIS_ENABLE_DEEP !== '0';
const DEEP_ANALYSIS_MAX_PARALLEL = getPositiveIntegerEnv(
	'RTC_FUZZ_LIVE_DEEP_ANALYSIS_MAX_PARALLEL',
	6
);
const DEEP_ANALYSIS_MAX_ATTEMPTS = getPositiveIntegerEnv(
	'RTC_FUZZ_LIVE_DEEP_ANALYSIS_MAX_ATTEMPTS',
	2
);
const DEEP_ANALYSIS_CODEX_TIMEOUT_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_LIVE_DEEP_ANALYSIS_CODEX_TIMEOUT_MS',
	90 * 60 * 1000
);
const DEEP_ANALYSIS_INTERVAL_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_LIVE_DEEP_ANALYSIS_TIER_INTERVAL_MS',
	45000
);
const DEEP_ANALYSIS_MODEL =
	process.env.RTC_FUZZ_LIVE_DEEP_ANALYSIS_MODEL ?? 'gpt-5.4';
const DEEP_ANALYSIS_REASONING_EFFORT =
	process.env.RTC_FUZZ_LIVE_DEEP_ANALYSIS_REASONING_EFFORT ?? 'xhigh';
const DEFAULT_TMUX_PREFIX = `rtc-analysis-live-${ crypto
	.createHash( 'sha1' )
	.update( RUN_ROOT )
	.digest( 'hex' )
	.slice( 0, 8 ) }`;
const TMUX_PREFIX =
	process.env.RTC_FUZZ_LIVE_ANALYSIS_TMUX_PREFIX ?? DEFAULT_TMUX_PREFIX;
const DEEP_TMUX_PREFIX =
	process.env.RTC_FUZZ_LIVE_DEEP_ANALYSIS_TMUX_PREFIX ??
	`${ TMUX_PREFIX }-deep`;
const CLEANUP_STALE_SESSIONS =
	process.env.RTC_FUZZ_LIVE_ANALYSIS_CLEANUP_STALE_SESSIONS !== '0';
const CLEANUP_UNOWNED_CAMPAIGN_ANALYSIS_SESSIONS =
	process.env.RTC_FUZZ_LIVE_ANALYSIS_CLEANUP_UNOWNED_CAMPAIGN_SESSIONS ===
	'1';
const STALE_ROOT_GUARD_ENABLED =
	process.env.RTC_FUZZ_LIVE_ANALYSIS_STALE_ROOT_GUARD !== '0';
const REQUIRE_CURRENT_OUTPUT_POINTER =
	process.env.RTC_FUZZ_LIVE_ANALYSIS_REQUIRE_CURRENT_OUTPUT_POINTER !== '0';
const HAS_EXPLICIT_CURRENT_OUTPUT_POINTER =
	!! process.env.RTC_FUZZ_LIVE_ANALYSIS_CURRENT_OUTPUT_POINTER;
const INCLUDE_EXTERNAL_IMPORTS =
	process.env.RTC_FUZZ_LIVE_ANALYSIS_INCLUDE_EXTERNAL_IMPORTS === '1';
const CURRENT_OUTPUT_POINTER_PATH =
	process.env.RTC_FUZZ_LIVE_ANALYSIS_CURRENT_OUTPUT_POINTER ??
	path.join( path.dirname( RUN_ROOT ), 'current-output-dir.txt' );
const NO_ANALYSIS_SENTINEL_COMPATIBILITY_HOURS = getPositiveIntegerEnv(
	'RTC_FUZZ_NO_ANALYSIS_SENTINEL_COMPATIBILITY_HOURS',
	6
);
const NO_ANALYSIS_LIVE_ADMISSION_TTL_MS = Math.max(
	WATCH_INTERVAL_MS * 3,
	15 * 60 * 1000
);
const ACTIVE_GROUP_STATUSES = new Set( [
	'starting',
	'launching',
	'recovering',
	'running',
] );
const NON_ACTIONABLE_SIGNATURE_STATUSES = new Set( [
	'analysis-gated',
	'bootstrap-stall',
	'pre-action-http-polling-sync-timeout',
	'completed',
	'family-capped',
	'infra',
	'known-infra',
	'no-realistic-repro',
	'not-real',
	'source-suppressed',
	'stale-source',
] );
const NON_ACTIONABLE_ANALYSIS_JOB_STATUSES = new Set( [
	'family-capped',
	'source-suppressed',
	'stale-source',
] );
const STALE_JOB_TERMINAL_STATUSES = new Set( [
	'completed',
	'family-capped',
	'source-suppressed',
	'stale-source',
] );
const STALE_SOURCE_SIGNATURE_STATUSES = new Set( [
	'queued',
	'retry',
	'running',
] );
const FAMILY_OCCUPANCY_JOB_STATUSES = new Set( [
	'queued',
	'retry',
	'running',
	'completed',
	'family-capped',
] );
const NO_PRODUCT_INFRA_NOISE_PATTERN =
	/ENOSPC|no space left|wp-env|docker compose|docker.*(?:exited|failed)|mysql.*(?:exited|failed)|dependency failed|Cannot find module|ERR_MODULE_NOT_FOUND|missing built workspace artifact|test discovery to fail before startup|Host system is missing dependencies|playwright install-deps|browser dependencies|error:\s*unknown option ['"]?--(?:video|screenshot)|unsupported_playwright.*cli.*flag|unsupported.*playwright.*(?:video|screenshot).*flag|harness.*cli.*option.*incompatibility|request failed: TypeError: fetch failed|GET .*\/wp-json\/|Failed to discover REST API endpoint|RequestUtils\.setupRest|request-utils\/rest\.ts|Link header:\s*undefined|globalSetup|api\.w\.org|ERR_CONNECTION_RESET|ERR_SOCKET_NOT_CONNECTED|endpoint mismatch|runtime[- ]config port bleed|Unknown GUTENBERG_RTC_BROWSER_INITIAL_CONTENT_PROFILE|Unknown initial content profile|The plugin "[^"]+" isn'?t installed|plugin .*not installed|missing plugin\b|missing theme\b|RequestUtils\.deactivatePlugin|request-utils\/plugins\.ts/i;
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
	'rtc_test_ws_runtime_config_port_bleed',
	'rtc_ws_test_provider_bootstrap_missing_after_reload',
] );
const SEMANTIC_CAP_PRODUCT_EVIDENCE_FAMILIES = new Set( [
	'awareness_loss_after_save_reload',
	'collaboration_non_convergence',
	'cover_overlay_attribute_canonicalization',
	'fuzz_helper_rest_endpoint_construction',
	'http_awareness_wait_false_timeout_after_reload',
	'late_session_awareness_stall',
	'linebreak_representation_drift',
	'persisted_content_mismatch',
	'pre_action_bootstrap_stall',
	'reload_rejoin_awareness_stall',
	'rest_meta_database_error',
	'rtc_test_ws_runtime_config_port_bleed',
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
const RUN_DIR_SCAN_IGNORED_DIRS = new Set( [
	'node_modules',
	'.git',
	'vendor',
	'test-results',
	'playwright-report',
	'blob-report',
	'codex-analysis',
	'repos',
	'wp-env',
] );

let shuttingDown = false;

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

function shellQuote( value ) {
	return `'${ String( value ).replaceAll( "'", "'\\''" ) }'`;
}

function sanitizeTmuxName( name ) {
	return name.replace( /[^A-Za-z0-9_-]/g, '-' ).slice( 0, 160 );
}

function sessionNameForRunDir( runDir, prefix = TMUX_PREFIX ) {
	const baseName = path.basename( runDir );
	const rawName = `${ prefix }-${ baseName }`;
	if ( rawName.length <= 180 ) {
		return sanitizeTmuxName( rawName );
	}

	const hash = crypto
		.createHash( 'sha1' )
		.update( runDir )
		.digest( 'hex' )
		.slice( 0, 8 );
	return sanitizeTmuxName( `${ rawName.slice( 0, 160 ) }-${ hash }` );
}

function runCommand( command, commandArgs, options = {} ) {
	return new Promise( ( resolve ) => {
		execFile(
			command,
			commandArgs,
			{
				cwd: REPO_ROOT,
				encoding: 'utf8',
				...options,
			},
			( error, stdout, stderr ) => {
				resolve( {
					ok: ! error,
					code: error?.code ?? 0,
					signal: error?.signal ?? null,
					timedOut:
						!! options.timeout &&
						error?.killed === true &&
						error?.signal === 'SIGTERM',
					stdout,
					stderr,
				} );
			}
		);
	} );
}

async function log( message ) {
	const line = `[${ new Date().toISOString() }] ${ message }\n`;
	process.stdout.write( line );
	await fs.appendFile( LOG_PATH, line );
}

async function event( record ) {
	await fs.appendFile(
		EVENTS_PATH,
		JSON.stringify( {
			at: new Date().toISOString(),
			...record,
		} ) + '\n'
	);
}

async function readJsonFile( filePath ) {
	try {
		return JSON.parse( await fs.readFile( filePath, 'utf8' ) );
	} catch {
		return null;
	}
}

function getCurrentOutputPointerCandidates() {
	const candidates = [ CURRENT_OUTPUT_POINTER_PATH ];
	if ( process.env.RTC_FUZZ_LIVE_ANALYSIS_CURRENT_OUTPUT_POINTER ) {
		return candidates;
	}
	candidates.push(
		path.join( path.dirname( RUN_ROOT ), 'current-run-root.txt' ),
		path.join(
			path.dirname( path.dirname( RUN_ROOT ) ),
			'current-run-root.txt'
		),
		path.join( RUN_ROOT, 'current-run-root.txt' )
	);
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
	if (
		HAS_EXPLICIT_CURRENT_OUTPUT_POINTER ||
		REQUIRE_CURRENT_OUTPUT_POINTER
	) {
		return {
			missing: true,
			pointerPath: path.resolve( CURRENT_OUTPUT_POINTER_PATH ),
		};
	}
	return null;
}

async function getStaleRunRootInfo() {
	const currentOutput = await readCurrentOutputRoot();
	if ( ! currentOutput ) {
		return null;
	}
	if ( currentOutput.missing ) {
		return {
			currentOutputRoot: null,
			pointerPath: currentOutput.pointerPath,
			missingCurrentOutputPointer: true,
			reason: `configured current output pointer ${ currentOutput.pointerPath } is missing or empty`,
		};
	}
	if ( currentOutput.root === path.resolve( RUN_ROOT ) ) {
		return null;
	}
	return {
		currentOutputRoot: currentOutput.root,
		pointerPath: currentOutput.pointerPath,
		reason: `run root ${ RUN_ROOT } no longer matches current output ${ currentOutput.root }`,
	};
}

function getStaleSupervisorStateInfo( supervisorState ) {
	const lastUpdatedAtMs = Date.parse( supervisorState?.lastUpdatedAt ?? '' );
	if ( ! Number.isFinite( lastUpdatedAtMs ) ) {
		return null;
	}
	const ageMs = Date.now() - lastUpdatedAtMs;
	if ( ageMs <= SUPERVISOR_STATE_STALE_TTL_MS ) {
		return null;
	}
	return {
		lastUpdatedAt: supervisorState.lastUpdatedAt,
		ageMs,
		staleTtlMs: SUPERVISOR_STATE_STALE_TTL_MS,
		reason: `supervisor state is stale; lastUpdatedAt=${ supervisorState.lastUpdatedAt }, ageMs=${ ageMs }, ttlMs=${ SUPERVISOR_STATE_STALE_TTL_MS }`,
	};
}

async function readNoAnalysisSentinel( runDir ) {
	const sentinel = await readJsonFile(
		path.join( runDir, NO_ANALYSIS_SENTINEL_RELATIVE_PATH )
	);
	const currentOutput = await readCurrentOutputRoot();
	if ( ! isActiveNoAnalysisSentinel( sentinel, runDir, currentOutput ) ) {
		return null;
	}
	return sentinel;
}

async function writeJsonFile( filePath, value ) {
	const tmpPath = `${ filePath }.tmp-${ process.pid }-${ Date.now() }`;
	await fs.writeFile( tmpPath, JSON.stringify( value, null, 2 ) + '\n' );
	await fs.rename( tmpPath, filePath );
}

function getActiveRunDirs( supervisorState ) {
	const dirs = [];
	const seen = new Set();

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
			if ( ! dir || seen.has( dir ) ) {
				continue;
			}
			seen.add( dir );
			dirs.push( {
				group: group.name ?? null,
				status: group.status ?? null,
				runDir: dir,
			} );
		}
	}

	return dirs;
}

async function getNoAnalysisDrainRunDirs( activeRunDirs ) {
	const activeRunDirSet = getActiveRunDirSet( activeRunDirs );
	const runDirs = await findRunDirsWithTriageState( RUN_ROOT );
	const drainDirs = [];

	for ( const runDir of runDirs ) {
		if ( activeRunDirSet.has( runDir ) ) {
			continue;
		}
		const noAnalysis = await readNoAnalysisSentinel( runDir );
		if ( noAnalysis?.preserveProductEvidence !== true ) {
			continue;
		}
		if ( isNoProductStartupNoAnalysisSentinel( noAnalysis ) ) {
			continue;
		}
		const triageState = await readJsonFile(
			path.join( runDir, '.triage-watcher/state.json' )
		);
		const analysisState = await readJsonFile(
			path.join( runDir, '.triage-watcher/analysis-tier/state.json' )
		);
		const deepAnalysisState = await readJsonFile(
			path.join( runDir, '.triage-watcher/deep-analysis-tier/state.json' )
		);
		const triageActionability = summarizeActionableTriageState(
			triageState,
			analysisState,
			deepAnalysisState,
			noAnalysis
		);
		const shouldStartDeepAnalysis =
			DEEP_ANALYSIS_ENABLED &&
			( await hasDeepAnalysisCandidate(
				triageState,
				analysisState,
				deepAnalysisState,
				noAnalysis
			) );
		if (
			! triageActionability.shouldStartAnalysis &&
			! triageActionability.shouldKeepAnalysisSession &&
			! triageActionability.shouldRunFamilyCapHousekeeping &&
			! shouldStartDeepAnalysis
		) {
			continue;
		}
		drainDirs.push( {
			group: noAnalysis.group ?? null,
			status: 'no-analysis-drain',
			runDir,
		} );
	}

	return drainDirs;
}

function supervisorStartupNoiseDrainHasProductEvidence( group ) {
	const productEvidenceRecords = Number(
		group?.startupStallNoiseSummary?.productEvidenceRecords
	);
	if ( Number.isFinite( productEvidenceRecords ) ) {
		return productEvidenceRecords > 0;
	}
	return /[1-9]\d*\s+product-evidence record\(s\)/i.test(
		group?.lastReason ?? ''
	);
}

function getSupervisorNoAnalysisDrainRunDirs( supervisorState, activeRunDirs ) {
	const activeRunDirSet = getActiveRunDirSet( activeRunDirs );
	const drainDirs = [];
	const seen = new Set( activeRunDirSet );

	for ( const group of supervisorState?.groups ?? [] ) {
		const pauseUntilMs = Date.parse( group.startupStallPausedUntil ?? '' );
		const drainRecordedUntilMs = Date.parse(
			group.startupStallDrainRecordedUntil ?? ''
		);
		const isStartupNoiseDrain =
			group.noAnalysisReasonKind === 'startup-noise' ||
			group.noAnalysisFamily === 'pre_action_bootstrap_stall' ||
			group.noAnalysisSource === 'supervisor-startup-stall-guard';
		const hasActiveStartupNoiseRecord =
			( Number.isFinite( pauseUntilMs ) && pauseUntilMs > Date.now() ) ||
			( Number.isFinite( drainRecordedUntilMs ) &&
				drainRecordedUntilMs > Date.now() );
		if ( isStartupNoiseDrain && ! hasActiveStartupNoiseRecord ) {
			continue;
		}
		if (
			isStartupNoiseDrain &&
			! supervisorStartupNoiseDrainHasProductEvidence( group )
		) {
			continue;
		}
		for ( const runDir of [
			...( group.noAnalysisRunDirs ?? [] ),
			...( group.startupStallRunDirs ?? [] ),
		] ) {
			const resolved = runDir ? path.resolve( runDir ) : '';
			if ( ! resolved || seen.has( resolved ) ) {
				continue;
			}
			seen.add( resolved );
			drainDirs.push( {
				group: group.name ?? null,
				status: group.noAnalysisReasonKind ?? 'no-analysis-drain',
				runDir: resolved,
			} );
		}
	}

	return drainDirs;
}

function mergeRunDirRecords( records ) {
	const seen = new Set();
	const merged = [];
	for ( const record of records ) {
		const resolved = record?.runDir ? path.resolve( record.runDir ) : '';
		if ( ! resolved || seen.has( resolved ) ) {
			continue;
		}
		seen.add( resolved );
		merged.push( {
			...record,
			runDir: resolved,
		} );
	}
	return merged;
}

async function getProductEvidenceLaunchDrainRunDirs(
	drainRunDirs,
	currentOutputFamilyCounts = null,
	currentOutputDeepFamilyCounts = null
) {
	const launchDirs = [];
	const promotedFamilyKeys = new Set();

	for ( const record of drainRunDirs ) {
		const noAnalysis = await readNoAnalysisSentinel( record.runDir );
		if (
			noAnalysis?.preserveProductEvidence !== true ||
			! noAnalysisSentinelHasExplicitProductEvidenceMetadata(
				noAnalysis
			) ||
			! canonicalizeSemanticFamilyKey( noAnalysis.family ?? '' )
		) {
			continue;
		}
		const triageState = await readJsonFile(
			path.join( record.runDir, '.triage-watcher/state.json' )
		);
		const analysisState = await readJsonFile(
			path.join(
				record.runDir,
				'.triage-watcher/analysis-tier/state.json'
			)
		);
		const deepAnalysisState = await readJsonFile(
			path.join(
				record.runDir,
				'.triage-watcher/deep-analysis-tier/state.json'
			)
		);
		const triageActionability = summarizeActionableTriageState(
			triageState,
			analysisState,
			deepAnalysisState,
			noAnalysis,
			currentOutputFamilyCounts
		);
		const shouldStartDeepAnalysis =
			DEEP_ANALYSIS_ENABLED &&
			( await hasDeepAnalysisCandidate(
				triageState,
				analysisState,
				deepAnalysisState,
				noAnalysis,
				currentOutputDeepFamilyCounts
			) );
		const deepFamilyKeys = shouldStartDeepAnalysis
			? await getDeepAnalysisCandidateFamilyKeys(
					triageState,
					analysisState,
					deepAnalysisState,
					noAnalysis,
					currentOutputDeepFamilyCounts
			  )
			: [];
		const noAnalysisProductEvidenceCapActive =
			isNoAnalysisProductEvidenceRepresentativeCapActive( noAnalysis );
		const noAnalysisProductEvidenceFamilyKeys =
			noAnalysisProductEvidenceCapActive
				? getNoAnalysisProductEvidenceLiveFamilyKeys(
						triageState,
						analysisState,
						deepAnalysisState,
						noAnalysis,
						currentOutputFamilyCounts,
						currentOutputDeepFamilyCounts
				  )
				: [];
		const gatedNoAnalysisProductEvidenceFamilyKeys =
			isStartupNoiseNoAnalysisSentinel( noAnalysis )
				? noAnalysisProductEvidenceFamilyKeys.filter(
						isAllowedStartupNoAnalysisLaunchFamilyKey
				  )
				: noAnalysisProductEvidenceFamilyKeys;
		const shouldRunFamilyCapHousekeeping =
			! noAnalysisProductEvidenceCapActive &&
			triageActionability.shouldRunFamilyCapHousekeeping;
		const hasNoAnalysisProductEvidenceLaunchFamily =
			noAnalysisProductEvidenceCapActive &&
			gatedNoAnalysisProductEvidenceFamilyKeys.length > 0;
		const launchFamilyKeys = noAnalysisProductEvidenceCapActive
			? gatedNoAnalysisProductEvidenceFamilyKeys
			: [
					...triageActionability.firstLevelFamilyKeys,
					...triageActionability.familyCapHousekeepingFamilyKeys,
					...deepFamilyKeys,
			  ].filter( Boolean );
		const gatedLaunchFamilyKeys = isStartupNoiseNoAnalysisSentinel(
			noAnalysis
		)
			? launchFamilyKeys.filter(
					isAllowedStartupNoAnalysisLaunchFamilyKey
			  )
			: launchFamilyKeys;
		const unpromotedLaunchFamilyKeys = gatedLaunchFamilyKeys.filter(
			( familyKey ) => ! promotedFamilyKeys.has( familyKey )
		);
		const hasUnpromotedFamily =
			gatedLaunchFamilyKeys.length > 0 &&
			unpromotedLaunchFamilyKeys.length > 0;
		if (
			isStartupNoiseNoAnalysisSentinel( noAnalysis ) &&
			gatedLaunchFamilyKeys.length === 0
		) {
			continue;
		}
		if (
			! triageActionability.shouldStartAnalysis &&
			! triageActionability.shouldKeepAnalysisSession &&
			! shouldRunFamilyCapHousekeeping &&
			! shouldStartDeepAnalysis &&
			! hasNoAnalysisProductEvidenceLaunchFamily
		) {
			continue;
		}
		if (
			noAnalysisProductEvidenceCapActive &&
			gatedNoAnalysisProductEvidenceFamilyKeys.length === 0
		) {
			continue;
		}
		if ( noAnalysisProductEvidenceCapActive && ! hasUnpromotedFamily ) {
			continue;
		}
		if (
			! noAnalysisProductEvidenceCapActive &&
			! triageActionability.shouldKeepAnalysisSession &&
			! hasUnpromotedFamily
		) {
			continue;
		}
		const admittedFamilyKeys = noAnalysisProductEvidenceCapActive
			? unpromotedLaunchFamilyKeys
			: gatedLaunchFamilyKeys;
		for ( const familyKey of admittedFamilyKeys ) {
			promotedFamilyKeys.add( familyKey );
		}
		launchDirs.push( {
			...record,
			status: `${
				record.status ?? 'no-analysis-drain'
			}-product-evidence`,
			noAnalysisProductEvidenceLaunch: true,
			noAnalysisProductEvidenceLaunchFamilyKeys: admittedFamilyKeys,
		} );
	}

	return launchDirs;
}

async function updateNoAnalysisLiveAdmission( runDir, launchFamilyKeys = [] ) {
	const sentinelPath = path.join(
		runDir,
		NO_ANALYSIS_SENTINEL_RELATIVE_PATH
	);
	const sentinel = await readJsonFile( sentinelPath );
	const currentOutput = await readCurrentOutputRoot();
	if ( ! isActiveNoAnalysisSentinel( sentinel, runDir, currentOutput ) ) {
		return false;
	}

	const rawFamilyKeys = [
		...new Set(
			launchFamilyKeys
				.map( ( familyKey ) =>
					canonicalizeSemanticFamilyKey( familyKey )
				)
				.filter( Boolean )
		),
	].sort();
	const familyKeys = isStartupNoiseNoAnalysisSentinel( sentinel )
		? rawFamilyKeys.filter( isAllowedStartupNoAnalysisLaunchFamilyKey )
		: rawFamilyKeys;
	const previousAdmission = sentinel.liveAnalysisAdmission ?? null;
	if ( familyKeys.length === 0 ) {
		if ( ! previousAdmission ) {
			return false;
		}
		delete sentinel.liveAnalysisAdmission;
		await writeJsonFile( sentinelPath, sentinel );
		return true;
	}

	const now = new Date();
	sentinel.liveAnalysisAdmission = {
		version: 1,
		sentinelIdentityVersion: 1,
		at: now.toISOString(),
		expiresAt: new Date(
			now.getTime() + NO_ANALYSIS_LIVE_ADMISSION_TTL_MS
		).toISOString(),
		runRoot: RUN_ROOT,
		outputDir: sentinel.outputDir ?? RUN_ROOT,
		reasonKind: sentinel.reasonKind ?? null,
		family: canonicalizeSemanticFamilyKey( sentinel.family ?? '' ) || null,
		source: sentinel.source ?? null,
		group: sentinel.group ?? null,
		sentinelCreatedAt: sentinel.createdAt ?? null,
		noProductOnly: sentinel.noProductOnly ?? null,
		hasProductEvidence: sentinel.hasProductEvidence ?? null,
		productEvidenceRecords: Number.isFinite(
			Number( sentinel.productEvidenceRecords )
		)
			? Number( sentinel.productEvidenceRecords )
			: null,
		actionGate: sentinel.actionGate ?? null,
		familyKeys,
		reason: 'live-analysis selected this no-analysis drain as the one product-evidence representative for each listed semantic family',
	};
	await writeJsonFile( sentinelPath, sentinel );
	return true;
}

async function reconcileNoAnalysisLiveAdmissions(
	drainRunDirs,
	launchRunDirs
) {
	const launchFamilyKeysByRunDir = new Map(
		launchRunDirs.map( ( record ) => [
			path.resolve( record.runDir ),
			record.noAnalysisProductEvidenceLaunchFamilyKeys ?? [],
		] )
	);
	let changed = 0;
	for ( const record of drainRunDirs ) {
		const runDir = path.resolve( record.runDir );
		const didChange = await updateNoAnalysisLiveAdmission(
			runDir,
			launchFamilyKeysByRunDir.get( runDir ) ?? []
		);
		if ( didChange ) {
			changed += 1;
		}
	}
	return changed;
}

function getNoAnalysisProductEvidenceLiveFamilyKeys(
	triageState,
	analysisState,
	deepAnalysisState,
	noAnalysis,
	currentOutputFamilyCounts = null,
	currentOutputDeepFamilyCounts = null
) {
	const families = new Map();
	for ( const signature of Object.values( triageState?.signatures ?? {} ) ) {
		const familyKey = getNoAnalysisProductEvidenceRepresentativeFamilyKey(
			signature,
			noAnalysis
		);
		if ( ! familyKey ) {
			continue;
		}
		const analysisJob = analysisState?.jobs?.[ signature.hash ];
		const deepAnalysisJob = deepAnalysisState?.jobs?.[ signature.hash ];
		const family = families.get( familyKey ) ?? {
			hasLiveOrDurableRepresentative: false,
			needsLaunch: false,
			hasUnsafeSuppressedCandidate: false,
		};
		if (
			hasLiveOrDurableNoAnalysisProductEvidenceRepresentative(
				signature,
				analysisJob,
				deepAnalysisJob
			)
		) {
			family.hasLiveOrDurableRepresentative = true;
		}
		if (
			shouldLaunchNoAnalysisProductEvidenceRepresentative(
				signature,
				analysisJob,
				deepAnalysisJob,
				familyKey,
				currentOutputFamilyCounts,
				currentOutputDeepFamilyCounts
			)
		) {
			family.needsLaunch = true;
		} else if (
			hasUnsafeSuppressedNoAnalysisProductEvidenceCandidate(
				signature,
				analysisJob,
				deepAnalysisJob
			)
		) {
			family.hasUnsafeSuppressedCandidate = true;
		}
		families.set( familyKey, family );
	}
	return [ ...families.entries() ]
		.filter(
			( [ , family ] ) =>
				family.needsLaunch ||
				( family.hasUnsafeSuppressedCandidate &&
					! family.hasLiveOrDurableRepresentative )
		)
		.map( ( [ familyKey ] ) => familyKey );
}

function shouldLaunchNoAnalysisProductEvidenceRepresentative(
	signature,
	analysisJob,
	deepAnalysisJob,
	familyKey,
	currentOutputFamilyCounts,
	currentOutputDeepFamilyCounts
) {
	if ( ! isCurrentActionableProductEvidenceSourceSignature( signature ) ) {
		return false;
	}
	if (
		! (
			needsFirstLevelAnalysisSession(
				signature,
				analysisJob,
				currentOutputFamilyCounts
			) ||
			hasRunningFirstLevelAnalysisJob(
				signature,
				analysisJob,
				currentOutputFamilyCounts
			) ||
			hasRunningDeepAnalysisJob( deepAnalysisJob ) ||
			( analysisJob?.status === 'completed' &&
				completedAnalysisStillNeedsDeepAnalysis(
					analysisJob,
					deepAnalysisJob
				) )
		)
	) {
		return false;
	}
	if (
		( currentOutputDeepFamilyCounts?.get( familyKey ) ?? 0 ) > 0 &&
		! hasRunningFirstLevelAnalysisJob(
			signature,
			analysisJob,
			currentOutputFamilyCounts
		) &&
		! hasRunningDeepAnalysisJob( deepAnalysisJob ) &&
		! needsFirstLevelAnalysisSession(
			signature,
			analysisJob,
			currentOutputFamilyCounts
		)
	) {
		return false;
	}
	return true;
}

function hasLiveOrDurableNoAnalysisProductEvidenceRepresentative(
	signature,
	analysisJob,
	deepAnalysisJob
) {
	if ( hasVisibleLikelyRealDecision( signature ) ) {
		return true;
	}
	if ( hasRunningFirstLevelAnalysisJob( signature, analysisJob ) ) {
		return true;
	}
	if ( hasRunningDeepAnalysisJob( deepAnalysisJob ) ) {
		return true;
	}
	if (
		analysisJob?.status === 'completed' &&
		isCompletedJobSafeProductEvidenceFamilyCapRepresentative( analysisJob )
	) {
		return true;
	}
	return deepAnalysisJob?.status === 'completed';
}

function hasUnsafeSuppressedNoAnalysisProductEvidenceCandidate(
	signature,
	analysisJob,
	deepAnalysisJob
) {
	if ( ! isCurrentActionableProductEvidenceSourceSignature( signature ) ) {
		return false;
	}
	if ( hasVisibleLikelyRealDecision( signature ) ) {
		return false;
	}
	const unsafeStatuses = new Set( [
		'family-capped',
		'source-suppressed',
		'stale-source',
	] );
	return (
		unsafeStatuses.has( signature?.status ?? 'unknown' ) ||
		unsafeStatuses.has( analysisJob?.status ?? 'unknown' ) ||
		unsafeStatuses.has( deepAnalysisJob?.status ?? 'unknown' )
	);
}

function hasRunningDeepAnalysisJob( deepAnalysisJob ) {
	return (
		deepAnalysisJob?.status === 'running' &&
		isProcessAlive( deepAnalysisJob.pid )
	);
}

function getStartupNoAnalysisLaunchFamilyBase( familyKey ) {
	const canonical = canonicalizeSemanticFamilyKey( familyKey );
	const activeProductMatch = canonical.match(
		/^active_product_evidence_[a-z0-9]+_(.+)$/
	);
	return activeProductMatch
		? canonicalizeSemanticFamilyKey( activeProductMatch[ 1 ] )
		: canonical;
}

function isAllowedStartupNoAnalysisLaunchFamilyKey( familyKey ) {
	const baseFamily = getStartupNoAnalysisLaunchFamilyBase( familyKey );
	return (
		!! baseFamily &&
		baseFamily !== 'unknown' &&
		! baseFamily.startsWith( 'pre_action_' )
	);
}

function optionalNumberIdentityValue( value ) {
	const numberValue = Number( value );
	return Number.isFinite( numberValue ) ? numberValue : null;
}

function noAnalysisAdmissionMatchesSentinel( noAnalysis, admission ) {
	if ( admission?.sentinelIdentityVersion !== 1 ) {
		return false;
	}
	return (
		( admission.reasonKind ?? null ) ===
			( noAnalysis?.reasonKind ?? null ) &&
		canonicalizeSemanticFamilyKey( admission.family ?? '' ) ===
			canonicalizeSemanticFamilyKey( noAnalysis?.family ?? '' ) &&
		( admission.source ?? null ) === ( noAnalysis?.source ?? null ) &&
		( admission.group ?? null ) === ( noAnalysis?.group ?? null ) &&
		( admission.sentinelCreatedAt ?? null ) ===
			( noAnalysis?.createdAt ?? null ) &&
		( admission.noProductOnly ?? null ) ===
			( noAnalysis?.noProductOnly ?? null ) &&
		( admission.hasProductEvidence ?? null ) ===
			( noAnalysis?.hasProductEvidence ?? null ) &&
		optionalNumberIdentityValue( admission.productEvidenceRecords ) ===
			optionalNumberIdentityValue( noAnalysis?.productEvidenceRecords ) &&
		( admission.actionGate ?? null ) === ( noAnalysis?.actionGate ?? null )
	);
}

function isProductEvidenceLiveAdmissionPendingSignature( signature ) {
	if ( signature?.status !== 'stale-source' ) {
		return false;
	}
	const reasonText = [
		signature.suppressedByWatcher,
		signature.staleSourceReason,
		signature.sourceSuppressionReason,
	]
		.filter( Boolean )
		.join( ' ' );
	return /product-evidence no-analysis drain lacks live-analysis representative admission/i.test(
		reasonText
	);
}

function getNoAnalysisProductEvidenceRepresentativeFamilyKey(
	signature,
	noAnalysis
) {
	if (
		! signature?.hash ||
		signatureHasOnlyExternalImportExamples( signature ) ||
		! isNoAnalysisProductEvidenceRepresentativeCapActive( noAnalysis ) ||
		! isCurrentActionableProductEvidenceSourceSignature( signature ) ||
		isStrictPreActionStartupSignature( signature ) ||
		isSourceGatedStrictPreActionStartupSignature( signature )
	) {
		return null;
	}
	const familyKey = getSourceSemanticFamilyKey( signature );
	if (
		isStartupNoiseNoAnalysisSentinel( noAnalysis ) &&
		! isAllowedStartupNoAnalysisLaunchFamilyKey( familyKey )
	) {
		return null;
	}
	return familyKey;
}

function isCurrentActionableProductEvidenceSourceSignature( signature ) {
	if ( ! signature?.hash ) {
		return false;
	}
	if ( signatureHasOnlyExternalImportExamples( signature ) ) {
		return false;
	}
	if (
		NON_ACTIONABLE_SIGNATURE_STATUSES.has(
			signature.status ?? 'unknown'
		) &&
		! isProductEvidenceLiveAdmissionPendingSignature( signature )
	) {
		return false;
	}
	if (
		isStrictPreActionStartupSignature( signature ) ||
		isSourceGatedStrictPreActionStartupSignature( signature )
	) {
		return false;
	}
	return hasMeaningfulSourceProductEvidence( signature );
}

function hasMeaningfulSourceProductEvidence( signature ) {
	if ( ! hasSourceProductEvidence( signature ) ) {
		return false;
	}
	const facts = signature?.facts ?? {};
	if (
		( facts.reloadCount ?? 0 ) > 0 ||
		( facts.saveCheckpointCount ?? 0 ) > 0 ||
		( facts.autosaveCount ?? 0 ) > 0 ||
		facts.revisionEligible === true ||
		( facts.operationWitnessActions?.length ?? 0 ) > 0 ||
		( facts.operationWitnessScopes?.length ?? 0 ) > 0 ||
		!! facts.operationWitnessPhase
	) {
		return true;
	}

	const lifecycleContext = String(
		facts.lifecycleContext ?? ''
	).toLowerCase();
	if (
		/reload|rejoin|save|revision|restore|persist|lifecycle/.test(
			lifecycleContext
		)
	) {
		return true;
	}

	const familyKey = getSourceSemanticFamilyKey( signature );
	const phase = String( facts.lastHistoryPhase ?? '' ).toLowerCase();
	const failureClass = String(
		facts.failureClass ?? facts.textFailureClass ?? ''
	).toLowerCase();
	const startupLike =
		/seed|startup|bootstrap|discovery|open-post|readiness/.test( phase ) ||
		familyKey.startsWith( 'pre_action_' ) ||
		familyKey === 'editor_open_post_timeout' ||
		/bootstrap|open-post|readiness/.test( failureClass );

	return ! startupLike && !! facts.lastAction;
}

function isNoAnalysisPausedFamilyKey( familyKey, noAnalysis ) {
	const pausedFamily = canonicalizeSemanticFamilyKey(
		noAnalysis?.family ?? ''
	);
	return (
		!! familyKey &&
		!! pausedFamily &&
		familyKey === pausedFamily &&
		PRODUCER_NO_ANALYSIS_FAMILY_CAP_REASON_KINDS.has(
			noAnalysis?.reasonKind ?? ''
		)
	);
}

function isNoAnalysisProductEvidenceRepresentativeCapActive( noAnalysis ) {
	return (
		noAnalysis?.preserveProductEvidence === true &&
		noAnalysisSentinelHasExplicitProductEvidenceMetadata( noAnalysis ) &&
		!! canonicalizeSemanticFamilyKey( noAnalysis.family ?? '' ) &&
		( ! noAnalysis.reasonKind ||
			PRODUCER_NO_ANALYSIS_FAMILY_CAP_REASON_KINDS.has(
				noAnalysis.reasonKind
			) )
	);
}

function getNoAnalysisLiveAdmissionFamilyKeys( noAnalysis ) {
	if (
		noAnalysis?.preserveProductEvidence !== true ||
		! noAnalysisSentinelHasExplicitProductEvidenceMetadata( noAnalysis ) ||
		! canonicalizeSemanticFamilyKey( noAnalysis.family ?? '' )
	) {
		return new Set();
	}
	const admission = noAnalysis?.liveAnalysisAdmission;
	if ( ! admission ) {
		return new Set();
	}
	if ( ! noAnalysisAdmissionMatchesSentinel( noAnalysis, admission ) ) {
		return new Set();
	}
	const expiresAtMs = Date.parse( admission.expiresAt ?? '' );
	if ( ! Number.isFinite( expiresAtMs ) || expiresAtMs <= Date.now() ) {
		return new Set();
	}
	if (
		admission.outputDir &&
		noAnalysis?.outputDir &&
		path.resolve( admission.outputDir ) !==
			path.resolve( noAnalysis.outputDir )
	) {
		return new Set();
	}
	const familyKeys = ( admission.familyKeys ?? [] )
		.map( ( familyKey ) => canonicalizeSemanticFamilyKey( familyKey ) )
		.filter( Boolean );
	return new Set(
		isStartupNoiseNoAnalysisSentinel( noAnalysis )
			? familyKeys.filter( isAllowedStartupNoAnalysisLaunchFamilyKey )
			: familyKeys
	);
}

function isNoAnalysisLiveAdmissionActive( noAnalysis ) {
	return (
		noAnalysis?.preserveProductEvidence === true &&
		noAnalysisSentinelHasProductEvidence( noAnalysis ) &&
		getNoAnalysisLiveAdmissionFamilyKeys( noAnalysis ).size > 0
	);
}

function isNoAnalysisSignatureLiveAdmitted( signature, noAnalysis ) {
	const familyKeys = getNoAnalysisLiveAdmissionFamilyKeys( noAnalysis );
	if ( familyKeys.size === 0 ) {
		return false;
	}
	const familyKey = getNoAnalysisProductEvidenceRepresentativeFamilyKey(
		signature,
		noAnalysis
	);
	return !! familyKey && familyKeys.has( familyKey );
}

async function getLiveRunDirScopes( supervisorState ) {
	const supervisorActiveRunDirs = getActiveRunDirs( supervisorState );
	const activeRunDirs = [];
	const activeNoAnalysisDrainRunDirs = [];
	for ( const record of supervisorActiveRunDirs ) {
		const noAnalysis = await readNoAnalysisSentinel( record.runDir );
		if ( noAnalysis ) {
			if ( isNoProductNoAnalysisSentinel( noAnalysis ) ) {
				continue;
			}
			activeNoAnalysisDrainRunDirs.push( {
				...record,
				status: `${ record.status ?? 'active' }-no-analysis-drain`,
			} );
			continue;
		}
		activeRunDirs.push( record );
	}
	const supervisorDrainRunDirs = getSupervisorNoAnalysisDrainRunDirs(
		supervisorState,
		activeRunDirs
	);
	const drainRunDirs = mergeRunDirRecords( [
		...activeNoAnalysisDrainRunDirs,
		...supervisorDrainRunDirs,
		...( await getNoAnalysisDrainRunDirs( [
			...activeRunDirs,
			...activeNoAnalysisDrainRunDirs,
			...supervisorDrainRunDirs,
		] ) ),
	] );
	const currentOutputFamilyCountRunDirs =
		await getCurrentOutputFamilyCountRunDirs( [
			...activeRunDirs,
			...drainRunDirs,
		] );
	const currentOutputFamilyCounts =
		await getCurrentOutputFirstLevelFamilyCounts(
			currentOutputFamilyCountRunDirs
		);
	const currentOutputDeepFamilyCounts =
		await getCurrentOutputDeepFamilyCounts(
			currentOutputFamilyCountRunDirs
		);
	const productEvidenceLaunchDrainRunDirs =
		await getProductEvidenceLaunchDrainRunDirs(
			drainRunDirs,
			currentOutputFamilyCounts,
			currentOutputDeepFamilyCounts
		);
	const noAnalysisLiveAdmissionChanges =
		await reconcileNoAnalysisLiveAdmissions(
			drainRunDirs,
			productEvidenceLaunchDrainRunDirs
		);
	return {
		launchRunDirs: mergeRunDirRecords( [
			...activeRunDirs,
			...productEvidenceLaunchDrainRunDirs,
		] ),
		drainRunDirs,
		allRunDirs: mergeRunDirRecords( [
			...activeRunDirs,
			...productEvidenceLaunchDrainRunDirs,
			...drainRunDirs,
		] ),
		currentOutputFamilyCountRunDirs,
		currentOutputFamilyCounts,
		currentOutputDeepFamilyCounts,
		noAnalysisLiveAdmissionChanges,
	};
}

async function getCurrentOutputFamilyCountRunDirs( liveRunDirs ) {
	const seen = new Set();
	const runDirRecords = [];
	for ( const record of liveRunDirs ) {
		const resolved = path.resolve( record.runDir );
		if ( seen.has( resolved ) ) {
			continue;
		}
		const noAnalysis = await readNoAnalysisSentinel( resolved );
		if (
			noAnalysis &&
			! isNoAnalysisLiveAdmissionActive( noAnalysis ) &&
			! isNoAnalysisProductEvidenceRepresentativeCapActive( noAnalysis )
		) {
			continue;
		}
		seen.add( resolved );
		runDirRecords.push( {
			...record,
			runDir: resolved,
		} );
	}
	return runDirRecords;
}

async function getCurrentOutputFirstLevelFamilyCounts( runDirRecords ) {
	const counts = new Map();
	for ( const { runDir } of runDirRecords ) {
		const [ noAnalysis, triageState, analysisState ] = await Promise.all( [
			readNoAnalysisSentinel( runDir ),
			readJsonFile( path.join( runDir, '.triage-watcher/state.json' ) ),
			readJsonFile(
				path.join( runDir, '.triage-watcher/analysis-tier/state.json' )
			),
		] );
		if ( ! analysisState?.jobs ) {
			continue;
		}
		const signatureByHash = new Map(
			Object.values( triageState?.signatures ?? {} ).map(
				( signature ) => [ signature.hash, signature ]
			)
		);
		for ( const job of Object.values( analysisState.jobs ) ) {
			if ( ! FAMILY_OCCUPANCY_JOB_STATUSES.has( job.status ) ) {
				continue;
			}
			if ( job.status === 'running' && ! isProcessAlive( job.pid ) ) {
				continue;
			}
			const signature = signatureByHash.get( job.hash );
			if ( ! shouldCountFirstLevelJobForFamilyCap( job, signature ) ) {
				continue;
			}
			const sourceFamilyKey = signature
				? getAnalysisLaunchFamilyKey( signature )
				: null;
			const sourceFamilyApplies =
				sourceFamilyKey &&
				shouldApplyCurrentOutputFamilyCap(
					signature,
					sourceFamilyKey,
					job
				);
			const familyKeys = new Set(
				getStoredJobFirstLevelFamilyCapKeys( job )
			);
			if ( sourceFamilyApplies ) {
				familyKeys.add( sourceFamilyKey );
			}
			const durableNoAnalysisFamilyKey =
				getDurableNoAnalysisProductEvidenceFamilyKey(
					noAnalysis,
					signature,
					job,
					familyKeys
				);
			if ( durableNoAnalysisFamilyKey ) {
				familyKeys.add( durableNoAnalysisFamilyKey );
			}
			if (
				noAnalysis &&
				! hasAdmittedNoAnalysisFamilyKey( noAnalysis, familyKeys ) &&
				! durableNoAnalysisFamilyKey
			) {
				continue;
			}
			for ( const familyKey of familyKeys ) {
				counts.set( familyKey, ( counts.get( familyKey ) ?? 0 ) + 1 );
			}
		}
	}
	return counts;
}

async function getCurrentOutputDeepFamilyCounts( runDirRecords ) {
	const counts = new Map();
	for ( const { runDir } of runDirRecords ) {
		const [ noAnalysis, triageState, deepAnalysisState ] =
			await Promise.all( [
				readNoAnalysisSentinel( runDir ),
				readJsonFile(
					path.join( runDir, '.triage-watcher/state.json' )
				),
				readJsonFile(
					path.join(
						runDir,
						'.triage-watcher/deep-analysis-tier/state.json'
					)
				),
			] );
		if ( ! deepAnalysisState?.jobs ) {
			continue;
		}
		const signatureByHash = new Map(
			Object.values( triageState?.signatures ?? {} ).map(
				( signature ) => [ signature.hash, signature ]
			)
		);
		for ( const job of Object.values( deepAnalysisState.jobs ) ) {
			if ( ! isDeepFamilyOccupancyJob( job ) ) {
				continue;
			}
			if ( job.status === 'running' && ! isProcessAlive( job.pid ) ) {
				continue;
			}
			const signature = signatureByHash.get( job.hash );
			if ( ! shouldCountDeepJobForFamilyCap( job, signature ) ) {
				continue;
			}
			const familyKey = job.semanticFamilyKey ?? null;
			if (
				! shouldApplyCurrentOutputDeepFamilyCap( familyKey, signature )
			) {
				continue;
			}
			const durableNoAnalysisFamilyKey =
				getDurableNoAnalysisProductEvidenceFamilyKey(
					noAnalysis,
					signature,
					job,
					new Set( [ familyKey ] )
				);
			if (
				noAnalysis &&
				! hasAdmittedNoAnalysisFamilyKey(
					noAnalysis,
					new Set( [ familyKey ] )
				) &&
				! durableNoAnalysisFamilyKey
			) {
				continue;
			}
			const countFamilyKey = durableNoAnalysisFamilyKey ?? familyKey;
			counts.set(
				countFamilyKey,
				( counts.get( countFamilyKey ) ?? 0 ) + 1
			);
		}
	}
	return counts;
}

function getDurableNoAnalysisProductEvidenceFamilyKey(
	noAnalysis,
	signature,
	job,
	familyKeys
) {
	if (
		! noAnalysis ||
		! signature ||
		! job ||
		! FAMILY_OCCUPANCY_JOB_STATUSES.has( job.status ) ||
		! isNoAnalysisProductEvidenceRepresentativeCapActive( noAnalysis ) ||
		! hasSourceProductEvidence( signature ) ||
		isStrictPreActionStartupSignature( signature ) ||
		isSourceGatedStrictPreActionStartupSignature( signature )
	) {
		return null;
	}
	if ( job.status === 'running' && ! isProcessAlive( job.pid ) ) {
		return null;
	}
	const familyKey = getNoAnalysisProductEvidenceRepresentativeFamilyKey(
		signature,
		noAnalysis
	);
	if ( ! familyKey ) {
		return null;
	}
	const canonicalFamilyKeys = new Set(
		[ ...( familyKeys ?? [] ), getAnalysisLaunchFamilyKey( signature ) ]
			.map( ( key ) => canonicalizeSemanticFamilyKey( key ) )
			.filter( Boolean )
	);
	return canonicalFamilyKeys.has( familyKey ) ? familyKey : null;
}

function hasAdmittedNoAnalysisFamilyKey( noAnalysis, familyKeys ) {
	const admittedFamilyKeys =
		getNoAnalysisLiveAdmissionFamilyKeys( noAnalysis );
	if ( admittedFamilyKeys.size === 0 ) {
		return false;
	}
	for ( const familyKey of familyKeys ) {
		if (
			familyKey &&
			admittedFamilyKeys.has( canonicalizeSemanticFamilyKey( familyKey ) )
		) {
			return true;
		}
	}
	return false;
}

async function hasTmuxSession( sessionName ) {
	const result = await runCommand( 'tmux', [
		'has-session',
		'-t',
		sessionName,
	] );
	return result.ok;
}

function getResolvedCurrentOutputPointerPathForChild() {
	for ( const pointerPath of getCurrentOutputPointerCandidates() ) {
		try {
			const value = fsSync
				.readFileSync( pointerPath, 'utf8' )
				.trim()
				.split( /\r?\n/ )[ 0 ]
				?.trim();
			if ( path.resolve( value ) === path.resolve( RUN_ROOT ) ) {
				return path.resolve( pointerPath );
			}
		} catch {}
	}
	return null;
}

function buildAnalysisCommand( runDir ) {
	const analysisLogPath = path.join(
		runDir,
		'.triage-watcher/analysis-tier/analysis-tier.log'
	);
	const currentOutputPointerPath =
		getResolvedCurrentOutputPointerPathForChild();
	return [
		`cd ${ shellQuote( REPO_ROOT ) }`,
		`mkdir -p ${ shellQuote( path.dirname( analysisLogPath ) ) }`,
		'while true; do',
		`export RTC_FUZZ_ANALYSIS_MAX_PARALLEL=${ shellQuote(
			ANALYSIS_MAX_PARALLEL
		) }`,
		`export RTC_FUZZ_ANALYSIS_MAX_ATTEMPTS=${ shellQuote(
			ANALYSIS_MAX_ATTEMPTS
		) }`,
		`export RTC_FUZZ_ANALYSIS_INTERVAL_MS=${ shellQuote(
			ANALYSIS_INTERVAL_MS
		) }`,
		`export RTC_FUZZ_ANALYSIS_CODEX_TIMEOUT_MS=${ shellQuote(
			ANALYSIS_CODEX_TIMEOUT_MS
		) }`,
		`export RTC_FUZZ_ANALYSIS_MAX_PER_FAMILY=${ shellQuote( 1 ) }`,
		...( currentOutputPointerPath
			? [
					`export RTC_FUZZ_ANALYSIS_CURRENT_OUTPUT_POINTER=${ shellQuote(
						currentOutputPointerPath
					) }`,
			  ]
			: [] ),
		`export RTC_FUZZ_ANALYSIS_SUPERVISOR_STATE_PATH=${ shellQuote(
			SUPERVISOR_STATE_PATH
		) }`,
		`node bin/rtc-browser-fuzz-analysis-tier.mjs ${ shellQuote(
			runDir
		) } >> ${ shellQuote( analysisLogPath ) } 2>&1`,
		'code=$?',
		'echo ANALYSIS_EXIT:$code $(date -u +%Y-%m-%dT%H:%M:%SZ)',
		'sleep 30',
		'done',
	].join( '\n' );
}

function buildDeepAnalysisCommand( runDir ) {
	const deepAnalysisLogPath = path.join(
		runDir,
		'.triage-watcher/deep-analysis-tier/deep-analysis-tier.log'
	);
	const currentOutputPointerPath =
		getResolvedCurrentOutputPointerPathForChild();
	return [
		`cd ${ shellQuote( REPO_ROOT ) }`,
		`mkdir -p ${ shellQuote( path.dirname( deepAnalysisLogPath ) ) }`,
		'while true; do',
		`export RTC_FUZZ_DEEP_ANALYSIS_MAX_PARALLEL=${ shellQuote(
			DEEP_ANALYSIS_MAX_PARALLEL
		) }`,
		`export RTC_FUZZ_DEEP_ANALYSIS_MAX_ATTEMPTS=${ shellQuote(
			DEEP_ANALYSIS_MAX_ATTEMPTS
		) }`,
		`export RTC_FUZZ_DEEP_ANALYSIS_INTERVAL_MS=${ shellQuote(
			DEEP_ANALYSIS_INTERVAL_MS
		) }`,
		`export RTC_FUZZ_DEEP_ANALYSIS_CODEX_TIMEOUT_MS=${ shellQuote(
			DEEP_ANALYSIS_CODEX_TIMEOUT_MS
		) }`,
		`export RTC_FUZZ_DEEP_ANALYSIS_MODEL=${ shellQuote(
			DEEP_ANALYSIS_MODEL
		) }`,
		`export RTC_FUZZ_DEEP_ANALYSIS_REASONING_EFFORT=${ shellQuote(
			DEEP_ANALYSIS_REASONING_EFFORT
		) }`,
		...( currentOutputPointerPath
			? [
					`export RTC_FUZZ_DEEP_ANALYSIS_CURRENT_OUTPUT_POINTER=${ shellQuote(
						currentOutputPointerPath
					) }`,
			  ]
			: [] ),
		`export RTC_FUZZ_DEEP_ANALYSIS_SUPERVISOR_STATE_PATH=${ shellQuote(
			SUPERVISOR_STATE_PATH
		) }`,
		`node bin/rtc-browser-fuzz-deep-analysis-tier.mjs ${ shellQuote(
			runDir
		) } >> ${ shellQuote( deepAnalysisLogPath ) } 2>&1`,
		'code=$?',
		'echo DEEP_ANALYSIS_EXIT:$code $(date -u +%Y-%m-%dT%H:%M:%SZ)',
		'sleep 45',
		'done',
	].join( '\n' );
}

async function ensureAnalysisSession( runDir ) {
	const sessionName = sessionNameForRunDir( runDir );
	if ( await hasTmuxSession( sessionName ) ) {
		return {
			sessionName,
			started: false,
		};
	}

	const result = await runCommand( 'tmux', [
		'new-session',
		'-d',
		'-s',
		sessionName,
		buildAnalysisCommand( runDir ),
	] );

	if ( ! result.ok ) {
		await event( {
			kind: 'analysis-session-start-failed',
			runDir,
			sessionName,
			code: result.code,
			output: result.stderr || result.stdout,
		} );
		throw new Error(
			`failed to start analysis tmux session ${ sessionName }: ${
				result.stderr || result.stdout
			}`
		);
	}

	await event( {
		kind: 'analysis-session-started',
		runDir,
		sessionName,
	} );
	return {
		sessionName,
		started: true,
	};
}

async function ensureDeepAnalysisSession( runDir ) {
	const sessionName = sessionNameForRunDir( runDir, DEEP_TMUX_PREFIX );
	if ( await hasTmuxSession( sessionName ) ) {
		return {
			sessionName,
			started: false,
		};
	}

	const result = await runCommand( 'tmux', [
		'new-session',
		'-d',
		'-s',
		sessionName,
		buildDeepAnalysisCommand( runDir ),
	] );

	if ( ! result.ok ) {
		await event( {
			kind: 'deep-analysis-session-start-failed',
			runDir,
			sessionName,
			code: result.code,
			output: result.stderr || result.stdout,
		} );
		throw new Error(
			`failed to start deep analysis tmux session ${ sessionName }: ${
				result.stderr || result.stdout
			}`
		);
	}

	await event( {
		kind: 'deep-analysis-session-started',
		runDir,
		sessionName,
	} );
	return {
		sessionName,
		started: true,
	};
}

async function listTmuxSessions() {
	const result = await runCommand( 'tmux', [ 'list-sessions', '-F', '#S' ] );
	if ( ! result.ok ) {
		return [];
	}

	return result.stdout
		.split( '\n' )
		.map( ( line ) => line.trim() )
		.filter( Boolean );
}

function isManagedAnalysisSessionName( sessionName ) {
	return (
		sessionName.startsWith( `${ TMUX_PREFIX }-` ) ||
		sessionName.startsWith( `${ DEEP_TMUX_PREFIX }-` )
	);
}

function isSameCampaignAnalysisRunDir( runDir ) {
	return !! runDir && isPathInsideRoot( runDir, CAMPAIGN_ROOT );
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

function isExternalImportPath( filePath ) {
	if ( INCLUDE_EXTERNAL_IMPORTS || ! filePath ) {
		return false;
	}
	return path
		.resolve( filePath )
		.split( path.sep )
		.includes( 'external-imports' );
}

function signatureHasOnlyExternalImportExamples( signature ) {
	const examplePaths = ( signature?.examples ?? [] )
		.flatMap( ( example ) => [
			example?.summaryPath,
			example?.logPath,
			example?.artifactsDir,
		] )
		.filter( Boolean );
	return (
		examplePaths.length > 0 &&
		examplePaths.every( ( examplePath ) =>
			isExternalImportPath( examplePath )
		)
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
		createdAtMs + NO_ANALYSIS_SENTINEL_COMPATIBILITY_HOURS * 60 * 60 * 1000
	);
}

function noAnalysisSentinelHasProductEvidence( sentinel ) {
	if ( sentinel?.noProductOnly === true ) {
		return false;
	}
	const productEvidenceRecords = Number( sentinel?.productEvidenceRecords );
	const reasonProductEvidenceRecords = String( sentinel?.reason ?? '' ).match(
		/(?:^|[^\d])([1-9]\d*)\s+product-evidence records?\b/i
	);
	return (
		sentinel?.hasProductEvidence === true ||
		sentinel?.noProductOnly === false ||
		( Number.isFinite( productEvidenceRecords ) &&
			productEvidenceRecords > 0 ) ||
		( reasonProductEvidenceRecords
			? Number( reasonProductEvidenceRecords[ 1 ] ) > 0
			: false )
	);
}

function noAnalysisSentinelHasExplicitProductEvidenceMetadata( sentinel ) {
	if ( sentinel?.noProductOnly === true ) {
		return false;
	}
	const productEvidenceRecords = Number( sentinel?.productEvidenceRecords );
	return (
		sentinel?.hasProductEvidence === true ||
		sentinel?.noProductOnly === false ||
		( Number.isFinite( productEvidenceRecords ) &&
			productEvidenceRecords > 0 )
	);
}

function isNoProductStartupNoAnalysisSentinel( sentinel ) {
	return (
		sentinel?.preserveProductEvidence === true &&
		isStartupNoiseNoAnalysisSentinel( sentinel ) &&
		! noAnalysisSentinelHasProductEvidence( sentinel )
	);
}

function isNoProductNoAnalysisSentinel( sentinel ) {
	if ( sentinel?.preserveProductEvidence !== true ) {
		return false;
	}
	if (
		! [ 'startup-noise', 'known-noise', 'triage-duplicate-noise' ].includes(
			sentinel?.reasonKind
		)
	) {
		return false;
	}
	return ! noAnalysisSentinelHasProductEvidence( sentinel );
}

function isStartupNoiseNoAnalysisSentinel( sentinel ) {
	const family = canonicalizeSemanticFamilyKey( sentinel?.family ?? '' );
	return (
		sentinel?.reasonKind === 'startup-noise' ||
		family === 'pre_action_bootstrap_stall' ||
		sentinel?.source === 'supervisor-startup-stall-guard'
	);
}

function isActiveNoAnalysisSentinel( sentinel, runDir, currentOutput = null ) {
	if ( sentinel?.preserveProductEvidence !== true || ! sentinel.outputDir ) {
		return false;
	}
	if ( ! runDir ) {
		return false;
	}
	const outputRoot =
		currentOutput?.root ??
		( isPathInsideRoot( runDir, sentinel.outputDir )
			? sentinel.outputDir
			: null );
	if ( ! outputRoot || ! isPathInsideRoot( runDir, outputRoot ) ) {
		return false;
	}
	if ( path.resolve( sentinel.outputDir ) !== path.resolve( outputRoot ) ) {
		return false;
	}
	return getNoAnalysisSentinelExpirationMs( sentinel ) > Date.now();
}

function getActiveRunDirSet( activeRunDirs ) {
	return new Set(
		activeRunDirs.map( ( { runDir } ) => path.resolve( runDir ) )
	);
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
				RUN_DIR_SCAN_IGNORED_DIRS.has( entry.name ) ||
				( entry.name === 'external-imports' &&
					! INCLUDE_EXTERNAL_IMPORTS )
			) {
				continue;
			}
			await walk( entryPath, depth + 1 );
		}
	}

	await walk( root, 0 );
	return [ ...new Set( runDirs.map( ( dir ) => path.resolve( dir ) ) ) ];
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

async function markInactiveTriageState( runDir, activeRunDirSet ) {
	if ( activeRunDirSet.has( path.resolve( runDir ) ) ) {
		return null;
	}

	const statePath = path.join( runDir, '.triage-watcher', 'state.json' );
	const state = await readJsonFile( statePath );
	if ( ! state?.signatures ) {
		return null;
	}
	const noAnalysis = await readNoAnalysisSentinel( runDir );

	let changed = 0;
	for ( const signature of Object.values( state.signatures ) ) {
		if ( ! STALE_SOURCE_SIGNATURE_STATUSES.has( signature.status ) ) {
			continue;
		}
		if (
			noAnalysis?.preserveProductEvidence !== true &&
			hasVisibleLikelyRealDecision( signature )
		) {
			continue;
		}
		if ( isNoAnalysisSignatureLiveAdmitted( signature, noAnalysis ) ) {
			continue;
		}
		if (
			signature.status === 'running' &&
			isProcessAlive( signature.pid )
		) {
			try {
				process.kill( signature.pid, 'SIGTERM' );
			} catch {}
		}
		signature.previousStatus = signature.status ?? null;
		signature.status = 'stale-source';
		signature.pid = null;
		signature.staleSourceAt = new Date().toISOString();
		signature.staleSourceReason =
			'source run dir is not active in supervisor-state.json';
		changed += 1;
	}

	if ( changed === 0 ) {
		return null;
	}

	state.updatedAt = new Date().toISOString();
	state.inactiveSourceCleanup = {
		at: state.updatedAt,
		runDir,
		changed,
		reason: 'inactive supervisor run dir',
	};
	await writeJsonFile( statePath, state );
	return {
		runDir,
		tierName: 'triage-watcher',
		changed,
		statePath,
	};
}

async function markInactiveAnalysisState( runDir, tierName, activeRunDirSet ) {
	if ( activeRunDirSet.has( path.resolve( runDir ) ) ) {
		return null;
	}

	const statePath = path.join(
		runDir,
		'.triage-watcher',
		tierName,
		'state.json'
	);
	const state = await readJsonFile( statePath );
	if ( ! state?.jobs ) {
		return null;
	}
	const noAnalysis = await readNoAnalysisSentinel( runDir );
	const sourceState = await readJsonFile(
		path.join( runDir, '.triage-watcher', 'state.json' )
	);

	let changed = 0;
	for ( const job of Object.values( state.jobs ) ) {
		if ( STALE_JOB_TERMINAL_STATUSES.has( job.status ) ) {
			continue;
		}
		const sourceSignature = sourceState?.signatures?.[ job.hash ] ?? null;
		if (
			sourceSignature &&
			isNoAnalysisSignatureLiveAdmitted( sourceSignature, noAnalysis )
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
		job.staleSourceReason =
			'source run dir is not active in supervisor-state.json';
		changed += 1;
	}

	if ( changed === 0 ) {
		return null;
	}

	state.updatedAt = new Date().toISOString();
	state.staleSourceCleanup = {
		at: state.updatedAt,
		runDir,
		tierName,
		changed,
		reason: 'inactive supervisor run dir',
	};
	await writeJsonFile( statePath, state );
	return {
		runDir,
		tierName,
		changed,
		statePath,
	};
}

async function markInactiveAnalysisStates( activeRunDirs ) {
	const activeRunDirSet = getActiveRunDirSet( activeRunDirs );
	const runDirs = await findRunDirsWithTriageState( RUN_ROOT );
	const records = [];

	for ( const runDir of runDirs ) {
		if ( activeRunDirSet.has( runDir ) ) {
			continue;
		}
		const sourceRecord = await markInactiveTriageState(
			runDir,
			activeRunDirSet
		);
		if ( sourceRecord ) {
			records.push( sourceRecord );
			await event( {
				kind: 'inactive-triage-state-marked-stale',
				...sourceRecord,
			} );
		}
		for ( const tierName of [ 'analysis-tier', 'deep-analysis-tier' ] ) {
			const record = await markInactiveAnalysisState(
				runDir,
				tierName,
				activeRunDirSet
			);
			if ( record ) {
				records.push( record );
				await event( {
					kind: 'inactive-analysis-state-marked-stale',
					...record,
				} );
			}
		}
	}

	return records;
}

function parseRunDirFromTmuxStartCommand( command ) {
	const match = command.match(
		/rtc-browser-fuzz-(?:deep-)?analysis-tier\.mjs\s+(?:'([^']+)'|"([^"]+)"|([^\s>]+))/
	);
	return match?.[ 1 ] ?? match?.[ 2 ] ?? match?.[ 3 ] ?? null;
}

async function getTmuxSessionRunDir( sessionName ) {
	const result = await runCommand( 'tmux', [
		'list-panes',
		'-t',
		sessionName,
		'-F',
		'#{pane_start_command}',
	] );
	if ( ! result.ok ) {
		return null;
	}

	for ( const line of result.stdout.split( '\n' ) ) {
		const runDir = parseRunDirFromTmuxStartCommand( line );
		if ( runDir ) {
			return path.resolve( runDir );
		}
	}

	return null;
}

async function cleanupStaleAnalysisSessions( activeRunDirs ) {
	if ( ! CLEANUP_STALE_SESSIONS ) {
		return { sessions: [], inactiveStateCleanup: [] };
	}

	const activeRunDirSet = getActiveRunDirSet( activeRunDirs );
	const activeSessions = new Set(
		activeRunDirs.flatMap( ( { runDir } ) => [
			sessionNameForRunDir( runDir ),
			sessionNameForRunDir( runDir, DEEP_TMUX_PREFIX ),
		] )
	);
	const sessions = await listTmuxSessions();
	const cleaned = [];
	const inactiveStateCleanup =
		await markInactiveAnalysisStates( activeRunDirs );

	for ( const sessionName of sessions ) {
		const isManagedSession = isManagedAnalysisSessionName( sessionName );
		const inspectedRunDir = await getTmuxSessionRunDir( sessionName );
		const isParsedAnalysisSession = !! inspectedRunDir;
		const sessionRunDirIsInRoot =
			inspectedRunDir && isPathInsideRoot( inspectedRunDir, RUN_ROOT );
		const sessionRunDirIsInCampaign =
			inspectedRunDir && isSameCampaignAnalysisRunDir( inspectedRunDir );
		const sessionRunDirIsActive =
			inspectedRunDir && activeRunDirSet.has( inspectedRunDir );

		if ( sessionRunDirIsActive || activeSessions.has( sessionName ) ) {
			continue;
		}
		if ( ! isManagedSession ) {
			if ( isParsedAnalysisSession ) {
				await event( {
					kind: 'external-analysis-session-observed',
					sessionName,
					inspectedRunDir,
					isManagedSession,
					cleanupReason: sessionRunDirIsInCampaign
						? 'parsed analysis session is in this campaign but is not owned by this monitor prefix'
						: 'parsed analysis session is outside this monitor run root and is not owned by this monitor prefix',
				} );
			}
			if (
				! CLEANUP_UNOWNED_CAMPAIGN_ANALYSIS_SESSIONS ||
				! sessionRunDirIsInCampaign
			) {
				continue;
			}
		}

		const cleanupReason = ! inspectedRunDir
			? 'managed analysis session has no parseable run dir'
			: sessionRunDirIsInRoot
			? 'analysis session run dir is no longer active'
			: sessionRunDirIsInCampaign
			? 'analysis session run dir is in this campaign but outside the current output root'
			: 'analysis session run dir is outside the current output root';

		const result = await runCommand( 'tmux', [
			'kill-session',
			'-t',
			sessionName,
		] );
		cleaned.push( {
			sessionName,
			ok: result.ok,
			code: result.code,
			output: result.stderr || result.stdout,
			inspectedRunDir,
			isManagedSession,
			cleanupReason,
		} );
		await event( {
			kind: result.ok
				? 'stale-analysis-session-killed'
				: 'stale-analysis-session-kill-failed',
			sessionName,
			inspectedRunDir,
			isManagedSession,
			cleanupReason,
			code: result.code,
			output: result.stderr || result.stdout,
		} );
	}

	return { sessions: cleaned, inactiveStateCleanup };
}

async function cleanupAnalysisSessionsOutsideRunRoot() {
	if ( ! CLEANUP_STALE_SESSIONS ) {
		return { sessions: [], inactiveStateCleanup: [] };
	}

	const sessions = await listTmuxSessions();
	const cleaned = [];

	for ( const sessionName of sessions ) {
		const isManagedSession = isManagedAnalysisSessionName( sessionName );
		const inspectedRunDir = await getTmuxSessionRunDir( sessionName );
		const isParsedAnalysisSession = !! inspectedRunDir;
		const sessionRunDirIsInRoot =
			inspectedRunDir && isPathInsideRoot( inspectedRunDir, RUN_ROOT );
		const sessionRunDirIsInCampaign =
			inspectedRunDir && isSameCampaignAnalysisRunDir( inspectedRunDir );

		if ( sessionRunDirIsInRoot ) {
			continue;
		}
		if ( ! isManagedSession ) {
			if ( isParsedAnalysisSession ) {
				await event( {
					kind: 'external-analysis-session-observed',
					sessionName,
					inspectedRunDir,
					isManagedSession,
					cleanupReason: sessionRunDirIsInCampaign
						? 'parsed analysis session is in this campaign but is not owned by this monitor prefix'
						: 'parsed analysis session is outside this monitor run root and is not owned by this monitor prefix',
				} );
			}
			if (
				! CLEANUP_UNOWNED_CAMPAIGN_ANALYSIS_SESSIONS ||
				! sessionRunDirIsInCampaign
			) {
				continue;
			}
		}

		const cleanupReason = ! inspectedRunDir
			? 'managed analysis session has no parseable run dir while supervisor state is unavailable'
			: sessionRunDirIsInCampaign
			? 'analysis session run dir is in this campaign but outside the current output root while supervisor state is unavailable'
			: 'analysis session run dir is outside the current output root while supervisor state is unavailable';

		const result = await runCommand( 'tmux', [
			'kill-session',
			'-t',
			sessionName,
		] );
		cleaned.push( {
			sessionName,
			ok: result.ok,
			code: result.code,
			output: result.stderr || result.stdout,
			inspectedRunDir,
			isManagedSession,
			cleanupReason,
		} );
		await event( {
			kind: result.ok
				? 'stale-analysis-session-killed'
				: 'stale-analysis-session-kill-failed',
			sessionName,
			inspectedRunDir,
			isManagedSession,
			cleanupReason,
			code: result.code,
			output: result.stderr || result.stdout,
		} );
	}

	return { sessions: cleaned, inactiveStateCleanup: [] };
}

async function stopAnalysisSessionsForRunDir(
	runDir,
	reason,
	{ includeDeep = true } = {}
) {
	const sessionNames = [
		sessionNameForRunDir( runDir ),
		...( includeDeep
			? [ sessionNameForRunDir( runDir, DEEP_TMUX_PREFIX ) ]
			: [] ),
	];
	const stopped = [];

	for ( const sessionName of sessionNames ) {
		if ( ! ( await hasTmuxSession( sessionName ) ) ) {
			continue;
		}

		const result = await runCommand( 'tmux', [
			'kill-session',
			'-t',
			sessionName,
		] );
		const record = {
			sessionName,
			ok: result.ok,
			code: result.code,
			output: result.stderr || result.stdout,
			reason,
		};
		stopped.push( record );
		await event( {
			kind: result.ok
				? 'non-actionable-analysis-session-killed'
				: 'non-actionable-analysis-session-kill-failed',
			runDir,
			...record,
		} );
	}

	return stopped;
}

async function stopDeepAnalysisSessionForRunDir( runDir, reason ) {
	const sessionName = sessionNameForRunDir( runDir, DEEP_TMUX_PREFIX );
	if ( ! ( await hasTmuxSession( sessionName ) ) ) {
		return null;
	}

	const result = await runCommand( 'tmux', [
		'kill-session',
		'-t',
		sessionName,
	] );
	const record = {
		sessionName,
		ok: result.ok,
		code: result.code,
		output: result.stderr || result.stdout,
		reason,
	};
	await event( {
		kind: result.ok
			? 'deep-analysis-session-killed-no-candidates'
			: 'deep-analysis-session-kill-no-candidates-failed',
		runDir,
		...record,
	} );
	return record;
}

async function hasDeepAnalysisCandidate(
	triageState,
	analysisState,
	deepAnalysisState,
	noAnalysis = null,
	currentOutputDeepFamilyCounts = null
) {
	return (
		(
			await getDeepAnalysisCandidateFamilyKeys(
				triageState,
				analysisState,
				deepAnalysisState,
				noAnalysis,
				currentOutputDeepFamilyCounts
			)
		).length > 0
	);
}

async function getDeepAnalysisCandidateFamilyKeys(
	triageState,
	analysisState,
	deepAnalysisState,
	noAnalysis = null,
	currentOutputDeepFamilyCounts = null
) {
	const familyKeys = new Set();
	for ( const job of Object.values( analysisState?.jobs ?? {} ) ) {
		if (
			job.status !== 'completed' ||
			! job.hash ||
			! job.resultPath ||
			! fsSync.existsSync( job.resultPath )
		) {
			continue;
		}
		const sourceSignature = triageState?.signatures?.[ job.hash ] ?? null;
		if (
			! isActionableSignature(
				sourceSignature,
				null,
				deepAnalysisState?.jobs?.[ job.hash ],
				noAnalysis
			)
		) {
			continue;
		}

		const result = await readJsonFile( job.resultPath );
		if (
			result?.shouldDeepTriage === true &&
			[ 'likely_real', 'uncertain' ].includes( result.classification ) &&
			result.recommendedTriageAction !== 'merge_with_duplicate' &&
			! result.isDuplicateOf
		) {
			const familyKey = getDeepAnalysisSemanticFamilyKey(
				sourceSignature,
				result,
				job.hash
			);
			if (
				( currentOutputDeepFamilyCounts?.get( familyKey ) ?? 0 ) > 0 &&
				shouldApplyCurrentOutputDeepFamilyCap(
					familyKey,
					sourceSignature
				)
			) {
				continue;
			}
			familyKeys.add( familyKey );
		}
	}

	return [ ...familyKeys ];
}

async function runGateOnlyWatcher( runDir ) {
	const currentOutputPointerPath =
		getResolvedCurrentOutputPointerPathForChild();
	const result = await runCommand(
		process.execPath,
		[
			path.join( REPO_ROOT, 'bin/rtc-browser-fuzz-triage-watcher.mjs' ),
			runDir,
			'--once',
			'--gate-only',
		],
		{
			env: {
				...process.env,
				RTC_FUZZ_TRIAGE_MAX_PARALLEL: '1',
				...( currentOutputPointerPath
					? {
							RTC_FUZZ_TRIAGE_CURRENT_OUTPUT_POINTER:
								currentOutputPointerPath,
					  }
					: {} ),
				RTC_FUZZ_TRIAGE_SUPERVISOR_STATE_PATH: SUPERVISOR_STATE_PATH,
			},
			timeout: GATE_ONLY_WATCHER_TIMEOUT_MS,
			killSignal: 'SIGTERM',
		}
	);

	if ( ! result.ok ) {
		await event( {
			kind: 'gate-only-failed',
			runDir,
			code: result.code,
			signal: result.signal,
			timedOut: result.timedOut,
			output: result.stderr || result.stdout,
		} );
		throw new Error(
			`gate-only watcher failed for ${ runDir }: ${
				result.stderr || result.stdout
			}`
		);
	}

	return result.stdout.trim();
}

async function runFamilyCapHousekeepingAnalysis( runDir, familyKeys = [] ) {
	const currentOutputPointerPath =
		getResolvedCurrentOutputPointerPathForChild();
	const result = await runCommand(
		process.execPath,
		[
			path.join( REPO_ROOT, 'bin/rtc-browser-fuzz-analysis-tier.mjs' ),
			runDir,
			'--once',
		],
		{
			env: {
				...process.env,
				RTC_FUZZ_ANALYSIS_MAX_PARALLEL: '1',
				RTC_FUZZ_ANALYSIS_MAX_ATTEMPTS: String( ANALYSIS_MAX_ATTEMPTS ),
				RTC_FUZZ_ANALYSIS_INTERVAL_MS: String( ANALYSIS_INTERVAL_MS ),
				RTC_FUZZ_ANALYSIS_CODEX_TIMEOUT_MS: String(
					ANALYSIS_CODEX_TIMEOUT_MS
				),
				RTC_FUZZ_ANALYSIS_MAX_PER_FAMILY: '1',
				RTC_FUZZ_ANALYSIS_FAMILY_CAP_ONLY: '1',
				RTC_FUZZ_ANALYSIS_FORCE_FAMILY_CAP_KEYS: familyKeys.join( ',' ),
				...( currentOutputPointerPath
					? {
							RTC_FUZZ_ANALYSIS_CURRENT_OUTPUT_POINTER:
								currentOutputPointerPath,
					  }
					: {} ),
				RTC_FUZZ_ANALYSIS_SUPERVISOR_STATE_PATH: SUPERVISOR_STATE_PATH,
			},
		}
	);
	const output = ( result.stderr || result.stdout || '' ).trim();
	if ( ! result.ok ) {
		await event( {
			kind: 'family-cap-housekeeping-failed',
			runDir,
			code: result.code,
			output,
		} );
	}
	return {
		ok: result.ok,
		code: result.code,
		output,
	};
}

async function runGateOnlyWatcherNonFatal( runDir ) {
	try {
		return {
			ok: true,
			output: await runGateOnlyWatcher( runDir ),
			error: null,
		};
	} catch ( error ) {
		const message = error.stack ?? error.message;
		await event( {
			kind: 'gate-only-nonfatal',
			runDir,
			error: message,
		} );
		return {
			ok: false,
			output: message,
			error: message,
		};
	}
}

function countStatuses( values ) {
	const counts = {};
	for ( const value of values ) {
		const status = value?.status ?? 'unknown';
		counts[ status ] = ( counts[ status ] ?? 0 ) + 1;
	}
	return counts;
}

function formatCountsForLog( counts, limit = 4 ) {
	const entries = Object.entries( counts ?? {} )
		.sort( ( left, right ) => right[ 1 ] - left[ 1 ] )
		.slice( 0, limit );
	if ( entries.length === 0 ) {
		return 'none';
	}
	return entries
		.map( ( [ key, count ] ) => `${ key }=${ count }` )
		.join( '+' );
}

function formatFamiliesForLog( families, limit = 3 ) {
	const entries = ( families ?? [] ).slice( 0, limit );
	if ( entries.length === 0 ) {
		return 'none';
	}
	return entries
		.map( ( entry ) => `${ entry.family }=${ entry.count }` )
		.join( '+' );
}

function formatRunSummaryForLog( summary ) {
	const label = path.basename( summary.runDir );
	const statusSummary = formatCountsForLog( summary.triageCounts );
	const bucketSummary = formatCountsForLog(
		summary.triageMetrics?.failureBucketCounts
	);
	const suppressedStartupSummary = formatCountsForLog(
		summary.triageMetrics?.suppressedKnownNoise?.strictPreActionStartup
			?.knownNoiseByFamily
	);
	const familySummary = formatFamiliesForLog(
		summary.triageMetrics?.topPreDecisionFamilies
	);
	return `${ label } status=${ statusSummary } buckets=${ bucketSummary } suppressedStartup=${ suppressedStartupSummary } families=${ familySummary }`;
}

function isStrictPreActionStartupSignature( signature ) {
	const facts = signature?.facts;
	if ( ! facts ) {
		return false;
	}

	const normalized = signature.normalized ?? '';
	const equivalenceClass = signature.equivalenceClass ?? '';
	if ( isNoProductStartupInfraNoiseSignature( signature ) ) {
		return true;
	}
	const isStartupFamily = [
		'pre-action-bootstrap-stall',
		'pre-action-http-polling-sync-cycle-timeout',
		'pre-action-websocket-sync-cycle-timeout',
		'pre-action-awareness-stall',
		'pre-action-editor-bootstrap-open-post-timeout',
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
			'http-polling-sync-cycle-timeout',
			'websocket-sync-cycle-timeout',
			'websocket-awareness-peer-count-timeout',
			'editor-bootstrap-open-post-timeout',
			'save-stuck-or-failed',
			'page-wait-for-function-timeout',
			'assertion',
		].includes( facts.failureClass )
	);
}

function hasStrictStartupInfraNoiseFacts( facts ) {
	if ( ! facts ) {
		return false;
	}

	return (
		! facts.lastAction &&
		( ! facts.lastHistoryStatus || facts.lastHistoryStatus === 'fail' ) &&
		( facts.userCount ?? 0 ) === 0 &&
		( facts.actionCount ?? 0 ) === 0 &&
		( facts.reloadCount ?? 0 ) === 0 &&
		( facts.saveCheckpointCount ?? 0 ) === 0 &&
		( facts.autosaveCount ?? 0 ) === 0 &&
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
			'http-polling-sync-cycle-timeout',
			'websocket-sync-cycle-timeout',
			'websocket-awareness-peer-count-timeout',
			'editor-bootstrap-open-post-timeout',
			'save-stuck-or-failed',
			'page-wait-for-function-timeout',
			'assertion',
		].includes( facts.failureClass )
	);
}

function preAnalysisGateAttemptHasProductEvidence( attempt ) {
	return (
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

function isPreActionNoProductGateBucket( gate ) {
	return [
		'pre-action-bootstrap-stall',
		'pre-action-http-polling-sync-cycle-timeout',
		'pre-action-websocket-sync-cycle-timeout',
		'pre-action-awareness-stall',
		'pre-action-editor-bootstrap-open-post-timeout',
	].includes( gate?.bucket );
}

function isNoProductPreActionStartupGate( gate ) {
	if ( ! isPreActionNoProductGateBucket( gate ) ) {
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
	if ( ! isPreActionNoProductGateBucket( gate ) ) {
		return false;
	}
	const attempts = Array.isArray( gate.attempts ) ? gate.attempts : [];
	const primaryAttempts = attempts.length > 0 ? attempts : [ gate ];
	return (
		! preAnalysisGateAttemptHasProductEvidence( gate ) &&
		primaryAttempts.length > 0 &&
		primaryAttempts.every(
			( attempt ) =>
				isPreActionNoProductGateBucket( {
					bucket: attempt?.bucket ?? gate.bucket,
				} ) && ! preAnalysisGateAttemptHasProductEvidence( attempt )
		)
	);
}

function isSourceGatedStrictPreActionStartupSignature( signature ) {
	return (
		! hasVisibleLikelyRealDecision( signature ) &&
		! hasProductEvidence( signature ) &&
		isPrimaryNoProductPreActionStartupGate(
			signature?.sourcePreAnalysisGate
		)
	);
}

function readJobResultSync( job ) {
	if ( job?.status !== 'completed' || ! job.resultPath ) {
		return null;
	}

	try {
		return JSON.parse( fsSync.readFileSync( job.resultPath, 'utf8' ) );
	} catch {
		return null;
	}
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

function shouldCountFirstLevelJobForFamilyCap( job, signature ) {
	if ( job.status === 'running' ) {
		if ( ! isProcessAlive( job.pid ) ) {
			return false;
		}

		return (
			shouldCountSourceSignatureForFirstLevelFamilyCap(
				job,
				signature
			) || shouldCountStoredJobForFirstLevelFamilyCap( job )
		);
	}

	if ( hasVisibleLikelyRealJobResult( job ) ) {
		return true;
	}
	if (
		job.status === 'completed' &&
		signature &&
		hasProductEvidence( signature ) &&
		! isCompletedJobSafeProductEvidenceFamilyCapRepresentative( job )
	) {
		return false;
	}

	return (
		shouldCountSourceSignatureForFirstLevelFamilyCap( job, signature ) ||
		shouldCountStoredJobForFirstLevelFamilyCap( job )
	);
}

function shouldCountSourceSignatureForFirstLevelFamilyCap( job, signature ) {
	if ( ! signature ) {
		return false;
	}

	const familyKey = getAnalysisLaunchFamilyKey( signature );
	return (
		hasProductEvidence( signature ) &&
		! isStrictPreActionStartupSignature( signature ) &&
		! isSourceGatedStrictPreActionStartupSignature( signature ) &&
		! isNoProductInfraNoiseSignature( signature ) &&
		! isNoProductKnownNoiseSignature( signature ) &&
		! isCompletedJobUnsafeProductEvidenceFamilyCapRepresentative( job ) &&
		shouldApplyCurrentOutputFamilyCap( signature, familyKey, job )
	);
}

function shouldCountStoredJobForFirstLevelFamilyCap( job ) {
	if (
		job.noAnalysisProductEvidenceFamilyCap === true &&
		job.noAnalysisProductEvidenceRepresentative !== true
	) {
		return false;
	}
	if ( isCompletedJobUnsafeProductEvidenceFamilyCapRepresentative( job ) ) {
		return false;
	}
	return getStoredJobFirstLevelFamilyCapKeys( job ).length > 0;
}

function getStoredJobFirstLevelFamilyCapKeys( job ) {
	const keys = new Set();
	for ( const rawFamilyKey of [
		job.launchFamilyKey,
		job.sourceSemanticFamilyKey,
		job.semanticFamilyKey,
		job.familyKey,
		job.hash,
	] ) {
		addStoredJobFirstLevelFamilyCapKey( keys, job, rawFamilyKey );
	}

	const result = readJobResultSync( job );
	for ( const rawFamilyKey of [
		result?.distinctBugType,
		result?.semanticFamilyKey,
		result?.equivalenceClass,
	] ) {
		addStoredJobFirstLevelFamilyCapKey( keys, job, rawFamilyKey );
	}

	return [ ...keys ];
}

function addStoredJobFirstLevelFamilyCapKey( keys, job, rawFamilyKey ) {
	if ( ! rawFamilyKey ) {
		return;
	}
	if (
		typeof rawFamilyKey === 'string' &&
		rawFamilyKey.startsWith( 'active_product_evidence_' )
	) {
		if ( FAMILY_OCCUPANCY_JOB_STATUSES.has( job.status ) ) {
			keys.add( rawFamilyKey );
		}
		return;
	}
	const familyKey = canonicalizeSemanticFamilyKey( rawFamilyKey );
	if ( SEMANTIC_CAP_PRODUCT_EVIDENCE_FAMILIES.has( familyKey ) ) {
		keys.add( familyKey );
	}
}

function isDeepFamilyOccupancyJob( job ) {
	if ( FAMILY_OCCUPANCY_JOB_STATUSES.has( job.status ) ) {
		return true;
	}
	return (
		job.status === 'failed' && job.attempts >= DEEP_ANALYSIS_MAX_ATTEMPTS
	);
}

function shouldCountDeepJobForFamilyCap( job, signature ) {
	const familyKey = job.semanticFamilyKey ?? null;
	if ( job.status === 'running' ) {
		return (
			!! signature &&
			hasProductEvidence( signature ) &&
			shouldApplyCurrentOutputDeepFamilyCap( familyKey, signature )
		);
	}

	if (
		job.status === 'family-capped' &&
		shouldApplyCurrentOutputDeepFamilyCap( familyKey, signature )
	) {
		return true;
	}

	if (
		job.status === 'failed' &&
		job.attempts >= DEEP_ANALYSIS_MAX_ATTEMPTS
	) {
		return (
			!! signature &&
			hasProductEvidence( signature ) &&
			shouldApplyCurrentOutputDeepFamilyCap( familyKey, signature )
		);
	}

	return (
		hasVisibleLikelyRealJobResult( job ) ||
		( !! signature &&
			hasProductEvidence( signature ) &&
			! isCompletedJobUnsafeProductEvidenceFamilyCapRepresentative(
				job
			) &&
			shouldApplyCurrentOutputDeepFamilyCap( familyKey, signature ) )
	);
}

function isCompletedJobUnsafeProductEvidenceFamilyCapRepresentative( job ) {
	return (
		job?.status === 'completed' &&
		! isCompletedJobSafeProductEvidenceFamilyCapRepresentative( job )
	);
}

function isCompletedJobSafeProductEvidenceFamilyCapRepresentative( job ) {
	const result = readJobResultSync( job );
	if ( ! result ) {
		return false;
	}
	if ( hasVisibleLikelyRealJobResult( job ) ) {
		return true;
	}
	if (
		result.recommendedTriageAction === 'merge_with_duplicate' &&
		( result.isDuplicateOf || result.duplicateOf )
	) {
		return true;
	}
	return (
		result.recommendedTriageAction === 'suppress_as_infra' &&
		isSafeProductEvidenceHarnessNoiseFamily(
			result.distinctBugType ??
				result.semanticFamilyKey ??
				result.equivalenceClass
		)
	);
}

function isSafeProductEvidenceHarnessNoiseFamily( rawFamilyKey ) {
	return [
		'fuzz_helper_rest_endpoint_construction',
		'http_awareness_wait_false_timeout_after_reload',
		'rtc_test_ws_runtime_config_port_bleed',
		'rtc_ws_test_provider_bootstrap_missing_after_reload',
	].includes( canonicalizeSemanticFamilyKey( rawFamilyKey ?? '' ) );
}

function shouldApplyCurrentOutputDeepFamilyCap( familyKey, signature = null ) {
	if ( ! familyKey ) {
		return false;
	}
	if ( signature && ! hasProductEvidence( signature ) ) {
		return false;
	}
	if ( signature && hasProductEvidence( signature ) ) {
		return true;
	}
	return NO_PRODUCT_KNOWN_NOISE_FAMILIES.has(
		canonicalizeSemanticFamilyKey( familyKey )
	);
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
	return semanticFamilyKey;
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

	if ( isSourceRtcWsRuntimeConfigPortBleedSignature( signature ) ) {
		return 'rtc_test_ws_runtime_config_port_bleed';
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
	return family;
}

function isActiveOnlyAnalysisLaunchFamily( signature, familyKey ) {
	return (
		hasProductEvidence( signature ) &&
		typeof familyKey === 'string' &&
		familyKey.startsWith( 'active_product_evidence_' )
	);
}

function shouldApplyCurrentOutputFamilyCap( signature, familyKey, job = null ) {
	if ( signature ) {
		return hasProductEvidence( signature );
	}
	if (
		typeof familyKey === 'string' &&
		familyKey.startsWith( 'active_product_evidence_' )
	) {
		return FAMILY_OCCUPANCY_JOB_STATUSES.has( job?.status ?? 'unknown' );
	}
	return SEMANTIC_CAP_PRODUCT_EVIDENCE_FAMILIES.has(
		canonicalizeSemanticFamilyKey( familyKey )
	);
}

function needsFirstLevelAnalysisSession(
	signature,
	analysisJob,
	currentOutputFamilyCounts
) {
	if (
		! signature?.hash ||
		signatureHasOnlyExternalImportExamples( signature ) ||
		NON_ACTIONABLE_SIGNATURE_STATUSES.has( signature.status ?? 'unknown' )
	) {
		return false;
	}
	if (
		analysisJob?.status === 'completed' ||
		NON_ACTIONABLE_ANALYSIS_JOB_STATUSES.has(
			analysisJob?.status ?? 'unknown'
		)
	) {
		return false;
	}
	if (
		analysisJob?.status === 'running' &&
		isProcessAlive( analysisJob.pid )
	) {
		return false;
	}
	if ( isFailedAtMaxAttempts( analysisJob, ANALYSIS_MAX_ATTEMPTS ) ) {
		return false;
	}

	const familyKey = getAnalysisLaunchFamilyKey( signature );
	if (
		( currentOutputFamilyCounts?.get( familyKey ) ?? 0 ) > 0 &&
		shouldApplyCurrentOutputFamilyCap( signature, familyKey, analysisJob )
	) {
		return false;
	}

	return true;
}

function needsFirstLevelFamilyCapHousekeeping(
	signature,
	analysisJob,
	currentOutputFamilyCounts
) {
	if (
		analysisJob?.status === 'completed' ||
		NON_ACTIONABLE_ANALYSIS_JOB_STATUSES.has(
			analysisJob?.status ?? 'unknown'
		)
	) {
		return false;
	}
	if (
		analysisJob?.status === 'running' &&
		isProcessAlive( analysisJob.pid )
	) {
		return false;
	}
	if ( isFailedAtMaxAttempts( analysisJob, ANALYSIS_MAX_ATTEMPTS ) ) {
		return false;
	}

	const semanticFamilyKey = getSemanticFamilyKey( signature );
	const familyKey = getAnalysisLaunchFamilyKey( signature );
	if (
		! SEMANTIC_CAP_PRODUCT_EVIDENCE_FAMILIES.has( semanticFamilyKey ) &&
		! hasProductEvidence( signature )
	) {
		return false;
	}
	return (
		( currentOutputFamilyCounts?.get( familyKey ) ?? 0 ) > 0 &&
		shouldApplyCurrentOutputFamilyCap( signature, familyKey, analysisJob )
	);
}

function hasRunningFirstLevelAnalysisJob(
	signature,
	analysisJob,
	currentOutputFamilyCounts = null
) {
	if (
		! signature?.hash ||
		analysisJob?.status !== 'running' ||
		! isProcessAlive( analysisJob.pid )
	) {
		return false;
	}

	const sourceFamilyKey = getAnalysisLaunchFamilyKey( signature );
	const sourceFamilyApplies = shouldApplyCurrentOutputFamilyCap(
		signature,
		sourceFamilyKey,
		analysisJob
	);
	const familyKey =
		( sourceFamilyApplies ? sourceFamilyKey : null ) ??
		getStoredJobFirstLevelFamilyCapKeys( analysisJob )[ 0 ];
	if (
		familyKey &&
		( currentOutputFamilyCounts?.get( familyKey ) ?? 0 ) > 1
	) {
		return false;
	}

	return true;
}

function isLikelyRealDeepAnalysisCandidate( result ) {
	if ( ! result?.shouldDeepTriage ) {
		return false;
	}

	if (
		result.recommendedTriageAction === 'merge_with_duplicate' ||
		result.isDuplicateOf ||
		result.duplicateOf
	) {
		return false;
	}

	return [ 'likely_real', 'uncertain' ].includes( result.classification );
}

function completedAnalysisStillNeedsDeepAnalysis(
	analysisJob,
	deepAnalysisJob
) {
	if ( analysisJob?.status !== 'completed' ) {
		return true;
	}

	if (
		deepAnalysisJob?.status === 'completed' ||
		isFailedAtMaxAttempts( deepAnalysisJob, DEEP_ANALYSIS_MAX_ATTEMPTS ) ||
		NON_ACTIONABLE_ANALYSIS_JOB_STATUSES.has(
			deepAnalysisJob?.status ?? 'unknown'
		)
	) {
		return false;
	}

	return isLikelyRealDeepAnalysisCandidate(
		readJobResultSync( analysisJob )
	);
}

function isActionableSignature(
	signature,
	analysisJob,
	deepAnalysisJob,
	noAnalysis = null
) {
	if ( ! signature?.hash ) {
		return false;
	}

	if ( signatureHasOnlyExternalImportExamples( signature ) ) {
		return false;
	}

	if (
		NON_ACTIONABLE_SIGNATURE_STATUSES.has( signature.status ?? 'unknown' )
	) {
		return false;
	}

	if (
		analysisJob?.status === 'completed' &&
		! completedAnalysisStillNeedsDeepAnalysis(
			analysisJob,
			deepAnalysisJob
		)
	) {
		return false;
	}

	if ( deepAnalysisJob?.status === 'completed' ) {
		return false;
	}

	if (
		isFailedAtMaxAttempts( analysisJob, ANALYSIS_MAX_ATTEMPTS ) ||
		isFailedAtMaxAttempts( deepAnalysisJob, DEEP_ANALYSIS_MAX_ATTEMPTS ) ||
		NON_ACTIONABLE_ANALYSIS_JOB_STATUSES.has(
			analysisJob?.status ?? 'unknown'
		) ||
		NON_ACTIONABLE_ANALYSIS_JOB_STATUSES.has(
			deepAnalysisJob?.status ?? 'unknown'
		)
	) {
		return false;
	}

	if ( noAnalysis && ! hasSourceProductEvidence( signature ) ) {
		return false;
	}

	if (
		noAnalysis?.preserveProductEvidence === true &&
		hasSourceProductEvidence( signature ) &&
		! hasVisibleLikelyRealDecision( signature ) &&
		! isNoAnalysisSignatureLiveAdmitted( signature, noAnalysis )
	) {
		return false;
	}

	if ( getProducerNoAnalysisFamilyCapKey( signature, noAnalysis ) ) {
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

	if ( isRtcWsRuntimeConfigPortBleedSignature( signature ) ) {
		return false;
	}

	return (
		! isStrictPreActionStartupSignature( signature ) &&
		! isSourceGatedStrictPreActionStartupSignature( signature )
	);
}

function isFailedAtMaxAttempts( job, maxAttempts ) {
	return job?.status === 'failed' && ( job.attempts ?? 0 ) >= maxAttempts;
}

function hasProductEvidence( signature ) {
	return (
		hasSourceProductEvidence( signature ) ||
		hasVisibleLikelyRealDecision( signature )
	);
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
		canonicalizeSemanticFamilyKey(
			getAnalysisLaunchFamilyKey( signature )
		),
	] );
	return signatureFamilies.has( noAnalysisFamily ) ? noAnalysisFamily : null;
}

function hasSourceProductEvidence( signature ) {
	const facts = signature?.facts ?? {};
	return (
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

function isNoProductStartupInfraNoiseSignature( signature ) {
	if ( ! signature || hasProductEvidence( signature ) ) {
		return false;
	}

	return (
		hasStrictStartupInfraNoiseFacts( signature.facts ) &&
		NO_PRODUCT_INFRA_NOISE_PATTERN.test( signature.normalized ?? '' )
	);
}

function isNoProductKnownNoiseSignature( signature ) {
	if ( ! signature || hasProductEvidence( signature ) ) {
		return false;
	}

	return NO_PRODUCT_KNOWN_NOISE_FAMILIES.has(
		getSemanticFamilyKey( signature )
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

	if ( isRtcWsRuntimeConfigPortBleedSignature( signature ) ) {
		return 'rtc_test_ws_runtime_config_port_bleed';
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
	return family;
}

function getDeepAnalysisSemanticFamilyKey(
	signature,
	firstResult = null,
	hash = null
) {
	if (
		isStrictPreActionStartupSignature( signature ) ||
		isSourceGatedStrictPreActionStartupSignature( signature )
	) {
		return 'pre_action_bootstrap_stall';
	}
	if ( isFuzzHelperRestEndpointConstructionSignature( signature ) ) {
		return 'fuzz_helper_rest_endpoint_construction';
	}

	if ( isRtcWsRuntimeConfigPortBleedSignature( signature ) ) {
		return 'rtc_test_ws_runtime_config_port_bleed';
	}

	const sourceNormalized = canonicalizeSemanticFamilyKey(
		signature?.semanticFamilyKey ??
			signature?.equivalenceClass ??
			signature?.familyKey ??
			signature?.hash ??
			'unknown'
	);
	const sourceFamily = getExplicitSemanticFamilyKey(
		signature?.semanticFamilyKey,
		signature?.equivalenceClass
	);
	if ( sourceFamily ) {
		return sourceFamily;
	}
	const firstLevelFamily = getExplicitSemanticFamilyKey(
		firstResult?.distinctBugType,
		firstResult?.semanticFamilyKey,
		firstResult?.equivalenceClass
	);
	if ( firstLevelFamily ) {
		return firstLevelFamily;
	}
	const inferredFamily =
		getProductEvidenceLifecycleSemanticFamily( signature );
	if ( inferredFamily ) {
		return inferredFamily;
	}
	if (
		/awareness.*save.*reload|save.*reload.*awareness|http_awareness_loss_after_save_reload/.test(
			sourceNormalized
		)
	) {
		return 'awareness_loss_after_save_reload';
	}
	if ( /pre_action.*http.*polling.*sync.*cycle/.test( sourceNormalized ) ) {
		return 'pre_action_http_polling_sync_cycle_timeout';
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
		firstResult?.distinctBugType ??
		firstResult?.semanticFamilyKey ??
		firstResult?.equivalenceClass ??
		signature?.semanticFamilyKey ??
		signature?.equivalenceClass ??
		signature?.familyKey ??
		hash ??
		'unknown';
	const normalized = canonicalizeSemanticFamilyKey( raw );
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
	if (
		/bootstrap|pre_action.*startup|startup.*discovery|pre_action.*awareness/.test(
			normalized
		)
	) {
		return 'pre_action_bootstrap_stall';
	}
	if ( /pre_action.*http.*polling.*sync.*cycle/.test( normalized ) ) {
		return 'pre_action_http_polling_sync_cycle_timeout';
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
	if (
		/late.*session.*awareness|late_session_awareness/.test( normalized )
	) {
		return 'late_session_awareness_stall';
	}
	return normalized;
}

function getExplicitSemanticFamilyKey( ...rawValues ) {
	for ( const raw of rawValues ) {
		const family = canonicalizeExplicitSemanticFamily(
			normalizeExplicitSemanticFamilyKey( raw )
		);
		if ( isConcreteExplicitSemanticFamily( family ) ) {
			return family;
		}
	}
	return null;
}

function normalizeExplicitSemanticFamilyKey( value ) {
	return String( value ?? 'unknown' )
		.toLowerCase()
		.replaceAll( '`', '' )
		.replaceAll( "'", '' )
		.replaceAll( '"', '' )
		.replace( /[^a-z0-9]+/g, '_' )
		.replace( /_+/g, '_' )
		.replace( /^_|_$/g, '' );
}

function canonicalizeExplicitSemanticFamily( family ) {
	if ( /^persisted_content_/.test( family ) ) {
		return family;
	}
	if (
		/crdt.*snapshot|save_response.*hydration|saved_post_content|rest_saved_raw.*content/.test(
			family
		)
	) {
		return 'persisted_content_mismatch';
	}
	if (
		/collaboration.*non.*convergence|non_convergence.*html_entity|html_entity.*canonicalization/.test(
			family
		)
	) {
		return 'collaboration_non_convergence';
	}
	return canonicalizeSemanticFamilyKey( family );
}

function isConcreteExplicitSemanticFamily( family ) {
	return (
		!! family &&
		! [ 'unknown', 'timeout', 'none', 'null', 'undefined' ].includes(
			family
		) &&
		! /^[a-f0-9]{12,40}$/.test( family )
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

	const lifecycleContext = String(
		facts.lifecycleContext ?? ''
	).toLowerCase();
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

function isRtcWsRuntimeConfigPortBleedSignature( signature ) {
	const decisionFamily = canonicalizeSemanticFamilyKey(
		signature?.analysisGate?.distinctBugType ??
			signature?.result?.distinctBugType ??
			''
	);
	if ( decisionFamily === 'rtc_test_ws_runtime_config_port_bleed' ) {
		return true;
	}

	return isSourceRtcWsRuntimeConfigPortBleedSignature( signature );
}

function isSourceRtcWsRuntimeConfigPortBleedSignature( signature ) {
	const normalized = String( signature?.normalized ?? '' );
	const hasTrimmedEndpointMismatchThrowSite =
		/collaboration-utils\.ts:900\b/i.test( normalized ) &&
		/save, refresh, and sync faults/i.test( normalized );
	return (
		/RTC fuzz-only WebSocket provider endpoint mismatch|syncWaitValue\?\.kind === 'endpoint-mismatch'|kind[=:]"?endpoint-mismatch/i.test(
			normalized
		) || hasTrimmedEndpointMismatchThrowSite
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
		/crdt.*snapshot|save_response.*hydration|saved_post_content|rest_saved_raw.*content|persisted.*content.*mismatch/.test(
			normalized
		)
	) {
		return 'persisted_content_mismatch';
	}
	if (
		/collaboration.*non.*convergence|non_convergence.*html_entity|html_entity.*canonicalization/.test(
			normalized
		)
	) {
		return 'collaboration_non_convergence';
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
	if ( /pre_action.*http.*polling.*sync.*cycle/.test( normalized ) ) {
		return 'pre_action_http_polling_sync_cycle_timeout';
	}
	if (
		/bootstrap|pre_action.*startup|startup.*discovery/.test( normalized )
	) {
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
	if (
		/late.*session.*awareness|late_session_awareness/.test( normalized )
	) {
		return 'late_session_awareness_stall';
	}
	if ( /operation.*witness.*missing|witness.*loss/.test( normalized ) ) {
		return 'operation_witness_missing';
	}
	return normalized || 'unknown';
}

function summarizeActionableTriageState(
	triageState,
	analysisState,
	deepAnalysisState,
	noAnalysis = null,
	currentOutputFamilyCounts = null
) {
	const signatures = Object.values( triageState?.signatures ?? {} );
	const actionableSignatures = signatures.filter( ( signature ) =>
		isActionableSignature(
			signature,
			analysisState?.jobs?.[ signature.hash ],
			deepAnalysisState?.jobs?.[ signature.hash ],
			noAnalysis
		)
	);
	const firstLevelSignatures = actionableSignatures.filter( ( signature ) =>
		needsFirstLevelAnalysisSession(
			signature,
			analysisState?.jobs?.[ signature.hash ],
			currentOutputFamilyCounts
		)
	);
	const runningFirstLevelSignatures = actionableSignatures.filter(
		( signature ) =>
			hasRunningFirstLevelAnalysisJob(
				signature,
				analysisState?.jobs?.[ signature.hash ],
				currentOutputFamilyCounts
			)
	);
	const familyCapHousekeepingSignatures = actionableSignatures.filter(
		( signature ) =>
			needsFirstLevelFamilyCapHousekeeping(
				signature,
				analysisState?.jobs?.[ signature.hash ],
				currentOutputFamilyCounts
			)
	);
	const firstLevelFamilyKeys = [
		...new Set(
			firstLevelSignatures.map( ( signature ) =>
				getAnalysisLaunchFamilyKey( signature )
			)
		),
	];
	const familyCapHousekeepingFamilyKeys = [
		...new Set(
			familyCapHousekeepingSignatures.map( ( signature ) =>
				getAnalysisLaunchFamilyKey( signature )
			)
		),
	];

	return {
		statePresent: !! triageState,
		totalSignatures: signatures.length,
		actionableSignatures: actionableSignatures.length,
		firstLevelActionableSignatures: firstLevelSignatures.length,
		runningFirstLevelSignatures: runningFirstLevelSignatures.length,
		familyCapHousekeepingSignatures: familyCapHousekeepingSignatures.length,
		firstLevelFamilyKeys,
		familyCapHousekeepingFamilyKeys,
		statusCounts: countStatuses( signatures ),
		failureBucketCounts: triageState?.metrics?.failureBucketCounts ?? {},
		suppressedStartupFamilyCounts:
			triageState?.metrics?.suppressedKnownNoise?.strictPreActionStartup
				?.knownNoiseByFamily ?? {},
		topPreDecisionFamilies:
			triageState?.metrics?.topPreDecisionFamilies ?? [],
		shouldStartAnalysis: firstLevelSignatures.length > 0,
		shouldKeepAnalysisSession: runningFirstLevelSignatures.length > 0,
		shouldRunFamilyCapHousekeeping:
			familyCapHousekeepingSignatures.length > 0 &&
			firstLevelSignatures.length === 0,
	};
}

function hasGateFailureProtectedProductEvidenceWork(
	triageState,
	analysisState,
	deepAnalysisState
) {
	for ( const signature of Object.values( triageState?.signatures ?? {} ) ) {
		if ( ! hasProductEvidence( signature ) ) {
			continue;
		}
		const analysisJob = analysisState?.jobs?.[ signature.hash ];
		const deepAnalysisJob = deepAnalysisState?.jobs?.[ signature.hash ];
		if (
			hasVisibleLikelyRealDecision( signature ) &&
			( hasRunningFirstLevelAnalysisJob( signature, analysisJob ) ||
				completedAnalysisStillNeedsDeepAnalysis(
					analysisJob,
					deepAnalysisJob
				) )
		) {
			return true;
		}
		if (
			analysisJob?.status === 'completed' &&
			completedAnalysisStillNeedsDeepAnalysis(
				analysisJob,
				deepAnalysisJob
			)
		) {
			const result = readJobResultSync( analysisJob );
			if (
				result?.shouldDeepTriage === true &&
				[ 'likely_real', 'uncertain' ].includes(
					result.classification
				) &&
				result.recommendedTriageAction !== 'merge_with_duplicate' &&
				! result.isDuplicateOf
			) {
				return true;
			}
		}
	}
	return false;
}

async function summarizeRunDir( runDir, currentOutputFamilyCounts = null ) {
	const noAnalysis = await readNoAnalysisSentinel( runDir );
	const triageState = await readJsonFile(
		path.join( runDir, '.triage-watcher/state.json' )
	);
	const analysisState = await readJsonFile(
		path.join( runDir, '.triage-watcher/analysis-tier/state.json' )
	);
	const deepAnalysisState = await readJsonFile(
		path.join( runDir, '.triage-watcher/deep-analysis-tier/state.json' )
	);
	const triageActionability = summarizeActionableTriageState(
		triageState,
		analysisState,
		deepAnalysisState,
		noAnalysis,
		currentOutputFamilyCounts
	);

	return {
		runDir,
		producerNoAnalysis: noAnalysis,
		triageUpdatedAt: triageState?.updatedAt ?? null,
		triageCounts: countStatuses(
			Object.values( triageState?.signatures ?? {} )
		),
		triageMetrics: triageState?.metrics ?? null,
		triageActionability,
		analysisUpdatedAt: analysisState?.updatedAt ?? null,
		analysisCounts: countStatuses(
			Object.values( analysisState?.jobs ?? {} )
		),
		deepAnalysisUpdatedAt: deepAnalysisState?.updatedAt ?? null,
		deepAnalysisCounts: countStatuses(
			Object.values( deepAnalysisState?.jobs ?? {} )
		),
	};
}

async function monitorOnce() {
	const staleRunRootInfo = await getStaleRunRootInfo();
	if ( staleRunRootInfo ) {
		const staleSessionsCleaned = await cleanupStaleAnalysisSessions( [] );
		const action = {
			action: 'exit-stale-run-root',
			runRoot: RUN_ROOT,
			currentOutputRoot: staleRunRootInfo.currentOutputRoot,
			pointerPath: staleRunRootInfo.pointerPath,
			reason: staleRunRootInfo.reason,
			missingCurrentOutputPointer:
				staleRunRootInfo.missingCurrentOutputPointer ?? false,
			staleSessionsCleaned,
		};
		await writeJsonFile( STATE_PATH, {
			updatedAt: new Date().toISOString(),
			runRoot: RUN_ROOT,
			supervisorStatePath: SUPERVISOR_STATE_PATH,
			staleRunRoot: true,
			currentOutputRoot: staleRunRootInfo.currentOutputRoot,
			currentOutputPointerPath: staleRunRootInfo.pointerPath,
			staleRunRootReason: staleRunRootInfo.reason,
			missingCurrentOutputPointer:
				staleRunRootInfo.missingCurrentOutputPointer ?? false,
			intervalMs: WATCH_INTERVAL_MS,
			activeRunDirs: [],
			actions: [ action ],
		} );
		await event( {
			kind: 'stale-run-root-exit',
			...action,
		} );
		await log(
			`${ staleRunRootInfo.reason }; cleaned managed child analysis and exiting.`
		);
		shuttingDown = true;
		return;
	}

	const supervisorState = await readJsonFile( SUPERVISOR_STATE_PATH );
	if ( ! supervisorState ) {
		const staleSessionsCleaned =
			await cleanupAnalysisSessionsOutsideRunRoot();
		const action = {
			action: 'wait-for-supervisor-state',
			runRoot: RUN_ROOT,
			supervisorStatePath: SUPERVISOR_STATE_PATH,
			reason: 'missing or invalid supervisor state; not launching analysis until active run dirs are known',
			staleSessionsCleaned,
		};
		await writeJsonFile( STATE_PATH, {
			updatedAt: new Date().toISOString(),
			runRoot: RUN_ROOT,
			supervisorStatePath: SUPERVISOR_STATE_PATH,
			waitingForSupervisorState: true,
			intervalMs: WATCH_INTERVAL_MS,
			activeRunDirs: [],
			actions: [ action ],
		} );
		await event( {
			kind: 'waiting-for-supervisor-state',
			...action,
		} );
		await log(
			`${ action.reason }; cleaned stale external analysis sessions and waiting.`
		);
		return;
	}

	const staleSupervisorStateInfo =
		getStaleSupervisorStateInfo( supervisorState );
	if ( staleSupervisorStateInfo ) {
		const staleSessionsCleaned = await cleanupStaleAnalysisSessions( [] );
		const action = {
			action: 'hold-stale-supervisor-state',
			runRoot: RUN_ROOT,
			supervisorStatePath: SUPERVISOR_STATE_PATH,
			reason: staleSupervisorStateInfo.reason,
			supervisorLastUpdatedAt: staleSupervisorStateInfo.lastUpdatedAt,
			supervisorStateAgeMs: staleSupervisorStateInfo.ageMs,
			supervisorStateStaleTtlMs: staleSupervisorStateInfo.staleTtlMs,
			staleSessionsCleaned,
		};
		await writeJsonFile( STATE_PATH, {
			updatedAt: new Date().toISOString(),
			runRoot: RUN_ROOT,
			supervisorStatePath: SUPERVISOR_STATE_PATH,
			staleSupervisorState: true,
			supervisorLastUpdatedAt: staleSupervisorStateInfo.lastUpdatedAt,
			supervisorStateAgeMs: staleSupervisorStateInfo.ageMs,
			supervisorStateStaleTtlMs: staleSupervisorStateInfo.staleTtlMs,
			intervalMs: WATCH_INTERVAL_MS,
			activeRunDirs: [],
			launchRunDirs: [],
			actions: [ action ],
		} );
		await event( {
			kind: 'stale-supervisor-state',
			...action,
		} );
		await log(
			`${ staleSupervisorStateInfo.reason }; cleaned managed child analysis and skipping gate-only triage refresh.`
		);
		return;
	}

	const runDirScopes = await getLiveRunDirScopes( supervisorState );
	const launchRunDirSet = getActiveRunDirSet( runDirScopes.launchRunDirs );
	const summaries = [];
	const actions = [];
	const staleSessionsCleaned = await cleanupStaleAnalysisSessions(
		runDirScopes.launchRunDirs
	);
	const currentOutputFamilyCounts =
		runDirScopes.currentOutputFamilyCounts ??
		( await getCurrentOutputFirstLevelFamilyCounts(
			await getCurrentOutputFamilyCountRunDirs( runDirScopes.allRunDirs )
		) );
	const currentOutputDeepFamilyCounts =
		runDirScopes.currentOutputDeepFamilyCounts ??
		( await getCurrentOutputDeepFamilyCounts(
			await getCurrentOutputFamilyCountRunDirs( runDirScopes.allRunDirs )
		) );

	for ( const { group, status, runDir } of runDirScopes.allRunDirs ) {
		const isAnalysisLaunchScope = launchRunDirSet.has(
			path.resolve( runDir )
		);
		if ( ! fsSync.existsSync( runDir ) ) {
			actions.push( {
				group,
				status,
				runDir,
				launchScope: isAnalysisLaunchScope,
				action: 'skip-missing-run-dir',
			} );
			continue;
		}

		const gateRefresh = await runGateOnlyWatcherNonFatal( runDir );
		const gateOutput = gateRefresh.output;
		const noAnalysis = await readNoAnalysisSentinel( runDir );
		const triageState = await readJsonFile(
			path.join( runDir, '.triage-watcher/state.json' )
		);
		const analysisState = await readJsonFile(
			path.join( runDir, '.triage-watcher/analysis-tier/state.json' )
		);
		const deepAnalysisState = await readJsonFile(
			path.join( runDir, '.triage-watcher/deep-analysis-tier/state.json' )
		);
		const triageActionability = summarizeActionableTriageState(
			triageState,
			analysisState,
			deepAnalysisState,
			noAnalysis,
			currentOutputFamilyCounts
		);
		const deepAnalysisFamilyKeys =
			isAnalysisLaunchScope && DEEP_ANALYSIS_ENABLED
				? await getDeepAnalysisCandidateFamilyKeys(
						triageState,
						analysisState,
						deepAnalysisState,
						noAnalysis,
						currentOutputDeepFamilyCounts
				  )
				: [];
		const shouldStartDeepAnalysis = deepAnalysisFamilyKeys.length > 0;
		if ( ! gateRefresh.ok ) {
			const shouldKeepSessionAfterGateFailure =
				isAnalysisLaunchScope &&
				! noAnalysis &&
				hasGateFailureProtectedProductEvidenceWork(
					triageState,
					analysisState,
					deepAnalysisState
				);
			const stoppedSessions = shouldKeepSessionAfterGateFailure
				? []
				: await stopAnalysisSessionsForRunDir(
						runDir,
						isAnalysisLaunchScope
							? 'gate-only triage refresh failed and existing state has no actionable non-noise signatures'
							: 'no-analysis drain dirs are gate-only and cannot keep live analysis sessions'
				  );
			const summary = await summarizeRunDir(
				runDir,
				currentOutputFamilyCounts
			);
			summaries.push( {
				group,
				status,
				launchScope: isAnalysisLaunchScope,
				...summary,
				analysisSession: null,
				deepAnalysisSession: null,
			} );
			actions.push( {
				group,
				status,
				runDir,
				action: shouldKeepSessionAfterGateFailure
					? 'kept-analysis-gate-only-failed-product-evidence-likely-real'
					: ! isAnalysisLaunchScope
					? 'skipped-analysis-gate-only-drain'
					: 'skipped-analysis-gate-only-failed-no-actionable-signature',
				launchScope: isAnalysisLaunchScope,
				producerNoAnalysis: noAnalysis,
				gateOutput,
				gateError: gateRefresh.error,
				triageActionability,
				stoppedSessions,
			} );
			continue;
		}
		if ( ! isAnalysisLaunchScope ) {
			const stoppedSessions = await stopAnalysisSessionsForRunDir(
				runDir,
				noAnalysis
					? `no-analysis drain dir is gate-only: ${
							noAnalysis.reasonKind ?? 'noise'
					  }`
					: 'inactive drain dir is gate-only'
			);
			const summary = await summarizeRunDir(
				runDir,
				currentOutputFamilyCounts
			);
			summaries.push( {
				group,
				status,
				launchScope: false,
				...summary,
				analysisSession: null,
				deepAnalysisSession: null,
			} );
			actions.push( {
				group,
				status,
				runDir,
				action: 'skipped-analysis-gate-only-drain',
				launchScope: false,
				producerNoAnalysis: noAnalysis,
				gateOutput,
				triageActionability,
				stoppedSessions,
			} );
			continue;
		}
		if (
			! triageActionability.shouldStartAnalysis &&
			! triageActionability.shouldKeepAnalysisSession &&
			! shouldStartDeepAnalysis &&
			triageActionability.shouldRunFamilyCapHousekeeping
		) {
			const housekeeping = await runFamilyCapHousekeepingAnalysis(
				runDir,
				triageActionability.familyCapHousekeepingFamilyKeys
			);
			const secondGateRefresh =
				await runGateOnlyWatcherNonFatal( runDir );
			const stoppedSessions = await stopAnalysisSessionsForRunDir(
				runDir,
				'current-output family-cap housekeeping completed without live analysis work'
			);
			const summary = await summarizeRunDir(
				runDir,
				currentOutputFamilyCounts
			);
			summaries.push( {
				group,
				status,
				launchScope: true,
				...summary,
				analysisSession: null,
				deepAnalysisSession: null,
			} );
			actions.push( {
				group,
				status,
				runDir,
				action: housekeeping.ok
					? 'ran-family-cap-housekeeping'
					: 'family-cap-housekeeping-failed',
				producerNoAnalysis: noAnalysis,
				gateOutput,
				triageActionability,
				housekeeping,
				secondGateOutput: secondGateRefresh.output,
				secondGateError: secondGateRefresh.error,
				stoppedSessions,
				launchScope: true,
			} );
			continue;
		}
		if (
			! triageActionability.shouldStartAnalysis &&
			! triageActionability.shouldKeepAnalysisSession &&
			! shouldStartDeepAnalysis
		) {
			const stoppedSessions = await stopAnalysisSessionsForRunDir(
				runDir,
				noAnalysis
					? `producer inactive by duplicate/noise policy: ${
							noAnalysis.reasonKind ?? 'noise'
					  }`
					: 'no current actionable non-noise triage signatures'
			);
			const summary = await summarizeRunDir(
				runDir,
				currentOutputFamilyCounts
			);
			summaries.push( {
				group,
				status,
				launchScope: true,
				...summary,
				analysisSession: null,
				deepAnalysisSession: null,
			} );
			actions.push( {
				group,
				status,
				runDir,
				action: 'skipped-analysis-no-actionable-signature',
				launchScope: true,
				producerNoAnalysis: noAnalysis,
				gateOutput,
				triageActionability,
				stoppedSessions,
			} );
			continue;
		}

		const finalGateRefresh = await runGateOnlyWatcherNonFatal( runDir );
		const finalNoAnalysis = await readNoAnalysisSentinel( runDir );
		const finalTriageState = await readJsonFile(
			path.join( runDir, '.triage-watcher/state.json' )
		);
		const finalAnalysisState = await readJsonFile(
			path.join( runDir, '.triage-watcher/analysis-tier/state.json' )
		);
		const finalDeepAnalysisState = await readJsonFile(
			path.join( runDir, '.triage-watcher/deep-analysis-tier/state.json' )
		);
		const finalTriageActionability = summarizeActionableTriageState(
			finalTriageState,
			finalAnalysisState,
			finalDeepAnalysisState,
			finalNoAnalysis,
			currentOutputFamilyCounts
		);
		const finalDeepAnalysisFamilyKeys =
			DEEP_ANALYSIS_ENABLED && finalGateRefresh.ok
				? await getDeepAnalysisCandidateFamilyKeys(
						finalTriageState,
						finalAnalysisState,
						finalDeepAnalysisState,
						finalNoAnalysis,
						currentOutputDeepFamilyCounts
				  )
				: [];
		const finalShouldStartDeepAnalysis =
			finalDeepAnalysisFamilyKeys.length > 0;
		if ( ! finalGateRefresh.ok ) {
			const stoppedSessions = await stopAnalysisSessionsForRunDir(
				runDir,
				'final pre-launch gate-only triage refresh failed; refusing stale live analysis launch'
			);
			const summary = await summarizeRunDir(
				runDir,
				currentOutputFamilyCounts
			);
			summaries.push( {
				group,
				status,
				launchScope: true,
				...summary,
				analysisSession: null,
				deepAnalysisSession: null,
			} );
			actions.push( {
				group,
				status,
				runDir,
				action: 'skipped-analysis-final-gate-only-failed',
				launchScope: true,
				producerNoAnalysis: finalNoAnalysis,
				gateOutput,
				finalGateOutput: finalGateRefresh.output,
				finalGateError: finalGateRefresh.error,
				triageActionability: finalTriageActionability,
				preLaunchTriageActionability: triageActionability,
				stoppedSessions,
			} );
			continue;
		}
		if (
			! finalTriageActionability.shouldStartAnalysis &&
			! finalTriageActionability.shouldKeepAnalysisSession &&
			! finalShouldStartDeepAnalysis &&
			finalTriageActionability.shouldRunFamilyCapHousekeeping
		) {
			const housekeeping = await runFamilyCapHousekeepingAnalysis(
				runDir,
				finalTriageActionability.familyCapHousekeepingFamilyKeys
			);
			const stoppedSessions = await stopAnalysisSessionsForRunDir(
				runDir,
				'final pre-launch gate found family-cap-only work; live analysis session suppressed'
			);
			const summary = await summarizeRunDir(
				runDir,
				currentOutputFamilyCounts
			);
			summaries.push( {
				group,
				status,
				launchScope: true,
				...summary,
				analysisSession: null,
				deepAnalysisSession: null,
			} );
			actions.push( {
				group,
				status,
				runDir,
				action: housekeeping.ok
					? 'ran-family-cap-housekeeping-final-gate'
					: 'family-cap-housekeeping-final-gate-failed',
				launchScope: true,
				producerNoAnalysis: finalNoAnalysis,
				gateOutput,
				finalGateOutput: finalGateRefresh.output,
				triageActionability: finalTriageActionability,
				preLaunchTriageActionability: triageActionability,
				housekeeping,
				stoppedSessions,
			} );
			continue;
		}
		if (
			! finalTriageActionability.shouldStartAnalysis &&
			! finalTriageActionability.shouldKeepAnalysisSession &&
			! finalShouldStartDeepAnalysis
		) {
			const stoppedSessions = await stopAnalysisSessionsForRunDir(
				runDir,
				finalNoAnalysis
					? `final pre-launch gate found producer inactive by duplicate/noise policy: ${
							finalNoAnalysis.reasonKind ?? 'noise'
					  }`
					: 'final pre-launch gate found no current actionable non-noise triage signatures'
			);
			const summary = await summarizeRunDir(
				runDir,
				currentOutputFamilyCounts
			);
			summaries.push( {
				group,
				status,
				launchScope: true,
				...summary,
				analysisSession: null,
				deepAnalysisSession: null,
			} );
			actions.push( {
				group,
				status,
				runDir,
				action: 'skipped-analysis-final-gate-no-actionable-signature',
				launchScope: true,
				producerNoAnalysis: finalNoAnalysis,
				gateOutput,
				finalGateOutput: finalGateRefresh.output,
				triageActionability: finalTriageActionability,
				preLaunchTriageActionability: triageActionability,
				stoppedSessions,
			} );
			continue;
		}

		const analysisSession =
			finalTriageActionability.shouldStartAnalysis ||
			finalTriageActionability.shouldKeepAnalysisSession
				? await ensureAnalysisSession( runDir )
				: null;
		const stoppedAnalysisSession =
			! finalTriageActionability.shouldStartAnalysis &&
			! finalTriageActionability.shouldKeepAnalysisSession
				? await stopAnalysisSessionsForRunDir(
						runDir,
						'deep-analysis-only launch scope has no first-level actionable work',
						{ includeDeep: false }
				  )
				: [];
		if ( analysisSession && finalTriageActionability.shouldStartAnalysis ) {
			for ( const familyKey of finalTriageActionability.firstLevelFamilyKeys ) {
				currentOutputFamilyCounts.set(
					familyKey,
					( currentOutputFamilyCounts.get( familyKey ) ?? 0 ) + 1
				);
			}
		}
		const deepAnalysisSession = finalShouldStartDeepAnalysis
			? await ensureDeepAnalysisSession( runDir )
			: null;
		if ( deepAnalysisSession ) {
			for ( const familyKey of finalDeepAnalysisFamilyKeys ) {
				currentOutputDeepFamilyCounts.set(
					familyKey,
					( currentOutputDeepFamilyCounts.get( familyKey ) ?? 0 ) + 1
				);
			}
		}
		const stoppedDeepAnalysisSession = finalShouldStartDeepAnalysis
			? null
			: await stopDeepAnalysisSessionForRunDir(
					runDir,
					'no first-level completed candidate currently needs deep analysis'
			  );
		const secondGateRefresh = await runGateOnlyWatcherNonFatal( runDir );
		const secondGateOutput = secondGateRefresh.output;
		const summary = await summarizeRunDir(
			runDir,
			currentOutputFamilyCounts
		);

		summaries.push( {
			group,
			status,
			launchScope: true,
			...summary,
			analysisSession: analysisSession?.sessionName ?? null,
			deepAnalysisSession: deepAnalysisSession?.sessionName ?? null,
		} );
		actions.push( {
			group,
			status,
			runDir,
			action: analysisSession
				? analysisSession.started
					? 'started-analysis-session'
					: 'analysis-session-already-running'
				: 'skipped-first-level-analysis-current-output-family-cap',
			sessionName: analysisSession?.sessionName ?? null,
			deepAnalysisSessionName: deepAnalysisSession?.sessionName ?? null,
			deepAnalysisAction: deepAnalysisSession
				? deepAnalysisSession.started
					? 'started-deep-analysis-session'
					: 'deep-analysis-session-already-running'
				: DEEP_ANALYSIS_ENABLED
				? 'deep-analysis-no-current-candidate'
				: 'deep-analysis-disabled',
			stoppedAnalysisSession,
			stoppedDeepAnalysisSession,
			producerNoAnalysis: finalNoAnalysis,
			gateOutput,
			finalGateOutput: finalGateRefresh.output,
			secondGateOutput,
			secondGateError: secondGateRefresh.error,
			triageActionability: finalTriageActionability,
			preLaunchTriageActionability: triageActionability,
			launchScope: true,
		} );
	}

	await writeJsonFile( STATE_PATH, {
		updatedAt: new Date().toISOString(),
		runRoot: RUN_ROOT,
		supervisorStatePath: SUPERVISOR_STATE_PATH,
		supervisorLastUpdatedAt: supervisorState.lastUpdatedAt ?? null,
		intervalMs: WATCH_INTERVAL_MS,
		analysisMaxParallel: ANALYSIS_MAX_PARALLEL,
		analysisMaxAttempts: ANALYSIS_MAX_ATTEMPTS,
		analysisCodexTimeoutMs: ANALYSIS_CODEX_TIMEOUT_MS,
		deepAnalysisEnabled: DEEP_ANALYSIS_ENABLED,
		deepAnalysisMaxParallel: DEEP_ANALYSIS_MAX_PARALLEL,
		deepAnalysisMaxAttempts: DEEP_ANALYSIS_MAX_ATTEMPTS,
		deepAnalysisCodexTimeoutMs: DEEP_ANALYSIS_CODEX_TIMEOUT_MS,
		noAnalysisLiveAdmissionChanges:
			runDirScopes.noAnalysisLiveAdmissionChanges ?? 0,
		staleSessionsCleaned,
		launchRunDirs: runDirScopes.launchRunDirs,
		drainRunDirs: runDirScopes.drainRunDirs,
		activeRunDirs: summaries,
		actions,
	} );

	await event( {
		kind: 'monitor-pass',
		activeRunDirs: summaries,
		actions: actions.map( ( action ) => ( {
			group: action.group,
			status: action.status,
			runDir: action.runDir,
			action: action.action,
			launchScope: action.launchScope,
			sessionName: action.sessionName,
			deepAnalysisSessionName: action.deepAnalysisSessionName,
			deepAnalysisAction: action.deepAnalysisAction,
		} ) ),
	} );

	await log(
		`pass active=${ summaries.length } actions=${ actions
			.map(
				( action ) =>
					`${ action.group ?? 'unknown' }:${ action.action }`
			)
			.join( ',' ) } triage=${ summaries
			.map( formatRunSummaryForLog )
			.join( ';' ) }`
	);
}

function sleep( ms ) {
	return new Promise( ( resolve ) => setTimeout( resolve, ms ) );
}

process.on( 'SIGINT', () => {
	shuttingDown = true;
} );
process.on( 'SIGTERM', () => {
	shuttingDown = true;
} );

await fs.mkdir( RUN_ROOT, { recursive: true } );
await log(
	`RTC browser fuzz live analysis monitor started for runRoot=${ RUN_ROOT }.`
);
await event( {
	kind: 'live-analysis-monitor-start',
	runRoot: RUN_ROOT,
	supervisorStatePath: SUPERVISOR_STATE_PATH,
	intervalMs: WATCH_INTERVAL_MS,
	analysisMaxParallel: ANALYSIS_MAX_PARALLEL,
	analysisMaxAttempts: ANALYSIS_MAX_ATTEMPTS,
	analysisCodexTimeoutMs: ANALYSIS_CODEX_TIMEOUT_MS,
	deepAnalysisEnabled: DEEP_ANALYSIS_ENABLED,
	deepAnalysisMaxParallel: DEEP_ANALYSIS_MAX_PARALLEL,
	deepAnalysisMaxAttempts: DEEP_ANALYSIS_MAX_ATTEMPTS,
	deepAnalysisCodexTimeoutMs: DEEP_ANALYSIS_CODEX_TIMEOUT_MS,
} );

do {
	try {
		await monitorOnce();
	} catch ( error ) {
		await log( error.stack ?? error.message );
		await event( {
			kind: 'error',
			error: error.stack ?? error.message,
		} );
	}

	if ( ONCE ) {
		break;
	}
	if ( shuttingDown ) {
		break;
	}

	await sleep( WATCH_INTERVAL_MS );
} while ( ! shuttingDown );

await log( 'RTC browser fuzz live analysis monitor exiting.' );
