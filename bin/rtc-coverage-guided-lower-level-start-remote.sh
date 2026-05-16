#!/usr/bin/env bash
set -euo pipefail

NODE_BIN="${NODE_BIN:-/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin}"
TMUX_WRAP="${TMUX_WRAP:-/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin}"
REPO="${RTC_CG_LOWER_LEVEL_REPO:-/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo}"
BASE="${RTC_CG_LOWER_LEVEL_OUTPUT_BASE:-/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-20260516}"
SESSION="${RTC_CG_LOWER_LEVEL_SESSION:-rtc-coverage-guided-lower-level}"
GROUP_NAME="coverage-guided-lower-level-rich-text-crdt"
PROFILE="rtc-rich-text-crdt-merge"
TEST_PATH="packages/core-data/src/utils/test/rtc-rich-text-crdt-merge.coverage-fuzz.test.js"
RUNNER_PATH="bin/rtc-coverage-guided-lower-level-runner.mjs"
ENGINE="v8-node-coverage-guided-mutator"
COVERAGE_ENGINE="v8-node-coverage"

mkdir -p "$TMUX_WRAP"
cat > "$TMUX_WRAP/tmux" <<'SH'
#!/usr/bin/env bash
exec /usr/bin/tmux -L rtc-fuzz "$@"
SH
chmod +x "$TMUX_WRAP/tmux"
export PATH="$TMUX_WRAP:$NODE_BIN:$PATH"

validate_harness() {
	if [ "${RTC_CG_LOWER_LEVEL_SKIP_PREFLIGHT:-0}" = "1" ]; then
		return 0
	fi

	cd "$REPO"
	bash -n "$0"
	node --check "$RUNNER_PATH"
	npm run test:unit -- "$TEST_PATH" --runInBand --ci
}

write_supervisor_groups() {
	local run_root="$1"
	local batch_size="$2"
	local timeout_seconds="$3"
	local nice_level="$4"
	local max_input_bytes="$5"

	node - "$run_root/supervisor-groups.json" "$GROUP_NAME" "$PROFILE" "$TEST_PATH" "$batch_size" "$timeout_seconds" "$nice_level" "$max_input_bytes" "$REPO" "$run_root" "$ENGINE" "$COVERAGE_ENGINE" <<'NODE'
const fs = require( 'fs' );
const path = require( 'path' );
const [
	outPath,
	name,
	profile,
	testPath,
	batchSize,
	timeoutSeconds,
	niceLevel,
	maxInputBytes,
	repoRoot,
	runRoot,
	engine,
	coverageEngine,
] = process.argv.slice( 2 );
const coverageTargets = [
	'packages/core-data/src/utils/crdt.ts',
	'packages/core-data/src/utils/crdt-blocks.ts',
	'packages/core-data/src/utils/crdt-text.ts',
	'packages/core-data/src/utils/crdt-utils.ts',
	'packages/rich-text/src/create.js',
	'packages/rich-text/src/get-text-content.js',
	'packages/rich-text/src/special-characters.js',
	'packages/rich-text/src/to-html-string.js',
	'packages/rich-text/src/to-tree.js',
	'packages/sync/src/quill-delta/Delta.ts',
	'rtc-rich-text-crdt-merge.coverage-fuzz.test',
];
const groups = [
	{
		name,
		fuzzLevel: 'coverage-guided-lower-level',
		transport: 'in-process',
		engine,
		coverageEngine,
		profile,
		target: testPath,
		lanes: 1,
		stepCount: Number.parseInt( batchSize, 10 ),
		batchSize: Number.parseInt( batchSize, 10 ),
		maxInputBytes: Number.parseInt( maxInputBytes, 10 ),
		timeoutSeconds: Number.parseInt( timeoutSeconds, 10 ),
		nice: Number.parseInt( niceLevel, 10 ),
		corpusFeedback: true,
		semanticFeatureFeedback: true,
		repoRoot,
		runRoot,
		corpusDir: path.join( runRoot, 'corpus', 'queue' ),
		crashDir: path.join( runRoot, 'corpus', 'crashes' ),
		coverageDir: path.join( runRoot, 'coverage' ),
		logDir: path.join( runRoot, 'logs' ),
		artifactDir: path.join( runRoot, 'corpus', 'crashes' ),
		coverageTargets,
		testPath,
		nativeIntegration:
			'closest-isolated-coverage-guided-alternative; JS/TS target uses V8 coverage feedback instead of C/C++ AFL/libFuzzer',
	},
];
fs.writeFileSync( outPath, `${ JSON.stringify( groups, null, 2 ) }\n` );
NODE
}

start_loop() {
	mkdir -p "$BASE/logs" "$BASE/runs"
	if tmux has-session -t "$SESSION" 2>/dev/null; then
		printf '%s\n' "$SESSION already running"
		return 0
	fi
	validate_harness

	local run_started
	local run_root
	local batch_size
	local timeout_seconds
	local nice_level
	local max_input_bytes
	local sleep_seconds
	local previous_root
	run_started="$(date -u +%Y%m%dT%H%M%S%NZ)"
	run_root="$BASE/runs/coverage-guided-lower-level-$run_started"
	batch_size="${RTC_CG_LOWER_LEVEL_BATCH_SIZE:-${RTC_CG_LOWER_LEVEL_RUNS:-32}}"
	timeout_seconds="${RTC_CG_LOWER_LEVEL_TIMEOUT_SECONDS:-1200}"
	nice_level="${RTC_CG_LOWER_LEVEL_NICE:-19}"
	max_input_bytes="${RTC_CG_LOWER_LEVEL_MAX_INPUT_BYTES:-64}"
	sleep_seconds="${RTC_CG_LOWER_LEVEL_SLEEP_SECONDS:-0}"
	previous_root="$(sed -n '1p' "$BASE/current-run-root.txt" 2>/dev/null || true)"

	mkdir -p "$run_root/logs" "$run_root/corpus/queue" "$run_root/coverage"
	if [ "${RTC_CG_LOWER_LEVEL_CARRYOVER_CORPUS:-1}" = "1" ] && [ -n "$previous_root" ] && [ -d "$previous_root" ]; then
		cp -n "$previous_root"/corpus/queue/*.bin "$run_root/corpus/queue/" 2>/dev/null || true
		cp -n "$previous_root"/coverage/coverage-state.json "$run_root/coverage/coverage-state.json" 2>/dev/null || true
	fi
	printf '%s\n' "$run_root" > "$BASE/current-run-root.txt"
	write_supervisor_groups "$run_root" "$batch_size" "$timeout_seconds" "$nice_level" "$max_input_bytes"
	cp "$run_root/supervisor-groups.json" "$BASE/supervisor-groups.json"

	tmux new-session -d -s "$SESSION" \
		"bash -lc 'cd \"$REPO\"; export PATH=\"$TMUX_WRAP:$NODE_BIN:\$PATH\"; RTC_CG_LOWER_LEVEL_REPO=\"$REPO\" RTC_CG_LOWER_LEVEL_RUN_ROOT=\"$run_root\" RTC_CG_LOWER_LEVEL_RUN_STARTED=\"$run_started\" RTC_CG_LOWER_LEVEL_GROUP=\"$GROUP_NAME\" RTC_CG_LOWER_LEVEL_TEST_PATH=\"$TEST_PATH\" RTC_CG_LOWER_LEVEL_BATCH_SIZE=\"$batch_size\" RTC_CG_LOWER_LEVEL_TIMEOUT_SECONDS=\"$timeout_seconds\" RTC_CG_LOWER_LEVEL_SLEEP_SECONDS=\"$sleep_seconds\" RTC_CG_LOWER_LEVEL_NICE=\"$nice_level\" RTC_CG_LOWER_LEVEL_MAX_INPUT_BYTES=\"$max_input_bytes\" node \"$RUNNER_PATH\" >> \"$BASE/logs/coverage-guided-lower-level.log\" 2>&1'"
	printf 'started %s root=%s sleep=%s previous=%s\n' "$SESSION" "$run_root" "$sleep_seconds" "${previous_root:-none}"
}

run_once() {
	mkdir -p "$BASE/logs" "$BASE/runs"
	validate_harness

	local run_started
	local run_root
	local batch_size
	local timeout_seconds
	local nice_level
	local max_input_bytes
	run_started="$(date -u +%Y%m%dT%H%M%S%NZ)"
	run_root="$BASE/runs/coverage-guided-lower-level-smoke-$run_started"
	batch_size="${RTC_CG_LOWER_LEVEL_BATCH_SIZE:-${RTC_CG_LOWER_LEVEL_RUNS:-2}}"
	timeout_seconds="${RTC_CG_LOWER_LEVEL_TIMEOUT_SECONDS:-300}"
	nice_level="${RTC_CG_LOWER_LEVEL_NICE:-19}"
	max_input_bytes="${RTC_CG_LOWER_LEVEL_MAX_INPUT_BYTES:-64}"

	mkdir -p "$run_root/logs"
	printf '%s\n' "$run_root" > "$BASE/current-run-root.txt"
	write_supervisor_groups "$run_root" "$batch_size" "$timeout_seconds" "$nice_level" "$max_input_bytes"
	cp "$run_root/supervisor-groups.json" "$BASE/supervisor-groups.json"

	cd "$REPO"
	RTC_CG_LOWER_LEVEL_REPO="$REPO" \
		RTC_CG_LOWER_LEVEL_RUN_ROOT="$run_root" \
		RTC_CG_LOWER_LEVEL_RUN_STARTED="$run_started" \
		RTC_CG_LOWER_LEVEL_GROUP="$GROUP_NAME" \
		RTC_CG_LOWER_LEVEL_TEST_PATH="$TEST_PATH" \
		RTC_CG_LOWER_LEVEL_BATCH_SIZE="$batch_size" \
		RTC_CG_LOWER_LEVEL_TIMEOUT_SECONDS="$timeout_seconds" \
		RTC_CG_LOWER_LEVEL_NICE="$nice_level" \
		RTC_CG_LOWER_LEVEL_MAX_INPUT_BYTES="$max_input_bytes" \
		RTC_CG_LOWER_LEVEL_MAX_ATTEMPTS=1 \
		RTC_CG_LOWER_LEVEL_SLEEP_SECONDS=0 \
		node "$RUNNER_PATH" >> "$BASE/logs/coverage-guided-lower-level-smoke.log" 2>&1
	printf 'completed smoke root=%s\n' "$run_root"
}

case "${1:-start}" in
	start)
		start_loop
		;;
	run-once)
		run_once
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
		printf 'usage: %s [start|run-once|stop|status]\n' "$0" >&2
		exit 2
		;;
esac
