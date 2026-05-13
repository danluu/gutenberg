# RTC base-record stale top-level move can drop remote blocks

## Summary

Fuzz signature `ed4e7b0d24e7` was reported from a WebSocket RTC run as
`rtc_top_level_move_after_reload_and_pullquote_duplicates_adjacent_paragraph`.
The archived browser endpoint was a split after a reload, a top-level Pullquote
edit, and a later adjacent Paragraph move: one peer ended with
`Another -> Emoji -> Heading -> Group -> Pullquote`, while the other ended with
`Another -> Another -> Heading -> Group -> Pullquote`.

The runnable generated WebSocket spec for this signature is not a sufficient
product repro. It waits for HTTP `wp-sync` responses even after installing the
WebSocket provider, so it fails before the first state snapshot and before the
final toolbar move.

The useful reduced evidence is at the CRDT/product-route level on the May 7
synthetic known-fixes base `f256024286dd80a4c0e2579f658c109256abf648`. That
base includes proposed RTC PR `77924`, which passes an explicit `baseRecord`
from `editEntityRecord()` into sync updates. In that stack, a stale adjacent
top-level Paragraph move can omit a remote-only top-level Pullquote from the
snapshot being merged. The pre-existing stale-local reconciliation handles the
cached-history path, but the explicit-base path bypasses that reconciliation.

Current `origin/trunk` at `5a651121865a9352b6ab782f70fe85e1bfebbe23`
(fetched 2026-05-13) does not yet pass `baseRecord` through the same
`getSyncManager()?.update()` call, so this document tracks a proposed-stack
regression risk rather than a directly reproduced trunk bug.

## Minimal Failing Shape

The minimal failing sequence uses normal block data and the normal post CRDT
apply route:

1. Start with top-level blocks:
   `Paragraph(Emoji), Paragraph(Another), Heading, Group`.
2. The stale mover has locally applied that initial block snapshot, so its
   local CRDT block cache matches the editor view before the remote change.
3. A remote peer appends a top-level Pullquote and the stale mover receives the
   Yjs update.
4. The stale mover publishes a top-level adjacent Paragraph move from
   `[ Emoji, Another, Heading, Group ]` to
   `[ Another, Emoji, Heading, Group ]`.
5. When that move is applied with `{ baseRecord: { blocks: initialBlocks } }`,
   `mergeCrdtBlocks()` on `f256024286d` drops the remote-only Pullquote.

A pass-175 scratch test showed the boundary:

- Without an explicit `baseRecord`, the same stale move preserves the remote
  Pullquote because cached local history drives stale-block reconciliation.
- With an explicit `baseRecord`, the remote Pullquote is dropped on
  `f256024286d`.
- Applying the fix hunk carried by PR-branch commit
  `425764ce85c9183550ba0fb17651e18b0541a461` makes both cases pass.

A pass-176 scratch test moved the proof one level closer to browser behavior.
It used `SyncManager.update()` and the real post CRDT adapter, then applied a
provider-style Yjs update containing the remote Pullquote into the stale
editor's document. The stale editor scheduled the Paragraph move before the
remote store reconciliation tick completed. On `f256024286d`, that manager-level
race still dropped the Pullquote; after the same fix hunk, it passed. This is
the natural event ordering a browser user can create by acting on a stale editor
view immediately after a collaborator's remote update has reached the CRDT
document.

A pass-177 verification reran the two regression files on the exact May 7
known-fixes base with only the test commit applied. The cached-history control
passed, while the explicit-base CRDT case and the `SyncManager.update()` race
both dropped `remote-pullquote`. The same two files passed on the PR branch
containing the fix.

A pass-178 verification repeated that check after refreshing `origin/trunk` to
`a0a24a30a37`. On a clean scratch worktree at `f256024286d` with only the test
commit applied, the cached-history control still passed, while the explicit-base
CRDT case and the `SyncManager.update()` race both dropped `remote-pullquote`.
On PR-branch commit `425764ce85c9183550ba0fb17651e18b0541a461`, all three tests
passed.

A pass-179 verification refreshed `origin/trunk` again to
`a6cc01ba412ca96982e977c3ffb734a091cb5626` and confirmed the same current-trunk
boundary: `editEntityRecord()` still calls `getSyncManager()?.update()` with
`{ isNewUndoLevel }`, and `applyPostChangesToCRDTDoc()` still calls
`mergeCrdtBlocks()` without a base snapshot. The open PR #77924 head
`1a46ebf1621c866c12a95c12c2097bc4e50c3eb5` was also checked directly. Its
diff introduces `{ baseRecord: editedRecord, isNewUndoLevel }` and forwards
`options.baseRecord?.blocks`, but its `mergeCrdtBlocks()` path has no
`reconcileStaleLocalBlocks()` preservation step for remote-only blocks. A
scratch attempt to run the existing reduced tests on that PR head did not reach
the assertion because Jest failed to resolve `uuid` from the linked dependency
tree; that run is test-environment evidence only, not a product pass or fail.

A pass-180 verification refreshed `origin/trunk` to
`5a651121865a9352b6ab782f70fe85e1bfebbe23` and confirmed the current-trunk
boundary still holds. It also checked the newer open PR #77924 head
`1bda16e1a1921c35d84bfb11cfac025400ee15ae` directly. With only regression
commit `e2766e12e73` cherry-picked, that PR head now reaches the assertions and
fails all three reduced tests: the `SyncManager.update()` race drops
`remote-pullquote`, the explicit-base CRDT case drops `remote-pullquote`, and
the cached-history CRDT control also drops `remote-pullquote`. The exact May 7
known-fixes base still fails the expected two explicit-base/manager cases, and
PR-branch commit `425764ce85c9183550ba0fb17651e18b0541a461` still passes all
three tests.

## Root Cause

On `f256024286d`, `packages/core-data/src/actions.js` sends editor sync updates
as:

```js
getSyncManager()?.update(
	objectType,
	objectId,
	editsWithMerges,
	origin,
	{ baseRecord: editedRecord, isNewUndoLevel }
);
```

`packages/core-data/src/utils/crdt.ts` forwards
`options.baseRecord?.blocks` into `mergeCrdtBlocks()`.

In `packages/core-data/src/utils/crdt-blocks.ts`, the integration commit keeps
the explicit base as `previousBlocks`, but sets `blocksToSync` to the stale
local editor snapshot directly:

```ts
const previousBlocks =
	baseBlocksToSync ?? previousLocalBlocksCache.get( yblocks );
const blocksToSync = baseBlocksToSync
	? localBlocksToSync
	: reconcileStaleLocalBlocks( yblocks, localBlocksToSync );
```

That means explicit-base edits skip `reconcileStaleLocalBlocks()`. Remote-only
top-level blocks that are present in the Y.Doc but absent from the stale editor
snapshot are interpreted as intentional removals.

`SyncManager` makes the race plausible rather than purely synthetic. Remote Yjs
updates increment `remoteKeyVersions` and mark keys as reconciling before the
local editor store has necessarily rendered the remote blocks. A local editor
action scheduled after that version increment captures the current version and
is allowed through the reconciliation filter, even if its `baseRecord.blocks`
and outgoing `blocks` were computed from the stale editor view.

The direct PR #77924 head inspection matters because the May 7 known-fixes base
is a conflict-resolved synthetic stack. The vulnerable ingredients are present
in the PR head itself: the editor action passes an explicit pre-edit base, the
post CRDT adapter forwards that base into block merging, and the block merge can
fall back to whole-array diff/delete behavior when the current Y.Doc has an
extra remote-only block. As of PR head
`1bda16e1a1921c35d84bfb11cfac025400ee15ae`, `rebaseYBlocksByClientId()` only
runs when the current and incoming arrays have the same length. In this bug's
shape, current has five top-level blocks while incoming/base have four, so the
merge falls through to the array diff and deletes the remote-only Pullquote.
The pass-180 evidence therefore supports "the current PR #77924 shape is still
vulnerable unless paired with the extra preservation fix", not a claim that
current trunk is already affected.

The proposed fix is small: let `reconcileStaleLocalBlocks()` accept the explicit
base snapshot and call it in the explicit-base branch too.

## User Impact

Practical likelihood: low for active RTC users of the May 7 proposed-stack
shape or open PR #77924 without the extra preservation fix; very low for
ordinary single-user Gutenberg and for current trunk as of 2026-05-13.

Natural workflow:

- Surface: post editor.
- Transport: RTC collaboration, originally WebSocket.
- Blocks: adjacent top-level Paragraphs, a Heading, a Group, and a top-level
  Pullquote.
- Timing: at least two tabs/users; one peer has a stale pre-Pullquote base
  after reload or state lag while another peer has already inserted or edited a
  top-level Pullquote.
- Action: the stale peer moves an adjacent top-level Paragraph.
- Save/reload: reload is part of the archived fuzz workflow and makes stale
  base state plausible. A save is not required for the in-memory loss, but a
  save from the corrupted peer could persist the bad tree.

Common prerequisites are normal editor operations: collaborative editing,
Paragraph/Pullquote/Group content, reload, and block movers. Rare prerequisites
are the RTC audience, multi-peer stale timing, and the exact structural order.
The exact `Another -> Another` duplicate endpoint remains fuzz-derived because
no faithful WebSocket replay has completed.

Blast radius is content corruption, not just a UI-only mismatch. The reduced
repro loses a remote top-level Pullquote. The archived browser summary reports
adjacent paragraph duplication. There is no evidence of save loops,
performance/OOM risk, or a crash. Recovery is possible by undo before save,
copying from the intact collaborator, or restoring a post revision after save.

## Fix Plan

1. Add a CRDT unit regression for the explicit-base stale top-level move.
2. Add or repair a WebSocket-native browser repro that waits on WebSocket
   provider state instead of HTTP `wp-sync` responses.
3. Change `reconcileStaleLocalBlocks()` to accept an explicit base snapshot.
4. In `mergeCrdtBlocks()`, use that reconciliation for explicit-base edits
   before rebasing and merging by client ID.
5. Keep the fix bounded to top-level stale-snapshot preservation; do not add a
   new conflict-resolution system or direct serialized-HTML manipulation.

The robustness concern is that base records are stale by design: they are only
the local editor's pre-change view, not a complete description of all remote
state already present in the CRDT document. A base-record merge must therefore
still preserve remote-only Yjs blocks unless the incoming change explicitly
proves a user deletion.
