#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN_DIR=${HOME:-/home/exouser}/.local/bin
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin
mkdir -p "$TMUX_WRAP"
cat > "$TMUX_WRAP/tmux" <<'SH'
#!/usr/bin/env bash
exec /usr/bin/tmux -L rtc-fuzz "$@"
SH
chmod +x "$TMUX_WRAP/tmux"
export PATH="$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:$PATH"

BASE=/media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515
HTTP_SRC=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
WS_SRC=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-ws-20260515/repo
mkdir -p "$BASE" "$BASE/repos" "$BASE/runs" "$BASE/logs" "$BASE/wp-env"

if [ -f "$HTTP_SRC/bin/rtc-optional-browser-admission-remote.sh" ]; then
	# shellcheck source=/dev/null
	source "$HTTP_SRC/bin/rtc-optional-browser-admission-remote.sh"
	rtc_optional_browser_admission strict-expansion || exit 0
fi

tmux kill-session -t rtc-fuzz-strict-expansion 2>/dev/null || true
tmux kill-session -t rtc-fuzz-strict-expansion-watchdog 2>/dev/null || true
tmux kill-session -t rtc-fuzz-strict-expansion-analysis 2>/dev/null || true

profiles=(
	ws-real-user-editing
	ws-same-user-lifecycle
	ws-three-user-late-join
	ws-revision-persistence
	ws-parser-transform
	ws-parser-serialization
	ws-block-gauntlet
	ws-common-blocks
	ws-multi-reload-lifecycle
	http-persistence-probe
)
for idx in "${!profiles[@]}"; do
	p=${profiles[$idx]}
	d="$BASE/repos/$p"
	rm -rf "$d"
	mkdir -p "$d"
	if [[ $p == http-* ]]; then
		cp -al "$HTTP_SRC/." "$d/"
	else
		cp -al "$WS_SRC/." "$d/"
		if [[ ! -d "$d/build/scripts/block-editor" ]]; then
			rm -rf "$d/build"
			cp -al "$HTTP_SRC/build" "$d/build"
		fi
	fi
done

RUN="$BASE/runs/strict-expansion-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$RUN"
printf '%s\n' "$RUN" > "$BASE/current-run-root.txt"
node - "$RUN/supervisor-groups.json" "$BASE" <<'NODE'
const fs = require('fs');
const out = process.argv[2];
const base = process.argv[3];
const specs = [
	[
		'ws-real-user-editing',
		'ws',
		'real-user-editing',
		5100001,
		12,
		{
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '4',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '2',
			GUTENBERG_RTC_BROWSER_REAL_USER_EDITING_ACTION_LABELS:
				'ui-type-paragraph,ui-format-paragraph,ui-heading-shortcut,ui-type-title,ui-undo-redo-paragraph',
			GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE: 'shadow',
			GUTENBERG_RTC_BROWSER_RELOAD_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_RELOAD_POST_ACTION_KIND: 'paragraph',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
		},
	],
	[
		'ws-same-user-lifecycle',
		'ws',
		'session-lifecycle',
		5200001,
		10,
		{
			GUTENBERG_RTC_BROWSER_COLLABORATOR_MODE: 'same-user',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '0',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '1',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1',
		},
	],
	[
		'ws-three-user-late-join',
		'ws',
		'three-user-late-join',
		5300001,
		10,
		{
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP: '1',
			GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION: '1',
		},
	],
	[
		'ws-revision-persistence',
		'ws',
		'revision-persistence',
		5400001,
		10,
		{
			GUTENBERG_RTC_BROWSER_ENABLE_REVISION_RESTORE_PROBE: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '2',
			RTC_FUZZ_ENABLE_REVISION_RESTORE_PROBE: '1',
		},
	],
	[
		'ws-parser-transform',
		'ws',
		'parser-transform',
		5500001,
		10,
		{ GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1' },
	],
	[ 'ws-parser-serialization', 'ws', 'parser-serialization', 5600001, 10, {} ],
	[
		'ws-block-gauntlet',
		'ws',
		'block-gauntlet',
		5700001,
		10,
		{ GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '1' },
	],
	[ 'ws-common-blocks', 'ws', 'common-blocks', 5800001, 10, {} ],
	[
		'ws-multi-reload-lifecycle',
		'ws',
		'multi-reload-lifecycle',
		5900001,
		12,
		{
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '2',
		},
	],
	[
		'http-persistence-probe',
		'http',
		'persistence-no-title',
		6000001,
		10,
		{ GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail' },
	],
];
const groups = specs.map((spec, i) => {
	const [name, transport, actionProfile, startSeed, stepCount, extraEnv] = spec;
	const port = 9500 + i * 4;
	const wsPort = 19300 + i;
	return {
		name,
		repoRoot: `${base}/repos/${name}`,
		transport,
		fuzzLevel: 'browser-e2e',
		lanes: 1,
		startSeed,
		stepCount,
		...(transport === 'ws' ? { wsPort } : {}),
		env: {
			WP_ENV_HOME: `${base}/wp-env/${name}`,
			WP_ENV_PORT: String(port),
			WP_ENV_TESTS_PORT: String(port + 1),
			RTC_FUZZ_BASE_URL: `http://localhost:${port}`,
			RTC_FUZZ_ACTION_PROFILE: actionProfile,
			RTC_FUZZ_LOW_DISK_MODE: '1',
			RTC_FUZZ_PLAYWRIGHT_VIDEO: '',
			RTC_FUZZ_ANALYSIS_RECHECKS: '1',
			RTC_FUZZ_BOOTSTRAP_STALL_RECHECKS: '0',
			GUTENBERG_RTC_BROWSER_ACTION_PROFILE: actionProfile,
			GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '720000',
			RTC_FUZZ_RUN_TIMEOUT_MS: '720000',
			RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '60000',
			...extraEnv,
		},
	};
});
fs.writeFileSync(out, JSON.stringify(groups, null, 2) + '\n');
NODE

cd "$HTTP_SRC"
node --check bin/rtc-browser-fuzz-supervisor.mjs
node --check bin/rtc-browser-fuzz-watchdog.mjs
node --check bin/rtc-browser-fuzz-live-analysis-monitor.mjs

if jq -e '.[].env | keys[] | select(test("DISABLE_(SYNC_FAULTS|PARSER_STRESS|REVISION_RESTORE|RELOAD|RANDOM_RELOAD)"))' "$RUN/supervisor-groups.json" >/tmp/strict-disable-found.txt; then
	echo "Unexpected disable flags in strict expansion:" >&2
	cat /tmp/strict-disable-found.txt >&2
	exit 2
fi

{
	echo "# Strict Expansion Run"
	echo
	echo "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
	echo "Run root: $RUN"
	echo
	echo "Profiles enabled with previous disable/noise flags removed:"
	jq -r '.[] | "- \(.name): transport=\(.transport), profile=\(.env.GUTENBERG_RTC_BROWSER_ACTION_PROFILE), seed=\(.startSeed), repo=\(.repoRoot)"' "$RUN/supervisor-groups.json"
	echo
	echo "Behavior disable flag audit: none of DISABLE_SYNC_FAULTS, DISABLE_PARSER_STRESS, DISABLE_REVISION_RESTORE, DISABLE_RELOAD, DISABLE_RANDOM_RELOAD present."
} > "$RUN/strict-expansion.md"

tmux new-session -d -s rtc-fuzz-strict-expansion "bash -lc 'cd \"$HTTP_SRC\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\" CI=1 RTC_FUZZ_SUPERVISOR_OUTPUT_DIR=\"$RUN\" RTC_FUZZ_SUPERVISOR_GROUPS_PATH=\"$RUN/supervisor-groups.json\" RTC_FUZZ_SUPERVISOR_DURATION_HOURS=12 RTC_FUZZ_SUPERVISOR_POLL_MS=60000 RTC_FUZZ_INLINE_CODEX=0 RTC_FUZZ_SKIP_GLOBAL_POST_CLEANUP=1 RTC_FUZZ_LOW_DISK_MODE=1 RTC_FUZZ_PLAYWRIGHT_VIDEO=; node bin/rtc-browser-fuzz-supervisor.mjs >> \"$BASE/logs/supervisor.log\" 2>&1'"
tmux new-session -d -s rtc-fuzz-strict-expansion-watchdog "bash -lc 'cd \"$HTTP_SRC\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\" CI=1; RTC_FUZZ_WATCHDOG_REPO_ROOT=\"$HTTP_SRC\" RTC_FUZZ_WATCHDOG_OUTPUT_DIR=\"$RUN\" RTC_FUZZ_WATCHDOG_GROUPS_PATH=\"$RUN/supervisor-groups.json\" RTC_FUZZ_WATCHDOG_SESSION=rtc-fuzz-strict-expansion RTC_FUZZ_WATCHDOG_DURATION_HOURS=12 RTC_FUZZ_WATCHDOG_POLL_MS=60000 node bin/rtc-browser-fuzz-watchdog.mjs >> \"$BASE/logs/watchdog.log\" 2>&1'"
tmux new-session -d -s rtc-fuzz-strict-expansion-analysis "bash -lc 'cd \"$HTTP_SRC\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\" CI=1; RTC_FUZZ_LIVE_ANALYSIS_REPO_ROOT=\"$HTTP_SRC\" RTC_FUZZ_LIVE_ANALYSIS_INTERVAL_MS=120000 RTC_FUZZ_LIVE_ANALYSIS_MAX_PARALLEL=4 RTC_FUZZ_LIVE_ANALYSIS_MAX_ATTEMPTS=4 RTC_FUZZ_LIVE_ANALYSIS_CODEX_TIMEOUT_MS=2700000 node bin/rtc-browser-fuzz-live-analysis-monitor.mjs \"$RUN\" >> \"$BASE/logs/analysis.log\" 2>&1'"
echo "RUN=$RUN"
tmux ls | grep -E 'rtc-fuzz-strict|rtc-fuzz-iso|rtc-fuzz-feedback' || true
