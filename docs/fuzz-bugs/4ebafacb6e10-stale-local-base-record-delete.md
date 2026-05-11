# RTC stale local base-record delete resurrection

Fuzz signature: `4ebafacb6e10`

Bug type: top-level stale-local reconciliation cancels a later local delete of a remotely inserted block.

## Summary

The original fuzz failure is a real RTC correctness bug. One collaborator inserts a top-level paragraph, another collaborator later deletes that block, and a third piece of stale local editor state can reapply the deleted block into the shared CRDT document.

Earlier analysis closed this signature as fixed by the May 7 known-fixes integration because the cache-only stale snapshot path was covered. Pass 178 found a narrower surviving route in the same synthetic base: when the editor update is applied through the normal post CRDT adapter with `baseRecord`, `mergeCrdtBlocks()` skips stale-local reconciliation and treats the unchanged stale block as if it should still exist.

The failing state is:

```text
base record blocks:   Alpha, Beta, Gamma
current CRDT blocks:  Alpha, Beta
local stale snapshot: Alpha local edit, Beta, Gamma
```

`Gamma` was unchanged relative to the editor base record and absent from the current CRDT document, so it represents a remote delete that should be preserved. The May 7 known-fixes base instead reintroduced `Gamma` on the base-record path.

## User Workflow

The natural workflow is normal post-editor collaboration over the websocket RTC transport:

1. Two browser sessions edit the same post.
2. One collaborator inserts a top-level block, reproduced with a paragraph in this signature.
3. Another collaborator deletes that block.
4. A stale local block snapshot from the peer that still had the block is synced after the CRDT document has already observed the delete, while the entity layer still supplies the stale snapshot as the `baseRecord`.

No malformed blocks or direct state mutation are required for the product path. The timing is narrow: the CRDT document, entity record, and block-editor controlled value must be briefly out of phase. That is a normal distributed UI race, but it requires active multi-peer editing and close timing around a remote delete.

## Impact

The impact is stale content resurrection and live editor divergence. One collaborator can see the deleted paragraph gone while another has it restored. A later save from the retaining peer can persist unwanted content. I found no evidence for duplicate-content explosions, save loops, performance issues, or OOM behavior for this signature. Recovery is manual: notice the extra block, delete it again after convergence, and save the corrected document.

## Root Cause

In the known-fixes base, `packages/core-data/src/actions.js` passes the current edited record as `baseRecord` to the sync manager. The sync manager forwards that value to `applyPostChangesToCRDTDoc()`, and `applyPostChangesToCRDTDoc()` passes `baseRecord.blocks` into `mergeCrdtBlocks()`.

The prior stale-local fix reconciles snapshots only when `baseBlocks` is absent. When `baseBlocks` is present, `mergeCrdtBlocks()` uses the stale local snapshot unchanged:

```ts
const blocksToSync = baseBlocksToSync
	? localBlocksToSync
	: reconcileStaleLocalBlocks( yblocks, localBlocksToSync );
```

That bypass loses the set relationship that distinguishes an unchanged stale block from a local intent to reinsert it:

```text
previous/base contains Gamma
local stale snapshot contains Gamma
current CRDT omits Gamma
```

The same reconciliation should run with `baseBlocks` as the previous local snapshot.

## Fix Plan

Thread optional `baseBlocks` into `reconcileStaleLocalBlocks()` and use it when present:

```ts
const previousBlocks =
	baseBlocks ?? previousLocalBlocksCache.get( yblocks );
```

Then call reconciliation for both base-record and cache-backed merges. This preserves the existing cache path while closing the normal entity adapter route.

Robustness audit:

- Kernel-maintainer view: the fix is local, preserves existing APIs, and does not add asynchronous behavior.
- Jepsen-style view: the merge rule is based on replica state, not timing; an ID present in base and local but absent in current is a remote delete unless the local value actually changed through the stale-value reconciliation path.
- Simplicity/performance view: the extra work is the same top-level client-ID set walk already done for the no-base path. It is linear in top-level block count and only runs during block sync.

## Evidence

Pass 178 added an adapter-level repro against the exact May 7 known-fixes SHA `f256024286dd80a4c0e2579f658c109256abf648`. The repro failed before the fix by ending with `["Alpha local edit", "Beta", "Gamma"]` and passed after the one-function base-record reconciliation change.

The related local commit `c8af86c24a5c70784e4604b66b772a0511859a00` already contains the same code shape under the subject `Preserve remote top-level blocks for base-record edits`.
