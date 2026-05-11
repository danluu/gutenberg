# RTC cross-scope Group move can reinsert a stale top-level paragraph

Bug signature: `d465f26f6b79`

Bug type: `cross_scope_move_duplicates_block_after_group_insert`

Transport: HTTP

## Status

This is a real RTC correctness bug. Pass 175 overturns the narrower pass 174 conclusion: the exact May 7 known-fixes base (`f256024286dd80a4c0e2579f658c109256abf648`) fixed the no-base `mergeCrdtBlocks()` route, but the normal editor route passes `baseRecord.blocks` through `core-data` and `sync`, and that base-backed route still reproduced the stale top-level duplicate on the exact known-fixes SHA.

Current `origin/trunk` at `b38f9b4d86d0505199f5efd78c2adf213e428e78` also reproduces the no-base variant. The paired PR branch adds low-level regressions for no-base, `baseBlocks`, old-root stale snapshots, and the post entity CRDT path; it also has a Playwright stress scenario using the editor's Group menu action and a fix that reconciles stale full block snapshots before structural merging.

Pass 178 narrows the product route. A scratch regression on the exact known-fixes SHA also fails when the stale peer sends the old root list plus an unrelated tail edit after another peer moves the paragraph into an already-present Group. That means the stale peer does not need to have an already-duplicated editor snapshot. However, the simpler toolbar "Group this paragraph" shape, `[paragraph, tail] -> [group[paragraph], tail]`, passed in the same scratch test. The current Playwright test that uses the block options `Group` action is therefore a broader collaboration stress test, not a faithful browser proof of this specific duplicate.

## Practical impact

Real-user likelihood: `low`.

Natural workflow:

1. Two collaborators edit the same post in the post editor with RTC enabled over HTTP sync.
2. The post contains ordinary Paragraph blocks.
3. One collaborator moves or drags a top-level Paragraph into an existing Group, turning `[group, paragraph, tail]` into `[group[paragraph], tail]`.
4. The other collaborator is stale because of a delayed/offline tab and edits another paragraph before receiving or flushing the newer nested structure.
5. When the stale full block snapshot merges after the cross-scope move, the stale root copy can be interpreted as a new top-level block, so peers can see both `group[paragraph]` and the old top-level `paragraph`.

Common prerequisites: Paragraph blocks, Group blocks, moving a block into a Group, multiple collaborators, and editing another paragraph are normal editor behavior. Rare prerequisites: an RTC-enabled multi-user session plus timing where one peer sends a stale full block snapshot after another peer's structural move has already landed. Artificial/fuzzer-only parts: the exact seed, marker strings, and deterministic schedule. The pass-178 low-level repro isolates the merge invariant; a faithful browser repro should use a natural List View/canvas move into an existing Group rather than the toolbar `Group` action.

Blast radius: visible duplicate content, possible peer divergence, and persistent duplicate content if the bad state is saved. I found no evidence of an OOM/performance risk, a save loop, or a UI-only inconsistency. Recovery is manual deletion or revision restore if the duplicate is noticed.

Strongest evidence for `low` rather than false:

- The handoff manifest marks this runnable and likely real: seed `956512`, confidence `medium`, recommended action `file_bug`.
- On exact known-fixes SHA `f256024286dd80a4c0e2579f658c109256abf648`, a pass-175 scratch test using `baseBlocks` failed by ending with root client IDs `["group", "tail-paragraph", "<uuid>"]`: the stale moved paragraph was reinserted at root with a fresh client ID after duplicate-client-ID cleanup.
- Pass 178 added a simpler scratch variant on the same SHA where the stale peer sends only the old root shape `[group, moved-paragraph, tail-paragraph(local edit)]`; it also fails with the stale moved paragraph reinserted at root.
- The normal editor path in that known-fixes base passes `baseRecord`: `core-data/src/actions.js` calls `getSyncManager()?.update(..., { baseRecord: editedRecord })`, `packages/sync/src/manager.ts` forwards it, and `packages/core-data/src/utils/crdt.ts` passes `baseRecord.blocks` into `mergeCrdtBlocks()`.
- The final PR branch's low-level regression covers both the no-base helper route and the normal `baseBlocks` editor route. The `baseBlocks` variant fails on the exact known-fixes SHA and passes with the fix.
- The updated PR branch's focused unit regression now covers four cases and passes with the fix: no-base duplicate snapshot, direct `baseBlocks` duplicate snapshot, direct `baseBlocks` old-root stale snapshot, and the post entity CRDT path.

Strongest evidence against higher likelihood:

- The original source artifact path from the prompt is missing locally, so the original run could not be re-read directly.
- The May 5 refreshed Playwright spec had no assertion; it only wrote JSON when `RTC_D465F26F6B79_RESULT_DIR` was set, so "2 passed" was not product evidence.
- The timing needs a live collaboration race or stale/offline tab; single-user editing cannot hit this.
- The pass-178 scratch test for the toolbar Group shape, `[paragraph, tail] -> [group[paragraph], tail]` with a stale `[paragraph, tail(local edit)]`, passed on the exact known-fixes SHA. That lowers the likelihood because the easy visible Group command is not the failing route.
- Browser drag-into-existing-Group attempts were brittle in Playwright and no-op'd before product assertions, so pass 175 switched to the toolbar Group action; pass 178 shows that switch weakened the browser proof for this specific signature.

Pass 177 follow-up: the natural Playwright test on the PR branch is not a reliable before/after proof. With assets rebuilt from commit 2 (`a2cf9179287`), the browser test passed 6/6 attempts instead of reproducing the duplicate. With assets rebuilt from commit 3 before the pass-177 correction, it failed in two different ways: once the Group move was lost while the stale tail edit survived, and once the Group move survived while the stale tail edit was lost. This means the current browser test is exercising a broader offline/reconnect ordering problem, not just the stale full-snapshot merge isolated by the unit regression.

Shortest confidence-improving experiment: build a browser repro that starts with an existing Group, delays the stale peer's HTTP poll response while the other peer moves a Paragraph into that Group via List View or canvas drag, then lets the stale peer make a normal tail edit before its local editor reconciles the remote structure. That is the browser-level ordering that matches the low-level `baseRecord` regression.

## Root cause

The historical introduction point is `84019935998c16f877e976ad85e84748355d7282` (`Improve CRDT "merge logic" for post entities (#72262)`, October 14, 2025). That commit introduced the generic full-block snapshot merge logic for post entities. The merge treats a block present in the incoming full snapshot but absent from the current shared root as an insertion. That is correct for a real local insert, but wrong for a stale source copy after another collaborator has moved the same block under a Group.

The May 7 known-fixes stack added stale-snapshot reconciliation in `5bda437f0cc46658198d54233cdfb155ddc7a660` (`Preserve saved content from stale editor snapshots`) and a sibling branch added the base-record correction in `908ca6bd4aa9b98b6a8be9c44c95952626ca157a` (`Reconcile stale block snapshots with base records`). Pass 175 showed why both are needed: ordinary editor edits use `baseRecord.blocks`, and exact `f256024...` skipped stale reconciliation whenever `baseBlocks` existed.

The bad shape is:

```text
Initial: [ group, movedParagraph, tailParagraph ]
Remote:  [ group[movedParagraph], tailParagraph ]
Stale:   [ group[movedParagraph], movedParagraph, tailParagraph(local edit) ]
Wrong:   [ group[movedParagraph], movedParagraph, tailParagraph(local edit) ]
Right:   [ group[movedParagraph], tailParagraph(local edit) ]
```

When duplicate client IDs are present, the current merge can assign a fresh ID to the stale source copy, which makes the corruption harder to recognize later.

## Fix plan and audit

Initial plan: reconcile stale local full-block snapshots before structural merge. If a block existed in the previous/base root and exists in the incoming stale root but no longer exists in the current CRDT root, treat that root entry as stale and remove it from the incoming root array. Preserve unrelated local edits by reconciling attributes and inner blocks by stable client ID.

Kernel-maintainer robustness check: keep the fix local to the CRDT merge boundary where all callers already pass full block values; avoid UI-specific special cases; use client IDs only when every sibling has a unique ID; fall back to existing behavior when the identity preconditions are not met.

Jepsen-style correctness check: do not solve duplicates by dropping all remote-only state. A stale snapshot is a lossy observation of a replicated structure. The merge must preserve concurrent local tail edits and preserve the nested moved paragraph while removing only the stale source copy at the old scope.

Dan-Luu-style simplicity/performance check: the fix is still more code than ideal, but it is bounded to block-array reconciliation and uses maps/sets over sibling lists. It avoids global traversal on every attribute and avoids serialized-HTML parsing. The residual risk is semantic ambiguity when client IDs are missing or duplicated; the fix deliberately bails out in those cases rather than guessing.

Revised plan implemented in the PR branch and corrected in pass 177:

- Add `baseRecord` plumbing from entity actions through the sync manager into `applyChangesToCRDTDoc()`.
- Cache previous local block snapshots for no-base callers.
- Reconcile stale local block values using `baseBlocks` when available, otherwise the previous local cache.
- Apply reconciliation before the existing structural merge.
- Keep local attribute changes that differ from the base while adopting current remote structure for unchanged fields.

Pass 177 found that the earlier PR branch had added the optional `baseBlocks` argument and direct unit coverage, but had not actually wired `baseRecord.blocks` through the real editor/sync call path. The PR branch was amended to pass the pre-edit entity record from `editEntityRecord()` through the sync manager and into `applyPostChangesToCRDTDoc()`, and the unit regression now includes a post-entity CRDT-path case.

## Verification

Exact known-fixes base check:

```bash
cd /tmp/d465-pass175-knownfix
npm run test:unit packages/core-data/src/utils/test/crdt-d465-pass175-base-record.test.ts -- --runInBand
```

Result on `f256024286dd80a4c0e2579f658c109256abf648`: failed one test and passed one test. The no-base route passed, while the `baseBlocks` route failed with an extra stale moved paragraph at root. This is the pass-175 evidence missing from pass 174.

Final PR branch checks through pass 177:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-d465f26f6b79-pr
npm run test:unit packages/core-data/src/utils/test/crdt-d465-cross-scope-move.test.ts -- --runInBand
npm run test:unit packages/sync/src/test/manager.ts -- --runInBand
```

Results: both focused unit suites passed. The d465 unit run now reports three passing cases: without `baseBlocks`, with direct `baseBlocks`, and through the post entity CRDT path. The sync manager suite reports 26 passing tests.

Browser status after pass 177: not PR-ready. The current Playwright test is still valuable as a stress scenario, but it should not be treated as a passing natural repro for this specific fix. After rebuilding assets with the pass-177 corrected fix, the focused browser test still failed under the offline/reconnect schedule with the moved paragraph ending top-level in one run. That does not disprove the low-level bug; it shows the browser repro needs a tighter transport ordering to exercise the intended stale full-snapshot merge.

Annotated stitched video:

```text
/Users/danluu/dev/fuzz/gutenberg-bug-d465f26f6b79-pr/artifacts/d465f26f6b79-pass175-natural-repro.mp4
```

## Branches

Explanation branch:

```text
try/cross-scope-move-duplicates-block-after-group-insert-d465f26f6b79
```

PR branch:

```text
try/cross-scope-move-duplicates-block-after-group-insert-d465f26f6b79-pr
```
