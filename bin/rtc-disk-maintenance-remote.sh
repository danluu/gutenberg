#!/usr/bin/env bash
set -euo pipefail

DATA_VOLUME=${RTC_DATA_VOLUME:-/media/volume/danluu-fuzz-data}
ROOT_VOLUME=${RTC_ROOT_DISK_VOLUME:-/}
BASE=${RTC_DISK_MAINTENANCE_BASE:-$DATA_VOLUME/rtc-disk-maintenance-20260520}
LOG_DIR="$BASE/logs"
LOCK="$BASE/rtc-disk-maintenance.lock"
INTERVAL_SECONDS=${RTC_DISK_MAINTENANCE_INTERVAL_SECONDS:-900}
DATA_PRESSURE_FREE_GIB=${RTC_DISK_MAINTENANCE_DATA_PRESSURE_FREE_GIB:-650}
ROOT_PRESSURE_FREE_GIB=${RTC_DISK_MAINTENANCE_ROOT_PRESSURE_FREE_GIB:-28}
RUN_ROOT_KEEP=${RTC_DISK_MAINTENANCE_RUN_ROOT_KEEP:-48}
RUN_ROOT_KEEP_PRESSURE=${RTC_DISK_MAINTENANCE_RUN_ROOT_KEEP_PRESSURE:-24}
RUN_ROOT_HEAVY_DIR_KEEP=${RTC_DISK_MAINTENANCE_RUN_ROOT_HEAVY_DIR_KEEP:-8}
RUN_ROOT_HEAVY_DIR_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_RUN_ROOT_HEAVY_DIR_RETENTION_MINUTES:-120}
TRACE_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_TRACE_RETENTION_MINUTES:-720}
VIDEO_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_VIDEO_RETENTION_MINUTES:-360}
TMP_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_TMP_RETENTION_MINUTES:-360}
ARTIFACT_PRUNE_SUMMARY_LIMIT=${RTC_DISK_MAINTENANCE_ARTIFACT_PRUNE_SUMMARY_LIMIT:-80}
ARTIFACT_PRUNE_ARTIFACT_DIR_LIMIT=${RTC_DISK_MAINTENANCE_ARTIFACT_DIR_LIMIT:-1000}
STATUS="$BASE/current-status.md"
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
	if sudo -n true >/dev/null 2>&1; then
		if sudo ionice -c3 nice -n 19 rm -rf -- "$path" >> "$LOG" 2>&1; then
			return 0
		fi
	fi
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

prune_stale_run_root_heavy_dirs() {
	local base=$1
	local glob=$2
	local pointer=${3:-}
	local current=""
	local count=0
	local path child

	[ -d "$base" ] || return 0
	if [ -n "$pointer" ] && [ -f "$pointer" ]; then
		current=$(sed -n '1p' "$pointer" 2>/dev/null || true)
	fi

	while IFS= read -r path; do
		[ -n "$path" ] || continue
		count=$(( count + 1 ))
		if [ "$count" -le "$RUN_ROOT_HEAVY_DIR_KEEP" ]; then
			continue
		fi
		if [ -n "$current" ] && [ "$path" = "$current" ]; then
			continue
		fi
		if path_is_live "$path"; then
			log "skip live heavy-dir prune path=$path"
			continue
		fi
		if ! path_older_than_minutes "$path" "$RUN_ROOT_HEAVY_DIR_RETENTION_MINUTES"; then
			continue
		fi
		for child in "$path/wp-env" "$path/repos" "$path/playwright-report" "$path/blob-report"; do
			[ -e "$child" ] || continue
			remove_path "$child"
		done
	done < <(ls -td $glob 2>/dev/null || true)
}

path_older_than_minutes() {
	local path=$1
	local minutes=$2
	local mtime now age
	mtime=$(stat -c %Y -- "$path" 2>/dev/null) || return 1
	now=$(date +%s)
	age=$(( now - mtime ))
	[ "$age" -gt $(( minutes * 60 )) ]
}

remove_file_if_old() {
	local path=$1
	local minutes=$2
	[ -f "$path" ] || return 0
	if path_older_than_minutes "$path" "$minutes"; then
		log "remove file path=$path"
		ionice -c3 nice -n 19 rm -f -- "$path" >> "$LOG" 2>&1 ||
			log "remove file failed path=$path"
	fi
}

remove_dir_if_old() {
	local path=$1
	local minutes=$2
	[ -d "$path" ] || return 0
	if path_older_than_minutes "$path" "$minutes"; then
		remove_path "$path"
	fi
}

artifact_dirs_from_summary() {
	local summary=$1
	node - "$summary" "$ARTIFACT_PRUNE_ARTIFACT_DIR_LIMIT" <<'NODE'
const fs = require( 'fs' );
const [ summaryPath, limitText ] = process.argv.slice( 2 );
const limit = Number.parseInt( limitText, 10 ) || 1000;
const seen = new Set();

function addPath( value ) {
	if ( typeof value === 'string' && value.length > 0 ) {
		seen.add( value );
	}
}

let lineCount = 0;
for ( const line of fs.readFileSync( summaryPath, 'utf8' ).split( /\n/ ) ) {
	if ( ! line.trim() ) {
		continue;
	}
	if ( lineCount >= limit ) {
		break;
	}
	lineCount += 1;
	let record;
	try {
		record = JSON.parse( line );
	} catch {
		continue;
	}
	addPath( record.artifactsDir );
	for ( const attempt of record.attempts || [] ) {
		addPath( attempt?.artifactsDir );
	}
}

for ( const artifactDir of seen ) {
	console.log( artifactDir );
}
NODE
}

prune_indexed_artifact_dir() {
	local artifact_dir=$1
	local path
	[ -d "$artifact_dir" ] || return 0

	for path in \
		"$artifact_dir"/trace.zip \
		"$artifact_dir"/*.trace.zip \
		"$artifact_dir"/test-results/*/trace.zip \
		"$artifact_dir"/test-results/*/*.trace.zip; do
		remove_file_if_old "$path" "$TRACE_RETENTION_MINUTES"
	done

	for path in \
		"$artifact_dir"/*.webm \
		"$artifact_dir"/test-results/*/video.webm \
		"$artifact_dir"/test-results/*/*.webm; do
		remove_file_if_old "$path" "$VIDEO_RETENTION_MINUTES"
	done

	for path in \
		"$artifact_dir"/test-results/.playwright-artifacts-* \
		"$artifact_dir"/test-results/playwright-artifacts-* \
		"$artifact_dir"/test-results/*/.playwright-artifacts-* \
		"$artifact_dir"/test-results/*/playwright-artifacts-*; do
		remove_dir_if_old "$path" "$TMP_RETENTION_MINUTES"
	done
}

prune_old_artifacts_in_tree() {
	local root=$1
	local artifact_dir count summary summary_count
	count=0
	summary_count=0
	[ -d "$root" ] || return 0

	for summary in "$root"/*/lane-*/summary.ndjson "$root"/lane-*/summary.ndjson; do
		[ -f "$summary" ] || continue
		summary_count=$(( summary_count + 1 ))
		if [ "$summary_count" -gt "$ARTIFACT_PRUNE_SUMMARY_LIMIT" ]; then
			log "artifact prune summary limit reached root=$root limit=$ARTIFACT_PRUNE_SUMMARY_LIMIT"
			break
		fi
		while IFS= read -r artifact_dir; do
			[ -n "$artifact_dir" ] || continue
			case "$artifact_dir" in
				"$root"|"$root"/*)
					;;
				*)
					log "skip artifact outside root root=$root artifact_dir=$artifact_dir"
					continue
					;;
			esac
			count=$(( count + 1 ))
			if [ "$count" -gt "$ARTIFACT_PRUNE_ARTIFACT_DIR_LIMIT" ]; then
				log "artifact prune artifact-dir limit reached root=$root limit=$ARTIFACT_PRUNE_ARTIFACT_DIR_LIMIT"
				return 0
			fi
			prune_indexed_artifact_dir "$artifact_dir"
		done < <(artifact_dirs_from_summary "$summary")
	done

	if [ "$summary_count" -eq 0 ]; then
		log "skip artifact prune; no summary index root=$root"
	fi
}

prune_old_artifacts() {
	local root=$1
	local pointer=${2:-}
	local artifact_root=""
	if [ -n "$pointer" ] && [ -f "$pointer" ]; then
		artifact_root=$(sed -n '1p' "$pointer" 2>/dev/null || true)
	fi
	if [ -z "$artifact_root" ]; then
		log "skip artifact prune; missing current-run pointer root=$root pointer=$pointer"
		return 0
	fi
	if [ ! -d "$artifact_root" ]; then
		log "skip artifact prune; current-run root missing path=$artifact_root"
		return 0
	fi
	prune_old_artifacts_in_tree "$artifact_root"
}

run_root_count() {
	local glob=$1
	find $(dirname "$glob") -mindepth 1 -maxdepth 1 -type d -name "$(basename "$glob")" 2>/dev/null | wc -l | tr -d ' '
}

write_status() {
	local keep=$1
	local state=${2:-done}
	{
		echo "# RTC Disk Maintenance Status"
		echo
		echo "- updated: $(stamp)"
		echo "- state: $state"
		echo "- data_free_gib: $(free_gib "$DATA_VOLUME")"
		echo "- root_free_gib: $(free_gib "$ROOT_VOLUME")"
		echo "- data_pressure_free_gib: $DATA_PRESSURE_FREE_GIB"
		echo "- root_pressure_free_gib: $ROOT_PRESSURE_FREE_GIB"
		echo "- run_root_keep_effective: $keep"
		echo "- run_root_keep_default: $RUN_ROOT_KEEP"
		echo "- run_root_keep_pressure: $RUN_ROOT_KEEP_PRESSURE"
		echo "- heavy_dir_keep: $RUN_ROOT_HEAVY_DIR_KEEP"
		echo "- heavy_dir_retention_minutes: $RUN_ROOT_HEAVY_DIR_RETENTION_MINUTES"
		echo "- trace_retention_minutes: $TRACE_RETENTION_MINUTES"
		echo "- video_retention_minutes: $VIDEO_RETENTION_MINUTES"
		echo "- tmp_retention_minutes: $TMP_RETENTION_MINUTES"
		echo
		echo "## Run Root Counts"
		echo "- coverage_guided: $(run_root_count "$DATA_VOLUME/rtc-coverage-guided-20260515/run-*")"
		echo "- strict_expansion: $(run_root_count "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/runs/strict-expansion-*")"
		echo "- focused_shards: $(run_root_count "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/runs/focused-shards-*")"
		echo "- gap_booster: $(run_root_count "$DATA_VOLUME/rtc-gap-booster-20260515/runs/gap-booster-*")"
		echo
		echo "## Current Roots"
		echo "- coverage_guided: $(sed -n '1p' "$DATA_VOLUME/rtc-coverage-guided-20260515/current-output-dir.txt" 2>/dev/null || true)"
		echo "- strict_expansion: $(sed -n '1p' "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/current-run-root.txt" 2>/dev/null || true)"
		echo "- focused_shards: $(sed -n '1p' "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/current-run-root.txt" 2>/dev/null || true)"
		echo "- gap_booster: $(sed -n '1p' "$DATA_VOLUME/rtc-gap-booster-20260515/current-run-root.txt" 2>/dev/null || true)"
		echo
		echo "## Recent Log"
		tail -40 "$LOG" 2>/dev/null || true
	} > "$STATUS.$$.tmp"
	mv "$STATUS.$$.tmp" "$STATUS"
}

run_once() {
	local keep
	keep="$RUN_ROOT_KEEP"
	if under_pressure; then
		keep="$RUN_ROOT_KEEP_PRESSURE"
	fi

	log "start data_free_gib=$(free_gib "$DATA_VOLUME") root_free_gib=$(free_gib "$ROOT_VOLUME") keep=$keep"
	write_status "$keep" "running"
	trim_run_roots "$DATA_VOLUME/rtc-coverage-guided-20260515" "$DATA_VOLUME/rtc-coverage-guided-20260515/run-*" "$DATA_VOLUME/rtc-coverage-guided-20260515/current-output-dir.txt" "$keep"
	trim_run_roots "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/runs" "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/runs/strict-expansion-*" "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/current-run-root.txt" "$keep"
	trim_run_roots "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/runs" "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/runs/focused-shards-*" "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/current-run-root.txt" "$keep"
	trim_run_roots "$DATA_VOLUME/rtc-gap-booster-20260515/runs" "$DATA_VOLUME/rtc-gap-booster-20260515/runs/gap-booster-*" "$DATA_VOLUME/rtc-gap-booster-20260515/current-run-root.txt" "$keep"

	prune_stale_run_root_heavy_dirs "$DATA_VOLUME/rtc-coverage-guided-20260515" "$DATA_VOLUME/rtc-coverage-guided-20260515/run-*" "$DATA_VOLUME/rtc-coverage-guided-20260515/current-output-dir.txt"
	prune_stale_run_root_heavy_dirs "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/runs" "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/runs/strict-expansion-*" "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/current-run-root.txt"
	prune_stale_run_root_heavy_dirs "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/runs" "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/runs/focused-shards-*" "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/current-run-root.txt"
	prune_stale_run_root_heavy_dirs "$DATA_VOLUME/rtc-gap-booster-20260515/runs" "$DATA_VOLUME/rtc-gap-booster-20260515/runs/gap-booster-*" "$DATA_VOLUME/rtc-gap-booster-20260515/current-run-root.txt"

	prune_old_artifacts "$DATA_VOLUME/rtc-coverage-guided-20260515" "$DATA_VOLUME/rtc-coverage-guided-20260515/current-output-dir.txt"
	prune_old_artifacts "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515" "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/current-run-root.txt"
	prune_old_artifacts "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515" "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/current-run-root.txt"
	prune_old_artifacts "$DATA_VOLUME/rtc-gap-booster-20260515" "$DATA_VOLUME/rtc-gap-booster-20260515/current-run-root.txt"
	log "done data_free_gib=$(free_gib "$DATA_VOLUME") root_free_gib=$(free_gib "$ROOT_VOLUME")"
	write_status "$keep" "done"
}

while true; do
	run_once
	if [ "$ONCE" = "1" ]; then
		exit 0
	fi
	sleep "$INTERVAL_SECONDS"
done
