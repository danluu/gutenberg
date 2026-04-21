# Real-Time Collaboration Rich-Text Bug Analysis

This report replaces the earlier version of this document.

The three initial helper-level false positives are documented separately in
[Real-Time Collaboration Rich-Text Initial False Positives](/docs/explanations/fuzzer-bugs/real-time-collaboration-rich-text-initial-false-positives.md).

The earlier report claimed two production rich-text corruption bugs in
`diffWithCursor()` itself. Deeper analysis showed those two cases were false
positives: they only failed when the cursor was supplied as an HTML index,
while the production block-editor selection API supplies a rich-text text
offset.

After re-checking the problem against the real production path, there is a
real production bug, but it is a different one:

- the block merge path passes a rich-text text offset directly into a diff API
  that operates on HTML string indices

That coordinate-space mismatch is enough to corrupt block rich-text content in
production.

## Summary

The confirmed bug is in the handoff between block-editor selections and
rich-text diffing:

- `WPBlockSelection.offset` is a rich-text offset that counts visible text
  positions, not HTML characters
- `mergeRichTextUpdate()` diffs HTML strings and passes the cursor to
  `Delta.diffWithCursor()`, which therefore interprets the cursor as an HTML
  index
- other RTC selection paths already know about this distinction and convert
  between the two spaces with `richTextOffsetToHtmlIndex()` and
  `htmlIndexToRichTextOffset()`
- the block merge path in `applyPostChangesToCRDTDoc()` does not do that
  conversion before calling `mergeCrdtBlocks()`

The result is that rich-text edits can be replayed with the cursor pointing at
the wrong place inside the HTML string. When the content contains formatting
tags, that wrong cursor can steer `diffWithCursor()` into emitting a corrupt
delta.

## What Was Re-Checked

The earlier report treated these as production bugs:

- `"<strong><strong>😀😀</strong></strong><br> <br>"` ->
  `"<strong>bold</strong><br>"` with cursor `21`
- `"<strong>é<strong>é</strong></strong>beta<br>"` ->
  `"<strong>bold</strong><br>"` with cursor `21`

Those cases do fail at the `diffWithCursor()` layer, but only with cursor `21`,
which is an HTML index. Under the actual block-editor contract, the selection
offset for the resulting `"<strong>bold</strong><br>"` state is a rich-text
offset such as `4` or `5`, not `21`. Re-running those cases with the
production-shaped cursor contract makes them pass.

So the earlier report was materially wrong in one important way:

- it treated "HTML index reaches a lower-level helper" as if that were the
  production contract

The real bug appears only after switching the analysis to the actual
production cursor contract.

## Confirmed Production Bug

### Bug

`applyPostChangesToCRDTDoc()` passes `changes.selection.selectionStart.offset`
straight into `mergeCrdtBlocks()`, and that value is ultimately passed to
`mergeRichTextUpdate()` and `Delta.diffWithCursor()` without converting it from
rich-text offset space into HTML index space.

### Why This Is Reachable In Production

This is not a fuzzer-only artifact.

The production code already distinguishes these two index spaces elsewhere:

- `packages/core-data/src/types.ts` defines `WPBlockSelection.offset` as the
  editor selection offset
- `packages/core-data/src/utils/crdt-user-selections.ts` converts that offset
  with `richTextOffsetToHtmlIndex()` before creating a `Y.RelativePosition`
- `packages/core-data/src/utils/block-selection-history.ts` does the same when
  saving selection history
- `packages/core-data/src/utils/crdt-selection.ts` converts back with
  `htmlIndexToRichTextOffset()` when restoring editor selections

But the write path for block content does this instead:

- `packages/core-data/src/utils/crdt.ts` reads
  `changes.selection?.selectionStart?.offset ?? null`
- it passes that raw number into `mergeCrdtBlocks()`
- `mergeCrdtBlocks()` forwards that number to every rich-text merge
- `mergeRichTextUpdate()` applies `diffWithCursor()` to HTML strings

So the corruption happens on the main RTC write path for formatted block
content.

This was re-checked against the real editor hook, not just helper calls:

- `useEntityBlockEditor().onInput()` produces `blocks + selection` updates
  with `RichTextData` values for paragraph content
- those updates are serialized to HTML strings before syncing
- once the CRDT document already has a `blocks` tree, the next formatted
  `onInput()` change reproduces the corruption through the actual
  `editEntityRecord()` -> `SyncManager.update()` -> `applyPostChangesToCRDTDoc()`
  path

One nuance matters here: if the CRDT document was initialized only from
`content.raw`, the first block edit can simply seed the `blocks` field instead
of diffing existing rich-text `Y.Text` content. The corruption appears once
`blocks` already exist in the CRDT document, which is the normal steady-state
after block syncing has started.

## Primary Reproduction

### Input

- old value: `"<em>italic</em><em>italic</em>"`
- new value: `"<em>italic</em>beta"`
- block-editor selection offset after the edit: `10`

Both HTML strings are stable Gutenberg rich-text values:

- `RichTextData.fromHTMLString(old).toHTMLString()` returns the same old value
- `RichTextData.fromHTMLString(new).toHTMLString()` returns the same new value

### What Production Does

The production block merge path passes `10` directly into the rich-text merge.

That reproduces all the way through `applyPostChangesToCRDTDoc()` and produces:

```text
<em>italic</em>bet>
```

That is content corruption, not just a different but equivalent serialization.
The closing `a` from `beta` is lost and the result ends with a stray `>`.

### Why This Proves The Root Cause

The same reproduction was checked six ways:

1. `mergeRichTextUpdate()` with cursor `10` corrupts the string.
2. `mergeCrdtBlocks()` with cursor `10` corrupts the block content.
3. `applyPostChangesToCRDTDoc()` with `selection.selectionStart.offset = 10`
   corrupts the stored `Y.Text`.
4. `SyncManager.update()` reproduces the same corruption after the next event
   loop tick.
5. `useEntityBlockEditor().onInput()` reproduces it end to end once `blocks`
   have been seeded into the CRDT document.
6. The exact same update succeeds when the cursor hint is removed (`null`).

Then the offset was converted with the same helper used by the other RTC
selection paths:

- `richTextOffsetToHtmlIndex("<em>italic</em><em>italic</em>", 10)` returns
  `14`

Passing `14` into `mergeRichTextUpdate()` produces the correct result:

```text
<em>italic</em>beta
```

That isolates the root cause to the coordinate-space mismatch. The same edit:

- fails with the production rich-text offset
- succeeds with the corresponding HTML index
- succeeds with no cursor hint at all

## Secondary Confirmation

The same bug class reproduces on a second corrected-model fuzz case:

- old value:
  `"<strong>é</strong>é<strong>é</strong><strong>é</strong>alphaalpha"`
- new value: `"<strong>é</strong><em>italic</em>"`
- block-editor selection offset after the edit: `8`
- actual production-path result:
  `"<strong>é</strong><em>italic</eha"`

Again:

- both values round-trip through `RichTextData` unchanged
- the corruption reproduces through `applyPostChangesToCRDTDoc()`
- the failure only appears when the rich-text offset is fed into the HTML diff

This matters because it shows the bug is not a single brittle string pair. It
is a bug class triggered by formatted content plus the wrong cursor space.

## What The Bug Is Not

The confirmed production bug is not:

- "any rich-text corruption in `diffWithCursor()` is production-reachable"
- "the two original cursor-21 repros are real as written"
- "the low-level cursor-moving heuristic is definitely wrong even when given a
  correct HTML index"

There may still be lower-level heuristic bugs in `diffWithCursor()` with valid
HTML-index cursors. This analysis does not prove or disprove that. What it does
prove is that production currently sends the helper the wrong kind of cursor,
and that alone is enough to corrupt real block content.

## How The Bug Was Introduced

The bug was introduced on January 14, 2026 by commit `30c040ca841`
("Real-time collaboration: Use alternative diff in quill-delta, provide
incremental text updates").

That change did two relevant things:

- it replaced the old full-string replacement behavior for rich-text updates
  with incremental cursor-guided diffs
- it added this block merge handoff in `packages/core-data/src/utils/crdt.ts`:
  `changes.selection?.selectionStart?.offset ?? null`

At that point, the merge path started passing a block-editor text offset into a
lower-level diff working on HTML strings.

Later, on March 17, 2026, commit `848188b4f12`
("RTC: Fix cursor index sync with rich text formatting") added
`richTextOffsetToHtmlIndex()` and `htmlIndexToRichTextOffset()` and used them
to fix awareness, cursor drawing, and selection history paths. That commit is
important evidence that the codebase already recognizes the two index spaces.

But the block merge path introduced in `30c040ca841` was not updated to use the
new conversion helpers, so the write path remained wrong.

## Proposed Fix Plan

1. Stop passing a bare `number | null` cursor through the block merge stack.
2. Replace it with a scoped cursor descriptor containing:
   - the selected `clientId`
   - the selected `attributeKey`
   - the editor-space rich-text offset
3. In the specific rich-text merge for that selected block attribute:
   - read the current HTML string from the matching `Y.Text`
   - convert the editor-space offset with `richTextOffsetToHtmlIndex()`
   - pass the converted HTML index to `mergeRichTextUpdate()`
4. Pass `null` for all other rich-text attributes.
5. Add regression coverage at three levels:
   - direct `mergeRichTextUpdate()` reproduction with converted and
     unconverted cursors
   - `mergeCrdtBlocks()` reproduction
   - `applyPostChangesToCRDTDoc()` reproduction
6. As a defensive backstop, add a verification guard after
   `diffWithCursor()`:
   - apply the candidate delta to the old value
   - if it does not exactly match the requested new value, fall back to plain
     diff or full replacement

## Fix Rationale

The important part of the fix is not just "convert one number before calling
`mergeRichTextUpdate()`". The existing API is too weak because a single raw
cursor number is passed through recursive block and attribute merges. That does
not identify which block or which rich-text attribute the cursor belongs to.

A scoped cursor object solves both problems:

- it preserves the correct coordinate space until the code reaches the exact
  `Y.Text` being edited
- it avoids accidentally reusing one block's cursor for unrelated rich-text
  fields encountered during the same merge

The verification guard is still worth adding because it prevents content
corruption even if another cursor-mapping edge case remains.

## Final Assessment

The earlier report's two "real bugs" were false positives caused by analyzing
HTML-index cursors instead of production rich-text offsets.

The real production bug is different and stronger:

- real block-editor selection offsets are passed unconverted into an HTML diff
- that path reproduces through `applyPostChangesToCRDTDoc()`
- the corruption disappears when the same offset is converted with
  `richTextOffsetToHtmlIndex()`
- a second corrected-model repro shows the same bug class

So the correct conclusion is:

- there is a real production RTC rich-text corruption bug
- the bug is a cursor coordinate-space mismatch on the block merge write path
- this document should be used instead of the earlier report
