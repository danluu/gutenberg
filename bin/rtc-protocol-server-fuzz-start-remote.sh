#!/usr/bin/env bash
set -euo pipefail

repo_dir="${RTC_PROTOCOL_SERVER_FUZZ_REPO_DIR:-$(pwd)}"
session="${RTC_PROTOCOL_SERVER_FUZZ_SESSION:-rtc-protocol-server-fuzz}"
lanes="${RTC_PROTOCOL_SERVER_FUZZ_LANES:-1}"
case_count="${RTC_PROTOCOL_SERVER_FUZZ_CASE_COUNT:-180}"
seed_timeout_ms="${RTC_PROTOCOL_SERVER_FUZZ_SEED_TIMEOUT_MS:-120000}"
seed_count="${RTC_PROTOCOL_SERVER_FUZZ_SEED_COUNT:-1000000}"
seed_start="${RTC_PROTOCOL_SERVER_FUZZ_START_SEED:-${RTC_PROTOCOL_SERVER_FUZZ_SEED_START:-$(date -u +%s)}}"
run_id="${RTC_PROTOCOL_SERVER_FUZZ_RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
output_dir="${RTC_PROTOCOL_SERVER_FUZZ_OUTPUT_DIR:-/media/volume/danluu-fuzz-data/rtc-native-assert-protocol-20260516/protocol}"
wp_env_port="${RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_PORT:-${WP_ENV_PORT:-9540}}"
wp_env_home="${RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_HOME:-${WP_ENV_HOME:-}}"
wp_env_bin="${RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_BIN:-./node_modules/.bin/wp-env}"
wp_env_config="${RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_CONFIG:-.wp-env.test.json}"
auto_start_wp_env="${RTC_PROTOCOL_SERVER_FUZZ_AUTO_START_WP_ENV:-1}"
require_build="${RTC_PROTOCOL_SERVER_FUZZ_REQUIRE_BUILD:-0}"
preflight="${RTC_PROTOCOL_SERVER_FUZZ_PREFLIGHT:-1}"
install_test_tables="${RTC_PROTOCOL_SERVER_FUZZ_INSTALL_TEST_TABLES:-1}"
preflight_case_count="${RTC_PROTOCOL_SERVER_FUZZ_PREFLIGHT_CASE_COUNT:-20}"
preflight_seed="${RTC_PROTOCOL_SERVER_FUZZ_PREFLIGHT_SEED:-1}"
preflight_timeout_seconds="${RTC_PROTOCOL_SERVER_FUZZ_PREFLIGHT_TIMEOUT_SECONDS:-180}"
safe_run_id="$(printf '%s' "$run_id" | tr -c 'A-Za-z0-9_' '_' | cut -c 1-24)"
update_current_run_root="${RTC_PROTOCOL_SERVER_FUZZ_UPDATE_CURRENT_RUN_ROOT:-}"
if [ -z "$update_current_run_root" ]; then
	if [ "$seed_count" -gt 1000 ]; then
		update_current_run_root=1
	else
		update_current_run_root=0
	fi
fi

if ! command -v tmux >/dev/null 2>&1; then
	echo "tmux is required for the protocol/server fuzz launcher." >&2
	exit 1
fi

if tmux has-session -t "=${session}" 2>/dev/null; then
	echo "tmux session '$session' already exists; leaving it untouched." >&2
	echo "Use RTC_PROTOCOL_SERVER_FUZZ_SESSION=<new-name> to start another run." >&2
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
		echo "Run npm run build -- --skip-types in $repo_dir to create runtime artifacts, or set RTC_PROTOCOL_SERVER_FUZZ_REQUIRE_BUILD=0 for an intentional infra probe." >&2
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
		echo "wp-env test environment is not running; set RTC_PROTOCOL_SERVER_FUZZ_AUTO_START_WP_ENV=1 or start it before launching." >&2
		exit 1
	fi

	echo "Starting wp-env test environment on WP_ENV_PORT=$wp_env_port."
	(
		cd "$repo_dir"
		env "${wp_env_env[@]}" WP_ENV_PORT="$wp_env_port" "$wp_env_bin" --config "$wp_env_config" start
	)
fi

if [ "$lanes" -gt 1 ] && [ "${RTC_PROTOCOL_SERVER_FUZZ_ALLOW_SHARED_WP_ENV_LANES:-0}" != "1" ]; then
	echo "Refusing to start $lanes lanes against one WP_ENV_PORT=$wp_env_port." >&2
	echo "Use one launcher per isolated checkout/wp-env port, or set RTC_PROTOCOL_SERVER_FUZZ_ALLOW_SHARED_WP_ENV_LANES=1 for an intentional shared-DB experiment." >&2
	exit 1
fi

lane_table_prefix_for() {
	local lane="$1"
	if [ -n "${RTC_PROTOCOL_SERVER_FUZZ_TABLE_PREFIX:-}" ]; then
		printf '%s\n' "$RTC_PROTOCOL_SERVER_FUZZ_TABLE_PREFIX"
	elif [ -n "${RTC_PROTOCOL_SERVER_FUZZ_PHPUNIT_TABLE_PREFIX:-}" ]; then
		printf '%s\n' "$RTC_PROTOCOL_SERVER_FUZZ_PHPUNIT_TABLE_PREFIX"
	elif [ "${RTC_PROTOCOL_SERVER_FUZZ_USE_DEFAULT_PHPUNIT_TABLES:-0}" = "1" ]; then
		printf '%s\n' ""
	else
		printf '%s\n' "rtcps_${safe_run_id}_${lane}_"
	fi
}

phpunit_table_prefix_for() {
	local lane_table_prefix="$1"
	if [ -n "$lane_table_prefix" ]; then
		printf '%s\n' "$lane_table_prefix"
	else
		printf '%s\n' "${RTC_PROTOCOL_SERVER_FUZZ_PHPUNIT_TABLE_PREFIX:-wptests_}"
	fi
}

ensure_protocol_phpunit_tables() {
	local lane="$1"
	local lane_table_prefix="$2"
	local phpunit_table_prefix
	local drop_sql

	if [ "$install_test_tables" != "1" ]; then
		echo "Skipping PHPUnit table setup because RTC_PROTOCOL_SERVER_FUZZ_INSTALL_TEST_TABLES=$install_test_tables."
		return
	fi

	phpunit_table_prefix="$(phpunit_table_prefix_for "$lane_table_prefix")"
	if ! printf '%s' "$phpunit_table_prefix" | grep -Eq '^[A-Za-z0-9_]+$'; then
		echo "Refusing unsafe PHPUnit table prefix: $phpunit_table_prefix" >&2
		exit 1
	fi

	drop_sql="SET FOREIGN_KEY_CHECKS=0; DROP TABLE IF EXISTS"
	for suffix in \
		commentmeta \
		comments \
		links \
		options \
		postmeta \
		posts \
		term_relationships \
		term_taxonomy \
		termmeta \
		terms \
		usermeta \
		users \
		blogs \
		blogmeta \
		registration_log \
		signups \
		site \
		sitemeta
	do
		drop_sql="$drop_sql \`${phpunit_table_prefix}${suffix}\`,"
	done
	drop_sql="${drop_sql%,}; SET FOREIGN_KEY_CHECKS=1;"

	echo "Ensuring PHPUnit tables for lane $lane with WORDPRESS_TABLE_PREFIX=$phpunit_table_prefix."
	(
		cd "$repo_dir"
		env "${wp_env_env[@]}" WP_ENV_PORT="$wp_env_port" "$wp_env_bin" --config "$wp_env_config" run \
			cli \
			wp \
			db \
			query \
			"$drop_sql"
		env "${wp_env_env[@]}" WP_ENV_PORT="$wp_env_port" "$wp_env_bin" --config "$wp_env_config" run \
			--env-cwd=wp-content/plugins/gutenberg \
			wordpress \
			env \
			"WORDPRESS_TABLE_PREFIX=$phpunit_table_prefix" \
			php \
			/wordpress-phpunit/includes/install.php \
			/wordpress-phpunit/wp-tests-config.php
	)
}

run_protocol_preflight() {
	local lane="$1"
	local lane_table_prefix="$2"
	local phpunit_table_prefix
	local preflight_dir="$repo_dir/artifacts/.rtc-protocol-server-fuzz-preflight/$run_id/lane-$lane"
	local preflight_output
	local preflight_rc

	phpunit_table_prefix="$(phpunit_table_prefix_for "$lane_table_prefix")"
	local preflight_command=(
		"$wp_env_bin"
		--config
		"$wp_env_config"
		run
		--env-cwd=wp-content/plugins/gutenberg
		wordpress
		env
		"RTC_PROTOCOL_SERVER_FUZZ_SEED_START=$preflight_seed"
		"RTC_PROTOCOL_SERVER_FUZZ_SEED_COUNT=1"
		"RTC_PROTOCOL_SERVER_FUZZ_CASE_COUNT=$preflight_case_count"
		"RTC_PROTOCOL_SERVER_FUZZ_TRACE_DIR=/var/www/html/wp-content/plugins/gutenberg/artifacts/.rtc-protocol-server-fuzz-preflight/$run_id/lane-$lane"
		"RTC_PROTOCOL_SERVER_FUZZ_SUMMARY_DIR=/var/www/html/wp-content/plugins/gutenberg/artifacts/.rtc-protocol-server-fuzz-preflight/$run_id/lane-$lane"
		"WORDPRESS_TABLE_PREFIX=$phpunit_table_prefix"
		vendor/bin/phpunit
		-c
		phpunit.xml.dist
		--filter
		'Tests_Collaboration_WpHttpPollingSyncServerProtocolFuzz::test_seeded_protocol_server_state_machine'
		phpunit/tests/collaboration/wpHttpPollingSyncServerProtocolFuzz.php
	)

	mkdir -p "$preflight_dir"
	echo "Running protocol/server preflight for lane $lane with WORDPRESS_TABLE_PREFIX=$phpunit_table_prefix."

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
		echo "Protocol/server preflight failed for lane $lane; refusing to start tmux fuzzing." >&2
		exit 1
	fi

	if printf '%s\n' "$preflight_output" | grep -Eiq "WordPress database error|Base table or view not found|doesn'?t exist"; then
		echo "Protocol/server preflight saw missing-table/database errors for lane $lane; refusing to start tmux fuzzing." >&2
		exit 1
	fi

	if ! grep -Eq '"ok"[[:space:]]*:[[:space:]]*true' "$preflight_dir/seed-$preflight_seed-summary.json" 2>/dev/null; then
		echo "Protocol/server preflight did not write a passing seed summary for lane $lane; refusing to start tmux fuzzing." >&2
		exit 1
	fi
}

if [ "$preflight" = "1" ]; then
	for lane in $(seq 0 $((lanes - 1))); do
		lane_table_prefix="$(lane_table_prefix_for "$lane")"
		ensure_protocol_phpunit_tables "$lane" "$lane_table_prefix"
		run_protocol_preflight "$lane" "$lane_table_prefix"
	done
else
	echo "Skipping protocol/server PHPUnit preflight because RTC_PROTOCOL_SERVER_FUZZ_PREFLIGHT=$preflight."
fi

mkdir -p "$output_dir"
if [ "$update_current_run_root" = "1" ]; then
	printf '%s\n' "$output_dir/runs/$run_id" > "$output_dir/current-run-root.txt"
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
	command="cd '$repo_dir' && ${tmux_env_prefix}WP_ENV_PORT='$wp_env_port' RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_HOME='$wp_env_home' RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_PORT='$wp_env_port' RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_BIN='$wp_env_bin' RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_CONFIG='$wp_env_config' RTC_PROTOCOL_SERVER_FUZZ_OUTPUT_DIR='$output_dir' RTC_PROTOCOL_SERVER_FUZZ_RUN_ID='$run_id' RTC_PROTOCOL_SERVER_FUZZ_START_SEED='$seed_start' RTC_PROTOCOL_SERVER_FUZZ_SEED_COUNT='$seed_count' RTC_PROTOCOL_SERVER_FUZZ_CASE_COUNT='$case_count' RTC_PROTOCOL_SERVER_FUZZ_SEED_TIMEOUT_MS='$seed_timeout_ms' RTC_PROTOCOL_SERVER_FUZZ_TABLE_PREFIX='$lane_table_prefix' RTC_PROTOCOL_SERVER_FUZZ_LANE='$lane' RTC_PROTOCOL_SERVER_FUZZ_LANE_COUNT='$lanes' RTC_PROTOCOL_SERVER_FUZZ_UPDATE_CURRENT_RUN_ROOT='$update_current_run_root' node bin/rtc-protocol-server-fuzz-runner.mjs"

	if [ "$lane" -eq 0 ]; then
		tmux new-session -d -s "$session" -n "$window" "$command"
	else
		tmux new-window -t "$session" -n "$window" "$command"
	fi
done

cat <<EOF
Started $lanes protocol/server fuzz lanes in tmux session '$session'.
Run root: $output_dir/runs/$run_id
Attach: tmux attach -t $session
EOF
