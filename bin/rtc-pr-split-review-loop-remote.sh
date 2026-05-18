#!/usr/bin/env bash
set -uo pipefail

BASE="${RTC_PR_SPLIT_REVIEW_BASE:-/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515}"
FIX_ROOT="${RTC_FIX_PLAN_ROOT:-/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514}"
FIX_REPO="${RTC_FIX_PLAN_REPO:-$FIX_ROOT/repo}"
FUZZ_ROOT="${RTC_FUZZ_ROOT:-/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515}"
FUZZ_REPO="${RTC_FUZZ_REPO:-$FUZZ_ROOT/repo}"
COVERAGE_BASE="${RTC_COVERAGE_BASE:-/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515}"
STRICT_EXPANSION_ROOT="${RTC_STRICT_EXPANSION_ROOT:-/media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515/runs/strict-expansion-20260516T165042Z}"
DEFERRED_BASE="${RTC_DEFERRED_WORK_BASE:-/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516}"
FINALIZATION_BASE="${RTC_PR_FINALIZATION_BASE:-/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516}"
CODEX_BIN="${CODEX_BIN:-/home/exouser/.npm-global/bin/codex}"
MODEL="${RTC_PR_SPLIT_REVIEW_MODEL:-gpt-5.5}"
REASONING="${RTC_PR_SPLIT_REVIEW_REASONING:-xhigh}"
INTERVAL_SECONDS="${RTC_PR_SPLIT_REVIEW_INTERVAL_SECONDS:-5}"
MAX_PARALLEL="${RTC_PR_SPLIT_REVIEW_MAX_PARALLEL:-6}"
ACTION_EVERY_CYCLES="${RTC_PR_SPLIT_REVIEW_ACTION_EVERY_CYCLES:-2}"
LOCK_REJECTION_LOG_INTERVAL_SECONDS="${RTC_PR_SPLIT_REVIEW_LOCK_REJECTION_LOG_INTERVAL_SECONDS:-900}"
NON_1020002_JOB_STALE_SECONDS="${RTC_PR_SPLIT_REVIEW_NON_1020002_JOB_STALE_SECONDS:-1800}"
ROOT_REPLAY_MIN_FREE_MB="${RTC_PR_SPLIT_REVIEW_ROOT_REPLAY_MIN_FREE_MB:-2048}"

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

log_singleton_lock_rejection() {
  local lock_file="$1"
  local pid_file last_file now last holder_pid holder_state
  pid_file="$BASE/rtc-pr-split-review-loop.pid"
  last_file="$BASE/logs/last-singleton-lock-rejection-log.epoch"
  now="$(date -u +%s)"
  last=0
  if [ -f "$last_file" ]; then
    last="$(sed -n '1p' "$last_file" 2>/dev/null || echo 0)"
  fi
  case "$last" in
    ''|*[!0-9]*) last=0 ;;
  esac
  if [ $(( now - last )) -lt "$LOCK_REJECTION_LOG_INTERVAL_SECONDS" ]; then
    return
  fi
  holder_pid="$(sed -n '1p' "$pid_file" 2>/dev/null || true)"
  holder_state="unknown"
  if [ -n "$holder_pid" ] && ps -p "$holder_pid" >/dev/null 2>&1; then
    holder_state="pid=$holder_pid alive"
  elif [ -n "$holder_pid" ]; then
    holder_state="pid=$holder_pid stale-pid-file"
  fi
  log "another PR split review loop already holds $lock_file; exiting holder=$holder_state"
  printf '%s\n' "$now" > "$last_file"
}

acquire_singleton_lock() {
  local lock_file pid_file
  lock_file="$BASE/rtc-pr-split-review-loop.lock"
  pid_file="$BASE/rtc-pr-split-review-loop.pid"
  exec 9>"$lock_file"
  if ! flock -n 9; then
    log_singleton_lock_rejection "$lock_file"
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

strict_expansion_has_likely_real() {
  local file
  if [ ! -d "$STRICT_EXPANSION_ROOT" ]; then
    return 1
  fi
  while IFS= read -r file; do
    if rg -q '"classification"[[:space:]]*:[[:space:]]*"likely_real"' "$file" 2>/dev/null; then
      return 0
    fi
  done < <(find "$STRICT_EXPANSION_ROOT" -path '*/result.json' -type f 2>/dev/null)
  return 1
}

deferred_queue_has_actionable_work() {
  if [ ! -f "$DEFERRED_BASE/current-deferred-status.md" ]; then
    return 1
  fi
  awk '
    /^## Queue$/ { in_queue = 1; next }
    /^## / && in_queue { exit }
    in_queue { print }
  ' "$DEFERRED_BASE/current-deferred-status.md" |
    rg -vi 'covered by canonical|superseded|diagnostic branch exists|ready PR02A exists|context' |
    rg -Eiq 'Promote|publish|product candidate|maintainer-sized candidate|needs audited review branch|needs a maintainer-sized candidate branch|replay evidence|downscope decision'
}

independent_gate_has_work() {
  if current_split_active_missing_branch_links >/dev/null; then
    return 0
  fi
  if deferred_queue_has_actionable_work; then
    return 0
  fi
  if strict_expansion_has_likely_real; then
    return 0
  fi
  return 1
}

current_split_active_missing_branch_links() {
  if [ ! -f "$BASE/current-pr-split.md" ]; then
    return 1
  fi
  grep -n 'No verified branch link yet' "$BASE/current-pr-split.md" 2>/dev/null |
    rg -vi 'no (literal|active)|has no|still has no|only matches|historical|historical/no-active|rows? (left|remain)|there are no active'
}

root_disk_free_mb() {
  df -Pm / 2>/dev/null | awk 'NR==2 { print $4 }'
}

root_disk_below_replay_threshold() {
  local free_mb
  free_mb="$(root_disk_free_mb)"
  case "$free_mb" in
    ''|*[!0-9]*) return 1 ;;
  esac
  [ "$free_mb" -lt "$ROOT_REPLAY_MIN_FREE_MB" ]
}

artifact_access_constraint() {
  cat <<'TXT'
Artifact access constraint:
- Use the context file, current status files, latest report paths, and exact
  artifact paths named in the prompt first.
- Do not run unbounded `find` or `rg` over historical run trees such as
  `$BASE/runs`, `$DEFERRED_BASE/cycles`, or `$FINALIZATION_BASE`.
- If a search is unavoidable, bound it to the latest few run directories or an
  exact job/output directory and wrap it in `timeout`. A broad historical scan
  is loop overhead, not PR progress.
TXT
}

feedback_action_reports_disk_block_without_recovery() {
  local out="$1"
  if ! rg -qi 'disk-preflight-blocked|replay-blocked-by-disk|root filesystem exhaustion|root disk|/[^[:space:]]*[[:space:]]+100%' "$out" 2>/dev/null; then
    return 1
  fi
  if rg -qi 'rootfs-space-recover|disk cleanup|cleanup/preflight|free-space recovery|space recovered|verified free.*mb|df before/after|root-filesystem recovery' "$out" 2>/dev/null; then
    return 1
  fi
  if rg -qi 'push-manifest|manifest-audit|branch audit|branch-link|verified branch link|review branch|deferred candidate|PR ?02A|PR ?5[ABC]?|PR ?11[A-E]?|loop repair|loop-repair' "$out" 2>/dev/null; then
    return 1
  fi
  return 0
}

file_has_nonblank_content() {
  local file="$1"
  [ -f "$file" ] || return 1
  [ -s "$file" ] || return 1
  awk 'NF { found = 1; exit } END { exit found ? 0 : 1 }' "$file"
}

write_invalid_empty_report_artifact() {
  local report="$1"
  local last_message="$2"
  local stdout_log="$3"
  local stderr_log="$4"
  local rc_file="$5"
  local codex_rc="$6"
  local label="$7"
  local invalid
  invalid="$(dirname "$report")/invalid-empty-report.md"
  {
    echo "# Invalid Empty Report"
    echo
    echo "- label: $label"
    echo "- completed: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "- status: invalid-empty-report"
    echo "- codex_rc: $codex_rc"
    echo "- required_report: $report"
    echo "- captured_last_message: $last_message"
    echo "- stdout_log: $stdout_log"
    echo "- stderr_log: $stderr_log"
    echo
    echo "The Codex run produced neither a nonempty required report nor a"
    echo "nonempty captured last-message file. This artifact is not Parallel"
    echo "Progress Gate progress."
  } > "$invalid"
  rm -f "$last_message"
  printf '%s\n' "66" > "$rc_file"
}

finalize_codex_report() {
  local report="$1"
  local last_message="$2"
  local stdout_log="$3"
  local stderr_log="$4"
  local rc_file="$5"
  local codex_rc="$6"
  local label="$7"

  if file_has_nonblank_content "$report"; then
    rm -f "$last_message"
    printf '%s\n' "$codex_rc" > "$rc_file"
    return "$codex_rc"
  fi

  rm -f "$report"
  if file_has_nonblank_content "$last_message"; then
    mv "$last_message" "$report"
    printf '%s\n' "$codex_rc" > "$rc_file"
    return "$codex_rc"
  fi

  write_invalid_empty_report_artifact "$report" "$last_message" "$stdout_log" "$stderr_log" "$rc_file" "$codex_rc" "$label"
  return 66
}

run_codex_with_report() {
  local workdir="$1"
  local prompt="$2"
  local report="$3"
  local stdout_log="$4"
  local last_message="$5"
  local stderr_log="$6"
  local rc_file="$7"
  local label="$8"
  local codex_rc

  mkdir -p "$(dirname "$report")" "$(dirname "$stdout_log")" "$(dirname "$last_message")" "$(dirname "$stderr_log")" "$(dirname "$rc_file")"
  rm -f "$report" "$stdout_log" "$last_message" "$(dirname "$report")/invalid-empty-report.md"

  (
    cd "$workdir" || exit 1
    "$CODEX_BIN" -a never exec --skip-git-repo-check -m "$MODEL" -c "model_reasoning_effort=$REASONING" -s danger-full-access -o "$last_message" - < "$prompt" > "$stdout_log" 2> "$stderr_log"
  )
  codex_rc="$?"
  finalize_codex_report "$report" "$last_message" "$stdout_log" "$stderr_log" "$rc_file" "$codex_rc" "$label"
}

report_is_header_only() {
  local file="$1"
  awk '
    /^[[:space:]]*$/ { next }
    /^#{1,6}[[:space:]]+/ { next }
    { content = 1; exit }
    END { exit content ? 1 : 0 }
  ' "$file"
}

artifact_has_no_progress_marker() {
  local file="$1"
  rg -qi 'produced no stdout report|invalid-empty-report|empty-report|did not write a nonempty report|not Parallel Progress Gate progress|zero-byte|header-only|report\.tmp|lock-holder-only|lock holder|stderr growth|stderr-only|stale manifest|stale push-manifest|stale branch-audit|stale finalization|Jobs launched:[[:space:]]*$|Jobs launched:[[:space:]]*None|No jobs launched|Do not launch any new|launch no new|split unchanged|current split unchanged|wait-only|wait only|red-before-oracle|red-before-provider-snapshot|runtime-readiness-blocked|pre-oracle runtime failure|pre-oracle replay failure|failed before collaboration ready|failed before provider[^[:cntrl:]]*snapshot' "$file" 2>/dev/null
}

artifact_has_independent_signal() {
  local file="$1"
  local signal='progress-unblock|loop repair|loop-repair|loop-progress|output capture|last-message|hard progress gate|job-health|hygiene|rootfs|space-recover|disk-cleanup|free-space recovery|push-manifest|manifest-audit|branch audit|branch-audit|branch-link|verified branch link|review branch|deferred|promotion|downscope|pre-save|reload|restoreRevision|revision-restore|pr03b_needed|pr03_family_gap|owner-proof-only|malformed|http-room|rich-text|strict|5700084|owner-comparison|semicolonless|entity validation|block-validation|ownership-audit|PR ?02A|PR ?03B|PR ?0?5[ABCD]?|PR ?5D|PR ?07[BCD]?|PR ?11[A-E]?|PR ?14B|7110017|5200005|1060015|wp-env|e2e-ready|range-diff|containment|diffstat|numstat|bash -n|syntax check'
  printf '%s\n' "$file" | rg -qi "$signal" 2>/dev/null && return 0
  rg -qi "$signal" "$file" 2>/dev/null
}

manifest_has_data_row() {
  local file="$1"
  awk -F '\t' '
    /^[[:space:]]*$/ { next }
    /^[[:space:]]*#/ { next }
    NR == 1 && tolower($0) ~ /(source|branch|ref|base|head|commit|validation|path|status)/ { next }
    NF >= 2 { data = 1; exit }
    END { exit data ? 0 : 1 }
  ' "$file"
}

artifact_is_fresh_for_run() {
  local file="$1"
  local run_dir="$2"
  local context="$run_dir/context.md"
  if [ -f "$context" ] && [ "$file" -ot "$context" ]; then
    return 1
  fi
  return 0
}

manifest_fresh_for_claimed_deferred_candidates() {
  local file="$1"
  local candidate
  while IFS= read -r candidate; do
    candidate="${candidate%%[),.;:]}"
    [ -e "$candidate" ] || continue
    case "$candidate" in
      "$DEFERRED_BASE"/cycles/*/*/*.report.md|"$DEFERRED_BASE"/cycles/*/*/push-manifest.tsv|"$DEFERRED_BASE"/cycles/*/*/*manifest*.tsv)
        if [ "$file" -ot "$candidate" ]; then
          return 1
        fi
        ;;
    esac
  done < <(rg -o "$DEFERRED_BASE"'/[^[:space:]`<>)"]+' "$file" 2>/dev/null | sort -u)
  return 0
}

manifest_has_disallowed_review_base() {
  local file="$1"

  if rg -qi 'PR ?0?5D|pr05d|semicolonless|entity.validation|block-validation' "$file" 2>/dev/null &&
    rg -qi 'fix/rtc-fallback-group-delete-stale-local|d06e3528cbd3b2771fa15d7b8d827ba2e721ed31|PR15|pr15|fallback-group' "$file" 2>/dev/null; then
    return 0
  fi

  if rg -qi 'PR ?0?7D|pr07d|reload-hydration' "$file" 2>/dev/null &&
    rg -qi 'deferred/rtc-reload-hydration|raw deferred|publishable|danluu/.*reload' "$file" 2>/dev/null &&
    ! rg -qi 'no PR ?0?7D|PR ?0?7B-covered|pr07b-covered|rejected|downscope|diagnostic-only|not publish|non-publishable' "$file" 2>/dev/null; then
    return 0
  fi

  return 1
}

valid_progress_report_artifact() {
  local file="$1"
  file_has_nonblank_content "$file" || return 1
  report_is_header_only "$file" && return 1
  artifact_has_no_progress_marker "$file" && return 1
  artifact_has_independent_signal "$file"
}

valid_progress_manifest_artifact() {
  local file="$1"
  file_has_nonblank_content "$file" || return 1
  artifact_has_no_progress_marker "$file" && return 1
  manifest_has_data_row "$file" || return 1
  manifest_fresh_for_claimed_deferred_candidates "$file" || return 1
  manifest_has_disallowed_review_base "$file" && return 1
  artifact_has_independent_signal "$file"
}

valid_bounded_job_creation() {
  local jobs_dir="$1"
  local run_dir="$2"
  local file
  [ -d "$jobs_dir" ] || return 1
  while IFS= read -r file; do
    artifact_is_fresh_for_run "$file" "$run_dir" || continue
    file_has_nonblank_content "$file" || continue
    case "$file" in
      *1020002*|*rtc-ws-seed*|*merge-update-emission*|*crdt-array*|*caller-base-provenance*)
        continue
        ;;
    esac
    # Job prompts/scripts often mention guardrails such as "do not launch another
    # 1020002 job" or "do not duplicate already active work". Those are not
    # wait-only markers by themselves; only reject explicit no-progress jobs here.
    if rg -qi 'Jobs launched:[[:space:]]*$|Jobs launched:[[:space:]]*None|No jobs launched|Launch nothing|None now|split unchanged|current split unchanged|wait-only|wait only|produced no stdout report|invalid-empty-report|zero-byte|header-only|report\.tmp|stale manifest|stale push-manifest|stale branch-audit' "$file" 2>/dev/null; then
      continue
    fi
    if artifact_has_independent_signal "$file"; then
      return 0
    fi
  done < <(
    find "$jobs_dir" -mindepth 1 -maxdepth 3 -type f \
      \( -name '*.prompt.md' -o -name 'prompt.md' -o -name 'run-*.sh' -o -name 'run.sh' \) 2>/dev/null
  )
  return 1
}

valid_independent_progress_artifact() {
  local file="$1"
  local run_dir="$2"
  local base
  base="$(basename "$file")"

  case "$base" in
    *.tmp|*.stdout|*.stderr|*.log|rc|codex.stdout.log|codex.stderr.log)
      return 1
      ;;
  esac
  case "$file" in
    *1020002*|*rtc-ws-seed*|*merge-update-emission*|*crdt-array*|*caller-base-provenance*)
      return 1
      ;;
  esac

  artifact_is_fresh_for_run "$file" "$run_dir" || return 1
  case "$base" in
    report.md)
      valid_progress_report_artifact "$file"
      ;;
    push-manifest.tsv|branch-audit.tsv|*manifest*.tsv|*audit*.tsv)
      valid_progress_manifest_artifact "$file"
      ;;
    *)
      file_has_nonblank_content "$file" || return 1
      artifact_has_no_progress_marker "$file" && return 1
      artifact_has_independent_signal "$file"
      ;;
  esac
}

feedback_action_has_independent_progress() {
  local out="$1"
  local run_dir jobs_dir file
  run_dir="$(dirname "$out")"
  jobs_dir="$run_dir/jobs"

  if feedback_action_reports_disk_block_without_recovery "$out"; then
    return 1
  fi

  if [ -d "$jobs_dir" ]; then
    while IFS= read -r file; do
      if valid_independent_progress_artifact "$file" "$run_dir"; then
        return 0
      fi
    done < <(
      find "$jobs_dir" -mindepth 1 -maxdepth 5 -type f \
        \( -name report.md -o -name push-manifest.tsv -o -name branch-audit.tsv -o -name '*loop-repair*' -o -name '*manifest-audit*' -o -name '*branch-audit*' \) 2>/dev/null
    )
    if valid_bounded_job_creation "$jobs_dir" "$run_dir"; then
      return 0
    fi

    if file_has_nonblank_content "$out" &&
      rg -qi '##[[:space:]]+Jobs Launched|Jobs Launched|Created and launched bounded non-`?1020002`?|launched .*bounded non-`?1020002`?.*job' "$out" 2>/dev/null; then
      while IFS= read -r file; do
        artifact_is_fresh_for_run "$file" "$run_dir" || continue
        case "$file" in
          *1020002*|*rtc-ws-seed*|*merge-update-emission*|*crdt-array*|*caller-base-provenance*)
            continue
            ;;
        esac
        if artifact_has_independent_signal "$file"; then
          return 0
        fi
      done < <(
        find "$jobs_dir" -mindepth 1 -maxdepth 3 -type f \
          \( -name '*.prompt.md' -o -name 'prompt.md' -o -name 'run-*.sh' -o -name 'run.sh' \) 2>/dev/null
      )
    fi
  fi

  if file_has_nonblank_content "$out" &&
    rg -qi 'current-pr-split\.md`?[[:space:]]+changed|`?current-pr-split\.md`?[[:space:]]+changed|split file changed[[:space:]]*(yes|: yes)|updated[[:space:]]+\[?`?current-pr-split\.md|verified fresh .*artifacts?|nonempty .*artifacts?|patched .*rtc-pr-split-review-loop\.sh|bash -n .*rtc-pr-split-review-loop\.sh.*(pass|passed|ok)|syntax check.*(pass|passed|ok)' "$out" 2>/dev/null; then
    return 0
  fi

  return 1
}

feedback_action_wait_only() {
  local out="$1"
  if [ ! -s "$out" ]; then
    return 0
  fi
  if feedback_action_has_independent_progress "$out"; then
    return 1
  fi
  if rg -qi 'every .*Parallel Progress Gate.*(stale|inactionable)|all .*gate rows.*(stale|inactionable)|no actionable .*gate rows remain' "$out" 2>/dev/null; then
    return 1
  fi
  if feedback_action_reports_disk_block_without_recovery "$out"; then
    return 0
  fi
  if grep -Eiq 'Jobs launched:[[:space:]]*$|Jobs launched:[[:space:]]*None|None now|Launch nothing|No jobs launched|Do not launch any new|launch no new|split unchanged|current split unchanged|wait-only|wait only|wait for .*1020002|still active|already active|lock holder|stderr growth|report\.tmp|produced no stdout report|invalid-empty-report|active 1020002|1020002.*active|red-before-oracle|red-before-provider-snapshot|runtime-readiness-blocked|pre-oracle runtime failure|pre-oracle replay failure|failed before collaboration ready|failed before provider[^[:cntrl:]]*snapshot' "$out" 2>/dev/null; then
    return 0
  fi
  if grep -Eiq 'current-pr-split\.md`?[[:space:]]+changed|split file changed[[:space:]]*(yes|: yes)|updated[[:space:]]+\[?`?current-pr-split\.md|patched .*rtc-pr-split-review-loop\.sh|Verified .*artifact|verified .*nonempty|verified fresh .*artifacts?|nonempty .*report\.md|nonempty .*artifacts?|wrote .*report\.md|wrote .*push-manifest|wrote .*branch-audit|fresh .*push-manifest|fresh .*branch-audit|loop repair artifact|loop-repair artifact|bash -n .*rtc-pr-split-review-loop\.sh.*(pass|passed|ok)|syntax check.*(pass|passed|ok)' "$out" 2>/dev/null; then
    return 1
  fi
  return 0
}

write_independent_progress_gate() {
  echo "## Parallel Progress Gate"
  echo
  echo "Seed 1020002 may block final-stack fuzz, filing, and stack-wide validation. It must not block independent progress: review-branch audit/link creation, PR02A/PR5/PR11 branch shaping, deferred candidate promotion, push-manifest generation, or loop self-repair. A feedback action that only waits for 1020002 is invalid when this section has any actionable row."
  echo
  echo "### Missing verified branch links"
  if [ -f "$BASE/current-pr-split.md" ]; then
    current_split_active_missing_branch_links | sed -n '1,80p' || true
  else
    echo "current-pr-split.md missing"
  fi
  echo
  echo "### Deferred promotion signals"
  if [ -f "$DEFERRED_BASE/current-deferred-status.md" ]; then
    awk '
      /^## Queue$/ { in_queue = 1; print; next }
      /^## / && in_queue { exit }
      in_queue { print }
    ' "$DEFERRED_BASE/current-deferred-status.md" | sed -n '1,80p' || true
  else
    echo "deferred status missing"
  fi
  echo
  echo "### Root filesystem replay preflight"
  local free_mb
  free_mb="$(root_disk_free_mb)"
  if [ -n "$free_mb" ]; then
    echo "free MB on /: $free_mb"
    echo "replay threshold MB: $ROOT_REPLAY_MIN_FREE_MB"
    if root_disk_below_replay_threshold; then
      echo "actionable: root filesystem is below replay threshold; disk-preflight-blocked reports require cleanup/free-space verification or non-Docker branch/manifest/loop-repair progress."
    fi
  else
    echo "free MB on /: unknown"
  fi
  echo
  echo "### Strict-expansion likely-real signals"
  if [ -d "$STRICT_EXPANSION_ROOT" ]; then
    rows="$(
      find "$STRICT_EXPANSION_ROOT" -path '*/result.json' -type f 2>/dev/null |
        while IFS= read -r file; do
          if rg -q '"classification"[[:space:]]*:[[:space:]]*"likely_real"' "$file" 2>/dev/null; then
            rel="${file#"$STRICT_EXPANSION_ROOT"/}"
            group="${rel%%/.triage-watcher/*}"
            sig="$(basename "$(dirname "$file")")"
            bug="$(sed -n 's/.*"distinctBugType"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$file" | head -1)"
            summary="$(sed -n 's/.*"summary"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$file" | head -1)"
            printf '%s|%s|%s|%s|%s\n' "$group" "$sig" "${bug:-unknown}" "$file" "${summary:-no summary}"
          fi
        done
    )"
    if [ -n "$rows" ]; then
      printf '%s\n' "$rows" | sed -n '1,120p'
    else
      echo "No strict-expansion likely_real result.json rows found."
    fi
  else
    echo "strict-expansion root missing: $STRICT_EXPANSION_ROOT"
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

write_controller_health() {
  echo "## Controller Health"
  echo
  echo "Recent controller-health signals. Repeated lock rejections, repeated wait-only actions, or progress-unblock launches are automation problems the persona loop should diagnose and fix, not just summarize."
  echo
  echo "### Loop log signals"
  if [ -f "$BASE/logs/loop.log" ]; then
    rg -n 'another PR split review loop already holds|wait-only feedback|progress unblock|previous review cycle still active|loop started' "$BASE/logs/loop.log" 2>/dev/null | tail -120 || true
  else
    echo "loop log missing"
  fi
  echo
  echo "### Current loop processes"
  pgrep -af "^bash $BASE/rtc-pr-split-review-loop\\.sh$" 2>/dev/null | sed -n '1,40p' || true
  if [ -f "$BASE/rtc-pr-split-review-loop.pid" ]; then
    echo "controller pid: $(cat "$BASE/rtc-pr-split-review-loop.pid" 2>/dev/null)"
  fi
  echo
  echo "### Recent progress-unblock jobs"
  find "$BASE/runs" -maxdepth 4 -type d -path '*/jobs/*progress-unblock*' 2>/dev/null | sort | tail -20 || true
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
    echo "- Local publish manifest: $FINALIZATION_BASE/latest-local-publish-manifest.tsv"
    echo
    write_independent_progress_gate
    write_controller_health
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
    echo "## Local Publish Manifest"
    if [ -s "$FINALIZATION_BASE/latest-local-publish-manifest.tsv" ]; then
      sed -n '1,220p' "$FINALIZATION_BASE/latest-local-publish-manifest.tsv"
    else
      echo "No local publish manifest found."
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
  local stdout="$run_dir/logs/$slug.stdout.log"
  local last_message="$run_dir/logs/$slug.last-message.tmp"
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
Treat "an active 1020002 session exists" as no progress for the Parallel
Progress Gate unless an independent artifact or job is also created or verified.
  Treat a \`disk-preflight-blocked\` replay report as no durable progress unless
the same cycle creates or verifies root cleanup/free-space recovery, non-Docker
branch/manifest work, deferred promotion/downscope, or loop repair.
  Treat zero-byte persona/review/report files and \`report.tmp\` placeholders as no
evidence. Treat a
strict-expansion reduction that names no owner as incomplete unless the same
cycle launches or verifies an owner-comparison job; for linebreak/parser/rich
text cases, compare against PR5B/PR5C before assigning PR18x. Treat a
push-manifest/audit as progress only when it is newer than the deferred
candidates it claims to cover, its base matches the slot allowlist, and its
branch head, bundle, and manifest agree. Treat PR05D manifests based on
\`fix/rtc-fallback-group-delete-stale-local\`, \`d06e3528cbd\`, or other
fallback/PR15 tails as no progress. Treat raw reload-hydration PR07D manifests
as no progress unless they first prove non-coverage by PR07B/PR07C.

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

$(artifact_access_constraint)
EOF

  (
    run_codex_with_report "$FIX_REPO" "$prompt" "$out" "$stdout" "$last_message" "$err" "$rc_file" "persona:$persona"
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
  local stdout="$run_dir/logs/synthesis.stdout.log"
  local last_message="$run_dir/logs/synthesis.last-message.tmp"
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
Zero-byte reports are not review evidence. A strict-expansion reduction that
does not compare plausible earlier owners is not enough to name PR18x; for
linebreak/parser/rich-text reductions, require PR5B/PR5C comparison first. A
push manifest or audit is stale if it predates the deferred candidates it
claims to cover, or if its base is not on the intended slot allowlist. Reject
PR05D manifests based on \`fix/rtc-fallback-group-delete-stale-local\`,
\`d06e3528cbd\`, or another fallback/PR15 tail, and reject raw reload-hydration
PR07D publication unless a PR07B/PR07C ownership audit proves a distinct delta.

Return:
1. Overall status.
2. Consensus changes to the PR split, including replacement splits, merges,
   further splits, reordered stacks, or dropped low-priority PRs.
3. Concrete next actions before the next review cycle, separated into
   final-stack-blocked work and independent parallel work.
4. Any automatic Codex/fuzzing jobs that should be launched.
5. One-paragraph progress note suitable for another agent.

Do not edit files.

$(artifact_access_constraint)
EOF

  run_codex_with_report "$FIX_REPO" "$prompt" "$out" "$stdout" "$last_message" "$err" "$rc_file" "synthesis"
}

run_feedback_action() {
  local run_dir="$1"
  local cycle_index="$2"
  local prompt="$run_dir/prompts/feedback-action.md"
  local out="$run_dir/feedback-action.md"
  local stdout="$run_dir/logs/feedback-action.stdout.log"
  local last_message="$run_dir/logs/feedback-action.last-message.tmp"
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
- $FINALIZATION_BASE/latest-local-publish-manifest.tsv if present
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
- Mentioning an active or newly launched seed-1020002 diagnostic session does
  not satisfy the Parallel Progress Gate; the action must also create or verify
  independent branch audit/link, push-manifest, deferred promotion, PR02A/PR5/
  PR11 shaping, or loop-repair progress.
- A pre-existing non-1020002 job satisfies the Parallel Progress Gate only if
  this feedback action verifies a fresh artifact, log advance, report, manifest,
  or branch result from that job. If a non-1020002 job is still active but only
  repeating environment/build failures for more than
  ${NON_1020002_JOB_STALE_SECONDS}s, create or launch exactly one bounded
  replacement, downscope, or loop-repair job.
- A \`disk-preflight-blocked\` or replay-blocked-by-disk report does not satisfy
  the Parallel Progress Gate unless this feedback action also creates or
  verifies cleanup/free-space recovery, a non-Docker branch/manifest artifact,
  deferred promotion/downscope, PR02A/PR5/PR11 shaping, or loop-repair
  progress.
- A pre-oracle runtime replay report, including \`runtime-readiness-blocked\`,
  \`red-before-oracle\`, \`red-before-provider-snapshot\`, or failed-before-
  collaboration-ready output, does not satisfy the Parallel Progress Gate unless
  this feedback action also repairs/verifies the runtime setup or creates a
  fresh independent branch/audit/manifest/deferred/loop-repair artifact.
- A strict-expansion source-reduction report that assigns no owner does not
  satisfy later gate rows by itself; the feedback action must launch or verify
  the next owner comparison. For linebreak/parser/rich-text reductions, compare
  PR5B/PR5C before assigning PR18x.
- A push-manifest or branch audit satisfies the gate only when it is newer than
  the deferred candidate reports/manifests it claims to cover, its base matches
  the slot allowlist, and the branch head, bundle, and manifest agree. PR05D
  manifests based on \`fix/rtc-fallback-group-delete-stale-local\`,
  \`d06e3528cbd\`, or other fallback/PR15 tails are no progress.
- Zero-byte persona reports, zero-byte job reports, \`report.tmp\` placeholders,
  and stale current split prose such as non-historical
  \`PR17.*merge-update emission\` wording are no progress and should force a doc
  patch, bounded job, or loop repair.
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
If $FINALIZATION_BASE/latest-local-publish-manifest.tsv already contains a
fresh local-machine publication for the relevant branch, treat that as the
publication artifact and update status/split text instead of blocking on remote
GitHub access.

If two consecutive review iterations agree on a PR split/documentation change,
update:
- $BASE/current-pr-split.md

If the two iterations agree that the current split is merely acceptable but a
bounded next-action job is needed to evaluate a better split, create and launch
that job instead of recording "split unchanged" as the only action.

If more Codex or fuzz work should be launched automatically, create a bounded
tmux job under $run_dir/jobs/ and launch it with:
/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin/tmux

$(artifact_access_constraint)

Useful independent jobs include:
- branch-link audit for every "No verified branch link yet" row;
- push-manifest generation for local-only ready/review/deferred branches;
- deferred candidate promotion or downscope synthesis;
- review branch shaping for PR02A, PR5A-C, PR11A-E, or mature deferred
  candidates;
- non-1020002 job-health audit or bounded replacement when a deferred/promotion
  job is stuck on environment or build setup;
- loop repair when the review/action loop has become too serial.
- strict-expansion owner comparison, for example seed 5700084 against PR5C,
  before assigning PR18x.

Return:
1. What feedback was applied.
2. Whether $BASE/current-pr-split.md changed.
3. Any jobs launched, with tmux session names.
4. Any feedback intentionally deferred and why.
EOF

  mkdir -p "$run_dir/jobs"
  run_codex_with_report "$FIX_REPO" "$prompt" "$out" "$stdout" "$last_message" "$err" "$rc_file" "feedback-action:$cycle_index"
  cp "$out" "$BASE/latest-feedback-action.md" 2>/dev/null || true
  if independent_gate_has_work && ! feedback_action_has_independent_progress "$out"; then
    log "feedback produced no independent progress while gate has work; launching progress unblock job"
    launch_progress_unblock_job "$run_dir" "$cycle_index" "$out"
  elif independent_gate_has_work && feedback_action_wait_only "$out"; then
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
This progress-unblock job must ignore its own tmux session, runner, and job
directory when checking active work:
- session: $session
- runner: $runner
- job directory: $run_dir/jobs/progress-unblock-$stamp
Monitoring this job, waiting for other active sessions, or reporting stderr/log
growth is not progress. If no fresh artifact can be verified, create exactly one
bounded branch audit, push manifest, deferred downscope/promotion artifact, or
loop-repair patch with syntax check.

$(artifact_access_constraint)

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
5. If root disk is below replay thresholds and replay jobs are disk-preflight
   blocked, create or verify exactly one cleanup/preflight/resume artifact
   before launching more browser-heavy work.
6. If runtime replays are blocked before the oracle/provider snapshot by
   \`collaborationEnabled:null\` or equivalent readiness failures, create or
   verify exactly one runtime-readiness repair/replay artifact or independent
   branch/audit/manifest artifact before accepting the cycle.

Return a concise report with: Actions Taken, Branch/Manifest Output, Loop
Repair, Remaining Parallel Work, and What 1020002 Still Blocks.
EOF

  cat > "$runner" <<EOF
#!/usr/bin/env bash
set -uo pipefail
cd "$FIX_REPO" || exit 1
report="$out"
last_message="$out.last-message.tmp"
stdout_log="$run_dir/jobs/progress-unblock-$stamp/stdout.log"
stderr_log="$err"
rc_file="$rc"
invalid="\$(dirname "\$report")/invalid-empty-report.md"

file_has_nonblank_content() {
  local file="\$1"
  [ -f "\$file" ] || return 1
  [ -s "\$file" ] || return 1
  awk 'NF { found = 1; exit } END { exit found ? 0 : 1 }' "\$file"
}

rm -f "\$report" "\$last_message" "\$stdout_log" "\$invalid"
"$CODEX_BIN" -a never exec --skip-git-repo-check -m "$MODEL" -c "model_reasoning_effort=$REASONING" -s danger-full-access -o "\$last_message" - < "$prompt" > "\$stdout_log" 2> "\$stderr_log"
code="\$?"
if file_has_nonblank_content "\$report"; then
  rm -f "\$last_message"
  echo "\$code" > "\$rc_file"
  exit "\$code"
fi

rm -f "\$report"
if file_has_nonblank_content "\$last_message"; then
  mv "\$last_message" "\$report"
  echo "\$code" > "\$rc_file"
  exit "\$code"
fi

echo "66" > "\$rc_file"
rm -f "\$last_message"
{
  echo "# Invalid Empty Report"
  echo
  echo "- completed: \$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "- status: invalid-empty-report"
  echo "- codex_rc: \$code"
  echo "- required_report: \$report"
  echo "- captured_last_message: \$last_message"
  echo "- stdout_log: \$stdout_log"
  echo "- stderr_log: \$stderr_log"
  echo
  echo "The progress-unblock Codex run produced neither a nonempty required"
  echo "report nor a nonempty captured last-message file. This artifact is"
  echo "not Parallel Progress Gate progress."
} > "\$invalid"
exit 66
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
