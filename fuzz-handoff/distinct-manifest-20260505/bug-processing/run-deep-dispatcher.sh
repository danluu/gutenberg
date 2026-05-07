#!/usr/bin/env bash
set -u

SESSION="${RTC_BUG_DEEP_SESSION:-rtc-bug-deep-processing}"
PRIMARY_SESSION="${RTC_BUG_SESSION:-rtc-bug-processing}"
CHECK_SECS="${RTC_BUG_DEEP_CHECK_SECS:-60}"
MAX_PARALLEL="${RTC_BUG_DEEP_MAX_PARALLEL:-8}"
REAL_WORLD_LIKELIHOOD_MODE="${RTC_BUG_DEEP_REAL_WORLD_LIKELIHOOD_MODE:-1}"
MIN_FREE_MB="${RTC_BUG_DEEP_MIN_FREE_MB:-6144}"
LOW_FREE_MB="${RTC_BUG_DEEP_LOW_FREE_MB:-3072}"
MIN_DISK_FREE_MB="${RTC_BUG_DEEP_MIN_DISK_FREE_MB:-81920}"
LOW_DISK_FREE_MB="${RTC_BUG_DEEP_LOW_DISK_FREE_MB:-40960}"
CPU_START_LIMIT="${RTC_BUG_DEEP_CPU_START_LIMIT:-88}"
LAUNCH_STAGGER_SECS="${RTC_BUG_DEEP_LAUNCH_STAGGER_SECS:-4}"

root="/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing"
refresh_glob="/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505*/fuzz-handoff/distinct-manifest-20260505/results-refresh-*/results.jsonl"
refresh_status_glob="/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505*/fuzz-handoff/distinct-manifest-20260505/results-refresh-*/status.json"
state_dir="$root/state"
deep_root="$root/deep-state"
log_dir="$root/logs"
runner="$root/run-deep-worker.sh"
repeat_candidates="$root/all-plausible-candidates.tsv"

mkdir -p "$deep_root" "$log_dir"

log() {
	echo "$(date -u +%FT%TZ) $*" | tee -a "$log_dir/deep-dispatcher.log"
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

target_parallel() {
	free="$(free_mb)"
	disk_free="$(disk_free_mb)"
	cpu="$(cpu_per_core_pct)"
	if [ "$free" -lt "$LOW_FREE_MB" ] || [ "$disk_free" -lt "$LOW_DISK_FREE_MB" ] || [ "$cpu" -gt 98 ]; then
		echo 1
	elif [ "$free" -lt "$MIN_FREE_MB" ] || [ "$disk_free" -lt "$MIN_DISK_FREE_MB" ] || [ "$cpu" -gt "$CPU_START_LIMIT" ]; then
		echo 3
	else
		echo "$MAX_PARALLEL"
	fi
}

active_windows_for_session() {
	session="$1"
	prefix="$2"
	tmux list-windows -t "$session" -F '#{window_name}' 2>/dev/null | grep -E "^$prefix" | wc -l | tr -d ' '
}

active_windows() {
	active_windows_for_session "$SESSION" 'deep-'
}

primary_active_windows() {
	active_windows_for_session "$PRIMARY_SESSION" 'bug-'
}

refresh_complete() {
	found=0
	for status_file in $refresh_status_glob; do
		[ -f "$status_file" ] || continue
		found=1
		completed="$(jq -r '.completedAt // empty' "$status_file" 2>/dev/null || true)"
		[ -n "$completed" ] || return 1
	done
	[ "$found" -eq 1 ]
}

all_failed_candidates() {
	for f in $refresh_glob; do
		[ -f "$f" ] || continue
		jq -r --arg f "$f" '
			select(.result == "failed") |
			[.signature, .transport, .bugType, .specPath, $f] | @tsv
		' "$f" 2>/dev/null
	done | sort -u
}

is_likely_summary() {
	summary="$1"
	[ -f "$summary" ] || return 0
	if grep -Eiq 'Decision:[^\n]*(not|infra|harness)|not a real|not confirmed|not actionable|infra/test|infra-only|harness failure|No branches were created|No commits|not evidence|not a product|did not create|do not create or push|cannot be used as product|does not demonstrate|source failure did not' "$summary"; then
		return 1
	fi
	return 0
}

pass_dir() {
	echo "$deep_root/pass-$1"
}

generate_pass_candidates() {
	pass="$1"
	dir="$(pass_dir "$pass")"
	mkdir -p "$dir"
	candidates="$dir/candidates.tsv"
	: > "$candidates"
	if [ "$pass" -eq 2 ]; then
		all_failed_candidates | while IFS=$'\t' read -r sig transport bug_type spec_path result_file; do
			[ -n "$sig" ] || continue
			summary="$state_dir/$sig.summary.md"
			if is_likely_summary "$summary"; then
				printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$sig" "$transport" "$bug_type" "$spec_path" "$result_file" "$summary" >> "$candidates"
			fi
		done
	else
		prev_dir="$(pass_dir "$(( pass - 1 ))")"
		[ -f "$prev_dir/candidates.tsv" ] || return 0
		while IFS=$'\t' read -r sig transport bug_type spec_path result_file prev_summary; do
			[ -n "$sig" ] || continue
			summary="$prev_dir/$sig.summary.md"
			if is_likely_summary "$summary"; then
				printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$sig" "$transport" "$bug_type" "$spec_path" "$result_file" "$summary" >> "$candidates"
			fi
		done < "$prev_dir/candidates.tsv"
	fi
	touch "$dir/initialized"
	log "pass=$pass generated $(wc -l < "$candidates" | tr -d ' ') likely/unresolved candidates"
}

latest_summary_for() {
	pass="$1"
	sig="$2"
	find "$deep_root" -maxdepth 2 -path "$deep_root/pass-*/$sig.summary.md" 2>/dev/null |
		awk -v current="$pass" -F'pass-' '
			{
				split($2, a, "/");
				if (a[1] + 0 < current) print a[1] "\t" $0;
			}
		' |
		sort -n |
		tail -1 |
		cut -f2-
}

build_latest_summary_index() {
	pass="$1"
	out="$2"
	tmp="$out.tmp"
	: > "$tmp"
	find "$state_dir" -maxdepth 1 -name '*.summary.md' 2>/dev/null | while IFS= read -r summary; do
		sig="$(basename "$summary" .summary.md)"
		printf '%s\t0\t%s\n' "$sig" "$summary"
	done >> "$tmp"
	find "$root/coverage-state" -maxdepth 1 -name '*.summary.md' 2>/dev/null | while IFS= read -r summary; do
		sig="$(basename "$summary" .summary.md)"
		printf '%s\t1\t%s\n' "$sig" "$summary"
	done >> "$tmp"
	find "$deep_root" -maxdepth 2 -path "$deep_root/pass-*/" -prune -o -path "$deep_root/pass-*/*.summary.md" -print 2>/dev/null |
		awk -v current="$pass" -F'pass-' '
			{
				split($2, a, "/");
				p = a[1] + 0;
				if (p > 0 && p < current) {
					sig = $0;
					sub(/^.*\//, "", sig);
					sub(/\.summary\.md$/, "", sig);
					print sig "\t" p "\t" $0;
				}
			}
		' >> "$tmp"
	sort -k1,1 -k2,2n "$tmp" |
		awk -F'\t' '{ best[$1] = $3 } END { for (sig in best) print sig "\t" best[sig] }' > "$out"
	rm -f "$tmp"
}

generate_repeat_candidates() {
	pass="$1"
	dir="$(pass_dir "$pass")"
	mkdir -p "$dir"
	candidates="$dir/candidates.tsv"
	: > "$candidates"
	[ -f "$repeat_candidates" ] || return 0
	index_file="$dir/latest-summary-index.tsv"
	build_latest_summary_index "$pass" "$index_file"
	awk -F'\t' '
		NR == FNR { prev[$1] = $2; next }
		{
			previous = prev[$1];
			if (previous == "") previous = "-";
			printf "%s\t%s\t%s\t%s\t%s\t%s\n", $1, $2, $3, $4, $5, previous;
		}
	' "$index_file" "$repeat_candidates" > "$candidates"
	touch "$dir/initialized"
	log "pass=$pass seeded $(wc -l < "$candidates" | tr -d ' ') all-plausible candidates for a deep pass"
}

terminal_for() {
	dir="$1"
	sig="$2"
	[ -e "$dir/$sig.done" ] || [ -e "$dir/$sig.failed" ]
}

claimed_for() {
	dir="$1"
	sig="$2"
	[ -e "$dir/$sig.claimed" ]
}

cleanup_dead_summary_workers() {
	dir="$1"
	for summary in "$dir"/*.summary.md; do
		[ -f "$summary" ] || continue
		sig="$(basename "$summary" .summary.md)"
		if [ -e "$dir/$sig.failed" ]; then
			rm -f "$dir/$sig.failed"
		fi
		[ -e "$dir/$sig.done" ] && continue
		pid_file="$dir/$sig.wrapper.pid"
		pid="$(cat "$pid_file" 2>/dev/null || true)"
		if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then
			echo 0 > "$dir/$sig.exit"
			touch "$dir/$sig.done"
			log "pass=$(basename "$dir" | sed 's/pass-//') marking deep-$sig done; summary exists and wrapper is gone"
		fi
	done
}

cleanup_transient_startup_failures() {
	dir="$1"
	pass="$(basename "$dir" | sed 's/pass-//')"
	for failed in "$dir"/*.failed; do
		[ -f "$failed" ] || continue
		sig="$(basename "$failed" .failed)"
		[ -f "$dir/$sig.summary.md" ] && continue
		pid_file="$dir/$sig.wrapper.pid"
		pid="$(cat "$pid_file" 2>/dev/null || true)"
		[ -n "$pid" ] && kill -0 "$pid" 2>/dev/null && continue
		log_file="$log_dir/deep-pass-$pass-$sig.log"
		[ -f "$log_file" ] || continue
		if grep -q 'Failed to load cloud requirements' "$log_file"; then
			requeues_file="$dir/$sig.requeues"
			requeues="$(cat "$requeues_file" 2>/dev/null || echo 0)"
			requeues=$(( requeues + 1 ))
			echo "$requeues" > "$requeues_file"
			rm -f "$dir/$sig.failed" "$dir/$sig.exit" "$dir/$sig.claimed" "$dir/$sig.wrapper.pid" "$dir/$sig.paused"
			log "pass=$pass requeueing deep-$sig after transient codex startup failure requeues=$requeues"
		fi
	done
}

pass_complete() {
	pass="$1"
	dir="$(pass_dir "$pass")"
	candidates="$dir/candidates.tsv"
	[ -f "$candidates" ] || return 1
	while IFS=$'\t' read -r sig transport bug_type spec_path result_file previous_summary; do
		[ -n "$sig" ] || continue
		terminal_for "$dir" "$sig" || return 1
	done < "$candidates"
	return 0
}

launch_candidate() {
	pass="$1"
	index="$2"
	sig="$3"
	transport="$4"
	bug_type="$5"
	spec_path="$6"
	result_file="$7"
	previous_summary="$8"
	dir="$(pass_dir "$pass")"
	window="deep-p${pass}-${sig}"
	launch_script="$dir/$sig.launch.sh"
	log "launching $window transport=$transport bug_type=$bug_type"
	touch "$dir/$sig.claimed"
	{
		echo '#!/usr/bin/env bash'
		printf 'exec %q %q %q %q %q %q %q %q %q\n' "$runner" "$pass" "$sig" "$transport" "$bug_type" "$spec_path" "$result_file" "$previous_summary" "$index"
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

chmod +x "$runner"
ensure_session
log "deep dispatcher starting max_parallel=$MAX_PARALLEL"

current_pass="$(cat "$deep_root/current-pass" 2>/dev/null || echo 2)"

while :; do
	free="$(free_mb)"
	disk_free="$(disk_free_mb)"
	cpu="$(cpu_per_core_pct)"
	target="$(target_parallel)"
	active="$(active_windows)"
	primary_active="$(primary_active_windows)"
	log "resource free_mb=$free disk_free_mb=$disk_free cpu_per_core_pct=$cpu pass=$current_pass active=$active primary_active=$primary_active target=$target"

	dir="$(pass_dir "$current_pass")"
	mkdir -p "$dir"
	cleanup_dead_summary_workers "$dir"
	cleanup_transient_startup_failures "$dir"

	if [ ! -e "$dir/initialized" ]; then
		if [ "$current_pass" -eq 2 ]; then
			if ! refresh_complete || [ "$primary_active" -ne 0 ]; then
				log "pass=2 waiting for refresh repros and first-pass bug triage to drain"
				sleep "$CHECK_SECS"
				continue
			fi
		fi
		if [ "$REAL_WORLD_LIKELIHOOD_MODE" = "1" ] && [ -f "$repeat_candidates" ]; then
			log "pass=$current_pass all-plausible real-user-likelihood mode active; seeding full likely-real handoff set"
			generate_repeat_candidates "$current_pass"
		else
			generate_pass_candidates "$current_pass"
		fi
	fi

	if [ -f "$dir/candidates.tsv" ] && [ ! -s "$dir/candidates.tsv" ]; then
		if [ -f "$repeat_candidates" ]; then
			log "pass=$current_pass has no likely/unresolved candidates; seeding pass=$(( current_pass + 1 )) from full likely-real handoff set"
			current_pass=$(( current_pass + 1 ))
			echo "$current_pass" > "$deep_root/current-pass"
			generate_repeat_candidates "$current_pass"
			continue
		fi
		log "pass=$current_pass has no likely/unresolved candidates; waiting for new information"
		sleep "$CHECK_SECS"
		continue
	fi

	if pass_complete "$current_pass"; then
		log "pass=$current_pass complete; starting pass=$(( current_pass + 1 ))"
		current_pass=$(( current_pass + 1 ))
		echo "$current_pass" > "$deep_root/current-pass"
		continue
	fi

	if [ "$active" -lt "$target" ]; then
		while IFS=$'\t' read -r sig transport bug_type spec_path result_file previous_summary; do
			[ -n "$sig" ] || continue
			terminal_for "$dir" "$sig" && continue
			claimed_for "$dir" "$sig" && continue
			active="$(active_windows)"
			[ "$active" -ge "$target" ] && break
			index="$(find "$dir" -maxdepth 1 -name '*.claimed' | wc -l | tr -d ' ')"
			launch_candidate "$current_pass" "$index" "$sig" "$transport" "$bug_type" "$spec_path" "$result_file" "$previous_summary"
			[ "$LAUNCH_STAGGER_SECS" -gt 0 ] && sleep "$LAUNCH_STAGGER_SECS"
		done < "$dir/candidates.tsv"
	fi

	sleep "$CHECK_SECS"
done
