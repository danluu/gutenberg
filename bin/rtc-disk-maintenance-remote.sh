#!/usr/bin/env bash
set -euo pipefail

DATA_VOLUME=${RTC_DATA_VOLUME:-/media/volume/danluu-fuzz-data}
ROOT_VOLUME=${RTC_ROOT_DISK_VOLUME:-/}
BASE=${RTC_DISK_MAINTENANCE_BASE:-$DATA_VOLUME/rtc-disk-maintenance-20260520}
LOG_DIR="$BASE/logs"
LOCK="$BASE/rtc-disk-maintenance.lock"
INTERVAL_SECONDS=${RTC_DISK_MAINTENANCE_INTERVAL_SECONDS:-900}
DATA_PRESSURE_FREE_GIB=${RTC_DISK_MAINTENANCE_DATA_PRESSURE_FREE_GIB:-180}
ROOT_PRESSURE_FREE_GIB=${RTC_DISK_MAINTENANCE_ROOT_PRESSURE_FREE_GIB:-28}
RUN_ROOT_KEEP=${RTC_DISK_MAINTENANCE_RUN_ROOT_KEEP:-80}
RUN_ROOT_KEEP_PRESSURE=${RTC_DISK_MAINTENANCE_RUN_ROOT_KEEP_PRESSURE:-40}
TRACE_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_TRACE_RETENTION_MINUTES:-720}
VIDEO_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_VIDEO_RETENTION_MINUTES:-360}
TMP_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_TMP_RETENTION_MINUTES:-360}
ONCE=0

if [ "${1:-}" = "--once" ]; then
	ONCE=1
fi

mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/maintenance.log"

exec 9>"$LOCK"
if ! flock -n 9; then
	echo "disk maintenance already running"
	exit 0
fi

stamp() {
	date -u +%Y-%m-%dT%H:%M:%SZ
}

log() {
	printf '[%s] %s\n' "$(stamp)" "$*" >> "$LOG"
}

free_gib() {
	df -Pk "$1" 2>/dev/null |
		awk 'NR == 2 { printf "%.1f\n", $4 / 1024 / 1024 }'
}

under_pressure() {
	local data_free root_free
	data_free=$(free_gib "$DATA_VOLUME")
	root_free=$(free_gib "$ROOT_VOLUME")
	awk -v data="$data_free" -v root="$root_free" \
		-v data_limit="$DATA_PRESSURE_FREE_GIB" -v root_limit="$ROOT_PRESSURE_FREE_GIB" '
		BEGIN {
			exit !(data + 0 < data_limit || root + 0 < root_limit);
		}
	'
}

path_is_live() {
	local path=$1
	local pid cwd env
	if [ -f "$DATA_VOLUME/rtc-coverage-guided-20260515/current-output-dir.txt" ] &&
		[ "$(sed -n '1p' "$DATA_VOLUME/rtc-coverage-guided-20260515/current-output-dir.txt" 2>/dev/null || true)" = "$path" ]; then
		return 0
	fi
	if [ -f "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/current-run-root.txt" ] &&
		[ "$(sed -n '1p' "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/current-run-root.txt" 2>/dev/null || true)" = "$path" ]; then
		return 0
	fi
	if [ -f "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/current-run-root.txt" ] &&
		[ "$(sed -n '1p' "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/current-run-root.txt" 2>/dev/null || true)" = "$path" ]; then
		return 0
	fi
	if [ -f "$DATA_VOLUME/rtc-gap-booster-20260515/current-run-root.txt" ] &&
		[ "$(sed -n '1p' "$DATA_VOLUME/rtc-gap-booster-20260515/current-run-root.txt" 2>/dev/null || true)" = "$path" ]; then
		return 0
	fi
	while IFS= read -r pid; do
		[ -r "/proc/$pid/cwd" ] || continue
		cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null || true)
		case "$cwd" in
			"$path"|"$path"/*)
				return 0
				;;
		esac
		[ -r "/proc/$pid/environ" ] || continue
		env=$(tr '\0' '\n' < "/proc/$pid/environ" 2>/dev/null || true)
		case "$env" in
			*"RTC_FUZZ_SUPERVISOR_OUTPUT_DIR=$path"*|*"RTC_FUZZ_NOVELTY_OUTPUT_DIR=$path"*|*"RTC_FUZZ_OUTPUT_DIR=$path"*)
				return 0
				;;
		esac
	done < <(pgrep -f 'rtc-browser-fuzz|collaboration-fuzz|wp-scripts test-playwright|@playwright/test|wp-env' || true)
	return 1
}

remove_path() {
	local path=$1
	[ -e "$path" ] || return 0
	log "remove path=$path"
	if ionice -c3 nice -n 19 rm -rf -- "$path" >> "$LOG" 2>&1; then
		return 0
	fi
	chmod -R u+rwX "$path" >/dev/null 2>> "$LOG" || true
	ionice -c3 nice -n 19 rm -rf -- "$path" >> "$LOG" 2>&1 ||
		sudo ionice -c3 nice -n 19 rm -rf -- "$path" >> "$LOG" 2>&1 ||
		log "remove failed path=$path"
}

trim_run_roots() {
	local base=$1
	local glob=$2
	local pointer=${3:-}
	local keep=$4
	local current=""
	local count=0
	local path

	[ -d "$base" ] || return 0
	if [ -n "$pointer" ] && [ -f "$pointer" ]; then
		current=$(sed -n '1p' "$pointer" 2>/dev/null || true)
	fi

	while IFS= read -r path; do
		[ -n "$path" ] || continue
		count=$(( count + 1 ))
		if [ "$count" -le "$keep" ]; then
			continue
		fi
		if [ -n "$current" ] && [ "$path" = "$current" ]; then
			continue
		fi
		if path_is_live "$path"; then
			log "skip live stale root path=$path"
			continue
		fi
		remove_path "$path"
	done < <(ls -td $glob 2>/dev/null || true)
}

prune_old_artifacts() {
	local root=$1
	[ -d "$root" ] || return 0
	find "$root" -type f \( -name 'trace.zip' -o -name '*.trace.zip' \) -mmin +"$TRACE_RETENTION_MINUTES" -print -delete >> "$LOG" 2>&1 || true
	find "$root" -type f -name '*.webm' -mmin +"$VIDEO_RETENTION_MINUTES" -print -delete >> "$LOG" 2>&1 || true
	find "$root" -type d \( -name '.playwright-artifacts-*' -o -name 'playwright-artifacts-*' \) -mmin +"$TMP_RETENTION_MINUTES" -print0 2>/dev/null |
		while IFS= read -r -d '' dir; do
			path_is_live "$dir" && continue
			remove_path "$dir"
		done
}

run_once() {
	local keep
	keep="$RUN_ROOT_KEEP"
	if under_pressure; then
		keep="$RUN_ROOT_KEEP_PRESSURE"
	fi

	log "start data_free_gib=$(free_gib "$DATA_VOLUME") root_free_gib=$(free_gib "$ROOT_VOLUME") keep=$keep"
	trim_run_roots "$DATA_VOLUME/rtc-coverage-guided-20260515" "$DATA_VOLUME/rtc-coverage-guided-20260515/run-*" "$DATA_VOLUME/rtc-coverage-guided-20260515/current-output-dir.txt" "$keep"
	trim_run_roots "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/runs" "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/runs/strict-expansion-*" "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/current-run-root.txt" "$keep"
	trim_run_roots "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/runs" "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/runs/focused-shards-*" "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/current-run-root.txt" "$keep"
	trim_run_roots "$DATA_VOLUME/rtc-gap-booster-20260515/runs" "$DATA_VOLUME/rtc-gap-booster-20260515/runs/gap-booster-*" "$DATA_VOLUME/rtc-gap-booster-20260515/current-run-root.txt" "$keep"

	prune_old_artifacts "$DATA_VOLUME/rtc-coverage-guided-20260515"
	prune_old_artifacts "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515"
	prune_old_artifacts "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515"
	prune_old_artifacts "$DATA_VOLUME/rtc-gap-booster-20260515"
	log "done data_free_gib=$(free_gib "$DATA_VOLUME") root_free_gib=$(free_gib "$ROOT_VOLUME")"
}

while true; do
	run_once
	if [ "$ONCE" = "1" ]; then
		exit 0
	fi
	sleep "$INTERVAL_SECONDS"
done
