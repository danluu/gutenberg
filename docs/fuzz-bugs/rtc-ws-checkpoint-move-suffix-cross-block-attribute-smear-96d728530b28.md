# RTC WebSocket Checkpoint Move Suffix Cross-Block Attribute Smear

Bug signature: `96d728530b28`

Bug type: `rtc_ws_checkpoint_move_suffix_cross_block_attribute_smear`

Transport: WebSocket RTC

## Summary

The handoff row describes a real RTC convergence failure after a checkpoint
save, a remote top-level Group insertion, and a late Pullquote move from a peer
whose edited-record snapshot is stale. The surviving current-base failure is a
block identity merge bug: the local peer's stale `baseRecord.blocks` omits the
remote Group that is already present in the Y.Doc, so the full-array fallback
merge can update or delete the wrong top-level block.

On the pinned known-fixes base `f256024286dd80a4c0e2579f658c109256abf648`, a
signature-specific reconstruction with Paragraph, Table, Group, Pullquote, and
Paragraph blocks drops the existing `table-main` block. The archived fuzz row
reported a worse browser symptom in the same family: table data appearing under
a Group, paragraph data appearing under a Table, Pullquote-only fields appearing
under a Paragraph, and the expected Pullquote disappearing.

## Natural Workflow

The natural workflow is active post-editor collaboration over the WebSocket RTC
transport. Two tabs or users edit the same post. The post contains a
heterogeneous top-level suffix such as Paragraph, Table, Paragraph, Pullquote,
Paragraph. One collaborator inserts a top-level Group near that suffix. Before
the other collaborator's local edited record has caught up to the remote Group,
that collaborator moves the Pullquote across the Table/Paragraph suffix.

No malformed block tree or direct state mutation is required in the product
path. The narrow prerequisite is the timing window: the current Y.Doc includes
the remote Group, while the local `baseRecord.blocks` passed by
`editEntityRecord` still reflects the pre-Group block list.

## Root Cause

`core-data` passes the current edited record as a base snapshot when scheduling
RTC updates:

```text
editEntityRecord
  -> getSyncManager().update(..., { baseRecord: editedRecord })
  -> SyncManager.updateCRDTDoc
  -> applyPostChangesToCRDTDoc(..., { baseRecord })
  -> mergeCrdtBlocks(yblocks, incomingBlocks, cursor, baseRecord.blocks)
```

At the vulnerable merge point:

```text
current Y.Doc: paragraph-intro, remote-group, table-main,
               paragraph-middle, pullquote-main, paragraph-tail
baseRecord:   paragraph-intro, table-main, paragraph-middle,
               pullquote-main, paragraph-tail
local move:   paragraph-intro, table-main, pullquote-main,
               paragraph-middle, paragraph-tail
```

The Y.Doc has six top-level client IDs while the base and local move have five,
so the identity rebase cannot run. The known-fixes base then bypasses
`reconcileStaleLocalBlocks` because `baseRecord.blocks` is present:

```text
const blocksToSync = baseBlocksToSync
  ? localBlocksToSync
  : reconcileStaleLocalBlocks( yblocks, localBlocksToSync );
```

That sends the stale five-block list into the positional full-array merge
against a six-block Y array. The result is block loss or cross-block field
application.

## Fix

Use the explicit `baseRecord.blocks` snapshot as the previous local block
snapshot for stale-local reconciliation:

```text
const blocksToSync = baseBlocksToSync
  ? reconcileStaleLocalBlocks( yblocks, localBlocksToSync, baseBlocksToSync )
  : reconcileStaleLocalBlocks( yblocks, localBlocksToSync );
```

This preserves remote-only top-level blocks before the identity rebase/full
merge. The local Pullquote move and the remote Group insertion both survive,
and the Table and Pullquote keep their own attributes.

## Practical Impact

Real-user likelihood: low.

The prerequisites are ordinary editor actions and ordinary core blocks, but the
workflow requires active RTC collaboration and a narrow stale-edited-record
window around concurrent top-level structural edits. The blast radius is real
content corruption or loss in the block tree. A corrupted peer can persist the
bad tree by saving; recovery is undo/manual repair before save, or post
revisions/backups after save.

## Evidence

- Handoff manifest row `likely-real-issues.jsonl:195` has canonical signature
  `96d728530b28` and summary for seed `954010`.
- The original browser spec/status artifacts are absent locally, and the
  manifest has no runnable spec path.
- A pass-178 CRDT adapter repro using Paragraph/Table/Group/Pullquote blocks
  fails on `f256024286d` because `table-main` disappears.
- The same repro passes with the base-aware stale-local reconciliation fix.
- The adjacent `crdt-blocks` unit suite passes with the fix.

## Branches

- Explanation branch:
  `try/rtc-ws-checkpoint-move-suffix-cross-block-attribute-smear-96d728530b28`
- PR branch:
  `try/rtc-ws-checkpoint-move-suffix-cross-block-attribute-smear-96d728530b28-pr`
