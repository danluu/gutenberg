# RTC list move can corrupt an adjacent group after stale collaboration sync

Bug signature: `836655577216`

Bug type: `rtc-block-tree-corruption-list-move-group-reparsed-as-list`

## Summary

The refreshed fuzz manifest reports a collaboration divergence where a stale peer moves a List while another peer deletes a Heading and inserts a Pullquote. One peer converges to the intended top-level block tree:

```text
List(3), Group(2), Quote(1), Pullquote(0)
```

The other peer can instead rewrite the Group slot as another List or otherwise lose the Group's children. I reconstructed the repro from the manifest because the original generated spec and result artifacts were absent.

This survives the current known-fixes base `f256024286dd80a4c0e2579f658c109256abf648` (`rtc-known-fixes-current-20260507`). A focused unit reducer against that base fails both same-document and two-client cases:

```text
same-doc: expected Group(2), received Heading(0)
two-client: expected Group(2), received List(3)
```

## Practical Impact

Real-user likelihood: `low`.

Natural workflow:

- Surface: post editor with experimental real-time collaboration enabled.
- Transport: HTTP polling sync; the same race is structurally possible for any transport that lets one peer edit from a stale block tree.
- Blocks: top-level Heading, List, Group, Quote, plus a concurrently inserted Pullquote.
- User actions: one user deletes the Heading and inserts a Pullquote after the Quote; another stale tab/user moves the List upward from the older tree.
- Timing: requires a delayed or stale collaborator between the remote structural edit and the move. The default HTTP polling transport polls every 1 second with collaborators and every 25 seconds in a background tab, so stale windows are plausible, but the harmful order is narrower than simple request blocking.
- Save/reload: not required to trigger the in-memory corruption. If saved or persisted into the CRDT document, the corrupted block tree can survive reload.

Common prerequisites: RTC enabled, a collaborator or second tab, normal structural block edits, a List near a Group. Rare prerequisites: the collaborator must issue the move while still stale, and the HTTP update/response order must let that stale move reconcile with the concurrent delete/insert before the peer has already adopted the remote tree. Artificial parts from fuzzing/repro: the exact block sequence, forced delay/offline timing, and reconstructed reducer schedule. The editor operations themselves are ordinary UI actions.

Blast radius:

- Content loss/corruption: high for the affected document fragment. The Group can be replaced by a List or emptied, losing nested paragraph structure.
- Duplicate content: possible duplicate List records with the same semantic children.
- UI-only inconsistency: no. The unit reducer shows durable CRDT state corruption.
- Persistence failure/save loop: not the primary failure mode.
- Performance/OOM: no evidence.
- Recovery: undo may help if noticed immediately. Otherwise the user needs revision history or manual repair.

Strongest evidence for `low` rather than `very-low`: the failure uses ordinary block operations; the reducer reproduces on the known-fixes base with valid Yjs documents and the same CRDT merge function used by the editor; HTTP polling naturally creates stale windows, especially for inactive/background collaborators.

Strongest evidence against `medium`: the original generated spec/result artifacts are missing, the manifest marks the source as `no-realistic-repro`, and a copied natural-action Playwright route plus title-edit and stale-reload variants passed on the unpatched known-fixes base. The remaining proof is strong at the CRDT algorithm level but not yet a current-base browser failure.

Shortest confidence-improving experiment: build an HTTP-provider scheduler repro that can separate upload from download for `/wp-sync/v1/updates`: let the stale collaborator upload the List move while withholding remote updates from that collaborator, then release both sides and assert both clients' `core/block-editor.getBlocks()` trees.

## Normal Editor Reachability

Pass 178 checked the production path from ordinary editor actions into the failing reducer shape. A user move from the block toolbar or List View dispatches the normal block-editor move actions, and `useBlockSync` observes the changed block array from the block-editor store. For the root post editor, `useBlockSync` passes that changed array to the `useEntityBlockEditor` `onChange`/`onInput` callback.

`useEntityBlockEditor` includes the changed `blocks` value in the entity edits through `updateFootnotesFromMeta( newBlocks, meta )`; this helper returns `{ blocks }` even when footnotes metadata is absent. `editEntityRecord` then calls `SyncManager.update` before dispatching the Redux edit, with `baseRecord` set to the current `getEditedEntityRecord` result. Finally, `SyncManager.updateCRDTDoc` forwards that `baseRecord` to `applyPostChangesToCRDTDoc`, which passes `baseRecord.blocks` into `mergeCrdtBlocks`.

That means the reconstructed reducer input is not an artificial direct-state mutation. It corresponds to a stale collaborator making an ordinary block move while its edited post record still reflects the older `Heading, List, Group, Quote` tree. The still-missing browser proof is narrower: it must show the HTTP provider can produce the harmful upload/download ordering on the known-fixes base, not merely that the editor can call `mergeCrdtBlocks` with an explicit stale base.

## Post CRDT Adapter Reproduction

Pass 179 added a second non-browser reduction against exact known-fixes SHA `f256024286dd80a4c0e2579f658c109256abf648` that drives the production post adapter, not just the lower-level block merge helper:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-836-knownfix-reduction
npm run test:unit -- packages/core-data/src/utils/test/crdt-836655577216-apply-post-reduction.ts --runTestsByPath
```

That test calls `applyPostChangesToCRDTDoc( doc, { blocks }, syncedProperties, { baseRecord } )` with valid post block arrays for the initial tree, the remote heading-delete/pullquote-insert, and the stale list move. It fails with the same states as the raw reducer: the same-document adapter path receives `core/heading:0:heading` where `core/group:2:group` is expected, and the two-client adapter path receives duplicate `core/list:3:list`.

This narrows the remaining browser gap. The failure is not limited to direct calls to `mergeCrdtBlocks`; it occurs through the post CRDT adapter that `SyncManager.updateCRDTDoc` invokes for normal entity edits. The unresolved part is still the HTTP/UI scheduler proof: simple natural Playwright delay variants on the unpatched known-fixes base did not recreate this adapter ordering.

## Root Cause

The original block CRDT merge logic came from `84019935998c16f877e976ad85e84748355d7282` (`Improve CRDT "merge logic" for post entities (#72262)`). It uses a generic left/right diff over the top-level `Y.Array` and updates the remaining middle segment by array index.

That index-based update is not safe when the incoming local snapshot is stale and the current Yjs array has a different set of block client IDs. In the reconstructed race:

1. Base tree is `Heading, List, Group, Quote`.
2. Peer A deletes `Heading` and inserts `Pullquote`, producing `List, Group, Quote, Pullquote`.
3. Peer B, still based on the old tree, moves `List` before `Heading`, producing a local snapshot `List, Heading, Group, Quote`.
4. The merge sees a middle segment and rewrites Yjs slots by index. Depending on ordering, it can rewrite a `Group` slot with `List` identity or resurrect the deleted `Heading`.

The known-fixes stack, especially PR `77924` (`1a46ebf1621`, `Fix RTC stale WebSocket and CRDT merge bugs`), added base-record plumbing, stale local snapshot reconciliation, and pure clientId move rebasing. That is necessary but not sufficient here: the pure-move fast path only works when the base and incoming client ID sets match, so the mixed delete/insert/move case still falls back to index rewriting.

The exact known-fixes commit `f256024286dd80a4c0e2579f658c109256abf648` makes this failure mechanical:

- `mergeCrdtBlocks` uses `localBlocksToSync` directly when `baseBlocks` is present, skipping stale-local reconciliation for explicit-base edits.
- The current Yjs IDs after peer A are `[ list, group, quote, pullquote ]`.
- The explicit base IDs are `[ heading, list, group, quote ]`.
- Peer B's stale moved snapshot IDs are `[ list, heading, group, quote ]`.
- `rebaseYBlocksByClientId` cannot run because the current/base ID sets differ.
- `reorderYBlocksByClientId` cannot run because the current/incoming ID sets differ.
- The residual left/right sweep matches only the leading `list`, then updates slot 1 by index. Slot 1 is the current `group`, but the incoming slot is stale `heading`, so the Group is rewritten as Heading in the same-document reducer. The two-client reducer reaches the related duplicate-List state through the same positional identity error after Yjs exchanges both updates.

## Fix Plan

Initial plan:

1. Keep the base-record plumbing from the known-fixes stack.
2. Reconcile stale local snapshots even when an explicit base is present.
3. Before the index-diff fallback, reconcile the Yjs top-level order by unique block `clientId`.
4. Only pass a previous/base block into a slot update when the current Y block and incoming block have the same `clientId`.

Audit:

- Kernel-maintainer robustness: avoid applying stale whole-struct snapshots to unrelated object identities. Guard the clientId path on unique, non-empty IDs and fall back for unknown/duplicate IDs.
- Jepsen-style correctness: the merge must preserve remote inserts/deletes while applying local intent. Moving an object should move that object, not rewrite another object at the destination index.
- Simplicity/performance skepticism: the repair is O(n^2) in the number of top-level blocks because it scans for target IDs while moving. That is acceptable for editor top-level block counts and far cheaper than corrupting content. A map-based implementation can replace it later if profiling shows pressure.

Revised plan:

- Use clientId reconciliation for mixed structural changes, deleting current blocks absent from the incoming target before insert/move handling.
- Preserve existing Y block contents when moving an existing clientId, so remote nested edits are not overwritten by the stale full snapshot.
- Align the previous/base snapshot by clientId before the residual index merge, preventing stale base entries from suppressing updates for a different block identity.

## Verification

Known-fixes base failure:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-836-knownfix-reduction
npm run test:unit -- packages/core-data/src/utils/test/crdt-836655577216-reduction.ts --runTestsByPath
```

Result: failed on `f256024286dd80a4c0e2579f658c109256abf648`; same-doc received `core/heading:0:heading` where `core/group:2:group` was expected, and two-client received `core/list:3:list` where `core/group:2:group` was expected.

Post CRDT adapter failure:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-836-knownfix-reduction
npm run test:unit -- packages/core-data/src/utils/test/crdt-836655577216-apply-post-reduction.ts --runTestsByPath
```

Result: failed on `f256024286dd80a4c0e2579f658c109256abf648`; same-doc received `core/heading:0:heading` where `core/group:2:group` was expected, and two-client received `core/list:3:list` where `core/group:2:group` was expected.

Fixed PR branch verification:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-836655577216
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-836655577216-list-move-group.test.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-836655577216-list-move-group.test.ts test/e2e/specs/editor/collaboration/triage-836655577216-list-move-group.spec.ts
WP_ENV_PORT=10163 WP_BASE_URL=http://localhost:10163 RTC_MANIFEST_WS_START_PORT=22504 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-836655577216-list-move-group.spec.ts
```

Results:

- Unit: 2 suites passed, 73 tests passed.
- Lint: passed.
- Playwright: 1 Chromium test passed.

Current caveat: the Playwright test is a natural-action regression check for the fixed branch, but it should not be cited as proof that the same simple request-delay route fails on the unpatched known-fixes base. A later unpatched known-fixes UI check copied this spec and additional title/stale-reload variants into a detached `f256024286dd80a4c0e2579f658c109256abf648` worktree; those variants passed. The focused reducer above remains the strongest current evidence that the underlying CRDT merge bug survives that base.

The wider `packages/core-data/src/utils/test/crdt.ts` suite was attempted but blocked by the linked checkout's incomplete dependency install (`framer-motion`, then `@emotion/css` missing), not by this patch.
