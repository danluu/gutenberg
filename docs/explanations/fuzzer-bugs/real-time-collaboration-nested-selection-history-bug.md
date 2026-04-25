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

A pure first-party, user-only Playwright repro was not produced.

The closest first-party nested rich-text UI is `core/table`, but its cell
`RichText` instances do not provide a stable `identifier`, so the block-editor
selection does not include an `attributeKey` or nested path for selection
history to resolve. A path-aware nested RichText is realistic for a custom
block, but that requires registering a test block as harness setup; I did not
promote that to the required top-level repro because the user-action sequence
would depend on artificial setup not present in first-party editor UI.

`wp-env` was started with automatic port selection at:

```text
http://localhost:8897
```

The initial `wp-env start` failed because port `8888` was already allocated.
No browser video was recorded because the top-level user-only repro was blocked
by the first-party UI/harness gap above.

## Fix

Selection history now resolves rich-text targets in two ways:

- an explicit dot path such as `body.0.cells.0.content` must resolve directly
  to a nested `Y.Text`;
- a top-level nested attribute such as the fuzzer's `body` case resolves only
  when the nested value contains exactly one `Y.Text`, avoiding ambiguous table
  bodies with multiple cell texts.

If no exact or unambiguous `Y.Text` is available, selection history keeps the
existing block-selection fallback.

## Verification

Commands run:

```bash
npm run test:unit packages/core-data/src/utils/test/block-selection-history.test.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/block-selection-history.fuzz.test.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/block-selection-history.ts packages/core-data/src/utils/test/block-selection-history.test.ts packages/core-data/src/utils/test/crdt.ts packages/core-data/src/utils/test/block-selection-history.fuzz.test.ts
```

Known-fixes baseline repro command:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-known-fixes-fuzz
npm run test:unit packages/core-data/src/utils/test/block-selection-history.fuzz.test.ts -- --runInBand
```

Result: all eight issue-7 seeds failed before this fix and pass after it.
