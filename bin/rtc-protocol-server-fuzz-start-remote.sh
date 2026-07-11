#!/usr/bin/env bash
set -euo pipefail

mode="${1:-start}"
case "$mode" in
	start|run-once|validate|status|stop)
		;;
	*)
		printf 'usage: %s [start|run-once|validate|status|stop]\n' "$0" >&2
		exit 2
		;;
esac

repo_dir="${RTC_PROTOCOL_SERVER_FUZZ_REPO_DIR:-$(pwd)}"
session="${RTC_PROTOCOL_SERVER_FUZZ_SESSION:-rtc-protocol-server-fuzz}"
lanes="${RTC_PROTOCOL_SERVER_FUZZ_LANES:-1}"
case_count="${RTC_PROTOCOL_SERVER_FUZZ_CASE_COUNT:-180}"
case_start="${RTC_PROTOCOL_SERVER_FUZZ_CASE_START:-0}"
seed_timeout_ms="${RTC_PROTOCOL_SERVER_FUZZ_SEED_TIMEOUT_MS:-300000}"
seed_count="${RTC_PROTOCOL_SERVER_FUZZ_SEED_COUNT:-1000000}"
if [ "$mode" = "run-once" ] && [ -z "${RTC_PROTOCOL_SERVER_FUZZ_SEED_COUNT:-}" ]; then
	seed_count=1
fi
seed_start="${RTC_PROTOCOL_SERVER_FUZZ_START_SEED:-${RTC_PROTOCOL_SERVER_FUZZ_SEED_START:-$(date -u +%s)}}"
max_consecutive_infra_failures="${RTC_PROTOCOL_SERVER_FUZZ_MAX_CONSECUTIVE_INFRA_FAILURES:-}"
run_id="${RTC_PROTOCOL_SERVER_FUZZ_RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
output_dir="${RTC_PROTOCOL_SERVER_FUZZ_OUTPUT_DIR:-/media/volume/danluu-fuzz-data/rtc-native-assert-protocol-20260516/protocol}"
global_admission="${RTC_GLOBAL_CPU_ADMISSION:-/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516/rtc-global-cpu-admission.sh}"
tmux_wrap="${TMUX_WRAP:-/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin}"

tmux_control() {
	if [ -x "$tmux_wrap/tmux" ]; then
		"$tmux_wrap/tmux" "$@"
	elif [ -x /usr/bin/tmux ]; then
		/usr/bin/tmux -L rtc-fuzz "$@"
	else
		tmux "$@"
	fi
}

if [ "$mode" = "status" ]; then
	tmux_control ls 2>/dev/null | grep -E "^${session}:" || true
	if [ -f "$output_dir/current-run-root.txt" ]; then
		printf 'current-run-root=%s\n' "$(sed -n '1p' "$output_dir/current-run-root.txt")"
	fi
	exit 0
fi

if [ "$mode" = "stop" ]; then
	tmux_control kill-session -t "$session" 2>/dev/null || true
	exit 0
fi

wp_env_port="${RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_PORT:-${WP_ENV_PORT:-}}"
wp_env_port_explicit=0
if [ -n "${RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_PORT:-}" ] || [ -n "${WP_ENV_PORT:-}" ]; then
	wp_env_port_explicit=1
fi
wp_env_home="${RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_HOME:-${WP_ENV_HOME:-}}"
wp_env_config_is_default=0
if [ -z "${RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_CONFIG:-}" ]; then
	wp_env_config_is_default=1
fi
wp_env_bin="${RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_BIN:-./node_modules/.bin/wp-env}"
wp_env_config="${RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_CONFIG:-.wp-env.test.json}"
wp_env_cwd="${RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_CWD:-wp-content/plugins/gutenberg}"
if [ -n "${RTC_PROTOCOL_SERVER_FUZZ_CONTAINER_REPO_DIR:-}" ]; then
	container_repo_dir="$RTC_PROTOCOL_SERVER_FUZZ_CONTAINER_REPO_DIR"
elif [ "${wp_env_cwd#/}" != "$wp_env_cwd" ]; then
	container_repo_dir="$wp_env_cwd"
else
	container_repo_dir="/var/www/html/$wp_env_cwd"
fi
auto_start_wp_env="${RTC_PROTOCOL_SERVER_FUZZ_AUTO_START_WP_ENV:-1}"
require_build="${RTC_PROTOCOL_SERVER_FUZZ_REQUIRE_BUILD:-auto}"
shared_gutenberg_build="${RTC_SHARED_GUTENBERG_BUILD:-/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/gutenberg/build}"
preflight="${RTC_PROTOCOL_SERVER_FUZZ_PREFLIGHT:-1}"
install_test_tables="${RTC_PROTOCOL_SERVER_FUZZ_INSTALL_TEST_TABLES:-1}"
preflight_case_count="${RTC_PROTOCOL_SERVER_FUZZ_PREFLIGHT_CASE_COUNT:-25}"
preflight_seed="${RTC_PROTOCOL_SERVER_FUZZ_PREFLIGHT_SEED:-1}"
preflight_timeout_seconds="${RTC_PROTOCOL_SERVER_FUZZ_PREFLIGHT_TIMEOUT_SECONDS:-180}"
safe_run_id="$(printf '%s' "$run_id" | tr -c 'A-Za-z0-9_' '_' | cut -c 1-24)"
safe_wp_env_id="$(printf '%s' "$run_id" | tr -c 'A-Za-z0-9_' '_' | cut -c 1-64)"
if [ -z "$wp_env_home" ]; then
	wp_env_home="$output_dir/wp-env/protocol-server-$safe_wp_env_id"
fi
if [ -z "$wp_env_port" ]; then
	wp_env_port="$((18000 + ($(printf '%s' "$safe_wp_env_id" | cksum | awk '{print $1}') % 2000)))"
fi
if [ "$wp_env_config_is_default" = "1" ]; then
	run_wp_env_config_dir="$output_dir/wp-env/configs"
	run_wp_env_config="$run_wp_env_config_dir/.wp-env.protocol-server-$safe_wp_env_id.json"
	mkdir -p "$run_wp_env_config_dir"
	cp "$repo_dir/.wp-env.test.json" "$run_wp_env_config"
	wp_env_config="$run_wp_env_config"
fi
update_current_run_root="${RTC_PROTOCOL_SERVER_FUZZ_UPDATE_CURRENT_RUN_ROOT:-}"
if [ -z "$update_current_run_root" ]; then
	if [ "$mode" = "start" ] && [ "$seed_count" -gt 1000 ]; then
		update_current_run_root=1
	else
		update_current_run_root=0
	fi
fi

mkdir -p "$tmux_wrap"
if [ ! -x "$tmux_wrap/tmux" ]; then
	cat > "$tmux_wrap/tmux" <<'SH'
#!/usr/bin/env bash
exec /usr/bin/tmux -L rtc-fuzz "$@"
SH
	chmod +x "$tmux_wrap/tmux"
fi
export PATH="$tmux_wrap:$PATH"

if ! command -v tmux >/dev/null 2>&1; then
	echo "tmux is required for the protocol/server fuzz launcher." >&2
	exit 1
fi

if [ "$mode" = "start" ] && tmux has-session -t "=${session}" 2>/dev/null; then
	echo "tmux session '$session' already exists; leaving it untouched." >&2
	echo "Use RTC_PROTOCOL_SERVER_FUZZ_SESSION=<new-name> to start another run." >&2
	exit 1
fi

if [ "$mode" != "validate" ] &&
	[ -x "$global_admission" ] &&
	! "$global_admission" allow protocol-server "$session"; then
	echo "Global CPU budget is not admitting protocol/server fuzzing now; leaving session stopped." >&2
	exit 0
fi

install_shared_build_artifact() {
	local rel_path="$1"
	local shared_rel_path="${rel_path#build/}"
	if { [ -L "$repo_dir/$rel_path" ] || [ ! -e "$repo_dir/$rel_path" ]; } && [ -e "$shared_gutenberg_build/$shared_rel_path" ]; then
		mkdir -p "$(dirname "$repo_dir/$rel_path")"
		rm -rf "$repo_dir/$rel_path"
		cp -a "$shared_gutenberg_build/$shared_rel_path" "$repo_dir/$rel_path"
	fi
}

install_shared_build_tree() {
	if [ -d "$shared_gutenberg_build" ]; then
		mkdir -p "$repo_dir/build"
		cp -a "$shared_gutenberg_build"/. "$repo_dir/build"/
	fi
}

if [ "$require_build" = "auto" ]; then
	require_build=0
	for required_build_file in \
		"build/build.php" \
		"build/styles.php" \
		"build/scripts/block-library/blocks-manifest.php" \
		"build/scripts/edit-widgets/blocks/blocks-manifest.php" \
		"build/scripts/widgets/blocks/blocks-manifest.php"
	do
		if [ ! -f "$repo_dir/$required_build_file" ]; then
			require_build=1
			break
		fi
	done
fi

if [ "$require_build" = "1" ]; then
	for shared_build_rel_path in "build/build.php" "build/styles.php" "build/scripts"; do
		if [ -L "$repo_dir/$shared_build_rel_path" ]; then
			rm -rf "$repo_dir/$shared_build_rel_path"
		fi
	done
	if [ ! -f "$repo_dir/build/constants.php" ]; then
		install_shared_build_tree
	fi
	install_shared_build_artifact "build/build.php"
	install_shared_build_artifact "build/styles.php"
	install_shared_build_artifact "build/scripts/block-library/blocks-manifest.php"
	install_shared_build_artifact "build/scripts/edit-widgets/blocks/blocks-manifest.php"
	install_shared_build_artifact "build/scripts/widgets/blocks/blocks-manifest.php"

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

port_is_listening() {
	local port="$1"
	if command -v ss >/dev/null 2>&1; then
		ss -H -ltn "sport = :$port" 2>/dev/null | grep -q .
		return $?
	fi
	if command -v lsof >/dev/null 2>&1; then
		lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
		return $?
	fi
	return 1
}

choose_free_auto_wp_env_port() {
	local initial_port="$wp_env_port"
	local attempts=0

	if [ "$wp_env_port_explicit" = "1" ] || [ -z "$wp_env_port" ]; then
		return
	fi

	while port_is_listening "$wp_env_port"; do
		attempts=$((attempts + 1))
		if [ "$attempts" -gt 200 ]; then
			echo "Auto-selected WP_ENV_PORT=$initial_port and the next $attempts ports are already in use." >&2
			echo "Set RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_PORT to a known free port." >&2
			exit 1
		fi
		wp_env_port=$((wp_env_port + 1))
	done

	if [ "$wp_env_port" != "$initial_port" ]; then
		echo "Auto-selected WP_ENV_PORT=$initial_port was already in use; using free WP_ENV_PORT=$wp_env_port."
	fi
}

build_wp_env_env() {
	wp_env_env=()
	if [ -n "$wp_env_home" ]; then
		wp_env_env+=( "WP_ENV_HOME=$wp_env_home" )
	fi
	if [ -n "$wp_env_port" ]; then
		wp_env_env+=( "WP_ENV_PORT=$wp_env_port" )
	fi
}

validate_protocol_server_harness_syntax() {
	(
		cd "$repo_dir"
		bash -n ./bin/rtc-protocol-server-fuzz-start-remote.sh
		node --check ./bin/rtc-protocol-server-fuzz-runner.mjs
		php -l ./phpunit/tests/collaboration/wpHttpPollingSyncServerProtocolFuzz.php
		php -l ./phpunit/tests/collaboration/fixtures/class-wp-sync-protocol-fuzz-model.php
		php -l ./phpunit/tests/collaboration/fixtures/class-wp-sync-protocol-fuzz-counts.php
	)
}

build_wp_env_env

if [ "$mode" = "validate" ]; then
	validate_protocol_server_harness_syntax
fi

set +e
wp_env_status_output="$(
	cd "$repo_dir" &&
		env "${wp_env_env[@]}" "$wp_env_bin" --config "$wp_env_config" status 2>&1
)"
wp_env_status_rc=$?
set -e

printf '%s\n' "$wp_env_status_output"

if [ "$wp_env_status_rc" -ne 0 ] || ! printf '%s\n' "$wp_env_status_output" | grep -q 'status: running'; then
	if [ "$auto_start_wp_env" != "1" ]; then
		echo "wp-env test environment is not running; set RTC_PROTOCOL_SERVER_FUZZ_AUTO_START_WP_ENV=1 or start it before launching." >&2
		exit 1
	fi

	choose_free_auto_wp_env_port
	build_wp_env_env

	if [ -n "$wp_env_port" ]; then
		echo "Starting wp-env test environment on WP_ENV_PORT=$wp_env_port."
	else
		echo "Starting wp-env test environment with the configured default port."
	fi
	(
		cd "$repo_dir"
		env "${wp_env_env[@]}" "$wp_env_bin" --config "$wp_env_config" start
	)
fi

if [ "$lanes" -gt 1 ] && [ "${RTC_PROTOCOL_SERVER_FUZZ_ALLOW_SHARED_WP_ENV_LANES:-0}" != "1" ]; then
	echo "Refusing to start $lanes lanes against one wp-env test database." >&2
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
	set +e
	drop_output="$(
		cd "$repo_dir" &&
			env "${wp_env_env[@]}" "$wp_env_bin" --config "$wp_env_config" run \
				cli \
				wp \
				db \
				query \
				"$drop_sql" 2>&1
	)"
	drop_rc=$?
	set -e
	printf '%s\n' "$drop_output"
	if [ "$drop_rc" -ne 0 ]; then
		if printf '%s\n' "$drop_output" | grep -Eiq 'service "cli" is not running|No such service|executable file not found'; then
			echo "wp-env CLI service is unavailable; continuing with the unique protocol/server table prefix and PHPUnit installer." >&2
		else
			echo "Failed to reset PHPUnit tables for lane $lane." >&2
			exit "$drop_rc"
		fi
	fi

	(
		cd "$repo_dir"
		env "${wp_env_env[@]}" "$wp_env_bin" --config "$wp_env_config" run \
			--env-cwd="$wp_env_cwd" \
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
		--env-cwd="$wp_env_cwd"
		wordpress
		env
		"RTC_PROTOCOL_SERVER_FUZZ_RUNNER=1"
		"RTC_PROTOCOL_SERVER_FUZZ_SEED_START=$preflight_seed"
		"RTC_PROTOCOL_SERVER_FUZZ_SEED_COUNT=1"
		"RTC_PROTOCOL_SERVER_FUZZ_CASE_COUNT=$preflight_case_count"
		"RTC_PROTOCOL_SERVER_FUZZ_TRACE_DIR=$container_repo_dir/artifacts/.rtc-protocol-server-fuzz-preflight/$run_id/lane-$lane"
		"RTC_PROTOCOL_SERVER_FUZZ_SUMMARY_DIR=$container_repo_dir/artifacts/.rtc-protocol-server-fuzz-preflight/$run_id/lane-$lane"
		"RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_CWD=$wp_env_cwd"
		"WORDPRESS_TABLE_PREFIX=$phpunit_table_prefix"
		vendor/bin/phpunit
		-c
		phpunit.xml.dist
		--filter
		'Tests_Collaboration_WpHttpPollingSyncServerProtocolFuzz::test_seeded_protocol_server_state_machine'
		phpunit/tests/collaboration/wpHttpPollingSyncServerProtocolFuzz.php
	)

	mkdir -p "$preflight_dir"
	rm -f "$preflight_dir/preflight.log" "$preflight_dir/seed-$preflight_seed-summary.json"
	echo "Running protocol/server preflight for lane $lane with WORDPRESS_TABLE_PREFIX=$phpunit_table_prefix."

	set +e
	(
		cd "$repo_dir" &&
			env "${wp_env_env[@]}" "${preflight_command[@]}"
	) > "$preflight_dir/preflight.log" 2>&1 &
	preflight_pid=$!
	preflight_deadline=$((SECONDS + preflight_timeout_seconds))
	preflight_rc=

	while kill -0 "$preflight_pid" 2>/dev/null; do
		if grep -Eq '"ok"[[:space:]]*:[[:space:]]*true' "$preflight_dir/seed-$preflight_seed-summary.json" 2>/dev/null; then
			kill "$preflight_pid" 2>/dev/null || true
			wait "$preflight_pid" 2>/dev/null
			preflight_rc=0
			break
		fi

		if [ "$SECONDS" -ge "$preflight_deadline" ]; then
			kill "$preflight_pid" 2>/dev/null || true
			wait "$preflight_pid" 2>/dev/null
			preflight_rc=124
			break
		fi

		sleep 2
	done

	if [ -z "$preflight_rc" ]; then
		wait "$preflight_pid"
		preflight_rc=$?
	fi
	preflight_output="$(cat "$preflight_dir/preflight.log" 2>/dev/null)"
	set -e

	printf '%s\n' "$preflight_output"

	if printf '%s\n' "$preflight_output" | grep -Eiq "WordPress database error|Base table or view not found|doesn'?t exist"; then
		echo "Protocol/server preflight saw missing-table/database errors for lane $lane; refusing to start tmux fuzzing." >&2
		exit 1
	fi

	if ! grep -Eq '"ok"[[:space:]]*:[[:space:]]*true' "$preflight_dir/seed-$preflight_seed-summary.json" 2>/dev/null; then
		if [ "$preflight_rc" -ne 0 ]; then
			echo "Protocol/server preflight failed for lane $lane; refusing to start tmux fuzzing." >&2
			exit 1
		fi

		echo "Protocol/server preflight did not write a passing seed summary for lane $lane; refusing to start tmux fuzzing." >&2
		exit 1
	fi

	if [ "$preflight_rc" -ne 0 ]; then
		echo "Protocol/server preflight wrote a passing summary for lane $lane but the wp-env wrapper returned rc=$preflight_rc; accepting the passing oracle summary." >&2
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

if [ "$mode" = "validate" ]; then
	echo "Validated protocol/server fuzz harness syntax and preflight."
	exit 0
fi

mkdir -p "$output_dir"
if [ "$update_current_run_root" = "1" ]; then
	printf '%s\n' "$output_dir/runs/$run_id" > "$output_dir/current-run-root.txt"
else
	echo "Leaving $output_dir/current-run-root.txt unchanged for bounded validation run_id=$run_id seed_count=$seed_count."
fi

if [ "$mode" = "run-once" ]; then
	runner_status=0
	for lane in $(seq 0 $((lanes - 1))); do
		lane_table_prefix="$(lane_table_prefix_for "$lane")"
		echo "Running one foreground protocol/server fuzz lane $lane with run_id=$run_id seed_start=$seed_start seed_count=$seed_count case_count=$case_count."
		set +e
		(
			cd "$repo_dir"
			env \
				WP_ENV_HOME="$wp_env_home" \
				WP_ENV_PORT="$wp_env_port" \
				RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_HOME="$wp_env_home" \
				RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_PORT="$wp_env_port" \
				RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_BIN="$wp_env_bin" \
				RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_CONFIG="$wp_env_config" \
				RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_CWD="$wp_env_cwd" \
				RTC_PROTOCOL_SERVER_FUZZ_CONTAINER_REPO_DIR="$container_repo_dir" \
				RTC_PROTOCOL_SERVER_FUZZ_OUTPUT_DIR="$output_dir" \
				RTC_PROTOCOL_SERVER_FUZZ_RUN_ID="$run_id" \
				RTC_PROTOCOL_SERVER_FUZZ_START_SEED="$seed_start" \
				RTC_PROTOCOL_SERVER_FUZZ_SEED_COUNT="$seed_count" \
				RTC_PROTOCOL_SERVER_FUZZ_CASE_COUNT="$case_count" \
				RTC_PROTOCOL_SERVER_FUZZ_CASE_START="$case_start" \
				RTC_PROTOCOL_SERVER_FUZZ_SEED_TIMEOUT_MS="$seed_timeout_ms" \
				RTC_PROTOCOL_SERVER_FUZZ_MAX_CONSECUTIVE_INFRA_FAILURES="$max_consecutive_infra_failures" \
				RTC_PROTOCOL_SERVER_FUZZ_TABLE_PREFIX="$lane_table_prefix" \
				RTC_PROTOCOL_SERVER_FUZZ_LANE="$lane" \
				RTC_PROTOCOL_SERVER_FUZZ_LANE_COUNT="$lanes" \
				RTC_PROTOCOL_SERVER_FUZZ_UPDATE_CURRENT_RUN_ROOT="$update_current_run_root" \
				node bin/rtc-protocol-server-fuzz-runner.mjs
		)
		lane_status=$?
		set -e
		if [ "$lane_status" -ne 0 ]; then
			runner_status="$lane_status"
		fi
	done
	echo "Completed foreground protocol/server fuzz run root: $output_dir/runs/$run_id"
	exit "$runner_status"
fi

for lane in $(seq 0 $((lanes - 1))); do
	window="lane-$lane"
	lane_table_prefix="$(lane_table_prefix_for "$lane")"
	tmux_env_prefix=""
	if [ -n "$wp_env_home" ]; then
		tmux_env_prefix="WP_ENV_HOME='$wp_env_home' "
	fi
	if [ -n "$wp_env_port" ]; then
		tmux_env_prefix="${tmux_env_prefix}WP_ENV_PORT='$wp_env_port' "
	fi
	command="cd '$repo_dir' && ${tmux_env_prefix}RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_HOME='$wp_env_home' RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_PORT='$wp_env_port' RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_BIN='$wp_env_bin' RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_CONFIG='$wp_env_config' RTC_PROTOCOL_SERVER_FUZZ_WP_ENV_CWD='$wp_env_cwd' RTC_PROTOCOL_SERVER_FUZZ_CONTAINER_REPO_DIR='$container_repo_dir' RTC_PROTOCOL_SERVER_FUZZ_OUTPUT_DIR='$output_dir' RTC_PROTOCOL_SERVER_FUZZ_RUN_ID='$run_id' RTC_PROTOCOL_SERVER_FUZZ_START_SEED='$seed_start' RTC_PROTOCOL_SERVER_FUZZ_SEED_COUNT='$seed_count' RTC_PROTOCOL_SERVER_FUZZ_CASE_COUNT='$case_count' RTC_PROTOCOL_SERVER_FUZZ_CASE_START='$case_start' RTC_PROTOCOL_SERVER_FUZZ_SEED_TIMEOUT_MS='$seed_timeout_ms' RTC_PROTOCOL_SERVER_FUZZ_MAX_CONSECUTIVE_INFRA_FAILURES='$max_consecutive_infra_failures' RTC_PROTOCOL_SERVER_FUZZ_TABLE_PREFIX='$lane_table_prefix' RTC_PROTOCOL_SERVER_FUZZ_LANE='$lane' RTC_PROTOCOL_SERVER_FUZZ_LANE_COUNT='$lanes' RTC_PROTOCOL_SERVER_FUZZ_UPDATE_CURRENT_RUN_ROOT='$update_current_run_root' node bin/rtc-protocol-server-fuzz-runner.mjs; runner_rc=\$?; printf 'protocol/server runner exited rc=%s at %s\n' \"\$runner_rc\" \"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\"; exit \"\$runner_rc\""

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
