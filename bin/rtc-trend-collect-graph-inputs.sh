#!/usr/bin/env bash
set -euo pipefail

OPS_DIR="${RTC_TREND_OPS_DIR:-/private/tmp/rtc-jetstream2-trend-autoupdate}"
CHECKOUT="${RTC_TREND_CHECKOUT:-/private/tmp/gutenberg-fuzz-progress-explain}"
ARTIFACT_DIR="$CHECKOUT/docs/explanations/architecture/rtc-jetstream2-fuzz-trends-20260515"
RUN_DIR="${1:-$OPS_DIR/runs/manual-$(date -u +%Y%m%dT%H%M%SZ)}"
INPUT_DIR="$RUN_DIR/inputs"

mkdir -p "$INPUT_DIR"

remote_script="$INPUT_DIR/remote-collect.sh"
cat > "$remote_script" <<'REMOTE'
#!/usr/bin/env bash
set -euo pipefail

OUT="/tmp/rtc-graphs-refresh-latest"
TAR="/tmp/rtc-graphs-refresh-latest.tar.gz"
COVERAGE_BASE="${RTC_COVERAGE_BASE:-/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515}"
PR_LOOP_BASE="${RTC_PR_LOOP_BASE:-/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515}"
DUP_LOOP_BASE="${RTC_DUP_LOOP_BASE:-/media/volume/danluu-fuzz-data/rtc-duplicate-noise-persona-loop-20260516}"

rm -rf "$OUT" "$TAR"
mkdir -p "$OUT/raw" "$OUT/data" "$OUT/persona" "$OUT/summary"

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

copy_latest_persona_files "$PR_LOOP_BASE" "pr-split" "synthesis" "synthesis.md"
copy_latest_persona_files "$PR_LOOP_BASE" "pr-split" "feedback-action" "feedback-action.md"
copy_latest_persona_files "$DUP_LOOP_BASE" "duplicate-noise" "synthesis" "synthesis.md"
copy_latest_persona_files "$DUP_LOOP_BASE" "duplicate-noise" "feedback-action" "feedback-action.md"

python3 - <<'PY'
import csv
import glob
import json
import os
import re
import sqlite3
import subprocess
from collections import defaultdict
from datetime import datetime, timezone

out = "/tmp/rtc-graphs-refresh-latest"

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
	for pattern in (
		os.path.join(base, "run-*", "supervisor-groups.json"),
		os.path.join(base, "runs", "*", "supervisor-groups.json"),
	):
		for path in glob.glob(pattern):
			group_paths.append((campaign, path))

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

execution_counts = defaultdict(lambda: [0, 0, 0])
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
						execution_counts[key][0] += 1
						execution_counts[key][1] += 1 if label == "primary" else 0
						execution_counts[key][2] += 1 if event.get("ok") else 0
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
	])
	for key, counts in sorted(execution_counts.items()):
		writer.writerow([*key, *counts])

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
"$OPS_DIR/jetstream-scp.sh" from /tmp/rtc-graphs-refresh-latest.tar.gz "$INPUT_DIR/remote.tar.gz"

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

mkdir -p "$INPUT_DIR/persona-inputs"
if compgen -G "$INPUT_DIR/remote/persona/*.md" > /dev/null; then
	cp "$INPUT_DIR/remote/persona/"*.md "$INPUT_DIR/persona-inputs/"
fi

printf '%s\n' "$INPUT_DIR/persona-inputs"
