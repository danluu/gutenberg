# RTC WebSocket delete of recent remote heading can be replayed by stale base-record edits

Fuzz signature: `62db5968059e`

Bug type: `rtc_ws_delete_of_recent_remote_heading_not_replayed_to_other_peer`

Transport: WebSocket RTC

## Summary

A collaborator can delete a recently inserted remote top-level Heading, but another peer can replay that deleted Heading from a stale full-block snapshot. The affected peer then diverges from the deleting peer and can later persist the deleted block.

This is not a malformed block or locator issue. The user-visible workflow is ordinary post-editor collaboration:

1. Two peers edit the same post with RTC enabled.
2. Peer B inserts a top-level Heading.
3. Peer A receives and deletes that Heading.
4. Peer B has a local same-key block update queued while remote reconciliation is in progress, and that queued update carries a `baseRecord` that still contains the Heading.
5. The queued update is applied to a Y.Doc whose current block tree no longer contains the Heading.

## Root Cause

`editEntityRecord` sends synced entity edits through the sync manager with `baseRecord: editedRecord`. The sync manager intentionally defers local CRDT writes with `setTimeout( 0 )`. It also allows local same-key updates scheduled after remote reconciliation has started, so a block edit can be applied with an old base snapshot while the Y.Doc already contains the remote delete.

On the known-fixes base `f256024286dd80a4c0e2579f658c109256abf648`, `mergeCrdtBlocks` uses stale-delete reconciliation only when no explicit base snapshot is supplied:

```ts
const blocksToSync = baseBlocksToSync
	? localBlocksToSync
	: reconcileStaleLocalBlocks( yblocks, localBlocksToSync );
```

That bypass means a local full-block snapshot and its stale base can both contain the recently deleted Heading, so the merge treats the Heading as a local survivor and inserts it back into the CRDT block array.

## Evidence

The strongest current evidence is a SyncManager-level reconstruction, not just
a direct `mergeCrdtBlocks` or `applyPostChangesToCRDTDoc` call:

`packages/core-data/src/utils/test/crdt-pass176-sync-manager-stale-base-delete.test.ts`

The test sets up:

1. A post document that contains `Alpha`, `Remote Heading`, `Beta`, `Tail`.
2. A remote Yjs update that deletes `Remote Heading` and starts remote reconciliation.
3. A local `SyncManager.update` scheduled after that remote reconciliation starts but before the local edited record catches up.
4. A stale `baseRecord` and stale local block snapshot that both still contain `Remote Heading`.

The reconstruction fails on both the backlink-aware known-fixes base and
current `origin/trunk` when only the repro test is present:

```text
f256024286dd80a4c0e2579f658c109256abf648:
FAIL: ["Alpha collaborator stale edit","Remote Heading","Beta","Tail"]

cb74beb786b366ff69dac328b04861add1a67974 + repro only:
FAIL: ["Alpha collaborator stale edit","Remote Heading","Beta","Tail"]
```

The refreshed PR branch head removes the deleted Heading:

```text
5f2a4fc1a398a51c27834f8da0cd52eec573da82:
PASS: ["Alpha collaborator stale edit","Beta","Tail"]
```

The repeated Jest warning about Yjs being imported twice is a known local test-environment warning and is not the pass/fail signal.

## Fix Direction

The refreshed fix commit
`5f2a4fc1a398a51c27834f8da0cd52eec573da82` makes
`reconcileStaleLocalBlocks` accept `baseBlocks` and calls it even when
`mergeCrdtBlocks` receives an explicit base snapshot. That keeps stale local
snapshots from replaying blocks that were present in the base but already
deleted from the current Y.Doc.

This is the smallest fix that covers both production paths:

- cached previous-local snapshots, where no explicit base is supplied;
- normal `editEntityRecord` updates, where `baseRecord` is supplied.

## Practical Impact

Real-user likelihood: `low` overall in normal Gutenberg use, because the bug
requires active RTC collaboration and a narrow stale-record timing window.
Conditional on two active editors using WebSocket RTC with some network or
main-thread latency, likelihood is closer to `medium`: the user actions are
ordinary and the failure is in production sync scheduling.

Common prerequisites:

- two collaborators or two tabs editing the same post;
- RTC enabled over WebSocket;
- normal top-level Heading insertion, deletion, and another local block edit.

Rare timing prerequisites:

- remote reconciliation for the `blocks` key has started;
- the local edited record has not caught up yet;
- a local same-key block update is scheduled with a stale `baseRecord`.

Blast radius:

- content divergence between peers;
- lost delete intent;
- possible persistence of the deleted Heading by a later save from the stale peer.

No evidence was found for an editor crash, save loop, unbounded duplication, or OOM/performance risk. Recovery is manual: reload if unsaved, delete the replayed block again, or recover from revisions if it was saved.
