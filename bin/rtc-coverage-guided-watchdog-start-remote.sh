#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin
REPO=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
BASE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515
mkdir -p "$BASE/logs" "$TMUX_WRAP"
cat > "$TMUX_WRAP/tmux" <<'SH'
#!/usr/bin/env bash
exec /usr/bin/tmux -L rtc-fuzz "$@"
SH
chmod +x "$TMUX_WRAP/tmux"
export PATH="$TMUX_WRAP:$NODE_BIN:$PATH"

tmux kill-session -t rtc-coverage-guided-watchdog 2>/dev/null || true
COMMAND="cd '$REPO'; export PATH='$TMUX_WRAP':'$NODE_BIN':\$PATH CI=1 RTC_FUZZ_SESSION_WATCHDOG_REPO_ROOT='$REPO' RTC_FUZZ_SESSION_WATCHDOG_SESSION='rtc-coverage-guided-novelty' RTC_FUZZ_SESSION_WATCHDOG_BASE_DIR='$BASE' RTC_FUZZ_SESSION_WATCHDOG_CURRENT_OUTPUT_FILE='$BASE/current-output-dir.txt' RTC_FUZZ_SESSION_WATCHDOG_STATE_RELATIVE_PATH='novelty-state.json' RTC_FUZZ_SESSION_WATCHDOG_STATUS_RELATIVE_PATH='novelty-status.md' RTC_FUZZ_SESSION_WATCHDOG_START_COMMAND='RTC_COVERAGE_CLEANUP_KEEP_WATCHDOG=1 /tmp/start_rtc_coverage_guided_remote.sh' RTC_FUZZ_SESSION_WATCHDOG_POLL_MS=60000 RTC_FUZZ_SESSION_WATCHDOG_STALE_MS=240000 RTC_FUZZ_SESSION_WATCHDOG_START_GRACE_MS=180000 RTC_FUZZ_SESSION_WATCHDOG_MIN_RESTART_INTERVAL_MS=300000; node bin/rtc-browser-fuzz-session-watchdog.mjs >> '$BASE/logs/session-watchdog-tmux.log' 2>&1"
tmux new-session -d -s rtc-coverage-guided-watchdog "bash -lc \"$COMMAND\""
tmux ls | grep -E 'rtc-coverage-guided|rtc-fuzz-strict|strict-expansion-watchdog' || true
