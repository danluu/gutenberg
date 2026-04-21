# persisted-crdt-meta-does-not-sync-back-to-peers

## Summary

The `_crdt_document` persistence blob must remain a persistence-only detail, not replicated peer state.

## Evidence

- `packages/core-data/src/utils/crdt.ts` defines `_crdt_document` and explicitly excludes it from synced post meta.
- `prePersistPostType()` writes the serialized CRDT document into post meta before save.
- If that same key were later synced through ordinary meta replication, the system would feed persistence state back into its own merge path.

## Relevant Code Paths

- `POST_META_KEY_FOR_CRDT_DOC_PERSISTENCE`
- `disallowedPostMetaKeys`
- `prePersistPostType()`

## Failure Mode

Peers may receive the serialized document as ordinary meta, creating opaque meta churn or recursive corruption in later save/rehydration cycles.

## Planned Instrumentation

- Add a `Reachable` or `Unreachable` marker when `_crdt_document` is encountered in outbound synced meta.
- Add workload-side `Always` assertions that peer-visible meta never contains this key.

## Existing Antithesis Instrumentation Status

- Missing.

## Assumptions

- The workload can inspect post meta from peer-visible REST reads.

## Open Questions

- None.
