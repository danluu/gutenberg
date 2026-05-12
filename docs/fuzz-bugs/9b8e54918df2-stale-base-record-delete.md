# RTC stale base-record delete can corrupt a recent remote insert/delete workflow

Bug signature: `9b8e54918df2`

Bug type: `rtc_recent_remote_insert_deleted_by_peer_is_reinserted_from_stale_local_snapshot`

Transport: HTTP polling

## Summary

The original fuzz signature described a top-level paragraph inserted by one collaborator, deleted by another, and then restored from a stale local snapshot. Current known-fixes base `f256024286dd80a4c0e2579f658c109256abf648` no longer restores that exact deleted paragraph in the ordinary cache-backed merge path. A pass-178 post-adapter probe found a narrower surviving corruption path: when the stale local update is applied through the normal `editEntityRecord` / `baseRecord` path, the deleted inserted paragraph stays deleted, but a neighboring seed paragraph can be duplicated while the edited paragraph is also retained.

That is still a real content-corruption risk for the same natural workflow:

1. Collaborator A inserts a top-level paragraph before existing paragraphs.
2. Collaborator B receives that insertion and deletes it.
3. Collaborator A receives the CRDT delete.
4. Before A's edited entity snapshot/base catches up, A makes a local edit to a surviving paragraph.
5. The local update is sent with `baseRecord.blocks` that still contains the deleted block.

On `f256`, the low-level product-path result for the `9b8e` shape was:

```text
Expected: [ "Seed 950584 local follow-up edit.", "Seed 950584 keeps a second paragraph for deletes and moves." ]
Received: [ "Seed 950584 baseline paragraph.", "Seed 950584 local follow-up edit.", "Seed 950584 keeps a second paragraph for deletes and moves." ]
```

The exact deleted inserted paragraph (`RTC realistic 9b8e paragraph`) was not resurrected in this probe. The surviving issue is adjacent stale-base corruption, not the older exact assertion.

Pass 179 added a second non-browser repro at the `SyncManager` layer. That probe loads two synced post records, lets the first manager insert the paragraph, lets the second manager delete it, delivers the delete back to the first manager, and then applies a follow-up local edit with the stale `baseRecord` shape that `core-data` passes to `SyncManager.update()`. On the known-fixes base, both the direct post-adapter repro and the manager-level repro fail with the same duplicate stale seed paragraph. With the fix below, both pass.

## Root Cause

The known-fixes stack added stale local block reconciliation for the no-explicit-base path, but `mergeCrdtBlocks()` bypasses that reconciliation when `baseBlocks` is supplied:

```ts
const blocksToSync = baseBlocksToSync
	? localBlocksToSync
	: reconcileStaleLocalBlocks( yblocks, localBlocksToSync );
```

Normal editor edits do supply `baseRecord`:

- `packages/core-data/src/actions.js` calls `getSyncManager().update(..., { baseRecord: editedRecord, isNewUndoLevel })`.
- `packages/sync/src/manager.ts` forwards `baseRecord` to the sync config.
- `packages/core-data/src/utils/crdt.ts` passes `baseRecord.blocks` to `mergeCrdtBlocks()`.

For stale delete races, the same set relationship is available whether the prior local base comes from `baseRecord.blocks` or `previousLocalBlocksCache`: a block present in the base and stale local snapshot but absent from current CRDT blocks is a remote delete unless it was locally changed.

## Fix Direction

Thread the optional `baseBlocks` into `reconcileStaleLocalBlocks()` and use that as the previous snapshot when provided. This reuses the existing client-ID-based stale snapshot logic for both explicit-base and cache-backed updates.

The minimal patch is the same shape as commit `4c1ed28da03795e8bd68b8d873568b47aaf6a0f1` on the related residual branch:

```ts
function reconcileStaleLocalBlocks(
	yblocks: YBlocks,
	localBlocksToSync: Block[],
	baseBlocks?: Block[]
): Block[] {
	const previousBlocks =
		baseBlocks ?? previousLocalBlocksCache.get( yblocks );
	// ...
}
```

and:

```ts
const blocksToSync = baseBlocksToSync
	? reconcileStaleLocalBlocks(
			yblocks,
			localBlocksToSync,
			baseBlocksToSync
	  )
	: reconcileStaleLocalBlocks( yblocks, localBlocksToSync );
```

## Practical Impact

Real-user likelihood is `low` overall and `medium` among active RTC collaborators. The workflow uses ordinary post-editor actions and ordinary top-level paragraph blocks, but it requires two active collaborators and a narrow timing gap between remote deletion, editor/entity reconciliation, and a follow-up local edit.

Blast radius is user-visible content corruption and possible persistence if saved. I saw no evidence of a save loop, OOM/performance issue, or general persistence failure. Recovery is manual deletion/repair or restoring from another still-correct peer/revision.

The browser hit rate remains unproven: the natural Playwright probe waits until the deleted paragraph disappears before editing the surviving paragraph, and that one-attempt probe passed before and after the fix. A better browser confidence test would keep collaborator A typing in the surviving paragraph while collaborator B deletes the newly inserted paragraph, then repeat the HTTP-polling attempt with instrumentation for `baseRecord.blocks`, current CRDT block IDs, and the scheduled remote key version.
