#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN=${CODEX_BIN:-/home/exouser/.npm-global/bin/codex}
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin
BASE=/media/volume/danluu-fuzz-data/rtc-fuzz-level-mix-persona-loop-20260516
FUZZ_REPO=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo

mkdir -p "$BASE/logs" "$TMUX_WRAP"
cat > "$TMUX_WRAP/tmux" <<'SH'
#!/usr/bin/env bash
exec /usr/bin/tmux -L rtc-fuzz "$@"
SH
chmod +x "$TMUX_WRAP/tmux"
export PATH="$TMUX_WRAP:$NODE_BIN:$PATH"

tmux kill-session -t rtc-fuzz-level-mix-persona-loop 2>/dev/null || true

cat > "$BASE/rtc-fuzz-level-mix-persona-loop.sh" <<'LOOP'
#!/usr/bin/env bash
set -uo pipefail

BASE="${RTC_FUZZ_LEVEL_MIX_BASE:-/media/volume/danluu-fuzz-data/rtc-fuzz-level-mix-persona-loop-20260516}"
FUZZ_REPO="${RTC_FUZZ_REPO:-/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo}"
COVERAGE_BASE="${RTC_COVERAGE_BASE:-/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515}"
FOCUSED_BASE="${RTC_FOCUSED_BASE:-/media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515}"
STRICT_BASE="${RTC_STRICT_BASE:-/media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515}"
GAP_BASE="${RTC_GAP_BASE:-/media/volume/danluu-fuzz-data/rtc-gap-booster-20260515}"
CODEX_BIN="${CODEX_BIN:-/home/exouser/.npm-global/bin/codex}"
MODEL="${RTC_FUZZ_LEVEL_MIX_MODEL:-gpt-5.5}"
REASONING="${RTC_FUZZ_LEVEL_MIX_REASONING:-xhigh}"
MAX_PARALLEL="${RTC_FUZZ_LEVEL_MIX_MAX_PARALLEL:-6}"
ACTION_EVERY_CYCLES="${RTC_FUZZ_LEVEL_MIX_ACTION_EVERY_CYCLES:-2}"
INTERVAL_SECONDS="${RTC_FUZZ_LEVEL_MIX_INTERVAL_SECONDS:-0}"

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

current_root() {
  local marker="$1"
  if [ -f "$marker/current-run-root.txt" ]; then
    sed -n '1p' "$marker/current-run-root.txt"
  else
    ls -td "$marker"/runs/* "$marker"/run-* 2>/dev/null | head -1 || true
  fi
}

latest_coverage_root() {
  if [ -f "$COVERAGE_BASE/current-output-dir.txt" ]; then
    sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt"
  else
    ls -td "$COVERAGE_BASE"/run-* 2>/dev/null | head -1 || true
  fi
}

write_context() {
  local run_dir="$1"
  local coverage_root focused_root strict_root gap_root
  coverage_root="$(latest_coverage_root)"
  focused_root="$(current_root "$FOCUSED_BASE")"
  strict_root="$(current_root "$STRICT_BASE")"
  gap_root="$(current_root "$GAP_BASE")"
  {
    echo "# RTC fuzz-level mix control context"
    echo
    echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo
    echo "## Objective"
    echo
    echo "Continuously review the Jetstream2 RTC fuzzing level mix, run the standard personas in parallel, and after every two review cycles make concrete control changes. Do not wait for stalls or error conditions before reviewing whether the mix should change."
    echo
    echo "## Current roots"
    echo
    echo "- Fuzz repo: $FUZZ_REPO"
    echo "- Coverage-guided root: ${coverage_root:-none}"
    echo "- Focused root: ${focused_root:-none}"
    echo "- Strict root: ${strict_root:-none}"
    echo "- Gap booster root: ${gap_root:-none}"
    echo
    echo "## Active Fuzz-Level Mix"
    python3 - "$coverage_root" "$focused_root" "$strict_root" "$gap_root" <<'PY'
import json
import os
import re
import sys
from collections import Counter

roots = [root for root in sys.argv[1:] if root]

def infer_level(group):
    name = str(group.get("name") or "").lower()
    transport = str(group.get("transport") or "").lower()
    env = group.get("env") if isinstance(group.get("env"), dict) else {}
    profile = str(env.get("GUTENBERG_RTC_BROWSER_ACTION_PROFILE") or env.get("RTC_FUZZ_ACTION_PROFILE") or group.get("profile") or "").lower()
    text = " ".join([name, transport, profile])
    if "fuzz-only" in text or "assert" in text:
        return "fuzz-assertion"
    if "libfuzzer" in text or "lib-fuzzer" in text or "afl" in text or "coverage-guided-lower" in text:
        return "coverage-guided-lower-level"
    if "unit" in text or "property" in text or "jest" in text:
        return "unit-property"
    if "php" in text or "rest" in text or "backend" in text:
        return "backend-api"
    if "protocol" in text or re.search(r"\bsync-server\b|\bprovider\b", text):
        return "protocol-server"
    if transport == "http" or "http" in name:
        return "transport-integration"
    return "browser-e2e"

counts = Counter()
groups = []
for root in roots:
    path = os.path.join(root, "supervisor-groups.json")
    if not os.path.exists(path):
        continue
    try:
        parsed = json.load(open(path))
    except Exception as exc:
        print(f"- could not read {path}: {exc}")
        continue
    for group in parsed if isinstance(parsed, list) else []:
        if not isinstance(group, dict):
            continue
        lanes = int(group.get("lanes", 1) or 1)
        level = group.get("fuzzLevel") or group.get("fuzz_level") or infer_level(group)
        counts[level] += lanes
        groups.append((level, group.get("name", ""), lanes, group.get("transport", ""), (group.get("env") or {}).get("GUTENBERG_RTC_BROWSER_ACTION_PROFILE") or (group.get("env") or {}).get("RTC_FUZZ_ACTION_PROFILE") or ""))

for level in sorted(counts):
    print(f"- {level}: {counts[level]} lane(s)")
if not any(level in counts for level in ("unit-property", "coverage-guided-lower-level", "backend-api", "protocol-server", "fuzz-assertion")):
    print("- gap: 0 active unit/property, coverage-guided lower-level, backend/API, protocol/server, or fuzz-assertion lanes")
print()
print("| level | group | lanes | transport | profile |")
print("| --- | --- | ---: | --- | --- |")
for level, name, lanes, transport, profile in groups:
    print(f"| {level} | {name} | {lanes} | {transport} | {profile} |")
PY
    echo
    echo "## Current Execution Counters"
    python3 - "$coverage_root" "$focused_root" "$strict_root" "$gap_root" <<'PY'
import json
import os
import re
import sys
from collections import Counter

roots = [root for root in sys.argv[1:] if root]

def infer_level(group):
    name = str(group.get("name") or "").lower()
    transport = str(group.get("transport") or "").lower()
    env = group.get("env") if isinstance(group.get("env"), dict) else {}
    profile = str(env.get("GUTENBERG_RTC_BROWSER_ACTION_PROFILE") or env.get("RTC_FUZZ_ACTION_PROFILE") or group.get("profile") or "").lower()
    text = " ".join([name, transport, profile])
    if "fuzz-only" in text or "assert" in text:
        return "fuzz-assertion"
    if "libfuzzer" in text or "lib-fuzzer" in text or "afl" in text or "coverage-guided-lower" in text:
        return "coverage-guided-lower-level"
    if "unit" in text or "property" in text or "jest" in text:
        return "unit-property"
    if "php" in text or "rest" in text or "backend" in text:
        return "backend-api"
    if "protocol" in text or re.search(r"\bsync-server\b|\bprovider\b", text):
        return "protocol-server"
    if transport == "http" or "http" in name:
        return "transport-integration"
    return "browser-e2e"

def group_levels(root):
    out = {}
    path = os.path.join(root, "supervisor-groups.json")
    if not os.path.exists(path):
        return out
    try:
        groups = json.load(open(path))
    except Exception:
        return out
    for group in groups if isinstance(groups, list) else []:
        if isinstance(group, dict):
            out[group.get("name", "")] = group.get("fuzzLevel") or group.get("fuzz_level") or infer_level(group)
    return out

counts = Counter()
for root in roots:
    levels = group_levels(root)
    for dirpath, _, files in os.walk(root):
        if "events.ndjson" not in files:
            continue
        gen = os.path.basename(os.path.dirname(dirpath))
        match = re.match(r"^(.*)-gen-[0-9]+-", gen)
        group = match.group(1) if match else gen
        level = levels.get(group, "browser-e2e")
        path = os.path.join(dirpath, "events.ndjson")
        try:
            with open(path, errors="ignore") as events:
                for line in events:
                    if '"kind":"seed-attempt-complete"' in line:
                        counts[level] += 1
        except OSError:
            pass
for level in sorted(counts):
    print(f"- {level}: {counts[level]} completed seed attempts in current roots")
if not counts:
    print("- no current execution counters found")
PY
    echo
    echo "## Latest coverage-guided status"
    if [ -n "$coverage_root" ] && [ -f "$coverage_root/novelty-status.md" ]; then
      tail -220 "$coverage_root/novelty-status.md"
    else
      echo "No novelty-status.md found."
    fi
    echo
    echo "## Recent mix-control reports"
    find "$BASE/runs" -mindepth 2 -maxdepth 2 -name synthesis.md -o -name feedback-action.md 2>/dev/null | sort | tail -8 | while read -r file; do
      echo
      echo "### $file"
      sed -n '1,160p' "$file"
    done
  } > "$run_dir/context.md"
}

run_persona_review() {
  local run_dir="$1"
  local persona="$2"
  local slug
  slug="$(slugify "$persona")"
  local prompt="$run_dir/prompts/$slug.md"
  local out="$run_dir/reports/$slug.md"
  local err="$run_dir/logs/$slug.stderr.log"
  local rc_file="$run_dir/logs/$slug.rc"

  cat > "$prompt" <<EOF
Name: $persona

Task: review the Jetstream2 RTC fuzzing level mix and recommend what should change.

Read:
- $run_dir/context.md
- $FUZZ_REPO/bin/rtc-browser-fuzz-novelty-monitor.mjs if relevant
- $FUZZ_REPO/bin/rtc-browser-fuzz-supervisor.mjs if relevant
- $FUZZ_REPO/test/e2e/specs/editor/collaboration/collaboration-fuzz.spec.ts if relevant

This controller must run continuously. Do not wait for stalls or error conditions. Treat zero active unit/property, coverage-guided lower-level, backend/API, protocol/server, or fuzz-assertion lanes as a control decision that needs justification or correction.

Return:
1. Whether the current level mix should change now.
2. The smallest useful change, with exact files/scripts/commands.
3. Which lower-level target, if any, should be added first and why.
4. How to validate without stopping productive browser fuzzing.
5. Risks or reasons to reject changing the mix now.

Do not edit files in this review pass.
EOF

  tmux new-session -d -s "rtc-level-mix-$slug-$(basename "$run_dir")" "bash -lc 'cd \"$FUZZ_REPO\"; \"$CODEX_BIN\" -a never exec --skip-git-repo-check -m \"$MODEL\" -c model_reasoning_effort=\"$REASONING\" -s danger-full-access < \"$prompt\" > \"$out\" 2> \"$err\"; echo \$? > \"$rc_file\"'"
}

wait_for_reports() {
  local run_dir="$1"
  local expected="$2"
  local waited=0
  while true; do
    local count
    count=$(find "$run_dir/logs" -maxdepth 1 -type f -name '*.rc' ! -name 'synthesis.rc' ! -name 'feedback-action.rc' 2>/dev/null | wc -l | tr -d ' ')
    if [ "$count" -ge "$expected" ]; then
      return
    fi
    if [ "$waited" -ge 7200 ]; then
      log "timeout waiting for persona reports in $run_dir count=$count expected=$expected"
      return
    fi
    sleep 10
    waited=$(( waited + 10 ))
  done
}

run_synthesis() {
  local run_dir="$1"
  local prompt="$run_dir/prompts/synthesis.md"
  local out="$run_dir/synthesis.md"
  local err="$run_dir/logs/synthesis.stderr.log"
  local rc_file="$run_dir/logs/synthesis.rc"

  cat > "$prompt" <<EOF
Task: synthesize the fuzz-level mix persona reports in:
$run_dir/reports

Also read:
- $run_dir/context.md

Return:
1. Consensus on whether the mix should change.
2. The concrete next change if action is warranted.
3. Disagreements or blockers.
4. Exact validation/restart plan.
5. Short status note for another agent.

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
  local recent
  recent="$(find "$BASE/runs" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort | tail -2)"

  cat > "$prompt" <<EOF
Task: make the fuzz-level mix control decision after two continuous persona review iterations.

Cycle index: $cycle_index

Read:
- $run_dir/context.md
- $run_dir/synthesis.md
- The previous cycle synthesis and reports from:
$recent

The controller should not wait for error conditions. If the current mix still has zero active unit/property, coverage-guided lower-level, backend/API, protocol/server, or fuzz-assertion lanes, either add or launch the smallest bounded lower-level target with a clear oracle, or write the exact blocker and the next command/code change needed. Do not stop productive browser fuzzing to do this.

You may edit files in $FUZZ_REPO or Jetstream loop scripts if needed. Prefer small, reversible changes. Run syntax checks for changed files. Restart only the relevant loop or lane if a restart is needed.

Write:
1. Decision made.
2. Changes made, with paths.
3. Validation run.
4. Whether any new lower-level executions should appear in the graph.
5. Remaining blocker if no lower-level target was launched.
EOF

  (
    cd "$FUZZ_REPO" || exit 1
    "$CODEX_BIN" -a never exec --skip-git-repo-check -m "$MODEL" -c "model_reasoning_effort=$REASONING" -s danger-full-access < "$prompt" > "$out" 2> "$err"
    echo "$?" > "$rc_file"
  )
}

cycle=0
log "level-mix persona loop started model=$MODEL reasoning=$REASONING max_parallel=$MAX_PARALLEL action_every=$ACTION_EVERY_CYCLES interval=${INTERVAL_SECONDS}s"
while true; do
  cycle=$(( cycle + 1 ))
  ts="$(date -u +%Y%m%dT%H%M%SZ)"
  run_dir="$BASE/runs/$ts"
  mkdir -p "$run_dir/prompts" "$run_dir/reports" "$run_dir/logs"
  log "starting level-mix review cycle $ts"
  write_context "$run_dir"

  launched=0
  for persona in "${PERSONAS[@]}"; do
    while [ "$(tmux ls 2>/dev/null | grep -c '^rtc-level-mix-')" -ge "$MAX_PARALLEL" ]; do
      sleep 5
    done
    run_persona_review "$run_dir" "$persona"
    launched=$(( launched + 1 ))
  done

  wait_for_reports "$run_dir" "$launched"
  run_synthesis "$run_dir"
  log "finished level-mix review cycle $ts"

  if [ "$(( cycle % ACTION_EVERY_CYCLES ))" -eq 0 ]; then
    log "running level-mix feedback action after cycle $cycle"
    run_feedback_action "$run_dir" "$cycle"
    log "finished level-mix feedback action after cycle $cycle"
  fi

  sleep "$INTERVAL_SECONDS"
done
LOOP

chmod +x "$BASE/rtc-fuzz-level-mix-persona-loop.sh"
tmux new-session -d -s rtc-fuzz-level-mix-persona-loop "$BASE/rtc-fuzz-level-mix-persona-loop.sh"
tmux ls | grep -E 'rtc-fuzz-level-mix|rtc-level-mix' || true
