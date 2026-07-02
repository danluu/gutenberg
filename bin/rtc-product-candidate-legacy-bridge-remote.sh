#!/usr/bin/env bash
set -euo pipefail

# Compatibility bridge from the legacy JS2 fuzz/finalization loops into the
# product-candidate scheduler ledger.
#
# This is deliberately conservative: imported legacy coverage is recorded as
# evidence, but green legacy rows remain stale until the scheduler has explicit
# same-profile trunk controls and exact-stack/publication evidence. The bridge
# prevents hidden work by adopting active legacy tmux sessions as leases and by
# materializing exact-stack/coverage gaps as named blockers.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="${RTC_REPO:-$(cd "$SCRIPT_DIR/.." && pwd)}"
SCHEDULER="${RTC_SCHEDULER_BIN:-$REPO/bin/rtc-product-candidate-scheduler.mjs}"
BASE="${RTC_SCHEDULER_BASE:-/media/volume/danluu-fuzz-data/rtc-product-candidate-scheduler-20260702}"
DB="${RTC_SCHEDULER_DB:-$BASE/ledger.sqlite}"
COVERAGE_BASE="${RTC_COVERAGE_BASE:-/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515}"
TMUX_SOCKET="${RTC_TMUX_SOCKET:-rtc-fuzz}"
SESSION_NAME="${RTC_LEGACY_BRIDGE_SESSION:-rtc-product-candidate-legacy-bridge-loop}"
ARTIFACT_DIR="${RTC_SCHEDULER_ARTIFACT_DIR:-$BASE/artifacts}"

usage() {
	cat <<EOF
Usage: $(basename "$0") <command>

Commands:
  once              Import current legacy state once.
  start             Start the tmux bridge loop.
  stop              Stop the tmux bridge loop.
  status            Show bridge loop status.
  record-preflight  Record scheduler preflight from JS2 resource/current-SHA checks.
  import-coverage   Import current benchmark-canary coverage status.
  adopt-tmux        Adopt active legacy rtc-* tmux sessions as scheduler leases.

Environment:
  RTC_REPO=$REPO
  RTC_SCHEDULER_BASE=$BASE
  RTC_SCHEDULER_DB=$DB
  RTC_COVERAGE_BASE=$COVERAGE_BASE
EOF
}

scheduler() {
	node "$SCHEDULER" --db "$DB" "$@"
}

current_candidate() {
	cat "$BASE/current-candidate"
}

candidate_sha() {
	python3 - "$DB" "$(current_candidate)" <<'PY'
import sqlite3
import sys

db, candidate = sys.argv[1], sys.argv[2]
conn = sqlite3.connect(db)
row = conn.execute("SELECT sha FROM candidate WHERE id = ?", (candidate,)).fetchone()
if not row:
    raise SystemExit(f"unknown candidate {candidate}")
print(row[0])
PY
}

record_preflight() {
	local candidate head expected run_dir status_file report result stale_reason
	candidate="$(current_candidate)"
	expected="$(candidate_sha)"
	head="$(git -C "$REPO" rev-parse HEAD)"
	run_dir="$(cat "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)"
	status_file="$run_dir/benchmark-canary-coverage-status.tsv"
	mkdir -p "$ARTIFACT_DIR/$candidate"
	report="$ARTIFACT_DIR/$candidate/preflight-legacy-bridge.md"
	result=pass
	{
		printf '# Legacy Bridge Preflight\n\n'
		printf -- '- updated: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
		printf -- '- repo: %s\n' "$REPO"
		printf -- '- candidate: %s\n' "$candidate"
		printf -- '- expected sha: %s\n' "$expected"
		printf -- '- repo head: %s\n' "$head"
		printf -- '- coverage run: %s\n' "$run_dir"
		printf -- '- coverage status: %s\n' "$status_file"
		printf '\n## Disk\n\n'
		df -h / /media/volume/danluu-fuzz-data 2>/dev/null || true
		printf '\n## Inodes\n\n'
		df -ih / /media/volume/danluu-fuzz-data 2>/dev/null || true
		printf '\n## Docker Networks\n\n'
		docker network ls 2>/dev/null | wc -l || true
	} > "$report"
	if [ "$head" != "$expected" ]; then
		result=fail
	fi
	if [ ! -s "$status_file" ]; then
		result=fail
	fi
	stale_reason="legacy bridge preflight; same-profile trunk control is not yet recorded in scheduler"
	scheduler record-gate \
		--candidate "$candidate" \
		--gate preflight \
		--profile js2-legacy-bridge \
		--result "$result" \
		--baseline-result not-run \
		--command "$(basename "$0") record-preflight" \
		--artifacts "$report" \
		--fingerprint "preflight-$candidate-js2-legacy-bridge" \
		--stale-reason "$stale_reason"
}

import_coverage() {
	local candidate run_dir status_file
	candidate="$(current_candidate)"
	run_dir="$(cat "$COVERAGE_BASE/current-output-dir.txt")"
	status_file="$run_dir/benchmark-canary-coverage-status.tsv"
	if [ ! -s "$status_file" ]; then
		echo "missing benchmark status: $status_file" >&2
		return 1
	fi
	python3 - "$SCHEDULER" "$DB" "$candidate" "$status_file" <<'PY'
import csv
import hashlib
import subprocess
import sys

scheduler, db, candidate, status_file = sys.argv[1:5]

def run(*args):
    subprocess.run(["node", scheduler, "--db", db, *args], check=True)

def blocker_id(prefix, text):
    return prefix + "-" + hashlib.sha256(text.encode()).hexdigest()[:12]

def severity_for(row):
    group = row.get("group", "")
    transport = row.get("transport", "")
    if transport == "ws" or "rtc" in group or "multi" in group or "same-user" in group:
        return "P1_RTC_CONFORMANCE"
    return "P1_PRODUCT_CORRECTNESS"

def gate_for(row):
    group = row.get("group", "")
    transport = row.get("transport", "")
    if transport == "ws" or "rtc" in group:
        return "rtc_conformance"
    return "product_acceptance"

with open(status_file, newline="") as handle:
    rows = list(csv.DictReader(handle, delimiter="\t"))

for row in rows:
    group = row.get("group", "unknown")
    gate = gate_for(row)
    profile = group
    green = row.get("current_run_green") == "yes"
    ready = row.get("coverage_ready") == "yes"
    result = "pass" if green and ready else "fail"
    reason = row.get("reason", "")
    exact_blocked = row.get("exact_stack_blocked") == "yes"
    stale = ""
    if result == "pass":
        stale = "legacy coverage import; same-profile trunk control and exact-stack scheduler evidence are not recorded"
    elif reason:
        stale = reason[:500]
    run(
        "record-gate",
        "--candidate", candidate,
        "--gate", gate,
        "--profile", profile,
        "--result", result,
        "--baseline-result", "not-run",
        "--command", f"import {status_file} group={group}",
        "--artifacts", status_file,
        "--fingerprint", f"{candidate}:{group}:{row.get('current_run_green')}:{row.get('coverage_ready')}:{row.get('product_evidence_records')}",
        "--stale-reason", stale,
    )
    if exact_blocked:
        bid = blocker_id("BC", f"{candidate}:{group}:exact-stack")
        run(
            "open-blocker",
            "--id", bid,
            "--candidate", candidate,
            "--severity", severity_for(row),
            "--scope", group,
            "--symptom", f"Exact-stack benchmark canary blocks promotion for {group}",
            "--repro-state", "repro_available" if green else "repro_missing",
            "--artifacts", status_file,
            "--next-command", f"run exact-stack replay/downscope for {group}; closure_run_dir={row.get('closure_run_dir','')}",
            "--fingerprint", bid,
        )
    if result != "pass":
        bid = blocker_id("BG", f"{candidate}:{group}:coverage-not-green")
        run(
            "open-blocker",
            "--id", bid,
            "--candidate", candidate,
            "--severity", severity_for(row),
            "--scope", group,
            "--symptom", f"Benchmark coverage is not green for {group}",
            "--repro-state", "repro_missing",
            "--artifacts", status_file,
            "--next-command", f"materialize product evidence for {group}; reason={reason[:240]}",
            "--fingerprint", bid,
        )
PY
}

adopt_tmux() {
	local candidate session lease_id artifact
	candidate="$(current_candidate)"
	mkdir -p "$ARTIFACT_DIR/$candidate/legacy-leases"
	tmux -L "$TMUX_SOCKET" list-sessions -F '#{session_name}' 2>/dev/null |
		while IFS= read -r session; do
			case "$session" in
				rtc-*) ;;
				*) continue ;;
			esac
			lease_id="legacy-$(printf '%s' "$session" | shasum -a 256 | awk '{print substr($1,1,16)}')"
			artifact="$ARTIFACT_DIR/$candidate/legacy-leases/$session.txt"
			tmux -L "$TMUX_SOCKET" capture-pane -pt "$session:0.0" -S -80 > "$artifact" 2>/dev/null || true
			scheduler lease-start \
				--id "$lease_id" \
				--worker "$session" \
				--kind legacy-tmux \
				--candidate "$candidate" \
				--ttl-seconds 180 \
				--artifact-dir "$artifact" \
				--cleanup-state adopted >/dev/null
		done
}

once() {
	record_preflight
	import_coverage
	adopt_tmux
	scheduler status
}

start_loop() {
	if tmux -L "$TMUX_SOCKET" has-session -t "$SESSION_NAME" 2>/dev/null; then
		echo "$SESSION_NAME already running"
		return
	fi
	tmux -L "$TMUX_SOCKET" new-session -d -s "$SESSION_NAME" "while true; do RTC_REPO='$REPO' RTC_SCHEDULER_BASE='$BASE' RTC_SCHEDULER_DB='$DB' RTC_SCHEDULER_BIN='$SCHEDULER' RTC_COVERAGE_BASE='$COVERAGE_BASE' '$0' once >> '$BASE/legacy-bridge.log' 2>&1; sleep 60; done"
	echo "started $SESSION_NAME"
}

stop_loop() {
	tmux -L "$TMUX_SOCKET" kill-session -t "$SESSION_NAME" 2>/dev/null || true
	echo "stopped $SESSION_NAME"
}

status_loop() {
	tmux -L "$TMUX_SOCKET" list-sessions 2>/dev/null | grep -F "$SESSION_NAME" || true
	tail -80 "$BASE/legacy-bridge.log" 2>/dev/null || true
}

case "${1:-}" in
	once)
		once
		;;
	start)
		start_loop
		;;
	stop)
		stop_loop
		;;
	status)
		status_loop
		;;
	record-preflight)
		record_preflight
		;;
	import-coverage)
		import_coverage
		;;
	adopt-tmux)
		adopt_tmux
		;;
	""|-h|--help|help)
		usage
		;;
	*)
		usage
		exit 1
		;;
esac
