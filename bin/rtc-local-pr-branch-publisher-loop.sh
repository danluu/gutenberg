#!/usr/bin/env bash
set -euo pipefail

REMOTE=${RTC_BRANCH_PUBLISH_REMOTE:-exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org}
REMOTE_REPO=${RTC_BRANCH_PUBLISH_REMOTE_REPO:-/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo}
REMOTE_FINALIZATION_BASE=${RTC_BRANCH_PUBLISH_REMOTE_FINALIZATION_BASE:-/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516}
REMOTE_CRITICAL_BASE=${RTC_BRANCH_PUBLISH_REMOTE_CRITICAL_BASE:-/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517}
REMOTE_DEFERRED_BASE=${RTC_BRANCH_PUBLISH_REMOTE_DEFERRED_BASE:-/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516}
REMOTE_PRSPLIT_BASE=${RTC_BRANCH_PUBLISH_REMOTE_PRSPLIT_BASE:-/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515}
REMOTE_FRESH_BASE=${RTC_BRANCH_PUBLISH_REMOTE_FRESH_BASE:-/media/volume/danluu-fuzz-data/rtc-fresh-pr-split-from-scratch-20260517}
REMOTE_PROGRESS_BASE=${RTC_BRANCH_PUBLISH_REMOTE_PROGRESS_BASE:-/media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518}

REPO=${RTC_BRANCH_PUBLISH_LOCAL_REPO:-/Users/danluu/dev/fuzz/gutenberg}
DANLUU_REMOTE=${RTC_BRANCH_PUBLISH_DANLUU_REMOTE:-danluu}
BASE=${RTC_BRANCH_PUBLISH_BASE:-/tmp/rtc-local-pr-branch-publisher-20260517}
POLL_SECONDS=${RTC_BRANCH_PUBLISH_POLL_SECONDS:-300}
CODEX_BIN=${RTC_BRANCH_PUBLISH_CODEX_BIN:-$(command -v codex)}
CODEX_MODEL=${RTC_BRANCH_PUBLISH_CODEX_MODEL:-gpt-5.5}
CODEX_REASONING=${RTC_BRANCH_PUBLISH_CODEX_REASONING:-xhigh}
CODEX_TIMEOUT_SECONDS=${RTC_BRANCH_PUBLISH_CODEX_TIMEOUT_SECONDS:-3600}

LOG=$BASE/publisher.log
STATUS=$BASE/status.md
STATE=$BASE/state.tsv
PUBLISHED=$BASE/latest-local-publish-manifest.tsv
LOCK=$BASE/lock

mkdir -p "$BASE/snapshots" "$BASE/logs"
touch "$LOG" "$STATE"

if [ ! -s "$PUBLISHED" ]; then
	if scp -q "$REMOTE:$REMOTE_FINALIZATION_BASE/latest-local-publish-manifest.tsv" "$PUBLISHED.remote" 2>/dev/null && [ -s "$PUBLISHED.remote" ]; then
		cp "$PUBLISHED.remote" "$PUBLISHED"
	else
		printf 'published_at\tlocal_remote\tlocal_ref\tgithub_ref\tsha\tsource_branch\tevidence\treason\tresult\n' > "$PUBLISHED"
	fi
fi

log() {
	printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"
}

valid_ref_name() {
	local ref="$1"
	[ -n "$ref" ] || return 1
	case "$ref" in
		-*|*'..'*|*'@{'*|*' '*|*$'\t'*|*'~'*|*'^'*|*':'*|*'?'*|*'['*|*'\\'*|*'**'*|*/.|*.lock|*//*) return 1 ;;
	esac
	printf '%s' "$ref" | grep -Eq '^[A-Za-z0-9._/-]+$'
}

write_status() {
	local phase="$1"
	local detail="$2"
	{
		echo "# Local RTC PR Branch Publisher"
		echo
		echo "- updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
		echo "- phase: $phase"
		echo "- detail: $detail"
		echo "- remote: $REMOTE"
		echo "- remote repo: $REMOTE_REPO"
		echo "- local repo: $REPO"
		echo "- poll seconds: $POLL_SECONDS"
		echo "- codex model: $CODEX_MODEL"
		echo "- published manifest: $PUBLISHED"
		echo
		echo "## Recent Push State"
		tail -80 "$STATE" 2>/dev/null || true
		echo
		echo "## Recent Log"
		tail -120 "$LOG" 2>/dev/null || true
	} > "$STATUS.tmp"
	mv "$STATUS.tmp" "$STATUS"
}

remote_manifest_paths() {
	ssh "$REMOTE" "
		set -e
		{
			test -f '$REMOTE_CRITICAL_BASE/current-push-manifest.tsv' && printf '%s\n' '$REMOTE_CRITICAL_BASE/current-push-manifest.tsv'
			test -f '$REMOTE_PROGRESS_BASE/current-push-manifest.tsv' && printf '%s\n' '$REMOTE_PROGRESS_BASE/current-push-manifest.tsv'
			find '$REMOTE_PROGRESS_BASE/jobs' -type f -name 'push-manifest.tsv' -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -80 | sed 's/^[^ ]* //'
			find '$REMOTE_DEFERRED_BASE/cycles' -type f -name 'push-manifest.tsv' -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -80 | sed 's/^[^ ]* //'
			find '$REMOTE_PRSPLIT_BASE/runs' -type f -name 'push-manifest.tsv' -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -120 | sed 's/^[^ ]* //'
			find '$REMOTE_FRESH_BASE/runs' -type f -name 'push-manifest.tsv' -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -120 | sed 's/^[^ ]* //'
			find '$REMOTE_FINALIZATION_BASE/cycles' -type f -name 'finalization.report.md' -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -30 | sed 's/^[^ ]* //'
			test -f '$REMOTE_PRSPLIT_BASE/current-pr-split.md' && printf '%s\n' '$REMOTE_PRSPLIT_BASE/current-pr-split.md'
			test -f '$REMOTE_PRSPLIT_BASE/latest-synthesis.md' && printf '%s\n' '$REMOTE_PRSPLIT_BASE/latest-synthesis.md'
			test -f '$REMOTE_FRESH_BASE/latest-fresh-pr-set.md' && printf '%s\n' '$REMOTE_FRESH_BASE/latest-fresh-pr-set.md'
			test -f '$REMOTE_FRESH_BASE/latest-comparison.md' && printf '%s\n' '$REMOTE_FRESH_BASE/latest-comparison.md'
		} | awk 'NF' | sort -u
	"
}

collect_snapshot() {
	local snapshot="$1"
	local index="$snapshot/index.tsv"
	local files="$snapshot/files"
	rm -rf "$snapshot"
	mkdir -p "$files"
	remote_manifest_paths > "$snapshot/remote-paths.txt"
	ssh "$REMOTE" '
		set -e
		tmp=$(mktemp -d)
		mkdir -p "$tmp/files"
		printf "remote_path\tlocal_path\n" > "$tmp/index.tsv"
		while IFS= read -r path; do
			[ -n "$path" ] || continue
			[ -f "$path" ] || continue
			safe="$(printf "%s" "$path" | cksum | awk "{ print \$1 }")-$(basename "$path")"
			if cp "$path" "$tmp/files/$safe" 2>/dev/null; then
				printf "%s\tfiles/%s\n" "$path" "$safe" >> "$tmp/index.tsv"
			fi
		done
		tar -C "$tmp" -czf - .
		rm -rf "$tmp"
	' < "$snapshot/remote-paths.txt" | tar -C "$snapshot" -xzf -
	cp "$PUBLISHED" "$snapshot/current-local-publish-manifest.tsv" 2>/dev/null || true
	{
		echo "# Snapshot"
		echo
		echo "- generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
		echo "- remote: $REMOTE"
		echo "- remote repo: $REMOTE_REPO"
		echo
		echo "## Index"
		sed -n '1,240p' "$index"
	} > "$snapshot/context.md"
}

snapshot_hash() {
	local snapshot="$1"
	find "$snapshot" -type f -maxdepth 3 -print0 | sort -z | xargs -0 shasum 2>/dev/null | shasum | awk '{ print $1 }'
}

write_codex_prompt() {
	local snapshot="$1"
	local plan="$2"
	local prompt="$snapshot/prompt.md"
	cat > "$prompt" <<PROMPT
You are the local branch-publisher planner for the Gutenberg RTC Jetstream2 project.

Read the snapshot in:
$snapshot

Important files:
- $snapshot/index.tsv maps Jetstream artifact paths to local files.
- $snapshot/current-local-publish-manifest.tsv lists refs already pushed to GitHub from this local machine.
- Candidate manifests and reports are under $snapshot/files.

Task:
Create a conservative push plan for PR candidate branches that should be pushed
from Jetstream to the GitHub remote named "$DANLUU_REMOTE".

Rules:
- Do not run commands.
- Do not push anything yourself.
- Write exactly one TSV file at:
  $plan
- Header must be:
  source_branch\tintended_danluu_branch\texpected_sha\tevidence_path\treason
- Include only branches that are explicitly safe PR candidates.
- Prefer rows from push-manifest.tsv files with columns such as source_branch,
  source_commit, intended_danluu_branch, validation_summary, and reason.
- For critical-path current-push-manifest.tsv rows that lack an intended branch,
  include only finalization-style source branches: finalized/*, cycle*, ready-pr03b/*,
  or fresh-prset/*. Do not include generic ready/rtc-* rows from old manifests
  unless a separate explicit intended_danluu_branch manifest names them.
- Skip validation-only, needs-classification, raw deferred, try, fix, and
  diagnostic branches unless an explicit manifest gives an intended_danluu_branch
  and product-candidate/fuzzer-instrumentation reason.
- Skip branches already present in current-local-publish-manifest.tsv with the
  same destination and SHA.
- intended_danluu_branch must start with danluu/ and must not contain wildcards.
- If there is nothing safe to push, write only the header.

This planner should be conservative. It is better to omit a questionable branch
than publish a stale or oversized branch.
PROMPT
}

run_codex_plan() {
	local snapshot="$1"
	local plan="$snapshot/push-plan.tsv"
	local prompt="$snapshot/prompt.md"
	local report="$snapshot/codex-report.md"
	local stderr="$snapshot/codex.stderr.log"
	write_codex_prompt "$snapshot" "$plan"
	rm -f "$plan"
	set +e
	if command -v timeout >/dev/null 2>&1; then
		timeout "$CODEX_TIMEOUT_SECONDS" "$CODEX_BIN" -a never exec --skip-git-repo-check -m "$CODEX_MODEL" -c model_reasoning_effort="$CODEX_REASONING" -s danger-full-access < "$prompt" > "$report" 2> "$stderr"
	elif command -v gtimeout >/dev/null 2>&1; then
		gtimeout "$CODEX_TIMEOUT_SECONDS" "$CODEX_BIN" -a never exec --skip-git-repo-check -m "$CODEX_MODEL" -c model_reasoning_effort="$CODEX_REASONING" -s danger-full-access < "$prompt" > "$report" 2> "$stderr"
	else
		"$CODEX_BIN" -a never exec --skip-git-repo-check -m "$CODEX_MODEL" -c model_reasoning_effort="$CODEX_REASONING" -s danger-full-access < "$prompt" > "$report" 2> "$stderr"
	fi
	local rc=$?
	set -e
	printf '%s\n' "$rc" > "$snapshot/codex.rc"
	if [ ! -s "$plan" ]; then
		printf 'source_branch\tintended_danluu_branch\texpected_sha\tevidence_path\treason\n' > "$plan"
	fi
}

already_published() {
	local github_ref="$1"
	local sha="$2"
	awk -F '\t' -v ref="$github_ref" -v sha="$sha" 'NR > 1 && $4 == ref && $5 == sha { found = 1 } END { exit found ? 0 : 1 }' "$PUBLISHED"
}

append_published() {
	local local_ref="$1"
	local github_ref="$2"
	local sha="$3"
	local source_branch="$4"
	local evidence="$5"
	local reason="$6"
	local result="$7"
	printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
		"$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$DANLUU_REMOTE" "$local_ref" "$github_ref" "$sha" "$source_branch" "$evidence" "$reason" "$result" >> "$PUBLISHED"
}

publish_manifest_back() {
	local ts
	ts="$(date -u +%Y%m%dT%H%M%SZ)"
	scp -q "$PUBLISHED" "$REMOTE:$REMOTE_FINALIZATION_BASE/latest-local-publish-manifest.tsv" || true
	scp -q "$PUBLISHED" "$REMOTE:$REMOTE_FINALIZATION_BASE/local-publish-manifest-$ts.tsv" || true
}

push_one() {
	local source_branch="$1"
	local intended="$2"
	local expected_sha="$3"
	local evidence="$4"
	local reason="$5"
	local remote_url="$REMOTE:$REMOTE_REPO"
	local remote_sha local_ref github_ref fetch_ref

	if ! valid_ref_name "$source_branch"; then
		log "skip invalid source ref: $source_branch"
		return
	fi
	if ! valid_ref_name "$intended" || [[ "$intended" != danluu/* ]]; then
		log "skip invalid destination for $source_branch: $intended"
		return
	fi

	remote_sha="$(git ls-remote "$remote_url" "refs/heads/$source_branch" | awk '{ print $1 }' | sed -n '1p')"
	if [ -z "$remote_sha" ]; then
		log "skip missing source branch on Jetstream: $source_branch"
		return
	fi
	if [ -n "$expected_sha" ] && [ "$expected_sha" != "unknown" ]; then
		case "$remote_sha" in
			"$expected_sha"*) ;;
			*) log "skip SHA mismatch for $source_branch expected=$expected_sha actual=$remote_sha"; return ;;
		esac
	fi

	github_ref="refs/heads/$intended"
	local_ref="refs/heads/$intended"
	if already_published "$github_ref" "$remote_sha"; then
		log "already published $source_branch -> $github_ref $remote_sha"
		return
	fi

	fetch_ref="refs/remotes/jetstream-publisher/$source_branch"
	git -C "$REPO" fetch --no-tags "$remote_url" "+refs/heads/$source_branch:$fetch_ref"
	if git -C "$REPO" push "$DANLUU_REMOTE" "$fetch_ref:$github_ref"; then
		log "pushed $source_branch@$remote_sha -> $github_ref"
		append_published "$local_ref" "$github_ref" "$remote_sha" "$source_branch" "$evidence" "$reason" "pushed"
		printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$source_branch" "$github_ref" "$remote_sha" "$evidence" "pushed" >> "$STATE"
	else
		log "push failed $source_branch@$remote_sha -> $github_ref"
		printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$source_branch" "$github_ref" "$remote_sha" "$evidence" "push_failed" >> "$STATE"
	fi
}

process_plan() {
	local plan="$1"
	local source_branch intended expected evidence reason
	awk -F '\t' 'NR > 1 && NF >= 2 { print $1 "\t" $2 "\t" $3 "\t" $4 "\t" $5 }' "$plan" |
	while IFS=$'\t' read -r source_branch intended expected evidence reason; do
		[ -n "$source_branch" ] || continue
		push_one "$source_branch" "$intended" "${expected:-unknown}" "${evidence:-}" "${reason:-}"
	done
	publish_manifest_back
}

run_once() {
	local ts snapshot hash last_hash
	ts="$(date -u +%Y%m%dT%H%M%SZ)"
	snapshot="$BASE/snapshots/$ts"
	write_status snapshot "collecting Jetstream manifests"
	collect_snapshot "$snapshot"
	hash="$(snapshot_hash "$snapshot")"
	last_hash="$(awk -F '\t' '$1 == "last_hash" { print $2 }' "$STATE" | tail -1)"
	if [ "$hash" = "$last_hash" ]; then
		log "no manifest changes hash=$hash"
		write_status idle "no manifest changes"
		return
	fi
	printf 'last_hash\t%s\t%s\n' "$hash" "$ts" >> "$STATE"
	write_status planning "running Codex planner for $ts"
	run_codex_plan "$snapshot"
	write_status pushing "processing $snapshot/push-plan.tsv"
	process_plan "$snapshot/push-plan.tsv"
	write_status idle "cycle complete"
}

main() {
	if ! mkdir "$LOCK" 2>/dev/null; then
		log "another publisher loop already holds $LOCK"
		exit 0
	fi
	trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT
	log "local PR branch publisher loop started pid=$$"
	while true; do
		run_once || log "cycle failed"
		sleep "$POLL_SECONDS"
	done
}

main "$@"
