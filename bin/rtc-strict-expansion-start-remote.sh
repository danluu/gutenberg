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

PORT_BASE=${RTC_STRICT_EXPANSION_PORT_BASE:-12800}
WS_PORT_BASE=${RTC_STRICT_EXPANSION_WS_PORT_BASE:-22800}

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

wait_for_required_manifests() {
	local repo=$1
	local label=$2
	local waited=0
	local interval=5
	local max_wait=180

	while ! has_required_manifests "$repo"; do
		if (( waited >= max_wait )); then
			return 1
		fi
		printf '[%s] waiting for generated block manifests label=%s repo=%s waited=%ss\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$label" "$repo" "$waited" >&2
		sleep "$interval"
		waited=$(( waited + interval ))
	done
}

if ! wait_for_required_manifests "$HTTP_SRC" source; then
	printf 'source repo is missing generated block manifests; run npm run build first: %s\n' "$HTTP_SRC" >&2
	exit 2
fi

exec 7>"$BASE/start.lock"
if ! flock -n 7; then
	printf '[%s] strict expansion start skipped; start/cleanup lock is held\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$BASE/logs/cleanup.log"
	exit 0
fi

cleanup_strict_wp_env() {
	local p pid cwd cmd strict_process compose_file compose_dir wp_env_dir
	local pids containers volumes networks
	local strict_profiles=(
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

	pids=$(
		pgrep -f 'bin/rtc-browser-fuzz-runner.mjs|collaboration-fuzz.spec.ts|wp-scripts test-playwright|@playwright/test/cli.js|packages/scripts/scripts/test-playwright.js|npm run wp-env-test|wp-env --config \.wp-env\.test\.json|docker compose .*rtc-fuzz-strict-expansion|docker-compose .*rtc-fuzz-strict-expansion' ||
			true
	)
	for pid in $pids; do
		[ "$pid" = "$$" ] && continue
		[ -d "/proc/$pid" ] || continue
		cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null || true)
		cmd=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null | cut -c1-320 || true)
		strict_process=0
		case "$cwd" in
			"$BASE"/repos* | "$BASE"/wp-env/* | "$BASE"/runs/*)
				strict_process=1
				;;
		esac
		case "$cmd" in
			*"$BASE"/repos* | *"$BASE"/wp-env/* | *"$BASE"/runs/*)
				strict_process=1
				;;
		esac
		if [ "$strict_process" -eq 1 ]; then
			printf '[%s] kill strict stale pid=%s cwd=%s cmd=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$pid" "$cwd" "$cmd" >> "$BASE/logs/cleanup.log"
			kill "$pid" 2>/dev/null || true
		fi
	done

	sleep 3

	for pid in $pids; do
		[ "$pid" = "$$" ] && continue
		[ -d "/proc/$pid" ] || continue
		cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null || true)
		cmd=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null | cut -c1-320 || true)
		strict_process=0
		case "$cwd" in
			"$BASE"/repos* | "$BASE"/wp-env/* | "$BASE"/runs/*)
				strict_process=1
				;;
		esac
		case "$cmd" in
			*"$BASE"/repos* | *"$BASE"/wp-env/* | *"$BASE"/runs/*)
				strict_process=1
				;;
		esac
		if [ "$strict_process" -eq 1 ]; then
			printf '[%s] kill -9 strict stale pid=%s cwd=%s cmd=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$pid" "$cwd" "$cmd" >> "$BASE/logs/cleanup.log"
			kill -9 "$pid" 2>/dev/null || true
		fi
	done

	for compose_file in "$BASE/wp-env"/*/wp-env-*/docker-compose.yml "$BASE"/runs/strict-expansion-*/wp-env/*/wp-env-*/docker-compose.yml; do
		[ -f "$compose_file" ] || continue
		compose_dir=${compose_file%/docker-compose.yml}
		printf '[%s] compose down strict wp-env dir=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$compose_dir" >> "$BASE/logs/cleanup.log"
		docker compose -f "$compose_file" down -v --remove-orphans >> "$BASE/logs/cleanup.log" 2>&1 || true
	done

	for p in "${strict_profiles[@]}"; do
		mapfile -t containers < <( docker ps -aq --filter "name=wp-env-${p}" 2>/dev/null || true )
		if [ "${#containers[@]}" -gt 0 ]; then
			printf '[%s] remove strict wp-env containers profile=%s count=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$p" "${#containers[@]}" >> "$BASE/logs/cleanup.log"
			docker rm -f "${containers[@]}" >> "$BASE/logs/cleanup.log" 2>&1 || true
		fi

		mapfile -t volumes < <( docker volume ls -q 2>/dev/null | grep -E "^wp-env-${p}" || true )
		if [ "${#volumes[@]}" -gt 0 ]; then
			printf '[%s] remove strict wp-env volumes profile=%s count=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$p" "${#volumes[@]}" >> "$BASE/logs/cleanup.log"
			docker volume rm -f "${volumes[@]}" >> "$BASE/logs/cleanup.log" 2>&1 || true
		fi

		mapfile -t networks < <( docker network ls --format '{{.Name}}' 2>/dev/null | grep -E "^wp-env-${p}" || true )
		if [ "${#networks[@]}" -gt 0 ]; then
			printf '[%s] remove strict wp-env networks profile=%s count=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$p" "${#networks[@]}" >> "$BASE/logs/cleanup.log"
			docker network rm "${networks[@]}" >> "$BASE/logs/cleanup.log" 2>&1 || true
		fi

		for wp_env_dir in "$BASE/wp-env/$p" "$BASE"/runs/*/wp-env/"$p"; do
			[ -d "$wp_env_dir" ] || continue
			printf '[%s] remove strict wp-env home profile=%s path=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$p" "$wp_env_dir" >> "$BASE/logs/cleanup.log"
			chmod -R u+rwX "$wp_env_dir" >> "$BASE/logs/cleanup.log" 2>&1 || true
			rm -rf "$wp_env_dir" >> "$BASE/logs/cleanup.log" 2>&1 ||
				sudo rm -rf "$wp_env_dir" >> "$BASE/logs/cleanup.log" 2>&1 ||
				true
		done
	done
}

tmux kill-session -t rtc-fuzz-strict-expansion 2>/dev/null || true
tmux kill-session -t rtc-fuzz-strict-expansion-watchdog 2>/dev/null || true
tmux kill-session -t rtc-fuzz-strict-expansion-analysis 2>/dev/null || true
cleanup_strict_wp_env

REPOS_BASE="$BASE/repos-$(date -u +%Y%m%dT%H%M%SZ)-$$"
mkdir -p "$REPOS_BASE"

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
		printf '[%s] strict expansion repo copy failed profile=%s attempt=%s; retrying\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$label" "$attempt" >&2
		sleep $(( attempt * 2 ))
	done

	printf 'strict expansion repo copy failed after retries profile=%s source=%s dest=%s\n' "$label" "$src" "$dest" >&2
	return 1
}

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
	if [[ $p == http-* ]]; then
		d="$REPOS_BASE/$p"
		copy_repo_with_retry "$HTTP_SRC" "$d" "$p"
	else
		d="$REPOS_BASE/$p"
		copy_repo_with_retry "$WS_SRC" "$d" "$p"
		if [[ ! -d "$d/build/scripts/block-editor" ]]; then
			rm -rf "$d/build"
			cp -al "$HTTP_SRC/build" "$d/build"
		fi
	fi
	if ! has_required_manifests "$d"; then
		rm -rf "$d/build"
		cp -al "$HTTP_SRC/build" "$d/build"
	fi
	if ! has_required_manifests "$d"; then
		printf 'strict expansion repo is missing generated block manifests after copy: %s\n' "$d" >&2
		exit 2
	fi
done

RUN="$BASE/runs/strict-expansion-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$RUN"
WP_ENV_BASE=${RTC_STRICT_EXPANSION_WP_ENV_BASE:-$RUN/wp-env}
mkdir -p "$WP_ENV_BASE"
node - "$RUN/supervisor-groups.json" "$BASE" "$REPOS_BASE" "$WP_ENV_BASE" "$PORT_BASE" "$WS_PORT_BASE" <<'NODE'
const fs = require('fs');
const out = process.argv[2];
const base = process.argv[3];
const reposBase = process.argv[4] || `${base}/repos`;
const wpEnvBase = process.argv[5] || `${base}/wp-env`;
const portBase = Number.parseInt(process.argv[6] || '9500', 10);
const wsPortBase = Number.parseInt(process.argv[7] || '19300', 10);
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
	const port = portBase + i * 4;
	const wsPort = wsPortBase + i;
	return {
		name,
		repoRoot: `${reposBase}/${name}`,
		transport,
		fuzzLevel: 'browser-e2e',
		lanes: 1,
		startSeed,
		stepCount,
		...(transport === 'ws' ? { wsPort } : {}),
		env: {
			WP_ENV_HOME: `${wpEnvBase}/${name}`,
			WP_ENV_PORT: String(port),
			WP_ENV_TESTS_PORT: String(port + 1),
			RTC_FUZZ_BASE_URL: `http://localhost:${port}`,
			RTC_FUZZ_ACTION_PROFILE: actionProfile,
			RTC_FUZZ_LOW_DISK_MODE: '1',
			RTC_FUZZ_PLAYWRIGHT_VIDEO: '',
			RTC_FUZZ_ANALYSIS_RECHECKS: '1',
			RTC_FUZZ_BOOTSTRAP_STALL_RECHECKS: '0',
			GUTENBERG_RTC_BROWSER_ACTION_PROFILE: actionProfile,
			GUTENBERG_RTC_BROWSER_SOFT_DISCOVERY_BOOTSTRAP: '1',
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
tmux new-session -d -s rtc-fuzz-strict-expansion-watchdog "bash -lc 'cd \"$HTTP_SRC\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\" CI=1; while true; do RTC_FUZZ_WATCHDOG_REPO_ROOT=\"$HTTP_SRC\" RTC_FUZZ_WATCHDOG_OUTPUT_DIR=\"$RUN\" RTC_FUZZ_WATCHDOG_GROUPS_PATH=\"$RUN/supervisor-groups.json\" RTC_FUZZ_WATCHDOG_SESSION=rtc-fuzz-strict-expansion RTC_FUZZ_WATCHDOG_DURATION_HOURS=12 RTC_FUZZ_WATCHDOG_POLL_MS=60000 node bin/rtc-browser-fuzz-watchdog.mjs >> \"$BASE/logs/watchdog.log\" 2>&1; code=\$?; printf \"WATCHDOG_EXIT:%s %s\\n\" \"\$code\" \"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\" >> \"$BASE/logs/watchdog.log\"; sleep 30; done'"
tmux new-session -d -s rtc-fuzz-strict-expansion-analysis "bash -lc 'cd \"$HTTP_SRC\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\" CI=1; RTC_FUZZ_LIVE_ANALYSIS_REPO_ROOT=\"$HTTP_SRC\" RTC_FUZZ_LIVE_ANALYSIS_INTERVAL_MS=120000 RTC_FUZZ_LIVE_ANALYSIS_MAX_PARALLEL=4 RTC_FUZZ_LIVE_ANALYSIS_MAX_ATTEMPTS=4 RTC_FUZZ_LIVE_ANALYSIS_CODEX_TIMEOUT_MS=2700000 node bin/rtc-browser-fuzz-live-analysis-monitor.mjs \"$RUN\" >> \"$BASE/logs/analysis.log\" 2>&1'"
printf '%s\n' "$RUN" > "$BASE/current-run-root.txt"
echo "RUN=$RUN"
tmux ls | grep -E 'rtc-fuzz-strict|rtc-fuzz-iso|rtc-fuzz-feedback' || true
