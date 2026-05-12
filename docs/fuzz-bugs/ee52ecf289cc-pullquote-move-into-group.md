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
no-edit duplicate reconstruction, but pass 176 found that it can still lose a
valid stale-peer Pullquote text edit on the no-base route and can still corrupt
the explicit `baseRecord.blocks` route.

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

## Pass 175 Independent Check

Pass 175 independently re-ran the focused before/after evidence. The PR branch
pre-fix commit `e46104c26bc` fails both Pullquote repro cases, leaving the
Pullquote at top level next to an empty Group. The fixed head `13e5ae7a78b`
passes the focused Pullquote repro and the existing `crdt-blocks.ts` suite.

Pass 175 also created a fresh detached worktree at the May 7 known-fixes commit
`f256024286dd80a4c0e2579f658c109256abf648` and drove the explicit
`mergeCrdtBlocks( ..., baseBlocks )` path directly. That test fails with:

```text
[
  "core/group:group-client-id:Local edit after stale view[core/pullquote:pullquote-client-id:Initial Pullquote body]",
  "core/group:<fresh uuid>"
]
```

That confirms the synthetic known-fixes base still bypasses stale moved-block
reconciliation when explicit base blocks are supplied. The practical likelihood
classification remains `low`: the user workflow is natural, but the browser
race still needs a stale full-snapshot ordering that has not been captured as a
clean failing Playwright run.

## Pass 176 No-Base Local-Edit Check

Pass 176 added a fresh disposable test in a detached worktree at the exact
known-fixes commit `f256024286dd80a4c0e2579f658c109256abf648`. The test
contrasts three schedules:

1. No-base stale snapshot with no Pullquote text edit.
2. No-base stale snapshot where the stale peer edits the Pullquote text.
3. Product-adapter stale update through `applyPostChangesToCRDTDoc` with
   `{ baseRecord: { blocks: initialBlocks } }` and the same Pullquote text edit.

The no-edit control passes, so the May 7 synthetic known-fixes base does avoid
the original stale top-level duplicate when the stale Pullquote is unchanged:

```text
[
  "core/group:group-client-id[core/pullquote:pullquote-client-id:Initial Pullquote body]"
]
```

The no-base local-edit case still fails, but in a different way: it drops the
stale peer's valid text edit and keeps the old nested text:

```text
Expected:
[
  "core/group:group-client-id[core/pullquote:pullquote-client-id:Local edit after stale view]"
]

Received:
[
  "core/group:group-client-id[core/pullquote:pullquote-client-id:Initial Pullquote body]"
]
```

The explicit `baseRecord` adapter case still fails with the structural
corruption shape:

```text
[
  "core/group:group-client-id:Local edit after stale view[core/pullquote:pullquote-client-id:Initial Pullquote body]",
  "core/group:<fresh uuid>"
]
```

This narrows the root cause further: the May 7 stale reconciliation compares
only top-level `clientId`s when deciding that a stale top-level Pullquote was
remotely deleted. It does not search the current tree deeply enough to notice
that the same Pullquote `clientId` now exists inside the Group. The PR branch
fix does that deep lookup and, after rebasing onto current `origin/trunk`
`5fc7223e96b2751c57b6c4ae840bb9e838bee9f0`, still passes:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-pullquote-move-into-group.test.ts -- --runTestsByPath --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runTestsByPath --runInBand
```

The rebased PR branch now has this three-commit order:

1. `3ecf9dd708b` adds the focused non-Playwright CRDT repros.
2. `38a3b341000` adds the natural browser coverage.
3. `573a24d2f1d` applies the source fix.

## Pass 177 Current-Trunk Verification

Pass 177 rebased both the explanation branch and the three-commit PR branch on
`origin/trunk` `bf2d0cc1f1e82d0db286f4aa9851f151e407b163`
(`Editor: Refactor 'PostPublishPanel' into function component (#78083)`).

The PR branch still has the requested commit order after the rebase:

1. `1e2002acafe` adds the focused non-Playwright CRDT repros.
2. `7dcde7f737c` adds the natural browser coverage.
3. `fc802fbfcaa` applies the source fix.

The focused Pullquote repro and the existing CRDT block suite both pass at
fixed head `fc802fbfcaa`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-pullquote-move-into-group.test.ts -- --runTestsByPath --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runTestsByPath --runInBand
```

Results:

```text
crdt-pullquote-move-into-group.test.ts: 2 passed
crdt-blocks.ts: 71 passed
```

This pass does not change the practical likelihood classification. The
deterministic product-code bug and fix remain strong, while the natural browser
test remains workflow coverage rather than a reliably failing browser race
capture.

## Pass 178 Current-Trunk and Known-Fixes Verification

Pass 178 rebased both branches on current `origin/trunk`
`d52e35a291c17da7bc48a1efd4c77a601ed3ad67`
(`Media: Guard gutenberg_delete_heic_companion_file() against non-string
$metadata['original'] (#78128)`).

The PR branch still has the requested three-commit order:

1. `ef3b12a437d` adds the focused non-Playwright CRDT repros.
2. `67e486b173e` adds the natural browser coverage.
3. `fe94447afc8` applies the source fix.

The fixed head passes both current-base deterministic checks:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-pullquote-move-into-group.test.ts -- --runTestsByPath --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runTestsByPath --runInBand
```

Results:

```text
crdt-pullquote-move-into-group.test.ts: 2 passed
crdt-blocks.ts: 71 passed
```

The pre-fix branch commit `67e486b173e` fails both focused repro cases on the
same current trunk base, producing the original stale top-level Pullquote plus
empty Group shape:

```text
[
  "core/pullquote:pullquote-client-id:RTC Pullquote body",
  "core/group:group-client-id"
]
```

and for the local-edit case:

```text
[
  "core/pullquote:pullquote-client-id:Local edit after stale view",
  "core/group:group-client-id"
]
```

Pass 178 also rechecked the exact known-fixes manifest commit
`f256024286dd80a4c0e2579f658c109256abf648` in a detached worktree, because the
named known-fixes checkout path was dirty and not itself at that commit. The
unchanged stale Pullquote control passes there, but the stale-peer local-edit
case still fails:

```text
Expected:
[
  "core/group:group-client-id[core/pullquote:pullquote-client-id:Local edit after stale view]"
]

Received:
[
  "core/group:group-client-id[core/pullquote:pullquote-client-id:Initial Pullquote body]"
]
```

This narrows the surviving known-fixes gap: the May 7 fix stack can recognize
and drop an unchanged stale top-level Pullquote after the same `clientId` moved
inside a Group, but it still discards a stale collaborator's valid text edit
because the reconciliation/deletion test only considers top-level current block
ids.
