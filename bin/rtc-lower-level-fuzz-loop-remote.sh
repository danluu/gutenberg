#!/usr/bin/env bash
set -euo pipefail

NODE_BIN="${NODE_BIN:-/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin}"
TMUX_WRAP="${TMUX_WRAP:-/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin}"
REPO="${RTC_LOWER_LEVEL_FUZZ_REPO:-/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo}"
BASE="${RTC_LOWER_LEVEL_FUZZ_BASE:-/media/volume/danluu-fuzz-data/rtc-lower-level-fuzz-20260516}"
SESSION="${RTC_LOWER_LEVEL_FUZZ_SESSION:-rtc-lower-level-fuzz-loop}"
GROUP_NAME="unit-property-rich-text"
PROFILE="rtc-rich-text-offset-space"
TEST_PATH="packages/core-data/src/utils/test/rtc-rich-text-offset-space.test.js"

mkdir -p "$TMUX_WRAP"
cat > "$TMUX_WRAP/tmux" <<'SH'
#!/usr/bin/env bash
exec /usr/bin/tmux -L rtc-fuzz "$@"
SH
chmod +x "$TMUX_WRAP/tmux"
export PATH="$TMUX_WRAP:$NODE_BIN:$PATH"

load_too_high() {
	local load_average cores multiplier
	load_average=$(awk '{ print $1 }' /proc/loadavg 2>/dev/null || printf '0')
	cores=$(nproc 2>/dev/null || printf '1')
	multiplier="${RTC_LOWER_LEVEL_MAX_LOAD_MULTIPLIER:-1.20}"
	awk -v load_average="$load_average" -v cores="$cores" -v multiplier="$multiplier" \
		'BEGIN { exit !(load_average > cores * multiplier) }'
}

write_event() {
	local events_path="$1"
	local seed_start="$2"
	local seed_count="$3"
	local case_count="$4"
	local placement_case_count="$5"
	local exit_code="$6"
	local duration_ms="$7"
	node - "$events_path" "$seed_start" "$seed_count" "$case_count" "$placement_case_count" "$exit_code" "$duration_ms" <<'NODE'
const fs = require( 'fs' );
const [
	eventsPath,
	seedStart,
	seedCount,
	caseCount,
	placementCaseCount,
	exitCode,
	durationMs,
] = process.argv.slice( 2 );
const code = Number.parseInt( exitCode, 10 );
const seedBatchCount = Number.parseInt( seedCount, 10 );
const richTextCaseCount = Number.parseInt( caseCount, 10 );
const placementRichTextCaseCount = Number.parseInt( placementCaseCount, 10 );
const fixedUnitCaseCount = 4;
const generatedUnitCaseCount =
	seedBatchCount * ( richTextCaseCount + placementRichTextCaseCount );
const event = {
	kind: 'seed-attempt-complete',
	at: new Date().toISOString(),
	label: 'primary',
	ok: code === 0,
	exitCode: code,
	seedStart: Number.parseInt( seedStart, 10 ),
	seedCount: seedBatchCount,
	caseCount: richTextCaseCount,
	placementCaseCount: placementRichTextCaseCount,
	jestTestCount: 6,
	fixedUnitCaseCount,
	generatedUnitCaseCount,
	executionUnitCount: fixedUnitCaseCount + generatedUnitCaseCount,
	durationMs: Number.parseInt( durationMs, 10 ),
	transport: 'in-process',
	actionProfile: 'rtc-rich-text-offset-space',
};
fs.appendFileSync( eventsPath, `${ JSON.stringify( event ) }\n` );
NODE
}

run_loop() {
	local run_root="${RTC_LOWER_LEVEL_RUN_ROOT:?RTC_LOWER_LEVEL_RUN_ROOT is required}"
	local run_started="${RTC_LOWER_LEVEL_RUN_STARTED:-$(date -u +%Y%m%dT%H%M%SZ)}"
	local seed_start="${RTC_LOWER_LEVEL_SEED_START:-${GUTENBERG_RTC_RICH_TEXT_FUZZ_SEED_START:-1592594996}}"
	local seed_count="${RTC_LOWER_LEVEL_SEED_COUNT:-${GUTENBERG_RTC_RICH_TEXT_FUZZ_SEED_COUNT:-2}}"
	local case_count="${RTC_LOWER_LEVEL_CASE_COUNT:-${GUTENBERG_RTC_RICH_TEXT_FUZZ_CASE_COUNT:-100}}"
	local placement_case_count="${RTC_LOWER_LEVEL_PLACEMENT_CASE_COUNT:-${GUTENBERG_RTC_RICH_TEXT_PLACEMENT_CASE_COUNT:-$case_count}}"
	local sleep_seconds="${RTC_LOWER_LEVEL_SLEEP_SECONDS:-0}"
	local failure_sleep_seconds="${RTC_LOWER_LEVEL_FAILURE_SLEEP_SECONDS:-30}"
	local load_sleep_seconds="${RTC_LOWER_LEVEL_LOAD_SLEEP_SECONDS:-30}"
	local timeout_seconds="${RTC_LOWER_LEVEL_TIMEOUT_SECONDS:-1200}"
	local nice_level="${RTC_LOWER_LEVEL_NICE:-15}"
	local generation_dir="$run_root/${GROUP_NAME}-gen-0-$run_started"
	local lane_dir="$generation_dir/lane-0"
	local events_path="$lane_dir/events.ndjson"
	local status_path="$run_root/status.tsv"

	mkdir -p "$run_root/logs" "$lane_dir"
	touch "$events_path" "$status_path"
	cd "$REPO"

	while true; do
		local ts
		local started_s
		local ended_s
		local duration_ms
		local log_path
		local exit_code
		ts="$(date -u +%Y%m%dT%H%M%SZ)"
		log_path="$run_root/logs/${GROUP_NAME}-${ts}-seed-${seed_start}.log"
		started_s="$(date -u +%s)"
		set +e
		env \
			CI=1 \
			GUTENBERG_RTC_RICH_TEXT_FUZZ_SEED_START="$seed_start" \
			GUTENBERG_RTC_RICH_TEXT_FUZZ_SEED_COUNT="$seed_count" \
			GUTENBERG_RTC_RICH_TEXT_FUZZ_CASE_COUNT="$case_count" \
			GUTENBERG_RTC_RICH_TEXT_PLACEMENT_CASE_COUNT="$placement_case_count" \
			nice -n "$nice_level" timeout "${timeout_seconds}s" \
			npm run test:unit -- "$TEST_PATH" --runInBand --ci \
			> "$log_path" 2>&1
		exit_code=$?
		set -e
		ended_s="$(date -u +%s)"
		duration_ms=$(( ( ended_s - started_s ) * 1000 ))
		write_event "$events_path" "$seed_start" "$seed_count" "$case_count" "$placement_case_count" "$exit_code" "$duration_ms"
		printf '%s\tseed_start=%s\tseed_count=%s\tcase_count=%s\tplacement_case_count=%s\texit=%s\tlog=%s\n' \
			"$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
			"$seed_start" \
			"$seed_count" \
			"$case_count" \
			"$placement_case_count" \
			"$exit_code" \
			"$log_path" >> "$status_path"
		seed_start=$(( seed_start + seed_count ))
		if [ "$exit_code" -ne 0 ]; then
			sleep "$failure_sleep_seconds"
		elif load_too_high; then
			sleep "$load_sleep_seconds"
		elif [ "$sleep_seconds" -gt 0 ]; then
			sleep "$sleep_seconds"
		fi
	done
}

start_loop() {
	mkdir -p "$BASE/logs" "$BASE/runs"
	if tmux has-session -t "$SESSION" 2>/dev/null; then
		printf '%s\n' "$SESSION already running"
		return 0
	fi

	local run_started
	local run_root
	local seed_start
	local seed_count
	local case_count
	local placement_case_count
	run_started="$(date -u +%Y%m%dT%H%M%SZ)"
	run_root="$BASE/runs/unit-property-$run_started"
	seed_start="${RTC_LOWER_LEVEL_SEED_START:-${GUTENBERG_RTC_RICH_TEXT_FUZZ_SEED_START:-1592594996}}"
	seed_count="${RTC_LOWER_LEVEL_SEED_COUNT:-${GUTENBERG_RTC_RICH_TEXT_FUZZ_SEED_COUNT:-2}}"
	case_count="${RTC_LOWER_LEVEL_CASE_COUNT:-${GUTENBERG_RTC_RICH_TEXT_FUZZ_CASE_COUNT:-100}}"
	placement_case_count="${RTC_LOWER_LEVEL_PLACEMENT_CASE_COUNT:-${GUTENBERG_RTC_RICH_TEXT_PLACEMENT_CASE_COUNT:-$case_count}}"

	mkdir -p "$run_root/logs"
	printf '%s\n' "$run_root" > "$BASE/current-run-root.txt"
	node - "$run_root/supervisor-groups.json" "$GROUP_NAME" "$PROFILE" "$TEST_PATH" "$seed_start" "$seed_count" "$case_count" "$placement_case_count" "$REPO" <<'NODE'
const fs = require( 'fs' );
const [
	outPath,
	name,
	profile,
	testPath,
	startSeed,
	seedBatchCount,
	caseCount,
	placementCaseCount,
	repoRoot,
] = process.argv.slice( 2 );
const groups = [
	{
		name,
		fuzzLevel: 'unit-property',
		transport: 'in-process',
		profile,
		lanes: 1,
		stepCount: Number.parseInt( caseCount, 10 ),
		startSeed: Number.parseInt( startSeed, 10 ),
		seedBatchCount: Number.parseInt( seedBatchCount, 10 ),
		caseCount: Number.parseInt( caseCount, 10 ),
		placementCaseCount: Number.parseInt( placementCaseCount, 10 ),
		repoRoot,
		testPath,
	},
];
fs.writeFileSync( outPath, `${ JSON.stringify( groups, null, 2 ) }\n` );
NODE
	cp "$run_root/supervisor-groups.json" "$BASE/supervisor-groups.json"

	tmux new-session -d -s "$SESSION" \
		"bash -lc 'cd \"$REPO\"; export PATH=\"$TMUX_WRAP:$NODE_BIN:\$PATH\"; RTC_LOWER_LEVEL_RUN_ROOT=\"$run_root\" RTC_LOWER_LEVEL_RUN_STARTED=\"$run_started\" RTC_LOWER_LEVEL_SEED_START=\"$seed_start\" RTC_LOWER_LEVEL_SEED_COUNT=\"$seed_count\" RTC_LOWER_LEVEL_CASE_COUNT=\"$case_count\" RTC_LOWER_LEVEL_PLACEMENT_CASE_COUNT=\"$placement_case_count\" \"$REPO/bin/rtc-lower-level-fuzz-loop-remote.sh\" run >> \"$BASE/logs/lower-level-fuzz-loop.log\" 2>&1'"
	printf 'started %s root=%s\n' "$SESSION" "$run_root"
}

case "${1:-start}" in
	run)
		run_loop
		;;
	start)
		start_loop
		;;
	stop)
		tmux kill-session -t "$SESSION" 2>/dev/null || true
		;;
	status)
		tmux ls 2>/dev/null | grep -E "^${SESSION}:" || true
		if [ -f "$BASE/current-run-root.txt" ]; then
			printf 'current-run-root=%s\n' "$(sed -n '1p' "$BASE/current-run-root.txt")"
		fi
		;;
	*)
		printf 'usage: %s [start|stop|status|run]\n' "$0" >&2
		exit 2
		;;
esac
