#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin
mkdir -p "$TMUX_WRAP"
cat > "$TMUX_WRAP/tmux" <<'SH'
#!/usr/bin/env bash
exec /usr/bin/tmux -L rtc-fuzz "$@"
SH
chmod +x "$TMUX_WRAP/tmux"
export PATH="$TMUX_WRAP:$NODE_BIN:$PATH"

BASE=/media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515
SRC=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
mkdir -p "$BASE" "$BASE/repos" "$BASE/runs" "$BASE/logs" "$BASE/wp-env"

if [ -x /tmp/cleanup_rtc_focused_shards.sh ]; then
	/tmp/cleanup_rtc_focused_shards.sh || true
fi

profiles=(
	late-join-a
	late-join-b
	rich-text-b
	async-server-a
	async-server-b
	auth-locks-a
	auth-locks-b
	long-doc-b
	same-user-stale-tabs
)

for p in "${profiles[@]}"; do
	d="$BASE/repos/$p"
	rm -rf "$d"
	mkdir -p "$d"
	cp -al "$SRC/." "$d/"
done

RUN="$BASE/runs/focused-shards-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$RUN"
printf '%s\n' "$RUN" > "$BASE/current-run-root.txt"

node - "$RUN/supervisor-groups.json" "$BASE" <<'NODE'
const fs = require('fs');
const out = process.argv[2];
const base = process.argv[3];
const richSequence = [
	'ui-paste-paragraph',
	'ui-link-paragraph',
	'ui-list-indent',
	'ui-composition-paragraph',
	'ui-toolbar-format-paragraph',
	'ui-cut-copy-paragraph',
	'ui-table-cell-edit',
	'ui-undo-redo-paragraph',
].join(',');
const specs = [
	[
		'late-join-a',
		'three-user-late-join',
		7100001,
		16,
		{
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP: '1',
			GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
		},
	],
	[
		'late-join-b',
		'three-user-late-join',
		7110001,
		18,
		{
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP: '2',
			GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '4,10',
		},
	],
	[
		'late-join-c',
		'three-user-late-join',
		7120001,
		20,
		{
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP: '3',
			GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '7,14',
		},
	],
	[
		'revision-recovery-a',
		'revision-persistence',
		7200001,
		18,
		{
			GUTENBERG_RTC_BROWSER_ENABLE_REVISION_RESTORE_PROBE: '1',
			RTC_FUZZ_ENABLE_REVISION_RESTORE_PROBE: '1',
			GUTENBERG_RTC_BROWSER_AUTOSAVE_CHECKPOINT_COUNT: '2',
			GUTENBERG_RTC_BROWSER_FORCE_AUTOSAVE_STEPS: '4,12',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '3,8,13',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '5,11',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
		},
	],
	[
		'revision-recovery-b',
		'revision-persistence',
		7210001,
		22,
		{
			GUTENBERG_RTC_BROWSER_ENABLE_REVISION_RESTORE_PROBE: '1',
			RTC_FUZZ_ENABLE_REVISION_RESTORE_PROBE: '1',
			GUTENBERG_RTC_BROWSER_AUTOSAVE_CHECKPOINT_COUNT: '3',
			GUTENBERG_RTC_BROWSER_FORCE_AUTOSAVE_STEPS: '2,6,10,14',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '4,9,15,20',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '7,16',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
		},
	],
	[
		'rich-text-a',
		'real-user-editing',
		7300001,
		18,
		{
			GUTENBERG_RTC_BROWSER_REAL_USER_EDITING_SEQUENCE: richSequence,
			GUTENBERG_RTC_BROWSER_RELOAD_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_RELOAD_POST_ACTION_KIND: 'paragraph',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '8,16',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
		},
	],
	[
		'rich-text-b',
		'real-user-editing',
		7310001,
		18,
		{
			GUTENBERG_RTC_BROWSER_REAL_USER_EDITING_SEQUENCE: richSequence,
			GUTENBERG_RTC_BROWSER_RELOAD_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_RELOAD_POST_ACTION_KIND: 'format',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '9',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
		},
	],
	[
		'async-server-a',
		'async-server-blocks',
		7400001,
		24,
		{
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '2',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '6,12,18',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
		},
	],
	[
		'async-server-b',
		'async-server-blocks',
		7410001,
		28,
		{
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '2',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '10,20',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
		},
	],
	[
		'auth-locks-a',
		'permissions-auth-locks',
		7500001,
		16,
		{
			GUTENBERG_RTC_BROWSER_COLLABORATOR_ROLES: 'contributor',
			GUTENBERG_RTC_BROWSER_INCLUDE_AUTH_SYNC_FAILURES: '1',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
		},
	],
	[
		'auth-locks-b',
		'permissions-auth-locks',
		7510001,
		18,
		{
			GUTENBERG_RTC_BROWSER_COLLABORATOR_ROLES: 'contributor',
			GUTENBERG_RTC_BROWSER_INCLUDE_AUTH_SYNC_FAILURES: '1',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '5,12',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '9',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
		},
	],
	[
		'long-doc-a',
		'long-session-large-doc',
		7600001,
		48,
		{
			GUTENBERG_RTC_BROWSER_LARGE_DOCUMENT_BLOCKS: '96',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '3',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '3',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MAX_LIVE: '256',
			GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '1200000',
			RTC_FUZZ_RUN_TIMEOUT_MS: '1200000',
		},
	],
	[
		'long-doc-b',
		'long-session-large-doc',
		7610001,
		64,
		{
			GUTENBERG_RTC_BROWSER_LARGE_DOCUMENT_BLOCKS: '128',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '4',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '3',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MAX_LIVE: '320',
			GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '1500000',
			RTC_FUZZ_RUN_TIMEOUT_MS: '1500000',
		},
	],
	[
		'same-user-stale-tabs',
		'session-lifecycle',
		7700001,
		24,
		{
			GUTENBERG_RTC_BROWSER_COLLABORATOR_MODE: 'same-user',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '3',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '4,9,14,20',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '2',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
		},
	],
];
const enabledNames = new Set( [
	'late-join-a',
	'late-join-b',
	'rich-text-b',
	'async-server-a',
	'async-server-b',
	'auth-locks-a',
	'auth-locks-b',
	'long-doc-b',
	'same-user-stale-tabs',
] );
const groups = specs.filter(
	( [ name ] ) => enabledNames.has( name )
).map(
	( [ name, actionProfile, startSeed, stepCount, extraEnv ], i ) => {
		const port = 9700 + i * 4;
		const wsPort = 19400 + i;
		return {
			name: `focused-${ name }`,
			repoRoot: `${ base }/repos/${ name }`,
			transport: 'ws',
			lanes: 1,
			startSeed,
			stepCount,
			wsPort,
			env: {
				WP_ENV_HOME: `${ base }/wp-env/${ name }`,
				WP_ENV_PORT: String( port ),
				WP_ENV_TESTS_PORT: String( port + 1 ),
				RTC_FUZZ_BASE_URL: `http://localhost:${ port }`,
				RTC_FUZZ_ACTION_PROFILE: actionProfile,
				RTC_FUZZ_LOW_DISK_MODE: '1',
				RTC_FUZZ_PLAYWRIGHT_VIDEO: '',
				RTC_FUZZ_ANALYSIS_RECHECKS: '1',
				RTC_FUZZ_BOOTSTRAP_STALL_RECHECKS: '0',
				RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '120000',
				GUTENBERG_RTC_BROWSER_ACTION_PROFILE: actionProfile,
				GUTENBERG_RTC_BROWSER_DISCOVERY_TIMEOUT_MS: '120000',
				GUTENBERG_RTC_BROWSER_SOFT_DISCOVERY_BOOTSTRAP: '1',
				GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS:
					extraEnv.GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS ?? '900000',
				RTC_FUZZ_RUN_TIMEOUT_MS:
					extraEnv.RTC_FUZZ_RUN_TIMEOUT_MS ?? '900000',
				...extraEnv,
			},
		};
	}
);
fs.writeFileSync( out, JSON.stringify( groups, null, 2 ) + '\n' );
NODE

cd "$SRC"
node --check bin/rtc-browser-fuzz-supervisor.mjs
node --check bin/rtc-browser-fuzz-watchdog.mjs
node --check bin/rtc-browser-fuzz-live-analysis-monitor.mjs

if jq -e '.[].env | keys[] | select(test("DISABLE_(SYNC_FAULTS|PARSER_STRESS|REVISION_RESTORE|RELOAD|RANDOM_RELOAD)"))' "$RUN/supervisor-groups.json" >/tmp/focused-disable-found.txt; then
	echo "Unexpected disable flags in focused shards:" >&2
	cat /tmp/focused-disable-found.txt >&2
	exit 2
fi

{
	echo "# Focused RTC Shards"
	echo
	echo "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
	echo "Run root: $RUN"
	echo
	echo "Purpose: spend spare Jetstream2 CPU/RAM on isolated high-value coverage gaps without sharing the coverage-guided WordPress instance."
	echo
	jq -r '.[] | "- \(.name): profile=\(.env.GUTENBERG_RTC_BROWSER_ACTION_PROFILE), wp=\(.env.RTC_FUZZ_BASE_URL), ws=\(.wsPort), seed=\(.startSeed), steps=\(.stepCount)"' "$RUN/supervisor-groups.json"
	echo
	echo "Disable-flag audit: none of DISABLE_SYNC_FAULTS, DISABLE_PARSER_STRESS, DISABLE_REVISION_RESTORE, DISABLE_RELOAD, DISABLE_RANDOM_RELOAD present."
} > "$RUN/focused-shards.md"

tmux new-session -d -s rtc-focused-shards "bash -lc 'cd \"$SRC\"; export PATH=\"$TMUX_WRAP:$NODE_BIN:\$PATH\" CI=1 RTC_FUZZ_SUPERVISOR_OUTPUT_DIR=\"$RUN\" RTC_FUZZ_SUPERVISOR_GROUPS_PATH=\"$RUN/supervisor-groups.json\" RTC_FUZZ_SUPERVISOR_DURATION_HOURS=12 RTC_FUZZ_SUPERVISOR_POLL_MS=60000 RTC_FUZZ_INLINE_CODEX=0 RTC_FUZZ_SKIP_GLOBAL_POST_CLEANUP=1 RTC_FUZZ_LOW_DISK_MODE=1 RTC_FUZZ_PLAYWRIGHT_VIDEO=; node bin/rtc-browser-fuzz-supervisor.mjs >> \"$BASE/logs/supervisor.log\" 2>&1'"
tmux new-session -d -s rtc-focused-shards-watchdog "bash -lc 'cd \"$SRC\"; export PATH=\"$TMUX_WRAP:$NODE_BIN:\$PATH\" CI=1; RTC_FUZZ_WATCHDOG_REPO_ROOT=\"$SRC\" RTC_FUZZ_WATCHDOG_OUTPUT_DIR=\"$RUN\" RTC_FUZZ_WATCHDOG_GROUPS_PATH=\"$RUN/supervisor-groups.json\" RTC_FUZZ_WATCHDOG_SESSION=rtc-focused-shards RTC_FUZZ_WATCHDOG_DURATION_HOURS=12 RTC_FUZZ_WATCHDOG_POLL_MS=60000 RTC_FUZZ_WATCHDOG_STALE_MS=360000 node bin/rtc-browser-fuzz-watchdog.mjs >> \"$BASE/logs/watchdog.log\" 2>&1'"
tmux new-session -d -s rtc-focused-shards-analysis "bash -lc 'cd \"$SRC\"; export PATH=\"$TMUX_WRAP:$NODE_BIN:\$PATH\" CI=1; RTC_FUZZ_LIVE_ANALYSIS_REPO_ROOT=\"$SRC\" RTC_FUZZ_LIVE_ANALYSIS_INTERVAL_MS=120000 RTC_FUZZ_LIVE_ANALYSIS_MAX_PARALLEL=4 RTC_FUZZ_LIVE_ANALYSIS_MAX_ATTEMPTS=4 RTC_FUZZ_LIVE_ANALYSIS_CODEX_TIMEOUT_MS=2700000 RTC_FUZZ_LIVE_ANALYSIS_TMUX_PREFIX=rtc-focused-analysis RTC_FUZZ_LIVE_ANALYSIS_ENABLE_DEEP=1 RTC_FUZZ_LIVE_DEEP_ANALYSIS_MAX_PARALLEL=2 node bin/rtc-browser-fuzz-live-analysis-monitor.mjs \"$RUN\" >> \"$BASE/logs/analysis.log\" 2>&1'"

/tmp/start_rtc_focused_gap_codex_loop.sh 2>/dev/null || true

echo "RUN=$RUN"
tmux ls | grep -E 'rtc-focused|rtc-coverage-guided|rtc-fuzz-strict|strict-expansion-watchdog' || true
