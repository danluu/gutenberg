#!/usr/bin/env bash
set -euo pipefail

NODE_BIN="${NODE_BIN:-/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin}"
TMUX_WRAP="${TMUX_WRAP:-/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin}"
REPO="${RTC_CG_LOWER_LEVEL_REPO:-/media/volume/danluu-fuzz-data/rtc-all-merged-fuzz-20260526T195420Z/repo}"
GROUP_NAME="${RTC_CG_LOWER_LEVEL_GROUP:-coverage-guided-lower-level-rich-text-crdt}"
DEFAULT_BASE="/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-rich-text-crdt-20260528"
DEFAULT_PROFILE="rtc-rich-text-crdt"
DEFAULT_TEST_PATH="packages/core-data/src/utils/test/rtc-rich-text-crdt-merge.coverage-fuzz.test.js"
DEFAULT_MAX_INPUT_BYTES=192
DEFAULT_MAX_CORPUS_FILES=5000
DEFAULT_MAX_MINIMIZE_INPUTS=4
DEFAULT_MAX_FAILURE_ISOLATIONS_PER_RUN=1
DEFAULT_REPEAT_FAILURE_ISOLATION_EVERY=0
DEFAULT_MAX_ATTEMPTS=0
DEFAULT_MINIMIZE_FAILURES=1
DEFAULT_BATCH_SIZE=32
DEFAULT_HTTP_POLLING_FOCUS="all"
PROMOTED_BUILTINS="coverage-guided-lower-level-block-parser-serialization, coverage-guided-lower-level-rich-text-crdt, coverage-guided-lower-level-table-query-array-crdt, coverage-guided-lower-level-http-awareness-selection-propagation, coverage-guided-lower-level-rendered-overlay-dom, coverage-guided-lower-level-post-crdt-save-dirty"
case "$GROUP_NAME" in
	coverage-guided-lower-level-block-parser-serialization)
		DEFAULT_BASE="/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-block-parser-serialization-20260519"
		DEFAULT_PROFILE="rtc-block-parser-serialization"
		DEFAULT_TEST_PATH="packages/blocks/src/api/parser/test/rtc-block-parser-serialization.coverage-fuzz.test.js"
		DEFAULT_MAX_INPUT_BYTES=192
		DEFAULT_MAX_MINIMIZE_INPUTS=8
		DEFAULT_MAX_FAILURE_ISOLATIONS_PER_RUN=1
		DEFAULT_MINIMIZE_FAILURES=1
		DEFAULT_HTTP_POLLING_FOCUS="all"
		;;
	coverage-guided-lower-level-rich-text-crdt)
		DEFAULT_BASE="/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-rich-text-crdt-20260528"
		DEFAULT_PROFILE="rtc-rich-text-crdt"
		DEFAULT_TEST_PATH="packages/core-data/src/utils/test/rtc-rich-text-crdt-merge.coverage-fuzz.test.js"
		DEFAULT_MAX_INPUT_BYTES=192
		DEFAULT_MAX_MINIMIZE_INPUTS=4
		DEFAULT_MAX_FAILURE_ISOLATIONS_PER_RUN=1
		DEFAULT_REPEAT_FAILURE_ISOLATION_EVERY=0
		DEFAULT_MINIMIZE_FAILURES=1
		DEFAULT_HTTP_POLLING_FOCUS="all"
		;;
	coverage-guided-lower-level-table-query-array-crdt)
		DEFAULT_BASE="/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-table-query-array-crdt-20260626"
		DEFAULT_PROFILE="rtc-table-query-array-crdt"
		DEFAULT_TEST_PATH="packages/core-data/src/utils/test/rtc-table-query-array-crdt.coverage-fuzz.test.js"
		DEFAULT_MAX_INPUT_BYTES=256
		DEFAULT_MAX_CORPUS_FILES=5000
		DEFAULT_MAX_MINIMIZE_INPUTS=4
		DEFAULT_MAX_FAILURE_ISOLATIONS_PER_RUN=4
		DEFAULT_REPEAT_FAILURE_ISOLATION_EVERY=0
		DEFAULT_MINIMIZE_FAILURES=1
		DEFAULT_HTTP_POLLING_FOCUS="all"
		;;
	coverage-guided-lower-level-http-awareness-selection-propagation)
		DEFAULT_BASE="/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-http-awareness-selection-propagation-20260528"
		DEFAULT_PROFILE="rtc-http-awareness-selection-propagation"
		DEFAULT_TEST_PATH="packages/sync/src/providers/http-polling/test/polling-manager.coverage-fuzz.test.ts"
		DEFAULT_MAX_INPUT_BYTES=256
		DEFAULT_MAX_CORPUS_FILES=512
		DEFAULT_MAX_MINIMIZE_INPUTS=4
		DEFAULT_MAX_FAILURE_ISOLATIONS_PER_RUN=1
		DEFAULT_REPEAT_FAILURE_ISOLATION_EVERY=0
		DEFAULT_MINIMIZE_FAILURES=1
		DEFAULT_HTTP_POLLING_FOCUS="self-presence"
		;;
	coverage-guided-lower-level-rendered-overlay-dom)
		DEFAULT_BASE="/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-rendered-overlay-dom-20260528"
		DEFAULT_PROFILE="rtc-rendered-overlay-dom"
		DEFAULT_TEST_PATH="packages/editor/src/components/collaborators-overlay/test/rendered-overlay-dom.coverage-fuzz.test.tsx"
		DEFAULT_MAX_INPUT_BYTES=4096
		DEFAULT_MAX_CORPUS_FILES=512
		DEFAULT_MAX_MINIMIZE_INPUTS=4
		DEFAULT_MAX_FAILURE_ISOLATIONS_PER_RUN=1
		DEFAULT_REPEAT_FAILURE_ISOLATION_EVERY=0
		DEFAULT_MINIMIZE_FAILURES=1
		DEFAULT_HTTP_POLLING_FOCUS="self-presence"
		;;
	coverage-guided-lower-level-post-crdt-save-dirty)
		DEFAULT_BASE="/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-post-crdt-save-dirty-20260626"
		DEFAULT_PROFILE="rtc-post-crdt-save-dirty"
		DEFAULT_TEST_PATH="packages/core-data/src/test/rtc-post-crdt-save-dirty.coverage-fuzz.test.js"
		DEFAULT_MAX_INPUT_BYTES=256
		DEFAULT_MAX_CORPUS_FILES=5000
		DEFAULT_MAX_MINIMIZE_INPUTS=4
		DEFAULT_MAX_FAILURE_ISOLATIONS_PER_RUN=4
		DEFAULT_MINIMIZE_FAILURES=1
		DEFAULT_HTTP_POLLING_FOCUS="all"
		;;
	*)
		if [ "${RTC_CG_LOWER_LEVEL_ALLOW_CUSTOM_TARGET:-0}" != "1" ]; then
			printf 'unsupported built-in coverage-guided lower-level group: %s; promoted built-ins: %s\n' "$GROUP_NAME" "$PROMOTED_BUILTINS" >&2
			exit 2
		fi
		: "${RTC_CG_LOWER_LEVEL_OUTPUT_BASE:?custom coverage-guided lower-level targets must set RTC_CG_LOWER_LEVEL_OUTPUT_BASE}"
		: "${RTC_CG_LOWER_LEVEL_PROFILE:?custom coverage-guided lower-level targets must set RTC_CG_LOWER_LEVEL_PROFILE}"
		: "${RTC_CG_LOWER_LEVEL_TEST_PATH:?custom coverage-guided lower-level targets must set RTC_CG_LOWER_LEVEL_TEST_PATH}"
		;;
esac
BASE="${RTC_CG_LOWER_LEVEL_OUTPUT_BASE:-$DEFAULT_BASE}"
GLOBAL_ADMISSION="${RTC_GLOBAL_CPU_ADMISSION:-/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516/rtc-global-cpu-admission.sh}"
SESSION="${RTC_CG_LOWER_LEVEL_SESSION:-rtc-$GROUP_NAME}"
PROFILE="${RTC_CG_LOWER_LEVEL_PROFILE:-$DEFAULT_PROFILE}"
TEST_PATH="${RTC_CG_LOWER_LEVEL_TEST_PATH:-$DEFAULT_TEST_PATH}"
RUNNER_PATH="${RTC_CG_LOWER_LEVEL_RUNNER_PATH:-bin/rtc-coverage-guided-lower-level-runner.mjs}"
HOLD_FILE="${RTC_CG_LOWER_LEVEL_HOLD_FILE:-$BASE/holds/$GROUP_NAME.hold}"
HTTP_POLLING_FOCUS="${RTC_CG_LOWER_LEVEL_HTTP_POLLING_FOCUS:-$DEFAULT_HTTP_POLLING_FOCUS}"
SPEC_PARSER_PATH="${RTC_CG_LOWER_LEVEL_SPEC_PARSER_PATH:-$BASE/tmp/preflight/spec-parser-build/parser.js}"
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
	[ -e "$HOLD_FILE" ] || return 1
	if [ "${RTC_CG_LOWER_LEVEL_IGNORE_HOLD:-0}" != "1" ]; then
		return 0
	fi
	if ! bounded_hold_override; then
		printf 'held %s file=%s; hold override requires explicit bounded RTC_CG_LOWER_LEVEL_MAX_ATTEMPTS>0, RTC_CG_LOWER_LEVEL_BATCH_SIZE/RTC_CG_LOWER_LEVEL_RUNS<=16, RTC_CG_LOWER_LEVEL_MAX_MINIMIZE_INPUTS<=%s, and RTC_CG_LOWER_LEVEL_MAX_FAILURE_ISOLATIONS_PER_RUN<=%s\n' "$GROUP_NAME" "$HOLD_FILE" "$(hold_override_max_minimize_inputs)" "$(hold_override_max_failure_isolations)" >&2
		return 0
	fi
	return 1
}

hold_override_max_minimize_inputs() {
	case "$GROUP_NAME" in
		coverage-guided-lower-level-block-parser-serialization)
			if [ "${RTC_CG_LOWER_LEVEL_DISABLE_MUTATION:-0}" = "1" ]; then
				printf '16\n'
			else
				printf '8\n'
			fi
			;;
		*)
			printf '16\n'
			;;
	esac
}

hold_override_max_failure_isolations() {
	case "$GROUP_NAME" in
		coverage-guided-lower-level-block-parser-serialization)
			if [ "${RTC_CG_LOWER_LEVEL_DISABLE_MUTATION:-0}" = "1" ]; then
				printf '4\n'
			else
				printf '1\n'
			fi
			;;
		*)
			printf '1\n'
			;;
	esac
}

bounded_hold_override() {
	local max_attempts="${RTC_CG_LOWER_LEVEL_MAX_ATTEMPTS:-}"
	local max_minimize_inputs="${RTC_CG_LOWER_LEVEL_MAX_MINIMIZE_INPUTS:-}"
	local batch_size="${RTC_CG_LOWER_LEVEL_BATCH_SIZE:-${RTC_CG_LOWER_LEVEL_RUNS:-}}"
	local max_failure_isolations="${RTC_CG_LOWER_LEVEL_MAX_FAILURE_ISOLATIONS_PER_RUN:-}"
	local max_minimize_limit
	local max_failure_isolation_limit

	max_minimize_limit="$(hold_override_max_minimize_inputs)"
	max_failure_isolation_limit="$(hold_override_max_failure_isolations)"

	case "$max_attempts" in
		''|*[!0-9]*)
			return 1
			;;
	esac
	case "$max_minimize_inputs" in
		''|*[!0-9]*)
			return 1
			;;
	esac
	case "$batch_size" in
		''|*[!0-9]*)
			return 1
			;;
	esac
	case "$max_failure_isolations" in
		''|*[!0-9]*)
			return 1
			;;
	esac

	[ "$max_attempts" -gt 0 ] || return 1
	[ "$max_minimize_inputs" -le "$max_minimize_limit" ] || return 1
	[ "$batch_size" -gt 0 ] || return 1
	[ "$batch_size" -le 16 ] || return 1
	[ "$max_failure_isolations" -le "$max_failure_isolation_limit" ] || return 1
}

wait_for_global_cpu_budget() {
	if [ "${RTC_CG_LOWER_LEVEL_SKIP_GLOBAL_CPU_ADMISSION:-0}" = "1" ]; then
		return 0
	fi
	if [ -x "$GLOBAL_ADMISSION" ]; then
		"$GLOBAL_ADMISSION" wait lower-level "$SESSION"
	fi
}

global_cpu_start_allowed() {
	[ "${RTC_CG_LOWER_LEVEL_SKIP_GLOBAL_CPU_ADMISSION:-0}" = "1" ] && return 0
	[ -x "$GLOBAL_ADMISSION" ] || return 0
	"$GLOBAL_ADMISSION" allow lower-level "$SESSION"
}

default_feature_only_corpus_admission() {
	if [ -n "${RTC_CG_LOWER_LEVEL_FEATURE_ONLY_CORPUS_ADMISSION+x}" ]; then
		printf '%s\n' "$RTC_CG_LOWER_LEVEL_FEATURE_ONLY_CORPUS_ADMISSION"
		return 0
	fi

	case "$PROFILE:$TEST_PATH" in
		*http-polling*|*polling-manager*)
			printf '0\n'
			;;
		*block-parser-serialization*|*parser*serialization*)
			printf '0\n'
			;;
		*rich-text-crdt*|*rtc-rich-text-crdt-merge.coverage-fuzz.test.js*)
			printf '0\n'
			;;
		*table-query-array*|*query-array-crdt*|*rtc-table-query-array-crdt.coverage-fuzz.test.js*)
			printf '0\n'
			;;
		*)
			printf '1\n'
			;;
	esac
}

published_run_root() {
	local run_root

	run_root="$(sed -n '1p' "$BASE/current-run-root.txt" 2>/dev/null || true)"
	if [ -n "$run_root" ] && [ -d "$run_root" ] && [ -f "$run_root/status.tsv" ]; then
		printf '%s\n' "$run_root"
	fi
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

copy_seed_corpus_dirs() {
	local destination="$1"
	local seed_dirs="${RTC_CG_LOWER_LEVEL_SEED_CORPUS_DIRS:-}"
	local old_ifs
	local seed_dir
	local seed_name
	local source_file
	local destination_file

	[ -n "$seed_dirs" ] || return 0
	mkdir -p "$destination"
	old_ifs="$IFS"
	IFS=':'
	for seed_dir in $seed_dirs; do
		if [ ! -d "$seed_dir" ]; then
			printf 'seed corpus dir missing: %s\n' "$seed_dir" >&2
			continue
		fi
		seed_name="$(basename "$seed_dir" | tr -c '[:alnum:]_.-' '_')"
		for source_file in "$seed_dir"/*.bin; do
			[ -f "$source_file" ] || continue
			destination_file="$destination/${seed_name}-$(basename "$source_file")"
			cp "$source_file" "$destination_file"
		done
	done
	IFS="$old_ifs"
}

wait_for_runner_supervisor_groups() {
	local run_root="$1"
	local index

	for index in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
		if [ -s "$run_root/supervisor-groups.json" ]; then
			return 0
		fi
		sleep 0.25
	done

	return 1
}

build_spec_parser_for_validation() {
	local grammar="$REPO/packages/block-serialization-spec-parser/grammar.pegjs"
	local temp_parser="$SPEC_PARSER_PATH"
	local temp_dir
	local pegjs_bin="$REPO/node_modules/.bin/pegjs"

	temp_dir="$(dirname "$temp_parser")"
	mkdir -p "$temp_dir"
	if [ -x "$pegjs_bin" ]; then
		"$pegjs_bin" --format commonjs -o "$temp_parser" "$grammar"
	else
		TMPDIR="$BASE/tmp/preflight/node" \
			npm_config_cache="$BASE/tmp/preflight/npm-cache" \
			npm exec --workspace @wordpress/block-serialization-spec-parser -- \
				pegjs --format commonjs -o "$temp_parser" "$grammar"
	fi
	node --check "$temp_parser"
}

validate_harness() {
	local preflight_input_b64
	preflight_input_b64="${RTC_CG_LOWER_LEVEL_PREFLIGHT_INPUT_B64:-}"
	if [ -z "$preflight_input_b64" ]; then
		case "$GROUP_NAME:$PROFILE:$TEST_PATH" in
			*table-query-array*|*query-array-crdt*|*rtc-table-query-array-crdt.coverage-fuzz.test.js*)
				preflight_input_b64="dGFibGUtcXVlcnktYXJyYXktcmVtb3RlLWNlbGwtZWRpdA=="
				;;
			*post-crdt-save-dirty*|*rtc-post-crdt-save-dirty.coverage-fuzz.test.js*)
				# post-crdt-save-base-metadata
				preflight_input_b64="cG9zdC1jcmR0LXNhdmUtYmFzZS1tZXRhZGF0YQ=="
				;;
		esac
	fi
	if [ "${RTC_CG_LOWER_LEVEL_SKIP_PREFLIGHT:-0}" = "1" ]; then
		return 0
	fi

	cd "$REPO"
	mkdir -p "$BASE/tmp/preflight/node" "$BASE/tmp/preflight/npm-cache" "$BASE/tmp/preflight/jest-cache" "$BASE/tmp/preflight/oracle-artifacts"
	bash -n "$0"
	node --check "$RUNNER_PATH"
	if [[ "$PROFILE" == *parser* || "$TEST_PATH" == *parser* || "$TEST_PATH" == *serialization* ]]; then
		build_spec_parser_for_validation
	fi
	node - "$REPO" "$TEST_PATH" "$SPEC_PARSER_PATH" <<'NODE'
const fs = require( 'fs' );
const path = require( 'path' );
const [ repo, testPath, specParserPath ] = process.argv.slice( 2 );
const absoluteTestPath = path.resolve( repo, testPath );
const isParserTarget =
	testPath.includes( 'parser' ) || testPath.includes( 'serialization' );
const requiredPaths = [ absoluteTestPath ];

if ( isParserTarget ) {
	requiredPaths.push(
		path.resolve(
			repo,
			'packages/block-serialization-default-parser/src/index.ts'
		)
	);
}

for ( const filePath of requiredPaths ) {
	const relativePath = path.relative( repo, filePath );
	if ( relativePath.startsWith( '..' ) || path.isAbsolute( relativePath ) ) {
		throw new Error( `preflight path escapes repo: ${ filePath }` );
	}
	if ( ! fs.existsSync( filePath ) ) {
		throw new Error( `preflight file is missing: ${ relativePath }` );
	}
}

if ( isParserTarget ) {
	if ( ! fs.existsSync( specParserPath ) ) {
		throw new Error( `spec parser preflight file is missing: ${ specParserPath }` );
	}
	const source = fs.readFileSync( absoluteTestPath, 'utf8' );
	if ( source.includes( '@wordpress/block-serialization-spec-parser' ) ) {
		throw new Error(
			'parser harness must use the temp-built GUTENBERG_RTC_CG_SPEC_PARSER_PATH; @wordpress/block-serialization-spec-parser resolves through shared node_modules in this checkout'
		);
	}
	if ( ! source.includes( 'GUTENBERG_RTC_CG_SPEC_PARSER_PATH' ) ) {
		throw new Error(
			'parser harness must load the spec parser from GUTENBERG_RTC_CG_SPEC_PARSER_PATH'
		);
	}
}
NODE
	TMPDIR="$BASE/tmp/preflight/node" \
		npm_config_cache="$BASE/tmp/preflight/npm-cache" \
		RTC_FUZZ_ONLY_ASSERTIONS=1 \
		RTC_FUZZ_ASSERTIONS=1 \
		GUTENBERG_RTC_CG_SPEC_PARSER_PATH="$SPEC_PARSER_PATH" \
		GUTENBERG_RTC_CG_INPUT_B64="$preflight_input_b64" \
		GUTENBERG_RTC_TABLE_QUERY_ARRAY_DIRECT_ONLY="${GUTENBERG_RTC_TABLE_QUERY_ARRAY_DIRECT_ONLY:-}" \
		GUTENBERG_RTC_CG_FEATURE_FILE="$BASE/tmp/preflight/features.json" \
		GUTENBERG_RTC_CG_ORACLE_ARTIFACT_DIR="$BASE/tmp/preflight/oracle-artifacts" \
		npm run test:unit -- "$TEST_PATH" --runInBand --ci --cacheDirectory "$BASE/tmp/preflight/jest-cache"
}

start_loop() {
	mkdir -p "$BASE/logs" "$BASE/runs"
	if group_held; then
		printf 'held %s file=%s\n' "$GROUP_NAME" "$HOLD_FILE"
		return 0
	fi
	if has_exact_session "$SESSION"; then
		publish_current_run_root "$(published_run_root)" || true
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
	local feature_only_corpus_admission
	local max_attempts
	local sleep_seconds
	local minimize_failures
	local previous_root
	run_started="$(date -u +%Y%m%dT%H%M%S%NZ)"
	run_root="$BASE/runs/coverage-guided-lower-level-$run_started"
	batch_size="${RTC_CG_LOWER_LEVEL_BATCH_SIZE:-${RTC_CG_LOWER_LEVEL_RUNS:-$DEFAULT_BATCH_SIZE}}"
	timeout_seconds="${RTC_CG_LOWER_LEVEL_TIMEOUT_SECONDS:-1200}"
	nice_level="${RTC_CG_LOWER_LEVEL_NICE:-19}"
	max_input_bytes="${RTC_CG_LOWER_LEVEL_MAX_INPUT_BYTES:-$DEFAULT_MAX_INPUT_BYTES}"
	max_corpus_files="${RTC_CG_LOWER_LEVEL_MAX_CORPUS_FILES:-$DEFAULT_MAX_CORPUS_FILES}"
	max_minimize_inputs="${RTC_CG_LOWER_LEVEL_MAX_MINIMIZE_INPUTS:-$DEFAULT_MAX_MINIMIZE_INPUTS}"
	max_failure_isolations_per_run="${RTC_CG_LOWER_LEVEL_MAX_FAILURE_ISOLATIONS_PER_RUN:-$DEFAULT_MAX_FAILURE_ISOLATIONS_PER_RUN}"
	repeat_failure_isolation_every="${RTC_CG_LOWER_LEVEL_REPEAT_FAILURE_ISOLATION_EVERY:-$DEFAULT_REPEAT_FAILURE_ISOLATION_EVERY}"
	feature_only_corpus_admission="$(default_feature_only_corpus_admission)"
	max_attempts="${RTC_CG_LOWER_LEVEL_MAX_ATTEMPTS:-$DEFAULT_MAX_ATTEMPTS}"
	sleep_seconds="${RTC_CG_LOWER_LEVEL_SLEEP_SECONDS:-0}"
	minimize_failures="${RTC_CG_LOWER_LEVEL_MINIMIZE_FAILURES:-$DEFAULT_MINIMIZE_FAILURES}"
	previous_root="$(sed -n '1p' "$BASE/current-run-root.txt" 2>/dev/null || true)"

	mkdir -p "$run_root/logs" "$run_root/corpus/queue" "$run_root/coverage"
	if [ "${RTC_CG_LOWER_LEVEL_CARRYOVER_CORPUS:-1}" = "1" ] && [ -n "$previous_root" ] && [ -d "$previous_root" ]; then
		cp -n "$previous_root"/corpus/queue/*.bin "$run_root/corpus/queue/" 2>/dev/null || true
		cp -n "$previous_root"/coverage/coverage-state.json "$run_root/coverage/coverage-state.json" 2>/dev/null || true
	fi
	copy_seed_corpus_dirs "$run_root/corpus/queue"

	tmux new-session -d -s "$SESSION" \
		"bash -lc 'cd \"$REPO\"; export PATH=\"$TMUX_WRAP:$NODE_BIN:\$PATH\"; RTC_CG_LOWER_LEVEL_REPO=\"$REPO\" RTC_CG_LOWER_LEVEL_SESSION=\"$SESSION\" RTC_GLOBAL_CPU_ADMISSION=\"$GLOBAL_ADMISSION\" RTC_CG_LOWER_LEVEL_SKIP_GLOBAL_CPU_ADMISSION=\"${RTC_CG_LOWER_LEVEL_SKIP_GLOBAL_CPU_ADMISSION:-0}\" RTC_CG_LOWER_LEVEL_ALLOW_CUSTOM_TARGET=\"${RTC_CG_LOWER_LEVEL_ALLOW_CUSTOM_TARGET:-0}\" RTC_CG_LOWER_LEVEL_IGNORE_HOLD=\"${RTC_CG_LOWER_LEVEL_IGNORE_HOLD:-0}\" RTC_CG_LOWER_LEVEL_DISABLE_MUTATION=\"${RTC_CG_LOWER_LEVEL_DISABLE_MUTATION:-0}\" RTC_CG_LOWER_LEVEL_SUPPRESS_DUPLICATE_FAILURE_ARTIFACTS=\"${RTC_CG_LOWER_LEVEL_SUPPRESS_DUPLICATE_FAILURE_ARTIFACTS:-1}\" RTC_CG_LOWER_LEVEL_AUDIT_REGRESSION_MODE=\"${RTC_CG_LOWER_LEVEL_AUDIT_REGRESSION_MODE:-0}\" RTC_CG_LOWER_LEVEL_AUDIT_FAILURE_KEYS=\"${RTC_CG_LOWER_LEVEL_AUDIT_FAILURE_KEYS:-}\" RTC_CG_LOWER_LEVEL_HTTP_POLLING_FOCUS=\"$HTTP_POLLING_FOCUS\" RTC_CG_LOWER_LEVEL_HOLD_FILE=\"$HOLD_FILE\" RTC_CG_LOWER_LEVEL_RUN_ROOT=\"$run_root\" RTC_CG_LOWER_LEVEL_RUN_STARTED=\"$run_started\" RTC_CG_LOWER_LEVEL_GROUP=\"$GROUP_NAME\" RTC_CG_LOWER_LEVEL_PROFILE=\"$PROFILE\" RTC_CG_LOWER_LEVEL_TEST_PATH=\"$TEST_PATH\" RTC_CG_LOWER_LEVEL_BATCH_SIZE=\"$batch_size\" RTC_CG_LOWER_LEVEL_TIMEOUT_SECONDS=\"$timeout_seconds\" RTC_CG_LOWER_LEVEL_SLEEP_SECONDS=\"$sleep_seconds\" RTC_CG_LOWER_LEVEL_NICE=\"$nice_level\" RTC_CG_LOWER_LEVEL_MAX_INPUT_BYTES=\"$max_input_bytes\" RTC_CG_LOWER_LEVEL_MAX_CORPUS_FILES=\"$max_corpus_files\" RTC_CG_LOWER_LEVEL_MAX_MINIMIZE_INPUTS=\"$max_minimize_inputs\" RTC_CG_LOWER_LEVEL_MAX_FAILURE_ISOLATIONS_PER_RUN=\"$max_failure_isolations_per_run\" RTC_CG_LOWER_LEVEL_REPEAT_FAILURE_ISOLATION_EVERY=\"$repeat_failure_isolation_every\" RTC_CG_LOWER_LEVEL_MINIMIZE_FAILURES=\"$minimize_failures\" RTC_CG_LOWER_LEVEL_FEATURE_ONLY_CORPUS_ADMISSION=\"$feature_only_corpus_admission\" RTC_CG_LOWER_LEVEL_MAX_ATTEMPTS=\"$max_attempts\" RTC_CG_LOWER_LEVEL_NPM_CACHE_DIR=\"${RTC_CG_LOWER_LEVEL_NPM_CACHE_DIR:-$run_root/tmp/npm-cache}\" npm_config_cache=\"${RTC_CG_LOWER_LEVEL_NPM_CACHE_DIR:-$run_root/tmp/npm-cache}\" RTC_CG_LOWER_LEVEL_SPEC_PARSER_PATH=\"$SPEC_PARSER_PATH\" GUTENBERG_RTC_CG_SPEC_PARSER_PATH=\"$SPEC_PARSER_PATH\" GUTENBERG_RTC_TABLE_QUERY_ARRAY_DIRECT_ONLY=\"${GUTENBERG_RTC_TABLE_QUERY_ARRAY_DIRECT_ONLY:-}\" node \"$RUNNER_PATH\" >> \"$BASE/logs/coverage-guided-lower-level.log\" 2>&1'"
	wait_for_runner_supervisor_groups "$run_root" || true
	publish_current_run_root "$run_root"
	printf 'started %s root=%s sleep=%s max_attempts=%s minimize_failures=%s max_minimize_inputs=%s max_failure_isolations_per_run=%s repeat_failure_isolation_every=%s previous=%s\n' "$SESSION" "$run_root" "$sleep_seconds" "$max_attempts" "$minimize_failures" "$max_minimize_inputs" "$max_failure_isolations_per_run" "$repeat_failure_isolation_every" "${previous_root:-none}"
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
	local feature_only_corpus_admission
	local minimize_failures
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
	feature_only_corpus_admission="$(default_feature_only_corpus_admission)"
	minimize_failures="${RTC_CG_LOWER_LEVEL_MINIMIZE_FAILURES:-$DEFAULT_MINIMIZE_FAILURES}"
	published_root="$(published_run_root)"

	mkdir -p "$run_root/logs" "$run_root/corpus/queue"
	if [ "${RTC_CG_LOWER_LEVEL_CARRYOVER_CORPUS:-1}" = "1" ] && [ -n "$published_root" ] && [ -d "$published_root" ]; then
		cp -n "$published_root"/corpus/queue/*.bin "$run_root/corpus/queue/" 2>/dev/null || true
		mkdir -p "$run_root/coverage"
		cp -n "$published_root"/coverage/coverage-state.json "$run_root/coverage/coverage-state.json" 2>/dev/null || true
	fi
	copy_seed_corpus_dirs "$run_root/corpus/queue"

	cd "$REPO"
	set +e
		RTC_CG_LOWER_LEVEL_REPO="$REPO" \
		RTC_CG_LOWER_LEVEL_SESSION="$SESSION" \
		RTC_GLOBAL_CPU_ADMISSION="$GLOBAL_ADMISSION" \
		RTC_CG_LOWER_LEVEL_SKIP_GLOBAL_CPU_ADMISSION="${RTC_CG_LOWER_LEVEL_SKIP_GLOBAL_CPU_ADMISSION:-0}" \
		RTC_CG_LOWER_LEVEL_ALLOW_CUSTOM_TARGET="${RTC_CG_LOWER_LEVEL_ALLOW_CUSTOM_TARGET:-0}" \
		RTC_CG_LOWER_LEVEL_IGNORE_HOLD="${RTC_CG_LOWER_LEVEL_IGNORE_HOLD:-0}" \
		RTC_CG_LOWER_LEVEL_DISABLE_MUTATION="${RTC_CG_LOWER_LEVEL_DISABLE_MUTATION:-0}" \
		RTC_CG_LOWER_LEVEL_SUPPRESS_DUPLICATE_FAILURE_ARTIFACTS="${RTC_CG_LOWER_LEVEL_SUPPRESS_DUPLICATE_FAILURE_ARTIFACTS:-1}" \
		RTC_CG_LOWER_LEVEL_AUDIT_REGRESSION_MODE="${RTC_CG_LOWER_LEVEL_AUDIT_REGRESSION_MODE:-0}" \
		RTC_CG_LOWER_LEVEL_AUDIT_FAILURE_KEYS="${RTC_CG_LOWER_LEVEL_AUDIT_FAILURE_KEYS:-}" \
		RTC_CG_LOWER_LEVEL_HTTP_POLLING_FOCUS="$HTTP_POLLING_FOCUS" \
		RTC_CG_LOWER_LEVEL_HOLD_FILE="$HOLD_FILE" \
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
		RTC_CG_LOWER_LEVEL_MINIMIZE_FAILURES="$minimize_failures" \
		RTC_CG_LOWER_LEVEL_FEATURE_ONLY_CORPUS_ADMISSION="$feature_only_corpus_admission" \
		RTC_CG_LOWER_LEVEL_NPM_CACHE_DIR="${RTC_CG_LOWER_LEVEL_NPM_CACHE_DIR:-$run_root/tmp/npm-cache}" \
		npm_config_cache="${RTC_CG_LOWER_LEVEL_NPM_CACHE_DIR:-$run_root/tmp/npm-cache}" \
		RTC_CG_LOWER_LEVEL_SPEC_PARSER_PATH="$SPEC_PARSER_PATH" \
		GUTENBERG_RTC_CG_SPEC_PARSER_PATH="$SPEC_PARSER_PATH" \
		GUTENBERG_RTC_TABLE_QUERY_ARRAY_DIRECT_ONLY="${GUTENBERG_RTC_TABLE_QUERY_ARRAY_DIRECT_ONLY:-}" \
		RTC_CG_LOWER_LEVEL_MAX_ATTEMPTS="${RTC_CG_LOWER_LEVEL_MAX_ATTEMPTS:-1}" \
		RTC_CG_LOWER_LEVEL_SLEEP_SECONDS=0 \
		node "$RUNNER_PATH" >> "$BASE/logs/coverage-guided-lower-level-smoke.log" 2>&1
	local runner_status=$?
	set -e

	wait_for_runner_supervisor_groups "$run_root" || true
	if [ -z "$published_root" ]; then
		publish_current_run_root "$run_root" || true
	else
		publish_current_run_root "$published_root" || true
	fi
	printf 'completed smoke root=%s status=%s\n' "$run_root" "$runner_status"
	return "$runner_status"
}

case "${1:-start}" in
	start)
		start_loop
		;;
	run-once)
		run_once
		;;
	validate)
		validate_harness
		printf 'validated %s target=%s profile=%s\n' "$GROUP_NAME" "$TEST_PATH" "$PROFILE"
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
		printf 'usage: %s [start|run-once|validate|stop|status]\n' "$0" >&2
		exit 2
		;;
esac
