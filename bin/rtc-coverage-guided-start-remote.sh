#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN_DIR=${HOME:-/home/exouser}/.local/bin
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-core-wrapper/bin
REPO=/media/volume/danluu-fuzz-data/rtc-all-merged-fuzz-20260526T195420Z/repo
HARNESS_REPO=${RTC_COVERAGE_HARNESS_REPO:-/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo}
CANDIDATE_REF=${RTC_COVERAGE_CANDIDATE_REF:-refs/heads/js2/all-merged-rebased-20260701}
CLEANUP_SCRIPT=${RTC_COVERAGE_GUIDED_CLEANUP_SCRIPT:-/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo/bin/rtc-coverage-guided-cleanup-remote.sh}
BASE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515
PRODUCT_REPO=$BASE/candidate-source
CUMULATIVE_ROOTS_FILE="$BASE/cumulative-observed-roots.txt"
START_LOCK="$BASE/start-v2.lock"
MAX_OBSERVED_ROOTS=${RTC_FUZZ_NOVELTY_MAX_OBSERVED_ROOTS:-20}
mkdir -p "$TMUX_WRAP" "$BASE/logs"
exec 8>"$START_LOCK"
flock 8
BUDGET_ENV=${RTC_RESOURCE_BUDGET_ENV:-/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516/current-budget.env}
BUDGET_ENV_SNAPSHOT=$(mktemp "$BASE/logs/resource-budget-start.XXXXXX.env")
trap 'rm -f "$BUDGET_ENV_SNAPSHOT"' EXIT
if [ -f "$BUDGET_ENV" ]; then
	cp "$BUDGET_ENV" "$BUDGET_ENV_SNAPSHOT"
else
	: > "$BUDGET_ENV_SNAPSHOT"
fi
cat > "$TMUX_WRAP/tmux" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
socket=${RTC_TMUX_SOCKET:-rtc-fuzz}
case "${1:-}" in
	capture-pane)
		if [ "$socket" = rtc-fuzz ]; then
			printf 'capture-pane is disabled on the RTC core tmux socket\n' >&2
			exit 1
		fi
		exec flock -w 30 "/tmp/rtc-tmux-${UID}-${socket}.client.lock" /usr/bin/tmux -L "$socket" "$@"
		;;
	display-message|has-session|list-*|show-*)
		exec flock -w 30 "/tmp/rtc-tmux-${UID}-${socket}.client.lock" /usr/bin/tmux -L "$socket" "$@"
		;;
esac
exec /usr/bin/tmux -L "$socket" "$@"
SH
chmod +x "$TMUX_WRAP/tmux"
export PATH="$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:$PATH"
export RTC_FUZZ_LOW_DISK_MODE="${RTC_FUZZ_LOW_DISK_MODE:-1}"

NOVELTY_POLICY_CHECK=$HARNESS_REPO/bin/rtc-browser-fuzz-novelty-policy-check.mjs
NOVELTY_MONITOR_SOURCE=$HARNESS_REPO/bin/rtc-browser-fuzz-novelty-monitor.mjs
if [ ! -f "$NOVELTY_POLICY_CHECK" ] ||
	! "$NODE_BIN/node" "$NOVELTY_POLICY_CHECK" "$NOVELTY_MONITOR_SOURCE" >> "$BASE/logs/start.log" 2>&1; then
	printf '[%s] refusing coverage start: novelty monitor does not satisfy the hard supervisor budget policy source=%s checker=%s\n' \
		"$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$NOVELTY_MONITOR_SOURCE" "$NOVELTY_POLICY_CHECK" >> "$BASE/logs/start.log"
	exit 1
fi

positive_integer_or_default() {
	local value=$1
	local fallback=$2
	case "$value" in
		''|*[!0-9]*)
			printf '%s\n' "$fallback"
			return
			;;
	esac
	if [ "$value" -gt 0 ]; then
		printf '%s\n' "$value"
	else
		printf '%s\n' "$fallback"
	fi
}

state_compatibility_sha256() {
	local harness_root=$1 product_root=$2 relative source
	{
		for relative in \
			bin/rtc-browser-fuzz-runner.mjs \
			bin/rtc-browser-fuzz-supervisor.mjs
		do
			source=$harness_root/$relative
			if [ -f "$source" ]; then
				printf '%s\t%s\n' "$relative" "$(sha256sum "$source" | awk '{ print $1 }')"
			else
				printf '%s\tmissing\n' "$relative"
			fi
		done
		for relative in \
			test/e2e/specs/editor/collaboration/collaboration-human-smoke.spec.ts \
			test/e2e/specs/editor/collaboration/collaboration-fuzz.spec.ts
		do
			source=$product_root/$relative
			if [ -f "$source" ]; then
				printf '%s\t%s\n' "$relative" "$(sha256sum "$source" | awk '{ print $1 }')"
			else
				printf '%s\tmissing\n' "$relative"
			fi
		done
	} | sha256sum | awk '{ print $1 }'
}

terminate_previous_coverage_processes() {
	local previous=$1 pid
	local pids=()
	[ -n "$previous" ] && [ -d "$previous" ] || return 0
	mapfile -t pids < <(
		ps -eo pid=,comm=,args= |
			awk -v root="$previous" '
				index($0, root) == 0 { next }
				$2 == "node" && $0 ~ /(rtc-browser-fuzz-(runner|supervisor|novelty-monitor)|wp-env start|playwright)/ { print $1; next }
				$2 ~ /^docker(-compose)?$/ { print $1; next }
				$2 == "bash" && $0 ~ /(run-monitor[.]sh|run-live-analysis[.]sh)/ { print $1 }
			'
	)
	for pid in "${pids[@]}"; do
		[ -n "$pid" ] && [ "$pid" != "$$" ] || continue
		printf '[%s] stopping stale process from previous coverage root pid=%s root=%s\n' \
			"$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$pid" "$previous" >> "$BASE/logs/start.log"
		kill -TERM "$pid" 2>/dev/null || true
	done
	[ "${#pids[@]}" -eq 0 ] || sleep 2
	for pid in "${pids[@]}"; do
		[ -n "$pid" ] && [ "$pid" != "$$" ] || continue
		kill -KILL "$pid" 2>/dev/null || true
	done
}

copy_harness_overlay_path() {
	local relative=$1 source_root=${2:-$REPO} source destination
	source=$source_root/$relative
	destination=$PRODUCT_REPO/$relative
	[ -e "$source" ] || return 0
	mkdir -p "$(dirname "$destination")"
	if [ -d "$source" ]; then
		mkdir -p "$destination"
		rsync -a "$source"/ "$destination"/
	else
		cp -a "$source" "$destination"
	fi
	printf '%s\n' "$relative" >> "$OUT/harness-overlay-paths.txt"
}

prepare_exact_candidate_source() {
	local path existing_head
	[ -n "$CURRENT_REPO_HEAD" ] || {
		printf 'cannot prepare exact candidate source without a Git head\n' >&2
		return 1
	}

	existing_head=$(git -C "$PRODUCT_REPO" rev-parse HEAD 2>/dev/null || true)
	if [ "$existing_head" != "$CURRENT_REPO_HEAD" ]; then
		git -C "$REPO" worktree remove --force "$PRODUCT_REPO" >/dev/null 2>&1 || true
		rm -rf "$PRODUCT_REPO"
		git -C "$REPO" worktree prune >/dev/null 2>&1 || true
		git -C "$REPO" worktree add --detach "$PRODUCT_REPO" "$CURRENT_REPO_HEAD" \
			> "$OUT/candidate-worktree.log" 2>&1
	else
		printf 'reused exact candidate worktree head=%s\n' "$existing_head" \
			> "$OUT/candidate-worktree.log"
	fi

	: > "$OUT/harness-overlay-paths.txt"
	shopt -s nullglob
	for path in "$HARNESS_REPO"/bin/rtc-*; do
		copy_harness_overlay_path "${path#"$HARNESS_REPO"/}" "$HARNESS_REPO"
	done
	shopt -u nullglob
	for path in \
		bin/packages/build-vendors.mjs \
		.wp-env.test.json \
		packages/env/lib/runtime/docker/build-docker-compose-config.js \
		test/e2e/config/global-setup.ts \
		test/e2e/config/rtc-websocket-setup.ts \
		test/e2e/specs/editor/collaboration \
		packages/e2e-tests/plugins/rtc-websocket-provider
	do
		copy_harness_overlay_path "$path"
	done

	if [ "$(cat "$PRODUCT_REPO/.js2-candidate-deps-head" 2>/dev/null || true)" != "$CURRENT_REPO_HEAD" ] ||
		[ ! -x "$PRODUCT_REPO/node_modules/.bin/wp-build" ]; then
		rm -rf "$PRODUCT_REPO/node_modules"
		(
			cd "$PRODUCT_REPO"
			npm ci
		) > "$OUT/candidate-dependencies.log" 2>&1
		printf '%s\n' "$CURRENT_REPO_HEAD" > "$PRODUCT_REPO/.js2-candidate-deps-head"
	else
		printf 'reused exact candidate dependencies head=%s\n' "$CURRENT_REPO_HEAD" \
			> "$OUT/candidate-dependencies.log"
	fi

	for path in vendor build; do
		if [ -e "$REPO/$path" ] && [ ! -e "$PRODUCT_REPO/$path" ]; then
			ln -s "$REPO/$path" "$PRODUCT_REPO/$path"
			printf '%s\n' "$path (dependency symlink)" >> "$OUT/harness-overlay-paths.txt"
		fi
	done

	if [ ! -s "$PRODUCT_REPO/packages/e2e-test-utils-playwright/build/index.js" ] ||
		[ ! -d "$PRODUCT_REPO/build/scripts" ]; then
		printf '[%s] building exact candidate source head=%s\n' \
			"$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$CURRENT_REPO_HEAD" \
			> "$OUT/candidate-build.log"
		(
			cd "$PRODUCT_REPO"
			npm run build -- --skip-types
		) >> "$OUT/candidate-build.log" 2>&1
	else
		printf 'reused exact candidate build head=%s\n' "$CURRENT_REPO_HEAD" \
			> "$OUT/candidate-build.log"
	fi

	git -C "$REPO" status --porcelain=v1 -uall > "$OUT/control-repo-status.txt"
	git -C "$PRODUCT_REPO" status --porcelain=v1 -uall > "$OUT/candidate-source-status.txt"
	{
		printf 'mode\texact-candidate-plus-harness-overlay\n'
		printf 'candidate_head\t%s\n' "$CURRENT_REPO_HEAD"
		printf 'candidate_tree\t%s\n' "$(git -C "$PRODUCT_REPO" rev-parse HEAD^{tree})"
		printf 'candidate_branch\t%s\n' "$CURRENT_REPO_BRANCH"
		printf 'product_repo\t%s\n' "$PRODUCT_REPO"
		printf 'control_repo\t%s\n' "$REPO"
		printf 'harness_repo\t%s\n' "$HARNESS_REPO"
		printf 'monitor_repo\t%s\n' "$PRODUCT_REPO"
		printf 'novelty_monitor_sha256\t%s\n' "$(sha256sum "$PRODUCT_REPO/bin/rtc-browser-fuzz-novelty-monitor.mjs" | awk '{ print $1 }')"
		printf 'live_analysis_monitor_sha256\t%s\n' "$(sha256sum "$PRODUCT_REPO/bin/rtc-browser-fuzz-live-analysis-monitor.mjs" | awk '{ print $1 }')"
		printf 'runner_sha256\t%s\n' "$(sha256sum "$PRODUCT_REPO/bin/rtc-browser-fuzz-runner.mjs" | awk '{ print $1 }')"
		printf 'supervisor_sha256\t%s\n' "$(sha256sum "$PRODUCT_REPO/bin/rtc-browser-fuzz-supervisor.mjs" | awk '{ print $1 }')"
		printf 'triage_watcher_sha256\t%s\n' "$(sha256sum "$PRODUCT_REPO/bin/rtc-browser-fuzz-triage-watcher.mjs" | awk '{ print $1 }')"
		printf 'state_compatibility_sha256\t%s\n' "$(state_compatibility_sha256 "$PRODUCT_REPO" "$PRODUCT_REPO")"
		printf 'resource_budget_at_start_sha256\t%s\n' "$(sha256sum "$OUT/resource-budget-at-start.env" | awk '{ print $1 }')"
		printf 'resource_budget_source\t%s\n' "$(cat "$OUT/resource-budget-source.txt")"
		printf 'control_dirty_paths\t%s\n' "$(wc -l < "$OUT/control-repo-status.txt" | tr -d ' ')"
		printf 'overlay_paths\t%s\n' "$(wc -l < "$OUT/harness-overlay-paths.txt" | tr -d ' ')"
	} > "$OUT/source-manifest.tsv"
}

SHARED_GUTENBERG_BUILD=${RTC_SHARED_GUTENBERG_BUILD:-/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/gutenberg/build}
if [ ! -e "$REPO/build/scripts/block-library" ] && [ -e "$SHARED_GUTENBERG_BUILD/scripts/block-library" ]; then
	mkdir -p "$REPO/build"
	ln -sfn "$SHARED_GUTENBERG_BUILD/scripts" "$REPO/build/scripts"
	printf '[%s] linked shared Gutenberg build scripts from %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$SHARED_GUTENBERG_BUILD/scripts" >> "$BASE/logs/start.log"
fi
STRICT=$(cat /media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515/current-run-root.txt 2>/dev/null || true)
ISO_HTTP=$(cat /media/volume/danluu-fuzz-data/rtc-fuzz-validation-isolated-20260515/current-http-run-root.txt 2>/dev/null || true)
ISO_WS=$(cat /media/volume/danluu-fuzz-data/rtc-fuzz-validation-isolated-20260515/current-ws-run-root.txt 2>/dev/null || true)
FOCUSED=$(cat /media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515/current-run-root.txt 2>/dev/null || true)
GAP_BOOSTER=$(cat /media/volume/danluu-fuzz-data/rtc-gap-booster-20260515/current-run-root.txt 2>/dev/null || true)
PREVIOUS_COVERAGE=$(cat "$BASE/current-output-dir.txt" 2>/dev/null || true)
DISABLE_STATE_CARRYOVER=${RTC_FUZZ_NOVELTY_DISABLE_STATE_CARRYOVER:-0}
CURRENT_REPO_HEAD=$(git -C "$REPO" rev-parse "$CANDIDATE_REF" 2>/dev/null || true)
CURRENT_REPO_BRANCH=${CANDIDATE_REF#refs/heads/}
PREVIOUS_COVERAGE_HEAD=
PREVIOUS_COVERAGE_AGE_SECONDS=999999
PREVIOUS_STATE_COMPATIBILITY_SHA256=
CURRENT_STATE_COMPATIBILITY_SHA256=$(state_compatibility_sha256 "$HARNESS_REPO" "$REPO")
STATE_COMPATIBILITY_CHANGED=0
FORCE_RESTART=${RTC_COVERAGE_FORCE_RESTART:-0}
SAME_HEAD_REATTACH_MAX_AGE_SECONDS=${RTC_COVERAGE_SAME_HEAD_REATTACH_MAX_AGE_SECONDS:-46800}
if [ -n "$PREVIOUS_COVERAGE" ]; then
	if [ -f "$PREVIOUS_COVERAGE/source-head.txt" ]; then
		PREVIOUS_COVERAGE_HEAD=$(sed -n '1p' "$PREVIOUS_COVERAGE/source-head.txt" 2>/dev/null || true)
	elif [ -d "$PREVIOUS_COVERAGE/repos" ]; then
		previous_repo=$(find "$PREVIOUS_COVERAGE/repos" -mindepth 1 -maxdepth 1 -type d -print -quit 2>/dev/null || true)
		if [ -n "$previous_repo" ]; then
			PREVIOUS_COVERAGE_HEAD=$(git -C "$previous_repo" rev-parse HEAD 2>/dev/null || true)
		fi
	fi
	if [ -f "$BASE/current-output-dir.txt" ]; then
		pointer_mtime=$(stat -c %Y "$BASE/current-output-dir.txt" 2>/dev/null || printf 0)
		PREVIOUS_COVERAGE_AGE_SECONDS=$(( $(date -u +%s) - pointer_mtime ))
	fi
	if [ -s "$PREVIOUS_COVERAGE/source-manifest.tsv" ]; then
		PREVIOUS_STATE_COMPATIBILITY_SHA256=$(awk -F '\t' '$1 == "state_compatibility_sha256" { print $2; exit }' "$PREVIOUS_COVERAGE/source-manifest.tsv")
	fi
fi
if [ -n "$PREVIOUS_STATE_COMPATIBILITY_SHA256" ] &&
	[ "$PREVIOUS_STATE_COMPATIBILITY_SHA256" != "$CURRENT_STATE_COMPATIBILITY_SHA256" ]; then
	STATE_COMPATIBILITY_CHANGED=1
elif [ "$FORCE_RESTART" = 1 ] &&
	[ -n "$PREVIOUS_COVERAGE" ] &&
	[ -z "$PREVIOUS_STATE_COMPATIBILITY_SHA256" ]; then
	STATE_COMPATIBILITY_CHANGED=1
fi
if [ "$FORCE_RESTART" != "1" ] &&
	[ "$STATE_COMPATIBILITY_CHANGED" != 1 ] &&
	[ -n "$PREVIOUS_COVERAGE" ] &&
	[ -d "$PREVIOUS_COVERAGE" ] &&
	[ -x "$PREVIOUS_COVERAGE/run-monitor.sh" ] &&
	[ -n "$CURRENT_REPO_HEAD" ] &&
	[ "$CURRENT_REPO_HEAD" = "$PREVIOUS_COVERAGE_HEAD" ] &&
	[ "$PREVIOUS_COVERAGE_AGE_SECONDS" -ge 0 ] &&
	[ "$PREVIOUS_COVERAGE_AGE_SECONDS" -lt "$SAME_HEAD_REATTACH_MAX_AGE_SECONDS" ]; then
	printf '[%s] same-head current root preserved for reattach at %s head=%s age=%ss; set RTC_COVERAGE_FORCE_RESTART=1 for a deliberate replacement\n' \
		"$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$PREVIOUS_COVERAGE" "$CURRENT_REPO_HEAD" "$PREVIOUS_COVERAGE_AGE_SECONDS" >> "$BASE/logs/start.log"
	printf 'OUT=%s\n' "$PREVIOUS_COVERAGE"
	exit 0
fi
# Force is a one-shot admission decision for this launcher. Never leak it into
# long-lived monitor, watchdog, or controller processes.
export RTC_COVERAGE_FORCE_RESTART=0
CARRYOVER_DISABLED_REASON=
INCLUDE_HISTORICAL_ROOTS=1
if [ "$DISABLE_STATE_CARRYOVER" = "1" ]; then
	INCLUDE_HISTORICAL_ROOTS=0
fi
if [ "$DISABLE_STATE_CARRYOVER" != "1" ] &&
	[ -n "$CURRENT_REPO_HEAD" ] &&
	[ -n "$PREVIOUS_COVERAGE_HEAD" ] &&
	[ "$CURRENT_REPO_HEAD" != "$PREVIOUS_COVERAGE_HEAD" ]; then
	DISABLE_STATE_CARRYOVER=1
	INCLUDE_HISTORICAL_ROOTS=0
	CARRYOVER_DISABLED_REASON="source head changed from $PREVIOUS_COVERAGE_HEAD to $CURRENT_REPO_HEAD"
fi
if [ "$DISABLE_STATE_CARRYOVER" != "1" ] &&
	[ "$STATE_COMPATIBILITY_CHANGED" = 1 ]; then
	DISABLE_STATE_CARRYOVER=1
	# Historical roots remain useful for aggregate coverage, but scheduler and
	# product-gate state from the old evidence contract must not be copied.
	INCLUDE_HISTORICAL_ROOTS=1
	CARRYOVER_DISABLED_REASON="state compatibility changed from ${PREVIOUS_STATE_COMPATIBILITY_SHA256:-missing} to $CURRENT_STATE_COMPATIBILITY_SHA256"
fi
OUT=$BASE/run-$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$OUT"
cp "$BUDGET_ENV_SNAPSHOT" "$OUT/resource-budget-at-start.env"
if [ "${RTC_FUZZ_NOVELTY_PREFER_EXPLICIT_BUDGET:-0}" = 1 ]; then
	printf 'explicit-environment\n' > "$OUT/resource-budget-source.txt"
else
	printf 'start-lock-snapshot\n' > "$OUT/resource-budget-source.txt"
fi
printf '%s\n' "$CURRENT_REPO_HEAD" > "$OUT/source-head.txt"
printf '%s\n' "$CURRENT_REPO_BRANCH" > "$OUT/source-branch.txt"
if [ -x "$CLEANUP_SCRIPT" ]; then
	RTC_COVERAGE_GUIDED_CLEANUP_REPO="$REPO" bash "$CLEANUP_SCRIPT" || true
elif [ -x /tmp/cleanup_rtc_coverage_guided_remote.sh ]; then
	/tmp/cleanup_rtc_coverage_guided_remote.sh || true
else
	tmux kill-session -t rtc-coverage-guided-novelty 2>/dev/null || true
	tmux kill-session -t rtc-coverage-guided-supervisor 2>/dev/null || true
fi
terminate_previous_coverage_processes "$PREVIOUS_COVERAGE"
prepare_exact_candidate_source
printf '%s\n' "$OUT" > "$BASE/current-output-dir.txt"

# A session watchdog can reattach the previous root while a new candidate build
# is still in progress. Retire that owner immediately after the pointer moves.
for monitor_pid in $(pgrep -f '[n]ode bin/rtc-browser-fuzz-novelty-monitor[.]mjs' 2>/dev/null || true); do
	[ -r "/proc/$monitor_pid/environ" ] || continue
	monitor_output=$(tr '\0' '\n' < "/proc/$monitor_pid/environ" | sed -n 's/^RTC_FUZZ_NOVELTY_OUTPUT_DIR=//p' | head -1)
	[ -n "$monitor_output" ] && [ "$monitor_output" != "$OUT" ] || continue
	printf 'stopping stale novelty monitor pid=%s output=%s current=%s\n' "$monitor_pid" "$monitor_output" "$OUT"
	kill -TERM "$monitor_pid" 2>/dev/null || true
done
{
	printf '# RTC Novelty Monitor\n\n'
	printf 'Updated: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
	printf 'Output dir: %s\n' "$OUT"
	printf 'Supervisor session: rtc-coverage-guided-supervisor\n'
	printf 'Groups path: %s\n\n' "$OUT/supervisor-groups.json"
	printf '## Startup\n'
	printf -- '- status: launcher started; monitor process pending\n\n'
	if [ "$DISABLE_STATE_CARRYOVER" != "1" ] && [ -n "$PREVIOUS_COVERAGE" ] && [ -f "$PREVIOUS_COVERAGE/novelty-state.json" ]; then
		printf '## Warmup Carryover\n'
		printf -- '- previous output dir: %s\n' "$PREVIOUS_COVERAGE"
		node - "$PREVIOUS_COVERAGE/novelty-state.json" <<'NODE' || true
const fs = require( 'fs' );
const statePath = process.argv[ 2 ];
try {
	const state = JSON.parse( fs.readFileSync( statePath, 'utf8' ) );
	const lastCompletedAt =
		state.lastCompletedFullPassAt ||
		state.lastFullPassAt ||
		state.lastUpdatedAt ||
		'unknown';
	const yieldCurrent = state.triageYieldCurrent || {};
	console.log(
		`- previous completed pass: ${ lastCompletedAt }`
	);
	console.log(
		`- previous current-run likely-real: ${ yieldCurrent.likelyRealVisible ?? 'unknown' }`
	);
	console.log(
		`- previous current-run top duplicate share: ${ yieldCurrent.topDuplicateFamilyShare ?? 'unknown' }`
	);
} catch ( error ) {
	console.log( `- previous state read failed: ${ error.name || 'unknown' }` );
}
NODE
		printf -- '- current root still requires its own full pass before promotion decisions use current-run metrics\n\n'
	elif [ "$DISABLE_STATE_CARRYOVER" = "1" ]; then
		printf '## Warmup Carryover\n'
		if [ -n "$CARRYOVER_DISABLED_REASON" ]; then
			printf -- '- disabled: %s\n' "$CARRYOVER_DISABLED_REASON"
			printf -- '- previous output dir: %s\n' "$PREVIOUS_COVERAGE"
		else
			printf -- '- disabled: RTC_FUZZ_NOVELTY_DISABLE_STATE_CARRYOVER=1\n'
		fi
		printf -- '- current root will bootstrap from live inputs only\n\n'
	fi
	printf '## Coverage Guidance\n'
	printf -- '- unmet goals: pending until first pass\n'
	printf -- '- harness-work candidates: pending until first pass\n'
	printf -- '- quality issues: pending until first pass\n\n'
	printf '## Triage Yield\n'
	printf -- '- signatures: pending until first pass\n'
	printf -- '- likely-real visible: pending until first pass\n'
	printf -- '- likely-real merged duplicates: pending until first pass\n'
	printf -- '- likely-real oracle/noise questions: pending until first pass\n'
	printf -- '- top duplicate family share: pending until first pass\n\n'
	printf '## Health\n'
	printf -- '- warning: launcher startup status only; novelty monitor has not started yet\n'
} > "$OUT/novelty-status.md"
{
	if [ "$INCLUDE_HISTORICAL_ROOTS" = "1" ]; then
		for ROOT in "$STRICT" "$ISO_HTTP" "$ISO_WS" "$FOCUSED" "$GAP_BOOSTER" "$PREVIOUS_COVERAGE"; do
			if [ -n "$ROOT" ]; then
				printf '%s\n' "$ROOT"
			fi
		done
		if [ -n "$PREVIOUS_COVERAGE" ] && [ -f "$PREVIOUS_COVERAGE/observed-roots.txt" ]; then
			cat "$PREVIOUS_COVERAGE/observed-roots.txt"
		fi
		if [ -f "$CUMULATIVE_ROOTS_FILE" ]; then
			cat "$CUMULATIVE_ROOTS_FILE"
		fi
	fi
} | awk 'NF && !seen[$0]++' | sed -n "1,${MAX_OBSERVED_ROOTS}p" > "$OUT/observed-roots.txt"
cp "$OUT/observed-roots.txt" "$CUMULATIVE_ROOTS_FILE"
OBSERVED=$(paste -sd: "$OUT/observed-roots.txt")
if [ "$DISABLE_STATE_CARRYOVER" != "1" ] && [ -n "$PREVIOUS_COVERAGE" ] && [ -f "$PREVIOUS_COVERAGE/novelty-state.json" ]; then
	cp "$PREVIOUS_COVERAGE/novelty-state.json" "$OUT/novelty-state.json"
fi
EXPLICIT_NOVELTY_TARGET_ENABLED_GROUPS=${RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS-}
EXPLICIT_NOVELTY_MAX_ENABLED_GROUPS=${RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS-}
EXPLICIT_NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS=${RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS-}
EXPLICIT_NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS=${RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS-}
EXPLICIT_NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS=${RTC_FUZZ_NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS-}
EXPLICIT_NOVELTY_MIN_ENABLED_BROWSER_LANES=${RTC_FUZZ_NOVELTY_MIN_ENABLED_BROWSER_LANES-}
EXPLICIT_NOVELTY_LOAD_HEADROOM_MULTIPLIER=${RTC_FUZZ_NOVELTY_LOAD_HEADROOM_MULTIPLIER-}
EXPLICIT_NOVELTY_ALLOW_FLEET_STARTUP_NOISE_CANARY=${RTC_FUZZ_NOVELTY_ALLOW_FLEET_STARTUP_NOISE_CANARY-}
EXPLICIT_NOVELTY_FLEET_STARTUP_NOISE_CANARY_GROUP=${RTC_FUZZ_NOVELTY_FLEET_STARTUP_NOISE_CANARY_GROUP-}
EXPLICIT_NOVELTY_ALLOW_EMPTY_MATERIALIZATION_NO_PRODUCT_STARTUP_CANARY=${RTC_FUZZ_NOVELTY_ALLOW_EMPTY_MATERIALIZATION_NO_PRODUCT_STARTUP_CANARY-}
EXPLICIT_NOVELTY_ALLOW_SUCCESS_DEFICIT_STARTUP_NOISE_CANARY=${RTC_FUZZ_NOVELTY_ALLOW_SUCCESS_DEFICIT_STARTUP_NOISE_CANARY-}
EXPLICIT_NOVELTY_ALLOW_DISABLED_POLICY_GUARDS=${RTC_FUZZ_NOVELTY_ALLOW_DISABLED_POLICY_GUARDS-}
EXPLICIT_NOVELTY_PAUSE_ON_STARTUP_FAILURE=${RTC_FUZZ_NOVELTY_PAUSE_ON_STARTUP_FAILURE-}
EXPLICIT_NOVELTY_PAUSE_ON_TRIAGE_NOISE=${RTC_FUZZ_NOVELTY_PAUSE_ON_TRIAGE_NOISE-}
EXPLICIT_NOVELTY_SUCCESS_DEFICIT_BOOTSTRAP_SLOTS=${RTC_FUZZ_NOVELTY_SUCCESS_DEFICIT_BOOTSTRAP_SLOTS-}
	EXPLICIT_NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS-}
	EXPLICIT_NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS-}
	EXPLICIT_NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT-}
EXPLICIT_NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR-}
	EXPLICIT_NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR-}
EXPLICIT_NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS=${RTC_FUZZ_NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS-}
EXPLICIT_NOVELTY_DEADLINE_COVERAGE_GAP_MIN_RESERVED_GROUPS=${RTC_FUZZ_NOVELTY_DEADLINE_COVERAGE_GAP_MIN_RESERVED_GROUPS-}
EXPLICIT_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP=${RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP-}
EXPLICIT_NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY=${RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY-}
EXPLICIT_BENCHMARK_CANARY_FEEDBACK_BASE=${RTC_FUZZ_BENCHMARK_CANARY_FEEDBACK_BASE-}
BUDGET_ENV_LOADED=0
if [ -s "$BUDGET_ENV_SNAPSHOT" ]; then
	# shellcheck disable=SC1090
	. "$BUDGET_ENV_SNAPSHOT"
	BUDGET_ENV_LOADED=1
fi
if [ "$BUDGET_ENV_LOADED" = "1" ] && [ "${RTC_FUZZ_NOVELTY_PREFER_EXPLICIT_BUDGET:-0}" != "1" ]; then
	EXPLICIT_NOVELTY_TARGET_ENABLED_GROUPS=
	EXPLICIT_NOVELTY_MAX_ENABLED_GROUPS=
	EXPLICIT_NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS=
	EXPLICIT_NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS=
	EXPLICIT_NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS=
	EXPLICIT_NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS=
	EXPLICIT_NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS=
	EXPLICIT_NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT=
	EXPLICIT_NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR=
	EXPLICIT_NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR=
	EXPLICIT_NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS=
	EXPLICIT_NOVELTY_DEADLINE_COVERAGE_GAP_MIN_RESERVED_GROUPS=
	EXPLICIT_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP=
	EXPLICIT_NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY=
fi
if [ -n "$EXPLICIT_NOVELTY_TARGET_ENABLED_GROUPS" ]; then
	RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS="$EXPLICIT_NOVELTY_TARGET_ENABLED_GROUPS"
fi
if [ -n "$EXPLICIT_NOVELTY_MAX_ENABLED_GROUPS" ]; then
	RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS="$EXPLICIT_NOVELTY_MAX_ENABLED_GROUPS"
fi
if [ -n "$EXPLICIT_NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS" ]; then
	RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS="$EXPLICIT_NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS"
fi
if [ -n "$EXPLICIT_NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS" ]; then
	RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS="$EXPLICIT_NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS"
fi
if [ -n "$EXPLICIT_NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS" ]; then
	RTC_FUZZ_NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS="$EXPLICIT_NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS"
fi
if [ -n "$EXPLICIT_NOVELTY_MIN_ENABLED_BROWSER_LANES" ]; then
	RTC_FUZZ_NOVELTY_MIN_ENABLED_BROWSER_LANES="$EXPLICIT_NOVELTY_MIN_ENABLED_BROWSER_LANES"
fi
if [ -n "$EXPLICIT_NOVELTY_LOAD_HEADROOM_MULTIPLIER" ]; then
	RTC_FUZZ_NOVELTY_LOAD_HEADROOM_MULTIPLIER="$EXPLICIT_NOVELTY_LOAD_HEADROOM_MULTIPLIER"
fi
if [ -n "$EXPLICIT_NOVELTY_ALLOW_FLEET_STARTUP_NOISE_CANARY" ]; then
	RTC_FUZZ_NOVELTY_ALLOW_FLEET_STARTUP_NOISE_CANARY="$EXPLICIT_NOVELTY_ALLOW_FLEET_STARTUP_NOISE_CANARY"
fi
if [ -n "$EXPLICIT_NOVELTY_FLEET_STARTUP_NOISE_CANARY_GROUP" ]; then
	RTC_FUZZ_NOVELTY_FLEET_STARTUP_NOISE_CANARY_GROUP="$EXPLICIT_NOVELTY_FLEET_STARTUP_NOISE_CANARY_GROUP"
fi
if [ -n "$EXPLICIT_NOVELTY_ALLOW_EMPTY_MATERIALIZATION_NO_PRODUCT_STARTUP_CANARY" ]; then
	RTC_FUZZ_NOVELTY_ALLOW_EMPTY_MATERIALIZATION_NO_PRODUCT_STARTUP_CANARY="$EXPLICIT_NOVELTY_ALLOW_EMPTY_MATERIALIZATION_NO_PRODUCT_STARTUP_CANARY"
fi
if [ -n "$EXPLICIT_NOVELTY_ALLOW_SUCCESS_DEFICIT_STARTUP_NOISE_CANARY" ]; then
	RTC_FUZZ_NOVELTY_ALLOW_SUCCESS_DEFICIT_STARTUP_NOISE_CANARY="$EXPLICIT_NOVELTY_ALLOW_SUCCESS_DEFICIT_STARTUP_NOISE_CANARY"
fi
if [ -n "$EXPLICIT_NOVELTY_ALLOW_DISABLED_POLICY_GUARDS" ]; then
	RTC_FUZZ_NOVELTY_ALLOW_DISABLED_POLICY_GUARDS="$EXPLICIT_NOVELTY_ALLOW_DISABLED_POLICY_GUARDS"
fi
if [ -n "$EXPLICIT_NOVELTY_PAUSE_ON_STARTUP_FAILURE" ]; then
	RTC_FUZZ_NOVELTY_PAUSE_ON_STARTUP_FAILURE="$EXPLICIT_NOVELTY_PAUSE_ON_STARTUP_FAILURE"
fi
if [ -n "$EXPLICIT_NOVELTY_PAUSE_ON_TRIAGE_NOISE" ]; then
	RTC_FUZZ_NOVELTY_PAUSE_ON_TRIAGE_NOISE="$EXPLICIT_NOVELTY_PAUSE_ON_TRIAGE_NOISE"
fi
if [ -n "$EXPLICIT_NOVELTY_SUCCESS_DEFICIT_BOOTSTRAP_SLOTS" ]; then
	RTC_FUZZ_NOVELTY_SUCCESS_DEFICIT_BOOTSTRAP_SLOTS="$EXPLICIT_NOVELTY_SUCCESS_DEFICIT_BOOTSTRAP_SLOTS"
fi
if [ -n "$EXPLICIT_NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS" ]; then
	RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS="$EXPLICIT_NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS"
fi
if [ -n "$EXPLICIT_NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS" ]; then
	RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS="$EXPLICIT_NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS"
fi
	if [ -n "$EXPLICIT_NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT" ]; then
		RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT="$EXPLICIT_NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT"
	fi
	if [ -n "$EXPLICIT_NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR" ]; then
		RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR="$EXPLICIT_NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR"
	fi
	if [ -n "$EXPLICIT_NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR" ]; then
		RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR="$EXPLICIT_NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR"
	fi
	if [ -n "$EXPLICIT_NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS" ]; then
		RTC_FUZZ_NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS="$EXPLICIT_NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS"
fi
if [ -n "$EXPLICIT_NOVELTY_DEADLINE_COVERAGE_GAP_MIN_RESERVED_GROUPS" ]; then
	RTC_FUZZ_NOVELTY_DEADLINE_COVERAGE_GAP_MIN_RESERVED_GROUPS="$EXPLICIT_NOVELTY_DEADLINE_COVERAGE_GAP_MIN_RESERVED_GROUPS"
fi
if [ -n "$EXPLICIT_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP" ]; then
	RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP="$EXPLICIT_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP"
fi
if [ -n "$EXPLICIT_NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY" ]; then
	RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY="$EXPLICIT_NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY"
fi
if [ -n "$EXPLICIT_BENCHMARK_CANARY_FEEDBACK_BASE" ]; then
	RTC_FUZZ_BENCHMARK_CANARY_FEEDBACK_BASE="$EXPLICIT_BENCHMARK_CANARY_FEEDBACK_BASE"
fi
NOVELTY_TARGET_ENABLED_GROUPS=${RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS:-8}
NOVELTY_MAX_ENABLED_GROUPS=${RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS:-9}
NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS=${RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS:-$NOVELTY_TARGET_ENABLED_GROUPS}
NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS=${RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS:-$NOVELTY_MAX_ENABLED_GROUPS}
NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS=${RTC_FUZZ_NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS:-$NOVELTY_MAX_ENABLED_GROUPS}
NOVELTY_MIN_ENABLED_BROWSER_LANES=${RTC_FUZZ_NOVELTY_MIN_ENABLED_BROWSER_LANES:-}
NOVELTY_LOAD_HEADROOM_MULTIPLIER=${RTC_FUZZ_NOVELTY_LOAD_HEADROOM_MULTIPLIER:-1.12}
NOVELTY_ALLOW_FLEET_STARTUP_NOISE_CANARY=${RTC_FUZZ_NOVELTY_ALLOW_FLEET_STARTUP_NOISE_CANARY:-0}
NOVELTY_FLEET_STARTUP_NOISE_CANARY_GROUP=${RTC_FUZZ_NOVELTY_FLEET_STARTUP_NOISE_CANARY_GROUP:-novelty-ws-media-cross-entity}
NOVELTY_ALLOW_EMPTY_MATERIALIZATION_NO_PRODUCT_STARTUP_CANARY=${RTC_FUZZ_NOVELTY_ALLOW_EMPTY_MATERIALIZATION_NO_PRODUCT_STARTUP_CANARY:-0}
NOVELTY_ALLOW_SUCCESS_DEFICIT_STARTUP_NOISE_CANARY=${RTC_FUZZ_NOVELTY_ALLOW_SUCCESS_DEFICIT_STARTUP_NOISE_CANARY:-1}
NOVELTY_ALLOW_DISABLED_POLICY_GUARDS=${RTC_FUZZ_NOVELTY_ALLOW_DISABLED_POLICY_GUARDS:-0}
NOVELTY_PAUSE_ON_STARTUP_FAILURE=${RTC_FUZZ_NOVELTY_PAUSE_ON_STARTUP_FAILURE:-1}
NOVELTY_PAUSE_ON_TRIAGE_NOISE=${RTC_FUZZ_NOVELTY_PAUSE_ON_TRIAGE_NOISE:-1}
NOVELTY_SUCCESS_DEFICIT_BOOTSTRAP_SLOTS=${RTC_FUZZ_NOVELTY_SUCCESS_DEFICIT_BOOTSTRAP_SLOTS:-2}
NOVELTY_SUCCESS_DEFICIT_BOOTSTRAP_SLOTS=$(positive_integer_or_default "$NOVELTY_SUCCESS_DEFICIT_BOOTSTRAP_SLOTS" 2)
NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS:-6}
NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS:-}
NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT:-}
NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR:-}
NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR:-}
NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS=${RTC_FUZZ_NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS:-}
NOVELTY_DEADLINE_COVERAGE_GAP_MIN_RESERVED_GROUPS=${RTC_FUZZ_NOVELTY_DEADLINE_COVERAGE_GAP_MIN_RESERVED_GROUPS:-}
NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP=${RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP:-0}
NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY=${RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY:-}
START_BUDGET_AUTHORITATIVE=0
if [ "$BUDGET_ENV_LOADED" = 1 ] || [ "${RTC_FUZZ_NOVELTY_PREFER_EXPLICIT_BUDGET:-0}" = 1 ]; then
	START_BUDGET_AUTHORITATIVE=1
fi
START_BUDGET_TARGET_ENABLED_GROUPS=$NOVELTY_TARGET_ENABLED_GROUPS
START_BUDGET_MAX_ENABLED_GROUPS=$NOVELTY_MAX_ENABLED_GROUPS
START_BUDGET_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS=$NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS
START_BUDGET_COVERAGE_GUIDED_MAX_ENABLED_GROUPS=$NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS
START_BUDGET_COVERAGE_QUALITY_MAX_ENABLED_GROUPS=$NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS
START_BUDGET_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS=$NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS
START_BUDGET_BENCHMARK_CANARY_WS_BACKFILL_SLOTS=$NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS
START_BUDGET_BENCHMARK_CANARY_STICKY_GROUP_LIMIT=$NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT
START_BUDGET_BENCHMARK_CANARY_SLOT_FLOOR=$NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR
START_BUDGET_BENCHMARK_CANARY_STRICT_SLOT_FLOOR=$NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR
START_BUDGET_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS=$NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS
START_BUDGET_DEADLINE_COVERAGE_GAP_MIN_RESERVED_GROUPS=$NOVELTY_DEADLINE_COVERAGE_GAP_MIN_RESERVED_GROUPS
START_BUDGET_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP=$NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP
START_BUDGET_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY=$NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY
case "${NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT:-}" in
	0|1|2)
		NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS="$NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT"
		NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS=0
		;;
esac
NOVELTY_ZERO_COVERAGE_BOOTSTRAP_SLOTS=${RTC_FUZZ_NOVELTY_ZERO_COVERAGE_BOOTSTRAP_SLOTS:-8}
NOVELTY_DURATION_HOURS=${RTC_FUZZ_NOVELTY_DURATION_HOURS:-12}
NOVELTY_INTERVAL_MS=${RTC_FUZZ_NOVELTY_INTERVAL_MS:-60000}
NOVELTY_CODEX_INTERVAL_MINUTES=${RTC_FUZZ_NOVELTY_COVERAGE_CODEX_INTERVAL_MINUTES:-30}
DEFAULT_BENCHMARK_FEEDBACK_BASE=/media/volume/danluu-fuzz-data/rtc-benchmark-canary-feedback-20260520
BENCHMARK_FEEDBACK_BASE=${RTC_FUZZ_BENCHMARK_CANARY_FEEDBACK_BASE:-$DEFAULT_BENCHMARK_FEEDBACK_BASE}
BENCHMARK_FEEDBACK_TSV=${RTC_FUZZ_BENCHMARK_CANARY_FEEDBACK_TSV:-$BENCHMARK_FEEDBACK_BASE/current-feedback.tsv}
AUTHORITATIVE_BENCHMARK_FEEDBACK_TSV="$DEFAULT_BENCHMARK_FEEDBACK_BASE/current-feedback.tsv"
PREVIOUS_BENCHMARK_COVERAGE_STATUS_TSV=
if [ -n "$PREVIOUS_COVERAGE" ]; then
	PREVIOUS_BENCHMARK_COVERAGE_STATUS_TSV="$PREVIOUS_COVERAGE/benchmark-canary-coverage-status.tsv"
fi

bump_min_int() {
	local value=$1
	local floor=$2
	case "$value" in
		''|*[!0-9]*)
			printf '%s\n' "$floor"
			return
			;;
	esac
	if [ "$value" -lt "$floor" ]; then
		printf '%s\n' "$floor"
	else
		printf '%s\n' "$value"
	fi
}

benchmark_feedback_blocker_count() {
	local file=$1
	if [ ! -f "$file" ]; then
		printf '0\n'
		return
	fi
	awk -F '\t' '
		NR == 1 {
			for (i = 1; i <= NF; i++) columns[$i] = i
			status_col = columns["status"] ? columns["status"] : 0
			result_col = columns["result"] ? columns["result"] : 0
			group_col = columns["group"] ? columns["group"] : 0
			promotion_blocked_col = columns["promotion_blocked"] ? columns["promotion_blocked"] : 0
			current_run_green_col = columns["current_run_green"] ? columns["current_run_green"] : 0
			explicit_downscope_col = columns["explicit_downscope"] ? columns["explicit_downscope"] : 0
			exit_col = columns["exit_code"] ? columns["exit_code"] : 0
			priority_col = columns["priority"] ? columns["priority"] : 0
			failure_type_col = columns["failure_type"] ? columns["failure_type"] : 0
			reps_failed_col = columns["reps_failed"] ? columns["reps_failed"] : (columns["failed_reps"] ? columns["failed_reps"] : 0)
			repair_col = columns["repair_or_priority"] ? columns["repair_or_priority"] : 0
			next
		}
		function failed_reps(value) {
			gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
			return value ~ /^[1-9][0-9]*(\/[0-9]+)?$/ || value ~ /^[1-9][0-9]*-[0-9]+$/
		}
		function promotion_blocked_row() {
			if (group_col && promotion_blocked_col) {
				return promotion_blocked == "yes" &&
					current_run_green != "yes" &&
					explicit_downscope != "yes"
			}
			return status ~ /promotion_blocked|known_bad_canary|repair[_-]?not[_-]?publishable/ ||
				result ~ /promotion_blocked|known_bad_canary|repair[_-]?not[_-]?publishable/ ||
				line ~ /(^|\t)(promotion_blocked|known_bad_canary|repair[_-]?not[_-]?publishable)(\t|$)/ ||
				(exit_code != "" && exit_code != "0" && priority ~ /blocker|p0|high/) ||
				(failed_reps(reps_failed) && failure_type ~ /promotion-preflight|benchmark-row/) ||
				(failed_reps(reps_failed) && repair_or_priority ~ /p0|block promotion|promotion.*blocked|block.*until/)
		}
		{
			status = status_col ? tolower($(status_col)) : ""
			result = result_col ? tolower($(result_col)) : ""
			promotion_blocked = promotion_blocked_col ? tolower($(promotion_blocked_col)) : ""
			current_run_green = current_run_green_col ? tolower($(current_run_green_col)) : ""
			explicit_downscope = explicit_downscope_col ? tolower($(explicit_downscope_col)) : ""
			exit_code = exit_col ? $(exit_col) : ""
			priority = priority_col ? tolower($(priority_col)) : ""
			failure_type = failure_type_col ? tolower($(failure_type_col)) : ""
			reps_failed = reps_failed_col ? $(reps_failed_col) : ""
			repair_or_priority = repair_col ? tolower($(repair_col)) : ""
			line = tolower($0)
		}
		promotion_blocked_row() { count++ }
		END { print count + 0 }
	' "$file"
}

latest_benchmark_feedback_with_blockers() {
	local cycles_dir="$DEFAULT_BENCHMARK_FEEDBACK_BASE/cycles"
	local candidate
	local count

	if [ ! -d "$cycles_dir" ]; then
		return 0
	fi

	while IFS=$'\t' read -r _ candidate; do
		[ -f "$candidate" ] || continue
		count=$(benchmark_feedback_blocker_count "$candidate")
		if [ "$count" -gt 0 ]; then
			printf '%s\t%s\n' "$count" "$candidate"
			return 0
		fi
	done < <(
		find "$cycles_dir" -mindepth 2 -maxdepth 2 -type f -name current-feedback.tsv -printf '%T@\t%p\n' 2>/dev/null |
			sort -nr
	)
}

select_benchmark_feedback_source() {
	local explicit_count
	local authoritative_count
	local explicit_feedback_tsv=$BENCHMARK_FEEDBACK_TSV
	local coverage_status_count=0
	local coverage_status_tsv=$PREVIOUS_BENCHMARK_COVERAGE_STATUS_TSV
	local latest_entry
	local latest_count=0
	local latest_feedback_tsv=
	local selected_feedback_tsv=$BENCHMARK_FEEDBACK_TSV
	local selected_count
	local selected_reason=

	if [ "${RTC_FUZZ_BENCHMARK_CANARY_ALLOW_STALE_EXPLICIT:-0}" = "1" ]; then
		return
	fi

	explicit_count=$(benchmark_feedback_blocker_count "$BENCHMARK_FEEDBACK_TSV")
	selected_count=$explicit_count
	if [ -f "$AUTHORITATIVE_BENCHMARK_FEEDBACK_TSV" ]; then
		authoritative_count=$(benchmark_feedback_blocker_count "$AUTHORITATIVE_BENCHMARK_FEEDBACK_TSV")
		if [ "$authoritative_count" -gt "$selected_count" ]; then
			selected_feedback_tsv=$AUTHORITATIVE_BENCHMARK_FEEDBACK_TSV
			selected_count=$authoritative_count
			selected_reason='authoritative global benchmark feedback has more active promotion-blocking rows than the explicit feedback source'
		fi
	fi

	if [ -n "$coverage_status_tsv" ] && [ -f "$coverage_status_tsv" ]; then
		coverage_status_count=$(benchmark_feedback_blocker_count "$coverage_status_tsv")
		if [ "$coverage_status_count" -gt 0 ] &&
			{ [ ! -f "$selected_feedback_tsv" ] || [ "$coverage_status_tsv" -nt "$selected_feedback_tsv" ]; }; then
			selected_feedback_tsv=$coverage_status_tsv
			selected_count=$coverage_status_count
			selected_reason='latest coverage status has unresolved current-run benchmark-canary rows; prefer it over stale benchmark feedback rows'
		fi
	fi

	latest_entry=$(latest_benchmark_feedback_with_blockers || true)
	if [ -n "$latest_entry" ]; then
		latest_count=${latest_entry%%$'\t'*}
		latest_feedback_tsv=${latest_entry#*$'\t'}
		if [ "$latest_count" -gt "$selected_count" ]; then
			selected_feedback_tsv=$latest_feedback_tsv
			selected_count=$latest_count
			selected_reason='latest benchmark feedback cycle has more active promotion-blocking rows than the selected feedback source'
		fi
	fi

	if [ "$selected_feedback_tsv" = "$BENCHMARK_FEEDBACK_TSV" ]; then
		return
	fi

	BENCHMARK_FEEDBACK_TSV=$selected_feedback_tsv
	BENCHMARK_FEEDBACK_BASE=$(dirname "$BENCHMARK_FEEDBACK_TSV")
	RTC_FUZZ_BENCHMARK_CANARY_FEEDBACK_BASE=$BENCHMARK_FEEDBACK_BASE
	mkdir -p "$OUT/control"
	{
		printf 'selected_at\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
		printf 'reason\t%s\n' "$selected_reason"
		printf 'explicit_feedback_tsv\t%s\n' "$explicit_feedback_tsv"
		printf 'explicit_blocker_count\t%s\n' "$explicit_count"
		printf 'selected_feedback_tsv\t%s\n' "$BENCHMARK_FEEDBACK_TSV"
		printf 'selected_blocker_count\t%s\n' "$selected_count"
		printf 'latest_feedback_tsv\t%s\n' "$latest_feedback_tsv"
		printf 'latest_blocker_count\t%s\n' "$latest_count"
		printf 'coverage_status_tsv\t%s\n' "$coverage_status_tsv"
		printf 'coverage_status_blocker_count\t%s\n' "$coverage_status_count"
	} > "$OUT/control/benchmark-feedback-source-override.tsv"
}

select_benchmark_feedback_source

sanitize_inherited_benchmark_feedback_source() {
	case "$BENCHMARK_FEEDBACK_TSV" in
		"$OUT"/*)
			return
			;;
		*/rtc-coverage-guided-20260515/run-*/benchmark-canary-coverage-status.tsv)
			if [ ! -f "$BENCHMARK_FEEDBACK_TSV" ]; then
				return
			fi
			mkdir -p "$OUT/control"
			local inherited_feedback_tsv="$OUT/control/inherited-benchmark-canary-feedback.tsv"
			cp "$BENCHMARK_FEEDBACK_TSV" "$inherited_feedback_tsv"
			{
				printf 'selected_at\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
				printf 'reason\t%s\n' 'copied inherited coverage-status feedback into the new output root so run-monitor/current-budget do not keep exporting a stale coverage run path'
				printf 'inherited_feedback_tsv\t%s\n' "$BENCHMARK_FEEDBACK_TSV"
				printf 'sanitized_feedback_tsv\t%s\n' "$inherited_feedback_tsv"
			} > "$OUT/control/benchmark-feedback-source-sanitized.tsv"
			BENCHMARK_FEEDBACK_TSV="$inherited_feedback_tsv"
			BENCHMARK_FEEDBACK_BASE=$(dirname "$BENCHMARK_FEEDBACK_TSV")
			RTC_FUZZ_BENCHMARK_CANARY_FEEDBACK_BASE=$BENCHMARK_FEEDBACK_BASE
			;;
	esac
}

sanitize_inherited_benchmark_feedback_source

BENCHMARK_CANARY_PRIMARY_GROUPS=$(
	if [ -f "$BENCHMARK_FEEDBACK_TSV" ]; then
		awk -F '\t' '
			NR == 1 {
				for (i = 1; i <= NF; i++) columns[$i] = i
				status_col = columns["status"] ? columns["status"] : 0
				result_col = columns["result"] ? columns["result"] : 0
				group_col = columns["group"] ? columns["group"] : 0
				promotion_blocked_col = columns["promotion_blocked"] ? columns["promotion_blocked"] : 0
				current_run_green_col = columns["current_run_green"] ? columns["current_run_green"] : 0
				explicit_downscope_col = columns["explicit_downscope"] ? columns["explicit_downscope"] : 0
				exit_col = columns["exit_code"] ? columns["exit_code"] : 0
				priority_col = columns["priority"] ? columns["priority"] : 0
				failure_type_col = columns["failure_type"] ? columns["failure_type"] : 0
				reps_failed_col = columns["reps_failed"] ? columns["reps_failed"] : (columns["failed_reps"] ? columns["failed_reps"] : 0)
				repair_col = columns["repair_or_priority"] ? columns["repair_or_priority"] : 0
				row_col = columns["row"] ? columns["row"] : (columns["failure_row"] ? columns["failure_row"] : 6)
				next
			}
			function failed_reps(value) {
				gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
				return value ~ /^[1-9][0-9]*(\/[0-9]+)?$/ || value ~ /^[1-9][0-9]*-[0-9]+$/
			}
			function promotion_blocked_row() {
				if (group_col && promotion_blocked_col) {
					return promotion_blocked == "yes" &&
						current_run_green != "yes" &&
						explicit_downscope != "yes"
				}
				return status ~ /promotion_blocked|known_bad_canary|repair[_-]?not[_-]?publishable/ ||
					result ~ /promotion_blocked|known_bad_canary|repair[_-]?not[_-]?publishable/ ||
					line ~ /(^|\t)(promotion_blocked|known_bad_canary|repair[_-]?not[_-]?publishable)(\t|$)/ ||
					(exit_code != "" && exit_code != "0" && priority ~ /blocker|p0|high/) ||
					(failed_reps(reps_failed) && failure_type ~ /promotion-preflight|benchmark-row/) ||
					(failed_reps(reps_failed) && repair_or_priority ~ /p0|block promotion|promotion.*blocked|block.*until/)
			}
			{
				status = status_col ? tolower($(status_col)) : ""
				result = result_col ? tolower($(result_col)) : ""
				group = group_col ? $(group_col) : ""
				promotion_blocked = promotion_blocked_col ? tolower($(promotion_blocked_col)) : ""
				current_run_green = current_run_green_col ? tolower($(current_run_green_col)) : ""
				explicit_downscope = explicit_downscope_col ? tolower($(explicit_downscope_col)) : ""
				exit_code = exit_col ? $(exit_col) : ""
				priority = priority_col ? tolower($(priority_col)) : ""
				failure_type = failure_type_col ? tolower($(failure_type_col)) : ""
				reps_failed = reps_failed_col ? $(reps_failed_col) : ""
				repair_or_priority = repair_col ? tolower($(repair_col)) : ""
				line = tolower($0)
				row = $(row_col)
			}
			! promotion_blocked_row() { next }
			group_col && group != "" { print group; next }
			row ~ /lower\/micro-crdt/ { print "novelty-ws-block-gauntlet"; next }
			row ~ /lower\/micro-html/ { print "novelty-ws-parser-serialization"; next }
			row ~ /lower\/micro-sync/ { print "novelty-ws-same-user-lifecycle"; next }
			row ~ /multi-user\/many-users-sync/ { print "novelty-ws-many-user-lifecycle"; next }
			row ~ /collaboration-code-editor-performance-ws|code-editor-performance-ws|ws-code-editor-smoke/ {
				print "novelty-ws-parser-serialization"
				next
			}
			row ~ /collaboration-sync-body-size-http|sync-body-size-http|body-size-http|request-body|payload/ {
				print "novelty-http-provider-persisted-crdt-large-post"
				print "novelty-http-large-post-readiness"
				next
			}
			row ~ /large-post-three-user-http/ {
				print "novelty-http-large-post-readiness"
				print "novelty-http-provider-persisted-crdt-large-post"
				if (row ~ /provider-persisted-crdt|existing-post-crdt/) print "novelty-http-existing-post-crdt-metadata"
				next
			}
			row ~ /list-item-move-refresh-http/ { print "novelty-ws-multi-reload-lifecycle"; next }
			row ~ /same-user-stale-content/ { print "novelty-http-same-user-stale-draft"; next }
			row ~ /same-user-title-reload-ws|title-reload-ws/ {
				print "novelty-ws-same-user-lifecycle"
				print "novelty-ws-same-user-stale-tabs"
				next
			}
			row ~ /revision-table-body-http|table-stale-snapshot-http/ { print "novelty-http-table-stale-snapshot"; next }
			row ~ /autosave-retention-http|collaborator-autosave-http/ {
				print "novelty-http-persistence-probe"
				print "novelty-http-existing-post-crdt-metadata"
				next
			}
			row ~ /self-presence-ui-signal-http|ui-signal|self-presence/ {
				print "novelty-ws-collaboration-ui-signals"
				next
			}
			row ~ /persistence-reload-http|provider-persisted-crdt|existing-post-crdt/ {
				print "novelty-http-provider-persisted-crdt-large-post"
				print "novelty-http-existing-post-crdt-metadata"
				next
			}
			row ~ /title-reload-http/ { print "novelty-http-title-reload-convergence"; next }
		' "$BENCHMARK_FEEDBACK_TSV" | awk 'NF && !seen[$0]++'
	fi
)
BENCHMARK_CANARY_PRIMARY_GROUP_COUNT=$(
	printf '%s\n' "$BENCHMARK_CANARY_PRIMARY_GROUPS" | awk 'NF { count++ } END { print count + 0 }'
)
BENCHMARK_CANARY_PROMOTION_BLOCKED_GROUPS=$(
	if [ -f "$BENCHMARK_FEEDBACK_TSV" ]; then
		awk -F '\t' '
			NR == 1 {
				for (i = 1; i <= NF; i++) columns[$i] = i
				status_col = columns["status"] ? columns["status"] : 0
				result_col = columns["result"] ? columns["result"] : 0
				group_col = columns["group"] ? columns["group"] : 0
				promotion_blocked_col = columns["promotion_blocked"] ? columns["promotion_blocked"] : 0
				current_run_green_col = columns["current_run_green"] ? columns["current_run_green"] : 0
				explicit_downscope_col = columns["explicit_downscope"] ? columns["explicit_downscope"] : 0
				exit_col = columns["exit_code"] ? columns["exit_code"] : 0
				priority_col = columns["priority"] ? columns["priority"] : 0
				failure_type_col = columns["failure_type"] ? columns["failure_type"] : 0
				reps_failed_col = columns["reps_failed"] ? columns["reps_failed"] : (columns["failed_reps"] ? columns["failed_reps"] : 0)
				repair_col = columns["repair_or_priority"] ? columns["repair_or_priority"] : 0
				row_col = columns["row"] ? columns["row"] : (columns["failure_row"] ? columns["failure_row"] : 6)
				next
			}
			function failed_reps(value) {
				gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
				return value ~ /^[1-9][0-9]*(\/[0-9]+)?$/ || value ~ /^[1-9][0-9]*-[0-9]+$/
			}
			function promotion_blocked_row() {
				if (group_col && promotion_blocked_col) {
					return promotion_blocked == "yes" &&
						current_run_green != "yes" &&
						explicit_downscope != "yes"
				}
				return status ~ /promotion_blocked|known_bad_canary|repair[_-]?not[_-]?publishable/ ||
					result ~ /promotion_blocked|known_bad_canary|repair[_-]?not[_-]?publishable/ ||
					line ~ /(^|\t)(promotion_blocked|known_bad_canary|repair[_-]?not[_-]?publishable)(\t|$)/ ||
					(exit_code != "" && exit_code != "0" && priority ~ /blocker|p0|high/) ||
					(failed_reps(reps_failed) && failure_type ~ /promotion-preflight|benchmark-row/) ||
					(failed_reps(reps_failed) && repair_or_priority ~ /p0|block promotion|promotion.*blocked|block.*until/)
			}
			{
				status = status_col ? tolower($(status_col)) : ""
				result = result_col ? tolower($(result_col)) : ""
				group = group_col ? $(group_col) : ""
				promotion_blocked = promotion_blocked_col ? tolower($(promotion_blocked_col)) : ""
				current_run_green = current_run_green_col ? tolower($(current_run_green_col)) : ""
				explicit_downscope = explicit_downscope_col ? tolower($(explicit_downscope_col)) : ""
				exit_code = exit_col ? $(exit_col) : ""
				priority = priority_col ? tolower($(priority_col)) : ""
				failure_type = failure_type_col ? tolower($(failure_type_col)) : ""
				reps_failed = reps_failed_col ? $(reps_failed_col) : ""
				repair_or_priority = repair_col ? tolower($(repair_col)) : ""
				line = tolower($0)
				row = $(row_col)
			}
			! promotion_blocked_row() { next }
			group_col && group != "" { print group; next }
			row ~ /lower\/micro-crdt/ {
				print "novelty-ws-block-gauntlet"
				print "novelty-http-table-stale-snapshot"
				print "novelty-ws-revision-persistence"
				print "novelty-ws-multi-reload-lifecycle"
				next
			}
			row ~ /lower\/micro-html/ {
				print "novelty-ws-parser-serialization"
				print "novelty-ws-parser-transform"
				print "novelty-ws-real-user-rich-text"
				next
			}
			row ~ /lower\/micro-sync/ {
				print "novelty-ws-same-user-lifecycle"
				print "novelty-ws-same-user-stale-tabs"
				print "novelty-ws-multi-reload-lifecycle"
				next
			}
			row ~ /multi-user\/many-users-sync/ {
				print "novelty-ws-many-user-lifecycle"
				print "novelty-ws-many-user-lifecycle-completion"
				print "novelty-ws-thirty-user-lifecycle"
				next
			}
			row ~ /collaboration-code-editor-performance-ws|code-editor-performance-ws|ws-code-editor-smoke/ {
				print "novelty-ws-parser-serialization"
				print "novelty-ws-collaboration-ui-signals"
				next
			}
			row ~ /collaboration-sync-body-size-http|sync-body-size-http|body-size-http|request-body|payload/ {
				print "novelty-http-provider-persisted-crdt-large-post"
				print "novelty-http-large-post-readiness"
				print "novelty-http-large-post-lifecycle"
				print "novelty-http-large-post-lifecycle-completion"
				next
			}
			row ~ /large-post-three-user-http/ {
				print "novelty-http-large-post-readiness"
				print "novelty-http-provider-persisted-crdt-large-post"
				print "novelty-http-large-post-lifecycle"
				print "novelty-http-large-post-lifecycle-completion"
				if (row ~ /provider-persisted-crdt|existing-post-crdt/) {
					print "novelty-http-existing-post-crdt-metadata"
					print "novelty-http-persistence-probe"
				}
				next
			}
			row ~ /list-item-move-refresh-http/ {
				print "novelty-http-list-move-refresh"
				print "novelty-http-large-post-readiness"
				print "novelty-ws-real-user-rich-text"
				print "novelty-ws-multi-reload-lifecycle"
				print "novelty-ws-block-gauntlet"
				next
			}
			row ~ /same-user-stale-content/ {
				print "novelty-http-same-user-stale-draft"
				print "novelty-ws-same-user-lifecycle"
				print "novelty-ws-same-user-stale-tabs"
				next
			}
			row ~ /same-user-title-reload-ws|title-reload-ws/ {
				print "novelty-ws-same-user-lifecycle"
				print "novelty-ws-same-user-stale-tabs"
				print "novelty-http-title-reload-convergence"
				next
			}
			row ~ /revision-table-body-http|table-stale-snapshot-http/ {
				print "novelty-http-table-stale-snapshot"
				print "novelty-ws-parser-serialization"
				print "novelty-ws-revision-persistence"
				print "novelty-ws-revision-recovery"
				next
			}
			row ~ /autosave-retention-http/ {
				print "novelty-http-persistence-probe"
				print "novelty-http-existing-post-crdt-metadata"
				print "novelty-ws-revision-recovery"
				next
			}
			row ~ /collaborator-autosave-http/ {
				print "novelty-http-persistence-probe"
				print "novelty-http-existing-post-crdt-metadata"
				print "novelty-ws-revision-persistence"
				print "novelty-ws-revision-recovery"
				next
			}
			row ~ /self-presence-ui-signal-http|ui-signal|self-presence/ {
				print "novelty-ws-collaboration-ui-signals"
				next
			}
			row ~ /persistence-reload-http|provider-persisted-crdt|existing-post-crdt/ {
				print "novelty-http-provider-persisted-crdt-large-post"
				print "novelty-http-existing-post-crdt-metadata"
				print "novelty-http-persistence-probe"
				next
			}
			row ~ /title-reload-http/ { print "novelty-http-title-reload-convergence"; next }
		' "$BENCHMARK_FEEDBACK_TSV" | awk 'NF && !seen[$0]++'
	fi
)
BENCHMARK_CANARY_PROMOTION_BLOCKED_GROUP_COUNT=$(
	printf '%s\n' "$BENCHMARK_CANARY_PROMOTION_BLOCKED_GROUPS" | awk 'NF { count++ } END { print count + 0 }'
)
	STRICT_BENCHMARK_CANARY_CAP=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STRICT_CAP:-0}
	STRICT_BENCHMARK_CANARY_SLOT_FLOOR=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR:-0}
		DEADLINE_BENCHMARK_CANARY_BUDGET_CAP=$NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP
		if [ "${NOVELTY_MAX_ENABLED_GROUPS:-0}" -le 5 ]; then
			DEADLINE_BENCHMARK_CANARY_BUDGET_CAP=1
	fi
	case "${NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT:-}" in
		1|2|3|4)
			DEADLINE_BENCHMARK_CANARY_BUDGET_CAP=1
			;;
		esac
		NOVELTY_CURRENT_MAX_ENABLED_FOR_CANARY=$(positive_integer_or_default "$NOVELTY_MAX_ENABLED_GROUPS" 0)
		if [ "${RTC_FUZZ_LOW_DISK_MODE:-0}" != "1" ] &&
			[ "$STRICT_BENCHMARK_CANARY_CAP" -ne 1 ] &&
			[ -z "${NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT:-}" ] &&
			[ "$BENCHMARK_CANARY_PROMOTION_BLOCKED_GROUP_COUNT" -gt "$NOVELTY_CURRENT_MAX_ENABLED_FOR_CANARY" ]; then
			DEADLINE_BENCHMARK_CANARY_BUDGET_CAP=0
		fi
		if [ "$STRICT_BENCHMARK_CANARY_SLOT_FLOOR" -eq 1 ] &&
			[ "$BENCHMARK_CANARY_PROMOTION_BLOCKED_GROUP_COUNT" -gt 0 ] &&
			[ "${NOVELTY_MAX_ENABLED_GROUPS:-0}" -gt 5 ] &&
			[ "${RTC_FUZZ_LOW_DISK_MODE:-0}" != "1" ]; then
			DEADLINE_BENCHMARK_CANARY_BUDGET_CAP=0
			NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT=''
		fi
		if [ "${RTC_FUZZ_LOW_DISK_MODE:-0}" = "1" ] &&
			[ "$BENCHMARK_CANARY_PRIMARY_GROUP_COUNT" -gt 0 ] &&
			[ "$STRICT_BENCHMARK_CANARY_CAP" -ne 1 ]; then
			if [ -z "${NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT:-}" ] &&
				[ "$BENCHMARK_CANARY_PROMOTION_BLOCKED_GROUP_COUNT" -gt 5 ]; then
				DEADLINE_BENCHMARK_CANARY_BUDGET_CAP=0
			else
				DEADLINE_BENCHMARK_CANARY_BUDGET_CAP=1
				NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT=''
			fi
		fi
		if [ "$BENCHMARK_CANARY_PRIMARY_GROUP_COUNT" -gt 0 ] &&
			[ "$STRICT_BENCHMARK_CANARY_CAP" -ne 1 ] &&
			[ "$BENCHMARK_CANARY_PROMOTION_BLOCKED_GROUP_COUNT" -gt 5 ]; then
			DEADLINE_BENCHMARK_CANARY_BUDGET_CAP=0
			NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT=''
		fi
		if [ "$BENCHMARK_CANARY_PRIMARY_GROUP_COUNT" -gt 0 ] &&
			[ "$STRICT_BENCHMARK_CANARY_CAP" -ne 1 ] &&
			[ "$DEADLINE_BENCHMARK_CANARY_BUDGET_CAP" -eq 1 ]; then
		NOVELTY_TARGET_ENABLED_GROUPS=5
		NOVELTY_MAX_ENABLED_GROUPS=5
		NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS=5
		NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS=5
		NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS=5
		NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS=5
		NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS=0
		NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT=''
		NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR=5
		NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR=0
		NOVELTY_DEADLINE_COVERAGE_GAP_MIN_RESERVED_GROUPS=0
	fi
	if [ -z "$NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS" ]; then
		if [ "$DEADLINE_BENCHMARK_CANARY_BUDGET_CAP" -eq 1 ]; then
			NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS=0
		else
			NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS="$NOVELTY_ZERO_COVERAGE_BOOTSTRAP_SLOTS"
		fi
	fi
	if [ "$BENCHMARK_CANARY_PRIMARY_GROUP_COUNT" -gt 0 ] &&
		[ "$STRICT_BENCHMARK_CANARY_CAP" -ne 1 ] &&
		[ "$DEADLINE_BENCHMARK_CANARY_BUDGET_CAP" -ne 1 ]; then
		NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS:-12}
		[[ "$NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS" =~ ^[0-9]+$ ]] || NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS=12
		CONFIGURED_BENCHMARK_CANARY_SLOT_FLOOR=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR:-0}
		BENCHMARK_CANARY_SLOT_FLOOR=$(bump_min_int "$CONFIGURED_BENCHMARK_CANARY_SLOT_FLOOR" "$BENCHMARK_CANARY_PROMOTION_BLOCKED_GROUP_COUNT")
	COVERAGE_GAP_SLOT_FLOOR=$BENCHMARK_CANARY_PROMOTION_BLOCKED_GROUP_COUNT
	BENCHMARK_CANARY_SLOT_FLOOR=$(bump_min_int "$BENCHMARK_CANARY_SLOT_FLOOR" "$COVERAGE_GAP_SLOT_FLOOR")
	if [ "$NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS" -gt 0 ] &&
		[ "$BENCHMARK_CANARY_SLOT_FLOOR" -gt "$NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS" ]; then
		BENCHMARK_CANARY_SLOT_FLOOR="$NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS"
	fi
	NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR="$BENCHMARK_CANARY_SLOT_FLOOR"
	NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR=1
	NOVELTY_TARGET_ENABLED_GROUPS=$(bump_min_int "$NOVELTY_TARGET_ENABLED_GROUPS" "$BENCHMARK_CANARY_SLOT_FLOOR")
	NOVELTY_MAX_ENABLED_GROUPS=$(bump_min_int "$NOVELTY_MAX_ENABLED_GROUPS" "$BENCHMARK_CANARY_SLOT_FLOOR")
	NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS=$(bump_min_int "$NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS" "$BENCHMARK_CANARY_SLOT_FLOOR")
	NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS=$(bump_min_int "$NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS" "$BENCHMARK_CANARY_SLOT_FLOOR")
	NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS=$(bump_min_int "$NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS" "$BENCHMARK_CANARY_SLOT_FLOOR")
	NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS=$(bump_min_int "$NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS" "$BENCHMARK_CANARY_PROMOTION_BLOCKED_GROUP_COUNT")
	if [ "$NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS" -gt 0 ]; then
		[ "$NOVELTY_TARGET_ENABLED_GROUPS" -gt "$NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS" ] && NOVELTY_TARGET_ENABLED_GROUPS="$NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS"
		[ "$NOVELTY_MAX_ENABLED_GROUPS" -gt "$NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS" ] && NOVELTY_MAX_ENABLED_GROUPS="$NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS"
		[ "$NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS" -gt "$NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS" ] && NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS="$NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS"
		[ "$NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS" -gt "$NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS" ] && NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS="$NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS"
		[ "$NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS" -gt "$NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS" ] && NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS="$NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS"
		[ "$NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS" -gt "$NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS" ] && NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS="$NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS"
	fi
	{
		printf 'feedback_tsv\t%s\n' "$BENCHMARK_FEEDBACK_TSV"
		printf 'primary_group_count\t%s\n' "$BENCHMARK_CANARY_PRIMARY_GROUP_COUNT"
		printf 'promotion_blocked_group_count\t%s\n' "$BENCHMARK_CANARY_PROMOTION_BLOCKED_GROUP_COUNT"
		printf 'configured_slot_floor\t%s\n' "$CONFIGURED_BENCHMARK_CANARY_SLOT_FLOOR"
		printf 'zero_coverage_bootstrap_slots\t%s\n' "$NOVELTY_ZERO_COVERAGE_BOOTSTRAP_SLOTS"
		printf 'slot_floor\t%s\n' "$BENCHMARK_CANARY_SLOT_FLOOR"
		printf 'primary_groups\t%s\n' "$(printf '%s\n' "$BENCHMARK_CANARY_PRIMARY_GROUPS" | paste -sd, -)"
		printf 'promotion_blocked_groups\t%s\n' "$(printf '%s\n' "$BENCHMARK_CANARY_PROMOTION_BLOCKED_GROUPS" | paste -sd, -)"
		printf 'target_enabled_groups\t%s\n' "$NOVELTY_TARGET_ENABLED_GROUPS"
		printf 'max_enabled_groups\t%s\n' "$NOVELTY_MAX_ENABLED_GROUPS"
		printf 'coverage_guided_target_enabled_groups\t%s\n' "$NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS"
		printf 'coverage_guided_max_enabled_groups\t%s\n' "$NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS"
		printf 'coverage_quality_max_enabled_groups\t%s\n' "$NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS"
		printf 'benchmark_canary_finalization_max_groups\t%s\n' "$NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS"
		printf 'deadline_coverage_gap_reserved_groups\t%s\n' "$NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS"
			printf 'benchmark_canary_bootstrap_reserve_slots\t%s\n' "$NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS"
		} > "$OUT/benchmark-canary-coverage-floor.tsv"
	elif [ "$BENCHMARK_CANARY_PRIMARY_GROUP_COUNT" -gt 0 ]; then
		{
			printf 'feedback_tsv\t%s\n' "$BENCHMARK_FEEDBACK_TSV"
			printf 'primary_group_count\t%s\n' "$BENCHMARK_CANARY_PRIMARY_GROUP_COUNT"
			printf 'promotion_blocked_group_count\t%s\n' "$BENCHMARK_CANARY_PROMOTION_BLOCKED_GROUP_COUNT"
			printf 'strict_benchmark_canary_cap\t%s\n' "$STRICT_BENCHMARK_CANARY_CAP"
			printf 'deadline_benchmark_canary_budget_cap\t%s\n' "$DEADLINE_BENCHMARK_CANARY_BUDGET_CAP"
			printf 'slot_floor\t%s\n' "$NOVELTY_MAX_ENABLED_GROUPS"
			printf 'target_enabled_groups\t%s\n' "$NOVELTY_TARGET_ENABLED_GROUPS"
			printf 'max_enabled_groups\t%s\n' "$NOVELTY_MAX_ENABLED_GROUPS"
			printf 'benchmark_canary_sticky_group_limit\t%s\n' "$NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT"
			printf 'deadline_coverage_gap_reserved_groups\t%s\n' "$NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS"
		} > "$OUT/benchmark-canary-coverage-floor.tsv"
	fi
if [ -z "$NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY" ]; then
	if [ "$DEADLINE_BENCHMARK_CANARY_BUDGET_CAP" -eq 1 ]; then
		NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY=1
	else
		NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY=0
	fi
fi
if [ "$START_BUDGET_AUTHORITATIVE" = 1 ]; then
	# The autoscaler owns budget policy. This launcher only snapshots and applies
	# that decision; benchmark feedback below chooses lanes, not concurrency.
	NOVELTY_TARGET_ENABLED_GROUPS=$START_BUDGET_TARGET_ENABLED_GROUPS
	NOVELTY_MAX_ENABLED_GROUPS=$START_BUDGET_MAX_ENABLED_GROUPS
	NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS=$START_BUDGET_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS
	NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS=$START_BUDGET_COVERAGE_GUIDED_MAX_ENABLED_GROUPS
	NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS=$START_BUDGET_COVERAGE_QUALITY_MAX_ENABLED_GROUPS
	NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS=$START_BUDGET_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS
	NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS=$START_BUDGET_BENCHMARK_CANARY_WS_BACKFILL_SLOTS
	NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT=$START_BUDGET_BENCHMARK_CANARY_STICKY_GROUP_LIMIT
	NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR=$START_BUDGET_BENCHMARK_CANARY_SLOT_FLOOR
	NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR=$START_BUDGET_BENCHMARK_CANARY_STRICT_SLOT_FLOOR
	NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS=$START_BUDGET_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS
	NOVELTY_DEADLINE_COVERAGE_GAP_MIN_RESERVED_GROUPS=$START_BUDGET_DEADLINE_COVERAGE_GAP_MIN_RESERVED_GROUPS
	DEADLINE_BENCHMARK_CANARY_BUDGET_CAP=$START_BUDGET_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP
	NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY=$START_BUDGET_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY
	{
		printf 'feedback_tsv\t%s\n' "$BENCHMARK_FEEDBACK_TSV"
		printf 'budget_source\t%s\n' "$(cat "$OUT/resource-budget-source.txt")"
		printf 'authoritative_start_budget\t1\n'
		printf 'primary_group_count\t%s\n' "$BENCHMARK_CANARY_PRIMARY_GROUP_COUNT"
		printf 'promotion_blocked_group_count\t%s\n' "$BENCHMARK_CANARY_PROMOTION_BLOCKED_GROUP_COUNT"
		printf 'slot_floor\t%s\n' "$NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR"
		printf 'target_enabled_groups\t%s\n' "$NOVELTY_TARGET_ENABLED_GROUPS"
		printf 'max_enabled_groups\t%s\n' "$NOVELTY_MAX_ENABLED_GROUPS"
		printf 'coverage_guided_target_enabled_groups\t%s\n' "$NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS"
		printf 'coverage_guided_max_enabled_groups\t%s\n' "$NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS"
		printf 'coverage_quality_max_enabled_groups\t%s\n' "$NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS"
		printf 'deadline_benchmark_canary_budget_cap\t%s\n' "$DEADLINE_BENCHMARK_CANARY_BUDGET_CAP"
		printf 'benchmark_canary_bootstrap_reserve_slots\t%s\n' "$NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS"
		printf 'promotion_blocked_groups\t%s\n' "$(printf '%s\n' "$BENCHMARK_CANARY_PROMOTION_BLOCKED_GROUPS" | paste -sd, -)"
	} > "$OUT/benchmark-canary-coverage-floor.tsv"
fi
RUN_SCRIPT="$OUT/run-monitor.sh"
RESOURCE_AUTOSCALER_BASE=${RTC_RESOURCE_AUTOSCALER_BASE:-/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516}
RESOURCE_AUTOSCALER_BUDGET_ENV="$RESOURCE_AUTOSCALER_BASE/current-budget.env"
mkdir -p "$RESOURCE_AUTOSCALER_BASE"
cat > "$RESOURCE_AUTOSCALER_BUDGET_ENV.tmp" <<BUDGET
export RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS='$NOVELTY_TARGET_ENABLED_GROUPS'
export RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS='$NOVELTY_MAX_ENABLED_GROUPS'
export RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS='$NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS'
export RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS='$NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS'
export RTC_FUZZ_NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS='$NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS'
export RTC_FUZZ_NOVELTY_MIN_ENABLED_BROWSER_LANES='$NOVELTY_MIN_ENABLED_BROWSER_LANES'
export RTC_FUZZ_NOVELTY_LOAD_HEADROOM_MULTIPLIER='$NOVELTY_LOAD_HEADROOM_MULTIPLIER'
export RTC_FUZZ_NOVELTY_ALLOW_FLEET_STARTUP_NOISE_CANARY='$NOVELTY_ALLOW_FLEET_STARTUP_NOISE_CANARY'
export RTC_FUZZ_NOVELTY_FLEET_STARTUP_NOISE_CANARY_GROUP='$NOVELTY_FLEET_STARTUP_NOISE_CANARY_GROUP'
export RTC_FUZZ_NOVELTY_ALLOW_EMPTY_MATERIALIZATION_NO_PRODUCT_STARTUP_CANARY='$NOVELTY_ALLOW_EMPTY_MATERIALIZATION_NO_PRODUCT_STARTUP_CANARY'
export RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS='$NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS'
export RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS='$NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS'
export RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT='$NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT'
export RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR='$NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR'
export RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR='$NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR'
export RTC_FUZZ_NOVELTY_ZERO_COVERAGE_BENCHMARK_CANARY_MIN_ACTIVE_GROUPS='${NOVELTY_ZERO_COVERAGE_BENCHMARK_CANARY_MIN_ACTIVE_GROUPS:-}'
export RTC_FUZZ_NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS='$NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS'
export RTC_FUZZ_NOVELTY_DEADLINE_COVERAGE_GAP_MIN_RESERVED_GROUPS='$NOVELTY_DEADLINE_COVERAGE_GAP_MIN_RESERVED_GROUPS'
export RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP='$DEADLINE_BENCHMARK_CANARY_BUDGET_CAP'
export RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY='$NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY'
export RTC_FUZZ_BENCHMARK_CANARY_FEEDBACK_BASE='$BENCHMARK_FEEDBACK_BASE'
export RTC_FUZZ_BENCHMARK_CANARY_FEEDBACK_TSV='$BENCHMARK_FEEDBACK_TSV'
BUDGET
cp "$RESOURCE_AUTOSCALER_BUDGET_ENV.tmp" "$OUT/resource-budget-effective-at-start.env"
mv "$RESOURCE_AUTOSCALER_BUDGET_ENV.tmp" "$RESOURCE_AUTOSCALER_BUDGET_ENV"
cat > "$RUN_SCRIPT" <<RUN
#!/usr/bin/env bash
set -u
cd '$PRODUCT_REPO'
export PATH='$CODEX_BIN_DIR':'$TMUX_WRAP':'$NODE_BIN':\$PATH
export CI=1
export RTC_FUZZ_NOVELTY_OUTPUT_DIR='$OUT'
export RTC_FUZZ_NOVELTY_CURRENT_OUTPUT_POINTER='$BASE/current-output-dir.txt'
export RTC_FUZZ_NOVELTY_REPO_ROOT='$PRODUCT_REPO'
export RTC_FUZZ_NOVELTY_OBSERVED_RUN_DIRS='$OBSERVED'
export RTC_FUZZ_NOVELTY_SUPERVISOR_SESSION='rtc-coverage-guided-supervisor'
export RTC_FUZZ_NOVELTY_BASE_URL='http://localhost:16600'
export RTC_FUZZ_NOVELTY_WP_ENV_PORT='16600'
export RTC_FUZZ_NOVELTY_WS_PORT='19380'
export RTC_FUZZ_NOVELTY_REPOS_BASE='$OUT/repos'
export RTC_FUZZ_NOVELTY_WP_ENV_HOME_BASE='$OUT/wp-env'
export RTC_FUZZ_NOVELTY_DURATION_HOURS='$NOVELTY_DURATION_HOURS'
export RTC_FUZZ_NOVELTY_INTERVAL_MS='$NOVELTY_INTERVAL_MS'
export RTC_FUZZ_NOVELTY_FORCE_START='1'
export RTC_FUZZ_NOVELTY_ENABLE_SAME_USER='1'
export RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS='$NOVELTY_TARGET_ENABLED_GROUPS'
export RTC_FUZZ_NOVELTY_LOAD_HEADROOM_MULTIPLIER='$NOVELTY_LOAD_HEADROOM_MULTIPLIER'
export RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS='$NOVELTY_MAX_ENABLED_GROUPS'
export RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS='$NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS'
export RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS='$NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS'
export RTC_FUZZ_NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS='$NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS'
export RTC_FUZZ_NOVELTY_MIN_ENABLED_BROWSER_LANES='$NOVELTY_MIN_ENABLED_BROWSER_LANES'
export RTC_FUZZ_NOVELTY_ALLOW_FLEET_STARTUP_NOISE_CANARY='$NOVELTY_ALLOW_FLEET_STARTUP_NOISE_CANARY'
export RTC_FUZZ_NOVELTY_FLEET_STARTUP_NOISE_CANARY_GROUP='$NOVELTY_FLEET_STARTUP_NOISE_CANARY_GROUP'
export RTC_FUZZ_NOVELTY_ALLOW_EMPTY_MATERIALIZATION_NO_PRODUCT_STARTUP_CANARY='$NOVELTY_ALLOW_EMPTY_MATERIALIZATION_NO_PRODUCT_STARTUP_CANARY'
export RTC_FUZZ_NOVELTY_ALLOW_SUCCESS_DEFICIT_STARTUP_NOISE_CANARY='$NOVELTY_ALLOW_SUCCESS_DEFICIT_STARTUP_NOISE_CANARY'
export RTC_FUZZ_NOVELTY_ALLOW_DISABLED_POLICY_GUARDS='$NOVELTY_ALLOW_DISABLED_POLICY_GUARDS'
export RTC_FUZZ_NOVELTY_PAUSE_ON_STARTUP_FAILURE='$NOVELTY_PAUSE_ON_STARTUP_FAILURE'
export RTC_FUZZ_NOVELTY_PAUSE_ON_TRIAGE_NOISE='$NOVELTY_PAUSE_ON_TRIAGE_NOISE'
export RTC_FUZZ_NOVELTY_SUCCESS_DEFICIT_BOOTSTRAP_SLOTS='$NOVELTY_SUCCESS_DEFICIT_BOOTSTRAP_SLOTS'
	export RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS='$NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS'
	export RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS='$NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS'
	export RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT='$NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT'
	export RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR='$NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR'
export RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR='$NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR'
export RTC_FUZZ_NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS='$NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS'
export RTC_FUZZ_NOVELTY_DEADLINE_COVERAGE_GAP_MIN_RESERVED_GROUPS='$NOVELTY_DEADLINE_COVERAGE_GAP_MIN_RESERVED_GROUPS'
export RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP='$DEADLINE_BENCHMARK_CANARY_BUDGET_CAP'
export RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY='$NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY'
export RTC_FUZZ_BENCHMARK_CANARY_FEEDBACK_BASE='$BENCHMARK_FEEDBACK_BASE'
export RTC_FUZZ_BENCHMARK_CANARY_FEEDBACK_TSV='$BENCHMARK_FEEDBACK_TSV'
export RTC_FUZZ_NOVELTY_AUTO_GOAL_EXPANSION='1'
export RTC_FUZZ_NOVELTY_AUTO_GOAL_EXPANSION_THRESHOLD='3'
export RTC_FUZZ_NOVELTY_AUTO_GOAL_EXPANSION_BATCH_SIZE='12'
export RTC_FUZZ_NOVELTY_INCLUDE_RECHECK_COVERAGE='1'
export RTC_FUZZ_NOVELTY_COVERAGE_CODEX='1'
export RTC_FUZZ_NOVELTY_COVERAGE_CODEX_CWD='$HARNESS_REPO'
export RTC_FUZZ_CODEX_BIN='$CODEX_BIN_DIR/codex'
export RTC_FUZZ_NOVELTY_COVERAGE_CODEX_INTERVAL_MINUTES='$NOVELTY_CODEX_INTERVAL_MINUTES'
export RTC_FUZZ_NOVELTY_COVERAGE_GUIDANCE_STALL_PASSES='2'
export RTC_FUZZ_NOVELTY_COVERAGE_QUALITY_ISSUE_PASSES='2'
export RTC_FUZZ_LOW_DISK_MODE='1'
export RTC_FUZZ_PLAYWRIGHT_VIDEO='off'
export NODE_OPTIONS="\${NODE_OPTIONS:---max-old-space-size=24576}"
node bin/rtc-browser-fuzz-novelty-monitor.mjs >> '$BASE/logs/monitor.log' 2>&1
code=\$?
stamp=\$(date -u +%Y-%m-%dT%H:%M:%SZ)
printf '[%s] MONITOR_EXIT code=%s output=%s\n' "\$stamp" "\$code" '$OUT' >> '$BASE/logs/monitor.log'
printf '[%s] MONITOR_EXIT code=%s\n' "\$stamp" "\$code" >> '$OUT/novelty-monitor.log'
exit "\$code"
RUN
chmod +x "$RUN_SCRIPT"
LIVE_ANALYSIS_SCRIPT="$OUT/run-live-analysis.sh"
cat > "$LIVE_ANALYSIS_SCRIPT" <<RUN
#!/usr/bin/env bash
set -u
cd '$PRODUCT_REPO'
export PATH='$CODEX_BIN_DIR':'$TMUX_WRAP':'$NODE_BIN':\$PATH
export CI=1
export RTC_TMUX_SOCKET='rtc-analysis'
export RTC_FUZZ_LIVE_ANALYSIS_CURRENT_OUTPUT_POINTER='$BASE/current-output-dir.txt'
export RTC_FUZZ_LIVE_ANALYSIS_TMUX_PREFIX='rtc-cov-analysis'
export RTC_FUZZ_LIVE_DEEP_ANALYSIS_TMUX_PREFIX='rtc-cov-deep'
export RTC_FUZZ_LIVE_ANALYSIS_MAX_PARALLEL='1'
export RTC_FUZZ_LIVE_ANALYSIS_MAX_ATTEMPTS='4'
export RTC_FUZZ_LIVE_DEEP_ANALYSIS_MAX_PARALLEL='1'
node bin/rtc-browser-fuzz-live-analysis-monitor.mjs '$OUT' >> '$BASE/logs/live-analysis-monitor.log' 2>&1
code=\$?
stamp=\$(date -u +%Y-%m-%dT%H:%M:%SZ)
printf '[%s] LIVE_ANALYSIS_EXIT code=%s output=%s\n' "\$stamp" "\$code" '$OUT' >> '$BASE/logs/live-analysis-monitor.log'
printf '[%s] LIVE_ANALYSIS_EXIT code=%s\n' "\$stamp" "\$code" >> '$OUT/live-analysis-monitor.log'
exit "\$code"
RUN
chmod +x "$LIVE_ANALYSIS_SCRIPT"

# Keep the start lock through tmux session creation so supervisors do not see a
# cleanup/relaunch gap as a missing pool. Close the fd only for tmux clients so
# the long-lived tmux server cannot inherit it and block later restarts.
tmux new-session -d -s rtc-coverage-guided-novelty "$RUN_SCRIPT" 8>&-
tmux kill-session -t rtc-coverage-guided-analysis 2>/dev/null 8>&- || true
RTC_TMUX_SOCKET=rtc-analysis tmux kill-session -t rtc-coverage-guided-analysis 2>/dev/null 8>&- || true
RTC_TMUX_SOCKET=rtc-analysis tmux new-session -d -s rtc-coverage-guided-analysis "$LIVE_ANALYSIS_SCRIPT" 8>&-
echo "OUT=$OUT"
tmux ls 8>&- | grep -E 'rtc-coverage-guided|rtc-fuzz-strict|rtc-fuzz-iso' || true

flock -u 8
exec 8>&-
