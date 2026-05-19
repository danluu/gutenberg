#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN_DIR=${HOME:-/home/exouser}/.local/bin
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin
SRC=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
BASE=/media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515
mkdir -p "$BASE/logs"
mkdir -p "$TMUX_WRAP"
cat > "$TMUX_WRAP/tmux" <<'SH'
#!/usr/bin/env bash
exec /usr/bin/tmux -L rtc-fuzz "$@"
SH
chmod +x "$TMUX_WRAP/tmux"
export PATH="$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:$PATH"

tmux kill-session -t rtc-focused-shards-gap-codex-loop 2>/dev/null || true

cat > "$BASE/gap-codex-loop.sh" <<'LOOP'
#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN_DIR=${HOME:-/home/exouser}/.local/bin
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin
SRC=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
BASE=/media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515
COVERAGE_BASE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515
STATE="$BASE/logs/gap-codex-loop-state.tsv"
LOG="$BASE/logs/gap-codex-loop.log"
export PATH="$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:$PATH"

mkdir -p "$BASE/logs"
touch "$STATE"

while true; do
	now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
	run=$(cat "$BASE/current-run-root.txt" 2>/dev/null || true)
	if [ -z "$run" ] || [ ! -d "$run" ]; then
		printf '[%s] no focused run yet\n' "$now" >> "$LOG"
		sleep 600
		continue
	fi

	files=$(find "$run" -type f -name rtc-behavioral-coverage.ndjson 2>/dev/null | wc -l | tr -d ' ')
	records=$(
		find "$run" -type f -name rtc-behavioral-coverage.ndjson -print0 2>/dev/null |
			xargs -0 cat 2>/dev/null |
			wc -l |
			tr -d ' '
	)
	prev_run=$(awk -F '\t' 'END{print $1}' "$STATE")
	prev_records=$(awk -F '\t' 'END{print $2+0}' "$STATE")
	prev_time=$(awk -F '\t' 'END{print $3}' "$STATE")
	printf '%s\t%s\t%s\t%s\n' "$run" "$records" "$(date -u +%s)" "$files" >> "$STATE"

	if tmux ls 2>/dev/null | grep -q '^rtc-focused-gap-codex-'; then
		printf '[%s] codex already active records=%s files=%s\n' "$now" "$records" "$files" >> "$LOG"
		sleep 600
		continue
	fi

	launch=0
	reason=""
	if [ "$prev_run" = "$run" ] && [ "$records" -le "$prev_records" ] && [ -n "$prev_time" ]; then
		age=$(( $(date -u +%s) - prev_time ))
		if [ "$age" -ge 1200 ]; then
			launch=1
			reason="focused coverage records stalled for ${age}s at ${records} records"
		fi
	fi

	novelty=$(cat "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)
	if [ -f "$novelty/novelty-status.md" ] &&
		grep -q 'harness-work candidates: [1-9]' "$novelty/novelty-status.md"; then
		launch=1
		reason="coverage-guided monitor reports harness-work candidates"
	fi

	if [ "$launch" != 1 ]; then
		printf '[%s] no codex need records=%s files=%s prev=%s\n' "$now" "$records" "$files" "$prev_records" >> "$LOG"
		sleep 600
		continue
	fi

	ts=$(date -u +%Y%m%dT%H%M%SZ)
	session="rtc-focused-gap-codex-$ts"
	prompt="$BASE/logs/$session.prompt.md"
	report="$BASE/logs/$session.report.md"
	codex_log="$BASE/logs/$session.stderr.log"
	cat > "$prompt" <<PROMPT
You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents. Work locally in this tmux/Codex process.

Reason for invocation: $reason

Focused run root: $run
Coverage-guided current run: $novelty
Focused launcher: /tmp/start_rtc_focused_shards.sh
Focused group config: $run/supervisor-groups.json
Focused status files: $run/supervisor-state.json, $run/live-analysis-monitor-state.json
Coverage-guided status: $novelty/novelty-status.md
Repo root: $SRC

Task:
1. Inspect focused shard yield and current coverage-guided gaps.
2. Explicitly evaluate the mix of fuzzing levels, not only the mix of browser action profiles. Consider browser/e2e Playwright RTC, transport/integration HTTP or WS probes, fuzz-only assertions/oracles, seeded unit or property fuzzing for CRDT/parser/rich-text logic, libFuzzer/AFL-style coverage-guided lower-level targets, PHP/backend API checks, and protocol/server-only fuzzing. If the useful work is too concentrated at one level, propose the smallest concrete rebalancing step.
3. If the focused shards are not producing useful coverage, make the smallest useful adjustment to shard env/group policy or harness code.
4. If a lower-level target should be added, prefer a bounded target with a clear oracle and a handoff note over a broad new campaign. For coverage-guided lower-level fuzzing, consider libFuzzer-style in-process harnesses for code that can be isolated, or an equivalent JS/PHP coverage-guided loop when native libFuzzer is not practical. Do not stop active browser fuzzing just to experiment with lower-level fuzzing.
5. Do not add behavior-disable flags such as DISABLE_SYNC_FAULTS, DISABLE_PARSER_STRESS, DISABLE_REVISION_RESTORE, DISABLE_RELOAD, or DISABLE_RANDOM_RELOAD.
6. Run focused syntax/lint checks for any changed files.
7. If a change must affect active fuzzing, restart only focused shards with /tmp/start_rtc_focused_shards.sh; do not stop strict-expansion or coverage-guided sessions unless there is clear evidence they are blocking the focused run.
8. Write a concise report to: $report. Include the observed fuzz-level mix and whether it should change.
PROMPT

	printf '[%s] launching %s reason=%s records=%s prev=%s\n' "$now" "$session" "$reason" "$records" "$prev_records" >> "$LOG"
	tmux new-session -d -s "$session" "bash -lc 'cd \"$SRC\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\"; \"$CODEX_BIN_DIR/codex\" -a never exec --skip-git-repo-check -m gpt-5.5 -c model_reasoning_effort=xhigh -s danger-full-access < \"$prompt\" > \"$report\" 2> \"$codex_log\"'"
	sleep 600
done
LOOP

chmod +x "$BASE/gap-codex-loop.sh"
tmux new-session -d -s rtc-focused-shards-gap-codex-loop "$BASE/gap-codex-loop.sh"
tmux ls | grep -E 'rtc-focused' || true
