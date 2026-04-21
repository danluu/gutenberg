# Property Relationships

## Cluster: Merge And Editor Correctness

Properties:

- `concurrent-rich-text-edits-converge`
- `concurrent-block-tree-edits-preserve-structure`
- `local-only-block-attributes-do-not-replicate`
- `remote-edits-preserve-local-selection`
- `collection-room-updates-release-after-collaborator-detection`

Notes:

- These all depend on the correctness of `applyPostChangesToCRDTDoc()`, `getPostChangesFromCRDTDoc()`, and the timing of polling-driven remote update delivery.
- `concurrent-block-tree-edits-preserve-structure` is the broadest structural property in this cluster.
- `remote-edits-preserve-local-selection` is downstream of content convergence but still worth keeping separate because cursor corruption can occur even when document state converges.

## Cluster: Persistence And Save Boundaries

Properties:

- `persisted-crdt-reload-does-not-duplicate-content`
- `out-of-band-server-mutations-repersist-clean-crdt`
- `peer-save-triggers-record-and-collection-refresh`
- `draft-autosaves-do-not-diverge-canonical-state`
- `persisted-crdt-meta-does-not-sync-back-to-peers`

Notes:

- `draft-autosaves-do-not-diverge-canonical-state` and `persisted-crdt-reload-does-not-duplicate-content` are tightly linked; autosave divergence is one way to trigger reload corruption.
- `out-of-band-server-mutations-repersist-clean-crdt` partially dominates `persisted-crdt-reload-does-not-duplicate-content` for server-side mutation scenarios, but not for concurrent remote-edit startup races.
- `persisted-crdt-meta-does-not-sync-back-to-peers` is a guardrail property that protects the whole persistence model.

## Cluster: Transport Recovery And Isolation

Properties:

- `poll-failures-recover-without-losing-local-updates`
- `compaction-does-not-discard-unseen-updates`
- `forbidden-room-isolated-from-other-sync-rooms`
- `client-id-hijack-is-rejected`
- `awareness-clears-stale-collaborators-after-refresh`

Notes:

- `poll-failures-recover-without-losing-local-updates` and `compaction-does-not-discard-unseen-updates` share relay-storage and queue-recovery evidence.
- `forbidden-room-isolated-from-other-sync-rooms` and `client-id-hijack-is-rejected` both center on PHP-side room admission and per-room isolation.
- `awareness-clears-stale-collaborators-after-refresh` depends on the same transport behavior as recovery properties, but is logically separate because it targets presence cleanup rather than document convergence.

## Suspected Dominance

- If `poll-failures-recover-without-losing-local-updates` fails badly enough, `concurrent-rich-text-edits-converge` and `concurrent-block-tree-edits-preserve-structure` are likely to fail as downstream symptoms.
- If `persisted-crdt-meta-does-not-sync-back-to-peers` fails, both persisted-doc reload properties become suspect.
- `compaction-does-not-discard-unseen-updates` is a narrower but deeper storage-safety property than general poll recovery.

## Assumptions

- The initial workload will deliberately exercise both editor-visible and transport-visible paths so these clusters remain connected in a single harness.

## Open Questions

- None.
