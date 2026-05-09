# RTC top-level move group shape corruption (`a81ea0fc772d`)

## Summary

The handoff row for `a81ea0fc772d` describes a deterministic RTC correctness
failure from seed `952549`: after a later top-level move, one peer rewrote a
paragraph into an empty `core/group` shell and leaked adjacent heading/search
structure. The exact archived group/search shell has not been reconstructed as
a clean natural-user Playwright repro on the May 7 known-fixes base, so this
should not be treated as a separate fully isolated bug yet.

Pass 173 found a stronger current-base sibling: a natural two-user post-editor
workflow on the May 7 known-fixes base can leave one peer permanently missing a
collaborator-inserted top-level heading after the heading is moved up. The
failure shares the same unsafe merge/cache path as
`64edf2f8cbab`:

https://github.com/danluu/gutenberg/tree/try/rtc-top-level-move-after-remote-insert-paragraph-into-tabl-64edf2f8cbab

The fix branch for that sibling removes the stale `serializableBlocksCache`
object-identity assumption and preserves top-level moves by `clientId`:

https://github.com/danluu/gutenberg/tree/try/rtc-top-level-move-after-remote-insert-paragraph-into-tabl-64edf2f8cbab-pr

After rebuilding that branch's browser artifacts, the a81 natural-action probe
passed 10/10 in pass 173. This makes `a81ea0fc772d` best classified as a
current-base duplicate/subcase of the same stale same-array top-level move bug,
not as a distinct fix target.

## User Workflow

- Surface: post editor with experimental real-time collaboration enabled.
- Transport: HTTP RTC sync.
- Actors: two tabs or two users editing the same post.
- Blocks: ordinary top-level heading, paragraph, group, search, and table
  blocks.
- Sequence: one peer opens or reloads an existing post; the other inserts a
  paragraph and heading near the tail of the post; the first peer then moves the
  inserted heading up using the normal block toolbar move control.
- Timing: no injected sync faults, malformed blocks, direct store mutation, or
  synthetic block tree injection are needed for the current-base sibling. The
  exact archived shell corruption still depends on the fuzz sequence and has
  not been reproduced cleanly from only natural UI actions.

## Impact

The current-base sibling is content divergence. In the pass-171 known-fixes
failure, the primary editor had the moved heading, while the collaborator never
received it after a 60 second convergence wait. The archived a81 shape is worse:
it rewrites block structure across block types and can leak adjacent
heading/search data into the wrong top-level slot.

If a user saves after divergence or structural corruption, content can be lost
or persisted in the wrong shape. I found no evidence of an OOM, performance
runaway, save loop, or global editor crash. Recovery is manual correction before
save, reload if the authoritative state is still correct elsewhere, or
revision/backups after save.

Practical real-user likelihood: `low` overall, `medium` for sites actively using
RTC with concurrent same-post editing. Multiple editors on one post and top-level
block moves are normal behavior, but the exact timing and block ordering are
rare. RTC itself is still not a default ordinary WordPress editing path.

## Evidence

- Manifest row: `likely-real-issues.jsonl` index 39, canonical signature
  `a81ea0fc772d`, medium confidence, status `no-realistic-repro`.
- May 7 known-fixes base: manifest commit
  `f256024286dd80a4c0e2579f658c109256abf648`; source still contains
  `serializableBlocksCache` and `previousLocalBlocksCache`.
- Pass 171 natural UI probe on that base failed 1/3 after a 60 second
  convergence wait. The failed state had the moved `Seed 952549 step 10 user 1
  heading` on the primary peer and no such heading on the secondary peer.
- Pass 172 low-level same-array cache probe failed on the May 7 known-fixes
  base and passed on the `64edf2f8cbab` fix branch.
- Pass 173 rebuilt the `64edf2f8cbab` fix branch, generated missing vendor
  bundles, verified the rebuilt `build/scripts/core-data/index.js` no longer
  contains `serializableBlocksCache`, and ran the pass-171 a81 natural UI probe:
  3/3 passed, then 10/10 passed.

## Origin

The unsafe assumption comes from the CRDT merge path introduced by
`84019935998c16f877e976ad85e84748355d7282`
(`Improve CRDT "merge logic" for post entities (#72262)`). That change keyed
serialized block data by the incoming block-array object's identity. The cache is
not valid when an editor snapshot object is reused after remote delivery and
then a local top-level move is merged. A later positional merge can then miss the
new block order or apply fields to the wrong logical block.

## Fix Direction

Use the `64edf2f8cbab` fix branch rather than creating a second independent
patch:

1. Serialize from the current `incomingBlocks` value instead of a WeakMap entry
   keyed by array identity.
2. Before positional merge, detect pure top-level reorders with matching unique
   `clientId` sets.
3. Reorder the Y.Array by `clientId` first so field updates apply to the same
   logical block, not whatever block currently occupies the same index.

Residual risk: the 10/10 pass-173 browser result validates the a81 sibling on
the existing fix branch, but that branch is based on current trunk rather than a
rebased copy of the synthetic May 7 known-fixes stack. The shortest remaining
confidence experiment is to apply the same cache-removal/clientId reorder fix to
the exact `f256024286dd80a4c0e2579f658c109256abf648` synthetic base and rerun
the pass-171 a81 probe for 20 repeats.
