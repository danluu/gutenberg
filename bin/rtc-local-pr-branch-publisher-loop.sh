#!/usr/bin/env bash
set -euo pipefail

JS2_HOST=${RTC_LOCAL_PUBLISH_JS2_HOST:-danluu-fuzzer-cpu}
MANIFEST=${RTC_LOCAL_PUBLISH_MANIFEST:-/media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518/current-push-manifest.tsv}
LEDGER=${RTC_LOCAL_PUBLISH_LEDGER:-/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516/latest-local-publish-manifest.tsv}
STATUS=${RTC_LOCAL_PUBLISH_STATUS:-/media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518/local-publisher-status.tsv}
DANLUU_REMOTE=${RTC_LOCAL_PUBLISH_REMOTE:-danluu}
SOURCE_REPOS_TEXT=${RTC_LOCAL_PUBLISH_SOURCE_REPOS:-/media/volume/danluu-fuzz-data/rtc-all-merged-fuzz-20260526T195420Z/repo /media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo}
JS2_CANDIDATE_REPO=${RTC_LOCAL_PUBLISH_JS2_CANDIDATE_REPO:-/media/volume/danluu-fuzz-data/rtc-all-merged-fuzz-20260526T195420Z/repo}
JS2_CANDIDATE_BRANCH=${RTC_LOCAL_PUBLISH_JS2_CANDIDATE_BRANCH:-js2/all-merged-rebased-20260701}
DRY_RUN=${RTC_LOCAL_PR_BRANCH_PUBLISHER_DRY_RUN:-0}
SLEEP_SECONDS=${RTC_LOCAL_PR_BRANCH_PUBLISHER_SLEEP_SECONDS:-300}

usage() {
	cat <<USAGE
usage: $0 {once|plan|start}

Reads the JS2 PR-progress push manifest, pushes safe refs from this local
machine to the danluu GitHub remote, and writes the local publish ledger back to
JS2. Use "once" after a status refresh; "plan" performs validation without
pushing or writing the ledger.
USAGE
}

die() {
	printf 'ERROR: %s\n' "$*" >&2
	exit 1
}

safe_ref_name() {
	local ref=$1
	case "$ref" in
		''|*..*|/*|*.lock|*@\{*|*\\*|*:*|*[\ ~^:?[\]*)
			return 1
			;;
	esac
	case "$ref" in
		refs/heads/*) ref=${ref#refs/heads/} ;;
	esac
	git check-ref-format --branch "$ref" >/dev/null 2>&1
}

full_ref() {
	local ref=$1
	case "$ref" in
		refs/heads/*) printf '%s\n' "$ref" ;;
		*) printf 'refs/heads/%s\n' "$ref" ;;
	esac
}

is_sha_like() {
	[[ ${1:-} =~ ^[0-9a-f]{12,40}$ ]]
}

ensure_remote() {
	git remote get-url "$DANLUU_REMOTE" >/dev/null ||
		die "missing git remote '$DANLUU_REMOTE'"
}

ensure_commit_from_js2() {
	local branch=$1 commit=$2 repo
	if git cat-file -e "$commit^{commit}" 2>/dev/null; then
		return 0
	fi
	for repo in "${SOURCE_REPOS[@]}"; do
		if ssh -n -o BatchMode=yes -o ConnectTimeout=15 "$JS2_HOST" \
			git -C "$repo" cat-file -e "$commit^{commit}" 2>/dev/null; then
			git fetch --no-tags "$JS2_HOST:$repo" "$branch" >/dev/null 2>&1 ||
				git fetch --no-tags "$JS2_HOST:$repo" "$commit" >/dev/null 2>&1 ||
				true
			git cat-file -e "$commit^{commit}" 2>/dev/null && return 0
		fi
	done
	return 1
}

ensure_ref_from_js2() {
	local ref=$1 repo
	git rev-parse --verify --quiet "$ref^{commit}" >/dev/null && return 0
	for repo in "${SOURCE_REPOS[@]}"; do
		if ssh -n -o BatchMode=yes -o ConnectTimeout=15 "$JS2_HOST" \
			git -C "$repo" rev-parse --verify --quiet "$ref^{commit}" >/dev/null 2>&1; then
			git fetch --no-tags "$JS2_HOST:$repo" "$ref" >/dev/null 2>&1 || true
			git rev-parse --verify --quiet "$ref^{commit}" >/dev/null && return 0
		fi
	done
	return 1
}

remote_head() {
	local dest_ref=$1
	git ls-remote "$DANLUU_REMOTE" "$dest_ref" | awk 'NR == 1 { print $1 }'
}

ledger_has_row() {
	local dest_ref=$1 commit=$2
	[ -s "$LOCAL_LEDGER" ] || return 1
	awk -F '\t' -v dest="$dest_ref" -v commit="$commit" '
		$4 == dest && $5 == commit && ($9 == "pushed" || $9 == "already_present") {
			found = 1
		}
		END { exit found ? 0 : 1 }
	' "$LOCAL_LEDGER"
}

append_ledger_row() {
	local dest_ref=$1 commit=$2 source_branch=$3 status=$4 reason=$5
	ledger_has_row "$dest_ref" "$commit" && return 0
	printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
		"$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
		"$DANLUU_REMOTE" \
		"$dest_ref" \
		"$dest_ref" \
		"$commit" \
		"$source_branch" \
		"$MANIFEST" \
		"$reason" \
		"$status" >> "$LOCAL_LEDGER"
	LEDGER_CHANGED=1
}

sync_js2_candidate_ref() {
	local dest_ref=$1 commit=$2 expected_ref
	expected_ref=$(full_ref "$JS2_CANDIDATE_BRANCH")
	[ "$dest_ref" = "$expected_ref" ] || return 0
	ssh -o BatchMode=yes -o ConnectTimeout=15 "$JS2_HOST" bash -s -- \
		"$JS2_CANDIDATE_REPO" "$expected_ref" "$commit" <<'REMOTE'
set -euo pipefail
repo=$1
ref=$2
commit=$3
git -C "$repo" cat-file -e "$commit^{commit}"
current=$(git -C "$repo" rev-parse --verify "$ref^{commit}")
if [ "$current" = "$commit" ]; then
	printf 'JS2 candidate already synchronized: %s %s\n' "$ref" "$commit"
	exit 0
fi
git -C "$repo" merge-base --is-ancestor "$current" "$commit"
git -C "$repo" update-ref "$ref" "$commit" "$current"
printf 'synchronized JS2 candidate: %s %s -> %s\n' "$ref" "$current" "$commit"
REMOTE
}

write_remote_status() {
	local state=$1 detail=${2:-} status_file manifest_hash manifest_rows rc_rows rc_manifest_head
	local remote_rc_head js2_rc_head ledger_rows expected_ref
	status_file=$(mktemp "${TMPDIR:-/tmp}/rtc-local-publisher-status.XXXXXX")
	expected_ref=$(full_ref "$JS2_CANDIDATE_BRANCH")
	manifest_hash=$(git hash-object "$LOCAL_MANIFEST" 2>/dev/null || printf missing)
	manifest_rows=$(awk 'NR > 1 { count++ } END { print count + 0 }' "$LOCAL_MANIFEST" 2>/dev/null || printf 0)
	rc_rows=$(awk -F '\t' -v branch="$JS2_CANDIDATE_BRANCH" 'NR > 1 && ($3 == branch || $3 == "refs/heads/" branch) { count++ } END { print count + 0 }' "$LOCAL_MANIFEST" 2>/dev/null || printf 0)
	rc_manifest_head=$(awk -F '\t' -v branch="$JS2_CANDIDATE_BRANCH" 'NR > 1 && ($3 == branch || $3 == "refs/heads/" branch) { head = $2 } END { print head }' "$LOCAL_MANIFEST" 2>/dev/null || true)
	remote_rc_head=$(remote_head "$expected_ref" || true)
	js2_rc_head=$(ssh -n -o BatchMode=yes -o ConnectTimeout=15 "$JS2_HOST" \
		git -C "$JS2_CANDIDATE_REPO" rev-parse --verify --quiet "$expected_ref^{commit}" 2>/dev/null || true)
	ledger_rows=$(awk 'NR > 1 { count++ } END { print count + 0 }' "$LOCAL_LEDGER" 2>/dev/null || printf 0)
	detail=$(printf '%s' "$detail" | tr '\t\r\n' '   ')
	{
		printf 'updated_at\tstate\tmanifest_sha\tmanifest_rows\trc_rows\trc_manifest_head\tremote_rc_head\tjs2_rc_head\tledger_rows\tdetail\n'
		printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
			"$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$state" "$manifest_hash" "$manifest_rows" "$rc_rows" \
			"$rc_manifest_head" "$remote_rc_head" "$js2_rc_head" "$ledger_rows" "$detail"
	} > "$status_file"
	scp -q "$status_file" "$JS2_HOST:$STATUS"
	rm -f "$status_file"
}

write_failure_status() {
	local detail=${1:-publisher cycle failed} status_file
	status_file=$(mktemp "${TMPDIR:-/tmp}/rtc-local-publisher-failure.XXXXXX")
	detail=$(printf '%s' "$detail" | tr '\t\r\n' '   ')
	{
		printf 'updated_at\tstate\tmanifest_sha\tmanifest_rows\trc_rows\trc_manifest_head\tremote_rc_head\tjs2_rc_head\tledger_rows\tdetail\n'
		printf '%s\tfailed\t\t0\t0\t\t\t\t0\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$detail"
	} > "$status_file"
	scp -q "$status_file" "$JS2_HOST:$STATUS" 2>/dev/null || true
	rm -f "$status_file"
}

process_manifest() {
	local source_branch source_commit dest base_ref files insertions deletions validation_summary reason
	local dest_ref resolved_commit base_commit current_remote status

	while IFS=$'\t' read -r source_branch source_commit dest base_ref files insertions deletions validation_summary reason <&3; do
		[ "$source_branch" != "source_branch" ] || continue
		[ -n "$source_branch" ] && [ -n "$source_commit" ] && [ -n "$dest" ] || continue

		safe_ref_name "$source_branch" || {
			printf 'skip invalid source ref: %s\n' "$source_branch" >&2
			continue
		}
		safe_ref_name "$dest" || {
			printf 'skip invalid destination ref: %s\n' "$dest" >&2
			continue
		}
		is_sha_like "$source_commit" || {
			printf 'skip non-sha source commit for %s: %s\n' "$source_branch" "$source_commit" >&2
			continue
		}

		ensure_commit_from_js2 "$source_branch" "$source_commit" || {
			printf 'skip missing source commit: %s %s\n' "$source_branch" "$source_commit" >&2
			continue
		}
		resolved_commit=$(git rev-parse "$source_commit^{commit}")
		dest_ref=$(full_ref "$dest")

		base_commit=
		if [ -n "$base_ref" ] && safe_ref_name "$base_ref" && ensure_ref_from_js2 "$base_ref"; then
			base_commit=$(git rev-parse "$base_ref^{commit}")
		elif is_sha_like "$base_ref" && git cat-file -e "$base_ref^{commit}" 2>/dev/null; then
			base_commit=$(git rev-parse "$base_ref^{commit}")
		fi

		if [ -n "$base_commit" ]; then
			git merge-base --is-ancestor "$base_commit" "$resolved_commit" || {
				printf 'skip non-ancestor base for %s: base=%s commit=%s\n' "$dest" "$base_ref" "$resolved_commit" >&2
				continue
			}
			git diff --check "$base_commit..$resolved_commit" || {
				printf 'skip diff-check failure for %s at %s\n' "$dest" "$resolved_commit" >&2
				continue
			}
		fi

		current_remote=$(remote_head "$dest_ref")
		if [ -n "$current_remote" ]; then
			if [ "$current_remote" = "$resolved_commit" ]; then
				status=already_present
				printf 'already present: %s %s\n' "$dest_ref" "$resolved_commit"
				if [ "$DRY_RUN" != "1" ]; then
					append_ledger_row "$dest_ref" "$resolved_commit" "$source_branch" "$status" "local publisher confirmed destination already present on danluu"
					sync_js2_candidate_ref "$dest_ref" "$resolved_commit"
				fi
				continue
			fi
			git cat-file -e "$current_remote^{commit}" 2>/dev/null ||
				git fetch --no-tags "$DANLUU_REMOTE" "$dest_ref" >/dev/null 2>&1 ||
				true
			git merge-base --is-ancestor "$current_remote" "$resolved_commit" || {
				printf 'skip non-fast-forward destination: %s remote=%s commit=%s\n' "$dest_ref" "$current_remote" "$resolved_commit" >&2
				continue
			}
		fi

		if [ "$DRY_RUN" = "1" ]; then
			printf 'would push: %s -> %s\n' "$resolved_commit" "$dest_ref"
			continue
		fi

		git push "$DANLUU_REMOTE" "$resolved_commit:$dest_ref"
		append_ledger_row "$dest_ref" "$resolved_commit" "$source_branch" pushed "local publisher consumed JS2 push manifest and pushed from this machine"
		sync_js2_candidate_ref "$dest_ref" "$resolved_commit"
	done 3< "$LOCAL_MANIFEST"
}

run_once() {
	local tmpdir
	tmpdir=$(mktemp -d "${TMPDIR:-/tmp}/rtc-local-publisher.XXXXXX")
	trap 'rm -rf "$tmpdir"' RETURN
	LOCAL_MANIFEST=$tmpdir/current-push-manifest.tsv
	LOCAL_LEDGER=$tmpdir/latest-local-publish-manifest.tsv
	LEDGER_CHANGED=0

	ssh -o BatchMode=yes -o ConnectTimeout=15 "$JS2_HOST" "cat '$MANIFEST'" > "$LOCAL_MANIFEST"
	ssh -o BatchMode=yes -o ConnectTimeout=15 "$JS2_HOST" "cat '$LEDGER' 2>/dev/null || true" > "$LOCAL_LEDGER"
	[ -s "$LOCAL_MANIFEST" ] || die "empty manifest from $JS2_HOST:$MANIFEST"

	process_manifest

	if [ "$DRY_RUN" != "1" ] && [ "$LEDGER_CHANGED" = "1" ]; then
		scp -q "$LOCAL_LEDGER" "$JS2_HOST:$LEDGER"
		printf 'updated JS2 publish ledger: %s:%s\n' "$JS2_HOST" "$LEDGER"
	fi
	if [ "$DRY_RUN" != "1" ]; then
		write_remote_status healthy "manifest consumed and candidate synchronization checks completed"
	fi
}

MODE=${1:-once}
read -r -a SOURCE_REPOS <<< "$SOURCE_REPOS_TEXT"
ensure_remote

case "$MODE" in
	once)
		run_once
		;;
	plan)
		DRY_RUN=1 run_once
		;;
	start)
		while true; do
			# A function invoked directly in an `if` condition disables Bash's
			# errexit semantics throughout that function. Run the cycle in an
			# explicit subshell while the parent temporarily accepts its status.
			set +e
			(
				set -e
				run_once
			)
			cycle_rc=$?
			set -e
			if [ "$cycle_rc" -ne 0 ]; then
				write_failure_status "run_once failed; inspect local publisher log"
			fi
			sleep "$SLEEP_SECONDS"
		done
		;;
	-h|--help|help)
		usage
		;;
	*)
		usage >&2
		exit 2
		;;
esac
