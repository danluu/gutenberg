#!/usr/bin/env bash
set -euo pipefail

tool="$1"
shift

refuse() {
	echo "rtc analysis guard: refusing to dump large fuzz artifact '$1'" >&2
	echo "rtc analysis guard: use bin/rtc-browser-fuzz-extract-summary-record.mjs for summary.ndjson, or inspect a specific small artifact file" >&2
	exit 64
}

for arg in "$@"; do
	case "$arg" in
		*summary.ndjson|*events.ndjson|*events.jsonl)
			refuse "$arg"
			;;
	esac

	if [ -f "$arg" ]; then
		case "$arg" in
			*/artifacts/rtc-browser-fuzz/*)
				size="$(wc -c < "$arg" | tr -d '[:space:]')"
				if [ "${size:-0}" -gt 524288 ]; then
					refuse "$arg"
				fi
				;;
		esac
	fi
done

case "$tool" in
	cat)
		exec /bin/cat "$@"
		;;
	head)
		exec /usr/bin/head "$@"
		;;
	sed)
		exec /usr/bin/sed "$@"
		;;
	tail)
		exec /usr/bin/tail "$@"
		;;
	*)
		echo "rtc analysis guard: unknown guarded tool '$tool'" >&2
		exit 127
		;;
esac
