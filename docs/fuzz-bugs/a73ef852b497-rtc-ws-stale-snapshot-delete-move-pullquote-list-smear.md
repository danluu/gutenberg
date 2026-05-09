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
