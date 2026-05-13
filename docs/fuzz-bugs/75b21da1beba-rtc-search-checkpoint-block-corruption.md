# RTC Search/checkpoint corruption after stale move

Bug signature: `75b21da1beba`

Bug type: `rtc_search_checkpoint_block_corruption_after_move_under_faulty_sync`

The archived fuzz family shows a real RTC convergence/corruption failure around
top-level block moves near `core/search` blocks after a save/reload checkpoint.
The exact raw seed artifact is not present in the available checkout, but the
handoff manifest and sibling rows all describe the same shape: one collaborator
retains the checkpoint paragraph and nearby Search blocks while another loses or
duplicates a Search block and may smear checkpoint paragraph text into Search
attributes.

## Affected integration

This specific residual mechanism was verified on the backlink-aware known-fixes
base `f256024286dd80a4c0e2579f658c109256abf648`. Current `origin/trunk` at the
time of this analysis did not contain the explicit `baseRecord.blocks` CRDT
update path, so the defect is best understood as an integration bug in the
proposed RTC fix stack rather than a clean trunk-only regression.

The vulnerable path is:

1. `editEntityRecord()` calls `getSyncManager().update()` with
   `baseRecord: editedRecord` for synced entity edits.
2. `SyncManager.update()` forwards that base record to
   `applyChangesToCRDTDoc()`.
3. `applyPostChangesToCRDTDoc()` passes `baseRecord.blocks` to
   `mergeCrdtBlocks()`.
4. On `f2560242`, `mergeCrdtBlocks()` uses the explicit base for client-id
   rebasing, but bypasses stale top-level block reconciliation when
   `baseBlocksToSync` is present.

If a remote peer inserts a top-level block and a stale peer then applies a full
block snapshot move based on the pre-insert list, the stale snapshot can be
interpreted as a deletion of the remote block. `core/search` is not special to
the merge algorithm, but Search/checkpoint adjacency made the archived
corruption easy to detect.

## Practical Impact

Real-user likelihood on `f2560242`: `low`.

The natural workflow is collaborative post editing over RTC, with two tabs or
two users editing the same draft. The content contains ordinary paragraphs and
Search blocks. One participant inserts or receives a top-level Search block
near a saved checkpoint while another participant still has a stale full-block
base and then moves a nearby paragraph using normal block move controls. The
archived fuzz seed also involved HTTP sync retry timing and reload/checkpoint
steps; those are artificial inputs, but they model delayed or interrupted
collaboration sync.

Common prerequisites: paragraphs, Search blocks, draft saves, reloads, and
toolbar block moves are normal editor actions. The explicit base-record update
path is product code in the proposed RTC stack.

Rare prerequisites: two active sessions, stale-base timing, and a move ordered
near a concurrent top-level insert are required. Search blocks are also less
common than paragraphs, headings, or lists.

Blast radius: persisted content corruption is possible if the corrupted state is
saved. The deterministic reconstruction drops a remote Search block. The
archived family reports missing checkpoint paragraphs, duplicate Search blocks,
and paragraph content leaking into Search attributes. Recovery is undo while
available, revision restore, or manual block repair. There is no evidence of a
save loop, performance problem, or UI-only inconsistency.

## Fix Plan

The fix is to apply the existing stale top-level block reconciliation to
explicit-base edits as well. When `mergeCrdtBlocks()` receives `baseBlocks`,
those blocks should act as the previous local snapshot for
`reconcileStaleLocalBlocks()` instead of causing reconciliation to be skipped.

This keeps the change local to the merge adapter, reuses the existing
client-id-based reconciliation, and avoids Search-specific behavior. The
important invariant is that a stale full snapshot must not convert a concurrent
remote insert into a local delete.

The post-manifest fix commit that implements this shape is
`c8af86c24a5c70784e4604b66b772a0511859a00` on
`try/top-level-move-reconciliation-preserves-wrong-yblock-after-45c313bc2541-pr`.
