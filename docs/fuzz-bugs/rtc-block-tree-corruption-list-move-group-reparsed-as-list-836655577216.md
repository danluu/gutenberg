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

Real-user likelihood: `medium`.

Natural workflow:

- Surface: post editor with experimental real-time collaboration enabled.
- Transport: HTTP polling sync; the same race is structurally possible for any transport that lets one peer edit from a stale block tree.
- Blocks: top-level Heading, List, Group, Quote, plus a concurrently inserted Pullquote.
- User actions: one user deletes the Heading and inserts a Pullquote after the Quote; another stale tab/user moves the List upward from the older tree.
- Timing: requires a delayed or stale collaborator between the remote structural edit and the move. This can be a second browser tab, another user, or a short network delay.
- Save/reload: not required to trigger the in-memory corruption. If saved or persisted into the CRDT document, the corrupted block tree can survive reload.

Common prerequisites: RTC enabled, a collaborator or second tab, normal structural block edits, a List near a Group. Rare prerequisites: the collaborator must issue the move while still stale. Artificial parts from fuzzing/repro: the exact block sequence and forced delay/offline timing. The editor operations themselves are ordinary UI actions.

Blast radius:

- Content loss/corruption: high for the affected document fragment. The Group can be replaced by a List or emptied, losing nested paragraph structure.
- Duplicate content: possible duplicate List records with the same semantic children.
- UI-only inconsistency: no. The unit reducer shows durable CRDT state corruption.
- Persistence failure/save loop: not the primary failure mode.
- Performance/OOM: no evidence.
- Recovery: undo may help if noticed immediately. Otherwise the user needs revision history or manual repair.

Strongest evidence for `medium`: the failure uses ordinary block operations and a normal stale-collaboration timing window; the reducer reproduces on the known-fixes base with two Yjs clients; the Playwright repro passes only after the fix.

Strongest evidence against `high`: RTC is still an opt-in/experimental collaboration feature, and the race requires a stale peer to move the List in a specific interval.

Shortest confidence-improving experiment: run the Playwright repro on an unpatched known-fixes checkout with a deterministic offline collaborator window and assert the corrupted final tree through the editor store.

## Root Cause

The original block CRDT merge logic came from `84019935998c16f877e976ad85e84748355d7282` (`Improve CRDT "merge logic" for post entities (#72262)`). It uses a generic left/right diff over the top-level `Y.Array` and updates the remaining middle segment by array index.

That index-based update is not safe when the incoming local snapshot is stale and the current Yjs array has a different set of block client IDs. In the reconstructed race:

1. Base tree is `Heading, List, Group, Quote`.
2. Peer A deletes `Heading` and inserts `Pullquote`, producing `List, Group, Quote, Pullquote`.
3. Peer B, still based on the old tree, moves `List` before `Heading`, producing a local snapshot `List, Heading, Group, Quote`.
4. The merge sees a middle segment and rewrites Yjs slots by index. Depending on ordering, it can rewrite a `Group` slot with `List` identity or resurrect the deleted `Heading`.

The known-fixes stack, especially PR `77924` (`1a46ebf1621`, `Fix RTC stale WebSocket and CRDT merge bugs`), added base-record plumbing, stale local snapshot reconciliation, and pure clientId move rebasing. That is necessary but not sufficient here: the pure-move fast path only works when the base and incoming client ID sets match, so the mixed delete/insert/move case still falls back to index rewriting.

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

The wider `packages/core-data/src/utils/test/crdt.ts` suite was attempted but blocked by the linked checkout's incomplete dependency install (`framer-motion`, then `@emotion/css` missing), not by this patch.
