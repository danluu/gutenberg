# RTC move reconciliation rewrites neighboring block types (`58a3229d7ac7`)

## Summary

The `58a3229d7ac7` fuzz signature is a real RTC data-corruption issue in the
post editor. A collaborator can insert a block near a mixed block sequence while
the local editor later moves a neighboring block. The merge layer can then treat
the move as a positional update instead of a move by block identity. On unfixed
`origin/trunk` `f4df834d9f8b` (rechecked during pass 180), a simple top-level
move from:

```text
paragraph(inserted), quote, paragraph(moved)
```

to:

```text
paragraph(inserted), paragraph(moved), quote
```

rewrites the two existing Yjs block records by position. The block that should
remain a quote becomes a paragraph and the block that should remain the moved
paragraph becomes a quote. That is the direct block-type rewrite described by
the manifest.

The current known-fixes base from May 7 fixes the direct move path, including a
move where the moved block content changed, but not the same-array snapshot
path. Pass 174 independently reapplied the focused tests to exact known-fixes
commit `f256024286d`: the direct mixed-type move and moved-plus-edited cases
passed, while the same-array remote-shift case failed with the old
`inserted-block, quote-block, moved-paragraph` order. Pass 175 checked the
individual proposed RTC PR heads from the known-fixes manifest; all relevant
heads still retain `serializableBlocksCache`, and the reorder/rebase head
`77924` also computes the cached block list before running clientId-aware move
logic. If a caller reuses the same JavaScript block array object after changing
its order, the old cache can still hide the later move.

## Practical Impact

Likelihood: `low` for current public trunk. If every May 7 known-fixes-base
change landed without this branch, the remaining same-array cache survivor would
be `very-low`. Pass 180 kept that residual known-fixes likelihood low because
ordinary top-level block-editor insert and move actions rebuild the root
`innerBlocks` array returned by `getBlocks()`, so the exact stale `WeakMap`
array-key path is not the normal top-level toolbar path. The direct natural
mixed-type move is still a real current-trunk corruption bug.

The natural workflow is normal, but the timing envelope is narrow:

- Editor surface: post editor with RTC collaboration enabled.
- Transport: HTTP sync is sufficient; the original signature used `http`.
- Users/tabs: two browser contexts, tabs, or users editing the same post.
- Blocks: common top-level blocks with different schemas, such as paragraphs
  around a quote/table.
- Timing: one collaborator inserts a block near the sequence, shifting local
  positions, and the other then moves a neighboring top-level block while the
  merge layer still reconciles by position.
- Save/reload: not needed to create the live divergence, but saving after the
  corrupted state can persist the wrong block order/type/content.

Common prerequisites are the use of ordinary blocks and the toolbar move/insert
actions. Rare prerequisites are active RTC editing of the same nearby region and
the exact ordering of remote insert plus local move. The same-array reuse in the
low-level repro is not a malformed block tree, but pass 175 found evidence that
ordinary top-level post-editor insert/move actions usually return a fresh
`getBlocks()` array: `getBlocks()` reads `state.blocks.tree.get( '' ).innerBlocks`,
and the reducer rebuilds that root `innerBlocks` array for `INSERT_BLOCKS`,
`MOVE_BLOCKS_UP`, `MOVE_BLOCKS_DOWN`, and `MOVE_BLOCKS_TO_POSITION`. The
fuzzing contribution was finding the precise concurrency order; the same-array
residual is mainly a defensive cache-correctness hole unless browser
instrumentation finds a real reused-array path.

Pass 180 rechecked the source path behind that residual claim:
`getBlocks()` returns `state.blocks.tree.get( '' ).innerBlocks`; normal
`INSERT_BLOCKS`, `MOVE_BLOCKS_UP`, `MOVE_BLOCKS_DOWN`, and
`MOVE_BLOCKS_TO_POSITION` cases call `updateParentInnerBlocksInTree()`, which
assigns a freshly mapped `innerBlocks` array for the updated parent. That does
not prove no nested or plugin path can reuse a block array, but it does make the
known-fixes-only survivor look defensive rather than a likely toolbar workflow.

The blast radius is content corruption rather than a UI-only display glitch:
neighboring block records can inherit the wrong block type/attributes, duplicate
or drop adjacent content, and then be saved if the user does not notice. I did
not find evidence for a save loop, persistence API failure, OOM, or broad
performance risk. Recovery is manual or undo-based if the user catches the
problem before saving; after save/reload, recovery depends on revisions/backups.

Evidence for the `low` classification:

- The handoff manifest marks the signature as canonical high-confidence and
  describes the same quote/paragraph neighborhood rewrite.
- Focused unit repros fail on `origin/trunk`: one proves the positional
  block-type rewrite, one proves that the same rewrite still occurs when the
  moved block was also edited, and one proves the same-array remote-shift move
  is missed.
- Pass 174 reconfirmed that current `origin/trunk` fails all three focused
  mixed-block unit repros. The direct and moved-plus-edited cases both record
  `name` rewrites from `core/quote` to `core/paragraph` and back.
- Pass 174 reconfirmed that the May 7 known-fixes base still fails the
  same-array remote-shift repro, while passing the direct and moved-plus-edited
  cases.
- Pass 175 checked all proposed RTC PR heads listed in the known-fixes manifest
  and found none removed the stale `serializableBlocksCache`; PR `77924` adds
  reorder/rebase logic but still reads the cached incoming block list first.
- The fixed branch passes the full `crdt-blocks` unit suite after preserving
  moves by block identity and removing the stale snapshot cache.

Evidence against a higher likelihood:

- The pass 173 natural Playwright repro passes on the fixed branch in a real
  test wp-env, so the browser-level corruption is covered by a regression.
- The direct mixed-type move, including a moved block that was also edited, is
  already fixed in the May 7 known-fixes base, leaving the narrower cache/reuse
  path there.
- Normal top-level block-editor insert and move reducers rebuild the root
  `innerBlocks` array returned by `getBlocks()`, arguing against frequent
  ordinary-user hits of the known-fixes same-array survivor.

The shortest confidence-improving experiment is to run the natural Playwright
spec repeatedly in a clean wp-env while logging block-array identity and merge
inputs around `mergeCrdtBlocks`. That would measure whether any nested,
controlled-inner-block, or plugin-influenced browser path reaches the same-array
cache survivor despite the top-level reducer's fresh-array behavior.

## Reproduction

The non-Playwright repro is in
`packages/core-data/src/utils/test/crdt-blocks.ts`:

- `does not rewrite neighboring mixed block records during a top-level move`
  fails on `origin/trunk` because both existing mixed block records are
  rewritten by position during a move.
- `keeps mixed block identities when a moved block was also edited` fails on
  `origin/trunk` and proves the previous pass's stricter pure-move fix was not
  enough; a normal edit to the moved block still sent the merge down the
  positional rewrite path.
- `observes a mixed block move after a remote shift when the editor reuses the
  block array` fails on the May 7 known-fixes base because the cached
  serializable block list hides the later move.

The Playwright repro is in
`test/e2e/specs/editor/collaboration/triage-58a3229d7ac7-realistic.spec.ts`.
It uses two real editor pages, REST setup for a normal post, the block toolbar
insert-before action, and the block toolbar move-up action. It does not inject
malformed blocks, mutate editor state directly, or bypass the UI for the
collaborative edit sequence.

## Known-Fixes Result

The known-fixes manifest reports the current base as synthetic commit
`f256024286dd80a4c0e2579f658c109256abf648`, incorporating recent `origin/trunk`
plus the backlink-aware RTC fix set.

In pass 174, I copied the focused unit tests into a temporary worktree of that
commit and ran:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="mixed block"
```

Result: 2 passed, 1 failed. The direct mixed-type move and moved-plus-edited
tests passed, but the same-array remote-shift test failed. The observed order
stayed:

```text
inserted-block, quote-block, moved-paragraph
```

instead of:

```text
inserted-block, moved-paragraph, quote-block
```

So the signature is not fully covered by the current known-fixes base.

As a current-trunk control, pass 180 rebased the branch over `origin/trunk`
`f4df834d9f8b` and confirmed the trunk delta since pass 179 did not touch the
CRDT merge code. Earlier current-trunk controls applied the same focused tests
to `origin/trunk` and failed 0/3. The direct cases showed block `name` updates:

```text
core/paragraph, core/quote
```

meaning the existing Yjs records for the neighboring quote and paragraph were
rewritten by position rather than moved by identity.

## Root Cause

The original reconciliation behavior came from commit
`84019935998c` (`Improve CRDT "merge logic" for post entities (#72262)`). That
commit introduced both the top-level positional merge sweep and the
`serializableBlocksCache`.

Two assumptions are unsafe under collaborative moves:

- When the incoming and local arrays have the same length, positional merge can
  update a local Yjs block at index `i` with an incoming block from index `i`
  even when the two records have different `clientId` values. For a pure
  reordering of existing blocks, this rewrites identities instead of moving the
  existing Yjs records.
- Caching the serializable version of the incoming block array by JavaScript
  object identity assumes that a reused array object represents unchanged block
  content/order. That assumption is not guaranteed by the editor data flow.

Later stale-snapshot fixes, including `5bda437f0cc`, improved protection for
older editor snapshots but left the `WeakMap` cache in place. That is why the
May 7 known-fixes base handles the direct pure move but still misses the
same-array remote-shift move.

## Fix Plan

Initial plan:

1. Detect a provable reorder by comparing the multiset of existing top-level
   block `clientId` values.
2. When it is a reorder, structurally reorder the Y.Array contents by existing
   `clientId` first, then run the normal merge against the incoming block data.
3. Recompute serializable block snapshots for each merge call instead of
   trusting a `WeakMap` keyed only by array object identity.
4. Cover both the direct mixed-type move and the same-array remote-shift path.

Kernel-maintainer robustness audit: the move fast path must be conservative. If
there is any insert/delete, duplicate `clientId`, missing `clientId`, or sibling
set mismatch, fall back to the existing merge logic rather than guessing.

Distributed-systems correctness audit: block identity, not array position, is
the stable object identity across replicas. A move should preserve the Yjs block
record and reorder it atomically; field-level updates are for the same logical
block, not for a different block that happens to occupy the same index.

Simplicity/performance audit: removing the snapshot cache may add serialization
work, but the cache was correctness-invalid and keyed on an unstable proxy for
content identity. The conservative pure-reorder check is linear in sibling count
and only applies to the top-level array being merged.

Revised plan: implement the conservative same-`clientId` structural reorder,
then recurse into the normal merge so content/attribute edits to moved blocks
are still applied to the matching logical block. Remove the
`serializableBlocksCache`; do not add a more complex cache until there is
measured evidence that serialization is a real bottleneck and the cache key
includes a real content/version signal.

## Verification

The PR branch was rebased onto `origin/trunk` `f4df834d9f8b` during pass 180.
Commands run on the rebased fixed branch:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="mixed block"
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts
node ./tools/eslint/lint-js.cjs packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-58a3229d7ac7-realistic.spec.ts
git diff --check origin/trunk...try/rtc-move-reconciliation-rewrites-neighboring-block-types-a-58a3229d7ac7-pr
```

Results on pass 180: the focused mixed-block repros passed 3/3, the full
`crdt-blocks` unit suite passed with 74 tests, ESLint passed for the touched
files, and `git diff --check` passed.

`npm run build` reached the color-token generation step and then failed with an
unrelated toolchain error from `colorjs.io`: `[object Object] is not a valid
color space`. No source files were changed by that failed build.

Pass 173 reran the natural Playwright spec in a `.wp-env.test.json` environment
on port `9902`. Pass 175 did not regenerate the browser video. The commits
since the video/rebase evidence touch shortcode docs/raw handling, connector
PHPStan types, and dependency lockfile metadata; they do not touch RTC merge
code or the Playwright repro. The pass 173 spec passed and wrote the final
two-peer normalized state to `realistic-attempt.json`. The latest annotated
headless video is at:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-173/video/58a3229d7ac7/58a3229d7ac7-pass173-annotated.mp4
```
