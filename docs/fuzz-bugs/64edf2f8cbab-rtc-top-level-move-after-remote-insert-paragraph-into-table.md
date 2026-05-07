# RTC top-level move after remote insert near table (`64edf2f8cbab`)

## Summary

The handoff row for `64edf2f8cbab` describes a real RTC block-merge failure:
after one collaborator inserts a top-level paragraph near a paragraph/table
sequence, another collaborator moves a neighboring top-level paragraph. Older
merge code can reconcile the move by updating the Y.Map at the same array
position instead of preserving the logical block identified by `clientId`. In
the paragraph/table/paragraph case, that means the table record can be rewritten
as the moved paragraph and the previous paragraph record can become the table.

The May 7 known-fixes base fixes the direct table/paragraph rewrite path, but a
remaining same-array cache path is still unresolved: when the editor reuses the
same block-array object after a remote insert, `serializableBlocksCache` returns
the stale pre-insert snapshot and the local move is missed.

## User Workflow

- Surface: post editor with real-time collaboration enabled.
- Transport: reproduced at the CRDT merge layer with the HTTP RTC path from the
  handoff; the failure is not WebSocket-specific.
- Blocks: ordinary top-level `core/paragraph`, `core/table`,
  `core/paragraph`.
- Actors: two tabs or two users editing the same post.
- Sequence: one collaborator inserts a paragraph before/near the table segment;
  the other moves the trailing paragraph up across the table.
- Timing: the visible UI sequence converges in the state-asserting Playwright
  replay on the fixed branch, but the lower-level failure needs a reused
  block-array object after remote delivery. That reuse is plausible in store
  snapshots but was not observed in the natural browser replay from this pass.

## Impact

On affected interleavings, this is content corruption, not a readiness wait or
locator failure. The direct failure rewrites logical block records across
different block types, so table body data can be associated with the wrong block
slot and a user move can be ignored or cross-wired. If saved after corruption,
the bad block tree can persist. I found no evidence of a save loop, OOM, or
global editor crash. Recovery is undo/manual correction before save, or
revisions/backups after save.

Practical likelihood on current trunk and the May 7 known-fixes base: `low`.
The natural paragraph/table toolbar workflow is ordinary, but the remaining
failing path depends on the editor reusing a block-array object across remote
delivery and a local move. The state-asserting Playwright replay of the natural
workflow passes on the fixed branch.

## Evidence

- Manifest row:
  `likely-real-issues.jsonl` index 46, canonical signature `64edf2f8cbab`,
  high confidence, summary: moved paragraph is merged into an adjacent table
  after a remote top-level insert.
- Historical generated spec:
  `triage-64edf2f8cbab-realistic.spec.ts` used normal two-user UI actions but
  only asserted the inserted paragraph became visible; it did not compare final
  block trees.
- New low-level repro:
  `packages/core-data/src/utils/test/rtc-top-level-move-after-remote-insert-paragraph-into-table.test.ts`.
  On `origin/trunk`, both focused tests fail:
  - the captured table Y.Map is rewritten into `paragraph-b`;
  - when the same editor block array is reused after remote insert delivery, the
    local move is not observed and the final order stays
    `remote-inserted, paragraph-a, table, paragraph-b`.
- Known-fixes base check:
  commit `f256024286dd80a4c0e2579f658c109256abf648` passes the direct rewrite
  test but still fails the same-array test with
  `remote-inserted, paragraph-a, table, paragraph-b`.
- Browser check:
  the state-asserting Playwright replay uses natural editor actions and passes
  on the rebased fixed branch for the simultaneous toolbar-action interleaving.
  This lowers confidence that normal UI currently hits the remaining cache
  path, but does not disprove the lower-level merge bug.
- Pass 178 refresh:
  current `origin/trunk` `569ea262b573872d5f364e9f4829132c47c683d4`
  still fails both low-level repros when only the test commit is applied; exact
  known-fixes `f256024286dd80a4c0e2579f658c109256abf648` still fails the
  same-array move repro; the rebased PR branch passes the focused repro, the
  broader `crdt-blocks` suite, lint, diff check, and the natural Playwright
  replay.
- Pass 179 refresh:
  current `origin/trunk` `b41e4e944f7852d89ac58ecfd1dc854447173fa2`
  still fails both low-level repros when only the unit-test commit is applied.
  The exact known-fixes base still passes the direct table identity test and
  fails the same-array move test. The rebased PR branch passes the focused
  repro, the broader `crdt-blocks` suite, lint, and diff check. A fresh
  current-trunk Playwright rerun was blocked before user actions because
  `_wpCollaborationEnabled` was not injected into the post editor even after
  `wp_collaboration_enabled` was set to `1`; the prior annotated video and
  pass-178 natural replay remain the browser evidence for the user workflow.
- Pass 180 refresh:
  fetched `origin/trunk` `cb74beb786b366ff69dac328b04861add1a67974`.
  The commits since pass 179 only affected dependency and unrelated files in
  the scoped RTC/collaboration paths checked here. Applying only the focused
  unit repro to that trunk still fails both tests: the direct path does not
  preserve the original table Y.Map identity, and the same-array path ends as
  `paragraph-a, table, paragraph-b`, dropping the remote insert and missing the
  move. A clean detached check of exact known-fixes
  `f256024286dd80a4c0e2579f658c109256abf648` still passes the direct table
  identity test and fails the same-array move with
  `remote-inserted, paragraph-a, table, paragraph-b`. The three-commit PR stack
  was replayed on `cb74beb786b`; the focused repro, the broader 71-test
  `crdt-blocks` suite, lint, and `git diff --check` all pass.

## Origin

`git blame` points the unsafe assumptions to `84019935998c`:
`Improve CRDT "merge logic" for post entities (#72262)`.

That commit introduced:

- `serializableBlocksCache`, keyed only by block-array object identity;
- the left/right positional merge sweep in `mergeCrdtBlocks`.

Those choices are individually reasonable for performance and generic diffing,
but together they are unsafe for collaborative block moves. A top-level move is
not an instruction to rewrite whatever Y.Map currently occupies the target
array index. It is a block identity change by `clientId`. Likewise, a WeakMap
cache keyed by an array object is only valid if the array object is immutable;
the remaining repro shows that a reused array object can hide a later remote
insert plus local move.

## Fix Plan And Audit

Initial plan: keep the existing positional merge, but add a special case for
pure top-level reorders by unique `clientId`.

Kernel-maintainer audit: the fix must be conservative. It should only trigger
when every current and incoming top-level block has a unique `clientId`, the
sets are identical, and the lengths match. Otherwise the existing insert/delete
merge path remains in charge.

Jepsen-style audit: the central invariant is logical identity, not position.
When replicas exchange updates in different orders, a move must not be encoded
as "change table fields to paragraph fields at index 2." Reordering by
`clientId` before field merge avoids cross-type record rewrites in pure move
cases.

Simplicity/performance audit: removing `serializableBlocksCache` gives up a
small optimization but removes an invalid immutability assumption from a
correctness-critical path. The reorder scan is O(n^2) in the current simple
implementation; this is acceptable for the narrow pure-reorder path and avoids
introducing a broader diff engine in a bug fix. A future optimization could add
a `Map<clientId,index>` if profiling shows real cost.

Revised plan implemented in the PR branch:

1. Always serialize from the current `incomingBlocks` value instead of using
   `serializableBlocksCache`.
2. Before the positional sweep, detect pure top-level reorders by unique
   `clientId`.
3. For those pure reorders, put the Y.Array in incoming `clientId` order first,
   so the subsequent merge updates matching logical blocks instead of rewriting
   neighboring block records by index.

Residual risk: this is intentionally narrower than the full known-fixes stack.
It fixes the direct table/paragraph move and the same-array cache miss covered
by this pass, but it does not replace the whole CRDT merge algorithm or solve
all stale snapshot/content-conflict cases.
