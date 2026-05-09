# RTC Pullquote Move Into Group Can Preserve a Stale Top-Level Copy

Bug signature: `ee52ecf289cc`

Bug type: `rtc_pullquote_move_into_group_leaves_stale_top_level_pullquote`

## Summary

The fuzzer reported a collaboration divergence where one peer sees a Pullquote
moved inside a Group while another peer keeps a stale top-level copy of the same
Pullquote. The deterministic CRDT-level reconstruction is real on `origin/trunk`:
if a remote peer moves a block into a Group and the local peer later submits a
full stale block snapshot from before that move, `mergeCrdtBlocks` treats the
stale top-level Pullquote as local structure and reintroduces it.

I could not make the natural Playwright scenario fail in this pass. Real user
likelihood is therefore low for the current browser flow, but the merge failure
is a product-code correctness issue in the RTC block CRDT path and the failure
shape matches the historical fuzz artifact family.

## Natural Workflow

The plausible user workflow is:

1. Two collaborators edit the same post with RTC enabled over the HTTP transport.
2. The post contains a Group and a Pullquote, or one collaborator inserts a
   Pullquote while another has the same document open.
3. One collaborator moves the Pullquote into the Group.
4. Another collaborator's editor submits a stale full block snapshot whose
   top-level structure still has the Pullquote outside the Group.

No malformed block HTML or invalid block tree is required. The rare prerequisite
is the stale full-snapshot timing: the block editor and sync manager have to race
so that an older local block tree is merged after the Yjs document already
contains the remote reparenting.

## Impact

The observed failure is duplicate or stale content, not a crash. If the corrupted
CRDT state is saved, users can persist a duplicate Pullquote or lose the intended
top-level structure around the Group/Pullquote move. Recovery is manual: reload
or delete the stale duplicate if the state has not already been saved, otherwise
edit the content back into shape. I saw no evidence of a save loop, performance
spiral, or OOM risk.

## Root Cause

Gutenberg RTC syncs blocks by repeatedly merging full block snapshots into a Yjs
array in `mergeCrdtBlocks`. The merge code correctly handles current snapshots,
but before the known stale-snapshot fix it has no base tree for deciding whether
top-level additions/deletions are local intent or a stale view of remote
structure.

For this bug, the relevant sequence is:

1. The local Yjs document starts as:
   `Pullquote(pullquote-client-id), Group(group-client-id)`.
2. A remote Yjs update changes the document to:
   `Group(group-client-id)[Pullquote(pullquote-client-id)]`.
3. The local editor then emits its old snapshot:
   `Pullquote(pullquote-client-id), Group(group-client-id)`.
4. The old merge logic sees the top-level Pullquote in the incoming snapshot and
   preserves/reinserts it, even though that block was the same logical block that
   remote sync had just moved inside the Group.

`git blame` points the original block merge implementation around
`mergeCrdtBlocks` to the initial RTC block CRDT work. The stale-snapshot
reconciliation in proposed fix commit `5bda437f0cc4` (`Preserve saved content
from stale editor snapshots`) is the relevant fix family. The current
known-fixes base `f256024286dd80a4c0e2579f658c109256abf648` fixes the direct
no-base reconstruction, though an integration path with explicit base blocks
still needs care.

## Pass 172 Known-Fixes Adapter Check

The combined known-fixes base also has a product-shaped variant of this family.
In that branch, `editEntityRecord` forwards `baseRecord` through the sync
manager, and `applyPostChangesToCRDTDoc` passes `baseRecord.blocks` into
`mergeCrdtBlocks`.

A focused pass-172 post-adapter repro drives that route with valid Pullquote and
Group blocks plus derived post content:

1. Initial local post blocks:
   `Pullquote(pullquote-client-id), Group(group-client-id)`.
2. Remote update:
   `Group(group-client-id)[Pullquote(pullquote-client-id)]`.
3. Local stale update through `applyPostChangesToCRDTDoc` with
   `{ baseRecord: { blocks: initialBlocks } }`.

On `f256024286dd80a4c0e2579f658c109256abf648`, the test fails before the small
candidate change with:

```text
[
  "core/group:group-client-id:RTC Pullquote body[core/pullquote:pullquote-client-id:RTC Pullquote body]",
  "core/group:<fresh uuid>"
]
```

That shows the explicit-base path is not merely a synthetic
`mergeCrdtBlocks` call; it is reachable through the post CRDT adapter used by
the current sync stack. Passing the explicit base snapshot into stale
reconciliation instead of bypassing reconciliation fixes the adapter repro and
keeps the `crdt-blocks.ts` unit suite passing in the disposable known-fixes
worktree.

## Pass 173 Local-Edit Check

Pass 173 found a stricter variant that the earlier candidate did not cover:
the stale peer may have made a real Pullquote text edit while its local tree
still shows that Pullquote at the top level. A correct merge should keep the
remote structural move and apply the local text edit at the Pullquote's current
nested location.

On the May 7 known-fixes base, the explicit-base local-edit repro fails with:

```text
[
  "core/group:group-client-id:Local edit after stale view[core/pullquote:pullquote-client-id:Initial Pullquote body]",
  "core/group:<fresh uuid>"
]
```

The simple pass-172 candidate removes the duplicate but loses the local edit:

```text
[
  "core/group:group-client-id[core/pullquote:pullquote-client-id:Initial Pullquote body]"
]
```

The revised fix maps a changed stale top-level block to the same `clientId` at
its current nested location before removing the stale top-level copy. The same
stricter repro now produces:

```text
[
  "core/group:group-client-id[core/pullquote:pullquote-client-id:Local edit after stale view]"
]
```

## Fix Plan

Track the last local block snapshot for each Yjs block array. Before merging a
new local snapshot, compare:

- the last local snapshot,
- the current Yjs snapshot,
- the incoming local snapshot.

If a block has the same stable `clientId` in all three snapshots and the incoming
copy has not changed relative to the last local copy, prefer the current Yjs copy
so remote structural moves are retained. If a block existed locally and
previously but no longer exists at the same top-level position, check whether
the same `clientId` exists deeper in the current tree. If it does and the local
copy changed, merge the local changes into that current nested block before
dropping the stale top-level copy. If the same `clientId` is absent from the
current tree, treat it as a remote deletion unless the merge cannot prove stable
identity. Insert current remote-only blocks back into the outgoing snapshot near
their current neighbors so unrelated remote inserts are not dropped by the
full-array merge.

The guard only runs when all blocks in the compared arrays have unique
`clientId`s. If the merge cannot prove identity, it falls back to the existing
behavior.

## Robustness Review

Kernel-maintainer view: the fix keeps the old path as fallback when identity is
ambiguous, avoids global mutable state by keying cache entries to the Yjs block
array, and adds a deterministic unit repro for the exact stale reparent shape.

Distributed-systems view: this is an operation/base problem. Full snapshots are
not causally annotated, so the merge has to infer whether a snapshot is stale.
Using the last local snapshot gives the merge a local base and prevents an old
snapshot from overwriting concurrent remote structural edits that the local user
did not actually change.

Simplicity/performance view: the code adds several linear scans over the block
tree and maps by `clientId`. That is more code than ideal, but it is confined to
RTC block merging, avoids parsing serialized HTML, and only pays the extra cost
when syncing full block snapshots.

## Verification

Focused unit repro added:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-pullquote-move-into-group.test.ts -- --runTestsByPath --runInBand
```

Existing CRDT suite:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runTestsByPath --runInBand
```

Pass 173 strengthened the focused unit repro with a local-edit case:

```text
initial: Pullquote("RTC Pullquote body"), Group()
remote:  Group(Pullquote("RTC Pullquote body"))
local:   Pullquote("Local edit after stale view"), Group()
final:   Group(Pullquote("Local edit after stale view"))
```

Natural browser coverage was added for two collaborators inserting, editing, and
moving a Pullquote into a Group. It passed both before and after the source fix
in this pass, so it is coverage for the workflow, not a confirmed browser-level
reproduction.

## Pass 174 Refresh

Pass 174 rebased the PR branch on current `origin/trunk`
`b38f9b4d86d0505199f5efd78c2adf213e428e78` and rewrote it into the requested
three-commit shape:

1. `6867d472dea` adds the focused non-Playwright CRDT repros.
2. `e46104c26bc` adds the natural browser coverage.
3. `13e5ae7a78b` applies the source fix.

The pre-fix commit `e46104c26bc` fails the focused unit repro with the stale
top-level Pullquote shape for both the no-edit and local-edit cases. The fixed
head `13e5ae7a78b` passes the focused Pullquote repro and the existing
`crdt-blocks.ts` suite.

Pass 174 also rechecked the May 7 known-fixes manifest commit
`f256024286dd80a4c0e2579f658c109256abf648` in a clean detached worktree. The
explicit-base local-edit route still fails there, producing a Group whose
attributes absorb the stale Pullquote edit plus a fresh empty Group. That
confirms the current synthetic known-fixes base has not closed the stricter
base-record variant; the trunk PR branch fixes the current no-`baseBlocks`
merge path and the same moved-block reconciliation needs to be preserved when
the proposed explicit-base API is integrated.
