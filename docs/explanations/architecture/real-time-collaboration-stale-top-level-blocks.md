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

I rechecked the tracking issue on 2026-05-01:
[#77716](https://github.com/WordPress/gutenberg/issues/77716) and the linked
items. The listed items still focus on rich-text offset/cursor handling
([#77532](https://github.com/WordPress/gutenberg/issues/77532),
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

Repeated browser checks on 2026-05-01 tightened the status: the unfixed
analysis branch reliably reproduces true top-level append loss, but the proposed
fix branch `danluu/try/stale-top-level-blocks-pr` is not yet browser-verified.
It passed two external Playwright runs and then lost the collaborator append on
the third run. Treat the current fix branch as model/unit-test-clean but blocked
on browser-level save-race stability.

Current-upstream recheck on 2026-05-01:

| Branch / ref | Why checked | Command | Result |
| --- | --- | --- | --- |
| `origin/trunk` `68484244df2` plus only the Playwright repro test | Current upstream baseline with no Issue 4 fix | `WP_BASE_URL=http://localhost:8924 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-stale-top-level-blocks-stale-save-loop.spec.ts --project=chromium` with the repro loop tightened to 24 repeats | Failed at repeat 2. Expected `Gamma remote stale save loop 2`; received `["A local stale save loop 2lpha local stale save loo","Beta"]`. Log/artifacts: `/Users/danluu/dev/fuzz/gutenberg-stale-top-level-blocks-trunk-baseline/test/e2e/artifacts/stale-top-level-current-trunk/baseline/run-2-24repeat.log` and `run-2-24repeat-artifacts/trace.zip`. |
| `danluu/try/stale-top-level-blocks-pr` `d4f43fbf695` | Rebased proposed Issue 4 branch, preserving three commits | Same 24-repeat Playwright command on `WP_BASE_URL=http://localhost:8934`; targeted JS lint, `git diff --check`, and `npm run build -- --skip-types` also passed before the run | Failed at repeat 5. Expected `Gamma remote stale save loop 5`; received `["Alpha local stale save loop 5","Beta"]`. Log/artifacts: `/Users/danluu/dev/fuzz/gutenberg-stale-top-level-blocks-pr/test/e2e/artifacts/stale-top-level-current-trunk/pr-branch/run-1-24repeat.log` and `run-1-24repeat-artifacts/trace.zip`. |
| `danluu/try/stale-content-overwrite-pr` `54ff99db222` | Plausible newer fix: touches `entities.js`, `crdt.ts`, `crdt-blocks.ts`, `sync/manager.ts`, and adds stale top-level/content overwrite tests | `npm run test:unit packages/core-data/src/utils/test/crdt-stale-top-level-blocks.test.ts -- --runInBand`; then the same 24-repeat Playwright repro cherry-picked onto the branch and run on `WP_BASE_URL=http://localhost:8944` | Unit test passed 5/5, including remote append/delete preservation and post-adapter content derivation. Browser repro passed 24/24 in 4.6m. Log: `/Users/danluu/dev/fuzz/gutenberg-stale-top-level-candidate-stale-content/test/e2e/artifacts/stale-top-level-current-trunk/stale-content-overwrite-pr/run-1-24repeat.log`. |

I inspected recent `danluu` branches by committer date and file diffs before
running candidates. Other plausible branches included
`danluu/try/stale-query-object-map-pr`,
`danluu/try/stale-rich-text-sibling-pr`,
`danluu/try/form-content-overwrite-pr`,
`danluu/try/draft-reopens-blank-pr`,
`danluu/try/nav-menu-stale-save-pr`,
`danluu/try/rtc-duplicate-table-body-revision-loss-pr`,
`danluu/try/rtc-table-stale-snapshot-pr`, and
`danluu/fix/rtc-autodraft-autosave-loss-pr`. Per the handoff instruction, I
stopped after `danluu/try/stale-content-overwrite-pr` demonstrated that a newer
submitted branch already fixes the issue at both the lower level and the
realistic browser level.

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

The repro test uses normal UI actions only. It does not mutate Y.Doc state,
dispatch editor-store actions directly, pause clocks or networking, install
scheduler hooks, inject provider faults, or use custom stale-block test tricks.
The test first verifies that the collaborator's editor contains the appended
paragraph, then both users type in the editor and click the `Save draft` button.
After the primary editor reloads, the assertion inspects the visible editor
block contents.

The failure predicate was tightened on 2026-05-01 so it only counts true
top-level append loss: the local edit must be present and no paragraph may start
with `Gamma`. This separates this issue from partial collaborator-text
truncation seen in some exploratory runs.

Strict unfixed-branch result on `try/stale-top-level-blocks`: 5/5 external runs
found true top-level append loss within the loop. The failing repeat indices
were `0, 0, 2, 2, 0`.

```text
run 1: Found verified top-level append loss 0: {"primary":["Alpha local stale save loop 0","Beta"]}
run 2: Found verified top-level append loss 0: {"primary":["Alpha local stale save loop 0","Beta"]}
run 3: Found verified top-level append loss 2: {"primary":["Alpha local stale save loop 2","Beta"]}
run 4: Found verified top-level append loss 2: {"primary":["Alpha local stale save loop 2","Beta"]}
run 5: Found verified top-level append loss 0: {"primary":["Alpha local stale save loop 0","Beta"]}
```

Local video, trace, screenshot, and log artifacts were copied under:

```text
test/e2e/artifacts/stale-top-level-evidence/baseline-top-level/run-1-artifacts/video.webm
test/e2e/artifacts/stale-top-level-evidence/baseline-top-level/run-2-artifacts/video.webm
test/e2e/artifacts/stale-top-level-evidence/baseline-top-level/run-3-artifacts/video.webm
test/e2e/artifacts/stale-top-level-evidence/baseline-top-level/run-4-artifacts/video.webm
test/e2e/artifacts/stale-top-level-evidence/baseline-top-level/run-5-artifacts/video.webm
test/e2e/artifacts/stale-top-level-evidence/baseline-top-level/run-*.log
```

Proposed fix branch check:

```bash
WP_BASE_URL=http://localhost:8914 npm run test:e2e -- \
	test/e2e/specs/editor/collaboration/collaboration-stale-top-level-blocks-stale-save-loop.spec.ts \
	--project=chromium
```

Actual result on `danluu/try/stale-top-level-blocks-pr` at
`0b375470eef`: 2/3 external runs passed, then run 3 failed at internal repeat 1.

```text
Expected value: "Gamma remote stale save loop 1"
Received array: ["Alpha local stale save loop 1 local stale save loop 1", "Beta"]
```

The failure artifact is preserved locally at:

```text
test/e2e/artifacts/stale-top-level-evidence/fix-pass/run-3.log
test/e2e/artifacts/stale-top-level-evidence/fix-pass/run-3-failure-artifacts/trace.zip
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

The repeated fix-branch run also shows this browser scenario can include a
broader save ordering race: one failed fix-branch run lost `Gamma` while the
primary editor appears not to have received the collaborator append before its
save. That makes the browser repro useful evidence of user-visible data loss,
but not yet a clean pass/fail proof for the proposed fix. The deterministic unit
and adapter tests remain the isolated proof for the stale local snapshot
overwrite mechanism.

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
7. Before proposing the fix, harden the save path so saving from one editor
   cannot persist an older CRDT document over a collaborator's already-saved
   top-level append. The current candidate branch passes the focused model tests
   but does not yet pass repeated browser save-race checks.

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
