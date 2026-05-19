#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN_DIR=${HOME:-/home/exouser}/.local/bin
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin
SRC=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
BASE=/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516

mkdir -p "$BASE/logs" "$BASE/cycles" "$BASE/worktrees" "$TMUX_WRAP"
cat > "$TMUX_WRAP/tmux" <<'SH'
#!/usr/bin/env bash
exec /usr/bin/tmux -L rtc-fuzz "$@"
SH
chmod +x "$TMUX_WRAP/tmux"
export PATH="$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:$PATH"

tmux kill-session -t rtc-deferred-work-promotion-loop 2>/dev/null || true

cat > "$BASE/deferred-work-promotion-loop.sh" <<'LOOP'
#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN_DIR=${HOME:-/home/exouser}/.local/bin
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin
SRC=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
BASE=/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516
COVERAGE_BASE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515
PR_SPLIT_BASE=/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515
FOCUSED_BASE=/media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515
STRICT_BASE=/media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515
ASSERT_BASE=/media/volume/danluu-fuzz-data/rtc-fuzz-only-asserts-20260515
LOG="$BASE/logs/deferred-work-promotion-loop.log"
STATE="$BASE/logs/family-launches.tsv"
CURSOR_STATE="$BASE/logs/family-cursor.txt"
QUEUE="$BASE/current-deferred-queue.tsv"
STATUS="$BASE/current-deferred-status.md"
FAMILIES=${RTC_DEFERRED_WORK_FAMILIES:-"reload-hydration pre-save-search-live-collapse rich-text-suffix-corruption malformed-save-payload http-room-isolation"}
MAX_ACTIVE_JOBS=${RTC_DEFERRED_WORK_MAX_ACTIVE_JOBS:-2}
CYCLE_SLEEP_SECONDS=${RTC_DEFERRED_WORK_CYCLE_SLEEP_SECONDS:-900}
MIN_FAMILY_INTERVAL_SECONDS=${RTC_DEFERRED_WORK_MIN_FAMILY_INTERVAL_SECONDS:-1800}
MAX_LOAD_MULTIPLIER=${RTC_DEFERRED_WORK_MAX_LOAD_MULTIPLIER:-1.20}
CODEX_MODEL=${RTC_DEFERRED_WORK_CODEX_MODEL:-gpt-5.5}
CODEX_REASONING_EFFORT=${RTC_DEFERRED_WORK_CODEX_REASONING_EFFORT:-xhigh}

mkdir -p "$BASE/logs" "$BASE/cycles" "$BASE/worktrees"
touch "$STATE"
export PATH="$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:$PATH"

log() {
	printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$LOG"
}

acquire_singleton_lock() {
	local lock_file pid_file
	lock_file="$BASE/deferred-work-promotion-loop.lock"
	pid_file="$BASE/deferred-work-promotion-loop.pid"
	exec 9>"$lock_file"
	if ! flock -n 9; then
		log "another deferred work promotion loop already holds $lock_file; exiting"
		exit 0
	fi
	printf '%s\n' "$$" > "$pid_file"
	trap 'rm -f "$BASE/deferred-work-promotion-loop.pid"' EXIT
}

active_deferred_sessions() {
	tmux ls 2>/dev/null | awk -F: '/^rtc-deferred-job-/ { count++ } END { print count + 0 }'
}

family_active() {
	local family=$1
	tmux ls 2>/dev/null | awk -F: -v prefix="rtc-deferred-job-$family-" 'index($1, prefix) == 1 { found = 1 } END { exit found ? 0 : 1 }'
}

load_too_high() {
	local load_average cores
	load_average=$(awk '{ print $1 }' /proc/loadavg 2>/dev/null || printf '0')
	cores=$(nproc 2>/dev/null || printf '1')
	awk -v load_average="$load_average" -v cores="$cores" -v multiplier="$MAX_LOAD_MULTIPLIER" 'BEGIN { exit !(load_average > cores * multiplier) }'
}

recently_launched() {
	local family=$1
	local now
	now=$(date -u +%s)
	awk -F '\t' -v family="$family" -v now="$now" -v interval="$MIN_FAMILY_INTERVAL_SECONDS" '
		$2 == family { last = $1 }
		END { exit !(last != "" && now - last < interval) }
	' "$STATE" 2>/dev/null
}

rotated_families() {
	local families count cursor i index
	read -r -a families <<< "$FAMILIES"
	count=${#families[@]}
	if [ "$count" -eq 0 ]; then
		return
	fi
	cursor=$(cat "$CURSOR_STATE" 2>/dev/null || printf '0')
	if ! [[ "$cursor" =~ ^[0-9]+$ ]]; then
		cursor=0
	fi
	cursor=$(( cursor % count ))
	for (( i = 0; i < count; i++ )); do
		index=$(( ( cursor + i ) % count ))
		printf '%s\n' "${families[$index]}"
	done
}

set_family_cursor_after() {
	local family=$1
	local families count cursor i
	read -r -a families <<< "$FAMILIES"
	count=${#families[@]}
	if [ "$count" -eq 0 ]; then
		return
	fi
	for (( i = 0; i < count; i++ )); do
		if [ "${families[$i]}" = "$family" ]; then
			printf '%s\n' $(( ( i + 1 ) % count )) > "$CURSOR_STATE"
			return
		fi
	done
}

family_title() {
	case "$1" in
		reload-hydration)
			printf 'reload hydration and checkpoint recovery'
			;;
		pre-save-search-live-collapse)
			printf 'pre-save search block live-state collapse'
			;;
		rich-text-suffix-corruption)
			printf 'rich text suffix corruption replay and fixability'
			;;
		malformed-save-payload)
			printf 'malformed save payload and post-save settlement'
			;;
		http-room-isolation)
			printf 'HTTP auxiliary room isolation'
			;;
		*)
			printf '%s' "$1"
			;;
	esac
}

family_notes() {
	case "$1" in
		reload-hydration)
			cat <<'TXT'
Focus on reload, recovery, checkpoint, and hydration paths where the editor reloads with stale local state, stale awareness, stale post locks, or lost pending operations.
Promote only a small product fix, harness diagnostic, or conclusive branch after checking live fuzz artifacts and existing focused diagnostics.
High-value evidence includes a replayable reload/recovery seed, a stale entity snapshot after reload, a divergence between editor blocks and REST content, or a missing operation witness after reload.
TXT
			;;
		pre-save-search-live-collapse)
			cat <<'TXT'
Focus on the core/search and live-state collapse failures that happen before save. Capture editor blocks, serialized content, core-data edited record, live CRDT/provider state, outgoing REST payload, and post-lock/session state around insertion and save.
Promote a branch when there is a minimal repro or a clear invariant that distinguishes product state loss from harness artifact.
TXT
			;;
		rich-text-suffix-corruption)
			cat <<'TXT'
Focus on rich-text suffix corruption. Try to recover a deterministic replay or isolate the transform path that corrupts text suffixes through paste, toolbar formatting, undo/redo, selection ranges, parser transforms, or rich-text value serialization.
If replay evidence remains unavailable after bounded attempts, downscope this family with a clear explanation and leave a targeted fuzzer improvement instead of a speculative product change.
TXT
			;;
		malformed-save-payload)
			cat <<'TXT'
Focus on malformed outgoing save payloads and post-save settlement. Look for a source-level repro where editor blocks and local serialized content are clean, but saveEntityRecord, prePersistPostType, REST request construction, or later settlement sends or accepts malformed content.
Promote a branch only when the failure boundary is clear enough for a maintainer-sized fix or an instrumentation branch that can make the boundary clear.
TXT
			;;
		http-room-isolation)
			cat <<'TXT'
Focus on HTTP room isolation and auxiliary-room failures. Check whether post rooms remain healthy when auxiliary rooms fail, whether one failed room poisons provider/global state, and whether the current PR1/PR2 split already covers the product issue.
Promote a branch if healthy post rooms can still be stalled or contaminated by failed auxiliary rooms after the current candidate fixes.
TXT
			;;
		*)
			cat <<TXT
Focus on deferred RTC issue family: $1.
TXT
			;;
	esac
}

write_deferred_queue() {
	local coverage focused strict family
	coverage=$(cat "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)
	focused=$(cat "$FOCUSED_BASE/current-run-root.txt" 2>/dev/null || true)
	strict=$(cat "$STRICT_BASE/current-run-root.txt" 2>/dev/null || true)
	{
		printf 'generated_at\tfamily\tpriority\treason\tprimary_context\n'
		for family in $FAMILIES; do
			case "$family" in
				reload-hydration|pre-save-search-live-collapse|malformed-save-payload|http-room-isolation)
					printf '%s\t%s\thigh\tdeferred significant RTC bug family still needs a maintainer-sized candidate branch\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$family" "$coverage"
					;;
				rich-text-suffix-corruption)
					printf '%s\t%s\tmedium\treplay evidence or explicit downscope decision needed\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$family" "$coverage"
					;;
				*)
					printf '%s\t%s\tmedium\toperator-specified deferred family\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$family" "$coverage"
					;;
			esac
		done
		if [ -n "$coverage" ] && [ -f "$coverage/novelty-status.md" ]; then
			awk '
				/unmet goals:/ || /likely-real/ || /oracle\/noise/ || /harness-work candidates:/ || /current-run signatures:/ {
					gsub(/\t/, " ");
					print strftime("%Y-%m-%dT%H:%M:%SZ", systime()) "\tcoverage-guided\tcontext\t" $0 "\t" FILENAME
				}
			' "$coverage/novelty-status.md" 2>/dev/null || true
		fi
		if [ -n "$focused" ] && [ -f "$focused/live-analysis-monitor-state.json" ]; then
			printf '%s\tfocused-shards\tcontext\tfocused live-analysis state is available\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$focused/live-analysis-monitor-state.json"
		fi
		if [ -n "$strict" ] && [ -f "$strict/live-analysis-monitor-state.json" ]; then
			printf '%s\tstrict-expansion\tcontext\tstrict live-analysis state is available\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$strict/live-analysis-monitor-state.json"
		fi
	} > "$QUEUE.tmp"
	mv "$QUEUE.tmp" "$QUEUE"
}

collect_context() {
	local cycle_dir=$1
	local family=$2
	local branch=$3
	local worktree=$4
	local context=$cycle_dir/context.md
	local coverage focused strict
	coverage=$(cat "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)
	focused=$(cat "$FOCUSED_BASE/current-run-root.txt" 2>/dev/null || true)
	strict=$(cat "$STRICT_BASE/current-run-root.txt" 2>/dev/null || true)

	{
		echo "# RTC deferred work promotion context"
		echo
		echo "- generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
		echo "- family: $family"
		echo "- title: $(family_title "$family")"
		echo "- live repo: $SRC"
		echo "- candidate worktree: $worktree"
		echo "- candidate branch: $branch"
		echo "- coverage-guided output: ${coverage:-missing}"
		echo "- focused shards output: ${focused:-missing}"
		echo "- strict expansion output: ${strict:-missing}"
		echo
		echo "## Family Notes"
		family_notes "$family"
		echo
		echo "## Deferred Queue"
		sed -n '1,220p' "$QUEUE" 2>/dev/null || true
		echo
		echo "## Machine"
		date -u
		hostname || true
		uptime || true
		free -h || true
		echo
		echo "## Tmux Sessions"
		tmux ls 2>/dev/null || true
		echo
		echo "## Live Repo Status"
		cd "$SRC"
		git status --short || true
		git log -1 --oneline || true
		echo
		echo "## Candidate Worktree Status"
		if [ -d "$worktree/.git" ] || git -C "$worktree" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
			git -C "$worktree" status --short --branch || true
			git -C "$worktree" log -1 --oneline || true
		fi
		echo
		echo "## Current PR Split Review"
		if [ -f "$PR_SPLIT_BASE/current-pr-split.md" ]; then
			sed -n '1,260p' "$PR_SPLIT_BASE/current-pr-split.md"
		else
			echo "missing $PR_SPLIT_BASE/current-pr-split.md"
		fi
		echo
		echo "## Deferred Loop Previous Reports"
		find "$BASE/cycles" -maxdepth 3 -type f -name '*.report.md' -print 2>/dev/null |
			sort |
			tail -8 |
			while read -r report; do
				echo "### $report"
				sed -n '1,180p' "$report" || true
				echo
			done
		echo
		echo "## Coverage-Guided Status"
		if [ -n "$coverage" ] && [ -f "$coverage/novelty-status.md" ]; then
			sed -n '1,260p' "$coverage/novelty-status.md"
		else
			echo "missing"
		fi
		echo
		echo "## Recent Coverage Failure And Triage Signals"
		if [ -n "$coverage" ] && [ -d "$coverage" ]; then
			find "$coverage" -type f \( -name command.log -o -name summary.ndjson -o -name events.ndjson -o -name '*.md' \) -mtime -1 -print0 2>/dev/null |
				xargs -0 -r rg -n \
					"(reload|hydrate|recovery|checkpoint|search|rich text|suffix|saveEntityRecord|prePersistPostType|malformed|payload|room|provider|oracle|likely-real|noise|TimeoutError|Error:)" \
					2>/dev/null |
				head -420 || true
		fi
		echo
		echo "## Focused Status"
		if [ -n "$focused" ]; then
			for file in "$focused/supervisor-state.json" "$focused/live-analysis-monitor-state.json"; do
				if [ -f "$file" ]; then
					echo "### $file"
					sed -n '1,180p' "$file" || true
				fi
			done
		fi
		echo
		echo "## Strict Status"
		if [ -n "$strict" ]; then
			for file in "$strict/supervisor-state.json" "$strict/live-analysis-monitor-state.json"; do
				if [ -f "$file" ]; then
					echo "### $file"
					sed -n '1,180p' "$file" || true
				fi
			done
		fi
		echo
		echo "## Fuzz-Only Assertion Status"
		if [ -f "$ASSERT_BASE/current-asserts-status.md" ]; then
			sed -n '1,220p' "$ASSERT_BASE/current-asserts-status.md"
		else
			find "$ASSERT_BASE/cycles" -maxdepth 3 -type f -name '*.report.md' -print 2>/dev/null |
				sort |
				tail -6 |
				while read -r report; do
					echo "### $report"
					sed -n '1,120p' "$report" || true
				done
		fi
	} > "$context"
}

write_prompt() {
	local prompt=$1
	local family=$2
	local branch=$3
	local worktree=$4
	local context=$5
	local report=$6
	cat > "$prompt" <<PROMPT
You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents. Work locally in this tmux/Codex process.

Deferred family: $family
Candidate branch: $branch
Candidate worktree: $worktree
Context: $context
Final report path: $report

Task:
1. Read the context and any relevant live fuzz artifacts it references.
2. Work on this deferred family only. The goal is to turn deferred work into either a small candidate branch, a targeted fuzzer/instrumentation branch, or a documented downscope decision with evidence.
3. Use the candidate worktree for code changes. Do not edit the live fuzzer repo at $SRC unless you are making an explicit fuzzer-loop adjustment; if you do that, document exactly why and restart only the affected loop with the stable /tmp launcher.
4. If the evidence supports a product fix, make the smallest maintainable change, commit it on $branch, run focused checks, and record the exact diffstat and validation.
5. If a product fix is not ready, prefer adding narrow diagnostics or a focused replay/fuzzer improvement that will make the next run conclusive. Commit that change if it is useful and safe.
6. Avoid behavior-disable flags such as DISABLE_SYNC_FAULTS, DISABLE_PARSER_STRESS, DISABLE_REVISION_RESTORE, DISABLE_RELOAD, or DISABLE_RANDOM_RELOAD.
7. Keep the result reviewable. Do not combine unrelated families or broad refactors into this branch.
8. If the branch is a product candidate or useful fuzzer/instrumentation candidate, write a push manifest next to the report at $cycle_dir/push-manifest.tsv with columns: source_branch, source_commit, intended_danluu_branch, base_ref, files_changed, insertions, deletions, validation_summary, reason. Jetstream should not push to GitHub; the manifest is for the local machine to publish.
9. Write a concise report to $report with these exact headings: Status, Evidence, Branch, Changes, Validation, Fuzzing Feedback, Next Action.

Family-specific notes:
$(family_notes "$family")
PROMPT
}

launch_family_job() {
	local family=$1
	local ts cycle_dir branch worktree prompt report codex_log session
	ts=$(date -u +%Y%m%dT%H%M%SZ)
	cycle_dir="$BASE/cycles/$ts/$family"
	branch="deferred/rtc-$family-$ts"
	worktree="$BASE/worktrees/$family-$ts"
	mkdir -p "$cycle_dir"
	write_deferred_queue
	if ! git -C "$SRC" worktree add -b "$branch" "$worktree" HEAD > "$cycle_dir/worktree.log" 2>&1; then
		branch="deferred/rtc-$family-$ts-detached"
		git -C "$SRC" worktree add --detach "$worktree" HEAD >> "$cycle_dir/worktree.log" 2>&1 || {
			log "failed to create worktree for $family; see $cycle_dir/worktree.log"
			return 1
		}
		git -C "$worktree" switch -c "$branch" >> "$cycle_dir/worktree.log" 2>&1 || true
	fi
	collect_context "$cycle_dir" "$family" "$branch" "$worktree"
	prompt="$cycle_dir/$family.prompt.md"
	report="$cycle_dir/$family.report.md"
	codex_log="$cycle_dir/$family.stderr.log"
	write_prompt "$prompt" "$family" "$branch" "$worktree" "$cycle_dir/context.md" "$report"
	session="rtc-deferred-job-$family-$ts"
	printf '%s\t%s\t%s\t%s\t%s\n' "$(date -u +%s)" "$family" "$session" "$branch" "$worktree" >> "$STATE"
	log "launching $session branch=$branch worktree=$worktree"
	tmux new-session -d -s "$session" \
		"bash -lc 'cd \"$worktree\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\"; \"$CODEX_BIN_DIR/codex\" -a never exec --skip-git-repo-check -m \"$CODEX_MODEL\" -c model_reasoning_effort=\"$CODEX_REASONING_EFFORT\" -s danger-full-access < \"$prompt\" > \"$report\" 2> \"$codex_log\"'"
}

write_status() {
	local coverage
	coverage=$(cat "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)
	{
		echo "# RTC Deferred Work Promotion Status"
		echo
		echo "- updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
		echo "- max active jobs: $MAX_ACTIVE_JOBS"
		echo "- active deferred jobs: $(active_deferred_sessions)"
		echo "- cycle sleep seconds: $CYCLE_SLEEP_SECONDS"
		echo "- next family cursor: $(cat "$CURSOR_STATE" 2>/dev/null || printf '0')"
		echo "- current coverage output: ${coverage:-missing}"
		echo
		echo "## Queue"
		sed -n '1,220p' "$QUEUE" 2>/dev/null || true
		echo
		echo "## Active Sessions"
		tmux ls 2>/dev/null | rg '^rtc-deferred-job-' || true
		echo
		echo "## Launch History"
		tail -40 "$STATE" 2>/dev/null || true
		echo
		echo "## Family Fairness"
		for family in $FAMILIES; do
			awk -F '\t' -v family="$family" '
				$2 == family { count++; last = $1 }
				END {
					if (count == "") {
						print family "\tlaunches=0\tlast=never"
					} else {
						print family "\tlaunches=" count "\tlast_epoch=" last
					}
				}
			' "$STATE" 2>/dev/null
		done
		echo
		echo "## Local Candidate Branches"
		git -C "$SRC" for-each-ref --sort=-creatordate --format='%(creatordate:iso8601)%09%(refname:short)%09%(objectname:short)' 'refs/heads/deferred/rtc-*' 2>/dev/null |
			head -80 || true
		echo
		echo "## Recent Reports"
		find "$BASE/cycles" -maxdepth 3 -type f -name '*.report.md' -print 2>/dev/null |
			sort |
			tail -10 |
			while read -r report; do
				echo "### $report"
				sed -n '1,180p' "$report" || true
				echo
			done
	} > "$STATUS.tmp"
	mv "$STATUS.tmp" "$STATUS"
}

acquire_singleton_lock
log "deferred work promotion loop started pid=$$"
while true; do
	write_deferred_queue
	write_status

	if load_too_high; then
		log "load guard active; skipping launches this cycle"
		sleep "$CYCLE_SLEEP_SECONDS"
		continue
	fi

	launched_any=0
	last_launched_family=""
	while IFS= read -r family; do
		active=$(active_deferred_sessions)
		if [ "$active" -ge "$MAX_ACTIVE_JOBS" ]; then
			log "max active jobs reached active=$active max=$MAX_ACTIVE_JOBS"
			break
		fi
		if family_active "$family"; then
			log "family already active family=$family"
			continue
		fi
		if recently_launched "$family"; then
			log "family launched recently family=$family"
			continue
		fi
		if launch_family_job "$family"; then
			launched_any=1
			last_launched_family="$family"
		fi
	done < <( rotated_families )
	if [ "$launched_any" -eq 1 ]; then
		set_family_cursor_after "$last_launched_family"
	else
		log "no eligible deferred family launched; cursor unchanged"
	fi

	write_status
	sleep "$CYCLE_SLEEP_SECONDS"
done
LOOP

chmod +x "$BASE/deferred-work-promotion-loop.sh"
tmux new-session -d -s rtc-deferred-work-promotion-loop "$BASE/deferred-work-promotion-loop.sh"
tmux ls | grep -E 'rtc-deferred' || true
