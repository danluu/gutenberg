#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${RTC_KNOWN_FIXES_REPO_ROOT:-$( git rev-parse --show-toplevel )}"
RUN_ROOT="${RTC_KNOWN_FIXES_RUN_ROOT:-$REPO_ROOT/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544}"
FUZZ_SET="${RTC_KNOWN_FIXES_FUZZ_SET:-fuzz-matrix-$( date -u +%Y%m%dT%H%M%SZ )}"
FUZZ_ROOT="$RUN_ROOT/$FUZZ_SET"
DURATION_HOURS="${RTC_KNOWN_FIXES_FUZZ_DURATION_HOURS:-8}"
EXPECTED_BRANCH="${RTC_KNOWN_FIXES_BRANCH:-try/rtc-77716-fixes-20260513}"
EXPECTED_HEAD_PREFIX="${RTC_KNOWN_FIXES_EXPECTED_HEAD_PREFIX:-}"
TRUNK_REF="${RTC_KNOWN_FIXES_TRUNK_REF:-refs/remotes/origin/trunk}"
LANE_GUARD="${RTC_KNOWN_FIXES_LANE_GUARD:-1}"
LANE_GUARD_INTERVAL_SECONDS="${RTC_KNOWN_FIXES_LANE_GUARD_INTERVAL_SECONDS:-60}"
LANE_GUARD_MIN_OUTCOMES="${RTC_KNOWN_FIXES_LANE_GUARD_MIN_OUTCOMES:-12}"
LANE_GUARD_MAX_INFRA_NO_SUCCESS="${RTC_KNOWN_FIXES_LANE_GUARD_MAX_INFRA_NO_SUCCESS:-5}"
LANE_GUARD_MAX_BAD_NO_SUCCESS="${RTC_KNOWN_FIXES_LANE_GUARD_MAX_BAD_NO_SUCCESS:-16}"
LANE_GUARD_MAX_UNCERTAIN_LOW_SUCCESS="${RTC_KNOWN_FIXES_LANE_GUARD_MAX_UNCERTAIN_LOW_SUCCESS:-10}"
LANE_GUARD_MAX_LOW_SIGNAL_OUTCOMES="${RTC_KNOWN_FIXES_LANE_GUARD_MAX_LOW_SIGNAL_OUTCOMES:-80}"
AUTO_BUILD="${RTC_KNOWN_FIXES_AUTO_BUILD:-1}"
BUILD_MARKER="${RTC_KNOWN_FIXES_BUILD_MARKER:-$REPO_ROOT/build/scripts/blocks}"

cd "$REPO_ROOT"
mkdir -p "$FUZZ_ROOT"

ensure_gutenberg_build_available() {
	local log="$FUZZ_ROOT/build-preflight.log"

	if [ -d "$BUILD_MARKER" ] && [ -f "$REPO_ROOT/build/build.php" ]; then
		echo "build preflight ok marker=$BUILD_MARKER at=$( date -u +%Y-%m-%dT%H:%M:%SZ )" >> "$log"
		return
	fi

	{
		echo "build preflight missing marker=$BUILD_MARKER buildPhp=$REPO_ROOT/build/build.php at=$( date -u +%Y-%m-%dT%H:%M:%SZ )"
		echo "autoBuild=$AUTO_BUILD"
	} >> "$log"

	if [ "$AUTO_BUILD" != "1" ]; then
		echo "Gutenberg build artifacts are missing. Run npm run build -- --skip-types or set RTC_KNOWN_FIXES_AUTO_BUILD=1." >&2
		exit 6
	fi

	echo "running npm run build -- --skip-types at=$( date -u +%Y-%m-%dT%H:%M:%SZ )" >> "$log"
	if ! npm run build -- --skip-types >> "$log" 2>&1; then
		echo "Gutenberg build failed; see $log" >&2
		exit 6
	fi

	if [ ! -d "$BUILD_MARKER" ] || [ ! -f "$REPO_ROOT/build/build.php" ]; then
		echo "Gutenberg build completed but required artifacts are still missing; see $log" >&2
		exit 6
	fi

	echo "build preflight repaired marker=$BUILD_MARKER at=$( date -u +%Y-%m-%dT%H:%M:%SZ )" >> "$log"
}

current_branch="$( git branch --show-current )"
current_head="$( git rev-parse HEAD )"
trunk_head="$( git rev-parse "$TRUNK_REF" 2>/dev/null || echo unknown )"
base_sha="$( git merge-base HEAD "$TRUNK_REF" 2>/dev/null || echo unknown )"

if [ "$current_branch" != "$EXPECTED_BRANCH" ]; then
	echo "wrong branch" >&2
	exit 2
fi

if [ -n "$EXPECTED_HEAD_PREFIX" ] && [[ "$current_head" != "$EXPECTED_HEAD_PREFIX"* ]]; then
	echo "wrong head" >&2
	exit 2
fi

ensure_gutenberg_build_available

{
	echo "startedAt=$( date -u +%Y-%m-%dT%H:%M:%SZ )"
	echo "repoRoot=$REPO_ROOT"
	echo "branch=$current_branch"
	echo "head=$current_head"
	echo "expectedHead=${EXPECTED_HEAD_PREFIX:-none}"
	echo "trunkRef=$TRUNK_REF"
	echo "trunkHead=$trunk_head"
	echo "base=$base_sha"
	echo "includedPRs=77723,77724,77775,77866,77874,77876,77887,77890,77924,78251"
	echo "trunkIncludedPRs=75841,75975,77658,77662,77666,77669,77673,77675,77681,77865"
	echo "skippedPRs=77889"
	echo "fuzzSet=$FUZZ_SET"
	echo "durationHours=$DURATION_HOURS"
	echo "lowDiskMode=1"
	echo "syncFaults=disabled"
	echo "inlineCodex=0"
	echo "expandedSurface=1"
	echo "laneFilter=${RTC_KNOWN_FIXES_LANE_FILTER:-all}"
	echo "prewarmEnvs=${RTC_KNOWN_FIXES_PREWARM_ENVS:-1}"
	echo "convergenceTimeoutMs=${RTC_KNOWN_FIXES_CONVERGENCE_TIMEOUT_MS:-30000}"
	echo "realUserParserStress=${RTC_KNOWN_FIXES_REAL_USER_PARSER_STRESS:-0}"
	echo "realUserSaveCheckpoints=${RTC_KNOWN_FIXES_REAL_USER_SAVE_CHECKPOINTS:-0}"
	echo "realUserActionSequence=${RTC_KNOWN_FIXES_REAL_USER_ACTION_SEQUENCE:-ui-type-paragraph,ui-heading-shortcut,ui-type-title}"
	echo "richTextActionSequence=${RTC_KNOWN_FIXES_RICH_TEXT_ACTION_SEQUENCE:-ui-type-paragraph,ui-paste-rich-text,ui-link-paragraph,ui-list-indent,ui-unicode-composition-text,ui-undo-redo-paragraph,ui-heading-shortcut,ui-type-title}"
	echo "operationLedgerMode=${RTC_KNOWN_FIXES_OPERATION_LEDGER_MODE:-shadow}"
	echo "autoBuild=$AUTO_BUILD"
	echo "buildMarker=$BUILD_MARKER"
	echo "laneGuard=$LANE_GUARD"
	echo "laneGuardIntervalSeconds=$LANE_GUARD_INTERVAL_SECONDS"
	echo "laneGuardMinOutcomes=$LANE_GUARD_MIN_OUTCOMES"
	echo "laneGuardMaxInfraNoSuccess=$LANE_GUARD_MAX_INFRA_NO_SUCCESS"
	echo "laneGuardMaxBadNoSuccess=$LANE_GUARD_MAX_BAD_NO_SUCCESS"
	echo "laneGuardMaxUncertainLowSuccess=$LANE_GUARD_MAX_UNCERTAIN_LOW_SUCCESS"
	echo "laneGuardMaxLowSignalOutcomes=$LANE_GUARD_MAX_LOW_SIGNAL_OUTCOMES"
} > "$FUZZ_ROOT/run-metadata.env"

ensure_wp_env_running() {
	local port="$1"
	local config="$RUN_ROOT/wp-env-known-fixes-test-${port}.json"
	local log="$FUZZ_ROOT/wp-env-${port}-status.log"
	if [ ! -f "$config" ]; then
		cat > "$config" <<EOF
{
	"\$schema": "$REPO_ROOT/schemas/json/wp-env.json",
	"testsEnvironment": false,
	"port": $port,
	"core": "WordPress/WordPress",
	"plugins": [ "$REPO_ROOT" ],
	"themes": [
		"$REPO_ROOT/test/emptytheme"
	],
	"config": {
		"WP_DEBUG": false,
		"SCRIPT_DEBUG": false
	},
	"mappings": {
		"wp-content/plugins/gutenberg": "$REPO_ROOT",
		"wp-content/mu-plugins": "$REPO_ROOT/packages/e2e-tests/mu-plugins",
		"wp-content/plugins/gutenberg-test-plugins": "$REPO_ROOT/packages/e2e-tests/plugins",
		"wp-content/themes/gutenberg-test-themes": "$REPO_ROOT/test/gutenberg-test-themes",
		"wp-content/themes/gutenberg-test-themes/twentytwentyone": "https://downloads.wordpress.org/theme/twentytwentyone.2.1.zip",
		"wp-content/themes/gutenberg-test-themes/twentytwentythree": "https://downloads.wordpress.org/theme/twentytwentythree.1.3.zip",
		"wp-content/themes/gutenberg-test-themes/twentytwentyfour": "https://downloads.wordpress.org/theme/twentytwentyfour.1.0.zip"
	}
}
EOF
	fi
	if ! npm run wp-env -- --config "$config" status > "$log" 2>&1 || ! rg -q 'status: running' "$log"; then
		if ! npm run wp-env -- --config "$config" start >> "$log" 2>&1; then
			recover_partial_wp_env_install "$port" "$log"
			npm run wp-env -- --config "$config" start >> "$log" 2>&1
		fi
	fi
	if ! wait_for_wp_env_ready "$port" "$config" "$log"; then
		recover_unready_wp_env "$port" "$config" "$log"
		npm run wp-env -- --config "$config" start >> "$log" 2>&1
		if ! wait_for_wp_env_ready "$port" "$config" "$log"; then
			echo "wp-env on port $port did not become ready after isolated recovery; see $log" >&2
			exit 4
		fi
	fi
}

recover_partial_wp_env_install() {
	local port="$1"
	local log="$2"
	local install_path
	local project_prefix
	local has_recoverable_error
	install_path="$( awk -F': ' '/install path:/ { print $2; exit }' "$log" || true )"
	if [ -z "$install_path" ]; then
		install_path="$( sed -nE "s#.*destination path '([^']+)/WordPress'.*#\\1#p" "$log" | tail -1 )"
	fi
	project_prefix="wp-env-known-fixes-20260513-201544-wp-env-known-fixes-test-${port}-"
	has_recoverable_error=0

	if rg -q 'destination path .*/WordPress.*already exists and is not an empty directory' "$log"; then
		has_recoverable_error=1
	fi
	if rg -q 'failed to set up container networking: endpoint with name .* already exists in network' "$log"; then
		has_recoverable_error=1
	fi
	if rg -q "cannot open '.git/FETCH_HEAD'|Unable to read current working directory" "$log"; then
		has_recoverable_error=1
	fi
	if [ "$has_recoverable_error" != "1" ]; then
		return 1
	fi

	if [ -n "$install_path" ] && [[ "$install_path" != "$HOME/.wp-env/${project_prefix}"* ]]; then
		echo "refusing partial wp-env recovery for unexpected install path: $install_path" >> "$log"
		return 1
	fi

	echo "recovering partial isolated wp-env install path=${install_path:-unknown} port=$port prefix=$project_prefix" >> "$log"
	remove_isolated_wp_env_objects "$project_prefix" "$log"
	if [ -n "$install_path" ]; then
		rm -rf "$install_path"
	fi
}

remove_isolated_wp_env_objects() {
	local project_prefix="$1"
	local log="$2"

	docker ps -aq --filter "name=${project_prefix}" | while read -r container_id; do
		if [ -n "$container_id" ]; then
			docker rm -f "$container_id" >> "$log" 2>&1 || true
		fi
	done
	docker volume ls -q | rg "^${project_prefix}" | while read -r volume_name; do
		if [ -n "$volume_name" ]; then
			docker volume rm "$volume_name" >> "$log" 2>&1 || true
		fi
	done
	docker network ls --format '{{.ID}}	{{.Name}}' | awk -v prefix="$project_prefix" '$2 ~ "^" prefix { print $1 }' | while read -r network_id; do
		if [ -n "$network_id" ]; then
			docker network inspect -f '{{range $id, $container := .Containers}}{{println $container.Name}}{{end}}' "$network_id" 2>> "$log" | while read -r endpoint_name; do
				if [ -n "$endpoint_name" ]; then
					docker network disconnect -f "$network_id" "$endpoint_name" >> "$log" 2>&1 || true
				fi
			done
			docker network rm "$network_id" >> "$log" 2>&1 || true
		fi
	done
}

recover_unready_wp_env() {
	local port="$1"
	local config="$2"
	local log="$3"
	local install_path
	local project_prefix
	install_path="$( awk -F': ' '/install path:/ { print $2; exit }' "$log" || true )"
	project_prefix="wp-env-known-fixes-20260513-201544-wp-env-known-fixes-test-${port}-"

	if [[ "$config" != "$RUN_ROOT/wp-env-known-fixes-test-${port}.json" ]]; then
		echo "refusing unready wp-env recovery for unexpected config: $config" >> "$log"
		return 1
	fi
	if [ -n "$install_path" ] && [[ "$install_path" != "$HOME/.wp-env/${project_prefix}"* ]]; then
		echo "refusing unready wp-env recovery for unexpected install path: $install_path" >> "$log"
		return 1
	fi

	echo "recovering unready isolated wp-env port=$port installPath=${install_path:-unknown} at=$( date -u +%Y-%m-%dT%H:%M:%SZ )" >> "$log"
	npm run wp-env -- --config "$config" destroy >> "$log" 2>&1 || true
	remove_isolated_wp_env_objects "$project_prefix" "$log"
	if [ -n "$install_path" ]; then
		rm -rf "$install_path"
	fi
}

wait_for_wp_env_ready() {
	local port="$1"
	local config="$2"
	local log="$3"
	local php
	php='$plugin = WP_PLUGIN_DIR . "/gutenberg-test-plugins/disable-animations.php"; if ( ! file_exists( $plugin ) ) { fwrite( STDERR, "missing plugin gutenberg-test-plugins/disable-animations.php\n" ); exit( 2 ); } global $wpdb; $wpdb->get_var( "SELECT 1" ); if ( $wpdb->last_error ) { fwrite( STDERR, "db error: $wpdb->last_error\n" ); exit( 3 ); } $active_plugins = (array) get_option( "active_plugins", array() ); if ( ! defined( "GUTENBERG_VERSION" ) ) { fwrite( STDERR, "gutenberg plugin not loaded; active_plugins=" . wp_json_encode( $active_plugins ) . "\n" ); exit( 4 ); } if ( ! function_exists( "wp_is_collaboration_enabled" ) ) { fwrite( STDERR, "collaboration functions not loaded; gutenberg=" . GUTENBERG_VERSION . "\n" ); exit( 5 ); } if ( ! wp_is_collaboration_enabled() ) { fwrite( STDERR, "collaboration disabled; option=" . var_export( get_option( "wp_collaboration_enabled" ), true ) . "\n" ); exit( 6 ); } echo "rtc-known-fixes-env-ok gutenberg=" . GUTENBERG_VERSION . " collaboration=1\n";'

	for attempt in $( seq 1 60 ); do
		{
			echo "readiness attempt=$attempt at=$( date -u +%Y-%m-%dT%H:%M:%SZ )"
		} >> "$log"
		if \
			curl -fsS --max-time 5 -o /dev/null "http://localhost:$port/wp-json/" >> "$log" 2>&1 && \
			npm run wp-env -- --config "$config" run cli wp eval "$php" >> "$log" 2>&1; then
			echo "readiness ok at=$( date -u +%Y-%m-%dT%H:%M:%SZ )" >> "$log"
			return
		fi
		if [ "$attempt" -ge 8 ] && rg -q 'Database Error|Error establishing a database connection|No space left on device|requested URL returned error: 500' "$log"; then
			echo "readiness early-fail database-or-500 port=$port attempt=$attempt at=$( date -u +%Y-%m-%dT%H:%M:%SZ )" >> "$log"
			return 1
		fi
		if [ "$attempt" -ge 20 ] && rg -q "Failed to connect to localhost port $port" "$log"; then
			echo "readiness early-fail no-listener port=$port attempt=$attempt at=$( date -u +%Y-%m-%dT%H:%M:%SZ )" >> "$log"
			return 1
		fi
		sleep 2
	done

	echo "wp-env on port $port did not become ready; see $log" >> "$log"
	return 1
}

start_ws_server() {
	local port="$1"
	local log="$FUZZ_ROOT/ws-server-${port}.log"
	if curl -fsS "http://127.0.0.1:$port/health" >/dev/null 2>&1; then
		return
	fi
	node ./test/e2e/bin/rtc-test-ws-sync-server.mjs --port "$port" > "$log" 2>&1 &
	echo "$!" > "$FUZZ_ROOT/ws-server-${port}.pid"
	for _ in $( seq 1 30 ); do
		if curl -fsS "http://127.0.0.1:$port/health" >/dev/null 2>&1; then
			return
		fi
		sleep 1
	done
	echo "WebSocket test server did not become healthy on port $port" >&2
	exit 3
}

run_lane() {
	local label="$1"
	local port="$2"
	local transport="$3"
	local ws_port="$4"
	local seed="$5"
	local stride="$6"
	local profile="$7"
	local extra_collaborators="$8"
	local collaborator_mode="${9:-distinct-user}"
	local step_count="${10:-12}"
	local force_save_steps="${11-2}"
	local save_checkpoint_count="${12:-1}"
	local lifecycle_reload_count="${13:-1}"
	local real_user_sequence="${14:-}"
	local disable_parser_stress="${15:-}"
	local playwright_project="${16:-chromium}"
	local common_doc_blocks="${17:-0}"
	local collaborator_roles="${18:-editor}"
	local post_author_mode="${19:-admin}"
	local final_persistence_oracle="${20:-fail}"
	local out="$FUZZ_ROOT/$label"
	mkdir -p "$out"
	echo "$label startedAt=$( date -u +%Y-%m-%dT%H:%M:%SZ ) port=$port transport=$transport seed=$seed profile=$profile project=$playwright_project collaboratorMode=$collaborator_mode steps=$step_count" \
		>> "$FUZZ_ROOT/lane-launch.log"
	ensure_wp_env_running "$port"
	if [ "$transport" = "ws" ]; then
		start_ws_server "$ws_port"
	fi
	env \
		WP_BASE_URL="http://localhost:$port" \
		RTC_FUZZ_BASE_URL="http://localhost:$port" \
		WP_ENV_PORT="$port" \
		RTC_FUZZ_OUTPUT_DIR="$out" \
		RTC_FUZZ_LANE_LABEL="known-fixes-$label" \
		RTC_FUZZ_START_SEED="$seed" \
		RTC_FUZZ_SEED_STRIDE="$stride" \
		RTC_FUZZ_DURATION_HOURS="$DURATION_HOURS" \
		RTC_FUZZ_STEP_COUNT="$step_count" \
		RTC_FUZZ_CONVERGENCE_TIMEOUT_MS="${RTC_KNOWN_FIXES_CONVERGENCE_TIMEOUT_MS:-30000}" \
		RTC_FUZZ_PLAYWRIGHT_PROJECT="$playwright_project" \
		RTC_FUZZ_ASSUME_WP_ENV_RUNNING=1 \
		RTC_FUZZ_INLINE_CODEX=0 \
		RTC_FUZZ_ANALYSIS_RECHECKS="${RTC_KNOWN_FIXES_ANALYSIS_RECHECKS:-0}" \
		RTC_FUZZ_BOOTSTRAP_STALL_RECHECKS=0 \
		RTC_FUZZ_LOW_DISK_MODE=1 \
		RTC_FUZZ_PLAYWRIGHT_TRACE=off \
		RTC_FUZZ_DISABLE_SYNC_FAULTS=1 \
		GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS=1 \
		GUTENBERG_RTC_BROWSER_DISABLE_PARSER_STRESS="$disable_parser_stress" \
		GUTENBERG_RTC_BROWSER_ACTION_PROFILE="$profile" \
		GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE="${RTC_KNOWN_FIXES_OPERATION_LEDGER_MODE:-shadow}" \
		GUTENBERG_RTC_BROWSER_COLLABORATOR_MODE="$collaborator_mode" \
		GUTENBERG_RTC_BROWSER_COLLABORATOR_ROLES="$collaborator_roles" \
		GUTENBERG_RTC_BROWSER_POST_AUTHOR_MODE="$post_author_mode" \
		GUTENBERG_RTC_BROWSER_SKIP_GLOBAL_POST_CLEANUP=1 \
		GUTENBERG_RTC_BROWSER_COLLECT_BEHAVIORAL_COVERAGE=1 \
		GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS="$extra_collaborators" \
		GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE="$final_persistence_oracle" \
		GUTENBERG_RTC_BROWSER_FORCE_SAVE_STEPS="$force_save_steps" \
		GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT="$save_checkpoint_count" \
		GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT="$lifecycle_reload_count" \
		GUTENBERG_RTC_BROWSER_REAL_USER_EDITING_SEQUENCE="$real_user_sequence" \
		GUTENBERG_RTC_BROWSER_COMMON_LENGTH_DOCUMENT_BLOCK_COUNT="$common_doc_blocks" \
		GUTENBERG_RTC_TEST_WS_PROVIDER="$( [ "$transport" = "ws" ] && echo 1 || echo 0 )" \
		GUTENBERG_RTC_TEST_WS_PORT="$ws_port" \
		GUTENBERG_RTC_TEST_WS_URL="ws://127.0.0.1:$ws_port" \
		GUTENBERG_RTC_TEST_WS_SKIP_RESET=1 \
		node ./bin/rtc-browser-fuzz-runner.mjs \
		> "$FUZZ_ROOT/$label.log" 2>&1 &
	local runner_pid="$!"
	echo "$runner_pid" > "$out/runner.pid"
	wait "$runner_pid"
	local code=$?
	rm -f "$out/runner.pid"
	if [ -f "$out/lane-guard-stop.json" ] && [ "$code" != "0" ]; then
		code=0
	fi
	echo "$label exitCode=$code finishedAt=$( date -u +%Y-%m-%dT%H:%M:%SZ )" \
		>> "$FUZZ_ROOT/lane-launch.log"
	return "$code"
}

set +e
LANE_FILTER="${RTC_KNOWN_FIXES_LANE_FILTER:-}"
REAL_USER_PARSER_STRESS="${RTC_KNOWN_FIXES_REAL_USER_PARSER_STRESS:-0}"
REAL_USER_PARSER_DISABLE="1"
if [ "$REAL_USER_PARSER_STRESS" = "1" ]; then
	REAL_USER_PARSER_DISABLE=""
fi
REAL_USER_SAVE_CHECKPOINTS="${RTC_KNOWN_FIXES_REAL_USER_SAVE_CHECKPOINTS:-0}"
REAL_USER_FORCE_SAVE_STEPS=""
REAL_USER_SAVE_CHECKPOINT_COUNT="0"
if [ "$REAL_USER_SAVE_CHECKPOINTS" = "1" ]; then
	REAL_USER_FORCE_SAVE_STEPS="2"
	REAL_USER_SAVE_CHECKPOINT_COUNT="1"
fi
REAL_USER_ACTION_SEQUENCE="${RTC_KNOWN_FIXES_REAL_USER_ACTION_SEQUENCE:-ui-type-paragraph,ui-heading-shortcut,ui-type-title}"
RICH_TEXT_ACTION_SEQUENCE="${RTC_KNOWN_FIXES_RICH_TEXT_ACTION_SEQUENCE:-ui-type-paragraph,ui-paste-rich-text,ui-link-paragraph,ui-list-indent,ui-unicode-composition-text,ui-undo-redo-paragraph,ui-heading-shortcut,ui-type-title}"
should_run_lane() {
	local label="$1"
	if [ -z "$LANE_FILTER" ]; then
		return 0
	fi
	case ",$LANE_FILTER," in
		*,"$label",*) return 0 ;;
		*) return 1 ;;
	esac
}

start_lane() {
	local label="$1"
	shift
	if should_run_lane "$label"; then
		run_lane "$label" "$@" &
		pids+=( "$!" )
		lane_labels+=( "$label" )
	else
		echo "$label skippedByLaneFilter=$LANE_FILTER at=$( date -u +%Y-%m-%dT%H:%M:%SZ )" >> "$FUZZ_ROOT/lane-launch.log"
	fi
}

guard_reason_for_lane() {
	local state_path="$1"
	if [ "$LANE_GUARD" = "0" ] || [ ! -f "$state_path" ]; then
		return 1
	fi
	node -e '
const fs = require("fs");
const statePath = process.argv[1];
const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
if (state.stopReason) process.exit(1);
const successes = Number(state.successes || 0);
const realBugs = Number(state.realBugs || 0);
const notReal = Number(state.notRealFailures || 0);
const uncertain = Number(state.uncertainFailures || 0);
const infra = Number(state.infraFailures || 0);
const total = successes + realBugs + notReal + uncertain + infra;
const bad = notReal + infra;
const minOutcomes = Number(process.env.RTC_KNOWN_FIXES_LANE_GUARD_MIN_OUTCOMES || 12);
const maxInfraNoSuccess = Number(process.env.RTC_KNOWN_FIXES_LANE_GUARD_MAX_INFRA_NO_SUCCESS || 5);
const maxBadNoSuccess = Number(process.env.RTC_KNOWN_FIXES_LANE_GUARD_MAX_BAD_NO_SUCCESS || 16);
const maxUncertainLowSuccess = Number(process.env.RTC_KNOWN_FIXES_LANE_GUARD_MAX_UNCERTAIN_LOW_SUCCESS || 10);
const maxLowSignalOutcomes = Number(process.env.RTC_KNOWN_FIXES_LANE_GUARD_MAX_LOW_SIGNAL_OUTCOMES || 80);
let reason = "";
if (infra >= maxInfraNoSuccess && successes === 0 && realBugs === 0) {
	reason = `infra-no-success infra=${infra} successes=${successes}`;
} else if (total >= minOutcomes && successes === 0 && realBugs === 0 && bad >= maxBadNoSuccess) {
	reason = `bad-no-success total=${total} bad=${bad}`;
} else if (uncertain >= maxUncertainLowSuccess && successes <= 2 && realBugs === 0) {
	reason = `uncertain-low-success uncertain=${uncertain} successes=${successes}`;
} else if (total >= maxLowSignalOutcomes && successes / Math.max(total, 1) < 0.05 && realBugs === 0) {
	reason = `low-signal total=${total} successes=${successes}`;
}
if (!reason) process.exit(1);
process.stdout.write(reason);
' "$state_path"
}

mark_lane_guarded() {
	local label="$1"
	local reason="$2"
	local out="$FUZZ_ROOT/$label"
	local state_path="$out/state.json"
	mkdir -p "$out"
	node -e '
const fs = require("fs");
const [outPath, label, reason] = process.argv.slice(1);
fs.writeFileSync(outPath, JSON.stringify({
	at: new Date().toISOString(),
	label,
	reason,
	action: "terminated-noisy-lane"
}, null, 2) + "\n");
' "$out/lane-guard-stop.json" "$label" "$reason"
	if [ -f "$state_path" ]; then
		node -e '
const fs = require("fs");
const [statePath, reason] = process.argv.slice(1);
const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
state.stopReason = `lane-guard:${reason}`;
state.lastUpdatedAt = new Date().toISOString();
fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
' "$state_path" "$reason" || true
	fi
	echo "$label laneGuardStop=\"$reason\" at=$( date -u +%Y-%m-%dT%H:%M:%SZ )" >> "$FUZZ_ROOT/lane-launch.log"
}

terminate_lane_for_guard() {
	local label="$1"
	local pid="$2"
	local reason="$3"
	local out="$FUZZ_ROOT/$label"
	local runner_pid
	mark_lane_guarded "$label" "$reason"
	runner_pid="$( cat "$out/runner.pid" 2>/dev/null || true )"
	if [ -n "$runner_pid" ]; then
		pkill -TERM -P "$runner_pid" 2>/dev/null || true
		kill -TERM "$runner_pid" 2>/dev/null || true
	fi
	pkill -TERM -P "$pid" 2>/dev/null || true
	kill -TERM "$pid" 2>/dev/null || true
}

wait_for_lanes_with_guard() {
	local exit_code=0
	local active code index label pid state_path reason
	while true; do
		active=0
		for index in "${!pids[@]}"; do
			pid="${pids[$index]}"
			label="${lane_labels[$index]}"
			if [ -z "$pid" ]; then
				continue
			fi
			if kill -0 "$pid" 2>/dev/null; then
				active=1
				state_path="$FUZZ_ROOT/$label/state.json"
				if reason="$( guard_reason_for_lane "$state_path" 2>/dev/null )"; then
					terminate_lane_for_guard "$label" "$pid" "$reason"
				fi
				continue
			fi
			wait "$pid"
			code="$?"
			pids[$index]=""
			if [ "$code" != "0" ]; then
				exit_code="$code"
			fi
		done
		if [ "$active" = "0" ]; then
			break
		fi
		sleep "$LANE_GUARD_INTERVAL_SECONDS"
	done
	return "$exit_code"
}

if [ "${RTC_KNOWN_FIXES_PREWARM_ENVS:-1}" != "0" ]; then
	prewarm_pids=()
	for lane_port in \
		http-real-user-editing:8892 \
		http-persistence:8893 \
		http-structure:8894 \
		ws-session-lifecycle:8895 \
		ws-three-user-late-join:8896 \
		ws-real-user-editing:8897 \
		http-real-user-rich-text:8920 \
		ws-same-user-lifecycle:8921 \
		http-revision-persistence:8922 \
		ws-multi-reload-lifecycle:8923 \
		http-block-gauntlet:8924 \
		http-parser-transform:8925 \
		http-media-async:8926 \
		http-dynamic-blocks:8927 \
		http-cross-entity:8928 \
		http-autosave-revision:8929 \
		http-common-length-document:8930 \
		http-real-user-rich-text-webkit:8931 \
		http-real-user-rich-text-firefox:8932 \
		http-author-owned-post:8933; do
		label="${lane_port%:*}"
		port="${lane_port#*:}"
		if ! should_run_lane "$label"; then
			continue
		fi
		(
			echo "prewarm port=$port startedAt=$( date -u +%Y-%m-%dT%H:%M:%SZ )" >> "$FUZZ_ROOT/lane-launch.log"
			ensure_wp_env_running "$port"
			echo "prewarm port=$port readyAt=$( date -u +%Y-%m-%dT%H:%M:%SZ )" >> "$FUZZ_ROOT/lane-launch.log"
		) &
		prewarm_pids+=( "$!" )
	done
	prewarm_exit_code=0
	for prewarm_pid in "${prewarm_pids[@]}"; do
		if ! wait "$prewarm_pid"; then
			prewarm_exit_code=4
		fi
	done
	if [ "$prewarm_exit_code" != "0" ]; then
		exit "$prewarm_exit_code"
	fi
fi
pids=()
lane_labels=()
start_lane http-real-user-editing 8892 http 0 1500001 6 real-user-editing 0 distinct-user 12 "$REAL_USER_FORCE_SAVE_STEPS" "$REAL_USER_SAVE_CHECKPOINT_COUNT" 1 "$REAL_USER_ACTION_SEQUENCE" "$REAL_USER_PARSER_DISABLE" chromium 0 editor admin off
start_lane http-persistence 8893 http 0 1600001 6 persistence 0
start_lane http-structure 8894 http 0 1700001 6 structure 0
start_lane ws-session-lifecycle 8895 ws 19100 1800001 6 session-lifecycle 1
start_lane ws-three-user-late-join 8896 ws 19101 1900001 6 three-user-late-join 1
start_lane ws-real-user-editing 8897 ws 19102 2000001 6 real-user-editing 0 distinct-user 12 "$REAL_USER_FORCE_SAVE_STEPS" "$REAL_USER_SAVE_CHECKPOINT_COUNT" 1 "$REAL_USER_ACTION_SEQUENCE" "$REAL_USER_PARSER_DISABLE" chromium 0 editor admin off
start_lane http-real-user-rich-text 8920 http 0 2100001 12 real-user-rich-text 0 distinct-user 12 2 1 1 "$RICH_TEXT_ACTION_SEQUENCE" 1 chromium 0 editor
start_lane ws-same-user-lifecycle 8921 ws 19103 2200001 12 same-user-lifecycle 1 same-user 12 2 1 1 "" 1 chromium 0 editor
start_lane http-revision-persistence 8922 http 0 2300001 12 revision-persistence 0 distinct-user 14 3,10 2 1 "" 1 chromium 0 editor
start_lane ws-multi-reload-lifecycle 8923 ws 19104 2400001 12 multi-reload-lifecycle 1 distinct-user 14 3 1 2 "" 1 chromium 0 editor
start_lane http-block-gauntlet 8924 http 0 2500001 12 block-gauntlet 0 distinct-user 12 2 1 1 "" "" chromium 0 editor
start_lane http-parser-transform 8925 http 0 2600001 12 parser-transform 0 distinct-user 10 2 1 1 "" "" chromium 0 editor
start_lane http-media-async 8926 http 0 2700001 12 media-async 0 distinct-user 12 2 1 1 "" 1 chromium 0 editor
start_lane http-dynamic-blocks 8927 http 0 2800001 12 dynamic-blocks 0 distinct-user 12 2 1 1 "" 1 chromium 0 editor
start_lane http-cross-entity 8928 http 0 2900001 12 cross-entity 0 distinct-user 12 2 1 1 "" 1 chromium 0 editor
start_lane http-autosave-revision 8929 http 0 3000001 12 autosave-revision 0 distinct-user 14 3,10 2 1 "" 1 chromium 0 editor
start_lane http-common-length-document 8930 http 0 3100001 12 common-length-document 0 distinct-user 14 3 1 1 "" 1 chromium 32 editor
start_lane http-real-user-rich-text-webkit 8931 http 0 3200001 12 real-user-rich-text 0 distinct-user 8 2 1 1 "$RICH_TEXT_ACTION_SEQUENCE" 1 webkit 0 editor
start_lane http-real-user-rich-text-firefox 8932 http 0 3300001 12 real-user-rich-text 0 distinct-user 8 2 1 1 "$RICH_TEXT_ACTION_SEQUENCE" 1 firefox 0 editor
start_lane http-author-owned-post 8933 http 0 3400001 12 real-user-rich-text 0 distinct-user 8 2 1 1 "$RICH_TEXT_ACTION_SEQUENCE" 1 chromium 0 author collaborator

exit_code=0
if [ "${#pids[@]}" = "0" ]; then
	echo "no lanes selected by RTC_KNOWN_FIXES_LANE_FILTER=$LANE_FILTER" >&2
	exit 5
fi
if [ "$LANE_GUARD" = "0" ]; then
	for pid in "${pids[@]}"; do
		wait "$pid"
		code=$?
		if [ "$code" != "0" ]; then
			exit_code="$code"
		fi
	done
else
	wait_for_lanes_with_guard
	exit_code="$?"
fi
set -e

{
	echo "finishedAt=$( date -u +%Y-%m-%dT%H:%M:%SZ )"
	echo "exitCode=$exit_code"
} >> "$FUZZ_ROOT/run-metadata.env"

exit "$exit_code"
