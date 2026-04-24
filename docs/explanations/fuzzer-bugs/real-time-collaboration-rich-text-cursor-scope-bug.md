# Real-Time Collaboration Rich-Text Cursor-Scope Bug

## Summary

The block merge write path throws away `clientId` and `attributeKey`, then
reuses one selected field's cursor for every changed rich-text field in the
same block merge.

That can corrupt a different rich-text field even when the selected field's
cursor is otherwise valid.

## Bug

`applyPostChangesToCRDTDoc()` reduces the current selection to a bare
`number | null` cursor. `mergeCrdtBlocks()` then forwards that number through
the entire block merge, and `mergeYValue()` passes it to every changed
rich-text attribute it encounters.

The cursor therefore loses field scope:

-   which block it belongs to
-   which rich-text attribute it belongs to

## Why It Is Distinct From The Offset-Space Bug

The minimized pullquote reproduction uses a selected field with plain text
only:

-   old `value`: `"alpha"`
-   new `value`: `"beta"`
-   selection offset in `value`: `2`

For that selected field, the block-editor offset `2` is already the correct
HTML index `2`, because there are no formatting tags in `value`.

The corruption happens only because the same cursor is then reused for a
different field:

-   old `citation`: `"gamma"`
-   new `citation`: `"<em>italic</em>"`

So this reproduction does not depend on the offset-space bug.

## Evidence

The minimized reproduction is:

-   old block:
    `value = "alpha"`, `citation = "gamma"`
-   new block:
    `value = "beta"`, `citation = "<em>italic</em>"`
-   selection:
    `clientId = "pullquote-1"`, `attributeKey = "value"`, `offset = 2`

Observed results:

```text
mergeCrdtBlocks(cursor=2)           -> citation "<em>italic</ema"
mergeCrdtBlocks(null)               -> citation "<em>italic</em>"
applyPostChangesToCRDTDoc(offset=2) -> citation "<em>italic</ema"
applyPostChangesToCRDTDoc(null)     -> citation "<em>italic</em>"
SyncManager.update(offset=2)        -> citation "<em>italic</ema"
```

The important controls are:

-   the same block update succeeds with `null`
-   the selected field is plain text, so `2` is already the right cursor for
    `value`
-   only the other field (`citation`) corrupts

That isolates the failure to cursor scoping rather than cursor coordinate
conversion.

## Why It Is Expected To Be Reachable

The editor selection model already carries the scope needed to avoid this bug:

-   `WPBlockSelection` includes `clientId`, `attributeKey`, and `offset`
-   `use-block-sync` batches `blocks + selection` together
-   `useEntityBlockEditor().onInput()` and `editEntityRecord()` preserve that
    selection object as the transient RTC edit payload

But the merge write path throws away that scope before it reaches the actual
rich-text field merge.

This means any block update that changes multiple rich-text attributes while
the selection points at only one of them is a candidate trigger.

## Introduction Point

For top-level multi-rich-text block attributes such as `core/pullquote`, this
bug traces back to the January 14, 2026 cursor handoff introduced by
`30c040ca841`.

Later, on April 2, 2026, commit `09a21c64b5b9`
("RTC: Fix core/table cell merging") extended the same bare-cursor model into
schema-aware recursive merging, which makes the same bug shape possible in
nested structures such as `core/table` query fields.

## Proposed Fix Plan

1. Replace the bare block-merge cursor with a scoped cursor descriptor:
   `clientId`, `attributeKey`, and rich-text offset.
2. Carry that object through recursive block and schema-aware merges.
3. Only pass a cursor hint to `mergeRichTextUpdate()` when the current
   `Y.Text` belongs to the selected block and selected attribute.
4. Pass `null` for every other rich-text field in the same merge.
5. Add regressions for `mergeCrdtBlocks()`, `applyPostChangesToCRDTDoc()`, and
   `SyncManager.update()`.

## Rationale

This bug proves the fix cannot stop at offset conversion. The merge stack needs
to preserve cursor scope as well as cursor coordinate space.

If the cursor is not scoped to the exact `Y.Text` being updated, one field's
cursor can leak into another field even when the numeric value itself is
correct for the selected field.

## Browser Status

This bug is confirmed at the write-path level through `mergeCrdtBlocks()`,
`applyPostChangesToCRDTDoc()`, and `SyncManager.update()`. Direct browser
reproduction still needs a less restricted environment. The next step is to
confirm a natural browser path that emits one block update containing changes
to both `value` and `citation` while selection remains in `value`.
