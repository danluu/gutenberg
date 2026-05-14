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

## How It Was Introduced

The older substrate is [PR #72262](https://github.com/WordPress/gutenberg/pull/72262) /
[`84019935998c16f877e976ad85e84748355d7282`](https://github.com/WordPress/gutenberg/commit/84019935998c16f877e976ad85e84748355d7282), "Improve CRDT merge logic for post entities". That commit created `packages/core-data/src/utils/crdt-blocks.ts` and the left/right full-array merge path used for block CRDT updates.

The likely proximate introducer for the clean `3ac375556552` stale-delete mechanism is [PR #77876](https://github.com/WordPress/gutenberg/pull/77876) /
[`5bda437f0cc46658198d54233cdfb155ddc7a660`](https://github.com/WordPress/gutenberg/commit/5bda437f0cc46658198d54233cdfb155ddc7a660), "Preserve saved content from stale editor snapshots". This PR was included in the known-fixes integration base used by the ranking.

That change added stale-snapshot reconciliation around top-level blocks. Its intent was correct: a stale editor snapshot should not erase remote work it never observed. The bug is that the rule also preserves a block that the local editor did observe and then deleted.

The failing state is:

```text
previous local cache: [A, B, C]
current Y state:      [A, B, C, R]
incoming local:       [A, B, C]
```

That tuple can mean either:

- the incoming snapshot is stale and never observed remote block `R`, so `R` should be preserved;
- the user observed remote block `R` and deleted it, so `R` should be deleted.

`reconcileStaleLocalBlocks()` only has membership in the incoming local snapshot, `previousLocalBlocksCache`, and current Y state. For the second case, it sees `R` in current Y state, absent from the incoming local snapshot, and absent from the previous local snapshot. The preservation rule classifies `R` as an unseen remote insert and splices it back into the block list that will be merged. The Y.Array delete is therefore never emitted.

Local fork history has equivalent earlier copies of the same rule, including
[`7bc178d07b781ce5c24a7597e8e5c412534806d0`](https://github.com/danluu/gutenberg/commit/7bc178d07b781ce5c24a7597e8e5c412534806d0), cherry-picked from
[`cd6822b89c95050e56d39cd217a6bf9e036af315`](https://github.com/danluu/gutenberg/commit/cd6822b89c95050e56d39cd217a6bf9e036af315). For the upstream PR lineage, #77876 / `5bda437f0cc...` is the relevant link.

Nearby but not likely direct introducers:

- [PR #72114](https://github.com/WordPress/gutenberg/pull/72114) /
  [`c214929139f50337250efe2bb24ff82c3ff2b6aa`](https://github.com/WordPress/gutenberg/commit/c214929139f50337250efe2bb24ff82c3ff2b6aa) made sync a side-concern over normal editor state. It made this class of stale full-snapshot issue possible, but did not add the stale top-level preservation rule.
- [PR #75923](https://github.com/WordPress/gutenberg/pull/75923) /
  [`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104`](https://github.com/WordPress/gutenberg/commit/128a3c29b7f1db4f35faf9e326dd1e5e7ac11104) expanded `mergeCrdtBlocks()` testing but missed observed remote insert then local delete.
- [PR #76913](https://github.com/WordPress/gutenberg/pull/76913) /
  [`09a21c64b5b92c2626bd93065d4a0192eb4fac47`](https://github.com/WordPress/gutenberg/commit/09a21c64b5b92c2626bd93065d4a0192eb4fac47) and [PR #77164](https://github.com/WordPress/gutenberg/pull/77164) /
  [`a6bfd3e55432981c7c2cb09190ee77954530b1a5`](https://github.com/WordPress/gutenberg/commit/a6bfd3e55432981c7c2cb09190ee77954530b1a5) changed nested/table/array attribute stability, not the top-level observed-delete policy.

Scope caveat: most direct proof is for clean representative `3ac375556552`. The headline representative `890d98d04cda` is the same user-facing stale-delete family, but some audit passes flagged a possible additional stale editor-store refresh path through `getPostChangesFromCRDTDoc()`. `007e79caf228` also deserves separate reduction before treating every related hash as the same exact internal mechanism.

## Initial Fix Plan

1. Add a deterministic unit regression for `3ac375556552`: two Y docs, B appends a paragraph, A receives it, A deletes that same visible paragraph while its previous local cache still predates the append, then both docs exchange updates. Assert the inserted `clientId` and unique text are absent from both docs.
2. Add the negative control: if A emits a genuinely stale snapshot whose base did not include B's remote append, preserve the remote append.
3. Add a repo-local WebSocket Playwright regression using normal UI actions only: B appends, wait for convergence, A deletes through block options, assert both editors converge to removal.
4. Change reconciliation so an omitted current block is preserved only when the outgoing local snapshot did not observe it. If the outgoing snapshot's base included the block and the new local snapshot omits it, treat that omission as a delete.
5. Keep #77876's stale-snapshot protection. Do not remove the preserve-remote-work behavior wholesale.
6. Avoid wholesale Y.Array replacement. Preserve Yjs operation semantics, nested block attributes, cursor behavior, and existing stale-save protections.

## Fix Plan Audit

Raw audit outputs were written under:

```text
/tmp/rtc-stale-delete-codex-audits/round1
/tmp/rtc-stale-delete-codex-audits/meta1
/tmp/rtc-stale-delete-codex-audits/meta2
```

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

The revised plan is:

1. Define the invariant first:
   - if outgoing snapshot base contains block `R` and the new local snapshot omits `R`, delete wins;
   - if outgoing snapshot base does not contain `R`, preserve `R` as unseen remote work;
   - if the base is unknown, preserve current remote work conservatively.
2. Carry per-outgoing-snapshot provenance into the CRDT block merge layer. Viable carriers include an observed clientId set, a block snapshot generation, a Yjs state-vector-equivalent, or explicit delete tombstones. `__unstablePreviousValue` plus a WeakMap is one possible implementation, but the ordering must be proven.
3. Use that provenance in `reconcileStaleLocalBlocks()`. Current-only blocks absent from the incoming local snapshot should be preserved only when the snapshot base did not include them.
4. Do not advance `previousLocalBlocksCache` on remote update receipt. A queued stale snapshot can arrive after a remote update and must not become a false delete.
5. Do not treat `yblocks.toJSON()`, CRDT receipt, or global store dispatch as proof of observation. The relevant fact is what base produced the exact outgoing local snapshot.
6. Keep the old stale-snapshot protections as negative controls. This bug shows one missing case, not that #77876's preservation policy should be removed.
7. Add P0 tests:
   - observed remote append then local delete, with forced stale previous-local cache;
   - unseen remote append plus stale no-op snapshot;
   - unseen remote append plus stale unrelated local edit;
   - observed delete plus unrelated local edit;
   - repeated stale snapshot after preservation and repeated sync after deletion;
   - repo-local WebSocket UI repro using normal append/delete actions.
8. Add follow-up or separate-reduction tests for the `890d98d04cda` stale editor-store refresh hypothesis and for `007e79caf228`.

Bad fixes to avoid:

- wholesale Y.Array replacement;
- global "remote update observed" flags;
- treating current Y state as user observation;
- updating `previousLocalBlocksCache` on remote receipt;
- relying on block count or text-only assertions instead of `clientId` or a unique marker.

## Real Bug Or False Positive

Verdict: real bug, not a false positive.

Evidence hierarchy:

1. Normal-UI Playwright repro: remote append, wait for insert convergence, delete visible inserted block through normal block UI, then peers diverge.
2. Saved realistic results: `statesEqualAfterInsert: true`, `exactDeleteBug: true`, `statesEqualAfterDelete: false`.
3. Clean fuzz metadata: no sync faults, no reload dependency, no parser/revision dependency.
4. Lower-level Yjs repro: after delete, the remote paragraph's `clientId` remains present.
5. Code/history: #77876's preservation rule creates the exact ambiguous state.

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
