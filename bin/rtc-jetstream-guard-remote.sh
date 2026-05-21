#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN_DIR=${HOME:-/home/exouser}/.local/bin
REPO=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
BASE=/media/volume/danluu-fuzz-data/rtc-jetstream-guard-20260515
COVERAGE_BASE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515
COVERAGE_START_LOCK=$COVERAGE_BASE/start.lock
FOCUSED_BASE=/media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515
CG_LOWER_LEVEL_B64_HOLD_FILE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-20260516/holds/coverage-guided-lower-level-rich-text-crdt.hold
CG_LOWER_LEVEL_B64_GROUP=coverage-guided-lower-level-rich-text-crdt
CG_LOWER_LEVEL_B64_REPLACEMENT_GROUP=coverage-guided-lower-level-rich-text-multiblock
CG_LOWER_LEVEL_B64_REPLACEMENT_SESSION=rtc-coverage-guided-lower-level-rich-text-multiblock
CG_LOWER_LEVEL_B64_REPLACEMENT_HOLD_FILE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-rich-text-multiblock-20260518/holds/coverage-guided-lower-level-rich-text-multiblock.hold
CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_GROUP=coverage-guided-lower-level-table-query-array-crdt
CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_SESSION=rtc-coverage-guided-lower-level-table-query-array-crdt
CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_HOLD_FILE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-query-array-20260517/holds/coverage-guided-lower-level-table-query-array-crdt.hold
CG_LOWER_LEVEL_BLOCK_PARSER_GROUP=coverage-guided-lower-level-block-parser-serialization
CG_LOWER_LEVEL_BLOCK_PARSER_SESSION=rtc-coverage-guided-lower-level-block-parser-serialization
LEVEL_MIX_BASE=/media/volume/danluu-fuzz-data/rtc-fuzz-level-mix-persona-loop-20260516
NATIVE_ASSERT_BASE=/media/volume/danluu-fuzz-data/rtc-native-assert-protocol-20260516
STRUCTURAL_BASE=/media/volume/danluu-fuzz-data/rtc-structural-watchdog-20260518
RESOURCE_BASE=/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516
PR_PROGRESS_BASE=/media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518
GLOBAL_ADMISSION=$RESOURCE_BASE/rtc-global-cpu-admission.sh
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin
LOG_DIR=$BASE/logs
PID_FILE=$BASE/guard.pid
LOCK_FILE=${RTC_JETSTREAM_GUARD_LOCK_FILE:-$BASE/guard-v2.lock}
EVENTS=$LOG_DIR/restart-events.tsv

mkdir -p "$LOG_DIR"

ensure_tmux_wrapper() {
	local wrapper="$TMUX_WRAP/tmux"
	local tmp
	mkdir -p "$TMUX_WRAP"
	tmp="$(mktemp "$TMUX_WRAP/tmux.XXXXXX")"
	cat > "$tmp" <<'SH'
#!/usr/bin/env bash
exec /usr/bin/tmux -L rtc-fuzz "$@"
SH
	chmod +x "$tmp"
	if [ -f "$wrapper" ] && cmp -s "$tmp" "$wrapper"; then
		rm -f "$tmp"
	else
		mv "$tmp" "$wrapper"
	fi
}

ensure_tmux_wrapper
export PATH="$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:$PATH"

log() {
	printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$LOG_DIR/guard.log"
}

has_session() {
	tmux list-sessions -F '#S' 2>/dev/null | grep -Fxq "$1"
}

coverage_guided_lower_level_group_session_exists() {
	local session=$1
	local group=$2
	local legacy_session=rtc-coverage-guided-lower-level

	if has_session "$session"; then
		return 0
	fi
	if ! has_session "$legacy_session"; then
		return 1
	fi

	tmux list-panes -t "$legacy_session" -F '#{pane_start_command}' 2>/dev/null |
		awk -v group="$group" \
			'index($0, "RTC_CG_LOWER_LEVEL_GROUP") && index($0, group) { found = 1 } END { exit ! found }'
}

resource_autoscaler_script_pids() {
	pgrep -f '/tmp/start_rtc_[r]esource_autoscaler.sh' || true
}

stop_unsupervised_resource_autoscaler() {
	local pids pid waited

	pids="$(resource_autoscaler_script_pids)"
	[ -n "$pids" ] || return 0

	for pid in $pids; do
		log "stopping unsupervised resource autoscaler pid=$pid"
		kill "$pid" 2>/dev/null || true
	done

	waited=0
	while [ "$waited" -lt 10 ]; do
		pids="$(resource_autoscaler_script_pids)"
		[ -z "$pids" ] && return 0
		sleep 1
		waited=$(( waited + 1 ))
	done

	for pid in $pids; do
		log "force-stopping unsupervised resource autoscaler pid=$pid"
		kill -9 "$pid" 2>/dev/null || true
	done
}

coverage_supervisor_state_matches_current_root() {
	local root=$1
	[ -n "$root" ] && [ -f "$root/supervisor-state.json" ] || return 1
	node - "$root" <<'NODE'
const fs = require( 'fs' );
const path = require( 'path' );
const root = process.argv[ 2 ];
try {
	const state = JSON.parse(
		fs.readFileSync( path.join( root, 'supervisor-state.json' ), 'utf8' )
	);
	if (
		typeof state.outputDir === 'string' &&
		path.resolve( state.outputDir ) === path.resolve( root )
	) {
		process.exit( 0 );
	}
} catch {}
process.exit( 1 );
NODE
}

coverage_supervisor_session_exists() {
	local root suffix scoped state_session

	root=$(sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)
	[ -n "$root" ] || return 1
	coverage_supervisor_state_matches_current_root "$root" || return 1

	if [ -n "$root" ]; then
		suffix=$(
			basename "$root" |
				sed -E 's/[^A-Za-z0-9_.-]+/-/g; s/^-+//; s/-+$//'
		)
		if [ -n "$suffix" ]; then
			scoped="rtc-coverage-guided-supervisor-$suffix"
			if has_session "$scoped"; then
				return 0
			fi
		fi
		if [ -f "$root/novelty-state.json" ]; then
			state_session=$(
				node -e "const fs = require('fs'); try { const state = JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); if (typeof state.supervisorSession === 'string') process.stdout.write(state.supervisorSession); } catch {}" \
					"$root/novelty-state.json"
			)
			if [ -n "$state_session" ] && has_session "$state_session"; then
				return 0
			fi
		fi
	fi
	if has_session rtc-coverage-guided-supervisor; then
		return 0
	fi

	return 1
}

coverage_guided_lower_level_b64_satisfied() {
	if has_session rtc-coverage-guided-lower-level-b64; then
		return 0
	fi
	if [ -f "$CG_LOWER_LEVEL_B64_HOLD_FILE" ] &&
		grep -Fq "$CG_LOWER_LEVEL_B64_REPLACEMENT_GROUP" "$CG_LOWER_LEVEL_B64_HOLD_FILE"; then
		if [ -f "$CG_LOWER_LEVEL_B64_REPLACEMENT_HOLD_FILE" ] &&
			grep -Eq "$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_GROUP|rtc-table-query-array-crdt|table-query-array" "$CG_LOWER_LEVEL_B64_REPLACEMENT_HOLD_FILE"; then
			if [ -f "$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_HOLD_FILE" ] &&
				grep -Eq "$CG_LOWER_LEVEL_BLOCK_PARSER_GROUP|rtc-block-parser-serialization|block-parser|parser-serialization" "$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_HOLD_FILE"; then
				coverage_guided_lower_level_group_session_exists \
					"$CG_LOWER_LEVEL_BLOCK_PARSER_SESSION" \
					"$CG_LOWER_LEVEL_BLOCK_PARSER_GROUP"
				return
			fi
			coverage_guided_lower_level_group_session_exists \
				"$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_SESSION" \
				"$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_GROUP"
			return
		fi
		coverage_guided_lower_level_group_session_exists \
			"$CG_LOWER_LEVEL_B64_REPLACEMENT_SESSION" \
			"$CG_LOWER_LEVEL_B64_REPLACEMENT_GROUP"
		return
	fi
	return 1
}

start_coverage_guided_lower_level_b64_or_replacement() {
	local session=rtc-coverage-guided-lower-level-b64
	local group=$CG_LOWER_LEVEL_B64_GROUP

	if [ -f "$CG_LOWER_LEVEL_B64_HOLD_FILE" ] &&
		grep -Fq "$CG_LOWER_LEVEL_B64_REPLACEMENT_GROUP" "$CG_LOWER_LEVEL_B64_HOLD_FILE"; then
		session=$CG_LOWER_LEVEL_B64_REPLACEMENT_SESSION
		group=$CG_LOWER_LEVEL_B64_REPLACEMENT_GROUP
		if [ -f "$CG_LOWER_LEVEL_B64_REPLACEMENT_HOLD_FILE" ] &&
			grep -Eq "$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_GROUP|rtc-table-query-array-crdt|table-query-array" "$CG_LOWER_LEVEL_B64_REPLACEMENT_HOLD_FILE"; then
			session=$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_SESSION
			group=$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_GROUP
			if [ -f "$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_HOLD_FILE" ] &&
				grep -Eq "$CG_LOWER_LEVEL_BLOCK_PARSER_GROUP|rtc-block-parser-serialization|block-parser|parser-serialization" "$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_HOLD_FILE"; then
				session=$CG_LOWER_LEVEL_BLOCK_PARSER_SESSION
				group=$CG_LOWER_LEVEL_BLOCK_PARSER_GROUP
			fi
		fi
	fi

	if coverage_guided_lower_level_group_session_exists "$session" "$group"; then
		return 0
	fi

	RTC_CG_LOWER_LEVEL_SESSION="$session" \
		RTC_CG_LOWER_LEVEL_GROUP="$group" \
		bash "$REPO/bin/rtc-coverage-guided-lower-level-start-remote.sh" start >> "$LOG_DIR/cg-lower-level-start.log" 2>&1 ||
		log "coverage-guided lower-level start failed session=$session group=$group"
}

coverage_breadth_restart_block_reason() {
	local status=$RESOURCE_BASE/resource-autoscaler-status.md
	local min=${RTC_RESOURCE_AUTOSCALER_MIN_COVERAGE_BREADTH_GROUPS:-10}
	local enabled current
	enabled=$(sed -n 's/^- enabled_groups: \([0-9][0-9]*\).*/\1/p' "$status" 2>/dev/null | tail -1)
	current=$(sed -n 's/^- current_budget: target=\([0-9][0-9]*\).*/\1/p' "$status" 2>/dev/null | tail -1)
	if [[ "$enabled" =~ ^[0-9]+$ ]] && [ "$enabled" -lt "$min" ]; then
		printf 'coverage_breadth_enabled=%s min=%s\n' "$enabled" "$min"
		return 0
	fi
	if [[ "$current" =~ ^[0-9]+$ ]] && [ "$current" -lt "$min" ]; then
		printf 'coverage_budget_target=%s min=%s\n' "$current" "$min"
		return 0
	fi
	return 1
}

optional_browser_restart_block_reason() {
	local status=$RESOURCE_BASE/resource-autoscaler-status.md
	local shed_last=$RESOURCE_BASE/optional-browser-shed-last-epoch
	local reason last now age grace load cores current desired

	reason=$(sed -n 's/^- reason: //p' "$status" 2>/dev/null | tail -1)
	if coverage_breadth_restart_block_reason; then
		return 0
	fi
	case "$reason" in
		pressure|severe_pressure|high_pressure)
			printf 'autoscaler reason=%s\n' "$reason"
			return 0
			;;
	esac

	current=$(sed -n 's/^- current_budget: target=\([0-9][0-9]*\).*/\1/p' "$status" 2>/dev/null | tail -1)
	desired=$(sed -n 's/^- desired_budget: target=\([0-9][0-9]*\).*/\1/p' "$status" 2>/dev/null | tail -1)
	if [[ "$current" =~ ^[0-9]+$ && "$desired" =~ ^[0-9]+$ ]] && [ "$desired" -lt "$current" ]; then
		printf 'desired_budget=%s current_budget=%s reason=%s\n' "$desired" "$current" "${reason:-unknown}"
		return 0
	fi

	load=$(sed -n 's/^- load1: \([0-9.]*\) \/.*/\1/p' "$status" 2>/dev/null | tail -1)
	cores=$(sed -n 's/^- load1: [0-9.]* \/ \([0-9][0-9]*\) cores.*/\1/p' "$status" 2>/dev/null | tail -1)
	if [[ "$load" =~ ^[0-9.]+$ && "$cores" =~ ^[0-9]+$ ]] &&
		awk -v loadv="$load" -v cores="$cores" 'BEGIN { exit !(loadv >= cores * 0.90) }'; then
		printf 'load1=%s cores=%s reason=%s\n' "$load" "$cores" "${reason:-unknown}"
		return 0
	fi

	grace=${RTC_GUARD_OPTIONAL_BROWSER_SHED_RESTART_GRACE_SECONDS:-${RTC_RESOURCE_AUTOSCALER_OPTIONAL_BROWSER_SHED_COOLDOWN_SECONDS:-900}}
	last=$(sed -n '1p' "$shed_last" 2>/dev/null || true)
	if [[ "$last" =~ ^[0-9]+$ ]]; then
		now=$(date -u +%s)
		age=$(( now - last ))
		if [ "$age" -ge 0 ] && [ "$age" -lt "$grace" ]; then
			printf 'recent optional-browser shed age=%ss grace=%ss\n' "$age" "$grace"
			return 0
		fi
	fi

	return 1
}

resource_pressure_blocks_optional_browser() {
	optional_browser_restart_block_reason >/dev/null
}

cpu_class_for_pool() {
	case "$1" in
		coverage)
			printf 'coverage-core\n'
			;;
		strict|focused|gap-booster)
			printf 'optional-browser\n'
			;;
		lower-level|cg-lower-level)
			printf 'lower-level\n'
			;;
		*)
			printf 'analysis\n'
			;;
	esac
}

global_cpu_admission_allows() {
	local pool=$1 class
	class=$(cpu_class_for_pool "$pool")
	[ -x "$GLOBAL_ADMISSION" ] || return 0
	if "$GLOBAL_ADMISSION" allow "$class" "guard:$pool" >/dev/null 2>&1; then
		return 0
	fi
	log "skipping restart under global CPU budget pool=$pool class=$class status=$("$GLOBAL_ADMISSION" status "$class" 2>/dev/null || true)"
	return 1
}

browser_pool_current_root() {
	case "$1" in
		focused)
			sed -n '1p' "$FOCUSED_BASE/current-run-root.txt" 2>/dev/null || true
			;;
		strict)
			sed -n '1p' /media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515/current-run-root.txt 2>/dev/null || true
			;;
		gap-booster)
			sed -n '1p' /media/volume/danluu-fuzz-data/rtc-gap-booster-20260515/current-run-root.txt 2>/dev/null || true
			;;
	esac
}

browser_pool_base() {
	case "$1" in
		focused)
			printf '%s\n' "$FOCUSED_BASE"
			;;
		strict)
			printf '%s\n' /media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515
			;;
		gap-booster)
			printf '%s\n' /media/volume/danluu-fuzz-data/rtc-gap-booster-20260515
			;;
	esac
}

browser_pool_sessions() {
	case "$1" in
		focused)
			printf '%s\t%s\t%s\t%s\n' rtc-focused-shards rtc-focused-shards-watchdog rtc-focused-shards-analysis rtc-focused-analysis
			;;
		strict)
			printf '%s\t%s\t%s\t%s\n' rtc-fuzz-strict-expansion rtc-fuzz-strict-expansion-watchdog rtc-fuzz-strict-expansion-analysis rtc-strict-analysis
			;;
		gap-booster)
			printf '%s\t%s\t%s\t%s\n' rtc-gap-booster rtc-gap-booster-watchdog rtc-gap-booster-analysis rtc-gap-analysis
			;;
	esac
}

browser_root_live_lane_count() {
	local root=$1
	[ -n "$root" ] && [ -f "$root/supervisor-state.json" ] || {
		printf '0\n'
		return
	}
	node - "$root" <<'NODE'
const fs = require( 'fs' );
const path = require( 'path' );
const root = process.argv[ 2 ];
let live = 0;
const readJson = ( file ) => {
	try {
		return JSON.parse( fs.readFileSync( file, 'utf8' ) );
	} catch {
		return null;
	}
};
const state = readJson( path.join( root, 'supervisor-state.json' ) );
for ( const group of state?.groups ?? [] ) {
	for ( const runDir of group.activeRunDirs ?? [] ) {
		const manifest = readJson( path.join( runDir, 'lanes.json' ) );
		for ( const lane of manifest?.lanes ?? [] ) {
			const pid = Number( lane.pid );
			if ( ! Number.isInteger( pid ) || pid <= 0 ) {
				continue;
			}
			const laneState = lane.outputDir
				? readJson( path.join( lane.outputDir, 'state.json' ) )
				: null;
			try {
				process.kill( pid, 0 );
				if ( ! laneState?.stopReason ) {
					live += 1;
				}
			} catch {}
		}
	}
}
process.stdout.write( `${ live }\n` );
NODE
}

reattach_browser_pool_if_live() {
	local pool=$1
	local reason=$2
	local run base live_count supervisor_session watchdog_session analysis_session analysis_prefix

	run=$(browser_pool_current_root "$pool")
	base=$(browser_pool_base "$pool")
	[ -n "$run" ] && [ -f "$run/supervisor-groups.json" ] && [ -n "$base" ] || return 1
	live_count=$(browser_root_live_lane_count "$run")
	[[ "$live_count" =~ ^[0-9]+$ ]] || live_count=0
	[ "$live_count" -gt 0 ] || return 1

	IFS=$'\t' read -r supervisor_session watchdog_session analysis_session analysis_prefix <<<"$(browser_pool_sessions "$pool")"
	[ -n "$supervisor_session" ] && [ -n "$watchdog_session" ] && [ -n "$analysis_session" ] || return 1

	log "reattaching browser pool pool=$pool live_lanes=$live_count reason=$reason root=$run"
	if ! has_session "$supervisor_session"; then
		tmux new-session -d -s "$supervisor_session" "bash -lc 'cd \"$REPO\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\" CI=1 RTC_FUZZ_SUPERVISOR_OUTPUT_DIR=\"$run\" RTC_FUZZ_SUPERVISOR_GROUPS_PATH=\"$run/supervisor-groups.json\" RTC_FUZZ_SUPERVISOR_DURATION_HOURS=12 RTC_FUZZ_SUPERVISOR_POLL_MS=60000 RTC_FUZZ_INLINE_CODEX=0 RTC_FUZZ_SKIP_GLOBAL_POST_CLEANUP=1 RTC_FUZZ_LOW_DISK_MODE=1 RTC_FUZZ_PLAYWRIGHT_VIDEO=off; node bin/rtc-browser-fuzz-supervisor.mjs >> \"$base/logs/supervisor.log\" 2>&1'" ||
			return 1
	fi
	if ! has_session "$watchdog_session"; then
		tmux new-session -d -s "$watchdog_session" "bash -lc 'cd \"$REPO\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\" CI=1; while true; do RTC_FUZZ_WATCHDOG_REPO_ROOT=\"$REPO\" RTC_FUZZ_WATCHDOG_OUTPUT_DIR=\"$run\" RTC_FUZZ_WATCHDOG_GROUPS_PATH=\"$run/supervisor-groups.json\" RTC_FUZZ_WATCHDOG_SESSION=\"$supervisor_session\" RTC_FUZZ_WATCHDOG_DURATION_HOURS=12 RTC_FUZZ_WATCHDOG_POLL_MS=60000 RTC_FUZZ_WATCHDOG_STALE_MS=360000 node bin/rtc-browser-fuzz-watchdog.mjs >> \"$base/logs/watchdog.log\" 2>&1; code=\$?; printf \"WATCHDOG_EXIT:%s %s\\n\" \"\$code\" \"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\" >> \"$base/logs/watchdog.log\"; sleep 30; done'" ||
			return 1
	fi
	if ! has_session "$analysis_session"; then
		tmux new-session -d -s "$analysis_session" "bash -lc 'cd \"$REPO\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\" CI=1; while true; do RTC_FUZZ_LIVE_ANALYSIS_REPO_ROOT=\"$REPO\" RTC_FUZZ_LIVE_ANALYSIS_INTERVAL_MS=120000 RTC_FUZZ_LIVE_ANALYSIS_MAX_PARALLEL=4 RTC_FUZZ_LIVE_ANALYSIS_MAX_ATTEMPTS=4 RTC_FUZZ_LIVE_ANALYSIS_CODEX_TIMEOUT_MS=2700000 RTC_FUZZ_LIVE_ANALYSIS_TMUX_PREFIX=\"$analysis_prefix\" node bin/rtc-browser-fuzz-live-analysis-monitor.mjs \"$run\" >> \"$base/logs/analysis.log\" 2>&1; code=\$?; printf \"ANALYSIS_EXIT:%s %s\\n\" \"\$code\" \"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\" >> \"$base/logs/analysis.log\"; sleep 30; done'" ||
			return 1
	fi
	return 0
}

maybe_restart_optional_browser_pool() {
	local pool=$1
	local reason=$2
	local block_reason
	if block_reason=$(optional_browser_restart_block_reason); then
		log "skipping optional browser pool restart/reattach under resource pressure pool=$pool reason=$reason block=$block_reason"
		return
	fi
	if reattach_browser_pool_if_live "$pool" "$reason"; then
		return
	fi
	restart_pool "$pool" "$reason"
}

restart_focused_sidecars() {
	local run

	run=$(sed -n '1p' "$FOCUSED_BASE/current-run-root.txt" 2>/dev/null || true)
	if [ -z "$run" ] || [ ! -f "$run/supervisor-groups.json" ]; then
		log "focused sidecar restart skipped; missing current run root"
		return 1
	fi

	if ! has_session rtc-focused-shards-watchdog; then
		tmux new-session -d -s rtc-focused-shards-watchdog "bash -lc 'cd \"$REPO\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\" CI=1; while true; do RTC_FUZZ_WATCHDOG_REPO_ROOT=\"$REPO\" RTC_FUZZ_WATCHDOG_OUTPUT_DIR=\"$run\" RTC_FUZZ_WATCHDOG_GROUPS_PATH=\"$run/supervisor-groups.json\" RTC_FUZZ_WATCHDOG_SESSION=rtc-focused-shards RTC_FUZZ_WATCHDOG_DURATION_HOURS=12 RTC_FUZZ_WATCHDOG_POLL_MS=60000 RTC_FUZZ_WATCHDOG_STALE_MS=360000 node bin/rtc-browser-fuzz-watchdog.mjs >> \"$FOCUSED_BASE/logs/watchdog.log\" 2>&1; code=\$?; printf \"WATCHDOG_EXIT:%s %s\\n\" \"\$code\" \"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\" >> \"$FOCUSED_BASE/logs/watchdog.log\"; sleep 30; done'" ||
			log "focused watchdog sidecar start failed"
	fi

	if ! has_session rtc-focused-shards-analysis; then
		tmux new-session -d -s rtc-focused-shards-analysis "bash -lc 'cd \"$REPO\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\" CI=1; while true; do RTC_FUZZ_LIVE_ANALYSIS_REPO_ROOT=\"$REPO\" RTC_FUZZ_LIVE_ANALYSIS_INTERVAL_MS=120000 RTC_FUZZ_LIVE_ANALYSIS_MAX_PARALLEL=4 RTC_FUZZ_LIVE_ANALYSIS_MAX_ATTEMPTS=4 RTC_FUZZ_LIVE_ANALYSIS_CODEX_TIMEOUT_MS=2700000 RTC_FUZZ_LIVE_ANALYSIS_TMUX_PREFIX=rtc-focused-analysis RTC_FUZZ_LIVE_ANALYSIS_ENABLE_DEEP=1 RTC_FUZZ_LIVE_DEEP_ANALYSIS_MAX_PARALLEL=2 node bin/rtc-browser-fuzz-live-analysis-monitor.mjs \"$run\" >> \"$FOCUSED_BASE/logs/analysis.log\" 2>&1; code=\$?; printf \"ANALYSIS_EXIT:%s %s\\n\" \"\$code\" \"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\" >> \"$FOCUSED_BASE/logs/analysis.log\"; sleep 30; done'" ||
			log "focused analysis sidecar start failed"
	fi
}

file_age_seconds() {
	local file=$1
	local now mtime

	[ -e "$file" ] || return 1
	now=$(date -u +%s)
	mtime=$(stat -c %Y "$file" 2>/dev/null) || return 1
	printf '%s\n' "$(( now - mtime ))"
}

coverage_supervisor_in_startup_grace() {
	local grace=${RTC_GUARD_COVERAGE_SUPERVISOR_STARTUP_GRACE_SECONDS:-420}
	local age

	has_session rtc-coverage-guided-novelty || return 1
	has_session rtc-coverage-guided-watchdog || return 1
	coverage_supervisor_session_exists && return 1
	age=$(file_age_seconds "$COVERAGE_BASE/current-output-dir.txt") || return 1
	if [ "$age" -ge 0 ] && [ "$age" -lt "$grace" ]; then
		log "coverage supervisor missing within startup grace age=${age}s grace=${grace}s"
		return 0
	fi
	return 1
}

coverage_start_in_progress() {
	local grace=${RTC_GUARD_COVERAGE_START_GRACE_SECONDS:-420}
	local age

	[ -e "$COVERAGE_START_LOCK" ] || return 1
	if (
		flock -n 8
	) 8>>"$COVERAGE_START_LOCK"; then
		return 1
	fi
	age=$(file_age_seconds "$COVERAGE_START_LOCK") || return 1
	if [ "$age" -ge 0 ] && [ "$age" -lt "$grace" ]; then
		log "coverage start already in progress age=${age}s grace=${grace}s"
		return 0
	fi
	return 1
}

coverage_materialization_stalled() {
	local grace=${RTC_GUARD_COVERAGE_MATERIALIZATION_GRACE_SECONDS:-900}
	local root age

	[ -f "$COVERAGE_BASE/current-output-dir.txt" ] || return 1
	root=$(sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt")
	[ -n "$root" ] && [ -d "$root" ] || return 1
	age=$(file_age_seconds "$COVERAGE_BASE/current-output-dir.txt") || return 1
	if [ "$age" -lt "$grace" ]; then
		return 1
	fi

	node - "$root" <<'NODE'
const fs = require( 'fs' );
const path = require( 'path' );
const root = process.argv[ 2 ];
const readJson = ( file ) => {
	try {
		return JSON.parse( fs.readFileSync( file, 'utf8' ) );
	} catch {
		return null;
	}
};
const readText = ( file ) => {
	try {
		return fs.readFileSync( file, 'utf8' );
	} catch {
		return '';
	}
};
const groups = readJson( path.join( root, 'supervisor-groups.json' ) );
const state = readJson( path.join( root, 'supervisor-state.json' ) );
const status = readText( path.join( root, 'novelty-status.md' ) );
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
	const match = text.match( new RegExp( `- ${ label.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ) }:\\s*([0-9.]+)` ) );
	if ( ! match ) {
		return null;
	}
	return Number( match[ 1 ] );
};
const activeTriage = sectionText( 'Triage Yield' ) || status;
const drainTriage = sectionText( 'Current Drain Triage Yield' );
const signatures = parseMetric( activeTriage, 'signatures' );
const duplicateShare = parseMetric( activeTriage, 'top duplicate family share' );
const likelyReal = parseMetric( activeTriage, 'likely-real visible' );
const activeNoiseClear =
	( signatures === null || signatures === 0 || duplicateShare === 0 ) &&
	( likelyReal === null || likelyReal === 0 );
const drainMetrics = [
	parseMetric( drainTriage, 'raw signatures' ),
	parseMetric( drainTriage, 'no-product raw signatures' ),
	parseMetric( drainTriage, 'suppressed strict startup records' ),
	parseMetric( drainTriage, 'suppressed strict startup virtual signatures' ),
	parseMetric( drainTriage, 'raw top duplicate family share' ),
	parseMetric( drainTriage, 'no-product raw top duplicate family share' ),
];
const drainNoiseClear =
	! drainTriage ||
	drainMetrics.every( ( value ) => value === null || value === 0 );
const policyHoldingEmptyCoverage =
	/hold-empty-coverage-no-safe-fallback|hold-materialization-floor-no-safe-group/.test(
		status
	);
const currentNoiseClear =
	activeNoiseClear && drainNoiseClear && ! policyHoldingEmptyCoverage;
const groupCount = Array.isArray( groups ) ? groups.length : null;
const stateGroups = Array.isArray( state?.groups ) ? state.groups : null;
const activeRunDirs = ( stateGroups || [] ).reduce(
	( count, group ) => count + ( Array.isArray( group.activeRunDirs ) ? group.activeRunDirs.filter( Boolean ).length : 0 ),
	0
);
const emptyGroupFile = groupCount === 0;
const noMaterializedState = stateGroups && stateGroups.length === 0 && activeRunDirs === 0;
if ( currentNoiseClear && ( emptyGroupFile || noMaterializedState ) ) {
	process.exit( 0 );
}
process.exit( 1 );
NODE
}

record_restart() {
	local pool=$1
	local reason=$2
	printf '%s\t%s\t%s\n' "$(date -u +%s)" "$pool" "$reason" >> "$EVENTS"
}

restart_cooldown_active() {
	local pool=$1
	local reason=$2
	local cooldown=${RTC_GUARD_RESTART_COOLDOWN_SECONDS:-900}
	local now last age

	[ "$cooldown" -gt 0 ] || return 1
	now=$(date -u +%s)
	last=$(
		awk -F '\t' -v pool="$pool" '
			$2 == pool && $1 > last { last = $1 }
			END { if (last) print last }
		' "$EVENTS" 2>/dev/null || true
	)
	[ -n "$last" ] || return 1
	age=$(( now - last ))
	if [ "$age" -ge 0 ] && [ "$age" -lt "$cooldown" ]; then
		log "restart suppressed by cooldown pool=$pool reason=$reason age=${age}s cooldown=${cooldown}s"
		return 0
	fi
	return 1
}

clear_stale_lock_holder() {
	local pid comm ppid args

	if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
		return
	fi

	for pid in $(fuser "$LOCK_FILE" 2>/dev/null || true); do
		comm=$(ps -o comm= -p "$pid" 2>/dev/null || true)
		comm=$(printf '%s' "$comm" | awk '{$1=$1};1')
		ppid=$(ps -o ppid= -p "$pid" 2>/dev/null || true)
		ppid=$(printf '%s' "$ppid" | tr -d ' ')
		args=$(ps -o args= -p "$pid" 2>/dev/null || true)
		case "$args" in
			*"start_rtc_jetstream_guard.sh run"*|*"rtc-jetstream-guard-remote.sh run"*)
				log "recovering guard pid file for live run lock holder pid=$pid"
				printf '%s\n' "$pid" > "$PID_FILE"
				return
				;;
		esac
		if [ "$comm" = sleep ] && [ "$ppid" = 1 ]; then
			log "killing stale guard sleep lock holder pid=$pid"
			kill "$pid" 2>/dev/null || true
			sleep 1
			if kill -0 "$pid" 2>/dev/null; then
				kill -KILL "$pid" 2>/dev/null || true
			fi
		fi
	done
}

maybe_launch_codex() {
	local pool=$1
	local reason=$2
	local now recent session prompt report codex_log
	now=$(date -u +%s)
	recent=$(
		awk -F '\t' -v since=$(( now - 1800 )) -v pool="$pool" \
			'$1 >= since && $2 == pool { count++ } END { print count + 0 }' \
			"$EVENTS" 2>/dev/null || printf '0'
	)
	if [ "$recent" -lt 2 ]; then
		return
	fi
	if tmux ls 2>/dev/null | grep -q '^rtc-guard-codex-'; then
		return
	fi

	session=rtc-guard-codex-$(date -u +%Y%m%dT%H%M%SZ)
	prompt=$LOG_DIR/$session.prompt.md
	report=$LOG_DIR/$session.report.md
	codex_log=$LOG_DIR/$session.stderr.log
	cat > "$prompt" <<PROMPT
You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents. Work locally in this tmux/Codex process.

The outside-tmux guard restarted pool "$pool" at least twice in the last 30 minutes.
Most recent reason: $reason

Inspect these logs and current tmux/process state:
- Guard: $LOG_DIR/guard.log and $EVENTS
- Coverage guided: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/
- Strict expansion: /media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515/logs/
- Focused shards: /media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515/logs/
- Gap booster: /media/volume/danluu-fuzz-data/rtc-gap-booster-20260515/logs/
- Lower-level fuzzing: /media/volume/danluu-fuzz-data/rtc-lower-level-fuzz-20260516/ and /media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-20260516/
- Duplicate/noise persona loop: /media/volume/danluu-fuzz-data/rtc-duplicate-noise-persona-loop-20260516/
- Level-mix controller: $LEVEL_MIX_BASE/
- Native/protocol harness loops: $NATIVE_ASSERT_BASE/
- Structural watchdog: $STRUCTURAL_BASE/
- Fuzz-only assertion loop: /media/volume/danluu-fuzz-data/rtc-fuzz-only-asserts-20260515/
- Repo root: $REPO

Task:
1. Determine why the supervised fuzzing pool is repeatedly disappearing or stalling.
2. Make the smallest useful operational or harness fix if one is evident.
3. Do not add behavior-disable flags such as DISABLE_SYNC_FAULTS, DISABLE_PARSER_STRESS, DISABLE_REVISION_RESTORE, DISABLE_RELOAD, or DISABLE_RANDOM_RELOAD.
4. Run focused checks for any changed files.
5. Write a concise report to: $report
PROMPT
	log "launching $session for repeated restarts in $pool: $reason"
	tmux new-session -d -s "$session" "bash -lc 'cd \"$REPO\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\"; \"$CODEX_BIN_DIR/codex\" -a never exec --skip-git-repo-check -m gpt-5.5 -c model_reasoning_effort=xhigh -s danger-full-access < \"$prompt\" > \"$report\" 2> \"$codex_log\"'"
}

restart_pool() {
	local pool=$1
	local reason=$2
	if restart_cooldown_active "$pool" "$reason"; then
		return
	fi
	if ! global_cpu_admission_allows "$pool"; then
		return
	fi
	log "restart requested pool=$pool reason=$reason"
	record_restart "$pool" "$reason"
	maybe_launch_codex "$pool" "$reason"
	case "$pool" in
		coverage)
			/tmp/start_rtc_coverage_guided_remote.sh >> "$LOG_DIR/coverage-start.log" 2>&1 || log "coverage start failed"
			/tmp/start_rtc_coverage_guided_watchdog_remote.sh >> "$LOG_DIR/coverage-watchdog-start.log" 2>&1 || log "coverage watchdog start failed"
			;;
		strict)
			/tmp/start_rtc_strict_expansion.sh >> "$LOG_DIR/strict-start.log" 2>&1 || log "strict start failed"
			;;
		focused)
			/tmp/start_rtc_focused_shards.sh >> "$LOG_DIR/focused-start.log" 2>&1 || log "focused start failed"
			;;
		focused-gap)
			/tmp/start_rtc_focused_gap_codex_loop.sh >> "$LOG_DIR/focused-gap-start.log" 2>&1 || log "focused gap loop start failed"
			;;
		gap-booster)
			/tmp/start_rtc_gap_booster.sh >> "$LOG_DIR/gap-booster-start.log" 2>&1 || log "gap booster start failed"
			;;
		lower-level)
			if ! has_session rtc-lower-level-fuzz-loop; then
				bash "$REPO/bin/rtc-lower-level-fuzz-loop-remote.sh" start >> "$LOG_DIR/lower-level-start.log" 2>&1 || log "unit/property lower-level start failed"
			fi
			;;
		cg-lower-level)
			if ! coverage_guided_lower_level_b64_satisfied; then
				start_coverage_guided_lower_level_b64_or_replacement
			fi
			;;
		duplicate-noise)
			tmux kill-session -t rtc-duplicate-noise-persona-loop 2>/dev/null || true
			tmux new-session -d -s rtc-duplicate-noise-persona-loop \
				"bash -lc 'cd \"$REPO\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\"; bash \"$REPO/bin/rtc-duplicate-noise-persona-loop-remote.sh\" >> \"$LOG_DIR/duplicate-noise-loop.log\" 2>&1'" ||
				log "duplicate/noise persona loop start failed"
			;;
		level-mix)
			if [ -x "$LEVEL_MIX_BASE/rtc-fuzz-level-mix-persona-loop.sh" ] && [ -x "$LEVEL_MIX_BASE/rtc-fuzz-level-mix-watchdog.sh" ]; then
				if ! has_session rtc-fuzz-level-mix-persona-loop; then
					tmux new-session -d -s rtc-fuzz-level-mix-persona-loop "$LEVEL_MIX_BASE/rtc-fuzz-level-mix-persona-loop.sh" ||
						log "level-mix loop start failed"
				fi
				if ! has_session rtc-fuzz-level-mix-persona-loop-watchdog; then
					tmux new-session -d -s rtc-fuzz-level-mix-persona-loop-watchdog "$LEVEL_MIX_BASE/rtc-fuzz-level-mix-watchdog.sh" ||
						log "level-mix watchdog start failed"
				fi
			else
				bash "$REPO/bin/rtc-fuzz-level-mix-persona-loop-remote.sh" >> "$LOG_DIR/level-mix-start.log" 2>&1 || log "level-mix loop start failed"
			fi
			;;
		native-protocol)
			if [ -x "$NATIVE_ASSERT_BASE/native-harness-persona-loop.sh" ] && [ -x "$NATIVE_ASSERT_BASE/protocol/protocol-server-persona-loop.sh" ]; then
				if ! has_session rtc-native-harness-persona-loop; then
					tmux new-session -d -s rtc-native-harness-persona-loop "$NATIVE_ASSERT_BASE/native-harness-persona-loop.sh" ||
						log "native harness loop start failed"
				fi
				if ! has_session rtc-protocol-server-persona-loop; then
					tmux new-session -d -s rtc-protocol-server-persona-loop "$NATIVE_ASSERT_BASE/protocol/protocol-server-persona-loop.sh" ||
						log "protocol server loop start failed"
				fi
			else
				bash "$REPO/bin/rtc-native-assert-protocol-work-start-remote.sh" >> "$LOG_DIR/native-protocol-start.log" 2>&1 || log "native/protocol loop start failed"
			fi
			;;
		asserts)
			/tmp/start_rtc_fuzz_only_asserts_loop.sh >> "$LOG_DIR/fuzz-only-asserts-start.log" 2>&1 || log "fuzz-only asserts loop start failed"
			;;
		deferred)
			/tmp/start_rtc_deferred_work_promotion_loop.sh >> "$LOG_DIR/deferred-work-start.log" 2>&1 || log "deferred work promotion loop start failed"
			;;
		pr-progress)
			if [ -x /tmp/start_rtc_pr_progress_controller.sh ]; then
				/tmp/start_rtc_pr_progress_controller.sh >> "$LOG_DIR/pr-progress-controller-start.log" 2>&1 || log "PR progress controller start failed"
			else
				mkdir -p "$PR_PROGRESS_BASE"
				install -m 755 "$REPO/bin/rtc-pr-progress-controller-remote.sh" "$PR_PROGRESS_BASE/rtc-pr-progress-controller.sh"
				"$PR_PROGRESS_BASE/rtc-pr-progress-controller.sh" start >> "$LOG_DIR/pr-progress-controller-start.log" 2>&1 || log "PR progress controller start failed"
			fi
			;;
		finalization)
			/tmp/start_rtc_pr_finalization_loop.sh >> "$LOG_DIR/pr-finalization-start.log" 2>&1 || log "PR finalization loop start failed"
			;;
		critical-pr)
			/tmp/start_rtc_critical_path_pr_executor_loop.sh >> "$LOG_DIR/critical-pr-executor-start.log" 2>&1 || log "critical-path PR executor start failed"
			;;
		productive-analysis)
			if [ -x /tmp/start_rtc_productive_analysis_loop.sh ]; then
				/tmp/start_rtc_productive_analysis_loop.sh start >> "$LOG_DIR/productive-analysis-start.log" 2>&1 || log "productive analysis loop start failed"
			else
				cd "$REPO"
				bin/rtc-productive-analysis-loop-remote.sh start >> "$LOG_DIR/productive-analysis-start.log" 2>&1 || log "productive analysis loop start failed"
			fi
			;;
		resource)
			tmux kill-session -t rtc-resource-autoscaler 2>/dev/null || true
			stop_unsupervised_resource_autoscaler
			tmux new-session -d -s rtc-resource-autoscaler "bash -lc '$RESOURCE_BASE/rtc-resource-autoscaler.sh >> \"$LOG_DIR/resource-autoscaler-start.log\" 2>&1'" ||
				log "resource autoscaler start failed"
			;;
		disk-maintenance)
			if [ -x /tmp/start_rtc_disk_maintenance.sh ]; then
				tmux new-session -d -s rtc-disk-maintenance "bash -lc '/tmp/start_rtc_disk_maintenance.sh >> \"$LOG_DIR/disk-maintenance-start.log\" 2>&1'" ||
					log "disk maintenance start failed"
			else
				tmux new-session -d -s rtc-disk-maintenance "bash -lc 'cd \"$REPO\"; bin/rtc-disk-maintenance-remote.sh >> \"$LOG_DIR/disk-maintenance-start.log\" 2>&1'" ||
					log "disk maintenance start failed"
			fi
			;;
		structural)
			/tmp/start_rtc_structural_watchdog.sh >> "$LOG_DIR/structural-watchdog-start.log" 2>&1 || log "structural watchdog start failed"
			;;
	esac
}

run_loop() {
	if ! flock -n --close "$LOCK_FILE" "$0" run-locked; then
		log "another guard loop already holds $LOCK_FILE"
		exit 0
	fi
}

run_loop_locked() {
	printf '%s\n' "$$" > "$PID_FILE"
	child_pid=""
	cleanup() {
		if [ -n "$child_pid" ]; then
			kill "$child_pid" 2>/dev/null || true
			wait "$child_pid" 2>/dev/null || true
		fi
		rm -f "$PID_FILE"
	}
	trap cleanup EXIT
	trap 'cleanup; exit 0' INT TERM
	touch "$EVENTS"
	log "guard loop started pid=$$"
	while true; do
		coverage_needs_restart=0
			if ! has_session rtc-coverage-guided-novelty; then
				if coverage_start_in_progress; then
					:
				else
					coverage_needs_restart=1
				fi
			elif ! has_session rtc-coverage-guided-watchdog; then
				if coverage_start_in_progress; then
					:
				else
					log "coverage watchdog missing; restarting watchdog sidecar"
					/tmp/start_rtc_coverage_guided_watchdog_remote.sh >> "$LOG_DIR/coverage-watchdog-start.log" 2>&1 || log "coverage watchdog start failed"
				fi
			elif ! coverage_supervisor_session_exists; then
				if coverage_start_in_progress || coverage_supervisor_in_startup_grace; then
					:
			else
				coverage_needs_restart=1
			fi
		fi
		if [ "$coverage_needs_restart" = 1 ]; then
			restart_pool coverage "missing coverage-guided tmux session"
		elif has_session rtc-coverage-guided-novelty && coverage_materialization_stalled; then
			restart_pool coverage "coverage-guided novelty materialization stalled with empty groups while current-run noise is clear"
		fi

		if ! has_session rtc-fuzz-strict-expansion ||
			! has_session rtc-fuzz-strict-expansion-watchdog ||
			! has_session rtc-fuzz-strict-expansion-analysis; then
			maybe_restart_optional_browser_pool strict "missing strict-expansion tmux session"
		fi

		if ! has_session rtc-focused-shards; then
			maybe_restart_optional_browser_pool focused "missing focused-shards supervisor tmux session"
		else
			if ! has_session rtc-focused-shards-watchdog ||
				! has_session rtc-focused-shards-analysis; then
				log "focused sidecar missing; restarting focused sidecars"
				restart_focused_sidecars >> "$LOG_DIR/focused-sidecars-start.log" 2>&1 ||
					log "focused sidecar restart failed"
			fi
			if ! has_session rtc-focused-shards-gap-codex-loop; then
				restart_pool focused-gap "missing focused Codex gap loop"
			fi
		fi

		if ! has_session rtc-gap-booster ||
			! has_session rtc-gap-booster-watchdog ||
			! has_session rtc-gap-booster-analysis; then
			maybe_restart_optional_browser_pool gap-booster "missing gap-booster tmux session"
		fi

		if ! has_session rtc-lower-level-fuzz-loop; then
			restart_pool lower-level "missing unit/property lower-level fuzz tmux session"
		fi

		if ! coverage_guided_lower_level_b64_satisfied; then
			restart_pool cg-lower-level "missing coverage-guided lower-level b64/replacement tmux session"
		fi

		if ! has_session rtc-duplicate-noise-persona-loop; then
			restart_pool duplicate-noise "missing duplicate/noise persona loop"
		fi

		if ! has_session rtc-fuzz-level-mix-persona-loop ||
			! has_session rtc-fuzz-level-mix-persona-loop-watchdog; then
			restart_pool level-mix "missing level-mix persona loop or watchdog"
		fi

		if ! has_session rtc-native-harness-persona-loop ||
			! has_session rtc-protocol-server-persona-loop; then
			restart_pool native-protocol "missing native/protocol persona loop"
		fi

		if ! has_session rtc-fuzz-only-asserts-loop; then
			restart_pool asserts "missing fuzz-only assertion loop"
		fi

		if ! has_session rtc-deferred-work-promotion-loop; then
			restart_pool deferred "missing deferred work promotion loop"
		fi

		if ! has_session rtc-pr-progress-controller-loop; then
			restart_pool pr-progress "missing PR progress controller loop"
		fi

		if ! has_session rtc-pr-finalization-loop; then
			restart_pool finalization "missing PR finalization loop"
		fi

		if ! has_session rtc-critical-path-pr-executor-loop; then
			restart_pool critical-pr "missing critical-path PR executor loop"
		fi

		if ! has_session rtc-productive-analysis-loop; then
			restart_pool productive-analysis "missing productive analysis loop"
		fi

		if ! has_session rtc-resource-autoscaler; then
			restart_pool resource "missing resource autoscaler"
		fi

		if ! has_session rtc-disk-maintenance; then
			restart_pool disk-maintenance "missing disk maintenance loop"
		fi

		if ! has_session rtc-structural-issue-watchdog; then
			restart_pool structural "missing structural issue watchdog"
		fi

		sleep 120 &
		child_pid=$!
		wait "$child_pid" 2>/dev/null || true
		child_pid=""
	done
}

case "${1:-start}" in
	start)
		if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
			log "guard already running pid=$(cat "$PID_FILE")"
			exit 0
		fi
		clear_stale_lock_holder
		sleep 1
		setsid -f "$0" run >> "$LOG_DIR/guard.out" 2>&1 < /dev/null &
		sleep 1
		if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
			echo "guard pid=$(cat "$PID_FILE")"
		else
			echo "guard start requested"
		fi
		;;
	run)
		run_loop
		;;
	run-locked)
		run_loop_locked
		;;
	stop)
		if [ -f "$PID_FILE" ]; then
			kill "$(cat "$PID_FILE")" 2>/dev/null || true
			rm -f "$PID_FILE"
		fi
		;;
	status)
		if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
			echo "running pid=$(cat "$PID_FILE")"
		else
			echo "not running"
		fi
		;;
	*)
		echo "usage: $0 [start|run|stop|status]" >&2
		exit 2
		;;
esac
