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
PRODUCTIVE_ANALYSIS_BASE=/media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521
LOG="$BASE/logs/deferred-work-promotion-loop.log"
STATE="$BASE/logs/family-launches.tsv"
CURSOR_STATE="$BASE/logs/family-cursor.txt"
QUEUE="$BASE/current-deferred-queue.tsv"
STATUS="$BASE/current-deferred-status.md"
CONTROL="$BASE/current-deferred-control.tsv"
FAMILIES=${RTC_DEFERRED_WORK_FAMILIES:-"reload-hydration pre-save-search-live-collapse rich-text-suffix-corruption malformed-save-payload http-room-isolation"}
ALLOW_DIAGNOSTIC_FAMILIES=${RTC_DEFERRED_WORK_ALLOW_DIAGNOSTIC_FAMILIES:-"pre-save-search-live-collapse rich-text-suffix-corruption"}
MAX_ACTIVE_JOBS=${RTC_DEFERRED_WORK_MAX_ACTIVE_JOBS:-2}
MAX_ACTIVE_DIAGNOSTIC_JOBS=${RTC_DEFERRED_WORK_MAX_ACTIVE_DIAGNOSTIC_JOBS:-1}
CYCLE_SLEEP_SECONDS=${RTC_DEFERRED_WORK_CYCLE_SLEEP_SECONDS:-900}
MIN_FAMILY_INTERVAL_SECONDS=${RTC_DEFERRED_WORK_MIN_FAMILY_INTERVAL_SECONDS:-1800}
DUPLICATE_HEAD_COOLDOWN_SECONDS=${RTC_DEFERRED_WORK_DUPLICATE_HEAD_COOLDOWN_SECONDS:-21600}
FAMILY_LAUNCH_WINDOW_SECONDS=${RTC_DEFERRED_WORK_FAMILY_LAUNCH_WINDOW_SECONDS:-43200}
FAMILY_MAX_LAUNCHES_PER_WINDOW=${RTC_DEFERRED_WORK_FAMILY_MAX_LAUNCHES_PER_WINDOW:-8}
ARTIFACT_HOLD_SECONDS=${RTC_DEFERRED_WORK_ARTIFACT_HOLD_SECONDS:-43200}
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

family_is_diagnostic() {
	case "$1" in
		pre-save-search-live-collapse|rich-text-suffix-corruption)
			return 0
			;;
		*)
			return 1
			;;
	esac
}

active_diagnostic_sessions() {
	tmux ls 2>/dev/null |
		awk -F: '
			/^rtc-deferred-job-pre-save-search-live-collapse-/ { count++ }
			/^rtc-deferred-job-rich-text-suffix-corruption-/ { count++ }
			END { print count + 0 }
		'
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

family_launches_in_window() {
	local family=$1 now
	now=$(date -u +%s)
	awk -F '\t' -v family="$family" -v now="$now" -v window="$FAMILY_LAUNCH_WINDOW_SECONDS" '
		$1 ~ /^[0-9]+$/ && $2 == family && now - $1 < window { count++ }
		END { print count + 0 }
	' "$STATE" 2>/dev/null
}

family_launch_budget_exhausted() {
	local family=$1
	[ "$(family_launches_in_window "$family")" -ge "$FAMILY_MAX_LAUNCHES_PER_WINDOW" ]
}

family_launch_budget_summary() {
	local family=$1
	printf 'recent_%ss=%s max=%s' \
		"$FAMILY_LAUNCH_WINDOW_SECONDS" \
		"$(family_launches_in_window "$family")" \
		"$FAMILY_MAX_LAUNCHES_PER_WINDOW"
}

family_duplicate_head_cooldown() {
	local family=$1 now
	now=$(date -u +%s)
	git -C "$SRC" for-each-ref --sort=-creatordate --format='%(creatordate:unix)%09%(objectname:short)' "refs/heads/deferred/rtc-$family-*" 2>/dev/null |
		head -3 |
		awk -F '\t' -v now="$now" -v cooldown="$DUPLICATE_HEAD_COOLDOWN_SECONDS" '
			NR == 1 { latest = $1; sha = $2 }
			{ n++; if ( $2 == sha ) { same++ } }
			END {
				exit !( n >= 3 && same == n && now - latest < cooldown )
			}
		'
}

family_duplicate_head_summary() {
	local family=$1
	git -C "$SRC" for-each-ref --sort=-creatordate --format='%(creatordate:iso8601)%09%(refname:short)%09%(objectname:short)' "refs/heads/deferred/rtc-$family-*" 2>/dev/null |
		head -3 |
		awk -F '\t' '
			NR == 1 { latest = $1; sha = $3 }
			{ n++; if ( $3 == sha ) { same++ } }
			END {
				if ( n == 0 ) {
					print "none"
				} else if ( n >= 3 && same == n ) {
					print "cooldown latest=" latest " duplicate_head=" sha
				} else {
					print "fresh-or-varied latest=" latest " head=" sha
				}
			}
		'
}

latest_family_artifact() {
	local family=$1 name=$2
	[ -d "$BASE/cycles" ] || return 0
	find "$BASE/cycles" -mindepth 3 -maxdepth 3 -type f -path "*/$family/$name" -size +0c -printf '%T@\t%p\n' 2>/dev/null |
		sort -n |
		tail -1 |
		cut -f2-
}

latest_family_manifest() {
	latest_family_artifact "$1" push-manifest.tsv
}

latest_family_report() {
	latest_family_artifact "$1" "$1.report.md"
}

family_manifest_hold() {
	local family=$1 manifest now mtime
	manifest=$(latest_family_manifest "$family" || true)
	[ -n "$manifest" ] || return 1
	now=$(date -u +%s)
	mtime=$(stat -c %Y "$manifest" 2>/dev/null || printf '0')
	[ "$mtime" -gt 0 ] && [ $(( now - mtime )) -lt "$ARTIFACT_HOLD_SECONDS" ]
}

family_manifest_hold_summary() {
	local family=$1 manifest now mtime age
	manifest=$(latest_family_manifest "$family" || true)
	if [ -z "$manifest" ]; then
		printf 'none'
		return
	fi
	now=$(date -u +%s)
	mtime=$(stat -c %Y "$manifest" 2>/dev/null || printf '0')
	age=$(( now - mtime ))
	printf 'age_seconds=%s hold_seconds=%s path=%s' "$age" "$ARTIFACT_HOLD_SECONDS" "$manifest"
}

family_hold_reason() {
	local family=$1
	if ! family_should_launch "$family"; then
		case "$family" in
			malformed-save-payload)
				printf 'downscoped:covered-by-pr06b-minimal'
				;;
			http-room-isolation)
				printf 'downscoped:covered-by-pr02a-without-fresh-evidence'
				;;
			*)
				printf 'disabled'
				;;
		esac
		return
	fi
	if family_manifest_hold "$family"; then
		printf 'manifest-hold:%s' "$(family_manifest_hold_summary "$family")"
		return
	fi
	if family_duplicate_head_cooldown "$family"; then
		printf 'duplicate-head-cooldown:%s' "$(family_duplicate_head_summary "$family")"
		return
	fi
	if family_launch_budget_exhausted "$family"; then
		printf 'launch-budget-exhausted:%s' "$(family_launch_budget_summary "$family")"
		return
	fi
	printf 'none'
}

family_queue_state() {
	local family=$1 reason
	reason=$(family_hold_reason "$family")
	case "$reason" in
		none)
			printf 'eligible'
			;;
		manifest-hold:*)
			printf 'single-flight-held'
			;;
		duplicate-head-cooldown:*|launch-budget-exhausted:*)
			printf 'cooldown-held'
			;;
		downscoped:*)
			printf 'downscoped'
			;;
		*)
			printf 'held'
			;;
	esac
}

write_deferred_control() {
	local family
	{
		printf 'generated_at\tfamily\tstate\thold_reason\tlatest_manifest\tlatest_report\tlaunch_budget\tduplicate_head\n'
		for family in $FAMILIES; do
			printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
				"$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
				"$family" \
				"$(family_queue_state "$family")" \
				"$(family_hold_reason "$family")" \
				"$(latest_family_manifest "$family" || true)" \
				"$(latest_family_report "$family" || true)" \
				"$(family_launch_budget_summary "$family")" \
				"$(family_duplicate_head_summary "$family")"
		done
	} > "$CONTROL.tmp"
	mv "$CONTROL.tmp" "$CONTROL"
}

family_should_launch() {
	case "$1" in
		malformed-save-payload|http-room-isolation)
			return 1
			;;
		pre-save-search-live-collapse|rich-text-suffix-corruption)
			local family allowed
			family=$1
			for allowed in $ALLOW_DIAGNOSTIC_FAMILIES; do
				if [ "$allowed" = "$family" ]; then
					return 0
				fi
			done
			return 1
			;;
		*)
			return 0
			;;
	esac
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
			state=$(family_queue_state "$family")
			case "$family" in
				reload-hydration)
					if [ "$state" = "single-flight-held" ]; then
						printf '%s\t%s\theld\tmanifest exists; progress must be manifest adoption, exact-stack replay, owner evidence, green stack adoption, or explicit downscope\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$family" "$coverage"
					else
						printf '%s\t%s\thigh\treload/post-save residuals need exact-stack replay or product-owner evidence; do not interval-relaunch after manifest\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$family" "$coverage"
					fi
					;;
				pre-save-search-live-collapse)
					if [ "$state" = "single-flight-held" ] || [ "$state" = "cooldown-held" ]; then
						printf '%s\t%s\theld\tdiagnostic candidate exists; require focused replay, owner evidence, green stack adoption, or explicit downscope before relaunch\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$family" "$coverage"
					else
						printf '%s\t%s\tdiagnostic\tdiagnostic branch exists; product promotion waits for focused replay to identify product owner\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$family" "$coverage"
					fi
					;;
				rich-text-suffix-corruption)
					if [ "$state" = "single-flight-held" ] || [ "$state" = "cooldown-held" ]; then
						printf '%s\t%s\theld\tdiagnostic candidate exists; require replay evidence or explicit downscope before relaunch\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$family" "$coverage"
					else
						printf '%s\t%s\tdiagnostic\tdiagnostic branch exists; replay evidence or explicit downscope decision needed before product promotion\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$family" "$coverage"
					fi
					;;
				malformed-save-payload)
					printf '%s\t%s\tdownscoped\tcovered by canonical PR06B minimal; raw deferred malformed-save heads are superseded\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$family" "$coverage"
					;;
				http-room-isolation)
					printf '%s\t%s\tdownscoped\tready PR02A exists; no fresh healthy-user HTTP room-isolation product evidence\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$family" "$coverage"
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
		echo "## Productive Analysis Control Feed"
		echo "Rows here are controller inputs. If a row targets deferred work or this family, act on it or explicitly reject it with evidence."
		if [ -s "$PRODUCTIVE_ANALYSIS_BASE/current-report.md" ]; then
			sed -n '1,220p' "$PRODUCTIVE_ANALYSIS_BASE/current-report.md"
		else
			echo "missing current productive analysis report"
		fi
		if [ -s "$PRODUCTIVE_ANALYSIS_BASE/current-actions.tsv" ]; then
			echo
			echo "### Productive Action TSV"
			sed -n '1,120p' "$PRODUCTIVE_ANALYSIS_BASE/current-actions.tsv"
		fi
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
2a. Treat Productive Analysis Control Feed rows in the context as controller input. If a row targets this family or deferred work generally, either implement the smallest safe action or explicitly reject it with evidence in the report.
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
		echo "- max active diagnostic jobs: $MAX_ACTIVE_DIAGNOSTIC_JOBS"
		echo "- active deferred jobs: $(active_deferred_sessions)"
		echo "- active diagnostic deferred jobs: $(active_diagnostic_sessions)"
		echo "- cycle sleep seconds: $CYCLE_SLEEP_SECONDS"
		echo "- min family interval seconds: $MIN_FAMILY_INTERVAL_SECONDS"
		echo "- duplicate head cooldown seconds: $DUPLICATE_HEAD_COOLDOWN_SECONDS"
		echo "- family launch window seconds: $FAMILY_LAUNCH_WINDOW_SECONDS"
		echo "- max launches per family window: $FAMILY_MAX_LAUNCHES_PER_WINDOW"
		echo "- artifact hold seconds: $ARTIFACT_HOLD_SECONDS"
		echo "- loop pid: $$"
		echo "- loop script: $0"
		echo "- loop script mtime: $(stat -c %y "$0" 2>/dev/null || true)"
		echo "- next family cursor: $(cat "$CURSOR_STATE" 2>/dev/null || printf '0')"
		echo "- current coverage output: ${coverage:-missing}"
		echo
		echo "## Queue"
		sed -n '1,220p' "$QUEUE" 2>/dev/null || true
		echo
		echo "## Control State"
		sed -n '1,220p' "$CONTROL" 2>/dev/null || true
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
			printf '%s\tduplicate_head=%s\n' "$family" "$(family_duplicate_head_summary "$family")"
			printf '%s\tlaunch_budget=%s\n' "$family" "$(family_launch_budget_summary "$family")"
			printf '%s\tmanifest_hold=%s\n' "$family" "$(family_manifest_hold_summary "$family")"
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
	write_deferred_control
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
		if ! family_should_launch "$family"; then
			log "family downscoped or disabled; not launching family=$family"
			continue
		fi
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
		if family_manifest_hold "$family"; then
			log "family has recent push manifest; holding relaunch family=$family summary=$(family_manifest_hold_summary "$family")"
			continue
		fi
		if family_duplicate_head_cooldown "$family"; then
			log "family duplicate-head cooldown family=$family summary=$(family_duplicate_head_summary "$family")"
			continue
		fi
		if family_launch_budget_exhausted "$family"; then
			log "family launch budget exhausted family=$family summary=$(family_launch_budget_summary "$family")"
			continue
		fi
		if family_is_diagnostic "$family" && [ "$(active_diagnostic_sessions)" -ge "$MAX_ACTIVE_DIAGNOSTIC_JOBS" ]; then
			log "diagnostic family throttled family=$family active_diagnostic=$(active_diagnostic_sessions) max=$MAX_ACTIVE_DIAGNOSTIC_JOBS"
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
