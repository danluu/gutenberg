# Real-Time Collaboration Nested Selection History Bug

## Status

This is a real product bug in the RTC selection-history path.

The focused fuzzer failure is valid: when a block selection points at nested
rich text, `createBlockSelectionHistory()` records a `BlockSelection` instead
of a `RelativeSelection`. That loses the `Y.RelativePosition` needed to keep
the cursor attached to the intended `Y.Text` when remote edits happen before
the cursor.

## Failure

The original failing target is:

```bash
packages/core-data/src/utils/test/block-selection-history.fuzz.test.ts
```

On the known-fixes baseline
`/Users/danluu/dev/fuzz/gutenberg-known-fixes-fuzz` branch
`try/fuzz-known-fixes-validation`, seeds `1701` through `1708` fail with:

```text
Expected: "RelativeSelection"
Received: "BlockSelection"
```

Those seeds pass with this fix.

## Root Cause

`packages/core-data/src/utils/block-selection-history.ts` converted a
`WPBlockSelection` into a Yjs-backed selection by looking only at:

```ts
attributes.get( attributeKey )
```

That works for direct rich-text attributes such as paragraph `content`, where
the attribute value is itself a `Y.Text`.

It fails for schema-aware nested rich text, where the top-level attribute is a
`Y.Map` or `Y.Array` and the `Y.Text` is a descendant. In that case the old code
treated the selection as invalid for relative tracking and fell back to a block
selection.

The bundled `core/table` block exposed a second half of the same problem: table
cell `RichText` instances did not provide an `identifier`, so the block-editor
selection carried an offset but no nested `attributeKey`. Selection history then
had no way to know that the cursor belonged to the first body cell's
`body.0.cells.0.content` `Y.Text`.

## Introduced By

This regression was introduced by
[#74878, "Real-time collaboration: Use relative positions in undo stack"](https://github.com/WordPress/gutenberg/pull/74878),
merged on January 23, 2026 as
[commit `5cbdbc274fb4dc0f74b23cbc248fe8056a15f37b`](https://github.com/WordPress/gutenberg/commit/5cbdbc274fb4dc0f74b23cbc248fe8056a15f37b).
That PR introduced
`packages/core-data/src/utils/block-selection-history.ts` and the affected
`BlockSelectionHistory` conversion path. The original implementation created
relative selections only with direct top-level rich-text attributes:

```ts
const changedYText = attributeKey
	? attributes?.get( attributeKey )
	: undefined;
```

Before #74878, this specific selection-history failure could not occur because
the selection-history code did not exist.

[#76418](https://github.com/WordPress/gutenberg/pull/76418) later adjusted
rich-text offset handling in this file for HTML-vs-text index conversion, but it
kept the same top-level attribute lookup and did not address nested rich-text
selection targets.

This is independent from the other recent RTC issues:

- [#77532](https://github.com/WordPress/gutenberg/issues/77532) and
  [#77658](https://github.com/WordPress/gutenberg/pull/77658) cover rich-text
  offset spaces in the block merge diff path.
- [#77662](https://github.com/WordPress/gutenberg/pull/77662) covers cursor
  scope loss across different rich-text fields.
- [#77666](https://github.com/WordPress/gutenberg/pull/77666) covers title
  divergence after refresh.
- [#77669](https://github.com/WordPress/gutenberg/pull/77669) covers the large
  update size check that caused "Connection Lost".

Those PRs do not fix this nested selection-history bug.

## Why This Is Reachable

The nested value shape is the same shape used by the CRDT block encoding for
query/object attributes:

- `crdt-blocks.ts` creates nested `Y.Map` and `Y.Array` containers from block
  attribute schemas.
- Rich-text leaves inside those containers are stored as `Y.Text`.
- Selection recalculation in `getPostChangesFromCRDTDoc()` depends on
  selection history holding relative text positions, not block-only positions.

The production-path regression in `packages/core-data/src/utils/test/crdt.ts`
records a nested table-cell selection, simulates a remote insertion before the
cursor, and verifies that `getPostChangesFromCRDTDoc()` emits the shifted
selection.

## False-Positive Checks

- Invalid oracle: ruled out. The oracle checks the actual Yjs invariant needed
  by production: the saved relative position must resolve back to the same
  `Y.Text` after text is inserted before it.
- Invalid generated shape: ruled out. The reproducer uses nested
  `Y.Map`/`Y.Array`/`Y.Text` structures that match schema-aware CRDT block
  attributes.
- Helper misuse: ruled out. The same failure appears through
  `getPostChangesFromCRDTDoc()`, not only through direct helper calls.
- Environment contamination: ruled out. The known-fixes baseline fails all
  issue-7 seeds, while this workspace passes those seeds after the fix.
- Race-injection-only behavior: ruled out. The reproducer uses deterministic
  Yjs edits, not injected races or timing faults.
- Known-fixed bug masking: ruled out. The baseline includes the listed known
  RTC fixes and still fails this signature.

## Browser Status

Browser-level coverage now uses the bundled `core/table` block:

```bash
test/e2e/specs/editor/collaboration/collaboration-table-selection-history.spec.ts
```

The user-facing repro uses normal editor actions:

1. User A inserts a normal Table block and clicks `Create Table`.
2. User A types `Hello world` in the first body cell.
3. User A moves the cursor after `Hello` with keyboard navigation.
4. User B clicks the same table cell and types `XXX` at the beginning.
5. User A types `!` without re-clicking the cell.

Before the fix, User A's selection stayed at offset `5` after the content became
`XXXHello world`, so the final `!` landed in the wrong location:

```text
XXXHe!llo world
```

After the fix, the table cell selection has attribute
`body.0.cells.0.content`, the offset shifts from `5` to `8`, and the final `!`
lands at the expected location:

```text
XXXHello! world
```

The local browser videos are:

```text
/Users/danluu/conductor/workspaces/gutenberg-v1/seattle/.context/repro-artifacts/core-table-normal-block-normal-actions-failure.webm
/Users/danluu/conductor/workspaces/gutenberg-v1/seattle/.context/repro-artifacts/core-table-normal-block-normal-actions-fixed.webm
```

An earlier fixture-block browser repro is still present on the explanation
branch:

```bash
test/e2e/specs/editor/collaboration/collaboration-nested-selection-history-repro.spec.ts
```

That test uses a custom block with a nested `RichText` identifier,
`body.content`. It is useful as a narrow selection-history repro, but the
bug is also reachable through the bundled Table block above.

`wp-env-test` was run with automatic port selection at:

```text
http://localhost:8899
```

## Fix

RTC code now resolves rich-text targets in two ways:

- an explicit dot path such as `body.0.cells.0.content` must resolve directly
  to a nested `Y.Text`;
- a top-level nested attribute such as the fuzzer's `body` case resolves only
  when the nested value contains exactly one `Y.Text`, avoiding ambiguous table
  bodies with multiple cell texts.

If no exact or unambiguous `Y.Text` is available, selection history keeps the
existing block-selection fallback.

The resolver is shared by selection history and remote-user selection state, so
table-cell selections are also available to collaborator cursor rendering.

When a stored relative position is converted back to a WordPress selection, the
current nested attribute path is recomputed from the resolved `Y.Text`. This
matters for structural edits: if another row is inserted before the selected
row, a cursor that was recorded at `body.0.cells.0.content` is restored as
`body.1.cells.0.content` instead of pointing at the wrong cell.

The Table block also now passes a nested `RichText` identifier for each cell:

```js
identifier={ `${ name }.${ rowIndex }.cells.${ columnIndex }.content` }
```

That makes the first body cell selection visible to the block-editor and RTC
stores as `body.0.cells.0.content`.

## Verification

Commands run:

```bash
npm run test:unit packages/core-data/src/utils/test/block-selection-history.test.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-user-selections.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/block-selection-history.fuzz.test.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/block-selection-history.ts packages/core-data/src/utils/test/block-selection-history.test.ts packages/core-data/src/utils/test/crdt.ts packages/core-data/src/utils/test/block-selection-history.fuzz.test.ts
npm run lint:js -- packages/e2e-tests/plugins/nested-rich-selection/index.js test/e2e/specs/editor/collaboration/collaboration-nested-selection-history-repro.spec.ts
npm run lint:js -- packages/core-data/src/utils/block-selection-history.ts packages/core-data/src/utils/test/block-selection-history.test.ts packages/core-data/src/utils/test/crdt.ts packages/block-library/src/table/edit.js test/e2e/specs/editor/collaboration/collaboration-table-selection-history.spec.ts
npm run lint:js -- packages/core-data/src/utils/block-selection-history.ts packages/core-data/src/utils/crdt-selection.ts packages/core-data/src/utils/crdt-utils.ts packages/core-data/src/utils/crdt-user-selections.ts packages/core-data/src/utils/test/block-selection-history.test.ts packages/core-data/src/utils/test/crdt-user-selections.ts packages/core-data/src/utils/test/crdt.ts packages/block-library/src/table/edit.js test/e2e/specs/editor/collaboration/collaboration-table-selection-history.spec.ts
php -l packages/e2e-tests/plugins/nested-rich-selection.php
npm run wp-env-test -- start --auto-port
npm run build -- --skip-types
WP_BASE_URL=http://localhost:8899 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-nested-selection-history-repro.spec.ts
WP_BASE_URL=http://localhost:8899 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-table-selection-history.spec.ts
WP_BASE_URL=http://localhost:8899 npm run test:e2e -- test/e2e/specs/editor/blocks/table.spec.js
```

Known-fixes baseline repro command:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-known-fixes-fuzz
npm run test:unit packages/core-data/src/utils/test/block-selection-history.fuzz.test.ts -- --runInBand
```

Result: all eight issue-7 seeds failed before this fix and pass after it.
