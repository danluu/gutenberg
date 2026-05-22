#!/usr/bin/env bash
set -euo pipefail

NODE_BIN="${NODE_BIN:-/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin}"
TMUX_WRAP="${TMUX_WRAP:-/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin}"
REPO="${RTC_LOWER_LEVEL_FUZZ_REPO:-/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo}"
BASE="${RTC_LOWER_LEVEL_FUZZ_BASE:-/media/volume/danluu-fuzz-data/rtc-lower-level-fuzz-20260516}"
GLOBAL_ADMISSION="${RTC_GLOBAL_CPU_ADMISSION:-/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516/rtc-global-cpu-admission.sh}"
SESSION="${RTC_LOWER_LEVEL_FUZZ_SESSION:-rtc-lower-level-fuzz-loop}"
GROUP_NAME="${RTC_LOWER_LEVEL_GROUP_NAME:-unit-property-rich-text-crdt-merge}"
PROFILE="${RTC_LOWER_LEVEL_PROFILE:-rtc-rich-text-crdt-merge}"
TEST_PATH="${RTC_LOWER_LEVEL_TEST_PATH:-packages/core-data/src/utils/test/rtc-rich-text-crdt-merge.coverage-fuzz.test.js}"
JEST_CONFIG="${RTC_LOWER_LEVEL_JEST_CONFIG:-test/unit/jest.config.js}"
JEST_RUNNER="${RTC_LOWER_LEVEL_JEST_RUNNER:-node_modules/@wordpress/scripts/scripts/test-unit-jest.js}"
JEST_CACHE_DIR="${RTC_LOWER_LEVEL_JEST_CACHE_DIR:-$BASE/tmp/jest-cache}"
TMP_DIR="${TMPDIR:-$BASE/tmp/node}"
NPM_CACHE_DIR="${npm_config_cache:-$BASE/tmp/npm-cache}"

mkdir -p "$TMUX_WRAP"
cat > "$TMUX_WRAP/tmux" <<'SH'
#!/usr/bin/env bash
exec /usr/bin/tmux -L rtc-fuzz "$@"
SH
chmod +x "$TMUX_WRAP/tmux"
export PATH="$TMUX_WRAP:$NODE_BIN:$PATH"

has_exact_session() {
	tmux list-sessions -F '#S' 2>/dev/null | grep -Fxq "$1"
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

write_event() {
	local events_path="$1"
	local root_events_path="$2"
	local seed_start="$3"
	local seed_count="$4"
	local case_count="$5"
	local placement_case_count="$6"
	local exit_code="$7"
	local duration_ms="$8"
	local runner_command="$9"
	local feature_path="${10}"
	local log_path="${11}"
	local input_path="${12}"
	local group_name="${13}"
	local profile="${14}"
	local test_path="${15}"
	node - "$events_path" "$root_events_path" "$seed_start" "$seed_count" "$case_count" "$placement_case_count" "$exit_code" "$duration_ms" "$runner_command" "$feature_path" "$log_path" "$input_path" "$group_name" "$profile" "$test_path" <<'NODE'
const fs = require( 'fs' );
const [
	eventsPath,
	rootEventsPath,
	seedStart,
	seedCount,
	caseCount,
	placementCaseCount,
	exitCode,
	durationMs,
	runnerCommand,
	featurePath,
	logPath,
	inputPath,
	groupName,
	profile,
	testPath,
] = process.argv.slice( 2 );
const code = Number.parseInt( exitCode, 10 );
const seedBatchCount = Number.parseInt( seedCount, 10 );
const richTextCaseCount = Number.parseInt( caseCount, 10 );
const placementRichTextCaseCount = Number.parseInt( placementCaseCount, 10 );
const fixedUnitCaseCount = 0;
const generatedUnitCaseCount = seedBatchCount * richTextCaseCount;

function summarizeFailure( text ) {
	const lines = String( text )
		.split( /\r?\n/ )
		.map( ( line ) => line.trim() )
		.filter( Boolean );

	return (
		lines.find( ( line ) => /\bRTC_[A-Z0-9_]+:/.test( line ) ) ||
		lines.find( ( line ) =>
			/Unexpected coverage-guided rich-text CRDT|Local-only block attribute leaked|Object stringification leaked|Test suite failed to run|Cannot find module|Timed out|ENOSPC|no space left on device|Error:|FAIL /i.test(
				line
			)
		) ||
		lines[ 0 ] ||
		null
	);
}

function canonicalFailureKey( summary, kind ) {
	if ( ! summary ) {
		return code === 0 ? null : `${ kind || 'failure' }:unknown`;
	}

	const explicit = summary.match( /\bRTC_[A-Z0-9_]+(?::[A-Za-z0-9_.-]+)*/u );
	if ( explicit ) {
		const key = explicit[ 0 ].replace( /:+$/, '' );
		if (
			key.startsWith( 'RTC_TABLE_QUERY_ARRAY_CRDT_DIVERGENCE:' ) &&
			/remote|marker|reorder|suffix/.test( key )
		) {
			return 'RTC_TABLE_QUERY_ARRAY_CRDT_DIVERGENCE:remote-marker-family';
		}
		return key;
	}

	const normalized = summary
		.replace( /\s+/g, '_' )
		.replace( /[^A-Za-z0-9_./:-]+/g, '_' )
		.replace( /^_+|_+$/g, '' )
		.slice( 0, 160 );
	return `${ kind || 'failure' }:${ normalized || 'unknown' }`;
}

function classifyFailure() {
	if ( code === 0 ) {
		return { kind: null, summary: null, canonicalKey: null };
	}

	let logText = '';
	try {
		logText = fs.readFileSync( logPath, 'utf8' );
	} catch ( error ) {
		logText = `log-read-error:${ error.name || 'unknown' }`;
	}
	const summary = summarizeFailure( logText );
	let kind = 'unknown-failure';
	if ( code === 124 ) {
		kind = 'harness-timeout';
	} else if (
		/Test suite failed to run|Cannot find module|Jest encountered an unexpected token|Validation Error|SyntaxError|ReferenceError|ENOSPC|no space left on device/i.test(
			logText
		)
	) {
		kind = 'harness-bootstrap';
	} else if (
		/RTC_RICH_TEXT_CRDT_|Unexpected coverage-guided rich-text CRDT|Local-only block attribute leaked|Object stringification leaked/i.test(
			logText
		)
	) {
		kind = 'oracle-failure';
	}

	return {
		kind,
		summary,
		canonicalKey: canonicalFailureKey( summary, kind ),
	};
}

let semanticFeatureKeys = [];
try {
	if ( featurePath && fs.existsSync( featurePath ) ) {
		const parsed = JSON.parse( fs.readFileSync( featurePath, 'utf8' ) );
		if ( Array.isArray( parsed ) ) {
			semanticFeatureKeys = parsed
				.map( ( feature ) => String( feature ) )
				.filter( Boolean )
				.slice( 0, 512 );
		}
	}
} catch ( error ) {
	semanticFeatureKeys = [ `feature-read-error:${ error.name || 'unknown' }` ];
}
const failure = classifyFailure();
const event = {
	kind: 'seed-attempt-complete',
	at: new Date().toISOString(),
	group: groupName,
	groupName,
	fuzzLevel: 'unit-property',
	label: 'primary',
	ok: code === 0,
	exitCode: code,
	seedStart: Number.parseInt( seedStart, 10 ),
	seedCount: seedBatchCount,
	caseCount: richTextCaseCount,
	placementCaseCount: placementRichTextCaseCount,
	jestTestCount: 1,
	fixedUnitCaseCount,
	generatedUnitCaseCount,
	testExecutionCount: fixedUnitCaseCount + generatedUnitCaseCount,
	executionUnitCount: fixedUnitCaseCount + generatedUnitCaseCount,
	durationMs: Number.parseInt( durationMs, 10 ),
	runnerCommand,
	executionStrategy: 'direct-node-jest-per-batch',
	startupAmortizationInputs: fixedUnitCaseCount + generatedUnitCaseCount,
	transport: 'in-process',
	target: testPath,
	actionProfile: profile,
	profile,
	logPath,
	inputPath,
	featurePath,
	failureKind: failure.kind,
	failureSummary: failure.summary,
	failureCanonicalKey: failure.canonicalKey,
	semanticFeatureCount: semanticFeatureKeys.length,
	semanticFeatureKeys,
};
fs.appendFileSync( eventsPath, `${ JSON.stringify( event ) }\n` );
if ( rootEventsPath && rootEventsPath !== eventsPath ) {
	fs.appendFileSync( rootEventsPath, `${ JSON.stringify( event ) }\n` );
}
NODE
}

write_input_file() {
	local input_path="$1"
	local seed_start="$2"
	local seed_count="$3"
	local case_count="$4"
	node - "$input_path" "$seed_start" "$seed_count" "$case_count" <<'NODE'
const fs = require( 'fs' );
const [ inputPath, seedStartValue, seedCountValue, caseCountValue ] =
	process.argv.slice( 2 );
const seedStart = Number.parseInt( seedStartValue, 10 );
const seedCount = Number.parseInt( seedCountValue, 10 );
const caseCount = Number.parseInt( caseCountValue, 10 );

function makeInput( seed, caseIndex ) {
	let state = ( seed + caseIndex * 7919 ) % 2147483647;
	if ( state <= 0 ) {
		state += 2147483646;
	}
	const length = 8 + ( state % 56 );
	const bytes = Buffer.alloc( length );
	for ( let index = 0; index < length; index++ ) {
		state = ( state * 48271 ) % 2147483647;
		bytes[ index ] = state & 0xff;
	}
	return bytes.toString( 'base64' );
}

const inputs = [];
for ( let seedOffset = 0; seedOffset < seedCount; seedOffset++ ) {
	for ( let caseIndex = 0; caseIndex < caseCount; caseIndex++ ) {
		inputs.push( makeInput( seedStart + seedOffset, caseIndex ) );
	}
}
fs.writeFileSync( inputPath, `${ JSON.stringify( inputs, null, 2 ) }\n` );
NODE
}

run_loop() {
	local run_root="${RTC_LOWER_LEVEL_RUN_ROOT:?RTC_LOWER_LEVEL_RUN_ROOT is required}"
	local run_started="${RTC_LOWER_LEVEL_RUN_STARTED:-$(date -u +%Y%m%dT%H%M%SZ)}"
	local seed_start="${RTC_LOWER_LEVEL_SEED_START:-${GUTENBERG_RTC_RICH_TEXT_FUZZ_SEED_START:-1592594996}}"
	local seed_count="${RTC_LOWER_LEVEL_SEED_COUNT:-${GUTENBERG_RTC_RICH_TEXT_FUZZ_SEED_COUNT:-2}}"
	local case_count="${RTC_LOWER_LEVEL_CASE_COUNT:-${GUTENBERG_RTC_RICH_TEXT_FUZZ_CASE_COUNT:-16}}"
	local placement_case_count="${RTC_LOWER_LEVEL_PLACEMENT_CASE_COUNT:-${GUTENBERG_RTC_RICH_TEXT_PLACEMENT_CASE_COUNT:-0}}"
	local sleep_seconds="${RTC_LOWER_LEVEL_SLEEP_SECONDS:-0}"
	local failure_sleep_seconds="${RTC_LOWER_LEVEL_FAILURE_SLEEP_SECONDS:-30}"
	local timeout_seconds="${RTC_LOWER_LEVEL_TIMEOUT_SECONDS:-1200}"
	local nice_level="${RTC_LOWER_LEVEL_NICE:-15}"
	local generation_dir="$run_root/${GROUP_NAME}-gen-0-$run_started"
	local lane_dir="$generation_dir/lane-0"
	local events_path="$lane_dir/events.ndjson"
	local root_events_path="$run_root/events.ndjson"
	local status_path="$run_root/status.tsv"

	mkdir -p "$run_root/logs" "$lane_dir" "$TMP_DIR" "$NPM_CACHE_DIR" "$JEST_CACHE_DIR"
	touch "$events_path" "$root_events_path" "$status_path"
	cd "$REPO"

	while true; do
		local ts
		local started_s
		local ended_s
		local duration_ms
		local log_path
		local feature_path
		local input_path
		local exit_code
		local runner_command
		ts="$(date -u +%Y%m%dT%H%M%SZ)"
		log_path="$run_root/logs/${GROUP_NAME}-${ts}-seed-${seed_start}.log"
		feature_path="$lane_dir/semantic-features-${ts}-seed-${seed_start}.json"
		input_path="$lane_dir/inputs-${ts}-seed-${seed_start}.json"
		rm -f "$feature_path"
		wait_for_global_cpu_budget
		write_input_file "$input_path" "$seed_start" "$seed_count" "$case_count"
		runner_command="RTC_FUZZ_ONLY_ASSERTIONS=1 RTC_FUZZ_ASSERTIONS=1 nice -n $nice_level timeout ${timeout_seconds}s node $JEST_RUNNER --config $JEST_CONFIG $TEST_PATH --runInBand --ci --cacheDirectory $JEST_CACHE_DIR"
		started_s="$(date -u +%s)"
		set +e
		env \
			CI=1 \
			RTC_FUZZ_ONLY_ASSERTIONS=1 \
			RTC_FUZZ_ASSERTIONS=1 \
			TMPDIR="$TMP_DIR" \
			npm_config_cache="$NPM_CACHE_DIR" \
			GUTENBERG_RTC_CG_RICH_TEXT_INPUT_FILE="$input_path" \
			GUTENBERG_RTC_RICH_TEXT_FUZZ_SEED_START="$seed_start" \
			GUTENBERG_RTC_RICH_TEXT_FUZZ_SEED_COUNT="$seed_count" \
			GUTENBERG_RTC_RICH_TEXT_FUZZ_CASE_COUNT="$case_count" \
			GUTENBERG_RTC_RICH_TEXT_PLACEMENT_CASE_COUNT="$placement_case_count" \
			GUTENBERG_RTC_CG_FEATURE_FILE="$feature_path" \
			GUTENBERG_RTC_LOWER_LEVEL_FEATURE_FILE="$feature_path" \
			nice -n "$nice_level" timeout "${timeout_seconds}s" \
			node "$JEST_RUNNER" --config "$JEST_CONFIG" "$TEST_PATH" --runInBand --ci --cacheDirectory "$JEST_CACHE_DIR" \
			> "$log_path" 2>&1
		exit_code=$?
		set -e
		ended_s="$(date -u +%s)"
		duration_ms=$(( ( ended_s - started_s ) * 1000 ))
		write_event "$events_path" "$root_events_path" "$seed_start" "$seed_count" "$case_count" "$placement_case_count" "$exit_code" "$duration_ms" "$runner_command" "$feature_path" "$log_path" "$input_path" "$GROUP_NAME" "$PROFILE" "$TEST_PATH"
		printf '%s\tseed_start=%s\tseed_count=%s\tcase_count=%s\tplacement_case_count=%s\tduration_ms=%s\texit=%s\tlog=%s\tfeatures=%s\n' \
			"$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
			"$seed_start" \
			"$seed_count" \
			"$case_count" \
			"$placement_case_count" \
			"$duration_ms" \
			"$exit_code" \
			"$log_path" \
			"$feature_path" >> "$status_path"
		seed_start=$(( seed_start + seed_count ))
		if [ "$exit_code" -ne 0 ]; then
			sleep "$failure_sleep_seconds"
		elif [ "$sleep_seconds" -gt 0 ]; then
			sleep "$sleep_seconds"
		fi
	done
}

start_loop() {
	mkdir -p "$BASE/logs" "$BASE/runs"
	if has_exact_session "$SESSION"; then
		printf '%s\n' "$SESSION already running"
		return 0
	fi
	if ! global_cpu_start_allowed; then
		printf 'global CPU budget is not admitting %s now; leaving it stopped\n' "$SESSION"
		return 0
	fi

	local run_started
	local run_root
	local seed_start
	local seed_count
	local case_count
	local placement_case_count
	local timeout_seconds
	local nice_level
	run_started="$(date -u +%Y%m%dT%H%M%SZ)"
	run_root="$BASE/runs/unit-property-$run_started"
	seed_start="${RTC_LOWER_LEVEL_SEED_START:-${GUTENBERG_RTC_RICH_TEXT_FUZZ_SEED_START:-1592594996}}"
	seed_count="${RTC_LOWER_LEVEL_SEED_COUNT:-${GUTENBERG_RTC_RICH_TEXT_FUZZ_SEED_COUNT:-2}}"
	case_count="${RTC_LOWER_LEVEL_CASE_COUNT:-${GUTENBERG_RTC_RICH_TEXT_FUZZ_CASE_COUNT:-16}}"
	placement_case_count="${RTC_LOWER_LEVEL_PLACEMENT_CASE_COUNT:-${GUTENBERG_RTC_RICH_TEXT_PLACEMENT_CASE_COUNT:-0}}"
	timeout_seconds="${RTC_LOWER_LEVEL_TIMEOUT_SECONDS:-1200}"
	nice_level="${RTC_LOWER_LEVEL_NICE:-15}"

	mkdir -p "$run_root/logs" "$TMP_DIR" "$NPM_CACHE_DIR" "$JEST_CACHE_DIR"
	printf '%s\n' "$run_root" > "$BASE/current-run-root.txt"
	node - "$run_root/supervisor-groups.json" "$GROUP_NAME" "$PROFILE" "$TEST_PATH" "$seed_start" "$seed_count" "$case_count" "$placement_case_count" "$REPO" "$timeout_seconds" "$nice_level" "$JEST_RUNNER" "$JEST_CONFIG" "$JEST_CACHE_DIR" <<'NODE'
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
	timeoutSeconds,
	niceLevel,
	jestRunner,
	jestConfig,
	jestCacheDir,
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
		runnerCommand: `RTC_FUZZ_ONLY_ASSERTIONS=1 RTC_FUZZ_ASSERTIONS=1 nice -n ${ niceLevel } timeout ${ timeoutSeconds }s node ${ jestRunner } --config ${ jestConfig } ${ testPath } --runInBand --ci --cacheDirectory ${ jestCacheDir }`,
		executionStrategy: 'direct-node-jest-per-batch',
	},
];
fs.writeFileSync( outPath, `${ JSON.stringify( groups, null, 2 ) }\n` );
NODE
	cp "$run_root/supervisor-groups.json" "$BASE/supervisor-groups.json"

	tmux new-session -d -s "$SESSION" \
		"bash -lc 'cd \"$REPO\"; export PATH=\"$TMUX_WRAP:$NODE_BIN:\$PATH\"; TMPDIR=\"$TMP_DIR\" npm_config_cache=\"$NPM_CACHE_DIR\" RTC_LOWER_LEVEL_GROUP_NAME=\"$GROUP_NAME\" RTC_LOWER_LEVEL_PROFILE=\"$PROFILE\" RTC_LOWER_LEVEL_TEST_PATH=\"$TEST_PATH\" RTC_LOWER_LEVEL_JEST_CONFIG=\"$JEST_CONFIG\" RTC_LOWER_LEVEL_JEST_RUNNER=\"$JEST_RUNNER\" RTC_LOWER_LEVEL_JEST_CACHE_DIR=\"$JEST_CACHE_DIR\" RTC_LOWER_LEVEL_RUN_ROOT=\"$run_root\" RTC_LOWER_LEVEL_RUN_STARTED=\"$run_started\" RTC_LOWER_LEVEL_SEED_START=\"$seed_start\" RTC_LOWER_LEVEL_SEED_COUNT=\"$seed_count\" RTC_LOWER_LEVEL_CASE_COUNT=\"$case_count\" RTC_LOWER_LEVEL_PLACEMENT_CASE_COUNT=\"$placement_case_count\" \"$REPO/bin/rtc-lower-level-fuzz-loop-remote.sh\" run >> \"$BASE/logs/lower-level-fuzz-loop.log\" 2>&1'"
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
