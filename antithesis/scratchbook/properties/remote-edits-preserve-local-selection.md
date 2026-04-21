# remote-edits-preserve-local-selection

## Summary

Remote content changes should shift the local collaborator's selection rather than snapping it back to a stale position.

## Evidence

- `packages/core-data/src/awareness/post-editor-awareness.ts` injects undo-ignored `selection` edits into the entity record on cursor movement.
- `packages/core-data/src/utils/crdt.ts` recalculates shifted selection from Yjs-relative positions after remote content changes.
- The code comments explicitly describe this as protection against cursor reset caused by other users editing.

## Relevant Code Paths

- `updateSelectionInEntityRecord()`
- `getSelectionHistory()`
- `getShiftedSelection()`
- remote-change branch of `getPostChangesFromCRDTDoc()`

## Failure Mode

After a collaborator edits nearby content, the local user can be moved back to an old selection, causing subsequent keystrokes to land in the wrong place.

## Planned Instrumentation

- Add `Reachable` markers when shifted selection is produced from history.
- Add workload-side `Always` assertions comparing logical cursor targets before and after remote edits.

## Existing Antithesis Instrumentation Status

- Missing.

## Assumptions

- The workload can inspect the current selection position from each editor session.

## Open Questions

- None.
