#!/usr/bin/env bash
set -euo pipefail

NODE_BIN="${NODE_BIN:-/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin}"
TMUX_WRAP="${TMUX_WRAP:-/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin}"
REPO="${RTC_CG_LOWER_LEVEL_REPO:-/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo}"
GROUP_NAME="${RTC_CG_LOWER_LEVEL_GROUP:-coverage-guided-lower-level-rich-text-multiblock}"
DEFAULT_BASE="/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-20260516"
DEFAULT_PROFILE="rtc-rich-text-crdt-merge"
DEFAULT_TEST_PATH="packages/core-data/src/utils/test/rtc-rich-text-crdt-merge.coverage-fuzz.test.js"
DEFAULT_MAX_INPUT_BYTES=64
DEFAULT_MAX_CORPUS_FILES=5000
DEFAULT_MAX_MINIMIZE_INPUTS=16
DEFAULT_MAX_FAILURE_ISOLATIONS_PER_RUN=16
DEFAULT_REPEAT_FAILURE_ISOLATION_EVERY=0
case "$GROUP_NAME" in
	coverage-guided-lower-level-rich-text-multiblock)
		DEFAULT_BASE="/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-rich-text-multiblock-20260518"
		DEFAULT_PROFILE="rtc-rich-text-crdt-multiblock"
		DEFAULT_MAX_INPUT_BYTES=160
		DEFAULT_MAX_MINIMIZE_INPUTS=32
		;;
	coverage-guided-lower-level-block-parser-serialization)
		DEFAULT_BASE="/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-block-parser-serialization-20260519"
		DEFAULT_PROFILE="rtc-block-parser-serialization"
		DEFAULT_TEST_PATH="packages/blocks/src/api/parser/test/rtc-block-parser-serialization.coverage-fuzz.test.js"
		DEFAULT_MAX_INPUT_BYTES=192
		DEFAULT_MAX_MINIMIZE_INPUTS=8
		DEFAULT_MAX_FAILURE_ISOLATIONS_PER_RUN=4
		;;
	coverage-guided-lower-level-table-query-array-crdt)
		DEFAULT_BASE="/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-query-array-20260517"
		DEFAULT_PROFILE="rtc-table-query-array-crdt"
		DEFAULT_TEST_PATH="packages/core-data/src/utils/test/rtc-table-query-array-crdt.coverage-fuzz.test.js"
		DEFAULT_MAX_INPUT_BYTES=64
		DEFAULT_MAX_CORPUS_FILES=10000
		DEFAULT_MAX_MINIMIZE_INPUTS=4
		DEFAULT_MAX_FAILURE_ISOLATIONS_PER_RUN=1
		DEFAULT_REPEAT_FAILURE_ISOLATION_EVERY=128
		;;
esac
BASE="${RTC_CG_LOWER_LEVEL_OUTPUT_BASE:-$DEFAULT_BASE}"
GLOBAL_ADMISSION="${RTC_GLOBAL_CPU_ADMISSION:-/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516/rtc-global-cpu-admission.sh}"
SESSION="${RTC_CG_LOWER_LEVEL_SESSION:-rtc-$GROUP_NAME}"
PROFILE="${RTC_CG_LOWER_LEVEL_PROFILE:-$DEFAULT_PROFILE}"
TEST_PATH="${RTC_CG_LOWER_LEVEL_TEST_PATH:-$DEFAULT_TEST_PATH}"
RUNNER_PATH="${RTC_CG_LOWER_LEVEL_RUNNER_PATH:-bin/rtc-coverage-guided-lower-level-runner.mjs}"
HOLD_FILE="${RTC_CG_LOWER_LEVEL_HOLD_FILE:-$BASE/holds/$GROUP_NAME.hold}"
ENGINE="v8-node-coverage-guided-mutator"
COVERAGE_ENGINE="v8-node-coverage"

mkdir -p "$TMUX_WRAP"
if [ ! -x "$TMUX_WRAP/tmux" ]; then
	cat > "$TMUX_WRAP/tmux" <<'SH'
#!/usr/bin/env bash
exec /usr/bin/tmux -L rtc-fuzz "$@"
SH
	chmod +x "$TMUX_WRAP/tmux"
fi
export PATH="$TMUX_WRAP:$NODE_BIN:$PATH"

has_exact_session() {
	tmux list-sessions -F '#S' 2>/dev/null | grep -Fxq "$1"
}

group_held() {
	[ "${RTC_CG_LOWER_LEVEL_IGNORE_HOLD:-0}" != "1" ] && [ -e "$HOLD_FILE" ]
}

wait_for_global_cpu_budget() {
	if [ -x "$GLOBAL_ADMISSION" ]; then
		"$GLOBAL_ADMISSION" wait lower-level "$SESSION"
	fi
}

global_cpu_start_allowed() {
	[ -x "$GLOBAL_ADMISSION" ] || return 0
	"$GLOBAL_ADMISSION" allow lower-level "$SESSION"
}

latest_non_smoke_run_root() {
	find "$BASE/runs" -mindepth 2 -maxdepth 2 -name status.tsv -printf '%T@ %h\n' 2>/dev/null |
		awk '!/coverage-guided-lower-level-smoke-/' |
		sort -nr |
		awk 'NR == 1 { print $2 }'
}

publish_current_run_root() {
	local run_root="$1"

	if [ -z "$run_root" ] || [ ! -d "$run_root" ]; then
		return 1
	fi

	printf '%s\n' "$run_root" > "$BASE/current-run-root.txt"
	if [ -f "$run_root/supervisor-groups.json" ]; then
		cp "$run_root/supervisor-groups.json" "$BASE/supervisor-groups.json"
	fi
}

validate_harness() {
	if [ "${RTC_CG_LOWER_LEVEL_SKIP_PREFLIGHT:-0}" = "1" ]; then
		return 0
	fi

	cd "$REPO"
	mkdir -p "$BASE/tmp/preflight/node" "$BASE/tmp/preflight/npm-cache" "$BASE/tmp/preflight/jest-cache"
	bash -n "$0"
	node --check "$RUNNER_PATH"
	TMPDIR="$BASE/tmp/preflight/node" \
		npm_config_cache="$BASE/tmp/preflight/npm-cache" \
		RTC_FUZZ_ONLY_ASSERTIONS=1 \
		RTC_FUZZ_ASSERTIONS=1 \
		npm run test:unit -- "$TEST_PATH" --runInBand --ci --cacheDirectory "$BASE/tmp/preflight/jest-cache"
}

write_supervisor_groups() {
	local run_root="$1"
	local batch_size="$2"
	local timeout_seconds="$3"
	local nice_level="$4"
	local max_input_bytes="$5"
	local max_corpus_files="$6"
	local max_minimize_inputs="$7"
	local max_failure_isolations_per_run="$8"
	local repeat_failure_isolation_every="$9"

	node - "$run_root/supervisor-groups.json" "$GROUP_NAME" "$PROFILE" "$TEST_PATH" "$batch_size" "$timeout_seconds" "$nice_level" "$max_input_bytes" "$max_corpus_files" "$max_minimize_inputs" "$max_failure_isolations_per_run" "$repeat_failure_isolation_every" "$REPO" "$run_root" "$ENGINE" "$COVERAGE_ENGINE" <<'NODE'
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
	maxCorpusFiles,
	maxMinimizeInputs,
	maxFailureIsolationsPerRun,
	repeatFailureIsolationEvery,
	repoRoot,
	runRoot,
	engine,
	coverageEngine,
] = process.argv.slice( 2 );
function coverageTargetsForProfile( actionProfile, target ) {
	if (
		actionProfile.includes( 'parser' ) ||
		target.includes( 'parser' ) ||
		target.includes( 'serialization' )
	) {
		return [
			'packages/blocks/src/api/parser/index.ts',
			'packages/blocks/src/api/parser/serialize-raw-block.ts',
			'packages/blocks/src/api/serializer.tsx',
			'packages/block-serialization-default-parser/src/index.ts',
			'packages/block-serialization-spec-parser/parser.js',
		];
	}

	return [
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
	];
}
const coverageTargets = coverageTargetsForProfile( profile, testPath );
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
		maxCorpusFiles: Number.parseInt( maxCorpusFiles, 10 ),
		maxMinimizeInputs: Number.parseInt( maxMinimizeInputs, 10 ),
		maxFailureIsolationsPerRun: Number.parseInt(
			maxFailureIsolationsPerRun,
			10
		),
		repeatFailureIsolationEvery: Number.parseInt(
			repeatFailureIsolationEvery,
			10
		),
		timeoutSeconds: Number.parseInt( timeoutSeconds, 10 ),
		nice: Number.parseInt( niceLevel, 10 ),
		corpusFeedback: true,
		semanticFeatureFeedback: true,
		failureIsolation: true,
		repoRoot,
		runRoot,
		corpusDir: path.join( runRoot, 'corpus', 'queue' ),
		crashDir: path.join( runRoot, 'corpus', 'crashes' ),
		harnessFailureDir: path.join( runRoot, 'harness-failures' ),
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
	if group_held; then
		printf 'held %s file=%s\n' "$GROUP_NAME" "$HOLD_FILE"
		return 0
	fi
	if has_exact_session "$SESSION"; then
		publish_current_run_root "$(latest_non_smoke_run_root)" || true
		printf '%s\n' "$SESSION already running"
		return 0
	fi
	if ! global_cpu_start_allowed; then
		printf 'global CPU budget is not admitting %s now; leaving it stopped\n' "$SESSION"
		return 0
	fi
	validate_harness

	local run_started
	local run_root
	local batch_size
	local timeout_seconds
	local nice_level
	local max_input_bytes
	local max_corpus_files
	local max_minimize_inputs
	local max_failure_isolations_per_run
	local repeat_failure_isolation_every
	local max_attempts
	local sleep_seconds
	local previous_root
	run_started="$(date -u +%Y%m%dT%H%M%S%NZ)"
	run_root="$BASE/runs/coverage-guided-lower-level-$run_started"
	batch_size="${RTC_CG_LOWER_LEVEL_BATCH_SIZE:-${RTC_CG_LOWER_LEVEL_RUNS:-32}}"
	timeout_seconds="${RTC_CG_LOWER_LEVEL_TIMEOUT_SECONDS:-1200}"
	nice_level="${RTC_CG_LOWER_LEVEL_NICE:-19}"
	max_input_bytes="${RTC_CG_LOWER_LEVEL_MAX_INPUT_BYTES:-$DEFAULT_MAX_INPUT_BYTES}"
	max_corpus_files="${RTC_CG_LOWER_LEVEL_MAX_CORPUS_FILES:-$DEFAULT_MAX_CORPUS_FILES}"
	max_minimize_inputs="${RTC_CG_LOWER_LEVEL_MAX_MINIMIZE_INPUTS:-$DEFAULT_MAX_MINIMIZE_INPUTS}"
	max_failure_isolations_per_run="${RTC_CG_LOWER_LEVEL_MAX_FAILURE_ISOLATIONS_PER_RUN:-$DEFAULT_MAX_FAILURE_ISOLATIONS_PER_RUN}"
	repeat_failure_isolation_every="${RTC_CG_LOWER_LEVEL_REPEAT_FAILURE_ISOLATION_EVERY:-$DEFAULT_REPEAT_FAILURE_ISOLATION_EVERY}"
	max_attempts="${RTC_CG_LOWER_LEVEL_MAX_ATTEMPTS:-0}"
	sleep_seconds="${RTC_CG_LOWER_LEVEL_SLEEP_SECONDS:-0}"
	previous_root="$(sed -n '1p' "$BASE/current-run-root.txt" 2>/dev/null || true)"

	mkdir -p "$run_root/logs" "$run_root/corpus/queue" "$run_root/coverage"
	if [ "${RTC_CG_LOWER_LEVEL_CARRYOVER_CORPUS:-1}" = "1" ] && [ -n "$previous_root" ] && [ -d "$previous_root" ]; then
		cp -n "$previous_root"/corpus/queue/*.bin "$run_root/corpus/queue/" 2>/dev/null || true
		cp -n "$previous_root"/coverage/coverage-state.json "$run_root/coverage/coverage-state.json" 2>/dev/null || true
	fi
	write_supervisor_groups "$run_root" "$batch_size" "$timeout_seconds" "$nice_level" "$max_input_bytes" "$max_corpus_files" "$max_minimize_inputs" "$max_failure_isolations_per_run" "$repeat_failure_isolation_every"

	tmux new-session -d -s "$SESSION" \
		"bash -lc 'cd \"$REPO\"; export PATH=\"$TMUX_WRAP:$NODE_BIN:\$PATH\"; RTC_CG_LOWER_LEVEL_REPO=\"$REPO\" RTC_CG_LOWER_LEVEL_RUN_ROOT=\"$run_root\" RTC_CG_LOWER_LEVEL_RUN_STARTED=\"$run_started\" RTC_CG_LOWER_LEVEL_GROUP=\"$GROUP_NAME\" RTC_CG_LOWER_LEVEL_PROFILE=\"$PROFILE\" RTC_CG_LOWER_LEVEL_TEST_PATH=\"$TEST_PATH\" RTC_CG_LOWER_LEVEL_BATCH_SIZE=\"$batch_size\" RTC_CG_LOWER_LEVEL_TIMEOUT_SECONDS=\"$timeout_seconds\" RTC_CG_LOWER_LEVEL_SLEEP_SECONDS=\"$sleep_seconds\" RTC_CG_LOWER_LEVEL_NICE=\"$nice_level\" RTC_CG_LOWER_LEVEL_MAX_INPUT_BYTES=\"$max_input_bytes\" RTC_CG_LOWER_LEVEL_MAX_CORPUS_FILES=\"$max_corpus_files\" RTC_CG_LOWER_LEVEL_MAX_MINIMIZE_INPUTS=\"$max_minimize_inputs\" RTC_CG_LOWER_LEVEL_MAX_FAILURE_ISOLATIONS_PER_RUN=\"$max_failure_isolations_per_run\" RTC_CG_LOWER_LEVEL_REPEAT_FAILURE_ISOLATION_EVERY=\"$repeat_failure_isolation_every\" RTC_CG_LOWER_LEVEL_MAX_ATTEMPTS=\"$max_attempts\" node \"$RUNNER_PATH\" >> \"$BASE/logs/coverage-guided-lower-level.log\" 2>&1'"
	publish_current_run_root "$run_root"
	printf 'started %s root=%s sleep=%s max_attempts=%s max_minimize_inputs=%s max_failure_isolations_per_run=%s repeat_failure_isolation_every=%s previous=%s\n' "$SESSION" "$run_root" "$sleep_seconds" "$max_attempts" "$max_minimize_inputs" "$max_failure_isolations_per_run" "$repeat_failure_isolation_every" "${previous_root:-none}"
}

run_once() {
	mkdir -p "$BASE/logs" "$BASE/runs"
	if group_held; then
		printf 'held %s file=%s\n' "$GROUP_NAME" "$HOLD_FILE"
		return 0
	fi
	if ! global_cpu_start_allowed; then
		printf 'global CPU budget is not admitting %s now; skipping smoke run\n' "$SESSION"
		return 0
	fi
	validate_harness

	local run_started
	local run_root
	local batch_size
	local timeout_seconds
	local nice_level
	local max_input_bytes
	local max_corpus_files
	local max_minimize_inputs
	local max_failure_isolations_per_run
	local repeat_failure_isolation_every
	local published_root
	run_started="$(date -u +%Y%m%dT%H%M%S%NZ)"
	run_root="$BASE/runs/coverage-guided-lower-level-smoke-$run_started"
	batch_size="${RTC_CG_LOWER_LEVEL_BATCH_SIZE:-${RTC_CG_LOWER_LEVEL_RUNS:-2}}"
	timeout_seconds="${RTC_CG_LOWER_LEVEL_TIMEOUT_SECONDS:-300}"
	nice_level="${RTC_CG_LOWER_LEVEL_NICE:-19}"
	max_input_bytes="${RTC_CG_LOWER_LEVEL_MAX_INPUT_BYTES:-$DEFAULT_MAX_INPUT_BYTES}"
	max_corpus_files="${RTC_CG_LOWER_LEVEL_MAX_CORPUS_FILES:-$DEFAULT_MAX_CORPUS_FILES}"
	max_minimize_inputs="${RTC_CG_LOWER_LEVEL_MAX_MINIMIZE_INPUTS:-$DEFAULT_MAX_MINIMIZE_INPUTS}"
	max_failure_isolations_per_run="${RTC_CG_LOWER_LEVEL_MAX_FAILURE_ISOLATIONS_PER_RUN:-$DEFAULT_MAX_FAILURE_ISOLATIONS_PER_RUN}"
	repeat_failure_isolation_every="${RTC_CG_LOWER_LEVEL_REPEAT_FAILURE_ISOLATION_EVERY:-$DEFAULT_REPEAT_FAILURE_ISOLATION_EVERY}"
	published_root="$(latest_non_smoke_run_root)"

	mkdir -p "$run_root/logs"
	write_supervisor_groups "$run_root" "$batch_size" "$timeout_seconds" "$nice_level" "$max_input_bytes" "$max_corpus_files" "$max_minimize_inputs" "$max_failure_isolations_per_run" "$repeat_failure_isolation_every"
	if [ -z "$published_root" ]; then
		publish_current_run_root "$run_root"
	fi

	cd "$REPO"
	RTC_CG_LOWER_LEVEL_REPO="$REPO" \
		RTC_CG_LOWER_LEVEL_RUN_ROOT="$run_root" \
		RTC_CG_LOWER_LEVEL_RUN_STARTED="$run_started" \
		RTC_CG_LOWER_LEVEL_GROUP="$GROUP_NAME" \
		RTC_CG_LOWER_LEVEL_PROFILE="$PROFILE" \
		RTC_CG_LOWER_LEVEL_TEST_PATH="$TEST_PATH" \
		RTC_CG_LOWER_LEVEL_BATCH_SIZE="$batch_size" \
		RTC_CG_LOWER_LEVEL_TIMEOUT_SECONDS="$timeout_seconds" \
		RTC_CG_LOWER_LEVEL_NICE="$nice_level" \
		RTC_CG_LOWER_LEVEL_MAX_INPUT_BYTES="$max_input_bytes" \
		RTC_CG_LOWER_LEVEL_MAX_CORPUS_FILES="$max_corpus_files" \
		RTC_CG_LOWER_LEVEL_MAX_MINIMIZE_INPUTS="$max_minimize_inputs" \
		RTC_CG_LOWER_LEVEL_MAX_FAILURE_ISOLATIONS_PER_RUN="$max_failure_isolations_per_run" \
		RTC_CG_LOWER_LEVEL_REPEAT_FAILURE_ISOLATION_EVERY="$repeat_failure_isolation_every" \
		RTC_CG_LOWER_LEVEL_MAX_ATTEMPTS=1 \
		RTC_CG_LOWER_LEVEL_SLEEP_SECONDS=0 \
		node "$RUNNER_PATH" >> "$BASE/logs/coverage-guided-lower-level-smoke.log" 2>&1
	if [ -n "$published_root" ]; then
		publish_current_run_root "$published_root" || true
	fi
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
