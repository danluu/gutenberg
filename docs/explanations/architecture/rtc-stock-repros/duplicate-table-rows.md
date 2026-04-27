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
It contains the browser repro, the collaboration fixture stabilization needed by
that repro, this explanation, and the MP4 artifact.

Changes besides the test:

-   `test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts` waits
    for transport-level awareness in the current post room before driving the
    repro. This avoids depending on the collaborator presence button rendering.
-   `docs/explanations/architecture/rtc-stock-repros/duplicate-table-rows.md`
    documents the current failure, fix plan, and verification.
-   `docs/explanations/architecture/rtc-stock-repros/videos/duplicate-table-rows.mp4`
    is the updated annotated video artifact.

## Root Cause

`mergeYArray()` treats equal array values as interchangeable. For a query
attribute like a table body, that means two distinct rows with identical cell
content can be matched by value instead of by logical identity.

Indexes are not enough once users make concurrent structural edits. A delete can
shift indexes while another user edits the row that used to sit after the
deleted row. Value matching is also not enough because the two duplicate rows
look identical before one of them is edited.

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
   for identity round-tripping without string-key leaks, and for the table state
   operations that need to preserve symbol properties.

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
PATH="$HOME/.nvm/versions/node/v20.19.0/bin:$PATH" npm run test:unit -- packages/core-data/src/utils/test/crdt-table-query-identity.test.ts packages/block-library/src/table/test/state.js
PATH="$HOME/.nvm/versions/node/v20.19.0/bin:$PATH" npm run build -- --skip-types
PATH="$HOME/.nvm/versions/node/v20.19.0/bin:$PATH" WP_BASE_URL=http://localhost:19001 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-table-duplicates.spec.ts
```

Result on the fixed PR branch: the focused unit tests passed, the production
build completed, and the browser repro passed with both editors converging on
`anchor`, `edited-second-duplicate`.
