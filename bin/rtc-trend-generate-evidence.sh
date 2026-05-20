#!/usr/bin/env bash
set -euo pipefail

OPS_DIR="${RTC_TREND_OPS_DIR:-/private/tmp/rtc-jetstream2-trend-autoupdate}"
CHECKOUT="${RTC_TREND_CHECKOUT:-/private/tmp/gutenberg-fuzz-progress-explain}"
ARTIFACT_DIR="$CHECKOUT/docs/explanations/architecture/rtc-jetstream2-fuzz-trends-20260515"
OUT="${1:-$OPS_DIR/latest-trend-evidence.md}"

python3 - "$ARTIFACT_DIR" "$OUT" <<'PY'
import csv
import pathlib
import sys

artifact = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
summary_path = artifact / "data" / "summary.txt"
goals_path = artifact / "data" / "coverage_goals.csv"
profile_path = artifact / "data" / "profile_counts.csv"
cpu_path = artifact / "data" / "cpu_utilization.csv"
load_path = artifact / "data" / "load_average.csv"
fuzz_level_path = artifact / "data" / "fuzz_level_mix.csv"

summary = {}
if summary_path.exists():
	for line in summary_path.read_text().splitlines():
		if ": " in line:
			key, value = line.split(": ", 1)
			summary[key] = value

unmet = []
if goals_path.exists():
	with goals_path.open(newline="") as f:
		for row in csv.DictReader(f):
			if row.get("met") == "FALSE":
				try:
					remaining = max(0, float(row.get("target", 0)) - float(row.get("count", 0)))
				except ValueError:
					remaining = 0
				unmet.append((remaining, row.get("id", ""), row.get("label", ""), row.get("count", ""), row.get("target", "")))
unmet.sort(reverse=True)

weak_profiles = []
if profile_path.exists():
	with profile_path.open(newline="") as f:
		for row in csv.DictReader(f):
			try:
				seen = float(row.get("records_seen", 0))
				success = float(row.get("successful_records", 0))
				rate = success / seen if seen else 0
			except ValueError:
				continue
			if seen and rate < 0.25:
				weak_profiles.append((rate, row.get("profile", ""), int(seen), int(success)))
weak_profiles.sort()

cpu_tail = []
if cpu_path.exists():
	with cpu_path.open(newline="") as f:
		rows = list(csv.DictReader(f))
	for row in rows[-6:]:
		cpu_tail.append(f"{row.get('timestamp')}: cpu={row.get('cpu_utilization')} iowait={row.get('iowait_pct')}")

load_tail = []
if load_path.exists():
	with load_path.open(newline="") as f:
		rows = list(csv.DictReader(f))
	for row in rows[-6:]:
		load_tail.append(
			f"{row.get('timestamp')}: load1={row.get('load_1')} load5={row.get('load_5')} load15={row.get('load_15')} cores={row.get('core_count')}"
		)

fuzz_level_latest = {}
fuzz_level_campaigns = set()
if fuzz_level_path.exists():
	with fuzz_level_path.open(newline="") as f:
		for row in csv.DictReader(f):
			fuzz_level_campaigns.add(row.get("campaign", ""))
			if str(row.get("is_latest", "")).lower() != "true":
				continue
			level = row.get("fuzz_level") or "unknown"
			try:
				lanes = float(row.get("lanes", 0) or 0)
			except ValueError:
				lanes = 0
			counts = fuzz_level_latest.setdefault(level, [0.0, 0])
			counts[0] += lanes
			counts[1] += 1

lines = [
	"# RTC Trend Evidence Packet",
	"",
	"Purpose: graph-derived evidence for the standard Jetstream2 persona loop. This is input evidence, not an instruction. The reviewers should explicitly say whether the trend interpretation is supported, contradicted, or incomplete.",
	"",
	"Graph report: https://github.com/danluu/gutenberg/blob/explain/rtc-jetstream2-fuzz-progress-20260515/docs/explanations/architecture/rtc-jetstream2-fuzz-trend-analysis-20260515.md",
	"",
	"## Latest Snapshot",
]
for key in [
	"generated_at_utc",
	"monitor_passes",
	"first_pass_utc",
	"last_pass_utc",
	"coverage_files_first",
	"coverage_files_last",
	"coverage_files_delta",
	"unmet_coverage_first",
	"unmet_coverage_last",
	"likely_real_max",
	"duplicate_share_current_last",
	"duplicate_share_historical_last",
	"summary_startup_failures_last",
	"current_run_accounting_snapshots",
	"current_run_metrics_trusted_last",
	"current_run_full_pass_pending_last",
	"current_run_minutes_since_completed_full_pass_last",
	"quality_issues_last",
	"memory_free_gb_last",
	"load_1_last",
	"load_5_last",
	"load_15_last",
	"core_count",
	"enabled_groups_current",
	"goals_unmet",
	"pr_review_events",
	"pr_suggested_net_loc_snapshots",
	"pr_suggested_net_loc_latest_total",
	"fuzz_level_mix_snapshots",
	"fuzz_level_mix_campaigns",
	"fuzz_level_mix_latest",
	"fuzz_level_test_executions",
	"fuzz_level_test_executions_has_approximate_rows",
	"fuzz_level_execution_events",
	"fuzz_level_execution_latest",
]:
	if key in summary:
		lines.append(f"- {key}: {summary[key]}")

lines += ["", "## Largest Current Unmet Goals"]
if unmet:
	for remaining, goal_id, label, count, target in unmet[:12]:
		lines.append(f"- {goal_id}: {count}/{target}, remaining={int(remaining)}; {label}")
else:
	lines.append("- none in the latest state")

lines += ["", "## Weak Completion Profiles"]
if weak_profiles:
	for rate, profile, seen, success in weak_profiles[:12]:
		lines.append(f"- {profile}: {success}/{seen} successful ({rate:.3f})")
else:
	lines.append("- no profile below the evidence threshold")

lines += ["", "## Recent CPU Samples"]
if cpu_tail:
	lines.extend(f"- {item}" for item in cpu_tail)
else:
	lines.append("- no CPU CSV available")

lines += ["", "## Recent Load Samples"]
if load_tail:
	lines.extend(f"- {item}" for item in load_tail)
else:
	lines.append("- no load-average CSV available")

lines += ["", "## Latest Fuzzing Level Mix"]
if fuzz_level_latest:
	for level, (lanes, groups) in sorted(fuzz_level_latest.items()):
		lines.append(f"- {level}: lanes={lanes:g}, groups={groups}")
else:
	lines.append("- no latest fuzz-level mix CSV rows available")
if fuzz_level_campaigns:
	lines.append(f"- campaigns: {', '.join(sorted(x for x in fuzz_level_campaigns if x))}")

lines += [
	"",
	"## Interpretation To Challenge",
	"- Treat current-run duplicate/noise and current summary startup failures separately from historical aggregate duplicate/noise.",
	"- If current_run_metrics_trusted_last is false, treat the live duplicate/noise value as incomplete current-run accounting and focus on why the active novelty run has not completed a full pass.",
	"- Prioritize completion-depth fixes for profiles with many records but low success rate before adding another broad class of actions.",
	"- Challenge whether the current fuzzing level mix is too browser/e2e-heavy. If it is, propose a bounded lower-level target with a clear oracle instead of merely adding more browser lanes; explicitly consider libFuzzer/AFL-style coverage-guided lower-level fuzzing where code can be isolated enough to make it useful.",
	"- If CPU is already high, prefer guarded top-offs and startup-stall reduction over simply increasing browser concurrency.",
	"- Reject or qualify any of the above if the latest persona reports or current logs contradict it.",
]

out.write_text("\n".join(lines) + "\n")
PY

printf '%s\n' "$OUT"
