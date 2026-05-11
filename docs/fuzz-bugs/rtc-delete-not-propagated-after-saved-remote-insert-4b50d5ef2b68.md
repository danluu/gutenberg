# RTC delete not propagated after saved remote insert (`4b50d5ef2b68`)

## Summary

`4b50d5ef2b68` is a real RTC correctness bug in the stale `baseRecord.blocks` reconciliation path used by post CRDT sync. A collaborator can insert a top-level block, the session can cross a save/checkpoint boundary, another collaborator can delete that inserted block, and a later stale full-block update can resurrect the deleted block for one peer.

The practical failure is content resurrection: an editor that should converge on the deleted block being gone keeps or reintroduces it. If that stale peer saves later, the stale block can be persisted.

## Natural workflow

The workflow uses ordinary editor operations:

1. Two browser sessions edit the same post with RTC collaboration over WebSocket.
2. User B inserts a normal top-level Heading or Paragraph.
3. The post crosses a save/checkpoint/reload boundary, so another editor has a `baseRecord.blocks` snapshot containing the inserted block.
4. User A deletes the inserted block.
5. Before every local snapshot is rebased, a collaborator edits a different paragraph and sends a full block array that still contains the deleted block.

No malformed blocks, synthetic CRDT corruption, direct store mutation, or artificial browser action is needed. The timing is still concurrency-sensitive: the user needs active collaboration and a stale full-block snapshot after the save/delete boundary.

## Evidence

The handoff manifest row `likely-real-issues.jsonl:174` classifies this as high-confidence and says seed `951732` reproduced twice without fault injection in an isolated realistic Playwright repro.

The original materialized Playwright spec uses natural editor actions, but it is not a strict regression test because it records `result.reproduced` without asserting on it. A green run of that spec only proves the action flow completed.

Pass 177 added an adapter-level repro that exercises `applyPostChangesToCRDTDoc()` with `options.baseRecord.blocks`:

```text
saved remote heading insert -> remote delete -> stale paragraph edit based on the pre-delete block record
```

On the official known-fixes baseline `f256024286dd80a4c0e2579f658c109256abf648`, that repro fails with:

```text
Expected: ["Alpha", "Beta collaborator stale edit"]
Received: ["Alpha", "Beta collaborator stale edit", "Gamma saved heading"]
```

On candidate fix `c8af86c24a5c70784e4604b66b772a0511859a00`, the same adapter repro passes.

## Root cause

The CRDT bridge receives full editor block arrays. A full array is not always an authoritative replacement; when it comes with `baseRecord.blocks`, it is a stale edit relative to an explicit causal base.

At `f256024286d`, `mergeCrdtBlocks()` computes `baseBlocksToSync`, but then skips stale-local reconciliation when that explicit base is present:

```ts
const previousBlocks =
	baseBlocksToSync ?? previousLocalBlocksCache.get( yblocks );
const blocksToSync = baseBlocksToSync
	? localBlocksToSync
	: reconcileStaleLocalBlocks( yblocks, localBlocksToSync );
```

That means a stale full snapshot containing a block deleted from the current Yjs document can be interpreted as a local insertion and replayed.

The fix is to pass the explicit base snapshot through the same stale-local reconciliation used by the cache path:

```ts
const blocksToSync = baseBlocksToSync
	? reconcileStaleLocalBlocks( yblocks, localBlocksToSync, baseBlocksToSync )
	: reconcileStaleLocalBlocks( yblocks, localBlocksToSync );
```

## Practical impact

Real-user likelihood is `medium` on affected RTC builds. The individual editing actions are common, but the failure needs the narrower RTC collaboration surface plus an unlucky stale-snapshot ordering after a save/delete boundary.

Blast radius is content resurrection and possible persisted content corruption. I found no evidence for an infinite save loop, crash, performance issue, or unbounded duplication. Recovery is manual: reload, delete the stale block again, or use revisions/manual cleanup if stale content was saved.

## Fix plan

Use the existing stale-local reconciliation path for explicit `baseRecord.blocks` snapshots. Keep the change in `packages/core-data/src/utils/crdt-blocks.ts`; do not add transport sleeps, UI heuristics, or block-type special cases. Add a focused unit regression for the saved remote insert/delete adapter path, and keep any browser repro as a separate non-blocking artifact because the original UI repro is timing-sensitive.
