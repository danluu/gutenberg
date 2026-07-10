#!/usr/bin/env bash
set -euo pipefail

NODE_BIN=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin
CODEX_BIN_DIR=${HOME:-/home/exouser}/.local/bin
REPO=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
CANDIDATE_REPO=/media/volume/danluu-fuzz-data/rtc-all-merged-fuzz-20260526T195420Z/repo
CANDIDATE_REF=${RTC_COVERAGE_CANDIDATE_REF:-refs/heads/js2/all-merged-rebased-20260701}
BASE=/media/volume/danluu-fuzz-data/rtc-jetstream-guard-20260515
COVERAGE_BASE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515
COVERAGE_START_LOCK=$COVERAGE_BASE/start-v2.lock
FOCUSED_BASE=/media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515
FOCUSED_SHARDS_BASE=$FOCUSED_BASE
STRICT_EXPANSION_BASE=/media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515
GAP_BOOSTER_BASE=/media/volume/danluu-fuzz-data/rtc-gap-booster-20260515
LOWER_LEVEL_BASE=/media/volume/danluu-fuzz-data/rtc-lower-level-fuzz-20260516
CG_LOWER_LEVEL_B64_HOLD_FILE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-20260516/holds/coverage-guided-lower-level-rich-text-crdt.hold
CG_LOWER_LEVEL_B64_GROUP=coverage-guided-lower-level-rich-text-crdt
CG_LOWER_LEVEL_B64_REPLACEMENT_GROUP=coverage-guided-lower-level-rich-text-multiblock
CG_LOWER_LEVEL_B64_REPLACEMENT_SESSION=rtc-coverage-guided-lower-level-rich-text-multiblock
CG_LOWER_LEVEL_B64_REPLACEMENT_HOLD_FILE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-rich-text-multiblock-20260518/holds/coverage-guided-lower-level-rich-text-multiblock.hold
CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_GROUP=coverage-guided-lower-level-table-query-array-crdt
CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_SESSION=rtc-coverage-guided-lower-level-table-query-array-crdt
CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_HOLD_FILE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-query-array-20260517/holds/coverage-guided-lower-level-table-query-array-crdt.hold
CG_LOWER_LEVEL_HTTP_POLLING_GROUP=coverage-guided-lower-level-http-polling-manager
CG_LOWER_LEVEL_HTTP_POLLING_SESSION=rtc-coverage-guided-lower-level-http-polling-manager
CG_LOWER_LEVEL_HTTP_POLLING_HOLD_FILE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-http-polling-manager-20260520/holds/coverage-guided-lower-level-http-polling-manager.hold
CG_LOWER_LEVEL_BLOCK_PARSER_GROUP=coverage-guided-lower-level-block-parser-serialization
CG_LOWER_LEVEL_BLOCK_PARSER_SESSION=rtc-coverage-guided-lower-level-block-parser-serialization
CG_LOWER_LEVEL_BLOCK_PARSER_HOLD_FILE=/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-block-parser-serialization-20260519/holds/coverage-guided-lower-level-block-parser-serialization.hold
LOWER_LEVEL_HTTP_CANARY_STATIC_INPUTS_JSON=$(cat <<'JSON'
[
  "http-polling-canary-restore-state-storage-http-stale-since-token-replay-rooms-8-updates-5-peers-8-steps-12-retry-now-visibility-disconnect-reconnect",
  "http-polling-canary-large-http-lifecycle-server-update-union-rooms-12-updates-6-peers-16-steps-14-retry-now-visibility-disconnect-reconnect",
  "http-polling-canary-title-reload-http-server-update-union-rooms-6-updates-4-peers-6-steps-12-retry-now-visibility-disconnect-reconnect",
  "http-polling-canary-existing-post-crdt-http-server-update-union-rooms-8-updates-5-peers-8-steps-12-retry-now-visibility-disconnect-reconnect",
  "http-polling-canary-provider-persisted-crdt-large-post-server-update-union-rooms-12-updates-6-peers-16-steps-14-retry-now-visibility-disconnect-reconnect",
  "http-polling-canary-large-http-readiness-server-update-union-rooms-12-updates-6-peers-16-steps-14-retry-now-visibility-disconnect-reconnect",
  "http-polling-stale-since-token-replay-rooms-12-updates-6-peers-16-steps-14-disconnect-reconnect",
  "http-polling-server-update-union-rooms-10-updates-6-peers-12-steps-14-visibility-retry-now",
  "http-polling-pagehide-disconnect-rooms-18-updates-6-peers-16-steps-14-retry-now-visibility-disconnect-reconnect",
  "http-polling-unregister-rejoin-churn",
  "visibility-retry-churn",
  "rooms-16-updates-5-peers-8"
]
JSON
)
LOWER_LEVEL_HTTP_CANARY_STATIC_INPUTS_B64=$(printf '%s' "$LOWER_LEVEL_HTTP_CANARY_STATIC_INPUTS_JSON" | base64 | tr -d '\n')
LOWER_LEVEL_HTTP_CANARY_MAX_EXECUTIONS=${RTC_GUARD_LOWER_LEVEL_HTTP_CANARY_MAX_EXECUTIONS:-12}
LOWER_LEVEL_BOUNDED_SATISFY_SECONDS=${RTC_GUARD_LOWER_LEVEL_BOUNDED_SATISFY_SECONDS:-3600}
LEVEL_MIX_BASE=/media/volume/danluu-fuzz-data/rtc-fuzz-level-mix-persona-loop-20260516
NATIVE_ASSERT_BASE=/media/volume/danluu-fuzz-data/rtc-native-assert-protocol-20260516
STRUCTURAL_BASE=/media/volume/danluu-fuzz-data/rtc-structural-watchdog-20260518
STRUCTURAL_HOLD_FILE=$BASE/disable-structural-watchdog
DISK_MAINTENANCE_HOLD_FILE=$BASE/disable-disk-maintenance
RESOURCE_BASE=/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516
DOCKER_NETWORK_REAPER=$REPO/bin/rtc-docker-network-reaper-remote.mjs
DOCKER_NETWORK_REAPER_TRIGGER_COUNT=${RTC_DOCKER_NETWORK_REAPER_TRIGGER_COUNT:-24}
OPTIONAL_STRICT_ENABLED_NAMES=${RTC_GUARD_OPTIONAL_STRICT_ENABLED_NAMES:-ws-collaboration-ui-signals,http-same-user-stale-draft,http-large-lifecycle}
OPTIONAL_FOCUSED_ENABLED_NAMES=${RTC_GUARD_OPTIONAL_FOCUSED_ENABLED_NAMES:-rich-text-b,auth-locks-a,existing-post-crdt-http}
PR_PROGRESS_BASE=/media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518
DEFERRED_BASE=/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516
FINALIZATION_BASE=/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516
GLOBAL_ADMISSION=$RESOURCE_BASE/rtc-global-cpu-admission.sh
TMUX_WRAP=/media/volume/danluu-fuzz-data/rtc-tmux-core-wrapper/bin
LOG_DIR=$BASE/logs
PID_FILE=$BASE/guard.pid
LOCK_FILE=${RTC_JETSTREAM_GUARD_LOCK_FILE:-$BASE/guard-v2.lock}
HARNESS_UPDATE_GRACE_SECONDS=${RTC_GUARD_HARNESS_UPDATE_GRACE_SECONDS:-180}
NOVELTY_POLICY_CHECK=$REPO/bin/rtc-browser-fuzz-novelty-policy-check.mjs
EVENTS=$LOG_DIR/restart-events.tsv
TMUX_SERVER_PID_FILE=$BASE/rtc-fuzz-server.pid
TMUX_SERVER_EVENTS=$LOG_DIR/tmux-server-events.tsv
ENABLE_DUPLICATE_NOISE_REVIEW=${RTC_JETSTREAM_ENABLE_DUPLICATE_NOISE_REVIEW:-0}
ENABLE_FOCUSED_GAP_CODEX=${RTC_JETSTREAM_ENABLE_FOCUSED_GAP_CODEX:-0}
ENABLE_LEVEL_MIX_REVIEW=${RTC_JETSTREAM_ENABLE_LEVEL_MIX_REVIEW:-0}
ENABLE_NATIVE_PROTOCOL_REVIEW=${RTC_JETSTREAM_ENABLE_NATIVE_PROTOCOL_REVIEW:-0}
ENABLE_ASSERT_REVIEW=${RTC_JETSTREAM_ENABLE_ASSERT_REVIEW:-0}
ENABLE_PR_PROGRESS_PERSONAS=${RTC_JETSTREAM_ENABLE_PR_PROGRESS_PERSONAS:-0}
ENABLE_GUARD_CODEX=${RTC_JETSTREAM_ENABLE_GUARD_CODEX:-0}
MAX_CODEX_WORKERS=${RTC_JETSTREAM_MAX_CODEX_WORKERS:-8}
CODEX_EXPECTED_MODEL=${RTC_JETSTREAM_CODEX_EXPECTED_MODEL:-gpt-5.6-sol}
CODEX_MINIMUM_VERSION=${RTC_JETSTREAM_CODEX_MINIMUM_VERSION:-0.144.1}
CODEX_MODEL_POLICY_REPORT=$BASE/current-codex-model-policy.tsv
CODEX_MODEL_POLICY_STATE=$BASE/current-codex-model-policy.state

mkdir -p "$LOG_DIR"

ensure_tmux_wrapper() {
	local wrapper="$TMUX_WRAP/tmux"
	local tmp
	mkdir -p "$TMUX_WRAP"
	tmp="$(mktemp "$TMUX_WRAP/tmux.XXXXXX")"
	cat > "$tmp" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
socket=${RTC_TMUX_SOCKET:-rtc-fuzz}
case "${1:-}" in
	capture-pane)
		if [ "$socket" = rtc-fuzz ]; then
			printf 'capture-pane is disabled on the RTC core tmux socket\n' >&2
			exit 1
		fi
		exec flock -w 30 "/tmp/rtc-tmux-${UID}-${socket}.client.lock" /usr/bin/tmux -L "$socket" "$@"
		;;
	display-message|has-session|list-*|show-*)
		exec flock -w 30 "/tmp/rtc-tmux-${UID}-${socket}.client.lock" /usr/bin/tmux -L "$socket" "$@"
		;;
esac
exec /usr/bin/tmux -L "$socket" "$@"
SH
	chmod +x "$tmp"
	if [ -f "$wrapper" ] && cmp -s "$tmp" "$wrapper"; then
		rm -f "$tmp"
	else
		mv "$tmp" "$wrapper"
	fi
}

ensure_tmux_wrapper
export PATH="$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:$PATH"

log() {
	printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$LOG_DIR/guard.log"
}

has_session() {
	tmux list-sessions -F '#S' 2>/dev/null | grep -Fxq "$1"
}

pr_progress_controller_runtime_healthy() {
	local pid args cadence
	cmp -s "$REPO/bin/rtc-pr-progress-controller-remote.sh" "$PR_PROGRESS_BASE/rtc-pr-progress-controller.sh" || return 1
	pid=$(tmux list-panes -t rtc-pr-progress-controller-loop -F '#{pane_pid}' 2>/dev/null | sed -n '1p')
	[ -n "$pid" ] || return 1
	args=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)
	case "$args" in
		*"$PR_PROGRESS_BASE/rtc-pr-progress-controller.sh"*' run'*) ;;
		*) return 1 ;;
	esac
	if [ "$ENABLE_PR_PROGRESS_PERSONAS" != "1" ]; then
		cadence=$(tr '\0' '\n' < "/proc/$pid/environ" 2>/dev/null | sed -n 's/^RTC_PR_PROGRESS_PERSONA_EVERY_CYCLES=//p' | sed -n '1p')
		[ "$cadence" = "0" ] || return 1
	fi
	return 0
}

active_codex_worker_count() {
	pgrep -x codex 2>/dev/null | awk 'END { print NR + 0 }'
}

version_at_least() {
	local actual=$1 minimum=$2
	[ "$(printf '%s\n%s\n' "$minimum" "$actual" | sort -V | sed -n '1p')" = "$minimum" ]
}

audit_codex_model_policy() {
	local tmp=$CODEX_MODEL_POLICY_REPORT.$$.tmp
	local cli_version status=healthy drift=0 file pid model effort cwd session previous_state current_state
	local files=(
		"$REPO/bin/rtc-browser-fuzz-analysis-tier.mjs"
		"$REPO/bin/rtc-browser-fuzz-deep-analysis-tier.mjs"
		"$REPO/bin/rtc-browser-fuzz-live-analysis-monitor.mjs"
		"$REPO/bin/rtc-browser-fuzz-novelty-monitor.mjs"
		"$REPO/bin/rtc-browser-fuzz-runner.mjs"
		"$REPO/bin/rtc-browser-fuzz-triage-watcher.mjs"
		"$REPO/bin/rtc-coverage-gap-closure-start-remote.sh"
		"$REPO/bin/rtc-critical-path-pr-executor-loop-remote.sh"
		"$REPO/bin/rtc-deferred-work-promotion-runtime-remote.sh"
		"$REPO/bin/rtc-duplicate-noise-persona-loop-remote.sh"
		"$REPO/bin/rtc-focused-shards-gap-codex-loop-remote.sh"
		"$REPO/bin/rtc-fuzz-level-mix-persona-loop-remote.sh"
		"$REPO/bin/rtc-fuzz-only-asserts-loop-remote.sh"
		"$REPO/bin/rtc-jetstream-guard-remote.sh"
		"$REPO/bin/rtc-native-assert-protocol-work-start-remote.sh"
		"$REPO/bin/rtc-pr-finalization-loop-remote.sh"
		"$REPO/bin/rtc-pr-progress-controller-remote.sh"
		"$REPO/bin/rtc-pr-split-review-loop-remote.sh"
		"$REPO/bin/rtc-productive-analysis-loop-remote.sh"
		"$REPO/bin/rtc-structural-issue-watchdog-remote.sh"
		"$REPO/bin/rtc-trend-run-codex-refresh.sh"
	)
	printf 'kind\tid\tmodel\treasoning_effort\tstatus\tdetail\n' > "$tmp"

	cli_version=$("$CODEX_BIN_DIR/codex" --version 2>/dev/null | awk '{ print $2; exit }')
	status=healthy
	if [ -z "$cli_version" ] || ! version_at_least "$cli_version" "$CODEX_MINIMUM_VERSION"; then
		status=drift
		drift=$(( drift + 1 ))
	fi
	printf 'cli\t%s\t%s\t\t%s\tminimum=%s\n' "$CODEX_BIN_DIR/codex" "$cli_version" "$status" "$CODEX_MINIMUM_VERSION" >> "$tmp"

	for file in "${files[@]}"; do
		[ -f "$file" ] || continue
		if rg -q 'gpt-5\.[0-5]([^-0-9]|$)' "$file"; then
			printf 'source\t%s\t\t\tdrift\tcontains pre-5.6 model reference\n' "${file##*/}" >> "$tmp"
			drift=$(( drift + 1 ))
		fi
	done

	while IFS= read -r pid; do
		[ -r "/proc/$pid/cmdline" ] || continue
		model=$(tr '\0' '\n' < "/proc/$pid/cmdline" | awk 'previous == "-m" || previous == "--model" { print; exit } { previous = $0 }')
		[ -n "$model" ] || continue
		effort=$(tr '\0' '\n' < "/proc/$pid/cmdline" | sed -n 's/^model_reasoning_effort=//p' | sed -n '1p' | tr -d '"')
		cwd=$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)
		session=$(tmux_session_owning_pid "$pid" || true)
		status=healthy
		if [ "$model" != "$CODEX_EXPECTED_MODEL" ]; then
			status=drift
			drift=$(( drift + 1 ))
		fi
		printf 'worker\t%s\t%s\t%s\t%s\tsession=%s cwd=%s\n' "$pid" "$model" "${effort:-default}" "$status" "${session:-none}" "${cwd:-unknown}" >> "$tmp"
	done < <(pgrep -x codex 2>/dev/null || true)

	mv "$tmp" "$CODEX_MODEL_POLICY_REPORT"
	current_state=healthy
	[ "$drift" -eq 0 ] || current_state="drift:$drift"
	previous_state=$(cat "$CODEX_MODEL_POLICY_STATE" 2>/dev/null || true)
	printf '%s\n' "$current_state" > "$CODEX_MODEL_POLICY_STATE"
	if [ "$current_state" != "$previous_state" ]; then
		log "Codex model policy state=$current_state expected_model=$CODEX_EXPECTED_MODEL report=$CODEX_MODEL_POLICY_REPORT"
	fi
}

optional_analysis_admission_allows() {
	local workers limit=${RTC_GUARD_OPTIONAL_ANALYSIS_START_MAX_WORKERS:-$(( MAX_CODEX_WORKERS - 4 ))}
	workers=$(active_codex_worker_count)
	[ "$limit" -ge 0 ] || limit=0
	if [ "$workers" -ge "$limit" ]; then
		log "optional analysis admission deferred workers=$workers start_limit=$limit cap=$MAX_CODEX_WORKERS"
		return 1
	fi
	return 0
}

tmux_session_owning_pid() {
	local target=$1 session pane ancestor parent
	while IFS=$'\t' read -r session pane; do
		[ -n "$session" ] && [[ "$pane" =~ ^[0-9]+$ ]] || continue
		ancestor=$target
		while [[ "$ancestor" =~ ^[0-9]+$ ]] && [ "$ancestor" -gt 1 ]; do
			[ "$ancestor" = "$pane" ] && {
				printf '%s\n' "$session"
				return 0
			}
			parent=$(awk '/^PPid:/ { print $2; exit }' "/proc/$ancestor/status" 2>/dev/null || true)
			[ -n "$parent" ] && [ "$parent" != "$ancestor" ] || break
			ancestor=$parent
		done
	done < <(tmux list-panes -a -F $'#{session_name}\t#{pane_pid}' 2>/dev/null || true)
	return 1
}

trim_optional_live_analysis_codex() {
	local workers pid cwd age session path
	workers=$(pgrep -x codex 2>/dev/null | awk 'END { print NR + 0 }')
	[ "$workers" -gt "$MAX_CODEX_WORKERS" ] || return 0
	for session in rtc-focused-shards-analysis rtc-fuzz-strict-expansion-analysis rtc-gap-booster-analysis; do
		if has_session "$session"; then
			log "pausing optional analysis launcher over global cap session=$session workers=$workers cap=$MAX_CODEX_WORKERS"
			tmux kill-session -t "$session" 2>/dev/null || true
		fi
	done
	while IFS=$'\t' read -r session path; do
		case "$path" in
			"$STRICT_EXPANSION_BASE"/repos-*/*|"$FOCUSED_SHARDS_BASE"/repos-*/*|"$GAP_BOOSTER_BASE"/repos-*/*)
				case "$session" in
					rtc-focused-analysis-*|rtc-strict-analysis-*|rtc-gap-analysis-*|rtc-analysis-live-*|rtc-analysis-deep-*)
						log "stopping optional analysis job session over global cap session=$session path=$path workers=$workers cap=$MAX_CODEX_WORKERS"
						tmux kill-session -t "$session" 2>/dev/null || true
						;;
				esac
				;;
		esac
	done < <(tmux list-panes -a -F $'#{session_name}\t#{pane_current_path}' 2>/dev/null || true)
	while read -r age pid; do
		[ -n "$pid" ] || continue
		cwd=$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)
		case "$cwd" in
			"$COVERAGE_BASE"/run-*/repos/*|\
			"$STRICT_EXPANSION_BASE"/repos-*/*|\
			"$FOCUSED_SHARDS_BASE"/repos-*/*|\
			"$GAP_BOOSTER_BASE"/repos-*/*)
				session=$(tmux_session_owning_pid "$pid" || true)
				case "$session" in
					rtc-focused-analysis-*|rtc-strict-analysis-*|rtc-gap-analysis-*|rtc-analysis-live-*|rtc-analysis-deep-*)
						log "stopping optional analysis session over global cap session=$session pid=$pid cwd=$cwd age=${age}s workers=$workers cap=$MAX_CODEX_WORKERS"
						tmux kill-session -t "$session" 2>/dev/null || true
						;;
					*)
						log "stopping optional live-analysis Codex over global cap pid=$pid cwd=$cwd age=${age}s workers=$workers cap=$MAX_CODEX_WORKERS"
						kill -TERM "$pid" 2>/dev/null || true
						;;
				esac
				workers=$(( workers - 1 ))
				[ "$workers" -le "$MAX_CODEX_WORKERS" ] && break
				;;
		esac
	done < <(
		ps -C codex -o etimes=,pid= 2>/dev/null |
			awk '{ print $1, $2 }' |
			sort -n
	)
	return 0
}

stop_noncompliant_optional_analysis_codex() {
	local pid model cwd session
	while IFS= read -r pid; do
		[ -r "/proc/$pid/cmdline" ] || continue
		model=$(tr '\0' '\n' < "/proc/$pid/cmdline" | awk 'previous == "-m" || previous == "--model" { print; exit } { previous = $0 }')
		[ -n "$model" ] && [ "$model" != "$CODEX_EXPECTED_MODEL" ] || continue
		cwd=$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)
		case "$cwd" in
			"$COVERAGE_BASE"/run-*/repos/*|\
			"$STRICT_EXPANSION_BASE"/repos-*/*|\
			"$FOCUSED_SHARDS_BASE"/repos-*/*|\
			"$GAP_BOOSTER_BASE"/repos-*/*)
				session=$(
					tmux list-panes -a -F $'#{session_name}\t#{pane_current_path}' 2>/dev/null |
						awk -F '\t' -v cwd="$cwd" '
							$2 == cwd && $1 ~ /^rtc-(focused|strict|gap)-analysis-/ { print $1; exit }
						'
				)
				if [ -n "$session" ]; then
					log "stopping noncompliant optional analysis session=$session pid=$pid model=$model expected=$CODEX_EXPECTED_MODEL cwd=$cwd"
					tmux kill-session -t "$session" 2>/dev/null || true
				else
					log "stopping noncompliant optional analysis worker pid=$pid model=$model expected=$CODEX_EXPECTED_MODEL cwd=$cwd"
					kill -TERM "$pid" 2>/dev/null || true
				fi
				;;
		esac
	done < <(pgrep -x codex 2>/dev/null || true)
}

stop_sessions_matching() {
	local pattern=$1 session
	while IFS= read -r session; do
		[ -n "$session" ] || continue
		log "stopping disabled optional analysis session=$session"
		tmux kill-session -t "$session" 2>/dev/null || true
	done < <(tmux list-sessions -F '#S' 2>/dev/null | awk -v pattern="$pattern" '$0 ~ pattern { print }')
}

stop_disabled_orphan_codex() {
	local pid stdin_path
	for pid in $(pgrep -f 'codex .*exec|/codex .*exec|codex -a .*exec' 2>/dev/null || true); do
		stdin_path=$(readlink -f "/proc/$pid/fd/0" 2>/dev/null || true)
		case "$stdin_path" in
			*/rtc-fuzz-level-mix-persona-loop-20260516/*)
				[ "$ENABLE_LEVEL_MIX_REVIEW" != "1" ] || continue
				;;
			*/rtc-native-assert-protocol-20260516/*)
				[ "$ENABLE_NATIVE_PROTOCOL_REVIEW" != "1" ] || continue
				;;
			*/rtc-fuzz-only-asserts-20260515/*)
				[ "$ENABLE_ASSERT_REVIEW" != "1" ] || continue
				;;
			*/rtc-pr-progress-controller-20260518/persona-runs/*)
				[ "$ENABLE_PR_PROGRESS_PERSONAS" != "1" ] || continue
				;;
			*/rtc-jetstream-guard-20260515/logs/rtc-guard-codex-*.prompt.md)
				[ "$ENABLE_GUARD_CODEX" != "1" ] || continue
				;;
			*)
				continue
				;;
		esac
		log "stopping orphaned disabled optional analysis process pid=$pid stdin=$stdin_path"
		kill -TERM "$pid" 2>/dev/null || true
	done
}

stop_disabled_analysis_loops() {
	if [ "$ENABLE_DUPLICATE_NOISE_REVIEW" != "1" ]; then
		stop_sessions_matching '^rtc-duplicate-noise-persona-loop$|^rtc-dup-'
	fi
	if [ "$ENABLE_FOCUSED_GAP_CODEX" != "1" ]; then
		stop_sessions_matching '^rtc-focused-shards-gap-codex-loop$|^rtc-focused-gap-codex-'
	fi
	if [ "$ENABLE_LEVEL_MIX_REVIEW" != "1" ]; then
		stop_sessions_matching '^rtc-fuzz-level-mix-persona-loop(-watchdog)?$|^rtc-level-mix-'
	fi
	if [ "$ENABLE_NATIVE_PROTOCOL_REVIEW" != "1" ]; then
		stop_sessions_matching '^rtc-native-harness-persona-loop$|^rtc-native-(persona|synthesis|action)-|^rtc-protocol-server-persona-loop$|^rtc-protocol-(persona|synthesis|action)-'
	fi
	if [ "$ENABLE_ASSERT_REVIEW" != "1" ]; then
		stop_sessions_matching '^rtc-fuzz-only-asserts-loop$|^rtc-fuzz-asserts-'
	fi
	if [ "$ENABLE_PR_PROGRESS_PERSONAS" != "1" ]; then
		stop_sessions_matching '^rtc-pr-progress-persona-|^rtc-pr-progress-synthesis-'
	fi
	if [ "$ENABLE_GUARD_CODEX" != "1" ]; then
		stop_sessions_matching '^rtc-guard-codex-'
	fi
	stop_disabled_orphan_codex
}

check_tmux_server_generation() {
	local current previous now
	current=$(tmux display-message -p '#{pid}' 2>/dev/null || true)
	previous=$(sed -n '1p' "$TMUX_SERVER_PID_FILE" 2>/dev/null || true)
	now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
	if [ -z "$current" ]; then
		if [ "$previous" != "MISSING" ]; then
			printf '%s\tmissing\t%s\n' "$now" "${previous:-unknown}" >> "$TMUX_SERVER_EVENTS"
			log "core tmux server missing previous_pid=${previous:-unknown}; restoring required services"
			printf 'MISSING\n' > "$TMUX_SERVER_PID_FILE"
		fi
		return 0
	fi
	if [ -n "$previous" ] && [ "$previous" != "MISSING" ] && [ "$previous" != "$current" ]; then
		printf '%s\treplaced\t%s\t%s\n' "$now" "$previous" "$current" >> "$TMUX_SERVER_EVENTS"
		log "core tmux server generation changed previous_pid=$previous current_pid=$current; restoring required services"
	fi
	printf '%s\n' "$current" > "$TMUX_SERVER_PID_FILE"
}

has_recent_bounded_lower_level_output() {
	local pointer root status_path status_mtime now age
	pointer="$LOWER_LEVEL_BASE/last-bounded-run-root.txt"
	[ -s "$pointer" ] || return 1
	read -r root < "$pointer" || return 1
	case "$root" in
		"$LOWER_LEVEL_BASE"/runs/*) ;;
		*) return 1 ;;
	esac
	status_path="$root/status.tsv"
	[ -f "$status_path" ] || return 1
	if ! grep -q $'\tcompleted\t' "$status_path"; then
		return 1
	fi
	status_mtime=$(stat -c %Y "$status_path" 2>/dev/null || printf '0')
	now=$(date -u +%s)
	age=$(( now - status_mtime ))
	[ "$age" -ge 0 ] && [ "$age" -lt "$LOWER_LEVEL_BOUNDED_SATISFY_SECONDS" ]
}

has_lower_level_session() {
	tmux list-sessions -F '#S' 2>/dev/null | grep -Eq '^rtc-lower-level-fuzz-loop($|-)' ||
		has_recent_bounded_lower_level_output
}

coverage_guided_lower_level_group_session_exists() {
	local session=$1
	local group=$2
	local legacy_session=rtc-coverage-guided-lower-level

	if has_session "$session"; then
		return 0
	fi
	if ! has_session "$legacy_session"; then
		return 1
	fi

	tmux list-panes -t "$legacy_session" -F '#{pane_start_command}' 2>/dev/null |
		awk -v group="$group" \
			'index($0, "RTC_CG_LOWER_LEVEL_GROUP") && index($0, group) { found = 1 } END { exit ! found }'
}

coverage_guided_lower_level_group_session_or_hold_exists() {
	local session=$1
	local group=$2
	local hold_file=$3

	coverage_guided_lower_level_group_session_exists "$session" "$group" ||
		[ -f "$hold_file" ]
}

resource_autoscaler_script_pids() {
	ps -eo pid=,args= | awk '
		index($0, "/tmp/start_rtc_resource_autoscaler.sh") ||
		index($0, "/rtc-resource-autoscaler-20260516/rtc-resource-autoscaler.sh") {
			print $1
		}
	'
}

stop_unsupervised_resource_autoscaler() {
	local pids pid waited

	pids="$(resource_autoscaler_script_pids)"
	[ -n "$pids" ] || return 0

	for pid in $pids; do
		log "stopping unsupervised resource autoscaler pid=$pid"
		kill "$pid" 2>/dev/null || true
	done

	waited=0
	while [ "$waited" -lt 10 ]; do
		pids="$(resource_autoscaler_script_pids)"
		[ -z "$pids" ] && return 0
		sleep 1
		waited=$(( waited + 1 ))
	done

	for pid in $pids; do
		log "force-stopping unsupervised resource autoscaler pid=$pid"
		kill -9 "$pid" 2>/dev/null || true
	done
}

deferred_controller_pids() {
	{
		ps -eo pid=,args= | awk '
		index($0, "/rtc-deferred-work-promotion-20260516/deferred-work-promotion-loop.sh") {
			print $1
		}
		'
		fuser "$DEFERRED_BASE/deferred-work-promotion-loop.lock" 2>/dev/null || true
	} | tr ' ' '\n' | awk '/^[0-9]+$/ && !seen[$1]++ { print $1 }'
}

stop_unsupervised_deferred_controller() {
	local pids pid pgid waited
	pids=$(deferred_controller_pids)
	if [ -z "$pids" ]; then
		rm -f "$DEFERRED_BASE/deferred-work-promotion-loop.pid"
		return 0
	fi
	for pid in $pids; do
		pgid=$(ps -o pgid= -p "$pid" 2>/dev/null | awk '{ print $1 }')
		log "stopping unsupervised deferred-work controller pid=$pid pgid=${pgid:-unknown}"
		if [ -n "$pgid" ] && [ "$pgid" != "1" ] && [ "$pgid" != "$$" ]; then
			kill -TERM -- "-$pgid" 2>/dev/null || true
		else
			kill -TERM "$pid" 2>/dev/null || true
		fi
	done
	waited=0
	while [ "$waited" -lt 10 ]; do
		pids=$(deferred_controller_pids)
		if [ -z "$pids" ]; then
			rm -f "$DEFERRED_BASE/deferred-work-promotion-loop.pid"
			return 0
		fi
		sleep 1
		waited=$(( waited + 1 ))
	done
	for pid in $pids; do
		pgid=$(ps -o pgid= -p "$pid" 2>/dev/null | awk '{ print $1 }')
		log "force-stopping unsupervised deferred-work controller pid=$pid pgid=${pgid:-unknown}"
		if [ -n "$pgid" ] && [ "$pgid" != "1" ] && [ "$pgid" != "$$" ]; then
			kill -KILL -- "-$pgid" 2>/dev/null || true
		else
			kill -KILL "$pid" 2>/dev/null || true
		fi
	done
	rm -f "$DEFERRED_BASE/deferred-work-promotion-loop.pid"
}

finalization_controller_pids() {
	local pid script argc
	for pid in $(pgrep -f "$FINALIZATION_BASE/pr-finalization-loop.sh" 2>/dev/null || true); do
		[ -r "/proc/$pid/cmdline" ] || continue
		script=$(tr '\0' '\n' < "/proc/$pid/cmdline" | sed -n '2p')
		argc=$(tr '\0' '\n' < "/proc/$pid/cmdline" | awk 'NF { count++ } END { print count + 0 }')
		[ "$script" = "$FINALIZATION_BASE/pr-finalization-loop.sh" ] && [ "$argc" -eq 2 ] || continue
		printf '%s\n' "$pid"
	done
}

stop_orphaned_finalization_controllers() {
	local supervised pids pid waited=0
	supervised=$(tmux list-panes -t rtc-pr-finalization-loop -F '#{pane_pid}' 2>/dev/null | sed -n '1p')
	pids=$(finalization_controller_pids)
	for pid in $pids; do
		[ "$pid" != "$supervised" ] || continue
		log "stopping orphaned PR finalization controller pid=$pid supervised=${supervised:-none}"
		kill -TERM "$pid" 2>/dev/null || true
	done
	while [ "$waited" -lt 10 ]; do
		pids=$(finalization_controller_pids | awk -v supervised="$supervised" '$1 != supervised')
		[ -z "$pids" ] && return 0
		sleep 1
		waited=$(( waited + 1 ))
	done
	for pid in $pids; do
		log "force-stopping orphaned PR finalization controller pid=$pid supervised=${supervised:-none}"
		kill -KILL "$pid" 2>/dev/null || true
	done
}

coverage_supervisor_state_matches_current_root() {
	local root=$1
	[ -n "$root" ] && [ -f "$root/supervisor-state.json" ] || return 1
	node - "$root" <<'NODE'
const fs = require( 'fs' );
const path = require( 'path' );
const root = process.argv[ 2 ];
try {
	const state = JSON.parse(
		fs.readFileSync( path.join( root, 'supervisor-state.json' ), 'utf8' )
	);
	if (
		typeof state.outputDir === 'string' &&
		path.resolve( state.outputDir ) === path.resolve( root )
	) {
		process.exit( 0 );
	}
} catch {}
process.exit( 1 );
NODE
}

coverage_supervisor_session_exists() {
	local root suffix scoped state_session

	root=$(sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)
	[ -n "$root" ] || return 1
	coverage_supervisor_state_matches_current_root "$root" || return 1

	if [ -n "$root" ]; then
		suffix=$(
			basename "$root" |
				sed -E 's/[^A-Za-z0-9_.-]+/-/g; s/^-+//; s/-+$//'
		)
		if [ -n "$suffix" ]; then
			scoped="rtc-coverage-guided-supervisor-$suffix"
			if has_session "$scoped"; then
				return 0
			fi
		fi
		if [ -f "$root/novelty-state.json" ]; then
			state_session=$(
				node -e "const fs = require('fs'); try { const state = JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); if (typeof state.supervisorSession === 'string') process.stdout.write(state.supervisorSession); } catch {}" \
					"$root/novelty-state.json"
			)
			if [ -n "$state_session" ] && has_session "$state_session"; then
				return 0
			fi
		fi
	fi
	if has_session rtc-coverage-guided-supervisor; then
		return 0
	fi

	return 1
}

coverage_guided_lower_level_b64_satisfied() {
	if has_session rtc-coverage-guided-lower-level-b64; then
		return 0
	fi
	if [ -f "$CG_LOWER_LEVEL_B64_HOLD_FILE" ]; then
		if ! grep -Fq "$CG_LOWER_LEVEL_B64_REPLACEMENT_GROUP" "$CG_LOWER_LEVEL_B64_HOLD_FILE"; then
			return 0
		fi
		if [ -f "$CG_LOWER_LEVEL_B64_REPLACEMENT_HOLD_FILE" ] &&
			grep -Eq "$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_GROUP|rtc-table-query-array-crdt|table-query-array" "$CG_LOWER_LEVEL_B64_REPLACEMENT_HOLD_FILE"; then
			if [ -f "$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_HOLD_FILE" ] &&
				grep -Eq "$CG_LOWER_LEVEL_BLOCK_PARSER_GROUP|rtc-block-parser-serialization|block-parser|parser-serialization" "$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_HOLD_FILE"; then
				coverage_guided_lower_level_group_session_or_hold_exists \
					"$CG_LOWER_LEVEL_BLOCK_PARSER_SESSION" \
					"$CG_LOWER_LEVEL_BLOCK_PARSER_GROUP" \
					"$CG_LOWER_LEVEL_BLOCK_PARSER_HOLD_FILE"
				return
			fi
			if [ -f "$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_HOLD_FILE" ] &&
				grep -Eq "$CG_LOWER_LEVEL_HTTP_POLLING_GROUP|rtc-http-polling-manager|http-polling|polling-manager" "$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_HOLD_FILE"; then
				coverage_guided_lower_level_group_session_or_hold_exists \
					"$CG_LOWER_LEVEL_HTTP_POLLING_SESSION" \
					"$CG_LOWER_LEVEL_HTTP_POLLING_GROUP" \
					"$CG_LOWER_LEVEL_HTTP_POLLING_HOLD_FILE"
				return
			fi
			coverage_guided_lower_level_group_session_or_hold_exists \
				"$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_SESSION" \
				"$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_GROUP" \
				"$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_HOLD_FILE"
			return
		fi
		coverage_guided_lower_level_group_session_or_hold_exists \
			"$CG_LOWER_LEVEL_B64_REPLACEMENT_SESSION" \
			"$CG_LOWER_LEVEL_B64_REPLACEMENT_GROUP" \
			"$CG_LOWER_LEVEL_B64_REPLACEMENT_HOLD_FILE"
		return
	fi
	return 1
}

start_coverage_guided_lower_level_b64_or_replacement() {
	local session=rtc-coverage-guided-lower-level-b64
	local group=$CG_LOWER_LEVEL_B64_GROUP
	local hold_file=$CG_LOWER_LEVEL_B64_HOLD_FILE

	if [ -f "$CG_LOWER_LEVEL_B64_HOLD_FILE" ] &&
		grep -Fq "$CG_LOWER_LEVEL_B64_REPLACEMENT_GROUP" "$CG_LOWER_LEVEL_B64_HOLD_FILE"; then
		session=$CG_LOWER_LEVEL_B64_REPLACEMENT_SESSION
		group=$CG_LOWER_LEVEL_B64_REPLACEMENT_GROUP
		hold_file=$CG_LOWER_LEVEL_B64_REPLACEMENT_HOLD_FILE
		if [ -f "$CG_LOWER_LEVEL_B64_REPLACEMENT_HOLD_FILE" ] &&
			grep -Eq "$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_GROUP|rtc-table-query-array-crdt|table-query-array" "$CG_LOWER_LEVEL_B64_REPLACEMENT_HOLD_FILE"; then
			session=$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_SESSION
			group=$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_GROUP
			hold_file=$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_HOLD_FILE
			if [ -f "$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_HOLD_FILE" ] &&
				grep -Eq "$CG_LOWER_LEVEL_BLOCK_PARSER_GROUP|rtc-block-parser-serialization|block-parser|parser-serialization" "$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_HOLD_FILE"; then
				session=$CG_LOWER_LEVEL_BLOCK_PARSER_SESSION
				group=$CG_LOWER_LEVEL_BLOCK_PARSER_GROUP
				hold_file=$CG_LOWER_LEVEL_BLOCK_PARSER_HOLD_FILE
			elif [ -f "$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_HOLD_FILE" ] &&
				grep -Eq "$CG_LOWER_LEVEL_HTTP_POLLING_GROUP|rtc-http-polling-manager|http-polling|polling-manager" "$CG_LOWER_LEVEL_TABLE_QUERY_ARRAY_HOLD_FILE"; then
				session=$CG_LOWER_LEVEL_HTTP_POLLING_SESSION
				group=$CG_LOWER_LEVEL_HTTP_POLLING_GROUP
				hold_file=$CG_LOWER_LEVEL_HTTP_POLLING_HOLD_FILE
			fi
		fi
	fi

	if coverage_guided_lower_level_group_session_or_hold_exists "$session" "$group" "$hold_file"; then
		return 0
	fi

	RTC_CG_LOWER_LEVEL_SESSION="$session" \
		RTC_CG_LOWER_LEVEL_GROUP="$group" \
		bash "$REPO/bin/rtc-coverage-guided-lower-level-start-remote.sh" start >> "$LOG_DIR/cg-lower-level-start.log" 2>&1 ||
		log "coverage-guided lower-level start failed session=$session group=$group"
}

coverage_breadth_restart_block_reason() {
	local status=$RESOURCE_BASE/resource-autoscaler-status.md
	local min=${RTC_RESOURCE_AUTOSCALER_MIN_COVERAGE_BREADTH_GROUPS:-10}
	local enabled current desired
	enabled=$(sed -n 's/^- enabled_groups: \([0-9][0-9]*\).*/\1/p' "$status" 2>/dev/null | tail -1)
	current=$(sed -n 's/^- current_budget: target=\([0-9][0-9]*\).*/\1/p' "$status" 2>/dev/null | tail -1)
	desired=$(sed -n 's/^- desired_budget: target=\([0-9][0-9]*\).*/\1/p' "$status" 2>/dev/null | tail -1)
	# The desired coverage budget is a hard ceiling for this prerequisite. A
	# deliberate deadline cap below the legacy breadth floor must not disable
	# every optional browser pool indefinitely.
	if [[ "$desired" =~ ^[0-9]+$ ]] && [ "$desired" -gt 0 ] && [ "$desired" -lt "$min" ]; then
		min=$desired
	fi
	if [[ "$enabled" =~ ^[0-9]+$ ]] && [ "$enabled" -lt "$min" ]; then
		printf 'coverage_breadth_enabled=%s min=%s\n' "$enabled" "$min"
		return 0
	fi
	if [[ "$current" =~ ^[0-9]+$ ]] && [ "$current" -lt "$min" ]; then
		printf 'coverage_budget_target=%s min=%s\n' "$current" "$min"
		return 0
	fi
	return 1
}

run_docker_network_maintenance() {
	[ -x "$DOCKER_NETWORK_REAPER" ] || return 0
	RTC_DOCKER_NETWORK_REAPER_TRIGGER_COUNT="$DOCKER_NETWORK_REAPER_TRIGGER_COUNT" \
		RTC_DOCKER_NETWORK_REAPER_TARGET_COUNT=${RTC_DOCKER_NETWORK_REAPER_TARGET_COUNT:-20} \
		RTC_DOCKER_NETWORK_REAPER_MAX_PROJECTS=${RTC_DOCKER_NETWORK_REAPER_MAX_PROJECTS:-4} \
		RTC_DOCKER_NETWORK_REAPER_RETENTION_SECONDS=${RTC_DOCKER_NETWORK_REAPER_RETENTION_SECONDS:-1800} \
		RTC_DOCKER_NETWORK_REAPER_EMPTY_RETENTION_SECONDS=${RTC_DOCKER_NETWORK_REAPER_EMPTY_RETENTION_SECONDS:-300} \
		setsid timeout 90 "$NODE_BIN/node" "$DOCKER_NETWORK_REAPER" >> "$LOG_DIR/docker-network-reaper.log" 2>&1 &
	child_pid=$!
	child_pid_is_group=1
	if ! wait "$child_pid"; then
		log "Docker network reaper failed or timed out"
	fi
	child_pid=""
	child_pid_is_group=0
}

optional_browser_restart_block_reason() {
	local pool=${1:-optional-browser}
	local status=$RESOURCE_BASE/resource-autoscaler-status.md
	local shed_last=$RESOURCE_BASE/optional-browser-shed-last-epoch
	local reason last now age grace load cores current desired network_count network_limit

	network_count=$(docker network ls -q 2>/dev/null | wc -l | tr -d ' ')
	network_limit=$DOCKER_NETWORK_REAPER_TRIGGER_COUNT
	case "$pool" in
		strict|focused) network_limit=${RTC_GUARD_OPTIONAL_CORE_NETWORK_LIMIT:-24} ;;
		gap-booster) network_limit=${RTC_GUARD_GAP_BOOSTER_NETWORK_LIMIT:-20} ;;
	esac
	if [[ "$network_count" =~ ^[0-9]+$ ]] && [ "$network_count" -ge "$network_limit" ]; then
		printf 'docker_network_count=%s limit=%s pool=%s\n' "$network_count" "$network_limit" "$pool"
		return 0
	fi

	reason=$(sed -n 's/^- reason: //p' "$status" 2>/dev/null | tail -1)
	if coverage_breadth_restart_block_reason; then
		return 0
	fi
	case "$reason" in
		pressure|severe_pressure|high_pressure)
			printf 'autoscaler reason=%s\n' "$reason"
			return 0
			;;
	esac

	current=$(sed -n 's/^- current_budget: target=\([0-9][0-9]*\).*/\1/p' "$status" 2>/dev/null | tail -1)
	desired=$(sed -n 's/^- desired_budget: target=\([0-9][0-9]*\).*/\1/p' "$status" 2>/dev/null | tail -1)
	if [[ "$current" =~ ^[0-9]+$ && "$desired" =~ ^[0-9]+$ ]] && [ "$desired" -lt "$current" ]; then
		printf 'desired_budget=%s current_budget=%s reason=%s\n' "$desired" "$current" "${reason:-unknown}"
		return 0
	fi

	load=$(sed -n 's/^- load1: \([0-9.]*\) \/.*/\1/p' "$status" 2>/dev/null | tail -1)
	cores=$(sed -n 's/^- load1: [0-9.]* \/ \([0-9][0-9]*\) cores.*/\1/p' "$status" 2>/dev/null | tail -1)
	if [[ "$load" =~ ^[0-9.]+$ && "$cores" =~ ^[0-9]+$ ]] &&
		awk -v loadv="$load" -v cores="$cores" 'BEGIN { exit !(loadv >= cores * 0.90) }'; then
		printf 'load1=%s cores=%s reason=%s\n' "$load" "$cores" "${reason:-unknown}"
		return 0
	fi

	grace=${RTC_GUARD_OPTIONAL_BROWSER_SHED_RESTART_GRACE_SECONDS:-${RTC_RESOURCE_AUTOSCALER_OPTIONAL_BROWSER_SHED_COOLDOWN_SECONDS:-900}}
	last=$(sed -n '1p' "$shed_last" 2>/dev/null || true)
	if [[ "$last" =~ ^[0-9]+$ ]]; then
		now=$(date -u +%s)
		age=$(( now - last ))
		if [ "$age" -ge 0 ] && [ "$age" -lt "$grace" ]; then
			printf 'recent optional-browser shed age=%ss grace=%ss\n' "$age" "$grace"
			return 0
		fi
	fi

	return 1
}

resource_pressure_blocks_optional_browser() {
	optional_browser_restart_block_reason >/dev/null
}

cpu_class_for_pool() {
	case "$1" in
		coverage)
			printf 'coverage-core\n'
			;;
		strict|focused|gap-booster)
			printf 'optional-browser\n'
			;;
		lower-level|cg-lower-level)
			printf 'lower-level\n'
			;;
		*)
			printf 'analysis\n'
			;;
	esac
}

global_cpu_admission_allows() {
	local pool=$1 class
	case "$pool" in
		coverage|deferred|pr-progress|finalization|critical-pr|resource|structural)
			return 0
			;;
	esac
	class=$(cpu_class_for_pool "$pool")
	[ -x "$GLOBAL_ADMISSION" ] || return 0
	if "$GLOBAL_ADMISSION" allow "$class" "guard:$pool" >/dev/null 2>&1; then
		return 0
	fi
	log "skipping restart under global CPU budget pool=$pool class=$class status=$("$GLOBAL_ADMISSION" status "$class" 2>/dev/null || true)"
	return 1
}

browser_pool_current_root() {
	case "$1" in
		focused)
			sed -n '1p' "$FOCUSED_BASE/current-run-root.txt" 2>/dev/null || true
			;;
		strict)
			sed -n '1p' /media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515/current-run-root.txt 2>/dev/null || true
			;;
		gap-booster)
			sed -n '1p' /media/volume/danluu-fuzz-data/rtc-gap-booster-20260515/current-run-root.txt 2>/dev/null || true
			;;
	esac
}

browser_pool_base() {
	case "$1" in
		focused)
			printf '%s\n' "$FOCUSED_BASE"
			;;
		strict)
			printf '%s\n' /media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515
			;;
		gap-booster)
			printf '%s\n' /media/volume/danluu-fuzz-data/rtc-gap-booster-20260515
			;;
	esac
}

browser_pool_sessions() {
	case "$1" in
		focused)
			printf '%s\t%s\t%s\t%s\n' rtc-focused-shards rtc-focused-shards-watchdog rtc-focused-shards-analysis rtc-focused-analysis
			;;
		strict)
			printf '%s\t%s\t%s\t%s\n' rtc-fuzz-strict-expansion rtc-fuzz-strict-expansion-watchdog rtc-fuzz-strict-expansion-analysis rtc-strict-analysis
			;;
		gap-booster)
			printf '%s\t%s\t%s\t%s\n' rtc-gap-booster rtc-gap-booster-watchdog rtc-gap-booster-analysis rtc-gap-analysis
			;;
	esac
}

browser_root_live_lane_count() {
	local root=$1
	[ -n "$root" ] && [ -f "$root/supervisor-state.json" ] || {
		printf '0\n'
		return
	}
	node - "$root" <<'NODE'
const fs = require( 'fs' );
const path = require( 'path' );
const root = process.argv[ 2 ];
let live = 0;
const readJson = ( file ) => {
	try {
		return JSON.parse( fs.readFileSync( file, 'utf8' ) );
	} catch {
		return null;
	}
};
const state = readJson( path.join( root, 'supervisor-state.json' ) );
for ( const group of state?.groups ?? [] ) {
	for ( const runDir of group.activeRunDirs ?? [] ) {
		const manifest = readJson( path.join( runDir, 'lanes.json' ) );
		for ( const lane of manifest?.lanes ?? [] ) {
			const pid = Number( lane.pid );
			if ( ! Number.isInteger( pid ) || pid <= 0 ) {
				continue;
			}
			const laneState = lane.outputDir
				? readJson( path.join( lane.outputDir, 'state.json' ) )
				: null;
			try {
				process.kill( pid, 0 );
				if ( ! laneState?.stopReason ) {
					live += 1;
				}
			} catch {}
		}
	}
}
process.stdout.write( `${ live }\n` );
NODE
}

reattach_browser_pool_if_live() {
	local pool=$1
	local reason=$2
	local run base live_count supervisor_session watchdog_session analysis_session analysis_prefix

	run=$(browser_pool_current_root "$pool")
	base=$(browser_pool_base "$pool")
	[ -n "$run" ] && [ -f "$run/supervisor-groups.json" ] && [ -n "$base" ] || return 1
	live_count=$(browser_root_live_lane_count "$run")
	[[ "$live_count" =~ ^[0-9]+$ ]] || live_count=0
	[ "$live_count" -gt 0 ] || return 1

	IFS=$'\t' read -r supervisor_session watchdog_session analysis_session analysis_prefix <<<"$(browser_pool_sessions "$pool")"
	[ -n "$supervisor_session" ] && [ -n "$watchdog_session" ] && [ -n "$analysis_session" ] || return 1

	log "reattaching browser pool pool=$pool live_lanes=$live_count reason=$reason root=$run"
	if ! has_session "$supervisor_session"; then
		tmux new-session -d -s "$supervisor_session" "bash -lc 'cd \"$REPO\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\" CI=1 RTC_FUZZ_SUPERVISOR_OUTPUT_DIR=\"$run\" RTC_FUZZ_SUPERVISOR_GROUPS_PATH=\"$run/supervisor-groups.json\" RTC_FUZZ_SUPERVISOR_CURRENT_OUTPUT_POINTER=\"$base/current-output-dir.txt\" RTC_FUZZ_SUPERVISOR_DURATION_HOURS=12 RTC_FUZZ_SUPERVISOR_POLL_MS=60000 RTC_FUZZ_TRIAGE_MAX_PARALLEL=1 RTC_FUZZ_INLINE_CODEX=0 RTC_FUZZ_SKIP_GLOBAL_POST_CLEANUP=1 RTC_FUZZ_LOW_DISK_MODE=1 RTC_FUZZ_PLAYWRIGHT_VIDEO=off; node bin/rtc-browser-fuzz-supervisor.mjs >> \"$base/logs/supervisor.log\" 2>&1'" ||
			return 1
	fi
	if ! has_session "$watchdog_session"; then
		tmux new-session -d -s "$watchdog_session" "bash -lc 'cd \"$REPO\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\" CI=1; while true; do RTC_FUZZ_WATCHDOG_REPO_ROOT=\"$REPO\" RTC_FUZZ_WATCHDOG_OUTPUT_DIR=\"$run\" RTC_FUZZ_WATCHDOG_GROUPS_PATH=\"$run/supervisor-groups.json\" RTC_FUZZ_WATCHDOG_SESSION=\"$supervisor_session\" RTC_FUZZ_WATCHDOG_DURATION_HOURS=12 RTC_FUZZ_WATCHDOG_POLL_MS=60000 RTC_FUZZ_WATCHDOG_STALE_MS=360000 node bin/rtc-browser-fuzz-watchdog.mjs >> \"$base/logs/watchdog.log\" 2>&1; code=\$?; printf \"WATCHDOG_EXIT:%s %s\\n\" \"\$code\" \"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\" >> \"$base/logs/watchdog.log\"; sleep 30; done'" ||
			return 1
	fi
	if ! has_session "$analysis_session"; then
		if optional_analysis_admission_allows; then
			tmux new-session -d -s "$analysis_session" "bash -lc 'cd \"$REPO\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\" CI=1; while true; do RTC_FUZZ_LIVE_ANALYSIS_REPO_ROOT=\"$REPO\" RTC_FUZZ_LIVE_ANALYSIS_INTERVAL_MS=120000 RTC_FUZZ_LIVE_ANALYSIS_MAX_PARALLEL=1 RTC_FUZZ_LIVE_ANALYSIS_MAX_ATTEMPTS=4 RTC_FUZZ_LIVE_ANALYSIS_CODEX_TIMEOUT_MS=2700000 RTC_FUZZ_LIVE_ANALYSIS_TMUX_PREFIX=\"$analysis_prefix\" node bin/rtc-browser-fuzz-live-analysis-monitor.mjs \"$run\" >> \"$base/logs/analysis.log\" 2>&1; code=\$?; printf \"ANALYSIS_EXIT:%s %s\\n\" \"\$code\" \"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\" >> \"$base/logs/analysis.log\"; sleep 30; done'" ||
				return 1
		fi
	fi
	return 0
}

maybe_restart_optional_browser_pool() {
	local pool=$1
	local reason=$2
	local block_reason
	if block_reason=$(optional_browser_restart_block_reason "$pool"); then
		log "skipping optional browser pool restart/reattach under resource pressure pool=$pool reason=$reason block=$block_reason"
		return
	fi
	if reattach_browser_pool_if_live "$pool" "$reason"; then
		return
	fi
	restart_pool "$pool" "$reason"
}

restart_focused_sidecars() {
	local run

	run=$(sed -n '1p' "$FOCUSED_BASE/current-run-root.txt" 2>/dev/null || true)
	if [ -z "$run" ] || [ ! -f "$run/supervisor-groups.json" ]; then
		log "focused sidecar restart skipped; missing current run root"
		return 1
	fi

	if ! has_session rtc-focused-shards-watchdog; then
		tmux new-session -d -s rtc-focused-shards-watchdog "bash -lc 'cd \"$REPO\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\" CI=1; while true; do RTC_FUZZ_WATCHDOG_REPO_ROOT=\"$REPO\" RTC_FUZZ_WATCHDOG_OUTPUT_DIR=\"$run\" RTC_FUZZ_WATCHDOG_GROUPS_PATH=\"$run/supervisor-groups.json\" RTC_FUZZ_WATCHDOG_SESSION=rtc-focused-shards RTC_FUZZ_WATCHDOG_DURATION_HOURS=12 RTC_FUZZ_WATCHDOG_POLL_MS=60000 RTC_FUZZ_WATCHDOG_STALE_MS=360000 node bin/rtc-browser-fuzz-watchdog.mjs >> \"$FOCUSED_BASE/logs/watchdog.log\" 2>&1; code=\$?; printf \"WATCHDOG_EXIT:%s %s\\n\" \"\$code\" \"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\" >> \"$FOCUSED_BASE/logs/watchdog.log\"; sleep 30; done'" ||
			log "focused watchdog sidecar start failed"
	fi

	if ! has_session rtc-focused-shards-analysis; then
		if optional_analysis_admission_allows; then
			tmux new-session -d -s rtc-focused-shards-analysis "bash -lc 'cd \"$REPO\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\" CI=1; while true; do RTC_FUZZ_LIVE_ANALYSIS_REPO_ROOT=\"$REPO\" RTC_FUZZ_LIVE_ANALYSIS_INTERVAL_MS=120000 RTC_FUZZ_LIVE_ANALYSIS_MAX_PARALLEL=1 RTC_FUZZ_LIVE_ANALYSIS_MAX_ATTEMPTS=4 RTC_FUZZ_LIVE_ANALYSIS_CODEX_TIMEOUT_MS=2700000 RTC_FUZZ_LIVE_ANALYSIS_TMUX_PREFIX=rtc-focused-analysis RTC_FUZZ_LIVE_ANALYSIS_ENABLE_DEEP=0 RTC_FUZZ_LIVE_DEEP_ANALYSIS_MAX_PARALLEL=1 node bin/rtc-browser-fuzz-live-analysis-monitor.mjs \"$run\" >> \"$FOCUSED_BASE/logs/analysis.log\" 2>&1; code=\$?; printf \"ANALYSIS_EXIT:%s %s\\n\" \"\$code\" \"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\" >> \"$FOCUSED_BASE/logs/analysis.log\"; sleep 30; done'" ||
				log "focused analysis sidecar start failed"
		fi
	fi
}

file_age_seconds() {
	local file=$1
	local now mtime

	[ -e "$file" ] || return 1
	now=$(date -u +%s)
	mtime=$(stat -c %Y "$file" 2>/dev/null) || return 1
	printf '%s\n' "$(( now - mtime ))"
}

browser_pool_supervisor_state_stale() {
	local pool=$1
	local max_age=${2:-${RTC_GUARD_BROWSER_SUPERVISOR_STALE_SECONDS:-900}}
	local run age

	run=$(browser_pool_current_root "$pool")
	[ -n "$run" ] && [ -f "$run/supervisor-state.json" ] || return 1
	age=$(file_age_seconds "$run/supervisor-state.json") || return 1
	if [ "$age" -gt "$max_age" ]; then
		printf 'root=%s state_age=%ss max=%ss\n' "$run" "$age" "$max_age"
		return 0
	fi
	return 1
}

stop_browser_pool_sidecars_if_terminal_stale() {
	local pool=$1
	local reason=$2
	local stale live_count supervisor_session watchdog_session analysis_session analysis_prefix

	stale=$(browser_pool_supervisor_state_stale "$pool" || true)
	[ -n "$stale" ] || return 0
	live_count=$(browser_root_live_lane_count "$(browser_pool_current_root "$pool")")
	[[ "$live_count" =~ ^[0-9]+$ ]] || live_count=0
	[ "$live_count" -eq 0 ] || return 0

	IFS=$'\t' read -r supervisor_session watchdog_session analysis_session analysis_prefix <<<"$(browser_pool_sessions "$pool")"
	log "stopping stale browser sidecars pool=$pool reason=$reason $stale"
	[ -n "$watchdog_session" ] && tmux kill-session -t "$watchdog_session" 2>/dev/null || true
	[ -n "$analysis_session" ] && tmux kill-session -t "$analysis_session" 2>/dev/null || true
}

coverage_supervisor_in_startup_grace() {
	local grace=${RTC_GUARD_COVERAGE_SUPERVISOR_STARTUP_GRACE_SECONDS:-420}
	local age

	has_session rtc-coverage-guided-novelty || return 1
	has_session rtc-coverage-guided-watchdog || return 1
	coverage_supervisor_session_exists && return 1
	age=$(file_age_seconds "$COVERAGE_BASE/current-output-dir.txt") || return 1
	if [ "$age" -ge 0 ] && [ "$age" -lt "$grace" ]; then
		log "coverage supervisor missing within startup grace age=${age}s grace=${grace}s"
		return 0
	fi
	return 1
}

coverage_start_in_progress() {
	local grace=${RTC_GUARD_COVERAGE_START_GRACE_SECONDS:-420}
	local age

	[ -e "$COVERAGE_START_LOCK" ] || return 1
	if (
		flock -n 8
	) 8>>"$COVERAGE_START_LOCK"; then
		return 1
	fi
	age=$(file_age_seconds "$COVERAGE_START_LOCK") || return 1
	if [ "$age" -ge 0 ] && [ "$age" -lt "$grace" ]; then
		log "coverage start already in progress age=${age}s grace=${grace}s"
		return 0
	fi
	return 1
}

stop_codex_in_frozen_candidate() {
	local product_repo=$1 pid cwd
	for pid in $(pgrep -f 'codex .*exec|/codex .*exec|codex -a .*exec' 2>/dev/null || true); do
		cwd=$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)
		case "$cwd" in
			"$product_repo"|"$product_repo"/*)
				log "stopping Codex with writable cwd inside frozen candidate pid=$pid cwd=$cwd"
				kill -TERM "$pid" 2>/dev/null || true
				;;
		esac
	done
}

stop_codex_in_control_repo() {
	local pid cwd
	for pid in $(pgrep -f 'codex .*exec|/codex .*exec|codex -a .*exec' 2>/dev/null || true); do
		cwd=$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)
		[ "$cwd" = "$REPO" ] || continue
		log "stopping Codex with writable cwd in live harness control repo pid=$pid cwd=$cwd"
		kill -TERM "$pid" 2>/dev/null || true
	done
}

restore_frozen_harness_from_control() {
	local product_repo=$1 relative=$2 expected_hash=$3 canonical source_hash destination tmp restored_hash
	canonical=$REPO/$relative
	destination=$product_repo/$relative
	[ -f "$canonical" ] || return 1
	source_hash=$(sha256sum "$canonical" 2>/dev/null | awk '{ print $1 }')
	[ -n "$expected_hash" ] && [ "$source_hash" = "$expected_hash" ] || return 1

	stop_codex_in_frozen_candidate "$product_repo"
	mkdir -p "$(dirname "$destination")"
	tmp=$(mktemp "$(dirname "$destination")/.guard-restore.XXXXXX")
	cp -p "$canonical" "$tmp"
	mv -f "$tmp" "$destination"
	restored_hash=$(sha256sum "$destination" 2>/dev/null | awk '{ print $1 }')
	[ "$restored_hash" = "$expected_hash" ] || return 1
	log "restored frozen harness file from matching control source path=$relative hash=$expected_hash without replacing current run"
	return 0
}

novelty_monitor_policy_valid() {
	local source=$1
	[ -f "$NOVELTY_POLICY_CHECK" ] && [ -f "$source" ] || return 1
	"$NODE_BIN/node" "$NOVELTY_POLICY_CHECK" "$source" >/dev/null 2>&1
}

stop_coverage_guidance_writers() {
	local session
	while IFS= read -r session; do
		[ -n "$session" ] || continue
		log "stopping coverage guidance session after rejected budget-policy edit session=$session"
		tmux kill-session -t "$session" 2>/dev/null || true
	done < <(tmux list-sessions -F '#S' 2>/dev/null | grep '^rtc-coverage-guidance-codex-' || true)
	stop_codex_in_control_repo
}

restore_control_harness_from_frozen() {
	local product_repo=$1 relative=$2 expected_hash=$3 source destination source_hash tmp restored_hash
	source=$product_repo/$relative
	destination=$REPO/$relative
	[ -f "$source" ] || return 1
	source_hash=$(sha256sum "$source" 2>/dev/null | awk '{ print $1 }')
	[ -n "$expected_hash" ] && [ "$source_hash" = "$expected_hash" ] || return 1
	if [ "$relative" = bin/rtc-browser-fuzz-novelty-monitor.mjs ]; then
		novelty_monitor_policy_valid "$source" || return 1
	fi
	stop_coverage_guidance_writers
	mkdir -p "$(dirname "$destination")"
	tmp=$(mktemp "$(dirname "$destination")/.guard-control-restore.XXXXXX")
	cp -p "$source" "$tmp"
	mv -f "$tmp" "$destination"
	restored_hash=$(sha256sum "$destination" 2>/dev/null | awk '{ print $1 }')
	[ "$restored_hash" = "$expected_hash" ] || return 1
	log "restored drifted live harness control file from frozen generation path=$relative hash=$expected_hash"
}

restore_control_novelty_monitor_from_frozen() {
	local product_repo=$1 expected_hash=$2
	restore_control_harness_from_frozen \
		"$product_repo" \
		bin/rtc-browser-fuzz-novelty-monitor.mjs \
		"$expected_hash"
}

coverage_candidate_source_problem() {
	local root manifest product_repo monitor_repo expected_head actual_head control_head mode unexpected
	local field relative expected_hash actual_hash actual_age control_hash control_age policy_error
	root=$(sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)
	[ -n "$root" ] && [ -d "$root" ] || {
		printf 'current output root is missing'
		return 0
	}
	manifest=$root/source-manifest.tsv
	[ -s "$manifest" ] || {
		printf 'source manifest is missing'
		return 0
	}
	mode=$(awk -F '\t' '$1 == "mode" { print $2; exit }' "$manifest")
	[ "$mode" = exact-candidate-plus-harness-overlay ] || {
		printf 'unexpected source mode=%s' "${mode:-missing}"
		return 0
	}
	expected_head=$(awk -F '\t' '$1 == "candidate_head" { print $2; exit }' "$manifest")
	product_repo=$(awk -F '\t' '$1 == "product_repo" { print $2; exit }' "$manifest")
	[ -n "$expected_head" ] && [ -d "$product_repo" ] || {
		printf 'candidate head or product repo is missing'
		return 0
	}
	actual_head=$(git -C "$product_repo" rev-parse HEAD 2>/dev/null || true)
	[ "$actual_head" = "$expected_head" ] || {
		printf 'candidate snapshot head=%s expected=%s' "${actual_head:-missing}" "$expected_head"
		return 0
	}
	if ! novelty_monitor_policy_valid "$product_repo/bin/rtc-browser-fuzz-novelty-monitor.mjs"; then
		policy_error=$("$NODE_BIN/node" "$NOVELTY_POLICY_CHECK" "$product_repo/bin/rtc-browser-fuzz-novelty-monitor.mjs" 2>&1 || true)
		printf 'frozen novelty monitor violates hard scheduling policy: %s' "${policy_error:-unknown policy-check failure}"
		return 0
	fi
	monitor_repo=$(awk -F '\t' '$1 == "monitor_repo" { print $2; exit }' "$manifest")
	[ "$monitor_repo" = "$product_repo" ] || {
		printf 'monitor repo=%s expected frozen product repo=%s' "${monitor_repo:-missing}" "$product_repo"
		return 0
	}
	grep -Fqx "cd '$product_repo'" "$root/run-monitor.sh" 2>/dev/null || {
		printf 'run monitor does not execute from frozen product repo=%s' "$product_repo"
		return 0
	}
	grep -Fqx "export RTC_FUZZ_NOVELTY_COVERAGE_CODEX_CWD='$REPO'" "$root/run-monitor.sh" 2>/dev/null || {
		printf 'coverage guidance is not isolated in writable harness control repo=%s' "$REPO"
		return 0
	}
	grep -Fqx "export RTC_FUZZ_NOVELTY_COVERAGE_CODEX='0'" "$root/run-monitor.sh" 2>/dev/null || {
		printf 'in-generation coverage guidance writer is enabled'
		return 0
	}
	grep -Fqx "export RTC_FUZZ_NOVELTY_CURRENT_OUTPUT_POINTER='$COVERAGE_BASE/current-output-dir.txt'" "$root/run-monitor.sh" 2>/dev/null || {
		printf 'novelty monitor does not enforce current output pointer=%s' "$COVERAGE_BASE/current-output-dir.txt"
		return 0
	}
	control_head=$(git -C "$CANDIDATE_REPO" rev-parse "$CANDIDATE_REF" 2>/dev/null || true)
	[ "$control_head" = "$expected_head" ] || {
		printf 'candidate branch advanced to %s while run tests %s' "${control_head:-missing}" "$expected_head"
		return 0
	}
	expected_hash=$(awk -F '\t' '$1 == "novelty_monitor_sha256" { print $2; exit }' "$manifest")
	if ! novelty_monitor_policy_valid "$REPO/bin/rtc-browser-fuzz-novelty-monitor.mjs"; then
		policy_error=$("$NODE_BIN/node" "$NOVELTY_POLICY_CHECK" "$REPO/bin/rtc-browser-fuzz-novelty-monitor.mjs" 2>&1 || true)
		if ! restore_control_novelty_monitor_from_frozen "$product_repo" "$expected_hash"; then
			printf 'control novelty monitor violates hard scheduling policy and restore failed: %s' "${policy_error:-unknown policy-check failure}"
			return 0
		fi
	fi
	for field in novelty_monitor_sha256 live_analysis_monitor_sha256 runner_sha256 supervisor_sha256 triage_watcher_sha256; do
		case "$field" in
			novelty_monitor_sha256) relative=bin/rtc-browser-fuzz-novelty-monitor.mjs ;;
			live_analysis_monitor_sha256) relative=bin/rtc-browser-fuzz-live-analysis-monitor.mjs ;;
			runner_sha256) relative=bin/rtc-browser-fuzz-runner.mjs ;;
			supervisor_sha256) relative=bin/rtc-browser-fuzz-supervisor.mjs ;;
			triage_watcher_sha256) relative=bin/rtc-browser-fuzz-triage-watcher.mjs ;;
		esac
		expected_hash=$(awk -F '\t' -v key="$field" '$1 == key { print $2; exit }' "$manifest")
		actual_hash=$(sha256sum "$product_repo/$relative" 2>/dev/null | awk '{ print $1 }')
		[ -n "$expected_hash" ] && [ "$actual_hash" = "$expected_hash" ] || {
			if restore_frozen_harness_from_control "$product_repo" "$relative" "$expected_hash"; then
				continue
			fi
			actual_age=$(file_age_seconds "$product_repo/$relative" 2>/dev/null || printf 999999)
			if [ -n "$expected_hash" ] && [ "$actual_age" -lt "$HARNESS_UPDATE_GRACE_SECONDS" ]; then
				log "deferring fresh harness hash mismatch during publication path=$relative age=${actual_age}s grace=${HARNESS_UPDATE_GRACE_SECONDS}s actual=${actual_hash:-missing} expected=$expected_hash"
				return 1
			fi
			printf 'frozen harness hash mismatch path=%s actual=%s expected=%s' "$relative" "${actual_hash:-missing}" "${expected_hash:-missing}"
			return 0
		}
		control_hash=$(sha256sum "$REPO/$relative" 2>/dev/null | awk '{ print $1 }')
		if [ -n "$control_hash" ] && [ "$control_hash" != "$expected_hash" ]; then
			control_age=$(file_age_seconds "$REPO/$relative" 2>/dev/null || printf 999999)
			if [ "$control_age" -lt "$HARNESS_UPDATE_GRACE_SECONDS" ]; then
				log "deferring fresh versioned harness advance path=$relative age=${control_age}s grace=${HARNESS_UPDATE_GRACE_SECONDS}s control=$control_hash frozen=$expected_hash"
				return 1
			fi
			if restore_control_harness_from_frozen "$product_repo" "$relative" "$expected_hash"; then
				continue
			fi
			printf 'versioned harness drift restore failed path=%s control=%s frozen=%s' "$relative" "$control_hash" "$expected_hash"
			return 0
		fi
	done
	unexpected=$(
		git -C "$product_repo" diff --name-only HEAD 2>/dev/null |
			awk '
				$0 == ".wp-env.test.json" { next }
				$0 ~ /^bin\/rtc-/ { next }
				$0 == "packages/env/lib/runtime/docker/build-docker-compose-config.js" { next }
				$0 ~ /^packages\/e2e-tests\/plugins\/rtc-websocket-provider\// { next }
				$0 == "test/e2e/config/global-setup.ts" { next }
				$0 == "test/e2e/config/rtc-websocket-setup.ts" { next }
				$0 ~ /^test\/e2e\/specs\/editor\/collaboration\// { next }
				{ print; exit }
			'
	)
	[ -z "$unexpected" ] || {
		printf 'unexpected candidate product modification=%s' "$unexpected"
		return 0
	}
	return 1
}

coverage_monitor_pid_for_root() {
	local root=$1 pid
	for pid in $(pgrep -f 'node bin/rtc-browser-fuzz-novelty-monitor.mjs' 2>/dev/null || true); do
		[ -r "/proc/$pid/environ" ] || continue
		if tr '\0' '\n' < "/proc/$pid/environ" | grep -Fxq "RTC_FUZZ_NOVELTY_OUTPUT_DIR=$root"; then
			printf '%s\n' "$pid"
			return 0
		fi
	done
	return 1
}

stop_stale_coverage_monitors() {
	local current_root pid output_root
	current_root=$(sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)
	[ -n "$current_root" ] || return 0
	for pid in $(pgrep -f '[n]ode bin/rtc-browser-fuzz-novelty-monitor[.]mjs' 2>/dev/null || true); do
		[ -r "/proc/$pid/environ" ] || continue
		output_root=$(tr '\0' '\n' < "/proc/$pid/environ" | sed -n 's/^RTC_FUZZ_NOVELTY_OUTPUT_DIR=//p' | head -1)
		[ -n "$output_root" ] && [ "$output_root" != "$current_root" ] || continue
		log "stopping stale-root novelty monitor pid=$pid output=$output_root current=$current_root"
		kill -TERM "$pid" 2>/dev/null || true
	done
	return 0
}

reattach_current_coverage_run() {
	local root pid waited
	if coverage_start_in_progress; then
		log "coverage reattach skipped because a serialized coverage start is in progress"
		return 0
	fi
	root=$(sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt" 2>/dev/null || true)
	[ -n "$root" ] && [ -d "$root" ] && [ -x "$root/run-monitor.sh" ] || return 1
	coverage_supervisor_state_matches_current_root "$root" || return 1
	if coverage_candidate_source_problem >/dev/null; then
		return 1
	fi

	pid=$(coverage_monitor_pid_for_root "$root" || true)
	if has_session rtc-coverage-guided-novelty && [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
		return 0
	fi
	if has_session rtc-coverage-guided-novelty; then
		tmux kill-session -t rtc-coverage-guided-novelty 2>/dev/null || true
	fi
	if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
		log "stopping orphaned current-run novelty monitor before reattach pid=$pid root=$root"
		kill -TERM "$pid" 2>/dev/null || true
	fi
	waited=0
	while [ "$waited" -lt 5 ] && [ -n "$(coverage_monitor_pid_for_root "$root" || true)" ]; do
		sleep 1
		waited=$(( waited + 1 ))
	done
	pid=$(coverage_monitor_pid_for_root "$root" || true)
	[ -z "$pid" ] || kill -KILL "$pid" 2>/dev/null || true
	rm -f "$root/.novelty-monitor-process.json"
	tmux new-session -d -s rtc-coverage-guided-novelty -c "$CANDIDATE_REPO" "$root/run-monitor.sh" || return 1
	sleep 3
	has_session rtc-coverage-guided-novelty || return 1
	if ! has_session rtc-coverage-guided-watchdog; then
		bash "$REPO/bin/rtc-coverage-guided-watchdog-start-remote.sh" >> "$LOG_DIR/coverage-watchdog-start.log" 2>&1 || return 1
	fi
	log "reattached coverage novelty monitor to current valid run root=$root"
	return 0
}

coverage_materialization_stalled() {
	local grace=${RTC_GUARD_COVERAGE_MATERIALIZATION_GRACE_SECONDS:-900}
	local root age

	[ -f "$COVERAGE_BASE/current-output-dir.txt" ] || return 1
	root=$(sed -n '1p' "$COVERAGE_BASE/current-output-dir.txt")
	[ -n "$root" ] && [ -d "$root" ] || return 1
	age=$(file_age_seconds "$COVERAGE_BASE/current-output-dir.txt") || return 1
	if [ "$age" -lt "$grace" ]; then
		return 1
	fi

	node - "$root" <<'NODE'
const fs = require( 'fs' );
const path = require( 'path' );
const root = process.argv[ 2 ];
const readJson = ( file ) => {
	try {
		return JSON.parse( fs.readFileSync( file, 'utf8' ) );
	} catch {
		return null;
	}
};
const readText = ( file ) => {
	try {
		return fs.readFileSync( file, 'utf8' );
	} catch {
		return '';
	}
};
const groups = readJson( path.join( root, 'supervisor-groups.json' ) );
const state = readJson( path.join( root, 'supervisor-state.json' ) );
const status = readText( path.join( root, 'novelty-status.md' ) );
const sectionText = ( heading ) => {
	const marker = `## ${ heading }`;
	const start = status.indexOf( marker );
	if ( start === -1 ) {
		return '';
	}
	const next = status.indexOf( '\n## ', start + marker.length );
	return status.slice( start, next === -1 ? undefined : next );
};
const parseMetric = ( text, label ) => {
	const match = text.match( new RegExp( `- ${ label.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ) }:\\s*([0-9.]+)` ) );
	if ( ! match ) {
		return null;
	}
	return Number( match[ 1 ] );
};
const activeTriage = sectionText( 'Triage Yield' ) || status;
const drainTriage = sectionText( 'Current Drain Triage Yield' );
const signatures = parseMetric( activeTriage, 'signatures' );
const duplicateShare = parseMetric( activeTriage, 'top duplicate family share' );
const likelyReal = parseMetric( activeTriage, 'likely-real visible' );
const activeNoiseClear =
	( signatures === null || signatures === 0 || duplicateShare === 0 ) &&
	( likelyReal === null || likelyReal === 0 );
const drainMetrics = [
	parseMetric( drainTriage, 'raw signatures' ),
	parseMetric( drainTriage, 'no-product raw signatures' ),
	parseMetric( drainTriage, 'suppressed strict startup records' ),
	parseMetric( drainTriage, 'suppressed strict startup virtual signatures' ),
	parseMetric( drainTriage, 'raw top duplicate family share' ),
	parseMetric( drainTriage, 'no-product raw top duplicate family share' ),
];
const drainNoiseClear =
	! drainTriage ||
	drainMetrics.every( ( value ) => value === null || value === 0 );
const policyHoldingEmptyCoverage =
	/hold-empty-coverage-no-safe-fallback|hold-materialization-floor-no-safe-group/.test(
		status
	);
const currentNoiseClear =
	activeNoiseClear && drainNoiseClear && ! policyHoldingEmptyCoverage;
const groupCount = Array.isArray( groups ) ? groups.length : null;
const stateGroups = Array.isArray( state?.groups ) ? state.groups : null;
const activeRunDirs = ( stateGroups || [] ).reduce(
	( count, group ) => count + ( Array.isArray( group.activeRunDirs ) ? group.activeRunDirs.filter( Boolean ).length : 0 ),
	0
);
const emptyGroupFile = groupCount === 0;
const noMaterializedState = stateGroups && stateGroups.length === 0 && activeRunDirs === 0;
if ( currentNoiseClear && ( emptyGroupFile || noMaterializedState ) ) {
	process.exit( 0 );
}
process.exit( 1 );
NODE
}

record_restart() {
	local pool=$1
	local reason=$2
	printf '%s\t%s\t%s\n' "$(date -u +%s)" "$pool" "$reason" >> "$EVENTS"
}

restart_cooldown_active() {
	local pool=$1
	local reason=$2
	local cooldown
	local now last age
	case "$pool" in
		coverage|deferred|pr-progress|finalization|critical-pr|resource|structural)
			cooldown=${RTC_GUARD_CORE_RESTART_COOLDOWN_SECONDS:-120}
			;;
		*)
			cooldown=${RTC_GUARD_RESTART_COOLDOWN_SECONDS:-900}
			;;
	esac

	[ "$cooldown" -gt 0 ] || return 1
	now=$(date -u +%s)
	last=$(
		awk -F '\t' -v pool="$pool" '
			$2 == pool && $1 > last { last = $1 }
			END { if (last) print last }
		' "$EVENTS" 2>/dev/null || true
	)
	[ -n "$last" ] || return 1
	age=$(( now - last ))
	if [ "$age" -ge 0 ] && [ "$age" -lt "$cooldown" ]; then
		log "restart suppressed by cooldown pool=$pool reason=$reason age=${age}s cooldown=${cooldown}s"
		return 0
	fi
	return 1
}

clear_stale_lock_holder() {
	local pid comm ppid args

	if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
		return
	fi

	for pid in $(fuser "$LOCK_FILE" 2>/dev/null || true); do
		comm=$(ps -o comm= -p "$pid" 2>/dev/null || true)
		comm=$(printf '%s' "$comm" | awk '{$1=$1};1')
		ppid=$(ps -o ppid= -p "$pid" 2>/dev/null || true)
		ppid=$(printf '%s' "$ppid" | tr -d ' ')
		args=$(ps -o args= -p "$pid" 2>/dev/null || true)
		case "$args" in
			*"start_rtc_jetstream_guard.sh run"*|*"rtc-jetstream-guard-remote.sh run"*)
				log "recovering guard pid file for live run lock holder pid=$pid"
				printf '%s\n' "$pid" > "$PID_FILE"
				return
				;;
		esac
		if [ "$comm" = sleep ] && [ "$ppid" = 1 ]; then
			log "killing stale guard sleep lock holder pid=$pid"
			kill "$pid" 2>/dev/null || true
			sleep 1
			if kill -0 "$pid" 2>/dev/null; then
				kill -KILL "$pid" 2>/dev/null || true
			fi
		fi
	done
}

maybe_launch_codex() {
	local pool=$1
	local reason=$2
	local now recent session prompt report codex_log codex_workers
	[ "$ENABLE_GUARD_CODEX" = "1" ] || return 0
	codex_workers=$(active_codex_worker_count)
	if [ "$codex_workers" -ge "$MAX_CODEX_WORKERS" ]; then
		log "guard Codex launch suppressed by worker cap pool=$pool workers=$codex_workers cap=$MAX_CODEX_WORKERS"
		return 0
	fi
	now=$(date -u +%s)
	recent=$(
		awk -F '\t' -v since=$(( now - 1800 )) -v pool="$pool" \
			'$1 >= since && $2 == pool { count++ } END { print count + 0 }' \
			"$EVENTS" 2>/dev/null || printf '0'
	)
	if [ "$recent" -lt 2 ]; then
		return
	fi
	if tmux ls 2>/dev/null | grep -q '^rtc-guard-codex-'; then
		return
	fi

	session=rtc-guard-codex-$(date -u +%Y%m%dT%H%M%SZ)
	prompt=$LOG_DIR/$session.prompt.md
	report=$LOG_DIR/$session.report.md
	codex_log=$LOG_DIR/$session.stderr.log
	cat > "$prompt" <<PROMPT
You are running inside Jetstream2 on the Gutenberg RTC fuzzing project. Do not use API subagents. Work locally in this tmux/Codex process.

The outside-tmux guard restarted pool "$pool" at least twice in the last 30 minutes.
Most recent reason: $reason

Inspect these logs and current tmux/process state:
- Guard: $LOG_DIR/guard.log and $EVENTS
- Coverage guided: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/
- Strict expansion: /media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515/logs/
- Focused shards: /media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515/logs/
- Gap booster: /media/volume/danluu-fuzz-data/rtc-gap-booster-20260515/logs/
- Lower-level fuzzing: /media/volume/danluu-fuzz-data/rtc-lower-level-fuzz-20260516/ and /media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-20260516/
- Duplicate/noise persona loop: /media/volume/danluu-fuzz-data/rtc-duplicate-noise-persona-loop-20260516/
- Level-mix controller: $LEVEL_MIX_BASE/
- Native/protocol harness loops: $NATIVE_ASSERT_BASE/
- Structural watchdog: $STRUCTURAL_BASE/
- Fuzz-only assertion loop: /media/volume/danluu-fuzz-data/rtc-fuzz-only-asserts-20260515/
- Repo root: $REPO

Task:
1. Determine why the supervised fuzzing pool is repeatedly disappearing or stalling.
2. Identify the smallest useful operational or harness fix if one is evident, but do not edit live files or restart loops from this diagnostic job.
3. Do not add behavior-disable flags such as DISABLE_SYNC_FAULTS, DISABLE_PARSER_STRESS, DISABLE_REVISION_RESTORE, DISABLE_RELOAD, or DISABLE_RANDOM_RELOAD.
4. Include exact proposed edits and focused validation commands in the report.
5. Write a concise report to: $report
PROMPT
	log "launching $session for repeated restarts in $pool: $reason"
	tmux new-session -d -s "$session" "bash -lc 'cd \"$LOG_DIR\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\"; \"$CODEX_BIN_DIR/codex\" -a never exec --skip-git-repo-check -m gpt-5.6-sol -c model_reasoning_effort=xhigh -s read-only < \"$prompt\" > \"$report\" 2> \"$codex_log\"'"
}

refresh_stable_script() {
	local relative=$1 stable=$2 canonical=$REPO/$relative
	if [ -x "$canonical" ] && { [ ! -x "$stable" ] || ! cmp -s "$canonical" "$stable"; }; then
		install -m 755 "$canonical" "$stable" || true
	fi
	[ -x "$stable" ]
}

refresh_optional_stable_launchers() {
	local relative stable
	while IFS=$'\t' read -r relative stable; do
		refresh_stable_script "$relative" "$stable" || true
	done <<'LAUNCHERS'
bin/rtc-strict-expansion-start-remote.sh	/tmp/start_rtc_strict_expansion.sh
bin/rtc-focused-shards-start-remote.sh	/tmp/start_rtc_focused_shards.sh
bin/rtc-focused-shards-cleanup-remote.sh	/tmp/cleanup_rtc_focused_shards.sh
bin/rtc-focused-shards-gap-codex-loop-remote.sh	/tmp/start_rtc_focused_gap_codex_loop.sh
bin/rtc-gap-booster-start-remote.sh	/tmp/start_rtc_gap_booster.sh
LAUNCHERS
}

run_versioned_launcher() {
	local relative=$1 stable=$2 canonical=$REPO/$relative
	refresh_stable_script "$relative" "$stable" || true
	if [ -x "$stable" ]; then
		"$stable"
	elif [ -x "$canonical" ]; then
		"$canonical"
	else
		return 1
	fi
}

restart_pool() {
	local pool=$1
	local reason=$2
	if restart_cooldown_active "$pool" "$reason"; then
		return
	fi
	if ! global_cpu_admission_allows "$pool"; then
		return
	fi
	log "restart requested pool=$pool reason=$reason"
	record_restart "$pool" "$reason"
	maybe_launch_codex "$pool" "$reason"
	case "$pool" in
		coverage)
			RTC_COVERAGE_FORCE_RESTART=1 bash "$REPO/bin/rtc-coverage-guided-start-remote.sh" >> "$LOG_DIR/coverage-start.log" 2>&1 || log "coverage start failed"
			bash "$REPO/bin/rtc-coverage-guided-watchdog-start-remote.sh" >> "$LOG_DIR/coverage-watchdog-start.log" 2>&1 || log "coverage watchdog start failed"
			;;
		strict)
			RTC_STRICT_EXPANSION_ENABLED_NAMES="$OPTIONAL_STRICT_ENABLED_NAMES" \
				run_versioned_launcher bin/rtc-strict-expansion-start-remote.sh /tmp/start_rtc_strict_expansion.sh >> "$LOG_DIR/strict-start.log" 2>&1 || log "strict start failed"
			;;
		focused)
			refresh_stable_script bin/rtc-focused-shards-cleanup-remote.sh /tmp/cleanup_rtc_focused_shards.sh || true
			RTC_FOCUSED_SHARDS_ENABLED_NAMES="$OPTIONAL_FOCUSED_ENABLED_NAMES" \
				run_versioned_launcher bin/rtc-focused-shards-start-remote.sh /tmp/start_rtc_focused_shards.sh >> "$LOG_DIR/focused-start.log" 2>&1 || log "focused start failed"
			;;
		focused-gap)
			run_versioned_launcher bin/rtc-focused-shards-gap-codex-loop-remote.sh /tmp/start_rtc_focused_gap_codex_loop.sh >> "$LOG_DIR/focused-gap-start.log" 2>&1 || log "focused gap loop start failed"
			;;
		gap-booster)
			run_versioned_launcher bin/rtc-gap-booster-start-remote.sh /tmp/start_rtc_gap_booster.sh >> "$LOG_DIR/gap-booster-start.log" 2>&1 || log "gap booster start failed"
			;;
		lower-level)
			if ! has_lower_level_session; then
				RTC_LOWER_LEVEL_GROUP_NAME=unit-property-http-polling-canary \
					RTC_LOWER_LEVEL_PROFILE=rtc-http-polling-manager-canary \
					RTC_LOWER_LEVEL_TEST_PATH=packages/sync/src/providers/http-polling/test/polling-manager.coverage-fuzz.test.ts \
					RTC_LOWER_LEVEL_SEED_COUNT=1 \
					RTC_LOWER_LEVEL_CASE_COUNT=12 \
					RTC_LOWER_LEVEL_PLACEMENT_CASE_COUNT=0 \
					RTC_LOWER_LEVEL_MAX_GENERATED_EXECUTIONS="$LOWER_LEVEL_HTTP_CANARY_MAX_EXECUTIONS" \
					RTC_LOWER_LEVEL_FAILURE_SLEEP_SECONDS=0 \
					RTC_LOWER_LEVEL_STATIC_INPUTS_JSON= \
					RTC_LOWER_LEVEL_STATIC_INPUTS_JSON_B64="$LOWER_LEVEL_HTTP_CANARY_STATIC_INPUTS_B64" \
					bash "$REPO/bin/rtc-lower-level-fuzz-loop-remote.sh" start >> "$LOG_DIR/lower-level-start.log" 2>&1 || log "unit/property lower-level start failed"
			fi
			;;
		cg-lower-level)
			if ! coverage_guided_lower_level_b64_satisfied; then
				start_coverage_guided_lower_level_b64_or_replacement
			fi
			;;
		duplicate-noise)
			tmux kill-session -t rtc-duplicate-noise-persona-loop 2>/dev/null || true
			tmux new-session -d -s rtc-duplicate-noise-persona-loop \
				"bash -lc 'cd \"$REPO\"; export PATH=\"$CODEX_BIN_DIR:$TMUX_WRAP:$NODE_BIN:\$PATH\"; bash \"$REPO/bin/rtc-duplicate-noise-persona-loop-remote.sh\" >> \"$LOG_DIR/duplicate-noise-loop.log\" 2>&1'" ||
				log "duplicate/noise persona loop start failed"
			;;
		level-mix)
			bash "$REPO/bin/rtc-fuzz-level-mix-persona-loop-remote.sh" >> "$LOG_DIR/level-mix-start.log" 2>&1 || log "level-mix loop start failed"
			;;
		native-protocol)
			bash "$REPO/bin/rtc-native-assert-protocol-work-start-remote.sh" >> "$LOG_DIR/native-protocol-start.log" 2>&1 || log "native/protocol loop start failed"
			;;
		asserts)
			run_versioned_launcher bin/rtc-fuzz-only-asserts-loop-remote.sh /tmp/start_rtc_fuzz_only_asserts_loop.sh >> "$LOG_DIR/fuzz-only-asserts-start.log" 2>&1 || log "fuzz-only asserts loop start failed"
			;;
		deferred)
			stop_unsupervised_deferred_controller
			run_versioned_launcher bin/rtc-deferred-work-promotion-loop-remote.sh /tmp/start_rtc_deferred_work_promotion_loop.sh >> "$LOG_DIR/deferred-work-start.log" 2>&1 || log "deferred work promotion loop start failed"
			;;
		pr-progress)
			mkdir -p "$PR_PROGRESS_BASE"
			install -m 755 "$REPO/bin/rtc-pr-progress-controller-remote.sh" "$PR_PROGRESS_BASE/rtc-pr-progress-controller.sh"
			RTC_PR_PROGRESS_PERSONA_EVERY_CYCLES=0 \
				"$PR_PROGRESS_BASE/rtc-pr-progress-controller.sh" start >> "$LOG_DIR/pr-progress-controller-start.log" 2>&1 || log "PR progress controller start failed"
			;;
		finalization)
			stop_orphaned_finalization_controllers
			run_versioned_launcher bin/rtc-pr-finalization-loop-remote.sh /tmp/start_rtc_pr_finalization_loop.sh >> "$LOG_DIR/pr-finalization-start.log" 2>&1 || log "PR finalization loop start failed"
			;;
		critical-pr)
			cd "$REPO"
			bash "$REPO/bin/rtc-critical-path-pr-executor-loop-remote.sh" start >> "$LOG_DIR/critical-pr-executor-start.log" 2>&1 || log "critical-path PR executor start failed"
			;;
		productive-analysis)
			cd "$REPO"
			bin/rtc-productive-analysis-loop-remote.sh start >> "$LOG_DIR/productive-analysis-start.log" 2>&1 || log "productive analysis loop start failed"
			;;
		resource)
			tmux kill-session -t rtc-resource-autoscaler 2>/dev/null || true
			stop_unsupervised_resource_autoscaler
			tmux new-session -d -s rtc-resource-autoscaler "bash -lc '$RESOURCE_BASE/rtc-resource-autoscaler.sh >> \"$LOG_DIR/resource-autoscaler-start.log\" 2>&1'" ||
				log "resource autoscaler start failed"
			;;
		disk-maintenance)
			if [ -f "$DISK_MAINTENANCE_HOLD_FILE" ]; then
				log "disk maintenance restart skipped hold=$DISK_MAINTENANCE_HOLD_FILE"
				return 0
			fi
			if [ -x /tmp/start_rtc_disk_maintenance.sh ]; then
				tmux new-session -d -s rtc-disk-maintenance "bash -lc '/tmp/start_rtc_disk_maintenance.sh >> \"$LOG_DIR/disk-maintenance-start.log\" 2>&1'" ||
					log "disk maintenance start failed"
			else
				tmux new-session -d -s rtc-disk-maintenance "bash -lc 'cd \"$REPO\"; bin/rtc-disk-maintenance-remote.sh >> \"$LOG_DIR/disk-maintenance-start.log\" 2>&1'" ||
					log "disk maintenance start failed"
			fi
			;;
		structural)
			if [ -f "$STRUCTURAL_HOLD_FILE" ]; then
				log "structural watchdog restart skipped hold=$STRUCTURAL_HOLD_FILE"
				return 0
			fi
			run_versioned_launcher bin/rtc-structural-issue-watchdog-remote.sh /tmp/start_rtc_structural_watchdog.sh >> "$LOG_DIR/structural-watchdog-start.log" 2>&1 || log "structural watchdog start failed"
			;;
	esac
}

run_loop() {
	if ! flock -n --close "$LOCK_FILE" "$0" run-locked; then
		log "another guard loop already holds $LOCK_FILE"
		exit 0
	fi
}

run_loop_locked() {
	printf '%s\n' "$$" > "$PID_FILE"
	child_pid=""
	child_pid_is_group=0
	cleanup() {
		if [ -n "$child_pid" ]; then
			if [ "$child_pid_is_group" = 1 ]; then
				kill -TERM -- "-$child_pid" 2>/dev/null || kill "$child_pid" 2>/dev/null || true
			else
				kill "$child_pid" 2>/dev/null || true
			fi
			wait "$child_pid" 2>/dev/null || true
		fi
		rm -f "$PID_FILE"
	}
	trap cleanup EXIT
	trap 'cleanup; exit 0' INT TERM
	touch "$EVENTS"
	log "guard loop started pid=$$"
	while true; do
		check_tmux_server_generation
		audit_codex_model_policy
		stop_noncompliant_optional_analysis_codex
		stop_orphaned_finalization_controllers
		stop_codex_in_control_repo
		stop_stale_coverage_monitors
		stop_disabled_analysis_loops
		trim_optional_live_analysis_codex
		refresh_optional_stable_launchers
		run_docker_network_maintenance
		coverage_needs_restart=0
			if ! has_session rtc-coverage-guided-novelty; then
				if coverage_start_in_progress; then
					:
				elif reattach_current_coverage_run; then
					:
				else
					coverage_needs_restart=1
				fi
			elif ! has_session rtc-coverage-guided-watchdog; then
				if coverage_start_in_progress; then
					:
				else
					log "coverage watchdog missing; restarting watchdog sidecar"
					bash "$REPO/bin/rtc-coverage-guided-watchdog-start-remote.sh" >> "$LOG_DIR/coverage-watchdog-start.log" 2>&1 || log "coverage watchdog start failed"
				fi
			elif ! coverage_supervisor_session_exists; then
				if coverage_start_in_progress || coverage_supervisor_in_startup_grace; then
					:
			else
				coverage_needs_restart=1
			fi
		fi
		if [ "$coverage_needs_restart" = 1 ]; then
			restart_pool coverage "missing coverage-guided tmux session"
		elif source_problem=$(coverage_candidate_source_problem); then
			restart_pool coverage "candidate source invariant failed: $source_problem"
		elif has_session rtc-coverage-guided-novelty && coverage_materialization_stalled; then
			restart_pool coverage "coverage-guided novelty materialization stalled with empty groups while current-run noise is clear"
		fi

		if ! has_session rtc-fuzz-strict-expansion ||
			! has_session rtc-fuzz-strict-expansion-watchdog ||
			! has_session rtc-fuzz-strict-expansion-analysis; then
			stop_browser_pool_sidecars_if_terminal_stale strict "missing strict-expansion tmux session"
			maybe_restart_optional_browser_pool strict "missing strict-expansion tmux session"
		elif stale_reason=$(browser_pool_supervisor_state_stale strict); then
			maybe_restart_optional_browser_pool strict "strict-expansion supervisor state stale: $stale_reason"
		fi

		if ! has_session rtc-focused-shards; then
			stop_browser_pool_sidecars_if_terminal_stale focused "missing focused-shards supervisor tmux session"
			maybe_restart_optional_browser_pool focused "missing focused-shards supervisor tmux session"
		else
			if stale_reason=$(browser_pool_supervisor_state_stale focused); then
				maybe_restart_optional_browser_pool focused "focused-shards supervisor state stale: $stale_reason"
			fi
			if ! has_session rtc-focused-shards-watchdog ||
				! has_session rtc-focused-shards-analysis; then
				log "focused sidecar missing; restarting focused sidecars"
				restart_focused_sidecars >> "$LOG_DIR/focused-sidecars-start.log" 2>&1 ||
					log "focused sidecar restart failed"
			fi
			if [ "$ENABLE_FOCUSED_GAP_CODEX" = "1" ] && ! has_session rtc-focused-shards-gap-codex-loop; then
				restart_pool focused-gap "missing focused Codex gap loop"
			fi
		fi

		if ! has_session rtc-gap-booster ||
			! has_session rtc-gap-booster-watchdog ||
			! has_session rtc-gap-booster-analysis; then
			stop_browser_pool_sidecars_if_terminal_stale gap-booster "missing gap-booster tmux session"
			maybe_restart_optional_browser_pool gap-booster "missing gap-booster tmux session"
		elif stale_reason=$(browser_pool_supervisor_state_stale gap-booster); then
			maybe_restart_optional_browser_pool gap-booster "gap-booster supervisor state stale: $stale_reason"
		fi

			if ! has_lower_level_session; then
				restart_pool lower-level "missing unit/property lower-level fuzz tmux session"
			fi

		if ! coverage_guided_lower_level_b64_satisfied; then
			restart_pool cg-lower-level "missing coverage-guided lower-level b64/replacement tmux session"
		fi

		if [ "$ENABLE_DUPLICATE_NOISE_REVIEW" = "1" ] && ! has_session rtc-duplicate-noise-persona-loop; then
			restart_pool duplicate-noise "missing duplicate/noise persona loop"
		fi

		if [ "$ENABLE_LEVEL_MIX_REVIEW" = "1" ] &&
			{ ! has_session rtc-fuzz-level-mix-persona-loop ||
				! has_session rtc-fuzz-level-mix-persona-loop-watchdog; }; then
			restart_pool level-mix "missing level-mix persona loop or watchdog"
		fi

		if [ "$ENABLE_NATIVE_PROTOCOL_REVIEW" = "1" ] &&
			{ ! has_session rtc-native-harness-persona-loop ||
				! has_session rtc-protocol-server-persona-loop; }; then
			restart_pool native-protocol "missing native/protocol persona loop"
		fi

		if [ "$ENABLE_ASSERT_REVIEW" = "1" ] && ! has_session rtc-fuzz-only-asserts-loop; then
			restart_pool asserts "missing fuzz-only assertion loop"
		fi

		if ! has_session rtc-deferred-work-promotion-loop; then
			restart_pool deferred "missing deferred work promotion loop"
		fi

		if has_session rtc-pr-progress-controller-loop && ! pr_progress_controller_runtime_healthy; then
			log "replacing stale PR progress controller runtime or persona cadence"
			"$PR_PROGRESS_BASE/rtc-pr-progress-controller.sh" stop >> "$LOG_DIR/pr-progress-controller-start.log" 2>&1 || true
			restart_pool pr-progress "stale PR progress controller runtime or persona cadence"
		elif ! has_session rtc-pr-progress-controller-loop; then
			restart_pool pr-progress "missing PR progress controller loop"
		fi

		if ! has_session rtc-pr-finalization-loop; then
			restart_pool finalization "missing PR finalization loop"
		fi

		if ! has_session rtc-critical-path-pr-executor-loop; then
			restart_pool critical-pr "missing critical-path PR executor loop"
		fi

		if ! has_session rtc-productive-analysis-loop; then
			restart_pool productive-analysis "missing productive analysis loop"
		fi

		if ! has_session rtc-resource-autoscaler; then
			restart_pool resource "missing resource autoscaler"
		fi

		if [ -f "$DISK_MAINTENANCE_HOLD_FILE" ]; then
			:
		elif ! has_session rtc-disk-maintenance; then
			restart_pool disk-maintenance "missing disk maintenance loop"
		fi

		if [ -f "$STRUCTURAL_HOLD_FILE" ]; then
			:
		elif ! has_session rtc-structural-issue-watchdog; then
			restart_pool structural "missing structural issue watchdog"
		fi

		sleep 120 &
		child_pid=$!
		child_pid_is_group=0
		wait "$child_pid" 2>/dev/null || true
		child_pid=""
	done
}

case "${1:-start}" in
	start)
		if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
			log "guard already running pid=$(cat "$PID_FILE")"
			exit 0
		fi
		clear_stale_lock_holder
		sleep 1
		setsid -f "$0" run >> "$LOG_DIR/guard.out" 2>&1 < /dev/null &
		sleep 1
		if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
			echo "guard pid=$(cat "$PID_FILE")"
		else
			echo "guard start requested"
		fi
		;;
	run)
		run_loop
		;;
	run-locked)
		run_loop_locked
		;;
	stop)
		if [ -f "$PID_FILE" ]; then
			kill "$(cat "$PID_FILE")" 2>/dev/null || true
			rm -f "$PID_FILE"
		fi
		;;
	status)
		if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
			echo "running pid=$(cat "$PID_FILE")"
		else
			echo "not running"
		fi
		;;
	reattach-coverage-once)
		reattach_current_coverage_run
		;;
	*)
		echo "usage: $0 [start|run|stop|status|reattach-coverage-once]" >&2
		exit 2
		;;
esac
