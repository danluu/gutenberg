#!/usr/bin/env bash
set -euo pipefail

BASE=${RTC_RESOURCE_AUTOSCALER_BASE:-/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516}
COVERAGE_BASE=${RTC_COVERAGE_BASE:-/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515}
DISK_VOLUME=${RTC_DATA_VOLUME:-/media/volume/danluu-fuzz-data}
ROOT_DISK_VOLUME=${RTC_ROOT_DISK_VOLUME:-/}
EXPECTED_DOCKER_ROOT=${RTC_EXPECTED_DOCKER_ROOT:-/var/lib/docker}
FUZZ_REPO=${RTC_FUZZ_REPO:-/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo}
START=${RTC_COVERAGE_START_SCRIPT:-$FUZZ_REPO/bin/rtc-coverage-guided-start-remote.sh}
WATCHDOG_START=${RTC_COVERAGE_WATCHDOG_START_SCRIPT:-$FUZZ_REPO/bin/rtc-coverage-guided-watchdog-start-remote.sh}
NODE_BIN=${RTC_NODE_BIN:-/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin}
TMUX=${RTC_TMUX:-/usr/bin/tmux}
TMUX_SOCKET=${RTC_TMUX_SOCKET:-rtc-fuzz}
LOG="$BASE/resource-autoscaler.log"
CSV="$BASE/resource-samples.csv"
DISK_CSV="$BASE/disk-samples.csv"
LOSS_CSV="$BASE/coverage-root-loss-events.csv"
STATUS="$BASE/resource-autoscaler-status.md"
LOCK=${RTC_RESOURCE_AUTOSCALER_LOCK:-$BASE/resource-autoscaler-v2.lock}
BUDGET_ENV="$BASE/current-budget.env"
GLOBAL_ADMISSION="$BASE/rtc-global-cpu-admission.sh"
MATERIALIZATION_DIR="$BASE/materialization"
MATERIALIZATION_LAST_REMEDIATION="$BASE/materialization-last-remediation-epoch"
OPTIONAL_BROWSER_SHED_LAST="$BASE/optional-browser-shed-last-epoch"
WP_ENV_RESET_LAST="$BASE/wp-env-reset-last-epoch"
POLL_SECONDS=${RTC_RESOURCE_AUTOSCALER_POLL_SECONDS:-120}
MIN_SCALE_UP_SECONDS=${RTC_RESOURCE_AUTOSCALER_MIN_SCALE_UP_SECONDS:-1200}
MIN_SCALE_DOWN_SECONDS=${RTC_RESOURCE_AUTOSCALER_MIN_SCALE_DOWN_SECONDS:-300}
STARTUP_RAMP_SECONDS=${RTC_RESOURCE_AUTOSCALER_STARTUP_RAMP_SECONDS:-240}
STARTUP_RAMP_STEP_GROUPS=${RTC_RESOURCE_AUTOSCALER_STARTUP_RAMP_STEP_GROUPS:-2}
STARTUP_RAMP_INITIAL_GROUPS=${RTC_RESOURCE_AUTOSCALER_STARTUP_RAMP_INITIAL_GROUPS:-3}
MIN_MATERIALIZATION_REMEDIATION_SECONDS=${RTC_RESOURCE_AUTOSCALER_MIN_MATERIALIZATION_REMEDIATION_SECONDS:-900}
OPTIONAL_BROWSER_SHED_COOLDOWN_SECONDS=${RTC_RESOURCE_AUTOSCALER_OPTIONAL_BROWSER_SHED_COOLDOWN_SECONDS:-900}
ALLOW_OPTIONAL_BROWSER_SHED=${RTC_RESOURCE_AUTOSCALER_ALLOW_OPTIONAL_BROWSER_SHED:-1}
MATERIALIZATION_STALE_SECONDS=${RTC_RESOURCE_AUTOSCALER_MATERIALIZATION_STALE_SECONDS:-600}
FIRST_PASS_BUDGET_RESTART_DEFER_SECONDS=${RTC_RESOURCE_AUTOSCALER_FIRST_PASS_BUDGET_RESTART_DEFER_SECONDS:-900}
WP_ENV_RESET_COOLDOWN_SECONDS=${RTC_RESOURCE_AUTOSCALER_WP_ENV_RESET_COOLDOWN_SECONDS:-1800}
RESET_WP_ENV_ON_INFRA_FAILURE=${RTC_RESOURCE_AUTOSCALER_RESET_WP_ENV_ON_INFRA_FAILURE:-1}
DISK_PRESSURE_FREE_GIB=${RTC_RESOURCE_AUTOSCALER_DISK_PRESSURE_FREE_GIB:-650}
DISK_HIGH_PRESSURE_FREE_GIB=${RTC_RESOURCE_AUTOSCALER_DISK_HIGH_PRESSURE_FREE_GIB:-200}
DISK_SEVERE_PRESSURE_FREE_GIB=${RTC_RESOURCE_AUTOSCALER_DISK_SEVERE_PRESSURE_FREE_GIB:-75}
ROOT_DISK_PRESSURE_FREE_GIB=${RTC_RESOURCE_AUTOSCALER_ROOT_DISK_PRESSURE_FREE_GIB:-28}
ROOT_DISK_HIGH_PRESSURE_FREE_GIB=${RTC_RESOURCE_AUTOSCALER_ROOT_DISK_HIGH_PRESSURE_FREE_GIB:-12}
ROOT_DISK_SEVERE_PRESSURE_FREE_GIB=${RTC_RESOURCE_AUTOSCALER_ROOT_DISK_SEVERE_PRESSURE_FREE_GIB:-6}
DEADLINE_PRODUCTIVE_FREE_GIB=${RTC_RESOURCE_AUTOSCALER_DEADLINE_PRODUCTIVE_FREE_GIB:-225}
DEADLINE_PRODUCTIVE_TARGET_GROUPS=${RTC_RESOURCE_AUTOSCALER_DEADLINE_PRODUCTIVE_TARGET_GROUPS:-12}
DEADLINE_PRODUCTIVE_MAX_GROUPS=${RTC_RESOURCE_AUTOSCALER_DEADLINE_PRODUCTIVE_MAX_GROUPS:-12}
POLICY_REQUIRED_COVERAGE_GROUPS=${RTC_RESOURCE_AUTOSCALER_POLICY_REQUIRED_GROUPS:-novelty-http-rtc-reference-oracle}
COVERAGE_ROOT_CLEANUP_TARGET_GIB=${RTC_RESOURCE_AUTOSCALER_COVERAGE_ROOT_CLEANUP_TARGET_GIB:-275}
COVERAGE_ROOT_CLEANUP_TRIGGER_GIB=${RTC_RESOURCE_AUTOSCALER_COVERAGE_ROOT_CLEANUP_TRIGGER_GIB:-$COVERAGE_ROOT_CLEANUP_TARGET_GIB}
COVERAGE_ROOT_CLEANUP_MAX_PER_POLL=${RTC_RESOURCE_AUTOSCALER_COVERAGE_ROOT_CLEANUP_MAX_PER_POLL:-1}
COVERAGE_ROOT_CLEANUP_MIN_AGE_SECONDS=${RTC_RESOURCE_AUTOSCALER_COVERAGE_ROOT_CLEANUP_MIN_AGE_SECONDS:-3600}
COVERAGE_ROOT_CLEANUP_TIMEOUT_SECONDS=${RTC_RESOURCE_AUTOSCALER_COVERAGE_ROOT_CLEANUP_TIMEOUT_SECONDS:-1800}
COVERAGE_ROOT_CLEANUP_PID_FILE="$BASE/coverage-root-cleanup.pid"
top_level_env_or_budget_value() {
	local name=$1 fallback=${2:-} value
	value=${!name-}
	if [ -z "$value" ] && [ -f "$BUDGET_ENV" ]; then
		value=$(sed -n "s/^export ${name}='\([^']*\)'.*/\1/p" "$BUDGET_ENV" | tail -1)
	fi
	printf '%s\n' "${value:-$fallback}"
}

ONE_CANARY_MATERIALIZATION_RESCUE=0
allow_empty_materialization_no_product_startup_canary=$(
	top_level_env_or_budget_value RTC_FUZZ_NOVELTY_ALLOW_EMPTY_MATERIALIZATION_NO_PRODUCT_STARTUP_CANARY 0
)
fleet_startup_noise_canary_group=$(
	top_level_env_or_budget_value RTC_FUZZ_NOVELTY_FLEET_STARTUP_NOISE_CANARY_GROUP ''
)
benchmark_canary_sticky_group_limit=$(
	top_level_env_or_budget_value RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT ''
)
if [ "${RTC_RESOURCE_AUTOSCALER_ONE_CANARY_MATERIALIZATION_RESCUE:-0}" = "1" ] ||
	{ [ "$allow_empty_materialization_no_product_startup_canary" = "1" ] &&
		[ -n "$fleet_startup_noise_canary_group" ]; }; then
	ONE_CANARY_MATERIALIZATION_RESCUE=1
	MIN_COVERAGE_BREADTH_GROUPS=${RTC_RESOURCE_AUTOSCALER_MIN_COVERAGE_BREADTH_GROUPS:-1}
else
	MIN_COVERAGE_BREADTH_GROUPS=${RTC_RESOURCE_AUTOSCALER_MIN_COVERAGE_BREADTH_GROUPS:-10}
fi
# The sticky group limit constrains benchmark-canary selection inside the
# novelty monitor. It must not turn into a global autoscaler rescue cap after
# disk/load pressure has cleared; otherwise a stale low-budget env keeps the
# browser fleet at one or two groups indefinitely.

mkdir -p "$BASE" "$MATERIALIZATION_DIR"
exec 9>"$LOCK"
if ! flock -n 9; then
	echo "resource autoscaler already running"
	exit 0
fi

export PATH="$NODE_BIN:$PATH"

tmux_cmd() {
	"$TMUX" -L "$TMUX_SOCKET" "$@" 9>&-
}

stamp() {
	date -u +%Y-%m-%dT%H:%M:%SZ
}

epoch() {
	date +%s
}

latest_run() {
	local latest
	latest="$(cat "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)"
	if [ -n "$latest" ] && [ -d "$latest" ]; then
		printf '%s\n' "$latest"
		return
	fi
	ls -td "$COVERAGE_BASE"/run-* 2>/dev/null | head -1 || true
}

read_cpu_sample() {
	awk '/^cpu / { print $2, $3, $4, $5, $6, $7, $8, $9 }' /proc/stat
}

cpu_percent() {
	local a b
	read -r -a a <<<"$(read_cpu_sample)"
	sleep 2 9>&-
	read -r -a b <<<"$(read_cpu_sample)"
	local idle_a=$(( ${a[3]} + ${a[4]} ))
	local idle_b=$(( ${b[3]} + ${b[4]} ))
	local total_a=0
	local total_b=0
	local i
	for i in "${a[@]}"; do
		total_a=$(( total_a + i ))
	done
	for i in "${b[@]}"; do
		total_b=$(( total_b + i ))
	done
	local total_delta=$(( total_b - total_a ))
	local idle_delta=$(( idle_b - idle_a ))
	if [ "$total_delta" -le 0 ]; then
		printf '0.0\n'
		return
	fi
	awk -v total="$total_delta" -v idle="$idle_delta" 'BEGIN { printf "%.1f\n", ((total - idle) * 100) / total }'
}

mem_available_gib() {
	awk '/MemAvailable:/ { printf "%.1f\n", $2 / 1024 / 1024 }' /proc/meminfo
}

disk_available_gib() {
	local volume=${1:-$DISK_VOLUME}
	df -Pk "$volume" 2>/dev/null |
		awk 'NR == 2 { printf "%.1f\n", $4 / 1024 / 1024 }'
}

disk_used_percent() {
	local volume=${1:-$DISK_VOLUME}
	df -Pk "$volume" 2>/dev/null |
		awk 'NR == 2 && $2 > 0 { printf "%.1f\n", ($3 * 100) / $2 }'
}

docker_root_dir() {
	docker info --format '{{.DockerRootDir}}' 2>/dev/null || true
}

docker_root_is_misconfigured() {
	local actual=${1:-}
	[ -n "$actual" ] && [ "$actual" != "$EXPECTED_DOCKER_ROOT" ]
}

load1() {
	awk '{ print $1 }' /proc/loadavg
}

load5() {
	awk '{ print $2 }' /proc/loadavg
}

load15() {
	awk '{ print $3 }' /proc/loadavg
}

cores() {
	nproc
}

run_script_value() {
	local key=$1
	local fallback=$2
	local latest
	latest=$(latest_run)
	if [ -n "$latest" ] && [ -f "$latest/run-monitor.sh" ]; then
		sed -n "s/^export ${key}='\([^']*\)'.*/\1/p" "$latest/run-monitor.sh" | tail -1
	else
		printf '%s\n' "$fallback"
	fi
}

budget_env_value() {
	local key=$1
	local fallback=$2
	local value
	if [ -f "$BUDGET_ENV" ]; then
		value=$(sed -n "s/^export ${key}='\([^']*\)'.*/\1/p" "$BUDGET_ENV" 2>/dev/null | tail -1)
		if [ -n "$value" ]; then
			printf '%s\n' "$value"
			return
		fi
	fi
	printf '%s\n' "$fallback"
}

current_target() {
	local fallback
	fallback=$(run_script_value RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS 0)
	budget_env_value RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS \
		"$(budget_env_value RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS "$(run_script_value RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS "$fallback")")"
}

current_max() {
	local fallback
	fallback=$(run_script_value RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS 0)
	budget_env_value RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS \
		"$(budget_env_value RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS "$(run_script_value RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS "$fallback")")"
}

enabled_groups() {
	local latest
	latest=$(latest_run)
	if [ -z "$latest" ] || [ ! -f "$latest/supervisor-groups.json" ]; then
		echo 0
		return
	fi
	node -e "const fs=require('fs'); const p=process.argv[1]; const j=JSON.parse(fs.readFileSync(p,'utf8')); const groups=Array.isArray(j)?j:Object.values(j); console.log(groups.filter(g=>g.enabled!==false && !g.paused).length);" "$latest/supervisor-groups.json" 2>/dev/null || echo 0
}

current_browser_roots() {
	cat "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true
	cat /media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515/current-run-root.txt 2>/dev/null || true
	cat /media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515/current-run-root.txt 2>/dev/null || true
	cat /media/volume/danluu-fuzz-data/rtc-gap-booster-20260515/current-run-root.txt 2>/dev/null || true
}

data_disk_below_gib() {
	local avail=${1:-} threshold=${2:-}
	awk -v avail="$avail" -v threshold="$threshold" '
		function valid_number(x) { return x ~ /^[0-9]+([.][0-9]+)?$/ }
		BEGIN { exit !(valid_number(avail) && valid_number(threshold) && avail < threshold) }
	'
}

data_disk_at_least_gib() {
	local avail=${1:-} threshold=${2:-}
	awk -v avail="$avail" -v threshold="$threshold" '
		function valid_number(x) { return x ~ /^[0-9]+([.][0-9]+)?$/ }
		BEGIN { exit !(valid_number(avail) && valid_number(threshold) && avail >= threshold) }
	'
}

coverage_root_pointer_refs() {
	current_browser_roots
	find "$DISK_VOLUME" -maxdepth 2 -type f \( -name current-output-dir.txt -o -name current-run-root.txt \) -print 2>/dev/null |
		while IFS= read -r pointer_file; do
			cat "$pointer_file" 2>/dev/null || true
		done
}

coverage_root_cleanup_running() {
	local pid
	if [ ! -f "$COVERAGE_ROOT_CLEANUP_PID_FILE" ]; then
		return 1
	fi
	pid=$(cat "$COVERAGE_ROOT_CLEANUP_PID_FILE" 2>/dev/null || true)
	if [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null; then
		return 0
	fi
	rm -f "$COVERAGE_ROOT_CLEANUP_PID_FILE"
	return 1
}

start_inactive_coverage_root_cleanup() {
	local now=$1
	local dir=$2
	local free=$3
	local target=$4
	local timeout_seconds=$COVERAGE_ROOT_CLEANUP_TIMEOUT_SECONDS
	local pid
	[[ "$timeout_seconds" =~ ^[0-9]+$ ]] || timeout_seconds=1800
	echo "[$now] launching async inactive coverage root prune free=${free}GiB target=${target}GiB root=$dir" >> "$LOG"
	(
		exec 9>&-
		local rc=0
		echo "[$(stamp)] async inactive coverage root prune started root=$dir" >> "$LOG"
		if command -v timeout >/dev/null 2>&1; then
			timeout --kill-after=60 "${timeout_seconds}s" sudo rm -rf -- "$dir"
			rc=$?
		else
			sudo rm -rf -- "$dir"
			rc=$?
		fi
		if [ "$rc" -eq 0 ] && [ ! -d "$dir" ]; then
			echo "[$(stamp)] async inactive coverage root prune finished root=$dir free_after=$(disk_available_gib "$DISK_VOLUME")GiB" >> "$LOG"
		else
			echo "[$(stamp)] async inactive coverage root prune incomplete rc=$rc root=$dir free_after=$(disk_available_gib "$DISK_VOLUME")GiB" >> "$LOG"
		fi
		rm -f "$COVERAGE_ROOT_CLEANUP_PID_FILE"
	) </dev/null &
	pid=$!
	printf '%s\n' "$pid" > "$COVERAGE_ROOT_CLEANUP_PID_FILE"
}

prune_inactive_coverage_roots_if_needed() {
	local now=${1:-$(stamp)}
	local disk_avail=${2:-}
	local trigger=$COVERAGE_ROOT_CLEANUP_TRIGGER_GIB
	local target=$COVERAGE_ROOT_CLEANUP_TARGET_GIB
	local max_removals=$COVERAGE_ROOT_CLEANUP_MAX_PER_POLL
	local min_age=$COVERAGE_ROOT_CLEANUP_MIN_AGE_SECONDS
	local psfile pointerfile removed=0 skipped_recent=0 free dir mtime age epoch_now
	[[ "$max_removals" =~ ^[0-9]+$ ]] || max_removals=0
	[[ "$min_age" =~ ^[0-9]+$ ]] || min_age=0
	[ "$max_removals" -gt 0 ] || return 0
	disk_avail=${disk_avail:-$(disk_available_gib "$DISK_VOLUME")}
	data_disk_below_gib "$disk_avail" "$trigger" || return 0
	if coverage_root_cleanup_running; then
		echo "[$now] inactive coverage root prune already running pid=$(cat "$COVERAGE_ROOT_CLEANUP_PID_FILE" 2>/dev/null || true)" >> "$LOG"
		return 0
	fi
	if ! [ -d "$COVERAGE_BASE" ]; then
		return 0
	fi
	psfile=$(mktemp)
	pointerfile=$(mktemp)
	ps -eo args > "$psfile" 2>/dev/null || true
	coverage_root_pointer_refs | awk 'NF && !seen[$0]++ { print }' > "$pointerfile"
	epoch_now=$(epoch)
	while IFS= read -r dir; do
		[ -d "$dir" ] || continue
		if grep -Fxq "$dir" "$pointerfile"; then
			continue
		fi
		if grep -Fq "$dir" "$psfile"; then
			continue
		fi
		mtime=$(stat -c %Y "$dir" 2>/dev/null || printf '0')
		[[ "$mtime" =~ ^[0-9]+$ ]] || mtime=0
		age=$(( epoch_now - mtime ))
		if [ "$age" -lt "$min_age" ]; then
			skipped_recent=$(( skipped_recent + 1 ))
			continue
		fi
		free=$(disk_available_gib "$DISK_VOLUME")
		if data_disk_at_least_gib "$free" "$target"; then
			break
		fi
		start_inactive_coverage_root_cleanup "$now" "$dir" "$free" "$target"
		removed=$(( removed + 1 ))
		if [ "$removed" -ge "$max_removals" ]; then
			break
		fi
	done < <(find "$COVERAGE_BASE" -maxdepth 1 -mindepth 1 -type d -name 'run-*' -printf '%T@ %p\n' 2>/dev/null | sort -n | awk '{ $1=""; sub(/^ /, ""); print }')
	rm -f "$psfile" "$pointerfile"
	if [ "$removed" -gt 0 ]; then
		echo "[$now] pruned inactive coverage roots count=$removed skipped_recent=$skipped_recent free_after=$(disk_available_gib "$DISK_VOLUME")GiB target=${target}GiB" >> "$LOG"
	fi
}

live_browser_lane_pids_all_roots() {
	# This runs every scaler cycle. Walking historical run trees and probing each
	# lane PID can block behind large artifact directories, which prevents the
	# scaler from reacting during overload. Count live browser runner processes
	# directly instead; optional shedding still uses process groups to terminate
	# the relevant workers.
	{ pgrep -af 'bin/rtc-browser-fuzz-runner\.mjs' 2>/dev/null || true; } |
		awk '!/codex/ { count++ } END { print count + 0 }'
}

current_repo_roots() {
	local latest
	latest=$(latest_run)
	if [ -z "$latest" ] || [ ! -f "$latest/supervisor-groups.json" ]; then
		return
	fi
	node -e "const fs=require('fs'); const groups=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); console.log([...new Set((Array.isArray(groups)?groups:[]).map(g=>g.repoRoot).filter(Boolean))].join('\n'));" "$latest/supervisor-groups.json" 2>/dev/null || true
}

session_running() {
	tmux_cmd list-sessions -F '#S' 2>/dev/null |
		grep -Fxq rtc-coverage-guided-novelty
}

cleanup_orphan_monitors() {
	local pids
	# A live tmux pane can briefly leave the monitor with PPID 1 while startup
	# wrappers are rotating. Killing that process resets the active output root
	# before the first novelty pass can finish, which makes current-run
	# duplicate/noise accounting look permanently "pending".
	if session_running; then
		return
	fi
	pids=$(ps -eo pid,ppid,cmd | awk '/node bin\/rtc-browser-fuzz-novelty-monitor\.mjs/ && $2 == 1 { print $1 }')
	if [ -z "$pids" ]; then
		return
	fi
	for pid in $pids; do
		echo "[$(stamp)] killing orphan novelty monitor pid=$pid" >> "$LOG"
		kill -9 "$pid" 2>/dev/null || true
	done
}

cleanup_optional_browser_process_groups() {
	local now=$1
	local leaf_pids pid cur depth ppid pgid args pgids pgid killed=0
	leaf_pids=$(
		ps -eo pid,args |
			awk '
				/rtc-resource-autoscaler|awk |ps -eo|grep / { next }
				/rtc-gap-booster-20260515|rtc-fuzz-focused-shards-20260515|rtc-fuzz-strict-expansion-20260515/ &&
				/playwright|chrome-headless|ffmpeg|rtc-browser-fuzz-runner|test-playwright|wp-scripts/ &&
				!/codex/ {
					print $1;
				}
			'
	)
	if [ -z "$leaf_pids" ]; then
		return 1
	fi
	pgids=$(
		for pid in $leaf_pids; do
			cur=$pid
			depth=0
			while [ -n "$cur" ] && [ "$cur" != "1" ] && [ "$depth" -lt 12 ]; do
				if ! read -r ppid pgid args < <(ps -p "$cur" -o ppid=,pgid=,args= 2>/dev/null); then
					break
				fi
				if [[ "$args" == *"tmux -L $TMUX_SOCKET"* || "$args" == *"tmux -L rtc-fuzz"* || "$args" == *"/usr/bin/tmux"* ]]; then
					break
				fi
				if [ -n "$pgid" ] && [ "$pgid" != "0" ] && [ "$pgid" != "1" ]; then
					printf '%s\n' "$pgid"
				fi
				cur=$ppid
				depth=$((depth + 1))
			done
		done | sort -u
	)
	if [ -z "$pgids" ]; then
		return 1
	fi
	for pgid in $pgids; do
		case "$pgid" in
			''|0|1)
				continue
				;;
		esac
		echo "[$now] terminating optional browser job process group under severe pressure: pgid=$pgid" >> "$LOG"
		kill -TERM "-$pgid" 2>/dev/null || true
		killed=1
	done
	if [ "$killed" = 1 ]; then
		sleep 5 9>&-
		for pgid in $pgids; do
			case "$pgid" in
				''|0|1)
					continue
					;;
			esac
			kill -KILL "-$pgid" 2>/dev/null || true
		done
		return 0
	fi
	return 1
}

coverage_breadth_deficit() {
	local enabled
	enabled=$(enabled_groups)
	[[ "$enabled" =~ ^[0-9]+$ ]] || enabled=0
	[ "$enabled" -lt "$MIN_COVERAGE_BREADTH_GROUPS" ]
}

apply_coverage_breadth_floor() {
	local target=$1
	local max=$2
	local reason=${3:-}
	[[ "$target" =~ ^[0-9]+$ ]] || target=0
	[[ "$max" =~ ^[0-9]+$ ]] || max=0
	case "$reason" in
		pressure|high_pressure|severe_pressure)
			if [ "$max" -lt "$target" ]; then
				max=$target
			fi
			printf '%s %s\n' "$target" "$max"
			return
			;;
	esac
	if [ "$ONE_CANARY_MATERIALIZATION_RESCUE" = 1 ]; then
		target=${RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS:-$(top_level_env_or_budget_value RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS 1)}
		max=${RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS:-$(top_level_env_or_budget_value RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS "$target")}
		[[ "$target" =~ ^[0-9]+$ ]] || target=1
		[[ "$max" =~ ^[0-9]+$ ]] || max=$target
		if [ "$target" -lt 1 ]; then
			target=1
		fi
		if [ "$max" -lt "$target" ]; then
			max=$target
		fi
		printf '%s %s\n' "$target" "$max"
		return
	fi
	case "$reason" in
		headroom|large_headroom|coverage_breadth_floor)
			;;
		*)
			if [ "$max" -lt "$target" ]; then
				max=$target
			fi
			printf '%s %s\n' "$target" "$max"
			return
			;;
	esac
	if [ "$target" -lt "$MIN_COVERAGE_BREADTH_GROUPS" ]; then
		target=$MIN_COVERAGE_BREADTH_GROUPS
	fi
	if [ "$max" -le "$target" ]; then
		max=$(( target + 1 ))
	fi
	printf '%s %s\n' "$target" "$max"
}

coverage_breadth_floor_allowed() {
	case "$1" in
		headroom|large_headroom|coverage_breadth_floor)
			return 0
			;;
	esac
	return 1
}

apply_disk_budget() {
	local target=$1
	local max=$2
	local reason=$3
	local data_disk_avail=$4
	local root_disk_avail=$5
	awk -v target="$target" -v max="$max" -v reason="$reason" \
		-v data_disk_avail="$data_disk_avail" \
		-v root_disk_avail="$root_disk_avail" \
		-v data_pressure="$DISK_PRESSURE_FREE_GIB" \
		-v data_high="$DISK_HIGH_PRESSURE_FREE_GIB" \
		-v data_severe="$DISK_SEVERE_PRESSURE_FREE_GIB" \
		-v root_pressure="$ROOT_DISK_PRESSURE_FREE_GIB" \
		-v root_high="$ROOT_DISK_HIGH_PRESSURE_FREE_GIB" \
		-v root_severe="$ROOT_DISK_SEVERE_PRESSURE_FREE_GIB" '
		function valid_number(x) { return x ~ /^[0-9]+([.][0-9]+)?$/ }
		function pressure_level(avail, pressure, high, severe) {
			if (! valid_number(avail)) {
				return 0;
			}
			if (avail < severe) {
				return 3;
			}
			if (avail < high) {
				return 2;
			}
			if (avail < pressure) {
				return 1;
			}
			return 0;
		}
		BEGIN {
			data_level = pressure_level(data_disk_avail, data_pressure, data_high, data_severe);
			root_level = pressure_level(root_disk_avail, root_pressure, root_high, root_severe);
			level = data_level > root_level ? data_level : root_level;
			if (level <= 0) {
				print target " " max " " reason;
				exit;
			}
			if (level >= 3) {
				print "0 0 disk_severe_pressure";
			} else if (level == 2) {
				print "1 2 disk_high_pressure";
			} else if (level == 1) {
				if (target > 2) {
					target = 2;
				}
				if (max > target + 1) {
					max = target + 1;
				}
				if (max < target) {
					max = target;
				}
				print target " " max " disk_pressure";
			}
		}
	'
}

shed_optional_browser_pools_if_needed() {
	local reason=$1
	local now=$2
	local browser_live_lanes=${3:-0}
	local e2e_floor=${4:-24}
	local last_shed session killed=0
	case "$reason" in
		severe_pressure|disk_high_pressure|disk_severe_pressure)
			;;
		*)
			return 1
			;;
	esac
	if [ "$ALLOW_OPTIONAL_BROWSER_SHED" != "1" ]; then
		echo "[$now] optional browser shedding skipped under $reason; set RTC_RESOURCE_AUTOSCALER_ALLOW_OPTIONAL_BROWSER_SHED=1 to enable it" >> "$LOG"
		return 1
	fi
	# Keep the scaler control path nonblocking. Historical artifact trees can
	# leave stale lane metadata and process-group cleanup can block long enough
	# for pressure to worsen. The guard now respects this pressure state, so
	# session-level shedding is the fast control action; orphan cleanup belongs
	# in a separate bounded janitor. Severe pressure wins over the E2E lane floor:
	# preserving optional browser sessions while overloaded keeps the controller
	# in a load oscillation.
	last_shed=$(cat "$OPTIONAL_BROWSER_SHED_LAST" 2>/dev/null || echo 0)
	if [ "$killed" != 1 ] && [ $(( $(epoch) - last_shed )) -lt "$OPTIONAL_BROWSER_SHED_COOLDOWN_SECONDS" ]; then
		return 1
	fi
	for session in \
		rtc-gap-booster \
		rtc-gap-booster-watchdog \
		rtc-focused-shards \
		rtc-focused-shards-watchdog \
		rtc-fuzz-strict-expansion \
		rtc-fuzz-strict-expansion-watchdog; do
		if tmux_cmd has-session -t "$session" 2>/dev/null; then
			echo "[$now] stopping optional browser session under severe pressure: $session" >> "$LOG"
			tmux_cmd kill-session -t "$session" 2>/dev/null || true
			killed=1
		fi
	done
	while IFS= read -r session; do
		[ -n "$session" ] || continue
		echo "[$now] stopping append focused session under severe pressure: $session" >> "$LOG"
		tmux_cmd kill-session -t "$session" 2>/dev/null || true
		killed=1
	done < <(tmux_cmd list-sessions -F '#S' 2>/dev/null | grep -E '^rtc-focused-shards(-watchdog|-analysis)?-append-' || true)
	if [ "$killed" = 1 ]; then
		echo "$(epoch)" > "$OPTIONAL_BROWSER_SHED_LAST"
		return 0
	fi
	return 1
}

cpu_heavy_session_regex_for_class() {
	case "$1" in
		optional-browser)
			printf '^(rtc-focused-shards($|-append)|rtc-fuzz-strict-expansion$|rtc-gap-booster$|rtc-cov-deep-novelty-)'
			;;
		lower-level)
			printf '^(rtc-lower-level-fuzz-loop|rtc-coverage-guided-lower-level|rtc-cg-parser-action-|rtc-native-action-)'
			;;
		backend-api)
			printf '^rtc-backend-api-fuzz'
			;;
		protocol-server)
			printf '^rtc-protocol-server-fuzz'
			;;
		operator-correctness)
			printf '^rtc-operator-correctness-(fuzz|watchdog)'
			;;
		pr-validation)
			printf '^(rtc-critical-validate-|rtc-benchmark-|rtc-pr-finalize-job-)'
			;;
		fuzz-assertion)
			printf '^$'
			;;
		*)
			printf '^$'
			;;
	esac
}

global_cpu_quota() {
	local class=$1
	if [ -x "$GLOBAL_ADMISSION" ]; then
		"$GLOBAL_ADMISSION" quota "$class" 2>/dev/null || printf '0\n'
	else
		printf '0\n'
	fi
}

cpu_heavy_session_is_self_throttling() {
	local class=$1
	local session=$2
	case "$class:$session" in
		lower-level:rtc-lower-level-fuzz-loop|lower-level:rtc-coverage-guided-lower-level*)
			return 0
			;;
	esac
	return 1
}

self_throttling_lower_level_session_is_live() {
	tmux_cmd list-sessions -F '#S' 2>/dev/null |
		awk '$0 == "rtc-lower-level-fuzz-loop" || $0 ~ /^rtc-coverage-guided-lower-level/ { found=1 } END { exit !found }'
}

cleanup_known_cpu_heavy_process_groups_for_class() {
	local class=$1 now=$2
	local awk_match pgids pgid
	case "$class" in
		optional-browser)
			awk_match='rtc-gap-booster-20260515|rtc-fuzz-focused-shards-20260515|rtc-fuzz-strict-expansion-20260515'
			;;
		lower-level)
			if self_throttling_lower_level_session_is_live; then
				awk_match='rtc-cg-parser-action-|rtc-native-action-'
			else
				awk_match='rtc-lower-level-fuzz-20260516|rtc-coverage-guided-lower-level|coverage-guided-lower-level'
			fi
			;;
		backend-api)
			awk_match='rtc-backend-api-fuzz-20260518|rtc-backend-api-fuzz'
			;;
		protocol-server)
			awk_match='rtc-native-assert-protocol-20260516/protocol|rtc-protocol-server-fuzz'
			;;
		operator-correctness)
			awk_match='rtc-operator-alerts/correctness-fuzz|operator-correctness'
			;;
		*)
			return 1
			;;
	esac
	pgids=$(
		ps -eo pid=,pgid=,args= |
			awk -v needle="$awk_match" '
				/rtc-resource-autoscaler|awk |ps -eo|grep / { next }
				$0 ~ needle &&
				$0 ~ /playwright|chrome-headless|rtc-browser-fuzz-runner|test-playwright|wp-scripts|npm exec|jest|phpunit|rtc-(backend-api|protocol-server|coverage-guided-lower-level)/ {
					print $2;
				}
			' |
			awk '$1 > 1 { print }' |
			sort -u
	)
	[ -n "$pgids" ] || return 1
	for pgid in $pgids; do
		case "$pgid" in
			''|0|1)
				continue
				;;
		esac
		echo "[$now] terminating orphan CPU-heavy process group class=$class pgid=$pgid" >> "$LOG"
		kill -TERM "-$pgid" 2>/dev/null || true
	done
	sleep 2 9>&-
	for pgid in $pgids; do
		case "$pgid" in
			''|0|1)
				continue
				;;
		esac
		kill -KILL "-$pgid" 2>/dev/null || true
	done
	return 0
}

enforce_global_cpu_budget() {
	local reason=$1 now=$2 class regex quota sessions active kill_count session kill_candidates
	case "$reason" in
		pressure|high_pressure|severe_pressure|unknown)
			;;
		*)
			return 1
			;;
	esac
	if [ ! -x "$GLOBAL_ADMISSION" ]; then
		return 1
	fi
	for class in optional-browser lower-level backend-api protocol-server operator-correctness pr-validation fuzz-assertion; do
		quota=$(global_cpu_quota "$class")
		[[ "$quota" =~ ^[0-9]+$ ]] || quota=0
		regex=$(cpu_heavy_session_regex_for_class "$class")
		sessions=$(tmux_cmd list-sessions -F '#S' 2>/dev/null | awk -v regex="$regex" '$0 ~ regex { print }' || true)
		if [ -z "$sessions" ]; then
			if [ "$quota" -eq 0 ]; then
				cleanup_known_cpu_heavy_process_groups_for_class "$class" "$now" || true
			fi
			continue
		fi
		active=$(printf '%s\n' "$sessions" | awk 'NF { count++ } END { print count + 0 }')
		if [ "$active" -le "$quota" ]; then
			if [ "$quota" -eq 0 ]; then
				cleanup_known_cpu_heavy_process_groups_for_class "$class" "$now" || true
			fi
			continue
		fi
		kill_count=$(( active - quota ))
		kill_candidates=$(
			printf '%s\n' "$sessions" | while IFS= read -r session; do
				[ -n "$session" ] || continue
				if cpu_heavy_session_is_self_throttling "$class" "$session"; then
					echo "[$now] preserving self-throttling CPU-heavy session over global budget class=$class quota=$quota active=$active reason=$reason session=$session" >> "$LOG"
					continue
				fi
				printf '%s\n' "$session"
			done
		)
		printf '%s\n' "$kill_candidates" | head -n "$kill_count" | while IFS= read -r session; do
			[ -n "$session" ] || continue
			echo "[$now] stopping CPU-heavy session over global budget class=$class quota=$quota active=$active reason=$reason session=$session" >> "$LOG"
			tmux_cmd kill-session -t "$session" 2>/dev/null || true
		done
		if [ "$quota" -eq 0 ]; then
			cleanup_known_cpu_heavy_process_groups_for_class "$class" "$now" || true
		fi
	done
}

choose_budget() {
	local cpu=$1
	local load_value=$2
	local load5_value=$3
	local load15_value=$4
	local avail=$5
	local ncpu=$6
	awk -v cpu="$cpu" -v loadv="$load_value" -v load5v="$load5_value" -v load15v="$load15_value" -v avail="$avail" -v ncpu="$ncpu" '
		BEGIN {
			short_trend = loadv - load5v;
			mid_trend = load5v - load15v;
			predicted_load = loadv;
			if (load5v > predicted_load) predicted_load = load5v;
			if (load15v > predicted_load) predicted_load = load15v;
			if (short_trend > 0) predicted_load += short_trend * 0.75;
			if (mid_trend > 0) predicted_load += mid_trend * 0.50;
			severe_load = ncpu * 1.35;
			severe_load5 = ncpu * 1.20;
			severe_load15 = ncpu * 1.12;
			high_pressure_load = ncpu * 1.05;
			high_pressure_load5 = ncpu * 1.02;
			high_pressure_load15 = ncpu * 1.00;
			pressure_load = ncpu * 0.92;
			pressure_load5 = ncpu * 0.95;
			pressure_load15 = ncpu * 0.96;
			high_load = ncpu * 0.86;
			high_load5 = ncpu * 0.88;
			high_load15 = ncpu * 0.92;
			mid_load = ncpu * 0.78;
			mid_load5 = ncpu * 0.82;
			mid_load15 = ncpu * 0.88;
			low_load = ncpu * 0.66;
			low_load5 = ncpu * 0.70;
			low_load15 = ncpu * 0.85;
			if (cpu >= 96 || predicted_load >= severe_load || load5v >= severe_load5 || load15v >= severe_load15) {
				print "1 2 severe_pressure";
			} else if (cpu >= 92 || predicted_load >= high_pressure_load || load5v >= high_pressure_load5 || load15v >= high_pressure_load15) {
				print "2 3 high_pressure";
			} else if (cpu >= 88 || predicted_load >= pressure_load || load5v >= pressure_load5 || load15v >= pressure_load15 || avail < 120) {
				print "3 4 pressure";
			} else if (cpu <= 62 && predicted_load <= low_load && load5v <= low_load5 && load15v <= low_load15 && avail >= 300) {
				print "10 11 large_headroom";
			} else if (cpu <= 72 && predicted_load <= mid_load && load5v <= mid_load5 && load15v <= mid_load15 && avail >= 250) {
				print "8 9 headroom";
			} else if (cpu <= 80 && predicted_load <= high_load && load5v <= high_load5 && load15v <= high_load15 && avail >= 180) {
				print "6 7 modest_headroom";
			} else {
				print "4 5 steady";
			}
		}
	'
}

scale_up_backlog_clear() {
	local load_value=$1
	local load5_value=$2
	local load15_value=$3
	local ncpu=$4
	awk -v loadv="$load_value" -v load5v="$load5_value" -v load15v="$load15_value" -v ncpu="$ncpu" '
		BEGIN {
			exit !(loadv <= ncpu * 0.86 && load5v <= ncpu * 0.88 && load15v <= ncpu * 0.92);
		}
	'
}

ramp_startup_target() {
	local current_target=$1
	local desired_target=$2
	local desired_max=$3
	[[ "$current_target" =~ ^[0-9]+$ ]] || current_target=0
	[[ "$desired_target" =~ ^[0-9]+$ ]] || desired_target=0
	[[ "$desired_max" =~ ^[0-9]+$ ]] || desired_max=0
	[[ "$STARTUP_RAMP_STEP_GROUPS" =~ ^[0-9]+$ ]] || STARTUP_RAMP_STEP_GROUPS=2
	[[ "$STARTUP_RAMP_INITIAL_GROUPS" =~ ^[0-9]+$ ]] || STARTUP_RAMP_INITIAL_GROUPS=3

	local cap=$(( current_target + STARTUP_RAMP_STEP_GROUPS ))
	if [ "$current_target" -le 0 ] && [ "$cap" -lt "$STARTUP_RAMP_INITIAL_GROUPS" ]; then
		cap=$STARTUP_RAMP_INITIAL_GROUPS
	fi
	if [ "$desired_target" -gt "$cap" ]; then
		desired_target=$cap
	fi
	cap=$(( desired_target + 1 ))
	if [ "$desired_max" -gt "$cap" ]; then
		desired_max=$cap
	fi
	if [ "$desired_max" -le "$desired_target" ]; then
		desired_max=$(( desired_target + 1 ))
	fi
	printf '%s %s\n' "$desired_target" "$desired_max"
}

e2e_floor_repair_allowed() {
	local reason=$1 cpu=$2 load_value=$3 load5_value=$4 ncpu=$5
	case "$reason" in
		severe_pressure|disk_pressure|disk_high_pressure|disk_severe_pressure)
			return 1
			;;
	esac
	if [ "$reason" = "pressure" ] || [ "$reason" = "high_pressure" ]; then
		awk -v cpu="$cpu" -v loadv="$load_value" -v load5v="$load5_value" -v ncpu="$ncpu" '
			BEGIN {
				exit !(cpu < 85 && loadv < ncpu * 0.90 && load5v < ncpu * 0.95);
			}
		'
		return
	fi
	return 0
}

deadline_benchmark_canary_budget_cap_active() {
	local sticky_limit max_budget
	sticky_limit=$(budget_env_value RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT '')
	case "$sticky_limit" in
		1|2|3|4)
			return 0
			;;
	esac
	if [ "$(benchmark_canary_slot_floor)" -gt 0 ]; then
		return 0
	fi
	if benchmark_canary_feedback_active; then
		return 0
	fi
	max_budget=$(budget_env_value RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS "$(run_script_value RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS 0)")
	[[ "$max_budget" =~ ^[0-9]+$ ]] || max_budget=0
	[ "$max_budget" -gt 0 ] && [ "$max_budget" -le 5 ]
}

benchmark_canary_ws_backfill_needed() {
	local latest status_path
	latest=$(latest_run)
	status_path="$latest/benchmark-canary-coverage-status.tsv"
	[ -s "$status_path" ] || return 1
	awk -F '\t' '
		NR == 1 {
			for (i = 1; i <= NF; i++) {
				h[$i] = i;
			}
			next;
		}
		{
			group = $(h["group"]);
			forced = $(h["forced"]);
			promotion_blocked = $(h["promotion_blocked"]);
			records = $(h["current_run_group_records"]) + 0;
			successes = $(h["current_run_successful_group_records"]) + 0;
			if (group ~ /^novelty-ws-/ && forced == "yes" && promotion_blocked == "yes" && records == 0 && successes == 0) {
				found = 1;
			}
		}
		END { exit ! found; }
	' "$status_path"
}

benchmark_canary_primary_http_evidence_needed() {
	local latest status_path
	latest=$(latest_run)
	status_path="$latest/benchmark-canary-coverage-status.tsv"
	[ -s "$status_path" ] || return 1
	awk -F '\t' '
		NR == 1 {
			for (i = 1; i <= NF; i++) {
				h[$i] = i;
			}
			next;
		}
		{
			group = $(h["group"]);
			primary = $(h["primary"]);
			promotion_blocked = $(h["promotion_blocked"]);
			successes = $(h["current_run_successful_group_records"]) + 0;
			if (group ~ /^novelty-http-/ && primary == "yes" && promotion_blocked == "yes" && successes == 0) {
				found = 1;
			}
		}
		END { exit ! found; }
	' "$status_path"
}

benchmark_canary_evidence_extra_budget_needed() {
	benchmark_canary_primary_http_evidence_needed ||
		benchmark_canary_ws_backfill_needed
}

benchmark_canary_status_floor() {
	local latest status_path
	latest=$(latest_run)
	status_path="$latest/benchmark-canary-coverage-status.tsv"
	[ -s "$status_path" ] || return 1
	awk -F '\t' '
		NR == 1 {
			for (i = 1; i <= NF; i++) {
				h[$i] = i;
			}
			next;
		}
		{
			group = $(h["group"]);
			scheduled = $(h["scheduled"]);
			live_forced = $(h["live_forced"]);
			active = $(h["active"]);
			primary = $(h["primary"]);
			retained = $(h["retained_product_evidence"]);
			status_only = $(h["status_only"]);
			coverage_state = $(h["coverage_state"]);
			successes = $(h["current_run_successful_group_records"]) + 0;
			deadline_pair = group == "novelty-http-large-post-lifecycle" || group == "novelty-http-self-presence-ui-signals";
			open_primary_blocker = primary == "yes" && deadline_pair && coverage_state == "open-benchmark-canary-status-blocker" && successes == 0;
			if (deadline_pair && $(h["forced"]) == "yes" && $(h["promotion_blocked"]) == "yes" && status_only != "yes" && coverage_state != "absent-from-supervisor-state" && (scheduled == "yes" || live_forced == "yes" || active == "yes" || retained == "yes" || open_primary_blocker)) {
				count++;
			}
		}
		END { print count + 0; }
	' "$status_path"
}

benchmark_canary_feedback_active() {
	[ -s "/media/volume/danluu-fuzz-data/rtc-benchmark-canary-feedback-20260520/current-feedback.tsv" ] || return 1
	awk -F '\t' '
		NR == 1 { next }
		$9 != "" && $9 !~ /^No product-fuzzer equivalent/ { found = 1 }
		END { exit ! found }
	' /media/volume/danluu-fuzz-data/rtc-benchmark-canary-feedback-20260520/current-feedback.tsv 2>/dev/null
}

benchmark_canary_slot_floor() {
	local latest floor_path floor status_floor feedback_floor
	latest=$(latest_run)
	floor_path="$latest/benchmark-canary-coverage-floor.tsv"
	status_floor=$(benchmark_canary_status_floor 2>/dev/null || true)
	if [[ "$status_floor" =~ ^[0-9]+$ ]] && [ "$status_floor" -gt 0 ]; then
		floor=$status_floor
	else
		floor=$(awk -F '\t' '$1 == "slot_floor" { print $2; found = 1 } END { if (! found) print 0 }' "$floor_path" 2>/dev/null || printf '0')
	fi
	[[ "$floor" =~ ^[0-9]+$ ]] || floor=0
	feedback_floor=0
	if [ "$floor" -le 0 ] && [ -s "/media/volume/danluu-fuzz-data/rtc-benchmark-canary-feedback-20260520/current-feedback.tsv" ]; then
		feedback_floor=$(awk -F '\t' '
			NR == 1 { next }
			$9 != "" && $9 !~ /^No product-fuzzer equivalent/ { count++ }
			END {
				if (count > 0) print 10;
				else print 0;
			}
		' /media/volume/danluu-fuzz-data/rtc-benchmark-canary-feedback-20260520/current-feedback.tsv 2>/dev/null || printf '0')
		[[ "$feedback_floor" =~ ^[0-9]+$ ]] || feedback_floor=0
	fi
	if [ "$feedback_floor" -gt "$floor" ]; then
		floor=$feedback_floor
	fi
	if [ "$floor" -gt 10 ]; then
		floor=10
	fi
	printf '%s\n' "$floor"
}

apply_benchmark_canary_finalization_ceiling() {
	local target=$1 max=$2 reason=$3
	local floor cap
	floor=$(benchmark_canary_slot_floor)
	[[ "$floor" =~ ^[0-9]+$ ]] || floor=0
	if [ "$reason" = "deadline_benchmark_canary_cap" ] && [ "$floor" -gt 5 ]; then
		floor=5
	fi
	[ "$floor" -gt 0 ] || {
		printf '%s %s %s\n' "$target" "$max" "$reason"
		return
	}
	cap=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_FINALIZATION_MAX_GROUPS:-12}
	[[ "$cap" =~ ^[0-9]+$ ]] || cap=12
	if [ "$cap" -lt "$floor" ]; then
		cap=$floor
	fi
	if [ "$target" -gt "$cap" ]; then
		target=$cap
		reason=deadline_benchmark_canary_finalization_ceiling
	fi
	if [ "$max" -gt "$cap" ]; then
		max=$cap
		reason=deadline_benchmark_canary_finalization_ceiling
	fi
	if [ "$target" -lt "$floor" ]; then
		target=$floor
		reason=deadline_benchmark_canary_finalization_ceiling
	fi
	if [ "$max" -lt "$target" ]; then
		max=$target
	fi
	printf '%s %s %s\n' "$target" "$max" "$reason"
}

deadline_benchmark_canary_extra_budget_allowed() {
	local reason=$1 data_disk_avail=${2:-0} root_disk_avail=${3:-0}
	local cpu=${4:-100} load_value=${5:-999} load5_value=${6:-999} ncpu=${7:-1}
	benchmark_canary_evidence_extra_budget_needed || return 1
	case "$reason" in
		severe_pressure|disk_pressure|disk_high_pressure|disk_severe_pressure)
			return 1
			;;
	esac
	if benchmark_canary_primary_http_evidence_needed; then
		awk -v data_disk_avail="$data_disk_avail" \
			-v root_disk_avail="$root_disk_avail" \
			-v data_pressure="$DISK_PRESSURE_FREE_GIB" \
			-v root_pressure="$ROOT_DISK_PRESSURE_FREE_GIB" '
			function valid_number(x) { return x ~ /^[0-9]+([.][0-9]+)?$/ }
			BEGIN {
				allowed = valid_number(data_disk_avail) &&
					valid_number(root_disk_avail) &&
					data_disk_avail >= data_pressure &&
					root_disk_avail >= root_pressure;
				exit ! allowed;
			}
		'
		return
	fi
	benchmark_canary_ws_backfill_needed || return 1
	awk -v cpu="$cpu" -v loadv="$load_value" -v load5v="$load5_value" \
		-v ncpu="$ncpu" \
		-v data_disk_avail="$data_disk_avail" \
		-v root_disk_avail="$root_disk_avail" \
		-v data_pressure="$DISK_PRESSURE_FREE_GIB" \
		-v root_pressure="$ROOT_DISK_PRESSURE_FREE_GIB" '
		function valid_number(x) { return x ~ /^[0-9]+([.][0-9]+)?$/ }
		BEGIN {
			allowed = valid_number(cpu) &&
				valid_number(loadv) &&
				valid_number(load5v) &&
				valid_number(ncpu) &&
				valid_number(data_disk_avail) &&
				valid_number(root_disk_avail) &&
				cpu < 85 &&
				loadv < ncpu * 0.90 &&
				load5v < ncpu * 0.95 &&
				data_disk_avail >= data_pressure &&
				root_disk_avail >= root_pressure;
			exit ! allowed;
		}
	'
}

deadline_productive_floor_allowed() {
	local reason=$1 data_disk_avail=${2:-0} root_disk_avail=${3:-0}
	local cpu=${4:-100} load_value=${5:-999} load5_value=${6:-999} ncpu=${7:-1}
	case "$reason" in
		severe_pressure|disk_high_pressure|disk_severe_pressure)
			return 1
			;;
	esac
	awk -v cpu="$cpu" -v loadv="$load_value" -v load5v="$load5_value" \
		-v ncpu="$ncpu" \
		-v data_disk_avail="$data_disk_avail" \
		-v root_disk_avail="$root_disk_avail" \
		-v data_high="$DISK_HIGH_PRESSURE_FREE_GIB" \
		-v root_pressure="$ROOT_DISK_PRESSURE_FREE_GIB" '
		function valid_number(x) { return x ~ /^[0-9]+([.][0-9]+)?$/ }
		BEGIN {
			allowed = valid_number(cpu) &&
				valid_number(loadv) &&
				valid_number(load5v) &&
				valid_number(ncpu) &&
				valid_number(data_disk_avail) &&
				valid_number(root_disk_avail) &&
				cpu < 85 &&
				loadv < ncpu * 0.90 &&
				load5v < ncpu * 0.95 &&
				data_disk_avail >= data_high &&
				root_disk_avail >= root_pressure;
			exit ! allowed;
		}
	'
}

deadline_benchmark_canary_productive_budget_allowed() {
	local reason=$1 data_disk_avail=${2:-0} root_disk_avail=${3:-0}
	local cpu=${4:-100} load_value=${5:-999} load5_value=${6:-999} ncpu=${7:-1}
	deadline_productive_floor_allowed \
		"$reason" "$data_disk_avail" "$root_disk_avail" "$cpu" "$load_value" "$load5_value" "$ncpu" || return 1
	awk -v data_disk_avail="$data_disk_avail" \
		-v productive_free="$DEADLINE_PRODUCTIVE_FREE_GIB" '
		function valid_number(x) { return x ~ /^[0-9]+([.][0-9]+)?$/ }
		BEGIN {
			exit !(valid_number(data_disk_avail) && valid_number(productive_free) && data_disk_avail >= productive_free);
		}
	'
}

apply_deadline_benchmark_canary_budget_cap() {
	local target=$1 max=$2 reason=$3 data_disk_avail=${4:-0} root_disk_avail=${5:-0}
	local cpu=${6:-100} load_value=${7:-999} load5_value=${8:-999} ncpu=${9:-1}
	local cap_target cap_max evidence_extra_budget=0 preserve_existing_extra_budget=0 productive_budget=0 slot_floor=0
	local productive_target productive_max
	if ! deadline_benchmark_canary_budget_cap_active; then
		printf '%s %s %s\n' "$target" "$max" "$reason"
		return
	fi
	if deadline_benchmark_canary_extra_budget_allowed \
			"$reason" "$data_disk_avail" "$root_disk_avail" "$cpu" "$load_value" "$load5_value" "$ncpu"; then
		evidence_extra_budget=1
	fi
	if deadline_productive_floor_allowed \
			"$reason" "$data_disk_avail" "$root_disk_avail" "$cpu" "$load_value" "$load5_value" "$ncpu"; then
		evidence_extra_budget=1
		if deadline_benchmark_canary_productive_budget_allowed \
				"$reason" "$data_disk_avail" "$root_disk_avail" "$cpu" "$load_value" "$load5_value" "$ncpu"; then
			productive_budget=1
		fi
	fi
	cap_target=$(budget_env_value RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS 3)
	cap_max=$(budget_env_value RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS "$cap_target")
	[[ "$cap_target" =~ ^[0-9]+$ ]] || cap_target=3
	[[ "$cap_max" =~ ^[0-9]+$ ]] || cap_max=$cap_target
	if [ "$productive_budget" = 1 ]; then
		productive_target=$DEADLINE_PRODUCTIVE_TARGET_GROUPS
		productive_max=$DEADLINE_PRODUCTIVE_MAX_GROUPS
		[[ "$productive_target" =~ ^[0-9]+$ ]] || productive_target=$MIN_COVERAGE_BREADTH_GROUPS
		[[ "$productive_max" =~ ^[0-9]+$ ]] || productive_max=$productive_target
		[ "$productive_target" -lt "$MIN_COVERAGE_BREADTH_GROUPS" ] && productive_target=$MIN_COVERAGE_BREADTH_GROUPS
		[ "$productive_max" -lt "$productive_target" ] && productive_max=$productive_target
		printf '%s %s %s\n' "$productive_target" "$productive_max" deadline_benchmark_canary_cap
		return
	fi
	slot_floor=$(benchmark_canary_slot_floor)
	[[ "$slot_floor" =~ ^[0-9]+$ ]] || slot_floor=0
	if [ "$slot_floor" -gt 0 ]; then
		[ "$slot_floor" -gt 5 ] && slot_floor=5
		if [ "$evidence_extra_budget" = 1 ] && [ "$slot_floor" -lt 4 ]; then
			printf '%s %s %s\n' 4 5 deadline_benchmark_canary_cap
			return
		fi
		printf '%s %s %s\n' "$slot_floor" "$slot_floor" deadline_benchmark_canary_cap
		return
	fi
	case "$reason" in
		severe_pressure|disk_pressure|disk_high_pressure|disk_severe_pressure)
			;;
		*)
			if [ "$slot_floor" -gt 0 ]; then
				evidence_extra_budget=1
			fi
			;;
	esac
	case "$reason" in
		severe_pressure|disk_pressure|disk_high_pressure|disk_severe_pressure)
			preserve_existing_extra_budget=0
			;;
		*)
			if [ "$slot_floor" -gt 0 ] && { [ "$cap_target" -ge 4 ] || [ "$cap_max" -ge 5 ]; }; then
				preserve_existing_extra_budget=1
			fi
			;;
	esac
	[ "$cap_target" -lt 1 ] && cap_target=1
	if [ "$evidence_extra_budget" = 1 ] || [ "$preserve_existing_extra_budget" = 1 ]; then
		[ "$cap_target" -lt 4 ] && cap_target=4
		[ "$cap_target" -gt 4 ] && cap_target=4
	else
		[ "$cap_target" -gt 3 ] && cap_target=3
	fi
	[ "$cap_max" -lt "$cap_target" ] && cap_max=$cap_target
	if [ "$evidence_extra_budget" = 1 ] || [ "$preserve_existing_extra_budget" = 1 ]; then
		[ "$cap_max" -lt 5 ] && cap_max=5
		[ "$cap_max" -gt 5 ] && cap_max=5
	else
		[ "$cap_max" -gt 3 ] && cap_max=3
	fi
	case "$reason" in
		severe_pressure|disk_pressure|disk_high_pressure|disk_severe_pressure)
			;;
		*)
			if [ "$slot_floor" -gt 0 ]; then
				[ "$cap_target" -lt "$slot_floor" ] && cap_target=$slot_floor
				[ "$cap_max" -lt "$slot_floor" ] && cap_max=$slot_floor
			fi
			;;
	esac
	printf '%s %s %s\n' "$cap_target" "$cap_max" deadline_benchmark_canary_cap
}

materialization_snapshot() {
	local latest state_path
	latest=$(latest_run)
	state_path="$latest/supervisor-state.json"
	if [ -z "$latest" ] || [ ! -f "$state_path" ]; then
		printf '%s\t0\t0\t0\t0\tunknown\t0\tno-supervisor-state\n' "${state_path:-none}"
		return
	fi
	node - "$state_path" <<'NODE'
const fs = require( 'fs' );
const statePath = process.argv[ 2 ];
const sanitize = ( value, max = 700 ) =>
	String( value ?? '' )
		.replace( /\s+/g, ' ' )
		.replace( /\t/g, ' ' )
		.replace( /,/g, ';' )
		.trim()
		.slice( 0, max );
let state;
try {
	state = JSON.parse( fs.readFileSync( statePath, 'utf8' ) );
} catch ( error ) {
	console.log( [ statePath, 0, 0, 0, 0, 'unreadable', 0, sanitize( error.message ) ].join( '\t' ) );
	process.exit( 0 );
}
const groups = Array.isArray( state.groups ) ? state.groups : [];
const activeDirs = new Set();
const statusCounts = new Map();
let pausedInfraStartup = 0;
let runningGroups = 0;
const details = [];
for ( const group of groups ) {
	const status = group.status || 'unknown';
	statusCounts.set( status, ( statusCounts.get( status ) || 0 ) + 1 );
	for ( const runDir of [
		group.currentRunDir,
		...( Array.isArray( group.activeRunDirs ) ? group.activeRunDirs : [] ),
	] ) {
		if ( runDir ) {
			activeDirs.add( runDir );
		}
	}
	if ( status === 'paused-infra-startup' ) {
		pausedInfraStartup += 1;
		details.push( `${ group.name }: ${ sanitize( group.lastReason, 180 ) }` );
	}
	if ( [ 'running', 'launching', 'recovering' ].includes( status ) ) {
		runningGroups += 1;
	}
}
const updated = Date.parse( state.lastUpdatedAt || state.startedAt || '' );
const ageSeconds = Number.isFinite( updated )
	? Math.max( 0, Math.round( ( Date.now() - updated ) / 1000 ) )
	: 0;
console.log(
	[
		statePath,
		groups.length,
		activeDirs.size,
		pausedInfraStartup,
		runningGroups,
		[ ...statusCounts.entries() ]
			.sort( ( left, right ) => left[ 0 ].localeCompare( right[ 0 ] ) )
			.map( ( [ status, count ] ) => `${ status }:${ count }` )
			.join( '|' ) || 'none',
		ageSeconds,
		details.join( ' | ' ) || 'none',
	].join( '\t' )
);
NODE
}

materialization_needs_remediation() {
	local enabled=$1 desired_target=$2 active=$3 paused=$4 running=$5 stale_seconds=$6
	local status_counts=${7:-}
	if [ "${desired_target:-0}" -gt 0 ] && [ "${enabled:-0}" -le 0 ] && [ "${active:-0}" -eq 0 ]; then
		if [ "$status_counts" = "unknown" ] && [ "${stale_seconds:-0}" -lt "$MATERIALIZATION_STALE_SECONDS" ]; then
			return 1
		fi
		return 0
	fi
	if printf '%s' "$status_counts" | grep -Eq '(^|\|)(starting|launching|recovering):[1-9]' &&
		[ "${stale_seconds:-0}" -lt "$MATERIALIZATION_STALE_SECONDS" ]; then
		return 1
	fi
	if [ "${enabled:-0}" -gt 0 ] &&
		[ "${active:-0}" -ge "${enabled:-0}" ] &&
		[ "${running:-0}" -ge "${enabled:-0}" ]; then
		return 1
	fi
	if [ "${desired_target:-0}" -gt 0 ] &&
		[ "${active:-0}" -lt "${desired_target:-0}" ] &&
		[ "${running:-0}" -lt "${desired_target:-0}" ] &&
		[ "${enabled:-0}" -lt "${desired_target:-0}" ]; then
		return 0
	fi
	if [ "${enabled:-0}" -le 0 ]; then
		return 1
	fi
	if [ "${desired_target:-0}" -gt 0 ] &&
		[ "${active:-0}" -eq 0 ] &&
		[ "${running:-0}" -eq 0 ] &&
		printf '%s' "$status_counts" | grep -Eq '(^|\|)paused-startup-stall:[1-9]'; then
		return 0
	fi
	if [ "${active:-0}" -eq 0 ] && [ "${paused:-0}" -gt 0 ]; then
		return 0
	fi
	if [ "${active:-0}" -eq 0 ] && [ "${stale_seconds:-0}" -ge "$MATERIALIZATION_STALE_SECONDS" ] && [ "${desired_target:-0}" -gt 0 ]; then
		return 0
	fi
	if [ "${desired_target:-0}" -ge 6 ] && [ "${active:-0}" -lt 2 ] && [ "${paused:-0}" -ge 2 ]; then
		return 0
	fi
	if [ "${desired_target:-0}" -ge 6 ] && [ "${running:-0}" -eq 0 ] && [ "${stale_seconds:-0}" -ge "$MATERIALIZATION_STALE_SECONDS" ]; then
		return 0
	fi
	return 1
}

latest_policy_holds_empty_materialization() {
	local latest
	latest=$(latest_run)
	[ -n "$latest" ] || return 1
	node - "$latest/novelty-state.json" "$latest/novelty-status.md" <<'NODE'
const fs = require( 'fs' );
const [ statePath, statusPath ] = process.argv.slice( 2 );
const holdActions = new Set( [
	'hold-empty-coverage-no-safe-fallback',
	'hold-materialization-floor-no-safe-group',
	'bootstrap-supervisor-groups-empty',
	'skip-bootstrap-empty-materialization-startup-noise-canary-no-eligible-fallback',
] );
const maxAgeMs = Number(
	process.env.RTC_RESOURCE_AUTOSCALER_POLICY_HOLD_MAX_AGE_MS ||
		30 * 60 * 1000
);
const now = Date.now();
const readText = ( file ) => {
	try {
		return fs.readFileSync( file, 'utf8' );
	} catch {
		return '';
	}
};
const readJson = ( file ) => {
	try {
		return JSON.parse( readText( file ) );
	} catch {
		return null;
	}
};
const isFresh = ( iso ) => {
	const timestamp = Date.parse( iso || '' );
	return Number.isFinite( timestamp ) && now - timestamp <= maxAgeMs;
};
const status = readText( statusPath );
const sectionText = ( heading ) => {
	const marker = `## ${ heading }`;
	const start = status.indexOf( marker );
	if ( start === -1 ) {
		return '';
	}
	const next = status.indexOf( '\n## ', start + marker.length );
	return status.slice( start, next === -1 ? undefined : next );
};
const parseMetric = ( text, label ) => {
	const escaped = label.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
	const match = text.match( new RegExp( `- ${ escaped }:\\s*([0-9.]+)` ) );
	return match ? Number( match[ 1 ] ) : null;
};
const activeTriage = sectionText( 'Triage Yield' ) || status;
const activeSignatures = parseMetric( activeTriage, 'signatures' );
const activeDuplicateShare = parseMetric(
	activeTriage,
	'top duplicate family share'
);
const activeLikelyReal = parseMetric( activeTriage, 'likely-real visible' );
const state = readJson( statePath );
const recentStateHold =
	( Array.isArray( state?.changes ) ? state.changes : [] )
		.slice( -50 )
		.some(
			( change ) =>
				holdActions.has( change?.action ) &&
				( ! change?.at || isFresh( change.at ) )
		);
const freshState = ! state?.lastUpdatedAt || isFresh( state.lastUpdatedAt );
const statusHold =
	/hold-empty-coverage-no-safe-fallback|hold-materialization-floor-no-safe-group|bootstrap-supervisor-groups-empty|skip-bootstrap-empty-materialization-startup-noise-canary-no-eligible-fallback/.test(
		status
	);
const activeMetricsPending =
	activeSignatures === null &&
	activeDuplicateShare === null &&
	activeLikelyReal === null;
const activeCurrentNoiseClear =
	! activeMetricsPending &&
	( activeSignatures === 0 || activeDuplicateShare === 0 ) &&
	activeLikelyReal === 0;
if ( activeCurrentNoiseClear ) {
	process.exit( 1 );
}
process.exit( freshState && ( recentStateHold || statusHold ) ? 0 : 1 );
NODE
}

coverage_first_pass_pending() {
	local latest
	latest=$(latest_run)
	[ -n "$latest" ] || return 1
	[ -f "$latest/novelty-status.md" ] || return 1
	node - "$latest/novelty-status.md" "$FIRST_PASS_BUDGET_RESTART_DEFER_SECONDS" <<'NODE'
const fs = require( 'fs' );
const [ statusPath, deferSecondsRaw ] = process.argv.slice( 2 );
const deferMs = Math.max( 0, Number( deferSecondsRaw || 0 ) * 1000 );
let status = '';
try {
	status = fs.readFileSync( statusPath, 'utf8' );
} catch {
	process.exit( 1 );
}
const updatedMatch = status.match( /^Updated:\s+(\S+)/m );
const updatedAt = Date.parse( updatedMatch?.[ 1 ] || '' );
if ( ! Number.isFinite( updatedAt ) || Date.now() - updatedAt > deferMs ) {
	process.exit( 1 );
}
if (
	/full coverage pass pending/.test( status ) ||
	/pending until first pass/.test( status )
) {
	process.exit( 0 );
}
process.exit( 1 );
NODE
}

should_defer_budget_restart_for_first_pass() {
	local reason=$1 desired_target=${2:-0} desired_max=${3:-0}
	local slot_floor current_max
	current_max=$(budget_env_value RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS "$(run_script_value RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS 0)")
	[[ "$current_max" =~ ^[0-9]+$ ]] || current_max=0
	[[ "$desired_target" =~ ^[0-9]+$ ]] || desired_target=0
	[[ "$desired_max" =~ ^[0-9]+$ ]] || desired_max=0
	if [ "$desired_target" -ge "$MIN_COVERAGE_BREADTH_GROUPS" ] &&
			[ "$desired_max" -gt "$current_max" ]; then
		return 1
	fi
	case "$reason" in
		missing_monitor|severe_pressure)
			return 1
			;;
		deadline_benchmark_canary_cap)
			slot_floor=$(benchmark_canary_slot_floor)
			[[ "$slot_floor" =~ ^[0-9]+$ ]] || slot_floor=0
			if [ "$slot_floor" -gt "$current_max" ]; then
				return 1
			fi
			;;
		materialization_invariant_failed)
			if materialization_logs_show_wp_env_infra_failure; then
				return 1
			fi
			;;
	esac
	coverage_first_pass_pending
}

materialization_logs_show_wp_env_infra_failure() {
	local latest file
	latest=$(latest_run)
	if [ -z "$latest" ]; then
		return 1
	fi
	for file in "$latest"/*-wp-env-start*.log; do
		[ -f "$file" ] || continue
		if grep -Eqi 'dependency failed to start: container .*mysql.*exited|Can'\''t init tc log|wp-env start failed|Environment not initialized' "$file"; then
			return 0
		fi
	done
	return 1
}

repo_has_live_browser_runner() {
	local repo=$1 pid cwd cmd
	for pid in $(pgrep -f 'bin/rtc-browser-fuzz-runner\.mjs|wp-scripts test-playwright|@playwright/test/cli\.js' || true); do
		[ -d "/proc/$pid" ] || continue
		cmd=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)
		case "$cmd" in
			*'/codex '*|*' codex '*)
				continue
				;;
		esac
		cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null || true)
		if [ "$cwd" = "$repo" ]; then
			return 0
		fi
	done
	return 1
}

wp_env_generated_dirs_for_repo() {
	local repo=$1
	find /home/exouser/wp-env -mindepth 2 -maxdepth 2 -name docker-compose.yml -print 2>/dev/null |
		while IFS= read -r compose_path; do
			if grep -Fq "$repo" "$compose_path"; then
				dirname "$compose_path"
			fi
		done
}

reset_generated_wp_env_dirs() {
	local repo=$1 now=$2 dir did_reset=0
	while IFS= read -r dir; do
		[ -n "$dir" ] || continue
		[ -f "$dir/docker-compose.yml" ] || continue
		echo "[$now] fallback wp-env reset dir=$dir repo=$repo" >> "$LOG"
		if docker compose -f "$dir/docker-compose.yml" down -v --remove-orphans >> "$LOG" 2>&1; then
			rm -f "$dir/wp-env-cache.json"
			did_reset=1
		else
			echo "[$now] fallback wp-env reset failed dir=$dir repo=$repo" >> "$LOG"
		fi
	done < <(wp_env_generated_dirs_for_repo "$repo")
	[ "$did_reset" = 1 ]
}

reset_wp_env_if_safe() {
	local enabled=$1 active=$2 paused=$3 now=$4
	local last_reset repo did_reset=0
	if [ "$RESET_WP_ENV_ON_INFRA_FAILURE" = "0" ]; then
		return
	fi
	if [ "${enabled:-0}" -le 0 ] || [ "${active:-0}" -ne 0 ] || [ "${paused:-0}" -lt "${enabled:-0}" ]; then
		return
	fi
	if ! materialization_logs_show_wp_env_infra_failure; then
		return
	fi
	last_reset=$(cat "$WP_ENV_RESET_LAST" 2>/dev/null || echo 0)
	if [ $(( $(epoch) - last_reset )) -lt "$WP_ENV_RESET_COOLDOWN_SECONDS" ]; then
		echo "[$now] wp-env reset skipped by cooldown" >> "$LOG"
		return
	fi
	while IFS= read -r repo; do
		[ -n "$repo" ] || continue
		if repo_has_live_browser_runner "$repo"; then
			echo "[$now] wp-env reset skipped repo=$repo because live browser runners are using that cwd" >> "$LOG"
			continue
		fi
		echo "[$now] resetting wp-env repo=$repo after full materialization infra failure" >> "$LOG"
		if (
			cd "$repo" || exit 1
			npm run wp-env-test -- destroy --force
		) >> "$LOG" 2>&1; then
			did_reset=1
		else
			echo "[$now] wp-env reset via wp-env failed repo=$repo; trying generated compose fallback" >> "$LOG"
			if reset_generated_wp_env_dirs "$repo" "$now"; then
				did_reset=1
			else
				echo "[$now] wp-env reset failed repo=$repo" >> "$LOG"
			fi
		fi
	done < <(current_repo_roots)
	if [ "$did_reset" = 1 ]; then
		echo "$(epoch)" > "$WP_ENV_RESET_LAST"
	fi
}

csv_field() {
	local value=${1//\"/\"\"}
	printf '"%s"' "$value"
}

write_status() {
	local now=$1 cpu=$2 load=$3 avail=$4 ncpu=$5 enabled=$6 target=$7 max=$8 desired_target=$9 desired_max=${10} action=${11} reason=${12}
	local materialized_active=${13} paused_infra=${14} running_groups=${15} status_counts=${16} stale_seconds=${17} materialization_detail=${18} load5_value=${19} load15_value=${20}
	local data_disk_avail=${21:-unknown} root_disk_avail=${22:-unknown}
	local docker_root_actual=${23:-unknown} docker_root_expected=${24:-$EXPECTED_DOCKER_ROOT} docker_root_ok=${25:-unknown}
	cat > "$STATUS" <<EOF_STATUS
# RTC Jetstream2 Resource Autoscaler

- updated: $now
- cpu_percent: $cpu
- load1: $load / $ncpu cores
- load5: $load5_value / $ncpu cores
- load15: $load15_value / $ncpu cores
- mem_available_gib: $avail
- root_disk_available_gib: $root_disk_avail
- data_disk_available_gib: $data_disk_avail
- docker_root_dir: $docker_root_actual
- expected_docker_root_dir: $docker_root_expected
- docker_root_ok: $docker_root_ok
- enabled_groups: $enabled
- current_budget: target=$target max=$max
- desired_budget: target=$desired_target max=$desired_max
- materialized_active_run_dirs: $materialized_active
- materialized_running_groups: $running_groups
- paused_infra_startup_groups: $paused_infra
- supervisor_state_age_seconds: $stale_seconds
- supervisor_status_counts: $status_counts
- materialization_detail: $materialization_detail
- last_action: $action
- reason: $reason

The controller restarts or scales the coverage-guided loop only after sustained
headroom, pressure, a missing monitor, or a failed materialization invariant.
Requested budget is not treated as success unless the supervisor has live run
directories or running groups.
EOF_STATUS
}

append_csv() {
	local now=$1 cpu=$2 load=$3 avail=$4 ncpu=$5 enabled=$6 target=$7 max=$8 desired_target=$9 desired_max=${10} action=${11} reason=${12}
	local materialized_active=${13} paused_infra=${14} running_groups=${15} status_counts=${16} stale_seconds=${17}
	if [ ! -f "$CSV" ]; then
		printf 'timestamp,cpu_percent,load1,cores,mem_available_gib,enabled_groups,current_target,current_max,desired_target,desired_max,action,reason,materialized_active_run_dirs,paused_infra_startup_groups,materialized_running_groups,supervisor_status_counts,supervisor_state_age_seconds\n' > "$CSV"
	fi
	printf '%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,' "$now" "$cpu" "$load" "$ncpu" "$avail" "$enabled" "$target" "$max" "$desired_target" "$desired_max" >> "$CSV"
	csv_field "$action" >> "$CSV"
	printf ',' >> "$CSV"
	csv_field "$reason" >> "$CSV"
	printf ',%s,%s,%s,' "$materialized_active" "$paused_infra" "$running_groups" >> "$CSV"
	csv_field "$status_counts" >> "$CSV"
	printf ',%s\n' "$stale_seconds" >> "$CSV"
}

append_disk_csv() {
	local now=$1 root_free=$2 root_used=$3 data_free=$4 data_used=$5
	if [ ! -f "$DISK_CSV" ]; then
		printf 'timestamp,root_free_gib,root_used_percent,data_free_gib,data_used_percent\n' > "$DISK_CSV"
	fi
	printf '%s,%s,%s,%s,%s\n' "$now" "${root_free:-}" "${root_used:-}" "${data_free:-}" "${data_used:-}" >> "$DISK_CSV"
}

append_loss_event() {
	local now=$1 event_type=$2 reason=$3 desired_target=$4 desired_max=$5
	local latest=${6:-} materialized_active=${7:-} running_groups=${8:-} status_counts=${9:-}
	if [ ! -f "$LOSS_CSV" ]; then
		printf 'timestamp,event_type,reason,coverage_root,root_age_seconds,full_pass_completed,seconds_since_completed_full_pass,records_seen,current_run_records,coverage_files,materialized_active_run_dirs,materialized_running_groups,supervisor_status_counts,desired_target,desired_max,estimated_lost_seconds,estimated_lost_records\n' > "$LOSS_CSV"
	fi
	node - "$LOSS_CSV" "$now" "$event_type" "$reason" "$desired_target" "$desired_max" "${latest:-}" "${materialized_active:-}" "${running_groups:-}" "${status_counts:-}" <<'NODE'
const fs = require( 'fs' );
const path = require( 'path' );
const [
	csvPath,
	now,
	eventType,
	reason,
	desiredTarget,
	desiredMax,
	root,
	materializedActive,
	runningGroups,
	statusCounts,
] = process.argv.slice( 2 );
const csvField = ( value ) => {
	const text = String( value ?? '' );
	return /[",\n]/.test( text ) ? `"${ text.replaceAll( '"', '""' ) }"` : text;
};
const readJson = ( file ) => {
	try {
		return JSON.parse( fs.readFileSync( file, 'utf8' ) );
	} catch {
		return null;
	}
};
const parseRootEpoch = ( rootPath ) => {
	const base = path.basename( rootPath || '' );
	const match = base.match( /^run-(\d{8})T(\d{6})Z$/ );
	if ( ! match ) {
		return NaN;
	}
	const [ , day, time ] = match;
	return Date.parse(
		`${ day.slice( 0, 4 ) }-${ day.slice( 4, 6 ) }-${ day.slice( 6, 8 ) }T${ time.slice( 0, 2 ) }:${ time.slice( 2, 4 ) }:${ time.slice( 4, 6 ) }Z`
	);
};
const nowMs = Date.parse( now );
const rootMs = parseRootEpoch( root );
const rootAgeSeconds =
	Number.isFinite( nowMs ) && Number.isFinite( rootMs )
		? Math.max( 0, Math.round( ( nowMs - rootMs ) / 1000 ) )
		: '';
const state = root ? readJson( path.join( root, 'novelty-state.json' ) ) : null;
const lastFull = Date.parse(
	state?.lastCompletedFullPassAt || state?.lastFullStatusCompletedAt || ''
);
const fullPassCompleted = Number.isFinite( lastFull ) ? 1 : 0;
const secondsSinceCompletedFullPass =
	fullPassCompleted && Number.isFinite( nowMs )
		? Math.max( 0, Math.round( ( nowMs - lastFull ) / 1000 ) )
		: '';
const recordsSeen = Number( state?.recordsSeen ?? 0 ) || 0;
const currentRunRecords = Object.values(
	state?.currentRunRecordCountsByProfile ?? {}
).reduce( ( total, value ) => total + ( Number( value ) || 0 ), 0 );
let coverageFiles = '';
try {
	const groups = JSON.parse(
		fs.readFileSync( path.join( root, 'supervisor-state.json' ), 'utf8' )
	).groups;
	coverageFiles = Array.isArray( groups )
		? groups.reduce(
				( count, group ) =>
					count +
					( Array.isArray( group.activeRunDirs )
						? group.activeRunDirs.length
						: group.currentRunDir
						? 1
						: 0 ),
				0
		  )
		: '';
} catch {}
const estimatedLostSeconds =
	eventType === 'restart'
		? fullPassCompleted
			? secondsSinceCompletedFullPass || 0
			: rootAgeSeconds || 0
		: 0;
const estimatedLostRecords =
	eventType === 'restart' ? currentRunRecords || recordsSeen || 0 : 0;
fs.appendFileSync(
	csvPath,
	[
		now,
		eventType,
		reason,
		root,
		rootAgeSeconds,
		fullPassCompleted,
		secondsSinceCompletedFullPass,
		recordsSeen,
		currentRunRecords,
		coverageFiles,
		materializedActive,
		runningGroups,
		statusCounts,
		desiredTarget,
		desiredMax,
		estimatedLostSeconds,
		estimatedLostRecords,
	]
		.map( csvField )
		.join( ',' ) + '\n'
);
NODE
}

write_budget_env() {
	local target=$1
	local max=$2
	local multiplier=${3:-1.02}
	local allow_fleet_startup_noise_canary
	local fleet_startup_noise_canary_group
	local allow_empty_materialization_no_product_startup_canary
	local min_enabled_browser_lanes
	local benchmark_canary_bootstrap_reserve_slots
	local benchmark_canary_ws_backfill_slots
	local benchmark_canary_sticky_group_limit
	local benchmark_canary_slot_floor
	local benchmark_canary_strict_slot_floor
	local zero_coverage_benchmark_canary_min_active_groups
	local deadline_coverage_gap_reserved_groups
	local deadline_benchmark_canary_budget_cap=0
	local deadline_benchmark_canary_bootstrap_only
	local slot_floor
	allow_fleet_startup_noise_canary=${RTC_FUZZ_NOVELTY_ALLOW_FLEET_STARTUP_NOISE_CANARY:-$(run_script_value RTC_FUZZ_NOVELTY_ALLOW_FLEET_STARTUP_NOISE_CANARY 0)}
	fleet_startup_noise_canary_group=${RTC_FUZZ_NOVELTY_FLEET_STARTUP_NOISE_CANARY_GROUP:-$(run_script_value RTC_FUZZ_NOVELTY_FLEET_STARTUP_NOISE_CANARY_GROUP novelty-ws-media-cross-entity)}
	allow_empty_materialization_no_product_startup_canary=${RTC_FUZZ_NOVELTY_ALLOW_EMPTY_MATERIALIZATION_NO_PRODUCT_STARTUP_CANARY:-$(run_script_value RTC_FUZZ_NOVELTY_ALLOW_EMPTY_MATERIALIZATION_NO_PRODUCT_STARTUP_CANARY 0)}
	min_enabled_browser_lanes=${RTC_FUZZ_NOVELTY_MIN_ENABLED_BROWSER_LANES:-$(run_script_value RTC_FUZZ_NOVELTY_MIN_ENABLED_BROWSER_LANES '')}
	benchmark_canary_bootstrap_reserve_slots=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS:-$(run_script_value RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS 6)}
	benchmark_canary_ws_backfill_slots=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS:-$(run_script_value RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS 1)}
	benchmark_canary_sticky_group_limit=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT:-$(run_script_value RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT '')}
	benchmark_canary_slot_floor=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR:-$(run_script_value RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR '')}
	benchmark_canary_strict_slot_floor=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR:-$(run_script_value RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR '')}
	zero_coverage_benchmark_canary_min_active_groups=${RTC_FUZZ_NOVELTY_ZERO_COVERAGE_BENCHMARK_CANARY_MIN_ACTIVE_GROUPS:-$(run_script_value RTC_FUZZ_NOVELTY_ZERO_COVERAGE_BENCHMARK_CANARY_MIN_ACTIVE_GROUPS 1)}
	deadline_coverage_gap_reserved_groups=${RTC_FUZZ_NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS:-$(run_script_value RTC_FUZZ_NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS '')}
	deadline_benchmark_canary_bootstrap_only=${RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY:-$(run_script_value RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY '')}
	slot_floor=$(benchmark_canary_slot_floor)
	if [ "${target:-0}" -le 0 ] && [ "${max:-0}" -le 0 ]; then
		min_enabled_browser_lanes=''
		allow_empty_materialization_no_product_startup_canary=0
		benchmark_canary_bootstrap_reserve_slots=0
		benchmark_canary_ws_backfill_slots=0
		benchmark_canary_sticky_group_limit=0
		zero_coverage_benchmark_canary_min_active_groups=0
		deadline_coverage_gap_reserved_groups=0
	elif [ "${max:-0}" -le 4 ]; then
		local low_budget_canary_limit=$target
		[[ "$low_budget_canary_limit" =~ ^[0-9]+$ ]] || low_budget_canary_limit=1
		[ "$low_budget_canary_limit" -lt 1 ] && low_budget_canary_limit=1
		[ "$low_budget_canary_limit" -gt 3 ] && low_budget_canary_limit=3
		[ "$low_budget_canary_limit" -gt "${max:-1}" ] && low_budget_canary_limit=$max
		[ "$low_budget_canary_limit" -lt 1 ] && low_budget_canary_limit=1
		benchmark_canary_bootstrap_reserve_slots=1
		if [ "$low_budget_canary_limit" -ge 3 ] && [ "${max:-0}" -gt "$low_budget_canary_limit" ]; then
			[[ "${benchmark_canary_ws_backfill_slots:-}" =~ ^[0-9]+$ ]] || benchmark_canary_ws_backfill_slots=1
			[ "$benchmark_canary_ws_backfill_slots" -lt 1 ] && benchmark_canary_ws_backfill_slots=1
			[ "$benchmark_canary_ws_backfill_slots" -gt $(( low_budget_canary_limit - 2 )) ] && benchmark_canary_ws_backfill_slots=$(( low_budget_canary_limit - 2 ))
		else
			benchmark_canary_ws_backfill_slots=0
		fi
		benchmark_canary_sticky_group_limit=$low_budget_canary_limit
		zero_coverage_benchmark_canary_min_active_groups=$low_budget_canary_limit
		deadline_coverage_gap_reserved_groups=0
		deadline_benchmark_canary_budget_cap=1
	elif [ "${max:-0}" -le 5 ]; then
		local deadline_canary_limit=$target
		[[ "$deadline_canary_limit" =~ ^[0-9]+$ ]] || deadline_canary_limit=4
		[ "$deadline_canary_limit" -lt 1 ] && deadline_canary_limit=1
		[ "$deadline_canary_limit" -gt "${max:-5}" ] && deadline_canary_limit=$max
		benchmark_canary_bootstrap_reserve_slots=$max
		benchmark_canary_ws_backfill_slots=0
		benchmark_canary_sticky_group_limit=''
		benchmark_canary_slot_floor=''
		benchmark_canary_strict_slot_floor=''
		zero_coverage_benchmark_canary_min_active_groups=$deadline_canary_limit
		deadline_coverage_gap_reserved_groups=0
		deadline_benchmark_canary_budget_cap=1
	else
		case "${benchmark_canary_sticky_group_limit:-}" in
			''|0|1|2|3)
				benchmark_canary_sticky_group_limit=''
				;;
		esac
		if [ "${benchmark_canary_bootstrap_reserve_slots:-0}" -lt 6 ]; then
			benchmark_canary_bootstrap_reserve_slots=6
		fi
		if [[ "$slot_floor" =~ ^[0-9]+$ ]] && [ "$slot_floor" -gt "$benchmark_canary_bootstrap_reserve_slots" ]; then
			benchmark_canary_bootstrap_reserve_slots=$slot_floor
		fi
		if [[ "$slot_floor" =~ ^[0-9]+$ ]] && [ "$slot_floor" -gt 0 ]; then
			benchmark_canary_slot_floor=$slot_floor
			benchmark_canary_strict_slot_floor=1
		fi
		if [[ "$slot_floor" =~ ^[0-9]+$ ]] && [ "$slot_floor" -ge 10 ]; then
			benchmark_canary_ws_backfill_slots=0
		elif [[ "$max" =~ ^[0-9]+$ ]] && [ "$max" -ge 10 ] && [ "${benchmark_canary_ws_backfill_slots:-0}" -lt 3 ]; then
			benchmark_canary_ws_backfill_slots=3
		fi
	fi
	if [ -z "$deadline_benchmark_canary_bootstrap_only" ]; then
		if [ "$deadline_benchmark_canary_budget_cap" = "1" ]; then
			deadline_benchmark_canary_bootstrap_only=1
		else
			deadline_benchmark_canary_bootstrap_only=0
		fi
	fi
	cat > "$BUDGET_ENV" <<EOF_BUDGET
export RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS='$target'
export RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS='$max'
export RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS='$target'
export RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS='$max'
export RTC_FUZZ_NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS='$max'
export RTC_FUZZ_NOVELTY_MIN_ENABLED_BROWSER_LANES='$min_enabled_browser_lanes'
export RTC_FUZZ_NOVELTY_LOAD_HEADROOM_MULTIPLIER='$multiplier'
export RTC_FUZZ_NOVELTY_ALLOW_FLEET_STARTUP_NOISE_CANARY='$allow_fleet_startup_noise_canary'
export RTC_FUZZ_NOVELTY_FLEET_STARTUP_NOISE_CANARY_GROUP='$fleet_startup_noise_canary_group'
export RTC_FUZZ_NOVELTY_ALLOW_EMPTY_MATERIALIZATION_NO_PRODUCT_STARTUP_CANARY='$allow_empty_materialization_no_product_startup_canary'
export RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS='$benchmark_canary_bootstrap_reserve_slots'
export RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS='$benchmark_canary_ws_backfill_slots'
export RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT='$benchmark_canary_sticky_group_limit'
export RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR='$benchmark_canary_slot_floor'
export RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR='$benchmark_canary_strict_slot_floor'
export RTC_FUZZ_NOVELTY_ZERO_COVERAGE_BENCHMARK_CANARY_MIN_ACTIVE_GROUPS='$zero_coverage_benchmark_canary_min_active_groups'
export RTC_FUZZ_NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS='$deadline_coverage_gap_reserved_groups'
export RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP='$deadline_benchmark_canary_budget_cap'
export RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY='$deadline_benchmark_canary_bootstrap_only'
EOF_BUDGET
}

rewrite_current_run_budget_exports() {
	local target=$1 max=$2 latest
	latest=$(latest_run)
	[ -n "$latest" ] && [ -f "$latest/run-monitor.sh" ] || return 0
	node - "$latest/run-monitor.sh" "$target" "$max" <<'NODE'
const fs = require( 'fs' );
const [ file, target, max ] = process.argv.slice( 2 );
let lines = fs.readFileSync( file, 'utf8' ).split( /\n/ );
const existingDeadlineReserve =
	lines
		.map( ( line ) =>
			line.match(
				/^export RTC_FUZZ_NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS='([^']*)'/
			)
		)
		.filter( Boolean )
		.map( ( match ) => match[ 1 ] )
		.pop() || '';
const exportNames = new Set( [
	'RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS',
	'RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS',
	'RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS',
	'RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS',
	'RTC_FUZZ_NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS',
	'RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS',
	'RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS',
	'RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT',
	'RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR',
	'RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR',
	'RTC_FUZZ_NOVELTY_ZERO_COVERAGE_BENCHMARK_CANARY_MIN_ACTIVE_GROUPS',
	'RTC_FUZZ_NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS',
	'RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP',
	'RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY',
] );
lines = lines.filter( ( line ) => {
	const match = line.match( /^export ([A-Z0-9_]+)=/ );
	return ! match || ! exportNames.has( match[ 1 ] );
} );
const targetNumber = Math.max( 0, Number.parseInt( target, 10 ) || 0 );
const maxNumber = Math.max( 0, Number.parseInt( max, 10 ) || 0 );
const disabledBudget = targetNumber <= 0 && maxNumber <= 0;
const strictLowBudget = ! disabledBudget && maxNumber <= 4;
const deadlineBudgetCap = ! disabledBudget && maxNumber <= 5;
const lowBudgetCanaryLimit = strictLowBudget
	? String( Math.max( 1, Math.min( 3, targetNumber || 1, maxNumber || 1 ) ) )
	: '';
const deadlineCanaryLimit =
	! strictLowBudget && deadlineBudgetCap
		? String( Math.max( 1, Math.min( targetNumber || 4, maxNumber || 5 ) ) )
		: '';
const lowBudgetWsBackfillSlots =
	strictLowBudget &&
	Number.parseInt( lowBudgetCanaryLimit, 10 ) >= 3 &&
	maxNumber > Number.parseInt( lowBudgetCanaryLimit, 10 )
		? String(
				Math.max(
					1,
					Math.min(
						Number.parseInt( lowBudgetCanaryLimit, 10 ) - 2,
						1
					)
				)
		  )
		: '0';
const benchmarkCanaryBootstrapReserveSlots = disabledBudget
	? '0'
	: strictLowBudget
	? '1'
	: deadlineBudgetCap
	? String( maxNumber )
	: String( Math.max( 6, maxNumber ) );
const benchmarkCanaryWsBackfillSlots = disabledBudget
	? '0'
	: strictLowBudget
	? lowBudgetWsBackfillSlots
	: deadlineBudgetCap
	? '0'
	: maxNumber >= 10
	? '3'
	: '1';
const benchmarkCanaryStickyGroupLimit = disabledBudget
	? '0'
	: strictLowBudget
	? lowBudgetCanaryLimit
	: '';
const benchmarkCanarySlotFloor =
	! disabledBudget && maxNumber > 5 ? String( maxNumber ) : '';
const benchmarkCanaryStrictSlotFloor = benchmarkCanarySlotFloor ? '1' : '0';
const zeroCoverageBenchmarkCanaryMinActiveGroups = disabledBudget
	? '0'
	: strictLowBudget
	? lowBudgetCanaryLimit
	: deadlineBudgetCap
	? deadlineCanaryLimit
	: '1';
const deadlineCoverageGapReservedGroups =
	disabledBudget || strictLowBudget || deadlineBudgetCap
		? '0'
		: existingDeadlineReserve;
const deadlineBenchmarkCanaryBudgetCap =
	! disabledBudget && ( strictLowBudget || deadlineBudgetCap ) ? '1' : '0';
const deadlineBenchmarkCanaryBootstrapOnly =
	deadlineBenchmarkCanaryBudgetCap === '1' ? '1' : '0';
const exportLines = [
	[ 'RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS', target ],
	[ 'RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS', max ],
	[ 'RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS', target ],
	[ 'RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS', max ],
	[ 'RTC_FUZZ_NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS', max ],
	[
		'RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS',
		benchmarkCanaryBootstrapReserveSlots,
	],
	[
		'RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS',
		benchmarkCanaryWsBackfillSlots,
	],
	[
		'RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT',
		benchmarkCanaryStickyGroupLimit,
	],
	[
		'RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR',
		benchmarkCanarySlotFloor,
	],
	[
		'RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR',
		benchmarkCanaryStrictSlotFloor,
	],
	[
		'RTC_FUZZ_NOVELTY_ZERO_COVERAGE_BENCHMARK_CANARY_MIN_ACTIVE_GROUPS',
		zeroCoverageBenchmarkCanaryMinActiveGroups,
	],
	[
		'RTC_FUZZ_NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS',
		deadlineCoverageGapReservedGroups,
	],
	[
		'RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP',
		deadlineBenchmarkCanaryBudgetCap,
	],
	[
		'RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY',
		deadlineBenchmarkCanaryBootstrapOnly,
	],
	].map( ( [ name, value ] ) => `export ${ name }='${ value }'` );
const nodeIndex = lines.findIndex( ( line ) =>
	line.includes( 'node bin/rtc-browser-fuzz-novelty-monitor.mjs' )
);
if ( nodeIndex === -1 ) {
		lines.push( ...exportLines );
	} else {
		lines.splice( nodeIndex, 0, ...exportLines );
	};
fs.writeFileSync( file, lines.join( '\n' ) );
NODE
}

coverage_root_live_for_in_place_budget() {
	local latest state_path groups_path
	latest=$(latest_run)
	[ -n "$latest" ] || return 1
	state_path="$latest/supervisor-state.json"
	groups_path="$latest/supervisor-groups.json"
	[ -s "$state_path" ] && [ -s "$groups_path" ] || return 1
	tmux_cmd has-session -t rtc-coverage-guided-supervisor 2>/dev/null || return 1
	node - "$state_path" "$latest" <<'NODE'
const fs = require( 'fs' );
const [ statePath, expectedRoot ] = process.argv.slice( 2 );
try {
	const state = JSON.parse( fs.readFileSync( statePath, 'utf8' ) );
	process.exit( state.outputDir === expectedRoot ? 0 : 1 );
} catch {
	process.exit( 1 );
}
NODE
}

apply_in_place_coverage_budget() {
	local desired_target=$1 desired_max=$2 reason=$3 mode=${4:-ordinary}
	local latest groups_path before after sticky_limit
	[[ "$desired_target" =~ ^[0-9]+$ ]] || desired_target=1
	[[ "$desired_max" =~ ^[0-9]+$ ]] || desired_max=$desired_target
	if [ "$desired_max" -lt "$desired_target" ]; then
		desired_max=$desired_target
	fi
	coverage_root_live_for_in_place_budget || return 1
	latest=$(latest_run)
	groups_path="$latest/supervisor-groups.json"
	before=$(node -e "const fs=require('fs'); const groups=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); console.log(Array.isArray(groups)?groups.length:0)" "$groups_path" 2>/dev/null || echo 0)
	write_budget_env "$desired_target" "$desired_max" 1.02
	sticky_limit=$(budget_env_value RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT '')
	rewrite_current_run_budget_exports "$desired_target" "$desired_max"
	node - "$groups_path" "$latest/novelty-state.json" "$desired_max" "$mode" "$sticky_limit" "$reason" "$POLICY_REQUIRED_COVERAGE_GROUPS" <<'NODE'
const fs = require( 'fs' );
const [
	groupsPath,
	statePath,
	desiredMaxRaw,
	mode,
	stickyLimitRaw,
	reason,
	policyRequiredRaw,
] =
	process.argv.slice( 2 );
const deadlineFinalizationBenchmarkGroups = new Set( [
	'novelty-http-large-post-lifecycle',
	'novelty-http-persistence-probe',
	'novelty-ws-collaboration-ui-signals',
	'novelty-ws-multi-reload-lifecycle',
	'novelty-ws-parser-serialization',
] );
const stickyBenchmarkGroups = new Set( [
	'novelty-http-table-stale-snapshot',
	'novelty-http-list-move-refresh',
	'novelty-http-large-post-readiness',
	'novelty-http-large-post-lifecycle',
	'novelty-http-large-post-lifecycle-completion',
	'novelty-http-same-user-stale-draft',
	'novelty-http-title-reload-convergence',
	'novelty-http-existing-post-crdt-metadata',
	'novelty-http-provider-persisted-crdt-large-post',
	'novelty-http-persistence-probe',
] );
let desiredMax = Math.max( 0, Number.parseInt( desiredMaxRaw, 10 ) || 0 );
const parsedStickyLimit = Number.parseInt( stickyLimitRaw || '', 10 );
const stickyLimit = Number.isFinite( parsedStickyLimit )
	? Math.max( 0, parsedStickyLimit )
	: Number.POSITIVE_INFINITY;
const policyRequiredGroups = new Set(
	String( policyRequiredRaw || '' )
		.split( /[,: ]+/ )
		.map( ( group ) => group.trim() )
		.filter( Boolean )
);
const preferredBenchmarkGroups =
	reason === 'deadline_benchmark_canary_cap'
		? deadlineFinalizationBenchmarkGroups
		: stickyBenchmarkGroups;
let groups = JSON.parse( fs.readFileSync( groupsPath, 'utf8' ) );
if ( ! Array.isArray( groups ) ) {
	process.exit( 1 );
}
if ( mode === 'down' && groups.length > desiredMax ) {
	const policyGroups = groups.filter( ( group ) =>
		policyRequiredGroups.has( group?.name )
	);
	const policyGroupNames = new Set(
		policyGroups.map( ( group ) => group?.name ).filter( Boolean )
	);
	const stickyGroups = groups.filter(
		( group ) =>
			preferredBenchmarkGroups.has( group?.name ) &&
			! policyGroupNames.has( group?.name )
	);
	const effectiveDesiredMax = Math.max( desiredMax, policyGroups.length );
	const stickySlots = Math.max( 0, effectiveDesiredMax - policyGroups.length );
	const keptStickyGroups = stickyGroups.slice(
		0,
		Math.min( stickyLimit, stickySlots )
	);
	const otherGroups = groups.filter(
		( group ) =>
			! policyGroupNames.has( group?.name ) &&
			! preferredBenchmarkGroups.has( group?.name )
	);
	groups = [
		...policyGroups,
		...keptStickyGroups,
		...otherGroups,
	].slice( 0, effectiveDesiredMax );
	fs.writeFileSync(
		groupsPath,
		`${ JSON.stringify( groups, null, '\t' ) }\n`
	);
	try {
		const state = JSON.parse( fs.readFileSync( statePath, 'utf8' ) );
		if ( Array.isArray( state.enabledGroups ) ) {
			const kept = new Set(
				groups.map( ( group ) => group?.name ).filter( Boolean )
			);
			state.enabledGroups = state.enabledGroups.filter( ( name ) =>
				kept.has( name )
			);
			fs.writeFileSync(
				statePath,
				`${ JSON.stringify( state, null, '\t' ) }\n`
			);
		}
	} catch {}
}
NODE
	after=$(node -e "const fs=require('fs'); const groups=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); console.log(Array.isArray(groups)?groups.length:0)" "$groups_path" 2>/dev/null || echo 0)
	append_loss_event "$(stamp)" "in_place_budget" "$reason" "$desired_target" "$desired_max" "$latest" "" "" "groups:${before}->${after}"
	echo "[$(stamp)] adjusted coverage-guided budget in-place target=$desired_target max=$desired_max reason=$reason mode=$mode groups=${before}->${after} root=$latest" >> "$LOG"
	return 0
}

write_materialization_diagnostic() {
	local now=$1 state_path=$2 enabled=$3 target=$4 max=$5 active=$6 paused=$7 running=$8 status_counts=$9 stale_seconds=${10} detail=${11}
	local latest out_file
	latest=$(latest_run)
	out_file="$MATERIALIZATION_DIR/materialization-${now//:/}.md"
	{
		echo "# RTC Coverage Materialization Remediation"
		echo
		echo "- at: $now"
		echo "- latest_run: ${latest:-none}"
		echo "- supervisor_state: $state_path"
		echo "- enabled_groups: $enabled"
		echo "- requested_budget: target=$target max=$max"
		echo "- materialized_active_run_dirs: $active"
		echo "- materialized_running_groups: $running"
		echo "- paused_infra_startup_groups: $paused"
		echo "- supervisor_status_counts: $status_counts"
		echo "- supervisor_state_age_seconds: $stale_seconds"
		echo "- materialization_detail: $detail"
		echo
		echo "## tmux"
		tmux_cmd ls 2>&1 | sed -n '1,120p' || true
		echo
		echo "## Coverage Processes"
		ps -eo pid,ppid,etimes,cmd |
			grep -E 'rtc-browser-fuzz-(novelty-monitor|supervisor)|rtc-coverage-guided' |
			grep -v grep |
			sed -n '1,120p' || true
		echo
		echo "## Docker Summary"
		timeout 20s docker system df 2>&1 | sed -n '1,120p' || true
		echo
		echo "## Recent wp-env Start Logs"
		if [ -n "$latest" ]; then
			for file in "$latest"/*-wp-env-start*.log; do
				[ -f "$file" ] || continue
				echo
				echo "### $(basename "$file")"
				tail -80 "$file" || true
			done
		fi
	} > "$out_file"
	ln -sfn "$out_file" "$MATERIALIZATION_DIR/latest.md"
	echo "[$now] wrote materialization diagnostic $out_file" >> "$LOG"
}

restart_coverage() {
	local desired_target=$1
	local desired_max=$2
	local reason=$3
	local latest_before
	local allow_fleet_startup_noise_canary
	local fleet_startup_noise_canary_group
	local allow_empty_materialization_no_product_startup_canary
	local min_enabled_browser_lanes
	local benchmark_canary_ws_backfill_slots
	local benchmark_canary_sticky_group_limit
	local benchmark_canary_bootstrap_reserve_slots
	local benchmark_canary_slot_floor
	local benchmark_canary_strict_slot_floor
	local zero_coverage_benchmark_canary_min_active_groups
	local deadline_coverage_gap_reserved_groups
	local deadline_benchmark_canary_budget_cap=0
	local deadline_benchmark_canary_bootstrap_only
	local slot_floor
	local start_rc=0
	[[ "$desired_target" =~ ^[0-9]+$ ]] || desired_target=1
	[[ "$desired_max" =~ ^[0-9]+$ ]] || desired_max=$desired_target
	if [ "$desired_max" -lt "$desired_target" ]; then
		desired_max=$desired_target
	fi
	restart_coverage_deferred=0
	if should_defer_budget_restart_for_first_pass "$reason" "$desired_target" "$desired_max"; then
		echo "[$(stamp)] deferring coverage-guided restart target=$desired_target max=$desired_max reason=$reason: active root full pass pending" >> "$LOG"
		action="${action}_deferred_first_pass"
		restart_coverage_deferred=1
		return 0
	fi
	allow_fleet_startup_noise_canary=${RTC_FUZZ_NOVELTY_ALLOW_FLEET_STARTUP_NOISE_CANARY:-$(run_script_value RTC_FUZZ_NOVELTY_ALLOW_FLEET_STARTUP_NOISE_CANARY 0)}
	fleet_startup_noise_canary_group=${RTC_FUZZ_NOVELTY_FLEET_STARTUP_NOISE_CANARY_GROUP:-$(run_script_value RTC_FUZZ_NOVELTY_FLEET_STARTUP_NOISE_CANARY_GROUP novelty-ws-media-cross-entity)}
	allow_empty_materialization_no_product_startup_canary=${RTC_FUZZ_NOVELTY_ALLOW_EMPTY_MATERIALIZATION_NO_PRODUCT_STARTUP_CANARY:-$(run_script_value RTC_FUZZ_NOVELTY_ALLOW_EMPTY_MATERIALIZATION_NO_PRODUCT_STARTUP_CANARY 0)}
	min_enabled_browser_lanes=${RTC_FUZZ_NOVELTY_MIN_ENABLED_BROWSER_LANES:-$(run_script_value RTC_FUZZ_NOVELTY_MIN_ENABLED_BROWSER_LANES '')}
	benchmark_canary_ws_backfill_slots=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS:-$(run_script_value RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS 1)}
	benchmark_canary_sticky_group_limit=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT:-$(run_script_value RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT '')}
	benchmark_canary_bootstrap_reserve_slots=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS:-$(run_script_value RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS 6)}
	benchmark_canary_slot_floor=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR:-$(run_script_value RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR '')}
	benchmark_canary_strict_slot_floor=${RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR:-$(run_script_value RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR '')}
	zero_coverage_benchmark_canary_min_active_groups=${RTC_FUZZ_NOVELTY_ZERO_COVERAGE_BENCHMARK_CANARY_MIN_ACTIVE_GROUPS:-$(run_script_value RTC_FUZZ_NOVELTY_ZERO_COVERAGE_BENCHMARK_CANARY_MIN_ACTIVE_GROUPS 1)}
	deadline_coverage_gap_reserved_groups=${RTC_FUZZ_NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS:-$(run_script_value RTC_FUZZ_NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS '')}
	deadline_benchmark_canary_bootstrap_only=${RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY:-$(run_script_value RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY '')}
	slot_floor=$(benchmark_canary_slot_floor)
	if [ "${desired_target:-0}" -le 0 ] && [ "${desired_max:-0}" -le 0 ]; then
		min_enabled_browser_lanes=''
		allow_empty_materialization_no_product_startup_canary=0
		benchmark_canary_bootstrap_reserve_slots=0
		benchmark_canary_ws_backfill_slots=0
		benchmark_canary_sticky_group_limit=0
		benchmark_canary_slot_floor=''
		benchmark_canary_strict_slot_floor=''
		zero_coverage_benchmark_canary_min_active_groups=0
		deadline_coverage_gap_reserved_groups=0
	elif [ "${desired_max:-0}" -le 4 ]; then
		local low_budget_canary_limit=$desired_target
		[[ "$low_budget_canary_limit" =~ ^[0-9]+$ ]] || low_budget_canary_limit=1
		[ "$low_budget_canary_limit" -lt 1 ] && low_budget_canary_limit=1
		[ "$low_budget_canary_limit" -gt 3 ] && low_budget_canary_limit=3
		[ "$low_budget_canary_limit" -gt "${desired_max:-1}" ] && low_budget_canary_limit=$desired_max
		[ "$low_budget_canary_limit" -lt 1 ] && low_budget_canary_limit=1
		benchmark_canary_bootstrap_reserve_slots=1
		if [ "$low_budget_canary_limit" -ge 3 ]; then
			[[ "${benchmark_canary_ws_backfill_slots:-}" =~ ^[0-9]+$ ]] || benchmark_canary_ws_backfill_slots=1
			[ "$benchmark_canary_ws_backfill_slots" -lt 1 ] && benchmark_canary_ws_backfill_slots=1
			[ "$benchmark_canary_ws_backfill_slots" -gt $(( low_budget_canary_limit - 2 )) ] && benchmark_canary_ws_backfill_slots=$(( low_budget_canary_limit - 2 ))
		else
			benchmark_canary_ws_backfill_slots=0
		fi
		benchmark_canary_sticky_group_limit=$low_budget_canary_limit
		benchmark_canary_slot_floor=''
		benchmark_canary_strict_slot_floor=''
		zero_coverage_benchmark_canary_min_active_groups=$low_budget_canary_limit
		deadline_coverage_gap_reserved_groups=0
		deadline_benchmark_canary_budget_cap=1
	elif [ "${desired_max:-0}" -le 5 ]; then
		local deadline_canary_limit=$desired_target
		[[ "$deadline_canary_limit" =~ ^[0-9]+$ ]] || deadline_canary_limit=4
		[ "$deadline_canary_limit" -lt 1 ] && deadline_canary_limit=1
		[ "$deadline_canary_limit" -gt "${desired_max:-5}" ] && deadline_canary_limit=$desired_max
		benchmark_canary_bootstrap_reserve_slots=$desired_max
		benchmark_canary_ws_backfill_slots=0
		benchmark_canary_sticky_group_limit=''
		benchmark_canary_slot_floor=''
		benchmark_canary_strict_slot_floor=''
		zero_coverage_benchmark_canary_min_active_groups=$deadline_canary_limit
		deadline_coverage_gap_reserved_groups=0
		deadline_benchmark_canary_budget_cap=1
	else
		case "${benchmark_canary_sticky_group_limit:-}" in
			''|0|1|2|3)
				benchmark_canary_sticky_group_limit=''
				;;
		esac
		if [ "${benchmark_canary_bootstrap_reserve_slots:-0}" -lt 6 ]; then
			benchmark_canary_bootstrap_reserve_slots=6
		fi
		if [[ "$slot_floor" =~ ^[0-9]+$ ]] && [ "$slot_floor" -gt "$benchmark_canary_bootstrap_reserve_slots" ]; then
			benchmark_canary_bootstrap_reserve_slots=$slot_floor
		fi
		if [[ "$slot_floor" =~ ^[0-9]+$ ]] && [ "$slot_floor" -gt 0 ]; then
			benchmark_canary_slot_floor=$slot_floor
			benchmark_canary_strict_slot_floor=1
		fi
		if [[ "$slot_floor" =~ ^[0-9]+$ ]] && [ "$slot_floor" -ge 10 ]; then
			benchmark_canary_ws_backfill_slots=0
		elif [[ "$desired_max" =~ ^[0-9]+$ ]] && [ "$desired_max" -ge 10 ] && [ "${benchmark_canary_ws_backfill_slots:-0}" -lt 3 ]; then
			benchmark_canary_ws_backfill_slots=3
		fi
	fi
	if [ -z "$deadline_benchmark_canary_bootstrap_only" ]; then
		if [ "$deadline_benchmark_canary_budget_cap" = "1" ]; then
			deadline_benchmark_canary_bootstrap_only=1
		else
			deadline_benchmark_canary_bootstrap_only=0
		fi
	fi
	latest_before=$(latest_run)
	append_loss_event "$(stamp)" "restart" "$reason" "$desired_target" "$desired_max" "$latest_before" "${materialized_active_run_dirs:-}" "${materialized_running_groups:-}" "${supervisor_status_counts:-}"
	echo "[$(stamp)] restarting coverage-guided loop target=$desired_target max=$desired_max reason=$reason previous_root=${latest_before:-none}" >> "$LOG"
	write_budget_env "$desired_target" "$desired_max" 1.02
	RTC_COVERAGE_CLEANUP_KEEP_WATCHDOG=1 \
	RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS="$desired_target" \
	RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS="$desired_max" \
	RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_TARGET_ENABLED_GROUPS="$desired_target" \
	RTC_FUZZ_NOVELTY_COVERAGE_GUIDED_MAX_ENABLED_GROUPS="$desired_max" \
	RTC_FUZZ_NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS="$desired_max" \
	RTC_FUZZ_NOVELTY_MIN_ENABLED_BROWSER_LANES="$min_enabled_browser_lanes" \
	RTC_FUZZ_NOVELTY_LOAD_HEADROOM_MULTIPLIER=1.02 \
	RTC_FUZZ_NOVELTY_ALLOW_FLEET_STARTUP_NOISE_CANARY="$allow_fleet_startup_noise_canary" \
	RTC_FUZZ_NOVELTY_FLEET_STARTUP_NOISE_CANARY_GROUP="$fleet_startup_noise_canary_group" \
	RTC_FUZZ_NOVELTY_ALLOW_EMPTY_MATERIALIZATION_NO_PRODUCT_STARTUP_CANARY="$allow_empty_materialization_no_product_startup_canary" \
	RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_BOOTSTRAP_RESERVE_SLOTS="$benchmark_canary_bootstrap_reserve_slots" \
	RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_WS_BACKFILL_SLOTS="$benchmark_canary_ws_backfill_slots" \
	RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STICKY_GROUP_LIMIT="$benchmark_canary_sticky_group_limit" \
	RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_SLOT_FLOOR="$benchmark_canary_slot_floor" \
	RTC_FUZZ_NOVELTY_BENCHMARK_CANARY_STRICT_SLOT_FLOOR="$benchmark_canary_strict_slot_floor" \
	RTC_FUZZ_NOVELTY_ZERO_COVERAGE_BENCHMARK_CANARY_MIN_ACTIVE_GROUPS="$zero_coverage_benchmark_canary_min_active_groups" \
	RTC_FUZZ_NOVELTY_DEADLINE_COVERAGE_GAP_RESERVED_GROUPS="$deadline_coverage_gap_reserved_groups" \
	RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BUDGET_CAP="$deadline_benchmark_canary_budget_cap" \
	RTC_FUZZ_NOVELTY_DEADLINE_BENCHMARK_CANARY_BOOTSTRAP_ONLY="$deadline_benchmark_canary_bootstrap_only" \
		"$START" >> "$LOG" 2>&1 9>&- || start_rc=$?
	if [ "$start_rc" -ne 0 ]; then
		echo "[$(stamp)] coverage-guided start script exited rc=$start_rc reason=$reason" >> "$LOG"
	fi
	if [ -x "$WATCHDOG_START" ]; then
		echo "[$(stamp)] ensuring coverage-guided watchdog after restart reason=$reason" >> "$LOG"
		"$WATCHDOG_START" >> "$LOG" 2>&1 9>&- || echo "[$(stamp)] coverage-guided watchdog start failed reason=$reason" >> "$LOG"
	else
		echo "[$(stamp)] coverage-guided watchdog launcher missing or not executable: $WATCHDOG_START" >> "$LOG"
	fi
}

stop_browser_sessions_for_docker_root_mismatch() {
	local now=$1
	local actual=${2:-unknown}
	local session
	echo "[$now] Docker data-root mismatch: actual=$actual expected=$EXPECTED_DOCKER_ROOT; stopping Docker-backed fuzzing to protect root disk" >> "$LOG"
	for session in \
		rtc-coverage-guided-novelty \
		rtc-coverage-guided-supervisor \
		rtc-coverage-guided-watchdog \
		rtc-fuzz-strict-expansion \
		rtc-fuzz-strict-expansion-watchdog \
		rtc-focused-shards \
		rtc-focused-shards-watchdog \
		rtc-gap-booster \
		rtc-gap-booster-watchdog \
		rtc-operator-correctness-fuzz \
		rtc-operator-correctness-watchdog; do
		if tmux_cmd has-session -t "$session" 2>/dev/null; then
			echo "[$now] stopping $session due to Docker data-root mismatch" >> "$LOG"
			tmux_cmd kill-session -t "$session" 2>/dev/null || true
		fi
	done
	while IFS= read -r session; do
		[ -n "$session" ] || continue
		echo "[$now] stopping $session due to Docker data-root mismatch" >> "$LOG"
		tmux_cmd kill-session -t "$session" 2>/dev/null || true
	done < <(tmux_cmd list-sessions -F '#S' 2>/dev/null | grep -E '^(rtc-focused-shards(-watchdog|-analysis)?-append-|rtc-cov-deep-novelty-)' || true)
}

echo "[$(stamp)] resource autoscaler started base=$BASE" >> "$LOG"
# Treat autoscaler process startup as a recent restart for scale-up purposes.
# Otherwise restarting the controller itself can bypass the startup-ramp
# cooldown and fan out a cold coverage-guided browser run.
last_restart_epoch=$(epoch)
up_streak=0
down_streak=0

while true; do
	cleanup_orphan_monitors
	now=$(stamp)
	cpu=$(cpu_percent)
	load=$(load1)
	load_five=$(load5)
	load_fifteen=$(load15)
	avail=$(mem_available_gib)
	disk_avail=$(disk_available_gib "$DISK_VOLUME")
	root_disk_avail=$(disk_available_gib "$ROOT_DISK_VOLUME")
	disk_used=$(disk_used_percent "$DISK_VOLUME")
	root_disk_used=$(disk_used_percent "$ROOT_DISK_VOLUME")
	prune_inactive_coverage_roots_if_needed "$now" "$disk_avail" || true
	disk_avail=$(disk_available_gib "$DISK_VOLUME")
	disk_used=$(disk_used_percent "$DISK_VOLUME")
	docker_root_actual=$(docker_root_dir)
	docker_root_ok=unknown
	if [ -n "$docker_root_actual" ]; then
		if docker_root_is_misconfigured "$docker_root_actual"; then
			docker_root_ok=0
		else
			docker_root_ok=1
		fi
	fi
	ncpu=$(cores)
	enabled=$(enabled_groups)
	target=$(current_target)
	max=$(current_max)
	if [ "$docker_root_ok" = 0 ]; then
		action=docker_root_misconfigured_stop
		reason=docker_root_misconfigured
		desired_target=0
		desired_max=0
		stop_browser_sessions_for_docker_root_mismatch "$now" "$docker_root_actual"
		append_csv "$now" "$cpu" "$load" "$avail" "$ncpu" "$enabled" "$target" "$max" "$desired_target" "$desired_max" "$action" "$reason" 0 0 0 "docker-root-misconfigured" 0
		append_disk_csv "$now" "$root_disk_avail" "$root_disk_used" "$disk_avail" "$disk_used"
		write_status "$now" "$cpu" "$load" "$avail" "$ncpu" "$enabled" "$target" "$max" "$desired_target" "$desired_max" "$action" "$reason" 0 0 0 "docker-root-misconfigured" 0 "docker-root-misconfigured" "$load_five" "$load_fifteen" "$disk_avail" "$root_disk_avail" "$docker_root_actual" "$EXPECTED_DOCKER_ROOT" "$docker_root_ok"
		sleep "$POLL_SECONDS" 9>&-
		continue
	fi
	read -r desired_target desired_max reason <<<"$(choose_budget "$cpu" "$load" "$load_five" "$load_fifteen" "$avail" "$ncpu")"
	read -r desired_target desired_max reason <<<"$(apply_disk_budget "$desired_target" "$desired_max" "$reason" "$disk_avail" "$root_disk_avail")"
	read -r desired_target desired_max <<<"$(apply_coverage_breadth_floor "$desired_target" "$desired_max" "$reason")"
	read -r desired_target desired_max reason <<<"$(apply_deadline_benchmark_canary_budget_cap "$desired_target" "$desired_max" "$reason" "$disk_avail" "$root_disk_avail" "$cpu" "$load" "$load_five" "$ncpu")"
	read -r desired_target desired_max reason <<<"$(apply_benchmark_canary_finalization_ceiling "$desired_target" "$desired_max" "$reason")"
	browser_live_lanes=$(live_browser_lane_pids_all_roots)
	e2e_floor=${RTC_RESOURCE_AUTOSCALER_E2E_MIN_LIVE_LANES:-24}
	e2e_repair_target=${RTC_RESOURCE_AUTOSCALER_E2E_REPAIR_TARGET_GROUPS:-9}
	e2e_repair_max=${RTC_RESOURCE_AUTOSCALER_E2E_REPAIR_MAX_GROUPS:-10}
	if deadline_benchmark_canary_budget_cap_active; then
		e2e_floor=0
		e2e_repair_target="$desired_target"
		e2e_repair_max="$desired_max"
	fi
	if [ "$ONE_CANARY_MATERIALIZATION_RESCUE" = 1 ] &&
			[ "${MIN_COVERAGE_BREADTH_GROUPS:-1}" -lt "$e2e_repair_target" ]; then
		e2e_repair_target=$MIN_COVERAGE_BREADTH_GROUPS
		e2e_repair_max=$MIN_COVERAGE_BREADTH_GROUPS
	fi
	if [ "${browser_live_lanes:-0}" -lt "$e2e_floor" ] &&
			e2e_floor_repair_allowed "$reason" "$cpu" "$load" "$load_five" "$ncpu" &&
			[ "$desired_target" -lt "$e2e_repair_target" ]; then
		desired_target="$e2e_repair_target"
		desired_max="$e2e_repair_max"
		reason=e2e_floor_repair
	fi
	if e2e_floor_repair_allowed "$reason" "$cpu" "$load" "$load_five" "$ncpu" &&
			[ "${desired_target:-0}" -lt "${target:-0}" ] &&
			[ "${enabled:-0}" -gt "${desired_target:-0}" ]; then
		projected_browser_lanes=$(( ${browser_live_lanes:-0} - ( ${enabled:-0} - ${desired_target:-0} ) ))
		if [ "$projected_browser_lanes" -lt "$e2e_floor" ]; then
			desired_target="$target"
			desired_max="$max"
			reason=e2e_floor_repair
		fi
	fi
	action=observe
	IFS=$'\t' read -r supervisor_state_path materialized_group_count materialized_active_run_dirs paused_infra_startup_groups materialized_running_groups supervisor_status_counts supervisor_state_age_seconds materialization_detail <<<"$(materialization_snapshot)"
	benchmark_canary_live_floor=$(benchmark_canary_slot_floor 2>/dev/null || printf '0')
	[[ "$benchmark_canary_live_floor" =~ ^[0-9]+$ ]] || benchmark_canary_live_floor=0
	if [ "$reason" = "deadline_benchmark_canary_cap" ] &&
			[ "${enabled:-0}" -gt 0 ] &&
			[ "${materialized_active_run_dirs:-0}" -ge "${enabled:-0}" ] &&
			[ "${materialized_running_groups:-0}" -ge "${enabled:-0}" ] &&
			[ "${desired_target:-0}" -gt "${enabled:-0}" ] &&
			[ "$benchmark_canary_live_floor" -le "${enabled:-0}" ] &&
			! deadline_benchmark_canary_productive_budget_allowed \
				"$reason" "$disk_avail" "$root_disk_avail" "$cpu" "$load" "$load_five" "$ncpu"; then
		desired_target=$enabled
		desired_max=$enabled
	fi
	ramp_base_target=${target:-0}
	if [ "${materialized_active_run_dirs:-0}" -eq 0 ] &&
			[ "${materialized_running_groups:-0}" -eq 0 ] &&
			printf '%s' "$supervisor_status_counts" | grep -Eq '^(unknown|starting:[1-9])'; then
		ramp_base_target=0
	fi
	if [ "$desired_target" -gt "${ramp_base_target:-0}" ]; then
		read -r desired_target desired_max <<<"$(ramp_startup_target "$ramp_base_target" "$desired_target" "$desired_max")"
		read -r desired_target desired_max reason <<<"$(apply_deadline_benchmark_canary_budget_cap "$desired_target" "$desired_max" "$reason" "$disk_avail" "$root_disk_avail" "$cpu" "$load" "$load_five" "$ncpu")"
		read -r desired_target desired_max reason <<<"$(apply_benchmark_canary_finalization_ceiling "$desired_target" "$desired_max" "$reason")"
	fi
	cold_starting_overbudget=0
	if [ "${materialized_active_run_dirs:-0}" -eq 0 ] &&
			[ "${materialized_running_groups:-0}" -eq 0 ] &&
			[ "$desired_target" -lt "${target:-0}" ] &&
			printf '%s' "$supervisor_status_counts" | grep -Eq '^(unknown|starting:[1-9])'; then
		cold_starting_overbudget=1
	fi
	if ! session_running && [ "${desired_target:-0}" -le 0 ] && [ "${desired_max:-0}" -le 0 ]; then
		action=hold_missing_monitor_disk_zero_budget
		up_streak=0
		down_streak=0
	elif ! session_running; then
		action=restart_missing_monitor
		restart_coverage "$desired_target" "$desired_max" missing_monitor
		last_restart_epoch=$(epoch)
		up_streak=0
		down_streak=0
	elif [ "${materialized_active_run_dirs:-0}" -eq 0 ] &&
		[ "${materialized_running_groups:-0}" -eq 0 ] &&
		latest_policy_holds_empty_materialization; then
		action=materialization_policy_hold
		up_streak=0
		down_streak=0
	elif materialization_needs_remediation "$enabled" "$desired_target" "$materialized_active_run_dirs" "$paused_infra_startup_groups" "$materialized_running_groups" "$supervisor_state_age_seconds" "$supervisor_status_counts"; then
		action=materialization_remediation
		reason=materialization_invariant_failed
		write_materialization_diagnostic "$now" "$supervisor_state_path" "$enabled" "$target" "$max" "$materialized_active_run_dirs" "$paused_infra_startup_groups" "$materialized_running_groups" "$supervisor_status_counts" "$supervisor_state_age_seconds" "$materialization_detail"
		last_materialization_epoch=$(cat "$MATERIALIZATION_LAST_REMEDIATION" 2>/dev/null || echo 0)
		if [ $(( $(epoch) - last_materialization_epoch )) -ge "$MIN_MATERIALIZATION_REMEDIATION_SECONDS" ]; then
			reset_wp_env_if_safe "$enabled" "$materialized_active_run_dirs" "$paused_infra_startup_groups" "$now"
			restart_coverage "$desired_target" "$desired_max" materialization_invariant_failed
			if [ "${restart_coverage_deferred:-0}" != "1" ]; then
				echo "$(epoch)" > "$MATERIALIZATION_LAST_REMEDIATION"
				last_restart_epoch=$(epoch)
			fi
		else
			action=materialization_cooldown
		fi
		up_streak=0
		down_streak=0
	elif [ "${desired_max:-0}" -ge 0 ] && [ "${enabled:-0}" -gt "${desired_max:-0}" ]; then
		action=trim_overenabled_groups
		if apply_in_place_coverage_budget "$desired_target" "$desired_max" "$reason" down; then
			action=trim_overenabled_groups_in_place
		else
			restart_coverage "$desired_target" "$desired_max" "$reason"
			last_restart_epoch=$(epoch)
		fi
		up_streak=0
		down_streak=0
		elif [ "$desired_target" -gt "${target:-0}" ]; then
			down_streak=0
			if [ "$reason" = "deadline_benchmark_canary_cap" ] && {
				[ "${materialized_running_groups:-0}" -ge "$desired_target" ] ||
					[ "${materialized_active_run_dirs:-0}" -ge "$desired_target" ] ||
					[ "${enabled:-0}" -ge "$desired_target" ]
			}; then
				action=deadline_benchmark_canary_cap_restore_in_place
				apply_in_place_coverage_budget "$desired_target" "$desired_max" "$reason" up || true
				up_streak=0
			elif [ "$reason" = "deadline_benchmark_canary_cap" ]; then
				action=deadline_benchmark_canary_cap_restore
				restart_coverage "$desired_target" "$desired_max" "$reason"
				last_restart_epoch=$(epoch)
				up_streak=0
			elif coverage_breadth_floor_allowed "$reason" && [ "${target:-0}" -lt "$MIN_COVERAGE_BREADTH_GROUPS" ]; then
			if ! scale_up_backlog_clear "$load" "$load_five" "$load_fifteen" "$ncpu"; then
				action=coverage_breadth_floor_blocked_backlog
				up_streak=0
			elif [ "${materialized_running_groups:-0}" -ge "$desired_target" ] ||
				[ "${materialized_active_run_dirs:-0}" -ge "$desired_target" ] ||
				[ "${enabled:-0}" -ge "$desired_target" ]; then
				action=restore_coverage_breadth_floor_in_place
				apply_in_place_coverage_budget "$desired_target" "$desired_max" coverage_breadth_floor up || true
				up_streak=0
			elif [ $(( $(epoch) - last_restart_epoch )) -lt "$STARTUP_RAMP_SECONDS" ]; then
				action=coverage_breadth_floor_ramp_cooldown
				up_streak=0
			elif [ $(( $(epoch) - last_restart_epoch )) -lt "$MIN_SCALE_UP_SECONDS" ]; then
				action=coverage_breadth_floor_scale_cooldown
				up_streak=0
			else
				action=restore_coverage_breadth_floor
				shed_optional_browser_pools_if_needed "$reason" "$now" "$browser_live_lanes" "$e2e_floor" || true
				restart_coverage "$desired_target" "$desired_max" coverage_breadth_floor
				last_restart_epoch=$(epoch)
				up_streak=0
			fi
		elif ! scale_up_backlog_clear "$load" "$load_five" "$load_fifteen" "$ncpu"; then
			action=scale_up_blocked_backlog
			up_streak=0
		else
			up_streak=$(( up_streak + 1 ))
		fi
		if [ "$up_streak" -ge 2 ] && [ $(( $(epoch) - last_restart_epoch )) -ge "$MIN_SCALE_UP_SECONDS" ]; then
			if [ "${materialized_running_groups:-0}" -ge "$desired_target" ] ||
				[ "${materialized_active_run_dirs:-0}" -ge "$desired_target" ] ||
				[ "${enabled:-0}" -ge "$desired_target" ]; then
				action=scale_up_in_place
				apply_in_place_coverage_budget "$desired_target" "$desired_max" "$reason" up || true
			else
				action=scale_up
				restart_coverage "$desired_target" "$desired_max" "$reason"
				last_restart_epoch=$(epoch)
			fi
			up_streak=0
		fi
	elif [ "$desired_target" -lt "${target:-0}" ]; then
		down_streak=$(( down_streak + 1 ))
		up_streak=0
		if [ "$down_streak" -ge 1 ] && {
			[ "$cold_starting_overbudget" = "1" ] ||
			[ $(( $(epoch) - last_restart_epoch )) -ge "$MIN_SCALE_DOWN_SECONDS" ] ||
				[ "$reason" = "pressure" ] ||
					[ "$reason" = "high_pressure" ] ||
					[ "$reason" = "severe_pressure" ] ||
					[ "$reason" = "deadline_benchmark_canary_cap" ] ||
					[ "$reason" = "disk_pressure" ] ||
					[ "$reason" = "disk_high_pressure" ] ||
					[ "$reason" = "disk_severe_pressure" ]
		}; then
			if [ "$cold_starting_overbudget" = "1" ]; then
				action=scale_down_cold_start_overbudget
			else
				action=scale_down
			fi
			if apply_in_place_coverage_budget "$desired_target" "$desired_max" "$reason" down; then
				action="${action}_in_place"
			else
				restart_coverage "$desired_target" "$desired_max" "$reason"
				last_restart_epoch=$(epoch)
			fi
			down_streak=0
		fi
	else
		up_streak=0
		down_streak=0
	fi
	if shed_optional_browser_pools_if_needed "$reason" "$now" "$browser_live_lanes" "$e2e_floor"; then
		if [ "$action" = "scale_down" ]; then
			action=scale_down_and_shed_optional_browser
		else
			action=shed_optional_browser
		fi
	fi
	enforce_global_cpu_budget "$reason" "$now" || true

	append_csv "$now" "$cpu" "$load" "$avail" "$ncpu" "$enabled" "$target" "$max" "$desired_target" "$desired_max" "$action" "$reason" "$materialized_active_run_dirs" "$paused_infra_startup_groups" "$materialized_running_groups" "$supervisor_status_counts" "$supervisor_state_age_seconds"
	append_disk_csv "$now" "$root_disk_avail" "$root_disk_used" "$disk_avail" "$disk_used"
	write_status "$now" "$cpu" "$load" "$avail" "$ncpu" "$enabled" "$target" "$max" "$desired_target" "$desired_max" "$action" "$reason" "$materialized_active_run_dirs" "$paused_infra_startup_groups" "$materialized_running_groups" "$supervisor_status_counts" "$supervisor_state_age_seconds" "$materialization_detail" "$load_five" "$load_fifteen" "$disk_avail" "$root_disk_avail" "$docker_root_actual" "$EXPECTED_DOCKER_ROOT" "$docker_root_ok"
	echo "[$now] cpu=$cpu load1=$load/$ncpu load5=$load_five/$ncpu load15=$load_fifteen/$ncpu mem_avail=${avail}GiB root_disk_avail=${root_disk_avail:-unknown}GiB disk_avail=${disk_avail:-unknown}GiB enabled=$enabled current=$target/$max desired=$desired_target/$desired_max materialized=$materialized_active_run_dirs running=$materialized_running_groups paused_infra=$paused_infra_startup_groups stale=${supervisor_state_age_seconds}s action=$action reason=$reason" >> "$LOG"
	sleep "$POLL_SECONDS" 9>&-
done
