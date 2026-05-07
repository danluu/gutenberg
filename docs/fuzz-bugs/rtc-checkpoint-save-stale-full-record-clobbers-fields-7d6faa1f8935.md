# RTC checkpoint save can persist a stale full post record

Bug signature: `7d6faa1f8935`

Bug type: `rtc_checkpoint_save_stale_full_record_clobbers_fields`

Transport: HTTP polling RTC

## Summary

The original fuzz report describes a normal collaborative editor save where a
checkpoint save is followed by a stale full-record save. The stale save can
persist older `title` or `content` fields while RTC metadata continues to
advance.

I reproduced the same practical failure class on the May 7 known-fixes base
`f256024286dd80a4c0e2579f658c109256abf648` with the natural same-account stale
save regression:

```bash
WP_ENV_PORT=9962 \
WP_BASE_URL=http://localhost:9962 \
npm run test:e2e -- \
	test/e2e/specs/editor/collaboration/collaboration-same-user-stale-content-overwrite.spec.ts
```

The first test failed after a normal two-window workflow. Window A saved marker
`rtc-a-1778196919718-1`; before window B received that marker through polling,
window B saved marker `rtc-b-1778196919718-1`. The final persisted post content
contained B and lost A. The saved `_crdt_document` also contained B and not A, so
the problem was persistent content/CRDT corruption rather than a UI-only split.

## User Workflow

The natural workflow is:

1. Open the same draft in two editor windows or two collaborators.
2. Window A appends paragraph content and clicks `Save draft`.
3. Before HTTP polling has delivered A's edit to window B's editor canvas,
   window B appends its own paragraph and clicks `Save draft`.

No malformed blocks, direct store mutation, or network fault injection is
required. The timing requirement is that the stale window saves during the
polling lag after another save.

## Impact

The blast radius is persistent content loss on the affected post. A later reload
shows the stale save result, and the CRDT document may agree with the stale
content, which removes the normal RTC recovery path. Users can recover only if a
browser tab, undo history, autosave, or revision still contains the lost text.

This is not a save loop, OOM, or performance bug. It is a last-writer stale
snapshot bug in the save/RTC persistence boundary.

## Root Cause

The save boundary trusts a stale full-record editor snapshot too much. On save,
`prePersistPostType()` asks the sync manager for a CRDT record and writes a new
persisted `_crdt_document`. In the failing two-window sequence, the latest REST
record already contains window A's saved paragraph, while window B's edited
content and local CRDT record still contain only B's stale paragraph. The CRDT
record path can therefore choose the B-only body and skip the later serialized
block fallback merge. The response persists B-only `content` and a B-only
`_crdt_document`, so reload cannot recover A from RTC state.

The first implementation pass only handled stale serialized content after the
CRDT path. The natural browser rerun showed the remaining gap: window B had
already fetched A through REST, but `getCRDTRecordData()` still returned the
stale B-only content. The fix must apply the same latest-vs-local block merge to
content returned from the CRDT record before allowing it to replace the latest
saved body.

## Origin

The risky boundary was introduced by `2d8b22633dd` (`Real-time collaboration:
Implement CRDT persistence for collaborative editing`, #72373), which added
save-time CRDT persistence for post entities. `8051e14451c` (`RTC: Fix stale
CRDT document persisted on save`, #75975) made that persistence async and moved
serialization closer to the save path, but still serialized the current local
CRDT document. Later sync changes, including `85cbd148b1c` (#77966), improved
hydration/order for loaded documents but did not add a compare-and-merge guard
for a stale full-record save racing a fresher REST record.

## Fix Plan

1. When a save has local `content` edits, fetch the latest REST record and keep
   latest saved fields that the stale save did not intentionally change.
2. For serialized block content, merge non-conflicting stale-local and
   latest-saved blocks rather than letting the stale full body overwrite the
   latest body.
3. Apply that same merge when the local CRDT record still returns stale content.
4. Serialize the final save payload back into the CRDT document before storing
   `_crdt_document`, so persisted content and RTC recovery state agree.

Robustness notes: the merge is intentionally narrow. It preserves independent
top-level block edits and shared-prefix appends, but it does not invent a merge
for the same block changed in two places. In that conflict case, the save keeps
the existing CRDT conflict behavior instead of guessing.
