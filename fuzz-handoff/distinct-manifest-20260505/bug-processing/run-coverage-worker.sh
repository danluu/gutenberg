#!/usr/bin/env bash
set -u

sig="$1"
category="$2"
transport="$3"
bug_type="$4"
spec_path="$5"
source_path="$6"
worker_index="$7"

root="/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing"
handoff_root="/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505"
known_base="/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-current-20260507"
repo_root="/Users/danluu/dev/fuzz/gutenberg"
state_dir="$root/coverage-state"
log_dir="$root/logs"
codex_bin="${CODEX_BIN:-$(command -v codex)}"

mkdir -p "$state_dir" "$log_dir"
prompt_file="$state_dir/$sig.prompt.md"
summary_file="$state_dir/$sig.summary.md"
log_file="$log_dir/coverage-$sig.log"

exec > >(tee -a "$log_file") 2>&1

cat > "$prompt_file" <<EOF_PROMPT
You are a separate Codex instance running in a tmux worker. Do not spawn in-session agents.

Task: perform missing handoff coverage triage for one likely-real RTC fuzz row that was not covered by the current eight confirmed-bug loop.

Inputs:

- Signature: \`$sig\`
- Queue category: \`$category\`
- Transport: \`$transport\`
- Bug type: \`$bug_type\`
- Spec path, if any: \`$spec_path\`
- Source path/result file: \`$source_path\`
- Handoff manifest: \`$handoff_root/likely-real-issues.jsonl\`
- Handoff markdown: \`$handoff_root/LIKELY_REAL_ISSUES_HANDOFF.md\`
- Known-fixes base: \`$known_base\`
- Known-fixes manifest: \`$root/KNOWN_FIXES_BASE_STATUS_20260507.md\`
- Coverage report to write: \`$summary_file\`

Why this worker exists:

The original handoff has 279 distinct likely-real groups. The previous dispatcher only queued refreshed rows whose canonical repro failed. It did not cover runnable repros that passed on the refreshed known-fixes base, and it did not cover non-runnable groups that need repro reconstruction. This worker should account for one of those missing rows.

Known-fixes requirement:

Use the current known-fixes base above, not the older May 5 refresh checkout. That base is intended to represent recent \`origin/trunk\` plus the #77716 body/comment/backlink-aware RTC fix set. Read \`$root/KNOWN_FIXES_BASE_STATUS_20260507.md\` before making a survives-known-fixes claim. If the conclusion depends on exact behavior of an overlapping open PR, also inspect that PR head directly.

Instructions:

1. Read the matching row in \`likely-real-issues.jsonl\` and the matching handoff section.
2. If \`$category\` is \`passed-runnable\`, inspect the refreshed result row and decide whether the canonical repro passing means:
   - likely fixed by known fixes,
   - likely non-reproducing/flaky and needs a stronger repro,
   - likely duplicate/subsumed by an existing confirmed issue,
   - likely invalid/harness-only,
   - or still likely real despite the pass.
3. If \`$category\` is \`nonrunnable\`, inspect the source status path, summary, related signatures, and any available artifacts. Decide whether a natural-user repro can be reconstructed, whether it is probably a duplicate/subsumed issue, or whether it lacks enough evidence.
4. Do not create bug/fix branches in this coverage pass unless the next action is absolutely clear and low-risk. Prefer writing an accurate triage/accounting report first.
5. Be skeptical about generated specs, readiness waits, stale absolute storage-state paths, HTTP-vs-WebSocket helper mismatches, direct state mutation, injected faults, and assertions that never reach the user workflow.

Write \`$summary_file\` with:

- \`Coverage decision:\` exactly one of \`fixed-by-known-fixes\`, \`duplicate-or-subsumed\`, \`needs-repro-reconstruction\`, \`likely-real-needs-full-bug-worker\`, \`invalid-or-harness-only\`, or \`unknown\`.
- \`Reason:\` concise evidence for the decision.
- \`Real-user likelihood:\` high/medium/low/very-low/unknown, with the natural workflow if known.
- \`Known-fixes check:\` what was checked and what remains unchecked.
- \`Next action:\` the specific next queue/action this signature should enter.
- \`Evidence:\` exact local paths, commands, result rows, related signatures, and any URLs found.

Use xhigh-level reasoning and keep the report compact but evidence-backed.
EOF_PROMPT

echo "$(date -u +%FT%TZ) coverage worker starting sig=$sig category=$category"
"/usr/bin/nice" -n 8 "$codex_bin" exec \
	-c model_reasoning_effort=\"xhigh\" \
	--dangerously-bypass-approvals-and-sandbox \
	-s danger-full-access \
	-C "$repo_root" \
	"$(cat "$prompt_file")"
status=$?
echo "$status" > "$state_dir/$sig.exit"
if [ "$status" -eq 0 ] && [ -f "$summary_file" ]; then
	touch "$state_dir/$sig.done"
else
	touch "$state_dir/$sig.failed"
fi
echo "$(date -u +%FT%TZ) coverage worker finished sig=$sig status=$status"
