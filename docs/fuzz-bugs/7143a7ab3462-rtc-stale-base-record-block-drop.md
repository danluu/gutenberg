# RTC stale base-record block drop

Fuzz signature: `7143a7ab3462`

Bug type: `rtc_supported_programmatic_paragraph_update_drop_after_group_insert`

## Status

This is a real unresolved defect in the May 7 synthetic RTC known-fixes stack at
`f256024286dd80a4c0e2579f658c109256abf648`. It is not directly reproducible on
latest `origin/trunk` as a small branch because trunk does not yet contain the
`baseRecord` CRDT edit path from that proposed fix stack.

The reduced failing shape is:

1. The local CRDT document contains an ordinary top-level remote block insert.
2. The local editor sends a supported full `blocks` update with a stale
   `baseRecord.blocks` snapshot that predates the remote insert.
3. The stale update edits or appends a nearby top-level paragraph.

On `f256024286d`, `mergeCrdtBlocks()` uses the explicit base snapshot as the
previous block list, but then skips the stale-local-block reconciliation that
the no-base path uses. The full-array merge can therefore align the stale local
paragraph update with the remote top-level block and delete the real following
block, or drop the remote insert.

## Impact

Real-user likelihood is `low`.

Normal ingredients are RTC collaboration, a post editor document with ordinary
paragraph and Group blocks, one collaborator inserting a top-level Group, and a
second collaborator editing a nearby paragraph. The rare prerequisite is a
scheduler state where the second collaborator's local CRDT has already received
the remote Group, while the outgoing `core-data` entity edit still carries a
stale full block snapshot that predates it.

The repeated browser route where the late joiner edits before the remote Group
is visible passed 10/10 times on `f256024286d`. The surviving proof is therefore
below the browser layer: the PR branch covers the direct block merge helper,
the post-level `applyPostChangesToCRDTDoc()` path, and `SyncManager.update()`
forwarding a stale `baseRecord`. These are supported RTC/core-data code paths,
but the exact scheduler ordering has not yet been reproduced with only natural
UI actions.

Blast radius is content loss/corruption if the bad peer saves: a remote
top-level block or a following paragraph can be removed or have content merged
onto the wrong block. There is no evidence of duplicate content, save loops,
REST persistence failures, or performance/OOM risk. Recovery would depend on
another peer still holding the correct state, undo/reload before saving, or
post revision recovery after saving.

## Fix Plan

Run stale-local-block reconciliation for explicit base-record edits too:

- keep using `baseRecord.blocks` as the previous snapshot for rebasing;
- pass that same base snapshot into `reconcileStaleLocalBlocks()`;
- let reconciliation reinsert remote top-level blocks that are present in the
  current Y.Doc but absent from both the stale local update and the base
  snapshot before the full-array merge runs.

The companion PR branch is based on `f256024286d`, not trunk, because the
affected `baseRecord` path is not yet in trunk.

The first PR-branch commit contains three focused regressions. Before the fix,
all three drop the remote append from `["Anchor","Tail","Remote append","Local
append"]` to `["Anchor","Tail","Local append"]`; after the fix, all three pass.
