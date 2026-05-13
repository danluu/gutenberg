# RTC stale base-record top-level move drops remote blocks

Bug signature: `45c313bc2541`

Bug type: `top_level_move_reconciliation_preserves_wrong_yblock_after_remote_insert`

Transport: HTTP RTC

## Summary

This is a real CRDT merge bug in the proposed RTC `baseRecord` path. Current public `origin/trunk` did not contain that path when this note was updated (`5afea61149597cf4d7113517f343c004d24e0d7a`, 2026-05-13T03:45:31Z), so the practical risk is conditional: it matters for the current `77924` PR head and for synthetic known-fixes stacks that combine `baseRecord` sync plumbing with stale top-level block reconciliation.

Pass 180 adds a stronger survival check than the earlier synthetic-base-only evidence: the low-level regression fails directly on current `refs/remotes/pr/77924` (`1bda16e1a1921c35d84bfb11cfac025400ee15ae`, 2026-05-12T14:25:01-07:00), dropping the remote heading after a stale base-record top-level move. A minimal adaptation against that PR head passes the regression and the existing CRDT utility suites.

## User Workflow

A natural workflow can provide the edits:

- Two browser tabs or two users edit the same post with RTC collaboration enabled.
- The post contains ordinary top-level blocks such as headings, paragraphs, lists, checkpoint paragraphs, and tail paragraphs.
- One collaborator inserts a top-level block near the blocks that another collaborator is about to move.
- Before the second editor's entity-record snapshot includes the remote insert, that editor moves a nearby top-level block with ordinary block mover controls.

The uncommon part is timing. `editEntityRecord()` captures `editedRecord` as `baseRecord`, but `packages/sync/src/manager.ts` applies the CRDT update later with `setTimeout( ..., 0 )`. A remote Yjs update can therefore arrive in the local Y.Doc after base capture but before the delayed local CRDT merge. Save/reload is not required for the live corruption, but a later save can persist the bad shared state.

## Impact

The symptom is content corruption, not a readiness wait, locator failure, malformed spec, or inverted assertion. The concrete pass-180 failure loses `Step 6 inserted heading` from the merged block order. Earlier artifacts in the same signature family show checkpoint paragraph loss, wrong `core/list` YBlock preservation, invalid paragraph text on list/table attributes, and duplicated trailing blocks.

Expected recovery is manual undo/repair before save, reload from an uncorrupted peer before persistence, or revision/manual repair after save. I found no evidence for this signature of a save loop, crash, or performance/OOM failure.

## Root Cause

The current `77924` head adds `baseRecord` plumbing:

- `packages/core-data/src/actions.js` passes `{ baseRecord: editedRecord, isNewUndoLevel }` to `getSyncManager().update()`.
- `packages/sync/src/manager.ts` defers that update with `setTimeout( ..., 0 )`.
- `packages/core-data/src/utils/crdt.ts` passes `baseRecord.blocks` into `mergeCrdtBlocks()`.

The merge then tries to rebase local block order over the explicit base snapshot. On the stale-base interleaving, the Y.Doc's current top-level array has a remote-only block that is absent from both the captured base and the incoming local moved snapshot. The current PR-head `getBlockIdentityKeys()` rejects that shape because current IDs are not exactly the base IDs, `rebaseYBlocksByClientId()` falls back, and the positional merge treats the remote-only block as a deletion/update target.

The May 7 synthetic known-fixes base had a related integration failure: it computed `previousBlocks = baseBlocksToSync ?? previousLocalBlocksCache.get( yblocks )`, but used `blocksToSync = baseBlocksToSync ? localBlocksToSync : reconcileStaleLocalBlocks(...)`, skipping stale-local reconciliation exactly when an explicit base existed.

## Verification

On current `77924` head plus only the regression test commit:

```text
npm run test:unit packages/core-data/src/utils/test/crdt-9cf81e169f7e-pass172.test.ts -- --runInBand --no-cache
FAIL: received [ "Initial heading", "Old tail paragraph", "Shared body paragraph", "Step 5 saved checkpoint paragraph" ]
missing "Step 6 inserted heading"
```

On the pass-180 adapted fix branch:

```text
npm run test:unit packages/core-data/src/utils/test/crdt-9cf81e169f7e-pass172.test.ts -- --runInBand --no-cache
PASS: 1 passed

npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt.ts -- --runInBand --no-cache
PASS: 122 passed
```

The existing copied realistic Playwright spec is weak evidence either way: the refreshed HTTP rerun passed, but the spec only records state and does not assert the final block tree. I did not create a durable browser timing video in pass 180.

## Fix Plan

For the current `77924` code shape, preserve the existing equal-length delayed-move rebase algorithm and add a separate base-record branch for pure local reorders when the current Y.Doc contains extra remote-only top-level blocks:

1. Let `getBlockIdentityKeys()` accept current arrays that are a superset of the base key set.
2. Keep the old equal-length rebase path unchanged so concurrent list-item move tests keep their Jepsen-style commutativity behavior.
3. For current-superset arrays, require the incoming keys to be the same set as the base keys. This keeps the new path limited to pure reorders and falls back for local insert/delete cases.
4. Reorder only keys that are present in the incoming/base set while leaving remote-only keys in their current relative slots.
5. Derive `content` from the post `blocks` after block merging when both are synced, so stale serialized content cannot delete a block that the structured CRDT merge preserved.

The updated PR branch with this candidate patch is:

```text
https://github.com/danluu/gutenberg/tree/try/top-level-move-reconciliation-preserves-wrong-yblock-after-45c313bc2541-pr
```
