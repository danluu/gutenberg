# RTC CRDT Top-Level Insert Can Corrupt Block Identity

Bug signature: `40b91aaca7bb`

Bug type: `rtc-crdt-top-level-insert-merge-corrupts-block-identity-and-attributes`

Transport: websocket

## Summary

The original generated Playwright replay for this signature is not a clean
current-browser reproduction: the archived refreshed run timed out in the
websocket readiness helper before executing the final Group move. However, the
same failure family has a smaller production-path reproduction through
`applyPostChangesToCRDTDoc()`.

On the May 7 backlink-aware known-fixes base `f256024286d`, an explicit
`baseRecord.blocks` edit can still merge a stale local Group edit into a
remotely inserted Paragraph's Y block. The visible result is structural block
identity corruption: the inserted Paragraph remains, the Group disappears, and
the Group child is grafted under the Paragraph.

## Natural Workflow

The workflow requires real-time collaboration on a post over the websocket sync
transport:

1. Two editors open the same post.
2. The post contains ordinary top-level Paragraph and Group blocks.
3. One editor inserts a top-level Paragraph before the Group.
4. Another editor applies a stale edit to the Group based on an older post
   snapshot.

This does not require malformed block data or direct store mutation. The normal
editor path calls `editEntityRecord()`, which forwards the current
`getEditedEntityRecord()` value as `baseRecord` into the sync manager and then
into `applyPostChangesToCRDTDoc()`.

## Root Cause

In `mergeCrdtBlocks()`, the `f256024286d` base chooses:

```ts
const blocksToSync = baseBlocksToSync
	? localBlocksToSync
	: reconcileStaleLocalBlocks( yblocks, localBlocksToSync );
```

That means the stale-block reconciliation that preserves remote top-level
inserts is skipped exactly when the normal editor supplies an explicit base
record. If the remote Paragraph is present in the current Y array but not in the
stale local array, the later positional merge can apply the Group data to the
Paragraph slot and delete the real Group.

The fix is to let `reconcileStaleLocalBlocks()` accept the explicit base blocks
and run the same remote-insert preservation before the positional merge.

## Practical Impact

Likelihood is low: active same-post RTC collaboration is needed, and the stale
base edit must land after a remote top-level insert near the same Group. The
prerequisites are ordinary editor behavior, but the timing is narrow.

Blast radius is high if the timing is hit: live block-tree corruption, possible
content loss or duplicated/grafted nested content, and possible persistence if a
corrupted peer saves. Recovery is undo while available, revision restore, or
manual block repair.

## Evidence

- Deterministic adapter-level regression on `f256024286d`: a valid
  `applyPostChangesToCRDTDoc()` sequence turns the remote Paragraph into a
  Paragraph with the stale Group child and drops the real Group.
- The same regression passes on `c8af86c24a5`, whose fix reconciles stale local
  blocks even when a base record is supplied.
- The original Playwright artifacts are useful only as historical context:
  refreshed websocket runs timed out in `waitForAwarenessPeerCount()` before
  reaching the final block move.

## Follow-Up

The shortest confidence-improving browser experiment is a websocket-aware
natural Playwright repro that avoids the stale `wp-sync` HTTP readiness waiter
and asserts the reduced workflow: remote Paragraph insert before Group, local
stale Group edit/move, then compare both editors' normalized block trees.
