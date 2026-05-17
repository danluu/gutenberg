#!/usr/bin/env bash
set -euo pipefail

OPS_DIR="${RTC_TREND_OPS_DIR:-/private/tmp/rtc-jetstream2-trend-autoupdate}"
CHECKOUT="${RTC_TREND_CHECKOUT:-/private/tmp/gutenberg-fuzz-progress-explain}"
ARTIFACT_DIR="$CHECKOUT/docs/explanations/architecture/rtc-jetstream2-fuzz-trends-20260515"
RUN_DIR="${1:-$OPS_DIR/runs/manual-$(date -u +%Y%m%dT%H%M%SZ)}"
INPUT_DIR="$RUN_DIR/inputs"
REMOTE_STAGE_ROOT="${RTC_REMOTE_STAGE_ROOT:-/media/volume/danluu-fuzz-data/rtc-graph-refresh-tmp}"

mkdir -p "$INPUT_DIR"

remote_script="$INPUT_DIR/remote-collect.sh"
cat > "$remote_script" <<'REMOTE'
#!/usr/bin/env bash
set -euo pipefail

REMOTE_STAGE_ROOT="${RTC_REMOTE_STAGE_ROOT:-/media/volume/danluu-fuzz-data/rtc-graph-refresh-tmp}"
OUT="$REMOTE_STAGE_ROOT/rtc-graphs-refresh-latest"
TAR="$REMOTE_STAGE_ROOT/rtc-graphs-refresh-latest.tar.gz"
COVERAGE_BASE="${RTC_COVERAGE_BASE:-/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515}"
PR_LOOP_BASE="${RTC_PR_LOOP_BASE:-/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515}"
DUP_LOOP_BASE="${RTC_DUP_LOOP_BASE:-/media/volume/danluu-fuzz-data/rtc-duplicate-noise-persona-loop-20260516}"
LEVEL_MIX_LOOP_BASE="${RTC_LEVEL_MIX_LOOP_BASE:-/media/volume/danluu-fuzz-data/rtc-fuzz-level-mix-persona-loop-20260516}"
NATIVE_ASSERT_BASE="${RTC_NATIVE_ASSERT_BASE:-/media/volume/danluu-fuzz-data/rtc-native-assert-protocol-20260516}"
FUZZ_ASSERT_BASE="${RTC_FUZZ_ASSERT_BASE:-/media/volume/danluu-fuzz-data/rtc-fuzz-only-asserts-20260515}"

rm -rf "$OUT" "$TAR"
mkdir -p "$REMOTE_STAGE_ROOT" "$OUT/raw" "$OUT/data" "$OUT/persona" "$OUT/summary"

coverage_root=""
if [ -f "$COVERAGE_BASE/current-output-dir.txt" ]; then
	coverage_root="$(sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt")"
fi
if [ -z "$coverage_root" ] || [ ! -d "$coverage_root" ]; then
	coverage_root="$(ls -td "$COVERAGE_BASE"/run-* 2>/dev/null | head -1 || true)"
fi

if [ -f "$COVERAGE_BASE/logs/monitor.log" ]; then
	cp "$COVERAGE_BASE/logs/monitor.log" "$OUT/raw/monitor.log"
elif [ -n "$coverage_root" ] && [ -f "$coverage_root/novelty-monitor.log" ]; then
	cp "$coverage_root/novelty-monitor.log" "$OUT/raw/monitor.log"
else
	: > "$OUT/raw/monitor.log"
fi

state_path=""
if [ -n "$coverage_root" ] && [ -f "$coverage_root/novelty-state.json" ]; then
	state_path="$coverage_root/novelty-state.json"
else
	state_path="$(find "$COVERAGE_BASE" -path '*/novelty-state.json' -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -1 | cut -d' ' -f2- || true)"
fi
if [ -n "$state_path" ] && [ -f "$state_path" ]; then
	cp "$state_path" "$OUT/raw/novelty-state.json"
else
	printf '{}\n' > "$OUT/raw/novelty-state.json"
fi

if [ -f "$PR_LOOP_BASE/logs/loop.log" ]; then
	cp "$PR_LOOP_BASE/logs/loop.log" "$OUT/raw/pr-split-loop.log"
else
	: > "$OUT/raw/pr-split-loop.log"
fi

if [ -f "$DUP_LOOP_BASE/logs/loop.log" ]; then
	cp "$DUP_LOOP_BASE/logs/loop.log" "$OUT/raw/duplicate-noise-loop.log"
else
	: > "$OUT/raw/duplicate-noise-loop.log"
fi

if [ -f "$LEVEL_MIX_LOOP_BASE/logs/loop.log" ]; then
	cp "$LEVEL_MIX_LOOP_BASE/logs/loop.log" "$OUT/raw/level-mix-loop.log"
else
	: > "$OUT/raw/level-mix-loop.log"
fi

if [ -f "$NATIVE_ASSERT_BASE/native-loop.log" ]; then
	cp "$NATIVE_ASSERT_BASE/native-loop.log" "$OUT/raw/native-harness-loop.log"
else
	: > "$OUT/raw/native-harness-loop.log"
fi

if [ -f "$NATIVE_ASSERT_BASE/protocol/loop.log" ]; then
	cp "$NATIVE_ASSERT_BASE/protocol/loop.log" "$OUT/raw/protocol-server-loop.log"
else
	: > "$OUT/raw/protocol-server-loop.log"
fi

if [ -f "$FUZZ_ASSERT_BASE/logs/fuzz-only-asserts-loop.log" ]; then
	cp "$FUZZ_ASSERT_BASE/logs/fuzz-only-asserts-loop.log" "$OUT/raw/fuzz-only-asserts-loop.log"
else
	: > "$OUT/raw/fuzz-only-asserts-loop.log"
fi

copy_latest_persona_files() {
	local base="$1"
	local label="$2"
	local kind="$3"
	local pattern="$4"
	if [ ! -d "$base/runs" ]; then
		return
	fi
	while IFS= read -r line; do
		local path
		path="${line#* }"
		local run
		run="$(basename "$(dirname "$path")")"
		cp "$path" "$OUT/persona/${label}-${run}-${kind}.md"
	done < <(
		find "$base/runs" -mindepth 2 -maxdepth 2 -name "$pattern" -printf '%T@ %p\n' 2>/dev/null |
			sort -nr |
			sed -n '1,6p'
	)
}

copy_latest_nested_files() {
	local root="$1"
	local label="$2"
	local kind="$3"
	local pattern="$4"
	if [ ! -d "$root" ]; then
		return
	fi
	while IFS= read -r line; do
		local path
		path="${line#* }"
		local run
		run="$(basename "$(dirname "$path")")"
		cp "$path" "$OUT/persona/${label}-${run}-${kind}.md"
	done < <(
		find "$root" -mindepth 2 -maxdepth 2 -name "$pattern" -printf '%T@ %p\n' 2>/dev/null |
			sort -nr |
			sed -n '1,6p'
	)
}

copy_latest_persona_files "$PR_LOOP_BASE" "pr-split" "synthesis" "synthesis.md"
copy_latest_persona_files "$PR_LOOP_BASE" "pr-split" "feedback-action" "feedback-action.md"
copy_latest_persona_files "$DUP_LOOP_BASE" "duplicate-noise" "synthesis" "synthesis.md"
copy_latest_persona_files "$DUP_LOOP_BASE" "duplicate-noise" "feedback-action" "feedback-action.md"
copy_latest_persona_files "$LEVEL_MIX_LOOP_BASE" "level-mix" "synthesis" "synthesis.md"
copy_latest_persona_files "$LEVEL_MIX_LOOP_BASE" "level-mix" "feedback-action" "feedback-action.md"
copy_latest_nested_files "$NATIVE_ASSERT_BASE/native-runs" "native-harness" "synthesis" "synthesis.md"
copy_latest_nested_files "$NATIVE_ASSERT_BASE/native-runs" "native-harness" "action" "action.md"
copy_latest_nested_files "$NATIVE_ASSERT_BASE/protocol/runs" "protocol-server" "synthesis" "synthesis.md"
copy_latest_nested_files "$NATIVE_ASSERT_BASE/protocol/runs" "protocol-server" "action" "action.md"
copy_latest_nested_files "$FUZZ_ASSERT_BASE/cycles" "fuzz-asserts" "apply" "apply.report.md"

RTC_REMOTE_COLLECT_OUT="$OUT" python3 - <<'PY'
import csv
import glob
import json
import os
import re
import sqlite3
import subprocess
from collections import defaultdict
from datetime import datetime, timezone

out = os.environ.get("RTC_REMOTE_COLLECT_OUT", "/tmp/rtc-graphs-refresh-latest")

cpu_rows = {}
load_rows = {}
for path in sorted(glob.glob("/var/log/sysstat/sa[0-9]*")):
	try:
		proc = subprocess.run(
			["sadf", "-d", path, "--", "-u", "ALL"],
			text=True,
			stdout=subprocess.PIPE,
			stderr=subprocess.DEVNULL,
			check=False,
		)
	except FileNotFoundError:
		break
	for line in proc.stdout.splitlines():
		if not line or line.startswith("#"):
			continue
		parts = line.split(";")
		if len(parts) < 14 or parts[3] != "-1":
			continue
		try:
			ts = datetime.strptime(parts[2], "%Y-%m-%d %H:%M:%S UTC").replace(tzinfo=timezone.utc)
			user = float(parts[4])
			system = float(parts[6])
			iowait = float(parts[7])
			steal = float(parts[8])
			idle = float(parts[13])
		except ValueError:
			continue
		cpu_rows[ts] = (max(0.0, min(100.0, 100.0 - idle)), user, system, iowait, steal, idle)
	try:
		proc = subprocess.run(
			["sadf", "-d", path, "--", "-q"],
			text=True,
			stdout=subprocess.PIPE,
			stderr=subprocess.DEVNULL,
			check=False,
		)
	except FileNotFoundError:
		break
	for line in proc.stdout.splitlines():
		if not line or line.startswith("#"):
			continue
		parts = line.split(";")
		if len(parts) < 9:
			continue
		try:
			ts = datetime.strptime(parts[2], "%Y-%m-%d %H:%M:%S UTC").replace(tzinfo=timezone.utc)
			run_queue = int(parts[3])
			process_list = int(parts[4])
			load_1 = float(parts[5])
			load_5 = float(parts[6])
			load_15 = float(parts[7])
			blocked = int(parts[8])
		except ValueError:
			continue
		load_rows[ts] = (run_queue, process_list, load_1, load_5, load_15, blocked, os.cpu_count() or 0)

with open(os.path.join(out, "data", "cpu_utilization.csv"), "w", newline="") as f:
	writer = csv.writer(f)
	writer.writerow(["timestamp", "cpu_utilization", "user_pct", "system_pct", "iowait_pct", "steal_pct", "idle_pct"])
	for ts in sorted(cpu_rows):
		writer.writerow([ts.strftime("%Y-%m-%dT%H:%M:%SZ"), *cpu_rows[ts]])

with open(os.path.join(out, "data", "load_average.csv"), "w", newline="") as f:
	writer = csv.writer(f)
	writer.writerow(["timestamp", "run_queue", "process_list", "load_1", "load_5", "load_15", "blocked", "core_count"])
	for ts in sorted(load_rows):
		writer.writerow([ts.strftime("%Y-%m-%dT%H:%M:%SZ"), *load_rows[ts]])

activity_by_hour = defaultdict(lambda: [0, 0])
db_path = "/home/exouser/.codex/state_5.sqlite"
if os.path.exists(db_path):
	con = sqlite3.connect(db_path)
	for value, updated_at, updated_at_ms in con.execute(
		"select tokens_used, updated_at, updated_at_ms from threads where tokens_used > 0"
	):
		ts_raw = (updated_at_ms / 1000.0) if updated_at_ms else float(updated_at)
		ts = datetime.fromtimestamp(ts_raw, tz=timezone.utc).replace(minute=0, second=0, microsecond=0)
		activity_by_hour[ts][0] += int(value)
		activity_by_hour[ts][1] += 1

with open(os.path.join(out, "data", "project_activity.csv"), "w", newline="") as f:
	writer = csv.writer(f)
	writer.writerow(["timestamp", "cumulative", "rate", "samples"])
	cumulative = 0
	for ts in sorted(activity_by_hour):
		rate, samples = activity_by_hour[ts]
		cumulative += rate
		writer.writerow([ts.strftime("%Y-%m-%dT%H:%M:%SZ"), cumulative, rate, samples])

def infer_fuzz_level(group, campaign):
	name = str(group.get("name") or "").lower()
	transport = str(group.get("transport") or "").lower()
	env = group.get("env") if isinstance(group.get("env"), dict) else {}
	profile = str(
		env.get("GUTENBERG_RTC_BROWSER_ACTION_PROFILE")
		or env.get("RTC_FUZZ_ACTION_PROFILE")
		or group.get("profile")
		or ""
	).lower()
	text = " ".join([name, transport, profile, campaign.lower()])
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

def group_profile(group):
	env = group.get("env") if isinstance(group.get("env"), dict) else {}
	return (
		env.get("GUTENBERG_RTC_BROWSER_ACTION_PROFILE")
		or env.get("RTC_FUZZ_ACTION_PROFILE")
		or group.get("profile")
		or ""
	)

campaign_roots = [
	("coverage-guided", "/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515"),
	("strict-expansion", "/media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515"),
	("focused-shards", "/media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515"),
	("gap-booster", "/media/volume/danluu-fuzz-data/rtc-gap-booster-20260515"),
	("unit-property", "/media/volume/danluu-fuzz-data/rtc-lower-level-fuzz-20260516"),
	("coverage-guided-lower-level", "/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-20260516"),
]
group_paths = []
run_roots = defaultdict(set)
for campaign, base in campaign_roots:
	if not os.path.isdir(base):
		continue
	current_root = ""
	for pointer in ("current-output-dir.txt", "current-run-root.txt"):
		pointer_path = os.path.join(base, pointer)
		if os.path.exists(pointer_path):
			try:
				current_root = open(pointer_path).read().strip()
			except OSError:
				current_root = ""
			if current_root:
				break
	if current_root:
		path = os.path.join(current_root, "supervisor-groups.json")
		if os.path.exists(path):
			group_paths.append((campaign, path))
			run_roots[campaign].add(os.path.dirname(path))
	for pattern in (
		os.path.join(base, "run-*", "supervisor-groups.json"),
		os.path.join(base, "runs", "*", "supervisor-groups.json"),
	):
		for path in glob.glob(pattern):
			group_paths.append((campaign, path))
			run_roots[campaign].add(os.path.dirname(path))

deduped_paths = []
seen_paths = set()
for campaign, path in group_paths:
	key = (campaign, os.path.realpath(path))
	if key in seen_paths:
		continue
	seen_paths.add(key)
	deduped_paths.append((campaign, path))

latest_by_campaign = {}
for campaign, path in deduped_paths:
	try:
		mtime = os.path.getmtime(path)
	except OSError:
		continue
	if campaign not in latest_by_campaign or mtime > latest_by_campaign[campaign][0]:
		latest_by_campaign[campaign] = (mtime, path)

group_metadata = {}
fallback_group_metadata = {}

def load_groups(path):
	try:
		with open(path) as group_file:
			groups = json.load(group_file)
	except Exception:
		return []
	if isinstance(groups, dict):
		groups = groups.get("groups", [])
	if not isinstance(groups, list):
		return []
	return [group for group in groups if isinstance(group, dict)]

for campaign, path in sorted(deduped_paths):
	run = os.path.basename(os.path.dirname(path))
	for group in load_groups(path):
		name = group.get("name", "")
		if not name:
			continue
		meta = {
			"fuzz_level": group.get("fuzzLevel") or group.get("fuzz_level") or infer_fuzz_level(group, campaign),
			"transport": group.get("transport", ""),
			"profile": group_profile(group),
		}
		group_metadata[(campaign, run, name)] = meta
		fallback_group_metadata[(campaign, name)] = meta

with open(os.path.join(out, "data", "fuzz_level_mix.csv"), "w", newline="") as f:
	writer = csv.writer(f)
	writer.writerow([
		"timestamp",
		"campaign",
		"run",
		"group",
		"fuzz_level",
		"transport",
		"profile",
		"lanes",
		"step_count",
		"is_latest",
		"source_path",
	])
	for campaign, path in sorted(deduped_paths):
		groups = load_groups(path)
		if not groups:
			continue
		try:
			mtime = datetime.fromtimestamp(os.path.getmtime(path), tz=timezone.utc)
		except OSError:
			continue
		latest_path = latest_by_campaign.get(campaign, (None, ""))[1]
		run = os.path.basename(os.path.dirname(path))
		for group in groups:
			try:
				lanes = int(group.get("lanes", 1) or 1)
			except (TypeError, ValueError):
				lanes = 1
			try:
				step_count = int(group.get("stepCount", 0) or 0)
			except (TypeError, ValueError):
				step_count = 0
			fuzz_level = group.get("fuzzLevel") or group.get("fuzz_level") or infer_fuzz_level(group, campaign)
			writer.writerow([
				mtime.strftime("%Y-%m-%dT%H:%M:%SZ"),
				campaign,
				run,
				group.get("name", ""),
				fuzz_level,
				group.get("transport", ""),
				group_profile(group),
				lanes,
				step_count,
				str(os.path.realpath(path) == os.path.realpath(latest_path)).lower(),
				path,
			])

execution_counts = defaultdict(lambda: [0, 0, 0, 0, 0, 0, False])

def event_test_executions(event, meta, campaign):
	for key in ("testExecutionCount", "individualTestExecutionCount"):
		try:
			value = int(event.get(key) or 0)
		except (TypeError, ValueError):
			value = 0
		if value > 0:
			return value, False

	for key in ("executionUnitCount", "executionUnits", "unitExecutionCount", "testCaseCount"):
		try:
			value = int(event.get(key) or 0)
		except (TypeError, ValueError):
			value = 0
		if value > 0:
			return value, key != "testCaseCount"

	fuzz_level = str(meta.get("fuzz_level") or "").lower()

	if fuzz_level == "unit-property" or campaign == "unit-property":
		try:
			seed_count = max(1, int(event.get("seedCount") or 1))
			case_count = max(0, int(event.get("caseCount") or 0))
			placement_case_count = max(0, int(event.get("placementCaseCount") or 0))
			fixed_case_count = max(0, int(event.get("fixedUnitCaseCount") or 4))
		except (TypeError, ValueError):
			return 1, True
		test_cases = seed_count * (case_count + placement_case_count) + fixed_case_count
		return max(1, test_cases), True

	if fuzz_level == "coverage-guided-lower-level":
		try:
			input_count = int(event.get("inputCount") or 0)
		except (TypeError, ValueError):
			input_count = 0
		if input_count > 0:
			return input_count, False

	if fuzz_level in ("backend-api", "protocol-server"):
		try:
			case_count = int(event.get("caseCount") or 0)
			seed_count = max(1, int(event.get("seedCount") or 1))
		except (TypeError, ValueError):
			case_count = 0
			seed_count = 1
		if case_count > 0:
			return case_count * seed_count, False

	return 1, False

for campaign, base in campaign_roots:
	if not os.path.isdir(base):
		continue
	for pattern in (
		os.path.join(base, "run-*", "*-gen-*", "lane-*", "events.ndjson"),
		os.path.join(base, "runs", "*", "*-gen-*", "lane-*", "events.ndjson"),
	):
		for events_path in glob.glob(pattern):
			lane_dir = os.path.basename(os.path.dirname(events_path))
			generation_dir = os.path.basename(os.path.dirname(os.path.dirname(events_path)))
			run = os.path.basename(os.path.dirname(os.path.dirname(os.path.dirname(events_path))))
			match = re.match(r"^(.*)-gen-[0-9]+-", generation_dir)
			group_name = match.group(1) if match else generation_dir
			meta = group_metadata.get((campaign, run, group_name)) or fallback_group_metadata.get((campaign, group_name)) or {
				"fuzz_level": "browser-e2e",
				"transport": "",
				"profile": "",
			}
			try:
				with open(events_path) as events_file:
					for line in events_file:
						if '"kind":"seed-attempt-complete"' not in line:
							continue
						try:
							event = json.loads(line)
						except json.JSONDecodeError:
							continue
						timestamp = event.get("at")
						if not timestamp:
							continue
						label = str(event.get("label") or "")
						try:
							parsed_timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
						except ValueError:
							continue
						bucket = parsed_timestamp.replace(
							minute=(parsed_timestamp.minute // 15) * 15,
							second=0,
							microsecond=0,
						)
						key = (
							bucket.strftime("%Y-%m-%dT%H:%M:%SZ"),
							campaign,
							group_name,
							meta["fuzz_level"],
							meta["transport"] or event.get("transport", ""),
							meta["profile"] or event.get("actionProfile", ""),
						)
						test_executions, approximate = event_test_executions(event, meta, campaign)
						try:
							duration_ms = max(0, int(event.get("durationMs") or 0))
						except (TypeError, ValueError):
							duration_ms = 0
						execution_counts[key][0] += test_executions
						execution_counts[key][1] += test_executions if label == "primary" else 0
						execution_counts[key][2] += test_executions if event.get("ok") else 0
						execution_counts[key][3] += 1
						execution_counts[key][4] += 0 if event.get("ok") else 1
						execution_counts[key][5] += duration_ms
						execution_counts[key][6] = execution_counts[key][6] or approximate
			except OSError:
				continue

with open(os.path.join(out, "data", "fuzz_level_executions.csv"), "w", newline="") as f:
	writer = csv.writer(f)
	writer.writerow([
		"timestamp",
		"campaign",
		"group",
		"fuzz_level",
		"transport",
		"profile",
		"executions",
		"primary_executions",
		"successful_executions",
		"attempts",
		"failed_attempts",
		"duration_ms",
		"approximate",
	])
	for key, counts in sorted(execution_counts.items()):
		writer.writerow([*key, *counts])

bug_finding_rows = []
triage_result_keys = set()

def safe_read_json(path):
	try:
		with open(path) as f:
			return json.load(f)
	except Exception:
		return None

def generation_group_name(path):
	name = os.path.basename(path)
	match = re.match(r"^(.*)-gen-[0-9]+-", name)
	return match.group(1) if match else name

def result_campaign(path):
	for campaign, base in campaign_roots:
		if os.path.realpath(path).startswith(os.path.realpath(base) + os.sep):
			return campaign, base
	return "unknown", ""

def result_source_tier(path):
	if "/deep-analysis-tier/" in path:
		return "deep-analysis-tier"
	if "/analysis-tier/" in path:
		return "analysis-tier"
	return "unknown"

def failure_for_result(result_path, signature_hash):
	triage_root = result_path.split("/.triage-watcher/", 1)[0] + "/.triage-watcher"
	candidates = [
		os.path.join(os.path.dirname(result_path), "failure.json"),
		os.path.join(triage_root, "signatures", signature_hash, "failure.json"),
		os.path.join(os.path.dirname(result_path), "candidate.json"),
	]
	for candidate in candidates:
		if os.path.exists(candidate):
			parsed = safe_read_json(candidate)
			if isinstance(parsed, dict):
				return parsed, candidate
	return {}, ""

def parse_result_timestamp(result_path, failure):
	for key in ("firstSeenAt", "lastSeenAt", "updatedAt", "createdAt"):
		value = failure.get(key)
		if value:
			try:
				return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
			except ValueError:
				pass
	try:
		return datetime.fromtimestamp(os.path.getmtime(result_path), tz=timezone.utc)
	except OSError:
		return datetime.now(timezone.utc)

def truthy_duplicate(value):
	if value is None:
		return ""
	text = str(value).strip()
	return "" if text.lower() in ("", "none", "null", "false") else text

for campaign, base in campaign_roots:
	if not os.path.isdir(base):
		continue
	for tier in ("analysis-tier", "deep-analysis-tier"):
		result_patterns = []
		for run_root in sorted(run_roots.get(campaign, set())):
			if not os.path.isdir(run_root):
				continue
			result_patterns.extend([
				os.path.join(run_root, ".triage-watcher", tier, "signatures", "*", "result.json"),
				os.path.join(run_root, "*-gen-*", ".triage-watcher", tier, "signatures", "*", "result.json"),
			])
		seen_results = set()
		for pattern in result_patterns:
			for result_path in glob.glob(pattern):
				real_result_path = os.path.realpath(result_path)
				if real_result_path in seen_results:
					continue
				seen_results.add(real_result_path)
				result = safe_read_json(result_path)
				if not isinstance(result, dict):
					continue
				signature_hash = os.path.basename(os.path.dirname(result_path))
				failure, failure_path = failure_for_result(result_path, signature_hash)
				facts = failure.get("facts") if isinstance(failure.get("facts"), dict) else {}
				group_dir = result_path.split("/.triage-watcher/", 1)[0]
				triage_result_keys.add((campaign, os.path.realpath(group_dir), signature_hash))
				group_name = generation_group_name(group_dir)
				run_name = os.path.basename(os.path.dirname(group_dir))
				meta = group_metadata.get((campaign, run_name, group_name)) or fallback_group_metadata.get((campaign, group_name)) or {}
				classification = str(result.get("classification") or "").strip()
				candidate_status = str(result.get("candidateStatus") or "").strip()
				recommended_action = str(result.get("recommendedTriageAction") or "").strip()
				duplicate_of = truthy_duplicate(result.get("isDuplicateOf") or result.get("duplicateOf"))
				is_duplicate = bool(duplicate_of) or "duplicate" in recommended_action.lower() or "merge_with_duplicate" in recommended_action.lower()
				distinct_bug_type = str(result.get("distinctBugType") or failure.get("equivalenceClass") or signature_hash)
				family_key = str(failure.get("familyKey") or "")
				semantic_family = str(failure.get("semanticFamilyKey") or "")
				if duplicate_of:
					canonical_bug_key = f"duplicate:{duplicate_of}"
				elif distinct_bug_type and distinct_bug_type != signature_hash:
					canonical_bug_key = f"distinct:{distinct_bug_type.lower()}"
				elif family_key:
					canonical_bug_key = f"family:{semantic_family}:{family_key}"
				else:
					canonical_bug_key = f"signature:{signature_hash}"
				timestamp = parse_result_timestamp(result_path, failure)
				bug_finding_rows.append({
					"timestamp": timestamp.strftime("%Y-%m-%dT%H:%M:%SZ"),
					"triaged_at": datetime.fromtimestamp(os.path.getmtime(result_path), tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
					"campaign": campaign,
					"run": run_name,
					"group": group_name,
					"fuzz_level": meta.get("fuzz_level") or infer_fuzz_level({"name": group_name, "transport": facts.get("transport", ""), "profile": facts.get("actionProfile", "")}, campaign),
					"transport": meta.get("transport") or facts.get("transport", ""),
					"profile": meta.get("profile") or facts.get("actionProfile", ""),
					"signature_hash": signature_hash,
					"family_key": family_key,
					"semantic_family": semantic_family,
					"canonical_bug_key": canonical_bug_key,
					"classification": classification,
					"confidence": str(result.get("confidence") or ""),
					"candidate_status": candidate_status,
					"distinct_bug_type": distinct_bug_type,
					"duplicate_of": duplicate_of,
					"is_duplicate": str(is_duplicate).lower(),
					"recommended_action": recommended_action,
					"user_hit_likelihood_score": result.get("userHitLikelihoodScore", ""),
					"severity": str(result.get("severity") or ""),
					"source_tier": result_source_tier(result_path),
					"failure_class": str(facts.get("failureClass", "")),
					"last_action": str(facts.get("lastAction", "")),
					"lifecycle_context": str(facts.get("lifecycleContext", "")),
					"source_path": result_path,
					"failure_path": failure_path,
				})

with open(os.path.join(out, "data", "bug_findings.csv"), "w", newline="") as f:
	writer = csv.DictWriter(f, fieldnames=[
		"timestamp",
		"triaged_at",
		"campaign",
		"run",
		"group",
		"fuzz_level",
		"transport",
		"profile",
		"signature_hash",
		"family_key",
		"semantic_family",
		"canonical_bug_key",
		"classification",
		"confidence",
		"candidate_status",
		"distinct_bug_type",
		"duplicate_of",
		"is_duplicate",
		"recommended_action",
		"user_hit_likelihood_score",
		"severity",
		"source_tier",
		"failure_class",
		"last_action",
		"lifecycle_context",
		"source_path",
		"failure_path",
	])
	writer.writeheader()
	writer.writerows(sorted(bug_finding_rows, key=lambda row: (row["timestamp"], row["campaign"], row["group"], row["signature_hash"], row["source_tier"])))

bug_output_rows = []

def add_bug_output(row):
	defaults = {
		"timestamp": "",
		"campaign": "",
		"run": "",
		"group": "",
		"fuzz_level": "other",
		"transport": "",
		"profile": "",
		"output_type": "",
		"signal_kind": "",
		"classification": "",
		"is_confirmed_likely_real": "false",
		"is_duplicate": "false",
		"canonical_output_key": "",
		"source_key": "",
		"failure_class": "",
		"last_action": "",
		"lifecycle_context": "",
		"source_path": "",
		"log_path": "",
		"detail": "",
	}
	defaults.update(row)
	if defaults["timestamp"]:
		bug_output_rows.append(defaults)

for row in bug_finding_rows:
	classification = str(row.get("classification") or "")
	is_duplicate = str(row.get("is_duplicate") or "false").lower() == "true"
	if row.get("duplicate_of"):
		canonical_output_key = f"duplicate:{row['duplicate_of']}"
	else:
		canonical_output_key = row.get("canonical_bug_key") or f"signature:{row.get('signature_hash', '')}"
	add_bug_output({
		"timestamp": row["timestamp"],
		"campaign": row["campaign"],
		"run": row["run"],
		"group": row["group"],
		"fuzz_level": row["fuzz_level"],
		"transport": row["transport"],
		"profile": row["profile"],
		"output_type": "triage-result",
		"signal_kind": classification or "unknown-triage",
		"classification": classification,
		"is_confirmed_likely_real": str(classification == "likely_real" and not is_duplicate).lower(),
		"is_duplicate": str(is_duplicate).lower(),
		"canonical_output_key": canonical_output_key,
		"source_key": row.get("signature_hash", ""),
		"failure_class": row.get("failure_class", ""),
		"last_action": row.get("last_action", ""),
		"lifecycle_context": row.get("lifecycle_context", ""),
		"source_path": row.get("source_path", ""),
		"log_path": "",
		"detail": row.get("distinct_bug_type", ""),
	})

def failure_timestamp(failure, fallback_path):
	for key in ("firstSeenAt", "lastSeenAt", "updatedAt", "createdAt"):
		value = failure.get(key)
		if value:
			try:
				return datetime.fromisoformat(str(value).replace("Z", "+00:00")).strftime("%Y-%m-%dT%H:%M:%SZ")
			except ValueError:
				pass
	try:
		return datetime.fromtimestamp(os.path.getmtime(fallback_path), tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
	except OSError:
		return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def group_meta_for(campaign, run_name, group_name, fallback_facts=None):
	fallback_facts = fallback_facts or {}
	return group_metadata.get((campaign, run_name, group_name)) or fallback_group_metadata.get((campaign, group_name)) or {
		"fuzz_level": infer_fuzz_level({"name": group_name, "transport": fallback_facts.get("transport", ""), "profile": fallback_facts.get("actionProfile", "")}, campaign),
		"transport": fallback_facts.get("transport", ""),
		"profile": fallback_facts.get("actionProfile", ""),
	}

for campaign, _base in campaign_roots:
	for run_root in sorted(run_roots.get(campaign, set())):
		if not os.path.isdir(run_root):
			continue
		for pattern in (
			os.path.join(run_root, ".triage-watcher", "signatures", "*", "failure.json"),
			os.path.join(run_root, "*-gen-*", ".triage-watcher", "signatures", "*", "failure.json"),
		):
			for failure_path in glob.glob(pattern):
				signature_hash = os.path.basename(os.path.dirname(failure_path))
				group_dir = failure_path.split("/.triage-watcher/", 1)[0]
				if (campaign, os.path.realpath(group_dir), signature_hash) in triage_result_keys:
					continue
				failure = safe_read_json(failure_path)
				if not isinstance(failure, dict):
					continue
				facts = failure.get("facts") if isinstance(failure.get("facts"), dict) else {}
				group_name = generation_group_name(group_dir)
				run_name = os.path.basename(os.path.dirname(group_dir)) if group_dir != run_root else os.path.basename(run_root)
				meta = group_meta_for(campaign, run_name, group_name, facts)
				family_key = str(failure.get("familyKey") or "")
				semantic_family = str(failure.get("semanticFamilyKey") or "")
				if family_key:
					canonical = f"raw-family:{semantic_family}:{family_key}"
				else:
					canonical = f"raw-signature:{signature_hash}"
				add_bug_output({
					"timestamp": failure_timestamp(failure, failure_path),
					"campaign": campaign,
					"run": run_name,
					"group": group_name,
					"fuzz_level": meta.get("fuzz_level") or "other",
					"transport": meta.get("transport") or facts.get("transport", ""),
					"profile": meta.get("profile") or facts.get("actionProfile", ""),
					"output_type": "raw-triage-signature",
					"signal_kind": "raw-failure-signature",
					"classification": "untriaged",
					"is_confirmed_likely_real": "false",
					"is_duplicate": "false",
					"canonical_output_key": canonical,
					"source_key": signature_hash,
					"failure_class": str(facts.get("failureClass", "")),
					"last_action": str(facts.get("lastAction", "")),
					"lifecycle_context": str(facts.get("lifecycleContext", "")),
					"source_path": failure_path,
					"log_path": "",
					"detail": semantic_family or family_key,
				})

def parse_status_line(line):
	parts = line.rstrip("\n").split("\t")
	if not parts:
		return None
	row = {"timestamp": parts[0]}
	for part in parts[1:]:
		if "=" in part:
			key, value = part.split("=", 1)
			row[key] = value
	return row

def parse_status_timestamp(value, fallback_path):
	try:
		return datetime.fromisoformat(str(value).replace("Z", "+00:00")).strftime("%Y-%m-%dT%H:%M:%SZ")
	except ValueError:
		pass
	try:
		return datetime.fromtimestamp(os.path.getmtime(fallback_path), tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
	except OSError:
		return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def read_log_tail(path, max_bytes=65536):
	if not path or not os.path.exists(path):
		return ""
	try:
		size = os.path.getsize(path)
		with open(path, "rb") as f:
			if size > max_bytes:
				f.seek(-max_bytes, os.SEEK_END)
			return f.read().decode("utf-8", errors="replace")
	except OSError:
		return ""

def classify_lower_failure(log_text):
	lower = log_text.lower()
	if "no space left on device" in lower or "enospc" in lower:
		return "infra-enospc"
	if "tests:       0 total" in lower or "tests: 0 total" in lower:
		return "harness-no-tests"
	if "cannot find module" in lower or "module not found" in lower:
		return "harness-import"
	if "test suites: 1 failed" in lower and ("tests:       1 failed" in lower or "tests: 1 failed" in lower):
		return "lower-level-assertion"
	if "assert" in lower or "expected" in lower:
		return "lower-level-assertion"
	return "failed-run"

def lower_failure_key(log_text, campaign, profile, fallback):
	patterns = [
		r"at (?:Object\.)?([A-Za-z0-9_$<>.]+) \((packages/[^:]+):([0-9]+):[0-9]+\)",
		r"at ([A-Za-z0-9_$<>.]+) \((packages/[^:]+):([0-9]+):[0-9]+\)",
		r"(packages/[^:\s]+):([0-9]+):[0-9]+",
	]
	for pattern in patterns:
		match = re.search(pattern, log_text)
		if match:
			if len(match.groups()) == 3:
				fn, path, line = match.groups()
			else:
				path, line = match.groups()
				fn = "unknown"
			return f"lower:{campaign}:{profile}:{path}:{line}:{fn}", f"{path}:{line}:{fn}"
	return f"lower:{campaign}:{profile}:{fallback}", fallback

for campaign in ("unit-property", "coverage-guided-lower-level"):
	for run_root in sorted(run_roots.get(campaign, set())):
		status_path = os.path.join(run_root, "status.tsv")
		if not os.path.exists(status_path):
			continue
		run_name = os.path.basename(run_root)
		meta_candidates = [(key, value) for key, value in group_metadata.items() if key[0] == campaign and key[1] == run_name]
		group_name = meta_candidates[0][0][2] if meta_candidates else ("unit-property-rich-text" if campaign == "unit-property" else "coverage-guided-lower-level-rich-text-crdt")
		meta = meta_candidates[0][1] if meta_candidates else group_meta_for(campaign, run_name, group_name, {})
		try:
			lines = open(status_path, errors="replace").read().splitlines()
		except OSError:
			continue
		for line in lines:
			row = parse_status_line(line)
			if not row:
				continue
			exit_text = row.get("exit", row.get("exitCode", "0"))
			try:
				exit_code = int(str(exit_text))
			except ValueError:
				exit_code = 0
			if exit_code == 0:
				continue
			log_path = row.get("log", row.get("logPath", ""))
			log_tail = read_log_tail(log_path)
			signal_kind = classify_lower_failure(log_tail)
			fallback_key = f"{run_name}:{row.get('attempt', row.get('seed_start', row.get('seedStart', 'unknown')))}:{exit_code}"
			canonical, detail = lower_failure_key(log_tail, campaign, meta.get("profile") or "", fallback_key)
			add_bug_output({
				"timestamp": parse_status_timestamp(row.get("timestamp", ""), status_path),
				"campaign": campaign,
				"run": run_name,
				"group": group_name,
				"fuzz_level": meta.get("fuzz_level") or infer_fuzz_level({"name": group_name}, campaign),
				"transport": meta.get("transport") or "in-process",
				"profile": meta.get("profile") or "",
				"output_type": "lower-level-status-failure",
				"signal_kind": signal_kind,
				"classification": "untriaged",
				"is_confirmed_likely_real": "false",
				"is_duplicate": "false",
				"canonical_output_key": canonical,
				"source_key": fallback_key,
				"failure_class": signal_kind,
				"last_action": "",
				"lifecycle_context": "",
				"source_path": status_path,
				"log_path": log_path,
				"detail": detail,
			})

def parse_bug_output_time(row):
	try:
		return datetime.fromisoformat(str(row.get("timestamp", "")).replace("Z", "+00:00"))
	except ValueError:
		return datetime.max.replace(tzinfo=timezone.utc)

def bug_output_rank(row):
	signal = str(row.get("signal_kind") or "")
	classification = str(row.get("classification") or "")
	if str(row.get("is_confirmed_likely_real") or "").lower() == "true":
		return 0
	if classification == "likely_real":
		return 1
	if classification == "uncertain":
		return 2
	if signal in ("raw-failure-signature", "lower-level-assertion"):
		return 3
	if signal.startswith("harness-") or signal.startswith("infra-"):
		return 8
	return 5

def dedupe_bug_outputs(rows):
	by_key = {}
	for row in sorted(rows, key=lambda candidate: (parse_bug_output_time(candidate), bug_output_rank(candidate), candidate.get("output_type", ""))):
		key = row.get("canonical_output_key") or f"{row.get('campaign', '')}:{row.get('source_key', '')}:{row.get('source_path', '')}"
		if key not in by_key:
			by_key[key] = row
	return list(by_key.values())

bug_output_rows = dedupe_bug_outputs(bug_output_rows)

with open(os.path.join(out, "data", "bug_outputs.csv"), "w", newline="") as f:
	fieldnames = [
		"timestamp",
		"campaign",
		"run",
		"group",
		"fuzz_level",
		"transport",
		"profile",
		"output_type",
		"signal_kind",
		"classification",
		"is_confirmed_likely_real",
		"is_duplicate",
		"canonical_output_key",
		"source_key",
		"failure_class",
		"last_action",
		"lifecycle_context",
		"source_path",
		"log_path",
		"detail",
	]
	writer = csv.DictWriter(f, fieldnames=fieldnames)
	writer.writeheader()
	writer.writerows(sorted(bug_output_rows, key=lambda row: (row["timestamp"], row["fuzz_level"], row["profile"], row["canonical_output_key"], row["output_type"])))

with open(os.path.join(out, "summary", "remote-source-paths.env"), "w") as f:
	f.write(f"coverage_root={os.environ.get('coverage_root', '')}\n")
PY

{
	printf 'coverage_root=%s\n' "$coverage_root"
	printf 'state_path=%s\n' "$state_path"
	printf 'collected_at_utc=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "$OUT/summary/source-paths.env"

tar -C "$OUT" -czf "$TAR" .
REMOTE

"$OPS_DIR/jetstream-scp.sh" to "$remote_script" /tmp/rtc-graphs-refresh-collect.sh
"$OPS_DIR/jetstream-ssh.sh" "chmod +x /tmp/rtc-graphs-refresh-collect.sh && /tmp/rtc-graphs-refresh-collect.sh"
"$OPS_DIR/jetstream-scp.sh" from "$REMOTE_STAGE_ROOT/rtc-graphs-refresh-latest.tar.gz" "$INPUT_DIR/remote.tar.gz"

rm -rf "$INPUT_DIR/remote"
mkdir -p "$INPUT_DIR/remote"
tar -xzf "$INPUT_DIR/remote.tar.gz" -C "$INPUT_DIR/remote"

mkdir -p "$ARTIFACT_DIR/raw" "$ARTIFACT_DIR/data"
cp "$INPUT_DIR/remote/raw/monitor.log" "$ARTIFACT_DIR/raw/monitor.log"
cp "$INPUT_DIR/remote/raw/novelty-state.json" "$ARTIFACT_DIR/raw/novelty-state.json"
cp "$INPUT_DIR/remote/raw/pr-split-loop.log" "$ARTIFACT_DIR/raw/pr-split-loop.log"
cp "$INPUT_DIR/remote/data/cpu_utilization.csv" "$ARTIFACT_DIR/data/cpu_utilization.csv"
cp "$INPUT_DIR/remote/data/load_average.csv" "$ARTIFACT_DIR/data/load_average.csv"
cp "$INPUT_DIR/remote/data/project_activity.csv" "$ARTIFACT_DIR/data/project_activity.csv"
cp "$INPUT_DIR/remote/data/fuzz_level_mix.csv" "$ARTIFACT_DIR/data/fuzz_level_mix.csv"
cp "$INPUT_DIR/remote/data/fuzz_level_executions.csv" "$ARTIFACT_DIR/data/fuzz_level_executions.csv"
cp "$INPUT_DIR/remote/data/bug_findings.csv" "$ARTIFACT_DIR/data/bug_findings.csv"
cp "$INPUT_DIR/remote/data/bug_outputs.csv" "$ARTIFACT_DIR/data/bug_outputs.csv"

mkdir -p "$INPUT_DIR/persona-inputs"
if compgen -G "$INPUT_DIR/remote/persona/*.md" > /dev/null; then
	cp "$INPUT_DIR/remote/persona/"*.md "$INPUT_DIR/persona-inputs/"
fi

printf '%s\n' "$INPUT_DIR/persona-inputs"
