#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN=${CODEX_BIN:-/home/exouser/.npm-global/bin/codex}
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin
SRC=${RTC_PRODUCTIVE_ANALYSIS_SRC:-/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo}
BASE=${RTC_PRODUCTIVE_ANALYSIS_BASE:-/media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521}
CRITICAL_BASE=${RTC_PRODUCTIVE_ANALYSIS_CRITICAL_BASE:-/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517}
PR_PROGRESS_BASE=${RTC_PRODUCTIVE_ANALYSIS_PR_PROGRESS_BASE:-/media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518}
DEFERRED_BASE=${RTC_PRODUCTIVE_ANALYSIS_DEFERRED_BASE:-/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516}
COVERAGE_BASE=${RTC_PRODUCTIVE_ANALYSIS_COVERAGE_BASE:-/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515}
LEVEL_MIX_BASE=${RTC_PRODUCTIVE_ANALYSIS_LEVEL_MIX_BASE:-/media/volume/danluu-fuzz-data/rtc-fuzz-level-mix-persona-loop-20260516}
BENCHMARK_FEEDBACK_BASE=${RTC_PRODUCTIVE_ANALYSIS_BENCHMARK_FEEDBACK_BASE:-/media/volume/danluu-fuzz-data/rtc-benchmark-canary-feedback-20260520}
RESOURCE_BASE=${RTC_PRODUCTIVE_ANALYSIS_RESOURCE_BASE:-/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516}
STRUCTURAL_BASE=${RTC_PRODUCTIVE_ANALYSIS_STRUCTURAL_BASE:-/media/volume/danluu-fuzz-data/rtc-structural-issue-watchdog-20260521}
ARTIFACT_INDEX_BASE=${RTC_PRODUCTIVE_ANALYSIS_ARTIFACT_INDEX_BASE:-/media/volume/danluu-fuzz-data/rtc-artifact-index-20260518}

SESSION=rtc-productive-analysis-loop
STATUS=$BASE/current-status.md
REPORT=$BASE/current-report.md
ACTIONS=$BASE/current-actions.tsv
CRITICAL_FEEDBACK_MD=$BASE/critical-path-feedback.md
CRITICAL_FEEDBACK_TSV=$BASE/critical-path-feedback.tsv
EVENTS=$BASE/events.ndjson
LOG=$BASE/logs/productive-analysis-loop.log
LOCK=$BASE/productive-analysis.lock
PID_FILE=$BASE/productive-analysis.pid

CYCLE_SLEEP_SECONDS=${RTC_PRODUCTIVE_ANALYSIS_CYCLE_SLEEP_SECONDS:-600}
MAX_ACTIVE_LANES=${RTC_PRODUCTIVE_ANALYSIS_MAX_ACTIVE_LANES:-4}
MIN_LANE_INTERVAL_SECONDS=${RTC_PRODUCTIVE_ANALYSIS_MIN_LANE_INTERVAL_SECONDS:-900}
MODEL=${RTC_PRODUCTIVE_ANALYSIS_MODEL:-gpt-5.5}
REASONING=${RTC_PRODUCTIVE_ANALYSIS_REASONING:-xhigh}
CODEX_TIMEOUT_SECONDS=${RTC_PRODUCTIVE_ANALYSIS_CODEX_TIMEOUT_SECONDS:-3600}

LANES=(
	"pr-blocker-router"
	"benchmark-to-fuzz-closure"
	"deferred-family-reducer"
	"lower-level-yield-retarget"
)

mkdir -p "$BASE/logs" "$BASE/runs" "$TMUX_WRAP"
cat > "$TMUX_WRAP/tmux" <<'SH'
#!/usr/bin/env bash
exec /usr/bin/tmux -L rtc-fuzz "$@"
SH
chmod +x "$TMUX_WRAP/tmux"
export PATH="$TMUX_WRAP:$NODE_BIN:$PATH"
touch "$EVENTS"

log() {
	printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$LOG"
}

json_event() {
	local type=$1 message=$2
	printf '{"ts":"%s","type":"%s","message":"%s"}\n' \
		"$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
		"$(printf '%s' "$type" | sed 's/"/\\"/g')" \
		"$(printf '%s' "$message" | sed 's/"/\\"/g')" >> "$EVENTS"
}

slugify() {
	printf '%s' "$1" | tr '[:upper:] _/' '[:lower:]---' | tr -cd 'a-z0-9-' | sed 's/--*/-/g; s/^-//; s/-$//'
}

has_session() {
	tmux has-session -t "$1" 2>/dev/null
}

active_lane_count() {
	tmux list-sessions -F '#S' 2>/dev/null | awk '/^rtc-productive-lane-/ { n++ } END { print n + 0 }'
}

file_age_seconds() {
	local file=$1 now mtime
	[ -e "$file" ] || {
		printf '999999'
		return
	}
	now=$(date +%s)
	mtime=$(stat -c %Y "$file" 2>/dev/null || printf 0)
	printf '%s' "$(( now - mtime ))"
}

lane_recently_launched() {
	local lane=$1 marker=$BASE/logs/last-launch-$(slugify "$lane").epoch now last
	[ -f "$marker" ] || return 1
	now=$(date +%s)
	last=$(sed -n '1p' "$marker" 2>/dev/null || printf 0)
	[ "$(( now - last ))" -lt "$MIN_LANE_INTERVAL_SECONDS" ]
}

mark_lane_launched() {
	local lane=$1 marker=$BASE/logs/last-launch-$(slugify "$lane").epoch
	date +%s > "$marker"
}

latest_coverage_root() {
	if [ -s "$COVERAGE_BASE/current-output-dir.txt" ]; then
		sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt"
	else
		ls -td "$COVERAGE_BASE"/run-* 2>/dev/null | head -1 || true
	fi
}

bounded_file() {
	local title=$1 file=$2 lines=${3:-160}
	echo
	echo "## $title"
	if [ -s "$file" ]; then
		sed -n "1,${lines}p" "$file"
	else
		echo "missing or empty: $file"
	fi
}

write_context() {
	local run_dir=$1 context=$run_dir/context.md coverage_root
	coverage_root=$(latest_coverage_root)
	{
		echo "# RTC Productive Analysis Context"
		echo
		echo "- generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
		echo "- source repo: $SRC"
		echo "- loop base: $BASE"
		echo "- contract: lane reports must emit actions that are either directly consumed by a controller or explicitly marked no-action."
		echo
		bounded_file "Critical Path Status" "$CRITICAL_BASE/current-critical-path-status.md" 200
		bounded_file "Critical Path Blockers" "$CRITICAL_BASE/blockers.tsv" 120
		bounded_file "Critical Path Queue" "$CRITICAL_BASE/queue.tsv" 160
		bounded_file "PR Progress Status" "$PR_PROGRESS_BASE/current-pr-progress-controller-status.md" 180
		bounded_file "PR Progress Decisions" "$PR_PROGRESS_BASE/current-control-decisions.tsv" 120
		bounded_file "Deferred Status" "$DEFERRED_BASE/current-deferred-status.md" 180
		bounded_file "Deferred Queue" "$DEFERRED_BASE/current-deferred-queue.tsv" 160
		bounded_file "Benchmark Canary Feedback" "$BENCHMARK_FEEDBACK_BASE/current-feedback.md" 220
		bounded_file "Benchmark Canary Feedback TSV" "$BENCHMARK_FEEDBACK_BASE/current-feedback.tsv" 80
		bounded_file "Resource Autoscaler" "$RESOURCE_BASE/resource-autoscaler-status.md" 160
		bounded_file "Structural Watchdog" "$STRUCTURAL_BASE/current-structural-status.md" 200
		bounded_file "Artifact Index Summary" "$ARTIFACT_INDEX_BASE/current-summary.md" 140
		if [ -n "$coverage_root" ]; then
			bounded_file "Current Coverage Novelty" "$coverage_root/novelty-status.md" 220
		else
			echo
			echo "## Current Coverage Novelty"
			echo "missing coverage root"
		fi
		bounded_file "Level Mix Current Status" "$LEVEL_MIX_BASE/current-status.md" 180
		echo
		echo "## Tmux Sessions"
		tmux list-sessions -F '#S' 2>/dev/null | sed -n '1,220p' || true
	} > "$context.tmp"
	mv "$context.tmp" "$context"
}

write_lane_prompt() {
	local lane=$1 context=$2 actions=$3 report=$4 prompt=$5
	cat > "$prompt" <<PROMPT
You are running the RTC productive-analysis lane: $lane.

Read:
- $context

This is a control loop, not a status-writing loop. Your output must be usable by
existing controllers. Prefer one or two concrete high-leverage actions over a
long list. If the best answer is "do nothing", write no action rows and explain
why in the report.

Write exactly these two artifacts:
- $actions
- $report

The TSV must have this header:
generated_at	action_id	target_loop	priority	action_kind	family_or_pr	evidence_path	next_action	control_path

Allowed target_loop values:
- critical-path
- pr-progress
- deferred
- coverage
- level-mix
- lower-level
- local-publisher

Allowed priority values: P0, P1, high, medium, low.

Only emit rows whose next_action can plausibly change scheduling, code, fuzz
coverage, branch publication, or blocker state. Use current file paths for
evidence_path and the controller path that should consume it for control_path.

Lane-specific emphasis:
- pr-blocker-router: find PR blockers where ownership or next action is wrong,
  and route them to the smallest controller action that can change the branch.
- benchmark-to-fuzz-closure: convert benchmark/canary failures into fuzz
  coverage, fix, or promotion-gate actions so benchmark failures are not merely
  external gates.
- deferred-family-reducer: identify deferred families that should be promoted,
  downscoped, or converted into exact blockers instead of being re-analyzed.
- lower-level-yield-retarget: identify lower-level fuzzing that has low bug
  yield because the oracle, target, corpus, or accounting is wrong, and provide
  the smallest concrete retargeting action.

Do not run browser/e2e tests here. Do not launch broad filesystem scans. Do not
edit repository files from this lane. Produce a bounded action report.
PROMPT
}

start_lane() {
	local lane=$1 run_dir=$2 active session slug lane_dir context prompt actions report stderr rc runner
	if lane_recently_launched "$lane"; then
		return 0
	fi
	if [ "$(active_lane_count)" -ge "$MAX_ACTIVE_LANES" ]; then
		return 0
	fi
	slug=$(slugify "$lane")
	active=$(tmux list-sessions -F '#S' 2>/dev/null | awk -v p="rtc-productive-lane-$slug-" 'index($0, p) == 1 { print; exit }')
	[ -z "$active" ] || return 0
	session="rtc-productive-lane-$slug-$(date -u +%Y%m%dT%H%M%SZ)"
	lane_dir="$run_dir/lanes/$slug"
	mkdir -p "$lane_dir"
	context="$run_dir/context.md"
	prompt="$lane_dir/prompt.md"
	actions="$lane_dir/actions.tsv"
	report="$lane_dir/report.md"
	stderr="$lane_dir/stderr.log"
	rc="$lane_dir/rc"
	runner="$lane_dir/run.sh"
	write_lane_prompt "$lane" "$context" "$actions" "$report" "$prompt"
	cat > "$runner" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "$SRC"
set +e
timeout "$CODEX_TIMEOUT_SECONDS" "$CODEX_BIN" -a never exec --skip-git-repo-check -m "$MODEL" -c model_reasoning_effort="$REASONING" -s danger-full-access < "$prompt" > "$report.stdout" 2> "$stderr"
code=\$?
set -e
if [ ! -s "$actions" ]; then
	printf 'generated_at\\taction_id\\ttarget_loop\\tpriority\\taction_kind\\tfamily_or_pr\\tevidence_path\\tnext_action\\tcontrol_path\\n' > "$actions"
fi
if [ ! -s "$report" ]; then
	{
		printf '# %s\\n\\n' "$lane"
		printf '- generated: %s\\n' "\$(date -u +%Y-%m-%dT%H:%M:%SZ)"
		printf '- exit_code: %s\\n' "\$code"
		printf '- stdout: %s\\n' "$report.stdout"
		printf '- stderr: %s\\n' "$stderr"
	} > "$report"
fi
printf '%s\\n' "\$code" > "$rc"
exit 0
EOF
	chmod +x "$runner"
	mark_lane_launched "$lane"
	json_event launch "lane=$lane session=$session run_dir=$lane_dir"
	tmux new-session -d -s "$session" "bash '$runner'"
}

merge_lane_actions() {
	local tmp=$ACTIONS.$$.tmp critical_tmp=$CRITICAL_FEEDBACK_TSV.$$.tmp now
	now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
	{
		printf 'generated_at\taction_id\ttarget_loop\tpriority\taction_kind\tfamily_or_pr\tevidence_path\tnext_action\tcontrol_path\n'
		find "$BASE/runs" -maxdepth 5 -type f -path '*/lanes/*/actions.tsv' -mmin -180 -size +0c -print 2>/dev/null |
			sort |
			while IFS= read -r file; do
				awk -F '\t' 'NR > 1 && NF >= 9 && $2 != "" { print }' "$file"
			done |
			awk -F '\t' '!seen[$2 "\t" $3 "\t" $6]++'
	} > "$tmp"
	mv "$tmp" "$ACTIONS"
	{
		printf 'generated_at\taction_id\ttarget_loop\tpriority\taction_kind\tfamily_or_pr\tevidence_path\tnext_action\tcontrol_path\n'
		awk -F '\t' '
			NR > 1 && ($4 == "P0" || $4 == "P1" || $4 == "high") &&
			($3 == "critical-path" || $3 == "pr-progress" || $3 == "coverage" || $3 == "level-mix" || $3 == "deferred") {
				print
			}
		' "$ACTIONS"
	} > "$critical_tmp"
	mv "$critical_tmp" "$CRITICAL_FEEDBACK_TSV"
	{
		echo "# Productive Analysis Feedback For Control Loops"
		echo
		echo "- generated: $now"
		echo "- action source: $ACTIONS"
		echo "- contract: these rows are meant to be consumed by the critical-path, PR-progress, deferred, coverage, and level-mix controllers."
		echo
		echo "## High Priority Action Rows"
		if awk -F '\t' 'NR > 1 { found=1 } END { exit found ? 0 : 1 }' "$CRITICAL_FEEDBACK_TSV"; then
			column -t -s $'\t' "$CRITICAL_FEEDBACK_TSV" 2>/dev/null || sed -n '1,120p' "$CRITICAL_FEEDBACK_TSV"
		else
			echo "No high-priority action rows in the latest merge window."
		fi
	} > "$CRITICAL_FEEDBACK_MD.tmp"
	mv "$CRITICAL_FEEDBACK_MD.tmp" "$CRITICAL_FEEDBACK_MD"
}

write_report_and_status() {
	local tmp=$REPORT.$$.tmp status_tmp=$STATUS.$$.tmp now active
	now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
	active=$(active_lane_count)
	{
		echo "# RTC Productive Analysis Loop"
		echo
		echo "- updated: $now"
		echo "- base: $BASE"
		echo "- active lane jobs: $active"
		echo "- cycle interval seconds: $CYCLE_SLEEP_SECONDS"
		echo "- max active lanes: $MAX_ACTIVE_LANES"
		echo
		echo "## What This Loop Does"
		echo
		echo "It runs targeted analysis lanes that look for work most likely to move the RTC project forward: PR blocker routing, benchmark-to-fuzzer closure, deferred-family reduction, and lower-level fuzzing yield retargeting."
		echo
		echo "The loop is wired into controllers through:"
		echo
		echo "- critical-path feedback: $CRITICAL_FEEDBACK_MD"
		echo "- critical-path feedback TSV: $CRITICAL_FEEDBACK_TSV"
		echo "- all action rows: $ACTIONS"
		echo
		echo "## Current Actions"
		column -t -s $'\t' "$ACTIONS" 2>/dev/null || sed -n '1,160p' "$ACTIONS" 2>/dev/null || true
		echo
		echo "## Recent Lane Reports"
		find "$BASE/runs" -maxdepth 5 -type f -path '*/lanes/*/report.md' -mmin -360 -size +0c -printf '%T@\t%p\n' 2>/dev/null |
			sort -nr |
			head -12 |
			cut -f2- |
			while IFS= read -r report; do
				echo
				echo "### $report"
				sed -n '1,80p' "$report"
			done
	} > "$tmp"
	mv "$tmp" "$REPORT"
	{
		echo "# Productive Analysis Loop Status"
		echo
		echo "- updated: $now"
		echo "- session: $SESSION"
		echo "- active lane jobs: $active"
		echo "- actions: $ACTIONS"
		echo "- critical feedback: $CRITICAL_FEEDBACK_MD"
		echo
		echo "## Controller Feed"
		awk -F '\t' 'NR > 1 { n++ } END { printf "- current action rows: %d\n", n + 0 }' "$ACTIONS" 2>/dev/null || echo "- current action rows: 0"
		awk -F '\t' 'NR > 1 { n++ } END { printf "- high-priority controller rows: %d\n", n + 0 }' "$CRITICAL_FEEDBACK_TSV" 2>/dev/null || echo "- high-priority controller rows: 0"
	} > "$status_tmp"
	mv "$status_tmp" "$STATUS"
}

run_once() {
	local ts run_dir
	ts=$(date -u +%Y%m%dT%H%M%SZ)
	run_dir="$BASE/runs/$ts"
	mkdir -p "$run_dir/lanes"
	write_context "$run_dir"
	for lane in "${LANES[@]}"; do
		start_lane "$lane" "$run_dir"
	done
	merge_lane_actions
	write_report_and_status
	json_event cycle "run_dir=$run_dir active_lanes=$(active_lane_count)"
}

run_loop() {
	if ! flock -n --close "$LOCK" "$0" run-locked; then
		log "another productive-analysis loop already holds $LOCK"
		exit 0
	fi
}

run_loop_locked() {
	printf '%s\n' "$$" > "$PID_FILE"
	trap 'rm -f "$PID_FILE"; exit 0' INT TERM EXIT
	log "productive-analysis loop started pid=$$"
	while true; do
		run_once || log "cycle failed rc=$?"
		sleep "$CYCLE_SLEEP_SECONDS"
	done
}

case "${1:-start}" in
	start)
		if has_session "$SESSION"; then
			echo "$SESSION already running"
			exit 0
		fi
		tmux new-session -d -s "$SESSION" "bash '$0' run"
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
	status)
		if has_session "$SESSION"; then
			echo "$SESSION running"
		else
			echo "$SESSION not running"
		fi
		[ -f "$STATUS" ] && sed -n '1,120p' "$STATUS"
		;;
	stop)
		tmux kill-session -t "$SESSION" 2>/dev/null || true
		;;
	*)
		echo "usage: $0 {start|run|once|status|stop}" >&2
		exit 2
		;;
esac
