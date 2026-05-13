# RTC stale top-level move after checkpoint can lose a remote heading

Bug signature: `9cf81e169f7e`

Bug type: `rtc_top_level_move_after_checkpoint_duplicates_heading_and_drops_checkpoint_paragraph`

Transport: websocket

## Status

This is not an exact replay of archived seed `954115`; the exact `result.json`,
`STATUS.md`, and realistic repro file are absent locally. Focused unit
reconstructions found a narrower surviving bug on the May 7 known-fixes base:
a top-level move synced with a stale `baseRecord` can still drop a remote
top-level heading that was inserted after the base snapshot. Pass 175 also
showed that the sync manager can naturally schedule this shape: a remote
`blocks` update may already be in the local Y doc while local editor store
reconciliation is still pending, and a normal local edit can then call
`syncManager.update()` with the stale `baseRecord`.

The reconstructed current-base failure is:

1. Start from ordinary top-level blocks: heading, body paragraph, checkpoint
   paragraph, old tail paragraph.
2. A remote collaborator inserts a new top-level heading between the body and
   checkpoint paragraph.
3. Another collaborator sends a stale full block snapshot that moves the old
   tail paragraph and uses the pre-heading snapshot as `baseRecord`.
4. The current known-fixes stack drops the remote heading from the post CRDT
   blocks/content. With the proposed incremental fix, the merged state keeps
   exactly one remote heading, keeps the checkpoint paragraph, and converges
   across both Y docs.

## Practical Impact

Real-user likelihood: low.

The natural workflow is a multi-user post editor session over websocket RTC.
The user-visible actions are normal: save or reload around a checkpoint, insert
a Heading block, and move a top-level Paragraph block using editor block move
controls or List View. The timing requirement is the rare part: the local edit
must be based on a stale block snapshot while the local Y doc already contains a
remote top-level insert. Existing sync-manager coverage proves that this is an
allowed scheduler state: a local same-key update scheduled after remote
reconciliation has started is applied, not filtered. That makes the defect
reachable through normal RTC scheduling when the editor store or visible block
UI is still stale. The evidence is strong for the product interleaving but still
weak for frequent user reachability: archived safe browser variants converged,
and no durable natural Playwright repro is present.

Common prerequisites: headings, paragraphs, saving/reloading, top-level block
moves, and multiple RTC collaborators are all ordinary collaborative editing
behavior.

Rare or artificial prerequisites: the exact checkpoint-save/reload plus remote
heading insert plus stale tail move ordering came from fuzzing. The pass-172
unit reconstruction models the CRDT adapter schedule directly; it does not prove
a durable natural Playwright route. The handoff also says two safe real-action
browser variants converged.

Blast radius: semantic content corruption. A peer can lose a remotely inserted
heading; the archived family also showed duplicate headings and lost checkpoint
paragraphs. If the corrupted peer saves, the bad block tree/content can become
persistent. No evidence here shows a save loop, OOM, or browser crash. Recovery
is manual unless another peer still has the correct state and overwrites the bad
state before save.

## Root Cause

The known-fixes base has two relevant protections:

- `21915cc5f187` / PR branch
  `try/rtc-websocket-top-level-insert-after-delete-ordering-diver-fa621013afa9-pr`
  adds stale full-snapshot reconciliation that preserves remote top-level
  inserts/deletes when the local editor sends a stale block array.
- `872a46308126` / PR branch
  `try/rtc-top-level-block-move-duplicates-paragraph-and-drops-si-07f8eb5c4218-pr`
  adds client-ID-based top-level move rebasing.

Those protections still have a hole when a local editor edit supplies
`baseRecord.blocks`. In that path, `mergeCrdtBlocks()` uses the incoming
snapshot directly and skips the stale-snapshot reconciliation that reinserts
remote top-level blocks. If the current Y array contains a remote insert that is
not in `baseRecord.blocks`, `rebaseYBlocksByClientId()` cannot run because the
current and base client-ID sets differ. The fallback left/right array diff can
then interpret the remote insert as content to delete.

The bug is therefore not just "no previous cache after reload"; it also applies
to ordinary editor edits with a stale `baseRecord`, which is the natural
`editEntityRecord` path in the current known-fixes stack.

## Fix Plan

Use the same stale top-level reconciliation for `baseRecord`-backed edits as
for cache-backed edits:

1. Let `reconcileStaleLocalBlocks()` accept an explicit previous/base block
   array.
2. When `mergeCrdtBlocks()` receives `baseBlocks`, reconcile the incoming local
   blocks against the current Y blocks and the explicit base before attempting
   client-ID rebase or fallback diff.
3. Keep `previousBlocks` as the explicit base for attribute/rich-text merge
   semantics, and keep the existing previous-local cache update behavior.

The pass-172 probe passed with this change on the known-fixes base, along with
focused `mergeCrdtBlocks` move/reorder coverage.

Pass 176 reran the focused regression in clean scratch worktrees:

- On exact known-fixes base `f256024286d`, with only the regression added, the
  test failed because `Step 6 inserted heading` was missing from the merged
  viewer block order.
- On current published fix-branch head `8d1d70f3864`, the same regression
  passed. Older equivalent local fix commit `c8af86c24a5` had the same
  `crdt-blocks.ts` patch but lacked the final test dependency mock.
- On `8d1d70f3864`, focused existing move/reorder tests in
  `crdt-blocks.ts` also passed.
- A scratch-only run of `crdt-stale-top-level-blocks.test.ts` also passed
  after adding the same local `../crdt-selection` mock to avoid the missing
  `framer-motion` dependency.

Those runs needed a local test-only mock for `../crdt-selection` because the
shared `node_modules` tree lacks `framer-motion`; without that mock the test
process fails before executing assertions.

Pass 177 reran the focused evidence in a fresh scratch worktree:

- On exact known-fixes base `f256024286d`, with only the regression checked out,
  `npm run test:unit packages/core-data/src/utils/test/crdt-9cf81e169f7e-pass172.test.ts -- --runInBand`
  failed because `Step 6 inserted heading` was missing from the viewer blocks.
- On current published fix-branch head `8d1d70f3864`, the same command passed.
- On `8d1d70f3864`,
  `npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand`
  passed, 76/76.
- On exact known-fixes base `f256024286d`,
  `npm run test:unit packages/sync/src/test/manager.ts -- --runInBand --testNamePattern="filters stale local keys before the edited record lookup resolves|allows local same-key updates scheduled after remote reconciliation starts"`
  passed, 2/2 selected tests. The second selected test is the key reachability
  proof: the sync manager applies a local same-key update scheduled after a
  remote update has entered the Y doc and before remote reconciliation resolves.

Pass 178 rebased this explanation branch onto current `origin/trunk`
`d52e35a291c1` and rechecked the known-fixes evidence against the same required
base `f256024286d`. Blame shows this as an incomplete interaction between
synthetic known-fix pieces rather than a single clean trunk regression:

- `5bda437f0cc4` / PR `77876` added stale full-snapshot reconciliation via
  `reconcileStaleLocalBlocks()`.
- `1a46ebf1621c` / PR `77924` added the explicit `baseRecord.blocks` merge
  path used by normal `editEntityRecord()` calls.
- The `f256024286d` integration kept those paths separate:
  `baseBlocksToSync ? localBlocksToSync : reconcileStaleLocalBlocks(...)`.

Pass 178 also confirmed that the authoritative remote PR branch is
`8d1d70f3864`; a local same-named branch in one checkout was stale at
`c8af86c24a5`, so verification should use the remote commit or
`remotes/danluu/try/rtc-top-level-move-after-checkpoint-duplicates-heading-and-9cf81e169f7e-pr`.
The focused commands were rerun:

- Exact base `f256024286d` plus only the regression:
  `npm run test:unit packages/core-data/src/utils/test/crdt-9cf81e169f7e-pass172.test.ts -- --runInBand`
  failed with `Step 6 inserted heading` missing from the merged viewer block
  list.
- Fix head `8d1d70f3864` passed the same regression.
- Fix head `8d1d70f3864` passed
  `npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand`,
  76/76 tests.
- Exact base `f256024286d` passed the selected scheduler reachability tests in
  `packages/sync/src/test/manager.ts`.

Pass 179 updated this explanation branch onto current `origin/trunk`
`f4df834d9f8b` (`2026-05-13`, `UI: Improve docs for compound exports
(#78212)`) and repeated the focused verification in clean detached worktrees
under `/private/tmp/9cf81e-pass179.NEDLRi/`. The supplied known-fixes checkout
was not used as proof because it was dirty and currently resolved to stale local
PR-branch commit `c8af86c24a5` rather than the required known-fixes base.

- Exact known-fixes base `f256024286d` plus only the existing regression test
  failed:
  `npm run test:unit packages/core-data/src/utils/test/crdt-9cf81e169f7e-pass172.test.ts -- --runInBand`.
  The merged viewer contents were `Initial heading`, `Old tail paragraph`,
  `Shared body paragraph`, and `Step 5 saved checkpoint paragraph`; the
  expected `Step 6 inserted heading` was absent.
- Fix head `8d1d70f3864` passed the same regression command.
- Fix head `8d1d70f3864` passed
  `npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand`,
  76/76 tests.
- Exact base `f256024286d` again passed the selected sync-manager reachability
  tests:
  `npm run test:unit packages/sync/src/test/manager.ts -- --runInBand --testNamePattern="filters stale local keys before the edited record lookup resolves|allows local same-key updates scheduled after remote reconciliation starts"`.
  That keeps the practical-impact classification at low rather than very-low:
  the vulnerable stale same-key edit can be applied by normal sync-manager
  scheduling, but a durable natural two-tab browser hit is still missing.

## Extra Validation Needed

The shortest confidence-improving browser experiment is a two-tab websocket
Playwright probe that delays only by ordinary event-loop scheduling: one tab
inserts a top-level heading after a reload/checkpoint, while the other
immediately moves the old tail paragraph from the stale visual state. The test
should assert normalized block contents on both peers and persisted content
after save. A deterministic browser repro was not produced in pass 172.
