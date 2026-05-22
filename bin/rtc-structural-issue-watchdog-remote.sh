#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN_DIR=${HOME:-/home/exouser}/.local/bin
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin
REPO=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
BASE=/media/volume/danluu-fuzz-data/rtc-structural-watchdog-20260518

CRITICAL_BASE=/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517
CRITICAL_REPO_SCRIPT=$REPO/bin/rtc-critical-path-pr-executor-loop-remote.sh
CRITICAL_DEPLOYED_SCRIPT=$CRITICAL_BASE/rtc-critical-path-pr-executor-loop.sh
CRITICAL_TMP_SCRIPT=/tmp/start_rtc_critical_path_pr_executor_loop.sh
FINALIZATION_BASE=/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516
DEFERRED_BASE=/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516
PR_PROGRESS_BASE=/media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518
PRODUCTIVE_ANALYSIS_BASE=/media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521
COVERAGE_BASE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515
BENCHMARK_FEEDBACK_BASE=/media/volume/danluu-fuzz-data/rtc-benchmark-canary-feedback-20260520
RESOURCE_BASE=/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516
GUARD_BASE=/media/volume/danluu-fuzz-data/rtc-jetstream-guard-20260515
DUP_NOISE_BASE=/media/volume/danluu-fuzz-data/rtc-duplicate-noise-persona-loop-20260516
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
CG_LOWER_LEVEL_BLOCK_PARSER_GROUP=coverage-guided-lower-level-block-parser-serialization
CG_LOWER_LEVEL_BLOCK_PARSER_SESSION=rtc-coverage-guided-lower-level-block-parser-serialization

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
MAX_ACTIVE_REPAIRS=${RTC_STRUCTURAL_WATCHDOG_MAX_ACTIVE_REPAIRS:-3}
CODEX_TIMEOUT_SECONDS=${RTC_STRUCTURAL_WATCHDOG_CODEX_TIMEOUT_SECONDS:-5400}
CODEX_MODEL=${RTC_STRUCTURAL_WATCHDOG_CODEX_MODEL:-gpt-5.5}
CODEX_REASONING_EFFORT=${RTC_STRUCTURAL_WATCHDOG_CODEX_REASONING_EFFORT:-xhigh}
COVERAGE_FULL_PASS_MAX_AGE_SECONDS=${RTC_STRUCTURAL_WATCHDOG_COVERAGE_FULL_PASS_MAX_AGE_SECONDS:-1800}
COVERAGE_FULL_PASS_START_GRACE_SECONDS=${RTC_STRUCTURAL_WATCHDOG_COVERAGE_FULL_PASS_START_GRACE_SECONDS:-900}
COVERAGE_HEAP_FAILURE_WINDOW_SECONDS=${RTC_STRUCTURAL_WATCHDOG_COVERAGE_HEAP_FAILURE_WINDOW_SECONDS:-1800}
RUNAWAY_SCAN_MIN_AGE_SECONDS=${RTC_STRUCTURAL_WATCHDOG_RUNAWAY_SCAN_MIN_AGE_SECONDS:-1800}
RUNAWAY_SCAN_TARGET_ROOTS=${RTC_STRUCTURAL_WATCHDOG_RUNAWAY_SCAN_ROOTS:-/media/volume/danluu-fuzz-data:/home/exouser/.codex}
TERMINATE_RUNAWAY_RG=${RTC_STRUCTURAL_WATCHDOG_TERMINATE_RUNAWAY_RG:-1}
TERMINATE_RUNAWAY_TEXT_SEARCH=${RTC_STRUCTURAL_WATCHDOG_TERMINATE_RUNAWAY_TEXT_SEARCH:-$TERMINATE_RUNAWAY_RG}
ANALYSIS_LOW_WORKER_MAX_LOAD_PER_CORE=${RTC_STRUCTURAL_WATCHDOG_ANALYSIS_LOW_WORKER_MAX_LOAD_PER_CORE:-1.0}

mkdir -p "$BASE/logs" "$BASE/runs" "$TMUX_WRAP"
touch "$EVENTS" "$REPAIR_LEDGER" "$RUNAWAY_SCAN_KILL_LEDGER"
cat > "$TMUX_WRAP/tmux" <<'SH'
#!/usr/bin/env bash
exec /usr/bin/tmux -L rtc-fuzz "$@"
SH
chmod +x "$TMUX_WRAP/tmux"
export PATH="$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:$PATH"

log() {
	printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$LOG"
}

tmux_sessions() {
	tmux list-sessions -F '#S' 2>/dev/null || true
}

has_session() {
	tmux_sessions | grep -Fxq "$1"
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
				if (tolower($i) == "status") status_col = i
			}
			next
		}
		NR > 1 {
			status = status_col ? tolower($status_col) : ""
			line = tolower($0)
			if (status ~ /promotion_blocked|known_bad_canary/ || line ~ /(^|\t)(promotion_blocked|known_bad_canary)(\t|$)/) {
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
				kill "$pid" 2>/dev/null || true
				printf '%s\t%s\t%s\t%s\t%s\n' "$(date -u +%s)" "$pid" "$age" "$pcpu" "$evidence" >> "$RUNAWAY_SCAN_KILL_LEDGER"
				emit_finding "$out" high "structural-scan" "runaway-text-search-terminated" \
					"pid=$pid age=${age}s cpu=${pcpu}% mem=${pmem}% args=$evidence" \
					"replace the broad text-search source with artifact-index or bounded current-run scans; do not let historical rg/grep scans run indefinitely"
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

eligible_structural_repair_count() {
	local findings=$1 count=0 _ts severity component key evidence next_action issue_key
	while IFS=$'\t' read -r _ts severity component key evidence next_action; do
		[ "$severity" = "high" ] || continue
		[ -n "$key" ] || continue
		issue_key=$(hash_key "$component:$key:$evidence")
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
	codex_workers=$({ pgrep -af 'codex .*exec|/codex .*exec|codex -a .*exec' 2>/dev/null || true; } | awk 'END { print NR + 0 }')
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

check_exact_sessions() {
	local out=$1 name prefix_matches
	for name in \
		rtc-coverage-guided-novelty \
		rtc-coverage-guided-watchdog \
		rtc-fuzz-level-mix-persona-loop \
		rtc-fuzz-level-mix-persona-loop-watchdog \
		rtc-duplicate-noise-persona-loop \
		rtc-deferred-work-promotion-loop \
		rtc-pr-progress-controller-loop \
		rtc-pr-finalization-loop \
		rtc-critical-path-pr-executor-loop \
		rtc-resource-autoscaler; do
		if has_session "$name"; then
			continue
		fi
		prefix_matches=$(tmux_sessions | awk -v name="$name" 'index($0, name) == 1 { print }' | paste -sd, -)
		if [ -n "$prefix_matches" ]; then
			emit_finding "$out" high "tmux" "prefix-session-mask-$name" "$prefix_matches" "replace prefix session checks with exact-session checks and restart missing $name"
		fi
	done
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

critical_script_sha() {
	local script=$1
	if [ -s "$script" ]; then
		sha256sum "$script" 2>/dev/null | awk '{ print $1 }'
	else
		printf 'missing'
	fi
}

sync_critical_executor_copies_if_safe() {
	local changed=0 target
	critical_script_has_pr07c_terminal_support "$CRITICAL_REPO_SCRIPT" || return 1
	critical_script_has_benchmark_refresh_support "$CRITICAL_REPO_SCRIPT" || return 1
	bash -n "$CRITICAL_REPO_SCRIPT" >/dev/null 2>&1 || return 1
	for target in "$CRITICAL_DEPLOYED_SCRIPT" "$CRITICAL_TMP_SCRIPT"; do
		if [ ! -s "$target" ] || ! cmp -s "$CRITICAL_REPO_SCRIPT" "$target"; then
			cp "$CRITICAL_REPO_SCRIPT" "$target"
			chmod +x "$target"
			changed=1
			log "synced critical executor copy target=$target from=$CRITICAL_REPO_SCRIPT"
		fi
	done
	if [ "$changed" = 1 ] && has_session rtc-critical-path-pr-executor-loop; then
		"$CRITICAL_DEPLOYED_SCRIPT" stop >> "$LOG" 2>&1 || true
		"$CRITICAL_DEPLOYED_SCRIPT" start >> "$LOG" 2>&1 || true
		log "restarted critical-path executor after script-copy sync"
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

check_benchmark_canary_promotion_invariants() {
	local out=$1 active classification status_line queue_line exact_green_line
	benchmark_promotion_blocked || return
	active=$(benchmark_exact_stack_repair_active || true)
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
	status_line=$(awk -F '\t' '$1 == "benchmark-canary-fuzzer-gap" { print; found = 1 } END { exit found ? 0 : 1 }' "$CRITICAL_BASE/blockers.tsv" 2>/dev/null || true)
	queue_line=$(awk -F '\t' '$1 == "job-benchmark-canary-fuzzer-gap" { print; found = 1 } END { exit found ? 0 : 1 }' "$CRITICAL_BASE/queue.tsv" 2>/dev/null || true)
	if printf '%s\n%s\n' "$status_line" "$queue_line" | rg -q 'coverage-gap-repair|coverage-promotion'; then
		emit_finding "$out" high "benchmark-canary" "promotion-blocker-modeled-as-coverage-only" \
			"blocker=${status_line:-missing} queue=${queue_line:-missing}" \
			"model promotion_blocked feedback as exact-stack-promotion/exact-stack-repair and prioritize it ahead of reducer work"
	fi
	exact_green_line=$(awk -F '\t' 'NR > 1 && $2 == "exact_stack_green" { print; found = 1 } END { exit found ? 0 : 1 }' "$classification" 2>/dev/null || true)
	if [ -n "$exact_green_line" ] && benchmark_promotion_blocked; then
		emit_finding "$out" high "benchmark-canary" "exact-green-contradicts-current-feedback" \
			"classification=$classification green=$exact_green_line feedback=$BENCHMARK_FEEDBACK_BASE/current-feedback.tsv" \
			"refresh current-feedback.tsv from exact-stack rerun or reject stale exact_stack_green classification"
	fi
}

check_loop_statuses() {
	local out=$1 coverage_root
	check_status_freshness "$out" finalization "$FINALIZATION_BASE/current-finalization-status.md" 1800 rtc-pr-finalization-loop
	check_status_freshness "$out" deferred-work "$DEFERRED_BASE/current-deferred-status.md" 1800 rtc-deferred-work-promotion-loop
	check_status_freshness "$out" pr-progress "$PR_PROGRESS_BASE/current-pr-progress-controller-status.md" 900 rtc-pr-progress-controller-loop
	check_status_freshness "$out" productive-analysis "$PRODUCTIVE_ANALYSIS_BASE/current-status.md" 1800 rtc-productive-analysis-loop
	check_status_freshness "$out" resource-autoscaler "$RESOURCE_BASE/resource-autoscaler-status.md" 600 rtc-resource-autoscaler
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
			if (signatures >= 3 && top_share >= 0.50) {
				printf "current\t%d\t%.4f\t%d\t%s\n", signatures, top_share, likely, top_families
			}
			if (raw_signatures >= 3 && raw_top_share >= 0.50) {
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
	if [ -f "$CG_LOWER_LEVEL_B64_HOLD_FILE" ] &&
		grep -Fq "$CG_LOWER_LEVEL_B64_REPLACEMENT_GROUP" "$CG_LOWER_LEVEL_B64_HOLD_FILE"; then
		if [ -f "$CG_LOWER_LEVEL_B64_REPLACEMENT_HOLD_FILE" ] &&
			grep -Eq "$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_GROUP|rtc-table-query-array-crdt|table-query-array" "$CG_LOWER_LEVEL_B64_REPLACEMENT_HOLD_FILE"; then
			if [ -f "$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_HOLD_FILE" ] &&
				grep -Eq "$CG_LOWER_LEVEL_BLOCK_PARSER_GROUP|rtc-block-parser-serialization|block-parser|parser-serialization" "$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_HOLD_FILE"; then
				has_session "$CG_LOWER_LEVEL_BLOCK_PARSER_SESSION"
				return
			fi
			has_session "$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_SESSION"
			return
		fi
		has_session "$CG_LOWER_LEVEL_B64_REPLACEMENT_SESSION"
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
			has_session rtc-fuzz-strict-expansion &&
				has_session rtc-fuzz-strict-expansion-watchdog &&
				has_session rtc-fuzz-strict-expansion-analysis
			;;
		focused)
			has_session rtc-focused-shards &&
				has_session rtc-focused-shards-watchdog &&
				has_session rtc-focused-shards-analysis
			;;
		gap-booster)
			has_session rtc-gap-booster &&
				has_session rtc-gap-booster-watchdog &&
				has_session rtc-gap-booster-analysis
			;;
		lower-level)
			has_session rtc-lower-level-fuzz-loop
			;;
		cg-lower-level)
			coverage_guided_lower_level_satisfied
			;;
		duplicate-noise)
			has_session rtc-duplicate-noise-persona-loop
			;;
		level-mix)
			has_session rtc-fuzz-level-mix-persona-loop &&
				has_session rtc-fuzz-level-mix-persona-loop-watchdog
			;;
		native-protocol)
			has_session rtc-native-harness-persona-loop &&
				has_session rtc-protocol-server-persona-loop
			;;
		asserts)
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
	check_critical_path_invariants "$tmp"
	check_benchmark_canary_promotion_invariants "$tmp"
	check_loop_statuses "$tmp"
	if [ -s "$COVERAGE_BASE/current-output-dir.txt" ]; then
		coverage_root=$(sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt")
		check_coverage_supervisor_root_agreement "$tmp" "$coverage_root"
		check_coverage_novelty_full_pass_health "$tmp" "$coverage_root"
	fi
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
PROMPT
}

launch_repair_jobs() {
	local line severity component key evidence next_action issue_key session ts run_dir prompt report stderr runner
	awk -F '\t' 'NR > 1 && $2 == "high" { print }' "$FINDINGS" |
		while IFS=$'\t' read -r _ts severity component key evidence next_action; do
			[ -n "$key" ] || continue
			issue_key=$(hash_key "$component:$key:$evidence")
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
