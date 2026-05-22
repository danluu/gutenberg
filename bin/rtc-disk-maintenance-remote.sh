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
DATA_INODE_PRESSURE_USED_PERCENT=${RTC_DISK_MAINTENANCE_DATA_INODE_PRESSURE_USED_PERCENT:-70}
ROOT_INODE_PRESSURE_USED_PERCENT=${RTC_DISK_MAINTENANCE_ROOT_INODE_PRESSURE_USED_PERCENT:-85}
RUN_ROOT_KEEP=${RTC_DISK_MAINTENANCE_RUN_ROOT_KEEP:-48}
RUN_ROOT_KEEP_PRESSURE=${RTC_DISK_MAINTENANCE_RUN_ROOT_KEEP_PRESSURE:-24}
RUN_ROOT_HEAVY_DIR_KEEP=${RTC_DISK_MAINTENANCE_RUN_ROOT_HEAVY_DIR_KEEP:-8}
RUN_ROOT_HEAVY_DIR_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_RUN_ROOT_HEAVY_DIR_RETENTION_MINUTES:-120}
TRACE_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_TRACE_RETENTION_MINUTES:-720}
VIDEO_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_VIDEO_RETENTION_MINUTES:-360}
TMP_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_TMP_RETENTION_MINUTES:-360}
ROOT_TMP_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_ROOT_TMP_RETENTION_MINUTES:-1440}
ROOT_TMP_MAX_DELETE_PER_PASS=${RTC_DISK_MAINTENANCE_ROOT_TMP_MAX_DELETE_PER_PASS:-5000}
ARTIFACT_PRUNE_SUMMARY_LIMIT=${RTC_DISK_MAINTENANCE_ARTIFACT_PRUNE_SUMMARY_LIMIT:-80}
ARTIFACT_PRUNE_ARTIFACT_DIR_LIMIT=${RTC_DISK_MAINTENANCE_ARTIFACT_DIR_LIMIT:-1000}
ARTIFACT_PRUNE_CURSOR_DIR="$BASE/artifact-prune-cursors"
STATUS="$BASE/current-status.md"
ONCE=0

if [ "${1:-}" = "--once" ]; then
	ONCE=1
fi

mkdir -p "$LOG_DIR"
mkdir -p "$ARTIFACT_PRUNE_CURSOR_DIR"
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

inode_used_percent() {
	df -Pi "$1" 2>/dev/null |
		awk 'NR == 2 { value = $5; sub(/%$/, "", value); printf "%.0f\n", value + 0 }'
}

under_pressure() {
	local data_free root_free data_inode_used root_inode_used
	data_free=$(free_gib "$DATA_VOLUME")
	root_free=$(free_gib "$ROOT_VOLUME")
	data_inode_used=$(inode_used_percent "$DATA_VOLUME")
	root_inode_used=$(inode_used_percent "$ROOT_VOLUME")
	awk -v data="$data_free" -v root="$root_free" \
		-v data_limit="$DATA_PRESSURE_FREE_GIB" -v root_limit="$ROOT_PRESSURE_FREE_GIB" '
		BEGIN {
			exit !(data + 0 < data_limit || root + 0 < root_limit);
		}
	' && return 0
	awk -v data_inode="$data_inode_used" -v root_inode="$root_inode_used" \
		-v data_limit="$DATA_INODE_PRESSURE_USED_PERCENT" -v root_limit="$ROOT_INODE_PRESSURE_USED_PERCENT" '
		BEGIN {
			exit !(data_inode + 0 >= data_limit || root_inode + 0 >= root_limit);
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
	local limit=${2:-$ARTIFACT_PRUNE_ARTIFACT_DIR_LIMIT}
	local cursor_key cursor_file
	cursor_key=$(printf '%s' "$summary" | sha256sum | awk '{ print $1 }')
	cursor_file="$ARTIFACT_PRUNE_CURSOR_DIR/$cursor_key.cursor"
	node - "$summary" "$cursor_file" "$limit" <<'NODE'
const fs = require( 'fs' );
const readline = require( 'readline' );
const [ summaryPath, cursorPath, limitText ] = process.argv.slice( 2 );
const limit = Number.parseInt( limitText, 10 ) || 1000;
const seen = new Set();

function addPath( value ) {
	if ( typeof value === 'string' && value.length > 0 ) {
		seen.add( value );
	}
}

function readCursor() {
	try {
		const value = Number.parseInt(
			fs.readFileSync( cursorPath, 'utf8' ),
			10
		);
		return Number.isFinite( value ) && value > 0 ? value : 0;
	} catch {
		return 0;
	}
}

async function main() {
	const cursor = readCursor();
	let lineNumber = 0;
	let lastScannedLine = cursor;
	let emitted = 0;
	let reachedEof = true;
	const input = fs.createReadStream( summaryPath, { encoding: 'utf8' } );
	const lines = readline.createInterface( {
		input,
		crlfDelay: Infinity,
	} );

	for await ( const line of lines ) {
		lineNumber += 1;
		if ( lineNumber <= cursor ) {
			continue;
		}
		lastScannedLine = lineNumber;
		if ( ! line.trim() ) {
			continue;
		}
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
		for ( const artifactDir of seen ) {
			console.log( artifactDir );
			emitted += 1;
			if ( emitted >= limit ) {
				reachedEof = false;
				break;
			}
		}
		seen.clear();
		if ( emitted >= limit ) {
			break;
		}
	}

	const nextCursor = reachedEof ? 0 : lastScannedLine;
	fs.writeFileSync( cursorPath, `${ nextCursor }\n` );
}

main().catch( ( error ) => {
	console.error( error && error.stack ? error.stack : String( error ) );
	process.exitCode = 0;
} );
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
	local artifact_dir count summary summary_count remaining
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
		remaining=$(( ARTIFACT_PRUNE_ARTIFACT_DIR_LIMIT - count ))
		if [ "$remaining" -le 0 ]; then
			log "artifact prune artifact-dir limit reached root=$root limit=$ARTIFACT_PRUNE_ARTIFACT_DIR_LIMIT"
			return 0
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
		done < <(artifact_dirs_from_summary "$summary" "$remaining")
	done

	if [ "$summary_count" -eq 0 ]; then
		log "skip artifact prune; no summary index root=$root"
	fi
}

cleanup_root_tmp_known_prefixes() {
	local tmp_root=/tmp
	local candidates deleted_count
	[ -d "$tmp_root" ] || return 0
	candidates=$(mktemp "$BASE/root-tmp-cleanup.XXXXXX")
	find "$tmp_root" -xdev -mindepth 1 -maxdepth 1 \
		\( -name 'tmp.*' \
			-o -name 'playwright-*' \
			-o -name 'playwright_*' \
			-o -name 'playwright_chromiumdev_profile-*' \
			-o -name 'puppeteer_dev_chrome_profile-*' \
			-o -name 'jest-*' \
			-o -name 'v8-*' \
			-o -name 'wp-env-*' \) \
		-mmin +"$ROOT_TMP_RETENTION_MINUTES" \
		-printf '%p\0' 2>/dev/null |
		awk -v RS='\0' -v ORS='\0' -v max="$ROOT_TMP_MAX_DELETE_PER_PASS" 'NR <= max { print }' > "$candidates"
	deleted_count=$(tr '\0' '\n' < "$candidates" | awk 'END { print NR + 0 }')
	xargs -0 -r ionice -c3 nice -n 19 rm -rf -- < "$candidates" >> "$LOG" 2>&1 ||
		log "cleanup_root_tmp_known_prefixes partial failure candidates=$candidates"
	rm -f "$candidates"
	log "cleanup_root_tmp_known_prefixes deleted=${deleted_count:-0} retention_minutes=$ROOT_TMP_RETENTION_MINUTES max=$ROOT_TMP_MAX_DELETE_PER_PASS"
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
		echo "- data_inode_used_percent: $(inode_used_percent "$DATA_VOLUME")"
		echo "- root_inode_used_percent: $(inode_used_percent "$ROOT_VOLUME")"
		echo "- data_pressure_free_gib: $DATA_PRESSURE_FREE_GIB"
		echo "- root_pressure_free_gib: $ROOT_PRESSURE_FREE_GIB"
		echo "- data_inode_pressure_used_percent: $DATA_INODE_PRESSURE_USED_PERCENT"
		echo "- root_inode_pressure_used_percent: $ROOT_INODE_PRESSURE_USED_PERCENT"
		echo "- run_root_keep_effective: $keep"
		echo "- run_root_keep_default: $RUN_ROOT_KEEP"
		echo "- run_root_keep_pressure: $RUN_ROOT_KEEP_PRESSURE"
		echo "- heavy_dir_keep: $RUN_ROOT_HEAVY_DIR_KEEP"
		echo "- heavy_dir_retention_minutes: $RUN_ROOT_HEAVY_DIR_RETENTION_MINUTES"
		echo "- trace_retention_minutes: $TRACE_RETENTION_MINUTES"
		echo "- video_retention_minutes: $VIDEO_RETENTION_MINUTES"
		echo "- tmp_retention_minutes: $TMP_RETENTION_MINUTES"
		echo "- root_tmp_retention_minutes: $ROOT_TMP_RETENTION_MINUTES"
		echo "- root_tmp_max_delete_per_pass: $ROOT_TMP_MAX_DELETE_PER_PASS"
		echo "- artifact_prune_cursor_count: $(find "$ARTIFACT_PRUNE_CURSOR_DIR" -type f -name '*.cursor' 2>/dev/null | wc -l | tr -d ' ')"
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
	cleanup_root_tmp_known_prefixes
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
