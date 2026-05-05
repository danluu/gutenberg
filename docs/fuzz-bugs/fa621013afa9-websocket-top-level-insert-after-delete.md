# fa621013afa9: WebSocket Top-Level Insert After Delete

Bug signature: `fa621013afa9`

Fuzz type: `rtc-websocket top-level insert-after-delete ordering divergence`

## Triage Result

The refresh-run artifact for this signature is not, by itself, a valid product
failure. It times out in `waitForAwarenessPeerCount()` waiting for an HTTP
`wp-sync` response even though the test is running the WebSocket provider. The
failure happens before the delete/insert actions execute, and the error-context
still shows the seed content intact.

The lower-level CRDT behavior is still a real bug class: local block edits are
sent to the CRDT as full top-level block snapshots. If a stale local snapshot is
applied after a remote peer inserts a block between two surviving top-level
blocks, the left/right array diff interprets the remote insert as a local delete
and removes it.

## Minimal Repro

The focused unit repro added on the PR branch constructs this sequence:

1. Start with three top-level blocks: heading, emoji paragraph, trailing
   paragraph.
2. Client A deletes the heading, producing `[emoji, trailing]`.
3. Client B, based on the post-delete state, inserts a new paragraph between
   `emoji` and `trailing`.
4. A stale local snapshot `[emoji, trailing]` is applied again.

Before the fix, step 4 deletes the remote inserted paragraph. After the fix, the
remote paragraph remains between the two surviving anchors.

## Root Cause

`mergeCrdtBlocks()` was introduced by
`84019935998c Improve CRDT "merge logic" for post entities (#72262)`. Its array
merge is position-oriented: it skips equal blocks from the left and right, then
updates, deletes, or inserts the middle span to make the CRDT array match the
incoming block array.

That is correct for a fresh local snapshot, but not for a stale one. The
incoming snapshot does not encode whether a missing block was intentionally
deleted locally or was inserted remotely after the local snapshot was captured.
The later `54af1ce40068` rich-text/cursor fix changed how block updates are
threaded through the merge, but it preserved the same full-array structural
assumption.

The missing state was the previous local top-level block list for each Y.Array.
Without that base, the merge could not distinguish:

- local deletion: block existed in previous local snapshot and is absent now;
- remote insertion: block exists in current CRDT state but did not exist in the
  previous or current local snapshot.

## Fix

The fix records the last local block snapshot per `YBlocks` array and reconciles
new local snapshots against both the previous local base and the current CRDT
array before running the existing array merge. Remote-only top-level blocks are
reinserted into the incoming list near their current neighboring anchors, while
remote deletions are also preserved.

The save path is also adjusted to serialize current CRDT blocks when they are
available, so a stale edited-record snapshot is less likely to overwrite the
merged CRDT order during persistence.

## Plan Audit

Kernel-maintainer robustness: keep the patch at the boundary where stale data is
converted into a structural diff, and preserve the existing diff algorithm
rather than replacing it wholesale.

Distributed-systems correctness: treat a full local block array as a snapshot
with an implicit base, not an operation log. The merge needs the prior local
base to avoid turning remote inserts into local deletes.

Simplicity/performance skepticism: the reconciliation is linear over the
top-level list and only runs when merging block snapshots. It avoids a new CRDT
type or transport-level ordering rule, and it degrades to the old behavior when
client IDs are missing or duplicated.

## Verification

Focused unit repro:

```bash
npm run test:unit -- packages/core-data/src/utils/test/crdt-stale-top-level-blocks-fa621013afa9.test.ts --runInBand
```

Result after fix: `PASS`.

WebSocket natural-user run, using the reusable known-fixes wp-env because a fresh
wp-env for this worktree could not start due Docker network pool exhaustion:

```bash
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 \
WP_ENV_PORT=9612 \
WP_BASE_URL=http://localhost:9612 \
WP_ARTIFACTS_PATH=/tmp/fa621-pass36-playwright-4/playwright-artifacts \
RTC_FA621_OUTPUT_DIR=/tmp/fa621-pass36-playwright-4/output \
RTC_FA621_ATTEMPTS=4 \
GUTENBERG_RTC_TEST_WS_PORT=19680 \
GUTENBERG_RTC_TEST_WS_REUSE_SERVER=1 \
npm exec --workspace @wordpress/e2e-tests-playwright -- \
  wp-scripts test-playwright \
  --config playwright.rtc-websocket.config.ts \
  specs/editor/collaboration/websocket/collaboration-fa621013afa9-realistic.spec.ts \
  --project=chromium \
  --workers=1
```

Result: 8/8 passed. This did not reproduce the original top-level split in pass
36 after fixing the WebSocket readiness/helper problems in the spec.

## Residual Risk

The browser-level evidence for this specific fuzz signature is weaker than the
CRDT-level evidence: the source refresh failure is a WebSocket readiness harness
failure, and the repaired natural-user WebSocket repro did not fail in eight
attempts. The patch is still justified by the deterministic CRDT repro for the
same stale top-level insert-after-delete mechanism.
