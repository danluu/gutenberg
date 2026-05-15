#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN_DIR=${HOME:-/home/exouser}/.local/bin
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin
SRC=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
BASE=/media/volume/danluu-fuzz-data/rtc-fuzz-only-asserts-20260515

mkdir -p "$BASE/logs" "$BASE/cycles" "$TMUX_WRAP"
cat > "$TMUX_WRAP/tmux" <<'SH'
#!/usr/bin/env bash
exec /usr/bin/tmux -L rtc-fuzz "$@"
SH
chmod +x "$TMUX_WRAP/tmux"
export PATH="$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:$PATH"

tmux kill-session -t rtc-fuzz-only-asserts-loop 2>/dev/null || true

cat > "$BASE/fuzz-only-asserts-loop.sh" <<'LOOP'
#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN_DIR=${HOME:-/home/exouser}/.local/bin
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin
SRC=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
BASE=/media/volume/danluu-fuzz-data/rtc-fuzz-only-asserts-20260515
COVERAGE_BASE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515
FOCUSED_BASE=/media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515
STRICT_BASE=/media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515
LOG="$BASE/logs/fuzz-only-asserts-loop.log"
STATE="$BASE/logs/fuzz-only-asserts-loop-state.tsv"
PERSONAS=(
	"linus torvalds"
	"kyle kingsbury"
	"marc brooker"
	"dan luu"
	"tptacek"
	"contrarian"
)
CYCLE_SLEEP_SECONDS=${RTC_FUZZ_ASSERT_CYCLE_SLEEP_SECONDS:-900}
ROUND_TIMEOUT_SECONDS=${RTC_FUZZ_ASSERT_ROUND_TIMEOUT_SECONDS:-14400}
ROUND2_EXACT=${RTC_FUZZ_ASSERT_ROUND2_EXACT:-1}
CODEX_MODEL=${RTC_FUZZ_ASSERT_CODEX_MODEL:-gpt-5.5}
CODEX_REASONING_EFFORT=${RTC_FUZZ_ASSERT_CODEX_REASONING_EFFORT:-xhigh}

mkdir -p "$BASE/logs" "$BASE/cycles"
touch "$STATE"
export PATH="$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:$PATH"

log() {
	printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$LOG"
}

slugify() {
	printf '%s' "$1" |
		tr '[:upper:]' '[:lower:]' |
		sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//'
}

active_assert_sessions() {
	tmux ls 2>/dev/null | awk -F: '/^rtc-fuzz-asserts-/ { count++ } END { print count + 0 }'
}

wait_for_prefix() {
	local prefix=$1
	local deadline=$(( $(date -u +%s) + ROUND_TIMEOUT_SECONDS ))
	local active
	while true; do
		active=$(tmux ls 2>/dev/null | awk -F: -v prefix="$prefix" 'index($1, prefix) == 1 { count++ } END { print count + 0 }')
		if [ "$active" -eq 0 ]; then
			log "$prefix finished"
			return 0
		fi
		if [ "$(date -u +%s)" -ge "$deadline" ]; then
			log "$prefix timed out with $active active session(s); continuing with completed reports"
			return 0
		fi
		log "$prefix active=$active"
		sleep 60
	done
}

launch_codex() {
	local session=$1
	local prompt=$2
	local report=$3
	local codex_log=$4
	tmux new-session -d -s "$session" \
		"bash -lc 'cd \"$SRC\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\"; \"$CODEX_BIN_DIR/codex\" -a never exec --skip-git-repo-check -m \"$CODEX_MODEL\" -c model_reasoning_effort=\"$CODEX_REASONING_EFFORT\" -s danger-full-access < \"$prompt\" > \"$report\" 2> \"$codex_log\"'"
}

collect_context() {
	local cycle_dir=$1
	local context=$cycle_dir/context.md
	local coverage focused strict
	coverage=$(cat "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)
	focused=$(cat "$FOCUSED_BASE/current-run-root.txt" 2>/dev/null || true)
	strict=$(cat "$STRICT_BASE/current-run-root.txt" 2>/dev/null || true)

	{
		echo "# RTC fuzz-only assertion loop context"
		echo
		echo "- generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
		echo "- repo: $SRC"
		echo "- coverage-guided output: ${coverage:-missing}"
		echo "- focused shards output: ${focused:-missing}"
		echo "- strict expansion output: ${strict:-missing}"
		echo
		echo "## Current tmux sessions"
		tmux ls 2>/dev/null || true
		echo
		echo "## Git status"
		cd "$SRC"
		git status --short || true
		echo
		echo "## Git diff stat"
		git diff --stat || true
		echo
		echo "## Current coverage-guided status"
		if [ -n "$coverage" ] && [ -f "$coverage/novelty-status.md" ]; then
			sed -n '1,240p' "$coverage/novelty-status.md"
		else
			echo "missing"
		fi
		echo
		echo "## Existing assertion and invariant sites"
		rg -n \
			"(assertEditorInvariants|assertOperationLedger|acknowledgeOperationWitnesses|waitForConvergence|RTC_FUZZ|fuzz.*assert|invariant failure|operation witness)" \
			test/e2e/specs/editor/collaboration test/e2e/config packages/e2e-tests 2>/dev/null |
			head -260 || true
		echo
		echo "## Recent assertion/invariant failures in coverage-guided output"
		if [ -n "$coverage" ] && [ -d "$coverage" ]; then
			find "$coverage" -type f \( -name command.log -o -name summary.ndjson -o -name events.ndjson \) -mtime -1 -print0 2>/dev/null |
				xargs -0 rg -n \
					"(RTC editor invariant failure|RTC operation witness missing|Collaborative state did not converge|fuzz-only assert|assertion|TimeoutError|Error:)" \
					2>/dev/null |
				head -260 || true
		fi
		echo
		echo "## Recent assertion loop reports"
		find "$BASE/cycles" -maxdepth 3 -type f \( -name 'apply.report.md' -o -name 'noise-review.report.md' \) -print 2>/dev/null |
			sort |
			tail -8 |
			while read -r report; do
				echo "### $report"
				sed -n '1,180p' "$report" || true
				echo
			done
	} > "$context"
}

write_analysis_prompt() {
	local prompt=$1
	local persona=$2
	local context=$3
	local report=$4
	cat > "$prompt" <<PROMPT
Name: $persona

You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents. Work locally in this tmux/Codex process.

Task:
1. Read the context at $context.
2. Identify fuzz-only assertions that could surface more RTC bugs in risky Gutenberg/editor/collaboration paths.
3. Favor assertions that fire only during fuzzing or the RTC fuzz harness, are tied to user-visible data loss or state divergence, and are unlikely to create duplicate/noisy failures.
4. Include exact candidate files/functions and the guard that should make the assertion fuzz-only.
5. Call out assertions that should not be added because they are too noisy or merely restate existing checks.
6. Do not edit files in this analysis job.
7. Write your report to $report.
PROMPT
}

write_critique_prompt() {
	local prompt=$1
	local persona=$2
	local context=$3
	local input_report=$4
	local output_report=$5
	local round=$6
	cat > "$prompt" <<PROMPT
Name: $persona

You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents. Work locally in this tmux/Codex process.

Task:
1. Read the context at $context.
2. Analyze the response at $input_report.
3. Decide which proposed fuzz-only assertions should be added, rejected, delayed, or modified.
4. Focus on bug-finding value, noise risk, whether the assertion is truly fuzz-only, and whether it would help the active fuzz loops.
5. Do not edit files in this critique job.
6. This is critique round $round. Write your report to $output_report.
PROMPT
}

write_apply_prompt() {
	local prompt=$1
	local context=$2
	local cycle_dir=$3
	local report=$4
	cat > "$prompt" <<PROMPT
You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents. Work locally in this tmux/Codex process.

Context: $context
Analysis and critique reports: $cycle_dir
Final report path: $report
Repo root: $SRC

Task:
1. Read the context plus all round-0, round-1, and round-2 reports under $cycle_dir.
2. Add the smallest useful fuzz-only assertions that have strong support and low expected noise.
3. Assertions must be gated so they run only under the RTC fuzzing harness or explicit fuzz-only env/config. Do not add always-on product assertions.
4. Prefer harness assertions in test/e2e/specs/editor/collaboration/ or targeted instrumentation that is unreachable unless fuzzing opts in.
5. Analyze whether previously added fuzz-only assertions are producing duplicate/noisy failures in current logs; remove or tighten noisy assertions.
6. Do not add behavior-disable flags such as DISABLE_SYNC_FAULTS, DISABLE_PARSER_STRESS, DISABLE_REVISION_RESTORE, DISABLE_RELOAD, or DISABLE_RANDOM_RELOAD.
7. Run focused syntax/lint checks for changed files.
8. If changes should affect active fuzzing, restart only the affected RTC fuzz loops using the existing /tmp start scripts.
9. Write a concise report to $report covering changes made, assertions added/removed/tuned, validation, and restart actions.
PROMPT
}

run_cycle() {
	local ts=$1
	local cycle_dir="$BASE/cycles/$ts"
	local context="$cycle_dir/context.md"
	local prefix="rtc-fuzz-asserts-$ts"
	local persona slug session prompt report codex_log input_report idx

	mkdir -p "$cycle_dir"/round0 "$cycle_dir"/round1 "$cycle_dir"/round2
	collect_context "$cycle_dir"
	log "cycle $ts collected context at $context"

	for persona in "${PERSONAS[@]}"; do
		slug=$(slugify "$persona")
		session="$prefix-r0-$slug"
		prompt="$cycle_dir/round0/$slug.prompt.md"
		report="$cycle_dir/round0/$slug.report.md"
		codex_log="$cycle_dir/round0/$slug.stderr.log"
		write_analysis_prompt "$prompt" "$persona" "$context" "$report"
		launch_codex "$session" "$prompt" "$report" "$codex_log"
	done
	log "cycle $ts launched round0 ${#PERSONAS[@]} jobs"
	wait_for_prefix "$prefix-r0-"

	idx=0
	for input_report in "$cycle_dir"/round0/*.report.md; do
		[ -s "$input_report" ] || continue
		for persona in "${PERSONAS[@]}"; do
			idx=$(( idx + 1 ))
			slug=$(slugify "$persona")
			session="$prefix-r1-$idx-$slug"
			prompt="$cycle_dir/round1/$idx-$slug.prompt.md"
			report="$cycle_dir/round1/$idx-$slug.report.md"
			codex_log="$cycle_dir/round1/$idx-$slug.stderr.log"
			write_critique_prompt "$prompt" "$persona" "$context" "$input_report" "$report" 1
			launch_codex "$session" "$prompt" "$report" "$codex_log"
		done
	done
	log "cycle $ts launched round1 $idx jobs"
	wait_for_prefix "$prefix-r1-"

	idx=0
	if [ "$ROUND2_EXACT" = 1 ]; then
		for input_report in "$cycle_dir"/round1/*.report.md; do
			[ -s "$input_report" ] || continue
			for persona in "${PERSONAS[@]}"; do
				idx=$(( idx + 1 ))
				slug=$(slugify "$persona")
				session="$prefix-r2-$idx-$slug"
				prompt="$cycle_dir/round2/$idx-$slug.prompt.md"
				report="$cycle_dir/round2/$idx-$slug.report.md"
				codex_log="$cycle_dir/round2/$idx-$slug.stderr.log"
				write_critique_prompt "$prompt" "$persona" "$context" "$input_report" "$report" 2
				launch_codex "$session" "$prompt" "$report" "$codex_log"
			done
		done
	else
		for persona in "${PERSONAS[@]}"; do
			idx=$(( idx + 1 ))
			slug=$(slugify "$persona")
			session="$prefix-r2-$idx-$slug"
			prompt="$cycle_dir/round2/$idx-$slug.prompt.md"
			report="$cycle_dir/round2/$idx-$slug.report.md"
			codex_log="$cycle_dir/round2/$idx-$slug.stderr.log"
			cat > "$prompt" <<PROMPT
Name: $persona

You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents. Work locally in this tmux/Codex process.

Task:
1. Read the context at $context.
2. Analyze all round-1 reports under $cycle_dir/round1.
3. Decide which fuzz-only assertions should be added, rejected, delayed, or modified.
4. Do not edit files in this critique job.
5. Write your report to $report.
PROMPT
			launch_codex "$session" "$prompt" "$report" "$codex_log"
		done
	fi
	log "cycle $ts launched round2 $idx jobs"
	wait_for_prefix "$prefix-r2-"

	session="$prefix-apply"
	prompt="$cycle_dir/apply.prompt.md"
	report="$cycle_dir/apply.report.md"
	codex_log="$cycle_dir/apply.stderr.log"
	write_apply_prompt "$prompt" "$context" "$cycle_dir" "$report"
	launch_codex "$session" "$prompt" "$report" "$codex_log"
	log "cycle $ts launched applier"
	wait_for_prefix "$prefix-apply"
	printf '%s\t%s\t%s\n' "$ts" "$(date -u +%s)" "$cycle_dir" >> "$STATE"
	log "cycle $ts complete"
}

log "fuzz-only assertion loop started pid=$$"

while true; do
	if [ "$(active_assert_sessions)" -gt 0 ]; then
		log "assertion Codex sessions already active; waiting"
		sleep 300
		continue
	fi
	ts=$(date -u +%Y%m%dT%H%M%SZ)
	run_cycle "$ts"
	sleep "$CYCLE_SLEEP_SECONDS"
done
LOOP

chmod +x "$BASE/fuzz-only-asserts-loop.sh"
tmux new-session -d -s rtc-fuzz-only-asserts-loop "$BASE/fuzz-only-asserts-loop.sh"
tmux ls | grep -E 'rtc-fuzz-only-asserts|rtc-fuzz-asserts' || true
