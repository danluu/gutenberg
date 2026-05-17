#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN_DIR=${HOME:-/home/exouser}/.npm-global/bin
ALT_CODEX_BIN_DIR=${HOME:-/home/exouser}/.local/bin
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin
TMUX="/usr/bin/tmux -L rtc-fuzz"

SRC=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
BASE=/media/volume/danluu-fuzz-data/rtc-fresh-pr-split-from-scratch-20260517
PR_SPLIT_BASE=/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515
FINALIZATION_BASE=/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516
DEFERRED_BASE=/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516
CRITICAL_BASE=/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517
COVERAGE_BASE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515
RESOURCE_BASE=/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516
FIX_STATUS_INPUT=/media/volume/danluu-fuzz-data/rtc-fix-pr-status-report-review-20260516/input/rtc-jetstream2-fix-pr-status-20260515.md

FRESH_ITERATIONS=${RTC_FRESH_PR_SPLIT_ITERATIONS:-40}
COMPARE_ITERATIONS=${RTC_FRESH_PR_COMPARE_ITERATIONS:-5}
MAX_PARALLEL=${RTC_FRESH_PR_MAX_PARALLEL:-6}
MODEL=${RTC_FRESH_PR_CODEX_MODEL:-gpt-5.5}
REASONING=${RTC_FRESH_PR_REASONING:-xhigh}
CODEX_TIMEOUT_SECONDS=${RTC_FRESH_PR_CODEX_TIMEOUT_SECONDS:-7200}

PERSONAS=(
  "linus torvalds"
  "kyle kingsbury"
  "marc brooker"
  "dan luu"
  "tptacek"
  "contrarian"
)

mkdir -p "$BASE/logs" "$BASE/runs" "$BASE/worktrees" "$BASE/publish"
export PATH="$CODEX_BIN_DIR:$ALT_CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:$PATH"

STATUS=$BASE/status.md
LOG=$BASE/logs/fresh-pr-split-loop.log
LATEST_FRESH=$BASE/latest-fresh-pr-set.md
LATEST_COMPARE=$BASE/latest-comparison.md
FINAL_REPORT=$BASE/final-report.md
DONE_MARKER=$BASE/done

log() {
  printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"
}

slugify() {
  printf '%s' "$1" | tr '[:upper:] /_:' '[:lower:]----' | tr -cd 'a-z0-9-' | sed -e 's/--*/-/g' -e 's/^-//' -e 's/-$//'
}

write_status() {
  local phase="$1"
  local detail="$2"
  {
    echo "# Fresh RTC PR Split From Scratch"
    echo
    echo "- updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "- phase: $phase"
    echo "- detail: $detail"
    echo "- requested fresh iterations: $FRESH_ITERATIONS"
    echo "- requested comparison iterations: $COMPARE_ITERATIONS"
    echo "- max persona parallelism: $MAX_PARALLEL"
    echo "- base: $BASE"
    echo "- final report: $FINAL_REPORT"
    echo "- done marker: $DONE_MARKER"
    echo
    echo "## Active Fresh PR Sessions"
    $TMUX ls 2>/dev/null | rg '^rtc-fresh-pr-' || true
    echo
    echo "## Latest Fresh Candidate"
    if [ -s "$LATEST_FRESH" ]; then
      sed -n '1,220p' "$LATEST_FRESH"
    else
      echo "No fresh candidate yet."
    fi
    echo
    echo "## Latest Comparison"
    if [ -s "$LATEST_COMPARE" ]; then
      sed -n '1,220p' "$LATEST_COMPARE"
    else
      echo "No comparison yet."
    fi
    echo
    echo "## Recent Log"
    tail -80 "$LOG" 2>/dev/null || true
  } > "$STATUS.tmp"
  mv "$STATUS.tmp" "$STATUS"
}

extract_handoff() {
  git -C "$SRC" show rtc-likely-real-bug-handoff-20260514:docs/explanations/architecture/rtc-likely-real-bug-handoff-20260514.md 2>/dev/null ||
    git -C "$SRC" show origin/rtc-likely-real-bug-handoff-20260514:docs/explanations/architecture/rtc-likely-real-bug-handoff-20260514.md 2>/dev/null ||
    sed -n '1,260p' "$SRC/docs/explanations/architecture/rtc-likely-real-bug-handoff-20260514.md" 2>/dev/null ||
    echo "handoff file unavailable"
}

collect_context() {
  local run_dir="$1"
  local mode="$2"
  local context="$run_dir/context.md"
  local coverage_root
  coverage_root="$(sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)"
  {
    echo "# Fresh RTC PR Split Context"
    echo
    echo "- generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "- mode: $mode"
    echo "- source repo: $SRC"
    echo "- current coverage root: ${coverage_root:-missing}"
    echo
    echo "## Original Handoff Bugs"
    extract_handoff
    echo
    echo "## Current Existing Process Split"
    if [ -s "$PR_SPLIT_BASE/current-pr-split.md" ]; then
      sed -n '1,360p' "$PR_SPLIT_BASE/current-pr-split.md"
    else
      echo "missing current-pr-split.md"
    fi
    echo
    echo "## Latest Existing Process Synthesis"
    if [ -s "$PR_SPLIT_BASE/latest-synthesis.md" ]; then
      sed -n '1,320p' "$PR_SPLIT_BASE/latest-synthesis.md"
    else
      echo "missing latest-synthesis.md"
    fi
    echo
    echo "## Prior Published PR Status Report Input"
    if [ -s "$FIX_STATUS_INPUT" ]; then
      sed -n '1,360p' "$FIX_STATUS_INPUT"
    else
      echo "missing $FIX_STATUS_INPUT"
    fi
    echo
    echo "## Critical Path Executor"
    if [ -s "$CRITICAL_BASE/current-critical-path-status.md" ]; then
      sed -n '1,220p' "$CRITICAL_BASE/current-critical-path-status.md"
    else
      echo "missing critical path status"
    fi
    echo
    echo "## Deferred Work"
    if [ -s "$DEFERRED_BASE/current-deferred-status.md" ]; then
      sed -n '1,260p' "$DEFERRED_BASE/current-deferred-status.md"
    else
      echo "missing deferred status"
    fi
    echo
    echo "## Finalization and Local Publication"
    if [ -s "$FINALIZATION_BASE/current-finalization-status.md" ]; then
      sed -n '1,220p' "$FINALIZATION_BASE/current-finalization-status.md"
    fi
    echo
    if [ -s "$FINALIZATION_BASE/latest-local-publish-manifest.tsv" ]; then
      sed -n '1,220p' "$FINALIZATION_BASE/latest-local-publish-manifest.tsv"
    else
      echo "missing local publish manifest"
    fi
    echo
    echo "## Resource Status"
    if [ -s "$RESOURCE_BASE/resource-autoscaler-status.md" ]; then
      sed -n '1,180p' "$RESOURCE_BASE/resource-autoscaler-status.md"
    else
      echo "missing resource status"
    fi
    echo
    echo "## Coverage Novelty Status"
    if [ -n "$coverage_root" ] && [ -s "$coverage_root/novelty-status.md" ]; then
      sed -n '1,260p' "$coverage_root/novelty-status.md"
    else
      echo "missing novelty status"
    fi
    echo
    echo "## Existing Branch Inventory"
    git -C "$SRC" for-each-ref --sort=refname --format='%(refname:short)%09%(objectname:short)%09%(committerdate:iso8601)%09%(subject)' \
      'refs/heads/ready*' \
      'refs/heads/finalized*' \
      'refs/heads/cycle*' \
      'refs/heads/deferred/rtc-*' \
      'refs/heads/fresh-prset/*' \
      2>/dev/null | sed -n '1,260p' || true
    echo
    echo "## Previous Fresh Candidate"
    if [ -s "$LATEST_FRESH" ]; then
      sed -n '1,360p' "$LATEST_FRESH"
    else
      echo "No previous fresh candidate. Start from the bug list, not from the existing split."
    fi
    echo
    echo "## Previous Comparison"
    if [ -s "$LATEST_COMPARE" ]; then
      sed -n '1,300p' "$LATEST_COMPARE"
    else
      echo "No previous comparison."
    fi
  } > "$context"
}

run_codex_tmux() {
  local session="$1"
  local workdir="$2"
  local prompt="$3"
  local out="$4"
  local stderr="$5"
  local rc="$6"
  $TMUX new-session -d -s "$session" \
    "bash -lc 'cd \"$workdir\"; set +e; timeout \"$CODEX_TIMEOUT_SECONDS\" codex -a never exec --skip-git-repo-check -m \"$MODEL\" -c model_reasoning_effort=\"$REASONING\" -s danger-full-access < \"$prompt\" > \"$out\" 2> \"$stderr\"; code=\$?; printf \"%s\\n\" \"\$code\" > \"$rc\"; exit 0'"
}

wait_sessions() {
  local prefix="$1"
  while $TMUX ls 2>/dev/null | awk -F: -v prefix="$prefix" 'index($1, prefix) == 1 { found = 1 } END { exit found ? 0 : 1 }'; do
    sleep 15
  done
}

write_persona_prompt() {
  local prompt="$1"
  local persona="$2"
  local context="$3"
  local iteration="$4"
  cat > "$prompt" <<PROMPT
Reviewer: $persona

Task: build a fresh RTC bug-fix PR set from scratch.

This is fresh iteration $iteration of $FRESH_ITERATIONS. Read:
- $context

Do not preserve the existing PR split by default. Re-derive a maintainer-sized
set of PRs from the original handoff bugs, current fuzz results, current branch
inventory, deferred work, and publication evidence.

Constraints:
- Do not stop or interfere with active fuzzing or existing fix loops.
- Do not push to GitHub from Jetstream.
- Prefer small, reviewable, independently useful PRs.
- High-priority user-data-loss or stale-content bugs must not be skipped.
- Low-priority or speculative issues may be downscoped when that materially
  improves maintainability.
- A PR may reuse an existing branch only if the branch content and base really
  match that proposed PR. Otherwise propose a new fresh-prset branch or exact
  branch-creation command.
- Treat the existing split as evidence, not authority.

Return:
1. A proposed PR set from scratch, with PR title, bug families covered, branch
   source or creation command, expected diff size, and dependencies.
2. Bugs from the handoff that are fixed, still unfixed, intentionally skipped,
   or need more evidence.
3. Any branch-content risk such as stacked branches, duplicate branches, bad
   base refs, or oversized diffs.
4. The one concrete next adjustment the fresh split should make in the next
   iteration.
5. Any experiments or branch-shaping jobs that should run in parallel.

Do not edit files in this persona review.
PROMPT
}

write_synthesis_prompt() {
  local prompt="$1"
  local context="$2"
  local iteration="$3"
  local run_dir="$4"
  cat > "$prompt" <<PROMPT
Task: synthesize fresh RTC PR split iteration $iteration.

Read:
- $context
- Persona reports in $run_dir/reports
- Previous fresh candidate at $LATEST_FRESH if present

Produce a complete candidate fresh PR set. This should be usable by another
agent without reading all persona reports.

Rules:
- Re-derive from original bugs and evidence; do not preserve the current split
  unless it wins on reviewability and coverage.
- It is acceptable to converge on some existing branches if they are actually
  the best small PRs.
- If a branch is missing or wrong, specify the exact non-destructive branch
  operation under refs/heads/fresh-prset/... that should create it.
- If safe and clear, you may create local non-destructive branches under
  fresh-prset/iteration-$iteration/ in $SRC. Do not rewrite or delete any
  non-fresh-prset branch. Do not push to GitHub.

Write the answer with these headings:
- Summary
- Proposed Fresh PR Set
- Handoff Bug Coverage Matrix
- Branches To Reuse
- Branches To Create Or Reshape
- Deferred Or Skipped Bugs
- Evidence Still Needed
- Changes From Previous Fresh Iteration
- Next Iteration Focus
PROMPT
}

write_compare_persona_prompt() {
  local prompt="$1"
  local persona="$2"
  local context="$3"
  local iteration="$4"
  cat > "$prompt" <<PROMPT
Reviewer: $persona

Task: compare the fresh RTC PR set against the existing process output.

This is comparison iteration $iteration of $COMPARE_ITERATIONS. Read:
- $context
- Fresh candidate: $LATEST_FRESH
- Existing split: $PR_SPLIT_BASE/current-pr-split.md

Compare the two PR sets on:
1. Coverage of significant handoff bugs.
2. Reviewability and maintainer cognitive load.
3. Branch correctness, independence, base refs, and duplicate-content risk.
4. Risk of hiding an important bug in a too-large PR.
5. Risk of creating speculative or low-value PRs.
6. What should be adopted from the fresh set, from the existing set, or from
   neither.

Do not edit files.
PROMPT
}

write_compare_synthesis_prompt() {
  local prompt="$1"
  local context="$2"
  local iteration="$3"
  local run_dir="$4"
  cat > "$prompt" <<PROMPT
Task: synthesize comparison iteration $iteration.

Read:
- $context
- Comparison persona reports in $run_dir/reports
- Previous comparison at $LATEST_COMPARE if present

Write a concise but complete comparison of the fresh PR set and the existing
process PR set. Include:
- Advantages of the fresh PR set.
- Disadvantages of the fresh PR set.
- Advantages of the existing process set.
- Disadvantages of the existing process set.
- Which PRs or bug families should be adopted from each.
- Concrete branch/report work needed before either set is PR-ready.
PROMPT
}

write_final_prompt() {
  local prompt="$1"
  cat > "$prompt" <<PROMPT
Task: write the final published report for the fresh RTC PR split experiment.

Read:
- Fresh candidate: $LATEST_FRESH
- Latest comparison: $LATEST_COMPARE
- Existing split: $PR_SPLIT_BASE/current-pr-split.md
- Original handoff and context from the latest run directories under $BASE/runs

Write a publication-ready report to stdout with these headings:
- Summary
- Method
- Fresh PR Set
- Existing Process PR Set
- Bug Coverage Comparison
- Branch And Diff Risk
- Advantages Of The Fresh Set
- Disadvantages Of The Fresh Set
- Advantages Of The Existing Set
- Disadvantages Of The Existing Set
- Recommendation
- Follow-Up Work

The report must be specific: list proposed PRs, what bugs each fixes, which
important bugs remain uncovered, and why the recommendation is better for
maintainers. Do not claim GitHub PRs were opened.
PROMPT
}

run_fresh_iteration() {
  local i="$1"
  local stamp run_dir context persona slug prompt out err rc session
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  run_dir="$BASE/runs/fresh-$(printf '%03d' "$i")-$stamp"
  mkdir -p "$run_dir/prompts" "$run_dir/reports" "$run_dir/logs"
  collect_context "$run_dir" "fresh"
  context="$run_dir/context.md"
  for persona in "${PERSONAS[@]}"; do
    while [ "$($TMUX ls 2>/dev/null | awk -F: '/^rtc-fresh-pr-persona-/ { count++ } END { print count + 0 }')" -ge "$MAX_PARALLEL" ]; do
      sleep 5
    done
    slug="$(slugify "$persona")"
    prompt="$run_dir/prompts/$slug.md"
    out="$run_dir/reports/$slug.md"
    err="$run_dir/logs/$slug.stderr.log"
    rc="$run_dir/logs/$slug.rc"
    session="rtc-fresh-pr-persona-f$(printf '%03d' "$i")-$slug-$stamp"
    write_persona_prompt "$prompt" "$persona" "$context" "$i"
    run_codex_tmux "$session" "$SRC" "$prompt" "$out" "$err" "$rc"
  done
  wait_sessions "rtc-fresh-pr-persona-f$(printf '%03d' "$i")-"
  prompt="$run_dir/prompts/synthesis.md"
  out="$run_dir/synthesis.md"
  err="$run_dir/logs/synthesis.stderr.log"
  rc="$run_dir/logs/synthesis.rc"
  session="rtc-fresh-pr-synthesis-f$(printf '%03d' "$i")-$stamp"
  write_synthesis_prompt "$prompt" "$context" "$i" "$run_dir"
  run_codex_tmux "$session" "$SRC" "$prompt" "$out" "$err" "$rc"
  wait_sessions "$session"
  cp "$out" "$LATEST_FRESH"
}

run_compare_iteration() {
  local i="$1"
  local stamp run_dir context persona slug prompt out err rc session
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  run_dir="$BASE/runs/compare-$(printf '%03d' "$i")-$stamp"
  mkdir -p "$run_dir/prompts" "$run_dir/reports" "$run_dir/logs"
  collect_context "$run_dir" "compare"
  context="$run_dir/context.md"
  for persona in "${PERSONAS[@]}"; do
    while [ "$($TMUX ls 2>/dev/null | awk -F: '/^rtc-fresh-pr-compare-/ { count++ } END { print count + 0 }')" -ge "$MAX_PARALLEL" ]; do
      sleep 5
    done
    slug="$(slugify "$persona")"
    prompt="$run_dir/prompts/$slug.md"
    out="$run_dir/reports/$slug.md"
    err="$run_dir/logs/$slug.stderr.log"
    rc="$run_dir/logs/$slug.rc"
    session="rtc-fresh-pr-compare-c$(printf '%03d' "$i")-$slug-$stamp"
    write_compare_persona_prompt "$prompt" "$persona" "$context" "$i"
    run_codex_tmux "$session" "$SRC" "$prompt" "$out" "$err" "$rc"
  done
  wait_sessions "rtc-fresh-pr-compare-c$(printf '%03d' "$i")-"
  prompt="$run_dir/prompts/synthesis.md"
  out="$run_dir/synthesis.md"
  err="$run_dir/logs/synthesis.stderr.log"
  rc="$run_dir/logs/synthesis.rc"
  session="rtc-fresh-pr-compare-synthesis-c$(printf '%03d' "$i")-$stamp"
  write_compare_synthesis_prompt "$prompt" "$context" "$i" "$run_dir"
  run_codex_tmux "$session" "$SRC" "$prompt" "$out" "$err" "$rc"
  wait_sessions "$session"
  cp "$out" "$LATEST_COMPARE"
}

run_final_report() {
  local run_dir prompt err rc session
  run_dir="$BASE/runs/final-$(date -u +%Y%m%dT%H%M%SZ)"
  mkdir -p "$run_dir/prompts" "$run_dir/logs"
  prompt="$run_dir/prompts/final-report.md"
  err="$run_dir/logs/final-report.stderr.log"
  rc="$run_dir/logs/final-report.rc"
  session="rtc-fresh-pr-final-report-$(date -u +%Y%m%dT%H%M%SZ)"
  write_final_prompt "$prompt"
  run_codex_tmux "$session" "$SRC" "$prompt" "$FINAL_REPORT" "$err" "$rc"
  wait_sessions "$session"
}

main() {
  rm -f "$DONE_MARKER"
  write_status starting "fresh PR split loop starting"
  for i in $(seq 1 "$FRESH_ITERATIONS"); do
    log "starting fresh iteration $i/$FRESH_ITERATIONS"
    write_status fresh "iteration $i/$FRESH_ITERATIONS"
    run_fresh_iteration "$i"
    log "finished fresh iteration $i/$FRESH_ITERATIONS"
    write_status fresh "finished iteration $i/$FRESH_ITERATIONS"
  done
  for i in $(seq 1 "$COMPARE_ITERATIONS"); do
    log "starting comparison iteration $i/$COMPARE_ITERATIONS"
    write_status compare "iteration $i/$COMPARE_ITERATIONS"
    run_compare_iteration "$i"
    log "finished comparison iteration $i/$COMPARE_ITERATIONS"
    write_status compare "finished iteration $i/$COMPARE_ITERATIONS"
  done
  log "writing final report"
  write_status finalizing "writing final report"
  run_final_report
  date -u +%Y-%m-%dT%H:%M:%SZ > "$DONE_MARKER"
  write_status done "final report ready"
  log "done; final report at $FINAL_REPORT"
}

main "$@"
