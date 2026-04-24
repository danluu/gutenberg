# Real-Time Collaboration Rich-Text Cursor-Scope Bug

## Summary

The RTC block-merge write path throws away rich-text field scope and keeps only
one bare cursor offset. If a block update changes a rich-text field that is not
the selected field, RTC can reuse the selected field's cursor while diffing the
wrong rich-text value.

The confirmed high-level repro uses the bundled `core/file` block:

1. Put the caret inside the File block's `Download` button text.
2. Toggle the normal File block setting `Open in new tab`.
3. Replace the file through `Replace -> Open Media Library`.

The author sees the new file name correctly as `manual`, but the collaborator
sees the corrupted file name `manuaa`.

This is a real user-visible RTC bug in a bundled core block. It is not just a
synthetic custom-block platform issue.

## Root Cause

`WPBlockSelection` preserves field scope:

-   the selection carries `clientId`
-   the selection carries `attributeKey`
-   the selection carries the offset within that selected field

For the `core/file` repro, the selected field is `downloadButtonText` and the
selection offset is `2`.

The RTC write path collapses that scoped selection to just a number before
block merging:

-   `applyPostChangesToCRDTDoc()` reads
    `changes.selection?.selectionStart?.offset ?? null`
-   `mergeCrdtBlocks()` receives only that bare number
-   that same number is reused for rich-text merges elsewhere in the block

When the later File block replacement changes `fileName` from `gamma` to
`manual`, the merge code still has the old `downloadButtonText` cursor offset.
It no longer knows that the cursor belongs to `downloadButtonText`, so it uses
that offset while diffing `fileName`. That corrupts the collaborator's
`fileName` to `manuaa`.

The selected field in the repro is plain text, so offset `2` is already a valid
HTML index for `downloadButtonText`. The failure is not the offset-space bug.
The corruption occurs because a cursor from one field is reused for another
field.

## Confirmed User Repro

The confirmed bundled-core browser repro is committed here:

-   [`core/file` Playwright repro](https://github.com/danluu/gutenberg/blob/try/rtc-cursor-scope/test/e2e/specs/editor/collaboration/collaboration-rich-text-cursor-scope.spec.ts)

The user-visible sequence is:

1. Start a collaborative session with a post containing a File block whose file
   name is `gamma` and whose button text is `Download`.
2. In the author editor, click inside the visible `Download` button text.
3. Move the caret to offset `2` inside `Download`.
4. In the File block sidebar, enable `Open in new tab`.
5. Use the File block toolbar: `Replace -> Open Media Library`.
6. Select a different existing file named `manual`.

Expected result on both editors:

```text
manual
```

Actual result:

```text
author:       manual
collaborator: manuaa
```

The Playwright test also saves the draft after the visible corruption and
checks that the collaborator remains corrupted in that same live session.

## Why The Intermediate Update Matters

The one-step file replacement path did not reliably reproduce the bug by
itself. The confirmed repro needs the extra user action while the caret remains
inside `downloadButtonText`.

That extra action is not synthetic. It is a normal File block control:

```text
Open in new tab
```

Clicking it updates the block's `textLinkTarget` while the editor selection is
still scoped to `downloadButtonText` at offset `2`. The following file
replacement changes the other rich-text field, `fileName`, while that stale
bare offset is still available to RTC. Because RTC has already dropped
`attributeKey`, it cannot tell that the cursor does not belong to `fileName`.

## Pre-Fix Production Path

The confirmed browser path is:

1. A real `core/file` block is edited in the browser.
2. The selection is inside `downloadButtonText`.
3. Toggling `Open in new tab` sends a block update while preserving that
   selection.
4. Replacing the file sends another block update that changes `fileName`.
5. `editEntityRecord()` forwards `blocks` plus `selection`.
6. `SyncManager.update()` applies the change to the live Yjs document.
7. `applyPostChangesToCRDTDoc()` drops `attributeKey` and keeps only `offset`.
8. `mergeCrdtBlocks()` reuses that offset while merging `fileName`.
9. The collaborator renders corrupted `fileName` content.

## Evidence And Regression Coverage

The regression tests cover multiple levels of the production write path. On the
pre-fix implementation, these tests reproduce the corruption; with the scoped
cursor fix, they pass:

-   [`mergeCrdtBlocks()` regression](https://github.com/danluu/gutenberg/blob/try/rtc-cursor-scope/packages/core-data/src/utils/test/rtc-rich-text-cursor-scope.test.js#L183)
-   [`applyPostChangesToCRDTDoc()` regression](https://github.com/danluu/gutenberg/blob/try/rtc-cursor-scope/packages/core-data/src/utils/test/rtc-rich-text-cursor-scope.test.js#L213)
-   [`SyncManager.update()` regression](https://github.com/danluu/gutenberg/blob/try/rtc-cursor-scope/packages/core-data/src/utils/test/rtc-rich-text-cursor-scope.test.js#L222)
-   [custom-block Playwright regression with programmatic insertion](https://github.com/danluu/gutenberg/blob/try/rtc-cursor-scope/test/e2e/specs/editor/collaboration/collaboration-rich-text-cursor-scope.spec.ts#L249)
-   [custom-block Playwright regression with the real inserter and typing interactions](https://github.com/danluu/gutenberg/blob/try/rtc-cursor-scope/test/e2e/specs/editor/collaboration/collaboration-rich-text-cursor-scope.spec.ts#L291)
-   [`core/file` Playwright regression with real browser UI interactions](https://github.com/danluu/gutenberg/blob/try/rtc-cursor-scope/test/e2e/specs/editor/collaboration/collaboration-rich-text-cursor-scope.spec.ts#L319)

The lower-level tests use a two-rich-text block to isolate the cursor-scope
failure and include negative controls:

-   the same sequence stays correct when merged with `null` cursor hints
-   the same non-selected-field values stay correct when applied without
    cross-field cursor reuse
-   the selected field is plain text, so the selected cursor offsets are not in
    the wrong coordinate space

Those controls are also linked directly:

-   [`null` cursor control](https://github.com/danluu/gutenberg/blob/try/rtc-cursor-scope/packages/core-data/src/utils/test/rtc-rich-text-cursor-scope.test.js#L193)
-   [second-field-only control](https://github.com/danluu/gutenberg/blob/try/rtc-cursor-scope/packages/core-data/src/utils/test/rtc-rich-text-cursor-scope.test.js#L203)

The browser repro then confirms the same class of bug in a bundled core block
with normal user interactions. The author and collaborator diverge only after
the RTC merge path runs.

## Re-Running The Repros

Run these commands from the repo root with Node 20 active.

[`mergeCrdtBlocks()` regression](https://github.com/danluu/gutenberg/blob/try/rtc-cursor-scope/packages/core-data/src/utils/test/rtc-rich-text-cursor-scope.test.js#L183)

```bash
npm run test:unit -- --runInBand \
  packages/core-data/src/utils/test/rtc-rich-text-cursor-scope.test.js \
  --testNamePattern="mergeCrdtBlocks"
```

[`applyPostChangesToCRDTDoc()` regression](https://github.com/danluu/gutenberg/blob/try/rtc-cursor-scope/packages/core-data/src/utils/test/rtc-rich-text-cursor-scope.test.js#L213)

```bash
npm run test:unit -- --runInBand \
  packages/core-data/src/utils/test/rtc-rich-text-cursor-scope.test.js \
  --testNamePattern="applyPostChangesToCRDTDoc"
```

[`SyncManager.update()` regression](https://github.com/danluu/gutenberg/blob/try/rtc-cursor-scope/packages/core-data/src/utils/test/rtc-rich-text-cursor-scope.test.js#L222)

```bash
npm run test:unit -- --runInBand \
  packages/core-data/src/utils/test/rtc-rich-text-cursor-scope.test.js \
  --testNamePattern="SyncManager.update"
```

[custom-block browser regression with programmatic insertion](https://github.com/danluu/gutenberg/blob/try/rtc-cursor-scope/test/e2e/specs/editor/collaboration/collaboration-rich-text-cursor-scope.spec.ts#L249)

```bash
npm run wp-env-test start
WP_BASE_URL=http://localhost:8889 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-rich-text-cursor-scope.spec.ts \
  --project=chromium \
  --grep="keeps collaborator rich text correct$"
```

[custom-block browser regression with the real inserter and typing interactions](https://github.com/danluu/gutenberg/blob/try/rtc-cursor-scope/test/e2e/specs/editor/collaboration/collaboration-rich-text-cursor-scope.spec.ts#L291)

```bash
npm run wp-env-test start
WP_BASE_URL=http://localhost:8889 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-rich-text-cursor-scope.spec.ts \
  --project=chromium \
  --grep="real inserter and typing interactions"
```

[`core/file` browser regression with real browser UI interactions](https://github.com/danluu/gutenberg/blob/try/rtc-cursor-scope/test/e2e/specs/editor/collaboration/collaboration-rich-text-cursor-scope.spec.ts#L319)

```bash
npm run wp-env-test start
WP_BASE_URL=http://localhost:8889 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-rich-text-cursor-scope.spec.ts \
  --project=chromium \
  --grep="core/file"
```

The full committed cursor-scope test suite is:

```bash
npm run test:unit -- --runInBand \
  packages/core-data/src/utils/test/rtc-rich-text-cursor-scope.test.js

WP_BASE_URL=http://localhost:8889 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-rich-text-cursor-scope.spec.ts \
  --project=chromium
```

## How The Bug Was Introduced

The current top-level-field bug was introduced on January 14, 2026 by commit
`30c040ca841` ("Real-time collaboration: Use alternative diff in quill-delta,
provide incremental text updates").

That change:

-   started forwarding `changes.selection?.selectionStart?.offset ?? null`
    into `mergeCrdtBlocks()`
-   reduced the block merge cursor to a bare number
-   removed the selected field scope before rich-text merging happened

Later, on April 2, 2026, commit `09a21c64b5b`
("RTC: Fix core/table cell merging") generalized the same cursor plumbing into
schema-aware array and object merges. That did not create the top-level
`core/file` bug shown here, but it widened the same scope-loss problem to
nested rich-text structures.

## Impact Bounds

What is currently proven:

-   a bundled core block can hit the bug
-   the trigger uses normal browser UI interactions
-   the bug is visible to a collaborator in a live browser session
-   the visible corruption survives `saveDraft()` in that same session
-   lower-level controls isolate the cause to cross-field cursor reuse

What is not currently proven:

-   the visible `core/file` corruption survives a fresh reload
-   the saved canonical post content is permanently corrupted across sessions

That narrows severity, but it does not make the bug a false positive. The bug
causes real in-session collaborator-visible corruption.

## Proposed Fix Plan

1. Stop treating the block merge cursor as `number | null`.
2. Thread a scoped cursor object through the write path, carrying at least:
    - selected `clientId`
    - selected `attributeKey`
    - selected rich-text offset
3. In `applyPostChangesToCRDTDoc()`, pass that scoped selection object into
   `mergeCrdtBlocks()` instead of immediately collapsing it to a bare number.
4. In `mergeCrdtBlocks()` and lower merge helpers, apply the cursor only when
   merging the selected field.
5. Pass `null` for all unrelated rich-text fields instead of reusing the
   selected field's cursor.
6. Keep the offset-space fix discipline:
    - convert rich-text offsets to HTML indices only at the exact field that
      is actually selected
7. Add a defensive verification guard after `diffWithCursor()` so a bad cursor
   hint cannot silently corrupt stored rich text.

## Fix Rationale

The bug is caused by missing scope, not by a failure of delta diffing on the
selected field itself.

Using a scoped cursor preserves the editor's selection contract all the way to
the rich-text value being merged. It also gives unrelated fields the safer
behavior they already have with `null` cursor hints, which the negative
controls show avoids this corruption.
