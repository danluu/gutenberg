#!/usr/bin/env bash
set -euo pipefail

BASE=/media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin
if [ -x "$TMUX_WRAP/tmux" ]; then
	export PATH="$TMUX_WRAP:$PATH"
fi
mkdir -p "$BASE/logs"
log="$BASE/logs/cleanup.log"

printf '[%s] cleanup focused shard processes\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$log"

for sess in \
	rtc-focused-shards \
	rtc-focused-shards-watchdog \
	rtc-focused-shards-analysis \
	rtc-focused-shards-gap-codex-loop; do
	tmux kill-session -t "$sess" 2>/dev/null || true
done

pids=$(
	pgrep -f 'bin/rtc-browser-fuzz-runner.mjs|collaboration-fuzz.spec.ts|wp-scripts test-playwright|@playwright/test/cli.js|packages/scripts/scripts/test-playwright.js' ||
		true
)
for pid in $pids; do
	[ -d "/proc/$pid" ] || continue
	cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null || true)
	case "$cwd" in
		"$BASE"/repos/*)
			cmd=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null | cut -c1-240 || true)
			printf '[%s] kill pid=%s cwd=%s cmd=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$pid" "$cwd" "$cmd" >> "$log"
			kill "$pid" 2>/dev/null || true
			;;
	esac
done

sleep 2

for pid in $pids; do
	[ -d "/proc/$pid" ] || continue
	cwd=$(readlink "/proc/$pid/cwd" 2>/dev/null || true)
	case "$cwd" in
		"$BASE"/repos/*)
			printf '[%s] kill -9 pid=%s cwd=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$pid" "$cwd" >> "$log"
			kill -9 "$pid" 2>/dev/null || true
			;;
	esac
done

for port in $(seq 19400 19420); do
	pid=$(
		ss -ltnp 2>/dev/null |
			sed -n "s/.*127\\.0\\.0\\.1:$port.*pid=\\([0-9]*\\).*/\\1/p" |
			head -1
	)
	if [ -n "${pid:-}" ]; then
		printf '[%s] kill focused ws relay port=%s pid=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$port" "$pid" >> "$log"
		kill "$pid" 2>/dev/null || true
	fi
done

profiles=(
	late-join-a
	late-join-b
	late-join-c
	revision-recovery-a
	revision-recovery-b
	rich-text-a
	rich-text-b
	async-server-a
	async-server-b
	auth-locks-a
	auth-locks-b
	long-doc-a
	long-doc-b
	same-user-stale-tabs
)

for p in "${profiles[@]}"; do
	mapfile -t containers < <( docker ps -aq --filter "name=wp-env-${p}" 2>/dev/null || true )
	if [ "${#containers[@]}" -gt 0 ]; then
		printf '[%s] remove focused wp-env containers profile=%s count=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$p" "${#containers[@]}" >> "$log"
		docker rm -f "${containers[@]}" >> "$log" 2>&1 || true
	fi

	mapfile -t volumes < <( docker volume ls -q 2>/dev/null | grep -E "^wp-env-${p}" || true )
	if [ "${#volumes[@]}" -gt 0 ]; then
		printf '[%s] remove focused wp-env volumes profile=%s count=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$p" "${#volumes[@]}" >> "$log"
		docker volume rm -f "${volumes[@]}" >> "$log" 2>&1 || true
	fi

	mapfile -t networks < <( docker network ls --format '{{.Name}}' 2>/dev/null | grep -E "^wp-env-${p}" || true )
	if [ "${#networks[@]}" -gt 0 ]; then
		printf '[%s] remove focused wp-env networks profile=%s count=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$p" "${#networks[@]}" >> "$log"
		docker network rm "${networks[@]}" >> "$log" 2>&1 || true
	fi

	if [ -d "$BASE/wp-env/$p" ]; then
		printf '[%s] remove focused wp-env home profile=%s path=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$p" "$BASE/wp-env/$p" >> "$log"
		chmod -R u+rwX "$BASE/wp-env/$p" >> "$log" 2>&1 || true
		rm -rf "$BASE/wp-env/$p" >> "$log" 2>&1 ||
			sudo rm -rf "$BASE/wp-env/$p" >> "$log" 2>&1 ||
			true
	fi
done
