#!/usr/bin/env bash

rtc_optional_browser_admission() {
	local pool=${1:-optional-browser}
	local resource_base=${RTC_RESOURCE_AUTOSCALER_BASE:-/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516}
	local status=$resource_base/resource-autoscaler-status.md
	local log=${RTC_OPTIONAL_BROWSER_ADMISSION_LOG:-$resource_base/optional-browser-admission.log}
	local reason load cores current desired now updated_epoch age

	mkdir -p "$(dirname "$log")"

	reason=$(sed -n 's/^- reason: //p' "$status" 2>/dev/null | tail -1)
	load=$(sed -n 's/^- load1: \([0-9.]*\) \/.*/\1/p' "$status" 2>/dev/null | tail -1)
	cores=$(sed -n 's/^- load1: [0-9.]* \/ \([0-9][0-9]*\) cores.*/\1/p' "$status" 2>/dev/null | tail -1)
	current=$(sed -n 's/^- current_budget: target=\([0-9][0-9]*\).*/\1/p' "$status" 2>/dev/null | tail -1)
	desired=$(sed -n 's/^- desired_budget: target=\([0-9][0-9]*\).*/\1/p' "$status" 2>/dev/null | tail -1)

	case "$reason" in
		pressure|high_pressure|severe_pressure)
			printf '[%s] block optional browser start pool=%s reason=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$pool" "$reason" >> "$log"
			return 1
			;;
	esac

	if [[ "$current" =~ ^[0-9]+$ && "$desired" =~ ^[0-9]+$ ]] && [ "$desired" -lt "$current" ]; then
		printf '[%s] block optional browser start pool=%s desired_budget=%s current_budget=%s reason=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$pool" "$desired" "$current" "${reason:-unknown}" >> "$log"
		return 1
	fi

	if [[ "$load" =~ ^[0-9.]+$ && "$cores" =~ ^[0-9]+$ ]] &&
		awk -v loadv="$load" -v cores="$cores" 'BEGIN { exit !(loadv >= cores * 0.90) }'; then
		printf '[%s] block optional browser start pool=%s load1=%s cores=%s reason=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$pool" "$load" "$cores" "${reason:-unknown}" >> "$log"
		return 1
	fi

	updated_epoch=$(stat -c %Y "$status" 2>/dev/null || true)
	if [[ "$updated_epoch" =~ ^[0-9]+$ ]]; then
		now=$(date +%s)
		age=$(( now - updated_epoch ))
		if [ "$age" -gt "${RTC_OPTIONAL_BROWSER_ADMISSION_STATUS_STALE_SECONDS:-360}" ]; then
			printf '[%s] block optional browser start pool=%s stale_status_age=%ss\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$pool" "$age" >> "$log"
			return 1
		fi
	fi

	printf '[%s] allow optional browser start pool=%s reason=%s load1=%s cores=%s current=%s desired=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$pool" "${reason:-unknown}" "${load:-unknown}" "${cores:-unknown}" "${current:-unknown}" "${desired:-unknown}" >> "$log"
	return 0
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
	rtc_optional_browser_admission "${1:-optional-browser}"
fi
