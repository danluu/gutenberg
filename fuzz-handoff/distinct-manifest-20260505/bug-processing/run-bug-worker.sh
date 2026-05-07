#!/usr/bin/env bash
set -u

sig="$1"
transport="$2"
bug_type="$3"
spec_path="$4"
source_result="$5"
worker_index="$6"

root="/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing"
known_base="/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-current-20260507"
repo_root="/Users/danluu/dev/fuzz/gutenberg"
state_dir="$root/state"
log_dir="$root/logs"
codex_bin="${CODEX_BIN:-$(command -v codex)}"
codex_retries="${RTC_BUG_CODEX_RETRIES:-5}"
codex_retry_sleep="${RTC_BUG_CODEX_RETRY_SLEEP:-20}"

mkdir -p "$state_dir" "$log_dir"
log_file="$log_dir/$sig.log"
prompt_file="$state_dir/$sig.prompt.md"
summary_file="$state_dir/$sig.summary.md"

exec > >(tee -a "$log_file") 2>&1

slug="$(
	printf '%s' "$bug_type" |
		tr '[:upper:]' '[:lower:]' |
		sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-+/-/g' |
		cut -c 1-58
)"
[ -n "$slug" ] || slug="rtc-bug"
branch="try/${slug}-${sig}"
pr_branch="${branch}-pr"
worktree="/Users/danluu/dev/fuzz/gutenberg-bug-${sig}"
port=$(( 9800 + worker_index ))
ws_port=$(( 19800 + worker_index * 8 ))

cat > "$prompt_file" <<EOF_PROMPT
You are a separate Codex instance running in tmux. Do not spawn in-session agents.

Work only in this bug worktree unless explicitly reading the known-fixes base:

- Bug signature: \`$sig\`
- Bug type: \`$bug_type\`
- Transport: \`$transport\`
- Existing spec path: \`$spec_path\`
- Source result JSONL path: \`$source_result\`
- Known-fixes base: \`$known_base\`
- Known-fixes manifest: \`$root/KNOWN_FIXES_BASE_STATUS_20260507.md\`
- Explanation branch: \`$branch\`
- PR branch: \`$pr_branch\`
- Worktree: \`$worktree\`
- Suggested WP_ENV_PORT: \`$port\`
- Suggested WebSocket port: \`$ws_port\`

The coordinator already reran this against a refreshed known-fixes base, but older runs only used the May 5 refresh and were not backlink-aware. For new work, use the current known-fixes base above, not the older refresh checkout. That base is intended to represent recent \`origin/trunk\` plus the #77716 body/comment/backlink-aware RTC fix set. The backlink-aware set includes merged fixes \`77658,77669,77675,77681,77865\` and proposed RTC PRs \`77662,77666,77673,77723,77724,77775,77866,77874,77876,77887,77889,77890,77920,77924\`; non-RTC/test-infra backlinks \`77726,77727,77893,77896\` are excluded unless directly needed for the harness. Read the manifest before relying on the base. If the manifest says any proposed fix was skipped, superseded, or only included best-effort due to conflicts, check the relevant PR head separately before saying that a bug survives all proposed fixes.

Important ordering: first inspect the source result/logs/artifacts in the known-fixes base without creating a branch. Only create the trunk worktree/branches after you have evidence that the refreshed failure is a real product repro rather than a Playwright, readiness, timeout, setup, or other harness failure.

Required output:

1. Decide whether the repro is real. If it is not real, write \`$summary_file\` explaining why, include the source result details, and stop. Do not create branches for non-real/infra-only failures.
2. If real, make every feasible repro level:
   - Preserve or create a low-level/unit/integration repro if the defect can be driven below Playwright.
   - Create or refine a Playwright repro using only natural user actions. Do not inject malformed blocks, artificial faults, synthetic block trees, or direct state mutation unless that is strictly a lower-level unit test and is clearly separated from the Playwright repro.
   - The Playwright repro must show the bug with normal user actions in the editor.
3. In branch \`$branch\`, forked from \`origin/trunk\`, add a Markdown bug explanation under \`docs/fuzz-bugs/\`. It must include:
   - Repro instructions at each feasible level.
   - Confirmation that the bug still fails on the known-fixes base, with the exact command/result.
   - Deep root-cause analysis with specific commits and PRs. Use local \`git log\`, \`git blame\`, \`git show\`, and \`gh pr view\` or GitHub URLs where useful.
   - Explain how the introducing commit(s)/PR(s) created the bug.
   - Initial fix plan.
   - Audit of the plan through these lenses, without impersonating people: kernel-maintainer robustness, Jepsen-style distributed-systems correctness, and Dan-Luu-style simplicity/performance/failure-mode skepticism.
   - Revised fix plan informed by that audit.
4. Make an annotated video for the Playwright repro. It must run headless and must not pop up browser windows. Show all relevant editor screens at once where possible, include a running visible annotation/log of user actions and observed bug, and make sure text is readable and not clipped. Screenshots stitched into a video are acceptable. Put the final video under \`artifacts/fuzz-bug-videos/\` in the worktree or another stable absolute path.
5. Make branch \`$pr_branch\` with exactly this commit order:
   - Commit 1: all non-Playwright tests/repros. If no non-Playwright level is defensibly possible, make an empty commit whose message explains that.
   - Commit 2: the Playwright natural-user-action repro.
   - Commit 3: the fix.
6. Push both branches to \`danluu\`. Do not open a PR.
7. Write \`$summary_file\` with:
   - URL to the Markdown explanation on the \`danluu\` remote.
   - URL to the pushed \`$pr_branch\` branch.
   - Full local path to the final video.
   - The exact commands used for known-fix verification and final tests.
   - Any residual risk.

Setup guidance, after the source failure looks real:

\`\`\`bash
cd $repo_root
git fetch origin trunk
git worktree add -B "$branch" "$worktree" origin/trunk
cd "$worktree"
git remote -v
ln -s "$known_base/node_modules" node_modules 2>/dev/null || true
cp -R "$known_base/vendor" vendor 2>/dev/null || true
cp -R "$known_base/build" build 2>/dev/null || true
export WP_ENV_PORT=$port
export WP_BASE_URL=http://localhost:$port
export RTC_MANIFEST_WS_START_PORT=$ws_port
export RTC_MANIFEST_WS_FIXED_PORT=1
\`\`\`

Be careful with existing user changes. Do not touch unrelated worktrees. Do not use destructive git commands such as \`git reset --hard\` unless the worktree is one you created and you are resetting only your own branch setup.
EOF_PROMPT

echo "$(date -u +%FT%TZ) starting bug worker sig=$sig branch=$branch"
echo "bug_type=$bug_type"
echo "transport=$transport"
echo "spec_path=$spec_path"
echo "source_result=$source_result"
echo "worktree=$worktree port=$port ws_port=$ws_port"
echo "$$" > "$state_dir/$sig.wrapper.pid"
echo "$branch" > "$state_dir/$sig.branch"
echo "$pr_branch" > "$state_dir/$sig.pr_branch"

attempt=1
status=1
while [ "$attempt" -le "$codex_retries" ]; do
	echo "$(date -u +%FT%TZ) codex attempt=$attempt/$codex_retries sig=$sig"
	/usr/bin/nice -n 8 "$codex_bin" exec \
		--dangerously-bypass-approvals-and-sandbox \
		-s danger-full-access \
		-C "$repo_root" \
		"$(cat "$prompt_file")"
	status=$?
	[ "$status" -eq 0 ] && break

	if tail -200 "$log_file" | grep -q 'Failed to load cloud requirements'; then
		sleep_for=$(( codex_retry_sleep * attempt ))
		echo "$(date -u +%FT%TZ) transient codex cloud-requirements startup failure sig=$sig status=$status; retrying in ${sleep_for}s"
		sleep "$sleep_for"
		attempt=$(( attempt + 1 ))
		continue
	fi

	break
done

echo "$status" > "$state_dir/$sig.exit"
if [ "$status" -eq 0 ]; then
	touch "$state_dir/$sig.done"
	echo "$(date -u +%FT%TZ) finished bug worker sig=$sig status=$status"
else
	touch "$state_dir/$sig.failed"
	echo "$(date -u +%FT%TZ) failed bug worker sig=$sig status=$status"
fi
exit "$status"
