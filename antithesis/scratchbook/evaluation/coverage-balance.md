# Evaluation Lens: Coverage Balance

## Summary

The catalog covers the three highest-risk areas identified in the SUT analysis:

- CRDT merge and editor-state correctness
- persistence/save/autosave boundaries
- transport recovery and room isolation

## Findings

### Catalog-wide

- Coverage is balanced across client merge logic, PHP relay behavior, and persistence repair.
- The catalog includes both entity rooms and collection rooms, which matters because the transport explicitly treats them differently.

### Gap Filled During Evaluation

- An initial draft underweighted collection-room behavior. `collection-room-updates-release-after-collaborator-detection` was retained to cover the paused-queue design in the polling manager.

### Deliberate Omissions

- Post-lock fallback, metabox compatibility gating, and site-editor disablement are documented in the SUT analysis but not promoted to primary properties in this pass. They are important secondary checks, but the current catalog prioritizes failure modes where Antithesis is likely to find new bugs.

## Actions Taken

- Kept one explicit property for collection-room liveness.
- Kept two distinct persistence-repair properties rather than collapsing them, because startup races and server-side mutations are different failure classes.

## Passes

- Safety, liveness, and reachability guidance are all represented.
- The catalog is not overly concentrated in a single module.

## Uncertainties

- None blocking.
