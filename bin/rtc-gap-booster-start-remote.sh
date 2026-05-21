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

BASE=/media/volume/danluu-fuzz-data/rtc-gap-booster-20260515
STRICT_BASE=/media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515
HTTP_SRC=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
WS_SRC=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-ws-20260515/repo
mkdir -p "$BASE/runs" "$BASE/logs"

if [ -f "$HTTP_SRC/bin/rtc-optional-browser-admission-remote.sh" ]; then
	# shellcheck source=/dev/null
	source "$HTTP_SRC/bin/rtc-optional-browser-admission-remote.sh"
	rtc_optional_browser_admission gap-booster || exit 0
fi


tmux kill-session -t rtc-gap-booster 2>/dev/null || true
tmux kill-session -t rtc-gap-booster-watchdog 2>/dev/null || true
tmux kill-session -t rtc-gap-booster-analysis 2>/dev/null || true

required_manifests=(
	build/scripts/block-library/blocks-manifest.php
	build/scripts/edit-widgets/blocks/blocks-manifest.php
	build/scripts/widgets/blocks/blocks-manifest.php
)

has_required_manifests() {
	local repo=$1
	local manifest
	for manifest in "${required_manifests[@]}"; do
		[ -f "$repo/$manifest" ] || return 1
	done
}

copy_repo_tree() (
	local src=$1
	local dest=$2
	local item name

	shopt -s dotglob nullglob
	for item in "$src"/*; do
		name=${item##*/}
		case "$name" in
			artifacts)
				continue
				;;
		esac
		cp -al "$item" "$dest/"
	done
)

copy_repo_with_retry() {
	local src=$1
	local dest=$2
	local label=$3
	local attempt

	for attempt in 1 2 3; do
		rm -rf "$dest"
		mkdir -p "$dest"
		if copy_repo_tree "$src" "$dest"; then
			return 0
		fi
		printf '[%s] gap booster repo copy failed profile=%s attempt=%s; retrying\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$label" "$attempt" >&2
		sleep $(( attempt * 2 ))
	done

	printf 'gap booster repo copy failed after retries profile=%s source=%s dest=%s\n' "$label" "$src" "$dest" >&2
	return 1
}

RUN="$BASE/runs/gap-booster-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$RUN"
printf '%s\n' "$RUN" > "$BASE/current-run-root.txt"
REPOS_BASE="$BASE/repos-$(date -u +%Y%m%dT%H%M%SZ)-$$"
WP_ENV_BASE="$RUN/wp-env"
mkdir -p "$REPOS_BASE" "$WP_ENV_BASE"

strict_sources=(
	ws-real-user-editing
	ws-three-user-late-join
	ws-revision-persistence
)

for source in "${strict_sources[@]}"; do
	dest="$REPOS_BASE/$source"
	copy_repo_with_retry "$WS_SRC" "$dest" "$source"
	if [[ ! -d "$dest/build/scripts/block-editor" ]]; then
		rm -rf "$dest/build"
		cp -al "$HTTP_SRC/build" "$dest/build"
	fi
	if ! has_required_manifests "$dest"; then
		rm -rf "$dest/build"
		cp -al "$HTTP_SRC/build" "$dest/build"
	fi
	if ! has_required_manifests "$dest"; then
		printf 'gap booster repo is missing generated block manifests after copy: %s\n' "$dest" >&2
		exit 2
	fi
done

node - "$RUN/supervisor-groups.json" "$STRICT_BASE" "$HTTP_SRC" "$REPOS_BASE" "$WP_ENV_BASE" <<'NODE'
const fs = require('fs');
const out = process.argv[2];
const strictBase = process.argv[3];
const httpSrc = process.argv[4];
const reposBase = process.argv[5] || `${ strictBase }/repos`;
const wpEnvBase = process.argv[6] || `${ strictBase }/wp-env`;

function strictGroup({
	name,
	source,
	profile,
	startSeed,
	stepCount,
	lanes,
	port,
	wsPort,
	env = {},
}) {
	return {
		name,
		repoRoot: `${ reposBase }/${ source }`,
		transport: 'ws',
		fuzzLevel: 'browser-e2e',
		lanes,
		startSeed,
		stepCount,
		wsPort,
		env: {
			WP_ENV_HOME: `${ wpEnvBase }/${ source }`,
			WP_ENV_PORT: String(port),
			WP_ENV_TESTS_PORT: String(port + 1),
			RTC_FUZZ_BASE_URL: `http://localhost:${ port }`,
			...baseEnv(profile),
			...env,
		},
	};
}

function sharedCoverageGroup({
	name,
	profile,
	startSeed,
	stepCount,
	lanes,
	wsPort,
	env = {},
}) {
	return {
		name,
		repoRoot: httpSrc,
		transport: 'ws',
		fuzzLevel: 'browser-e2e',
		lanes,
		startSeed,
		stepCount,
		wsPort,
		env: {
			WP_ENV_PORT: '9540',
			RTC_FUZZ_BASE_URL: 'http://localhost:9540',
			...baseEnv(profile),
			...env,
		},
	};
}

function baseEnv(profile) {
	return {
		RTC_FUZZ_ACTION_PROFILE: profile,
		RTC_FUZZ_LOW_DISK_MODE: '1',
		RTC_FUZZ_PLAYWRIGHT_VIDEO: 'off',
		RTC_FUZZ_ANALYSIS_RECHECKS: '1',
		RTC_FUZZ_BOOTSTRAP_STALL_RECHECKS: '0',
		GUTENBERG_RTC_BROWSER_ACTION_PROFILE: profile,
		GUTENBERG_RTC_BROWSER_SOFT_DISCOVERY_BOOTSTRAP: '1',
		GUTENBERG_RTC_BROWSER_TEST_TIMEOUT_MS: '900000',
		RTC_FUZZ_RUN_TIMEOUT_MS: '900000',
		RTC_FUZZ_DISCOVERY_TIMEOUT_MS: '60000',
	};
}

const richSequence = [
	'ui-type-title',
	'ui-type-paragraph',
	'ui-paste-paragraph',
	'ui-format-paragraph',
	'ui-link-paragraph',
	'ui-list-indent',
	'ui-cut-copy-paragraph',
	'ui-toolbar-format-paragraph',
	'ui-undo-redo-paragraph',
	'ui-composition-paragraph',
].join(',');

let groups = [
	strictGroup({
		name: 'boost-real-user-title-rich-text',
		source: 'ws-real-user-editing',
		profile: 'real-user-editing',
		startSeed: 8100001,
		stepCount: 18,
		lanes: 3,
		port: 9500,
		wsPort: 19500,
		env: {
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '10,17',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '2,8,14',
			GUTENBERG_RTC_BROWSER_REAL_USER_EDITING_ACTION_LABELS: richSequence,
			GUTENBERG_RTC_BROWSER_REAL_USER_EDITING_SEQUENCE: richSequence,
			GUTENBERG_RTC_BROWSER_RELOAD_POST_ACTION: '1',
			GUTENBERG_RTC_BROWSER_RELOAD_POST_ACTION_KIND: 'title',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '2',
		},
	}),
	strictGroup({
		name: 'boost-same-user-stale-tabs',
		source: 'ws-same-user-lifecycle',
		profile: 'session-lifecycle',
		startSeed: 8200001,
		stepCount: 18,
		lanes: 2,
		port: 9504,
		wsPort: 19501,
		env: {
			GUTENBERG_RTC_BROWSER_COLLABORATOR_MODE: 'same-user',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '0',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '3,9,15',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '4,12',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '3',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '2',
		},
	}),
	strictGroup({
		name: 'boost-three-user-late-join',
		source: 'ws-three-user-late-join',
		profile: 'three-user-late-join',
		startSeed: 8300001,
		stepCount: 18,
		lanes: 3,
		port: 9508,
		wsPort: 19502,
		env: {
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS: '1',
			GUTENBERG_RTC_BROWSER_FORCE_LATE_JOIN_STEP: '2',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '8,15',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '4,11,16',
			GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION: '1',
		},
	}),
	strictGroup({
		name: 'boost-revision-autosave-recovery',
		source: 'ws-revision-persistence',
		profile: 'revision-persistence',
		startSeed: 8400001,
		stepCount: 24,
		lanes: 2,
		port: 9512,
		wsPort: 19503,
		env: {
			GUTENBERG_RTC_BROWSER_ENABLE_REVISION_RESTORE_PROBE: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FORCE_AUTOSAVE_STEPS: '2,6,10,14,18',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '7,16,22',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '4,9,15,20',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '4',
			RTC_FUZZ_ENABLE_REVISION_RESTORE_PROBE: '1',
		},
	}),
	strictGroup({
		name: 'boost-parser-reparse',
		source: 'ws-parser-transform',
		profile: 'parser-transform',
		startSeed: 8500001,
		stepCount: 16,
		lanes: 2,
		port: 9516,
		wsPort: 19504,
		env: {
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '8,15',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '6,12',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '2',
		},
	}),
	strictGroup({
		name: 'boost-block-gauntlet-async-ish',
		source: 'ws-block-gauntlet',
		profile: 'block-gauntlet',
		startSeed: 8600001,
		stepCount: 18,
		lanes: 3,
		port: 9524,
		wsPort: 19505,
		env: {
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '9,17',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '5,12',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '2',
		},
	}),
	strictGroup({
		name: 'boost-multi-reload-lifecycle',
		source: 'ws-multi-reload-lifecycle',
		profile: 'multi-reload-lifecycle',
		startSeed: 8700001,
		stepCount: 20,
		lanes: 2,
		port: 9532,
		wsPort: 19506,
		env: {
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '4,9,14,19',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '6,12,18',
			GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT: '3',
		},
	}),
	sharedCoverageGroup({
		name: 'boost-async-server-blocks-template-parts',
		profile: 'async-server-blocks',
		startSeed: 8800001,
		stepCount: 18,
		lanes: 2,
		wsPort: 19507,
		env: {
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '8,16',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '6,12',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '2',
		},
	}),
	sharedCoverageGroup({
		name: 'boost-permissions-auth-locks',
		profile: 'permissions-auth-locks',
		startSeed: 8900001,
		stepCount: 16,
		lanes: 2,
		wsPort: 19508,
		env: {
			GUTENBERG_RTC_BROWSER_COLLABORATOR_ROLES: 'contributor',
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '7,13',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '5,11',
			GUTENBERG_RTC_BROWSER_INCLUDE_AUTH_SYNC_FAILURES: '1',
		},
	}),
	sharedCoverageGroup({
		name: 'boost-long-session-large-doc',
		profile: 'long-session-large-doc',
		startSeed: 9000001,
		stepCount: 64,
		lanes: 2,
		wsPort: 19509,
		env: {
			GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS: '1',
			GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE: 'fail',
			GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS: '16,32,48,60',
			GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS: '12,24,36,52',
			GUTENBERG_RTC_BROWSER_LARGE_DOCUMENT_BLOCKS: '100',
			GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT: '3',
		},
	}),
];

const keepGroups = new Set( [
	'boost-real-user-title-rich-text',
	'boost-three-user-late-join',
	'boost-revision-autosave-recovery',
	'boost-async-server-blocks-template-parts',
	'boost-permissions-auth-locks',
	'boost-long-session-large-doc',
] );

groups = groups
	.filter( ( group ) => keepGroups.has( group.name ) )
	.map( ( group ) => ( { ...group, lanes: 1 } ) );

fs.writeFileSync(out, JSON.stringify(groups, null, 2) + '\n');
NODE

cd "$HTTP_SRC"
node --check bin/rtc-browser-fuzz-supervisor.mjs
node --check bin/rtc-browser-fuzz-watchdog.mjs
node --check bin/rtc-browser-fuzz-live-analysis-monitor.mjs

if jq -e '.[].env | keys[] | select(test("DISABLE_(SYNC_FAULTS|PARSER_STRESS|REVISION_RESTORE|RELOAD|RANDOM_RELOAD)"))' "$RUN/supervisor-groups.json" >/tmp/gap-booster-disable-found.txt; then
	echo "Unexpected disable flags in gap booster:" >&2
	cat /tmp/gap-booster-disable-found.txt >&2
	exit 2
fi

{
	echo "# RTC Gap Booster"
	echo
	echo "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
	echo "Run root: $RUN"
	echo
	echo "Purpose: add lanes against coverage gaps without starting more wp-env instances."
	echo
	jq -r '.[] | "- \(.name): profile=\(.env.GUTENBERG_RTC_BROWSER_ACTION_PROFILE), lanes=\(.lanes), steps=\(.stepCount), wp=\(.env.RTC_FUZZ_BASE_URL), ws=\(.wsPort)"' "$RUN/supervisor-groups.json"
	echo
	echo "Behavior disable flag audit: none of DISABLE_SYNC_FAULTS, DISABLE_PARSER_STRESS, DISABLE_REVISION_RESTORE, DISABLE_RELOAD, DISABLE_RANDOM_RELOAD present."
} > "$RUN/gap-booster.md"

tmux new-session -d -s rtc-gap-booster "bash -lc 'cd \"$HTTP_SRC\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\" CI=1 RTC_FUZZ_SUPERVISOR_OUTPUT_DIR=\"$RUN\" RTC_FUZZ_SUPERVISOR_GROUPS_PATH=\"$RUN/supervisor-groups.json\" RTC_FUZZ_SUPERVISOR_DURATION_HOURS=10 RTC_FUZZ_SUPERVISOR_POLL_MS=60000 RTC_FUZZ_INLINE_CODEX=0 RTC_FUZZ_SKIP_GLOBAL_POST_CLEANUP=1 RTC_FUZZ_LOW_DISK_MODE=1 RTC_FUZZ_PLAYWRIGHT_VIDEO=off; node bin/rtc-browser-fuzz-supervisor.mjs >> \"$BASE/logs/supervisor.log\" 2>&1'"
tmux new-session -d -s rtc-gap-booster-watchdog "bash -lc 'cd \"$HTTP_SRC\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\" CI=1; while true; do RTC_FUZZ_WATCHDOG_REPO_ROOT=\"$HTTP_SRC\" RTC_FUZZ_WATCHDOG_OUTPUT_DIR=\"$RUN\" RTC_FUZZ_WATCHDOG_GROUPS_PATH=\"$RUN/supervisor-groups.json\" RTC_FUZZ_WATCHDOG_SESSION=rtc-gap-booster RTC_FUZZ_WATCHDOG_DURATION_HOURS=10 RTC_FUZZ_WATCHDOG_POLL_MS=60000 RTC_FUZZ_WATCHDOG_STALE_MS=360000 node bin/rtc-browser-fuzz-watchdog.mjs >> \"$BASE/logs/watchdog.log\" 2>&1; code=\$?; printf \"WATCHDOG_EXIT:%s %s\\n\" \"\$code\" \"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\" >> \"$BASE/logs/watchdog.log\"; sleep 30; done'"
tmux new-session -d -s rtc-gap-booster-analysis "bash -lc 'cd \"$HTTP_SRC\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\" CI=1; RTC_FUZZ_LIVE_ANALYSIS_REPO_ROOT=\"$HTTP_SRC\" RTC_FUZZ_LIVE_ANALYSIS_INTERVAL_MS=120000 RTC_FUZZ_LIVE_ANALYSIS_MAX_PARALLEL=4 RTC_FUZZ_LIVE_ANALYSIS_MAX_ATTEMPTS=4 RTC_FUZZ_LIVE_ANALYSIS_CODEX_TIMEOUT_MS=2700000 node bin/rtc-browser-fuzz-live-analysis-monitor.mjs \"$RUN\" >> \"$BASE/logs/analysis.log\" 2>&1'"

echo "RUN=$RUN"
tmux ls | grep -E 'rtc-gap-booster|rtc-coverage-guided|rtc-fuzz-strict|rtc-focused' || true
