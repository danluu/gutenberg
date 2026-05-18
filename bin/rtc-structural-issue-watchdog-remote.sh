#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN_DIR=${HOME:-/home/exouser}/.local/bin
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin
REPO=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
BASE=/media/volume/danluu-fuzz-data/rtc-structural-watchdog-20260518

CRITICAL_BASE=/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517
FINALIZATION_BASE=/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516
DEFERRED_BASE=/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516
COVERAGE_BASE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515
RESOURCE_BASE=/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516
GUARD_BASE=/media/volume/danluu-fuzz-data/rtc-jetstream-guard-20260515

SESSION=rtc-structural-issue-watchdog
FINDINGS=$BASE/current-structural-findings.tsv
EVENTS=$BASE/events.tsv
REPAIR_LEDGER=$BASE/repair-launches.tsv
LOG=$BASE/logs/structural-watchdog.log
PID_FILE=$BASE/structural-watchdog.pid
LOCK_FILE=$BASE/structural-watchdog.lock

CYCLE_SLEEP_SECONDS=${RTC_STRUCTURAL_WATCHDOG_CYCLE_SLEEP_SECONDS:-300}
REPAIR_COOLDOWN_SECONDS=${RTC_STRUCTURAL_WATCHDOG_REPAIR_COOLDOWN_SECONDS:-1800}
MAX_ACTIVE_REPAIRS=${RTC_STRUCTURAL_WATCHDOG_MAX_ACTIVE_REPAIRS:-3}
CODEX_TIMEOUT_SECONDS=${RTC_STRUCTURAL_WATCHDOG_CODEX_TIMEOUT_SECONDS:-5400}
CODEX_MODEL=${RTC_STRUCTURAL_WATCHDOG_CODEX_MODEL:-gpt-5.5}
CODEX_REASONING_EFFORT=${RTC_STRUCTURAL_WATCHDOG_CODEX_REASONING_EFFORT:-xhigh}

mkdir -p "$BASE/logs" "$BASE/runs" "$TMUX_WRAP"
touch "$EVENTS" "$REPAIR_LEDGER"
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

emit_finding() {
	local out=$1 severity=$2 component=$3 key=$4 evidence=$5 next_action=$6
	printf '%s\t%s\t%s\t%s\t%s\t%s\n' \
		"$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$severity" "$component" "$key" "$evidence" "$next_action" >> "$out"
}

check_status_freshness() {
	local out=$1 component=$2 file=$3 max_age=$4 session=$5 age
	if [ ! -s "$file" ]; then
		if [ -z "$session" ] || has_session "$session"; then
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
	find "$CRITICAL_BASE/runs" -path '*/continuations/pr07c-browser-env/classification.tsv' -type f -size +0c -printf '%T@\t%p\n' 2>/dev/null |
		sort -n |
		tail -1 |
		cut -f2-
}

check_critical_path_invariants() {
	local out=$1 status=$CRITICAL_BASE/current-critical-path-status.md log_file=$CRITICAL_BASE/logs/critical-path-pr-executor.log classification
	check_status_freshness "$out" critical-path "$status" 900 rtc-critical-path-pr-executor-loop
	if recent_log_matches "$log_file" 1800 'reconcile failed|timed out|cannot stat .*\.tmp|No such file or directory'; then
		emit_finding "$out" high "critical-path" "recent-reconcile-or-temp-error" "$log_file" "debug recent critical-path executor failure and patch the controller"
	fi
	if [ -s "$status" ] && rg -qi 'browser-env-preflight|preflight only; replay stays gated|runtime-readiness-blocked.*(success|terminal|resolved)|resolved_by_active_artifact_runtime_readiness_not_product' "$status"; then
		emit_finding "$out" high "critical-path" "passive-pr07c-regression" "$status" "keep PR07C as repair lane and reject runtime-readiness-blocked as success"
	fi
	classification=$(latest_pr07c_classification || true)
	if [ -n "$classification" ] && rg -qi 'resolved_by_active_artifact_runtime_readiness_not_product|runtime-readiness-blocked.*success' "$classification"; then
		emit_finding "$out" high "critical-path" "bad-pr07c-classification" "$classification" "reopen PR07C repair lane and invalidate passive classification"
	fi
}

check_loop_statuses() {
	local out=$1 coverage_root
	check_status_freshness "$out" finalization "$FINALIZATION_BASE/current-finalization-status.md" 1800 rtc-pr-finalization-loop
	check_status_freshness "$out" deferred-work "$DEFERRED_BASE/current-deferred-status.md" 1800 rtc-deferred-work-promotion-loop
	check_status_freshness "$out" resource-autoscaler "$RESOURCE_BASE/resource-autoscaler-status.md" 600 rtc-resource-autoscaler
	if [ -s "$COVERAGE_BASE/current-output-dir.txt" ]; then
		coverage_root=$(sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt")
		if [ -n "$coverage_root" ]; then
			check_status_freshness "$out" coverage-guided "$coverage_root/novelty-status.md" 900 rtc-coverage-guided-novelty
		fi
	fi
}

detect_findings() {
	local tmp=$FINDINGS.$$.tmp
	{
		printf 'timestamp\tseverity\tcomponent\tkey\tevidence\tnext_action\n'
	} > "$tmp"
	check_exact_sessions "$tmp"
	check_critical_path_invariants "$tmp"
	check_loop_statuses "$tmp"
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
				emit_finding "$tmp" high "guard" "repeated-restarts-$pool" "$GUARD_BASE/logs/restart-events.tsv count=$count" "debug why $pool repeatedly restarts instead of only restarting it"
			done
	fi
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
   - $CRITICAL_BASE/logs/critical-path-pr-executor.log
   - $FINALIZATION_BASE/current-finalization-status.md
   - $DEFERRED_BASE/current-deferred-status.md
   - $RESOURCE_BASE/resource-autoscaler-status.md
   - $GUARD_BASE/logs/guard.log
   - $GUARD_BASE/logs/restart-events.tsv
   - tmux -L rtc-fuzz list-sessions -F '#S'
3. If a minimal safe fix is clear, apply it to scripts under $REPO/bin or the relevant deployed /tmp launcher, run focused syntax checks, and restart only the affected loop. Do not stop broad fuzzing or unrelated loops.
4. If the fix belongs in the script branch, leave a patch or exact file list in the report so the local publisher can persist it to danluu/try/jetstream-fuzz.
5. Do not classify the issue as fixed unless the invariant that fired this finding is no longer true.
6. Write a concise durable report to: $report

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
		echo "## Repair Launch Tail"
		tail -40 "$REPAIR_LEDGER" 2>/dev/null || true
	} > "$status.$$.tmp"
	mv "$status.$$.tmp" "$status"
}

run_once() {
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
			kill "$(cat "$PID_FILE")" 2>/dev/null || true
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
