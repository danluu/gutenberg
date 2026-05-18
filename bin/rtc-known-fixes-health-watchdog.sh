#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="${RTC_KNOWN_FIXES_REPO_ROOT:-$( git rev-parse --show-toplevel )}"
RUN_ROOT="${RTC_KNOWN_FIXES_RUN_ROOT:-$REPO_ROOT/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544}"
if [ -n "${RTC_KNOWN_FIXES_FUZZ_MATRIX_SCRIPT:-}" ]; then
	FUZZ_MATRIX_SCRIPT="$RTC_KNOWN_FIXES_FUZZ_MATRIX_SCRIPT"
elif [ -x "$SCRIPT_DIR/rtc-known-fixes-fuzz-matrix.sh" ]; then
	FUZZ_MATRIX_SCRIPT="$SCRIPT_DIR/rtc-known-fixes-fuzz-matrix.sh"
elif [ -x "$RUN_ROOT/run-known-fixes-fuzz-matrix.sh" ]; then
	FUZZ_MATRIX_SCRIPT="$RUN_ROOT/run-known-fixes-fuzz-matrix.sh"
else
	FUZZ_MATRIX_SCRIPT="$SCRIPT_DIR/rtc-known-fixes-fuzz-matrix.sh"
fi
WATCHDOG_DIR="$RUN_ROOT/health-watchdog"
SESSION_STATE_DIR="$WATCHDOG_DIR/sessions"
SESSION="${RTC_KNOWN_FIXES_HEALTH_SESSION:-rtc-known-fixes-health-current-20260515}"
EXTRA_SESSION_PREFIX="${RTC_KNOWN_FIXES_HEALTH_EXTRA_SESSION_PREFIX:-rtc-known-fixes-health-extra-20260515-}"
INTERVAL_SECONDS="${RTC_KNOWN_FIXES_HEALTH_WATCHDOG_INTERVAL_SECONDS:-120}"
STALE_SECONDS="${RTC_KNOWN_FIXES_HEALTH_WATCHDOG_STALE_SECONDS:-900}"
STARTUP_STALE_SECONDS="${RTC_KNOWN_FIXES_HEALTH_WATCHDOG_STARTUP_STALE_SECONDS:-420}"
EXPECTED_BRANCH="${RTC_KNOWN_FIXES_BRANCH:-try/rtc-77716-fixes-20260513}"
TRUNK_REF="${RTC_KNOWN_FIXES_TRUNK_REF:-origin/trunk}"
LANE_FILTER_OVERRIDE="${RTC_KNOWN_FIXES_LANE_FILTER:-}"
LANE_SEQUENCE="${RTC_KNOWN_FIXES_HEALTH_LANE_SEQUENCE:-http-real-user-editing,http-real-user-rich-text http-structure,http-parser-transform http-revision-persistence,http-autosave-revision http-common-length-document,http-block-gauntlet http-media-async,http-dynamic-blocks,http-cross-entity ws-three-user-late-join ws-real-user-editing}"
DURATION_HOURS="${RTC_KNOWN_FIXES_FUZZ_DURATION_HOURS:-2}"
MAX_ELASTIC_EXTRAS="${RTC_KNOWN_FIXES_HEALTH_MAX_ELASTIC_EXTRAS:-4}"
NORMAL_ELASTIC_EXTRAS="${RTC_KNOWN_FIXES_HEALTH_NORMAL_ELASTIC_EXTRAS:-3}"
IDLE_ELASTIC_EXTRAS="${RTC_KNOWN_FIXES_HEALTH_IDLE_ELASTIC_EXTRAS:-4}"
IDLE_CPU_PERCENT="${RTC_KNOWN_FIXES_HEALTH_IDLE_CPU_PERCENT:-65}"
HIGH_CPU_IDLE_FLOOR_PERCENT="${RTC_KNOWN_FIXES_HEALTH_HIGH_CPU_IDLE_FLOOR_PERCENT:-10}"
LOW_MEMORY_FREE_PERCENT="${RTC_KNOWN_FIXES_HEALTH_LOW_MEMORY_FREE_PERCENT:-8}"
IDLE_MEMORY_FREE_PERCENT="${RTC_KNOWN_FIXES_HEALTH_IDLE_MEMORY_FREE_PERCENT:-30}"
HIGH_COMPRESSOR_MB="${RTC_KNOWN_FIXES_HEALTH_HIGH_COMPRESSOR_MB:-18000}"
VIDEO_CLEANUP_INTERVAL_SECONDS="${RTC_KNOWN_FIXES_VIDEO_CLEANUP_INTERVAL_SECONDS:-21600}"
VIDEO_CLEANUP_ROOT="${RTC_KNOWN_FIXES_VIDEO_CLEANUP_ROOT:-$RUN_ROOT}"
ACTIVE_RUNS_PATH="$RUN_ROOT/active-health-runs.json"
LAST_LANE_PATH="$RUN_ROOT/last-health-lane.txt"

mkdir -p "$WATCHDOG_DIR" "$SESSION_STATE_DIR" "$WATCHDOG_DIR/video-cleanup-logs"
LOG="$WATCHDOG_DIR/health-watchdog.log"
STATUS="$WATCHDOG_DIR/health-watchdog-status.json"
CURRENT_LANE_PATH="$RUN_ROOT/current-health-lane.txt"
VIDEO_CLEANUP_LAST_PATH="$WATCHDOG_DIR/video-cleanup-last.txt"
LAST_RESOURCE_JSON="null"
LAST_MANAGED_JSON="[]"
LAST_DESIRED_EXTRAS="null"

json_escape() {
	node -e 'process.stdout.write(JSON.stringify(process.argv[1] ?? ""))' "$1"
}

log() {
	printf '%s %s\n' "$( date -u +%Y-%m-%dT%H:%M:%SZ )" "$*" >> "$LOG"
}

state_age_seconds() {
	local state_path="$1"
	node -e '
const fs = require("fs");
const path = process.argv[1];
try {
	const state = JSON.parse(fs.readFileSync(path, "utf8"));
	const ts = Date.parse(state.lastUpdatedAt || state.startedAt || 0);
	if (!Number.isFinite(ts)) process.exit(2);
	console.log(Math.max(0, Math.floor((Date.now() - ts) / 1000)));
} catch {
	process.exit(2);
}
' "$state_path"
}

state_value() {
	local state_path="$1"
	local key="$2"
	node -e '
const fs = require("fs");
const state = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const value = state[process.argv[2]];
if (value === undefined || value === null) process.exit(1);
process.stdout.write(String(value));
' "$state_path"
}

run_age_seconds() {
	local run_set="$1"
	node -e '
const fs = require("fs");
const path = require("path");
const metadataPath = path.join(process.argv[1], process.argv[2], "run-metadata.env");
try {
	const text = fs.readFileSync(metadataPath, "utf8");
	const match = text.match(/^startedAt=(.+)$/m);
	const ts = Date.parse(match?.[1] || "");
	if (!Number.isFinite(ts)) process.exit(2);
	console.log(Math.max(0, Math.floor((Date.now() - ts) / 1000)));
} catch {
	process.exit(2);
}
' "$RUN_ROOT" "$run_set"
}

write_status() {
	local status="$1"
	local reason="$2"
	local run_set="${3:-}"
	local age="${4:-}"
	local lane_filter="${5:-}"
	local head trunk base
	head="$( git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || echo unknown )"
	trunk="$( git -C "$REPO_ROOT" rev-parse "$TRUNK_REF" 2>/dev/null || echo unknown )"
	base="$( git -C "$REPO_ROOT" merge-base HEAD "$TRUNK_REF" 2>/dev/null || echo unknown )"
	cat > "$STATUS" <<EOF
{
  "checkedAt": "$( date -u +%Y-%m-%dT%H:%M:%SZ )",
  "status": $( json_escape "$status" ),
  "reason": $( json_escape "$reason" ),
  "session": $( json_escape "$SESSION" ),
  "runSet": $( json_escape "$run_set" ),
  "laneFilter": $( json_escape "$lane_filter" ),
  "stateAgeSeconds": $( [ -n "$age" ] && printf '%s' "$age" || printf 'null' ),
  "resource": $LAST_RESOURCE_JSON,
  "desiredElasticExtras": $LAST_DESIRED_EXTRAS,
  "managedSessions": $LAST_MANAGED_JSON,
  "head": $( json_escape "$head" ),
  "trunkRef": $( json_escape "$TRUNK_REF" ),
  "trunkHead": $( json_escape "$trunk" ),
  "mergeBase": $( json_escape "$base" )
}
EOF
}

primary_lane_from_filter() {
	local lane_filter="$1"
	printf '%s\n' "${lane_filter%%,*}"
}

lane_state_summary() {
	local run_set="$1"
	local lane_filter="$2"
	node -e '
const fs = require("fs");
const path = require("path");
const [runRoot, runSet, laneFilter] = process.argv.slice(1);
const now = Date.now();
const lanes = laneFilter.split(",").map((lane) => lane.trim()).filter(Boolean);
const states = [];
for (const lane of lanes) {
	const statePath = path.join(runRoot, runSet, lane, "state.json");
	let state = null;
	try {
		state = JSON.parse(fs.readFileSync(statePath, "utf8"));
	} catch {}
	if (!state) {
		states.push({ lane, exists: false, active: false, stopped: false, ageSeconds: null });
		continue;
	}
	const ts = Date.parse(state.lastUpdatedAt || state.startedAt || 0);
	const ageSeconds = Number.isFinite(ts) ? Math.max(0, Math.floor((now - ts) / 1000)) : null;
	const stopped = Boolean(state.stopReason);
	states.push({
		lane,
		exists: true,
		active: !stopped,
		stopped,
		ageSeconds,
		stopReason: state.stopReason || null,
		successes: Number(state.successes || 0),
		realBugs: Number(state.realBugs || 0),
		uncertainFailures: Number(state.uncertainFailures || 0),
		notRealFailures: Number(state.notRealFailures || 0),
		infraFailures: Number(state.infraFailures || 0),
	});
}
const active = states.filter((state) => state.active).length;
const stopped = states.filter((state) => state.stopped).length;
const missing = states.filter((state) => !state.exists).length;
const activeAges = states.filter((state) => state.active && state.ageSeconds !== null).map((state) => state.ageSeconds);
process.stdout.write(JSON.stringify({
	lanes,
	states,
	active,
	stopped,
	missing,
	maxActiveAgeSeconds: activeAges.length ? Math.max(...activeAges) : null,
}));
' "$RUN_ROOT" "$run_set" "$lane_filter"
}

summary_value() {
	local summary="$1"
	local key="$2"
	node -e 'const summary = JSON.parse(process.argv[1]); const value = summary[process.argv[2]]; process.stdout.write(value === null || value === undefined ? "" : String(value));' "$summary" "$key"
}

maybe_cleanup_generated_videos() {
	local now last elapsed log_path summary count bytes

	now="$( date +%s )"
	last="$( cat "$VIDEO_CLEANUP_LAST_PATH" 2>/dev/null || echo 0 )"
	elapsed=$(( now - last ))
	if [ "$elapsed" -lt "$VIDEO_CLEANUP_INTERVAL_SECONDS" ]; then
		return 0
	fi

	printf '%s\n' "$now" > "$VIDEO_CLEANUP_LAST_PATH"
	log_path="$WATCHDOG_DIR/video-cleanup-logs/generated-video-cleanup-$( date -u +%Y%m%dT%H%M%SZ ).tsv"
	: > "$log_path"

	find "$VIDEO_CLEANUP_ROOT" \( -path '*/node_modules/*' -o -path '*/.git/*' \) -prune -o \
		-type f \( -iname '*.webm' -o -iname '*.mp4' -o -iname '*.mov' -o -iname '*.mkv' \) \
		\( -path '*/artifacts/*' -o -path '*/test-results/*' -o -path '*/playwright-report/*' -o -path '*/blob-report/*' \) \
		-print0 | while IFS= read -r -d '' file_path; do
			size="$( stat -f '%z' "$file_path" 2>/dev/null || printf '0' )"
			printf '%s\t%s\n' "$size" "$file_path" >> "$log_path"
			rm -f -- "$file_path"
		done

	summary="$( awk '{ bytes += $1; count += 1 } END { printf "%d %d", count, bytes }' "$log_path" )"
	count="${summary%% *}"
	bytes="${summary#* }"
	log "generated-video-cleanup root=$VIDEO_CLEANUP_ROOT deletedCount=${count:-0} deletedBytes=${bytes:-0} log=$log_path"
}

current_lane_filter() {
	if [ -f "$CURRENT_LANE_PATH" ]; then
		cat "$CURRENT_LANE_PATH"
		return
	fi
	printf '%s\n' "http-real-user-editing"
}

session_state_file() {
	printf '%s/%s.env\n' "$SESSION_STATE_DIR" "$( printf '%s' "$1" | tr -c '[:alnum:]_.-' '-' )"
}

write_session_state() {
	local session="$1"
	local role="$2"
	local run_set="$3"
	local lane_filter="$4"
	local file
	file="$( session_state_file "$session" )"
	{
		printf 'session=%q\n' "$session"
		printf 'role=%q\n' "$role"
		printf 'runSet=%q\n' "$run_set"
		printf 'laneFilter=%q\n' "$lane_filter"
		printf 'startedAt=%q\n' "$( date -u +%Y-%m-%dT%H:%M:%SZ )"
	} > "$file"
}

read_session_field() {
	local session="$1"
	local key="$2"
	local file
	file="$( session_state_file "$session" )"
	if [ ! -f "$file" ]; then
		return 1
	fi
	(
		set +u
		# shellcheck disable=SC1090
		. "$file"
		case "$key" in
			runSet) printf '%s' "${runSet:-}" ;;
			laneFilter) printf '%s' "${laneFilter:-}" ;;
			role) printf '%s' "${role:-}" ;;
			*) return 1 ;;
		esac
	)
}

extra_session_name() {
	local index="$1"
	printf '%s%s' "$EXTRA_SESSION_PREFIX" "$index"
}

lane_filter_is_active() {
	local candidate="$1"
	local active_filters="$2"
	case "|$active_filters|" in
		*"|$candidate|"*) return 0 ;;
		*) return 1 ;;
	esac
}

select_next_lane_filter_avoiding() {
	if [ -n "$LANE_FILTER_OVERRIDE" ]; then
		printf '%s\n' "$LANE_FILTER_OVERRIDE"
		return
	fi

	local active_filters="$1"
	local previous first lane found_next candidate
	previous="$( cat "$LAST_LANE_PATH" 2>/dev/null || current_lane_filter )"
	first=""
	found_next=0
	candidate=""

	for lane in $LANE_SEQUENCE; do
		if [ -z "$first" ]; then
			first="$lane"
		fi
		if [ "$found_next" = "1" ] && ! lane_filter_is_active "$lane" "$active_filters"; then
			candidate="$lane"
			break
		fi
		if [ "$lane" = "$previous" ]; then
			found_next=1
		fi
	done

	if [ -z "$candidate" ]; then
		for lane in $LANE_SEQUENCE; do
			if ! lane_filter_is_active "$lane" "$active_filters"; then
				candidate="$lane"
				break
			fi
		done
	fi

	printf '%s\n' "${candidate:-${first:-http-real-user-editing}}"
}

select_next_lane_filter() {
	if [ -n "$LANE_FILTER_OVERRIDE" ]; then
		printf '%s\n' "$LANE_FILTER_OVERRIDE"
		return
	fi

	local previous first lane found_next
	previous="$( current_lane_filter )"
	first=""
	found_next=0

	for lane in $LANE_SEQUENCE; do
		if [ -z "$first" ]; then
			first="$lane"
		fi
		if [ "$found_next" = "1" ]; then
			printf '%s\n' "$lane"
			return
		fi
		if [ "$lane" = "$previous" ]; then
			found_next=1
		fi
	done

	printf '%s\n' "${first:-http-real-user-editing}"
}

resource_snapshot() {
	node -e '
const { execFileSync } = require("child_process");

function tryExec(command, args) {
	try {
		return execFileSync(command, args, {
			encoding: "utf8",
			stdio: [ "ignore", "pipe", "ignore" ],
		});
	} catch {
		return "";
	}
}

function sizeToMb(value, unit) {
	const n = Number(value);
	if (!Number.isFinite(n)) return null;
	switch ((unit || "").toUpperCase()) {
		case "G":
			return n * 1024;
		case "M":
			return n;
		case "K":
			return n / 1024;
		default:
			return n;
	}
}

const top = tryExec("top", [ "-l", "1", "-n", "0" ]);
const memoryPressure = tryExec("memory_pressure", []);
const ncpu = Number(tryExec("sysctl", [ "-n", "hw.ncpu" ]).trim()) || null;
const loadMatch = top.match(/Load Avg:\s*([0-9.]+),\s*([0-9.]+),\s*([0-9.]+)/);
const idleMatch = top.match(/CPU usage:.*?([0-9.]+)% idle/);
const unusedMatch = top.match(/PhysMem:.*?,\s*([0-9.]+)([GMK]) unused/i);
const compressorMatch = top.match(/PhysMem:.*?([0-9.]+)([GMK]) compressor/i);
const freePercentMatch = memoryPressure.match(/System-wide memory free percentage:\s*([0-9.]+)%/);
const load1 = loadMatch ? Number(loadMatch[1]) : null;
const cpuIdlePercent = idleMatch ? Number(idleMatch[1]) : null;
const unusedMb = unusedMatch ? sizeToMb(unusedMatch[1], unusedMatch[2]) : null;
const compressorMb = compressorMatch ? sizeToMb(compressorMatch[1], compressorMatch[2]) : null;
const memoryFreePercent = freePercentMatch ? Number(freePercentMatch[1]) : null;
const idleCpuThreshold = Number(process.env.RTC_KNOWN_FIXES_HEALTH_IDLE_CPU_PERCENT || 65);
const highCpuIdleFloor = Number(process.env.RTC_KNOWN_FIXES_HEALTH_HIGH_CPU_IDLE_FLOOR_PERCENT || 10);
const lowMemoryFreePercent = Number(process.env.RTC_KNOWN_FIXES_HEALTH_LOW_MEMORY_FREE_PERCENT || 8);
const idleMemoryFreePercent = Number(process.env.RTC_KNOWN_FIXES_HEALTH_IDLE_MEMORY_FREE_PERCENT || 30);
const highCompressorMb = Number(process.env.RTC_KNOWN_FIXES_HEALTH_HIGH_COMPRESSOR_MB || 18000);
let mode = "normal";
const reasons = [];
if (cpuIdlePercent !== null && cpuIdlePercent < highCpuIdleFloor) reasons.push("low-cpu-idle");
if (memoryFreePercent !== null && memoryFreePercent < lowMemoryFreePercent) reasons.push("low-memory-free-percent");
if (compressorMb !== null && compressorMb > highCompressorMb) reasons.push("high-compressor");
if (load1 !== null && ncpu !== null && load1 > ncpu * 1.75) reasons.push("high-load");
if (reasons.length) {
	mode = "pressure";
} else if (
	(cpuIdlePercent === null || cpuIdlePercent >= idleCpuThreshold) &&
	(memoryFreePercent === null || memoryFreePercent >= idleMemoryFreePercent) &&
	(load1 === null || ncpu === null || load1 < ncpu * 0.75)
) {
	mode = "idle";
}
process.stdout.write(JSON.stringify({
	checkedAt: new Date().toISOString(),
	mode,
	reasons,
	ncpu,
	load1,
	cpuIdlePercent,
	unusedMb,
	compressorMb,
	memoryFreePercent,
}));
'
}

resource_mode() {
	node -e 'const r = JSON.parse(process.argv[1]); process.stdout.write(r.mode || "normal");' "$1"
}

desired_extras_for_resource() {
	local resource_json="$1"
	local mode desired
	mode="$( resource_mode "$resource_json" )"
	case "$mode" in
		pressure) desired=0 ;;
		idle) desired="$IDLE_ELASTIC_EXTRAS" ;;
		*) desired="$NORMAL_ELASTIC_EXTRAS" ;;
	esac
	if [ "$desired" -gt "$MAX_ELASTIC_EXTRAS" ]; then
		desired="$MAX_ELASTIC_EXTRAS"
	fi
	if [ "$desired" -lt 0 ]; then
		desired=0
	fi
	printf '%s\n' "$desired"
}

refresh_base_if_idle() {
	cd "$REPO_ROOT"
	git fetch origin trunk >> "$LOG" 2>&1 || return 1
	local current_branch
	current_branch="$( git branch --show-current )"
	if [ "$current_branch" != "$EXPECTED_BRANCH" ]; then
		log "refusing-refresh wrong-branch branch=$current_branch expected=$EXPECTED_BRANCH"
		return 1
	fi
	local behind
	behind="$( git rev-list --left-right --count HEAD..."$TRUNK_REF" 2>/dev/null | awk '{ print $2 }' )"
	if [ -n "$behind" ] && [ "$behind" != "0" ]; then
		log "rebasing-before-health-restart behind=$behind trunk=$TRUNK_REF"
		if ! git rebase --autostash "$TRUNK_REF" >> "$LOG" 2>&1; then
			log "rebase-failed-aborting"
			git rebase --abort >> "$LOG" 2>&1 || true
			return 1
		fi
	fi
}

start_health_run_for_session() {
	local target_session="$1"
	local role="$2"
	local lane_filter="$3"
	local update_current="$4"
	if [ "$role" = "primary" ]; then
		refresh_base_if_idle || log "base-refresh-before-restart-failed; starting from existing head"
	fi
	local head run_set run_dir
	head="$( git -C "$REPO_ROOT" rev-parse HEAD )"
	if [ "$role" = "primary" ]; then
		run_set="health-current-$( date -u +%Y%m%dT%H%M%SZ )"
	else
		run_set="health-extra-$( date -u +%Y%m%dT%H%M%SZ )-$( printf '%s' "$target_session" | tr -c '[:alnum:]' '-' )"
	fi
	run_dir="$RUN_ROOT/$run_set"
	mkdir -p "$run_dir"
	printf '%s\n' "$lane_filter" > "$run_dir/lane-filter.txt"
	write_session_state "$target_session" "$role" "$run_set" "$lane_filter"
	printf '%s\n' "$lane_filter" > "$LAST_LANE_PATH"
	if [ "$update_current" = "1" ]; then
		printf '%s\n' "$run_set" > "$RUN_ROOT/current-health-run.txt"
		printf '%s\n' "$lane_filter" > "$CURRENT_LANE_PATH"
	fi
	tmux new-session -d -s "$target_session" \
		"cd '$REPO_ROOT' && RTC_KNOWN_FIXES_REPO_ROOT='$REPO_ROOT' RTC_KNOWN_FIXES_RUN_ROOT='$RUN_ROOT' RTC_KNOWN_FIXES_FUZZ_SET='$run_set' RTC_KNOWN_FIXES_EXPECTED_HEAD_PREFIX='$head' RTC_KNOWN_FIXES_LANE_FILTER='$lane_filter' RTC_KNOWN_FIXES_FUZZ_DURATION_HOURS='$DURATION_HOURS' RTC_KNOWN_FIXES_PREWARM_ENVS=1 RTC_KNOWN_FIXES_CONVERGENCE_TIMEOUT_MS=30000 RTC_KNOWN_FIXES_REAL_USER_PARSER_STRESS=0 RTC_KNOWN_FIXES_REAL_USER_SAVE_CHECKPOINTS=0 RTC_KNOWN_FIXES_OPERATION_LEDGER_MODE=shadow RTC_KNOWN_FIXES_LANE_GUARD=1 RTC_KNOWN_FIXES_LANE_GUARD_INTERVAL_SECONDS=60 RTC_KNOWN_FIXES_LANE_GUARD_MAX_INFRA_NO_SUCCESS=5 RTC_KNOWN_FIXES_LANE_GUARD_MAX_BAD_NO_SUCCESS=16 RTC_KNOWN_FIXES_LANE_GUARD_MAX_UNCERTAIN_LOW_SUCCESS=10 bash '$FUZZ_MATRIX_SCRIPT' >> '$run_dir/tmux.log' 2>&1; code=\$?; printf 'TMUX_EXIT:%s %s\n' \"\$code\" \"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\" >> '$run_dir/tmux.log'"
	log "started-health-run session=$target_session role=$role runSet=$run_set head=$head laneFilter=$lane_filter"
}

start_health_run() {
	local lane_filter active_filters
	active_filters="$( active_lane_filters )"
	lane_filter="$( select_next_lane_filter_avoiding "$active_filters" )"
	start_health_run_for_session "$SESSION" primary "$lane_filter" 1
	update_active_runs_manifest
	write_status "started" "started-health-run" "$( cat "$RUN_ROOT/current-health-run.txt" 2>/dev/null || true )" "" "$lane_filter"
}

append_active_run_json() {
	local first_ref="$1"
	local session="$2"
	local role="$3"
	local run_set="$4"
	local lane_filter="$5"
	if [ "${!first_ref}" != "1" ]; then
		printf ',\n'
	fi
	printf '  { "session": %s, "role": %s, "runSet": %s, "laneFilter": %s }' \
		"$( json_escape "$session" )" \
		"$( json_escape "$role" )" \
		"$( json_escape "$run_set" )" \
		"$( json_escape "$lane_filter" )"
	printf -v "$first_ref" '0'
}

update_active_runs_manifest() {
	local tmp first session run_set lane_filter role index
	tmp="$ACTIVE_RUNS_PATH.tmp"
	first=1
	{
		printf '[\n'
		if tmux has-session -t "$SESSION" 2>/dev/null; then
			run_set="$( cat "$RUN_ROOT/current-health-run.txt" 2>/dev/null || read_session_field "$SESSION" runSet 2>/dev/null || true )"
			lane_filter="$( current_lane_filter )"
			if [ -n "$run_set" ] && [ -n "$lane_filter" ]; then
				append_active_run_json first "$SESSION" primary "$run_set" "$lane_filter"
			fi
		fi
		for index in $( seq 1 "$MAX_ELASTIC_EXTRAS" ); do
			session="$( extra_session_name "$index" )"
			if ! tmux has-session -t "$session" 2>/dev/null; then
				continue
			fi
			run_set="$( read_session_field "$session" runSet 2>/dev/null || true )"
			lane_filter="$( read_session_field "$session" laneFilter 2>/dev/null || true )"
			role="$( read_session_field "$session" role 2>/dev/null || echo extra )"
			if [ -n "$run_set" ] && [ -n "$lane_filter" ]; then
				append_active_run_json first "$session" "$role" "$run_set" "$lane_filter"
			fi
		done
		printf '\n]\n'
	} > "$tmp"
	mv "$tmp" "$ACTIVE_RUNS_PATH"
	LAST_MANAGED_JSON="$( cat "$ACTIVE_RUNS_PATH" )"
}

active_extra_count() {
	local count=0 index session
	for index in $( seq 1 "$MAX_ELASTIC_EXTRAS" ); do
		session="$( extra_session_name "$index" )"
		if tmux has-session -t "$session" 2>/dev/null; then
			count=$(( count + 1 ))
		fi
	done
	printf '%s\n' "$count"
}

active_lane_filters() {
	local filters="" index session lane_filter
	if tmux has-session -t "$SESSION" 2>/dev/null; then
		lane_filter="$( current_lane_filter )"
		filters="${filters:+$filters|}$lane_filter"
	fi
	for index in $( seq 1 "$MAX_ELASTIC_EXTRAS" ); do
		session="$( extra_session_name "$index" )"
		if ! tmux has-session -t "$session" 2>/dev/null; then
			continue
		fi
		lane_filter="$( read_session_field "$session" laneFilter 2>/dev/null || true )"
		if [ -n "$lane_filter" ]; then
			filters="${filters:+$filters|}$lane_filter"
		fi
	done
	printf '%s\n' "$filters"
}

retire_one_extra_for_pressure() {
	local resource_json="$1"
	local index session run_set lane_filter
	for (( index = MAX_ELASTIC_EXTRAS; index >= 1; index-- )); do
		session="$( extra_session_name "$index" )"
		if ! tmux has-session -t "$session" 2>/dev/null; then
			continue
		fi
		run_set="$( read_session_field "$session" runSet 2>/dev/null || true )"
		lane_filter="$( read_session_field "$session" laneFilter 2>/dev/null || true )"
		log "soft-throttle-retiring-one-elastic-extra session=$session runSet=$run_set laneFilter=$lane_filter resource=$resource_json"
		tmux kill-session -t "$session" 2>/dev/null || true
		return 0
	done
	return 1
}

ensure_elastic_capacity() {
	local resource_json desired current_count active_filters index session lane_filter run_set summary active stopped missing
	resource_json="$( resource_snapshot 2>/dev/null || echo '{"mode":"normal","reasons":["resource-snapshot-failed"]}' )"
	LAST_RESOURCE_JSON="$resource_json"
	desired="$( desired_extras_for_resource "$resource_json" )"
	LAST_DESIRED_EXTRAS="$desired"
	current_count="$( active_extra_count )"

	if [ "$current_count" -gt "$desired" ]; then
		retire_one_extra_for_pressure "$resource_json" || true
		update_active_runs_manifest
		return
	fi

	for index in $( seq 1 "$MAX_ELASTIC_EXTRAS" ); do
		session="$( extra_session_name "$index" )"
		if ! tmux has-session -t "$session" 2>/dev/null; then
			continue
		fi
		run_set="$( read_session_field "$session" runSet 2>/dev/null || true )"
		lane_filter="$( read_session_field "$session" laneFilter 2>/dev/null || true )"
		if [ -z "$run_set" ] || [ -z "$lane_filter" ]; then
			continue
		fi
		summary="$( lane_state_summary "$run_set" "$lane_filter" 2>/dev/null || echo "" )"
		if [ -z "$summary" ]; then
			continue
		fi
		active="$( summary_value "$summary" active )"
		stopped="$( summary_value "$summary" stopped )"
		missing="$( summary_value "$summary" missing )"
		if [ "${active:-0}" = "0" ] && [ "${stopped:-0}" != "0" ] && [ "${missing:-0}" = "0" ]; then
			log "elastic-extra-finished session=$session runSet=$run_set laneFilter=$lane_filter"
			tmux kill-session -t "$session" 2>/dev/null || true
			current_count=$(( current_count - 1 ))
		fi
	done

	current_count="$( active_extra_count )"
	while [ "$current_count" -lt "$desired" ]; do
		index=1
		while [ "$index" -le "$MAX_ELASTIC_EXTRAS" ]; do
			session="$( extra_session_name "$index" )"
			if ! tmux has-session -t "$session" 2>/dev/null; then
				break
			fi
			index=$(( index + 1 ))
		done
		if [ "$index" -gt "$MAX_ELASTIC_EXTRAS" ]; then
			break
		fi
		active_filters="$( active_lane_filters )"
		lane_filter="$( select_next_lane_filter_avoiding "$active_filters" )"
		start_health_run_for_session "$session" extra "$lane_filter" 0
		current_count=$(( current_count + 1 ))
	done
	update_active_runs_manifest
}

check_once() {
	local run_set lane_filter primary_lane state_path age stop_reason summary active stopped missing max_active_age
	run_set="$( cat "$RUN_ROOT/current-health-run.txt" 2>/dev/null || true )"
	lane_filter="$( current_lane_filter )"
	primary_lane="$( primary_lane_from_filter "$lane_filter" )"
	if [ -n "$run_set" ]; then
		state_path="$RUN_ROOT/$run_set/$primary_lane/state.json"
	else
		state_path=""
	fi

	if tmux has-session -t "$SESSION" 2>/dev/null; then
		if [ -n "$run_set" ]; then
			summary="$( lane_state_summary "$run_set" "$lane_filter" 2>/dev/null || echo "" )"
		else
			summary=""
		fi
		if [ -n "$summary" ]; then
			active="$( summary_value "$summary" active )"
			stopped="$( summary_value "$summary" stopped )"
			missing="$( summary_value "$summary" missing )"
			max_active_age="$( summary_value "$summary" maxActiveAgeSeconds )"
			if [ "${active:-0}" != "0" ]; then
				if [ -n "$max_active_age" ] && [ "$max_active_age" -gt "$STALE_SECONDS" ]; then
					log "state-stale-killing-and-restarting runSet=$run_set laneFilter=$lane_filter maxActiveAge=$max_active_age"
					tmux kill-session -t "$SESSION" 2>/dev/null || true
					start_health_run
					return
				fi
				ensure_elastic_capacity
				write_status "running" "tmux-session-active active=$active stopped=$stopped missing=$missing" "$run_set" "${max_active_age:-}" "$lane_filter"
				return
			fi
			if [ "${stopped:-0}" != "0" ] && [ "${missing:-0}" = "0" ]; then
				log "all-selected-lanes-stopped-restarting runSet=$run_set laneFilter=$lane_filter"
				tmux kill-session -t "$SESSION" 2>/dev/null || true
				start_health_run
				return
			fi
			if [ "${active:-0}" = "0" ] && [ "${missing:-0}" != "0" ]; then
				age="$( run_age_seconds "$run_set" 2>/dev/null || echo "" )"
				if [ -n "$age" ] && [ "$age" -gt "$STARTUP_STALE_SECONDS" ]; then
					log "startup-stale-restarting runSet=$run_set laneFilter=$lane_filter missing=$missing age=$age"
					tmux kill-session -t "$SESSION" 2>/dev/null || true
					start_health_run
					return
				fi
			fi
			update_active_runs_manifest
			write_status "starting" "tmux-session-active-no-active-lane-yet stopped=$stopped missing=$missing" "$run_set" "" "$lane_filter"
			return
		fi
		update_active_runs_manifest
		write_status "starting" "tmux-session-active-no-state-yet" "$run_set" "" "$lane_filter"
		return
	fi

	if [ -f "$state_path" ]; then
		age="$( state_age_seconds "$state_path" 2>/dev/null || echo "" )"
		stop_reason="$( state_value "$state_path" stopReason 2>/dev/null || true )"
		if [ "$stop_reason" = "duration-elapsed" ]; then
			log "completed-duration-restarting runSet=$run_set"
		else
			log "missing-session-restarting runSet=$run_set stopReason=${stop_reason:-none} age=${age:-unknown}"
		fi
	else
		log "missing-session-no-state-restarting runSet=$run_set"
	fi
	start_health_run
}

log "health-watchdog-started session=$SESSION interval=$INTERVAL_SECONDS stale=$STALE_SECONDS"
while true; do
	check_once || {
		code=$?
		log "watchdog-check-error code=$code"
		write_status "error" "watchdog-check-error:$code" "$( cat "$RUN_ROOT/current-health-run.txt" 2>/dev/null || true )" ""
	}
	maybe_cleanup_generated_videos || log "generated-video-cleanup-error"
	sleep "$INTERVAL_SECONDS"
done
