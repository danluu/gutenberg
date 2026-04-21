# persisted-crdt-reload-does-not-duplicate-content

## Summary

Rejoining from persisted CRDT state should not create duplicate inserts or unintended deletions even if the saved record and persisted CRDT document diverge briefly.

## Evidence

- `packages/sync/src/manager.ts` applies a persisted document first, then computes invalidations against the current record.
- The comments explicitly call out duplicate inserts/deletions as a risk if persisted state and saved post diverge.
- `packages/sync/src/test/manager.ts` covers valid and invalid persisted-document paths, but only in unit-level form.

## Relevant Code Paths

- `applyPersistedCrdtDoc()`
- `deserializeCrdtDoc()`
- `getChangesFromCRDTDoc()` for posts

## Failure Mode

After refresh or reconnect, the user can see duplicated content, missing content, or peers that now disagree on canonical state.

## Planned Instrumentation

- Add `Reachable` markers for "valid persisted doc" and "invalidated keys" branches.
- Add a workload-side `Always` assertion comparing canonical post state before and after a refresh/rejoin cycle.

## Existing Antithesis Instrumentation Status

- Missing.

## Assumptions

- The workload can force refreshes while collaborators continue editing.

## Open Questions

- None.
