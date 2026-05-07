#!/usr/bin/env bash
set -u

pass="$1"
sig="$2"
transport="$3"
bug_type="$4"
spec_path="$5"
source_result="$6"
previous_summary="$7"
worker_index="$8"

root="/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing"
known_base="/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-current-20260507"
repo_root="/Users/danluu/dev/fuzz/gutenberg"
state_dir="$root/state"
deep_dir="$root/deep-state/pass-$pass"
log_dir="$root/logs"
codex_bin="${CODEX_BIN:-$(command -v codex)}"
codex_retries="${RTC_BUG_DEEP_CODEX_RETRIES:-5}"
codex_retry_sleep="${RTC_BUG_DEEP_CODEX_RETRY_SLEEP:-20}"

mkdir -p "$deep_dir" "$log_dir"
log_file="$log_dir/deep-pass-$pass-$sig.log"
prompt_file="$deep_dir/$sig.prompt.md"
summary_file="$deep_dir/$sig.summary.md"

exec > >(tee -a "$log_file") 2>&1

branch="$(cat "$state_dir/$sig.branch" 2>/dev/null || true)"
pr_branch="$(cat "$state_dir/$sig.pr_branch" 2>/dev/null || true)"
if [ -z "$branch" ]; then
	slug="$(
		printf '%s' "$bug_type" |
			tr '[:upper:]' '[:lower:]' |
			sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-+/-/g' |
			cut -c 1-58
	)"
	[ -n "$slug" ] || slug="rtc-bug"
	branch="try/${slug}-${sig}"
	pr_branch="${branch}-pr"
fi

worktree="/Users/danluu/dev/fuzz/gutenberg-bug-${sig}"
port=$(( 9900 + worker_index ))
ws_port=$(( 20400 + worker_index * 8 ))

cat > "$prompt_file" <<EOF_PROMPT
You are a separate Codex instance running in tmux. Do not spawn in-session agents.

This is deep-analysis pass $pass for a likely or unresolved RTC fuzz bug from the full handoff manifest.

Inputs:

- Bug signature: \`$sig\`
- Bug type: \`$bug_type\`
- Transport: \`$transport\`
- Existing spec path: \`$spec_path\`
- Source result or manifest JSONL path: \`$source_result\`
- Previous pass summary: \`$previous_summary\`
- Known-fixes base: \`$known_base\`
- Known-fixes manifest: \`$root/KNOWN_FIXES_BASE_STATUS_20260507.md\`
- Explanation branch: \`$branch\`
- PR branch: \`$pr_branch\`
- Worktree: \`$worktree\`
- Suggested WP_ENV_PORT: \`$port\`
- Suggested WebSocket port: \`$ws_port\`
- Deep-pass summary to write: \`$summary_file\`

Goal:

Run a deeper independent analysis than the previous pass or coverage note. Some issues in this broad queue have had many passes; others were previously skipped because their refreshed repro passed or because they need repro reconstruction. Do not assume either case means the bug is false. Prioritize practical impact: analyze and report the likelihood that a real user would hit this issue in normal Gutenberg use.

Known-fixes requirement:

Use the current known-fixes base above, not the older May 5 refresh checkout. That base is intended to represent recent \`origin/trunk\` plus the #77716 body/comment/backlink-aware RTC fix set. The backlink-aware set includes merged fixes \`77658,77669,77675,77681,77865\` and proposed RTC PRs \`77662,77666,77673,77723,77724,77775,77866,77874,77876,77887,77889,77890,77920,77924\`; non-RTC/test-infra backlinks \`77726,77727,77893,77896\` are excluded unless they are directly needed for a test harness. Read the manifest before relying on the base. If the manifest says any proposed fix was skipped, superseded, or only included best-effort due to conflicts, check the relevant PR head separately before claiming that a bug survives all proposed fixes.

Re-read the previous summary if one exists, the source result or manifest row, logs, screenshots/traces, and relevant code. If \`$source_result\` is the handoff manifest, locate this signature's JSONL row before drawing conclusions. Try hard to disprove the bug first: distinguish product defects from readiness waits, action locator errors, malformed generated specs, environment failures, inverted assertions, and expected behavior. If it is not a real product bug, write \`$summary_file\` with the evidence and stop.

Required practical-impact section:

1. Classify the real-user likelihood as one of: \`high\`, \`medium\`, \`low\`, \`very-low\`, or \`unknown-needs-data\`.
2. Identify the natural user workflow that can trigger it, including the editor surface, collaboration/sync transport, block types, timing/concurrency requirements, save/reload requirements, and whether the workflow needs multiple browser tabs, multiple users, network delay, or unusual editing order.
3. Explain which prerequisites are common, rare, or artificial. Be explicit about what came only from fuzzing and what corresponds to ordinary editor behavior.
4. Estimate blast radius: content loss/corruption, duplicate content, UI-only inconsistency, persistence failure, save loop, performance/OOM risk, and recovery path.
5. List the strongest evidence for the likelihood classification and the strongest evidence against it.
6. Name the shortest additional experiment that would most improve confidence in the classification.

If it still looks real or unresolved:

1. Reproduce at every feasible level, including the lowest non-Playwright level that honestly exercises the defect and a Playwright repro using natural user actions. Do not inject malformed blocks, artificial faults, synthetic block trees, direct state mutation, or anything else a normal user could not do in the Playwright repro.
2. Confirm it is not fixed by the known-fixes base and record exact commands/results.
3. Create or update the explanation branch \`$branch\`, forked from \`origin/trunk\`, with a Markdown explanation under \`docs/fuzz-bugs/\`.
4. Do deep origin analysis with specific commits and PRs. Use \`git log\`, \`git blame\`, \`git show\`, and GitHub/gh metadata when useful. Explain how the bug was introduced.
5. Write an initial fix plan, audit it through kernel-maintainer robustness, Jepsen-style distributed-systems correctness, and Dan-Luu-style simplicity/performance/failure-mode skepticism, then revise the plan.
6. Make an annotated headless video or stitched-screen video with all relevant screens and action logs visible. Do not pop browser windows.
7. Create/update \`$pr_branch\` with commit order:
   - commit 1: all non-Playwright tests/repros, or an empty commit explaining why none is possible;
   - commit 2: the Playwright natural-user-action repro;
   - commit 3: the fix.
8. Push both branches to \`danluu\`. Do not open a PR.
9. Write \`$summary_file\` containing the explanation Markdown URL, \`$pr_branch\` URL, full local video path, exact commands used, and residual risk.

For pass $pass specifically, do not merely restate any previous pass. Add one of:

- a sharper real-user likelihood classification with concrete workflow evidence;
- an independent repro route;
- a narrower root-cause proof;
- a stronger negative classification;
- an improved fix;
- or a verification that the existing branch/video/fix already satisfy the requested standard.

Setup, only after the bug still looks real or unresolved:

\`\`\`bash
cd $repo_root
git fetch origin trunk
git worktree add -B "$branch" "$worktree" origin/trunk 2>/dev/null || true
cd "$worktree"
if [ -d "$known_base/node_modules" ]; then
	ln -s "$known_base/node_modules" node_modules 2>/dev/null || true
elif [ -d "$repo_root/node_modules" ]; then
	ln -s "$repo_root/node_modules" node_modules 2>/dev/null || true
fi
cp -R "$known_base/vendor" vendor 2>/dev/null || true
cp -R "$known_base/build" build 2>/dev/null || true
export WP_ENV_PORT=$port
export WP_BASE_URL=http://localhost:$port
export RTC_MANIFEST_WS_START_PORT=$ws_port
export RTC_MANIFEST_WS_FIXED_PORT=1
\`\`\`
EOF_PROMPT

echo "$(date -u +%FT%TZ) starting deep pass=$pass sig=$sig branch=$branch"
echo "$$" > "$deep_dir/$sig.wrapper.pid"
printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$sig" "$transport" "$bug_type" "$spec_path" "$source_result" "$previous_summary" > "$deep_dir/$sig.tsv"

attempt=1
status=1
while [ "$attempt" -le "$codex_retries" ]; do
	echo "$(date -u +%FT%TZ) codex attempt=$attempt/$codex_retries sig=$sig"
	/usr/bin/nice -n 8 "$codex_bin" exec \
		-c model_reasoning_effort=\"xhigh\" \
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

echo "$status" > "$deep_dir/$sig.exit"
if [ "$status" -eq 0 ]; then
	touch "$deep_dir/$sig.done"
	echo "$(date -u +%FT%TZ) finished deep pass=$pass sig=$sig status=$status"
else
	touch "$deep_dir/$sig.failed"
	echo "$(date -u +%FT%TZ) failed deep pass=$pass sig=$sig status=$status"
fi
exit "$status"
