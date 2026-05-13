# RTC stale snapshot delete/move can smear List and Pullquote block identity

Bug signature: `a73ef852b497`

Bug type: `rtc_ws_stale_snapshot_delete_then_move_pullquote_absorbs_list_and_smears_attrs`

Transport: WebSocket RTC

## Summary

An archived fuzz run for seed `953766` reported an RTC convergence split where one peer kept an ordinary top-level `List -> Pullquote` region while another peer rewrote the same region into a `Pullquote` containing List item children and a following `Paragraph` carrying Pullquote-only `value`/`citation` attributes.

Pass 171 found a low-level current-base survivor for the same corruption shape. On the backlink-aware known-fixes base `f256024286dd80a4c0e2579f658c109256abf648`, a valid CRDT sequence using only serializable Gutenberg blocks can still produce:

- `core/pullquote` with `core/list-item` children grafted into `innerBlocks`
- `core/paragraph` with Pullquote-only `value` and `citation` attributes
- lost/deleted neighboring blocks depending on the interleaving

This is not a readiness wait, locator problem, malformed block tree, or inverted assertion. The low-level repro calls the product `mergeCrdtBlocks` path with valid block snapshots and Yjs updates.

## Natural Workflow

The user-visible workflow is ordinary collaborative post editing over the WebSocket provider:

1. Two browser tabs or two users edit the same post.
2. The post contains adjacent top-level Paragraph, List, Pullquote, and Paragraph blocks.
3. One collaborator moves the List or Pullquote at roughly the same time another collaborator emits a stale full-block snapshot that deletes a neighboring block and/or moves one of the same List/Pullquote blocks.
4. The stale snapshot arrives after the remote structural update has been applied to the local Y.Doc.

No save or reload is required for the live corruption. A later save can persist the corrupted block tree. Network delay is not strictly required, but it makes the stale-snapshot interleaving more likely.

## Current-Base Evidence

Temporary pass-171 test:

`packages/core-data/src/utils/test/crdt-a73ef852b497-pass171.test.ts`

The test enumerated 96 valid interleavings:

- remote move of `list` or `pullquote`
- stale local snapshot from the initial block order
- one local delete among `intro`, `list`, `pullquote`, `tail`
- optional local move of `list` or `pullquote`

Command on the current known-fixes base:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-current-20260507
npm run test:unit -- packages/core-data/src/utils/test/crdt-a73ef852b497-pass171.test.ts --runInBand
```

Result before the experimental fix:

```text
FAIL packages/core-data/src/utils/test/crdt-a73ef852b497-pass171.test.ts
Expected: []
Received: 58 smear cases
```

Representative received state:

```json
[
  {
    "clientId": "pullquote",
    "name": "core/pullquote",
    "attributes": {
      "value": "<p>Pullquote value</p>",
      "citation": "Pullquote citation"
    },
    "innerBlocks": [
      {
        "clientId": "list-item-one",
        "name": "core/list-item",
        "attributes": { "content": "Alpha list item" },
        "innerBlocks": []
      },
      {
        "clientId": "list-item-two",
        "name": "core/list-item",
        "attributes": { "content": "Beta list item" },
        "innerBlocks": []
      }
    ]
  },
  {
    "clientId": "intro",
    "name": "core/paragraph",
    "attributes": { "content": "Intro paragraph" },
    "innerBlocks": []
  },
  {
    "clientId": "tail",
    "name": "core/paragraph",
    "attributes": { "content": "Tail paragraph" },
    "innerBlocks": []
  }
]
```

Another representative state contained a paragraph with Pullquote-only attributes:

```json
{
  "clientId": "tail",
  "name": "core/paragraph",
  "attributes": {
    "value": "<p>Pullquote value</p>",
    "citation": "Pullquote citation",
    "content": "Tail paragraph"
  },
  "innerBlocks": []
}
```

## Root Cause

The old merge implementation introduced in `84019935998c` uses a positional left/right sweep in `mergeCrdtBlocksIntoYBlocks`. When a full local block snapshot is stale relative to the current Yjs array, index positions no longer identify the same block. The merge can therefore apply the `name`, attributes, and `innerBlocks` from one block to a different Y.Map.

The current known-fixes base adds stale-local reconciliation and clientId-aware rebase/reorder helpers, but there is still a gap when the incoming local snapshot and current Yjs array have different lengths or partially different sets after a delete. In that case:

1. `rebaseYBlocksByClientId` can reject the case because the base/current/incoming shapes are not reorder-compatible.
2. `reorderYBlocksByClientId` only handles equal-length same-set arrays.
3. The code falls through to the positional merge.
4. The positional merge updates the wrong Y.Map and smears List/Pullquote/Paragraph identities.

## Fix Direction

The experimental fix that passed the new low-level repro adds a clientId structural sync before the positional fallback:

1. Require every incoming block and every current Y block to have a unique stable `clientId`.
2. Delete current Y blocks whose clientId is absent from the incoming/reconciled block list.
3. Move existing Y blocks by clientId into the incoming order.
4. Insert missing incoming blocks by clientId.
5. Merge block values by clientId using the existing `mergeYBlocksByClientId` and base-block logic.
6. Only use the old positional fallback when clientId-safe alignment is impossible.

This removes the cross-block identity smear without relying on index alignment. It does not by itself settle all concurrent move conflict policy questions; those still need an explicit product decision. The key correctness property is that a stale snapshot must not rewrite one block's type or attributes into a different block's Y.Map.

## Practical Impact

Likelihood on current known-fixes base: `low`.

The required workflow is plausible but timing-sensitive: real-time collaborative editing, adjacent List/Pullquote/Paragraph blocks, concurrent delete/move operations, and a stale full-block snapshot landing after a remote structural update. The exact archived sequence came from fuzzing, but the operations themselves are normal editor actions.

Blast radius is content corruption. The live editor can contain the wrong block type, misplaced list items, Pullquote-only attributes on Paragraph blocks, and deleted or duplicated neighboring content. If saved, the corruption can persist. Recovery is manual cleanup or revision restore; there is no evidence of save loops, performance/OOM risk, or pure UI-only inconsistency.

## Pass 172 Update

Pass 172 re-ran the committed low-level proof on clean detached worktrees:

- `3dabfbbb862` test-only failed with 58 List/Pullquote smear cases out of 96 checked interleavings.
- `a4cbae8da63` fixed branch passed the same test.

The failure path is narrower than "any move conflict": it needs the stale local snapshot to change the clientId set or length, usually by deleting a nearby block. That shape bypasses `rebaseYBlocksByClientId`, is not fully handled by `reorderYBlocksByClientId`, and then reaches the positional `mergeCrdtBlocksIntoYBlocks` update loop. The positional loop merges `blocksToSync[left]` into `yblocks.get(left)`, so when the ids have shifted it can rewrite a Paragraph with Pullquote attributes or a Pullquote with List item descendants.

A temporary natural-action Playwright probe was drafted at:

`/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-172/a73-lowlevel.Ygdb7V/test-only/test/e2e/specs/editor/collaboration/collaboration-a73ef852b497-natural-probe.spec.ts`

The probe uses a valid preexisting Paragraph/List/Pullquote/Paragraph post and real toolbar/options-menu actions for concurrent move and delete. It was not committed because `wp-env start` for that new worktree stalled while cloning `wordpress-develop` for PHPUnit setup, so the browser probe did not run and no video was produced. The remaining evidence gap is therefore still an end-to-end, natural two-user WebSocket repro.

## Pass 174 Update

Pass 174 re-ran the committed split again from clean detached worktrees:

- `3dabfbbb862` still fails the targeted List/Pullquote stale snapshot repro with 58 smear cases across 96 valid interleavings.
- `a4cbae8da63` still passes the same targeted repro.

I also audited the experimental `syncYBlocksByClientId` fix against the adjacent stale top-level insert/delete preservation path. The proof patch is less blunt than "make incoming blocks authoritative": `reconcileStaleLocalBlocks` first re-adds remote-only inserts that were not present in the previous local snapshot and drops remotely deleted blocks before the structural clientId sync runs. That is the right safety shape for the targeted bug, but the patch is still a proof-quality change. It needs a full adjacent regression run before it should be treated as upstream-ready.

The adjacent `crdt-stale-top-level-blocks.test.ts` run was blocked again by the local dependency tree lacking `framer-motion`, so this branch still does not satisfy the full requested standard. Commit 2 on the PR branch remains an empty marker for the missing natural Playwright repro/video.

## Pass 175 Update

Pass 175 added a smaller independent root-cause repro that exercises one concrete schedule instead of the 96-case enumerator:

1. Start both peers from `intro, list, pullquote, tail`.
2. Peer A moves `list` before `intro`, so the receiver's Yjs array is `list, intro, pullquote, tail`.
3. Peer B still has the old local snapshot, deletes `intro`, and moves `list` below `pullquote`, producing `pullquote, list, tail`.
4. The current known-fixes base rejects both clientId-aware reorder paths because the stale snapshot has a changed length/clientId set, then the positional fallback merges `blocksToSync[0]` into `yblocks.get(0)`.

The focused pass-175 test failed on the exact known-fixes commit `f256024286dd80a4c0e2579f658c109256abf648`:

```text
FAIL packages/core-data/src/utils/test/crdt-a73ef852b497-pass175-root.test.ts
Expected: false
Received: true
```

The printed triage state from the same run showed the List Y.Map rewritten as a Pullquote while retaining its two List Item children:

```json
{
  "clientId": "pullquote",
  "name": "core/pullquote",
  "attributes": {
    "value": "<p>Pullquote value</p>",
    "citation": "Pullquote citation"
  },
  "innerBlocks": [
    { "clientId": "list-item-one", "name": "core/list-item" },
    { "clientId": "list-item-two", "name": "core/list-item" }
  ]
}
```

The same focused test passed on the proof-fix commit, confirming that the clientId structural sync covers the narrowed root-cause schedule as well as the broader enumerator. The PR branch was rebuilt with the focused repro folded into the first non-Playwright repro commit:

```text
21ca487683a Add RTC List/Pullquote stale snapshot repro
6fa29ebacd6 Record missing natural Playwright repro for RTC List/Pullquote smear
377adcfdae6 Avoid positional block smear after stale RTC snapshots
```

`wp-env` was checked for the pass-175 worktree and was uninitialized; no new browser repro or video was produced in this pass.

## Pass 176 Update

Pass 176 rechecked the real-user path into the low-level merge. In the post editor, block changes are sent as full `blocks` arrays through `editEntityRecord`, and `core-data` passes the current edited record as `baseRecord` into the sync manager. The sync manager then calls `applyPostChangesToCRDTDoc`, which calls `mergeCrdtBlocks` with the block array and `baseRecord.blocks`. Ordinary block-editor actions can produce the needed structural deltas: `moveBlocksToPosition` dispatches `MOVE_BLOCKS_TO_POSITION`, and `removeBlocks` dispatches `REMOVE_BLOCKS`. This keeps the pass-175 low-level schedule aligned with normal editor behavior rather than a malformed block injection.

Fresh verification on detached pass-176 worktrees:

```text
21ca487683a Add RTC List/Pullquote stale snapshot repro
FAIL packages/core-data/src/utils/test/crdt-a73ef852b497-pass175-root.test.ts
Expected: false
Received: true

377adcfdae6 Avoid positional block smear after stale RTC snapshots
PASS packages/core-data/src/utils/test/crdt-a73ef852b497-pass175-root.test.ts
```

The practical likelihood remains `low`: the operations are normal, but the bug requires two active RTC sessions to structurally edit the same small block neighborhood before the stale snapshot is reconciled. The missing artifact remains the same as pass 175: there is still no completed natural user-action Playwright repro or annotated video.

## Pass 177 Update

Pass 177 reran the focused pass-175 repro on fresh detached worktrees:

```text
21ca487683a Add RTC List/Pullquote stale snapshot repro
parent f256024286d Integrate RTC known-fix stack
FAIL packages/core-data/src/utils/test/crdt-a73ef852b497-pass175-root.test.ts
Expected: false
Received: true

377adcfdae6 Avoid positional block smear after stale RTC snapshots
base f256024286d plus test/marker/fix stack
PASS packages/core-data/src/utils/test/crdt-a73ef852b497-pass175-root.test.ts
```

This independently confirms that the exact known-fixes base still reaches the positional smear path, and that the proof fix still covers the narrowed root-cause schedule.

Pass 177 also reran the uncommitted natural WebSocket probe from pass 172 after starting the test `wp-env` config on `http://localhost:10161` with WebSocket port `22488`. The first run against the regular `wp-env` config failed before test execution because the WebSocket provider test plugin was not mounted. After switching to `.wp-env.test.json`, the probe loaded the editor but failed before the move/delete actions: the live editor block tree was replaced by older fuzz-seed content (`953376` on the first run, `956646` on the rerun) even though `wp post get` showed the database post still contained the intended four-block Paragraph/List/Pullquote/Paragraph fixture and `wp post meta list` showed no `_crdt_document` meta.

That browser result is not a valid repro for this signature. It does, however, explain why the existing branch still lacks the requested natural-user video: the available probe is blocked by a separate WebSocket/e2e setup contamination problem before it can exercise the intended action interleaving. The practical likelihood classification stays `low`, not lower, because the CRDT-level product path remains real and the editor operations are ordinary; the missing data is frequency under a clean WebSocket browser schedule.

## Pass 178 Update

Pass 178 rebased this explanation branch onto `origin/trunk` `d52e35a291c17da7bc48a1efd4c77a601ed3ad67` and reran the repro/fix split from new detached worktrees under `bug-processing/deep-state/pass-178/work/a73-pass178-verify/`.

Focused repro:

```text
21ca487683a Add RTC List/Pullquote stale snapshot repro
FAIL packages/core-data/src/utils/test/crdt-a73ef852b497-pass175-root.test.ts
Expected: false
Received: true

377adcfdae6 Avoid positional block smear after stale RTC snapshots
PASS packages/core-data/src/utils/test/crdt-a73ef852b497-pass175-root.test.ts
```

Broader enumerator:

```text
21ca487683a Add RTC List/Pullquote stale snapshot repro
FAIL packages/core-data/src/utils/test/crdt-a73ef852b497-pass171.test.ts
Expected: []
Received: 58 smear cases across 96 checked cases

377adcfdae6 Avoid positional block smear after stale RTC snapshots
PASS packages/core-data/src/utils/test/crdt-a73ef852b497-pass171.test.ts
```

The sharper pass-178 likelihood conclusion remains `low`, but it is `low` rather than `very-low`: the individual operations are ordinary toolbar/menu/List View/drag-drop block operations. The uncommon part is the RTC schedule: one peer's current Y.Array already reflects a remote move, while the other peer sends a stale full `blocks` snapshot that both deletes a neighboring block and reorders the same List/Pullquote region. That changed clientId set bypasses the current same-length clientId reorder helpers and falls into the positional update loop, where `mergeBlockIntoYBlock( yblocks.get( left ), blocksToSync[ left ], ... )` can rewrite one block's `name`, attributes, and `innerBlocks` into another block's Y.Map.

The remaining evidence gap is still browser frequency, not product reachability. `useEntityBlockEditor` sends full `blocks` edits through `editEntityRecord`; `applyPostChangesToCRDTDoc` passes those edits into `mergeCrdtBlocks`; `moveBlocksToPosition` and `removeBlocks` provide normal editor paths for the move/delete inputs used by the low-level repro. The shortest confidence-improving follow-up is therefore still a clean WebSocket two-tab run, but it should first isolate or reset the provider room state so the initial post does not get replaced by stale fuzz-seed room content before the target actions run.

## Pass 179 Update

Pass 179 re-read the handoff manifest, pass-178 summary, known-fixes manifest, explanation branch, PR branch, focused repro, enumerator repro, known-fixes-base merge code, and proof-fix diff. The source artifact directory named by the manifest was still absent at both likely local roots, so the original archived browser trace/screenshots remain unavailable locally.

Fresh detached pass-179 verification used:

```text
21ca487683a Add RTC List/Pullquote stale snapshot repro
parent f256024286d Integrate RTC known-fix stack
FAIL packages/core-data/src/utils/test/crdt-a73ef852b497-pass175-root.test.ts
Expected: false
Received: true

377adcfdae6 Avoid positional block smear after stale RTC snapshots
PASS packages/core-data/src/utils/test/crdt-a73ef852b497-pass175-root.test.ts

21ca487683a Add RTC List/Pullquote stale snapshot repro
FAIL packages/core-data/src/utils/test/crdt-a73ef852b497-pass171.test.ts
Expected: []
Received: 58 smear cases across 96 checked cases

377adcfdae6 Avoid positional block smear after stale RTC snapshots
PASS packages/core-data/src/utils/test/crdt-a73ef852b497-pass171.test.ts
```

Pass 179 narrows the root-cause proof to the changed-clientId-set gate. On known-fixes base `f256024286dd80a4c0e2579f658c109256abf648`, `canReorderBlocksByClientId` rejects the stale-delete case at the length/set check, so `rebaseYBlocksByClientId` cannot handle the schedule. `reorderYBlocksByClientId` has the same equal-length/same-set precondition. The code then calls the old positional fallback, whose update loop merges `blocksToSync[ left ]` into `yblocks.get( left )` without proving those entries have the same clientId. In the focused repro, the current Y.Array begins with `list` after the remote move, while the stale incoming array begins with `pullquote` after deleting `intro`; the fallback therefore rewrites the List Y.Map as Pullquote while retaining List Item descendants.

The proof-fix commit adds `syncYBlocksByClientId` before that positional fallback. It first deletes current Y blocks whose clientId is absent from the incoming/reconciled block list, then moves existing Y blocks by clientId, inserts missing incoming ids, and finally calls `mergeYBlocksByClientId`. That changes the key safety property from "same index probably means same block" to "only merge values into the matching clientId".

Current upstream `origin/trunk` after a pass-179 fetch was `f4df834d9f8b64b610fd677087e79d0cd6632598` (`UI: Improve docs for compound exports (#78212)`). It does not contain the proof-fix helper or the a73 regression tests. The pass-179 practical likelihood classification remains `low`: the editor actions are ordinary and the corruption is real/persistent if saved, but the schedule requires two RTC sessions to structurally edit the same small block neighborhood before a stale full-block snapshot is reconciled.
