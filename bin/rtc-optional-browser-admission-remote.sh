#!/usr/bin/env bash

rtc_optional_browser_live_lanes() {
	local marker root roots=()
	for marker in \
		/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/current-output-dir.txt \
		/media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515/current-run-root.txt \
		/media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515/current-run-root.txt \
		/media/volume/danluu-fuzz-data/rtc-gap-booster-20260515/current-run-root.txt; do
		root=$(cat "$marker" 2>/dev/null || true)
		[ -n "$root" ] && [ -d "$root" ] && roots+=( "$root" )
	done
	python3 - "${roots[@]}" <<'PY'
import json
import os
import subprocess
import sys

seen = set()

def pid_is_live_runner(pid):
	try:
		pid = int(pid)
		os.kill(pid, 0)
		args = subprocess.check_output(
			["ps", "-p", str(pid), "-o", "args="],
			text=True,
			stderr=subprocess.DEVNULL,
		)
		return "rtc-browser-fuzz-runner.mjs" in args
	except Exception:
		return False

for root in dict.fromkeys(sys.argv[1:]):
	root_depth = root.rstrip(os.sep).count(os.sep)
	for dirpath, dirnames, filenames in os.walk(root):
		if dirpath.rstrip(os.sep).count(os.sep) - root_depth >= 3:
			dirnames[:] = []
		if "lanes.json" not in filenames:
			continue
		try:
			with open(os.path.join(dirpath, "lanes.json"), errors="ignore") as handle:
				manifest = json.load(handle)
		except Exception:
			continue
		lanes = manifest.get("lanes") if isinstance(manifest, dict) else manifest
		if not isinstance(lanes, list):
			continue
		for lane in lanes:
			if isinstance(lane, dict) and pid_is_live_runner(lane.get("pid")):
				seen.add(int(lane["pid"]))
print(len(seen))
PY
}

rtc_optional_browser_floor_repair_allowed() {
	local reason=$1 load=$2 load_five=$3 cores=$4 live=$5 floor=$6
	[ "$reason" != "severe_pressure" ] || return 1
	[[ "$live" =~ ^[0-9]+$ && "$floor" =~ ^[0-9]+$ ]] || return 1
	[ "$live" -lt "$floor" ] || return 1
	[[ "$load" =~ ^[0-9.]+$ && "$load_five" =~ ^[0-9.]+$ && "$cores" =~ ^[0-9]+$ ]] || return 1
	awk -v loadv="$load" -v load5v="$load_five" -v cores="$cores" '
		BEGIN {
			exit !(loadv < cores * 0.90 && load5v < cores * 0.95);
		}
	'
}

rtc_optional_browser_admission() {
	local pool=${1:-optional-browser}
	local resource_base=${RTC_RESOURCE_AUTOSCALER_BASE:-/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516}
	local status=$resource_base/resource-autoscaler-status.md
	local log=${RTC_OPTIONAL_BROWSER_ADMISSION_LOG:-$resource_base/optional-browser-admission.log}
	local reason load load_five cores current desired now updated_epoch age
	local live_browser_lanes e2e_floor floor_repair_allowed=0

	mkdir -p "$(dirname "$log")"

	reason=$(sed -n 's/^- reason: //p' "$status" 2>/dev/null | tail -1)
	load=$(sed -n 's/^- load1: \([0-9.]*\) \/.*/\1/p' "$status" 2>/dev/null | tail -1)
	load_five=$(sed -n 's/^- load5: \([0-9.]*\) \/.*/\1/p' "$status" 2>/dev/null | tail -1)
	cores=$(sed -n 's/^- load1: [0-9.]* \/ \([0-9][0-9]*\) cores.*/\1/p' "$status" 2>/dev/null | tail -1)
	current=$(sed -n 's/^- current_budget: target=\([0-9][0-9]*\).*/\1/p' "$status" 2>/dev/null | tail -1)
	desired=$(sed -n 's/^- desired_budget: target=\([0-9][0-9]*\).*/\1/p' "$status" 2>/dev/null | tail -1)
	e2e_floor=${RTC_OPTIONAL_BROWSER_ADMISSION_E2E_MIN_LIVE_LANES:-24}
	live_browser_lanes=$(rtc_optional_browser_live_lanes)
	if rtc_optional_browser_floor_repair_allowed "$reason" "$load" "$load_five" "$cores" "$live_browser_lanes" "$e2e_floor"; then
		floor_repair_allowed=1
	fi

	case "$reason" in
		pressure|high_pressure|severe_pressure)
			if [ "$floor_repair_allowed" = 1 ]; then
				printf '[%s] allow optional browser floor repair start pool=%s live_browser_lanes=%s floor=%s reason=%s load1=%s load5=%s cores=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$pool" "$live_browser_lanes" "$e2e_floor" "$reason" "${load:-unknown}" "${load_five:-unknown}" "${cores:-unknown}" >> "$log"
			else
				printf '[%s] block optional browser start pool=%s reason=%s live_browser_lanes=%s floor=%s load1=%s load5=%s cores=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$pool" "$reason" "${live_browser_lanes:-unknown}" "$e2e_floor" "${load:-unknown}" "${load_five:-unknown}" "${cores:-unknown}" >> "$log"
				return 1
			fi
			;;
	esac

	if [[ "$current" =~ ^[0-9]+$ && "$desired" =~ ^[0-9]+$ ]] && [ "$desired" -lt "$current" ] && [ "$floor_repair_allowed" != 1 ]; then
		printf '[%s] block optional browser start pool=%s desired_budget=%s current_budget=%s reason=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$pool" "$desired" "$current" "${reason:-unknown}" >> "$log"
		return 1
	fi

	if [[ "$load" =~ ^[0-9.]+$ && "$cores" =~ ^[0-9]+$ ]] &&
		awk -v loadv="$load" -v cores="$cores" 'BEGIN { exit !(loadv >= cores * 0.90) }' &&
		[ "$floor_repair_allowed" != 1 ]; then
		printf '[%s] block optional browser start pool=%s load1=%s cores=%s reason=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$pool" "$load" "$cores" "${reason:-unknown}" >> "$log"
		return 1
	fi

	updated_epoch=$(stat -c %Y "$status" 2>/dev/null || true)
	if [[ "$updated_epoch" =~ ^[0-9]+$ ]]; then
		now=$(date +%s)
		age=$(( now - updated_epoch ))
		if [ "$age" -gt "${RTC_OPTIONAL_BROWSER_ADMISSION_STATUS_STALE_SECONDS:-360}" ]; then
			printf '[%s] block optional browser start pool=%s stale_status_age=%ss\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$pool" "$age" >> "$log"
			return 1
		fi
	fi

	printf '[%s] allow optional browser start pool=%s reason=%s load1=%s load5=%s cores=%s current=%s desired=%s live_browser_lanes=%s floor=%s floor_repair=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$pool" "${reason:-unknown}" "${load:-unknown}" "${load_five:-unknown}" "${cores:-unknown}" "${current:-unknown}" "${desired:-unknown}" "${live_browser_lanes:-unknown}" "$e2e_floor" "$floor_repair_allowed" >> "$log"
	return 0
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
	rtc_optional_browser_admission "${1:-optional-browser}"
fi
