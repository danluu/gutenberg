# RTC stale base-record paragraph move can drop remote inserts

Bug signature: `e52fa38cd263`

Bug type: `rtc_stale_local_top_level_move_duplicates_paragraph_after_remote_inserts`

Transport: WebSocket

## Summary

The original `e52fa38cd263` handoff describes a stale RTC top-level paragraph move racing remote top-level inserts. Earlier passes proved the no-explicit-base merge path was fixed on the May 7 known-fixes manifest SHA `f256024286dd80a4c0e2579f658c109256abf648`.

Pass 176 found a surviving product-path variant on that exact manifest SHA: when the same stale local move reaches `applyPostChangesToCRDTDoc()` with `baseRecord.blocks`, `mergeCrdtBlocks()` bypasses stale-local reconciliation and treats the local full block array too authoritatively. In the focused reduction, the manifest base drops the later remote `STEP4` and `STEP2` paragraphs and leaves the baseline move unapplied. The later local fix commit `c8af86c24a5c70784e4604b66b772a0511859a00` preserves all remote inserts by reconciling explicit-base edits too.

## Natural workflow

The user-visible workflow is normal RTC collaboration in the post editor:

- two users or two tabs edit the same post over the WebSocket RTC provider;
- the post contains ordinary top-level Paragraph blocks, plus a normal Group containing Paragraph and Heading blocks;
- one collaborator inserts top-level content while the other collaborator's editor still has a stale full-block snapshot;
- the stale editor uses a normal block move action to move an existing paragraph;
- a later save can persist the corrupted block tree.

The exact seed strings and deterministic ordering are fuzz artifacts. The concurrency condition is the important part: a stale full local block array with `baseRecord.blocks` races remote top-level inserts already present in the Yjs document.

## Impact

On affected code this is semantic content corruption, not a UI-only mismatch. The focused pass-176 adapter repro loses remote top-level paragraphs from both the block array and derived serialized content. The original browser family also reported a duplicate baseline paragraph and a dropped sibling paragraph. Recovery is manual undo or reload if noticed early; after save, recovery is manual repair or revision restore.

Real-user likelihood is `low`: all actions are ordinary collaboration actions, but the race needs RTC enabled, at least two sessions, and a stale explicit-base block snapshot at the moment a structural move is applied.

## Root cause

At `f256024286d`, `mergeCrdtBlocks()` reconciles stale local snapshots only when no explicit base is supplied:

```ts
const blocksToSync = baseBlocksToSync
	? localBlocksToSync
	: reconcileStaleLocalBlocks( yblocks, localBlocksToSync );
```

That is unsafe for normal product edits, because `editEntityRecord()` and the sync manager can pass a pre-change `baseRecord`. If remote-only top-level blocks already exist in `yblocks`, the explicit-base path can fall through to positional full-array merge and delete or mis-merge those remote blocks.

The fix is to let `reconcileStaleLocalBlocks()` use an explicit base snapshot and call it for both no-base and explicit-base local block snapshots.

## Evidence

Pass 176 added a temporary `applyPostChangesToCRDTDoc()` reduction:

`packages/core-data/src/utils/test/crdt-e52fa38cd263-pass176-base-record.test.ts`

Result on the required manifest base:

```text
f256024286d: FAIL
Expected STEP4 and STEP2 exactly once.
Received top-level summary:
group:Seed 953452 step 3 user 0 nested paragraph | Seed 953452 step 3 user 0 nested heading
Seed 953452 baseline paragraph.
Seed 953452 keeps a second paragraph for deletes and moves.
Shared editing target paragraph.
```

Result on the later sibling fix:

```text
c8af86c24a5: PASS
```

The preserved generated browser spec remains useful for workflow context, but it is not durable regression evidence: the original handoff source spec path is absent locally, and the preserved wrapper catches scenario errors and only asserts that a post was created.

## Fix plan

1. Add an explicit-base adapter regression for the `e52fa38cd263` paragraph move plus remote inserts.
2. Keep a placeholder commit documenting that a hard-failing natural Playwright repro still needs reconstruction.
3. Apply the base-aware reconciliation fix from `c8af86c24a5`.
4. Separately harden a natural two-peer WebSocket Playwright scenario that fails on any readiness/convergence error and asserts both editor states plus persisted content.
