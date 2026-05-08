# RTC websocket quote move into group reparenting bug

Bug signature: `87101fb17dd3`

Transport: websocket RTC test provider

## Summary

A stale local block snapshot can corrupt the shared CRDT block tree when a peer
first receives a remote top-level reorder and then locally moves the reordered
block into a Group. The deterministic replay is:

1. Both peers start with `Heading`, `Group(Paragraph alpha, Paragraph beta)`,
   `List`, `Quote`.
2. Peer B edits the first nested Group paragraph.
3. Peer A moves the top-level Quote above the Heading and syncs that reorder to
   peer B.
4. Peer B submits one local block snapshot where the Quote is no longer
   top-level and is now the first child of the Group.

The expected root shape is:

```text
heading, group[quote, updated paragraph, beta paragraph], list
```

On the known-fixes base `f256024286dd80a4c0e2579f658c109256abf648`, the actual
shape is:

```text
quote[paragraph], heading[quote, updated paragraph, beta paragraph], list
```

That is real block-tree corruption, not only a visual disagreement. If this
state is saved, the serialized post content can preserve the wrong structure.

## Root Cause

`mergeCrdtBlocks` normally tries the clientId-aware rebase path before falling
back to the older left/right index diff. This bug is in the fallback.

The top-level Quote move into the Group changes the top-level clientId set:

```text
previous local base: heading, group, list, quote
current Y doc:        quote, heading, group, list
incoming snapshot:    heading, group, list
```

Because the incoming top-level array has a different length and set, the
clientId rebase cannot run. The fallback then updates by array index while still
passing the stale `previousBlocks[index]` base into `mergeBlockIntoYBlock`.
Those bases are no longer aligned with the current Y blocks:

```text
index 0 current Y block: quote
index 0 stale base:      heading
index 0 incoming block:  heading

index 1 current Y block: heading
index 1 stale base:      group
index 1 incoming block:  group
```

The stale base suppresses updates whose incoming values match the stale base.
That leaves the current Quote block's identity and child paragraph at index 0,
then applies the incoming Group's three children to the current Heading at index
1, and finally deletes the original Group. The result is the corrupted
`quote, heading[3], list` tree.

Relevant history:

- `84019935998c16f877e976ad85e84748355d7282` (`Improve CRDT "merge logic" for post entities (#72262)`, 2025-10-14) introduced the generic index-based block merge path.
- `876398df67b8` / `9c5dba15654e` and the May 7 known-fixes integration added stale-snapshot/base-aware merge behavior to preserve remote edits, but still let the index fallback use a stale base after the current Y block, incoming block, and previous base no longer represented the same clientId.
- `f256024286dd80a4c0e2579f658c109256abf648` is the May 7 known-fixes base used for the replay; it includes the relevant stale-snapshot and clientId rebase fixes, but not this guard.

## Practical Impact

Likelihood: very-low.

The required user workflow is a collaborative post editor session using the
websocket RTC provider, with two browser contexts/users editing the same post.
The content needs a top-level Heading, a Group with nested paragraphs, a List,
and a top-level Quote. One peer must edit the nested Group paragraph, another
peer must move the Quote above the Heading, and the first peer must then produce
a single local update that moves that same Quote into the Group while its
previous local merge base still reflects the pre-reorder top-level order.

The block types and top-level/nested moves are ordinary editor concepts. The
transport, multi-user editing, and concurrent timing are less common. The
artificial part is the single stale local snapshot: the natural browser
workflows I tried either did not produce the exact move or refreshed the local
base before moving, which avoided the corruption. A lower-level CRDT replay can
produce the state deterministically.

Blast radius if hit:

- Content tree corruption: high for that post session.
- Duplicate/misparented content: yes, the Quote remains top-level while the
  intended Group children move under the Heading.
- UI-only inconsistency: no, the CRDT block tree is wrong.
- Persistence risk: possible if the corrupted peer saves.
- Save loop/performance/OOM: not observed.
- Recovery: undo before save, reload from a healthy unsaved peer, or manually
  repair the block tree after save.

Evidence for the classification:

- The current known-fixes base fails the deterministic CRDT replay with exactly
  `quote[1], heading[3], list[3]`.
- The failure mechanism is a concrete stale-base/clientId mismatch in the
  fallback merge path.
- Related fuzz signatures in the same family report the same Heading/Group
  reparenting shape.

Evidence against a higher likelihood:

- The refreshed realistic Playwright spec from the handoff did not prove the
  bug; the previous pass found it failed at readiness/snapshot setup.
- Four realistic UI-only scenarios in the handoff did not reproduce the target
  corruption.
- My pass-170 browser attempts with list-view drag, canvas drag, and list-view
  cut/paste did not reproduce the corrupted state. The successful natural
  workflows appear to refresh the stale merge base before the final move.

Shortest confidence-improving experiment:

Instrument `mergeCrdtBlocks` in a headless browser run to log `previousBlocks`,
current Y block clientIds, and incoming block clientIds for every natural Quote
move-into-Group UI path. This would show whether any shipped UI gesture can
submit the single stale snapshot that the CRDT replay exercises.

## Fix Plan

Initial plan: extend the clientId rebase to support top-level removal plus
nested insertion of the same clientId.

Kernel-maintainer robustness audit: that would be a larger tree-diff algorithm
inside a delicate CRDT path. It risks changing behavior for deletes, nested
moves, and blocks without stable clientIds.

Jepsen-style correctness audit: the invariant here is simpler than a full
rebase. A stale base is only safe if it describes the same logical object as the
current Y block and the incoming block. If those clientIds diverge, using the
base can suppress required updates and graft children across block identities.

Dan-Luu-style simplicity/performance audit: the smallest reliable guard is
O(1) per updated block and avoids a new tree diff. It keeps all existing
clientId-aware paths intact and only disables stale-base suppression when the
index fallback has already lost object alignment.

Revised fix: before passing `previousBlocks[index]` into an index fallback
update, require the previous block, incoming block, and current Y block to share
the same clientId whenever any of them has a clientId. If they do not align,
merge the incoming block without a stale base for that index.

## Verification

Failing before the fix on the May 7 known-fixes base:

```sh
npm run test:unit packages/core-data/src/utils/test/rtc-87101-quote-move-into-group-replay.test.ts
```

The failure was:

```text
Expected: heading, group[3], list[3]
Received: quote[1], heading[3], list[3]
```

Passing after the fix:

```sh
npm run test:unit packages/core-data/src/utils/test/rtc-87101-quote-move-into-group-replay.test.ts
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts
```

Browser repro status: no honest natural-user Playwright repro was found in this
pass. The attempted browser workflows are evidence that the practical
real-user likelihood is very low, and the pushed PR branch includes an explicit
empty commit documenting that gap rather than using direct store mutation.
