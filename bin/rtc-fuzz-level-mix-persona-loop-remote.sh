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
FUZZ_ASSERT_BASE="${RTC_FUZZ_ASSERT_BASE:-/media/volume/danluu-fuzz-data/rtc-fuzz-only-asserts-20260516}"
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

add_root() {
  local roots_file="$1"
  local label="$2"
  local root="${3:-}"
  if [ -n "$root" ] && [ -d "$root" ]; then
    printf '%s\t%s\n' "$label" "$root" >> "$roots_file"
  fi
}

add_process_roots() {
  local roots_file="$1"
  local label="$2"
  local env_name="$3"
  local env_file root
  for env_file in /proc/[0-9]*/environ; do
    [ -r "$env_file" ] || continue
    root="$(tr '\0' '\n' < "$env_file" 2>/dev/null | sed -n "s/^${env_name}=//p" | sed -n '1p')"
    add_root "$roots_file" "$label" "$root"
  done
}

write_root_inventory() {
  local roots_file="$1"
  local coverage_root focused_root strict_root gap_root lower_root cg_lower_root
  : > "$roots_file"
  coverage_root="$(latest_coverage_root)"
  focused_root="$(current_root "$FOCUSED_BASE")"
  strict_root="$(current_root "$STRICT_BASE")"
  gap_root="$(current_root "$GAP_BASE")"
  lower_root="$(current_root "$LOWER_LEVEL_BASE")"
  cg_lower_root="$(current_root "$CG_LOWER_LEVEL_BASE")"

  add_root "$roots_file" "browser-coverage-current" "$coverage_root"
  add_root "$roots_file" "focused-current" "$focused_root"
  add_root "$roots_file" "strict-current" "$strict_root"
  add_root "$roots_file" "gap-current" "$gap_root"
  add_root "$roots_file" "unit-property-current" "$lower_root"
  add_root "$roots_file" "coverage-guided-lower-current" "$cg_lower_root"
  add_process_roots "$roots_file" "unit-property-process" "RTC_LOWER_LEVEL_RUN_ROOT"
  add_process_roots "$roots_file" "coverage-guided-lower-process" "RTC_CG_LOWER_LEVEL_RUN_ROOT"

  if [ -d "$NATIVE_ASSERT_BASE" ]; then
    while IFS= read -r marker; do
      add_root "$roots_file" "native-sidecar-current" "$(sed -n '1p' "$marker" 2>/dev/null || true)"
    done < <(
      find "$NATIVE_ASSERT_BASE" -path '*/current-run-root.txt' -printf '%p\n' 2>/dev/null |
        grep -E '/(coverage-guided-lower-level-live|protocol|backend|fuzz-assert)/' |
        sort
    )
  fi

  if [ -d "$FUZZ_ASSERT_BASE" ]; then
    add_root "$roots_file" "fuzz-assert-current" "$(current_root "$FUZZ_ASSERT_BASE")"
  fi

  awk -F '\t' 'NF == 2 && ! seen[$2]++ { print }' "$roots_file" > "$roots_file.tmp"
  mv "$roots_file.tmp" "$roots_file"
}

write_context() {
  local run_dir="$1"
  local coverage_root focused_root strict_root gap_root roots_file
  coverage_root="$(latest_coverage_root)"
  focused_root="$(current_root "$FOCUSED_BASE")"
  strict_root="$(current_root "$STRICT_BASE")"
  gap_root="$(current_root "$GAP_BASE")"
  roots_file="$run_dir/observed-roots.tsv"
  write_root_inventory "$roots_file"
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
    echo "## Observed Root Inventory"
    if [ -s "$roots_file" ]; then
      sed 's/^/- /; s/\t/: /' "$roots_file"
    else
      echo "- none"
    fi
    echo
    echo "## Active Fuzz-Level Mix"
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

counts = Counter()
groups = []
for label, root in roots:
    path = os.path.join(root, "supervisor-groups.json")
    if not os.path.exists(path):
        groups.append(("missing-supervisor-groups", label, 0, "", root))
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
        groups.append((level, group.get("name", ""), lanes, group.get("transport", ""), (group.get("env") or {}).get("GUTENBERG_RTC_BROWSER_ACTION_PROFILE") or (group.get("env") or {}).get("RTC_FUZZ_ACTION_PROFILE") or "", label, root))

for level in sorted(counts):
    print(f"- {level}: {counts[level]} lane(s)")
if not any(level in counts for level in ("unit-property", "coverage-guided-lower-level", "backend-api", "protocol-server", "fuzz-assertion")):
    print("- gap: 0 active unit/property, coverage-guided lower-level, backend/API, protocol/server, or fuzz-assertion lanes")
print()
print("| level | group | lanes | transport | profile | root label | root |")
print("| --- | --- | ---: | --- | --- | --- | --- |")
for row in groups:
    if row[0] == "missing-supervisor-groups":
        level, label, lanes, transport, root = row
        print(f"| {level} | missing | {lanes} | {transport} |  | {label} | {root} |")
        continue
    level, name, lanes, transport, profile, label, root = row
    print(f"| {level} | {name} | {lanes} | {transport} | {profile} | {label} | {root} |")
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
                        try:
                            event = json.loads(line)
                        except Exception:
                            event = {}
                        value = event.get("testExecutionCount") or event.get("individualTestExecutionCount")
                        if not value and level == "coverage-guided-lower-level":
                            value = event.get("inputCount")
                        if not value:
                            value = 1
                        try:
                            value = max(1, int(value))
                        except (TypeError, ValueError):
                            value = 1
                        counts[level] += value
                        recent[level] = (event.get("at") or "", label, root, value)
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
    for key in ("testExecutionCount", "individualTestExecutionCount", "executionUnitCount"):
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
                    level = event.get("fuzzLevel") or meta.get("fuzzLevel") or infer_level_from_text(" ".join([root, dirpath, group]))
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
                    records[(level, group)].append({
                        "at": event.get("at") or "",
                        "durationMs": duration_ms,
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

print("| level | group | recent events | avg batch sec | avg ms per execution | executions/hour/lane | sleep sec | command shape | status |")
print("| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |")
for (level, group), rows in sorted(records.items()):
    durations = [row["durationMs"] for row in rows]
    executions = [max(1, row["executions"]) for row in rows]
    avg_duration = statistics.mean(durations)
    total_exec = sum(executions)
    total_ms = sum(durations)
    ms_per_exec = total_ms / total_exec if total_exec else 0
    per_hour = total_exec * 3600000 / total_ms if total_ms else 0
    latest = rows[-1]
    command = latest["command"]
    shape = latest["strategy"] or ("spawn-npm-jest-per-batch" if any(pattern in command for pattern in startup_heavy_patterns) else "unknown")
    sleep = latest["sleepSeconds"]
    sleep_display = "" if sleep is None else str(sleep)
    status = "ok"
    if sleep not in (None, "", 0, "0"):
        status = f"ACTION-NEEDED: fixed sleep of {sleep}s between batches"
    elif shape == "spawn-npm-jest-per-batch" and avg_duration > 5000 and level in ("unit-property", "coverage-guided-lower-level"):
        status = "ACTION-NEEDED: per-batch npm/Jest startup dominates; consider persistent harness, larger batches, or direct runner"
    elif ms_per_exec > 1000 and level in ("unit-property", "coverage-guided-lower-level"):
        status = "ACTION-NEEDED: low execution throughput for lower-level target"
    print(f"| {level} | {group} | {len(rows)} | {avg_duration/1000:.2f} | {ms_per_exec:.1f} | {per_hour:.1f} | {sleep_display} | {shape} | {status} |")
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
    if session.startswith("rtc-fuzz-assertion-runner") or session.startswith("rtc-fuzz-only-assertion-runner"):
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
    for key in ("testExecutionCount", "individualTestExecutionCount"):
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
    proc = subprocess.run(["tmux", "ls"], text=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, check=False)
except FileNotFoundError:
    proc = subprocess.CompletedProcess([], 127, "")
for line in proc.stdout.splitlines():
    level = infer_level_from_text(line)
    if level:
        tmux_levels[level] += 1

event_levels = Counter()
latest = {}
now = time.time()
for label, root in roots:
    for dirpath, _, files in os.walk(root):
        if "events.ndjson" not in files:
            continue
        path = os.path.join(dirpath, "events.ndjson")
        try:
            with open(path, errors="ignore") as events:
                for line in events:
                    if '"kind":"seed-attempt-complete"' not in line:
                        continue
                    try:
                        event = json.loads(line)
                    except Exception:
                        event = {}
                    level = event_level(root, dirpath, event)
                    value = event_value(level, event)
                    event_levels[level] += value
                    at = event.get("at") or ""
                    latest[level] = (at, label, root, value)
        except OSError:
            continue

print("| level | tmux sessions | observed executions | latest event | latest root | status |")
print("| --- | ---: | ---: | --- | --- | --- |")
all_levels = sorted(set(tmux_levels) | set(event_levels) | {"unit-property", "coverage-guided-lower-level", "backend-api", "protocol-server", "fuzz-assertion"})
for level in all_levels:
    at, label, root, value = latest.get(level, ("", "", "", ""))
    status = "ok"
    if tmux_levels[level] and not event_levels[level]:
        status = "TELEMETRY-INVARIANT-FAIL: tmux session exists but no observed events in root inventory"
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
    print("- telemetry-invariant-failure: fuzz-assertion tmux is live but context roots do not show fuzz-assertion events.")
PY
    echo
    echo "## Coverage-Guided Lower-Level Quality"
    python3 - "$roots_file" <<'PY'
import json
import os
import sys
from collections import deque

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
                    try:
                        event = json.loads(line)
                    except Exception:
                        continue
                    events.append((event.get("at") or "", label, root, event))
        except OSError:
            pass

if not events:
    print("- no coverage-guided lower-level completion events in observed roots")
else:
    coverage_new = sum(int(event.get("newCoverageKeys") or 0) for _, _, _, event in events)
    feature_new = sum(int(event.get("newFeatureKeys") or 0) for _, _, _, event in events)
    inputs = sum(int(event.get("inputCount") or 0) for _, _, _, event in events)
    crashes = sum(1 for _, _, _, event in events if event.get("exitCode") not in (0, "0", None))
    latest_at, latest_label, latest_root, latest_event = events[-1]
    print(f"- recent events sampled: {len(events)}")
    print(f"- recent inputs: {inputs}")
    print(f"- recent new coverage keys: {coverage_new}")
    print(f"- recent new semantic feature keys: {feature_new}")
    print(f"- recent nonzero exits: {crashes}")
    print(f"- latest: {latest_at} label={latest_label} inputCount={latest_event.get('inputCount')} newCoverageKeys={latest_event.get('newCoverageKeys')} newFeatureKeys={latest_event.get('newFeatureKeys')} corpusSize={latest_event.get('corpusSize')}")
    if coverage_new == 0 and feature_new == 0:
        print("- action-needed: coverage-guided lower-level novelty is stalled; improve target shape, semantic features, mutation, corpus selection, or split targets.")
    elif coverage_new == 0:
        print("- action-needed: V8 coverage novelty is stalled but semantic novelty remains; consider target split, deeper oracles, or mutation changes rather than only adding corpus.")
    elif feature_new == 0:
        print("- action-needed: semantic novelty is stalled; add feature feedback or oracle classes if the target is still important.")
PY
    echo
    echo "## Lower-Level Output Effectiveness Gate"
    python3 - "$roots_file" <<'PY'
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
                stats[level]["semantic_keys"][semantic_key(log_text, fallback)] += 1

    for dirpath, _, files in os.walk(root):
        if "events.ndjson" not in files:
            continue
        path = os.path.join(dirpath, "events.ndjson")
        try:
            with open(path, errors="ignore") as events:
                for line in events:
                    if '"kind":"seed-attempt-complete"' not in line:
                        continue
                    for key in ("testExecutionCount", "individualTestExecutionCount", "executionUnitCount", "inputCount"):
                        match = re.search(rf'"{key}"\s*:\s*([0-9]+)', line)
                        if match:
                            stats[level]["executions"] += max(1, int(match.group(1)))
                            break
                    else:
                        stats[level]["executions"] += 1
        except OSError:
            pass

print("| level | roots | executions | failed rows | assertion rows | unique semantic outputs | top semantic outputs | status |")
print("| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |")
for level in lower_levels:
    data = stats[level]
    unique_outputs = len(data["semantic_keys"])
    top = ", ".join(f"{key} ({count})" for key, count in data["semantic_keys"].most_common(3)) or "none"
    status = "ok"
    if data["executions"] >= 50000 and unique_outputs <= 2:
        status = (
            "ACTION-NEEDED: lower-level executions are collapsing to too few unique semantic outputs; "
            "add a new bounded target/oracle or improve canonical failure keys"
        )
    if data["failed_rows"] and not data["candidate_rows"] and data["failure_classes"]:
        top_class, _ = data["failure_classes"].most_common(1)[0]
        if top_class.startswith("infra-") or top_class.startswith("harness-"):
            status = f"ACTION-NEEDED: lower-level failures are dominated by {top_class}; fix infra/harness noise before treating the lane as productive"
    print(
        f"| {level} | {len(data['roots'])} | {data['executions']} | {data['failed_rows']} | "
        f"{data['candidate_rows']} | {unique_outputs} | {top} | {status} |"
    )

print()
print("- Gate policy: a lower-level lane is not productive merely because it is alive or fast. If high execution count yields only one or two semantic assertion families, the feedback action must improve semantic-output diversity by changing the target, oracle, corpus/mutation strategy, or canonicalization.")
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
    print("- no current supervisor-state.json found")
    raise SystemExit
try:
    state = json.load(open(state_path))
except Exception as exc:
    print(f"- could not read {state_path}: {exc}")
    raise SystemExit
groups = state.get("groups") if isinstance(state, dict) else []
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
updated_raw = state.get("lastUpdatedAt") or state.get("startedAt")
try:
    updated = datetime.fromisoformat(str(updated_raw).replace("Z", "+00:00")).timestamp()
except Exception:
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
      echo
      echo "### Latest materialization diagnostic"
      sed -n '1,120p' /media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516/materialization/latest.md
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

Before recommending work, audit the context itself. Treat any TELEMETRY-INVARIANT-FAIL line as the highest-priority bug: the loop must not ask personas to reason from a view that disagrees with tmux, current-run roots, status.tsv, or events.ndjson. A lane merely existing is not enough; evaluate whether its executions, novelty counters, crash/noise counters, and corpus growth are visible and useful.

Also audit materialization. Treat any ACTION-NEEDED line in "Resource Autoscaler And Browser Materialization" as a control-loop failure: requested browser/e2e budget does not count as useful work unless the supervisor has live run directories or running groups. If the novelty monitor is alive but the supervisor is stale or all groups are paused on infra startup, recommend or make the smallest bounded fix that restarts/remediates the materialization path and exposes the failure in the status graph/context.

Also audit runner throughput. Treat any ACTION-NEEDED line in "Runner Throughput Diagnostics" as an actionable loop failure, not background data. A low-level lane that repeatedly launches npm-run-test-unit/Jest per batch, spends most wall time in startup/transforms/coverage setup, or sleeps between batches should either be changed to amortize startup, replaced with a persistent/direct lower-level harness, given a larger useful batch, or explicitly justified with evidence.

Also audit lower-level output effectiveness. Treat any ACTION-NEEDED line in "Lower-Level Output Effectiveness Gate" as binding. A lower-level lane that executes many cases but collapses to one or two semantic assertion families is not productive enough; recommend the smallest concrete target/oracle/canonicalization change that should increase unique semantic bug output. Do not answer only that the lane is running.

Return:
1. Whether the current level mix should change now.
2. The smallest useful change, with exact files/scripts/commands.
3. Which lower-level target, if any, should be added first and why.
4. How to validate without stopping productive browser fuzzing.
5. Any telemetry/accounting blind spot that would make this recommendation unreliable, and the smallest fix.
6. Any throughput blind spot or overhead-dominated runner that would make the current mix less useful than the lane count suggests.
7. Risks or reasons to reject changing the mix now.

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

  cat > "$prompt" <<EOF
Task: make the fuzz-level mix control decision after two continuous persona review iterations.

Cycle index: $cycle_index

Read:
- $run_dir/context.md
- $run_dir/synthesis.md
- The previous cycle synthesis and reports from:
$recent

The controller should not wait for error conditions. If the current mix still has zero active unit/property, coverage-guided lower-level, backend/API, protocol/server, or fuzz-assertion lanes, either add or launch the smallest bounded lower-level target with a clear oracle, or write the exact blocker and the next command/code change needed. Do not stop productive browser fuzzing to do this.

If context.md contains TELEMETRY-INVARIANT-FAIL, fix the accounting/context-builder blind spot first, validate by regenerating a context that no longer contradicts live tmux/events, and only then make fuzzing mix changes. If coverage-guided lower-level quality says action-needed, make a concrete guidance-quality improvement or write the exact blocker; do not treat "the lane is running" as success by itself.

If "Resource Autoscaler And Browser Materialization" contains ACTION-NEEDED, fix or restart the materialization path before treating CPU headroom or requested browser budget as success. The acceptable result is current supervisor run directories or a written blocker with the exact failed startup artifact and next remediation command.

If "Runner Throughput Diagnostics" contains ACTION-NEEDED, make a concrete throughput improvement or write the exact blocker and next code change. Examples of acceptable fixes: remove fixed normal-path sleeps, increase batch size when it improves useful executions without hiding crashes, bypass per-batch npm/Jest startup with a direct Node runner, split out an in-process persistent harness, or add telemetry proving the apparent overhead is not actually on the critical path.

If "Lower-Level Output Effectiveness Gate" contains ACTION-NEEDED, make a concrete lower-level yield improvement or write the exact blocker and next code change. Acceptable fixes include adding a new bounded lower-level target with a real oracle, expanding semantic feature feedback, improving mutation/corpus selection, emitting richer canonical failure keys, or routing lower-level assertion families into triage-ready failure artifacts. Do not treat high execution count or an alive lower-level tmux session as success.

You may edit files in $FUZZ_REPO or Jetstream loop scripts if needed. Prefer small, reversible changes. Run syntax checks for changed files. Restart only the relevant loop or lane if a restart is needed.

Write:
1. Decision made.
2. Changes made, with paths.
3. Validation run.
4. Whether any new lower-level executions should appear in the graph.
5. Whether telemetry reconciliation is clean after the change.
6. Whether runner throughput diagnostics are clean after the change.
7. Remaining blocker if no lower-level target was launched, coverage-guidance quality was not improved, output diversity remained collapsed, or throughput remained overhead-dominated.
EOF

  (
    cd "$FUZZ_REPO" || exit 1
    timeout --kill-after=60s "$CODEX_TIMEOUT_SECONDS" "$CODEX_BIN" -a never exec --skip-git-repo-check -m "$MODEL" -c "model_reasoning_effort=$REASONING" -s danger-full-access < "$prompt" > "$out" 2> "$err"
    echo "$?" > "$rc_file"
  )
}

cycle=0
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
while true; do
	if ! tmux has-session -t rtc-fuzz-level-mix-persona-loop 2>/dev/null; then
		printf '%s restarting rtc-fuzz-level-mix-persona-loop\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$LOG"
		tmux new-session -d -s rtc-fuzz-level-mix-persona-loop "$LOOP"
	fi
	sleep 60
done
WATCHDOG
chmod +x "$BASE/rtc-fuzz-level-mix-watchdog.sh"
tmux new-session -d -s rtc-fuzz-level-mix-persona-loop-watchdog "$BASE/rtc-fuzz-level-mix-watchdog.sh"
tmux ls | grep -E 'rtc-fuzz-level-mix|rtc-level-mix' || true
