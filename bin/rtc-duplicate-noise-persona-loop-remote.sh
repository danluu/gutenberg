#!/usr/bin/env bash
set -uo pipefail

BASE="${RTC_DUP_NOISE_BASE:-/media/volume/danluu-fuzz-data/rtc-duplicate-noise-persona-loop-20260516}"
FUZZ_REPO="${RTC_FUZZ_REPO:-/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo}"
COVERAGE_BASE="${RTC_COVERAGE_BASE:-/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515}"
CODEX_BIN="${CODEX_BIN:-/home/exouser/.npm-global/bin/codex}"
MODEL="${RTC_DUP_NOISE_MODEL:-gpt-5.5}"
REASONING="${RTC_DUP_NOISE_REASONING:-xhigh}"
INTERVAL_SECONDS="${RTC_DUP_NOISE_INTERVAL_SECONDS:-0}"
MAX_PARALLEL="${RTC_DUP_NOISE_MAX_PARALLEL:-6}"
ACTION_EVERY_CYCLES="${RTC_DUP_NOISE_ACTION_EVERY_CYCLES:-2}"

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

write_duplicate_noise_gate() {
  local coverage_root="$1"
  echo "## Current duplicate/noise action gate"
  echo
  echo "This loop is failing if current-run triage remains duplicate/noise dominated. Treat top duplicate family share >= 0.50 with zero visible likely-real failures, or pre_action_bootstrap_stall as the current-run top family after strict startup suppression, as ACTION-NEEDED. In that state, a review-only response is insufficient: identify the exact producer/consumer leak and make or restart a bounded control-plane change in the feedback action."
  echo
  if [ -n "$coverage_root" ] && [ -f "$coverage_root/novelty-status.md" ]; then
    awk '
      /^## (Current-run )?Triage Yield/ { in_section = 1; print; next }
      /^## / && in_section { exit }
      in_section { print }
    ' "$coverage_root/novelty-status.md"
  else
    echo "No current-run triage yield section found."
  fi
  echo
}

write_live_triage_state_summary() {
  local coverage_root="$1"
  local state_files=()
  echo "## Live triage state sample"
  echo
  if [ -n "$coverage_root" ] && [ -f "$coverage_root/.triage-watcher/state.json" ]; then
    state_files+=( "$coverage_root/.triage-watcher/state.json" )
  fi
  for state_file in \
    /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-*/.triage-watcher/state.json \
    /media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515/runs/*/*/.triage-watcher/state.json \
    /media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515/runs/*/*/.triage-watcher/state.json \
    /media/volume/danluu-fuzz-data/rtc-gap-booster-20260515/runs/*/*/.triage-watcher/state.json \
    /media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/*/jobs/outputs/*/coverage/.triage-watcher/state.json; do
    [ -f "$state_file" ] && state_files+=( "$state_file" )
  done
  printf '%s\n' "${state_files[@]}" |
    sort -u |
    tail -40 |
    while read -r state_file; do
      node - "$state_file" <<'NODE' 2>/dev/null || true
const fs = require( 'fs' );
const statePath = process.argv[ 2 ];
const state = JSON.parse( fs.readFileSync( statePath, 'utf8' ) );
const metrics = state.metrics || {};
const top = metrics.topSemanticFamilies?.[ 0 ] || {};
const suppressed = metrics.suppressedKnownNoise?.strictPreActionStartup || {};
const root = statePath.replace( /\/\.triage-watcher\/state\.json$/, '' );
console.log(
	[
		root,
		`signatures=${ metrics.signatureCount ?? Object.keys( state.signatures || {} ).length }`,
		`top=${ top.family || 'none' }:${ top.count ?? 0 }`,
		`share=${ metrics.topDuplicateFamilyShare ?? 0 }`,
		`likelyRealVisible=${ metrics.likelyRealVisible ?? 0 }`,
		`suppressedStrictStartup=${ suppressed.recordCount ?? 0 }/${ suppressed.identityCount ?? 0 }`,
	].join( ' | ' )
);
NODE
    done
  echo
}

write_context() {
  local run_dir="$1"
  local coverage_root
  coverage_root="$(latest_coverage_root)"
  {
    echo "# RTC duplicate/noise remediation context"
    echo
    echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo
    echo "## Objective"
    echo
    echo "Fix the high duplicate/noise share in Jetstream2 RTC fuzzing. The current top family is pre_action_bootstrap_stall, with late_session_awareness_stall, timeout, non-convergence, unknown, assertion, and linebreak noise behind it. The fix should reduce repeated duplicate/noise work without hiding likely-real product failures."
    echo
    echo "## Paths"
    echo
    echo "- Loop base: $BASE"
    echo "- Active fuzz repo: $FUZZ_REPO"
    echo "- Coverage base: $COVERAGE_BASE"
    echo "- Coverage root: ${coverage_root:-none}"
    echo
    write_duplicate_noise_gate "$coverage_root"
    write_live_triage_state_summary "$coverage_root"
    echo "## Active fuzz repo status"
    echo
    if [ -d "$FUZZ_REPO/.git" ]; then
      (
        cd "$FUZZ_REPO" &&
          git status --short --branch &&
          echo &&
          git log --oneline -8 &&
          echo &&
          git diff --stat
      )
    else
      echo "Active fuzz repo not found."
    fi
    echo
    echo "## Relevant fuzzer files"
    echo
    for file in \
      "$FUZZ_REPO/bin/rtc-browser-fuzz-novelty-monitor.mjs" \
      "$FUZZ_REPO/bin/rtc-browser-fuzz-supervisor.mjs" \
      "$FUZZ_REPO/bin/rtc-browser-fuzz-session-watchdog.mjs" \
      "$FUZZ_REPO/bin/rtc-browser-fuzz-triage-watcher.mjs" \
      "$FUZZ_REPO/bin/rtc-browser-fuzz-analysis-tier.mjs" \
      "$FUZZ_REPO/bin/rtc-browser-fuzz-deep-analysis-tier.mjs" \
      "$FUZZ_REPO/bin/rtc-browser-fuzz-live-analysis-monitor.mjs" \
      "$FUZZ_REPO/bin/rtc-browser-failure-analysis.mjs" \
      "$FUZZ_REPO/bin/rtc-browser-deep-triage.mjs"; do
      if [ -f "$file" ]; then
        echo "- $file"
      fi
    done
    echo
    echo "## Latest coverage status"
    echo
    if [ -n "$coverage_root" ] && [ -f "$coverage_root/novelty-status.md" ]; then
      tail -180 "$coverage_root/novelty-status.md"
    else
      echo "No novelty-status.md found."
    fi
    echo
    echo "## Supervisor groups"
    echo
    if [ -n "$coverage_root" ] && [ -f "$coverage_root/supervisor-groups.json" ]; then
      sed -n '1,260p' "$coverage_root/supervisor-groups.json"
    else
      echo "No supervisor-groups.json found."
    fi
    echo
    echo "## Recent novelty monitor log"
    echo
    if [ -n "$coverage_root" ] && [ -f "$coverage_root/novelty-monitor.log" ]; then
      tail -120 "$coverage_root/novelty-monitor.log"
    else
      echo "No novelty-monitor.log found."
    fi
    echo
    echo "## Recent coverage-guidance Codex reports"
    echo
    if [ -n "$coverage_root" ] && [ -d "$coverage_root/coverage-guidance-reports" ]; then
      find "$coverage_root/coverage-guidance-reports" -maxdepth 1 -type f | sort | tail -4 | while read -r file; do
        echo
        echo "### $file"
        sed -n '1,180p' "$file"
      done
    else
      echo "No coverage-guidance reports found."
    fi
  } > "$run_dir/context.md"
}

run_codex_review() {
  local run_dir="$1"
  local persona="$2"
  local tmux_prefix="$3"
  local slug
  slug="$(slugify "$persona")"
  local prompt="$run_dir/prompts/$slug.md"
  local out="$run_dir/reports/$slug.md"
  local err="$run_dir/logs/$slug.stderr.log"
  local rc_file="$run_dir/logs/$slug.rc"
  local run_script="$run_dir/logs/$slug.run.sh"
  local session="$tmux_prefix-$slug"

  cat > "$prompt" <<EOF
Name: $persona

Task: fix the Jetstream2 RTC fuzzer high duplicate/noise share problem.

Read before answering:
- $run_dir/context.md
- $FUZZ_REPO/bin/rtc-browser-fuzz-novelty-monitor.mjs
- $FUZZ_REPO/bin/rtc-browser-fuzz-supervisor.mjs if relevant
- $FUZZ_REPO/bin/rtc-browser-fuzz-triage-watcher.mjs if relevant
- $FUZZ_REPO/bin/rtc-browser-fuzz-analysis-tier.mjs if relevant
- $FUZZ_REPO/bin/rtc-browser-fuzz-deep-analysis-tier.mjs if relevant
- $FUZZ_REPO/bin/rtc-browser-fuzz-live-analysis-monitor.mjs if relevant
- $FUZZ_REPO/bin/rtc-browser-failure-analysis.mjs if relevant

The current problem is not merely reporting: fuzzing and triage are still dominated by repeated duplicate/noise families, especially pre_action_bootstrap_stall. The loop should distinguish current-run versus historical duplicates, avoid repeatedly feeding known noise into expensive triage, and steer browser capacity toward productive coverage without suppressing likely-real product failures.

Analyze the whole consumer path, not just the novelty monitor: producer/scheduler, triage watcher queue, analysis tier, deep-analysis tier, and live-analysis session monitor. If stale or strict current pre-action startup signatures can still be enqueued, analyzed, or used to launch Codex analysis, call out the exact consumer that leaks them.

Return:
1. Root cause, stated as concrete code/config behavior.
2. Smallest safe fix to implement now.
3. What must not be suppressed because it could hide a real bug.
4. Exact files/functions to change.
5. Exact validation or restart step.
6. Whether additional Codex/fuzzing should be launched automatically, with a bounded job if yes.

Do not edit files in this review pass.
EOF

  cat > "$run_script" <<EOF
#!/usr/bin/env bash
set -uo pipefail
cd "$FUZZ_REPO" || exit 1
"$CODEX_BIN" -a never exec --skip-git-repo-check -m "$MODEL" -c "model_reasoning_effort=$REASONING" -s danger-full-access < "$prompt" > "$out" 2> "$err"
rc=\$?
echo "\$rc" > "$rc_file"
exit "\$rc"
EOF
  chmod +x "$run_script"

  if tmux has-session -t "$session" 2>/dev/null; then
    tmux kill-session -t "$session" 2>/dev/null || true
  fi
  tmux new-session -d -s "$session" "$run_script"
  printf '%s\n' "$session" >> "$run_dir/logs/tmux-sessions.txt"
}

wait_for_parallel_slot() {
  local tmux_prefix="$1"
  while [ "$(active_review_sessions "$tmux_prefix")" -ge "$MAX_PARALLEL" ]; do
    sleep 5
  done
}

active_review_sessions() {
  local tmux_prefix="$1"
  tmux list-sessions -F '#S' 2>/dev/null | grep -c "^${tmux_prefix}-" || true
}

wait_for_review_sessions() {
  local run_dir="$1"
  local tmux_prefix="$2"
  local expected="${#PERSONAS[@]}"
  while true; do
    local completed
    completed="$(find "$run_dir/logs" -maxdepth 1 -type f -name '*.rc' ! -name 'synthesis.rc' ! -name 'feedback-action.rc' | wc -l | tr -d ' ')"
    if [ "$completed" -ge "$expected" ]; then
      break
    fi
    if [ "$(active_review_sessions "$tmux_prefix")" -eq 0 ]; then
      log "review tmux sessions ended with only $completed/$expected rc files"
      break
    fi
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
Task: synthesize the duplicate/noise remediation reports in:
$run_dir/reports

Also read:
- $run_dir/context.md

Return:
1. Consensus root cause.
2. Consensus smallest safe fix.
3. Any disagreement that should block action.
4. Concrete implementation plan for the next action pass.
5. One-paragraph status note suitable for another agent.

Do not edit files.
EOF

  (
    cd "$FUZZ_REPO" || exit 1
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
Task: apply the duplicate/noise remediation feedback after two continuous persona iterations.

Cycle index: $cycle_index

Read:
- $run_dir/context.md
- The latest two duplicate/noise review runs:
$recent_runs

Use the persona reviews and syntheses from those two runs to implement the smallest safe fix that reduces duplicate/noise dominated fuzzing. The target is the active Jetstream2 RTC fuzzer, not WordPress product fixes.

The current duplicate/noise action gate in context.md is binding. If it is ACTION-NEEDED, do not stop at analysis or scheduling advice. Apply a bounded code/config/restart change that prevents the leaking family from being queued, analyzed, or counted as productive triage, unless doing so would hide product-evidence failures. If no safe change exists, write the exact blocker and the next experiment that would remove it.

You may edit only:
- $FUZZ_REPO/bin/rtc-browser-fuzz-novelty-monitor.mjs
- $FUZZ_REPO/bin/rtc-browser-fuzz-supervisor.mjs
- $FUZZ_REPO/bin/rtc-browser-fuzz-session-watchdog.mjs
- $FUZZ_REPO/bin/rtc-browser-fuzz-triage-watcher.mjs
- $FUZZ_REPO/bin/rtc-browser-fuzz-analysis-tier.mjs
- $FUZZ_REPO/bin/rtc-browser-fuzz-deep-analysis-tier.mjs
- $FUZZ_REPO/bin/rtc-browser-fuzz-live-analysis-monitor.mjs
- $FUZZ_REPO/bin/rtc-browser-failure-analysis.mjs
- $FUZZ_REPO/bin/rtc-browser-deep-triage.mjs
- files under $BASE

Do not edit product code or proposed RTC PR fix branches.

If code changes are made:
- run syntax checks for changed .mjs files;
- write a patch/stat/status artifact under $run_dir/artifacts/;
- restart or arrange restart of the active coverage-guided monitor/supervisor only if needed for the change to take effect;
- do not hide likely-real failures. Only gate or down-rank families that are proven pre-action/bootstrap/triage noise or historical duplicates.
- verify the whole duplicate/noise consumer path, not only the graph metric. Strict pre-action startup signatures with zero users, zero actions, and no reload/save/revision/fault/operation/product evidence must not remain queued for triage, analysis-tier, deep-analysis-tier, or live-analysis session startup. Product-evidence failures must remain visible.

If the safe action is only a config/scheduling restart, perform it and record why.

Return:
1. What was changed.
2. Validation commands and results.
3. Restart/session actions taken.
4. Current duplicate/noise status after the action, if measurable.
5. Remaining risk.
EOF

  mkdir -p "$run_dir/artifacts"
  (
    cd "$FUZZ_REPO" || exit 1
    "$CODEX_BIN" -a never exec --skip-git-repo-check -m "$MODEL" -c "model_reasoning_effort=$REASONING" -s danger-full-access < "$prompt" > "$out" 2> "$err"
    echo "$?" > "$rc_file"
  )
  cp "$out" "$BASE/latest-feedback-action.md" 2>/dev/null || true
}

run_cycle() {
  local stamp run_dir
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  run_dir="$BASE/runs/$stamp"
  local tmux_prefix="rtc-dup-${stamp}"
  mkdir -p "$run_dir/prompts" "$run_dir/reports" "$run_dir/logs"
  log "starting duplicate/noise review cycle $stamp"
  write_context "$run_dir"

  for persona in "${PERSONAS[@]}"; do
    wait_for_parallel_slot "$tmux_prefix"
    run_codex_review "$run_dir" "$persona" "$tmux_prefix"
  done
  wait_for_review_sessions "$run_dir" "$tmux_prefix"

  run_synthesis "$run_dir"
  ln -sfn "$run_dir" "$BASE/latest-run"
  cp "$run_dir/synthesis.md" "$BASE/latest-synthesis.md" 2>/dev/null || true
  log "finished duplicate/noise review cycle $stamp"
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

main() {
  log "loop started model=$MODEL reasoning=$REASONING max_parallel=$MAX_PARALLEL interval=${INTERVAL_SECONDS}s action_every=${ACTION_EVERY_CYCLES}"
  while true; do
    if mkdir "$BASE/loop.lock" 2>/dev/null; then
      echo "$$" > "$BASE/loop.lock/pid"
      date -u +%s > "$BASE/loop.lock/created-at-epoch"
      local cycle_index
      cycle_index="$(increment_cycle_count)"
      run_cycle
      if [ "$ACTION_EVERY_CYCLES" -gt 0 ] && [ $(( cycle_index % ACTION_EVERY_CYCLES )) -eq 0 ]; then
        local latest
        latest="$(readlink -f "$BASE/latest-run" 2>/dev/null || true)"
        if [ -n "$latest" ]; then
          log "running duplicate/noise feedback action after cycle $cycle_index"
          run_feedback_action "$latest" "$cycle_index"
          log "finished duplicate/noise feedback action after cycle $cycle_index"
        fi
      fi
      rm -rf "$BASE/loop.lock"
    else
      local lock_pid lock_age
      lock_pid="$(sed -n '1p' "$BASE/loop.lock/pid" 2>/dev/null || true)"
      lock_age="$(find "$BASE/loop.lock" -maxdepth 0 -mmin +180 -print 2>/dev/null || true)"
      if { [ -z "$lock_pid" ] || ! kill -0 "$lock_pid" 2>/dev/null; } && [ -n "$lock_age" ]; then
        log "removing stale duplicate/noise lock pid=${lock_pid:-unknown}"
        rm -rf "$BASE/loop.lock"
        continue
      fi
      log "previous duplicate/noise loop cycle still locked by pid=${lock_pid:-unknown}; skipping"
    fi
    sleep "$INTERVAL_SECONDS"
  done
}

main "$@"
