#!/usr/bin/env bash
set -euo pipefail

DATA_VOLUME=${RTC_DATA_VOLUME:-/media/volume/danluu-fuzz-data}
ROOT_VOLUME=${RTC_ROOT_DISK_VOLUME:-/}
BASE=${RTC_DISK_MAINTENANCE_BASE:-$DATA_VOLUME/rtc-disk-maintenance-20260520}
LOG_DIR="$BASE/logs"
LOCK="$BASE/rtc-disk-maintenance.lock"
INTERVAL_SECONDS=${RTC_DISK_MAINTENANCE_INTERVAL_SECONDS:-900}
DATA_PRESSURE_FREE_GIB=${RTC_DISK_MAINTENANCE_DATA_PRESSURE_FREE_GIB:-800}
DATA_HIGH_PRESSURE_FREE_GIB=${RTC_DISK_MAINTENANCE_DATA_HIGH_PRESSURE_FREE_GIB:-350}
DATA_EMERGENCY_FREE_GIB=${RTC_DISK_MAINTENANCE_DATA_EMERGENCY_FREE_GIB:-75}
DATA_TARGET_FREE_GIB=${RTC_DISK_MAINTENANCE_DATA_TARGET_FREE_GIB:-720}
DATA_EMERGENCY_TARGET_FREE_GIB=${RTC_DISK_MAINTENANCE_DATA_EMERGENCY_TARGET_FREE_GIB:-300}
ROOT_PRESSURE_FREE_GIB=${RTC_DISK_MAINTENANCE_ROOT_PRESSURE_FREE_GIB:-28}
ROOT_EMERGENCY_FREE_GIB=${RTC_DISK_MAINTENANCE_ROOT_EMERGENCY_FREE_GIB:-12}
DATA_INODE_PRESSURE_USED_PERCENT=${RTC_DISK_MAINTENANCE_DATA_INODE_PRESSURE_USED_PERCENT:-68}
DATA_EMERGENCY_INODE_USED_PERCENT=${RTC_DISK_MAINTENANCE_DATA_EMERGENCY_INODE_USED_PERCENT:-90}
ROOT_INODE_PRESSURE_USED_PERCENT=${RTC_DISK_MAINTENANCE_ROOT_INODE_PRESSURE_USED_PERCENT:-85}
ROOT_EMERGENCY_INODE_USED_PERCENT=${RTC_DISK_MAINTENANCE_ROOT_EMERGENCY_INODE_USED_PERCENT:-95}
RUN_ROOT_KEEP=${RTC_DISK_MAINTENANCE_RUN_ROOT_KEEP:-24}
RUN_ROOT_KEEP_PRESSURE=${RTC_DISK_MAINTENANCE_RUN_ROOT_KEEP_PRESSURE:-12}
RUN_ROOT_HEAVY_DIR_KEEP=${RTC_DISK_MAINTENANCE_RUN_ROOT_HEAVY_DIR_KEEP:-4}
RUN_ROOT_HEAVY_DIR_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_RUN_ROOT_HEAVY_DIR_RETENTION_MINUTES:-120}
RUN_ROOT_BROWSER_PAYLOAD_KEEP=${RTC_DISK_MAINTENANCE_RUN_ROOT_BROWSER_PAYLOAD_KEEP:-2}
RUN_ROOT_BROWSER_PAYLOAD_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_RUN_ROOT_BROWSER_PAYLOAD_RETENTION_MINUTES:-360}
RUN_ROOT_SEED_PAYLOAD_KEEP=${RTC_DISK_MAINTENANCE_RUN_ROOT_SEED_PAYLOAD_KEEP:-2}
RUN_ROOT_SEED_PAYLOAD_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_RUN_ROOT_SEED_PAYLOAD_RETENTION_MINUTES:-720}
TRACE_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_TRACE_RETENTION_MINUTES:-720}
VIDEO_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_VIDEO_RETENTION_MINUTES:-360}
TMP_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_TMP_RETENTION_MINUTES:-360}
DATA_TMP_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_DATA_TMP_RETENTION_MINUTES:-2880}
CURRENT_ROOT_TMP_REPO_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_CURRENT_ROOT_TMP_REPO_RETENTION_MINUTES:-15}
CURRENT_ROOT_REPO_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_CURRENT_ROOT_REPO_RETENTION_MINUTES:-180}
CURRENT_ROOT_REPO_MAX_DELETE_PER_PASS=${RTC_DISK_MAINTENANCE_CURRENT_ROOT_REPO_MAX_DELETE_PER_PASS:-8}
COVERAGE_RUN_PAYLOAD_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_COVERAGE_RUN_PAYLOAD_RETENTION_MINUTES:-90}
COVERAGE_RUN_PAYLOAD_KEEP=${RTC_DISK_MAINTENANCE_COVERAGE_RUN_PAYLOAD_KEEP:-2}
BENCHMARK_CANARY_COVERAGE_RUN_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_BENCHMARK_CANARY_COVERAGE_RUN_RETENTION_MINUTES:-2880}
BENCHMARK_CYCLE_KEEP=${RTC_DISK_MAINTENANCE_BENCHMARK_CYCLE_KEEP:-12}
BENCHMARK_CYCLE_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_BENCHMARK_CYCLE_RETENTION_MINUTES:-720}
PR_FINALIZATION_WORKTREE_KEEP=${RTC_DISK_MAINTENANCE_PR_FINALIZATION_WORKTREE_KEEP:-12}
PR_FINALIZATION_WORKTREE_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_PR_FINALIZATION_WORKTREE_RETENTION_MINUTES:-720}
PR_FINALIZATION_VALIDATION_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_PR_FINALIZATION_VALIDATION_RETENTION_MINUTES:-720}
STALE_WP_ENV_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_STALE_WP_ENV_RETENTION_MINUTES:-2880}
STALE_WP_ENV_MAX_DELETE_PER_PASS=${RTC_DISK_MAINTENANCE_STALE_WP_ENV_MAX_DELETE_PER_PASS:-2000}
FUZZ_REPO_BATCH_KEEP=${RTC_DISK_MAINTENANCE_FUZZ_REPO_BATCH_KEEP:-4}
FUZZ_REPO_BATCH_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_FUZZ_REPO_BATCH_RETENTION_MINUTES:-720}
FUZZ_WP_ENV_BATCH_KEEP=${RTC_DISK_MAINTENANCE_FUZZ_WP_ENV_BATCH_KEEP:-8}
FUZZ_WP_ENV_BATCH_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_FUZZ_WP_ENV_BATCH_RETENTION_MINUTES:-720}
MAINTAINER_TESTED_SCRATCH_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_MAINTAINER_TESTED_SCRATCH_RETENTION_MINUTES:-2880}
REPO_ARTIFACT_CHILD_KEEP=${RTC_DISK_MAINTENANCE_REPO_ARTIFACT_CHILD_KEEP:-20}
REPO_ARTIFACT_CHILD_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_REPO_ARTIFACT_CHILD_RETENTION_MINUTES:-720}
REPO_BROWSER_ARTIFACT_PAYLOAD_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_REPO_BROWSER_ARTIFACT_PAYLOAD_RETENTION_MINUTES:-2880}
STALE_ROOT_ARCHIVE_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_STALE_ROOT_ARCHIVE_RETENTION_MINUTES:-10080}
DOCKER_PRUNE_MIN_INTERVAL_SECONDS=${RTC_DISK_MAINTENANCE_DOCKER_PRUNE_MIN_INTERVAL_SECONDS:-3600}
DOCKER_PRUNE_UNTIL_NORMAL_HOURS=${RTC_DISK_MAINTENANCE_DOCKER_PRUNE_UNTIL_NORMAL_HOURS:-48}
DOCKER_PRUNE_UNTIL_PRESSURE_HOURS=${RTC_DISK_MAINTENANCE_DOCKER_PRUNE_UNTIL_PRESSURE_HOURS:-12}
DOCKER_PRUNE_UNTIL_HIGH_HOURS=${RTC_DISK_MAINTENANCE_DOCKER_PRUNE_UNTIL_HIGH_HOURS:-4}
DOCKER_PRUNE_UNTIL_EMERGENCY_HOURS=${RTC_DISK_MAINTENANCE_DOCKER_PRUNE_UNTIL_EMERGENCY_HOURS:-1}
DOCKER_PRUNE_TIMEOUT_SECONDS=${RTC_DISK_MAINTENANCE_DOCKER_PRUNE_TIMEOUT_SECONDS:-180}
TARGET_CLEANUP_MAX_EXTRA_PASSES=${RTC_DISK_MAINTENANCE_TARGET_CLEANUP_MAX_EXTRA_PASSES:-3}
ROOT_TMP_RETENTION_MINUTES=${RTC_DISK_MAINTENANCE_ROOT_TMP_RETENTION_MINUTES:-1440}
ROOT_TMP_MAX_DELETE_PER_PASS=${RTC_DISK_MAINTENANCE_ROOT_TMP_MAX_DELETE_PER_PASS:-5000}
ARTIFACT_PRUNE_SUMMARY_LIMIT=${RTC_DISK_MAINTENANCE_ARTIFACT_PRUNE_SUMMARY_LIMIT:-80}
ARTIFACT_PRUNE_ARTIFACT_DIR_LIMIT=${RTC_DISK_MAINTENANCE_ARTIFACT_PRUNE_ARTIFACT_DIR_LIMIT:-${RTC_DISK_MAINTENANCE_ARTIFACT_DIR_LIMIT:-5000}}
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

docker_root_dir() {
	docker info --format '{{.DockerRootDir}}' 2>/dev/null || true
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

min_int() {
	local value=$1
	local limit=$2
	if [ "$value" -gt "$limit" ]; then
		echo "$limit"
	else
		echo "$value"
	fi
}

max_int() {
	local value=$1
	local limit=$2
	if [ "$value" -lt "$limit" ]; then
		echo "$limit"
	else
		echo "$value"
	fi
}

pressure_tier() {
	local data_free root_free data_inode_used root_inode_used
	data_free=$(free_gib "$DATA_VOLUME")
	root_free=$(free_gib "$ROOT_VOLUME")
	data_inode_used=$(inode_used_percent "$DATA_VOLUME")
	root_inode_used=$(inode_used_percent "$ROOT_VOLUME")
	if awk -v data="$data_free" -v root="$root_free" \
		-v data_limit="$DATA_EMERGENCY_FREE_GIB" -v root_limit="$ROOT_EMERGENCY_FREE_GIB" \
		-v data_inode="$data_inode_used" -v root_inode="$root_inode_used" \
		-v data_inode_limit="$DATA_EMERGENCY_INODE_USED_PERCENT" \
		-v root_inode_limit="$ROOT_EMERGENCY_INODE_USED_PERCENT" '
		BEGIN {
			exit !(data + 0 < data_limit ||
				root + 0 < root_limit ||
				data_inode + 0 >= data_inode_limit ||
				root_inode + 0 >= root_inode_limit);
		}
	'; then
		echo emergency
		return 0
	fi
	if awk -v data="$data_free" -v limit="$DATA_HIGH_PRESSURE_FREE_GIB" '
		BEGIN {
			exit !(data + 0 < limit);
		}
	'; then
		echo high
		return 0
	fi
	if under_pressure; then
		echo pressure
	else
		echo normal
	fi
}

path_is_live() {
	local path=$1
	local pid cwd env
	if pgrep -af -- "$path" >/dev/null 2>&1; then
		return 0
	fi
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
		env=$(cat "/proc/$pid/environ" 2>/dev/null | tr '\0' '\n' || true)
		case "$env" in
			*"RTC_FUZZ_SUPERVISOR_OUTPUT_DIR=$path"*|*"RTC_FUZZ_NOVELTY_OUTPUT_DIR=$path"*|*"RTC_FUZZ_OUTPUT_DIR=$path"*)
				return 0
				;;
		esac
	done < <(pgrep -f 'rtc-browser-fuzz|collaboration-fuzz|wp-scripts test-playwright|@playwright/test|wp-env' || true)
	return 1
}

benchmark_canary_run_requires_retention() {
	local path=$1
	local status="$path/benchmark-canary-coverage-status.tsv"
	[ -f "$status" ] || return 1
	if path_older_than_minutes "$path" "$BENCHMARK_CANARY_COVERAGE_RUN_RETENTION_MINUTES"; then
		return 1
	fi
	awk -F '\t' '
		NR == 1 {
			for (i = 1; i <= NF; i++) {
				h[$i] = i;
			}
			next;
		}
		{
			promotion_blocked = h["promotion_blocked"] ? $(h["promotion_blocked"]) : "";
			exact_stack_blocked = h["exact_stack_blocked"] ? $(h["exact_stack_blocked"]) : "";
			retained_product_evidence = h["retained_product_evidence"] ? $(h["retained_product_evidence"]) : "";
			product_evidence_records = h["product_evidence_records"] ? $(h["product_evidence_records"]) + 0 : 0;
			if ((promotion_blocked == "yes" && exact_stack_blocked == "yes") ||
				retained_product_evidence == "yes" ||
				product_evidence_records > 0) {
				found = 1;
				exit;
			}
		}
		END {
			exit found ? 0 : 1;
		}
	' "$status" 2>/dev/null
}

remove_path() {
	local path=$1
	[ -e "$path" ] || return 0
	log "remove path=$path"
	if sudo -n true >/dev/null 2>&1; then
		if sudo ionice -c3 nice -n 19 rm -rf --one-file-system -- "$path" >> "$LOG" 2>&1; then
			return 0
		fi
	fi
	if ionice -c3 nice -n 19 rm -rf --one-file-system -- "$path" >> "$LOG" 2>&1; then
		return 0
	fi
	chmod -R u+rwX "$path" >/dev/null 2>> "$LOG" || true
	ionice -c3 nice -n 19 rm -rf --one-file-system -- "$path" >> "$LOG" 2>&1 ||
		sudo ionice -c3 nice -n 19 rm -rf --one-file-system -- "$path" >> "$LOG" 2>&1 ||
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

	while IFS= read -r -d '' path; do
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
		if benchmark_canary_run_requires_retention "$path"; then
			log "skip benchmark-canary retained stale root path=$path"
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

	while IFS= read -r -d '' path; do
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
		if benchmark_canary_run_requires_retention "$path"; then
			log "skip benchmark-canary retained heavy-dir prune path=$path"
			continue
		fi
		if ! path_older_than_minutes "$path" "$RUN_ROOT_HEAVY_DIR_RETENTION_MINUTES"; then
			continue
		fi
		for child in "$path/wp-env" "$path/repos" "$path/external-imports" "$path/playwright-report" "$path/blob-report"; do
			[ -e "$child" ] || continue
			remove_path "$child"
		done
	done < <(ls -td $glob 2>/dev/null || true)
}

prune_browser_payloads_under_path() {
	local path=$1
	local retention_minutes=$2
	local candidates file_count dir_count

	[ -d "$path" ] || return 0

	candidates=$(mktemp "$BASE/browser-payload-files.XXXXXX")
	find "$path" -xdev -type f \
		\( -name trace.zip -o -name '*.trace.zip' -o -name '*.trace' -o -name '*.webm' -o -name video.zip \) \
		-mmin +"$retention_minutes" \
		-print0 2>/dev/null > "$candidates"
	file_count=$(tr '\0' '\n' < "$candidates" | awk 'END { print NR + 0 }')
	xargs -0 -r ionice -c3 nice -n 19 rm -f -- < "$candidates" >> "$LOG" 2>&1 ||
		log "prune_browser_payloads_under_path file prune partial failure path=$path candidates=$candidates"
	rm -f "$candidates"

	candidates=$(mktemp "$BASE/browser-payload-dirs.XXXXXX")
	find "$path" -xdev -type d \
		\( -name '.playwright-artifacts-*' -o -name 'playwright-artifacts-*' -o -name playwright-report -o -name blob-report \) \
		-mmin +"$retention_minutes" \
		-prune -print0 2>/dev/null > "$candidates"
	dir_count=$(tr '\0' '\n' < "$candidates" | awk 'END { print NR + 0 }')
	xargs -0 -r ionice -c3 nice -n 19 rm -rf -- < "$candidates" >> "$LOG" 2>&1 ||
		log "prune_browser_payloads_under_path dir prune partial failure path=$path candidates=$candidates"
	rm -f "$candidates"

	log "prune_browser_payloads_under_path path=$path files=$file_count dirs=$dir_count retention_minutes=$retention_minutes"
}

prune_stale_run_root_browser_payloads() {
	local base=$1
	local glob=$2
	local pointer=${3:-}
	local current=""
	local count=0
	local path

	[ -d "$base" ] || return 0
	if [ -n "$pointer" ] && [ -f "$pointer" ]; then
		current=$(sed -n '1p' "$pointer" 2>/dev/null || true)
	fi

	while IFS= read -r -d '' path; do
		[ -n "$path" ] || continue
		count=$(( count + 1 ))
		if [ "$count" -le "$RUN_ROOT_BROWSER_PAYLOAD_KEEP" ]; then
			continue
		fi
		if [ -n "$current" ] && [ "$path" = "$current" ]; then
			continue
		fi
		if path_is_live "$path"; then
			log "skip live browser-payload prune path=$path"
			continue
		fi
		if benchmark_canary_run_requires_retention "$path"; then
			log "skip benchmark-canary retained browser-payload prune path=$path"
			continue
		fi
		if ! path_older_than_minutes "$path" "$RUN_ROOT_BROWSER_PAYLOAD_RETENTION_MINUTES"; then
			continue
		fi
		prune_browser_payloads_under_path "$path" "$RUN_ROOT_BROWSER_PAYLOAD_RETENTION_MINUTES"
	done < <(ls -td $glob 2>/dev/null || true)
}

prune_seed_payloads_under_path() {
	local path=$1
	local retention_minutes=$2
	local candidates count

	[ -d "$path" ] || return 0

	candidates=$(mktemp "$BASE/seed-payload-dirs.XXXXXX")
	find "$path" -xdev -type d -name 'seed-*' -path '*/lane-*/*' \
		-mmin +"$retention_minutes" \
		-prune -print0 2>/dev/null > "$candidates"
	count=$(tr '\0' '\n' < "$candidates" | awk 'END { print NR + 0 }')
	xargs -0 -r ionice -c3 nice -n 19 rm -rf -- < "$candidates" >> "$LOG" 2>&1 ||
		log "prune_seed_payloads_under_path partial failure path=$path candidates=$candidates"
	rm -f "$candidates"

	log "prune_seed_payloads_under_path path=$path dirs=$count retention_minutes=$retention_minutes"
}

prune_stale_run_root_seed_payloads() {
	local base=$1
	local glob=$2
	local pointer=${3:-}
	local current=""
	local count=0
	local path

	[ -d "$base" ] || return 0
	if [ -n "$pointer" ] && [ -f "$pointer" ]; then
		current=$(sed -n '1p' "$pointer" 2>/dev/null || true)
	fi

	while IFS= read -r -d '' path; do
		[ -n "$path" ] || continue
		count=$(( count + 1 ))
		if [ "$count" -le "$RUN_ROOT_SEED_PAYLOAD_KEEP" ]; then
			continue
		fi
		if [ -n "$current" ] && [ "$path" = "$current" ]; then
			continue
		fi
		if path_is_live "$path"; then
			log "skip live seed-payload prune path=$path"
			continue
		fi
		if benchmark_canary_run_requires_retention "$path"; then
			log "skip benchmark-canary retained seed-payload prune path=$path"
			continue
		fi
		if ! path_older_than_minutes "$path" "$RUN_ROOT_SEED_PAYLOAD_RETENTION_MINUTES"; then
			continue
		fi
		prune_seed_payloads_under_path "$path" "$RUN_ROOT_SEED_PAYLOAD_RETENTION_MINUTES"
	done < <(ls -td $glob 2>/dev/null || true)
}

prune_stale_coverage_run_payloads() {
	local base="$DATA_VOLUME/rtc-coverage-guided-20260515"
	local pointer="$base/current-output-dir.txt"
	local current="" path count=0 payload
	[ -d "$base" ] || return 0
	if [ -f "$pointer" ]; then
		current=$(sed -n '1p' "$pointer" 2>/dev/null || true)
	fi
	while IFS= read -r -d '' path; do
		[ -n "$path" ] || continue
		count=$(( count + 1 ))
		if [ "$count" -le "$COVERAGE_RUN_PAYLOAD_KEEP" ]; then
			continue
		fi
		if [ -n "$current" ] && [ "$path" = "$current" ]; then
			continue
		fi
		if path_is_live "$path"; then
			log "skip live stale coverage payload path=$path"
			continue
		fi
		if benchmark_canary_run_requires_retention "$path"; then
			log "skip benchmark-canary retained coverage payload path=$path"
			continue
		fi
		if ! path_older_than_minutes "$path" "$COVERAGE_RUN_PAYLOAD_RETENTION_MINUTES"; then
			continue
		fi
		for payload in "$path"/repos "$path"/wp-env "$path"/external-imports; do
			[ -e "$payload" ] || continue
			remove_path "$payload"
		done
		while IFS= read -r -d '' payload; do
			if path_is_live "$payload"; then
				log "skip live nested external-imports path=$payload"
				continue
			fi
			remove_path "$payload"
		done < <(find "$path" -xdev -type d -name external-imports -print0 2>/dev/null)
		while IFS= read -r -d '' payload; do
			remove_file_if_old "$payload" "$COVERAGE_RUN_PAYLOAD_RETENTION_MINUTES"
		done < <(
			find "$path" -xdev -type f \
				\( -name trace.zip -o -name '*.trace.zip' -o -name '*.trace' -o -name '*.webm' -o -name video.zip \) \
				-print0 2>/dev/null
		)
	done < <(
		find "$base" -mindepth 1 -maxdepth 1 -type d -name 'run-*' -printf '%T@ %p\0' 2>/dev/null |
			sort -z -nr |
			sed -z 's/^[^ ]* //'
	)
}

prune_orphan_current_coverage_tmp_repos() {
	local current tmp
	current=$(sed -n '1p' "$DATA_VOLUME/rtc-coverage-guided-20260515/current-output-dir.txt" 2>/dev/null || true)
	[ -n "$current" ] || return 0
	[ -d "$current/repos" ] || return 0

	for tmp in "$current"/repos/*.tmp-*; do
		[ -d "$tmp" ] || continue
		if ! path_older_than_minutes "$tmp" "$CURRENT_ROOT_TMP_REPO_RETENTION_MINUTES"; then
			continue
		fi
		if path_is_live "$tmp"; then
			log "skip live current coverage tmp repo path=$tmp"
			continue
		fi
		log "remove orphan current coverage tmp repo path=$tmp"
		remove_path "$tmp"
	done
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


free_below_cleanup_target() {
	local tier=${1:-$(pressure_tier)} target
	case "$tier" in
		emergency|high)
			target=$DATA_EMERGENCY_TARGET_FREE_GIB
			;;
		*)
			target=$DATA_TARGET_FREE_GIB
			;;
	esac
	awk -v free="$(free_gib "$DATA_VOLUME")" -v target="$target" 'BEGIN { exit !(free + 0 < target + 0) }'
}

prune_current_coverage_inactive_repos() {
	local current repos repo count=0
	current=$(sed -n '1p' "$DATA_VOLUME/rtc-coverage-guided-20260515/current-output-dir.txt" 2>/dev/null || true)
	[ -n "$current" ] || return 0
	repos="$current/repos"
	[ -d "$repos" ] || return 0
	for repo in "$repos"/*; do
		[ -d "$repo" ] || continue
		case "$(basename "$repo")" in
			*.tmp-*)
				continue
				;;
		esac
		if [ "$count" -ge "$CURRENT_ROOT_REPO_MAX_DELETE_PER_PASS" ]; then
			log "current coverage repo prune limit reached max=$CURRENT_ROOT_REPO_MAX_DELETE_PER_PASS"
			return 0
		fi
		if ! path_older_than_minutes "$repo" "$CURRENT_ROOT_REPO_RETENTION_MINUTES"; then
			continue
		fi
		if path_is_live "$repo"; then
			log "skip live current coverage repo path=$repo"
			continue
		fi
		log "remove inactive current coverage repo path=$repo"
		remove_path "$repo"
		count=$(( count + 1 ))
	done
}

prune_benchmark_feedback_heavy_dirs() {
	local cycles="$DATA_VOLUME/rtc-benchmark-canary-feedback-20260520/cycles"
	local keep=$1 retention=$2 path child count=0
	[ -d "$cycles" ] || return 0
	while IFS= read -r -d '' path; do
		[ -n "$path" ] || continue
		count=$(( count + 1 ))
		if [ "$count" -le "$keep" ]; then
			continue
		fi
		if path_is_live "$path"; then
			log "skip live benchmark cycle prune path=$path"
			continue
		fi
		if ! path_older_than_minutes "$path" "$retention"; then
			continue
		fi
		for child in \
			"$path/wp-env" \
			"$path/worktree" \
			"$path/worktree/node_modules" \
			"$path/worktree/.git" \
			"$path/worktree/.cache" \
			"$path/worktree/build" \
			"$path/artifacts/test-results" \
			"$path/playwright-report" \
			"$path/blob-report"; do
			[ -e "$child" ] || continue
			remove_path "$child"
		done
	done < <(
		find "$cycles" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\0' 2>/dev/null |
			sort -z -nr |
			sed -z 's/^[^ ]* //'
	)
}

prune_pr_finalization_worktrees() {
	local worktrees="$DATA_VOLUME/rtc-pr-finalization-20260516/worktrees"
	local keep=$1 retention=$2 path count=0
	[ -d "$worktrees" ] || return 0
	while IFS= read -r -d '' path; do
		[ -n "$path" ] || continue
		count=$(( count + 1 ))
		if [ "$count" -le "$keep" ]; then
			continue
		fi
		if path_is_live "$path"; then
			log "skip live pr finalization worktree path=$path"
			continue
		fi
		if ! path_older_than_minutes "$path" "$retention"; then
			continue
		fi
		remove_path "$path"
	done < <(
		find "$worktrees" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\0' 2>/dev/null |
			sort -z -nr |
			sed -z 's/^[^ ]* //'
	)
}

prune_pr_finalization_validation_checkouts() {
	local cycles="$DATA_VOLUME/rtc-pr-finalization-20260516/cycles"
	local checkout
	[ -d "$cycles" ] || return 0
	while IFS= read -r -d '' checkout; do
		if path_is_live "$checkout"; then
			log "skip live pr finalization validation checkout path=$checkout"
			continue
		fi
		if ! path_older_than_minutes "$checkout" "$PR_FINALIZATION_VALIDATION_RETENTION_MINUTES"; then
			continue
		fi
		remove_path "$checkout"
	done < <(find "$cycles" -mindepth 2 -maxdepth 2 -type d -name 'validation-*' -print0 2>/dev/null)
}

prune_stale_wp_env_dirs() {
	local env_root path count=0
	env_root=$(readlink -f /home/exouser/wp-env 2>/dev/null || true)
	[ -n "$env_root" ] || return 0
	[ -d "$env_root" ] || return 0
	case "$env_root" in
		"$DATA_VOLUME"/*)
			;;
		*)
			log "skip stale wp-env prune; env root outside data volume path=$env_root"
			return 0
			;;
	esac
	while IFS= read -r -d '' path; do
		if [ "$count" -ge "$STALE_WP_ENV_MAX_DELETE_PER_PASS" ]; then
			log "stale wp-env prune limit reached max=$STALE_WP_ENV_MAX_DELETE_PER_PASS"
			return 0
		fi
		if path_is_live "$path"; then
			log "skip live stale wp-env path=$path"
			continue
		fi
		remove_path "$path"
		count=$(( count + 1 ))
	done < <(
		find "$env_root" -mindepth 1 -maxdepth 1 -type d -name 'wp-env-*' -mmin +"$STALE_WP_ENV_RETENTION_MINUTES" -print0 2>/dev/null
	)
	log "prune_stale_wp_env_dirs deleted=$count retention_minutes=$STALE_WP_ENV_RETENTION_MINUTES max=$STALE_WP_ENV_MAX_DELETE_PER_PASS root=$env_root"
}

prune_fuzz_repo_batches_for_root() {
	local root=$1 keep=$2 retention=$3 path pack_file count=0
	[ -d "$root" ] || return 0
	while IFS= read -r -d '' path; do
		[ -n "$path" ] || continue
		count=$(( count + 1 ))
		if [ "$count" -le "$keep" ]; then
			continue
		fi
		if path_is_live "$path"; then
			log "skip live fuzz repo batch path=$path"
			continue
		fi
		if ! path_older_than_minutes "$path" "$retention"; then
			continue
		fi
		for pack_file in \
			"$path"/*/.git/objects/pack/*.pack \
			"$path"/*/.git/objects/pack/*.idx \
			"$path"/*/.git/objects/pack/*.rev; do
			[ -f "$pack_file" ] || continue
			rm -f -- "$pack_file" 2>> "$LOG" || true
		done
		remove_path "$path"
	done < <(
		find "$root" -mindepth 1 -maxdepth 1 -type d -name 'repos-*' -printf '%T@ %p\0' 2>/dev/null |
			sort -z -nr |
			sed -z 's/^[^ ]* //'
	)
}

prune_fuzz_repo_batches() {
	prune_fuzz_repo_batches_for_root "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515" "$FUZZ_REPO_BATCH_KEEP" "$FUZZ_REPO_BATCH_RETENTION_MINUTES"
	prune_fuzz_repo_batches_for_root "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515" "$FUZZ_REPO_BATCH_KEEP" "$FUZZ_REPO_BATCH_RETENTION_MINUTES"
	prune_fuzz_repo_batches_for_root "$DATA_VOLUME/rtc-gap-booster-20260515" "$FUZZ_REPO_BATCH_KEEP" "$FUZZ_REPO_BATCH_RETENTION_MINUTES"
}

prune_fuzz_wp_env_batches_for_root() {
	local root=$1 keep=$2 retention=$3 env_root path count=0
	env_root="$root/wp-env"
	[ -d "$env_root" ] || return 0
	while IFS= read -r -d '' path; do
		[ -n "$path" ] || continue
		count=$(( count + 1 ))
		if [ "$count" -le "$keep" ]; then
			continue
		fi
		if path_is_live "$path"; then
			log "skip live fuzz wp-env batch path=$path"
			continue
		fi
		if ! path_older_than_minutes "$path" "$retention"; then
			continue
		fi
		remove_path "$path"
	done < <(
		find "$env_root" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\0' 2>/dev/null |
			sort -z -nr |
			sed -z 's/^[^ ]* //'
	)
}

prune_fuzz_wp_env_batches() {
	prune_fuzz_wp_env_batches_for_root "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515" "$FUZZ_WP_ENV_BATCH_KEEP" "$FUZZ_WP_ENV_BATCH_RETENTION_MINUTES"
	prune_fuzz_wp_env_batches_for_root "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515" "$FUZZ_WP_ENV_BATCH_KEEP" "$FUZZ_WP_ENV_BATCH_RETENTION_MINUTES"
	prune_fuzz_wp_env_batches_for_root "$DATA_VOLUME/rtc-gap-booster-20260515" "$FUZZ_WP_ENV_BATCH_KEEP" "$FUZZ_WP_ENV_BATCH_RETENTION_MINUTES"
}

prune_repo_artifact_child_root() {
	local root=$1 keep=$2 retention=$3 path count=0
	[ -d "$root" ] || return 0
	if path_is_live "$root"; then
		log "skip live repo artifact child root=$root"
		return 0
	fi
	while IFS= read -r -d '' path; do
		[ -n "$path" ] || continue
		count=$(( count + 1 ))
		if [ "$count" -le "$keep" ]; then
			continue
		fi
		if ! path_older_than_minutes "$path" "$retention"; then
			continue
		fi
		remove_path "$path"
	done < <(
		find "$root" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\0' 2>/dev/null |
			sort -z -nr |
			sed -z 's/^[^ ]* //'
	)
}

prune_repo_artifact_payloads() {
	local artifact_root="$DATA_VOLUME/rtc-fuzz-validation-20260515/repo/artifacts"
	local path
	[ -d "$artifact_root" ] || return 0

	if [ -d "$artifact_root/rtc-browser-fuzz" ] && ! path_is_live "$artifact_root/rtc-browser-fuzz"; then
		while IFS= read -r -d '' path; do
			remove_file_if_old "$path" "$REPO_BROWSER_ARTIFACT_PAYLOAD_RETENTION_MINUTES"
		done < <(
			find "$artifact_root/rtc-browser-fuzz" -xdev -type f \
				\( -name trace.zip -o -name '*.trace.zip' -o -name '*.trace' -o -name '*.webm' -o -name video.zip \) \
				-print0 2>/dev/null
		)
	fi

	prune_repo_artifact_child_root "$artifact_root/.rtc-protocol-server-fuzz-php" "$REPO_ARTIFACT_CHILD_KEEP" "$REPO_ARTIFACT_CHILD_RETENTION_MINUTES"
	prune_repo_artifact_child_root "$artifact_root/.rtc-protocol-server-fuzz-preflight" "$REPO_ARTIFACT_CHILD_KEEP" "$REPO_ARTIFACT_CHILD_RETENTION_MINUTES"
	prune_repo_artifact_child_root "$artifact_root/.rtc-backend-api-fuzz" "$REPO_ARTIFACT_CHILD_KEEP" "$REPO_ARTIFACT_CHILD_RETENTION_MINUTES"
	prune_repo_artifact_child_root "$artifact_root/.rtc-backend-api-fuzz-preflight" "$REPO_ARTIFACT_CHILD_KEEP" "$REPO_ARTIFACT_CHILD_RETENTION_MINUTES"
}

prune_stale_data_tmp() {
	local tmp_root="$DATA_VOLUME/tmp"
	local path count=0
	[ -d "$tmp_root" ] || return 0
	while IFS= read -r -d '' path; do
		if path_is_live "$path"; then
			log "skip live data tmp path=$path"
			continue
		fi
		remove_path "$path"
		count=$(( count + 1 ))
	done < <(find "$tmp_root" -mindepth 1 -maxdepth 1 -mmin +"$DATA_TMP_RETENTION_MINUTES" -print0 2>/dev/null)
	log "prune_stale_data_tmp deleted=$count retention_minutes=$DATA_TMP_RETENTION_MINUTES root=$tmp_root"
}

prune_stale_root_archive() {
	local archive="$DATA_VOLUME/stale-root-archive/wp-gym-continuous-runs-20260514-20260517T213328Z"
	[ -d "$archive" ] || return 0
	if path_is_live "$archive"; then
		log "skip live stale root archive path=$archive"
		return 0
	fi
	if ! path_older_than_minutes "$archive" "$STALE_ROOT_ARCHIVE_RETENTION_MINUTES"; then
		return 0
	fi
	remove_path "$archive"
}

prune_maintainer_tested_scratch() {
	local root="$DATA_VOLUME/rtc-maintainer-tested-set-20260519"
	local parent path
	[ -d "$root" ] || return 0
	for parent in "$root/worktrees" "$root/wp-env-home"; do
		[ -d "$parent" ] || continue
		while IFS= read -r -d '' path; do
			if path_is_live "$path"; then
				log "skip live maintainer-tested scratch path=$path"
				continue
			fi
			if ! path_older_than_minutes "$path" "$MAINTAINER_TESTED_SCRATCH_RETENTION_MINUTES"; then
				continue
			fi
			remove_path "$path"
		done < <(find "$parent" -mindepth 1 -maxdepth 1 -type d -print0 2>/dev/null)
	done
}

prune_docker_wp_env_if_due() {
	local tier=$1 now last until_hours
	command -v docker >/dev/null 2>&1 || return 0
	if [ "$(docker_root_dir)" != "$DATA_VOLUME/docker-data-root" ]; then
		log "skip docker prune; docker root mismatch actual=$(docker_root_dir) expected=$DATA_VOLUME/docker-data-root"
		return 0
	fi
	case "$tier" in
		emergency)
			until_hours=$DOCKER_PRUNE_UNTIL_EMERGENCY_HOURS
			;;
		high)
			until_hours=$DOCKER_PRUNE_UNTIL_HIGH_HOURS
			;;
		pressure)
			until_hours=$DOCKER_PRUNE_UNTIL_PRESSURE_HOURS
			;;
		*)
			until_hours=$DOCKER_PRUNE_UNTIL_NORMAL_HOURS
			;;
	esac
	now=$(date +%s)
	last=$(cat "$BASE/docker-prune-last-epoch" 2>/dev/null || echo 0)
	if [ $(( now - last )) -lt "$DOCKER_PRUNE_MIN_INTERVAL_SECONDS" ]; then
		return 0
	fi
	echo "$now" > "$BASE/docker-prune-last-epoch"
	log "docker prune start tier=$tier until=${until_hours}h"
	timeout --kill-after=30s "$DOCKER_PRUNE_TIMEOUT_SECONDS" docker container prune --force --filter "until=${until_hours}h" >> "$LOG" 2>&1 || log "docker container prune incomplete tier=$tier"
	timeout --kill-after=30s "$DOCKER_PRUNE_TIMEOUT_SECONDS" docker image prune --all --force --filter "until=${until_hours}h" >> "$LOG" 2>&1 || log "docker image prune incomplete tier=$tier"
	log "docker prune done tier=$tier until=${until_hours}h"
}

run_space_target_extra_passes() {
	local tier=$1 keep=$2 pass=0
	while free_below_cleanup_target "$tier" && [ "$pass" -lt "$TARGET_CLEANUP_MAX_EXTRA_PASSES" ]; do
		pass=$(( pass + 1 ))
		log "space target extra cleanup pass=$pass tier=$tier data_free_gib=$(free_gib "$DATA_VOLUME")"
		RUN_ROOT_HEAVY_DIR_KEEP=$(min_int "$RUN_ROOT_HEAVY_DIR_KEEP" 1)
		RUN_ROOT_HEAVY_DIR_RETENTION_MINUTES=$(min_int "$RUN_ROOT_HEAVY_DIR_RETENTION_MINUTES" 15)
		TRACE_RETENTION_MINUTES=$(min_int "$TRACE_RETENTION_MINUTES" 60)
		VIDEO_RETENTION_MINUTES=$(min_int "$VIDEO_RETENTION_MINUTES" 30)
		TMP_RETENTION_MINUTES=$(min_int "$TMP_RETENTION_MINUTES" 30)
		DATA_TMP_RETENTION_MINUTES=$(min_int "$DATA_TMP_RETENTION_MINUTES" 720)
		CURRENT_ROOT_REPO_RETENTION_MINUTES=$(min_int "$CURRENT_ROOT_REPO_RETENTION_MINUTES" 30)
		COVERAGE_RUN_PAYLOAD_RETENTION_MINUTES=$(min_int "$COVERAGE_RUN_PAYLOAD_RETENTION_MINUTES" 30)
		COVERAGE_RUN_PAYLOAD_KEEP=$(min_int "$COVERAGE_RUN_PAYLOAD_KEEP" 1)
		BENCHMARK_CYCLE_RETENTION_MINUTES=$(min_int "$BENCHMARK_CYCLE_RETENTION_MINUTES" 60)
		PR_FINALIZATION_WORKTREE_RETENTION_MINUTES=$(min_int "$PR_FINALIZATION_WORKTREE_RETENTION_MINUTES" 60)
		PR_FINALIZATION_VALIDATION_RETENTION_MINUTES=$(min_int "$PR_FINALIZATION_VALIDATION_RETENTION_MINUTES" 60)
		STALE_WP_ENV_RETENTION_MINUTES=$(min_int "$STALE_WP_ENV_RETENTION_MINUTES" 720)
		FUZZ_REPO_BATCH_RETENTION_MINUTES=$(min_int "$FUZZ_REPO_BATCH_RETENTION_MINUTES" 60)
		MAINTAINER_TESTED_SCRATCH_RETENTION_MINUTES=$(min_int "$MAINTAINER_TESTED_SCRATCH_RETENTION_MINUTES" 720)
		REPO_ARTIFACT_CHILD_KEEP=$(min_int "$REPO_ARTIFACT_CHILD_KEEP" 10)
		REPO_ARTIFACT_CHILD_RETENTION_MINUTES=$(min_int "$REPO_ARTIFACT_CHILD_RETENTION_MINUTES" 120)
		REPO_BROWSER_ARTIFACT_PAYLOAD_RETENTION_MINUTES=$(min_int "$REPO_BROWSER_ARTIFACT_PAYLOAD_RETENTION_MINUTES" 720)
		ARTIFACT_PRUNE_SUMMARY_LIMIT=$(max_int "$ARTIFACT_PRUNE_SUMMARY_LIMIT" 1200)
		ARTIFACT_PRUNE_ARTIFACT_DIR_LIMIT=$(max_int "$ARTIFACT_PRUNE_ARTIFACT_DIR_LIMIT" 80000)
		prune_stale_coverage_run_payloads
		prune_repo_artifact_payloads
		prune_current_coverage_inactive_repos
		prune_benchmark_feedback_heavy_dirs 3 "$BENCHMARK_CYCLE_RETENTION_MINUTES"
		prune_pr_finalization_worktrees 8 "$PR_FINALIZATION_WORKTREE_RETENTION_MINUTES"
		prune_pr_finalization_validation_checkouts
		prune_stale_wp_env_dirs
		prune_fuzz_repo_batches
		prune_maintainer_tested_scratch
		prune_stale_data_tmp
		prune_stale_root_archive
		prune_stale_run_root_heavy_dirs "$DATA_VOLUME/rtc-coverage-guided-20260515" "$DATA_VOLUME/rtc-coverage-guided-20260515/run-*" "$DATA_VOLUME/rtc-coverage-guided-20260515/current-output-dir.txt"
		prune_stale_run_root_heavy_dirs "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/runs" "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/runs/strict-expansion-*" "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/current-run-root.txt"
		prune_stale_run_root_heavy_dirs "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/runs" "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/runs/focused-shards-*" "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/current-run-root.txt"
		prune_stale_run_root_heavy_dirs "$DATA_VOLUME/rtc-gap-booster-20260515/runs" "$DATA_VOLUME/rtc-gap-booster-20260515/runs/gap-booster-*" "$DATA_VOLUME/rtc-gap-booster-20260515/current-run-root.txt"
	done
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
	local tier=${3:-$(pressure_tier)}
	{
		echo "# RTC Disk Maintenance Status"
		echo
		echo "- updated: $(stamp)"
		echo "- state: $state"
		echo "- pressure_tier: $tier"
		echo "- data_free_gib: $(free_gib "$DATA_VOLUME")"
		echo "- root_free_gib: $(free_gib "$ROOT_VOLUME")"
		echo "- data_inode_used_percent: $(inode_used_percent "$DATA_VOLUME")"
		echo "- root_inode_used_percent: $(inode_used_percent "$ROOT_VOLUME")"
		echo "- data_pressure_free_gib: $DATA_PRESSURE_FREE_GIB"
		echo "- data_high_pressure_free_gib: $DATA_HIGH_PRESSURE_FREE_GIB"
		echo "- data_emergency_free_gib: $DATA_EMERGENCY_FREE_GIB"
		echo "- data_target_free_gib: $DATA_TARGET_FREE_GIB"
		echo "- data_emergency_target_free_gib: $DATA_EMERGENCY_TARGET_FREE_GIB"
		echo "- root_pressure_free_gib: $ROOT_PRESSURE_FREE_GIB"
		echo "- root_emergency_free_gib: $ROOT_EMERGENCY_FREE_GIB"
		echo "- data_inode_pressure_used_percent: $DATA_INODE_PRESSURE_USED_PERCENT"
		echo "- data_emergency_inode_used_percent: $DATA_EMERGENCY_INODE_USED_PERCENT"
		echo "- root_inode_pressure_used_percent: $ROOT_INODE_PRESSURE_USED_PERCENT"
		echo "- root_emergency_inode_used_percent: $ROOT_EMERGENCY_INODE_USED_PERCENT"
		echo "- run_root_keep_effective: $keep"
		echo "- run_root_keep_default: $RUN_ROOT_KEEP"
		echo "- run_root_keep_pressure: $RUN_ROOT_KEEP_PRESSURE"
		echo "- heavy_dir_keep: $RUN_ROOT_HEAVY_DIR_KEEP"
		echo "- heavy_dir_retention_minutes: $RUN_ROOT_HEAVY_DIR_RETENTION_MINUTES"
		echo "- run_root_browser_payload_keep: $RUN_ROOT_BROWSER_PAYLOAD_KEEP"
		echo "- run_root_browser_payload_retention_minutes: $RUN_ROOT_BROWSER_PAYLOAD_RETENTION_MINUTES"
		echo "- run_root_seed_payload_keep: $RUN_ROOT_SEED_PAYLOAD_KEEP"
		echo "- run_root_seed_payload_retention_minutes: $RUN_ROOT_SEED_PAYLOAD_RETENTION_MINUTES"
		echo "- trace_retention_minutes: $TRACE_RETENTION_MINUTES"
		echo "- video_retention_minutes: $VIDEO_RETENTION_MINUTES"
		echo "- tmp_retention_minutes: $TMP_RETENTION_MINUTES"
		echo "- data_tmp_retention_minutes: $DATA_TMP_RETENTION_MINUTES"
		echo "- current_root_tmp_repo_retention_minutes: $CURRENT_ROOT_TMP_REPO_RETENTION_MINUTES"
		echo "- current_root_repo_retention_minutes: $CURRENT_ROOT_REPO_RETENTION_MINUTES"
		echo "- current_root_repo_max_delete_per_pass: $CURRENT_ROOT_REPO_MAX_DELETE_PER_PASS"
		echo "- coverage_run_payload_retention_minutes: $COVERAGE_RUN_PAYLOAD_RETENTION_MINUTES"
		echo "- coverage_run_payload_keep: $COVERAGE_RUN_PAYLOAD_KEEP"
		echo "- benchmark_canary_coverage_run_retention_minutes: $BENCHMARK_CANARY_COVERAGE_RUN_RETENTION_MINUTES"
		echo "- benchmark_cycle_keep: $BENCHMARK_CYCLE_KEEP"
		echo "- benchmark_cycle_retention_minutes: $BENCHMARK_CYCLE_RETENTION_MINUTES"
		echo "- pr_finalization_worktree_keep: $PR_FINALIZATION_WORKTREE_KEEP"
		echo "- pr_finalization_worktree_retention_minutes: $PR_FINALIZATION_WORKTREE_RETENTION_MINUTES"
		echo "- pr_finalization_validation_retention_minutes: $PR_FINALIZATION_VALIDATION_RETENTION_MINUTES"
		echo "- stale_wp_env_retention_minutes: $STALE_WP_ENV_RETENTION_MINUTES"
		echo "- stale_wp_env_max_delete_per_pass: $STALE_WP_ENV_MAX_DELETE_PER_PASS"
		echo "- fuzz_repo_batch_keep: $FUZZ_REPO_BATCH_KEEP"
		echo "- fuzz_repo_batch_retention_minutes: $FUZZ_REPO_BATCH_RETENTION_MINUTES"
		echo "- fuzz_wp_env_batch_keep: $FUZZ_WP_ENV_BATCH_KEEP"
		echo "- fuzz_wp_env_batch_retention_minutes: $FUZZ_WP_ENV_BATCH_RETENTION_MINUTES"
		echo "- maintainer_tested_scratch_retention_minutes: $MAINTAINER_TESTED_SCRATCH_RETENTION_MINUTES"
		echo "- repo_artifact_child_keep: $REPO_ARTIFACT_CHILD_KEEP"
		echo "- repo_artifact_child_retention_minutes: $REPO_ARTIFACT_CHILD_RETENTION_MINUTES"
		echo "- repo_browser_artifact_payload_retention_minutes: $REPO_BROWSER_ARTIFACT_PAYLOAD_RETENTION_MINUTES"
		echo "- stale_root_archive_retention_minutes: $STALE_ROOT_ARCHIVE_RETENTION_MINUTES"
		echo "- root_tmp_retention_minutes: $ROOT_TMP_RETENTION_MINUTES"
		echo "- root_tmp_max_delete_per_pass: $ROOT_TMP_MAX_DELETE_PER_PASS"
		echo "- artifact_prune_summary_limit: $ARTIFACT_PRUNE_SUMMARY_LIMIT"
		echo "- artifact_prune_artifact_dir_limit: $ARTIFACT_PRUNE_ARTIFACT_DIR_LIMIT"
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
	local keep tier
	local RUN_ROOT_HEAVY_DIR_KEEP=$RUN_ROOT_HEAVY_DIR_KEEP
	local RUN_ROOT_HEAVY_DIR_RETENTION_MINUTES=$RUN_ROOT_HEAVY_DIR_RETENTION_MINUTES
	local TRACE_RETENTION_MINUTES=$TRACE_RETENTION_MINUTES
	local VIDEO_RETENTION_MINUTES=$VIDEO_RETENTION_MINUTES
	local TMP_RETENTION_MINUTES=$TMP_RETENTION_MINUTES
	local DATA_TMP_RETENTION_MINUTES=$DATA_TMP_RETENTION_MINUTES
	local CURRENT_ROOT_TMP_REPO_RETENTION_MINUTES=$CURRENT_ROOT_TMP_REPO_RETENTION_MINUTES
	local CURRENT_ROOT_REPO_RETENTION_MINUTES=$CURRENT_ROOT_REPO_RETENTION_MINUTES
	local CURRENT_ROOT_REPO_MAX_DELETE_PER_PASS=$CURRENT_ROOT_REPO_MAX_DELETE_PER_PASS
	local COVERAGE_RUN_PAYLOAD_RETENTION_MINUTES=$COVERAGE_RUN_PAYLOAD_RETENTION_MINUTES
	local COVERAGE_RUN_PAYLOAD_KEEP=$COVERAGE_RUN_PAYLOAD_KEEP
	local BENCHMARK_CYCLE_KEEP=$BENCHMARK_CYCLE_KEEP
	local BENCHMARK_CYCLE_RETENTION_MINUTES=$BENCHMARK_CYCLE_RETENTION_MINUTES
	local PR_FINALIZATION_WORKTREE_KEEP=$PR_FINALIZATION_WORKTREE_KEEP
	local PR_FINALIZATION_WORKTREE_RETENTION_MINUTES=$PR_FINALIZATION_WORKTREE_RETENTION_MINUTES
	local PR_FINALIZATION_VALIDATION_RETENTION_MINUTES=$PR_FINALIZATION_VALIDATION_RETENTION_MINUTES
	local STALE_WP_ENV_RETENTION_MINUTES=$STALE_WP_ENV_RETENTION_MINUTES
	local STALE_WP_ENV_MAX_DELETE_PER_PASS=$STALE_WP_ENV_MAX_DELETE_PER_PASS
	local FUZZ_REPO_BATCH_KEEP=$FUZZ_REPO_BATCH_KEEP
	local FUZZ_REPO_BATCH_RETENTION_MINUTES=$FUZZ_REPO_BATCH_RETENTION_MINUTES
	local FUZZ_WP_ENV_BATCH_KEEP=$FUZZ_WP_ENV_BATCH_KEEP
	local FUZZ_WP_ENV_BATCH_RETENTION_MINUTES=$FUZZ_WP_ENV_BATCH_RETENTION_MINUTES
	local MAINTAINER_TESTED_SCRATCH_RETENTION_MINUTES=$MAINTAINER_TESTED_SCRATCH_RETENTION_MINUTES
	local REPO_ARTIFACT_CHILD_KEEP=$REPO_ARTIFACT_CHILD_KEEP
	local REPO_ARTIFACT_CHILD_RETENTION_MINUTES=$REPO_ARTIFACT_CHILD_RETENTION_MINUTES
	local REPO_BROWSER_ARTIFACT_PAYLOAD_RETENTION_MINUTES=$REPO_BROWSER_ARTIFACT_PAYLOAD_RETENTION_MINUTES
	local STALE_ROOT_ARCHIVE_RETENTION_MINUTES=$STALE_ROOT_ARCHIVE_RETENTION_MINUTES
	local ROOT_TMP_RETENTION_MINUTES=$ROOT_TMP_RETENTION_MINUTES
	local ROOT_TMP_MAX_DELETE_PER_PASS=$ROOT_TMP_MAX_DELETE_PER_PASS
	local ARTIFACT_PRUNE_SUMMARY_LIMIT=$ARTIFACT_PRUNE_SUMMARY_LIMIT
	local ARTIFACT_PRUNE_ARTIFACT_DIR_LIMIT=$ARTIFACT_PRUNE_ARTIFACT_DIR_LIMIT

	keep="$RUN_ROOT_KEEP"
	tier=$(pressure_tier)
	case "$tier" in
		emergency)
			keep=$(min_int "$RUN_ROOT_KEEP_PRESSURE" 6)
			RUN_ROOT_HEAVY_DIR_KEEP=$(min_int "$RUN_ROOT_HEAVY_DIR_KEEP" 2)
			RUN_ROOT_HEAVY_DIR_RETENTION_MINUTES=$(min_int "$RUN_ROOT_HEAVY_DIR_RETENTION_MINUTES" 30)
			TRACE_RETENTION_MINUTES=$(min_int "$TRACE_RETENTION_MINUTES" 120)
			VIDEO_RETENTION_MINUTES=$(min_int "$VIDEO_RETENTION_MINUTES" 60)
			TMP_RETENTION_MINUTES=$(min_int "$TMP_RETENTION_MINUTES" 45)
			DATA_TMP_RETENTION_MINUTES=$(min_int "$DATA_TMP_RETENTION_MINUTES" 720)
			CURRENT_ROOT_TMP_REPO_RETENTION_MINUTES=$(min_int "$CURRENT_ROOT_TMP_REPO_RETENTION_MINUTES" 10)
			CURRENT_ROOT_REPO_RETENTION_MINUTES=$(min_int "$CURRENT_ROOT_REPO_RETENTION_MINUTES" 60)
			CURRENT_ROOT_REPO_MAX_DELETE_PER_PASS=$(max_int "$CURRENT_ROOT_REPO_MAX_DELETE_PER_PASS" 8)
			COVERAGE_RUN_PAYLOAD_RETENTION_MINUTES=$(min_int "$COVERAGE_RUN_PAYLOAD_RETENTION_MINUTES" 30)
			COVERAGE_RUN_PAYLOAD_KEEP=$(min_int "$COVERAGE_RUN_PAYLOAD_KEEP" 1)
			BENCHMARK_CYCLE_KEEP=$(min_int "$BENCHMARK_CYCLE_KEEP" 4)
			BENCHMARK_CYCLE_RETENTION_MINUTES=$(min_int "$BENCHMARK_CYCLE_RETENTION_MINUTES" 60)
			CURRENT_ROOT_REPO_RETENTION_MINUTES=$(min_int "$CURRENT_ROOT_REPO_RETENTION_MINUTES" 30)
			CURRENT_ROOT_REPO_MAX_DELETE_PER_PASS=$(max_int "$CURRENT_ROOT_REPO_MAX_DELETE_PER_PASS" 12)
			BENCHMARK_CYCLE_KEEP=$(min_int "$BENCHMARK_CYCLE_KEEP" 2)
			BENCHMARK_CYCLE_RETENTION_MINUTES=$(min_int "$BENCHMARK_CYCLE_RETENTION_MINUTES" 30)
			PR_FINALIZATION_WORKTREE_KEEP=$(min_int "$PR_FINALIZATION_WORKTREE_KEEP" 8)
			PR_FINALIZATION_WORKTREE_RETENTION_MINUTES=$(min_int "$PR_FINALIZATION_WORKTREE_RETENTION_MINUTES" 60)
			PR_FINALIZATION_VALIDATION_RETENTION_MINUTES=$(min_int "$PR_FINALIZATION_VALIDATION_RETENTION_MINUTES" 60)
			STALE_WP_ENV_RETENTION_MINUTES=$(min_int "$STALE_WP_ENV_RETENTION_MINUTES" 720)
			STALE_WP_ENV_MAX_DELETE_PER_PASS=$(max_int "$STALE_WP_ENV_MAX_DELETE_PER_PASS" 4000)
			FUZZ_REPO_BATCH_KEEP=$(min_int "$FUZZ_REPO_BATCH_KEEP" 2)
			FUZZ_REPO_BATCH_RETENTION_MINUTES=$(min_int "$FUZZ_REPO_BATCH_RETENTION_MINUTES" 60)
			FUZZ_WP_ENV_BATCH_KEEP=$(min_int "$FUZZ_WP_ENV_BATCH_KEEP" 4)
			FUZZ_WP_ENV_BATCH_RETENTION_MINUTES=$(min_int "$FUZZ_WP_ENV_BATCH_RETENTION_MINUTES" 60)
			MAINTAINER_TESTED_SCRATCH_RETENTION_MINUTES=$(min_int "$MAINTAINER_TESTED_SCRATCH_RETENTION_MINUTES" 720)
			REPO_ARTIFACT_CHILD_KEEP=$(min_int "$REPO_ARTIFACT_CHILD_KEEP" 10)
			REPO_ARTIFACT_CHILD_RETENTION_MINUTES=$(min_int "$REPO_ARTIFACT_CHILD_RETENTION_MINUTES" 120)
			REPO_BROWSER_ARTIFACT_PAYLOAD_RETENTION_MINUTES=$(min_int "$REPO_BROWSER_ARTIFACT_PAYLOAD_RETENTION_MINUTES" 720)
			ROOT_TMP_RETENTION_MINUTES=$(min_int "$ROOT_TMP_RETENTION_MINUTES" 180)
			ROOT_TMP_MAX_DELETE_PER_PASS=$(max_int "$ROOT_TMP_MAX_DELETE_PER_PASS" 20000)
			ARTIFACT_PRUNE_SUMMARY_LIMIT=$(max_int "$ARTIFACT_PRUNE_SUMMARY_LIMIT" 800)
			ARTIFACT_PRUNE_ARTIFACT_DIR_LIMIT=$(max_int "$ARTIFACT_PRUNE_ARTIFACT_DIR_LIMIT" 50000)
			;;
		high)
			keep=$(min_int "$RUN_ROOT_KEEP_PRESSURE" 6)
			RUN_ROOT_HEAVY_DIR_KEEP=$(min_int "$RUN_ROOT_HEAVY_DIR_KEEP" 2)
			RUN_ROOT_HEAVY_DIR_RETENTION_MINUTES=$(min_int "$RUN_ROOT_HEAVY_DIR_RETENTION_MINUTES" 30)
			TRACE_RETENTION_MINUTES=$(min_int "$TRACE_RETENTION_MINUTES" 120)
			VIDEO_RETENTION_MINUTES=$(min_int "$VIDEO_RETENTION_MINUTES" 60)
			TMP_RETENTION_MINUTES=$(min_int "$TMP_RETENTION_MINUTES" 60)
			DATA_TMP_RETENTION_MINUTES=$(min_int "$DATA_TMP_RETENTION_MINUTES" 1440)
			CURRENT_ROOT_TMP_REPO_RETENTION_MINUTES=$(min_int "$CURRENT_ROOT_TMP_REPO_RETENTION_MINUTES" 10)
			CURRENT_ROOT_REPO_RETENTION_MINUTES=$(min_int "$CURRENT_ROOT_REPO_RETENTION_MINUTES" 60)
			CURRENT_ROOT_REPO_MAX_DELETE_PER_PASS=$(max_int "$CURRENT_ROOT_REPO_MAX_DELETE_PER_PASS" 8)
			COVERAGE_RUN_PAYLOAD_RETENTION_MINUTES=$(min_int "$COVERAGE_RUN_PAYLOAD_RETENTION_MINUTES" 60)
			COVERAGE_RUN_PAYLOAD_KEEP=$(min_int "$COVERAGE_RUN_PAYLOAD_KEEP" 1)
			BENCHMARK_CYCLE_KEEP=$(min_int "$BENCHMARK_CYCLE_KEEP" 4)
			BENCHMARK_CYCLE_RETENTION_MINUTES=$(min_int "$BENCHMARK_CYCLE_RETENTION_MINUTES" 60)
			PR_FINALIZATION_WORKTREE_KEEP=$(min_int "$PR_FINALIZATION_WORKTREE_KEEP" 8)
			PR_FINALIZATION_WORKTREE_RETENTION_MINUTES=$(min_int "$PR_FINALIZATION_WORKTREE_RETENTION_MINUTES" 120)
			PR_FINALIZATION_VALIDATION_RETENTION_MINUTES=$(min_int "$PR_FINALIZATION_VALIDATION_RETENTION_MINUTES" 120)
			STALE_WP_ENV_RETENTION_MINUTES=$(min_int "$STALE_WP_ENV_RETENTION_MINUTES" 1440)
			STALE_WP_ENV_MAX_DELETE_PER_PASS=$(max_int "$STALE_WP_ENV_MAX_DELETE_PER_PASS" 3000)
			FUZZ_REPO_BATCH_KEEP=$(min_int "$FUZZ_REPO_BATCH_KEEP" 2)
			FUZZ_REPO_BATCH_RETENTION_MINUTES=$(min_int "$FUZZ_REPO_BATCH_RETENTION_MINUTES" 120)
			FUZZ_WP_ENV_BATCH_KEEP=$(min_int "$FUZZ_WP_ENV_BATCH_KEEP" 4)
			FUZZ_WP_ENV_BATCH_RETENTION_MINUTES=$(min_int "$FUZZ_WP_ENV_BATCH_RETENTION_MINUTES" 120)
			MAINTAINER_TESTED_SCRATCH_RETENTION_MINUTES=$(min_int "$MAINTAINER_TESTED_SCRATCH_RETENTION_MINUTES" 1440)
			REPO_ARTIFACT_CHILD_KEEP=$(min_int "$REPO_ARTIFACT_CHILD_KEEP" 20)
			REPO_ARTIFACT_CHILD_RETENTION_MINUTES=$(min_int "$REPO_ARTIFACT_CHILD_RETENTION_MINUTES" 360)
			REPO_BROWSER_ARTIFACT_PAYLOAD_RETENTION_MINUTES=$(min_int "$REPO_BROWSER_ARTIFACT_PAYLOAD_RETENTION_MINUTES" 1440)
			ROOT_TMP_RETENTION_MINUTES=$(min_int "$ROOT_TMP_RETENTION_MINUTES" 240)
			ROOT_TMP_MAX_DELETE_PER_PASS=$(max_int "$ROOT_TMP_MAX_DELETE_PER_PASS" 20000)
			ARTIFACT_PRUNE_SUMMARY_LIMIT=$(max_int "$ARTIFACT_PRUNE_SUMMARY_LIMIT" 800)
			ARTIFACT_PRUNE_ARTIFACT_DIR_LIMIT=$(max_int "$ARTIFACT_PRUNE_ARTIFACT_DIR_LIMIT" 50000)
			;;
		pressure)
			keep=$(min_int "$RUN_ROOT_KEEP_PRESSURE" 12)
			RUN_ROOT_HEAVY_DIR_KEEP=$(min_int "$RUN_ROOT_HEAVY_DIR_KEEP" 4)
			RUN_ROOT_HEAVY_DIR_RETENTION_MINUTES=$(min_int "$RUN_ROOT_HEAVY_DIR_RETENTION_MINUTES" 90)
			TRACE_RETENTION_MINUTES=$(min_int "$TRACE_RETENTION_MINUTES" 360)
			VIDEO_RETENTION_MINUTES=$(min_int "$VIDEO_RETENTION_MINUTES" 180)
			TMP_RETENTION_MINUTES=$(min_int "$TMP_RETENTION_MINUTES" 180)
			DATA_TMP_RETENTION_MINUTES=$(min_int "$DATA_TMP_RETENTION_MINUTES" 2880)
			CURRENT_ROOT_TMP_REPO_RETENTION_MINUTES=$(min_int "$CURRENT_ROOT_TMP_REPO_RETENTION_MINUTES" 15)
			CURRENT_ROOT_REPO_RETENTION_MINUTES=$(min_int "$CURRENT_ROOT_REPO_RETENTION_MINUTES" 120)
			CURRENT_ROOT_REPO_MAX_DELETE_PER_PASS=$(max_int "$CURRENT_ROOT_REPO_MAX_DELETE_PER_PASS" 4)
			COVERAGE_RUN_PAYLOAD_RETENTION_MINUTES=$(min_int "$COVERAGE_RUN_PAYLOAD_RETENTION_MINUTES" 120)
			COVERAGE_RUN_PAYLOAD_KEEP=$(min_int "$COVERAGE_RUN_PAYLOAD_KEEP" 2)
			BENCHMARK_CYCLE_KEEP=$(min_int "$BENCHMARK_CYCLE_KEEP" 8)
			BENCHMARK_CYCLE_RETENTION_MINUTES=$(min_int "$BENCHMARK_CYCLE_RETENTION_MINUTES" 180)
			PR_FINALIZATION_WORKTREE_KEEP=$(min_int "$PR_FINALIZATION_WORKTREE_KEEP" 12)
			PR_FINALIZATION_WORKTREE_RETENTION_MINUTES=$(min_int "$PR_FINALIZATION_WORKTREE_RETENTION_MINUTES" 360)
			PR_FINALIZATION_VALIDATION_RETENTION_MINUTES=$(min_int "$PR_FINALIZATION_VALIDATION_RETENTION_MINUTES" 360)
			STALE_WP_ENV_RETENTION_MINUTES=$(min_int "$STALE_WP_ENV_RETENTION_MINUTES" 2880)
			STALE_WP_ENV_MAX_DELETE_PER_PASS=$(max_int "$STALE_WP_ENV_MAX_DELETE_PER_PASS" 2000)
			FUZZ_REPO_BATCH_KEEP=$(min_int "$FUZZ_REPO_BATCH_KEEP" 4)
			FUZZ_REPO_BATCH_RETENTION_MINUTES=$(min_int "$FUZZ_REPO_BATCH_RETENTION_MINUTES" 720)
			FUZZ_WP_ENV_BATCH_KEEP=$(min_int "$FUZZ_WP_ENV_BATCH_KEEP" 6)
			FUZZ_WP_ENV_BATCH_RETENTION_MINUTES=$(min_int "$FUZZ_WP_ENV_BATCH_RETENTION_MINUTES" 720)
			MAINTAINER_TESTED_SCRATCH_RETENTION_MINUTES=$(min_int "$MAINTAINER_TESTED_SCRATCH_RETENTION_MINUTES" 2880)
			REPO_ARTIFACT_CHILD_KEEP=$(min_int "$REPO_ARTIFACT_CHILD_KEEP" 40)
			REPO_ARTIFACT_CHILD_RETENTION_MINUTES=$(min_int "$REPO_ARTIFACT_CHILD_RETENTION_MINUTES" 720)
			REPO_BROWSER_ARTIFACT_PAYLOAD_RETENTION_MINUTES=$(min_int "$REPO_BROWSER_ARTIFACT_PAYLOAD_RETENTION_MINUTES" 2880)
			ROOT_TMP_RETENTION_MINUTES=$(min_int "$ROOT_TMP_RETENTION_MINUTES" 720)
			ROOT_TMP_MAX_DELETE_PER_PASS=$(max_int "$ROOT_TMP_MAX_DELETE_PER_PASS" 10000)
			ARTIFACT_PRUNE_SUMMARY_LIMIT=$(max_int "$ARTIFACT_PRUNE_SUMMARY_LIMIT" 200)
			ARTIFACT_PRUNE_ARTIFACT_DIR_LIMIT=$(max_int "$ARTIFACT_PRUNE_ARTIFACT_DIR_LIMIT" 10000)
			;;
	esac

	log "start data_free_gib=$(free_gib "$DATA_VOLUME") root_free_gib=$(free_gib "$ROOT_VOLUME") tier=$tier keep=$keep trace_retention_minutes=$TRACE_RETENTION_MINUTES video_retention_minutes=$VIDEO_RETENTION_MINUTES artifact_dir_limit=$ARTIFACT_PRUNE_ARTIFACT_DIR_LIMIT"
	write_status "$keep" "running" "$tier"
	trim_run_roots "$DATA_VOLUME/rtc-coverage-guided-20260515" "$DATA_VOLUME/rtc-coverage-guided-20260515/run-*" "$DATA_VOLUME/rtc-coverage-guided-20260515/current-output-dir.txt" "$keep"
	trim_run_roots "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/runs" "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/runs/strict-expansion-*" "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/current-run-root.txt" "$keep"
	trim_run_roots "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/runs" "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/runs/focused-shards-*" "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/current-run-root.txt" "$keep"
	trim_run_roots "$DATA_VOLUME/rtc-gap-booster-20260515/runs" "$DATA_VOLUME/rtc-gap-booster-20260515/runs/gap-booster-*" "$DATA_VOLUME/rtc-gap-booster-20260515/current-run-root.txt" "$keep"
	write_status "$keep" "running: trimmed run roots" "$tier"

	prune_stale_run_root_heavy_dirs "$DATA_VOLUME/rtc-coverage-guided-20260515" "$DATA_VOLUME/rtc-coverage-guided-20260515/run-*" "$DATA_VOLUME/rtc-coverage-guided-20260515/current-output-dir.txt"
	prune_stale_run_root_heavy_dirs "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/runs" "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/runs/strict-expansion-*" "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/current-run-root.txt"
	prune_stale_run_root_heavy_dirs "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/runs" "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/runs/focused-shards-*" "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/current-run-root.txt"
	prune_stale_run_root_heavy_dirs "$DATA_VOLUME/rtc-gap-booster-20260515/runs" "$DATA_VOLUME/rtc-gap-booster-20260515/runs/gap-booster-*" "$DATA_VOLUME/rtc-gap-booster-20260515/current-run-root.txt"
	prune_stale_run_root_browser_payloads "$DATA_VOLUME/rtc-coverage-guided-20260515" "$DATA_VOLUME/rtc-coverage-guided-20260515/run-*" "$DATA_VOLUME/rtc-coverage-guided-20260515/current-output-dir.txt"
	prune_stale_run_root_browser_payloads "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/runs" "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/runs/strict-expansion-*" "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/current-run-root.txt"
	prune_stale_run_root_browser_payloads "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/runs" "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/runs/focused-shards-*" "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/current-run-root.txt"
	prune_stale_run_root_browser_payloads "$DATA_VOLUME/rtc-gap-booster-20260515/runs" "$DATA_VOLUME/rtc-gap-booster-20260515/runs/gap-booster-*" "$DATA_VOLUME/rtc-gap-booster-20260515/current-run-root.txt"
	prune_stale_run_root_seed_payloads "$DATA_VOLUME/rtc-coverage-guided-20260515" "$DATA_VOLUME/rtc-coverage-guided-20260515/run-*" "$DATA_VOLUME/rtc-coverage-guided-20260515/current-output-dir.txt"
	prune_stale_run_root_seed_payloads "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/runs" "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/runs/strict-expansion-*" "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/current-run-root.txt"
	prune_stale_run_root_seed_payloads "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/runs" "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/runs/focused-shards-*" "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/current-run-root.txt"
	prune_stale_run_root_seed_payloads "$DATA_VOLUME/rtc-gap-booster-20260515/runs" "$DATA_VOLUME/rtc-gap-booster-20260515/runs/gap-booster-*" "$DATA_VOLUME/rtc-gap-booster-20260515/current-run-root.txt"
	write_status "$keep" "running: pruned run payloads" "$tier"
	prune_stale_coverage_run_payloads
	prune_orphan_current_coverage_tmp_repos
	prune_current_coverage_inactive_repos
	prune_benchmark_feedback_heavy_dirs "$BENCHMARK_CYCLE_KEEP" "$BENCHMARK_CYCLE_RETENTION_MINUTES"
	prune_pr_finalization_worktrees "$PR_FINALIZATION_WORKTREE_KEEP" "$PR_FINALIZATION_WORKTREE_RETENTION_MINUTES"
	prune_pr_finalization_validation_checkouts
	write_status "$keep" "running: pruned validation worktrees" "$tier"
	prune_stale_wp_env_dirs
	prune_fuzz_repo_batches
	prune_fuzz_wp_env_batches
	prune_maintainer_tested_scratch
	prune_repo_artifact_payloads
	prune_stale_data_tmp
	prune_stale_root_archive
	prune_docker_wp_env_if_due "$tier"
	write_status "$keep" "running: pruned generated data" "$tier"

	prune_old_artifacts "$DATA_VOLUME/rtc-coverage-guided-20260515" "$DATA_VOLUME/rtc-coverage-guided-20260515/current-output-dir.txt"
	prune_old_artifacts "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515" "$DATA_VOLUME/rtc-fuzz-strict-expansion-20260515/current-run-root.txt"
	prune_old_artifacts "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515" "$DATA_VOLUME/rtc-fuzz-focused-shards-20260515/current-run-root.txt"
	prune_old_artifacts "$DATA_VOLUME/rtc-gap-booster-20260515" "$DATA_VOLUME/rtc-gap-booster-20260515/current-run-root.txt"
	write_status "$keep" "running: pruned indexed artifacts" "$tier"
	cleanup_root_tmp_known_prefixes
	run_space_target_extra_passes "$tier" "$keep"
	log "done data_free_gib=$(free_gib "$DATA_VOLUME") root_free_gib=$(free_gib "$ROOT_VOLUME") tier=$tier"
	write_status "$keep" "done" "$tier"
}

while true; do
	run_once
	if [ "$ONCE" = "1" ]; then
		exit 0
	fi
	sleep "$INTERVAL_SECONDS"
done
