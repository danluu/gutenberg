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
tmux kill-session -t rtc-fuzz-level-mix-persona-loop-watchdog 2>/dev/null || true
tmux ls 2>/dev/null |
	awk -F: '/^rtc-level-mix-/ { print $1 }' |
	while IFS= read -r session; do
		tmux kill-session -t "$session" 2>/dev/null || true
	done

cat > "$BASE/rtc-fuzz-level-mix-persona-loop.sh" <<'LOOP'
#!/usr/bin/env bash
set -uo pipefail

BASE="${RTC_FUZZ_LEVEL_MIX_BASE:-/media/volume/danluu-fuzz-data/rtc-fuzz-level-mix-persona-loop-20260516}"
FUZZ_REPO="${RTC_FUZZ_REPO:-/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo}"
COVERAGE_BASE="${RTC_COVERAGE_BASE:-/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515}"
FOCUSED_BASE="${RTC_FOCUSED_BASE:-/media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515}"
STRICT_BASE="${RTC_STRICT_BASE:-/media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515}"
GAP_BASE="${RTC_GAP_BASE:-/media/volume/danluu-fuzz-data/rtc-gap-booster-20260515}"
LOWER_LEVEL_BASE="${RTC_LOWER_LEVEL_BASE:-/media/volume/danluu-fuzz-data/rtc-lower-level-fuzz-20260516}"
CG_LOWER_LEVEL_BASE="${RTC_CG_LOWER_LEVEL_BASE:-/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-20260516}"
NATIVE_ASSERT_BASE="${RTC_NATIVE_ASSERT_BASE:-/media/volume/danluu-fuzz-data/rtc-native-assert-protocol-20260516}"
FUZZ_ASSERT_BASE="${RTC_FUZZ_ASSERT_BASE:-/media/volume/danluu-fuzz-data/rtc-fuzz-only-asserts-20260515}"
BACKEND_API_BASE="${RTC_BACKEND_API_BASE:-/media/volume/danluu-fuzz-data/rtc-backend-api-fuzz-20260518}"
PRODUCTIVE_ANALYSIS_BASE="${RTC_PRODUCTIVE_ANALYSIS_BASE:-/media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521}"
CODEX_BIN="${CODEX_BIN:-/home/exouser/.npm-global/bin/codex}"
MODEL="${RTC_FUZZ_LEVEL_MIX_MODEL:-gpt-5.5}"
REASONING="${RTC_FUZZ_LEVEL_MIX_REASONING:-xhigh}"
MAX_PARALLEL="${RTC_FUZZ_LEVEL_MIX_MAX_PARALLEL:-6}"
ACTION_EVERY_CYCLES="${RTC_FUZZ_LEVEL_MIX_ACTION_EVERY_CYCLES:-2}"
INTERVAL_SECONDS="${RTC_FUZZ_LEVEL_MIX_INTERVAL_SECONDS:-0}"
CODEX_TIMEOUT_SECONDS="${RTC_FUZZ_LEVEL_MIX_CODEX_TIMEOUT_SECONDS:-7200}"

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

protocol_current_root() {
  local marker="$NATIVE_ASSERT_BASE/protocol/current-run-root.txt"
  if [ -f "$marker" ]; then
    sed -n '1p' "$marker"
  else
    ls -td "$NATIVE_ASSERT_BASE"/protocol/runs/* 2>/dev/null | head -1 || true
  fi
}

backend_api_current_root() {
  local marker="$BACKEND_API_BASE/current-run-root.txt"
  if [ -f "$marker" ]; then
    sed -n '1p' "$marker"
  else
    ls -td "$BACKEND_API_BASE"/runs/* 2>/dev/null | head -1 || true
  fi
}

write_current_root_snapshot() {
  local snapshot_file="$1"
  {
    printf 'browser-coverage-current\t%s\n' "$(latest_coverage_root)"
    printf 'focused-current\t%s\n' "$(current_root "$FOCUSED_BASE")"
    printf 'strict-current\t%s\n' "$(current_root "$STRICT_BASE")"
    printf 'gap-current\t%s\n' "$(current_root "$GAP_BASE")"
    printf 'unit-property-current\t%s\n' "$(current_root "$LOWER_LEVEL_BASE")"
    printf 'protocol-current\t%s\n' "$(protocol_current_root)"
    printf 'backend-api-current\t%s\n' "$(backend_api_current_root)"
  } > "$snapshot_file"
}

root_from_snapshot() {
  local snapshot_file="$1"
  local wanted_label="$2"
  local label root
  while IFS=$'\t' read -r label root || [ -n "$label" ]; do
    if [ "$label" = "$wanted_label" ]; then
      printf '%s\n' "$root"
      return
    fi
  done < "$snapshot_file"
}

root_snapshot_invariant_failures() {
  local start_file="$1"
  local end_file="$2"
  awk -F '\t' '
    FNR == NR {
      start[$1] = $2
      labels[$1] = 1
      next
    }
    {
      end[$1] = $2
      labels[$1] = 1
    }
    END {
      for (label in labels) {
        if (start[label] != end[label]) {
          printf "- TELEMETRY-INVARIANT-FAIL: current-run-root changed during context generation for %s: %s -> %s\n", label, start[label], end[label]
        }
      }
    }
  ' "$start_file" "$end_file" | sort
}

add_root() {
  local roots_file="$1"
  local label="$2"
  local root="${3:-}"
  if [ -n "$root" ] && [ -d "$root" ]; then
    printf '%s\t%s\n' "$label" "$root" >> "$roots_file"
  fi
}

has_tmux_session() {
  local session="$1"
  tmux list-sessions -F '#S' 2>/dev/null | grep -Fxq "$session"
}

add_root_if_session_live() {
  local roots_file="$1"
  local label="$2"
  local root="${3:-}"
  local session="$4"
  if has_tmux_session "$session"; then
    add_root "$roots_file" "$label" "$root"
  fi
}

add_process_roots() {
  local roots_file="$1"
  local label="$2"
  local env_name="$3"
  local env_file root
  for env_file in /proc/[0-9]*/environ; do
    [ -r "$env_file" ] || continue
    root="$(tr '\0' '\n' 2>/dev/null < "$env_file" | sed -n "s/^${env_name}=//p" | sed -n '1p')"
    if [ "$label" = "coverage-guided-lower-process" ]; then
      case "$root" in
        /tmp/rtc-cg-review*) continue ;;
        /tmp/rtc-cg-lower-level-smoke-*) continue ;;
        /tmp/rtc-cg-ll-smoke-*) continue ;;
        /tmp/rtc-cg-lower-validate*) continue ;;
        /tmp/rtc-cg-lower-level-review*) continue ;;
        */coverage-guided-lower-level-action-smoke/*) continue ;;
        */coverage-guided-lower-level-smoke-*) continue ;;
      esac
    fi
    add_root "$roots_file" "$label" "$root"
  done
}

add_protocol_process_roots() {
  local roots_file="$1"
  local env_file output_dir run_id
  for env_file in /proc/[0-9]*/environ; do
    [ -r "$env_file" ] || continue
    output_dir="$(tr '\0' '\n' 2>/dev/null < "$env_file" | sed -n 's/^RTC_PROTOCOL_SERVER_FUZZ_OUTPUT_DIR=//p' | sed -n '1p')"
    run_id="$(tr '\0' '\n' 2>/dev/null < "$env_file" | sed -n 's/^RTC_PROTOCOL_SERVER_FUZZ_RUN_ID=//p' | sed -n '1p')"
    if [ -n "$output_dir" ] && [ -n "$run_id" ]; then
      add_root "$roots_file" "protocol-process" "$output_dir/runs/$run_id"
    fi
  done
}

add_backend_api_process_roots() {
  local roots_file="$1"
  local env_file root
  for env_file in /proc/[0-9]*/environ; do
    [ -r "$env_file" ] || continue
    root="$(tr '\0' '\n' 2>/dev/null < "$env_file" | sed -n 's/^RTC_BACKEND_API_FUZZ_RUN_ROOT=//p' | sed -n '1p')"
    add_root "$roots_file" "backend-api-process" "$root"
  done
}

add_coverage_supervisor_process_roots() {
  local roots_file="$1"
  local current_output env_file root
  current_output="$(latest_coverage_root)"
  for env_file in /proc/[0-9]*/environ; do
    [ -r "$env_file" ] || continue
    root="$(tr '\0' '\n' 2>/dev/null < "$env_file" | sed -n 's/^RTC_FUZZ_SUPERVISOR_OUTPUT_DIR=//p' | sed -n '1p')"
    case "$root" in
      "$COVERAGE_BASE"/*)
        if [ "$root" = "$current_output" ]; then
          add_root "$roots_file" "browser-supervisor-process" "$root"
        fi
        ;;
    esac
  done
}

write_root_inventory() {
  local roots_file="$1"
  local coverage_root focused_root strict_root gap_root lower_root
  : > "$roots_file"
  coverage_root="$(latest_coverage_root)"
  focused_root="$(current_root "$FOCUSED_BASE")"
  strict_root="$(current_root "$STRICT_BASE")"
  gap_root="$(current_root "$GAP_BASE")"
  lower_root="$(current_root "$LOWER_LEVEL_BASE")"

  add_root "$roots_file" "browser-coverage-current" "$coverage_root"
  add_root "$roots_file" "focused-current" "$focused_root"
  if [ -f "$FOCUSED_BASE/current-run-roots.txt" ]; then
    local focused_list_root focused_list_index
    focused_list_index=0
    while IFS= read -r focused_list_root || [ -n "$focused_list_root" ]; do
      if [ -n "$focused_list_root" ]; then
        add_root "$roots_file" "focused-current-list-$focused_list_index" "$focused_list_root"
        focused_list_index=$(( focused_list_index + 1 ))
      fi
    done < "$FOCUSED_BASE/current-run-roots.txt"
  fi
  add_root "$roots_file" "strict-current" "$strict_root"
  add_root "$roots_file" "gap-current" "$gap_root"
  add_root "$roots_file" "unit-property-current" "$lower_root"
  add_coverage_supervisor_process_roots "$roots_file"
  add_process_roots "$roots_file" "unit-property-process" "RTC_LOWER_LEVEL_RUN_ROOT"
  add_process_roots "$roots_file" "coverage-guided-lower-process" "RTC_CG_LOWER_LEVEL_RUN_ROOT"
  add_protocol_process_roots "$roots_file"
  add_backend_api_process_roots "$roots_file"
  add_root_if_session_live "$roots_file" "protocol-current" "$(protocol_current_root)" "rtc-protocol-server-fuzz"
  add_root_if_session_live "$roots_file" "backend-api-current" "$(backend_api_current_root)" "rtc-backend-api-fuzz"

  if [ -d "$FUZZ_ASSERT_BASE" ]; then
    local fuzz_assert_current fuzz_assert_latest
    fuzz_assert_current="$(current_root "$FUZZ_ASSERT_BASE")"
    fuzz_assert_latest="$(ls -td "$FUZZ_ASSERT_BASE"/cycles/* 2>/dev/null | head -1 || true)"
    if [ -n "$fuzz_assert_current" ] && [ -f "$fuzz_assert_current/supervisor-groups.json" ]; then
      add_root "$roots_file" "fuzz-assert-current" "$fuzz_assert_current"
    elif [ -n "$fuzz_assert_latest" ] && [ -f "$fuzz_assert_latest/supervisor-groups.json" ]; then
      add_root "$roots_file" "fuzz-assert-latest-cycle" "$fuzz_assert_latest"
    else
      add_root "$roots_file" "fuzz-assert-base" "$FUZZ_ASSERT_BASE"
      add_root "$roots_file" "fuzz-assert-latest-cycle" "$fuzz_assert_latest"
    fi
  fi

  awk -F '\t' 'NF == 2 && ! seen[$2]++ { print }' "$roots_file" > "$roots_file.tmp"
  mv "$roots_file.tmp" "$roots_file"
}

write_context_once() {
  local run_dir="$1"
  local coverage_root focused_root strict_root gap_root roots_file root_snapshot_start root_snapshot_end root_invariant_messages
  root_snapshot_start="$run_dir/root-snapshot-start.tsv"
  root_snapshot_end="$run_dir/root-snapshot-end.tsv"
  write_current_root_snapshot "$root_snapshot_start"
  coverage_root="$(root_from_snapshot "$root_snapshot_start" "browser-coverage-current")"
  focused_root="$(root_from_snapshot "$root_snapshot_start" "focused-current")"
  strict_root="$(root_from_snapshot "$root_snapshot_start" "strict-current")"
  gap_root="$(root_from_snapshot "$root_snapshot_start" "gap-current")"
  roots_file="$run_dir/observed-roots.tsv"
  write_root_inventory "$roots_file"
  write_current_root_snapshot "$root_snapshot_end"
  root_invariant_messages="$(root_snapshot_invariant_failures "$root_snapshot_start" "$root_snapshot_end")"
  {
    echo "# RTC fuzz-level mix control context"
    echo
    echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo
    echo "## Objective"
    echo
    echo "Continuously review the Jetstream2 RTC fuzzing level mix, run the standard personas in parallel, and after every two review cycles make concrete control changes. Do not wait for stalls or error conditions before reviewing whether the mix should change."
    echo
    echo "Primary optimization target: maximize unique maintainer-relevant product bug output and triage-ready assertion families per unit of resource. Execution count, semantic feature novelty, and lane diversity are supporting signals only; they are not success if unique bug/assertion output stays flat."
    echo
    echo "## Current roots"
    echo
    echo "- Fuzz repo: $FUZZ_REPO"
    echo "- Coverage-guided root: ${coverage_root:-none}"
    echo "- Focused root: ${focused_root:-none}"
    echo "- Strict root: ${strict_root:-none}"
    echo "- Gap booster root: ${gap_root:-none}"
    echo
    if [ -n "$root_invariant_messages" ]; then
      echo "## Context Root Snapshot Invariant"
      echo
      printf '%s\n' "$root_invariant_messages"
      echo
    fi
    echo "## Observed Root Inventory"
    if [ -s "$roots_file" ]; then
      sed 's/^/- /; s/\t/: /' "$roots_file"
    else
      echo "- none"
    fi
    echo
    echo "## Productive Analysis Control Feed"
    echo
    echo "Rows here are controller inputs. If a row targets level-mix, coverage, lower-level, or deferred fuzzing, either make the smallest safe mix/control change or reject it with evidence."
    if [ -s "$PRODUCTIVE_ANALYSIS_BASE/current-report.md" ]; then
      sed -n '1,220p' "$PRODUCTIVE_ANALYSIS_BASE/current-report.md"
    else
      echo "missing current productive analysis report"
    fi
    if [ -s "$PRODUCTIVE_ANALYSIS_BASE/current-actions.tsv" ]; then
      echo
      echo "### Productive Action TSV"
      sed -n '1,120p' "$PRODUCTIVE_ANALYSIS_BASE/current-actions.tsv"
    fi
    echo
    echo "## Active Fuzz-Level Mix"
    python3 - "$roots_file" <<'PY'
import json
import os
import re
import subprocess
import sys
import time
from collections import Counter
from datetime import datetime

roots_file = sys.argv[1]

roots = []

try:
    with open(roots_file, errors="ignore") as handle:
        for line in handle:
            parts = line.rstrip("\n").split("\t", 1)
            if len(parts) == 2 and parts[1] and os.path.isdir(parts[1]):
                roots.append((parts[0], parts[1]))
except OSError:
    pass

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

def parse_ts(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp()
    except Exception:
        return None

def load_json(path):
    try:
        with open(path, errors="ignore") as handle:
            return json.load(handle), None
    except Exception as exc:
        return None, exc

def lane_count(group):
    try:
        return max(1, int(group.get("lanes", 1) or 1))
    except (TypeError, ValueError):
        return 1

def group_profile(group):
    env = group.get("env") if isinstance(group.get("env"), dict) else {}
    return (
        env.get("GUTENBERG_RTC_BROWSER_ACTION_PROFILE")
        or env.get("RTC_FUZZ_ACTION_PROFILE")
        or group.get("profile")
        or ""
    )

def state_run_dirs(group_state):
    if not isinstance(group_state, dict):
        return []
    dirs = []
    for candidate in [group_state.get("currentRunDir"), *(group_state.get("activeRunDirs") or [])]:
        if candidate and candidate not in dirs and os.path.isdir(candidate):
            dirs.append(candidate)
    return dirs

def pid_is_live(pid):
    try:
        os.kill(int(pid), 0)
        return True
    except PermissionError:
        return True
    except Exception:
        return False

def pid_is_browser_runner(pid):
    if not pid_is_live(pid):
        return False
    try:
        args = subprocess.check_output(
            ["ps", "-p", str(int(pid)), "-o", "args="],
            text=True,
            stderr=subprocess.DEVNULL,
        )
    except Exception:
        return False
    return "rtc-browser-fuzz-runner.mjs" in args

def latest_event_age(run_dir):
    latest = None
    try:
        entries = list(os.scandir(run_dir))
    except OSError:
        entries = []
    for entry in entries:
        if not entry.is_dir() or not entry.name.startswith("lane-"):
            continue
        events_path = os.path.join(entry.path, "events.ndjson")
        try:
            mtime = os.path.getmtime(events_path)
        except OSError:
            continue
        latest = max(latest or mtime, mtime)
    if latest is None:
        return None
    return int(max(0, time.time() - latest))

def live_lane_evidence(run_dirs):
    live_pids = []
    event_ages = []
    for run_dir in run_dirs:
        event_age = latest_event_age(run_dir)
        if event_age is not None:
            event_ages.append(event_age)
        lanes_path = os.path.join(run_dir, "lanes.json")
        parsed, _ = load_json(lanes_path)
        lanes = parsed.get("lanes") if isinstance(parsed, dict) else parsed
        if not isinstance(lanes, list):
            continue
        for lane in lanes:
            if not isinstance(lane, dict):
                continue
            pid = lane.get("pid")
            if pid and pid_is_browser_runner(pid):
                live_pids.append(int(pid))
    return len(set(live_pids)), sorted(set(live_pids)), min(event_ages) if event_ages else None

def tmux_sessions():
    try:
        proc = subprocess.run(
            ["/usr/bin/tmux", "-L", "rtc-fuzz", "list-sessions", "-F", "#S"],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            check=False,
        )
    except Exception:
        return set()
    return {line.strip() for line in proc.stdout.splitlines() if line.strip()}

tmux_session_set = tmux_sessions()

def fresh_file(path, max_age=1800):
    try:
        return time.time() - os.path.getmtime(path) <= max_age
    except OSError:
        return False

def fuzz_assert_activity(root):
    status_path = os.path.join(root, "status.tsv")
    events_path = os.path.join(root, "events.ndjson")
    fresh_status = fresh_file(status_path)
    fresh_events = fresh_file(events_path)
    active_sessions = 0
    status_state = "stale"
    if fresh_status:
        try:
            lines = [line.strip() for line in open(status_path, errors="replace") if line.strip()]
        except OSError:
            lines = []
        if lines:
            latest = lines[-1]
            status_match = re.search(r"\bstatus=([^\t ]+)", latest)
            status_state = status_match.group(1) if status_match else "fresh-status"
            active_match = re.search(r"\bactiveSessions=([0-9]+)", latest)
            if active_match:
                active_sessions = int(active_match.group(1))
    session_live = any(
        session.startswith("rtc-fuzz-only-asserts-loop")
        or session.startswith("rtc-fuzz-assertion-runner")
        or session.startswith("rtc-fuzz-only-assertion-runner")
        or session.startswith("rtc-fuzz-asserts-")
        for session in tmux_session_set
    )
    if fresh_status and active_sessions > 0:
        return True, f"active-audited-status activeSessions={active_sessions}"
    if fresh_events:
        return True, "active-fresh-completed-output"
    if fresh_status and session_live:
        return True, f"active-fresh-status session-live status={status_state}"
    if session_live:
        return False, "stale-audited-output session-live"
    return False, "stale-audited-output"

counts = Counter()
active_rows = []
held_browser_rows = []
browser_summaries = []
invariant_failures = []
for label, root in roots:
    path = os.path.join(root, "supervisor-groups.json")
    if not os.path.exists(path):
        if label.startswith("fuzz-assert"):
            active_rows.append(("fuzz-assertion", "fuzz-assertion-unaudited", 0, "", "", "unaudited-present", "", label, root))
        else:
            active_rows.append(("missing-supervisor-groups", "missing", 0, "", "", "", "", label, root))
        continue
    parsed, exc = load_json(path)
    if exc is not None:
        print(f"- could not read {path}: {exc}")
        continue
    state_path = os.path.join(root, "supervisor-state.json")
    state, state_exc = load_json(state_path)
    if isinstance(state, list):
        state_groups = state
    elif isinstance(state, dict):
        state_groups = state.get("groups")
    else:
        state_groups = None
    if not isinstance(state_groups, list):
        state_groups = None
    state_by_name = {
        str(group.get("name") or ""): group
        for group in state_groups or []
        if isinstance(group, dict)
    }
    updated = parse_ts((state or {}).get("lastUpdatedAt") or (state or {}).get("updatedAt") or (state or {}).get("startedAt")) if isinstance(state, dict) else None
    if updated is None:
        try:
            updated = os.path.getmtime(state_path)
        except OSError:
            updated = None
    state_age = int(max(0, time.time() - updated)) if updated is not None else None
    state_fresh = state_age is not None and state_age <= 600
    status_counts = Counter(
        str(group.get("status") or "unknown")
        for group in state_groups or []
        if isinstance(group, dict)
    )
    configured_browser = 0
    active_browser = 0
    paused_browser = 0
    disabled_browser = 0
    active_browser_dirs = set()
    for group in parsed if isinstance(parsed, list) else []:
        if not isinstance(group, dict):
            continue
        lanes = lane_count(group)
        level = group.get("fuzzLevel") or group.get("fuzz_level") or infer_level(group)
        name = str(group.get("name") or "")
        transport = str(group.get("transport") or "")
        profile = group_profile(group)
        if level == "browser-e2e":
            configured_browser += lanes
            state_row = state_by_name.get(name)
            status = str((state_row or {}).get("status") or "missing-state-row")
            dirs = state_run_dirs(state_row)
            live_lane_count, live_pids, recent_event_age = live_lane_evidence(dirs)
            reason = str((state_row or {}).get("lastReason") or "")
            if state_groups is None:
                if live_lane_count:
                    status = "running-live-pid-missing-state"
                    reason = f"live_lanes={live_lane_count}; no supervisor-state.json"
                else:
                    status = "missing-supervisor-state"
                    reason = str(state_exc or "no supervisor-state.json")
                    invariant_failures.append(f"{label}:{name} is configured but {root}/supervisor-state.json is missing or unreadable")
            if status == "running" and dirs and live_lane_count:
                row_status = status if state_fresh else "running-live-pid-stale-state"
                if not state_fresh:
                    reason = f"state_age={state_age if state_age is not None else 'unknown'}s live_pids={len(live_pids)}"
                counts[level] += live_lane_count
                active_browser += live_lane_count
                active_browser_dirs.update(dirs)
                active_rows.append((level, name, live_lane_count, transport, profile, row_status, dirs[0], label, root))
                continue
            elif status == "running-live-pid-missing-state":
                counts[level] += live_lane_count
                active_browser += live_lane_count
                active_browser_dirs.update(dirs)
                active_rows.append((level, name, live_lane_count, transport, profile, status, dirs[0] if dirs else "", label, root))
                continue
            elif not state_fresh:
                status = "stale-supervisor-state"
                reason = f"age={state_age if state_age is not None else 'unknown'}s live_pids=0"
                if recent_event_age is not None:
                    reason += f" recent_event_age={recent_event_age}s"
            elif status == "running" and not dirs:
                reason = reason or "running state has no live currentRunDir/activeRunDirs"
                invariant_failures.append(f"{label}:{name} is running but has no live currentRunDir/activeRunDirs")
            elif status == "running" and dirs and not live_lane_count:
                reason = reason or "running state has run dirs but no live lanes.json pids"
                status = "running-no-live-pid"
            if status.startswith("paused"):
                paused_browser += lanes
            elif status.startswith("disabled"):
                disabled_browser += lanes
            held_browser_rows.append((label, name, lanes, status, reason[:180], root))
            continue
        if level == "fuzz-assertion":
            active, activity_state = fuzz_assert_activity(root)
            if active:
                counts[level] += lanes
                active_rows.append((level, name, lanes, transport, profile, activity_state, "", label, root))
            else:
                active_rows.append((level, name, 0, transport, profile, activity_state, "", label, root))
            continue
        counts[level] += lanes
        active_rows.append((level, name, lanes, transport, profile, "configured", "", label, root))
    if configured_browser:
        browser_summaries.append((label, configured_browser, active_browser, paused_browser, disabled_browser, len(active_browser_dirs), state_age, dict(status_counts), root))

for level in sorted(counts):
    print(f"- {level}: {counts[level]} lane(s)")
if not any(level in counts for level in ("unit-property", "coverage-guided-lower-level", "backend-api", "protocol-server", "fuzz-assertion")):
    print("- gap: 0 active unit/property, coverage-guided lower-level, backend/API, protocol/server, or fuzz-assertion lanes")
for failure in invariant_failures:
    print(f"- TELEMETRY-INVARIANT-FAIL: {failure}")
print()
print("| level | group | lanes | transport | profile | state | active run dir | root label | root |")
print("| --- | --- | ---: | --- | --- | --- | --- | --- | --- |")
for level, name, lanes, transport, profile, state, run_dir, label, root in active_rows:
    print(f"| {level} | {name} | {lanes} | {transport} | {profile} | {state} | {run_dir} | {label} | {root} |")
if browser_summaries:
    print()
    print("### Browser Supervisor Materialization Summary")
    print("| root label | configured browser | active running browser | paused browser | disabled browser | active run dirs | state age sec | status counts | root |")
    print("| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |")
    for label, configured, active, paused, disabled, active_dirs, age, status_counts, root in browser_summaries:
        print(f"| {label} | {configured} | {active} | {paused} | {disabled} | {active_dirs} | {age if age is not None else 'unknown'} | {status_counts} | {root} |")
if held_browser_rows:
    print()
    print("### Held Browser Groups")
    print("| root label | group | lanes | state | reason | root |")
    print("| --- | --- | ---: | --- | --- | --- |")
    for label, name, lanes, state, reason, root in held_browser_rows:
        print(f"| {label} | {name} | {lanes} | {state} | {reason} | {root} |")
PY
    echo
    echo "## Current Execution Counters"
    python3 - "$roots_file" <<'PY'
import json
import os
import re
import sys
from collections import Counter

roots_file = sys.argv[1]

roots = []
try:
    with open(roots_file, errors="ignore") as handle:
        for line in handle:
            parts = line.rstrip("\n").split("\t", 1)
            if len(parts) == 2 and parts[1] and os.path.isdir(parts[1]):
                roots.append((parts[0], parts[1]))
except OSError:
    pass

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
recent = {}
seen_event_lines = set()
for label, root in roots:
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
                        event_key = line.strip()
                        if event_key in seen_event_lines:
                            continue
                        seen_event_lines.add(event_key)
                        try:
                            event = json.loads(line)
                        except Exception:
                            event = {}
                        event_group = str(event.get("groupName") or event.get("group") or group)
                        level = event.get("fuzzLevel") or levels.get(event_group) or levels.get(group)
                        if not level:
                            text = " ".join([label, root, dirpath, event_group, line[:400]]).lower()
                            if "coverage-guided-lower-level" in text:
                                level = "coverage-guided-lower-level"
                            elif "protocol-server" in text:
                                level = "protocol-server"
                            elif "unit-property" in text or "lower-level-fuzz" in text:
                                level = "unit-property"
                            else:
                                level = "browser-e2e"
                        value = (
                            event.get("testExecutionCount")
                            or event.get("individualTestExecutionCount")
                            or event.get("executionUnitCount")
                            or event.get("caseCount")
                        )
                        if not value and level == "coverage-guided-lower-level":
                            value = event.get("inputCount")
                        if not value:
                            value = 1
                        try:
                            value = max(1, int(value))
                        except (TypeError, ValueError):
                            value = 1
                        counts[level] += value
                        at = event.get("at") or ""
                        previous = recent.get(level)
                        if previous is None or at > previous[0]:
                            recent[level] = (at, label, root, value)
        except OSError:
            pass
for level in sorted(counts):
    at, label, root, value = recent.get(level, ("", "", "", ""))
    print(f"- {level}: {counts[level]} estimated individual executions in observed roots; latest={at} label={label} latest_count={value}")
if not counts:
    print("- no current execution counters found")
PY
    echo
    echo "## Runner Throughput Diagnostics"
    python3 - "$roots_file" <<'PY'
import json
import os
import re
import statistics
import sys
from collections import defaultdict, deque

roots = []
try:
    with open(sys.argv[1], errors="ignore") as handle:
        for line in handle:
            parts = line.rstrip("\n").split("\t", 1)
            if len(parts) == 2 and parts[1] and os.path.isdir(parts[1]):
                roots.append((parts[0], parts[1]))
except OSError:
    pass

def infer_level_from_text(text):
    text = text.lower()
    if "coverage-guided-lower" in text or "libfuzzer" in text or "afl" in text:
        return "coverage-guided-lower-level"
    if "unit-property" in text or "lower-level-fuzz" in text or "property" in text:
        return "unit-property"
    if "protocol" in text and "fuzz" in text:
        return "protocol-server"
    if "backend-api" in text or "rest-api" in text:
        return "backend-api"
    if "fuzz-only" in text or "assertion" in text:
        return "fuzz-assertion"
    return "browser-e2e"

def load_group_metadata(root):
    metadata = {}
    path = os.path.join(root, "supervisor-groups.json")
    try:
        groups = json.load(open(path))
    except Exception:
        return metadata
    for group in groups if isinstance(groups, list) else []:
        if not isinstance(group, dict):
            continue
        name = str(group.get("name") or "")
        text = " ".join([
            name,
            str(group.get("transport") or ""),
            str(group.get("profile") or ""),
            str(group.get("target") or ""),
        ])
        metadata[name] = {
            "fuzzLevel": group.get("fuzzLevel") or group.get("fuzz_level") or infer_level_from_text(text),
            "runnerCommand": group.get("runnerCommand") or "",
            "executionStrategy": group.get("executionStrategy") or "",
            "sleepSeconds": group.get("sleepSeconds"),
            "batchSize": group.get("batchSize") or group.get("seedBatchCount") or group.get("stepCount"),
        }
    return metadata

def group_name_from_dir(dirpath):
    gen = os.path.basename(os.path.dirname(dirpath))
    match = re.match(r"^(.*)-gen-[0-9]+-", gen)
    return match.group(1) if match else gen

def event_execution_count(level, event):
    for key in ("testExecutionCount", "individualTestExecutionCount", "executionUnitCount", "caseCount"):
        try:
            value = int(event.get(key) or 0)
        except (TypeError, ValueError):
            value = 0
        if value > 0:
            return value
    if level == "coverage-guided-lower-level":
        try:
            return max(1, int(event.get("inputCount") or 1))
        except (TypeError, ValueError):
            return 1
    return 1

def read_command_from_log(event):
    command = str(event.get("runnerCommand") or "")
    if command:
        return command
    log_path = event.get("logPath")
    if not log_path:
        return ""
    try:
        with open(log_path, errors="ignore") as handle:
            for index, line in enumerate(handle):
                if line.startswith("command="):
                    return line.rstrip("\n").split("=", 1)[1]
                if index > 40:
                    break
    except OSError:
        pass
    return ""

records = defaultdict(lambda: deque(maxlen=20))
startup_heavy_patterns = ("npm run test:unit", "jest", "wp-scripts test-unit")
seen_event_lines = set()
for label, root in roots:
    group_meta = load_group_metadata(root)
    for dirpath, _, files in os.walk(root):
        if "events.ndjson" not in files:
            continue
        group = group_name_from_dir(dirpath)
        meta = group_meta.get(group, {})
        path = os.path.join(dirpath, "events.ndjson")
        try:
            with open(path, errors="ignore") as handle:
                for line in handle:
                    try:
                        event = json.loads(line)
                    except Exception:
                        continue
                    if event.get("kind") == "run-start":
                        meta = {
                            **meta,
                            "runnerCommand": event.get("runnerCommand") or meta.get("runnerCommand") or "",
                            "executionStrategy": event.get("executionStrategy") or meta.get("executionStrategy") or "",
                            "sleepSeconds": event.get("sleepSeconds", meta.get("sleepSeconds")),
                            "batchSize": event.get("batchSize") or meta.get("batchSize"),
                        }
                        continue
                    if event.get("kind") != "seed-attempt-complete":
                        continue
                    event_key = line.strip()
                    if event_key in seen_event_lines:
                        continue
                    seen_event_lines.add(event_key)
                    event_group = str(event.get("groupName") or event.get("group") or group)
                    level = event.get("fuzzLevel") or meta.get("fuzzLevel") or infer_level_from_text(" ".join([root, dirpath, event_group]))
                    try:
                        duration_ms = int(event.get("durationMs") or 0)
                    except (TypeError, ValueError):
                        duration_ms = 0
                    if duration_ms <= 0:
                        continue
                    executions = event_execution_count(level, event)
                    command = read_command_from_log(event) or meta.get("runnerCommand") or ""
                    strategy = event.get("executionStrategy") or meta.get("executionStrategy") or ""
                    sleep_seconds = event.get("sleepSeconds", meta.get("sleepSeconds"))
                    records[(level, event_group)].append({
                        "at": event.get("at") or "",
                        "durationMs": duration_ms,
                        "executionDurationMs": event.get("executionDurationMs"),
                        "failureIsolationAttempted": event.get("failureIsolationAttempted"),
                        "failureIsolationCheckedInputCount": event.get("failureIsolationCheckedInputCount"),
                        "executions": executions,
                        "command": command,
                        "strategy": strategy,
                        "sleepSeconds": sleep_seconds,
                        "label": label,
                        "root": root,
                    })
        except OSError:
            continue

if not records:
    print("- no recent duration-bearing execution events found")
    raise SystemExit

print("| level | group | recent events | avg batch sec | avg exec sec | avg overhead sec | avg ms per execution | executions/hour/lane | sleep sec | command shape | overhead note | status |")
print("| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |")
for (level, group), rows in sorted(records.items()):
    durations = [row["durationMs"] for row in rows]
    execution_durations = []
    for row in rows:
        try:
            value = int(row.get("executionDurationMs") or 0)
        except (TypeError, ValueError):
            value = 0
        if value > 0:
            execution_durations.append(value)
    executions = [max(1, row["executions"]) for row in rows]
    avg_duration = statistics.mean(durations)
    avg_execution = statistics.mean(execution_durations) if execution_durations else avg_duration
    avg_overhead = max(0, avg_duration - avg_execution)
    total_exec = sum(executions)
    total_ms = sum(durations)
    ms_per_exec = total_ms / total_exec if total_exec else 0
    per_hour = total_exec * 3600000 / total_ms if total_ms else 0
    latest = rows[-1]
    command = latest["command"]
    shape = latest["strategy"] or ("spawn-npm-jest-per-batch" if any(pattern in command for pattern in startup_heavy_patterns) else "unknown")
    sleep = latest["sleepSeconds"]
    sleep_display = "" if sleep is None else str(sleep)
    isolation_attempts = sum(1 for row in rows if row.get("failureIsolationAttempted"))
    isolation_checks = sum(int(row.get("failureIsolationCheckedInputCount") or 0) for row in rows)
    overhead_note = ""
    if avg_duration and avg_overhead / avg_duration > 0.5:
        if isolation_attempts:
            overhead_note = f"failure-isolation/minimization: attempts={isolation_attempts} checked={isolation_checks}"
        else:
            overhead_note = "non-execution overhead dominates"
    status = "ok"
    if sleep not in (None, "", 0, "0"):
        status = f"ACTION-NEEDED: fixed sleep of {sleep}s between batches"
    elif shape == "spawn-npm-jest-per-batch" and avg_duration > 5000 and level in ("unit-property", "coverage-guided-lower-level"):
        status = "ACTION-NEEDED: per-batch npm/Jest startup dominates; consider persistent harness, larger batches, or direct runner"
    elif ms_per_exec > 1000 and level in ("unit-property", "coverage-guided-lower-level"):
        status = "ACTION-NEEDED: low execution throughput for lower-level target"
    print(f"| {level} | {group} | {len(rows)} | {avg_duration/1000:.2f} | {avg_execution/1000:.2f} | {avg_overhead/1000:.2f} | {ms_per_exec:.1f} | {per_hour:.1f} | {sleep_display} | {shape} | {overhead_note} | {status} |")
PY
    echo
    echo "## Telemetry Reconciliation"
    python3 - "$roots_file" <<'PY'
import json
import os
import re
import subprocess
import sys
import time
from collections import Counter

roots_file = sys.argv[1]

def tmux_command(*args):
    return [
        os.environ.get("RTC_TMUX_BIN", "/usr/bin/tmux"),
        "-L",
        os.environ.get("RTC_TMUX_SOCKET", "rtc-fuzz"),
        *args,
    ]

roots = []
try:
    with open(roots_file, errors="ignore") as handle:
        for line in handle:
            parts = line.rstrip("\n").split("\t", 1)
            if len(parts) == 2 and parts[1] and os.path.isdir(parts[1]):
                roots.append((parts[0], parts[1]))
except OSError:
    pass

def infer_level_from_text(text):
    text = text.lower()
    session = text.split(":", 1)[0].strip()
    if session.startswith("rtc-coverage-guided-lower-level"):
        return "coverage-guided-lower-level"
    if session.startswith("rtc-lower-level-fuzz-loop") or "unit-property" in session:
        return "unit-property"
    if session.startswith("rtc-protocol-fuzz") or session.startswith("rtc-protocol-server-fuzz"):
        return "protocol-server"
    if session.startswith("rtc-backend-api-fuzz") or session.startswith("rtc-rest-api-fuzz"):
        return "backend-api"
    if (
        session.startswith("rtc-fuzz-assertion-runner")
        or session.startswith("rtc-fuzz-only-assertion-runner")
        or session.startswith("rtc-fuzz-only-asserts-loop")
        or session.startswith("rtc-fuzz-asserts-")
    ):
        return "fuzz-assertion"
    if "coverage-guided-lower" in text or "libfuzzer" in text or "afl" in text:
        return "coverage-guided-lower-level"
    if "lower-level-fuzz" in text or "unit-property" in text or "property" in text:
        return "unit-property"
    if "protocol-server" in text and "fuzz" in text and "persona" not in text and "action" not in text:
        return "protocol-server"
    if ("backend-api" in text or "rest-api" in text) and "fuzz" in text:
        return "backend-api"
    if ("fuzz-only" in text or "assert" in text) and "runner" in text:
        return "fuzz-assertion"
    return ""

def event_level(root, dirpath, event):
    if event.get("fuzzLevel"):
        return event["fuzzLevel"]
    groups_path = os.path.join(root, "supervisor-groups.json")
    group_levels = {}
    try:
        groups = json.load(open(groups_path))
        for group in groups if isinstance(groups, list) else []:
            if isinstance(group, dict):
                name = str(group.get("name") or "")
                text = " ".join([name, str(group.get("transport") or ""), str(group.get("profile") or "")])
                group_levels[name] = group.get("fuzzLevel") or infer_level_from_text(text)
    except Exception:
        pass
    gen = os.path.basename(os.path.dirname(dirpath))
    match = re.match(r"^(.*)-gen-[0-9]+-", gen)
    group = match.group(1) if match else gen
    return group_levels.get(group) or infer_level_from_text(" ".join([root, dirpath, group])) or "browser-e2e"

def event_value(level, event):
    for key in ("testExecutionCount", "individualTestExecutionCount", "executionUnitCount", "caseCount"):
        try:
            value = int(event.get(key) or 0)
        except (TypeError, ValueError):
            value = 0
        if value > 0:
            return value
    if level == "coverage-guided-lower-level":
        try:
            return max(1, int(event.get("inputCount") or 1))
        except (TypeError, ValueError):
            return 1
    return 1

tmux_levels = Counter()
try:
    proc = subprocess.run(tmux_command("ls"), text=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, check=False)
except FileNotFoundError:
    proc = subprocess.CompletedProcess([], 127, "")
for line in proc.stdout.splitlines():
    level = infer_level_from_text(line)
    if level:
        tmux_levels[level] += 1

event_levels = Counter()
latest = {}
latest_mtime = {}
activity_levels = Counter()
latest_activity = {}
latest_activity_mtime = {}
now = time.time()
seen_event_lines = set()
for label, root in roots:
    for dirpath, _, files in os.walk(root):
        if "events.ndjson" not in files:
            continue
        path = os.path.join(dirpath, "events.ndjson")
        try:
            with open(path, errors="ignore") as events:
                for line in events:
                    if not any(
                        marker in line
                        for marker in (
                            '"kind":"run-start"',
                            '"kind":"seed-attempt-start"',
                            '"kind":"seed-attempt-complete"',
                        )
                    ):
                        continue
                    event_key = line.strip()
                    if event_key in seen_event_lines:
                        continue
                    seen_event_lines.add(event_key)
                    try:
                        event = json.loads(line)
                    except Exception:
                        event = {}
                    level = event_level(root, dirpath, event)
                    kind = str(event.get("kind") or "")
                    if kind:
                        activity_levels[level] += 1
                        at = event.get("at") or ""
                        previous_activity = latest_activity.get(level)
                        if previous_activity is None or at > previous_activity[0]:
                            latest_activity[level] = (at, label, root, kind)
                        try:
                            latest_activity_mtime[level] = max(latest_activity_mtime.get(level, 0), os.path.getmtime(path))
                        except OSError:
                            pass
                    if kind != "seed-attempt-complete":
                        continue
                    value = event_value(level, event)
                    event_levels[level] += value
                    at = event.get("at") or ""
                    previous = latest.get(level)
                    if previous is None or at > previous[0]:
                        latest[level] = (at, label, root, value)
                    try:
                        latest_mtime[level] = max(latest_mtime.get(level, 0), os.path.getmtime(path))
                    except OSError:
                        pass
        except OSError:
            continue

print("| level | tmux sessions | observed executions | latest event | latest root | status |")
print("| --- | ---: | ---: | --- | --- | --- |")
all_levels = sorted(set(tmux_levels) | set(event_levels) | set(activity_levels) | {"unit-property", "coverage-guided-lower-level", "backend-api", "protocol-server", "fuzz-assertion"})
for level in all_levels:
    at, label, root, value = latest.get(level, ("", "", "", ""))
    if not at and level in latest_activity:
        at, label, root, activity_kind = latest_activity[level]
        at = f"{at} ({activity_kind})" if at else f"({activity_kind})"
    status = "ok"
    if level in {"backend-api", "protocol-server", "fuzz-assertion"} and not tmux_levels[level] and not event_levels[level]:
        status = "blocked: no active audited lane; held pending run-root/events harness wiring"
    elif tmux_levels[level] and not event_levels[level]:
        activity_age = now - latest_activity_mtime.get(level, 0) if latest_activity_mtime.get(level, 0) else None
        if activity_age is not None and activity_age <= 1800:
            activity_kind = latest_activity.get(level, ("", "", "", "activity"))[3]
            status = f"ok: live tmux has fresh {activity_kind} activity but no completed batch yet"
        elif level == "fuzz-assertion":
            status = "unaudited-present: tmux session exists but no audited current-run-root/status.tsv/events.ndjson wiring"
        else:
            status = "TELEMETRY-INVARIANT-FAIL: tmux session exists but no observed events in root inventory"
    elif level in {"backend-api", "protocol-server"} and tmux_levels[level] and now - latest_mtime.get(level, 0) > 600:
        activity_age = now - latest_activity_mtime.get(level, 0) if latest_activity_mtime.get(level, 0) else None
        if activity_age is not None and activity_age <= 600:
            activity_kind = latest_activity.get(level, ("", "", "", "activity"))[3]
            status = f"ok: latest completed batch is stale but fresh {activity_kind} activity is present"
        else:
            status = "TELEMETRY-INVARIANT-FAIL: tmux session exists but latest audited events are stale"
    elif event_levels[level] and not tmux_levels[level]:
        if level == "browser-e2e":
            status = "ok: browser groups are supervised; not one tmux session per group"
        else:
            status = "check-stale-events: events exist but no matching tmux session"
    print(f"| {level} | {tmux_levels[level]} | {event_levels[level]} | {at} | {label}:{root} | {status} |")

if tmux_levels["unit-property"] and not event_levels["unit-property"]:
    print("- telemetry-invariant-failure: unit-property tmux is live but context roots do not show unit-property events.")
if tmux_levels["coverage-guided-lower-level"] and not event_levels["coverage-guided-lower-level"]:
    print("- telemetry-invariant-failure: coverage-guided-lower-level tmux is live but context roots do not show coverage-guided-lower-level events.")
if tmux_levels["protocol-server"] and not event_levels["protocol-server"]:
    print("- telemetry-invariant-failure: protocol-server tmux is live but context roots do not show protocol-server events.")
if tmux_levels["fuzz-assertion"] and not event_levels["fuzz-assertion"]:
    print("- fuzz-assertion-unaudited-present: fuzz-assertion tmux is live but has no audited current-run-root/status.tsv/events.ndjson wiring.")

protocol_marker = "/media/volume/danluu-fuzz-data/rtc-native-assert-protocol-20260516/protocol/current-run-root.txt"
try:
    marker_root = open(protocol_marker, errors="ignore").read().strip()
except OSError:
    marker_root = ""
protocol_latest_root = latest.get("protocol-server", ("", "", "", ""))[2]
if marker_root and protocol_latest_root and marker_root != protocol_latest_root:
    print(f"- TELEMETRY-INVARIANT-FAIL: protocol current-run-root marker {marker_root} differs from live protocol event root {protocol_latest_root}.")
PY
    echo
    echo "## Control-Plane Self-Audit"
    python3 - "$coverage_root" <<'PY'
import json
import fcntl
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone

coverage_root = sys.argv[1] if len(sys.argv) > 1 else ""

def tmux_command(*args):
    return [
        os.environ.get("RTC_TMUX_BIN", "/usr/bin/tmux"),
        "-L",
        os.environ.get("RTC_TMUX_SOCKET", "rtc-fuzz"),
        *args,
    ]

try:
    proc = subprocess.run(
        tmux_command("list-sessions", "-F", "#S"),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    sessions = [line.strip() for line in proc.stdout.splitlines() if line.strip()]
except Exception:
    sessions = []
session_set = set(sessions)

autoscaler_status_path = "/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516/resource-autoscaler-status.md"
autoscaler_status_text = ""
try:
    autoscaler_status_text = open(autoscaler_status_path, errors="ignore").read()
except OSError:
    pass

def autoscaler_field(name):
    match = re.search(rf"^- {re.escape(name)}:\s*(.+)$", autoscaler_status_text, flags=re.M)
    return match.group(1).strip() if match else ""

autoscaler_action = autoscaler_field("last_action")
autoscaler_reason = autoscaler_field("reason")
optional_browser_pressure_gated = autoscaler_reason in {"pressure", "high_pressure", "severe_pressure"}
optional_browser_sessions = {
    "rtc-focused-shards",
    "rtc-focused-shards-watchdog",
    "rtc-fuzz-strict-expansion",
    "rtc-fuzz-strict-expansion-watchdog",
    "rtc-gap-booster",
    "rtc-gap-booster-watchdog",
}
pressure_gated_exact_sessions = {"rtc-protocol-server-fuzz"}

def read_first_line(path):
    try:
        with open(path, errors="ignore") as handle:
            return handle.readline().strip()
    except OSError:
        return ""

def optional_browser_roots_for_session(name):
    roots = []
    if name.startswith("rtc-focused-shards"):
        list_path = "/media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515/current-run-roots.txt"
        try:
            with open(list_path, errors="ignore") as handle:
                roots.extend(line.strip() for line in handle if line.strip())
        except OSError:
            pass
        single = read_first_line("/media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515/current-run-root.txt")
        if single:
            roots.append(single)
    elif name.startswith("rtc-gap-booster"):
        single = read_first_line("/media/volume/danluu-fuzz-data/rtc-gap-booster-20260515/current-run-root.txt")
        if single:
            roots.append(single)
    elif name.startswith("rtc-fuzz-strict-expansion"):
        single = read_first_line("/media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515/current-run-root.txt")
        if single:
            roots.append(single)
    return list(dict.fromkeys(root for root in roots if root and os.path.isdir(root)))

def pid_alive(pid):
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False

def active_dir_has_live_lane(active_dir):
    lanes_path = os.path.join(active_dir, "lanes.json")
    try:
        lanes_data = json.load(open(lanes_path))
    except Exception:
        return False
    lanes = lanes_data.get("lanes") if isinstance(lanes_data, dict) else None
    if not isinstance(lanes, list):
        return False
    for lane in lanes:
        if not isinstance(lane, dict):
            continue
        try:
            pid = int(lane.get("pid"))
        except Exception:
            continue
        if pid_alive(pid):
            return True
    return False

def active_dir_has_fresh_artifact(active_dir, max_age_seconds=900):
    now = time.time()
    for relative in ("events.ndjson", "summary.ndjson"):
        path = os.path.join(active_dir, "lane-0", relative)
        try:
            if os.path.getsize(path) > 0 and now - os.path.getmtime(path) <= max_age_seconds:
                return True
        except OSError:
            pass
    return False

def optional_browser_materialization(name):
    live = []
    roots = optional_browser_roots_for_session(name)
    for root in roots:
        state_path = os.path.join(root, "supervisor-state.json")
        try:
            state = json.load(open(state_path))
        except Exception:
            continue
        groups = state.get("groups") if isinstance(state, dict) else state
        if not isinstance(groups, list):
            continue
        for group in groups:
            if not isinstance(group, dict):
                continue
            for active_dir in group.get("activeRunDirs") or []:
                if not isinstance(active_dir, str) or not os.path.isdir(active_dir):
                    continue
                if active_dir_has_live_lane(active_dir) and active_dir_has_fresh_artifact(active_dir):
                    live.append(f"{group.get('name') or 'unknown'}@{os.path.basename(root)}")
    return len(live), ", ".join(live[:5])

novelty_state_path = os.path.join(coverage_root, "novelty-state.json") if coverage_root else ""
novelty_state = None
try:
    novelty_state = json.load(open(novelty_state_path))
except Exception:
    novelty_state = None
coverage_supervisor_session = "rtc-coverage-guided-supervisor"
if isinstance(novelty_state, dict):
    configured_supervisor_session = novelty_state.get("supervisorSession")
    if isinstance(configured_supervisor_session, str) and configured_supervisor_session:
        coverage_supervisor_session = configured_supervisor_session

expected = [
    "rtc-coverage-guided-novelty",
    coverage_supervisor_session,
    "rtc-coverage-guided-watchdog",
    "rtc-focused-shards",
    "rtc-focused-shards-watchdog",
    "rtc-fuzz-strict-expansion",
    "rtc-fuzz-strict-expansion-watchdog",
    "rtc-gap-booster",
    "rtc-gap-booster-watchdog",
    "rtc-fuzz-level-mix-persona-loop",
    "rtc-fuzz-level-mix-persona-loop-watchdog",
    "rtc-duplicate-noise-persona-loop",
    "rtc-resource-autoscaler",
    "rtc-native-harness-persona-loop",
    "rtc-protocol-server-persona-loop",
    "rtc-backend-api-fuzz",
    "rtc-protocol-server-fuzz",
]

print("| check | status | detail |")
print("| --- | --- | --- |")
for name in expected:
    if name in session_set:
        print(f"| exact-session:{name} | ok | exact tmux session present |")
        continue
    prefix_matches = [session for session in sessions if session.startswith(name)]
    if name in optional_browser_sessions and optional_browser_pressure_gated:
        prefix_detail = f"; prefix matches ignored: {', '.join(prefix_matches[:5])}" if prefix_matches else ""
        print(
            f"| exact-session:{name} | check | exact tmux session missing while resource autoscaler reports action={autoscaler_action} reason={autoscaler_reason}; restart is pressure-gated, not proof from a prefix/watchdog session{prefix_detail} |"
        )
        continue
    if name in pressure_gated_exact_sessions and optional_browser_pressure_gated:
        print(
            f"| exact-session:{name} | check | exact tmux session missing while resource autoscaler reports action={autoscaler_action} reason={autoscaler_reason}; this is zero useful capacity until the documented protocol/server start command is admitted |"
        )
        continue
    if name in optional_browser_sessions:
        live_count, live_detail = optional_browser_materialization(name)
        if live_count > 0:
            prefix_detail = f"; prefix matches ignored: {', '.join(prefix_matches[:5])}" if prefix_matches else ""
            print(
                f"| exact-session:{name} | ok | exact base session absent, but optional browser work is PID-backed with {live_count} fresh active run dir(s): {live_detail}{prefix_detail} |"
            )
            continue
    if prefix_matches:
        print(
            f"| exact-session:{name} | ACTION-NEEDED | missing exact session but prefix matches exist: {', '.join(prefix_matches[:5])}; do not use prefix tmux has-session checks |"
        )
    else:
        print(f"| exact-session:{name} | ACTION-NEEDED | exact tmux session missing |")

if coverage_root:
    groups_path = os.path.join(coverage_root, "supervisor-groups.json")
    state_path = os.path.join(coverage_root, "supervisor-state.json")
    if not os.path.exists(groups_path) and not os.path.exists(state_path):
        print(
            f"| current-coverage-materialization | ACTION-NEEDED | current coverage root has no supervisor-groups.json or supervisor-state.json: {coverage_root} |"
        )
    try:
        pane_proc = subprocess.run(
            tmux_command("list-panes", "-t", "rtc-coverage-guided-novelty", "-F", "#{pane_start_command}"),
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            check=False,
        )
        pane_commands = [line.strip() for line in pane_proc.stdout.splitlines() if line.strip()]
    except Exception:
        pane_commands = []
    if pane_commands and all(coverage_root not in command for command in pane_commands):
        print(
            f"| novelty-marker-pane-root | ACTION-NEEDED | current-output-dir root {coverage_root} does not match rtc-coverage-guided-novelty pane command(s): {'; '.join(pane_commands[:2])} |"
        )
    supervisor_commands = []
    for supervisor_session in dict.fromkeys([coverage_supervisor_session, "rtc-coverage-guided-supervisor"]):
        try:
            supervisor_proc = subprocess.run(
                tmux_command("list-panes", "-t", supervisor_session, "-F", "#{pane_start_command}"),
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                check=False,
            )
            supervisor_commands.extend([line.strip() for line in supervisor_proc.stdout.splitlines() if line.strip()])
        except Exception:
            pass
    if supervisor_commands and all(coverage_root not in command for command in supervisor_commands):
        print(
            f"| supervisor-marker-pane-root | ACTION-NEEDED | current-output-dir root {coverage_root} does not match coverage supervisor pane command(s): {'; '.join(supervisor_commands[:2])} |"
        )

def pid_alive(pid):
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False

def singleton_lock_state(lock_path):
    try:
        handle = open(lock_path, "a")
    except OSError as exc:
        return ("unknown", f"cannot open lock: {exc}")
    try:
        acquired = False
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
            acquired = True
        except BlockingIOError:
            return ("held", "lock is held")
        finally:
            if acquired:
                try:
                    fcntl.flock(handle, fcntl.LOCK_UN)
                except OSError:
                    pass
        return ("free", "lock is free")
    finally:
        handle.close()

dup_base = "/media/volume/danluu-fuzz-data/rtc-duplicate-noise-persona-loop-20260516"
dup_pid_path = os.path.join(dup_base, "process.pid")
dup_lock_path = os.path.join(dup_base, "process.lock")
dup_pid = None
try:
    raw_pid = open(dup_pid_path).read().strip()
    if raw_pid:
        dup_pid = int(raw_pid)
except Exception:
    dup_pid = None
dup_pid_is_alive = pid_alive(dup_pid) if dup_pid is not None else False
dup_lock_state, dup_lock_detail = singleton_lock_state(dup_lock_path)
if "rtc-duplicate-noise-persona-loop" not in session_set and dup_lock_state == "held" and not dup_pid_is_alive:
    print("| duplicate-noise-singleton | ACTION-NEEDED | exact session missing but process.lock is held with no live process.pid; likely inherited by an orphan Codex child, so restart attempts will silently fail until the orphan holder is killed or the lock inheritance bug is fixed |")
elif "rtc-duplicate-noise-persona-loop" not in session_set and dup_lock_state == "free":
    print("| duplicate-noise-singleton | ACTION-NEEDED | exact session missing and singleton lock is free; guard should restart this loop immediately |")
elif "rtc-duplicate-noise-persona-loop" in session_set and dup_lock_state == "free":
    print("| duplicate-noise-singleton | ACTION-NEEDED | exact session present but singleton process.lock is free; the tmux session may not be running the controller body |")
else:
    pid_detail = f"pid={dup_pid} alive={dup_pid_is_alive}" if dup_pid is not None else "no process.pid"
    print(f"| duplicate-noise-singleton | ok | {dup_lock_detail}; {pid_detail} |")

dup_loop_lock = os.path.join(dup_base, "loop.lock")
dup_loop_pid = None
dup_loop_started = None
try:
    raw_loop_pid = open(os.path.join(dup_loop_lock, "pid")).read().strip()
    if raw_loop_pid:
        dup_loop_pid = int(raw_loop_pid)
except Exception:
    dup_loop_pid = None
try:
    raw_started = open(os.path.join(dup_loop_lock, "created-at-epoch")).read().strip()
    if raw_started:
        dup_loop_started = int(raw_started)
except Exception:
    dup_loop_started = None
if os.path.isdir(dup_loop_lock):
    dup_loop_age = int(time.time() - dup_loop_started) if dup_loop_started else None
    dup_loop_alive = pid_alive(dup_loop_pid) if dup_loop_pid is not None else False
    if not dup_loop_alive and (dup_loop_age is None or dup_loop_age >= 300):
        print(f"| duplicate-noise-cycle-lock | ACTION-NEEDED | loop.lock is stale pid={dup_loop_pid} alive={dup_loop_alive} age={dup_loop_age}; the duplicate/noise loop will skip work until stale lock cleanup removes it |")
    else:
        print(f"| duplicate-noise-cycle-lock | check | loop.lock present pid={dup_loop_pid} alive={dup_loop_alive} age={dup_loop_age} |")
else:
    print("| duplicate-noise-cycle-lock | ok | no per-cycle loop.lock present |")

def parse_status_number(text, label):
    match = re.search(rf"- {re.escape(label)}:\s*([0-9.]+)", text)
    if not match:
        return None
    value = match.group(1)
    try:
        if "." in value:
            return float(value)
        return int(value)
    except ValueError:
        return None

def active_current_yield_from_status(text, label):
    match = re.search(
        rf"^## Triage Yield\n(?P<section>.*?)(?:\n## |\Z)",
        text,
        flags=re.M | re.S,
    )
    if not match:
        return None
    return parse_status_number(match.group("section"), label)

def file_age(path):
    try:
        return max(0, int(time.time() - os.path.getmtime(path)))
    except OSError:
        return None

def parse_iso_ts(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp()
    except Exception:
        return None

groups_path = os.path.join(coverage_root, "supervisor-groups.json") if coverage_root else ""
state_path = os.path.join(coverage_root, "supervisor-state.json") if coverage_root else ""
status_path = os.path.join(coverage_root, "novelty-status.md") if coverage_root else ""
status_text = ""
try:
    status_text = open(status_path, errors="replace").read()
except OSError:
    pass
status_heartbeat_stale = "status heartbeat refreshed" in status_text

groups = None
if groups_path:
    try:
        parsed = json.load(open(groups_path))
        groups = parsed if isinstance(parsed, list) else []
    except Exception:
        groups = None

state_groups = None
active_run_dirs = 0
active_run_dir_paths = []
state_age = None
try:
    state = json.load(open(state_path))
    if isinstance(state, list):
        parsed_groups = state
    elif isinstance(state, dict):
        parsed_groups = state.get("groups")
    else:
        parsed_groups = []
    state_groups = parsed_groups if isinstance(parsed_groups, list) else []
    for group in state_groups:
        if isinstance(group, dict):
            for run_dir in group.get("activeRunDirs") or []:
                if run_dir:
                    active_run_dir_paths.append(str(run_dir))
    active_run_dirs = len(active_run_dir_paths)
    updated = (state.get("lastUpdatedAt") or state.get("startedAt")) if isinstance(state, dict) else None
    if updated:
        state_age = int(max(0, time.time() - datetime.fromisoformat(str(updated).replace("Z", "+00:00")).timestamp()))
    else:
        state_age = int(max(0, time.time() - os.path.getmtime(state_path)))
except Exception:
    pass

novelty_current_run_dirs = None
novelty_current_run_dir_paths = []
if isinstance(novelty_state, dict):
    current_dirs = novelty_state.get("currentRunDirs")
    if isinstance(current_dirs, list):
        novelty_current_run_dir_paths = [str(d) for d in current_dirs if d]
        novelty_current_run_dirs = len(novelty_current_run_dir_paths)
if novelty_current_run_dirs is None and status_text and not status_heartbeat_stale:
    novelty_current_run_dirs = active_current_yield_from_status(
        status_text,
        "current-run active dirs",
    )

def current_yield_metric(key, status_label):
    if isinstance(novelty_state, dict):
        current_yield = novelty_state.get("triageYieldCurrent")
        if isinstance(current_yield, dict):
            value = current_yield.get(key)
            if value is not None:
                try:
                    return float(value) if isinstance(value, float) else int(value)
                except (TypeError, ValueError):
                    return value
    if status_text and not status_heartbeat_stale:
        return parse_status_number(status_text, status_label)
    return None

current_signatures = current_yield_metric("signatureCount", "signatures")
current_duplicate_share = current_yield_metric("topDuplicateFamilyShare", "top duplicate family share")
likely_real = current_yield_metric("likelyRealVisible", "likely-real visible")
materialization_blocker_actions = {
    "bootstrap-supervisor-groups-empty",
    "skip-bootstrap-empty-materialization-startup-noise-canary-no-eligible-fallback",
}
recent_materialization_blocker = None
if isinstance(novelty_state, dict):
    now_ts = time.time()
    for change in (novelty_state.get("changes") or [])[-100:]:
        if not isinstance(change, dict):
            continue
        if change.get("action") not in materialization_blocker_actions:
            continue
        changed_at = parse_iso_ts(change.get("at"))
        if changed_at is not None and now_ts - changed_at > 30 * 60:
            continue
        recent_materialization_blocker = change
active_metrics_pending = (
    current_signatures is None
    and current_duplicate_share is None
    and likely_real is None
)
current_noise_clear = (
    not active_metrics_pending
    and not recent_materialization_blocker
    and (current_signatures == 0 or (current_duplicate_share is not None and current_duplicate_share == 0))
    and likely_real == 0
)
materialization_blocker_detail = ""
if recent_materialization_blocker:
    materialization_blocker_detail = f" policy_blocker={recent_materialization_blocker.get('action')} at={recent_materialization_blocker.get('at')}"

historical_hold_present = False
if isinstance(novelty_state, dict):
    hold_reason = novelty_state.get("coverageGuidanceHistoricalNoiseHoldReason")
    hold_at = parse_iso_ts(novelty_state.get("coverageGuidanceHistoricalNoiseHoldLastAt"))
    latest_reset_at = None
    for change in novelty_state.get("changes") or []:
        if not isinstance(change, dict):
            continue
        if change.get("action") == "reset-run-local-noise-state":
            changed_at = parse_iso_ts(change.get("at"))
            if changed_at is not None:
                latest_reset_at = max(latest_reset_at or changed_at, changed_at)
    historical_hold_present = bool(
        hold_reason and (latest_reset_at is None or hold_at is None or hold_at >= latest_reset_at)
    )
else:
    recent_hold = None
    recent_reset = None
    for match in re.finditer(r"- ([0-9TZ:.\-]+): ([a-z0-9-]+)\\s+(.*)", status_text):
        changed_at = parse_iso_ts(match.group(1))
        if changed_at is None:
            continue
        action = match.group(2)
        detail = match.group(3)
        if action == "hold-coverage-guidance-codex" and "historical" in detail:
            recent_hold = max(recent_hold or changed_at, changed_at)
        elif action == "reset-run-local-noise-state":
            recent_reset = max(recent_reset or changed_at, changed_at)
    historical_hold_present = bool(recent_hold and (recent_reset is None or recent_hold >= recent_reset))

if groups is None:
    age = file_age(coverage_root) if coverage_root else None
    print(f"| coverage-supervisor-groups | ACTION-NEEDED | missing/unreadable supervisor-groups.json in current coverage root {coverage_root}; age={age}s |")
elif not groups:
    age = file_age(groups_path)
    status = "ACTION-NEEDED" if (current_noise_clear or recent_materialization_blocker) else "check"
    print(f"| coverage-supervisor-groups | {status} | supervisor-groups.json is empty; age={age}s current_noise_clear={current_noise_clear}{materialization_blocker_detail} |")
else:
    print(f"| coverage-supervisor-groups | ok | {len(groups)} group(s) configured |")

if status_heartbeat_stale:
    if isinstance(novelty_state, dict) and isinstance(novelty_state.get("triageYieldCurrent"), dict):
        print("| coverage-novelty-status-heartbeat | check | novelty-status.md is heartbeat-refreshed; current yield/noise gates use novelty-state.json instead of stale markdown metrics |")
    else:
        print("| coverage-novelty-status-heartbeat | unknown/stale | novelty-status.md is heartbeat-refreshed and current novelty-state triage yield is unavailable; current duplicate/noise gates are unknown |")

if state_groups is not None and len(state_groups) == 0:
    age = state_age if state_age is not None else "unknown"
    status = "ACTION-NEEDED" if (current_noise_clear or recent_materialization_blocker) else "check"
    print(f"| coverage-materialization | {status} | supervisor-state has zero groups; age={age}s current_noise_clear={current_noise_clear}{materialization_blocker_detail} |")
elif state_groups is not None:
    status = "ok" if active_run_dirs > 0 else "ACTION-NEEDED"
    print(f"| coverage-materialization | {status} | supervisor groups={len(state_groups)} active_run_dirs={active_run_dirs} age={state_age} |")
else:
    status = "ACTION-NEEDED" if groups else "check"
    print(f"| coverage-materialization | {status} | supervisor-state.json missing or unreadable; configured_groups={len(groups) if groups else 0} current_noise_clear={current_noise_clear}{materialization_blocker_detail} |")

if active_run_dirs > 0 and novelty_current_run_dirs == 0:
    existing_active_run_dirs = [d for d in active_run_dir_paths if os.path.isdir(d)]
    supervisor_session_live = coverage_supervisor_session in session_set
    if supervisor_session_live and existing_active_run_dirs:
        print(f"| coverage-novelty-supervisor-active-dirs | unknown/stale | supervisor activeRunDirs={active_run_dirs} ({len(existing_active_run_dirs)} existing) and exact session {coverage_supervisor_session} is live, but novelty active currentRunDirs=0; fail closed until novelty-state/status catches up |")
    else:
        print(f"| coverage-novelty-supervisor-active-dirs | TELEMETRY-INVARIANT-FAIL | supervisor activeRunDirs={active_run_dirs} but novelty active currentRunDirs=0; active-current coverage/yield scope is stale or filtered incorrectly |")
elif active_run_dirs > 0 and novelty_current_run_dirs is not None:
    supervisor_dir_set = {d for d in active_run_dir_paths if os.path.isdir(d)}
    novelty_dir_set = {d for d in novelty_current_run_dir_paths if os.path.isdir(d)}
    if supervisor_dir_set and novelty_dir_set and supervisor_dir_set != novelty_dir_set:
        print(f"| coverage-novelty-supervisor-active-dirs | unknown/stale | supervisor activeRunDirs={len(supervisor_dir_set)} and novelty active currentRunDirs={len(novelty_dir_set)} disagree; fail closed on active-current coverage/yield scope |")
    else:
        print(f"| coverage-novelty-supervisor-active-dirs | ok | supervisor activeRunDirs={active_run_dirs}; novelty active currentRunDirs={novelty_current_run_dirs} |")

if historical_hold_present and current_noise_clear:
    print("| historical-noise-hold | ACTION-NEEDED | historical known-noise hold is present while current-run duplicate/noise is clear; do not let historical noise starve current work |")
elif historical_hold_present:
    print("| historical-noise-hold | check | historical hold present; verify current-run duplicate/noise still justifies it |")
else:
    print("| historical-noise-hold | ok | no historical-noise hold detected in current novelty status |")
PY
    echo
    echo "## Coverage-Guided Lower-Level Quality"
    python3 - "$roots_file" <<'PY'
import json
import os
import sys
from collections import defaultdict, deque

roots = []
try:
    with open(sys.argv[1], errors="ignore") as handle:
        for line in handle:
            parts = line.rstrip("\n").split("\t", 1)
            if len(parts) == 2 and parts[1] and os.path.isdir(parts[1]):
                roots.append((parts[0], parts[1]))
except OSError:
    pass

events = deque(maxlen=25)
group_events = defaultdict(lambda: deque(maxlen=20))
seen_event_lines = set()
for label, root in roots:
    for dirpath, _, files in os.walk(root):
        if "events.ndjson" not in files:
            continue
        path = os.path.join(dirpath, "events.ndjson")
        try:
            with open(path, errors="ignore") as handle:
                for line in handle:
                    if '"kind":"seed-attempt-complete"' not in line or '"coverage-guided-lower-level"' not in line:
                        continue
                    event_key = line.strip()
                    if event_key in seen_event_lines:
                        continue
                    seen_event_lines.add(event_key)
                    try:
                        event = json.loads(line)
                    except Exception:
                        continue
                    group = event.get("groupName") or event.get("group") or label
                    events.append((event.get("at") or "", label, root, event))
                    group_events[str(group)].append((event.get("at") or "", label, root, event))
        except OSError:
            pass

if not events:
    print("- no coverage-guided lower-level completion events in observed roots")
else:
    coverage_new = sum(int(event.get("newCoverageKeys") or 0) for _, _, _, event in events)
    feature_new = sum(int(event.get("newFeatureKeys") or 0) for _, _, _, event in events)
    failure_key_new = len({
        str(event.get("failureCanonicalKey"))
        for _, _, _, event in events
        if event.get("newFailureKey") and event.get("failureCanonicalKey")
    })
    inputs = sum(int(event.get("inputCount") or 0) for _, _, _, event in events)
    crashes = sum(1 for _, _, _, event in events if event.get("exitCode") not in (0, "0", None))
    latest_at, latest_label, latest_root, latest_event = events[-1]
    print(f"- recent events sampled: {len(events)}")
    print(f"- recent inputs: {inputs}")
    print(f"- recent new coverage keys: {coverage_new}")
    print(f"- recent new semantic feature keys: {feature_new}")
    print(f"- recent new failure keys: {failure_key_new}")
    print(f"- recent nonzero exits: {crashes}")
    print(f"- latest: {latest_at} label={latest_label} inputCount={latest_event.get('inputCount')} newCoverageKeys={latest_event.get('newCoverageKeys')} newFeatureKeys={latest_event.get('newFeatureKeys')} corpusSize={latest_event.get('corpusSize')}")
    if coverage_new == 0 and feature_new == 0 and failure_key_new == 0:
        print("- action-needed: coverage-guided lower-level novelty is stalled; improve target shape, semantic features, mutation, corpus selection, or split targets.")
    elif coverage_new == 0 and feature_new == 0:
        print("- check: coverage/semantic novelty is stalled, but new failure-key novelty is feeding corpus selection; keep this capped until product-bug families remain diverse.")
    elif coverage_new == 0:
        print("- check: V8 coverage novelty is stalled but semantic novelty remains; keep improving branch-like semantic features, target split, or mutation changes rather than only adding corpus.")
    elif feature_new == 0:
        print("- check: semantic novelty is stalled; add feature feedback or oracle classes if the target is still important.")
    print()
    print("| group | recent events | recent inputs | new coverage keys | new semantic feature keys | nonzero exits | latest corpus | status |")
    print("| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |")
    for group in sorted(group_events):
        samples = list(group_events[group])
        group_coverage_new = sum(int(event.get("newCoverageKeys") or 0) for _, _, _, event in samples)
        group_feature_new = sum(int(event.get("newFeatureKeys") or 0) for _, _, _, event in samples)
        group_failure_key_new = len({
            str(event.get("failureCanonicalKey"))
            for _, _, _, event in samples
            if event.get("newFailureKey") and event.get("failureCanonicalKey")
        })
        group_inputs = sum(int(event.get("inputCount") or 0) for _, _, _, event in samples)
        group_crashes = sum(1 for _, _, _, event in samples if event.get("exitCode") not in (0, "0", None))
        latest_group_event = samples[-1][3]
        status = "ok"
        if group_coverage_new == 0 and group_feature_new == 0 and group_failure_key_new == 0:
            status = "ACTION-NEEDED: no recent coverage or semantic novelty; hold, retarget, or change mutation/corpus policy"
        elif group_coverage_new == 0 and group_feature_new == 0:
            status = "check: failure-key novelty only; keep capped and watch bug-family diversity"
        elif group_coverage_new == 0:
            status = "check: semantic novelty only; inspect target split/oracle depth before adding capacity"
        elif group_feature_new == 0:
            status = "check: coverage novelty only; improve semantic feature feedback if target remains important"
        print(f"| {group} | {len(samples)} | {group_inputs} | {group_coverage_new} | {group_feature_new} | {group_crashes} | {latest_group_event.get('corpusSize')} | {status} |")
PY
    echo
    echo "## Lower-Level Output Effectiveness Gate"
    python3 - "$roots_file" <<'PY'
import json
import os
import re
import sys
from collections import Counter

roots = []
try:
    with open(sys.argv[1], errors="ignore") as handle:
        for line in handle:
            parts = line.rstrip("\n").split("\t", 1)
            if len(parts) == 2 and parts[1] and os.path.isdir(parts[1]):
                roots.append((parts[0], parts[1]))
except OSError:
    pass

lower_levels = ("unit-property", "coverage-guided-lower-level")

def infer_level(text):
    lower = text.lower()
    if "coverage-guided-lower" in lower:
        return "coverage-guided-lower-level"
    if "unit-property" in lower or "lower-level-fuzz" in lower:
        return "unit-property"
    return ""

def parse_status_line(line):
    parts = line.rstrip("\n").split("\t")
    row = {"timestamp": parts[0] if parts else ""}
    for part in parts[1:]:
        if "=" in part:
            key, value = part.split("=", 1)
            row[key] = value
    return row

def log_tail(path, max_bytes=65536):
    if not path:
        return ""
    try:
        size = os.path.getsize(path)
        with open(path, "rb") as handle:
            if size > max_bytes:
                handle.seek(-max_bytes, os.SEEK_END)
            return handle.read().decode("utf-8", errors="replace")
    except OSError:
        return ""

def normalize_semantic_key(value):
    key = re.sub(r"\s+", "_", str(value or "").strip())
    key = re.sub(r"[^A-Za-z0-9_./:-]+", "_", key).strip("_")
    return key[:220]

def classify(log_text):
    lower = log_text.lower()
    if "no space left on device" in lower or "enospc" in lower:
        return "infra-enospc"
    if "tests:       0 total" in lower or "tests: 0 total" in lower:
        return "harness-no-tests"
    if "cannot find module" in lower or "module not found" in lower:
        return "harness-import"
    if "assert" in lower or "expected" in lower or "test suites: 1 failed" in lower:
        return "lower-level-assertion"
    return "failed-run"

def semantic_key(log_text, fallback):
    explicit_patterns = [
        r'"(?:failureSummary|failureCanonicalKey|failureKey|canonicalFailureKey|semanticFailureKey)"\s*:\s*"([^"]{4,220})"',
        r"(?:failureSummary|failureCanonicalKey|failureKey|canonicalFailureKey|semanticFailureKey)[:=]\s*([^\r\n]{4,220})",
        r"\b(RTC_[A-Z0-9_]+(?::[A-Za-z0-9_.-]+){0,24})\b",
    ]
    for pattern in explicit_patterns:
        match = re.search(pattern, log_text)
        if match:
            key = normalize_semantic_key(match.group(1))
            if key:
                return key
    patterns = [
        r"at (?:Object\.)?([A-Za-z0-9_$<>.]+) \((packages/[^:]+):([0-9]+):[0-9]+\)",
        r"at ([A-Za-z0-9_$<>.]+) \((packages/[^:]+):([0-9]+):[0-9]+\)",
        r"(packages/[^:\s]+):([0-9]+):[0-9]+",
    ]
    for pattern in patterns:
        match = re.search(pattern, log_text)
        if not match:
            continue
        if len(match.groups()) == 3:
            fn, path, line = match.groups()
        else:
            path, line = match.groups()
            fn = "unknown"
        return f"{path}:{line}:{fn}"
    return fallback

stats = {
    level: {
        "roots": set(),
        "status_rows": 0,
        "failed_rows": 0,
        "candidate_rows": 0,
        "executions": 0,
        "failure_classes": Counter(),
        "semantic_keys": Counter(),
        "feature_keys": Counter(),
        "bug_keys": Counter(),
    }
    for level in lower_levels
}

for label, root in roots:
    level = infer_level(" ".join([label, root]))
    if level not in stats:
        continue
    stats[level]["roots"].add(root)
    status_path = os.path.join(root, "status.tsv")
    if os.path.exists(status_path):
        try:
            lines = open(status_path, errors="replace").read().splitlines()
        except OSError:
            lines = []
        for line in lines:
            row = parse_status_line(line)
            stats[level]["status_rows"] += 1
            try:
                exit_code = int(str(row.get("exit", row.get("exitCode", "0"))))
            except ValueError:
                exit_code = 0
            if exit_code == 0:
                continue
            stats[level]["failed_rows"] += 1
            log_text = log_tail(row.get("log") or row.get("logPath") or "")
            failure_class = classify(log_text)
            stats[level]["failure_classes"][failure_class] += 1
            if failure_class == "lower-level-assertion":
                stats[level]["candidate_rows"] += 1
                fallback = f"{os.path.basename(root)}:{row.get('seed_start', row.get('attempt', 'unknown'))}:{exit_code}"
                key = semantic_key(log_text, fallback)
                stats[level]["semantic_keys"][key] += 1
                stats[level]["bug_keys"][key] += 1

    seen_event_lines = set()
    for dirpath, _, files in os.walk(root):
        if "events.ndjson" not in files:
            continue
        path = os.path.join(dirpath, "events.ndjson")
        try:
            with open(path, errors="ignore") as events:
                for line in events:
                    if '"kind":"seed-attempt-complete"' not in line:
                        continue
                    event_key = line.strip()
                    if event_key in seen_event_lines:
                        continue
                    seen_event_lines.add(event_key)
                    try:
                        event = json.loads(line)
                    except Exception:
                        event = {}
                    for key in ("testExecutionCount", "individualTestExecutionCount", "executionUnitCount", "inputCount"):
                        match = re.search(rf'"{key}"\s*:\s*([0-9]+)', line)
                        if match:
                            stats[level]["executions"] += max(1, int(match.group(1)))
                            break
                    else:
                        stats[level]["executions"] += 1
                    is_failure = event.get("ok") is False or str(event.get("exitCode") or "0") not in ("0", "")
                    semantic_features = event.get("semanticFeatureKeys") or event.get("semanticFeatures")
                    if isinstance(semantic_features, list):
                        for feature in semantic_features:
                            feature_key = normalize_semantic_key(feature)
                            if feature_key:
                                key = f"feature:{feature_key}"
                                stats[level]["semantic_keys"][key] += 1
                                stats[level]["feature_keys"][key] += 1
                    if is_failure:
                        semantic = (
                            event.get("failureCanonicalKey")
                            or event.get("canonicalFailureKey")
                            or event.get("semanticFailureKey")
                            or event.get("failureSummary")
                        )
                        semantic = normalize_semantic_key(semantic)
                        if semantic:
                            stats[level]["semantic_keys"][semantic] += 1
                            stats[level]["bug_keys"][semantic] += 1
                            stats[level]["candidate_rows"] += 1
        except OSError:
            pass

print("| level | roots | executions | failed rows | assertion rows | unique semantic outputs | unique feature outputs | unique bug/assertion outputs | top bug/assertion outputs | top semantic outputs | status |")
print("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |")
for level in lower_levels:
    data = stats[level]
    unique_outputs = len(data["semantic_keys"])
    unique_features = len(data["feature_keys"])
    unique_bug_outputs = len(data["bug_keys"])
    top_bug = ", ".join(f"{key} ({count})" for key, count in data["bug_keys"].most_common(3)) or "none"
    top = ", ".join(f"{key} ({count})" for key, count in data["semantic_keys"].most_common(3)) or "none"
    status = "ok"
    if data["executions"] >= 20000 and unique_bug_outputs == 0:
        status = (
            "ACTION-NEEDED: high execution count but zero unique bug/assertion outputs; "
            "do not count semantic feature novelty as yield, cap exploration and retarget to a stronger oracle"
        )
    elif data["executions"] >= 50000 and unique_bug_outputs <= 2:
        status = (
            "ACTION-NEEDED: lower-level executions are collapsing to too few unique bug/assertion outputs; "
            "add a new bounded target/oracle, improve the oracle, or demote the lane"
        )
    elif unique_features > 0 and unique_bug_outputs == 0 and data["executions"] >= 5000:
        status = (
            "ACTION-NEEDED: semantic features are flowing but no bug/assertion output is visible; "
            "feature novelty is not enough to keep expanding this lane"
        )
    if data["failed_rows"] and not data["candidate_rows"] and data["failure_classes"]:
        top_class, _ = data["failure_classes"].most_common(1)[0]
        if top_class.startswith("infra-") or top_class.startswith("harness-"):
            status = f"ACTION-NEEDED: lower-level failures are dominated by {top_class}; fix infra/harness noise before treating the lane as productive"
    print(
        f"| {level} | {len(data['roots'])} | {data['executions']} | {data['failed_rows']} | "
        f"{data['candidate_rows']} | {unique_outputs} | {unique_features} | {unique_bug_outputs} | {top_bug} | {top} | {status} |"
    )

print()
print("- Gate policy: a lower-level lane is not productive merely because it is alive, fast, or emitting semantic feature keys. Semantic feature novelty is useful guidance, but the optimization target is unique product-bug or assertion output. If high execution count yields zero or very few bug/assertion outputs, the feedback action must cap, demote, retarget, or add a stronger oracle instead of only adding feature buckets.")
PY
    echo
    echo "## Bug-Finding Yield Gate"
    python3 - "$roots_file" "$coverage_root" <<'PY'
import json
import os
import re
import subprocess
import sys
import time
from collections import Counter
from datetime import datetime

roots_file = sys.argv[1]
coverage_root = sys.argv[2] if len(sys.argv) > 2 else ""
e2e_floor = int(os.environ.get("RTC_FUZZ_LEVEL_MIX_E2E_MIN_LANES", "24"))
unit_explore_cap = int(os.environ.get("RTC_FUZZ_LEVEL_MIX_UNIT_EXPLORE_CAP", "1"))

roots = []
try:
    with open(roots_file, errors="ignore") as handle:
        for line in handle:
            parts = line.rstrip("\n").split("\t", 1)
            if len(parts) == 2 and parts[1] and os.path.isdir(parts[1]):
                roots.append((parts[0], parts[1]))
except OSError:
    pass

def load_json(path):
    try:
        with open(path, errors="ignore") as handle:
            return json.load(handle)
    except Exception:
        return None

def parse_ts(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp()
    except Exception:
        return None

def lane_count(group):
    try:
        return max(1, int(group.get("lanes", 1) or 1))
    except Exception:
        return 1

def group_level(group):
    name = str(group.get("name") or "").lower()
    transport = str(group.get("transport") or "").lower()
    env = group.get("env") if isinstance(group.get("env"), dict) else {}
    profile = str(env.get("GUTENBERG_RTC_BROWSER_ACTION_PROFILE") or env.get("RTC_FUZZ_ACTION_PROFILE") or group.get("profile") or "").lower()
    text = " ".join([name, transport, profile])
    if "coverage-guided-lower" in text:
        return "coverage-guided-lower-level"
    if "unit" in text or "property" in text or "jest" in text:
        return "unit-property"
    if "backend" in text or "rest-api" in text or "phpunit-rest" in text:
        return "backend-api"
    if "protocol" in text:
        return "protocol-server"
    if "assert" in text or "fuzz-only" in text:
        return "fuzz-assertion"
    return "browser-e2e"

def event_level(label, root):
    lower = " ".join([label, root]).lower()
    if "coverage-guided-lower" in lower:
        return "coverage-guided-lower-level"
    if "unit-property" in lower or "lower-level-fuzz" in lower:
        return "unit-property"
    if "backend-api" in lower or "rest-api" in lower:
        return "backend-api"
    if "protocol" in lower or "native-assert" in lower:
        return "protocol-server"
    if "fuzz-only" in lower or "fuzz-assert" in lower:
        return "fuzz-assertion"
    return "browser-e2e"

def live_dirs(group_state):
    if not isinstance(group_state, dict):
        return []
    dirs = []
    for candidate in [group_state.get("currentRunDir"), *(group_state.get("activeRunDirs") or [])]:
        if candidate and candidate not in dirs and os.path.isdir(candidate):
            dirs.append(candidate)
    return dirs

def pid_is_live(pid):
    try:
        os.kill(int(pid), 0)
        return True
    except PermissionError:
        return True
    except Exception:
        return False

def pid_is_browser_runner(pid):
    if not pid_is_live(pid):
        return False
    try:
        args = subprocess.check_output(
            ["ps", "-p", str(int(pid)), "-o", "args="],
            text=True,
            stderr=subprocess.DEVNULL,
        )
    except Exception:
        return False
    return "rtc-browser-fuzz-runner.mjs" in args

def live_lane_pids(group_state):
    pids = set()
    for run_dir in live_dirs(group_state):
        lanes = load_json(os.path.join(run_dir, "lanes.json"))
        lanes = lanes.get("lanes") if isinstance(lanes, dict) else lanes
        if not isinstance(lanes, list):
            continue
        for lane in lanes:
            if not isinstance(lane, dict):
                continue
            pid = lane.get("pid")
            if pid and pid_is_browser_runner(pid):
                pids.add(int(pid))
    return pids

def normalize(value):
    key = re.sub(r"\s+", "_", str(value or "").strip())
    key = re.sub(r"[^A-Za-z0-9_./:-]+", "_", key).strip("_")
    return key[:220]

def is_infra_or_harness_output(value):
    text = str(value or "").lower()
    infra_markers = (
        "harness-no-tests",
        "no tests found",
        "tests: 0 total",
        "cannot find module",
        "module not found",
        "enospc",
        "no space left on device",
        "playwright_host_dependency",
        "startup",
        "bootstrap",
        "wp-env",
        "rest health",
        "ecconnrefused",
        "unknown-failure",
    )
    return any(marker in text for marker in infra_markers)

active_lanes = Counter()
paused_browser = 0
for label, root in roots:
    groups = load_json(os.path.join(root, "supervisor-groups.json"))
    if not isinstance(groups, list):
        continue
    state_path = os.path.join(root, "supervisor-state.json")
    state = load_json(state_path)
    if isinstance(state, list):
        state_groups = state
    elif isinstance(state, dict):
        state_groups = state.get("groups") if isinstance(state.get("groups"), list) else []
    else:
        state_groups = []
    state_by_name = {
        str(group.get("name") or ""): group
        for group in state_groups
        if isinstance(group, dict)
    }
    state_time = parse_ts((state or {}).get("lastUpdatedAt") or (state or {}).get("updatedAt") or (state or {}).get("startedAt")) if isinstance(state, dict) else None
    if state_time is None:
        try:
            state_time = os.path.getmtime(state_path)
        except OSError:
            state_time = None
    state_fresh = state_time is not None and time.time() - state_time <= 600
    for group in groups:
        if not isinstance(group, dict):
            continue
        lanes = lane_count(group)
        level = group.get("fuzzLevel") or group.get("fuzz_level") or group_level(group)
        if level == "browser-e2e":
            state_row = state_by_name.get(str(group.get("name") or ""))
            status = str((state_row or {}).get("status") or "")
            live_pids = live_lane_pids(state_row)
            if status == "running" and live_pids:
                active_lanes[level] += len(live_pids)
            elif status.startswith("paused"):
                paused_browser += lanes
        else:
            active_lanes[level] += lanes

execution_counts = Counter()
bug_outputs = {level: Counter() for level in ("unit-property", "coverage-guided-lower-level", "backend-api", "protocol-server", "fuzz-assertion")}
failed_rows = Counter()
for label, root in roots:
    level = event_level(label, root)
    if level in bug_outputs:
        status_path = os.path.join(root, "status.tsv")
        if os.path.exists(status_path):
            try:
                for line in open(status_path, errors="replace"):
                    if "\texit=0" in line or "\texitCode=0" in line:
                        continue
                    if "\texit=" in line or "\texitCode=" in line:
                        failed_rows[level] += 1
            except OSError:
                pass
    seen = set()
    for dirpath, _, files in os.walk(root):
        if "events.ndjson" not in files:
            continue
        try:
            for line in open(os.path.join(dirpath, "events.ndjson"), errors="ignore"):
                if '"kind":"seed-attempt-complete"' not in line:
                    continue
                line_key = line.strip()
                if line_key in seen:
                    continue
                seen.add(line_key)
                try:
                    event = json.loads(line)
                except Exception:
                    event = {}
                for key in ("testExecutionCount", "individualTestExecutionCount", "executionUnitCount", "inputCount", "caseCount"):
                    value = event.get(key)
                    if isinstance(value, int):
                        execution_counts[level] += max(1, value)
                        break
                else:
                    execution_counts[level] += 1
                is_failure = event.get("ok") is False or str(event.get("exitCode") or "0") not in ("0", "")
                if is_failure and level in bug_outputs:
                    semantic = (
                        event.get("failureCanonicalKey")
                        or event.get("canonicalFailureKey")
                        or event.get("semanticFailureKey")
                        or event.get("failureSummary")
                        or event.get("error")
                        or "unknown-failure"
                    )
                    if not is_infra_or_harness_output(semantic):
                        bug_outputs[level][normalize(semantic)] += 1
        except OSError:
            pass

likely_real = None
likely_real_display = "unknown"
if coverage_root:
    status_text = ""
    try:
        status_path = os.path.join(coverage_root, "novelty-status.md")
        status_text = open(status_path, errors="ignore").read()
    except OSError:
        pass
    status_pending = "pending until first pass" in status_text or "startup status only" in status_text
    if status_pending:
        likely_real_display = "unknown (pending novelty pass)"
    else:
        state_path = os.path.join(coverage_root, "novelty-state.json")
        state = load_json(state_path)
        if isinstance(state, dict):
            current_yield = state.get("triageYieldCurrent")
            if isinstance(current_yield, dict):
                try:
                    likely_real = int(current_yield.get("likelyRealVisible") or 0)
                except (TypeError, ValueError):
                    likely_real = None
        if likely_real is None and status_text:
            match = re.search(
                r"^## Triage Yield\n(?P<section>.*?)(?:\n## |\Z)",
                status_text,
                flags=re.M | re.S,
            )
            if match:
                current_match = re.search(
                    r"^- likely-real visible:\s*([0-9]+)",
                    match.group("section"),
                    flags=re.M,
                )
                if current_match:
                    likely_real = int(current_match.group(1))
        if likely_real is not None:
            likely_real_display = str(likely_real)

print("- policy: optimize for unique product-bug or assertion output per resource, not raw execution count or semantic feature novelty.")
print("- infra/harness failures are excluded from bug/assertion output; they are blockers, not yield.")
print(f"- e2e minimum active lane floor: {e2e_floor}")
print(f"- unit/property exploration cap when bug output is zero: {unit_explore_cap} lane(s)")
print(f"- browser/e2e likely-real visible from current coverage status: {likely_real_display}")
print()
print("| level | active lanes | executions | failed rows | unique bug/assertion outputs | status |")
print("| --- | ---: | ---: | ---: | ---: | --- |")

e2e_status = "ok"
if active_lanes["browser-e2e"] < e2e_floor:
    e2e_status = "ACTION-NEEDED: browser/e2e active lanes are below floor; backfill e2e or write the exact load/noise blocker"
print(f"| browser-e2e | {active_lanes['browser-e2e']} | {execution_counts['browser-e2e']} | n/a | {likely_real_display} likely-real visible | {e2e_status} |")

for level in ("unit-property", "coverage-guided-lower-level", "backend-api", "protocol-server", "fuzz-assertion"):
    unique = len(bug_outputs[level])
    status = "ok"
    if level == "unit-property" and execution_counts[level] >= 20000 and unique == 0:
        status = "ACTION-NEEDED: high unit/property volume with zero bug/assertion output; cap at exploration budget and retarget before spending more cycles"
    elif level == "coverage-guided-lower-level" and execution_counts[level] >= 5000 and unique == 0:
        status = "ACTION-NEEDED: coverage-guided lower-level has no bug/assertion output; retarget or strengthen oracle before expanding"
    elif active_lanes[level] == 0:
        status = "blocked-or-zero: justify explicitly before claiming full-level coverage"
    print(f"| {level} | {active_lanes[level]} | {execution_counts[level]} | {failed_rows[level]} | {unique} | {status} |")

if active_lanes["unit-property"] > unit_explore_cap and len(bug_outputs["unit-property"]) == 0:
    print(f"- ACTION-NEEDED: unit/property has {active_lanes['unit-property']} lanes but zero bug/assertion output; reduce to {unit_explore_cap} or retarget.")
if active_lanes["browser-e2e"] < e2e_floor and paused_browser:
    print(f"- ACTION-NEEDED: {paused_browser} browser lane(s) are paused while e2e is below floor; backfill with non-paused high-yield e2e groups or fix the startup/noise pause.")
PY
    echo
    echo "## Resource Autoscaler And Browser Materialization"
    if [ -f /media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516/resource-autoscaler-status.md ]; then
      sed -n '1,120p' /media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516/resource-autoscaler-status.md
    else
      echo "No resource-autoscaler-status.md found."
    fi
    echo
    python3 - "$coverage_root" <<'PY'
import json
import os
import sys
import time
from datetime import datetime
from collections import Counter

root = sys.argv[1] if len(sys.argv) > 1 else ""
state_path = os.path.join(root, "supervisor-state.json") if root else ""
if not state_path or not os.path.exists(state_path):
    print("- ACTION-NEEDED: no current supervisor-state.json found; browser/e2e materialization has no current supervisor state artifact.")
    raise SystemExit
try:
    state = json.load(open(state_path))
except Exception as exc:
    print(f"- could not read {state_path}: {exc}")
    raise SystemExit
if isinstance(state, list):
    groups = state
elif isinstance(state, dict):
    groups = state.get("groups")
else:
    groups = []
if not isinstance(groups, list):
    groups = []
active_dirs = set()
status_counts = Counter()
details = []
for group in groups:
    if not isinstance(group, dict):
        continue
    status = group.get("status") or "unknown"
    status_counts[status] += 1
    for run_dir in [group.get("currentRunDir"), *(group.get("activeRunDirs") or [])]:
        if run_dir:
            active_dirs.add(run_dir)
    if status == "paused-infra-startup":
        details.append(
            f"{group.get('name')}: {str(group.get('lastReason') or '')[:180]}"
        )
updated_raw = (state.get("lastUpdatedAt") or state.get("startedAt")) if isinstance(state, dict) else None
try:
    updated = datetime.fromisoformat(str(updated_raw).replace("Z", "+00:00")).timestamp()
except Exception:
    try:
        updated = os.path.getmtime(state_path)
    except OSError:
        updated = None
age = int(max(0, time.time() - updated)) if updated else "unknown"
print(f"- supervisor_state: {state_path}")
print(f"- supervisor_state_age_seconds: {age}")
print(f"- supervisor_status_counts: {dict(status_counts)}")
print(f"- materialized_active_run_dirs: {len(active_dirs)}")
print(f"- paused_infra_startup_groups: {status_counts.get('paused-infra-startup', 0)}")
if not active_dirs and status_counts.get("paused-infra-startup", 0):
    print("- ACTION-NEEDED: browser/e2e budget is requested but no supervisor run directories materialized.")
if isinstance(age, int) and age > 600 and not active_dirs:
    print("- ACTION-NEEDED: supervisor state is stale while no browser/e2e run directories are active.")
for detail in details[:8]:
    print(f"- {detail}")
PY
    if [ -f /media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516/materialization/latest.md ]; then
      materialization_diag=/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516/materialization/latest.md
      materialization_diag_age="$(python3 - "$materialization_diag" <<'PY'
import re
import sys
import time
from datetime import datetime

try:
    text = open(sys.argv[1], errors="ignore").read(4096)
except OSError:
    print("unknown")
    raise SystemExit
match = re.search(r"^- at:\s*(\S+)", text, re.MULTILINE)
if not match:
    print("unknown")
    raise SystemExit
try:
    ts = datetime.fromisoformat(match.group(1).replace("Z", "+00:00")).timestamp()
except Exception:
    print("unknown")
    raise SystemExit
print(int(max(0, time.time() - ts)))
PY
)"
      echo
      if [ "$materialization_diag_age" != "unknown" ] && [ "$materialization_diag_age" -gt 1800 ]; then
        echo "### Historical materialization diagnostic (stale; not current state)"
        echo
        echo "- diagnostic_age_seconds: $materialization_diag_age"
        awk '/^## tmux/ { exit } { print }' "$materialization_diag"
      else
        echo "### Latest materialization diagnostic"
        echo
        echo "- diagnostic_age_seconds: $materialization_diag_age"
        awk '/^## tmux/ { exit } { print }' "$materialization_diag" | sed -n '1,120p'
      fi
    fi
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
      sed -n '1,160p' "$file" |
        sed \
          -e 's/TELEMETRY-INVARIANT-FAIL/HISTORICAL_TELEMETRY_INVARIANT_FAIL/g' \
          -e 's/ACTION-NEEDED/HISTORICAL_ACTION_NEEDED/g'
    done
  } > "$run_dir/context.md"
}

write_context() {
  local run_dir="$1"
  local attempt
  for attempt in 1 2 3; do
    write_context_once "$run_dir"
    if ! grep -q 'current-run-root changed during context generation' "$run_dir/context.md" 2>/dev/null; then
      return
    fi
    cp "$run_dir/context.md" "$run_dir/context.root-race-attempt-${attempt}.md"
    sleep 5
  done
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

Treat Productive Analysis Control Feed rows in context.md as controller input. If a row targets level-mix, coverage, lower-level, or deferred fuzzing, make the smallest safe mix/control change or explicitly reject it with evidence in the report.

Before recommending work, audit the context itself. Treat any TELEMETRY-INVARIANT-FAIL line as the highest-priority bug: the loop must not ask personas to reason from a view that disagrees with tmux, current-run roots, status.tsv, or events.ndjson. A lane merely existing is not enough; evaluate whether its executions, novelty counters, crash/noise counters, and corpus growth are visible and useful.

Also audit the control plane itself. Treat any ACTION-NEEDED row in "Control-Plane Self-Audit" as a controller bug to fix before making mix recommendations. Missing exact tmux sessions, prefix-only session matches, empty coverage supervisor groups, zero materialized coverage groups, or a historical-noise hold while current-run noise is clear are not acceptable steady states.

Also audit materialization. Treat any ACTION-NEEDED line in "Resource Autoscaler And Browser Materialization" as a control-loop failure: requested browser/e2e budget does not count as useful work unless the supervisor has live run directories or running groups. If the novelty monitor is alive but the supervisor is stale or all groups are paused on infra startup, recommend or make the smallest bounded fix that restarts/remediates the materialization path and exposes the failure in the status graph/context.

Also audit runner throughput. Treat any ACTION-NEEDED line in "Runner Throughput Diagnostics" as an actionable loop failure, not background data. A low-level lane that repeatedly launches npm-run-test-unit/Jest per batch, spends most wall time in startup/transforms/coverage setup, or sleeps between batches should either be changed to amortize startup, replaced with a persistent/direct lower-level harness, given a larger useful batch, or explicitly justified with evidence.

Also audit lower-level output effectiveness. Treat any ACTION-NEEDED line in "Lower-Level Output Effectiveness Gate" as binding. A lower-level lane that executes many cases but collapses to one or two semantic assertion families is not productive enough; recommend the smallest concrete target/oracle/canonicalization change that should increase unique semantic bug output. Do not answer only that the lane is running.

Also audit bug-finding yield. Treat any ACTION-NEEDED line in "Bug-Finding Yield Gate" as binding. Optimize for unique product-bug output and triage-ready assertion families, not execution count, semantic feature novelty, or equal lane diversity. If browser/e2e is the visible source of likely product bugs and is below its active-lane floor, recommend e2e backfill or the exact load/noise blocker. If unit/property has high execution volume but zero bug/assertion output, keep it at a small exploration budget and retarget rather than expanding or calling it healthy.

Return:
1. Whether the current level mix should change now.
2. The smallest useful bug-finding change, with exact files/scripts/commands.
3. Which lower-level target, if any, should be added first and why.
4. How to validate without stopping productive browser fuzzing.
5. Any telemetry/accounting blind spot that would make this recommendation unreliable, and the smallest fix.
6. Any throughput blind spot or overhead-dominated runner that would make the current mix less useful than the lane count suggests.
7. Any reason to keep spending resources on a low-yield lane despite zero unique bug/assertion output.
8. Risks or reasons to reject changing the mix now.

Do not edit files in this review pass.
EOF

  tmux new-session -d -s "rtc-level-mix-$slug-$(basename "$run_dir")" "bash -lc 'cd \"$FUZZ_REPO\"; timeout --kill-after=60s \"$CODEX_TIMEOUT_SECONDS\" \"$CODEX_BIN\" -a never exec --skip-git-repo-check -m \"$MODEL\" -c model_reasoning_effort=\"$REASONING\" -s danger-full-access < \"$prompt\" > \"$out\" 2> \"$err\"; echo \$? > \"$rc_file\"'"
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
3. Telemetry/accounting defects that must be fixed before trusting the mix.
4. Disagreements or blockers.
5. Exact validation/restart plan.
6. Short status note for another agent.

Do not edit files.
EOF

  (
    cd "$FUZZ_REPO" || exit 1
    timeout --kill-after=60s "$CODEX_TIMEOUT_SECONDS" "$CODEX_BIN" -a never exec --skip-git-repo-check -m "$MODEL" -c "model_reasoning_effort=$REASONING" -s danger-full-access < "$prompt" > "$out" 2> "$err"
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
  if [ -f "$run_dir/context.md" ]; then
    cp "$run_dir/context.md" "$run_dir/context.pre-feedback-action.md"
  fi
  write_context "$run_dir"

  cat > "$prompt" <<EOF
Task: make the fuzz-level mix control decision after two continuous persona review iterations.

Cycle index: $cycle_index

Read:
- $run_dir/context.md
- $run_dir/synthesis.md
- The previous cycle synthesis and reports from:
$recent

The controller should not wait for error conditions. If the current mix still has zero active unit/property, coverage-guided lower-level, backend/API, protocol/server, or fuzz-assertion lanes, either add or launch the smallest bounded lower-level target with a clear oracle, or write the exact blocker and the next command/code change needed. Do not stop productive browser fuzzing to do this.

Treat Productive Analysis Control Feed rows in context.md as controller input. High-priority rows need either an implemented bounded action or an explicit rejection with evidence.

If context.md contains TELEMETRY-INVARIANT-FAIL, fix the accounting/context-builder blind spot first, validate by regenerating a context that no longer contradicts live tmux/events, and only then make fuzzing mix changes. If coverage-guided lower-level quality says action-needed, make a concrete guidance-quality improvement or write the exact blocker; do not treat "the lane is running" as success by itself.

If "Control-Plane Self-Audit" contains ACTION-NEEDED, fix that controller failure first. Do not accept an alive watchdog as proof the main loop is alive; use exact tmux session checks. Do not allow coverage-guided novelty to sit with empty supervisor groups when current-run duplicate/noise is clear; repair the gating policy or restart the coverage path after applying the fix.

If "Resource Autoscaler And Browser Materialization" contains ACTION-NEEDED, fix or restart the materialization path before treating CPU headroom or requested browser budget as success. The acceptable result is current supervisor run directories or a written blocker with the exact failed startup artifact and next remediation command.

If "Runner Throughput Diagnostics" contains ACTION-NEEDED, make a concrete throughput improvement or write the exact blocker and next code change. Examples of acceptable fixes: remove fixed normal-path sleeps, increase batch size when it improves useful executions without hiding crashes, bypass per-batch npm/Jest startup with a direct Node runner, split out an in-process persistent harness, or add telemetry proving the apparent overhead is not actually on the critical path.

If "Lower-Level Output Effectiveness Gate" contains ACTION-NEEDED, make a concrete lower-level yield improvement or write the exact blocker and next code change. Acceptable fixes include adding a new bounded lower-level target with a real oracle, expanding semantic feature feedback, improving mutation/corpus selection, emitting richer canonical failure keys, or routing lower-level assertion families into triage-ready failure artifacts. Do not treat high execution count or an alive lower-level tmux session as success.

If "Bug-Finding Yield Gate" contains ACTION-NEEDED, make a concrete bug-finding allocation change or write the exact blocker and next code change. Browser/e2e active lanes should be protected when it is the visible source of likely product bugs. Unit/property work with high execution volume and zero bug/assertion output must remain capped at exploration budget and be retargeted to a stronger oracle; adding semantic feature buckets alone is not an acceptable fix. Coverage-guided lower-level work must either produce triage-ready assertion/failure families or be retargeted.

You may edit files in $FUZZ_REPO or Jetstream loop scripts if needed. Prefer small, reversible changes. Run syntax checks for changed files. Restart only the relevant loop or lane if a restart is needed.

Write:
1. Decision made.
2. Changes made, with paths.
3. Validation run.
4. Whether any new lower-level executions should appear in the graph.
5. Whether telemetry reconciliation is clean after the change.
6. Whether runner throughput diagnostics are clean after the change.
7. Whether bug-finding yield should improve, and which graph/metric should show it.
8. Remaining blocker if no lower-level target was launched, coverage-guidance quality was not improved, output diversity remained collapsed, bug/assertion output remained zero, or throughput remained overhead-dominated.
EOF

  (
    cd "$FUZZ_REPO" || exit 1
    timeout --kill-after=60s "$CODEX_TIMEOUT_SECONDS" "$CODEX_BIN" -a never exec --skip-git-repo-check -m "$MODEL" -c "model_reasoning_effort=$REASONING" -s danger-full-access < "$prompt" > "$out" 2> "$err"
    echo "$?" > "$rc_file"
  )
}

cycle=0
if [ -n "${RTC_FUZZ_LEVEL_MIX_WRITE_CONTEXT_ONCE:-}" ]; then
  mkdir -p "$RTC_FUZZ_LEVEL_MIX_WRITE_CONTEXT_ONCE"
  write_context "$RTC_FUZZ_LEVEL_MIX_WRITE_CONTEXT_ONCE"
  exit 0
fi

log "level-mix persona loop started model=$MODEL reasoning=$REASONING max_parallel=$MAX_PARALLEL action_every=$ACTION_EVERY_CYCLES interval=${INTERVAL_SECONDS}s codex_timeout=${CODEX_TIMEOUT_SECONDS}s"
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
cat > "$BASE/rtc-fuzz-level-mix-watchdog.sh" <<'WATCHDOG'
#!/usr/bin/env bash
set -uo pipefail
BASE="${RTC_FUZZ_LEVEL_MIX_BASE:-/media/volume/danluu-fuzz-data/rtc-fuzz-level-mix-persona-loop-20260516}"
LOOP="$BASE/rtc-fuzz-level-mix-persona-loop.sh"
LOG="$BASE/logs/watchdog.log"
mkdir -p "$BASE/logs"
has_session() {
	tmux list-sessions -F '#S' 2>/dev/null | grep -Fxq "$1"
}
while true; do
	if ! has_session rtc-fuzz-level-mix-persona-loop; then
		printf '%s restarting rtc-fuzz-level-mix-persona-loop\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$LOG"
		tmux new-session -d -s rtc-fuzz-level-mix-persona-loop "$LOOP"
	fi
	sleep 60
done
WATCHDOG
chmod +x "$BASE/rtc-fuzz-level-mix-watchdog.sh"
tmux new-session -d -s rtc-fuzz-level-mix-persona-loop-watchdog "$BASE/rtc-fuzz-level-mix-watchdog.sh"
tmux ls | grep -E 'rtc-fuzz-level-mix|rtc-level-mix' || true
