# Evaluation Lens: Implementability

## Summary

The catalog is implementable, but most properties require a browser-capable workload and a small amount of surgical SUT instrumentation.

## Findings

### Catalog-wide

- A realistic workload must open at least two authenticated editor sessions; API-only tests will not cover selection, awareness, and block-editor integration semantics.
- The planned three-container topology is sufficient for all cataloged properties.

### Property-specific instrumentation needs

- `persisted-crdt-reload-does-not-duplicate-content`, `out-of-band-server-mutations-repersist-clean-crdt`, and `peer-save-triggers-record-and-collection-refresh` need SUT-side markers around `applyPersistedCrdtDoc()`, `markEntityAsSaved()`, and refetch callbacks.
- `poll-failures-recover-without-losing-local-updates` and `compaction-does-not-discard-unseen-updates` need transport markers around queue replacement, compaction nomination, and storage pruning branches.
- `forbidden-room-isolated-from-other-sync-rooms` and `client-id-hijack-is-rejected` need PHP-visible assertions or at least replay anchors in `WP_HTTP_Polling_Sync_Server`.

## Actions Taken

- Every evidence file now calls out likely instrumentation points.
- No cataloged property requires a topology broader than `workload -> wp-app -> db`.

## Passes

- No property requires unsupported cross-service consensus behavior.
- No property depends on a second WordPress replica.

## Uncertainties

- The exact browser harness choice is deferred to setup/workload, but that is an implementation detail, not a catalog blocker.
