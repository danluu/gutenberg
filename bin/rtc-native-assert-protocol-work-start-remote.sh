#!/usr/bin/env bash
set -euo pipefail

BASE=/media/volume/danluu-fuzz-data/rtc-native-assert-protocol-20260516
SRC=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
CODEX=/home/exouser/.npm-global/bin/codex
TMUX=/usr/bin/tmux
TMUX_ARGS=(-L rtc-fuzz)
MODEL=gpt-5.5
REASONING=xhigh
CODEX_TIMEOUT_SECONDS=${RTC_NATIVE_ASSERT_CODEX_TIMEOUT_SECONDS:-7200}

mkdir -p "$BASE/prompts" "$BASE/reports" "$BASE/logs" "$BASE/run-scripts" "$BASE/protocol"

run_tmux() {
	"$TMUX" "${TMUX_ARGS[@]}" "$@"
}

write_snapshot() {
	{
		echo "# Native harness, fuzz-only assertion, and protocol/server fuzz context"
		echo
		echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
		echo "Repo: $SRC"
		echo
		echo "## User Direction"
		echo
		echo "- Build a ready isolated native coverage-guided lower-level harness; lack of an existing harness is not a reason to defer."
		echo "- In parallel, fix what is blocking fuzz-only assertions."
		echo "- In parallel, do the protocol/server oracle and harness work using the standard persona loop so it is ready for future use."
		echo "- Use Codex in tmux at max parallelism on Jetstream2."
		echo
		echo "## Current tmux sessions"
		run_tmux ls 2>/dev/null || true
		echo
		echo "## Current repo status"
		(cd "$SRC" && git status --short) || true
		echo
		echo "## Current level-mix action status"
		latest=$(find /media/volume/danluu-fuzz-data/rtc-fuzz-level-mix-persona-loop-20260516/runs -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort | tail -n 1 || true)
		if [ -n "$latest" ]; then
			echo "- latest level-mix run: $latest"
			sed -n '1,180p' "$latest/synthesis.md" 2>/dev/null || true
			echo
			tail -n 120 "$latest/feedback-action.md" 2>/dev/null || true
			tail -n 120 "$latest/logs/feedback-action.stderr.log" 2>/dev/null || true
		fi
		echo
		echo "## Fuzz-only assertion sessions"
		run_tmux ls 2>/dev/null | grep -E 'rtc-fuzz-asserts|rtc-fuzz-only-asserts' || true
		echo
		echo "## Candidate protocol/server files"
		(cd "$SRC" && rg -n "sync-server|provider|WebSocket|message|awareness|Y\\.Doc|yjs|collaboration" bin test/e2e packages/e2e-tests packages 2>/dev/null | head -n 240) || true
	} > "$BASE/context.md"
}

launch_codex_job() {
	local session=$1
	local prompt=$2
	local report=$3
	local log=$4
	local rc=$5
	local runner="$BASE/run-scripts/$session.sh"
	cat > "$runner" <<RUNNER
#!/usr/bin/env bash
set -uo pipefail
cd "$SRC" || exit 1
timeout --kill-after=60s "$CODEX_TIMEOUT_SECONDS" "$CODEX" -a never exec --skip-git-repo-check -m "$MODEL" -c model_reasoning_effort="$REASONING" -s danger-full-access < "$prompt" > "$report" 2> "$log"
echo "\$?" > "$rc"
RUNNER
	chmod +x "$runner"
	run_tmux kill-session -t "$session" 2>/dev/null || true
	run_tmux new-session -d -s "$session" "$runner"
}

write_direct_prompt() {
	local name=$1
	local kind=$2
	local prompt="$BASE/prompts/$name.md"
	cat > "$prompt" <<PROMPT
You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents. Work locally in this tmux/Codex process.

Name: $name
Task kind: $kind

Read first:
- $BASE/context.md
- relevant repo files in $SRC

Hard constraints:
- Do not stop productive browser fuzzing.
- Avoid colliding with the currently running level-mix action job touching the unit-property sidecar unless you verify it is complete.
- Keep changes small and reversible.
- Run syntax/build checks for changed files.
- Write a report to $BASE/reports/$name.md.

Native harness jobs:
- Build a ready isolated coverage-guided lower-level harness. Prefer libFuzzer/AFL-compatible native C/C++ when practical.
- Include a start script or run instructions that can execute continuously under tmux.
- Emit events.ndjson with kind seed-attempt-complete, fuzzLevel coverage-guided-lower-level, and advancing execution counts.
- Do not merely write a plan.

Fuzz-only assertion jobs:
- Find what is blocking rtc-fuzz-only-asserts-loop.
- Clear stale blocker(s) if safe.
- Patch the loop so stale jobs cannot block indefinitely again; use timeouts, rc markers, or stale tmux cleanup as appropriate.
- Restart only the affected fuzz-only assertion loop if needed.
PROMPT
}

launch_direct_jobs() {
	local jobs=(
		fuzz-assert-unblock-stale-session:fuzz-only-asserts
		fuzz-assert-loop-timeout-repair:fuzz-only-asserts
		fuzz-assert-noise-safe-restart:fuzz-only-asserts
	)
	local item name kind
	for item in "${jobs[@]}"; do
		name=${item%%:*}
		kind=${item#*:}
		write_direct_prompt "$name" "$kind"
		launch_codex_job \
			"rtc-native-assert-$name" \
			"$BASE/prompts/$name.md" \
			"$BASE/reports/$name.md" \
			"$BASE/logs/$name.log" \
			"$BASE/logs/$name.rc"
	done
}

write_native_loop() {
	cat > "$BASE/native-harness-persona-loop.sh" <<'LOOP'
#!/usr/bin/env bash
set -uo pipefail

BASE=/media/volume/danluu-fuzz-data/rtc-native-assert-protocol-20260516
SRC=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
CODEX=/home/exouser/.npm-global/bin/codex
TMUX=/usr/bin/tmux
MODEL=gpt-5.5
REASONING=xhigh
CODEX_TIMEOUT_SECONDS=${RTC_NATIVE_ASSERT_CODEX_TIMEOUT_SECONDS:-7200}
MAX_PARALLEL=6
ACTION_EVERY=2
PERSONAS=( "linus torvalds" "kyle kingsbury" "marc brooker" "dan luu" "tptacek" "contrarian" )

run_tmux() {
	"$TMUX" -L rtc-fuzz "$@"
}

log() {
	printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$BASE/native-loop.log"
}

slugify() {
	printf '%s' "$1" | tr '[:upper:] ' '[:lower:]-' | tr -cd 'a-z0-9-'
}

launch_job() {
	local session=$1
	local prompt=$2
	local report=$3
	local log_file=$4
	local rc=$5
	local runner="$BASE/run-scripts/$session.sh"
	cat > "$runner" <<RUNNER
#!/usr/bin/env bash
set -uo pipefail
cd "$SRC" || exit 1
timeout --kill-after=60s "$CODEX_TIMEOUT_SECONDS" "$CODEX" -a never exec --skip-git-repo-check -m "$MODEL" -c model_reasoning_effort="$REASONING" -s danger-full-access < "$prompt" > "$report" 2> "$log_file"
echo "\$?" > "$rc"
RUNNER
	chmod +x "$runner"
	run_tmux kill-session -t "$session" 2>/dev/null || true
	run_tmux new-session -d -s "$session" "$runner"
}

wait_for_rcs() {
	local dir=$1
	local expected=$2
	local waited=0
	while true; do
		count=$(find "$dir" -maxdepth 1 -name '*.rc' -type f 2>/dev/null | wc -l | tr -d ' ')
		[ "$count" -ge "$expected" ] && return 0
		[ "$waited" -ge 7200 ] && return 0
		sleep 10
		waited=$(( waited + 10 ))
	done
}

cycle=0
log "native harness persona loop started max_parallel=$MAX_PARALLEL action_every=$ACTION_EVERY"
while true; do
	cycle=$(( cycle + 1 ))
	ts=$(date -u +%Y%m%dT%H%M%SZ)
	run="$BASE/native-runs/$ts"
	mkdir -p "$run/prompts" "$run/reports" "$run/logs"
	cp "$BASE/context.md" "$run/context.md"
	{
		echo
		echo "## Native harness loop cycle context"
		echo "- cycle: $cycle"
		echo "- generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
		echo
		echo "## Current repo status"
		(cd "$SRC" && git status --short) || true
		echo
		echo "## Native/coverage tool availability"
		command -v clang || true
		command -v clang++ || true
		command -v afl-fuzz || true
		command -v node || true
		node --version 2>/dev/null || true
		echo
		echo "## Candidate isolated targets"
		(cd "$SRC" && rg -n "parse|serialize|richText|rich-text|applyPostChangesToCRDTDoc|mergeCrdtBlocks|SyncManager|Y\\.Doc|delta|Delta" packages test bin 2>/dev/null | head -n 260) || true
	} >> "$run/context.md"

	log "starting native harness review cycle $ts"
	for persona in "${PERSONAS[@]}"; do
		while [ "$(run_tmux ls 2>/dev/null | grep -c '^rtc-native-persona-')" -ge "$MAX_PARALLEL" ]; do
			sleep 5
		done
		slug=$(slugify "$persona")
		prompt="$run/prompts/$slug.md"
		report="$run/reports/$slug.md"
		cat > "$prompt" <<PROMPT
Name: $persona

Task: guide construction of a ready isolated coverage-guided lower-level native harness for Jetstream2 RTC/Gutenberg fuzzing.

Read:
- $run/context.md
- relevant parser/serialization/rich-text/CRDT/sync files in $SRC

The user explicitly rejected "no ready isolated native harness" as a reason to defer. Do not stop at that. Identify the smallest real harness that can be built now, with reasonable concern handling.

Return:
1. Best first native/coverage-guided harness target.
2. Whether true libFuzzer/AFL C/C++ is practical for that target; if not, the closest runnable isolated coverage-guided harness and why.
3. Oracle design.
4. Exact files/scripts to add or change.
5. Event accounting: supervisor-groups.json plus events.ndjson with fuzzLevel coverage-guided-lower-level.
6. Validation command.
7. Concerns that must shape the implementation.

Do not edit files in this review pass.
PROMPT
		launch_job "rtc-native-persona-$slug-$ts" "$prompt" "$report" "$run/logs/$slug.log" "$run/logs/$slug.rc"
	done
	wait_for_rcs "$run/logs" 6

	synth_prompt="$run/prompts/synthesis.md"
	cat > "$synth_prompt" <<PROMPT
Task: synthesize native harness persona reports in $run/reports.

Read:
- $run/context.md

Return a concrete implementation plan for the first ready isolated coverage-guided lower-level harness. Account for concerns raised by the reports. Do not edit files.
PROMPT
	launch_job "rtc-native-synthesis-$ts" "$synth_prompt" "$run/synthesis.md" "$run/logs/synthesis.log" "$run/logs/synthesis.rc"
	wait_for_rcs "$run/logs" 7
	log "finished native harness review cycle $ts"

	if [ "$(( cycle % ACTION_EVERY ))" -eq 0 ]; then
		action_prompt="$run/prompts/action.md"
		cat > "$action_prompt" <<PROMPT
Task: implement the native/coverage-guided lower-level harness after two standard persona iterations.

Read:
- $run/context.md
- $run/synthesis.md
- recent prior native loop reports under $BASE/native-runs

The lack of a ready isolated harness is not a blocker. Build the smallest ready harness now, accounting for the persona concerns. It should:
- be runnable continuously in tmux;
- prefer true libFuzzer/AFL native integration when practical, or document and implement the closest isolated coverage-guided alternative;
- have concrete oracles;
- write supervisor-groups.json with fuzzLevel "coverage-guided-lower-level";
- emit events.ndjson records with kind "seed-attempt-complete";
- include validation/syntax/build checks.

Do not stop productive browser fuzzing. Avoid colliding with the unit-property sidecar action job. Write the result to $run/action.md.
PROMPT
		launch_job "rtc-native-action-$ts" "$action_prompt" "$run/action.md" "$run/logs/action.log" "$run/logs/action.rc"
		wait_for_rcs "$run/logs" 8
		log "finished native harness action after cycle $cycle"
	fi
done
LOOP
	chmod +x "$BASE/native-harness-persona-loop.sh"
}

protocol_personas=( "linus torvalds" "kyle kingsbury" "marc brooker" "dan luu" "tptacek" "contrarian" )

slugify() {
	printf '%s' "$1" | tr '[:upper:] ' '[:lower:]-' | tr -cd 'a-z0-9-'
}

write_protocol_loop() {
	cat > "$BASE/protocol/protocol-server-persona-loop.sh" <<'LOOP'
#!/usr/bin/env bash
set -uo pipefail

BASE=/media/volume/danluu-fuzz-data/rtc-native-assert-protocol-20260516
SRC=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
CODEX=/home/exouser/.npm-global/bin/codex
TMUX=/usr/bin/tmux
MODEL=gpt-5.5
REASONING=xhigh
CODEX_TIMEOUT_SECONDS=${RTC_PROTOCOL_SERVER_CODEX_TIMEOUT_SECONDS:-7200}
MAX_PARALLEL=6
ACTION_EVERY=2
PERSONAS=( "linus torvalds" "kyle kingsbury" "marc brooker" "dan luu" "tptacek" "contrarian" )

run_tmux() {
	"$TMUX" -L rtc-fuzz "$@"
}

log() {
	printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$BASE/protocol/loop.log"
}

slugify() {
	printf '%s' "$1" | tr '[:upper:] ' '[:lower:]-' | tr -cd 'a-z0-9-'
}

launch_job() {
	local session=$1
	local prompt=$2
	local report=$3
	local log_file=$4
	local rc=$5
	local runner="$BASE/run-scripts/$session.sh"
	cat > "$runner" <<RUNNER
#!/usr/bin/env bash
set -uo pipefail
cd "$SRC" || exit 1
timeout --kill-after=60s "$CODEX_TIMEOUT_SECONDS" "$CODEX" -a never exec --skip-git-repo-check -m "$MODEL" -c model_reasoning_effort="$REASONING" -s danger-full-access < "$prompt" > "$report" 2> "$log_file"
echo "\$?" > "$rc"
RUNNER
	chmod +x "$runner"
	run_tmux kill-session -t "$session" 2>/dev/null || true
	run_tmux new-session -d -s "$session" "$runner"
}

wait_for_rcs() {
	local dir=$1
	local expected=$2
	local waited=0
	while true; do
		count=$(find "$dir" -maxdepth 1 -name '*.rc' -type f 2>/dev/null | wc -l | tr -d ' ')
		[ "$count" -ge "$expected" ] && return 0
		[ "$waited" -ge 7200 ] && return 0
		sleep 10
		waited=$(( waited + 10 ))
	done
}

cycle=0
log "protocol/server persona loop started max_parallel=$MAX_PARALLEL action_every=$ACTION_EVERY"
while true; do
	cycle=$(( cycle + 1 ))
	ts=$(date -u +%Y%m%dT%H%M%SZ)
	run="$BASE/protocol/runs/$ts"
	mkdir -p "$run/prompts" "$run/reports" "$run/logs"
	cp "$BASE/context.md" "$run/context.md"
	{
		echo
		echo "## Protocol/server loop cycle context"
		echo "- cycle: $cycle"
		echo "- generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
		echo
		echo "## Current repo status"
		(cd "$SRC" && git status --short) || true
		echo
		echo "## Existing protocol/server related paths"
		(cd "$SRC" && rg --files | rg 'sync|websocket|collaboration|provider|polling' | head -n 200) || true
	} >> "$run/context.md"

	log "starting protocol/server review cycle $ts"
	for persona in "${PERSONAS[@]}"; do
		while [ "$(run_tmux ls 2>/dev/null | grep -c '^rtc-protocol-persona-')" -ge "$MAX_PARALLEL" ]; do
			sleep 5
		done
		slug=$(slugify "$persona")
		prompt="$run/prompts/$slug.md"
		report="$run/reports/$slug.md"
		cat > "$prompt" <<PROMPT
Name: $persona

Task: make protocol/server fuzzing ready for future Jetstream2 RTC use. Oracle/design work is not a blocker; do that work now.

Read:
- $run/context.md
- relevant sync server/provider/collaboration files in $SRC

Return:
1. Protocol/server fuzz target to build first.
2. Concrete oracle(s) for message ordering, convergence, awareness, persistence, auth, or server state.
3. Exact files/scripts to add or change.
4. How the harness should emit events.ndjson with fuzzLevel protocol-server.
5. Validation command.

Do not edit files in this review pass.
PROMPT
		launch_job "rtc-protocol-persona-$slug-$ts" "$prompt" "$report" "$run/logs/$slug.log" "$run/logs/$slug.rc"
	done
	wait_for_rcs "$run/logs" 6

	synth_prompt="$run/prompts/synthesis.md"
	cat > "$synth_prompt" <<PROMPT
Task: synthesize the protocol/server fuzzing persona reports in $run/reports.

Read:
- $run/context.md

Return a concrete implementation plan for a ready protocol/server fuzz harness, including oracle, event accounting, and validation.
Do not edit files.
PROMPT
	launch_job "rtc-protocol-synthesis-$ts" "$synth_prompt" "$run/synthesis.md" "$run/logs/synthesis.log" "$run/logs/synthesis.rc"
	wait_for_rcs "$run/logs" 7
	log "finished protocol/server review cycle $ts"

	if [ "$(( cycle % ACTION_EVERY ))" -eq 0 ]; then
		action_prompt="$run/prompts/action.md"
		cat > "$action_prompt" <<PROMPT
Task: implement the protocol/server fuzzing harness after two standard persona iterations.

Read:
- $run/context.md
- $run/synthesis.md
- recent prior protocol loop reports under $BASE/protocol/runs

Oracle/design work is not a blocker. Build the smallest ready protocol/server fuzz harness now. It should:
- exercise sync server/provider/protocol behavior without full browser UI when possible;
- have concrete oracles for convergence/message ordering/awareness/auth or server state;
- write supervisor-groups.json with fuzzLevel "protocol-server";
- emit events.ndjson records with kind "seed-attempt-complete";
- include a start script suitable for tmux;
- run validation/syntax checks.

Do not stop productive browser fuzzing. Write the result to $run/action.md.
PROMPT
		launch_job "rtc-protocol-action-$ts" "$action_prompt" "$run/action.md" "$run/logs/action.log" "$run/logs/action.rc"
		wait_for_rcs "$run/logs" 8
		log "finished protocol/server action after cycle $cycle"
	fi
done
LOOP
	chmod +x "$BASE/protocol/protocol-server-persona-loop.sh"
}

write_snapshot

# Clear the known stale assertion session immediately; the repair jobs still inspect and harden the loop.
run_tmux kill-session -t rtc-fuzz-asserts-20260516T014615Z-r2-3-marc-brooker 2>/dev/null || true

launch_direct_jobs
write_native_loop
run_tmux kill-session -t rtc-native-harness-persona-loop 2>/dev/null || true
run_tmux new-session -d -s rtc-native-harness-persona-loop "$BASE/native-harness-persona-loop.sh"
write_protocol_loop
run_tmux kill-session -t rtc-protocol-server-persona-loop 2>/dev/null || true
run_tmux new-session -d -s rtc-protocol-server-persona-loop "$BASE/protocol/protocol-server-persona-loop.sh"

echo "launched sessions:"
run_tmux ls | grep -E 'rtc-native-assert|rtc-native-harness|rtc-native-persona|rtc-protocol' || true
