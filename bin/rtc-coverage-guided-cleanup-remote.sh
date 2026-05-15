#!/usr/bin/env bash
set -euo pipefail

REPO=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
BASE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515

mkdir -p "$BASE/logs"
log="$BASE/logs/cleanup.log"

printf '[%s] cleanup coverage-guided stale processes\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$log"

kill_tmux_session() {
	local sess="$1"
	if /usr/bin/tmux -L rtc-fuzz has-session -t "$sess" 2>/dev/null; then
		printf '[%s] kill tmux session=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$sess" >> "$log"
		/usr/bin/tmux -L rtc-fuzz kill-session -t "$sess" 2>/dev/null || true
	fi
}

for sess in rtc-coverage-guided-watchdog rtc-coverage-guided-novelty; do
	kill_tmux_session "$sess"
done

sleep 5
kill_tmux_session rtc-coverage-guided-supervisor

patterns='bin/rtc-browser-fuzz-runner.mjs|collaboration-fuzz.spec.ts|wp-scripts test-playwright|@playwright/test/cli.js|packages/scripts/scripts/test-playwright.js'
pids=$(pgrep -f "$patterns" || true)
for pid in $pids; do
	[ -d "/proc/$pid" ] || continue
	cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null || true)
	if [ "$cwd" = "$REPO" ]; then
		cmd=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null | cut -c1-240 || true)
		printf '[%s] kill pid=%s cwd=%s cmd=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$pid" "$cwd" "$cmd" >> "$log"
		kill "$pid" 2>/dev/null || true
	fi
done

sleep 2

for pid in $pids; do
	[ -d "/proc/$pid" ] || continue
	cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null || true)
	if [ "$cwd" = "$REPO" ]; then
		printf '[%s] kill -9 pid=%s cwd=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$pid" "$cwd" >> "$log"
		kill -9 "$pid" 2>/dev/null || true
	fi
done

relay_pid=$(ss -ltnp 2>/dev/null | sed -n 's/.*127\.0\.0\.1:19380.*pid=\([0-9]*\).*/\1/p' | head -1)
if [ -n "${relay_pid:-}" ]; then
	printf '[%s] kill ws relay pid=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$relay_pid" >> "$log"
	kill "$relay_pid" 2>/dev/null || true
fi
