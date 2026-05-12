# RTC stale base snapshot can restore a deleted paragraph after a move

Bug signature: `cfc514d1e7f6`

Bug type: `rtc_remote_delete_of_original_second_paragraph_after_move_under_sync_recovery`

Transport: WebSocket

## Summary

On the backlink-aware RTC known-fixes base `f256024286dd80a4c0e2579f658c109256abf648`, a stale editor block snapshot passed with `baseRecord.blocks` can restore a top-level paragraph that another collaborator already deleted.

The current upstream `origin/trunk` used for this explanation branch (`e20ec719971cebf6d7071ec2ea995a065d66ba72` when this was written) does not contain the synthetic known-fixes/base-record CRDT merge shape. The executable repro and fix branch for this signature is therefore based on the known-fixes base where the bug exists:

`try/rtc-remote-delete-of-original-second-paragraph-after-move--cfc514d1e7f6-pr`

## Natural Workflow

The product workflow is ordinary collaborative post editing:

1. Two browser tabs or users edit the same post with RTC enabled over WebSocket.
2. The post has three top-level Paragraph blocks.
3. One user inserts a tail Paragraph after the shared target paragraph.
4. The other user moves the shared target paragraph to the top.
5. The first user deletes the original second paragraph.
6. A stale full block snapshot from the peer, based on the pre-delete order, is merged after the delete has already reached the local Y.Doc.

No malformed block data is needed. The fuzz-specific pieces are the exact seed text and the deterministic timing that forces the stale full snapshot window. Network delay, reconnect, or sync recovery makes that window more plausible in real use.

## Root Cause

The known-fixes base already has `reconcileStaleLocalBlocks()` for stale full snapshots, but `mergeCrdtBlocks()` bypasses it when callers provide explicit `baseBlocks`:

```ts
const blocksToSync = baseBlocksToSync
	? localBlocksToSync
	: reconcileStaleLocalBlocks( yblocks, localBlocksToSync );
```

That makes the explicit `baseRecord.blocks` product path less robust than the implicit cached-base path. If the stale snapshot still includes a clientId that is absent from the current Y.Doc because another peer deleted it, the merge can treat the stale block as local intent and reinsert it.

The fix is to feed explicit base snapshots through the same reconciliation function:

```ts
const blocksToSync = baseBlocksToSync
	? reconcileStaleLocalBlocks(
			yblocks,
			localBlocksToSync,
			baseBlocksToSync
	  )
	: reconcileStaleLocalBlocks( yblocks, localBlocksToSync );
```

This is a remove-wins rule for stale full snapshots after the local Y.Doc has already observed a remote delete. It still permits edits to surviving blocks in the same snapshot.

## Evidence

Pass 179 added a direct `mergeCrdtBlocks()` repro:

`packages/core-data/src/utils/test/crdt-cfc514d1e7f6-pass179-merge-base.test.ts`

It fails on the exact known-fixes base because `original-second` reappears:

```text
Received:
[
  "Shared editing target paragraph with peer local edit.",
  "Seed 951640 baseline paragraph.",
  "Seed 951640 keeps a second paragraph for deletes and moves.",
  "rtc-cfc514-tail-italic",
]
```

The same test passes with the minimal reconciliation fix.

The archived natural browser spec is:

`test/e2e/specs/editor/collaboration/websocket/triage-cfc514d1e7f6-realistic.spec.ts`

Existing archived runs of that spec timed out in the WebSocket readiness helper before reaching the move/delete actions, so the browser evidence is a workflow repro artifact, not a completed video proof.

## Impact

Real-user likelihood is low for normal Gutenberg users because it requires RTC collaboration plus a stale full snapshot after a specific move/delete interleaving. Within active RTC sessions under delay or recovery, the likelihood is higher than a pure fuzz artifact because all user actions are normal Paragraph insertion, movement, and deletion.

Blast radius is content corruption and potential content resurrection. The deleted paragraph can reappear in the shared block tree and, through the post CRDT adapter, in derived serialized post content. Recovery is manual deletion again, reload from a clean peer if available, undo when applicable, or post revisions after a bad save.
