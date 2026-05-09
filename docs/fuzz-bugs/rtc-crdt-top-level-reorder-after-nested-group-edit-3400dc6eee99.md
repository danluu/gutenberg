# RTC top-level quote reorder can graft Group children into a Heading

Bug signature: `3400dc6eee99`

Transport in source artifact: HTTP RTC polling

Related signature: `87101fb17dd3`

## Summary

Seed `953134` describes a real CRDT block-tree corruption after a nested Group
edit, a top-level Quote reorder, and a later move of that same Quote into the
Group. The expected shared block tree is:

```text
heading, group[quote, edited nested paragraph, beta paragraph], list
```

The corrupted peer instead settles to:

```text
quote[paragraph], heading[quote, edited nested paragraph, beta paragraph], list
```

That is not a visual-only mismatch. The Quote remains top-level and the intended
Group children are grafted into the preceding Heading.

The pass-171 reduction for this signature reproduced a stale Quote after moving
the Quote into the Group, but it omitted the intermediate top-level Quote
reorder. That omission made the May 7 known-fixes base look fixed. A narrower
replay with the missing reorder still fails on
`f256024286dd80a4c0e2579f658c109256abf648`, the requested backlink-aware
known-fixes base.

Pass 179 also found an honest browser route in the related seed-953134
`triage-87101fb17dd3-realistic.spec.ts` probe. The successful scenario edits the
nested Group paragraph, moves the Quote to the top through toolbar move buttons,
and then drags the Quote into the Group using the canvas drag handle. On the May
5 refresh checkout it reproduced the exact target split:

```text
primary:   quote[1], heading[3], list[3]
secondary: heading, group[3], list[3]
```

That browser probe used real editor UI actions and no direct store mutation. It
does not replace the May 7 known-fixes verification below, which remains the
focused CRDT replay against the exact known-fixes SHA.

## Deterministic Replay

The replay uses normal block shapes with stable clientIds:

1. Both peers start with `Heading`, `Group(Paragraph alpha, Paragraph beta)`,
   `List`, `Quote`.
2. Peer B edits the first nested Group paragraph.
3. Peer A receives that edit, moves the top-level Quote before the Heading, and
   syncs that reorder.
4. Peer B then emits a local snapshot that moves that Quote into the Group while
   its merge base still reflects the pre-reorder top-level order.

This directly models the source handoff sequence:

```text
edit-nested-paragraph -> move-block -> move-block-into-group
```

The failing known-fixes result is:

```text
Expected: heading, group[3], list[3]
Received: quote[1], heading[3], list[3]
```

## Root Cause

`mergeCrdtBlocks` first tries the clientId-aware rebase and reorder paths. The
3400 shape escapes those paths because the final incoming top-level array has
removed the Quote from the root and nested it inside the Group:

```text
previous local base: heading, group, list, quote
current Y doc:        quote, heading, group, list
incoming snapshot:    heading, group, list
```

Both clientId-aware gates require equal top-level lengths before they can
rebase or reorder by identity. The final snapshot is a valid user operation, but
it changes the root length from four to three, so the merge falls through to the
older indexed diff even though the involved blocks have stable clientIds.

The fallback diff then updates by array index while still passing
`previousBlocks[index]` into `mergeBlockIntoYBlock`. In this state the base,
current Y block, and incoming block describe different logical objects:

```text
index 0 current Y block: quote
index 0 stale base:      heading
index 0 incoming block:  heading

index 1 current Y block: heading
index 1 stale base:      group
index 1 incoming block:  group
```

The stale base suppresses required updates when the incoming block happens to
match that wrong base. The fallback leaves the Quote identity at index 0,
applies the incoming Group children to the current Heading at index 1, and then
deletes the original Group because the incoming root is shorter.

Relevant history:

- `84019935998c16f877e976ad85e84748355d7282` (`Improve CRDT "merge logic" for post entities (#72262)`) introduced the generic index-based block merge path.
- `876398df67b8` added stale previous-block bases to the fallback update site.
- The May 7 known-fixes integration added stale snapshot reconciliation and
  clientId-aware rebase behavior, but still allowed the indexed fallback to use
  an unrelated stale base after identity shifted.

## Practical Impact

Real-user likelihood: medium for this exact signature.

The user-facing workflow is ordinary collaborative editing in the post editor:
two users or tabs edit a post containing a Heading, Group, nested Paragraphs,
List, and Quote. One collaborator edits a paragraph inside the Group. Another
collaborator reorders the Quote at the top level. The first collaborator then
moves that Quote into the Group.

The rare part is timing. A peer must submit the Quote-into-Group snapshot while
its previous local merge base still reflects the pre-reorder top-level order.
The source artifact used HTTP polling and one delayed sync; a low-level CRDT
replay can force the same stale-base window. Pass 179 raised this from `low` to
`medium` because a seed-953134 Playwright probe reproduced the exact final split
with real typing, toolbar moves, and a canvas drag into the Group. It is still
not `high` because the reproduced browser route was confirmed on the May 5
refresh checkout, while the May 7 backlink-aware known-fixes verification is
currently the lower-level replay rather than a full browser rerun.

Blast radius if hit:

- Content tree corruption: yes.
- Duplicate or stale content: yes, the Quote can remain top-level while its
  intended destination content is grafted into the Heading.
- UI-only inconsistency: no, the shared Yjs block tree is wrong.
- Persistence risk: possible if the corrupted tree is saved.
- Save loop, persistence API failure, performance/OOM risk: not observed for
  this signature.
- Recovery: undo or reload before save, or manual repair/revision restore after
  save.

## Fix

The fix is intentionally narrow. Before using `previousBlocks[index]` as a
stale merge base in the indexed fallback, require the previous block, incoming
block, and current Y block to share the same clientId whenever any of those
clientIds exists. If they do not refer to the same logical block, merge the
incoming block without stale-base suppression for that index.

That preserves the existing rebase and fallback structure while enforcing the
distributed-systems invariant that a stale base can suppress updates only when
it describes the same object as the current and incoming blocks.

## Verification

Known-fixes base plus replay:

```sh
npm run test:unit packages/core-data/src/utils/test/rtc-3400dc6eee99-quote-reorder-into-group-replay.test.ts -- --runInBand
```

Result before the fix:

```text
Expected: heading, group[3], list[3]
Received: quote[1], heading[3], list[3]
```

After the fix:

```sh
npm run test:unit packages/core-data/src/utils/test/rtc-3400dc6eee99-quote-reorder-into-group-replay.test.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
```

Both pass on the PR branch.

Pass 178 re-ran the same focused replay on
`f256024286dd80a4c0e2579f658c109256abf648`, the May 7 backlink-aware
known-fixes base, and it still failed with:

```text
Expected: heading, group[3], list[3]
Received: quote[1], heading[3], list[3]
```

The current PR branch still passes the focused replay and the adjacent
`crdt-blocks.ts` suite.

No honest natural-user Playwright repro is currently known for this exact stale
base window. The PR branch includes an explicit empty commit documenting that
gap instead of using direct store mutation or malformed block input as a browser
test.
