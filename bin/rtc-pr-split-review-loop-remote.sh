#!/usr/bin/env bash
set -uo pipefail

BASE="${RTC_PR_SPLIT_REVIEW_BASE:-/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515}"
FIX_ROOT="${RTC_FIX_PLAN_ROOT:-/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514}"
FIX_REPO="${RTC_FIX_PLAN_REPO:-$FIX_ROOT/repo}"
FUZZ_ROOT="${RTC_FUZZ_ROOT:-/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515}"
FUZZ_REPO="${RTC_FUZZ_REPO:-$FUZZ_ROOT/repo}"
COVERAGE_BASE="${RTC_COVERAGE_BASE:-/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515}"
DEFERRED_BASE="${RTC_DEFERRED_WORK_BASE:-/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516}"
CODEX_BIN="${CODEX_BIN:-/home/exouser/.npm-global/bin/codex}"
MODEL="${RTC_PR_SPLIT_REVIEW_MODEL:-gpt-5.5}"
REASONING="${RTC_PR_SPLIT_REVIEW_REASONING:-xhigh}"
INTERVAL_SECONDS="${RTC_PR_SPLIT_REVIEW_INTERVAL_SECONDS:-5}"
MAX_PARALLEL="${RTC_PR_SPLIT_REVIEW_MAX_PARALLEL:-6}"
ACTION_EVERY_CYCLES="${RTC_PR_SPLIT_REVIEW_ACTION_EVERY_CYCLES:-2}"

export PATH="/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin:/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin:$PATH"

PERSONAS=(
  "linus torvalds"
  "kyle kingsbury"
  "marc brooker"
  "dan luu"
  "tptacek"
  "contrarian"
)

mkdir -p "$BASE/logs"

log() {
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$BASE/logs/loop.log"
}

acquire_singleton_lock() {
  local lock_file pid_file
  lock_file="$BASE/rtc-pr-split-review-loop.lock"
  pid_file="$BASE/rtc-pr-split-review-loop.pid"
  exec 9>"$lock_file"
  if ! flock -n 9; then
    log "another PR split review loop already holds $lock_file; exiting"
    exit 0
  fi
  printf '%s\n' "$$" > "$pid_file"
  trap 'rm -f "$BASE/rtc-pr-split-review-loop.pid"' EXIT
}

slugify() {
  printf '%s' "$1" | tr '[:upper:] ' '[:lower:]-' | tr -cd 'a-z0-9-'
}

latest_coverage_root() {
  if [ -f "$COVERAGE_BASE/current-output-dir.txt" ]; then
    sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt"
    return
  fi
  ls -td "$COVERAGE_BASE"/run-* 2>/dev/null | head -1 || true
}

independent_gate_has_work() {
  if grep -q 'No verified branch link yet' "$BASE/current-pr-split.md" 2>/dev/null; then
    return 0
  fi
  if grep -Eiq 'Promote|product candidate|maintainer-sized candidate|needs audited review branch|needs a maintainer-sized candidate branch' "$DEFERRED_BASE/current-deferred-status.md" 2>/dev/null; then
    return 0
  fi
  return 1
}

feedback_action_wait_only() {
  local out="$1"
  if grep -Eiq 'Jobs launched:[[:space:]]*$|Jobs launched:[[:space:]]*None|None now|Launch nothing|No jobs launched|Do not launch any new|launch no new' "$out" 2>/dev/null; then
    if ! grep -Eiq 'rtc-prsplit-progress-unblock|rtc-deferred-job-|tmux new-session|Launched Job|session.*rtc-|push manifest|branch audit|review branch' "$out" 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

write_independent_progress_gate() {
  echo "## Parallel Progress Gate"
  echo
  echo "Seed 1020002 may block final-stack fuzz, filing, and stack-wide validation. It must not block independent progress: review-branch audit/link creation, PR02A/PR5/PR11 branch shaping, deferred candidate promotion, push-manifest generation, or loop self-repair. A feedback action that only waits for 1020002 is invalid when this section has any actionable row."
  echo
  echo "### Missing verified branch links"
  if [ -f "$BASE/current-pr-split.md" ]; then
    grep -n 'No verified branch link yet' "$BASE/current-pr-split.md" 2>/dev/null | sed -n '1,80p' || true
  else
    echo "current-pr-split.md missing"
  fi
  echo
  echo "### Deferred promotion signals"
  if [ -f "$DEFERRED_BASE/current-deferred-status.md" ]; then
    rg -n 'Promote|product candidate|maintainer-sized candidate|needs audited review branch|needs a maintainer-sized candidate branch|Next Action|Validation passed|blocked/deferred' "$DEFERRED_BASE/current-deferred-status.md" 2>/dev/null | sed -n '1,180p' || true
  else
    echo "deferred status missing"
  fi
  echo
  echo "### Local candidate branches that can be audited or turned into push manifests"
  if [ -d "$FIX_REPO/.git" ]; then
    (
      cd "$FIX_REPO" &&
        git for-each-ref --sort=-committerdate --format='%(refname:short)|%(objectname:short)|%(committerdate:iso8601)|%(subject)' \
          refs/heads/fix refs/heads/shape refs/heads/ready refs/heads/review refs/heads/deferred refs/heads/candidate refs/heads/work 2>/dev/null |
          rg 'pr02a|pr05|pr5|pr11|entity|parser|linebreak|explicit-base|reload|hydration|malformed|http-room|rich-text|suffix|1020002|ready/rtc|review/rtc|deferred/rtc' |
          sed -n '1,180p'
    ) || true
  else
    echo "fix repo missing"
  fi
  echo
  echo "### Recent wait-only feedback actions"
  find "$BASE/runs" -mindepth 2 -maxdepth 2 -name feedback-action.md -type f 2>/dev/null |
    sort |
    tail -8 |
    while read -r file; do
      if grep -Eiq 'Jobs launched:[[:space:]]*None|No jobs launched|Do not launch any new|Launch nothing|None now' "$file"; then
        echo "#### $file"
        sed -n '1,80p' "$file"
      fi
    done
  echo
}

write_context() {
  local run_dir="$1"
  local coverage_root
  coverage_root="$(latest_coverage_root)"
  {
    echo "# RTC PR split review context"
    echo
    echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo
    echo "## Paths"
    echo
    echo "- Review base: $BASE"
    echo "- Current PR split seed: $BASE/current-pr-split.md"
    echo "- Fix-plan root: $FIX_ROOT"
    echo "- Fix-plan repo: $FIX_REPO"
    echo "- Fuzz repo: $FUZZ_REPO"
    echo "- Coverage root: ${coverage_root:-none}"
    echo
    write_independent_progress_gate
    echo
    echo "## Fix-plan repo status"
    echo
    if [ -d "$FIX_REPO/.git" ]; then
      ( cd "$FIX_REPO" && git status --short --branch && echo && git for-each-ref --format='%(refname:short)|%(objectname:short)|%(committerdate:iso8601)|%(subject)' refs/heads/fix refs/heads/try refs/heads/repro 2>/dev/null | sort | sed -n '1,220p' )
    else
      echo "Fix-plan repo not found."
    fi
    echo
    echo "## Latest coverage status"
    echo
    if [ -n "$coverage_root" ] && [ -f "$coverage_root/novelty-status.md" ]; then
      tail -140 "$coverage_root/novelty-status.md"
    else
      echo "No novelty-status.md found."
    fi
    echo
    echo "## Latest fix-planning summaries"
    echo
    find "$FIX_ROOT/analyses" -maxdepth 2 -type f \( -name 'primary-summary.md' -o -name 'response-layer-2-summary.md' -o -name 'implementation-review-*-summary.md' \) 2>/dev/null \
      | sort \
      | tail -36 \
      | while read -r file; do
          echo
          echo "### $file"
          sed -n '1,160p' "$file"
        done
  } > "$run_dir/context.md"
}

run_codex_review() {
  local run_dir="$1"
  local persona="$2"
  local slug
  slug="$(slugify "$persona")"
  local prompt="$run_dir/prompts/$slug.md"
  local out="$run_dir/reports/$slug.md"
  local err="$run_dir/logs/$slug.stderr.log"
  local rc_file="$run_dir/logs/$slug.rc"

  cat > "$prompt" <<EOF
Reviewer: $persona

Task: review the RTC fix/PR split and active Jetstream2 progress.

Read these files before answering:
- $BASE/current-pr-split.md
- $run_dir/context.md

The current split is a working hypothesis, not a constraint. Do not preserve it
by default. If new fixes, fuzz results, branch shape, reviewability, or coverage
evidence imply a smaller, clearer, more independent, or more complete split,
recommend replacing the split and explain the exact replacement.

Focus on whether the working PR split is still the best review shape and
complete enough for significant bugs, whether fuzz results or new branch state
should change it, and what concrete work should happen before the next review
cycle.

Also review the automation itself. If progress is stalling because one blocker
has serialized independent work, or because the loop is allowed to produce
wait-only feedback while the Parallel Progress Gate has actionable rows, call
that a loop bug and recommend the exact loop/prompt/job change. Seed 1020002 can
block final-stack fuzz and filing, but it must not block independent branch
audit/linking, deferred candidate promotion, or push-manifest generation.

Return:
1. Status: on track / blocked / needs split change.
2. Highest-risk PR split issue, including any case where preserving the current
   split is worse than a replacement split.
3. Significant bug family that is not adequately covered, if any.
4. Exact next action that should be run on Jetstream2, including independent
   branch/audit work if the final-stack blocker is active.
5. Whether additional Codex or fuzzing should be launched automatically, with the exact job if yes.
6. Whether the loop itself needs to be changed to prevent wait-only/no-progress
   cycles.

Do not edit files.
EOF

  (
    cd "$FIX_REPO" || exit 1
    "$CODEX_BIN" -a never exec --skip-git-repo-check -m "$MODEL" -c "model_reasoning_effort=$REASONING" -s danger-full-access < "$prompt" > "$out" 2> "$err"
    echo "$?" > "$rc_file"
  ) &
}

wait_for_parallel_slot() {
  while [ "$(jobs -pr | wc -l | tr -d ' ')" -ge "$MAX_PARALLEL" ]; do
    sleep 5
  done
}

run_synthesis() {
  local run_dir="$1"
  local prompt="$run_dir/prompts/synthesis.md"
  local out="$run_dir/synthesis.md"
  local err="$run_dir/logs/synthesis.stderr.log"
  local rc_file="$run_dir/logs/synthesis.rc"

  cat > "$prompt" <<EOF
Task: synthesize the RTC PR split review reports in:
$run_dir/reports

Also read:
- $BASE/current-pr-split.md
- $run_dir/context.md

Treat the current split as a working hypothesis, not an anchor. If the review
reports identify a better split, synthesize that replacement rather than
describing the old split as stable.

If the reviews identify a structural loop problem, such as serializing all
independent work behind seed 1020002 or allowing wait-only feedback while the
Parallel Progress Gate has actionable rows, synthesize that as an action item.
Do not let "wait for active diagnostic" be the only next action unless the
Parallel Progress Gate is empty.

Return:
1. Overall status.
2. Consensus changes to the PR split, including replacement splits, merges,
   further splits, reordered stacks, or dropped low-priority PRs.
3. Concrete next actions before the next review cycle, separated into
   final-stack-blocked work and independent parallel work.
4. Any automatic Codex/fuzzing jobs that should be launched.
5. One-paragraph progress note suitable for another agent.

Do not edit files.
EOF

  (
    cd "$FIX_REPO" || exit 1
    "$CODEX_BIN" -a never exec --skip-git-repo-check -m "$MODEL" -c "model_reasoning_effort=$REASONING" -s danger-full-access < "$prompt" > "$out" 2> "$err"
    echo "$?" > "$rc_file"
  )
}

run_feedback_action() {
  local run_dir="$1"
  local cycle_index="$2"
  local prompt="$run_dir/prompts/feedback-action.md"
  local out="$run_dir/feedback-action.md"
  local err="$run_dir/logs/feedback-action.stderr.log"
  local rc_file="$run_dir/logs/feedback-action.rc"
  local recent_runs
  recent_runs="$(find "$BASE/runs" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort | tail -2)"

  cat > "$prompt" <<EOF
Task: apply the RTC PR split review feedback after two continuous review iterations.

Cycle index: $cycle_index

Read:
- $BASE/current-pr-split.md
- $run_dir/context.md
- The latest two review runs:
$recent_runs

Use the persona reviews and syntheses from those two runs to decide whether the
PR split, work queue, or next Jetstream2 jobs need to change now.

Hard progress rule:
- Seed 1020002 blocks final-stack fuzz, filing, and rebuilt full-stack
  validation only.
- Seed 1020002 does not block independent review-branch audit/linking, PR02A or
  PR5/PR11 branch shaping, deferred candidate promotion, push-manifest
  generation for the local machine, or loop self-repair.
- If the Parallel Progress Gate in context.md has actionable rows, a wait-only
  feedback action is invalid. Launch or create at least one bounded independent
  action, or write proof that every gate row is stale/inactionable.
- If the loop/prompt itself caused serial waiting, fix the loop or write a
  bounded loop-repair job. Do not merely note the structural issue.

The existing split is not privileged. If the latest evidence supports a better
split, update the split document toward that replacement. Do not require the
replacement to keep old PR numbers, old stack boundaries, or old branch grouping
when a different shape is easier to review or covers significant bugs better.

You may edit only files under:
- $BASE
- $DEFERRED_BASE

Do not edit product code in $FIX_REPO or $FUZZ_REPO directly in this action
pass. If product-code or fuzz changes are needed, write a concrete next-action
job prompt/script under:
- $run_dir/jobs/

Remote Jetstream should not push to GitHub. When branch publication is needed,
write a push manifest under $run_dir/jobs/ with source branch/ref, intended
danluu branch name, base ref, diffstat, and validation evidence so this local
machine can push it.

If two consecutive review iterations agree on a PR split/documentation change,
update:
- $BASE/current-pr-split.md

If the two iterations agree that the current split is merely acceptable but a
bounded next-action job is needed to evaluate a better split, create and launch
that job instead of recording "split unchanged" as the only action.

If more Codex or fuzz work should be launched automatically, create a bounded
tmux job under $run_dir/jobs/ and launch it with:
/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin/tmux

Useful independent jobs include:
- branch-link audit for every "No verified branch link yet" row;
- push-manifest generation for local-only ready/review/deferred branches;
- deferred candidate promotion or downscope synthesis;
- review branch shaping for PR02A, PR5A-C, PR11A-E, or mature deferred
  candidates;
- loop repair when the review/action loop has become too serial.

Return:
1. What feedback was applied.
2. Whether $BASE/current-pr-split.md changed.
3. Any jobs launched, with tmux session names.
4. Any feedback intentionally deferred and why.
EOF

  mkdir -p "$run_dir/jobs"
  (
    cd "$FIX_REPO" || exit 1
    "$CODEX_BIN" -a never exec --skip-git-repo-check -m "$MODEL" -c "model_reasoning_effort=$REASONING" -s danger-full-access < "$prompt" > "$out" 2> "$err"
    echo "$?" > "$rc_file"
  )
  cp "$out" "$BASE/latest-feedback-action.md" 2>/dev/null || true
  if independent_gate_has_work && feedback_action_wait_only "$out"; then
    log "wait-only feedback while independent gate has work; launching progress unblock job"
    launch_progress_unblock_job "$run_dir" "$cycle_index" "$out"
  fi
}

launch_progress_unblock_job() {
  local run_dir="$1"
  local cycle_index="$2"
  local feedback_out="$3"
  local stamp session prompt runner out err rc
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  session="rtc-prsplit-progress-unblock-$stamp"
  mkdir -p "$run_dir/jobs/progress-unblock-$stamp"
  prompt="$run_dir/jobs/progress-unblock-$stamp/prompt.md"
  runner="$run_dir/jobs/progress-unblock-$stamp/run.sh"
  out="$run_dir/jobs/progress-unblock-$stamp/report.md"
  err="$run_dir/jobs/progress-unblock-$stamp/stderr.log"
  rc="$run_dir/jobs/progress-unblock-$stamp/rc"

  cat > "$prompt" <<EOF
Task: unblock RTC PR progress after a wait-only feedback action.

Cycle index: $cycle_index

Read:
- $BASE/current-pr-split.md
- $run_dir/context.md
- $run_dir/synthesis.md
- $feedback_out
- $DEFERRED_BASE/current-deferred-status.md

Problem:
The normal feedback action produced a wait-only/no-new-jobs outcome while the
Parallel Progress Gate still has actionable independent work. Fix that by doing
one or more independent, bounded actions that are not blocked by seed 1020002.

Allowed writes:
- $BASE
- $DEFERRED_BASE
- $run_dir/jobs/progress-unblock-$stamp

Do not edit product code in $FIX_REPO or $FUZZ_REPO directly. Do not push to
GitHub from Jetstream. For branch publication, write a push manifest for the
local machine.

Required output artifacts:
- $run_dir/jobs/progress-unblock-$stamp/report.md
- if branch publishing is needed:
  $run_dir/jobs/progress-unblock-$stamp/push-manifest.tsv
- if loop repair is needed:
  patch/update files under $BASE or $DEFERRED_BASE and run syntax checks.

Prioritize:
1. Audit and map every "No verified branch link yet" row to an existing local
   branch/ref or an explicit missing-work reason.
2. Generate push-manifest rows for local-only ready/review/deferred branches
   that should become danluu review branches.
3. Update current-pr-split.md to separate "final-stack-blocked by 1020002" from
   "parallel branch/audit work in progress".
4. If the loop itself would keep serializing work, patch the loop/prompt so a
   wait-only cycle is not valid while independent work exists.

Return a concise report with: Actions Taken, Branch/Manifest Output, Loop
Repair, Remaining Parallel Work, and What 1020002 Still Blocks.
EOF

  cat > "$runner" <<EOF
#!/usr/bin/env bash
set -uo pipefail
cd "$FIX_REPO" || exit 1
"$CODEX_BIN" -a never exec --skip-git-repo-check -m "$MODEL" -c "model_reasoning_effort=$REASONING" -s danger-full-access < "$prompt" > "$out" 2> "$err"
echo "\$?" > "$rc"
EOF
  chmod +x "$runner"
  /media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin/tmux new-session -d -s "$session" "bash '$runner'"
  printf '%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$session" "$run_dir/jobs/progress-unblock-$stamp" >> "$BASE/logs/progress-unblock-jobs.tsv"
}

run_cycle() {
  local stamp run_dir
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  run_dir="$BASE/runs/$stamp"
  mkdir -p "$run_dir/prompts" "$run_dir/reports" "$run_dir/logs"
  log "starting PR split review cycle $stamp"
  write_context "$run_dir"

  if [ ! -s "$BASE/current-pr-split.md" ]; then
    log "warning: $BASE/current-pr-split.md is missing or empty"
  fi

  for persona in "${PERSONAS[@]}"; do
    wait_for_parallel_slot
    run_codex_review "$run_dir" "$persona"
  done
  wait

  run_synthesis "$run_dir"
  ln -sfn "$run_dir" "$BASE/latest-run"
  cp "$run_dir/synthesis.md" "$BASE/latest-synthesis.md" 2>/dev/null || true
  log "finished PR split review cycle $stamp"
}

increment_cycle_count() {
  local count_file="$BASE/cycle-count.txt"
  local count=0
  if [ -f "$count_file" ]; then
    count="$(sed -n '1p' "$count_file" 2>/dev/null || echo 0)"
  fi
  case "$count" in
    ''|*[!0-9]*) count=0 ;;
  esac
  count=$(( count + 1 ))
  echo "$count" > "$count_file"
  printf '%s\n' "$count"
}

acquire_singleton_lock
log "loop started interval=${INTERVAL_SECONDS}s max_parallel=${MAX_PARALLEL} action_every_cycles=${ACTION_EVERY_CYCLES}"
while true; do
  (
    flock -n 9 || {
      log "previous review cycle still active; skipping"
      exit 0
    }
    run_cycle
    cycle_index="$(increment_cycle_count)"
    if [ "$ACTION_EVERY_CYCLES" -gt 0 ] && [ $(( cycle_index % ACTION_EVERY_CYCLES )) -eq 0 ]; then
      latest_run="$(readlink -f "$BASE/latest-run" 2>/dev/null || true)"
      if [ -n "$latest_run" ]; then
        log "running feedback action after cycle $cycle_index"
        run_feedback_action "$latest_run" "$cycle_index"
        log "finished feedback action after cycle $cycle_index"
      fi
    fi
  ) 9>"$BASE/loop.lock"
  if [ "$INTERVAL_SECONDS" -gt 0 ]; then
    sleep "$INTERVAL_SECONDS"
  fi
done
