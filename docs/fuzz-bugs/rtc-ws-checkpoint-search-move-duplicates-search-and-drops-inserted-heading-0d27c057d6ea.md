# RTC stale Search move after checkpoint can duplicate Search and drop a heading

Bug signature: `0d27c057d6ea`

Bug type: `rtc_ws_checkpoint_search_move_duplicates_search_and_drops_inserted_heading`

Transport: websocket

## Status

The archived seed `953135` raw operation log is not available locally, and the
materialized realistic Playwright probe did not create the intended Group
reparent precondition. A pass-174 CRDT-adapter reconstruction nevertheless
reproduces the same stale checkpoint family on the required May 7 known-fixes
base `f256024286dd80a4c0e2579f658c109256abf648`.

The reconstructed failure is:

1. Start from a normal post containing Paragraph, Group, Heading, Paragraph,
   Heading, Paragraph, checkpoint Paragraph, and Search blocks.
2. A remote collaborator moves `Follow-up heading` into the Group.
3. The local editor has the remote Y document state, but its next block sync is
   still based on the old `baseRecord.blocks`.
4. The local collaborator moves the checkpoint Search block upward from that
   stale base.
5. On `f256024286d`, `mergeCrdtBlocks()` skips stale snapshot reconciliation
   when explicit `baseRecord.blocks` are supplied. The positional fallback then
   materializes a second `core/search` under a paragraph clientId and copies
   paragraph content into Search attributes.

This is the Search/Heading variant of the same base-record stale top-level
checkpoint move hole documented by signature `9cf81e169f7e`.

## Practical Impact

Real-user likelihood: low to medium.

The user workflow is a multi-user post editor session with RTC over websocket.
The visible actions are ordinary Gutenberg operations: one collaborator moves a
Heading into a Group, while another moves a nearby Search block after a
checkpoint save/reload. The rare part is timing: the local CRDT document must
already contain the remote structural change, while the local editor edit is
applied with a stale pre-change `baseRecord.blocks` snapshot.

Common prerequisites are collaborative post editing, multiple tabs or users,
Group blocks, Heading blocks, Search blocks, top-level block movement, and the
normal `editEntityRecord`/sync-manager path that supplies `baseRecord`.

Rare or fuzzer-derived prerequisites are the exact marker text, the exact seed
ordering, and moving a Search block shortly after a Group reparent. Search
blocks are less common than Paragraph or Heading blocks in regular post bodies,
but the underlying stale base-record bug applies to ordinary top-level blocks.

Blast radius: semantic content corruption. A peer can duplicate a Search block,
cross-wire a paragraph clientId into a Search block, and smear paragraph content
into Search attributes. The historical archived row also reports loss of
`Seed 953135 step 1 user 0 heading` on one peer. If the corrupted peer saves,
the bad block tree/content can persist. I found no evidence of a save loop,
performance spiral, OOM, or browser crash. Recovery is reload/undo before save,
or post revisions/manual cleanup after persistence.

## Root Cause

The known-fixes base has stale full-snapshot reconciliation for cache-backed
edits, but not for explicit `baseRecord` edits:

- `reconcileStaleLocalBlocks()` preserves remote top-level inserts/deletes by
  comparing local, previous, and current clientId sets.
- `applyPostChangesToCRDTDoc()` passes `options.baseRecord.blocks` to
  `mergeCrdtBlocks()` for normal editor edits.
- At `f256024286d`, `mergeCrdtBlocks()` uses `localBlocksToSync` directly when
  `baseBlocksToSync` exists, so the stale snapshot is not reconciled.
- When the current Y array has a remote reparent that the stale base lacks,
  `rebaseYBlocksByClientId()` cannot run because the current and base clientId
  sets differ. The fallback diff then applies a stale full array positionally.

The minimal fix is to run `reconcileStaleLocalBlocks()` with the explicit
`baseBlocksToSync` before rebase/fallback merge, then keep the explicit base as
`previousBlocks` for rich-text and attribute merge semantics.

## Validation

Pass 174 added a temporary focused test
`rtc-0d27-pass174-base-record-replay.test.ts`.

On the required known-fixes base `f256024286d`, the test failed with two Search
blocks. The second Search had `clientId: "alpha-paragraph"` and
`content: "<strong>alpha</strong> beta"`.

On existing branch
`try/rtc-top-level-move-after-checkpoint-duplicates-heading-and-9cf81e169f7e-pr`
at `c8af86c24a5c70784e4604b66b772a0511859a00`, the same 0d27-focused test
passed.

The archived Playwright probe remains insufficient: both natural variants
recorded `headingNestedOnPrimary:false`, and the refreshed May 5 run failed in
the awareness readiness wait before either modeled editor action ran. A durable
natural Playwright/video route still needs a separate timing search around
checkpoint reload, remote Group reparent, and immediate stale Search move.
