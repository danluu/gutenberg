# RTC top-level Group move can create a ghost Group

Bug signature: `7eb444df9516`

Bug type: `rtc-crdt-top-level-reorder-creates-ghost-group-with-paragraph-content`

Transport: WebSocket RTC

## Summary

A stale top-level Group move can corrupt the shared block tree when the local edit is based on a saved checkpoint while the local Y.Doc already contains remote top-level edits. The observed failure creates an extra `core/group` block whose `clientId` belonged to a paragraph and whose `attributes.content` contains the paragraph text `rtc-save-paragraph-marker-953336-2-1-end`.

This is not malformed markup. The fuzzer scenario uses ordinary Gutenberg blocks and ordinary collaborative actions: paragraphs, a Group with nested Paragraph and Heading blocks, a Search block, a save checkpoint, remote paragraph/heading edits, and a top-level Group move.

## Reproduction Shape

The deterministic adapter repro is `packages/core-data/src/utils/test/crdt-7eb444df9516-stale-group-move.test.ts`.

The sequence is:

1. Create two Y.Docs with a saved checkpoint containing Paragraph, Group, Paragraph, Paragraph, and Search blocks.
2. Apply remote live edits after the checkpoint: update the nested Group paragraph, append two top-level paragraphs after Search, and insert a Heading before the shared paragraph.
3. Apply a local move derived from the stale checkpoint view: move the top-level Group down five positions.
4. Sync the docs and assert that there is exactly one top-level Group, no Group has `attributes.content`, and the Search and Paragraph blocks keep their identities.

On exact known-fixes base `f256024286dd80a4c0e2579f658c109256abf648`, the repro fails with two top-level Groups:

- `clientId: "checkpoint"`, `name: "core/group"`, `attributes.content: "rtc-save-paragraph-marker-953336-2-1-end"`
- `clientId: "group"`, `name: "core/group"`, `attributes.content: "rtc-save-paragraph-marker-953336-2-1-end"`

On current `origin/trunk` at `939b0ff02a9d3eaa9da4eb0a1e96dc325b71a801`, the exact ghost Group does not appear in this adapter route, but the same stale move still loses the remote nested paragraph update: the Group keeps `Seed 953336 step 1 user 1 nested paragraph` instead of `Nested update seed 953336 step 3 user 1 997472`.

On PR branch commit `8532cbe22e1`, the same repro passes. Pass 178 also reran the archived natural-action WebSocket scenario `preseed-checkpoint-save-then-live-edits` against the fixed branch. That browser route completed the save, live edits, and Group move, then converged with exactly one Group and the nested paragraph update preserved on both peers.

## Root Cause

`editEntityRecord()` sends the pre-edit entity snapshot as `baseRecord`. For post block edits, that flows through:

- `packages/core-data/src/actions.js`
- `packages/sync/src/manager.ts`
- `packages/core-data/src/entities.js`
- `packages/core-data/src/utils/crdt.ts`
- `packages/core-data/src/utils/crdt-blocks.ts`

At `f256024286d`, `mergeCrdtBlocks()` used `baseRecord.blocks` as the previous block list but skipped stale-local reconciliation when that explicit base was present:

```ts
const blocksToSync = baseBlocksToSync
	? localBlocksToSync
	: reconcileStaleLocalBlocks( yblocks, localBlocksToSync );
```

That is unsafe because the base snapshot can be stale relative to the current Y.Doc. In this bug, the stale local Group move omits remote top-level blocks that are already present in `yblocks`. The merge then reuses the wrong Y block positions and smears Group attributes and nested children onto a paragraph slot.

The fix is to use the explicit base as the stale-local reconciliation base, not as a reason to bypass reconciliation:

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

Real-user likelihood is low, but impact is high when it happens.

The natural workflow is a collaborative post-editor session over WebSocket RTC with two tabs or two users. One collaborator has a saved checkpoint with a Group and nearby top-level blocks. Another collaborator makes live structural edits near that Group. Before the first collaborator's editor state fully reflects those remote structural edits, the first collaborator moves the top-level Group using normal editor controls.

Common prerequisites: Group, Paragraph, Heading, Search, saving a draft, and moving blocks are ordinary Gutenberg workflows. Rare prerequisites: the local block move must be based on a stale `baseRecord.blocks` snapshot while the local Y.Doc already contains remote top-level edits. The exact seed text and move count are fuzzing details.

Blast radius includes real block-tree corruption, duplicate top-level blocks, invalid Group attributes, peer divergence, and persistence of corrupt markup if saved. I found no evidence of a save loop, OOM, or performance collapse. Recovery is manual cleanup, undo while available, copying from a clean peer, or revision restore.

## Fix Plan

1. Add a focused non-browser repro for the stale checkpoint Group move.
2. Add or retain a browser-level natural action repro if a stable race window is found. The archived generated Playwright spec did not prove this bug because it failed while waiting for collaborator readiness before the move and did not assert the ghost-Group oracle.
3. Update `mergeCrdtBlocks()` so base-record edits still run stale-local reconciliation against the explicit base snapshot.
4. Verify the 7eb repro and adjacent stale-top-level move coverage pass.

## Residual Risk

The adapter repro exactly exercises the CRDT merge path used by the editor. The archived natural-action browser route is now usable as a fixed-branch regression check, but pass 178 could not get the exact `f256` temp worktree past collaboration readiness in Playwright, so it still does not prove the failing browser timing window on the unfixed base. The shortest remaining confidence-improving experiment is a browser repro that runs from a worktree whose plugin basename and collaboration option are known-good on `f256`, moves the Group after the remote Y.Doc update arrives but before waiting for full editor-state convergence, then asserts the strict ghost-Group oracle on both peers.
