#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN_DIR=${HOME:-/home/exouser}/.local/bin
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin
SRC=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
BASE=/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516
COVERAGE_BASE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515
PR_SPLIT_BASE=/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515
DEFERRED_BASE=/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516
LOG="$BASE/logs/pr-finalization-loop.log"
STATE="$BASE/logs/finalization-launches.tsv"
STATUS="$BASE/current-finalization-status.md"
MAX_ACTIVE_JOBS=${RTC_PR_FINALIZATION_MAX_ACTIVE_JOBS:-2}
CYCLE_SLEEP_SECONDS=${RTC_PR_FINALIZATION_CYCLE_SLEEP_SECONDS:-300}
MIN_INTERVAL_SECONDS=${RTC_PR_FINALIZATION_MIN_INTERVAL_SECONDS:-600}
CODEX_MODEL=${RTC_PR_FINALIZATION_CODEX_MODEL:-gpt-5.5}
CODEX_REASONING_EFFORT=${RTC_PR_FINALIZATION_CODEX_REASONING_EFFORT:-xhigh}

mkdir -p "$BASE/logs" "$BASE/cycles" "$BASE/worktrees"
touch "$STATE"
export PATH="$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:$PATH"

log() {
	printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$LOG"
}

active_finalization_sessions() {
	tmux ls 2>/dev/null | awk -F: '/^rtc-pr-finalize-job-/ { count++ } END { print count + 0 }'
}

recently_launched() {
	local now
	now=$(date -u +%s)
	awk -F '\t' -v now="$now" -v interval="$MIN_INTERVAL_SECONDS" '
		{ last = $1 }
		END { exit !(last != "" && now - last < interval) }
	' "$STATE" 2>/dev/null
}

collect_context() {
	local cycle_dir=$1
	local branch=$2
	local worktree=$3
	local context=$cycle_dir/context.md
	local coverage
	coverage=$(cat "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)
	{
		echo "# RTC PR finalization context"
		echo
		echo "- generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
		echo "- live repo: $SRC"
		echo "- finalization worktree: $worktree"
		echo "- finalization branch: $branch"
		echo "- coverage-guided output: ${coverage:-missing}"
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
		git -C "$SRC" status --short --branch || true
		git -C "$SRC" log -1 --oneline || true
		echo
		echo "## Worktree Status"
		git -C "$worktree" status --short --branch || true
		git -C "$worktree" log -1 --oneline || true
		echo
		echo "## Local Candidate Branches"
		git -C "$SRC" for-each-ref --sort=refname --format='%(refname:short)%09%(objectname:short)%09%(committerdate:iso8601)%09%(subject)' \
			'refs/heads/deferred/rtc-*' 'refs/heads/try/rtc-*' 'refs/heads/fix/rtc-*' 'refs/heads/pr/rtc-*' 'refs/heads/finalize/rtc-*' 2>/dev/null || true
		echo
		echo "## Worktrees"
		git -C "$SRC" worktree list --porcelain 2>/dev/null || true
		echo
		echo "## Current PR Split Review"
		if [ -f "$PR_SPLIT_BASE/current-pr-split.md" ]; then
			sed -n '1,320p' "$PR_SPLIT_BASE/current-pr-split.md"
		else
			echo "missing $PR_SPLIT_BASE/current-pr-split.md"
		fi
		echo
		echo "## Local Publish Manifest"
		if [ -f "$BASE/latest-local-publish-manifest.tsv" ]; then
			sed -n '1,220p' "$BASE/latest-local-publish-manifest.tsv"
		else
			echo "missing $BASE/latest-local-publish-manifest.tsv"
		fi
		echo
		echo "## Deferred Work Status"
		if [ -f "$DEFERRED_BASE/current-deferred-status.md" ]; then
			sed -n '1,320p' "$DEFERRED_BASE/current-deferred-status.md"
		else
			echo "missing $DEFERRED_BASE/current-deferred-status.md"
		fi
		echo
		echo "## Coverage-Guided Status"
		if [ -n "$coverage" ] && [ -f "$coverage/novelty-status.md" ]; then
			sed -n '1,240p' "$coverage/novelty-status.md"
		else
			echo "missing"
		fi
		echo
		echo "## Recent Finalization Reports"
		find "$BASE/cycles" -maxdepth 2 -type f -name 'finalization.report.md' -print 2>/dev/null |
			sort |
			tail -6 |
			while read -r report; do
				echo "### $report"
				sed -n '1,220p' "$report" || true
				echo
			done
	} > "$context"
}

write_prompt() {
	local prompt=$1
	local branch=$2
	local worktree=$3
	local context=$4
	local report=$5
	cat > "$prompt" <<PROMPT
You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents. Work locally in this tmux/Codex process.

Finalization branch: $branch
Finalization worktree: $worktree
Context: $context
Final report path: $report

Task:
1. Read the context, current PR split review, deferred-work status, and local candidate branches.
2. Improve the PR readiness of the RTC fix project. The useful outputs are branch hygiene, branch split corrections, small final validation patches, and exact instructions for the local host to push branch refs to the danluu remote.
3. Detect proposed PR branches that accidentally contain the same full stack or unrelated commits. If it is safe, create or update local split branches so each branch contains only its intended PR content. Use non-destructive branches/worktrees; do not rewrite active fuzzing refs unless you are certain they are finalization-only refs.
4. For each proposed PR, record base ref, head branch, file count, diffstat, commit list, remaining validation, and whether it is ready, blocked, or deferred.
5. Pull completed deferred-family branches into the PR split only when their report contains concrete evidence and a reviewable diff. Otherwise leave them as deferred and state the next experiment needed.
6. Do not push to GitHub from Jetstream. The remote machine is not expected to have GitHub write access.
7. Avoid broad refactors and behavior-disable flags. Do not stop active fuzzing sessions.
8. Run focused syntax or diff checks for branches you create or modify.
9. Write a concise report to $report with headings: Summary, Proposed PR Branches, Branch Corrections, Deferred Work, Validation, Push Commands For Local Host, Risks.
PROMPT
}

launch_finalization_job() {
	local ts cycle_dir branch worktree prompt report codex_log session
	ts=$(date -u +%Y%m%dT%H%M%SZ)
	cycle_dir="$BASE/cycles/$ts"
	branch="finalize/rtc-pr-stack-$ts"
	worktree="$BASE/worktrees/pr-stack-$ts"
	mkdir -p "$cycle_dir"
	if ! git -C "$SRC" worktree add -b "$branch" "$worktree" HEAD > "$cycle_dir/worktree.log" 2>&1; then
		branch="finalize/rtc-pr-stack-$ts-detached"
		git -C "$SRC" worktree add --detach "$worktree" HEAD >> "$cycle_dir/worktree.log" 2>&1 || {
			log "failed to create finalization worktree; see $cycle_dir/worktree.log"
			return 1
		}
		git -C "$worktree" switch -c "$branch" >> "$cycle_dir/worktree.log" 2>&1 || true
	fi
	collect_context "$cycle_dir" "$branch" "$worktree"
	prompt="$cycle_dir/finalization.prompt.md"
	report="$cycle_dir/finalization.report.md"
	codex_log="$cycle_dir/finalization.stderr.log"
	write_prompt "$prompt" "$branch" "$worktree" "$cycle_dir/context.md" "$report"
	session="rtc-pr-finalize-job-$ts"
	printf '%s\t%s\t%s\t%s\n' "$(date -u +%s)" "$session" "$branch" "$worktree" >> "$STATE"
	log "launching $session branch=$branch worktree=$worktree"
	tmux new-session -d -s "$session" \
		"bash -lc 'cd \"$worktree\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\"; \"$CODEX_BIN_DIR/codex\" -a never exec --skip-git-repo-check -m \"$CODEX_MODEL\" -c model_reasoning_effort=\"$CODEX_REASONING_EFFORT\" -s danger-full-access < \"$prompt\" > \"$report\" 2> \"$codex_log\"'"
}

write_status() {
	{
		echo "# RTC PR Finalization Status"
		echo
		echo "- updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
		echo "- max active jobs: $MAX_ACTIVE_JOBS"
		echo "- active finalization jobs: $(active_finalization_sessions)"
		echo "- cycle sleep seconds: $CYCLE_SLEEP_SECONDS"
		echo "- min launch interval seconds: $MIN_INTERVAL_SECONDS"
		echo "- local publish manifest: $([ -s "$BASE/latest-local-publish-manifest.tsv" ] && printf present || printf missing)"
		echo
		echo "## Active Sessions"
		tmux ls 2>/dev/null | rg '^rtc-pr-finalize-job-' || true
		echo
		echo "## Launch History"
		tail -30 "$STATE" 2>/dev/null || true
		echo
		echo "## Candidate Branches"
		git -C "$SRC" for-each-ref --sort=-creatordate --format='%(creatordate:iso8601)%09%(refname:short)%09%(objectname:short)' \
			'refs/heads/deferred/rtc-*' 'refs/heads/finalize/rtc-*' 'refs/heads/pr/rtc-*' 'refs/heads/fix/rtc-*' 2>/dev/null |
			head -100 || true
		echo
		echo "## Recent Reports"
		find "$BASE/cycles" -maxdepth 2 -type f -name 'finalization.report.md' -print 2>/dev/null |
			sort |
			tail -8 |
			while read -r report; do
				echo "### $report"
				sed -n '1,220p' "$report" || true
				echo
			done
	} > "$STATUS.tmp"
	mv "$STATUS.tmp" "$STATUS"
}

log "PR finalization loop started pid=$$"
while true; do
	write_status
	if [ "$(active_finalization_sessions)" -lt "$MAX_ACTIVE_JOBS" ] && ! recently_launched; then
		launch_finalization_job || true
	else
		log "finalization launch skipped active=$(active_finalization_sessions)"
	fi
	write_status
	sleep "$CYCLE_SLEEP_SECONDS"
done
