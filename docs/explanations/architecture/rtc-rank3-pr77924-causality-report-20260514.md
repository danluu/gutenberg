# RTC rank-3 PR 77924 causality report, 2026-05-14

This report covers rank 3 from
`rtc-score4-likelihood-ranking-20260514.md`:
`86a2aac99e27`, the WebSocket RTC top-level paragraph insert order split.

## Conclusion

The best supported introducer for this bug in the known-fixes integration branch
is WordPress/gutenberg PR `#77924`, merged into
`try/rtc-77716-fixes-20260513` as:

```text
f2d4c8168fac01db97794df4ec9c9e7bc2ecf7a3
Merge remote-tracking branch 'origin/pr/77924' into try/rtc-77716-fixes-20260513
parents:
  8c3581c285ef4bd5ac897ab5ce67e2313c6f90f3
  1bda16e1a1921c35d84bfb11cfac025400ee15ae
```

The exact original fuzz failure was produced on a pre-migration RTC fuzz branch,
not on the later `try/rtc-77716-fixes-20260513` integration branch:

```text
branch: codex/rtc-websocket-e2e-local-20260502
commit: 2f59cd94b1ba41b004f4707ff25674506c81d796
run: artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-20-20260505T065700Z
```

So the precise statement is: the faulty RTC reconciliation design first appeared
in the fuzz branch before `#77924`, and `#77924` is the PR that imported that
faulty design into the known-fixes integration branch. The proof is therefore a
first-parent integration proof, not a literal ancestry proof that the original
`2f59cd94` fuzz commit is inside `#77924`.

## Failure evidence

The original seed was `958019`. It failed after only two user actions:

```text
0. delete-block by user 0
1. edit-formatted-paragraph-at-cursor by user 0
```

The behavioral coverage artifact records:

```text
transport: ws
initialContentProfile: base-3
faults: []
reloads: []
saveCheckpointSteps: []
```

The final editor-store states diverged for the full `15000ms` convergence
window:

```text
acting peer:
  heading("Follow-up heading")
  paragraph("Tail paragraph kept for save and reload stability checks.")
  paragraph("<em>italic</em><strong>beta</strong>")

passive peer:
  paragraph("<em>italic</em><strong>beta</strong>")
  heading("Follow-up heading")
  paragraph("Tail paragraph kept for save and reload stability checks.")
```

The exact store-level replay reproduced the same split:

```text
artifacts/.../signatures/86a2aac99e27/repros/store-output/store-repro-result.json
reproduced: true
```

The keyboard browser replay also reproduced the user-visible shape:

```text
artifacts/.../signatures/86a2aac99e27/repros/realistic-output-keyboard/realistic-repro-result.json
scenario: base3-delete-then-enter-after-tail
reproduced: true
primaryOrder:
  core/heading:Follow-up heading
  core/paragraph:Tail paragraph kept for save and rel
  core/paragraph:Keyboard-enter paragraph created by ...
secondaryOrder:
  core/paragraph:Keyboard-enter paragraph created by ...
  core/heading:Follow-up heading
  core/paragraph:Tail paragraph kept for save and rel...
```

The menu-driven `Add after` route converged. That matters: the bug is sensitive
to the keyboard/edit scheduling path, not just to the final block tree shape.

## Why PR 77924 is the introducer in the integration branch

The parent of the `#77924` merge, `8c3581c285e`, does not contain the machinery
needed for this bug:

- no `baseRecord` passed from `editEntityRecord()` into `SyncManager.update()`;
- no `remoteKeyVersions` / `reconcilingRemoteKeys` stale-key filter in
  `packages/sync/src/manager.ts`;
- no base-aware top-level block rebase/reorder logic in
  `packages/core-data/src/utils/crdt-blocks.ts`;
- no WebSocket provider migration that exercises this path in the same way.

The `#77924` merge adds all of that surface in one first-parent step:

```text
git diff --name-only 8c3581c285e f2d4c8168fa

packages/core-data/src/actions.js
packages/core-data/src/entities.js
packages/core-data/src/resolvers.js
packages/core-data/src/test/actions.js
packages/core-data/src/test/resolvers.js
packages/core-data/src/utils/crdt-blocks.ts
packages/core-data/src/utils/crdt.ts
packages/core-data/src/utils/test/crdt-blocks.ts
packages/e2e-tests/plugins/rtc-websocket-provider/src/index.js
packages/sync/src/manager.ts
packages/sync/src/test/manager.ts
packages/sync/src/types.ts
test/e2e/playwright.rtc-websocket.config.ts
test/e2e/specs/editor/collaboration/collaboration-stress.spec.ts
test/e2e/specs/editor/collaboration/websocket-only/collaboration-same-user-title-reload-loss.spec.ts
test/e2e/specs/editor/collaboration/websocket-only/collaboration-table-followups.spec.ts
```

The relevant `#77924` code changes are:

1. `packages/core-data/src/actions.js`

   `editEntityRecord()` captures the pre-edit `editedRecord` and passes it to
   the sync manager:

   ```js
   getSyncManager()?.update(
     objectType,
     objectId,
     editsWithMerges,
     origin,
     { baseRecord: editedRecord, isNewUndoLevel }
   );
   ```

2. `packages/sync/src/manager.ts`

   The public update path is changed from a generic `yieldToEventLoop()` wrapper
   to an explicit zero-delay scheduler:

   ```ts
   function scheduleUpdateCRDTDoc(...) {
     const scheduledRemoteKeyVersions = getScheduledRemoteKeyVersions(...);
     setTimeout(() => {
       updateCRDTDoc(..., scheduledRemoteKeyVersions);
     }, 0);
   }
   ```

   The same PR also adds `remoteKeyVersions` and `reconcilingRemoteKeys`.
   Remote Yjs transactions mark top-level keys as reconciling and immediately
   schedule `internal.updateEntityRecord(...)` to write the remote CRDT
   projection into the local edited record.

3. `packages/core-data/src/utils/crdt-blocks.ts`

   `mergeCrdtBlocks()` gains `baseBlocks` and tries to rebase/reorder top-level
   block arrays by identity before falling back to the old positional diff:

   ```ts
   if ( rebaseYBlocksByClientId( yblocks, baseBlocksToSync, blocksToSync ) ) {
     mergeYBlocksByClientId(...);
     return;
   }

   if ( ! baseBlocksToSync ) {
     reorderYBlocksByClientId( yblocks, blocksToSync );
   }

   // positional left/right sweep follows
   ```

No later PR in the ranked integration list is a better introducer. The later
PRs are narrower: HTTP body size, HTTP polling/bootstrap, awareness/cursor,
table/query-array identity, stale table snapshots, persisted CRDT rejection, or
post-merge local reconciliation adjustments. They can affect related failures,
but they do not first introduce the combination of queued local RTC writes,
remote-key reconciliation, and base-aware top-level block merging.

## Exact cause

The bug is a race between queued local block writes and remote block
reconciliation, followed by an under-specified top-level block insertion merge.

The important sequence is:

1. Both peers start from the base-3 content:

   ```text
   A = Long shared paragraph
   B = Follow-up heading
   C = Tail paragraph
   ```

2. User 0 deletes `A`. That remote `blocks` update reaches the other peer and
   causes the sync manager to mark `blocks` as a reconciling remote key.

3. Before the queued local CRDT/store work fully drains, user 0 follows the
   keyboard path that creates or edits a paragraph after the remaining tail
   paragraph. The intended actor order is:

   ```text
   B, C, D
   ```

   where `D` is the new formatted/keyboard-created paragraph.

4. Because `#77924` defers local CRDT writes through `setTimeout( ..., 0 )` and
   also lets remote CRDT reconciliation write into the edited record while those
   local writes are pending, a remote `blocks` reconciliation can run before the
   local `blocks` write has been safely projected into the shared Yjs document.

5. The stale-key filter is meant to avoid replaying old local fields over remote
   fields. For `blocks`, however, `#77924` deliberately allows the update through
   when a `baseRecord.blocks` snapshot is present, because the block merger is
   supposed to do the three-way reconciliation.

6. The block merger only has a reliable identity rebase when the current,
   incoming, and base top-level arrays have the same length and stable unique
   identities. The rank-3 workflow is a delete plus an insert/split, so the array
   lengths and identities do not line up. The merge falls back to positional
   snapshot diffing without a durable insertion anchor for `D`.

7. The actor's local editor store keeps the user-intended order, but the remote
   Yjs projection materializes the newly inserted paragraph before the known
   siblings on the passive peer:

   ```text
   D, B, C
   ```

8. Nothing later repairs it. Both peers have stable, valid block trees with the
   same title and the same block content, but different top-level order. That is
   why waiting for convergence does not heal the failure.

The older fuzz-branch implementation expresses the same design flaw through
different helper names. At `2f59cd94`, `crdt-blocks.ts` contains
`previousLocalBlocksCache`, `reconcileStaleLocalBlocks()`, and
`getRemoteBlockInsertIndex()`. That implementation also tries to reconstruct
remote top-level inserts from stale full-block snapshots using nearby known
client IDs rather than a causal insertion anchor. In the rank-3 shape, the new
paragraph is absent from the stale base and can be preserved at the front once a
remote projection has put it there.

So the common cause across the original fuzz branch and the `#77924` migration
is not one exact helper name. It is the same design error: length-changing
top-level block edits are reconciled from full snapshots after asynchronous
local/remote scheduling, but the merge code does not carry a precise insertion
anchor or operation identity for the new block.

## Why current trunk may not reproduce

Current trunk and the current known-fixes checkout did not reproduce the exact
`86a2aac99e27` replay in my later checks. That does not disprove `#77924` as the
integration introducer:

- the original artifact was from `2f59cd94`, not current trunk;
- current trunk has drifted substantially since the May 2026 RTC fuzz branch;
- later local commits such as `dc48170db8e` and `2f0367297ef` changed stale
  block reconciliation behavior;
- the exact failure is sensitive to whether the paragraph is created through the
  keyboard path or through the block-options `Add after` route.

The live browser evidence therefore proves the original bug and the route shape.
The PR attribution is proven by first-parent integration history and by the
specific code surface imported by `#77924`.

## Commands used for attribution

```sh
git show --no-patch --format='%H%n%P%n%s' f2d4c8168fa

git diff --name-only 8c3581c285e f2d4c8168fa

git show f2d4c8168fa^1:packages/sync/src/manager.ts |
  rg 'remoteKeyVersions|reconcilingRemoteKeys|scheduleUpdateCRDTDoc|baseRecord'

git show f2d4c8168fa:packages/sync/src/manager.ts |
  rg 'remoteKeyVersions|reconcilingRemoteKeys|scheduleUpdateCRDTDoc|baseRecord'

git show f2d4c8168fa^1:packages/core-data/src/utils/crdt-blocks.ts |
  rg 'rebaseYBlocksByClientId|reorderYBlocksByClientId|baseBlocks'

git show f2d4c8168fa:packages/core-data/src/utils/crdt-blocks.ts |
  rg 'rebaseYBlocksByClientId|reorderYBlocksByClientId|baseBlocks'

jq . artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-20-20260505T065700Z/lanes.json

jq . artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-20-20260505T065700Z/.triage-watcher/signatures/86a2aac99e27/repros/store-output/store-repro-result.json

jq . artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-20-20260505T065700Z/.triage-watcher/signatures/86a2aac99e27/repros/realistic-output-keyboard/realistic-repro-result.json
```
