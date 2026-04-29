# Stale Local Snapshots Overwrite Top-Level Block Array Operations

## Summary

Issue 4 from the RTC fuzz handoff is still present in the block merge layer. If a
peer's Y.Doc already contains a remote top-level block append or delete, then a
later local merge using an older full block-array snapshot treats that stale
snapshot as the desired final array. A local edit to one existing block can
therefore delete a remotely appended block or resurrect a remotely deleted block.

This is not a Yjs convergence failure. The local adapter writes the wrong
operation into the Y.Doc by deriving array deletes and inserts from a stale full
snapshot instead of from the local user's actual block-tree delta.

## Status against known fixes

Tested base: `origin/trunk` at
`5ddf4ad1b34bb0798185a663437955e7f10da01b` (`RTC: fix connection lost error on
large update cause by mismatch between update size bounds check and expanded
base64 update size (#77669)`). This base includes the merged known fixes
[#77669](https://github.com/WordPress/gutenberg/pull/77669) and
[#77681](https://github.com/WordPress/gutenberg/pull/77681).

I rechecked the tracking issue on 2026-04-29:
[#77716](https://github.com/WordPress/gutenberg/issues/77716) and the linked
items. The open or issue-only items there focus on rich-text offset/cursor
handling ([#77532](https://github.com/WordPress/gutenberg/issues/77532),
[#77658](https://github.com/WordPress/gutenberg/pull/77658),
[#77662](https://github.com/WordPress/gutenberg/pull/77662)), reload/save or
storage/presence problems ([#77666](https://github.com/WordPress/gutenberg/pull/77666),
[#77673](https://github.com/WordPress/gutenberg/pull/77673),
[#77675](https://github.com/WordPress/gutenberg/pull/77675),
[#77678](https://github.com/WordPress/gutenberg/issues/77678)), or undo scoping
([#77681](https://github.com/WordPress/gutenberg/pull/77681)). None of those
changes the top-level `mergeCrdtBlocks()` full-array delete/insert decision that
causes this issue.

The deterministic repros below fail on `origin/trunk`, and a natural browser
save race now reproduces a verified collaborator append being lost. I also
inspected the local known-fixes worktree `try/fuzz-known-fixes-runtime`; its
stack does not add a local-base top-level block-array merge. The original
handoff fuzz commands depend on a modified fuzz harness that is not on clean
`origin/trunk`, so I used focused repros for this issue instead of claiming the
handoff seed commands run cleanly on trunk.

## Reproductions

Focused unit/model and package-adapter repro:

```bash
npm run test:unit -- packages/core-data/src/utils/test/crdt-stale-top-level-blocks.ts --runInBand
```

Actual result on the tested base: fails 4/4. The direct `mergeCrdtBlocks()`
append case receives `["Alpha local edit", "Beta"]` instead of preserving
`"Gamma"`. The direct delete case receives resurrected `"Gamma"`. The
`applyPostChangesToCRDTDoc()` cases fail the same way, proving the post entity
adapter exposes the merge bug.

Original fuzz seeds from the handoff, for environments that have the modified
fuzz harness:

```bash
GUTENBERG_FUZZ_SEED_COUNT=1 GUTENBERG_FUZZ_SEED_START=30 \
	npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts \
	--runInBand --testNamePattern="stale-local-snapshots"

GUTENBERG_FUZZ_SEED_COUNT=1 GUTENBERG_FUZZ_SEED_START=4 \
	npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts \
	--runInBand --testNamePattern="stale-local-snapshots"
```

Natural Playwright attempt:

```bash
npm run wp-env-test -- start --auto-port
WP_BASE_URL=http://localhost:8890 npm run test:e2e -- \
	test/e2e/specs/editor/collaboration/collaboration-stale-top-level-blocks.spec.ts \
	--project=chromium
```

Actual result on the tested base: passes 2/2. The committed Playwright spec uses
normal browser actions only: one user appends or deletes a paragraph while the
other user edits an existing paragraph through clicks and keyboard input. It
does not use Y.Doc mutation, fault injection, fake clocks, direct editor-store
mutation, or network manipulation. I also tried a serialized remote-then-local
variant; after fixing a focus ambiguity in the test helper, that variant also
preserved the remote append/delete. These attempts exercise realistic browser
flows but did not create the stale full-snapshot ordering deterministically.

Natural Playwright video repro:

```bash
WP_BASE_URL=http://localhost:8890 npm run test:e2e -- \
	test/e2e/specs/editor/collaboration/collaboration-stale-top-level-blocks-stale-save-loop.spec.ts \
	--project=chromium
```

Actual result on the tested base: the latest post-format rerun preserved the
append on repeat 0 and failed on repeat 1 with the intended bug signal:

```text
stale-save-loop-1 { primary: [ 'Alpha local stale save loop 1', 'Beta' ] }
Error: Found verified stale save repro 1: {"primary":["Alpha local stale save loop 1","Beta"]}
```

The test first verifies that the collaborator's editor contains the appended
paragraph, then uses normal UI actions only: both users type in the editor and
click the `Save draft` button. After the primary editor reloads, the local edit
is persisted but the verified collaborator append is missing. Some runs emit
normal sync-update retry logs during the overlap, and the same target state has
also reproduced in a run without visible sync-error logs. The latest video
artifact from this run is:

```text
test/e2e/artifacts/test-results/editor-collaboration-colla-ae96a-plus-overlapping-stale-save-chromium/video.webm
```

Additional natural attempts that did not hit the bug were kept out of the branch
after recording the results: polling races while typing/replacing text, clean
and overlapping save races without the verified append guard, drop-cap toggles,
undo, toolbar move, drag/drop, large-post typing, per-block HTML mode, large
paste, middle insertions, and grouping selected blocks. Those flows either
preserved the collaborator append/delete or exposed unrelated focus/save
ordering behavior.

Build/environment checks:

```bash
npm install
npm run build -- --skip-types
npm run wp-env status
npm run wp-env-test status
```

`npm install` and `npm run build -- --skip-types` succeeded. The default test
port `8889` was already allocated, so the test environment was started with
`--auto-port` and resolved to `http://localhost:8890`.

## Failure mechanism

`applyPostChangesToCRDTDoc()` passes the incoming `blocks` value directly to
`mergeCrdtBlocks()`. `mergeCrdtBlocks()` serializes that incoming array and then
uses a left/right sweep against the current `Y.Array`.

For a remote append:

1. The current Y.Array contains `Alpha`, `Beta`, `Gamma`.
2. The stale local snapshot contains only `Alpha local edit`, `Beta`.
3. The left/right sweep sees a shorter incoming array.
4. `numOfDeletionsNeeded` becomes `1`.
5. `yblocks.delete( left, 1 )` removes the remotely appended `Gamma`.

For a remote delete:

1. The current Y.Array contains `Alpha`, `Beta`.
2. The stale local snapshot still contains `Alpha local edit`, `Beta`, `Gamma`.
3. The left/right sweep sees a longer incoming array.
4. `numOfInsertionsNeeded` becomes `1`.
5. `yblocks.insert( left, ... )` recreates the remotely deleted `Gamma`.

The local user's only real operation was an attribute edit on `Alpha`. The merge
code inferred unrelated top-level structural operations from the absence or
presence of blocks in an older snapshot.

The natural browser repro reaches the same user-visible class through normal
saves. In the observed run, user B appends `Gamma` and starts a draft save after
the append is visible in B's editor. User A then edits `Alpha` from an older
view and saves. After reload, A's `Alpha` edit is present and B's verified
append is absent. The deterministic adapter tests prove that the current
write-path can turn an older full block array into a delete of a remote top-level
append; the Playwright repro demonstrates that a realistic editor/save history
can surface the data loss without fault injection.

## How this was introduced

The direct introducing change for this top-level behavior appears to be
[`84019935998`](https://github.com/WordPress/gutenberg/commit/84019935998)
from [#72262](https://github.com/WordPress/gutenberg/pull/72262), "Improve CRDT
'merge logic' for post entities." That commit added `crdt-blocks.ts`,
`applyPostChangesToCRDTDoc()`, and the current `mergeCrdtBlocks()` left/right
full-array merge approach.

Later related PRs changed adjacent behavior but do not appear to introduce the
top-level stale-snapshot overwrite. [#76913](https://github.com/WordPress/gutenberg/pull/76913)
changed table cell and nested merge behavior. [#77164](https://github.com/WordPress/gutenberg/pull/77164)
improved nested array attribute stability. Those fixes are important for other
stale-snapshot classes, but the root top-level bug remains the decision to treat
an incoming stale full block array as authoritative final state.

## Initial fix plan

Track a previous local block snapshot for each synced post entity and use it as
the base for local merges. When the editor reports a new block array, compute the
local delta from previous-local to next-local, then apply only those local
operations to the current Y.Doc.

For top-level blocks, that means:

-   local attribute/content edits update only the matching existing block;
-   local block appends insert the new local block;
-   local block deletes delete only blocks that existed in the previous local
    snapshot and were removed by the local user;
-   remote-only blocks that are absent from a stale local snapshot are preserved;
-   remotely deleted blocks that are still present in a stale local snapshot are
    not reinserted unless the local delta actually inserted them.

If no reliable local base is available, prefer a conservative resync path over a
destructive full-array merge.

## Fix plan audit

### Linus Torvalds lens

The bug is an invariant violation: an old snapshot is not an operation log. The
code should not infer deletes from missing array entries unless it knows the
local user deleted those entries. A fix should make the state transition explicit
and small, not add more special cases to the left/right sweep.

### Kyle Kingsbury / Jepsen lens

The important history property is operation preservation. Once a peer has
observed a remote append/delete in its Y.Doc, a causally older local snapshot
must not erase that operation. Convergence is not enough if all replicas converge
on a state that lost an acknowledged operation. Tests should encode histories:
remote op applied, stale local op applied, final state preserves both
non-conflicting operations.

### Dan Luu lens

Production risk comes from ordinary stale snapshots: React renders, block-editor
subscriptions, deferred sync manager updates, and polling can all separate when a
snapshot was captured from when it is applied. The fix needs focused model tests,
adapter tests, and a browser-level guard. It also needs logging or debuggability
around "base -> local -> current Y.Doc" decisions, because stale interleavings
are otherwise hard to diagnose from final document state.

## Revised fix plan

Add local-base block-tree merge semantics to the RTC post adapter instead of
teaching `mergeCrdtBlocks()` to guess whether differences are local or remote.

1. Store the last local block tree that was successfully submitted for each
   synced entity/scope.
2. On a new local editor change, compute a local block-tree delta against that
   base using stable block identity (`clientId`/external ID mapping where
   available).
3. Apply the delta to the current Y.Doc. Attribute edits should recurse into
   attributes/innerBlocks using local-base diffing; top-level structure should
   insert or delete only blocks changed by the local delta.
4. Advance the local base only after applying the local delta. When remote
   changes are pulled into the editor, update the base to the resulting editor
   state so future local deltas are measured from the visible document.
5. If identity or base information is missing, do not run a destructive
   full-array reconciliation. Preserve current Y.Doc contents and force an
   editor resync or full reload path.
6. Keep the focused failing tests in `crdt-stale-top-level-blocks.ts`, then add
   a browser regression that fails on a naturally reachable stale ordering before
   marking the issue fixed.

## Open questions

-   Where should the local-base snapshot live: in `@wordpress/sync` so all entity
    adapters can use it, or in the post-specific `core-data` sync config where
    block semantics are known?
-   How should local-base diffing handle duplicated or regenerated `clientId`
    values after copy/paste, pattern insertion, and controlled inner-block remaps?
-   The natural stale-save repro should be narrowed after the fix lands: the
    failing browser history is realistic, but the exact handoff between save
    persistence and CRDT local-base state still needs instrumentation if we want
    line-level proof that the Playwright failure takes the same internal branch
    as the deterministic adapter repro.
