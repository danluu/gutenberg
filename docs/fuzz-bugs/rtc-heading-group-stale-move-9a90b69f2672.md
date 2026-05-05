# RTC heading/group tree corruption after stale top-level move

Bug signature: `9a90b69f2672`

Bug type: `rtc_collab_heading_group_tree_corruption_after_move_into_group_then_top_level_move`

Transport in source run: `websocket`

## Pass 37 classification

The refreshed generated Playwright spec is not a valid product repro. The source refresh failed because every generated scenario produced zero snapshots:

```bash
rg -n '9a90b69f2672|snapshots\.length|Expected.*0' \
  /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-ws-0/fuzz-handoff/distinct-manifest-20260505/results-refresh-websocket-shard-0/logs/0008-9a90b69f2672-rtc-collab-heading-group-tree-corruption-after-move-into-group-then-top-level-move.log
```

The failing assertion was `expect( result.snapshots.length ).toBeGreaterThan( 0 )`. Re-reading the trace in pass 37 narrowed the immediate failure: `waitForMutualDiscovery()` timed out in `waitForAwarenessPeerCount()` while waiting for a matching `wp-sync` response before the first snapshot was captured. The screenshots show the editor had loaded valid content, but the generated spec swallowed the readiness error and converted it into a zero-snapshot assertion. That makes the refreshed failure a harness readiness failure, not direct product evidence.

The archived bug is still a real RTC bug family. A lower-level two-document repro shows the underlying product issue without Playwright: after a peer receives a remote top-level move, the editor can still emit its previous full block snapshot. The old merge logic treats that stale snapshot as an authoritative local reorder and overwrites the remote order.

## Reproduction

PR branch:

`try/rtc-collab-heading-group-tree-corruption-after-move-into-g-9a90b69f2672-pr`

Commit 1 adds the non-Playwright repro:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not graft group children"
```

Result before the fix:

```text
FAIL packages/core-data/src/utils/test/crdt-blocks.ts
Expected: [ "core/quote", "core/group", "core/list", "core/heading" ]
Received: [ "core/quote", "core/heading", "core/group", "core/list" ]
```

Commit 2 adds a natural-user-action Playwright repro at:

```text
test/e2e/specs/editor/collaboration/triage-9a90b69f2672-realistic.spec.ts
```

The Playwright repro creates a valid post containing the archived pre-move block tree, opens two editors, moves the structured heading down twice through the block toolbar, and asserts both editors keep:

```text
core/quote -> core/group -> core/list -> core/heading
```

It does not inject malformed blocks or mutate the block editor store directly.

Final verification command used in pass 36:

```bash
WP_BASE_URL=http://localhost:9937 WP_ENV_PORT=9937 \
RTC_9A90_OUTPUT_DIR=/tmp/rtc-9a90-output-final \
RTC_9A90_VIDEO_FRAMES_DIR=/tmp/rtc-9a90-frames-final \
npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-9a90b69f2672-realistic.spec.ts --workers=1
```

Result:

```text
1 passed
```

Note: this worktree's own `wp-env start` on `WP_ENV_PORT=9945` failed because Docker had exhausted its predefined address pools. I used an already-running WordPress test environment on `http://localhost:9937` for the browser verification and video frames.

## Known-fixes base

The known-fixes refresh still reports this signature as failed in:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-ws-0/fuzz-handoff/distinct-manifest-20260505/results-refresh-websocket-shard-0/results.jsonl
```

The exact source line is:

```json
{"key":"rtc_collab_heading_group_tree_corruption_after_move_into_group_then_top_level_move::9a90b69f2672::test/e2e/specs/editor/collaboration/triage-5d01e9eb73c9-realistic.spec.ts","result":"failed","exitCode":1,"timedOut":false}
```

That refresh failure is the no-data generated-spec failure described above, but pass 37 found that the known-fixes base does not fully fix the lower-level heading/group corruption. The base contains stale-snapshot reconciliation in `packages/core-data/src/utils/crdt-blocks.ts` (`previousBlocksByYArray` and `reconcileStaleLocalBlocks`, commit `a26c89f7285 Integrate RTC fuzz base fixes` over `a2c6ea3b19a Preserve remote CRDT edits from stale local snapshots`), but cherry-picking the exact heading/group unit repro onto that base still fails:

```bash
git worktree add --detach /private/tmp/gutenberg-9a90-knownfix-pass37.2Vcz1G 3cba2b1e56a98787de08dc6c7df2434759e8f908
git -C /private/tmp/gutenberg-9a90-knownfix-pass37.2Vcz1G cherry-pick --no-commit 1851183afb8
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not graft group children"
```

Result:

```text
FAIL packages/core-data/src/utils/test/crdt-blocks.ts
Expected heading innerBlocks: []
Received heading innerBlocks: [ "core/paragraph", "core/paragraph" ]
```

So the source refresh result is still a harness failure, but the root product bug is not fully fixed by the known-fixes base.

## Root cause

The relevant code path was introduced by:

```bash
git show -s --format='%H%n%s%n%b' 84019935998c
```

Commit:

```text
84019935998c16f877e976ad85e84748355d7282
Improve CRDT "merge logic" for post entities (#72262)
```

That commit added `packages/core-data/src/utils/crdt-blocks.ts` with an index-based left/right sweep in `mergeCrdtBlocks()`. `areBlocksEqual()` deliberately ignores `clientId`, which is correct for avoiding client ID conflicts, but the merge then updates the Y.Map at a position instead of identifying the logical block being updated.

That is tolerable for a single fresh local snapshot. It is not safe when a collaborator receives a remote Yjs update and the local editor later emits a full block snapshot based on its older store state. In that case the input is a stale read, not a new user edit. Because the old merge has no remembered base snapshot, it cannot distinguish:

- user intentionally moved `heading` back above `group`; from
- receiving editor re-emitted its old `quote -> heading -> group -> list` snapshot after already receiving `quote -> group -> list -> heading`.

The old merge accepts the stale order and overwrites the remote move. The archived browser failure is a more severe member of this family, where nested group contents can be associated with the wrong top-level block after these full-snapshot updates.

Later related work such as `128a3c29b7f1 Real-time collaboration: Expand mergeCrdtBlocks() automated testing (#75923)` added edge coverage but did not model stale full-block snapshots after remote delivery.

## Fix plan

Initial plan:

1. Track the previous local block snapshot per `Y.Array`.
2. On each new full snapshot, compare local snapshot, previous local snapshot, and current CRDT state by unique block `clientId`.
3. Preserve remote-only changes when the incoming snapshot did not change those blocks relative to the previous local base.
4. Fall back to the existing merge behavior when IDs are missing or duplicated.

Kernel-maintainer robustness audit:

The fix must not depend on perfect inputs. It should gate reconciliation on unique client IDs and leave the old merge path intact for ambiguous arrays. It must avoid mutating caller-owned block arrays and must recurse into inner blocks without assuming every block type has the same structure.

Jepsen-style correctness audit:

The failing input is a stale read/write cycle. Correctness depends on comparing the stale write against its causal base, not just against current state. A stale unchanged field or unchanged block order must not clobber concurrent remote changes; a genuine local move still has to be applied.

Simplicity/performance/failure-mode audit:

The reconciliation logic is more complex than the original index sweep. The complexity is justified only if it remains scoped to full-snapshot reconciliation, uses linear maps/sets where possible, and falls back for ambiguous IDs. The main residual risks are arrays without stable unique client IDs and peers that never had a local baseline before emitting a stale snapshot.

Revised plan:

Use a `WeakMap<YBlocks, Block[]>` to remember each array's last local snapshot. Reconcile incoming snapshots by `clientId` before the existing merge:

- If local order did not change relative to the previous snapshot, keep the current CRDT order and only apply local block content where the block still exists.
- If local order did change, remove blocks that were remotely deleted and splice remote-only blocks back near their current neighbors.
- Reconcile unchanged attributes and inner blocks from current CRDT state so stale local snapshots do not erase remote content.
- Retain the existing merge and duplicate-client-id repair for ambiguous cases.

## Verification

Commands run in pass 37:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not graft group children"
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts
WP_BASE_URL=http://localhost:9937 WP_ENV_PORT=9937 RTC_9A90_OUTPUT_DIR=/tmp/rtc-9a90-pass37-output RTC_9A90_VIDEO_FRAMES_DIR=/tmp/rtc-9a90-pass37-frames npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-9a90b69f2672-realistic.spec.ts --workers=1
```

Results:

```text
targeted unit before fix: failed with stale order quote -> heading -> group -> list
targeted unit after fix: passed
full crdt-blocks unit file after fix: 72 passed
Playwright natural-user repro after fix: 1 passed
```

Annotated video:

```text
/Users/danluu/dev/fuzz/gutenberg-bug-9a90b69f2672/artifacts/fuzz-bug-videos/9a90b69f2672-pass37.mp4
```

The suggested `WP_ENV_PORT=9911` environment was uninitialized and `wp-env start` failed with Docker's `all predefined address pools have been fully subnetted` error. Browser verification reused an already-running local environment at `http://localhost:9937`, which serves the related `gutenberg-bug-82c5ac8c27b9` stale-move fix branch. The unit repro and fix verification above ran directly in this rebased branch.

Residual risk:

The fix is strongest when block arrays have unique stable client IDs and a previous local baseline. Ambiguous arrays fall back to the old merge behavior. The Playwright repro is a natural final-move browser check on a valid preseeded state; the lowest-level unit test is the canonical stale-snapshot regression.
