# RTC: duplicate table rows can diverge across collaborators

## Summary

Two collaborators can end up with different visible table contents when a table
contains duplicate rows and one collaborator edits one duplicate while another
collaborator deletes the other duplicate.

The problem is in the CRDT merge for nested array-valued block attributes, not
in the table UI. `core/table` stores rows and cells as nested query attributes.
The merge code preserves existing Yjs child objects by matching array entries by
serialized value. Duplicate rows are therefore ambiguous: two different logical
rows can have the same serialized value, so a row delete can be matched against
the wrong Yjs object while a concurrent edit remains attached to another row.

## Current Repro

-   Browser repro:
    `test/e2e/specs/editor/collaboration/collaboration-table-duplicates.spec.ts`
-   Video:
    `docs/explanations/architecture/rtc-stock-repros/videos/duplicate-table-rows.mp4`
-   Video provenance: regenerated on April 27, 2026 in the standard repro video
    format, with both editor screens visible and a running annotated log. The
    local artifact path used to update this branch was
    `/Users/danluu/dev/fuzz/gutenberg/artifacts/rtc-duplicate-table-rows-video/duplicate-table-rows-updated-repro.mp4`.
-   The video was recorded from `try/awareness-exception` at
    `d834aab9f47636f85c78e0d8912658155f7fdd18`. That was not literally
    `origin/trunk`, but the table and CRDT implementation files relevant to this
    repro matched trunk at the time of recording.

Normal user-visible flow:

1. Editor A and Editor B open the same collaborative post.
2. The post contains a one-column table with rows `anchor`, `same`, `same`.
3. Editor A edits the later duplicate row from `same` to
   `edited-second-duplicate`.
4. Editor B concurrently deletes the earlier duplicate row.
5. After sync, the two editors should converge on `anchor`,
   `edited-second-duplicate`.

The updated repro reads the rendered table cells, not raw block attributes, so
it checks what users actually see in each editor.

## Observed vs Expected

Expected: both editors converge on two visible rows:

```text
anchor
edited-second-duplicate
```

Observed in the updated repro video:

```text
Editor A: anchor / same / edited-second-duplicate
Editor B: anchor / same
```

The users now see different versions of the same shared table.

## Branch Contents

This explanation/repro branch intentionally does not contain the production fix.
It contains browser and lower-level repros, the collaboration fixture
stabilization needed by the browser repro, this explanation, and the MP4
artifact.

Changes besides the test:

-   `test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts` waits
    for transport-level awareness in the current post room before driving the
    repro. This avoids depending on the collaborator presence button rendering.
-   `packages/core-data/src/utils/test/crdt-table-duplicates-repro.test.ts`
    reproduces the same failure with only `mergeCrdtBlocks()`, two `Y.Doc`s, and
    Yjs updates.
-   `packages/core-data/src/utils/test/crdt.ts` reproduces the same failure
    through the post-entity wrapper path:
    `applyPostChangesToCRDTDoc()` and `getPostChangesFromCRDTDoc()`.
-   `docs/explanations/architecture/rtc-stock-repros/duplicate-table-rows.md`
    documents the current failure, fix plan, and verification.
-   `docs/explanations/architecture/rtc-stock-repros/videos/duplicate-table-rows.mp4`
    is the updated annotated video artifact.

## Lower-Level Repros

The bug can be reproduced below the browser at the core-data CRDT layers:

-   Browser/editor layer:
    `test/e2e/specs/editor/collaboration/collaboration-table-duplicates.spec.ts`
    drives two real editor sessions and asserts the rendered table cells.
-   Block CRDT layer:
    `packages/core-data/src/utils/test/crdt-table-duplicates-repro.test.ts`
    skips WordPress, REST, Playwright, and the sync endpoint. It creates two
    `Y.Doc`s, seeds the same table, edits the later duplicate row in one doc,
    deletes the earlier duplicate row in the other doc, exchanges Yjs updates,
    and expects both docs to converge.
-   Post entity CRDT wrapper layer:
    `packages/core-data/src/utils/test/crdt.ts` now runs the same scenario
    through `applyPostChangesToCRDTDoc()` and `getPostChangesFromCRDTDoc()`.
    This verifies the post sync config path that collaboration uses before the
    generic sync manager sees a document update.

There is no faithful standalone repro in the pure table-state helpers. Files
like `packages/block-library/src/table/state.js` only transform one local table
attribute object at a time; they do not have Yjs state, collaborator snapshots,
or remote update ordering. The production fix still adds guardrail tests there
to ensure hidden row/cell identity survives local table operations, but the RTC
failure itself starts at the core-data CRDT merge layer.

There is also no table-specific standalone repro in `packages/sync`. The sync
manager is intentionally generic and delegates all block/table interpretation to
the `SyncConfig` functions supplied by core-data. A manager test that imported
core-data's table merge config would cross that package boundary while adding no
new table merge coverage beyond the post-wrapper repro above.

## Root Cause

`mergeYArray()` treats equal array values as interchangeable. For a query
attribute like a table body, that means two distinct rows with identical cell
content can be matched by value instead of by logical identity.

Indexes are not enough once users make concurrent structural edits. A delete can
shift indexes while another user edits the row that used to sit after the
deleted row. Value matching is also not enough because the two duplicate rows
look identical before one of them is edited.

## How It Was Introduced

The duplicate-row failure is rooted in `#77164`, with several earlier PRs making
the table path visible:

-   `#72262` (`84019935998c`, "Improve CRDT merge logic for post entities")
    created the post/block CRDT merge infrastructure in `core-data`. It is the
    base layer, not the table-specific regression.
-   `#76597` (`80605517663` / `ac9073b15d3`, "RTC: Fix CRDT serialization of
    nested RichText attributes") made nested `RichTextData` serialize
    recursively, including rich text inside table cells.
-   `#76607` (`85695dcffdc`, "RTC: Fix RichTextData deserialization") added the
    matching recursive deserialization through schema query nodes, so table cell
    content could round-trip back into runtime `RichTextData`.
-   `#76913` (`09a21c64b5b`, "RTC: Fix core/table cell merging") made
    `core/table` rows and cells schema-aware nested Yjs structures:
    array/query attributes became `Y.Array<Y.Map>`, object/query attributes
    became `Y.Map`, and nested cell content became `Y.Text`. This enabled
    in-place table cell merging. At this point, structural length changes still
    rebuilt the affected array, which was less stable but did not infer row
    identity from duplicate row values.
-   `#77164` (`a6bfd3e5543`, "RTC: Improve array attribute stability when
    structural changes occur") changed `mergeYArray()` to preserve nested Yjs
    children during inserts/deletes by using a left/right sweep and
    `areArrayElementsEqual()`. That was intended to keep existing row/cell
    objects stable across structural edits, but it matched query-array elements
    by serialized value. For duplicate table rows, two different logical rows
    can serialize to the same value (`same`), so `#77164` made those rows
    interchangeable to the diff algorithm. A concurrent delete of one duplicate
    and edit of the other can therefore attach the edit/delete to different
    logical rows and leave collaborators with divergent visible tables.

## Fix Plan

The production fix lives on
`try/rtc-duplicate-table-rows-stock-repro-pr-trunk`.

The safe plan is:

1. Store a stable internal identity for each query-array element in the CRDT
   Y.Map. This gives table rows and cells identity even when their serialized
   values are duplicates.
2. Do not expose that identity as a normal string property in editor-visible
   block attributes. When CRDT data is deserialized into block attributes, carry
   the ID as an enumerable symbol property instead. Object spread preserves it,
   but `JSON.stringify`, REST payloads, and serialized block HTML do not expose
   it.
3. When local block attributes are converted back to the CRDT merge format,
   convert the symbol ID back to the internal CRDT key so `mergeYArray()` can
   match rows and cells by identity before falling back to value-based matching.
4. Preserve symbol properties in table state helpers that rebuild row objects
   during cell edits and column insert/delete operations.
5. Keep the internal identity key out of equality checks and out of normal
   property deletion, so it neither creates false diffs nor gets stripped from
   existing Y.Map children.
6. Add regression coverage for the exact two-user duplicate edit/delete case,
   for both possible lower-level core-data repro paths, for identity
   round-tripping without string-key leaks, and for the table state operations
   that need to preserve symbol properties.

This avoids the main failure mode of a naive fix: leaking `__unstableSyncId` into
runtime block attributes, post content, REST-visible data, copied blocks, or
plugin-observable table attributes.

## Verification

The browser repro command is:

```bash
WP_BASE_URL=http://localhost:19001 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-table-duplicates.spec.ts
```

The trunk-based PR branch was verified after the fix with:

```bash
PATH="$HOME/.nvm/versions/node/v20.19.0/bin:$PATH" npm run test:unit -- packages/core-data/src/utils/test/crdt-table-duplicates-repro.test.ts packages/core-data/src/utils/test/crdt-table-query-identity.test.ts packages/core-data/src/utils/test/crdt.ts
PATH="$HOME/.nvm/versions/node/v20.19.0/bin:$PATH" npm run test:unit -- packages/block-library/src/table/test/state.js
PATH="$HOME/.nvm/versions/node/v20.19.0/bin:$PATH" npm run build -- --skip-types
PATH="$HOME/.nvm/versions/node/v20.19.0/bin:$PATH" WP_BASE_URL=http://localhost:19001 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-table-duplicates.spec.ts
```

Result on the fixed PR branch: the focused unit tests passed, the production
build completed, and the browser repro passed with both editors converging on
`anchor`, `edited-second-duplicate`.
