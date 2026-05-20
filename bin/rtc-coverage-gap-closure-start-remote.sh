#!/usr/bin/env bash
set -euo pipefail

# Starts a 24-hour Jetstream2 process that turns the coverage gaps from
# docs/explanations/architecture/jetstream2-rtc-fuzzing-coverage-report.md into
# concrete tests/fuzz harness work. This script is intended to run on the
# Jetstream2 host.

NODE_BIN=${NODE_BIN:-/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin}
TMUX_WRAP=${TMUX_WRAP:-/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin}
SRC=${SRC:-/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo}
BASE=${BASE:-/media/volume/danluu-fuzz-data/rtc-coverage-gap-closure-20260520}
CODEX_BIN=${CODEX_BIN:-codex}
CODEX_MODEL=${CODEX_MODEL:-gpt-5.5}
CODEX_REASONING_EFFORT=${CODEX_REASONING_EFFORT:-xhigh}

mkdir -p "$BASE"/{logs,prompts,reports,status,worktrees}
mkdir -p "$TMUX_WRAP"

cat > "$TMUX_WRAP/tmux" <<'SH'
#!/usr/bin/env bash
exec /usr/bin/tmux -L rtc-fuzz "$@"
SH
chmod +x "$TMUX_WRAP/tmux"

export PATH="$TMUX_WRAP:$NODE_BIN:$PATH"

cat > "$BASE/work-items.tsv" <<'TSV'
id	branch	title	checklist
list-nested-structure	rtc-coverage-gap-list-nested-structure-20260520	List and nested structure regressions	nested core/list list-item concurrent reorders; duplicate or near-duplicate list items; entity/equivalent-rich-text variants inside list items; move item while sibling edited; move blocks into/out of groups or columns across save/reload
transport-compaction	rtc-coverage-gap-transport-compaction-20260520	High-backlog transport and compaction	more than bounded read window after cursor; stale compaction newer than first read window; room isolation under high backlog and mixed room batches; compaction plus concurrent writes across clients
polling-state-machine	rtc-coverage-gap-polling-state-machine-20260520	Sync and polling state-machine fuzzing	PollingManager registration and unregistration; collaborator discovery gating; visibility and background transitions; retryable failures; forbidden-room isolation; generated payload size/chunking; room churn across primary and auxiliary rooms
save-payload-correctness	rtc-coverage-gap-save-payload-correctness-20260520	Save-payload correctness	editor save payload versus serialized CRDT blocks versus latest server content versus reload; correct payload with stale CRDT order; empty evaluated content with non-empty CRDT content; malformed evaluated content repair; changed valid content must not be overwritten
parser-semantic-equivalence	rtc-coverage-gap-parser-semantic-equivalence-20260520	Parser and semantic-equivalence edge cases	semicolonless entities that should and should not normalize; preserve-whitespace blocks; equivalent HTML no-op cases; equivalent-looking ambiguous list items; deprecated block forms and validation-fix transforms in collaboration
wider-product-coverage	rtc-coverage-gap-wider-product-coverage-20260520	Wider product coverage queue	site editor/template/template-part/navigation smoke coverage; custom post types and REST schemas; meta boxes/classic editor interop; publish/update workflows; document-size and collaboration-gating boundaries; third-party block/block-support strategy; media/attachment/reusable/synced patterns; persistent object cache; multisite; non-Chromium/mobile/touch; production websocket/proxy behavior
TSV

cat > "$BASE/controller.sh" <<'CONTROLLER'
#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=${NODE_BIN:-/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin}
TMUX_WRAP=${TMUX_WRAP:-/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin}
SRC=${SRC:-/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo}
BASE=${BASE:-/media/volume/danluu-fuzz-data/rtc-coverage-gap-closure-20260520}
CODEX_BIN=${CODEX_BIN:-codex}
CODEX_MODEL=${CODEX_MODEL:-gpt-5.5}
CODEX_REASONING_EFFORT=${CODEX_REASONING_EFFORT:-xhigh}
DEADLINE_EPOCH=${DEADLINE_EPOCH:-$(( $(date -u +%s) + 24 * 3600 ))}
RELAUNCH_AFTER_SECONDS=${RELAUNCH_AFTER_SECONDS:-7200}
INTEGRATOR_INTERVAL_SECONDS=${INTEGRATOR_INTERVAL_SECONDS:-7200}

export PATH="$TMUX_WRAP:$NODE_BIN:$PATH"

LOG="$BASE/logs/controller.log"
STATE="$BASE/status/controller-state.tsv"
SUMMARY="$BASE/status/coverage-gap-closure-status.md"
ITEMS="$BASE/work-items.tsv"

mkdir -p "$BASE"/{logs,prompts,reports,status,worktrees}
touch "$STATE"

log() {
	printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG" >/dev/null
}

shell_quote() {
	printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"
}

tmux_has_session() {
	local session=$1
	tmux ls 2>/dev/null | awk -F: '{ print $1 }' | grep -Fxq "$session"
}

item_last_launch() {
	local id=$1
	awk -F '\t' -v id="$id" '$2 == id && $3 == "launch" { value = $1 } END { print value + 0 }' "$STATE"
}

item_done() {
	local id=$1
	test -f "$BASE/status/$id.done"
}

prepare_worktree() {
	local id=$1
	local branch=$2
	local wt="$BASE/worktrees/$id"
	if [ ! -d "$wt/.git" ]; then
		rm -rf "$wt"
		git -C "$SRC" worktree add -B "$branch" "$wt" HEAD >> "$BASE/logs/worktree.log" 2>&1
	fi
	printf '%s' "$wt"
}

write_worker_prompt() {
	local id=$1
	local branch=$2
	local title=$3
	local checklist=$4
	local wt=$5
	local prompt="$BASE/prompts/$id.prompt.md"
	local report="$BASE/reports/$id.report.md"
	cat > "$prompt" <<PROMPT
You are running inside Jetstream2 on the Gutenberg RTC fuzzing project.

Do not use API subagents. Work in this Codex/tmux process. You may inspect existing Jetstream artifacts and run focused commands, but do not launch broad browser fuzzing unless the controller or an existing gate script already owns that work.

Coverage family: $title
Coverage checklist: $checklist
Worktree: $wt
Branch: $branch
Controller base: $BASE
Deadline UTC: $(date -u -d "@$DEADLINE_EPOCH" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -r "$DEADLINE_EPOCH" +%Y-%m-%dT%H:%M:%SZ)
Final report path: $report
Completion sentinel: $BASE/status/$id.done

Goal:
Add the missing tests or fuzz harness coverage for every checklist item in this family within the current worktree. Prefer the cheapest harness level that gives a useful oracle:
- unit/property/model tests for merge, parser, semantic equivalence, polling manager, and save-payload logic;
- PHP/API tests for server storage, room isolation, high backlog, permissions, and compaction;
- focused browser tests only where the behavior requires the real editor, reload, revision, selection, media, or UI event path.

Required process:
1. Read the coverage report at docs/explanations/architecture/jetstream2-rtc-fuzzing-coverage-report.md if present; otherwise use the checklist above as authoritative.
2. Inspect existing tests/harnesses before adding files. Do not duplicate already-covered cases.
3. Make small, maintainable test or harness changes. Keep product-code changes out unless a test cannot be written without a small test hook.
4. Run focused validation for changed files. If a full browser gate is too expensive, write the exact follow-up gate command and run the smallest deterministic smoke gate available.
5. Write $report with:
   - changed files;
   - checklist item to file/test mapping;
   - commands run and results;
   - remaining blockers, if any, with enough detail for another worker to continue.
6. Only create $BASE/status/$id.done after every checklist item is either covered by a concrete test/harness change or recorded as a concrete blocker with a minimal next step.

Do not mark the item done because it is too broad. For broad product items, add a queue manifest, smoke profile, or deterministic skeleton that makes the gap visible and executable, then record deeper campaign work separately.
PROMPT
}

launch_worker() {
	local id=$1
	local branch=$2
	local title=$3
	local checklist=$4
	local now session wt prompt report stderr command
	now=$(date -u +%s)
	session="rtc-gap-close-$id"
	if tmux_has_session "$session"; then
		return 0
	fi
	if item_done "$id"; then
		return 0
	fi
	local last
	last=$(item_last_launch "$id")
	if [ "$last" -gt 0 ] && [ $(( now - last )) -lt "$RELAUNCH_AFTER_SECONDS" ]; then
		return 0
	fi
	wt=$(prepare_worktree "$id" "$branch")
	write_worker_prompt "$id" "$branch" "$title" "$checklist" "$wt"
	prompt="$BASE/prompts/$id.prompt.md"
	report="$BASE/reports/$id.report.md"
	stderr="$BASE/logs/$id.stderr.log"
	command="cd $(shell_quote "$wt"); export PATH=$(shell_quote "$TMUX_WRAP:$NODE_BIN"):\$PATH; $(shell_quote "$CODEX_BIN") -a never exec --skip-git-repo-check -m $(shell_quote "$CODEX_MODEL") -c $(shell_quote "model_reasoning_effort=$CODEX_REASONING_EFFORT") -s danger-full-access < $(shell_quote "$prompt") > $(shell_quote "$report") 2> $(shell_quote "$stderr")"
	tmux new-session -d -s "$session" "bash -lc $(shell_quote "$command")"
	printf '%s\t%s\tlaunch\t%s\t%s\n' "$now" "$id" "$session" "$branch" >> "$STATE"
	log "launched $session for $title on $branch"
}

write_integrator_prompt() {
	local prompt=$1
	local report=$2
	cat > "$prompt" <<PROMPT
You are the Jetstream2 coverage-gap closure integrator.

Do not use API subagents. Work in this Codex/tmux process.

Controller base: $BASE
Repo source: $SRC
Deadline UTC: $(date -u -d "@$DEADLINE_EPOCH" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -r "$DEADLINE_EPOCH" +%Y-%m-%dT%H:%M:%SZ)
Work items: $ITEMS
Worker reports: $BASE/reports
Worker status: $BASE/status
Write integration report to: $report

Task:
1. Read every worker report and inspect changed worktrees.
2. Check whether every checklist item has a concrete test/harness file, a runnable command, and an oracle.
3. For any weak or missing item, either make a small direct fix in the relevant worktree or write a precise continuation note to $BASE/status/<id>.needs-work.
4. Remove stale done sentinels if a report marked done without real coverage.
5. Write a concise report with done/needs-work/blocker status for every coverage family.
6. Do not launch broad browser fuzzing here. Leave expensive validation as queued commands unless a focused deterministic gate is clearly cheap.
PROMPT
}

maybe_launch_integrator() {
	local now last session prompt report stderr command
	now=$(date -u +%s)
	session="rtc-gap-close-integrator"
	if tmux_has_session "$session"; then
		return 0
	fi
	last=$(awk -F '\t' '$2 == "integrator" && $3 == "launch" { value = $1 } END { print value + 0 }' "$STATE")
	if [ "$last" -gt 0 ] && [ $(( now - last )) -lt "$INTEGRATOR_INTERVAL_SECONDS" ]; then
		return 0
	fi
	prompt="$BASE/prompts/integrator-$now.prompt.md"
	report="$BASE/reports/integrator-$now.report.md"
	stderr="$BASE/logs/integrator-$now.stderr.log"
	write_integrator_prompt "$prompt" "$report"
	command="cd $(shell_quote "$SRC"); export PATH=$(shell_quote "$TMUX_WRAP:$NODE_BIN"):\$PATH; $(shell_quote "$CODEX_BIN") -a never exec --skip-git-repo-check -m $(shell_quote "$CODEX_MODEL") -c $(shell_quote "model_reasoning_effort=$CODEX_REASONING_EFFORT") -s danger-full-access < $(shell_quote "$prompt") > $(shell_quote "$report") 2> $(shell_quote "$stderr")"
	tmux new-session -d -s "$session" "bash -lc $(shell_quote "$command")"
	printf '%s\tintegrator\tlaunch\t%s\t-\n' "$now" "$session" >> "$STATE"
	log "launched integrator"
}

write_summary() {
	local now remaining
	now=$(date -u +%s)
	remaining=$(( DEADLINE_EPOCH - now ))
	{
		echo "# RTC Coverage Gap Closure Status"
		echo
		echo "- updated_utc: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
		echo "- deadline_utc: $(date -u -d "@$DEADLINE_EPOCH" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -r "$DEADLINE_EPOCH" +%Y-%m-%dT%H:%M:%SZ)"
		echo "- seconds_remaining: $remaining"
		echo
		echo "| id | branch | status | active_session | report |"
		echo "| --- | --- | --- | --- | --- |"
		tail -n +2 "$ITEMS" | while IFS=$'\t' read -r id branch title checklist; do
			local status active report
			status="running"
			if [ -f "$BASE/status/$id.done" ]; then
				status="done"
			elif [ -f "$BASE/status/$id.needs-work" ]; then
				status="needs-work"
			fi
			active="-"
			if tmux_has_session "rtc-gap-close-$id"; then
				active="rtc-gap-close-$id"
			fi
			report="$BASE/reports/$id.report.md"
			echo "| $id | $branch | $status | $active | $report |"
		done
	} > "$SUMMARY"
}

log "coverage gap closure controller starting; base=$BASE src=$SRC deadline_epoch=$DEADLINE_EPOCH"

while true; do
	if [ ! -d "$SRC/.git" ]; then
		log "missing repo at $SRC"
		sleep 300
		continue
	fi

	tail -n +2 "$ITEMS" | while IFS=$'\t' read -r id branch title checklist; do
		launch_worker "$id" "$branch" "$title" "$checklist"
	done

	maybe_launch_integrator
	write_summary

	done_count=$(find "$BASE/status" -maxdepth 1 -name '*.done' | wc -l | tr -d ' ')
	total_count=$(tail -n +2 "$ITEMS" | wc -l | tr -d ' ')
	log "status done=$done_count total=$total_count summary=$SUMMARY"
	if [ "$done_count" -ge "$total_count" ]; then
		log "all coverage-gap families marked done"
		sleep 1800
	else
		sleep 600
	fi
done
CONTROLLER

chmod +x "$BASE/controller.sh"

tmux kill-session -t rtc-coverage-gap-closure-controller 2>/dev/null || true
tmux new-session -d -s rtc-coverage-gap-closure-controller "$BASE/controller.sh"

echo "Started rtc-coverage-gap-closure-controller"
echo "Status: $BASE/status/coverage-gap-closure-status.md"
tmux ls | grep -E 'rtc-coverage-gap-closure|rtc-gap-close' || true
