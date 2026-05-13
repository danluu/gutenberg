# RTC table body prepend lost after reload

Bug signature: `67a5c5c224e8`

Bug type: `rtc_ws_table_body_prepend_lost_after_reload`

Transport: WebSocket

## Summary

The handoff row is non-runnable and has no source spec, but the available
evidence points to a real low-level RTC correctness bug in persisted CRDT
bootstrap/reload reconciliation.

The failure shape is:

1. A persisted CRDT document contains a `core/table` block with a prepended
   `attributes.body` row from a remote collaborator.
2. The target Y.Doc applies that persisted update.
3. The current entity record still contains a stale two-row table, possibly
   with a local cell edit.
4. `applyPersistedCrdtDoc()` detects `blocks` invalidation and applies
   `record.blocks` to the target doc without a predecessor `baseRecord`.
5. The no-base block merge overwrites the target table body and drops the
   remote-prepended row.

This is not a malformed-table case. A pass-178 unit probe on the exact
known-fixes base generated the remote prepend through the real Table block
state helpers, `createTable()`, `insertRow()`, and `updateSelectedCell()`,
then reproduced the same no-base row loss.

Pass 179 also reproduced the loss through `SyncManager.load()` itself. The
probe serialized a persisted CRDT document containing the toolbar-shaped
remote-prepended table, loaded a stale current record through the sync manager,
and observed that the persisted-doc invalidation path called
`applyChangesToCRDTDoc( ydoc, { blocks }, undefined )` before dropping the
remote row.

## Evidence

The handoff manifest row says seed `956467` repeatedly left collaborators on
different `core/table.body` arrays after a WebSocket disconnect/reload
sequence. The supplementary triage row says one page kept the step-5 prepended
row while the other page stayed on the old two-row table.

The named source `STATUS.md` and `result.json` artifacts were not present under
the active checked roots during pass 178, and the row has
`playwrightStatus:"not_found"`. That keeps this below a standalone
browser-repro-ready classification.

Exact known-fixes base used for low-level verification:

```text
f256024286dd80a4c0e2579f658c109256abf648
```

Focused unit probes on that SHA:

```text
PASS packages/core-data/src/utils/test/crdt-67a5c5c224e8-persisted-no-base-pass176.test.ts
PASS packages/core-data/src/utils/test/crdt-67a5c5c224e8-base-choice-pass177.test.ts
PASS packages/core-data/src/utils/test/crdt-67a5c5c224e8-table-ui-path-pass178.test.ts
PASS packages/core-data/src/utils/test/crdt-67a5c5c224e8-manager-persisted-pass179.test.ts
```

The pass-178 probe observed:

```text
remote table rows: [["REMOTE-PREPEND"],["A1"],["A2"]]
no base result:    [["LOCAL-A1"],["A2"]]
old base result:   [["REMOTE-PREPEND"],["LOCAL-A1"],["A2"]]
```

The pass-179 `SyncManager.load()` probe observed the same manager-level
failure:

```text
applyChangesToCRDTDoc changes: { blocks: stale two-row table }
applyChangesToCRDTDoc options: undefined
resulting body rows: [["LOCAL-A1"],["A2"]]
persistCRDTDoc calls: 1
```

## Root Cause

In `packages/sync/src/manager.ts`, `_applyPersistedCrdtDoc()` applies a
persisted Yjs update to the target doc and then compares the persisted temp doc
against the current entity record. When it finds invalidated keys, it reduces
those keys to `record[key]` and calls:

```js
applyChangesToCRDTDoc( targetDoc, changes );
```

There is no `baseRecord` on this path. For block changes,
`packages/core-data/src/utils/crdt.ts` only passes a base into
`mergeCrdtBlocks()` when `options.baseRecord?.blocks` exists. Without that
base, the table body query array falls through to the ordinary no-base array
merge, where the stale two-row body can delete a concurrently observed
remote-prepended row.

Passing the already-updated persisted table as the base is not correct. Pass
177 showed that this still treats the stale two-row record as a delete of the
remote row. The preserving base is the predecessor snapshot for the stale
record edit.

The relevant origin point is `50b0a31ec01` / PR `#74668`, which introduced
the current `applyChangesToCRDTDoc( targetDoc, changes )` persisted-doc
invalidation call. Later stale-doc and query-array fixes improve surrounding
cases, but the known-fixes integration still has this no-base path.

## Practical Impact

Real-user likelihood: `low`.

The natural workflow is two collaborators editing the same post in the block
editor over RTC WebSocket sync. The post contains a normal Table block. One
collaborator inserts a row before the first body row through the Table toolbar
and types content in that row. Another collaborator reloads or reconnects while
the persisted CRDT document, target Y.Doc, and REST/core-data entity record are
out of phase. The risky path is the persisted-doc invalidation merge applying
stale `record.blocks` without the predecessor base.

Common prerequisites: Table blocks, table row insertion, and cell typing are
ordinary editor workflows. The Table UI writes replacement `body` arrays via
`insertRow()` and `setAttributes()`, matching the data shape in the low-level
probe.

Rare prerequisites: simultaneous RTC collaboration on the same table,
reload/reconnect or stale persisted-doc reconciliation timing, and a stale
record/CRDT ordering window where the target Y.Doc has the remote row but the
entity record does not.

Artificial or fuzz-only prerequisites in the original evidence: generated
marker strings, exact seeded action order, direct fuzz mutation of
`block.attributes.body`, and explicit sync fault injection. The pass-178 probe
removes the direct-array-mutation concern for the row-insert shape, but it does
not prove the exact browser timing with toolbar-only actions.

Blast radius: silent table row loss and collaborator divergence. If the stale
side saves or persists the damaged CRDT doc, the loss can become durable. There
is no evidence here for a locator failure, inverted assertion, crash, save
loop, performance/OOM issue, or UI-only inconsistency. Recovery is manual:
undo, copy the row from a peer that still has it, reload if the good CRDT state
wins, or restore from revisions/autosaves after persistence.

## Fix Direction

The fix should not special-case `core/table`. The invariant is that a stale
local/server block snapshot must not delete a remote structural query-array
edit unless the merge has causal evidence that the row was intentionally
deleted.

A robust fix needs one of these:

1. Carry the correct predecessor `baseRecord` into persisted-doc invalidation
   when applying stale `record.blocks`.
2. If that predecessor is unavailable, avoid destructively applying stale
   structural `blocks` over a target doc that already contains remote table
   structure. Prefer leaving the document dirty/conflicted or reconciling
   through an explicit safe path over silent content loss.

The tempting simple fix, using the post-remote persisted table as `baseRecord`,
is wrong and is covered by the pass-177 probe.

## Shortest Confidence-Improving Browser Experiment

Run one focused WebSocket Playwright probe on the known-fixes base:

1. Create a draft with a two-row, one-column Table block.
2. Open two collaborators.
3. In user A, select the first body row, use the Table toolbar to insert a row
   before it, and type a unique marker into the new row.
4. Reload or reconnect user B during a controlled transient sync delay.
5. After settle/save/reload, compare both editors and REST content.
6. Instrument `applyPersistedCrdtDoc()`, `getPostChangesFromCRDTDoc()`,
   `applyPostChangesToCRDTDoc()`, and `mergeCrdtBlocks()` to log whether stale
   `record.blocks` entered without `baseRecord`.
