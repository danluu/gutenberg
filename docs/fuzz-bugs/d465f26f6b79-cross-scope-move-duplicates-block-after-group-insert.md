# RTC cross-scope Group move can reinsert a stale top-level paragraph

Bug signature: `d465f26f6b79`

Bug type: `cross_scope_move_duplicates_block_after_group_insert`

Transport: HTTP

## Status

This is a real RTC correctness bug. Pass 175 overturns the narrower pass 174 conclusion: the exact May 7 known-fixes base (`f256024286dd80a4c0e2579f658c109256abf648`) fixed the no-base `mergeCrdtBlocks()` route, but the normal editor route passes `baseRecord.blocks` through `core-data` and `sync`, and that base-backed route still reproduced the stale top-level duplicate on the exact known-fixes SHA.

Current `origin/trunk` at `b38f9b4d86d0505199f5efd78c2adf213e428e78` also reproduces the no-base variant. The paired PR branch adds a low-level regression for both no-base and `baseBlocks` merge paths, a natural Playwright repro using the editor's Group menu action, and a fix that reconciles stale full block snapshots before structural merging.

## Practical impact

Real-user likelihood: `medium`.

Natural workflow:

1. Two collaborators edit the same post in the post editor with RTC enabled over HTTP sync.
2. The post contains ordinary Paragraph blocks.
3. One collaborator selects a top-level Paragraph and uses the normal block options menu to Group it, turning `[paragraph, tail]` into `[group[paragraph], tail]`.
4. The other collaborator is stale because of a delayed/offline tab and edits another paragraph before receiving or flushing the newer Grouped structure.
5. When the stale full block snapshot merges after the Group action, the stale root copy can be interpreted as a new top-level block, so peers can see both `group[paragraph]` and the old top-level `paragraph`.

Common prerequisites: Paragraph blocks, Grouping a block, multiple collaborators, and editing another paragraph are normal editor behavior. Rare prerequisites: an RTC-enabled multi-user session plus timing where one peer sends a stale full block snapshot after another peer's structural move has already landed. Artificial/fuzzer-only parts: the exact seed, marker strings, and deterministic schedule. The Playwright repro uses normal UI actions; the low-level repro only isolates the merge invariant.

Blast radius: visible duplicate content, possible peer divergence, and persistent duplicate content if the bad state is saved. I found no evidence of an OOM/performance risk, a save loop, or a UI-only inconsistency. Recovery is manual deletion or revision restore if the duplicate is noticed.

Strongest evidence for `medium`:

- The handoff manifest marks this runnable and likely real: seed `956512`, confidence `medium`, recommended action `file_bug`.
- On exact known-fixes SHA `f256024286dd80a4c0e2579f658c109256abf648`, a pass-175 scratch test using `baseBlocks` failed by ending with root client IDs `["group", "tail-paragraph", "<uuid>"]`: the stale moved paragraph was reinserted at root with a fresh client ID after duplicate-client-ID cleanup.
- The normal editor path in that known-fixes base passes `baseRecord`: `core-data/src/actions.js` calls `getSyncManager()?.update(..., { baseRecord: editedRecord })`, `packages/sync/src/manager.ts` forwards it, and `packages/core-data/src/utils/crdt.ts` passes `baseRecord.blocks` into `mergeCrdtBlocks()`.
- The final PR branch's low-level regression covers both the no-base helper route and the normal `baseBlocks` editor route. The `baseBlocks` variant fails on the exact known-fixes SHA and passes with the fix.
- The final PR branch's natural Playwright repro passes with the fix after selecting a paragraph, invoking `Group` from the block options menu, editing a second paragraph while stale/offline, reconnecting, and asserting one nested moved paragraph with no top-level duplicate.

Strongest evidence against `medium`:

- The original source artifact path from the prompt is missing locally, so the original run could not be re-read directly.
- The May 5 refreshed Playwright spec had no assertion; it only wrote JSON when `RTC_D465F26F6B79_RESULT_DIR` was set, so "2 passed" was not product evidence.
- The timing needs a live collaboration race or stale/offline tab; single-user editing cannot hit this.
- Browser drag-into-existing-Group attempts were brittle in Playwright and no-op'd before product assertions, so pass 175 switched to the natural toolbar Group action.

Shortest confidence-improving experiment: run the final Playwright repro once without commit 3 and require it to fail with a duplicate, then run with commit 3. The low-level regression already provides the pre-fix failure signal, but a browser-level before/after pair would remove the remaining UI-route gap.

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

Revised plan implemented in the PR branch:

- Add `baseRecord` plumbing from entity actions through the sync manager into `applyChangesToCRDTDoc()`.
- Cache previous local block snapshots for no-base callers.
- Reconcile stale local block values using `baseBlocks` when available, otherwise the previous local cache.
- Apply reconciliation before the existing structural merge.
- Keep local attribute changes that differ from the base while adopting current remote structure for unchanged fields.

## Verification

Exact known-fixes base check:

```bash
cd /tmp/d465-pass175-knownfix
npm run test:unit packages/core-data/src/utils/test/crdt-d465-pass175-base-record.test.ts -- --runInBand
```

Result on `f256024286dd80a4c0e2579f658c109256abf648`: failed one test and passed one test. The no-base route passed, while the `baseBlocks` route failed with an extra stale moved paragraph at root. This is the pass-175 evidence missing from pass 174.

Final PR branch checks:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-d465f26f6b79-pr
npm run test:unit packages/core-data/src/utils/test/crdt-d465-cross-scope-move.test.ts -- --runInBand
WP_ENV_PORT=9948 WP_BASE_URL=http://localhost:9948 WP_ENV_PHPMYADMIN_PORT=10048 RTC_MANIFEST_WS_START_PORT=20784 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-d465-cross-scope-move.spec.ts --project=chromium --workers=1
WP_ENV_PORT=9948 WP_BASE_URL=http://localhost:9948 WP_ENV_PHPMYADMIN_PORT=10048 RTC_MANIFEST_WS_START_PORT=20784 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-d465-cross-scope-move.spec.ts --project=chromium --workers=1 --trace on
```

Results: all focused final-branch tests passed. After pass 176 strengthened the unit regression, the unit run reports two passing cases: without `baseBlocks` and with `baseBlocks`. The run emitted the existing duplicate-Yjs import warning but passed. The trace-enabled Playwright run produced `test/e2e/artifacts/test-results/editor-collaboration-colla-1b505-agraph-grouped-into-a-Group-chromium/trace.zip`.

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
