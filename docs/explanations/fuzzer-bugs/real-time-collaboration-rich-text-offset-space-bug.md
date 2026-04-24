# Real-Time Collaboration Rich-Text Offset-Space Bug

## Summary

The block merge write path passes a block-editor rich-text text offset directly
into a diff API that operates on HTML string indices.

That coordinate-space mismatch corrupts formatted rich-text content during
real-time collaboration.

## Root Cause

The relevant cursor and text APIs use two different coordinate spaces:

-   `WPBlockSelection.offset` counts visible rich-text positions.
-   `mergeRichTextUpdate()` applies `diffWithCursor()` to the HTML string.
-   the RTC block merge path forwards the rich-text offset directly, without
    converting it to an HTML index first.

So the browser can feed valid editor selections into a lower-level API that
interprets them in the wrong coordinate space.

## Production Path

The production write path is:

1. `useEntityBlockEditor().onInput()` or `onChange()`
2. `editEntityRecord()`
3. `SyncManager.update()`
4. `applyPostChangesToCRDTDoc()`
5. `mergeCrdtBlocks()`
6. `mergeRichTextUpdate()`
7. `Delta.diffWithCursor()`

The bug is introduced in step 4:

-   `applyPostChangesToCRDTDoc()` reads
    `changes.selection?.selectionStart?.offset ?? null`.
-   that raw number is passed to `mergeCrdtBlocks()`.
-   it eventually reaches `mergeRichTextUpdate()` as if it were an HTML index.

Other RTC selection paths already know this conversion is needed:

-   `crdt-user-selections.ts` uses `richTextOffsetToHtmlIndex()`.
-   `block-selection-history.ts` uses `richTextOffsetToHtmlIndex()`.
-   `crdt-selection.ts` uses `htmlIndexToRichTextOffset()` on the read path.

## Reproduction

Primary reproduction:

-   old value: `"<em>italic</em><em>italic</em>"`
-   new value: `"<em>italic</em>beta"`
-   block-editor selection offset: `10`

Without the fix, the production path corrupts the content to:

```text
<em>italic</em>bet>
```

That is not a benign serialization change. The closing `a` from `beta` is
lost, and the stored HTML ends with a stray `>`.

Real browser/user-action reproduction:

-   start value: `"italic<em>betabetax</em>"`
-   user presses `End`, then `Backspace`
-   both collaborators now have old value: `"italic<em>betabeta</em>"`
-   user presses `End`, then `Shift+ArrowLeft` four times to select the second
    `beta`
-   user presses the Italic keyboard shortcut to unitalicize the selected text
-   local editor value: `"italic<em>beta</em>beta"`

Without the fix, the collaborator receives:

```text
italic<em>beta</em>/em>
```

The Playwright collaboration repro drives this with browser click and keyboard
events. It only reads editor selection state for assertions; it does not use
`editEntityRecord()` or another store dispatch for the repro mutation.

Independent confirmation:

-   old value:
    `"<strong>é</strong>é<strong>é</strong><strong>é</strong>alphaalpha"`
-   new value: `"<strong>é</strong><em>italic</em>"`
-   block-editor selection offset: `8`

Without the fix, that path corrupts to:

```text
<strong>é</strong><em>italic</eha
```

## Evidence That It Is A Real Production Bug

The bug reproduces at multiple levels of the real production stack:

-   [`mergeCrdtBlocks()` repro](https://github.com/danluu/gutenberg/blob/try/offset-space-bug/packages/core-data/src/utils/test/rtc-rich-text-offset-space.test.js)
-   [`applyPostChangesToCRDTDoc()` repro](https://github.com/danluu/gutenberg/blob/try/offset-space-bug/packages/core-data/src/utils/test/rtc-rich-text-offset-space.test.js)
-   [`SyncManager.update()` repro](https://github.com/danluu/gutenberg/blob/try/offset-space-bug/packages/core-data/src/utils/test/rtc-rich-text-offset-space.test.js)
-   [`useEntityBlockEditor().onInput()` repro](https://github.com/danluu/gutenberg/blob/try/offset-space-bug/packages/core-data/src/test/rtc-rich-text-offset-space.test.js)
-   [Playwright collaboration repro in a real browser](https://github.com/danluu/gutenberg/blob/try/offset-space-bug/test/e2e/specs/editor/collaboration/collaboration-rich-text-offset-space.spec.ts)

The bug also has strong controls:

-   the same update succeeds when no cursor hint is passed
-   the same update succeeds when the rich-text offset is converted with
    `richTextOffsetToHtmlIndex()`
-   the same update succeeds on plain text where text offsets and HTML indices
    are identical

Taken together, that shows the corruption is caused by the offset-space
mismatch itself, not by malformed content or by a browserless-only test path.

## Re-Running The Repros

Run these commands from the repo root with Node 20 active.

[`mergeCrdtBlocks()` repro](https://github.com/danluu/gutenberg/blob/try/offset-space-bug/packages/core-data/src/utils/test/rtc-rich-text-offset-space.test.js)

```bash
npm run test:unit -- --runInBand \
  packages/core-data/src/utils/test/rtc-rich-text-offset-space.test.js \
  --testNamePattern="mergeCrdtBlocks"
```

[`applyPostChangesToCRDTDoc()` repro](https://github.com/danluu/gutenberg/blob/try/offset-space-bug/packages/core-data/src/utils/test/rtc-rich-text-offset-space.test.js)

```bash
npm run test:unit -- --runInBand \
  packages/core-data/src/utils/test/rtc-rich-text-offset-space.test.js \
  --testNamePattern="applyPostChangesToCRDTDoc"
```

[`SyncManager.update()` repro](https://github.com/danluu/gutenberg/blob/try/offset-space-bug/packages/core-data/src/utils/test/rtc-rich-text-offset-space.test.js)

```bash
npm run test:unit -- --runInBand \
  packages/core-data/src/utils/test/rtc-rich-text-offset-space.test.js \
  --testNamePattern="SyncManager.update"
```

[`useEntityBlockEditor().onInput()` repro](https://github.com/danluu/gutenberg/blob/try/offset-space-bug/packages/core-data/src/test/rtc-rich-text-offset-space.test.js)

```bash
npm run test:unit -- --runInBand \
  packages/core-data/src/test/rtc-rich-text-offset-space.test.js
```

[Playwright collaboration repro in a real browser](https://github.com/danluu/gutenberg/blob/try/offset-space-bug/test/e2e/specs/editor/collaboration/collaboration-rich-text-offset-space.spec.ts)

The browser repro uses built plugin assets, so rebuild before running it.

```bash
npm run build -- --skip-types
npm run wp-env-test -- start
WP_BASE_URL=http://localhost:8889 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-rich-text-offset-space.spec.ts
```

## How The Bug Was Introduced

The bug was introduced on January 14, 2026 by commit `30c040ca841`
("Real-time collaboration: Use alternative diff in quill-delta, provide
incremental text updates") from
[PR #73699](https://github.com/WordPress/gutenberg/pull/73699).

That change:

-   replaced full-string replacement with cursor-guided incremental rich-text
    diffs
-   added the block merge handoff that forwards
    `changes.selection?.selectionStart?.offset ?? null`

Later, on March 17, 2026, commit `848188b4f12`
("RTC: Fix cursor index sync with rich text formatting") from
[PR #76418](https://github.com/WordPress/gutenberg/pull/76418) added the
conversion helpers used elsewhere in RTC, but the block merge write path was
not updated to use them.

## Proposed Fix Plan

The proposed implementation is in
[PR #77658](https://github.com/WordPress/gutenberg/pull/77658).

1. Stop treating the block merge cursor as a bare number in the production
   path.
2. Carry the selected `clientId`, selected `attributeKey`, and editor-space
   rich-text offset through block merging.
3. Convert the offset with `richTextOffsetToHtmlIndex()` only when merging the
   exact rich-text field that corresponds to the selected block attribute.
4. Pass `null` for unrelated rich-text fields.
5. Add repro tests for the bug from the first production-relevant merge layer
   through a real Playwright collaboration test.
6. Add a defensive verification guard after `diffWithCursor()` so a bad cursor
   hint cannot silently corrupt stored content.

## Fix Rationale

The minimal conversion fix would be to rewrite one number right before calling
`mergeRichTextUpdate()`. The stronger fix is to keep the cursor scoped until
the exact rich-text merge that needs it.

That approach:

-   fixes the offset-space mismatch
-   avoids over-applying a cursor hint to unrelated rich-text fields
-   gives the merge layer enough context to stay correct as richer block
    schemas are added

### Why Verify The Cursor-Guided Delta?

`isDeltaVerificationMatch()` is a defensive guard around `diffWithCursor()`.
The main fix is still the cursor conversion and scoping above; the verification
guard exists because `diffWithCursor()` is a heuristic adjustment on top of a
string diff. If the cursor hint is wrong, stale, out of range, or in the wrong
coordinate space, the generated delta can be internally valid but apply to the
wrong serialized HTML position.

That is exactly the failure mode in this bug: the old code passed a rich-text
text offset into a diff that operates on serialized HTML string indices. In the
known repro, the bad cursor-guided delta mutates the Y.Text to the wrong value.
The guard checks the candidate delta on a temporary Y.Text before applying it to
the real shared text. If the candidate does not produce the exact expected
updated HTML string, the code falls back to a regular `diff()` without cursor
placement. That fallback may lose some cursor-intent precision for that one
update, but it preserves content correctness and avoids silently storing corrupt
HTML.

The helper could be replaced, but only by an equivalent postcondition check:
compute the candidate cursor-guided delta, apply it to an isolated copy of the
current string/Y.Text, and require the result to equal the expected updated
HTML before applying it to the shared Y.Text. The replacement does not need to
be a separate function named `isDeltaVerificationMatch()`, but removing the
post-apply verification entirely would remove the defense-in-depth behavior and
would reintroduce the class of bug where a malformed cursor hint can corrupt
stored content.

## Branch Structure

This branch is intended to keep the bug report separate from the fix:

-   one commit for repro tests and documentation
-   one later commit for the implementation change

The final branch should pass the targeted unit and Playwright coverage with the
fix applied.
