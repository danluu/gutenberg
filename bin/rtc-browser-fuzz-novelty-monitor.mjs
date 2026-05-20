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
const CURRENT_OUTPUT_POINTER_PATH =
	process.env.RTC_FUZZ_NOVELTY_CURRENT_OUTPUT_POINTER ??
	path.join( path.dirname( OUTPUT_DIR ), 'current-output-dir.txt' );
const NO_ANALYSIS_SENTINEL_RELATIVE_PATH = path.join(
	'.triage-watcher',
	'no-analysis.json'
);
const SUPERVISOR_SESSION =
	process.env.RTC_FUZZ_NOVELTY_SUPERVISOR_SESSION ??
	'rtc-fuzz-novelty-supervisor-20260502';
const FORCE_COVERAGE_GUIDED_POLICY_GUARDS =
	process.env.RTC_FUZZ_NOVELTY_ALLOW_DISABLED_POLICY_GUARDS !== '1' &&
	SUPERVISOR_SESSION === 'rtc-coverage-guided-supervisor';
const INTERVAL_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_INTERVAL_MS',
	5 * 60 * 1000
);
const STARTUP_STATUS_HEARTBEAT_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_STARTUP_STATUS_HEARTBEAT_MS',
	60 * 1000
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
const CURRENT_RUN_DIRS = [ OUTPUT_DIR ];
let currentRunCoverageRoots = CURRENT_RUN_DIRS;
const ACTIVE_GROUP_STATUSES = new Set( [
	'starting',
	'launching',
	'recovering',
	'running',
] );
const HISTORICAL_OBSERVED_RUN_DIRS = uniquePathList(
	parsePathList( process.env.RTC_FUZZ_NOVELTY_OBSERVED_RUN_DIRS ).filter(
		( root ) => path.resolve( root ) !== path.resolve( OUTPUT_DIR )
	)
);
const OBSERVED_RUN_DIRS = uniquePathList( [
	...HISTORICAL_OBSERVED_RUN_DIRS,
	...CURRENT_RUN_DIRS,
] );
const FORCE_START = process.env.RTC_FUZZ_NOVELTY_FORCE_START === '1';
const START_SUPERVISOR = process.env.RTC_FUZZ_NOVELTY_START_SUPERVISOR !== '0';
const ALLOW_FLEET_STARTUP_NOISE_CANARY =
	process.env.RTC_FUZZ_NOVELTY_ALLOW_FLEET_STARTUP_NOISE_CANARY === '1';
const INCLUDE_RECHECK_COVERAGE =
	process.env.RTC_FUZZ_NOVELTY_INCLUDE_RECHECK_COVERAGE === '1';
const ENABLE_HTTP_PROBE =
	process.env.RTC_FUZZ_NOVELTY_ENABLE_HTTP_PROBE !== '0';
const ENABLE_SAME_USER_PROBE =
	process.env.RTC_FUZZ_NOVELTY_ENABLE_SAME_USER === '1';
const REQUESTED_MAX_ENABLED_GROUPS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS',
	7
);
const REQUESTED_TARGET_ENABLED_GROUPS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS',
	3
);
const COVERAGE_GUIDED_MAX_ENABLED_GROUPS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS',
	2
);
const COVERAGE_GUIDED_TARGET_ENABLED_GROUPS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS',
	1
);
const MAX_ENABLED_GROUPS = FORCE_COVERAGE_GUIDED_POLICY_GUARDS
	? Math.min(
			REQUESTED_MAX_ENABLED_GROUPS,
			COVERAGE_GUIDED_MAX_ENABLED_GROUPS
	  )
	: REQUESTED_MAX_ENABLED_GROUPS;
const TARGET_ENABLED_GROUPS = FORCE_COVERAGE_GUIDED_POLICY_GUARDS
	? Math.min(
			REQUESTED_TARGET_ENABLED_GROUPS,
			COVERAGE_GUIDED_TARGET_ENABLED_GROUPS,
			MAX_ENABLED_GROUPS
	  )
	: Math.min( REQUESTED_TARGET_ENABLED_GROUPS, MAX_ENABLED_GROUPS );
const MIN_ENABLED_BROWSER_LANES = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_MIN_ENABLED_BROWSER_LANES',
	Math.min(
		FORCE_COVERAGE_GUIDED_POLICY_GUARDS ? TARGET_ENABLED_GROUPS : 1,
		MAX_ENABLED_GROUPS
	)
);
const LOAD_HEADROOM_MULTIPLIER = getPositiveNumberEnv(
	'RTC_FUZZ_NOVELTY_LOAD_HEADROOM_MULTIPLIER',
	1.25
);
const PAUSE_ON_STARTUP_FAILURE =
	process.env.RTC_FUZZ_NOVELTY_PAUSE_ON_STARTUP_FAILURE !== '0' ||
	FORCE_COVERAGE_GUIDED_POLICY_GUARDS;
const PAUSE_ON_TRIAGE_NOISE =
	process.env.RTC_FUZZ_NOVELTY_PAUSE_ON_TRIAGE_NOISE !== '0' ||
	FORCE_COVERAGE_GUIDED_POLICY_GUARDS;
const REFRESH_CURRENT_RUN_TRIAGE_GATES =
	process.env.RTC_FUZZ_NOVELTY_REFRESH_CURRENT_TRIAGE_GATES !== '0';
const TRIAGE_GATE_REFRESH_TIMEOUT_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_TRIAGE_GATE_REFRESH_TIMEOUT_MS',
	120000
);
const STARTUP_FAILURE_LIMIT = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_STARTUP_FAILURE_LIMIT',
	2
);
const STARTUP_FAILURE_ABSOLUTE_LIMIT = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_STARTUP_FAILURE_ABSOLUTE_LIMIT',
	4
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
const ACTION_MIN_RECORDS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_ACTION_MIN_RECORDS',
	10
);
const INITIAL_PROFILE_MIN_RECORDS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_INITIAL_PROFILE_MIN_RECORDS',
	25
);
const COVERAGE_GUIDANCE_STALL_PASSES = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_COVERAGE_GUIDANCE_STALL_PASSES',
	3
);
const COVERAGE_QUALITY_ISSUE_PASSES = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_COVERAGE_QUALITY_ISSUE_PASSES',
	2
);
const COVERAGE_QUALITY_COMPLETION_MIN_RECORDS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_COVERAGE_QUALITY_COMPLETION_MIN_RECORDS',
	25
);
const COVERAGE_QUALITY_STARTUP_FAILURE_MIN_COUNT = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_COVERAGE_QUALITY_STARTUP_FAILURE_MIN_COUNT',
	25
);
const COVERAGE_QUALITY_STARTUP_FAILURE_MIN_RATE = getPositiveNumberEnv(
	'RTC_FUZZ_NOVELTY_COVERAGE_QUALITY_STARTUP_FAILURE_MIN_RATE',
	0.3
);
const STARTUP_FAILURE_RATE_LIMIT = getPositiveNumberEnv(
	'RTC_FUZZ_NOVELTY_STARTUP_FAILURE_RATE_LIMIT',
	COVERAGE_QUALITY_STARTUP_FAILURE_MIN_RATE
);
const STARTUP_FAILURE_MIN_RECORDS_FOR_RATE = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_STARTUP_FAILURE_MIN_RECORDS_FOR_RATE',
	COVERAGE_QUALITY_COMPLETION_MIN_RECORDS
);
const COVERAGE_QUALITY_MAX_ENABLED_GROUPS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS',
	8
);
const AUTO_GOAL_EXPANSION_ENABLED =
	process.env.RTC_FUZZ_NOVELTY_AUTO_GOAL_EXPANSION !== '0';
const AUTO_GOAL_EXPANSION_THRESHOLD = getNonNegativeIntegerEnv(
	'RTC_FUZZ_NOVELTY_AUTO_GOAL_EXPANSION_THRESHOLD',
	3
);
const AUTO_GOAL_EXPANSION_BATCH_SIZE = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_AUTO_GOAL_EXPANSION_BATCH_SIZE',
	12
);
const AUTO_GOAL_EXPANSION_MAX_WAVES_PER_PASS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_AUTO_GOAL_EXPANSION_MAX_WAVES_PER_PASS',
	2
);
const COVERAGE_GUIDANCE_STARTUP_COOLDOWN_RETRY_GRACE_MINUTES =
	getPositiveNumberEnv(
		'RTC_FUZZ_NOVELTY_COVERAGE_GUIDANCE_STARTUP_COOLDOWN_RETRY_GRACE_MINUTES',
		90
	);
const COVERAGE_GUIDANCE_CODEX_ENABLED =
	process.env.RTC_FUZZ_NOVELTY_COVERAGE_CODEX === '1';
const COVERAGE_GUIDANCE_CODEX_FORCE =
	process.env.RTC_FUZZ_NOVELTY_COVERAGE_CODEX_FORCE === '1';
const COVERAGE_GUIDANCE_CODEX_INTERVAL_MS =
	getPositiveNumberEnv(
		'RTC_FUZZ_NOVELTY_COVERAGE_CODEX_INTERVAL_MINUTES',
		90
	) *
	60 *
	1000;
const COVERAGE_GUIDANCE_CODEX_SESSION_PREFIX =
	process.env.RTC_FUZZ_NOVELTY_COVERAGE_CODEX_SESSION_PREFIX ??
	'rtc-coverage-guidance-codex';
const COVERAGE_GUIDANCE_CODEX_CWD =
	process.env.RTC_FUZZ_NOVELTY_COVERAGE_CODEX_CWD ?? REPO_ROOT;
const CODEX_BIN = process.env.RTC_FUZZ_CODEX_BIN ?? 'codex';
const CODEX_MODEL =
	process.env.RTC_FUZZ_NOVELTY_COVERAGE_CODEX_MODEL ?? 'gpt-5.5';
const CODEX_REASONING_EFFORT =
	process.env.RTC_FUZZ_NOVELTY_COVERAGE_CODEX_REASONING_EFFORT ?? 'xhigh';
const TRIAGE_DUPLICATE_SHARE_HOLD = getPositiveNumberEnv(
	'RTC_FUZZ_NOVELTY_TRIAGE_DUPLICATE_SHARE_HOLD',
	0.5
);
const TRIAGE_NOISE_DOMINANCE_MIN_CANDIDATES = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_TRIAGE_NOISE_DOMINANCE_MIN_CANDIDATES',
	10
);
const NO_PRODUCT_KNOWN_NOISE_DOMINANCE_MIN_CANDIDATES = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_NO_PRODUCT_KNOWN_NOISE_DOMINANCE_MIN_CANDIDATES',
	2
);
const NO_PRODUCT_STRICT_STARTUP_MIN_CANDIDATES = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_NO_PRODUCT_STRICT_STARTUP_MIN_CANDIDATES',
	2
);
const PRODUCT_EVIDENCE_DUPLICATE_FAMILY_HOLD_MIN_CANDIDATES =
	getPositiveIntegerEnv(
		'RTC_FUZZ_NOVELTY_PRODUCT_EVIDENCE_DUPLICATE_MIN_CANDIDATES',
		1
	);
const TRIAGE_NOISE_PAUSE_COOLDOWN_HOURS = getPositiveNumberEnv(
	'RTC_FUZZ_NOVELTY_TRIAGE_NOISE_PAUSE_COOLDOWN_HOURS',
	6
);
const FLEET_STARTUP_NOISE_HOLD_MIN_GROUPS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_FLEET_STARTUP_NOISE_HOLD_MIN_GROUPS',
	FORCE_COVERAGE_GUIDED_POLICY_GUARDS ? 2 : 4
);
const FLEET_STARTUP_NOISE_HOLD_MIN_SHARE = getPositiveNumberEnv(
	'RTC_FUZZ_NOVELTY_FLEET_STARTUP_NOISE_HOLD_MIN_SHARE',
	FORCE_COVERAGE_GUIDED_POLICY_GUARDS ? 0.25 : 0.5
);
const FLEET_STARTUP_NOISE_CANARY_GROUP =
	process.env.RTC_FUZZ_NOVELTY_FLEET_STARTUP_NOISE_CANARY_GROUP ??
	'novelty-ws-media-cross-entity';
const NO_ANALYSIS_SENTINEL_COMPATIBILITY_HOURS = getPositiveNumberEnv(
	'RTC_FUZZ_NO_ANALYSIS_SENTINEL_COMPATIBILITY_HOURS',
	TRIAGE_NOISE_PAUSE_COOLDOWN_HOURS
);
const NON_ACTIONABLE_ANALYSIS_JOB_STATUSES = new Set( [
	'family-capped',
	'source-suppressed',
	'stale-source',
] );
const RUN_LOCAL_NOISE_POLICY_VERSION = 36;
const STARTUP_FAILURE_DEDUPE_POLICY_VERSION = 3;
const STARTUP_DISCOVERY_PHASES = new Set( [
	'seed',
	'bootstrap',
	'open',
	'join',
	'startup',
	'setup',
	'discovery',
	'ready',
] );
const NO_PRODUCT_INFRA_NOISE_PATTERN =
	/ENOSPC|no space left|wp-env|docker compose|docker.*(?:exited|failed)|mysql.*(?:exited|failed)|dependency failed|Cannot find module|ERR_MODULE_NOT_FOUND|Host system is missing dependencies|playwright install-deps|browser dependencies|request failed: TypeError: fetch failed|GET .*\/wp-json\/|The plugin "[^"]+" isn'?t installed|plugin .*not installed|missing plugin\b|missing theme\b|RequestUtils\.deactivatePlugin|request-utils\/plugins\.ts/i;
const HISTORICAL_KNOWN_NOISE_FAMILIES = new Set( [
	'awareness_loss_after_save_reload',
	'late_session_awareness_stall',
	'pre_action_bootstrap_stall',
	'pre_action_awareness_stall',
	'reload_rejoin_awareness_stall',
	'linebreak_representation_drift',
	'cover_overlay_attribute_canonicalization',
	'rest_meta_database_error',
] );
const REAL_USER_EDITING_ACTION_LABELS = [
	'ui-type-paragraph',
	'ui-format-paragraph',
	'ui-heading-shortcut',
	'ui-type-title',
	'ui-undo-redo-paragraph',
	'ui-paste-paragraph',
	'ui-cut-copy-paragraph',
	'ui-link-paragraph',
	'ui-list-indent',
	'ui-composition-paragraph',
	'ui-toolbar-format-paragraph',
	'ui-table-cell-edit',
	'reload-post-action',
];
const REAL_USER_DUPLICATE_FAMILY_HOLD_GROUPS = [
	'novelty-ws-real-user-save-reload',
	'novelty-ws-real-user-editing',
	'novelty-ws-real-user-rich-text',
];
const PRODUCT_EVIDENCE_DUPLICATE_FAMILY_HOLD_GROUPS = [
	...REAL_USER_DUPLICATE_FAMILY_HOLD_GROUPS,
	'novelty-http-persistence-probe',
	'novelty-ws-lifecycle',
	'novelty-ws-same-user-lifecycle',
	'novelty-ws-same-user-stale-tabs',
	'novelty-ws-three-user-late-join',
	'novelty-ws-multi-reload-lifecycle',
	'novelty-ws-revision-persistence',
	'novelty-ws-revision-recovery',
	'novelty-ws-async-server-blocks',
];
const PRODUCT_EVIDENCE_DUPLICATE_FAMILY_HOLD_FAMILIES = new Set( [
	'late_session_awareness_stall',
	'operation_witness_missing',
	'reload_rejoin_awareness_stall',
	'rest_meta_database_error',
] );
const GROUP_SCOPED_PRODUCT_EVIDENCE_DUPLICATE_FAMILY_HOLD_FAMILIES = new Map( [
	[ 'novelty-http-persistence-probe', new Set( [ 'timeout', 'unknown' ] ) ],
	[ 'novelty-ws-async-server-blocks', new Set( [ 'unknown' ] ) ],
] );
const ACTION_COVERAGE_GROUPS = {
	'insert-paragraph': [ 'novelty-ws-structure' ],
	'append-paragraph': [ 'novelty-ws-structure' ],
	'edit-paragraph': [ 'novelty-ws-structure' ],
	'delete-block': [ 'novelty-ws-structure' ],
	'edit-title': [ 'novelty-ws-lifecycle' ],
	'insert-heading': [ 'novelty-ws-structure' ],
	'move-block': [ 'novelty-ws-structure' ],
	'concurrent-paragraphs': [ 'novelty-ws-lifecycle' ],
	'assert-presence-list': [
		'novelty-ws-collaboration-ui-signals',
		'novelty-ws-many-user-lifecycle',
	],
	'assert-selection-cursor': [
		'novelty-ws-collaboration-ui-signals',
		'novelty-ws-many-user-lifecycle',
	],
	'edit-formatted-paragraph-at-cursor': [ 'novelty-ws-parser-serialization' ],
	'edit-rich-text-pair-block': [ 'novelty-ws-parser-serialization' ],
	'edit-table-array-attributes': [ 'novelty-ws-lifecycle' ],
	'insert-common-block': [ 'novelty-ws-common-blocks' ],
	'edit-common-block-attributes': [ 'novelty-ws-common-blocks' ],
	'insert-block-gauntlet-block': [ 'novelty-ws-block-gauntlet' ],
	'edit-block-gauntlet-attributes': [ 'novelty-ws-block-gauntlet' ],
	'insert-nested-group': [ 'novelty-ws-structure' ],
	'edit-nested-paragraph': [ 'novelty-ws-structure' ],
	'move-block-into-group': [ 'novelty-ws-structure' ],
	'delete-nested-block': [ 'novelty-ws-structure' ],
	'reparse-edited-content': [ 'novelty-ws-parser-transform' ],
	'append-parser-stress-content': [ 'novelty-ws-parser-transform' ],
	'ui-type-paragraph': [
		'novelty-ws-real-user-save-reload',
		'novelty-ws-real-user-editing',
	],
	'ui-format-paragraph': [
		'novelty-ws-real-user-save-reload',
		'novelty-ws-real-user-editing',
		'novelty-ws-real-user-rich-text',
	],
	'ui-type-title': [
		'novelty-ws-real-user-save-reload',
		'novelty-ws-real-user-editing',
		'novelty-ws-real-user-rich-text',
	],
	'ui-undo-redo-paragraph': [
		'novelty-ws-real-user-save-reload',
		'novelty-ws-real-user-editing',
		'novelty-ws-real-user-rich-text',
	],
	'ui-heading-shortcut': [
		'novelty-ws-real-user-save-reload',
		'novelty-ws-real-user-editing',
		'novelty-ws-real-user-rich-text',
	],
	'ui-paste-paragraph': [ 'novelty-ws-real-user-rich-text' ],
	'ui-cut-copy-paragraph': [ 'novelty-ws-real-user-rich-text' ],
	'ui-link-paragraph': [ 'novelty-ws-real-user-rich-text' ],
	'ui-list-indent': [ 'novelty-ws-real-user-rich-text' ],
	'ui-composition-paragraph': [ 'novelty-ws-real-user-rich-text' ],
	'ui-toolbar-format-paragraph': [ 'novelty-ws-real-user-rich-text' ],
	'ui-table-cell-edit': [ 'novelty-ws-real-user-rich-text' ],
	'reload-post-action': [
		'novelty-ws-real-user-save-reload',
		'novelty-ws-real-user-editing',
		'novelty-ws-real-user-rich-text',
	],
	'insert-async-server-block': [ 'novelty-ws-async-server-blocks' ],
	'insert-media-cross-entity-block': [ 'novelty-ws-media-cross-entity' ],
};
const REQUIRED_ACTION_LABELS = Object.keys( ACTION_COVERAGE_GROUPS );
const EXPANSION_POLICY_VERSION = 15;

const WS_ENV_DEFAULTS = {
	GUTENBERG_RTC_BROWSER_SOFT_DISCOVERY_BOOTSTRAP: '1',
	GUTENBERG_RTC_TEST_WS_SKIP_RESET: '1',
	GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '480000',
	RTC_FUZZ_ANALYSIS_RECHECKS: '1',
	RTC_FUZZ_BOOTSTRAP_STALL_RECHECKS: '0',
	RTC_FUZZ_BOOT_TIMEOUT_MS: '60000',
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
	'novelty-http-persistence-probe': 'persistence-no-title',
	'novelty-ws-persistence-no-title': 'persistence-no-title',
	'novelty-ws-permissions-auth-locks': 'permissions-auth-locks',
	'novelty-ws-real-user-coverage-bridge': 'real-user-editing',
	'novelty-ws-real-user-action-ratchet': 'real-user-editing',
	'novelty-ws-real-user-title-body-save-reload': 'real-user-editing',
	'novelty-ws-real-user-save-reload': 'real-user-editing',
	'novelty-ws-real-user-editing': 'real-user-editing',
	'novelty-ws-real-user-rich-text': 'real-user-editing',
	'novelty-ws-revision-persistence': 'revision-persistence',
	'novelty-ws-revision-recovery': 'revision-persistence',
	'novelty-ws-same-user-stale-tabs': 'session-lifecycle',
	'novelty-ws-same-user-lifecycle': 'session-lifecycle',
	'novelty-http-same-user-stale-draft': 'session-lifecycle',
	'novelty-ws-async-server-blocks': 'async-server-blocks',
	'novelty-ws-media-cross-entity': 'media-cross-entity',
	'novelty-ws-long-session-large-doc': 'long-session-large-doc',
	'novelty-http-large-post-lifecycle': 'large-post-three-user-http-lifecycle',
	'novelty-ws-many-user-lifecycle': 'many-user-lifecycle',
	'novelty-ws-collaboration-ui-signals': 'collaboration-ui-signals',
	'novelty-ws-structure': 'structure',
	'novelty-ws-three-user-late-join': 'three-user-late-join',
	'novelty-ws-block-gauntlet-details-topoff': 'block-gauntlet',
};

const HIGH_VALUE_EXPANSION_GROUPS = [
	'novelty-ws-real-user-save-reload',
	'novelty-ws-real-user-editing',
	'novelty-ws-block-gauntlet',
	'novelty-ws-parser-transform',
	'novelty-ws-common-blocks',
	'novelty-ws-parser-serialization',
	'novelty-ws-revision-persistence',
	'novelty-ws-revision-recovery',
	'novelty-ws-three-user-late-join',
	'novelty-ws-multi-reload-lifecycle',
	'novelty-ws-same-user-lifecycle',
	'novelty-ws-same-user-stale-tabs',
	'novelty-http-same-user-stale-draft',
	'novelty-ws-real-user-rich-text',
	'novelty-ws-async-server-blocks',
	'novelty-ws-media-cross-entity',
	'novelty-ws-permissions-auth-locks',
	'novelty-ws-long-session-large-doc',
	'novelty-http-large-post-lifecycle',
	'novelty-ws-many-user-lifecycle',
	'novelty-ws-collaboration-ui-signals',
];

const PRODUCTIVE_FALLBACK_GROUPS = [
	'novelty-ws-parser-transform',
	'novelty-ws-parser-serialization',
	'novelty-ws-block-gauntlet',
	'novelty-ws-common-blocks',
	'novelty-http-persistence-probe',
	'novelty-ws-three-user-late-join',
	'novelty-ws-revision-persistence',
	'novelty-ws-revision-recovery',
	'novelty-ws-multi-reload-lifecycle',
	'novelty-ws-same-user-lifecycle',
	'novelty-ws-same-user-stale-tabs',
	'novelty-http-same-user-stale-draft',
	'novelty-ws-async-server-blocks',
	'novelty-ws-permissions-auth-locks',
	'novelty-ws-long-session-large-doc',
	'novelty-http-large-post-lifecycle',
	'novelty-ws-many-user-lifecycle',
	'novelty-ws-collaboration-ui-signals',
	'novelty-ws-real-user-save-reload',
	'novelty-ws-real-user-editing',
	'novelty-ws-real-user-rich-text',
];

const DEFAULT_REQUIRED_COVERAGE_BREADTH_GROUPS = [
	'novelty-ws-real-user-coverage-bridge',
	'novelty-ws-real-user-save-reload',
	'novelty-ws-real-user-rich-text',
	'novelty-ws-parser-transform',
	'novelty-ws-block-gauntlet',
	'novelty-ws-revision-recovery',
	'novelty-ws-three-user-late-join',
	'novelty-ws-multi-reload-lifecycle',
	'novelty-http-same-user-stale-draft',
	'novelty-ws-async-server-blocks',
	'novelty-ws-media-cross-entity',
	'novelty-ws-long-session-large-doc',
	'novelty-http-large-post-lifecycle',
	'novelty-ws-many-user-lifecycle',
	'novelty-ws-collaboration-ui-signals',
];
const configuredRequiredCoverageBreadthGroups = parsePathList(
	process.env.RTC_FUZZ_NOVELTY_REQUIRED_COVERAGE_BREADTH_GROUPS
);
const REQUIRED_COVERAGE_BREADTH_GROUPS = uniqueStringList(
	( configuredRequiredCoverageBreadthGroups.length
		? configuredRequiredCoverageBreadthGroups
		: DEFAULT_REQUIRED_COVERAGE_BREADTH_GROUPS
	).filter( ( group ) => PROFILE_BY_GROUP[ group ] )
);
const REQUIRED_COVERAGE_BREADTH_GROUP_SET = new Set(
	REQUIRED_COVERAGE_BREADTH_GROUPS
);

function isRequiredCoverageBreadthGroup( group ) {
	return REQUIRED_COVERAGE_BREADTH_GROUP_SET.has( group );
}

const MATERIALIZATION_FLOOR_GROUPS = [
	'novelty-ws-real-user-rich-text',
	'novelty-ws-real-user-save-reload',
	'novelty-ws-real-user-editing',
	'novelty-ws-parser-transform',
	'novelty-ws-parser-serialization',
	'novelty-ws-block-gauntlet',
	'novelty-ws-common-blocks',
	'novelty-http-persistence-probe',
	'novelty-http-same-user-stale-draft',
	'novelty-http-large-post-lifecycle',
	'novelty-ws-collaboration-ui-signals',
];
const ZERO_COVERAGE_PRIORITY_GROUPS = [
	'novelty-ws-collaboration-ui-signals',
	'novelty-ws-many-user-lifecycle',
];
const ZERO_COVERAGE_EVICTION_ORDER = [
	'novelty-ws-block-gauntlet',
	'novelty-ws-common-blocks',
	'novelty-ws-parser-transform',
	'novelty-ws-parser-serialization',
	'novelty-ws-real-user-coverage-bridge',
	'novelty-ws-long-session-large-doc',
	'novelty-ws-real-user-editing',
	'novelty-ws-real-user-save-reload',
	'novelty-ws-real-user-rich-text',
];

const AUTO_EXPANSION_GOAL_CANDIDATES = [
	{
		id: 'auto-combo:real-user-rich-text-paste-link',
		label: 'rich text paste followed by link edit',
		countSource: {
			kind: 'feature',
			key: 'action-pair:ui-paste-paragraph->ui-link-paragraph',
		},
		target: 10,
		groups: [ 'novelty-ws-real-user-rich-text' ],
		rationale:
			'real UI rich-text coverage should include selection-preserving paste/link sequences',
	},
	{
		id: 'auto-combo:real-user-rich-text-link-list',
		label: 'rich text link followed by list indentation',
		countSource: {
			kind: 'feature',
			key: 'action-pair:ui-link-paragraph->ui-list-indent',
		},
		target: 10,
		groups: [ 'novelty-ws-real-user-rich-text' ],
		rationale:
			'link editing followed by list indentation stresses rich-text selection mapping',
	},
	{
		id: 'auto-combo:real-user-rich-text-list-composition',
		label: 'rich text list followed by composition input',
		countSource: {
			kind: 'feature',
			key: 'action-pair:ui-list-indent->ui-composition-paragraph',
		},
		target: 10,
		groups: [ 'novelty-ws-real-user-rich-text' ],
		rationale:
			'IME/composition after list edits is a high-risk real-user editing path',
	},
	{
		id: 'auto-combo:real-user-rich-text-composition-toolbar',
		label: 'composition input followed by toolbar formatting',
		countSource: {
			kind: 'feature',
			key: 'action-pair:ui-composition-paragraph->ui-toolbar-format-paragraph',
		},
		target: 10,
		groups: [ 'novelty-ws-real-user-rich-text' ],
		rationale:
			'toolbar formatting after composition should not corrupt selection state',
	},
	{
		id: 'auto-combo:real-user-rich-text-toolbar-copy',
		label: 'toolbar formatting followed by cut/copy',
		countSource: {
			kind: 'feature',
			key: 'action-pair:ui-toolbar-format-paragraph->ui-cut-copy-paragraph',
		},
		target: 10,
		groups: [ 'novelty-ws-real-user-rich-text' ],
		rationale:
			'clipboard behavior after toolbar changes can diverge between editor state and DOM state',
	},
	{
		id: 'auto-combo:real-user-rich-text-copy-table',
		label: 'cut/copy followed by table cell editing',
		countSource: {
			kind: 'feature',
			key: 'action-pair:ui-cut-copy-paragraph->ui-table-cell-edit',
		},
		target: 10,
		groups: [ 'novelty-ws-real-user-rich-text' ],
		rationale:
			'table editing after clipboard operations exercises nested rich-text state',
	},
	{
		id: 'auto-combo:real-user-rich-text-table-undo',
		label: 'table cell editing followed by undo/redo',
		countSource: {
			kind: 'feature',
			key: 'action-pair:ui-table-cell-edit->ui-undo-redo-paragraph',
		},
		target: 10,
		groups: [ 'novelty-ws-real-user-rich-text' ],
		rationale:
			'undo/redo after table editing catches stale selection and block identity bugs',
	},
	{
		id: 'auto-combo:parser-transform-ws-success',
		label: 'successful parser-transform websocket records',
		countSource: {
			kind: 'success-profile',
			profile: 'parser-transform',
		},
		target: 50,
		groups: [ 'novelty-ws-parser-transform' ],
		rationale:
			'parser transform coverage should complete seeds, not only start them',
	},
	{
		id: 'auto-combo:revision-restore-history-ok',
		label: 'successful revision restore history events',
		countSource: {
			kind: 'feature',
			key: 'history:revision-restore:ok',
		},
		target: 25,
		groups: [ 'novelty-ws-revision-recovery' ],
		rationale:
			'revision restore coverage should include the browser-visible restore event',
	},
	{
		id: 'auto-combo:media-cross-entity-history-ok',
		label: 'successful media/cross-entity history events',
		countSource: {
			kind: 'feature',
			key: 'history:media-cross-entity:ok',
		},
		target: 25,
		groups: [ 'novelty-ws-media-cross-entity' ],
		rationale:
			'async media and reusable-block paths should complete their backing REST work',
	},
	{
		id: 'auto-combo:operation-ledger-active',
		label: 'operation ledger active records',
		countSource: {
			kind: 'feature',
			key: 'operation-ledger:active',
		},
		target: 100,
		groups: [
			'novelty-ws-real-user-save-reload',
			'novelty-ws-real-user-editing',
			'novelty-ws-real-user-rich-text',
			'novelty-ws-long-session-large-doc',
			'novelty-http-large-post-lifecycle',
		],
		rationale:
			'operation witness coverage is needed for stale or dropped user operations',
	},
	{
		id: 'auto-combo:large-document-blocks-100',
		label: 'very large document',
		countSource: {
			kind: 'feature',
			key: 'large-document:blocks-100',
		},
		target: 10,
		groups: [ 'novelty-ws-long-session-large-doc' ],
		rationale:
			'documents above 100 blocks exercise slow-path serialization and Yjs growth',
	},
	{
		id: 'auto-combo:http-large-post-publish',
		label: 'large post three-user HTTP publish witnesses',
		countSource: {
			kind: 'feature',
			key: 'history:final-persistence-publish:ok',
		},
		target: 10,
		groups: [ 'novelty-http-large-post-lifecycle' ],
		rationale:
			'the combined HTTP, three-user, large-post, publish oracle must complete successfully',
	},
	{
		id: 'auto-combo:http-large-post-final-ui-witnesses',
		label: 'large post final UI witnesses',
		countSource: {
			kind: 'feature',
			key: 'history:final-ui-witness-sweep:ok',
		},
		target: 10,
		groups: [ 'novelty-http-large-post-lifecycle' ],
		rationale:
			'each participant needs a final UI-entered operation witness before publish',
	},
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

const ASYNC_SERVER_BLOCK_TYPES = [
	'core/embed',
	'core/latest-posts',
	'core/query',
	'core/search',
	'core/calendar',
	'core/categories',
	'core/template-part',
	'core/block',
];

const MEDIA_CROSS_ENTITY_BLOCK_TYPES = [
	'core/block',
	'core/file',
	'core/gallery',
	'core/image',
	'core/media-text',
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
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '60000',
		},
	},
	{
		name: 'novelty-ws-common-blocks',
		actionProfile: 'common-blocks',
		startSeed: 965001,
		stepCount: 10,
		collectCdpCoverage: true,
		env: {},
	},
	{
		name: 'novelty-ws-block-gauntlet',
		actionProfile: 'block-gauntlet',
		startSeed: 966001,
		stepCount: 10,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
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
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
		},
	},
	{
		name: 'novelty-ws-persistence-no-title',
		actionProfile: 'persistence-no-title',
		startSeed: 980001,
		stepCount: 12,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
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
			GUTENBERG_RTC_BROWSER_ENABLE_REVISION_RESTORE_PROBE: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '2',
			RTC_FUZZ_ENABLE_REVISION_RESTORE_PROBE: '1',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
		},
	},
	{
		name: 'novelty-ws-revision-recovery',
		actionProfile: 'revision-persistence',
		startSeed: 1070001,
		stepCount: 16,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_AUTOSAVE_CHECKPOINT_COUNT: '2',
			GUTENBERG_RTC_BROWSER_ENABLE_REVISION_RESTORE_PROBE: '1',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FORCE_AUTOSAVE_STEPS: '4,12',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '5,11',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '3,8,13',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '3',
			RTC_FUZZ_ENABLE_REVISION_RESTORE_PROBE: '1',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
		},
	},
	{
		name: 'novelty-ws-three-user-late-join',
		actionProfile: 'three-user-late-join',
		startSeed: 1000001,
		stepCount: 10,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP: '1',
			GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION: '1',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
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
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '0',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '1',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
		},
	},
	{
		name: 'novelty-ws-same-user-stale-tabs',
		actionProfile: 'session-lifecycle',
		startSeed: 1080001,
		stepCount: 18,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_COLLABORATOR_MODE: 'same-user',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '4,9,14',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '3',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '2',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
		},
	},
	{
		name: 'novelty-http-same-user-stale-draft',
		actionProfile: 'session-lifecycle',
		transport: 'http',
		startSeed: 1150001,
		stepCount: 24,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_COLLABORATOR_MODE: 'same-user',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '4,9,14,20',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '3',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'fail',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '2',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
		},
	},
	{
		name: 'novelty-ws-parser-serialization',
		actionProfile: 'parser-serialization',
		startSeed: 1010001,
		stepCount: 9,
		collectCdpCoverage: true,
		env: {},
	},
	{
		name: 'novelty-ws-parser-transform',
		actionProfile: 'parser-transform',
		startSeed: 1040001,
		stepCount: 8,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '60000',
		},
	},
	{
		name: 'novelty-ws-real-user-editing',
		actionProfile: 'real-user-editing',
		startSeed: 1060001,
		stepCount: 10,
		lanes: 2,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FORCE_RANDOM_RELOAD_STEP: '7',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '3',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '2',
			GUTENBERG_RTC_BROWSER_INITIAL_CONTENT_PROFILE: 'base-seeded',
			GUTENBERG_RTC_BROWSER_REAL_USER_EDITING_ACTION_LABELS:
				'ui-type-paragraph,ui-format-paragraph,ui-type-title,ui-heading-shortcut,ui-undo-redo-paragraph',
			GUTENBERG_RTC_BROWSER_REAL_USER_EDITING_SEQUENCE:
				'ui-type-paragraph,ui-format-paragraph,ui-type-title,ui-heading-shortcut,ui-undo-redo-paragraph',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'shadow',
			GUTENBERG_RTC_BROWSER_RELOAD_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_RELOAD_POST_ACTION_KIND: 'paragraph',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '30000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
		},
	},
	{
		name: 'novelty-ws-real-user-save-reload',
		actionProfile: 'real-user-editing',
		startSeed: 1100001,
		stepCount: 5,
		lanes: 2,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FORCE_RANDOM_RELOAD_STEP: '3',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '2',
			GUTENBERG_RTC_BROWSER_INITIAL_CONTENT_PROFILE: 'base-seeded',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'shadow',
			GUTENBERG_RTC_BROWSER_REAL_USER_EDITING_ACTION_LABELS:
				'ui-type-paragraph,ui-format-paragraph,ui-type-title,ui-heading-shortcut,ui-undo-redo-paragraph',
			GUTENBERG_RTC_BROWSER_REAL_USER_EDITING_SEQUENCE:
				'ui-type-paragraph,ui-format-paragraph,ui-type-title,ui-heading-shortcut,ui-undo-redo-paragraph',
			GUTENBERG_RTC_BROWSER_RELOAD_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_RELOAD_POST_ACTION_KIND: 'paragraph',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '30000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
		},
	},
	{
		name: 'novelty-ws-real-user-rich-text',
		actionProfile: 'real-user-editing',
		startSeed: 1090001,
		stepCount: 14,
		lanes: 4,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FORCE_RANDOM_RELOAD_STEP: '10',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '3',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '2',
			GUTENBERG_RTC_BROWSER_INITIAL_CONTENT_PROFILE: 'base-seeded',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'shadow',
			GUTENBERG_RTC_BROWSER_REAL_USER_EDITING_ACTION_LABELS:
				'ui-type-paragraph,ui-format-paragraph,ui-type-title,ui-heading-shortcut,ui-paste-paragraph,ui-cut-copy-paragraph,ui-link-paragraph,ui-list-indent,ui-composition-paragraph,ui-toolbar-format-paragraph,ui-table-cell-edit,ui-undo-redo-paragraph',
			GUTENBERG_RTC_BROWSER_REAL_USER_EDITING_SEQUENCE:
				'ui-type-paragraph,ui-format-paragraph,ui-type-title,ui-heading-shortcut,ui-paste-paragraph,ui-link-paragraph,ui-list-indent,ui-composition-paragraph,ui-toolbar-format-paragraph,ui-cut-copy-paragraph,ui-table-cell-edit,ui-undo-redo-paragraph',
			GUTENBERG_RTC_BROWSER_RELOAD_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_RELOAD_POST_ACTION_KIND: 'format',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '30000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
		},
	},
	{
		name: 'novelty-ws-multi-reload-lifecycle',
		actionProfile: 'multi-reload-lifecycle',
		startSeed: 1020001,
		stepCount: 12,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '2',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
		},
	},
	{
		name: 'novelty-ws-async-server-blocks',
		actionProfile: 'async-server-blocks',
		startSeed: 1100001,
		stepCount: 12,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
		},
	},
	{
		name: 'novelty-ws-media-cross-entity',
		actionProfile: 'media-cross-entity',
		startSeed: 1130001,
		stepCount: 10,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '6',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '4',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'shadow',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
		},
	},
	{
		name: 'novelty-ws-permissions-auth-locks',
		actionProfile: 'permissions-auth-locks',
		startSeed: 1110001,
		stepCount: 10,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_COLLABORATOR_ROLES: 'contributor',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'shadow',
			GUTENBERG_RTC_BROWSER_INCLUDE_AUTH_SYNC_FAILURES: '1',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
		},
	},
	{
		name: 'novelty-ws-long-session-large-doc',
		actionProfile: 'long-session-large-doc',
		startSeed: 1120001,
		stepCount: 48,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'shadow',
			GUTENBERG_RTC_BROWSER_LARGE_DOCUMENT_BLOCKS: '96',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '3',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MAX_LIVE: '256',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '3',
			GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '900000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
			RTC_FUZZ_RUN_TIMEOUT_MS: '1200000',
		},
	},
	{
		name: 'novelty-ws-many-user-lifecycle',
		actionProfile: 'many-user-lifecycle',
		startSeed: 1160001,
		stepCount: 14,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '10',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FINAL_UI_WITNESS_SWEEP: '1',
			GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP: '1',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '5,11',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '4,9,13',
			GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_LARGE_DOCUMENT_BLOCKS: '24',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '2',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MAX_LIVE: '512',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'fail',
			GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '1200000',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '60000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '240000',
			RTC_FUZZ_RUN_TIMEOUT_MS: '1200000',
		},
	},
	{
		name: 'novelty-ws-collaboration-ui-signals',
		actionProfile: 'collaboration-ui-signals',
		startSeed: 1170001,
		stepCount: 10,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'shadow',
			GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP: '1',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '6',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '4',
			GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'shadow',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '45000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '180000',
		},
	},
	{
		name: 'novelty-http-large-post-lifecycle',
		actionProfile: 'large-post-three-user-http-lifecycle',
		transport: 'http',
		startSeed: 1140001,
		stepCount: 36,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_PUBLISH: '1',
			GUTENBERG_RTC_BROWSER_FINAL_UI_WITNESS_SWEEP: '1',
			GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP: '1',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '8,18,28',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '6,14,24',
			GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_LARGE_DOCUMENT_BLOCKS: '160',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '3',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MAX_LIVE: '512',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'fail',
			GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '1800000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
			RTC_FUZZ_RUN_TIMEOUT_MS: '1800000',
		},
	},
	{
		name: 'novelty-http-persistence-probe',
		actionProfile: 'persistence-no-title',
		transport: 'http',
		startSeed: 1030001,
		stepCount: 8,
		collectCdpCoverage: false,
		env: {},
	},
];

await fs.mkdir( OUTPUT_DIR, { recursive: true } );
const state = ( await readJsonFile( STATE_PATH ) ) ?? {
	startedAt: new Date().toISOString(),
	outputDir: OUTPUT_DIR,
	enabledGroups: [ 'novelty-ws-structure' ],
	featureCounts: {},
	coverageHashes: {},
	fileOffsets: {},
	summaryFileOffsets: {},
	recordCountsByProfile: {},
	recordCountsByTransport: {},
	successfulActionCountsByProfile: {},
	successfulRecordCountsByProfile: {},
	currentRunRecordCountsByProfile: {},
	currentRunRecordCountsByGroup: {},
	currentRunRecordCountsByTransport: {},
	currentRunSuccessfulActionCountsByProfile: {},
	currentRunSuccessfulRecordCountsByProfile: {},
	startupFailureCountsByProfile: {},
	startupFailureCountsByGroup: {},
	startupFailureIdentityKeys: [],
	startupFailureDedupePolicyVersion: STARTUP_FAILURE_DEDUPE_POLICY_VERSION,
	currentRunSummaryStartupFailureCountsByProfile: {},
	currentRunSummaryStartupFailureCountsByGroup: {},
	currentRunCountersInitializedForOutputDir: null,
	runLocalNoisePolicyVersion: RUN_LOCAL_NOISE_POLICY_VERSION,
	pausedGroups: {},
	disabledGroups: {},
	autoCoverageGoals: [],
	autoCoverageGoalWaves: [],
	recordsSeen: 0,
	healthWarnings: [],
	lastUpdatedAt: null,
	changes: [],
};
state.fileOffsets ??= {};
state.changes ??= [];
state.expansionPolicyVersion ??= 0;

if ( state.expansionPolicyVersion !== EXPANSION_POLICY_VERSION ) {
	state.pausedGroups ??= {};
	state.disabledGroups ??= {};
	state.startupFailureCountsByProfile ??= {};
	state.startupFailureCountsByGroup ??= {};
	let clearedExpansionPauses = 0;
	let preservedExpansionNoisePauses = 0;

	for ( const group of HIGH_VALUE_EXPANSION_GROUPS ) {
		const preservedPause = getUnexpiredNoisePause(
			state.pausedGroups[ group ]
		);
		if ( preservedPause ) {
			state.pausedGroups[ group ] = preservedPause;
			preservedExpansionNoisePauses += 1;
			const profile = PROFILE_BY_GROUP[ group ];
			if ( profile ) {
				delete state.startupFailureCountsByProfile[ profile ];
			}
			delete state.startupFailureCountsByGroup[ group ];
			continue;
		}
		if ( state.pausedGroups[ group ] ) {
			clearedExpansionPauses += 1;
		}
		delete state.pausedGroups[ group ];
		const profile = PROFILE_BY_GROUP[ group ];
		if ( profile ) {
			delete state.startupFailureCountsByProfile[ profile ];
		}
		delete state.startupFailureCountsByGroup[ group ];
	}

	state.expansionPolicyVersion = EXPANSION_POLICY_VERSION;
	state.changes.push( {
		at: new Date().toISOString(),
		action: 'reset-expansion-pauses',
		reason: `startup-noise counters are run-local; cleared ${ clearedExpansionPauses } stale expansion pause(s) while preserving ${ preservedExpansionNoisePauses } unexpired current-output or explicit no-product startup noise cooldown(s)`,
	} );
}
state.recordCountsByProfile ??= {};
state.recordCountsByTransport ??= {};
state.successfulActionCountsByProfile ??= {};
state.successfulRecordCountsByProfile ??= {};
state.currentRunRecordCountsByProfile ??= {};
state.currentRunRecordCountsByGroup ??= {};
state.currentRunRecordCountsByTransport ??= {};
state.currentRunSuccessfulActionCountsByProfile ??= {};
state.currentRunSuccessfulRecordCountsByProfile ??= {};
state.startupFailureCountsByProfile ??= {};
state.startupFailureCountsByGroup ??= {};
state.startupFailureIdentityKeys ??= [];
state.startupFailureDedupePolicyVersion ??= 0;
state.currentRunSummaryStartupFailureCountsByProfile ??= {};
state.currentRunSummaryStartupFailureCountsByGroup ??= {};
state.currentRunCountersInitializedForOutputDir ??= null;
state.runLocalNoisePolicyVersion ??= 0;
state.summaryFileOffsets ??= {};
state.pausedGroups ??= {};
state.startupNoiseCooldownBypassGroups ??= {};
state.healthWarnings ??= [];
state.autoCoverageGoals ??= [];
state.autoCoverageGoalWaves ??= [];
const loadedStateOutputDir = state.outputDir;
const loadedStateHadFullStatus = Boolean( state.lastUpdatedAt );
const loadedStateOutputDirMatchesCurrentOutput =
	typeof loadedStateOutputDir === 'string' &&
	path.resolve( loadedStateOutputDir ) === path.resolve( OUTPUT_DIR );
if ( state.outputDir !== OUTPUT_DIR ) {
	const previousOutputDir = state.outputDir ?? 'unknown';
	const previousPausedGroupCount = Object.keys(
		state.pausedGroups ?? {}
	).length;
	const preservedNoisePausedGroups = getUnexpiredNoisePausedGroups(
		state.pausedGroups
	);
	const preservedNoisePauseCount = Object.keys(
		preservedNoisePausedGroups
	).length;
	state.outputDir = OUTPUT_DIR;
	state.startedAt = new Date().toISOString();
	resetCurrentRunCounters();
	state.currentRunCountersInitializedForOutputDir = null;
	resetRunScopedTriageState();
	state.pausedGroups = preservedNoisePausedGroups;
	const importedSupervisorStartupPauseCount =
		await importSupervisorStartupStallPausesFromOutputDir(
			previousOutputDir
		);
	state.healthWarnings = [];
	state.coverageGuidanceQualityIssuePasses = 0;
	state.coverageGuidanceNoProgressPasses = 0;
	state.changes.push( {
		at: new Date().toISOString(),
		action: 'reset-run-local-noise-state',
		reason: `novelty state moved from ${ previousOutputDir } to ${ OUTPUT_DIR }; preserving coverage counters, ${ preservedNoisePauseCount } unexpired current-output or explicit no-product startup noise cooldown(s), and importing ${ importedSupervisorStartupPauseCount } previous-root supervisor startup cooldown(s), clearing ${
			previousPausedGroupCount - preservedNoisePauseCount
		} stale pause(s), and resetting active-current triage/startup/quality counters`,
	} );
}
if ( state.runLocalNoisePolicyVersion !== RUN_LOCAL_NOISE_POLICY_VERSION ) {
	resetCurrentRunCounters();
	state.currentRunCountersInitializedForOutputDir = null;
	resetRunScopedTriageState();
	delete state.emptyMaterializationRescueCooldownBypass;
	state.startupNoiseCooldownBypassGroups = {};
	state.runLocalNoisePolicyVersion = RUN_LOCAL_NOISE_POLICY_VERSION;
	state.changes.push( {
		at: new Date().toISOString(),
		action: 'reset-run-local-noise-policy',
		reason: 'previous-root no-product startup-noise pauses are reusable producer cooldowns; stale startup-noise bypasses were cleared, summary product-evidence records now participate in current-run holds, and product-evidence signatures remain visible and eligible',
	} );
}
if (
	state.startupFailureDedupePolicyVersion !==
	STARTUP_FAILURE_DEDUPE_POLICY_VERSION
) {
	const { cleared, preserved } = clearStartupFailureDedupeAffectedPauses();
	resetCurrentRunCounters();
	state.currentRunCountersInitializedForOutputDir = null;
	state.startupFailureDedupePolicyVersion =
		STARTUP_FAILURE_DEDUPE_POLICY_VERSION;
	state.changes.push( {
		at: new Date().toISOString(),
		action: 'reset-startup-failure-dedupe-policy',
		reason: `startup failure accounting now counts each group/seed once across behavioral and summary records; cleared ${ cleared } expired/non-explicit real-user startup pause(s), preserved ${ preserved } unexpired explicit startup-noise pause(s), and will rebuild run-local counters`,
	} );
}
const clearedHistoricalNoisePauses = clearHistoricalKnownNoisePauses();
if ( clearedHistoricalNoisePauses > 0 ) {
	state.changes.push( {
		at: new Date().toISOString(),
		action: 'clear-historical-noise-pauses',
		reason: `cleared ${ clearedHistoricalNoisePauses } historical known-noise group pause(s); current-run startup and triage evidence now control browser scheduling`,
	} );
}
const clearedStaleStartupNoisePauses = clearStaleStartupNoisePauses();
if ( clearedStaleStartupNoisePauses > 0 ) {
	state.changes.push( {
		at: new Date().toISOString(),
		action: 'clear-stale-startup-noise-pauses',
		reason: `cleared ${ clearedStaleStartupNoisePauses } startup-noise group pause(s) from previous output roots; current-run startup evidence now controls browser scheduling`,
	} );
}
const restoredReusableStartupNoisePauses =
	restoreReusableStartupNoisePausesFromChanges();
if ( restoredReusableStartupNoisePauses > 0 ) {
	state.changes.push( {
		at: new Date().toISOString(),
		action: 'restore-reusable-startup-noise-pauses',
		count: restoredReusableStartupNoisePauses,
		reason: `restored ${ restoredReusableStartupNoisePauses } unexpired explicit no-product startup-noise producer cooldown(s) from recent pause history after output-root reset`,
	} );
}
const normalizedAutoCoverageGoals = normalizeStoredAutoCoverageGoals(
	state.autoCoverageGoals
);
if (
	JSON.stringify( normalizedAutoCoverageGoals ) !==
	JSON.stringify( state.autoCoverageGoals )
) {
	state.autoCoverageGoals = normalizedAutoCoverageGoals;
	state.changes.push( {
		at: new Date().toISOString(),
		action: 'normalize-auto-coverage-goals',
		reason: 'dedupe ratchet goals and normalize nested ratchet source IDs',
	} );
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

function getNonNegativeIntegerEnv( name, fallback ) {
	const rawValue = process.env[ name ];
	if ( ! rawValue ) {
		return fallback;
	}
	const parsedValue = Number.parseInt( rawValue, 10 );
	if ( Number.isNaN( parsedValue ) || parsedValue < 0 ) {
		throw new Error( `Expected ${ name } to be a non-negative integer.` );
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

function uniquePathList( paths ) {
	const seen = new Set();
	const unique = [];
	for ( const item of paths ) {
		const resolved = path.resolve( item );
		if ( seen.has( resolved ) ) {
			continue;
		}
		seen.add( resolved );
		unique.push( item );
	}
	return unique;
}

function uniqueStringList( values ) {
	const seen = new Set();
	const unique = [];
	for ( const item of values ?? [] ) {
		if ( ! item || seen.has( item ) ) {
			continue;
		}
		seen.add( item );
		unique.push( item );
	}
	return unique;
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

function isSupervisorStateForCurrentOutput( supervisorState ) {
	return (
		supervisorState &&
		typeof supervisorState.outputDir === 'string' &&
		path.resolve( supervisorState.outputDir ) === path.resolve( OUTPUT_DIR )
	);
}

async function readSupervisorState() {
	const supervisorState = await readJsonFile(
		path.join( OUTPUT_DIR, 'supervisor-state.json' )
	);
	if ( ! supervisorState ) {
		return null;
	}
	if ( ! isSupervisorStateForCurrentOutput( supervisorState ) ) {
		const observedOutputDir =
			typeof supervisorState.outputDir === 'string'
				? supervisorState.outputDir
				: 'missing';
		if (
			state.lastRejectedSupervisorStateOutputDir !== observedOutputDir
		) {
			state.lastRejectedSupervisorStateOutputDir = observedOutputDir;
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'reject-stale-supervisor-state',
				expectedOutputDir: OUTPUT_DIR,
				observedOutputDir,
				reason: 'supervisor-state.json does not belong to the current novelty output dir',
			} );
			await log(
				`Ignoring supervisor-state.json for ${ observedOutputDir }; expected ${ OUTPUT_DIR }.`
			);
		}
		return null;
	}
	return supervisorState;
}

async function readSupervisorStateAfterStartup() {
	let supervisorState = await readSupervisorState();
	if (
		! START_SUPERVISOR ||
		( supervisorState &&
			getCurrentRunDirs( supervisorState, {
				allowOutputDirFallback: false,
			} ).length > 0 )
	) {
		return supervisorState;
	}

	for ( let attempt = 0; attempt < 5; attempt++ ) {
		if ( ! tmuxHasSession( getCurrentSupervisorSession() ) ) {
			return supervisorState;
		}
		await sleep( 1000 );
		supervisorState = await readSupervisorState();
		if (
			supervisorState &&
			getCurrentRunDirs( supervisorState, {
				allowOutputDirFallback: false,
			} ).length > 0
		) {
			return supervisorState;
		}
	}

	return supervisorState;
}

async function readSupervisorStateWithMaterializedRunDirs( {
	timeoutMs = 75000,
	intervalMs = 5000,
} = {} ) {
	const startedAt = Date.now();
	let supervisorState = await readSupervisorState();
	let currentRunDirs = filterPolicyInactiveCurrentRunDirs(
		getCurrentRunDirs( supervisorState ),
		supervisorState
	);
	if ( currentRunDirs.length > 0 ) {
		return supervisorState;
	}

	while (
		Date.now() - startedAt < timeoutMs &&
		tmuxHasSession( getCurrentSupervisorSession() )
	) {
		const groups = await readJsonFile( GROUPS_PATH );
		if ( ! Array.isArray( groups ) || groups.length === 0 ) {
			return supervisorState;
		}

		await sleep(
			Math.min( intervalMs, timeoutMs - ( Date.now() - startedAt ) )
		);
		supervisorState = await readSupervisorState();
		currentRunDirs = filterPolicyInactiveCurrentRunDirs(
			getCurrentRunDirs( supervisorState ),
			supervisorState
		);
		if ( currentRunDirs.length > 0 ) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'refresh-supervisor-active-run-dirs-after-empty-materialization',
				activeRunDirs: currentRunDirs.length,
				waitMs: Date.now() - startedAt,
				reason: 'waited for the supervisor poll after policy changed groups before writing active-current novelty status',
			} );
			return supervisorState;
		}
	}

	return supervisorState;
}

async function writeJsonFileAtomic( filePath, value ) {
	const tmpPath = `${ filePath }.tmp-${ process.pid }`;
	await fs.mkdir( path.dirname( filePath ), { recursive: true } );
	await fs.writeFile( tmpPath, JSON.stringify( value, null, 2 ) + '\n' );
	await fs.rename( tmpPath, filePath );
}

async function writeTextFileAtomic( filePath, text ) {
	const tmpPath = `${ filePath }.tmp-${
		process.pid
	}-${ Date.now() }-${ Math.random().toString( 16 ).slice( 2 ) }`;
	await fs.mkdir( path.dirname( filePath ), { recursive: true } );
	await fs.writeFile( tmpPath, text );
	await fs.rename( tmpPath, filePath );
}

function incrementCounter( target, key, amount = 1 ) {
	target[ key ] = ( target[ key ] ?? 0 ) + amount;
}

function resetCurrentRunCounters() {
	state.currentRunRecordCountsByProfile = {};
	state.currentRunRecordCountsByGroup = {};
	state.currentRunRecordCountsByTransport = {};
	state.currentRunSuccessfulActionCountsByProfile = {};
	state.currentRunSuccessfulRecordCountsByProfile = {};
	state.startupFailureCountsByProfile = {};
	state.startupFailureCountsByGroup = {};
	state.startupFailureIdentityKeys = [];
	state.currentRunSummaryStartupFailureCountsByProfile = {};
	state.currentRunSummaryStartupFailureCountsByGroup = {};
}

function resetRunScopedTriageState() {
	state.currentRunDirs = [];
	state.currentRunDirsIncludingPausedNoAnalysis = [];
	state.currentRunDirSource = null;
	state.triageYield = null;
	state.triageYieldCurrent = null;
	state.triageYieldCurrentIncludingPausedNoAnalysis = null;
	state.triageYieldHistorical = null;
	state.triageYieldCombined = null;
	state.lastCurrentRunTriageGateRefresh = null;
	delete state.coverageGuidanceCurrentStartupHoldReason;
	delete state.coverageGuidanceCurrentStartupHoldLastAt;
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
		createdAtMs + NO_ANALYSIS_SENTINEL_COMPATIBILITY_HOURS * 60 * 60 * 1000
	);
}

function isActiveNoAnalysisSentinel(
	sentinel,
	{ runDir = null, rootDir = OUTPUT_DIR } = {}
) {
	if ( sentinel?.preserveProductEvidence !== true || ! sentinel.outputDir ) {
		return false;
	}
	if ( runDir && ! isPathInsideRoot( runDir, rootDir ) ) {
		return false;
	}
	if ( path.resolve( sentinel.outputDir ) !== path.resolve( OUTPUT_DIR ) ) {
		return false;
	}
	return getNoAnalysisSentinelExpirationMs( sentinel ) > Date.now();
}

function getCurrentRunDirs(
	supervisorState,
	{
		includePausedNoAnalysis = false,
		allowOutputDirFallback = ! START_SUPERVISOR,
	} = {}
) {
	const dirs = [];
	const seen = new Set();
	const addDir = ( dir ) => {
		if ( ! dir ) {
			return;
		}
		const resolved = path.resolve( dir );
		if ( seen.has( resolved ) ) {
			return;
		}
		seen.add( resolved );
		dirs.push( resolved );
	};

	if ( supervisorState ) {
		for ( const group of supervisorState.groups ?? [] ) {
			let groupDirs = [];
			if ( ACTIVE_GROUP_STATUSES.has( group.status ) ) {
				groupDirs =
					group.activeRunDirs?.length > 0
						? group.activeRunDirs
						: [ group.currentRunDir ];
			}
			if ( includePausedNoAnalysis ) {
				groupDirs = [
					...groupDirs,
					...getSupervisorPausedNoAnalysisRunDirs( group ),
				];
			}
			for ( const dir of groupDirs ?? [] ) {
				addDir( dir );
			}
		}
		if ( dirs.length > 0 ) {
			return dirs;
		}
		return [];
	}

	if ( ! allowOutputDirFallback ) {
		return [];
	}
	for ( const dir of CURRENT_RUN_DIRS ) {
		addDir( dir );
	}
	return dirs;
}

function getSupervisorActiveRunDirSet( supervisorState ) {
	const activeRunDirs = new Set();
	for ( const group of supervisorState?.groups ?? [] ) {
		if ( ! ACTIVE_GROUP_STATUSES.has( group.status ) ) {
			continue;
		}
		const groupDirs =
			group.activeRunDirs?.length > 0
				? group.activeRunDirs
				: [ group.currentRunDir ];
		for ( const dir of groupDirs ?? [] ) {
			if ( dir ) {
				activeRunDirs.add( path.resolve( dir ) );
			}
		}
	}
	return activeRunDirs;
}

function filterPolicyInactiveCurrentRunDirs( runDirs, supervisorState = null ) {
	const enabled = new Set( state.enabledGroups ?? [] );
	const supervisorActiveRunDirs =
		getSupervisorActiveRunDirSet( supervisorState );
	return uniquePathList( runDirs ).filter( ( runDir ) => {
		const group = getRunGroupNameFromPath( runDir );
		if ( ! group ) {
			return supervisorActiveRunDirs.has( path.resolve( runDir ) );
		}
		if ( state.pausedGroups?.[ group ] ) {
			return false;
		}
		return (
			enabled.has( group ) &&
			supervisorActiveRunDirs.has( path.resolve( runDir ) )
		);
	} );
}

function getPathListKey( paths ) {
	return uniquePathList( paths ).sort().join( '\n' );
}

function getCurrentRunDirSource( supervisorState ) {
	if ( ! supervisorState ) {
		return START_SUPERVISOR
			? 'supervisor-state-missing-no-output-dir-fallback'
			: 'output-dir-fallback';
	}

	for ( const group of supervisorState.groups ?? [] ) {
		if ( ACTIVE_GROUP_STATUSES.has( group.status ) ) {
			const groupDirs =
				group.activeRunDirs?.length > 0
					? group.activeRunDirs
					: [ group.currentRunDir ];
			if ( groupDirs.some( Boolean ) ) {
				return 'supervisor-active-run-dirs';
			}
		}
		if ( getSupervisorPausedNoAnalysisRunDirs( group ).length > 0 ) {
			return 'supervisor-paused-no-analysis-run-dirs';
		}
	}
	return 'supervisor-no-active-run-dirs';
}

function isCoverageFileInRunDirs( filePath, runDirs ) {
	return runDirs.some( ( root ) => isPathInsideRoot( filePath, root ) );
}

function isCurrentRunCoverageFile( filePath ) {
	return isCoverageFileInRunDirs( filePath, currentRunCoverageRoots );
}

function isCurrentRunCoverageRecord( record ) {
	return (
		typeof record.coverageFile === 'string' &&
		isCurrentRunCoverageFile( record.coverageFile )
	);
}

function getRunGroupNameFromPath( filePath ) {
	if ( ! filePath ) {
		return null;
	}

	const relative = path.relative(
		path.resolve( OUTPUT_DIR ),
		path.resolve( filePath )
	);
	if (
		! relative ||
		relative.startsWith( '..' ) ||
		path.isAbsolute( relative )
	) {
		return null;
	}

	const [ runDirName ] = relative.split( path.sep );
	for ( const group of Object.keys( PROFILE_BY_GROUP ) ) {
		if (
			runDirName === group ||
			runDirName.startsWith( `${ group }-gen-` )
		) {
			return group;
		}
	}
	return null;
}

function getCoverageRecordGroupName( record ) {
	return record?.groupName ?? getRunGroupNameFromPath( record?.coverageFile );
}

function getSummaryRecordGroupName( record, filePath ) {
	return (
		record?.groupName ??
		record?.group ??
		getRunGroupNameFromPath(
			filePath ??
				record?.summaryPath ??
				record?.logPath ??
				record?.artifactsDir
		)
	);
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

async function findSummaryFiles( roots ) {
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
				await walk( entryPath, depth + 1 );
			} else if ( entry.name === 'summary.ndjson' ) {
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

async function findPreservedNoAnalysisRunDirs( rootDir = OUTPUT_DIR ) {
	const dirs = [];
	const seen = new Set();

	async function walk( dir, depth ) {
		const resolved = path.resolve( dir );
		if ( depth > 5 || seen.has( resolved ) ) {
			return;
		}
		seen.add( resolved );

		let entries;
		try {
			entries = await fs.readdir( resolved, { withFileTypes: true } );
		} catch {
			return;
		}

		for ( const entry of entries ) {
			const entryPath = path.join( resolved, entry.name );
			if ( ! entry.isDirectory() ) {
				continue;
			}
			if ( entry.name === '.triage-watcher' ) {
				const sentinel = await readJsonFile(
					path.join( entryPath, 'no-analysis.json' )
				);
				const runDir = path.dirname( entryPath );
				if (
					isActiveNoAnalysisSentinel( sentinel, {
						runDir,
						rootDir,
					} )
				) {
					dirs.push( runDir );
				}
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

	await walk( rootDir, 0 );
	return uniquePathList( dirs ).sort();
}

async function restoreNoisePausesFromNoAnalysisSentinels(
	rootDir = OUTPUT_DIR
) {
	let restored = 0;
	const seen = new Set();

	async function walk( dir, depth ) {
		const resolved = path.resolve( dir );
		if ( depth > 5 || seen.has( resolved ) ) {
			return;
		}
		seen.add( resolved );

		let entries;
		try {
			entries = await fs.readdir( resolved, { withFileTypes: true } );
		} catch {
			return;
		}

		for ( const entry of entries ) {
			const entryPath = path.join( resolved, entry.name );
			if ( ! entry.isDirectory() ) {
				continue;
			}
			if ( entry.name === '.triage-watcher' ) {
				const sentinel = await readJsonFile(
					path.join( entryPath, 'no-analysis.json' )
				);
				const runDir = path.dirname( entryPath );
				if (
					! isActiveNoAnalysisSentinel( sentinel, {
						runDir,
						rootDir,
					} )
				) {
					continue;
				}
				const reason = sentinel.reason ?? '';
				const group =
					sentinel.group ?? getRunGroupNameFromPath( runDir );
				if ( ! group || ! PROFILE_BY_GROUP[ group ] ) {
					continue;
				}
				const reasonKind = getNoisePauseKind(
					reason,
					sentinel.reasonKind
				);
				if ( ! reasonKind ) {
					continue;
				}
				const family =
					sentinel.family ?? getNoisePauseFamily( reasonKind );
				if (
					! isRestorableNoAnalysisNoisePauseSentinel( sentinel, {
						reasonKind,
						family,
					} )
				) {
					continue;
				}
				const expiresAtMs =
					getNoAnalysisSentinelExpirationMs( sentinel );
				if ( expiresAtMs <= Date.now() ) {
					continue;
				}
				const existingPause = getActiveNoisePauseForEntry(
					group,
					state.pausedGroups?.[ group ]
				);
				if ( existingPause ) {
					continue;
				}
				state.pausedGroups ??= {};
				state.pausedGroups[ group ] = {
					at: sentinel.createdAt ?? new Date().toISOString(),
					reason,
					outputDir: sentinel.outputDir ?? OUTPUT_DIR,
					reasonKind,
					family,
					source:
						sentinel.source ??
						'product-preserving-no-analysis-sentinel',
					preserveProductEvidence: true,
					expiresAt: new Date( expiresAtMs ).toISOString(),
					...( sentinel.noProductOnly !== undefined
						? { noProductOnly: sentinel.noProductOnly }
						: {} ),
					...( sentinel.productEvidenceRecords !== undefined
						? {
								productEvidenceRecords:
									sentinel.productEvidenceRecords,
						  }
						: {} ),
				};
				state.enabledGroups = ( state.enabledGroups ?? [] ).filter(
					( enabledGroup ) => enabledGroup !== group
				);
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'restore-noise-pause-from-no-analysis-sentinel',
					group,
					reason,
					outputDir: state.pausedGroups[ group ].outputDir,
					reasonKind,
					family: state.pausedGroups[ group ].family,
					source: state.pausedGroups[ group ].source,
					expiresAt: state.pausedGroups[ group ].expiresAt,
				} );
				restored += 1;
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

	await walk( rootDir, 0 );
	return restored;
}

function isRestorableNoAnalysisNoisePauseSentinel(
	sentinel,
	{ reasonKind, family } = {}
) {
	if (
		! [ 'startup-noise', 'known-noise', 'triage-duplicate-noise' ].includes(
			reasonKind
		)
	) {
		return false;
	}
	if ( reasonKind === 'startup-noise' ) {
		if ( family && family !== 'pre_action_bootstrap_stall' ) {
			return false;
		}
		const productEvidenceRecords = Number(
			sentinel?.productEvidenceRecords
		);
		return (
			sentinel?.noProductOnly !== false ||
			sentinel?.hasProductEvidence !== true ||
			( Number.isFinite( productEvidenceRecords ) &&
				productEvidenceRecords === 0 )
		);
	}
	return !! family;
}

async function refreshCurrentRunTriageGates( runDirs ) {
	const dirs = uniquePathList( runDirs ).filter( Boolean );
	const results = [];

	if ( ! REFRESH_CURRENT_RUN_TRIAGE_GATES || dirs.length === 0 ) {
		return {
			enabled: REFRESH_CURRENT_RUN_TRIAGE_GATES,
			attempted: 0,
			succeeded: 0,
			failed: 0,
			timedOut: 0,
			results,
		};
	}

	const supervisorStatePath = path.join(
		OUTPUT_DIR,
		'supervisor-state.json'
	);
	for ( const runDir of dirs ) {
		const result = await runGateOnlyTriageWatcher(
			runDir,
			supervisorStatePath
		);
		results.push( result );
		if ( ! result.ok ) {
			await log(
				`current-run gate-only triage refresh failed for ${ runDir }: exit=${ result.exitCode } signal=${ result.signal } timedOut=${ result.timedOut } stderr=${ result.stderrTail }`
			);
		}
	}

	return {
		enabled: true,
		at: new Date().toISOString(),
		attempted: results.length,
		succeeded: results.filter( ( result ) => result.ok ).length,
		failed: results.filter( ( result ) => ! result.ok ).length,
		timedOut: results.filter( ( result ) => result.timedOut ).length,
		results,
	};
}

function runGateOnlyTriageWatcher( runDir, supervisorStatePath ) {
	return new Promise( ( resolve ) => {
		const startedAt = Date.now();
		let stdout = '';
		let stderr = '';
		let settled = false;
		let timedOut = false;
		let killTimer = null;
		const child = spawn(
			process.execPath,
			[
				path.join(
					REPO_ROOT,
					'bin/rtc-browser-fuzz-triage-watcher.mjs'
				),
				runDir,
				'--once',
				'--gate-only',
			],
			{
				cwd: REPO_ROOT,
				env: {
					...process.env,
					RTC_FUZZ_TRIAGE_SUPERVISOR_STATE_PATH: supervisorStatePath,
					RTC_FUZZ_TRIAGE_CURRENT_OUTPUT_POINTER:
						CURRENT_OUTPUT_POINTER_PATH,
				},
				stdio: [ 'ignore', 'pipe', 'pipe' ],
			}
		);

		const finish = ( result ) => {
			if ( settled ) {
				return;
			}
			settled = true;
			clearTimeout( timeout );
			clearTimeout( killTimer );
			resolve( {
				runDir,
				durationMs: Date.now() - startedAt,
				stdoutTail: tailText( stdout ),
				stderrTail: tailText( stderr ),
				...result,
			} );
		};

		const timeout = setTimeout( () => {
			timedOut = true;
			try {
				child.kill( 'SIGTERM' );
			} catch {}
			killTimer = setTimeout( () => {
				try {
					child.kill( 'SIGKILL' );
				} catch {}
			}, 5000 );
			killTimer.unref();
		}, TRIAGE_GATE_REFRESH_TIMEOUT_MS );
		timeout.unref();

		child.stdout.on( 'data', ( chunk ) => {
			stdout = tailText( stdout + chunk.toString() );
		} );
		child.stderr.on( 'data', ( chunk ) => {
			stderr = tailText( stderr + chunk.toString() );
		} );
		child.on( 'error', ( error ) => {
			finish( {
				ok: false,
				exitCode: null,
				signal: null,
				timedOut,
				error: error.message,
			} );
		} );
		child.on( 'close', ( code, signal ) => {
			finish( {
				ok: code === 0 && ! timedOut,
				exitCode: code,
				signal,
				timedOut,
			} );
		} );
	} );
}

function tailText( value, maxLength = 4000 ) {
	if ( value.length <= maxLength ) {
		return value;
	}
	return value.slice( value.length - maxLength );
}

async function summarizeSummaryEvidence( roots ) {
	const files = await findSummaryFiles( roots );
	const strictStartupFailureKeys = new Set();
	const summary = {
		summaryFiles: files.length,
		summaryLines: 0,
		summaryParseErrors: 0,
		summaryProductEvidenceRecords: 0,
		summaryStrictStartupRecords: 0,
		summaryStrictStartupFailures: 0,
		summaryOtherRecords: 0,
		summaryStrictStartupRecordShare: 0,
	};

	for ( const filePath of files ) {
		const text = await fs.readFile( filePath, 'utf8' ).catch( () => '' );
		for ( const line of text.split( '\n' ) ) {
			if ( ! line.trim() ) {
				continue;
			}
			summary.summaryLines += 1;
			let record;
			try {
				record = JSON.parse( line );
			} catch {
				summary.summaryParseErrors += 1;
				continue;
			}
			if ( hasSummaryProductEvidence( record ) ) {
				summary.summaryProductEvidenceRecords += 1;
			} else if ( isStrictPreActionStartupSummaryRecord( record ) ) {
				summary.summaryStrictStartupRecords += 1;
				strictStartupFailureKeys.add(
					`${ record.seed ?? 'unknown' }:${ filePath }`
				);
			} else {
				summary.summaryOtherRecords += 1;
			}
		}
	}

	summary.summaryStrictStartupFailures = strictStartupFailureKeys.size;
	const classifiedRecords =
		summary.summaryProductEvidenceRecords +
		summary.summaryStrictStartupRecords +
		summary.summaryOtherRecords;
	summary.summaryStrictStartupRecordShare =
		classifiedRecords > 0
			? Number(
					(
						summary.summaryStrictStartupRecords / classifiedRecords
					).toFixed( 4 )
			  )
			: 0;
	return summary;
}

async function summarizeTriageYield( roots ) {
	const files = await findTriageStateFiles( roots );
	const familyCounts = {};
	const rawFamilyCounts = {};
	const noProductFamilyCounts = {};
	const noProductRawFamilyCounts = {};
	const summary = {
		roots: roots.length,
		files: files.length,
		rawSignatureCount: 0,
		signatureCount: 0,
		noProductRawSignatureCount: 0,
		noProductSignatureCount: 0,
		actionableSignatureCount: 0,
		nonActionableSignatureCount: 0,
		knownInfraSignatures: 0,
		bootstrapStallSignatures: 0,
		familyCappedSignatures: 0,
		sourceSuppressedSignatures: 0,
		staleSourceSignatures: 0,
		notRealSignatures: 0,
		infraSignatures: 0,
		noRealisticReproSignatures: 0,
		analysisGatedNonActionableSignatures: 0,
		mergedDuplicateSignatures: 0,
		normalizationNoiseSignatures: 0,
		rawProductEvidenceSignatures: 0,
		productEvidenceSignatures: 0,
		likelyRealVisible: 0,
		likelyRealMerged: 0,
		likelyRealOracleQuestion: 0,
		normalizationNoiseCandidates: 0,
		noProductLikelyRealVisible: 0,
		noProductNormalizationNoiseCandidates: 0,
		bootstrapStalls: 0,
		suppressedStrictStartupRecords: 0,
		suppressedStrictStartupIdentities: 0,
		suppressedStrictStartupVirtualSignatures: 0,
		topDuplicateFamilyShare: 0,
		topSemanticFamilies: [],
		rawTopDuplicateFamilyShare: 0,
		rawTopSemanticFamilies: [],
		noProductTopDuplicateFamilyShare: 0,
		noProductTopSemanticFamilies: [],
		noProductRawTopDuplicateFamilyShare: 0,
		noProductRawTopSemanticFamilies: [],
		productEvidenceDuplicateRepresentativeFamilies: {},
		productEvidenceDuplicateRepresentatives: 0,
		summaryFiles: 0,
		summaryLines: 0,
		summaryParseErrors: 0,
		summaryProductEvidenceRecords: 0,
		summaryStrictStartupRecords: 0,
		summaryStrictStartupFailures: 0,
		summaryOtherRecords: 0,
		summaryStrictStartupRecordShare: 0,
	};

	for ( const filePath of files ) {
		const triageState = await readJsonFile( filePath );
		const analysisJobs = await readAnalysisJobStatusMap(
			path.join( path.dirname( filePath ), 'analysis-tier', 'state.json' )
		);
		const deepAnalysisJobs = await readAnalysisJobStatusMap(
			path.join(
				path.dirname( filePath ),
				'deep-analysis-tier',
				'state.json'
			)
		);
		const signatures = Object.values( triageState?.signatures ?? {} );
		if ( triageState?.metrics ) {
			addSuppressedKnownNoiseSummary( summary, triageState.metrics );
		}
		if ( signatures.length === 0 && triageState?.metrics ) {
			addTriageMetricsSummary(
				summary,
				familyCounts,
				rawFamilyCounts,
				noProductFamilyCounts,
				noProductRawFamilyCounts,
				triageState.metrics,
				{ includeSuppressedKnownNoise: false }
			);
			continue;
		}

		for ( const signature of signatures ) {
			summary.rawSignatureCount += 1;
			const hasProductEvidence = hasSignatureProductEvidence( signature );
			if ( hasProductEvidence ) {
				summary.rawProductEvidenceSignatures += 1;
			}
			const family = getTriageSemanticFamily( signature );
			rawFamilyCounts[ family ] = ( rawFamilyCounts[ family ] ?? 0 ) + 1;
			if ( ! hasProductEvidence ) {
				summary.noProductRawSignatureCount += 1;
				noProductRawFamilyCounts[ family ] =
					( noProductRawFamilyCounts[ family ] ?? 0 ) + 1;
			}

			if (
				signature.equivalenceClass === 'pre-action-bootstrap-stall' ||
				signature.status === 'bootstrap-stall'
			) {
				summary.bootstrapStalls += 1;
			}
			if ( isLikelyTriageNormalizationNoise( signature ) ) {
				summary.normalizationNoiseCandidates += 1;
				if ( ! hasProductEvidence ) {
					summary.noProductNormalizationNoiseCandidates += 1;
				}
			}

			const analysisJob = analysisJobs.get( signature.hash );
			const deepAnalysisJob = deepAnalysisJobs.get( signature.hash );
			const decision = getEffectiveTriageDecision(
				signature,
				analysisJob,
				deepAnalysisJob
			);
			if (
				hasProductEvidence &&
				isProductEvidenceDuplicateRepresentative(
					signature,
					analysisJob,
					deepAnalysisJob,
					decision
				)
			) {
				summary.productEvidenceDuplicateRepresentatives += 1;
				summary.productEvidenceDuplicateRepresentativeFamilies[
					family
				] =
					( summary.productEvidenceDuplicateRepresentativeFamilies[
						family
					] ?? 0 ) + 1;
			}
			const likelyRealDisposition = getLikelyRealDisposition(
				signature,
				decision
			);
			if ( likelyRealDisposition === 'merged-duplicate' ) {
				summary.likelyRealMerged += 1;
			} else if ( likelyRealDisposition === 'oracle-question' ) {
				summary.likelyRealOracleQuestion += 1;
			} else if ( likelyRealDisposition === 'visible' ) {
				summary.likelyRealVisible += 1;
				if ( ! hasProductEvidence ) {
					summary.noProductLikelyRealVisible += 1;
				}
			}

			const nonActionableReason = getTriageNonActionableReason(
				signature,
				decision,
				analysisJob,
				deepAnalysisJob
			);
			if ( nonActionableReason ) {
				recordNonActionableTriageSignature(
					summary,
					nonActionableReason
				);
				continue;
			}

			summary.signatureCount += 1;
			summary.actionableSignatureCount += 1;
			if ( hasProductEvidence ) {
				summary.productEvidenceSignatures += 1;
			} else {
				summary.noProductSignatureCount += 1;
				noProductFamilyCounts[ family ] =
					( noProductFamilyCounts[ family ] ?? 0 ) + 1;
			}
			familyCounts[ family ] = ( familyCounts[ family ] ?? 0 ) + 1;
		}
	}

	const summaryEvidence = await summarizeSummaryEvidence( roots );
	Object.assign( summary, summaryEvidence );
	summary.topSemanticFamilies = getTopFamilyEntries( familyCounts );
	if ( summary.signatureCount > 0 && summary.topSemanticFamilies.length ) {
		summary.topDuplicateFamilyShare = Number(
			(
				summary.topSemanticFamilies[ 0 ].count / summary.signatureCount
			).toFixed( 4 )
		);
	}
	summary.rawTopSemanticFamilies = getTopFamilyEntries( rawFamilyCounts );
	if (
		summary.rawSignatureCount > 0 &&
		summary.rawTopSemanticFamilies.length
	) {
		summary.rawTopDuplicateFamilyShare = Number(
			(
				summary.rawTopSemanticFamilies[ 0 ].count /
				summary.rawSignatureCount
			).toFixed( 4 )
		);
	}
	summary.noProductTopSemanticFamilies = getTopFamilyEntries(
		noProductFamilyCounts
	);
	if (
		summary.noProductSignatureCount > 0 &&
		summary.noProductTopSemanticFamilies.length
	) {
		summary.noProductTopDuplicateFamilyShare = Number(
			(
				summary.noProductTopSemanticFamilies[ 0 ].count /
				summary.noProductSignatureCount
			).toFixed( 4 )
		);
	}
	summary.noProductRawTopSemanticFamilies = getTopFamilyEntries(
		noProductRawFamilyCounts
	);
	if (
		summary.noProductRawSignatureCount > 0 &&
		summary.noProductRawTopSemanticFamilies.length
	) {
		summary.noProductRawTopDuplicateFamilyShare = Number(
			(
				summary.noProductRawTopSemanticFamilies[ 0 ].count /
				summary.noProductRawSignatureCount
			).toFixed( 4 )
		);
	}
	return summary;
}

function getTopFamilyEntries( counts ) {
	return Object.entries( counts )
		.sort( ( left, right ) => right[ 1 ] - left[ 1 ] )
		.slice( 0, 20 )
		.map( ( [ family, count ] ) => ( { family, count } ) );
}

async function readAnalysisJobStatusMap( filePath ) {
	const analysisState = await readJsonFile( filePath );
	const jobs = new Map();

	for ( const job of Object.values( analysisState?.jobs ?? {} ) ) {
		if ( ! job.hash ) {
			continue;
		}
		jobs.set( job.hash, {
			...job,
			result: await readAnalysisJobResult( job ),
		} );
	}

	return jobs;
}

async function readAnalysisJobResult( job ) {
	if ( job.status !== 'completed' || ! job.resultPath ) {
		return null;
	}
	return readJsonFile( job.resultPath );
}

const PRODUCT_EVIDENCE_REPRESENTATIVE_SIGNATURE_STATUSES = new Set( [
	'completed',
	'family-capped',
] );
const PRODUCT_EVIDENCE_REPRESENTATIVE_JOB_STATUSES = new Set( [
	'completed',
	'family-capped',
] );

function isProductEvidenceDuplicateRepresentative(
	signature,
	analysisJob,
	deepAnalysisJob,
	decision
) {
	if (
		PRODUCT_EVIDENCE_REPRESENTATIVE_SIGNATURE_STATUSES.has(
			signature?.status
		)
	) {
		return true;
	}
	if (
		PRODUCT_EVIDENCE_REPRESENTATIVE_JOB_STATUSES.has( analysisJob?.status )
	) {
		return true;
	}
	if (
		PRODUCT_EVIDENCE_REPRESENTATIVE_JOB_STATUSES.has(
			deepAnalysisJob?.status
		)
	) {
		return true;
	}
	return getLikelyRealDisposition( signature, decision ) === 'visible';
}

function addTriageMetricsSummary(
	summary,
	familyCounts,
	rawFamilyCounts,
	noProductFamilyCounts,
	noProductRawFamilyCounts,
	metrics,
	{ includeSuppressedKnownNoise = true } = {}
) {
	const rawSignatureCount =
		metrics.rawSignatureCount ?? metrics.signatureCount ?? 0;
	const actionableSignatureCount =
		metrics.actionableSignatureCount ?? metrics.signatureCount ?? 0;
	const rawProductEvidenceSignatures =
		metrics.rawProductEvidenceSignatures ??
		metrics.productEvidenceSignatures ??
		0;
	const productEvidenceSignatures = metrics.productEvidenceSignatures ?? 0;
	summary.rawSignatureCount += rawSignatureCount;
	summary.signatureCount += actionableSignatureCount;
	const noProductRawSignatureCount = Math.max(
		0,
		rawSignatureCount - rawProductEvidenceSignatures
	);
	const noProductSignatureCount = Math.max(
		0,
		actionableSignatureCount - productEvidenceSignatures
	);
	summary.noProductRawSignatureCount += noProductRawSignatureCount;
	summary.noProductSignatureCount += noProductSignatureCount;
	summary.actionableSignatureCount += actionableSignatureCount;
	summary.nonActionableSignatureCount +=
		metrics.nonActionableSignatureCount ??
		Math.max( 0, rawSignatureCount - actionableSignatureCount );
	summary.knownInfraSignatures +=
		metrics.knownInfraSignatures ??
		metrics.statusCounts?.[ 'known-infra' ] ??
		0;
	summary.bootstrapStallSignatures +=
		metrics.bootstrapStallSignatures ??
		metrics.statusCounts?.[ 'bootstrap-stall' ] ??
		0;
	summary.familyCappedSignatures +=
		metrics.familyCappedSignatures ??
		metrics.statusCounts?.[ 'family-capped' ] ??
		0;
	summary.sourceSuppressedSignatures +=
		metrics.sourceSuppressedSignatures ??
		metrics.statusCounts?.[ 'source-suppressed' ] ??
		0;
	summary.staleSourceSignatures +=
		metrics.staleSourceSignatures ??
		metrics.statusCounts?.[ 'stale-source' ] ??
		0;
	summary.notRealSignatures +=
		metrics.notRealSignatures ?? metrics.statusCounts?.[ 'not-real' ] ?? 0;
	summary.infraSignatures +=
		metrics.infraSignatures ?? metrics.statusCounts?.infra ?? 0;
	summary.noRealisticReproSignatures +=
		metrics.noRealisticReproSignatures ??
		metrics.statusCounts?.[ 'no-realistic-repro' ] ??
		0;
	summary.analysisGatedNonActionableSignatures +=
		metrics.analysisGatedNonActionableSignatures ?? 0;
	summary.mergedDuplicateSignatures += metrics.mergedDuplicateSignatures ?? 0;
	summary.normalizationNoiseSignatures +=
		metrics.normalizationNoiseSignatures ?? 0;
	summary.rawProductEvidenceSignatures += rawProductEvidenceSignatures;
	summary.productEvidenceSignatures += productEvidenceSignatures;
	summary.likelyRealVisible += metrics.likelyRealVisible ?? 0;
	if (
		productEvidenceSignatures === 0 &&
		rawProductEvidenceSignatures === 0
	) {
		summary.noProductLikelyRealVisible += metrics.likelyRealVisible ?? 0;
	}
	summary.likelyRealMerged += metrics.likelyRealMerged ?? 0;
	summary.likelyRealOracleQuestion += metrics.likelyRealOracleQuestion ?? 0;
	summary.normalizationNoiseCandidates +=
		metrics.normalizationNoiseCandidates ?? 0;
	if (
		productEvidenceSignatures === 0 &&
		rawProductEvidenceSignatures === 0
	) {
		summary.noProductNormalizationNoiseCandidates +=
			metrics.normalizationNoiseCandidates ?? 0;
	}
	summary.bootstrapStalls += metrics.bootstrapStalls ?? 0;
	if ( includeSuppressedKnownNoise ) {
		addSuppressedKnownNoiseSummary( summary, metrics );
	}

	for ( const item of metrics.topActionableSemanticFamilies ??
		metrics.topSemanticFamilies ??
		[] ) {
		if ( ! item.family ) {
			continue;
		}
		familyCounts[ item.family ] =
			( familyCounts[ item.family ] ?? 0 ) + ( item.count ?? 0 );
		if ( productEvidenceSignatures === 0 ) {
			noProductFamilyCounts[ item.family ] =
				( noProductFamilyCounts[ item.family ] ?? 0 ) +
				( item.count ?? 0 );
		}
	}
	for ( const item of metrics.rawTopSemanticFamilies ??
		metrics.topPreDecisionFamilies ??
		metrics.topSemanticFamilies ??
		[] ) {
		if ( ! item.family ) {
			continue;
		}
		rawFamilyCounts[ item.family ] =
			( rawFamilyCounts[ item.family ] ?? 0 ) + ( item.count ?? 0 );
		if ( rawProductEvidenceSignatures === 0 ) {
			noProductRawFamilyCounts[ item.family ] =
				( noProductRawFamilyCounts[ item.family ] ?? 0 ) +
				( item.count ?? 0 );
		}
	}
}

function addSuppressedKnownNoiseSummary( summary, metrics ) {
	const suppressedStrictStartup =
		metrics.suppressedKnownNoise?.strictPreActionStartup ?? {};
	summary.suppressedStrictStartupRecords +=
		suppressedStrictStartup.recordCount ?? 0;
	summary.suppressedStrictStartupIdentities +=
		suppressedStrictStartup.identityCount ?? 0;
	const virtualCount =
		suppressedStrictStartup.identityCount ??
		suppressedStrictStartup.recordCount ??
		0;
	if ( virtualCount <= 0 ) {
		return;
	}
	summary.suppressedStrictStartupVirtualSignatures += virtualCount;
}

const NON_ACTIONABLE_TRIAGE_STATUSES = new Set( [
	'known-infra',
	'bootstrap-stall',
	'family-capped',
	'source-suppressed',
	'stale-source',
	'not-real',
	'infra',
	'no-realistic-repro',
] );

const NON_ACTIONABLE_TRIAGE_ACTIONS = new Set( [
	'merge_with_duplicate',
	'likely_duplicate',
	'suppress_as_infra',
	'keep_collecting',
	'false_positive',
	'not_real',
	'no_realistic_repro',
] );

const NON_ACTIONABLE_TRIAGE_CLASSIFICATIONS = new Set( [
	'not_real',
	'infra',
	'false_positive',
] );

function recordNonActionableTriageSignature( summary, reason ) {
	summary.nonActionableSignatureCount += 1;
	summary[ reason ] = ( summary[ reason ] ?? 0 ) + 1;
}

function getTriageDecisionAction( decision ) {
	return (
		decision?.recommendedTriageAction ??
		decision?.candidateStatus ??
		'unknown'
	);
}

function getEffectiveTriageDecision( signature, analysisJob, deepAnalysisJob ) {
	const decision = signature.analysisGate ?? signature.result ?? null;
	if ( decision ) {
		return decision;
	}

	const positiveJob = getEffectivePositiveAnalysisJob(
		analysisJob,
		deepAnalysisJob
	);
	if ( positiveJob ) {
		return {
			...positiveJob.result,
			resultPath:
				positiveJob.resultPath ?? positiveJob.result?.resultPath,
			sourceTier: positiveJob.sourceTier ?? positiveJob.tierName ?? null,
		};
	}

	const job = getEffectiveNonActionableAnalysisJob(
		analysisJob,
		deepAnalysisJob
	);
	if ( ! job ) {
		return null;
	}

	return {
		classification: null,
		candidateStatus: job.status,
		recommendedTriageAction: getRecommendedActionForAnalysisJobStatus(
			job.status
		),
		distinctBugType: signature.equivalenceClass ?? signature.familyKey,
		summary: job.reason ?? getAnalysisJobStatusReason( job.status ),
	};
}

function getEffectivePositiveAnalysisJob( analysisJob, deepAnalysisJob ) {
	for ( const job of [ deepAnalysisJob, analysisJob ] ) {
		if ( isVisiblePositiveAnalysisResult( job?.result ) ) {
			return job;
		}
	}

	return null;
}

function isVisiblePositiveAnalysisResult( result ) {
	if ( result?.classification !== 'likely_real' ) {
		return false;
	}
	const action = getTriageDecisionAction( result );
	return ! isLikelyRealMergedDecision( result, action );
}

function getEffectiveNonActionableAnalysisJob( analysisJob, deepAnalysisJob ) {
	for ( const job of [ deepAnalysisJob, analysisJob ] ) {
		if (
			job &&
			NON_ACTIONABLE_ANALYSIS_JOB_STATUSES.has( job.status ?? 'unknown' )
		) {
			return job;
		}
	}

	return null;
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

function getAnalysisJobStatusReason( status ) {
	if ( status === 'family-capped' ) {
		return 'semantic family already has an active or completed representative analysis';
	}
	if ( status === 'source-suppressed' ) {
		return 'source signature is no longer actionable for analysis';
	}
	return 'source signature is stale';
}

function isLikelyRealMergedDecision( decision, action ) {
	return (
		action === 'merge_with_duplicate' ||
		decision?.isDuplicateOf ||
		decision?.duplicateOf
	);
}

function getLikelyRealDisposition( signature, decision ) {
	if ( decision?.classification !== 'likely_real' ) {
		return null;
	}
	const action = getTriageDecisionAction( decision );
	if ( isLikelyRealMergedDecision( decision, action ) ) {
		return 'merged-duplicate';
	}
	if ( isLikelyTriageNormalizationNoise( signature ) ) {
		return 'oracle-question';
	}
	return 'visible';
}

function getTriageNonActionableReason(
	signature,
	decision,
	analysisJob = null,
	deepAnalysisJob = null
) {
	const status = signature?.status ?? 'unknown';
	if ( status === 'known-infra' ) {
		return 'knownInfraSignatures';
	}
	if (
		status === 'bootstrap-stall' ||
		signature?.equivalenceClass === 'pre-action-bootstrap-stall'
	) {
		return 'bootstrapStallSignatures';
	}
	if ( isNoProductInfraNoiseSignature( signature ) ) {
		return 'knownInfraSignatures';
	}
	if ( status === 'family-capped' ) {
		return 'familyCappedSignatures';
	}
	if ( status === 'source-suppressed' ) {
		return 'sourceSuppressedSignatures';
	}
	if ( status === 'stale-source' ) {
		return 'staleSourceSignatures';
	}
	const analysisJobStatus = getEffectiveNonActionableAnalysisJob(
		analysisJob,
		deepAnalysisJob
	)?.status;
	if ( analysisJobStatus === 'family-capped' ) {
		return 'familyCappedSignatures';
	}
	if ( analysisJobStatus === 'source-suppressed' ) {
		return 'sourceSuppressedSignatures';
	}
	if ( analysisJobStatus === 'stale-source' ) {
		return 'staleSourceSignatures';
	}
	if ( status === 'not-real' ) {
		return 'notRealSignatures';
	}
	if ( status === 'infra' ) {
		return 'infraSignatures';
	}
	if ( status === 'no-realistic-repro' ) {
		return 'noRealisticReproSignatures';
	}
	if (
		NON_ACTIONABLE_TRIAGE_STATUSES.has( status ) ||
		status === 'analysis-gated'
	) {
		const action = getTriageDecisionAction( decision );
		if (
			isLikelyRealMergedDecision( decision, action ) ||
			NON_ACTIONABLE_TRIAGE_ACTIONS.has( action ) ||
			NON_ACTIONABLE_TRIAGE_CLASSIFICATIONS.has(
				decision?.classification
			)
		) {
			return 'analysisGatedNonActionableSignatures';
		}
	}
	if ( decision?.classification === 'likely_real' ) {
		const action = getTriageDecisionAction( decision );
		if ( isLikelyRealMergedDecision( decision, action ) ) {
			return 'mergedDuplicateSignatures';
		}
	}
	if ( isLikelyTriageNormalizationNoise( signature ) ) {
		return 'normalizationNoiseSignatures';
	}
	return null;
}

function hasVisibleLikelyRealDecision( signature ) {
	const decision = signature?.analysisGate ?? signature?.result ?? null;
	return getLikelyRealDisposition( signature, decision ) === 'visible';
}

function hasSignatureProductEvidence( signature ) {
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
		!! facts.operationWitnessPhase ||
		hasVisibleLikelyRealDecision( signature )
	);
}

function isNoProductInfraNoiseSignature( signature ) {
	if ( ! signature || hasSignatureProductEvidence( signature ) ) {
		return false;
	}

	return NO_PRODUCT_INFRA_NOISE_PATTERN.test( signature.normalized ?? '' );
}

function getTriageSemanticFamily( signature ) {
	const decision = signature.analysisGate ?? signature.result;
	const family = canonicalizeTriageSemanticFamily(
		normalizeTriageSemanticFamilyLabel(
			decision?.distinctBugType ??
				signature.semanticFamilyKey ??
				signature.equivalenceClass ??
				signature.familyKey ??
				signature.hash ??
				'unknown'
		)
	);
	if ( family === 'unknown' ) {
		const inferredFamily =
			getProductEvidenceLifecycleTriageFamily( signature );
		if ( inferredFamily ) {
			return inferredFamily;
		}
	}
	if (
		family !== 'pre_action_bootstrap_stall' ||
		! hasSignatureProductEvidence( signature )
	) {
		return family;
	}

	const sourceFamily = canonicalizeTriageSemanticFamily(
		normalizeTriageSemanticFamilyLabel(
			signature.semanticFamilyKey ??
				signature.equivalenceClass ??
				signature.familyKey ??
				signature.hash ??
				'unknown'
		)
	);
	return sourceFamily === 'pre_action_bootstrap_stall'
		? signature.familyKey ?? signature.hash ?? sourceFamily
		: sourceFamily;
}

function getProductEvidenceLifecycleTriageFamily( signature ) {
	if ( ! hasSignatureProductEvidence( signature ) ) {
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

function normalizeTriageSemanticFamilyLabel( value ) {
	return String( value ?? 'unknown' )
		.toLowerCase()
		.replaceAll( '`', '' )
		.replaceAll( "'", '' )
		.replaceAll( '"', '' )
		.replace( /[^a-z0-9]+/g, '_' )
		.replace( /_+/g, '_' )
		.replace( /^_|_$/g, '' );
}

function canonicalizeTriageSemanticFamily( value ) {
	if (
		/rest_meta_database_error|rest.*meta.*database|wp_persisted_preferences/.test(
			value
		)
	) {
		return 'rest_meta_database_error';
	}
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
	if (
		/awareness.*save.*reload|save.*reload.*awareness|http_awareness_loss_after_save_reload/.test(
			value
		)
	) {
		return 'awareness_loss_after_save_reload';
	}
	if (
		/awareness.*reload|reload.*awareness|reload_rejoin|reload.*rejoin|rejoin.*reload|rediscovering?_peers?|peer_rediscovery|sync_cycle/.test(
			value
		)
	) {
		return 'reload_rejoin_awareness_stall';
	}
	if ( /late.*session.*awareness|late_session_awareness/.test( value ) ) {
		return 'late_session_awareness_stall';
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

function getDominantTriageFamily(
	triageYield,
	{ noProductOnly = false } = {}
) {
	const actionableTop =
		( noProductOnly
			? triageYield?.noProductTopSemanticFamilies
			: triageYield?.topSemanticFamilies )?.[ 0 ] ?? null;
	const rawTop =
		( noProductOnly
			? triageYield?.noProductRawTopSemanticFamilies
			: triageYield?.rawTopSemanticFamilies )?.[ 0 ] ?? null;
	const actionableShare = noProductOnly
		? triageYield?.noProductTopDuplicateFamilyShare ?? 0
		: triageYield?.topDuplicateFamilyShare ?? 0;
	const rawShare = noProductOnly
		? triageYield?.noProductRawTopDuplicateFamilyShare ?? 0
		: triageYield?.rawTopDuplicateFamilyShare ?? 0;
	if ( rawTop && rawShare >= actionableShare ) {
		return {
			family: rawTop.family ?? '',
			count: rawTop.count ?? 0,
			share: rawShare,
			source: 'raw',
		};
	}
	if ( actionableTop ) {
		return {
			family: actionableTop.family ?? '',
			count: actionableTop.count ?? 0,
			share: actionableShare,
			source: 'actionable',
		};
	}
	return null;
}

function getCurrentRunDuplicateNoiseHold(
	triageYield,
	{ allowGenericDuplicate = false, requireNoProductEvidence = true } = {}
) {
	const noProductOnly = requireNoProductEvidence;
	const signatureCount = noProductOnly
		? triageYield?.noProductSignatureCount ?? 0
		: triageYield?.signatureCount ?? 0;
	const rawSignatureCount = noProductOnly
		? triageYield?.noProductRawSignatureCount ?? 0
		: triageYield?.rawSignatureCount ?? 0;
	const likelyRealVisible = noProductOnly
		? triageYield?.noProductLikelyRealVisible ?? 0
		: triageYield?.likelyRealVisible ?? 0;
	const fullRunLikelyRealVisible = triageYield?.likelyRealVisible ?? 0;
	if (
		! triageYield ||
		Math.max(
			signatureCount,
			rawSignatureCount,
			triageYield.suppressedStrictStartupRecords ?? 0
		) === 0
	) {
		return null;
	}
	const likelyRealVeto = noProductOnly
		? likelyRealVisible
		: Math.max( likelyRealVisible, fullRunLikelyRealVisible );
	if ( likelyRealVeto > 0 ) {
		return null;
	}
	const topFamily =
		( noProductOnly
			? triageYield.noProductTopSemanticFamilies
			: triageYield.topSemanticFamilies )?.[ 0 ]?.family ?? '';
	const rawTopFamily =
		( noProductOnly
			? triageYield.noProductRawTopSemanticFamilies
			: triageYield.rawTopSemanticFamilies )?.[ 0 ]?.family ?? '';
	const dominantFamily = getDominantTriageFamily( triageYield, {
		noProductOnly,
	} );
	const dominantShare = Math.max(
		noProductOnly
			? triageYield.noProductTopDuplicateFamilyShare ?? 0
			: triageYield.topDuplicateFamilyShare ?? 0,
		noProductOnly
			? triageYield.noProductRawTopDuplicateFamilyShare ?? 0
			: triageYield.rawTopDuplicateFamilyShare ?? 0
	);
	const suppressedStrictStartupRecords =
		triageYield.suppressedStrictStartupRecords ?? 0;
	const suppressedStrictStartupVirtualSignatures = Math.max(
		triageYield.suppressedStrictStartupVirtualSignatures ?? 0,
		triageYield.suppressedStrictStartupIdentities ?? 0
	);
	const dominantStrictStartupCount =
		dominantFamily?.family === 'pre_action_bootstrap_stall'
			? dominantFamily.count
			: 0;
	const strictStartupIdentityCount = Math.max(
		dominantStrictStartupCount,
		triageYield.bootstrapStalls ?? 0,
		suppressedStrictStartupVirtualSignatures
	);
	const dominantSignatureCount = Math.max(
		signatureCount,
		rawSignatureCount
	);
	const nonSuppressedRawSignatureCount = Math.max(
		0,
		rawSignatureCount - suppressedStrictStartupVirtualSignatures
	);
	const suppressedStartupOnly =
		suppressedStrictStartupRecords > 0 &&
		signatureCount === 0 &&
		nonSuppressedRawSignatureCount === 0;
	const suppressedStartupShare =
		suppressedStrictStartupVirtualSignatures > 0
			? suppressedStrictStartupVirtualSignatures /
			  Math.max(
					rawSignatureCount,
					suppressedStrictStartupVirtualSignatures
			  )
			: 0;
	const strictStartupCount = Math.max(
		strictStartupIdentityCount,
		triageYield.bootstrapStalls ?? 0,
		suppressedStrictStartupRecords,
		suppressedStrictStartupVirtualSignatures,
		triageYield.summaryStrictStartupRecords ?? 0,
		triageYield.summaryStrictStartupFailures ?? 0
	);
	const productEvidenceCount = Math.max(
		triageYield.productEvidenceSignatures ?? 0,
		triageYield.rawProductEvidenceSignatures ?? 0,
		triageYield.summaryProductEvidenceRecords ?? 0
	);
	const fullRunSignatureCount = Math.max(
		triageYield.signatureCount ?? 0,
		triageYield.rawSignatureCount ?? 0,
		strictStartupCount + productEvidenceCount,
		strictStartupCount +
			productEvidenceCount +
			( triageYield.summaryOtherRecords ?? 0 ),
		strictStartupCount
	);
	const strictStartupFullRunShare =
		strictStartupCount > 0 && fullRunSignatureCount > 0
			? strictStartupCount / fullRunSignatureCount
			: 0;
	const hasZeroProductEvidence = productEvidenceCount === 0;
	const strictNoProductStartupThreshold = noProductOnly
		? NO_PRODUCT_STRICT_STARTUP_MIN_CANDIDATES
		: NO_PRODUCT_KNOWN_NOISE_DOMINANCE_MIN_CANDIDATES;
	const strictStartupHoldEvidenceCount =
		noProductOnly && hasZeroProductEvidence
			? Math.max(
					strictStartupIdentityCount,
					suppressedStrictStartupRecords
			  )
			: strictStartupIdentityCount;
	const startupDominatesFullCurrentRun =
		strictStartupHoldEvidenceCount >= strictNoProductStartupThreshold &&
		strictStartupFullRunShare >= TRIAGE_DUPLICATE_SHARE_HOLD;
	const duplicateDominated =
		dominantShare >= TRIAGE_DUPLICATE_SHARE_HOLD && likelyRealVisible === 0;
	const normalizationNoiseDominates =
		dominantShare >= TRIAGE_DUPLICATE_SHARE_HOLD &&
		( noProductOnly
			? triageYield.noProductNormalizationNoiseCandidates ?? 0
			: triageYield.normalizationNoiseCandidates ?? 0 ) >=
			TRIAGE_NOISE_DOMINANCE_MIN_CANDIDATES &&
		( noProductOnly
			? triageYield.noProductNormalizationNoiseCandidates ?? 0
			: triageYield.normalizationNoiseCandidates ?? 0 ) >
			likelyRealVisible;
	const bootstrapNoiseDominates =
		( suppressedStartupOnly ||
			suppressedStartupShare >= TRIAGE_DUPLICATE_SHARE_HOLD ||
			( duplicateDominated &&
				( topFamily === 'pre_action_bootstrap_stall' ||
					rawTopFamily === 'pre_action_bootstrap_stall' ) ) ) &&
		strictStartupCount > 0 &&
		strictStartupHoldEvidenceCount >= strictNoProductStartupThreshold &&
		( ! noProductOnly ||
			productEvidenceCount === 0 ||
			startupDominatesFullCurrentRun );
	const knownNoiseFamilyDominates =
		duplicateDominated &&
		dominantSignatureCount >=
			( noProductOnly
				? NO_PRODUCT_KNOWN_NOISE_DOMINANCE_MIN_CANDIDATES
				: TRIAGE_NOISE_DOMINANCE_MIN_CANDIDATES ) &&
		HISTORICAL_KNOWN_NOISE_FAMILIES.has( dominantFamily?.family ?? '' );
	const genericDuplicateNoiseDominates =
		allowGenericDuplicate &&
		requireNoProductEvidence &&
		duplicateDominated &&
		dominantSignatureCount >= TRIAGE_NOISE_DOMINANCE_MIN_CANDIDATES;

	if ( bootstrapNoiseDominates ) {
		let source = dominantFamily?.source ?? 'suppressed-startup';
		if ( suppressedStartupOnly ) {
			source = 'suppressed-strict-startup-only';
		} else if ( suppressedStartupShare >= dominantShare ) {
			source = 'suppressed-startup';
		}

		return {
			kind: 'startup-noise',
			family: 'pre_action_bootstrap_stall',
			count: strictStartupHoldEvidenceCount,
			share: Number(
				Math.max(
					suppressedStartupOnly ? 1 : 0,
					dominantShare,
					suppressedStartupShare,
					productEvidenceCount > 0 ? strictStartupFullRunShare : 0
				).toFixed( 4 )
			),
			source,
		};
	}
	if ( normalizationNoiseDominates ) {
		return {
			kind: 'known-noise',
			family: dominantFamily?.family ?? 'normalization-noise',
			count: noProductOnly
				? triageYield.noProductNormalizationNoiseCandidates ?? 0
				: triageYield.normalizationNoiseCandidates,
			share: dominantShare,
			source: dominantFamily?.source ?? 'normalization',
		};
	}
	if ( knownNoiseFamilyDominates || genericDuplicateNoiseDominates ) {
		return {
			kind: knownNoiseFamilyDominates
				? 'known-noise'
				: 'triage-duplicate-noise',
			family: dominantFamily?.family ?? 'unknown',
			count: dominantSignatureCount,
			share: dominantShare,
			source: dominantFamily?.source ?? 'current-run',
		};
	}
	return null;
}

function isCurrentNoProductStartupHold( hold ) {
	return (
		hold?.family === 'pre_action_bootstrap_stall' &&
		[ 'startup-noise', 'known-noise' ].includes( hold.kind ) &&
		( hold.count ?? 0 ) >= NO_PRODUCT_STRICT_STARTUP_MIN_CANDIDATES &&
		( hold.share ?? 0 ) >= TRIAGE_DUPLICATE_SHARE_HOLD
	);
}

function getEffectiveDuplicateNoiseHoldKind( hold ) {
	return isCurrentNoProductStartupHold( hold ) ? 'startup-noise' : hold?.kind;
}

function shouldHoldNoisyBlockTopOff( triageYield ) {
	return !! getCurrentRunDuplicateNoiseHold( triageYield, {
		allowGenericDuplicate: true,
		requireNoProductEvidence: false,
	} );
}

function normalizeNoisePauseKind( kind ) {
	const normalized = String( kind ?? '' )
		.toLowerCase()
		.replace( /_/g, '-' );
	if ( normalized === 'startup-noise' || normalized === 'startup-stall' ) {
		return 'startup-noise';
	}
	if ( normalized === 'triage-duplicate-noise' ) {
		return 'triage-duplicate-noise';
	}
	if ( normalized === 'known-noise' ) {
		return 'known-noise';
	}
	return null;
}

function getNoisePauseKind( reason, reasonKind = null ) {
	const structuredKind = normalizeNoisePauseKind( reasonKind );
	if ( structuredKind ) {
		return structuredKind;
	}
	if ( ! reason ) {
		return null;
	}

	if (
		/historical known-noise|observed startup known-noise prior/i.test(
			reason
		)
	) {
		return 'known-noise';
	}
	if (
		/current-run no-product startup-noise family pre_action_bootstrap_stall|active-current no-product startup-noise hold|strict\/no-product startup noise dominates this producer|no-product startup\/discovery noise|strict pre-action bootstrap noise guard|supervisor paused-startup-stall|startup-stall|continuing sticky startup-noise cooldown|(?:profile|group) .* produced \d+\/\d+ strict pre-action discovery\/startup failures/i.test(
			reason
		)
	) {
		return 'startup-noise';
	}
	if ( /triage yield is duplicate\/noise dominated/i.test( reason ) ) {
		return 'triage-duplicate-noise';
	}
	if ( /normalization noise|known-noise/i.test( reason ) ) {
		return 'known-noise';
	}
	return null;
}

function getStoredNoisePauseKind( value ) {
	return getNoisePauseKind( value?.reason, value?.reasonKind );
}

function getNoisePauseFamily( kind ) {
	if ( kind === 'startup-noise' ) {
		return 'pre_action_bootstrap_stall';
	}
	return null;
}

function isGroupScopedProductEvidenceDuplicateFamilyHoldFamily(
	family,
	groupName = null
) {
	return Boolean(
		groupName &&
			GROUP_SCOPED_PRODUCT_EVIDENCE_DUPLICATE_FAMILY_HOLD_FAMILIES.get(
				groupName
			)?.has( family )
	);
}

function isProductEvidenceDuplicateFamilyHoldFamily(
	family,
	groupName = null
) {
	return (
		PRODUCT_EVIDENCE_DUPLICATE_FAMILY_HOLD_FAMILIES.has( family ) ||
		isGroupScopedProductEvidenceDuplicateFamilyHoldFamily(
			family,
			groupName
		)
	);
}

function isProductEvidenceDuplicateFamilyHold( hold, groupName = null ) {
	const effectiveGroupName = hold?.groupName ?? hold?.group ?? groupName;
	return (
		hold?.kind === 'triage-duplicate-noise' &&
		isProductEvidenceDuplicateFamilyHoldFamily(
			hold?.family ?? '',
			effectiveGroupName
		)
	);
}

function shouldProductEvidenceDuplicateHoldBlockGroup( hold, group ) {
	if ( ! isProductEvidenceDuplicateFamilyHold( hold, group ) ) {
		return false;
	}
	const family = hold?.family ?? '';
	const holdGroup = hold?.groupName ?? hold?.group ?? null;
	if (
		holdGroup &&
		! PRODUCT_EVIDENCE_DUPLICATE_FAMILY_HOLD_FAMILIES.has( family ) &&
		isGroupScopedProductEvidenceDuplicateFamilyHoldFamily(
			family,
			holdGroup
		)
	) {
		return group === holdGroup;
	}
	return PRODUCT_EVIDENCE_DUPLICATE_FAMILY_HOLD_GROUPS.includes( group );
}

function hasProductEvidenceDuplicatePauseEvidence( value ) {
	const productEvidenceRecords = Number( value?.productEvidenceRecords );
	return (
		value?.hasProductEvidence === true ||
		( Number.isFinite( productEvidenceRecords ) &&
			productEvidenceRecords > 0 ) ||
		/product-evidence/i.test( value?.reason ?? '' )
	);
}

function getProductEvidenceDuplicateFamilyCooldownFromValue( value ) {
	const kind = getStoredNoisePauseKind( value );
	const family = canonicalizeTriageSemanticFamily(
		normalizeTriageSemanticFamilyLabel(
			value?.family ?? getNoisePauseFamily( kind ) ?? ''
		)
	);
	const groupName = value?.groupName ?? value?.group ?? null;
	if (
		kind !== 'triage-duplicate-noise' ||
		! isProductEvidenceDuplicateFamilyHoldFamily( family, groupName ) ||
		! hasProductEvidenceDuplicatePauseEvidence( value )
	) {
		return null;
	}
	const expiresAtMs = getPauseExpirationMs(
		value,
		TRIAGE_NOISE_PAUSE_COOLDOWN_HOURS
	);
	if ( expiresAtMs <= Date.now() ) {
		return null;
	}
	const productEvidenceRecords = Number( value?.productEvidenceRecords );
	const count =
		Number.isFinite( productEvidenceRecords ) && productEvidenceRecords > 0
			? productEvidenceRecords
			: 1;
	return {
		kind: 'triage-duplicate-noise',
		family,
		count,
		total: count,
		share: 1,
		source: value?.source ?? 'recent-product-evidence-family-cooldown',
		...( groupName ? { groupName } : {} ),
		representativeSignal: `productEvidenceRecords=${ count }`,
		at: value?.at ?? null,
		expiresAt: new Date( expiresAtMs ).toISOString(),
		preserveProductEvidence: true,
	};
}

function getRecentProductEvidenceDuplicateFamilyCooldown() {
	let best = null;
	const consider = ( candidate ) => {
		const cooldown =
			getProductEvidenceDuplicateFamilyCooldownFromValue( candidate );
		if ( ! cooldown ) {
			return;
		}
		if (
			! best ||
			Date.parse( cooldown.expiresAt ?? '' ) >
				Date.parse( best.expiresAt ?? '' )
		) {
			best = cooldown;
		}
	};

	for ( const [ group, paused ] of Object.entries(
		state.pausedGroups ?? {}
	) ) {
		consider( { ...paused, group } );
	}

	const eligibleActions = new Set( [
		'pause-group',
		'write-no-analysis-sentinel',
		'allow-noise-pause-below-materialization-floor',
	] );
	for ( const change of state.changes ?? [] ) {
		if ( ! eligibleActions.has( change?.action ) ) {
			continue;
		}
		consider( change );
	}

	return best;
}

function isNoisePauseReason( reason ) {
	return getNoisePauseKind( reason ) !== null;
}

function isExplicitStartupNoisePauseReason( reason ) {
	const value = reason ?? '';
	if (
		/continuing sticky known-noise|current-run triage is dominated|observed startup known-noise prior|historical known-noise/i.test(
			value
		)
	) {
		return false;
	}
	return /(?:profile|group) .* produced \d+\/\d+ strict pre-action discovery\/startup failures|supervisor paused-startup-stall|strict pre-action bootstrap noise guard|startup-stall|current-run no-product startup-noise family pre_action_bootstrap_stall|strict\/no-product startup noise dominates this producer|no-product startup\/discovery noise/i.test(
		value
	);
}

function isCrossRunNoisePause( value ) {
	const kind = getStoredNoisePauseKind( value );
	if ( kind === 'startup-noise' ) {
		return isCurrentOutputStartupNoiseCooldown( value );
	}
	if (
		kind === 'triage-duplicate-noise' &&
		getProductEvidenceDuplicateFamilyCooldownFromValue( value )
	) {
		return true;
	}
	return kind !== null && isCurrentOutputPause( value );
}

function getPauseExpirationMs( value, cooldownHours ) {
	const explicitExpiresAt = Date.parse( value?.expiresAt ?? '' );
	if ( Number.isFinite( explicitExpiresAt ) ) {
		return explicitExpiresAt;
	}

	const pausedAt = Date.parse( value?.at ?? '' );
	if ( ! Number.isFinite( pausedAt ) ) {
		return 0;
	}
	return pausedAt + cooldownHours * 60 * 60 * 1000;
}

function isCurrentOutputPause( value ) {
	return (
		typeof value?.outputDir === 'string' &&
		path.resolve( value.outputDir ) === path.resolve( OUTPUT_DIR )
	);
}

function isCurrentOutputStartupNoiseCooldown( pause ) {
	if ( ! pause ) {
		return false;
	}

	if (
		pause.currentOutputPause === false ||
		pause.reusableStartupNoisePause === true
	) {
		return false;
	}

	if (
		typeof pause.outputDir === 'string' &&
		path.resolve( pause.outputDir ) !== path.resolve( OUTPUT_DIR )
	) {
		return false;
	}

	if (
		typeof pause.originOutputDir === 'string' &&
		path.resolve( pause.originOutputDir ) !== path.resolve( OUTPUT_DIR )
	) {
		return false;
	}

	return pause.currentOutputPause === true || isCurrentOutputPause( pause );
}

function hasNoProductStartupPauseEvidence( value ) {
	const reason = `${ value?.reason ?? '' } ${
		value?.originalPauseReason ?? ''
	}`;
	const productEvidenceRecords = Number( value?.productEvidenceRecords );
	if (
		value?.hasProductEvidence === true ||
		( Number.isFinite( productEvidenceRecords ) &&
			productEvidenceRecords > 0 ) ||
		/mixed-product-evidence|product evidence present|product-evidence signatures are present|current supervisor state has product evidence|product-evidence representative visible|product-evidence coverage/i.test(
			reason
		)
	) {
		return false;
	}
	if ( value?.noProductOnly === true ) {
		return true;
	}
	if (
		Number.isFinite( productEvidenceRecords ) &&
		productEvidenceRecords === 0
	) {
		return true;
	}
	return /0 product-evidence record|no product-evidence signatures are present|current-run no-product startup-noise|strict\/no-product startup noise|no-product startup\/discovery noise/i.test(
		reason
	);
}

function hasPauseProductEvidence( value ) {
	const reason = `${ value?.reason ?? '' } ${
		value?.originalPauseReason ?? ''
	}`;
	const productEvidenceRecords = Number( value?.productEvidenceRecords );
	return (
		value?.hasProductEvidence === true ||
		( Number.isFinite( productEvidenceRecords ) &&
			productEvidenceRecords > 0 ) ||
		/mixed-product-evidence|product evidence present|product-evidence signatures are present|current supervisor state has product evidence|product-evidence representative visible|product-evidence coverage/i.test(
			reason
		)
	);
}

function normalizeReusableStartupNoisePause( value ) {
	const originOutputDir = value?.originOutputDir ?? value?.outputDir;
	const outputDir = originOutputDir ?? value?.outputDir;
	const productEvidenceRecords = Number( value?.productEvidenceRecords );
	const hasProductEvidence =
		value?.hasProductEvidence === true ||
		( Number.isFinite( productEvidenceRecords ) &&
			productEvidenceRecords > 0 );
	const noProductOnly =
		value?.noProductOnly ?? ( hasProductEvidence ? false : true );
	return {
		...value,
		reasonKind: 'startup-noise',
		family: 'pre_action_bootstrap_stall',
		...( outputDir ? { outputDir } : {} ),
		...( originOutputDir ? { originOutputDir } : {} ),
		currentOutputPause: false,
		reusableStartupNoisePause: true,
		noProductOnly,
		...( hasProductEvidence ? { hasProductEvidence: true } : {} ),
		...( Number.isFinite( productEvidenceRecords )
			? { productEvidenceRecords }
			: noProductOnly
			? { productEvidenceRecords: 0 }
			: {} ),
		preserveProductEvidence: true,
	};
}

function isReusableStartupNoisePause( value ) {
	return (
		getStoredNoisePauseKind( value ) === 'startup-noise' &&
		isExplicitStartupNoisePauseReason( value?.reason ) &&
		hasNoProductStartupPauseEvidence( value )
	);
}

function getUnexpiredNoisePause( value ) {
	if ( ! isCrossRunNoisePause( value ) ) {
		return null;
	}
	if (
		getStoredNoisePauseKind( value ) === 'startup-noise' &&
		( ! hasNoProductStartupPauseEvidence( value ) ||
			! isCurrentOutputStartupNoiseCooldown( value ) )
	) {
		return null;
	}
	const expiresAtMs = getPauseExpirationMs(
		value,
		TRIAGE_NOISE_PAUSE_COOLDOWN_HOURS
	);
	if ( expiresAtMs <= Date.now() ) {
		return null;
	}
	if ( getStoredNoisePauseKind( value ) === 'startup-noise' ) {
		return {
			...normalizeCurrentStartupNoisePause( value ),
			expiresAt: new Date( expiresAtMs ).toISOString(),
		};
	}
	return {
		...value,
		expiresAt: new Date( expiresAtMs ).toISOString(),
	};
}

function getUnexpiredNoisePausedGroups( pausedGroups ) {
	const preserved = {};
	for ( const [ group, value ] of Object.entries( pausedGroups ?? {} ) ) {
		const preservedPause = getUnexpiredNoisePause( value );
		if ( ! preservedPause ) {
			continue;
		}
		preserved[ group ] = preservedPause;
	}
	return preserved;
}

function getRecentNoisePauseCooldownFromHistory( group ) {
	const changes = Array.isArray( state.changes ) ? state.changes : [];
	const pauseActions = new Set( [
		'pause-group',
		'write-no-analysis-sentinel',
		'allow-noise-pause-below-materialization-floor',
		'sync-supervisor-startup-stall-pause',
		'import-previous-supervisor-startup-stall-pause',
	] );

	for ( let index = changes.length - 1; index >= 0; index-- ) {
		const change = changes[ index ];
		if ( change?.group !== group || ! pauseActions.has( change.action ) ) {
			continue;
		}
		const kind = getNoisePauseKind( change.reason, change.reasonKind );
		if ( ! kind ) {
			continue;
		}
		const candidate = {
			at: change.at,
			reason: change.reason,
			reasonKind: kind,
			outputDir: change.outputDir,
			originOutputDir: change.originOutputDir ?? change.outputDir,
			expiresAt: change.expiresAt,
			family: change.family ?? getNoisePauseFamily( kind ),
			source: change.source ?? 'recent-noise-pause-history',
			noProductOnly: change.noProductOnly,
			productEvidenceRecords: change.productEvidenceRecords,
			hasProductEvidence: change.hasProductEvidence,
			preserveProductEvidence: change.preserveProductEvidence,
		};
		const currentOutputPause = isCurrentOutputPause( candidate );
		if (
			( kind === 'startup-noise' &&
				! isCurrentOutputStartupNoiseCooldown( candidate ) &&
				! isReusableStartupNoisePause( candidate ) ) ||
			( kind !== 'startup-noise' && ! currentOutputPause )
		) {
			continue;
		}
		const atMs = Date.parse( change.at ?? '' );
		if ( ! Number.isFinite( atMs ) ) {
			continue;
		}
		const explicitExpiresAtMs = Date.parse( change.expiresAt ?? '' );
		const expiresAtMs = Number.isFinite( explicitExpiresAtMs )
			? explicitExpiresAtMs
			: atMs + TRIAGE_NOISE_PAUSE_COOLDOWN_HOURS * 60 * 60 * 1000;
		if ( expiresAtMs <= Date.now() ) {
			continue;
		}
		const normalizedStartupPause =
			kind === 'startup-noise' &&
			! isCurrentOutputStartupNoiseCooldown( candidate )
				? normalizeReusableStartupNoisePause( candidate )
				: null;
		return {
			at: change.at,
			expiresAt: new Date( expiresAtMs ).toISOString(),
			reason: change.reason,
			kind,
			family: change.family ?? getNoisePauseFamily( kind ),
			source: change.source ?? 'recent-noise-pause-history',
			originGroup: group,
			historyPause: true,
			currentOutputPause:
				kind === 'startup-noise'
					? normalizedStartupPause?.currentOutputPause !== false
					: currentOutputPause,
			reusableStartupNoisePause:
				normalizedStartupPause?.reusableStartupNoisePause === true,
			...( normalizedStartupPause?.originOutputDir
				? { originOutputDir: normalizedStartupPause.originOutputDir }
				: {} ),
			...( change.noProductOnly !== undefined
				? { noProductOnly: change.noProductOnly }
				: {} ),
			...( change.productEvidenceRecords !== undefined
				? { productEvidenceRecords: change.productEvidenceRecords }
				: {} ),
			...( change.hasProductEvidence !== undefined
				? { hasProductEvidence: change.hasProductEvidence }
				: {} ),
		};
	}
	return null;
}

function normalizeCurrentStartupNoisePause( value ) {
	const originOutputDir = value?.originOutputDir ?? value?.outputDir;
	const productEvidenceRecords = Number( value?.productEvidenceRecords );
	const hasProductEvidence =
		value?.hasProductEvidence === true ||
		( Number.isFinite( productEvidenceRecords ) &&
			productEvidenceRecords > 0 );
	return {
		...value,
		reasonKind: 'startup-noise',
		family: 'pre_action_bootstrap_stall',
		outputDir: value?.outputDir ?? OUTPUT_DIR,
		...( originOutputDir ? { originOutputDir } : {} ),
		noProductOnly: ! hasProductEvidence,
		...( hasProductEvidence ? { hasProductEvidence: true } : {} ),
		...( Number.isFinite( productEvidenceRecords )
			? { productEvidenceRecords }
			: hasProductEvidence
			? {}
			: { productEvidenceRecords: 0 } ),
		preserveProductEvidence: true,
	};
}

function getActiveNoisePauseForEntry( group, value ) {
	const kind = getStoredNoisePauseKind( value );
	if ( ! value || ! kind ) {
		return null;
	}
	const expiresAtMs = getPauseExpirationMs(
		value,
		TRIAGE_NOISE_PAUSE_COOLDOWN_HOURS
	);
	if ( expiresAtMs <= Date.now() ) {
		return null;
	}

	const currentOutputPause = isCurrentOutputPause( value );
	if (
		kind === 'startup-noise' &&
		! isCurrentOutputStartupNoiseCooldown( value ) &&
		! isReusableStartupNoisePause( value )
	) {
		return null;
	}

	const normalizedPaused =
		kind === 'startup-noise'
			? value.reusableStartupNoisePause === true ||
			  ! isCurrentOutputStartupNoiseCooldown( value )
				? normalizeReusableStartupNoisePause( value )
				: normalizeCurrentStartupNoisePause( value )
			: value;

	return {
		at: normalizedPaused.at,
		expiresAt: new Date( expiresAtMs ).toISOString(),
		reason: normalizedPaused.reason,
		kind,
		family: normalizedPaused.family ?? getNoisePauseFamily( kind ),
		source: normalizedPaused.source ?? 'paused-groups',
		originGroup: group,
		profile: PROFILE_BY_GROUP[ group ] ?? null,
		currentOutputPause:
			kind === 'startup-noise'
				? normalizedPaused.currentOutputPause !== false
				: currentOutputPause,
		reusableStartupNoisePause:
			kind === 'startup-noise'
				? normalizedPaused.reusableStartupNoisePause === true
				: false,
		...( normalizedPaused.originOutputDir
			? { originOutputDir: normalizedPaused.originOutputDir }
			: {} ),
		...( normalizedPaused.noProductOnly !== undefined
			? { noProductOnly: normalizedPaused.noProductOnly }
			: {} ),
		...( normalizedPaused.hasProductEvidence !== undefined
			? { hasProductEvidence: normalizedPaused.hasProductEvidence }
			: {} ),
		...( normalizedPaused.productEvidenceRecords !== undefined
			? {
					productEvidenceRecords:
						normalizedPaused.productEvidenceRecords,
			  }
			: {} ),
	};
}

function getActiveStartupNoiseCooldownBypass( group ) {
	const bypass = state.startupNoiseCooldownBypassGroups?.[ group ];
	if ( ! bypass ) {
		return null;
	}

	const expiresAtMs = Date.parse( bypass.expiresAt ?? '' );
	if ( ! Number.isFinite( expiresAtMs ) || expiresAtMs <= Date.now() ) {
		delete state.startupNoiseCooldownBypassGroups[ group ];
		return null;
	}

	return bypass;
}

function getStartupNoiseCooldownBypassExpiresAt( activeNoisePause ) {
	const graceExpiresAtMs =
		Date.now() +
		COVERAGE_GUIDANCE_STARTUP_COOLDOWN_RETRY_GRACE_MINUTES * 60 * 1000;
	const pauseExpiresAtMs = Date.parse( activeNoisePause?.expiresAt ?? '' );
	const expiresAtMs = Number.isFinite( pauseExpiresAtMs )
		? Math.min( pauseExpiresAtMs, graceExpiresAtMs )
		: graceExpiresAtMs;

	return new Date( expiresAtMs ).toISOString();
}

function recordStartupNoiseCooldownBypass( group, activeNoisePause, reason ) {
	state.startupNoiseCooldownBypassGroups ??= {};
	const expiresAt =
		getStartupNoiseCooldownBypassExpiresAt( activeNoisePause );
	state.startupNoiseCooldownBypassGroups[ group ] = {
		at: new Date().toISOString(),
		expiresAt,
		reason,
		sourcePauseAt: activeNoisePause?.at,
		sourcePauseGroup: activeNoisePause?.originGroup,
		sourcePauseScope: activeNoisePause?.scope,
		sourcePauseReason: activeNoisePause?.reason,
	};
	state.changes.push( {
		at: new Date().toISOString(),
		action: 'bypass-profile-startup-noise-cooldown-for-coverage-gap',
		group,
		reason,
		expiresAt,
		sourcePauseAt: activeNoisePause?.at,
		sourcePauseGroup: activeNoisePause?.originGroup,
		sourcePauseScope: activeNoisePause?.scope,
	} );
}

function getActiveNoisePauseCooldown( group ) {
	const pausedEntry = state.pausedGroups?.[ group ];
	const exactPause = getActiveNoisePauseForEntry( group, pausedEntry );
	if ( exactPause ) {
		return exactPause;
	}

	const historicalExactPause =
		getRecentNoisePauseCooldownFromHistory( group );
	if ( historicalExactPause ) {
		return historicalExactPause;
	}

	if ( getActiveStartupNoiseCooldownBypass( group ) ) {
		return null;
	}

	if ( ! shouldInheritProfileStartupNoiseCooldown( group ) ) {
		return null;
	}

	const profile = PROFILE_BY_GROUP[ group ];
	if ( ! profile ) {
		return null;
	}

	let profilePause = null;
	for ( const [ pausedGroup, paused ] of Object.entries(
		state.pausedGroups ?? {}
	) ) {
		if (
			pausedGroup === group ||
			PROFILE_BY_GROUP[ pausedGroup ] !== profile
		) {
			continue;
		}
		const candidate = getActiveNoisePauseForEntry( pausedGroup, paused );
		if (
			candidate?.kind !== 'startup-noise' ||
			candidate.noProductOnly === false
		) {
			continue;
		}
		if (
			! profilePause ||
			Date.parse( candidate.expiresAt ?? '' ) >
				Date.parse( profilePause.expiresAt ?? '' )
		) {
			profilePause = {
				...candidate,
				source: candidate.source ?? 'profile-startup-noise-cooldown',
				scope: 'profile',
				targetGroup: group,
			};
		}
	}

	return profilePause;
}

function isNoProductStartupNoiseCooldown( pause ) {
	if (
		pause?.kind !== 'startup-noise' ||
		( pause.family && pause.family !== 'pre_action_bootstrap_stall' )
	) {
		return false;
	}

	const productEvidenceRecords = Number( pause.productEvidenceRecords );
	return (
		pause.noProductOnly !== false &&
		pause.hasProductEvidence !== true &&
		! (
			Number.isFinite( productEvidenceRecords ) &&
			productEvidenceRecords > 0
		)
	);
}

function getFleetNoProductStartupNoiseHold() {
	const eligibleGroups = new Set( [
		...MATERIALIZATION_FLOOR_GROUPS,
		...PRODUCTIVE_FALLBACK_GROUPS,
		...HIGH_VALUE_EXPANSION_GROUPS,
	] );
	const pausesByGroup = new Map();
	const addPause = ( group, pause ) => {
		if (
			! eligibleGroups.has( group ) ||
			! isNoProductStartupNoiseCooldown( pause ) ||
			! (
				isCurrentOutputStartupNoiseCooldown( pause ) ||
				pause?.reusableStartupNoisePause === true
			)
		) {
			return;
		}
		const expiresAtMs = Date.parse( pause.expiresAt ?? '' );
		if ( Number.isFinite( expiresAtMs ) && expiresAtMs <= Date.now() ) {
			return;
		}
		pausesByGroup.set( group, {
			group,
			profile: PROFILE_BY_GROUP[ group ] ?? null,
			at: pause.at,
			expiresAt: pause.expiresAt,
			reason: pause.reason,
			source: pause.source ?? 'startup-noise-cooldown',
			originGroup: pause.originGroup ?? group,
		} );
	};

	for ( const [ group, paused ] of Object.entries(
		state.pausedGroups ?? {}
	) ) {
		addPause( group, getActiveNoisePauseForEntry( group, paused ) );
	}
	for ( const group of eligibleGroups ) {
		if ( pausesByGroup.has( group ) ) {
			continue;
		}
		addPause( group, getRecentNoisePauseCooldownFromHistory( group ) );
	}

	const pauses = [ ...pausesByGroup.values() ];
	const share =
		pauses.length > 0
			? pauses.length / Math.max( 1, eligibleGroups.size )
			: 0;
	if (
		pauses.length < FLEET_STARTUP_NOISE_HOLD_MIN_GROUPS ||
		share < FLEET_STARTUP_NOISE_HOLD_MIN_SHARE
	) {
		return null;
	}

	let latestExpiresAt = null;
	for ( const pause of pauses ) {
		const expiresAtMs = Date.parse( pause.expiresAt ?? '' );
		if (
			Number.isFinite( expiresAtMs ) &&
			( ! latestExpiresAt || expiresAtMs > Date.parse( latestExpiresAt ) )
		) {
			latestExpiresAt = pause.expiresAt;
		}
	}

	return {
		kind: 'startup-noise',
		family: 'pre_action_bootstrap_stall',
		count: pauses.length,
		share: Number( share.toFixed( 4 ) ),
		source: 'fleet-startup-noise-cooldown',
		noProductOnly: true,
		productEvidenceRecords: 0,
		preserveProductEvidence: true,
		fleetStartupNoiseHold: true,
		groups: pauses.map( ( pause ) => pause.group ).sort(),
		profiles: [
			...new Set(
				pauses.map( ( pause ) => pause.profile ).filter( Boolean )
			),
		].sort(),
		...( latestExpiresAt ? { expiresAt: latestExpiresAt } : {} ),
	};
}

function isStartupHoldBlockingProducerSelection( hold ) {
	return (
		isCurrentNoProductStartupHold( hold ) ||
		hold?.fleetStartupNoiseHold === true
	);
}

function startupHoldIncludesGroup( hold, group ) {
	return Array.isArray( hold?.groups ) && hold.groups.includes( group );
}

function isStartupHoldBlockingProducerGroup( hold, group ) {
	if ( ! isStartupHoldBlockingProducerSelection( hold ) ) {
		return false;
	}
	if ( Array.isArray( hold?.groups ) && hold.groups.length > 0 ) {
		return startupHoldIncludesGroup( hold, group );
	}
	if ( hold?.fleetStartupNoiseHold === true ) {
		return startupHoldIncludesGroup( hold, group );
	}
	if ( hold?.targetGroup && hold.targetGroup === group ) {
		return true;
	}
	if ( hold?.originGroup && hold.originGroup === group ) {
		return true;
	}
	if ( hold?.groupName && hold.groupName === group ) {
		return true;
	}
	if (
		hold?.profile &&
		PROFILE_BY_GROUP[ group ] &&
		PROFILE_BY_GROUP[ group ] === hold.profile
	) {
		return true;
	}
	return false;
}

function shouldInheritProfileStartupNoiseCooldown() {
	return true;
}

function isNoProductSupervisorStartupPause( groupState ) {
	if ( ! groupState || typeof groupState !== 'object' ) {
		return false;
	}

	const pauseUntilMs = Date.parse( groupState.startupStallPausedUntil ?? '' );
	const drainRecordedUntilMs = Date.parse(
		groupState.startupStallDrainRecordedUntil ?? ''
	);
	const cooldownUntilMs = Math.max(
		Number.isFinite( pauseUntilMs ) ? pauseUntilMs : 0,
		Number.isFinite( drainRecordedUntilMs ) ? drainRecordedUntilMs : 0
	);
	if ( cooldownUntilMs <= Date.now() ) {
		return false;
	}

	if (
		groupState.status !== 'paused-startup-stall' &&
		! groupState.startupStallPausedUntil &&
		! groupState.startupStallDrainRecordedUntil
	) {
		return false;
	}

	const reason = groupState.lastReason ?? '';
	if (
		getNoisePauseKind( reason ) !== 'startup-noise' &&
		! /startup-stall|startup failures?|bootstrap noise guard/i.test(
			reason
		)
	) {
		return false;
	}

	const productEvidenceRecords =
		groupState.startupStallNoiseSummary?.productEvidenceRecords;
	if ( Number.isFinite( productEvidenceRecords ) ) {
		return (
			productEvidenceRecords === 0 ||
			!! getSupervisorStartupNoiseHold( groupState )
		);
	}

	return (
		/0 product-evidence record/.test( reason ) ||
		!! getSupervisorStartupNoiseHold( groupState )
	);
}

function createSupervisorStartupPause(
	groupState,
	outputDir,
	{ originOutputDir = outputDir } = {}
) {
	const reason = groupState.lastReason
		? `supervisor paused-startup-stall: ${ groupState.lastReason }`
		: 'supervisor paused-startup-stall: no-product startup/discovery noise';
	const pauseUntilMs = Date.parse( groupState.startupStallPausedUntil ?? '' );
	const drainRecordedUntilMs = Date.parse(
		groupState.startupStallDrainRecordedUntil ?? ''
	);
	const cooldownUntilMs = Math.max(
		Number.isFinite( pauseUntilMs ) ? pauseUntilMs : 0,
		Number.isFinite( drainRecordedUntilMs ) ? drainRecordedUntilMs : 0
	);
	const productEvidenceRecords =
		groupState.startupStallNoiseSummary?.productEvidenceRecords;
	const hasProductEvidence =
		Number.isFinite( productEvidenceRecords ) && productEvidenceRecords > 0;
	return {
		at:
			groupState.startupStallPausedAt ??
			groupState.startupStallDrainRecordedAt ??
			new Date().toISOString(),
		reason,
		reasonKind: 'startup-noise',
		family: 'pre_action_bootstrap_stall',
		source: groupState.startupStallPausedUntil
			? 'supervisor-paused-startup-stall'
			: 'supervisor-startup-stall-drain',
		outputDir,
		...( originOutputDir &&
		path.resolve( originOutputDir ) !== path.resolve( outputDir )
			? { originOutputDir }
			: {} ),
		expiresAt: new Date( cooldownUntilMs ).toISOString(),
		noProductOnly: ! hasProductEvidence,
		...( hasProductEvidence ? { hasProductEvidence: true } : {} ),
		productEvidenceRecords: Number.isFinite( productEvidenceRecords )
			? productEvidenceRecords
			: 0,
		preserveProductEvidence: true,
	};
}

async function syncSupervisorStartupStallPauses(
	supervisorState,
	{
		outputDir = OUTPUT_DIR,
		originOutputDir = outputDir,
		action = 'sync-supervisor-startup-stall-pause',
		summaryAction = 'sync-supervisor-startup-stall-pauses',
		summaryReason = 'imported current supervisor startup-stall pauses into novelty scheduling state while preserving product-evidence signatures',
	} = {}
) {
	let synced = 0;
	for ( const groupState of supervisorState?.groups ?? [] ) {
		if ( ! isNoProductSupervisorStartupPause( groupState ) ) {
			continue;
		}
		const nextPause = createSupervisorStartupPause( groupState, outputDir, {
			originOutputDir,
		} );
		const existing = state.pausedGroups?.[ groupState.name ];
		if (
			existing?.source === nextPause.source &&
			existing.expiresAt === nextPause.expiresAt &&
			existing.reason === nextPause.reason
		) {
			continue;
		}
		state.pausedGroups[ groupState.name ] = nextPause;
		synced += 1;
		state.changes.push( {
			at: new Date().toISOString(),
			action,
			group: groupState.name,
			reason: nextPause.reason,
			outputDir: nextPause.outputDir,
			...( nextPause.originOutputDir
				? { originOutputDir: nextPause.originOutputDir }
				: {} ),
			expiresAt: nextPause.expiresAt,
			reasonKind: nextPause.reasonKind,
			family: nextPause.family,
			source: nextPause.source,
			noProductOnly: nextPause.noProductOnly,
			...( nextPause.hasProductEvidence
				? { hasProductEvidence: true }
				: {} ),
			productEvidenceRecords: nextPause.productEvidenceRecords,
			preserveProductEvidence: true,
		} );
	}
	if ( synced > 0 ) {
		state.changes.push( {
			at: new Date().toISOString(),
			action: summaryAction,
			count: synced,
			reason: summaryReason,
		} );
	}
	return synced;
}

async function importSupervisorStartupStallPausesFromOutputDir( outputDir ) {
	if (
		! outputDir ||
		outputDir === 'unknown' ||
		path.resolve( outputDir ) === path.resolve( OUTPUT_DIR )
	) {
		return 0;
	}

	const supervisorState = await readJsonFile(
		path.join( outputDir, 'supervisor-state.json' )
	);
	if ( ! Array.isArray( supervisorState?.groups ) ) {
		return 0;
	}

	let imported = 0;
	for ( const groupState of supervisorState.groups ) {
		if (
			! groupState?.name ||
			! isNoProductSupervisorStartupPause( groupState )
		) {
			continue;
		}
		const importedPause = normalizeReusableStartupNoisePause(
			createSupervisorStartupPause( groupState, outputDir, {
				originOutputDir: outputDir,
			} )
		);
		const expiresAtMs = getPauseExpirationMs(
			importedPause,
			TRIAGE_NOISE_PAUSE_COOLDOWN_HOURS
		);
		if ( expiresAtMs <= Date.now() ) {
			continue;
		}
		const existingPause = getActiveNoisePauseForEntry(
			groupState.name,
			state.pausedGroups?.[ groupState.name ]
		);
		const existingExpiresAtMs = existingPause
			? getPauseExpirationMs(
					existingPause,
					TRIAGE_NOISE_PAUSE_COOLDOWN_HOURS
			  )
			: 0;
		if ( existingPause && existingExpiresAtMs >= expiresAtMs ) {
			continue;
		}
		state.pausedGroups[ groupState.name ] = {
			...importedPause,
			expiresAt: new Date( expiresAtMs ).toISOString(),
		};
		imported += 1;
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'import-previous-supervisor-startup-stall-pause',
			group: groupState.name,
			reason: importedPause.reason,
			outputDir: OUTPUT_DIR,
			originOutputDir: outputDir,
			expiresAt: state.pausedGroups[ groupState.name ].expiresAt,
			reasonKind: importedPause.reasonKind,
			family: importedPause.family,
			source: importedPause.source,
			noProductOnly: importedPause.noProductOnly,
			productEvidenceRecords: importedPause.productEvidenceRecords,
			preserveProductEvidence: true,
		} );
	}
	if ( imported > 0 ) {
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'import-previous-supervisor-startup-stall-pauses',
			count: imported,
			originOutputDir: outputDir,
			reason: 'imported previous-root no-product startup-stall producer cooldowns as reusable scheduling holds while preserving product-evidence signatures',
		} );
	}
	return imported;
}

function supervisorGroupHasProductEvidence( groupState ) {
	return (
		( groupState?.startupStallNoiseSummary?.productEvidenceRecords ?? 0 ) >
		0
	);
}

function getSupervisorPausedNoAnalysisRunDirs( groupState ) {
	const pauseUntilMs = Date.parse(
		groupState?.startupStallPausedUntil ?? ''
	);
	const drainRecordedUntilMs = Date.parse(
		groupState?.startupStallDrainRecordedUntil ?? ''
	);
	const hasActiveStartupNoiseRecord =
		( Number.isFinite( pauseUntilMs ) && pauseUntilMs > Date.now() ) ||
		( Number.isFinite( drainRecordedUntilMs ) &&
			drainRecordedUntilMs > Date.now() );
	if ( ! hasActiveStartupNoiseRecord ) {
		return [];
	}

	return [
		...( groupState.noAnalysisRunDirs ?? [] ),
		...( groupState.startupStallRunDirs ?? [] ),
	].filter( Boolean );
}

function getSupervisorGroupActiveRunDirs( groupState ) {
	if ( ! ACTIVE_GROUP_STATUSES.has( groupState?.status ) ) {
		return [];
	}
	return [
		...new Set( [
			...( groupState?.activeRunDirs ?? [] ),
			groupState?.currentRunDir,
		] ),
	].filter( Boolean );
}

function getSupervisorGroupRunDirs( groupState ) {
	return [
		...new Set( [
			...getSupervisorGroupActiveRunDirs( groupState ),
			...getSupervisorPausedNoAnalysisRunDirs( groupState ),
		] ),
	].filter( Boolean );
}

function getRunGroupsForRunDirs( runDirs = [] ) {
	return [
		...new Set(
			( runDirs ?? [] )
				.map( ( runDir ) => getRunGroupNameFromPath( runDir ) )
				.filter( Boolean )
		),
	].sort();
}

function withRunDirProducerGroups( hold, runDirs = [] ) {
	if ( ! hold ) {
		return null;
	}
	const groups = getRunGroupsForRunDirs( runDirs );
	if ( groups.length === 0 ) {
		return hold;
	}
	return {
		...hold,
		groups: [
			...new Set( [ ...( hold.groups ?? [] ), ...groups ] ),
		].sort(),
	};
}

function noiseHoldsMatch( rootHold, groupHold ) {
	if ( ! rootHold || ! groupHold ) {
		return false;
	}
	if ( rootHold.family && groupHold.family === rootHold.family ) {
		return true;
	}
	return (
		rootHold.kind === 'startup-noise' && groupHold.kind === 'startup-noise'
	);
}

function getSupervisorStartupNoiseHold( groupState ) {
	const summary = groupState?.startupStallNoiseSummary;
	const strictStartupRecords = summary?.strictStartupRecords ?? 0;
	const strictStartupIdentities =
		summary?.strictStartupFailures ?? strictStartupRecords;
	const productEvidenceRecords = summary?.productEvidenceRecords ?? 0;
	const strictStartupRecordShare =
		summary?.strictStartupRecordShare ??
		( strictStartupRecords > 0
			? strictStartupRecords /
			  Math.max(
					strictStartupRecords +
						productEvidenceRecords +
						( summary?.otherRecords ?? 0 ),
					strictStartupRecords
			  )
			: 0 );
	const hasZeroProductEvidence = productEvidenceRecords === 0;
	const strictStartupHoldEvidenceCount = hasZeroProductEvidence
		? Math.max( strictStartupIdentities, strictStartupRecords )
		: strictStartupIdentities;
	const minStrictStartupFailures = hasZeroProductEvidence
		? NO_PRODUCT_STRICT_STARTUP_MIN_CANDIDATES
		: NO_PRODUCT_KNOWN_NOISE_DOMINANCE_MIN_CANDIDATES;
	if (
		! summary ||
		strictStartupRecords === 0 ||
		strictStartupHoldEvidenceCount < minStrictStartupFailures ||
		( productEvidenceRecords > 0 &&
			strictStartupRecordShare < TRIAGE_DUPLICATE_SHARE_HOLD )
	) {
		return null;
	}
	return {
		kind: 'startup-noise',
		family: 'pre_action_bootstrap_stall',
		count: strictStartupHoldEvidenceCount,
		records: strictStartupRecords,
		share: strictStartupRecordShare,
		source:
			productEvidenceRecords > 0
				? 'supervisor-startup-summary-mixed-product-evidence'
				: 'supervisor-startup-summary',
	};
}

function hasTriageYieldProductEvidence( triageYield ) {
	return getTriageYieldProductEvidenceRecordCount( triageYield ) > 0;
}

function getTriageYieldProductEvidenceRecordCount( triageYield ) {
	return Math.max(
		triageYield?.productEvidenceSignatures ?? 0,
		triageYield?.rawProductEvidenceSignatures ?? 0,
		triageYield?.summaryProductEvidenceRecords ?? 0
	);
}

function shouldPauseDuplicateNoiseProducer( producer ) {
	if ( ! producer?.hasProductEvidence ) {
		return true;
	}
	if ( isProductEvidenceDuplicateFamilyHold( producer.hold ) ) {
		return true;
	}
	if ( ( producer.triageYield?.likelyRealVisible ?? 0 ) > 0 ) {
		return false;
	}
	if (
		producer.hold?.kind !== 'startup-noise' ||
		producer.hold?.family !== 'pre_action_bootstrap_stall'
	) {
		return false;
	}
	return ( producer.hold?.share ?? 0 ) >= TRIAGE_DUPLICATE_SHARE_HOLD;
}

function shouldBlockRefillForDuplicateNoiseProducer( producer ) {
	if ( ( producer?.triageYield?.likelyRealVisible ?? 0 ) > 0 ) {
		return false;
	}
	return (
		( producer?.hold?.kind === 'startup-noise' &&
			producer.hold.family === 'pre_action_bootstrap_stall' ) ||
		isProductEvidenceDuplicateFamilyHold( producer?.hold )
	);
}

function getDuplicateNoiseProducerReason( producer, { pause } = {} ) {
	let productEvidenceNote =
		'product-evidence signatures are present, so keep lanes running and mark no-analysis for no-product signatures only';
	let scope = 'current-run no-product';
	const effectiveHoldKind =
		getEffectiveDuplicateNoiseHoldKind( producer.hold ) ??
		producer.hold.kind;
	if ( isCurrentNoProductStartupHold( producer.hold ) ) {
		productEvidenceNote =
			pause && producer.hasProductEvidence
				? 'strict/no-product startup noise dominates this producer, so pause lanes while preserving product-evidence signatures'
				: pause
				? 'no product-evidence signatures are present in the contributing run dir, so pause lanes and mark no-analysis for no-product signatures only'
				: productEvidenceNote;
	} else if ( isProductEvidenceDuplicateFamilyHold( producer.hold ) ) {
		scope = 'current-run product-evidence duplicate';
		productEvidenceNote = pause
			? 'a product-evidence representative is already visible or family-capping siblings, so pause lanes while preserving product-evidence signatures'
			: 'product-evidence signatures are present, so keep signatures visible and mark no-analysis for no-product signatures only';
	} else if ( pause && producer.hasProductEvidence ) {
		productEvidenceNote =
			'strict/no-product startup noise dominates this producer, so pause lanes while preserving product-evidence signatures';
	} else if ( pause ) {
		productEvidenceNote =
			'no product-evidence signatures are present in the contributing run dir, so pause lanes and mark no-analysis for no-product signatures only';
	}
	return `triage yield is duplicate/noise dominated: ${ scope } ${ effectiveHoldKind } family ${ producer.hold.family } from active producer ${ producer.name } (${ producer.hold.count } signatures, share=${ producer.hold.share }, source=${ producer.hold.source }); ${ productEvidenceNote }`;
}

async function getActiveDuplicateNoiseProducerGroups(
	supervisorState,
	rootHold = null
) {
	const groups = [];
	for ( const groupState of supervisorState?.groups ?? [] ) {
		if (
			! groupState?.name ||
			! ACTIVE_GROUP_STATUSES.has( groupState.status )
		) {
			continue;
		}
		const runDirs = getSupervisorGroupActiveRunDirs( groupState );
		if ( runDirs.length === 0 ) {
			continue;
		}
		const groupTriageYield = await summarizeTriageYield( runDirs );
		const productEvidenceDuplicateHold = getDominantRealUserFamilyHold(
			groupTriageYield,
			{ groupName: groupState.name }
		);
		const noProductHold = getCurrentRunDuplicateNoiseHold(
			groupTriageYield,
			{
				allowGenericDuplicate: true,
				requireNoProductEvidence: true,
			}
		);
		const groupHold =
			noProductHold ??
			getSupervisorStartupNoiseHold( groupState ) ??
			productEvidenceDuplicateHold;
		if ( ! groupHold ) {
			continue;
		}
		const hasProductEvidence =
			hasTriageYieldProductEvidence( groupTriageYield ) ||
			supervisorGroupHasProductEvidence( groupState );
		groups.push( {
			name: groupState.name,
			runDirs,
			hold: groupHold,
			rootHold,
			triageYield: groupTriageYield,
			hasProductEvidence,
			productEvidenceRecords: hasProductEvidence
				? Math.max(
						getTriageYieldProductEvidenceRecordCount(
							groupTriageYield
						),
						groupState?.startupStallNoiseSummary
							?.productEvidenceRecords ?? 0
				  )
				: 0,
		} );
	}
	return groups;
}

function getDominantRealUserFamilyHold(
	triageYield,
	{ groupName = null } = {}
) {
	if (
		! triageYield ||
		Math.max(
			triageYield.signatureCount ?? 0,
			triageYield.rawSignatureCount ?? 0
		) === 0 ||
		! hasTriageYieldProductEvidence( triageYield )
	) {
		return null;
	}
	if ( ( triageYield.likelyRealVisible ?? 0 ) > 0 ) {
		return null;
	}

	const representativeSignals = {
		completedRepresentative:
			triageYield.productEvidenceDuplicateRepresentatives ?? 0,
		likelyRealVisible: triageYield.likelyRealVisible ?? 0,
		likelyRealMerged: triageYield.likelyRealMerged ?? 0,
	};
	const representativeFamilies =
		triageYield.productEvidenceDuplicateRepresentativeFamilies ?? {};
	const hasFamilySpecificRepresentatives =
		Object.keys( representativeFamilies ).length > 0;
	const familyCappedRepresentativeCount =
		triageYield.familyCappedSignatures ?? 0;
	if (
		Math.max(
			...Object.values( representativeSignals ),
			familyCappedRepresentativeCount
		) === 0
	) {
		return null;
	}

	const candidates = [
		{
			source: 'raw',
			topFamilies: triageYield.rawTopSemanticFamilies ?? [],
			total: triageYield.rawSignatureCount ?? 0,
		},
		{
			source: 'actionable',
			topFamilies: triageYield.topSemanticFamilies ?? [],
			total: triageYield.signatureCount ?? 0,
		},
	];
	const representativeSignal = Object.entries( representativeSignals )
		.filter( ( [ , value ] ) => value > 0 )
		.map( ( [ key, value ] ) => `${ key }=${ value }` )
		.join( ',' );
	const familyCandidates = [];

	for ( const candidate of candidates ) {
		for ( const topFamily of candidate.topFamilies ) {
			const family = topFamily?.family ?? '';
			const count = topFamily?.count ?? 0;
			const share =
				candidate.total > 0
					? Number( ( count / candidate.total ).toFixed( 4 ) )
					: 0;
			if (
				! isProductEvidenceDuplicateFamilyHoldFamily(
					family,
					groupName
				) ||
				count < PRODUCT_EVIDENCE_DUPLICATE_FAMILY_HOLD_MIN_CANDIDATES ||
				share < TRIAGE_DUPLICATE_SHARE_HOLD
			) {
				continue;
			}
			const representativeCount = representativeFamilies[ family ] ?? 0;
			const familyCappedRepresentative =
				isGroupScopedProductEvidenceDuplicateFamilyHoldFamily(
					family,
					groupName
				)
					? familyCappedRepresentativeCount
					: 0;
			if (
				hasFamilySpecificRepresentatives &&
				representativeCount <= 0 &&
				familyCappedRepresentative <= 0
			) {
				continue;
			}
			const familyRepresentativeSignal = [
				representativeCount > 0
					? `familyRepresentatives=${ representativeCount }`
					: representativeSignal,
				familyCappedRepresentative > 0
					? `familyCapped=${ familyCappedRepresentative }`
					: '',
			]
				.filter( Boolean )
				.join( ',' );
			familyCandidates.push( {
				kind: 'triage-duplicate-noise',
				family,
				count,
				share,
				source: `${ candidate.source }-product-evidence-family`,
				total: candidate.total,
				representativeSignal: familyRepresentativeSignal,
				...( groupName ? { groupName } : {} ),
			} );
		}
	}

	if ( familyCandidates.length ) {
		familyCandidates.sort(
			( a, b ) => b.share - a.share || b.count - a.count
		);
		return familyCandidates[ 0 ];
	}

	return null;
}

function getCurrentRunProductEvidenceDuplicateHold(
	triageYield,
	runDirs = []
) {
	const globalHold = getDominantRealUserFamilyHold( triageYield );
	if ( globalHold ) {
		return globalHold;
	}

	for ( const groupName of new Set(
		( runDirs ?? [] ).map( getRunGroupNameFromPath ).filter( Boolean )
	) ) {
		const groupHold = getDominantRealUserFamilyHold( triageYield, {
			groupName,
		} );
		if ( groupHold ) {
			return groupHold;
		}
	}

	return null;
}

async function applyActiveNoiseCooldownsToEnabledGroups( supervisorState ) {
	const enabled = new Set( state.enabledGroups ?? [] );
	const supervisorGroupsByName = new Map(
		( supervisorState?.groups ?? [] ).map( ( groupState ) => [
			groupState.name,
			groupState,
		] )
	);
	let paused = 0;
	let restored = 0;

	const getCurrentOutputActiveRunDirs = ( groupState ) => {
		const currentOutputRoot = `${ path.resolve( OUTPUT_DIR ) }${
			path.sep
		}`;
		return ( groupState?.activeRunDirs ?? [] ).filter( ( runDir ) =>
			path.resolve( runDir ).startsWith( currentOutputRoot )
		);
	};

	const activeCanaryGroup =
		state.emptyMaterializationStartupNoiseCanary?.group;
	const emptyMaterializationCanaryStartedAt = Date.parse(
		state.emptyMaterializationStartupNoiseCanary?.at ?? ''
	);
	const emptyMaterializationCanaryStartupGraceActive =
		Number.isFinite( emptyMaterializationCanaryStartedAt ) &&
		Date.now() - emptyMaterializationCanaryStartedAt < 10 * 60 * 1000;
	if ( activeCanaryGroup && ! enabled.has( activeCanaryGroup ) ) {
		const activeNoisePause =
			getActiveNoisePauseCooldown( activeCanaryGroup );
		const supervisorGroupState =
			supervisorGroupsByName.get( activeCanaryGroup );
		const canaryActiveRunDirs =
			getCurrentOutputActiveRunDirs( supervisorGroupState );
		const canaryHasProductEvidence =
			supervisorGroupHasProductEvidence( supervisorGroupState );
		if (
			isNoProductStartupNoiseCooldown( activeNoisePause ) &&
			! canaryHasProductEvidence
		) {
			const marker = [
				activeCanaryGroup,
				activeNoisePause.at ?? '',
				activeNoisePause.expiresAt ?? '',
				canaryActiveRunDirs.join( ',' ),
				'blocked-reconcile',
			].join( '|' );
			if (
				state.emptyMaterializationStartupNoiseCanary
					.reconcileBlockedMarker !== marker
			) {
				state.emptyMaterializationStartupNoiseCanary = {
					...state.emptyMaterializationStartupNoiseCanary,
					reconcileBlockedMarker: marker,
					reconcileBlockedAt: new Date().toISOString(),
				};
				state.changes.push( {
					at: state.emptyMaterializationStartupNoiseCanary
						.reconcileBlockedAt,
					action: 'block-reconcile-empty-materialization-startup-noise-canary',
					group: activeCanaryGroup,
					activeRunDirs: canaryActiveRunDirs,
					reason: 'not re-adding an empty-materialization canary while its reusable no-product startup-noise cooldown is active; product-evidence signatures from prior runs remain visible, but the producer stays stopped',
					expiresAt: activeNoisePause.expiresAt,
				} );
			}
		} else if (
			activeNoisePause &&
			( emptyMaterializationCanaryStartupGraceActive ||
				( ACTIVE_GROUP_STATUSES.has( supervisorGroupState?.status ) &&
					canaryActiveRunDirs.length > 0 ) )
		) {
			enabled.add( activeCanaryGroup );
			restored += 1;
			state.emptyMaterializationStartupNoiseCanary = {
				...state.emptyMaterializationStartupNoiseCanary,
				reconciledAt: new Date().toISOString(),
			};
			state.changes.push( {
				at: state.emptyMaterializationStartupNoiseCanary.reconciledAt,
				action: 'reconcile-active-empty-materialization-startup-noise-canary',
				group: activeCanaryGroup,
				activeRunDirs: canaryActiveRunDirs,
				reason: `empty-materialization startup-noise canary is ${
					canaryActiveRunDirs.length > 0
						? 'already active in the current coverage root'
						: 'inside its startup grace window'
				}; keeping it in supervisor-groups.json because it is not a no-product startup-noise cooldown`,
				expiresAt: activeNoisePause.expiresAt,
			} );
		}
	}

	for ( const group of [ ...enabled ] ) {
		const activeNoisePause = getActiveNoisePauseCooldown( group );
		if ( ! activeNoisePause ) {
			continue;
		}
		const supervisorGroupState = supervisorGroupsByName.get( group );
		const canaryActiveRunDirs =
			getCurrentOutputActiveRunDirs( supervisorGroupState );
		const groupHasProductEvidence =
			supervisorGroupHasProductEvidence( supervisorGroupState );
		if (
			state.emptyMaterializationStartupNoiseCanary?.group === group &&
			isNoProductStartupNoiseCooldown( activeNoisePause ) &&
			! groupHasProductEvidence &&
			( emptyMaterializationCanaryStartupGraceActive ||
				canaryActiveRunDirs.length > 0 )
		) {
			const marker = [
				group,
				activeNoisePause.at ?? '',
				activeNoisePause.expiresAt ?? '',
				canaryActiveRunDirs.join( ',' ),
				emptyMaterializationCanaryStartupGraceActive
					? 'startup-grace'
					: '',
				'removed',
			].join( '|' );
			if (
				state.emptyMaterializationStartupNoiseCanary
					.activeCooldownMarker !== marker
			) {
				state.emptyMaterializationStartupNoiseCanary = {
					...state.emptyMaterializationStartupNoiseCanary,
					activeCooldownMarker: marker,
					removedAt: new Date().toISOString(),
				};
				state.changes.push( {
					at: state.emptyMaterializationStartupNoiseCanary.removedAt,
					action: 'remove-enabled-empty-materialization-startup-noise-canary',
					group,
					activeRunDirs: canaryActiveRunDirs,
					reason: `empty-materialization startup-noise canary is ${
						canaryActiveRunDirs.length > 0
							? 'already active in the current coverage root'
							: 'inside its startup grace window'
					}, but its cooldown is no-product startup noise; removing the producer instead of counting startup-grace materialization as productive`,
					expiresAt: activeNoisePause.expiresAt,
				} );
			}
		}
		if (
			! isProductEvidenceDuplicateFamilyHold( activeNoisePause ) &&
			! (
				activeNoisePause.kind === 'startup-noise' &&
				activeNoisePause.currentOutputPause === true &&
				activeNoisePause.originGroup === group &&
				! (
					activeNoisePause.originOutputDir &&
					path.resolve( activeNoisePause.originOutputDir ) !==
						path.resolve( OUTPUT_DIR )
				)
			) &&
			supervisorGroupHasProductEvidence(
				supervisorGroupsByName.get( group )
			)
		) {
			delete state.pausedGroups[ group ];
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'keep-enabled-product-evidence-group',
				group,
				reason: `current supervisor state has product evidence; not applying ${ activeNoisePause.kind } cooldown from ${ activeNoisePause.at }`,
			} );
			continue;
		}

		enabled.delete( group );
		state.pausedGroups[ group ] = {
			at: activeNoisePause.at ?? new Date().toISOString(),
			reason: activeNoisePause.reason,
			expiresAt: activeNoisePause.expiresAt,
			reasonKind: activeNoisePause.kind,
			...( activeNoisePause.family
				? { family: activeNoisePause.family }
				: {} ),
			source: activeNoisePause.source ?? 'active-noise-cooldown',
			outputDir: state.pausedGroups?.[ group ]?.outputDir ?? OUTPUT_DIR,
			...( activeNoisePause.originOutputDir
				? { originOutputDir: activeNoisePause.originOutputDir }
				: {} ),
			...( activeNoisePause.noProductOnly !== undefined
				? { noProductOnly: activeNoisePause.noProductOnly }
				: {} ),
			...( activeNoisePause.productEvidenceRecords !== undefined
				? {
						productEvidenceRecords:
							activeNoisePause.productEvidenceRecords,
				  }
				: {} ),
			preserveProductEvidence: true,
		};
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'restore-paused-noise-cooldown',
			group,
			reason: `removing enabled group during active ${ activeNoisePause.kind } cooldown: ${ activeNoisePause.reason }`,
			expiresAt: activeNoisePause.expiresAt,
		} );
		await writeNoAnalysisSentinelsForGroup(
			group,
			activeNoisePause.reason,
			{
				reasonKind: activeNoisePause.kind,
				family: activeNoisePause.family,
				source: activeNoisePause.source,
				pauseUntil:
					activeNoisePause.pauseUntil ?? activeNoisePause.expiresAt,
				expiresAt: activeNoisePause.expiresAt,
				noProductOnly: activeNoisePause.noProductOnly,
				productEvidenceRecords: activeNoisePause.productEvidenceRecords,
				hasProductEvidence: activeNoisePause.hasProductEvidence,
			}
		);
		await terminateGroupLanes( group, activeNoisePause.reason );
		paused += 1;
	}

	if ( paused > 0 || restored > 0 ) {
		state.enabledGroups = [ ...enabled ];
	}
	return paused + restored;
}

function shouldHoldDominantRealUserFamily( triageYield ) {
	return !! getDominantRealUserFamilyHold( triageYield );
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

	state.fileOffsets = {
		...( state.fileOffsets ?? {} ),
		...nextOffsets,
	};
	return { records, stats };
}

async function readAllCoverageRecords( files ) {
	const records = [];
	for ( const filePath of files ) {
		const text = await fs.readFile( filePath, 'utf8' ).catch( () => '' );
		for ( const line of text.split( '\n' ) ) {
			if ( ! line.trim() ) {
				continue;
			}
			try {
				records.push( {
					...JSON.parse( line ),
					coverageFile: filePath,
				} );
			} catch {}
		}
	}
	return records;
}

function createSummaryStartupStats() {
	return {
		filesRead: 0,
		linesSeen: 0,
		linesProcessed: 0,
		parseErrors: 0,
		startupFailures: 0,
	};
}

function hasActionableBehavioralCoverageSummary( summary ) {
	if ( ! summary || typeof summary !== 'object' ) {
		return false;
	}

	if (
		( summary.actionCount ?? 0 ) > 0 ||
		( summary.reloadCount ?? 0 ) > 0 ||
		( summary.saveCheckpointCount ?? 0 ) > 0 ||
		( summary.autosaveCount ?? 0 ) > 0 ||
		( summary.revisionEligibleCount ?? 0 ) > 0
	) {
		return true;
	}

	if (
		( summary.statuses?.passed ?? 0 ) > 0 ||
		( summary.statuses?.ok ?? 0 ) > 0
	) {
		return true;
	}

	if (
		( summary.recordCount ?? 0 ) > 0 &&
		( summary.statuses?.failed ?? 0 ) !== summary.recordCount
	) {
		return true;
	}

	return Object.entries( summary.userCounts ?? {} ).some(
		( [ userCount, count ] ) => userCount !== '0' && count > 0
	);
}

function hasActionableCoverageRecord( record ) {
	if ( ! record || typeof record !== 'object' ) {
		return false;
	}
	return (
		( record.userCount ?? 0 ) > 0 ||
		( record.actions?.length ?? 0 ) > 0 ||
		( record.reloads?.length ?? 0 ) > 0 ||
		( record.saveCheckpointSteps?.length ?? 0 ) > 0 ||
		( record.autosaveSteps?.length ?? 0 ) > 0 ||
		record.revisionRestore?.eligible === true ||
		( record.operationEvents?.length ?? 0 ) > 0
	);
}

function hasSummaryProductEvidence( record ) {
	if ( ! record || typeof record !== 'object' ) {
		return false;
	}
	if ( record.ok === true ) {
		return true;
	}
	if (
		hasActionableBehavioralCoverageSummary(
			record.behavioralCoverageSummary
		)
	) {
		return true;
	}
	if (
		( Array.isArray( record.behavioralCoverage )
			? record.behavioralCoverage
			: []
		).some( hasActionableCoverageRecord )
	) {
		return true;
	}
	return ( Array.isArray( record.attempts ) ? record.attempts : [] ).some(
		hasSummaryProductEvidence
	);
}

function isStrictPreActionStartupGateAttempt( attempt ) {
	if ( attempt?.bucket !== 'pre-action-bootstrap-stall' ) {
		return false;
	}
	if ( ( attempt.userCount ?? 0 ) > 0 ) {
		return false;
	}
	if ( attempt.lastAction ) {
		return false;
	}
	if (
		attempt.lastHistoryPhase &&
		! STARTUP_DISCOVERY_PHASES.has( attempt.lastHistoryPhase )
	) {
		return false;
	}
	return true;
}

function isStrictPreActionStartupAttemptSummaryRecord( record ) {
	if ( record?.kind !== 'attempt' || record.ok === true ) {
		return false;
	}
	if ( hasSummaryProductEvidence( record ) ) {
		return false;
	}
	const coverageRecords = Array.isArray( record.behavioralCoverage )
		? record.behavioralCoverage
		: [];
	return (
		coverageRecords.length > 0 &&
		coverageRecords.every( isStartupDiscoveryFailure )
	);
}

function isStrictPreActionStartupSummaryRecord( record ) {
	if ( isStrictPreActionStartupAttemptSummaryRecord( record ) ) {
		return true;
	}
	if ( record?.preAnalysisGate?.bucket !== 'pre-action-bootstrap-stall' ) {
		return false;
	}
	if ( hasSummaryProductEvidence( record ) ) {
		return false;
	}
	const gateAttempts = Array.isArray( record.preAnalysisGate.attempts )
		? record.preAnalysisGate.attempts
		: [];
	return (
		gateAttempts.length > 0 &&
		gateAttempts.every( isStrictPreActionStartupGateAttempt )
	);
}

function getStrictPreActionStartupSummaryProfile( record ) {
	if ( record?.preAnalysisGate?.bucket !== 'pre-action-bootstrap-stall' ) {
		return null;
	}

	const attempts = Array.isArray( record.attempts ) ? record.attempts : [];
	if ( attempts.length === 0 ) {
		return null;
	}

	const profiles = [];
	for ( const attempt of attempts ) {
		if (
			hasActionableBehavioralCoverageSummary(
				attempt.behavioralCoverageSummary
			)
		) {
			return null;
		}

		const coverageRecords = Array.isArray( attempt.behavioralCoverage )
			? attempt.behavioralCoverage
			: [];
		if (
			coverageRecords.length > 0 &&
			! coverageRecords.every( isStartupDiscoveryFailure )
		) {
			return null;
		}
		for ( const coverageRecord of coverageRecords ) {
			if ( coverageRecord.actionProfile ) {
				profiles.push( coverageRecord.actionProfile );
			}
		}
	}

	const gateAttempts = Array.isArray( record.preAnalysisGate.attempts )
		? record.preAnalysisGate.attempts
		: [];
	if (
		gateAttempts.length === 0 ||
		! gateAttempts.every( isStrictPreActionStartupGateAttempt )
	) {
		return null;
	}
	for ( const attempt of gateAttempts ) {
		if ( attempt.actionProfile ) {
			profiles.push( attempt.actionProfile );
		}
	}

	return profiles[ 0 ] ?? record.parameters?.actionProfile ?? 'unknown';
}

function getStartupFailureSeed( record ) {
	if ( record?.seed !== undefined && record.seed !== null ) {
		return String( record.seed );
	}
	for ( const attempt of record?.attempts ?? [] ) {
		if ( attempt?.seed !== undefined && attempt.seed !== null ) {
			return String( attempt.seed );
		}
	}
	for ( const coverageRecord of record?.behavioralCoverage ?? [] ) {
		if (
			coverageRecord?.seed !== undefined &&
			coverageRecord.seed !== null
		) {
			return String( coverageRecord.seed );
		}
	}
	return null;
}

function getStartupFailureIdentityKey( scope, seed ) {
	if ( ! scope || seed === null || seed === undefined ) {
		return null;
	}
	return `${ scope }\0seed\0${ seed }`;
}

function countStartupFailureOnce( profile, group, identityKey ) {
	if ( identityKey ) {
		if ( state.startupFailureIdentityKeys.includes( identityKey ) ) {
			return false;
		}
		state.startupFailureIdentityKeys.push( identityKey );
	}
	incrementCounter( state.startupFailureCountsByProfile, profile );
	if ( group ) {
		incrementCounter( state.startupFailureCountsByGroup, group );
	}
	return true;
}

function countSummaryStartupFailureRecord( record, stats, filePath ) {
	const profile = getStrictPreActionStartupSummaryProfile( record );
	if ( ! profile ) {
		return;
	}
	const group = getSummaryRecordGroupName( record, filePath );
	const seed = getStartupFailureSeed( record );
	const identityKey = getStartupFailureIdentityKey( group ?? profile, seed );
	if ( ! countStartupFailureOnce( profile, group, identityKey ) ) {
		return;
	}

	incrementCounter(
		state.currentRunSummaryStartupFailureCountsByProfile,
		profile
	);
	if ( group ) {
		incrementCounter(
			state.currentRunSummaryStartupFailureCountsByGroup,
			group
		);
	}
	stats.startupFailures += 1;
}

async function readSummaryStartupFailures( files ) {
	const stats = createSummaryStartupStats();
	const nextOffsets = {};

	for ( const filePath of files ) {
		const text = await fs.readFile( filePath, 'utf8' ).catch( () => '' );
		const lines = text.split( '\n' ).filter( ( line ) => line.trim() );
		const previousOffset =
			state.summaryFileOffsets?.[ filePath ]?.lineCount ?? 0;
		const nextOffset = Math.min( previousOffset, lines.length );
		stats.filesRead += 1;
		stats.linesSeen += lines.length;
		for ( const line of lines.slice( nextOffset ) ) {
			try {
				countSummaryStartupFailureRecord(
					JSON.parse( line ),
					stats,
					filePath
				);
				stats.linesProcessed += 1;
			} catch {
				stats.parseErrors += 1;
			}
		}
		nextOffsets[ filePath ] = {
			lineCount: lines.length,
			lastSeenAt: new Date().toISOString(),
		};
	}

	state.summaryFileOffsets = {
		...( state.summaryFileOffsets ?? {} ),
		...nextOffsets,
	};
	return stats;
}

async function backfillSummaryStartupFailures( files ) {
	state.summaryFileOffsets = {};
	return readSummaryStartupFailures( files );
}

function updateCurrentRunCounters( record ) {
	const profile = record.actionProfile ?? 'unknown';
	const group = getCoverageRecordGroupName( record );
	const transport = record.transport ?? 'unknown';
	incrementCounter( state.currentRunRecordCountsByProfile, profile );
	if ( group ) {
		incrementCounter( state.currentRunRecordCountsByGroup, group );
	}
	incrementCounter( state.currentRunRecordCountsByTransport, transport );

	if ( record.status === 'passed' ) {
		incrementCounter(
			state.currentRunSuccessfulRecordCountsByProfile,
			profile
		);
		state.currentRunSuccessfulActionCountsByProfile[ profile ] ??= {};
		for ( const action of record.actions ?? [] ) {
			incrementCounter(
				state.currentRunSuccessfulActionCountsByProfile[ profile ],
				action.label
			);
		}
	}

	if ( isStartupDiscoveryFailure( record ) ) {
		const identityKey = getStartupFailureIdentityKey(
			group ?? profile,
			getStartupFailureSeed( record )
		);
		countStartupFailureOnce( profile, group, identityKey );
	}
}

async function ensureCurrentRunCounters(
	currentCoverageFiles,
	currentSummaryFiles
) {
	const inputSignature = await getCurrentRunCounterInputSignature(
		currentCoverageFiles,
		currentSummaryFiles
	);
	if (
		state.runLocalNoisePolicyVersion === RUN_LOCAL_NOISE_POLICY_VERSION &&
		state.currentRunCountersInitializedForOutputDir === OUTPUT_DIR &&
		state.currentRunCounterInputSignature === inputSignature
	) {
		return;
	}

	resetCurrentRunCounters();
	const records = await readAllCoverageRecords( currentCoverageFiles );
	for ( const record of records ) {
		updateCurrentRunCounters( record );
	}
	const summaryStats =
		await backfillSummaryStartupFailures( currentSummaryFiles );
	state.currentRunCountersInitializedForOutputDir = OUTPUT_DIR;
	state.currentRunCounterInputSignature = inputSignature;
	state.runLocalNoisePolicyVersion = RUN_LOCAL_NOISE_POLICY_VERSION;
	state.changes.push( {
		at: new Date().toISOString(),
		action: 'backfill-current-run-noise-counters',
		reason: `rebuilt startup/quality counters from ${ records.length } current-run behavioral coverage record(s) and ${ summaryStats.startupFailures } strict summary startup failure(s)`,
	} );
}

async function getFileSetSignature( files ) {
	let totalSize = 0;
	let newestMtimeMs = 0;
	for ( const filePath of files ) {
		const stat = await fs.stat( filePath ).catch( () => null );
		if ( ! stat ) {
			continue;
		}
		totalSize += stat.size;
		newestMtimeMs = Math.max( newestMtimeMs, stat.mtimeMs );
	}
	return [
		files.length,
		totalSize,
		Math.round( newestMtimeMs ),
		files.at( -1 ) ?? '',
	].join( ':' );
}

async function getCurrentRunCounterInputSignature(
	currentCoverageFiles,
	currentSummaryFiles
) {
	const coverageSignature = await getFileSetSignature( currentCoverageFiles );
	const summarySignature = await getFileSetSignature( currentSummaryFiles );
	return `${ coverageSignature }|${ summarySignature }`;
}

function featureKeysForRecord( record ) {
	const keys = new Set();
	const blockStats = record.blockStats ?? {};
	const saveCount = record.saveCheckpointSteps?.length ?? 0;
	const autosaveCount = record.autosaveSteps?.length ?? 0;
	const reloadCount = record.reloads?.length ?? 0;

	keys.add( `profile:${ record.actionProfile ?? 'unknown' }` );
	keys.add( `transport:${ record.transport ?? 'unknown' }` );
	keys.add(
		`transport-profile:${ record.transport ?? 'unknown' }:${
			record.actionProfile ?? 'unknown'
		}`
	);
	keys.add( `collaborator-mode:${ record.collaboratorMode ?? 'unknown' }` );
	for ( const role of record.collaboratorRoles ?? [] ) {
		keys.add( `collaborator-role:${ role }` );
	}
	if ( record.authSessionExpiryProbe ) {
		keys.add( 'auth-session-expiry-probe:true' );
	}
	if ( record.softDiscoveryBootstrap ) {
		keys.add( 'soft-discovery-bootstrap:true' );
	}
	keys.add( `users:${ record.userCount ?? 0 }` );
	keys.add( `initial:${ record.initialContentProfile ?? 'unknown' }` );
	keys.add( `step-count:${ Math.min( record.stepCount ?? 0, 48 ) }` );
	keys.add( `depth:${ Math.min( blockStats.maxDepth ?? 0, 4 ) }` );
	keys.add( `save-count:${ Math.min( saveCount, 3 ) }` );
	keys.add( `autosave-count:${ Math.min( autosaveCount, 4 ) }` );
	keys.add( `reload-count:${ Math.min( reloadCount, 3 ) }` );
	keys.add(
		`revision-eligible:${ record.revisionRestore?.eligible === true }`
	);
	if ( ( record.autosaveSteps ?? [] ).some( ( step ) => step.local ) ) {
		keys.add( 'local-autosave:true' );
	}

	if (
		record.actionProfile === 'real-user-editing' ||
		record.actionProfile === 'large-post-three-user-http-lifecycle'
	) {
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
		if (
			actionSet.has( 'ui-paste-paragraph' ) &&
			actionSet.has( 'ui-link-paragraph' ) &&
			actionSet.has( 'ui-list-indent' )
		) {
			keys.add( 'real-user-template:rich-text-editing' );
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
	for ( const event of record.historyEvents ?? [] ) {
		keys.add( `history:${ event.phase }:${ event.status }` );
		if ( event.label ) {
			keys.add(
				`history-label:${ event.phase }:${ event.label }:${ event.status }`
			);
		}
		if (
			event.phase === 'media-cross-entity' &&
			event.status === 'ok' &&
			event.label
		) {
			keys.add( `media-cross-entity:${ event.label }` );
			const blockNames = Array.isArray( event.details?.blockNames )
				? event.details.blockNames
				: [];
			for ( const blockName of blockNames ) {
				if ( typeof blockName === 'string' ) {
					keys.add( `media-cross-entity-block:${ blockName }` );
				}
			}
		}
	}
	if (
		record.revisionRestore?.eligible === true &&
		( record.historyEvents ?? [] ).some(
			( event ) =>
				event.phase === 'revision-restore' && event.status === 'ok'
		)
	) {
		keys.add( 'revision-restored:true' );
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
		const maxTotalBlockCount = Math.max(
			...invariantSnapshots.map(
				( snapshot ) => snapshot.totalBlockCount ?? 0
			)
		);
		keys.add( `invalid-blocks:${ Math.min( maxInvalidBlocks, 4 ) }` );
		keys.add( `total-blocks:${ Math.min( maxTotalBlockCount, 120 ) }` );
		if ( maxTotalBlockCount >= 50 ) {
			keys.add( 'large-document:blocks-50' );
		}
		if ( maxTotalBlockCount >= 100 ) {
			keys.add( 'large-document:blocks-100' );
		}
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
		if ( isCurrentRunCoverageRecord( record ) ) {
			updateCurrentRunCounters( record );
		}
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
	if ( ( record.reloads?.length ?? 0 ) > 0 ) {
		return false;
	}
	if ( ( record.saveCheckpointSteps?.length ?? 0 ) > 0 ) {
		return false;
	}
	if ( ( record.autosaveSteps?.length ?? 0 ) > 0 ) {
		return false;
	}
	if ( record.revisionRestore?.eligible === true ) {
		return false;
	}
	if ( ( record.operationEvents?.length ?? 0 ) > 0 ) {
		return false;
	}

	const failedHistoryPhases = ( record.historyEvents ?? [] )
		.filter( ( event ) => event.status === 'fail' )
		.map( ( event ) => event.phase )
		.filter( Boolean );
	if (
		failedHistoryPhases.length > 0 &&
		! failedHistoryPhases.some( ( phase ) =>
			STARTUP_DISCOVERY_PHASES.has( phase )
		)
	) {
		return false;
	}

	const errorText = [
		record.error,
		...( record.historyEvents ?? [] ).map( ( event ) => event.error ),
	]
		.filter( Boolean )
		.join( '\n' );

	return /waitForMutualDiscovery|waitForTestWebSocketAwarenessPeerCount|waitForCollaborationReady|setPreferences|_wpCollaborationEnabled|collaboration (?:session )?to become ready|page\.waitForFunction|waitForSyncCycle|Target page, context or browser has been closed|Test timeout/i.test(
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
		loadHeadroomLimit: cores * LOAD_HEADROOM_MULTIPLIER,
		hasHeadroom:
			load1 < cores * LOAD_HEADROOM_MULTIPLIER &&
			memoryHeadroom.hasHeadroom,
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

function getFeatureCount( key ) {
	return state.featureCounts?.[ key ] ?? 0;
}

function getSuccessfulProfileCount( profile ) {
	return state.successfulRecordCountsByProfile?.[ profile ] ?? 0;
}

function getCdpCoverageRecordCount() {
	return Object.values( state.coverageHashes ?? {} ).reduce(
		( total, count ) => total + count,
		0
	);
}

function getUnmetCoverageGoals( goals ) {
	return goals
		.filter( ( goal ) => ! goal.met )
		.sort(
			( left, right ) =>
				left.count / left.target - right.count / right.target
		);
}

function getAutoCoverageGoalCount( goal, goalCountsById ) {
	const source = goal.countSource;
	if ( source?.kind === 'feature' ) {
		return getFeatureCount( source.key );
	}
	if ( source?.kind === 'success-profile' ) {
		return getSuccessfulProfileCount( source.profile );
	}
	if ( source?.kind === 'cdp-records' ) {
		return getCdpCoverageRecordCount();
	}
	if ( source?.kind === 'goal' ) {
		return goalCountsById.get( source.goalId ) ?? 0;
	}
	return getFeatureCount( goal.featureKey ?? goal.id );
}

function normalizeAutoRatchetSourceGoalId( goalId ) {
	let sourceGoalId = goalId;
	while ( sourceGoalId?.startsWith( 'auto-ratchet:' ) ) {
		const match = sourceGoalId.match( /^auto-ratchet:(.+):target-\d+$/ );
		if ( ! match ) {
			break;
		}
		sourceGoalId = match[ 1 ];
	}
	return sourceGoalId;
}

function getAutoRatchetSourceGoalId( goal ) {
	return normalizeAutoRatchetSourceGoalId(
		goal.sourceGoalId ?? goal.countSource?.goalId ?? goal.id
	);
}

function normalizeStoredAutoCoverageGoals( goals ) {
	const seen = new Set();
	const normalizedGoals = [];

	for ( const goal of goals ?? [] ) {
		const normalizedGoal = { ...goal };
		if ( normalizedGoal.source === 'ratchet' ) {
			const sourceGoalId = getAutoRatchetSourceGoalId( normalizedGoal );
			normalizedGoal.sourceGoalId = sourceGoalId;
			normalizedGoal.id = `auto-ratchet:${ sourceGoalId }:target-${ normalizedGoal.target }`;
			if ( normalizedGoal.countSource?.kind === 'goal' ) {
				normalizedGoal.countSource = {
					...normalizedGoal.countSource,
					goalId: sourceGoalId,
				};
			}
		}

		if ( seen.has( normalizedGoal.id ) ) {
			continue;
		}
		seen.add( normalizedGoal.id );
		normalizedGoals.push( normalizedGoal );
	}

	return normalizedGoals;
}

function addAutoCoverageGoalToList(
	addGoal,
	goal,
	goalCountsById,
	goalsById = new Map()
) {
	const sourceGoalId =
		goal.source === 'ratchet' ? getAutoRatchetSourceGoalId( goal ) : null;
	const sourceGoal =
		sourceGoalId === null ? null : goalsById.get( sourceGoalId );
	const id =
		sourceGoalId === null
			? goal.id
			: `auto-ratchet:${ sourceGoalId }:target-${ goal.target }`;
	const countSource =
		sourceGoalId === null || goal.countSource?.kind !== 'goal'
			? goal.countSource
			: {
					...goal.countSource,
					goalId: sourceGoalId,
			  };
	const count = getAutoCoverageGoalCount( goal, goalCountsById );
	addGoal( {
		id,
		label: goal.label,
		count,
		target: goal.target,
		groups: sourceGoal?.groups ?? goal.groups ?? [],
		rationale: goal.rationale,
		countSource,
		harnessAfter:
			goal.harnessAfter === undefined
				? goal.target * 4
				: goal.harnessAfter,
		source: goal.source,
		sourceGoalId,
	} );
	return count;
}

function maybeExpandAutoCoverageGoals( goals, unmetGoals, addGoal ) {
	const expansion = {
		enabled: AUTO_GOAL_EXPANSION_ENABLED,
		threshold: AUTO_GOAL_EXPANSION_THRESHOLD,
		batchSize: AUTO_GOAL_EXPANSION_BATCH_SIZE,
		maxWavesPerPass: AUTO_GOAL_EXPANSION_MAX_WAVES_PER_PASS,
		addedGoals: [],
		waves: [],
	};
	if ( ! AUTO_GOAL_EXPANSION_ENABLED ) {
		return { expansion, unmetGoals };
	}

	const existingGoalIds = new Set( goals.map( ( goal ) => goal.id ) );
	for (
		let waveIndex = 0;
		waveIndex < AUTO_GOAL_EXPANSION_MAX_WAVES_PER_PASS &&
		unmetGoals.length <= AUTO_GOAL_EXPANSION_THRESHOLD;
		waveIndex++
	) {
		const goalCountsById = new Map(
			goals.map( ( goal ) => [ goal.id, goal.count ] )
		);
		const candidates = buildAutoCoverageGoalCandidates(
			goals,
			goalCountsById,
			existingGoalIds
		);
		const selectedGoals = candidates.slice(
			0,
			AUTO_GOAL_EXPANSION_BATCH_SIZE
		);
		if ( selectedGoals.length === 0 ) {
			break;
		}

		const timestamp = new Date().toISOString();
		for ( const goal of selectedGoals ) {
			const storedGoal = {
				...goal,
				createdAt: timestamp,
			};
			state.autoCoverageGoals.push( storedGoal );
			existingGoalIds.add( storedGoal.id );
			addAutoCoverageGoalToList( addGoal, storedGoal, goalCountsById );
		}

		const wave = {
			at: timestamp,
			threshold: AUTO_GOAL_EXPANSION_THRESHOLD,
			unmetBefore: unmetGoals.length,
			addedGoals: selectedGoals.map( ( goal ) => goal.id ),
		};
		state.autoCoverageGoalWaves.push( wave );
		state.changes.push( {
			at: timestamp,
			action: 'auto-expand-coverage-goals',
			reason: `unmet coverage goals ${ unmetGoals.length } <= threshold ${ AUTO_GOAL_EXPANSION_THRESHOLD }; added ${ selectedGoals.length } goal(s)`,
		} );
		expansion.addedGoals.push( ...wave.addedGoals );
		expansion.waves.push( wave );
		unmetGoals = getUnmetCoverageGoals( goals );
	}

	return { expansion, unmetGoals };
}

function dedupeAutoCoverageGoalCandidates( candidates ) {
	const seen = new Set();
	const deduped = [];
	for ( const candidate of candidates ) {
		if ( seen.has( candidate.id ) ) {
			continue;
		}
		seen.add( candidate.id );
		deduped.push( candidate );
	}
	return deduped;
}

function buildAutoCoverageGoalCandidates( goals, goalCountsById, existingIds ) {
	const staticCandidates = AUTO_EXPANSION_GOAL_CANDIDATES.map( ( goal ) => ( {
		...goal,
		source: 'static-candidate',
		harnessAfter: goal.harnessAfter ?? goal.target * 4,
	} ) ).filter(
		( goal ) =>
			! existingIds.has( goal.id ) &&
			getAutoCoverageGoalCount( goal, goalCountsById ) < goal.target
	);

	const ratchetCandidates = goals
		.filter(
			( goal ) =>
				goal.count >= goal.target && ( goal.groups?.length ?? 0 ) > 0
		)
		.map( ( goal ) => {
			const sourceGoalId = getAutoRatchetSourceGoalId( goal );
			const target = getNextAutoCoverageTarget( goal );
			return {
				id: `auto-ratchet:${ sourceGoalId }:target-${ target }`,
				label: `${ goal.label } next coverage tier`,
				countSource: {
					kind: 'goal',
					goalId: sourceGoalId,
				},
				target,
				groups: goal.groups,
				rationale: `auto-expanded after the previous goal was met; ${ goal.rationale }`,
				harnessAfter:
					goal.harnessAfter === null
						? null
						: Math.max( goal.harnessAfter ?? 0, target * 4 ),
				source: 'ratchet',
				sourceGoalId,
			};
		} )
		.filter(
			( goal ) =>
				! existingIds.has( goal.id ) &&
				getAutoCoverageGoalCount( goal, goalCountsById ) < goal.target
		);

	return dedupeAutoCoverageGoalCandidates( [
		...staticCandidates,
		...ratchetCandidates,
	] ).sort(
		( left, right ) =>
			getAutoCoverageGoalPriority( left ) -
				getAutoCoverageGoalPriority( right ) ||
			left.target - right.target ||
			left.id.localeCompare( right.id )
	);
}

function getNextAutoCoverageTarget( goal ) {
	const increment = Math.max( 10, Math.ceil( goal.target * 0.5 ) );
	return roundUpNiceNumber(
		Math.max( goal.target * 2, goal.count + increment )
	);
}

function roundUpNiceNumber( value ) {
	if ( value <= 10 ) {
		return Math.ceil( value );
	}
	const magnitude = 10 ** Math.floor( Math.log10( value ) );
	const scaled = value / magnitude;
	let niceScaled = 10;
	if ( scaled <= 1 ) {
		niceScaled = 1;
	} else if ( scaled <= 2 ) {
		niceScaled = 2;
	} else if ( scaled <= 5 ) {
		niceScaled = 5;
	}
	return niceScaled * magnitude;
}

function getAutoCoverageGoalPriority( goal ) {
	const groups = goal.groups ?? [];
	const groupPriority = Math.min(
		...groups.map( ( group ) => {
			const index = HIGH_VALUE_EXPANSION_GROUPS.indexOf( group );
			return index === -1 ? 1000 : index;
		} ),
		1000
	);
	const sourcePriority = goal.source === 'static-candidate' ? -100 : 0;
	return sourcePriority + groupPriority;
}

function createCoverageGuidance( novelty ) {
	const goals = [];
	const seenGoalIds = new Set();
	const addGoal = ( {
		id,
		label,
		count,
		target,
		groups = [],
		rationale,
		harnessAfter = null,
		countSource,
		source,
		sourceGoalId,
	} ) => {
		if ( seenGoalIds.has( id ) ) {
			return;
		}
		seenGoalIds.add( id );
		const numericCount = Number.isFinite( count ) ? count : 0;
		const numericTarget = Number.isFinite( target ) ? target : 1;
		goals.push( {
			id,
			label,
			count: numericCount,
			target: numericTarget,
			met: numericCount >= numericTarget,
			groups,
			rationale,
			harnessAfter,
			...( countSource ? { countSource } : {} ),
			...( source ? { source } : {} ),
			...( sourceGoalId ? { sourceGoalId } : {} ),
		} );
	};

	for ( const actionLabel of REQUIRED_ACTION_LABELS ) {
		addGoal( {
			id: `action:${ actionLabel }`,
			label: `action ${ actionLabel }`,
			count: getFeatureCount( `action:${ actionLabel }` ),
			target: ACTION_MIN_RECORDS,
			groups: ACTION_COVERAGE_GROUPS[ actionLabel ],
			rationale: 'every fuzz action should be exercised by a live lane',
			harnessAfter: ACTION_MIN_RECORDS * 5,
		} );
	}

	for ( const blockName of COMMON_BLOCK_TYPES ) {
		addGoal( {
			id: `block:${ blockName }`,
			label: `common block ${ blockName }`,
			count: getFeatureCount( `block:${ blockName }` ),
			target: COMMON_BLOCK_MIN_RECORDS,
			groups: [ 'novelty-ws-common-blocks' ],
			rationale: 'common block coverage should not depend on chance',
			harnessAfter: COMMON_BLOCK_MIN_RECORDS * 4,
		} );
	}

	for ( const blockName of BLOCK_GAUNTLET_TYPES ) {
		addGoal( {
			id: `block:${ blockName }`,
			label: `gauntlet block ${ blockName }`,
			count: getFeatureCount( `block:${ blockName }` ),
			target: BLOCK_GAUNTLET_MIN_RECORDS,
			groups: [ 'novelty-ws-block-gauntlet' ],
			rationale: 'less common block types need dedicated coverage',
			harnessAfter: BLOCK_GAUNTLET_MIN_RECORDS * 4,
		} );
	}

	for ( const blockName of ASYNC_SERVER_BLOCK_TYPES ) {
		addGoal( {
			id: `block:${ blockName }`,
			label: `async/server block ${ blockName }`,
			count: getFeatureCount( `block:${ blockName }` ),
			target: BLOCK_GAUNTLET_MIN_RECORDS,
			groups: [ 'novelty-ws-async-server-blocks' ],
			rationale:
				'async REST-backed and server-rendered blocks need dedicated coverage',
			harnessAfter: BLOCK_GAUNTLET_MIN_RECORDS * 4,
		} );
	}

	for ( const blockName of MEDIA_CROSS_ENTITY_BLOCK_TYPES ) {
		addGoal( {
			id: `media-cross-entity-block:${ blockName }`,
			label: `uploaded/cross-entity block ${ blockName }`,
			count: getFeatureCount( `media-cross-entity-block:${ blockName }` ),
			target: 5,
			groups: [ 'novelty-ws-media-cross-entity' ],
			rationale:
				'media and reusable-block coverage must include real REST-created entities',
			harnessAfter: 50,
		} );
	}

	for ( const profileName of PARSER_TRANSFORM_INITIAL_PROFILES ) {
		addGoal( {
			id: `initial:${ profileName }`,
			label: `initial content ${ profileName }`,
			count: getFeatureCount( `initial:${ profileName }` ),
			target: INITIAL_PROFILE_MIN_RECORDS,
			groups: [ 'novelty-ws-parser-transform' ],
			rationale:
				'parser transform seeds need all parser-stress initial shapes',
			harnessAfter: INITIAL_PROFILE_MIN_RECORDS * 4,
		} );
	}

	const scalarGoals = [
		{
			id: 'media-cross-entity:media-upload',
			label: 'real media upload',
			target: 10,
			groups: [ 'novelty-ws-media-cross-entity' ],
			rationale:
				'media coverage should exercise attachment creation, not only synthetic URLs',
		},
		{
			id: 'media-cross-entity:reusable-block',
			label: 'real reusable block entity',
			target: 5,
			groups: [ 'novelty-ws-media-cross-entity' ],
			rationale:
				'reusable/synced block coverage should exercise a real cross-entity reference',
		},
		{
			id: 'fault:delay:delay',
			label: 'delayed sync fault',
			target: 50,
			groups: [ 'novelty-ws-structure' ],
			rationale: 'delay faults exercise retry and convergence paths',
		},
		{
			id: 'fault:fail:429',
			label: 'HTTP 429 sync failure',
			target: 10,
			groups: [ 'novelty-ws-structure' ],
			rationale: 'retriable sync failures should stay covered',
		},
		{
			id: 'save-count:1',
			label: 'save checkpoint',
			target: 50,
			groups: [
				'novelty-ws-persistence-no-title',
				'novelty-ws-revision-persistence',
			],
			rationale: 'save checkpoint coverage catches persistence gaps',
		},
		{
			id: 'reload-count:1',
			label: 'single reload',
			target: 50,
			groups: [ 'novelty-ws-lifecycle' ],
			rationale: 'reload coverage catches lifecycle rejoin regressions',
		},
		{
			id: 'reload-count:2',
			label: 'multi reload',
			target: 100,
			groups: [ 'novelty-ws-multi-reload-lifecycle' ],
			rationale: 'multiple reloads exercise repeated teardown/rejoin',
		},
		{
			id: 'revision-eligible:true',
			label: 'revision restore eligible',
			target: 500,
			groups: [
				'novelty-ws-revision-persistence',
				'novelty-ws-revision-recovery',
			],
			rationale: 'revision restore must remain in the fuzz envelope',
		},
		{
			id: 'revision-restored:true',
			label: 'revision restored through browser UI',
			target: 25,
			groups: [ 'novelty-ws-revision-recovery' ],
			rationale:
				'revision restore has to actually execute, not just be eligible',
		},
		{
			id: 'autosave-count:4',
			label: 'remote and local autosave checkpoints',
			target: 25,
			groups: [ 'novelty-ws-revision-recovery' ],
			rationale:
				'autosave and post-recovery state need explicit save/reload/revision coverage',
		},
		{
			id: 'local-autosave:true',
			label: 'local post recovery autosave',
			target: 25,
			groups: [ 'novelty-ws-revision-recovery' ],
			rationale:
				'local autosave recovery can diverge from remote save and revision state',
		},
		{
			id: 'lifecycle:late-join:users-3',
			label: 'three-user late join',
			target: LATE_JOIN_LIFECYCLE_MIN_RECORDS,
			groups: [ 'novelty-ws-three-user-late-join' ],
			rationale: 'late-join bugs need explicit multi-user coverage',
		},
		{
			id: 'users:12',
			label: 'many-user browser session',
			target: 10,
			groups: [ 'novelty-ws-many-user-lifecycle' ],
			rationale:
				'three users is not enough to cover high-participant awareness and save/reload behavior',
		},
		{
			id: 'lifecycle:late-join:users-12',
			label: 'many-user late join',
			target: 10,
			groups: [ 'novelty-ws-many-user-lifecycle' ],
			rationale:
				'many-user RTC sessions need a real late join after editing has started',
		},
		{
			id: 'history:presence-list:ok',
			label: 'presence list visible',
			target: 25,
			groups: [
				'novelty-ws-collaboration-ui-signals',
				'novelty-ws-many-user-lifecycle',
			],
			rationale:
				'presence UI is user-visible RTC correctness, not just transport convergence',
		},
		{
			id: 'history:remote-selection-cursor:ok',
			label: 'remote selection and cursor visible',
			target: 25,
			groups: [
				'novelty-ws-collaboration-ui-signals',
				'novelty-ws-many-user-lifecycle',
			],
			rationale:
				'selection and cursor state can fail while content convergence still passes',
		},
		{
			id: 'collaborator-mode:same-user',
			label: 'same-user two-tab mode',
			target: 150,
			groups: [
				'novelty-ws-same-user-lifecycle',
				'novelty-ws-same-user-stale-tabs',
				'novelty-http-same-user-stale-draft',
			],
			rationale: 'same-user tabs have different identity semantics',
		},
		{
			id: 'reload-count:3',
			label: 'same-user stale/reloaded tabs',
			target: 50,
			groups: [
				'novelty-ws-same-user-stale-tabs',
				'novelty-http-same-user-stale-draft',
			],
			rationale:
				'stale tabs and repeated reloads exercise awareness and save authority',
		},
		{
			id: 'real-user-template:body-save-reload',
			label: 'real-user body save/reload',
			target: REAL_USER_EDITING_MIN_ACTION_RECORDS,
			groups: [
				'novelty-ws-real-user-save-reload',
				'novelty-ws-real-user-editing',
				'novelty-ws-real-user-rich-text',
				'novelty-http-large-post-lifecycle',
			],
			rationale: 'UI typing coverage must include save/reload flow',
		},
		{
			id: 'real-user-template:title-save-reload',
			label: 'real-user title save/reload',
			target: REAL_USER_EDITING_MIN_ACTION_RECORDS,
			groups: [
				'novelty-ws-real-user-save-reload',
				'novelty-ws-real-user-editing',
				'novelty-ws-real-user-rich-text',
				'novelty-http-large-post-lifecycle',
			],
			rationale: 'title typing can diverge from block body sync',
		},
		{
			id: 'real-user-template:rich-text-editing',
			label: 'real-user rich text editing',
			target: REAL_USER_EDITING_MIN_ACTION_RECORDS,
			groups: [ 'novelty-ws-real-user-rich-text' ],
			rationale:
				'paste, link, list, composition, toolbar, and cut/copy paths need real UI coverage',
		},
		{
			id: 'auth-session-expiry-probe:true',
			label: 'auth/session expiry probe',
			target: 25,
			groups: [ 'novelty-ws-permissions-auth-locks' ],
			rationale:
				'auth changes and nonce expiry must stay in the fuzz envelope',
		},
		{
			id: 'collaborator-role:contributor',
			label: 'limited permission collaborator',
			target: 25,
			groups: [ 'novelty-ws-permissions-auth-locks' ],
			rationale:
				'permissions and lock behavior differ for non-admin collaborators',
		},
		{
			id: 'fault:fail:401',
			label: 'auth expired sync failure',
			target: 10,
			groups: [ 'novelty-ws-permissions-auth-locks' ],
			rationale:
				'session expiry and nonce failures should be covered explicitly',
		},
		{
			id: 'fault:fail:403',
			label: 'permission denied sync failure',
			target: 10,
			groups: [ 'novelty-ws-permissions-auth-locks' ],
			rationale:
				'post locking and auth changes should not silently corrupt state',
		},
		{
			id: 'large-document:blocks-50',
			label: 'large document',
			target: 25,
			groups: [
				'novelty-ws-long-session-large-doc',
				'novelty-http-large-post-lifecycle',
			],
			rationale:
				'large documents exercise Yjs growth, undo stacks, and block identity drift',
		},
		{
			id: 'transport-profile:http:large-post-three-user-http-lifecycle',
			label: 'large post three-user HTTP lifecycle',
			target: 10,
			groups: [ 'novelty-http-large-post-lifecycle' ],
			rationale:
				'the large-post miss requires HTTP, three users, large content, lifecycle, and persistence in one gate',
		},
		{
			id: 'history:final-ui-witness-sweep:ok',
			label: 'final UI witness sweep',
			target: 10,
			groups: [ 'novelty-http-large-post-lifecycle' ],
			rationale:
				'every participant needs a marker-producing UI operation immediately before final persistence',
		},
		{
			id: 'history:final-persistence-publish:ok',
			label: 'publish persistence oracle',
			target: 10,
			groups: [ 'novelty-http-large-post-lifecycle' ],
			rationale:
				'publish coverage must include REST status/content and fresh reload witnesses',
		},
		{
			id: 'step-count:48',
			label: 'long session',
			target: 25,
			groups: [ 'novelty-ws-long-session-large-doc' ],
			rationale:
				'long operation sequences catch stale snapshots and delayed persistence bugs',
		},
	];

	for ( const goal of scalarGoals ) {
		addGoal( {
			...goal,
			count: getFeatureCount( goal.id ),
			harnessAfter: goal.target * 4,
		} );
	}

	for ( const goal of [
		{
			profile: 'real-user-editing',
			target: REAL_USER_EDITING_MIN_RECORDS,
			groups: [
				'novelty-ws-real-user-save-reload',
				'novelty-ws-real-user-editing',
				'novelty-ws-real-user-rich-text',
			],
			rationale:
				'real UI editing needs completed records, not just startup attempts',
		},
		{
			profile: 'parser-serialization',
			target: 50,
			groups: [ 'novelty-ws-parser-serialization' ],
			rationale:
				'parser serialization needs completed records to prove load/save stability',
		},
		{
			profile: 'multi-reload-lifecycle',
			target: 50,
			groups: [ 'novelty-ws-multi-reload-lifecycle' ],
			rationale:
				'multi-reload lifecycle coverage is only useful when the seed completes',
		},
		{
			profile: 'media-cross-entity',
			target: 25,
			groups: [ 'novelty-ws-media-cross-entity' ],
			rationale:
				'media and cross-entity coverage needs successful end-to-end runs',
		},
		{
			profile: 'large-post-three-user-http-lifecycle',
			target: 10,
			groups: [ 'novelty-http-large-post-lifecycle' ],
			rationale:
				'the combined large-post HTTP lifecycle gate needs completed records',
		},
		{
			profile: 'many-user-lifecycle',
			target: 10,
			groups: [ 'novelty-ws-many-user-lifecycle' ],
			rationale:
				'many-user RTC coverage needs completed seeds, not only startup or discovery failures',
		},
		{
			profile: 'collaboration-ui-signals',
			target: 25,
			groups: [ 'novelty-ws-collaboration-ui-signals' ],
			rationale:
				'presence, cursor, and selection coverage needs completed browser records',
		},
	] ) {
		addGoal( {
			id: `success-profile:${ goal.profile }`,
			label: `successful ${ goal.profile } records`,
			count: getSuccessfulProfileCount( goal.profile ),
			target: goal.target,
			groups: goal.groups,
			rationale: goal.rationale,
			harnessAfter: goal.target * 4,
		} );
	}

	const cdpRecordCount = getCdpCoverageRecordCount();
	addGoal( {
		id: 'cdp-coverage-records',
		label: 'CDP coverage records',
		count: cdpRecordCount,
		target: 25,
		groups: [
			'novelty-ws-common-blocks',
			'novelty-ws-block-gauntlet',
			'novelty-ws-parser-transform',
			'novelty-ws-real-user-save-reload',
			'novelty-ws-real-user-editing',
			'novelty-ws-real-user-rich-text',
			'novelty-ws-async-server-blocks',
			'novelty-ws-media-cross-entity',
			'novelty-ws-long-session-large-doc',
			'novelty-http-large-post-lifecycle',
		],
		rationale: 'code coverage should confirm browser paths are changing',
		harnessAfter: 100,
	} );

	const goalCountsById = new Map(
		goals.map( ( goal ) => [ goal.id, goal.count ] )
	);
	const goalsById = new Map( goals.map( ( goal ) => [ goal.id, goal ] ) );
	for ( const goal of state.autoCoverageGoals ?? [] ) {
		goalCountsById.set(
			goal.id,
			addAutoCoverageGoalToList(
				addGoal,
				goal,
				goalCountsById,
				goalsById
			)
		);
	}

	let unmetGoals = getUnmetCoverageGoals( goals );
	const autoExpansionResult = maybeExpandAutoCoverageGoals(
		goals,
		unmetGoals,
		addGoal
	);
	unmetGoals = autoExpansionResult.unmetGoals;
	const recommendedGroups = [
		...new Set( unmetGoals.flatMap( ( goal ) => goal.groups ) ),
	];
	const harnessWork = unmetGoals.filter(
		( goal ) =>
			goal.groups.length === 0 ||
			( goal.harnessAfter !== null &&
				goal.count === 0 &&
				goal.groups.some(
					( group ) =>
						isGroupEnabled( group ) &&
						getGroupProfileRecordCount( group ) >= goal.harnessAfter
				) )
	);

	if ( unmetGoals.length && novelty.newFeatureKeys === 0 ) {
		state.coverageGuidanceNoProgressPasses =
			( state.coverageGuidanceNoProgressPasses ?? 0 ) + 1;
	} else if ( novelty.newFeatureKeys > 0 || unmetGoals.length === 0 ) {
		state.coverageGuidanceNoProgressPasses = 0;
	}

	return {
		createdAt: new Date().toISOString(),
		goals,
		unmetGoals: unmetGoals.slice( 0, 40 ),
		harnessWork: harnessWork.slice( 0, 20 ),
		noProgressPasses: state.coverageGuidanceNoProgressPasses ?? 0,
		recommendedGroups,
		autoExpansion: autoExpansionResult.expansion,
		newFeatureKeysThisPass: novelty.newFeatureKeys,
		newCdpCoverageHashesThisPass: novelty.newCoverageHashes,
	};
}

function updateCoverageQualityIssues( guidance, triageYield ) {
	const qualityIssues = createCoverageQualityIssues( guidance, triageYield );
	if ( qualityIssues.length > 0 ) {
		state.coverageGuidanceQualityIssuePasses =
			( state.coverageGuidanceQualityIssuePasses ?? 0 ) + 1;
	} else {
		state.coverageGuidanceQualityIssuePasses = 0;
	}
	guidance.qualityIssues = qualityIssues.slice( 0, 30 );
	guidance.qualityIssuePasses = state.coverageGuidanceQualityIssuePasses ?? 0;
	return guidance.qualityIssues;
}

function createCoverageQualityIssues( guidance, triageYield ) {
	const issues = [];
	for ( const goal of guidance.goals ?? [] ) {
		const sourceGoalId = normalizeAutoRatchetSourceGoalId(
			goal.sourceGoalId ?? goal.countSource?.goalId ?? goal.id
		);
		if ( goal.met || ! sourceGoalId.startsWith( 'success-profile:' ) ) {
			continue;
		}
		const profile = sourceGoalId.slice( 'success-profile:'.length );
		const records = state.currentRunRecordCountsByProfile?.[ profile ] ?? 0;
		const successful =
			state.currentRunSuccessfulRecordCountsByProfile?.[ profile ] ?? 0;
		const startupFailures =
			state.startupFailureCountsByProfile?.[ profile ] ?? 0;
		if (
			records < COVERAGE_QUALITY_COMPLETION_MIN_RECORDS &&
			startupFailures < COVERAGE_QUALITY_STARTUP_FAILURE_MIN_COUNT
		) {
			continue;
		}
		const successRate = records > 0 ? successful / records : 0;
		const startupFailureRate = records > 0 ? startupFailures / records : 0;
		issues.push( {
			id: `completion:${ profile }`,
			severity: successRate < 0.1 ? 'high' : 'medium',
			profile,
			label: `${ profile } has low completed-record yield`,
			evidence: `${ successful } current-run successful records, ${ records } current-run records seen, success rate ${ formatPercent(
				successRate
			) }, startup failure rate ${ formatPercent( startupFailureRate ) }`,
			recommendedAction:
				'improve profile completion before adding another large fuzz-action class',
		} );
	}

	for ( const [ profile, records ] of Object.entries(
		state.currentRunRecordCountsByProfile ?? {}
	) ) {
		const startupFailures =
			state.startupFailureCountsByProfile?.[ profile ] ?? 0;
		if (
			startupFailures < COVERAGE_QUALITY_STARTUP_FAILURE_MIN_COUNT ||
			records <= 0
		) {
			continue;
		}
		const startupFailureRate = startupFailures / records;
		if ( startupFailureRate < COVERAGE_QUALITY_STARTUP_FAILURE_MIN_RATE ) {
			continue;
		}
		issues.push( {
			id: `startup-stalls:${ profile }`,
			severity: startupFailureRate >= 0.5 ? 'high' : 'medium',
			profile,
			label: `${ profile } has excessive pre-action startup stalls`,
			evidence: `${ startupFailures } current-run startup failures / ${ records } current-run records = ${ formatPercent(
				startupFailureRate
			) }`,
			recommendedAction:
				'debug and reduce startup/discovery stalls so the lane produces completed records',
		} );
	}

	if (
		triageYield?.topDuplicateFamilyShare >= TRIAGE_DUPLICATE_SHARE_HOLD &&
		triageYield.signatureCount >= TRIAGE_NOISE_DOMINANCE_MIN_CANDIDATES
	) {
		issues.push( {
			id: 'triage-duplicate-dominated',
			severity: 'medium',
			label: 'triage is duplicate/noise dominated',
			evidence: `actionable top family share ${
				triageYield.topDuplicateFamilyShare
			}, actionable signatures ${
				triageYield.signatureCount
			}, raw signatures ${
				triageYield.rawSignatureCount ?? triageYield.signatureCount
			}, non-actionable ${
				triageYield.nonActionableSignatureCount ?? 0
			}, bootstrap stalls ${
				triageYield.bootstrapStalls
			}, normalization-noise candidates ${
				triageYield.normalizationNoiseCandidates
			}, visible likely-real ${ triageYield.likelyRealVisible }`,
			recommendedAction:
				'gate duplicate/noise families or fix the dominant infra failure before increasing browser action breadth',
		} );
	}

	for ( const warning of state.healthWarnings ?? [] ) {
		issues.push( {
			id: `health:${ warning
				.toLowerCase()
				.replace( /[^a-z0-9]+/g, '-' )
				.replace( /^-|-$/g, '' )
				.slice( 0, 80 ) }`,
			severity: 'medium',
			label: 'novelty monitor health warning',
			evidence: warning,
			recommendedAction:
				'fix the health warning before trusting coverage-guided scheduling for that surface',
		} );
	}

	return dedupeCoverageQualityIssues( issues ).sort(
		( left, right ) =>
			getQualitySeverityRank( left.severity ) -
				getQualitySeverityRank( right.severity ) ||
			left.id.localeCompare( right.id )
	);
}

function dedupeCoverageQualityIssues( issues ) {
	const seen = new Set();
	const deduped = [];
	for ( const issue of issues ) {
		if ( seen.has( issue.id ) ) {
			continue;
		}
		seen.add( issue.id );
		deduped.push( issue );
	}
	return deduped;
}

function getQualitySeverityRank( severity ) {
	return severity === 'high' ? 0 : 1;
}

function formatPercent( value ) {
	return `${ ( value * 100 ).toFixed( 1 ) }%`;
}

function isGroupEnabled( groupName ) {
	return ( state.enabledGroups ?? [] ).includes( groupName );
}

function getGroupProfileRecordCount( groupName ) {
	const profile = PROFILE_BY_GROUP[ groupName ];
	return profile ? state.recordCountsByProfile?.[ profile ] ?? 0 : 0;
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
		if ( ! Number.isFinite( timestamp ) || timestamp < cutoff ) {
			return false;
		}
		return true;
	} );
}

function clearHistoricalKnownNoisePauses() {
	let cleared = 0;
	for ( const [ group, value ] of Object.entries(
		state.pausedGroups ?? {}
	) ) {
		if ( ! isStaleHistoricalNoisePause( value ) ) {
			continue;
		}
		delete state.pausedGroups[ group ];
		cleared += 1;
	}
	return cleared;
}

function clearStaleStartupNoisePauses() {
	let cleared = 0;
	for ( const [ group, value ] of Object.entries(
		state.pausedGroups ?? {}
	) ) {
		if ( getStoredNoisePauseKind( value ) !== 'startup-noise' ) {
			continue;
		}
		const keepReusable =
			isReusableStartupNoisePause( value ) &&
			getPauseExpirationMs( value, TRIAGE_NOISE_PAUSE_COOLDOWN_HOURS ) >
				Date.now();
		if ( isCurrentOutputStartupNoiseCooldown( value ) || keepReusable ) {
			continue;
		}
		delete state.pausedGroups[ group ];
		cleared += 1;
	}
	return cleared;
}

function restoreReusableStartupNoisePausesFromChanges() {
	state.pausedGroups ??= {};
	let restored = 0;

	for ( const change of state.changes ?? [] ) {
		if (
			! [
				'pause-group',
				'sync-supervisor-startup-stall-pause',
				'import-previous-supervisor-startup-stall-pause',
			].includes( change?.action ) ||
			typeof change.group !== 'string'
		) {
			continue;
		}

		const candidate = {
			at: change.at,
			reason: change.reason,
			outputDir: change.outputDir,
			originOutputDir: change.originOutputDir ?? change.outputDir,
			expiresAt: change.expiresAt,
			reasonKind: 'startup-noise',
			family: change.family ?? 'pre_action_bootstrap_stall',
			source: change.source ?? 'restored-change-startup-noise-cooldown',
			noProductOnly: change.noProductOnly,
			productEvidenceRecords: change.productEvidenceRecords,
			preserveProductEvidence: change.preserveProductEvidence,
		};
		if ( ! isReusableStartupNoisePause( candidate ) ) {
			continue;
		}

		const expiresAtMs = getPauseExpirationMs(
			candidate,
			TRIAGE_NOISE_PAUSE_COOLDOWN_HOURS
		);
		if ( expiresAtMs <= Date.now() ) {
			continue;
		}

		const existing = getUnexpiredNoisePause(
			state.pausedGroups[ change.group ]
		);
		const existingExpiresAtMs = existing
			? getPauseExpirationMs(
					existing,
					TRIAGE_NOISE_PAUSE_COOLDOWN_HOURS
			  )
			: 0;
		if ( existing && existingExpiresAtMs >= expiresAtMs ) {
			continue;
		}

		state.pausedGroups[ change.group ] = {
			...normalizeReusableStartupNoisePause( candidate ),
			expiresAt: new Date( expiresAtMs ).toISOString(),
		};
		restored += 1;
	}

	return restored;
}

function clearStartupFailureDedupeAffectedPauses() {
	let cleared = 0;
	let preserved = 0;
	for ( const group of [
		'novelty-ws-real-user-editing',
		'novelty-ws-real-user-rich-text',
	] ) {
		const paused = state.pausedGroups?.[ group ];
		if (
			! paused ||
			getStoredNoisePauseKind( paused ) !== 'startup-noise'
		) {
			continue;
		}

		const profile = PROFILE_BY_GROUP[ group ];
		if ( profile ) {
			delete state.startupFailureCountsByProfile[ profile ];
		}
		if (
			group === 'novelty-ws-real-user-rich-text' &&
			/^profile real-user-editing produced \d+\/\d+ strict pre-action discovery\/startup failures/.test(
				paused.reason ?? ''
			)
		) {
			const preservedPause = getUnexpiredNoisePause( paused );
			if ( preservedPause ) {
				state.pausedGroups[ group ] = preservedPause;
				preserved += 1;
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'preserve-shared-profile-startup-pause',
					group,
					reason: 'kept the unexpired no-product startup pause across real-user sibling groups so bootstrap rescue cannot rediscover the same startup-only family one profile at a time',
					expiresAt: preservedPause.expiresAt,
				} );
			} else {
				delete state.pausedGroups[ group ];
				cleared += 1;
			}
			continue;
		}
		if ( group === 'novelty-ws-real-user-editing' ) {
			const expiresAtMs = getPauseExpirationMs(
				paused,
				TRIAGE_NOISE_PAUSE_COOLDOWN_HOURS
			);
			if ( expiresAtMs > Date.now() ) {
				state.pausedGroups[ group ] = {
					...paused,
					expiresAt: new Date( expiresAtMs ).toISOString(),
				};
				preserved += 1;
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'preserve-real-user-editing-startup-pause',
					group,
					reason: 'kept the direct no-product startup-only pause for the real-user editing group while allowing sibling rich-text coverage to be scheduled independently',
					expiresAt: state.pausedGroups[ group ].expiresAt,
				} );
				continue;
			}
		}
		const preservedPause = getUnexpiredNoisePause( paused );
		if (
			preservedPause &&
			isExplicitStartupNoisePauseReason( paused.reason )
		) {
			state.pausedGroups[ group ] = preservedPause;
			preserved += 1;
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'preserve-deduped-startup-noise-pause',
				group,
				reason: 'startup dedupe migration reset duplicate counters but kept the unexpired explicit no-product startup-noise pause',
				expiresAt: preservedPause.expiresAt,
			} );
			continue;
		}

		delete state.pausedGroups[ group ];
		cleared += 1;
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'clear-deduped-startup-noise-pause',
			group,
			reason: 'old policy could count the same pre-action seed once from behavioral coverage and once from infra summary; retrying under corrected seed-level accounting',
		} );
	}
	return { cleared, preserved };
}

function isStaleHistoricalNoisePause( value ) {
	const reason = value?.reason ?? '';
	if ( ! isNoisePauseReason( reason ) ) {
		return false;
	}
	const expiresAtMs = getPauseExpirationMs(
		value,
		TRIAGE_NOISE_PAUSE_COOLDOWN_HOURS
	);
	if ( expiresAtMs <= Date.now() ) {
		return true;
	}
	if ( /^historical known-noise hold\b/.test( reason ) ) {
		return true;
	}
	if ( getStoredNoisePauseKind( value ) === 'startup-noise' ) {
		return (
			! isCurrentOutputPause( value ) &&
			! isReusableStartupNoisePause( value )
		);
	}
	return (
		typeof value?.outputDir === 'string' &&
		path.resolve( value.outputDir ) !== path.resolve( OUTPUT_DIR )
	);
}

function getStartupFailureStats( group, profile ) {
	const hasGroupScope = !! group;
	const failures = hasGroupScope
		? state.startupFailureCountsByGroup?.[ group ] ?? 0
		: state.startupFailureCountsByProfile?.[ profile ] ?? 0;
	const records = hasGroupScope
		? state.currentRunRecordCountsByGroup?.[ group ] ?? 0
		: state.currentRunRecordCountsByProfile?.[ profile ] ?? 0;
	const rate = records > 0 ? failures / records : 0;

	return {
		failures,
		records,
		rate,
		scope: hasGroupScope ? 'group' : 'profile',
		scopeName: hasGroupScope ? group : profile,
	};
}

function hasExcessiveStartupFailures( group, profile ) {
	const { failures, records, rate } = getStartupFailureStats(
		group,
		profile
	);

	if ( failures < STARTUP_FAILURE_LIMIT ) {
		return false;
	}

	if ( failures >= STARTUP_FAILURE_ABSOLUTE_LIMIT ) {
		return true;
	}

	if ( records < STARTUP_FAILURE_MIN_RECORDS_FOR_RATE ) {
		return true;
	}

	return rate >= STARTUP_FAILURE_RATE_LIMIT;
}

function hasActiveStartupFailureCooldown( group, profile ) {
	return (
		hasRecentStartupFailurePause( group ) &&
		hasExcessiveStartupFailures( group, profile )
	);
}

function isBehaviorDisableEnvName( name ) {
	return /(?:^|_)DISABLE_(SYNC_FAULTS|PARSER_STRESS|REVISION_RESTORE|RELOAD|RANDOM_RELOAD)$/.test(
		name
	);
}

function assertNoBehaviorDisableEnv( env, context ) {
	const disabledKeys = Object.keys( env ).filter( isBehaviorDisableEnvName );
	if ( disabledKeys.length === 0 ) {
		return;
	}
	throw new Error(
		`${ context } must not set behavior-disable env keys: ${ disabledKeys.join(
			', '
		) }`
	);
}

async function writeNoAnalysisSentinelsForMatchingLocalNoiseHold(
	rootHold,
	runDirs
) {
	const matches = [];
	for ( const runDir of uniquePathList( runDirs ?? [] ) ) {
		const localYield = await summarizeTriageYield( [ runDir ] );
		const localHold = getCurrentRunDuplicateNoiseHold( localYield, {
			allowGenericDuplicate: true,
			requireNoProductEvidence: true,
		} );
		if ( noiseHoldsMatch( rootHold, localHold ) ) {
			matches.push( { runDir, localYield } );
		}
	}

	if ( matches.length === 0 ) {
		return 0;
	}

	const productEvidenceRecords = matches.reduce(
		( total, match ) =>
			total +
			getTriageYieldProductEvidenceRecordCount( match.localYield ),
		0
	);
	const hasProductEvidence = productEvidenceRecords > 0;
	const reason = `current-run duplicate/noise hold is active for ${ rootHold.family } (${ rootHold.count } signatures, share=${ rootHold.share }, source=${ rootHold.source }) but no active producer group matched it; writing no-analysis sentinels only for local run dirs that reproduce the same no-product hold`;
	await writeNoAnalysisSentinelsForRunDirs(
		matches.map( ( match ) => match.runDir ),
		{
			reason,
			reasonKind: getEffectiveDuplicateNoiseHoldKind( rootHold ),
			family: rootHold.family,
			source: 'local-current-run-noise-hold',
			...( isCurrentNoProductStartupHold( rootHold )
				? {
						noProductOnly: ! hasProductEvidence,
						productEvidenceRecords,
						hasProductEvidence,
				  }
				: {} ),
		}
	);
	return matches.length;
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
	const env = {
		WP_ENV_PORT,
		WP_BASE_URL: BASE_URL,
		RTC_FUZZ_BASE_URL: BASE_URL,
		...( transport === 'ws' ? WS_ENV_DEFAULTS : {} ),
		RTC_FUZZ_ANALYSIS_RECHECKS: '1',
		RTC_FUZZ_BOOTSTRAP_STALL_RECHECKS: '0',
		...transportEnv,
		GUTENBERG_RTC_BROWSER_ACTION_PROFILE: profile.actionProfile,
		GUTENBERG_RTC_BROWSER_COLLECT_CDP_COVERAGE: profile.collectCdpCoverage
			? '1'
			: '0',
		...profile.env,
	};
	assertNoBehaviorDisableEnv( env, profile.name );

	return {
		name: profile.name,
		repoRoot: REPO_ROOT,
		transport,
		fuzzLevel: profile.fuzzLevel ?? 'browser-e2e',
		lanes: profile.lanes ?? 1,
		startSeed: profile.startSeed,
		stepCount: profile.stepCount,
		...( transport === 'ws'
			? { wsPort: Number.parseInt( WS_PORT, 10 ) }
			: {} ),
		env,
	};
}

async function writeSupervisorGroupsForEnabledGroups( enabledGroups ) {
	const enabled = new Set( enabledGroups ?? [] );
	const groups = PROFILE_GROUPS.filter( ( profile ) =>
		enabled.has( profile.name )
	).map( buildGroup );
	await writeJsonFileAtomic( GROUPS_PATH, groups );
}

async function applyPolicy(
	novelty,
	resources,
	triageYield,
	guidance,
	supervisorState = null
) {
	const enabled = new Set( state.enabledGroups );
	const supervisorGroupsByName = new Map(
		( supervisorState?.groups ?? [] ).map( ( groupState ) => [
			groupState.name,
			groupState,
		] )
	);
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
	const mediaCrossEntityEnabled = enabled.has(
		'novelty-ws-media-cross-entity'
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
	const activeDuplicateNoiseTriageYield =
		state.triageYieldCurrent ?? triageYield;
	const drainDuplicateNoiseTriageYield =
		state.triageYieldCurrentIncludingPausedNoAnalysis ??
		activeDuplicateNoiseTriageYield;
	const activeCurrentRunDuplicateNoiseHold = PAUSE_ON_TRIAGE_NOISE
		? withRunDirProducerGroups(
				getCurrentRunDuplicateNoiseHold(
					activeDuplicateNoiseTriageYield
				),
				state.currentRunDirs ?? []
		  )
		: null;
	const drainCurrentRunDuplicateNoiseHold = PAUSE_ON_TRIAGE_NOISE
		? withRunDirProducerGroups(
				getCurrentRunDuplicateNoiseHold(
					drainDuplicateNoiseTriageYield
				),
				state.currentRunDirsIncludingPausedNoAnalysis ??
					state.currentRunDirs ??
					[]
		  )
		: null;
	const currentRunDuplicateNoiseHold =
		activeCurrentRunDuplicateNoiseHold ??
		( drainCurrentRunDuplicateNoiseHold
			? {
					...drainCurrentRunDuplicateNoiseHold,
					scope: 'active/drain current-run',
					drainOnly: true,
			  }
			: null );
	const drainOnlyCurrentRunStartupHold =
		! isCurrentNoProductStartupHold( activeCurrentRunDuplicateNoiseHold ) &&
		isCurrentNoProductStartupHold( drainCurrentRunDuplicateNoiseHold )
			? {
					...drainCurrentRunDuplicateNoiseHold,
					scope: 'active/drain current-run',
					drainOnly: true,
			  }
			: null;
	const fleetNoProductStartupNoiseHold = PAUSE_ON_TRIAGE_NOISE
		? getFleetNoProductStartupNoiseHold()
		: null;
	const holdNoisyBlockTopOff =
		PAUSE_ON_TRIAGE_NOISE &&
		shouldHoldNoisyBlockTopOff( activeDuplicateNoiseTriageYield );
	const dominantRealUserFamilyHold = PAUSE_ON_TRIAGE_NOISE
		? getCurrentRunProductEvidenceDuplicateHold(
				drainDuplicateNoiseTriageYield,
				state.currentRunDirsIncludingPausedNoAnalysis ??
					state.currentRunDirs ??
					[]
		  )
		: null;
	const recentProductEvidenceDuplicateFamilyCooldown = PAUSE_ON_TRIAGE_NOISE
		? getRecentProductEvidenceDuplicateFamilyCooldown()
		: null;
	const effectiveProductEvidenceDuplicateFamilyHold =
		dominantRealUserFamilyHold ??
		recentProductEvidenceDuplicateFamilyCooldown;
	const holdDominantRealUserFamilyActive =
		!! effectiveProductEvidenceDuplicateFamilyHold;
	const lateJoin3Records =
		state.featureCounts?.[ 'lifecycle:late-join:users-3' ] ?? 0;
	const sameUserRecords =
		state.featureCounts?.[ 'collaborator-mode:same-user' ] ?? 0;
	const reload2Records = state.featureCounts?.[ 'reload-count:2' ] ?? 0;
	const revisionEligibleRecords =
		state.featureCounts?.[ 'revision-eligible:true' ] ?? 0;
	const mediaUploadRecords =
		state.featureCounts?.[ 'media-cross-entity:media-upload' ] ?? 0;
	const reusableBlockRecords =
		state.featureCounts?.[ 'media-cross-entity:reusable-block' ] ?? 0;
	const mediaCrossEntitySuccessRecords =
		getSuccessfulProfileCount( 'media-cross-entity' );
	const recommendedGroupsForPass = new Set(
		guidance?.recommendedGroups ?? []
	);

	function groupHasCurrentProductEvidence( group ) {
		return supervisorGroupHasProductEvidence(
			supervisorGroupsByName.get( group )
		);
	}

	function canBypassStartupNoiseCooldown( group, activeNoisePause ) {
		if (
			holdDominantRealUserFamilyActive &&
			shouldProductEvidenceDuplicateHoldBlockGroup(
				effectiveProductEvidenceDuplicateFamilyHold,
				group
			)
		) {
			return false;
		}
		return (
			activeNoisePause?.kind === 'startup-noise' &&
			groupHasCurrentProductEvidence( group ) &&
			( activeNoisePause.reusableStartupNoisePause === true ||
				activeNoisePause.noProductOnly === false ||
				activeNoisePause.hasProductEvidence === true )
		);
	}

	function canBypassEmptyMaterializationNoiseCooldown(
		group,
		activeNoisePause
	) {
		return canBypassStartupNoiseCooldown( group, activeNoisePause );
	}

	function getEmptyMaterializationRescueNoiseBlock( group ) {
		const activeNoisePause = getActiveNoisePauseCooldown( group );
		if (
			activeNoisePause &&
			! canBypassEmptyMaterializationNoiseCooldown(
				group,
				activeNoisePause
			)
		) {
			return activeNoisePause;
		}
		return null;
	}

	function getCurrentStartupHoldEnableBlock(
		group,
		{ allowUnrelatedStartupReplacement = false } = {}
	) {
		if (
			canBypassStartupNoiseCooldown(
				group,
				state.pausedGroups?.[ group ]
			)
		) {
			return null;
		}
		const groupHold = getSupervisorStartupNoiseHold(
			supervisorGroupsByName.get( group )
		);
		const hasCurrentProductEvidence =
			groupHasCurrentProductEvidence( group );
		if (
			refillBlockingDuplicateNoiseProducer &&
			! hasCurrentProductEvidence
		) {
			if (
				isProductEvidenceDuplicateFamilyHold(
					refillBlockingDuplicateNoiseProducer.hold
				) &&
				group !== refillBlockingDuplicateNoiseProducer.name &&
				! shouldProductEvidenceDuplicateHoldBlockGroup(
					refillBlockingDuplicateNoiseProducer.hold,
					group
				)
			) {
				return null;
			}
			const matchedProducerHold =
				refillBlockingDuplicateNoiseProducerGroups.has( group ) ||
				noiseHoldsMatch(
					refillBlockingDuplicateNoiseProducer.hold,
					groupHold
				);
			if (
				! matchedProducerHold &&
				allowUnrelatedStartupReplacement &&
				refillBlockingDuplicateNoiseProducer.hold?.kind ===
					'startup-noise' &&
				canUseGroupAsNoiseReplacement( group, {
					originGroup: refillBlockingDuplicateNoiseProducer.name,
					reasonKind:
						getEffectiveDuplicateNoiseHoldKind(
							refillBlockingDuplicateNoiseProducer.hold
						) ?? 'startup-noise',
					family: refillBlockingDuplicateNoiseProducer.hold.family,
					source: refillBlockingDuplicateNoiseProducer.hold.source,
				} )
			) {
				return null;
			}
			return {
				hold: refillBlockingDuplicateNoiseProducer.hold,
				matchedProducerHold,
				producerLocal: true,
				producerName: refillBlockingDuplicateNoiseProducer.name,
			};
		}
		if ( isCurrentNoProductStartupHold( currentRunDuplicateNoiseHold ) ) {
			const matchedProducerHold = noiseHoldsMatch(
				currentRunDuplicateNoiseHold,
				groupHold
			);
			if (
				! hasCurrentProductEvidence &&
				( matchedProducerHold ||
					isStartupHoldBlockingProducerGroup(
						currentRunDuplicateNoiseHold,
						group
					) )
			) {
				return {
					hold: currentRunDuplicateNoiseHold,
					matchedProducerHold,
					globalActiveHold: ! matchedProducerHold,
				};
			}
		}
		if ( isCurrentNoProductStartupHold( drainOnlyCurrentRunStartupHold ) ) {
			const matchedProducerHold = noiseHoldsMatch(
				drainOnlyCurrentRunStartupHold,
				groupHold
			);
			if (
				! hasCurrentProductEvidence &&
				( matchedProducerHold ||
					isStartupHoldBlockingProducerGroup(
						drainOnlyCurrentRunStartupHold,
						group
					) )
			) {
				return {
					hold: drainOnlyCurrentRunStartupHold,
					matchedProducerHold,
					drainOnly: true,
					globalDrainHold: ! matchedProducerHold,
				};
			}
		}
		if (
			fleetNoProductStartupNoiseHold &&
			! hasCurrentProductEvidence &&
			isStartupHoldBlockingProducerGroup(
				fleetNoProductStartupNoiseHold,
				group
			)
		) {
			return {
				hold: fleetNoProductStartupNoiseHold,
				matchedProducerHold: true,
				fleetStartupNoiseHold: true,
			};
		}
		return null;
	}

	function shouldBlockGroupEnableForCurrentStartupHold(
		group,
		options = {}
	) {
		return !! getCurrentStartupHoldEnableBlock( group, options );
	}

	function getCurrentStartupHoldEnableBlockReason( group ) {
		const block = getCurrentStartupHoldEnableBlock( group );
		const hold = block?.hold ?? currentRunDuplicateNoiseHold;
		const scope = block?.matchedProducerHold
			? 'matches this producer'
			: `is active in ${ hold?.scope ?? 'current active-run' } scope`;
		if ( block?.drainOnly ) {
			return `drain-only no-product startup-noise hold ${ scope } for ${ hold.family } (${ hold.count } signatures, share=${ hold.share }, source=${ hold.source }); do not refill browser capacity with no-product fallback/materialization groups until current product evidence exists or the hold clears`;
		}
		if ( block?.producerLocal ) {
			if ( isProductEvidenceDuplicateFamilyHold( hold ) ) {
				return `active producer ${ block.producerName } has a current product-evidence duplicate hold for ${ hold.family } (${ hold.count } signatures, share=${ hold.share }, source=${ hold.source }); do not enable replacement browser producers without current product evidence until the representative remains capped`;
			}
			return `active producer ${ block.producerName } has a current startup-noise hold for ${ hold.family } (${ hold.count } signatures, share=${ hold.share }, source=${ hold.source }); do not enable replacement browser producers without current product evidence until this leaking producer is drained`;
		}
		if ( block?.fleetStartupNoiseHold ) {
			return `fleet no-product startup-noise hold is active for ${ hold.family } across ${ hold.count } producer groups (share=${ hold.share }, source=${ hold.source }); do not enable another browser producer without current product evidence until the hold clears`;
		}
		return `current no-product startup-noise hold ${ scope } for ${ hold.family } (${ hold.count } signatures, share=${ hold.share }, source=${ hold.source }); do not enable browser producers without current product evidence until the hold clears`;
	}

	function currentStartupHoldMatchesGroup( group ) {
		return !! getCurrentStartupHoldEnableBlock( group )
			?.matchedProducerHold;
	}

	function getNoiseReplacementHold( replacement ) {
		if ( ! replacement ) {
			return null;
		}
		return {
			kind: replacement.reasonKind,
			family: replacement.family,
			source: replacement.source,
		};
	}

	function canUseGroupAsNoiseReplacement( group, replacement ) {
		if ( ! replacement || group === replacement.originGroup ) {
			return false;
		}
		if ( refillBlockingDuplicateNoiseProducerGroups.has( group ) ) {
			return false;
		}
		const replacementHold = getNoiseReplacementHold( replacement );
		const groupHold = getSupervisorStartupNoiseHold(
			supervisorGroupsByName.get( group )
		);
		if ( noiseHoldsMatch( replacementHold, groupHold ) ) {
			return false;
		}
		return true;
	}

	function canPauseNoiseBelowMaterializationFloor( replacement ) {
		return [
			'startup-noise',
			'known-noise',
			'triage-duplicate-noise',
		].includes( replacement?.reasonKind ?? '' );
	}

	function getRecommendedStartupCooldownRetryGroup() {
		if (
			( guidance?.noProgressPasses ?? 0 ) <
				COVERAGE_GUIDANCE_STALL_PASSES ||
			( guidance?.qualityIssues?.length ?? 0 ) > 0 ||
			( guidance?.qualityIssuePasses ?? 0 ) >=
				COVERAGE_QUALITY_ISSUE_PASSES ||
			holdDominantRealUserFamilyActive ||
			isCurrentNoProductStartupHold( currentRunDuplicateNoiseHold ) ||
			isCurrentNoProductStartupHold( drainOnlyCurrentRunStartupHold )
		) {
			return null;
		}

		for ( const candidate of [
			'novelty-ws-real-user-save-reload',
			'novelty-ws-real-user-editing',
			'novelty-ws-real-user-rich-text',
		] ) {
			if (
				! recommendedGroupsForPass.has( candidate ) ||
				enabled.has( candidate ) ||
				state.disabledGroups?.[ candidate ]
			) {
				continue;
			}
			const activeNoisePause = getActiveNoisePauseCooldown( candidate );
			if (
				activeNoisePause?.kind === 'startup-noise' &&
				activeNoisePause.scope === 'profile' &&
				activeNoisePause.noProductOnly !== false
			) {
				return candidate;
			}
		}

		return null;
	}

	const recommendedStartupCooldownRetryGroup =
		getRecommendedStartupCooldownRetryGroup();
	let recommendedStartupCooldownRetryUsed = false;

	function canBypassRecommendedStartupNoiseCooldown(
		group,
		activeNoisePause
	) {
		return (
			! recommendedStartupCooldownRetryUsed &&
			group === recommendedStartupCooldownRetryGroup &&
			activeNoisePause?.kind === 'startup-noise' &&
			activeNoisePause.scope === 'profile'
		);
	}

	function shouldApplyProfileStartupFailurePause( group ) {
		return ! groupHasCurrentProductEvidence( group );
	}

	function getHistoricalProductEvidenceHoldProbeGroup() {
		if (
			dominantRealUserFamilyHold ||
			! recentProductEvidenceDuplicateFamilyCooldown
		) {
			return null;
		}
		if (
			[ ...enabled ].some( ( enabledGroup ) =>
				REAL_USER_DUPLICATE_FAMILY_HOLD_GROUPS.includes( enabledGroup )
			)
		) {
			return null;
		}
		const candidates = [
			...( guidance?.recommendedGroups ?? [] ),
			...REAL_USER_DUPLICATE_FAMILY_HOLD_GROUPS,
		];
		for ( const candidate of candidates ) {
			if (
				REAL_USER_DUPLICATE_FAMILY_HOLD_GROUPS.includes( candidate ) &&
				! state.disabledGroups?.[ candidate ] &&
				! getActiveNoisePauseCooldown( candidate )
			) {
				return candidate;
			}
		}
		return null;
	}

	const historicalProductEvidenceHoldProbeGroup =
		getHistoricalProductEvidenceHoldProbeGroup();

	function shouldBypassDominantRealUserFamilyHold( group ) {
		return group === historicalProductEvidenceHoldProbeGroup;
	}

	function shouldBlockGroupEnableForDuplicateNoiseHold( group ) {
		return (
			holdDominantRealUserFamilyActive &&
			shouldProductEvidenceDuplicateHoldBlockGroup(
				effectiveProductEvidenceDuplicateFamilyHold,
				group
			) &&
			! shouldBypassDominantRealUserFamilyHold( group )
		);
	}

	function getDuplicateNoiseHoldEnableBlockReason() {
		const hold = effectiveProductEvidenceDuplicateFamilyHold;
		const scope = dominantRealUserFamilyHold
			? 'current-run'
			: 'recent cross-root';
		const producerScope = hold.groupName ? ` from ${ hold.groupName }` : '';
		return `${ scope } product-evidence duplicate family ${
			hold.family
		}${ producerScope } is already represented (${ hold.count }/${
			hold.total ?? hold.count
		} ${ hold.source } signatures, share=${ hold.share }, representative=${
			hold.representativeSignal
		}); do not enable another held producer for this family while preserving existing product-evidence signatures`;
	}

	const materializationRescueGroups = new Set( [
		...MATERIALIZATION_FLOOR_GROUPS,
		...PRODUCTIVE_FALLBACK_GROUPS,
	] );
	let noisyProducerGroups = [];
	let refillBlockingDuplicateNoiseProducer = null;
	const refillBlockingDuplicateNoiseProducerGroups = new Set();

	function isActiveCurrentTriageClear() {
		const current = activeDuplicateNoiseTriageYield ?? {};
		const activeSignals = Math.max(
			current.signatureCount ?? 0,
			current.rawSignatureCount ?? 0,
			current.noProductRawSignatureCount ?? 0,
			current.productEvidenceSignatures ?? 0,
			current.summaryProductEvidenceRecords ?? 0,
			current.bootstrapStalls ?? 0,
			current.suppressedStrictStartupRecords ?? 0,
			current.summaryStrictStartupRecords ?? 0
		);
		return (
			activeSignals === 0 &&
			( current.likelyRealVisible ?? 0 ) === 0 &&
			( current.topDuplicateFamilyShare ?? 0 ) === 0
		);
	}

	function currentRunDirsAfterPlannedRemoval( plannedRemoval = null ) {
		if ( ! plannedRemoval ) {
			return state.currentRunDirs ?? [];
		}
		return ( state.currentRunDirs ?? [] ).filter(
			( runDir ) => getRunGroupNameFromPath( runDir ) !== plannedRemoval
		);
	}

	function shouldUseEmptyMaterializationRescue(
		group,
		{ plannedRemoval = null } = {}
	) {
		const activeRunDirsAfterPlannedRemoval =
			currentRunDirsAfterPlannedRemoval( plannedRemoval );
		const startupHoldBlock = getCurrentStartupHoldEnableBlock( group, {
			allowUnrelatedStartupReplacement: true,
		} );
		const startupHoldBlocksRescue = !! startupHoldBlock;
		if (
			! START_SUPERVISOR ||
			! materializationRescueGroups.has( group ) ||
			activeRunDirsAfterPlannedRemoval.length !== 0 ||
			( ! plannedRemoval && ! isActiveCurrentTriageClear() ) ||
			getEnabledBrowserLaneCountWithPlannedRemoval( plannedRemoval ) >=
				MIN_ENABLED_BROWSER_LANES ||
			getEmptyMaterializationRescueNoiseBlock( group ) ||
			startupHoldBlocksRescue ||
			shouldBlockGroupEnableForDuplicateNoiseHold( group )
		) {
			return false;
		}
		return true;
	}

	function getConfiguredLaneCount( group ) {
		return (
			PROFILE_GROUPS.find( ( profile ) => profile.name === group )
				?.lanes ?? 1
		);
	}

	function getEnabledBrowserLaneCount( groupSet = enabled ) {
		let laneCount = 0;
		for ( const group of groupSet ) {
			laneCount += getConfiguredLaneCount( group );
		}
		return laneCount;
	}

	function getEnabledBrowserLaneCountWithPlannedRemoval(
		plannedRemoval = null
	) {
		if ( ! plannedRemoval ) {
			return getEnabledBrowserLaneCount();
		}
		const planned = new Set( enabled );
		planned.delete( plannedRemoval );
		return getEnabledBrowserLaneCount( planned );
	}

	function getEnabledBrowserLaneCountAfterRemoving( group ) {
		const after = new Set( enabled );
		after.delete( group );
		return getEnabledBrowserLaneCount( after );
	}

	function getMaterializationFloorPauseBlockReason( group ) {
		const afterLaneCount = getEnabledBrowserLaneCountAfterRemoving( group );
		if ( afterLaneCount >= MIN_ENABLED_BROWSER_LANES ) {
			return null;
		}
		return `coverage-guided browser materialization floor would drop to ${ afterLaneCount } configured lane(s) after pausing ${ group }; floor=${ MIN_ENABLED_BROWSER_LANES }`;
	}

	function canUseGroupForMaterializationFloor(
		group,
		{ plannedRemoval = null, noiseReplacement = null } = {}
	) {
		if (
			! group ||
			enabled.has( group ) ||
			state.disabledGroups?.[ group ]
		) {
			return false;
		}
		const paused = state.pausedGroups?.[ group ];
		const activeNoisePause = getActiveNoisePauseCooldown( group );
		if (
			shouldUseEmptyMaterializationRescue( group, {
				plannedRemoval,
			} )
		) {
			return true;
		}
		if (
			paused &&
			( getStoredNoisePauseKind( paused ) ||
				isCurrentOutputPause( paused ) )
		) {
			return false;
		}
		if ( activeNoisePause ) {
			return false;
		}
		if (
			noiseReplacement &&
			! canUseGroupAsNoiseReplacement( group, noiseReplacement )
		) {
			return false;
		}
		if (
			shouldBlockGroupEnableForCurrentStartupHold( group, {
				allowUnrelatedStartupReplacement: !! noiseReplacement,
			} )
		) {
			return false;
		}
		if ( shouldBlockGroupEnableForDuplicateNoiseHold( group ) ) {
			return false;
		}
		if (
			holdNoisyBlockTopOff &&
			[
				'novelty-ws-common-blocks',
				'novelty-ws-block-gauntlet',
			].includes( group )
		) {
			return false;
		}
		if (
			holdDominantRealUserFamilyActive &&
			shouldProductEvidenceDuplicateHoldBlockGroup(
				effectiveProductEvidenceDuplicateFamilyHold,
				group
			) &&
			! shouldBypassDominantRealUserFamilyHold( group )
		) {
			return false;
		}
		const enabledSizeAfterPlannedRemoval =
			enabled.size -
			( plannedRemoval && enabled.has( plannedRemoval ) ? 1 : 0 );
		if ( enabledSizeAfterPlannedRemoval >= MAX_ENABLED_GROUPS ) {
			return false;
		}
		return !! PROFILE_BY_GROUP[ group ];
	}

	async function ensureMaterializationFloorGroup( {
		plannedRemoval = null,
		noiseReplacement = null,
	} = {} ) {
		if (
			getEnabledBrowserLaneCountWithPlannedRemoval( plannedRemoval ) >=
			MIN_ENABLED_BROWSER_LANES
		) {
			return false;
		}
		const candidates = [
			...MATERIALIZATION_FLOOR_GROUPS,
			...( guidance?.recommendedGroups ?? [] ),
			...PRODUCTIVE_FALLBACK_GROUPS,
			...HIGH_VALUE_EXPANSION_GROUPS,
		];
		const seen = new Set();
		for ( const group of candidates ) {
			if ( seen.has( group ) ) {
				continue;
			}
			seen.add( group );
			if (
				! canUseGroupForMaterializationFloor( group, {
					plannedRemoval,
					noiseReplacement,
				} )
			) {
				continue;
			}
			const laneCountBeforeEnable =
				getEnabledBrowserLaneCountWithPlannedRemoval( plannedRemoval );
			const materializationRescue = shouldUseEmptyMaterializationRescue(
				group,
				{ plannedRemoval }
			);
			const enabledForFloor = await enableGroup(
				group,
				materializationRescue
					? `coverage-guided browser materialization had ${ laneCountBeforeEnable } configured lane(s), below floor=${ MIN_ENABLED_BROWSER_LANES }, and active current-run triage is clear with zero active dirs or a scoped startup-noise hold that does not match this group; enable one bounded rescue producer`
					: `coverage-guided browser materialization had ${ laneCountBeforeEnable } configured lane(s), below floor=${ MIN_ENABLED_BROWSER_LANES }; enable a bounded product-evidence-capable group through normal enable gates`,
				{
					budgetReserved: true,
					plannedRemovalForBudget: plannedRemoval,
					materializationRescue,
					materializationNoiseReplacement: noiseReplacement,
				}
			);
			if ( ! enabledForFloor ) {
				continue;
			}
			if ( materializationRescue ) {
				state.materializationRescueGroups = [
					...new Set( [
						...( state.materializationRescueGroups ?? [] ),
						group,
					] ),
				];
			}
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'materialization-floor-group-enabled',
				group,
				lanes: getConfiguredLaneCount( group ),
				reason: `normal enable gates accepted ${ group } as a materialization-floor replacement`,
				...( noiseReplacement
					? {
							replacementForNoiseProducer:
								noiseReplacement.originGroup,
							replacementReasonKind: noiseReplacement.reasonKind,
							replacementFamily: noiseReplacement.family,
					  }
					: {} ),
				...( plannedRemoval
					? { plannedRemovalForNoisePause: plannedRemoval }
					: {} ),
			} );
			if (
				getEnabledBrowserLaneCountWithPlannedRemoval(
					plannedRemoval
				) >= MIN_ENABLED_BROWSER_LANES
			) {
				return true;
			}
		}
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'hold-materialization-floor-no-safe-group',
			reason: noiseReplacement
				? `coverage-guided browser materialization is below floor=${ MIN_ENABLED_BROWSER_LANES }, but no bounded replacement group was available for noisy producer ${ noiseReplacement.originGroup } without reusing the same producer, a paused/cooling-down group, or a matching startup/noise hold`
				: `coverage-guided browser materialization is below floor=${ MIN_ENABLED_BROWSER_LANES }, but no bounded group was available without overriding max-group budget, disabled state, pause state, current/drain startup-noise hold, duplicate-family hold, or active noise cooldown`,
			...( plannedRemoval
				? { plannedRemovalForNoisePause: plannedRemoval }
				: {} ),
			...( noiseReplacement
				? {
						replacementForNoiseProducer:
							noiseReplacement.originGroup,
						replacementReasonKind: noiseReplacement.reasonKind,
						replacementFamily: noiseReplacement.family,
				  }
				: {} ),
		} );
		return false;
	}

	function canRotateAwayFromGroup( group ) {
		if ( isRequiredCoverageBreadthGroup( group ) ) {
			return false;
		}
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
			case 'novelty-ws-real-user-save-reload':
			case 'novelty-ws-real-user-editing':
				return ! realUserEditingNeedsCoverage;
			case 'novelty-ws-revision-persistence':
				return revisionEligibleRecords >= 500;
			case 'novelty-ws-three-user-late-join':
				return lateJoin3Records >= LATE_JOIN_LIFECYCLE_MIN_RECORDS;
			case 'novelty-ws-multi-reload-lifecycle':
				return reload2Records >= 100;
			case 'novelty-ws-media-cross-entity':
				return (
					mediaCrossEntitySuccessRecords >= 25 &&
					mediaUploadRecords >= 10 &&
					reusableBlockRecords >= 5
				);
			case 'novelty-ws-same-user-lifecycle':
				return sameUserRecords >= 150;
			default:
				return false;
		}
	}

	async function pauseRotationCandidate(
		group,
		reason,
		{ force = false } = {}
	) {
		if ( ! force && enabled.size < TARGET_ENABLED_GROUPS ) {
			return true;
		}

		const candidates = [
			...ROTATION_PAUSE_ORDER,
			...HIGH_VALUE_EXPANSION_GROUPS.filter( canRotateAwayFromGroup ),
		];

		for ( const candidate of candidates ) {
			if (
				candidate === group ||
				! enabled.has( candidate ) ||
				isRequiredCoverageBreadthGroup( candidate ) ||
				recommendedGroupsForPass.has( candidate )
			) {
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
		{
			allowRotation = false,
			budgetReserved = false,
			plannedRemovalForBudget = null,
			materializationRescue = false,
			materializationNoiseReplacement = null,
		} = {}
	) {
		let rotationReservedBudget = false;
		const materializationRescueAllowed =
			materializationRescue &&
			shouldUseEmptyMaterializationRescue( group, {
				plannedRemoval: plannedRemovalForBudget,
			} );
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

		if (
			! materializationRescueAllowed &&
			shouldBlockGroupEnableForCurrentStartupHold( group )
		) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'skip-enable-current-startup-noise-hold',
				group,
				reason: getCurrentStartupHoldEnableBlockReason( group ),
				...( currentStartupHoldMatchesGroup( group )
					? { matchedProducerHold: true }
					: { matchedProducerHold: false } ),
			} );
			return false;
		}

		if (
			! materializationRescueAllowed &&
			shouldBlockGroupEnableForDuplicateNoiseHold( group )
		) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'skip-enable-duplicate-family-hold',
				group,
				reason: getDuplicateNoiseHoldEnableBlockReason(),
			} );
			return false;
		}

		const activeNoisePause = getActiveNoisePauseCooldown(
			group,
			triageYield
		);
		if ( activeNoisePause ) {
			if ( canBypassStartupNoiseCooldown( group, activeNoisePause ) ) {
				delete state.pausedGroups[ group ];
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'bypass-startup-noise-cooldown-with-product-evidence',
					group,
					reason: `current supervisor state has product-evidence coverage for ${ group }; ignoring shared startup-noise cooldown from ${ activeNoisePause.at } while preserving coverage-guided scheduling`,
				} );
			} else {
				state.changes.push( {
					at: new Date().toISOString(),
					action: materializationRescue
						? 'skip-empty-materialization-rescue-noise-cooldown'
						: 'keep-paused-noise-cooldown',
					group,
					reason: `recent ${ activeNoisePause.kind } pause at ${ activeNoisePause.at } is still inside the ${ TRIAGE_NOISE_PAUSE_COOLDOWN_HOURS }h cooldown; empty-materialization rescue cannot revive startup/known-noise producers without current product evidence: ${ activeNoisePause.reason }`,
					expiresAt: activeNoisePause.expiresAt,
					...( activeNoisePause.originGroup
						? { originGroup: activeNoisePause.originGroup }
						: {} ),
				} );
				return false;
			}
		}

		if (
			state.pausedGroups?.[ group ] &&
			getStoredNoisePauseKind( state.pausedGroups[ group ] ) &&
			! materializationRescueAllowed
		) {
			const storedNoisePause = state.pausedGroups[ group ];
			const activeStoredNoisePause = getActiveNoisePauseForEntry(
				group,
				storedNoisePause
			);
			if ( activeStoredNoisePause ) {
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'keep-paused-noise-cooldown',
					group,
					reason: `stored ${ activeStoredNoisePause.kind } pause remains active for this group; do not revive it through materialization or fallback scheduling`,
					expiresAt: activeStoredNoisePause.expiresAt,
				} );
				return false;
			}

			delete state.pausedGroups[ group ];
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'prune-expired-noise-pause',
				group,
				reason: `stored ${ getStoredNoisePauseKind(
					storedNoisePause
				) } pause expired and no longer blocks enablement`,
			} );
		}

		if (
			state.pausedGroups?.[ group ] &&
			! allowRotation &&
			! materializationRescueAllowed
		) {
			return false;
		}

		const profile = PROFILE_BY_GROUP[ group ];
		if (
			! materializationRescueAllowed &&
			state.pausedGroups?.[ group ] &&
			profile !== undefined &&
			shouldApplyProfileStartupFailurePause( group ) &&
			( hasExcessiveStartupFailures( group, profile ) ||
				hasActiveStartupFailureCooldown( group, profile ) )
		) {
			const { failures, records, rate } = getStartupFailureStats(
				group,
				profile
			);
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'keep-paused-startup-failures',
				group,
				profile,
				reason: `group ${ group } is still inside the pre-action startup failure cooldown (${ failures }/${ records } startup failures, rate=${ formatPercent(
					rate
				) })`,
			} );
			return false;
		}

		if (
			allowRotation &&
			! budgetReserved &&
			enabled.size >= MAX_ENABLED_GROUPS
		) {
			rotationReservedBudget = await pauseRotationCandidate(
				group,
				`max-enabled-group budget reached; ${ reason }`,
				{ force: true }
			);
			if ( ! rotationReservedBudget ) {
				return false;
			}
		}

		if (
			allowRotation &&
			! budgetReserved &&
			! rotationReservedBudget &&
			! resources.hasHeadroom &&
			enabled.size >= TARGET_ENABLED_GROUPS &&
			! ( await pauseRotationCandidate( group, reason ) )
		) {
			return false;
		}

		const enabledSizeForBudget =
			enabled.size -
			( plannedRemovalForBudget && enabled.has( plannedRemovalForBudget )
				? 1
				: 0 );
		if (
			enabledSizeForBudget >= MAX_ENABLED_GROUPS ||
			( enabled.size >= TARGET_ENABLED_GROUPS &&
				! resources.hasHeadroom &&
				! allowRotation &&
				! budgetReserved )
		) {
			return false;
		}

		if ( state.pausedGroups?.[ group ] ) {
			const pausedReason = state.pausedGroups[ group ]?.reason ?? '';
			delete state.pausedGroups[ group ];
			if ( profile && ! isNoisePauseReason( pausedReason ) ) {
				delete state.startupFailureCountsByProfile[ profile ];
				delete state.startupFailureCountsByGroup[ group ];
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

	async function pauseGroup( group, reason, metadata = {} ) {
		if ( ! enabled.has( group ) ) {
			return false;
		}

		const pausedAt = new Date().toISOString();
		const noisePauseKind = getNoisePauseKind( reason, metadata.reasonKind );
		const noisePauseFamily =
			metadata.family ?? getNoisePauseFamily( noisePauseKind );
		const inferredNoProductStartupPause =
			noisePauseKind === 'startup-noise' &&
			hasNoProductStartupPauseEvidence( {
				reason,
				noProductOnly: metadata.noProductOnly,
				productEvidenceRecords: metadata.productEvidenceRecords,
			} );
		const noProductOnly =
			metadata.noProductOnly ??
			( inferredNoProductStartupPause ? true : undefined );
		const productEvidenceRecords =
			metadata.productEvidenceRecords ??
			( inferredNoProductStartupPause ? 0 : undefined );
		const materializationFloorBlockReason = noisePauseKind
			? getMaterializationFloorPauseBlockReason( group )
			: null;
		const noiseReplacement = noisePauseKind
			? {
					originGroup: group,
					reasonKind: noisePauseKind,
					family: noisePauseFamily,
					source: metadata.source,
			  }
			: null;
		if ( materializationFloorBlockReason ) {
			const replacementEnabled = await ensureMaterializationFloorGroup( {
				plannedRemoval: group,
				noiseReplacement,
			} );
			if (
				! replacementEnabled &&
				! canPauseNoiseBelowMaterializationFloor( noiseReplacement )
			) {
				state.changes.push( {
					at: pausedAt,
					action: 'skip-noise-pause-below-materialization-floor',
					group,
					reason: `${ materializationFloorBlockReason }; no clean replacement group is available, so keep the bounded browser producer running and rely on no-analysis sentinels until another materialized group is available`,
					originalPauseReason: reason,
					reasonKind: noisePauseKind,
					...( noisePauseFamily ? { family: noisePauseFamily } : {} ),
					...( metadata.source ? { source: metadata.source } : {} ),
					...( noProductOnly !== undefined ? { noProductOnly } : {} ),
					...( productEvidenceRecords !== undefined
						? { productEvidenceRecords }
						: {} ),
				} );
				return false;
			}
			if ( ! replacementEnabled ) {
				state.changes.push( {
					at: pausedAt,
					action: 'allow-noise-pause-below-materialization-floor',
					group,
					reason: `${ materializationFloorBlockReason }; no clean replacement group is available, so stop this known duplicate/noise producer instead of keeping browser capacity on a leaking family`,
					originalPauseReason: reason,
					reasonKind: noisePauseKind,
					...( noisePauseFamily ? { family: noisePauseFamily } : {} ),
					...( metadata.source ? { source: metadata.source } : {} ),
					...( noProductOnly !== undefined ? { noProductOnly } : {} ),
					...( productEvidenceRecords !== undefined
						? { productEvidenceRecords }
						: {} ),
					preserveProductEvidence: true,
				} );
			}
		}

		enabled.delete( group );
		const expiresAt = noisePauseKind
			? new Date(
					Date.now() +
						TRIAGE_NOISE_PAUSE_COOLDOWN_HOURS * 60 * 60 * 1000
			  ).toISOString()
			: null;
		state.pausedGroups[ group ] = {
			at: pausedAt,
			reason,
			outputDir: OUTPUT_DIR,
			...( noisePauseKind ? { reasonKind: noisePauseKind } : {} ),
			...( noisePauseFamily ? { family: noisePauseFamily } : {} ),
			...( metadata.source ? { source: metadata.source } : {} ),
			...( noProductOnly !== undefined ? { noProductOnly } : {} ),
			...( productEvidenceRecords !== undefined
				? { productEvidenceRecords }
				: {} ),
			...( noisePauseKind ? { preserveProductEvidence: true } : {} ),
			...( expiresAt ? { expiresAt } : {} ),
		};
		state.changes.push( {
			at: pausedAt,
			action: 'pause-group',
			group,
			reason,
			outputDir: OUTPUT_DIR,
			...( noisePauseKind ? { reasonKind: noisePauseKind } : {} ),
			...( noisePauseFamily ? { family: noisePauseFamily } : {} ),
			...( metadata.source ? { source: metadata.source } : {} ),
			...( noProductOnly !== undefined ? { noProductOnly } : {} ),
			...( productEvidenceRecords !== undefined
				? { productEvidenceRecords }
				: {} ),
			...( expiresAt ? { expiresAt } : {} ),
		} );
		state.enabledGroups = [ ...enabled ];
		await writeJsonFileAtomic( STATE_PATH, state );
		await writeSupervisorGroupsForEnabledGroups( enabled );
		await log( `Paused ${ group } group: ${ reason }` );
		if ( noisePauseKind ) {
			await writeNoAnalysisSentinelsForGroup( group, reason, {
				reasonKind: noisePauseKind,
				family: noisePauseFamily,
				source: metadata.source,
				expiresAt,
				...( noProductOnly !== undefined ? { noProductOnly } : {} ),
				...( productEvidenceRecords !== undefined
					? { productEvidenceRecords }
					: {} ),
				...( productEvidenceRecords !== undefined
					? { hasProductEvidence: productEvidenceRecords > 0 }
					: {} ),
			} );
		}
		await terminateGroupLanes( group, reason );
		return true;
	}

	function getProductiveFallbackGroupCandidates() {
		const candidates = [];
		const seen = new Set();
		const addCandidate = ( group ) => {
			if ( ! group || seen.has( group ) || ! PROFILE_BY_GROUP[ group ] ) {
				return;
			}
			seen.add( group );
			candidates.push( group );
		};

		for ( const group of PRODUCTIVE_FALLBACK_GROUPS ) {
			addCandidate( group );
		}
		for ( const group of guidance?.recommendedGroups ?? [] ) {
			addCandidate( group );
		}
		for ( const group of HIGH_VALUE_EXPANSION_GROUPS ) {
			addCandidate( group );
		}

		return candidates;
	}

	async function ensureProductiveFallbackGroup() {
		const hasUsableEnabledProducer =
			! START_SUPERVISOR ||
			! supervisorState ||
			[ ...enabled ].some( ( group ) => {
				const groupState = supervisorGroupsByName.get( group );
				return (
					! groupState ||
					ACTIVE_GROUP_STATUSES.has( groupState.status )
				);
			} );
		if ( hasUsableEnabledProducer ) {
			return false;
		}

		const candidates = getProductiveFallbackGroupCandidates();
		const reason =
			'minimum productive coverage fallback: all scheduled browser groups are paused or have no active producer; enable an unrelated productive group without overriding active no-product noise cooldowns';

		for ( const group of candidates ) {
			const materializationRescue =
				shouldUseEmptyMaterializationRescue( group );
			if (
				state.disabledGroups?.[ group ] ||
				( ! materializationRescue &&
					( getActiveNoisePauseCooldown( group ) ||
						shouldBlockGroupEnableForCurrentStartupHold( group ) ||
						shouldBlockGroupEnableForDuplicateNoiseHold( group ) ) )
			) {
				continue;
			}
			if (
				await enableGroup( group, reason, {
					allowRotation: true,
					budgetReserved: true,
					materializationRescue,
				} )
			) {
				return true;
			}
		}

		state.changes.push( {
			at: new Date().toISOString(),
			action: 'hold-empty-coverage-no-safe-fallback',
			reason: 'no productive fallback group was available without overriding an active no-product noise cooldown, current-run startup failure, or disabled group',
		} );
		return false;
	}

	async function ensureRequiredCoverageBreadthGroups() {
		let changed = false;
		for ( const group of REQUIRED_COVERAGE_BREADTH_GROUPS ) {
			if ( enabled.has( group ) ) {
				continue;
			}
			changed =
				( await enableGroup(
					group,
					'required coverage breadth surface: keep active coverage-guided browser fuzzing on representative user-hit RTC surfaces, not only on the current highest gap groups',
					{ allowRotation: true }
				) ) || changed;
		}
		return changed;
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
			if (
				! enabled.has( candidate ) ||
				isRequiredCoverageBreadthGroup( candidate )
			) {
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

	if ( PAUSE_ON_TRIAGE_NOISE ) {
		noisyProducerGroups = await getActiveDuplicateNoiseProducerGroups(
			supervisorState,
			currentRunDuplicateNoiseHold
		);
		for ( const producer of noisyProducerGroups ) {
			if ( ! shouldBlockRefillForDuplicateNoiseProducer( producer ) ) {
				continue;
			}
			refillBlockingDuplicateNoiseProducer ??= producer;
			refillBlockingDuplicateNoiseProducerGroups.add( producer.name );
		}
	}

	if ( PAUSE_ON_TRIAGE_NOISE ) {
		for ( const group of [ ...enabled ] ) {
			const activeNoisePause = getActiveNoisePauseCooldown(
				group,
				triageYield
			);
			if ( ! activeNoisePause ) {
				continue;
			}
			if ( canBypassStartupNoiseCooldown( group, activeNoisePause ) ) {
				delete state.pausedGroups[ group ];
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'bypass-startup-noise-cooldown-with-product-evidence',
					group,
					reason: `current supervisor state has product-evidence coverage for ${ group }; not applying startup-noise cooldown from ${ activeNoisePause.at }`,
				} );
				continue;
			}
			await pauseGroup(
				group,
				`continuing sticky ${ activeNoisePause.kind } cooldown after recent pause at ${ activeNoisePause.at }: ${ activeNoisePause.reason }`
			);
		}
	}

	if ( PAUSE_ON_TRIAGE_NOISE ) {
		if (
			currentRunDuplicateNoiseHold &&
			noisyProducerGroups.length === 0
		) {
			const sentinelCount =
				await writeNoAnalysisSentinelsForMatchingLocalNoiseHold(
					currentRunDuplicateNoiseHold,
					state.currentRunDirsIncludingPausedNoAnalysis ??
						state.currentRunDirs ??
						[]
				);
			state.changes.push( {
				at: new Date().toISOString(),
				action:
					sentinelCount > 0
						? 'current-run-noise-hold-local-sentinel-written'
						: 'current-run-noise-hold-no-producer-match-sentinel-skipped',
				reason:
					sentinelCount > 0
						? `current-run duplicate/noise hold is active for ${ currentRunDuplicateNoiseHold.family } (${ currentRunDuplicateNoiseHold.count } signatures, share=${ currentRunDuplicateNoiseHold.share }) and ${ sentinelCount } local run dir(s) reproduced it; wrote product-preserving no-analysis sentinels`
						: `current-run duplicate/noise hold is active for ${ currentRunDuplicateNoiseHold.family } (${ currentRunDuplicateNoiseHold.count } signatures, share=${ currentRunDuplicateNoiseHold.share }) but no active no-product producer run dir matched it; leaving active run dirs visible instead of writing a broad no-analysis sentinel`,
			} );
		}
		for ( const producer of noisyProducerGroups ) {
			const shouldPause = shouldPauseDuplicateNoiseProducer( producer );
			const reason = getDuplicateNoiseProducerReason( producer, {
				pause: shouldPause,
			} );
			const reasonKind = getEffectiveDuplicateNoiseHoldKind(
				producer.hold
			);
			await writeNoAnalysisSentinelsForRunDirs( producer.runDirs, {
				groupName: producer.name,
				reason,
				reasonKind,
				family: producer.hold.family,
				source: producer.hold.source,
				noProductOnly: ! producer.hasProductEvidence,
				productEvidenceRecords: producer.productEvidenceRecords ?? 0,
				hasProductEvidence: producer.hasProductEvidence,
			} );
			if ( ! enabled.has( producer.name ) ) {
				if ( shouldPause ) {
					await terminateGroupLanes( producer.name, reason );
				}
				continue;
			}
			if ( shouldPause ) {
				await pauseGroup( producer.name, reason, {
					reasonKind,
					family: producer.hold.family,
					source: producer.hold.source,
					noProductOnly: ! producer.hasProductEvidence,
					productEvidenceRecords:
						producer.productEvidenceRecords ?? 0,
					hasProductEvidence: producer.hasProductEvidence,
				} );
				continue;
			}
		}
	}

	if ( holdDominantRealUserFamilyActive ) {
		const hold = effectiveProductEvidenceDuplicateFamilyHold;
		const holdScope = dominantRealUserFamilyHold
			? 'current-run'
			: 'recent cross-root';
		for ( const group of PRODUCT_EVIDENCE_DUPLICATE_FAMILY_HOLD_GROUPS ) {
			if ( ! enabled.has( group ) ) {
				continue;
			}
			if (
				! shouldProductEvidenceDuplicateHoldBlockGroup( hold, group )
			) {
				continue;
			}
			if ( shouldBypassDominantRealUserFamilyHold( group ) ) {
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'bypass-real-user-duplicate-family-hold',
					group,
					reason: 'recommended short save/reload group has no current product-evidence producer yet; use it as the lane-config change while the rich-text producer remains paused',
				} );
				continue;
			}
			const producerScope = hold.groupName
				? ` from ${ hold.groupName }`
				: '';
			const reason = `triage yield is duplicate/noise dominated: ${ holdScope } product-evidence duplicate family ${
				hold.family
			}${ producerScope } dominates held producer output (${
				hold.count
			}/${ hold.total ?? hold.count } ${
				hold.source
			} signatures, share=${ hold.share }, representative=${
				hold.representativeSignal
			}); pause until the family is analyzed or the lane config changes while preserving product-evidence signatures`;
			await pauseGroup( group, reason, {
				reasonKind: hold.kind,
				family: hold.family,
				source: hold.source,
				...( hold.groupName ? { groupName: hold.groupName } : {} ),
			} );
		}
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
		( sameUserRecords < 150 || ! httpProbeEnabled ) &&
		! recommendedGroupsForPass.has( 'novelty-ws-parser-transform' )
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
		enabled.has( 'novelty-ws-common-blocks' ) &&
		! recommendedGroupsForPass.has( 'novelty-ws-common-blocks' )
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
				`triage yield is duplicate/noise dominated: actionable top family share ${
					triageYield.topDuplicateFamilyShare
				}, actionable signatures ${
					triageYield.signatureCount
				}, raw signatures ${
					triageYield.rawSignatureCount ?? triageYield.signatureCount
				}, non-actionable ${
					triageYield.nonActionableSignatureCount ?? 0
				}, bootstrap stalls ${
					triageYield.bootstrapStalls
				}, normalization noise candidates ${
					triageYield.normalizationNoiseCandidates
				}, visible likely-real ${ triageYield.likelyRealVisible }`
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
		! mediaCrossEntityEnabled &&
		( mediaCrossEntitySuccessRecords < 25 ||
			mediaUploadRecords < 10 ||
			reusableBlockRecords < 5 )
	) {
		await enableGroup(
			'novelty-ws-media-cross-entity',
			`media/cross-entity coverage is low: success=${ mediaCrossEntitySuccessRecords }/25 media-upload=${ mediaUploadRecords }/10 reusable-block=${ reusableBlockRecords }/5`,
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

	for ( const group of ZERO_COVERAGE_PRIORITY_GROUPS ) {
		if ( enabled.has( group ) ) {
			continue;
		}
		const gapsForGroup = ( guidance?.unmetGoals ?? [] ).filter(
			( goal ) => goal.count === 0 && goal.groups.includes( group )
		);
		if ( gapsForGroup.length === 0 ) {
			continue;
		}
		while ( enabled.size >= MAX_ENABLED_GROUPS ) {
			const eviction = ZERO_COVERAGE_EVICTION_ORDER.find(
				( candidate ) =>
					enabled.has( candidate ) &&
					! ZERO_COVERAGE_PRIORITY_GROUPS.includes( candidate )
			);
			if ( ! eviction ) {
				break;
			}
			await pauseGroup(
				eviction,
				`zero-coverage high-priority RTC surface ${ group } needs a browser slot before lower-priority coverage top-offs; gaps=${ gapsForGroup
					.slice( 0, 3 )
					.map(
						( goal ) => `${ goal.id }=${ goal.count }/${ goal.target }`
					)
					.join( ', ' ) }`
			);
		}
		await enableGroup(
			group,
			`zero-coverage high-priority RTC surface: ${ gapsForGroup
				.slice( 0, 3 )
				.map( ( goal ) => `${ goal.id }=${ goal.count }/${ goal.target }` )
				.join( ', ' ) }`,
			{ allowRotation: true, budgetReserved: true }
		);
	}

	for ( const group of guidance?.recommendedGroups ?? [] ) {
		if ( enabled.has( group ) ) {
			continue;
		}
		const activeNoisePause = getActiveNoisePauseCooldown(
			group,
			triageYield
		);
		if ( activeNoisePause ) {
			if ( canBypassStartupNoiseCooldown( group, activeNoisePause ) ) {
				delete state.pausedGroups[ group ];
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'bypass-startup-noise-cooldown-with-product-evidence',
					group,
					reason: `current supervisor state has product-evidence coverage for recommended group ${ group }; allowing coverage-guidance to re-enable it despite startup-noise cooldown from ${ activeNoisePause.at }`,
				} );
			} else if (
				canBypassRecommendedStartupNoiseCooldown(
					group,
					activeNoisePause
				)
			) {
				recommendedStartupCooldownRetryUsed = true;
				const bypassReason = `coverage guidance has stalled for ${ guidance.noProgressPasses } pass(es) with no quality issue; retry one recommended real-user save/reload producer despite inherited cross-run startup cooldown from ${ activeNoisePause.at }`;
				recordStartupNoiseCooldownBypass(
					group,
					activeNoisePause,
					bypassReason
				);
				delete state.pausedGroups[ group ];
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'bypass-recommended-startup-noise-cooldown-for-gap',
					group,
					reason: bypassReason,
					originOutputDir: activeNoisePause.originOutputDir,
					expiresAt: activeNoisePause.expiresAt,
				} );
			} else {
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'skip-enable-noisy-recommended-group',
					group,
					reason: `recent ${ activeNoisePause.kind } pause at ${ activeNoisePause.at } is still inside the ${ TRIAGE_NOISE_PAUSE_COOLDOWN_HOURS }h cooldown; do not re-enable through coverage recommendations`,
				} );
				continue;
			}
		}
		if (
			holdNoisyBlockTopOff &&
			[
				'novelty-ws-common-blocks',
				'novelty-ws-block-gauntlet',
			].includes( group )
		) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'skip-enable-noisy-recommended-group',
				group,
				reason: 'triage-noise hold is active; do not re-enable block top-off through coverage recommendations',
			} );
			continue;
		}
		if (
			holdDominantRealUserFamilyActive &&
			shouldProductEvidenceDuplicateHoldBlockGroup(
				effectiveProductEvidenceDuplicateFamilyHold,
				group
			)
		) {
			if ( shouldBypassDominantRealUserFamilyHold( group ) ) {
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'bypass-real-user-duplicate-family-hold',
					group,
					reason: 'coverage-guidance recommends the short save/reload group and it has no current product-evidence producer; allow it instead of re-enabling the duplicate rich-text producer',
				} );
			} else {
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'skip-enable-noisy-recommended-group',
					group,
					reason: 'real-user duplicate-family hold is active; do not re-enable through coverage recommendations',
				} );
				continue;
			}
		}
		await enableGroup(
			group,
			`coverage-guidance gap: ${ guidance.unmetGoals
				.filter( ( goal ) => goal.groups.includes( group ) )
				.slice( 0, 3 )
				.map(
					( goal ) => `${ goal.id }=${ goal.count }/${ goal.target }`
				)
				.join( ', ' ) }`,
			{ allowRotation: true }
		);
		if ( enabled.size >= MAX_ENABLED_GROUPS ) {
			break;
		}
	}

	if ( PAUSE_ON_STARTUP_FAILURE ) {
		const basePauseOrder = [
			[ 'novelty-ws-block-gauntlet', 'block-gauntlet' ],
			[ 'novelty-ws-common-blocks', 'common-blocks' ],
			[ 'novelty-http-persistence-probe', 'persistence-no-title' ],
			[ 'novelty-ws-persistence-no-title', 'persistence-no-title' ],
			[ 'novelty-ws-parser-serialization', 'parser-serialization' ],
			[ 'novelty-ws-parser-transform', 'parser-transform' ],
			[ 'novelty-ws-real-user-save-reload', 'real-user-editing' ],
			[ 'novelty-ws-real-user-editing', 'real-user-editing' ],
			[ 'novelty-ws-media-cross-entity', 'media-cross-entity' ],
			[ 'novelty-ws-multi-reload-lifecycle', 'multi-reload-lifecycle' ],
			[ 'novelty-ws-three-user-late-join', 'three-user-late-join' ],
			[ 'novelty-ws-same-user-lifecycle', 'session-lifecycle' ],
			[ 'novelty-ws-revision-persistence', 'revision-persistence' ],
		];
		const pauseOrderGroups = new Set(
			basePauseOrder.map( ( [ group ] ) => group )
		);
		const pauseOrder = [
			...basePauseOrder,
			...( state.enabledGroups ?? [] )
				.filter(
					( group ) =>
						! pauseOrderGroups.has( group ) &&
						PROFILE_BY_GROUP[ group ]
				)
				.map( ( group ) => [ group, PROFILE_BY_GROUP[ group ] ] ),
		];

		for ( const [ group, profile ] of pauseOrder ) {
			if (
				shouldApplyProfileStartupFailurePause( group ) &&
				( hasExcessiveStartupFailures( group, profile ) ||
					hasActiveStartupFailureCooldown( group, profile ) )
			) {
				const { failures, records, rate } = getStartupFailureStats(
					group,
					profile
				);
				await pauseGroup(
					group,
					`group ${ group } produced ${ failures }/${ records } strict pre-action discovery/startup failures (rate=${ formatPercent(
						rate
					) })`,
					{
						reasonKind: 'startup-noise',
						family: 'pre_action_bootstrap_stall',
						noProductOnly: true,
						productEvidenceRecords: 0,
					}
				);
			}
		}

		if ( ! resources.hasHeadroom && enabled.size > 5 ) {
			for ( const [ group, profile ] of pauseOrder.slice( 0, 2 ) ) {
				if (
					enabled.size <= 5 ||
					! hasExcessiveStartupFailures( group, profile )
				) {
					continue;
				}
				await pauseGroup(
					group,
					`temporary resource guard: no headroom and group ${ group } has excessive pre-action startup failures`
				);
			}
		}
	}

	if (
		! resources.hasHeadroom &&
		( guidance?.qualityIssues?.length ?? 0 ) > 0 &&
		( guidance?.qualityIssuePasses ?? 0 ) >=
			COVERAGE_QUALITY_ISSUE_PASSES &&
		enabled.size > COVERAGE_QUALITY_MAX_ENABLED_GROUPS
	) {
		const qualityBudgetPauseOrder = [
			'novelty-http-persistence-probe',
			'novelty-ws-structure',
			'novelty-ws-parser-serialization',
			'novelty-ws-multi-reload-lifecycle',
			'novelty-ws-three-user-late-join',
			'novelty-ws-revision-persistence',
			'novelty-ws-persistence-no-title',
			'novelty-ws-same-user-lifecycle',
		];

		for ( const group of qualityBudgetPauseOrder ) {
			if (
				enabled.size <= COVERAGE_QUALITY_MAX_ENABLED_GROUPS ||
				! enabled.has( group ) ||
				isRequiredCoverageBreadthGroup( group ) ||
				recommendedGroupsForPass.has( group )
			) {
				continue;
			}
			await pauseGroup(
				group,
				`coverage-quality budget guard: ${ guidance.qualityIssues.length } quality issue(s) persisted for ${ guidance.qualityIssuePasses } pass(es) with no resource headroom; reserve browser slots for current gap groups`
			);
		}
	}

	if ( enabled.size > MAX_ENABLED_GROUPS ) {
		const maxBudgetPauseOrder = [
			'novelty-http-persistence-probe',
			'novelty-ws-structure',
			'novelty-ws-common-blocks',
			'novelty-ws-parser-serialization',
			'novelty-ws-block-gauntlet',
			'novelty-ws-multi-reload-lifecycle',
			'novelty-ws-three-user-late-join',
			'novelty-ws-revision-persistence',
			'novelty-ws-persistence-no-title',
			'novelty-ws-same-user-lifecycle',
			'novelty-ws-async-server-blocks',
			'novelty-ws-media-cross-entity',
			'novelty-ws-long-session-large-doc',
			'novelty-ws-real-user-save-reload',
			'novelty-ws-real-user-rich-text',
			'novelty-ws-real-user-editing',
			'novelty-ws-parser-transform',
		];

		for ( const group of maxBudgetPauseOrder ) {
			if ( enabled.size <= MAX_ENABLED_GROUPS ) {
				break;
			}
			if (
				! enabled.has( group ) ||
				isRequiredCoverageBreadthGroup( group ) ||
				recommendedGroupsForPass.has( group )
			) {
				continue;
			}
			await pauseGroup(
				group,
				`max-enabled-group resource budget guard: enabled=${ enabled.size } max=${ MAX_ENABLED_GROUPS }`
			);
		}
	}

	for ( const disabledGroup of Object.keys( state.disabledGroups ?? {} ) ) {
		enabled.delete( disabledGroup );
	}
	await ensureRequiredCoverageBreadthGroups();
	await ensureProductiveFallbackGroup();
	await ensureMaterializationFloorGroup();
	state.enabledGroups = [ ...enabled ];
	await writeSupervisorGroupsForEnabledGroups( enabled );
}

async function terminateGroupLanes( groupName, reason ) {
	const runDirs = await getSupervisorRunDirsForGroup( groupName );
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

async function getSupervisorRunDirsForGroup( groupName ) {
	const supervisorState = await readJsonFile(
		path.join( OUTPUT_DIR, 'supervisor-state.json' )
	);
	const groupState = ( supervisorState?.groups ?? [] ).find(
		( group ) => group.name === groupName
	);
	return getSupervisorGroupRunDirs( groupState );
}

async function writeNoAnalysisSentinelsForRunDirs(
	runDirs = [],
	{
		groupName = null,
		reason,
		reasonKind = null,
		family = null,
		source = null,
		pauseUntil = null,
		expiresAt = null,
		noProductOnly = null,
		productEvidenceRecords = null,
		hasProductEvidence = null,
	} = {}
) {
	const kind = getNoisePauseKind( reason, reasonKind );
	const sentinelFamily = family ?? getNoisePauseFamily( kind );
	const effectiveExpiresAt =
		expiresAt ??
		pauseUntil ??
		( kind
			? new Date(
					Date.now() +
						TRIAGE_NOISE_PAUSE_COOLDOWN_HOURS * 60 * 60 * 1000
			  ).toISOString()
			: null );
	const effectiveProductEvidenceRecords = Number.isFinite(
		productEvidenceRecords
	)
		? productEvidenceRecords
		: null;
	const effectiveHasProductEvidence =
		hasProductEvidence ??
		( effectiveProductEvidenceRecords !== null
			? effectiveProductEvidenceRecords > 0
			: null );
	const effectiveNoProductOnly =
		noProductOnly ??
		( effectiveHasProductEvidence === false ? true : null );
	const written = [];

	for ( const runDir of new Set( runDirs ) ) {
		if ( ! runDir ) {
			continue;
		}
		const sentinelPath = path.join(
			runDir,
			NO_ANALYSIS_SENTINEL_RELATIVE_PATH
		);
		await writeJsonFileAtomic( sentinelPath, {
			version: 1,
			createdAt: new Date().toISOString(),
			outputDir: OUTPUT_DIR,
			group: groupName,
			reason,
			reasonKind: kind,
			...( sentinelFamily ? { family: sentinelFamily } : {} ),
			...( source ? { source } : {} ),
			...( pauseUntil ? { pauseUntil } : {} ),
			...( effectiveExpiresAt ? { expiresAt: effectiveExpiresAt } : {} ),
			...( effectiveNoProductOnly !== null
				? { noProductOnly: effectiveNoProductOnly }
				: {} ),
			...( effectiveProductEvidenceRecords !== null
				? { productEvidenceRecords: effectiveProductEvidenceRecords }
				: {} ),
			...( effectiveHasProductEvidence !== null
				? { hasProductEvidence: effectiveHasProductEvidence }
				: {} ),
			preserveProductEvidence: true,
			note: 'Producer paused by novelty duplicate/noise policy. Consumers must not spend analysis on signatures without product evidence from this run.',
		} );
		written.push( runDir );
	}

	if ( written.length ) {
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'write-no-analysis-sentinel',
			group: groupName,
			reason,
			reasonKind: kind,
			...( sentinelFamily ? { family: sentinelFamily } : {} ),
			...( source ? { source } : {} ),
			...( effectiveNoProductOnly !== null
				? { noProductOnly: effectiveNoProductOnly }
				: {} ),
			...( effectiveProductEvidenceRecords !== null
				? { productEvidenceRecords: effectiveProductEvidenceRecords }
				: {} ),
			...( effectiveHasProductEvidence !== null
				? { hasProductEvidence: effectiveHasProductEvidence }
				: {} ),
			preserveProductEvidence: true,
			...( effectiveExpiresAt ? { expiresAt: effectiveExpiresAt } : {} ),
			count: written.length,
		} );
	}
}

async function writeNoAnalysisSentinelsForGroup(
	groupName,
	reason,
	metadata = {}
) {
	const runDirs = await getSupervisorRunDirsForGroup( groupName );
	await writeNoAnalysisSentinelsForRunDirs( runDirs, {
		groupName,
		reason,
		...metadata,
	} );
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

function getOutputScopedSupervisorSession() {
	const suffix =
		path
			.basename( OUTPUT_DIR )
			.replace( /[^A-Za-z0-9_.-]+/g, '-' )
			.replace( /^-+|-+$/g, '' ) || createTimestamp();
	return `${ SUPERVISOR_SESSION }-${ suffix }`;
}

function getCurrentSupervisorSession() {
	const outputScopedSession = getOutputScopedSupervisorSession();
	if ( state.supervisorSession ) {
		if (
			state.supervisorSession === SUPERVISOR_SESSION ||
			state.supervisorSession === outputScopedSession
		) {
			return state.supervisorSession;
		}
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'ignore-stale-supervisor-session',
			staleSession: state.supervisorSession,
			expectedOutputScopedSession: outputScopedSession,
			outputDir: OUTPUT_DIR,
			reason: 'copied novelty state referenced a supervisor session from another output dir',
		} );
		delete state.supervisorSession;
	}
	if ( tmuxHasSession( outputScopedSession ) ) {
		return outputScopedSession;
	}
	return SUPERVISOR_SESSION;
}

function hasSupervisorForCurrentOutput( supervisorState ) {
	const sessionName = getCurrentSupervisorSession();
	return Boolean(
		isSupervisorStateForCurrentOutput( supervisorState ) &&
			tmuxHasSession( sessionName )
	);
}

function supervisorStartupGraceActive( sessionName ) {
	if ( state.supervisorSession !== sessionName ) {
		return false;
	}
	if ( typeof state.supervisorStartedAt !== 'string' ) {
		return false;
	}
	const startedAt = Date.parse( state.supervisorStartedAt );
	return Number.isFinite( startedAt ) && Date.now() - startedAt < 15000;
}

async function ensureSupervisor( resources ) {
	let sessionName = getCurrentSupervisorSession();
	let supervisorState = await readSupervisorState();
	if (
		sessionName === SUPERVISOR_SESSION &&
		tmuxHasSession( SUPERVISOR_SESSION ) &&
		! supervisorState
	) {
		sessionName = getOutputScopedSupervisorSession();
		state.supervisorSession = sessionName;
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'use-output-scoped-supervisor-session',
			session: sessionName,
			requestedSession: SUPERVISOR_SESSION,
			reason: 'requested supervisor tmux session already exists but no supervisor-state.json exists for the current novelty output dir',
		} );
		await log(
			`Using output-scoped supervisor tmux session ${ sessionName } because ${ SUPERVISOR_SESSION } already exists without current-run supervisor state.`
		);
	}
	if ( tmuxHasSession( sessionName ) ) {
		supervisorState = await readSupervisorState();
		if ( supervisorState ) {
			return;
		}
		if ( supervisorStartupGraceActive( sessionName ) ) {
			return;
		}
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'restart-supervisor-without-current-state',
			session: sessionName,
			outputDir: OUTPUT_DIR,
			reason: 'supervisor tmux session exists but no matching current-root supervisor-state.json was written',
		} );
		await log(
			`Restarting supervisor tmux session ${ sessionName }; no supervisor-state.json matches ${ OUTPUT_DIR }.`
		);
		try {
			execFileSync( 'tmux', [ 'kill-session', '-t', sessionName ], {
				stdio: 'ignore',
			} );
		} catch {}
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
		`export RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_COOLDOWN_HOURS=${ shellQuote(
			String( TRIAGE_NOISE_PAUSE_COOLDOWN_HOURS )
		) }`,
		'export RTC_FUZZ_SUPERVISOR_POLL_MS=60000',
		`${ shellQuote(
			process.execPath
		) } bin/rtc-browser-fuzz-supervisor.mjs`,
	].join( '; ' );

	const supervisorStart = spawn(
		'tmux',
		[ 'new-session', '-d', '-s', sessionName, command ],
		{
			cwd: REPO_ROOT,
			stdio: 'ignore',
		}
	);
	supervisorStart.on( 'error', ( error ) => {
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'supervisor-start-spawn-error',
			session: sessionName,
			error: error.message,
		} );
		void log(
			`ACTION-NEEDED: failed to spawn supervisor tmux session ${ sessionName }: ${ error.message }`
		);
	} );
	supervisorStart.unref();
	state.supervisorSession = sessionName;
	state.supervisorStartedAt = new Date().toISOString();
	state.changes.push( {
		at: state.supervisorStartedAt,
		action: 'start-supervisor',
		session: sessionName,
	} );
	await sleep( 2000 );
	if ( ! tmuxHasSession( sessionName ) ) {
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'supervisor-start-unverified',
			session: sessionName,
		} );
		await log(
			`ACTION-NEEDED: supervisor tmux session ${ sessionName } was requested but is not present after startup verification.`
		);
		return;
	}
	await log( `Started supervisor tmux session ${ sessionName }.` );
}

async function ensureBootstrapSupervisorGroups() {
	const existingGroups = await readJsonFile( GROUPS_PATH );
	const existingGroupNames = Array.isArray( existingGroups )
		? existingGroups.map( ( group ) => group?.name ).filter( Boolean )
		: [];
	const existingGroupsAreValid =
		Array.isArray( existingGroups ) &&
		existingGroups.length > 0 &&
		existingGroups.every( isValidSupervisorGroupConfig );
	if ( existingGroupsAreValid ) {
		state.enabledGroups = existingGroupNames.slice( 0, MAX_ENABLED_GROUPS );
		if ( existingGroups.length > MAX_ENABLED_GROUPS ) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'trim-bootstrap-supervisor-groups',
				previousCount: existingGroups.length,
				maxEnabledGroups: MAX_ENABLED_GROUPS,
				groups: state.enabledGroups,
				reason: 'existing supervisor-groups.json exceeded the effective coverage-guided producer budget before supervisor launch',
			} );
		}
	}
	if (
		Array.isArray( existingGroups ) &&
		existingGroups.length > 0 &&
		! existingGroupsAreValid
	) {
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'replace-invalid-bootstrap-supervisor-groups',
			invalidCount: existingGroups.filter(
				( group ) => ! isValidSupervisorGroupConfig( group )
			).length,
			reason: 'supervisor-groups.json existed but contained unnamed or unknown groups; rewriting a bounded named fallback before supervisor launch',
		} );
	}

	const selected = [];
	const seen = new Set();
	const bootstrapActiveDuplicateNoiseHold = withRunDirProducerGroups(
		getCurrentRunDuplicateNoiseHold( state.triageYieldCurrent ),
		state.currentRunDirs ?? []
	);
	const bootstrapDrainDuplicateNoiseHold = withRunDirProducerGroups(
		getCurrentRunDuplicateNoiseHold(
			state.triageYieldCurrentIncludingPausedNoAnalysis ??
				state.triageYieldCurrent
		),
		state.currentRunDirsIncludingPausedNoAnalysis ??
			state.currentRunDirs ??
			[]
	);
	let bootstrapDuplicateNoiseHold = bootstrapActiveDuplicateNoiseHold;
	if (
		! isCurrentNoProductStartupHold( bootstrapDuplicateNoiseHold ) &&
		isCurrentNoProductStartupHold( bootstrapDrainDuplicateNoiseHold )
	) {
		bootstrapDuplicateNoiseHold = {
			...bootstrapDrainDuplicateNoiseHold,
			scope: 'active/drain current-run',
			drainOnly: true,
		};
	}
	const bootstrapFleetStartupNoiseHold = getFleetNoProductStartupNoiseHold();
	const bootstrapProducerStartupHold = isStartupHoldBlockingProducerSelection(
		bootstrapDuplicateNoiseHold
	)
		? bootstrapDuplicateNoiseHold
		: bootstrapFleetStartupNoiseHold;
	const bootstrapProductEvidenceDuplicateFamilyHold =
		getCurrentRunProductEvidenceDuplicateHold(
			state.triageYieldCurrentIncludingPausedNoAnalysis ??
				state.triageYieldCurrent,
			state.currentRunDirsIncludingPausedNoAnalysis ??
				state.currentRunDirs ??
				[]
		) ?? getRecentProductEvidenceDuplicateFamilyCooldown();
	const getBootstrapDuplicateFamilyHoldBlock = ( group ) => {
		if (
			! isProductEvidenceDuplicateFamilyHold(
				bootstrapProductEvidenceDuplicateFamilyHold
			) ||
			! shouldProductEvidenceDuplicateHoldBlockGroup(
				bootstrapProductEvidenceDuplicateFamilyHold,
				group
			)
		) {
			return null;
		}
		return bootstrapProductEvidenceDuplicateFamilyHold;
	};
	const getBootstrapDuplicateFamilyHoldBlockReason = ( hold ) =>
		`bootstrap supervisor group selection held while product-evidence duplicate family ${
			hold.family
		} is already represented (${ hold.count }/${
			hold.total ?? hold.count
		} signatures, share=${ hold.share }, source=${
			hold.source
		}); preserving product-evidence signatures without requeueing the held lifecycle/reload producer`;
	const addGroup = ( group ) => {
		const activeNoisePause = getActiveNoisePauseCooldown( group );
		const duplicateFamilyHoldBlock =
			getBootstrapDuplicateFamilyHoldBlock( group );
		if (
			! group ||
			seen.has( group ) ||
			! PROFILE_BY_GROUP[ group ] ||
			state.disabledGroups?.[ group ] ||
			state.pausedGroups?.[ group ] ||
			activeNoisePause ||
			duplicateFamilyHoldBlock ||
			isStartupHoldBlockingProducerGroup(
				bootstrapProducerStartupHold,
				group
			)
		) {
			if ( group && activeNoisePause ) {
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'skip-bootstrap-noise-cooldown',
					group,
					reason: `bootstrap supervisor group selection respected active ${ activeNoisePause.kind } cooldown from ${ activeNoisePause.at }: ${ activeNoisePause.reason }`,
					expiresAt: activeNoisePause.expiresAt,
					...( activeNoisePause.originGroup
						? { originGroup: activeNoisePause.originGroup }
						: {} ),
				} );
			} else if ( group && duplicateFamilyHoldBlock ) {
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'skip-bootstrap-duplicate-family-hold',
					group,
					family: duplicateFamilyHoldBlock.family,
					source: duplicateFamilyHoldBlock.source,
					expiresAt: duplicateFamilyHoldBlock.expiresAt,
					reason: getBootstrapDuplicateFamilyHoldBlockReason(
						duplicateFamilyHoldBlock
					),
				} );
			} else if (
				group &&
				isStartupHoldBlockingProducerGroup(
					bootstrapProducerStartupHold,
					group
				)
			) {
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'skip-bootstrap-current-startup-noise-hold',
					group,
					reason: `bootstrap supervisor group selection held while ${
						bootstrapProducerStartupHold.drainOnly
							? 'drain-only '
							: ''
					}${
						bootstrapProducerStartupHold.fleetStartupNoiseHold
							? 'fleet '
							: 'current-run '
					}startup-noise hold is active for ${
						bootstrapProducerStartupHold.family
					} (${
						bootstrapProducerStartupHold.count
					} groups/signatures, share=${
						bootstrapProducerStartupHold.share
					})`,
				} );
			}
			return;
		}
		seen.add( group );
		selected.push( group );
	};

	const addFleetStartupNoiseCanary = () => {
		const group = FLEET_STARTUP_NOISE_CANARY_GROUP;
		if (
			! bootstrapProducerStartupHold?.fleetStartupNoiseHold ||
			! group
		) {
			return false;
		}
		if ( isNoProductStartupNoiseCooldown( bootstrapProducerStartupHold ) ) {
			const marker = [
				OUTPUT_DIR,
				bootstrapProducerStartupHold.family,
				bootstrapProducerStartupHold.count,
				bootstrapProducerStartupHold.share,
				bootstrapProducerStartupHold.expiresAt ?? '',
				'hard-block',
			].join( '|' );
			if ( state.fleetStartupNoiseCanaryBlocked?.marker !== marker ) {
				state.fleetStartupNoiseCanaryBlocked = {
					at: new Date().toISOString(),
					outputDir: OUTPUT_DIR,
					group,
					holdFamily: bootstrapProducerStartupHold.family,
					holdCount: bootstrapProducerStartupHold.count,
					holdShare: bootstrapProducerStartupHold.share,
					marker,
					...( bootstrapProducerStartupHold.expiresAt
						? {
								holdExpiresAt:
									bootstrapProducerStartupHold.expiresAt,
						  }
						: {} ),
				};
				state.changes.push( {
					at: state.fleetStartupNoiseCanaryBlocked.at,
					action: 'block-bootstrap-fleet-startup-noise-canary',
					group,
					reason: `fleet startup-noise hold is active for no-product ${ bootstrapProducerStartupHold.family } across ${ bootstrapProducerStartupHold.count } producer groups (share=${ bootstrapProducerStartupHold.share }); refusing the canary even when RTC_FUZZ_NOVELTY_ALLOW_FLEET_STARTUP_NOISE_CANARY=1 because it requeues strict pre-action bootstrap noise without product evidence`,
					...( bootstrapProducerStartupHold.expiresAt
						? { expiresAt: bootstrapProducerStartupHold.expiresAt }
						: {} ),
				} );
			}
			return false;
		}
		if ( ! ALLOW_FLEET_STARTUP_NOISE_CANARY ) {
			const marker = [
				OUTPUT_DIR,
				bootstrapProducerStartupHold.family,
				bootstrapProducerStartupHold.count,
				bootstrapProducerStartupHold.share,
				bootstrapProducerStartupHold.expiresAt ?? '',
			].join( '|' );
			if ( state.fleetStartupNoiseCanaryDisabled?.marker !== marker ) {
				state.fleetStartupNoiseCanaryDisabled = {
					at: new Date().toISOString(),
					outputDir: OUTPUT_DIR,
					group,
					holdFamily: bootstrapProducerStartupHold.family,
					holdCount: bootstrapProducerStartupHold.count,
					holdShare: bootstrapProducerStartupHold.share,
					marker,
					...( bootstrapProducerStartupHold.expiresAt
						? {
								holdExpiresAt:
									bootstrapProducerStartupHold.expiresAt,
						  }
						: {} ),
				};
				state.changes.push( {
					at: state.fleetStartupNoiseCanaryDisabled.at,
					action: 'skip-bootstrap-fleet-startup-noise-canary-disabled',
					group,
					reason: `fleet startup-noise hold is active for ${ bootstrapProducerStartupHold.family } across ${ bootstrapProducerStartupHold.count } producer groups (share=${ bootstrapProducerStartupHold.share }); not launching the configured canary unless RTC_FUZZ_NOVELTY_ALLOW_FLEET_STARTUP_NOISE_CANARY=1`,
					...( bootstrapProducerStartupHold.expiresAt
						? { expiresAt: bootstrapProducerStartupHold.expiresAt }
						: {} ),
				} );
			}
			return false;
		}
		const canaryCandidates = uniquePathList( [
			group,
			...MATERIALIZATION_FLOOR_GROUPS,
			...PRODUCTIVE_FALLBACK_GROUPS,
		] );
		const skippedCandidates = [];
		let selectedCanary = null;
		for ( const candidate of canaryCandidates ) {
			const activeNoisePause = getActiveNoisePauseCooldown( candidate );
			const duplicateFamilyHoldBlock =
				getBootstrapDuplicateFamilyHoldBlock( candidate );
			let blockedReason = '';
			let duplicateFamilyHoldBlocked = false;
			if ( ! candidate ) {
				blockedReason = 'empty group name';
			} else if ( seen.has( candidate ) ) {
				blockedReason = 'already selected';
			} else if ( ! PROFILE_BY_GROUP[ candidate ] ) {
				blockedReason = 'unknown group';
			} else if ( state.disabledGroups?.[ candidate ] ) {
				blockedReason = 'disabled group';
			} else if ( state.pausedGroups?.[ candidate ] ) {
				blockedReason = `stored pause: ${
					state.pausedGroups?.[ candidate ]?.reason ?? 'unknown'
				}`;
			} else if ( activeNoisePause ) {
				blockedReason = `${ activeNoisePause.kind } cooldown from ${ activeNoisePause.at }: ${ activeNoisePause.reason }`;
			} else if ( duplicateFamilyHoldBlock ) {
				blockedReason = getBootstrapDuplicateFamilyHoldBlockReason(
					duplicateFamilyHoldBlock
				);
				duplicateFamilyHoldBlocked = true;
			}
			if ( blockedReason ) {
				skippedCandidates.push( {
					group: candidate,
					reason: blockedReason,
					...( activeNoisePause?.expiresAt
						? { expiresAt: activeNoisePause.expiresAt }
						: {} ),
					...( activeNoisePause?.originGroup
						? { originGroup: activeNoisePause.originGroup }
						: {} ),
					...( duplicateFamilyHoldBlocked
						? {
								family: duplicateFamilyHoldBlock.family,
								source: duplicateFamilyHoldBlock.source,
								expiresAt: duplicateFamilyHoldBlock.expiresAt,
						  }
						: {} ),
				} );
				continue;
			}
			selectedCanary = candidate;
			break;
		}
		if ( ! selectedCanary ) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'skip-bootstrap-fleet-startup-noise-canary-no-eligible-fallback',
				group,
				skippedCandidates: skippedCandidates.slice( 0, 12 ),
				reason: `fleet startup-noise hold is active, but no configured or fallback canary was eligible; tried configured group plus bounded materialization/productive fallback groups without overriding disabled, paused, or cooldown state`,
			} );
			return false;
		}
		if ( selectedCanary !== group ) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'fallback-bootstrap-fleet-startup-noise-canary',
				configuredGroup: group,
				group: selectedCanary,
				skippedCandidates: skippedCandidates.slice( 0, 12 ),
				reason: `configured fleet startup-noise canary was unavailable; using the next eligible bounded fallback canary so coverage-guided browser materialization does not stay empty`,
			} );
		}
		seen.add( selectedCanary );
		selected.push( selectedCanary );
		state.fleetStartupNoiseCanary = {
			at: new Date().toISOString(),
			outputDir: OUTPUT_DIR,
			configuredGroup: group,
			group: selectedCanary,
			holdFamily: bootstrapProducerStartupHold.family,
			holdCount: bootstrapProducerStartupHold.count,
			holdShare: bootstrapProducerStartupHold.share,
		};
		state.changes.push( {
			at: state.fleetStartupNoiseCanary.at,
			action: 'bootstrap-fleet-startup-noise-canary',
			configuredGroup: group,
			group: selectedCanary,
			reason: `fleet startup-noise hold is active for ${ bootstrapProducerStartupHold.family } across ${ bootstrapProducerStartupHold.count } producer groups (share=${ bootstrapProducerStartupHold.share }); allowing exactly one eligible canary group so the supervisor does not churn on an empty producer set`,
		} );
		return true;
	};

	const addEmptyMaterializationStartupNoiseCanary = () => {
		if ( ! ALLOW_FLEET_STARTUP_NOISE_CANARY ) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'skip-bootstrap-empty-materialization-startup-noise-canary-disabled',
				reason: 'all bootstrap browser materialization candidates were blocked by startup/noise cooldowns; empty-materialization canary override is disabled, and no-product startup-noise cooldowns remain hard-blocked even when the override is enabled',
			} );
			return false;
		}

		const candidates = uniquePathList( [
			FLEET_STARTUP_NOISE_CANARY_GROUP,
			...MATERIALIZATION_FLOOR_GROUPS,
			...PRODUCTIVE_FALLBACK_GROUPS,
			state.emptyMaterializationStartupNoiseCanary?.group,
		] );
		const skippedCandidates = [];
		let selectedCanary = null;
		let selectedCooldown = null;
		for ( const candidate of candidates ) {
			const storedPause = state.pausedGroups?.[ candidate ];
			const activeNoisePause = getActiveNoisePauseCooldown( candidate );
			const duplicateFamilyHoldBlock =
				getBootstrapDuplicateFamilyHoldBlock( candidate );
			const storedActivePause = getActiveNoisePauseForEntry(
				candidate,
				storedPause
			);
			const hasCooldown = !! ( storedPause || activeNoisePause );
			const hasCooldownProductEvidence =
				hasPauseProductEvidence( storedPause ) ||
				hasPauseProductEvidence( storedActivePause ) ||
				hasPauseProductEvidence( activeNoisePause );
			const noProductStartupCooldown =
				( isNoProductStartupNoiseCooldown( storedActivePause ) ||
					isNoProductStartupNoiseCooldown( activeNoisePause ) ) &&
				! hasCooldownProductEvidence;
			const bypassableProductEvidenceStartupCooldown =
				hasCooldownProductEvidence &&
				( storedActivePause?.kind === 'startup-noise' ||
					activeNoisePause?.kind === 'startup-noise' );
			let blockedReason = '';
			let duplicateFamilyHoldBlocked = false;
			if ( ! candidate ) {
				blockedReason = 'empty group name';
			} else if ( seen.has( candidate ) ) {
				blockedReason = 'already selected';
			} else if ( ! PROFILE_BY_GROUP[ candidate ] ) {
				blockedReason = 'unknown group';
			} else if ( state.disabledGroups?.[ candidate ] ) {
				blockedReason = 'disabled group';
			} else if ( noProductStartupCooldown ) {
				blockedReason = `no-product startup-noise cooldown: ${
					activeNoisePause?.reason ??
					storedActivePause?.reason ??
					storedPause?.reason ??
					'unknown'
				}`;
			} else if (
				hasCooldown &&
				! bypassableProductEvidenceStartupCooldown
			) {
				blockedReason = `non-reusable pause/cooldown: ${
					storedPause?.reason ?? activeNoisePause?.reason ?? 'unknown'
				}`;
			} else if ( duplicateFamilyHoldBlock ) {
				blockedReason = getBootstrapDuplicateFamilyHoldBlockReason(
					duplicateFamilyHoldBlock
				);
				duplicateFamilyHoldBlocked = true;
			}
			if ( blockedReason ) {
				skippedCandidates.push( {
					group: candidate,
					reason: blockedReason,
					...( storedPause?.expiresAt || activeNoisePause?.expiresAt
						? {
								expiresAt:
									storedPause?.expiresAt ??
									activeNoisePause?.expiresAt,
						  }
						: {} ),
					...( duplicateFamilyHoldBlocked
						? {
								family: duplicateFamilyHoldBlock.family,
								source: duplicateFamilyHoldBlock.source,
								expiresAt: duplicateFamilyHoldBlock.expiresAt,
						  }
						: {} ),
				} );
				continue;
			}

			selectedCanary = candidate;
			selectedCooldown =
				activeNoisePause ?? storedActivePause ?? storedPause ?? null;
			break;
		}

		if ( ! selectedCanary ) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'skip-bootstrap-empty-materialization-startup-noise-canary-no-eligible-fallback',
				skippedCandidates: skippedCandidates.slice( 0, 12 ),
				reason: 'all bootstrap browser materialization candidates were blocked, and no bounded canary candidate was eligible without overriding no-product startup-noise cooldowns',
			} );
			return false;
		}

		if ( state.pausedGroups?.[ selectedCanary ] ) {
			delete state.pausedGroups[ selectedCanary ];
		}
		seen.add( selectedCanary );
		selected.push( selectedCanary );
		state.materializationRescueGroups = [ selectedCanary ];
		state.emptyMaterializationStartupNoiseCanary = {
			at: new Date().toISOString(),
			outputDir: OUTPUT_DIR,
			group: selectedCanary,
			...( selectedCooldown?.at
				? { cooldownAt: selectedCooldown.at }
				: {} ),
			...( selectedCooldown?.reason
				? { cooldownReason: selectedCooldown.reason }
				: {} ),
			...( selectedCooldown?.expiresAt
				? { expiresAt: selectedCooldown.expiresAt }
				: {} ),
			...( selectedCooldown?.originGroup
				? { originGroup: selectedCooldown.originGroup }
				: {} ),
		};
		state.changes.push( {
			at: state.emptyMaterializationStartupNoiseCanary.at,
			action: 'bootstrap-empty-materialization-startup-noise-canary',
			group: selectedCanary,
			skippedCandidates: skippedCandidates.slice( 0, 12 ),
			reason: 'coverage-guided browser materialization would otherwise be empty; launching exactly one bounded canary only because it is not blocked by a no-product startup-noise cooldown',
		} );
		return true;
	};

	if (
		ALLOW_FLEET_STARTUP_NOISE_CANARY &&
		FLEET_STARTUP_NOISE_CANARY_GROUP
	) {
		const beforeExplicitCanary = selected.length;
		addGroup( FLEET_STARTUP_NOISE_CANARY_GROUP );
		if ( selected.length > beforeExplicitCanary ) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'prefer-explicit-bootstrap-canary-group',
				group: FLEET_STARTUP_NOISE_CANARY_GROUP,
				reason: 'explicit bounded materialization canary was requested; trying it before stale enabled groups from the copied novelty state',
			} );
		}
	}
	for ( const group of REQUIRED_COVERAGE_BREADTH_GROUPS ) {
		if ( selected.length >= MAX_ENABLED_GROUPS ) {
			break;
		}
		addGroup( group );
	}
	for ( const group of state.enabledGroups ?? [] ) {
		if ( selected.length >= TARGET_ENABLED_GROUPS ) {
			break;
		}
		addGroup( group );
	}
	const bootstrapTarget = Math.max(
		1,
		Math.min( TARGET_ENABLED_GROUPS, MAX_ENABLED_GROUPS )
	);
	if ( selected.length < bootstrapTarget ) {
		for ( const group of PRODUCTIVE_FALLBACK_GROUPS ) {
			addGroup( group );
			if ( selected.length >= bootstrapTarget ) {
				break;
			}
		}
	}
	if ( selected.length === 0 && START_SUPERVISOR ) {
		addFleetStartupNoiseCanary();
	}
	if ( selected.length === 0 && START_SUPERVISOR ) {
		if (
			isStartupHoldBlockingProducerSelection(
				bootstrapProducerStartupHold
			) &&
			bootstrapProducerStartupHold?.drainOnly !== true &&
			bootstrapProducerStartupHold?.fleetStartupNoiseHold !== true
		) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'hold-bootstrap-empty-materialization-current-startup-noise',
				reason: `current coverage root has zero active materialized run dirs, but ${
					bootstrapProducerStartupHold.drainOnly ? 'drain-only ' : ''
				}${
					bootstrapProducerStartupHold.fleetStartupNoiseHold
						? 'fleet '
						: 'current-run '
				}startup-noise hold is active for ${
					bootstrapProducerStartupHold.family
				} (${
					bootstrapProducerStartupHold.count
				} groups/signatures, share=${
					bootstrapProducerStartupHold.share
				}); leaving browser producer set empty instead of rescuing through startup noise`,
			} );
		} else {
			let rescueLaneCount = 0;
			const rescueGroups = uniquePathList( [
				...MATERIALIZATION_FLOOR_GROUPS,
				...PRODUCTIVE_FALLBACK_GROUPS,
			] );
			for ( const group of rescueGroups ) {
				const activeNoisePause = getActiveNoisePauseCooldown( group );
				const duplicateFamilyHoldBlock =
					getBootstrapDuplicateFamilyHoldBlock( group );
				if (
					seen.has( group ) ||
					! PROFILE_BY_GROUP[ group ] ||
					state.disabledGroups?.[ group ]
				) {
					continue;
				}
				if ( state.pausedGroups?.[ group ] || activeNoisePause ) {
					const pausedReason = state.pausedGroups?.[ group ]?.reason;
					state.changes.push( {
						at: new Date().toISOString(),
						action: 'skip-bootstrap-rescue-noise-cooldown',
						group,
						reason: 'current coverage root has zero active materialized run dirs, but bootstrap rescue cannot override stored startup/known-noise pause or active cooldown without current product evidence',
						...( pausedReason
							? { storedPauseReason: pausedReason }
							: {} ),
						...( activeNoisePause
							? {
									cooldownKind: activeNoisePause.kind,
									cooldownAt: activeNoisePause.at,
									cooldownReason: activeNoisePause.reason,
									expiresAt: activeNoisePause.expiresAt,
									...( activeNoisePause.originGroup
										? {
												originGroup:
													activeNoisePause.originGroup,
										  }
										: {} ),
							  }
							: {} ),
					} );
					continue;
				}
				if ( duplicateFamilyHoldBlock ) {
					state.changes.push( {
						at: new Date().toISOString(),
						action: 'skip-bootstrap-rescue-duplicate-family-hold',
						group,
						family: duplicateFamilyHoldBlock.family,
						source: duplicateFamilyHoldBlock.source,
						expiresAt: duplicateFamilyHoldBlock.expiresAt,
						reason: getBootstrapDuplicateFamilyHoldBlockReason(
							duplicateFamilyHoldBlock
						),
					} );
					continue;
				}
				seen.add( group );
				selected.push( group );
				rescueLaneCount +=
					PROFILE_GROUPS.find( ( profile ) => profile.name === group )
						?.lanes ?? 1;
				if ( rescueLaneCount >= MIN_ENABLED_BROWSER_LANES ) {
					break;
				}
			}
			if ( selected.length > 0 ) {
				state.materializationRescueGroups = selected.slice();
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'bootstrap-empty-materialization-rescue',
					groups: selected.slice(),
					reason: 'current-run triage has no active materialized producer; writing bounded unrelated browser supervisor groups so coverage materialization is not empty while preserving producer-specific startup/noise holds',
				} );
			}
		}
	}
	if ( selected.length === 0 && START_SUPERVISOR ) {
		addEmptyMaterializationStartupNoiseCanary();
	}

	const groups = selected.slice( 0, Math.max( 1, MAX_ENABLED_GROUPS ) );
	if ( groups.length === 0 ) {
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'bootstrap-supervisor-groups-empty',
			reason: 'no enabled or fallback browser group was available before the first coverage scan without overriding stored pause state or active duplicate/noise cooldowns',
		} );
		state.enabledGroups = [];
		await writeJsonFileAtomic( GROUPS_PATH, [] );
		await writeJsonFileAtomic( STATE_PATH, state );
		return;
	}

	state.enabledGroups = groups;
	const groupProfiles = groups
		.map( ( group ) =>
			PROFILE_GROUPS.find( ( profile ) => profile.name === group )
		)
		.filter( Boolean );
	await writeJsonFileAtomic( GROUPS_PATH, groupProfiles.map( buildGroup ) );
	state.changes.push( {
		at: new Date().toISOString(),
		action: 'bootstrap-supervisor-groups',
		groups,
		reason: 'wrote bounded supervisor-groups.json before the first coverage scan so browser materialization is not blocked by historical coverage intake',
	} );
	await writeJsonFileAtomic( STATE_PATH, state );
}

function isValidSupervisorGroupConfig( group ) {
	return !! group?.name && !! PROFILE_BY_GROUP[ group.name ];
}

async function maybeLaunchCoverageCodex( guidance ) {
	if ( ! COVERAGE_GUIDANCE_CODEX_ENABLED ) {
		return;
	}

	if ( START_SUPERVISOR && ! COVERAGE_GUIDANCE_CODEX_FORCE ) {
		let reason = null;
		if (
			state.currentRunDirSource ===
			'supervisor-state-missing-no-output-dir-fallback'
		) {
			reason =
				'current supervisor state is missing or stale for this novelty output dir; hold coverage Codex until the current-root supervisor is validated';
		} else if ( ( state.currentRunDirs ?? [] ).length === 0 ) {
			reason =
				'current supervisor state has no active current-run dirs; hold coverage Codex until a current producer materializes or policy records a concrete hold';
		}
		if ( reason ) {
			if ( state.coverageGuidanceCurrentScopeHoldReason !== reason ) {
				state.coverageGuidanceCurrentScopeHoldReason = reason;
				state.coverageGuidanceCurrentScopeHoldLastAt =
					new Date().toISOString();
				state.changes.push( {
					at: state.coverageGuidanceCurrentScopeHoldLastAt,
					action: 'hold-coverage-guidance-codex-current-scope-unvalidated',
					reason,
				} );
			}
			return;
		}
	}
	if ( state.coverageGuidanceCurrentScopeHoldReason ) {
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'clear-coverage-guidance-current-scope-hold',
			reason: 'current supervisor state and active run dirs are validated; coverage Codex may launch if other gates permit it',
		} );
		delete state.coverageGuidanceCurrentScopeHoldReason;
		delete state.coverageGuidanceCurrentScopeHoldLastAt;
	}

	const currentPolicyTriageYield = state.triageYieldCurrent;
	const currentDrainTriageYield =
		state.triageYieldCurrentIncludingPausedNoAnalysis ??
		currentPolicyTriageYield;
	const currentRunHold = getCurrentRunDuplicateNoiseHold(
		currentPolicyTriageYield,
		{
			allowGenericDuplicate: true,
			requireNoProductEvidence: true,
		}
	);
	const currentDrainHold = getCurrentRunDuplicateNoiseHold(
		currentDrainTriageYield,
		{
			allowGenericDuplicate: true,
			requireNoProductEvidence: true,
		}
	);
	const currentStartupHold = isCurrentNoProductStartupHold( currentRunHold )
		? { ...currentRunHold, scope: 'active current-run' }
		: isCurrentNoProductStartupHold( currentDrainHold )
		? { ...currentDrainHold, scope: 'active/drain current-run' }
		: null;
	if ( ! COVERAGE_GUIDANCE_CODEX_FORCE && currentStartupHold ) {
		const reason = `current no-product startup-noise hold is active for ${ currentStartupHold.family } in ${ currentStartupHold.scope } scope (${ currentStartupHold.count } signatures, share=${ currentStartupHold.share }, source=${ currentStartupHold.source }); hold open-ended coverage Codex until strict startup noise leaves the current policy path`;
		if ( state.coverageGuidanceCurrentStartupHoldReason !== reason ) {
			state.coverageGuidanceCurrentStartupHoldReason = reason;
			state.coverageGuidanceCurrentStartupHoldLastAt =
				new Date().toISOString();
			state.changes.push( {
				at: state.coverageGuidanceCurrentStartupHoldLastAt,
				action: 'hold-coverage-guidance-codex-current-startup-noise',
				reason,
			} );
		}
		return;
	}
	if ( state.coverageGuidanceCurrentStartupHoldReason ) {
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'clear-coverage-guidance-current-startup-noise-hold',
			reason: 'current active-run startup-noise hold cleared; coverage Codex may launch if other gates permit it',
		} );
		delete state.coverageGuidanceCurrentStartupHoldReason;
		delete state.coverageGuidanceCurrentStartupHoldLastAt;
	}

	const currentProductEvidenceDuplicateHold =
		getCurrentRunProductEvidenceDuplicateHold(
			currentPolicyTriageYield,
			state.currentRunDirs ?? []
		);
	const currentDrainProductEvidenceDuplicateHold =
		getCurrentRunProductEvidenceDuplicateHold(
			currentDrainTriageYield,
			state.currentRunDirsIncludingPausedNoAnalysis ??
				state.currentRunDirs ??
				[]
		);
	const currentProductDuplicateHold = currentProductEvidenceDuplicateHold
		? {
				...currentProductEvidenceDuplicateHold,
				scope: 'active current-run',
		  }
		: currentDrainProductEvidenceDuplicateHold
		? {
				...currentDrainProductEvidenceDuplicateHold,
				scope: 'active/drain current-run',
		  }
		: null;
	if ( ! COVERAGE_GUIDANCE_CODEX_FORCE && currentProductDuplicateHold ) {
		const producerScope = currentProductDuplicateHold.groupName
			? ` from ${ currentProductDuplicateHold.groupName }`
			: '';
		const reason = `current product-evidence duplicate family ${
			currentProductDuplicateHold.family
		}${ producerScope } is already represented in ${
			currentProductDuplicateHold.scope
		} scope (${ currentProductDuplicateHold.count }/${
			currentProductDuplicateHold.total ??
			currentProductDuplicateHold.count
		} ${ currentProductDuplicateHold.source } signatures, share=${
			currentProductDuplicateHold.share
		}, representative=${
			currentProductDuplicateHold.representativeSignal
		}); hold open-ended coverage Codex until the producer is paused/rotated while preserving product-evidence signatures`;
		if (
			state.coverageGuidanceCurrentProductDuplicateHoldReason !== reason
		) {
			state.coverageGuidanceCurrentProductDuplicateHoldReason = reason;
			state.coverageGuidanceCurrentProductDuplicateHoldLastAt =
				new Date().toISOString();
			state.changes.push( {
				at: state.coverageGuidanceCurrentProductDuplicateHoldLastAt,
				action: 'hold-coverage-guidance-codex-current-product-duplicate',
				reason,
			} );
		}
		return;
	}
	if ( state.coverageGuidanceCurrentProductDuplicateHoldReason ) {
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'clear-coverage-guidance-current-product-duplicate-hold',
			reason: 'current active-run represented product-evidence duplicate hold cleared; coverage Codex may launch if other gates permit it',
		} );
		delete state.coverageGuidanceCurrentProductDuplicateHoldReason;
		delete state.coverageGuidanceCurrentProductDuplicateHoldLastAt;
	}

	const historicalKnownNoiseHold = getHistoricalKnownNoiseHoldReason();
	if (
		! historicalKnownNoiseHold &&
		state.coverageGuidanceHistoricalNoiseHoldReason
	) {
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'clear-coverage-guidance-historical-noise-hold',
			reason: 'current-run duplicate/noise no longer justifies the historical hold',
		} );
		delete state.coverageGuidanceHistoricalNoiseHoldReason;
		delete state.coverageGuidanceHistoricalNoiseHoldLastAt;
	}

	if ( hasActiveCoverageCodexSession() ) {
		return;
	}

	const lastLaunchAt = Date.parse(
		state.coverageGuidanceLastCodexLaunchAt ?? ''
	);
	if (
		! COVERAGE_GUIDANCE_CODEX_FORCE &&
		Number.isFinite( lastLaunchAt ) &&
		Date.now() - lastLaunchAt < COVERAGE_GUIDANCE_CODEX_INTERVAL_MS
	) {
		return;
	}

	const shouldLaunch =
		COVERAGE_GUIDANCE_CODEX_FORCE ||
		guidance.harnessWork.length > 0 ||
		( guidance.autoExpansion?.addedGoals?.length ?? 0 ) > 0 ||
		( ( guidance.qualityIssues?.length ?? 0 ) > 0 &&
			( guidance.qualityIssuePasses ?? 0 ) >=
				COVERAGE_QUALITY_ISSUE_PASSES ) ||
		( guidance.unmetGoals.length > 0 &&
			guidance.noProgressPasses >= COVERAGE_GUIDANCE_STALL_PASSES );
	if ( ! shouldLaunch ) {
		return;
	}
	if ( ! COVERAGE_GUIDANCE_CODEX_FORCE && historicalKnownNoiseHold ) {
		if (
			state.coverageGuidanceHistoricalNoiseHoldReason !==
			historicalKnownNoiseHold
		) {
			state.coverageGuidanceHistoricalNoiseHoldReason =
				historicalKnownNoiseHold;
			state.coverageGuidanceHistoricalNoiseHoldLastAt =
				new Date().toISOString();
			state.changes.push( {
				at: state.coverageGuidanceHistoricalNoiseHoldLastAt,
				action: 'hold-coverage-guidance-codex',
				reason: historicalKnownNoiseHold,
			} );
		}
		return;
	}

	const timestamp = createTimestamp();
	const session = `${ COVERAGE_GUIDANCE_CODEX_SESSION_PREFIX }-${ timestamp }`;
	const promptDir = path.join( OUTPUT_DIR, 'coverage-guidance-prompts' );
	const reportDir = path.join( OUTPUT_DIR, 'coverage-guidance-reports' );
	await fs.mkdir( promptDir, { recursive: true } );
	await fs.mkdir( reportDir, { recursive: true } );
	const promptPath = path.join( promptDir, `${ timestamp }.md` );
	const reportPath = path.join( reportDir, `${ timestamp }.md` );
	const logPath = path.join( reportDir, `${ timestamp }.log` );
	await fs.writeFile(
		promptPath,
		buildCoverageCodexPrompt( guidance, reportPath )
	);

	const command = [
		`cd ${ shellQuote( COVERAGE_GUIDANCE_CODEX_CWD ) }`,
		`${ shellQuote(
			CODEX_BIN
		) } -a never exec --skip-git-repo-check -m ${ shellQuote(
			CODEX_MODEL
		) } -c ${ shellQuote(
			`model_reasoning_effort=${ CODEX_REASONING_EFFORT }`
		) } -s danger-full-access < ${ shellQuote(
			promptPath
		) } > ${ shellQuote( reportPath ) } 2> ${ shellQuote( logPath ) }`,
	].join( '; ' );

	spawn( 'tmux', [ 'new-session', '-d', '-s', session, command ], {
		cwd: COVERAGE_GUIDANCE_CODEX_CWD,
		stdio: 'ignore',
	} ).unref();

	state.coverageGuidanceLastCodexLaunchAt = new Date().toISOString();
	let reason = `${ guidance.noProgressPasses } no-progress coverage pass(es) with ${ guidance.unmetGoals.length } unmet goal(s)`;
	if ( guidance.harnessWork.length ) {
		reason = `${ guidance.harnessWork.length } coverage goal(s) need harness work`;
	} else if ( ( guidance.autoExpansion?.addedGoals?.length ?? 0 ) > 0 ) {
		reason = `${ guidance.autoExpansion.addedGoals.length } auto-expanded coverage goal(s) added`;
	} else if ( ( guidance.qualityIssues?.length ?? 0 ) > 0 ) {
		reason = `${ guidance.qualityIssues.length } coverage quality issue(s) persisted for ${ guidance.qualityIssuePasses } pass(es)`;
	}
	state.changes.push( {
		at: state.coverageGuidanceLastCodexLaunchAt,
		action: 'start-coverage-guidance-codex',
		session,
		reason,
	} );
	await log( `Started coverage guidance Codex tmux session ${ session }.` );
}

function hasActiveCoverageCodexSession() {
	let sessions;
	try {
		sessions = execFileSync( 'tmux', [ 'ls' ], {
			encoding: 'utf8',
			timeout: 5000,
		} );
	} catch {
		return false;
	}
	return sessions
		.split( '\n' )
		.some( ( line ) =>
			line.startsWith( `${ COVERAGE_GUIDANCE_CODEX_SESSION_PREFIX }-` )
		);
}

function getHistoricalKnownNoiseHoldReason() {
	const historical = state.triageYieldHistorical;
	if (
		! historical ||
		Math.max(
			historical.signatureCount ?? 0,
			historical.rawSignatureCount ?? 0,
			historical.suppressedStrictStartupRecords ?? 0
		) < TRIAGE_NOISE_DOMINANCE_MIN_CANDIDATES
	) {
		return null;
	}
	const currentTriageYield = state.triageYieldCurrent;
	if ( ( currentTriageYield?.likelyRealVisible ?? 0 ) > 0 ) {
		return null;
	}
	const currentDuplicateNoiseHold = getCurrentRunDuplicateNoiseHold(
		currentTriageYield,
		{
			allowGenericDuplicate: true,
			requireNoProductEvidence: true,
		}
	);
	if ( ! currentDuplicateNoiseHold ) {
		return null;
	}

	const candidates = [
		{
			kind: 'actionable',
			topFamily: historical.topSemanticFamilies?.[ 0 ],
			share: historical.topDuplicateFamilyShare ?? 0,
			total: historical.signatureCount ?? 0,
		},
		{
			kind: 'raw',
			topFamily: historical.rawTopSemanticFamilies?.[ 0 ],
			share: historical.rawTopDuplicateFamilyShare ?? 0,
			total: historical.rawSignatureCount ?? 0,
		},
	];
	for ( const candidate of candidates ) {
		if (
			! candidate.topFamily ||
			! HISTORICAL_KNOWN_NOISE_FAMILIES.has( candidate.topFamily.family )
		) {
			continue;
		}
		if ( candidate.share < TRIAGE_DUPLICATE_SHARE_HOLD ) {
			continue;
		}
		return `historical ${ candidate.kind } known-noise family ${ candidate.topFamily.family } dominates observed triage (${ candidate.topFamily.count }/${ candidate.total }, share=${ candidate.share }); hold open-ended coverage Codex until current-run noise gating is validated`;
	}

	const suppressedStartupRecords =
		historical.suppressedStrictStartupRecords ?? 0;
	if ( suppressedStartupRecords >= TRIAGE_NOISE_DOMINANCE_MIN_CANDIDATES ) {
		return `historical strict pre-action startup suppression is high (${ suppressedStartupRecords } suppressed record(s)); hold open-ended coverage Codex until current-run noise gating is validated`;
	}

	return null;
}

function buildCoverageCodexPrompt( guidance, reportPath ) {
	const unmet = guidance.unmetGoals
		.slice( 0, 25 )
		.map(
			( goal ) =>
				`- ${ goal.id }: ${ goal.count }/${ goal.target }; groups=${
					goal.groups.join( ',' ) || 'none'
				}; ${ goal.rationale }`
		)
		.join( '\n' );
	const harness = guidance.harnessWork
		.map(
			( goal ) =>
				`- ${ goal.id }: ${ goal.count }/${ goal.target }; groups=${
					goal.groups.join( ',' ) || 'none'
				}`
		)
		.join( '\n' );
	const qualityIssues = ( guidance.qualityIssues ?? [] )
		.slice( 0, 20 )
		.map(
			( issue ) =>
				`- ${ issue.id } (${ issue.severity }): ${ issue.evidence }; action=${ issue.recommendedAction }`
		)
		.join( '\n' );

	return [
		'You are running inside a long-lived RTC browser fuzzing loop.',
		'Do not use API subagents. Work locally. Keep any code changes narrow and reviewable.',
		'Your task is to make the fuzz harness add missing coverage, not to reduce coverage or suppress failures.',
		'Never add or recommend behavior-disable flags such as DISABLE_SYNC_FAULTS, DISABLE_PARSER_STRESS, DISABLE_REVISION_RESTORE, DISABLE_RELOAD, or DISABLE_RANDOM_RELOAD.',
		'',
		`Repo root: ${ REPO_ROOT }`,
		`Novelty output dir: ${ OUTPUT_DIR }`,
		`Groups path: ${ GROUPS_PATH }`,
		`Novelty state: ${ STATE_PATH }`,
		`Novelty status: ${ STATUS_PATH }`,
		`Observed run roots: ${ OBSERVED_RUN_DIRS.join( ', ' ) }`,
		`Write your report to: ${ reportPath }`,
		'',
		'Coverage guidance summary:',
		`- no-progress passes: ${ guidance.noProgressPasses }`,
		`- new behavioral feature keys this pass: ${ guidance.newFeatureKeysThisPass }`,
		`- new CDP hashes this pass: ${ guidance.newCdpCoverageHashesThisPass }`,
		`- recommended built-in groups: ${ guidance.recommendedGroups.join(
			', '
		) }`,
		`- auto-goal expansion threshold: ${ guidance.autoExpansion?.threshold }`,
		`- auto-goals added this pass: ${
			guidance.autoExpansion?.addedGoals?.join( ', ' ) || 'none'
		}`,
		`- coverage quality issue passes: ${
			guidance.qualityIssuePasses ?? 0
		} / ${ COVERAGE_QUALITY_ISSUE_PASSES }`,
		'',
		'Top unmet coverage goals:',
		unmet || '- none',
		'',
		'Harness-work candidates:',
		harness || '- none',
		'',
		'Coverage quality issues:',
		qualityIssues || '- none',
		'',
		'Do this loop:',
		'1. Inspect the coverage records and existing fuzz profiles/actions.',
		'2. If existing profiles can cover a missing goal, update the group policy/config so the gap is covered.',
		'3. If completion or startup quality is bad, fix that before adding another large class of fuzz actions.',
		'4. If the harness cannot currently generate the missing feature, add the smallest fuzz action/profile/env knob needed.',
		'5. If the automatic expansion threshold is causing too much or too little queued coverage work, recommend a new RTC_FUZZ_NOVELTY_AUTO_GOAL_EXPANSION_THRESHOLD value and explain why.',
		'6. Run focused syntax/lint checks for changed files.',
		'7. Write a concise report with changed files, commands run, and how the next monitor pass should prove coverage or completion improved.',
		'',
	].join( '\n' );
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
		isPathInsideRoot( filePath, OUTPUT_DIR )
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
			`triage yield is duplicate/noise dominated${
				PAUSE_ON_TRIAGE_NOISE ? '' : ' (coverage pause disabled)'
			}: top family share ${
				triageYield.topDuplicateFamilyShare
			}, bootstrap stalls ${
				triageYield.bootstrapStalls
			}, normalization noise candidates ${
				triageYield.normalizationNoiseCandidates
			}, visible likely-real ${ triageYield.likelyRealVisible }`
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

let fullStatusWritten =
	loadedStateHadFullStatus && loadedStateOutputDirMatchesCurrentOutput;
let lastFullStatusCompletedAt =
	loadedStateHadFullStatus && loadedStateOutputDirMatchesCurrentOutput
		? state.lastCompletedFullPassAt ?? state.lastUpdatedAt ?? null
		: null;
let statusWriteQueue = Promise.resolve();

async function enqueueStatusWrite( writeOperation ) {
	const nextWrite = statusWriteQueue.then( writeOperation, writeOperation );
	statusWriteQueue = nextWrite.catch( () => {} );
	return nextWrite;
}

async function writeStatus(
	novelty,
	resources,
	coverageFiles,
	coverageStats,
	summaryStats,
	triageYield,
	historicalTriageYield,
	combinedTriageYield,
	guidance
) {
	const statusUpdatedAt = new Date().toISOString();
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
		`Updated: ${ statusUpdatedAt }`,
		`Output dir: ${ OUTPUT_DIR }`,
		`Supervisor session: ${ getCurrentSupervisorSession() }`,
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
		`- summary files read this pass: ${ summaryStats.filesRead }`,
		`- summary lines seen this pass: ${ summaryStats.linesSeen }`,
		`- summary startup failures processed this pass: ${ summaryStats.startupFailures }`,
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
		`- current-run records by profile: ${ JSON.stringify(
			state.currentRunRecordCountsByProfile ?? {}
		) }`,
		`- current-run records by group: ${ JSON.stringify(
			state.currentRunRecordCountsByGroup ?? {}
		) }`,
		`- current-run successful records by profile: ${ JSON.stringify(
			state.currentRunSuccessfulRecordCountsByProfile ?? {}
		) }`,
		`- current-run records by transport: ${ JSON.stringify(
			state.currentRunRecordCountsByTransport ?? {}
		) }`,
		`- current-run pre-action startup failures by profile: ${ JSON.stringify(
			state.startupFailureCountsByProfile ?? {}
		) }`,
		`- current-run pre-action startup failures by group: ${ JSON.stringify(
			state.startupFailureCountsByGroup ?? {}
		) }`,
		`- current-run summary-only startup failures by profile: ${ JSON.stringify(
			state.currentRunSummaryStartupFailureCountsByProfile ?? {}
		) }`,
		`- current-run summary-only startup failures by group: ${ JSON.stringify(
			state.currentRunSummaryStartupFailureCountsByGroup ?? {}
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
		`- many-user lifecycle records: ${
			state.featureCounts?.[ 'users:12' ] ?? 0
		}`,
		`- collaboration UI signal records: ${ Math.max(
			state.featureCounts?.[ 'history:presence-list:ok' ] ?? 0,
			state.featureCounts?.[ 'history:remote-selection-cursor:ok' ] ?? 0
		) }`,
		`- real-user editing successful records: ${
			state.successfulRecordCountsByProfile?.[ 'real-user-editing' ] ?? 0
		} / ${ REAL_USER_EDITING_MIN_RECORDS }`,
		`- real-user editing successful action counts: ${ JSON.stringify(
			state.successfulActionCountsByProfile?.[ 'real-user-editing' ] ?? {}
		) }`,
		'',
		'## Coverage Guidance',
		`- unmet goals: ${ guidance.unmetGoals.length }`,
		`- auto goal expansion: ${
			guidance.autoExpansion?.enabled ? 'enabled' : 'disabled'
		}`,
		`- auto goal expansion threshold: ${
			guidance.autoExpansion?.threshold ?? AUTO_GOAL_EXPANSION_THRESHOLD
		}`,
		`- auto coverage goals: ${ state.autoCoverageGoals?.length ?? 0 }`,
		`- auto goals added this pass: ${
			guidance.autoExpansion?.addedGoals?.length ?? 0
		}`,
		`- no-progress passes: ${ guidance.noProgressPasses } / ${ COVERAGE_GUIDANCE_STALL_PASSES }`,
		`- quality issue passes: ${
			guidance.qualityIssuePasses ?? 0
		} / ${ COVERAGE_QUALITY_ISSUE_PASSES }`,
		`- quality issues: ${ guidance.qualityIssues?.length ?? 0 }`,
		`- policy guards: startup=${
			PAUSE_ON_STARTUP_FAILURE ? 'enabled' : 'disabled'
		}, triage-noise=${ PAUSE_ON_TRIAGE_NOISE ? 'enabled' : 'disabled' }${
			FORCE_COVERAGE_GUIDED_POLICY_GUARDS
				? ' (coverage-guided forced)'
				: ''
		}`,
		`- recommended groups: ${
			guidance.recommendedGroups.length
				? guidance.recommendedGroups.join( ', ' )
				: 'none'
		}`,
		`- required breadth groups: ${
			REQUIRED_COVERAGE_BREADTH_GROUPS.length
				? REQUIRED_COVERAGE_BREADTH_GROUPS.join( ', ' )
				: 'none'
		}`,
		`- harness-work candidates: ${ guidance.harnessWork.length }`,
		`- current-run dir source: ${ state.currentRunDirSource ?? 'unknown' }`,
		`- current-run active dirs: ${ ( state.currentRunDirs ?? [] ).length }`,
		...( guidance.autoExpansion?.addedGoals?.length
			? guidance.autoExpansion.addedGoals.map(
					( id ) => `- added auto goal ${ id }`
			  )
			: [] ),
		...( guidance.qualityIssues?.length
			? guidance.qualityIssues
					.slice( 0, 12 )
					.map(
						( issue ) =>
							`- quality ${ issue.id }: ${ issue.evidence }`
					)
			: [] ),
		...guidance.unmetGoals
			.slice( 0, 20 )
			.map(
				( goal ) =>
					`- gap ${ goal.id }: ${ goal.count } / ${
						goal.target
					}, groups=${ goal.groups.join( ',' ) || 'none' }`
			),
		'',
		'## Triage Yield',
		'- scope: active current run dirs only; active health and reporting use this scope',
		...formatTriageYieldStatusLines( triageYield ),
		'',
		'## Current Drain Triage Yield',
		'- scope: active current run dirs plus paused no-analysis drain dirs; reporting and cleanup only',
		...formatTriageYieldStatusLines(
			state.triageYieldCurrentIncludingPausedNoAnalysis ?? triageYield
		),
		'',
		'## Historical Triage Yield',
		'- scope: observed prior roots only; used only to hold open-ended coverage Codex when a known-noise family dominates',
		...formatTriageYieldStatusLines( historicalTriageYield ),
		'',
		'## Combined Triage Yield',
		'- scope: current output dir plus observed prior roots; reporting only',
		...formatTriageYieldStatusLines( combinedTriageYield ),
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
	const previousFullStatusWritten = fullStatusWritten;
	try {
		await enqueueStatusWrite( () =>
			writeTextFileAtomic( STATUS_PATH, lines.join( '\n' ) )
		);
		fullStatusWritten = true;
		lastFullStatusCompletedAt = statusUpdatedAt;
	} catch ( error ) {
		fullStatusWritten = previousFullStatusWritten;
		throw error;
	}
}

async function writeStartupStatus() {
	if ( fullStatusWritten ) {
		return;
	}
	const groups = await readJsonFile( GROUPS_PATH );
	const supervisorState = await readSupervisorState();
	const activeRunDirs = filterPolicyInactiveCurrentRunDirs(
		getCurrentRunDirs( supervisorState ),
		supervisorState
	);
	const activeRunDirsIncludingPausedNoAnalysis = getCurrentRunDirs(
		supervisorState,
		{
			includePausedNoAnalysis: true,
		}
	);
	if (
		activeRunDirs.length > 0 &&
		getPathListKey( state.currentRunDirs ?? [] ) !==
			getPathListKey( activeRunDirs )
	) {
		state.currentRunDirs = activeRunDirs;
		state.currentRunDirsIncludingPausedNoAnalysis =
			activeRunDirsIncludingPausedNoAnalysis;
		state.currentRunDirSource = 'supervisor-active-run-dirs-startup';
		await writeJsonFileAtomic( STATE_PATH, state );
	}
	const lines = [
		'# RTC Novelty Monitor',
		'',
		`Updated: ${ new Date().toISOString() }`,
		`Output dir: ${ OUTPUT_DIR }`,
		`Supervisor session: ${ getCurrentSupervisorSession() }`,
		`Groups path: ${ GROUPS_PATH }`,
		'',
		'## Startup',
		'- status: monitor started; full coverage pass pending',
		`- observed roots: ${ OBSERVED_RUN_DIRS.length }`,
		`- previous records loaded: ${ state.recordsSeen ?? 0 }`,
		`- supervisor groups file: ${
			Array.isArray( groups ) ? groups.length : 'pending'
		}`,
		`- active run dirs: ${ activeRunDirs.length }`,
		'',
		'## Coverage Guidance',
		'- unmet goals: pending until first pass',
		'- harness-work candidates: pending until first pass',
		'- quality issues: pending until first pass',
		'',
		'## Triage Yield',
		'- signatures: pending until first pass',
		'- likely-real visible: pending until first pass',
		'- likely-real merged duplicates: pending until first pass',
		'- likely-real oracle/noise questions: pending until first pass',
		'- top duplicate family share: pending until first pass',
		'',
		'## Health',
		'- warning: startup status only; full novelty pass has not completed yet',
		'',
	];
	if ( fullStatusWritten ) {
		return;
	}
	await enqueueStatusWrite( async () => {
		if ( fullStatusWritten ) {
			return;
		}
		await writeTextFileAtomic( STATUS_PATH, lines.join( '\n' ) );
	} );
}

async function writeStatusHeartbeat() {
	if ( ! fullStatusWritten ) {
		await writeStartupStatus();
		return;
	}
	const heartbeatAt = new Date().toISOString();
	await enqueueStatusWrite( async () => {
		let text;
		try {
			text = await fs.readFile( STATUS_PATH, 'utf8' );
		} catch ( error ) {
			if ( error?.code === 'ENOENT' ) {
				fullStatusWritten = false;
				return;
			}
			throw error;
		}
		const fullPassSuffix = lastFullStatusCompletedAt
			? ` (${ lastFullStatusCompletedAt })`
			: '';
		const heartbeatLine = `- warning: status heartbeat refreshed at ${ heartbeatAt }; metrics are from the most recent completed full pass${ fullPassSuffix }`;
		let nextText = text.replace(
			/\n- warning: status heartbeat refreshed at [^\n]*/g,
			''
		);
		if ( /^Updated: /m.test( nextText ) ) {
			nextText = nextText.replace(
				/^Updated: .*$/m,
				`Updated: ${ heartbeatAt }`
			);
		} else {
			nextText = `Updated: ${ heartbeatAt }\n${ nextText }`;
		}
		if ( nextText.includes( '\n## Health\n' ) ) {
			nextText = nextText.replace(
				'\n## Health\n',
				`\n## Health\n${ heartbeatLine }\n`
			);
		} else {
			nextText = `${ nextText.trimEnd() }\n\n## Health\n${ heartbeatLine }\n`;
		}
		await writeTextFileAtomic(
			STATUS_PATH,
			nextText.endsWith( '\n' ) ? nextText : `${ nextText }\n`
		);
	} );
	if ( ! fullStatusWritten ) {
		await writeStartupStatus();
	}
}

function formatTriageYieldStatusLines( triageYield ) {
	return [
		`- triage roots: ${ triageYield.roots ?? 0 }`,
		`- triage state files: ${ triageYield.files }`,
		`- signatures: ${ triageYield.signatureCount }`,
		`- raw signatures: ${
			triageYield.rawSignatureCount ?? triageYield.signatureCount
		}`,
		`- no-product raw signatures: ${
			triageYield.noProductRawSignatureCount ?? 0
		}`,
		`- no-product actionable signatures: ${
			triageYield.noProductSignatureCount ?? 0
		}`,
		`- actionable signatures: ${
			triageYield.actionableSignatureCount ?? triageYield.signatureCount
		}`,
		`- non-actionable signatures: ${
			triageYield.nonActionableSignatureCount ?? 0
		}`,
		`- known-infra signatures: ${ triageYield.knownInfraSignatures ?? 0 }`,
		`- bootstrap-stall signatures: ${
			triageYield.bootstrapStallSignatures ?? 0
		}`,
		`- family-capped signatures: ${
			triageYield.familyCappedSignatures ?? 0
		}`,
		`- source-suppressed signatures: ${
			triageYield.sourceSuppressedSignatures ?? 0
		}`,
		`- stale-source signatures: ${
			triageYield.staleSourceSignatures ?? 0
		}`,
		`- analysis-gated non-actionable signatures: ${
			triageYield.analysisGatedNonActionableSignatures ?? 0
		}`,
		`- merged duplicate signatures: ${
			triageYield.mergedDuplicateSignatures ?? 0
		}`,
		`- normalization-noise excluded signatures: ${
			triageYield.normalizationNoiseSignatures ?? 0
		}`,
		`- product-evidence signatures: ${
			triageYield.productEvidenceSignatures ?? 0
		}`,
		`- raw product-evidence signatures: ${
			triageYield.rawProductEvidenceSignatures ?? 0
		}`,
		`- likely-real visible: ${ triageYield.likelyRealVisible }`,
		`- no-product likely-real visible: ${
			triageYield.noProductLikelyRealVisible ?? 0
		}`,
		`- likely-real merged duplicates: ${ triageYield.likelyRealMerged }`,
		`- likely-real oracle/noise questions: ${ triageYield.likelyRealOracleQuestion }`,
		`- normalization-noise candidates: ${ triageYield.normalizationNoiseCandidates }`,
		`- bootstrap stalls: ${ triageYield.bootstrapStalls }`,
		`- suppressed strict startup records: ${ triageYield.suppressedStrictStartupRecords }`,
		`- suppressed strict startup identities: ${ triageYield.suppressedStrictStartupIdentities }`,
		`- suppressed strict startup virtual signatures: ${
			triageYield.suppressedStrictStartupVirtualSignatures ?? 0
		}`,
		`- top duplicate family share: ${ triageYield.topDuplicateFamilyShare }`,
		`- top semantic families: ${ JSON.stringify(
			triageYield.topSemanticFamilies
		) }`,
		`- raw top duplicate family share: ${
			triageYield.rawTopDuplicateFamilyShare ?? 0
		}`,
		`- raw top semantic families: ${ JSON.stringify(
			triageYield.rawTopSemanticFamilies ?? []
		) }`,
		`- no-product top duplicate family share: ${
			triageYield.noProductTopDuplicateFamilyShare ?? 0
		}`,
		`- no-product top semantic families: ${ JSON.stringify(
			triageYield.noProductTopSemanticFamilies ?? []
		) }`,
		`- no-product raw top duplicate family share: ${
			triageYield.noProductRawTopDuplicateFamilyShare ?? 0
		}`,
		`- no-product raw top semantic families: ${ JSON.stringify(
			triageYield.noProductRawTopSemanticFamilies ?? []
		) }`,
	];
}

async function publishCurrentRunDirsEarly(
	currentRunDirs,
	currentRunDirsIncludingPausedNoAnalysis,
	source
) {
	if ( currentRunDirs.length === 0 ) {
		return;
	}
	if (
		getPathListKey( state.currentRunDirs ?? [] ) ===
			getPathListKey( currentRunDirs ) &&
		state.currentRunDirSource === source
	) {
		return;
	}
	state.currentRunDirs = currentRunDirs;
	state.currentRunDirsIncludingPausedNoAnalysis =
		currentRunDirsIncludingPausedNoAnalysis;
	state.currentRunDirSource = source;
	await writeJsonFileAtomic( STATE_PATH, state );
}

async function runPass() {
	let supervisorState = await readSupervisorState();
	const resources = sampleResources();
	if (
		START_SUPERVISOR &&
		isSupervisorStateForCurrentOutput( supervisorState ) &&
		Array.isArray( supervisorState.groups ) &&
		supervisorState.groups.length === 0
	) {
		const sessionName = getCurrentSupervisorSession();
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'restart-empty-supervisor-groups',
			session: sessionName,
			outputDir: OUTPUT_DIR,
			reason: 'current supervisor state has zero groups, so exact tmux liveness is not proof of materialized browser fuzzing',
		} );
		try {
			execFileSync( 'tmux', [ 'kill-session', '-t', sessionName ], {
				stdio: 'ignore',
			} );
		} catch {}
		supervisorState = null;
	}
	if (
		START_SUPERVISOR &&
		! hasSupervisorForCurrentOutput( supervisorState )
	) {
		await ensureBootstrapSupervisorGroups();
		await ensureSupervisor( resources );
	}
	if ( START_SUPERVISOR ) {
		supervisorState = await readSupervisorStateAfterStartup();
	}
	await syncSupervisorStartupStallPauses( supervisorState );
	const restoredNoAnalysisNoisePauses =
		await restoreNoisePausesFromNoAnalysisSentinels( OUTPUT_DIR );
	if ( restoredNoAnalysisNoisePauses > 0 ) {
		await writeJsonFileAtomic( STATE_PATH, state );
		await writeSupervisorGroupsForEnabledGroups( state.enabledGroups );
	}
	const restoredActiveNoiseCooldowns =
		await applyActiveNoiseCooldownsToEnabledGroups( supervisorState );
	if ( restoredActiveNoiseCooldowns > 0 ) {
		await writeJsonFileAtomic( STATE_PATH, state );
		await writeSupervisorGroupsForEnabledGroups( state.enabledGroups );
	}
	let currentRunDirs = filterPolicyInactiveCurrentRunDirs(
		getCurrentRunDirs( supervisorState ),
		supervisorState
	);
	let currentRunDirsIncludingPausedNoAnalysis = getCurrentRunDirs(
		supervisorState,
		{ includePausedNoAnalysis: true }
	);
	const preservedNoAnalysisRunDirs =
		await findPreservedNoAnalysisRunDirs( OUTPUT_DIR );
	currentRunDirsIncludingPausedNoAnalysis = uniquePathList( [
		...currentRunDirsIncludingPausedNoAnalysis,
		...preservedNoAnalysisRunDirs,
	] );
	currentRunCoverageRoots = currentRunDirs;
	await publishCurrentRunDirsEarly(
		currentRunDirs,
		currentRunDirsIncludingPausedNoAnalysis,
		'supervisor-active-run-dirs-prepass'
	);
	let observedTriageRunDirs = uniquePathList( [
		...HISTORICAL_OBSERVED_RUN_DIRS,
		...CURRENT_RUN_DIRS,
		...currentRunDirsIncludingPausedNoAnalysis,
	] );
	if ( START_SUPERVISOR && currentRunDirs.length === 0 ) {
		const refreshedSupervisorState =
			await readSupervisorStateWithMaterializedRunDirs();
		const refreshedCurrentRunDirs = filterPolicyInactiveCurrentRunDirs(
			getCurrentRunDirs( refreshedSupervisorState ),
			refreshedSupervisorState
		);
		if ( refreshedCurrentRunDirs.length > 0 ) {
			supervisorState = refreshedSupervisorState;
			currentRunDirs = refreshedCurrentRunDirs;
			currentRunDirsIncludingPausedNoAnalysis = getCurrentRunDirs(
				supervisorState,
				{ includePausedNoAnalysis: true }
			);
			currentRunDirsIncludingPausedNoAnalysis = uniquePathList( [
				...currentRunDirsIncludingPausedNoAnalysis,
				...preservedNoAnalysisRunDirs,
			] );
			currentRunCoverageRoots = currentRunDirs;
			await publishCurrentRunDirsEarly(
				currentRunDirs,
				currentRunDirsIncludingPausedNoAnalysis,
				'supervisor-active-run-dirs-materialized-before-coverage-scan'
			);
			observedTriageRunDirs = uniquePathList( [
				...HISTORICAL_OBSERVED_RUN_DIRS,
				...CURRENT_RUN_DIRS,
				...currentRunDirsIncludingPausedNoAnalysis,
			] );
		}
	}
	const currentRunTriageGateRefresh = await refreshCurrentRunTriageGates(
		currentRunDirsIncludingPausedNoAnalysis
	);
	let coverageFiles = await findCoverageFiles(
		uniquePathList( [ ...OBSERVED_RUN_DIRS, ...currentRunDirs ] )
	);
	let currentCoverageFiles = coverageFiles.filter( ( filePath ) =>
		isCoverageFileInRunDirs( filePath, currentRunDirs )
	);
	let currentSummaryFiles = await findSummaryFiles( currentRunDirs );
	if ( START_SUPERVISOR && currentRunDirs.length === 0 ) {
		const refreshedSupervisorState =
			await readSupervisorStateWithMaterializedRunDirs();
		const refreshedCurrentRunDirs = filterPolicyInactiveCurrentRunDirs(
			getCurrentRunDirs( refreshedSupervisorState ),
			refreshedSupervisorState
		);
		if ( refreshedCurrentRunDirs.length > 0 ) {
			supervisorState = refreshedSupervisorState;
			currentRunDirs = refreshedCurrentRunDirs;
			currentRunDirsIncludingPausedNoAnalysis = getCurrentRunDirs(
				supervisorState,
				{ includePausedNoAnalysis: true }
			);
			currentRunDirsIncludingPausedNoAnalysis = uniquePathList( [
				...currentRunDirsIncludingPausedNoAnalysis,
				...preservedNoAnalysisRunDirs,
			] );
			currentRunCoverageRoots = currentRunDirs;
			await publishCurrentRunDirsEarly(
				currentRunDirs,
				currentRunDirsIncludingPausedNoAnalysis,
				'supervisor-active-run-dirs-materialized-prepass'
			);
			observedTriageRunDirs = uniquePathList( [
				...HISTORICAL_OBSERVED_RUN_DIRS,
				...CURRENT_RUN_DIRS,
				...currentRunDirsIncludingPausedNoAnalysis,
			] );
			coverageFiles = uniquePathList( [
				...coverageFiles,
				...( await findCoverageFiles( currentRunDirs ) ),
			] ).sort();
			currentCoverageFiles = coverageFiles.filter( ( filePath ) =>
				isCoverageFileInRunDirs( filePath, currentRunDirs )
			);
			currentSummaryFiles = await findSummaryFiles( currentRunDirs );
		}
	}
	const lateCurrentCoverageFiles = await findCoverageFiles( currentRunDirs );
	if ( lateCurrentCoverageFiles.length > currentCoverageFiles.length ) {
		coverageFiles = uniquePathList( [
			...coverageFiles,
			...lateCurrentCoverageFiles,
		] ).sort();
		currentCoverageFiles = coverageFiles.filter( ( filePath ) =>
			isCoverageFileInRunDirs( filePath, currentRunDirs )
		);
	}
	const lateCurrentSummaryFiles = await findSummaryFiles( currentRunDirs );
	if ( lateCurrentSummaryFiles.length > currentSummaryFiles.length ) {
		currentSummaryFiles = uniquePathList( [
			...currentSummaryFiles,
			...lateCurrentSummaryFiles,
		] ).sort();
	}
	let triageYieldCurrent = await summarizeTriageYield( currentRunDirs );
	let triageYieldCurrentIncludingPausedNoAnalysis =
		await summarizeTriageYield( currentRunDirsIncludingPausedNoAnalysis );
	let triageYieldHistorical = await summarizeTriageYield(
		HISTORICAL_OBSERVED_RUN_DIRS
	);
	let triageYieldCombined = await summarizeTriageYield(
		observedTriageRunDirs
	);
	state.triageYield = triageYieldCurrent;
	state.triageYieldCurrent = triageYieldCurrent;
	state.triageYieldCurrentIncludingPausedNoAnalysis =
		triageYieldCurrentIncludingPausedNoAnalysis;
	state.triageYieldHistorical = triageYieldHistorical;
	state.triageYieldCombined = triageYieldCombined;
	state.lastCurrentRunTriageGateRefresh = currentRunTriageGateRefresh;
	state.currentRunDirs = currentRunDirs;
	state.currentRunDirsIncludingPausedNoAnalysis =
		currentRunDirsIncludingPausedNoAnalysis;
	state.currentRunDirSource = getCurrentRunDirSource( supervisorState );
	const { records, stats } = await readCoverageRecords( coverageFiles );
	const novelty = summarizeNovelty( records );
	await ensureCurrentRunCounters( currentCoverageFiles, currentSummaryFiles );
	const summaryStats =
		await readSummaryStartupFailures( currentSummaryFiles );
	const guidance = createCoverageGuidance( novelty );
	state.coverageGuidance = guidance;
	evaluateHealth(
		await readJsonFile( GROUPS_PATH ),
		coverageFiles,
		triageYieldCurrent,
		supervisorState
	);
	updateCoverageQualityIssues( guidance, triageYieldCurrent );
	await applyPolicy(
		novelty,
		resources,
		triageYieldCurrent,
		guidance,
		supervisorState
	);
	if ( ! shutdownRequested ) {
		if ( START_SUPERVISOR ) {
			await ensureSupervisor( resources );
		} else if ( ! state.supervisorStartDisabledLoggedAt ) {
			state.supervisorStartDisabledLoggedAt = new Date().toISOString();
			state.changes.push( {
				at: state.supervisorStartDisabledLoggedAt,
				action: 'skip-supervisor-start',
				reason: 'RTC_FUZZ_NOVELTY_START_SUPERVISOR=0; monitor is running in coverage-guidance/watch-only mode',
			} );
			await log(
				'Supervisor start disabled; monitor is running in coverage-guidance/watch-only mode.'
			);
		}
	}
	if ( START_SUPERVISOR ) {
		const refreshedSupervisorState =
			currentRunDirs.length === 0
				? await readSupervisorStateWithMaterializedRunDirs()
				: await readSupervisorState();
		const refreshedCurrentRunDirs = filterPolicyInactiveCurrentRunDirs(
			getCurrentRunDirs( refreshedSupervisorState ),
			refreshedSupervisorState
		);
		const refreshedPreservedNoAnalysisRunDirs =
			await findPreservedNoAnalysisRunDirs( OUTPUT_DIR );
		const refreshedCurrentRunDirsIncludingPausedNoAnalysis = uniquePathList(
			[
				...getCurrentRunDirs( refreshedSupervisorState, {
					includePausedNoAnalysis: true,
				} ),
				...refreshedPreservedNoAnalysisRunDirs,
			]
		);
		const currentScopeChanged =
			getPathListKey( refreshedCurrentRunDirs ) !==
				getPathListKey( currentRunDirs ) ||
			getPathListKey(
				refreshedCurrentRunDirsIncludingPausedNoAnalysis
			) !== getPathListKey( currentRunDirsIncludingPausedNoAnalysis );

		if ( currentScopeChanged ) {
			supervisorState = refreshedSupervisorState;
			currentRunDirs = refreshedCurrentRunDirs;
			currentRunDirsIncludingPausedNoAnalysis =
				refreshedCurrentRunDirsIncludingPausedNoAnalysis;
			currentRunCoverageRoots = currentRunDirs;
			observedTriageRunDirs = uniquePathList( [
				...HISTORICAL_OBSERVED_RUN_DIRS,
				...CURRENT_RUN_DIRS,
				...currentRunDirsIncludingPausedNoAnalysis,
			] );
			coverageFiles = uniquePathList( [
				...coverageFiles,
				...( await findCoverageFiles(
					uniquePathList( [
						...currentRunDirs,
						...currentRunDirsIncludingPausedNoAnalysis,
					] )
				) ),
			] ).sort();
			currentCoverageFiles = coverageFiles.filter( ( filePath ) =>
				isCoverageFileInRunDirs( filePath, currentRunDirs )
			);
			currentSummaryFiles = await findSummaryFiles( currentRunDirs );
			triageYieldCurrent = await summarizeTriageYield( currentRunDirs );
			triageYieldCurrentIncludingPausedNoAnalysis =
				await summarizeTriageYield(
					currentRunDirsIncludingPausedNoAnalysis
				);
			triageYieldHistorical = await summarizeTriageYield(
				HISTORICAL_OBSERVED_RUN_DIRS
			);
			triageYieldCombined = await summarizeTriageYield(
				observedTriageRunDirs
			);
			state.triageYield = triageYieldCurrent;
			state.triageYieldCurrent = triageYieldCurrent;
			state.triageYieldCurrentIncludingPausedNoAnalysis =
				triageYieldCurrentIncludingPausedNoAnalysis;
			state.triageYieldHistorical = triageYieldHistorical;
			state.triageYieldCombined = triageYieldCombined;
			state.currentRunDirs = currentRunDirs;
			state.currentRunDirsIncludingPausedNoAnalysis =
				currentRunDirsIncludingPausedNoAnalysis;
			state.currentRunDirSource =
				getCurrentRunDirSource( supervisorState );
			await ensureCurrentRunCounters(
				currentCoverageFiles,
				currentSummaryFiles
			);
			evaluateHealth(
				await readJsonFile( GROUPS_PATH ),
				coverageFiles,
				triageYieldCurrent,
				supervisorState
			);
			updateCoverageQualityIssues( guidance, triageYieldCurrent );
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'refresh-current-run-scope-after-policy',
				reason: `active current-run dirs changed after policy actions; refreshed status from ${ currentRunDirs.length } active dir(s) and ${ currentRunDirsIncludingPausedNoAnalysis.length } drain dir(s) before writing novelty status`,
			} );
		}
	}
	const finalCurrentCoverageFiles = await findCoverageFiles( currentRunDirs );
	const finalCurrentSummaryFiles = await findSummaryFiles( currentRunDirs );
	const currentCoverageInputsChanged =
		getPathListKey( finalCurrentCoverageFiles ) !==
			getPathListKey( currentCoverageFiles ) ||
		getPathListKey( finalCurrentSummaryFiles ) !==
			getPathListKey( currentSummaryFiles );
	if ( currentCoverageInputsChanged ) {
		coverageFiles = uniquePathList( [
			...coverageFiles,
			...finalCurrentCoverageFiles,
		] ).sort();
		currentCoverageFiles = coverageFiles.filter( ( filePath ) =>
			isCoverageFileInRunDirs( filePath, currentRunDirs )
		);
		currentSummaryFiles = finalCurrentSummaryFiles;
		await ensureCurrentRunCounters(
			currentCoverageFiles,
			currentSummaryFiles
		);
		evaluateHealth(
			await readJsonFile( GROUPS_PATH ),
			coverageFiles,
			triageYieldCurrent,
			supervisorState
		);
		updateCoverageQualityIssues( guidance, triageYieldCurrent );
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'refresh-current-coverage-after-policy',
			reason: `current-run coverage files changed after policy actions; refreshed health from ${ currentCoverageFiles.length } behavioral file(s) and ${ currentSummaryFiles.length } summary file(s) before writing novelty status`,
		} );
	}
	if ( ! shutdownRequested ) {
		await maybeLaunchCoverageCodex( guidance );
	} else {
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'write-shutdown-status-after-policy',
			reason: 'shutdown requested after policy actions; skipped supervisor/codex launches and wrote refreshed novelty state before exit',
		} );
	}
	await writeStatus(
		novelty,
		resources,
		coverageFiles,
		stats,
		summaryStats,
		triageYieldCurrent,
		triageYieldHistorical,
		triageYieldCombined,
		guidance
	);
	if ( lastFullStatusCompletedAt ) {
		state.lastCompletedFullPassAt = lastFullStatusCompletedAt;
		state.lastCompletedFullPassStats = {
			at: lastFullStatusCompletedAt,
			outputDir: OUTPUT_DIR,
			coverageFiles: coverageFiles.length,
			currentRunCoverageFiles: currentCoverageFiles.length,
			recordsProcessed: novelty.processed,
			totalRecordsSeen: state.recordsSeen ?? 0,
			filesRead: stats.filesRead,
			coverageLinesSeen: stats.linesSeen,
			summaryFilesRead: summaryStats.filesRead,
			summaryLinesSeen: summaryStats.linesSeen,
			summaryStartupFailures: summaryStats.startupFailures,
			unmetCoverageGoals: guidance.unmetGoals.length,
			healthWarnings: state.healthWarnings.length,
		};
		state.lastUpdatedAt = lastFullStatusCompletedAt;
	} else {
		state.lastUpdatedAt = new Date().toISOString();
	}
	await writeJsonFileAtomic( STATE_PATH, state );
	await log(
		`pass: processed=${ novelty.processed } files=${
			coverageFiles.length
		} recordsSeen=${ state.recordsSeen ?? 0 } newFeatures=${
			novelty.newFeatureKeys
		} newCdp=${ novelty.newCoverageHashes } unmetCoverage=${
			guidance.unmetGoals.length
		} noProgress=${ guidance.noProgressPasses } autoGoals=${
			state.autoCoverageGoals?.length ?? 0
		} autoAdded=${
			guidance.autoExpansion?.addedGoals?.length ?? 0
		} qualityIssues=${
			guidance.qualityIssues?.length ?? 0
		} qualityPasses=${ guidance.qualityIssuePasses ?? 0 } warnings=${
			state.healthWarnings.length
		} summaryStartupFailures=${ summaryStats.startupFailures } headroom=${
			resources.hasHeadroom
		} likelyReal=${
			triageYieldCurrent.likelyRealVisible
		} duplicateShareCurrent=${
			triageYieldCurrent.topDuplicateFamilyShare
		} duplicateShareHistorical=${
			triageYieldHistorical.topDuplicateFamilyShare
		} memory=${ formatMemoryHeadroomSummary( resources ) }`
	);
}

function sleep( ms ) {
	return new Promise( ( resolve ) => setTimeout( resolve, ms ) );
}

function exitCodeForSignal( signal ) {
	const signalNumbers = {
		SIGHUP: 1,
		SIGINT: 2,
		SIGTERM: 15,
	};
	return 128 + ( signalNumbers[ signal ] ?? 0 );
}

let fatalExitInProgress = false;
let shutdownRequested = false;

async function logFatalAndExit( message, exitCode ) {
	if ( fatalExitInProgress ) {
		return;
	}
	fatalExitInProgress = true;
	try {
		await log( message );
	} catch ( logError ) {
		process.stderr.write(
			`failed to write fatal monitor log: ${
				logError.stack ?? logError.message
			}\n${ message }\n`
		);
	}
	process.exit( exitCode );
}

async function main() {
	await log(
		`RTC novelty monitor started, outputDir=${ OUTPUT_DIR }, observed=${ OBSERVED_RUN_DIRS.join(
			','
		) }`
	);
	await writeStartupStatus();
	const statusHeartbeat = setInterval( () => {
		void writeStatusHeartbeat().catch( ( error ) => {
			void log(
				`status heartbeat failed: ${ error.stack ?? error.message }`
			).catch( () => {} );
		} );
	}, STARTUP_STATUS_HEARTBEAT_MS );
	statusHeartbeat.unref?.();
	try {
		while ( ! shutdownRequested && Date.now() < END_AT ) {
			try {
				await runPass();
			} catch ( error ) {
				await log( `pass failed: ${ error.stack ?? error.message }` );
			}
			await sleep( INTERVAL_MS );
		}
	} finally {
		clearInterval( statusHeartbeat );
	}
	if ( shutdownRequested ) {
		await log( 'RTC novelty monitor exiting after signal shutdown.' );
	} else {
		await log( 'RTC novelty monitor exiting after requested duration.' );
	}
}

process.on( 'uncaughtException', ( error ) => {
	void logFatalAndExit(
		`uncaught exception: ${ error.stack ?? error.message }`,
		1
	);
} );

process.on( 'unhandledRejection', ( reason ) => {
	const message =
		reason instanceof Error
			? reason.stack ?? reason.message
			: String( reason );
	void logFatalAndExit( `unhandled rejection: ${ message }`, 1 );
} );

for ( const signal of [ 'SIGHUP', 'SIGINT', 'SIGTERM' ] ) {
	process.once( signal, () => {
		shutdownRequested = true;
		process.exitCode = exitCodeForSignal( signal );
		void log( `RTC novelty monitor received ${ signal }; exiting.` );
	} );
}

main().catch( async ( error ) => {
	await log( error.stack ?? error.message );
	process.exitCode = 1;
} );
