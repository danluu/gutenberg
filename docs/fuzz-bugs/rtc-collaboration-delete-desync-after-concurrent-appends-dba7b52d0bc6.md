# RTC delete desync after concurrent appends (`dba7b52d0bc6`)

## Summary

Fuzz seed `950398` reported a collaboration split after two users appended paragraph blocks and one user deleted the other user's recent paragraph. One peer kept the deleted paragraph until convergence timed out.

The original browser artifacts are no longer present in the handoff checkout, but the manifest row and analysis supplement agree on the symptom:

- signature: `dba7b52d0bc6`
- type: `rtc_collaboration_delete_desync_after_concurrent_appends`
- transport: HTTP polling
- source status: `no-realistic-repro`, confidence `medium`
- failing step: `step 3 delete-block user 1`

I reconstructed the lowest useful failure at the CRDT merge layer. The editor syncs full block snapshots into a Y.Array. If a peer receives a collaborator's delete, then later emits a stale local snapshot that still contains the deleted block, the positional merge treats that block as a local insertion and recreates it with the same `clientId`.

Pass 177 refreshed this against `origin/trunk` `bf2d0cc1f1e82d0db286f4aa9851f151e407b163` and the current known-fixes checkout head `c8af86c24a5c70784e4604b66b772a0511859a00`. The rebased test-only commit still fails on current trunk, and the rebased fix commit passes. The current known-fixes head still fails the no-base CRDT repro immediately after the delete sync, but a temporary base-backed variant passes, which suggests the latest base-record path handles this exact workflow while lower-level/no-base merge callers remain vulnerable.

## Practical Impact

Real-user likelihood: `low`.

Natural workflow:

- editor surface: post editor with real-time collaboration enabled
- transport: HTTP polling
- block types: ordinary top-level paragraph blocks
- timing: two users append nearby top-level paragraphs, one deletes the other user's recent paragraph, and the other editor emits a stale full-block snapshot after seeing the delete
- tabs/users: two browser sessions or users
- save/reload: not required for the low-level failure
- network delay: not strictly required, but the stale-snapshot ordering is timing-sensitive

Common prerequisites: two collaborators editing the same post and deleting a recent peer paragraph are ordinary. Rare prerequisites: the stale full-block snapshot must be emitted after the Y.Doc has already applied the collaborator delete. Artificial part: the deterministic repro directly calls `mergeCrdtBlocks()` to force that stale snapshot ordering; pass 171 added a closer `applyPostChangesToCRDTDoc()` probe with a stale `baseRecord`, which reproduced the resurrection on the known-fixes base. Natural Playwright coverage for the visible delete/edit workflow still passed on current trunk.

Blast radius if hit: pre-save UI/content divergence. The deleted paragraph can reappear for one collaborator and may later be saved, causing duplicate or resurrected content. This is not an OOM/performance bug or a save loop. Recovery is manual: the user can delete the resurrected paragraph again once the editors settle, but a save at the wrong time can persist the stale block.

Strongest evidence for real risk:

- The CRDT unit repro fails on `origin/trunk` before the fix.
- The current known-fixes synthetic base (`f256024286dd80a4c0e2579f658c109256abf648`) fails pass-171 and pass-172 post-adapter probes: after the delete converges, a stale editor snapshot with `baseRecord` readds `First user append`.
- Pass 173 reproduced the same stale-`baseBlocks` resurrection on the specific `pr/77924` head (`1a46ebf1621c866c12a95c12c2097bc4e50c3eb5`), not just on the synthetic known-fixes integration.
- Pass 174 independently reproduced the `f256024286dd80a4c0e2579f658c109256abf648` base-block failure directly through `mergeCrdtBlocks( ..., baseBlocks )`: after both Y.Docs had converged without `First user append`, a stale base-backed first-user snapshot restored it.
- The source manifest describes the same visible symptom after an ordinary delete action.

Strongest evidence against high likelihood:

- The original source browser artifacts and exact generated spec are missing.
- A natural Playwright flow using visible editor actions for the delete plus a concurrent edit converges on current trunk.
- Attempts to make exact natural concurrent appends with keyboard actions were dominated by separate editor behavior where simultaneous typing collapsed into one paragraph before the delete step.
- Pass 177 found that the current known-fixes head's base-backed path passes this append/delete/stale-snapshot sequence when the delete carries a pre-change block snapshot, which is closer to ordinary `editEntityRecord()` behavior in that stack than the no-base unit repro.

Shortest confidence-improving experiment: add a transport-level HTTP polling harness that can delay one peer's outgoing sync response by one cycle while using only editor UI actions, then run the exact concurrent-append/delete workflow 30 times and inspect whether a stale local snapshot is emitted after the delete.

## Root Cause

`mergeCrdtBlocks()` was introduced as a full-array merge for post entity blocks in `84019935998` (`Improve CRDT "merge logic" for post entities (#72262)`). The merge still uses a left/right positional diff for the top-level Y.Array. Blame shows that core array merge in `packages/core-data/src/utils/crdt-blocks.ts` still comes from that path, with later rich-text merge changes in `54af1ce4006`.

The array merge has no memory of the last local block snapshot. Therefore it cannot tell these two cases apart:

1. the local editor really inserted a block that is not currently in the Y.Array;
2. the local editor is sending a stale snapshot that still contains a block deleted remotely.

For case 2, recreating the missing block is wrong. Because block `clientId`s are stable editor identities, a block that was present in the last local snapshot but is absent from the current Y.Array has already been deleted by a remote update. A later stale snapshot should not restore it.

The known-fixes base contains broader stale-snapshot work. Pass 171 found an important edge in that stack: normal editor edits pass a `baseRecord` through `editEntityRecord()` and `SyncManager#update()`. A stale `baseRecord` that still contains the deleted concurrent append can therefore drive the same positional insertion and resurrect the block. Pass 173 confirmed that `pr/77924` itself has this same base-backed failure: a base-backed collaborator delete converges, then a later stale base snapshot reintroduces `First user append`. Pass 174 independently confirmed the failure on the synthetic `f256024286dd80a4c0e2579f658c109256abf648` base using the lower-level `mergeCrdtBlocks()` `baseBlocks` argument, avoiding post-adapter and `node_modules` dependency noise.

Pass 173 also found a separate no-base ambiguity in the synthetic known-fixes integration: if the deleting peer calls `mergeCrdtBlocks()` without `baseBlocks`, the integration preserves a remote-only appended block that is absent from the local snapshot, treating the omission as a stale snapshot rather than an intentional delete. That is less representative of the normal `editEntityRecord()` path after `baseRecord` plumbing, but it reinforces the core problem: full snapshots cannot distinguish stale omissions from intentional structural edits unless the merge has a trustworthy pre-change base.

This branch fixes the narrower trunk failure: do not resurrect blocks that were in the last local snapshot and were subsequently deleted from the current CRDT.

## Fix Plan

Initial plan: rewrite top-level block reconciliation around `clientId` identity and preserve all remote-only inserts/deletes.

Audit:

- Kernel-maintainer robustness: a broad merge rewrite is too risky for a subtle sync path. It could change ordering, duplicate-clientId handling, and nested block behavior at once.
- Jepsen-style correctness: remote deletes must be monotonic for a known block identity. Once a Y.Array delete removes a block that this peer previously knew, a stale local snapshot must not create a new block with the same identity.
- Simplicity/performance skepticism: a small WeakMap of previous local snapshots is O(number of blocks) per local merge and avoids extra serialization or network state. It fails open when blocks lack unique clientIds.

Revised plan implemented in the PR branch:

1. Add a `previousLocalBlocksCache` keyed by `YBlocks`.
2. Before the positional merge, compare `previousLocalBlocks`, current `yblocks.toJSON()`, and the incoming local snapshot by unique `clientId`.
3. Filter incoming blocks that were present in the previous local snapshot and current incoming snapshot, but are now absent from the current Y.Array.
4. Cache the original local snapshot after the merge so repeated stale snapshots keep being filtered.

This keeps the existing positional merge and duplicate-clientId cleanup intact.

## Verification

Pre-fix:

- `npm run test:unit packages/core-data/src/utils/test/crdt-concurrent-append-delete.test.ts -- --runInBand` failed on `origin/trunk` with `First user append` resurrected after a stale local snapshot.
- On the known-fixes base, pass-171 and pass-172 temporary `applyPostChangesToCRDTDoc()` probes with `baseRecord` failed: after both peers no longer contained `First user append`, applying a stale first-user snapshot reinserted that paragraph.
- Pass 173 temporary probes failed on both `pr/77924` and the known-fixes base with the same final state: expected `["Alpha edited after delete", "Beta", "Second user append"]`, received `["Alpha edited after delete", "Beta", "First user append", "Second user append"]`.
- Pass 174 reran a clean temporary probe on `f256024286dd80a4c0e2579f658c109256abf648` with `mergeCrdtBlocks()` and `baseBlocks`; it failed with the same received list plus `"First user append"`. An initial `applyPostChangesToCRDTDoc()` variant could not start because the available shared `node_modules` tree lacked `framer-motion`.
- Pass 175 independently verified the branch package again: the focused CRDT repro passed on the fixed PR branch, failed at the test-only pre-fix commit `4f7ca2ca2a8` with `"First user append"` resurrected, and failed when that test commit was cherry-picked onto known-fixes base `f256024286dd80a4c0e2579f658c109256abf648`. A fresh browser rerun was attempted, but local `wp-env start` for the PR worktree hung inside `docker compose` setup and was stopped; the pass-174 Chromium run remains the latest successful browser verification.
- Pass 176 rebased the branches onto `origin/trunk` `5fc7223e96b2751c57b6c4ae840bb9e838bee9f0`. The rebased test-only commit `67bf78fdde3` still failed before the fix with `"First user append"` resurrected at the final stale-snapshot assertion. Cherry-picking that same test onto known-fixes base `f256024286dd80a4c0e2579f658c109256abf648` failed earlier, immediately after delete sync, leaving `"First user append"` in the merged CRDT state.
- Pass 177 rebased the branches onto `origin/trunk` `bf2d0cc1f1e82d0db286f4aa9851f151e407b163`. The rebased test-only commit `f59a4cad00327fae786c3244b0c528ba3efe533d` failed before the fix with `"First user append"` resurrected at the final stale-snapshot assertion. The first attempt used the wrong shared `node_modules` tree and failed before running tests; rerunning with the known-good dependency tree produced the product failure.
- Pass 177 also cherry-picked the test-only repro onto the current known-fixes checkout head `c8af86c24a5c70784e4604b66b772a0511859a00`. The no-base repro failed immediately after delete sync, with `"First user append"` still present before the final stale-snapshot step. A temporary base-backed variant on the same known-fixes head passed, including the final stale-snapshot assertion.

Post-fix branch:

- `npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-concurrent-append-delete.test.ts -- --runInBand` passed: 72 tests.
- `npm run build` passed.
- `WP_ENV_PORT=10105 WP_BASE_URL=http://localhost:10105 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-concurrent-append-delete.spec.ts --project=chromium` passed.
- After rebasing onto `origin/trunk` `b38f9b4d86d0505199f5efd78c2adf213e428e78`, pass 174 reran the focused unit repro and the focused Chromium e2e; both passed.
- After rebasing onto `origin/trunk` `5fc7223e96b2751c57b6c4ae840bb9e838bee9f0`, pass 176 reran the focused unit repro and the focused Chromium e2e; both passed.
- After rebasing onto `origin/trunk` `bf2d0cc1f1e82d0db286f4aa9851f151e407b163`, pass 177 reran the focused unit repro and focused Chromium collaboration spec on fixed commit `b6ddf5baea13f6463d647c293f9fc837a7d49d76`; both passed.

Residual risk: this does not solve the broader "remote-only insert missing from stale local snapshot vs intentional remote-only delete" ambiguity without a true pre-change base snapshot. It prevents resurrecting blocks this peer had previously synced locally and later observed as deleted.
