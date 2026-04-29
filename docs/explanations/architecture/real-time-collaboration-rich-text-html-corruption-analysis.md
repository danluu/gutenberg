# Rich-Text Merge Corrupts Valid HTML Closing Tags

## Summary

The Issue 5 fuzzer failure is a real RTC rich-text corruption bug. A valid local
rich-text snapshot such as `ab<em>b</em><strong>it</strong>` can be merged into
the local Y.Doc as `ab<em>b</em><strong>it</stronm>`.

The observed failure is not caused by invalid source HTML. It is the same class
as [#77532](https://github.com/WordPress/gutenberg/issues/77532): the block
merge write path passes a block-editor rich-text text offset into
`Delta.diffWithCursor()`, which works over serialized HTML string indices. A
cursor in the wrong coordinate space can steer the diff into a closing tag and
produce internally valid Yjs text with invalid HTML.

## Status against known fixes

Checked tracking issue: [#77716](https://github.com/WordPress/gutenberg/issues/77716).
The relevant known fixes are:

- [#77658](https://github.com/WordPress/gutenberg/pull/77658), open, not merged:
  carries scoped rich-text cursor hints, converts editor offsets to HTML indices
  only for the matching rich-text field, and verifies cursor-guided deltas before
  applying them.
- [#77662](https://github.com/WordPress/gutenberg/pull/77662), open, not merged:
  adds tests for a related cursor-scope corruption case. It changes only test
  coverage and does not fix this offset-space Playwright repro.
- [#77669](https://github.com/WordPress/gutenberg/pull/77669), merged into
  `origin/trunk` at `5ddf4ad1b34`, fixes update-size accounting and is not a
  rich-text corruption fix.
- [#77666](https://github.com/WordPress/gutenberg/pull/77666),
  [#77673](https://github.com/WordPress/gutenberg/pull/77673),
  [#77675](https://github.com/WordPress/gutenberg/pull/77675),
  [#77678](https://github.com/WordPress/gutenberg/issues/77678), and
  [#77681](https://github.com/WordPress/gutenberg/pull/77681) cover other RTC
  failure modes and do not directly target this closing-tag corruption.

As of April 29, 2026, I do not know of an open or merged upstream PR that fixes
the normal-user Playwright repro. #77658 is the closest candidate, but it still
fails the natural repro locally at PR head `610e02e28b6`.

Local checks:

- Broken base: `danluu/try/fuzz` at `4c5412d8361`. Seed 2 fails with the exact
  closing-tag corruption.
- Known rich-text fix base:
  `/Users/danluu/dev/fuzz/gutenberg-fuzz-with-rich-text-offset-fix` at
  `58b6239cb57`, which contains `48058d67104` (`Fix RTC rich-text offset-space
  cursor handling`). Seed 2 passes.
- Scratch all-known-fixes runtime base:
  `/Users/danluu/dev/fuzz/gutenberg-try-fuzz` at `86b2df5cacc`. The same fuzz
  command fails because expected objects do not include new `__unstableSyncId`
  fields, but the diff no longer shows malformed rich-text closing tags. I treat
  that as blocked for the exact fuzzer oracle, not as evidence that Issue 5 still
  reproduces.

Updated conclusion after the local Playwright run: Issue 5 is not proven fixed
by #77658. The fuzzer seed passes on an earlier rich-text offset fix branch, but
the normal-user Playwright repro still fails on the current #77658 PR head when
the repro spec is copied into that worktree. The fix is still not merged into
`origin/trunk`, and the natural browser repro needs more investigation before
this issue should be marked fixed.

## Reproductions

### Fuzzer repro

Naturalness: package-level randomized editor operations over `mergeCrdtBlocks()`
and the RTC Yjs block representation. It does not use fault injection; it is not
a Playwright user flow, but it is the original Issue 5 signal.

Broken command, run from `/tmp/gutenberg-issue5-broken` at `4c5412d8361`:

```bash
GUTENBERG_FUZZ_SEED_COUNT=1 GUTENBERG_FUZZ_SEED_START=2 \
  npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts \
  --runInBand --testNamePattern="concurrent-block-tree-edits"
```

Result: failed. The reduced failure included:

```text
Expected second: ab<em>b</em><strong>it</strong>
Received second: ab<em>b</em><strong>it</stronm>
```

Known-fix command, run from
`/Users/danluu/dev/fuzz/gutenberg-fuzz-with-rich-text-offset-fix` at
`58b6239cb57`:

```bash
GUTENBERG_FUZZ_SEED_COUNT=1 GUTENBERG_FUZZ_SEED_START=2 \
  npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts \
  --runInBand --testNamePattern="concurrent-block-tree-edits"
```

Result: passed.

All-known-fixes scratch command, run from
`/Users/danluu/dev/fuzz/gutenberg-try-fuzz` at `86b2df5cacc`:

```bash
GUTENBERG_FUZZ_SEED_COUNT=1 GUTENBERG_FUZZ_SEED_START=2 \
  npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts \
  --runInBand --testNamePattern="concurrent-block-tree-edits"
```

Result: failed on `__unstableSyncId` metadata differences, not on malformed
rich-text HTML. The rich-text strings shown in the failure were valid.

### Focused unit/model repro

Naturalness: direct exercise of the first production-relevant rich-text merge
layer. It supplies the same kind of block-editor selection offset that the real
editor sends, not a made-up HTML index.

Command on the #77658 fix branch:

```bash
npm run test:unit -- packages/core-data/src/utils/test/rtc-rich-text-offset-space.test.js --runInBand
```

Result on `/Users/danluu/dev/fuzz/gutenberg-fuzz-with-rich-text-offset-fix`:
passed, 6 tests. Coverage includes `mergeCrdtBlocks()`,
`applyPostChangesToCRDTDoc()`, `SyncManager.update()`, and fuzzed formatted
rich-text updates.

Attempted broken-base run from the tests-only commit `70a64c95ea2` failed before
the repro assertions because that disposable worktree did not have matching
generated package artifacts and workspace dependencies (`framer-motion`, then
`packages/icons/src/library`). The same tests are documented as failing
pre-fix in [#77532](https://github.com/WordPress/gutenberg/issues/77532).

### Integration repro

Naturalness: exercises the real `useEntityBlockEditor().onInput()` data flow
with block content plus selection, then lets `editEntityRecord()` and the sync
manager apply the change to the CRDT document.

Command on the #77658 fix branch:

```bash
npm run test:unit -- packages/core-data/src/test/rtc-rich-text-offset-space.test.js --runInBand
```

Result on `/Users/danluu/dev/fuzz/gutenberg-fuzz-with-rich-text-offset-fix`:
passed, 1 test.

### Playwright repro with normal user actions

Naturalness: the valid top-level repro is the second test in
[`collaboration-rich-text-offset-space.spec.ts`](https://github.com/danluu/gutenberg/blob/try/offset-space-bug/test/e2e/specs/editor/collaboration/collaboration-rich-text-offset-space.spec.ts).
It creates a collaborative post, clicks the paragraph, presses `End`, presses
`Backspace`, selects four characters with `Shift+ArrowLeft`, and uses the Italic
shortcut. It only reads editor selection state for assertions.

Command from the `try/offset-space-bug` branch:

```bash
npm run build -- --skip-types
npm run wp-env-test -- start
WP_BASE_URL=http://localhost:8889 \
  npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-rich-text-offset-space.spec.ts \
  --project=chromium \
  --grep="user unitalicizes"
```

Expected on the broken implementation: author reaches
`italic<em>beta</em>beta`; collaborator receives corrupted
`italic<em>beta</em>/em>`.

Expected after a complete fix: both editors show
`italic<em>beta</em>beta`.

Local status update on April 29, 2026:

Broken/repro branch command, run from
`/tmp/gutenberg-rich-text-playwright-repro` at `f7b9f40c72f` with
`WP_ENV_PORT=8897`, `WP_BASE_URL=http://localhost:8897`, and forced video
recording:

```bash
WP_ENV_PORT=8897 \
WP_ARTIFACTS_PATH=/tmp/rtc-rich-text-playwright-artifacts-isolated \
WP_BASE_URL=http://localhost:8897 \
  npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-rich-text-offset-space.spec.ts \
  --project=chromium \
  --grep="user unitalicizes"
```

Result: failed at the intended assertion. The author reached
`italic<em>beta</em>beta`, but the collaborator received
`italic<em>beta</em>/em>`.

Local video:

```text
/tmp/rtc-rich-text-playwright-artifacts-isolated/test-results/editor-collaboration-colla-e3706-cizes-part-of-an-italic-run-chromium/video.webm
```

Current #77658 PR-head command, run from
`/tmp/gutenberg-rich-text-playwright-fix` at `610e02e28b6` with the same
normal-user repro spec copied in, `WP_ENV_PORT=8898`,
`WP_BASE_URL=http://localhost:8898`, and forced video recording:

```bash
WP_ENV_PORT=8898 \
WP_ARTIFACTS_PATH=/tmp/rtc-rich-text-playwright-artifacts-fix \
WP_BASE_URL=http://localhost:8898 \
  npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-rich-text-offset-space.spec.ts \
  --project=chromium \
  --grep="user unitalicizes"
```

Result: failed the same way. The collaborator received
`italic<em>beta</em>/em>` instead of `italic<em>beta</em>beta`.

PR-head local video:

```text
/tmp/rtc-rich-text-playwright-artifacts-fix/test-results/editor-collaboration-colla-e3706-cizes-part-of-an-italic-run-chromium/video.webm
```

Annotated side-by-side video with a running log:

```text
/tmp/rtc-rich-text-annotated-video/rtc-rich-text-annotated-repro.mp4
```

The annotated video was generated from a fresh natural Playwright run in
`/tmp/gutenberg-rich-text-annotated-video` at `f7b9f40c72f`. It shows the author
editor and collaborator editor at the same time, with cumulative log entries and
the block HTML read by Playwright. The final frame shows the author at
`italic<em>beta</em>beta` and the collaborator at
`italic<em>beta</em>/em>`.

Both local builds reported a primitive color token generation failure after
`build:js` and `build:php` completed. The Playwright tests still ran against the
isolated wp-env instances and reached the rich-text corruption assertion.

The first Playwright test in that file uses `editEntityRecord()` from
`page.evaluate()`. I do not count that as a valid handoff-level Playwright repro
because this handoff requires normal user actions.

## Failure mechanism

The failing path is:

1. The editor produces a `WPBlockSelection.offset` in rich-text text space.
2. `applyPostChangesToCRDTDoc()` forwards
   `changes.selection?.selectionStart?.offset ?? null`.
3. `mergeCrdtBlocks()` recursively passes that bare number to rich-text merges.
4. `mergeRichTextUpdate()` builds two HTML-string-backed Deltas and calls
   `Delta.diffWithCursor()`.
5. `Delta.diffWithCursor()` interprets the cursor as an index into the HTML
   string, not as a visible rich-text text offset.
6. In formatted content, the wrong cursor can land inside markup such as
   `</strong>`, so the cursor-guided diff emits a delta that produces malformed
   HTML while still being a valid Yjs text operation.

#77658 fixes both parts of the contract violation: it keeps the cursor scoped to
the selected block and attribute, and converts the rich-text offset to the HTML
index only when merging that exact field. Its verification guard also prevents a
bad cursor-guided delta from being applied if the candidate result does not equal
the requested updated HTML.

## How this was introduced

The direct introduction point is
[PR #73699](https://github.com/WordPress/gutenberg/pull/73699), commit
`30c040ca841` (`Real-time collaboration: Use alternative diff in quill-delta,
provide incremental text updates`) on January 14, 2026. That change replaced
coarse rich-text replacement with cursor-guided incremental diffs and introduced
the block merge handoff that forwarded a bare selection offset.

[PR #76418](https://github.com/WordPress/gutenberg/pull/76418), commit
`848188b4f12` (`RTC: Fix cursor index sync with rich text formatting`) on
March 17, 2026, is relevant because it added the rich-text/HTML offset
conversion helpers used by other RTC selection paths. It did not update the
block merge write path.

[PR #76913](https://github.com/WordPress/gutenberg/pull/76913), commit
`09a21c64b5b` (`RTC: Fix core/table cell merging`) on April 2, 2026, later
extended the same cursor plumbing into schema-aware nested object and array
merges. That widened the area where a bare cursor could be misapplied, including
nested rich-text fields, but the top-level corruption bug already existed after
#73699.

## Initial fix plan

1. Treat #77658 as an incomplete candidate until the normal-user Playwright repro
   passes on the PR branch.
2. Keep cursor information as a scoped descriptor:
   `clientId`, `attributeKey`, and editor-space rich-text offset.
3. Convert with `richTextOffsetToHtmlIndex()` only when the merge reaches the
   matching block client ID and rich-text attribute.
4. Pass `null` to unrelated rich-text merges.
5. Keep the candidate-delta verification guard so malformed cursor hints fall
   back to a normal diff instead of corrupting shared content.
6. Keep #77662 or equivalent regression coverage for the cursor-scope variant.
7. Update the fuzz oracle to tolerate expected `__unstableSyncId` metadata, then
   rerun Issue 5 representative seeds against the combined known-fixes branch.

## Fix plan audit

### Linus Torvalds lens

The invariant should be simple: a cursor offset must never be passed across an
API boundary without its coordinate space and target field. A bare `number` is
the wrong data structure. The fix should remove that bad API shape rather than
adding special cases for `strong`, `em`, or particular fuzzer strings.

The delta verification guard is good as a postcondition, but it must not become
the primary correctness model. The primary fix is preserving and converting the
right cursor.

### Kyle Kingsbury / Jepsen lens

The important history property is operation preservation: a local edit should
converge to the exact editor-produced HTML string, and a remote peer should not
observe an acknowledged local rich-text edit as a different malformed value.
Convergence to the same corrupted string is still data loss.

Tests should check both the local post-merge value and collaborator-observed
value. They should include the history where the CRDT `blocks` tree is already
seeded, because first-edit initialization can otherwise mask the merge path.

### Dan Luu lens

The production risk is not one seed. It is any interleaving where formatted
content and a stale or wrongly scoped cursor meet the recursive block merge
machinery. Debuggability improves if the merge code preserves cursor scope and
if failed delta verification can be counted or logged in development builds.

The Playwright test must use real editor interactions. Browser tests that call
`editEntityRecord()` are useful probes, but they do not prove user reachability.
The normal-user `End`/`Backspace`/selection/Italic repro is the one to keep for
handoff proof.

## Revised fix plan

1. Do not land #77658 as the full Issue 5 fix until the normal-user Playwright
   repro passes on the PR branch.
2. Keep the merge API typed so call sites cannot pass an unscoped cursor number
   except through a clearly legacy/internal compatibility path.
3. Preserve the exact-result delta verification guard, but treat guard fallback
   events as signals to add tests rather than as normal behavior.
4. Merge #77662's cursor-scope regression tests or fold equivalent tests into
   #77658 before landing.
5. Add a small natural Playwright suite that covers the user-action offset-space
   repro and one cursor-scope repro, while avoiding direct store mutation for the
   reproduction action.
6. Fix the fuzz expected-state normalization for `__unstableSyncId`, then rerun
   seeds `2`, `3`, `8`, `17`, `18`, `25`, `30`, and `35` on the combined
   known-fixes branch.
7. After merge, rerun the Issue 5 fuzzer command on `origin/trunk`; do not mark
   this issue closed until the natural Playwright repro passes on the fix and
   fails on a pre-fix tests-only base.

## Open questions

- Should the delta verification fallback produce a development-only warning or
  metric so future cursor-space bugs are visible before fuzzing finds them?
- Should `mergeRichTextUpdate()` reject cursor hints that are known editor-space
  objects, forcing callers to resolve scope and coordinate conversion earlier?
- Should the Issue 5 fuzzer canonicalizer strip internal sync IDs, or should
  `__unstableSyncId` be made explicit in expected outputs for query arrays and
  nested objects?
