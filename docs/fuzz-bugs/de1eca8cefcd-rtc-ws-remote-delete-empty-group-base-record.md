# RTC stale baseRecord can resurrect a deleted empty Group

Bug signature: `de1eca8cefcd`

The original websocket fuzz run reported that one collaborator kept an empty
top-level `core/group` after another collaborator deleted that Group following
nested cleanup. Earlier analysis showed that the no-base stale snapshot path was
covered by the RTC stale top-level block reconciliation work, but pass 177 found
a remaining normal editor path: `editEntityRecord()` sends the previous edited
record as `baseRecord`, and `applyPostChangesToCRDTDoc()` passes
`baseRecord.blocks` into `mergeCrdtBlocks()`.

At the manifest known-fixes SHA `f256024286dd80a4c0e2579f658c109256abf648`,
`mergeCrdtBlocks()` reconciles no-base stale local snapshots, but bypasses that
reconciliation when `baseBlocks` is provided. In the failing shape:

1. local and remote start with `[ paragraph(before), empty Group, paragraph(after) ]`;
2. remote deletes the empty Group, converging the CRDT to `[ before, after ]`;
3. local sends a stale sibling edit with `baseRecord.blocks` and incoming
   `blocks` that both still contain the empty Group;
4. the merge treats the stale Group as a local structural assertion and inserts
   it back into the CRDT.

This is a real product path because `packages/core-data/src/actions.js` passes
`{ baseRecord: editedRecord }` to the sync manager for ordinary entity edits,
and `packages/sync/src/manager.ts` forwards that base record to the entity sync
config.

Pass-179 A/B result:

- current `origin/trunk` `40c50514faded8c8d5474e80b7dff6fc71f7cd56`: fails,
  final block names are `[ "core/paragraph", "core/group", "core/paragraph" ]`;
- manifest known-fixes SHA `f256024286dd80a4c0e2579f658c109256abf648`: fails
  with the same resurrected Group;
- the branch fix passes by applying stale-local reconciliation even when
  `baseRecord.blocks` is supplied.

The practical impact of this exact signature is very low but real. A user needs
two live websocket RTC sessions on the same post, an empty top-level Group with
siblings, one peer deleting that Group after its nested content has already been
removed, and another peer sending a stale full `blocks` snapshot while editing a
surviving sibling. The resurrected block is empty, so visible content loss is
unlikely, but stale empty structure can reappear in the editor and be serialized
into post content on save. The same base-record gap is more important for the
broader stale top-level delete family because non-empty blocks can be restored
or reordered by the same stale-snapshot mistake.
