#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs/promises';
import { readFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';

const CONTROL_REPO_ROOT = path.resolve(
	path.dirname( fileURLToPath( import.meta.url ) ),
	'..'
);
const REPO_ROOT = path.resolve(
	process.env.RTC_FUZZ_NOVELTY_REPO_ROOT ?? CONTROL_REPO_ROOT
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
const PROCESS_LOCK_PATH = path.join(
	OUTPUT_DIR,
	'.novelty-monitor-process.json'
);
const STATUS_PATH = path.join( OUTPUT_DIR, 'novelty-status.md' );
const LOG_PATH = path.join( OUTPUT_DIR, 'novelty-monitor.log' );
const BENCHMARK_CANARY_COVERAGE_STATUS_PATH = path.join(
	OUTPUT_DIR,
	'benchmark-canary-coverage-status.tsv'
);
const BENCHMARK_CANARY_COVERAGE_FLOOR_PATH = path.join(
	OUTPUT_DIR,
	'benchmark-canary-coverage-floor.tsv'
);
const CURRENT_OUTPUT_POINTER_PATH =
	process.env.RTC_FUZZ_NOVELTY_CURRENT_OUTPUT_POINTER ??
	path.join( path.dirname( OUTPUT_DIR ), 'current-output-dir.txt' );
const ENFORCE_CURRENT_OUTPUT_POINTER =
	process.env.RTC_FUZZ_NOVELTY_CURRENT_OUTPUT_POINTER !== undefined;
const BENCHMARK_CANARY_FEEDBACK_BASE =
	process.env.RTC_FUZZ_BENCHMARK_CANARY_FEEDBACK_BASE ??
	process.env.RTC_BENCHMARK_CANARY_FEEDBACK_BASE ??
	'/media/volume/danluu-fuzz-data/rtc-benchmark-canary-feedback-20260520';
const BENCHMARK_CANARY_FEEDBACK_TSV_PATH =
	process.env.RTC_FUZZ_BENCHMARK_CANARY_FEEDBACK_TSV ??
	path.join( BENCHMARK_CANARY_FEEDBACK_BASE, 'current-feedback.tsv' );
const BENCHMARK_CANARY_FEEDBACK_MD_PATH = path.join(
	path.dirname( BENCHMARK_CANARY_FEEDBACK_TSV_PATH ),
	'current-feedback.md'
);
const BENCHMARK_CANARY_FEEDBACK_UNION_OVERRIDE_TSV_PATHS = [
	process.env.RTC_FUZZ_BENCHMARK_CANARY_FEEDBACK_UNION_OVERRIDE_TSV,
	path.join(
		BENCHMARK_CANARY_FEEDBACK_BASE,
		'benchmark-feedback-union-override.tsv'
	),
	path.join( OUTPUT_DIR, 'control', 'benchmark-feedback-union-override.tsv' ),
].filter( Boolean );
const BENCHMARK_CANARY_FEEDBACK_SOURCE_OVERRIDE_TSV_PATHS = [
	process.env.RTC_FUZZ_BENCHMARK_CANARY_FEEDBACK_SOURCE_OVERRIDE_TSV,
	path.join(
		BENCHMARK_CANARY_FEEDBACK_BASE,
		'benchmark-feedback-source-override.tsv'
	),
	path.join(
		OUTPUT_DIR,
		'control',
		'benchmark-feedback-source-override.tsv'
	),
].filter( Boolean );
const NO_ANALYSIS_SENTINEL_RELATIVE_PATH = path.join(
	'.triage-watcher',
	'no-analysis.json'
);
const SUPERVISOR_SESSION =
	process.env.RTC_FUZZ_NOVELTY_SUPERVISOR_SESSION ??
	'rtc-fuzz-novelty-supervisor-20260502';
const ALLOW_DISABLED_POLICY_GUARDS =
	process.env.RTC_FUZZ_NOVELTY_ALLOW_DISABLED_POLICY_GUARDS === '1';
const FORCE_COVERAGE_GUIDED_POLICY_GUARDS =
	! ALLOW_DISABLED_POLICY_GUARDS &&
	SUPERVISOR_SESSION === 'rtc-coverage-guided-supervisor';
const INTERVAL_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_INTERVAL_MS',
	5 * 60 * 1000
);
const STARTUP_STATUS_HEARTBEAT_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_STARTUP_STATUS_HEARTBEAT_MS',
	60 * 1000
);
const STATE_CHANGE_HISTORY_LIMIT = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_STATE_CHANGE_HISTORY_LIMIT',
	5000
);
const STATE_JSON_SOFT_MAX_BYTES = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_STATE_JSON_SOFT_MAX_BYTES',
	64 * 1024 * 1024
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
const REPOS_BASE = process.env.RTC_FUZZ_NOVELTY_REPOS_BASE ?? '';
const WP_ENV_HOME_BASE = process.env.RTC_FUZZ_NOVELTY_WP_ENV_HOME_BASE ?? '';
const END_AT = Date.now() + DURATION_HOURS * 60 * 60 * 1000;
const CURRENT_RUN_DIRS = [ OUTPUT_DIR ];
let currentRunCoverageRoots = CURRENT_RUN_DIRS;
const CURRENT_REPO_HEAD_COMMIT = getGitOutput( [ 'rev-parse', 'HEAD' ] );
const INCLUDE_EXTERNAL_IMPORTS =
	process.env.RTC_FUZZ_NOVELTY_INCLUDE_EXTERNAL_IMPORTS === '1';
const ARTIFACT_SCAN_IGNORED_DIRS = new Set( [
	'.git',
	'.triage-watcher',
	'blob-report',
	'codex-analysis',
	'node_modules',
	'playwright-report',
	'repos',
	'test-results',
	'vendor',
] );
const ACTIVE_GROUP_STATUSES = new Set( [
	'launching',
	'recovering',
	'running',
] );
const PLAIN_EDITOR_PRODUCT_SMOKE_GROUP =
	'novelty-http-plain-editor-product-smoke';
const REAL_WORLD_EDITOR_USABILITY_GROUP =
	'novelty-http-real-world-editor-usability';
const REQUIRED_FIRST_GREEN_PRODUCT_GROUPS = new Set( [
	PLAIN_EDITOR_PRODUCT_SMOKE_GROUP,
	REAL_WORLD_EDITOR_USABILITY_GROUP,
] );
const RTC_REFERENCE_ORACLE_GROUP = 'novelty-http-rtc-reference-oracle';
const MEDIA_CROSS_ENTITY_COMPLETION_GROUP =
	'novelty-ws-media-cross-entity-completion';
const MULTI_RELOAD_LIFECYCLE_COMPLETION_GROUP =
	'novelty-ws-multi-reload-lifecycle-completion';
const TABLE_STALE_SNAPSHOT_COMPLETION_GROUP =
	'novelty-http-table-stale-snapshot-completion';
const THIRTY_USER_LIFECYCLE_COMPLETION_GROUP =
	'novelty-ws-thirty-user-lifecycle-completion';
const BENCHMARK_CANARY_GROUP_BY_CASE = {
	'collaboration-code-editor-performance-ws':
		'novelty-ws-parser-serialization',
	'large-post-three-user-http': 'novelty-http-large-post-lifecycle',
	'list-item-move-refresh-http': 'novelty-ws-multi-reload-lifecycle',
	'persistence-reload-http': 'novelty-http-existing-post-crdt-metadata',
	'plain-editor-product-smoke-http': PLAIN_EDITOR_PRODUCT_SMOKE_GROUP,
	'real-world-editor-usability-http': REAL_WORLD_EDITOR_USABILITY_GROUP,
	'same-user-stale-content-http': 'novelty-http-same-user-stale-draft',
	'same-user-stale-content-overwrite-http':
		'novelty-http-same-user-stale-draft',
	'self-presence-ui-signal-http': 'novelty-ws-collaboration-ui-signals',
	'table-stale-snapshot-http': 'novelty-http-table-stale-snapshot',
	'title-reload-http': 'novelty-http-title-reload-convergence',
};
const BENCHMARK_CANARY_ADDITIONAL_GROUPS_BY_CASE = {
	'large-post-three-user-http': [
		'novelty-http-large-post-lifecycle-completion',
	],
};
const DEADLINE_P0_BENCHMARK_CANARY_GROUPS = [
	PLAIN_EDITOR_PRODUCT_SMOKE_GROUP,
	REAL_WORLD_EDITOR_USABILITY_GROUP,
	'novelty-http-large-post-lifecycle',
	'novelty-http-same-user-stale-draft',
	'novelty-http-table-stale-snapshot',
	'novelty-http-existing-post-crdt-metadata',
	'novelty-ws-collaboration-ui-signals',
];
const DEADLINE_PRIMARY_HTTP_BENCHMARK_CANARY_GROUPS = [
	PLAIN_EDITOR_PRODUCT_SMOKE_GROUP,
	REAL_WORLD_EDITOR_USABILITY_GROUP,
	'novelty-http-large-post-lifecycle',
	'novelty-http-title-reload-convergence',
	'novelty-http-same-user-stale-draft',
	'novelty-http-table-stale-snapshot',
	'novelty-http-existing-post-crdt-metadata',
];
const DEADLINE_BENCHMARK_CANARY_MIN_ENABLED_GROUPS = 5;
const DEADLINE_FINALIZATION_BENCHMARK_CANARY_GROUPS = [
	PLAIN_EDITOR_PRODUCT_SMOKE_GROUP,
	REAL_WORLD_EDITOR_USABILITY_GROUP,
	'novelty-http-large-post-lifecycle',
	'novelty-http-persistence-probe',
	'novelty-ws-parser-serialization',
	'novelty-ws-multi-reload-lifecycle',
	'novelty-ws-collaboration-ui-signals',
];
const DEADLINE_FINALIZATION_BENCHMARK_CANARY_GROUP_SET = new Set(
	DEADLINE_FINALIZATION_BENCHMARK_CANARY_GROUPS
);
const BENCHMARK_CANARY_PRIORITY_ORDER = uniqueStringList( [
	...DEADLINE_PRIMARY_HTTP_BENCHMARK_CANARY_GROUPS,
	...DEADLINE_FINALIZATION_BENCHMARK_CANARY_GROUPS,
	'novelty-http-large-post-lifecycle-completion',
	TABLE_STALE_SNAPSHOT_COMPLETION_GROUP,
	'novelty-ws-many-user-lifecycle',
	'novelty-ws-many-user-lifecycle-completion',
	'novelty-ws-real-user-rich-text',
	'novelty-ws-revision-recovery',
	'novelty-ws-revision-persistence',
	'novelty-ws-same-user-lifecycle',
	'novelty-ws-same-user-separate-context-lifecycle',
	'novelty-ws-same-user-stale-tabs',
	'novelty-ws-thirty-user-lifecycle',
	THIRTY_USER_LIFECYCLE_COMPLETION_GROUP,
	'novelty-ws-parser-transform',
	'novelty-ws-block-gauntlet',
] );
const BENCHMARK_CANARY_PRIORITY_INDEX = new Map(
	BENCHMARK_CANARY_PRIORITY_ORDER.map( ( group, index ) => [ group, index ] )
);
const DEADLINE_P0_BENCHMARK_CANARY_GROUP_SET = new Set(
	DEADLINE_P0_BENCHMARK_CANARY_GROUPS
);
const DEADLINE_PRIMARY_HTTP_BENCHMARK_CANARY_GROUP_SET = new Set(
	DEADLINE_PRIMARY_HTTP_BENCHMARK_CANARY_GROUPS
);
const DEADLINE_PRIMARY_WS_BENCHMARK_CANARY_GROUPS = [
	'novelty-ws-parser-serialization',
	'novelty-ws-multi-reload-lifecycle',
	'novelty-ws-collaboration-ui-signals',
];
const DEADLINE_DIRECT_CURRENT_RUN_BENCHMARK_CANARY_GROUPS = [
	PLAIN_EDITOR_PRODUCT_SMOKE_GROUP,
	REAL_WORLD_EDITOR_USABILITY_GROUP,
	'novelty-http-persistence-probe',
	'novelty-ws-parser-serialization',
];
const DEADLINE_DIRECT_CURRENT_RUN_BENCHMARK_CANARY_GROUP_SET = new Set(
	DEADLINE_DIRECT_CURRENT_RUN_BENCHMARK_CANARY_GROUPS
);
const DEADLINE_CURRENT_RUN_SLOT_PRIORITY_GROUPS = [
	PLAIN_EDITOR_PRODUCT_SMOKE_GROUP,
	REAL_WORLD_EDITOR_USABILITY_GROUP,
	'novelty-http-large-post-lifecycle',
	'novelty-http-self-presence-ui-signals',
	...DEADLINE_DIRECT_CURRENT_RUN_BENCHMARK_CANARY_GROUPS,
];
const DEADLINE_PROMOTION_BLOCKED_BENCHMARK_CANARY_GROUPS = [
	PLAIN_EDITOR_PRODUCT_SMOKE_GROUP,
	REAL_WORLD_EDITOR_USABILITY_GROUP,
	'novelty-http-large-post-lifecycle',
	'novelty-http-title-reload-convergence',
	'novelty-http-same-user-stale-draft',
	'novelty-http-table-stale-snapshot',
	'novelty-ws-collaboration-ui-signals',
];
const DEADLINE_PROMOTION_BLOCKED_BENCHMARK_CANARY_GROUP_SET = new Set(
	DEADLINE_PROMOTION_BLOCKED_BENCHMARK_CANARY_GROUPS
);
const BENCHMARK_CANARY_DEADLINE_CLOSURE_POLICY_VERSION = 2;
const RTC_OPTIONAL_SETUP_PLUGIN_FIX_VERSION = 1;
const LARGE_HTTP_LIFECYCLE_STARTUP_FIX_VERSION = 4;
const HTTP_PROVIDER_GATING_STARTUP_FIX_VERSION = 2;
const HTTP_PROVIDER_GATING_STARTUP_FIX_GROUPS = [
	'novelty-http-large-post-lifecycle',
	'novelty-http-large-post-lifecycle-completion',
	'novelty-http-table-stale-snapshot',
	TABLE_STALE_SNAPSHOT_COMPLETION_GROUP,
	'novelty-http-title-reload-convergence',
	'novelty-http-existing-post-crdt-metadata',
	'novelty-http-same-user-stale-draft',
];
const COLLABORATION_READINESS_STARTUP_FIX_VERSION = 1;
const COLLABORATION_READINESS_STARTUP_FIX_GROUPS = [
	'novelty-ws-collaboration-ui-signals',
	'novelty-ws-many-user-lifecycle',
	'novelty-ws-many-user-lifecycle-completion',
	'novelty-ws-thirty-user-lifecycle',
	THIRTY_USER_LIFECYCLE_COMPLETION_GROUP,
];
const MANY_USER_JOIN_BATCH_STARTUP_FIX_VERSION = 1;
const MANY_USER_JOIN_BATCH_STARTUP_FIX_GROUPS = [
	'novelty-ws-many-user-lifecycle',
	'novelty-ws-many-user-lifecycle-completion',
	'novelty-ws-thirty-user-lifecycle',
	THIRTY_USER_LIFECYCLE_COMPLETION_GROUP,
];
let benchmarkCanaryFeedbackRows = [];
let benchmarkCanaryFeedbackText = '';
let benchmarkCanaryCoverageStatusRows = [];
let benchmarkCanaryForcedGroups = new Set();
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
const LOW_DISK_MODE = process.env.RTC_FUZZ_LOW_DISK_MODE === '1';
const DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY =
	process.env.RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY ===
		'1' ||
	( LOW_DISK_MODE &&
		process.env
			.RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY !==
			'0' );
const DEADLINE_BENCHMARK_CANARY_BUDGET_CAP =
	process.env.RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP === '1';
const ALLOW_FLEET_STARTUP_NOISE_CANARY =
	process.env.RTC_FUZZ_NOVELTY_ALLOW_FLEET_STARTUP_NOISE_CANARY === '1';
const ALLOW_SUCCESS_DEFICIT_STARTUP_NOISE_CANARY =
	process.env.RTC_FUZZ_NOVELTY_ALLOW_SUCCESS_DEFICIT_STARTUP_NOISE_CANARY !==
	'0';
const INCLUDE_RECHECK_COVERAGE =
	process.env.RTC_FUZZ_NOVELTY_INCLUDE_RECHECK_COVERAGE === '1';
const ENABLE_HTTP_PROBE =
	process.env.RTC_FUZZ_NOVELTY_ENABLE_HTTP_PROBE !== '0';
const ENABLE_SAME_USER_PROBE =
	process.env.RTC_FUZZ_NOVELTY_ENABLE_SAME_USER === '1';
const SAME_USER_RECORD_TARGET = 150;
const SAME_USER_SEPARATE_CONTEXT_RECORD_TARGET = 100;
const SAME_USER_SUCCESS_TARGET = 25;
const SAME_USER_SEPARATE_CONTEXT_SUCCESS_TARGET = 25;
const REQUESTED_MAX_ENABLED_GROUPS = getNonNegativeIntegerEnv(
	'RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS',
	7
);
const REQUESTED_TARGET_ENABLED_GROUPS = getNonNegativeIntegerEnv(
	'RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS',
	3
);
const COVERAGE_GUIDED_MAX_ENABLED_GROUPS = getNonNegativeIntegerEnv(
	'RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS',
	2
);
const COVERAGE_GUIDED_TARGET_ENABLED_GROUPS = getNonNegativeIntegerEnv(
	'RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS',
	1
);
const COVERAGE_GAP_RESERVED_GROUP_LIMIT = getNonNegativeIntegerEnv(
	'RTC_FUZZ_NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS',
	0
);
const DYNAMIC_COVERAGE_GAP_RESERVED_GROUP_LIMIT = getNonNegativeIntegerEnv(
	'RTC_FUZZ_NOVELTY_DYNAMIC_COVERAGE_GAP_RESERVED_GROUPS',
	6
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
const PRODUCER_BUDGET_DISABLED =
	MAX_ENABLED_GROUPS <= 0 || TARGET_ENABLED_GROUPS <= 0;
const STRICT_PRODUCER_BUDGET_CAP = MAX_ENABLED_GROUPS <= 2;
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
	30000
);
const TRIAGE_GATE_REFRESH_MAX_PARALLEL = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_TRIAGE_GATE_REFRESH_MAX_PARALLEL',
	4
);
const activeGateOnlyTriageChildren = new Set();
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
const COVERAGE_QUALITY_MAX_ENABLED_GROUPS = getNonNegativeIntegerEnv(
	'RTC_FUZZ_NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS',
	8
);
const CURRENT_RUN_COVERAGE_WARMUP_MS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_CURRENT_RUN_COVERAGE_WARMUP_MS',
	10 * 60 * 1000
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
const CURRENT_RUN_DUPLICATE_ACTION_GATE_MIN_CANDIDATES = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_CURRENT_RUN_DUPLICATE_ACTION_GATE_MIN_CANDIDATES',
	3
);
const NO_PRODUCT_KNOWN_NOISE_DOMINANCE_MIN_CANDIDATES = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_NO_PRODUCT_KNOWN_NOISE_DOMINANCE_MIN_CANDIDATES',
	2
);
const NO_PRODUCT_STRICT_STARTUP_MIN_CANDIDATES = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_NO_PRODUCT_STRICT_STARTUP_MIN_CANDIDATES',
	1
);
const PRODUCT_EVIDENCE_DUPLICATE_FAMILY_HOLD_MIN_CANDIDATES =
	getPositiveIntegerEnv(
		'RTC_FUZZ_NOVELTY_PRODUCT_EVIDENCE_DUPLICATE_MIN_CANDIDATES',
		CURRENT_RUN_DUPLICATE_ACTION_GATE_MIN_CANDIDATES
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
const RUN_LOCAL_NOISE_POLICY_VERSION = 40;
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
const REAL_USER_RICH_TEXT_ACTION_LABELS = [
	'ui-paste-paragraph',
	'ui-cut-copy-paragraph',
	'ui-link-paragraph',
	'ui-list-indent',
	'ui-composition-paragraph',
	'ui-toolbar-format-paragraph',
	'ui-table-cell-edit',
];
const REAL_USER_RELOAD_DIVERSITY_GROUP =
	'novelty-ws-real-user-reload-diversity';
const REAL_USER_DUPLICATE_FAMILY_HOLD_GROUPS = [
	'novelty-ws-real-user-coverage-bridge',
	REAL_USER_RELOAD_DIVERSITY_GROUP,
	'novelty-ws-real-user-save-reload',
	'novelty-ws-real-user-editing',
	'novelty-ws-real-user-rich-text',
];
const PRODUCT_EVIDENCE_DUPLICATE_FAMILY_HOLD_GROUPS = [
	...REAL_USER_DUPLICATE_FAMILY_HOLD_GROUPS,
	'novelty-http-persistence-probe',
	'novelty-ws-lifecycle',
	'novelty-ws-same-user-lifecycle',
	'novelty-ws-same-user-separate-context-lifecycle',
	'novelty-ws-same-user-stale-tabs',
	'novelty-ws-three-user-late-join',
	'novelty-ws-multi-reload-lifecycle',
	'novelty-ws-revision-persistence',
	'novelty-ws-revision-recovery',
	'novelty-ws-async-server-blocks',
	'novelty-ws-collaboration-ui-signals',
	'novelty-ws-many-user-lifecycle',
	'novelty-ws-many-user-lifecycle-completion',
	'novelty-ws-thirty-user-lifecycle',
	THIRTY_USER_LIFECYCLE_COMPLETION_GROUP,
	TABLE_STALE_SNAPSHOT_COMPLETION_GROUP,
];
const PRODUCT_EVIDENCE_DUPLICATE_FAMILY_HOLD_FAMILIES = new Set( [
	'late_session_awareness_stall',
	'operation_witness_missing',
	'reload_rejoin_awareness_stall',
	'rest_meta_database_error',
] );
const PRODUCT_EVIDENCE_TIMEOUT_UNKNOWN_FAMILY_HOLDS = new Set( [
	'timeout',
	'unknown',
] );
const GROUP_SCOPED_PRODUCT_EVIDENCE_DUPLICATE_FAMILY_HOLD_FAMILIES = new Map( [
	[
		'novelty-http-persistence-probe',
		PRODUCT_EVIDENCE_TIMEOUT_UNKNOWN_FAMILY_HOLDS,
	],
	[
		'novelty-ws-real-user-save-reload',
		PRODUCT_EVIDENCE_TIMEOUT_UNKNOWN_FAMILY_HOLDS,
	],
	[
		'novelty-ws-real-user-editing',
		PRODUCT_EVIDENCE_TIMEOUT_UNKNOWN_FAMILY_HOLDS,
	],
	[
		'novelty-ws-real-user-rich-text',
		PRODUCT_EVIDENCE_TIMEOUT_UNKNOWN_FAMILY_HOLDS,
	],
	[ 'novelty-ws-async-server-blocks', new Set( [ 'unknown' ] ) ],
	[ 'novelty-ws-collaboration-ui-signals', new Set( [ 'assertion' ] ) ],
	[ 'novelty-ws-many-user-lifecycle', new Set( [ 'assertion' ] ) ],
	[ 'novelty-ws-many-user-lifecycle-completion', new Set( [ 'assertion' ] ) ],
	[ 'novelty-ws-thirty-user-lifecycle', new Set( [ 'assertion' ] ) ],
	[ THIRTY_USER_LIFECYCLE_COMPLETION_GROUP, new Set( [ 'assertion' ] ) ],
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
		'novelty-ws-many-user-lifecycle-completion',
	],
	'assert-selection-cursor': [
		'novelty-ws-collaboration-ui-signals',
		'novelty-ws-many-user-lifecycle',
		'novelty-ws-many-user-lifecycle-completion',
	],
	'edit-formatted-paragraph-at-cursor': [ 'novelty-ws-parser-serialization' ],
	'edit-rich-text-pair-block': [ 'novelty-ws-parser-serialization' ],
	'edit-table-array-attributes': [ 'novelty-ws-lifecycle' ],
	'table-stale-snapshot-html': [
		'novelty-http-table-stale-snapshot',
		TABLE_STALE_SNAPSHOT_COMPLETION_GROUP,
	],
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
		'novelty-ws-real-user-coverage-bridge',
		REAL_USER_RELOAD_DIVERSITY_GROUP,
		'novelty-ws-real-user-save-reload',
		'novelty-ws-real-user-editing',
		'novelty-ws-real-user-rich-text',
	],
	'ui-format-paragraph': [
		'novelty-ws-real-user-coverage-bridge',
		REAL_USER_RELOAD_DIVERSITY_GROUP,
		'novelty-ws-real-user-save-reload',
		'novelty-ws-real-user-editing',
		'novelty-ws-real-user-rich-text',
	],
	'ui-type-title': [
		'novelty-ws-real-user-coverage-bridge',
		REAL_USER_RELOAD_DIVERSITY_GROUP,
		'novelty-ws-real-user-save-reload',
		'novelty-ws-real-user-editing',
		'novelty-ws-real-user-rich-text',
	],
	'ui-undo-redo-paragraph': [
		'novelty-ws-real-user-coverage-bridge',
		REAL_USER_RELOAD_DIVERSITY_GROUP,
		'novelty-ws-real-user-save-reload',
		'novelty-ws-real-user-editing',
		'novelty-ws-real-user-rich-text',
	],
	'ui-heading-shortcut': [
		'novelty-ws-real-user-coverage-bridge',
		REAL_USER_RELOAD_DIVERSITY_GROUP,
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
		REAL_USER_RELOAD_DIVERSITY_GROUP,
		'novelty-ws-real-user-save-reload',
		'novelty-ws-real-user-editing',
		'novelty-ws-real-user-rich-text',
	],
	'insert-async-server-block': [ 'novelty-ws-async-server-blocks' ],
	'insert-media-cross-entity-block': [
		'novelty-ws-media-cross-entity',
		MEDIA_CROSS_ENTITY_COMPLETION_GROUP,
	],
};
const REQUIRED_ACTION_LABELS = Object.keys( ACTION_COVERAGE_GROUPS );
const EXPANSION_POLICY_VERSION = 25;

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
	[ MULTI_RELOAD_LIFECYCLE_COMPLETION_GROUP ]: 'multi-reload-lifecycle',
	'novelty-ws-parser-serialization': 'parser-serialization',
	'novelty-ws-parser-transform': 'parser-transform',
	'novelty-http-persistence-probe': 'persistence-no-title',
	'novelty-ws-persistence-no-title': 'persistence-no-title',
	'novelty-ws-permissions-auth-locks': 'permissions-auth-locks',
	'novelty-ws-real-user-coverage-bridge': 'real-user-editing',
	[ REAL_USER_RELOAD_DIVERSITY_GROUP ]: 'real-user-editing',
	'novelty-ws-real-user-action-ratchet': 'real-user-editing',
	'novelty-ws-real-user-title-body-save-reload': 'real-user-editing',
	'novelty-ws-real-user-save-reload': 'real-user-editing',
	'novelty-ws-real-user-editing': 'real-user-editing',
	'novelty-ws-real-user-rich-text': 'real-user-editing',
	'novelty-ws-revision-persistence': 'revision-persistence',
	'novelty-ws-revision-recovery': 'revision-persistence',
	'novelty-ws-same-user-stale-tabs': 'session-lifecycle',
	'novelty-ws-same-user-lifecycle': 'session-lifecycle',
	'novelty-ws-same-user-separate-context-lifecycle': 'session-lifecycle',
	'novelty-http-same-user-stale-draft': 'session-lifecycle',
	'novelty-ws-async-server-blocks': 'async-server-blocks',
	'novelty-ws-media-cross-entity': 'media-cross-entity',
	[ MEDIA_CROSS_ENTITY_COMPLETION_GROUP ]: 'media-cross-entity',
	'novelty-ws-long-session-large-doc': 'long-session-large-doc',
	'novelty-http-large-post-lifecycle': 'large-post-three-user-http-lifecycle',
	'novelty-http-large-post-lifecycle-completion':
		'large-post-three-user-http-lifecycle',
	'novelty-http-table-stale-snapshot': 'table-stale-snapshot-http',
	[ TABLE_STALE_SNAPSHOT_COMPLETION_GROUP ]: 'table-stale-snapshot-http',
	'novelty-http-title-reload-convergence': 'session-lifecycle',
	'novelty-http-existing-post-crdt-metadata': 'persistence-no-title',
	[ PLAIN_EDITOR_PRODUCT_SMOKE_GROUP ]: 'plain-editor-product-smoke',
	[ REAL_WORLD_EDITOR_USABILITY_GROUP ]: 'real-world-editor-usability',
	'novelty-http-rtc-reference-oracle': 'rtc-reference-oracle',
	'novelty-ws-many-user-lifecycle': 'many-user-lifecycle',
	'novelty-ws-many-user-lifecycle-completion': 'many-user-lifecycle',
	'novelty-ws-thirty-user-lifecycle': 'many-user-lifecycle',
	[ THIRTY_USER_LIFECYCLE_COMPLETION_GROUP ]: 'many-user-lifecycle',
	'novelty-ws-collaboration-ui-signals': 'collaboration-ui-signals',
	'novelty-ws-structure': 'structure',
	'novelty-ws-three-user-late-join': 'three-user-late-join',
	'novelty-ws-block-gauntlet-details-topoff': 'block-gauntlet',
};

const ZERO_RECORD_PROFILE_REPAIR_ORDER = [
	'real-user-editing',
	'many-user-lifecycle',
];

const ZERO_RECORD_PROFILE_REPAIR_GROUPS = {
	'real-user-editing': [ 'novelty-ws-real-user-rich-text' ],
	'many-user-lifecycle': [
		'novelty-ws-many-user-lifecycle-completion',
		THIRTY_USER_LIFECYCLE_COMPLETION_GROUP,
	],
};

const PROFILE_GROUP_NAMES_BY_SPECIFICITY = Object.keys( PROFILE_BY_GROUP ).sort(
	( left, right ) => right.length - left.length || left.localeCompare( right )
);

const POLICY_REQUIRED_BOOTSTRAP_GROUPS = [
	PLAIN_EDITOR_PRODUCT_SMOKE_GROUP,
	REAL_WORLD_EDITOR_USABILITY_GROUP,
	'novelty-ws-same-user-lifecycle',
	'novelty-ws-same-user-separate-context-lifecycle',
	RTC_REFERENCE_ORACLE_GROUP,
].filter( ( group ) => PROFILE_BY_GROUP[ group ] );
const NON_DEFERABLE_POLICY_REQUIRED_BOOTSTRAP_GROUPS = [
	PLAIN_EDITOR_PRODUCT_SMOKE_GROUP,
	REAL_WORLD_EDITOR_USABILITY_GROUP,
	'novelty-ws-same-user-lifecycle',
	'novelty-ws-same-user-separate-context-lifecycle',
].filter( ( group ) => PROFILE_BY_GROUP[ group ] );
const POLICY_REQUIRED_BOOTSTRAP_GROUP_SET = new Set(
	POLICY_REQUIRED_BOOTSTRAP_GROUPS
);

function getActivePolicyRequiredBootstrapGroups() {
	if ( ! shouldDeferPolicyRequiredBootstrapGroupsForBenchmarkCanaryCap() ) {
		return POLICY_REQUIRED_BOOTSTRAP_GROUPS;
	}
	return NON_DEFERABLE_POLICY_REQUIRED_BOOTSTRAP_GROUPS;
}

function getPolicyRequiredGroupCount( groups ) {
	const activePolicyRequiredGroupSet = new Set(
		getActivePolicyRequiredBootstrapGroups()
	);
	return uniqueStringList( groups ?? [] ).filter( ( group ) =>
		activePolicyRequiredGroupSet.has( group )
	).length;
}

function getSupervisorPublicationProtectedGroupCount( groups ) {
	const activePolicyRequiredGroupSet = new Set(
		getActivePolicyRequiredBootstrapGroups()
	);
	return uniqueStringList( groups ?? [] ).filter(
		( group ) =>
			activePolicyRequiredGroupSet.has( group ) ||
			hasCoverageQualityRepairPriority( group ) ||
			hasManyUserSuccessDeficit( group ) ||
			hasSameUserSuccessDeficit( group ) ||
			hasZeroRecordHealthWarningRepairGroup( group )
	).length;
}

function hasCoverageQualityRepairPriority( group ) {
	return getCoverageQualityRepairPriorityGroups().includes( group );
}

function hasCoverageGapPublicationPriority( group ) {
	return (
		hasCoverageQualityRepairPriority( group ) ||
		hasZeroRecordHealthWarningRepairGroup( group ) ||
		hasManyUserSuccessDeficit( group ) ||
		hasSameUserSuccessDeficit( group ) ||
		( state.coverageGuidance?.unmetGoals ?? [] ).some(
			( goal ) => goal.met !== true && goal.groups?.includes( group )
		)
	);
}

function getCoverageGoalDeficitRatio( goal ) {
	const target = Number( goal?.target );
	if ( ! Number.isFinite( target ) || target <= 0 ) {
		return 0;
	}
	const count = Number( goal?.count ?? 0 );
	return (
		Math.max( 0, target - ( Number.isFinite( count ) ? count : 0 ) ) /
		target
	);
}

function getCoverageGoalPublicationWeight( goal ) {
	const id = String( goal?.id ?? '' );
	if ( id.includes( ':action:' ) || id.startsWith( 'action:' ) ) {
		return 4;
	}
	if ( id.includes( 'real-user-template:' ) ) {
		return 3;
	}
	if (
		id.includes( 'success-users:' ) ||
		id.includes( 'success-action-users:' )
	) {
		return 2;
	}
	return 1;
}

function getDeficitRankedCoverageGapGroups() {
	const groupScores = new Map();
	for ( const goal of state.coverageGuidance?.unmetGoals ?? [] ) {
		if ( goal.met === true ) {
			continue;
		}
		const score =
			getCoverageGoalDeficitRatio( goal ) *
			getCoverageGoalPublicationWeight( goal );
		for ( const group of goal.groups ?? [] ) {
			if (
				! PROFILE_BY_GROUP[ group ] ||
				state.disabledGroups?.[ group ]
			) {
				continue;
			}
			const currentScore = groupScores.get( group ) ?? 0;
			groupScores.set( group, Math.max( currentScore, score ) );
		}
	}
	return [ ...groupScores.entries() ]
		.sort( ( left, right ) => right[ 1 ] - left[ 1 ] )
		.map( ( [ group ] ) => group );
}

function hasActionableZeroCoverageGuidanceGap() {
	return ( state.coverageGuidance?.unmetGoals ?? [] ).some(
		( goal ) =>
			goal.met !== true &&
			( goal.groups ?? [] ).some(
				( group ) =>
					PROFILE_BY_GROUP[ group ] &&
					! state.disabledGroups?.[ group ]
			)
	);
}

function hasStalledCoverageGuidanceWithoutQualityIssue() {
	const guidance = state.coverageGuidance;
	return (
		( guidance?.noProgressPasses ?? 0 ) >= COVERAGE_GUIDANCE_STALL_PASSES &&
		( guidance?.qualityIssues?.length ?? 0 ) === 0 &&
		( guidance?.qualityIssuePasses ?? 0 ) < COVERAGE_QUALITY_ISSUE_PASSES
	);
}

function getUnmetCoverageGuidanceGoalsForGroup( group ) {
	return ( state.coverageGuidance?.unmetGoals ?? [] ).filter(
		( goal ) => goal.met !== true && ( goal.groups ?? [] ).includes( group )
	);
}

function hasStalledCoverageGuidanceGapForGroup( group ) {
	return (
		hasStalledCoverageGuidanceWithoutQualityIssue() &&
		PROFILE_BY_GROUP[ group ] &&
		! state.disabledGroups?.[ group ] &&
		( state.coverageGuidance?.recommendedGroups ?? [] ).includes( group ) &&
		getUnmetCoverageGuidanceGoalsForGroup( group ).length > 0
	);
}

function getStalledRecommendedCoverageGapGroups() {
	if ( ! hasStalledCoverageGuidanceWithoutQualityIssue() ) {
		return [];
	}
	const recommendedGroups = state.coverageGuidance?.recommendedGroups ?? [];
	const unmetGoalGroups = ( state.coverageGuidance?.unmetGoals ?? [] )
		.filter( ( goal ) => goal.met !== true )
		.flatMap( ( goal ) => goal.groups ?? [] );
	return uniqueStringList( [
		...recommendedGroups,
		...unmetGoalGroups,
	] ).filter( hasStalledCoverageGuidanceGapForGroup );
}

function hasStalledCoverageGuidanceGap() {
	return getStalledRecommendedCoverageGapGroups().length > 0;
}

function getStalledCoverageGuidanceBypassGroup() {
	const deficitRankedGroups = getDeficitRankedCoverageGapGroups();
	const deficitRank = new Map(
		deficitRankedGroups.map( ( group, index ) => [ group, index ] )
	);
	return uniqueStringList( [
		...deficitRankedGroups,
		...getStalledRecommendedCoverageGapGroups(),
	] )
		.filter( hasStalledCoverageGuidanceGapForGroup )
		.map( ( group ) => {
			const pause = getActiveNoisePauseCooldown( group );
			return {
				group,
				pause,
				deficitRank:
					deficitRank.get( group ) ?? Number.MAX_SAFE_INTEGER,
			};
		} )
		.filter(
			( candidate ) =>
				! isNoProductStartupNoiseCooldown( candidate.pause ) &&
				( ! ( state.enabledGroups ?? [] ).includes( candidate.group ) ||
					!! candidate.pause )
		)
		.sort( ( left, right ) => {
			const leftHasProductDuplicate =
				isProductEvidenceDuplicateProducerHold(
					left.pause,
					left.group
				) && hasProductEvidenceDuplicatePauseEvidence( left.pause );
			const rightHasProductDuplicate =
				isProductEvidenceDuplicateProducerHold(
					right.pause,
					right.group
				) && hasProductEvidenceDuplicatePauseEvidence( right.pause );
			if ( leftHasProductDuplicate !== rightHasProductDuplicate ) {
				return leftHasProductDuplicate ? -1 : 1;
			}
			return left.deficitRank - right.deficitRank;
		} )[ 0 ]?.group;
}

function isPrimaryStalledRecommendedCoverageGapGroup( group ) {
	return getStalledCoverageGuidanceBypassGroup() === group;
}

function getStalledCoverageGuidanceGapReason( group ) {
	const goals = getUnmetCoverageGuidanceGoalsForGroup( group )
		.slice( 0, 3 )
		.map( ( goal ) => `${ goal.id }=${ goal.count }/${ goal.target }` )
		.join( ', ' );
	return `coverage guidance has stalled for ${
		state.coverageGuidance?.noProgressPasses ?? 0
	} pass(es) with no active quality issue; reserve one recommended producer for stalled gap(s): ${ goals }`;
}

function shouldBypassProductEvidenceDuplicateHoldForStalledCoverageGap(
	group,
	hold
) {
	return (
		isPrimaryStalledRecommendedCoverageGapGroup( group ) &&
		isProductEvidenceDuplicateProducerHold( hold, group ) &&
		hasProductEvidenceDuplicatePauseEvidence( hold )
	);
}

function getEffectiveCoverageGapReservedGroupLimit() {
	let configuredLimit = 0;
	if ( COVERAGE_GAP_RESERVED_GROUP_LIMIT > 0 ) {
		configuredLimit = COVERAGE_GAP_RESERVED_GROUP_LIMIT;
	} else if ( hasActionableZeroCoverageGuidanceGap() ) {
		configuredLimit = 1;
	} else if ( hasStalledCoverageGuidanceGap() ) {
		configuredLimit = 1;
	}
	return Math.max(
		configuredLimit,
		getDynamicCoverageGapReservedGroupLimit()
	);
}

function getDynamicCoverageGapReservedGroupLimit() {
	if (
		! isDeadlineBenchmarkCanaryBudgetCapActive() ||
		DYNAMIC_COVERAGE_GAP_RESERVED_GROUP_LIMIT <= 0
	) {
		return 0;
	}

	const zeroCoverageGoalGroups = ( state.coverageGuidance?.unmetGoals ?? [] )
		.filter( ( goal ) => goal.met !== true && ( goal.count ?? 0 ) === 0 )
		.flatMap( ( goal ) => goal.groups ?? [] );
	const harnessWorkGroups = ( state.coverageGuidance?.harnessWork ?? [] )
		.filter( ( goal ) => goal.met !== true )
		.flatMap( ( goal ) => goal.groups ?? [] );
	const candidateGroups = uniqueStringList( [
		...getCoverageQualityRepairPriorityGroups(),
		...harnessWorkGroups,
		...getDeficitRankedCoverageGapGroups(),
		...getBootstrapSuccessDeficitGroups(),
		...zeroCoverageGoalGroups,
	] ).filter(
		( group ) =>
			PROFILE_BY_GROUP[ group ] &&
			! state.disabledGroups?.[ group ] &&
			hasCoverageGapPublicationPriority( group )
	);

	return Math.min(
		DYNAMIC_COVERAGE_GAP_RESERVED_GROUP_LIMIT,
		candidateGroups.length
	);
}

function getCoverageGapReservedGroups( groups ) {
	const coverageGapReservedGroupLimit =
		getEffectiveCoverageGapReservedGroupLimit();
	if ( coverageGapReservedGroupLimit <= 0 ) {
		return [];
	}
	const eligibleGroups = new Set( uniqueStringList( groups ?? [] ) );
	const prioritizedCandidates = getCoverageGapPublicationCandidateGroups();
	const prioritizedReservedGroups = prioritizedCandidates.filter(
		( group ) =>
			eligibleGroups.has( group ) &&
			PROFILE_BY_GROUP[ group ] &&
			hasCoverageGapPublicationPriority( group )
	);
	const fallbackReservedGroups = uniqueStringList( groups ?? [] ).filter(
		( group ) =>
			! prioritizedReservedGroups.includes( group ) &&
			PROFILE_BY_GROUP[ group ] &&
			hasCoverageGapPublicationPriority( group )
	);
	return uniqueStringList( [
		...prioritizedReservedGroups,
		...fallbackReservedGroups,
	] ).slice( 0, coverageGapReservedGroupLimit );
}

function getCoverageGapPublicationCandidateGroups() {
	const coverageGapReservedGroupLimit =
		getEffectiveCoverageGapReservedGroupLimit();
	if ( coverageGapReservedGroupLimit <= 0 ) {
		return [];
	}
	const coverageGapCandidateLimit = Math.min(
		10,
		coverageGapReservedGroupLimit + 8
	);
	const harnessWorkGroups = ( state.coverageGuidance?.harnessWork ?? [] )
		.filter( ( goal ) => ! goal.met )
		.flatMap( ( goal ) => goal.groups ?? [] );
	const recommendedGroups = state.coverageGuidance?.recommendedGroups ?? [];
	const unmetGoalGroups = ( state.coverageGuidance?.unmetGoals ?? [] )
		.filter( ( goal ) => goal.met !== true )
		.flatMap( ( goal ) => goal.groups ?? [] );
	return uniqueStringList( [
		...getCoverageQualityRepairPriorityGroups(),
		...harnessWorkGroups,
		...getDeficitRankedCoverageGapGroups(),
		...recommendedGroups,
		...getBootstrapSuccessDeficitGroups(),
		...ZERO_COVERAGE_PRIORITY_GROUPS,
		...SUCCESS_DEFICIT_BOOTSTRAP_GROUPS,
		...unmetGoalGroups,
	] )
		.filter(
			( group ) =>
				PROFILE_BY_GROUP[ group ] &&
				! state.disabledGroups?.[ group ] &&
				hasCoverageGapPublicationPriority( group )
		)
		.slice( 0, coverageGapCandidateLimit );
}

function getCoverageGapReservedPublicationLimit( groups ) {
	const uniqueGroups = uniqueStringList( groups ?? [] );
	const reservedGroups = getCoverageGapReservedGroups( uniqueGroups );
	if ( reservedGroups.length === 0 ) {
		return 0;
	}
	return (
		Math.max(
			...reservedGroups.map( ( group ) => uniqueGroups.indexOf( group ) )
		) + 1
	);
}

function shouldDeferPolicyRequiredBootstrapGroupsForBenchmarkCanaryCap() {
	if ( ! isDeadlineBenchmarkCanaryBudgetCapActive() ) {
		return false;
	}
	const openCanaryGroups = getAuthoritativeOpenBenchmarkCanaryFloorGroups();
	return (
		openCanaryGroups.length > 0 &&
		openCanaryGroups.length >= getBenchmarkCanarySchedulingLimit()
	);
}

function getPolicyProtectedSupervisorGroupLimit( baseLimit, groups ) {
	const normalizedBaseLimit = Number.isFinite( baseLimit )
		? Math.max( 0, baseLimit )
		: 0;
	const groupCount = uniqueStringList( groups ?? [] ).length;
	const openCanaryFloorGroups = isDeadlineBenchmarkCanaryBudgetCapActive()
		? getAuthoritativeOpenBenchmarkCanaryFloorGroups()
		: [];
	const exactStackCanaryCapFilled =
		normalizedBaseLimit > 0 &&
		openCanaryFloorGroups.length >= normalizedBaseLimit;
	const coverageGapReservedGroupCount =
		getCoverageGapReservedGroups( groups ).length;
	if ( STRICT_PRODUCER_BUDGET_CAP ) {
		if ( exactStackCanaryCapFilled ) {
			return Math.min(
				groupCount,
				normalizedBaseLimit + coverageGapReservedGroupCount
			);
		}
		return Math.min(
			groupCount,
			normalizedBaseLimit + coverageGapReservedGroupCount
		);
	}
	const coverageGapReservedPublicationLimit =
		getCoverageGapReservedPublicationLimit( groups );
	if ( exactStackCanaryCapFilled ) {
		return Math.min(
			groupCount,
			Math.max( normalizedBaseLimit, coverageGapReservedPublicationLimit )
		);
	}
	const protectedGroupCount =
		getSupervisorPublicationProtectedGroupCount( groups );

	return Math.min(
		groupCount,
		Math.max(
			normalizedBaseLimit,
			normalizedBaseLimit + protectedGroupCount,
			coverageGapReservedPublicationLimit
		)
	);
}

function orderSupervisorGroupsWithCoverageGapReserve( groups, baseLimit ) {
	const orderedGroups = uniqueStringList( groups ?? [] );
	const reservedGroups = getCoverageGapReservedGroups( orderedGroups );
	if ( reservedGroups.length === 0 ) {
		return orderedGroups;
	}

	const normalizedBaseLimit = Number.isFinite( baseLimit )
		? Math.max( 0, baseLimit )
		: 0;
	const reservedGroupSet = new Set( reservedGroups );
	const baseGroups = orderedGroups
		.filter( ( group ) => ! reservedGroupSet.has( group ) )
		.slice( 0, Math.max( 0, normalizedBaseLimit - reservedGroups.length ) );
	const baseGroupSet = new Set( baseGroups );

	return uniqueStringList( [
		...reservedGroups,
		...baseGroups,
		...orderedGroups.filter(
			( group ) =>
				! baseGroupSet.has( group ) && ! reservedGroupSet.has( group )
		),
	] );
}

const HIGH_VALUE_EXPANSION_GROUPS = [
	'novelty-ws-real-user-coverage-bridge',
	REAL_USER_RELOAD_DIVERSITY_GROUP,
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
	MULTI_RELOAD_LIFECYCLE_COMPLETION_GROUP,
	'novelty-ws-same-user-lifecycle',
	'novelty-ws-same-user-separate-context-lifecycle',
	'novelty-ws-same-user-stale-tabs',
	'novelty-http-same-user-stale-draft',
	'novelty-ws-real-user-rich-text',
	'novelty-ws-async-server-blocks',
	MEDIA_CROSS_ENTITY_COMPLETION_GROUP,
	'novelty-ws-media-cross-entity',
	'novelty-ws-permissions-auth-locks',
	'novelty-ws-long-session-large-doc',
	'novelty-http-large-post-lifecycle',
	'novelty-http-large-post-lifecycle-completion',
	'novelty-http-table-stale-snapshot',
	TABLE_STALE_SNAPSHOT_COMPLETION_GROUP,
	'novelty-http-title-reload-convergence',
	'novelty-http-existing-post-crdt-metadata',
	PLAIN_EDITOR_PRODUCT_SMOKE_GROUP,
	REAL_WORLD_EDITOR_USABILITY_GROUP,
	'novelty-http-rtc-reference-oracle',
	'novelty-ws-many-user-lifecycle',
	'novelty-ws-many-user-lifecycle-completion',
	'novelty-ws-thirty-user-lifecycle',
	THIRTY_USER_LIFECYCLE_COMPLETION_GROUP,
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
	MULTI_RELOAD_LIFECYCLE_COMPLETION_GROUP,
	'novelty-ws-same-user-lifecycle',
	'novelty-ws-same-user-separate-context-lifecycle',
	'novelty-ws-same-user-stale-tabs',
	'novelty-http-same-user-stale-draft',
	'novelty-ws-async-server-blocks',
	'novelty-ws-permissions-auth-locks',
	'novelty-ws-long-session-large-doc',
	'novelty-http-large-post-lifecycle',
	'novelty-http-large-post-lifecycle-completion',
	'novelty-http-table-stale-snapshot',
	TABLE_STALE_SNAPSHOT_COMPLETION_GROUP,
	'novelty-http-title-reload-convergence',
	'novelty-http-existing-post-crdt-metadata',
	PLAIN_EDITOR_PRODUCT_SMOKE_GROUP,
	REAL_WORLD_EDITOR_USABILITY_GROUP,
	'novelty-http-rtc-reference-oracle',
	'novelty-ws-many-user-lifecycle',
	'novelty-ws-many-user-lifecycle-completion',
	'novelty-ws-thirty-user-lifecycle',
	THIRTY_USER_LIFECYCLE_COMPLETION_GROUP,
	'novelty-ws-collaboration-ui-signals',
	REAL_USER_RELOAD_DIVERSITY_GROUP,
	'novelty-ws-real-user-save-reload',
	'novelty-ws-real-user-editing',
	'novelty-ws-real-user-rich-text',
];

const DEFAULT_REQUIRED_COVERAGE_BREADTH_GROUPS = [
	'novelty-ws-real-user-coverage-bridge',
	REAL_USER_RELOAD_DIVERSITY_GROUP,
	'novelty-ws-real-user-save-reload',
	'novelty-ws-real-user-rich-text',
	'novelty-ws-parser-transform',
	'novelty-ws-block-gauntlet',
	'novelty-ws-revision-recovery',
	'novelty-ws-three-user-late-join',
	'novelty-ws-multi-reload-lifecycle',
	'novelty-ws-same-user-lifecycle',
	'novelty-ws-same-user-separate-context-lifecycle',
	'novelty-http-same-user-stale-draft',
	'novelty-ws-async-server-blocks',
	'novelty-ws-media-cross-entity',
	'novelty-ws-long-session-large-doc',
	'novelty-http-large-post-lifecycle',
	'novelty-http-large-post-lifecycle-completion',
	'novelty-http-table-stale-snapshot',
	'novelty-http-title-reload-convergence',
	'novelty-http-existing-post-crdt-metadata',
	PLAIN_EDITOR_PRODUCT_SMOKE_GROUP,
	REAL_WORLD_EDITOR_USABILITY_GROUP,
	'novelty-http-rtc-reference-oracle',
	'novelty-ws-many-user-lifecycle-completion',
	'novelty-ws-many-user-lifecycle',
	'novelty-ws-thirty-user-lifecycle',
	THIRTY_USER_LIFECYCLE_COMPLETION_GROUP,
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
	REAL_USER_RELOAD_DIVERSITY_GROUP,
	'novelty-ws-real-user-rich-text',
	'novelty-ws-real-user-save-reload',
	'novelty-ws-real-user-editing',
	'novelty-ws-parser-transform',
	'novelty-ws-parser-serialization',
	'novelty-ws-block-gauntlet',
	'novelty-ws-common-blocks',
	'novelty-http-persistence-probe',
	MULTI_RELOAD_LIFECYCLE_COMPLETION_GROUP,
	'novelty-ws-same-user-lifecycle',
	'novelty-ws-same-user-separate-context-lifecycle',
	'novelty-http-same-user-stale-draft',
	'novelty-http-large-post-lifecycle',
	'novelty-http-large-post-lifecycle-completion',
	'novelty-http-table-stale-snapshot',
	TABLE_STALE_SNAPSHOT_COMPLETION_GROUP,
	'novelty-http-title-reload-convergence',
	'novelty-http-existing-post-crdt-metadata',
	PLAIN_EDITOR_PRODUCT_SMOKE_GROUP,
	REAL_WORLD_EDITOR_USABILITY_GROUP,
	'novelty-http-rtc-reference-oracle',
	'novelty-ws-collaboration-ui-signals',
	'novelty-ws-revision-recovery',
	'novelty-ws-many-user-lifecycle-completion',
	'novelty-ws-many-user-lifecycle',
	'novelty-ws-thirty-user-lifecycle',
	THIRTY_USER_LIFECYCLE_COMPLETION_GROUP,
	MEDIA_CROSS_ENTITY_COMPLETION_GROUP,
];
const ZERO_COVERAGE_PRIORITY_GROUPS = [
	'novelty-ws-thirty-user-lifecycle',
	THIRTY_USER_LIFECYCLE_COMPLETION_GROUP,
	'novelty-ws-collaboration-ui-signals',
	'novelty-ws-real-user-rich-text',
	'novelty-ws-same-user-lifecycle',
	'novelty-ws-same-user-separate-context-lifecycle',
	'novelty-ws-many-user-lifecycle-completion',
	'novelty-ws-many-user-lifecycle',
	'novelty-ws-revision-recovery',
	'novelty-http-table-stale-snapshot',
	TABLE_STALE_SNAPSHOT_COMPLETION_GROUP,
	'novelty-http-large-post-lifecycle-completion',
	'novelty-http-large-post-lifecycle',
	'novelty-http-title-reload-convergence',
	'novelty-http-existing-post-crdt-metadata',
	PLAIN_EDITOR_PRODUCT_SMOKE_GROUP,
	REAL_WORLD_EDITOR_USABILITY_GROUP,
	'novelty-http-rtc-reference-oracle',
];
const DEFAULT_SUCCESS_DEFICIT_BOOTSTRAP_GROUPS = [
	REAL_USER_RELOAD_DIVERSITY_GROUP,
	'novelty-ws-real-user-editing',
	'novelty-ws-real-user-rich-text',
	'novelty-ws-parser-serialization',
	'novelty-ws-parser-transform',
	'novelty-ws-multi-reload-lifecycle',
	MULTI_RELOAD_LIFECYCLE_COMPLETION_GROUP,
	'novelty-ws-collaboration-ui-signals',
	MEDIA_CROSS_ENTITY_COMPLETION_GROUP,
	'novelty-ws-media-cross-entity',
	'novelty-ws-three-user-late-join',
	'novelty-ws-same-user-lifecycle',
	'novelty-ws-same-user-separate-context-lifecycle',
	'novelty-ws-revision-persistence',
	'novelty-ws-revision-recovery',
	'novelty-ws-many-user-lifecycle-completion',
	'novelty-ws-many-user-lifecycle',
	'novelty-ws-thirty-user-lifecycle',
	THIRTY_USER_LIFECYCLE_COMPLETION_GROUP,
	TABLE_STALE_SNAPSHOT_COMPLETION_GROUP,
	'novelty-http-rtc-reference-oracle',
];
const configuredSuccessDeficitBootstrapGroups = parsePathList(
	process.env.RTC_FUZZ_NOVELTY_SUCCESS_DEFICIT_BOOTSTRAP_GROUPS
);
const SUCCESS_DEFICIT_BOOTSTRAP_GROUPS = uniqueStringList(
	( configuredSuccessDeficitBootstrapGroups.length
		? configuredSuccessDeficitBootstrapGroups
		: DEFAULT_SUCCESS_DEFICIT_BOOTSTRAP_GROUPS
	).filter( ( group ) => PROFILE_BY_GROUP[ group ] )
);
const SUCCESS_DEFICIT_BOOTSTRAP_GROUP_SET = new Set(
	SUCCESS_DEFICIT_BOOTSTRAP_GROUPS
);
const SUCCESS_DEFICIT_BOOTSTRAP_SLOTS = getPositiveIntegerEnv(
	'RTC_FUZZ_NOVELTY_SUCCESS_DEFICIT_BOOTSTRAP_SLOTS',
	2
);
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
const SUCCESS_DEFICIT_ROTATION_PAUSE_ORDER = [
	'novelty-http-persistence-probe',
	'novelty-ws-parser-serialization',
	'novelty-ws-structure',
	'novelty-ws-persistence-no-title',
	'novelty-ws-lifecycle',
	'novelty-ws-common-blocks',
	'novelty-http-same-user-stale-draft',
	'novelty-http-existing-post-crdt-metadata',
	'novelty-http-title-reload-convergence',
	'novelty-http-table-stale-snapshot',
	'novelty-http-large-post-lifecycle-completion',
	'novelty-http-large-post-lifecycle',
	PLAIN_EDITOR_PRODUCT_SMOKE_GROUP,
	REAL_WORLD_EDITOR_USABILITY_GROUP,
	'novelty-http-rtc-reference-oracle',
];
const BENCHMARK_CANARY_ZERO_COVERAGE_EVICTION_ORDER = [
	'novelty-http-persistence-probe',
	'novelty-http-existing-post-crdt-metadata',
	'novelty-http-title-reload-convergence',
	'novelty-http-large-post-lifecycle-completion',
	'novelty-http-large-post-lifecycle',
	'novelty-http-same-user-stale-draft',
	'novelty-http-table-stale-snapshot',
];
const ZERO_COVERAGE_BENCHMARK_CANARY_MIN_ACTIVE_GROUPS =
	getNonNegativeIntegerEnv(
		'RTC_FUZZ_NOVELTY_ZERO_COVERAGE_BENCHMARK_CANARY_MIN_ACTIVE_GROUPS',
		1
	);
const BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS = getNonNegativeIntegerEnv(
	'RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS',
	1
);
const BENCHMARK_CANARY_WS_BACKFILL_SLOTS = getNonNegativeIntegerEnv(
	'RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS',
	0
);

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
		groups: [
			MEDIA_CROSS_ENTITY_COMPLETION_GROUP,
			'novelty-ws-media-cross-entity',
		],
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
			REAL_USER_RELOAD_DIVERSITY_GROUP,
			'novelty-ws-real-user-save-reload',
			'novelty-ws-real-user-editing',
			'novelty-ws-real-user-rich-text',
			'novelty-ws-long-session-large-doc',
			'novelty-http-large-post-lifecycle',
			'novelty-http-large-post-lifecycle-completion',
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
		groups: [
			'novelty-http-large-post-lifecycle',
			'novelty-http-large-post-lifecycle-completion',
		],
		rationale:
			'the combined HTTP, three-user, large-post, publish oracle must complete successfully',
	},
	{
		id: 'auto-combo:http-large-post-publish-ui-readiness',
		label: 'large post publish UI readiness witnesses',
		countSource: {
			kind: 'feature',
			key: 'history:publish-ui-readiness:ok',
		},
		target: 10,
		groups: [
			'novelty-http-large-post-lifecycle',
			'novelty-http-large-post-lifecycle-completion',
		],
		rationale:
			'the benchmark canary exposed publish-panel readiness as part of the large-post HTTP user-hit behavior',
	},
	{
		id: 'auto-combo:http-large-post-final-ui-witnesses',
		label: 'large post final UI witnesses',
		countSource: {
			kind: 'feature',
			key: 'history:final-ui-witness-sweep:ok',
		},
		target: 10,
		groups: [
			'novelty-http-large-post-lifecycle',
			'novelty-http-large-post-lifecycle-completion',
		],
		rationale:
			'each participant needs a final UI-entered operation witness before publish',
	},
	{
		id: 'auto-combo:rtc-reference-oracle-success',
		label: 'RTC-off reference oracle successes',
		countSource: {
			kind: 'feature',
			key: 'history:rtc-reference-oracle:ok',
		},
		target: 25,
		groups: [ 'novelty-http-rtc-reference-oracle' ],
		rationale:
			'RTC semantic correctness needs a normal-editor reference oracle, not only convergence between RTC clients',
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
		stepCount: 11,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_ACTION_SEQUENCE: [
				'insert-block-gauntlet-block',
				'insert-block-gauntlet-block',
				'insert-block-gauntlet-block',
				'insert-block-gauntlet-block',
				'insert-block-gauntlet-block',
				'insert-block-gauntlet-block',
				'edit-block-gauntlet-attributes',
				'edit-block-gauntlet-attributes',
				'move-block',
				'edit-common-block-attributes',
				'insert-nested-group',
			].join( ',' ),
			GUTENBERG_RTC_BROWSER_FORCE_BLOCK_GAUNTLET_VARIANTS:
				'3,5,9,10,11,11',
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
			GUTENBERG_RTC_BROWSER_INITIAL_CONTENT_PROFILE: 'base-seeded',
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
			GUTENBERG_RTC_BROWSER_AUTOSAVE_BURST_COUNT: '2',
			GUTENBERG_RTC_BROWSER_AUTOSAVE_CHECKPOINT_COUNT: '4',
			GUTENBERG_RTC_BROWSER_ENABLE_REVISION_RESTORE_PROBE: '1',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FORCE_AUTOSAVE_STEPS: '2,6,10,14',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '5,11',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '1,8,13',
			GUTENBERG_RTC_BROWSER_INITIAL_CONTENT_PROFILE: 'base-seeded',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '3',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '60000',
			RTC_FUZZ_ENABLE_REVISION_RESTORE_PROBE: '1',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
		},
	},
	{
		name: 'novelty-ws-three-user-late-join',
		actionProfile: 'three-user-late-join',
		startSeed: 1000001,
		stepCount: 8,
		lanes: 2,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_ACTION_SEQUENCE:
				'append-paragraph,edit-paragraph,concurrent-paragraphs,insert-heading,append-paragraph,edit-paragraph,insert-paragraph,concurrent-paragraphs',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP: '1',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '3,7',
			GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '45000',
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
		name: 'novelty-ws-same-user-separate-context-lifecycle',
		actionProfile: 'session-lifecycle',
		startSeed: 1055001,
		stepCount: 8,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_ACTION_SEQUENCE:
				'edit-title,append-paragraph,edit-paragraph,concurrent-paragraphs,insert-heading,append-paragraph,edit-title,concurrent-paragraphs',
			GUTENBERG_RTC_BROWSER_COLLABORATOR_MODE:
				'same-user-separate-context',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '0',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '4',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '2,6',
			GUTENBERG_RTC_BROWSER_INITIAL_CONTENT_PROFILE: 'base-seeded',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '1',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '30000',
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
		name: 'novelty-ws-real-user-coverage-bridge',
		actionProfile: 'real-user-editing',
		startSeed: 1110001,
		stepCount: 6,
		lanes: 2,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FORCE_RANDOM_RELOAD_STEP: '4',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '2,4',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '1,3,5',
			GUTENBERG_RTC_BROWSER_INITIAL_CONTENT_PROFILE: 'base-seeded',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'shadow',
			GUTENBERG_RTC_BROWSER_REAL_USER_EDITING_ACTION_LABELS:
				'ui-type-paragraph,ui-format-paragraph,ui-type-title,ui-heading-shortcut,ui-undo-redo-paragraph',
			GUTENBERG_RTC_BROWSER_REAL_USER_EDITING_SEQUENCE:
				'ui-type-paragraph,ui-format-paragraph,ui-type-title,ui-heading-shortcut,ui-type-paragraph,ui-format-paragraph',
			GUTENBERG_RTC_BROWSER_RELOAD_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_RELOAD_POST_ACTION_KIND: 'paragraph',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '2',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '30000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
		},
	},
	{
		name: REAL_USER_RELOAD_DIVERSITY_GROUP,
		actionProfile: 'real-user-editing',
		startSeed: 1115001,
		stepCount: 8,
		lanes: 2,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FORCE_RANDOM_RELOAD_STEP: '5',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '2,5',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '1,4,7',
			GUTENBERG_RTC_BROWSER_INITIAL_CONTENT_PROFILE: 'base-seeded',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'shadow',
			GUTENBERG_RTC_BROWSER_REAL_USER_EDITING_ACTION_LABELS: [
				'ui-heading-shortcut',
				'ui-type-title',
				'ui-format-paragraph',
				'ui-undo-redo-paragraph',
				'ui-type-paragraph',
			].join( ',' ),
			GUTENBERG_RTC_BROWSER_REAL_USER_EDITING_SEQUENCE: [
				'ui-heading-shortcut',
				'ui-type-title',
				'ui-format-paragraph',
				'ui-undo-redo-paragraph',
				'ui-type-paragraph',
				'ui-heading-shortcut',
				'ui-type-title',
				'ui-format-paragraph',
			].join( ',' ),
			GUTENBERG_RTC_BROWSER_RELOAD_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_RELOAD_POST_ACTION_KIND: 'title',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '2',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '30000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
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
			GUTENBERG_RTC_BROWSER_FORCE_RANDOM_RELOAD_STEP: '12',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '1,3',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '1,2',
			GUTENBERG_RTC_BROWSER_INITIAL_CONTENT_PROFILE: 'base-seeded',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'shadow',
			RTC_FUZZ_SKIP_GLOBAL_POST_CLEANUP: '1',
			GUTENBERG_RTC_BROWSER_REAL_USER_EDITING_ACTION_LABELS: [
				'ui-cut-copy-paragraph',
				'ui-composition-paragraph',
				'ui-type-paragraph',
				'ui-format-paragraph',
				'ui-type-title',
				'ui-heading-shortcut',
				'ui-paste-paragraph',
				'ui-link-paragraph',
				'ui-list-indent',
				'ui-toolbar-format-paragraph',
				'ui-table-cell-edit',
				'ui-undo-redo-paragraph',
			].join( ',' ),
			GUTENBERG_RTC_BROWSER_REAL_USER_EDITING_SEQUENCE: [
				'ui-type-paragraph',
				'ui-format-paragraph',
				'ui-type-title',
				'ui-heading-shortcut',
				'ui-toolbar-format-paragraph',
				'ui-cut-copy-paragraph',
				'ui-composition-paragraph',
				'ui-table-cell-edit',
				'ui-undo-redo-paragraph',
				'ui-paste-paragraph',
				'ui-link-paragraph',
				'ui-list-indent',
				'ui-composition-paragraph',
				'ui-toolbar-format-paragraph',
			].join( ',' ),
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
		name: MULTI_RELOAD_LIFECYCLE_COMPLETION_GROUP,
		actionProfile: 'multi-reload-lifecycle',
		startSeed: 1270001,
		stepCount: 6,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_ACTION_SEQUENCE:
				'append-paragraph,edit-paragraph,append-paragraph,edit-paragraph,append-paragraph,edit-paragraph',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '2,4',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '3',
			GUTENBERG_RTC_BROWSER_INITIAL_CONTENT_PROFILE: 'base-seeded',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '2',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'fail',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '45000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
			RTC_FUZZ_RUN_TIMEOUT_MS: '720000',
		},
	},
	{
		name: 'novelty-ws-async-server-blocks',
		actionProfile: 'async-server-blocks',
		startSeed: 1100001,
		stepCount: 12,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_ACTION_SEQUENCE: [
				'insert-async-server-block',
				'insert-async-server-block',
				'insert-async-server-block',
				'insert-async-server-block',
				'insert-async-server-block',
				'insert-async-server-block',
				'edit-block-gauntlet-attributes',
				'insert-common-block',
				'move-block',
				'insert-async-server-block',
				'insert-async-server-block',
				'insert-async-server-block',
			].join( ',' ),
			GUTENBERG_RTC_BROWSER_ENABLE_TEMPLATE_PART_POST_CONTENT_SHELL: '1',
			GUTENBERG_RTC_BROWSER_FORCE_ASYNC_SERVER_BLOCK_VARIANTS:
				'6,4,1,2,0,7,3,5',
			GUTENBERG_RTC_BROWSER_FORCE_FIRST_ASYNC_SERVER_BLOCK_VARIANT: '6',
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
			GUTENBERG_RTC_BROWSER_INITIAL_CONTENT_PROFILE: 'base-seeded',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'shadow',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			GUTENBERG_RTC_BROWSER_CONVERGENCE_TIMEOUT_MS: '45000',
			GUTENBERG_RTC_BROWSER_SAVE_CLEAN_TIMEOUT_MS: '45000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
		},
	},
	{
		name: MEDIA_CROSS_ENTITY_COMPLETION_GROUP,
		actionProfile: 'media-cross-entity',
		startSeed: 1230001,
		stepCount: 4,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_ACTION_SEQUENCE:
				'insert-media-cross-entity-block,insert-media-cross-entity-block,insert-media-cross-entity-block,insert-media-cross-entity-block',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FORCE_MEDIA_CROSS_ENTITY_VARIANTS: '0,2,3,4',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '2',
			GUTENBERG_RTC_BROWSER_INITIAL_CONTENT_PROFILE: 'base-seeded',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'shadow',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			GUTENBERG_RTC_BROWSER_CONVERGENCE_TIMEOUT_MS: '60000',
			GUTENBERG_RTC_BROWSER_SAVE_CLEAN_TIMEOUT_MS: '60000',
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
			GUTENBERG_RTC_BROWSER_FORCE_AUTH_SYNC_FAILURE_STATUSES: '401,403',
			GUTENBERG_RTC_BROWSER_FORCE_AUTH_SYNC_FAILURE_STEPS: '1,2',
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
			GUTENBERG_RTC_BROWSER_COLLABORATOR_JOIN_BATCH_SIZE: '3',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '10',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FINAL_UI_WITNESS_SWEEP: '1',
			GUTENBERG_RTC_BROWSER_EDITED_CONTENT_MARKER_TIMEOUT_MS: '45000',
			GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP: '1',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '5,11',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '4,9,13',
			GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_LARGE_DOCUMENT_BLOCKS: '24',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '2',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MAX_LIVE: '512',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'fail',
			GUTENBERG_RTC_BROWSER_REMOTE_SELECTION_PROBE_ACTOR_INDEX: '0',
			GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '1200000',
			RTC_FUZZ_BOOTSTRAP_STALL_RECHECKS: '1',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '60000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '240000',
			RTC_FUZZ_RUN_TIMEOUT_MS: '1200000',
			RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_MIN_FAILURES: '3',
			RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_NO_PRODUCT_MIN_FAILURES:
				'3',
		},
	},
	{
		name: 'novelty-ws-many-user-lifecycle-completion',
		actionProfile: 'many-user-lifecycle',
		startSeed: 1180001,
		stepCount: 8,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_ACTION_SEQUENCE:
				'append-paragraph,assert-presence-list,edit-paragraph,append-paragraph,assert-presence-list,edit-paragraph,append-paragraph,assert-presence-list',
			GUTENBERG_RTC_BROWSER_COLLABORATOR_JOIN_BATCH_SIZE: '3',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '10',
			GUTENBERG_RTC_BROWSER_FINAL_UI_WITNESS_SWEEP: '0',
			GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP: '1',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '6',
			GUTENBERG_RTC_BROWSER_INITIAL_CONTENT_PROFILE: 'base-seeded',
			GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_LARGE_DOCUMENT_BLOCKS: '0',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '0',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			GUTENBERG_RTC_BROWSER_REMOTE_SELECTION_PROBE_ACTOR_INDEX: '0',
			GUTENBERG_RTC_BROWSER_SUCCESS_COVERAGE_SMOKE: '1',
			GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '900000',
			RTC_FUZZ_BOOTSTRAP_STALL_RECHECKS: '1',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '60000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '240000',
			RTC_FUZZ_RUN_TIMEOUT_MS: '900000',
			RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_MIN_FAILURES: '3',
			RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_NO_PRODUCT_MIN_FAILURES:
				'3',
		},
	},
	{
		name: 'novelty-ws-thirty-user-lifecycle',
		actionProfile: 'many-user-lifecycle',
		startSeed: 1210001,
		stepCount: 6,
		lanes: 1,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_ACTION_SEQUENCE:
				'append-paragraph,assert-presence-list,edit-paragraph,append-paragraph,assert-presence-list,edit-paragraph',
			GUTENBERG_RTC_BROWSER_COLLABORATOR_JOIN_BATCH_SIZE: '1',
			GUTENBERG_RTC_BROWSER_COLLABORATOR_JOIN_BATCH_DELAY_MS: '1000',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '28',
			GUTENBERG_RTC_BROWSER_FINAL_UI_WITNESS_SWEEP: '0',
			GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP: '1',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '4',
			GUTENBERG_RTC_BROWSER_INITIAL_CONTENT_PROFILE: 'base-seeded',
			GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_LARGE_DOCUMENT_BLOCKS: '0',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '0',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MAX_LIVE: '1024',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'fail',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			GUTENBERG_RTC_BROWSER_SUCCESS_COVERAGE_SMOKE: '1',
			GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '2400000',
			GUTENBERG_RTC_TEST_WS_MAX_LISTENERS: '100',
			NODE_OPTIONS: '--max-old-space-size=24576',
			RTC_FUZZ_BOOTSTRAP_STALL_RECHECKS: '1',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '120000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '600000',
			RTC_FUZZ_RUN_TIMEOUT_MS: '2400000',
			RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_MIN_FAILURES: '2',
			RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_NO_PRODUCT_MIN_FAILURES:
				'2',
		},
	},
	{
		name: THIRTY_USER_LIFECYCLE_COMPLETION_GROUP,
		actionProfile: 'many-user-lifecycle',
		startSeed: 1260001,
		stepCount: 4,
		lanes: 1,
		collectCdpCoverage: false,
		env: {
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_ACTION_SEQUENCE:
				'append-paragraph,append-paragraph,edit-paragraph,append-paragraph',
			GUTENBERG_RTC_BROWSER_COLLABORATOR_JOIN_BATCH_SIZE: '2',
			GUTENBERG_RTC_BROWSER_COLLABORATOR_JOIN_BATCH_DELAY_MS: '500',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '28',
			GUTENBERG_RTC_BROWSER_FINAL_UI_WITNESS_SWEEP: '0',
			GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP: '1',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '3',
			GUTENBERG_RTC_BROWSER_INITIAL_CONTENT_PROFILE: 'base-seeded',
			GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_LARGE_DOCUMENT_BLOCKS: '0',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '0',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MAX_LIVE: '1024',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'fail',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			GUTENBERG_RTC_BROWSER_SUCCESS_COVERAGE_SMOKE: '1',
			GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '1800000',
			GUTENBERG_RTC_TEST_WS_MAX_LISTENERS: '100',
			NODE_OPTIONS: '--max-old-space-size=24576',
			RTC_FUZZ_BOOTSTRAP_STALL_RECHECKS: '1',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '120000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '600000',
			RTC_FUZZ_RUN_TIMEOUT_MS: '1800000',
			RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_MIN_FAILURES: '2',
			RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_NO_PRODUCT_MIN_FAILURES:
				'2',
		},
	},
	{
		name: 'novelty-ws-collaboration-ui-signals',
		actionProfile: 'collaboration-ui-signals',
		startSeed: 1170001,
		stepCount: 10,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_ACTION_SEQUENCE:
				'assert-presence-list,ui-type-paragraph,assert-selection-cursor,ui-format-paragraph,assert-selection-cursor,concurrent-paragraphs,append-paragraph,assert-presence-list,ui-undo-redo-paragraph,assert-presence-list',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'shadow',
			GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP: '7',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '6',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '4',
			GUTENBERG_RTC_BROWSER_INITIAL_CONTENT_PROFILE: 'base-seeded',
			GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'shadow',
			GUTENBERG_RTC_BROWSER_RANDOM_SYNC_FAULT_MIN_STEP: '5',
			GUTENBERG_RTC_BROWSER_REMOTE_SELECTION_PROBE_ACTOR_INDEX: '0',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			GUTENBERG_RTC_BROWSER_SOFT_DISCOVERY_BOOTSTRAP: '0',
			RTC_FUZZ_BOOTSTRAP_STALL_RECHECKS: '1',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '45000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '180000',
			RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_MIN_FAILURES: '3',
			RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_NO_PRODUCT_MIN_FAILURES:
				'3',
		},
	},
	{
		name: 'novelty-http-large-post-lifecycle',
		actionProfile: 'large-post-three-user-http-lifecycle',
		transport: 'http',
		startSeed: 1140001,
		stepCount: 24,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_ACTION_SEQUENCE:
				'ui-type-paragraph,ui-type-title,append-paragraph,insert-heading,concurrent-paragraphs',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_PUBLISH: '1',
			GUTENBERG_RTC_BROWSER_FINAL_UI_WITNESS_SWEEP: '1',
			GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP: '1',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '6,14,22',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '5,12,20',
			GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_LARGE_DOCUMENT_BLOCKS: '100',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '2',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MAX_LIVE: '512',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'fail',
			GUTENBERG_RTC_BROWSER_SOFT_DISCOVERY_BOOTSTRAP: '1',
			GUTENBERG_RTC_BROWSER_BOOT_TIMEOUT_MS: '90000',
			GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '1800000',
			RTC_FUZZ_BOOT_TIMEOUT_MS: '90000',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '60000',
			RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_NO_PRODUCT_MIN_FAILURES:
				'3',
			RTC_FUZZ_SUPERVISOR_BYPASS_STARTUP_STALL_COOLDOWN: '1',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '180000',
			RTC_FUZZ_RUN_TIMEOUT_MS: '1800000',
		},
	},
	{
		name: 'novelty-http-large-post-lifecycle-completion',
		actionProfile: 'large-post-three-user-http-lifecycle',
		transport: 'http',
		startSeed: 1190001,
		stepCount: 12,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_ACTION_SEQUENCE:
				'ui-type-paragraph,ui-type-title,append-paragraph,insert-heading,concurrent-paragraphs',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_PUBLISH: '1',
			GUTENBERG_RTC_BROWSER_FINAL_UI_WITNESS_SWEEP: '1',
			GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP: '1',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '8',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '4',
			GUTENBERG_RTC_BROWSER_INITIAL_CONTENT_PROFILE: 'base-seeded',
			GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_LARGE_DOCUMENT_BLOCKS: '64',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '1',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MAX_LIVE: '256',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'fail',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			GUTENBERG_RTC_BROWSER_SOFT_DISCOVERY_BOOTSTRAP: '1',
			GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '900000',
			RTC_FUZZ_BOOTSTRAP_STALL_RECHECKS: '1',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '60000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '180000',
			RTC_FUZZ_RUN_TIMEOUT_MS: '900000',
			RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_NO_PRODUCT_MIN_FAILURES:
				'3',
			RTC_FUZZ_SUPERVISOR_BYPASS_STARTUP_STALL_COOLDOWN: '1',
		},
	},
	{
		name: 'novelty-http-table-stale-snapshot',
		actionProfile: 'table-stale-snapshot-http',
		transport: 'http',
		startSeed: 1180001,
		stepCount: 6,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_PUBLISH: '1',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '3',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '2,5',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '1',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'fail',
			GUTENBERG_RTC_BROWSER_SOFT_DISCOVERY_BOOTSTRAP: '1',
			GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '900000',
			RTC_FUZZ_BOOTSTRAP_STALL_RECHECKS: '1',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
			RTC_FUZZ_RUN_TIMEOUT_MS: '900000',
			RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_NO_PRODUCT_MIN_FAILURES:
				'2',
		},
	},
	{
		name: TABLE_STALE_SNAPSHOT_COMPLETION_GROUP,
		actionProfile: 'table-stale-snapshot-http',
		transport: 'http',
		startSeed: 1240001,
		stepCount: 4,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_ACTION_SEQUENCE:
				'table-stale-snapshot-html,append-paragraph,table-stale-snapshot-html,edit-table-array-attributes',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_PUBLISH: '1',
			GUTENBERG_RTC_BROWSER_FORCE_RANDOM_RELOAD_STEP: '3',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '2',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '0',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'fail',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			GUTENBERG_RTC_BROWSER_SOFT_DISCOVERY_BOOTSTRAP: '1',
			GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '900000',
			RTC_FUZZ_BOOTSTRAP_STALL_RECHECKS: '1',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '60000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
			RTC_FUZZ_RUN_TIMEOUT_MS: '900000',
			RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_NO_PRODUCT_MIN_FAILURES:
				'2',
		},
	},
	{
		name: 'novelty-http-title-reload-convergence',
		actionProfile: 'session-lifecycle',
		transport: 'http',
		startSeed: 1210001,
		stepCount: 10,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_ACTION_SEQUENCE:
				'edit-title,append-paragraph,edit-title,concurrent-paragraphs',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '3,6',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '2,5,7',
			GUTENBERG_RTC_BROWSER_INITIAL_CONTENT_PROFILE: 'base-seeded',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '2',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'fail',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '2',
			GUTENBERG_RTC_BROWSER_SOFT_DISCOVERY_BOOTSTRAP: '1',
			GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '900000',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '60000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '180000',
			RTC_FUZZ_RUN_TIMEOUT_MS: '900000',
			RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_NO_PRODUCT_MIN_FAILURES:
				'2',
		},
	},
	{
		name: 'novelty-http-existing-post-crdt-metadata',
		actionProfile: 'persistence-no-title',
		transport: 'http',
		startSeed: 1220001,
		stepCount: 10,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_ACTION_SEQUENCE:
				'append-paragraph,insert-heading,concurrent-paragraphs,edit-paragraph',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '3,6',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '2,5,7',
			GUTENBERG_RTC_BROWSER_INITIAL_CONTENT_PROFILE: 'base-seeded',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '2',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'fail',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '2',
			GUTENBERG_RTC_BROWSER_SOFT_DISCOVERY_BOOTSTRAP: '1',
			GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '900000',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '60000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '180000',
			RTC_FUZZ_RUN_TIMEOUT_MS: '900000',
			RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_NO_PRODUCT_MIN_FAILURES:
				'2',
		},
	},
	{
		name: PLAIN_EDITOR_PRODUCT_SMOKE_GROUP,
		actionProfile: 'plain-editor-product-smoke',
		transport: 'http',
		startSeed: 1255001,
		stepCount: 1,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_BASIC_UI_ORACLE: '1',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'off',
			GUTENBERG_RTC_BROWSER_POST_NEW_UI_ORACLE: '1',
			GUTENBERG_RTC_BROWSER_REQUIRE_SAVE_CLEAN: '1',
			GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '360000',
			GUTENBERG_RTC_BROWSER_CONVERGENCE_TIMEOUT_MS: '60000',
			GUTENBERG_RTC_BROWSER_DISCOVERY_TIMEOUT_MS: '60000',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '60000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '60000',
			RTC_FUZZ_RUN_TIMEOUT_MS: '360000',
			RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_NO_PRODUCT_MIN_FAILURES:
				'1',
		},
	},
	{
		name: REAL_WORLD_EDITOR_USABILITY_GROUP,
		actionProfile: 'real-world-editor-usability',
		transport: 'http',
		startSeed: 1257001,
		stepCount: 1,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_BASIC_UI_ORACLE: '1',
			GUTENBERG_RTC_BROWSER_COLLABORATOR_ROLES: 'author',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'off',
			GUTENBERG_RTC_BROWSER_POST_NEW_UI_ORACLE: '1',
			GUTENBERG_RTC_BROWSER_REAL_USER_TYPING_DELAY_MS: '0',
			GUTENBERG_RTC_BROWSER_REQUIRE_SAVE_CLEAN: '1',
			GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '720000',
			GUTENBERG_RTC_BROWSER_CONVERGENCE_TIMEOUT_MS: '120000',
			GUTENBERG_RTC_BROWSER_DISCOVERY_TIMEOUT_MS: '120000',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '120000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
			RTC_FUZZ_RUN_TIMEOUT_MS: '720000',
			RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_NO_PRODUCT_MIN_FAILURES:
				'1',
		},
	},
	{
		name: 'novelty-http-rtc-reference-oracle',
		actionProfile: 'rtc-reference-oracle',
		transport: 'http',
		startSeed: 1260001,
		stepCount: 14,
		collectCdpCoverage: true,
		env: {
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'off',
			GUTENBERG_RTC_BROWSER_RTC_REFERENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '0',
			GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '900000',
			RTC_FUZZ_CONVERGENCE_TIMEOUT_MS: '60000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '180000',
			RTC_FUZZ_RUN_TIMEOUT_MS: '900000',
			RTC_FUZZ_SUPERVISOR_STARTUP_STALL_GUARD_NO_PRODUCT_MIN_FAILURES:
				'2',
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
	userDocumentConcurrency: {},
	currentRunUserDocumentConcurrency: {},
	currentRunRecordCountsByProfile: {},
	currentRunRecordCountsByGroup: {},
	currentRunRecordCountsByTransport: {},
	currentRunSuccessfulActionCountsByProfile: {},
	currentRunSuccessfulRecordCountsByProfile: {},
	currentRunSuccessfulRecordCountsByGroup: {},
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
	state.enabledGroups ??= [];
	state.pausedGroups ??= {};
	state.disabledGroups ??= {};
	state.startupFailureCountsByProfile ??= {};
	state.startupFailureCountsByGroup ??= {};
	let clearedExpansionPauses = 0;
	let preservedExpansionNoisePauses = 0;
	const addedRequiredBootstrapGroups = [];

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

	for ( const group of getActivePolicyRequiredBootstrapGroups() ) {
		if (
			! state.disabledGroups[ group ] &&
			! state.enabledGroups.includes( group )
		) {
			state.enabledGroups.unshift( group );
			addedRequiredBootstrapGroups.push( group );
		}
	}
	state.enabledGroups = uniqueStringList( state.enabledGroups );

	state.expansionPolicyVersion = EXPANSION_POLICY_VERSION;
	state.changes.push( {
		at: new Date().toISOString(),
		action: 'reset-expansion-pauses',
		reason: `startup-noise counters are run-local; cleared ${ clearedExpansionPauses } stale expansion pause(s) while preserving ${ preservedExpansionNoisePauses } unexpired current-output or explicit no-product startup noise cooldown(s)`,
	} );
	if ( addedRequiredBootstrapGroups.length > 0 ) {
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'enable-policy-required-bootstrap-groups',
			groups: addedRequiredBootstrapGroups,
			reason: 'new high-value oracle coverage must materialize after policy upgrade even when the novelty state is carried forward from an older run',
		} );
	}
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
state.currentRunSuccessfulRecordCountsByGroup ??= {};
state.startupFailureCountsByProfile ??= {};
state.startupFailureCountsByGroup ??= {};
state.startupFailureIdentityKeys ??= [];
state.startupFailureDedupePolicyVersion ??= 0;
state.currentRunSummaryStartupFailureCountsByProfile ??= {};
state.currentRunSummaryStartupFailureCountsByGroup ??= {};
state.currentRunCountersInitializedForOutputDir ??= null;
state.runLocalNoisePolicyVersion ??= 0;
state.benchmarkCanaryDeadlineClosuresByGroup ??= {};
state.deadlineBenchmarkCanaryStartupRetriesByGroup ??= {};
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
	delete state.currentRunDirReconciliation;
	delete state.benchmarkCanaryRecordCounterInputSignature;
	delete state.benchmarkCanaryRecordCountsOutputDir;
	delete state.benchmarkCanaryRecordCountsByGroup;
	delete state.benchmarkCanarySuccessfulRecordCountsByGroup;
	delete state.benchmarkCanaryRecordCountsByTransport;
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
	await writeJsonFileAtomic( STATE_PATH, state );
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
		reason: 'no-product startup-noise cooldowns are hard producer blocks for benchmark-canary publication; stale/seed-drain bypasses were cleared, while product-evidence startup records remain visible and eligible',
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
await refreshBenchmarkCanaryFeedbackState( { recordLoad: true } );
await importBenchmarkCanaryDeadlineClosuresFromStatus();
applyHttpProviderGatingStartupFixStateRepair();
applyLargeHttpLifecycleStartupFixStateRepair();
applyCollaborationReadinessStartupFixStateRepair();
applyManyUserJoinBatchStartupFixStateRepair();
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

function getGitOutput( args ) {
	try {
		return execFileSync( 'git', args, {
			cwd: REPO_ROOT,
			encoding: 'utf8',
			stdio: [ 'ignore', 'pipe', 'ignore' ],
		} ).trim();
	} catch {
		return null;
	}
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

function getBenchmarkCanaryCase( row ) {
	const rawCase =
		row.benchmark_case ??
		row.failure_row ??
		row.case ??
		row.benchmark_row ??
		row.row ??
		'';
	const normalized = String( rawCase )
		.trim()
		.replace( /\s*\/\s*/g, '/' )
		.replace( /\s*:\s*/g, ':' );
	for ( const benchmarkCase of Object.keys(
		BENCHMARK_CANARY_GROUP_BY_CASE
	) ) {
		if (
			normalized === benchmarkCase ||
			normalized.endsWith( `/${ benchmarkCase }` ) ||
			normalized.endsWith( `:${ benchmarkCase }` ) ||
			normalized.split( /[/:]/ ).includes( benchmarkCase )
		) {
			return benchmarkCase;
		}
	}
	return normalized.split( /[/:]/ ).filter( Boolean ).at( -1 ) ?? '';
}

function benchmarkCanaryFailedRepsCount( value ) {
	const normalized = String( value ?? '' ).trim();
	return (
		/^[1-9][0-9]*(\/[0-9]+)?$/.test( normalized ) ||
		/^[1-9][0-9]*-[0-9]+$/.test( normalized )
	);
}

function isBenchmarkCanaryFeedbackPromotionBlockedRow( row ) {
	if ( isBenchmarkCanaryCoverageStatusRow( row ) ) {
		return (
			row.promotion_blocked === 'yes' &&
			row.explicit_downscope !== 'yes' &&
			( row.current_run_green !== 'yes' ||
				hasBenchmarkCanaryExactStackCoverageStatusProvenance( row ) )
		);
	}

	const statusText = String(
		[
			row.status,
			row.result,
			row.benchmark_status,
			row.required_controller_effect,
		]
			.filter( Boolean )
			.join( ' ' )
	).toLowerCase();
	const failureType = String( row.failure_type ?? '' ).toLowerCase();
	const repsFailed = row.reps_failed ?? row.failed_reps ?? row.failures ?? '';
	const repairOrPriority = String(
		[ row.repair_or_priority, row.priority ].filter( Boolean ).join( ' ' )
	).toLowerCase();
	const exitCode = String( row.exit_code ?? '' ).trim();
	const line = Object.values( row ).join( '\t' ).toLowerCase();

	return (
		/promotion[_-]?blocked|known_bad_canary|repair[_-]?not[_-]?publishable/.test(
			statusText
		) ||
		/(^|\t)(promotion_blocked|known_bad_canary|repair[_-]?not[_-]?publishable)(\t|$)/.test(
			line
		) ||
		( exitCode !== '' &&
			exitCode !== '0' &&
			/blocker|p0|high/.test( repairOrPriority ) ) ||
		( benchmarkCanaryFailedRepsCount( repsFailed ) &&
			/promotion-preflight|benchmark-row/.test( failureType ) ) ||
		( benchmarkCanaryFailedRepsCount( repsFailed ) &&
			/p0|block promotion|promotion.*blocked|block.*until/.test(
				repairOrPriority
			) )
	);
}

function getBenchmarkCanaryGroupsForFeedbackRow( row ) {
	const groups = new Set();
	const rowCases = new Set( [
		getBenchmarkCanaryCase( row ),
		...getBenchmarkCanaryCasesFromText( Object.values( row ).join( '\n' ) ),
	] );
	for ( const benchmarkCase of rowCases ) {
		addBenchmarkCanaryGroupsForCase( groups, benchmarkCase );
	}
	return [ ...groups ].filter( Boolean );
}

function isBenchmarkCanaryCoverageStatusRow( row ) {
	return (
		Object.hasOwn( row, 'group' ) &&
		Object.hasOwn( row, 'promotion_blocked' ) &&
		Object.hasOwn( row, 'current_run_green' )
	);
}

function normalizeBenchmarkCanaryCommit( value ) {
	return String( value ?? '' )
		.trim()
		.toLowerCase();
}

function getBenchmarkCanaryFeedbackCommit( row ) {
	return normalizeBenchmarkCanaryCommit(
		row.exact_stack_feedback_commit ??
			row.feedback_commit ??
			row.commit ??
			row.head_commit ??
			row.head_sha ??
			row.head
	);
}

function isBenchmarkCanaryFeedbackCommitCurrent( commit ) {
	const normalizedCommit = normalizeBenchmarkCanaryCommit( commit );
	const currentHead = normalizeBenchmarkCanaryCommit(
		CURRENT_REPO_HEAD_COMMIT
	);
	return (
		normalizedCommit === '' ||
		currentHead === '' ||
		normalizedCommit === currentHead ||
		currentHead.startsWith( normalizedCommit ) ||
		normalizedCommit.startsWith( currentHead )
	);
}

function isBenchmarkCanaryFeedbackFreshForCurrentHead( row ) {
	return isBenchmarkCanaryFeedbackCommitCurrent(
		getBenchmarkCanaryFeedbackCommit( row )
	);
}

function isCurrentFeedbackExactStackCoverageStatusRow( row ) {
	if ( ! isBenchmarkCanaryCoverageStatusRow( row ) ) {
		return false;
	}
	const sourceText = [
		row.exact_stack_source,
		row.source,
		row.closure_source,
		row.coverage_state,
		row.reason,
	]
		.map( ( value ) => String( value ?? '' ).toLowerCase() )
		.join( ' ' );
	return /current-feedback[.]tsv|benchmark-canary-feedback-promotion-blocked/.test(
		sourceText
	);
}

function getBenchmarkCanaryCoverageStatusNumber( row, key ) {
	const value = Number( row[ key ] ?? 0 );
	return Number.isFinite( value ) ? value : 0;
}

function hasDirectCurrentRunSuccessBenchmarkCanaryCoverageStatusRow( row ) {
	return (
		isBenchmarkCanaryCoverageStatusRow( row ) &&
		getBenchmarkCanaryCoverageStatusNumber(
			row,
			'current_run_successful_group_records'
		) > 0
	);
}

function isOpenBenchmarkCanaryCoverageStatusRow( row ) {
	if (
		! isBenchmarkCanaryCoverageStatusRow( row ) ||
		row.explicit_downscope === 'yes'
	) {
		return false;
	}

	if (
		row.promotion_blocked === 'yes' &&
		hasBenchmarkCanaryExactStackCoverageStatusProvenance( row )
	) {
		return true;
	}

	if ( hasDirectCurrentRunSuccessBenchmarkCanaryCoverageStatusRow( row ) ) {
		return false;
	}

	const hasCurrentRunRecords =
		getBenchmarkCanaryCoverageStatusNumber(
			row,
			'current_run_group_records'
		) > 0;
	return (
		row.promotion_blocked === 'yes' ||
		( row.forced === 'yes' &&
			( row.status_only === 'yes' ||
				row.live_forced === 'no' ||
				! hasCurrentRunRecords ||
				row.current_run_green_source ===
					'sticky-deadline-current-run-green' ) )
	);
}

function hasBenchmarkCanaryExactStackCoverageStatusProvenance( row ) {
	if (
		! isBenchmarkCanaryCoverageStatusRow( row ) ||
		row.explicit_downscope === 'yes'
	) {
		return false;
	}

	const text = [
		row.exact_stack_blocked,
		row.exact_stack_source,
		row.source,
		row.required_controller_effect,
		row.coverage_state,
		row.closure_source,
	]
		.map( ( value ) => String( value ?? '' ).toLowerCase() )
		.join( ' ' );

	return (
		row.exact_stack_blocked === 'yes' ||
		/current-feedback\.tsv|exact[-_ ]?stack|exact_stack|benchmark-feedback-union-override|benchmark-canary-feedback-promotion-blocked/.test(
			text
		)
	);
}

function isExactStackOpenBenchmarkCanaryCoverageStatusRow( row ) {
	return (
		row.promotion_blocked === 'yes' &&
		hasBenchmarkCanaryExactStackCoverageStatusProvenance( row )
	);
}

function getCurrentBenchmarkCanaryCoverageStatusRowsForGroup( group ) {
	return benchmarkCanaryCoverageStatusRows.filter(
		( row ) =>
			isBenchmarkCanaryCoverageStatusRow( row ) && row.group === group
	);
}

function hasBenchmarkCanaryCoverageEvidenceForScheduling( row ) {
	return (
		row.explicit_downscope === 'yes' ||
		hasDirectCurrentRunSuccessBenchmarkCanaryCoverageStatusRow( row ) ||
		( row.current_run_green === 'yes' &&
			row.current_run_green_source !==
				'sticky-deadline-current-run-green' ) ||
		row.retained_product_evidence === 'yes' ||
		getBenchmarkCanaryCoverageStatusNumber(
			row,
			'product_evidence_records'
		) > 0
	);
}

function needsBenchmarkCanaryCoverageForScheduling( group ) {
	const rows = getCurrentBenchmarkCanaryCoverageStatusRowsForGroup( group );
	if ( rows.length === 0 ) {
		return true;
	}
	return rows.some(
		( row ) =>
			row.promotion_blocked === 'yes' &&
			! hasBenchmarkCanaryCoverageEvidenceForScheduling( row )
	);
}

function hasCurrentOpenBenchmarkCanaryCoverageStatusRow( group ) {
	return getCurrentBenchmarkCanaryCoverageStatusRowsForGroup( group ).some(
		isOpenBenchmarkCanaryCoverageStatusRow
	);
}

function shouldPinCurrentOpenBenchmarkCanaryStatusGroup( group ) {
	return (
		isDeadlineBenchmarkCanaryBudgetCapActive() &&
		hasCurrentOpenBenchmarkCanaryCoverageStatusRow( group ) &&
		PROFILE_BY_GROUP[ group ] &&
		! isBenchmarkCanaryExplicitlyDownscoped( group ) &&
		! isDeadlineBlockedBenchmarkCanaryGroup( group )
	);
}

function getCurrentOpenBenchmarkCanaryCoverageStatusGroups() {
	return uniqueStringList(
		benchmarkCanaryCoverageStatusRows
			.filter( isOpenBenchmarkCanaryCoverageStatusRow )
			.map( ( row ) => row.group )
			.filter( ( group ) => PROFILE_BY_GROUP[ group ] )
	);
}

function getBenchmarkCanaryFloorPromotionBlockedGroups() {
	const floor = readKeyValueTsvFileSync(
		BENCHMARK_CANARY_COVERAGE_FLOOR_PATH
	);
	const promotionBlockedCount =
		Number.parseInt( floor.promotion_blocked_group_count ?? '0', 10 ) || 0;
	const slotFloor = Number.parseInt( floor.slot_floor ?? '0', 10 ) || 0;
	if ( promotionBlockedCount <= 0 && slotFloor <= 0 ) {
		return [];
	}
	return uniqueStringList(
		String( floor.promotion_blocked_groups ?? '' )
			.split( ',' )
			.map( ( group ) => group.trim() )
			.filter( Boolean )
	).filter( ( group ) => PROFILE_BY_GROUP[ group ] );
}

function getAuthoritativeOpenBenchmarkCanaryFloorGroups() {
	const openStatusGroups =
		getCurrentOpenBenchmarkCanaryCoverageStatusGroups();
	const floorGroups = getBenchmarkCanaryFloorPromotionBlockedGroups();
	if ( openStatusGroups.length === 0 ) {
		return benchmarkCanaryCoverageStatusRows.length === 0
			? floorGroups
			: [];
	}
	const openStatusGroupSet = new Set( openStatusGroups );
	return uniqueStringList( [
		...floorGroups.filter( ( group ) => openStatusGroupSet.has( group ) ),
		...openStatusGroups,
	] ).filter(
		( group ) =>
			PROFILE_BY_GROUP[ group ] &&
			! isBenchmarkCanaryExplicitlyDownscoped( group ) &&
			! isDeadlineBlockedBenchmarkCanaryGroup( group )
	);
}

function getBenchmarkCanarySchedulingCandidateGroups() {
	return uniqueStringList( [
		...benchmarkCanaryForcedGroups,
		...getCurrentOpenBenchmarkCanaryCoverageStatusGroups(),
	] ).filter( ( group ) => PROFILE_BY_GROUP[ group ] );
}

function hasCurrentClosedBenchmarkCanaryCoverageStatusRow( group ) {
	const rows = getCurrentBenchmarkCanaryCoverageStatusRowsForGroup( group );
	return (
		rows.length > 0 &&
		rows.every(
			( row ) => ! isOpenBenchmarkCanaryCoverageStatusRow( row )
		) &&
		rows.some(
			( row ) =>
				row.explicit_downscope === 'yes' ||
				hasDirectCurrentRunSuccessBenchmarkCanaryCoverageStatusRow(
					row
				)
		)
	);
}

function parseTsvRows( raw ) {
	const lines = raw
		.split( /\r?\n/ )
		.map( ( line ) => line.trim() )
		.filter( Boolean );
	if ( lines.length < 2 ) {
		return [];
	}

	const headers = lines[ 0 ].split( '\t' );
	return lines.slice( 1 ).map( ( line ) => {
		const columns = line.split( '\t' );
		const row = {};
		headers.forEach( ( header, index ) => {
			row[ header ] = columns[ index ] ?? '';
		} );
		return row;
	} );
}

async function readTsvRows( filePath ) {
	let raw;
	try {
		raw = await fs.readFile( filePath, 'utf8' );
	} catch {
		return [];
	}
	return parseTsvRows( raw );
}

async function readKeyValueTsvFile( filePath ) {
	let raw;
	try {
		raw = await fs.readFile( filePath, 'utf8' );
	} catch {
		return {};
	}

	const values = {};
	for ( const line of raw.split( /\r?\n/ ) ) {
		if ( ! line.trim() ) {
			continue;
		}
		const [ key, ...rest ] = line.split( '\t' );
		if ( key ) {
			values[ key ] = rest.join( '\t' );
		}
	}
	return values;
}

function readKeyValueTsvFileSync( filePath ) {
	let raw;
	try {
		raw = readFileSync( filePath, 'utf8' );
	} catch {
		return {};
	}

	const values = {};
	for ( const line of raw.split( /\r?\n/ ) ) {
		if ( ! line.trim() ) {
			continue;
		}
		const [ key, ...rest ] = line.split( '\t' );
		if ( key ) {
			values[ key ] = rest.join( '\t' );
		}
	}
	return values;
}

async function readBenchmarkCanaryFeedbackSourceOverrideRows() {
	const rows = [];
	for ( const filePath of uniquePathList(
		BENCHMARK_CANARY_FEEDBACK_SOURCE_OVERRIDE_TSV_PATHS
	) ) {
		const row = await readKeyValueTsvFile( filePath );
		if ( Object.keys( row ).length > 0 ) {
			rows.push( { ...row, _override_path: filePath } );
		}
	}
	return rows;
}

async function readBenchmarkCanarySourceOverrideFeedbackRows() {
	const sourceRows = await readBenchmarkCanaryFeedbackSourceOverrideRows();
	const feedbackPaths = uniquePathList(
		sourceRows.flatMap( ( row ) => [
			row.latest_feedback_tsv,
			row.selected_feedback_tsv,
		] )
	);
	const rows = [];
	for ( const filePath of feedbackPaths ) {
		if (
			path.resolve( filePath ) ===
			path.resolve( BENCHMARK_CANARY_FEEDBACK_TSV_PATH )
		) {
			continue;
		}
		for ( const row of await readTsvRows( filePath ) ) {
			rows.push( { ...row, _source_override_feedback_path: filePath } );
		}
	}
	return rows;
}

async function readBenchmarkCanaryFeedbackRows() {
	const [ primaryRows, overrideRows ] = await Promise.all( [
		readTsvRows( BENCHMARK_CANARY_FEEDBACK_TSV_PATH ),
		readBenchmarkCanarySourceOverrideFeedbackRows(),
	] );
	const rows = [ ...primaryRows, ...overrideRows ];
	const freshRows = rows.filter(
		( row ) =>
			isBenchmarkCanaryFeedbackFreshForCurrentHead( row ) &&
			! isCurrentFeedbackExactStackCoverageStatusRow( row )
	);
	state.benchmarkCanaryStaleFeedbackRowsIgnored =
		rows.length - freshRows.length;
	state.benchmarkCanaryFeedbackHeadCommit =
		CURRENT_REPO_HEAD_COMMIT ?? 'unknown';
	return freshRows;
}

async function readBenchmarkCanaryFeedbackUnionOverrideRows() {
	const rows = [];
	for ( const filePath of uniquePathList(
		BENCHMARK_CANARY_FEEDBACK_UNION_OVERRIDE_TSV_PATHS
	) ) {
		for ( const row of await readTsvRows( filePath ) ) {
			rows.push( { ...row, _override_path: filePath } );
		}
	}
	return rows;
}

function getBenchmarkCanaryCoverageStatusRowsFromUnionOverride( rows ) {
	return rows
		.map( ( row ) => {
			const group = String(
				row.coverage_group ?? row.group ?? ''
			).trim();
			if ( ! group ) {
				return null;
			}

			const effectText = [
				row.benchmark_status,
				row.required_controller_effect,
				row.action_kind,
				row.source_action,
			]
				.map( ( value ) => String( value ?? '' ).toLowerCase() )
				.join( ' ' );
			const currentRunSuccessCount = Number(
				row.current_run_successful_group_records ?? 0
			);
			const hasEquivalentCurrentRunGreen =
				Number.isFinite( currentRunSuccessCount ) &&
				currentRunSuccessCount > 0;
			const explicitDownscope = /explicit[_-]?downscope|downscope/.test(
				effectText
			);
			const promotionBlocked =
				! hasEquivalentCurrentRunGreen &&
				! explicitDownscope &&
				/promotion[_-]?blocked|treat[^ ]+as[_-]?promotion[_-]?blocked/.test(
					effectText
				);

			if (
				! promotionBlocked &&
				! explicitDownscope &&
				! hasEquivalentCurrentRunGreen
			) {
				return null;
			}

			const benchmarkCase = getBenchmarkCanaryCase( row );
			return {
				updated_at:
					row.created_at ??
					row.generated_at ??
					new Date().toISOString(),
				source: 'benchmark-feedback-union-override',
				group,
				cases: benchmarkCase,
				profile: row.profile ?? '',
				forced: 'yes',
				live_forced: 'no',
				primary: 'yes',
				promotion_blocked: promotionBlocked ? 'yes' : 'no',
				scheduled: 'no',
				current_run_successful_group_records:
					hasEquivalentCurrentRunGreen
						? String( currentRunSuccessCount )
						: '0',
				coverage_ready:
					hasEquivalentCurrentRunGreen || explicitDownscope
						? 'yes'
						: 'no',
				current_run_green: hasEquivalentCurrentRunGreen ? 'yes' : 'no',
				current_run_green_source: hasEquivalentCurrentRunGreen
					? 'direct-current-run-success'
					: 'none',
				closure_source: promotionBlocked
					? 'benchmark-feedback-union-override-open'
					: explicitDownscope
					? 'explicit-downscope'
					: 'direct-current-run-success',
				explicit_downscope: explicitDownscope ? 'yes' : 'no',
				status_only: promotionBlocked ? 'no' : 'yes',
				status_only_source: promotionBlocked
					? 'none'
					: 'benchmark-feedback-union-override',
				coverage_state: promotionBlocked
					? 'benchmark-feedback-union-override-open'
					: 'benchmark-feedback-union-override-closed',
				reason:
					row.required_controller_effect ??
					'benchmark feedback union override keeps this row open until equivalent current-run coverage is green or explicitly downscoped',
			};
		} )
		.filter( Boolean );
}

function getBenchmarkCanaryCoverageStatusRowsFromFeedbackRows( rows ) {
	state.benchmarkCanaryStaleInheritedFeedbackRowsIgnored = 0;
	const authoritativeCurrentFeedbackGroups = new Set();
	for ( const row of rows ) {
		if ( isBenchmarkCanaryCoverageStatusRow( row ) ) {
			continue;
		}
		if ( ! isBenchmarkCanaryFeedbackPromotionBlockedRow( row ) ) {
			continue;
		}
		for ( const group of getBenchmarkCanaryGroupsForFeedbackRow( row ) ) {
			authoritativeCurrentFeedbackGroups.add( group );
		}
	}

	return rows
		.flatMap( ( row ) => {
			if ( isBenchmarkCanaryCoverageStatusRow( row ) ) {
				return [];
			}

			const inheritedFeedbackCommit =
				getBenchmarkCanaryFeedbackCommit( row );
			if (
				isCurrentFeedbackExactStackCoverageStatusRow( row ) &&
				( ! inheritedFeedbackCommit ||
					! isBenchmarkCanaryFeedbackCommitCurrent(
						inheritedFeedbackCommit
					) ) &&
				! authoritativeCurrentFeedbackGroups.has( row.group )
			) {
				state.benchmarkCanaryStaleInheritedFeedbackRowsIgnored =
					( state.benchmarkCanaryStaleInheritedFeedbackRowsIgnored ??
						0 ) + 1;
				return [];
			}
			if ( ! isBenchmarkCanaryFeedbackPromotionBlockedRow( row ) ) {
				return [];
			}

			const groups = getBenchmarkCanaryGroupsForFeedbackRow( row );
			if ( groups.length === 0 ) {
				return [];
			}

			const cases = uniqueStringList(
				[
					getBenchmarkCanaryCase( row ),
					...getBenchmarkCanaryCasesFromText(
						Object.values( row ).join( '\n' )
					),
				].filter( Boolean )
			).join( ',' );
			return groups.map( ( group ) => ( {
				updated_at:
					row.observed_at_utc ??
					row.created_at ??
					row.generated_at ??
					new Date().toISOString(),
				source: 'benchmark-canary-feedback-promotion-blocked',
				group,
				cases,
				profile: row.profile ?? PROFILE_BY_GROUP[ group ] ?? '',
				forced: 'yes',
				live_forced: 'no',
				primary: 'yes',
				promotion_blocked: 'yes',
				exact_stack_blocked: 'yes',
				exact_stack_source: 'current-feedback.tsv',
				exact_stack_feedback_commit:
					getBenchmarkCanaryFeedbackCommit( row ),
				scheduled: 'no',
				current_run_successful_group_records: '0',
				coverage_ready: 'no',
				current_run_green: 'no',
				current_run_green_source: 'none',
				closure_source: 'benchmark-canary-feedback-promotion-blocked',
				explicit_downscope: 'no',
				status_only: 'no',
				status_only_source: 'none',
				coverage_state: 'benchmark-canary-feedback-promotion-blocked',
				reason:
					row.notes ??
					row.repair_or_priority ??
					'benchmark canary feedback row is promotion-blocked; keep equivalent fuzz coverage open but require exact-stack green evidence before promotion',
			} ) );
		} )
		.filter( Boolean );
}

async function readBenchmarkCanaryCoverageStatusRows() {
	const [ statusRows, overrideRows ] = await Promise.all( [
		readTsvRows( BENCHMARK_CANARY_COVERAGE_STATUS_PATH ),
		readBenchmarkCanaryFeedbackUnionOverrideRows(),
	] );
	return [
		...statusRows,
		...getBenchmarkCanaryCoverageStatusRowsFromUnionOverride(
			overrideRows
		),
		...getBenchmarkCanaryCoverageStatusRowsFromFeedbackRows(
			benchmarkCanaryFeedbackRows
		),
	];
}

function getBenchmarkCanaryControlRows() {
	return [
		...benchmarkCanaryCoverageStatusRows,
		...benchmarkCanaryFeedbackRows,
	];
}

async function readBenchmarkCanaryFeedbackText() {
	try {
		return await fs.readFile( BENCHMARK_CANARY_FEEDBACK_MD_PATH, 'utf8' );
	} catch {
		return '';
	}
}

function getBenchmarkCanaryCasesFromText( text ) {
	const cases = new Set();
	const normalized = String( text ?? '' ).toLowerCase();
	for ( const benchmarkCase of Object.keys(
		BENCHMARK_CANARY_GROUP_BY_CASE
	) ) {
		if ( normalized.includes( benchmarkCase.toLowerCase() ) ) {
			cases.add( benchmarkCase );
		}
	}
	if (
		/title[^.\n]*reload[^.\n]*http|http[^.\n]*title[^.\n]*reload/.test(
			normalized
		)
	) {
		cases.add( 'title-reload-http' );
	}
	if (
		/persistence[^.\n]*reload[^.\n]*http|existing-post[^.\n]*crdt|http[^.\n]*persistence[^.\n]*reload/.test(
			normalized
		)
	) {
		cases.add( 'persistence-reload-http' );
	}
	return cases;
}

function addBenchmarkCanaryGroupsForCase( groups, benchmarkCase ) {
	const primaryGroup = BENCHMARK_CANARY_GROUP_BY_CASE[ benchmarkCase ];
	if ( primaryGroup ) {
		groups.add( primaryGroup );
	}
	for ( const group of BENCHMARK_CANARY_ADDITIONAL_GROUPS_BY_CASE[
		benchmarkCase
	] ?? [] ) {
		groups.add( group );
	}
}

function getBenchmarkCanaryGroupsForCoverageStatusRow( row ) {
	const groups = new Set();
	for ( const benchmarkCase of String( row.cases ?? '' )
		.split( ',' )
		.map( ( value ) => value.trim() )
		.filter( Boolean ) ) {
		addBenchmarkCanaryGroupsForCase( groups, benchmarkCase );
	}
	if (
		groups.size === 0 &&
		row.group &&
		[
			...Object.values( BENCHMARK_CANARY_GROUP_BY_CASE ),
			...Object.values(
				BENCHMARK_CANARY_ADDITIONAL_GROUPS_BY_CASE
			).flat(),
		].includes( row.group )
	) {
		groups.add( row.group );
	}
	return [ ...groups ];
}

function shouldForcePersistenceProbeFromCoverageStatusRow( row ) {
	if ( row.group === 'novelty-http-persistence-probe' ) {
		return true;
	}
	return getBenchmarkCanaryGroupsForCoverageStatusRow( row ).includes(
		'novelty-http-existing-post-crdt-metadata'
	);
}

function getBenchmarkCanaryForcedGroups( rows, feedbackText = '' ) {
	const groups = new Set();
	for ( const row of rows ) {
		if ( isBenchmarkCanaryCoverageStatusRow( row ) ) {
			if (
				isOpenBenchmarkCanaryCoverageStatusRow( row ) &&
				PROFILE_BY_GROUP[ row.group ]
			) {
				groups.add( row.group );
			}
			if (
				shouldForcePersistenceProbeFromCoverageStatusRow( row ) &&
				PROFILE_BY_GROUP[ 'novelty-http-persistence-probe' ]
			) {
				groups.add( 'novelty-http-persistence-probe' );
			}
			continue;
		}
		const benchmarkCase = getBenchmarkCanaryCase( row );
		addBenchmarkCanaryGroupsForCase( groups, benchmarkCase );
		for ( const inferredCase of getBenchmarkCanaryCasesFromText(
			Object.values( row ).join( '\n' )
		) ) {
			addBenchmarkCanaryGroupsForCase( groups, inferredCase );
		}
	}
	for ( const benchmarkCase of getBenchmarkCanaryCasesFromText(
		feedbackText
	) ) {
		addBenchmarkCanaryGroupsForCase( groups, benchmarkCase );
	}
	if ( groups.has( 'novelty-http-existing-post-crdt-metadata' ) ) {
		groups.add( 'novelty-http-persistence-probe' );
	}
	return groups;
}

function getBenchmarkCanaryForcedGroupsForStatus() {
	const groups = new Set( benchmarkCanaryForcedGroups );
	const markerGroups = String( state.benchmarkCanaryFeedbackMarker ?? '' )
		.split( '|' )
		.at( -1 )
		?.split( ',' );
	for ( const group of markerGroups ?? [] ) {
		if ( PROFILE_BY_GROUP[ group ] ) {
			groups.add( group );
		}
	}
	for ( const change of state.changes ?? [] ) {
		for ( const group of change.forcedGroups ?? [] ) {
			if ( PROFILE_BY_GROUP[ group ] ) {
				groups.add( group );
			}
		}
	}
	return [ ...groups ].sort();
}

function isBenchmarkCanaryForcedGroup( group ) {
	return benchmarkCanaryForcedGroups.has( group );
}

function requiresDirectCurrentRunBenchmarkCanaryClosure( group ) {
	return (
		isDeadlineBenchmarkCanaryBudgetCapActive() &&
		DEADLINE_DIRECT_CURRENT_RUN_BENCHMARK_CANARY_GROUP_SET.has( group )
	);
}

function getBenchmarkCanaryFeedbackRowForGroup( group ) {
	return benchmarkCanaryFeedbackRows.find( ( row ) => {
		if ( isBenchmarkCanaryCoverageStatusRow( row ) ) {
			return (
				row.group === group &&
				isExactStackOpenBenchmarkCanaryCoverageStatusRow( row ) &&
				! isCurrentFeedbackExactStackCoverageStatusRow( row )
			);
		}
		if ( ! isBenchmarkCanaryFeedbackPromotionBlockedRow( row ) ) {
			return false;
		}
		return getBenchmarkCanaryGroupsForFeedbackRow( row ).includes( group );
	} );
}

function getBenchmarkCanaryFeedbackReason( group ) {
	const matchingRows = getBenchmarkCanaryControlRows().filter( ( row ) => {
		if ( isBenchmarkCanaryCoverageStatusRow( row ) ) {
			return (
				row.group === group &&
				isOpenBenchmarkCanaryCoverageStatusRow( row )
			);
		}
		const benchmarkCase = getBenchmarkCanaryCase( row );
		return [
			BENCHMARK_CANARY_GROUP_BY_CASE[ benchmarkCase ],
			...( BENCHMARK_CANARY_ADDITIONAL_GROUPS_BY_CASE[ benchmarkCase ] ??
				[] ),
		].includes( group );
	} );
	if ( matchingRows.length === 0 ) {
		return null;
	}

	if ( matchingRows.some( isBenchmarkCanaryCoverageStatusRow ) ) {
		const hasExactStackCoverageStatusRow = matchingRows.some(
			( row ) =>
				isExactStackOpenBenchmarkCanaryCoverageStatusRow( row ) &&
				! isCurrentFeedbackExactStackCoverageStatusRow( row )
		);
		return hasExactStackCoverageStatusRow
			? 'benchmark canary coverage status requires exact-stack green or explicit downscope before this forced lane can stop consuming protected capacity'
			: 'benchmark canary coverage status requires equivalent current-run fuzz coverage or explicit downscope before this forced lane can stop consuming protected capacity';
	}

	const cases = uniqueStringList(
		matchingRows.map( ( row ) => getBenchmarkCanaryCase( row ) )
	).join( ',' );
	return `benchmark canary feedback requires equivalent fuzz coverage for ${ cases }; this forced lane remains subject to current duplicate/noise admission before supervisor publication`;
}

function getBenchmarkCanaryCasesForGroup( group ) {
	const cases = new Set();
	for ( const row of getBenchmarkCanaryControlRows() ) {
		if ( isBenchmarkCanaryCoverageStatusRow( row ) ) {
			if ( row.group === group ) {
				for ( const benchmarkCase of String( row.cases ?? '' )
					.split( ',' )
					.map( ( value ) => value.trim() )
					.filter( Boolean ) ) {
					cases.add( benchmarkCase );
				}
			}
			continue;
		}
		const rowCases = new Set( [
			getBenchmarkCanaryCase( row ),
			...getBenchmarkCanaryCasesFromText(
				Object.values( row ).join( '\n' )
			),
		] );
		for ( const benchmarkCase of rowCases ) {
			const mappedGroups = [
				BENCHMARK_CANARY_GROUP_BY_CASE[ benchmarkCase ],
				...( BENCHMARK_CANARY_ADDITIONAL_GROUPS_BY_CASE[
					benchmarkCase
				] ?? [] ),
			];
			if ( mappedGroups.includes( group ) ) {
				cases.add( benchmarkCase );
			}
		}
	}
	for ( const [ benchmarkCase, mappedGroup ] of Object.entries(
		BENCHMARK_CANARY_GROUP_BY_CASE
	) ) {
		if ( mappedGroup === group ) {
			cases.add( benchmarkCase );
		}
	}
	for ( const [ benchmarkCase, groups ] of Object.entries(
		BENCHMARK_CANARY_ADDITIONAL_GROUPS_BY_CASE
	) ) {
		if ( groups.includes( group ) ) {
			cases.add( benchmarkCase );
		}
	}
	return [ ...cases ].filter( Boolean ).sort();
}

function getBenchmarkCanaryExplicitBlocker( group ) {
	return state.benchmarkCanaryExplicitBlockers?.[ group ] ?? null;
}

function hasBenchmarkCanaryExactStackPromotionBlocker( group ) {
	if ( hasBenchmarkCanaryClosureEvidence( group ) ) {
		return false;
	}
	if (
		getCurrentBenchmarkCanaryCoverageStatusRowsForGroup( group ).some(
			( row ) =>
				isExactStackOpenBenchmarkCanaryCoverageStatusRow( row ) &&
				! isCurrentFeedbackExactStackCoverageStatusRow( row )
		)
	) {
		return true;
	}
	return benchmarkCanaryFeedbackRows.some( ( row ) => {
		if ( isBenchmarkCanaryCoverageStatusRow( row ) ) {
			return (
				row.group === group &&
				isExactStackOpenBenchmarkCanaryCoverageStatusRow( row ) &&
				! isCurrentFeedbackExactStackCoverageStatusRow( row )
			);
		}
		return (
			isBenchmarkCanaryFeedbackPromotionBlockedRow( row ) &&
			getBenchmarkCanaryGroupsForFeedbackRow( row ).includes( group )
		);
	} );
}

function isBenchmarkCanaryExplicitlyBlocked( group ) {
	return !! getBenchmarkCanaryExplicitBlocker( group )?.kind;
}

function isBenchmarkCanaryExplicitlyDownscoped( group ) {
	return /downscope/i.test(
		String( getBenchmarkCanaryExplicitBlocker( group )?.kind ?? '' )
	);
}

function isDeadlineBlockedBenchmarkCanaryGroup( group ) {
	const blocker = getBenchmarkCanaryExplicitBlocker( group );
	return blocker?.kind === 'deadline-downscope-final-ui-witness';
}

function hasOpenBenchmarkCanaryPromotionBlocker( group ) {
	if (
		hasCurrentOpenBenchmarkCanaryCoverageStatusRow( group ) &&
		PROFILE_BY_GROUP[ group ] &&
		! isBenchmarkCanaryExplicitlyDownscoped( group ) &&
		! isDeadlineBlockedBenchmarkCanaryGroup( group )
	) {
		return true;
	}
	return (
		isBenchmarkCanaryForcedGroup( group ) &&
		PROFILE_BY_GROUP[ group ] &&
		! isBenchmarkCanaryExplicitlyDownscoped( group ) &&
		! isDeadlineBlockedBenchmarkCanaryGroup( group ) &&
		! hasBenchmarkCanaryClosureEvidence( group )
	);
}

function isDeadlineFinalizationProtectedBenchmarkCanaryGroup( group ) {
	return (
		isDeadlineBenchmarkCanaryBudgetCapActive() &&
		! hasCurrentClosedBenchmarkCanaryCoverageStatusRow( group ) &&
		( hasOpenBenchmarkCanaryPromotionBlocker( group ) ||
			DEADLINE_PROMOTION_BLOCKED_BENCHMARK_CANARY_GROUP_SET.has(
				group
			) ||
			DEADLINE_FINALIZATION_BENCHMARK_CANARY_GROUP_SET.has( group ) ||
			DEADLINE_PRIMARY_HTTP_BENCHMARK_CANARY_GROUP_SET.has( group ) ) &&
		! isDeadlineBlockedBenchmarkCanaryGroup( group ) &&
		( hasOpenBenchmarkCanaryPromotionBlocker( group ) ||
			! hasBenchmarkCanaryClosureEvidence( group ) )
	);
}

function shouldProtectOpenBenchmarkCanaryPromotionGroup( group ) {
	return (
		hasOpenBenchmarkCanaryPromotionBlocker( group ) ||
		shouldPinCurrentOpenBenchmarkCanaryStatusGroup( group ) ||
		isDeadlineFinalizationProtectedBenchmarkCanaryGroup( group )
	);
}

function isDeadlineP0BenchmarkCanaryGroup( group ) {
	return (
		DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY &&
		( DEADLINE_P0_BENCHMARK_CANARY_GROUP_SET.has( group ) ||
			DEADLINE_PRIMARY_HTTP_BENCHMARK_CANARY_GROUP_SET.has( group ) )
	);
}

function hasBenchmarkCanarySuccessfulCurrentRunRecord( group ) {
	return (
		( state.currentRunSuccessfulRecordCountsByGroup?.[ group ] ?? 0 ) > 0
	);
}

function hasBenchmarkCanaryCurrentRunRecord( group ) {
	return ( state.currentRunRecordCountsByGroup?.[ group ] ?? 0 ) > 0;
}

function hasBenchmarkCanaryRetainedCurrentRootSuccess( group ) {
	return (
		( state.benchmarkCanaryRetainedSuccessfulRecordCountsByGroup?.[
			group
		] ?? 0 ) > 0
	);
}

function hasBenchmarkCanaryRetainedProductEvidence( group ) {
	return (
		Math.max(
			state.benchmarkCanaryNoAnalysisProductEvidenceByGroup?.[ group ] ??
				0,
			state.benchmarkCanarySupervisorProductEvidenceByGroup?.[ group ] ??
				0
		) > 0
	);
}

function getBenchmarkCanaryDeadlineClosureScope() {
	return {
		outputDir: OUTPUT_DIR,
		headCommit: CURRENT_REPO_HEAD_COMMIT ?? 'unknown',
		policyVersion: BENCHMARK_CANARY_DEADLINE_CLOSURE_POLICY_VERSION,
	};
}

function getBenchmarkCanaryDeadlineClosureScopeKey() {
	const scope = getBenchmarkCanaryDeadlineClosureScope();
	return [
		path.resolve( scope.outputDir ),
		scope.headCommit,
		scope.policyVersion,
	].join( '|' );
}

function getBenchmarkCanaryDeadlineClosure( group ) {
	const closure = state.benchmarkCanaryDeadlineClosuresByGroup?.[ group ];
	if ( ! closure ) {
		return null;
	}
	if (
		closure.policyVersion !==
		BENCHMARK_CANARY_DEADLINE_CLOSURE_POLICY_VERSION
	) {
		return null;
	}
	if (
		closure.scopeKey &&
		closure.scopeKey !== getBenchmarkCanaryDeadlineClosureScopeKey()
	) {
		return null;
	}
	if (
		closure.outputDir &&
		path.resolve( closure.outputDir ) !== path.resolve( OUTPUT_DIR )
	) {
		return null;
	}
	if (
		closure.headCommit &&
		CURRENT_REPO_HEAD_COMMIT &&
		closure.headCommit !== CURRENT_REPO_HEAD_COMMIT
	) {
		return null;
	}
	return closure;
}

function hasBenchmarkCanaryStickyDeadlineClosure( group ) {
	const closure = getBenchmarkCanaryDeadlineClosure( group );
	return (
		closure?.currentRunGreen === true || closure?.explicitDownscope === true
	);
}

function hasBenchmarkCanaryCurrentOutputDirectCurrentRunClosure( group ) {
	const closure = getBenchmarkCanaryDeadlineClosure( group );
	return (
		closure?.currentRunGreen === true &&
		closure.closureSource === 'direct-current-run-success' &&
		!! closure.closureRunDir &&
		isPathInsideRoot( closure.closureRunDir, OUTPUT_DIR )
	);
}

function getBenchmarkCanaryStickyDeadlineClosureSource( group ) {
	const closure = getBenchmarkCanaryDeadlineClosure( group );
	if ( closure?.explicitDownscope === true ) {
		return 'sticky-explicit-downscope';
	}
	if ( closure?.currentRunGreen === true ) {
		return 'sticky-deadline-current-run-green';
	}
	if ( closure?.coverageReady === true ) {
		return closure.closureSource || 'sticky-deadline-coverage-ready';
	}
	return '';
}

function rememberBenchmarkCanaryDeadlineClosure(
	group,
	{
		currentRunGreen = false,
		explicitDownscope = false,
		coverageReady = false,
		closureSource = '',
		closureRunDir = '',
	} = {}
) {
	if (
		! isDeadlineBenchmarkCanaryBudgetCapActive() ||
		! isBenchmarkCanaryForcedGroup( group ) ||
		( ! currentRunGreen && ! explicitDownscope && ! coverageReady )
	) {
		return;
	}
	state.benchmarkCanaryDeadlineClosuresByGroup ??= {};
	const scope = getBenchmarkCanaryDeadlineClosureScope();
	const previous = getBenchmarkCanaryDeadlineClosure( group );
	const incomingClosureRunDir = closureRunDir || '';
	const previousClosureRunDir = previous?.closureRunDir || '';
	const incomingCurrentOutput =
		!! incomingClosureRunDir &&
		isPathInsideRoot( incomingClosureRunDir, OUTPUT_DIR );
	const previousCurrentOutput =
		!! previousClosureRunDir &&
		isPathInsideRoot( previousClosureRunDir, OUTPUT_DIR );
	const shouldPreferIncomingClosure =
		!! incomingClosureRunDir &&
		( currentRunGreen || explicitDownscope || coverageReady ) &&
		( incomingCurrentOutput ||
			! previousClosureRunDir ||
			! previousCurrentOutput );
	const fallbackClosureSource = explicitDownscope
		? 'explicit-downscope'
		: currentRunGreen
		? 'direct-current-run-success'
		: '';
	state.benchmarkCanaryDeadlineClosuresByGroup[ group ] = {
		...( previous ?? {} ),
		...scope,
		scopeKey: getBenchmarkCanaryDeadlineClosureScopeKey(),
		group,
		at: previous?.at ?? new Date().toISOString(),
		lastSeenAt: new Date().toISOString(),
		currentRunGreen:
			previous?.currentRunGreen === true || currentRunGreen === true,
		explicitDownscope:
			previous?.explicitDownscope === true || explicitDownscope === true,
		coverageReady:
			previous?.coverageReady === true ||
			currentRunGreen === true ||
			explicitDownscope === true,
		closureSource: shouldPreferIncomingClosure
			? closureSource || previous?.closureSource || fallbackClosureSource
			: previous?.closureSource || closureSource || fallbackClosureSource,
		closureRunDir: shouldPreferIncomingClosure
			? incomingClosureRunDir
			: previousClosureRunDir || incomingClosureRunDir,
	};
}

async function importBenchmarkCanaryDeadlineClosuresFromStatus() {
	if ( ! isDeadlineBenchmarkCanaryBudgetCapActive() ) {
		return 0;
	}
	const statusPaths = uniquePathList( [
		BENCHMARK_CANARY_COVERAGE_STATUS_PATH,
		...HISTORICAL_OBSERVED_RUN_DIRS.map( ( root ) =>
			path.join( root, 'benchmark-canary-coverage-status.tsv' )
		),
	] );
	let imported = 0;
	for ( const statusPath of statusPaths ) {
		const text = await fs.readFile( statusPath, 'utf8' ).catch( () => '' );
		if ( ! text.trim() ) {
			continue;
		}
		imported += importBenchmarkCanaryDeadlineClosuresFromStatusText(
			text,
			statusPath
		);
	}
	if ( imported > 0 ) {
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'import-sticky-benchmark-canary-deadline-closures',
			count: imported,
			reason: 'preserved only current-run green or explicit downscope closures from benchmark-canary status before a new coverage root could reopen rows',
		} );
	}
	return imported;
}

function importBenchmarkCanaryDeadlineClosuresFromStatusText(
	text,
	statusPath = ''
) {
	const lines = text.split( '\n' ).filter( ( line ) => line.trim() );
	const headers = lines.shift()?.split( '\t' ) ?? [];
	const groupIndex = headers.indexOf( 'group' );
	const currentRunGreenIndex = headers.indexOf( 'current_run_green' );
	const explicitDownscopeIndex = headers.indexOf( 'explicit_downscope' );
	const closureSourceIndex = headers.indexOf( 'closure_source' );
	const closureRunDirIndex = headers.indexOf( 'closure_run_dir' );
	if (
		groupIndex < 0 ||
		currentRunGreenIndex < 0 ||
		explicitDownscopeIndex < 0
	) {
		return 0;
	}
	let imported = 0;
	for ( const line of lines ) {
		const cells = line.split( '\t' );
		const group = cells[ groupIndex ];
		if ( ! group || ! isBenchmarkCanaryForcedGroup( group ) ) {
			continue;
		}
		const currentRunGreen = cells[ currentRunGreenIndex ] === 'yes';
		const explicitDownscope = cells[ explicitDownscopeIndex ] === 'yes';
		const closureSource =
			closureSourceIndex >= 0 ? cells[ closureSourceIndex ] : '';
		const closureRunDir =
			closureRunDirIndex >= 0 ? cells[ closureRunDirIndex ] : '';
		const currentRunSuccessCountIndex = headers.indexOf(
			'current_run_successful_group_records'
		);
		const currentRunSuccessCount =
			currentRunSuccessCountIndex >= 0
				? Number( cells[ currentRunSuccessCountIndex ] ?? 0 )
				: 0;
		const directCurrentRunGreen =
			currentRunGreen &&
			closureSource === 'direct-current-run-success' &&
			Number.isFinite( currentRunSuccessCount ) &&
			currentRunSuccessCount > 0;
		if ( ! directCurrentRunGreen && ! explicitDownscope ) {
			continue;
		}
		const before = getBenchmarkCanaryDeadlineClosure( group );
		rememberBenchmarkCanaryDeadlineClosure( group, {
			currentRunGreen: directCurrentRunGreen,
			explicitDownscope,
			closureSource,
			closureRunDir: closureRunDir || path.dirname( statusPath ),
		} );
		if ( ! before ) {
			imported += 1;
		}
	}
	return imported;
}

function hasBenchmarkCanaryDeadlineClosureEvidence( group ) {
	return (
		hasBenchmarkCanarySuccessfulCurrentRunRecord( group ) ||
		isBenchmarkCanaryExplicitlyDownscoped( group )
	);
}

function hasBenchmarkCanaryClosureEvidence( group ) {
	if (
		isDeadlineBenchmarkCanaryBudgetCapActive() &&
		isBenchmarkCanaryForcedGroup( group )
	) {
		if ( hasBenchmarkCanarySuccessfulCurrentRunRecord( group ) ) {
			return true;
		}
		if (
			requiresDirectCurrentRunBenchmarkCanaryClosure( group ) &&
			hasBenchmarkCanaryCurrentOutputDirectCurrentRunClosure( group )
		) {
			return true;
		}
		if ( hasCurrentOpenBenchmarkCanaryCoverageStatusRow( group ) ) {
			return false;
		}
		if ( requiresDirectCurrentRunBenchmarkCanaryClosure( group ) ) {
			return isBenchmarkCanaryExplicitlyDownscoped( group );
		}
		if ( hasCurrentClosedBenchmarkCanaryCoverageStatusRow( group ) ) {
			return true;
		}
		return hasBenchmarkCanaryDeadlineClosureEvidence( group );
	}
	return (
		hasBenchmarkCanarySuccessfulCurrentRunRecord( group ) ||
		hasBenchmarkCanaryRetainedCurrentRootSuccess( group ) ||
		hasBenchmarkCanaryRetainedProductEvidence( group ) ||
		isBenchmarkCanaryExplicitlyBlocked( group )
	);
}

function isDeadlineBenchmarkCanaryBudgetCapActive() {
	return (
		benchmarkCanaryForcedGroups.size > 0 &&
		( DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY ||
			DEADLINE_BENCHMARK_CANARY_BUDGET_CAP )
	);
}

function shouldKeepBenchmarkCanaryRunningThroughNoisePause(
	group,
	{
		reasonKind,
		productEvidenceRecords = null,
		hasProductEvidence = null,
	} = {}
) {
	if ( ! isBenchmarkCanaryForcedGroup( group ) ) {
		return false;
	}
	if (
		! [ 'known-noise', 'triage-duplicate-noise' ].includes( reasonKind )
	) {
		return false;
	}
	if ( isDeadlineFinalizationProtectedBenchmarkCanaryGroup( group ) ) {
		return true;
	}
	if ( hasBenchmarkCanaryClosureEvidence( group ) ) {
		return false;
	}
	if (
		hasProductEvidence === true ||
		( Number.isFinite( productEvidenceRecords ) &&
			productEvidenceRecords > 0 )
	) {
		return false;
	}
	return true;
}

function getBenchmarkCanarySchedulingLimit() {
	if ( isDeadlineBenchmarkCanaryBudgetCapActive() ) {
		const authoritativeFloorGroups =
			getAuthoritativeOpenBenchmarkCanaryFloorGroups();
		if ( authoritativeFloorGroups.length > 0 ) {
			return Math.min(
				MAX_ENABLED_GROUPS,
				Math.max(
					DEADLINE_BENCHMARK_CANARY_MIN_ENABLED_GROUPS,
					authoritativeFloorGroups.length
				)
			);
		}
		const unclosedMaterializableGroups =
			getBenchmarkCanarySchedulingCandidateGroups().filter(
				( group ) =>
					PROFILE_BY_GROUP[ group ] &&
					! isDeadlineBlockedBenchmarkCanaryGroup( group ) &&
					( hasOpenBenchmarkCanaryPromotionBlocker( group ) ||
						! hasBenchmarkCanaryClosureEvidence( group ) )
			);
		if ( unclosedMaterializableGroups.length === 0 ) {
			return 0;
		}
		return Math.min(
			MAX_ENABLED_GROUPS,
			Math.max(
				DEADLINE_BENCHMARK_CANARY_MIN_ENABLED_GROUPS,
				unclosedMaterializableGroups.length
			)
		);
	}
	return MAX_ENABLED_GROUPS;
}

function getUnblockedBenchmarkCanaryDeficitGroups(
	groups = getBenchmarkCanarySchedulingCandidateGroups()
) {
	return [ ...groups ].filter(
		( group ) =>
			PROFILE_BY_GROUP[ group ] &&
			! isBenchmarkCanaryExplicitlyBlocked( group ) &&
			( hasOpenBenchmarkCanaryPromotionBlocker( group ) ||
				! hasBenchmarkCanaryClosureEvidence( group ) )
	);
}

function getDeadlineDeferredBenchmarkCanaryGroups(
	unblockedDeficitGroups = getUnblockedBenchmarkCanaryDeficitGroups()
) {
	if ( unblockedDeficitGroups.length === 0 ) {
		return [];
	}
	return [ ...benchmarkCanaryForcedGroups ].filter(
		( group ) =>
			PROFILE_BY_GROUP[ group ] &&
			! isDeadlineFinalizationProtectedBenchmarkCanaryGroup( group ) &&
			isDeadlineBlockedBenchmarkCanaryGroup( group )
	);
}

function getDeferredBenchmarkCanaryForcedGroupSet() {
	return new Set(
		[
			...( state.deferredBenchmarkCanaryGroupsForZeroCoverage ?? [] ),
			...( state.deferredBenchmarkCanaryGroupsForDeadline ?? [] ),
		].filter(
			( group ) =>
				! hasOpenBenchmarkCanaryPromotionBlocker( group ) &&
				! hasCurrentOpenBenchmarkCanaryCoverageStatusRow( group ) &&
				! isDeadlineP0BenchmarkCanaryGroup( group ) &&
				! isDeadlineFinalizationProtectedBenchmarkCanaryGroup( group )
		)
	);
}

function isDeferredBenchmarkCanaryForcedGroup( group ) {
	return getDeferredBenchmarkCanaryForcedGroupSet().has( group );
}

function compareBenchmarkCanaryCoverageSchedulingNeed( left, right ) {
	const leftRepairPriority =
		hasOpenBenchmarkCanaryProductRepairPriorityRow( left );
	const rightRepairPriority =
		hasOpenBenchmarkCanaryProductRepairPriorityRow( right );
	if ( leftRepairPriority !== rightRepairPriority ) {
		return leftRepairPriority ? -1 : 1;
	}
	const leftNeedsCoverage = needsBenchmarkCanaryCoverageForScheduling( left );
	const rightNeedsCoverage =
		needsBenchmarkCanaryCoverageForScheduling( right );
	if ( leftNeedsCoverage !== rightNeedsCoverage ) {
		return leftNeedsCoverage ? -1 : 1;
	}
	const priorityDelta =
		( BENCHMARK_CANARY_PRIORITY_INDEX.get( left ) ?? 1000 ) -
		( BENCHMARK_CANARY_PRIORITY_INDEX.get( right ) ?? 1000 );
	if ( priorityDelta !== 0 ) {
		return priorityDelta;
	}
	return left.localeCompare( right );
}

function orderBenchmarkCanaryGroupsForCoverageScheduling( groups ) {
	return uniqueStringList( groups ).sort(
		compareBenchmarkCanaryCoverageSchedulingNeed
	);
}

function hasOpenBenchmarkCanaryProductRepairPriorityRow( group ) {
	return getCurrentBenchmarkCanaryCoverageStatusRowsForGroup( group ).some(
		( row ) =>
			row.promotion_blocked === 'yes' &&
			row.current_run_green !== 'yes' &&
			row.explicit_downscope !== 'yes' &&
			( row.retained_product_evidence === 'yes' ||
				getBenchmarkCanaryCoverageStatusNumber(
					row,
					'product_evidence_records'
				) > 0 ||
				String( row.coverage_state ?? '' ).includes(
					'product-failure'
				) )
	);
}

function getBenchmarkCanarySchedulingRank( group ) {
	if ( hasOpenBenchmarkCanaryProductRepairPriorityRow( group ) ) {
		return -1;
	}
	if ( hasCurrentOpenBenchmarkCanaryCoverageStatusRow( group ) ) {
		return 0;
	}
	if ( hasCurrentClosedBenchmarkCanaryCoverageStatusRow( group ) ) {
		return 8;
	}
	if ( isDeadlineFinalizationProtectedBenchmarkCanaryGroup( group ) ) {
		return 0;
	}
	const explicitBlocker = isBenchmarkCanaryExplicitlyBlocked( group );

	if ( explicitBlocker ) {
		return 7;
	}
	const hasClosureEvidence = hasBenchmarkCanaryClosureEvidence( group );
	if (
		isDeadlineBenchmarkCanaryBudgetCapActive() &&
		DEADLINE_FINALIZATION_BENCHMARK_CANARY_GROUP_SET.has( group ) &&
		! hasClosureEvidence
	) {
		return 0;
	}
	if ( ! hasClosureEvidence ) {
		return 1;
	}
	const hasSuccess = hasBenchmarkCanarySuccessfulCurrentRunRecord( group );
	const primary = isPrimaryBenchmarkCanaryGroup( group );
	const primaryHttp = primary && group.startsWith( 'novelty-http-' );
	if (
		DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY &&
		group === 'novelty-http-large-post-lifecycle' &&
		! hasSuccess
	) {
		return 2;
	}
	if (
		DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY &&
		primaryHttp &&
		! hasSuccess
	) {
		return 3;
	}
	if ( isDeadlineP0BenchmarkCanaryGroup( group ) && ! hasSuccess ) {
		return 4;
	}
	if ( primary && ! hasSuccess ) {
		return 5;
	}
	if ( hasSuccess ) {
		return 7;
	}
	if ( isDeadlineP0BenchmarkCanaryGroup( group ) ) {
		return 6;
	}
	if ( primary ) {
		return 6;
	}

	const hasRecords = hasBenchmarkCanaryCurrentRunRecord( group );
	if ( ! hasRecords && group.startsWith( 'novelty-http-' ) ) {
		return 6;
	}
	if ( ! hasRecords ) {
		return 6;
	}
	return 6;
}

function getPrioritizedBenchmarkCanaryForcedGroups() {
	const prioritizedGroups = [ ...benchmarkCanaryForcedGroups ]
		.filter( ( group ) => PROFILE_BY_GROUP[ group ] )
		.sort( ( left, right ) => {
			const rankDelta =
				getBenchmarkCanarySchedulingRank( left ) -
				getBenchmarkCanarySchedulingRank( right );
			if ( rankDelta !== 0 ) {
				return rankDelta;
			}
			const priorityDelta =
				( BENCHMARK_CANARY_PRIORITY_INDEX.get( left ) ?? 1000 ) -
				( BENCHMARK_CANARY_PRIORITY_INDEX.get( right ) ?? 1000 );
			if ( priorityDelta !== 0 ) {
				return priorityDelta;
			}
			return left.localeCompare( right );
		} );
	return reserveBenchmarkCanaryWsBackfillSlots( prioritizedGroups );
}

function getScheduledBenchmarkCanaryForcedGroups() {
	const prioritizedGroups = getPrioritizedBenchmarkCanaryForcedGroups();
	if ( ! isDeadlineBenchmarkCanaryBudgetCapActive() ) {
		return prioritizedGroups;
	}
	const schedulingCandidateGroups = new Set(
		getBenchmarkCanarySchedulingCandidateGroups()
	);
	const isMaterializableUnclosedForcedGroup = ( group ) =>
		schedulingCandidateGroups.has( group ) &&
		PROFILE_BY_GROUP[ group ] &&
		( shouldProtectOpenBenchmarkCanaryPromotionGroup( group ) ||
			! getBenchmarkCanaryNoProductStartupNoiseBlock( group ) ) &&
		! isDeadlineBlockedBenchmarkCanaryGroup( group ) &&
		( hasOpenBenchmarkCanaryPromotionBlocker( group ) ||
			! hasBenchmarkCanaryClosureEvidence( group ) );
	const liveOpenPromotionBlockedGroups = prioritizedGroups.filter(
		hasOpenBenchmarkCanaryPromotionBlocker
	);
	const statusOpenPromotionBlockedGroups = uniqueStringList(
		benchmarkCanaryCoverageStatusRows
			.filter( isOpenBenchmarkCanaryCoverageStatusRow )
			.map( ( row ) => row.group )
			.filter( ( group ) => PROFILE_BY_GROUP[ group ] )
	);
	const statusOpenDirectCurrentRunGroups =
		statusOpenPromotionBlockedGroups.filter(
			requiresDirectCurrentRunBenchmarkCanaryClosure
		);
	const statusOpenPrimaryWithoutRetainedSuccess =
		statusOpenPromotionBlockedGroups.filter(
			( group ) =>
				isPrimaryBenchmarkCanaryGroup( group ) &&
				! requiresDirectCurrentRunBenchmarkCanaryClosure( group ) &&
				! hasBenchmarkCanaryRetainedCurrentRootSuccess( group )
		);
	const statusOpenPrimaryWithRetainedSuccess =
		statusOpenPromotionBlockedGroups.filter(
			( group ) =>
				isPrimaryBenchmarkCanaryGroup( group ) &&
				! requiresDirectCurrentRunBenchmarkCanaryClosure( group ) &&
				hasBenchmarkCanaryRetainedCurrentRootSuccess( group )
		);
	const statusOpenSecondaryPromotionBlockedGroups =
		statusOpenPromotionBlockedGroups.filter(
			( group ) =>
				! isPrimaryBenchmarkCanaryGroup( group ) &&
				! requiresDirectCurrentRunBenchmarkCanaryClosure( group )
		);
	const statusOpenCurrentRunPriorityGroups =
		DEADLINE_CURRENT_RUN_SLOT_PRIORITY_GROUPS.filter( ( group ) =>
			statusOpenPromotionBlockedGroups.includes( group )
		);
	const statusOpenProductRepairPriorityGroups =
		statusOpenPromotionBlockedGroups.filter(
			hasOpenBenchmarkCanaryProductRepairPriorityRow
		);
	const deadlinePrimaryPromotionBlockedGroups =
		DEADLINE_PROMOTION_BLOCKED_BENCHMARK_CANARY_GROUPS.filter(
			isPrimaryBenchmarkCanaryGroup
		);
	const deadlineSecondaryPromotionBlockedGroups =
		DEADLINE_PROMOTION_BLOCKED_BENCHMARK_CANARY_GROUPS.filter(
			( group ) => ! isPrimaryBenchmarkCanaryGroup( group )
		);
	const activeMaterializedPromotionBlockedGroups =
		getActiveMaterializedBenchmarkCanaryGroups().filter( ( group ) =>
			DEADLINE_PROMOTION_BLOCKED_BENCHMARK_CANARY_GROUP_SET.has( group )
		);
	const deadlinePreferredGroups = uniqueStringList( [
		...statusOpenProductRepairPriorityGroups,
		...statusOpenCurrentRunPriorityGroups,
		...statusOpenPrimaryWithoutRetainedSuccess,
		...statusOpenDirectCurrentRunGroups,
		...statusOpenSecondaryPromotionBlockedGroups,
		...liveOpenPromotionBlockedGroups.filter(
			isPrimaryBenchmarkCanaryGroup
		),
		...liveOpenPromotionBlockedGroups.filter(
			( group ) => ! isPrimaryBenchmarkCanaryGroup( group )
		),
		...deadlinePrimaryPromotionBlockedGroups,
		...DEADLINE_PRIMARY_HTTP_BENCHMARK_CANARY_GROUPS,
		...DEADLINE_PRIMARY_WS_BENCHMARK_CANARY_GROUPS,
		...activeMaterializedPromotionBlockedGroups.filter(
			isPrimaryBenchmarkCanaryGroup
		),
		...DEADLINE_FINALIZATION_BENCHMARK_CANARY_GROUPS,
		...deadlineSecondaryPromotionBlockedGroups,
		...activeMaterializedPromotionBlockedGroups.filter(
			( group ) => ! isPrimaryBenchmarkCanaryGroup( group )
		),
		...statusOpenPrimaryWithRetainedSuccess,
	] );
	return uniqueStringList( [
		...deadlinePreferredGroups.filter(
			isMaterializableUnclosedForcedGroup
		),
		...prioritizedGroups.filter( isMaterializableUnclosedForcedGroup ),
	] );
}

function getScheduledBenchmarkCanaryGroupsForBudget() {
	const authoritativeFloorGroups =
		getAuthoritativeOpenBenchmarkCanaryFloorGroups();
	if (
		isDeadlineBenchmarkCanaryBudgetCapActive() &&
		authoritativeFloorGroups.length > 0
	) {
		return orderBenchmarkCanaryGroupsForCoverageScheduling(
			authoritativeFloorGroups
		).slice( 0, getBenchmarkCanarySchedulingLimit() );
	}
	return getScheduledBenchmarkCanaryForcedGroups().slice(
		0,
		getBenchmarkCanarySchedulingLimit()
	);
}

function getProtectedBenchmarkCanaryGroupsForBudget() {
	const authoritativeOpenGroups =
		getAuthoritativeOpenBenchmarkCanaryFloorGroups();
	const authoritativeOpenGroupSet = new Set( authoritativeOpenGroups );
	const deferredBenchmarkCanaryGroups =
		getDeferredBenchmarkCanaryForcedGroupSet();
	return uniqueStringList( [
		...authoritativeOpenGroups,
		...getScheduledBenchmarkCanaryGroupsForBudget(),
		...getCurrentOpenBenchmarkCanaryCoverageStatusGroups(),
	] )
		.filter(
			( group ) =>
				PROFILE_BY_GROUP[ group ] &&
				! deferredBenchmarkCanaryGroups.has( group ) &&
				( authoritativeOpenGroupSet.has( group ) ||
					shouldProtectOpenBenchmarkCanaryPromotionGroup( group ) )
		)
		.sort( compareBenchmarkCanaryCoverageSchedulingNeed )
		.slice( 0, getBenchmarkCanarySchedulingLimit() );
}

function isWsBenchmarkCanaryGroup( group ) {
	return (
		isBenchmarkCanaryForcedGroup( group ) &&
		( group.startsWith( 'novelty-ws-' ) ||
			PROFILE_GROUPS.find( ( profile ) => profile.name === group )
				?.transport === 'ws' )
	);
}

function getActiveMaterializedBenchmarkCanaryGroups() {
	return getRunGroupsForRunDirs( state.currentRunDirs ?? [] ).filter(
		( group ) =>
			isBenchmarkCanaryForcedGroup( group ) &&
			! isDeferredBenchmarkCanaryForcedGroup( group ) &&
			! hasBenchmarkCanaryClosureEvidence( group )
	);
}

function getCurrentOutputActiveRunDirsForGroupState( groupState ) {
	const currentOutputRoot = `${ path.resolve( OUTPUT_DIR ) }${ path.sep }`;
	return ( groupState?.activeRunDirs ?? [] ).filter( ( runDir ) =>
		path.resolve( runDir ).startsWith( currentOutputRoot )
	);
}

function hasSupervisorGroupCurrentRunSummaryRecord( groupState ) {
	const summary = groupState?.startupStallNoiseSummary;
	return (
		( summary?.lines ?? 0 ) > 0 ||
		( summary?.strictStartupRecords ?? 0 ) > 0 ||
		( summary?.productEvidenceRecords ?? 0 ) > 0 ||
		( summary?.otherRecords ?? 0 ) > 0
	);
}

function shouldDwellActiveForcedWsBenchmarkCanary( group, groupState ) {
	return (
		isDeadlineBenchmarkCanaryBudgetCapActive() &&
		isWsBenchmarkCanaryGroup( group ) &&
		! isDeferredBenchmarkCanaryForcedGroup( group ) &&
		! hasBenchmarkCanaryClosureEvidence( group ) &&
		ACTIVE_GROUP_STATUSES.has( groupState?.status ) &&
		getCurrentOutputActiveRunDirsForGroupState( groupState ).length > 0 &&
		! hasSupervisorGroupCurrentRunSummaryRecord( groupState )
	);
}

function hasRecentDeadlineBenchmarkCanaryStartupRetry( group, pause ) {
	const retry = state.deadlineBenchmarkCanaryStartupRetriesByGroup?.[ group ];
	if ( ! retry ) {
		return false;
	}
	const expiresAtMs = Date.parse( retry.expiresAt ?? '' );
	if ( ! Number.isFinite( expiresAtMs ) || expiresAtMs <= Date.now() ) {
		delete state.deadlineBenchmarkCanaryStartupRetriesByGroup[ group ];
		return false;
	}
	if (
		pause?.at &&
		retry.sourcePauseAt &&
		retry.sourcePauseAt !== pause.at
	) {
		return false;
	}
	return true;
}

function recordDeadlineBenchmarkCanaryStartupRetry( group, pause ) {
	if (
		! isDeadlineBenchmarkCanaryBudgetCapActive() ||
		! isWsBenchmarkCanaryGroup( group ) ||
		! isNoProductStartupNoiseCooldown( pause )
	) {
		return;
	}
	state.deadlineBenchmarkCanaryStartupRetriesByGroup ??= {};
	state.deadlineBenchmarkCanaryStartupRetriesByGroup[ group ] = {
		at: new Date().toISOString(),
		expiresAt: getStartupNoiseCooldownBypassExpiresAt( pause ),
		sourcePauseAt: pause?.at,
		sourcePauseReason: pause?.reason,
		outputDir: OUTPUT_DIR,
		headCommit: CURRENT_REPO_HEAD_COMMIT ?? 'unknown',
		reason:
			getBenchmarkCanaryFeedbackReason( group ) ??
			'deadline benchmark-canary feedback requires one bounded retry before downscope',
	};
}

function shouldBypassDeadlineBenchmarkCanaryStartupPause( group, pause ) {
	return (
		isDeadlineBenchmarkCanaryBudgetCapActive() &&
		isWsBenchmarkCanaryGroup( group ) &&
		! isDeferredBenchmarkCanaryForcedGroup( group ) &&
		! hasBenchmarkCanaryClosureEvidence( group ) &&
		isNoProductStartupNoiseCooldown( pause ) &&
		! hasRecentDeadlineBenchmarkCanaryStartupRetry( group, pause )
	);
}

function reserveBenchmarkCanaryWsBackfillSlots( prioritizedGroups ) {
	if ( isDeadlineBenchmarkCanaryBudgetCapActive() ) {
		return prioritizedGroups;
	}
	const deferredGroups = getDeferredBenchmarkCanaryForcedGroupSet();
	const pinnedDeadlineHttpGroups = DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY
		? DEADLINE_P0_BENCHMARK_CANARY_GROUPS.filter(
				( group ) =>
					PROFILE_BY_GROUP[ group ] &&
					! deferredGroups.has( group ) &&
					! isBenchmarkCanaryExplicitlyBlocked( group )
		  )
		: [];
	const materializableWsGroups = prioritizedGroups.filter(
		( group ) =>
			isWsBenchmarkCanaryGroup( group ) &&
			! deferredGroups.has( group ) &&
			! isBenchmarkCanaryExplicitlyBlocked( group )
	);
	const wsSlots = Math.min(
		BENCHMARK_CANARY_WS_BACKFILL_SLOTS,
		Math.max( 0, MAX_ENABLED_GROUPS - pinnedDeadlineHttpGroups.length ),
		materializableWsGroups.length
	);
	if ( wsSlots <= 0 || prioritizedGroups.length <= wsSlots ) {
		return prioritizedGroups;
	}

	const reservedWsGroups = materializableWsGroups.slice( 0, wsSlots );
	const reservedWsGroupSet = new Set( reservedWsGroups );
	const nonWsGroups = prioritizedGroups.filter(
		( group ) =>
			! isWsBenchmarkCanaryGroup( group ) &&
			! reservedWsGroupSet.has( group )
	);
	const nonWsPrefixSlots = Math.max( 0, MAX_ENABLED_GROUPS - wsSlots );
	const nonWsPrefixGroups = nonWsGroups.slice( 0, nonWsPrefixSlots );
	const nonWsPrefixGroupSet = new Set( nonWsPrefixGroups );

	return uniqueStringList( [
		...nonWsPrefixGroups,
		...reservedWsGroups,
		...prioritizedGroups.filter(
			( group ) =>
				! nonWsPrefixGroupSet.has( group ) &&
				! reservedWsGroupSet.has( group )
		),
	] );
}

function orderEnabledGroupsForSupervisor( enabledGroups ) {
	const enabled = new Set( enabledGroups ?? [] );
	const openCanaryFloorGroups = isDeadlineBenchmarkCanaryBudgetCapActive()
		? getAuthoritativeOpenBenchmarkCanaryFloorGroups().filter( ( group ) =>
				enabled.has( group )
		  )
		: [];
	const coverageQualityRepairPriorityGroups =
		getCoverageQualityRepairPriorityGroups().filter( ( group ) =>
			enabled.has( group )
		);
	const gapPriorityGroups = uniqueStringList( [
		...coverageQualityRepairPriorityGroups,
		...ZERO_COVERAGE_PRIORITY_GROUPS,
		...SUCCESS_DEFICIT_BOOTSTRAP_GROUPS,
		...( state.coverageGuidance?.unmetGoals ?? [] ).flatMap(
			( goal ) => goal.groups ?? []
		),
	] ).filter( ( group ) => enabled.has( group ) );
	const strictBudgetGapPriorityGroups = STRICT_PRODUCER_BUDGET_CAP
		? gapPriorityGroups
		: [];
	const openBenchmarkCanaryGroups =
		getPrioritizedBenchmarkCanaryForcedGroups().filter(
			( group ) =>
				enabled.has( group ) &&
				hasOpenBenchmarkCanaryPromotionBlocker( group )
		);
	return uniqueStringList( [
		...openCanaryFloorGroups,
		...openBenchmarkCanaryGroups,
		...coverageQualityRepairPriorityGroups,
		...strictBudgetGapPriorityGroups,
		...getActivePolicyRequiredBootstrapGroups().filter( ( group ) =>
			enabled.has( group )
		),
		...gapPriorityGroups,
		...getScheduledBenchmarkCanaryForcedGroups().filter( ( group ) =>
			enabled.has( group )
		),
		...( enabledGroups ?? [] ),
	] ).filter( ( group ) => enabled.has( group ) );
}

function shouldBypassBenchmarkCanaryNoisePause( group, pause ) {
	if ( ! isBenchmarkCanaryForcedGroup( group ) ) {
		return false;
	}
	if ( isNoProductStartupNoiseCooldown( pause ) ) {
		return shouldBypassDeadlineBenchmarkCanaryStartupPause( group, pause );
	}
	if (
		shouldBypassBenchmarkCanaryProductEvidenceDuplicateHold( group, pause )
	) {
		return true;
	}
	return (
		getStoredNoisePauseKind( pause ) === 'startup-noise' &&
		hasPauseProductEvidence( pause )
	);
}

function shouldBypassBenchmarkCanaryProductEvidenceDuplicateHold(
	group,
	hold
) {
	if (
		! isBenchmarkCanaryForcedGroup( group ) ||
		isNoProductStartupNoiseCooldown( hold ) ||
		! (
			isBenchmarkCanaryProductEvidenceDuplicatePause( hold ) ||
			isProductEvidenceDuplicateProducerHold( hold, group )
		)
	) {
		return false;
	}
	if ( ! isCurrentRunProductEvidenceDuplicateSchedulingHold( hold ) ) {
		return true;
	}
	return ! hasBenchmarkCanarySuccessfulCurrentRunRecord( group );
}

function isCurrentRunProductEvidenceDuplicateSchedulingHold( hold ) {
	if ( ! isProductEvidenceDuplicateProducerHold( hold ) ) {
		return false;
	}
	if ( isActionGateProductEvidenceDuplicateHold( hold ) ) {
		return true;
	}
	const source = String( hold?.source ?? '' );
	if (
		/(?:^|-)action-gate(?:-|$)|current-run|local-current-run/i.test(
			source
		)
	) {
		return true;
	}
	if (
		source === 'raw-product-evidence-family' ||
		source === 'actionable-product-evidence-family'
	) {
		return true;
	}
	if ( /current-run/i.test( String( hold?.scope ?? '' ) ) ) {
		return true;
	}
	if (
		hold?.currentOutputPause === true ||
		isCurrentOutputPause( hold ) ||
		( typeof hold?.originOutputDir === 'string' &&
			path.resolve( hold.originOutputDir ) ===
				path.resolve( OUTPUT_DIR ) )
	) {
		return true;
	}
	return false;
}

function isBenchmarkCanaryProductEvidenceDuplicatePause( pause ) {
	return (
		getStoredNoisePauseKind( pause ) === 'triage-duplicate-noise' &&
		hasProductEvidenceDuplicatePauseEvidence( pause )
	);
}

function isBenchmarkCanarySeedDrainStartupNoiseCooldown( pause ) {
	return (
		isNoProductStartupNoiseCooldown( pause ) &&
		/seed drain|below pause threshold|cumulative startup-noise seed/i.test(
			pause?.reason ?? ''
		)
	);
}

function isStaleBenchmarkCanaryStartupNoiseCooldown( pause ) {
	if ( ! isNoProductStartupNoiseCooldown( pause ) ) {
		return false;
	}
	if ( isCurrentOutputStartupNoiseCooldown( pause ) ) {
		return false;
	}
	return (
		pause?.reusableStartupNoisePause === true ||
		pause?.currentOutputPause === false ||
		( typeof pause?.originOutputDir === 'string' &&
			path.resolve( pause.originOutputDir ) !==
				path.resolve( OUTPUT_DIR ) )
	);
}

function getBenchmarkCanaryNoProductStartupNoiseBlock( group ) {
	const activePause = getActiveNoisePauseCooldown( group );
	if ( shouldBypassBenchmarkCanaryNoisePause( group, activePause ) ) {
		return null;
	}
	if ( isNoProductStartupNoiseCooldown( activePause ) ) {
		return activePause;
	}

	const storedPause = getActiveNoisePauseForEntry(
		group,
		state.pausedGroups?.[ group ]
	);
	if ( shouldBypassBenchmarkCanaryNoisePause( group, storedPause ) ) {
		return null;
	}
	if ( isNoProductStartupNoiseCooldown( storedPause ) ) {
		return storedPause;
	}

	// Fleet-wide startup-noise holds throttle generic admission; a
	// benchmark-canary user-hit equivalent still gets one lane unless this
	// exact group has a current no-product cooldown.
	return null;
}

function recordBenchmarkCanaryNoProductStartupNoiseBlock(
	action,
	group,
	pause
) {
	state.benchmarkCanaryStartupNoiseBlockMarkers ??= {};
	const marker = [
		OUTPUT_DIR,
		action,
		group,
		pause?.at ?? '',
		pause?.expiresAt ?? '',
		pause?.reason ?? '',
	].join( '|' );
	const markerKey = `${ action }:${ group }`;
	if (
		state.benchmarkCanaryStartupNoiseBlockMarkers[ markerKey ] === marker
	) {
		return;
	}
	state.benchmarkCanaryStartupNoiseBlockMarkers[ markerKey ] = marker;
	const blockReason =
		action === 'block-supervisor-group-startup-noise'
			? `supervisor group writing cannot include ${ group } while a no-product startup-noise cooldown from ${
					pause?.at ?? 'unknown'
			  } is active: ${ pause?.reason ?? 'unknown startup-noise pause' }`
			: `benchmark canary feedback cannot override no-product startup-noise cooldown from ${
					pause?.at ?? 'unknown'
			  }: ${ pause?.reason ?? 'unknown startup-noise pause' }`;
	state.changes.push( {
		at: new Date().toISOString(),
		action,
		group,
		reason: blockReason,
		...( pause?.expiresAt ? { expiresAt: pause.expiresAt } : {} ),
		...( pause?.originGroup ? { originGroup: pause.originGroup } : {} ),
		...( pause?.originOutputDir
			? { originOutputDir: pause.originOutputDir }
			: {} ),
		reasonKind: 'startup-noise',
		family: 'pre_action_bootstrap_stall',
		noProductOnly: true,
		productEvidenceRecords: 0,
		preserveProductEvidence: true,
	} );
}

function getSupervisorGroupPublicationNoiseBlock( group ) {
	if ( isDeadlineFinalizationProtectedBenchmarkCanaryGroup( group ) ) {
		return null;
	}
	const activeNoisePause = getActiveNoisePauseCooldown( group );
	if ( ! activeNoisePause ) {
		const currentRunDuplicateHold =
			getCurrentRunProductEvidencePublicationHold( group );
		if ( ! currentRunDuplicateHold ) {
			return null;
		}
		if (
			shouldBypassProductEvidenceDuplicateHoldForSuccessDeficit(
				group,
				currentRunDuplicateHold
			)
		) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'bypass-supervisor-publication-success-deficit-duplicate-hold',
				group,
				family: currentRunDuplicateHold.family,
				source: currentRunDuplicateHold.source,
				reason: getSuccessDeficitBypassReason( group ),
			} );
			return null;
		}
		if (
			shouldBypassBenchmarkCanaryProductEvidenceDuplicateHold(
				group,
				currentRunDuplicateHold
			)
		) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'bypass-benchmark-canary-supervisor-duplicate-hold',
				group,
				family: currentRunDuplicateHold.family,
				source: currentRunDuplicateHold.source,
				reason:
					getBenchmarkCanaryFeedbackReason( group ) ??
					'benchmark canary feedback requires this equivalent fuzz lane; product-evidence duplicate holds cap analysis but must not suppress materialization',
			} );
			return null;
		}
		if (
			shouldBypassProductEvidenceDuplicateHoldForStalledCoverageGap(
				group,
				currentRunDuplicateHold
			)
		) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'bypass-supervisor-publication-stalled-coverage-gap-duplicate-hold',
				group,
				family: currentRunDuplicateHold.family,
				source: currentRunDuplicateHold.source,
				reason: getStalledCoverageGuidanceGapReason( group ),
			} );
			return null;
		}
		const productEvidenceRecords = Number(
			currentRunDuplicateHold.productEvidenceRecords
		);
		return {
			action: isBenchmarkCanaryForcedGroup( group )
				? 'block-benchmark-canary-supervisor-group-duplicate-noise'
				: 'block-supervisor-group-duplicate-noise',
			pause: currentRunDuplicateHold,
			reason: `final supervisor group publication cannot include ${ group } while current-run product-evidence duplicate family ${
				currentRunDuplicateHold.family ?? 'unknown'
			} is already represented; preserve one triage representative without requeueing the held producer`,
			metadata: {
				reasonKind:
					currentRunDuplicateHold.kind ?? 'triage-duplicate-noise',
				family: currentRunDuplicateHold.family,
				source:
					currentRunDuplicateHold.source ??
					'current-run-product-evidence-duplicate',
				noProductOnly: false,
				productEvidenceRecords:
					Number.isFinite( productEvidenceRecords ) &&
					productEvidenceRecords > 0
						? productEvidenceRecords
						: currentRunDuplicateHold.count ?? 1,
				hasProductEvidence: true,
				...( currentRunDuplicateHold.expiresAt
					? { expiresAt: currentRunDuplicateHold.expiresAt }
					: {} ),
			},
		};
	}
	if ( isNoProductStartupNoiseCooldown( activeNoisePause ) ) {
		if (
			shouldBypassNoisePauseForSuccessDeficit( group, activeNoisePause )
		) {
			delete state.pausedGroups?.[ group ];
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'bypass-supervisor-publication-success-deficit-startup-noise',
				group,
				reason: getSuccessDeficitBypassReason( group ),
				sourcePauseAt: activeNoisePause.at,
				sourcePauseReason: activeNoisePause.reason,
				expiresAt: activeNoisePause.expiresAt,
				...( activeNoisePause.originGroup
					? { originGroup: activeNoisePause.originGroup }
					: {} ),
			} );
			return null;
		}
		return {
			action: isBenchmarkCanaryForcedGroup( group )
				? 'block-benchmark-canary-supervisor-group-startup-noise'
				: 'block-supervisor-group-startup-noise',
			pause: activeNoisePause,
			reason: `final supervisor group publication cannot include ${ group } while a no-product startup-noise cooldown from ${
				activeNoisePause.at ?? 'unknown'
			} is active: ${
				activeNoisePause.reason ?? 'unknown startup-noise pause'
			}`,
			metadata: {
				reasonKind: 'startup-noise',
				family: 'pre_action_bootstrap_stall',
				source: activeNoisePause.source ?? 'active-noise-cooldown',
				noProductOnly: true,
				productEvidenceRecords: 0,
				hasProductEvidence: false,
				...( activeNoisePause.expiresAt
					? { expiresAt: activeNoisePause.expiresAt }
					: {} ),
			},
		};
	}
	if ( isProductEvidenceDuplicateProducerHold( activeNoisePause, group ) ) {
		if (
			shouldBypassProductEvidenceDuplicateHoldForSuccessDeficit(
				group,
				activeNoisePause
			)
		) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'bypass-supervisor-publication-success-deficit-noise-pause',
				group,
				family: activeNoisePause.family,
				source: activeNoisePause.source,
				reason: getSuccessDeficitBypassReason( group ),
			} );
			return null;
		}
		if (
			shouldBypassBenchmarkCanaryProductEvidenceDuplicateHold(
				group,
				activeNoisePause
			)
		) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'bypass-benchmark-canary-supervisor-active-duplicate-hold',
				group,
				family: activeNoisePause.family,
				source: activeNoisePause.source,
				reason:
					getBenchmarkCanaryFeedbackReason( group ) ??
					'benchmark canary feedback requires this equivalent fuzz lane; product-evidence duplicate holds cap analysis but must not suppress materialization',
			} );
			return null;
		}
		if (
			shouldBypassProductEvidenceDuplicateHoldForStalledCoverageGap(
				group,
				activeNoisePause
			)
		) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'bypass-supervisor-publication-stalled-coverage-gap-noise-pause',
				group,
				family: activeNoisePause.family,
				source: activeNoisePause.source,
				reason: getStalledCoverageGuidanceGapReason( group ),
				sourcePauseAt: activeNoisePause.at,
				sourcePauseReason: activeNoisePause.reason,
				expiresAt: activeNoisePause.expiresAt,
			} );
			return null;
		}
		const productEvidenceRecords = Number(
			activeNoisePause.productEvidenceRecords
		);
		return {
			action: isBenchmarkCanaryForcedGroup( group )
				? 'block-benchmark-canary-supervisor-group-duplicate-noise'
				: 'block-supervisor-group-duplicate-noise',
			pause: activeNoisePause,
			reason: `final supervisor group publication cannot include ${ group } while product-evidence duplicate family ${
				activeNoisePause.family ?? 'unknown'
			} is already represented; preserve one triage representative without requeueing the held producer`,
			metadata: {
				reasonKind: activeNoisePause.kind ?? 'triage-duplicate-noise',
				family: activeNoisePause.family,
				source: activeNoisePause.source ?? 'active-noise-cooldown',
				noProductOnly: false,
				productEvidenceRecords:
					Number.isFinite( productEvidenceRecords ) &&
					productEvidenceRecords > 0
						? productEvidenceRecords
						: 1,
				hasProductEvidence: true,
				...( activeNoisePause.expiresAt
					? { expiresAt: activeNoisePause.expiresAt }
					: {} ),
			},
		};
	}
	return null;
}

function getCurrentRunProductEvidencePublicationHold( group ) {
	const triageYield = state.triageYieldCurrent;
	if ( ! triageYield ) {
		return null;
	}

	const actionGateHold = getProductEvidenceActionGateHoldForScheduling(
		withRunDirProducerGroups(
			getCurrentRunActionGateDuplicateHold( triageYield ),
			state.currentRunDirs ?? []
		),
		triageYield
	);
	const familyHold = getCurrentRunProductEvidenceDuplicateHold(
		triageYield,
		state.currentRunDirs ?? []
	);
	for ( const hold of [ actionGateHold, familyHold ] ) {
		if (
			isProductEvidenceDuplicateProducerHold( hold ) &&
			shouldProductEvidenceDuplicateHoldBlockGroup( hold, group ) &&
			! shouldBypassProductEvidenceDuplicateHoldForSuccessDeficit(
				group,
				hold
			) &&
			! shouldBypassBenchmarkCanaryProductEvidenceDuplicateHold(
				group,
				hold
			)
		) {
			return hold;
		}
	}
	return null;
}

function recordSupervisorGroupPublicationNoiseBlock( group, block ) {
	state.supervisorGroupPublicationNoiseBlockMarkers ??= {};
	const pause = block?.pause;
	const marker = [
		OUTPUT_DIR,
		block?.action ?? '',
		group,
		pause?.at ?? '',
		pause?.expiresAt ?? '',
		pause?.reason ?? block?.reason ?? '',
		pause?.family ?? block?.metadata?.family ?? '',
	].join( '|' );
	const markerKey = `${
		block?.action ?? 'block-supervisor-group'
	}:${ group }`;
	if (
		state.supervisorGroupPublicationNoiseBlockMarkers[ markerKey ] ===
		marker
	) {
		return;
	}
	state.supervisorGroupPublicationNoiseBlockMarkers[ markerKey ] = marker;
	state.changes.push( {
		at: new Date().toISOString(),
		action: block?.action ?? 'block-supervisor-group-noise',
		group,
		reason: block?.reason,
		...( block?.metadata?.reasonKind
			? { reasonKind: block.metadata.reasonKind }
			: {} ),
		...( block?.metadata?.family ? { family: block.metadata.family } : {} ),
		...( block?.metadata?.source ? { source: block.metadata.source } : {} ),
		...( block?.metadata?.noProductOnly !== undefined
			? { noProductOnly: block.metadata.noProductOnly }
			: {} ),
		...( block?.metadata?.productEvidenceRecords !== undefined
			? { productEvidenceRecords: block.metadata.productEvidenceRecords }
			: {} ),
		...( block?.metadata?.hasProductEvidence !== undefined
			? { hasProductEvidence: block.metadata.hasProductEvidence }
			: {} ),
		...( block?.metadata?.expiresAt
			? { expiresAt: block.metadata.expiresAt }
			: {} ),
		preserveProductEvidence: true,
	} );
}

function applyBenchmarkCanaryFeedbackStateRepair() {
	let repaired = 0;
	for ( const group of benchmarkCanaryForcedGroups ) {
		const pausedEntry = state.pausedGroups?.[ group ];
		const activePause = getActiveNoisePauseForEntry( group, pausedEntry );
		const bypassPause = activePause ?? pausedEntry;
		if ( ! shouldBypassBenchmarkCanaryNoisePause( group, bypassPause ) ) {
			continue;
		}

		delete state.pausedGroups[ group ];
		delete state.startupFailureCountsByGroup?.[ group ];
		if ( getStoredNoisePauseKind( bypassPause ) === 'startup-noise' ) {
			recordDeadlineBenchmarkCanaryStartupRetry( group, bypassPause );
		}
		const profile = PROFILE_BY_GROUP[ group ];
		if ( profile ) {
			delete state.startupFailureCountsByProfile?.[ profile ];
		}
		state.changes.push( {
			at: new Date().toISOString(),
			action:
				getStoredNoisePauseKind( bypassPause ) === 'startup-noise'
					? 'bypass-benchmark-canary-startup-noise-cooldown'
					: 'bypass-benchmark-canary-product-evidence-duplicate-pause',
			group,
			reason:
				getBenchmarkCanaryFeedbackReason( group ) ??
				'benchmark canary feedback requires this equivalent fuzz lane',
			sourcePauseAt: bypassPause.at,
			sourcePauseReason: bypassPause.reason,
			expiresAt: bypassPause.expiresAt,
			originOutputDir: bypassPause.originOutputDir,
		} );
		repaired += 1;
	}
	return repaired;
}

function applyRtcOptionalSetupPluginFixStateRepair() {
	if (
		state.rtcOptionalSetupPluginFixVersion ===
		RTC_OPTIONAL_SETUP_PLUGIN_FIX_VERSION
	) {
		return 0;
	}

	state.rtcOptionalSetupPluginFixVersion =
		RTC_OPTIONAL_SETUP_PLUGIN_FIX_VERSION;

	let repaired = 0;
	for ( const group of benchmarkCanaryForcedGroups ) {
		const pausedEntry = state.pausedGroups?.[ group ];
		const activePause = getActiveNoisePauseForEntry( group, pausedEntry );
		if ( ! isNoProductStartupNoiseCooldown( activePause ) ) {
			continue;
		}

		const reason =
			'RTC fuzz setup now tolerates the optional CSS-animation test plugin being absent, so stale no-product bootstrap cooldowns must not suppress benchmark-canary equivalent coverage';
		recordStartupNoiseCooldownBypass( group, activePause, reason );
		delete state.pausedGroups[ group ];
		delete state.startupFailureCountsByGroup?.[ group ];
		delete state.startupFailureCountsByProfile?.[
			PROFILE_BY_GROUP[ group ]
		];
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'clear-benchmark-canary-startup-pause-after-optional-plugin-setup-fix',
			group,
			reason,
			sourcePauseAt: activePause.at,
			sourcePauseReason: activePause.reason,
			expiresAt: activePause.expiresAt,
			originOutputDir: activePause.originOutputDir,
		} );
		repaired += 1;
	}

	return repaired;
}

function applyLargeHttpLifecycleStartupFixStateRepair() {
	const group = 'novelty-http-large-post-lifecycle';
	const pausedEntry = state.pausedGroups?.[ group ];
	const activePause = getActiveNoisePauseForEntry( group, pausedEntry );
	if (
		! isNoProductStartupNoiseCooldown( activePause ) ||
		state.largeHttpLifecycleStartupFixVersion ===
			LARGE_HTTP_LIFECYCLE_STARTUP_FIX_VERSION
	) {
		return 0;
	}

	state.largeHttpLifecycleStartupFixVersion =
		LARGE_HTTP_LIFECYCLE_STARTUP_FIX_VERSION;
	delete state.pausedGroups[ group ];
	delete state.startupFailureCountsByGroup?.[ group ];
	delete state.startupFailureCountsByProfile?.[ PROFILE_BY_GROUP[ group ] ];
	state.changes.push( {
		at: new Date().toISOString(),
		action: 'clear-large-http-lifecycle-startup-pause-after-harness-fix',
		group,
		reason: 'large HTTP lifecycle now drains transient startup misses before pausing, so stale no-product bootstrap cooldowns must not suppress the benchmark-canary equivalent lane',
		sourcePauseAt: activePause.at,
		sourcePauseReason: activePause.reason,
		expiresAt: activePause.expiresAt,
	} );
	return 1;
}

function applyHttpProviderGatingStartupFixStateRepair() {
	if (
		state.httpProviderGatingStartupFixVersion ===
		HTTP_PROVIDER_GATING_STARTUP_FIX_VERSION
	) {
		return 0;
	}

	state.httpProviderGatingStartupFixVersion =
		HTTP_PROVIDER_GATING_STARTUP_FIX_VERSION;
	let repaired = 0;

	for ( const group of HTTP_PROVIDER_GATING_STARTUP_FIX_GROUPS ) {
		const pausedEntry = state.pausedGroups?.[ group ];
		const activePause = getActiveNoisePauseForEntry( group, pausedEntry );
		if ( ! isNoProductStartupNoiseCooldown( activePause ) ) {
			continue;
		}

		const reason =
			'HTTP sync-cycle wait observes in-flight polling completion, so stale no-product bootstrap cooldowns from older HTTP startup paths must not suppress HTTP gap coverage';
		recordStartupNoiseCooldownBypass( group, activePause, reason );
		delete state.pausedGroups[ group ];
		delete state.startupFailureCountsByGroup?.[ group ];
		delete state.startupFailureCountsByProfile?.[
			PROFILE_BY_GROUP[ group ]
		];
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'clear-http-provider-gating-startup-pause-after-harness-fix',
			group,
			reason,
			sourcePauseAt: activePause.at,
			sourcePauseReason: activePause.reason,
			expiresAt: activePause.expiresAt,
		} );
		repaired += 1;
	}

	return repaired;
}

function applyCollaborationReadinessStartupFixStateRepair() {
	if (
		state.collaborationReadinessStartupFixVersion ===
		COLLABORATION_READINESS_STARTUP_FIX_VERSION
	) {
		return 0;
	}

	state.collaborationReadinessStartupFixVersion =
		COLLABORATION_READINESS_STARTUP_FIX_VERSION;
	let repaired = 0;

	for ( const group of COLLABORATION_READINESS_STARTUP_FIX_GROUPS ) {
		const pausedEntry = state.pausedGroups?.[ group ];
		const activePause = getActiveNoisePauseForEntry( group, pausedEntry );
		if ( ! isNoProductStartupNoiseCooldown( activePause ) ) {
			continue;
		}

		const reason =
			'RTC fuzz global setup now verifies the collaboration writing option after updating it, so stale no-product collaboration-readiness cooldowns must not suppress UI signal and many-user gap coverage';
		recordStartupNoiseCooldownBypass( group, activePause, reason );
		delete state.pausedGroups[ group ];
		delete state.startupFailureCountsByGroup?.[ group ];
		delete state.startupFailureCountsByProfile?.[
			PROFILE_BY_GROUP[ group ]
		];
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'clear-collaboration-readiness-startup-pause-after-harness-fix',
			group,
			reason,
			sourcePauseAt: activePause.at,
			sourcePauseReason: activePause.reason,
			expiresAt: activePause.expiresAt,
		} );
		repaired += 1;
	}

	return repaired;
}

function applyManyUserJoinBatchStartupFixStateRepair() {
	if (
		state.manyUserJoinBatchStartupFixVersion ===
		MANY_USER_JOIN_BATCH_STARTUP_FIX_VERSION
	) {
		return 0;
	}

	state.manyUserJoinBatchStartupFixVersion =
		MANY_USER_JOIN_BATCH_STARTUP_FIX_VERSION;
	let repaired = 0;

	for ( const group of MANY_USER_JOIN_BATCH_STARTUP_FIX_GROUPS ) {
		const pausedEntry = state.pausedGroups?.[ group ];
		const activePause =
			getActiveNoisePauseForEntry( group, pausedEntry ) ??
			getRecentNoisePauseCooldownFromHistory( group );
		if ( ! isNoProductStartupNoiseCooldown( activePause ) ) {
			continue;
		}

		const reason =
			'many-user RTC profiles now join late collaborators in bounded batches, so stale no-product bootstrap cooldowns from the serial join path must not suppress many-user gap coverage';
		recordStartupNoiseCooldownBypass( group, activePause, reason );
		delete state.pausedGroups[ group ];
		delete state.startupFailureCountsByGroup?.[ group ];
		delete state.startupFailureCountsByProfile?.[
			PROFILE_BY_GROUP[ group ]
		];
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'clear-many-user-join-batch-startup-pause-after-harness-fix',
			group,
			reason,
			sourcePauseAt: activePause.at,
			sourcePauseReason: activePause.reason,
			expiresAt: activePause.expiresAt,
		} );
		repaired += 1;
	}

	return repaired;
}

function recordUnmaterializableBenchmarkCanaryForcedGroups( groups ) {
	const missingGroups = uniqueStringList(
		[ ...groups ].filter( ( group ) => ! PROFILE_BY_GROUP[ group ] )
	).sort();
	if ( missingGroups.length === 0 ) {
		return;
	}
	const marker = missingGroups.join( ',' );
	if ( state.benchmarkCanaryUnmaterializableGroupsMarker === marker ) {
		return;
	}
	state.benchmarkCanaryUnmaterializableGroupsMarker = marker;
	state.changes.push( {
		at: new Date().toISOString(),
		action: 'downscope-unmaterializable-benchmark-canary-forced-groups',
		groups: missingGroups,
		reason: 'benchmark canary feedback named group(s) without PROFILE_GROUPS entries; these cannot be written to supervisor-groups.json, so they are excluded from pending materialization until a profile is added or the feedback row is removed/downscoped',
		nextCodeChange:
			'add matching PROFILE_GROUPS entries or update BENCHMARK_CANARY_GROUP_BY_CASE/BENCHMARK_CANARY_ADDITIONAL_GROUPS_BY_CASE to materializable groups',
	} );
}

async function refreshBenchmarkCanaryFeedbackState( {
	recordLoad = false,
} = {} ) {
	const previousForcedGroupsKey = [ ...benchmarkCanaryForcedGroups ]
		.sort()
		.join( ',' );
	benchmarkCanaryFeedbackRows = await readBenchmarkCanaryFeedbackRows();
	benchmarkCanaryCoverageStatusRows =
		await readBenchmarkCanaryCoverageStatusRows();
	benchmarkCanaryFeedbackText = await readBenchmarkCanaryFeedbackText();
	const rawBenchmarkCanaryForcedGroups = getBenchmarkCanaryForcedGroups(
		getBenchmarkCanaryControlRows(),
		benchmarkCanaryFeedbackText
	);
	recordUnmaterializableBenchmarkCanaryForcedGroups(
		rawBenchmarkCanaryForcedGroups
	);
	benchmarkCanaryForcedGroups = new Set(
		[ ...rawBenchmarkCanaryForcedGroups ].filter(
			( group ) => PROFILE_BY_GROUP[ group ]
		)
	);

	if ( benchmarkCanaryForcedGroups.size === 0 ) {
		return 0;
	}

	const repairedBenchmarkCanaryPauses =
		applyBenchmarkCanaryFeedbackStateRepair();
	const repairedOptionalSetupPauses =
		applyRtcOptionalSetupPluginFixStateRepair();
	const forcedGroups = [ ...benchmarkCanaryForcedGroups ].sort();
	const forcedGroupsKey = forcedGroups.join( ',' );
	const feedbackIds = uniqueStringList(
		benchmarkCanaryFeedbackRows.map( ( row ) => row.feedback_id )
	).sort();
	const marker = [
		BENCHMARK_CANARY_FEEDBACK_TSV_PATH,
		feedbackIds.join( ',' ),
		forcedGroupsKey,
	].join( '|' );

	if (
		recordLoad ||
		repairedBenchmarkCanaryPauses > 0 ||
		repairedOptionalSetupPauses > 0 ||
		previousForcedGroupsKey !== forcedGroupsKey ||
		state.benchmarkCanaryFeedbackMarker !== marker
	) {
		state.benchmarkCanaryFeedbackMarker = marker;
		state.changes.push( {
			at: new Date().toISOString(),
			action: recordLoad
				? 'load-benchmark-canary-feedback'
				: 'refresh-benchmark-canary-feedback',
			feedbackPath: BENCHMARK_CANARY_FEEDBACK_TSV_PATH,
			feedbackIds,
			forcedGroups,
			repairedStartupNoisePauses:
				repairedBenchmarkCanaryPauses + repairedOptionalSetupPauses,
			reason: 'non-empty benchmark canary feedback is active; equivalent fuzz coverage must be scheduled before publication confidence can move',
		} );
	}

	return repairedBenchmarkCanaryPauses + repairedOptionalSetupPauses;
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

function syncProductFailureQuarantines( supervisorState ) {
	const detectedGroups = ( supervisorState?.groups ?? [] )
		.filter(
			( groupState ) =>
				groupState.status === 'paused-product-failure' ||
				Boolean( groupState.productFailureAt )
		)
		.map( ( groupState ) => groupState.name )
		.filter( Boolean )
		.sort();
	// State is carried only when the candidate head is unchanged. Keep an
	// actionable product failure quarantined across supervisor and run-root
	// restarts; a fresh supervisor has no failure rows yet and must not erase it.
	const groups = uniqueStringList( [
		...( state.productFailureQuarantinedGroups ?? [] ),
		...detectedGroups,
	] ).sort();
	const marker = groups.join( ',' );
	if ( state.productFailureQuarantineMarker !== marker ) {
		state.productFailureQuarantineMarker = marker;
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'sync-product-failure-quarantines',
			groups,
			reason: groups.length
				? 'actionable product failures remain publication gates but must not consume browser worker slots until the candidate changes'
				: 'no current-candidate product-failure quarantines remain',
		} );
	}
	state.productFailureQuarantinedGroups = groups;
	return new Set( groups );
}

async function syncProductFailureQuarantinesAndRepublish(
	supervisorState,
	source
) {
	const previousMarker = state.productFailureQuarantineMarker ?? '';
	const quarantines = syncProductFailureQuarantines( supervisorState );
	if ( state.productFailureQuarantineMarker === previousMarker ) {
		return quarantines;
	}

	if ( START_SUPERVISOR && ! PRODUCER_BUDGET_DISABLED ) {
		await writeSupervisorGroupsForEnabledGroups(
			state.enabledGroups ?? []
		);
	}
	await writeJsonFileAtomic( STATE_PATH, state );
	await log(
		`Republished supervisor groups after ${ source } discovered product-failure quarantines: ${ [
			...quarantines,
		].join( ',' ) }.`
	);
	return quarantines;
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
	const tmpPath = `${ filePath }.tmp-${
		process.pid
	}-${ Date.now() }-${ Math.random().toString( 16 ).slice( 2 ) }`;
	const safeValue = compactJsonValueForWrite( filePath, value );
	let serialized;
	try {
		serialized = JSON.stringify( safeValue, null, 2 ) + '\n';
	} catch ( error ) {
		if (
			filePath === STATE_PATH &&
			safeValue &&
			typeof safeValue === 'object' &&
			Array.isArray( safeValue.changes )
		) {
			compactNoveltyStateChanges( safeValue, 500, {
				reason: `emergency state compaction after JSON serialization failure: ${
					error.stack ?? error.message
				}`,
			} );
			serialized = JSON.stringify( safeValue, null, 2 ) + '\n';
		} else {
			throw error;
		}
	}
	if (
		filePath === STATE_PATH &&
		Buffer.byteLength( serialized ) > STATE_JSON_SOFT_MAX_BYTES &&
		safeValue &&
		typeof safeValue === 'object' &&
		Array.isArray( safeValue.changes ) &&
		safeValue.changes.length > 500
	) {
		compactNoveltyStateChanges( safeValue, 500, {
			reason: `state JSON exceeded soft maximum of ${ STATE_JSON_SOFT_MAX_BYTES } bytes; compacting history before write`,
		} );
		serialized = JSON.stringify( safeValue, null, 2 ) + '\n';
	}
	await fs.mkdir( path.dirname( filePath ), { recursive: true } );
	await fs.writeFile( tmpPath, serialized );
	await fs.rename( tmpPath, filePath );
}

function compactJsonValueForWrite( filePath, value ) {
	if ( filePath !== STATE_PATH || ! value || typeof value !== 'object' ) {
		return value;
	}
	if (
		Array.isArray( value.changes ) &&
		value.changes.length > STATE_CHANGE_HISTORY_LIMIT
	) {
		compactNoveltyStateChanges( value, STATE_CHANGE_HISTORY_LIMIT, {
			reason: 'bounded novelty-state change history so monitor health writes cannot be blocked by unbounded historical status events',
		} );
	}
	return value;
}

function compactNoveltyStateChanges( value, limit, options = {} ) {
	const changes = Array.isArray( value.changes ) ? value.changes : [];
	if ( changes.length <= limit ) {
		return;
	}
	const originalCount = changes.length;
	const retained = changes.slice( -limit );
	const compactedAt = new Date().toISOString();
	value.compactedChangeHistory = {
		at: compactedAt,
		originalCount,
		retainedCount: retained.length,
		droppedCount: originalCount - retained.length,
		limit,
		reason: options.reason,
	};
	value.changes = [
		{
			at: compactedAt,
			action: 'compact-novelty-state-change-history',
			originalCount,
			retainedCount: retained.length,
			droppedCount: originalCount - retained.length,
			limit,
			reason: options.reason,
		},
		...retained,
	];
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

function incrementNestedCounter( target, firstKey, secondKey, amount = 1 ) {
	target[ firstKey ] ??= {};
	incrementCounter( target[ firstKey ], secondKey, amount );
}

function mergeMaxCounters( ...counters ) {
	const merged = {};
	for ( const counter of counters ) {
		for ( const [ key, value ] of Object.entries( counter ?? {} ) ) {
			const numericValue = Number( value );
			if ( ! Number.isFinite( numericValue ) ) {
				continue;
			}
			merged[ key ] = Math.max( merged[ key ] ?? 0, numericValue );
		}
	}
	return merged;
}

function resetCurrentRunCounters() {
	state.currentRunRecordCountsByProfile = {};
	state.currentRunRecordCountsByGroup = {};
	state.currentRunRecordCountsByTransport = {};
	state.currentRunSuccessfulActionCountsByProfile = {};
	state.currentRunSuccessfulRecordCountsByProfile = {};
	state.currentRunSuccessfulRecordCountsByGroup = {};
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
			let groupDirs = getSupervisorPolicyActiveRunDirs( group );
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

function getSupervisorPolicyActiveRunDirs( group ) {
	if ( ! ACTIVE_GROUP_STATUSES.has( group?.status ) ) {
		return [];
	}
	const activeRunDirs = ( group.activeRunDirs ?? [] ).filter( Boolean );
	if ( activeRunDirs.length > 0 ) {
		return activeRunDirs;
	}
	if ( group.status === 'recovering' ) {
		return [];
	}
	return [ group.currentRunDir ].filter( Boolean );
}

function getSupervisorActiveRunDirSet( supervisorState ) {
	const activeRunDirs = new Set();
	for ( const group of supervisorState?.groups ?? [] ) {
		for ( const dir of getSupervisorPolicyActiveRunDirs( group ) ) {
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
		const supervisorActive = supervisorActiveRunDirs.has(
			path.resolve( runDir )
		);
		if ( ! group ) {
			return supervisorActive;
		}
		if ( ! supervisorActive ) {
			return false;
		}
		if ( state.pausedGroups?.[ group ] ) {
			if (
				! (
					isBenchmarkCanaryForcedGroup( group ) &&
					! isDeferredBenchmarkCanaryForcedGroup( group )
				)
			) {
				return false;
			}
		}
		if ( getSupervisorGroupPublicationNoiseBlock( group ) ) {
			return false;
		}
		if ( isBenchmarkCanaryForcedGroup( group ) ) {
			return ! isDeferredBenchmarkCanaryForcedGroup( group );
		}
		return enabled.has( group );
	} );
}

function updateCurrentRunDirReconciliation(
	supervisorState,
	currentRunDirs,
	currentRunDirsIncludingPausedNoAnalysis,
	source
) {
	const supervisorActiveRunDirs = [
		...getSupervisorActiveRunDirSet( supervisorState ),
	].sort();
	const policyActiveRunDirs = uniquePathList( currentRunDirs ).sort();
	const policyActiveSet = new Set(
		policyActiveRunDirs.map( ( runDir ) => path.resolve( runDir ) )
	);
	const supervisorActiveSet = new Set(
		supervisorActiveRunDirs.map( ( runDir ) => path.resolve( runDir ) )
	);
	const supervisorExtraOverPolicyPaths = supervisorActiveRunDirs.filter(
		( runDir ) => ! policyActiveSet.has( path.resolve( runDir ) )
	);
	const policyMissingFromSupervisorPaths = policyActiveRunDirs.filter(
		( runDir ) => ! supervisorActiveSet.has( path.resolve( runDir ) )
	);
	state.currentRunDirReconciliation = {
		at: new Date().toISOString(),
		outputDir: OUTPUT_DIR,
		source,
		supervisorPublishedActiveRunDirs: supervisorActiveRunDirs.length,
		policyActiveRunDirs: policyActiveRunDirs.length,
		currentRunDirs: policyActiveRunDirs.length,
		currentRunDirsIncludingPausedNoAnalysis: uniquePathList(
			currentRunDirsIncludingPausedNoAnalysis
		).length,
		policyMatchesCurrentRunDirs:
			getPathListKey( policyActiveRunDirs ) ===
			getPathListKey( state.currentRunDirs ?? [] ),
		supervisorExtraOverPolicyPaths,
		policyMissingFromSupervisorPaths,
		policyActiveRunDirPaths: policyActiveRunDirs,
		benchmarkCanaryStateMismatches:
			state.benchmarkCanaryStateMismatches ?? [],
		benchmarkCanaryInvariantStatus:
			state.benchmarkCanaryInvariantStatus ?? 'unknown',
	};
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
		if ( getSupervisorPolicyActiveRunDirs( group ).length > 0 ) {
			return 'supervisor-active-run-dirs';
		}
		if ( getSupervisorPausedNoAnalysisRunDirs( group ).length > 0 ) {
			return 'supervisor-paused-no-analysis-run-dirs';
		}
	}
	return 'supervisor-no-active-run-dirs';
}

function tsvCell( value ) {
	return String( value ?? '' ).replace( /[\t\r\n]+/g, ' ' );
}

function supervisorGroupByName( supervisorState ) {
	const byName = new Map();
	for ( const groupState of supervisorState?.groups ?? [] ) {
		if ( groupState?.name ) {
			byName.set( groupState.name, groupState );
		}
	}
	return byName;
}

function getGroupTransportForStatus( group ) {
	if ( group.startsWith( 'novelty-http-' ) ) {
		return 'http';
	}
	if ( group.startsWith( 'novelty-ws-' ) ) {
		return 'ws';
	}
	return 'unknown';
}

function isPrimaryBenchmarkCanaryGroup( group ) {
	return Object.values( BENCHMARK_CANARY_GROUP_BY_CASE ).includes( group );
}

async function summarizeRetainedCurrentRootCoverageSignals(
	coverageFiles = []
) {
	const files = uniquePathList( coverageFiles ).filter( ( filePath ) =>
		isPathInsideRoot( filePath, OUTPUT_DIR )
	);
	const records = await readAllCoverageRecords( files );
	const recordCountsByGroup = {};
	const successfulRecordCountsByGroup = {};
	const successfulRunDirsByGroup = {};
	const recordCountsByTransport = {};

	for ( const record of records ) {
		const group = getCoverageRecordGroupName( record );
		if ( ! group ) {
			continue;
		}
		const transport =
			record.transport ?? getGroupTransportForStatus( group );
		incrementCounter( recordCountsByGroup, group );
		incrementCounter( recordCountsByTransport, transport );
		if ( record.status === 'passed' ) {
			incrementCounter( successfulRecordCountsByGroup, group );
			const runDir = getCurrentOutputRunDirFromPath(
				record.coverageFile
			);
			if ( runDir ) {
				successfulRunDirsByGroup[ group ] ??= new Set();
				successfulRunDirsByGroup[ group ].add( path.resolve( runDir ) );
			}
		}
	}

	return {
		files: files.length,
		records: records.length,
		recordCountsByGroup,
		successfulRecordCountsByGroup,
		successfulRunDirsByGroup: Object.fromEntries(
			Object.entries( successfulRunDirsByGroup ).map(
				( [ group, runDirs ] ) => [ group, [ ...runDirs ].sort() ]
			)
		),
		recordCountsByTransport,
	};
}

function getNoAnalysisProductEvidenceRecordCount( sentinel ) {
	if ( sentinel?.preserveProductEvidence !== true ) {
		return 0;
	}
	const productEvidenceRecords = Number( sentinel.productEvidenceRecords );
	if (
		Number.isFinite( productEvidenceRecords ) &&
		productEvidenceRecords > 0
	) {
		return productEvidenceRecords;
	}
	if (
		sentinel.hasProductEvidence === true ||
		sentinel.noProductOnly === false
	) {
		return 1;
	}
	return 0;
}

async function summarizeNoAnalysisProductEvidenceByRunDirs(
	runDirs = [],
	rootDir = OUTPUT_DIR
) {
	const recordsByGroup = {};
	const runDirsByGroup = {};

	for ( const runDir of uniquePathList( runDirs ) ) {
		const sentinel = await readJsonFile(
			path.join( runDir, NO_ANALYSIS_SENTINEL_RELATIVE_PATH )
		);
		const productEvidenceRecords =
			getNoAnalysisProductEvidenceRecordCount( sentinel );
		if (
			productEvidenceRecords <= 0 ||
			! isActiveNoAnalysisSentinel( sentinel, {
				runDir,
				rootDir,
			} )
		) {
			continue;
		}
		const group = sentinel.group ?? getRunGroupNameFromPath( runDir );
		if ( group ) {
			incrementCounter( recordsByGroup, group, productEvidenceRecords );
			runDirsByGroup[ group ] ??= new Set();
			runDirsByGroup[ group ].add( path.resolve( runDir ) );
		}
	}

	return {
		recordsByGroup,
		runDirsByGroup: Object.fromEntries(
			Object.entries( runDirsByGroup ).map( ( [ group, runDirs ] ) => [
				group,
				[ ...runDirs ].sort(),
			] )
		),
	};
}

async function writeBenchmarkCanaryCoverageTelemetry(
	supervisorState,
	currentRunDirs,
	currentRootCoverageFiles = [],
	currentRunDirsIncludingPausedNoAnalysis = currentRunDirs
) {
	const groups = getBenchmarkCanaryForcedGroupsForStatus();
	if ( groups.length === 0 ) {
		return;
	}

	const updatedAt = new Date().toISOString();
	const groupStateByName = supervisorGroupByName( supervisorState );
	const policyActiveSet = new Set(
		uniquePathList( currentRunDirs ).map( ( runDir ) =>
			path.resolve( runDir )
		)
	);
	let retainedCoverageSignals =
		await summarizeRetainedCurrentRootCoverageSignals(
			currentRootCoverageFiles
		);
	if (
		retainedCoverageSignals.records === 0 ||
		Object.keys( retainedCoverageSignals.recordCountsByGroup ?? {} )
			.length === 0
	) {
		const currentOutputCoverageFiles = await findCoverageFiles( [
			OUTPUT_DIR,
		] );
		const currentOutputCoverageSignals =
			await summarizeRetainedCurrentRootCoverageSignals(
				currentOutputCoverageFiles
			);
		retainedCoverageSignals = {
			...currentOutputCoverageSignals,
			recordCountsByGroup: mergeMaxCounters(
				retainedCoverageSignals.recordCountsByGroup,
				currentOutputCoverageSignals.recordCountsByGroup
			),
			successfulRecordCountsByGroup: mergeMaxCounters(
				retainedCoverageSignals.successfulRecordCountsByGroup,
				currentOutputCoverageSignals.successfulRecordCountsByGroup
			),
			recordCountsByTransport: mergeMaxCounters(
				retainedCoverageSignals.recordCountsByTransport,
				currentOutputCoverageSignals.recordCountsByTransport
			),
			successfulRunDirsByGroup: {
				...( retainedCoverageSignals.successfulRunDirsByGroup ?? {} ),
				...( currentOutputCoverageSignals.successfulRunDirsByGroup ??
					{} ),
			},
			files: Math.max(
				retainedCoverageSignals.files ?? 0,
				currentOutputCoverageSignals.files ?? 0
			),
			records: Math.max(
				retainedCoverageSignals.records ?? 0,
				currentOutputCoverageSignals.records ?? 0
			),
		};
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'backfill-benchmark-canary-current-output-coverage',
			files: currentOutputCoverageSignals.files,
			records: currentOutputCoverageSignals.records,
			reason: 'benchmark-canary telemetry could not rely on active-run counters during startup; scanned the current output root directly so current-run canary rows do not stay falsely promotion-blocked',
		} );
	}
	const noAnalysisProductEvidence =
		await summarizeNoAnalysisProductEvidenceByRunDirs(
			currentRunDirsIncludingPausedNoAnalysis,
			OUTPUT_DIR
		);
	const rows = [
		[
			'updated_at',
			'source',
			'group',
			'cases',
			'profile',
			'forced',
			'live_forced',
			'primary',
			'promotion_blocked',
			'exact_stack_blocked',
			'exact_stack_source',
			'exact_stack_feedback_commit',
			'scheduled',
			'selection_source',
			'supervisor_status',
			'active',
			'active_run_dirs',
			'policy_active',
			'policy_active_run_dirs',
			'current_run_group_records',
			'current_run_successful_group_records',
			'transport',
			'current_run_transport_records',
			'coverage_ready',
			'current_run_green',
			'current_run_green_source',
			'closure_source',
			'closure_run_dir',
			'retained_product_evidence',
			'explicit_downscope',
			'status_only',
			'status_only_source',
			'coverage_state',
			'paused_no_analysis_run_dirs',
			'product_evidence_records',
			'reason',
		],
	];
	const promotionBlockedGroups = [];
	const primaryGroups = [];
	const recordCountsByGroup = {};
	const successfulRecordCountsByGroup = {};
	const recordCountsByTransport = {};
	const productFailureQuarantinedGroupSet = new Set(
		state.productFailureQuarantinedGroups ?? []
	);
	for ( const group of groups ) {
		const groupState = groupStateByName.get( group );
		const activeRunDirs = uniquePathList( groupState?.activeRunDirs ?? [] );
		const policyActiveRunDirs = activeRunDirs.filter( ( runDir ) =>
			policyActiveSet.has( path.resolve( runDir ) )
		);
		const supervisorStatus = groupState?.status ?? 'absent';
		const supervisorActive = ACTIVE_GROUP_STATUSES.has( supervisorStatus );
		const transport = getGroupTransportForStatus( group );
		const activeCurrentRunGroupRecords =
			state.currentRunRecordCountsByGroup?.[ group ] ?? 0;
		const cachedCurrentRootGroupRecords =
			state.benchmarkCanaryRecordCountsOutputDir === OUTPUT_DIR
				? state.benchmarkCanaryRetainedRecordCountsByGroup?.[ group ] ??
				  0
				: 0;
		const retainedCurrentRootGroupRecords = Math.max(
			retainedCoverageSignals.recordCountsByGroup?.[ group ] ?? 0,
			cachedCurrentRootGroupRecords
		);
		const currentRunGroupRecords = Math.max(
			activeCurrentRunGroupRecords,
			retainedCurrentRootGroupRecords
		);
		const activeCurrentRunSuccessfulGroupRecords =
			state.currentRunSuccessfulRecordCountsByGroup?.[ group ] ?? 0;
		const cachedCurrentRootSuccessfulGroupRecords =
			state.benchmarkCanaryRecordCountsOutputDir === OUTPUT_DIR
				? state.benchmarkCanaryRetainedSuccessfulRecordCountsByGroup?.[
						group
				  ] ?? 0
				: 0;
		const retainedCurrentRootSuccessfulGroupRecords = Math.max(
			retainedCoverageSignals.successfulRecordCountsByGroup?.[ group ] ??
				0,
			cachedCurrentRootSuccessfulGroupRecords
		);
		const currentRunSuccessfulGroupRecords = Math.max(
			activeCurrentRunSuccessfulGroupRecords,
			retainedCurrentRootSuccessfulGroupRecords
		);
		const retainedSuccessfulGroupRecords = Math.max(
			currentRunSuccessfulGroupRecords,
			state.benchmarkCanaryRetainedSuccessfulRecordCountsByGroup?.[
				group
			] ?? 0
		);
		const currentRunTransportRecords =
			state.currentRunRecordCountsByTransport?.[ transport ] ?? 0;
		const explicitBlocker =
			state.benchmarkCanaryExplicitBlockers?.[ group ];
		const deferred = isDeferredBenchmarkCanaryForcedGroup( group );
		const enabledByPolicy = ( state.enabledGroups ?? [] ).includes( group );
		const materialized =
			! deferred &&
			( supervisorActive ||
				activeRunDirs.length > 0 ||
				policyActiveRunDirs.length > 0 );
		const supervisorScheduled =
			!! groupState && supervisorStatus !== 'disabled';
		const scheduled =
			! deferred &&
			( enabledByPolicy || supervisorScheduled || materialized );
		const liveForced = materialized;
		const noAnalysisProductEvidenceRecords = Math.max(
			noAnalysisProductEvidence.recordsByGroup?.[ group ] ?? 0,
			state.benchmarkCanaryNoAnalysisProductEvidenceByGroup?.[ group ] ??
				0
		);
		const supervisorProductEvidenceRecords = Number(
			groupState?.startupStallNoiseSummary?.productEvidenceRecords ?? 0
		);
		const quarantinedProductEvidenceRecords =
			productFailureQuarantinedGroupSet.has( group ) ? 1 : 0;
		const productEvidenceRecords = Math.max(
			noAnalysisProductEvidenceRecords,
			Number.isFinite( supervisorProductEvidenceRecords )
				? supervisorProductEvidenceRecords
				: 0,
			quarantinedProductEvidenceRecords
		);
		const retainedCurrentRootSuccess = retainedSuccessfulGroupRecords > 0;
		const directCurrentRunGreen = currentRunSuccessfulGroupRecords > 0;
		const retainedCurrentRootSuccessRunDir =
			retainedCoverageSignals.successfulRunDirsByGroup?.[
				group
			]?.[ 0 ] ?? '';
		const directCurrentOutputGreen = directCurrentRunGreen;
		const retainedCurrentRootRecords =
			retainedCoverageSignals.recordCountsByGroup?.[ group ] ?? 0;
		const retainedCurrentRootFailure =
			retainedCurrentRootRecords >
			( retainedCoverageSignals.successfulRecordCountsByGroup?.[
				group
			] ?? 0 );
		const openStatusBlocker =
			hasCurrentOpenBenchmarkCanaryCoverageStatusRow( group );
		const observedExplicitDownscope =
			isBenchmarkCanaryExplicitlyDownscoped( group );
		rememberBenchmarkCanaryDeadlineClosure( group, {
			currentRunGreen: directCurrentOutputGreen,
			explicitDownscope: observedExplicitDownscope,
			closureSource: directCurrentOutputGreen
				? 'direct-current-run-success'
				: observedExplicitDownscope
				? 'explicit-downscope'
				: '',
			closureRunDir:
				directCurrentOutputGreen || observedExplicitDownscope
					? policyActiveRunDirs[ 0 ] ||
					  activeRunDirs[ 0 ] ||
					  retainedCurrentRootSuccessRunDir ||
					  OUTPUT_DIR
					: '',
		} );
		const stickyClosure = getBenchmarkCanaryDeadlineClosure( group );
		const currentOutputDirectCurrentRunClosure =
			hasBenchmarkCanaryCurrentOutputDirectCurrentRunClosure( group );
		const stickyCurrentRunGreen =
			stickyClosure?.currentRunGreen === true &&
			! isBenchmarkCanaryForcedGroup( group ) &&
			! directCurrentOutputGreen &&
			! retainedCurrentRootFailure &&
			( currentOutputDirectCurrentRunClosure ||
				( ! requiresDirectCurrentRunBenchmarkCanaryClosure( group ) &&
					! openStatusBlocker ) );
		const stickyExplicitDownscope =
			stickyClosure?.explicitDownscope === true &&
			! observedExplicitDownscope &&
			! openStatusBlocker;
		const retainedProductEvidence = productEvidenceRecords > 0;
		const explicitDownscope =
			observedExplicitDownscope || stickyExplicitDownscope;
		const currentRunGreen =
			directCurrentOutputGreen || stickyCurrentRunGreen;
		const stickyDeadlineClosureSource = currentOutputDirectCurrentRunClosure
			? stickyClosure?.closureSource ||
			  'sticky-deadline-current-run-green'
			: requiresDirectCurrentRunBenchmarkCanaryClosure( group )
			? ''
			: getBenchmarkCanaryStickyDeadlineClosureSource( group );
		const deadlineClosureSource = directCurrentOutputGreen
			? 'direct-current-run-success'
			: observedExplicitDownscope
			? 'explicit-downscope'
			: currentOutputDirectCurrentRunClosure
			? stickyDeadlineClosureSource
			: openStatusBlocker
			? ''
			: retainedCurrentRootFailure
			? ''
			: stickyDeadlineClosureSource
			? stickyDeadlineClosureSource
			: '';
		const closureSource = isDeadlineBenchmarkCanaryBudgetCapActive()
			? deadlineClosureSource
			: directCurrentOutputGreen
			? 'direct-current-run-success'
			: retainedCurrentRootSuccess
			? 'retained-current-root-success'
			: retainedProductEvidence
			? 'retained-product-evidence'
			: explicitBlocker?.kind
			? `explicit-blocker:${ explicitBlocker.kind }`
			: '';
		const closureRunDir =
			directCurrentOutputGreen || observedExplicitDownscope
				? policyActiveRunDirs[ 0 ] ||
				  activeRunDirs[ 0 ] ||
				  retainedCurrentRootSuccessRunDir ||
				  OUTPUT_DIR
				: currentOutputDirectCurrentRunClosure
				? stickyClosure?.closureRunDir || ''
				: openStatusBlocker
				? ''
				: retainedCurrentRootFailure
				? ''
				: stickyClosure?.closureRunDir &&
				  ! requiresDirectCurrentRunBenchmarkCanaryClosure( group )
				? stickyClosure.closureRunDir
				: '';
		const coverageReady = isDeadlineBenchmarkCanaryBudgetCapActive()
			? currentRunGreen || explicitDownscope
			: !! closureSource;
		const exactStackPromotionBlocked =
			! explicitDownscope &&
			hasBenchmarkCanaryExactStackPromotionBlocker( group );
		const promotionBlocked =
			! explicitDownscope &&
			( ! coverageReady || exactStackPromotionBlocked );
		const coverageState = directCurrentOutputGreen
			? 'successful-current-run-records-present'
			: observedExplicitDownscope
			? 'explicit-downscope'
			: openStatusBlocker
			? 'open-benchmark-canary-status-blocker'
			: retainedCurrentRootFailure
			? 'retained-current-root-failure-not-current-run-green'
			: stickyCurrentRunGreen
			? 'sticky-deadline-current-run-green'
			: stickyExplicitDownscope
			? 'sticky-explicit-downscope'
			: retainedCurrentRootSuccess
			? coverageReady
				? 'retained-current-root-success'
				: 'retained-current-root-success-not-current-run-green'
			: retainedProductEvidence
			? coverageReady
				? 'retained-product-evidence'
				: 'retained-product-evidence-not-current-run-green'
			: explicitBlocker?.kind
			? `explicit-blocker:${ explicitBlocker.kind }`
			: materialized
			? 'no-current-run-successful-group-records'
			: groupState
			? `${ supervisorStatus }-not-materialized`
			: 'absent-from-supervisor-state';
		const statusOnly = coverageReady && ! promotionBlocked;
		const statusOnlySource = statusOnly
			? closureSource ||
			  ( currentRunGreen ? 'direct-current-run-success' : '' ) ||
			  ( explicitDownscope ? 'explicit-downscope' : '' )
			: '';
		const selectionSource = deferred
			? 'deadline-deferred'
			: enabledByPolicy && materialized
			? 'enabled-policy'
			: enabledByPolicy
			? 'enabled-policy-unmaterialized'
			: supervisorActive || activeRunDirs.length > 0
			? 'supervisor-state'
			: groupState
			? 'supervisor-state-unmaterialized'
			: 'forced-status-only';
		const primary = isPrimaryBenchmarkCanaryGroup( group );
		if ( primary ) {
			primaryGroups.push( group );
		}
		if ( promotionBlocked ) {
			promotionBlockedGroups.push( group );
		}
		recordCountsByGroup[ group ] = currentRunGroupRecords;
		successfulRecordCountsByGroup[ group ] =
			currentRunSuccessfulGroupRecords;
		recordCountsByTransport[ transport ] =
			( recordCountsByTransport[ transport ] ?? 0 ) +
			currentRunGroupRecords;
		rows.push( [
			updatedAt,
			'novelty-monitor',
			group,
			getBenchmarkCanaryCasesForGroup( group ).join( ',' ),
			PROFILE_BY_GROUP[ group ] ?? '',
			'yes',
			liveForced ? 'yes' : 'no',
			primary ? 'yes' : 'no',
			promotionBlocked ? 'yes' : 'no',
			exactStackPromotionBlocked ? 'yes' : 'no',
			exactStackPromotionBlocked ? 'current-feedback.tsv' : 'none',
			exactStackPromotionBlocked
				? getBenchmarkCanaryFeedbackCommit(
						getBenchmarkCanaryFeedbackRowForGroup( group ) ?? {}
				  )
				: '',
			scheduled ? 'yes' : 'no',
			selectionSource,
			supervisorStatus,
			activeRunDirs.length > 0 ? 'yes' : 'no',
			activeRunDirs.length,
			policyActiveRunDirs.length > 0 ? 'yes' : 'no',
			policyActiveRunDirs.length,
			currentRunGroupRecords,
			currentRunSuccessfulGroupRecords,
			transport,
			currentRunTransportRecords,
			coverageReady ? 'yes' : 'no',
			currentRunGreen ? 'yes' : 'no',
			directCurrentOutputGreen
				? 'direct-current-run-success'
				: stickyCurrentRunGreen
				? 'sticky-deadline-current-run-green'
				: 'none',
			closureSource || 'none',
			closureRunDir,
			retainedProductEvidence ? 'yes' : 'no',
			explicitDownscope ? 'yes' : 'no',
			statusOnly ? 'yes' : 'no',
			statusOnlySource || 'none',
			coverageState,
			Math.max(
				getSupervisorPausedNoAnalysisRunDirs( groupState ).length,
				noAnalysisProductEvidence.runDirsByGroup?.[ group ]?.length ??
					0,
				state.benchmarkCanaryNoAnalysisRunDirsByGroup?.[ group ]
					?.length ?? 0
			),
			productEvidenceRecords,
			exactStackPromotionBlocked && coverageReady
				? 'benchmark canary exact stack is still promotion-blocked; equivalent coverage is present but does not clear the exact-stack green evidence requirement'
				: explicitBlocker?.reason ??
				  getBenchmarkCanaryFeedbackReason( group ) ??
				  'benchmark canary feedback requires equivalent current-run fuzz coverage before publication confidence can move',
		] );
	}
	const canMergeRetainedBenchmarkCanarySignals =
		state.benchmarkCanaryRecordCountsOutputDir === OUTPUT_DIR;
	const previousRetainedRecordCountsByGroup =
		canMergeRetainedBenchmarkCanarySignals
			? state.benchmarkCanaryRetainedRecordCountsByGroup
			: {};
	const previousRetainedSuccessfulRecordCountsByGroup =
		canMergeRetainedBenchmarkCanarySignals
			? state.benchmarkCanaryRetainedSuccessfulRecordCountsByGroup
			: {};
	const previousRetainedRecordCountsByTransport =
		canMergeRetainedBenchmarkCanarySignals
			? state.benchmarkCanaryRetainedRecordCountsByTransport
			: {};
	state.benchmarkCanaryRecordCountsOutputDir = OUTPUT_DIR;
	state.benchmarkCanaryRecordCountsByGroup = recordCountsByGroup;
	state.benchmarkCanarySuccessfulRecordCountsByGroup =
		successfulRecordCountsByGroup;
	state.benchmarkCanaryRecordCountsByTransport = recordCountsByTransport;
	state.benchmarkCanaryRetainedRecordCountsByGroup = mergeMaxCounters(
		previousRetainedRecordCountsByGroup,
		retainedCoverageSignals.recordCountsByGroup
	);
	state.benchmarkCanaryRetainedSuccessfulRecordCountsByGroup =
		mergeMaxCounters(
			previousRetainedSuccessfulRecordCountsByGroup,
			retainedCoverageSignals.successfulRecordCountsByGroup
		);
	state.benchmarkCanaryRetainedRecordCountsByTransport = mergeMaxCounters(
		previousRetainedRecordCountsByTransport,
		retainedCoverageSignals.recordCountsByTransport
	);
	state.benchmarkCanaryNoAnalysisProductEvidenceByGroup =
		noAnalysisProductEvidence.recordsByGroup;
	state.benchmarkCanaryNoAnalysisRunDirsByGroup =
		noAnalysisProductEvidence.runDirsByGroup;
	const statusHeaders = rows[ 0 ];
	benchmarkCanaryCoverageStatusRows = rows.slice( 1 ).map( ( columns ) => {
		const row = {};
		statusHeaders.forEach( ( header, index ) => {
			row[ header ] = `${ columns[ index ] ?? '' }`;
		} );
		return row;
	} );
	await writeTextFileAtomic(
		BENCHMARK_CANARY_COVERAGE_STATUS_PATH,
		rows.map( ( row ) => row.map( tsvCell ).join( '\t' ) ).join( '\n' ) +
			'\n'
	);
	await writeTextFileAtomic(
		BENCHMARK_CANARY_COVERAGE_FLOOR_PATH,
		[
			[ 'feedback_tsv', BENCHMARK_CANARY_FEEDBACK_TSV_PATH ],
			[ 'feedback_head_commit', CURRENT_REPO_HEAD_COMMIT ?? 'unknown' ],
			[
				'stale_feedback_rows_ignored',
				state.benchmarkCanaryStaleFeedbackRowsIgnored ?? 0,
			],
			[
				'stale_inherited_feedback_rows_ignored',
				state.benchmarkCanaryStaleInheritedFeedbackRowsIgnored ?? 0,
			],
			[ 'primary_group_count', primaryGroups.length ],
			[ 'promotion_blocked_group_count', promotionBlockedGroups.length ],
			[
				'slot_floor',
				benchmarkCanaryForcedGroups.size > 0
					? getBenchmarkCanarySchedulingLimit()
					: 0,
			],
			[ 'primary_groups', primaryGroups.join( ',' ) ],
			[ 'promotion_blocked_groups', promotionBlockedGroups.join( ',' ) ],
			[ 'target_enabled_groups', TARGET_ENABLED_GROUPS ],
			[ 'max_enabled_groups', MAX_ENABLED_GROUPS ],
			[
				'coverage_guided_target_enabled_groups',
				COVERAGE_GUIDED_TARGET_ENABLED_GROUPS,
			],
			[
				'coverage_guided_max_enabled_groups',
				COVERAGE_GUIDED_MAX_ENABLED_GROUPS,
			],
			[
				'coverage_quality_max_enabled_groups',
				COVERAGE_QUALITY_MAX_ENABLED_GROUPS,
			],
			[
				'benchmark_canary_bootstrap_reserve_slots',
				BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS,
			],
		]
			.map( ( row ) => row.map( tsvCell ).join( '\t' ) )
			.join( '\n' ) + '\n'
	);
}

async function reconcileOpenBenchmarkCanarySupervisorGroupsAfterTelemetry() {
	if ( ! START_SUPERVISOR || ! isDeadlineBenchmarkCanaryBudgetCapActive() ) {
		return 0;
	}

	const scheduledBenchmarkCanaryGroups =
		getScheduledBenchmarkCanaryGroupsForBudget();
	if ( scheduledBenchmarkCanaryGroups.length === 0 ) {
		return 0;
	}

	const publishedGroups = await readJsonFile( GROUPS_PATH );
	const publishedGroupSet = new Set(
		( Array.isArray( publishedGroups ) ? publishedGroups : [] )
			.map( ( group ) => group?.name )
			.filter( Boolean )
	);
	const enabledGroupSet = new Set( state.enabledGroups ?? [] );
	const missingScheduledBenchmarkCanaryGroups =
		scheduledBenchmarkCanaryGroups.filter(
			( group ) =>
				! enabledGroupSet.has( group ) ||
				! publishedGroupSet.has( group )
		);
	const stalePausedBenchmarkCanaryGroups =
		scheduledBenchmarkCanaryGroups.filter(
			( group ) =>
				state.pausedGroups?.[ group ] &&
				shouldProtectOpenBenchmarkCanaryPromotionGroup( group )
		);

	if (
		missingScheduledBenchmarkCanaryGroups.length === 0 &&
		stalePausedBenchmarkCanaryGroups.length === 0
	) {
		return 0;
	}

	for ( const group of stalePausedBenchmarkCanaryGroups ) {
		delete state.pausedGroups[ group ];
		delete state.startupFailureCountsByGroup?.[ group ];
		const profile = PROFILE_BY_GROUP[ group ];
		if ( profile ) {
			delete state.startupFailureCountsByProfile?.[ profile ];
		}
	}

	state.changes.push( {
		at: new Date().toISOString(),
		action: 'publish-fresh-status-benchmark-canary-groups',
		groups: scheduledBenchmarkCanaryGroups,
		missingGroups: missingScheduledBenchmarkCanaryGroups,
		clearedPausedGroups: stalePausedBenchmarkCanaryGroups,
		reason: 'fresh benchmark-canary telemetry still has open promotion-blocked rows; immediately republish protected groups so stale noise/cap decisions cannot leave forced canaries unmaterialized until the next full pass',
	} );
	await writeSupervisorGroupsForEnabledGroups( state.enabledGroups );
	await writeJsonFileAtomic( STATE_PATH, state );
	return missingScheduledBenchmarkCanaryGroups.length;
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

function shouldSkipArtifactScanDir( dirName ) {
	return (
		ARTIFACT_SCAN_IGNORED_DIRS.has( dirName ) ||
		( dirName === 'external-imports' && ! INCLUDE_EXTERNAL_IMPORTS )
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

	const relativeParts = relative.split( path.sep );
	if (
		! INCLUDE_EXTERNAL_IMPORTS &&
		relativeParts.includes( 'external-imports' )
	) {
		return null;
	}

	const [ runDirName ] = relativeParts;
	for ( const group of PROFILE_GROUP_NAMES_BY_SPECIFICITY ) {
		if (
			runDirName === group ||
			runDirName.startsWith( `${ group }-gen-` )
		) {
			return group;
		}
	}
	return null;
}

function getCurrentOutputRunDirFromPath( filePath ) {
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
	return runDirName ? path.join( OUTPUT_DIR, runDirName ) : null;
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
				if ( shouldSkipArtifactScanDir( entry.name ) ) {
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
				if ( shouldSkipArtifactScanDir( entry.name ) ) {
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
				if ( shouldSkipArtifactScanDir( entry.name ) ) {
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
			if ( shouldSkipArtifactScanDir( entry.name ) ) {
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
					shouldBypassBenchmarkCanaryNoisePause( group, {
						...sentinel,
						kind: reasonKind,
						reasonKind,
						reason,
						family,
					} )
				) {
					delete state.pausedGroups?.[ group ];
					state.changes.push( {
						at: new Date().toISOString(),
						action: 'ignore-benchmark-canary-no-analysis-sentinel',
						group,
						reason:
							getBenchmarkCanaryFeedbackReason( group ) ??
							'benchmark canary feedback requires this equivalent fuzz lane',
						sourceSentinelReason: reason,
						expiresAt: sentinel.expiresAt ?? sentinel.pauseUntil,
					} );
					continue;
				}
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
			if ( shouldSkipArtifactScanDir( entry.name ) ) {
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
	let nextIndex = 0;
	const workers = Array.from(
		{
			length: Math.min( TRIAGE_GATE_REFRESH_MAX_PARALLEL, dirs.length ),
		},
		async () => {
			while ( nextIndex < dirs.length ) {
				const runDir = dirs[ nextIndex++ ];
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
		}
	);
	await Promise.all( workers );

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
				detached: process.platform !== 'win32',
				env: {
					...process.env,
					RTC_FUZZ_TRIAGE_SUPERVISOR_STATE_PATH: supervisorStatePath,
					RTC_FUZZ_TRIAGE_CURRENT_OUTPUT_POINTER:
						CURRENT_OUTPUT_POINTER_PATH,
				},
				stdio: [ 'ignore', 'pipe', 'pipe' ],
			}
		);
		activeGateOnlyTriageChildren.add( child );

		const finish = ( result ) => {
			if ( settled ) {
				return;
			}
			settled = true;
			activeGateOnlyTriageChildren.delete( child );
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
			terminateGateOnlyTriageChild( child, 'SIGTERM' );
			killTimer = setTimeout( () => {
				terminateGateOnlyTriageChild( child, 'SIGKILL' );
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

function terminateGateOnlyTriageChild( child, signal ) {
	if ( ! child?.pid ) {
		return;
	}
	if ( process.platform !== 'win32' ) {
		try {
			process.kill( -child.pid, signal );
			return;
		} catch {}
	}
	try {
		child.kill( signal );
	} catch {}
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

function hasSignatureFactsProductEvidence( signature ) {
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

function hasSignatureProductEvidence( signature ) {
	return (
		hasSignatureFactsProductEvidence( signature ) ||
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
		! hasSignatureFactsProductEvidence( signature )
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
	if ( ! hasSignatureFactsProductEvidence( signature ) ) {
		return null;
	}

	const facts = signature?.facts ?? {};
	if ( ( facts.userCount ?? 0 ) <= 0 ) {
		return null;
	}
	if ( facts.failureClass === 'operation-witness-missing' ) {
		return null;
	}

	const normalized = String( signature?.normalized ?? '' );
	if ( /Post save did not settle clean/i.test( normalized ) ) {
		return 'post_save_dirty_after_ui_oracle';
	}
	if ( /Persisted post does not match editor state/i.test( normalized ) ) {
		return 'persisted_editor_state_mismatch';
	}
	if (
		/Rendered editor is not usable|wordpress-critical-error-screen|white-screen-error-text|editor-runtime-error-screen/i.test(
			normalized
		)
	) {
		return 'rendered_editor_ui_unusable';
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
		/post_save_did_not_settle_clean|post.*save.*settle.*clean|save.*dirty|edited_post_dirty/.test(
			value
		)
	) {
		return 'post_save_dirty_after_ui_oracle';
	}
	if (
		/persisted.*post.*match|persisted.*editor.*mismatch|editor_state_mismatch/.test(
			value
		)
	) {
		return 'persisted_editor_state_mismatch';
	}
	if (
		/rendered.*editor.*usable|white_screen|critical_error_screen|editor_runtime_error/.test(
			value
		)
	) {
		return 'rendered_editor_ui_unusable';
	}
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

function getCurrentRunActionGateDuplicateHold( triageYield ) {
	if ( ! triageYield ) {
		return null;
	}
	const minimumDominantFamilyCount = Math.max(
		2,
		Math.ceil(
			CURRENT_RUN_DUPLICATE_ACTION_GATE_MIN_CANDIDATES *
				TRIAGE_DUPLICATE_SHARE_HOLD
		)
	);
	const candidates = [
		{
			source: 'raw-action-gate',
			topFamily: triageYield.rawTopSemanticFamilies?.[ 0 ],
			total: triageYield.rawSignatureCount ?? 0,
			share: triageYield.rawTopDuplicateFamilyShare ?? 0,
		},
		{
			source: 'actionable-action-gate',
			topFamily: triageYield.topSemanticFamilies?.[ 0 ],
			total: triageYield.signatureCount ?? 0,
			share: triageYield.topDuplicateFamilyShare ?? 0,
		},
	]
		.map( ( candidate ) => ( {
			...candidate,
			family: candidate.topFamily?.family ?? '',
			count: candidate.topFamily?.count ?? 0,
		} ) )
		.filter(
			( candidate ) =>
				candidate.family &&
				candidate.total >=
					CURRENT_RUN_DUPLICATE_ACTION_GATE_MIN_CANDIDATES &&
				candidate.count >= minimumDominantFamilyCount &&
				candidate.share >= TRIAGE_DUPLICATE_SHARE_HOLD
		)
		.sort(
			( left, right ) =>
				right.share - left.share || right.count - left.count
		);

	if ( candidates.length === 0 ) {
		return null;
	}

	const best = candidates[ 0 ];
	return {
		kind: 'triage-duplicate-noise',
		family: best.family,
		count: best.count,
		share: best.share,
		source: best.source,
		total: best.total,
		actionGate: true,
		productEvidenceSignatures: triageYield.productEvidenceSignatures ?? 0,
		rawProductEvidenceSignatures:
			triageYield.rawProductEvidenceSignatures ?? 0,
		likelyRealVisible: triageYield.likelyRealVisible ?? 0,
	};
}

function getActionGateProductEvidenceCount( hold, triageYield ) {
	return Math.max(
		hold?.productEvidenceSignatures ?? 0,
		hold?.rawProductEvidenceSignatures ?? 0,
		getTriageYieldProductEvidenceRecordCount( triageYield )
	);
}

function getActionGateRepresentativeSignal( triageYield, family ) {
	const representativeFamilies =
		triageYield?.productEvidenceDuplicateRepresentativeFamilies ?? {};
	const familyRepresentatives = representativeFamilies[ family ] ?? 0;
	if ( familyRepresentatives > 0 ) {
		return `familyRepresentatives=${ familyRepresentatives }`;
	}
	return null;
}

function isActionGateProductEvidenceDuplicateHold( hold ) {
	if ( hold?.kind !== 'triage-duplicate-noise' || hold.actionGate !== true ) {
		return false;
	}
	const productEvidenceRecords = Number( hold.productEvidenceRecords );
	return (
		hold.preserveProductEvidence === true ||
		( hold.productEvidenceSignatures ?? 0 ) > 0 ||
		( hold.rawProductEvidenceSignatures ?? 0 ) > 0 ||
		( hold.likelyRealVisible ?? 0 ) > 0 ||
		( Number.isFinite( productEvidenceRecords ) &&
			productEvidenceRecords > 0 )
	);
}

function getProductEvidenceActionGateHoldForScheduling( hold, triageYield ) {
	if ( ! isActionGateProductEvidenceDuplicateHold( hold ) ) {
		return null;
	}
	const productEvidenceRecords = getActionGateProductEvidenceCount(
		hold,
		triageYield
	);
	if ( productEvidenceRecords <= 0 ) {
		return null;
	}
	const representativeSignal = getActionGateRepresentativeSignal(
		triageYield,
		hold.family
	);
	if ( ! representativeSignal ) {
		return null;
	}
	return {
		...hold,
		source: hold.source?.endsWith( '-producer-action-gate' )
			? hold.source
			: `${ hold.source }-producer-action-gate`,
		productEvidenceRecords,
		hasProductEvidence: true,
		preserveProductEvidence: true,
		representativeSignal,
	};
}

function getCurrentRunActionGateProducerHold(
	triageYield,
	{ rootHold = null, groupName = null } = {}
) {
	if ( ! rootHold?.actionGate ) {
		return null;
	}
	if (
		groupName &&
		Array.isArray( rootHold.groups ) &&
		rootHold.groups.length > 0 &&
		! rootHold.groups.includes( groupName )
	) {
		return null;
	}

	const hold = getCurrentRunActionGateDuplicateHold( triageYield );
	if ( ! hold ) {
		return null;
	}
	if ( rootHold.family && hold.family !== rootHold.family ) {
		return null;
	}

	const productEvidenceRecords = getActionGateProductEvidenceCount(
		hold,
		triageYield
	);
	if ( productEvidenceRecords <= 0 ) {
		return null;
	}

	const representativeSignal = getActionGateRepresentativeSignal(
		triageYield,
		hold.family
	);
	if ( ! representativeSignal ) {
		return null;
	}

	return {
		...hold,
		source: `${ hold.source }-producer-action-gate`,
		...( groupName ? { groupName, groups: [ groupName ] } : {} ),
		productEvidenceRecords,
		hasProductEvidence: true,
		preserveProductEvidence: true,
		representativeSignal,
	};
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
	const dominantFamilyCount = dominantFamily?.count ?? 0;
	const minimumDominantDuplicateFamilyCount = Math.max(
		2,
		Math.ceil(
			CURRENT_RUN_DUPLICATE_ACTION_GATE_MIN_CANDIDATES *
				TRIAGE_DUPLICATE_SHARE_HOLD
		)
	);
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
		dominantFamilyCount >= minimumDominantDuplicateFamilyCount &&
		HISTORICAL_KNOWN_NOISE_FAMILIES.has( dominantFamily?.family ?? '' );
	const genericDuplicateNoiseDominates =
		allowGenericDuplicate &&
		requireNoProductEvidence &&
		duplicateDominated &&
		dominantFamilyCount >= minimumDominantDuplicateFamilyCount &&
		dominantSignatureCount >=
			CURRENT_RUN_DUPLICATE_ACTION_GATE_MIN_CANDIDATES;

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

function getProductEvidenceDuplicateFamilyAliases( family ) {
	const normalized = String( family ?? '' );
	const aliases = [ normalized ];
	const activeProductEvidenceAlias =
		/^active_product_evidence_(?:ws|http)_(timeout|unknown)$/.exec(
			normalized
		);
	if ( activeProductEvidenceAlias ) {
		aliases.push( activeProductEvidenceAlias[ 1 ] );
	}
	return aliases;
}

function isGroupScopedProductEvidenceDuplicateFamilyHoldFamily(
	family,
	groupName = null
) {
	const groupScopedFamilies =
		GROUP_SCOPED_PRODUCT_EVIDENCE_DUPLICATE_FAMILY_HOLD_FAMILIES.get(
			groupName
		);
	return Boolean(
		groupName &&
			groupScopedFamilies &&
			getProductEvidenceDuplicateFamilyAliases( family ).some(
				( alias ) => groupScopedFamilies.has( alias )
			)
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

function isProductEvidenceDuplicateProducerHold( hold, groupName = null ) {
	return (
		isProductEvidenceDuplicateFamilyHold( hold, groupName ) ||
		isActionGateProductEvidenceDuplicateHold( hold )
	);
}

function shouldProductEvidenceDuplicateHoldBlockGroup( hold, group ) {
	if ( isActionGateProductEvidenceDuplicateHold( hold ) ) {
		const holdGroups = new Set(
			[
				...( Array.isArray( hold.groups ) ? hold.groups : [] ),
				hold.groupName,
				hold.group,
			].filter( Boolean )
		);
		return (
			holdGroups.has( group ) ||
			PRODUCT_EVIDENCE_DUPLICATE_FAMILY_HOLD_GROUPS.includes( group )
		);
	}
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
	const clearActions = new Set( [
		'clear-benchmark-canary-startup-pause-after-optional-plugin-setup-fix',
		'clear-collaboration-readiness-startup-pause-after-harness-fix',
		'clear-http-provider-gating-startup-pause-after-harness-fix',
		'clear-large-http-lifecycle-startup-pause-after-harness-fix',
		'clear-many-user-join-batch-startup-pause-after-harness-fix',
	] );

	for ( let index = changes.length - 1; index >= 0; index-- ) {
		const change = changes[ index ];
		if ( change?.group === group && clearActions.has( change.action ) ) {
			return null;
		}
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

	const exactPause = getActiveNoisePauseForEntry(
		group,
		state.pausedGroups?.[ group ]
	);
	const historicalExactPause =
		getRecentNoisePauseCooldownFromHistory( group );
	const bypassLooksNoProductStartup =
		/no-product|bootstrap cooldown|startup cooldown/i.test(
			bypass.reason ?? ''
		);
	if (
		isNoProductStartupNoiseCooldown( exactPause ) ||
		isNoProductStartupNoiseCooldown( historicalExactPause ) ||
		( bypassLooksNoProductStartup &&
			! shouldBypassBenchmarkCanaryNoisePause(
				group,
				exactPause ?? historicalExactPause
			) )
	) {
		delete state.startupNoiseCooldownBypassGroups[ group ];
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'clear-startup-noise-cooldown-bypass',
			group,
			reason:
				exactPause ?? historicalExactPause
					? 'active no-product pre_action_bootstrap_stall cooldown takes precedence over startup-noise bypass state'
					: 'stale no-product startup-noise bypass has no product-evidence cooldown to bypass',
			sourcePauseAt: exactPause?.at ?? historicalExactPause?.at,
			sourcePauseReason:
				exactPause?.reason ?? historicalExactPause?.reason,
			expiresAt: exactPause?.expiresAt ?? historicalExactPause?.expiresAt,
		} );
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
	recordDeadlineBenchmarkCanaryStartupRetry( group, activeNoisePause );
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
		if ( shouldBypassBenchmarkCanaryNoisePause( group, exactPause ) ) {
			return null;
		}
		return exactPause;
	}

	const historicalExactPause =
		getRecentNoisePauseCooldownFromHistory( group );
	if ( historicalExactPause ) {
		if (
			shouldBypassBenchmarkCanaryNoisePause( group, historicalExactPause )
		) {
			return null;
		}
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
	const kind = pause?.kind ?? pause?.reasonKind;
	if (
		kind !== 'startup-noise' ||
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
			! isCurrentOutputStartupNoiseCooldown( pause )
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
	if ( hold?.fleetStartupNoiseHold === true ) {
		return startupHoldIncludesGroup( hold, group );
	}
	if ( Array.isArray( hold?.groups ) && hold.groups.length > 0 ) {
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

function shouldInheritProfileStartupNoiseCooldown( group ) {
	if (
		isBenchmarkCanaryForcedGroup( group ) &&
		isPrimaryBenchmarkCanaryGroup( group )
	) {
		return false;
	}
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
		if (
			shouldDwellActiveForcedWsBenchmarkCanary(
				groupState.name,
				groupState
			)
		) {
			delete state.pausedGroups?.[ groupState.name ];
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'dwell-active-forced-ws-benchmark-canary-startup-pause',
				group: groupState.name,
				reason: 'active deadline WS benchmark-canary row has not emitted its first current-run summary record; keep the bounded producer materialized before applying startup-noise cooldown',
				sourcePauseReason: nextPause.reason,
				expiresAt: nextPause.expiresAt,
			} );
			continue;
		}
		if (
			shouldBypassBenchmarkCanaryNoisePause( groupState.name, nextPause )
		) {
			recordDeadlineBenchmarkCanaryStartupRetry(
				groupState.name,
				nextPause
			);
			delete state.pausedGroups?.[ groupState.name ];
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'skip-benchmark-canary-supervisor-startup-pause',
				group: groupState.name,
				reason:
					getBenchmarkCanaryFeedbackReason( groupState.name ) ??
					'benchmark canary feedback requires this equivalent fuzz lane',
				sourcePauseReason: nextPause.reason,
				expiresAt: nextPause.expiresAt,
				originOutputDir: nextPause.originOutputDir,
			} );
			continue;
		}
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
	return getSupervisorGroupProductEvidenceRecordCount( groupState ) > 0;
}

function getSupervisorGroupProductEvidenceRecordCount( groupState ) {
	const productEvidenceRecords = Number(
		groupState?.startupStallNoiseSummary?.productEvidenceRecords ?? 0
	);
	return Number.isFinite( productEvidenceRecords )
		? productEvidenceRecords
		: 0;
}

function syncBenchmarkCanarySupervisorProductEvidence( supervisorState ) {
	const supervisorProductEvidenceByGroup = {};
	for ( const groupState of supervisorState?.groups ?? [] ) {
		const productEvidenceRecords =
			getSupervisorGroupProductEvidenceRecordCount( groupState );
		if ( productEvidenceRecords > 0 ) {
			supervisorProductEvidenceByGroup[ groupState.name ] =
				productEvidenceRecords;
		}
	}
	if ( Object.keys( supervisorProductEvidenceByGroup ).length > 0 ) {
		state.benchmarkCanarySupervisorProductEvidenceByGroup =
			supervisorProductEvidenceByGroup;
	} else {
		delete state.benchmarkCanarySupervisorProductEvidenceByGroup;
	}
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
	return uniquePathList( getSupervisorPolicyActiveRunDirs( groupState ) );
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
	if ( isProductEvidenceDuplicateProducerHold( producer.hold ) ) {
		return true;
	}
	if (
		isCurrentNoProductStartupHold( producer.hold ) &&
		producer.hold?.family === 'pre_action_bootstrap_stall'
	) {
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
	if ( isProductEvidenceDuplicateProducerHold( producer?.hold ) ) {
		return true;
	}
	if (
		isCurrentNoProductStartupHold( producer?.hold ) &&
		producer.hold?.family === 'pre_action_bootstrap_stall'
	) {
		return true;
	}
	if ( ( producer?.triageYield?.likelyRealVisible ?? 0 ) > 0 ) {
		return false;
	}
	return (
		producer?.hold?.kind === 'startup-noise' &&
		producer.hold.family === 'pre_action_bootstrap_stall'
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
	} else if ( isProductEvidenceDuplicateProducerHold( producer.hold ) ) {
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
		const actionGateProducerHold =
			getProductEvidenceActionGateHoldForScheduling(
				getCurrentRunActionGateProducerHold( groupTriageYield, {
					groupName: groupState.name,
					rootHold,
				} ),
				groupTriageYield
			);
		const noProductHold = getCurrentRunDuplicateNoiseHold(
			groupTriageYield,
			{
				allowGenericDuplicate: true,
				requireNoProductEvidence: true,
			}
		);
		const supervisorStartupHold =
			getSupervisorStartupNoiseHold( groupState );
		const groupHold =
			actionGateProducerHold ??
			productEvidenceDuplicateHold ??
			noProductHold ??
			supervisorStartupHold;
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
		if ( shouldProtectOpenBenchmarkCanaryPromotionGroup( group ) ) {
			delete state.pausedGroups?.[ group ];
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'keep-open-benchmark-canary-through-noise-cooldown',
				group,
				activeRunDirs: canaryActiveRunDirs,
				reason: 'current benchmark-canary status is still promotion-blocked; startup/noise cooldowns cannot remove the producer that must generate direct current-run green, exact-stack repair evidence, or explicit downscope',
				sourcePauseAt: activeNoisePause.at,
				sourcePauseReason: activeNoisePause.reason,
				expiresAt: activeNoisePause.expiresAt,
			} );
			continue;
		}
		if (
			shouldDwellActiveForcedWsBenchmarkCanary(
				group,
				supervisorGroupState
			)
		) {
			delete state.pausedGroups[ group ];
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'keep-active-forced-ws-benchmark-canary-through-dwell',
				group,
				activeRunDirs: canaryActiveRunDirs,
				reason: 'deadline WS benchmark-canary row is already materialized but has not emitted its first current-run summary record; do not remove it for startup/noise cooldown yet',
				expiresAt: activeNoisePause.expiresAt,
			} );
			continue;
		}
		if (
			shouldBypassNoisePauseForSuccessDeficit( group, activeNoisePause )
		) {
			delete state.pausedGroups[ group ];
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'keep-enabled-success-deficit-through-noise-cooldown',
				group,
				reason: getSuccessDeficitBypassReason( group ),
				sourcePauseAt: activeNoisePause.at,
				sourcePauseReason: activeNoisePause.reason,
				expiresAt: activeNoisePause.expiresAt,
				...( activeNoisePause.originGroup
					? { originGroup: activeNoisePause.originGroup }
					: {} ),
			} );
			continue;
		}
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

function createUserDocumentConcurrencySummary() {
	return {
		records: 0,
		successfulRecords: 0,
		byUserCount: {},
		successfulByUserCount: {},
		byProfileUserCount: {},
		successfulByProfileUserCount: {},
		byTransportUserCount: {},
		successfulByTransportUserCount: {},
		byCollaboratorMode: {},
		successfulByCollaboratorMode: {},
		byActionUserCount: {},
		successfulByActionUserCount: {},
		byProfileActionUserCount: {},
		successfulByProfileActionUserCount: {},
		successfulLifecycleByTypeUserCount: {},
		recordsWithUserCountAtLeast: {},
		successfulRecordsWithUserCountAtLeast: {},
		recordsWithActionUserCountAtLeast: {},
		successfulRecordsWithActionUserCountAtLeast: {},
		successfulRecordsByUserBlockBucket: {},
		maxUserCount: 0,
		maxActionUserCount: 0,
		maxExtraCollaborators: 0,
		maxLargeDocumentBlocks: 0,
		maxTotalBlocks: 0,
	};
}

function normalizeNumericRecordValue( value ) {
	const number = Number( value );
	return Number.isFinite( number ) && number > 0 ? number : 0;
}

function getRecordTotalBlockCount( record ) {
	let totalBlocks = normalizeNumericRecordValue(
		record.blockStats?.totalBlocks ??
			record.blockStats?.totalBlockCount ??
			record.largeDocumentBlocks
	);
	for ( const snapshot of record.invariantSnapshots ?? [] ) {
		totalBlocks = Math.max(
			totalBlocks,
			normalizeNumericRecordValue(
				snapshot.totalBlockCount ?? snapshot.rootBlockCount
			)
		);
	}
	for ( const event of record.historyEvents ?? [] ) {
		totalBlocks = Math.max(
			totalBlocks,
			normalizeNumericRecordValue( event.details?.blockCount )
		);
	}
	return totalBlocks;
}

function getRecordActionUserCount( record ) {
	const userIndexes = new Set();
	for ( const action of record.actions ?? [] ) {
		if ( action.userIndex !== undefined && action.userIndex !== null ) {
			userIndexes.add( String( action.userIndex ) );
		}
	}
	for ( const event of record.operationEvents ?? [] ) {
		if ( event.userIndex !== undefined && event.userIndex !== null ) {
			userIndexes.add( String( event.userIndex ) );
		}
	}
	return userIndexes.size;
}

function addUserDocumentConcurrencyRecord( summary, record ) {
	const profile = record.actionProfile ?? 'unknown';
	const transport = record.transport ?? 'unknown';
	const collaboratorMode = record.collaboratorMode ?? 'unknown';
	const userCount = String( normalizeNumericRecordValue( record.userCount ) );
	const actionUserCount = String( getRecordActionUserCount( record ) );
	const successful = record.status === 'passed';
	const totalBlocks = getRecordTotalBlockCount( record );
	const largeDocumentBlocks = normalizeNumericRecordValue(
		record.largeDocumentBlocks
	);

	summary.records += 1;
	incrementCounter( summary.byUserCount, userCount );
	incrementNestedCounter( summary.byProfileUserCount, profile, userCount );
	incrementNestedCounter(
		summary.byTransportUserCount,
		transport,
		userCount
	);
	incrementCounter( summary.byCollaboratorMode, collaboratorMode );
	incrementCounter( summary.byActionUserCount, actionUserCount );
	incrementNestedCounter(
		summary.byProfileActionUserCount,
		profile,
		actionUserCount
	);

	for ( const threshold of [ 2, 3, 10, 12, 30 ] ) {
		if ( Number( userCount ) >= threshold ) {
			incrementCounter(
				summary.recordsWithUserCountAtLeast,
				String( threshold )
			);
		}
		if ( Number( actionUserCount ) >= threshold ) {
			incrementCounter(
				summary.recordsWithActionUserCountAtLeast,
				String( threshold )
			);
		}
	}

	summary.maxUserCount = Math.max(
		summary.maxUserCount,
		Number( userCount )
	);
	summary.maxActionUserCount = Math.max(
		summary.maxActionUserCount,
		Number( actionUserCount )
	);
	summary.maxExtraCollaborators = Math.max(
		summary.maxExtraCollaborators,
		normalizeNumericRecordValue( record.extraCollaborators )
	);
	summary.maxLargeDocumentBlocks = Math.max(
		summary.maxLargeDocumentBlocks,
		largeDocumentBlocks
	);
	summary.maxTotalBlocks = Math.max( summary.maxTotalBlocks, totalBlocks );

	if ( ! successful ) {
		return;
	}

	summary.successfulRecords += 1;
	incrementCounter( summary.successfulByUserCount, userCount );
	incrementNestedCounter(
		summary.successfulByProfileUserCount,
		profile,
		userCount
	);
	incrementNestedCounter(
		summary.successfulByTransportUserCount,
		transport,
		userCount
	);
	incrementCounter( summary.successfulByCollaboratorMode, collaboratorMode );
	incrementCounter( summary.successfulByActionUserCount, actionUserCount );
	incrementNestedCounter(
		summary.successfulByProfileActionUserCount,
		profile,
		actionUserCount
	);

	for ( const threshold of [ 2, 3, 10, 12, 30 ] ) {
		if ( Number( userCount ) >= threshold ) {
			incrementCounter(
				summary.successfulRecordsWithUserCountAtLeast,
				String( threshold )
			);
		}
		if ( Number( actionUserCount ) >= threshold ) {
			incrementCounter(
				summary.successfulRecordsWithActionUserCountAtLeast,
				String( threshold )
			);
		}
	}

	for ( const event of record.lifecycleEvents ?? [] ) {
		if ( ! event.type ) {
			continue;
		}
		const eventUserCount = normalizeNumericRecordValue(
			event.userCount ?? record.userCount
		);
		incrementCounter(
			summary.successfulLifecycleByTypeUserCount,
			`${ event.type }:${ eventUserCount }`
		);
	}

	for ( const userThreshold of [ 2, 3, 10, 12, 30 ] ) {
		for ( const blockThreshold of [ 10, 50, 100 ] ) {
			if (
				Number( userCount ) >= userThreshold &&
				totalBlocks >= blockThreshold
			) {
				incrementCounter(
					summary.successfulRecordsByUserBlockBucket,
					`users-${ userThreshold }:blocks-${ blockThreshold }`
				);
			}
		}
	}
}

async function summarizeUserDocumentConcurrency( files ) {
	const summary = createUserDocumentConcurrencySummary();
	for ( const record of await readAllCoverageRecords( files ) ) {
		addUserDocumentConcurrencyRecord( summary, record );
	}
	return summary;
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
		Object.entries( summary.userCounts ?? {} ).some(
			( [ userCount, count ] ) =>
				Number( userCount ) > 0 && Number( count ) > 0
		)
	) {
		return true;
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

	return false;
}

function hasActionableCoverageRecord( record ) {
	if ( ! record || typeof record !== 'object' ) {
		return false;
	}
	if ( ( record.userCount ?? 0 ) > 0 ) {
		return true;
	}
	if ( hasOracleCoverageEvidence( record ) ) {
		return true;
	}
	return (
		( record.actions?.length ?? 0 ) > 0 ||
		( record.reloads?.length ?? 0 ) > 0 ||
		( record.saveCheckpointSteps?.length ?? 0 ) > 0 ||
		( record.autosaveSteps?.length ?? 0 ) > 0 ||
		record.revisionRestore?.eligible === true ||
		( record.operationEvents?.length ?? 0 ) > 0
	);
}

function hasOracleCoverageEvidence( record ) {
	const oraclePattern =
		/(?:oracle|ui-baseline|post-new-ui|rendered-editor|persisted-post|save-clean)/i;
	return [
		...( record?.historyEvents ?? [] ).map( ( event ) => event.phase ),
		...( record?.invariantEvents ?? [] ).flatMap( ( event ) => [
			event.phase,
			event.name,
		] ),
	]
		.filter( Boolean )
		.some( ( value ) => oraclePattern.test( String( value ) ) );
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
	if (
		attempt.lastAction ||
		( attempt.reloadCount ?? 0 ) > 0 ||
		( attempt.saveCheckpointCount ?? 0 ) > 0 ||
		( attempt.autosaveCount ?? 0 ) > 0 ||
		attempt.revisionEligible === true ||
		( attempt.operationWitnessActions?.length ?? 0 ) > 0 ||
		( attempt.operationWitnessScopes?.length ?? 0 ) > 0 ||
		!! attempt.operationWitnessPhase
	) {
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
		if ( group ) {
			incrementCounter(
				state.currentRunSuccessfulRecordCountsByGroup,
				group
			);
		}
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

function getGroupsForProfile( profile ) {
	return Object.entries( PROFILE_BY_GROUP )
		.filter( ( [ , candidateProfile ] ) => candidateProfile === profile )
		.map( ( [ group ] ) => group );
}

function hasProfileGroupConfig( group ) {
	return PROFILE_GROUPS.some(
		( profileGroup ) => profileGroup.name === group
	);
}

function getMaterializableGroupsForProfile( profile ) {
	return getGroupsForProfile( profile ).filter( ( group ) =>
		hasProfileGroupConfig( group )
	);
}

function getPrioritizedZeroRecordHealthWarningProfiles() {
	const warningProfiles = getZeroRecordHealthWarningProfiles();
	return uniqueStringList( [
		...ZERO_RECORD_PROFILE_REPAIR_ORDER.filter( ( profile ) =>
			warningProfiles.includes( profile )
		),
		...warningProfiles,
	] );
}

function getZeroRecordHealthWarningRepairGroupsForProfile( profile ) {
	const preferredRepairGroups = (
		ZERO_RECORD_PROFILE_REPAIR_GROUPS[ profile ] ?? []
	).filter(
		( group ) =>
			PROFILE_BY_GROUP[ group ] === profile &&
			hasProfileGroupConfig( group )
	);
	if ( preferredRepairGroups.length > 0 ) {
		return preferredRepairGroups;
	}
	return getMaterializableGroupsForProfile( profile );
}

function getZeroRecordHealthWarningRepairGroups() {
	return uniqueStringList(
		getPrioritizedZeroRecordHealthWarningProfiles().flatMap( ( profile ) =>
			getZeroRecordHealthWarningRepairGroupsForProfile( profile )
		)
	);
}

function hasZeroRecordHealthWarningRepairGroup( group ) {
	return getZeroRecordHealthWarningRepairGroups().includes( group );
}

function getZeroRecordHealthWarningProfiles() {
	const profiles = [];
	const addProfileFromWarning = ( warning ) => {
		const match = String( warning ?? '' ).match(
			/enabled profile "([^"]+)" has produced 0 ingested behavioral records/
		);
		if ( match ) {
			profiles.push( match[ 1 ] );
		}
	};

	for ( const warning of state.healthWarnings ?? [] ) {
		addProfileFromWarning( warning );
	}

	for ( const issue of state.coverageGuidance?.qualityIssues ?? [] ) {
		addProfileFromWarning( issue.evidence );
	}

	return uniqueStringList( profiles );
}

function getUserDocumentConcurrencyCount( section, key ) {
	return state.userDocumentConcurrency?.[ section ]?.[ String( key ) ] ?? 0;
}

function getUserDocumentConcurrencyNestedCount( section, firstKey, secondKey ) {
	return (
		state.userDocumentConcurrency?.[ section ]?.[ firstKey ]?.[
			String( secondKey )
		] ?? 0
	);
}

function getCdpCoverageRecordCount() {
	return Object.values( state.coverageHashes ?? {} ).reduce(
		( total, count ) => total + count,
		0
	);
}

function getBootstrapZeroCoveragePriorityGroups() {
	const groups = [];
	const add = ( condition, ...candidateGroups ) => {
		if ( condition ) {
			groups.push( ...candidateGroups );
		}
	};

	add(
		getFeatureCount( 'users:30' ) === 0 ||
			getFeatureCount( 'lifecycle:late-join:users-30' ) === 0 ||
			getUserDocumentConcurrencyCount( 'successfulByUserCount', 30 ) ===
				0,
		THIRTY_USER_LIFECYCLE_COMPLETION_GROUP,
		'novelty-ws-thirty-user-lifecycle'
	);
	add(
		getFeatureCount( 'history:remote-selection-cursor:ok' ) === 0 ||
			getSuccessfulProfileCount( 'collaboration-ui-signals' ) === 0,
		'novelty-ws-collaboration-ui-signals'
	);
	add(
		getFeatureCount( 'action:ui-cut-copy-paragraph' ) === 0,
		'novelty-ws-real-user-rich-text'
	);
	add(
		getUserDocumentConcurrencyCount( 'successfulByUserCount', 12 ) === 0 ||
			getSuccessfulProfileCount( 'many-user-lifecycle' ) === 0 ||
			getUserDocumentConcurrencyNestedCount(
				'successfulByProfileUserCount',
				'many-user-lifecycle',
				12
			) === 0,
		'novelty-ws-many-user-lifecycle-completion',
		'novelty-ws-many-user-lifecycle'
	);
	add(
		getFeatureCount( 'history:table-stale-snapshot:ok' ) === 0 ||
			getSuccessfulProfileCount( 'table-stale-snapshot-http' ) === 0,
		TABLE_STALE_SNAPSHOT_COMPLETION_GROUP,
		'novelty-http-table-stale-snapshot'
	);
	add(
		getFeatureCount( 'history:publish-ui-readiness:ok' ) === 0 ||
			getFeatureCount( 'history:final-persistence-publish:ok' ) < 10 ||
			getSuccessfulProfileCount(
				'large-post-three-user-http-lifecycle'
			) === 0 ||
			getUserDocumentConcurrencyNestedCount(
				'successfulByProfileUserCount',
				'large-post-three-user-http-lifecycle',
				3
			) === 0,
		'novelty-http-large-post-lifecycle-completion',
		'novelty-http-large-post-lifecycle'
	);

	return uniqueStringList( groups ).filter( ( group ) =>
		ZERO_COVERAGE_PRIORITY_GROUPS.includes( group )
	);
}

function getManyUserSuccessDeficitUserCount( group ) {
	if (
		group === 'novelty-ws-thirty-user-lifecycle' ||
		group === THIRTY_USER_LIFECYCLE_COMPLETION_GROUP
	) {
		return 30;
	}
	if (
		group === 'novelty-ws-many-user-lifecycle' ||
		group === 'novelty-ws-many-user-lifecycle-completion'
	) {
		return 12;
	}
	return null;
}

function getManyUserSuccessDeficitTarget( group ) {
	const userCount = getManyUserSuccessDeficitUserCount( group );
	if ( userCount === 30 ) {
		return 3;
	}
	if ( userCount === 12 ) {
		return 10;
	}
	return null;
}

function hasManyUserSuccessDeficit( group ) {
	const userCount = getManyUserSuccessDeficitUserCount( group );
	const target = getManyUserSuccessDeficitTarget( group );
	if ( userCount === null || target === null ) {
		return false;
	}

	return (
		getUserDocumentConcurrencyCount( 'successfulByUserCount', userCount ) <
			target ||
		getUserDocumentConcurrencyNestedCount(
			'successfulByProfileUserCount',
			'many-user-lifecycle',
			userCount
		) < target ||
		getUserDocumentConcurrencyCount(
			'successfulLifecycleByTypeUserCount',
			`late-join:${ userCount }`
		) < target
	);
}

function getManyUserSuccessDeficitReason( group ) {
	const userCount = getManyUserSuccessDeficitUserCount( group );
	const target = getManyUserSuccessDeficitTarget( group );
	const successfulByUserCount = getUserDocumentConcurrencyCount(
		'successfulByUserCount',
		userCount
	);
	const successfulByProfileUserCount = getUserDocumentConcurrencyNestedCount(
		'successfulByProfileUserCount',
		'many-user-lifecycle',
		userCount
	);
	const successfulLateJoinCount = getUserDocumentConcurrencyCount(
		'successfulLifecycleByTypeUserCount',
		`late-join:${ userCount }`
	);
	return `successful ${ userCount }-user many-user lifecycle coverage is below target: user=${ successfulByUserCount }/${ target }, profile=${ successfulByProfileUserCount }/${ target }, late-join=${ successfulLateJoinCount }/${ target }; do not let unrelated duplicate/noise holds or benchmark-canary rotation starve this success target`;
}

function getManyUserSuccessDeficitRatio( group ) {
	const userCount = getManyUserSuccessDeficitUserCount( group );
	const target = getManyUserSuccessDeficitTarget( group );
	if ( userCount === null || target === null ) {
		return 1;
	}

	const counts = [
		getUserDocumentConcurrencyCount( 'successfulByUserCount', userCount ),
		getUserDocumentConcurrencyNestedCount(
			'successfulByProfileUserCount',
			'many-user-lifecycle',
			userCount
		),
		getUserDocumentConcurrencyCount(
			'successfulLifecycleByTypeUserCount',
			`late-join:${ userCount }`
		),
	];
	return Math.min( ...counts.map( ( count ) => count / target ) );
}

function getSameUserSuccessDeficitConfig( group ) {
	if (
		group === 'novelty-ws-same-user-lifecycle' ||
		group === 'novelty-ws-same-user-stale-tabs' ||
		group === 'novelty-http-same-user-stale-draft'
	) {
		return {
			mode: 'same-user',
			target: SAME_USER_SUCCESS_TARGET,
		};
	}
	if ( group === 'novelty-ws-same-user-separate-context-lifecycle' ) {
		return {
			mode: 'same-user-separate-context',
			target: SAME_USER_SEPARATE_CONTEXT_SUCCESS_TARGET,
		};
	}
	return null;
}

function getSameUserSuccessDeficitCount( group ) {
	const config = getSameUserSuccessDeficitConfig( group );
	if ( ! config ) {
		return 0;
	}
	return getUserDocumentConcurrencyCount(
		'successfulByCollaboratorMode',
		config.mode
	);
}

function hasSameUserSuccessDeficit( group ) {
	const config = getSameUserSuccessDeficitConfig( group );
	if ( ! config ) {
		return false;
	}
	return getSameUserSuccessDeficitCount( group ) < config.target;
}

function getSameUserSuccessDeficitReason( group ) {
	const config = getSameUserSuccessDeficitConfig( group );
	if ( ! config ) {
		return 'same-user successful-completion coverage is not configured for this group';
	}
	const count = getSameUserSuccessDeficitCount( group );
	return `successful ${ config.mode } coverage is below target: ${ count }/${ config.target }; keep same-account browser-context coverage materialized until completed save/reload documents are credited`;
}

function getSameUserSuccessDeficitRatio( group ) {
	const config = getSameUserSuccessDeficitConfig( group );
	if ( ! config ) {
		return 1;
	}
	return getSameUserSuccessDeficitCount( group ) / config.target;
}

function hasSuccessDeficit( group ) {
	return (
		hasManyUserSuccessDeficit( group ) || hasSameUserSuccessDeficit( group )
	);
}

function getSuccessDeficitRatio( group ) {
	if ( hasManyUserSuccessDeficit( group ) ) {
		return getManyUserSuccessDeficitRatio( group );
	}
	if ( hasSameUserSuccessDeficit( group ) ) {
		return getSameUserSuccessDeficitRatio( group );
	}
	return 1;
}

function hasMediaCrossEntityCompletionQualityIssue() {
	return ( state.coverageGuidance?.qualityIssues ?? [] ).some(
		( issue ) => issue.id === 'completion:media-cross-entity'
	);
}

function hasMultiReloadLifecycleCompletionQualityIssue() {
	return ( state.coverageGuidance?.qualityIssues ?? [] ).some(
		( issue ) => issue.id === 'completion:multi-reload-lifecycle'
	);
}

function getCoverageQualityRepairPriorityGroups() {
	const groups = [];
	if ( hasMediaCrossEntityCompletionQualityIssue() ) {
		groups.push( MEDIA_CROSS_ENTITY_COMPLETION_GROUP );
	}
	if ( hasMultiReloadLifecycleCompletionQualityIssue() ) {
		groups.push( MULTI_RELOAD_LIFECYCLE_COMPLETION_GROUP );
	}
	for ( const profile of getPrioritizedZeroRecordHealthWarningProfiles() ) {
		groups.push(
			...getZeroRecordHealthWarningRepairGroupsForProfile( profile )
		);
	}
	return uniqueStringList( groups ).filter(
		( group ) => PROFILE_BY_GROUP[ group ]
	);
}

function hasZeroRecordHealthWarningProfile( profile ) {
	return getZeroRecordHealthWarningProfiles().includes( profile );
}

function getZeroRecordHealthWarningRepairReason( group ) {
	const profile = PROFILE_BY_GROUP[ group ];
	return `enabled profile "${ profile }" has produced 0 ingested behavioral records; run ${ group } until it proves startup and behavioral-record ingestion before expanding broader coverage`;
}

function getMediaCrossEntityCompletionQualityReason() {
	const records =
		state.currentRunRecordCountsByProfile?.[ 'media-cross-entity' ] ?? 0;
	const successful =
		state.currentRunSuccessfulRecordCountsByProfile?.[
			'media-cross-entity'
		] ?? 0;
	return `media-cross-entity completion quality is below target (${ successful }/${ records } current-run successful records); prefer the dedicated completion group with base seeded content before expanding broader media actions`;
}

function getMultiReloadLifecycleCompletionQualityReason() {
	const records =
		state.currentRunRecordCountsByProfile?.[ 'multi-reload-lifecycle' ] ??
		0;
	const successful =
		state.currentRunSuccessfulRecordCountsByProfile?.[
			'multi-reload-lifecycle'
		] ?? 0;
	return `multi-reload-lifecycle completion quality is below target (${ successful }/${ records } current-run successful records); prefer the short completion group with forced save/reload milestones before adding broader lifecycle actions`;
}

function getSuccessDeficitBypassReason( group ) {
	if (
		group === MEDIA_CROSS_ENTITY_COMPLETION_GROUP &&
		hasMediaCrossEntityCompletionQualityIssue()
	) {
		return getMediaCrossEntityCompletionQualityReason();
	}
	if (
		group === MULTI_RELOAD_LIFECYCLE_COMPLETION_GROUP &&
		hasMultiReloadLifecycleCompletionQualityIssue()
	) {
		return getMultiReloadLifecycleCompletionQualityReason();
	}
	if ( hasZeroRecordHealthWarningProfile( PROFILE_BY_GROUP[ group ] ) ) {
		return getZeroRecordHealthWarningRepairReason( group );
	}
	if ( hasSameUserSuccessDeficit( group ) ) {
		return getSameUserSuccessDeficitReason( group );
	}
	return getManyUserSuccessDeficitReason( group );
}

function getBootstrapSuccessDeficitBypassReason( group ) {
	if (
		getManyUserSuccessDeficitUserCount( group ) ||
		hasSameUserSuccessDeficit( group ) ||
		( group === MEDIA_CROSS_ENTITY_COMPLETION_GROUP &&
			hasMediaCrossEntityCompletionQualityIssue() ) ||
		( group === MULTI_RELOAD_LIFECYCLE_COMPLETION_GROUP &&
			hasMultiReloadLifecycleCompletionQualityIssue() )
	) {
		return getSuccessDeficitBypassReason( group );
	}

	return 'bounded success-deficit bootstrap canary is allowed to retest a noise-paused surface because unmet successful-completion goals are otherwise stuck behind stale cooldowns';
}

function shouldBypassProductEvidenceDuplicateHoldForSuccessDeficit(
	group,
	hold
) {
	return (
		isProductEvidenceDuplicateProducerHold( hold, group ) &&
		( ( ALLOW_SUCCESS_DEFICIT_STARTUP_NOISE_CANARY &&
			hasSuccessDeficit( group ) ) ||
			( group === MEDIA_CROSS_ENTITY_COMPLETION_GROUP &&
				hasMediaCrossEntityCompletionQualityIssue() ) ||
			( group === MULTI_RELOAD_LIFECYCLE_COMPLETION_GROUP &&
				hasMultiReloadLifecycleCompletionQualityIssue() ) )
	);
}

function shouldBypassNoisePauseForSuccessDeficit( group, pause ) {
	const hasOpenSuccessDeficit =
		hasSuccessDeficit( group ) ||
		( group === MEDIA_CROSS_ENTITY_COMPLETION_GROUP &&
			hasMediaCrossEntityCompletionQualityIssue() ) ||
		( group === MULTI_RELOAD_LIFECYCLE_COMPLETION_GROUP &&
			hasMultiReloadLifecycleCompletionQualityIssue() );
	if (
		! ALLOW_SUCCESS_DEFICIT_STARTUP_NOISE_CANARY ||
		! hasOpenSuccessDeficit ||
		! pause
	) {
		return false;
	}
	const kind =
		normalizeNoisePauseKind( pause.kind ) ??
		getStoredNoisePauseKind( pause );
	if ( kind === 'startup-noise' ) {
		return true;
	}
	if ( kind !== 'triage-duplicate-noise' ) {
		return false;
	}
	return (
		hasProductEvidenceDuplicatePauseEvidence( pause ) ||
		isProductEvidenceDuplicateProducerHold( pause, group )
	);
}

function getBootstrapSuccessDeficitGroups() {
	const successDeficitGroups = SUCCESS_DEFICIT_BOOTSTRAP_GROUPS.filter(
		hasSuccessDeficit
	).sort(
		( left, right ) =>
			getSuccessDeficitRatio( left ) - getSuccessDeficitRatio( right )
	);
	const guidanceGroups = uniqueStringList(
		( state.coverageGuidance?.unmetGoals ?? [] )
			.flatMap( ( goal ) => goal.groups ?? [] )
			.filter( ( group ) =>
				SUCCESS_DEFICIT_BOOTSTRAP_GROUP_SET.has( group )
			)
	);
	return uniqueStringList( [
		...getCoverageQualityRepairPriorityGroups(),
		...successDeficitGroups,
		...guidanceGroups,
		...SUCCESS_DEFICIT_BOOTSTRAP_GROUPS,
	] ).filter( ( group ) => PROFILE_BY_GROUP[ group ] );
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
			groups: [
				MEDIA_CROSS_ENTITY_COMPLETION_GROUP,
				'novelty-ws-media-cross-entity',
			],
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
			groups: [
				MEDIA_CROSS_ENTITY_COMPLETION_GROUP,
				'novelty-ws-media-cross-entity',
			],
			rationale:
				'media coverage should exercise attachment creation, not only synthetic URLs',
		},
		{
			id: 'media-cross-entity:reusable-block',
			label: 'real reusable block entity',
			target: 5,
			groups: [
				MEDIA_CROSS_ENTITY_COMPLETION_GROUP,
				'novelty-ws-media-cross-entity',
			],
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
			groups: [
				'novelty-ws-many-user-lifecycle-completion',
				'novelty-ws-many-user-lifecycle',
			],
			rationale:
				'three users is not enough to cover high-participant awareness and save/reload behavior',
		},
		{
			id: 'lifecycle:late-join:users-12',
			label: 'many-user late join',
			target: 10,
			groups: [
				'novelty-ws-many-user-lifecycle-completion',
				'novelty-ws-many-user-lifecycle',
			],
			rationale:
				'many-user RTC sessions need a real late join after editing has started',
		},
		{
			id: 'users:30',
			label: 'thirty-user browser session',
			target: 3,
			groups: [
				THIRTY_USER_LIFECYCLE_COMPLETION_GROUP,
				'novelty-ws-thirty-user-lifecycle',
			],
			rationale:
				'RTC can support much larger rooms than three or twelve users, so the fuzzer needs explicit thirty-user document coverage',
		},
		{
			id: 'lifecycle:late-join:users-30',
			label: 'thirty-user late join',
			target: 3,
			groups: [
				THIRTY_USER_LIFECYCLE_COMPLETION_GROUP,
				'novelty-ws-thirty-user-lifecycle',
			],
			rationale:
				'large RTC rooms need a real late join after editing has started, not only all users present at startup',
		},
		{
			id: 'history:presence-list:ok',
			label: 'presence list visible',
			target: 25,
			groups: [
				'novelty-ws-collaboration-ui-signals',
				'novelty-ws-many-user-lifecycle-completion',
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
				'novelty-ws-many-user-lifecycle-completion',
				'novelty-ws-many-user-lifecycle',
			],
			rationale:
				'selection and cursor state can fail while content convergence still passes',
		},
		{
			id: 'collaborator-mode:same-user',
			label: 'same-user two-tab mode',
			target: SAME_USER_RECORD_TARGET,
			groups: [
				'novelty-ws-same-user-lifecycle',
				'novelty-ws-same-user-stale-tabs',
				'novelty-http-same-user-stale-draft',
			],
			rationale: 'same-user tabs have different identity semantics',
		},
		{
			id: 'collaborator-mode:same-user-separate-context',
			label: 'same-user separate browser contexts',
			target: SAME_USER_SEPARATE_CONTEXT_RECORD_TARGET,
			groups: [ 'novelty-ws-same-user-separate-context-lifecycle' ],
			rationale:
				'same-account editor windows can fail differently when storage and locks come from separate browser contexts',
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
				'novelty-ws-real-user-coverage-bridge',
				REAL_USER_RELOAD_DIVERSITY_GROUP,
				'novelty-ws-real-user-save-reload',
				'novelty-ws-real-user-editing',
				'novelty-ws-real-user-rich-text',
				'novelty-http-large-post-lifecycle',
				'novelty-http-large-post-lifecycle-completion',
			],
			rationale: 'UI typing coverage must include save/reload flow',
		},
		{
			id: 'real-user-template:title-save-reload',
			label: 'real-user title save/reload',
			target: REAL_USER_EDITING_MIN_ACTION_RECORDS,
			groups: [
				'novelty-ws-real-user-coverage-bridge',
				REAL_USER_RELOAD_DIVERSITY_GROUP,
				'novelty-ws-real-user-save-reload',
				'novelty-ws-real-user-editing',
				'novelty-ws-real-user-rich-text',
				'novelty-http-large-post-lifecycle',
				'novelty-http-large-post-lifecycle-completion',
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
				'novelty-http-large-post-lifecycle-completion',
			],
			rationale:
				'large documents exercise Yjs growth, undo stacks, and block identity drift',
		},
		{
			id: 'transport-profile:http:large-post-three-user-http-lifecycle',
			label: 'large post three-user HTTP lifecycle',
			target: 10,
			groups: [
				'novelty-http-large-post-lifecycle',
				'novelty-http-large-post-lifecycle-completion',
			],
			rationale:
				'the large-post miss requires HTTP, three users, large content, lifecycle, and persistence in one gate',
		},
		{
			id: 'transport-profile:http:table-stale-snapshot-http',
			label: 'table stale snapshot over HTTP',
			target: 10,
			groups: [
				TABLE_STALE_SNAPSHOT_COMPLETION_GROUP,
				'novelty-http-table-stale-snapshot',
			],
			rationale:
				'table stale-snapshot misses require stale serialized HTML, a remote row insert, HTTP transport, and convergence in one gate',
		},
		{
			id: 'action:table-stale-snapshot-html',
			label: 'table stale HTML snapshot action',
			target: 10,
			groups: [
				TABLE_STALE_SNAPSHOT_COMPLETION_GROUP,
				'novelty-http-table-stale-snapshot',
			],
			rationale:
				'the benchmark row lost a local stale HTML cell edit while preserving the remote inserted row',
		},
		{
			id: 'history:table-stale-snapshot:ok',
			label: 'table stale snapshot oracle',
			target: 10,
			groups: [
				TABLE_STALE_SNAPSHOT_COMPLETION_GROUP,
				'novelty-http-table-stale-snapshot',
			],
			rationale:
				'the fuzz lane must prove both the stale local cell edit and remote inserted row converge',
		},
		{
			id: 'transport-profile:http:session-lifecycle',
			label: 'HTTP title reload lifecycle',
			target: 10,
			groups: [ 'novelty-http-title-reload-convergence' ],
			rationale:
				'title reload convergence over HTTP polling is not covered by equivalent WebSocket title reload rows',
		},
		{
			id: 'action:edit-title',
			label: 'HTTP title edits before reload',
			target: 10,
			groups: [ 'novelty-http-title-reload-convergence' ],
			rationale:
				'the canary timed out after a synced title edit and reload, so the fuzz lane must force title edits before lifecycle reloads',
		},
		{
			id: 'history:reload:ok',
			label: 'HTTP reload convergence',
			target: 10,
			groups: [
				'novelty-http-title-reload-convergence',
				'novelty-http-existing-post-crdt-metadata',
			],
			rationale:
				'reload checks must prove collaboration state converges with a non-empty CRDT document, not just matching rendered text',
		},
		{
			id: 'transport-profile:http:persistence-no-title',
			label: 'HTTP existing-post CRDT metadata',
			target: 10,
			groups: [ 'novelty-http-existing-post-crdt-metadata' ],
			rationale:
				'loading an existing post without CRDT metadata must create and persist a non-empty CRDT document before reload checks are trusted',
		},
		{
			id: 'invariant:final-persistence-crdt-document-present:ok',
			label: 'persisted CRDT document present',
			target: 10,
			groups: [ 'novelty-http-existing-post-crdt-metadata' ],
			rationale:
				'the canary failed because persistedCrdtDoc was empty on an existing-post reload path',
		},
		{
			id: 'history:final-ui-witness-sweep:ok',
			label: 'final UI witness sweep',
			target: 10,
			groups: [
				'novelty-http-large-post-lifecycle',
				'novelty-http-large-post-lifecycle-completion',
			],
			rationale:
				'every participant needs a marker-producing UI operation immediately before final persistence',
		},
		{
			id: 'history:final-persistence-publish:ok',
			label: 'publish persistence oracle',
			target: 10,
			groups: [
				'novelty-http-large-post-lifecycle',
				'novelty-http-large-post-lifecycle-completion',
			],
			rationale:
				'publish coverage must include REST status/content and fresh reload witnesses',
		},
		{
			id: 'history:publish-ui-readiness:ok',
			label: 'publish UI readiness oracle',
			target: 10,
			groups: [
				'novelty-http-large-post-lifecycle',
				'novelty-http-large-post-lifecycle-completion',
			],
			rationale:
				'the large-post HTTP lane must observe the publish control becoming available instead of only checking persisted REST state',
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
			id: 'success-users:2',
			label: 'successful two-user documents',
			count: getUserDocumentConcurrencyCount(
				'successfulByUserCount',
				2
			),
			target: 100,
			groups: [
				'novelty-ws-structure',
				REAL_USER_RELOAD_DIVERSITY_GROUP,
				'novelty-ws-real-user-editing',
				'novelty-ws-same-user-lifecycle',
				'novelty-ws-same-user-separate-context-lifecycle',
			],
			rationale:
				'two-user coverage must be successful completed documents, not only attempted sessions',
		},
		{
			id: 'success-users:3',
			label: 'successful three-user documents',
			count: getUserDocumentConcurrencyCount(
				'successfulByUserCount',
				3
			),
			target: 25,
			groups: [
				'novelty-ws-three-user-late-join',
				'novelty-http-large-post-lifecycle',
				'novelty-http-large-post-lifecycle-completion',
			],
			rationale:
				'three-user RTC coverage needs completed same-document records because identity and awareness bugs hide behind startup attempts',
		},
		{
			id: 'success-users:12',
			label: 'successful twelve-user documents',
			count: getUserDocumentConcurrencyCount(
				'successfulByUserCount',
				12
			),
			target: 10,
			groups: [
				'novelty-ws-many-user-lifecycle-completion',
				'novelty-ws-many-user-lifecycle',
			],
			rationale:
				'many-user coverage must reach a completed document with all users, not just launch many browsers',
		},
		{
			id: 'success-users:30',
			label: 'successful thirty-user documents',
			count: getUserDocumentConcurrencyCount(
				'successfulByUserCount',
				30
			),
			target: 3,
			groups: [
				THIRTY_USER_LIFECYCLE_COMPLETION_GROUP,
				'novelty-ws-thirty-user-lifecycle',
			],
			rationale:
				'thirty-user RTC coverage must reach a completed document with all users, not just launch many browsers',
		},
		{
			id: 'success-action-users:2',
			label: 'successful documents edited by two users',
			count: getUserDocumentConcurrencyCount(
				'successfulRecordsWithActionUserCountAtLeast',
				2
			),
			target: 50,
			groups: [
				'novelty-ws-structure',
				REAL_USER_RELOAD_DIVERSITY_GROUP,
				'novelty-ws-real-user-editing',
				'novelty-ws-real-user-rich-text',
			],
			rationale:
				'multi-user documents should include edits by multiple users, not a passive observer',
		},
		{
			id: 'success-action-users:3',
			label: 'successful documents edited by three users',
			count: getUserDocumentConcurrencyCount(
				'successfulRecordsWithActionUserCountAtLeast',
				3
			),
			target: 10,
			groups: [
				'novelty-ws-three-user-late-join',
				'novelty-ws-many-user-lifecycle-completion',
				'novelty-ws-many-user-lifecycle',
			],
			rationale:
				'three-user coverage should prove edits from at least three participants converge',
		},
		{
			id: 'success-collaborator-mode:same-user',
			label: 'successful same-user tab documents',
			count: getUserDocumentConcurrencyCount(
				'successfulByCollaboratorMode',
				'same-user'
			),
			target: SAME_USER_SUCCESS_TARGET,
			groups: [
				'novelty-ws-same-user-lifecycle',
				'novelty-ws-same-user-stale-tabs',
				'novelty-http-same-user-stale-draft',
			],
			rationale:
				'same-user tabs need successful completion because storage, locks, awareness, and save authority can diverge',
		},
		{
			id: 'success-collaborator-mode:same-user-separate-context',
			label: 'successful same-user separate-context documents',
			count: getUserDocumentConcurrencyCount(
				'successfulByCollaboratorMode',
				'same-user-separate-context'
			),
			target: SAME_USER_SEPARATE_CONTEXT_SUCCESS_TARGET,
			groups: [ 'novelty-ws-same-user-separate-context-lifecycle' ],
			rationale:
				'same-account separate-context windows need successful completion because browser storage, locks, and save authority can diverge',
		},
		{
			id: 'success-lifecycle:late-join:users-12',
			label: 'successful twelve-user late join documents',
			count: getUserDocumentConcurrencyCount(
				'successfulLifecycleByTypeUserCount',
				'late-join:12'
			),
			target: 10,
			groups: [
				'novelty-ws-many-user-lifecycle-completion',
				'novelty-ws-many-user-lifecycle',
			],
			rationale:
				'many-user RTC needs successful late joins after editing has started',
		},
		{
			id: 'success-lifecycle:late-join:users-30',
			label: 'successful thirty-user late join documents',
			count: getUserDocumentConcurrencyCount(
				'successfulLifecycleByTypeUserCount',
				'late-join:30'
			),
			target: 3,
			groups: [
				THIRTY_USER_LIFECYCLE_COMPLETION_GROUP,
				'novelty-ws-thirty-user-lifecycle',
			],
			rationale:
				'thirty-user RTC needs successful late joins after editing has started',
		},
		{
			id: 'success-profile-users:large-post-three-user-http-lifecycle:3',
			label: 'successful large-post HTTP records with three users',
			count: getUserDocumentConcurrencyNestedCount(
				'successfulByProfileUserCount',
				'large-post-three-user-http-lifecycle',
				3
			),
			target: 10,
			groups: [
				'novelty-http-large-post-lifecycle',
				'novelty-http-large-post-lifecycle-completion',
			],
			rationale:
				'the large-post HTTP target needs HTTP, three users, lifecycle, persistence, and successful completion in the same record',
		},
		{
			id: 'success-profile-users:many-user-lifecycle:12',
			label: 'successful many-user lifecycle records with twelve users',
			count: getUserDocumentConcurrencyNestedCount(
				'successfulByProfileUserCount',
				'many-user-lifecycle',
				12
			),
			target: 10,
			groups: [
				'novelty-ws-many-user-lifecycle-completion',
				'novelty-ws-many-user-lifecycle',
			],
			rationale:
				'the many-user target should count successful twelve-user records, not generic users:12 attempts',
		},
		{
			id: 'success-profile-users:many-user-lifecycle:30',
			label: 'successful many-user lifecycle records with thirty users',
			count: getUserDocumentConcurrencyNestedCount(
				'successfulByProfileUserCount',
				'many-user-lifecycle',
				30
			),
			target: 3,
			groups: [
				THIRTY_USER_LIFECYCLE_COMPLETION_GROUP,
				'novelty-ws-thirty-user-lifecycle',
			],
			rationale:
				'the thirty-user target should count successful thirty-user records, not generic many-user attempts',
		},
		{
			id: 'success-profile-users:three-user-late-join:3',
			label: 'successful three-user late-join records',
			count: getUserDocumentConcurrencyNestedCount(
				'successfulByProfileUserCount',
				'three-user-late-join',
				3
			),
			target: 25,
			groups: [ 'novelty-ws-three-user-late-join' ],
			rationale:
				'late-join should reach and complete a real three-user document',
		},
		{
			id: 'success-user-blocks:3:50',
			label: 'successful three-user large documents',
			count: getUserDocumentConcurrencyCount(
				'successfulRecordsByUserBlockBucket',
				'users-3:blocks-50'
			),
			target: 5,
			groups: [
				'novelty-http-large-post-lifecycle',
				'novelty-http-large-post-lifecycle-completion',
				'novelty-ws-long-session-large-doc',
			],
			rationale:
				'large documents and multi-user sessions need to be combined in the same successful document',
		},
	] ) {
		addGoal( {
			...goal,
			harnessAfter: goal.target * 4,
			countSource: 'user-document-concurrency',
		} );
	}

	for ( const goal of [
		{
			profile: 'real-user-editing',
			target: REAL_USER_EDITING_MIN_RECORDS,
			groups: [
				'novelty-ws-real-user-coverage-bridge',
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
			groups: [
				MEDIA_CROSS_ENTITY_COMPLETION_GROUP,
				'novelty-ws-media-cross-entity',
			],
			rationale:
				'media and cross-entity coverage needs successful end-to-end runs',
		},
		{
			profile: 'large-post-three-user-http-lifecycle',
			target: 10,
			groups: [
				'novelty-http-large-post-lifecycle',
				'novelty-http-large-post-lifecycle-completion',
			],
			rationale:
				'the combined large-post HTTP lifecycle gate needs completed records',
		},
		{
			profile: 'table-stale-snapshot-http',
			target: 10,
			groups: [
				TABLE_STALE_SNAPSHOT_COMPLETION_GROUP,
				'novelty-http-table-stale-snapshot',
			],
			rationale:
				'table stale-snapshot coverage needs completed HTTP seeds, not only parser/table attribute mutations',
		},
		{
			profile: 'many-user-lifecycle',
			target: 10,
			groups: [
				'novelty-ws-many-user-lifecycle-completion',
				'novelty-ws-many-user-lifecycle',
			],
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
			'novelty-ws-real-user-coverage-bridge',
			REAL_USER_RELOAD_DIVERSITY_GROUP,
			'novelty-ws-real-user-save-reload',
			'novelty-ws-real-user-editing',
			'novelty-ws-real-user-rich-text',
			'novelty-ws-async-server-blocks',
			'novelty-ws-media-cross-entity',
			MEDIA_CROSS_ENTITY_COMPLETION_GROUP,
			'novelty-ws-long-session-large-doc',
			'novelty-http-large-post-lifecycle',
			'novelty-http-large-post-lifecycle-completion',
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

function getCoverageCompletionRecommendedAction( profile ) {
	if ( profile === 'media-cross-entity' ) {
		return `run ${ MEDIA_CROSS_ENTITY_COMPLETION_GROUP } with base seeded content before adding another media fuzz-action class`;
	}
	if ( profile === 'multi-reload-lifecycle' ) {
		return `run ${ MULTI_RELOAD_LIFECYCLE_COMPLETION_GROUP } with forced save/reload milestones before adding broader lifecycle actions`;
	}
	return 'improve profile completion before adding another large fuzz-action class';
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
				getCoverageCompletionRecommendedAction( profile ),
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
		triageYield.signatureCount >= TRIAGE_NOISE_DOMINANCE_MIN_CANDIDATES &&
		( triageYield.topSemanticFamilies?.[ 0 ]?.count ?? 0 ) >=
			Math.max(
				2,
				Math.ceil(
					TRIAGE_NOISE_DOMINANCE_MIN_CANDIDATES *
						TRIAGE_DUPLICATE_SHARE_HOLD
				)
			)
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
		const localHold = rootHold?.actionGate
			? getCurrentRunActionGateProducerHold( localYield, {
					rootHold,
			  } ) ?? getCurrentRunActionGateDuplicateHold( localYield )
			: getCurrentRunDuplicateNoiseHold( localYield, {
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
		getActionGateProductEvidenceCount( rootHold, null )
	);
	const hasProductEvidence =
		productEvidenceRecords > 0 ||
		isActionGateProductEvidenceDuplicateHold( rootHold );
	const reason = `current-run duplicate/noise hold is active for ${ rootHold.family } (${ rootHold.count } signatures, share=${ rootHold.share }, source=${ rootHold.source }) but no active producer group matched it; writing no-analysis sentinels only for local run dirs that reproduce the same family hold`;
	await writeNoAnalysisSentinelsForRunDirs(
		matches.map( ( match ) => match.runDir ),
		{
			reason,
			reasonKind: getEffectiveDuplicateNoiseHoldKind( rootHold ),
			family: rootHold.family,
			source: 'local-current-run-noise-hold',
			...( isCurrentNoProductStartupHold( rootHold ) ||
			rootHold?.actionGate
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
	const profileIndex = Math.max(
		0,
		PROFILE_GROUPS.findIndex(
			( candidate ) => candidate.name === profile.name
		)
	);
	const wpEnvPortBase = Number.parseInt( WP_ENV_PORT, 10 );
	const wpEnvPort = Number.isNaN( wpEnvPortBase )
		? WP_ENV_PORT
		: String( wpEnvPortBase + profileIndex * 4 );
	const baseUrl = Number.isNaN( wpEnvPortBase )
		? BASE_URL
		: `http://localhost:${ wpEnvPort }`;
	const wsPortBase = Number.parseInt( WS_PORT, 10 );
	const wsPort = Number.isNaN( wsPortBase )
		? WS_PORT
		: String( wsPortBase + profileIndex );
	const repoRoot = REPOS_BASE
		? path.join( REPOS_BASE, profile.name )
		: REPO_ROOT;
	const transportEnv =
		transport === 'ws'
			? {
					GUTENBERG_RTC_TEST_WS_PROVIDER: '1',
					GUTENBERG_RTC_TEST_WS_PORT: wsPort,
					GUTENBERG_RTC_TEST_WS_URL: `ws://127.0.0.1:${ wsPort }`,
			  }
			: {
					GUTENBERG_RTC_TEST_WS_PROVIDER: '0',
			  };
	const env = {
		...( transport === 'ws' ? WS_ENV_DEFAULTS : {} ),
		RTC_FUZZ_ANALYSIS_RECHECKS: '1',
		RTC_FUZZ_BOOTSTRAP_STALL_RECHECKS: '0',
		GUTENBERG_RTC_BROWSER_ACTION_PROFILE: profile.actionProfile,
		GUTENBERG_RTC_BROWSER_COLLECT_CDP_COVERAGE: profile.collectCdpCoverage
			? '1'
			: '0',
		...profile.env,
		...transportEnv,
		...( WP_ENV_HOME_BASE
			? { WP_ENV_HOME: path.join( WP_ENV_HOME_BASE, profile.name ) }
			: {} ),
		WP_ENV_PORT: wpEnvPort,
		WP_ENV_TESTS_PORT: Number.isNaN( wpEnvPortBase )
			? profile.env?.WP_ENV_TESTS_PORT
			: String( Number.parseInt( wpEnvPort, 10 ) + 1 ),
		WP_ENV_PHPMYADMIN_PORT: Number.isNaN( wpEnvPortBase )
			? profile.env?.WP_ENV_PHPMYADMIN_PORT
			: String( Number.parseInt( wpEnvPort, 10 ) + 2 ),
		WP_BASE_URL: baseUrl,
		RTC_FUZZ_BASE_URL: baseUrl,
	};
	assertNoBehaviorDisableEnv( env, profile.name );

	return {
		name: profile.name,
		repoRoot,
		transport,
		fuzzLevel: profile.fuzzLevel ?? 'browser-e2e',
		lanes: profile.lanes ?? 1,
		startSeed: profile.startSeed,
		stepCount: profile.stepCount,
		...( transport === 'ws'
			? { wsPort: Number.parseInt( wsPort, 10 ) }
			: {} ),
		env,
	};
}

const NOVELTY_GROUP_HARNESS_OVERLAY_PATHS = [
	'.wp-env.test.json',
	'packages/env/lib/runtime/docker/build-docker-compose-config.js',
	'test/e2e/config/global-setup.ts',
	'test/e2e/config/rtc-websocket-setup.ts',
	'test/e2e/specs/editor/collaboration',
	'packages/e2e-tests/plugins/rtc-websocket-provider',
];
const NOVELTY_GROUP_HARNESS_MANIFEST = '.js2-harness-overlay-manifest.json';
let noveltyGroupHarnessOverlayManifestPromise = null;

async function collectHarnessOverlayFiles( relativePath, files ) {
	const sourcePath = path.join( REPO_ROOT, relativePath );
	let stat;
	try {
		stat = await fs.lstat( sourcePath );
	} catch ( error ) {
		if ( error?.code === 'ENOENT' ) {
			return;
		}
		throw error;
	}
	if ( ! stat.isDirectory() ) {
		files.push( relativePath );
		return;
	}

	const entries = await fs.readdir( sourcePath, { withFileTypes: true } );
	for ( const entry of entries.sort( ( left, right ) =>
		left.name.localeCompare( right.name )
	) ) {
		await collectHarnessOverlayFiles(
			path.join( relativePath, entry.name ),
			files
		);
	}
}

async function getNoveltyGroupHarnessOverlayManifest() {
	if ( noveltyGroupHarnessOverlayManifestPromise ) {
		return noveltyGroupHarnessOverlayManifestPromise;
	}
	noveltyGroupHarnessOverlayManifestPromise = ( async () => {
		const files = [];
		const binEntries = await fs.readdir( path.join( REPO_ROOT, 'bin' ), {
			withFileTypes: true,
		} );
		for ( const entry of binEntries
			.filter(
				( candidate ) =>
					candidate.name.startsWith( 'rtc-' ) &&
					( candidate.isFile() || candidate.isSymbolicLink() )
			)
			.sort( ( left, right ) =>
				left.name.localeCompare( right.name )
			) ) {
			files.push( path.join( 'bin', entry.name ) );
		}
		for ( const relativePath of NOVELTY_GROUP_HARNESS_OVERLAY_PATHS ) {
			await collectHarnessOverlayFiles( relativePath, files );
		}

		const uniqueFiles = uniqueStringList( files ).sort();
		const hash = crypto.createHash( 'sha256' );
		for ( const relativePath of uniqueFiles ) {
			const sourcePath = path.join( REPO_ROOT, relativePath );
			const stat = await fs.lstat( sourcePath );
			hash.update( relativePath );
			hash.update( '\0' );
			hash.update( String( stat.mode & 0o777 ) );
			hash.update( '\0' );
			if ( stat.isSymbolicLink() ) {
				hash.update( await fs.readlink( sourcePath ) );
			} else {
				hash.update( await fs.readFile( sourcePath ) );
			}
			hash.update( '\0' );
		}
		return {
			signature: hash.digest( 'hex' ),
			files: uniqueFiles,
		};
	} )();
	return noveltyGroupHarnessOverlayManifestPromise;
}

async function copyHarnessOverlayFileAtomic( relativePath, destinationRoot ) {
	const sourcePath = path.join( REPO_ROOT, relativePath );
	const destinationPath = path.join( destinationRoot, relativePath );
	const stat = await fs.lstat( sourcePath );
	const temporaryPath = `${ destinationPath }.js2-sync-${
		process.pid
	}-${ Math.random().toString( 16 ).slice( 2 ) }`;
	await fs.mkdir( path.dirname( destinationPath ), { recursive: true } );
	await fs.rm( temporaryPath, { force: true, recursive: true } );
	if ( stat.isSymbolicLink() ) {
		await fs.symlink( await fs.readlink( sourcePath ), temporaryPath );
	} else {
		await fs.copyFile( sourcePath, temporaryPath );
		await fs.chmod( temporaryPath, stat.mode & 0o777 );
	}
	await fs.rename( temporaryPath, destinationPath );
}

async function syncNoveltyGroupHarnessOverlay( group ) {
	const manifest = await getNoveltyGroupHarnessOverlayManifest();
	const manifestPath = path.join(
		group.repoRoot,
		NOVELTY_GROUP_HARNESS_MANIFEST
	);
	const previousManifest = await readJsonFile( manifestPath );
	if ( previousManifest?.signature === manifest.signature ) {
		return false;
	}

	for ( const relativePath of manifest.files ) {
		await copyHarnessOverlayFileAtomic( relativePath, group.repoRoot );
	}
	for ( const relativePath of previousManifest?.files ?? [] ) {
		if ( ! manifest.files.includes( relativePath ) ) {
			await fs.rm( path.join( group.repoRoot, relativePath ), {
				force: true,
				recursive: true,
			} );
		}
	}
	await writeJsonFileAtomic( manifestPath, manifest );
	state.changes.push( {
		at: new Date().toISOString(),
		action: 'sync-isolated-novelty-harness-overlay',
		group: group.name,
		repoRoot: group.repoRoot,
		signature: manifest.signature,
		fileCount: manifest.files.length,
		reason: 'existing isolated group repos must run the same versioned harness as the frozen candidate instead of retaining stale runner, launcher, triage, or editor-oracle files',
	} );
	await terminateGroupLanes(
		group.name,
		'isolated group harness changed; restart any active lane so it loads the synchronized runner and editor-oracle files',
		{
			action: 'terminate-stale-isolated-harness-lanes',
			logLabel: 'stale isolated harness group',
		}
	);
	return true;
}

async function ensureNoveltyGroupRepo( group ) {
	if ( ! REPOS_BASE || group.repoRoot === REPO_ROOT ) {
		return;
	}
	try {
		await fs.access( path.join( group.repoRoot, 'package.json' ) );
		await syncNoveltyGroupHarnessOverlay( group );
		return;
	} catch {}

	await fs.mkdir( path.dirname( group.repoRoot ), { recursive: true } );
	const tmpRepoRoot = `${ group.repoRoot }.tmp-${ process.pid }`;
	await fs.rm( tmpRepoRoot, { recursive: true, force: true } );
	await fs.rm( group.repoRoot, { recursive: true, force: true } );
	await fs.mkdir( tmpRepoRoot, { recursive: true } );
	await log(
		`preparing isolated novelty repo for ${ group.name }: ${ group.repoRoot }`
	);
	const child = spawn(
		'bash',
		[
			'-lc',
			[
				'set -euo pipefail',
				'src=$1',
				'dest=$2',
				'if command -v rsync >/dev/null 2>&1; then',
				'  set +e',
				'  rsync -a --delete --exclude=/artifacts --exclude=/node_modules --exclude=/vendor "$src"/ "$dest"/',
				'  code=$?',
				'  set -e',
				'  if [ "$code" -eq 0 ] || [ "$code" -eq 24 ]; then',
				'    for dependency in node_modules vendor; do',
				'      [ ! -e "$src/$dependency" ] || ln -s "$src/$dependency" "$dest/$dependency"',
				'    done',
				'    exit 0',
				'  fi',
				'  exit "$code"',
				'fi',
				'shopt -s dotglob nullglob',
				'for item in "$src"/*; do',
				'  name=${item##*/}',
				'  case "$name" in artifacts|node_modules|vendor) continue ;; esac',
				'  for attempt in 1 2 3; do',
				'    if cp -a --reflink=auto "$item" "$dest/"; then',
				'      break',
				'    fi',
				'    if [ ! -e "$item" ] && [ ! -L "$item" ]; then',
				'      break',
				'    fi',
				'    rm -rf "$dest/$name"',
				'    if [ "$attempt" -eq 3 ]; then',
				'      exit 1',
				'    fi',
				'    sleep 1',
				'  done',
				'done',
				'for dependency in node_modules vendor; do',
				'  [ ! -e "$src/$dependency" ] || ln -s "$src/$dependency" "$dest/$dependency"',
				'done',
			].join( '\n' ),
			'bash',
			REPO_ROOT,
			tmpRepoRoot,
		],
		{ stdio: 'inherit' }
	);
	const exit = await new Promise( ( resolve, reject ) => {
		child.on( 'error', reject );
		child.on( 'close', ( code, signal ) => {
			resolve( { code, signal } );
		} );
	} );
	if ( exit.code !== 0 ) {
		throw new Error(
			`repo prep failed for ${ group.name } with code=${ exit.code }${
				exit.signal ? ` signal=${ exit.signal }` : ''
			}`
		);
	}
	await fs.rename( tmpRepoRoot, group.repoRoot );
	await syncNoveltyGroupHarnessOverlay( group );
}

const queuedNoveltyRepoPrepRoots = new Set();
const pendingNoveltyRepoPrepGroups = [];
let noveltyRepoPrepPromise = null;

function queueNoveltyGroupRepoPrep(
	groups,
	reason,
	{ priority = false } = {}
) {
	if ( ! REPOS_BASE ) {
		return;
	}

	const priorityEntries = [];
	for ( const group of groups ) {
		if ( ! group?.repoRoot || group.repoRoot === REPO_ROOT ) {
			continue;
		}

		const pendingIndex = pendingNoveltyRepoPrepGroups.findIndex(
			( entry ) => entry.group?.repoRoot === group.repoRoot
		);
		if ( priority && pendingIndex !== -1 ) {
			const [ entry ] = pendingNoveltyRepoPrepGroups.splice(
				pendingIndex,
				1
			);
			priorityEntries.push( { ...entry, group, reason } );
			continue;
		}

		if ( queuedNoveltyRepoPrepRoots.has( group.repoRoot ) ) {
			continue;
		}

		queuedNoveltyRepoPrepRoots.add( group.repoRoot );
		const entry = { group, reason };
		if ( priority ) {
			priorityEntries.push( entry );
		} else {
			pendingNoveltyRepoPrepGroups.push( entry );
		}
	}

	if ( priorityEntries.length > 0 ) {
		pendingNoveltyRepoPrepGroups.unshift( ...priorityEntries );
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'prioritize-novelty-repo-prep',
			groups: priorityEntries.map( ( entry ) => entry.group.name ),
			reason: 'open benchmark-canary rows need isolated repos before lower-priority published groups can consume startup slots',
		} );
	}

	if ( noveltyRepoPrepPromise ) {
		return;
	}

	noveltyRepoPrepPromise = ( async () => {
		while ( pendingNoveltyRepoPrepGroups.length > 0 ) {
			const { group, reason: prepReason } =
				pendingNoveltyRepoPrepGroups.shift();
			try {
				await ensureNoveltyGroupRepo( group );
				await log(
					`prepared isolated novelty repo for ${ group.name }: ${ group.repoRoot } (${ prepReason })`
				);
			} catch ( error ) {
				await log(
					`ACTION-NEEDED: failed to prepare isolated novelty repo for ${
						group.name
					}: ${ error.stack ?? error.message }`
				);
			} finally {
				queuedNoveltyRepoPrepRoots.delete( group.repoRoot );
			}
		}
	} )().finally( () => {
		noveltyRepoPrepPromise = null;
		if ( pendingNoveltyRepoPrepGroups.length > 0 ) {
			queueNoveltyGroupRepoPrep( [], 'continue-queued-repo-prep' );
		}
	} );
}

async function writeSupervisorGroupsForEnabledGroups( enabledGroups ) {
	if ( PRODUCER_BUDGET_DISABLED ) {
		state.enabledGroups = [];
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'publish-empty-supervisor-groups-for-zero-budget',
			reason: 'producer budget is disabled; do not publish policy, coverage-gap, canary, or rescue groups while the resource autoscaler requests zero browser producers',
		} );
		await writeJsonFileAtomic( GROUPS_PATH, [] );
		return;
	}
	const enabled = new Set( enabledGroups ?? [] );
	const deferredBenchmarkCanaryGroups =
		getDeferredBenchmarkCanaryForcedGroupSet();
	const protectedBenchmarkCanaryGroupsForBudget =
		getProtectedBenchmarkCanaryGroupsForBudget();
	const activePolicyRequiredGroups = getActivePolicyRequiredBootstrapGroups();
	const activePolicyRequiredGroupSet = new Set( activePolicyRequiredGroups );
	for ( const group of deferredBenchmarkCanaryGroups ) {
		enabled.delete( group );
	}
	for ( const group of protectedBenchmarkCanaryGroupsForBudget ) {
		if (
			PROFILE_BY_GROUP[ group ] &&
			! deferredBenchmarkCanaryGroups.has( group )
		) {
			enabled.add( group );
		}
	}
	for ( const group of activePolicyRequiredGroups ) {
		if ( PROFILE_BY_GROUP[ group ] && ! state.disabledGroups?.[ group ] ) {
			enabled.add( group );
		}
	}
	for ( const group of getCoverageGapPublicationCandidateGroups() ) {
		enabled.add( group );
	}
	for ( const group of state.productFailureQuarantinedGroups ?? [] ) {
		enabled.delete( group );
	}
	const deferredPolicyRequiredGroups =
		POLICY_REQUIRED_BOOTSTRAP_GROUPS.filter(
			( group ) => ! activePolicyRequiredGroupSet.has( group )
		);
	if ( deferredPolicyRequiredGroups.length > 0 ) {
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'defer-policy-required-groups-for-open-benchmark-canary-cap',
			groups: deferredPolicyRequiredGroups,
			openBenchmarkCanaryGroups:
				getAuthoritativeOpenBenchmarkCanaryFloorGroups(),
			nonDeferredGroups: activePolicyRequiredGroups,
			maxEnabledGroups: MAX_ENABLED_GROUPS,
			reason: 'deadline benchmark-canary cap has more open canary rows than browser slots; defer only reference-oracle policy coverage while keeping plain product-smoke coverage materialized',
		} );
	}
	for ( const group of [ ...enabled ] ) {
		const publicationBlock =
			getSupervisorGroupPublicationNoiseBlock( group );
		if ( ! publicationBlock ) {
			continue;
		}
		if ( POLICY_REQUIRED_BOOTSTRAP_GROUP_SET.has( group ) ) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'bypass-policy-required-supervisor-publication-block',
				group,
				reason: 'policy-required oracle coverage must remain materialized even when deadline/noise publication gates would otherwise collapse the producer set',
				blockReason: publicationBlock.reason,
			} );
			continue;
		}
		if ( shouldProtectOpenBenchmarkCanaryPromotionGroup( group ) ) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'bypass-open-benchmark-canary-publication-noise-block',
				group,
				reason: 'current benchmark-canary status is still open for this promotion-blocked group; keep it in supervisor-groups.json until direct current-run green, explicit downscope, or exact product routing exists',
				blockReason: publicationBlock.reason,
			} );
			continue;
		}
		enabled.delete( group );
		if ( isNoProductStartupNoiseCooldown( publicationBlock.pause ) ) {
			recordBenchmarkCanaryNoProductStartupNoiseBlock(
				publicationBlock.action,
				group,
				publicationBlock.pause
			);
		}
		recordSupervisorGroupPublicationNoiseBlock( group, publicationBlock );
		await writeNoAnalysisSentinelsForGroup(
			group,
			publicationBlock.reason,
			publicationBlock.metadata
		);
	}
	const groupProfilesByName = new Map(
		PROFILE_GROUPS.map( ( profile ) => [ profile.name, profile ] )
	);
	const rawOrderedGroups = orderEnabledGroupsForSupervisor( [ ...enabled ] );
	const benchmarkCanarySchedulingLimit =
		isDeadlineBenchmarkCanaryBudgetCapActive()
			? getBenchmarkCanarySchedulingLimit()
			: MAX_ENABLED_GROUPS;
	const baseSupervisorGroupLimit = isDeadlineBenchmarkCanaryBudgetCapActive()
		? benchmarkCanarySchedulingLimit
		: MAX_ENABLED_GROUPS;
	const requiredFirstGreenProductGroups = [
		...REQUIRED_FIRST_GREEN_PRODUCT_GROUPS,
	].filter(
		( group ) =>
			enabled.has( group ) &&
			( state.currentRunSuccessfulRecordCountsByGroup?.[ group ] ??
				0 ) === 0
	);
	const protectedBenchmarkGroupsInOrder = uniqueStringList( [
		...protectedBenchmarkCanaryGroupsForBudget.filter( ( group ) =>
			enabled.has( group )
		),
		...( isDeadlineBenchmarkCanaryBudgetCapActive()
			? [ ...enabled ].filter(
					( group ) =>
						PROFILE_BY_GROUP[ group ] &&
						! deferredBenchmarkCanaryGroups.has( group ) &&
						shouldProtectOpenBenchmarkCanaryPromotionGroup( group )
			  )
			: [] ),
	] );
	const orderedGroups = uniqueStringList( [
		...requiredFirstGreenProductGroups,
		...( isDeadlineBenchmarkCanaryBudgetCapActive()
			? [ ...protectedBenchmarkGroupsInOrder, ...rawOrderedGroups ]
			: orderSupervisorGroupsWithCoverageGapReserve(
					[ ...protectedBenchmarkGroupsInOrder, ...rawOrderedGroups ],
					baseSupervisorGroupLimit
			  ) ),
	] );
	if (
		protectedBenchmarkCanaryGroupsForBudget.length > 0 &&
		rawOrderedGroups[ 0 ] !== protectedBenchmarkCanaryGroupsForBudget[ 0 ]
	) {
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'prioritize-open-exact-stack-benchmark-canaries',
			groups: protectedBenchmarkCanaryGroupsForBudget,
			displacedFirstGroup: rawOrderedGroups[ 0 ] ?? null,
			reason: 'current benchmark-canary exact-stack rows are still promotion-blocked; under the deadline cap these rows must consume publication slots before generic bootstrap/product-smoke groups',
		} );
	}
	const supervisorGroupLimit = Math.min(
		baseSupervisorGroupLimit,
		getPolicyProtectedSupervisorGroupLimit(
			baseSupervisorGroupLimit,
			orderedGroups
		)
	);
	const publishedGroups = orderedGroups.slice( 0, supervisorGroupLimit );
	const expectedProtectedBenchmarkGroups =
		protectedBenchmarkGroupsInOrder.slice(
			0,
			Math.max(
				0,
				supervisorGroupLimit - requiredFirstGreenProductGroups.length
			)
		);
	const missingProtectedBenchmarkGroups =
		expectedProtectedBenchmarkGroups.filter(
			( group ) => ! publishedGroups.includes( group )
		);
	const protectedPublicationMarker =
		missingProtectedBenchmarkGroups.join( ',' );
	if (
		state.missingProtectedBenchmarkPublicationMarker !==
		protectedPublicationMarker
	) {
		state.missingProtectedBenchmarkPublicationMarker =
			protectedPublicationMarker;
		state.changes.push( {
			at: new Date().toISOString(),
			action: missingProtectedBenchmarkGroups.length
				? 'protected-benchmark-canary-publication-invariant-failed'
				: 'protected-benchmark-canary-publication-invariant-satisfied',
			groups: missingProtectedBenchmarkGroups,
			expectedGroups: expectedProtectedBenchmarkGroups,
			publishedGroups,
			reason: missingProtectedBenchmarkGroups.length
				? 'current-candidate promotion blockers were displaced after final producer-budget ordering'
				: 'all protected benchmark canaries that fit after mandatory product smoke are ahead of generic coverage-gap backfill',
		} );
	}
	if ( orderedGroups.length > publishedGroups.length ) {
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'cap-supervisor-groups-to-effective-budget',
			groups: publishedGroups,
			suppressedGroups: orderedGroups.slice( supervisorGroupLimit ),
			maxEnabledGroups: supervisorGroupLimit,
			reason: 'low-disk deadline budget publishes only the highest-priority materializable groups instead of advertising broad forced rows that the autoscaler must trim after startup',
		} );
	}
	state.enabledGroups = publishedGroups;
	const harnessOverlaySignature = REPOS_BASE
		? ( await getNoveltyGroupHarnessOverlayManifest() ).signature
		: null;
	const groups = publishedGroups
		.map( ( group ) => groupProfilesByName.get( group ) )
		.filter( Boolean )
		.map( ( profile ) => {
			const group = buildGroup( profile );
			if ( harnessOverlaySignature ) {
				group.harnessOverlaySignature = harnessOverlaySignature;
			}
			if (
				shouldProtectOpenBenchmarkCanaryPromotionGroup( group.name ) ||
				activePolicyRequiredGroupSet.has( group.name )
			) {
				group.env = {
					...( group.env ?? {} ),
					RTC_FUZZ_SUPERVISOR_BYPASS_NO_PRODUCT_STARTUP_STALL_GUARD:
						'1',
					RTC_FUZZ_SUPERVISOR_BYPASS_STARTUP_STALL_COOLDOWN: '1',
					RTC_FUZZ_SUPERVISOR_BYPASS_STARTUP_STALL_SEED_DRAIN: '1',
				};
			}
			return group;
		} );
	await writeJsonFileAtomic( GROUPS_PATH, groups );
	queueNoveltyGroupRepoPrep(
		groups,
		'supervisor group publication must not block on per-group repo preparation',
		{
			priority: protectedBenchmarkCanaryGroupsForBudget.some( ( group ) =>
				publishedGroups.includes( group )
			),
		}
	);
	for ( const group of deferredBenchmarkCanaryGroups ) {
		if ( PROFILE_BY_GROUP[ group ] ) {
			await terminateGroupLanes(
				group,
				'deadline-deferred benchmark-canary group must not consume active supervisor capacity while unblocked PR-evidence rows still need current-run coverage',
				{
					action: 'terminate-deadline-deferred-benchmark-canary-lanes',
					logLabel: 'deadline-deferred benchmark canary group',
				}
			);
		}
	}
}

async function applyPolicy(
	novelty,
	resources,
	triageYield,
	guidance,
	supervisorState = null
) {
	const enabled = new Set( state.enabledGroups );
	const productFailureQuarantines =
		syncProductFailureQuarantines( supervisorState );
	for ( const group of productFailureQuarantines ) {
		enabled.delete( group );
	}
	const supervisorGroupsByName = new Map(
		( supervisorState?.groups ?? [] ).map( ( groupState ) => [
			groupState.name,
			groupState,
		] )
	);
	syncBenchmarkCanarySupervisorProductEvidence( supervisorState );
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
	const sameUserSeparateContextLifecycleEnabled = enabled.has(
		'novelty-ws-same-user-separate-context-lifecycle'
	);
	const parserSerializationEnabled = enabled.has(
		'novelty-ws-parser-serialization'
	);
	const parserTransformEnabled = enabled.has( 'novelty-ws-parser-transform' );
	const realUserEditingEnabled = enabled.has(
		'novelty-ws-real-user-editing'
	);
	const realUserRichTextEnabled = enabled.has(
		'novelty-ws-real-user-rich-text'
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
	const activeCurrentRunActionGateDuplicateHold = PAUSE_ON_TRIAGE_NOISE
		? withRunDirProducerGroups(
				getCurrentRunActionGateDuplicateHold(
					activeDuplicateNoiseTriageYield
				),
				state.currentRunDirs ?? []
		  )
		: null;
	const drainCurrentRunActionGateDuplicateHold = PAUSE_ON_TRIAGE_NOISE
		? withRunDirProducerGroups(
				getCurrentRunActionGateDuplicateHold(
					drainDuplicateNoiseTriageYield
				),
				state.currentRunDirsIncludingPausedNoAnalysis ??
					state.currentRunDirs ??
					[]
		  )
		: null;
	const currentRunActionGateDuplicateHold =
		activeCurrentRunActionGateDuplicateHold ??
		( drainCurrentRunActionGateDuplicateHold
			? {
					...drainCurrentRunActionGateDuplicateHold,
					scope: 'active/drain current-run',
					drainOnly: true,
			  }
			: null );
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
	const currentRunProducerDuplicateHold =
		currentRunActionGateDuplicateHold ?? currentRunDuplicateNoiseHold;
	const currentRunProductEvidenceActionGateHold = PAUSE_ON_TRIAGE_NOISE
		? getProductEvidenceActionGateHoldForScheduling(
				currentRunActionGateDuplicateHold,
				currentRunActionGateDuplicateHold?.drainOnly
					? drainDuplicateNoiseTriageYield
					: activeDuplicateNoiseTriageYield
		  )
		: null;
	const fleetNoProductStartupNoiseHold = PAUSE_ON_TRIAGE_NOISE
		? getFleetNoProductStartupNoiseHold()
		: null;
	const holdNoisyBlockTopOff =
		PAUSE_ON_TRIAGE_NOISE &&
		( shouldHoldNoisyBlockTopOff( activeDuplicateNoiseTriageYield ) ||
			!! currentRunActionGateDuplicateHold );
	const activeDominantRealUserFamilyHold = PAUSE_ON_TRIAGE_NOISE
		? getCurrentRunProductEvidenceDuplicateHold(
				activeDuplicateNoiseTriageYield,
				state.currentRunDirs ?? []
		  )
		: null;
	const drainDominantRealUserFamilyHold = PAUSE_ON_TRIAGE_NOISE
		? getCurrentRunProductEvidenceDuplicateHold(
				drainDuplicateNoiseTriageYield,
				state.currentRunDirsIncludingPausedNoAnalysis ??
					state.currentRunDirs ??
					[]
		  )
		: null;
	const dominantRealUserFamilyHold =
		activeDominantRealUserFamilyHold ??
		( drainDominantRealUserFamilyHold
			? {
					...drainDominantRealUserFamilyHold,
					scope: 'active/drain current-run',
					drainOnly: true,
			  }
			: null );
	const recentProductEvidenceDuplicateFamilyCooldown = PAUSE_ON_TRIAGE_NOISE
		? getRecentProductEvidenceDuplicateFamilyCooldown()
		: null;
	const effectiveProductEvidenceDuplicateFamilyHold =
		currentRunProductEvidenceActionGateHold ?? dominantRealUserFamilyHold;
	const holdDominantRealUserFamilyActive =
		!! effectiveProductEvidenceDuplicateFamilyHold;
	const lateJoin3Records =
		state.featureCounts?.[ 'lifecycle:late-join:users-3' ] ?? 0;
	const sameUserRecords =
		state.featureCounts?.[ 'collaborator-mode:same-user' ] ?? 0;
	const sameUserSeparateContextRecords =
		state.featureCounts?.[
			'collaborator-mode:same-user-separate-context'
		] ?? 0;
	const successfulSameUserRecords = getUserDocumentConcurrencyCount(
		'successfulByCollaboratorMode',
		'same-user'
	);
	const successfulSameUserSeparateContextRecords =
		getUserDocumentConcurrencyCount(
			'successfulByCollaboratorMode',
			'same-user-separate-context'
		);
	const sameUserLifecycleRecords =
		state.currentRunRecordCountsByGroup?.[
			'novelty-ws-same-user-lifecycle'
		] ?? 0;
	const sameUserSeparateContextLifecycleRecords =
		state.currentRunRecordCountsByGroup?.[
			'novelty-ws-same-user-separate-context-lifecycle'
		] ?? 0;
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
	const realUserRichTextTemplateRecords = getFeatureCount(
		'real-user-template:rich-text-editing'
	);
	const realUserRichTextMinActionRecords = Math.min(
		...REAL_USER_RICH_TEXT_ACTION_LABELS.map( ( label ) =>
			getFeatureCount( `action:${ label }` )
		)
	);
	const realUserRichTextNeedsCoverage =
		recommendedGroupsForPass.has( 'novelty-ws-real-user-rich-text' ) &&
		( realUserRichTextTemplateRecords <
			REAL_USER_EDITING_MIN_ACTION_RECORDS ||
			realUserRichTextMinActionRecords <
				REAL_USER_EDITING_MIN_ACTION_RECORDS );
	const zeroCoveragePriorityGroupsForPass =
		ZERO_COVERAGE_PRIORITY_GROUPS.filter(
			( group ) => getZeroCoverageGapsForGroup( group ).length > 0
		);
	const zeroCoverageBenchmarkCanaryYieldLimit = Math.max(
		0,
		Math.min( MAX_ENABLED_GROUPS, benchmarkCanaryForcedGroups.size ) -
			Math.min(
				ZERO_COVERAGE_BENCHMARK_CANARY_MIN_ACTIVE_GROUPS,
				MAX_ENABLED_GROUPS,
				benchmarkCanaryForcedGroups.size
			)
	);
	let benchmarkCanaryZeroCoverageEvictions = 0;
	const deferredBenchmarkCanariesForZeroCoverage = new Set();
	const unblockedBenchmarkCanaryDeficitGroups =
		getUnblockedBenchmarkCanaryDeficitGroups();
	const deferredBenchmarkCanariesForDeadline = new Set(
		getDeadlineDeferredBenchmarkCanaryGroups(
			unblockedBenchmarkCanaryDeficitGroups
		)
	);

	function syncDeferredBenchmarkCanariesForZeroCoverage() {
		if ( deferredBenchmarkCanariesForZeroCoverage.size > 0 ) {
			state.deferredBenchmarkCanaryGroupsForZeroCoverage = [
				...deferredBenchmarkCanariesForZeroCoverage,
			];
		} else {
			delete state.deferredBenchmarkCanaryGroupsForZeroCoverage;
		}
	}

	function syncDeferredBenchmarkCanariesForDeadline() {
		const deferredGroups = [
			...deferredBenchmarkCanariesForDeadline,
		].sort();
		if ( deferredGroups.length > 0 ) {
			state.deferredBenchmarkCanaryGroupsForDeadline = deferredGroups;
			const marker = [
				deferredGroups.join( ',' ),
				unblockedBenchmarkCanaryDeficitGroups.sort().join( ',' ),
			].join( '|' );
			if (
				state.deferredBenchmarkCanaryGroupsForDeadlineMarker !== marker
			) {
				state.deferredBenchmarkCanaryGroupsForDeadlineMarker = marker;
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'defer-explicit-blocked-benchmark-canaries',
					groups: deferredGroups,
					unblockedDeficitGroups:
						unblockedBenchmarkCanaryDeficitGroups,
					reason: 'deadline mode keeps forced benchmark-canary coverage on absent or no-success unblocked rows before spending fresh browser slots on explicit final-witness blocker rows',
				} );
			}
		} else {
			delete state.deferredBenchmarkCanaryGroupsForDeadline;
			delete state.deferredBenchmarkCanaryGroupsForDeadlineMarker;
		}
	}

	function getZeroCoverageGapsForGroup( group ) {
		return ( guidance?.unmetGoals ?? [] ).filter(
			( goal ) => goal.count === 0 && goal.groups.includes( group )
		);
	}

	function groupHasCurrentProductEvidence( group ) {
		return supervisorGroupHasProductEvidence(
			supervisorGroupsByName.get( group )
		);
	}

	function groupHasCurrentRunBehavioralCoverage( group ) {
		return (
			( state.currentRunRecordCountsByGroup?.[ group ] ?? 0 ) > 0 ||
			groupHasCurrentProductEvidence( group )
		);
	}

	function getEnabledBenchmarkCanaryCount() {
		return [ ...enabled ].filter( ( group ) =>
			isBenchmarkCanaryForcedGroup( group )
		).length;
	}

	function getMinimumActiveBenchmarkCanaryCount() {
		return Math.min(
			ZERO_COVERAGE_BENCHMARK_CANARY_MIN_ACTIVE_GROUPS,
			MAX_ENABLED_GROUPS,
			benchmarkCanaryForcedGroups.size
		);
	}

	function hasEnabledZeroCoveragePriorityGroup() {
		return [ ...enabled ].some(
			( group ) =>
				ZERO_COVERAGE_PRIORITY_GROUPS.includes( group ) &&
				getZeroCoverageGapsForGroup( group ).length > 0
		);
	}

	function hasZeroCoveragePriorityGap( group ) {
		if (
			isDeadlineBenchmarkCanaryBudgetCapActive() &&
			( group === 'novelty-http-large-post-lifecycle-completion' ||
				getBenchmarkCanaryNoProductStartupNoiseBlock( group ) )
		) {
			return false;
		}
		return (
			ZERO_COVERAGE_PRIORITY_GROUPS.includes( group ) &&
			getZeroCoverageGapsForGroup( group ).length > 0
		);
	}

	function isDeadlineBenchmarkCanaryCapPause( pause ) {
		return /deadline benchmark-canary cap\b/.test( pause?.reason ?? '' );
	}

	function shouldDeferBenchmarkCanaryForZeroCoverage( group ) {
		if (
			! isBenchmarkCanaryForcedGroup( group ) ||
			hasOpenBenchmarkCanaryPromotionBlocker( group ) ||
			isDeadlineFinalizationProtectedBenchmarkCanaryGroup( group ) ||
			isDeadlineP0BenchmarkCanaryGroup( group ) ||
			zeroCoveragePriorityGroupsForPass.length === 0 ||
			benchmarkCanaryForcedGroups.size < MAX_ENABLED_GROUPS
		) {
			return false;
		}

		if (
			getEnabledBenchmarkCanaryCount() <
			getMinimumActiveBenchmarkCanaryCount()
		) {
			return false;
		}

		return (
			enabled.size >= MAX_ENABLED_GROUPS ||
			hasEnabledZeroCoveragePriorityGroup()
		);
	}

	function getYieldableBenchmarkCanaryEvictionsForZeroCoverage() {
		if (
			benchmarkCanaryZeroCoverageEvictions >=
			zeroCoverageBenchmarkCanaryYieldLimit
		) {
			return [];
		}

		const activeCanaries = [ ...enabled ].filter( ( group ) =>
			isBenchmarkCanaryForcedGroup( group )
		);
		if ( activeCanaries.length <= getMinimumActiveBenchmarkCanaryCount() ) {
			return [];
		}

		return BENCHMARK_CANARY_ZERO_COVERAGE_EVICTION_ORDER.filter(
			( group ) =>
				enabled.has( group ) &&
				! hasOpenBenchmarkCanaryPromotionBlocker( group ) &&
				! isDeadlineFinalizationProtectedBenchmarkCanaryGroup(
					group
				) &&
				! isDeadlineP0BenchmarkCanaryGroup( group ) &&
				groupHasCurrentRunBehavioralCoverage( group )
		);
	}

	function canBypassStartupNoiseCooldown( group, activeNoisePause ) {
		if (
			holdDominantRealUserFamilyActive &&
			shouldProductEvidenceDuplicateHoldBlockGroup(
				effectiveProductEvidenceDuplicateFamilyHold,
				group
			) &&
			! shouldBypassProductEvidenceDuplicateHoldForSuccessDeficit(
				group,
				effectiveProductEvidenceDuplicateFamilyHold
			) &&
			! isBenchmarkCanaryForcedGroup( group )
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
		const canBenchmarkCanaryBypassStartupHold = ( hold ) =>
			shouldBypassBenchmarkCanaryNoisePause( group, hold );
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
				shouldBypassProductEvidenceDuplicateHoldForSuccessDeficit(
					group,
					refillBlockingDuplicateNoiseProducer.hold
				)
			) {
				return null;
			}
			if (
				shouldBypassBenchmarkCanaryProductEvidenceDuplicateHold(
					group,
					refillBlockingDuplicateNoiseProducer.hold
				)
			) {
				return null;
			}
			if (
				canBenchmarkCanaryBypassStartupHold(
					refillBlockingDuplicateNoiseProducer.hold
				) &&
				refillBlockingDuplicateNoiseProducer.hold?.kind ===
					'startup-noise'
			) {
				return null;
			}
			if (
				isProductEvidenceDuplicateProducerHold(
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
				! canBenchmarkCanaryBypassStartupHold(
					currentRunDuplicateNoiseHold
				) &&
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
				! canBenchmarkCanaryBypassStartupHold(
					drainOnlyCurrentRunStartupHold
				) &&
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
			! getActiveStartupNoiseCooldownBypass( group ) &&
			! canBenchmarkCanaryBypassStartupHold(
				fleetNoProductStartupNoiseHold
			) &&
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
			if ( isProductEvidenceDuplicateProducerHold( hold ) ) {
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
			REAL_USER_RELOAD_DIVERSITY_GROUP,
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
		const productEvidenceRecords = Number(
			activeNoisePause?.productEvidenceRecords
		);
		const pauseHasProductEvidence =
			activeNoisePause?.noProductOnly === false ||
			activeNoisePause?.hasProductEvidence === true ||
			( Number.isFinite( productEvidenceRecords ) &&
				productEvidenceRecords > 0 );
		return (
			! recommendedStartupCooldownRetryUsed &&
			group === recommendedStartupCooldownRetryGroup &&
			activeNoisePause?.kind === 'startup-noise' &&
			activeNoisePause.scope === 'profile' &&
			groupHasCurrentProductEvidence( group ) &&
			pauseHasProductEvidence
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
			! shouldBypassProductEvidenceDuplicateHoldForSuccessDeficit(
				group,
				effectiveProductEvidenceDuplicateFamilyHold
			) &&
			! shouldBypassBenchmarkCanaryProductEvidenceDuplicateHold(
				group,
				effectiveProductEvidenceDuplicateFamilyHold
			) &&
			! shouldBypassDominantRealUserFamilyHold( group )
		);
	}

	function getDuplicateNoiseHoldEnableBlockReason() {
		const hold = effectiveProductEvidenceDuplicateFamilyHold;
		const scope = currentRunProductEvidenceActionGateHold
			? 'current-run action-gate'
			: dominantRealUserFamilyHold
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

	function hasCoverageGapPriorityForPass( group ) {
		return (
			hasCoverageQualityRepairPriority( group ) ||
			hasSuccessDeficit( group ) ||
			( guidance?.unmetGoals ?? [] ).some(
				( goal ) => goal.met !== true && goal.groups?.includes( group )
			)
		);
	}

	function getEnabledGroupBudgetLimit( group = null ) {
		if ( group && hasCoverageGapPriorityForPass( group ) ) {
			return (
				MAX_ENABLED_GROUPS + getEffectiveCoverageGapReservedGroupLimit()
			);
		}
		return MAX_ENABLED_GROUPS;
	}

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
		const startupHoldBlocksRescue =
			!! startupHoldBlock &&
			! (
				startupHoldBlock.fleetStartupNoiseHold === true &&
				activeRunDirsAfterPlannedRemoval.length === 0 &&
				isActiveCurrentTriageClear()
			);
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
			! shouldBypassProductEvidenceDuplicateHoldForSuccessDeficit(
				group,
				effectiveProductEvidenceDuplicateFamilyHold
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
				{
					plannedRemoval,
				}
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
			case REAL_USER_RELOAD_DIVERSITY_GROUP:
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
				return (
					sameUserLifecycleRecords >= SAME_USER_RECORD_TARGET &&
					successfulSameUserRecords >= SAME_USER_SUCCESS_TARGET
				);
			case 'novelty-ws-same-user-separate-context-lifecycle':
				return (
					sameUserSeparateContextLifecycleRecords >=
						SAME_USER_SEPARATE_CONTEXT_RECORD_TARGET &&
					successfulSameUserSeparateContextRecords >=
						SAME_USER_SEPARATE_CONTEXT_SUCCESS_TARGET
				);
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

		const groupHasSuccessDeficit = hasSuccessDeficit( group );
		const targetIsOpenBenchmarkCanary =
			shouldProtectOpenBenchmarkCanaryPromotionGroup( group );
		const candidates = uniqueStringList( [
			...ROTATION_PAUSE_ORDER,
			...( groupHasSuccessDeficit
				? SUCCESS_DEFICIT_ROTATION_PAUSE_ORDER
				: [] ),
			...HIGH_VALUE_EXPANSION_GROUPS.filter( ( candidate ) =>
				groupHasSuccessDeficit
					? candidate !== group
					: canRotateAwayFromGroup( candidate )
			),
		] );

		for ( const candidate of candidates ) {
			const candidateIsOpenBenchmarkCanary =
				shouldProtectOpenBenchmarkCanaryPromotionGroup( candidate );
			const candidateIsRequiredBreadth =
				isRequiredCoverageBreadthGroup( candidate );
			const candidateSupervisorState =
				supervisorGroupsByName.get( candidate );
			const candidateCurrentRunRecords =
				state.currentRunRecordCountsByGroup?.[ candidate ] ?? 0;
			const candidateCurrentRunSuccessfulRecords =
				state.currentRunSuccessfulRecordCountsByGroup?.[ candidate ] ??
				0;
			const candidateIsMaterializing =
				( candidateSupervisorState?.activeRunDirs ?? [] ).length > 0 ||
				/^(waiting-repo-prep|starting|running|restarting)$/.test(
					candidateSupervisorState?.status ?? ''
				);
			if (
				candidate === group ||
				! enabled.has( candidate ) ||
				candidateIsOpenBenchmarkCanary ||
				( candidateIsRequiredBreadth &&
					! targetIsOpenBenchmarkCanary &&
					! groupHasSuccessDeficit ) ||
				hasSuccessDeficit( candidate ) ||
				recommendedGroupsForPass.has( candidate )
			) {
				continue;
			}
			if (
				REQUIRED_FIRST_GREEN_PRODUCT_GROUPS.has( candidate ) &&
				candidateCurrentRunSuccessfulRecords === 0
			) {
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'preserve-required-product-smoke-until-first-green',
					group: candidate,
					requestedReplacement: group,
					currentRunRecords: candidateCurrentRunRecords,
					reason: 'the candidate cannot be reviewable until the basic human editor workflow has a successful current-run record',
				} );
				continue;
			}
			if (
				candidateCurrentRunRecords === 0 &&
				candidateIsMaterializing
			) {
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'preserve-materializing-group-until-first-record',
					group: candidate,
					requestedReplacement: group,
					supervisorStatus:
						candidateSupervisorState?.status ?? 'active-run-dir',
					reason: 'do not discard repository/wp-env/browser startup work before the group emits its first current-run record',
				} );
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
		const pinOpenBenchmarkCanaryStatusGroup =
			shouldProtectOpenBenchmarkCanaryPromotionGroup( group );
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

		if (
			isDeadlineBenchmarkCanaryBudgetCapActive() &&
			hasCurrentClosedBenchmarkCanaryCoverageStatusRow( group ) &&
			getCurrentOpenBenchmarkCanaryCoverageStatusGroups().length > 0
		) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'skip-enable-closed-benchmark-canary-row',
				group,
				reason: 'current benchmark-canary status already has direct green/downscope evidence for this row; do not refill the deadline cap with it while promotion-blocked rows remain open',
			} );
			return false;
		}

		if ( enabled.has( group ) ) {
			return false;
		}

		if (
			! materializationRescueAllowed &&
			! pinOpenBenchmarkCanaryStatusGroup &&
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

		const benchmarkCanaryDuplicateHoldBypassed =
			! materializationRescueAllowed &&
			shouldBypassBenchmarkCanaryProductEvidenceDuplicateHold(
				group,
				effectiveProductEvidenceDuplicateFamilyHold
			);
		const stalledCoverageGapDuplicateHoldBypassed =
			! materializationRescueAllowed &&
			shouldBypassProductEvidenceDuplicateHoldForStalledCoverageGap(
				group,
				effectiveProductEvidenceDuplicateFamilyHold
			);
		if ( benchmarkCanaryDuplicateHoldBypassed ) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'bypass-enable-benchmark-canary-duplicate-family-hold',
				group,
				family: effectiveProductEvidenceDuplicateFamilyHold.family,
				source: effectiveProductEvidenceDuplicateFamilyHold.source,
				reason:
					getBenchmarkCanaryFeedbackReason( group ) ??
					'benchmark canary feedback requires this equivalent fuzz lane; duplicate product evidence should not prevent current-run materialization',
			} );
		}
		if ( stalledCoverageGapDuplicateHoldBypassed ) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'bypass-enable-stalled-coverage-gap-duplicate-hold',
				group,
				family: effectiveProductEvidenceDuplicateFamilyHold.family,
				source: effectiveProductEvidenceDuplicateFamilyHold.source,
				reason: getStalledCoverageGuidanceGapReason( group ),
			} );
		}

		if (
			! materializationRescueAllowed &&
			! pinOpenBenchmarkCanaryStatusGroup &&
			! benchmarkCanaryDuplicateHoldBypassed &&
			! stalledCoverageGapDuplicateHoldBypassed &&
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
			if ( pinOpenBenchmarkCanaryStatusGroup ) {
				delete state.pausedGroups[ group ];
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'bypass-open-benchmark-canary-active-noise-pause',
					group,
					reason: 'current benchmark-canary status is still open for this promotion-blocked group; protected capacity must stay on it until direct current-run green, explicit downscope, or exact product routing exists',
					sourcePauseAt: activeNoisePause.at,
					sourcePauseReason: activeNoisePause.reason,
					expiresAt: activeNoisePause.expiresAt,
					...( activeNoisePause.originGroup
						? { originGroup: activeNoisePause.originGroup }
						: {} ),
				} );
			} else if (
				shouldBypassBenchmarkCanaryNoisePause( group, activeNoisePause )
			) {
				const bypassReason =
					getBenchmarkCanaryFeedbackReason( group ) ??
					'benchmark canary feedback requires this equivalent fuzz lane';
				recordStartupNoiseCooldownBypass(
					group,
					activeNoisePause,
					bypassReason
				);
				delete state.pausedGroups[ group ];
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'bypass-benchmark-canary-active-noise-pause',
					group,
					reason: bypassReason,
					sourcePauseAt: activeNoisePause.at,
					sourcePauseReason: activeNoisePause.reason,
					expiresAt: activeNoisePause.expiresAt,
					...( activeNoisePause.originGroup
						? { originGroup: activeNoisePause.originGroup }
						: {} ),
				} );
			} else if (
				canBypassStartupNoiseCooldown( group, activeNoisePause )
			) {
				delete state.pausedGroups[ group ];
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'bypass-startup-noise-cooldown-with-product-evidence',
					group,
					reason: `current supervisor state has product-evidence coverage for ${ group }; ignoring shared startup-noise cooldown from ${ activeNoisePause.at } while preserving coverage-guided scheduling`,
				} );
			} else if (
				shouldBypassNoisePauseForSuccessDeficit(
					group,
					activeNoisePause
				)
			) {
				delete state.pausedGroups[ group ];
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'bypass-success-deficit-noise-pause',
					group,
					reason: getSuccessDeficitBypassReason( group ),
					sourcePauseAt: activeNoisePause.at,
					sourcePauseReason: activeNoisePause.reason,
					expiresAt: activeNoisePause.expiresAt,
					...( activeNoisePause.originGroup
						? { originGroup: activeNoisePause.originGroup }
						: {} ),
				} );
			} else if (
				shouldBypassProductEvidenceDuplicateHoldForStalledCoverageGap(
					group,
					activeNoisePause
				)
			) {
				delete state.pausedGroups[ group ];
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'bypass-stalled-coverage-gap-active-noise-pause',
					group,
					reason: getStalledCoverageGuidanceGapReason( group ),
					sourcePauseAt: activeNoisePause.at,
					sourcePauseReason: activeNoisePause.reason,
					expiresAt: activeNoisePause.expiresAt,
					...( activeNoisePause.originGroup
						? { originGroup: activeNoisePause.originGroup }
						: {} ),
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
			if ( activeStoredNoisePause && pinOpenBenchmarkCanaryStatusGroup ) {
				delete state.pausedGroups[ group ];
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'bypass-open-benchmark-canary-stored-noise-pause',
					group,
					reason: 'stored noise pause cannot suppress an open promotion-blocked benchmark-canary status row before direct current-run green, explicit downscope, or exact product routing exists',
					sourcePauseAt: activeStoredNoisePause.at,
					sourcePauseReason: activeStoredNoisePause.reason,
					expiresAt: activeStoredNoisePause.expiresAt,
				} );
			} else if ( activeStoredNoisePause ) {
				if (
					shouldBypassBenchmarkCanaryNoisePause(
						group,
						activeStoredNoisePause
					)
				) {
					recordDeadlineBenchmarkCanaryStartupRetry(
						group,
						activeStoredNoisePause
					);
					delete state.pausedGroups[ group ];
					state.changes.push( {
						at: new Date().toISOString(),
						action: 'bypass-benchmark-canary-stored-noise-pause',
						group,
						reason:
							getBenchmarkCanaryFeedbackReason( group ) ??
							'benchmark canary feedback requires this equivalent fuzz lane',
						sourcePauseAt: activeStoredNoisePause.at,
						sourcePauseReason: activeStoredNoisePause.reason,
						expiresAt: activeStoredNoisePause.expiresAt,
					} );
				} else if (
					shouldBypassNoisePauseForSuccessDeficit(
						group,
						activeStoredNoisePause
					)
				) {
					delete state.pausedGroups[ group ];
					state.changes.push( {
						at: new Date().toISOString(),
						action: 'bypass-success-deficit-stored-noise-pause',
						group,
						reason: getSuccessDeficitBypassReason( group ),
						sourcePauseAt: activeStoredNoisePause.at,
						sourcePauseReason: activeStoredNoisePause.reason,
						expiresAt: activeStoredNoisePause.expiresAt,
					} );
				} else if (
					shouldBypassProductEvidenceDuplicateHoldForStalledCoverageGap(
						group,
						activeStoredNoisePause
					)
				) {
					delete state.pausedGroups[ group ];
					state.changes.push( {
						at: new Date().toISOString(),
						action: 'bypass-stalled-coverage-gap-stored-noise-pause',
						group,
						reason: getStalledCoverageGuidanceGapReason( group ),
						sourcePauseAt: activeStoredNoisePause.at,
						sourcePauseReason: activeStoredNoisePause.reason,
						expiresAt: activeStoredNoisePause.expiresAt,
					} );
				} else {
					state.changes.push( {
						at: new Date().toISOString(),
						action: 'keep-paused-noise-cooldown',
						group,
						reason: `stored ${ activeStoredNoisePause.kind } pause remains active for this group; do not revive it through materialization or fallback scheduling`,
						expiresAt: activeStoredNoisePause.expiresAt,
					} );
					return false;
				}
			}

			if ( state.pausedGroups?.[ group ] ) {
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
			enabled.size >= getEnabledGroupBudgetLimit( group )
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
			enabledSizeForBudget >= getEnabledGroupBudgetLimit( group ) ||
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
		if ( shouldProtectOpenBenchmarkCanaryPromotionGroup( group ) ) {
			state.changes.push( {
				at: pausedAt,
				action: 'skip-pause-open-benchmark-canary-status-row',
				group,
				reason: 'current benchmark-canary status is still open for this promotion-blocked group; do not remove it from protected capacity until direct current-run green, explicit downscope, or exact product routing exists',
				originalPauseReason: reason,
				...( metadata.source ? { source: metadata.source } : {} ),
			} );
			return false;
		}

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
		const hasProductEvidence =
			metadata.hasProductEvidence ??
			( productEvidenceRecords !== undefined
				? productEvidenceRecords > 0
				: undefined );
		const expiresAt = noisePauseKind
			? new Date(
					Date.now() +
						TRIAGE_NOISE_PAUSE_COOLDOWN_HOURS * 60 * 60 * 1000
			  ).toISOString()
			: null;
		if (
			noisePauseKind &&
			shouldDwellActiveForcedWsBenchmarkCanary(
				group,
				supervisorGroupsByName.get( group )
			)
		) {
			await writeNoAnalysisSentinelsForGroup( group, reason, {
				reasonKind: noisePauseKind,
				family: noisePauseFamily,
				source: metadata.source,
				expiresAt,
				...( noProductOnly !== undefined ? { noProductOnly } : {} ),
				...( productEvidenceRecords !== undefined
					? { productEvidenceRecords }
					: {} ),
				...( hasProductEvidence !== undefined
					? { hasProductEvidence }
					: {} ),
			} );
			state.changes.push( {
				at: pausedAt,
				action: 'skip-active-forced-ws-benchmark-canary-pause-before-summary',
				group,
				reason: 'deadline WS benchmark-canary row is already materialized but has not emitted its first current-run summary record; keep the bounded producer running before pause/downscope decisions',
				originalPauseReason: reason,
				reasonKind: noisePauseKind,
				...( noisePauseFamily ? { family: noisePauseFamily } : {} ),
				...( metadata.source ? { source: metadata.source } : {} ),
				...( expiresAt ? { expiresAt } : {} ),
			} );
			return false;
		}
		if (
			shouldKeepBenchmarkCanaryRunningThroughNoisePause( group, {
				reasonKind: noisePauseKind,
				productEvidenceRecords,
				hasProductEvidence,
			} )
		) {
			await writeNoAnalysisSentinelsForGroup( group, reason, {
				reasonKind: noisePauseKind,
				family: noisePauseFamily,
				source: metadata.source,
				expiresAt,
				...( noProductOnly !== undefined ? { noProductOnly } : {} ),
				...( productEvidenceRecords !== undefined
					? { productEvidenceRecords }
					: {} ),
				...( hasProductEvidence !== undefined
					? { hasProductEvidence }
					: {} ),
			} );
			state.changes.push( {
				at: pausedAt,
				action: 'skip-benchmark-canary-noise-pause-before-evidence',
				group,
				reason: DEADLINE_FINALIZATION_BENCHMARK_CANARY_GROUP_SET.has(
					group
				)
					? 'deadline finalization benchmark-canary rows must keep one bounded producer until current-run success or explicit downscope exists'
					: 'forced benchmark-canary rows must keep one bounded producer until retained current-root success, retained product-failure evidence, or explicit downscope exists',
				originalPauseReason: reason,
				reasonKind: noisePauseKind,
				...( noisePauseFamily ? { family: noisePauseFamily } : {} ),
				...( metadata.source ? { source: metadata.source } : {} ),
				...( noProductOnly !== undefined ? { noProductOnly } : {} ),
				...( productEvidenceRecords !== undefined
					? { productEvidenceRecords }
					: {} ),
				...( hasProductEvidence !== undefined
					? { hasProductEvidence }
					: {} ),
				...( expiresAt ? { expiresAt } : {} ),
			} );
			return false;
		}
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
				await writeNoAnalysisSentinelsForGroup( group, reason, {
					reasonKind: noisePauseKind,
					family: noisePauseFamily,
					source: metadata.source,
					expiresAt,
					...( noProductOnly !== undefined ? { noProductOnly } : {} ),
					...( productEvidenceRecords !== undefined
						? { productEvidenceRecords }
						: {} ),
					...( hasProductEvidence !== undefined
						? { hasProductEvidence }
						: {} ),
				} );
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
					...( hasProductEvidence !== undefined
						? { hasProductEvidence }
						: {} ),
					...( expiresAt ? { expiresAt } : {} ),
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
					...( hasProductEvidence !== undefined
						? { hasProductEvidence }
						: {} ),
					preserveProductEvidence: true,
				} );
			}
		}

		enabled.delete( group );
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
			...( hasProductEvidence !== undefined
				? { hasProductEvidence }
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
			...( hasProductEvidence !== undefined
				? { hasProductEvidence }
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
				...( hasProductEvidence !== undefined
					? { hasProductEvidence }
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
		const openBenchmarkCanaryGroups = new Set(
			getCurrentOpenBenchmarkCanaryCoverageStatusGroups()
		);
		const benchmarkCanaryCapActive =
			isDeadlineBenchmarkCanaryBudgetCapActive() &&
			openBenchmarkCanaryGroups.size > 0;
		const deferredBreadthGroups = [];
		for ( const group of REQUIRED_COVERAGE_BREADTH_GROUPS ) {
			if (
				benchmarkCanaryCapActive &&
				! openBenchmarkCanaryGroups.has( group )
			) {
				deferredBreadthGroups.push( group );
				continue;
			}
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
		if ( deferredBreadthGroups.length > 0 ) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'defer-required-breadth-for-open-benchmark-canary',
				groups: deferredBreadthGroups,
				openBenchmarkCanaryGroups: [ ...openBenchmarkCanaryGroups ],
				reason: 'open benchmark-canary exact-stack blockers must keep materialization capacity before generic required-breadth top-off groups',
			} );
		}
		return changed;
	}

	async function sweepEnabledGroupsBlockedByActiveHolds() {
		let changed = false;
		for ( const group of [ ...enabled ] ) {
			const activeNoisePause = getActiveNoisePauseCooldown( group );
			if ( isNoProductStartupNoiseCooldown( activeNoisePause ) ) {
				if (
					shouldBypassNoisePauseForSuccessDeficit(
						group,
						activeNoisePause
					)
				) {
					delete state.pausedGroups?.[ group ];
					state.changes.push( {
						at: new Date().toISOString(),
						action: 'bypass-sweep-success-deficit-startup-noise',
						group,
						reason: getSuccessDeficitBypassReason( group ),
						sourcePauseAt: activeNoisePause.at,
						sourcePauseReason: activeNoisePause.reason,
						expiresAt: activeNoisePause.expiresAt,
						...( activeNoisePause.originGroup
							? { originGroup: activeNoisePause.originGroup }
							: {} ),
					} );
					continue;
				}
				changed =
					( await pauseGroup(
						group,
						`final scheduling sweep: active no-product startup-noise cooldown from ${ activeNoisePause.at } still blocks ${ group }; do not publish it to supervisor groups while strict pre-action bootstrap noise has no product evidence: ${ activeNoisePause.reason }`,
						{
							reasonKind: 'startup-noise',
							family: 'pre_action_bootstrap_stall',
							source:
								activeNoisePause.source ??
								'active-noise-cooldown',
							noProductOnly: true,
							productEvidenceRecords: 0,
							hasProductEvidence: false,
						}
					) ) || changed;
				continue;
			}

			const startupBlock = getCurrentStartupHoldEnableBlock( group );
			if (
				startupBlock &&
				( startupBlock.matchedProducerHold ||
					startupBlock.fleetStartupNoiseHold ||
					startupBlock.producerName === group )
			) {
				const hold = startupBlock.hold;
				if (
					shouldBypassBenchmarkCanaryProductEvidenceDuplicateHold(
						group,
						hold
					)
				) {
					state.changes.push( {
						at: new Date().toISOString(),
						action: 'bypass-sweep-benchmark-canary-duplicate-hold',
						group,
						family: hold?.family,
						source: hold?.source,
						reason:
							getBenchmarkCanaryFeedbackReason( group ) ??
							'benchmark canary feedback requires this equivalent fuzz lane; duplicate product evidence should cap analysis, not remove the forced supervisor group',
					} );
					continue;
				}
				const isProductEvidenceHold =
					isProductEvidenceDuplicateProducerHold( hold );
				changed =
					( await pauseGroup(
						group,
						`final scheduling sweep: ${ getCurrentStartupHoldEnableBlockReason(
							group
						) }`,
						{
							reasonKind:
								getEffectiveDuplicateNoiseHoldKind( hold ) ??
								hold?.kind,
							family: hold?.family,
							source: hold?.source,
							noProductOnly: isProductEvidenceHold
								? false
								: hold?.noProductOnly ?? true,
							productEvidenceRecords: isProductEvidenceHold
								? hold?.productEvidenceRecords ??
								  hold?.count ??
								  1
								: hold?.productEvidenceRecords ?? 0,
							hasProductEvidence: isProductEvidenceHold,
						}
					) ) || changed;
				continue;
			}

			if ( shouldBlockGroupEnableForDuplicateNoiseHold( group ) ) {
				const hold = effectiveProductEvidenceDuplicateFamilyHold;
				changed =
					( await pauseGroup(
						group,
						`final scheduling sweep: ${ getDuplicateNoiseHoldEnableBlockReason() }`,
						{
							reasonKind: hold?.kind,
							family: hold?.family,
							source: hold?.source,
							noProductOnly: false,
							productEvidenceRecords:
								hold?.productEvidenceRecords ??
								hold?.count ??
								1,
							hasProductEvidence: true,
						}
					) ) || changed;
			}
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
			currentRunProducerDuplicateHold
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
			if (
				shouldBypassNoisePauseForSuccessDeficit(
					group,
					activeNoisePause
				)
			) {
				delete state.pausedGroups?.[ group ];
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'bypass-enabled-success-deficit-noise-cooldown',
					group,
					reason: getSuccessDeficitBypassReason( group ),
					sourcePauseAt: activeNoisePause.at,
					sourcePauseReason: activeNoisePause.reason,
					expiresAt: activeNoisePause.expiresAt,
					...( activeNoisePause.originGroup
						? { originGroup: activeNoisePause.originGroup }
						: {} ),
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
		const noProducerFallbackDuplicateHold =
			currentRunProducerDuplicateHold?.drainOnly === true
				? null
				: currentRunProducerDuplicateHold;
		if (
			noProducerFallbackDuplicateHold &&
			noisyProducerGroups.length === 0
		) {
			const sentinelCount =
				await writeNoAnalysisSentinelsForMatchingLocalNoiseHold(
					noProducerFallbackDuplicateHold,
					state.currentRunDirs ?? []
				);
			state.changes.push( {
				at: new Date().toISOString(),
				action:
					sentinelCount > 0
						? 'current-run-noise-hold-local-sentinel-written'
						: 'current-run-noise-hold-no-producer-match-sentinel-skipped',
				reason:
					sentinelCount > 0
						? `current-run duplicate/noise hold is active for ${ noProducerFallbackDuplicateHold.family } (${ noProducerFallbackDuplicateHold.count } signatures, share=${ noProducerFallbackDuplicateHold.share }) and ${ sentinelCount } local run dir(s) reproduced it; wrote product-preserving no-analysis sentinels`
						: `current-run duplicate/noise hold is active for ${ noProducerFallbackDuplicateHold.family } (${ noProducerFallbackDuplicateHold.count } signatures, share=${ noProducerFallbackDuplicateHold.share }) but no active producer run dir matched it; leaving active run dirs visible instead of writing a broad no-analysis sentinel`,
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
			if (
				shouldPause &&
				shouldBypassProductEvidenceDuplicateHoldForSuccessDeficit(
					producer.name,
					producer.hold
				)
			) {
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'bypass-success-deficit-producer-duplicate-hold',
					group: producer.name,
					family: producer.hold.family,
					source: producer.hold.source,
					reason: getSuccessDeficitBypassReason( producer.name ),
				} );
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
		const holdScope = currentRunProductEvidenceActionGateHold
			? 'current-run action-gate'
			: dominantRealUserFamilyHold
			? 'current-run'
			: 'recent cross-root';
		const heldGroups = uniqueStringList(
			[
				...PRODUCT_EVIDENCE_DUPLICATE_FAMILY_HOLD_GROUPS,
				...( Array.isArray( hold.groups ) ? hold.groups : [] ),
				hold.groupName,
				hold.group,
			].filter( Boolean )
		);
		for ( const group of heldGroups ) {
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
			if (
				shouldBypassProductEvidenceDuplicateHoldForSuccessDeficit(
					group,
					hold
				)
			) {
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'bypass-success-deficit-duplicate-family-hold',
					group,
					family: hold.family,
					source: hold.source,
					reason: getSuccessDeficitBypassReason( group ),
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
				noProductOnly: false,
				productEvidenceRecords:
					hold.productEvidenceRecords ?? hold.count ?? 1,
				hasProductEvidence: true,
			} );
		}
	} else if (
		realUserRichTextNeedsCoverage &&
		! realUserRichTextEnabled &&
		! holdDominantRealUserFamilyActive
	) {
		await enableGroup(
			'novelty-ws-real-user-rich-text',
			`real-user rich-text coverage/yield is low: template ${ realUserRichTextTemplateRecords } / ${ REAL_USER_EDITING_MIN_ACTION_RECORDS }, min rich-text action count ${ realUserRichTextMinActionRecords } / ${ REAL_USER_EDITING_MIN_ACTION_RECORDS }; exercise paste, link, list, composition, toolbar, table, and cut/copy UI paths`,
			{ allowRotation: true }
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
		( sameUserRecords < SAME_USER_RECORD_TARGET ||
			sameUserSeparateContextRecords <
				SAME_USER_SEPARATE_CONTEXT_RECORD_TARGET ||
			successfulSameUserRecords < SAME_USER_SUCCESS_TARGET ||
			successfulSameUserSeparateContextRecords <
				SAME_USER_SEPARATE_CONTEXT_SUCCESS_TARGET ||
			! httpProbeEnabled ) &&
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
		( sameUserRecords < SAME_USER_RECORD_TARGET ||
			successfulSameUserRecords < SAME_USER_SUCCESS_TARGET )
	) {
		if (
			threeUserLateJoinEnabled &&
			lateJoin3Records >= SAME_USER_CANARY_LATE_JOIN_MIN_RECORDS
		) {
			await pauseGroup(
				'novelty-ws-three-user-late-join',
				`late-join coverage reached same-user canary threshold ${ lateJoin3Records }; hand off browser slot to same-user lifecycle`
			);
		}
		await enableGroup(
			'novelty-ws-same-user-lifecycle',
			'same-user browser lifecycle coverage is below target; exercise two tabs under the same account without waiting for distinct-user late-join coverage',
			{ allowRotation: true }
		);
	}

	if (
		ENABLE_SAME_USER_PROBE &&
		! sameUserSeparateContextLifecycleEnabled &&
		( sameUserSeparateContextRecords <
			SAME_USER_SEPARATE_CONTEXT_RECORD_TARGET ||
			successfulSameUserSeparateContextRecords <
				SAME_USER_SEPARATE_CONTEXT_SUCCESS_TARGET )
	) {
		await enableGroup(
			'novelty-ws-same-user-separate-context-lifecycle',
			`same-user separate-context lifecycle coverage is below target: records=${ sameUserSeparateContextRecords }/${ SAME_USER_SEPARATE_CONTEXT_RECORD_TARGET }, success=${ successfulSameUserSeparateContextRecords }/${ SAME_USER_SEPARATE_CONTEXT_SUCCESS_TARGET }; exercise two isolated browser contexts under the same account until completed documents are credited`,
			{ allowRotation: true }
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

	syncDeferredBenchmarkCanariesForDeadline();
	const deadlineBenchmarkCanaryCapActive =
		isDeadlineBenchmarkCanaryBudgetCapActive();
	const benchmarkCanarySchedulingLimit = getBenchmarkCanarySchedulingLimit();
	const desiredBenchmarkCanaryGroupsForBudget = new Set(
		getScheduledBenchmarkCanaryGroupsForBudget().filter(
			( group ) => ! deferredBenchmarkCanariesForDeadline.has( group )
		)
	);
	if ( deadlineBenchmarkCanaryCapActive ) {
		for ( const group of [ ...enabled ] ) {
			if (
				! desiredBenchmarkCanaryGroupsForBudget.has( group ) &&
				hasCurrentClosedBenchmarkCanaryCoverageStatusRow( group )
			) {
				await pauseGroup(
					group,
					`deadline benchmark-canary cap evicts already-closed current-run row ${ group } so unresolved promotion-blocked canaries can materialize`
				);
			}
		}
		for ( const group of getScheduledBenchmarkCanaryForcedGroups() ) {
			if (
				enabled.has( group ) &&
				! desiredBenchmarkCanaryGroupsForBudget.has( group ) &&
				! hasZeroCoveragePriorityGap( group )
			) {
				await pauseGroup(
					group,
					`deadline benchmark-canary cap keeps only the top ${ benchmarkCanarySchedulingLimit } unsatisfied primary/review rows until current-run success or downscope evidence exists`
				);
			}
		}
	}
	for ( const group of getScheduledBenchmarkCanaryForcedGroups() ) {
		if ( ! PROFILE_BY_GROUP[ group ] ) {
			continue;
		}
		if ( deferredBenchmarkCanariesForDeadline.has( group ) ) {
			enabled.delete( group );
			continue;
		}
		if (
			! enabled.has( group ) &&
			! desiredBenchmarkCanaryGroupsForBudget.has( group ) &&
			! hasZeroCoveragePriorityGap( group ) &&
			( deadlineBenchmarkCanaryCapActive ||
				enabled.size >= MAX_ENABLED_GROUPS )
		) {
			continue;
		}
		const startupNoiseBlock =
			getBenchmarkCanaryNoProductStartupNoiseBlock( group );
		if ( startupNoiseBlock ) {
			enabled.delete( group );
			recordBenchmarkCanaryNoProductStartupNoiseBlock(
				'skip-enable-benchmark-canary-startup-noise',
				group,
				startupNoiseBlock
			);
			continue;
		}
		if (
			! enabled.has( group ) &&
			shouldDeferBenchmarkCanaryForZeroCoverage( group )
		) {
			deferredBenchmarkCanariesForZeroCoverage.add( group );
			syncDeferredBenchmarkCanariesForZeroCoverage();
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'defer-benchmark-canary-for-zero-coverage-gap',
				group,
				reason: `benchmark canary ${ group } is waiting behind active zero-coverage RTC gaps: ${ zeroCoveragePriorityGroupsForPass
					.slice( 0, 3 )
					.join( ', ' ) }`,
			} );
			continue;
		}
		if ( enabled.has( group ) ) {
			continue;
		}
		while ( enabled.size >= MAX_ENABLED_GROUPS ) {
			const eviction = uniqueStringList( [
				...[ ...enabled ].filter(
					( candidate ) =>
						hasCurrentClosedBenchmarkCanaryCoverageStatusRow(
							candidate
						) &&
						! desiredBenchmarkCanaryGroupsForBudget.has( candidate )
				),
				'novelty-http-persistence-probe',
				...ZERO_COVERAGE_EVICTION_ORDER,
				...PRODUCTIVE_FALLBACK_GROUPS,
				...enabled,
			] ).find(
				( candidate ) =>
					enabled.has( candidate ) &&
					candidate !== group &&
					! desiredBenchmarkCanaryGroupsForBudget.has( candidate ) &&
					! isDeadlineFinalizationProtectedBenchmarkCanaryGroup(
						candidate
					) &&
					! isRequiredCoverageBreadthGroup( candidate ) &&
					! recommendedGroupsForPass.has( candidate ) &&
					! hasCoverageGapPriorityForPass( candidate )
			);
			if ( ! eviction ) {
				break;
			}
			await pauseGroup(
				eviction,
				`benchmark canary feedback preempts generic coverage slot for ${ group } before publication confidence can move`
			);
		}
		await enableGroup(
			group,
			getBenchmarkCanaryFeedbackReason( group ) ??
				'benchmark canary feedback requires equivalent fuzz coverage',
			{ allowRotation: true, budgetReserved: true }
		);
	}

	if (
		! httpProbeEnabled &&
		ENABLE_HTTP_PROBE &&
		benchmarkCanaryForcedGroups.size === 0 &&
		( resources.hasHeadroom || parserTransformSaturated ) &&
		enabled.size < Math.min( MAX_ENABLED_GROUPS, TARGET_ENABLED_GROUPS + 1 )
	) {
		await enableGroup(
			'novelty-http-persistence-probe',
			'HTTP persistence canary is absent; run a low-fault persistence lane to keep transport coverage mixed'
		);
	}

	function getZeroCoverageRotationHold() {
		return (
			activeCurrentRunActionGateDuplicateHold ??
			activeCurrentRunDuplicateNoiseHold ??
			dominantRealUserFamilyHold
		);
	}

	function getZeroCoverageRotationHoldReason( hold ) {
		const producerScope = hold?.groupName
			? ` from ${ hold.groupName }`
			: '';
		const representative = hold?.representativeSignal
			? `, representative=${ hold.representativeSignal }`
			: '';
		return `active current-run duplicate/noise hold is active for ${
			hold?.family ?? 'unknown'
		}${ producerScope } (${ hold?.count ?? 0 }/${
			hold?.total ?? hold?.count ?? 0
		} signatures, share=${ hold?.share ?? 0 }, source=${
			hold?.source ?? 'current-run'
		}${ representative }); do not evict another browser group for zero-coverage rotation until the held producer is paused/rotated while product-evidence representatives stay visible`;
	}

	for ( const group of ZERO_COVERAGE_PRIORITY_GROUPS ) {
		if ( enabled.has( group ) ) {
			continue;
		}
		const gapsForGroup = getZeroCoverageGapsForGroup( group );
		if ( gapsForGroup.length === 0 ) {
			continue;
		}
		let activeNoisePause = getActiveNoisePauseCooldown(
			group,
			triageYield
		);
		if ( isDeadlineBenchmarkCanaryCapPause( activeNoisePause ) ) {
			if ( state.pausedGroups ) {
				delete state.pausedGroups[ group ];
			}
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'bypass-zero-coverage-deadline-cap-pause',
				group,
				reason: `zero-coverage high-priority RTC surface is still unmet; deadline benchmark-canary cap cannot keep ${ group } paused`,
				sourcePauseAt: activeNoisePause.at,
				sourcePauseReason: activeNoisePause.reason,
			} );
			activeNoisePause = null;
		}
		if (
			activeNoisePause &&
			! canBypassStartupNoiseCooldown( group, activeNoisePause ) &&
			! shouldBypassBenchmarkCanaryNoisePause(
				group,
				activeNoisePause
			) &&
			! shouldBypassNoisePauseForSuccessDeficit( group, activeNoisePause )
		) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'skip-zero-coverage-priority-noise-cooldown',
				group,
				reason: `zero-coverage group ${ group } is still inside ${ activeNoisePause.kind } cooldown from ${ activeNoisePause.at }; keep the existing browser slot until the producer has product evidence or the cooldown expires`,
				expiresAt: activeNoisePause.expiresAt,
				...( activeNoisePause.originGroup
					? { originGroup: activeNoisePause.originGroup }
					: {} ),
			} );
			continue;
		}
		if (
			activeNoisePause &&
			shouldBypassNoisePauseForSuccessDeficit( group, activeNoisePause )
		) {
			delete state.pausedGroups?.[ group ];
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'bypass-zero-coverage-success-deficit-noise-pause',
				group,
				reason: getSuccessDeficitBypassReason( group ),
				sourcePauseAt: activeNoisePause.at,
				sourcePauseReason: activeNoisePause.reason,
				expiresAt: activeNoisePause.expiresAt,
				...( activeNoisePause.originGroup
					? { originGroup: activeNoisePause.originGroup }
					: {} ),
			} );
		}
		const zeroCoverageRotationHold = getZeroCoverageRotationHold();
		if (
			zeroCoverageRotationHold &&
			! shouldBypassProductEvidenceDuplicateHoldForSuccessDeficit(
				group,
				zeroCoverageRotationHold
			)
		) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'hold-zero-coverage-rotation-duplicate-noise',
				group,
				family: zeroCoverageRotationHold.family,
				source: zeroCoverageRotationHold.source,
				reason: getZeroCoverageRotationHoldReason(
					zeroCoverageRotationHold
				),
			} );
			continue;
		}
		if ( zeroCoverageRotationHold ) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'bypass-zero-coverage-success-deficit-duplicate-hold',
				group,
				family: zeroCoverageRotationHold.family,
				source: zeroCoverageRotationHold.source,
				reason: getSuccessDeficitBypassReason( group ),
			} );
		}
		while ( enabled.size >= getEnabledGroupBudgetLimit( group ) ) {
			const eviction = [
				...ZERO_COVERAGE_EVICTION_ORDER,
				...getYieldableBenchmarkCanaryEvictionsForZeroCoverage(),
			].find(
				( candidate ) =>
					enabled.has( candidate ) &&
					! hasOpenBenchmarkCanaryPromotionBlocker( candidate ) &&
					! isDeadlineFinalizationProtectedBenchmarkCanaryGroup(
						candidate
					) &&
					! ZERO_COVERAGE_PRIORITY_GROUPS.includes( candidate )
			);
			if ( ! eviction ) {
				break;
			}
			const evictionIsBenchmarkCanary =
				isBenchmarkCanaryForcedGroup( eviction );
			if ( evictionIsBenchmarkCanary ) {
				deferredBenchmarkCanariesForZeroCoverage.add( eviction );
				syncDeferredBenchmarkCanariesForZeroCoverage();
			}
			const paused = await pauseGroup(
				eviction,
				`zero-coverage high-priority RTC surface ${ group } needs a browser slot before lower-priority coverage top-offs; gaps=${ gapsForGroup
					.slice( 0, 3 )
					.map(
						( goal ) =>
							`${ goal.id }=${ goal.count }/${ goal.target }`
					)
					.join( ', ' ) }`
			);
			if ( evictionIsBenchmarkCanary ) {
				if ( paused ) {
					benchmarkCanaryZeroCoverageEvictions += 1;
				} else {
					deferredBenchmarkCanariesForZeroCoverage.delete( eviction );
					syncDeferredBenchmarkCanariesForZeroCoverage();
				}
			}
		}
		await enableGroup(
			group,
			`zero-coverage high-priority RTC surface: ${ gapsForGroup
				.slice( 0, 3 )
				.map(
					( goal ) => `${ goal.id }=${ goal.count }/${ goal.target }`
				)
				.join( ', ' ) }`,
			{ allowRotation: true, budgetReserved: true }
		);
	}

	for ( const group of getCoverageQualityRepairPriorityGroups() ) {
		if ( enabled.has( group ) ) {
			continue;
		}
		await enableGroup( group, getSuccessDeficitBypassReason( group ), {
			allowRotation: true,
		} );
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
				shouldBypassNoisePauseForSuccessDeficit(
					group,
					activeNoisePause
				)
			) {
				delete state.pausedGroups?.[ group ];
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'bypass-recommended-success-deficit-noise-cooldown',
					group,
					reason: getSuccessDeficitBypassReason( group ),
					sourcePauseAt: activeNoisePause.at,
					sourcePauseReason: activeNoisePause.reason,
					expiresAt: activeNoisePause.expiresAt,
					...( activeNoisePause.originGroup
						? { originGroup: activeNoisePause.originGroup }
						: {} ),
				} );
			} else if (
				shouldBypassProductEvidenceDuplicateHoldForStalledCoverageGap(
					group,
					activeNoisePause
				)
			) {
				delete state.pausedGroups?.[ group ];
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'bypass-recommended-stalled-coverage-gap-duplicate-cooldown',
					group,
					reason: getStalledCoverageGuidanceGapReason( group ),
					sourcePauseAt: activeNoisePause.at,
					sourcePauseReason: activeNoisePause.reason,
					expiresAt: activeNoisePause.expiresAt,
					...( activeNoisePause.originGroup
						? { originGroup: activeNoisePause.originGroup }
						: {} ),
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
			if (
				shouldBypassProductEvidenceDuplicateHoldForSuccessDeficit(
					group,
					effectiveProductEvidenceDuplicateFamilyHold
				)
			) {
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'bypass-recommended-success-deficit-duplicate-hold',
					group,
					reason: getSuccessDeficitBypassReason( group ),
				} );
			} else if (
				shouldBypassProductEvidenceDuplicateHoldForStalledCoverageGap(
					group,
					effectiveProductEvidenceDuplicateFamilyHold
				)
			) {
				state.changes.push( {
					at: new Date().toISOString(),
					action: 'bypass-recommended-stalled-coverage-gap-duplicate-hold',
					group,
					family: effectiveProductEvidenceDuplicateFamilyHold.family,
					source: effectiveProductEvidenceDuplicateFamilyHold.source,
					reason: getStalledCoverageGuidanceGapReason( group ),
				} );
			} else if ( shouldBypassDominantRealUserFamilyHold( group ) ) {
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
		if ( enabled.size >= getEnabledGroupBudgetLimit( group ) ) {
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
			[ REAL_USER_RELOAD_DIVERSITY_GROUP, 'real-user-editing' ],
			[ 'novelty-ws-real-user-save-reload', 'real-user-editing' ],
			[ 'novelty-ws-real-user-editing', 'real-user-editing' ],
			[ 'novelty-ws-media-cross-entity', 'media-cross-entity' ],
			[ 'novelty-ws-multi-reload-lifecycle', 'multi-reload-lifecycle' ],
			[ 'novelty-ws-three-user-late-join', 'three-user-late-join' ],
			[ 'novelty-ws-same-user-lifecycle', 'session-lifecycle' ],
			[
				'novelty-ws-same-user-separate-context-lifecycle',
				'session-lifecycle',
			],
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
			if ( isBenchmarkCanaryForcedGroup( group ) ) {
				continue;
			}
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
			'novelty-ws-same-user-separate-context-lifecycle',
		];

		for ( const group of qualityBudgetPauseOrder ) {
			if (
				enabled.size <= COVERAGE_QUALITY_MAX_ENABLED_GROUPS ||
				! enabled.has( group ) ||
				( isBenchmarkCanaryForcedGroup( group ) &&
					! hasBenchmarkCanaryClosureEvidence( group ) ) ||
				isDeadlineFinalizationProtectedBenchmarkCanaryGroup( group ) ||
				isRequiredCoverageBreadthGroup( group ) ||
				hasSuccessDeficit( group ) ||
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

	if (
		enabled.size >
		MAX_ENABLED_GROUPS + getEffectiveCoverageGapReservedGroupLimit()
	) {
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
			'novelty-ws-same-user-separate-context-lifecycle',
			'novelty-ws-async-server-blocks',
			'novelty-ws-media-cross-entity',
			'novelty-ws-long-session-large-doc',
			'novelty-ws-many-user-lifecycle-completion',
			'novelty-ws-many-user-lifecycle',
			REAL_USER_RELOAD_DIVERSITY_GROUP,
			'novelty-ws-real-user-save-reload',
			'novelty-ws-real-user-rich-text',
			'novelty-ws-real-user-editing',
			'novelty-ws-parser-transform',
		];

		for ( const group of maxBudgetPauseOrder ) {
			if (
				enabled.size <=
				MAX_ENABLED_GROUPS + getEffectiveCoverageGapReservedGroupLimit()
			) {
				break;
			}
			if (
				! enabled.has( group ) ||
				( isBenchmarkCanaryForcedGroup( group ) &&
					! hasBenchmarkCanaryClosureEvidence( group ) ) ||
				isDeadlineFinalizationProtectedBenchmarkCanaryGroup( group ) ||
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
	await sweepEnabledGroupsBlockedByActiveHolds();
	syncDeferredBenchmarkCanariesForZeroCoverage();
	syncDeferredBenchmarkCanariesForDeadline();
	for ( const group of getDeferredBenchmarkCanaryForcedGroupSet() ) {
		if ( enabled.delete( group ) ) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'remove-deferred-benchmark-canary-from-enabled-groups',
				group,
				reason: isDeadlineBlockedBenchmarkCanaryGroup( group )
					? 'deadline-deferred benchmark-canary rows are status/downscope rows only and must not remain enabled while higher-priority unblocked rows need browser capacity'
					: 'zero-coverage-deferred benchmark-canary rows must not remain enabled while the zero-coverage priority slot is active',
			} );
		}
	}
	state.enabledGroups = orderEnabledGroupsForSupervisor( [ ...enabled ] );
	await writeSupervisorGroupsForEnabledGroups( state.enabledGroups );
}

async function terminateGroupLanes(
	groupName,
	reason,
	{ action = 'terminate-paused-group-lanes', logLabel = 'paused group' } = {}
) {
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
			action,
			group: groupName,
			reason,
			count: killedCount,
		} );
		await log(
			`Terminated ${ killedCount } process(es) for ${ logLabel } ${ groupName }.`
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
		`export RTC_FUZZ_SUPERVISOR_CURRENT_OUTPUT_POINTER=${ shellQuote(
			CURRENT_OUTPUT_POINTER_PATH
		) }`,
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

	if ( PRODUCER_BUDGET_DISABLED ) {
		state.enabledGroups = [];
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'bootstrap-empty-supervisor-groups-for-zero-budget',
			reason: 'producer budget is disabled; leave supervisor-groups.json empty instead of applying policy-required, coverage-gap, benchmark-canary, or materialization-rescue floors',
		} );
		await writeJsonFileAtomic( GROUPS_PATH, [] );
		await writeJsonFileAtomic( STATE_PATH, state );
		return;
	}

	const selected = [];
	const seen = new Set();
	const productFailureQuarantines = new Set(
		state.productFailureQuarantinedGroups ?? []
	);
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
	const bootstrapProductEvidenceActionGateHold =
		getProductEvidenceActionGateHoldForScheduling(
			withRunDirProducerGroups(
				getCurrentRunActionGateDuplicateHold(
					state.triageYieldCurrent
				),
				state.currentRunDirs ?? []
			),
			state.triageYieldCurrent
		);
	const bootstrapProductEvidenceDuplicateFamilyHold =
		bootstrapProductEvidenceActionGateHold ??
		getCurrentRunProductEvidenceDuplicateHold(
			state.triageYieldCurrent,
			state.currentRunDirs ?? []
		);
	const getBootstrapDuplicateFamilyHoldBlock = ( group ) => {
		if (
			! isProductEvidenceDuplicateProducerHold(
				bootstrapProductEvidenceDuplicateFamilyHold
			) ||
			! shouldProductEvidenceDuplicateHoldBlockGroup(
				bootstrapProductEvidenceDuplicateFamilyHold,
				group
			)
		) {
			return null;
		}
		if (
			shouldBypassProductEvidenceDuplicateHoldForSuccessDeficit(
				group,
				bootstrapProductEvidenceDuplicateFamilyHold
			)
		) {
			return null;
		}
		if (
			shouldBypassBenchmarkCanaryProductEvidenceDuplicateHold(
				group,
				bootstrapProductEvidenceDuplicateFamilyHold
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
	const addGroup = ( group, options = {} ) => {
		if ( productFailureQuarantines.has( group ) ) {
			return;
		}
		const activeNoisePause = getActiveNoisePauseCooldown( group );
		const duplicateFamilyHoldBlock =
			getBootstrapDuplicateFamilyHoldBlock( group );
		const canBypassNonStartupPolicyGuards =
			ALLOW_DISABLED_POLICY_GUARDS &&
			SUPERVISOR_SESSION === 'rtc-coverage-guided-supervisor';
		const successDeficitBypassesStartupNoise =
			options.successDeficitBootstrap === true &&
			ALLOW_SUCCESS_DEFICIT_STARTUP_NOISE_CANARY &&
			SUCCESS_DEFICIT_BOOTSTRAP_GROUP_SET.has( group );
		const successDeficitBypassesStoredNoise =
			options.successDeficitBootstrap === true &&
			SUCCESS_DEFICIT_BOOTSTRAP_GROUP_SET.has( group ) &&
			shouldBypassNoisePauseForSuccessDeficit(
				group,
				state.pausedGroups?.[ group ]
			);
		const successDeficitBypassesActiveNoise =
			options.successDeficitBootstrap === true &&
			SUCCESS_DEFICIT_BOOTSTRAP_GROUP_SET.has( group ) &&
			shouldBypassNoisePauseForSuccessDeficit( group, activeNoisePause );
		const benchmarkCanaryBypassesStartupNoise =
			shouldBypassBenchmarkCanaryNoisePause(
				group,
				bootstrapProducerStartupHold
			);
		const storedPauseBlocksGroup =
			state.pausedGroups?.[ group ] &&
			! (
				canBypassNonStartupPolicyGuards &&
				getStoredNoisePauseKind( state.pausedGroups?.[ group ] ) !==
					'startup-noise'
			) &&
			! shouldBypassBenchmarkCanaryNoisePause(
				group,
				state.pausedGroups?.[ group ]
			) &&
			! (
				successDeficitBypassesStartupNoise &&
				getStoredNoisePauseKind( state.pausedGroups?.[ group ] ) ===
					'startup-noise'
			) &&
			! successDeficitBypassesStoredNoise;
		const activeNoisePauseBlocksGroup =
			activeNoisePause &&
			! (
				canBypassNonStartupPolicyGuards &&
				activeNoisePause.kind !== 'startup-noise'
			) &&
			! shouldBypassBenchmarkCanaryNoisePause(
				group,
				activeNoisePause
			) &&
			! (
				successDeficitBypassesStartupNoise &&
				activeNoisePause.kind === 'startup-noise'
			) &&
			! successDeficitBypassesActiveNoise;
		const startupHoldBlocksGroup =
			! benchmarkCanaryBypassesStartupNoise &&
			! successDeficitBypassesStartupNoise &&
			isStartupHoldBlockingProducerGroup(
				bootstrapProducerStartupHold,
				group
			);
		if (
			benchmarkCanaryBypassesStartupNoise &&
			( state.pausedGroups?.[ group ] || activeNoisePause )
		) {
			delete state.pausedGroups?.[ group ];
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'bootstrap-benchmark-canary-bypass-startup-noise',
				group,
				reason:
					getBenchmarkCanaryFeedbackReason( group ) ??
					'benchmark canary feedback requires this equivalent fuzz lane',
				...( activeNoisePause?.at
					? { sourcePauseAt: activeNoisePause.at }
					: {} ),
				...( activeNoisePause?.reason
					? { sourcePauseReason: activeNoisePause.reason }
					: {} ),
				...( activeNoisePause?.expiresAt
					? { expiresAt: activeNoisePause.expiresAt }
					: {} ),
			} );
		} else if (
			( successDeficitBypassesStartupNoise ||
				successDeficitBypassesStoredNoise ||
				successDeficitBypassesActiveNoise ) &&
			( state.pausedGroups?.[ group ] || activeNoisePause )
		) {
			delete state.pausedGroups?.[ group ];
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'bootstrap-success-deficit-bypass-noise-pause',
				group,
				reason: getBootstrapSuccessDeficitBypassReason( group ),
				...( activeNoisePause?.at
					? { sourcePauseAt: activeNoisePause.at }
					: {} ),
				...( activeNoisePause?.reason
					? { sourcePauseReason: activeNoisePause.reason }
					: {} ),
				...( activeNoisePause?.expiresAt
					? { expiresAt: activeNoisePause.expiresAt }
					: {} ),
			} );
		}
		if (
			! group ||
			seen.has( group ) ||
			! PROFILE_BY_GROUP[ group ] ||
			( state.disabledGroups?.[ group ] &&
				! canBypassNonStartupPolicyGuards ) ||
			storedPauseBlocksGroup ||
			activeNoisePauseBlocksGroup ||
			( duplicateFamilyHoldBlock && ! canBypassNonStartupPolicyGuards ) ||
			startupHoldBlocksGroup
		) {
			if ( group && activeNoisePauseBlocksGroup ) {
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
			} else if ( group && startupHoldBlocksGroup ) {
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
	const coverageQualityRepairBootstrapStart = selected.length;
	for ( const group of getCoverageQualityRepairPriorityGroups() ) {
		if ( selected.length >= MAX_ENABLED_GROUPS ) {
			break;
		}
		addGroup( group, { successDeficitBootstrap: true } );
	}
	const coverageQualityRepairBootstrapGroups = selected.slice(
		coverageQualityRepairBootstrapStart
	);
	if ( coverageQualityRepairBootstrapGroups.length > 0 ) {
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'bootstrap-coverage-quality-repair-supervisor-groups',
			groups: coverageQualityRepairBootstrapGroups,
			reason: 'fresh coverage-guided supervisor reserved earliest startup slots for profiles with zero ingested behavioral records before generic policy-required smoke groups can consume startup materialization time',
		} );
	}
	const policyRequiredBootstrapStart = selected.length;
	for ( const group of getActivePolicyRequiredBootstrapGroups() ) {
		if ( selected.length >= MAX_ENABLED_GROUPS ) {
			break;
		}
		addGroup( group );
	}
	const policyRequiredBootstrapGroups = selected
		.slice( policyRequiredBootstrapStart )
		.filter( ( group ) =>
			POLICY_REQUIRED_BOOTSTRAP_GROUP_SET.has( group )
		);
	if ( policyRequiredBootstrapGroups.length > 0 ) {
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'bootstrap-policy-required-supervisor-groups',
			groups: policyRequiredBootstrapGroups,
			reason: 'fresh coverage-guided supervisor reserved a startup slot for policy-required oracle coverage before deadline benchmark-canary-only bootstrap can suppress generic breadth groups',
		} );
	}
	const hasOutstandingSuccessDeficit =
		SUCCESS_DEFICIT_BOOTSTRAP_GROUPS.some( hasSuccessDeficit );
	const benchmarkCanaryBootstrapOnly =
		isDeadlineBenchmarkCanaryBudgetCapActive();
	const benchmarkCanarySchedulingLimit = getBenchmarkCanarySchedulingLimit();
	const benchmarkCanaryBootstrapReserve =
		benchmarkCanaryForcedGroups.size > 0
			? Math.min(
					benchmarkCanaryForcedGroups.size,
					Math.max(
						1,
						Math.min(
							BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS,
							benchmarkCanarySchedulingLimit
						)
					)
			  )
			: 0;
	const successDeficitBootstrapStart = selected.length;
	const successDeficitBootstrapLimit =
		selected.length +
		( benchmarkCanaryBootstrapOnly
			? 0
			: Math.min(
					SUCCESS_DEFICIT_BOOTSTRAP_SLOTS,
					Math.max(
						0,
						MAX_ENABLED_GROUPS -
							selected.length -
							benchmarkCanaryBootstrapReserve
					)
			  ) );
	if ( ! benchmarkCanaryBootstrapOnly ) {
		for ( const group of getBootstrapSuccessDeficitGroups() ) {
			if ( selected.length >= successDeficitBootstrapLimit ) {
				break;
			}
			addGroup( group, { successDeficitBootstrap: true } );
		}
	}
	const successDeficitBootstrapGroups = selected.slice(
		successDeficitBootstrapStart
	);
	if ( successDeficitBootstrapGroups.length > 0 ) {
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'bootstrap-success-deficit-supervisor-groups',
			groups: successDeficitBootstrapGroups,
			reservedBenchmarkCanarySlots: benchmarkCanaryBootstrapReserve,
			reason: hasOutstandingSuccessDeficit
				? 'fresh coverage-guided supervisor reserved initial browser slots for below-target successful-completion goals before benchmark-canary or generic breadth rotation could spend the producer budget elsewhere'
				: 'fresh coverage-guided supervisor reserved initial browser slots for groups that map to still-unmet successful-completion goals before generic breadth rotation could spend the full producer budget elsewhere',
		} );
	}
	const zeroCoverageBootstrapStart = selected.length;
	const zeroCoverageBootstrapLimit =
		MAX_ENABLED_GROUPS - benchmarkCanaryBootstrapReserve;
	if ( ! benchmarkCanaryBootstrapOnly ) {
		for ( const group of getBootstrapZeroCoveragePriorityGroups() ) {
			if ( selected.length >= zeroCoverageBootstrapLimit ) {
				break;
			}
			addGroup( group );
		}
	}
	const zeroCoverageBootstrapGroups = selected
		.slice( zeroCoverageBootstrapStart )
		.filter( ( group ) => ZERO_COVERAGE_PRIORITY_GROUPS.includes( group ) );
	if ( zeroCoverageBootstrapGroups.length > 0 ) {
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'bootstrap-zero-coverage-supervisor-groups',
			groups: zeroCoverageBootstrapGroups,
			reservedBenchmarkCanarySlots: benchmarkCanaryBootstrapReserve,
			reason: 'fresh coverage-guided supervisor reserved initial browser slots for still-zero RTC gap groups before benchmark canaries could consume the full producer budget',
		} );
	}
	const benchmarkCanaryBootstrapStart = selected.length;
	const deadlineDeferredBootstrapGroups = new Set(
		getDeadlineDeferredBenchmarkCanaryGroups()
	);
	if ( deadlineDeferredBootstrapGroups.size > 0 ) {
		state.deferredBenchmarkCanaryGroupsForDeadline = [
			...deadlineDeferredBootstrapGroups,
		].sort();
	}
	const benchmarkCanaryBootstrapGroupsForSelection = uniqueStringList( [
		...getProtectedBenchmarkCanaryGroupsForBudget(),
		...getScheduledBenchmarkCanaryForcedGroups(),
	] );
	const benchmarkCanaryBootstrapLimit =
		getPolicyProtectedSupervisorGroupLimit(
			benchmarkCanarySchedulingLimit,
			uniqueStringList( [
				...selected,
				...benchmarkCanaryBootstrapGroupsForSelection,
			] )
		);
	for ( const group of benchmarkCanaryBootstrapGroupsForSelection ) {
		if ( selected.length >= benchmarkCanaryBootstrapLimit ) {
			break;
		}
		if ( deadlineDeferredBootstrapGroups.has( group ) ) {
			continue;
		}
		addGroup( group );
	}
	const benchmarkCanaryBootstrapGroups = selected
		.slice( benchmarkCanaryBootstrapStart )
		.filter( ( group ) => isBenchmarkCanaryForcedGroup( group ) );
	if ( benchmarkCanaryBootstrapGroups.length > 0 ) {
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'bootstrap-benchmark-canary-supervisor-groups',
			groups: benchmarkCanaryBootstrapGroups,
			reason: 'active benchmark canary feedback must materialize equivalent fuzz lanes before generic breadth groups on a fresh coverage-guided supervisor',
		} );
	}
	if ( benchmarkCanaryBootstrapOnly ) {
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'deadline-bootstrap-benchmark-canary-only',
			groups: benchmarkCanaryBootstrapGroups,
			reason: 'low-disk deadline mode is active with benchmark canary feedback; fresh supervisor bootstrap is limited to materializable forced canary groups instead of preparing broad breadth or historical enabled groups before PR evidence exists',
		} );
	} else {
		for ( const group of REQUIRED_COVERAGE_BREADTH_GROUPS ) {
			if ( selected.length >= benchmarkCanarySchedulingLimit ) {
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
				const storedPause = state.pausedGroups?.[ group ];
				const storedPauseBlocksRescue =
					storedPause &&
					( getStoredNoisePauseKind( storedPause ) ||
						isCurrentOutputPause( storedPause ) );
				const duplicateFamilyHoldBlock =
					getBootstrapDuplicateFamilyHoldBlock( group );
				if (
					seen.has( group ) ||
					! PROFILE_BY_GROUP[ group ] ||
					state.disabledGroups?.[ group ]
				) {
					continue;
				}
				if ( storedPauseBlocksRescue || activeNoisePause ) {
					const pausedReason = storedPause?.reason;
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
				if ( storedPause ) {
					delete state.pausedGroups[ group ];
					state.changes.push( {
						at: new Date().toISOString(),
						action: 'clear-bootstrap-rescue-non-noise-pause',
						group,
						reason: 'empty materialization rescue may reuse a non-noise stored pause from a previous coverage root while preserving startup/noise cooldowns',
						storedPauseReason: storedPause.reason,
					} );
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

	const groups = selected.slice(
		0,
		Math.min(
			MAX_ENABLED_GROUPS,
			getPolicyProtectedSupervisorGroupLimit(
				Math.max( 1, benchmarkCanarySchedulingLimit ),
				selected
			)
		)
	);
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

	state.enabledGroups = orderEnabledGroupsForSupervisor( groups );
	const groupProfiles = state.enabledGroups
		.map( ( group ) =>
			PROFILE_GROUPS.find( ( profile ) => profile.name === group )
		)
		.filter( Boolean );
	const bootstrapGroups = groupProfiles.map( buildGroup );
	await writeJsonFileAtomic( GROUPS_PATH, bootstrapGroups );
	queueNoveltyGroupRepoPrep(
		bootstrapGroups,
		'bootstrap supervisor groups were published before per-group repo preparation',
		{ priority: benchmarkCanaryBootstrapGroups.length > 0 }
	);
	state.changes.push( {
		at: new Date().toISOString(),
		action: 'bootstrap-supervisor-groups',
		groups: state.enabledGroups,
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
	const currentActionGateHold = getCurrentRunActionGateDuplicateHold(
		currentPolicyTriageYield
	);
	const currentDrainActionGateHold = getCurrentRunActionGateDuplicateHold(
		currentDrainTriageYield
	);
	const currentDuplicateActionGateHold = currentActionGateHold
		? { ...currentActionGateHold, scope: 'active current-run' }
		: currentDrainActionGateHold
		? { ...currentDrainActionGateHold, scope: 'active/drain current-run' }
		: null;
	if ( ! COVERAGE_GUIDANCE_CODEX_FORCE && currentDuplicateActionGateHold ) {
		const productEvidenceNote =
			( currentDuplicateActionGateHold.rawProductEvidenceSignatures ??
				0 ) > 0 ||
			( currentDuplicateActionGateHold.productEvidenceSignatures ?? 0 ) >
				0 ||
			( currentDuplicateActionGateHold.likelyRealVisible ?? 0 ) > 0
				? '; preserve the visible product-evidence representative and rotate/cap siblings before more coverage Codex work'
				: '; no product-evidence representative is visible for this duplicate/noise family';
		const reason = `current duplicate/noise action gate is active for ${ currentDuplicateActionGateHold.family } in ${ currentDuplicateActionGateHold.scope } scope (${ currentDuplicateActionGateHold.count }/${ currentDuplicateActionGateHold.total } ${ currentDuplicateActionGateHold.source } signatures, share=${ currentDuplicateActionGateHold.share }${ productEvidenceNote })`;
		if ( state.coverageGuidanceCurrentDuplicateHoldReason !== reason ) {
			state.coverageGuidanceCurrentDuplicateHoldReason = reason;
			state.coverageGuidanceCurrentDuplicateHoldLastAt =
				new Date().toISOString();
			state.changes.push( {
				at: state.coverageGuidanceCurrentDuplicateHoldLastAt,
				action: 'hold-coverage-guidance-codex-current-duplicate-action-gate',
				reason,
			} );
		}
		return;
	}
	if ( state.coverageGuidanceCurrentDuplicateHoldReason ) {
		state.changes.push( {
			at: new Date().toISOString(),
			action: 'clear-coverage-guidance-current-duplicate-action-gate',
			reason: 'current duplicate/noise action-gate hold cleared; coverage Codex may launch if other gates permit it',
		} );
		delete state.coverageGuidanceCurrentDuplicateHoldReason;
		delete state.coverageGuidanceCurrentDuplicateHoldLastAt;
	}
	const currentRunHold = getCurrentRunDuplicateNoiseHold(
		currentPolicyTriageYield,
		{
			allowGenericDuplicate: true,
			requireNoProductEvidence: true,
		}
	);
	const currentStartupHold = isCurrentNoProductStartupHold( currentRunHold )
		? { ...currentRunHold, scope: 'active current-run' }
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
	function truncatePromptLines( value, limit ) {
		const lines = String( value || '' )
			.trim()
			.split( '\n' )
			.filter( Boolean );
		if ( lines.length <= limit ) {
			return lines.join( '\n' );
		}

		return [
			...lines.slice( 0, limit ),
			`... truncated ${ lines.length - limit } line(s) ...`,
		].join( '\n' );
	}

	function buildCurrentBranchAnalysisContext() {
		const branch =
			getGitOutput( [ 'branch', '--show-current' ] ) || '(unknown)';
		const head =
			getGitOutput( [ 'rev-parse', '--short=12', 'HEAD' ] ) ||
			( CURRENT_REPO_HEAD_COMMIT || '' ).slice( 0, 12 ) ||
			'(unknown)';
		const status = truncatePromptLines(
			getGitOutput( [ 'status', '--short' ] ) || 'clean',
			80
		);
		const recentCommits = truncatePromptLines(
			getGitOutput( [ 'log', '--oneline', '-12' ] ) || 'unavailable',
			20
		);
		const recentChangedFiles = truncatePromptLines(
			getGitOutput( [ 'diff', '--name-status', 'HEAD~12..HEAD' ] ) ||
				getGitOutput( [ 'diff', '--name-status' ] ) ||
				'unavailable',
			120
		);
		const dirtyDiffStat = truncatePromptLines(
			getGitOutput( [ 'diff', '--stat' ] ) || 'none',
			80
		);

		return [
			'Current all-merge branch analysis context:',
			`- branch: ${ branch }`,
			`- head: ${ head }`,
			'- status:',
			status,
			'- recent commits:',
			recentCommits,
			'- changed files in recent branch stack:',
			recentChangedFiles,
			'- dirty diff stat:',
			dirtyDiffStat,
		].join( '\n' );
	}

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
		buildCurrentBranchAnalysisContext(),
		'',
		'Required branch issue-analysis pass:',
		'- Before changing knobs, inspect the current branch/head/status above and review recent branch changes for product-risk classes the harness should catch.',
		'- Use static/diff review to derive fuzz invariants, then add or retarget coverage so those invariants are exercised against this all-merge branch.',
		'- Treat these recently observed coverage holes as templates for invariants, not as product-fix instructions: CRDT persisted-base metadata, stale serialized trailing-block deletion, table query-array local deletion plus remote append, remote block-only dirty content, and HTTP polling same-client budget filtering.',
		'- Prefer lower-level or PHP protocol fuzz targets for deterministic state-machine holes; use browser groups only when the issue needs UI, persistence, reload, or multi-client behavior.',
		'- Do not edit product behavior just to make this guidance pass quiet; the goal is harness coverage that finds real branch bugs.',
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

function getPositiveMillisecondValue( value ) {
	const parsed = Number.parseInt( value, 10 );
	return Number.isFinite( parsed ) && parsed > 0 ? parsed : null;
}

function getSupervisorGroupCoverageWarmupMs( group ) {
	const env = group?.env ?? {};
	const configuredTimeouts = [
		env.RTC_FUZZ_RUN_TIMEOUT_MS,
		env.GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS,
	]
		.map( getPositiveMillisecondValue )
		.filter( Number.isFinite );

	return Math.max(
		CURRENT_RUN_COVERAGE_WARMUP_MS,
		...( configuredTimeouts.length ? configuredTimeouts : [ 0 ] )
	);
}

function getSupervisorGroupLaunchAgeMs( group ) {
	const launchAt =
		group?.lastLaunchAt ??
		group?.launches?.[ group.launches.length - 1 ]?.at ??
		group?.lastRecoveryAt ??
		null;
	const parsed = launchAt ? Date.parse( launchAt ) : NaN;
	return Number.isFinite( parsed ) ? Date.now() - parsed : null;
}

function formatNoCurrentOutputCoverageWarmupGroup( group ) {
	const warmupSeconds = Math.round( group.warmupMs / 1000 );
	if ( group.ageMs === null ) {
		return `${ group.name } age=unknown warmup=${ warmupSeconds }s`;
	}
	return `${ group.name } age=${ Math.round(
		group.ageMs / 1000
	) }s warmup=${ warmupSeconds }s`;
}

function getNoCurrentOutputCoverageWarning( supervisorState ) {
	const groups = supervisorState?.groups ?? [];
	const activeGroups = groups.filter(
		( group ) =>
			ACTIVE_GROUP_STATUSES.has( group.status ) &&
			( group.currentRunDir || ( group.activeRunDirs ?? [] ).length > 0 )
	);

	if ( activeGroups.length === 0 ) {
		return `no behavioral coverage files found under novelty output dir ${ OUTPUT_DIR }`;
	}

	const staleGroups = [];
	for ( const group of activeGroups ) {
		const ageMs = getSupervisorGroupLaunchAgeMs( group );
		const warmupMs = getSupervisorGroupCoverageWarmupMs( group );
		if ( ageMs === null || ageMs > warmupMs ) {
			staleGroups.push( {
				name: group.name,
				ageMs,
				warmupMs,
			} );
		}
	}

	if ( staleGroups.length === 0 ) {
		return null;
	}

	const staleGroupSummary = staleGroups
		.slice( 0, 4 )
		.map( formatNoCurrentOutputCoverageWarmupGroup )
		.join( ', ' );
	return `no behavioral coverage files found under novelty output dir ${ OUTPUT_DIR } after coverage warmup for active group(s): ${ staleGroupSummary }`;
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
		const noCurrentCoverageWarning =
			getNoCurrentOutputCoverageWarning( supervisorState );
		if ( noCurrentCoverageWarning ) {
			warnings.push( noCurrentCoverageWarning );
		}
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
		`- all-time records by user count: ${ JSON.stringify(
			state.userDocumentConcurrency?.byUserCount ?? {}
		) }`,
		`- successful records by user count: ${ JSON.stringify(
			state.userDocumentConcurrency?.successfulByUserCount ?? {}
		) }`,
		`- successful records by profile/user count: ${ JSON.stringify(
			state.userDocumentConcurrency?.successfulByProfileUserCount ?? {}
		) }`,
		`- successful records by transport/user count: ${ JSON.stringify(
			state.userDocumentConcurrency?.successfulByTransportUserCount ?? {}
		) }`,
		`- successful records by collaborator mode: ${ JSON.stringify(
			state.userDocumentConcurrency?.successfulByCollaboratorMode ?? {}
		) }`,
		`- successful records by action-user count: ${ JSON.stringify(
			state.userDocumentConcurrency?.successfulByActionUserCount ?? {}
		) }`,
		`- successful lifecycle events by type/user count: ${ JSON.stringify(
			state.userDocumentConcurrency?.successfulLifecycleByTypeUserCount ??
				{}
		) }`,
		`- successful records by user/block bucket: ${ JSON.stringify(
			state.userDocumentConcurrency?.successfulRecordsByUserBlockBucket ??
				{}
		) }`,
		`- max users in one document: ${
			state.userDocumentConcurrency?.maxUserCount ?? 0
		}`,
		`- max users who edited one document: ${
			state.userDocumentConcurrency?.maxActionUserCount ?? 0
		}`,
		`- max extra collaborators in one document: ${
			state.userDocumentConcurrency?.maxExtraCollaborators ?? 0
		}`,
		`- max total blocks in one document: ${
			state.userDocumentConcurrency?.maxTotalBlocks ?? 0
		}`,
		`- max large-document blocks in one document: ${
			state.userDocumentConcurrency?.maxLargeDocumentBlocks ?? 0
		}`,
		`- current-run records by profile: ${ JSON.stringify(
			state.currentRunRecordCountsByProfile ?? {}
		) }`,
		`- current-run records by group: ${ JSON.stringify(
			state.currentRunRecordCountsByGroup ?? {}
		) }`,
		`- current-run successful records by profile: ${ JSON.stringify(
			state.currentRunSuccessfulRecordCountsByProfile ?? {}
		) }`,
		`- current-run successful records by group: ${ JSON.stringify(
			state.currentRunSuccessfulRecordCountsByGroup ?? {}
		) }`,
		`- current-run records by transport: ${ JSON.stringify(
			state.currentRunRecordCountsByTransport ?? {}
		) }`,
		`- current-run records by user count: ${ JSON.stringify(
			state.currentRunUserDocumentConcurrency?.byUserCount ?? {}
		) }`,
		`- current-run successful records by user count: ${ JSON.stringify(
			state.currentRunUserDocumentConcurrency?.successfulByUserCount ?? {}
		) }`,
		`- current-run successful records by profile/user count: ${ JSON.stringify(
			state.currentRunUserDocumentConcurrency
				?.successfulByProfileUserCount ?? {}
		) }`,
		`- current-run successful records by action-user count: ${ JSON.stringify(
			state.currentRunUserDocumentConcurrency
				?.successfulByActionUserCount ?? {}
		) }`,
		`- current-run max users in one document: ${
			state.currentRunUserDocumentConcurrency?.maxUserCount ?? 0
		}`,
		`- current-run max users who edited one document: ${
			state.currentRunUserDocumentConcurrency?.maxActionUserCount ?? 0
		}`,
		`- current-run max total blocks in one document: ${
			state.currentRunUserDocumentConcurrency?.maxTotalBlocks ?? 0
		}`,
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
		`- same-user separate-context records: ${
			state.featureCounts?.[
				'collaborator-mode:same-user-separate-context'
			] ?? 0
		}`,
		`- many-user lifecycle records: ${
			state.featureCounts?.[ 'users:12' ] ?? 0
		}`,
		`- thirty-user lifecycle records: ${
			state.featureCounts?.[ 'users:30' ] ?? 0
		}`,
		`- successful thirty-user records: ${
			state.userDocumentConcurrency?.successfulByUserCount?.[ '30' ] ?? 0
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
		`- benchmark canary forced groups: ${
			getBenchmarkCanaryForcedGroupsForStatus().length
				? getBenchmarkCanaryForcedGroupsForStatus().join( ', ' )
				: 'none'
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
		updateCurrentRunDirReconciliation(
			supervisorState,
			activeRunDirs,
			activeRunDirsIncludingPausedNoAnalysis,
			state.currentRunDirSource
		);
		await writeJsonFileAtomic( STATE_PATH, state );
	} else if ( activeRunDirs.length > 0 ) {
		const activeRunDirsKey = getPathListKey( activeRunDirs );
		const reconciliation = state.currentRunDirReconciliation;
		if (
			reconciliation?.outputDir !== OUTPUT_DIR ||
			getPathListKey( reconciliation?.policyActiveRunDirPaths ?? [] ) !==
				activeRunDirsKey
		) {
			state.currentRunDirSource =
				state.currentRunDirSource ??
				'supervisor-active-run-dirs-startup';
			updateCurrentRunDirReconciliation(
				supervisorState,
				activeRunDirs,
				activeRunDirsIncludingPausedNoAnalysis,
				state.currentRunDirSource
			);
			await writeJsonFileAtomic( STATE_PATH, state );
		}
	}
	await writeBenchmarkCanaryCoverageTelemetry(
		supervisorState,
		activeRunDirs
	);
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

async function refreshCurrentRunDirsFromSupervisorHeartbeat() {
	const supervisorState = await readSupervisorState();
	const activeRunDirs = filterPolicyInactiveCurrentRunDirs(
		getCurrentRunDirs( supervisorState ),
		supervisorState
	);
	if ( activeRunDirs.length === 0 ) {
		return activeRunDirs;
	}
	const activeRunDirsIncludingPausedNoAnalysis = getCurrentRunDirs(
		supervisorState,
		{
			includePausedNoAnalysis: true,
		}
	);
	const activeRunDirsKey = getPathListKey( activeRunDirs );
	const activeRunDirsIncludingPausedNoAnalysisKey = getPathListKey(
		activeRunDirsIncludingPausedNoAnalysis
	);
	if (
		getPathListKey( state.currentRunDirs ?? [] ) === activeRunDirsKey &&
		getPathListKey(
			state.currentRunDirsIncludingPausedNoAnalysis ?? []
		) === activeRunDirsIncludingPausedNoAnalysisKey
	) {
		const reconciliation = state.currentRunDirReconciliation;
		if (
			reconciliation?.outputDir !== OUTPUT_DIR ||
			getPathListKey( reconciliation?.policyActiveRunDirPaths ?? [] ) !==
				activeRunDirsKey
		) {
			state.currentRunDirSource =
				state.currentRunDirSource ??
				'supervisor-active-run-dirs-heartbeat';
			updateCurrentRunDirReconciliation(
				supervisorState,
				activeRunDirs,
				activeRunDirsIncludingPausedNoAnalysis,
				state.currentRunDirSource
			);
			await writeJsonFileAtomic( STATE_PATH, state );
		}
		return activeRunDirs;
	}
	state.currentRunDirs = activeRunDirs;
	state.currentRunDirsIncludingPausedNoAnalysis =
		activeRunDirsIncludingPausedNoAnalysis;
	state.currentRunDirSource = 'supervisor-active-run-dirs-heartbeat';
	updateCurrentRunDirReconciliation(
		supervisorState,
		activeRunDirs,
		activeRunDirsIncludingPausedNoAnalysis,
		state.currentRunDirSource
	);
	state.changes.push( {
		at: new Date().toISOString(),
		action: 'refresh-current-run-dirs-from-supervisor-heartbeat',
		activeRunDirs: activeRunDirs.length,
		activeRunDirsIncludingPausedNoAnalysis:
			activeRunDirsIncludingPausedNoAnalysis.length,
		reason: 'heartbeat reconciled novelty state with current supervisor active run dirs so context builders do not fail closed on stale active-dir accounting',
	} );
	await writeJsonFileAtomic( STATE_PATH, state );
	return activeRunDirs;
}

async function writeStatusHeartbeat() {
	if ( ! fullStatusWritten ) {
		await writeStartupStatus();
		return;
	}
	const activeRunDirs = await refreshCurrentRunDirsFromSupervisorHeartbeat();
	const supervisorState = await readSupervisorState();
	await syncProductFailureQuarantinesAndRepublish(
		supervisorState,
		'status heartbeat'
	);
	const activeRunDirsIncludingPausedNoAnalysis =
		state.currentRunDirsIncludingPausedNoAnalysis ?? activeRunDirs;
	const evidenceRunDirs = uniquePathList( [
		...activeRunDirs,
		...getCurrentRunDirs( supervisorState, {
			allowOutputDirFallback: false,
		} ),
	] );
	const activeCoverageFiles = await findCoverageFiles( evidenceRunDirs );
	const activeSummaryFiles = await findSummaryFiles( evidenceRunDirs );
	await ensureCurrentRunCounters( activeCoverageFiles, activeSummaryFiles );
	await writeBenchmarkCanaryCoverageTelemetry(
		supervisorState,
		activeRunDirs,
		activeCoverageFiles,
		activeRunDirsIncludingPausedNoAnalysis
	);
	await reconcileOpenBenchmarkCanarySupervisorGroupsAfterTelemetry();
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
		const liveCurrentRunDirSource = state.currentRunDirSource ?? 'unknown';
		const liveCurrentRunDirCount = ( state.currentRunDirs ?? [] ).length;
		if ( /^- current-run dir source: /m.test( nextText ) ) {
			nextText = nextText.replace(
				/^- current-run dir source: .*$/m,
				`- current-run dir source: ${ liveCurrentRunDirSource }`
			);
		}
		if ( /^- current-run active dirs: /m.test( nextText ) ) {
			nextText = nextText.replace(
				/^- current-run active dirs: .*$/m,
				`- current-run active dirs: ${ liveCurrentRunDirCount }`
			);
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
	source,
	supervisorState = null
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
	if ( supervisorState ) {
		updateCurrentRunDirReconciliation(
			supervisorState,
			currentRunDirs,
			currentRunDirsIncludingPausedNoAnalysis,
			source
		);
	}
	await writeJsonFileAtomic( STATE_PATH, state );
}

async function runPass() {
	await refreshBenchmarkCanaryFeedbackState();
	applyHttpProviderGatingStartupFixStateRepair();
	applyLargeHttpLifecycleStartupFixStateRepair();
	applyCollaborationReadinessStartupFixStateRepair();
	applyManyUserJoinBatchStartupFixStateRepair();
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
	await syncProductFailureQuarantinesAndRepublish(
		supervisorState,
		'full-pass preflight'
	);
	await syncSupervisorStartupStallPauses( supervisorState );
	if ( START_SUPERVISOR && PRODUCER_BUDGET_DISABLED ) {
		const publishedGroups = await readJsonFile( GROUPS_PATH );
		if (
			( state.enabledGroups ?? [] ).length > 0 ||
			( Array.isArray( publishedGroups ) && publishedGroups.length > 0 )
		) {
			state.enabledGroups = [];
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'clear-forced-supervisor-groups-for-zero-budget',
				reason: 'producer budget is disabled; skip forced policy, coverage-gap, canary, and rescue publication until the autoscaler raises the budget',
			} );
			await writeJsonFileAtomic( STATE_PATH, state );
			await writeJsonFileAtomic( GROUPS_PATH, [] );
		}
	} else if ( START_SUPERVISOR ) {
		const forcedSupervisorGroups = uniqueStringList( [
			...getProtectedBenchmarkCanaryGroupsForBudget(),
			...getScheduledBenchmarkCanaryGroupsForBudget(),
			...getActivePolicyRequiredBootstrapGroups(),
		] ).filter( ( group ) => PROFILE_BY_GROUP[ group ] );
		const coverageGapSupervisorGroups =
			getCoverageGapPublicationCandidateGroups();
		const benchmarkCanarySchedulingLimit =
			getBenchmarkCanarySchedulingLimit();
		const exactStackCanaryCapFilled =
			isDeadlineBenchmarkCanaryBudgetCapActive() &&
			benchmarkCanarySchedulingLimit > 0 &&
			getAuthoritativeOpenBenchmarkCanaryFloorGroups().length >=
				benchmarkCanarySchedulingLimit;
		const eligibleCoverageGapSupervisorGroups = exactStackCanaryCapFilled
			? coverageGapSupervisorGroups.filter( ( group ) =>
					getCoverageGapReservedGroups( [
						...forcedSupervisorGroups,
						...coverageGapSupervisorGroups,
					] ).includes( group )
			  )
			: coverageGapSupervisorGroups;
		let requiredSupervisorGroups = uniqueStringList( [
			...forcedSupervisorGroups,
			...eligibleCoverageGapSupervisorGroups,
		] );
		if ( STRICT_PRODUCER_BUDGET_CAP ) {
			const requiredSupervisorBaseLimit = exactStackCanaryCapFilled
				? benchmarkCanarySchedulingLimit
				: MAX_ENABLED_GROUPS;
			const requiredSupervisorGroupLimit =
				getPolicyProtectedSupervisorGroupLimit(
					requiredSupervisorBaseLimit,
					requiredSupervisorGroups
				);
			requiredSupervisorGroups =
				orderSupervisorGroupsWithCoverageGapReserve(
					requiredSupervisorGroups,
					requiredSupervisorBaseLimit
				).slice( 0, requiredSupervisorGroupLimit );
		}
		const enabledGroupSet = new Set( state.enabledGroups ?? [] );
		const publishedGroups = await readJsonFile( GROUPS_PATH );
		const publishedGroupSet = new Set(
			( Array.isArray( publishedGroups ) ? publishedGroups : [] )
				.map( ( group ) => group?.name )
				.filter( Boolean )
		);
		const missingForcedSupervisorGroups = requiredSupervisorGroups.filter(
			( group ) =>
				! enabledGroupSet.has( group ) ||
				! publishedGroupSet.has( group )
		);
		if ( missingForcedSupervisorGroups.length > 0 ) {
			state.changes.push( {
				at: new Date().toISOString(),
				action: 'publish-missing-forced-supervisor-groups',
				groups: requiredSupervisorGroups,
				coverageGapGroups: eligibleCoverageGapSupervisorGroups,
				suppressedCoverageGapGroups: exactStackCanaryCapFilled
					? coverageGapSupervisorGroups
					: [],
				missingGroups: missingForcedSupervisorGroups,
				reason: 'forced supervisor scheduling changed after status/accounting refresh; rewrite supervisor-groups.json immediately so policy-required editor oracles, open PR-evidence rows, and harness-work coverage gap groups cannot remain unscheduled behind stale enabledGroups',
			} );
			await writeJsonFileAtomic( STATE_PATH, state );
			await writeSupervisorGroupsForEnabledGroups(
				uniqueStringList( [
					...( state.enabledGroups ?? [] ),
					...requiredSupervisorGroups,
				] )
			);
		}
	}
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
	const repairedBenchmarkCanaryPausesAfterCooldowns =
		applyBenchmarkCanaryFeedbackStateRepair();
	if ( repairedBenchmarkCanaryPausesAfterCooldowns > 0 ) {
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
		'supervisor-active-run-dirs-prepass',
		supervisorState
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
				'supervisor-active-run-dirs-materialized-before-coverage-scan',
				supervisorState
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
				'supervisor-active-run-dirs-materialized-prepass',
				supervisorState
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
	await writeBenchmarkCanaryCoverageTelemetry(
		supervisorState,
		currentRunDirs,
		coverageFiles.filter( ( filePath ) =>
			isPathInsideRoot( filePath, OUTPUT_DIR )
		),
		currentRunDirsIncludingPausedNoAnalysis
	);
	const summaryStats =
		await readSummaryStartupFailures( currentSummaryFiles );
	state.userDocumentConcurrency =
		await summarizeUserDocumentConcurrency( coverageFiles );
	state.currentRunUserDocumentConcurrency =
		await summarizeUserDocumentConcurrency( currentCoverageFiles );
	let guidance = createCoverageGuidance( novelty );
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
			state.userDocumentConcurrency =
				await summarizeUserDocumentConcurrency( coverageFiles );
			state.currentRunUserDocumentConcurrency =
				await summarizeUserDocumentConcurrency( currentCoverageFiles );
			guidance = createCoverageGuidance( novelty );
			state.coverageGuidance = guidance;
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
	updateCurrentRunDirReconciliation(
		supervisorState,
		currentRunDirs,
		currentRunDirsIncludingPausedNoAnalysis,
		state.currentRunDirSource
	);
	syncBenchmarkCanarySupervisorProductEvidence( supervisorState );
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
		state.userDocumentConcurrency =
			await summarizeUserDocumentConcurrency( coverageFiles );
		state.currentRunUserDocumentConcurrency =
			await summarizeUserDocumentConcurrency( currentCoverageFiles );
		guidance = createCoverageGuidance( novelty );
		state.coverageGuidance = guidance;
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
	const benchmarkCanaryCurrentRootCoverageFiles = uniquePathList( [
		...coverageFiles.filter( ( filePath ) =>
			isPathInsideRoot( filePath, OUTPUT_DIR )
		),
		...( await findCoverageFiles( [ OUTPUT_DIR ] ) ),
	] );
	await writeBenchmarkCanaryCoverageTelemetry(
		supervisorState,
		currentRunDirs,
		benchmarkCanaryCurrentRootCoverageFiles,
		currentRunDirsIncludingPausedNoAnalysis
	);
	await reconcileOpenBenchmarkCanarySupervisorGroupsAfterTelemetry();
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
let processLockOwned = false;

async function currentOutputPointerMatches() {
	if ( ! ENFORCE_CURRENT_OUTPUT_POINTER ) {
		return true;
	}
	try {
		const currentOutput = (
			await fs.readFile( CURRENT_OUTPUT_POINTER_PATH, 'utf8' )
		).trim();
		return (
			currentOutput.length > 0 &&
			path.resolve( currentOutput ) === path.resolve( OUTPUT_DIR )
		);
	} catch {
		return false;
	}
}

async function acquireProcessLock() {
	for ( let attempt = 0; attempt < 2; attempt++ ) {
		try {
			const handle = await fs.open( PROCESS_LOCK_PATH, 'wx' );
			await handle.writeFile(
				JSON.stringify( {
					pid: process.pid,
					startedAt: new Date().toISOString(),
					outputDir: OUTPUT_DIR,
				} ) + '\n'
			);
			await handle.close();
			processLockOwned = true;
			return;
		} catch ( error ) {
			if ( error.code !== 'EEXIST' ) {
				throw error;
			}
			const existing = await readJsonFile( PROCESS_LOCK_PATH );
			const existingPid = Number( existing?.pid );
			if ( Number.isInteger( existingPid ) && existingPid > 0 ) {
				try {
					process.kill( existingPid, 0 );
					throw new Error(
						`novelty monitor already owns ${ OUTPUT_DIR } with pid=${ existingPid }`
					);
				} catch ( processError ) {
					if ( processError.code !== 'ESRCH' ) {
						throw processError;
					}
				}
			}
			await fs.unlink( PROCESS_LOCK_PATH ).catch( () => {} );
		}
	}
	throw new Error(
		`could not acquire novelty monitor lock ${ PROCESS_LOCK_PATH }`
	);
}

async function releaseProcessLock() {
	if ( ! processLockOwned ) {
		return;
	}
	const existing = await readJsonFile( PROCESS_LOCK_PATH );
	if ( Number( existing?.pid ) === process.pid ) {
		await fs.unlink( PROCESS_LOCK_PATH ).catch( () => {} );
	}
	processLockOwned = false;
}

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
	await releaseProcessLock();
	process.exit( exitCode );
}

async function main() {
	if ( ! ( await currentOutputPointerMatches() ) ) {
		throw new Error(
			`refusing to start stale novelty monitor: pointer=${ CURRENT_OUTPUT_POINTER_PATH } output=${ OUTPUT_DIR }`
		);
	}
	await acquireProcessLock();
	try {
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
		const pointerHeartbeat = setInterval( () => {
			void currentOutputPointerMatches().then( ( matches ) => {
				if ( ! matches ) {
					void logFatalAndExit(
						`novelty monitor exiting because current output pointer no longer names this root: pointer=${ CURRENT_OUTPUT_POINTER_PATH } output=${ OUTPUT_DIR }`,
						0
					);
				}
			} );
		}, 5000 );
		pointerHeartbeat.unref?.();
		try {
			while ( ! shutdownRequested && Date.now() < END_AT ) {
				try {
					await runPass();
				} catch ( error ) {
					await log(
						`pass failed: ${ error.stack ?? error.message }`
					);
				}
				await sleep( INTERVAL_MS );
			}
		} finally {
			clearInterval( statusHeartbeat );
			clearInterval( pointerHeartbeat );
		}
		if ( shutdownRequested ) {
			await log( 'RTC novelty monitor exiting after signal shutdown.' );
		} else {
			await log(
				'RTC novelty monitor exiting after requested duration.'
			);
		}
	} finally {
		await releaseProcessLock();
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
		for ( const child of activeGateOnlyTriageChildren ) {
			terminateGateOnlyTriageChild( child, 'SIGTERM' );
		}
		process.exitCode = exitCodeForSignal( signal );
		void log( `RTC novelty monitor received ${ signal }; exiting.` );
	} );
}

main().catch( async ( error ) => {
	await log( error.stack ?? error.message );
	process.exitCode = 1;
} );
