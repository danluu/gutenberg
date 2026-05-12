# RTC top-level group move misses a paragraph reorder (`f71f8a233356`)

## Summary

The handoff row for `f71f8a233356` is a same-run duplicate of the
`64edf2f8cbab` move-reconciliation family, but the group/paragraph shape is
worth recording separately. The original seed starts with ordinary top-level
Heading, Group, Paragraph, Paragraph blocks. One collaborator moves the heading
and trailing paragraph into the group. A later move of the remaining top-level
paragraph should leave the document as:

```text
Paragraph
Group( nested paragraph, nested heading, heading, appended paragraph )
```

The generated UI spec for this signature did not reach that assertion because
its `openListView` helper toggled the already-open Document Overview sidebar
closed. A focused CRDT probe still confirms the underlying failure mode:
`mergeCrdtBlocks` can use a stale block-array snapshot if a caller reuses
the same array object after remote move-into-group operations. On current
`origin/trunk` at `a6cc01ba412c`, the final local move is still lost and the
old four-block order is resurrected. On the May 7 backlink-aware known-fixes
base at `f256024286d`, the direct cross-block rewrite is improved, but a clean
detached-worktree replay still leaves the document in the pre-move
`[group, paragraph]` order.

## User Workflow

- Surface: post editor with real-time collaboration enabled.
- Transport: HTTP RTC path from the handoff; the CRDT defect is not tied to
  WebSocket-only behavior.
- Blocks: ordinary `core/heading`, `core/group`, and `core/paragraph` blocks.
- Actors: two tabs or two users editing the same post.
- Sequence: one collaborator moves two top-level blocks into a group; the other
  later moves the remaining top-level paragraph above that group.
- Timing: requires a stale local block snapshot or reused block-array object
  after remote structural edits are delivered. The exact interleaving came from
  fuzzing. The visible generated Playwright spec for this exact signature was
  invalid as written, and the ordinary block-editor move path rebuilds the
  `getBlocks()` array before `useBlockSync` reports the change. Pass 179
  rechecked this against current trunk: `moveTo` and `insertAt` return new
  arrays for `MOVE_BLOCKS_TO_POSITION`, `updateParentInnerBlocksInTree`
  installs a new `innerBlocks` array on the relevant parent tree node, and
  `useBlockSync` only emits block changes when `newBlocks !== blocks`. Pass
  174 also checked the visible move call sites: list view, drag/drop, grid,
  native movers, and editor wrapper actions all funnel through
  `MOVE_BLOCKS_TO_POSITION`, so this exact same-array route is less natural
  than the broader top-level move family. Pass 175's browser identity probe
  also observed the top-level `getBlocks()` array identity changing after a
  normal toolbar move in a two-context session.

## Practical Impact

Likelihood for this exact f71 same-array route on the May 7 known-fixes base:
`very-low`.

The blocks and editor actions are common: headings, groups, paragraphs, list
view drag, and toolbar move controls. The rare part is the precise collaboration
interleaving where remote parent-changing moves are observed and then a local
move is merged from a reused array snapshot. The f71-specific current-base proof
shows a missed final move rather than the original malformed
paragraph-with-group-children tree. The broader `64edf2f8cbab` family remains
more plausible than this exact route because it exercises the same positional
move-reconciliation weakness without depending solely on the generated spec's
failed List View path.

Blast radius is localized document content corruption or missed moves around
the edited block segment. There is no evidence here of a save loop, OOM,
global editor crash, or performance collapse. Recovery is undo/manual reorder
before save, or revision restore if a corrupted/missed-move state is persisted.

## Evidence

- Manifest row: `likely-real-issues.jsonl` index 129, signature
  `f71f8a233356`, high confidence, same-run duplicate of `64edf2f8cbab`.
- Previous pass 36 correctly identified the refreshed UI spec failure as a
  locator/helper bug: the Document Overview button was already pressed and the
  helper closed it.
- New f71-shaped low-level probe:
  `packages/core-data/src/utils/test/rtc-f71f8a233356-group-paragraph-move.test.ts`.
- Current `origin/trunk` result for the probe at `a6cc01ba412c`:
  received block ids `[heading, group, stable-paragraph, appended-paragraph]`
  instead of `[stable-paragraph, group]`.
- May 7 known-fixes base result for the same probe:
  received block ids `[group, stable-paragraph]` instead of
  `[stable-paragraph, group]`. Pass 179 repeated this from an actual detached
  `f256024286d` worktree; the corrected known-fixes run failed with that same
  order.
- Pass 173 confirmed the ordinary editor move path changes array identity:
  `MOVE_BLOCKS_TO_POSITION` creates new order arrays, `updateParentInnerBlocksInTree`
  rebuilds the `innerBlocks` arrays returned by `getBlocks()`, and
  `useBlockSync` only emits block changes when `newBlocks !== blocks`.
- Pass 174 expanded that audit to all current core call sites found for
  `moveBlocksToPosition` and `MOVE_BLOCKS_TO_POSITION`; the normal visible
  block mover, list view/drop, grid, native, and editor-level wrappers share
  the same copy-on-write reducer path.
- A direct Yjs check showed that an already-integrated nested type cannot be
  moved by delete/reinsert or insert/delete; both throw. The fix therefore
  recreates blocks only in the conservative same-set, unique-clientId reorder
  case instead of trying to move Y.Map objects directly.
- Pass 179 rebased the PR branch onto `a6cc01ba412c`; the focused unit probe
  passes at fix commit `eef0db361f4`. The natural Playwright duplicate-family
  coverage also passes headlessly on Chromium after provisioning the missing
  test-only animation and websocket-provider plugins in wp-env. That browser
  test remains coverage/video material rather than a failing exact f71 browser
  proof.
- Canonical `64edf2f8cbab` pass 170 result:
  current known-fixes fixes the direct table rewrite variant but still fails a
  same-array cache replay. The fix branch for that canonical family removes the
  stale array cache and reorders pure moves by stable `clientId`.

## Origin

The unsafe behavior traces to `84019935998c`:
`Improve CRDT "merge logic" for post entities (#72262)`. That change introduced
the positional left/right merge sweep and `serializableBlocksCache` keyed by
the incoming block-array object. Those assumptions are not safe for
collaborative moves: a moved block has a stable `clientId`, and an array object
can be reused while its contents change.

The current known-fixes base adds stale-snapshot reconciliation and client-id
rebasing, which fixes some positional rewrites. It does not remove the
same-array cache assumption, so the f71-shaped move can still be missed after
remote structural edits.

## Fix Plan

Use the canonical `64edf2f8cbab` fix for this duplicate family:

1. Remove `serializableBlocksCache` so each merge serializes the current
   incoming block array value.
2. Before the positional diff, detect pure top-level reorders by unique
   `clientId`.
3. Reorder the Y.Array by `clientId` for those pure moves, then let the
   existing field merge update matching logical blocks.

Robustness audit: only reorder when every current and incoming top-level block
has a unique client id, lengths match, and the sets are identical. Otherwise
the existing insertion/deletion merge remains in charge.

Distributed-systems audit: the invariant is logical block identity, not the
array position at which a remote update happened to arrive. A move must not be
interpreted as "rewrite the record currently at index N."

Simplicity/performance audit: dropping the WeakMap cache is cheaper and safer
than adding invalidation machinery for mutable editor snapshots. The reorder
scan is small and only runs for conservative same-set move cases.
