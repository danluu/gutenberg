# RTC: duplicate table rows can lose cell content

## Summary

Two collaborators can corrupt a table when the table contains duplicate row
data. The stock repro uses only normal editor actions: insert a table, make two
rows contain the same text, and let a second editor join the session. The second
editor receives a table whose duplicate row is missing the expected cell text.

The problem is in the low-level CRDT merge for array-valued block attributes,
not in the table block UI. `core/table` stores rows and cells in nested query
attributes. The merge code tries to preserve existing Yjs child objects by
matching array entries by value. Duplicate rows are therefore ambiguous: two
different logical rows can have the same serialized value, so the merger can
reuse the wrong Yjs object or leave the later duplicate without the expected
content.

## Stock repro

- Browser repro: `test/e2e/specs/editor/collaboration/collaboration-table-duplicates.spec.ts`
- Video: `videos/duplicate-table-rows.mp4`
- Normal user actions:
  1. Editor A opens a collaborative post.
  2. Editor A inserts a 1-column table with three rows.
  3. Editor A types `anchor`, `same`, and `same` into the rows.
  4. Editor B opens the same post.
  5. Editor B sees the last duplicate row without the expected `same` cell text.

## Observed vs expected

Expected: both editors see the same three row values: `anchor`, `same`, `same`.

Observed: the receiving editor can see the last row as blank or otherwise
missing the expected cell content. The two editors now disagree about the table
contents even though all edits were normal table editing actions.

## How it was introduced

The duplicate-value ambiguity was introduced by #77164, `RTC: Improve array
attribute stability when structural changes occur`. That PR changed
`packages/core-data/src/utils/crdt-blocks.ts` so `mergeYArray()` uses a
left/right sweep and `areArrayElementsEqual()` to preserve existing Yjs children
when array structure changes.

That was a valid direction for structural edits, but matching query-array
children by serialized value is not enough when the array can contain duplicates.
The earlier table-cell merge work in #76913 made this path important for
`core/table`, but #77164 is the change that made duplicate query-array values
ambiguous at the CRDT object identity layer.

## Root cause

`mergeYArray()` currently treats equal array values as interchangeable. For a
query attribute like a table body, this means two distinct rows with identical
cell content can be matched to the same side of the merge search. Once the wrong
Yjs child object is reused, nested cell state can be attached to the wrong row or
not attached to the later duplicate row at all.

Array indexes alone are also not sufficient because concurrent structural edits
can move or delete rows. The missing ingredient is a stable, non-serialized
identity for query-array children, or a diff algorithm that does not make
identity decisions from duplicate values.

## Fix plan

1. Add stable internal identity for query-array elements while keeping it out of
   serialized block attributes and post content.
2. Use that identity when merging nested array attributes, before falling back to
   value-based matching.
3. Treat duplicate value matches as ambiguous. If an element has no stable
   identity and more than one candidate has the same value, avoid reusing a child
   Yjs object based on value alone.
4. Preserve the intent of #77164 for non-duplicate structural edits: moving or
   inserting distinct rows should continue to keep existing nested Yjs children
   stable.
5. Add regression coverage for:
   - duplicate table rows with identical cell text;
   - deleting the earlier duplicate while editing the later duplicate;
   - deleting the later duplicate while editing the earlier duplicate;
   - non-duplicate row moves and insertions, to ensure the fix does not regress
     the #77164 stability improvement.

The fix must not store internal identities in the block's serialized HTML or
REST-visible attributes. Leaking them would create content churn, make copied
blocks unstable, and turn an RTC implementation detail into a public block
schema detail.

## Verification

The failing stock repro is:

```bash
WP_BASE_URL=http://localhost:8990 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-table-duplicates.spec.ts
```

Known-fixes-base status, checked on `try/fuzz-known-issues-fixed-campaign`
after the previously found RTC fixes were applied:

-   **Fails:** browser stock repro
    `test/e2e/specs/editor/collaboration/collaboration-table-duplicates.spec.ts`
    still receives `["anchor", "same", undefined]` instead of
    `["anchor", "same", "same"]`.
-   **Fails:** lower-level CRDT duplicate-row repro
    `packages/core-data/src/utils/test/crdt-table-duplicates.fuzz.test.ts`
    still loses the edit to the later duplicate row when the earlier duplicate
    row is deleted.
-   **Passes:** the lower-level control cases for distinct row contents and for
    editing the earlier duplicate while deleting the later duplicate. Those
    controls show the remaining failure is specific to ambiguous duplicate row
    identity, not to all table-array merges.

The lower-level fuzz/unit coverage should live near the CRDT block merge tests
and cover duplicate query-array elements directly, without depending on browser
timing.
