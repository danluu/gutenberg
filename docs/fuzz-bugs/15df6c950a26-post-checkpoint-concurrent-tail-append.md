# RTC post-checkpoint concurrent tail append can drop one paragraph

Bug signature: `15df6c950a26`

Bug type: `rtc_ws_post_checkpoint_concurrent_tail_append_drops_one_remote_paragraph`

Transport: WebSocket RTC

Current status: reproduced on the May 7 known-fixes integration base `f256024286dd80a4c0e2579f658c109256abf648`.

## User-visible workflow

Two collaborators edit the same post over WebSocket RTC. The post contains normal top-level blocks, including a tail Search block. One collaborator saves a draft checkpoint, the other collaborator reloads and resynchronizes, then both users select the same tail Search block and use the block toolbar Options menu to choose Add after. Each user types a different paragraph at normal automated typing speed (`80ms` per character).

The failure is not tied to malformed block markup, direct store mutation, or a synthetic block tree. The UI repro uses the post editor, a saved draft, two browser contexts, the block toolbar, and normal text entry. The exact seed content uses a Search block because that is what the original fuzz seed targeted, but the lower-level failure is a same-position top-level append race.

## Observed failure

On the known-fixes base, a strict UI repro failed immediately in attempt 0: after both collaborators used Add after, only one of the two new paragraphs was visible. A nonfatal capture variant then ran three attempts and found the same content-loss shape in all three:

- attempt 0: both peers converged and reloaded with only `rtc15df pass171 secondary after checkpoint 0`.
- attempt 1: both peers converged and reloaded with only `rtc15df pass171 secondary after checkpoint 1`.
- attempt 2: both peers converged and reloaded with only `rtc15df pass171 primary after checkpoint 2`.

In each capture attempt, the live states were equal across collaborators, the reloaded states were equal, but the saved post content did not contain both inserted paragraphs. That makes this persistent content loss, not a transient UI-only disagreement.

## Root cause

The known-fixes base adds stale local snapshot reconciliation in `packages/core-data/src/utils/crdt-blocks.ts`. `mergeCrdtBlocks` keeps `previousLocalBlocksCache` per Y block array and calls `reconcileStaleLocalBlocks` when the caller does not supply a pre-change base.

The failing sequence is:

1. The shared Y array contains `[Anchor, Tail]`.
2. A remote append arrives first, so the Y array becomes `[Anchor, Tail, Remote]`.
3. The local editor/store feeds that remote-inclusive snapshot back through `mergeCrdtBlocks`, updating `previousLocalBlocksCache` to `[Anchor, Tail, Remote]`.
4. A delayed local append snapshot from a user who started at `[Anchor, Tail]` arrives as `[Anchor, Tail, Local]`.
5. `reconcileStaleLocalBlocks` skips the current `Remote` block because its client ID exists in the cached previous snapshot.
6. The later left/right full-array merge sees the same array length and updates the `Remote` Y map in place to `Local`, silently losing the remote paragraph.

The lowest-level regression test constructs that exact state progression with plain paragraph blocks and no browser harness.

## Origin analysis

The stale snapshot reconciliation code is from `5bda437f0cc4` (`Preserve saved content from stale editor snapshots`) and was then combined with later CRDT/rebase work in the synthetic known-fixes integration commit `f256024286dd80a4c0e2579f658c109256abf648`. The vulnerable interaction depends on the cached-base path in `mergeCrdtBlocks` and the older full-array left/right diff originally introduced in the CRDT merge implementation. The bug is an integration failure between the content-preserving stale snapshot heuristic and concurrent same-position appends: the heuristic treats a current block that is absent from a stale local snapshot as safe to omit when it also appears in the cached base.

## Fix plan

The local fix is to make stale snapshot reconciliation add-wins in the ambiguous case where the incoming local snapshot contains a local-only inserted block. If a current block is missing from the local snapshot and the snapshot also contains a block that is absent from both the previous cache and current Y array, preserve the current block instead of interpreting its absence as a deletion.

This keeps the change small and local to `reconcileStaleLocalBlocks`, uses existing client-ID sets, and adds one O(n) check over the local block IDs. It does not introduce a new data model or transport contract.

The main residual risk is the ambiguous delete-plus-insert case: a user who intentionally deletes a block and inserts another block in the same stale snapshot could have the deleted block preserved. In the absence of causal delete/insert intents, that is the safer failure mode for collaborative editing because it preserves content that can be manually deleted later instead of silently losing another collaborator's paragraph.

## Branch artifacts

The PR branch `try/rtc-ws-post-checkpoint-concurrent-tail-append-drops-one-re-15df6c950a26-pr` is based on the known-fixes integration SHA and has commits in this order:

1. `Add regression test for stale append race`
2. `Add UI repro for checkpointed tail append loss`
3. `Preserve concurrent appends over stale snapshots`

The explanation branch only records this analysis on top of `origin/trunk`, because the precise failing reconciliation code is currently part of the synthetic known-fixes base rather than plain trunk.
