#!/usr/bin/env bash
set -u

SESSION="${RTC_COVERAGE_SESSION:-rtc-handoff-coverage}"
MAX_PARALLEL="${RTC_COVERAGE_MAX_PARALLEL:-8}"
CHECK_SECS="${RTC_COVERAGE_CHECK_SECS:-45}"
MAX_REQUEUES="${RTC_COVERAGE_MAX_REQUEUES:-3}"

root="/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing"
queue="$root/coverage-queue.tsv"
state_dir="$root/coverage-state"
log_dir="$root/logs"
worker="$root/run-coverage-worker.sh"

mkdir -p "$state_dir" "$log_dir"

log() {
	echo "$(date -u +%FT%TZ) $*" | tee -a "$log_dir/coverage-dispatcher.log"
}

active_windows() {
	tmux list-windows -t "$SESSION" -F '#{window_name}' 2>/dev/null | grep -E '^coverage-' | wc -l | tr -d ' '
}

terminal_or_claimed() {
	sig="$1"
	[ -e "$state_dir/$sig.done" ] || [ -e "$state_dir/$sig.failed" ] || [ -e "$state_dir/$sig.claimed" ]
}

window_exists() {
	tmux list-windows -t "$SESSION" -F '#{window_name}' 2>/dev/null | grep -qx "$1"
}

cleanup_stale_claims() {
	for claimed in "$state_dir"/*.claimed; do
		[ -f "$claimed" ] || continue
		sig="$(basename "$claimed" .claimed)"
		[ -f "$state_dir/$sig.summary.md" ] && continue
		[ -e "$state_dir/$sig.done" ] && continue
		[ -e "$state_dir/$sig.failed" ] && continue
		window_exists "coverage-$sig" && continue
		pid="$(cat "$state_dir/$sig.wrapper.pid" 2>/dev/null || true)"
		[ -n "$pid" ] && kill -0 "$pid" 2>/dev/null && continue
		rm -f "$state_dir/$sig.claimed" "$state_dir/$sig.wrapper.pid" "$state_dir/$sig.paused"
		log "clearing stale claim for coverage-$sig"
	done
}

cleanup_no_summary_failures() {
	for failed in "$state_dir"/*.failed; do
		[ -f "$failed" ] || continue
		sig="$(basename "$failed" .failed)"
		[ -f "$state_dir/$sig.summary.md" ] && continue
		window_exists "coverage-$sig" && continue
		pid="$(cat "$state_dir/$sig.wrapper.pid" 2>/dev/null || true)"
		[ -n "$pid" ] && kill -0 "$pid" 2>/dev/null && continue
		log_file="$log_dir/coverage-$sig.log"
		exit_code="$(cat "$state_dir/$sig.exit" 2>/dev/null || true)"
		if [ "$exit_code" = "101" ] || { [ -f "$log_file" ] && grep -Eq 'stream disconnected|codex_core::tools::router|write_stdin failed|panic|exited -1|Failed to load cloud requirements' "$log_file"; }; then
			requeues_file="$state_dir/$sig.requeues"
			requeues="$(cat "$requeues_file" 2>/dev/null || echo 0)"
			requeues=$(( requeues + 1 ))
			echo "$requeues" > "$requeues_file"
			if [ "$requeues" -le "$MAX_REQUEUES" ]; then
				rm -f "$state_dir/$sig.failed" "$state_dir/$sig.exit" "$state_dir/$sig.claimed" "$state_dir/$sig.wrapper.pid" "$state_dir/$sig.paused"
				log "requeueing coverage-$sig after no-summary codex/tool failure requeues=$requeues"
			else
				log "leaving coverage-$sig failed after no-summary codex/tool failure requeues=$requeues max=$MAX_REQUEUES"
			fi
		fi
	done
}

launch_candidate() {
	index="$1"
	sig="$2"
	category="$3"
	transport="$4"
	bug_type="$5"
	spec_path="$6"
	source_path="$7"
	window="coverage-$sig"
	launch_script="$state_dir/$sig.launch.sh"
	log "launching $window category=$category transport=$transport bug_type=$bug_type"
	touch "$state_dir/$sig.claimed"
	{
		echo '#!/usr/bin/env bash'
		printf 'exec %q %q %q %q %q %q %q %q\n' "$worker" "$sig" "$category" "$transport" "$bug_type" "$spec_path" "$source_path" "$index"
	} > "$launch_script"
	chmod +x "$launch_script"
	tmux new-window -t "$SESSION:" -n "$window" "bash '$launch_script'"
}

ensure_session() {
	if ! tmux has-session -t "$SESSION" 2>/dev/null; then
		tmux new-session -d -s "$SESSION" -n monitor "bash -lc '$0'"
		exit 0
	fi
}

chmod +x "$worker"
ensure_session
log "coverage dispatcher starting max_parallel=$MAX_PARALLEL queue=$queue"

while :; do
	if [ ! -f "$queue" ]; then
		log "missing queue=$queue"
		sleep "$CHECK_SECS"
		continue
	fi
	cleanup_no_summary_failures
	cleanup_stale_claims
	active="$(active_windows)"
	log "active=$active done=$(find "$state_dir" -maxdepth 1 -name '*.done' 2>/dev/null | wc -l | tr -d ' ') failed=$(find "$state_dir" -maxdepth 1 -name '*.failed' 2>/dev/null | wc -l | tr -d ' ')"
	if [ "$active" -lt "$MAX_PARALLEL" ]; then
		index=0
		while IFS=$'\t' read -r sig category transport bug_type spec_path source_path; do
			[ -n "${sig:-}" ] || continue
			index=$(( index + 1 ))
			terminal_or_claimed "$sig" && continue
			window="coverage-$sig"
			window_exists "$window" && continue
			active="$(active_windows)"
			[ "$active" -ge "$MAX_PARALLEL" ] && break
			launch_candidate "$index" "$sig" "$category" "$transport" "$bug_type" "$spec_path" "$source_path"
		done < "$queue"
	fi
	sleep "$CHECK_SECS"
done
