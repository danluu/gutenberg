# RTC stale-delete propagation, 2026-05-14

This note covers the rank-1 score-4 RTC issue from
[`rtc-score4-likelihood-ranking-20260514.md`](https://github.com/danluu/gutenberg/blob/explain/rtc-score4-likelihood-ranking-20260514/docs/explanations/architecture/rtc-score4-likelihood-ranking-20260514.md).

The headline representative is `890d98d04cda`. The cleanest reduction for the same user-facing family is `3ac375556552`: one collaborator appends a normal top-level paragraph, both editors converge, and another collaborator deletes that visible paragraph through the normal block UI. The deleting peer removes it, but the other peer retains it, or the lower-level Yjs repro reintroduces it on both peers.

Identifier note: short hexadecimal strings such as `890d98d04cda`,
`3ac375556552`, and `007e79caf228` are RTC fuzzing finding identifiers, not
Git commit hashes. The fuzzing and reduction pipeline uses them to name
specific generated findings and their associated local repro artifacts. A
"representative" is one concrete finding chosen to stand for a broader
user-facing bug family after related findings have been clustered or reduced.
These identifiers are useful for matching this explanation to local fuzzing
metadata and videos, but they are not expected to resolve in GitHub.

Local realistic video evidence:

```text
/Users/danluu/dev/fuzz/gutenberg/artifacts/rtc-stale-delete-video/rtc-stale-delete-websocket-realistic-repro.mp4
```

## Evidence

- Ranking row: `890d98d04cda`, "Top-level delete propagation leaves a stale block on a peer"; related clean representatives: `3ac375556552`, `007e79caf228`.
- Realistic browser result: `3ac375556552/realistic-results/append-from-tail-enter-attempt-0.json` records `statesEqualAfterInsert: true`, `exactDeleteBug: true`, and `statesEqualAfterDelete: false`.
- The browser repro uses normal UI actions: B appends by click, `End`, `Enter`, and typing, then A deletes by selecting the inserted paragraph and using block options `Delete`. No injected transport fault, reload, revision restore, parser edge case, or artificial block is needed.
- Lower-level confirmation: `3ac375556552/unit-repro-result.json` records `remoteStillPresent: true`; after the delete, the Yjs state still contains `seed-954092-remote-paragraph`.
- The browser and unit outcomes differ in shape but not in semantics. The browser run diverges with one peer at three blocks and the other at four. The unit probe can converge incorrectly with both replicas retaining the deleted block. Both are lost-delete evidence.
- Branch check excluding PR #77876: current local branch `codex/rtc-stale-delete-890d98d04cda-20260514` at
  `2f59cd94b1ba41b004f4707ff25674506c81d796` does not contain PR #77876 head
  `6aad4e5801af23a5b42cd9fde4044895f06946ea`, but
  `realistic-results-no-77876-current/append-from-tail-enter-attempt-0.json`
  still records `statesEqualAfterInsert: true`, `exactDeleteBug: true`, and
  `statesEqualAfterDelete: false`.
- Longer wait check: with `RTC_3AC3_DELETE_CONVERGENCE_TIMEOUT_MS=60000`, the
  append-from-tail repros no longer diverged after delete, but they converged
  to the wrong state. Both editors still contained the deleted paragraph:
  `realistic-results-long-wait-60000-current/append-from-tail-enter-attempt-0.json`
  and `append-from-tail-enter-attempt-2.json` record
  `statesEqualAfterDelete: true`, `semanticDeleteBug: true`, and
  `insertedPresentAfterDelete: true`.
- Current-trunk lower-level family check: on `origin/trunk` at
  `2b5a7a9930490b13933a89c69f4455252072c14d`, the exact
  `3ac375556552` unit delete probe converges cleanly, but a sibling
  stale-top-level probe reproduces both sides of the same full-snapshot
  ambiguity: remote append is lost after a stale local edit, and remote delete
  is resurrected after a stale local edit. Result:
  `unit-current-origin-trunk-2b5a7a99304/stale-top-level-family-probe-result.json`.
- Current-trunk browser check: after building the current-trunk worktree so the
  Gutenberg plugin actually loaded, the repo-local normal-UI stale-save loop
  reproduced on repeat 1. The primary editor reloaded with
  `["Alpha local stale save loop 1", "Beta"]`, losing collaborator B's
  `Gamma remote stale save loop 1` paragraph. Artifacts:
  `/Users/danluu/dev/fuzz/rtc-repros/current-trunk-stale-top-level-built-20260514/playwright-artifacts/test-results/editor-collaboration-colla-620e7-ith-overlapping-draft-saves-chromium/`.

## How It Was Introduced

The original substrate is [PR #72262](https://github.com/WordPress/gutenberg/pull/72262) /
[`84019935998c16f877e976ad85e84748355d7282`](https://github.com/WordPress/gutenberg/commit/84019935998c16f877e976ad85e84748355d7282), "Improve CRDT merge logic for post entities". That commit created `packages/core-data/src/utils/crdt-blocks.ts` and the left/right full-array merge path used for block CRDT updates.

The architectural gap is that Gutenberg feeds the CRDT merge layer full block
snapshots from the editor, not explicit user operations. A later local snapshot
can be stale relative to the current Yjs block array. Without reliable
per-snapshot base provenance, the merge layer cannot distinguish these cases:

```text
current Y state:      [A, B, R]
incoming local:       [A', B]
```

That tuple can mean either:

- the local editor never observed remote block `R`, so `R` should be preserved;
- the local editor observed remote block `R` and deleted it, so `R` should be deleted.

Current `origin/trunk` still has the first side of this bug family. A stale
local snapshot can erase an unseen remote top-level append, or resurrect a
remote top-level delete, because the left/right merge infers array structure
operations from a stale full snapshot.

Later stale-save/stale-snapshot fixes tried to repair that first side by
preserving remote work from stale snapshots. The local branch that reproduces
the clean browser delete bug does not contain PR #77876, but it does contain an
earlier local copy of that repair line, including
[`7bc178d07b781ce5c24a7597e8e5c412534806d0`](https://github.com/danluu/gutenberg/commit/7bc178d07b781ce5c24a7597e8e5c412534806d0), cherry-picked from
[`cd6822b89c95050e56d39cd217a6bf9e036af315`](https://github.com/danluu/gutenberg/commit/cd6822b89c95050e56d39cd217a6bf9e036af315). PR #77876 later carries related stale-snapshot work, but the browser repro shows #77876 itself is not the original introducer.

Those stale-snapshot repairs have the opposite ambiguity. A preservation rule
without exact outgoing-snapshot provenance can also preserve a block that the
local editor did observe and then delete:

```text
previous local cache: [A, B, C]
current Y state:      [A, B, C, R]
incoming local:       [A, B, C]
```

If `R` was visible in the editor and the outgoing snapshot is based on a view
that contained `R`, omission means delete. If the outgoing snapshot is older
than `R`, omission means stale no-op. Membership in current Y state,
`previousLocalBlocksCache`, or provider receipt is not enough to tell those
apart.

Nearby but not likely direct introducers:

- [PR #72114](https://github.com/WordPress/gutenberg/pull/72114) /
  [`c214929139f50337250efe2bb24ff82c3ff2b6aa`](https://github.com/WordPress/gutenberg/commit/c214929139f50337250efe2bb24ff82c3ff2b6aa) made sync a side-concern over normal editor state. It made this class of stale full-snapshot issue easier to hit, but did not add the block-array merge policy.
- [PR #75923](https://github.com/WordPress/gutenberg/pull/75923) /
  [`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104`](https://github.com/WordPress/gutenberg/commit/128a3c29b7f1db4f35faf9e326dd1e5e7ac11104) expanded `mergeCrdtBlocks()` testing but missed observed remote insert then local delete.
- [PR #76913](https://github.com/WordPress/gutenberg/pull/76913) /
  [`09a21c64b5b92c2626bd93065d4a0192eb4fac47`](https://github.com/WordPress/gutenberg/commit/09a21c64b5b92c2626bd93065d4a0192eb4fac47) and [PR #77164](https://github.com/WordPress/gutenberg/pull/77164) /
  [`a6bfd3e55432981c7c2cb09190ee77954530b1a5`](https://github.com/WordPress/gutenberg/commit/a6bfd3e55432981c7c2cb09190ee77954530b1a5) changed nested/table/array attribute stability, not the top-level observed-delete policy.

Scope caveat: most direct proof is for clean representative `3ac375556552`. The headline representative `890d98d04cda` is the same user-facing stale-delete family, but some audit passes flagged a possible additional stale editor-store refresh path through `getPostChangesFromCRDTDoc()`. `007e79caf228` also deserves separate reduction before treating every related hash as the same exact internal mechanism.

## Fix Plan

The fix must address the shared full-snapshot ambiguity, not just one
stale-preservation helper or one PR branch. The plan is:

1. Treat this as missing operation/base provenance for full block-array
   snapshots, not as a single-PR regression.
2. Define `BlockSnapshotProvenance` as the exact immutable editor-visible base
   block tree that produced this outgoing `blocks` snapshot, or as explicit
   operations/tombstones carrying equivalent information.
3. Preserve durable block identity or equivalent operation identity in the RTC
   path. This does not require serializing Gutenberg `clientId`s into post
   HTML, but a complete fix needs some persisted identity/provenance in the
   CRDT/persistence path; serialized block shape, text, and position alone
   cannot distinguish observed deletes from stale no-op snapshots.
4. Capture that provenance at the editor/core-data boundary when the outgoing
   block array is produced. Pass it through `editEntityRecord()` /
   `SyncManager.update()` / `applyChangesToCRDTDoc()` into `mergeCrdtBlocks()`.
   Do not reconstruct it inside `mergeCrdtBlocks()` from current Y state.
5. Make unknown provenance a compatibility fallback only. It should not occur
   on ordinary editor edits.
6. Define the invariant first:
   - if outgoing snapshot base contains block `R` and the new local snapshot omits `R`, delete wins;
   - if outgoing snapshot base does not contain `R`, preserve `R` as unseen remote work;
   - if current Y state no longer contains a block that the stale local snapshot still contains, preserve the remote delete unless there is explicit local reinsert intent;
   - if the base is unknown, preserve current remote work conservatively and record the ambiguity.
7. Make provenance path-aware if the generic recursive merge is in scope. A
   flat `clientId` set is only a narrow top-level optimization; it does not
   prove moves, reparenting, nested `innerBlocks`, duplicate/missing
   `clientId`s, or delete-plus-reinsert semantics. If the first patch is
   top-level-only, state that scope and add a follow-up for nested block arrays.
8. Use provenance for three-way structural reconciliation per parent block
   array: base, incoming local snapshot, and current Y state. Current-only
   blocks absent from the incoming local snapshot should be preserved only when
   the snapshot base did not include them. Blocks absent from current Y state
   should not be resurrected from a stale local snapshot unless provenance
   proves explicit local reinsert intent.
9. Do not advance base/provenance caches on remote update receipt alone. A
   queued stale snapshot can arrive after a remote update and must not become a
   false delete or false reinsert.
10. Do not treat `previousLocalBlocksCache`, `yblocks.toJSON()`, CRDT receipt,
   provider sync, latest entity record, or global store dispatch as proof of
   user/editor observation. The relevant fact is what base produced the exact
   outgoing local snapshot.
11. Serialize persistence from the post-merge block tree. If blocks participate
   in the edit/save flow, REST `content`, CRDT `content`, and `_crdt_document`
   must not be overwritten by stale serialized HTML, including save-time
   content-only materialization and `prePersistPostType()` paths.
12. Keep stale-snapshot protections as negative controls. The fix must cover
   both current trunk's "stale snapshot destroys remote work" and the local
   known-fix branch's "preservation hides observed delete".
13. Add P0 tests:
   - current-trunk remote append plus stale no-op snapshot;
   - current-trunk remote append plus stale unrelated local edit;
   - current-trunk remote delete plus stale unrelated local edit;
   - same current/incoming block arrays with different bases, proving one case
     preserves remote append and the other deletes observed block `R`;
   - observed remote append then local delete, with forced stale previous-local cache;
   - queued stale snapshot created before a remote update and flushed after the
     remote update is applied;
   - repeated stale snapshot after preservation and repeated sync after deletion;
   - nested `innerBlocks` append/delete, or an explicit top-level-only scope test;
   - post adapter and save/reload tests where `content` is derived from merged
     `blocks`, and REST `content`, CRDT `content`, `_crdt_document`, and a fresh
     third editor agree;
   - repo-local normal-UI browser repro for remote append loss under overlapping saves;
   - repo-local normal-UI browser repro for remote delete resurrection;
   - repo-local normal-UI WebSocket repro for visible remote append then block-options delete.
14. Add follow-up or separate-reduction tests for the `890d98d04cda` stale editor-store refresh hypothesis and for `007e79caf228`.

Bad fixes to avoid:

- wholesale Y.Array replacement;
- global "remote update observed" flags;
- treating current Y state as user observation;
- dropping durable block identity and trying to infer causality from text,
  position, or block count alone;
- updating base caches on remote receipt;
- relying on block count or text-only assertions instead of `clientId` or a unique marker.
- fixing only the local stale-preservation branch while leaving current trunk's stale full-array merge behavior intact.
- accepting unknown provenance on the normal editor path.

## Fix Plan Audit

The current audit incorporates the branch-without-#77876 check and the
current-trunk evidence. Raw Codex outputs are under:

```text
/tmp/rtc-stale-delete-codex-audits/no77876-20260514/round1
/tmp/rtc-stale-delete-codex-audits/no77876-20260514/meta1
/tmp/rtc-stale-delete-codex-audits/no77876-20260514/meta2
```

The audit converged on these conclusions:

- The provenance-based fix plan is necessary. A narrower
  `reconcileStaleLocalBlocks()` heuristic would still permit stale snapshots to
  erase unseen remote work or mask observed deletes.
- Provenance must mean the exact immutable editor-visible block tree that
  produced the outgoing `blocks` snapshot, or explicit operations/tombstones
  with equivalent information.
- A complete fix needs durable block identity or equivalent operation identity
  in the RTC path. It does not need to write Gutenberg `clientId`s into
  serialized post HTML, but it cannot rely only on block text, type, position,
  or count.
- `previousLocalBlocksCache`, current Y state, provider receipt, latest store
  state, and global dispatch are not valid observation signals.
- Unknown provenance is acceptable only for compatibility/import paths. It
  cannot be normal for the editor path because it intentionally masks observed
  deletes.
- A flat `clientId` set is not a complete fix if recursive block arrays are in
  scope. Either make provenance path-aware or explicitly scope the first patch
  to top-level arrays.
- Save/persist is part of the bug surface. A CRDT merge fix can still fail if
  save-time stale serialized HTML bypasses the merged block tree.
- Browser coverage must include current-trunk append loss, visible remote insert
  then local block-options delete, and remote-delete resurrection prevention.

The audit reduced the action items to:

1. Capture exact per-outgoing-snapshot base provenance at the editor/store boundary.
2. Thread it through the real sync pipeline into CRDT merge.
3. Preserve durable block identity or equivalent operation identity through the
   RTC persistence path.
4. Apply a three-way base/incoming/current merge policy.
5. Preserve remote deletes unless provenance proves explicit local reinsert.
6. Serialize persisted content from post-merge blocks.
7. Prove the behavior with unit, adapter, save/reload, and normal-UI browser tests.

## Real Bug Or False Positive

Verdict: real bug, not a false positive.

Evidence hierarchy:

1. Normal-UI Playwright repro: remote append, wait for insert convergence, delete visible inserted block through normal block UI, then peers diverge.
2. Saved realistic results: `statesEqualAfterInsert: true`, `exactDeleteBug: true`, `statesEqualAfterDelete: false`.
3. Clean fuzz metadata: no sync faults, no reload dependency, no parser/revision dependency.
4. Lower-level Yjs repro: after delete, the remote paragraph's `clientId` remains present.
5. Code/history: the full block-array merge substrate lacks base/operation
   provenance; later stale-snapshot preservation repairs can expose the
   opposite-side observed-delete ambiguity even without PR #77876.

False-positive audits:

- linus torvalds: real bug with high confidence; exact cache state in the browser is inferred unless instrumented.
- kyle kingsbury: real bug; the clean representative proves the underlying family even if not every related hash is reduced to the same path.
- marc brooker: real bug; confidence high for user reachability and medium-high for the exact internal mechanism.
- dan luu: real bug; use browser repro for UI reachability and the unit probe for mechanism.
- tptacek: real bug; the fuzz seed is clean merge-path evidence, while the realistic Playwright repro proves normal user actions.
- contrarian: real bug; final wording should not conflate browser divergence and unit-level incorrect convergence.

Meta-audit corrections:

- Do not say the original fuzz seed alone proves manual UI reachability. It is clean supporting evidence; the realistic Playwright repro is the UI proof.
- Do not copy the wrong preservation predicate. Preservation happens for a current block with a clientId that is absent from local, absent from previous, and absent from the planned sync set.
- Do not state the root cause as absolutely proven by browser evidence unless a run records `previousBlocks`, `currentBlocks`, and `localBlocksToSync` at delete time.
- Do explicitly map `3ac375556552` to the `890d98d04cda` stale-delete family and state the remaining uncertainty.

What would invalidate the claim:

- a same-code UI repro where insert convergence succeeds and delete convergence also succeeds across repeated attempts;
- instrumentation showing `previousLocalBlocksCache` already contained the remote block before the delete merge;
- evidence that the deleting editor did not actually observe the inserted block before deletion;
- evidence that the repro depended on injected faults, reload, parser stress, revision restore, direct browser state mutation, or invalid block data;
- an intentional product policy that deleting a collaborator-inserted visible block is local-only, which would be surprising and would still need convergence semantics.

## Follow-Up Instrumentation

To move the root-cause claim from high-confidence to proven for the browser path, instrument the delete merge to record:

- `previousLocalBlocksCache` clientIds;
- current Y block clientIds;
- incoming local snapshot clientIds;
- whether the outgoing snapshot base contained the deleted clientId;
- whether `reconcileStaleLocalBlocks()` spliced the deleted block back into `blocksToSync`.

That instrumentation should be temporary or test-only. The committed regression should remain a durable repo-local unit/browser test, not a triage artifact wrapper.
