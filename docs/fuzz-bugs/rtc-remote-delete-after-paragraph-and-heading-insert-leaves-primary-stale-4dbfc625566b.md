# RTC remote delete after paragraph and heading insert leaves primary stale

Bug signature: `4dbfc625566b`

Bug type: `rtc_remote_delete_after_paragraph_and_heading_insert_leaves_primary_stale`

Transport: WebSocket

## Classification

This is a real RTC product bug. It is not explained by malformed generated
content, direct store mutation, an inverted assertion, or a locator-only
failure. The source manifest row in `likely-real-issues.jsonl` marks the
canonical signature as high confidence and recommends filing the bug.

The bug still reproduces on the backlink-aware known-fixes base
`rtc-known-fixes-current-20260507` at `f256024286d`. Pass 180 independently
reapplied the current rebased unit repro to exact `f256024286d` and confirmed
that the stale paragraph is resurrected. The low-level repro applies:

1. a full snapshot containing `inserted-paragraph` and `inserted-heading`;
2. a newer snapshot after `inserted-paragraph` was deleted;
3. the older paragraph+heading snapshot again, with a base snapshot that
   already contained `inserted-paragraph`.

The known-fixes base resurrected the deleted paragraph:

```text
Expected: [ "follow-up", "inserted-heading", "tail", "moved-initial-paragraph" ]
Received: [ "follow-up", "inserted-paragraph", "inserted-heading", "tail", "moved-initial-paragraph" ]
```

The fix branch was rebased again in pass 180 onto current `origin/trunk`
`cb74beb786b3` on 2026-05-13. Current `origin/trunk` plus only the unit repro
commit still fails with the same `inserted-paragraph` resurrection, while the
same focused CRDT repro and guard tests pass on the rebased fix branch. The
natural WebSocket spec from pass 179 also passes under the upstream `#78179`
y-websocket test harness at
`test/e2e/specs/editor/collaboration/websocket-only/collaboration-4dbfc625566b-realistic.spec.ts`.

The archived browser reproduction also reached the natural UI delete action
and captured divergence: the primary editor retained
`Seed 951195 step 2 user 0 paragraph 879021`, while the collaborator editor did
not.

## Practical Impact

Real-user likelihood: `low`.

The natural workflow is collaborative post editing in the block editor using
RTC sync over the WebSocket transport. Two editors open the same post. One
editor inserts a paragraph and then a heading around ordinary top-level text
blocks. The other editor receives the inserted paragraph and deletes it. The
bug requires a delayed full-block snapshot from the inserting editor to apply
after the delete snapshot.

Common prerequisites are ordinary paragraph and heading blocks, normal block
toolbar or inserter actions, and normal deletion from another editor. Rare
prerequisites are active RTC collaboration, at least two browser contexts or
users, and a timing order where an older full snapshot lands after a newer
delete. The exact seed text and deterministic schedule are fuzzing artifacts.
No malformed blocks, artificial block trees, direct state mutation, save/reload
cycle, or transport fault injection is required for the product scenario.

The blast radius is content divergence and possible content resurrection. A
paragraph that one collaborator deleted can stay visible in another editor. The
archived browser artifact shows a UI block-tree split with matching title and
matching surrounding blocks, not a readiness or locator failure. If the stale
editor saves or emits another snapshot, the deleted content can be persisted or
re-propagated. There is no evidence of a save loop, persistence crash, OOM, or
broad performance failure. Recovery is manual: notice the stale block, delete it
again after convergence, and avoid saving from the stale editor before
correcting it.

The strongest evidence for `low` is that ordinary UI actions and ordinary text
blocks reproduce the issue, and the low-level CRDT boundary fails
deterministically. The strongest evidence against a higher classification is
that RTC collaboration is still a specialized workflow and the harmful ordering
is timing-sensitive.

The shortest additional confidence experiment is a small Playwright latency or
CPU-delay sweep around this exact workflow to estimate how often the stale
snapshot ordering happens without fuzz scheduling.

## Root Cause

`editEntityRecord()` sends full `blocks` arrays to the sync manager. The sync
manager defers CRDT updates through `yieldToEventLoop( updateCRDTDoc )`, so an
older full snapshot can apply after a later user-visible delete.

The structural block merge path introduced by `84019935998c` / PR `#72262`
diffs an incoming block array against the current Y.Array and mutates the
Y.Array to match. Without operation bases or deletion evidence, a delayed full
snapshot containing a block that already existed in its base can look like a
fresh insert. In this bug, that lets a stale paragraph+heading snapshot
resurrect the paragraph that the collaborator deleted.

Current known-fixes commits including `1a46ebf1621`, `9c5dba15654e`, and the
synthetic integration `f256024286d` add partial stale-snapshot handling and
`baseRecord` plumbing, but they do not enforce the key invariant for this
case: an update must not recreate a base block after a concurrent delete unless
the update is actually the operation that created that block.

## Fix Plan

The fix carries the edited pre-change record through `editEntityRecord()`,
`SyncManager#update()`, and `applyPostChangesToCRDTDoc()` into
`mergeCrdtBlocks()` as `baseBlocks`.

`mergeCrdtBlocks()` then filters an incoming block only when all of these are
true:

1. the block existed in the update base;
2. the block is absent from the current Y.Array;
3. surviving base siblings bracket the missing block on both sides.

The bracketing check is the pass-171 refinement. A simpler base-aware filter
blocked the target resurrection but could drop legitimate base suffix blocks
when a peer had only a partially initialized CRDT prefix. The revised rule is
more conservative: it fixes the middle-block stale delete while avoiding data
loss during bootstrap or partial sync.

The branch also keeps the previous no-base delete memory as a fallback for
callers that cannot provide a base, and adds guard tests for local reinsert and
partial-base bootstrap behavior.

Residual risk: this is still a top-level block identity fix. Similar stale
snapshot races may exist for nested `innerBlocks`, first/last block deletions
that cannot be bracketed by surviving siblings, and complex move operations.
A broader design should carry operation bases through recursive block arrays
instead of relying on permanent tombstones or unqualified full snapshots.
