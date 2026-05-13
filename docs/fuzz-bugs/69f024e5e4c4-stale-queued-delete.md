# RTC stale queued delete re-adds a remotely deleted paragraph

Bug signature: `69f024e5e4c4`

Bug type: `rtc_delete_of_remote_concurrent_insert_readded_by_stale_local_reconcile`

## Summary

When two collaborators have both inserted paragraphs near the same anchor, one collaborator can delete the other collaborator's inserted paragraph. If the other collaborator has a local edit queued from the pre-delete block snapshot, that stale full-block snapshot can re-add the deleted paragraph when its delayed CRDT update runs.

The top-level concrete race is:

1. Primary and collaborator both see `anchor`, `primary-insert`, `collaborator-insert`, `tail`.
2. Primary schedules a local edit to `anchor`; the scheduled block snapshot still contains `primary-insert`.
3. Collaborator deletes `primary-insert` and the delete reaches primary first.
4. Primary's scheduled stale edit is applied.
5. The old merge path treats `primary-insert` as a local insertion and re-adds it.

Pass 180 also found the same bug class inside nested block arrays. A paragraph deleted from inside a container block can survive the collaborator's delete, or be re-added by a stale base-record edit, because the original fix only reconciled the outer block array and recursive `innerBlocks` merges still used the old positional diff without the matching base snapshot.

## Root Cause

Gutenberg syncs block edits as full block arrays. `editEntityRecord()` schedules CRDT updates with `setTimeout( 0 )`, so a remote CRDT update can land before a previously scheduled local update is applied.

Before the fix, `mergeCrdtBlocks()` diffed the stale incoming full block array directly against the current Y.Array. If the incoming array still contained a block clientId that had been deleted remotely, the length-based left/right diff inserted that block again. The same problem exists for explicit `baseRecord` snapshots: a base can prove that an incoming block existed before the remote delete, but the merge path was not using that information to filter stale structural edits.

The recursive case has an extra failure mode. Even when the top-level group block is updated correctly, the old recursive `innerBlocks` call did not pass the group's base `innerBlocks`, so a nested delete was interpreted only through the positional array diff. That is not robust when both users have inserted different nested paragraphs around the same anchor.

## Fix

The fix reconciles a local full-block snapshot against a known base before running the existing array diff:

- use the explicit `baseRecord.blocks` when available;
- otherwise use the last local block snapshot for the Y.Array;
- preserve remote block value changes for blocks the local snapshot did not change;
- filter block clientIds that existed in the base and local snapshot but no longer exist in the current CRDT document;
- reinsert current remote-only blocks that were absent from both the local snapshot and the base.
- pass matching base `innerBlocks` into recursive `mergeCrdtBlocks()` calls so the same stale-delete rules apply inside containers.

`SyncManager` now forwards `baseRecord` into the post CRDT adapter, and `applyPostChangesToCRDTDoc()` passes the base block snapshot into `mergeCrdtBlocks()`.

## Reproduction

The deterministic repro is:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-69f024e5e4c4-queued-delete.test.ts -- --runInBand
```

Before the fix, both top-level unit cases failed because `Primary paragraph deleted by collaborator` reappeared. Pass 180 added a nested-container case that failed before the recursive fix because `Primary nested paragraph deleted by collaborator` survived inside the group. After the fix, all three cases pass.

The WebSocket Playwright repro added in `test/e2e/specs/editor/collaboration/websocket/collaboration-69f024e5e4c4-queued-delete.spec.ts` uses normal editor actions: concurrent add-after paragraph insertion, collaborator deletion through block UI, and primary typing in the anchor paragraph while the delete is racing. In this pass, the local WebSocket e2e harness did not reach awareness convergence in the branch worktree, so the deterministic CRDT repro is the primary proof.

Pass 180 rebuilt the repro/fix branch on current `origin/trunk` (`5afea61149597cf4d7113517f343c004d24e0d7a`). A fixed-branch WebSocket attempt started the test sync server but timed out waiting for `_wpCollaborationEnabled`, before any editor actions ran. That is a harness readiness failure, not product evidence that disproves the CRDT bug.

## Practical Impact

Likelihood: `low`.

The workflow needs two collaborators in the post editor, RTC sync, ordinary paragraph blocks, close timing between a collaborator delete and another user's queued local edit, and a stale full-block snapshot from before the delete. No save or reload is required for the in-memory corruption, but the re-added paragraph can be persisted if a user saves after the bad merge.

Blast radius is content corruption rather than UI-only inconsistency: a collaborator's explicit delete can be undone. Recovery is manual deletion, undo if noticed immediately, or post revisions after save.
