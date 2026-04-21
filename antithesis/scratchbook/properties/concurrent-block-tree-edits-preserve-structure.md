# concurrent-block-tree-edits-preserve-structure

## Summary

Concurrent structural edits should not leave peers with malformed or divergent block trees.

## Evidence

- `packages/core-data/src/utils/crdt-blocks.ts` contains specialized merge logic for nested blocks, rich-text-bearing attributes, and block identity handling.
- `packages/core-data/src/utils/crdt.ts` routes `blocks` changes through `mergeCrdtBlocks()`.
- Recent changelog entries cite fixes for table-cell merges, edit-as-HTML resets, and array-attribute stability.

## Relevant Code Paths

- `mergeCrdtBlocks()`
- `deserializeBlockAttributes()`
- `applyPostChangesToCRDTDoc()` for `blocks`

## Failure Mode

Peers may end with different block trees, invalid nested structures, or unexpected block replacement after interleaved insert/move/delete operations.

## Planned Instrumentation

- Add `Reachable` markers at structural merge branches that handle replace/move/delete outcomes.
- Add workload-side `Always` assertions comparing normalized serialized block trees across peers.

## Existing Antithesis Instrumentation Status

- Missing.

## Assumptions

- The workload can obtain a normalized block serialization rather than raw client IDs.

## Open Questions

- None.
