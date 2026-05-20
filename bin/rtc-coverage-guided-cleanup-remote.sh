#!/usr/bin/env bash
set -euo pipefail

REPO=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
BASE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515

mkdir -p "$BASE/logs"
log="$BASE/logs/cleanup.log"

printf '[%s] cleanup coverage-guided stale processes\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$log"

coverage_owned_cwd() {
	local cwd="$1"
	case "$cwd" in
		"$REPO"|"$BASE"/run-*/repos/*|"$BASE"/repos/*)
			return 0
			;;
	esac
	return 1
}

kill_tmux_session() {
	local sess="$1"
	if /usr/bin/tmux -L rtc-fuzz list-sessions -F '#S' 2>/dev/null |
		grep -Fxq "$sess"; then
		printf '[%s] kill tmux session=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$sess" >> "$log"
		/usr/bin/tmux -L rtc-fuzz kill-session -t "$sess" 2>/dev/null || true
		for _ in 1 2 3 4 5 6 7 8 9 10; do
			if ! /usr/bin/tmux -L rtc-fuzz list-sessions -F '#S' 2>/dev/null |
				grep -Fxq "$sess"; then
				return
			fi
			sleep 0.2
		done
		printf '[%s] tmux session still present after kill request session=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$sess" >> "$log"
	fi
}

if [ "${RTC_COVERAGE_CLEANUP_KEEP_WATCHDOG:-0}" != "1" ]; then
	kill_tmux_session rtc-coverage-guided-watchdog
else
	printf '[%s] keep tmux session=rtc-coverage-guided-watchdog\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$log"
fi
kill_tmux_session rtc-coverage-guided-novelty
kill_tmux_session rtc-coverage-guided-analysis
for sess in $(/usr/bin/tmux -L rtc-fuzz list-sessions -F '#S' 2>/dev/null |
	grep -E '^(rtc-cov-analysis|rtc-cov-deep)(-|$)' || true); do
	kill_tmux_session "$sess"
done

sleep 5
kill_tmux_session rtc-coverage-guided-supervisor
for sess in $(/usr/bin/tmux -L rtc-fuzz list-sessions -F '#S' 2>/dev/null |
	grep -E '^rtc-coverage-guided-supervisor-' || true); do
	kill_tmux_session "$sess"
done

patterns='bin/rtc-browser-fuzz-novelty-monitor.mjs|bin/rtc-browser-fuzz-live-analysis-monitor.mjs|bin/rtc-browser-fuzz-analysis-tier.mjs|bin/rtc-browser-fuzz-deep-analysis-tier.mjs|bin/rtc-browser-fuzz-supervisor.mjs|bin/rtc-browser-fuzz-runner.mjs|collaboration-fuzz.spec.ts|wp-scripts test-playwright|@playwright/test/cli.js|packages/scripts/scripts/test-playwright.js'
pids=$(pgrep -f "$patterns" || true)
coverage_owned_pid() {
	local pid="$1"
	local env_text
	env_text=$(tr '\0' '\n' < "/proc/$pid/environ" 2>/dev/null || true)
	case "$env_text" in
		*"RTC_FUZZ_SUPERVISOR_OUTPUT_DIR=$BASE/"*|*"RTC_FUZZ_OUTPUT_DIR=$BASE/"*|*"RTC_FUZZ_NOVELTY_OUTPUT_DIR=$BASE/"*|*"RTC_FUZZ_NOVELTY_REPOS_BASE=$BASE/"*|*"RTC_FUZZ_NOVELTY_WP_ENV_HOME_BASE=$BASE/"*|*"RTC_FUZZ_LIVE_ANALYSIS_CURRENT_OUTPUT_POINTER=$BASE/current-output-dir.txt"*|*"RTC_FUZZ_ANALYSIS_CURRENT_OUTPUT_POINTER=$BASE/current-output-dir.txt"*|*"RTC_FUZZ_DEEP_ANALYSIS_CURRENT_OUTPUT_POINTER=$BASE/current-output-dir.txt"*)
			return 0
			;;
	esac
	return 1
}

for pid in $pids; do
	[ -d "/proc/$pid" ] || continue
	cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null || true)
	if coverage_owned_cwd "$cwd" && coverage_owned_pid "$pid"; then
		cmd=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null | cut -c1-240 || true)
		printf '[%s] kill pid=%s cwd=%s cmd=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$pid" "$cwd" "$cmd" >> "$log"
		kill "$pid" 2>/dev/null || true
	elif coverage_owned_cwd "$cwd"; then
		printf '[%s] skip non-coverage pid=%s cwd=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$pid" "$cwd" >> "$log"
	fi
done

sleep 2

for pid in $pids; do
	[ -d "/proc/$pid" ] || continue
	cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null || true)
	if coverage_owned_cwd "$cwd" && coverage_owned_pid "$pid"; then
		printf '[%s] kill -9 pid=%s cwd=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$pid" "$cwd" >> "$log"
		kill -9 "$pid" 2>/dev/null || true
	fi
done

relay_pid=$(ss -ltnp 2>/dev/null | sed -n 's/.*127\.0\.0\.1:19380.*pid=\([0-9]*\).*/\1/p' | head -1)
if [ -n "${relay_pid:-}" ]; then
	printf '[%s] kill ws relay pid=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$relay_pid" >> "$log"
	kill "$relay_pid" 2>/dev/null || true
fi

if command -v docker >/dev/null 2>&1; then
	mapfile -t container_ids < <(docker ps -aq --filter 'name=wp-env-novelty-' 2>/dev/null || true)
	if [ "${#container_ids[@]}" -gt 0 ]; then
		printf '[%s] docker rm -f wp-env-novelty containers count=%s ids=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "${#container_ids[@]}" "${container_ids[*]}" >> "$log"
		docker rm -f "${container_ids[@]}" >> "$log" 2>&1 || true
	fi

	mapfile -t network_names < <(docker network ls --format '{{.Name}}' 2>/dev/null | grep -E '^wp-env-novelty-' || true)
	if [ "${#network_names[@]}" -gt 0 ]; then
		printf '[%s] docker network rm wp-env-novelty count=%s names=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "${#network_names[@]}" "${network_names[*]}" >> "$log"
		docker network rm "${network_names[@]}" >> "$log" 2>&1 || true
	fi

	mapfile -t volume_names < <(docker volume ls -q 2>/dev/null | grep -E '^wp-env-novelty-' || true)
	if [ "${#volume_names[@]}" -gt 0 ]; then
		printf '[%s] docker volume rm wp-env-novelty count=%s names=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "${#volume_names[@]}" "${volume_names[*]}" >> "$log"
		docker volume rm -f "${volume_names[@]}" >> "$log" 2>&1 || true
	fi
fi
