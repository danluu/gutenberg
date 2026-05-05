# RTC top-level move reconciliation can duplicate a sibling and drop another block

Bug signature: `a55350721046`

Bug type: `rtc_top_level_move_reconciliation_preserves_inserted_heading_and_drops_moved_sibling_after_checkpoint_churn`

Transport: HTTP polling

## Summary

Two collaborative editors can permanently diverge after a normal top-level block sequence:

1. User A deletes an earlier top-level block.
2. User B inserts a block before a remaining sibling.
3. User A moves that sibling down.
4. A stale full-block snapshot from the other editor is merged after the move.

The expected state keeps the inserted block and both original siblings in the moved order. The failing state keeps the inserted block, duplicates one sibling, and drops the other sibling.

This is a product bug, not a readiness or locator failure. The Playwright repro uses visible editor UI for delete, add-before, and move-down. The failure occurs after both clients are online and after waiting for collaborative state convergence. The divergent final block trees are valid editor states, but they are not equal and one side has lost user content.

## Evidence

The known-fixes-base rerun used the already-running source HTTP wp-env on port `9495` because a new `wp-env` network could not be created locally. The one-attempt rerun failed in 43.5s:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-3
export WP_BASE_URL=http://localhost:9495
export WP_ENV_PORT=9495
export RTC_MANIFEST_WS_START_PORT=20840
export RTC_MANIFEST_WS_FIXED_PORT=1
export RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-36/a553-known-base-rerun
export RTC_EC47_ATTEMPTS=1
npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium
```

The primary page ended with:

```text
inserted paragraph
another paragraph
emoji paragraph
```

The collaborator ended with:

```text
inserted paragraph
emoji paragraph
emoji paragraph
```

So the collaborator duplicated the moved emoji paragraph and dropped the `another paragraph` sibling.

## Root Cause

`mergeCrdtBlocks()` receives full local block snapshots from the editor and reconciles them into a CRDT-backed `Y.Array`. During collaboration, those full snapshots can be stale relative to the CRDT array: another editor may already have inserted a block or moved a sibling, while the local editor is still echoing the older top-level order.

Before the fix, `mergeCrdtBlocks()` treated every incoming snapshot as authoritative unless the positional diff found no work. With a stale incoming order, the positional update path could rewrite the wrong `Y.Map` records and then run duplicate-clientId cleanup. In the failing sequence, the primary editor had the correct order:

```text
inserted paragraph
another paragraph
emoji paragraph
```

The collaborator later merged a stale snapshot ordered as:

```text
inserted paragraph
emoji paragraph
another paragraph
```

That stale snapshot was enough to preserve the remote insert while duplicating the emoji paragraph and dropping the moved `another paragraph` sibling. The issue is not malformed block HTML or a bad Playwright locator; it is stale snapshot authority at the CRDT array boundary.

Pass 37 narrowed the known-fixes-base failure mode. The known-fixes base at `3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only the regression tests applied, already passes the two stale-order Y.Doc repros. It still fails the same-array-reference reorder test:

```text
Expected: inserted paragraph, another paragraph, emoji paragraph
Received: inserted paragraph, emoji paragraph, another paragraph
```

That isolates the remaining source-manifest failure to the original `serializableBlocksCache`. The cache keys only on the incoming block array object. If the editor reuses that array object after a real top-level move, `mergeCrdtBlocks()` can reuse the old serialized snapshot and never observe the user move. The browser repro's final divergence is consistent with that: one editor applies the move, while the other keeps the stale pre-move order and then the positional merge/duplicate-clientId cleanup drops the intervening sibling.

Pass 39 isolated the cache more directly. In a temporary known-fixes-base worktree with only the regression-test commit applied, the same-array-reference reorder test failed. Applying only this minimal code change:

```diff
-const serializableBlocksCache = new WeakMap< WeakKey, Block[] >();
 ...
-	const localBlocksToSync =
-		serializableBlocksCache.get( incomingBlocks ) ?? [];
+	const localBlocksToSync = makeBlocksSerializable( incomingBlocks );
```

made the same test pass, and the three focused regressions passed together. That rules out the later stale-snapshot reconciliation as the remaining blocker for this signature and pins the observed known-fixes-base failure on the cache hiding a real reorder.

The vulnerable positional merge was introduced with `packages/core-data/src/utils/crdt-blocks.ts` in:

```text
84019935998 Improve CRDT "merge logic" for post entities (#72262)
```

`git blame` still points the left/right diff, positional update loop, delete/insert tail, and duplicate-clientId cleanup to that initial CRDT block merge implementation, with later RTC text and array improvements layered on top. Those later changes did not add identity-aware handling for top-level moves.

## Fix Direction

Track the previous local block snapshot per `Y.Array`. Before applying a new local snapshot, compare its top-level clientId order with the previous local order:

- If the incoming snapshot has the same local order as before, but the CRDT array currently has a different order for those same blocks, treat the incoming snapshot as stale with respect to order and preserve the CRDT/current order.
- If the incoming snapshot changed local order, keep the existing merge behavior so intentional local moves still apply.
- If clientIds are missing, duplicated, or do not line up cleanly, fall back to the existing conservative merge path.
- Recompute the serializable block snapshot every call instead of using object identity as a cache key, so in-place or same-reference block-array reuse cannot hide a real reorder.

This targets the actual failure mode: an unchanged local snapshot should not reorder or rewrite blocks solely because it arrived after a remote insert or move.

## Audit Notes

Kernel-maintainer robustness: the detection is conservative and refuses ambiguous identity. It uses only unique `clientId`s already assigned by the block editor and falls back when identity is unclear.

Distributed-systems correctness: a stale local snapshot is not a causally newer order operation. The fix preserves the newer CRDT order when the local editor has not actually changed its top-level order since the last snapshot.

Simplicity/performance: the check is linear over top-level block arrays and avoids a general move-diff algorithm. It records one previous snapshot per `Y.Array`, and removes the old object-identity cache so in-place array reuse cannot hide real local reorders.

## Residual Risk

The fix covers unchanged stale local order after concurrent remote structural changes, including the inserted-heading/checkpoint variant added for this signature. Mixed operations that combine a real local reorder with content edits, insertions, or deletions in the same changed range still use the existing merge path and need separate coverage if fuzzing finds distinct failures there.
