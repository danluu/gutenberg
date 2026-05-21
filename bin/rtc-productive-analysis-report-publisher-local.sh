#!/usr/bin/env bash
set -euo pipefail

SESSION=rtc-productive-analysis-report-publisher
JETSTREAM=${RTC_PRODUCTIVE_REPORT_JETSTREAM:-exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org}
REMOTE_BASE=${RTC_PRODUCTIVE_REPORT_REMOTE_BASE:-/media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521}
WORKTREE=${RTC_PRODUCTIVE_REPORT_WORKTREE:-/private/tmp/gutenberg-productive-report}
BRANCH=${RTC_PRODUCTIVE_REPORT_BRANCH:-explain/rtc-jetstream2-fuzz-progress-20260515}
DOC_PATH=${RTC_PRODUCTIVE_REPORT_DOC_PATH:-docs/explanations/architecture/rtc-jetstream2-productive-analysis-loop-20260521.md}
INTERVAL_SECONDS=${RTC_PRODUCTIVE_REPORT_INTERVAL_SECONDS:-900}
LOG=${RTC_PRODUCTIVE_REPORT_LOG:-/private/tmp/rtc-productive-analysis-report-publisher.log}

render_doc() {
	local out=$1 tmp_dir=$2
	ssh "$JETSTREAM" "cat '$REMOTE_BASE/current-status.md' '$REMOTE_BASE/current-report.md' '$REMOTE_BASE/current-actions.tsv' '$REMOTE_BASE/critical-path-feedback.md' 2>/dev/null" > "$tmp_dir/live.txt"
	cat > "$out" <<EOF
# RTC Jetstream2 Productive Analysis Loop

This is the running report for the Jetstream2 productive-analysis loop. It is
refreshed from Jetstream by \`rtc-productive-analysis-report-publisher\`.

Script branch:
[\`try/jetstream-fuzz\`](https://github.com/danluu/gutenberg/tree/try/jetstream-fuzz)

## Control Contract

The productive-analysis loop emits machine-readable action rows. Those rows are
fed into control loops that can change scheduling, blocker state, branch work,
or fuzzing coverage:

- critical-path executor: consumes \`critical-path-feedback.tsv\` and creates
  \`productive-analysis-action\` blockers/jobs for high-priority rows;
- PR-progress controller: reads \`current-actions.tsv\` in its decision context;
- deferred-work promotion: reads the same feed per family;
- fuzz-level mix controller: reads the feed for coverage/lower-level/mix
  changes;
- structural watchdog: checks the loop status for freshness.

## Jetstream Paths

- loop base: \`$REMOTE_BASE\`
- status: \`$REMOTE_BASE/current-status.md\`
- report: \`$REMOTE_BASE/current-report.md\`
- actions: \`$REMOTE_BASE/current-actions.tsv\`
- critical feedback: \`$REMOTE_BASE/critical-path-feedback.tsv\`

## Live Snapshot

\`\`\`text
$(sed -n '1,260p' "$tmp_dir/live.txt")
\`\`\`

## Notes

The loop currently runs targeted lanes for PR blocker routing,
benchmark-to-fuzzer closure, deferred-family reduction, and lower-level fuzzing
yield retargeting. A lane that only writes commentary should not be added here;
new lanes should emit action rows with an explicit controller path.
EOF
}

publish_once() {
	local tmp_dir doc
	tmp_dir=$(mktemp -d /tmp/rtc-productive-report.XXXXXX)
	trap 'rm -rf "$tmp_dir"' RETURN
	git -C "$WORKTREE" fetch danluu "$BRANCH" >/dev/null
	git -C "$WORKTREE" checkout --detach FETCH_HEAD >/dev/null
	doc="$WORKTREE/$DOC_PATH"
	mkdir -p "$(dirname "$doc")"
	render_doc "$doc" "$tmp_dir"
	if git -C "$WORKTREE" diff --quiet -- "$DOC_PATH"; then
		printf '[%s] no report changes\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$LOG"
		return 0
	fi
	git -C "$WORKTREE" add "$DOC_PATH"
	git -C "$WORKTREE" commit --no-verify -m "Refresh productive analysis loop report" >/dev/null
	git -C "$WORKTREE" push danluu HEAD:"$BRANCH" >/dev/null
	printf '[%s] pushed productive analysis report\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$LOG"
}

run_loop() {
	while true; do
		publish_once || printf '[%s] publish failed rc=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$?" >> "$LOG"
		sleep "$INTERVAL_SECONDS"
	done
}

case "${1:-start}" in
	start)
		if tmux has-session -t "$SESSION" 2>/dev/null; then
			echo "$SESSION already running"
		else
			tmux new-session -d -s "$SESSION" "bash '$0' run"
			echo "$SESSION started"
		fi
		;;
	run)
		run_loop
		;;
	once)
		publish_once
		;;
	status)
		if tmux has-session -t "$SESSION" 2>/dev/null; then
			echo "$SESSION running"
		else
			echo "$SESSION not running"
		fi
		tail -20 "$LOG" 2>/dev/null || true
		;;
	stop)
		tmux kill-session -t "$SESSION" 2>/dev/null || true
		;;
	*)
		echo "usage: $0 {start|run|once|status|stop}" >&2
		exit 2
		;;
esac
