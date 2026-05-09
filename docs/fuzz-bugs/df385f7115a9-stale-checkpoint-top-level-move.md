# df385f7115a9: stale checkpoint paragraph lost after top-level move

## Summary

The fuzz row `df385f7115a9` describes an RTC convergence failure in which a
collaborator performs a later top-level move after a save/checkpoint. One peer
keeps `rtc-save-paragraph-marker-953052-3-0-end`; the other drops that saved
checkpoint paragraph and retains or duplicates nearby
`Shared editing target paragraph.` content.

The exact HTTP artifact no longer has a runnable generated spec locally, but
the underlying CRDT failure is reproducible below the browser: a Yjs block list
that has received a remote checkpoint insert can later receive a stale full
block snapshot from the local editor. The current positional merge treats the
missing checkpoint as an intentional deletion and rewrites the top-level block
array.

## Practical Impact

Real-user likelihood is medium for RTC users and very low for non-RTC users.
The natural workflow is two editor sessions or users collaborating on one post,
with ordinary top-level Paragraph and Heading blocks, a saved checkpoint or
reload/rejoin boundary, and then a structural top-level move while one local
editor update was based on an older block snapshot.

The common pieces are normal block editing, saving, reloading/rejoining, and
moving blocks. The rare piece is the interleaving: the local editor sends a
full block tree from a base that predates a remote insert already present in
the CRDT document. The fuzzer made this deterministic through generated timing
and marker text; the editor operations themselves are normal.

Blast radius is real content corruption. The bad peer can lose a saved
paragraph or duplicate neighboring content; if that peer saves first, the
corrupted block tree can become persisted post content. Recovery is manual
repair, undo before save, copying from a still-correct peer, or post revisions.
There is no evidence for an OOM, save loop, or editor crash.

## Evidence

- `likely-real-issues.jsonl:224` records `df385f7115a9` as high confidence,
  HTTP transport, no runnable spec, with the saved checkpoint paragraph lost
  and `Shared editing target paragraph.` duplicated after the final move.
- The same seed family has runnable sibling `27a6a45298fe`, where a table move
  after stale top-level history can lose
  `rtc-save-paragraph-marker-953052-3-0-end`.
- A focused unit reconstruction against `origin/trunk` fails by dropping the
  checkpoint paragraph from the viewer CRDT block list.
- Pass 174 repeated that control on current `origin/trunk`
  `b38f9b4d86d`; with only the df385 repro cherry-picked, the test still
  failed and the received block contents omitted
  `rtc-save-paragraph-marker-953052-3-0-end`.
- The required May 7 known-fixes base `f256024286dd` includes stale snapshot
  reconciliation for cached previous local blocks, but a pass-173 control found
  that the explicit `baseRecord.blocks` path in that synthetic base still drops
  the checkpoint. Applying the follow-up base-record reconciliation patch makes
  that control pass.
- Pass 175 repeated that distinction in clean worktrees with the same focused
  df385 base-record reconstruction: exact `f256024286dd` dropped
  `rtc-save-paragraph-marker-953052-3-0-end`, while `c8af86c24a5` preserved it.
  This narrows the remaining gap to explicit base-record reconciliation, not
  the broader cached previous-local snapshot path.

## Root Cause

`mergeCrdtBlocks()` receives full Gutenberg block snapshots. The old merge is a
left/right positional diff over the incoming array and the current Y.Array. If
the incoming snapshot is stale and lacks a remote-only checkpoint block, the
diff has no identity-aware way to distinguish "local intentionally deleted the
checkpoint" from "local edited or moved other blocks from an older snapshot".

The fix is to keep the last local block snapshot per Y.Array, compare block
identity by stable `clientId`, and reconcile unchanged stale local blocks with
the current CRDT state before running the positional merge. Remote-only current
blocks are reinserted into the local snapshot at a neighboring stable position,
while blocks that were truly remotely deleted are not resurrected.

## Origin Notes

The structural risk comes from `84019935998c` (`Improve CRDT "merge logic" for
post entities (#72262)`), which introduced `packages/core-data/src/utils/crdt-blocks.ts`
and the left/right full-array merge for post block entities. That design can
apply ordinary local full-block snapshots to a Yjs array that already contains
remote-only blocks.

Later RTC fixes, including `54af1ce40068` (`RTC: Ensure that changes are only
applied to text and cursors for their associated RichText instances.`), improved
rich-text and cursor scoping but kept the structural top-level merge positional.
The df385 failure is not a cursor-offset bug: it is the stale full-tree snapshot
path erasing a remote top-level paragraph because the merge has not first
rebased the local snapshot by stable block identity.

## Fix Plan

1. Add a focused CRDT regression for the seed-953052 checkpoint loss shape.
2. Reconcile stale local full block snapshots against the previous local base
   and current Y.Array using unique block `clientId`s.
3. Preserve local edits and local moves, preserve remote inserts/edits for
   unchanged local blocks, and avoid restoring remotely deleted blocks.
4. Keep the fallback positional merge for block lists without usable stable
   client IDs.

Robustness audit: the fix must fail closed to the old merge when IDs are
missing or duplicated; it must not infer remote-only blocks from text equality;
it must not apply this logic to malformed block lists.

Distributed-systems audit: this is a stale snapshot reconciliation problem, not
just a UI order problem. The invariant is that a full local snapshot based on an
older local base must not erase remote operations already present in the CRDT.

Simplicity/performance audit: this is linear in the number of blocks plus small
maps keyed by `clientId`, scoped to block sync, and avoids parsing serialized
HTML or adding transport-specific logic.

## Verification

Control failure on current `origin/trunk` `b38f9b4d86d` with only the repro
test added:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-df385f7115a9-trunk-control-pass174
npm run test:unit -- packages/core-data/src/utils/test/crdt-df385f7115a9-stale-top-level.test.ts --runInBand
```

Result: failed; the final block order omitted
`rtc-save-paragraph-marker-953052-3-0-end`.

After the fix, rebased onto `b38f9b4d86d`:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-df385f7115a9
npm run test:unit -- packages/core-data/src/utils/test/crdt-df385f7115a9-stale-top-level.test.ts --runInBand
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runInBand
```

Result: both passed.

Focused known-fixes/base-record check from pass 175:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-df385f7115a9-f256-clean-pass175
npm run test:unit -- packages/core-data/src/utils/test/crdt-df385f7115a9-base-record.test.ts --runInBand

cd /Users/danluu/dev/fuzz/gutenberg-df385f7115a9-c8af-pass175
npm run test:unit -- packages/core-data/src/utils/test/crdt-df385f7115a9-base-record.test.ts --runInBand
```

Result: the exact `f256024286dd` run failed with the final block contents
missing `rtc-save-paragraph-marker-953052-3-0-end`. The `c8af86c24a5` run
passed the same test.

## Residual Risk

The exact original HTTP browser schedule is missing, and no natural Playwright
repro or video has been produced. The shortest confidence-improving follow-up
is to reconstruct the seed-953052 HTTP checkpoint/save/reload and final move
schedule, then run it against the PR branch with an oracle requiring exactly one
checkpoint paragraph and exactly one `Shared editing target paragraph.` on both
peers after convergence and after save/reload.
