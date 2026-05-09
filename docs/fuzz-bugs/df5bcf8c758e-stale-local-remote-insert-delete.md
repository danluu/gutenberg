# df5bcf8c758e: Stale Local Post-Delete Base Resurrects a Remote-Deleted Block

Bug signature: `df5bcf8c758e`

Source classification: likely real RTC bug, HTTP transport, non-runnable source row.

## Summary

The source row describes two collaborators inserting top-level Paragraph blocks, then one collaborator deleting the paragraph inserted by the other. One peer applies the delete while another peer preserves the deleted paragraph.

The exact archived source spec was not recovered, but a focused CRDT/post-adapter regression reproduces the same invariant failure on the required known-fixes base `f256024286dd80a4c0e2579f658c109256abf648`.

The failing sequence is:

1. Two post CRDT docs start with one Paragraph block.
2. Peer A and peer B concurrently insert ordinary top-level Paragraph blocks with the same pre-insert base.
3. The docs sync until both inserts are visible.
4. Peer B deletes Peer A's inserted paragraph.
5. Peer A receives that delete and its local CRDT no longer contains Peer A's paragraph.
6. Peer A then flushes an older full block snapshot that still includes the deleted paragraph while its `baseRecord.blocks` snapshot is already post-delete.

Expected result: after a remote delete has been observed by a peer's local CRDT, a later stale full snapshot from that peer must not resurrect the same block clientId.

Actual result on `f2560242`: the stale snapshot reintroduces `peer-a-insert`.

Pass 177 also checked the normal application route for that ordering. `editEntityRecord()` captures the current edited entity as `baseRecord`, then calls `SyncManager.update()`. The sync manager's public `update` method is `scheduleUpdateCRDTDoc()`, which defers the actual CRDT write with `setTimeout( ..., 0 )` while recording remote-key versions at schedule time. Remote Yjs updates independently call `updateEntityRecord()`, which dispatches `handlers.editRecord( changes )` and clears reconciliation state on later ticks. That means a pending local full-block update can run after a remote delete has already reconciled the edited record, producing a stale `changes.blocks` array with a post-delete `baseRecord.blocks` snapshot through ordinary event-loop scheduling.

## Root Cause

The known-fixes base uses `baseRecord.blocks` as the explicit pre-change base for post updates. That is right for value rebasing, but it is not always the right delete reference for stale full block snapshots.

In the broken path, `mergeCrdtBlocks()` uses `baseBlocksToSync` as `previousBlocks` and skips stale-local reconciliation when a base record exists. A nearby partial fix runs reconciliation with `baseBlocks`, but still computes remotely deleted client IDs from that base. If the base record is already post-delete, the deleted clientId is absent from both the base and the current CRDT. The stale full snapshot can then look like a fresh local insert.

The important distinction is:

- `baseRecord.blocks` should remain the value/rebase base.
- `previousLocalBlocksCache.get( yblocks )`, when present, should be the delete-reference snapshot, because it records which clientIds this editor previously knew before the remote delete was observed.

## Practical Impact

Real-user likelihood: `low` for normal Gutenberg use. Conditional likelihood is higher inside affected RTC collaboration sessions, but pass 178 could not make the ordinary browser UI hit the stale/post-delete ordering without synthetic state setup.

Natural workflow: two collaborators or two tabs edit the same post in the post editor with RTC enabled over HTTP. Both insert top-level Paragraph blocks close together. After both inserts are visible, one collaborator deletes the other collaborator's paragraph. The other peer continues editing or otherwise flushes a stale full block snapshot after receiving the delete.

Common prerequisites: ordinary top-level paragraph insertion, block deletion, multiple collaborators/tabs, and normal RTC sync.

Rare or timing-sensitive prerequisites: the stale full snapshot must be ordered after the remote delete is observed, and its `baseRecord.blocks` must already be post-delete. The exact source seed was non-runnable and prior browser replay was flaky. A pass-178 natural browser probe using two editor sessions, normal insert-after-selected-block keyboard actions, toolbar deletion, and immediate follow-up typing did not reproduce deleted-block resurrection in three timing variants on the unfixed known-fixes base.

Blast radius: visible cross-peer divergence and deleted-content resurrection. If the preserving peer saves, the deleted paragraph can be persisted. No evidence was found for OOM, save loop, or unrecoverable state. Recovery is manual deletion or revision restore if stale content is saved.

## Fix Plan

1. Add a post-adapter regression for the post-delete-base sequence.
2. Always run stale-local block reconciliation before the full-array merge, including base-record updates.
3. Keep `baseRecord.blocks` as the normal previous block list for value comparison and rebase decisions.
4. Compute remotely deleted clientIds from the cached previous local snapshot when available, falling back to the normal previous block list only when no cache exists.
5. Run the focused stale top-level block suite and then broader CRDT tests in a clean dependency checkout.

## Verification

Focused regression on `f2560242` before the fix:

```text
FAIL packages/core-data/src/utils/test/crdt-stale-top-level-blocks.test.ts
Expected value: not "peer-a-insert"
Received array: ["baseline", "peer-a-insert", "peer-b-insert"]
Tests: 1 failed, 5 passed, 6 total
```

After the fix:

```text
PASS packages/core-data/src/utils/test/crdt-stale-top-level-blocks.test.ts
Tests: 6 passed, 6 total
```

Pass 176 also checked the nearby partial base-record fix
`c8af86c24a5` (`Preserve remote top-level blocks for base-record edits`).
That branch still fails the same post-delete-base regression:

```text
FAIL packages/core-data/src/utils/test/crdt-stale-top-level-blocks.test.ts
Expected value: not "peer-a-insert"
Received array: ["baseline", "peer-a-insert", "peer-b-insert"]
```

The candidate fix passes the focused stale top-level suite and the existing
`crdt-blocks.ts` suite:

```text
PASS packages/core-data/src/utils/test/crdt-blocks.ts
PASS packages/core-data/src/utils/test/crdt-stale-top-level-blocks.test.ts
Tests: 82 passed, 82 total
```

The test run used a symlinked `node_modules` checkout and emitted the known duplicate-Yjs-import warning. The warning did not prevent the focused suite from running.

Pass 177 rebased this explanation branch onto `origin/trunk` `558db762277` and reran the focused failure/pass checks in fresh detached worktrees. Current upstream trunk still does not contain the synthetic known-fixes stack or this candidate fix, so survival/fix claims here are scoped to the required `rtc-known-fixes-current-20260507` base and the PR branch derived from it.

Pass 178 rebased this explanation branch onto current `origin/trunk`
`d52e35a291c1` and reran the focused failure/pass checks. It also ran a
browser-level natural-action probe on the unfixed known-fixes base after fixing
the local wp-env setup to copy `build/` into the Docker-visible worktree. The
standard collaboration smoke test passed, and the temporary
`df5bcf8c758e-pass178-natural.spec.ts` probe passed these variants:

```text
delete-only:
  User A: ["DF5 base delete-only", "DF5 user B delete-only"]
  User B: ["DF5 base delete-only", "DF5 user B delete-only"]

delete-and-touch-same-tick:
  User A/User B: ["DF5 base delete-and-touch-same-tick",
                  "DF5 user A followup delete-and-touch-same-tick",
                  "DF5 user B delete-and-touch-same-tick"]

delete-then-touch-50ms:
  User A/User B: ["DF5 base delete-then-touch-50ms",
                  "DF5 user A followup delete-then-touch-50ms",
                  "DF5 user B delete-then-touch-50ms"]
```

This browser probe is negative evidence for frequent real-user exposure, not a
proof that the lower-level bug is unreachable. The unit-level failing schedule
still uses ordinary post blocks and the normal post CRDT adapter, and the
application route through `editEntityRecord()` and `SyncManager.update()` still
allows a deferred full-block update to run after remote delete reconciliation.
