# RTC stale Search move after reload can drop a remote Group move

Bug signature: `917b18171038`

Bug type: `rtc_ws_search_checkpoint_smear_after_reload_move_into_group_then_move`

Transport: websocket

## Status

This is not an exact browser replay of archived seed `953041`; the exact
operation log and full browser artifacts are not available locally. The handoff
manifest and analysis-tier rows still describe a stable real WebSocket
collaboration corruption after save/reload, `move-block-into-group`, and a later
top-level move near a checkpoint Search block.

The focused current-base reconstruction is narrower but product-shaped: it uses
the normal `applyPostChangesToCRDTDoc()` path with `baseRecord.blocks`, which is
how local editor edits are forwarded from `editEntityRecord()` through the sync
manager. On the May 7 known-fixes base `f256024286d`, the replay leaves a
paragraph that a remote collaborator moved into a Group as a stale top-level
block. The proposed fix preserves the Group move, keeps exactly two Search
blocks, and does not leak paragraph content into Search attributes.

## Practical Impact

Real-user likelihood: low.

The natural workflow is a multi-user post editor session with RTC enabled over
WebSocket. The ordinary user actions are saving/reloading a draft, editing
Heading/Paragraph/Group/Search blocks, moving a paragraph into a Group, and
moving a top-level Search block near the checkpoint area. The rare part is the
interleaving: one peer must submit a full block snapshot based on an older
editor state while that peer's Y doc already contains a remote structural move.

Common prerequisites: collaborative editing, save/reload, Group blocks, Search
blocks, and block move controls are all normal Gutenberg behavior.

Rare or fuzz-derived prerequisites: the exact seed markers, the checkpoint
labels, the Search-adjacent block order, and the stale-base timing came from
fuzzing. Search blocks in post content are less common than paragraphs/headings,
and the stale `baseRecord` race is timing-sensitive.

Blast radius: semantic content corruption. In the archived report, one peer lost
a concurrent paragraph, overwrote a Heading with paragraph text, and gained a
duplicate malformed Search block with a stray paragraph `content` attribute. In
the focused current-base replay, the remote move into Group is not preserved and
the moved paragraph remains as a stale top-level block. If the bad peer saves,
the wrong block tree can persist. There is no evidence for a save loop, OOM, or
browser crash. Recovery is reload/undo if noticed before save, otherwise post
revisions or manual repair.

## Root Cause

The May 7 known-fixes base reconciles stale cache-backed local block snapshots,
but it skips that reconciliation when `mergeCrdtBlocks()` receives explicit
`baseBlocks`.

At `f256024286d`, the relevant flow is:

1. `applyPostChangesToCRDTDoc()` receives a local edit with `blocks`, `content`,
   and `{ baseRecord: { blocks } }`.
2. `mergeCrdtBlocks()` sets `previousBlocks` to that explicit base.
3. Because `baseBlocksToSync` exists, it uses the incoming local block snapshot
   directly instead of running stale-block reconciliation.
4. If current Y blocks already include a remote top-level or nested structural
   move absent from the stale local snapshot, the client-id rebase cannot fully
   repair the mismatch and the fallback merge can retain or delete stale
   top-level blocks.

For this signature, the remote move puts the `concurrent` paragraph inside the
Group. The stale Search-move snapshot still has that paragraph at top level. On
`f256024286d`, the merged result includes the stale top-level paragraph before
the Group.

## Fix Plan

Use the same stale-block reconciliation for explicit `baseRecord` edits that is
already used for cache-backed edits:

1. Let `reconcileStaleLocalBlocks()` accept an explicit base block array.
2. When `mergeCrdtBlocks()` receives `baseBlocksToSync`, reconcile the local
   blocks against current Y blocks and the explicit base before client-id rebase
   and fallback merge.
3. Keep using the explicit base as `previousBlocks` for attribute/rich-text
   merge semantics.

This is the same minimal fix as sibling branch
`try/rtc-top-level-move-after-checkpoint-duplicates-heading-and-9cf81e169f7e-pr`
commit `c8af86c24a5`.

## Extra Validation Needed

The shortest confidence-improving browser experiment is a two-tab WebSocket
Playwright probe that creates Heading/Paragraph/Group/Search content through the
editor UI, saves and reloads, moves a paragraph into the Group in one tab, then
immediately moves the checkpoint Search block from the other tab while its
visual/editor state is stale. It should assert normalized blocks on both peers
and persisted content after save. The exact seed `953041` operation log should
be replayed first if it is recovered.
