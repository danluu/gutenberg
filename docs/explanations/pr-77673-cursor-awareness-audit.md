# PR 77673 Cursor Fuzz Issues

Audit target: <https://github.com/WordPress/gutenberg/pull/77673>

Audited PR head: [`cb1473de6557485ecb6961444cc818a561c77d85`](https://github.com/danluu/gutenberg/commit/cb1473de6557485ecb6961444cc818a561c77d85)

Regression-test upload: [`e086a6403270de7fe0a7ea3eedd5a577c0399028`](https://github.com/danluu/gutenberg/commit/e086a6403270de7fe0a7ea3eedd5a577c0399028)

This pass only looked for cursor and presence-cursor bugs in the updated PR
77673 fix. It did not triage unrelated collaboration, persistence, or CRDT
content bugs.

## Relevant History

The three issues below come from the interaction of several real RTC changes:

- [PR 75590](https://github.com/WordPress/gutenberg/pull/75590), merged as
  [`d5add1a75a1f5b6954f2964466820567aee3d141`](https://github.com/WordPress/gutenberg/commit/d5add1a75a1f5b6954f2964466820567aee3d141),
  removed block client IDs from awareness payloads. The receiver now resolves
  a `Y.RelativePosition` back to a Yjs object, walks upward to the containing
  block, and maps that block path to a local editor block.
- [PR 76597](https://github.com/WordPress/gutenberg/pull/76597), merged as
  [`80605517663ad969e0f6e853ee8be4c7c3cc8dd0`](https://github.com/WordPress/gutenberg/commit/80605517663ad969e0f6e853ee8be4c7c3cc8dd0),
  made nested `RichTextData` values serializable, including table cell content.
- [PR 76913](https://github.com/WordPress/gutenberg/pull/76913), merged as
  [`09a21c64b5b92c2626bd93065d4a0192eb4fac47`](https://github.com/WordPress/gutenberg/commit/09a21c64b5b92c2626bd93065d4a0192eb4fac47),
  changed `core/table` CRDT storage so each table cell content field is its own
  nested `Y.Text`, for example `body[1].cells[1].content`.
- PR 77673 then made nested table-cell awareness reachable. The important
  commits are:
  - [`3e7ae5a69976ac7833c65413108f7bf1cef7bba7`](https://github.com/danluu/gutenberg/commit/3e7ae5a69976ac7833c65413108f7bf1cef7bba7):
    gives table cell `RichText` instances a positional identifier such as
    `body.1.cells.1.content`, and resolves dotted attribute paths to nested
    `Y.Text` instances.
  - [`120e6e3c8eecb69d2c8359068bc9b594d67139e4`](https://github.com/danluu/gutenberg/commit/120e6e3c8eecb69d2c8359068bc9b594d67139e4):
    updates the browser test to use a non-first table cell.
  - [`1181f5b23df9897eae4bea8b6743a5f1daba69ce`](https://github.com/danluu/gutenberg/commit/1181f5b23df9897eae4bea8b6743a5f1daba69ce):
    adds `attributeKey` to `ResolvedSelection` and passes it through to the
    collaborators overlay.
  - [`05e42d4bb9ee576eedd5c58ce9452b9ccbd57e39`](https://github.com/danluu/gutenberg/commit/05e42d4bb9ee576eedd5c58ce9452b9ccbd57e39)
    and [`cb1473de6557485ecb6961444cc818a561c77d85`](https://github.com/danluu/gutenberg/commit/cb1473de6557485ecb6961444cc818a561c77d85):
    follow-up test/comment cleanup.

The core design tension is that the durable cursor location is the
`Y.RelativePosition`, while the DOM target used by the overlay is now a
sender-side positional string. Those two values can drift apart.

## Issue 1: Nested Table-Cell Cursor Can Disappear Remotely

Severity: high.

### User Impact

User A clicks into the `Delta` cell of a 2x2 table. User B should see User A's
presence cursor in that same cell. Instead, User B renders zero collaborator
cursors.

Video:

- `/Users/danluu/dev/fuzz/gutenberg-pr77673-cursor-fuzz/artifacts/cursor-videos/issue-1-nested-table-cell-cursor-missing-remotely-visible-click-20260512T224543382Z/issue-1-nested-table-cell-cursor-missing-remotely-visible-click.mp4`

The recorded sender state was:

```json
{
  "attributeKey": "body.1.cells.1.content",
  "offset": 5
}
```

The receiver-side overlay summary was:

```json
{
  "cursorCount": 0,
  "selectionRectCount": 0
}
```

### How This Was Created

This is the base failure mode for the new nested table-cell awareness path.

Before [PR 76913](https://github.com/WordPress/gutenberg/pull/76913), a table
cell did not have an independent nested `Y.Text` that could carry a precise
awareness cursor. PR 76913 created that nested CRDT shape. PR 77673 commit
[`3e7ae5a6997`](https://github.com/danluu/gutenberg/commit/3e7ae5a69976ac7833c65413108f7bf1cef7bba7)
then made table cells emit nested `RichText` identifiers, and commit
[`1181f5b23df`](https://github.com/danluu/gutenberg/commit/1181f5b23df9897eae4bea8b6743a5f1daba69ce)
forwarded that key through `ResolvedSelection` to the overlay.

That creates a new end-to-end invariant:

```text
sender DOM selection
  -> nested attributeKey
  -> nested Y.Text relative position
  -> receiver local block path
  -> receiver DOM element with the same data-wp-block-attribute-key
  -> rendered collaborator cursor
```

The fuzz/video repro shows that the invariant can still fail at the browser
level: the sender has a valid table-cell key and offset, but the receiver draws
no cursor.

### Fix Plan

1. Keep the browser regression that clicks a real non-first table cell and
   asserts that the remote cursor is inside the same cell. PR test coverage for
   this path is in
   [`test/e2e/specs/editor/collaboration/collaboration-nested-awareness-selection.spec.ts`](https://github.com/danluu/gutenberg/blob/e086a6403270de7fe0a7ea3eedd5a577c0399028/test/e2e/specs/editor/collaboration/collaboration-nested-awareness-selection.spec.ts).
2. On the receiver side, validate every resolved cursor before rendering:
   the resolved `Y.Text` should map to a local block and to a DOM RichText
   element for the same live field.
3. Add debug assertions around the no-cursor path: distinguish "remote
   awareness not received", "relative position did not resolve",
   "local block path did not resolve", and "DOM key did not resolve". The
   current symptom is just a missing visible cursor.
4. If the `Y.RelativePosition` resolves to a live table-cell `Y.Text`, the
   overlay target should be derived from that resolved Yjs object or verified
   against it, rather than trusting an unrelated string.

## Issue 2: Positional Table-Cell `attributeKey` Becomes Stale After Row Deletion

Severity: high.

### User Impact

User A places the cursor in `Delta`, which initially has DOM key
`body.1.cells.1.content`. User B deletes the preceding row through the normal
table toolbar. `Delta` still exists, now at `body.0.cells.1.content`. User B
should still see User A's cursor in `Delta`, but the remote cursor disappears.

Video:

- `/Users/danluu/dev/fuzz/gutenberg-pr77673-cursor-fuzz/artifacts/cursor-videos/issue-2-nested-attributekey-becomes-stale-after-row-deletion-20260512T231737484Z/issue-2-nested-attributekey-becomes-stale-after-row-deletion.mp4`

Before row deletion:

```json
{
  "Delta": "body.1.cells.1.content"
}
```

After row deletion:

```json
{
  "Delta": "body.0.cells.1.content",
  "renderedUserACursors": 0
}
```

### How This Was Created

The durable cursor location and the DOM lookup key have different stability
properties:

- The `Y.RelativePosition` created for User A's cursor points into the actual
  `Y.Text` for the `Delta` cell.
- The `attributeKey` added by
  [`1181f5b23df`](https://github.com/danluu/gutenberg/commit/1181f5b23df9897eae4bea8b6743a5f1daba69ce)
  is copied from the sender's block-editor selection state.
- The table cell identifiers added by
  [`3e7ae5a6997`](https://github.com/danluu/gutenberg/commit/3e7ae5a69976ac7833c65413108f7bf1cef7bba7)
  are positional: `body.<row>.cells.<column>.content`.

When a row before `Delta` is deleted, Yjs can still keep the relative position
attached to the live `Delta` text, but the string `body.1.cells.1.content` no
longer describes the live DOM field. The new correct DOM key is
`body.0.cells.1.content`.

This is exposed by the combination of [PR 76913](https://github.com/WordPress/gutenberg/pull/76913)
creating nested table-cell `Y.Text` objects and PR 77673 forwarding the
sender's positional key to the receiver overlay.

There is also a lower-level suppression risk in
`packages/core-data/src/utils/crdt-user-selections.ts`: selection equality has
historically focused on relative position and offsets. A correction that only
updates the string path can be treated as "unchanged" unless `attributeKey`
participates in equality.

### Fix Plan

1. Do not treat sender `attributeKey` as the source of truth after resolving a
   `Y.RelativePosition`. Compute the live nested path from the resolved
   `Y.Text` in the receiver document, or store a stable RichText identity that
   survives row/column structural edits.
2. If a positional key is kept, verify it:

   ```ts
   getYTextByAttributeKey( attributes, resolved.attributeKey ) ===
       absolutePosition.type
   ```

   If the check fails, derive the current key or suppress the cursor with a
   diagnosable error instead of using the stale key.
3. Include `attributeKey` in cursor selection equality so a key-only correction
   is sent and rendered.
4. Keep the uploaded e2e regression from
   [`e086a6403270`](https://github.com/danluu/gutenberg/commit/e086a6403270de7fe0a7ea3eedd5a577c0399028):
   User A cursor in `Delta`, User B deletes the preceding row, assert the
   remote cursor follows `Delta` to its new cell.

## Issue 3: Missing Explicit Keyed Target Falls Back To Whole-Block Cursor

Severity: medium.

### User Impact

If a remote awareness payload names an explicit RichText target that no longer
exists, the overlay can render a presence cursor against the whole table block.
That is visually wrong: the cursor appears in unrelated block text instead of
either following a valid field or disappearing.

Video:

- `/Users/danluu/dev/fuzz/gutenberg-pr77673-cursor-fuzz/artifacts/cursor-videos/issue-3-missing-keyed-richtext-target-falls-back-to-block-20260512T230107434Z/issue-3-missing-keyed-richtext-target-falls-back-to-block.mp4`

The natural app path clears the source awareness selection before the bad
cursor paints, so the final segment of the video is explicitly marked
`harness-only`. It preserves the stale keyed selection long enough to show the
current fallback behavior:

```json
{
  "blockExists": true,
  "keyedTargetExists": false,
  "fallbackWouldUseWholeBlock": true
}
```

### How This Was Created

Commit [`1181f5b23df`](https://github.com/danluu/gutenberg/commit/1181f5b23df9897eae4bea8b6743a5f1daba69ce)
added `resolveTargetElement()` in
`packages/editor/src/components/collaborators-overlay/compute-selection.ts`.
The important behavior is:

```ts
return (
    blockElement.querySelector< HTMLElement >(
        `[data-wp-block-attribute-key="${ attrKey }"]`
    ) ?? blockElement
);
```

That fallback is reasonable for old payloads that do not have `attributeKey` at
all. It is not safe when a new payload explicitly names an `attributeKey` and
the lookup misses. In that case, the offset is relative to one RichText field,
not to the whole block's text content. Painting against the block root creates
a misleading cursor.

The same query searches all descendants of the block element. If a parent block
and an inner child block both have a `content` RichText, a parent lookup can
match the child's DOM unless candidates are filtered to the same closest
`[data-block]`.

### Fix Plan

1. Split missing-key and explicit-key-miss behavior:

   ```ts
   if ( ! resolvedSelection.attributeKey ) {
       return blockElement; // old payload / whole-block-compatible fallback
   }

   const richTextElement = findRichTextElementInSameBlock( ... );
   return richTextElement; // null on explicit miss
   ```

2. For explicit `attributeKey` misses, render no cursor and optionally expose a
   debug reason. Do not use a RichText-relative offset against the whole block.
3. Restrict the DOM lookup to RichText elements whose nearest
   `[data-block]` is the resolved local block, so parent selections cannot
   accidentally target child block RichText.
4. Keep the uploaded unit regression in
   [`packages/editor/src/components/collaborators-overlay/test/compute-selection.ts`](https://github.com/danluu/gutenberg/blob/e086a6403270de7fe0a7ea3eedd5a577c0399028/packages/editor/src/components/collaborators-overlay/test/compute-selection.ts).
   It currently fails on the exposed behavior: the code still returns cursor
   coordinates from the whole block when the keyed RichText target is absent.

## Test Status

Tests uploaded to PR 77673 in
[`e086a6403270de7fe0a7ea3eedd5a577c0399028`](https://github.com/danluu/gutenberg/commit/e086a6403270de7fe0a7ea3eedd5a577c0399028):

- Browser test for issue 2:
  `test/e2e/specs/editor/collaboration/collaboration-nested-awareness-selection.spec.ts`.
- Unit test for issue 3:
  `packages/editor/src/components/collaborators-overlay/test/compute-selection.ts`.

Local verification:

- `git diff --check` passed before the test commit.
- Playwright `--list` saw both nested-awareness browser tests.
- The new `compute-selection.ts` unit test compiles and fails on the expected
  explicit-key-miss fallback behavior.
