#!/usr/bin/env bash
set -euo pipefail

OPS_DIR="${RTC_TREND_OPS_DIR:-/private/tmp/rtc-jetstream2-trend-autoupdate}"
JETSTREAM_HOST="${RTC_JETSTREAM_HOST:-exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org}"
REMOTE_DIR="${RTC_TREND_REMOTE_EVIDENCE_DIR:-/media/volume/danluu-fuzz-data/rtc-graph-refresh-tmp/evidence}"
EVIDENCE="${1:-$OPS_DIR/latest-trend-evidence.md}"

if [ ! -f "$EVIDENCE" ]; then
	printf 'missing evidence file: %s\n' "$EVIDENCE" >&2
	exit 2
fi

ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$JETSTREAM_HOST" "mkdir -p '$REMOTE_DIR'"
scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$EVIDENCE" "$JETSTREAM_HOST:$REMOTE_DIR/latest-trend-evidence.md"
printf '%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$OPS_DIR/latest-trend-evidence.published-at"
scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$OPS_DIR/latest-trend-evidence.published-at" "$JETSTREAM_HOST:$REMOTE_DIR/latest-trend-evidence.published-at"
