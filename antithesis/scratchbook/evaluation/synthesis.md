# Property Evaluation Synthesis

## Summary

Evaluation did not reveal blocking gaps after synthesis. The catalog was refined toward high-value Antithesis targets and one missing area was explicitly added.

## Findings And Actions

### Gap

- **Finding**: Collection-room liveness was underrepresented relative to the polling manager's paused-queue design.
- **Action taken**: Added `collection-room-updates-release-after-collaborator-detection`.

### Refinement

- **Finding**: Some product-gating behaviors are important but not strong Antithesis targets for the first pass.
- **Action taken**: Left site-editor disablement, document-size fallback, and incompatible-metabox fallback in the SUT analysis rather than the primary property catalog.

### Refinement

- **Finding**: Three guardrail properties are slightly more deterministic than the rest but still protect critical boundaries.
- **Affected properties**: `local-only-block-attributes-do-not-replicate`, `persisted-crdt-meta-does-not-sync-back-to-peers`, `client-id-hijack-is-rejected`
- **Action taken**: Kept them in the catalog at `Medium` priority with explicit SUT instrumentation suggestions.

## Result

- No unresolved biases remain for the current scope.
- The outputs are concrete enough for `antithesis-setup` and `antithesis-workload` to proceed.

## Assumptions

- The setup/workload phases will use a browser-capable client harness.

## Open Questions

- None.
