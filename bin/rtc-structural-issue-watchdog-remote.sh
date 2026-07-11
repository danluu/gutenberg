#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN_DIR=${HOME:-/home/exouser}/.local/bin
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-core-wrapper/bin
REPO=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
BASE=/media/volume/danluu-fuzz-data/rtc-structural-watchdog-20260518

CRITICAL_BASE=/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517
CRITICAL_REPO_SCRIPT=$REPO/bin/rtc-critical-path-pr-executor-loop-remote.sh
CRITICAL_DEPLOYED_SCRIPT=$CRITICAL_BASE/rtc-critical-path-pr-executor-loop.sh
CRITICAL_TMP_SCRIPT=/tmp/start_rtc_critical_path_pr_executor_loop.sh
FINALIZATION_BASE=/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516
DEFERRED_BASE=/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516
PR_PROGRESS_BASE=/media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518
PR_PROGRESS_PUSH_MANIFEST=$PR_PROGRESS_BASE/current-push-manifest.tsv
LOCAL_PUBLISH_STATUS=$PR_PROGRESS_BASE/local-publisher-status.tsv
PRODUCTIVE_ANALYSIS_BASE=/media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521
COVERAGE_BASE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515
BENCHMARK_FEEDBACK_BASE=/media/volume/danluu-fuzz-data/rtc-benchmark-canary-feedback-20260520
RESOURCE_BASE=/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516
GUARD_BASE=/media/volume/danluu-fuzz-data/rtc-jetstream-guard-20260515
GUARD_SCRIPT=$REPO/bin/rtc-jetstream-guard-remote.sh
GUARD_PID_FILE=$GUARD_BASE/guard.pid
GUARD_RECOVERY_LOG=$BASE/logs/guard-recovery.log
CANDIDATE_REPO=/media/volume/danluu-fuzz-data/rtc-all-merged-fuzz-20260526T195420Z/repo
CANDIDATE_BRANCH=js2/all-merged-rebased-20260701
NOVELTY_POLICY_CHECK=$REPO/bin/rtc-browser-fuzz-novelty-policy-check.mjs
LOCAL_PUBLISH_LEDGER=$FINALIZATION_BASE/latest-local-publish-manifest.tsv
VALIDATED_ADOPTION_DISPOSITIONS=${RTC_STRUCTURAL_WATCHDOG_ADOPTION_DISPOSITIONS:-$CRITICAL_BASE/validated-adoption-dispositions.tsv}
DUP_NOISE_BASE=/media/volume/danluu-fuzz-data/rtc-duplicate-noise-persona-loop-20260516
ARTIFACT_INDEX_BASE=/media/volume/danluu-fuzz-data/rtc-artifact-index-20260518
ARTIFACT_INDEX_ARTIFACTS=$ARTIFACT_INDEX_BASE/current-artifacts.tsv
STRICT_EXPANSION_BASE=/media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515
FOCUSED_SHARDS_BASE=/media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515
GAP_BOOSTER_BASE=/media/volume/danluu-fuzz-data/rtc-gap-booster-20260515
CG_LOWER_LEVEL_B64_HOLD_FILE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-20260516/holds/coverage-guided-lower-level-rich-text-crdt.hold
CG_LOWER_LEVEL_B64_REPLACEMENT_GROUP=coverage-guided-lower-level-rich-text-multiblock
CG_LOWER_LEVEL_B64_REPLACEMENT_SESSION=rtc-coverage-guided-lower-level-rich-text-multiblock
CG_LOWER_LEVEL_B64_REPLACEMENT_HOLD_FILE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-rich-text-multiblock-20260518/holds/coverage-guided-lower-level-rich-text-multiblock.hold
CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_GROUP=coverage-guided-lower-level-table-query-array-crdt
CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_SESSION=rtc-coverage-guided-lower-level-table-query-array-crdt
CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_HOLD_FILE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-query-array-20260517/holds/coverage-guided-lower-level-table-query-array-crdt.hold
CG_LOWER_LEVEL_HTTP_POLLING_GROUP=coverage-guided-lower-level-http-polling-manager
CG_LOWER_LEVEL_HTTP_POLLING_SESSION=rtc-coverage-guided-lower-level-http-polling-manager
CG_LOWER_LEVEL_HTTP_POLLING_HOLD_FILE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-http-polling-manager-20260520/holds/coverage-guided-lower-level-http-polling-manager.hold
CG_LOWER_LEVEL_BLOCK_PARSER_GROUP=coverage-guided-lower-level-block-parser-serialization
CG_LOWER_LEVEL_BLOCK_PARSER_SESSION=rtc-coverage-guided-lower-level-block-parser-serialization
CG_LOWER_LEVEL_BLOCK_PARSER_HOLD_FILE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-block-parser-serialization-20260519/holds/coverage-guided-lower-level-block-parser-serialization.hold

SESSION=rtc-structural-issue-watchdog
FINDINGS=$BASE/current-structural-findings.tsv
EVENTS=$BASE/events.tsv
REPAIR_LEDGER=$BASE/repair-launches.tsv
LOG=$BASE/logs/structural-watchdog.log
PID_FILE=$BASE/structural-watchdog.pid
LOCK_FILE=$BASE/structural-watchdog.lock
RUNAWAY_SCAN_REPORT=$BASE/current-runaway-scans.tsv
RUNAWAY_SCAN_KILL_LEDGER=$BASE/runaway-scan-kills.tsv
ANALYSIS_PRODUCTIVITY_REPORT=$BASE/current-analysis-productivity.tsv

CYCLE_SLEEP_SECONDS=${RTC_STRUCTURAL_WATCHDOG_CYCLE_SLEEP_SECONDS:-300}
REPAIR_COOLDOWN_SECONDS=${RTC_STRUCTURAL_WATCHDOG_REPAIR_COOLDOWN_SECONDS:-1800}
MAX_ACTIVE_REPAIRS=${RTC_STRUCTURAL_WATCHDOG_MAX_ACTIVE_REPAIRS:-1}
CODEX_TIMEOUT_SECONDS=${RTC_STRUCTURAL_WATCHDOG_CODEX_TIMEOUT_SECONDS:-5400}
CODEX_MODEL=${RTC_STRUCTURAL_WATCHDOG_CODEX_MODEL:-gpt-5.6-sol}
CODEX_REASONING_EFFORT=${RTC_STRUCTURAL_WATCHDOG_CODEX_REASONING_EFFORT:-max}
COVERAGE_FULL_PASS_MAX_AGE_SECONDS=${RTC_STRUCTURAL_WATCHDOG_COVERAGE_FULL_PASS_MAX_AGE_SECONDS:-1800}
COVERAGE_FULL_PASS_START_GRACE_SECONDS=${RTC_STRUCTURAL_WATCHDOG_COVERAGE_FULL_PASS_START_GRACE_SECONDS:-900}
COVERAGE_HEAP_FAILURE_WINDOW_SECONDS=${RTC_STRUCTURAL_WATCHDOG_COVERAGE_HEAP_FAILURE_WINDOW_SECONDS:-1800}
REPAIR_PUBLICATION_GRACE_SECONDS=${RTC_STRUCTURAL_WATCHDOG_REPAIR_PUBLICATION_GRACE_SECONDS:-600}
LOCAL_PUBLISH_STATUS_MAX_AGE_SECONDS=${RTC_STRUCTURAL_WATCHDOG_LOCAL_PUBLISH_STATUS_MAX_AGE_SECONDS:-900}
HARNESS_SYNC_GRACE_SECONDS=${RTC_STRUCTURAL_WATCHDOG_HARNESS_SYNC_GRACE_SECONDS:-120}
PROMOTION_SCHEDULING_START_GRACE_SECONDS=${RTC_STRUCTURAL_WATCHDOG_PROMOTION_SCHEDULING_START_GRACE_SECONDS:-300}
RUNAWAY_SCAN_MIN_AGE_SECONDS=${RTC_STRUCTURAL_WATCHDOG_RUNAWAY_SCAN_MIN_AGE_SECONDS:-1800}
RUNAWAY_SCAN_TARGET_ROOTS=${RTC_STRUCTURAL_WATCHDOG_RUNAWAY_SCAN_ROOTS:-/media/volume/danluu-fuzz-data:/home/exouser/.codex}
TERMINATE_RUNAWAY_RG=${RTC_STRUCTURAL_WATCHDOG_TERMINATE_RUNAWAY_RG:-1}
TERMINATE_RUNAWAY_TEXT_SEARCH=${RTC_STRUCTURAL_WATCHDOG_TERMINATE_RUNAWAY_TEXT_SEARCH:-$TERMINATE_RUNAWAY_RG}
TERMINATE_RUNAWAY_SCANS=${RTC_STRUCTURAL_WATCHDOG_TERMINATE_RUNAWAY_SCANS:-1}
ANALYSIS_LOW_WORKER_MAX_LOAD_PER_CORE=${RTC_STRUCTURAL_WATCHDOG_ANALYSIS_LOW_WORKER_MAX_LOAD_PER_CORE:-1.0}
ANALYSIS_MAX_CODEX_WORKERS=${RTC_STRUCTURAL_WATCHDOG_ANALYSIS_MAX_CODEX_WORKERS:-8}
REQUIRE_LEVEL_MIX_REVIEW=${RTC_JETSTREAM_ENABLE_LEVEL_MIX_REVIEW:-0}
REQUIRE_DUPLICATE_NOISE_REVIEW=${RTC_JETSTREAM_ENABLE_DUPLICATE_NOISE_REVIEW:-0}
REQUIRE_NATIVE_PROTOCOL_REVIEW=${RTC_JETSTREAM_ENABLE_NATIVE_PROTOCOL_REVIEW:-0}
REQUIRE_ASSERT_REVIEW=${RTC_JETSTREAM_ENABLE_ASSERT_REVIEW:-0}

mkdir -p "$BASE/logs" "$BASE/runs" "$TMUX_WRAP"
touch "$EVENTS" "$REPAIR_LEDGER" "$RUNAWAY_SCAN_KILL_LEDGER"
ensure_tmux_wrapper() {
	local wrapper="$TMUX_WRAP/tmux" user_wrapper="$CODEX_BIN_DIR/tmux"
	local tmp
	tmp=$(mktemp "$TMUX_WRAP/tmux.XXXXXX")
	cat > "$tmp" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
socket=${RTC_TMUX_SOCKET:-rtc-fuzz}
explicit_socket=0
tmux_command=
args=( "$@" )
index=0
while [ "$index" -lt "${#args[@]}" ]; do
	arg=${args[$index]}
	case "$arg" in
		-L|-S|-c|-f|-T)
			next_index=$(( index + 1 ))
			[ "$next_index" -lt "${#args[@]}" ] || break
			case "$arg" in
				-L) socket=${args[$next_index]}; explicit_socket=1 ;;
				-S) socket=${args[$next_index]##*/}; explicit_socket=1 ;;
			esac
			index=$(( index + 2 ))
			;;
		-L*) socket=${arg#-L}; explicit_socket=1; index=$(( index + 1 )) ;;
		-S*) socket=${arg##*/}; explicit_socket=1; index=$(( index + 1 )) ;;
		--)
			index=$(( index + 1 ))
			[ "$index" -ge "${#args[@]}" ] || tmux_command=${args[$index]}
			break
			;;
		-*) index=$(( index + 1 )) ;;
		*) tmux_command=$arg; break ;;
	esac
done
lock_socket=$(printf '%s' "$socket" | tr -c 'A-Za-z0-9_.-' '_')
tmux_args=( "$@" )
if [ "$explicit_socket" -eq 0 ]; then
	tmux_args=( -L "$socket" "$@" )
fi
	case "$tmux_command" in
	capture-pane|capturep)
		printf 'capture-pane is disabled because it crashes tmux on this host\n' >&2
		exit 1
		;;
	display-message|displayp|has-session|has|list-*|show-*)
		exec flock -w 30 "/tmp/rtc-tmux-${UID}-${lock_socket}.client.lock" /usr/bin/tmux "${tmux_args[@]}"
		;;
esac
exec /usr/bin/tmux "${tmux_args[@]}"
SH
	chmod +x "$tmp"
	if [ -f "$wrapper" ] && cmp -s "$tmp" "$wrapper"; then
		rm -f "$tmp"
	else
		mv -f "$tmp" "$wrapper"
	fi
	mkdir -p "$CODEX_BIN_DIR"
	if [ ! -f "$user_wrapper" ] || ! cmp -s "$wrapper" "$user_wrapper"; then
		tmp=$(mktemp "$CODEX_BIN_DIR/tmux.XXXXXX")
		cp "$wrapper" "$tmp"
		chmod 755 "$tmp"
		mv -f "$tmp" "$user_wrapper"
	fi
}
ensure_tmux_wrapper
export PATH="$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:$PATH"

log() {
	printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$LOG"
}

guard_loop_healthy() {
	local pid args
	pid=$(cat "$GUARD_PID_FILE" 2>/dev/null || true)
	[[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null || return 1
	args=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)
	case "$args" in
		*"$GUARD_SCRIPT"*' run-locked'*) return 0 ;;
		*) return 1 ;;
	esac
}

ensure_guard_loop() {
	guard_loop_healthy && return 0
	log "guard loop missing or stale; requesting restart script=$GUARD_SCRIPT"
	if [ ! -x "$GUARD_SCRIPT" ]; then
		log "guard restart unavailable script=$GUARD_SCRIPT"
		return 1
	fi
	bash "$GUARD_SCRIPT" start >> "$GUARD_RECOVERY_LOG" 2>&1 || true
	sleep 3
	if guard_loop_healthy; then
		log "guard loop recovered pid=$(cat "$GUARD_PID_FILE")"
		return 0
	fi
	log "guard restart failed script=$GUARD_SCRIPT log=$GUARD_RECOVERY_LOG"
	return 1
}

check_guard_loop_health() {
	local out=$1
	guard_loop_healthy && return 0
	emit_finding "$out" high "guard" "guard-loop-not-running" \
		"script=$GUARD_SCRIPT pid_file=$GUARD_PID_FILE recovery_log=$GUARD_RECOVERY_LOG" \
		"restart the guard through its stale-lock cleanup and verify its heartbeat, model-policy report, and worker-cap enforcement advance"
}

terminate_runaway_pid() {
	local pid=$1 child
	while IFS= read -r child; do
		[ -n "$child" ] || continue
		terminate_runaway_pid "$child"
	done < <(pgrep -P "$pid" 2>/dev/null || true)
	kill "$pid" 2>/dev/null || true
}

tmux_sessions() {
	tmux list-sessions -F '#S' 2>/dev/null || true
}

has_session() {
	tmux_sessions | grep -Fxq "$1"
}

has_lower_level_session() {
	tmux_sessions | grep -Eq '^rtc-lower-level-fuzz-loop($|-)'
}

coverage_guided_lower_level_group_session_exists() {
	local session=$1
	local group=$2
	local legacy_session=rtc-coverage-guided-lower-level

	if has_session "$session"; then
		return 0
	fi
	if ! has_session "$legacy_session"; then
		return 1
	fi

	tmux list-panes -t "$legacy_session" -F '#{pane_start_command}' 2>/dev/null |
		awk -v group="$group" \
			'index($0, "RTC_CG_LOWER_LEVEL_GROUP") && index($0, group) { found = 1 } END { exit ! found }'
}

coverage_guided_lower_level_group_session_or_hold_exists() {
	local session=$1
	local group=$2
	local hold_file=$3

	coverage_guided_lower_level_group_session_exists "$session" "$group" ||
		[ -f "$hold_file" ]
}

active_session_matching() {
	local pattern=$1
	tmux_sessions | rg -i "$pattern" | sed -n '1p'
}

benchmark_promotion_blocked() {
	[ -s "$BENCHMARK_FEEDBACK_BASE/current-feedback.tsv" ] || return 1
	awk -F '\t' '
		NR == 1 {
			for (i = 1; i <= NF; i++) {
				cols[tolower($i)] = i
			}
			next
		}
		function value(name) {
			return (name in cols) ? $(cols[name]) : ""
		}
		function failed_reps_count(value) {
			gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
			return value ~ /^[1-9][0-9]*(\/[0-9]+)?$/ || value ~ /^[1-9][0-9]*-[0-9]+$/
		}
		NR > 1 {
			status = tolower(value("status") " " value("result"))
			failure_type = tolower(value("failure_type"))
			reps_failed = value("reps_failed")
			if (reps_failed == "") {
				reps_failed = value("failed_reps")
			}
			repair_or_priority = tolower(value("repair_or_priority") " " value("priority"))
			line = tolower($0)
			if (status ~ /promotion_blocked|known_bad_canary/ || line ~ /(^|\t)(promotion_blocked|known_bad_canary)(\t|$)/) {
				found = 1
			}
			if (failed_reps_count(reps_failed) && failure_type ~ /promotion-preflight|benchmark-row/) {
				found = 1
			}
			if (failed_reps_count(reps_failed) && repair_or_priority ~ /p0|block promotion|promotion.*blocked|block.*until/) {
				found = 1
			}
		}
		END { exit found ? 0 : 1 }
	' "$BENCHMARK_FEEDBACK_BASE/current-feedback.tsv"
}

benchmark_exact_stack_repair_active() {
	local hit
	hit=$(active_session_matching '^rtc-critical-continuation-benchmark-canary-fuzzer-gap|^rtc-benchmark-canary-feedback-refresh-|^rtc-structural-repair-benchmark-canary' || true)
	if [ -n "$hit" ]; then
		printf '%s\n' "$hit"
		return 0
	fi
	pgrep -af '[e]xact-stack-worktrees.*(title-reload-http|existing-post-crdt|large-http)|[r]efresh-current-feedback-command[.]sh|rtc-benchmark-canary-feedback-20260520/cycles/refresh-' 2>/dev/null | sed -n '1p'
}

recent_critical_run_dirs() {
	find "$CRITICAL_BASE/runs" -mindepth 1 -maxdepth 1 -type d -printf '%f\t%p\n' 2>/dev/null |
		awk -F '\t' '$1 ~ /^[0-9]{8}T[0-9]{6}Z$/ { print }' |
		sort |
		tail -160 |
		cut -f2-
}

latest_benchmark_classification() {
	recent_critical_run_dirs |
		while IFS= read -r run_dir; do
			find "$run_dir/continuations/benchmark-canary-fuzzer-gap" -maxdepth 1 -type f -name 'classification.tsv' -size +0c -printf '%T@\t%p\n' 2>/dev/null
		done |
		sort -n |
		tail -1 |
		cut -f2-
}

benchmark_classification_only_coverage_repaired() {
	local classification=$1
	[ -n "$classification" ] && [ -s "$classification" ] || return 1
	awk -F '\t' '
		NR > 1 {
			rows++
			if ($2 != "coverage_repaired") other++
		}
		END { exit (rows > 0 && other == 0) ? 0 : 1 }
	' "$classification"
}

coverage_supervisor_session_live_for_root() {
	local coverage_root=$1 state_session suffix scoped_session

	state_session=$(
		node -e "const fs = require('fs'); try { const state = JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); if (typeof state.supervisorSession === 'string') process.stdout.write(state.supervisorSession); } catch {}" \
			"$coverage_root/novelty-state.json" 2>/dev/null || true
	)
	suffix=$(basename "$coverage_root" | sed -E 's/[^A-Za-z0-9_.-]+/-/g; s/^-+//; s/-+$//')
	scoped_session="rtc-coverage-guided-supervisor-$suffix"
	if [ -n "$state_session" ]; then
		has_session "$state_session"
	else
		has_session rtc-coverage-guided-supervisor || has_session "$scoped_session"
	fi
}

coverage_supervisor_session_live_after_grace() {
	local coverage_root=$1

	sleep 12
	coverage_supervisor_session_live_for_root "$coverage_root"
}

active_repair_count() {
	tmux_sessions | awk '/^rtc-structural-repair-/ { count++ } END { print count + 0 }'
}

cleanup_orphaned_structural_repair_processes() {
	local _epoch _key session _finding run_dir pid_file pid pgid
	[ -s "$REPAIR_LEDGER" ] || return 0
	tail -n 200 "$REPAIR_LEDGER" 2>/dev/null |
		while IFS=$'\t' read -r _epoch _key session _finding run_dir; do
			[ -n "$session" ] && [ -n "$run_dir" ] || continue
			pid_file=$run_dir/codex.pid
			[ -s "$pid_file" ] || continue
			pid=$(sed -n '1p' "$pid_file" 2>/dev/null || true)
			if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then
				rm -f "$pid_file"
				continue
			fi
			has_session "$session" && continue
			pgid=$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ' || true)
			log "terminating orphaned structural repair process session=$session pid=$pid pgid=${pgid:-missing} run=$run_dir"
			if [ -n "$pgid" ] && [ "$pgid" = "$pid" ]; then
				kill -TERM -- "-$pgid" 2>/dev/null || true
			else
				terminate_runaway_pid "$pid"
			fi
			sleep 2
			if kill -0 "$pid" 2>/dev/null; then
				if [ -n "$pgid" ] && [ "$pgid" = "$pid" ]; then
					kill -KILL -- "-$pgid" 2>/dev/null || true
				else
					kill -KILL "$pid" 2>/dev/null || true
				fi
			fi
			rm -f "$pid_file"
		done
	return 0
}

slugify() {
	printf '%s' "$1" | tr '[:upper:] /_:' '[:lower:]----' | tr -cd 'a-z0-9-' | sed -e 's/--*/-/g' -e 's/^-//' -e 's/-$//'
}

hash_key() {
	if command -v sha1sum >/dev/null 2>&1; then
		printf '%s' "$1" | sha1sum | awk '{ print substr($1, 1, 12) }'
	else
		printf '%s' "$1" | cksum | awk '{ print $1 }'
	fi
}

repair_issue_key() {
	local component=$1 key=$2 evidence=$3 stable
	case "$component:$key" in
		structural-scan:runaway-scan-detected|structural-scan:runaway-text-search-terminated)
			stable=$(
				printf '%s\n' "$evidence" |
					sed -n 's/.*pid=\([0-9][0-9]*\).*/pid=\1/p' |
					sed -n '1p'
			)
			if [ -z "$stable" ]; then
				stable=$(
					printf '%s\n' "$evidence" |
						sed -E 's/ age=[0-9]+s/ age=<age>/g; s/ cpu=[0-9.]+%/ cpu=<cpu>%/g; s/ mem=[0-9.]+%/ mem=<mem>%/g'
				)
			fi
			hash_key "$component:$key:$stable"
			;;
		*)
			hash_key "$component:$key:$evidence"
			;;
	esac
}

file_age_seconds() {
	local file=$1 now mtime
	[ -e "$file" ] || return 1
	now=$(date -u +%s)
	mtime=$(stat -c %Y "$file" 2>/dev/null) || return 1
	printf '%s\n' "$(( now - mtime ))"
}

recent_log_matches() {
	local file=$1 seconds=$2 pattern=$3 cutoff
	[ -s "$file" ] || return 1
	cutoff=$(date -u -d "@$(( $(date -u +%s) - seconds ))" +%Y-%m-%dT%H:%M:%SZ)
	awk -v cutoff="$cutoff" 'substr($0, 1, 1) == "[" && substr($0, 2, 20) >= cutoff { print }' "$file" |
		rg -i "$pattern" >/dev/null 2>&1
}

check_runaway_scans() {
	local out=$1 tmp=$RUNAWAY_SCAN_REPORT.$$.tmp ps_tmp=$BASE/ps-snapshot.$$.txt pid severity command age pcpu pmem evidence
	ps -ww -eo pid=,ppid=,pcpu=,pmem=,comm=,args= > "$ps_tmp" 2>/dev/null || : > "$ps_tmp"
	python3 - "$RUNAWAY_SCAN_MIN_AGE_SECONDS" "$RUNAWAY_SCAN_TARGET_ROOTS" "$ps_tmp" > "$tmp" <<'PY'
import os
import re
import sys

min_age = int(sys.argv[1])
roots = [root for root in sys.argv[2].split(":") if root]
ps_path = sys.argv[3]
scan_names = {"rg", "grep", "egrep", "fgrep", "find", "du"}
now = os.popen("date -u +%Y-%m-%dT%H:%M:%SZ").read().strip()
clock_ticks = os.sysconf(os.sysconf_names["SC_CLK_TCK"])
with open("/proc/uptime", encoding="ascii") as uptime_file:
    uptime = float(uptime_file.read().split()[0])


def process_age_seconds(pid):
    try:
        with open(f"/proc/{pid}/stat", encoding="ascii") as stat_file:
            stat = stat_file.read()
        fields = stat[stat.rfind(") ") + 2:].split()
        start_ticks = int(fields[19])
    except (FileNotFoundError, IndexError, PermissionError, ValueError):
        return None
    return max(0, int(uptime - (start_ticks / clock_ticks)))

print("timestamp\tseverity\tpid\tppid\tage_seconds\tcpu_percent\tmem_percent\tcommand\targs")
for raw in open(ps_path, encoding="utf-8", errors="replace"):
    line = raw.strip()
    if not line:
        continue
    parts = line.split(None, 5)
    if len(parts) < 6:
        continue
    pid, ppid, cpu_s, mem_s, comm, args = parts
    try:
        cpu = float(cpu_s)
        mem = float(mem_s)
    except ValueError:
        continue
    age = process_age_seconds(pid)
    if age is None:
        continue
    if age < min_age:
        continue
    base = os.path.basename(comm)
    args_base_match = re.search(r"(^|[ /])(rg|grep|egrep|fgrep|find|du)(\s|$)", args)
    if base not in scan_names and not args_base_match:
        continue
    if not any(root in args for root in roots):
        continue
    bounded = "-maxdepth" in args or "timeout " in args or "/usr/bin/timeout " in args
    severity = "medium"
    if base in {"rg", "grep", "egrep", "fgrep"}:
        severity = "high"
    elif age >= max(min_age * 2, 3600) and not bounded:
        severity = "high"
    safe_args = args.replace("\t", " ")[:700]
    print(f"{now}\t{severity}\t{pid}\t{ppid}\t{age}\t{cpu:.1f}\t{mem:.1f}\t{base}\t{safe_args}")
PY
	rm -f "$ps_tmp"
	mv "$tmp" "$RUNAWAY_SCAN_REPORT"
	awk -F '\t' 'NR > 1 && $2 == "high" { print }' "$RUNAWAY_SCAN_REPORT" |
		while IFS=$'\t' read -r _ts severity pid _ppid age pcpu pmem command evidence; do
			[ -n "$pid" ] || continue
			if [ "$TERMINATE_RUNAWAY_TEXT_SEARCH" = 1 ] &&
				{ [ "$command" = "rg" ] || [ "$command" = "grep" ] || [ "$command" = "egrep" ] || [ "$command" = "fgrep" ] || { [ "$command" = "bash" ] && printf '%s\n' "$evidence" | grep -Eq '(^|[ /])(rg|grep|egrep|fgrep)([[:space:]]|$)'; }; } &&
				kill -0 "$pid" 2>/dev/null; then
				terminate_runaway_pid "$pid"
				printf '%s\t%s\t%s\t%s\t%s\n' "$(date -u +%s)" "$pid" "$age" "$pcpu" "$evidence" >> "$RUNAWAY_SCAN_KILL_LEDGER"
				emit_finding "$out" high "structural-scan" "runaway-text-search-terminated" \
					"pid=$pid age=${age}s cpu=${pcpu}% mem=${pmem}% args=$evidence" \
					"replace the broad text-search source with artifact-index or bounded current-run scans; do not let historical rg/grep scans run indefinitely"
			elif [ "$TERMINATE_RUNAWAY_SCANS" = 1 ] && kill -0 "$pid" 2>/dev/null; then
				terminate_runaway_pid "$pid"
				printf '%s\t%s\t%s\t%s\t%s\n' "$(date -u +%s)" "$pid" "$age" "$pcpu" "$evidence" >> "$RUNAWAY_SCAN_KILL_LEDGER"
				emit_finding "$out" high "structural-scan" "runaway-scan-terminated" \
					"pid=$pid command=$command age=${age}s cpu=${pcpu}% mem=${pmem}% args=$evidence" \
					"debug the caller and replace broad historical scans with indexed or bounded current-run probes; this watchdog terminated only the runaway process after recording evidence"
			else
				emit_finding "$out" high "structural-scan" "runaway-scan-detected" \
					"pid=$pid command=$command age=${age}s cpu=${pcpu}% mem=${pmem}% args=$evidence" \
					"debug the caller and replace broad historical scans with indexed or bounded current-run probes"
			fi
		done
}

count_lines_after_header() {
	local file=$1
	if [ -s "$file" ]; then
		awk 'NR > 1 { count++ } END { print count + 0 }' "$file" 2>/dev/null
	else
		printf '0\n'
	fi
}

count_active_codex_workers() {
	local pid child child_command has_codex_child count=0
	local -a candidate_pids=()
	mapfile -t candidate_pids < <(
		pgrep -f 'codex .*exec|/codex .*exec|codex -a .*exec' 2>/dev/null || true
	)
	for pid in "${candidate_pids[@]}"; do
		[ -r "/proc/$pid/cmdline" ] || continue
		has_codex_child=0
		while IFS= read -r child; do
			[ -r "/proc/$child/cmdline" ] || continue
			child_command=$(tr '\0' ' ' < "/proc/$child/cmdline")
			if printf '%s\n' "$child_command" | grep -Eq 'codex .*exec|/codex .*exec|codex -a .*exec'; then
				has_codex_child=1
				break
			fi
		done < <(pgrep -P "$pid" 2>/dev/null || true)
		if [ "$has_codex_child" -eq 0 ]; then
			count=$(( count + 1 ))
		fi
	done
	printf '%s\n' "$count"
}

eligible_structural_repair_count() {
	local findings=$1 count=0 _ts severity component key evidence next_action issue_key
	while IFS=$'\t' read -r _ts severity component key evidence next_action; do
		[ "$severity" = "high" ] || continue
		[ -n "$key" ] || continue
		issue_key=$(repair_issue_key "$component" "$key" "$evidence")
		if ! recent_repair_for_key "$issue_key"; then
			count=$(( count + 1 ))
		fi
	done < <(awk -F '\t' 'NR > 1 { print }' "$findings" 2>/dev/null)
	printf '%s\n' "$count"
}

check_analysis_productivity() {
	local out=$1 report_tmp=$ANALYSIS_PRODUCTIVITY_REPORT.$$.tmp high_findings eligible_repairs active_repairs codex_workers controller_sessions critical_queue deferred_queue pr_progress_jobs load1 cores load_ok
	high_findings=$(awk -F '\t' 'NR > 1 && $2 == "high" { count++ } END { print count + 0 }' "$out" 2>/dev/null || printf 0)
	eligible_repairs=$(eligible_structural_repair_count "$out")
	active_repairs=$(active_repair_count)
	codex_workers=$(count_active_codex_workers)
	controller_sessions=$(tmux_sessions | rg -c '(analysis|persona|codex-loop|structural-repair|pr-progress|critical-path|deferred|finalization)' 2>/dev/null || printf 0)
	critical_queue=$(count_lines_after_header "$CRITICAL_BASE/queue.tsv")
	deferred_queue=$(count_lines_after_header "$DEFERRED_BASE/current-deferred-queue.tsv")
	pr_progress_jobs=$({ find "$CRITICAL_BASE/runs" "$DEFERRED_BASE/cycles" "$FINALIZATION_BASE/cycles" -maxdepth 4 -type f \( -name '*.report.md' -o -name 'classification.tsv' \) -mtime -1 2>/dev/null || true; } | wc -l | tr -d ' ')
	load1=$(awk '{ print $1 }' /proc/loadavg 2>/dev/null || printf 999)
	cores=$(nproc 2>/dev/null || printf 1)
	load_ok=$(awk -v loadv="$load1" -v cores="$cores" -v limit="$ANALYSIS_LOW_WORKER_MAX_LOAD_PER_CORE" 'BEGIN { print (loadv <= cores * limit) ? 1 : 0 }')
	{
		printf 'timestamp\thigh_findings\teligible_repairs\tactive_repairs\tcodex_workers\tcontroller_sessions\tcritical_queue\tdeferred_queue\trecent_pr_reports\tload1\tcores\tload_ok\n'
		printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
			"$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$high_findings" "$eligible_repairs" "$active_repairs" "$codex_workers" "$controller_sessions" "$critical_queue" "$deferred_queue" "$pr_progress_jobs" "$load1" "$cores" "$load_ok"
	} > "$report_tmp"
	mv "$report_tmp" "$ANALYSIS_PRODUCTIVITY_REPORT"
	if [ "$load_ok" = 1 ] && [ "$high_findings" -gt 0 ] && [ "$eligible_repairs" -eq 0 ] && [ "$active_repairs" -eq 0 ] && [ "$codex_workers" -lt 1 ]; then
		emit_finding "$out" high "analysis-productivity" "high-findings-no-active-repair" \
			"$ANALYSIS_PRODUCTIVITY_REPORT high_findings=$high_findings eligible_repairs=$eligible_repairs codex_workers=$codex_workers load1=$load1 cores=$cores" \
			"debug why structural high findings are not launching repair Codex jobs; fix cooldown/admission/session accounting instead of waiting for manual intervention"
	fi
	if [ "$load_ok" = 1 ] && [ "$codex_workers" -lt 2 ] && [ "$(( critical_queue + deferred_queue ))" -gt 0 ] && [ "$controller_sessions" -ge 5 ]; then
		emit_finding "$out" high "analysis-productivity" "queued-pr-work-low-codex-fanout" \
			"$ANALYSIS_PRODUCTIVITY_REPORT critical_queue=$critical_queue deferred_queue=$deferred_queue controller_sessions=$controller_sessions codex_workers=$codex_workers load1=$load1 cores=$cores" \
			"inspect PR/deferred controller admission and launch targeted unblock/finalization analysis for queued work rather than leaving only passive controllers alive"
	fi
	if [ "$codex_workers" -gt "$ANALYSIS_MAX_CODEX_WORKERS" ]; then
		emit_finding "$out" high "analysis-productivity" "codex-fanout-over-cap" \
			"$ANALYSIS_PRODUCTIVITY_REPORT codex_workers=$codex_workers cap=$ANALYSIS_MAX_CODEX_WORKERS load1=$load1 cores=$cores" \
			"stop optional persona/review rounds, preserve targeted failure analysis and repair owners, and verify the guard keeps Codex worker count at or below the cap"
	fi
}

log_matches_after_last_start() {
	local file=$1 start_pattern=$2 error_pattern=$3
	[ -s "$file" ] || return 1
	awk -v start="$start_pattern" -v err="$error_pattern" '
		BEGIN {
			found = 0
		}
		tolower($0) ~ tolower(start) {
			found = 0
			next
		}
		tolower($0) ~ tolower(err) {
			found = 1
		}
		END {
			exit found ? 0 : 1
		}
	' "$file"
}

emit_finding() {
	local out=$1 severity=$2 component=$3 key=$4 evidence=$5 next_action=$6
	printf '%s\t%s\t%s\t%s\t%s\t%s\n' \
		"$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$severity" "$component" "$key" "$evidence" "$next_action" >> "$out"
}

check_status_freshness() {
	local out=$1 component=$2 file=$3 max_age=$4 session=$5 age parent_age parent_dir
	if [ ! -s "$file" ]; then
		if [ -z "$session" ] || has_session "$session"; then
			parent_dir=$(dirname "$file")
			if [ -d "$parent_dir" ]; then
				parent_age=$(file_age_seconds "$parent_dir" || printf 999999)
				if [ "$parent_age" -le "$max_age" ]; then
					return 0
				fi
			fi
			emit_finding "$out" high "$component" "missing-status" "$file" "restore status generation for $component"
		fi
		return 0
	fi
	age=$(file_age_seconds "$file" || printf 999999)
	if [ "$age" -gt "$max_age" ] && { [ -z "$session" ] || has_session "$session"; }; then
		emit_finding "$out" high "$component" "stale-status" "$file age=${age}s max=${max_age}s" "debug why live loop is not updating status"
	fi
}

check_productive_analysis_health() {
	local out=$1

	if log_matches_after_last_start "$PRODUCTIVE_ANALYSIS_BASE/logs/productive-analysis-loop.log" 'productive-analysis loop started' 'cannot stat .*[.]tmp|duplicate session: rtc-productive-lane-|cycle failed rc='; then
		emit_finding "$out" high "productive-analysis" "recent-cycle-or-launch-error" \
			"$PRODUCTIVE_ANALYSIS_BASE/logs/productive-analysis-loop.log" \
			"debug recent productive-analysis cycle failure; do not treat fresh current-status.md as sufficient health"
	fi
}

browser_pool_current_root() {
	case "$1" in
		strict-expansion)
			sed -n '1p' "$STRICT_EXPANSION_BASE/current-run-root.txt" 2>/dev/null || true
			;;
		focused-shards)
			sed -n '1p' "$FOCUSED_SHARDS_BASE/current-run-root.txt" 2>/dev/null || true
			;;
		gap-booster)
			sed -n '1p' "$GAP_BOOSTER_BASE/current-run-root.txt" 2>/dev/null || true
			;;
	esac
}

browser_pool_sessions_for_component() {
	case "$1" in
		strict-expansion)
			printf '%s\t%s\t%s\n' rtc-fuzz-strict-expansion rtc-fuzz-strict-expansion-watchdog rtc-fuzz-strict-expansion-analysis
			;;
		focused-shards)
			printf '%s\t%s\t%s\n' rtc-focused-shards rtc-focused-shards-watchdog rtc-focused-shards-analysis
			;;
		gap-booster)
			printf '%s\t%s\t%s\n' rtc-gap-booster rtc-gap-booster-watchdog rtc-gap-booster-analysis
			;;
	esac
}

browser_pool_supervisor_state_fresh() {
	local component=$1 max_age=${2:-900} root age supervisor_session watchdog_session analysis_session

	root=$(browser_pool_current_root "$component")
	[ -n "$root" ] && [ -s "$root/supervisor-state.json" ] || return 1
	age=$(file_age_seconds "$root/supervisor-state.json" || printf 999999)
	[ "$age" -le "$max_age" ] || return 1
	IFS=$'\t' read -r supervisor_session watchdog_session analysis_session <<<"$(browser_pool_sessions_for_component "$component")"
	has_session "$supervisor_session" &&
		has_session "$watchdog_session" &&
		has_session "$analysis_session"
}

check_browser_pool_supervisor_freshness() {
	local out=$1 component=$2 max_age=${3:-900} root age supervisor_session watchdog_session analysis_session live_hint

	root=$(browser_pool_current_root "$component")
	[ -n "$root" ] && [ -d "$root" ] || return 0
	[ -s "$root/supervisor-state.json" ] || return 0
	age=$(file_age_seconds "$root/supervisor-state.json" || printf 999999)
	[ "$age" -gt "$max_age" ] || return 0
	IFS=$'\t' read -r supervisor_session watchdog_session analysis_session <<<"$(browser_pool_sessions_for_component "$component")"
	live_hint=0
	has_session "$supervisor_session" && live_hint=1
	has_session "$watchdog_session" && live_hint=1
	has_session "$analysis_session" && live_hint=1
	[ "$live_hint" = 1 ] || return 0
	emit_finding "$out" high "$component" "stale-supervisor-state" \
		"$root/supervisor-state.json age=${age}s max=${max_age}s sessions=$supervisor_session,$watchdog_session,$analysis_session" \
		"teach guard to restart or retire stale sidecars for $component when supervisor-state stops advancing; do not let analysis monitors keep polling stale current roots"
}

check_exact_sessions() {
	local out=$1 name prefix_matches
	local required_sessions=(
		rtc-coverage-guided-novelty \
		rtc-coverage-guided-watchdog \
		rtc-deferred-work-promotion-loop \
		rtc-pr-progress-controller-loop \
		rtc-pr-finalization-loop \
		rtc-critical-path-pr-executor-loop \
		rtc-resource-autoscaler
	)
	if [ "$REQUIRE_LEVEL_MIX_REVIEW" = "1" ]; then
		required_sessions+=(rtc-fuzz-level-mix-persona-loop rtc-fuzz-level-mix-persona-loop-watchdog)
	fi
	if [ "$REQUIRE_DUPLICATE_NOISE_REVIEW" = "1" ]; then
		required_sessions+=(rtc-duplicate-noise-persona-loop)
	fi
	for name in "${required_sessions[@]}"; do
		if has_session "$name"; then
			continue
		fi
		prefix_matches=$(tmux_sessions | awk -v name="$name" 'index($0, name) == 1 { print }' | paste -sd, -)
		if [ -n "$prefix_matches" ]; then
			emit_finding "$out" high "tmux" "prefix-session-mask-$name" "$prefix_matches" "replace prefix session checks with exact-session checks and restart missing $name"
		fi
	done
}

check_coverage_process_ownership() {
	local out=$1 current_root pid output_root stale_pids=() current_pids=()
	current_root=$(sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)
	[ -n "$current_root" ] || return 0
	for pid in $(pgrep -f '[n]ode bin/rtc-browser-fuzz-novelty-monitor[.]mjs' 2>/dev/null || true); do
		[ -r "/proc/$pid/environ" ] || continue
		output_root=$(tr '\0' '\n' < "/proc/$pid/environ" | sed -n 's/^RTC_FUZZ_NOVELTY_OUTPUT_DIR=//p' | head -1)
		[ -n "$output_root" ] || continue
		if [ "$output_root" = "$current_root" ]; then
			current_pids+=( "$pid" )
		else
			stale_pids+=( "$pid:$output_root" )
		fi
	done
	if [ "${#stale_pids[@]}" -gt 0 ]; then
		emit_finding "$out" high "coverage-guided" "stale-root-novelty-monitor" \
			"current=$current_root stale=$(IFS=,; printf '%s' "${stale_pids[*]}")" \
			"terminate monitors whose RTC_FUZZ_NOVELTY_OUTPUT_DIR differs from current-output-dir.txt; keep pointer self-termination and stale-root cleanup enabled"
	fi
	if [ "${#current_pids[@]}" -gt 1 ]; then
		emit_finding "$out" high "coverage-guided" "multiple-current-root-novelty-monitors" \
			"current=$current_root pids=$(IFS=,; printf '%s' "${current_pids[*]}")" \
			"enforce one process-lock owner for the current root and terminate duplicate monitor process groups"
	fi
}

check_retained_first_green_honored() {
	local out=$1 coverage_root=$2 state_path manifest_path issues critical_blocker
	state_path=$coverage_root/novelty-state.json
	manifest_path=$coverage_root/source-manifest.tsv
	[ -s "$state_path" ] || return 0
	[ -s "$manifest_path" ] || return 0
	issues=$(node - "$state_path" "$coverage_root" "$manifest_path" <<'NODE'
const fs = require( 'fs' );
let state;
try {
	state = JSON.parse( fs.readFileSync( process.argv[ 2 ], 'utf8' ) );
} catch {
	process.exit( 0 );
}
const manifest = {};
for ( const line of fs.readFileSync( process.argv[ 4 ], 'utf8' ).split( /\r?\n/ ) ) {
	const [ key, ...rest ] = line.split( '\t' );
	if ( key ) {
		manifest[ key ] = rest.join( '\t' );
	}
}
const evidenceScope =
	manifest.candidate_head && manifest.state_compatibility_sha256
		? `${ manifest.candidate_head }:${ manifest.state_compatibility_sha256 }`
		: `output:${ process.argv[ 3 ] }`;
const requiredGroups = [
	'novelty-http-plain-editor-product-smoke',
	'novelty-http-real-world-editor-usability',
];
const satisfied = new Set(
	state.satisfiedRequiredFirstGreenProductGroups ?? []
);
const pending = new Set(
	state.pendingRequiredFirstGreenProductGroups ?? []
);
const marker = new Set(
	String( state.satisfiedRequiredFirstGreenProductGroupMarker ?? '' )
		.split( ',' )
		.map( ( value ) => value.trim() )
		.filter( Boolean )
);
const scopedHistory = new Set(
	( state.changes ?? [] ).flatMap( ( change ) =>
		change?.evidenceScope === evidenceScope &&
		[ 'scope-required-product-first-green', 'honor-retained-required-product-first-green' ].includes(
			change.action
		) &&
		Array.isArray( change.groups )
			? change.groups
			: []
	)
);
const protectedSatisfied = new Set(
	state.protectedSatisfiedRequiredFirstGreenProductGroups ?? []
);
for ( const group of state.publishedSatisfiedRequiredFirstGreenProductGroups ?? [] ) {
	if ( ! protectedSatisfied.has( group ) ) {
		process.stdout.write( `${ group }:republished_as_generic_backfill\n` );
	}
}
if (
	( satisfied.size > 0 || scopedHistory.size > 0 ) &&
	state.satisfiedRequiredFirstGreenProductEvidenceScope !== evidenceScope
) {
	process.stdout.write(
		`scope:mismatch=${ state.satisfiedRequiredFirstGreenProductEvidenceScope ?? 'missing' }:expected=${ evidenceScope }\n`
	);
}
for ( const group of requiredGroups ) {
	const currentOutputSuccess = Math.max(
		Number( state.currentRunSuccessfulRecordCountsByGroup?.[ group ] ?? 0 ),
		state.benchmarkCanaryRecordCountsOutputDir === process.argv[ 3 ]
			? Number(
					state.benchmarkCanaryRetainedSuccessfulRecordCountsByGroup?.[
						group
					] ?? 0
			  )
			: 0
	);
	if ( currentOutputSuccess > 0 && ! satisfied.has( group ) ) {
		process.stdout.write(
			`${ group }:current_output_success=${ currentOutputSuccess }\n`
		);
	}
	if ( scopedHistory.has( group ) && ! satisfied.has( group ) ) {
		process.stdout.write( `${ group }:durable_history_not_honored\n` );
	}
	if ( satisfied.has( group ) && ! marker.has( group ) ) {
		process.stdout.write( `${ group }:marker_missing\n` );
	}
	if ( satisfied.has( group ) && pending.has( group ) ) {
		process.stdout.write( `${ group }:also_pending_first_green\n` );
	}
}
NODE
	)
	if [ -n "$issues" ]; then
		emit_finding "$out" high "coverage-guided" "retained-first-green-not-honored" \
			"root=$coverage_root issues=$(printf '%s' "$issues" | paste -sd, -) state=$state_path" \
			"keep required product first-green success monotonic within one candidate/state-compatibility scope so rotating an output root cannot reopen the gate"
	fi
	if node - "$state_path" <<'NODE'
const fs = require( 'fs' );
let state;
try {
	state = JSON.parse( fs.readFileSync( process.argv[ 2 ], 'utf8' ) );
} catch {
	process.exit( 1 );
}
const group = 'novelty-http-plain-editor-product-smoke';
const satisfied = new Set(
	state.satisfiedRequiredFirstGreenProductGroups ?? []
);
const quarantined = new Set( [
	...( Array.isArray( state.productFailureQuarantinedGroups )
		? state.productFailureQuarantinedGroups
		: [] ),
	...String( state.productFailureQuarantineMarker ?? '' )
		.split( ',' )
		.map( ( value ) => value.trim() )
		.filter( Boolean ),
] );
process.exit( satisfied.has( group ) && ! quarantined.has( group ) ? 0 : 1 );
NODE
	then
		critical_blocker=$(awk -F '\t' '
			NR > 1 && $1 == "plain-editor-product-smoke" && $4 !~ /^(terminal|resolved)$/ {
				print
				exit
			}
		' "$CRITICAL_BASE/blockers.tsv" 2>/dev/null || true)
		if [ -n "$critical_blocker" ]; then
			emit_finding "$out" high "critical-path" "retained-first-green-not-consumed" \
				"root=$coverage_root state=$state_path blocker=$critical_blocker" \
				"make the critical-path plain-editor gate consume novelty-state durable success or the satisfied first-green marker after checking retained product-failure quarantine; reconcile and retire any superseded smoke continuation"
		fi
	fi
	return 0
}

check_deadline_budget_consistency() {
	local out=$1 root run_script cap current_target current_max desired_line desired_target desired_max pointer_age
	root=$(sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)
	run_script=${root:+$root/run-monitor.sh}
	[ -n "$run_script" ] && [ -s "$run_script" ] || return 0
	pointer_age=$(file_age_seconds "$COVERAGE_BASE/current-output-dir.txt" || printf 999999)
	if [ "$pointer_age" -lt 300 ]; then
		return 0
	fi
	cap=$(sed -n "s/^export RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP='\([^']*\)'.*/\1/p" "$run_script" | tail -1)
	[ "$cap" = 1 ] || return 0
	current_target=$(sed -n "s/^export RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS='\([^']*\)'.*/\1/p" "$run_script" | tail -1)
	current_max=$(sed -n "s/^export RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS='\([^']*\)'.*/\1/p" "$run_script" | tail -1)
	desired_line=$(sed -n 's/^- desired_budget: target=\([0-9][0-9]*\) max=\([0-9][0-9]*\).*/\1 \2/p' "$RESOURCE_BASE/resource-autoscaler-status.md" | tail -1)
	read -r desired_target desired_max <<< "${desired_line:-0 0}"
	[[ "$current_target" =~ ^[0-9]+$ ]] || current_target=0
	[[ "$current_max" =~ ^[0-9]+$ ]] || current_max=0
	[[ "$desired_target" =~ ^[0-9]+$ ]] || desired_target=0
	[[ "$desired_max" =~ ^[0-9]+$ ]] || desired_max=0
	if [ "$desired_target" -gt "$current_target" ] || [ "$desired_max" -gt "$current_max" ]; then
		emit_finding "$out" high "resource-autoscaler" "deadline-budget-policy-mismatch" \
			"run=$root current=$current_target/$current_max desired=$desired_target/$desired_max cap=$cap" \
			"treat the current deadline-capped run budget as authoritative; do not replace a same-head root with a larger request that the coverage start policy will clamp back down"
	fi
}

check_optional_browser_breadth_floor_contract() {
	local out=$1 guard_source=$REPO/bin/rtc-jetstream-guard-remote.sh source issues=''
	if ! grep -Fq 'if [[ "$desired" =~ ^[0-9]+$ ]] && [ "$desired" -gt 0 ] && [ "$desired" -lt "$min" ]; then' "$guard_source" 2>/dev/null ||
		! grep -Fq 'min=$desired' "$guard_source" 2>/dev/null; then
		emit_finding "$out" high "guard" "optional-browser-impossible-breadth-floor" \
			"guard=$guard_source configured_floor=${RTC_RESOURCE_AUTOSCALER_MIN_COVERAGE_BREADTH_GROUPS:-10}" \
			"clamp the optional-pool breadth prerequisite to the autoscaler's positive desired coverage budget so a deliberate deadline cap cannot disable every optional browser pool"
	fi
	if ! grep -Fq 'OPTIONAL_STRICT_ENABLED_NAMES=${RTC_GUARD_OPTIONAL_STRICT_ENABLED_NAMES:-' "$guard_source" 2>/dev/null ||
		! grep -Fq 'OPTIONAL_FOCUSED_ENABLED_NAMES=${RTC_GUARD_OPTIONAL_FOCUSED_ENABLED_NAMES:-' "$guard_source" 2>/dev/null; then
		emit_finding "$out" high "guard" "optional-browser-unbounded-startup-fanout" \
			"guard=$guard_source" \
			"keep explicit bounded strict and focused profile sets in guard-managed optional starts so spare-capacity admission cannot launch every legacy profile at once"
	fi
	for source in \
		"$REPO/bin/rtc-strict-expansion-start-remote.sh" \
		"$REPO/bin/rtc-focused-shards-start-remote.sh" \
		"$REPO/bin/rtc-gap-booster-start-remote.sh"; do
		grep -Fq 'RTC_FUZZ_TRIAGE_MAX_PARALLEL=1' "$source" 2>/dev/null || issues="${issues}${issues:+,}$source:triage"
		grep -Fq 'RTC_FUZZ_LIVE_ANALYSIS_MAX_PARALLEL=1' "$source" 2>/dev/null || issues="${issues}${issues:+,}$source:live"
	done
	if ! grep -Fq '"$STRICT_EXPANSION_BASE"/repos-*/*' "$guard_source" 2>/dev/null ||
		! grep -Fq '"$FOCUSED_SHARDS_BASE"/repos-*/*' "$guard_source" 2>/dev/null ||
		! grep -Fq '"$GAP_BOOSTER_BASE"/repos-*/*' "$guard_source" 2>/dev/null ||
		! grep -Fq 'optional_analysis_admission_allows' "$guard_source" 2>/dev/null ||
		! grep -Fq 'tmux_session_owning_pid' "$guard_source" 2>/dev/null ||
		! grep -Fq "tmux list-panes -a -F \$'#{session_name}\\t#{pane_pid}'" "$guard_source" 2>/dev/null ||
		! grep -Fq "tmux list-panes -a -F \$'#{session_name}\\t#{pane_current_path}'" "$guard_source" 2>/dev/null; then
		issues="${issues}${issues:+,}$guard_source:global-trim"
	fi
	if [ -n "$issues" ]; then
		emit_finding "$out" high "analysis-productivity" "optional-browser-analysis-fanout-unbounded" \
			"$issues" \
			"limit optional browser triage and live analysis to one worker per pool and let the guard trim Codex workers from every optional browser repo when the global cap is exceeded"
	fi
}

check_gate_only_timeout_contract() {
	local out=$1 source issues=''
	for source in \
		"$REPO/bin/rtc-browser-fuzz-analysis-tier.mjs" \
		"$REPO/bin/rtc-browser-fuzz-deep-analysis-tier.mjs"; do
		if ! grep -Fq "detached: process.platform !== 'win32'" "$source" 2>/dev/null ||
			! grep -Fq "process.kill( -child.pid, signal )" "$source" 2>/dev/null ||
			! grep -Fq "terminateGateOnlyTriageChild( child, 'SIGKILL' )" "$source" 2>/dev/null; then
			issues="${issues}${issues:+,}$source"
		fi
	done
	if [ -n "$issues" ]; then
		emit_finding "$out" high "coverage-guided" "gate-only-timeout-leaks-descendants" \
			"sources=$issues" \
			"spawn gate-only refreshes in their own process group and escalate timeout termination from SIGTERM to SIGKILL for the complete group so metadata refreshes cannot leave stale scanners or descendants"
	fi
}

check_optional_pool_launcher_sync() {
	local out=$1 relative stable canonical launcher_key
	while read -r relative stable; do
		canonical=$REPO/$relative
		launcher_key=${stable##*/}
		if [ ! -x "$canonical" ]; then
			emit_finding "$out" high "guard" "optional-pool-versioned-launcher-missing-$launcher_key" \
				"canonical=$canonical stable=$stable" \
				"restore the versioned optional-pool launcher before admitting that pool"
			continue
		fi
		if [ ! -x "$stable" ] || ! cmp -s "$canonical" "$stable"; then
			emit_finding "$out" high "guard" "optional-pool-stable-launcher-missing-or-stale-$launcher_key" \
				"canonical=$canonical stable=$stable" \
				"let the guard atomically refresh the stable launcher from the versioned source, then retry the optional pool"
		fi
	done <<'LAUNCHERS'
bin/rtc-strict-expansion-start-remote.sh /tmp/start_rtc_strict_expansion.sh
bin/rtc-focused-shards-start-remote.sh /tmp/start_rtc_focused_shards.sh
bin/rtc-focused-shards-cleanup-remote.sh /tmp/cleanup_rtc_focused_shards.sh
bin/rtc-focused-shards-gap-codex-loop-remote.sh /tmp/start_rtc_focused_gap_codex_loop.sh
bin/rtc-gap-booster-start-remote.sh /tmp/start_rtc_gap_booster.sh
LAUNCHERS
}

check_docker_network_capacity() {
	local out=$1 reaper=$REPO/bin/rtc-docker-network-reaper-remote.mjs guard=$REPO/bin/rtc-jetstream-guard-remote.sh
	local count trigger=${RTC_DOCKER_NETWORK_REAPER_TRIGGER_COUNT:-24}
	if [ ! -x "$reaper" ]; then
		emit_finding "$out" high "docker" "network-reaper-missing" \
			"reaper=$reaper" \
			"restore the bounded ownership-aware stale wp-env project reaper"
		return 0
	fi
	if ! grep -Fq 'DOCKER_NETWORK_REAPER_TRIGGER_COUNT=${RTC_DOCKER_NETWORK_REAPER_TRIGGER_COUNT:-24}' "$guard" 2>/dev/null ||
		! grep -Fq 'RTC_DOCKER_NETWORK_REAPER_TARGET_COUNT=${RTC_DOCKER_NETWORK_REAPER_TARGET_COUNT:-20}' "$guard" 2>/dev/null ||
		! grep -Fq 'RTC_DOCKER_NETWORK_REAPER_MAX_PROJECTS=${RTC_DOCKER_NETWORK_REAPER_MAX_PROJECTS:-4}' "$guard" 2>/dev/null ||
		! grep -Fq 'RTC_DOCKER_NETWORK_REAPER_EMPTY_RETENTION_SECONDS=${RTC_DOCKER_NETWORK_REAPER_EMPTY_RETENTION_SECONDS:-300}' "$guard" 2>/dev/null ||
		! grep -Fq 'setsid timeout 90 "$NODE_BIN/node" "$DOCKER_NETWORK_REAPER"' "$guard" 2>/dev/null ||
		! grep -Fq 'child_pid_is_group=1' "$guard" 2>/dev/null ||
		! grep -Fq "'20'," "$reaper" 2>/dev/null; then
		emit_finding "$out" high "docker" "network-reaper-trigger-exceeds-optional-admission-limit" \
			"guard=$guard optional_limit=24" \
			"run stale continuation cleanup at 24 networks with a target of 20, before strict and focused optional-pool admission blocks at 24"
		return 0
	fi
	count=$(docker network ls -q 2>/dev/null | wc -l | tr -d ' ')
	[[ "$count" =~ ^[0-9]+$ ]] || return 0
	if [ "$count" -ge "$trigger" ]; then
		emit_finding "$out" high "docker" "network-pool-near-exhaustion" \
			"networks=$count trigger=$trigger status=/media/volume/danluu-fuzz-data/rtc-docker-network-reaper-20260710/current-status.json" \
			"run the bounded stale wp-env project reaper and keep optional starts blocked until Docker has subnet headroom"
	fi
}

check_supervisor_publication_budget() {
	local out=$1 coverage_root=$2 run_script=$coverage_root/run-monitor.sh state_path=$coverage_root/novelty-state.json
	local groups_path=$coverage_root/supervisor-groups.json max_groups issues root_started_at
	[ -s "$run_script" ] && [ -s "$state_path" ] || return 0
	max_groups=$(sed -n "s/^export RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS='\([0-9][0-9]*\)'.*/\1/p" "$run_script" | tail -1)
	[[ "$max_groups" =~ ^[0-9]+$ ]] || return 0
	root_started_at=$(stat -c %Y "$coverage_root/source-manifest.tsv" 2>/dev/null || printf 0)
	issues=$(node - "$state_path" "$groups_path" "$max_groups" "$root_started_at" <<'NODE'
const fs = require( 'fs' );
const statePath = process.argv[ 2 ];
const groupsPath = process.argv[ 3 ];
const maxGroups = Number( process.argv[ 4 ] );
const rootStartedAt = Number( process.argv[ 5 ] ) * 1000;
let state;
try {
	state = JSON.parse( fs.readFileSync( statePath, 'utf8' ) );
} catch {
	process.exit( 0 );
}
try {
	const groups = JSON.parse( fs.readFileSync( groupsPath, 'utf8' ) );
	if ( Array.isArray( groups ) && groups.length > maxGroups ) {
		process.stdout.write(
			`published_groups=${ groups.length }:max=${ maxGroups }\n`
		);
	}
} catch {}
const cutoff = Date.now() - 15 * 60 * 1000;
const oversizedDecisions = ( state.changes ?? [] ).filter( ( change ) => {
	if ( change?.action !== 'cap-supervisor-groups-to-effective-budget' ) {
		return false;
	}
	const at = Date.parse( change.at ?? '' );
	return (
		Number.isFinite( at ) &&
		at >= Math.max( cutoff, rootStartedAt ) &&
		Number( change.maxEnabledGroups ?? 0 ) > maxGroups
	);
} );
if ( oversizedDecisions.length > 0 ) {
	const latest = oversizedDecisions.at( -1 );
	process.stdout.write(
		`recent_monitor_limit=${ latest.maxEnabledGroups }:max=${ maxGroups }:at=${ latest.at }\n`
	);
}
NODE
	)
	[ -n "$issues" ] || return 0
	emit_finding "$out" high "coverage-guided" "supervisor-publication-exceeds-start-budget" \
		"root=$coverage_root issues=$(printf '%s' "$issues" | paste -sd, -) run_script=$run_script state=$state_path" \
		"keep the locked startup max authoritative when publishing supervisor groups; coverage-gap reserves must reorder or replace budgeted slots, never add slots that the autoscaler must trim"
}

check_novelty_monitor_budget_policy_contract() {
	local out=$1 source issues=''
	if [ ! -f "$NOVELTY_POLICY_CHECK" ]; then
		emit_finding "$out" high "coverage-guided" "novelty-budget-policy-check-missing" \
			"checker=$NOVELTY_POLICY_CHECK" \
			"restore the executable novelty monitor policy check and require it in both coverage start and guard admission"
		return 0
	fi
	for source in \
		"$REPO/bin/rtc-browser-fuzz-novelty-monitor.mjs" \
		"$COVERAGE_BASE/candidate-source/bin/rtc-browser-fuzz-novelty-monitor.mjs"
	do
		[ -f "$source" ] || continue
		if ! "$NODE_BIN/node" "$NOVELTY_POLICY_CHECK" "$source" >/dev/null 2>&1; then
			issues="${issues}${issues:+,}$source"
		fi
	done
	[ -z "$issues" ] || emit_finding "$out" high "coverage-guided" "novelty-budget-policy-contract-failed" \
		"sources=$issues checker=$NOVELTY_POLICY_CHECK" \
		"stop the coverage-guidance writer, restore the last frozen validated monitor, and keep MAX_ENABLED_GROUPS as the hard bootstrap and steady-state publication ceiling"
}

check_tmux_capture_guard() {
	local out=$1 canonical=$CODEX_BIN_DIR/tmux global=/usr/local/bin/tmux issues=''
	if [ ! -x "$canonical" ] ||
		! grep -Fq 'capture-pane is disabled because it crashes tmux on this host' "$canonical" 2>/dev/null ||
		! grep -Fq 'capture-pane|capturep' "$canonical" 2>/dev/null; then
		issues="user_wrapper=${canonical}:missing-or-unsafe"
	fi
	if [ ! -x "$global" ] || ! cmp -s "$canonical" "$global"; then
		issues="${issues}${issues:+,}global_wrapper=${global}:missing-or-drifted"
	fi
	[ -z "$issues" ] || emit_finding "$out" high "tmux" "capture-pane-crash-guard-missing" \
		"$issues" \
		"install the versioned safe tmux wrapper at /usr/local/bin/tmux and the operator user bin so capture-pane and capturep are rejected even with explicit -L or -S socket selection"
}

check_resource_budget_application_consistency() {
	local out=$1 status=$RESOURCE_BASE/resource-autoscaler-status.md
	local root run_script status_age action desired_line desired_target desired_max
	local budget_target budget_max run_target run_max
	[ -s "$status" ] || return 0
	status_age=$(file_age_seconds "$status" || printf 999999)
	[ "$status_age" -le 600 ] || return 0
	action=$(sed -n 's/^- last_action: //p' "$status" | tail -1)
	case "$action" in
		*in_place*) ;;
		*) return ;;
	esac
	desired_line=$(sed -n 's/^- desired_budget: target=\([0-9][0-9]*\) max=\([0-9][0-9]*\).*/\1 \2/p' "$status" | tail -1)
	read -r desired_target desired_max <<< "${desired_line:-0 0}"
	root=$(sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)
	run_script=${root:+$root/run-monitor.sh}
	[ -s "$run_script" ] || return 0
	budget_target=$(sed -n "s/^export RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS='\([^']*\)'.*/\1/p" "$RESOURCE_BASE/current-budget.env" | tail -1)
	budget_max=$(sed -n "s/^export RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS='\([^']*\)'.*/\1/p" "$RESOURCE_BASE/current-budget.env" | tail -1)
	run_target=$(sed -n "s/^export RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS='\([^']*\)'.*/\1/p" "$run_script" | tail -1)
	run_max=$(sed -n "s/^export RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS='\([^']*\)'.*/\1/p" "$run_script" | tail -1)
	if [ "$budget_target" != "$desired_target" ] || [ "$budget_max" != "$desired_max" ] ||
			[ "$run_target" != "$desired_target" ] || [ "$run_max" != "$desired_max" ]; then
		emit_finding "$out" high "resource-autoscaler" "resource-budget-application-diverged" \
			"status=$status action=$action desired=$desired_target/$desired_max budget=${budget_target:-missing}/${budget_max:-missing} run=${run_target:-missing}/${run_max:-missing} root=$root" \
			"make budget executors apply the already-decided target without re-reading mutable benchmark floors; reject and repair any write whose persisted budget differs from the decision"
	fi
}

check_actionable_product_failure_bridge() {
	local out=$1 candidate_head failure_dir origin_head snapshot count newest_epoch newest_age blocker
	local -a failure_dirs=()
	if ! grep -Fq 'ACTIONABLE_PRODUCT_FAILURE_BASE' "$CRITICAL_REPO_SCRIPT" 2>/dev/null; then
		emit_finding "$out" high "critical-path" "actionable-product-failure-bridge-missing" \
			"script=$CRITICAL_REPO_SCRIPT" \
			"make candidate-keyed likely-real analysis results durable inputs to benchmark-canary-product-failure instead of relying only on the runner's initial classification"
		return 0
	fi
	if ! grep -Fq 'merge-base --is-ancestor "$origin_head" "$candidate_head"' "$CRITICAL_REPO_SCRIPT" 2>/dev/null; then
		emit_finding "$out" high "critical-path" "actionable-product-failure-descendant-carry-missing" \
			"script=$CRITICAL_REPO_SCRIPT" \
			"carry open likely-real records from ancestor candidate heads into descendant candidate blockers until repeated same-head repair proof or an explicit source-backed downscope resolves them"
		return 0
	fi
	coverage_start_in_progress && return 0
	candidate_head=$(git -C "$CANDIDATE_REPO" rev-parse --verify --quiet "refs/heads/$CANDIDATE_BRANCH^{commit}" 2>/dev/null || true)
	[ -n "$candidate_head" ] || return 0
	failure_dir=$COVERAGE_BASE/actionable-product-failures/$candidate_head
	[ ! -d "$failure_dir" ] || failure_dirs+=( "$failure_dir" )
	if [ -d "$COVERAGE_BASE/actionable-product-failures" ]; then
		for failure_dir in "$COVERAGE_BASE/actionable-product-failures"/*; do
			[ -d "$failure_dir" ] || continue
			origin_head=${failure_dir##*/}
			[[ "$origin_head" =~ ^[0-9a-f]{40}$ ]] || continue
			[ "$origin_head" != "$candidate_head" ] || continue
			git -C "$CANDIDATE_REPO" cat-file -e "$origin_head^{commit}" 2>/dev/null || continue
			git -C "$CANDIDATE_REPO" merge-base --is-ancestor "$origin_head" "$candidate_head" 2>/dev/null || continue
			failure_dirs+=( "$failure_dir" )
		done
	fi
	[ "${#failure_dirs[@]}" -gt 0 ] || return 0
	snapshot=$("$NODE_BIN/node" - "${failure_dirs[@]}" <<'NODE'
const fs = require( 'fs' );
const path = require( 'path' );
let count = 0;
let newest = 0;
const seen = new Set();
for ( const directory of process.argv.slice( 2 ) ) {
	for ( const name of fs.readdirSync( directory ) ) {
		if ( ! name.endsWith( '.json' ) ) continue;
		const file = path.join( directory, name );
		try {
			const record = JSON.parse( fs.readFileSync( file, 'utf8' ) );
			if (
				record.status !== 'open' ||
				record.classification !== 'likely_real'
			) continue;
			const key = `${ record.group ?? '' }\t${ record.signature ?? '' }`;
			if ( seen.has( key ) ) continue;
			seen.add( key );
			count++;
			newest = Math.max( newest, fs.statSync( file ).mtimeMs );
		} catch {}
	}
}
process.stdout.write( `${ count }\t${ Math.floor( newest / 1000 ) }\n` );
NODE
	)
	read -r count newest_epoch <<< "${snapshot:-0 0}"
	[[ "$count" =~ ^[0-9]+$ ]] || count=0
	[ "$count" -gt 0 ] || return 0
	[[ "${newest_epoch:-}" =~ ^[0-9]+$ ]] || newest_epoch=0
	newest_age=$(( $(date -u +%s) - newest_epoch ))
	[ "$newest_age" -ge 180 ] || return 0
	blocker=$(awk -F '\t' 'NR > 1 && $1 == "benchmark-canary-product-failure" && $4 !~ /^(terminal|resolved)$/ { print; exit }' "$CRITICAL_BASE/blockers.tsv" 2>/dev/null || true)
	if [ -z "$blocker" ]; then
		emit_finding "$out" high "critical-path" "actionable-product-failure-not-routed" \
			"candidate=$candidate_head open_records=$count age=${newest_age}s dirs=$(IFS=,; printf '%s' "${failure_dirs[*]}") blockers=$CRITICAL_BASE/blockers.tsv" \
			"reconcile current and ancestor candidate likely-real analysis records into a benchmark-canary-product-failure blocker and launch one bounded repair/reduction owner"
	fi
	return 0
}

check_coverage_start_budget_snapshot() {
	local out=$1 coverage_root=$2 start_script=$REPO/bin/rtc-coverage-guided-start-remote.sh
	local manifest=$coverage_root/source-manifest.tsv snapshot=$coverage_root/resource-budget-at-start.env
	local effective=$coverage_root/resource-budget-effective-at-start.env source mismatch='' snapshot_value effective_value name
	local root_age effective_target effective_max current_target current_max effective_cap current_cap run_script
	if [ ! -s "$start_script" ] || ! grep -Fq 'BUDGET_ENV_SNAPSHOT' "$start_script"; then
		emit_finding "$out" high "coverage-guided" "coverage-start-budget-not-snapshotted" \
			"script=$start_script" \
			"snapshot current-budget.env while holding the serialized coverage start lock, before candidate preparation or pointer movement, so the autoscaler cannot change the replacement run budget mid-start"
		return 0
	fi
	[ -s "$manifest" ] || return 0
	grep -q '^resource_budget_at_start_sha256[[:space:]]' "$manifest" || return 0
	if [ ! -s "$snapshot" ] || [ ! -s "$effective" ] || [ ! -s "$coverage_root/resource-budget-source.txt" ]; then
		emit_finding "$out" high "coverage-guided" "coverage-start-budget-evidence-missing" \
			"root=$coverage_root snapshot=$snapshot effective=$effective source=$coverage_root/resource-budget-source.txt" \
			"persist the start-lock budget snapshot, effective launch budget, and precedence source in every new coverage root"
		return 0
	fi
	source=$(sed -n '1p' "$coverage_root/resource-budget-source.txt")
	if [ "$source" = start-lock-snapshot ]; then
		for name in \
			RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS \
			RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS \
			RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS \
			RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS \
			RTC_FUZZ_NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS \
			RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP
		do
			snapshot_value=$(sed -n "s/^export $name='\([^']*\)'.*/\1/p" "$snapshot" | tail -1)
			effective_value=$(sed -n "s/^export $name='\([^']*\)'.*/\1/p" "$effective" | tail -1)
			if [ -n "$snapshot_value" ] && [ "$snapshot_value" != "$effective_value" ]; then
				mismatch="${mismatch}${mismatch:+,}$name:${snapshot_value}->${effective_value:-missing}"
			fi
		done
		if [ -n "$mismatch" ]; then
			emit_finding "$out" high "coverage-guided" "coverage-start-budget-changed-after-snapshot" \
				"root=$coverage_root mismatch=$mismatch snapshot=$snapshot effective=$effective" \
				"keep the start-lock resource budget immutable through pointer movement, exact candidate preparation, and generated monitor publication; let the autoscaler adjust only after the run is live"
		fi
	fi

	run_script=$coverage_root/run-monitor.sh
	[ -s "$run_script" ] || return 0
	root_age=$(file_age_seconds "$manifest" || printf 999999)
	[ "$root_age" -lt "$COVERAGE_FULL_PASS_START_GRACE_SECONDS" ] || return 0
	effective_target=$(sed -n "s/^export RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS='\([^']*\)'.*/\1/p" "$effective" | tail -1)
	effective_max=$(sed -n "s/^export RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS='\([^']*\)'.*/\1/p" "$effective" | tail -1)
	effective_cap=$(sed -n "s/^export RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP='\([^']*\)'.*/\1/p" "$effective" | tail -1)
	current_target=$(sed -n "s/^export RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS='\([^']*\)'.*/\1/p" "$run_script" | tail -1)
	current_max=$(sed -n "s/^export RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS='\([^']*\)'.*/\1/p" "$run_script" | tail -1)
	current_cap=$(sed -n "s/^export RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP='\([^']*\)'.*/\1/p" "$run_script" | tail -1)
	[[ "$effective_target" =~ ^[0-9]+$ ]] || effective_target=0
	[[ "$effective_max" =~ ^[0-9]+$ ]] || effective_max=0
	[[ "$current_target" =~ ^[0-9]+$ ]] || current_target=0
	[[ "$current_max" =~ ^[0-9]+$ ]] || current_max=0
	if [ "$current_target" -gt "$effective_target" ] || [ "$current_max" -gt "$effective_max" ]; then
		emit_finding "$out" high "resource-autoscaler" "coverage-start-budget-increased-during-startup" \
			"root=$coverage_root age=${root_age}s source=$source effective=$effective_target/$effective_max current=$current_target/$current_max" \
			"hold upward budget changes until startup grace ends; downscaling may proceed, but mutable benchmark floors must not expand a newly launched root"
	fi
	if [ "$effective_cap" = 1 ] && [ "$current_cap" != 1 ]; then
		emit_finding "$out" high "resource-autoscaler" "coverage-start-deadline-cap-lost" \
			"root=$coverage_root age=${root_age}s source=$source effective_cap=$effective_cap current_cap=${current_cap:-missing}" \
			"preserve the recorded deadline cap throughout startup and reject any in-place budget rewrite that clears it"
	fi
}

latest_pr07c_classification() {
	recent_critical_run_dirs |
		while IFS= read -r run_dir; do
			find "$run_dir/continuations/pr07c-browser-env" -maxdepth 1 -type f -name 'classification.tsv' -size +0c -printf '%T@\t%p\n' 2>/dev/null
		done |
		sort -n |
		tail -1 |
		cut -f2-
}

pr07c_classification_value() {
	local classification=$1
	[ -n "$classification" ] && [ -s "$classification" ] || return 1
	awk -F '\t' 'NR > 1 && $1 == "pr07c-browser-env" { print $2; exit }' "$classification" 2>/dev/null
}

critical_script_has_pr07c_terminal_support() {
	local script=$1
	[ -s "$script" ] || return 1
	rg -q 'pr07c_readiness_resolved' "$script" || return 1
	rg -q 'pr07c-browser-env:repaired_ready' "$script" || return 1
	rg -q 'owner-matrix|pr07c-owner|HOLD-07C' "$script" || return 1
	rg -q 'direct_path=.*(pr07c-browser-env/classification[.]tsv|latest_continuation_classification pr07c-browser-env)' "$script" || return 1
}

critical_script_has_benchmark_refresh_support() {
	local script=$1
	[ -s "$script" ] || return 1
	rg -q 'launch_benchmark_feedback_refresh' "$script" || return 1
	rg -q 'latest_benchmark_refresh_command' "$script" || return 1
	rg -q 'rtc-benchmark-canary-feedback-refresh-' "$script" || return 1
}

critical_script_has_stable_runtime_support() {
	local script=$1
	[ -s "$script" ] || return 1
	rg -q 'RUNTIME_SCRIPT=' "$script" || return 1
	rg -q 'snapshot_executor_script' "$script" || return 1
	rg -q 'executor-runtime-' "$script" || return 1
	rg -q 'critical-path PR executor loop exiting rc=' "$script" || return 1
}

critical_script_has_repair_adoption_progress_support() {
	local script=$1
	[ -s "$script" ] || return 1
	rg -q 'done < <\(adopted_repair_branches\)' "$script" || return 1
	rg -q 'repair_branch_base_ref' "$script" || return 1
	rg -q 'stale-candidate-base' "$script" || return 1
	rg -q 'placeholder_entry=.*! -name .gitignore' "$script" || return 1
	rg -q 'rmdir "\$worktree/\$dependency_dir"' "$script" || return 1
	rg -q 'generated-harness-overlay-paths[.]txt' "$script" || return 1
	rg -q 'amend-without-generated-harness-overlay' "$script" || return 1
	rg -q 'Do not run unscoped `git status`' "$script" || return 1
}

critical_script_has_candidate_scoped_dedupe_support() {
	local script=$1
	[ -s "$script" ] || return 1
	grep -Fq 'candidate_key=${candidate_head:0:12}' "$script" || return 1
	grep -Fq 'benchmark-canary-exact-stack-$candidate_key-' "$script" || return 1
	grep -Fq 'benchmark-canary-product-failure-$candidate_key-' "$script" || return 1
	grep -Fq 'productive-exact-v3-$candidate_key-$blocker_id' "$script" || return 1
}

critical_script_sha() {
	local script=$1
	if [ -s "$script" ]; then
		sha256sum "$script" 2>/dev/null | awk '{ print $1 }'
	else
		printf 'missing'
	fi
}

sync_critical_executor_copies_if_safe() {
	local changed=0 deployed_changed=0 target tmp
	critical_script_has_pr07c_terminal_support "$CRITICAL_REPO_SCRIPT" || return 1
	critical_script_has_benchmark_refresh_support "$CRITICAL_REPO_SCRIPT" || return 1
	critical_script_has_stable_runtime_support "$CRITICAL_REPO_SCRIPT" || return 1
	critical_script_has_repair_adoption_progress_support "$CRITICAL_REPO_SCRIPT" || return 1
	critical_script_has_candidate_scoped_dedupe_support "$CRITICAL_REPO_SCRIPT" || return 1
	bash -n "$CRITICAL_REPO_SCRIPT" >/dev/null 2>&1 || return 1
	for target in "$CRITICAL_DEPLOYED_SCRIPT" "$CRITICAL_TMP_SCRIPT"; do
		if [ ! -s "$target" ] || ! cmp -s "$CRITICAL_REPO_SCRIPT" "$target"; then
			tmp=$(mktemp "$target.XXXXXX.tmp")
			cp "$CRITICAL_REPO_SCRIPT" "$tmp"
			chmod +x "$tmp"
			if ! bash -n "$tmp" >/dev/null 2>&1; then
				rm -f "$tmp"
				return 1
			fi
			mv -f "$tmp" "$target"
			changed=1
			if [ "$target" = "$CRITICAL_DEPLOYED_SCRIPT" ]; then
				deployed_changed=1
			fi
			log "synced critical executor copy target=$target from=$CRITICAL_REPO_SCRIPT"
		fi
	done
	if [ "$changed" = 1 ]; then
		if has_session rtc-critical-path-pr-executor-loop && [ "$deployed_changed" = 1 ]; then
			bash "$CRITICAL_DEPLOYED_SCRIPT" stop >> "$LOG" 2>&1 || true
			bash "$CRITICAL_DEPLOYED_SCRIPT" start >> "$LOG" 2>&1 || true
			log "restarted critical-path executor after deployed script-copy sync"
		elif ! has_session rtc-critical-path-pr-executor-loop; then
			bash "$CRITICAL_DEPLOYED_SCRIPT" start >> "$LOG" 2>&1 || true
			log "started critical-path executor after script-copy sync"
		fi
	fi
	return 0
}

check_critical_path_script_copies() {
	local out=$1 repo_sha deployed_sha tmp_sha missing_support=0
	repo_sha=$(critical_script_sha "$CRITICAL_REPO_SCRIPT")
	deployed_sha=$(critical_script_sha "$CRITICAL_DEPLOYED_SCRIPT")
	tmp_sha=$(critical_script_sha "$CRITICAL_TMP_SCRIPT")
	critical_script_has_pr07c_terminal_support "$CRITICAL_REPO_SCRIPT" || missing_support=1
	critical_script_has_pr07c_terminal_support "$CRITICAL_DEPLOYED_SCRIPT" || missing_support=1
	critical_script_has_pr07c_terminal_support "$CRITICAL_TMP_SCRIPT" || missing_support=1
	critical_script_has_benchmark_refresh_support "$CRITICAL_REPO_SCRIPT" || missing_support=1
	critical_script_has_benchmark_refresh_support "$CRITICAL_DEPLOYED_SCRIPT" || missing_support=1
	critical_script_has_benchmark_refresh_support "$CRITICAL_TMP_SCRIPT" || missing_support=1
	critical_script_has_stable_runtime_support "$CRITICAL_REPO_SCRIPT" || missing_support=1
	critical_script_has_stable_runtime_support "$CRITICAL_DEPLOYED_SCRIPT" || missing_support=1
	critical_script_has_stable_runtime_support "$CRITICAL_TMP_SCRIPT" || missing_support=1
	critical_script_has_repair_adoption_progress_support "$CRITICAL_REPO_SCRIPT" || missing_support=1
	critical_script_has_repair_adoption_progress_support "$CRITICAL_DEPLOYED_SCRIPT" || missing_support=1
	critical_script_has_repair_adoption_progress_support "$CRITICAL_TMP_SCRIPT" || missing_support=1
	critical_script_has_candidate_scoped_dedupe_support "$CRITICAL_REPO_SCRIPT" || missing_support=1
	critical_script_has_candidate_scoped_dedupe_support "$CRITICAL_DEPLOYED_SCRIPT" || missing_support=1
	critical_script_has_candidate_scoped_dedupe_support "$CRITICAL_TMP_SCRIPT" || missing_support=1
	if [ "$missing_support" = 1 ]; then
		emit_finding "$out" high "critical-path" "critical-executor-required-support-missing" \
			"repo=$CRITICAL_REPO_SCRIPT sha=$repo_sha deployed=$CRITICAL_DEPLOYED_SCRIPT sha=$deployed_sha tmp=$CRITICAL_TMP_SCRIPT sha=$tmp_sha" \
			"restore every required critical-path invariant, including terminal PR ownership, benchmark refresh delivery, candidate-scoped continuation dedupe, repair adoption, and generated-harness overlay stripping; synchronize all copies and restart rtc-critical-path-pr-executor-loop"
	fi
	if [ "$repo_sha" != "missing" ] && { [ "$repo_sha" != "$deployed_sha" ] || [ "$repo_sha" != "$tmp_sha" ]; }; then
		emit_finding "$out" high "critical-path" "critical-executor-script-copy-drift" \
			"repo=$CRITICAL_REPO_SCRIPT sha=$repo_sha deployed=$CRITICAL_DEPLOYED_SCRIPT sha=$deployed_sha tmp=$CRITICAL_TMP_SCRIPT sha=$tmp_sha" \
			"sync canonical repo, deployed, and /tmp restart critical-path executor scripts; restart the executor after sync"
	fi
}

check_critical_path_invariants() {
	local out=$1 status=$CRITICAL_BASE/current-critical-path-status.md log_file=$CRITICAL_BASE/logs/critical-path-pr-executor.log classification class class_mtime browser_queue browser_status launches_after_terminal terminal_ledger lock_holders
	check_status_freshness "$out" critical-path "$status" 900 rtc-critical-path-pr-executor-loop
	if ! has_session rtc-critical-path-pr-executor-loop; then
		lock_holders=$(fuser "$CRITICAL_BASE/critical-path-pr-executor.lock" 2>/dev/null | tr -s ' ' ' ' | sed 's/^ //; s/ $//' || true)
		if [ -n "$lock_holders" ]; then
			emit_finding "$out" high "critical-path" "critical-executor-lock-held-without-session" \
				"lock=$CRITICAL_BASE/critical-path-pr-executor.lock holders=$lock_holders status=$status" \
				"terminate stale critical-path controller descendants that inherited the singleton lock, patch any broad scan that kept the lock, and restart rtc-critical-path-pr-executor-loop"
		fi
	fi
	if log_matches_after_last_start "$log_file" 'critical-path PR executor loop started' 'reconcile failed|timed out|cannot stat .*[.]tmp|No such file or directory'; then
		emit_finding "$out" high "critical-path" "recent-reconcile-or-temp-error" "$log_file" "debug recent critical-path executor failure and patch the controller"
	fi
	if [ -s "$status" ] && rg -qi 'browser-env-preflight|preflight only; replay stays gated|runtime-readiness-blocked.*(success|resolved|completed progress|terminal-ledger)|resolved_by_active_artifact_runtime_readiness_not_product' "$status"; then
		emit_finding "$out" high "critical-path" "passive-pr07c-regression" "$status" "keep PR07C as repair lane and reject runtime-readiness-blocked as success"
	fi
	check_critical_path_script_copies "$out"
	classification=$(latest_pr07c_classification || true)
	if [ -n "$classification" ] && rg -qi 'resolved_by_active_artifact_runtime_readiness_not_product|runtime-readiness-blocked.*success' "$classification"; then
		emit_finding "$out" high "critical-path" "bad-pr07c-classification" "$classification" "reopen PR07C repair lane and invalidate passive classification"
	fi
	class=$(pr07c_classification_value "$classification" || true)
	if [ "$class" = "repaired_ready" ]; then
		class_mtime=$(stat -c %Y "$classification" 2>/dev/null || printf 0)
		browser_queue=$(awk -F '\t' '$2 == "pr07c-browser-env" || $1 == "job-pr07c-browser-env" { print; found = 1 } END { exit found ? 0 : 1 }' "$CRITICAL_BASE/queue.tsv" 2>/dev/null || true)
		browser_status=$(awk -F '\t' '$1 == "pr07c-browser-env" && $4 !~ /^(terminal|resolved)$/ { print; found = 1 } END { exit found ? 0 : 1 }' "$CRITICAL_BASE/blockers.tsv" 2>/dev/null || true)
		launches_after_terminal=$(awk -F '\t' -v cutoff="$class_mtime" '$1 > cutoff && ($4 ~ /pr07c-browser-env/ || $3 ~ /pr07c-browser-env/) { print; found = 1 } END { exit found ? 0 : 1 }' "$CRITICAL_BASE/logs/launches.tsv" 2>/dev/null || true)
		terminal_ledger=$(awk -F '\t' '$1 == "pr07c-browser-env" && $2 == "repaired_ready" { print; found = 1 } END { exit found ? 0 : 1 }' "$CRITICAL_BASE/terminal-ledger.tsv" 2>/dev/null || true)
		if [ -n "$browser_queue" ] || [ -n "$browser_status" ] || [ -n "$launches_after_terminal" ] || [ -z "$terminal_ledger" ]; then
			emit_finding "$out" high "critical-path" "terminal-pr07c-readiness-not-honored" \
				"classification=$classification queue=${browser_queue:-none} blockers=${browser_status:-none} launches_after_terminal=${launches_after_terminal:-none} terminal_ledger=${terminal_ledger:-missing}" \
				"make repaired_ready terminal for pr07c-browser-env in repo/deployed/tmp executor copies, reconcile once, and verify only pr07c-owner-matrix remains queued"
		fi
	fi
}

check_repair_publication_progress() {
	local out=$1 candidate_head now source_branch source_commit destination base_ref _files _insertions _deletions _validation _reason
	local commit_time age destination_ref published
	[ -s "$PR_PROGRESS_PUSH_MANIFEST" ] || return 0
	candidate_head=$(git -C "$CANDIDATE_REPO" rev-parse --verify --quiet "$CANDIDATE_BRANCH^{commit}" 2>/dev/null || true)
	[ -n "$candidate_head" ] || return 0
	now=$(date -u +%s)
	while IFS=$'\t' read -r source_branch source_commit destination base_ref _files _insertions _deletions _validation _reason <&3; do
		[ "$source_branch" != source_branch ] || continue
		[ "$destination" = "$CANDIDATE_BRANCH" ] || continue
		git -C "$CANDIDATE_REPO" cat-file -e "$source_commit^{commit}" 2>/dev/null || continue
		if git -C "$CANDIDATE_REPO" merge-base --is-ancestor "$source_commit" "$candidate_head" 2>/dev/null; then
			continue
		fi
		git -C "$CANDIDATE_REPO" merge-base --is-ancestor "$candidate_head" "$source_commit" 2>/dev/null || continue
		commit_time=$(git -C "$CANDIDATE_REPO" show -s --format=%ct "$source_commit" 2>/dev/null || printf 0)
		age=$(( now - commit_time ))
		[ "$age" -ge "$REPAIR_PUBLICATION_GRACE_SECONDS" ] || continue
		destination_ref="refs/heads/$destination"
		published=$(awk -F '\t' -v destination="$destination_ref" -v commit="$source_commit" '
			$4 == destination && $5 == commit && $9 ~ /^(pushed|already_present|exact-local-confirmed)$/ {
				print $9
				exit
			}
		' "$LOCAL_PUBLISH_LEDGER" 2>/dev/null || true)
		if [ -n "$published" ]; then
			emit_finding "$out" high "publication" "release-candidate-publish-not-synced" \
				"source=$source_branch commit=$source_commit destination=$destination_ref ledger=$published candidate=$candidate_head age=${age}s" \
				"fast-forward the JS2 candidate ref to the locally published commit so the guard starts same-head validation"
		else
			emit_finding "$out" high "publication" "validated-repair-awaiting-local-publication" \
				"source=$source_branch commit=$source_commit destination=$destination_ref candidate=$candidate_head age=${age}s manifest=$PR_PROGRESS_PUSH_MANIFEST" \
				"run the local PR branch publisher from the local machine and write its publish ledger back to JS2"
		fi
		return 0
	done 3< "$PR_PROGRESS_PUSH_MANIFEST"
}

check_local_publisher_health() {
	local out=$1 updated_at state _manifest_sha _manifest_rows rc_rows rc_manifest_head remote_rc_head js2_rc_head _ledger_rows detail
	local updated_epoch now age
	if [ ! -s "$LOCAL_PUBLISH_STATUS" ]; then
		emit_finding "$out" high "publication" "local-publisher-heartbeat-missing" \
			"status=$LOCAL_PUBLISH_STATUS" \
			"start the durable local publisher on the operator machine and require it to upload a heartbeat after every manifest cycle"
		return 0
	fi
	IFS=$'\t' read -r updated_at state _manifest_sha _manifest_rows rc_rows rc_manifest_head remote_rc_head js2_rc_head _ledger_rows detail < <(sed -n '2p' "$LOCAL_PUBLISH_STATUS")
	updated_epoch=$(date -u -d "$updated_at" +%s 2>/dev/null || printf 0)
	now=$(date -u +%s)
	age=$(( now - updated_epoch ))
	if [ "$updated_epoch" -le 0 ] || [ "$age" -gt "$LOCAL_PUBLISH_STATUS_MAX_AGE_SECONDS" ]; then
		emit_finding "$out" high "publication" "local-publisher-heartbeat-stale" \
			"status=$LOCAL_PUBLISH_STATUS updated_at=${updated_at:-missing} age=${age}s max=${LOCAL_PUBLISH_STATUS_MAX_AGE_SECONDS}s" \
			"restart the local publisher and inspect its log; a live validated RC manifest must not wait silently for an operator-side process"
		return 0
	fi
	if [ "$state" != healthy ]; then
		emit_finding "$out" high "publication" "local-publisher-cycle-failed" \
			"status=$LOCAL_PUBLISH_STATUS state=${state:-missing} detail=${detail:-missing}" \
			"repair the local publisher cycle before allowing another repair-adoption handoff"
		return 0
	fi
	if [ "${rc_rows:-0}" -gt 0 ] && [ -n "$rc_manifest_head" ] &&
		{ [ "$remote_rc_head" != "$rc_manifest_head" ] || [ "$js2_rc_head" != "$rc_manifest_head" ]; }; then
		emit_finding "$out" high "publication" "local-publisher-rc-row-unacknowledged" \
			"status=$LOCAL_PUBLISH_STATUS manifest_head=$rc_manifest_head remote_head=${remote_rc_head:-missing} js2_head=${js2_rc_head:-missing}" \
			"consume the validated RC row with a fast-forward push and synchronize the exact JS2 candidate ref before starting sibling repair work"
	fi
}

validated_adoption_patch_equivalent() {
	local source_commit=$1 candidate_head=$2 merge_base cherry
	merge_base=$(git -C "$CANDIDATE_REPO" merge-base "$source_commit" "$candidate_head" 2>/dev/null || true)
	[ -n "$merge_base" ] || return 1
	[ "$(git -C "$CANDIDATE_REPO" rev-list --count --merges "$merge_base..$source_commit" 2>/dev/null || printf 1)" = 0 ] || return 1
	cherry=$(git -C "$CANDIDATE_REPO" cherry "$candidate_head" "$source_commit" 2>/dev/null || true)
	[ -n "$cherry" ] || return 1
	! printf '%s\n' "$cherry" | grep -q '^+ '
}

validated_adoption_disposition_satisfied() {
	local source_commit=$1 candidate_head=$2 disposition replacement_commit
	[ -s "$VALIDATED_ADOPTION_DISPOSITIONS" ] || return 1
	while IFS=$'\t' read -r disposition replacement_commit; do
		case "$disposition" in
		patch-equivalent|semantically-superseded) ;;
		*) continue ;;
		esac
		[[ "$replacement_commit" =~ ^[0-9a-f]{40}$ ]] || continue
		git -C "$CANDIDATE_REPO" merge-base --is-ancestor "$replacement_commit" "$candidate_head" 2>/dev/null && return 0
	done < <(
		awk -F '\t' -v source="$source_commit" '
			NR > 1 && $2 == source { print $3 "\t" $4 }
		' "$VALIDATED_ADOPTION_DISPOSITIONS" 2>/dev/null
	)
	return 1
}

check_validated_adoption_delivery_invariants() {
	local out=$1 manifest_dir classification manifest source_branch source_commit destination base_ref
	local candidate_head manifest_epoch now age pr_row detail
	local dropped_count=0 sibling_count=0 dropped='' siblings=''
	declare -A seen_commits=()
	[ -s "$CRITICAL_BASE/logs/launches.tsv" ] || return 0
	candidate_head=$(git -C "$CANDIDATE_REPO" rev-parse --verify --quiet "$CANDIDATE_BRANCH^{commit}" 2>/dev/null || true)
	[ -n "$candidate_head" ] || return 0
	now=$(date -u +%s)
	while IFS=$'\t' read -r manifest_epoch source_branch source_commit destination base_ref manifest; do
		[ -z "${seen_commits[$source_commit]:-}" ] || continue
		seen_commits[$source_commit]=1
		git -C "$CANDIDATE_REPO" cat-file -e "$source_commit^{commit}" 2>/dev/null || continue
		git -C "$CANDIDATE_REPO" merge-base --is-ancestor "$source_commit" "$candidate_head" 2>/dev/null && continue
		validated_adoption_patch_equivalent "$source_commit" "$candidate_head" && continue
		validated_adoption_disposition_satisfied "$source_commit" "$candidate_head" && continue
		age=$(( now - manifest_epoch ))
		[ "$age" -ge "$REPAIR_PUBLICATION_GRACE_SECONDS" ] || continue
		if git -C "$CANDIDATE_REPO" merge-base --is-ancestor "$candidate_head" "$source_commit" 2>/dev/null; then
			pr_row=$(awk -F '\t' -v source="$source_branch" -v commit="$source_commit" -v dest="$CANDIDATE_BRANCH" '
				NR > 1 && $1 == source && $2 == commit && ($3 == dest || $3 == "refs/heads/" dest) { print; exit }
			' "$PR_PROGRESS_PUSH_MANIFEST" 2>/dev/null || true)
			[ -n "$pr_row" ] && continue
			dropped_count=$(( dropped_count + 1 ))
			if [ "$dropped_count" -le 8 ]; then
				detail="${source_branch}@${source_commit:0:12}:$manifest"
				dropped="${dropped}${dropped:+,}${detail}"
			fi
		else
			sibling_count=$(( sibling_count + 1 ))
			if [ "$sibling_count" -le 8 ]; then
				detail="${source_branch}@${source_commit:0:12}:$manifest"
				siblings="${siblings}${siblings:+,}${detail}"
			fi
		fi
	done < <(
		tail -n 2000 "$CRITICAL_BASE/logs/launches.tsv" 2>/dev/null |
			awk -F '\t' '$2 == "continuation" && $5 ~ /\/continuations\/benchmark-canary-repair-branch-adoption$/ { print $5 }' |
			sort -u |
			while IFS= read -r manifest_dir; do
				classification=$manifest_dir/classification.tsv
				manifest=$manifest_dir/push-manifest.tsv
				[ -s "$classification" ] && [ -s "$manifest" ] || continue
				awk -F '\t' 'NR > 1 && $1 == "benchmark-canary-repair-branch-adoption" && $2 == "repair_branch_adopted" { found = 1 } END { exit found ? 0 : 1 }' "$classification" 2>/dev/null || continue
				awk -F '\t' -v path="$manifest" -v mtime="$(stat -c %Y "$manifest" 2>/dev/null || printf 0)" -v dest="$CANDIDATE_BRANCH" '
					NR > 1 && ($3 == dest || $3 == "refs/heads/" dest) && $2 ~ /^[0-9a-f]{40}$/ {
						print mtime "\t" $1 "\t" $2 "\t" $3 "\t" $4 "\t" path
					}
				' "$manifest" 2>/dev/null
			done |
			sort -t $'\t' -k1,1nr
	)
	if [ "$dropped_count" -gt 0 ]; then
		emit_finding "$out" high "publication" "validated-repair-destination-dropped" \
			"candidate=$candidate_head unresolved_count=$dropped_count repairs=$dropped pr_manifest=$PR_PROGRESS_PUSH_MANIFEST" \
			"preserve every explicit release-candidate destination from validated adoption manifests; compute the full range from the current candidate and fail closed if normalization drops any pending descendant"
	fi
	if [ "$sibling_count" -gt 0 ]; then
		emit_finding "$out" high "publication" "validated-repair-bypassed-by-sibling-candidate" \
			"candidate=$candidate_head unresolved_count=$sibling_count repairs=$siblings dispositions=$VALIDATED_ADOPTION_DISPOSITIONS" \
			"create one aggregate descendant containing every unresolved validated repair and the current candidate, validate that exact head, record semantic supersessions durably, and serialize future repair writers behind adoption receipts"
	fi
}

check_repair_branch_harness_contamination() {
	local out=$1 adoptions=$CRITICAL_BASE/current-repair-branch-adoptions.tsv row
	local _generated lane branch _adopted source_repo source_head _central state _next _classification _report
	local candidate_head issues rel lines
	[ -s "$adoptions" ] || return 0
	row=$(awk -F '\t' 'NR > 1 { row = $0 } END { print row }' "$adoptions" 2>/dev/null || true)
	[ -n "$row" ] || return 0
	IFS=$'\t' read -r _generated lane branch _adopted source_repo source_head _central state _next _classification _report <<< "$row"
	[ -n "$branch" ] && [ -n "$source_repo" ] && [ -n "$source_head" ] || return 0
	git -C "$source_repo" cat-file -e "$source_head^{commit}" 2>/dev/null || return 0
	candidate_head=$(git -C "$CANDIDATE_REPO" rev-parse --verify --quiet "$CANDIDATE_BRANCH^{commit}" 2>/dev/null || true)
	[ -n "$candidate_head" ] || return 0
	issues=''
	for rel in \
		test/e2e/specs/editor/collaboration/collaboration-fuzz.spec.ts \
		test/e2e/specs/editor/collaboration/collaboration-human-smoke.spec.ts \
		test/e2e/specs/editor/collaboration/collaboration-rtc-reference.spec.ts
	do
		git -C "$source_repo" cat-file -e "$candidate_head:$rel" 2>/dev/null && continue
		git -C "$source_repo" cat-file -e "$source_head:$rel" 2>/dev/null || continue
		lines=$(git -C "$source_repo" show "$source_head:$rel" 2>/dev/null | wc -l | tr -d ' ')
		issues="${issues}${issues:+,}$rel:added_lines=${lines:-unknown}"
	done
	[ -n "$issues" ] || return 0
	emit_finding "$out" high "critical-path" "repair-branch-generated-harness-contamination" \
		"lane=$lane branch=$branch head=$source_head state=$state candidate=$candidate_head overlays=$issues" \
		"create a clean product-only branch from the current candidate, copy only the intended product and focused product-test delta, validate it, and keep generated fuzz harness overlays out of the publication manifest"
}

benchmark_exact_green_replacement_adopted() {
	local candidate_head receipt classification exact_status replacement_head manifest_dir
	candidate_head=$(git -C "$CANDIDATE_REPO" rev-parse --verify --quiet "$CANDIDATE_BRANCH^{commit}" 2>/dev/null || true)
	[ -n "$candidate_head" ] || return 1
	# A fresh in-progress continuation must not hide an older complete replacement
	# matrix. Search only the bounded launch ledger and consume exact artifact paths.
	receipt=$(
		tail -n 2000 "$CRITICAL_BASE/logs/launches.tsv" 2>/dev/null |
			awk -F '\t' '$2 == "continuation" && $5 ~ /\/continuations\/benchmark-canary-fuzzer-gap$/ { print $1 "\t" $5 }' |
			sort -t $'\t' -k1,1nr |
			while IFS=$'\t' read -r _epoch manifest_dir; do
				classification=$manifest_dir/classification.tsv
				[ -s "$classification" ] || continue
				exact_status=$(awk -F '\t' 'NR > 1 && $2 == "exact_stack_green" { print $5; exit }' "$classification" 2>/dev/null || true)
				[ -s "$exact_status" ] || continue
				replacement_head=$(awk -F '\t' '
					NR == 1 { next }
					$4 !~ /^(downscoped_replacement_green|passed|green)$/ { bad = 1 }
					$3 ~ /^[0-9a-f]{40}$/ {
						if (head != "" && head != $3) bad = 1
						head = $3
						rows++
					}
					END {
						if (rows > 0 && !bad) print head
						exit (rows > 0 && !bad) ? 0 : 1
					}
				' "$exact_status" 2>/dev/null || true)
				[ -n "$replacement_head" ] || continue
				if git -C "$CANDIDATE_REPO" merge-base --is-ancestor "$replacement_head" "$candidate_head" 2>/dev/null; then
					printf '%s\t%s\n' "$replacement_head" "$exact_status"
					break
				fi
			done
	)
	[ -n "$receipt" ]
}

check_benchmark_canary_promotion_invariants() {
	local out=$1 active classification status_line queue_line exact_green_line coverage_root coverage_status coverage_root_age unscheduled_groups paused_groups
	benchmark_promotion_blocked || return 0
	# current-feedback.tsv is historical maintainer input. A complete replacement
	# matrix on an ancestor of the live candidate is a durable downscope receipt,
	# so it must not relaunch the old exact-stack repair forever.
	benchmark_exact_green_replacement_adopted && return 0
	status_line=$(awk -F '\t' '$1 == "benchmark-canary-fuzzer-gap" { print; found = 1 } END { exit found ? 0 : 1 }' "$CRITICAL_BASE/blockers.tsv" 2>/dev/null || true)
	queue_line=$(awk -F '\t' '$1 == "job-benchmark-canary-fuzzer-gap" { print; found = 1 } END { exit found ? 0 : 1 }' "$CRITICAL_BASE/queue.tsv" 2>/dev/null || true)
	active=$(benchmark_exact_stack_repair_active || true)
	if [ -z "$active" ] && awk -F '\t' '
		NR == 1 {
			for (i = 1; i <= NF; i++) column[tolower($i)] = i
			next
		}
		$1 == "benchmark-canary-fuzzer-gap" &&
			tolower($(column["state"])) == "active" &&
			$(column["active_session"]) == "coverage-controller" { found = 1 }
		END { exit found ? 0 : 1 }
	' "$CRITICAL_BASE/blockers.tsv" 2>/dev/null; then
		active=coverage-controller
	fi
	if [ -z "$active" ]; then
		emit_finding "$out" high "benchmark-canary" "exact-stack-promotion-blocked-no-active-repair" \
			"$BENCHMARK_FEEDBACK_BASE/current-feedback.tsv" \
			"launch or repair benchmark-canary-fuzzer-gap as exact-stack promotion repair; coverage_present is not sufficient while current-feedback.tsv has promotion_blocked rows"
	fi
	classification=$(latest_benchmark_classification || true)
	if benchmark_classification_only_coverage_repaired "$classification"; then
		emit_finding "$out" high "benchmark-canary" "coverage-repaired-without-exact-stack-green" \
			"$classification with active_feedback=$BENCHMARK_FEEDBACK_BASE/current-feedback.tsv" \
			"change the controller state machine so coverage_repaired cannot close benchmark-canary promotion blockers; require exact-stack-status.tsv and exact_stack_green or a fix branch"
	fi
	if printf '%s\n%s\n' "$status_line" "$queue_line" | rg -q 'coverage-gap-repair|coverage-promotion'; then
		emit_finding "$out" high "benchmark-canary" "promotion-blocker-modeled-as-coverage-only" \
			"blocker=${status_line:-missing} queue=${queue_line:-missing}" \
			"model promotion_blocked feedback as exact-stack-promotion/exact-stack-repair and prioritize it ahead of reducer work"
	fi
	exact_green_line=
	if [ -n "$classification" ] && [ -s "$classification" ]; then
		exact_green_line=$(awk -F '\t' 'NR > 1 && $2 == "exact_stack_green" { print; found = 1 } END { exit found ? 0 : 1 }' "$classification" 2>/dev/null || true)
	fi
	if [ -n "$exact_green_line" ] && benchmark_promotion_blocked && [ "$active" != coverage-controller ]; then
		emit_finding "$out" high "benchmark-canary" "exact-green-contradicts-current-feedback" \
			"classification=$classification green=$exact_green_line feedback=$BENCHMARK_FEEDBACK_BASE/current-feedback.tsv" \
			"refresh current-feedback.tsv from exact-stack rerun or reject stale exact_stack_green classification"
	fi
	coverage_root=$(sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)
	coverage_status=${coverage_root:+$coverage_root/benchmark-canary-coverage-status.tsv}
	coverage_root_age=$(file_age_seconds "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || printf 0)
	unscheduled_groups=
	if [ -n "$coverage_status" ] && [ -s "$coverage_status" ] &&
		[ "$coverage_root_age" -ge "$PROMOTION_SCHEDULING_START_GRACE_SECONDS" ]; then
		unscheduled_groups=$(awk -F '\t' '
			NR == 1 {
				for (i = 1; i <= NF; i++) {
					name = tolower($i)
					gsub(/\r$/, "", name)
					column[name] = i
				}
				next
			}
			function value(name) {
				return (name in column) ? tolower($(column[name])) : ""
			}
				value("promotion_blocked") == "yes" &&
					value("current_run_green") != "yes" &&
					value("explicit_downscope") != "yes" &&
					value("retained_product_evidence") != "yes" &&
					value("scheduled") != "yes" {
				print $(column["group"])
			}
		' "$coverage_status" | paste -sd, -)
	fi
	if [ -n "$unscheduled_groups" ]; then
		emit_finding "$out" high "benchmark-canary" "promotion-blocker-not-scheduled" \
			"status=$coverage_status groups=$unscheduled_groups" \
			"make current-root open promotion status override deferred closure history and publish protected benchmark groups ahead of generic coverage-gap backfill at the final producer cap"
	fi
	paused_groups=
	if [ -n "$coverage_status" ] && [ -s "$coverage_status" ] &&
		[ "$coverage_root_age" -ge "$PROMOTION_SCHEDULING_START_GRACE_SECONDS" ]; then
		paused_groups=$(awk -F '\t' '
			NR == 1 {
				for (i = 1; i <= NF; i++) {
					name = tolower($i)
					gsub(/\r$/, "", name)
					column[name] = i
				}
				next
			}
			function value(name) {
				return (name in column) ? tolower($(column[name])) : ""
			}
				value("promotion_blocked") == "yes" &&
					value("current_run_green") != "yes" &&
					value("explicit_downscope") != "yes" &&
					value("retained_product_evidence") != "yes" &&
					value("scheduled") == "yes" &&
				value("active") != "yes" &&
				value("supervisor_status") ~ /^(paused-startup-stall|paused-infra-startup|paused-product-failure)$/ {
				print $(column["group"])
			}
		' "$coverage_status" | paste -sd, -)
	fi
	if [ -n "$paused_groups" ]; then
		emit_finding "$out" high "benchmark-canary" "promotion-blocker-scheduled-but-paused" \
			"status=$coverage_status groups=$paused_groups" \
			"keep open promotion groups ahead of generic backfill and bypass no-product startup-stall seed-drain cooldown so scheduled rows execute the next seed instead of holding for hours"
	fi
}

check_loop_statuses() {
	local out=$1 coverage_root
	check_status_freshness "$out" finalization "$FINALIZATION_BASE/current-finalization-status.md" 1800 rtc-pr-finalization-loop
	check_status_freshness "$out" deferred-work "$DEFERRED_BASE/current-deferred-status.md" 1800 rtc-deferred-work-promotion-loop
	check_status_freshness "$out" pr-progress "$PR_PROGRESS_BASE/current-pr-progress-controller-status.md" 900 rtc-pr-progress-controller-loop
	check_status_freshness "$out" productive-analysis "$PRODUCTIVE_ANALYSIS_BASE/current-status.md" 1800 rtc-productive-analysis-loop
	check_productive_analysis_health "$out"
	check_status_freshness "$out" resource-autoscaler "$RESOURCE_BASE/resource-autoscaler-status.md" 600 rtc-resource-autoscaler
	check_browser_pool_supervisor_freshness "$out" strict-expansion 900
	check_browser_pool_supervisor_freshness "$out" focused-shards 900
	check_browser_pool_supervisor_freshness "$out" gap-booster 900
	if [ -s "$COVERAGE_BASE/current-output-dir.txt" ]; then
		coverage_root=$(sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt")
		if [ -n "$coverage_root" ]; then
			check_status_freshness "$out" coverage-guided "$coverage_root/novelty-status.md" 900 rtc-coverage-guided-novelty
		fi
	fi
}

check_coverage_supervisor_root_agreement() {
	local out=$1 coverage_root=$2 status status_output age state_output state_session scoped_session suffix
	[ -n "$coverage_root" ] && [ -d "$coverage_root" ] || return 0
	coverage_start_in_progress && return 0
	age=$(file_age_seconds "$COVERAGE_BASE/current-output-dir.txt" || printf 999999)
	if [ "$age" -lt 420 ]; then
		return 0
	fi
	status="$coverage_root/novelty-status.md"
	if [ -s "$status" ]; then
		status_output=$(sed -n 's/^Output dir: //p' "$status" | head -1)
		if [ -n "$status_output" ] && [ "$status_output" != "$coverage_root" ]; then
			emit_finding "$out" high "coverage-guided" "novelty-status-output-mismatch" "$status output=$status_output current=$coverage_root" "restart coverage-guided with one current output root and reject stale status"
		fi
	fi
	if [ ! -s "$coverage_root/supervisor-state.json" ]; then
		emit_finding "$out" high "coverage-guided" "missing-supervisor-state" "$coverage_root/supervisor-state.json" "ensure the coverage supervisor writes current-root state before treating the run as healthy"
		return 0
	fi
	state_output=$(
		node -e "const fs = require('fs'); try { const state = JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); if (typeof state.outputDir === 'string') process.stdout.write(state.outputDir); } catch {}" \
			"$coverage_root/supervisor-state.json"
	)
	if [ "$state_output" != "$coverage_root" ]; then
		emit_finding "$out" high "coverage-guided" "supervisor-output-mismatch" "$coverage_root/supervisor-state.json output=${state_output:-missing} current=$coverage_root" "restart or rebind the coverage supervisor; do not treat stale supervisor state as current"
	fi
	state_session=$(
		node -e "const fs = require('fs'); try { const state = JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); if (typeof state.supervisorSession === 'string') process.stdout.write(state.supervisorSession); } catch {}" \
			"$coverage_root/novelty-state.json" 2>/dev/null || true
	)
	suffix=$(basename "$coverage_root" | sed -E 's/[^A-Za-z0-9_.-]+/-/g; s/^-+//; s/-+$//')
	scoped_session="rtc-coverage-guided-supervisor-$suffix"
	if [ -n "$state_session" ]; then
		if ! has_session "$state_session"; then
			if ! coverage_supervisor_session_live_after_grace "$coverage_root"; then
				emit_finding "$out" high "coverage-guided" "supervisor-session-missing" "$coverage_root/novelty-state.json session=$state_session" "restart or rebind the coverage supervisor session recorded for the current root"
			fi
		fi
	elif ! has_session rtc-coverage-guided-supervisor && ! has_session "$scoped_session"; then
		if ! coverage_supervisor_session_live_after_grace "$coverage_root"; then
			emit_finding "$out" high "coverage-guided" "supervisor-session-missing" "$coverage_root expected=rtc-coverage-guided-supervisor or $scoped_session" "restart the coverage supervisor for the current root"
		fi
	fi
}

coverage_start_in_progress() {
	local lock=$COVERAGE_BASE/start-v2.lock fd
	exec {fd}>"$lock"
	if flock -n "$fd"; then
		flock -u "$fd" || true
		exec {fd}>&-
		return 1
	fi
	exec {fd}>&-
	return 0
}

check_promotion_preflight_relaunch_loops() {
	local out=$1 coverage_root=$2 state_path status_path loops
	state_path=$coverage_root/supervisor-state.json
	status_path=$coverage_root/benchmark-canary-coverage-status.tsv
	[ -s "$state_path" ] && [ -s "$status_path" ] || return 0
	loops=$(node - "$state_path" "$status_path" <<'NODE'
const fs = require( 'fs' );
const state = JSON.parse( fs.readFileSync( process.argv[ 2 ], 'utf8' ) );
const lines = fs
	.readFileSync( process.argv[ 3 ], 'utf8' )
	.trim()
	.split( /\r?\n/ );
const header = ( lines.shift() ?? '' ).split( '\t' );
const index = new Map( header.map( ( name, i ) => [ name, i ] ) );
const openGroups = new Set(
	lines
		.map( ( line ) => line.split( '\t' ) )
		.filter(
			( row ) =>
				row[ index.get( 'promotion_blocked' ) ] === 'yes' &&
				row[ index.get( 'current_run_green' ) ] !== 'yes' &&
				row[ index.get( 'explicit_downscope' ) ] !== 'yes'
		)
		.map( ( row ) => row[ index.get( 'group' ) ] )
);
	for ( const group of state.groups ?? [] ) {
		if (
			! openGroups.has( group.name ) ||
			group.status === 'paused-product-failure' ||
			Boolean( group.productFailureAt ) ||
			! /startup preflight failed/i.test( group.lastReason ?? '' )
	) {
		continue;
	}
	const launches = ( group.launches ?? [] ).slice( -4 );
	const seeds = launches.map( ( launch ) => launch.startSeed );
	if (
		seeds.length >= 3 &&
		seeds.every(
			( seed ) => Number.isFinite( Number( seed ) ) && seed === seeds[ 0 ]
		)
	) {
		process.stdout.write(
			`${ group.name }:seed=${ seeds[ 0 ] }:launches=${ seeds.length }\n`
		);
	}
}
NODE
)
	if [ -n "$loops" ]; then
		emit_finding "$out" high "coverage-guided" "promotion-human-smoke-same-seed-relaunch" \
			"root=$coverage_root loops=$(printf '%s' "$loops" | paste -sd, -)" \
			"classify executed human product-smoke editor/runtime failures as behavioral product evidence, quarantine the run, and preserve the product stop reason instead of writing kind=infra and relaunching the same seed"
	fi
}

check_human_smoke_network_stability() {
	local out=$1 coverage_root=$2 state_path issues network_issues misclassified_issues source_issues=''
	state_path=$coverage_root/supervisor-state.json
	[ -s "$state_path" ] || return 0
	for source_file in \
		"$COVERAGE_BASE/candidate-source/bin/rtc-browser-fuzz-runner.mjs" \
		"$COVERAGE_BASE/candidate-source/bin/rtc-browser-fuzz-supervisor.mjs"
	do
		if [ ! -s "$source_file" ] || ! grep -Fq 'RTC_FUZZ_NETWORK_TOPOLOGY_LOCK_FILE' "$source_file"; then
			source_issues="${source_issues}${source_issues:+,}${source_file}:missing-network-lock"
		fi
	done
	if [ -n "$source_issues" ]; then
		emit_finding "$out" high "coverage-guided" "human-smoke-network-lock-missing" \
			"root=$coverage_root files=$source_issues" \
			"freeze the shared flock-based network-topology lock into both the runner and supervisor so Docker network creation cannot interrupt a human product-smoke browser reload"
	fi

	issues=$(node - "$state_path" <<'NODE'
const fs = require( 'fs' );
const path = require( 'path' );
const state = JSON.parse( fs.readFileSync( process.argv[ 2 ], 'utf8' ) );
const runDirs = new Set();
for ( const group of state.groups ?? [] ) {
	for ( const runDir of [
		group.currentRunDir,
		...( group.activeRunDirs ?? [] ),
		...( group.productFailureRunDirs ?? [] ),
	] ) {
		if ( typeof runDir === 'string' && runDir ) {
			runDirs.add( runDir );
		}
	}
}
for ( const runDir of runDirs ) {
	let laneNames = [];
	try {
		laneNames = fs
			.readdirSync( runDir, { withFileTypes: true } )
			.filter( ( entry ) => entry.isDirectory() && /^lane-\d+$/.test( entry.name ) )
			.map( ( entry ) => entry.name );
	} catch {
		continue;
	}
	for ( const laneName of laneNames ) {
		const summaryPath = path.join( runDir, laneName, 'summary.ndjson' );
		let records = [];
		try {
			records = fs
				.readFileSync( summaryPath, 'utf8' )
				.trim()
				.split( /\r?\n/ )
				.filter( Boolean )
				.slice( -20 )
				.map( ( line ) => JSON.parse( line ) );
		} catch {
			continue;
		}
		for ( const record of records ) {
			if ( typeof record.logPath !== 'string' ) {
				continue;
			}
			let log = '';
			try {
				log = fs.readFileSync( record.logPath, 'utf8' );
			} catch {}
			if (
				record.preflightKind !== 'human-product-smoke' ||
				record.localClassification !== 'product-or-test' ||
				! /ERR_NETWORK_CHANGED/i.test( log )
			) {
				if (
					record.kind === 'infra' &&
					/(?:^|-)preflight$/.test( String( record.stage ?? '' ) ) &&
					/Unexpected browser runtime errors|Permission denied, unregistering room|\b[1-9][0-9]* failed\b/i.test( log ) &&
					! /ERR_NETWORK_CHANGED|ECONNREFUSED|browser has been closed|Target page, context or browser has been closed/i.test( log )
				) {
					process.stdout.write(
						`false-infra\t${ path.basename( runDir ) }/${ laneName }:${ record.logPath }\n`
					);
				}
				continue;
			}
			process.stdout.write(
				`network\t${ path.basename( runDir ) }/${ laneName }:${ record.logPath }\n`
			);
		}
	}
}
NODE
)
	network_issues=$(printf '%s\n' "$issues" | awk -F '\t' '$1 == "network" { print $2 }' | paste -sd, -)
	misclassified_issues=$(printf '%s\n' "$issues" | awk -F '\t' '$1 == "false-infra" { print $2 }' | paste -sd, -)
	if [ -n "$network_issues" ]; then
		emit_finding "$out" high "coverage-guided" "network-churn-misclassified-product" \
			"root=$coverage_root records=$network_issues" \
			"classify human-smoke failures from the full command output, treat ERR_NETWORK_CHANGED as environment evidence, and serialize smoke execution against wp-env and Docker topology mutations"
	fi
	if [ -n "$misclassified_issues" ]; then
		emit_finding "$out" high "coverage-guided" "human-smoke-product-misclassified-infra" \
			"root=$coverage_root records=$misclassified_issues" \
			"tighten full-output failure classification so command-line tokens such as --config playwright.config.ts cannot demote a completed Playwright assertion or RTC permission failure to infrastructure; rerun the human smoke and preserve product quarantine"
	fi
}

check_product_failure_analysis_ownership() {
	local out=$1 coverage_root=$2 state_path issues
	state_path=$coverage_root/supervisor-state.json
	[ -s "$state_path" ] || return 0
	issues=$(node - "$state_path" <<'NODE'
const fs = require( 'fs' );
const path = require( 'path' );
const state = JSON.parse( fs.readFileSync( process.argv[ 2 ], 'utf8' ) );
for ( const group of state.groups ?? [] ) {
	const productFailureRecords = Number( group.productFailureRecords ?? 0 );
	if (
		! group.productFailureAt &&
		( ! Number.isFinite( productFailureRecords ) ||
			productFailureRecords <= 0 )
	) {
		continue;
	}
	for ( const runDir of group.productFailureRunDirs ?? [] ) {
		for ( const tier of [ 'analysis-tier', 'deep-analysis-tier' ] ) {
			const tierStatePath = path.join(
				runDir,
				'.triage-watcher',
				tier,
				'state.json'
			);
			let tierState;
			try {
				tierState = JSON.parse( fs.readFileSync( tierStatePath, 'utf8' ) );
			} catch {
				continue;
			}
			const staleJobs = Object.values( tierState.jobs ?? {} )
				.filter( ( job ) => job?.status === 'stale-source' )
				.map( ( job ) => job.hash )
				.filter( Boolean );
			if ( staleJobs.length > 0 ) {
				process.stdout.write(
					`${ group.name }:${ path.basename( runDir ) }:${ tier }:${ staleJobs.join( ',' ) }\n`
				);
			}
		}
	}
}
NODE
)
	if [ -n "$issues" ]; then
		emit_finding "$out" high "analysis-ownership" "quarantined-product-failure-became-stale-source" \
			"root=$coverage_root issues=$(printf '%s' "$issues" | paste -sd, -) state=$state_path" \
			"include supervisor productFailureRunDirs in live-analysis launch scopes and in both analysis-tier supervisor-live sets; retain one first-level and deep handoff owner after the producer pauses"
	fi
}

check_supervisor_disabled_cleanup_memoization() {
	local out=$1 coverage_root=$2 state_path missing
	state_path=$coverage_root/supervisor-state.json
	[ -s "$state_path" ] || return 0
	missing=$(node - "$state_path" <<'NODE'
const fs = require( 'fs' );
const state = JSON.parse( fs.readFileSync( process.argv[ 2 ], 'utf8' ) );
const startedAtMs = Date.parse( state.startedAt ?? '' );
if ( ! Number.isFinite( startedAtMs ) || Date.now() - startedAtMs < 15 * 60 * 1000 ) {
	process.exit( 0 );
}
for ( const group of state.groups ?? [] ) {
	if (
		group.status === 'disabled' &&
		! group.removedResourcesCleanupAt
	) {
		process.stdout.write( `${ group.name }\n` );
	}
}
NODE
	)
	if [ -n "$missing" ]; then
		emit_finding "$out" high "coverage-guided" "disabled-group-cleanup-not-memoized" \
			"root=$coverage_root groups=$(printf '%s' "$missing" | paste -sd, -)" \
			"run removed-group Docker cleanup once per policy transition, persist its result in supervisor state, and back off failed cleanup retries instead of rescanning every disabled group before every active group"
	fi
}

check_product_failure_quarantine_slots() {
	local out=$1 coverage_root=$2 state_path groups_path retained
	state_path=$coverage_root/supervisor-state.json
	groups_path=$coverage_root/supervisor-groups.json
	[ -s "$state_path" ] && [ -s "$groups_path" ] || return 0
	retained=$(node - "$state_path" "$groups_path" <<'NODE'
const fs = require( 'fs' );
const state = JSON.parse( fs.readFileSync( process.argv[ 2 ], 'utf8' ) );
const published = new Set(
	JSON.parse( fs.readFileSync( process.argv[ 3 ], 'utf8' ) )
		.map( ( group ) => group?.name )
		.filter( Boolean )
);
for ( const group of state.groups ?? [] ) {
	if (
		! published.has( group.name ) ||
		( group.status !== 'paused-product-failure' && ! group.productFailureAt )
	) {
		continue;
	}
	const failureAtMs = Date.parse( group.productFailureAt ?? '' );
	if ( Number.isFinite( failureAtMs ) && Date.now() - failureAtMs < 120000 ) {
		continue;
	}
	process.stdout.write( `${ group.name }\n` );
}
NODE
	)
	if [ -n "$retained" ]; then
		emit_finding "$out" high "coverage-guided" "product-failure-quarantine-consuming-slot" \
			"root=$coverage_root groups=$(printf '%s' "$retained" | paste -sd, -)" \
			"keep actionable product failures as release gates but remove their groups from supervisor-groups.json within one status heartbeat and backfill the released producer slots"
	fi
}

check_published_startup_stall_holds() {
	local out=$1 coverage_root=$2 state_path groups_path held
	state_path=$coverage_root/supervisor-state.json
	groups_path=$coverage_root/supervisor-groups.json
	[ -s "$state_path" ] && [ -s "$groups_path" ] || return 0
	held=$(node - "$state_path" "$groups_path" <<'NODE'
const fs = require( 'fs' );
const state = JSON.parse( fs.readFileSync( process.argv[ 2 ], 'utf8' ) );
const configs = new Map(
	JSON.parse( fs.readFileSync( process.argv[ 3 ], 'utf8' ) ).map( ( group ) => [
		group.name,
		group,
	] )
);
for ( const group of state.groups ?? [] ) {
	const config = configs.get( group.name );
	if ( group.status !== 'paused-startup-stall' || ! config ) {
		continue;
	}
	const pausedAtMs = Date.parse(
		group.startupStallPausedAt ?? group.startupStallDrainRecordedAt ?? ''
	);
	if ( Number.isFinite( pausedAtMs ) && Date.now() - pausedAtMs < 120000 ) {
		continue;
	}
	const isSeedDrain =
		Number( group.startupStallSeedDrainCount ?? 0 ) > 0 ||
		/seed drain/i.test( group.lastReason ?? '' );
	const bypassesSeedDrain =
		config.env?.RTC_FUZZ_SUPERVISOR_BYPASS_STARTUP_STALL_COOLDOWN === '1' &&
		config.env?.RTC_FUZZ_SUPERVISOR_BYPASS_STARTUP_STALL_SEED_DRAIN === '1';
	const bypassesNoProductGuard =
		config.env
			?.RTC_FUZZ_SUPERVISOR_BYPASS_NO_PRODUCT_STARTUP_STALL_GUARD === '1';
	if ( bypassesNoProductGuard || ( isSeedDrain && bypassesSeedDrain ) ) {
		continue;
	}
	process.stdout.write( `${ group.name }\n` );
}
NODE
	)
	if [ -n "$held" ]; then
		emit_finding "$out" high "coverage-guided" "published-group-held-by-startup-cooldown" \
			"root=$coverage_root groups=$(printf '%s' "$held" | paste -sd, -)" \
			"remove optional paused groups from supervisor-groups.json or give policy-required/open-promotion groups the explicit no-product-guard bypass so they advance past the failed seed instead of consuming a six-hour hold"
	fi
}

check_published_group_harness_drift() {
	local out=$1 coverage_root=$2 state_path groups_path drift
	state_path=$coverage_root/supervisor-state.json
	groups_path=$coverage_root/supervisor-groups.json
	[ -s "$state_path" ] && [ -s "$groups_path" ] || return 0
	drift=$(node - "$state_path" "$groups_path" "$COVERAGE_BASE/candidate-source" "$HARNESS_SYNC_GRACE_SECONDS" <<'NODE'
const fs = require( 'fs' );
const crypto = require( 'crypto' );
const path = require( 'path' );
const state = JSON.parse( fs.readFileSync( process.argv[ 2 ], 'utf8' ) );
const groups = JSON.parse( fs.readFileSync( process.argv[ 3 ], 'utf8' ) );
const candidate = process.argv[ 4 ];
const syncGraceMs = Number( process.argv[ 5 ] ) * 1000;
const stateByName = new Map(
	( state.groups ?? [] ).map( ( group ) => [ group.name, group ] )
);
const criticalFiles = [
	'bin/rtc-browser-fuzz-runner.mjs',
	'bin/rtc-browser-fuzz-launcher.mjs',
	'bin/rtc-browser-fuzz-triage-watcher.mjs',
	'test/e2e/specs/editor/collaboration/collaboration-human-smoke.spec.ts',
];
const digest = ( filePath ) => {
	try {
		return crypto.createHash( 'sha256' ).update( fs.readFileSync( filePath ) ).digest( 'hex' );
	} catch {
		return 'missing';
	}
};
const expected = new Map(
	criticalFiles.map( ( relative ) => [ relative, digest( path.join( candidate, relative ) ) ] )
);
for ( const group of groups ) {
	const groupState = stateByName.get( group.name );
	if ( groupState?.status === 'waiting-repo-prep' ) {
		continue;
	}
	const hasActiveLane =
		Boolean( groupState?.currentRunDir ) ||
		( groupState?.activeRunDirs ?? [] ).length > 0;
	if ( ! hasActiveLane ) {
		// Publication intentionally precedes asynchronous isolated-repo prep.
		// The supervisor enforces the manifest before launch, so a missing or
		// stale overlay is actionable here only after a lane is actually active.
		continue;
	}
	const manifestPath = path.join(
		group.repoRoot,
		'.js2-harness-overlay-manifest.json'
	);
	let manifestSignature = 'missing';
	let manifestAgeMs = Number.POSITIVE_INFINITY;
	try {
		manifestSignature = JSON.parse(
			fs.readFileSync( manifestPath, 'utf8' )
		).signature ?? 'missing';
		manifestAgeMs = Math.max(
			0,
			Date.now() - fs.statSync( manifestPath ).mtimeMs
		);
	} catch {}
	const mismatches = criticalFiles.filter(
		( relative ) =>
			digest( path.join( group.repoRoot, relative ) ) !== expected.get( relative )
	);
	const matchingSyncInProgress =
		manifestSignature === `syncing:${ group.harnessOverlaySignature }` &&
		mismatches.length === 0 &&
		manifestAgeMs <= syncGraceMs;
	if ( matchingSyncInProgress ) {
		continue;
	}
	if (
		( group.harnessOverlaySignature &&
			manifestSignature !== group.harnessOverlaySignature ) ||
		mismatches.length > 0
	) {
		process.stdout.write(
			`${ group.name }:manifest=${ manifestSignature }:expected=${
				group.harnessOverlaySignature ?? 'unspecified'
			}:manifest_age_seconds=${ Math.floor( manifestAgeMs / 1000 )
			}:files=${ mismatches.join( ',' ) || 'none' }\n`
		);
	}
}
NODE
	)
	if [ -n "$drift" ]; then
		emit_finding "$out" high "coverage-guided" "published-group-harness-drift" \
			"root=$coverage_root drift=$(printf '%s' "$drift" | paste -sd, -)" \
			"content-hash and atomically synchronize the bounded rtc/editor harness overlay before a reused isolated repo becomes launchable, terminate lanes that loaded stale harness code, and require the expected overlay signature in supervisor admission"
	fi
}

check_gate_only_triage_processes() {
	local out=$1 analysis_issues stalled_issues orphan_issues
	local -a gate_only_issue_groups=()
	readarray -t gate_only_issue_groups < <(node <<'NODE'
const { execFileSync } = require( 'child_process' );
const fs = require( 'fs' );
const os = require( 'os' );
const rows = execFileSync( 'ps', [ '-eo', 'pid=,ppid=,etimes=,args=' ], {
	encoding: 'utf8',
} )
	.split( /\n/ )
	.map( ( line ) => line.match( /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/ ) )
	.filter( Boolean )
	.map( ( match ) => ( {
		pid: Number( match[ 1 ] ),
		ppid: Number( match[ 2 ] ),
		age: Number( match[ 3 ] ),
		args: match[ 4 ],
	} ) );
const byPid = new Map( rows.map( ( row ) => [ row.pid, row ] ) );
const clockTicks = Number(
	execFileSync( 'getconf', [ 'CLK_TCK' ], { encoding: 'utf8' } ).trim()
);
const processAge = ( pid ) => {
	try {
		const stat = fs.readFileSync( `/proc/${ pid }/stat`, 'utf8' );
		const fields = stat.slice( stat.lastIndexOf( ') ' ) + 2 ).split( /\s+/ );
		const startTicks = Number( fields[ 19 ] );
		if ( ! Number.isFinite( startTicks ) || ! Number.isFinite( clockTicks ) ) {
			return null;
		}
		return Math.max( 0, Math.floor( os.uptime() - startTicks / clockTicks ) );
	} catch {
		return null;
	}
};
const isAlive = ( pid ) => {
	try {
		process.kill( pid, 0 );
		return true;
	} catch {
		return false;
	}
};
const watchers = rows.filter( ( row ) =>
	/rtc-browser-fuzz-triage-watcher[.]mjs .*--gate-only/.test( row.args )
);
const analysisIssues = [];
const stalledIssues = [];
const orphanIssues = [];
for ( const watcher of watchers ) {
	if ( ! isAlive( watcher.pid ) ) {
		continue;
	}
	const age = processAge( watcher.pid );
	if ( age === null ) {
		continue;
	}
	const codexDescendants = rows.filter( ( row ) => {
		if ( ! /(?:^|[/ ])codex(?: |$).*\bexec\b/.test( row.args ) ) {
			return false;
		}
		let ancestor = byPid.get( row.ppid );
		for ( let depth = 0; ancestor && depth < 16; depth++ ) {
			if ( ancestor.pid === watcher.pid ) {
				return true;
			}
			ancestor = byPid.get( ancestor.ppid );
		}
		return false;
	} );
	if ( codexDescendants.length > 0 ) {
		analysisIssues.push(
			`pid=${ watcher.pid }:age=${ age }:codex=${ codexDescendants
				.map( ( row ) => row.pid )
				.join( ',' ) }`
		);
	} else if ( age >= 180 ) {
		stalledIssues.push( `pid=${ watcher.pid }:age=${ age }` );
	}
}
for ( const row of rows ) {
	if (
		/(?:^|[/ ])codex(?: |$).*\bexec\b/.test( row.args ) &&
		row.args.includes( '.triage-watcher/signatures/' ) &&
		( row.ppid === 1 || ! byPid.has( row.ppid ) )
	) {
		const age = processAge( row.pid );
		if ( age !== null && isAlive( row.pid ) ) {
			orphanIssues.push( `orphan-codex=${ row.pid }:age=${ age }` );
		}
	}
}
process.stdout.write( `${ analysisIssues.join( ',' ) }\n` );
process.stdout.write( `${ stalledIssues.join( ',' ) }\n` );
process.stdout.write( `${ orphanIssues.join( ',' ) }\n` );
NODE
	)
	analysis_issues=${gate_only_issue_groups[0]:-}
	stalled_issues=${gate_only_issue_groups[1]:-}
	orphan_issues=${gate_only_issue_groups[2]:-}
	if [ -n "$analysis_issues" ] || [ -n "$orphan_issues" ]; then
		emit_finding "$out" high "coverage-guided" "gate-only-triage-launched-analysis" \
			"processes=$(printf '%s,%s' "$analysis_issues" "$orphan_issues" | sed 's/^,//;s/,$//')" \
			"make --gate-only update signature state without launching Codex, bound refresh concurrency and timeout, terminate the complete gate-refresh process group on timeout, and retire orphaned gate-refresh Codex descendants"
	fi
	if [ -n "$stalled_issues" ]; then
		emit_finding "$out" high "coverage-guided" "gate-only-triage-stalled" \
			"processes=$stalled_issues" \
			"terminate the complete stale gate-refresh process group, preserve the bounded timeout and SIGKILL escalation in every caller, and inspect the exact current-run state file that made the metadata-only refresh exceed three minutes"
	fi
}

check_codex_frozen_candidate_cwd() {
	local out=$1 candidate=$COVERAGE_BASE/candidate-source pid cwd issues=''
	[ -d "$candidate" ] || return 0
	for pid in $(pgrep -f 'codex .*exec|/codex .*exec|codex -a .*exec' 2>/dev/null || true); do
		cwd=$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)
		case "$cwd" in
			"$candidate"|"$candidate"/*)
				issues="${issues}${issues:+,}pid=$pid:cwd=$cwd"
				;;
		esac
	done
	if [ -n "$issues" ]; then
		emit_finding "$out" high "coverage-guided" "codex-writing-frozen-candidate" \
			"$issues" \
			"terminate the offending job, restore versioned harness files from the matching control hash, route coverage guidance to the writable harness checkout, and route failure analysis to the generation's disposable isolated repo"
	fi
	return 0
}

check_codex_control_repo_cwd() {
	local out=$1 pid cwd issues=''
	for pid in $(pgrep -f 'codex .*exec|/codex .*exec|codex -a .*exec' 2>/dev/null || true); do
		cwd=$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)
		[ "$cwd" = "$REPO" ] || continue
		issues="${issues}${issues:+,}pid=$pid:cwd=$cwd"
	done
	if [ -n "$issues" ]; then
		emit_finding "$out" high "automation-control" "codex-writing-live-control-repo" \
			"$issues" \
			"terminate the live-control writer and relaunch diagnostics read-only or repairs in a disposable proposal workspace; never mutate the harness source used to validate an active generation"
	fi
}

check_repair_writer_isolation_contract() {
	local out=$1 structural=$REPO/bin/rtc-structural-issue-watchdog-remote.sh
	local guard=$REPO/bin/rtc-jetstream-guard-remote.sh launcher=$REPO/bin/rtc-coverage-guided-start-remote.sh
	local duplicate_noise=$REPO/bin/rtc-duplicate-noise-persona-loop-remote.sh
	local focused_gap=$REPO/bin/rtc-focused-shards-gap-codex-loop-remote.sh
	local productive_analysis=$REPO/bin/rtc-productive-analysis-loop-remote.sh
	local pr_progress=$REPO/bin/rtc-pr-progress-controller-remote.sh
	local local_publisher=$REPO/bin/rtc-local-pr-branch-publisher-loop.sh
	local issues='' pr_progress_danger_count loop_name loop_script
	grep -Fq -- '-s workspace-write' "$structural" 2>/dev/null || issues="${issues}${issues:+,}structural_workspace_sandbox_missing"
	grep -Fq 'cd "$workspace"' "$structural" 2>/dev/null || issues="${issues}${issues:+,}structural_proposal_workspace_missing"
	grep -Fq 'flock -n --close "$LOCK_FILE" "$0" run-locked' "$structural" 2>/dev/null || issues="${issues}${issues:+,}structural_lock_close_on_exec_missing"
	grep -Fq 'def process_age_seconds(pid):' "$structural" 2>/dev/null || issues="${issues}${issues:+,}structural_proc_age_missing"
	grep -Fq 'with open("/proc/uptime"' "$structural" 2>/dev/null || issues="${issues}${issues:+,}structural_proc_uptime_missing"
	if sed -n '/^check_runaway_scans() {/,/^check_analysis_productivity() {/p' "$structural" 2>/dev/null |
		grep -Fq 'etimes='; then
		issues="${issues}${issues:+,}structural_runaway_scan_uses_ps_etimes"
	fi
	if sed -n '/^launch_repair_jobs() {/,/^write_status() {/p' "$structural" 2>/dev/null |
		grep -Fq -- '-s danger-full-access'; then
		issues="${issues}${issues:+,}structural_danger_full_access"
	fi
	grep -Fq -- '-s read-only' "$guard" 2>/dev/null || issues="${issues}${issues:+,}guard_read_only_diagnostic_missing"
	grep -Fq 'stop_codex_in_control_repo' "$guard" 2>/dev/null || issues="${issues}${issues:+,}guard_live_writer_stop_missing"
	grep -Fq "stop_sessions_matching '^rtc-(focused|strict|gap)-analysis-|^rtc-analysis-(live|deep)-'" "$guard" 2>/dev/null || issues="${issues}${issues:+,}guard_optional_analysis_session_fallback_missing"
	grep -Fq 'OPTIONAL_ANALYSIS_CAP_HOLD_FILE=$BASE/optional-analysis-cap-hold.tsv' "$guard" 2>/dev/null || issues="${issues}${issues:+,}guard_optional_analysis_cap_hold_missing"
	grep -Fq 'restore_control_harness_from_frozen' "$guard" 2>/dev/null || issues="${issues}${issues:+,}guard_frozen_restore_missing"
	grep -Fq 'ENABLE_DUPLICATE_NOISE_REVIEW=${RTC_JETSTREAM_ENABLE_DUPLICATE_NOISE_REVIEW:-0}' "$guard" 2>/dev/null || issues="${issues}${issues:+,}duplicate_noise_default_enabled"
	grep -Fq -- '-s read-only' "$duplicate_noise" 2>/dev/null || issues="${issues}${issues:+,}duplicate_noise_read_only_missing"
	if grep -Fq -- '-s danger-full-access' "$duplicate_noise" 2>/dev/null; then
		issues="${issues}${issues:+,}duplicate_noise_live_writer_enabled"
	fi
	grep -Fq 'cd "$lane_dir"' "$productive_analysis" 2>/dev/null || issues="${issues}${issues:+,}productive_analysis_workspace_missing"
	grep -Fq -- '-s workspace-write' "$productive_analysis" 2>/dev/null || issues="${issues}${issues:+,}productive_analysis_workspace_sandbox_missing"
	if grep -Fq -- '-s danger-full-access' "$productive_analysis" 2>/dev/null; then
		issues="${issues}${issues:+,}productive_analysis_live_writer_enabled"
	fi
	grep -Fq 'ENABLE_FOCUSED_GAP_CODEX=${RTC_JETSTREAM_ENABLE_FOCUSED_GAP_CODEX:-0}' "$guard" 2>/dev/null || issues="${issues}${issues:+,}focused_gap_default_enabled"
	grep -Fq -- '-s read-only' "$focused_gap" 2>/dev/null || issues="${issues}${issues:+,}focused_gap_read_only_missing"
	if grep -Fq -- '-s danger-full-access' "$focused_gap" 2>/dev/null; then
		issues="${issues}${issues:+,}focused_gap_live_writer_enabled"
	fi
	pr_progress_danger_count=$(grep -Fc -- '-s danger-full-access' "$pr_progress" 2>/dev/null || true)
	[ "$pr_progress_danger_count" = 1 ] || issues="${issues}${issues:+,}pr_progress_unisolated_danger_count=$pr_progress_danger_count"
	grep -Fq 'cd "$worktree"' "$pr_progress" 2>/dev/null || issues="${issues}${issues:+,}pr_progress_repair_worktree_missing"
	grep -Fq 'git -C "$SRC" worktree add --detach "$worktree" "$branch"' "$pr_progress" 2>/dev/null || issues="${issues}${issues:+,}pr_progress_repair_worktree_setup_missing"
	grep -Fq "export RTC_FUZZ_NOVELTY_COVERAGE_CODEX='0'" "$launcher" 2>/dev/null || issues="${issues}${issues:+,}coverage_guidance_writer_enabled"
	while IFS=$'\t' read -r loop_name loop_script; do
		[ -s "$loop_script" ] || {
			issues="${issues}${issues:+,}${loop_name}_strict_cycle_script_missing"
			continue
		}
		grep -Fq 'cycle_rc=$?' "$loop_script" 2>/dev/null || issues="${issues}${issues:+,}${loop_name}_strict_cycle_status_missing"
		if grep -Eq 'run_once[[:space:]]*\|\|' "$loop_script" 2>/dev/null; then
			issues="${issues}${issues:+,}${loop_name}_conditional_errexit_disabled"
		fi
	done <<EOF
structural	$structural
pr_progress	$pr_progress
productive_analysis	$productive_analysis
local_publisher	$local_publisher
EOF
	if [ -n "$issues" ]; then
		emit_finding "$out" high "automation-control" "live-control-writer-isolation-missing" \
			"$issues structural=$structural guard=$guard launcher=$launcher" \
			"keep active-generation harness sources immutable: use disposable workspace-write proposal directories for repairs, read-only guard diagnostics, disabled in-generation guidance, and frozen-source restoration for drift"
	fi
}

check_plain_editor_false_green() {
	local out=$1 coverage_root=$2 launches classification class proof candidate_head retained=0 proof_valid=0
	launches=$CRITICAL_BASE/logs/launches.tsv
	[ -s "$launches" ] || return 0
	classification=$(
		tail -n 2000 "$launches" 2>/dev/null |
			awk -F '\t' '
				$2 == "continuation" && $5 ~ /\/continuations\/plain-editor-product-smoke$/ {
					path = $5 "/classification.tsv"
				}
				END { if (path != "") print path }
			'
	)
	[ -s "$classification" ] || return 0
	class=$(awk -F '\t' 'NR > 1 && $1 == "plain-editor-product-smoke" { print $2; exit }' "$classification" 2>/dev/null || true)
	case "$class" in
		smoke_green|harness_or_scheduler_repaired) ;;
		*) return 0 ;;
	esac
	if [ -s "$coverage_root/novelty-state.json" ]; then
		if node - "$coverage_root/novelty-state.json" <<'NODE'
const fs = require( 'fs' );
let state;
try {
	state = JSON.parse( fs.readFileSync( process.argv[ 2 ], 'utf8' ) );
} catch {
	process.exit( 1 );
}
const groups = new Set( [
	...( state.productFailureQuarantinedGroups ?? [] ),
	...String( state.productFailureQuarantineMarker ?? '' ).split( ',' ),
].map( ( value ) => String( value ).trim() ).filter( Boolean ) );
process.exit( groups.has( 'novelty-http-plain-editor-product-smoke' ) ? 0 : 1 );
NODE
		then
			retained=1
		fi
	fi
	proof=${classification%/*}/rtc-save-proof.tsv
	candidate_head=$(git -C "$CANDIDATE_REPO" rev-parse --verify --quiet "refs/heads/$CANDIDATE_BRANCH^{commit}" 2>/dev/null || true)
	if [ -s "$proof" ] && [ -n "$candidate_head" ] && awk -F '\t' -v head="$candidate_head" '
		NR > 1 && $1 == "wp-sync-save" && $2 == "success" &&
			$3 ~ /^2[0-9][0-9]$/ && $4 == head && $5 != "" { found = 1 }
		END { exit found ? 0 : 1 }
	' "$proof" 2>/dev/null; then
		proof_valid=1
	fi
	if [ "$retained" -eq 1 ] || [ "$proof_valid" -ne 1 ]; then
		emit_finding "$out" high "critical-path" "plain-editor-green-without-exact-rtc-proof" \
			"classification=$classification class=$class retained_product_failure=$retained rtc_save_proof=$proof proof_valid=$proof_valid candidate=$candidate_head" \
			"keep the publication gate open, require an RTC-enabled wp-sync save 2xx artifact for the exact candidate, and reject a plain non-RTC save/reload or result=not_reached as green"
	fi
	return 0
}

check_active_continuation_vendor_mounts() {
	local out=$1 session pane_pid run_script run_dir worktree vendor_path target issues=''
	while IFS= read -r session; do
		[ -n "$session" ] || continue
		worktree=$(tmux list-panes -t "$session" -F '#{pane_current_path}' 2>/dev/null | sed -n '1p')
		if [ -n "$worktree" ] && [ -L "$worktree/vendor" ]; then
			target=$(readlink "$worktree/vendor" 2>/dev/null || true)
			issues="${issues}${issues:+,}session=$session:vendor=$worktree/vendor:target=$target"
		fi

		pane_pid=$(tmux list-panes -t "$session" -F '#{pane_pid}' 2>/dev/null | sed -n '1p')
		[ -n "$pane_pid" ] || continue
		run_script=$(tr '\0' '\n' < "/proc/$pane_pid/cmdline" 2>/dev/null | awk '/\/run[.]sh$/ { print; exit }' || true)
		[ -n "$run_script" ] || continue
		run_dir=${run_script%/run.sh}
		for vendor_path in "$run_dir/validation-worktree/vendor" "$run_dir/validation-worktree/vendor/vendor"; do
			[ -L "$vendor_path" ] || continue
			target=$(readlink "$vendor_path" 2>/dev/null || true)
			issues="${issues}${issues:+,}session=$session:vendor=$vendor_path:target=$target"
		done
	done < <(tmux_sessions | grep '^rtc-critical-continuation-' || true)
	if [ -n "$issues" ]; then
		emit_finding "$out" high "critical-path" "active-continuation-vendor-not-container-visible" \
			"$issues" \
			"replace the host-absolute vendor symlink with an in-worktree hard-linked dependency snapshot so wp-env container PHP can load vendor/autoload.php"
	fi
	return 0
}

check_stuck_critical_cleanup() {
	local out=$1 pid ppid age args cwd issues=''
	while read -r pid ppid age args; do
		[ -n "$pid" ] || continue
		kill -0 "$pid" 2>/dev/null || continue
		case "$args" in
			*"$CRITICAL_BASE/wp-env/"*'wp-env'*' stop'*|*"$CRITICAL_BASE/wp-env/"*'docker compose'*' down'*)
				[ "${age:-0}" -ge 180 ] || continue
				terminate_runaway_pid "$pid"
				issues="${issues}${issues:+,}kind=cleanup:pid=$pid:age=${age}s:args=$args"
				;;
			*wp-env*' start'*)
				[ "${age:-0}" -ge 600 ] || continue
				cwd=$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)
				case "$cwd" in
					"$CRITICAL_BASE"/runs/*/continuations/*|"$CRITICAL_BASE"/worktrees/continuation-*) ;;
					*) continue ;;
				esac
				terminate_runaway_pid "$pid"
				issues="${issues}${issues:+,}kind=startup:pid=$pid:age=${age}s:cwd=$cwd:args=$args"
				;;
		esac
	done < <(ps -eo pid=,ppid=,etimes=,args= 2>/dev/null | awk '{ pid=$1; ppid=$2; age=$3; $1=$2=$3=""; sub(/^ +/, ""); print pid, ppid, age, $0 }')
	if [ -n "$issues" ]; then
		emit_finding "$out" medium "critical-path" "stuck-isolated-wp-env-terminated" \
			"$issues" \
			"keep isolated wp-env startup and cleanup bounded so environment setup cannot hold a repair or adoption slot indefinitely"
	fi
	return 0
}

check_coverage_novelty_full_pass_health() {
	local out=$1 coverage_root=$2 state_path output_age now pass_info last_full last_updated last_triage pass_epoch pass_age
	[ -n "$coverage_root" ] && [ -d "$coverage_root" ] || return 0
	state_path="$coverage_root/novelty-state.json"
	output_age=$(file_age_seconds "$coverage_root" || printf 999999)
	if [ ! -s "$state_path" ]; then
		if [ "$output_age" -gt "$COVERAGE_FULL_PASS_START_GRACE_SECONDS" ]; then
			emit_finding "$out" high "coverage-guided" "missing-novelty-state-for-full-pass" \
				"$state_path output=$coverage_root" \
				"restore novelty-state generation and make the session watchdog require completed full novelty passes"
		fi
		return 0
	fi
	pass_info=$(
		node - "$state_path" <<'NODE'
const fs = require( 'fs' );
const statePath = process.argv[ 2 ];
let state = {};
try {
	state = JSON.parse( fs.readFileSync( statePath, 'utf8' ) );
} catch {}
const stats = state.lastCompletedFullPassStats || {};
console.log(
	[
		state.lastCompletedFullPassAt || '',
		state.lastUpdatedAt || '',
		state.lastCurrentRunTriageCompletedAt || '',
		stats.coverageFiles ?? '',
		stats.currentRunCoverageFiles ?? '',
	].join( '\t' )
);
NODE
	)
	IFS=$'\t' read -r last_full last_updated last_triage _coverage_files _current_coverage_files <<< "$pass_info"
	if [ -z "$last_full" ]; then
		if [ "$output_age" -gt "$COVERAGE_FULL_PASS_START_GRACE_SECONDS" ]; then
			emit_finding "$out" high "coverage-guided" "novelty-full-pass-never-completed" \
				"$state_path output=$coverage_root lastUpdatedAt=${last_updated:-missing} lastCurrentRunTriageCompletedAt=${last_triage:-missing}" \
				"debug why coverage-guided novelty is only heartbeating or triaging; require a completed full pass before treating it as healthy"
		fi
	else
		now=$(date -u +%s)
		pass_epoch=$(date -u -d "$last_full" +%s 2>/dev/null || printf 0)
		if [ "$pass_epoch" -le 0 ]; then
			emit_finding "$out" high "coverage-guided" "novelty-full-pass-timestamp-invalid" \
				"$state_path lastCompletedFullPassAt=$last_full" \
				"fix novelty-state full-pass timestamp writing and restart the session watchdog"
		else
			pass_age=$(( now - pass_epoch ))
			if [ "$pass_age" -gt "$COVERAGE_FULL_PASS_MAX_AGE_SECONDS" ]; then
				emit_finding "$out" high "coverage-guided" "novelty-full-pass-stale" \
					"$state_path lastCompletedFullPassAt=$last_full threshold=${COVERAGE_FULL_PASS_MAX_AGE_SECONDS}s" \
					"debug stalled coverage-guided full-pass completion; reduce observed-history scope or fix the scan before trusting the monitor"
			fi
		fi
	fi
	if recent_log_matches "$COVERAGE_BASE/logs/monitor.log" "$COVERAGE_HEAP_FAILURE_WINDOW_SECONDS" 'JavaScript heap out of memory|Reached heap limit|Allocation failed|heap limit|FATAL ERROR'; then
		emit_finding "$out" high "coverage-guided" "novelty-monitor-heap-limit" \
			"$COVERAGE_BASE/logs/monitor.log window=${COVERAGE_HEAP_FAILURE_WINDOW_SECONDS}s" \
			"reduce coverage-guided observed-history scope or streaming memory use; do not let status heartbeats mask heap-limited passes"
	fi
}

check_unknown_action_profile_startup_failures() {
	local out=$1 roots=() root match profile group
	if [ -s "$COVERAGE_BASE/current-output-dir.txt" ]; then
		root=$(sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt")
		[ -n "$root" ] && roots+=( "$root" )
	fi
	for root_file in \
		"$STRICT_EXPANSION_BASE/current-run-root.txt" \
		"$FOCUSED_SHARDS_BASE/current-run-root.txt" \
		"$GAP_BOOSTER_BASE/current-run-root.txt"; do
		if [ -s "$root_file" ]; then
			root=$(sed -n '1p' "$root_file")
			[ -n "$root" ] && roots+=( "$root" )
		fi
	done

	for root in "${roots[@]}"; do
		[ -d "$root" ] || continue
		match=$(
			find "$root" -maxdepth 4 -type f \( -name 'summary.ndjson' -o -name 'startup-preflight.log' \) -mmin -90 -print0 2>/dev/null |
				xargs -0 -r rg -m 1 'Unknown GUTENBERG_RTC_BROWSER_ACTION_PROFILE "[^"]+"' 2>/dev/null |
				head -1 || true
		)
		[ -n "$match" ] || continue
		profile=$(printf '%s\n' "$match" | sed -n 's/.*Unknown GUTENBERG_RTC_BROWSER_ACTION_PROFILE "\([^"]*\)".*/\1/p' | head -1)
		group=$(printf '%s\n' "$match" | sed -n "s#.*runs/[^/]*/\\([^/]*\\)/lane-[0-9].*#\\1#p" | head -1)
		emit_finding "$out" high "coverage-guided" "unknown-action-profile-startup-failure" \
			"root=$root group=${group:-unknown} profile=${profile:-unknown} match=$match" \
			"sync the RTC fuzz harness action-profile table before scheduling this group; startup/profile failures must not consume fuzz or triage capacity"
	done
}

check_current_run_duplicate_noise() {
	local out=$1 coverage_root status
	[ -s "$COVERAGE_BASE/current-output-dir.txt" ] || return 0
	coverage_root=$(sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt")
	[ -n "$coverage_root" ] || return 0
	status="$coverage_root/novelty-status.md"
	[ -s "$status" ] || return 0
	awk -F ': ' '
		/^## Triage Yield$/ {
			in_section = 1
			next
		}
		in_section && /^## / {
			in_section = 0
		}
		in_section && /^- signatures:/ {
			signatures = $2 + 0
		}
		in_section && /^- raw signatures:/ {
			raw_signatures = $2 + 0
		}
		in_section && /^- known-infra signatures:/ {
			known_infra = $2 + 0
		}
		in_section && /^- family-capped signatures:/ {
			family_capped = $2 + 0
		}
		in_section && /^- source-suppressed signatures:/ {
			source_suppressed = $2 + 0
		}
		in_section && /^- stale-source signatures:/ {
			stale_source = $2 + 0
		}
		in_section && /^- analysis-gated non-actionable signatures:/ {
			analysis_gated = $2 + 0
		}
		in_section && /^- normalization-noise excluded signatures:/ {
			normalization_noise = $2 + 0
		}
		in_section && /^- likely-real visible:/ {
			likely = $2 + 0
		}
		in_section && /^- top duplicate family share:/ {
			top_share = $2 + 0
		}
		in_section && /^- raw top duplicate family share:/ {
			raw_top_share = $2 + 0
		}
		in_section && /^- top semantic families:/ {
			top_families = $2
		}
		in_section && /^- raw top semantic families:/ {
			raw_top_families = $2
		}
		END {
			current_fires = (signatures >= 3 && top_share >= 0.50 && likely == 0)
			raw_delta = raw_signatures - signatures
			accounted_delta = known_infra + family_capped + source_suppressed + stale_source + analysis_gated + normalization_noise
			raw_uncapped_fires = 0
			if (raw_signatures >= 3 && raw_top_share >= 0.50 && likely == 0 && (current_fires || raw_delta > accounted_delta)) {
				raw_uncapped_fires = 1
			}
			if (current_fires) {
				printf "current\t%d\t%.4f\t%d\t%s\n", signatures, top_share, likely, top_families
			}
			if (raw_uncapped_fires) {
				printf "raw-current\t%d\t%.4f\t%d\t%s\n", raw_signatures, raw_top_share, likely, raw_top_families
			}
		}
	' "$status" |
		while IFS=$'\t' read -r scope signatures share likely families; do
			[ -n "$scope" ] || continue
			emit_finding "$out" high "duplicate-noise" "${scope}-duplicate-share-dominated" \
				"$status scope=$scope signatures=$signatures share=$share likely_real_visible=$likely families=$families" \
				"debug duplicate/noise control-plane leak; preserve product-evidence representatives but cap/rotate the leaking family and restart affected producer or analysis loop"
		done
}

coverage_guided_lower_level_satisfied() {
	if has_session rtc-coverage-guided-lower-level-b64; then
		return 0
	fi
	if [ -f "$CG_LOWER_LEVEL_B64_HOLD_FILE" ]; then
		if ! grep -Fq "$CG_LOWER_LEVEL_B64_REPLACEMENT_GROUP" "$CG_LOWER_LEVEL_B64_HOLD_FILE"; then
			return 0
		fi
		if [ -f "$CG_LOWER_LEVEL_B64_REPLACEMENT_HOLD_FILE" ] &&
			grep -Eq "$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_GROUP|rtc-table-query-array-crdt|table-query-array" "$CG_LOWER_LEVEL_B64_REPLACEMENT_HOLD_FILE"; then
			if [ -f "$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_HOLD_FILE" ] &&
				grep -Eq "$CG_LOWER_LEVEL_BLOCK_PARSER_GROUP|rtc-block-parser-serialization|block-parser|parser-serialization" "$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_HOLD_FILE"; then
				coverage_guided_lower_level_group_session_or_hold_exists \
					"$CG_LOWER_LEVEL_BLOCK_PARSER_SESSION" \
					"$CG_LOWER_LEVEL_BLOCK_PARSER_GROUP" \
					"$CG_LOWER_LEVEL_BLOCK_PARSER_HOLD_FILE"
				return
			fi
			if [ -f "$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_HOLD_FILE" ] &&
				grep -Eq "$CG_LOWER_LEVEL_HTTP_POLLING_GROUP|rtc-http-polling-manager|http-polling|polling-manager" "$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_HOLD_FILE"; then
				coverage_guided_lower_level_group_session_or_hold_exists \
					"$CG_LOWER_LEVEL_HTTP_POLLING_SESSION" \
					"$CG_LOWER_LEVEL_HTTP_POLLING_GROUP" \
					"$CG_LOWER_LEVEL_HTTP_POLLING_HOLD_FILE"
				return
			fi
			coverage_guided_lower_level_group_session_or_hold_exists \
				"$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_SESSION" \
				"$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_GROUP" \
				"$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_HOLD_FILE"
			return
		fi
		coverage_guided_lower_level_group_session_or_hold_exists \
			"$CG_LOWER_LEVEL_B64_REPLACEMENT_SESSION" \
			"$CG_LOWER_LEVEL_B64_REPLACEMENT_GROUP" \
			"$CG_LOWER_LEVEL_B64_REPLACEMENT_HOLD_FILE"
		return
	fi
	return 1
}

guard_pool_currently_satisfied() {
	local pool=$1 coverage_root suffix scoped_session state_session
	case "$pool" in
		coverage)
			has_session rtc-coverage-guided-novelty || return 1
			has_session rtc-coverage-guided-watchdog || return 1
			[ -s "$COVERAGE_BASE/current-output-dir.txt" ] || return 1
			coverage_root=$(sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt")
			[ -n "$coverage_root" ] && [ -s "$coverage_root/supervisor-state.json" ] || return 1
			suffix=$(basename "$coverage_root" | sed -E 's/[^A-Za-z0-9_.-]+/-/g; s/^-+//; s/-+$//')
			scoped_session="rtc-coverage-guided-supervisor-$suffix"
			state_session=$(
				node -e "const fs = require('fs'); try { const state = JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); if (typeof state.supervisorSession === 'string') process.stdout.write(state.supervisorSession); } catch {}" \
					"$coverage_root/novelty-state.json" 2>/dev/null || true
			)
			if [ -n "$state_session" ]; then
				has_session "$state_session"
				return
			fi
			has_session rtc-coverage-guided-supervisor || has_session "$scoped_session"
			;;
		strict)
			browser_pool_supervisor_state_fresh strict-expansion 900
			;;
		focused)
			browser_pool_supervisor_state_fresh focused-shards 900
			;;
		gap-booster)
			browser_pool_supervisor_state_fresh gap-booster 900
			;;
		lower-level)
			has_lower_level_session
			;;
		cg-lower-level)
			coverage_guided_lower_level_satisfied
			;;
		duplicate-noise)
			[ "$REQUIRE_DUPLICATE_NOISE_REVIEW" = "1" ] || return 0
			has_session rtc-duplicate-noise-persona-loop
			;;
		level-mix)
			[ "$REQUIRE_LEVEL_MIX_REVIEW" = "1" ] || return 0
			has_session rtc-fuzz-level-mix-persona-loop &&
				has_session rtc-fuzz-level-mix-persona-loop-watchdog
			;;
		native-protocol)
			[ "$REQUIRE_NATIVE_PROTOCOL_REVIEW" = "1" ] || return 0
			has_session rtc-native-harness-persona-loop &&
				has_session rtc-protocol-server-persona-loop
			;;
		asserts)
			[ "$REQUIRE_ASSERT_REVIEW" = "1" ] || return 0
			has_session rtc-fuzz-only-asserts-loop
			;;
		deferred)
			has_session rtc-deferred-work-promotion-loop
			;;
		pr-progress)
			has_session rtc-pr-progress-controller-loop
			;;
		finalization)
			has_session rtc-pr-finalization-loop
			;;
		critical-pr)
			has_session rtc-critical-path-pr-executor-loop
			;;
		resource)
			has_session rtc-resource-autoscaler
			;;
		structural)
			has_session rtc-structural-issue-watchdog
			;;
		*)
			return 1
			;;
	esac
}

detect_findings() {
	local tmp=$FINDINGS.$$.tmp coverage_root
	{
		printf 'timestamp\tseverity\tcomponent\tkey\tevidence\tnext_action\n'
	} > "$tmp"
	check_runaway_scans "$tmp"
	check_exact_sessions "$tmp"
	check_tmux_capture_guard "$tmp"
	check_guard_loop_health "$tmp"
	check_coverage_process_ownership "$tmp"
	check_deadline_budget_consistency "$tmp"
	check_optional_browser_breadth_floor_contract "$tmp"
	check_gate_only_timeout_contract "$tmp"
	check_optional_pool_launcher_sync "$tmp"
	check_docker_network_capacity "$tmp"
	check_novelty_monitor_budget_policy_contract "$tmp"
	check_resource_budget_application_consistency "$tmp"
	check_actionable_product_failure_bridge "$tmp"
	check_critical_path_invariants "$tmp"
	check_local_publisher_health "$tmp"
	check_validated_adoption_delivery_invariants "$tmp"
	check_repair_publication_progress "$tmp"
	check_repair_branch_harness_contamination "$tmp"
	check_benchmark_canary_promotion_invariants "$tmp"
	check_loop_statuses "$tmp"
	if [ -s "$COVERAGE_BASE/current-output-dir.txt" ]; then
		coverage_root=$(sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt")
		check_coverage_start_budget_snapshot "$tmp" "$coverage_root"
		check_supervisor_publication_budget "$tmp" "$coverage_root"
		check_coverage_supervisor_root_agreement "$tmp" "$coverage_root"
		check_supervisor_disabled_cleanup_memoization "$tmp" "$coverage_root"
		check_product_failure_quarantine_slots "$tmp" "$coverage_root"
		check_published_startup_stall_holds "$tmp" "$coverage_root"
		check_published_group_harness_drift "$tmp" "$coverage_root"
		check_retained_first_green_honored "$tmp" "$coverage_root"
		check_promotion_preflight_relaunch_loops "$tmp" "$coverage_root"
		check_human_smoke_network_stability "$tmp" "$coverage_root"
		check_product_failure_analysis_ownership "$tmp" "$coverage_root"
		check_plain_editor_false_green "$tmp" "$coverage_root"
		check_coverage_novelty_full_pass_health "$tmp" "$coverage_root"
	fi
	check_gate_only_triage_processes "$tmp"
	check_codex_frozen_candidate_cwd "$tmp"
	check_codex_control_repo_cwd "$tmp"
	check_repair_writer_isolation_contract "$tmp"
	check_active_continuation_vendor_mounts "$tmp"
	check_stuck_critical_cleanup "$tmp"
	check_unknown_action_profile_startup_failures "$tmp"
	check_current_run_duplicate_noise "$tmp"
	if recent_log_matches "$GUARD_BASE/logs/guard.log" 1800 'restart requested pool=.*reason='; then
		awk -F '\t' -v cutoff=$(( $(date -u +%s) - 1800 )) '
			$3 ~ /^candidate source invariant failed: (versioned harness advanced|candidate branch advanced)/ { next }
			$1 >= cutoff { count[$2]++ }
			END {
				for (pool in count) {
					if (count[pool] >= 3) {
						printf "%s\t%s\n", pool, count[pool]
					}
				}
			}
		' "$GUARD_BASE/logs/restart-events.tsv" 2>/dev/null |
			while IFS=$'\t' read -r pool count; do
				[ -n "$pool" ] || continue
				if guard_pool_currently_satisfied "$pool"; then
					continue
				fi
				emit_finding "$tmp" high "guard" "repeated-restarts-$pool" "$GUARD_BASE/logs/restart-events.tsv count=$count" "debug why $pool repeatedly restarts instead of only restarting it"
			done
	fi
	check_analysis_productivity "$tmp"
	mv "$tmp" "$FINDINGS"
	awk -F '\t' 'NR > 1 { print }' "$FINDINGS" >> "$EVENTS"
}

recent_repair_for_key() {
	local key=$1 now
	now=$(date -u +%s)
	awk -F '\t' -v key="$key" -v now="$now" -v cooldown="$REPAIR_COOLDOWN_SECONDS" '
		$2 == key { last = $1 }
		END { exit !(last != "" && now - last < cooldown) }
	' "$REPAIR_LEDGER" 2>/dev/null
}

write_repair_prompt() {
	local prompt=$1 report=$2 finding_line=$3 key=$4 workspace=$5 baseline=$6
	cat > "$prompt" <<PROMPT
You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents. Work in this one Codex process.

Structural watchdog finding key: $key
Finding TSV row:
$finding_line

Task:
1. Treat this as a controller/automation structural bug unless evidence proves otherwise. This is not a request for another passive report.
2. Read current state and logs:
	   - $FINDINGS
	   - $EVENTS
	   - $CRITICAL_BASE/current-critical-path-status.md
	   - $CRITICAL_BASE/blockers.tsv, $CRITICAL_BASE/queue.tsv, $CRITICAL_BASE/terminal-ledger.tsv, $CRITICAL_BASE/logs/launches.tsv
	   - $CRITICAL_BASE/logs/critical-path-pr-executor.log
	   - $CRITICAL_REPO_SCRIPT
	   - $CRITICAL_DEPLOYED_SCRIPT
	   - $CRITICAL_TMP_SCRIPT
	   - $FINALIZATION_BASE/current-finalization-status.md
	   - $DEFERRED_BASE/current-deferred-status.md
	   - $PR_PROGRESS_BASE/current-pr-progress-controller-status.md
	   - $PR_PROGRESS_BASE/logs/controller.log
	   - $BENCHMARK_FEEDBACK_BASE/current-feedback.md
	   - $BENCHMARK_FEEDBACK_BASE/current-feedback.tsv
	   - $RESOURCE_BASE/resource-autoscaler-status.md
   - $COVERAGE_BASE/current-output-dir.txt and the active novelty-status.md
   - $COVERAGE_BASE/logs/monitor.log
	   - $COVERAGE_BASE/logs/session-watchdog-state.json
	   - $DUP_NOISE_BASE/latest-synthesis.md
	   - $DUP_NOISE_BASE/latest-feedback-action.md
	   - $GUARD_BASE/logs/guard.log
	   - $GUARD_BASE/logs/restart-events.tsv
	   - $RUNAWAY_SCAN_REPORT
	   - $RUNAWAY_SCAN_KILL_LEDGER
	   - $ANALYSIS_PRODUCTIVITY_REPORT
	   - $ARTIFACT_INDEX_ARTIFACTS when it is relevant and fresh enough for the question
	   - tmux -L rtc-fuzz list-sessions -F '#S'
3. If a minimal safe fix is clear, edit only the proposal copies under $workspace/bin. The live repo, deployed controller scripts, /tmp launchers, and running loops are read-only evidence for this job.
4. For critical-path executor issues, make the proposed change in $workspace/bin/rtc-critical-path-pr-executor-loop-remote.sh and document which deployed copies would need synchronization after review.
5. The runner will create a patch by comparing $baseline with $workspace. Include the exact proposed file list, validation commands, and restart scope in the report so the local publisher can review and persist it.
6. Do not classify the issue as fixed unless the invariant that fired this finding is no longer true.
7. For runaway scan findings, identify the controller or graph path that launched the scan and replace it with the artifact index, a current-run-only scan, or a bounded command. Do not just terminate the process.
8. For analysis-productivity findings, decide whether more Codex analysis would actually advance PR/fuzzer work. If yes, fix the admission/cooldown/session-accounting problem and launch targeted unblock analysis. If no, write the exact reason and the invariant that should prevent future false alarms.
9. For benchmark-canary promotion findings, keep coverage_present separate from exact_stack_green. Patch the critical-path executor or PR/finalization controller if coverage_repaired can close a promotion_blocked exact-stack row.
10. Write a concise durable report to: $report

Guardrails:
- Do not use behavior-disabling flags such as DISABLE_SYNC_FAULTS, DISABLE_PARSER_STRESS, DISABLE_REVISION_RESTORE, DISABLE_RELOAD, or DISABLE_RANDOM_RELOAD.
- Do not run broad browser fuzzing from this repair job.
- Prefer bounded shell probes and exact source edits.
- Do not write outside $workspace. Do not modify $REPO, $CRITICAL_DEPLOYED_SCRIPT, $CRITICAL_TMP_SCRIPT, /tmp launchers, status artifacts, ledgers, or tmux sessions.
- Do not run historical or aggregate scans such as \`du -shx\` over /media/volume/danluu-fuzz-data, /tmp, /var/tmp, /home/exouser, the repo root, or old runs. Use current status files, launch ledgers, the artifact index, current-output-dir, or one exact current-run path instead.
- If size or disk evidence is necessary, prefer \`df -h\` or \`stat\` on exact files. Any \`du\`, \`find\`, \`rg\`, or \`grep\` must be limited to one current-run/artifact path and bounded with \`timeout\`, \`-maxdepth\`, \`-m\`, or an equivalent small script.
- For runaway scan findings, record the controller/session path that launched the scan, patch that path to use the bounded/indexed probe, then verify $RUNAWAY_SCAN_REPORT no longer lists the process.
PROMPT
}

launch_repair_jobs() {
	local line severity component key evidence next_action issue_key session ts run_dir prompt report stderr runner
	local workspace baseline proposal proposal_status source destination
	awk -F '\t' 'NR > 1 && $2 == "high" { print }' "$FINDINGS" |
		while IFS=$'\t' read -r _ts severity component key evidence next_action; do
			[ -n "$key" ] || continue
			if [ "$component" = "analysis-productivity" ] && [ "$key" = "codex-fanout-over-cap" ]; then
				log "recorded analysis over-fanout without launching another Codex repair key=$key evidence=$evidence"
				continue
			fi
			issue_key=$(repair_issue_key "$component" "$key" "$evidence")
			if recent_repair_for_key "$issue_key"; then
				continue
			fi
			if [ "$(active_repair_count)" -ge "$MAX_ACTIVE_REPAIRS" ]; then
				break
			fi
			ts=$(date -u +%Y%m%dT%H%M%SZ)
			session="rtc-structural-repair-$(slugify "$component-$key" | cut -c1-42)-$ts"
			if has_session "$session"; then
				continue
			fi
			run_dir="$BASE/runs/$ts-$issue_key"
			workspace="$run_dir/workspace"
			baseline="$run_dir/baseline"
			proposal="$run_dir/proposed.patch"
			proposal_status="$run_dir/proposal-status.tsv"
			mkdir -p "$workspace/bin" "$baseline/bin"
			for source in "$REPO"/bin/rtc-*; do
				[ -f "$source" ] || continue
				destination=${source##*/}
				cp -p "$source" "$workspace/bin/$destination"
				cp -p "$source" "$baseline/bin/$destination"
			done
			prompt="$run_dir/prompt.md"
			report="$run_dir/report.md"
			stderr="$run_dir/stderr.log"
			runner="$run_dir/run.sh"
			line=$(printf '%s\t%s\t%s\t%s\t%s\t%s' "$_ts" "$severity" "$component" "$key" "$evidence" "$next_action")
			write_repair_prompt "$prompt" "$report" "$line" "$issue_key" "$workspace" "$baseline"
			cat > "$runner" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "$workspace"
child_pid=
cleanup() {
	if [ -n "\$child_pid" ] && kill -0 "\$child_pid" 2>/dev/null; then
		kill -TERM -- "-\$child_pid" 2>/dev/null || kill -TERM "\$child_pid" 2>/dev/null || true
	fi
	rm -f "$run_dir/codex.pid"
}
trap 'cleanup; exit 0' HUP INT TERM
trap cleanup EXIT
setsid timeout "$CODEX_TIMEOUT_SECONDS" "$CODEX_BIN_DIR/codex" -a never exec --skip-git-repo-check -m "$CODEX_MODEL" -c model_reasoning_effort="$CODEX_REASONING_EFFORT" -s workspace-write < "$prompt" > "$report" 2> "$stderr" &
child_pid=\$!
printf '%s\n' "\$child_pid" > "$run_dir/codex.pid"
set +e
wait "\$child_pid"
set -e
child_pid=
rm -f "$run_dir/codex.pid"
set +e
diff -ruN "$baseline" "$workspace" > "$proposal"
diff_rc=\$?
set -e
validation=pass
if [ "\$diff_rc" -gt 1 ]; then
	validation=diff_failed
elif [ -s "$proposal" ]; then
	for script in "$workspace"/bin/rtc-*.sh; do
		[ -f "\$script" ] || continue
		bash -n "\$script" || validation=failed
	done
	for script in "$workspace"/bin/rtc-*.mjs; do
		[ -f "\$script" ] || continue
		"$NODE_BIN/node" --check "\$script" || validation=failed
	done
fi
{
	printf 'timestamp\tresult\tvalidation\tpatch\n'
	if [ -s "$proposal" ]; then
		printf '%s\tproposal_ready\t%s\t%s\n' "\$(date -u +%Y-%m-%dT%H:%M:%SZ)" "\$validation" "$proposal"
	else
		printf '%s\tno_change\t%s\t%s\n' "\$(date -u +%Y-%m-%dT%H:%M:%SZ)" "\$validation" "$proposal"
	fi
} > "$proposal_status"
EOF
			chmod +x "$runner"
			printf '%s\t%s\t%s\t%s\t%s\n' "$(date -u +%s)" "$issue_key" "$session" "$key" "$run_dir" >> "$REPAIR_LEDGER"
			log "launching structural repair session=$session key=$key evidence=$evidence"
			tmux new-session -d -s "$session" "bash '$runner'"
		done
}

write_status() {
	local status=$BASE/current-structural-watchdog-status.md
	{
		echo "# RTC Structural Watchdog Status"
		echo
		echo "- updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
		echo "- session: $SESSION"
		echo "- cycle sleep seconds: $CYCLE_SLEEP_SECONDS"
		echo "- repair cooldown seconds: $REPAIR_COOLDOWN_SECONDS"
		echo "- max active repairs: $MAX_ACTIVE_REPAIRS"
		echo "- active repairs: $(active_repair_count)"
		echo
		echo "## Findings"
		column -t -s $'\t' "$FINDINGS" 2>/dev/null | sed -n '1,80p' || sed -n '1,80p' "$FINDINGS" 2>/dev/null || true
		echo
		echo "## Runaway Scan Snapshot"
		column -t -s $'\t' "$RUNAWAY_SCAN_REPORT" 2>/dev/null | sed -n '1,40p' || sed -n '1,40p' "$RUNAWAY_SCAN_REPORT" 2>/dev/null || true
		echo
		echo "## Analysis Productivity Snapshot"
		column -t -s $'\t' "$ANALYSIS_PRODUCTIVITY_REPORT" 2>/dev/null | sed -n '1,20p' || sed -n '1,20p' "$ANALYSIS_PRODUCTIVITY_REPORT" 2>/dev/null || true
		echo
		echo "## Repair Launch Tail"
		tail -40 "$REPAIR_LEDGER" 2>/dev/null || true
		echo
		echo "## Runaway Scan Kill Tail"
		tail -20 "$RUNAWAY_SCAN_KILL_LEDGER" 2>/dev/null || true
	} > "$status.$$.tmp"
	mv "$status.$$.tmp" "$status"
}

run_once() {
	ensure_tmux_wrapper
	ensure_guard_loop || true
	sync_critical_executor_copies_if_safe || true
	cleanup_orphaned_structural_repair_processes || true
	detect_findings
	launch_repair_jobs
	write_status
}

run_loop() {
	# Keep the singleton descriptor in flock's parent process. --close prevents
	# guard restarts, tmux repairs, sleeps, and other children from inheriting it.
	if ! flock -n --close "$LOCK_FILE" "$0" run-locked; then
		log "another structural watchdog already holds $LOCK_FILE"
		exit 0
	fi
}

run_loop_locked() {
	printf '%s\n' "$$" > "$PID_FILE"
	cleanup_run_loop() {
		if [ "$(cat "$PID_FILE" 2>/dev/null || true)" = "$$" ]; then
			rm -f "$PID_FILE"
		fi
	}
	trap cleanup_run_loop EXIT
	trap 'exit 0' HUP INT TERM
	log "structural watchdog started pid=$$"
	while true; do
		# Keep errexit active inside the cycle. Calling a function on the left
		# side of `||` disables Bash's errexit behavior throughout that function.
		set +e
		(
			set -e
			run_once
		)
		cycle_rc=$?
		set -e
		if [ "$cycle_rc" -ne 0 ]; then
			log "structural watchdog pass failed rc=$cycle_rc"
		fi
		sleep "$CYCLE_SLEEP_SECONDS"
	done
}

case "${1:-start}" in
	start)
		if has_session "$SESSION"; then
			echo "$SESSION already running"
		else
			tmux new-session -d -s "$SESSION" "$0 run"
			sleep 1
			if has_session "$SESSION" && [ -s "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
				echo "$SESSION started pid=$(cat "$PID_FILE")"
			else
				log "structural watchdog failed to remain running after start request"
				echo "$SESSION failed to start; inspect $LOG" >&2
				exit 1
			fi
		fi
		;;
	run)
		run_loop
		;;
	run-locked)
		run_loop_locked
		;;
	once)
		run_once
		;;
	stop)
		tmux kill-session -t "$SESSION" 2>/dev/null || true
		if [ -f "$PID_FILE" ]; then
			pid=$(cat "$PID_FILE" 2>/dev/null || true)
			if [ -n "$pid" ]; then
				kill "$pid" 2>/dev/null || true
			fi
			rm -f "$PID_FILE"
		fi
		echo "$SESSION stopped"
		;;
	status)
		if has_session "$SESSION"; then
			echo "$SESSION running"
		else
			echo "$SESSION not running"
		fi
		sed -n '1,120p' "$BASE/current-structural-watchdog-status.md" 2>/dev/null || true
		;;
	*)
		echo "usage: $0 [start|run|once|stop|status]" >&2
		exit 2
		;;
esac
