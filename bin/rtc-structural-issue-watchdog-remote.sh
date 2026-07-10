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
PRODUCTIVE_ANALYSIS_BASE=/media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521
COVERAGE_BASE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515
BENCHMARK_FEEDBACK_BASE=/media/volume/danluu-fuzz-data/rtc-benchmark-canary-feedback-20260520
RESOURCE_BASE=/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516
GUARD_BASE=/media/volume/danluu-fuzz-data/rtc-jetstream-guard-20260515
CANDIDATE_REPO=/media/volume/danluu-fuzz-data/rtc-all-merged-fuzz-20260526T195420Z/repo
CANDIDATE_BRANCH=js2/all-merged-rebased-20260701
LOCAL_PUBLISH_LEDGER=$FINALIZATION_BASE/latest-local-publish-manifest.tsv
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
CODEX_MODEL=${RTC_STRUCTURAL_WATCHDOG_CODEX_MODEL:-gpt-5.5}
CODEX_REASONING_EFFORT=${RTC_STRUCTURAL_WATCHDOG_CODEX_REASONING_EFFORT:-xhigh}
COVERAGE_FULL_PASS_MAX_AGE_SECONDS=${RTC_STRUCTURAL_WATCHDOG_COVERAGE_FULL_PASS_MAX_AGE_SECONDS:-1800}
COVERAGE_FULL_PASS_START_GRACE_SECONDS=${RTC_STRUCTURAL_WATCHDOG_COVERAGE_FULL_PASS_START_GRACE_SECONDS:-900}
COVERAGE_HEAP_FAILURE_WINDOW_SECONDS=${RTC_STRUCTURAL_WATCHDOG_COVERAGE_HEAP_FAILURE_WINDOW_SECONDS:-1800}
REPAIR_PUBLICATION_GRACE_SECONDS=${RTC_STRUCTURAL_WATCHDOG_REPAIR_PUBLICATION_GRACE_SECONDS:-600}
PROMOTION_SCHEDULING_START_GRACE_SECONDS=${RTC_STRUCTURAL_WATCHDOG_PROMOTION_SCHEDULING_START_GRACE_SECONDS:-300}
RUNAWAY_SCAN_MIN_AGE_SECONDS=${RTC_STRUCTURAL_WATCHDOG_RUNAWAY_SCAN_MIN_AGE_SECONDS:-1800}
RUNAWAY_SCAN_TARGET_ROOTS=${RTC_STRUCTURAL_WATCHDOG_RUNAWAY_SCAN_ROOTS:-/media/volume/danluu-fuzz-data:/home/exouser/.codex}
TERMINATE_RUNAWAY_RG=${RTC_STRUCTURAL_WATCHDOG_TERMINATE_RUNAWAY_RG:-1}
TERMINATE_RUNAWAY_TEXT_SEARCH=${RTC_STRUCTURAL_WATCHDOG_TERMINATE_RUNAWAY_TEXT_SEARCH:-$TERMINATE_RUNAWAY_RG}
TERMINATE_RUNAWAY_SCANS=${RTC_STRUCTURAL_WATCHDOG_TERMINATE_RUNAWAY_SCANS:-1}
ANALYSIS_LOW_WORKER_MAX_LOAD_PER_CORE=${RTC_STRUCTURAL_WATCHDOG_ANALYSIS_LOW_WORKER_MAX_LOAD_PER_CORE:-1.0}
ANALYSIS_MAX_CODEX_WORKERS=${RTC_STRUCTURAL_WATCHDOG_ANALYSIS_MAX_CODEX_WORKERS:-8}
REQUIRE_LEVEL_MIX_REVIEW=${RTC_JETSTREAM_ENABLE_LEVEL_MIX_REVIEW:-0}
REQUIRE_DUPLICATE_NOISE_REVIEW=${RTC_JETSTREAM_ENABLE_DUPLICATE_NOISE_REVIEW:-1}
REQUIRE_NATIVE_PROTOCOL_REVIEW=${RTC_JETSTREAM_ENABLE_NATIVE_PROTOCOL_REVIEW:-0}
REQUIRE_ASSERT_REVIEW=${RTC_JETSTREAM_ENABLE_ASSERT_REVIEW:-0}

mkdir -p "$BASE/logs" "$BASE/runs" "$TMUX_WRAP"
touch "$EVENTS" "$REPAIR_LEDGER" "$RUNAWAY_SCAN_KILL_LEDGER"
ensure_tmux_wrapper() {
	local wrapper="$TMUX_WRAP/tmux"
	local tmp
	tmp=$(mktemp "$TMUX_WRAP/tmux.XXXXXX")
	cat > "$tmp" <<'SH'
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
	chmod +x "$tmp"
	if [ -f "$wrapper" ] && cmp -s "$tmp" "$wrapper"; then
		rm -f "$tmp"
	else
		mv -f "$tmp" "$wrapper"
	fi
}
ensure_tmux_wrapper
export PATH="$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:$PATH"

log() {
	printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$LOG"
}

terminate_runaway_pid() {
	local pid=$1
	pkill -TERM -P "$pid" 2>/dev/null || true
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
	ps -ww -eo pid=,ppid=,etimes=,pcpu=,pmem=,comm=,args= > "$ps_tmp" 2>/dev/null || : > "$ps_tmp"
	python3 - "$RUNAWAY_SCAN_MIN_AGE_SECONDS" "$RUNAWAY_SCAN_TARGET_ROOTS" "$ps_tmp" > "$tmp" <<'PY'
import os
import re
import sys

min_age = int(sys.argv[1])
roots = [root for root in sys.argv[2].split(":") if root]
ps_path = sys.argv[3]
scan_names = {"rg", "grep", "egrep", "fgrep", "find", "du"}
now = os.popen("date -u +%Y-%m-%dT%H:%M:%SZ").read().strip()

print("timestamp\tseverity\tpid\tppid\tage_seconds\tcpu_percent\tmem_percent\tcommand\targs")
for raw in open(ps_path, encoding="utf-8", errors="replace"):
    line = raw.strip()
    if not line:
        continue
    parts = line.split(None, 6)
    if len(parts) < 7:
        continue
    pid, ppid, age_s, cpu_s, mem_s, comm, args = parts
    try:
        age = int(float(age_s))
        cpu = float(cpu_s)
        mem = float(mem_s)
    except ValueError:
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
					return
				fi
			fi
			emit_finding "$out" high "$component" "missing-status" "$file" "restore status generation for $component"
		fi
		return
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
	[ -n "$current_root" ] || return
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

check_deadline_budget_consistency() {
	local out=$1 root run_script cap current_target current_max desired_line desired_target desired_max
	root=$(sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)
	run_script=${root:+$root/run-monitor.sh}
	[ -n "$run_script" ] && [ -s "$run_script" ] || return
	cap=$(sed -n "s/^export RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP='\([^']*\)'.*/\1/p" "$run_script" | tail -1)
	[ "$cap" = 1 ] || return
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
	if [ "$missing_support" = 1 ]; then
		emit_finding "$out" high "critical-path" "critical-executor-required-support-missing" \
			"repo=$CRITICAL_REPO_SCRIPT sha=$repo_sha deployed=$CRITICAL_DEPLOYED_SCRIPT sha=$deployed_sha tmp=$CRITICAL_TMP_SCRIPT sha=$tmp_sha" \
			"patch all critical-path executor copies so repaired_ready closes pr07c-browser-env and benchmark refresh handoffs are launched, then restart rtc-critical-path-pr-executor-loop"
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

check_benchmark_canary_promotion_invariants() {
	local out=$1 active classification status_line queue_line exact_green_line coverage_root coverage_status coverage_root_age unscheduled_groups paused_groups
	benchmark_promotion_blocked || return
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
				value("supervisor_status") ~ /^(paused-startup-stall|paused-infra-startup|paused-product-failure|disabled)$/ {
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
	[ -n "$coverage_root" ] && [ -d "$coverage_root" ] || return
	age=$(file_age_seconds "$COVERAGE_BASE/current-output-dir.txt" || printf 999999)
	if [ "$age" -lt 420 ]; then
		return
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
		return
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

check_promotion_preflight_relaunch_loops() {
	local out=$1 coverage_root=$2 state_path status_path loops
	state_path=$coverage_root/supervisor-state.json
	status_path=$coverage_root/benchmark-canary-coverage-status.tsv
	[ -s "$state_path" ] && [ -s "$status_path" ] || return
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

check_supervisor_disabled_cleanup_memoization() {
	local out=$1 coverage_root=$2 state_path missing
	state_path=$coverage_root/supervisor-state.json
	[ -s "$state_path" ] || return
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
	[ -s "$state_path" ] && [ -s "$groups_path" ] || return
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
	[ -s "$state_path" ] && [ -s "$groups_path" ] || return
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
	[ -s "$state_path" ] && [ -s "$groups_path" ] || return
	drift=$(node - "$state_path" "$groups_path" "$COVERAGE_BASE/candidate-source" <<'NODE'
const fs = require( 'fs' );
const crypto = require( 'crypto' );
const path = require( 'path' );
const state = JSON.parse( fs.readFileSync( process.argv[ 2 ], 'utf8' ) );
const groups = JSON.parse( fs.readFileSync( process.argv[ 3 ], 'utf8' ) );
const candidate = process.argv[ 4 ];
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
	let manifestSignature = 'missing';
	try {
		manifestSignature = JSON.parse(
			fs.readFileSync(
				path.join( group.repoRoot, '.js2-harness-overlay-manifest.json' ),
				'utf8'
			)
		).signature ?? 'missing';
	} catch {}
	const mismatches = criticalFiles.filter(
		( relative ) =>
			digest( path.join( group.repoRoot, relative ) ) !== expected.get( relative )
	);
	if (
		( group.harnessOverlaySignature &&
			manifestSignature !== group.harnessOverlaySignature ) ||
		mismatches.length > 0
	) {
		process.stdout.write(
			`${ group.name }:manifest=${ manifestSignature }:expected=${
				group.harnessOverlaySignature ?? 'unspecified'
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
	local out=$1 issues
	issues=$(node <<'NODE'
const { execFileSync } = require( 'child_process' );
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
const watchers = rows.filter( ( row ) =>
	/rtc-browser-fuzz-triage-watcher[.]mjs .*--gate-only/.test( row.args )
);
for ( const watcher of watchers ) {
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
	if ( watcher.age >= 60 || codexDescendants.length > 0 ) {
		process.stdout.write(
			`pid=${ watcher.pid }:age=${ watcher.age }:codex=${ codexDescendants
				.map( ( row ) => row.pid )
				.join( ',' ) || 'none' }\n`
		);
	}
}
for ( const row of rows ) {
	if (
		/(?:^|[/ ])codex(?: |$).*\bexec\b/.test( row.args ) &&
		row.args.includes( '.triage-watcher/signatures/' ) &&
		( row.ppid === 1 || ! byPid.has( row.ppid ) )
	) {
		process.stdout.write( `orphan-codex=${ row.pid }:age=${ row.age }\n` );
	}
}
NODE
	)
	if [ -n "$issues" ]; then
		emit_finding "$out" high "coverage-guided" "gate-only-triage-launched-analysis" \
			"processes=$(printf '%s' "$issues" | paste -sd, -)" \
			"make --gate-only update signature state without launching Codex, bound refresh concurrency and timeout, terminate the complete gate-refresh process group on timeout, and retire orphaned gate-refresh Codex descendants"
	fi
}

check_coverage_novelty_full_pass_health() {
	local out=$1 coverage_root=$2 state_path output_age now pass_info last_full last_updated last_triage pass_epoch pass_age
	[ -n "$coverage_root" ] && [ -d "$coverage_root" ] || return
	state_path="$coverage_root/novelty-state.json"
	output_age=$(file_age_seconds "$coverage_root" || printf 999999)
	if [ ! -s "$state_path" ]; then
		if [ "$output_age" -gt "$COVERAGE_FULL_PASS_START_GRACE_SECONDS" ]; then
			emit_finding "$out" high "coverage-guided" "missing-novelty-state-for-full-pass" \
				"$state_path output=$coverage_root" \
				"restore novelty-state generation and make the session watchdog require completed full novelty passes"
		fi
		return
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
	[ -s "$COVERAGE_BASE/current-output-dir.txt" ] || return
	coverage_root=$(sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt")
	[ -n "$coverage_root" ] || return
	status="$coverage_root/novelty-status.md"
	[ -s "$status" ] || return
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
	check_coverage_process_ownership "$tmp"
	check_deadline_budget_consistency "$tmp"
	check_critical_path_invariants "$tmp"
	check_repair_publication_progress "$tmp"
	check_benchmark_canary_promotion_invariants "$tmp"
	check_loop_statuses "$tmp"
	if [ -s "$COVERAGE_BASE/current-output-dir.txt" ]; then
		coverage_root=$(sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt")
		check_coverage_supervisor_root_agreement "$tmp" "$coverage_root"
		check_supervisor_disabled_cleanup_memoization "$tmp" "$coverage_root"
		check_product_failure_quarantine_slots "$tmp" "$coverage_root"
		check_published_startup_stall_holds "$tmp" "$coverage_root"
		check_published_group_harness_drift "$tmp" "$coverage_root"
		check_promotion_preflight_relaunch_loops "$tmp" "$coverage_root"
		check_coverage_novelty_full_pass_health "$tmp" "$coverage_root"
	fi
	check_gate_only_triage_processes "$tmp"
	check_unknown_action_profile_startup_failures "$tmp"
	check_current_run_duplicate_noise "$tmp"
	if recent_log_matches "$GUARD_BASE/logs/guard.log" 1800 'restart requested pool=.*reason='; then
		awk -F '\t' -v cutoff=$(( $(date -u +%s) - 1800 )) '
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
	local prompt=$1 report=$2 finding_line=$3 key=$4
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
3. If a minimal safe fix is clear, apply it to scripts under $REPO/bin and the relevant deployed /tmp launcher, run focused syntax checks, and restart only the affected loop. Do not stop broad fuzzing or unrelated loops.
4. For critical-path executor issues, keep the repo script, deployed script, and /tmp guard restart script synchronized unless evidence proves one copy is intentionally different.
5. If the fix belongs in the script branch, leave a patch or exact file list in the report so the local publisher can persist it to danluu/try/jetstream-fuzz.
6. Do not classify the issue as fixed unless the invariant that fired this finding is no longer true.
7. For runaway scan findings, identify the controller or graph path that launched the scan and replace it with the artifact index, a current-run-only scan, or a bounded command. Do not just terminate the process.
8. For analysis-productivity findings, decide whether more Codex analysis would actually advance PR/fuzzer work. If yes, fix the admission/cooldown/session-accounting problem and launch targeted unblock analysis. If no, write the exact reason and the invariant that should prevent future false alarms.
9. For benchmark-canary promotion findings, keep coverage_present separate from exact_stack_green. Patch the critical-path executor or PR/finalization controller if coverage_repaired can close a promotion_blocked exact-stack row.
10. Write a concise durable report to: $report

Guardrails:
- Do not use behavior-disabling flags such as DISABLE_SYNC_FAULTS, DISABLE_PARSER_STRESS, DISABLE_REVISION_RESTORE, DISABLE_RELOAD, or DISABLE_RANDOM_RELOAD.
- Do not run broad browser fuzzing from this repair job.
- Prefer bounded shell probes and exact source edits.
- Do not run historical or aggregate scans such as `du -shx` over /media/volume/danluu-fuzz-data, /tmp, /var/tmp, /home/exouser, the repo root, or old runs. Use current status files, launch ledgers, the artifact index, current-output-dir, or one exact current-run path instead.
- If size or disk evidence is necessary, prefer `df -h` or `stat` on exact files. Any `du`, `find`, `rg`, or `grep` must be limited to one current-run/artifact path and bounded with `timeout`, `-maxdepth`, `-m`, or an equivalent small script.
- For runaway scan findings, record the controller/session path that launched the scan, patch that path to use the bounded/indexed probe, then verify $RUNAWAY_SCAN_REPORT no longer lists the process.
PROMPT
}

launch_repair_jobs() {
	local line severity component key evidence next_action issue_key session ts run_dir prompt report stderr runner
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
			mkdir -p "$run_dir"
			prompt="$run_dir/prompt.md"
			report="$run_dir/report.md"
			stderr="$run_dir/stderr.log"
			runner="$run_dir/run.sh"
			line=$(printf '%s\t%s\t%s\t%s\t%s\t%s' "$_ts" "$severity" "$component" "$key" "$evidence" "$next_action")
			write_repair_prompt "$prompt" "$report" "$line" "$issue_key"
			cat > "$runner" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "$REPO"
timeout "$CODEX_TIMEOUT_SECONDS" "$CODEX_BIN_DIR/codex" -a never exec --skip-git-repo-check -m "$CODEX_MODEL" -c model_reasoning_effort="$CODEX_REASONING_EFFORT" -s danger-full-access < "$prompt" > "$report" 2> "$stderr" || true
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
	sync_critical_executor_copies_if_safe || true
	detect_findings
	launch_repair_jobs
	write_status
}

run_loop() {
	exec 9>"$LOCK_FILE"
	if ! flock -n 9; then
		log "another structural watchdog already holds $LOCK_FILE"
		exit 0
	fi
	printf '%s\n' "$$" > "$PID_FILE"
	trap 'rm -f "$PID_FILE"' EXIT
	log "structural watchdog started pid=$$"
	while true; do
		run_once || log "structural watchdog pass failed"
		sleep "$CYCLE_SLEEP_SECONDS"
	done
}

case "${1:-start}" in
	start)
		if has_session "$SESSION"; then
			echo "$SESSION already running"
		else
			tmux new-session -d -s "$SESSION" "$0 run"
			echo "$SESSION started"
		fi
		;;
	run)
		run_loop
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
