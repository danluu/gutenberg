# RTC WebSocket top-level block stale snapshot after delete/move

Bug signature: `a4dbbc0df63f`

Bug type: `rtc_ws_top_level_move_order_divergence_after_delete`

## Summary

Concurrent WebSocket RTC editing can leave one side applying a local top-level `blocks` snapshot that was captured before a remote delete/move/insert transaction finished reconciling. The original fuzz signature used ordinary Paragraph and Heading blocks:

1. Both editors start with `baseline`, `second`, and `shared` paragraphs.
2. A collaborator deletes `shared`, moves `second` above `baseline`, and inserts a `step2` paragraph plus a heading.
3. The first editor appends a formatted paragraph while still editing from the stale old block tree.

The waited realistic Playwright replay converged on the known-fixes base, so this is not a deterministic delete/move UI bug. The real defect is the narrower race: local block edits are scheduled asynchronously, and a remote `blocks` update can arrive before the scheduled local write reaches the CRDT.

## Evidence

On current `origin/trunk` `e359bb010becda46b5f58aaa6baa37079c36f557`, a pass-177 scratch manager test showed that the stale local block array is allowed to reach the CRDT update path. With a scalar `blocks` sync config, the final CRDT record became:

```text
baseline | second | shared | <em>italic</em>beta 954276 0
```

This resurrects the remotely deleted `shared` paragraph and loses the remote heading and `step2` paragraph.

On the required known-fixes stack `f256024286dd80a4c0e2579f658c109256abf648`, proposed PR `77924` adds `remoteKeyVersions` and `reconcilingRemoteKeys` filtering in `packages/sync/src/manager.ts`. That prevents the stale overwrite, but treats `blocks` as a scalar key. In the same pass-177 manager probe, the final CRDT record became:

```text
heading | second | baseline | step2
```

The local formatted paragraph was silently dropped.

A pass-177 CRDT-block adapter probe also failed on both bases:

- current `origin/trunk`: stale local merge resurrected `shared` and lost the remote heading/step2;
- known-fixes `f256024286d`: base-record merge kept heading/second/baseline/formatted but dropped remote `step2`.

## Root Cause

`editEntityRecord` captures the current edited record and calls `getSyncManager().update(...)` before dispatching the local `EDIT_ENTITY_RECORD` reducer update. `SyncManager.update` is deferred to a later event-loop tick. If a remote Yjs transaction touches `blocks` before that deferred local update runs, the local update is based on stale top-level block order.

The fix stack currently has two incomplete behaviors:

- current trunk lets the stale local `blocks` update through and relies on `mergeCrdtBlocks` to reconcile it;
- PR `77924` filters same-key local updates during remote reconciliation, which is appropriate for scalar fields but too coarse for structured mergeable fields like `blocks`.

`blocks` needs an explicit merge/rebase contract. It should not be treated as one last-writer register.

## Practical Impact

Likelihood is low for active RTC WebSocket collaboration users and very low for default single-user Gutenberg use. The trigger uses normal editor actions, but requires two active editors and a narrow event-loop/network interleaving.

Potential blast radius is content loss or block-tree corruption. The observed lower-level outcomes include dropping a local formatted paragraph, resurrecting a remotely deleted paragraph, and losing a remote inserted paragraph. If the corrupted or lossy tree is saved, recovery likely requires undo before save, revision restore, or manual repair.

## Fix Direction

Do not remove the remote-key filter globally. Scalar fields still need stale-write protection.

Instead, make mergeable top-level keys explicit in the sync contract. For `blocks`, a local update scheduled before a remote blocks reconciliation should be rebased once against the current CRDT block state using the captured base record and local change payload. The invariant should be:

- remote delete/move/insert blocks are preserved exactly once;
- local-only appended/typed blocks are preserved exactly once;
- remotely deleted blocks are not resurrected;
- remote relative order is preserved when the local append anchor was concurrently deleted.

A complete fix still needs a no-wait natural Playwright stress repro before opening a user-facing PR.
