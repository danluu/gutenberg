# RTC top-level table insert can be lost after stale baseRecord merge

## Summary

Signature `f8a927efad8c` came from WebSocket RTC fuzzing. The archived seed
`952807` inserted a top-level `core/table` after checkpoint save and a
collaborator reload; the actor kept the table, but the other peer never
converged to a block tree containing it.

Pass 173 found a narrower surviving shape in the backlink-aware known-fixes
stack. The exact synthetic known-fixes SHA from the handoff,
`f256024286dd80a4c0e2579f658c109256abf648`, preserves remote top-level appends
when `mergeCrdtBlocks` relies on its internal previous-local-block cache, but
it does not do the same stale-snapshot reconciliation when the normal editor
path supplies an explicit `baseRecord`.

Pass 178 refreshed this explanation branch on current `origin/trunk`
`96263113a874ab1fc1668f7bb500c98766e90e76` and reran the exact
base-vs-fix unit proof. The reproducer still fails at the known-fixes SHA and
passes with the proposed fix. Pass 178 also rechecked the line-level merge
path: the ordinary editor action sends `baseRecord`,
`applyPostChangesToCRDTDoc` passes `baseRecord.blocks` into `mergeCrdtBlocks`,
and the known-fixes merge bypasses stale-local reconciliation exactly when that
explicit base exists.

Pass 179 rebased this explanation onto current `origin/trunk`
`fc8b3db6ace471328e39453e3eed552ad4f3de7a` and added a dependency-minimal
direct `mergeCrdtBlocks` check in temporary worktrees. That check failed at
the required known-fixes base with the same table-loss assertion and passed at
`c8af86c24a5c70784e4604b66b772a0511859a00`, whose source patch is byte-for-byte
the same `crdt-blocks.ts` fix as the existing f8 PR branch.

## Reproducer

The low-level reproducer models the store action path used by ordinary editor
edits:

1. Start with two top-level paragraphs.
2. A remote editor appends a top-level `core/table`.
3. The local Yjs document receives that remote table.
4. A stale local edit, carrying `baseRecord.blocks` from the old two-paragraph
   snapshot, edits one paragraph and syncs only those two paragraphs.

On `f256024286dd80a4c0e2579f658c109256abf648`, the final block names are:

```text
core/paragraph
core/paragraph
```

The expected block names are:

```text
core/paragraph
core/paragraph
core/table
```

The same baseRecord-aware shape is not covered by PR `77924` head
`1a46ebf1621` (`Fix RTC stale WebSocket and CRDT merge bugs`): that head passes
the explicit base into `rebaseYBlocksByClientId`, then still falls through to
the positional merge/deletion path when the current Yjs array has a remote-only
tail block. Applying stale-local-block reconciliation to explicit base
snapshots makes the repro pass and keeps the existing stale top-level block
suite passing.

## Root Cause

The old positional merge treats the incoming full editor block snapshot as the
authoritative top-level structure. If the incoming snapshot has two blocks and
the current Yjs array has three, the fallback merge computes one deletion and
deletes the tail block.

PR `77876` adds `reconcileStaleLocalBlocks`, which compares the last local
snapshot, the incoming local snapshot, and the current Yjs blocks so that
remote-only top-level blocks are spliced back into the outgoing block list.
However, in the known-fixes integration this reconciliation only runs when
`mergeCrdtBlocks` does not receive an explicit `baseBlocks` argument:

```ts
const blocksToSync = baseBlocksToSync
	? localBlocksToSync
	: reconcileStaleLocalBlocks( yblocks, localBlocksToSync );
```

The normal editor update path added by PR `77924` passes `baseRecord` from
`EDIT_ENTITY_RECORD` through the sync manager into `applyPostChangesToCRDTDoc`
and then into `mergeCrdtBlocks`. Once the remote append has already reached the
local Yjs document, `rebaseYBlocksByClientId` refuses to rebase because the
current Yjs array has three blocks while the stale base snapshot has two. The
code then falls through to the positional full-array merge and deletes the
remote table.

The guard that makes this reproducible is structural rather than table-specific:
`canReorderYBlocksByClientId` returns false unless the current Yjs array and the
incoming/base array have the same set size. In the failing state, the current
array is `[paragraph A, paragraph B, table T]` and the stale incoming/base
snapshot is `[paragraph A, paragraph B]`, so the rebase path declines to run.
The later length-based diff then computes one deletion and removes the tail.

## Fix

Use the explicit `baseBlocks` snapshot as the previous-local snapshot for
`reconcileStaleLocalBlocks` instead of bypassing reconciliation:

```ts
const blocksToSync = baseBlocksToSync
	? reconcileStaleLocalBlocks( yblocks, localBlocksToSync, baseBlocksToSync )
	: reconcileStaleLocalBlocks( yblocks, localBlocksToSync );
```

This preserves remote-only top-level blocks before the positional merge runs.
It also keeps the existing no-explicit-base path unchanged by falling back to
`previousLocalBlocksCache`.

## Practical Impact

Real-user likelihood on the exact known-fixes stack is `low`.

The natural workflow is collaborative post editing over WebSocket with at least
two users or tabs. One user inserts a top-level Table block while another user
has an older two-block editor snapshot in flight; after checkpoint save/reload
or network delay, that stale local edit is applied after the remote table has
already reached the local Yjs document. The actions are ordinary, but the
delivery order is timing-sensitive and was originally found by fuzzing with
retriable WebSocket faults.

The blast radius is content loss or live collaboration divergence. If the stale
peer later persists the table-less block tree, recovery may require another
peer with the table still open, revision restore, or manual reconstruction.
There is no evidence of duplicate content, save loops, or performance risk for
this signature.

## Verification

Failing before the fix on `f256024286dd80a4c0e2579f658c109256abf648`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-f8a927-base-record-table.test.ts -- --runInBand
```

Pass 178 reran this in a detached worktree with the reproducer checked out on
top of `f256024286dd80a4c0e2579f658c109256abf648`:
`/private/tmp/f8a927-pass177-knownfix-fail.sSwwEp/repo`. After package-local
generated/dependency artifacts were wired in, the test executed and failed on
the product assertion:

```text
Expected: [ "core/paragraph", "core/paragraph", "core/table" ]
Received: [ "core/paragraph", "core/paragraph" ]
```

Passing after the fix:

```bash
npm run test:unit \
  packages/core-data/src/utils/test/crdt-f8a927-base-record-table.test.ts \
  packages/core-data/src/utils/test/crdt-stale-top-level-blocks.test.ts \
  -- --runInBand
git diff --check f256024286dd80a4c0e2579f658c109256abf648..HEAD
```

Pass 178 reran those two suites on
`d16b3a41d06d51d4a09e4ca519c8abdd6c7704e8`; both passed, and
`git diff --check f256024286dd80a4c0e2579f658c109256abf648..HEAD` was clean.

Pass 179 also ran a lower-level direct merge variant that imports
`mergeCrdtBlocks` directly, avoiding unrelated block-editor test dependencies.
The test modeled the same two-paragraph base, remote top-level table append,
and stale explicit baseRecord paragraph edit. On the required known-fixes base,
it failed:

```text
Expected: [ "core/paragraph", "core/paragraph", "core/table" ]
Received: [ "core/paragraph", "core/paragraph" ]
```

The same direct test passed at
`c8af86c24a5c70784e4604b66b772a0511859a00`, and `git diff` showed that
`c8af86c24a5` and the f8 PR branch apply the same `crdt-blocks.ts` fix over
`f256024286dd80a4c0e2579f658c109256abf648`.

Pass 177 attempted to rerun the same added test directly on PR `77924` head
`1a46ebf1621` in
`/private/tmp/f8a927-pass177-pr77924.gIzVE7/repo`, but that older head did not
reach assertions under the shared dependency layout because Jest could not
resolve `uuid` from `packages/blocks/src/api/factory.ts`. That setup failure is
not product evidence; the stronger current claim is the exact known-fixes base
failure plus source inspection of the PR-head merge path.

Pass 175 added a transient robustness check for the opposite case: if the
explicit `baseRecord` already contains the table and the local edit removes it,
the reconciliation must not restore the table as though it were remote-only.
That check passed on the fixed branch, which narrows the fix's risk: it
preserves remote blocks absent from the local base, but still allows intentional
local deletes when the base is up to date.

No natural Playwright repro was completed in pass 173. The shortest remaining
experiment is a two-user WebSocket browser test that delays one user's local
block edit until after the other user's table append has updated the first
user's Yjs document but before the first user's stale editor snapshot has been
rebased into the store.
