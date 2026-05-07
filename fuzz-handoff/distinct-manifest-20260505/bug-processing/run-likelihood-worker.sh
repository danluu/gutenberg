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
deep_root="$root/deep-state"
likelihood_root="$root/real-user-likelihood"
log_dir="$root/logs"
codex_bin="${CODEX_BIN:-$(command -v codex)}"
sleep_secs="${RTC_LIKELIHOOD_WORKER_SLEEP_SECS:-15}"

mkdir -p "$likelihood_root/$sig" "$log_dir"
log_file="$log_dir/likelihood-$sig.log"

exec > >(tee -a "$log_file") 2>&1

latest_summary_for() {
	find "$deep_root" -path "$deep_root/pass-*/$sig.summary.md" 2>/dev/null |
		awk -F'pass-' '
			{
				split($2, a, "/");
				print a[1] "\t" $0;
			}
		' |
		sort -n |
		tail -1 |
		cut -f2-
}

branch_for() {
	branch="$(cat "$state_dir/$sig.branch" 2>/dev/null || true)"
	if [ -n "$branch" ]; then
		printf '%s\n' "$branch"
		return
	fi
	slug="$(
		printf '%s' "$bug_type" |
			tr '[:upper:]' '[:lower:]' |
			sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-+/-/g' |
			cut -c 1-58
	)"
	[ -n "$slug" ] || slug="rtc-bug"
	printf 'try/%s-%s\n' "$slug" "$sig"
}

echo "$(date -u +%FT%TZ) likelihood worker starting sig=$sig transport=$transport"

iteration=1
while :; do
	run_id="$(date -u +%Y%m%dT%H%M%SZ)-$iteration"
	run_dir="$likelihood_root/$sig/$run_id"
	mkdir -p "$run_dir"
	prompt_file="$run_dir/prompt.md"
	summary_file="$run_dir/summary.md"
	previous_summary="$(latest_summary_for)"
	[ -n "$previous_summary" ] || previous_summary="$state_dir/$sig.summary.md"
	branch="$(branch_for)"
	pr_branch="${branch}-pr"

	cat > "$prompt_file" <<EOF_PROMPT
You are a separate Codex instance running in its own tmux session. Do not spawn in-session agents.

Task: repeatedly re-analyze the practical real-user likelihood of this confirmed RTC fuzz issue. This is analysis/reporting work, not branch rewriting. Do not modify or push branches unless you find a severe error in the existing artifact that must be corrected for the likelihood assessment to be meaningful.

Inputs:

- Bug signature: \`$sig\`
- Bug type: \`$bug_type\`
- Transport: \`$transport\`
- Existing spec path: \`$spec_path\`
- Source result JSONL path: \`$source_result\`
- Latest deep summary: \`$previous_summary\`
- Known-fixes base: \`$known_base\`
- Known-fixes manifest: \`$root/KNOWN_FIXES_BASE_STATUS_20260507.md\`
- Explanation branch: \`$branch\`
- PR branch: \`$pr_branch\`
- Report to write: \`$summary_file\`
- Main checkout: \`$repo_root\`

Focus:

Because many deep passes have already run, spend this pass on whether a real user is likely to hit this issue in practice. Read the previous summary, explanation branch, relevant tests, source result row, and code. Treat the existing confirmed-real classification as provisional: keep trying to falsify it, but do not spend the pass repeating generic branch/fix mechanics unless that affects practical likelihood.

Known-fixes requirement:

Use the current known-fixes base above, not the older May 5 refresh checkout. That base is intended to represent recent \`origin/trunk\` plus the #77716 body/comment/backlink-aware RTC fix set. The backlink-aware set includes merged fixes \`77658,77669,77675,77681,77865\` and proposed RTC PRs \`77662,77666,77673,77723,77724,77775,77866,77874,77876,77887,77889,77890,77920,77924\`; non-RTC/test-infra backlinks \`77726,77727,77893,77896\` are excluded unless they are directly needed for a test harness. Read the manifest before relying on the base. If the manifest says any proposed fix was skipped, superseded, or only included best-effort due to conflicts, check the relevant PR head separately before saying that a bug survives all proposed fixes.

Required output in \`$summary_file\`:

1. \`Likelihood:\` exactly one of \`high\`, \`medium\`, \`low\`, \`very-low\`, or \`unknown-needs-data\`.
2. \`Natural workflow:\` a concrete user workflow that can trigger the issue, or the reason no natural workflow is currently proven.
3. \`Prerequisites:\` what must be true for the bug to trigger, split into common, uncommon-but-realistic, rare, and fuzz-only/artificial.
4. \`Timing/concurrency:\` whether it needs multi-user collaboration, same-user multi-tab, HTTP polling vs WebSocket, reload/save timing, network delay, stale local state, or a specific editing order.
5. \`Blast radius:\` content loss/corruption, duplicates, dropped edits, save loop, UI-only inconsistency, performance/OOM, persistence after reload, and recovery path.
6. \`Evidence for likelihood:\` the strongest concrete evidence, with file paths, command results, or URLs.
7. \`Evidence against likelihood:\` the strongest counterevidence and uncertainty.
8. \`Confidence:\` high/medium/low, and the shortest additional experiment that would most improve it.
9. \`Delta from previous passes:\` what this pass added beyond the latest summary.

Do not use artificial injected faults, direct state mutation, malformed block fixtures, or non-user actions as evidence for likelihood unless you label them as lower-level evidence only. If you use a lower-level repro, map it back to ordinary editor behavior or say that no mapping has been shown.

Use xhigh-level reasoning, be skeptical, and write a compact but evidence-backed report.
EOF_PROMPT

	echo "$(date -u +%FT%TZ) likelihood run_id=$run_id sig=$sig summary=$summary_file"
	/usr/bin/nice -n 8 "$codex_bin" exec \
		-c model_reasoning_effort=\"xhigh\" \
		--dangerously-bypass-approvals-and-sandbox \
		-s danger-full-access \
		-C "$repo_root" \
		"$(cat "$prompt_file")"
	status=$?
	echo "$status" > "$run_dir/exit"
	echo "$(date -u +%FT%TZ) likelihood finished run_id=$run_id sig=$sig status=$status"

	iteration=$(( iteration + 1 ))
	sleep "$sleep_secs"
done
