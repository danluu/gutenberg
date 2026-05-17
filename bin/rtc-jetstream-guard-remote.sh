#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN_DIR=${HOME:-/home/exouser}/.local/bin
REPO=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
BASE=/media/volume/danluu-fuzz-data/rtc-jetstream-guard-20260515
COVERAGE_BASE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515
COVERAGE_START_LOCK=$COVERAGE_BASE/start.lock
LEVEL_MIX_BASE=/media/volume/danluu-fuzz-data/rtc-fuzz-level-mix-persona-loop-20260516
NATIVE_ASSERT_BASE=/media/volume/danluu-fuzz-data/rtc-native-assert-protocol-20260516
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin
LOG_DIR=$BASE/logs
PID_FILE=$BASE/guard.pid
LOCK_FILE=$BASE/guard.lock
EVENTS=$LOG_DIR/restart-events.tsv

mkdir -p "$LOG_DIR" "$TMUX_WRAP"
cat > "$TMUX_WRAP/tmux" <<'SH'
#!/usr/bin/env bash
exec /usr/bin/tmux -L rtc-fuzz "$@"
SH
chmod +x "$TMUX_WRAP/tmux"
export PATH="$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:$PATH"

log() {
	printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$LOG_DIR/guard.log"
}

has_session() {
	tmux list-sessions -F '#S' 2>/dev/null | grep -Fxq "$1"
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
	has_session rtc-coverage-guided-supervisor && return 1
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
const parseMetric = ( label ) => {
	const match = status.match( new RegExp( `- ${ label.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ) }:\\s*([0-9.]+)` ) );
	if ( ! match ) {
		return null;
	}
	return Number( match[ 1 ] );
};
const signatures = parseMetric( 'signatures' );
const duplicateShare = parseMetric( 'top duplicate family share' );
const likelyReal = parseMetric( 'likely-real visible' );
const currentNoiseClear =
	( signatures === null || signatures === 0 || duplicateShare === 0 ) &&
	( likelyReal === null || likelyReal === 0 );
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
				log "killing stale guard run lock holder pid=$pid"
				for child in $(pgrep -P "$pid" 2>/dev/null || true); do
					kill "$child" 2>/dev/null || true
				done
				kill "$pid" 2>/dev/null || true
				sleep 1
				if kill -0 "$pid" 2>/dev/null; then
					kill -KILL "$pid" 2>/dev/null || true
				fi
				continue
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
			if ! has_session rtc-coverage-guided-lower-level-b64; then
				RTC_CG_LOWER_LEVEL_SESSION=rtc-coverage-guided-lower-level-b64 bash "$REPO/bin/rtc-coverage-guided-lower-level-start-remote.sh" start >> "$LOG_DIR/cg-lower-level-start.log" 2>&1 || log "coverage-guided lower-level start failed"
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
		finalization)
			/tmp/start_rtc_pr_finalization_loop.sh >> "$LOG_DIR/pr-finalization-start.log" 2>&1 || log "PR finalization loop start failed"
			;;
		resource)
			tmux kill-session -t rtc-resource-autoscaler 2>/dev/null || true
			tmux new-session -d -s rtc-resource-autoscaler "bash -lc '/tmp/start_rtc_resource_autoscaler.sh >> \"$LOG_DIR/resource-autoscaler-start.log\" 2>&1'" ||
				log "resource autoscaler start failed"
			;;
	esac
}

run_loop() {
	exec 9>"$LOCK_FILE"
	if ! flock -n 9; then
		log "another guard loop already holds $LOCK_FILE"
		exit 0
	fi
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
			elif ! has_session rtc-coverage-guided-supervisor; then
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
			restart_pool strict "missing strict-expansion tmux session"
		fi

		if ! has_session rtc-focused-shards ||
			! has_session rtc-focused-shards-watchdog ||
			! has_session rtc-focused-shards-analysis; then
			restart_pool focused "missing focused-shards tmux session"
		elif ! has_session rtc-focused-shards-gap-codex-loop; then
			restart_pool focused-gap "missing focused Codex gap loop"
		fi

		if ! has_session rtc-gap-booster ||
			! has_session rtc-gap-booster-watchdog ||
			! has_session rtc-gap-booster-analysis; then
			restart_pool gap-booster "missing gap-booster tmux session"
		fi

		if ! has_session rtc-lower-level-fuzz-loop ||
			! has_session rtc-coverage-guided-lower-level-b64; then
			restart_pool lower-level "missing lower-level fuzz tmux session"
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

		if ! has_session rtc-pr-finalization-loop; then
			restart_pool finalization "missing PR finalization loop"
		fi

		if ! has_session rtc-resource-autoscaler; then
			restart_pool resource "missing resource autoscaler"
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
