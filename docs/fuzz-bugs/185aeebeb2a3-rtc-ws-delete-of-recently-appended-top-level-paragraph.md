# RTC WebSocket delete of recently appended paragraph can be undone by a stale block snapshot

Bug signature: `185aeebeb2a3`

The fuzzer reported a WebSocket RTC divergence where one collaborator appended a top-level paragraph, both peers saw it, and another collaborator deleted that paragraph, but the delete did not persist on both peers.

## Root cause

The editor sync path sends full `blocks` snapshots into `mergeCrdtBlocks`. A stale full snapshot can still contain a top-level block that another peer has already deleted. On current trunk, the top-level merge treats that stale snapshot as authoritative and inserts the deleted block again.

The backlink-aware known-fixes base added stale top-level reconciliation, but the exact `f256024286dd80a4c0e2579f658c109256abf648` integration still skipped that reconciliation when a `baseRecord.blocks` snapshot was supplied. Normal `editEntityRecord` calls provide a base record to the sync manager, so a stale base-record edit could still resurrect the deleted block. A focused CRDT probe on `f256024286dd80a4c0e2579f658c109256abf648` reproduced this: after a remote delete, a stale base-record edit of a different paragraph brought the deleted `Gamma` paragraph back.

Pass 177 added an adapter-level reproduction through `applyPostChangesToCRDTDoc` rather than calling `mergeCrdtBlocks` directly. On pinned known-fixes base `f256024286dd80a4c0e2579f658c109256abf648`, the remote delete first converged to `["Alpha","Beta"]`, then a stale base-record edit restored `Gamma` and produced `["Alpha local edit","Beta","Gamma"]`. The same temporary adapter-level test passed on the fix branch head.

## User workflow

The natural workflow is ordinary collaborative editing, but the timing is specific:

- Two collaborators edit the same post in the post editor with RTC WebSocket sync enabled.
- User B appends a top-level Paragraph.
- User A deletes that paragraph after it is visible.
- User B emits another block edit from a local snapshot that still contains the deleted paragraph, such as continuing to type or changing a nearby paragraph before the remote delete has been fully incorporated into B's local edit base.

The exact seed text and surrounding multibyte content are fuzzing details. The block types and editing actions are normal.

## Impact

The visible failure is stale content resurrection: a paragraph deleted by one collaborator can reappear because another collaborator's stale block snapshot reintroduces it. If the resurrected peer saves, the stale paragraph can become persisted post content. This is not an OOM or save-loop issue, and the recovery path is usually to delete the paragraph again after the sessions settle, but it is still content loss/corruption from the user's perspective.

## Fix direction

Treat local full-block snapshots as deltas relative to a known local base, not as an unconditional replacement of the current CRDT top-level block list.

The fix should:

- keep a previous local block snapshot per `Y.Array`;
- compare the incoming local snapshot, the previous/base snapshot, and the current CRDT snapshot by stable `clientId`;
- drop blocks that are present in the local/base snapshot but absent from the current CRDT because a remote peer deleted them;
- preserve current CRDT blocks that are absent from both the local and base snapshots because a remote peer inserted them;
- apply the same reconciliation when an explicit `baseRecord.blocks` snapshot is provided by the sync manager.
