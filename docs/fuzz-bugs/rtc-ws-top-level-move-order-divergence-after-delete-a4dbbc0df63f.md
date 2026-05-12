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

Pass 178 added a two-peer Yjs block adapter probe on current `origin/trunk`
`d53a8f534f761275fae2283130c9743dbc0f688c`, the pinned known-fixes base
`f256024286dd80a4c0e2579f658c109256abf648`, and the later local
`c8af86c24a5c70784e4604b66b772a0511859a00` base-record block patch. The
probe starts local and remote Y.Docs from the same three Paragraph blocks,
applies the collaborator's real-user-shaped delete/move/heading/paragraph
insert on the remote peer, syncs that Yjs update into the local peer, then
applies the stale local append snapshot with the captured base record.

The expected converged order is:

```text
heading | second | baseline | step2 | <em>italic</em>beta 954276 0
```

Observed results:

```text
origin/trunk d53a8f534f7:
baseline | second | shared | <em>italic</em>beta 954276 0

known-fixes f256024286d:
heading | second | baseline | <em>italic</em>beta 954276 0

later c8af86c24a5 base-record patch:
heading | step2 | heading | second | <em>italic</em>beta 954276 0
```

This independently confirms that the defect is not only manager-level stale
same-key filtering. The block-level rebase code still lacks a correct
three-way ordering rule for "remote moved old blocks plus remote inserted new
blocks plus local-only stale append."

Pass 179 added a smaller explicit-base `mergeCrdtBlocks` repro. It first
sets the current CRDT block array to the collaborator's real-user-shaped
`heading | second | baseline | step2` state, then applies the first editor's
stale `baseline | second | shared | formatted` snapshot with the captured
`baseline | second | shared` base record. The expected result is:

```text
heading | second | baseline | step2 | <em>italic</em>beta 954276 0
```

Observed results:

```text
origin/trunk fc8b3db6ace:
baseline | second | shared | <em>italic</em>beta 954276 0

known-fixes f256024286d:
heading | second | baseline | <em>italic</em>beta 954276 0

candidate a5621725e86 ("Preserve RTC block order across stale snapshots"):
baseline | second | shared | <em>italic</em>beta 954276 0
```

That candidate branch is useful design evidence because it contains the
current-CRDT-order skeleton idea, but it is not sufficient for this seed's
explicit base-record path. The pass-179 repro shows the bug still survives
current `origin/trunk` after a May 12 fetch and the pinned May 7 known-fixes
base, and that a nearby stale-order candidate can still resurrect the deleted
paragraph while dropping the remote heading and inserted paragraph.

## Root Cause

`editEntityRecord` captures the current edited record and calls `getSyncManager().update(...)` before dispatching the local `EDIT_ENTITY_RECORD` reducer update. `SyncManager.update` is deferred to a later event-loop tick. If a remote Yjs transaction touches `blocks` before that deferred local update runs, the local update is based on stale top-level block order.

The fix stack currently has two incomplete behaviors:

- current trunk lets the stale local `blocks` update through and relies on `mergeCrdtBlocks` to reconcile it;
- PR `77924` filters same-key local updates during remote reconciliation, which is appropriate for scalar fields but too coarse for structured mergeable fields like `blocks`.

`blocks` needs an explicit merge/rebase contract. It should not be treated as one last-writer register.

The pass-178 probe narrows the block-level ordering failure further. Existing
stale snapshot reconciliation starts from the stale local order and then
splices remote-only insertions around whichever local/previous block IDs still
exist. In this seed shape, that lets `step2` anchor after `baseline` from the
stale local order even though the remote order is `heading, second, baseline,
step2`. Candidate fixes that try to preserve remote deletes but still use the
stale local order as the structural skeleton can therefore keep content while
corrupting order.

Pass 179 shows an additional trap: the fix must be wired into the explicit
`baseRecord.blocks` path as well as the implicit previous-local snapshot path.
The scheduled local edit from `editEntityRecord` carries `baseRecord`, so a
fix that only changes stale detection through the previous-block cache can
miss the product path this seed exercises.

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

The revised block ordering rule should use the current CRDT order as the
structural skeleton when the current state has moved previous block IDs, then
place local-only blocks by a deterministic anchor derived from the local base
record. Starting from the stale local order is not safe once the remote peer has
moved surviving previous blocks.

A complete fix still needs a no-wait natural Playwright stress repro before opening a user-facing PR.
