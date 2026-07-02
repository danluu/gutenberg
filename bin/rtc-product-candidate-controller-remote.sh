#!/usr/bin/env bash
set -euo pipefail

# Thin remote wrapper for the JS2 RTC product-candidate scheduler.
#
# This does not replace Playwright/fuzz/replay/exact-stack executors. It makes
# them leased workers under one exact-SHA ledger, so readiness is derived from
# product/RTC evidence rather than tmux sessions, run directories, or branch
# names.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="${RTC_REPO:-$(cd "$SCRIPT_DIR/.." && pwd)}"
SCHEDULER="${RTC_SCHEDULER_BIN:-$REPO/bin/rtc-product-candidate-scheduler.mjs}"
POLICY="${RTC_GATE_POLICY:-$REPO/bin/rtc-product-candidate-gate-policy.json}"
BASE="${RTC_SCHEDULER_BASE:-/media/volume/danluu-fuzz-data/rtc-product-candidate-scheduler-20260702}"
DB="${RTC_SCHEDULER_DB:-$BASE/ledger.sqlite}"
RUN_DIR="${RTC_SCHEDULER_RUN_DIR:-$BASE/runs}"
ARTIFACT_DIR="${RTC_SCHEDULER_ARTIFACT_DIR:-$BASE/artifacts}"
PRODUCT_REF="${RTC_PRODUCT_REF:-refs/heads/rtc-product-candidate}"
LEGACY_TAG="${RTC_LEGACY_TAG:-js2-legacy-architecture-base-20260702T075839Z}"
LEGACY_SHA="${RTC_LEGACY_SHA:-15c08b883c8903b04caf3265244bfc3a8f36db83}"

usage() {
	cat <<EOF
Usage: $(basename "$0") <command> [args]

Commands:
  init
      Initialize the scheduler ledger and directories.
  legacy-tag
      Create the local annotated legacy tag if it is missing.
  admit-current [profile_csv] [risk_tag_csv]
      Admit the current checkout HEAD as a candidate.
  open-known-blockers <candidate_id>
      Import the known JS2 P0/P1 blockers as named blockers for a candidate.
  status
      Print maintainer status from the ledger.
  ready <candidate_id>
      Check whether a candidate is human-testable.
  promote <candidate_id>
      Move $PRODUCT_REF if and only if the candidate is ready.
  expire-leases [--kill]
      Mark expired leases stale, optionally SIGTERM owned process groups.
  scheduler ...
      Pass through to rtc-product-candidate-scheduler.mjs.

Environment:
  RTC_REPO=$REPO
  RTC_SCHEDULER_BASE=$BASE
  RTC_SCHEDULER_DB=$DB
  RTC_PRODUCT_REF=$PRODUCT_REF
EOF
}

run_scheduler() {
	node "$SCHEDULER" --db "$DB" "$@"
}

git_in_repo() {
	git -C "$REPO" "$@"
}

command_init() {
	mkdir -p "$BASE" "$RUN_DIR" "$ARTIFACT_DIR"
	run_scheduler init
	{
		printf 'RTC_REPO=%s\n' "$REPO"
		printf 'RTC_SCHEDULER_BASE=%s\n' "$BASE"
		printf 'RTC_SCHEDULER_DB=%s\n' "$DB"
		printf 'RTC_GATE_POLICY=%s\n' "$POLICY"
		printf 'RTC_PRODUCT_REF=%s\n' "$PRODUCT_REF"
		printf 'RTC_LEGACY_TAG=%s\n' "$LEGACY_TAG"
		printf 'RTC_LEGACY_SHA=%s\n' "$LEGACY_SHA"
	} > "$BASE/env"
	printf 'initialized scheduler base %s\n' "$BASE"
}

command_legacy_tag() {
	if git_in_repo rev-parse -q --verify "refs/tags/$LEGACY_TAG" >/dev/null; then
		printf 'legacy tag already exists: %s\n' "$LEGACY_TAG"
		return
	fi
	git_in_repo tag -a "$LEGACY_TAG" "$LEGACY_SHA" -m "JS2 legacy architecture base before product-candidate scheduler migration"
	printf 'created legacy tag %s at %s\n' "$LEGACY_TAG" "$LEGACY_SHA"
}

command_admit_current() {
	local profiles="${1:-plain-wp-fast,rtc-local}"
	local risks="${2:-rtc,editor-save-reload,product-acceptance}"
	local sha trunk_sha manifest manifest_hash lock_hash
	sha="$(git_in_repo rev-parse HEAD)"
	trunk_sha="$(git_in_repo rev-parse origin/trunk 2>/dev/null || git_in_repo rev-parse HEAD)"
	manifest="$ARTIFACT_DIR/candidate-$sha.json"
	mkdir -p "$ARTIFACT_DIR"
	lock_hash=""
	if [ -f "$REPO/package-lock.json" ]; then
		lock_hash="$(shasum -a 256 "$REPO/package-lock.json" | awk '{print $1}')"
	fi
	cat > "$manifest" <<EOF
{
  "sha": "$sha",
  "trunk_sha": "$trunk_sha",
  "profiles": "$profiles",
  "risk_tags": "$risks",
  "repo": "$REPO",
  "policy": "$POLICY",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
	manifest_hash="$(shasum -a 256 "$manifest" | awk '{print $1}')"
	run_scheduler admit-candidate \
		--sha "$sha" \
		--trunk-sha "$trunk_sha" \
		--manifest "$manifest" \
		--branch "$(git_in_repo branch --show-current)" \
		--profiles "$profiles" \
		--risk-tags "$risks" \
		--fixture-set "rtc-product-acceptance-20260702" \
		--lock-hash "$lock_hash" \
		--build-hash "$manifest_hash" \
		--oracle-version "rtc-product-state-oracle-20260702.1" \
		--gate-policy-version "2026-07-02.1"
}

command_open_known_blockers() {
	local candidate_id="$1"
	local artifact="$ARTIFACT_DIR/known-blockers-$candidate_id.md"
	mkdir -p "$ARTIFACT_DIR"
	cat > "$artifact" <<'EOF'
# Known JS2 Product/RTC Blockers Imported During Scheduler Migration

- parser serialization exact canary
- RTC reference oracle exact canary
- stale draft/title dirty state after Save Draft
- title reload convergence
- existing-post CRDT metadata init/preservation
- table stale snapshot
- large-post lifecycle
- SANDBOXED [READ-ONLY] editor lockout
- Jetpack/WP.com post-new failure
- multi-tab propagation failure
- takeover-modal/video reproduction gap
EOF
	run_scheduler open-blocker --candidate "$candidate_id" --severity P1_PRODUCT_CORRECTNESS --scope parser --symptom "parser serialization exact canary remains unresolved" --repro-state repro_available --artifacts "$artifact" --next-command "run exact-stack parser serialization replay and validate fix branch"
	run_scheduler open-blocker --candidate "$candidate_id" --severity P1_RTC_CONFORMANCE --scope rtc-reference-oracle --symptom "RTC reference oracle exact canary remains unresolved" --repro-state repro_available --artifacts "$artifact" --next-command "run RTC-off/RTC-on reference replay on exact candidate SHA"
	run_scheduler open-blocker --candidate "$candidate_id" --severity P1_PRODUCT_CORRECTNESS --scope save-draft-title --symptom "Save Draft can leave title dirty or stale after reload" --repro-state repro_available --artifacts "$artifact" --next-command "run product acceptance Save Draft reload dirty-state fixture"
	run_scheduler open-blocker --candidate "$candidate_id" --severity P1_PRODUCT_CORRECTNESS --scope title-reload --symptom "title reload convergence failure" --repro-state repro_available --artifacts "$artifact" --next-command "run title reload convergence fixture on candidate and trunk control"
	run_scheduler open-blocker --candidate "$candidate_id" --severity P1_RTC_CONFORMANCE --scope crdt-metadata --symptom "existing-post CRDT metadata init/preservation failure" --repro-state repro_available --artifacts "$artifact" --next-command "run existing-post CRDT metadata fixture"
	run_scheduler open-blocker --candidate "$candidate_id" --severity P1_PRODUCT_CORRECTNESS --scope table-save-reload --symptom "table edit/save/reload stale snapshot failure" --repro-state repro_available --artifacts "$artifact" --next-command "run table stale snapshot acceptance fixture"
	run_scheduler open-blocker --candidate "$candidate_id" --severity P1_PRODUCT_CORRECTNESS --scope large-post-lifecycle --symptom "large-post load/edit/save/reload lifecycle failure" --repro-state repro_available --artifacts "$artifact" --next-command "run large-post lifecycle acceptance fixture"
	run_scheduler open-blocker --candidate "$candidate_id" --severity P0_PRODUCT_UNUSABLE --scope sandbox-readonly --symptom "unexpected SANDBOXED [READ-ONLY] makes editor unusable" --repro-state repro_available --artifacts "$artifact" --next-command "run plain-WP and WP.com read-only smoke with same-profile trunk control"
	run_scheduler open-blocker --candidate "$candidate_id" --severity P0_PRODUCT_UNUSABLE --scope jetpack-wpcom-post-new --symptom "Jetpack/WP.com post-new failure can white-screen or block editing" --repro-state repro_available --artifacts "$artifact" --next-command "run jetpack-local-fast and wpcom-deploy-smoke"
	run_scheduler open-blocker --candidate "$candidate_id" --severity P1_RTC_CONFORMANCE --scope multi-tab-propagation --symptom "edits in one window may not reach another window" --repro-state repro_available --artifacts "$artifact" --next-command "run same-user two-tab and multi-context propagation fixtures"
	run_scheduler open-blocker --candidate "$candidate_id" --severity P1_RTC_CONFORMANCE --scope takeover-modal --symptom "takeover modal video path lacks retained deterministic reproduction" --repro-state repro_missing --artifacts "$artifact" --next-command "record takeover modal trace/video fixture and replay schedule"
}

main() {
	local command="${1:-}"
	case "$command" in
		init)
			command_init
			;;
		legacy-tag)
			command_legacy_tag
			;;
		admit-current)
			shift
			command_admit_current "$@"
			;;
		open-known-blockers)
			shift
			[ "${1:-}" ] || { usage; exit 1; }
			command_open_known_blockers "$1"
			;;
		status)
			run_scheduler status
			;;
		ready)
			shift
			[ "${1:-}" ] || { usage; exit 1; }
			run_scheduler ready --candidate "$1"
			;;
		promote)
			shift
			[ "${1:-}" ] || { usage; exit 1; }
			run_scheduler promote-ref --candidate "$1" --ref "$PRODUCT_REF" --allow-ref-update
			;;
		expire-leases)
			shift
			run_scheduler expire-leases "$@"
			;;
		scheduler)
			shift
			run_scheduler "$@"
			;;
		""|-h|--help|help)
			usage
			;;
		*)
			usage
			exit 1
			;;
	esac
}

main "$@"
