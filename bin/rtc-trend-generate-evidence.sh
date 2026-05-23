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
disk_path = artifact / "data" / "disk_free_space.csv"
fuzz_level_path = artifact / "data" / "fuzz_level_mix.csv"
combined_ingredient_progress_path = artifact / "data" / "combined_ingredient_fuzzing_progress.csv"
many_user_active_editing_progress_path = artifact / "data" / "many_user_active_editing_progress.csv"

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

disk_tail = []
if disk_path.exists():
	with disk_path.open(newline="") as f:
		rows = list(csv.DictReader(f))
	for row in rows[-6:]:
		disk_tail.append(
			f"{row.get('timestamp')}: root_free_gib={row.get('root_free_gib')} data_free_gib={row.get('data_free_gib')}"
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

combined_ingredient_progress = None
if combined_ingredient_progress_path.exists():
	with combined_ingredient_progress_path.open(newline="") as f:
		rows = list(csv.DictReader(f))
	if rows:
		combined_ingredient_progress = rows[-1]

many_user_active_editing_progress = []
if many_user_active_editing_progress_path.exists():
	with many_user_active_editing_progress_path.open(newline="") as f:
		many_user_active_editing_progress = list(csv.DictReader(f))

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
	"current_run_signatures_last",
	"current_run_actionable_signatures_last",
	"current_run_top_duplicate_share_last",
	"quality_issues_last",
	"memory_free_gb_last",
	"root_disk_free_gib_last",
	"root_disk_used_percent_last",
	"data_disk_free_gib_last",
	"data_disk_used_percent_last",
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
	"combined_ingredient_feature",
	"combined_ingredient_completed",
	"combined_ingredient_target",
	"combined_ingredient_remaining",
	"combined_ingredient_group_enabled",
	"combined_ingredient_profile_successful_records",
	"many_user_active_editing_profile_successful_records",
	"many_user_active_editing_success_action_users_6",
	"many_user_active_editing_success_action_users_12",
	"many_user_active_editing_success_action_users_30",
	"many_user_active_editing_rich_list_users_12",
	"many_user_active_editing_notes_lifecycle_users_6",
	"many_user_active_editing_notes_lifecycle_users_12",
	"many_user_active_editing_http_lifecycle_users_6",
	"many_user_active_editing_http_max_clients_override",
	"many_user_active_editing_same_user_lifecycle_users_6",
	"many_user_active_editing_mixed_identity_users_6",
	"many_user_active_editing_revision_restore_users_6",
	"many_user_active_editing_publish_lifecycle_users_6",
	"many_user_active_editing_same_block_contention_users_6",
	"many_user_active_editing_note_thread_lifecycle_users_6",
	"many_user_active_editing_persistence_race_users_6",
	"many_user_active_editing_ws_reconnect_background_users_6",
	"many_user_active_editing_http_413_compaction_users_6",
	"many_user_active_editing_post_field_boundary_users_6",
	"many_user_active_editing_strict_ledger_users_30",
	"many_user_active_editing_large_doc_users_30",
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

lines += ["", "## Recent Disk Samples"]
if disk_tail:
	lines.extend(f"- {item}" for item in disk_tail)
else:
	lines.append("- no disk CSV available")

lines += ["", "## Latest Fuzzing Level Mix"]
if fuzz_level_latest:
	for level, (lanes, groups) in sorted(fuzz_level_latest.items()):
		lines.append(f"- {level}: lanes={lanes:g}, groups={groups}")
else:
	lines.append("- no latest fuzz-level mix CSV rows available")
if fuzz_level_campaigns:
	lines.append(f"- campaigns: {', '.join(sorted(x for x in fuzz_level_campaigns if x))}")

lines += ["", "## Combined-Ingredient Fuzzing Progress"]
if combined_ingredient_progress:
	lines.append(
		"- strict cross-product: "
		f"{combined_ingredient_progress.get('completed_cross_product_records')}/"
		f"{combined_ingredient_progress.get('target_records')}; "
		f"remaining={combined_ingredient_progress.get('remaining_records')}; "
		f"group_enabled={combined_ingredient_progress.get('group_enabled')}; "
		f"profile_successes={combined_ingredient_progress.get('profile_successful_records')}/"
		f"{combined_ingredient_progress.get('profile_records_seen')}"
	)
	lines.append(
		f"- feature: {combined_ingredient_progress.get('feature')} "
		"(separate ingredient-lane hits do not count)"
	)
else:
	lines.append("- no combined-ingredient progress CSV available")

lines += ["", "## Many-User Active-Editing Progress"]
if many_user_active_editing_progress:
	for row in many_user_active_editing_progress:
		notes_lifecycle = row.get('notes_lifecycle_records')
		if notes_lifecycle in ("", "NA", None):
			notes_lifecycle = "not_required"
		http_lifecycle = row.get('http_lifecycle_records')
		if http_lifecycle in ("", "NA", None):
			http_lifecycle = "not_required"
		same_user_lifecycle = row.get('same_user_lifecycle_records')
		if same_user_lifecycle in ("", "NA", None):
			same_user_lifecycle = "not_required"
		mixed_identity_lifecycle = row.get('mixed_identity_lifecycle_records')
		if mixed_identity_lifecycle in ("", "NA", None):
			mixed_identity_lifecycle = "not_required"
		revision_restore = row.get('revision_restore_records')
		if revision_restore in ("", "NA", None):
			revision_restore = "not_required"
		publish_lifecycle = row.get('publish_lifecycle_records')
		if publish_lifecycle in ("", "NA", None):
			publish_lifecycle = "not_required"
		same_block_contention = row.get('same_block_contention_records')
		if same_block_contention in ("", "NA", None):
			same_block_contention = "not_required"
		note_thread_lifecycle = row.get('note_thread_lifecycle_records')
		if note_thread_lifecycle in ("", "NA", None):
			note_thread_lifecycle = "not_required"
		persistence_race = row.get('persistence_race_records')
		if persistence_race in ("", "NA", None):
			persistence_race = "not_required"
		ws_reconnect_background = row.get('ws_reconnect_background_records')
		if ws_reconnect_background in ("", "NA", None):
			ws_reconnect_background = "not_required"
		http_413_compaction = row.get('http_413_compaction_records')
		if http_413_compaction in ("", "NA", None):
			http_413_compaction = "not_required"
		post_field_boundary = row.get('post_field_boundary_records')
		if post_field_boundary in ("", "NA", None):
			post_field_boundary = "not_required"
		visible_remote_delete = row.get('visible_remote_delete_records')
		if visible_remote_delete in ("", "NA", None):
			visible_remote_delete = "not_required"
		code_editor_embed_stability = row.get('code_editor_embed_stability_records')
		if code_editor_embed_stability in ("", "NA", None):
			code_editor_embed_stability = "not_required"
		nested_table_awareness = row.get('nested_table_awareness_records')
		if nested_table_awareness in ("", "NA", None):
			nested_table_awareness = "not_required"
		strict_ledger = row.get('strict_ledger_records')
		if strict_ledger in ("", "NA", None):
			strict_ledger = "not_required"
		lines.append(
			"- active editors "
			f"{row.get('threshold')}: "
			f"success_action={row.get('successful_active_editor_records')}/"
			f"{row.get('successful_active_editor_target')}; "
			f"lifecycle={row.get('lifecycle_records')}; "
			f"rich_list_lifecycle={row.get('rich_list_lifecycle_records')}; "
			f"notes_lifecycle={notes_lifecycle}; "
			f"http_lifecycle={http_lifecycle}; "
			f"same_user_lifecycle={same_user_lifecycle}; "
			f"mixed_identity_lifecycle={mixed_identity_lifecycle}; "
			f"revision_restore={revision_restore}; "
			f"publish_lifecycle={publish_lifecycle}; "
			f"same_block_contention={same_block_contention}; "
			f"note_thread_lifecycle={note_thread_lifecycle}; "
			f"persistence_race={persistence_race}; "
			f"ws_reconnect_background={ws_reconnect_background}; "
			f"http_413_compaction={http_413_compaction}; "
			f"post_field_boundary={post_field_boundary}; "
			f"visible_remote_delete={visible_remote_delete}; "
			f"code_editor_embed_stability={code_editor_embed_stability}; "
			f"nested_table_awareness={nested_table_awareness}; "
			f"strict_ledger={strict_ledger}; "
			f"ui_signals={row.get('ui_signal_records')}; "
			f"large_doc={row.get('large_doc_records')}; "
			f"group_enabled={row.get('group_enabled')}"
		)
	lines.append(
		"- these counts require distinct editing users; users present without actions do not satisfy the active-editor goals"
	)
else:
	lines.append("- no many-user active-editing progress CSV available")

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
