# out-of-band-server-mutations-repersist-clean-crdt

## Summary

When the server mutates a record outside the local CRDT view, the client should repair only the invalidated keys and persist a corrected CRDT document.

## Evidence

- `packages/sync/src/manager.ts` explicitly lists server-side mutation and out-of-band update as invalidation sources.
- `packages/core-data/src/test/resolvers.js` covers the persistence hook that saves the repaired document back through `saveEntityRecord()`.
- `packages/core-data/src/utils/crdt.ts` has specialized comparisons for content, floating dates, and meta filtering.

## Relevant Code Paths

- `applyPersistedCrdtDoc()`
- `prePersistPostType()`
- post-specific `getChangesFromCRDTDoc()`

## Failure Mode

The system may continue from a stale CRDT base, leading to later merge corruption or repeated repair attempts that never stabilize.

## Planned Instrumentation

- Add `Reachable` markers when invalidated keys are detected and when repair persistence is triggered.
- Add workload-side `Always` assertions comparing saved record fields with the re-persisted `_crdt_document` view.

## Existing Antithesis Instrumentation Status

- Missing.

## Assumptions

- The workload can induce a server-side mutation through save/autosave or an external update path.

## Open Questions

- None.
