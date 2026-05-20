#!/usr/bin/env bash
set -euo pipefail

RESOURCE_BASE=${RTC_RESOURCE_AUTOSCALER_BASE:-/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516}
STATUS=${RTC_RESOURCE_AUTOSCALER_STATUS:-$RESOURCE_BASE/resource-autoscaler-status.md}
LOG=${RTC_GLOBAL_CPU_ADMISSION_LOG:-$RESOURCE_BASE/global-cpu-admission.log}
TMUX=${RTC_TMUX:-/usr/bin/tmux}
TMUX_SOCKET=${RTC_TMUX_SOCKET:-rtc-fuzz}

mkdir -p "$(dirname "$LOG")"

status_value() {
	local key=$1
	sed -n "s/^- ${key}: //p" "$STATUS" 2>/dev/null | tail -1
}

status_age_seconds() {
	local mtime now
	mtime=$(stat -c %Y "$STATUS" 2>/dev/null || true)
	[[ "$mtime" =~ ^[0-9]+$ ]] || {
		printf '999999\n'
		return
	}
	now=$(date +%s)
	printf '%s\n' "$(( now - mtime ))"
}

resource_reason() {
	local reason
	reason=$(status_value reason)
	printf '%s\n' "${reason:-unknown}"
}

class_quota() {
	local class=$1 reason=$2
	case "$class:$reason" in
		coverage-core:*)
			printf '999\n'
			;;
		optional-browser:severe_pressure|optional-browser:high_pressure|optional-browser:pressure|optional-browser:unknown)
			printf '0\n'
			;;
		optional-browser:steady|optional-browser:e2e_floor_repair|optional-browser:modest_headroom)
			printf '1\n'
			;;
		optional-browser:headroom|optional-browser:large_headroom)
			printf '2\n'
			;;
		lower-level:severe_pressure|lower-level:high_pressure|lower-level:pressure|lower-level:unknown)
			printf '0\n'
			;;
		lower-level:*)
			printf '2\n'
			;;
		backend-api:severe_pressure|backend-api:high_pressure|backend-api:pressure|backend-api:unknown)
			printf '0\n'
			;;
		backend-api:*)
			printf '1\n'
			;;
		protocol-server:severe_pressure|protocol-server:high_pressure|protocol-server:pressure|protocol-server:unknown)
			printf '0\n'
			;;
		protocol-server:*)
			printf '1\n'
			;;
		operator-correctness:severe_pressure|operator-correctness:high_pressure|operator-correctness:pressure|operator-correctness:unknown)
			printf '0\n'
			;;
		operator-correctness:*)
			printf '1\n'
			;;
		pr-validation:severe_pressure|pr-validation:unknown)
			printf '1\n'
			;;
		pr-validation:high_pressure|pr-validation:pressure)
			printf '1\n'
			;;
		pr-validation:*)
			printf '4\n'
			;;
		fuzz-assertion:*)
			printf '999\n'
			;;
		analysis:*|infrastructure:*)
			printf '999\n'
			;;
		*)
			printf '1\n'
			;;
	esac
}

class_regex() {
	case "$1" in
		optional-browser)
			printf '^(rtc-focused-shards|rtc-focused-shards-watchdog|rtc-focused-shards-analysis|rtc-fuzz-strict-expansion|rtc-fuzz-strict-expansion-watchdog|rtc-fuzz-strict-expansion-analysis|rtc-gap-booster|rtc-gap-booster-watchdog|rtc-gap-booster-analysis|rtc-cov-deep-novelty-)'
			;;
		lower-level)
			printf '^(rtc-lower-level-fuzz-loop|rtc-coverage-guided-lower-level|rtc-cg-parser-action-|rtc-native-action-)'
			;;
		backend-api)
			printf '^rtc-backend-api-fuzz'
			;;
		protocol-server)
			printf '^rtc-protocol-server-fuzz'
			;;
		operator-correctness)
			printf '^rtc-operator-correctness-(fuzz|watchdog)'
			;;
		pr-validation)
			printf '^(rtc-critical-validate-|rtc-benchmark-|rtc-pr-finalize-job-)'
			;;
		fuzz-assertion)
			printf '^$'
			;;
		coverage-core)
			printf '^rtc-coverage-guided-(novelty|supervisor|watchdog|analysis)$'
			;;
		*)
			printf '^$'
			;;
	esac
}

active_count() {
	local regex
	regex=$(class_regex "$1")
	"$TMUX" -L "$TMUX_SOCKET" list-sessions -F '#S' 2>/dev/null |
		awk -v regex="$regex" '$0 ~ regex { count++ } END { print count + 0 }'
}

emit_status() {
	local class=$1 reason age quota active
	reason=$(resource_reason)
	age=$(status_age_seconds)
	quota=$(class_quota "$class" "$reason")
	active=$(active_count "$class")
	printf 'class=%s reason=%s status_age=%s quota=%s active=%s\n' "$class" "$reason" "$age" "$quota" "$active"
}

allow() {
	local class=$1 label=${2:-$1} reason age quota active now
	reason=$(resource_reason)
	age=$(status_age_seconds)
	quota=$(class_quota "$class" "$reason")
	active=$(active_count "$class")
	now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
	if [ "$class" != "analysis" ] && [ "$class" != "infrastructure" ] && [ "$age" -gt "${RTC_GLOBAL_CPU_STATUS_STALE_SECONDS:-360}" ]; then
		printf '[%s] block class=%s label=%s stale_status_age=%ss quota=%s active=%s\n' "$now" "$class" "$label" "$age" "$quota" "$active" >> "$LOG"
		return 1
	fi
	if [ "$active" -ge "$quota" ]; then
		printf '[%s] block class=%s label=%s reason=%s quota=%s active=%s\n' "$now" "$class" "$label" "$reason" "$quota" "$active" >> "$LOG"
		return 1
	fi
	printf '[%s] allow class=%s label=%s reason=%s quota=%s active=%s\n' "$now" "$class" "$label" "$reason" "$quota" "$active" >> "$LOG"
	return 0
}

wait_for_allow() {
	local class=$1 label=${2:-$1} sleep_seconds=${RTC_GLOBAL_CPU_ADMISSION_WAIT_SECONDS:-30}
	while ! allow "$class" "$label"; do
		sleep "$sleep_seconds"
	done
}

case "${1:-status}" in
	status)
		emit_status "${2:-pr-validation}"
		;;
	allow)
		allow "${2:?class required}" "${3:-$2}"
		;;
	wait)
		wait_for_allow "${2:?class required}" "${3:-$2}"
		;;
	quota)
		class_quota "${2:?class required}" "$(resource_reason)"
		;;
	active)
		active_count "${2:?class required}"
		;;
	*)
		echo "usage: $0 [status|allow|wait|quota|active] <class> [label]" >&2
		exit 2
		;;
esac
