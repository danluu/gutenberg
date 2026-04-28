#!/usr/bin/env bash

set -u

ATTEMPTS="${ATTEMPTS:-60}"
CONCURRENCY="${CONCURRENCY:-3}"
CURL_MAX_TIME="${CURL_MAX_TIME:-30}"
WP_USER="${WP_USER:-admin}"
WP_PASSWORD="${WP_PASSWORD:-}"
BASE_URL="${BASE_URL:-}"
START_WP_ENV=1
KEEP_ALL=0
CLEANUP_SUCCESS=0
RUN_ID="rtc-room-split-normal-$(date +%s)-$$"
APP_NAME="$RUN_ID"
APP_UUID=""
CREATED_APP_PASSWORD=0
FOUND_POST_ID=""
FOUND_ROOM=""
FOUND_HASH=""
POST_IDS_FILE="$(mktemp -t rtc-room-split-posts.XXXXXX)"
REQUEST_DIR="$(mktemp -d -t rtc-room-split-requests.XXXXXX)"

usage() {
	cat <<'USAGE'
Reproduce the RTC first-room storage split using only normal REST traffic.

This does not install filters, mu-plugins, server sleeps, database locks, or any
forced interleaving. It creates fresh draft posts and sends concurrent first
polls to /wp-sync/v1/updates. On vulnerable code, one room can end up with
more than one md5(room) wp_sync_storage lineage. Depending on timing, the
duplicate can have the exact same post_name or a suffixed md5(room)-2 post_name.

Run from a Gutenberg checkout with wp-env available:

  bash docs/explanations/fuzzer-bugs/rtc-issue-08-normal-rest-repro.sh

Environment/options:

  ATTEMPTS=N or --attempts N          Fresh rooms to try. Default: 60
  CONCURRENCY=N or --concurrency N    Concurrent first polls per room. Default: 3
  BASE_URL=URL or --url URL           WordPress URL. Default: wp option siteurl
  WP_USER=USER or --user USER         User for REST Basic Auth. Default: admin
  WP_PASSWORD=PASS or --password PASS Application password. Default: create temp
  --no-start                          Do not start wp-env if it is not running
  --keep-all                          Keep all generated draft/storage rows
  --cleanup-success                   Delete the successful split rows too

By default, unsuccessful generated rooms are cleaned up. If a split is found,
the successful generated post and storage rows are left in place for inspection.
Use --cleanup-success to remove those too.
USAGE
}

log() {
	printf '%s\n' "$*"
}

die() {
	printf 'error: %s\n' "$*" >&2
	exit 1
}

is_positive_integer() {
	case "$1" in
		''|*[!0-9]*)
			return 1
			;;
	esac

	[ "$1" -gt 0 ]
}

run_wp_env() {
	npm run --silent wp-env -- "$@"
}

run_wp() {
	run_wp_env run cli wp "$@"
}

md5_hex() {
	node -e 'process.stdout.write(require("crypto").createHash("md5").update(process.argv[1]).digest("hex"))' "$1"
}

cleanup_post_and_storage() {
	post_id="$1"
	room="postType/post:$post_id"
	room_hash="$(md5_hex "$room")"

	run_wp db query "DELETE pm FROM wp_postmeta pm INNER JOIN wp_posts p ON p.ID = pm.post_id WHERE p.post_type = 'wp_sync_storage' AND ( p.post_name = '$room_hash' OR p.post_name LIKE '$room_hash-%' )" >/dev/null 2>&1 || true
	run_wp db query "DELETE FROM wp_posts WHERE post_type = 'wp_sync_storage' AND ( post_name = '$room_hash' OR post_name LIKE '$room_hash-%' )" >/dev/null 2>&1 || true
	run_wp post delete "$post_id" --force >/dev/null 2>&1 || true
}

cleanup() {
	status=$?

	rm -rf "$REQUEST_DIR"

	if [ "$CREATED_APP_PASSWORD" -eq 1 ] && [ -n "$APP_UUID" ]; then
		run_wp user application-password delete "$WP_USER" "$APP_UUID" >/dev/null 2>&1 || true
	fi

	if [ "$KEEP_ALL" -eq 0 ] && [ -f "$POST_IDS_FILE" ]; then
		while IFS= read -r post_id; do
			[ -n "$post_id" ] || continue
			if [ "$CLEANUP_SUCCESS" -eq 0 ] && [ "$post_id" = "$FOUND_POST_ID" ]; then
				continue
			fi
			cleanup_post_and_storage "$post_id"
		done < "$POST_IDS_FILE"
	fi

	rm -f "$POST_IDS_FILE"
	exit "$status"
}
trap cleanup EXIT

while [ "$#" -gt 0 ]; do
	case "$1" in
		--attempts)
			[ "$#" -ge 2 ] || die '--attempts requires a value'
			ATTEMPTS="$2"
			shift 2
			;;
		--attempts=*)
			ATTEMPTS="${1#*=}"
			shift
			;;
		--concurrency)
			[ "$#" -ge 2 ] || die '--concurrency requires a value'
			CONCURRENCY="$2"
			shift 2
			;;
		--concurrency=*)
			CONCURRENCY="${1#*=}"
			shift
			;;
		--url)
			[ "$#" -ge 2 ] || die '--url requires a value'
			BASE_URL="$2"
			shift 2
			;;
		--url=*)
			BASE_URL="${1#*=}"
			shift
			;;
		--user)
			[ "$#" -ge 2 ] || die '--user requires a value'
			WP_USER="$2"
			shift 2
			;;
		--user=*)
			WP_USER="${1#*=}"
			shift
			;;
		--password)
			[ "$#" -ge 2 ] || die '--password requires a value'
			WP_PASSWORD="$2"
			shift 2
			;;
		--password=*)
			WP_PASSWORD="${1#*=}"
			shift
			;;
		--no-start)
			START_WP_ENV=0
			shift
			;;
		--keep-all)
			KEEP_ALL=1
			shift
			;;
		--cleanup-success)
			CLEANUP_SUCCESS=1
			shift
			;;
		-h|--help)
			usage
			exit 0
			;;
		*)
			die "unknown option: $1"
			;;
	esac
done

is_positive_integer "$ATTEMPTS" || die "ATTEMPTS must be a positive integer, got: $ATTEMPTS"
is_positive_integer "$CONCURRENCY" || die "CONCURRENCY must be a positive integer, got: $CONCURRENCY"
is_positive_integer "$CURL_MAX_TIME" || die "CURL_MAX_TIME must be a positive integer, got: $CURL_MAX_TIME"

command -v npm >/dev/null 2>&1 || die 'npm is required'
command -v node >/dev/null 2>&1 || die 'node is required'
command -v curl >/dev/null 2>&1 || die 'curl is required'

status_output="$(run_wp_env status 2>&1)"
if ! printf '%s\n' "$status_output" | grep -q 'status: running'; then
	if [ "$START_WP_ENV" -eq 0 ]; then
		printf '%s\n' "$status_output" >&2
		die 'wp-env is not running'
	fi

	log 'wp-env is not running; starting it.'
	run_wp_env start >/dev/null 2>&1 || die 'failed to start wp-env'
fi

if [ -z "$BASE_URL" ]; then
	siteurl_output="$(run_wp option get siteurl 2>&1)"
	BASE_URL="$(printf '%s\n' "$siteurl_output" | awk '/^https?:\/\// { print; exit }')"
	[ -n "$BASE_URL" ] || die 'could not determine site URL from wp option get siteurl'
fi
BASE_URL="${BASE_URL%/}"

run_wp option update wp_collaboration_enabled 1 >/dev/null 2>&1 || die 'failed to enable wp_collaboration_enabled'

if [ -z "$WP_PASSWORD" ]; then
	password_output="$(run_wp user application-password create "$WP_USER" "$APP_NAME" --porcelain 2>&1)"
	WP_PASSWORD="$(
		printf '%s\n' "$password_output" |
			awk '
				/^Password:/ {
					print $2;
					exit;
				}
				/^[[:alnum:]][[:alnum:] ]+[[:alnum:]]$/ {
					value = $0;
					gsub(/[[:space:]]/, "", value);
					if ( length(value) >= 20 ) {
						print value;
						exit;
					}
				}
			'
	)"
	[ -n "$WP_PASSWORD" ] || die 'failed to create an application password'
	CREATED_APP_PASSWORD=1

	apps_output="$(run_wp user application-password list "$WP_USER" --fields=uuid,name --format=csv 2>&1)"
	APP_UUID="$(printf '%s\n' "$apps_output" | awk -F, -v name="$APP_NAME" '$2 == name { print $1; exit }')"
	[ -n "$APP_UUID" ] || die 'created an application password but could not find its UUID for cleanup'
fi

endpoint="$BASE_URL/wp-json/wp-sync/v1/updates"

log "Endpoint: $endpoint"
log "Attempts: $ATTEMPTS"
log "Concurrency per attempt: $CONCURRENCY"
log 'This uses normal REST requests only; no server-side race injection is installed.'

attempt=1
while [ "$attempt" -le "$ATTEMPTS" ]; do
	title="$RUN_ID-attempt-$attempt"
	create_output="$(run_wp post create --post_type=post --post_status=draft --post_title="$title" --post_content='normal REST concurrency repro' --porcelain 2>&1)"
	post_id="$(printf '%s\n' "$create_output" | awk '/^[0-9]+$/ { print; exit }')"
	[ -n "$post_id" ] || die "failed to create draft post for attempt $attempt"
	printf '%s\n' "$post_id" >> "$POST_IDS_FILE"

	room="postType/post:$post_id"
	room_hash="$(md5_hex "$room")"

	pids=""
	client=1
	while [ "$client" -le "$CONCURRENCY" ]; do
		client_id=$(( attempt * 100000 + client ))
		payload="{\"rooms\":[{\"after\":0,\"awareness\":{\"collaboratorInfo\":{}},\"client_id\":$client_id,\"room\":\"$room\",\"updates\":[]}]}"
		curl -fsS --max-time "$CURL_MAX_TIME" \
			-u "$WP_USER:$WP_PASSWORD" \
			-H 'Content-Type: application/json' \
			-X POST "$endpoint" \
			--data "$payload" \
			>"$REQUEST_DIR/attempt-$attempt-client-$client.out" \
			2>"$REQUEST_DIR/attempt-$attempt-client-$client.err" &
		pids="$pids $!"
		client=$(( client + 1 ))
	done

	failures=0
	for pid in $pids; do
		if ! wait "$pid"; then
			failures=$(( failures + 1 ))
		fi
	done

	query="SELECT ID, post_name FROM wp_posts WHERE post_type = 'wp_sync_storage' AND post_status = 'publish' AND ( post_name = '$room_hash' OR post_name LIKE '$room_hash-%' ) ORDER BY ID ASC"
	lineages_output="$(run_wp db query "$query" --skip-column-names 2>&1)"
	lineages="$(printf '%s\n' "$lineages_output" | awk '$1 ~ /^[0-9]+$/ { print }')"
	lineage_count="$(printf '%s\n' "$lineages" | sed '/^$/d' | wc -l | tr -d ' ')"

	log "attempt $attempt: post=$post_id room=$room lineages=$lineage_count curl_failures=$failures"

	if [ "$lineage_count" -gt 1 ]; then
		FOUND_POST_ID="$post_id"
		FOUND_ROOM="$room"
		FOUND_HASH="$room_hash"
		printf '\nREPRODUCED: first room storage split using normal REST concurrency.\n'
		printf 'Post ID: %s\n' "$FOUND_POST_ID"
		printf 'Room: %s\n' "$FOUND_ROOM"
		printf 'Room hash: %s\n' "$FOUND_HASH"
		printf 'Storage rows:\n%s\n' "$lineages"
		printf '\nInspect with:\n'
		printf "  npm run wp-env -- run cli wp db query \"%s\"\n" "$query"

		if [ "$CLEANUP_SUCCESS" -eq 0 ] && [ "$KEEP_ALL" -eq 0 ]; then
			printf '\nLeft the successful generated post/storage rows in place for inspection.\n'
			printf 'Re-run with --cleanup-success to remove them automatically.\n'
		fi
		exit 0
	fi

	attempt=$(( attempt + 1 ))
done

printf '\nDid not reproduce after %s attempts at concurrency %s.\n' "$ATTEMPTS" "$CONCURRENCY"
printf 'This can happen if the checkout already contains the fix, the host is too serialized, or the timing window did not hit.\n'
printf 'Try increasing ATTEMPTS and CONCURRENCY on a vulnerable checkout.\n'
exit 1
