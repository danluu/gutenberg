# RTC stale base-record snapshot can undo a paragraph move into a Group

Bug signature: `74369be1e6ba`

The original handoff described a websocket RTC divergence from seed `953306`.
After one collaborator moved a top-level Paragraph into an existing Group, the
other peer could keep that same Paragraph at top level and leave the Group
without the moved child.

Pass 172 found a narrower current-base gap. The known-fixes branch already has
stale full-block snapshot reconciliation, but `editEntityRecord` sends synced
post edits to the sync manager with `baseRecord: editedRecord`. In
`mergeCrdtBlocks`, the current known-fixes code bypasses
`reconcileStaleLocalBlocks()` whenever `baseBlocks` is supplied. That means a
stale full-block snapshot with a normal base record can still reintroduce a
paragraph that a remote peer moved out of the top-level list.

The reduced sequence is:

1. Both peers start with a top-level Paragraph after a Group.
2. Peer A moves that Paragraph into the Group.
3. Peer B receives Peer A's CRDT update.
4. Peer B publishes a stale pre-move full block snapshot with an unrelated
   Paragraph text edit and the usual `baseRecord` supplied by core-data.

On `/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-current-20260507` at
`f256024286dd80a4c0e2579f658c109256abf648`, the reduction fails before the
candidate fix by leaving the moved block top-level. With no explicit
`baseRecord`, older reductions passed, which is why this signature was
previously classified too negatively.

The smallest candidate fix is to let stale-snapshot reconciliation use the
supplied base blocks as the previous local snapshot instead of disabling
reconciliation. That preserves the remote move while keeping the unrelated
local text edit.

Practical impact is low to medium. The user workflow is natural: two
collaborators in the post editor over websocket RTC, Paragraph and Group blocks,
one user moves a Paragraph into the Group, and another user's stale block tree
flushes after an unrelated edit. The timing requirement is the rare part. If it
happens, the blast radius is semantic content corruption: duplicate or stale
block placement that can be persisted if the bad peer saves. Reload plus manual
cleanup recovers the UI state when unsaved; saved corruption requires manual
repair or revision restore.

The available Playwright artifact for this signature is not product evidence:
it times out in the old websocket readiness wait for `wp-sync` before taking
snapshots or applying the move. A useful browser follow-up is to port the seed
953306 list-view move spec to the current websocket-aware fixture and assert the
moved Paragraph's `clientId` is absent top-level and is the first Group child on
both peers after convergence.
