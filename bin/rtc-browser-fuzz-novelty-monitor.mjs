#!/usr/bin/env node

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { execFileSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';

const REPO_ROOT = path.resolve(
	path.dirname( fileURLToPath( import.meta.url ) ),
	'..'
);
const OUTPUT_DIR =
	process.env.RTC_FUZZ_NOVELTY_OUTPUT_DIR ??
	path.join(
		REPO_ROOT,
		'artifacts/rtc-browser-fuzz',
		`novelty-${ createTimestamp() }`
	);
const GROUPS_PATH =
	process.env.RTC_FUZZ_NOVELTY_GROUPS_PATH ??
	path.join( OUTPUT_DIR, 'supervisor-groups.json' );
const STATE_PATH = path.join( OUTPUT_DIR, 'novelty-state.json' );
const STATUS_PATH = path.join( OUTPUT_DIR, 'novelty-status.md' );
const LOG_PATH = path.join( OUTPUT_DIR, 'novelty-monitor.log' );
const SUPERVISOR_SESSION =
	process.env.RTC_FUZZ_NOVELTY_SUPERVISOR_SESSION ??
	'rtc-fuzz-novelty-supervisor-20260502';
const INTERVAL_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_INTERVAL_MS',
	5 * 60 * 1000
);
const DURATION_HOURS = getPositiveNumberEnv(
	'RTC_FUZZ_NOVELTY_DURATION_HOURS',
	14
);
const BASE_URL =
	process.env.RTC_FUZZ_NOVELTY_BASE_URL ??
	process.env.WP_BASE_URL ??
	'http://localhost:8889';
const WP_ENV_PORT = process.env.RTC_FUZZ_NOVELTY_WP_ENV_PORT ?? '8889';
const WS_PORT = process.env.RTC_FUZZ_NOVELTY_WS_PORT ?? '18991';
const END_AT = Date.now() + DURATION_HOURS * 60 * 60 * 1000;
const OBSERVED_RUN_DIRS = parsePathList(
	process.env.RTC_FUZZ_NOVELTY_OBSERVED_RUN_DIRS
).concat( OUTPUT_DIR );
const FORCE_START = process.env.RTC_FUZZ_NOVELTY_FORCE_START === '1';
const INCLUDE_RECHECK_COVERAGE =
	process.env.RTC_FUZZ_NOVELTY_INCLUDE_RECHECK_COVERAGE === '1';
const ENABLE_HTTP_PROBE =
	process.env.RTC_FUZZ_NOVELTY_ENABLE_HTTP_PROBE !== '0';
const ENABLE_SAME_USER_PROBE =
	process.env.RTC_FUZZ_NOVELTY_ENABLE_SAME_USER === '1';
const MAX_ENABLED_GROUPS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS',
	7
);
const TARGET_ENABLED_GROUPS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS',
	3
);
const PAUSE_ON_STARTUP_FAILURE =
	process.env.RTC_FUZZ_NOVELTY_PAUSE_ON_STARTUP_FAILURE !== '0';
const STARTUP_FAILURE_LIMIT = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_STARTUP_FAILURE_LIMIT',
	2
);
const STARTUP_FAILURE_COOLDOWN_HOURS = getPositiveNumberEnv(
	'RTC_FUZZ_NOVELTY_STARTUP_FAILURE_COOLDOWN_HOURS',
	6
);
const MAC_MEMORY_PRESSURE_MIN_FREE_PERCENT = getPositiveIntegerEnv(
	'RTC_FUZZ_MAC_MEMORY_PRESSURE_MIN_FREE_PERCENT',
	30
);
const MAC_SWAPOUT_HOLD_MBPS = getPositiveNumberEnv(
	'RTC_FUZZ_MAC_SWAPOUT_HOLD_MBPS',
	1
);
const MAC_PAGEOUT_HOLD_MBPS = getPositiveNumberEnv(
	'RTC_FUZZ_MAC_PAGEOUT_HOLD_MBPS',
	5
);
const MAC_DECOMPRESS_HOLD_MBPS = getPositiveNumberEnv(
	'RTC_FUZZ_MAC_DECOMPRESS_HOLD_MBPS',
	250
);
const MAC_SWAP_FREE_MIN_GB = getPositiveNumberEnv(
	'RTC_FUZZ_MAC_SWAP_FREE_MIN_GB',
	0.5
);
const BROWSER_FREE_MEMORY_MIN_GB = getPositiveNumberEnv(
	'RTC_FUZZ_NOVELTY_BROWSER_FREE_MEMORY_MIN_GB',
	1
);
const COMMON_BLOCK_MIN_RECORDS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_COMMON_BLOCK_MIN_RECORDS',
	25
);
const BLOCK_GAUNTLET_MIN_RECORDS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_BLOCK_GAUNTLET_MIN_RECORDS',
	20
);
const LATE_JOIN_LIFECYCLE_MIN_RECORDS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_LATE_JOIN_MIN_RECORDS',
	300
);
const SAME_USER_CANARY_LATE_JOIN_MIN_RECORDS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_SAME_USER_CANARY_LATE_JOIN_MIN_RECORDS',
	250
);
const PARSER_TRANSFORM_ROTATE_RECORDS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_PARSER_TRANSFORM_ROTATE_RECORDS',
	200
);
const PARSER_TRANSFORM_ROTATE_INITIAL_RECORDS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_PARSER_TRANSFORM_ROTATE_INITIAL_RECORDS',
	150
);
const REAL_USER_EDITING_MIN_RECORDS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_REAL_USER_EDITING_MIN_RECORDS',
	80
);
const REAL_USER_EDITING_MIN_ACTION_RECORDS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_REAL_USER_EDITING_MIN_ACTION_RECORDS',
	5
);
const REAL_USER_EDITING_NO_YIELD_MIN_RECORDS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_REAL_USER_EDITING_NO_YIELD_MIN_RECORDS',
	250
);
const TRIAGE_DUPLICATE_SHARE_HOLD = getPositiveNumberEnv(
	'RTC_FUZZ_NOVELTY_TRIAGE_DUPLICATE_SHARE_HOLD',
	0.45
);
const TRIAGE_NOISE_DOMINANCE_MIN_CANDIDATES = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_TRIAGE_NOISE_DOMINANCE_MIN_CANDIDATES',
	10
);
const REAL_USER_EDITING_ACTION_LABELS = [
	'ui-type-paragraph',
	'ui-format-paragraph',
	'ui-heading-shortcut',
	'reload-post-action',
];
const EXPANSION_POLICY_VERSION = 5;

const NO_FAULT_WS_ENV = {
	GUTENBERG_RTC_TEST_WS_SKIP_RESET: '1',
	GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS: '1',
	GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '480000',
	RTC_FUZZ_ANALYSIS_RECHECKS: '1',
	RTC_FUZZ_BOOTSTRAP_STALL_RECHECKS: '0',
	RTC_FUZZ_DISABLE_SYNC_FAULTS: '1',
	RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '60000',
	RTC_FUZZ_RUN_TIMEOUT_MS: '720000',
};

const PROFILE_BY_GROUP = {
	'novelty-ws-block-gauntlet': 'block-gauntlet',
	'novelty-ws-common-blocks': 'common-blocks',
	'novelty-ws-lifecycle': 'session-lifecycle',
	'novelty-ws-multi-reload-lifecycle': 'multi-reload-lifecycle',
	'novelty-ws-parser-serialization': 'parser-serialization',
	'novelty-ws-parser-transform': 'parser-transform',
	'novelty-ws-persistence-no-title': 'persistence-no-title',
	'novelty-ws-real-user-editing': 'real-user-editing',
	'novelty-ws-revision-persistence': 'revision-persistence',
	'novelty-ws-same-user-lifecycle': 'session-lifecycle',
	'novelty-ws-structure': 'structure',
	'novelty-ws-three-user-late-join': 'three-user-late-join',
};

const HIGH_VALUE_EXPANSION_GROUPS = [
	'novelty-ws-real-user-editing',
	'novelty-ws-block-gauntlet',
	'novelty-ws-parser-transform',
	'novelty-ws-common-blocks',
	'novelty-ws-parser-serialization',
	'novelty-ws-revision-persistence',
	'novelty-ws-three-user-late-join',
	'novelty-ws-multi-reload-lifecycle',
	'novelty-ws-same-user-lifecycle',
];

const ROTATION_PAUSE_ORDER = [
	'novelty-ws-structure',
	'novelty-ws-persistence-no-title',
	'novelty-ws-lifecycle',
];

const COMMON_BLOCK_TYPES = [
	'core/button',
	'core/buttons',
	'core/column',
	'core/columns',
	'core/image',
];

const BLOCK_GAUNTLET_TYPES = [
	'core/details',
	'core/file',
	'core/gallery',
	'core/html',
	'core/media-text',
	'core/more',
	'core/quote',
	'core/separator',
	'core/shortcode',
	'core/social-link',
	'core/social-links',
	'core/spacer',
];

const PARSER_TRANSFORM_INITIAL_PROFILES = [
	'html-entity-reference',
	'deprecated-block-content',
	'validation-fix-content',
	'equivalent-html-content',
	'freeform-parser-content',
];

const PROFILE_GROUPS = [
	{
		name: 'novelty-ws-structure',
		actionProfile: 'structure',
		startSeed: 960001,
		stepCount: 14,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_DISABLE_PARSER_STRESS: '1',
			GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS: '1',
			RTC_FUZZ_DISABLE_SYNC_FAULTS: '1',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '60000',
		},
	},
	{
		name: 'novelty-ws-common-blocks',
		actionProfile: 'common-blocks',
		startSeed: 965001,
		stepCount: 10,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_DISABLE_PARSER_STRESS: '1',
		},
	},
	{
		name: 'novelty-ws-block-gauntlet',
		actionProfile: 'block-gauntlet',
		startSeed: 966001,
		stepCount: 10,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_DISABLE_PARSER_STRESS: '1',
			GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS: '1',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			RTC_FUZZ_DISABLE_SYNC_FAULTS: '1',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '60000',
		},
	},
	{
		name: 'novelty-ws-lifecycle',
		actionProfile: 'session-lifecycle',
		startSeed: 970001,
		stepCount: 12,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_DISABLE_PARSER_STRESS: '1',
			GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS: '1',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			RTC_FUZZ_DISABLE_SYNC_FAULTS: '1',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '60000',
		},
	},
	{
		name: 'novelty-ws-persistence-no-title',
		actionProfile: 'persistence-no-title',
		startSeed: 980001,
		stepCount: 12,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_DISABLE_PARSER_STRESS: '1',
			GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			RTC_FUZZ_DISABLE_SYNC_FAULTS: '1',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '60000',
		},
	},
	{
		name: 'novelty-ws-revision-persistence',
		actionProfile: 'revision-persistence',
		startSeed: 990001,
		stepCount: 10,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_DISABLE_PARSER_STRESS: '1',
			GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS: '1',
			GUTENBERG_RTC_BROWSER_DISABLE_REVISION_RESTORE: '0',
			GUTENBERG_RTC_BROWSER_ENABLE_REVISION_RESTORE_PROBE: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '2',
			RTC_FUZZ_DISABLE_REVISION_RESTORE: '0',
			RTC_FUZZ_ENABLE_REVISION_RESTORE_PROBE: '1',
		},
	},
	{
		name: 'novelty-ws-three-user-late-join',
		actionProfile: 'three-user-late-join',
		startSeed: 1000001,
		stepCount: 10,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_DISABLE_PARSER_STRESS: '1',
			GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS: '1',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP: '1',
			GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION: '1',
		},
	},
	{
		name: 'novelty-ws-same-user-lifecycle',
		actionProfile: 'session-lifecycle',
		startSeed: 1050001,
		stepCount: 8,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_COLLABORATOR_MODE: 'same-user',
			GUTENBERG_RTC_BROWSER_DISABLE_PARSER_STRESS: '1',
			GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS: '1',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '0',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '1',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			RTC_FUZZ_DISABLE_SYNC_FAULTS: '1',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '60000',
		},
	},
	{
		name: 'novelty-ws-parser-serialization',
		actionProfile: 'parser-serialization',
		startSeed: 1010001,
		stepCount: 9,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS: '1',
			GUTENBERG_RTC_BROWSER_DISABLE_REVISION_RESTORE: '1',
		},
	},
	{
		name: 'novelty-ws-parser-transform',
		actionProfile: 'parser-transform',
		startSeed: 1040001,
		stepCount: 8,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS: '1',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			RTC_FUZZ_DISABLE_SYNC_FAULTS: '1',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '60000',
		},
	},
	{
		name: 'novelty-ws-real-user-editing',
		actionProfile: 'real-user-editing',
		startSeed: 1060001,
		stepCount: 8,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_DISABLE_PARSER_STRESS: '1',
			GUTENBERG_RTC_BROWSER_DISABLE_RANDOM_RELOAD: '1',
			GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS: '1',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '4',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '2',
			GUTENBERG_RTC_BROWSER_REAL_USER_EDITING_ACTION_LABELS:
				'ui-type-paragraph,ui-format-paragraph,ui-heading-shortcut',
			GUTENBERG_RTC_BROWSER_REAL_USER_EDITING_SEQUENCE:
				'ui-type-paragraph,ui-format-paragraph,ui-heading-shortcut,ui-type-paragraph',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'shadow',
			GUTENBERG_RTC_BROWSER_RELOAD_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_RELOAD_POST_ACTION_KIND: 'paragraph',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			RTC_FUZZ_DISABLE_SYNC_FAULTS: '1',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '60000',
		},
	},
	{
		name: 'novelty-ws-multi-reload-lifecycle',
		actionProfile: 'multi-reload-lifecycle',
		startSeed: 1020001,
		stepCount: 12,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_DISABLE_PARSER_STRESS: '1',
			GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS: '1',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '2',
		},
	},
	{
		name: 'novelty-http-persistence-probe',
		actionProfile: 'persistence-no-title',
		transport: 'http',
		startSeed: 1030001,
		stepCount: 8,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_DISABLE_PARSER_STRESS: '1',
			GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS: '1',
			GUTENBERG_RTC_BROWSER_DISABLE_REVISION_RESTORE: '1',
		},
	},
];

await fs.mkdir( OUTPUT_DIR, { recursive: true } );
const state = ( await readJsonFile( STATE_PATH ) ) ?? {
	startedAt: new Date().toISOString(),
	enabledGroups: [ 'novelty-ws-structure' ],
	featureCounts: {},
	coverageHashes: {},
	fileOffsets: {},
	recordCountsByProfile: {},
	recordCountsByTransport: {},
	successfulActionCountsByProfile: {},
	successfulRecordCountsByProfile: {},
	startupFailureCountsByProfile: {},
	pausedGroups: {},
	disabledGroups: {},
	recordsSeen: 0,
	healthWarnings: [],
	lastUpdatedAt: null,
	changes: [],
};
state.fileOffsets ??= {};
state.expansionPolicyVersion ??= 0;

if ( state.expansionPolicyVersion !== EXPANSION_POLICY_VERSION ) {
	state.pausedGroups ??= {};
	state.disabledGroups ??= {};
	state.startupFailureCountsByProfile ??= {};

	for ( const group of HIGH_VALUE_EXPANSION_GROUPS ) {
		delete state.pausedGroups[ group ];
		const profile = PROFILE_BY_GROUP[ group ];
		if ( profile ) {
			delete state.startupFailureCountsByProfile[ profile ];
		}
	}

	state.expansionPolicyVersion = EXPANSION_POLICY_VERSION;
	state.changes.push( {
		at: new Date().toISOString(),
		action: 'reset-expansion-pauses',
		reason: 'new low-noise/rotation policy; retry under-covered expansion profiles',
	} );
}
state.recordCountsByProfile ??= {};
state.recordCountsByTransport ??= {};
state.successfulActionCountsByProfile ??= {};
state.successfulRecordCountsByProfile ??= {};
state.startupFailureCountsByProfile ??= {};
state.pausedGroups ??= {};
state.healthWarnings ??= [];

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

function createTimestamp() {
	return new Date()
		.toISOString()
		.replaceAll( '-', '' )
		.replaceAll( ':', '' )
		.replace( /\.\d+Z$/, 'Z' )
		.replace( 'T', 'T' );
}

function parsePathList( value ) {
	if ( ! value ) {
		return [];
	}
	return value
		.split( path.delimiter )
		.flatMap( ( item ) => item.split( ',' ) )
		.map( ( item ) => item.trim() )
		.filter( Boolean );
}

async function log( message ) {
	const line = `[${ new Date().toISOString() }] ${ message }\n`;
	process.stdout.write( line );
	await fs.appendFile( LOG_PATH, line );
}

async function readJsonFile( filePath ) {
	try {
		return JSON.parse( await fs.readFile( filePath, 'utf8' ) );
	} catch {
		return null;
	}
}

async function writeJsonFileAtomic( filePath, value ) {
	const tmpPath = `${ filePath }.tmp-${ process.pid }`;
	await fs.mkdir( path.dirname( filePath ), { recursive: true } );
	await fs.writeFile( tmpPath, JSON.stringify( value, null, 2 ) + '\n' );
	await fs.rename( tmpPath, filePath );
}

async function findCoverageFiles( roots ) {
	const files = [];
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
			if ( entry.isDirectory() ) {
				if (
					[
						'.triage-watcher',
						'node_modules',
						'.git',
						'vendor',
						'test-results',
						'playwright-report',
						'blob-report',
						'codex-analysis',
					].includes( entry.name )
				) {
					continue;
				}
				if (
					! INCLUDE_RECHECK_COVERAGE &&
					( entry.name.startsWith( 'analysis-' ) ||
						entry.name.startsWith( 'recheck-' ) )
				) {
					continue;
				}
				await walk( entryPath, depth + 1 );
			} else if ( entry.name === 'rtc-behavioral-coverage.ndjson' ) {
				files.push( entryPath );
			}
		}
	}

	for ( const root of roots ) {
		await walk( root, 0 );
	}

	return files.sort();
}

async function findTriageStateFiles( roots ) {
	const files = [];
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
			if ( entry.isDirectory() ) {
				if ( entry.name === '.triage-watcher' ) {
					files.push( path.join( entryPath, 'state.json' ) );
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
						'codex-analysis',
					].includes( entry.name )
				) {
					continue;
				}
				await walk( entryPath, depth + 1 );
			}
		}
	}

	for ( const root of roots ) {
		await walk( root, 0 );
	}

	return [ ...new Set( files ) ].sort();
}

async function summarizeTriageYield( roots ) {
	const files = await findTriageStateFiles( roots );
	const familyCounts = {};
	const summary = {
		files: files.length,
		signatureCount: 0,
		likelyRealVisible: 0,
		likelyRealMerged: 0,
		likelyRealOracleQuestion: 0,
		normalizationNoiseCandidates: 0,
		bootstrapStalls: 0,
		topDuplicateFamilyShare: 0,
		topSemanticFamilies: [],
	};

	for ( const filePath of files ) {
		const triageState = await readJsonFile( filePath );
		const signatures = Object.values( triageState?.signatures ?? {} );
		if ( signatures.length === 0 && triageState?.metrics ) {
			addTriageMetricsSummary(
				summary,
				familyCounts,
				triageState.metrics
			);
			continue;
		}

		for ( const signature of signatures ) {
			summary.signatureCount += 1;
			const family = getTriageSemanticFamily( signature );
			familyCounts[ family ] = ( familyCounts[ family ] ?? 0 ) + 1;

			if (
				signature.equivalenceClass === 'pre-action-bootstrap-stall' ||
				signature.status === 'bootstrap-stall'
			) {
				summary.bootstrapStalls += 1;
			}
			if ( isLikelyTriageNormalizationNoise( signature ) ) {
				summary.normalizationNoiseCandidates += 1;
			}

			const decision = signature.analysisGate ?? signature.result;
			if ( decision?.classification !== 'likely_real' ) {
				continue;
			}
			const action =
				decision.recommendedTriageAction ??
				decision.candidateStatus ??
				'unknown';
			if (
				action === 'merge_with_duplicate' ||
				decision.isDuplicateOf ||
				decision.duplicateOf
			) {
				summary.likelyRealMerged += 1;
			} else if ( isLikelyTriageNormalizationNoise( signature ) ) {
				summary.likelyRealOracleQuestion += 1;
			} else {
				summary.likelyRealVisible += 1;
			}
		}
	}

	summary.topSemanticFamilies = Object.entries( familyCounts )
		.sort( ( left, right ) => right[ 1 ] - left[ 1 ] )
		.slice( 0, 20 )
		.map( ( [ family, count ] ) => ( { family, count } ) );
	if ( summary.signatureCount > 0 && summary.topSemanticFamilies.length ) {
		summary.topDuplicateFamilyShare = Number(
			(
				summary.topSemanticFamilies[ 0 ].count / summary.signatureCount
			).toFixed( 4 )
		);
	}
	return summary;
}

function addTriageMetricsSummary( summary, familyCounts, metrics ) {
	summary.signatureCount += metrics.signatureCount ?? 0;
	summary.likelyRealVisible += metrics.likelyRealVisible ?? 0;
	summary.likelyRealMerged += metrics.likelyRealMerged ?? 0;
	summary.likelyRealOracleQuestion += metrics.likelyRealOracleQuestion ?? 0;
	summary.normalizationNoiseCandidates +=
		metrics.normalizationNoiseCandidates ?? 0;
	summary.bootstrapStalls += metrics.bootstrapStalls ?? 0;

	for ( const item of metrics.topPreDecisionFamilies ?? [] ) {
		if ( ! item.family ) {
			continue;
		}
		familyCounts[ item.family ] =
			( familyCounts[ item.family ] ?? 0 ) + ( item.count ?? 0 );
	}
	for ( const item of metrics.topSemanticFamilies ?? [] ) {
		if ( ! item.family ) {
			continue;
		}
		familyCounts[ item.family ] =
			( familyCounts[ item.family ] ?? 0 ) + ( item.count ?? 0 );
	}
}

function getTriageSemanticFamily( signature ) {
	const decision = signature.analysisGate ?? signature.result;
	return canonicalizeTriageSemanticFamily(
		String(
			decision?.distinctBugType ??
				signature.equivalenceClass ??
				signature.familyKey ??
				signature.hash ??
				'unknown'
		)
			.toLowerCase()
			.replaceAll( '`', '' )
			.replaceAll( "'", '' )
			.replaceAll( '"', '' )
			.replace( /[^a-z0-9]+/g, '_' )
			.replace( /_+/g, '_' )
			.replace( /^_|_$/g, '' )
	);
}

function canonicalizeTriageSemanticFamily( value ) {
	if (
		/linebreak|newline|br.*serialization|preformatted|verse/.test( value )
	) {
		return 'linebreak_representation_drift';
	}
	if ( /cover.*overlay|isuseroverlaycolor/.test( value ) ) {
		return 'cover_overlay_attribute_canonicalization';
	}
	if ( /bootstrap|discovery.*startup|startup.*discovery/.test( value ) ) {
		return 'pre_action_bootstrap_stall';
	}
	if ( /operation.*witness.*missing|witness.*loss/.test( value ) ) {
		return 'operation_witness_missing';
	}
	return value || 'unknown';
}

function isLikelyTriageNormalizationNoise( signature ) {
	const family = getTriageSemanticFamily( signature );
	if (
		[
			'linebreak_representation_drift',
			'cover_overlay_attribute_canonicalization',
		].includes( family )
	) {
		return true;
	}

	const normalized = String( signature.normalized ?? '' );
	return (
		/(core\/code|core\/preformatted|core\/verse)/.test( normalized ) &&
		/(<br\s*\/?>|\\n|linebreak|newline)/i.test( normalized )
	);
}

function shouldHoldNoisyBlockTopOff( triageYield ) {
	if ( ! triageYield || triageYield.signatureCount === 0 ) {
		return false;
	}
	return (
		triageYield.topDuplicateFamilyShare >= TRIAGE_DUPLICATE_SHARE_HOLD &&
		triageYield.normalizationNoiseCandidates >=
			TRIAGE_NOISE_DOMINANCE_MIN_CANDIDATES &&
		triageYield.normalizationNoiseCandidates > triageYield.likelyRealVisible
	);
}

function shouldHoldDominantRealUserFamily( triageYield ) {
	if ( ! triageYield || triageYield.signatureCount === 0 ) {
		return false;
	}
	const topFamily = triageYield.topSemanticFamilies?.[ 0 ];
	if (
		! topFamily ||
		topFamily.count < TRIAGE_NOISE_DOMINANCE_MIN_CANDIDATES
	) {
		return false;
	}

	return (
		triageYield.topDuplicateFamilyShare >= TRIAGE_DUPLICATE_SHARE_HOLD &&
		/operation_witness_missing|rest_meta_database_error_wp_persisted_preferences/.test(
			topFamily.family
		)
	);
}

async function readCoverageRecords( files ) {
	const records = [];
	const nextOffsets = {};
	const stats = {
		filesRead: 0,
		linesSeen: 0,
		linesProcessed: 0,
		parseErrors: 0,
	};

	for ( const filePath of files ) {
		const text = await fs.readFile( filePath, 'utf8' ).catch( () => '' );
		const lines = text.split( '\n' );
		const previousOffset = state.fileOffsets?.[ filePath ]?.lineCount ?? 0;
		const nextOffset = Math.min( previousOffset, lines.length );
		stats.filesRead += 1;
		stats.linesSeen += lines.filter( ( line ) => line.trim() ).length;
		for ( const line of lines.slice( nextOffset ) ) {
			if ( ! line.trim() ) {
				continue;
			}
			try {
				records.push( {
					...JSON.parse( line ),
					coverageFile: filePath,
				} );
				stats.linesProcessed += 1;
			} catch {}
		}
		stats.parseErrors += Math.max(
			0,
			lines.slice( nextOffset ).filter( ( line ) => line.trim() ).length -
				records.filter( ( record ) => record.coverageFile === filePath )
					.length
		);
		nextOffsets[ filePath ] = {
			lineCount: lines.length,
			lastSeenAt: new Date().toISOString(),
		};
	}

	state.fileOffsets = nextOffsets;
	return { records, stats };
}

function featureKeysForRecord( record ) {
	const keys = new Set();
	const blockStats = record.blockStats ?? {};
	const saveCount = record.saveCheckpointSteps?.length ?? 0;
	const reloadCount = record.reloads?.length ?? 0;

	keys.add( `profile:${ record.actionProfile ?? 'unknown' }` );
	keys.add( `transport:${ record.transport ?? 'unknown' }` );
	keys.add(
		`transport-profile:${ record.transport ?? 'unknown' }:${
			record.actionProfile ?? 'unknown'
		}`
	);
	keys.add( `collaborator-mode:${ record.collaboratorMode ?? 'unknown' }` );
	keys.add( `users:${ record.userCount ?? 0 }` );
	keys.add( `initial:${ record.initialContentProfile ?? 'unknown' }` );
	keys.add( `depth:${ Math.min( blockStats.maxDepth ?? 0, 4 ) }` );
	keys.add( `save-count:${ Math.min( saveCount, 3 ) }` );
	keys.add( `reload-count:${ Math.min( reloadCount, 3 ) }` );
	keys.add(
		`revision-eligible:${ record.revisionRestore?.eligible === true }`
	);

	if ( record.actionProfile === 'real-user-editing' ) {
		const actionLabels = ( record.actions ?? [] ).map(
			( action ) => action.label
		);
		const actionSet = new Set( actionLabels );
		if (
			saveCount > 0 &&
			reloadCount > 0 &&
			( actionSet.has( 'ui-type-paragraph' ) ||
				actionSet.has( 'ui-format-paragraph' ) ||
				actionSet.has( 'ui-heading-shortcut' ) )
		) {
			keys.add( 'real-user-template:body-save-reload' );
		}
		if (
			saveCount > 0 &&
			reloadCount > 0 &&
			actionSet.has( 'ui-type-title' )
		) {
			keys.add( 'real-user-template:title-save-reload' );
		}
		if ( actionSet.has( 'ui-undo-redo-paragraph' ) ) {
			keys.add( 'real-user-template:undo-redo-canary' );
		}
		keys.add(
			`real-user-action-sequence:${ actionLabels
				.slice( 0, 6 )
				.join( '>' ) }`
		);
	}

	for ( const type of blockStats.types ?? [] ) {
		keys.add( `block:${ type }` );
	}
	for ( const action of record.actions ?? [] ) {
		keys.add( `action:${ action.label }` );
	}
	for ( let index = 1; index < ( record.actions ?? [] ).length; index++ ) {
		keys.add(
			`action-pair:${ record.actions[ index - 1 ].label }->${
				record.actions[ index ].label
			}`
		);
	}
	for ( const fault of record.faults ?? [] ) {
		keys.add( `fault:${ fault.type }:${ fault.status ?? 'delay' }` );
	}
	for ( const event of record.lifecycleEvents ?? [] ) {
		keys.add( `lifecycle:${ event.type }:users-${ event.userCount }` );
	}
	for ( const event of record.invariantEvents ?? [] ) {
		keys.add( `invariant:${ event.name }:${ event.status }` );
		if ( event.status !== 'ok' ) {
			keys.add( `invariant-signal:${ event.name }` );
		}
	}
	const operationLedger = record.operationLedger ?? {};
	keys.add( `operation-ledger-mode:${ operationLedger.mode ?? 'unknown' }` );
	if ( ( operationLedger.created ?? 0 ) > 0 ) {
		keys.add( 'operation-ledger:active' );
		keys.add(
			`operation-ledger-created:${ Math.min(
				operationLedger.created ?? 0,
				8
			) }`
		);
		keys.add(
			`operation-ledger-live:${ Math.min(
				operationLedger.live ?? 0,
				8
			) }`
		);
		keys.add(
			`operation-ledger-missing:${ Math.min(
				operationLedger.missing ?? 0,
				4
			) }`
		);
	}
	for ( const event of record.operationEvents ?? [] ) {
		const scope = event.scope ?? 'any';
		keys.add( `operation-event:${ event.status }:${ scope }` );
		if ( event.actionLabel ) {
			keys.add(
				`operation-event-action:${ event.status }:${ event.actionLabel }:${ scope }`
			);
		}
		if ( event.status === 'missing' && event.actionLabel ) {
			keys.add( `operation-missing:${ event.actionLabel }:${ scope }` );
		}
	}
	const invariantSnapshots = record.invariantSnapshots ?? [];
	if ( invariantSnapshots.length > 0 ) {
		const maxInvalidBlocks = Math.max(
			...invariantSnapshots.map(
				( snapshot ) => snapshot.invalidBlockCount ?? 0
			)
		);
		const maxSerializedLength = Math.max(
			...invariantSnapshots.map(
				( snapshot ) => snapshot.serializedContentLength ?? 0
			)
		);
		const serializedSizeBucket = Math.min(
			Math.floor( Math.log2( Math.max( maxSerializedLength, 1 ) ) ),
			20
		);
		keys.add( `invalid-blocks:${ Math.min( maxInvalidBlocks, 4 ) }` );
		keys.add( `serialized-size-log2:${ serializedSizeBucket }` );
		keys.add(
			`payload-size-profile:${
				record.actionProfile ?? 'unknown'
			}:${ serializedSizeBucket }`
		);
		keys.add(
			`payload-size-transport:${
				record.transport ?? 'unknown'
			}:${ serializedSizeBucket }`
		);
		for ( const snapshot of invariantSnapshots ) {
			for ( const [ blockType, depth ] of Object.entries(
				snapshot.maxDepthByType ?? {}
			) ) {
				keys.add(
					`block-depth:${ blockType }:${ Math.min(
						Number( depth ) || 0,
						4
					) }`
				);
			}
		}
		if (
			invariantSnapshots.some(
				( snapshot ) => snapshot.duplicateClientIds?.length > 0
			)
		) {
			keys.add( 'duplicate-client-ids' );
		}
		if (
			invariantSnapshots.some(
				( snapshot ) => ( snapshot.missingClientIdCount ?? 0 ) > 0
			)
		) {
			keys.add( 'missing-client-ids' );
		}
		if (
			invariantSnapshots.some(
				( snapshot ) => ( snapshot.malformedInnerBlockCount ?? 0 ) > 0
			)
		) {
			keys.add( 'malformed-inner-blocks' );
		}
		if (
			invariantSnapshots.some(
				( snapshot ) => ( snapshot.objectObjectStringCount ?? 0 ) > 0
			)
		) {
			keys.add( 'object-object-attribute-string' );
		}
		if (
			invariantSnapshots.some(
				( snapshot ) => snapshot.canonicalRoundTripStable === false
			)
		) {
			keys.add( 'serialization-roundtrip-changed' );
		}
		if (
			invariantSnapshots.some(
				( snapshot ) =>
					snapshot.editedMatchesSerializedCanonical === false
			)
		) {
			keys.add( 'edited-content-store-mismatch' );
		}
	}
	if ( record.cdpCoverage?.hash ) {
		keys.add( `cdp:${ record.cdpCoverage.hash }` );
	}

	return keys;
}

function summarizeNovelty( records ) {
	let newFeatureKeys = 0;
	let newCoverageHashes = 0;
	const byProfile = {};
	const byTransport = {};

	for ( const record of records ) {
		const profile = record.actionProfile ?? 'unknown';
		const transport = record.transport ?? 'unknown';
		byProfile[ profile ] ??= {
			records: 0,
			newFeatures: 0,
			failures: 0,
			cdpRecords: 0,
		};
		byProfile[ profile ].records += 1;
		byTransport[ transport ] = ( byTransport[ transport ] ?? 0 ) + 1;
		state.recordCountsByProfile[ profile ] =
			( state.recordCountsByProfile[ profile ] ?? 0 ) + 1;
		state.recordCountsByTransport[ transport ] =
			( state.recordCountsByTransport[ transport ] ?? 0 ) + 1;
		if ( record.status === 'passed' ) {
			state.successfulRecordCountsByProfile[ profile ] =
				( state.successfulRecordCountsByProfile[ profile ] ?? 0 ) + 1;
			state.successfulActionCountsByProfile[ profile ] ??= {};
			for ( const action of record.actions ?? [] ) {
				state.successfulActionCountsByProfile[ profile ][
					action.label
				] =
					( state.successfulActionCountsByProfile[ profile ][
						action.label
					] ?? 0 ) + 1;
			}
		}
		if ( record.status === 'failed' ) {
			byProfile[ profile ].failures += 1;
		}
		if ( isStartupDiscoveryFailure( record ) ) {
			state.startupFailureCountsByProfile[ profile ] =
				( state.startupFailureCountsByProfile[ profile ] ?? 0 ) + 1;
		}

		for ( const key of featureKeysForRecord( record ) ) {
			if ( ! state.featureCounts[ key ] ) {
				newFeatureKeys += 1;
				byProfile[ profile ].newFeatures += 1;
			}
			state.featureCounts[ key ] =
				( state.featureCounts[ key ] ?? 0 ) + 1;
		}

		const coverageHash = record.cdpCoverage?.hash;
		if ( coverageHash && ! state.coverageHashes[ coverageHash ] ) {
			newCoverageHashes += 1;
		}
		if ( coverageHash ) {
			byProfile[ profile ].cdpRecords += 1;
			state.coverageHashes[ coverageHash ] =
				( state.coverageHashes[ coverageHash ] ?? 0 ) + 1;
		}
	}

	const processed = records.length;
	state.recordsSeen = ( state.recordsSeen ?? 0 ) + processed;
	return {
		byProfile,
		byTransport,
		newCoverageHashes,
		newFeatureKeys,
		processed,
	};
}

function isStartupDiscoveryFailure( record ) {
	if ( record.status !== 'failed' ) {
		return false;
	}
	if ( ( record.actions?.length ?? 0 ) > 0 ) {
		return false;
	}
	if ( ( record.userCount ?? 0 ) > 0 ) {
		return false;
	}

	const errorText = [
		record.error,
		...( record.historyEvents ?? [] ).map( ( event ) => event.error ),
	]
		.filter( Boolean )
		.join( '\n' );

	return /waitForMutualDiscovery|waitForTestWebSocketAwarenessPeerCount|Target page, context or browser has been closed|Test timeout/i.test(
		errorText
	);
}

function sampleResources() {
	const load1 = os.loadavg()[ 0 ];
	const cores = os.cpus().length;
	const freeMemoryGb = os.freemem() / 1024 ** 3;
	const totalMemoryGb = os.totalmem() / 1024 ** 3;
	const memoryPressureFreePercent = sampleMacMemoryPressureFreePercent();
	const macVmStats = sampleMacVmStats();
	const macSwapUsage = sampleMacSwapUsage();
	const memoryHeadroom = classifyMemoryHeadroom( {
		freeMemoryGb,
		macSwapUsage,
		macVmStats,
		memoryPressureFreePercent,
	} );
	return {
		cores,
		freeMemoryGb,
		load1,
		macSwapUsage,
		macVmStats,
		memoryHasHeadroom: memoryHeadroom.hasHeadroom,
		memoryHeadroomReason: memoryHeadroom.reason,
		memoryPressureFreePercent,
		totalMemoryGb,
		hasHeadroom: load1 < cores * 1.25 && memoryHeadroom.hasHeadroom,
	};
}

function getCommonBlockCoverageCount() {
	return COMMON_BLOCK_TYPES.reduce(
		( total, blockName ) =>
			total + ( state.featureCounts?.[ `block:${ blockName }` ] ?? 0 ),
		0
	);
}

function getBlockGauntletCoverageCount() {
	return BLOCK_GAUNTLET_TYPES.reduce(
		( total, blockName ) =>
			total + ( state.featureCounts?.[ `block:${ blockName }` ] ?? 0 ),
		0
	);
}

function getMinBlockCoverageCount( blockTypes ) {
	if ( blockTypes.length === 0 ) {
		return 0;
	}

	return Math.min(
		...blockTypes.map(
			( blockName ) =>
				state.featureCounts?.[ `block:${ blockName }` ] ?? 0
		)
	);
}

function getUndercoveredBlockTypes( blockTypes, minCount ) {
	return blockTypes
		.map( ( blockName ) => ( {
			blockName,
			count: state.featureCounts?.[ `block:${ blockName }` ] ?? 0,
		} ) )
		.filter( ( item ) => item.count < minCount )
		.sort( ( left, right ) => left.count - right.count )
		.slice( 0, 8 );
}

function getParserTransformInitialCoverageCount() {
	return PARSER_TRANSFORM_INITIAL_PROFILES.reduce(
		( total, profileName ) =>
			total +
			( state.featureCounts?.[ `initial:${ profileName }` ] ?? 0 ),
		0
	);
}

function getCoveredBlockTypeCount( blockTypes ) {
	return blockTypes.filter(
		( blockName ) =>
			( state.featureCounts?.[ `block:${ blockName }` ] ?? 0 ) > 0
	).length;
}

function sampleMacMemoryPressureFreePercent() {
	if ( process.platform !== 'darwin' ) {
		return null;
	}

	try {
		const output = execFileSync( 'memory_pressure', {
			encoding: 'utf8',
			timeout: 10000,
		} );
		const match = output.match(
			/System-wide memory free percentage:\s*(\d+)%/
		);
		return match ? Number.parseInt( match[ 1 ], 10 ) : null;
	} catch {
		return null;
	}
}

function sampleMacVmStats() {
	if ( process.platform !== 'darwin' ) {
		return null;
	}

	try {
		const output = execFileSync( 'vm_stat', [ '-c', '6', '1' ], {
			encoding: 'utf8',
			timeout: 10000,
		} );
		return parseMacVmStatOutput( output );
	} catch {
		return null;
	}
}

function sampleMacSwapUsage() {
	if ( process.platform !== 'darwin' ) {
		return null;
	}

	try {
		const output = execFileSync( 'sysctl', [ 'vm.swapusage' ], {
			encoding: 'utf8',
			timeout: 5000,
		} );
		const match = output.match(
			/total = ([\d.]+)M\s+used = ([\d.]+)M\s+free = ([\d.]+)M/
		);
		if ( ! match ) {
			return null;
		}
		return {
			totalGb: Number.parseFloat( match[ 1 ] ) / 1024,
			usedGb: Number.parseFloat( match[ 2 ] ) / 1024,
			freeGb: Number.parseFloat( match[ 3 ] ) / 1024,
		};
	} catch {
		return null;
	}
}

function parseMacVmStatOutput( output ) {
	const pageSizeMatch = output.match( /page size of (\d+) bytes/ );
	const pageSizeBytes = pageSizeMatch
		? Number.parseInt( pageSizeMatch[ 1 ], 10 )
		: 4096;
	const lines = output
		.split( '\n' )
		.map( ( line ) => line.trim() )
		.filter( Boolean );
	const headerIndex = lines.findIndex( ( line ) =>
		/^free\s+active\s+specul\s+inactive\s+throttle\b/.test( line )
	);
	if ( headerIndex === -1 || headerIndex + 2 >= lines.length ) {
		return null;
	}

	const headers = lines[ headerIndex ].split( /\s+/ );
	const rows = lines
		.slice( headerIndex + 1 )
		.map( ( line ) => line.split( /\s+/ ) )
		.filter( ( values ) => values.length >= headers.length )
		.map( ( values ) =>
			Object.fromEntries(
				headers.map( ( header, index ) => [
					header,
					parseMacVmStatNumber( values[ index ] ),
				] )
			)
		);
	const deltaRows = rows.slice( 1 );
	if ( deltaRows.length === 0 ) {
		return null;
	}

	const averagePagesPerSecond = ( field ) =>
		deltaRows.reduce( ( total, row ) => total + ( row[ field ] ?? 0 ), 0 ) /
		deltaRows.length;
	const pagesToMbPerSecond = ( pagesPerSecond ) =>
		( pagesPerSecond * pageSizeBytes ) / 1024 ** 2;

	return {
		decompressMbPerSecond: pagesToMbPerSecond(
			averagePagesPerSecond( 'dcomprs' )
		),
		pageinMbPerSecond: pagesToMbPerSecond(
			averagePagesPerSecond( 'pageins' )
		),
		pageoutMbPerSecond: pagesToMbPerSecond(
			averagePagesPerSecond( 'pageout' )
		),
		pageSizeBytes,
		sampleCount: deltaRows.length,
		swapinMbPerSecond: pagesToMbPerSecond(
			averagePagesPerSecond( 'swapins' )
		),
		swapoutMbPerSecond: pagesToMbPerSecond(
			averagePagesPerSecond( 'swapouts' )
		),
		throttledPages: Math.max( ...rows.map( ( row ) => row.throttle ?? 0 ) ),
	};
}

function parseMacVmStatNumber( value ) {
	const match = String( value ).match( /^([\d.]+)([KMG])?$/i );
	if ( ! match ) {
		return 0;
	}

	const number = Number.parseFloat( match[ 1 ] );
	const suffix = match[ 2 ]?.toUpperCase();
	if ( suffix === 'K' ) {
		return number * 1000;
	}
	if ( suffix === 'M' ) {
		return number * 1000 * 1000;
	}
	if ( suffix === 'G' ) {
		return number * 1000 * 1000 * 1000;
	}
	return number;
}

function classifyMemoryHeadroom( {
	freeMemoryGb,
	macSwapUsage,
	macVmStats,
	memoryPressureFreePercent,
} ) {
	if ( macVmStats ) {
		const blockers = [];
		if (
			memoryPressureFreePercent !== null &&
			memoryPressureFreePercent < MAC_MEMORY_PRESSURE_MIN_FREE_PERCENT
		) {
			blockers.push(
				`memory_pressure free ${ memoryPressureFreePercent }% < ${ MAC_MEMORY_PRESSURE_MIN_FREE_PERCENT }%`
			);
		}
		if ( freeMemoryGb < BROWSER_FREE_MEMORY_MIN_GB ) {
			blockers.push(
				`free memory ${ freeMemoryGb.toFixed(
					2
				) }G < ${ BROWSER_FREE_MEMORY_MIN_GB }G`
			);
		}
		if ( macVmStats.throttledPages > 0 ) {
			blockers.push(
				`vm_stat reports ${ macVmStats.throttledPages } throttled pages`
			);
		}
		if ( macVmStats.swapoutMbPerSecond >= MAC_SWAPOUT_HOLD_MBPS ) {
			blockers.push(
				`swapout ${ macVmStats.swapoutMbPerSecond.toFixed(
					2
				) } MB/s >= ${ MAC_SWAPOUT_HOLD_MBPS } MB/s`
			);
		}
		if ( macVmStats.pageoutMbPerSecond >= MAC_PAGEOUT_HOLD_MBPS ) {
			blockers.push(
				`pageout ${ macVmStats.pageoutMbPerSecond.toFixed(
					2
				) } MB/s >= ${ MAC_PAGEOUT_HOLD_MBPS } MB/s`
			);
		}
		if ( macVmStats.decompressMbPerSecond >= MAC_DECOMPRESS_HOLD_MBPS ) {
			blockers.push(
				`decompress ${ macVmStats.decompressMbPerSecond.toFixed(
					2
				) } MB/s >= ${ MAC_DECOMPRESS_HOLD_MBPS } MB/s`
			);
		}
		if (
			macSwapUsage &&
			macSwapUsage.freeGb < MAC_SWAP_FREE_MIN_GB &&
			macVmStats.swapoutMbPerSecond > 0
		) {
			blockers.push(
				`swap free ${ macSwapUsage.freeGb.toFixed(
					2
				) }G < ${ MAC_SWAP_FREE_MIN_GB }G while swapout is active`
			);
		}

		return {
			hasHeadroom: blockers.length === 0,
			reason: blockers.length ? blockers.join( '; ' ) : 'mac-vm-rates-ok',
		};
	}

	const memoryHasHeadroom =
		freeMemoryGb > 3 &&
		( memoryPressureFreePercent === null ||
			memoryPressureFreePercent >= 20 );
	return {
		hasHeadroom: memoryHasHeadroom,
		reason: memoryHasHeadroom
			? 'fallback-free-memory-ok'
			: 'fallback-free-memory-low',
	};
}

function hasRecentStartupFailurePause( group ) {
	const cutoff = Date.now() - STARTUP_FAILURE_COOLDOWN_HOURS * 60 * 60 * 1000;

	return ( state.changes ?? [] ).some( ( change ) => {
		if (
			change.action !== 'pause-group' ||
			change.group !== group ||
			! /pre-action .*startup|startup failures/i.test(
				change.reason ?? ''
			)
		) {
			return false;
		}

		const timestamp = Date.parse( change.at );
		return Number.isFinite( timestamp ) && timestamp >= cutoff;
	} );
}

function buildGroup( profile ) {
	const transport = profile.transport ?? 'ws';
	const transportEnv =
		transport === 'ws'
			? {
					GUTENBERG_RTC_TEST_WS_PROVIDER: '1',
					GUTENBERG_RTC_TEST_WS_PORT: WS_PORT,
					GUTENBERG_RTC_TEST_WS_URL: `ws://127.0.0.1:${ WS_PORT }`,
			  }
			: {
					GUTENBERG_RTC_TEST_WS_PROVIDER: '0',
			  };

	return {
		name: profile.name,
		repoRoot: REPO_ROOT,
		transport,
		lanes: 1,
		startSeed: profile.startSeed,
		stepCount: profile.stepCount,
		...( transport === 'ws'
			? { wsPort: Number.parseInt( WS_PORT, 10 ) }
			: {} ),
		env: {
			WP_ENV_PORT,
			WP_BASE_URL: BASE_URL,
			RTC_FUZZ_BASE_URL: BASE_URL,
			RTC_FUZZ_ANALYSIS_RECHECKS: '1',
			RTC_FUZZ_BOOTSTRAP_STALL_RECHECKS: '0',
			...transportEnv,
			...( transport === 'ws' ? NO_FAULT_WS_ENV : {} ),
			GUTENBERG_RTC_BROWSER_ACTION_PROFILE: profile.actionProfile,
			GUTENBERG_RTC_BROWSER_COLLECT_CDP_COVERAGE:
				profile.collectCdpCoverage ? '1' : '0',
			...profile.env,
		},
	};
}

async function applyPolicy( novelty, resources, triageYield ) {
	const enabled = new Set( state.enabledGroups );
	const lifecycleEnabled = enabled.has( 'novelty-ws-lifecycle' );
	const persistenceNoTitleEnabled = enabled.has(
		'novelty-ws-persistence-no-title'
	);
	const revisionPersistenceEnabled = enabled.has(
		'novelty-ws-revision-persistence'
	);
	const threeUserLateJoinEnabled = enabled.has(
		'novelty-ws-three-user-late-join'
	);
	const sameUserLifecycleEnabled = enabled.has(
		'novelty-ws-same-user-lifecycle'
	);
	const parserSerializationEnabled = enabled.has(
		'novelty-ws-parser-serialization'
	);
	const parserTransformEnabled = enabled.has( 'novelty-ws-parser-transform' );
	const realUserEditingEnabled = enabled.has(
		'novelty-ws-real-user-editing'
	);
	const multiReloadLifecycleEnabled = enabled.has(
		'novelty-ws-multi-reload-lifecycle'
	);
	const httpProbeEnabled = enabled.has( 'novelty-http-persistence-probe' );
	const commonBlockRecords =
		state.recordCountsByProfile?.[ 'common-blocks' ] ??
		novelty.byProfile[ 'common-blocks' ]?.records ??
		0;
	const commonBlockMinCount = getMinBlockCoverageCount( COMMON_BLOCK_TYPES );
	const commonBlocksComplete =
		commonBlockRecords >= 100 &&
		commonBlockMinCount >= COMMON_BLOCK_MIN_RECORDS;
	const blockGauntletRecords =
		state.recordCountsByProfile?.[ 'block-gauntlet' ] ??
		novelty.byProfile[ 'block-gauntlet' ]?.records ??
		0;
	const blockGauntletMinCount =
		getMinBlockCoverageCount( BLOCK_GAUNTLET_TYPES );
	const blockGauntletCoveredTypeCount =
		getCoveredBlockTypeCount( BLOCK_GAUNTLET_TYPES );
	const blockGauntletComplete =
		blockGauntletRecords >= 100 &&
		blockGauntletCoveredTypeCount === BLOCK_GAUNTLET_TYPES.length &&
		blockGauntletMinCount >= BLOCK_GAUNTLET_MIN_RECORDS;
	const structureRecords =
		state.recordCountsByProfile?.structure ??
		novelty.byProfile.structure?.records ??
		0;
	const lifecycleRecords =
		state.recordCountsByProfile?.[ 'session-lifecycle' ] ??
		novelty.byProfile[ 'session-lifecycle' ]?.records ??
		0;
	const persistenceNoTitleRecords =
		state.recordCountsByProfile?.[ 'persistence-no-title' ] ??
		novelty.byProfile[ 'persistence-no-title' ]?.records ??
		0;
	const parserRecords =
		state.recordCountsByProfile?.[ 'parser-serialization' ] ??
		novelty.byProfile[ 'parser-serialization' ]?.records ??
		0;
	const parserTransformRecords =
		state.recordCountsByProfile?.[ 'parser-transform' ] ??
		novelty.byProfile[ 'parser-transform' ]?.records ??
		0;
	const parserTransformInitialCoverageCount =
		getParserTransformInitialCoverageCount();
	const parserTransformSaturated =
		parserTransformRecords >= PARSER_TRANSFORM_ROTATE_RECORDS &&
		parserTransformInitialCoverageCount >=
			PARSER_TRANSFORM_ROTATE_INITIAL_RECORDS;
	const realUserEditingRecords =
		state.successfulRecordCountsByProfile?.[ 'real-user-editing' ] ?? 0;
	const realUserEditingActionCounts =
		state.successfulActionCountsByProfile?.[ 'real-user-editing' ] ?? {};
	const realUserEditingMinActionRecords = Math.min(
		...REAL_USER_EDITING_ACTION_LABELS.map(
			( label ) => realUserEditingActionCounts[ label ] ?? 0
		)
	);
	const realUserEditingNeedsCoverage =
		realUserEditingRecords < REAL_USER_EDITING_MIN_RECORDS ||
		realUserEditingMinActionRecords <
			REAL_USER_EDITING_MIN_ACTION_RECORDS ||
		( ( triageYield?.likelyRealVisible ?? 0 ) === 0 &&
			realUserEditingRecords < REAL_USER_EDITING_NO_YIELD_MIN_RECORDS );
	const holdNoisyBlockTopOff = shouldHoldNoisyBlockTopOff( triageYield );
	const holdDominantRealUserFamilyActive =
		shouldHoldDominantRealUserFamily( triageYield );
	const lateJoin3Records =
		state.featureCounts?.[ 'lifecycle:late-join:users-3' ] ?? 0;
	const sameUserRecords =
		state.featureCounts?.[ 'collaborator-mode:same-user' ] ?? 0;
	const reload2Records = state.featureCounts?.[ 'reload-count:2' ] ?? 0;
	const revisionEligibleRecords =
		state.featureCounts?.[ 'revision-eligible:true' ] ?? 0;

	function canRotateAwayFromGroup( group ) {
		switch ( group ) {
			case 'novelty-ws-block-gauntlet':
				return blockGauntletComplete;
			case 'novelty-ws-common-blocks':
				return commonBlocksComplete;
			case 'novelty-ws-parser-serialization':
				return parserRecords >= 50;
			case 'novelty-ws-parser-transform':
				return (
					parserTransformRecords >= 100 &&
					parserTransformInitialCoverageCount >= 100
				);
			case 'novelty-ws-real-user-editing':
				return ! realUserEditingNeedsCoverage;
			case 'novelty-ws-revision-persistence':
				return revisionEligibleRecords >= 500;
			case 'novelty-ws-three-user-late-join':
				return lateJoin3Records >= LATE_JOIN_LIFECYCLE_MIN_RECORDS;
			case 'novelty-ws-multi-reload-lifecycle':
				return reload2Records >= 100;
			case 'novelty-ws-same-user-lifecycle':
				return sameUserRecords >= 150;
			default:
				return false;
		}
	}

	async function pauseRotationCandidate( group, reason ) {
		if ( enabled.size < TARGET_ENABLED_GROUPS ) {
			return true;
		}

		const candidates = [
			...ROTATION_PAUSE_ORDER,
			...HIGH_VALUE_EXPANSION_GROUPS.filter( canRotateAwayFromGroup ),
		];

		for ( const candidate of candidates ) {
			if ( candidate === group || ! enabled.has( candidate ) ) {
				continue;
			}

			await pauseGroup(
				candidate,
				`rotating browser budget to ${ group }: ${ reason }`
			);
			return true;
		}

		return false;
	}

	async function enableGroup(
		group,
		reason,
		{ allowRotation = false, budgetReserved = false } = {}
	) {
		if ( state.disabledGroups?.[ group ] ) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'keep-disabled-group',
				group,
				reason: state.disabledGroups[ group ].reason ?? reason,
			} );
			return false;
		}

		if ( enabled.has( group ) ) {
			return false;
		}

		if ( state.pausedGroups?.[ group ] && ! allowRotation ) {
			return false;
		}

		const profile = PROFILE_BY_GROUP[ group ];
		const startupFailures =
			profile === undefined
				? 0
				: state.startupFailureCountsByProfile?.[ profile ] ?? 0;
		if (
			state.pausedGroups?.[ group ] &&
			( startupFailures >= STARTUP_FAILURE_LIMIT ||
				hasRecentStartupFailurePause( group ) )
		) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'keep-paused-startup-failures',
				group,
				profile,
				reason: `profile ${ profile } is still inside the pre-action startup failure cooldown`,
			} );
			return false;
		}

		if (
			allowRotation &&
			! budgetReserved &&
			! ( await pauseRotationCandidate( group, reason ) )
		) {
			return false;
		}

		if (
			enabled.size >= MAX_ENABLED_GROUPS ||
			( enabled.size >= TARGET_ENABLED_GROUPS &&
				! resources.hasHeadroom &&
				! allowRotation &&
				! budgetReserved )
		) {
			return false;
		}

		if ( state.pausedGroups?.[ group ] ) {
			delete state.pausedGroups[ group ];
			if ( profile ) {
				delete state.startupFailureCountsByProfile[ profile ];
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'reset-startup-failure-budget',
					group,
					profile,
					reason,
				} );
			}
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'unpause-group',
				group,
				reason,
			} );
		}

		enabled.add( group );
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'enable-group',
			group,
			reason,
		} );
		await log( `Enabled ${ group } group.` );
		return true;
	}

	async function pauseGroup( group, reason ) {
		if ( ! enabled.has( group ) ) {
			return false;
		}

		enabled.delete( group );
		state.pausedGroups[ group ] = {
			at: new Date().toISOString(),
			reason,
		};
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'pause-group',
			group,
			reason,
		} );
		await log( `Paused ${ group } group: ${ reason }` );
		await terminateGroupLanes( group, reason );
		return true;
	}

	async function reserveBudgetForParserTransform( reason ) {
		if ( resources.hasHeadroom || enabled.size < TARGET_ENABLED_GROUPS ) {
			return true;
		}

		for ( const candidate of [
			'novelty-ws-multi-reload-lifecycle',
			'novelty-ws-three-user-late-join',
			'novelty-ws-revision-persistence',
			'novelty-ws-common-blocks',
		] ) {
			if ( ! enabled.has( candidate ) ) {
				continue;
			}

			await pauseGroup(
				candidate,
				`rotating browser budget to novelty-ws-parser-transform: ${ reason }`
			);
			return true;
		}

		return false;
	}

	const hasSpareBrowserBudget = () =>
		resources.hasHeadroom &&
		enabled.size <
			Math.min( MAX_ENABLED_GROUPS, TARGET_ENABLED_GROUPS + 1 );

	if ( realUserEditingEnabled && holdDominantRealUserFamilyActive ) {
		await pauseGroup(
			'novelty-ws-real-user-editing',
			`real-user lane is dominated by ${ triageYield.topSemanticFamilies[ 0 ].family } (${ triageYield.topSemanticFamilies[ 0 ].count } signatures, share=${ triageYield.topDuplicateFamilyShare }); pause until the family is analyzed or the lane config changes`
		);
	} else if (
		realUserEditingNeedsCoverage &&
		! realUserEditingEnabled &&
		! holdDominantRealUserFamilyActive
	) {
		await enableGroup(
			'novelty-ws-real-user-editing',
			`real-user keyboard editing coverage/yield is low: ${ realUserEditingRecords } / ${ REAL_USER_EDITING_MIN_RECORDS } successful records, min action count ${ realUserEditingMinActionRecords } / ${ REAL_USER_EDITING_MIN_ACTION_RECORDS }, visible likely-real ${
				triageYield?.likelyRealVisible ?? 0
			}; exercise a body-save-reload UI schedule with paragraph typing, formatting, heading shortcuts, and post-reload edits`,
			{ allowRotation: true }
		);
	}

	if (
		parserTransformEnabled &&
		parserTransformSaturated &&
		enabled.size >= TARGET_ENABLED_GROUPS &&
		( sameUserRecords < 150 || ! httpProbeEnabled )
	) {
		await pauseGroup(
			'novelty-ws-parser-transform',
			`parser-transform surface is saturated (${ parserTransformRecords } records, ${ parserTransformInitialCoverageCount } parser initial-profile hits); rotate budget to lower-noise same-user/HTTP canaries`
		);
	}

	if (
		hasSpareBrowserBudget() &&
		! realUserEditingNeedsCoverage &&
		! holdNoisyBlockTopOff &&
		! enabled.has( 'novelty-ws-block-gauntlet' ) &&
		! blockGauntletComplete
	) {
		const reason = `block-library gauntlet per-block coverage is low: min=${ blockGauntletMinCount } target=${ BLOCK_GAUNTLET_MIN_RECORDS }`;
		await enableGroup( 'novelty-ws-block-gauntlet', reason );
	}

	if (
		hasSpareBrowserBudget() &&
		! realUserEditingNeedsCoverage &&
		! holdNoisyBlockTopOff &&
		! enabled.has( 'novelty-ws-common-blocks' ) &&
		! enabled.has( 'novelty-ws-block-gauntlet' ) &&
		! commonBlocksComplete
	) {
		await enableGroup(
			'novelty-ws-common-blocks',
			`common block per-block coverage is low: min=${ commonBlockMinCount } target=${ COMMON_BLOCK_MIN_RECORDS }`
		);
	}

	if (
		enabled.size >
			Math.min( MAX_ENABLED_GROUPS, TARGET_ENABLED_GROUPS + 1 ) &&
		enabled.has( 'novelty-ws-block-gauntlet' ) &&
		enabled.has( 'novelty-ws-common-blocks' )
	) {
		await pauseGroup(
			'novelty-ws-common-blocks',
			'spare-slot guard: block-gauntlet and common-block top-offs were both enabled; keep only the thinner block-gauntlet lane'
		);
	}

	if ( holdNoisyBlockTopOff ) {
		for ( const group of [
			'novelty-ws-common-blocks',
			'novelty-ws-block-gauntlet',
		] ) {
			if ( ! enabled.has( group ) ) {
				continue;
			}
			await pauseGroup(
				group,
				`triage yield is duplicate/noise dominated: top family share ${ triageYield.topDuplicateFamilyShare }, normalization noise candidates ${ triageYield.normalizationNoiseCandidates }, visible likely-real ${ triageYield.likelyRealVisible }`
			);
		}
	}

	if (
		! parserTransformEnabled &&
		( parserTransformRecords < 75 ||
			parserTransformInitialCoverageCount < 75 )
	) {
		const reason =
			'parser transform coverage is low: HTML references, deprecations, built-in validation fixes, equivalent HTML, and code-editor reparse need focused coverage';
		const budgetReserved = await reserveBudgetForParserTransform( reason );
		await enableGroup( 'novelty-ws-parser-transform', reason, {
			budgetReserved,
		} );
	}

	if (
		! lifecycleEnabled &&
		resources.hasHeadroom &&
		state.recordsSeen > 0 &&
		structureRecords >= 10
	) {
		await enableGroup(
			'novelty-ws-lifecycle',
			'structure profile has enough coverage or low novelty; add late-join/reload lifecycle coverage'
		);
	}

	if (
		! persistenceNoTitleEnabled &&
		resources.hasHeadroom &&
		lifecycleEnabled &&
		lifecycleRecords >= 50
	) {
		await enableGroup(
			'novelty-ws-persistence-no-title',
			'structure and lifecycle profiles have plateaued with headroom; add websocket persistence-no-title coverage'
		);
	}

	if (
		! parserSerializationEnabled &&
		structureRecords >= 50 &&
		parserRecords < 50
	) {
		await enableGroup(
			'novelty-ws-parser-serialization',
			'parser and block-serialization stress coverage is low; enable parser-stress actions without injected faults',
			{ allowRotation: true }
		);
	}

	if (
		! revisionPersistenceEnabled &&
		persistenceNoTitleRecords >= 1 &&
		revisionEligibleRecords < 500
	) {
		await enableGroup(
			'novelty-ws-revision-persistence',
			'revision-restore coverage is low; add focused save/reload/browser revision restore coverage',
			{ allowRotation: true }
		);
	}

	if (
		! threeUserLateJoinEnabled &&
		lateJoin3Records < LATE_JOIN_LIFECYCLE_MIN_RECORDS
	) {
		await enableGroup(
			'novelty-ws-three-user-late-join',
			'three-user late-join coverage is low; force a real late join early in the seed',
			{ allowRotation: true }
		);
	}

	if (
		ENABLE_SAME_USER_PROBE &&
		! sameUserLifecycleEnabled &&
		sameUserRecords < 150 &&
		lateJoin3Records >= SAME_USER_CANARY_LATE_JOIN_MIN_RECORDS
	) {
		if ( threeUserLateJoinEnabled ) {
			await pauseGroup(
				'novelty-ws-three-user-late-join',
				`late-join coverage reached same-user canary threshold ${ lateJoin3Records }; hand off browser slot to same-user lifecycle`
			);
		}
		await enableGroup(
			'novelty-ws-same-user-lifecycle',
			'same-user browser lifecycle coverage is absent; exercise two tabs under the same account'
		);
	}

	if (
		! multiReloadLifecycleEnabled &&
		lifecycleRecords >= 50 &&
		reload2Records < 100
	) {
		await enableGroup(
			'novelty-ws-multi-reload-lifecycle',
			'multi-reload lifecycle coverage is low; add two reload checkpoints in one seed',
			{ allowRotation: true }
		);
	}

	if (
		! httpProbeEnabled &&
		ENABLE_HTTP_PROBE &&
		( resources.hasHeadroom || parserTransformSaturated ) &&
		enabled.size < Math.min( MAX_ENABLED_GROUPS, TARGET_ENABLED_GROUPS + 1 )
	) {
		await enableGroup(
			'novelty-http-persistence-probe',
			'HTTP persistence canary is absent; run a low-fault persistence lane to keep transport coverage mixed'
		);
	}

	if ( PAUSE_ON_STARTUP_FAILURE ) {
		const pauseOrder = [
			[ 'novelty-ws-block-gauntlet', 'block-gauntlet' ],
			[ 'novelty-ws-common-blocks', 'common-blocks' ],
			[ 'novelty-ws-parser-serialization', 'parser-serialization' ],
			[ 'novelty-ws-parser-transform', 'parser-transform' ],
			[ 'novelty-ws-real-user-editing', 'real-user-editing' ],
			[ 'novelty-ws-multi-reload-lifecycle', 'multi-reload-lifecycle' ],
			[ 'novelty-ws-three-user-late-join', 'three-user-late-join' ],
			[ 'novelty-ws-same-user-lifecycle', 'session-lifecycle' ],
			[ 'novelty-ws-revision-persistence', 'revision-persistence' ],
		];

		for ( const [ group, profile ] of pauseOrder ) {
			const startupFailures =
				state.startupFailureCountsByProfile?.[ profile ] ?? 0;
			if (
				startupFailures >= STARTUP_FAILURE_LIMIT ||
				hasRecentStartupFailurePause( group )
			) {
				await pauseGroup(
					group,
					startupFailures >= STARTUP_FAILURE_LIMIT
						? `profile ${ profile } produced ${ startupFailures } pre-action WS discovery/startup failures`
						: `profile ${ profile } is inside the pre-action WS discovery/startup failure cooldown`
				);
			}
		}

		if ( ! resources.hasHeadroom && enabled.size > 5 ) {
			for ( const [ group, profile ] of pauseOrder.slice( 0, 2 ) ) {
				if (
					enabled.size <= 5 ||
					( state.startupFailureCountsByProfile?.[ profile ] ??
						0 ) === 0
				) {
					continue;
				}
				await pauseGroup(
					group,
					`temporary resource guard: no headroom and profile ${ profile } already hit a pre-action startup failure`
				);
			}
		}
	}

	for ( const disabledGroup of Object.keys( state.disabledGroups ?? {} ) ) {
		enabled.delete( disabledGroup );
	}
	state.enabledGroups = [ ...enabled ];
	const groups = PROFILE_GROUPS.filter( ( profile ) =>
		enabled.has( profile.name )
	).map( buildGroup );
	await writeJsonFileAtomic( GROUPS_PATH, groups );
}

async function terminateGroupLanes( groupName, reason ) {
	const supervisorState = await readJsonFile(
		path.join( OUTPUT_DIR, 'supervisor-state.json' )
	);
	const groupState = ( supervisorState?.groups ?? [] ).find(
		( group ) => group.name === groupName
	);
	const runDirs = [
		...( groupState?.activeRunDirs ?? [] ),
		groupState?.currentRunDir,
	].filter( Boolean );
	const terminated = [];

	for ( const runDir of new Set( runDirs ) ) {
		const manifest = await readJsonFile(
			path.join( runDir, 'lanes.json' )
		);
		for ( const lane of manifest?.lanes ?? [] ) {
			if ( ! lane.pid ) {
				continue;
			}
			const killedPids = terminatePidTree( lane.pid );
			if ( killedPids.length ) {
				terminated.push( {
					pid: lane.pid,
					runDir,
					lane: lane.laneLabel,
					killedPids,
				} );
			}
		}
	}

	if ( terminated.length ) {
		const killedCount = terminated.reduce(
			( count, item ) => count + item.killedPids.length,
			0
		);
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'terminate-paused-group-lanes',
			group: groupName,
			reason,
			count: killedCount,
		} );
		await log(
			`Terminated ${ killedCount } process(es) for paused group ${ groupName }.`
		);
	}
}

function terminatePidTree( rootPid ) {
	const pids = [ ...collectDescendantPids( rootPid ).reverse(), rootPid ];
	const killed = [];

	for ( const pid of pids ) {
		try {
			process.kill( pid, 'SIGTERM' );
			killed.push( pid );
		} catch {}
	}

	setTimeout( () => {
		for ( const pid of pids ) {
			try {
				process.kill( pid, 'SIGKILL' );
			} catch {}
		}
	}, 5000 ).unref();

	return killed;
}

function collectDescendantPids( pid, seen = new Set() ) {
	if ( seen.has( pid ) ) {
		return [];
	}
	seen.add( pid );

	let childPids = [];
	try {
		childPids = execFileSync( 'pgrep', [ '-P', String( pid ) ], {
			encoding: 'utf8',
			timeout: 5000,
		} )
			.split( '\n' )
			.map( ( value ) => Number.parseInt( value, 10 ) )
			.filter( Number.isFinite );
	} catch {
		return [];
	}

	return childPids.flatMap( ( childPid ) => [
		childPid,
		...collectDescendantPids( childPid, seen ),
	] );
}

function tmuxHasSession( sessionName ) {
	try {
		execFileSync( 'tmux', [ 'has-session', '-t', sessionName ], {
			stdio: 'ignore',
		} );
		return true;
	} catch {
		return false;
	}
}

async function ensureSupervisor( resources ) {
	if ( tmuxHasSession( SUPERVISOR_SESSION ) ) {
		return;
	}
	if ( ! FORCE_START && ! resources.hasHeadroom ) {
		await log(
			`holding supervisor start until resources recover: load1=${ resources.load1.toFixed(
				2
			) }, cores=${
				resources.cores
			}, memory=${ formatMemoryHeadroomSummary( resources ) }`
		);
		return;
	}

	const command = [
		`cd ${ shellQuote( REPO_ROOT ) }`,
		`export RTC_FUZZ_SUPERVISOR_OUTPUT_DIR=${ shellQuote( OUTPUT_DIR ) }`,
		`export RTC_FUZZ_SUPERVISOR_GROUPS_PATH=${ shellQuote( GROUPS_PATH ) }`,
		`export RTC_FUZZ_SUPERVISOR_DURATION_HOURS=${ shellQuote(
			String( Math.max( 0.1, ( END_AT - Date.now() ) / 3600000 ) )
		) }`,
		'export RTC_FUZZ_SUPERVISOR_POLL_MS=60000',
		`${ shellQuote(
			process.execPath
		) } bin/rtc-browser-fuzz-supervisor.mjs`,
	].join( '; ' );

	spawn( 'tmux', [ 'new-session', '-d', '-s', SUPERVISOR_SESSION, command ], {
		cwd: REPO_ROOT,
		stdio: 'ignore',
	} ).unref();
	state.changes.push( {
		at: new Date().toISOString(),
		action: 'start-supervisor',
		session: SUPERVISOR_SESSION,
	} );
	await log( `Started supervisor tmux session ${ SUPERVISOR_SESSION }.` );
}

function shellQuote( value ) {
	return `'${ String( value ).replaceAll( "'", `'\\''` ) }'`;
}

function formatMemoryHeadroomSummary( resources ) {
	return [
		`${ resources.freeMemoryGb.toFixed( 1 ) }G unused`,
		`pressure=${
			resources.memoryPressureFreePercent === null
				? 'n/a'
				: `${ resources.memoryPressureFreePercent }%`
		}`,
		formatMacVmStats( resources.macVmStats ),
		formatMacSwapUsage( resources.macSwapUsage ),
		`reason=${ resources.memoryHeadroomReason }`,
	].join( ', ' );
}

function formatMacVmStats( macVmStats ) {
	if ( ! macVmStats ) {
		return 'n/a';
	}

	return [
		`swapout=${ macVmStats.swapoutMbPerSecond.toFixed( 2 ) } MB/s`,
		`pageout=${ macVmStats.pageoutMbPerSecond.toFixed( 2 ) } MB/s`,
		`decompress=${ macVmStats.decompressMbPerSecond.toFixed( 2 ) } MB/s`,
		`throttled=${ macVmStats.throttledPages } pages`,
	].join( ', ' );
}

function formatMacSwapUsage( macSwapUsage ) {
	if ( ! macSwapUsage ) {
		return 'n/a';
	}

	return `${ macSwapUsage.usedGb.toFixed(
		1
	) }G used / ${ macSwapUsage.freeGb.toFixed( 1 ) }G free`;
}

function evaluateHealth( groups, coverageFiles, triageYield, supervisorState ) {
	const warnings = [];
	const enabledProfiles = new Set(
		( groups ?? [] )
			.map(
				( group ) =>
					group.env?.GUTENBERG_RTC_BROWSER_ACTION_PROFILE ??
					group.actionProfile
			)
			.filter( Boolean )
	);
	const cdpProfiles = new Set(
		( groups ?? [] )
			.filter(
				( group ) =>
					group.env?.GUTENBERG_RTC_BROWSER_COLLECT_CDP_COVERAGE ===
					'1'
			)
			.map(
				( group ) =>
					group.env?.GUTENBERG_RTC_BROWSER_ACTION_PROFILE ??
					group.actionProfile
			)
			.filter( Boolean )
	);
	const outputDirCoverageFiles = coverageFiles.filter( ( filePath ) =>
		filePath.startsWith( OUTPUT_DIR + path.sep )
	);

	if ( outputDirCoverageFiles.length === 0 ) {
		warnings.push(
			`no behavioral coverage files found under novelty output dir ${ OUTPUT_DIR }`
		);
	}

	for ( const profile of enabledProfiles ) {
		const seen = state.recordCountsByProfile?.[ profile ] ?? 0;
		if ( state.recordsSeen > 0 && seen === 0 ) {
			warnings.push(
				`enabled profile "${ profile }" has produced 0 ingested behavioral records`
			);
		}
	}

	for ( const profile of cdpProfiles ) {
		const seen = state.recordCountsByProfile?.[ profile ] ?? 0;
		const cdpTotal = Object.values( state.coverageHashes ?? {} ).reduce(
			( total, count ) => total + count,
			0
		);
		if ( seen >= 10 && cdpTotal === 0 ) {
			warnings.push(
				`profile "${ profile }" requested CDP coverage but no CDP hashes have been ingested`
			);
		}
	}

	if ( shouldHoldNoisyBlockTopOff( triageYield ) ) {
		warnings.push(
			`triage yield is duplicate/noise dominated: top family share ${ triageYield.topDuplicateFamilyShare }, normalization noise candidates ${ triageYield.normalizationNoiseCandidates }, visible likely-real ${ triageYield.likelyRealVisible }`
		);
	}

	for ( const group of supervisorState?.groups ?? [] ) {
		for ( const warning of group.seedOverlapWarnings ?? [] ) {
			warnings.push(
				`active seed overlap in ${ group.name }: ${ warning.left } overlaps ${ warning.right }`
			);
		}
	}

	state.healthWarnings = warnings;
	return warnings;
}

async function writeStatus(
	novelty,
	resources,
	coverageFiles,
	coverageStats,
	triageYield
) {
	const groups = await readJsonFile( GROUPS_PATH );
	const healthWarnings = state.healthWarnings ?? [];
	const undercoveredCommonBlocks = getUndercoveredBlockTypes(
		COMMON_BLOCK_TYPES,
		COMMON_BLOCK_MIN_RECORDS
	);
	const undercoveredBlockGauntlet = getUndercoveredBlockTypes(
		BLOCK_GAUNTLET_TYPES,
		BLOCK_GAUNTLET_MIN_RECORDS
	);
	const lines = [
		'# RTC Novelty Monitor',
		'',
		`Updated: ${ new Date().toISOString() }`,
		`Output dir: ${ OUTPUT_DIR }`,
		`Supervisor session: ${ SUPERVISOR_SESSION }`,
		`Groups path: ${ GROUPS_PATH }`,
		'',
		'## Resource Snapshot',
		`- load1: ${ resources.load1.toFixed( 2 ) } / cores: ${
			resources.cores
		}`,
		`- memory: ${ resources.freeMemoryGb.toFixed(
			1
		) }G free / ${ resources.totalMemoryGb.toFixed( 1 ) }G total`,
		`- memory pressure free: ${
			resources.memoryPressureFreePercent === null
				? 'n/a'
				: `${ resources.memoryPressureFreePercent }%`
		}`,
		`- memory VM rates: ${ formatMacVmStats( resources.macVmStats ) }`,
		`- swap usage: ${ formatMacSwapUsage( resources.macSwapUsage ) }`,
		`- memory headroom reason: ${ resources.memoryHeadroomReason }`,
		`- headroom for adding groups: ${
			resources.hasHeadroom ? 'yes' : 'no'
		}`,
		'',
		'## Coverage Intake',
		`- coverage files: ${ coverageFiles.length }`,
		`- total records seen: ${ state.recordsSeen }`,
		`- records processed this pass: ${ novelty.processed }`,
		`- files read this pass: ${ coverageStats.filesRead }`,
		`- coverage lines seen this pass: ${ coverageStats.linesSeen }`,
		`- new behavioral feature keys this pass: ${ novelty.newFeatureKeys }`,
		`- new CDP coverage hashes this pass: ${ novelty.newCoverageHashes }`,
		`- all-time records by profile: ${ JSON.stringify(
			state.recordCountsByProfile ?? {}
		) }`,
		`- successful records by profile: ${ JSON.stringify(
			state.successfulRecordCountsByProfile ?? {}
		) }`,
		`- all-time records by transport: ${ JSON.stringify(
			state.recordCountsByTransport ?? {}
		) }`,
		`- pre-action startup failures by profile: ${ JSON.stringify(
			state.startupFailureCountsByProfile ?? {}
		) }`,
		`- common-block aggregate coverage: ${ getCommonBlockCoverageCount() }`,
		`- common-block min coverage: ${ getMinBlockCoverageCount(
			COMMON_BLOCK_TYPES
		) } / ${ COMMON_BLOCK_MIN_RECORDS }`,
		`- common-block undercovered: ${ JSON.stringify(
			undercoveredCommonBlocks
		) }`,
		`- block-gauntlet aggregate coverage: ${ getBlockGauntletCoverageCount() }`,
		`- block-gauntlet min coverage: ${ getMinBlockCoverageCount(
			BLOCK_GAUNTLET_TYPES
		) } / ${ BLOCK_GAUNTLET_MIN_RECORDS }`,
		`- block-gauntlet undercovered: ${ JSON.stringify(
			undercoveredBlockGauntlet
		) }`,
		`- late-join lifecycle records: ${
			state.featureCounts?.[ 'lifecycle:late-join:users-3' ] ?? 0
		} / ${ LATE_JOIN_LIFECYCLE_MIN_RECORDS }`,
		`- same-user records: ${
			state.featureCounts?.[ 'collaborator-mode:same-user' ] ?? 0
		}`,
		`- real-user editing successful records: ${
			state.successfulRecordCountsByProfile?.[ 'real-user-editing' ] ?? 0
		} / ${ REAL_USER_EDITING_MIN_RECORDS }`,
		`- real-user editing successful action counts: ${ JSON.stringify(
			state.successfulActionCountsByProfile?.[ 'real-user-editing' ] ?? {}
		) }`,
		'',
		'## Triage Yield',
		`- triage state files: ${ triageYield.files }`,
		`- signatures: ${ triageYield.signatureCount }`,
		`- likely-real visible: ${ triageYield.likelyRealVisible }`,
		`- likely-real merged duplicates: ${ triageYield.likelyRealMerged }`,
		`- likely-real oracle/noise questions: ${ triageYield.likelyRealOracleQuestion }`,
		`- normalization-noise candidates: ${ triageYield.normalizationNoiseCandidates }`,
		`- bootstrap stalls: ${ triageYield.bootstrapStalls }`,
		`- top duplicate family share: ${ triageYield.topDuplicateFamilyShare }`,
		`- top semantic families: ${ JSON.stringify(
			triageYield.topSemanticFamilies
		) }`,
		'',
		'## Health',
		...( healthWarnings.length
			? healthWarnings.map( ( warning ) => `- warning: ${ warning }` )
			: [ '- ok' ] ),
		'',
		'## Enabled Groups',
		...( groups ?? [] ).map(
			( group ) =>
				`- ${ group.name }: ${ group.transport }, profile=${ group.env?.GUTENBERG_RTC_BROWSER_ACTION_PROFILE }, lanes=${ group.lanes }, seed=${ group.startSeed }`
		),
		'',
		'## Paused Groups',
		...Object.entries( state.pausedGroups ?? {} ).map(
			( [ group, value ] ) =>
				`- ${ group }: ${ value.at } ${ value.reason }`
		),
		...( Object.keys( state.pausedGroups ?? {} ).length
			? []
			: [ '- none' ] ),
		'',
		'## Recent Changes',
		...( state.changes ?? [] )
			.slice( -12 )
			.map(
				( change ) =>
					`- ${ change.at }: ${ change.action } ${
						change.group ?? change.session ?? ''
					} ${ change.reason ?? '' }`
			),
		'',
	];
	await fs.writeFile( STATUS_PATH, lines.join( '\n' ) );
}

async function runPass() {
	const coverageFiles = await findCoverageFiles( OBSERVED_RUN_DIRS );
	const triageYield = await summarizeTriageYield( OBSERVED_RUN_DIRS );
	state.triageYield = triageYield;
	const { records, stats } = await readCoverageRecords( coverageFiles );
	const novelty = summarizeNovelty( records );
	const resources = sampleResources();
	await applyPolicy( novelty, resources, triageYield );
	evaluateHealth(
		await readJsonFile( GROUPS_PATH ),
		coverageFiles,
		triageYield,
		await readJsonFile( path.join( OUTPUT_DIR, 'supervisor-state.json' ) )
	);
	await ensureSupervisor( resources );
	state.lastUpdatedAt = new Date().toISOString();
	await writeJsonFileAtomic( STATE_PATH, state );
	await writeStatus( novelty, resources, coverageFiles, stats, triageYield );
	await log(
		`pass: processed=${ novelty.processed } files=${
			coverageFiles.length
		} newFeatures=${ novelty.newFeatureKeys } newCdp=${
			novelty.newCoverageHashes
		} warnings=${ state.healthWarnings.length } headroom=${
			resources.hasHeadroom
		} likelyReal=${ triageYield.likelyRealVisible } duplicateShare=${
			triageYield.topDuplicateFamilyShare
		} memory=${ formatMemoryHeadroomSummary( resources ) }`
	);
}

function sleep( ms ) {
	return new Promise( ( resolve ) => setTimeout( resolve, ms ) );
}

async function main() {
	await log(
		`RTC novelty monitor started, outputDir=${ OUTPUT_DIR }, observed=${ OBSERVED_RUN_DIRS.join(
			','
		) }`
	);
	while ( Date.now() < END_AT ) {
		try {
			await runPass();
		} catch ( error ) {
			await log( `pass failed: ${ error.stack ?? error.message }` );
		}
		await sleep( INTERVAL_MS );
	}
	await log( 'RTC novelty monitor exiting after requested duration.' );
}

main().catch( async ( error ) => {
	await log( error.stack ?? error.message );
	process.exitCode = 1;
} );
