#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN_DIR=${HOME:-/home/exouser}/.local/bin
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin
SRC=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
BASE=/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516
RUNTIME_SRC=${RTC_DEFERRED_WORK_RUNTIME_SRC:-$SRC/bin/rtc-deferred-work-promotion-runtime-remote.sh}
LOOP=$BASE/deferred-work-promotion-loop.sh
SESSION=rtc-deferred-work-promotion-loop

mkdir -p "$BASE/logs" "$BASE/cycles" "$BASE/worktrees" "$TMUX_WRAP"
cat > "$TMUX_WRAP/tmux" <<'SH'
#!/usr/bin/env bash
exec /usr/bin/tmux -L rtc-fuzz "$@"
SH
chmod +x "$TMUX_WRAP/tmux"
export PATH="$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:$PATH"

if [ -s "$RUNTIME_SRC" ]; then
	install -m 755 "$RUNTIME_SRC" "$LOOP"
fi
bash -n "$LOOP"
tmux kill-session -t "$SESSION" 2>/dev/null || true
tmux new-session -d -s "$SESSION" "bash '$LOOP'"
tmux ls | rg "^$SESSION:" || true
