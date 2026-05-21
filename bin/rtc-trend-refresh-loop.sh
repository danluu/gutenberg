#!/usr/bin/env bash
set -euo pipefail

OPS_DIR="${RTC_TREND_OPS_DIR:-/private/tmp/rtc-jetstream2-trend-autoupdate}"
CHECKOUT="${RTC_TREND_CHECKOUT:-/private/tmp/gutenberg-fuzz-progress-explain}"
BRANCH="${RTC_TREND_BRANCH:-explain/rtc-jetstream2-fuzz-progress-20260515}"
REMOTE="${RTC_TREND_REMOTE:-danluu}"
SOURCE_REPO="${RTC_TREND_SOURCE_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
SESSION="${RTC_TREND_TMUX_SESSION:-rtc-trend-autoupdate}"
IDLE_SECONDS="${RTC_TREND_REFRESH_IDLE_SECONDS:-0}"
LOG_DIR="$OPS_DIR/logs"
LOCK="$OPS_DIR/refresh-loop.lock"

mkdir -p "$OPS_DIR" "$OPS_DIR/runs" "$LOG_DIR"

log() {
	printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG_DIR/loop.log"
}

install_ops() {
	install -m 755 "$SOURCE_REPO/bin/rtc-trend-collect-graph-inputs.sh" "$OPS_DIR/collect-graph-inputs.sh"
	install -m 755 "$SOURCE_REPO/bin/rtc-trend-generate-evidence.sh" "$OPS_DIR/generate-trend-evidence.sh"
	install -m 755 "$SOURCE_REPO/bin/rtc-trend-publish-evidence.sh" "$OPS_DIR/publish-trend-evidence.sh"
	install -m 755 "$SOURCE_REPO/bin/rtc-trend-run-codex-refresh.sh" "$OPS_DIR/run-codex-refresh.sh"
}

ensure_checkout() {
	if [ ! -d "$CHECKOUT/.git" ]; then
		git clone "$SOURCE_REPO" "$CHECKOUT"
	fi
	(
		cd "$CHECKOUT"
		git fetch "$REMOTE" "$BRANCH"
		if ! git diff --quiet || ! git diff --cached --quiet; then
			log "checkout has local changes; refresh job will preserve them"
			return
		fi
		git checkout -B "$BRANCH" "$REMOTE/$BRANCH"
	)
}

run_once() {
	local event_id="${1:-refresh-$(date -u +%Y%m%dT%H%M%SZ)}"
	install_ops
	ensure_checkout
	log "starting graph refresh event=$event_id"
	if RTC_TREND_OPS_DIR="$OPS_DIR" RTC_TREND_CHECKOUT="$CHECKOUT" RTC_TREND_BRANCH="$BRANCH" RTC_TREND_REMOTE="$REMOTE" "$OPS_DIR/run-codex-refresh.sh" "$event_id"; then
		log "finished graph refresh event=$event_id"
	else
		local status=$?
		log "graph refresh failed event=$event_id status=$status"
		return "$status"
	fi
}

run_loop() {
	exec 9>"$LOCK"
	if ! flock -n 9; then
		log "another trend refresh loop already holds $LOCK"
		exit 0
	fi
	while true; do
		run_once "loop-$(date -u +%Y%m%dT%H%M%SZ)" || true
		if [ "$IDLE_SECONDS" -gt 0 ]; then
			sleep "$IDLE_SECONDS"
		fi
	done
}

case "${1:-run}" in
	install-ops)
		install_ops
		;;
	once)
		shift || true
		run_once "${1:-manual-$(date -u +%Y%m%dT%H%M%SZ)}"
		;;
	run)
		run_loop
		;;
	start)
		install_ops
		if tmux has-session -t "$SESSION" 2>/dev/null; then
			log "tmux session already running: $SESSION"
			exit 0
		fi
		tmux new-session -d -s "$SESSION" "bash -lc 'RTC_TREND_OPS_DIR=\"$OPS_DIR\" RTC_TREND_CHECKOUT=\"$CHECKOUT\" RTC_TREND_BRANCH=\"$BRANCH\" RTC_TREND_REMOTE=\"$REMOTE\" RTC_TREND_SOURCE_REPO=\"$SOURCE_REPO\" \"$SOURCE_REPO/bin/rtc-trend-refresh-loop.sh\" run >> \"$LOG_DIR/tmux.log\" 2>&1'"
		log "started tmux session: $SESSION"
		;;
	stop)
		tmux kill-session -t "$SESSION" 2>/dev/null || true
		log "stopped tmux session: $SESSION"
		;;
	status)
		if tmux has-session -t "$SESSION" 2>/dev/null; then
			printf 'running session=%s\n' "$SESSION"
		else
			printf 'not running session=%s\n' "$SESSION"
		fi
		;;
	*)
		echo "usage: $0 [install-ops|once|run|start|stop|status]" >&2
		exit 2
		;;
esac
