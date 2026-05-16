#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN_DIR=${HOME:-/home/exouser}/.local/bin
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin
REPO=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
BASE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515
CUMULATIVE_ROOTS_FILE="$BASE/cumulative-observed-roots.txt"
START_LOCK="$BASE/start.lock"
mkdir -p "$TMUX_WRAP" "$BASE/logs"
exec 8>"$START_LOCK"
flock 8
cat > "$TMUX_WRAP/tmux" <<'SH'
#!/usr/bin/env bash
exec /usr/bin/tmux -L rtc-fuzz "$@"
SH
chmod +x "$TMUX_WRAP/tmux"
export PATH="$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:$PATH"
STRICT=$(cat /media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515/current-run-root.txt 2>/dev/null || true)
ISO_HTTP=$(cat /media/volume/danluu-fuzz-data/rtc-fuzz-validation-isolated-20260515/current-http-run-root.txt 2>/dev/null || true)
ISO_WS=$(cat /media/volume/danluu-fuzz-data/rtc-fuzz-validation-isolated-20260515/current-ws-run-root.txt 2>/dev/null || true)
FOCUSED=$(cat /media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515/current-run-root.txt 2>/dev/null || true)
GAP_BOOSTER=$(cat /media/volume/danluu-fuzz-data/rtc-gap-booster-20260515/current-run-root.txt 2>/dev/null || true)
PREVIOUS_COVERAGE=$(cat "$BASE/current-output-dir.txt" 2>/dev/null || true)
OUT=$BASE/run-$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$OUT"
if [ -x /tmp/cleanup_rtc_coverage_guided_remote.sh ]; then
	/tmp/cleanup_rtc_coverage_guided_remote.sh || true
else
	tmux kill-session -t rtc-coverage-guided-novelty 2>/dev/null || true
	tmux kill-session -t rtc-coverage-guided-supervisor 2>/dev/null || true
fi
printf '%s\n' "$OUT" > "$BASE/current-output-dir.txt"
{
	for ROOT in "$STRICT" "$ISO_HTTP" "$ISO_WS" "$FOCUSED" "$GAP_BOOSTER" "$PREVIOUS_COVERAGE"; do
		if [ -n "$ROOT" ]; then
			printf '%s\n' "$ROOT"
		fi
	done
	if [ -n "$PREVIOUS_COVERAGE" ] && [ -f "$PREVIOUS_COVERAGE/observed-roots.txt" ]; then
		cat "$PREVIOUS_COVERAGE/observed-roots.txt"
	fi
	if [ -f "$CUMULATIVE_ROOTS_FILE" ]; then
		cat "$CUMULATIVE_ROOTS_FILE"
	fi
} | awk 'NF && !seen[$0]++' > "$OUT/observed-roots.txt"
cp "$OUT/observed-roots.txt" "$CUMULATIVE_ROOTS_FILE"
OBSERVED=$(paste -sd: "$OUT/observed-roots.txt")
if [ -n "$PREVIOUS_COVERAGE" ] && [ -f "$PREVIOUS_COVERAGE/novelty-state.json" ]; then
	cp "$PREVIOUS_COVERAGE/novelty-state.json" "$OUT/novelty-state.json"
fi
BUDGET_ENV=${RTC_RESOURCE_BUDGET_ENV:-/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516/current-budget.env}
if [ -f "$BUDGET_ENV" ]; then
	# shellcheck disable=SC1090
	. "$BUDGET_ENV"
fi
NOVELTY_TARGET_ENABLED_GROUPS=${RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS:-8}
NOVELTY_MAX_ENABLED_GROUPS=${RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS:-9}
NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS=${RTC_FUZZ_NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS:-$NOVELTY_MAX_ENABLED_GROUPS}
NOVELTY_LOAD_HEADROOM_MULTIPLIER=${RTC_FUZZ_NOVELTY_LOAD_HEADROOM_MULTIPLIER:-1.12}
NOVELTY_DURATION_HOURS=${RTC_FUZZ_NOVELTY_DURATION_HOURS:-12}
NOVELTY_INTERVAL_MS=${RTC_FUZZ_NOVELTY_INTERVAL_MS:-60000}
NOVELTY_CODEX_INTERVAL_MINUTES=${RTC_FUZZ_NOVELTY_COVERAGE_CODEX_INTERVAL_MINUTES:-30}
RUN_SCRIPT="$OUT/run-monitor.sh"
cat > "$RUN_SCRIPT" <<RUN
#!/usr/bin/env bash
set -u
cd '$REPO'
export PATH='$CODEX_BIN_DIR':'$TMUX_WRAP':'$NODE_BIN':\$PATH
export CI=1
export RTC_FUZZ_NOVELTY_OUTPUT_DIR='$OUT'
export RTC_FUZZ_NOVELTY_OBSERVED_RUN_DIRS='$OBSERVED'
export RTC_FUZZ_NOVELTY_SUPERVISOR_SESSION='rtc-coverage-guided-supervisor'
export RTC_FUZZ_NOVELTY_BASE_URL='http://localhost:9540'
export RTC_FUZZ_NOVELTY_WP_ENV_PORT='9540'
export RTC_FUZZ_NOVELTY_WS_PORT='19380'
export RTC_FUZZ_NOVELTY_DURATION_HOURS='$NOVELTY_DURATION_HOURS'
export RTC_FUZZ_NOVELTY_INTERVAL_MS='$NOVELTY_INTERVAL_MS'
export RTC_FUZZ_NOVELTY_FORCE_START='1'
export RTC_FUZZ_NOVELTY_ENABLE_SAME_USER='1'
export RTC_FUZZ_NOVELTY_TARGET_ENABLED_GROUPS='$NOVELTY_TARGET_ENABLED_GROUPS'
export RTC_FUZZ_NOVELTY_LOAD_HEADROOM_MULTIPLIER='$NOVELTY_LOAD_HEADROOM_MULTIPLIER'
export RTC_FUZZ_NOVELTY_MAX_ENABLED_GROUPS='$NOVELTY_MAX_ENABLED_GROUPS'
export RTC_FUZZ_NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS='$NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS'
export RTC_FUZZ_NOVELTY_PAUSE_ON_STARTUP_FAILURE='0'
export RTC_FUZZ_NOVELTY_PAUSE_ON_TRIAGE_NOISE='0'
export RTC_FUZZ_NOVELTY_AUTO_GOAL_EXPANSION='1'
export RTC_FUZZ_NOVELTY_AUTO_GOAL_EXPANSION_THRESHOLD='3'
export RTC_FUZZ_NOVELTY_AUTO_GOAL_EXPANSION_BATCH_SIZE='12'
export RTC_FUZZ_NOVELTY_COVERAGE_CODEX='1'
export RTC_FUZZ_NOVELTY_COVERAGE_CODEX_CWD='$REPO'
export RTC_FUZZ_CODEX_BIN='$CODEX_BIN_DIR/codex'
export RTC_FUZZ_NOVELTY_COVERAGE_CODEX_INTERVAL_MINUTES='$NOVELTY_CODEX_INTERVAL_MINUTES'
export RTC_FUZZ_NOVELTY_COVERAGE_GUIDANCE_STALL_PASSES='2'
export RTC_FUZZ_NOVELTY_COVERAGE_QUALITY_ISSUE_PASSES='2'
node bin/rtc-browser-fuzz-novelty-monitor.mjs >> '$BASE/logs/monitor.log' 2>&1
code=\$?
stamp=\$(date -u +%Y-%m-%dT%H:%M:%SZ)
printf '[%s] MONITOR_EXIT code=%s output=%s\n' "\$stamp" "\$code" '$OUT' >> '$BASE/logs/monitor.log'
printf '[%s] MONITOR_EXIT code=%s\n' "\$stamp" "\$code" >> '$OUT/novelty-monitor.log'
exit "\$code"
RUN
chmod +x "$RUN_SCRIPT"
tmux new-session -d -s rtc-coverage-guided-novelty "$RUN_SCRIPT"
echo "OUT=$OUT"
tmux ls | grep -E 'rtc-coverage-guided|rtc-fuzz-strict|rtc-fuzz-iso' || true
