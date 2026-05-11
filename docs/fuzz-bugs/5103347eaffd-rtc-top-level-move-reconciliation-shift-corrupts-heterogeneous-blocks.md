# RTC top-level move reconciliation can drop remote heterogeneous blocks

Bug signature: `5103347eaffd`

Bug type: `rtc_top_level_move_reconciliation_shift_corrupts_heterogeneous_blocks`

## Summary

The RTC block merge path can treat a stale full local block snapshot as an
authoritative deletion/replacement of a concurrently inserted remote top-level
block. In the original fuzz bucket, a mixed paragraph/Search/table/list region
diverged after one peer inserted a block while another peer moved a top-level
block from an older ordering. The visible failure is persistent-capable content
corruption: a remote insert can disappear, and positional merging can graft
attributes from one block type onto a neighboring block identity.

Pass 178 found a narrower gap than the earlier cache-based reproduction. The
synthetic known-fixes base `f256024286dd80a4c0e2579f658c109256abf648` preserves
the remote insert when `mergeCrdtBlocks()` relies on
`previousLocalBlocksCache`, but it still drops the remote insert when the caller
supplies a stale `baseRecord`/`baseBlocks`. The normal editor path added by the
known-fix stack passes `baseRecord` from `editEntityRecord()` through
`syncManager.update()` into `applyPostChangesToCRDTDoc()`, so the base-record
branch is not an artificial-only path.

## User Workflow

The natural workflow is:

1. Two tabs or two users collaborate on the same post with RTC enabled.
2. The document contains a heterogeneous top-level region, such as paragraph,
   Search, table, and list blocks.
3. One collaborator inserts a top-level block in that region.
4. Another collaborator has a local move based on the older block order, such as
   moving the table above the paragraph, while the shared CRDT document has
   already seen the remote insert.
5. The stale full block snapshot is merged into the CRDT document.

No malformed blocks, direct store mutation, or synthetic invalid block trees are
required for the product-level shape. The rare part is the event ordering: the
second collaborator's full local block snapshot must be stale relative to the
CRDT document. Network delay, reload/save churn, and busy editing make that
window easier to hit, but the reduced CRDT repro does not require reload.

## Root Cause

`mergeCrdtBlocks()` was introduced by `84019935998c` (`Improve CRDT "merge
logic" for post entities (#72262)`) with a position-based array diff. It trims
equal prefix/suffix entries, updates the middle positionally, then applies
length-based deletes/inserts. That assumes `incomingBlocks[i]` and
`yblocks[i]` still refer to the same logical block.

Concurrent top-level insertion violates that assumption. A stale local move can
arrive as a full block array that omits the remote insert. The old merge then
uses array length and position, so the remote insert is interpreted as a local
delete or as the wrong neighbor's identity.

The backlink-aware known-fix stack changed the merge algorithm to use stable
`clientId` data, previous local snapshots, and base snapshots. However,
`f256024286d` only reconciles remote-only current blocks when no explicit
`baseBlocks` argument is supplied. When `baseBlocks` is supplied, the code uses
`localBlocksToSync` directly, so remote-only current blocks are still missing
from `blocksToSync` and the later positional fallback can delete them.

The later related branch commit `c8af86c24a5c` (`Preserve remote top-level
blocks for base-record edits`) fixes this narrower gap by passing `baseBlocks`
into `reconcileStaleLocalBlocks()`:

```text
const blocksToSync = baseBlocksToSync
    ? reconcileStaleLocalBlocks( yblocks, localBlocksToSync, baseBlocksToSync )
    : reconcileStaleLocalBlocks( yblocks, localBlocksToSync );
```

## Evidence

The handoff manifest classifies this as high-confidence and runnable, with six
signatures in the bucket. It calls out the same-run duplicate relationship to
`64edf2f8cbab` and describes corruption after remote edits, save/reload churn,
and a final top-level move across a heterogeneous paragraph/Search/table/list
segment.

The materialized Playwright spec at the prompt path is absent from the current
checkout. The May 5 refresh copy uses natural two-user UI actions, but only
asserts visibility of inserted text and does not assert final block identity or
reload persistence.

Pass 178 added an independent lower-level check:

- Exact known-fixes base `f256024286d`: a temporary Jest test using real `Y.Doc`
  and production `mergeCrdtBlocks()` fails when the stale local move supplies
  its pre-change `baseBlocks`. The remote paragraph is present after the remote
  update and then disappears after the stale local move.
- Existing related fix commit `c8af86c24a5`: the same temporary test passes,
  preserving the final client ID order
  `[ table-a, paragraph-a, remote-paragraph, search-a, list-a ]` and the
  representative paragraph/Search/table/list attributes.

The detached test command was:

```bash
npm run test:unit -- packages/core-data/src/utils/test/crdt-5103347eaffd-pass178-base-record.test.ts --runInBand
```

## Practical Impact

Current unresolved likelihood on plain `origin/trunk` and the documented
`f256024286d` known-fixes base is `low` to `medium`: the required workflow is
normal collaboration and normal top-level block movement, but the stale snapshot
race is timing-sensitive. If hit, the blast radius is real content loss or
corruption, not only UI disagreement. Recovery is undo while the affected
session still has useful undo history, manual cleanup, reload before save if the
bad state has not persisted, or revisions/backups after persistence.

The strongest evidence against a high likelihood is that two active
collaborators editing and moving blocks in the same top-level region is less
common than single-user editing, and the reduced failure requires a narrow
ordering window. The strongest evidence against dismissing it as fuzz-only is
that all reduced operations are ordinary editor operations and the failing path
is production `mergeCrdtBlocks()` with real Yjs types.

## Fix Direction

The minimal fix is to make explicit base-record edits use the same remote-only
block reconciliation as cache-based stale edits. That is the smallest local
change and avoids a second structural merge path.

Robustness checks:

- Kernel-maintainer view: do not add another positional special case; preserve a
  single reconciliation step before any array diff fallback.
- Distributed-systems view: the merge must treat a local full snapshot as a
  delta from its base, not as a complete replacement of a CRDT document that may
  contain unseen remote operations.
- Simplicity/performance view: reuse the existing `clientId` sets and
  `getRemoteBlockInsertIndex()` logic. This remains linear over the top-level
  block list and avoids deep global diffing.

The shortest remaining browser experiment is a two-tab Playwright repro that
asserts the normalized block tree, not just text visibility, after remote insert
plus stale top-level move and after save/reload.
