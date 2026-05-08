#!/usr/bin/env bash
set -u

root="/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing"
deep_root="$root/deep-state"
state_dir="$root/state"
log_dir="$root/logs"
check_secs="${RTC_WORKER_HEALTH_CHECK_SECS:-30}"

mkdir -p "$log_dir"

log() {
	echo "$(date -u +%FT%TZ) $*" | tee -a "$log_dir/worker-health.log"
}

free_mb() {
	vm_stat | awk '
		/page size of/ { page = $8 }
		/Pages free/ { gsub("\\.", "", $3); free = $3 }
		/Pages inactive/ { gsub("\\.", "", $3); inactive = $3 }
		/Pages speculative/ { gsub("\\.", "", $3); speculative = $3 }
		END { if (page == 0) page = 4096; printf "%d\n", ((free + inactive + speculative) * page) / 1048576; }
	'
}

cpu_per_core_pct() {
	cores="$(sysctl -n hw.ncpu 2>/dev/null || echo 1)"
	ps -A -o %cpu= | awk -v cores="$cores" '{ total += $1 } END { if (cores < 1) cores = 1; printf "%d\n", total / cores; }'
}

disk_free_mb() {
	df -Pm /System/Volumes/Data 2>/dev/null | awk 'NR == 2 { print $4 }'
}

window_exists() {
	session="$1"
	window="$2"
	tmux list-windows -t "$session" -F '#{window_name}' 2>/dev/null | grep -qx "$window"
}

ensure_monitor_window() {
	session="$1"
	window="$2"
	command="$3"
	if ! tmux has-session -t "$session" 2>/dev/null; then
		log "creating session=$session window=$window"
		tmux new-session -d -s "$session" -n "$window" "$command"
		return
	fi
	if ! window_exists "$session" "$window"; then
		log "creating missing window session=$session window=$window"
		tmux new-window -t "$session:" -n "$window" "$command"
	fi
}

count_windows() {
	session="$1"
	prefix="$2"
	tmux list-windows -t "$session" -F '#{window_name}' 2>/dev/null | grep -E "^$prefix" | wc -l | tr -d ' '
}

count_likelihood_sessions() {
	tmux list-sessions -F '#S' 2>/dev/null | grep -E '^rtc-likelihood-[0-9a-f]{12}$' | wc -l | tr -d ' '
}

coverage_status() {
	coverage_dir="$root/coverage-state"
	queue="$root/coverage-queue.tsv"
	printf 'coverage_active=%s coverage_queue=%s coverage_done=%s coverage_failed=%s' \
		"$(count_windows rtc-handoff-coverage '^coverage-')" \
		"$(wc -l < "$queue" 2>/dev/null || echo 0)" \
		"$(find "$coverage_dir" -maxdepth 1 -name '*.done' 2>/dev/null | wc -l | tr -d ' ')" \
		"$(find "$coverage_dir" -maxdepth 1 -name '*.failed' 2>/dev/null | wc -l | tr -d ' ')"
}

deep_pass_status() {
	pass="$(cat "$deep_root/current-pass" 2>/dev/null || echo none)"
	dir="$deep_root/pass-$pass"
	if [ ! -d "$dir" ]; then
		printf 'deep_pass=%s candidates=0 summaries=0 done=0 failed=0 alive=0' "$pass"
		return
	fi
	alive=0
	for pid_file in "$dir"/*.wrapper.pid; do
		[ -f "$pid_file" ] || continue
		pid="$(cat "$pid_file" 2>/dev/null || true)"
		[ -n "$pid" ] && kill -0 "$pid" 2>/dev/null && alive=$(( alive + 1 ))
	done
	printf 'deep_pass=%s candidates=%s summaries=%s done=%s failed=%s alive=%s' \
		"$pass" \
		"$(wc -l < "$dir/candidates.tsv" 2>/dev/null || echo 0)" \
		"$(find "$dir" -maxdepth 1 -name '*.summary.md' 2>/dev/null | wc -l | tr -d ' ')" \
		"$(find "$dir" -maxdepth 1 -name '*.done' 2>/dev/null | wc -l | tr -d ' ')" \
		"$(find "$dir" -maxdepth 1 -name '*.failed' 2>/dev/null | wc -l | tr -d ' ')" \
		"$alive"
}

first_pass_status() {
	printf 'first_summaries=%s first_done=%s first_failed=%s first_alive=%s' \
		"$(find "$state_dir" -maxdepth 1 -name '*.summary.md' 2>/dev/null | wc -l | tr -d ' ')" \
		"$(find "$state_dir" -maxdepth 1 -name '*.done' 2>/dev/null | wc -l | tr -d ' ')" \
		"$(find "$state_dir" -maxdepth 1 -name '*.failed' 2>/dev/null | wc -l | tr -d ' ')" \
		"$(count_windows rtc-bug-processing '^bug-')"
}

log "worker health monitor starting"

while :; do
	ensure_monitor_window \
		"rtc-bug-processing" \
		"monitor" \
		"RTC_BUG_CODEX_RETRIES=5 /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/run-bug-dispatcher.sh"
	ensure_monitor_window \
		"rtc-bug-deep-processing" \
		"monitor" \
		"RTC_BUG_DEEP_MAX_PARALLEL=6 RTC_BUG_DEEP_MIN_DISK_FREE_MB=102400 RTC_BUG_DEEP_LOW_DISK_FREE_MB=81920 RTC_BUG_DEEP_LAUNCH_STAGGER_SECS=4 RTC_BUG_DEEP_CODEX_RETRIES=5 /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/run-deep-dispatcher.sh"
	ensure_monitor_window \
		"rtc-rerun-compare" \
		"compare" \
		"WATCH_INTERVAL_SECONDS=30 /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/compare-rerun-status.sh --watch"
	ensure_monitor_window \
		"rtc-disk-cleanup" \
		"guard" \
		"/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/run-disk-cleanup-guard.sh"
	ensure_monitor_window \
		"rtc-handoff-coverage" \
		"monitor" \
		"RTC_COVERAGE_MAX_PARALLEL=8 /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/run-coverage-dispatcher.sh"

	log "resource free_mb=$(free_mb) disk_free_mb=$(disk_free_mb) cpu_per_core_pct=$(cpu_per_core_pct) deep_active=$(count_windows rtc-bug-deep-processing '^deep-') likelihood_active=$(count_likelihood_sessions) first_active=$(count_windows rtc-bug-processing '^bug-') $(coverage_status) $(deep_pass_status) $(first_pass_status)"
	sleep "$check_secs"
done
