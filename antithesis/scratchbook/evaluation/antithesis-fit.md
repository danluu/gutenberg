# Evaluation Lens: Antithesis Fit

## Summary

The catalog is concentrated in Antithesis's sweet spot: interleavings between browser-side CRDT updates, save/autosave boundaries, transport retries, room-level permission failures, and awareness cleanup. Most properties require timing-sensitive exploration that unit tests only approximate.

## Findings

### Catalog-wide

- The strongest-fit properties are `concurrent-rich-text-edits-converge`, `concurrent-block-tree-edits-preserve-structure`, `persisted-crdt-reload-does-not-duplicate-content`, `draft-autosaves-do-not-diverge-canonical-state`, `poll-failures-recover-without-losing-local-updates`, and `compaction-does-not-discard-unseen-updates`.
- These properties all depend on fault timing or concurrent ordering that deterministic tests cannot exhaustively cover.

### Property-specific

- `local-only-block-attributes-do-not-replicate`, `persisted-crdt-meta-does-not-sync-back-to-peers`, and `client-id-hijack-is-rejected` are somewhat more deterministic than the rest. They remain worth keeping because they guard security/correctness boundaries adjacent to the concurrent merge path, but they were kept at `Medium` priority rather than `High`.
- Low-fit product gates such as site-editor disablement, document-size fallback, and incompatible-metabox fallback were intentionally left out of the primary catalog. They matter, but they are better covered by deterministic tests unless they are later folded into a broader degraded-mode workload.

## Actions Taken

- Kept the three medium-fit guardrail properties at lower priority.
- Excluded lower-value static gating properties from the main catalog.

## Passes

- The catalog has a healthy mix of safety and liveness properties.
- Transport and persistence are emphasized appropriately for Antithesis.

## Uncertainties

- None blocking.
