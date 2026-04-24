# Real-Time Collaboration Rich-Text Offset-Space Bug

## Summary

The block merge write path passes a block-editor rich-text text offset directly
into a diff API that operates on HTML string indices.

That coordinate-space mismatch corrupts formatted rich-text content during
real-time collaboration.

## Why This Is The Real Bug

Earlier fuzzing found lower-level `diffWithCursor()` failures using HTML
indices such as `21`. Those were not production proofs, because the block
editor selection API provides rich-text text offsets, not HTML string indices.

The real production bug is different:

-   `WPBlockSelection.offset` counts visible rich-text positions
-   `mergeRichTextUpdate()` applies `diffWithCursor()` to the HTML string
-   the RTC block merge path forwards the rich-text offset directly, without
    converting it to an HTML index first

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
    `changes.selection?.selectionStart?.offset ?? null`
-   that raw number is passed to `mergeCrdtBlocks()`
-   it eventually reaches `mergeRichTextUpdate()` as if it were an HTML index

Other RTC selection paths already know this conversion is needed:

-   `crdt-user-selections.ts` uses `richTextOffsetToHtmlIndex()`
-   `block-selection-history.ts` uses `richTextOffsetToHtmlIndex()`
-   `crdt-selection.ts` uses `htmlIndexToRichTextOffset()` on the read path

That is important negative evidence against the bug being an oracle mistake:
the codebase already distinguishes the two coordinate spaces in adjacent RTC
logic, just not on this write path.

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

-   `mergeCrdtBlocks()`
-   `applyPostChangesToCRDTDoc()`
-   `SyncManager.update()`
-   `useEntityBlockEditor().onInput()` with the real `editEntityRecord()` path
-   a Playwright collaboration test running in a real browser

The bug also has strong negative controls:

-   the same update succeeds when no cursor hint is passed
-   the same update succeeds when the rich-text offset is converted with
    `richTextOffsetToHtmlIndex()`
-   the lower-level `cursor=21` HTML-index repros disappear when run with the
    actual production cursor contract

Taken together, that rules out the main false-positive explanations:

-   this is not just invalid HTML that Gutenberg normalizes away
-   this is not just a helper misuse that production never performs
-   this is not just a browserless test artifact

## Evidence That Needed To Be Ruled Out

These earlier findings did not count as production proof:

-   raw `diffWithCursor()` failures driven by HTML indices instead of editor
    offsets
-   tests that treated paragraph `content` as a plain string attribute instead
    of a `rich-text` attribute

Both of those can produce failures or non-failures that do not reflect the
actual RTC write path.

## How The Bug Was Introduced

The bug was introduced on January 14, 2026 by commit `30c040ca841`
("Real-time collaboration: Use alternative diff in quill-delta, provide
incremental text updates").

That change:

-   replaced full-string replacement with cursor-guided incremental rich-text
    diffs
-   added the block merge handoff that forwards
    `changes.selection?.selectionStart?.offset ?? null`

Later, on March 17, 2026, commit `848188b4f12`
("RTC: Fix cursor index sync with rich text formatting") added the conversion
helpers used elsewhere in RTC, but the block merge write path was not updated
to use them.

## Proposed Fix Plan

1. Stop treating the block merge cursor as a bare number in the production
   path.
2. Carry the selected `clientId`, selected `attributeKey`, and editor-space
   rich-text offset through block merging.
3. Convert the offset with `richTextOffsetToHtmlIndex()` only when merging the
   exact `Y.Text` that corresponds to the selected field.
4. Pass `null` for all unrelated rich-text fields.
5. Add repro tests for the bug from the lowest helper-level merge path through
   Playwright browser sync.
6. Add a defensive verification guard after `diffWithCursor()` so a bad cursor
   hint cannot silently corrupt stored content.

## Fix Rationale

The minimal conversion fix would be to rewrite one number right before calling
`mergeRichTextUpdate()`. The stronger fix is to keep the cursor scoped until
the exact `Y.Text` merge that needs it.

That approach:

-   fixes the offset-space mismatch
-   avoids over-applying a cursor hint to unrelated rich-text fields
-   gives the merge layer enough context to stay correct as richer block
    schemas are added

## Branch Structure

This branch is intended to keep the bug report separate from the fix:

-   one commit for repro tests and documentation
-   one later commit for the implementation change

The final branch should pass the targeted unit and Playwright coverage with the
fix applied.
