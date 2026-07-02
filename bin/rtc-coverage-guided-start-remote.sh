#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN_DIR=${HOME:-/home/exouser}/.local/bin
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin
REPO=/media/volume/danluu-fuzz-data/rtc-all-merged-fuzz-20260526T195420Z/repo
BASE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-all-merged-20260526T195420Z
NOVELTY_SESSION=rtc-coverage-guided-all-merged-novelty
ANALYSIS_SESSION=rtc-coverage-guided-all-merged-analysis
SUPERVISOR_SESSION=rtc-coverage-guided-all-merged-supervisor
LIVE_ANALYSIS_TMUX_PREFIX=rtc-cov-all-merged-analysis
LIVE_DEEP_ANALYSIS_TMUX_PREFIX=rtc-cov-all-merged-deep
CUMULATIVE_ROOTS_FILE="$BASE/cumulative-observed-roots.txt"
START_LOCK="$BASE/start-v2.lock"
MAX_OBSERVED_ROOTS=${RTC_FUZZ_NOVELTY_MAX_OBSERVED_ROOTS:-20}
mkdir -p "$TMUX_WRAP" "$BASE/logs"
exec 8>"$START_LOCK"
flock 8
cat > "$TMUX_WRAP/tmux" <<'SH'
#!/usr/bin/env bash
exec /usr/bin/tmux -L rtc-fuzz "$@"
SH
chmod +x "$TMUX_WRAP/tmux"
export PATH="$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:$PATH"

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
OUT=$BASE/run-$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$OUT"
if [ -x "$REPO/bin/rtc-coverage-guided-cleanup-remote.sh" ]; then
	bash "$REPO/bin/rtc-coverage-guided-cleanup-remote.sh" || true
elif [ -x /tmp/cleanup_rtc_coverage_guided_remote.sh ]; then
	/tmp/cleanup_rtc_coverage_guided_remote.sh || true
else
	tmux kill-session -t "$NOVELTY_SESSION" 2>/dev/null || true
	tmux kill-session -t "$SUPERVISOR_SESSION" 2>/dev/null || true
fi
printf '%s\n' "$OUT" > "$BASE/current-output-dir.txt"
{
	printf '# RTC Novelty Monitor\n\n'
	printf 'Updated: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
	printf 'Output dir: %s\n' "$OUT"
	printf 'Supervisor session: %s\n' "$SUPERVISOR_SESSION"
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
		printf -- '- disabled: RTC_FUZZ_NOVELTY_DISABLE_STATE_CARRYOVER=1\n'
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
} | awk 'NF && !seen[$0]++' | sed -n "1,${MAX_OBSERVED_ROOTS}p" > "$OUT/observed-roots.txt"
cp "$OUT/observed-roots.txt" "$CUMULATIVE_ROOTS_FILE"
OBSERVED=$(paste -sd: "$OUT/observed-roots.txt")
if [ "$DISABLE_STATE_CARRYOVER" != "1" ] && [ -n "$PREVIOUS_COVERAGE" ] && [ -f "$PREVIOUS_COVERAGE/novelty-state.json" ]; then
	cp "$PREVIOUS_COVERAGE/novelty-state.json" "$OUT/novelty-state.json"
fi
BUDGET_ENV=${RTC_RESOURCE_BUDGET_ENV:-/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516/current-budget.env}
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
	EXPLICIT_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP=${RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP-}
EXPLICIT_BENCHMARK_CANARY_FEEDBACK_BASE=${RTC_FUZZ_BENCHMARK_CANARY_FEEDBACK_BASE-}
if [ -f "$BUDGET_ENV" ]; then
	# shellcheck disable=SC1090
	. "$BUDGET_ENV"
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
if [ -n "$EXPLICIT_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP" ]; then
	RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP="$EXPLICIT_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP"
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
NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP=${RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP:-0}
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
				print "novelty-http-self-presence-ui-signals"
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
				print "novelty-http-self-presence-ui-signals"
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
			NOVELTY_BUDGET_DISABLED=0
			if [ "${NOVELTY_TARGET_ENABLED_GROUPS:-0}" -le 0 ] && [ "${NOVELTY_MAX_ENABLED_GROUPS:-0}" -le 0 ]; then
				NOVELTY_BUDGET_DISABLED=1
				DEADLINE_BENCHMARK_CANARY_BUDGET_CAP=0
				BENCHMARK_CANARY_PRIMARY_GROUP_COUNT=0
				BENCHMARK_CANARY_PROMOTION_BLOCKED_GROUP_COUNT=0
				BENCHMARK_CANARY_PRIMARY_GROUPS=''
				BENCHMARK_CANARY_PROMOTION_BLOCKED_GROUPS=''
				NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS=0
				NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS=0
				NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT=0
				NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR=''
				NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR=''
				NOVELTY_ZERO_COVERAGE_BENCHMARK_CANARY_MIN_ACTIVE_GROUPS=0
				NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS=0
				NOVELTY_DEADLINE_COVERAGE_GAP_MIN_RESERVED_GROUPS=0
			fi
			if [ "$NOVELTY_BUDGET_DISABLED" != "1" ] && [ "${NOVELTY_MAX_ENABLED_GROUPS:-0}" -le 5 ]; then
				DEADLINE_BENCHMARK_CANARY_BUDGET_CAP=1
		fi
	case "${NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT:-}" in
		1|2|3|4)
			DEADLINE_BENCHMARK_CANARY_BUDGET_CAP=1
			;;
		esac
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
			NOVELTY_DEADLINE_CANARY_CAP_GROUPS=${NOVELTY_MAX_ENABLED_GROUPS:-5}
			[[ "$NOVELTY_DEADLINE_CANARY_CAP_GROUPS" =~ ^[0-9]+$ ]] || NOVELTY_DEADLINE_CANARY_CAP_GROUPS=5
			[ "$NOVELTY_DEADLINE_CANARY_CAP_GROUPS" -lt 1 ] && NOVELTY_DEADLINE_CANARY_CAP_GROUPS=1
			[ "$NOVELTY_DEADLINE_CANARY_CAP_GROUPS" -gt 5 ] && NOVELTY_DEADLINE_CANARY_CAP_GROUPS=5
			NOVELTY_TARGET_ENABLED_GROUPS=$NOVELTY_DEADLINE_CANARY_CAP_GROUPS
			NOVELTY_MAX_ENABLED_GROUPS=$NOVELTY_DEADLINE_CANARY_CAP_GROUPS
			NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS=$NOVELTY_DEADLINE_CANARY_CAP_GROUPS
			NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS=$NOVELTY_DEADLINE_CANARY_CAP_GROUPS
			NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS=$NOVELTY_DEADLINE_CANARY_CAP_GROUPS
			NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS=$NOVELTY_DEADLINE_CANARY_CAP_GROUPS
			NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS=0
			NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT=''
			NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR=$NOVELTY_DEADLINE_CANARY_CAP_GROUPS
			NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR=0
		fi
	if [ -z "$NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS" ]; then
		if [ "$DEADLINE_BENCHMARK_CANARY_BUDGET_CAP" -eq 1 ]; then
			NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS=1
		else
			NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS="$NOVELTY_ZERO_COVERAGE_BOOTSTRAP_SLOTS"
		fi
	fi
	if [ "$BENCHMARK_CANARY_PRIMARY_GROUP_COUNT" -gt 0 ] &&
		[ "$STRICT_BENCHMARK_CANARY_CAP" -ne 1 ] &&
		[ "$DEADLINE_BENCHMARK_CANARY_BUDGET_CAP" -ne 1 ]; then
		NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS:-10}
		[[ "$NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS" =~ ^[0-9]+$ ]] || NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS=10
		CONFIGURED_BENCHMARK_CANARY_SLOT_FLOOR=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR:-0}
		BENCHMARK_CANARY_SLOT_FLOOR=$(bump_min_int "$CONFIGURED_BENCHMARK_CANARY_SLOT_FLOOR" "$BENCHMARK_CANARY_PROMOTION_BLOCKED_GROUP_COUNT")
		COVERAGE_GAP_SLOT_FLOOR=$BENCHMARK_CANARY_PROMOTION_BLOCKED_GROUP_COUNT
		BENCHMARK_CANARY_SLOT_FLOOR=$(bump_min_int "$BENCHMARK_CANARY_SLOT_FLOOR" "$COVERAGE_GAP_SLOT_FLOOR")
		if [ "$NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS" -gt 0 ] &&
			[ "$BENCHMARK_CANARY_SLOT_FLOOR" -gt "$NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS" ]; then
			BENCHMARK_CANARY_SLOT_FLOOR="$NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS"
		fi
		BENCHMARK_CANARY_FINALIZATION_SLOT_FLOOR="$BENCHMARK_CANARY_SLOT_FLOOR"
		OPEN_BENCHMARK_CANARY_REQUIRED_EXTRA_SLOTS=${RTC_FUZZ_NOVELTY_OPEN_BENCHMARK_CANARY_REQUIRED_EXTRA_SLOTS:-9}
		[[ "$OPEN_BENCHMARK_CANARY_REQUIRED_EXTRA_SLOTS" =~ ^[0-9]+$ ]] || OPEN_BENCHMARK_CANARY_REQUIRED_EXTRA_SLOTS=9
		BENCHMARK_CANARY_REQUIRED_SLOT_FLOOR="$BENCHMARK_CANARY_FINALIZATION_SLOT_FLOOR"
		if [ "$BENCHMARK_CANARY_PROMOTION_BLOCKED_GROUP_COUNT" -gt 0 ]; then
			BENCHMARK_CANARY_REQUIRED_SLOT_FLOOR=$((BENCHMARK_CANARY_PROMOTION_BLOCKED_GROUP_COUNT + OPEN_BENCHMARK_CANARY_REQUIRED_EXTRA_SLOTS))
			BENCHMARK_CANARY_SLOT_FLOOR=$(bump_min_int "$BENCHMARK_CANARY_FINALIZATION_SLOT_FLOOR" "$BENCHMARK_CANARY_REQUIRED_SLOT_FLOOR")
		fi
		NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR="$BENCHMARK_CANARY_SLOT_FLOOR"
	NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR=1
	NOVELTY_TARGET_ENABLED_GROUPS=$(bump_min_int "$NOVELTY_TARGET_ENABLED_GROUPS" "$BENCHMARK_CANARY_SLOT_FLOOR")
	NOVELTY_MAX_ENABLED_GROUPS=$(bump_min_int "$NOVELTY_MAX_ENABLED_GROUPS" "$BENCHMARK_CANARY_SLOT_FLOOR")
	NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS=$(bump_min_int "$NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS" "$BENCHMARK_CANARY_SLOT_FLOOR")
	NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS=$(bump_min_int "$NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS" "$BENCHMARK_CANARY_SLOT_FLOOR")
	NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS=$(bump_min_int "$NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS" "$BENCHMARK_CANARY_SLOT_FLOOR")
	NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS=$(bump_min_int "$NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS" "$BENCHMARK_CANARY_PROMOTION_BLOCKED_GROUP_COUNT")
	LOW_DISK_PRODUCER_CAP_FREE_GIB=${RTC_FUZZ_LOW_DISK_PRODUCER_CAP_FREE_GIB:-200}
	DATA_DISK_AVAILABLE_GIB_FOR_CAP=$(
		df -BG /media/volume/danluu-fuzz-data 2>/dev/null |
			awk 'NR == 2 { gsub(/G/, "", $4); print int($4) }'
	)
	if [ "${RTC_FUZZ_LOW_DISK_MODE:-0}" = "1" ] &&
		[ -n "$DATA_DISK_AVAILABLE_GIB_FOR_CAP" ] &&
		[ "$DATA_DISK_AVAILABLE_GIB_FOR_CAP" -lt "$LOW_DISK_PRODUCER_CAP_FREE_GIB" ]; then
		NOVELTY_TARGET_ENABLED_GROUPS=1
		NOVELTY_MAX_ENABLED_GROUPS=2
		NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS=1
		NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS=2
		NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS=2
		NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS=1
		NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS=0
		NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT=1
		NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR=''
		NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR=0
		NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS=0
		NOVELTY_DEADLINE_COVERAGE_GAP_MIN_RESERVED_GROUPS=0
		DEADLINE_BENCHMARK_CANARY_BUDGET_CAP=1
	fi
	{
		printf 'feedback_tsv\t%s\n' "$BENCHMARK_FEEDBACK_TSV"
		printf 'primary_group_count\t%s\n' "$BENCHMARK_CANARY_PRIMARY_GROUP_COUNT"
		printf 'promotion_blocked_group_count\t%s\n' "$BENCHMARK_CANARY_PROMOTION_BLOCKED_GROUP_COUNT"
		printf 'configured_slot_floor\t%s\n' "$CONFIGURED_BENCHMARK_CANARY_SLOT_FLOOR"
		printf 'zero_coverage_bootstrap_slots\t%s\n' "$NOVELTY_ZERO_COVERAGE_BOOTSTRAP_SLOTS"
		printf 'finalization_slot_floor\t%s\n' "$BENCHMARK_CANARY_FINALIZATION_SLOT_FLOOR"
		printf 'required_extra_slots\t%s\n' "$OPEN_BENCHMARK_CANARY_REQUIRED_EXTRA_SLOTS"
		printf 'required_slot_floor\t%s\n' "$BENCHMARK_CANARY_REQUIRED_SLOT_FLOOR"
		printf 'slot_floor\t%s\n' "$BENCHMARK_CANARY_SLOT_FLOOR"
		printf 'primary_groups\t%s\n' "$(printf '%s\n' "$BENCHMARK_CANARY_PRIMARY_GROUPS" | paste -sd, -)"
		printf 'promotion_blocked_groups\t%s\n' "$(printf '%s\n' "$BENCHMARK_CANARY_PROMOTION_BLOCKED_GROUPS" | paste -sd, -)"
		printf 'target_enabled_groups\t%s\n' "$NOVELTY_TARGET_ENABLED_GROUPS"
		printf 'max_enabled_groups\t%s\n' "$NOVELTY_MAX_ENABLED_GROUPS"
		printf 'coverage_guided_target_enabled_groups\t%s\n' "$NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS"
		printf 'coverage_guided_max_enabled_groups\t%s\n' "$NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS"
		printf 'coverage_quality_max_enabled_groups\t%s\n' "$NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS"
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
export RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP='$DEADLINE_BENCHMARK_CANARY_BUDGET_CAP'
export RTC_FUZZ_BENCHMARK_CANARY_FEEDBACK_BASE='$BENCHMARK_FEEDBACK_BASE'
export RTC_FUZZ_BENCHMARK_CANARY_FEEDBACK_TSV='$BENCHMARK_FEEDBACK_TSV'
BUDGET
mv "$RESOURCE_AUTOSCALER_BUDGET_ENV.tmp" "$RESOURCE_AUTOSCALER_BUDGET_ENV"
cat > "$RUN_SCRIPT" <<RUN
#!/usr/bin/env bash
set -u
cd '$REPO'
export PATH='$CODEX_BIN_DIR':'$TMUX_WRAP':'$NODE_BIN':\$PATH
export CI=1
export RTC_FUZZ_NOVELTY_OUTPUT_DIR='$OUT'
export RTC_FUZZ_NOVELTY_OBSERVED_RUN_DIRS='$OBSERVED'
export RTC_FUZZ_NOVELTY_SUPERVISOR_SESSION='$SUPERVISOR_SESSION'
export RTC_FUZZ_NOVELTY_BASE_URL='http://localhost:26600'
export RTC_FUZZ_NOVELTY_WP_ENV_PORT='26600'
export RTC_FUZZ_NOVELTY_WS_PORT='29380'
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
export RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP='$DEADLINE_BENCHMARK_CANARY_BUDGET_CAP'
export RTC_FUZZ_BENCHMARK_CANARY_FEEDBACK_BASE='$BENCHMARK_FEEDBACK_BASE'
export RTC_FUZZ_BENCHMARK_CANARY_FEEDBACK_TSV='$BENCHMARK_FEEDBACK_TSV'
export RTC_FUZZ_NOVELTY_AUTO_GOAL_EXPANSION='1'
export RTC_FUZZ_NOVELTY_AUTO_GOAL_EXPANSION_THRESHOLD='3'
export RTC_FUZZ_NOVELTY_AUTO_GOAL_EXPANSION_BATCH_SIZE='12'
export RTC_FUZZ_NOVELTY_INCLUDE_RECHECK_COVERAGE='1'
export RTC_FUZZ_NOVELTY_COVERAGE_CODEX='1'
export RTC_FUZZ_NOVELTY_COVERAGE_CODEX_CWD='$REPO'
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
cd '$REPO'
export PATH='$CODEX_BIN_DIR':'$TMUX_WRAP':'$NODE_BIN':\$PATH
export CI=1
export RTC_FUZZ_LIVE_ANALYSIS_CURRENT_OUTPUT_POINTER='$BASE/current-output-dir.txt'
export RTC_FUZZ_LIVE_ANALYSIS_TMUX_PREFIX='$LIVE_ANALYSIS_TMUX_PREFIX'
export RTC_FUZZ_LIVE_DEEP_ANALYSIS_TMUX_PREFIX='$LIVE_DEEP_ANALYSIS_TMUX_PREFIX'
export RTC_FUZZ_LIVE_ANALYSIS_MAX_PARALLEL='2'
export RTC_FUZZ_LIVE_ANALYSIS_MAX_ATTEMPTS='4'
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
tmux new-session -d -s "$NOVELTY_SESSION" "$RUN_SCRIPT" 8>&-
tmux kill-session -t "$ANALYSIS_SESSION" 2>/dev/null 8>&- || true
tmux new-session -d -s "$ANALYSIS_SESSION" "$LIVE_ANALYSIS_SCRIPT" 8>&-
echo "OUT=$OUT"
tmux ls 8>&- | grep -E 'rtc-coverage-guided|rtc-fuzz-strict|rtc-fuzz-iso' || true

flock -u 8
exec 8>&-
