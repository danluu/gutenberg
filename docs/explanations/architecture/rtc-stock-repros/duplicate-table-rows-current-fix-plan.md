# RTC Duplicate Table Rows Current Fix Plan

This note is for WordPress/gutenberg#77723 after the branch was updated with
the trunk changes that include CRDT merge work from #77658.

## Current Status

The original public evidence showed visible divergence between two editors. On
the current branch, the same scenario no longer appears to diverge in local
testing. Instead, both editors can converge to the wrong logical result.

Scenario:

1. A collaborative post contains a one-column table with rows `anchor`, `same`,
   `same`.
2. Editor A edits the later duplicate row to `edited-second-duplicate`.
3. Editor B deletes the earlier duplicate row.
4. The correct final visible rows are `anchor`,
   `edited-second-duplicate`.

The failing browser test receives `anchor`, `same`. That is not a harmless
change in expected output. It means the edit to the later duplicate row was
lost, or the delete was matched to the wrong logical row.

## Why The Lower-Level Tests Pass

The current lower-level CRDT tests create local user snapshots from
`deserializeBlockAttributes( yblocks.toJSON() )`. That path injects the hidden
row and cell identity symbols needed by the table merge code.

The browser path can start from serialized post HTML parsed into block
attributes. Those parsed row and cell objects do not necessarily have the hidden
CRDT identity symbols. If a local table edit/delete is merged back into the CRDT
without those identities, the duplicate rows fall back to value matching. For
two rows whose visible value is `same`, value matching cannot distinguish the
earlier duplicate from the later duplicate.

## Required Fix Direction

The existing row/cell identity work in `packages/core-data` is necessary but not
sufficient. The editor-visible block attributes need to receive the CRDT-derived
row and cell identities when the sync manager initializes or applies the CRDT
document.

The sync manager should, after creating/applying the CRDT state for an entity,
read the normalized CRDT state back through the entity's `SyncConfig` and apply
the resulting changes to the local edited record with undo ignored.

In outline:

```js
const changes = syncConfig.getChangesFromCRDTDoc( targetDoc, record );
if ( Object.keys( changes ).length ) {
	handlers.editRecord( changes, { undoIgnore: true } );
}
```

This should be done against the live target document, not only against a
temporary persisted document, because the live document contains the normalized
state that should be visible to the local editor.

The important cases are:

- no persisted CRDT document exists yet;
- a valid persisted CRDT document exists and visible content matches;
- a persisted CRDT document exists but is invalidated by current record fields.

## Test Plan

Keep the browser expected result as `anchor`, `edited-second-duplicate`.

Add or update sync-manager tests so loading an entity can reflect normalized CRDT
state back into the local record with `{ undoIgnore: true }`. In particular, the
old expectation that `getChangesFromCRDTDoc` is not called when no persisted
document exists is no longer correct for synced block records that require CRDT
normalization.

Then run the focused checks:

```bash
npm run test:unit -- packages/sync/src/test/manager.ts packages/core-data/src/utils/test/crdt-table-duplicates-repro.test.ts packages/core-data/src/utils/test/crdt-table-query-identity.test.ts packages/core-data/src/utils/test/crdt.ts --runInBand
npm run test:unit -- packages/block-library/src/table/test/state.js --runInBand
npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-table-duplicates.spec.ts
```

The PR description should also be updated before review to describe the current
bug as duplicate table row logical identity loss / wrong-row convergence, with
the older divergence video treated as historical evidence unless current-head
divergence is reproduced again.
