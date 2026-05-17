#!/usr/bin/env bash
set -euo pipefail

BASE=${RTC_RESOURCE_AUTOSCALER_BASE:-/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516}
COVERAGE_BASE=${RTC_COVERAGE_BASE:-/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515}
START=${RTC_COVERAGE_START_SCRIPT:-/tmp/start_rtc_coverage_guided_remote.sh}
NODE_BIN=${RTC_NODE_BIN:-/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin}
TMUX=${RTC_TMUX:-/usr/bin/tmux}
TMUX_SOCKET=${RTC_TMUX_SOCKET:-rtc-fuzz}
LOG="$BASE/resource-autoscaler.log"
CSV="$BASE/resource-samples.csv"
STATUS="$BASE/resource-autoscaler-status.md"
LOCK="$BASE/resource-autoscaler.lock"
BUDGET_ENV="$BASE/current-budget.env"
MATERIALIZATION_DIR="$BASE/materialization"
MATERIALIZATION_LAST_REMEDIATION="$BASE/materialization-last-remediation-epoch"
OPTIONAL_BROWSER_SHED_LAST="$BASE/optional-browser-shed-last-epoch"
WP_ENV_RESET_LAST="$BASE/wp-env-reset-last-epoch"
POLL_SECONDS=${RTC_RESOURCE_AUTOSCALER_POLL_SECONDS:-120}
MIN_SCALE_UP_SECONDS=${RTC_RESOURCE_AUTOSCALER_MIN_SCALE_UP_SECONDS:-1200}
MIN_SCALE_DOWN_SECONDS=${RTC_RESOURCE_AUTOSCALER_MIN_SCALE_DOWN_SECONDS:-300}
MIN_MATERIALIZATION_REMEDIATION_SECONDS=${RTC_RESOURCE_AUTOSCALER_MIN_MATERIALIZATION_REMEDIATION_SECONDS:-900}
OPTIONAL_BROWSER_SHED_COOLDOWN_SECONDS=${RTC_RESOURCE_AUTOSCALER_OPTIONAL_BROWSER_SHED_COOLDOWN_SECONDS:-900}
MATERIALIZATION_STALE_SECONDS=${RTC_RESOURCE_AUTOSCALER_MATERIALIZATION_STALE_SECONDS:-600}
WP_ENV_RESET_COOLDOWN_SECONDS=${RTC_RESOURCE_AUTOSCALER_WP_ENV_RESET_COOLDOWN_SECONDS:-1800}
RESET_WP_ENV_ON_INFRA_FAILURE=${RTC_RESOURCE_AUTOSCALER_RESET_WP_ENV_ON_INFRA_FAILURE:-1}

mkdir -p "$BASE" "$MATERIALIZATION_DIR"
exec 9>"$LOCK"
if ! flock -n 9; then
	echo "resource autoscaler already running"
	exit 0
fi

export PATH="$NODE_BIN:$PATH"

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
	sleep 2
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

current_target() {
	run_script_value RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS 0
}

current_max() {
	run_script_value RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS 0
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

current_repo_roots() {
	local latest
	latest=$(latest_run)
	if [ -z "$latest" ] || [ ! -f "$latest/supervisor-groups.json" ]; then
		return
	fi
	node -e "const fs=require('fs'); const groups=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); console.log([...new Set((Array.isArray(groups)?groups:[]).map(g=>g.repoRoot).filter(Boolean))].join('\n'));" "$latest/supervisor-groups.json" 2>/dev/null || true
}

session_running() {
	"$TMUX" -L "$TMUX_SOCKET" list-sessions -F '#S' 2>/dev/null |
		grep -Fxq rtc-coverage-guided-novelty
}

cleanup_orphan_monitors() {
	local pids
	pids=$(ps -eo pid,ppid,cmd | awk '/node bin\/rtc-browser-fuzz-novelty-monitor\.mjs/ && $2 == 1 { print $1 }')
	if [ -z "$pids" ]; then
		return
	fi
	for pid in $pids; do
		echo "[$(stamp)] killing orphan novelty monitor pid=$pid" >> "$LOG"
		kill -9 "$pid" 2>/dev/null || true
	done
}

shed_optional_browser_pools_if_needed() {
	local reason=$1
	local now=$2
	local last_shed session killed=0
	if [ "$reason" != "severe_pressure" ]; then
		return 1
	fi
	last_shed=$(cat "$OPTIONAL_BROWSER_SHED_LAST" 2>/dev/null || echo 0)
	if [ $(( $(epoch) - last_shed )) -lt "$OPTIONAL_BROWSER_SHED_COOLDOWN_SECONDS" ]; then
		return 1
	fi
	for session in \
		rtc-gap-booster \
		rtc-gap-booster-watchdog \
		rtc-focused-shards \
		rtc-focused-shards-watchdog \
		rtc-fuzz-strict-expansion \
		rtc-fuzz-strict-expansion-watchdog; do
		if "$TMUX" -L "$TMUX_SOCKET" has-session -t "$session" 2>/dev/null; then
			echo "[$now] stopping optional browser session under severe pressure: $session" >> "$LOG"
			"$TMUX" -L "$TMUX_SOCKET" kill-session -t "$session" 2>/dev/null || true
			killed=1
		fi
	done
	if [ "$killed" = 1 ]; then
		echo "$(epoch)" > "$OPTIONAL_BROWSER_SHED_LAST"
		return 0
	fi
	return 1
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
			if (cpu >= 96 || loadv >= severe_load || load5v >= severe_load5 || load15v >= severe_load15) {
				print "1 2 severe_pressure";
			} else if (cpu >= 92 || loadv >= high_pressure_load || load5v >= high_pressure_load5 || load15v >= high_pressure_load15) {
				print "2 3 high_pressure";
			} else if (cpu >= 88 || loadv >= pressure_load || load5v >= pressure_load5 || load15v >= pressure_load15 || avail < 120) {
				print "4 5 pressure";
			} else if (cpu <= 62 && loadv <= low_load && load5v <= low_load5 && load15v <= low_load15 && avail >= 300) {
				print "11 12 large_headroom";
			} else if (cpu <= 72 && loadv <= mid_load && load5v <= mid_load5 && load15v <= mid_load15 && avail >= 250) {
				print "10 11 headroom";
			} else if (cpu <= 80 && loadv <= high_load && load5v <= high_load5 && load15v <= high_load15 && avail >= 180) {
				print "9 10 modest_headroom";
			} else {
				print "8 9 steady";
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
	if printf '%s' "$status_counts" | grep -Eq '(^|\|)(starting|launching|recovering):[1-9]' &&
		[ "${stale_seconds:-0}" -lt "$MATERIALIZATION_STALE_SECONDS" ]; then
		return 1
	fi
	if [ "${enabled:-0}" -le 0 ]; then
		return 1
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
	cat > "$STATUS" <<EOF_STATUS
# RTC Jetstream2 Resource Autoscaler

- updated: $now
- cpu_percent: $cpu
- load1: $load / $ncpu cores
- load5: $load5_value / $ncpu cores
- load15: $load15_value / $ncpu cores
- mem_available_gib: $avail
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

write_budget_env() {
	local target=$1
	local max=$2
	local multiplier=${3:-1.02}
	cat > "$BUDGET_ENV" <<EOF_BUDGET
export RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS='$target'
export RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS='$max'
export RTC_FUZZ_NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS='$max'
export RTC_FUZZ_NOVELTY_LOAD_HEADROOM_MULTIPLIER='$multiplier'
EOF_BUDGET
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
		"$TMUX" -L "$TMUX_SOCKET" ls 2>&1 | sed -n '1,120p' || true
		echo
		echo "## Coverage Processes"
		ps -eo pid,ppid,etimes,cmd |
			grep -E 'rtc-browser-fuzz-(novelty-monitor|supervisor)|rtc-coverage-guided' |
			grep -v grep |
			sed -n '1,120p' || true
		echo
		echo "## Docker Summary"
		docker system df 2>&1 | sed -n '1,120p' || true
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
	echo "[$(stamp)] restarting coverage-guided loop target=$desired_target max=$desired_max reason=$reason" >> "$LOG"
	write_budget_env "$desired_target" "$desired_max" 1.02
	RTC_COVERAGE_CLEANUP_KEEP_WATCHDOG=1 \
	RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS="$desired_target" \
	RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS="$desired_max" \
	RTC_FUZZ_NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS="$desired_max" \
	RTC_FUZZ_NOVELTY_LOAD_HEADROOM_MULTIPLIER=1.02 \
		"$START" >> "$LOG" 2>&1 || true
}

echo "[$(stamp)] resource autoscaler started base=$BASE" >> "$LOG"
last_restart_epoch=0
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
	ncpu=$(cores)
	enabled=$(enabled_groups)
	target=$(current_target)
	max=$(current_max)
	read -r desired_target desired_max reason <<<"$(choose_budget "$cpu" "$load" "$load_five" "$load_fifteen" "$avail" "$ncpu")"
	action=observe
	IFS=$'\t' read -r supervisor_state_path materialized_group_count materialized_active_run_dirs paused_infra_startup_groups materialized_running_groups supervisor_status_counts supervisor_state_age_seconds materialization_detail <<<"$(materialization_snapshot)"
	if [ "${target:-0}" -gt 0 ] && [ "${max:-0}" -gt 0 ]; then
		write_budget_env "$target" "$max" "$(run_script_value RTC_FUZZ_NOVELTY_LOAD_HEADROOM_MULTIPLIER 1.02)"
	fi

	if ! session_running; then
		action=restart_missing_monitor
		restart_coverage "$desired_target" "$desired_max" missing_monitor
		last_restart_epoch=$(epoch)
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
			echo "$(epoch)" > "$MATERIALIZATION_LAST_REMEDIATION"
			last_restart_epoch=$(epoch)
		else
			action=materialization_cooldown
		fi
		up_streak=0
		down_streak=0
	elif [ "$desired_target" -gt "${target:-0}" ]; then
		down_streak=0
		if ! scale_up_backlog_clear "$load" "$load_five" "$load_fifteen" "$ncpu"; then
			action=scale_up_blocked_backlog
			up_streak=0
		else
			up_streak=$(( up_streak + 1 ))
		fi
		if [ "$up_streak" -ge 2 ] && [ $(( $(epoch) - last_restart_epoch )) -ge "$MIN_SCALE_UP_SECONDS" ]; then
			action=scale_up
			restart_coverage "$desired_target" "$desired_max" "$reason"
			last_restart_epoch=$(epoch)
			up_streak=0
		fi
	elif [ "$desired_target" -lt "${target:-0}" ]; then
		down_streak=$(( down_streak + 1 ))
		up_streak=0
		if [ "$down_streak" -ge 1 ] && {
			[ $(( $(epoch) - last_restart_epoch )) -ge "$MIN_SCALE_DOWN_SECONDS" ] ||
				[ "$reason" = "high_pressure" ] ||
				[ "$reason" = "severe_pressure" ]
		}; then
			action=scale_down
			restart_coverage "$desired_target" "$desired_max" "$reason"
			last_restart_epoch=$(epoch)
			down_streak=0
		fi
	else
		up_streak=0
		down_streak=0
	fi
	if shed_optional_browser_pools_if_needed "$reason" "$now"; then
		if [ "$action" = "scale_down" ]; then
			action=scale_down_and_shed_optional_browser
		else
			action=shed_optional_browser
		fi
	fi

	append_csv "$now" "$cpu" "$load" "$avail" "$ncpu" "$enabled" "$target" "$max" "$desired_target" "$desired_max" "$action" "$reason" "$materialized_active_run_dirs" "$paused_infra_startup_groups" "$materialized_running_groups" "$supervisor_status_counts" "$supervisor_state_age_seconds"
	write_status "$now" "$cpu" "$load" "$avail" "$ncpu" "$enabled" "$target" "$max" "$desired_target" "$desired_max" "$action" "$reason" "$materialized_active_run_dirs" "$paused_infra_startup_groups" "$materialized_running_groups" "$supervisor_status_counts" "$supervisor_state_age_seconds" "$materialization_detail" "$load_five" "$load_fifteen"
	echo "[$now] cpu=$cpu load1=$load/$ncpu load5=$load_five/$ncpu load15=$load_fifteen/$ncpu mem_avail=${avail}GiB enabled=$enabled current=$target/$max desired=$desired_target/$desired_max materialized=$materialized_active_run_dirs running=$materialized_running_groups paused_infra=$paused_infra_startup_groups stale=${supervisor_state_age_seconds}s action=$action reason=$reason" >> "$LOG"
	sleep "$POLL_SECONDS"
done
