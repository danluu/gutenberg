# peer-save-triggers-record-and-collection-refresh

## Summary

One collaborator's save should eventually cause other collaborators to refetch the affected record or collection and converge on the saved state.

## Evidence

- `packages/sync/src/manager.ts` watches `savedAt` in the state map and triggers `refetchRecord()` or `refetchRecords()` when remote save metadata advances.
- `packages/core-data/src/resolvers.js` wires the refetch handlers into sync-manager load/loadCollection.
- `changelog.txt` includes a regression fix specifically for refetching entities when saved by a peer.

## Relevant Code Paths

- `onStateMapUpdate()` in entity and collection paths
- `markEntityAsSaved()`
- resolver-provided `refetchRecord` / `refetchRecords` callbacks

## Failure Mode

Peers continue editing against stale saved state and may compute wrong unsaved diffs or overwrite server-side changes unintentionally.

## Planned Instrumentation

- Add `Reachable` markers when remote `savedAt` triggers a refetch path.
- Add a `Sometimes(cond)` assertion when a peer observes another peer's saved state after the save notification.

## Existing Antithesis Instrumentation Status

- Missing.

## Assumptions

- The workload can distinguish local unsaved edits from server-refetched state.

## Open Questions

- None.
