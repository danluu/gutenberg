#!/usr/bin/env bash
set -euo pipefail

repo_dir="${RTC_BACKEND_API_FUZZ_REPO_DIR:-$(pwd)}"
session="${RTC_BACKEND_API_FUZZ_SESSION:-rtc-backend-api-fuzz}"
lanes="${RTC_BACKEND_API_FUZZ_LANES:-1}"
case_count="${RTC_BACKEND_API_FUZZ_CASE_COUNT:-40}"
seed_timeout_ms="${RTC_BACKEND_API_FUZZ_SEED_TIMEOUT_MS:-120000}"
seed_count="${RTC_BACKEND_API_FUZZ_SEED_COUNT:-1000000}"
seed_start="${RTC_BACKEND_API_FUZZ_START_SEED:-$(date -u +%s)}"
run_id="${RTC_BACKEND_API_FUZZ_RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
output_dir="${RTC_BACKEND_API_FUZZ_OUTPUT_DIR:-/media/volume/danluu-fuzz-data/rtc-backend-api-fuzz-20260518}"
wp_env_port="${RTC_BACKEND_API_FUZZ_WP_ENV_PORT:-${WP_ENV_PORT:-9540}}"
wp_env_home="${RTC_BACKEND_API_FUZZ_WP_ENV_HOME:-${WP_ENV_HOME:-}}"
wp_env_bin="${RTC_BACKEND_API_FUZZ_WP_ENV_BIN:-./node_modules/.bin/wp-env}"
wp_env_config="${RTC_BACKEND_API_FUZZ_WP_ENV_CONFIG:-.wp-env.test.json}"
auto_start_wp_env="${RTC_BACKEND_API_FUZZ_AUTO_START_WP_ENV:-1}"
require_build="${RTC_BACKEND_API_FUZZ_REQUIRE_BUILD:-1}"
preflight="${RTC_BACKEND_API_FUZZ_PREFLIGHT:-1}"
preflight_case_count="${RTC_BACKEND_API_FUZZ_PREFLIGHT_CASE_COUNT:-8}"
preflight_seed="${RTC_BACKEND_API_FUZZ_PREFLIGHT_SEED:-1}"
preflight_timeout_seconds="${RTC_BACKEND_API_FUZZ_PREFLIGHT_TIMEOUT_SECONDS:-180}"
safe_run_id="$(printf '%s' "$run_id" | tr -c 'A-Za-z0-9_' '_' | cut -c 1-24)"
run_root="$output_dir/runs/$run_id"
update_current_run_root="${RTC_BACKEND_API_FUZZ_UPDATE_CURRENT_RUN_ROOT:-}"
if [ -z "$update_current_run_root" ]; then
	if [ "$seed_count" -gt 1000 ]; then
		update_current_run_root=1
	else
		update_current_run_root=0
	fi
fi

if ! command -v tmux >/dev/null 2>&1; then
	echo "tmux is required for the backend/API fuzz launcher." >&2
	exit 1
fi

if tmux has-session -t "=${session}" 2>/dev/null; then
	echo "tmux session '$session' already exists; leaving it untouched." >&2
	echo "Use RTC_BACKEND_API_FUZZ_SESSION=<new-name> to start another run." >&2
	exit 1
fi

if [ "$require_build" = "1" ]; then
	missing_build_files=()
	for required_build_file in \
		"build/build.php" \
		"build/styles.php" \
		"build/scripts/block-library/blocks-manifest.php" \
		"build/scripts/edit-widgets/blocks/blocks-manifest.php" \
		"build/scripts/widgets/blocks/blocks-manifest.php"
	do
		if [ ! -f "$repo_dir/$required_build_file" ]; then
			missing_build_files+=( "$required_build_file" )
		fi
	done

	if [ "${#missing_build_files[@]}" -gt 0 ]; then
		echo "Gutenberg build artifacts required by PHPUnit bootstrap are missing:" >&2
		printf '  - %s\n' "${missing_build_files[@]}" >&2
		echo "Run npm run build -- --skip-types in $repo_dir to create runtime artifacts." >&2
		exit 1
	fi
fi

wp_env_env=()
if [ -n "$wp_env_home" ]; then
	wp_env_env+=( "WP_ENV_HOME=$wp_env_home" )
fi

set +e
wp_env_status_output="$(
	cd "$repo_dir" &&
		env "${wp_env_env[@]}" WP_ENV_PORT="$wp_env_port" "$wp_env_bin" --config "$wp_env_config" status 2>&1
)"
wp_env_status_rc=$?
set -e

printf '%s\n' "$wp_env_status_output"

if [ "$wp_env_status_rc" -ne 0 ] || ! printf '%s\n' "$wp_env_status_output" | grep -q 'status: running'; then
	if [ "$auto_start_wp_env" != "1" ]; then
		echo "wp-env test environment is not running; set RTC_BACKEND_API_FUZZ_AUTO_START_WP_ENV=1 or start it before launching." >&2
		exit 1
	fi

	echo "Starting wp-env test environment on WP_ENV_PORT=$wp_env_port."
	(
		cd "$repo_dir"
		env "${wp_env_env[@]}" WP_ENV_PORT="$wp_env_port" "$wp_env_bin" --config "$wp_env_config" start
	)
fi

if [ "$lanes" -gt 1 ] && [ "${RTC_BACKEND_API_FUZZ_ALLOW_SHARED_WP_ENV_LANES:-0}" != "1" ]; then
	echo "Refusing to start $lanes lanes against one WP_ENV_PORT=$wp_env_port." >&2
	echo "Use one launcher per isolated checkout/wp-env port, or set RTC_BACKEND_API_FUZZ_ALLOW_SHARED_WP_ENV_LANES=1 for an intentional shared-DB experiment." >&2
	exit 1
fi

lane_table_prefix_for() {
	local lane="$1"
	printf '%s\n' "${RTC_BACKEND_API_FUZZ_TABLE_PREFIX:-rtcbapi_${safe_run_id}_${lane}_}"
}

run_backend_preflight() {
	local lane="$1"
	local lane_table_prefix="$2"
	local preflight_dir="$repo_dir/artifacts/.rtc-backend-api-fuzz-preflight/$run_id/lane-$lane"
	local preflight_output
	local preflight_rc
	local preflight_command=(
		"$wp_env_bin"
		--config
		"$wp_env_config"
		run
		--env-cwd=wp-content/plugins/gutenberg
		wordpress
		env
		"RTC_BACKEND_API_FUZZ_SEED_START=$preflight_seed"
		"RTC_BACKEND_API_FUZZ_SEED_COUNT=1"
		"RTC_BACKEND_API_FUZZ_CASE_COUNT=$preflight_case_count"
		"RTC_BACKEND_API_FUZZ_TRACE_DIR=/var/www/html/wp-content/plugins/gutenberg/artifacts/.rtc-backend-api-fuzz-preflight/$run_id/lane-$lane"
		"RTC_BACKEND_API_FUZZ_SUMMARY_DIR=/var/www/html/wp-content/plugins/gutenberg/artifacts/.rtc-backend-api-fuzz-preflight/$run_id/lane-$lane"
		"WORDPRESS_TABLE_PREFIX=$lane_table_prefix"
		vendor/bin/phpunit
		-c
		phpunit.xml.dist
		--filter
		'Tests_Collaboration_BackendApiAutosaveMetaFuzz::test_seeded_autosave_revision_and_crdt_meta_state_machine'
		phpunit/tests/collaboration/backendApiAutosaveMetaFuzz.php
	)

	mkdir -p "$preflight_dir"
	echo "Running backend/API preflight for lane $lane with WORDPRESS_TABLE_PREFIX=$lane_table_prefix."

	set +e
	if command -v timeout >/dev/null 2>&1; then
		preflight_output="$(
			cd "$repo_dir" &&
				env "${wp_env_env[@]}" WP_ENV_PORT="$wp_env_port" timeout "$preflight_timeout_seconds" "${preflight_command[@]}" 2>&1
		)"
		preflight_rc=$?
	else
		preflight_output="$(
			cd "$repo_dir" &&
				env "${wp_env_env[@]}" WP_ENV_PORT="$wp_env_port" "${preflight_command[@]}" 2>&1
		)"
		preflight_rc=$?
	fi
	set -e

	printf '%s\n' "$preflight_output" | tee "$preflight_dir/preflight.log"

	if [ "$preflight_rc" -ne 0 ]; then
		echo "Backend/API preflight failed for lane $lane; refusing to start tmux fuzzing." >&2
		exit 1
	fi

	if printf '%s\n' "$preflight_output" | grep -Eiq "WordPress database error|Base table or view not found|doesn'?t exist"; then
		echo "Backend/API preflight saw missing-table/database errors for lane $lane; refusing to start tmux fuzzing." >&2
		exit 1
	fi

	if ! grep -Eq '"ok"[[:space:]]*:[[:space:]]*true' "$preflight_dir/seed-$preflight_seed-summary.json" 2>/dev/null; then
		echo "Backend/API preflight did not write a passing seed summary for lane $lane; refusing to start tmux fuzzing." >&2
		exit 1
	fi
}

if [ "$preflight" = "1" ]; then
	for lane in $(seq 0 $((lanes - 1))); do
		run_backend_preflight "$lane" "$(lane_table_prefix_for "$lane")"
	done
else
	echo "Skipping backend/API PHPUnit preflight because RTC_BACKEND_API_FUZZ_PREFLIGHT=$preflight."
fi

mkdir -p "$run_root"
if [ "$update_current_run_root" = "1" ]; then
	printf '%s\n' "$run_root" > "$output_dir/current-run-root.txt"
else
	echo "Leaving $output_dir/current-run-root.txt unchanged for bounded validation run_id=$run_id seed_count=$seed_count."
fi

for lane in $(seq 0 $((lanes - 1))); do
	window="lane-$lane"
	lane_table_prefix="$(lane_table_prefix_for "$lane")"
	tmux_env_prefix=""
	if [ -n "$wp_env_home" ]; then
		tmux_env_prefix="WP_ENV_HOME='$wp_env_home' "
	fi
	command="cd '$repo_dir' && ${tmux_env_prefix}WP_ENV_PORT='$wp_env_port' RTC_BACKEND_API_FUZZ_WP_ENV_HOME='$wp_env_home' RTC_BACKEND_API_FUZZ_WP_ENV_PORT='$wp_env_port' RTC_BACKEND_API_FUZZ_WP_ENV_BIN='$wp_env_bin' RTC_BACKEND_API_FUZZ_WP_ENV_CONFIG='$wp_env_config' RTC_BACKEND_API_FUZZ_OUTPUT_DIR='$output_dir' RTC_BACKEND_API_FUZZ_RUN_ROOT='$run_root' RTC_BACKEND_API_FUZZ_RUN_ID='$run_id' RTC_BACKEND_API_FUZZ_START_SEED='$seed_start' RTC_BACKEND_API_FUZZ_SEED_COUNT='$seed_count' RTC_BACKEND_API_FUZZ_CASE_COUNT='$case_count' RTC_BACKEND_API_FUZZ_SEED_TIMEOUT_MS='$seed_timeout_ms' RTC_BACKEND_API_FUZZ_TABLE_PREFIX='$lane_table_prefix' RTC_BACKEND_API_FUZZ_LANE='$lane' RTC_BACKEND_API_FUZZ_LANE_COUNT='$lanes' node bin/rtc-backend-api-fuzz-runner.mjs"

	if [ "$lane" -eq 0 ]; then
		tmux new-session -d -s "$session" -n "$window" "$command"
	else
		tmux new-window -t "$session" -n "$window" "$command"
	fi
done

cat <<EOF
Started $lanes backend/API fuzz lanes in tmux session '$session'.
Run root: $run_root
Attach: tmux attach -t $session
EOF
