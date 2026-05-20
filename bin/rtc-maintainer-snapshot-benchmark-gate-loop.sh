#!/usr/bin/env bash
set -euo pipefail

REPO=${RTC_MAINTAINER_GATE_REPO:-/Users/danluu/dev/fuzz/gutenberg}
BASE=${RTC_MAINTAINER_GATE_BASE:-/Users/danluu/dev/fuzz/rtc-maintainer-snapshot-benchmark-gate-20260520}
REMOTE=${RTC_MAINTAINER_GATE_REMOTE:-danluu}
JETSTREAM=${RTC_MAINTAINER_GATE_JETSTREAM:-exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org}
JETSTREAM_FINALIZATION_BASE=${RTC_MAINTAINER_GATE_JETSTREAM_FINALIZATION_BASE:-/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516}
JETSTREAM_PROGRESS_BASE=${RTC_MAINTAINER_GATE_JETSTREAM_PROGRESS_BASE:-/media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518}
JETSTREAM_COVERAGE_BASE=${RTC_MAINTAINER_GATE_JETSTREAM_COVERAGE_BASE:-/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515}
EXPLAIN_BRANCH=${RTC_MAINTAINER_GATE_EXPLAIN_BRANCH:-explain/rtc-jetstream2-fuzz-progress-20260515}
SNAPSHOT_DOC=${RTC_MAINTAINER_GATE_SNAPSHOT_DOC:-docs/explanations/architecture/rtc-jetstream2-maintainer-pr-snapshot-20260519.md}
BENCHMARK_DOC=${RTC_MAINTAINER_GATE_BENCHMARK_DOC:-docs/explanations/architecture/rtc-local-benchmark-results-20260519.md}
HANDOFF_DOC=${RTC_MAINTAINER_GATE_HANDOFF_DOC:-docs/explanations/architecture/rtc-less-busy-benchmark-handoff-20260519.md}
POLL_SECONDS=${RTC_MAINTAINER_GATE_POLL_SECONDS:-900}
CODEX_BIN=${RTC_MAINTAINER_GATE_CODEX_BIN:-$(command -v codex)}
CODEX_MODEL=${RTC_MAINTAINER_GATE_CODEX_MODEL:-gpt-5.5}
CODEX_REASONING=${RTC_MAINTAINER_GATE_CODEX_REASONING:-xhigh}
CODEX_TIMEOUT_SECONDS=${RTC_MAINTAINER_GATE_CODEX_TIMEOUT_SECONDS:-21600}
SESSION=${RTC_MAINTAINER_GATE_TMUX_SESSION:-rtc-maintainer-snapshot-benchmark-gate}

LOG=$BASE/gate.log
STATUS=$BASE/status.md
STATE=$BASE/state.tsv
LOCK=$BASE/lock

mkdir -p "$BASE/cycles" "$BASE/logs"
touch "$LOG" "$STATE"

log() {
	printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"
}

write_status() {
	local phase=$1
	local detail=$2
	{
		echo "# RTC Maintainer Snapshot Benchmark Gate"
		echo
		echo "- updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
		echo "- phase: $phase"
		echo "- detail: $detail"
		echo "- repo: $REPO"
		echo "- base: $BASE"
		echo "- remote: $REMOTE"
		echo "- explanation branch: $EXPLAIN_BRANCH"
		echo "- snapshot doc: $SNAPSHOT_DOC"
		echo "- benchmark doc: $BENCHMARK_DOC"
		echo "- poll seconds: $POLL_SECONDS"
		echo
		echo "## Last State"
		tail -80 "$STATE" 2>/dev/null || true
		echo
		echo "## Recent Log"
		tail -120 "$LOG" 2>/dev/null || true
	} > "$STATUS.tmp"
	mv "$STATUS.tmp" "$STATUS"
}

remote_refs_snapshot() {
	git -C "$REPO" ls-remote --heads "$REMOTE" \
		'rtc-pr-stack-*' \
		'danluu/cycle*-pr*' \
		'danluu/cycle*-crdt-pr*' \
		'danluu/cycle*-i40-pr*' \
		'danluu/rtc-pr-progress-*' \
		'danluu/ready-pr*' \
		'danluu/fix-rtc-*' \
		'try/rtc-*pr*' \
		'try/rtc-*stack*' |
		sort
}

copy_jetstream_context() {
	local out=$1
	mkdir -p "$out/jetstream"
	ssh "$JETSTREAM" "
		set +e
		for f in \
			'$JETSTREAM_FINALIZATION_BASE/current-finalization-status.md' \
			'$JETSTREAM_FINALIZATION_BASE/latest-local-publish-manifest.tsv' \
			'$JETSTREAM_PROGRESS_BASE/current-status.md' \
			'$JETSTREAM_PROGRESS_BASE/current-push-manifest.tsv' \
			'$JETSTREAM_PROGRESS_BASE/current-control-decisions.tsv' \
			'$JETSTREAM_COVERAGE_BASE/current-output-dir.txt'; do
			if [ -f \"\$f\" ]; then
				printf '==== %s\n' \"\$f\"
				sed -n '1,360p' \"\$f\"
				printf '\n'
			fi
		done
		find '$JETSTREAM_FINALIZATION_BASE/cycles' -maxdepth 2 -type f -name 'finalization.report.md' -printf '%T@ %p\n' 2>/dev/null |
			sort -n |
			tail -8 |
			while read -r _ path; do
				printf '==== %s\n' \"\$path\"
				sed -n '1,360p' \"\$path\"
				printf '\n'
			done
	" > "$out/jetstream/context.txt" 2> "$out/jetstream/context.stderr.log" || true
}

write_context() {
	local cycle=$1
	mkdir -p "$cycle"
	remote_refs_snapshot > "$cycle/remote-refs.tsv" 2> "$cycle/remote-refs.stderr.log" || true
	copy_jetstream_context "$cycle"
	{
		echo "# Maintainer Snapshot Benchmark Gate Context"
		echo
		echo "- generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
		echo "- local repo: $REPO"
		echo "- remote: $REMOTE"
		echo "- explanation branch: $EXPLAIN_BRANCH"
		echo "- snapshot doc: $SNAPSHOT_DOC"
		echo "- benchmark doc: $BENCHMARK_DOC"
		echo "- handoff doc: $HANDOFF_DOC"
		echo
		echo "## Host"
		date -u
		uname -a
		sw_vers 2>/dev/null || true
		sysctl -n machdep.cpu.brand_string 2>/dev/null || true
		sysctl -n hw.logicalcpu 2>/dev/null | awk '{ print "logical_cpus\t" $1 }' || true
		uptime || true
		df -h /Users/danluu/dev/fuzz 2>/dev/null || true
		node --version 2>/dev/null || true
		npm --version 2>/dev/null || true
		docker version --format 'docker-server {{.Server.Version}}' 2>/dev/null || true
		echo
		echo "## Local Repo"
		git -C "$REPO" status --short --branch || true
		git -C "$REPO" remote -v || true
		echo
		echo "## Current Snapshot Doc"
		git -C "$REPO" show "$REMOTE/$EXPLAIN_BRANCH:$SNAPSHOT_DOC" 2>/dev/null | sed -n '1,260p' || true
		echo
		echo "## Current Benchmark Doc"
		git -C "$REPO" show "$REMOTE/$EXPLAIN_BRANCH:$BENCHMARK_DOC" 2>/dev/null | sed -n '1,260p' || true
		echo
		echo "## Current Benchmark Handoff"
		git -C "$REPO" show "$REMOTE/$EXPLAIN_BRANCH:$HANDOFF_DOC" 2>/dev/null | sed -n '1,240p' || true
		echo
		echo "## Remote Refs"
		sed -n '1,260p' "$cycle/remote-refs.tsv" 2>/dev/null || true
		echo
		echo "## Jetstream Context"
		sed -n '1,900p' "$cycle/jetstream/context.txt" 2>/dev/null || true
		echo
		echo "## Existing Local Benchmark Artifacts"
		find /Users/danluu/dev/fuzz -maxdepth 3 -path '*/rtc-benchmark-*.noindex/results/*/summary.tsv' -print 2>/dev/null | sort | tail -30 || true
	} > "$cycle/context.md"
}

write_prompt() {
	local cycle=$1
	local prompt=$cycle/prompt.md
	local report=$cycle/codex-report.md
	cat > "$prompt" <<PROMPT
You are the local maintainer-snapshot benchmark gate for the Gutenberg RTC fuzz/fix project.

Do not use API subagents. You may launch local tmux/Codex helper sessions if useful, but keep this gate's state in:
$cycle

Context:
$cycle/context.md

Write your final cycle report to:
$report

Task:
1. Poll the published PR/finalization branches and decide whether there is a newer candidate PR stack that plausibly fixes issues now covered by the expanded fuzzer coverage.
2. If there is no new candidate stack, write a concise no-op report and do not edit maintainer docs.
3. If there are ready PR branches but no all-merged branch, build a local all-merged branch from the smallest reviewable ready set. Push that stack branch to the danluu remote only after it cleanly merges and passes basic local checks. Do not reuse the known-bad branch as a passing candidate.
4. Run the benchmark gate against the exact stack branch before changing maintainer-facing docs.

Hard gates:
- The current known-bad branch is rtc-pr-stack-20260519T214027Z-validated-no-harness at e922771984f5bd37a3d5e76dc246a8c5001675ff. It failed large-post-three-user-http 2/2. Do not publish it as passing.
- The benchmark result doc must not be updated to a successful result unless every fixed-stack benchmark row you ran has exit_code 0.
- The maintainer snapshot must not name a current validated merged branch unless the exact linked branch has a fresh successful benchmark result from this gate.
- If a benchmark row fails, leave the current maintainer snapshot alone, record the failing branch and row, and point the PR/fix loops at the blocker.

Benchmark minimum:
- Lower/unit rows: CRDT merge microbench, HTML equivalence microbench, sync helper microbench, many-user sync microbench, targeted crdt stale top-level unit tests, targeted HTTP polling manager tests.
- Browser rows: code-editor WebSocket smoke, sync-body-size HTTP, large-post-three-user HTTP, list-item-move-refresh HTTP, table-stale-snapshot HTTP.
- Include the new-coverage issues where possible: many-user lifecycle, same-user/multi-tab, UI-signal coverage, revision/autosave/recovery, parser/serialization, and large document reload/convergence. If they are not yet in the formal benchmark suite, at least run the matching focused fuzzer/e2e profiles against the candidate before publishing.
- Record refs, commits, commands, exit codes, elapsed time, and log paths.

Documentation updates on success:
- Update $SNAPSHOT_DOC on $EXPLAIN_BRANCH with the passing stack branch, compare URL, branch links, and a clear note that this snapshot is gated by the fresh successful benchmark.
- Update $BENCHMARK_DOC on $EXPLAIN_BRANCH with the fresh successful benchmark result. It must not contain failing benchmark rows presented as acceptable.
- Push $EXPLAIN_BRANCH to the $REMOTE remote from this local machine.

Operational constraints:
- Use clean worktrees under $BASE, not the dirty main worktree.
- Use isolated wp-env homes and ports for benchmark runs.
- Do not stop Jetstream fuzzing.
- Prefer small, reviewable PR branches and a separate all-merged test branch.
- Keep logs and TSV summaries in $cycle and/or $BASE/results.
PROMPT
}

run_codex_cycle() {
	local cycle=$1
	local prompt=$cycle/prompt.md
	local report=$cycle/codex-report.md
	local stderr=$cycle/codex.stderr.log
	write_prompt "$cycle"
	set +e
	if command -v timeout >/dev/null 2>&1; then
		timeout "$CODEX_TIMEOUT_SECONDS" "$CODEX_BIN" -a never exec --skip-git-repo-check -m "$CODEX_MODEL" -c model_reasoning_effort="$CODEX_REASONING" -s danger-full-access < "$prompt" > "$report" 2> "$stderr"
	elif command -v gtimeout >/dev/null 2>&1; then
		gtimeout "$CODEX_TIMEOUT_SECONDS" "$CODEX_BIN" -a never exec --skip-git-repo-check -m "$CODEX_MODEL" -c model_reasoning_effort="$CODEX_REASONING" -s danger-full-access < "$prompt" > "$report" 2> "$stderr"
	else
		"$CODEX_BIN" -a never exec --skip-git-repo-check -m "$CODEX_MODEL" -c model_reasoning_effort="$CODEX_REASONING" -s danger-full-access < "$prompt" > "$report" 2> "$stderr"
	fi
	local rc=$?
	set -e
	printf '%s\n' "$rc" > "$cycle/codex.rc"
	printf '%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$cycle" "$rc" >> "$STATE"
	return "$rc"
}

run_once() {
	local ts cycle
	ts=$(date -u +%Y%m%dT%H%M%SZ)
	cycle="$BASE/cycles/$ts"
	write_status context "collecting $cycle"
	write_context "$cycle"
	write_status codex "running benchmark-gate Codex cycle $ts"
	if run_codex_cycle "$cycle"; then
		write_status idle "cycle $ts completed"
	else
		write_status failed "cycle $ts failed or timed out"
	fi
}

acquire_lock() {
	if ! mkdir "$LOCK" 2>/dev/null; then
		log "another gate loop already holds $LOCK"
		exit 0
	fi
	trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT
}

run_loop() {
	acquire_lock
	log "maintainer snapshot benchmark gate loop started pid=$$"
	while true; do
		run_once || log "cycle failed"
		sleep "$POLL_SECONDS"
	done
}

start_tmux() {
	if tmux has-session -t "$SESSION" 2>/dev/null; then
		log "tmux session already running: $SESSION"
		tmux ls | grep "^$SESSION:" || true
		return
	fi
	tmux new-session -d -s "$SESSION" "bash -lc '$0 loop'"
	tmux ls | grep "^$SESSION:" || true
}

case "${1:-loop}" in
	once|run-once)
		acquire_lock
		run_once
		;;
	loop|run)
		run_loop
		;;
	start)
		start_tmux
		;;
	status)
		if [ -f "$STATUS" ]; then
			sed -n '1,220p' "$STATUS"
		else
			echo "no status yet: $STATUS"
		fi
		;;
	*)
		echo "usage: $0 [start|once|loop|status]" >&2
		exit 2
		;;
esac
