# local-only-block-attributes-do-not-replicate

## Summary

Attributes intentionally marked local to one editor must never propagate into replicated CRDT state.

## Evidence

- `packages/core-data/src/utils/crdt-blocks.ts` removes attributes whose schema is treated as local (`role=local`) before serializing block data into the CRDT representation.
- This filtering happens in the same path that serializes nested attribute values, so a regression could leak hidden editor-local state to peers.

## Relevant Code Paths

- `makeBlockAttributesSerializable()`
- `isLocalAttribute()` logic in `crdt-blocks.ts`
- block attribute serialization/deserialization helpers

## Failure Mode

Peer-visible block attributes could contain data that should remain local to one editor session, producing silent divergence or privacy leakage.

## Planned Instrumentation

- Add an `Unreachable` or debug `Reachable` marker if a filtered local attribute is ever about to be written to a CRDT map.
- Add workload-side `Always` checks that peer-rendered block attributes exclude local-only values.

## Existing Antithesis Instrumentation Status

- Missing.

## Assumptions

- The workload can install or use a block with a known local-only attribute.

## Open Questions

- None.
