# RTC stale-delete propagation, 2026-05-14

This note covers the rank-1 score-4 RTC issue from
[`rtc-score4-likelihood-ranking-20260514.md`](https://github.com/danluu/gutenberg/blob/explain/rtc-score4-likelihood-ranking-20260514/docs/explanations/architecture/rtc-score4-likelihood-ranking-20260514.md).

The headline representative is `890d98d04cda`. The cleanest reduction for the same user-facing family is `3ac375556552`: one collaborator appends a normal top-level paragraph, both editors converge, and another collaborator deletes that visible paragraph through the normal block UI. The deleting peer removes it, but the other peer retains it, or the lower-level Yjs repro reintroduces it on both peers.

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
- No-#77876 browser check: current local branch `codex/rtc-stale-delete-890d98d04cda-20260514` at
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
preserving remote work from stale snapshots. The no-#77876 branch that
reproduces the clean browser delete bug contains an earlier local copy of that
repair line, including
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

## Initial Fix Plan

This section is superseded by the no-#77876/current-trunk reassessment below.
The original plan correctly required distinguishing observed delete from unseen
remote append, but it was framed too narrowly around #77876 and
`reconcileStaleLocalBlocks()`.

The older plan was:

1. Add a deterministic unit regression for `3ac375556552`: two Y docs, B appends a paragraph, A receives it, A deletes that same visible paragraph while its previous local cache still predates the append, then both docs exchange updates. Assert the inserted `clientId` and unique text are absent from both docs.
2. Add the negative control: if A emits a genuinely stale snapshot whose base did not include B's remote append, preserve the remote append.
3. Add a repo-local WebSocket Playwright regression using normal UI actions only: B appends, wait for convergence, A deletes through block options, assert both editors converge to removal.
4. Change reconciliation so an omitted current block is preserved only when the outgoing local snapshot did not observe it. If the outgoing snapshot's base included the block and the new local snapshot omits it, treat that omission as a delete.
5. Keep stale-snapshot protection. Do not remove the preserve-remote-work behavior wholesale.
6. Avoid wholesale Y.Array replacement. Preserve Yjs operation semantics, nested block attributes, cursor behavior, and existing stale-save protections.

## Fix Plan Audit

Raw audit outputs were written under:

```text
/tmp/rtc-stale-delete-codex-audits/round1
/tmp/rtc-stale-delete-codex-audits/meta1
/tmp/rtc-stale-delete-codex-audits/meta2
```

This audit predates the no-#77876/current-trunk evidence and is superseded by
the no-#77876 audit below. It is retained as historical context.

Round 1:

- linus torvalds: the plan needs explicit per-snapshot provenance; current membership tests cannot distinguish unseen remote insert from observed delete. Tests must assert `clientId`, and the browser regression must not be an absolute artifact import.
- kyle kingsbury: the ambiguous tuple is the core issue. A fix inside `reconcileStaleLocalBlocks()` is heuristic unless it receives a base/version/observed-state signal or explicit delete operation.
- marc brooker: split the family by evidence. `3ac375556552` fits `crdt-blocks.ts`; `890d98d04cda` may also involve stale editor-store refresh; `007e79caf228` should not be collapsed without reduction.
- dan luu: the proposed observed-base idea is directionally right, but "visible in editor" is too loose. The needed fact is the base of the exact outgoing snapshot.
- tptacek: do not infer observation from current Y state, CRDT receipt, or global store dispatch. Unknown base should preserve remote work.
- contrarian: the hard part is underspecified. Add stale no-op and repeated stale snapshot tests so a fix does not regress #77876.

Meta round 1:

- linus torvalds: #77876 is the likely proximate introducer; #72262 is only substrate. Add introduction history and avoid overclaiming browser-side cache instrumentation.
- kyle kingsbury: frame this as missing causal provenance, not just a bad structural diff.
- marc brooker: final doc should use an evidence matrix by representative and keep the `890` editor-store theory as a hypothesis until tested.
- dan luu: trim the test plan to causal guardrails first; keep `__unstablePreviousValue` / WeakMap as a possible carrier, not a proven fix.
- tptacek: separate `3ac`, `890`, and `007`; add a focused `crdt.ts` test if `890` remains the headline.
- contrarian: add a "bad fixes" section and do not update `previousLocalBlocksCache` on remote receipt.

Meta round 2:

- linus torvalds: state plainly that membership tests cannot implement the intended policy.
- kyle kingsbury: define `previousLocalBlocksCache` as last locally merged snapshot, not last editor-visible state.
- marc brooker: lead with missing snapshot provenance; name #77876 as likely introducer.
- dan luu: split confidence by representative and remove stale/nonexistent test-file references.
- tptacek: keep the final P0 tests focused on observed delete, unseen stale preserve, stale no-op/unrelated edit, repeated stale snapshot, and a repo-local UI regression.
- contrarian: replace "fix `reconcileStaleLocalBlocks()`" with "add snapshot provenance, then use it in reconciliation."

## Revised Fix Plan

After the no-#77876/current-trunk reassessment and the second audit, the v2
fix plan is:

1. Treat this as missing operation/base provenance for full block-array
   snapshots, not as a #77876-specific regression.
2. Define `BlockSnapshotProvenance` as the exact immutable editor-visible base
   block tree that produced this outgoing `blocks` snapshot, or as explicit
   operations/tombstones carrying equivalent information.
3. Capture that provenance at the editor/core-data boundary when the outgoing
   block array is produced. Pass it through `editEntityRecord()` /
   `SyncManager.update()` / `applyChangesToCRDTDoc()` into `mergeCrdtBlocks()`.
   Do not reconstruct it inside `mergeCrdtBlocks()` from current Y state.
4. Make unknown provenance a compatibility fallback only. It should not occur
   on ordinary editor edits.
5. Define the invariant first:
   - if outgoing snapshot base contains block `R` and the new local snapshot omits `R`, delete wins;
   - if outgoing snapshot base does not contain `R`, preserve `R` as unseen remote work;
   - if current Y state no longer contains a block that the stale local snapshot still contains, preserve the remote delete unless there is explicit local reinsert intent;
   - if the base is unknown, preserve current remote work conservatively and record the ambiguity.
6. Make provenance path-aware if the generic recursive merge is in scope. A
   flat `clientId` set is only a narrow top-level optimization; it does not
   prove moves, reparenting, nested `innerBlocks`, duplicate/missing
   `clientId`s, or delete-plus-reinsert semantics. If the first patch is
   top-level-only, state that scope and add a follow-up for nested block arrays.
7. Use provenance for three-way structural reconciliation per parent block
   array: base, incoming local snapshot, and current Y state. Current-only
   blocks absent from the incoming local snapshot should be preserved only when
   the snapshot base did not include them. Blocks absent from current Y state
   should not be resurrected from a stale local snapshot unless provenance
   proves explicit local reinsert intent.
8. Do not advance base/provenance caches on remote update receipt alone. A
   queued stale snapshot can arrive after a remote update and must not become a
   false delete or false reinsert.
9. Do not treat `previousLocalBlocksCache`, `yblocks.toJSON()`, CRDT receipt,
   provider sync, latest entity record, or global store dispatch as proof of
   user/editor observation. The relevant fact is what base produced the exact
   outgoing local snapshot.
10. Serialize persistence from the post-merge block tree. If blocks participate
   in the edit/save flow, REST `content`, CRDT `content`, and `_crdt_document`
   must not be overwritten by stale serialized HTML, including save-time
   content-only materialization and `prePersistPostType()` paths.
11. Keep stale-snapshot protections as negative controls. The fix must cover
   both current trunk's "stale snapshot destroys remote work" and the local
   known-fix branch's "preservation hides observed delete".
12. Add P0 tests:
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
13. Add follow-up or separate-reduction tests for the `890d98d04cda` stale editor-store refresh hypothesis and for `007e79caf228`.

Bad fixes to avoid:

- wholesale Y.Array replacement;
- global "remote update observed" flags;
- treating current Y state as user observation;
- updating base caches on remote receipt;
- relying on block count or text-only assertions instead of `clientId` or a unique marker.
- fixing only the local stale-preservation branch while leaving current trunk's stale full-array merge behavior intact.
- accepting unknown provenance on the normal editor path.

## No-#77876 Fix Plan Audit

A new audit was triggered after the no-#77876/current-trunk evidence changed the
introduction history and fix scope. Raw Codex outputs are under:

```text
/tmp/rtc-stale-delete-codex-audits/no77876-20260514/round1
/tmp/rtc-stale-delete-codex-audits/no77876-20260514/meta1
/tmp/rtc-stale-delete-codex-audits/no77876-20260514/meta2
```

The audit converged on these conclusions:

- A new v2 fix plan is necessary. The root-cause framing is unchanged, but the
  prior plan was still loose enough to permit another heuristic fix.
- Provenance must mean the exact immutable editor-visible block tree that
  produced the outgoing `blocks` snapshot, or explicit operations/tombstones
  with equivalent information.
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

Meta round 2 reduced the action items to:

1. Capture exact per-outgoing-snapshot base provenance at the editor/store boundary.
2. Thread it through the real sync pipeline into CRDT merge.
3. Apply a three-way base/incoming/current merge policy.
4. Preserve remote deletes unless provenance proves explicit local reinsert.
5. Serialize persisted content from post-merge blocks.
6. Prove the behavior with unit, adapter, save/reload, and normal-UI browser tests.

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
