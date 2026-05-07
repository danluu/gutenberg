# RTC top-level move reconciliation duplicates adjacent paragraph

Bug signature: `5ee0be2f9b7d`

Bug type: `rtc_top_level_move_reconciliation_duplicates_adjacent_paragraph_and_drops_moved_paragraph_after_structural_edits`

Transport: HTTP

## Classification

This is a product bug in CRDT block reconciliation, not a malformed generated spec, readiness wait, locator failure, inverted assertion, or environment failure.

The generated source spec creates a valid draft post, then uses ordinary editor actions:

1. Delete a top-level heading through block Options > Delete.
2. In the collaborator editor, use Options > Add before and type a paragraph before the first remaining paragraph.
3. In the primary editor, select that original first paragraph and use the toolbar Move down button.

The known-fixes refresh run completed those actions and then failed after a 20s convergence wait. The primary editor had the expected final order:

```text
inserted paragraph
displaced sibling paragraph
moved paragraph
```

The collaborator editor had:

```text
inserted paragraph
moved paragraph
moved paragraph
```

That drops the displaced sibling and duplicates the moved paragraph. The source row was:

```json
{"key":"rtc_top_level_move_reconciliation_duplicates_adjacent_paragraph_and_drops_moved_paragraph_after_structural_edits::5ee0be2f9b7d::test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts","bugType":"rtc_top_level_move_reconciliation_duplicates_adjacent_paragraph_and_drops_moved_paragraph_after_structural_edits","signature":"5ee0be2f9b7d","specPath":"test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts","transport":"http","result":"failed","exitCode":1,"timedOut":false,"durationMs":48363,"startedAt":"2026-05-05T10:20:12.857Z","completedAt":"2026-05-05T10:21:01.220Z"}
```

Pass 38 reran the generated spec against the known-fixes base on port `9903`; it failed the same way, with primary `inserted, displaced, moved` and collaborator `inserted, moved, moved`.

## Root Cause

The vulnerable code is `mergeCrdtBlocks()` in `packages/core-data/src/utils/crdt-blocks.ts`.

The merge algorithm uses a left/right sweep over the top-level block array. `areBlocksEqual()` intentionally ignores `clientId`, because client IDs are local editor implementation details and should not be the semantic payload of the shared document. That is reasonable for content equality, but it is unsafe for adjacent pure moves.

For this move:

```text
[inserted, moved, displaced] -> [inserted, displaced, moved]
```

the left/right sweep identifies the two middle positions as positional updates. The old update loop mutates the Y.Map at index 1 until the moved block record contains the displaced paragraph, and mutates the Y.Map at index 2 the other way. A logical move is therefore encoded as two block-record rewrites instead of a structural `Y.Array` change.

The low-level repro proves this below Playwright by capturing the original adjacent Y.Map records and observing that, before the fix, the moved record is morphed into the displaced sibling. Pass 38 adds a narrower invariant: a pure adjacent move must emit only a top-level `Y.Array` structural event, not nested `YMap` or `YText` edits. On the pre-fix commit this fails with nested targets `YMap`, `YText`, `YMap`, `YText`.

## Origin

The block reconciliation algorithm was introduced by `84019935998c16f877e976ad85e84748355d7282`, PR [#72262](https://github.com/WordPress/gutenberg/pull/72262), merged on `2025-10-14T17:38:19Z`. That PR introduced recursive CRDT block merge logic but did not add an invariant for pure moves where the same `clientId` set appears in a different order.

`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104`, PR [#75923](https://github.com/WordPress/gutenberg/pull/75923), merged on `2026-02-25T22:17:47Z`, expanded `mergeCrdtBlocks()` tests. It covered final reordered content, but not Yjs record identity or transaction shape, so positional record rewriting remained untested.

PR [#68483](https://github.com/WordPress/gutenberg/pull/68483) is relevant Yjs sync design background, but it is still open and is not the trunk-introducing change for this defect.

## Fix

The fix adds strict pure-reorder detection for the changed middle slice:

- no insertions or deletions;
- every affected existing block has a unique string `clientId`;
- every affected incoming block has the same unique `clientId` set;
- the order actually changed;
- each incoming block still equals the existing block with the same `clientId`.

When those checks pass, `mergeCrdtBlocks()` replaces the changed slice in incoming order and skips the positional update loop. Pass 38 tightens the fix by wrapping the delete and insert in a single Yjs transaction, so observers and remote sync receive one atomic structural replacement instead of a transient delete followed by a later insert.

Ambiguous IDs, missing IDs, duplicate IDs, insertion/deletion cases, and mixed move-plus-content-edit cases keep the old path.

## Plan Audit

Kernel-maintainer robustness: the patch is local to block reconciliation, rejects ambiguous identity data, and adds tests for both record-morphing and transaction-shape invariants.

Jepsen-style correctness: the defect was a convergence failure caused by representing one logical move as two replicated record rewrites. The fix encodes strict pure moves structurally and atomically.

Dan-Luu-style simplicity/performance: the new path is O(n) over the already-detected changed slice. It avoids LCS and broad CRDT redesign, and it leaves common text edits on the existing merge path.

## Verification

Pass 40 refreshed both branches onto current `origin/trunk`:

```text
origin/trunk = e7f55c1b4d23b3eaebde1288b258b0d1c3bce938
PR branch = fe7e2d0d451
```

The rebased PR branch keeps the requested commit order:

```text
06200824651 Add CRDT repro for RTC adjacent move identity rewrite
488fac2f62b Add RTC top-level move Playwright repro
fe7e2d0d451 Avoid rewriting CRDT block records for pure moves
```

Pass 40 also reran the low-level invariant at the rebased test-only
commit `0620082465189998b27318646d8445efdf29e965`, before the fix.
It still fails below Playwright with nested CRDT record edits:

```text
Expected: []
Received: ["YMap", "YText", "YMap", "YText"]
```

That is a narrower root-cause proof tied to the current trunk base: the
bug is the positional rewrite shape itself, not a stale branch artifact.

Pass 41 adds an independent non-Playwright repro through the post sync
entrypoint, `applyPostChangesToCRDTDoc()`, not just the lower-level
`mergeCrdtBlocks()` helper. On the test-only commit
`ad09ed9510ba340ec57b170ce6940e687b32ecc4`, the post-sync repro fails
with the same nested CRDT record edits:

```text
Expected: []
Received: ["YMap", "YText", "YMap", "YText"]
```

The fixed branch passes the same post-sync invariant, so the proof now
covers both the direct block merge helper and the real post CRDT entrypoint
used by collaborative post editing.

Known-fixes base, fresh pass-38 rerun:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
WP_ENV_DOCKER_SUBNET=10.253.39.0/24 WP_ENV_PORT=9903 WP_ENV_PHPMYADMIN_PORT=9023 WP_BASE_URL=http://localhost:9903 npm run wp-env start
WP_ENV_PORT=9903 WP_ENV_PHPMYADMIN_PORT=9023 WP_BASE_URL=http://localhost:9903 RTC_EC47_ATTEMPTS=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `43.7s` with the same non-converged state: primary `inserted, displaced, moved`; collaborator `inserted, moved, moved`.

Pre-fix low-level proof on the PR branch before the fix commit:

```bash
cd /tmp/gutenberg-5ee0-pass38-prefix.cXXSuz
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="represents adjacent pure moves as structural array changes" --runInBand
```

Result: failed because the merge emitted nested `YMap` and `YText` events.

Fixed branch:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-5ee0be2f9b7d
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
WP_ENV_PORT=9902 WP_ENV_PHPMYADMIN_PORT=9022 WP_BASE_URL=http://localhost:9902 RTC_MANIFEST_WS_START_PORT=20416 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
git diff --check HEAD~3..HEAD
```

Results: adjacent unit tests passed, full `crdt-blocks` unit file passed `73/73`, the natural-user Playwright repro passed in `15.1s`, and `git diff --check` produced no output.

Pass 40 reran the same fixed-branch checks after rebasing onto current
trunk. The focused adjacent unit tests passed (`2 passed, 71 skipped`),
the full `crdt-blocks` test file passed (`73 passed`), the natural-user
Playwright repro passed in `16.1s`, and `git diff --check` produced no
output.

Pass 41 rewrote the PR branch to keep the requested three-commit order
while adding the post-sync repro to commit 1:

```text
ad09ed9510b Add CRDT repros for RTC adjacent move identity rewrite
a83af3ee9bd Add RTC top-level move Playwright repro
2e2860ca2b Avoid rewriting CRDT block records for pure moves
```

Pass 41 verification:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
WP_ENV_PORT=9901 WP_ENV_PHPMYADMIN_PORT=9021 WP_BASE_URL=http://localhost:9902 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results after rebasing onto `origin/trunk` at
`02bfdaa5ca96deb050cd0c40bad1c1da75858caf`: the post-sync unit repro
passed, the focused adjacent block tests passed (`2 passed, 71 skipped`),
the full `crdt-blocks` test file passed (`73 passed`), and the
natural-user Playwright repro passed in `13.9s`.

Known-fixes base was reconfirmed in pass 41:

```bash
WP_ENV_PORT=9901 WP_ENV_PHPMYADMIN_PORT=9021 WP_BASE_URL=http://localhost:9903 RTC_EC47_ATTEMPTS=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `44.2s` with primary
`inserted, displaced sibling, moved paragraph` and collaborator
`inserted, moved paragraph, moved paragraph`.

Pass 42 reran the pre-fix test-only proof, the fixed branch, and the
known-fixes negative control. It also folded a Playwright lint-warning
cleanup into the repro commit because the assertions run through
`expectEditorsToConverge()`. The PR branch now has this commit order:

```text
ad09ed9510b Add CRDT repros for RTC adjacent move identity rewrite
f0691451018 Add RTC top-level move Playwright repro
7b8e3e65329 Avoid rewriting CRDT block records for pure moves
```

Pass 42 verification:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
WP_ENV_PORT=9901 WP_ENV_PHPMYADMIN_PORT=9021 WP_BASE_URL=http://localhost:9902 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the post-sync repro passed, the full `crdt-blocks` test file
passed (`73 passed`), targeted JS lint passed with no warnings, and the
natural-user Playwright repro passed in `13.4s`.

Known-fixes base was reconfirmed again in pass 42:

```bash
WP_ENV_PORT=9901 WP_ENV_PHPMYADMIN_PORT=9021 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed with primary `inserted, displaced sibling, moved paragraph`
and collaborator `inserted, moved paragraph, moved paragraph`.

Pass 43 independently rechecked the source artifacts, the test-only failure,
the fixed branch, the known-fixes negative control, the PR metadata, and the
video artifact. The added value in this pass is a narrower root-cause
confirmation: before the product fix, the direct `mergeCrdtBlocks()` test shows
that the original `moved-block` Y.Map is rewritten to the displaced paragraph,
and both the direct block helper and the real `applyPostChangesToCRDTDoc()`
entrypoint emit nested CRDT events for a pure move:

```text
Expected: []
Received: ["YMap", "YText", "YMap", "YText"]
```

That failure shape is impossible to explain as a Playwright readiness, locator,
or assertion inversion problem; it is below the browser and directly observes
the CRDT mutation shape.

Pass 43 verification on the fixed PR branch at
`7b8e3e65329c3f67dbe84b28697702deaffc714a`, based on `origin/trunk` at
`02bfdaa5ca96deb050cd0c40bad1c1da75858caf`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
WP_ENV_PORT=9901 WP_ENV_PHPMYADMIN_PORT=9021 WP_BASE_URL=http://localhost:9902 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
```

Results: the post-sync repro passed, the focused adjacent event-shape tests
passed (`2 passed, 71 skipped`), the full `crdt-blocks` file passed
(`73 passed`), the natural-user Playwright repro passed in `14.1s`, targeted
JS lint passed, and `git diff --check` produced no output.

Pass 43 pre-fix/test-only proof on
`/private/tmp/gutenberg-5ee0-pass41-testonly.ad09`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
```

Results: both failed before the fix. The post-sync repro failed with nested
`YMap`, `YText`, `YMap`, `YText` targets. The direct helper repro also showed
that the captured `movedYBlock` now contains the displaced sibling content,
which proves positional record morphing.

Known-fixes base was reconfirmed in pass 43:

```bash
WP_ENV_PORT=9901 WP_ENV_PHPMYADMIN_PORT=9021 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `42.8s` with the same product divergence as the source row:
primary `inserted, displaced sibling, moved paragraph`; collaborator
`inserted, moved paragraph, moved paragraph`. Playwright emitted trace-artifact
`ENOENT` messages during teardown, but only after the convergence assertion had
already captured the divergent editor states.

`npm run build -- --skip-types` still fails in the unrelated theme primitive-token generator with `TypeError: [object Object] is not a valid color space`. Direct `wp-build` also hits missing package-local optional dependencies in this linked worktree, although it successfully bundled `core-data`; the Playwright verification used the complete known-fixes build with the newly built fixed `build/scripts/core-data` overlaid.

Pass 44 independently verified that the existing branch, fix, and video still
satisfy the requested standard rather than relying on the previous pass. The
source log and error-context snapshot still show a loaded editor and a semantic
state split, not a readiness, locator, generated-spec, environment, or inverted
assertion failure. The generated source run failed only after convergence:

```text
primary:      inserted, displaced sibling, moved paragraph
collaborator: inserted, moved paragraph, moved paragraph
```

Pass 44 reran the pre-fix/test-only proof on
`/private/tmp/gutenberg-5ee0-pass41-testonly.ad09`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
```

Results: both failed before the fix. The post-sync entrypoint emitted nested
targets `YMap`, `YText`, `YMap`, `YText`; the direct helper test also proved the
captured moved Y.Map was rewritten to the displaced sibling content. That is the
pass-44 low-level root-cause proof: the failing operation shape exists below
Playwright.

Pass 44 reran fixed-branch verification at
`7b8e3e65329c3f67dbe84b28697702deaffc714a`, based on `origin/trunk` at
`02bfdaa5ca96deb050cd0c40bad1c1da75858caf`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9901 WP_ENV_PHPMYADMIN_PORT=9021 WP_BASE_URL=http://localhost:9902 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the post-sync repro passed; the focused adjacent event-shape tests
passed (`2 passed, 71 skipped`); the full `crdt-blocks` file passed
(`73 passed`); targeted JS lint passed; `git diff --check` produced no output;
and the natural-user Playwright repro passed in `15.2s`.

Pass 44 also reconfirmed the known-fixes negative control. The known-fixes base
was `3cba2b1e56a98787de08dc6c7df2434759e8f908`, and
`git merge-base --is-ancestor 7b8e3e65329c3f67dbe84b28697702deaffc714a HEAD`
returned exit code 1, so it does not include the fix. Its `wp-env` mapped
WordPress to `http://localhost:9903`.

```bash
WP_ENV_PORT=9901 WP_ENV_PHPMYADMIN_PORT=9021 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `43.7s` with the same product divergence as the source row:
primary `inserted, displaced sibling, moved paragraph`; collaborator
`inserted, moved paragraph, moved paragraph`.

Pass 44 refreshed the origin proof with `git blame`, `git show`, and GitHub
connector metadata. PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262) introduced
post-specific CRDT block merge logic and explicitly described recursively
inspecting `blocks` and representing data with Y.js shared types. It merged as
`84019935998c16f877e976ad85e84748355d7282` on `2025-10-14T17:38:19Z`.
PR [#75923](https://github.com/WordPress/gutenberg/pull/75923) added
`mergeCrdtBlocks()` edge-case tests and merged as
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104` on `2026-02-25T22:17:47Z`, but
those tests did not assert Yjs record identity or mutation shape.

Pass 45 independently rechecked the source artifacts, current branches, the
test-only failure, the fixed branch, and the video. The added value in this
pass is a stronger known-fixes negative control below Playwright: a throwaway
worktree at known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908` had
only the repro-test commit `ad09ed9510ba340ec57b170ce6940e687b32ecc4`
cherry-picked onto it. Both repro tests still failed before the fix:

```bash
cd /private/tmp/gutenberg-5ee0-pass45-knownfix-testonly
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
```

Results: the post-sync entrypoint emitted nested targets `YMap`, `YText`,
`YMap`, `YText`; the direct helper also showed the captured moved Y.Map had
been rewritten into the adjacent displaced paragraph. This proves the
known-fixes base still has the product defect even without browser readiness
or locator behavior in the loop. A fresh known-fixes browser rerun was also
attempted, but it failed in mutual-discovery readiness, so pass 45 does not use
that run as semantic product evidence.

Pass 45 fixed-branch verification at
`7b8e3e65329c3f67dbe84b28697702deaffc714a`, based on `origin/trunk` at
`02bfdaa5ca96deb050cd0c40bad1c1da75858caf`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9901 WP_ENV_PHPMYADMIN_PORT=9021 WP_BASE_URL=http://localhost:9902 RTC_MANIFEST_WS_START_PORT=20418 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the post-sync repro passed; the focused adjacent event-shape tests
passed (`2 passed, 71 skipped`); the full `crdt-blocks` file passed
(`73 passed`); targeted JS lint passed; `git diff --check` produced no output;
and the natural-user Playwright repro passed in `14.4s`.

Pass 46 independently reran the known-fixes negative controls and the fixed
branch. This pass adds a fresh browser-level known-fixes repro in addition to
the lower-level known-fixes proof from pass 45:

```bash
cd /private/tmp/gutenberg-5ee0-pass45-knownfix-testonly
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand

cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
WP_ENV_PORT=9903 WP_ENV_PHPMYADMIN_PORT=9023 WP_BASE_URL=http://localhost:9903 RTC_EC47_ATTEMPTS=1 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: both known-fixes unit repros failed below Playwright with nested
`YMap`, `YText`, `YMap`, `YText` targets. The fresh known-fixes Playwright run
failed in `44.3s` after normal editor actions with the same semantic split as
the source row: primary `inserted, displaced sibling, moved paragraph`;
collaborator `inserted, moved paragraph, moved paragraph`.

Pass 46 fixed-branch verification at
`7b8e3e65329c3f67dbe84b28697702deaffc714a`:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-5ee0be2f9b7d
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
WP_ENV_PORT=9902 WP_ENV_PHPMYADMIN_PORT=9022 WP_BASE_URL=http://localhost:9902 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the post-sync repro passed, the focused adjacent event-shape tests
passed (`2 passed, 71 skipped`), the full `crdt-blocks` file passed
(`73 passed`), and the natural-user Playwright repro passed in `15.0s`.
Pass 46 also re-verified the annotated video as `1920x540`, `480` frames,
`16.0s`, H.264 video, and copied it into the pass-46 artifact directory.

Pass 47 independently verified that the existing explanation branch, PR branch,
fix, and video still satisfy the requested standard. The source trace was
re-read and still shows only ordinary editor actions: selecting the heading,
using block Options > Delete, selecting the paragraph in the collaborator
editor, using Options > Add before, typing the new paragraph, and using the
Move down toolbar button. The source screenshots and error context still show a
loaded editor and a semantic state split after convergence waits, not a
readiness, locator, generated-spec, environment, or inverted-assertion failure.

Pass 47 reran the known-fixes low-level negative control in
`/private/tmp/gutenberg-5ee0-pass45-knownfix-testonly`, which is the
known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908` with only the
test-only repro commit staged:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
```

Results: both tests still failed before the fix. The post-sync entrypoint
emitted nested targets `YMap`, `YText`, `YMap`, `YText`; the direct helper test
also proved that the captured moved Y.Map had been morphed into the adjacent
displaced paragraph. This is the pass-47 additional verification: the existing
fix branch is not merely papering over Playwright behavior; the unfixed
mutation shape remains reproducible below the browser.

Pass 47 reran the known-fixes browser negative control on port `9903` with
`RTC_MANIFEST_WS_START_PORT=20428`:

```bash
WP_ENV_PORT=9903 WP_ENV_PHPMYADMIN_PORT=9023 WP_BASE_URL=http://localhost:9903 RTC_EC47_ATTEMPTS=1 RTC_MANIFEST_WS_START_PORT=20428 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `43.4s` with the same product divergence as the source row:
primary `inserted, displaced sibling, moved paragraph`; collaborator
`inserted, moved paragraph, moved paragraph`.

Pass 47 fixed-branch verification at
`7b8e3e65329c3f67dbe84b28697702deaffc714a`, based on `origin/trunk` at
`02bfdaa5ca96deb050cd0c40bad1c1da75858caf`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9902 WP_ENV_PHPMYADMIN_PORT=9022 WP_BASE_URL=http://localhost:9902 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the post-sync repro passed; the focused adjacent event-shape tests
passed (`2 passed, 71 skipped`); the full `crdt-blocks` file passed
(`73 passed`); targeted JS lint passed; `git diff --check` produced no output;
and the natural-user Playwright repro passed in `15.2s`.

Pass 47 also copied and re-verified the annotated video at:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-47/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x540`, `480` frames, `16.0s`, and size
`256338` bytes. An extracted frame at 8s shows both editor screens and the
visible action-log overlay.

Pass 48 independently re-read the pass-47 summary, source result row, source
log, error context, archived screenshots, trace actions, current fix branch,
and origin blame. `origin/trunk` was refreshed and remained
`02bfdaa5ca96deb050cd0c40bad1c1da75858caf`; the PR branch still has merge
base `02bfdaa5ca96deb050cd0c40bad1c1da75858caf` and keeps the requested
three-commit order:

```text
ad09ed9510b Add CRDT repros for RTC adjacent move identity rewrite
f0691451018 Add RTC top-level move Playwright repro
7b8e3e65329 Avoid rewriting CRDT block records for pure moves
```

The pass-48 added value is a fresh, two-level negative control against the
known-fixes base, plus a fresh fixed-branch verification. First, the
known-fixes low-level repro worktree at
`/private/tmp/gutenberg-5ee0-pass45-knownfix-testonly` still fails below
Playwright:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
```

Results: the post-sync entrypoint still emitted nested targets `YMap`, `YText`,
`YMap`, `YText`; the direct helper also still showed that the captured moved
Y.Map had been rewritten into the adjacent displaced paragraph. This disproves
a Playwright-only explanation for the failure.

Second, pass 48 reran the generated natural-user spec against the known-fixes
base on port `9903`. The first attempt failed before the move sequence because
the collaborator page hit an early permission/readiness issue, so that run was
discarded as product evidence. The retry used the archived-run isolation knobs:

```bash
GUTENBERG_RTC_BROWSER_SKIP_GLOBAL_POST_CLEANUP=1 GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9903 WP_ENV_PHPMYADMIN_PORT=9023 WP_BASE_URL=http://localhost:9903 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-48/artifacts-knownfix RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-48/knownfix-ec47-output RTC_MANIFEST_WS_START_PORT=20428 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `42.8s` after the normal editor actions with the same
semantic split as the source row. The primary editor had `inserted, displaced
sibling, moved paragraph`; the collaborator editor had `inserted, moved
paragraph, moved paragraph`. The pass-48 `attempt-1.json` records post
`149`, the divergent normalized states, and the final non-convergence error.

Pass 48 fixed-branch verification at
`7b8e3e65329c3f67dbe84b28697702deaffc714a`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9902 WP_ENV_PHPMYADMIN_PORT=9022 WP_BASE_URL=http://localhost:9902 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the post-sync repro passed; the focused adjacent event-shape tests
passed (`2 passed, 71 skipped`); the full `crdt-blocks` file passed
(`73 passed`); targeted JS lint passed; `git diff --check` produced no output;
and the natural-user Playwright repro passed in `14.1s`.

Pass 48 copied the already-created annotated headless side-by-side video into:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-48/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x540`, `480` frames, `16.0s`, and size
`256338` bytes. The pass-48 extracted frame at 8s shows both editor screens
and the visible action-log overlay.

Pass 49 adds a lower-level remote-peer proof. The first repro commit now
contains a second `applyPostChangesToCRDTDoc()` test with two synced `Y.Doc`
instances. It records the remote peer's observed update shape when the primary
doc applies the pure adjacent move:

```text
[inserted, moved, displaced] -> [inserted, displaced, moved]
```

On the known-fixes base at `3cba2b1e56a98787de08dc6c7df2434759e8f908`, with
only the updated test repros cherry-picked, the remote-peer test fails before
the product fix:

```bash
git worktree add --detach /private/tmp/gutenberg-5ee0-pass49-knownfix-negative 3cba2b1e56a98787de08dc6c7df2434759e8f908
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
git cherry-pick --no-commit f25e34a9bc9
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
```

Result: both post-entrypoint repros failed. The local observer still saw nested
targets `YMap`, `YText`, `YMap`, `YText`, and the remote-peer observer saw
`YMap`, `YMap`, `YText`, `YText` instead of a single structural array update.
That proves the bad operation shape crosses the Yjs transport boundary; it is
not just a local helper-test artifact and not a Playwright locator failure.

Pass 49 also reran the original generated browser spec against the known-fixes
base on port `9903` with archived-run isolation:

```bash
GUTENBERG_RTC_BROWSER_SKIP_GLOBAL_POST_CLEANUP=1 GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9903 WP_ENV_PHPMYADMIN_PORT=9023 WP_BASE_URL=http://localhost:9903 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-49/artifacts-knownfix RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-49/knownfix-ec47-output RTC_MANIFEST_WS_START_PORT=20448 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `43.5s` after the normal editor actions and a 20s
convergence wait. The pass-49 `attempt-1.json` records post `161`, primary
`inserted, displaced sibling, moved paragraph`, and collaborator `inserted,
moved paragraph, moved paragraph`.

Pass 49 rewrote the PR branch only to fold the new remote-peer repro into
commit 1. The branch still has the requested three-commit order:

```text
f25e34a9bc9 Add CRDT repros for RTC adjacent move identity rewrite
b00c745cb8d Add RTC top-level move Playwright repro
39c0b69db21 Avoid rewriting CRDT block records for pure moves
```

Pass 49 fixed-branch verification at
`39c0b69db21e8e54e60d9f8c0ec80d93d8f17f34`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the updated post-sync repro passed (`2 passed`), the focused adjacent
event-shape tests passed (`2 passed, 71 skipped`), the full `crdt-blocks` file
passed (`73 passed`), targeted JS lint passed, `git diff --check` produced no
output, and the natural-user Playwright repro passed in `14.3s`.

Pass 49 created a fresh headless stitched-screen video from the pass-49
known-fixes browser rerun:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-49/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass49-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x760`, `300` frames, `12.0s`, and size
`246024` bytes. The extracted frame at 2s shows both final editor screens plus
the visible action log and final divergent states.

Pass 50 independently rechecked the branch and artifacts rather than relying
on the pass-49 result. The generated source spec and trace still show only
ordinary editor actions: delete heading, collaborator Add before plus typing,
and primary Move down. A fresh known-fixes low-level worktree failed the
post-entrypoint CRDT repros with the same nested operation shapes:

```text
local observer:  YMap, YText, YMap, YText
remote observer: YMap, YMap, YText, YText
```

Pass 50 also reran the browser negative control against the known-fixes base
on port `9903`. It failed in `42.5s` after the final convergence wait, with
post `173`, primary `inserted, displaced sibling, moved paragraph`, and
collaborator `inserted, moved paragraph, moved paragraph`.

The existing PR branch already satisfies the requested three-commit order:

```text
f25e34a9bc9 Add CRDT repros for RTC adjacent move identity rewrite
b00c745cb8d Add RTC top-level move Playwright repro
39c0b69db21 Avoid rewriting CRDT block records for pure moves
```

Pass 50 fixed-branch verification at
`39c0b69db21e8e54e60d9f8c0ec80d93d8f17f34`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the post-sync repro passed (`2 passed`), focused adjacent tests
passed (`2 passed, 71 skipped`), the full `crdt-blocks` file passed
(`73 passed`), targeted JS lint passed, `git diff --check` produced no output,
and the natural-user Playwright repro passed in `14.0s`.

Pass 50 created a fresh headless stitched-screen video from the pass-50
known-fixes browser rerun:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-50/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass50-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1020`, `350` frames, `14.0s`, and size
`308149` bytes. The extracted frame at 2s shows both final editor screens plus
the visible trace-action, low-level-negative-control, and fixed-branch
verification overlay.

Pass 51 rechecked the source run, source screenshots, trace actions,
known-fixes browser behavior, below-Playwright repros, origin commits, and the
existing PR branch. It adds a fresh direct record-morphing negative control on
the known-fixes base: with only commit `f25e34a9bc9` cherry-picked, the direct
`mergeCrdtBlocks()` repro fails because the originally captured moved `Y.Map`
is rewritten to the displaced paragraph:

```text
Expected value: "Another paragraph exists so the top-level list is not degenerate."
Received array: [undefined, "Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا."]
```

The same fresh pass-51 test run also observes nested CRDT edits for a pure
move:

```text
local post observer:  YMap, YText, YMap, YText
remote post observer: YMap, YMap, YText, YText
```

That is the narrower root-cause proof for this pass: the product bug is not
just final text divergence. The merge path mutates logical block records during
a pure adjacent move, and that operation shape is visible below Playwright and
across a synced remote `Y.Doc`.

Pass 51 reran the original generated browser spec against the known-fixes base
on port `9903`:

```bash
GUTENBERG_RTC_BROWSER_SKIP_GLOBAL_POST_CLEANUP=1 GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_DOCKER_SUBNET=10.253.52.0/24 WP_ENV_PORT=9903 WP_ENV_PHPMYADMIN_PORT=9023 WP_BASE_URL=http://localhost:9903 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-51/artifacts-knownfix RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-51/knownfix-ec47-output RTC_MANIFEST_WS_START_PORT=20488 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `43.6s` after the final convergence wait. The pass-51
`attempt-1.json` records post `189`, primary `inserted, displaced sibling,
moved paragraph`, and collaborator `inserted, moved paragraph, moved
paragraph`.

Pass 51 fixed-branch verification at
`39c0b69db21e8e54e60d9f8c0ec80d93d8f17f34`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_DOCKER_SUBNET=10.253.51.0/24 WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the post-sync repro passed (`2 passed`), focused adjacent tests
passed (`2 passed, 71 skipped`), the full `crdt-blocks` file passed
(`73 passed`), targeted JS lint passed, `git diff --check` produced no output,
and the natural-user Playwright repro passed in `10.8s` once wp-env was given
an explicit Docker subnet.

Pass 51 created a fresh stitched video from the pass-51 known-fixes browser
rerun:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-51/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass51-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1020`, `350` frames, `14.0s`, and size
`296563` bytes. The extracted frame at 2s shows both final editor screens plus
the action sequence, low-level event-shape proof, and fixed-branch verification
overlay.

Pass 52 independently verified that the existing branches, video, and fix still
satisfy the requested standard. The source manifest row, log, trace actions,
screenshots, and error context were re-read; the run failed after the final
20s convergence wait with a loaded editor, not during login, discovery,
selection, or readiness.

Pass 52 created a fresh known-fixes throwaway worktree at
`/private/tmp/gutenberg-5ee0-pass52-knownfix-testonly.QObw5V`, based on
`3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only repro commit
`f25e34a9bc9` cherry-picked. Both below-Playwright repros failed before the
fix:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
```

Results: post-sync local observer emitted `YMap`, `YText`, `YMap`, `YText`;
the synced remote-peer observer emitted `YMap`, `YMap`, `YText`, `YText`; and
the direct helper proof again showed the captured moved `Y.Map` had been
morphed into the adjacent displaced paragraph. This is the pass-52 added value:
a fresh verification that the existing branch and fix still satisfy the
standard, including a remote-peer operation-shape negative control on the
known-fixes base.

Pass 52 reran the generated natural-user spec against the known-fixes base on
port `9903`:

```bash
GUTENBERG_RTC_BROWSER_SKIP_GLOBAL_POST_CLEANUP=1 GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9903 WP_ENV_PHPMYADMIN_PORT=9023 WP_BASE_URL=http://localhost:9903 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-52/artifacts-knownfix RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-52/knownfix-ec47-output RTC_MANIFEST_WS_START_PORT=20488 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `43.2s` after the normal editor actions and final
convergence wait. The pass-52 `attempt-1.json` records post `205`, primary
`inserted, displaced sibling, moved paragraph`, and collaborator `inserted,
moved paragraph, moved paragraph`.

Pass 52 fixed-branch verification at
`39c0b69db21e8e54e60d9f8c0ec80d93d8f17f34`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9902 WP_ENV_PHPMYADMIN_PORT=9022 WP_BASE_URL=http://localhost:9902 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-sync repros passed (`2 passed`), focused adjacent tests passed
(`2 passed, 71 skipped`), the full `crdt-blocks` file passed (`73 passed`),
targeted JS lint passed, `git diff --check` produced no output, and the
natural-user Playwright repro passed in `14.7s`.

Pass 52 copied and re-verified the annotated headless video at:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-52/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass52-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1020`, `350` frames, `14.0s`, and size
`296563` bytes.

Pass 53 added a stronger browser-repro proof. The old PR Playwright repro
asserted editor block state without first waiting for post-action RTC sync
cycles, so it could pass on the pre-fix browser build by reading the editor
state before the delayed bad CRDT update arrived. Pass 53 tightened the repro
so every convergence assertion first calls `waitForMutualDiscovery()` with a
20s timeout, matching the source generated spec's sync-cycle settling.

With only the repro commits cherry-picked onto the known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908`, the original PR Playwright repro
passed once before this tightening. After applying the pass-53 repro change in
the same pre-fix test-only worktree, the browser test failed after final sync
settling with the exact product divergence:

```text
expected: inserted paragraph, displaced sibling, moved paragraph
received: inserted paragraph, moved paragraph, moved paragraph
```

The corresponding command was:

```bash
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9903 WP_ENV_PHPMYADMIN_PORT=9023 WP_BASE_URL=http://localhost:9903 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-53/knownfix-pr-repro-tight-artifacts RTC_MANIFEST_WS_START_PORT=20508 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Result: `KNOWNFIX_PR_REPRO_TIGHT_E2E_RC=1`, failing at the final expected
order assertion after `42.2s`. This is pass 53's added value: the natural-user
Playwright repro now actually fails before the product fix and passes after
it, rather than only being a post-fix regression test.

The pass-53 PR branch keeps the requested three-commit order:

```text
f25e34a9bc9 Add CRDT repros for RTC adjacent move identity rewrite
4947f7a3fda Add RTC top-level move Playwright repro
ad5edb7bbab Avoid rewriting CRDT block records for pure moves
```

Pass 53 fixed-branch verification at
`ad5edb7bbab1f92f0dd181a595b2264c7adebf84`:

```bash
git diff --check origin/trunk..HEAD
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9901 WP_ENV_PHPMYADMIN_PORT=9021 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: `git diff --check` produced no output; post-sync repros passed
(`2 passed`); focused adjacent/event-shape tests passed (`2 passed, 71
skipped`); the full `crdt-blocks` file passed (`73 passed`); targeted JS lint
passed; and the tightened natural-user Playwright repro passed in `21.1s`.

Pass 54 independently re-read the source result, source spec, log, error
context, screenshots, and trace inventory. The source run is still a product
failure: `exitCode=1`, `timedOut=false`, and the failure is thrown by
`waitForConvergence()` after normal editor-visible actions, with primary
`inserted, displaced sibling, moved paragraph` and collaborator `inserted,
moved paragraph, moved paragraph`.

Pass 54 reconfirmed that the known-fixes base does not contain the fix. In a
fresh detached worktree at
`3cba2b1e56a98787de08dc6c7df2434759e8f908`, cherry-picking only the
non-Playwright repro commit still fails below the browser:

```bash
git worktree add --detach /private/tmp/gutenberg-5ee0-pass54-knownfix-testonly.6raiZA 3cba2b1e56a98787de08dc6c7df2434759e8f908
git cherry-pick --no-commit f25e34a9bc9
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
```

Results: the post-sync repro failed with local nested targets `YMap`, `YText`,
`YMap`, `YText` and remote nested targets `YMap`, `YMap`, `YText`, `YText`.
The direct helper proof failed because the captured moved `Y.Map` had been
rewritten into the displaced sibling, proving the bad operation shape without
Playwright.

Pass 54 fixed-branch verification at `ad5edb7bbab303d54620591b653eeda848f6d836`:

```bash
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 npm run wp-env status
git diff --check origin/trunk..HEAD
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-54/artifacts-fixed-pr-repro RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: wp-env was running at `http://localhost:9901`; `git diff --check`
produced no output; post-sync repros passed; focused adjacent/event-shape tests
passed (`2 passed, 71 skipped`); targeted JS lint passed; full `crdt-blocks`
passed (`73 passed`); and the natural-user Playwright repro passed headlessly
in `21.9s`.

Pass 54 also tried to rerun the Playwright repro on the known-fixes test-only
worktree after cherry-picking only the repro commits. That run did not reach
the product assertion because global setup failed before the test with:

```text
The plugin "gutenberg-test-plugin-rtc-websocket-provider" isn't installed
```

This is classified as an environment/setup failure and is not used as product
evidence. The source browser failure and the pass-54 low-level known-fixes
failures remain the negative controls.

Pass 54's added audit finding: the current fix is intentionally narrow and
still has residual move-vs-concurrent-edit risk. A temporary two-doc Yjs test
showed that if one peer edits the moved paragraph while another unaware peer
encodes the adjacent pure move as delete+insert, the edited text can be lost at
the CRDT-update level. A quick Yjs probe also confirmed that an integrated
`Y.Map` cannot be reinserted into a `Y.Array`, so preserving nested concurrent
edits across true block moves likely needs a larger block data-model change
such as stable block records plus a separate order structure. That is outside
the minimal fix here but should remain explicit residual risk.

Pass 55 independently re-read the pass-54 summary, source result row, source
spec, source log, error context, screenshots, and trace archive. The trace
contains the expected natural editor sequence: create the draft, click the
heading, choose `Delete`, click the moved paragraph in the collaborator editor,
choose `Add before`, type the inserted paragraph, click the moved paragraph in
the primary editor, click `Move down`, then wait in `waitForConvergence()`.
The archived source failure remains `exitCode=1`, `timedOut=false`, and the
final semantic split remains primary `inserted, displaced sibling, moved
paragraph` versus collaborator `inserted, moved paragraph, moved paragraph`.

Pass 55 added a fresh known-fixes negative control in a new detached worktree
at `3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only the non-Playwright
repro commit cherry-picked:

```bash
git worktree add --detach /private/tmp/gutenberg-5ee0-pass55-knownfix-testonly.8cRdK9 3cba2b1e56a98787de08dc6c7df2434759e8f908
git cherry-pick --no-commit f25e34a9bc9
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
```

Results: the post-sync entrypoint repro failed with local nested targets
`YMap`, `YText`, `YMap`, `YText` and remote nested targets `YMap`, `YMap`,
`YText`, `YText`. The direct helper repro also failed because the captured
moved `Y.Map` had been rewritten into the adjacent displaced paragraph. This
is a fresh pass-55 independent repro route below Playwright and reconfirms that
the known-fixes base does not contain the fix.

Pass 55 fixed-branch verification at `ad5edb7bbab303d54620591b653eeda848f6d836`
kept the requested three-commit PR-branch order:

```text
f25e34a9bc9 Add CRDT repros for RTC adjacent move identity rewrite
4947f7a3fda Add RTC top-level move Playwright repro
ad5edb7bbab Avoid rewriting CRDT block records for pure moves
```

Verification commands:

```bash
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 npm run wp-env status
git diff --check origin/trunk..HEAD
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-55/artifacts-fixed-pr-repro RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: wp-env was running at `http://localhost:9901`; `git diff --check`
produced no output; post-sync repros passed (`2 passed`); focused
adjacent/event-shape tests passed (`2 passed, 71 skipped`); the full
`crdt-blocks` file passed (`73 passed`); targeted JS lint passed; and the
natural-user Playwright repro passed headlessly in `21.8s`.

Pass 55 also attempted a fresh known-fixes browser negative control on port
`9903`, but that run failed before the edit sequence during mutual discovery
with both editors still at the initial state. It is classified as a
readiness/permission failure and is not used as product-bug evidence.

Pass 55 generated a new annotated headless stitched video at:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-55/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass55-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `18.0s`, `450` frames, and size
`370298` bytes. An extracted 8s frame is a `1920x1080` PNG showing both editor
screens and the visible action/result overlay.

Pass 57 adds a fresh independent browser negative control using the PR
natural-user repro itself, not just the archived generated source spec. In a
new detached test-only worktree at known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only repro commits
`f25e34a9bc9` and `4947f7a3fda` cherry-picked and no fix commit, the
below-browser and browser repros still fail.

Pass 57 known-fixes below-browser commands:

```bash
git worktree add --detach /private/tmp/gutenberg-5ee0-pass57-knownfix-testonly.GWX6L8 3cba2b1e56a98787de08dc6c7df2434759e8f908
git cherry-pick --no-commit f25e34a9bc9
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
```

Results: `crdt-post-block-move.ts` failed with local nested targets `YMap`,
`YText`, `YMap`, `YText` and remote nested targets `YMap`, `YMap`, `YText`,
`YText`. The direct `mergeCrdtBlocks()` repro failed because the captured
`moved-block` Y.Map contained the displaced paragraph after the merge. This is
a product-level mutation-shape failure below Playwright.

Pass 57 known-fixes browser command, after adding only the Playwright repro
commit and running against the already-running known-fixes server on port
`9903`:

```bash
git cherry-pick --no-commit 4947f7a3fda
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-57/artifacts-knownfix-pr-repro RTC_MANIFEST_WS_START_PORT=20458 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Result: failed in `42.7s` at the final convergence assertion. The expected
order was `inserted, displaced sibling, moved paragraph`; the collaborator
state was `inserted, moved paragraph, moved paragraph`.

The same repro passed on the fixed PR branch in pass 57:

```bash
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-57/artifacts-fixed-pr-repro RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Result: passed headlessly in `21.3s`.

Pass 57 fixed-branch below-browser verification at
`ad5edb7bbab303d54620591b653eeda848f6d836`:

```bash
git diff --check origin/trunk..HEAD
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
```

Results: `git diff --check` produced no output; post-sync repros passed
(`2 passed`); focused adjacent/event-shape tests passed (`2 passed, 71
skipped`); the full `crdt-blocks` file passed (`73 passed`); and targeted JS
lint passed.

Pass 57 generated and verified a fresh annotated headless video at:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-57/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass57-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `18.0s`, `450` frames, and size
`323995` bytes. `ffmpeg -v error -i ... -f null -` exited 0, and the extracted
8s frame is a `1920x1080` PNG.

Pass 58 rebased both the explanation branch and PR branch onto current
`origin/trunk` at `0742e801c4e12ee31316faa1f8ed9be11a4782c7`, removing the
stale reverse diff against unrelated upstream media-editor changes. The PR
branch now has the requested three-commit order:

```text
f38a9ee54f6 Add CRDT repros for RTC adjacent move identity rewrite
846fcf1ecc5 Add RTC top-level move Playwright repro
bd5c6225d8b Avoid rewriting CRDT block records for pure moves
```

Pass 58 re-read the archived source row, source spec, source log, error
context, screenshots, and trace. The trace still shows completed natural
editor actions, not locator or readiness setup failure: create draft, delete
the heading, collaborator `Add before` and type, primary `Move down`, then a
20s convergence wait. The source run failed normally with `exitCode=1`,
`timedOut=false`, and primary `inserted, displaced sibling, moved paragraph`
versus collaborator `inserted, moved paragraph, moved paragraph`.

Pass 58 added a fresh known-fixes test-only worktree at
`/private/tmp/gutenberg-5ee0-pass58-knownfix-testonly.338961`, based on
`3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only the non-Playwright
repro commit cherry-picked:

```bash
git worktree add --detach /private/tmp/gutenberg-5ee0-pass58-knownfix-testonly.338961 3cba2b1e56a98787de08dc6c7df2434759e8f908
git cherry-pick --no-commit f38a9ee54f6
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern='adjacent|structural array changes|record' --runInBand
```

Results: the post-sync entrypoint failed with local nested targets `YMap`,
`YText`, `YMap`, `YText` and remote nested targets `YMap`, `YMap`, `YText`,
`YText`. The direct helper repro failed because the captured moved `Y.Map`
contained the displaced paragraph after the merge. This is the pass-58
narrower root-cause proof: the old algorithm encodes a pure move as nested
record/text rewrites below Playwright.

Pass 58 also tried the PR-branch Playwright repro against the known-fixes
server on port `9903` after cherry-picking only `846fcf1ecc5`, but that browser
retry failed before the edit sequence with a `wp-sync` 403 during mutual
discovery. It is classified as setup/readiness noise and is not counted as
product evidence. The archived source natural-action failure and fresh
below-browser known-fixes failures remain the counted negative controls.

Pass 58 fixed-branch verification after the rebase:

```bash
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 npm run wp-env status
git diff --check origin/trunk..HEAD
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern='adjacent|structural array changes|record' --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-58/artifacts-fixed-pr-repro RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: wp-env was already running; `git diff --check` produced no output;
post-sync repros passed (`2 passed`); focused adjacent/event-shape tests passed
(`2 passed, 71 skipped`); the full `crdt-blocks` suite passed (`73 passed`);
targeted JS lint passed; and the natural-user Playwright repro passed
headlessly in `22.1s` (`23.9s` wall time).

Pass 58 reran origin archaeology. `git log -- packages/core-data/src/utils/crdt-blocks.ts`
still points the vulnerable algorithm to `84019935998c16f877e976ad85e84748355d7282`
(`#72262`), and `git blame -L 480,660 origin/trunk -- packages/core-data/src/utils/crdt-blocks.ts`
shows that the left/right sweep, positional update loop, delete/insert tail,
and duplicate-clientId cleanup originated there, with later rich-text/type
edits preserving the same pure-move hole. `128a3c29b7f1db4f35faf9e326dd1e5e7ac11104`
(`#75923`) added broad `mergeCrdtBlocks()` tests but not the record-identity or
event-shape invariant that catches this defect.

Pass 58 generated and verified a fresh annotated headless stitched video at:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-58/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass58-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `18.0s`, `450` frames, and size
`315736` bytes. `ffmpeg -v error -i ... -f null -` exited 0, and the extracted
8s frame is a valid `1920x1080` PNG with both source failure screens and the
pass-58 action/result overlay visible.

Pass 59 independently re-read the pass-58 summary, source JSONL row, generated
source spec, source log, error context, screenshots, trace archive, fix branch,
and relevant CRDT code. The trace again shows completed natural editor actions:
draft creation, heading deletion through block Options > Delete, collaborator
Options > Add before plus typing, primary toolbar Move down, and only then the
20s convergence polling. The source failure remains semantic:

```text
primary:      inserted paragraph, displaced sibling, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

Pass 59 added a fresh known-fixes negative control below Playwright at
`/private/tmp/gutenberg-5ee0-pass59-knownfix-testonly.2rI5dj`, based on
known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only
repro commit `f38a9ee54f6` cherry-picked:

```bash
tmpdir=$(mktemp -d /private/tmp/gutenberg-5ee0-pass59-knownfix-testonly.XXXXXX)
git -C /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505 worktree add --detach "$tmpdir" HEAD
cd "$tmpdir"
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
git cherry-pick f38a9ee54f6
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
```

Result: both post-sync repros failed before the fix. The local post-sync path
emitted nested targets `YMap`, `YText`, `YMap`, `YText`; the remote-peer update
path emitted nested targets `YMap`, `YMap`, `YText`, `YText`. This is a fresh
below-browser known-fixes proof that the base still encodes a pure move as
nested record/text rewrites.

Pass 59 also reran the original generated Playwright repro against the
already-running known-fixes server on port `9903`:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `43.5s` after the same convergence assertion. Primary had
`inserted, displaced sibling, moved paragraph`; collaborator had `inserted,
moved paragraph, moved paragraph`. Playwright also reported trace-artifact
`ENOENT` teardown messages, but only after the divergent editor states were
captured, so those messages are not the counted product failure.

Pass 59 fixed-branch verification at
`bd5c6225d8bcee8f164e91b12a50d26d61489802`, based on `origin/trunk` at
`0742e801c4e12ee31316faa1f8ed9be11a4782c7`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check HEAD~3..HEAD
WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the post-sync repros passed (`2 passed`); the focused direct block
tests passed (`2 passed, 71 skipped`); the full `crdt-blocks` file passed
(`73 passed`); targeted JS lint passed; `git diff --check` produced no output;
and the natural-user Playwright repro passed headlessly in `20.3s` (`22.0s`
wall time).

Pass 59 refreshed the origin proof with `git log`, `git blame`, and `git show`.
The left/right sweep, positional update loop, delete/insert tail, and
duplicate-clientId cleanup still trace to
`84019935998c16f877e976ad85e84748355d7282` (`#72262`, merged
`2025-10-14T17:38:19Z`). `128a3c29b7f1db4f35faf9e326dd1e5e7ac11104`
(`#75923`, merged `2026-02-25T22:17:47Z`) expanded merge tests but did not
assert record identity or event shape for pure moves.

Pass 59 generated and verified a fresh annotated headless stitched video at:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-59/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass59-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `18.0s`, `450` frames, and size
`285415` bytes. `ffmpeg -v error -i ... -f null -` exited 0, and the extracted
8s frame is a valid `1920x1080` PNG with both archived failure screens and the
pass-59 action/result overlay visible.

Pass 60 rechecked the current branch state instead of relying only on the pass
59 summary. `origin/trunk` remained
`0742e801c4e12ee31316faa1f8ed9be11a4782c7`, and the PR branch still had the
requested commit order:

```text
f38a9ee54f6 Add CRDT repros for RTC adjacent move identity rewrite
846fcf1ecc5 Add RTC top-level move Playwright repro
bd5c6225d8b Avoid rewriting CRDT block records for pure moves
```

Pass 60 added a fresh verification that the existing branch, video strategy,
and fix satisfy the requested standard. A new known-fixes test-only worktree at
`/private/tmp/gutenberg-5ee0-pass60-knownfix-testonly.2Jet45`, based on
`3cba2b1e56a98787de08dc6c7df2434759e8f908` with only repro commit
`f38a9ee54f6` cherry-picked, failed below Playwright at the real post sync
entrypoint:

```text
local post-sync path:  ["YMap", "YText", "YMap", "YText"]
remote update path:    ["YMap", "YMap", "YText", "YText"]
```

Pass 60 also reran the original generated browser repro against the
known-fixes server on port `9903`:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-60/artifacts-knownfix-source-repro RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `44.0s` after the same final convergence assertion. Primary
had `inserted, displaced sibling, moved paragraph`; collaborator had
`inserted, moved paragraph, moved paragraph`.

Pass 60 fixed-branch verification at
`bd5c6225d8bcee8f164e91b12a50d26d61489802`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern='adjacent|structural array changes|record' --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
git diff --check HEAD~3..HEAD
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-60/artifacts-fixed-pr-repro RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the post-sync repros passed (`2 passed`); the focused event-shape
tests passed (`2 passed, 71 skipped`); the full `crdt-blocks` file passed
(`73 passed`); `git diff --check` produced no output; targeted JS lint passed;
and the natural-user Playwright repro passed headlessly in `21.8s` (`24.8s`
wall time).

Pass 60 generated and verified another annotated headless stitched video at:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-60/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass60-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `18.0s`, `450` frames, and size
`272568` bytes. `ffmpeg -v error -i ... -f null -` exited 0, and the extracted
8s frame is a valid `1920x1080` PNG with both pass-60 known-fixes failure
screens and an action/result overlay visible.

Pass 61 added an independent non-adjacent pure-move proof to the first
non-Playwright repro commit. The new direct `mergeCrdtBlocks()` case starts
with:

```text
[intro, moved, middle, tail] -> [intro, middle, tail, moved]
```

On the known-fixes base with only repro commit
`7d175f1e4b3f61018b67544ee138f705a43fc0f9` cherry-picked, the focused
low-level test run failed for all three move-shape invariants:

```bash
npm --prefix /private/tmp/gutenberg-5ee0-pass61-knownfix-testonly.gqrseV run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern='non-adjacent pure moves|adjacent pure moves|record' --runInBand
```

Results:

```text
does not rewrite block records when moving adjacent top-level blocks: failed because the old moved Y.Map was morphed into the displaced paragraph.
represents adjacent pure moves as structural array changes: received ["YMap","YText","YMap","YText"].
represents non-adjacent pure moves as structural array changes: received ["YMap","YText","YMap","YText","YMap","YText"].
```

That is a narrower root-cause proof than the browser symptom: the old algorithm
rewrites nested block records and rich-text fields for pure reorders, including
a non-adjacent reorder that does not depend on the exact generated spec shape.

Pass 61 rewrote the PR branch to keep the requested three-commit order:

```text
7d175f1e4b3 Add CRDT repros for RTC adjacent move identity rewrite
cac18eaea3b Add RTC top-level move Playwright repro
1e336f88796 Avoid rewriting CRDT block records for pure moves
```

The branch is based on `origin/trunk` at
`0742e801c4e12ee31316faa1f8ed9be11a4782c7`.

Pass 61 fixed-branch verification:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern='non-adjacent pure moves|adjacent pure moves|record' --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
git diff --check origin/trunk...HEAD
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-61/artifacts-fixed-pr-repro RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the post-sync repros passed (`2 passed`); the focused direct block
tests passed (`3 passed, 71 skipped`); the full `crdt-blocks` file passed
(`74 passed`); `git diff --check` produced no output; targeted JS lint passed;
and the natural-user Playwright repro passed headlessly in `19.5s` (`20.9s`
wall time).

Pass 61 reconfirmed the known-fixes browser negative control against the
running base server at `http://localhost:9903`:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-61/artifacts-knownfix-source-repro RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `44.9s` after the same convergence assertion. Primary had
`inserted, displaced sibling, moved paragraph`; collaborator had
`inserted, moved paragraph, moved paragraph`.

Pass 61 generated and verified a fresh annotated headless stitched video at:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-61/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass61-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `18.0s`, `450` frames, and size
`276812` bytes. `ffmpeg -v error -i ... -f null -` exited 0, and the extracted
8s frame is a valid `1920x1080` PNG with both pass-61 known-fixes failure
screens and an action/result overlay visible.

Pass 62 added another independent non-Playwright repro route to the first
commit: a real post-CRDT replay of the generated browser sequence, not only
the reduced adjacent move. The new test starts with heading, moved paragraph,
and displaced paragraph; applies the heading deletion; applies the inserted
paragraph before the moved paragraph; then applies the final top-level move
and ships the update to a remote `Y.Doc`.

On known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908` with only final
repro commit `20d56fcd5b0` cherry-picked, the post-sync test file failed:

```text
represents adjacent pure block moves as structural post block changes:
  received ["YMap","YText","YMap","YText"]
applies adjacent pure block moves to remote peers as structural post block changes:
  received ["YMap","YMap","YText","YText"]
replays the generated structural edit sequence as a structural remote move:
  received ["YMap","YMap","YText","YText"]
```

That independently ties the browser symptom to the CRDT event shape at the
post sync entrypoint across the full structural sequence: before the fix, the
remote peer still receives nested record/text rewrites for a pure top-level
move.

Pass 62 rewrote the PR branch to keep the requested three-commit order:

```text
20d56fcd5b0 Add CRDT repros for RTC adjacent move identity rewrite
f1ce3b531ae Add RTC top-level move Playwright repro
6bd1c429aa1 Avoid rewriting CRDT block records for pure moves
```

The branch is based on `origin/trunk` at
`0742e801c4e12ee31316faa1f8ed9be11a4782c7`.

Pass 62 fixed-branch verification:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern='non-adjacent pure moves|adjacent pure moves|record' --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
git diff --check origin/trunk...HEAD
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-62/artifacts-fixed-pr-repro RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the post-sync repros passed (`3 passed`); the focused direct block
tests passed (`3 passed, 71 skipped`); the full `crdt-blocks` file passed
(`74 passed`); `git diff --check` produced no output; targeted JS lint passed;
and the natural-user Playwright repro passed headlessly in `20.4s` (`22.5s`
wall time).

Pass 62 reconfirmed the original generated browser repro against the running
known-fixes base server at `http://localhost:9903`:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-62/artifacts-knownfix-source-repro RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-62/source-attempt-json RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `44.3s` after the same convergence assertion. Primary had
`inserted paragraph, displaced sibling, moved paragraph`; collaborator had
`inserted paragraph, moved paragraph, moved paragraph`.

Pass 62 generated and verified a fresh annotated headless stitched video at:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-62/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass62-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `20.0s`, `500` frames, and size
`329985` bytes. `ffmpeg -v error -i ... -f null -` exited 0, and the extracted
8s frame is a valid `1920x1080` PNG with both pass-62 known-fixes failure
screens and the action/result overlay visible.

Pass 63 independently reran the source artifacts, fixed branch, known-fixes
browser control, and video generation. The source log and screenshots still
show a completed editor action sequence and a semantic block-list split after
the final convergence wait, not a readiness wait, locator miss, malformed spec,
environment failure, or inverted assertion.

One important pass-63 nuance: a fresh test-only known-fixes worktree at
`/private/tmp/gutenberg-5ee0-pass63-knownfix-testonly.EhOHQ9`, based on
`3cba2b1e56a98787de08dc6c7df2434759e8f908` with only repro commit
`20d56fcd5b0` cherry-picked, now passes
`packages/core-data/src/utils/test/crdt-post-block-move.ts`. That means the
sequential post-sync event-shape test is not, by itself, an authoritative
negative control for the refreshed known-fixes branch. The product bug is still
unfixed there: pass 63 reran the natural-user source spec against the
known-fixes server at `http://localhost:9903`:

```bash
WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `42.7s` after the same final convergence assertion. Primary
had `inserted paragraph, displaced sibling, moved paragraph`; collaborator had
`inserted paragraph, moved paragraph, moved paragraph`. Playwright emitted
trace-file `ENOENT` messages during teardown, but only after the convergence
assertion had already captured the divergent editor states.

Pass 63 fixed-branch verification at
`6bd1c429aa18b257d10101694ede543064148efd`, based on `origin/trunk` at
`0742e801c4e12ee31316faa1f8ed9be11a4782c7`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
git diff --check origin/trunk..HEAD
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the post-sync repros passed (`3 passed`); focused direct block tests
passed (`3 passed, 71 skipped`); the full `crdt-blocks` file passed
(`74 passed`); `git diff --check` produced no output; targeted JS lint passed;
and the natural-user Playwright repro passed headlessly in `20.1s` (`22.2s`
wall time).

Pass 63 generated and verified a fresh annotated headless stitched video at:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-63/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass63-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `20.0s`, `500` frames, and size
`303707` bytes. `ffmpeg -v error -i ... -f null -` exited 0, and the extracted
8s frame is a valid `1920x1080` PNG with both pass-63 known-fixes failure
screens and the action/result overlay visible.

Pass 64 independently reran the falsification checks instead of relying on the
previous-pass conclusion. The source spec still uses ordinary editor actions:
delete the heading, insert a paragraph before the original first paragraph from
the collaborator editor, then move the original paragraph down from the primary
editor. The source run and the fresh pass-64 rerun both fail only after
capturing fully rendered, divergent editor states.

The pass-64 added value is a fresh, current-base low-level negative control. A
new test-only worktree was created from `origin/trunk` at
`0742e801c4e12ee31316faa1f8ed9be11a4782c7`, with only the repro commits
`20d56fcd5b0` and `f1ce3b531ae` cherry-picked. Running the post-sync repro
there failed below Playwright:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
```

Result:

```text
represents adjacent pure block moves as structural post block changes:
  received ["YMap","YText","YMap","YText"]
applies adjacent pure block moves to remote peers as structural post block changes:
  received ["YMap","YMap","YText","YText"]
replays the generated structural edit sequence as a structural remote move:
  received ["YMap","YMap","YText","YText"]
```

That narrows the root cause to CRDT mutation shape on the current trunk base:
the old merge emits nested block-record and rich-text updates for a pure
top-level reorder instead of one structural `Y.Array` change.

Pass 64 reconfirmed the original generated browser repro against the running
known-fixes base test server at `http://localhost:9906`:

```bash
CI=1 WP_BASE_URL=http://localhost:9906 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-64/known-fixes-ec47-attempts npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed on the initial run and both retries with the same convergence
split: primary `inserted paragraph, displaced sibling, moved paragraph`;
collaborator `inserted paragraph, moved paragraph, moved paragraph`.

Pass 64 fixed-branch verification remained clean at
`6bd1c429aa18b257d10101694ede543064148efd`, based on `origin/trunk` at
`0742e801c4e12ee31316faa1f8ed9be11a4782c7`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
CI=1 WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
git diff --check origin/trunk..HEAD
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
```

Results: the post-sync repros passed (`3 passed`); the combined CRDT unit run
passed (`77 passed`); the natural-user Playwright repro passed headlessly in
`21.8s`; `git diff --check` produced no output; and targeted JS lint passed.

Pass 64 generated and verified a fresh annotated headless stitched video at:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-64/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass64-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `22.0s`, `550` frames, and size
`321324` bytes. `ffmpeg -v error -i ... -f null -` exited 0, and the extracted
8s frame is a valid `1920x1080` PNG with both pass-64 known-fixes failure
screens and the action/result overlay visible.

Pass 65 refreshed the branch onto current `origin/trunk` after trunk advanced
to `64575b44eb6a18f9324a84a634d70ddbaee3b748` (`RTC: Fix compaction unit test
(#77986)`). The PR branch kept the requested three-commit order:

```text
e2ec1c90d85 Add CRDT repros for RTC adjacent move identity rewrite
d145962893f Add RTC top-level move Playwright repro
79d95958957 Avoid rewriting CRDT block records for pure moves
```

Pass 65 added a fresh current-trunk pre-fix control in:

```text
/private/tmp/gutenberg-5ee0-pass65-testonly.5u3WoI
```

That worktree was created from `origin/trunk` at `64575b44eb6`, then only the
non-Playwright repro commit was cherry-picked. The post-sync repro still fails
below Playwright:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
```

Result:

```text
represents adjacent pure block moves as structural post block changes:
  received ["YMap","YText","YMap","YText"]
applies adjacent pure block moves to remote peers as structural post block changes:
  received ["YMap","YMap","YText","YText"]
replays the generated structural edit sequence as a structural remote move:
  received ["YMap","YMap","YText","YText"]
```

Pass 65 also reran the generated source browser repro against the known-fixes
base on the correct running server port, `http://localhost:9903`:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-65/known-fixes-ec47-attempts-port9903 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `43.8s` after the final convergence assertion with the same
semantic split as the source row: primary
`inserted paragraph, displaced sibling, moved paragraph`; collaborator
`inserted paragraph, moved paragraph, moved paragraph`. An earlier pass-65
known-fixes rerun used the wrong port and failed during mutual discovery; that
run was discarded as an environment-control failure and not used for product
classification.

Pass 65 fixed-branch verification at
`79d95958957bf95479528f108fb75e28d8b99e70`, based on `origin/trunk` at
`64575b44eb6a18f9324a84a634d70ddbaee3b748`:

```bash
WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
CI=1 WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the combined CRDT unit run passed (`77 passed`); targeted JS lint
passed; `git diff --check` produced no output; and the natural-user Playwright
repro passed headlessly in `22.2s`.

Pass 65 generated and verified a fresh annotated headless stitched video at:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-65/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass65-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `28.0s`, and `700` frames.
`ffmpeg -v error -i ... -f null -` exited 0. The extracted 8s frame is a valid
`1920x1080` PNG and was visually inspected; it shows both latest known-fixes
failure screens and a visible action/result overlay.

## Artifacts

Latest annotated side-by-side video generated and verified in pass 65:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-65/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass65-annotated.mp4
```

PR branch:

```text
try/rtc-top-level-move-reconciliation-duplicates-adjacent-para-5ee0be2f9b7d-pr
```

Pass 66 independently rechecked the pass-65 conclusion on the same current
trunk base, `64575b44eb6a18f9324a84a634d70ddbaee3b748`. The PR branch still
has exactly the requested three commits:

```text
e2ec1c90d85 Add CRDT repros for RTC adjacent move identity rewrite
d145962893f Add RTC top-level move Playwright repro
79d95958957 Avoid rewriting CRDT block records for pure moves
```

Pass 66 added a fresh test-only current-trunk control in:

```text
/private/tmp/gutenberg-5ee0-pass66-testonly.iUnvrw
```

That worktree was created from `origin/trunk`, then only the non-Playwright
repro commit was cherry-picked. The post-sync repro fails below Playwright:

```bash
npm --prefix /private/tmp/gutenberg-5ee0-pass66-testonly.iUnvrw run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
```

Result:

```text
3 failed
Received nested CRDT event targets:
["YMap","YText","YMap","YText"]
["YMap","YMap","YText","YText"]
["YMap","YMap","YText","YText"]
```

Pass 66 fixed-branch verification at
`79d95958957bf95479528f108fb75e28d8b99e70`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='moving adjacent top-level|block reordering|does not rewrite block records'
WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
```

Results: the post-sync unit repro passed (`3 passed`), the focused block merge
tests passed (`3 passed`), the natural-user Playwright repro passed
headlessly in `22.3s`, targeted JS lint passed, and `git diff --check`
produced no output.

Pass 66 also reran the generated source browser repro against the known-fixes
base on the correct running server port, `http://localhost:9903`:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-66/known-fixes-ec47-attempts-port9903 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

The command exited nonzero after a product failure and later Playwright trace
cleanup noise, but the attempt JSON captured the authoritative divergence:
primary `inserted paragraph, displaced sibling, moved paragraph`;
collaborator `inserted paragraph, moved paragraph, moved paragraph`.

Pass 66 generated and verified a fresh annotated headless stitched video at:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-66/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass66-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `28.0s`, and `700` frames.
`ffmpeg -v error -i ... -f null -` exited 0. The extracted 8s frame is a
valid `1920x1080` PNG and was visually inspected; it shows the pass-66
known-fixes failure screenshots plus the action/result overlay.

Pass 67 independently rechecked the source failure, the current PR branch,
the known-fixes negative control, and a fresh test-only pre-fix worktree.
The added pass-67 evidence is a new below-Playwright control created at:

```text
/private/tmp/gutenberg-5ee0-pass67-testonly.YZyhHq
```

That worktree is detached at the first PR commit only:

```text
e2ec1c90d85 Add CRDT repros for RTC adjacent move identity rewrite
```

The post-sync entrypoint repro fails before the fix:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
```

Result: `3 failed`; the pure block move is observed as nested `YMap` and
`YText` edits, including `["YMap","YText","YMap","YText"]` locally and
`["YMap","YMap","YText","YText"]` on remote peers.

The direct block helper repro also fails before the fix:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
```

Result: `3 failed`; the captured moved block record contains the displaced
sibling content, and adjacent/non-adjacent pure moves emit nested CRDT events
instead of one structural array change.

Pass 67 fixed-branch verification at
`79d95958957bf95479528f108fb75e28d8b99e70`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9902 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the post-sync repro passed (`3 passed`), focused block merge tests
passed (`3 passed, 71 skipped`), the full `crdt-blocks` test file passed
(`74 passed`), targeted JS lint passed, `git diff --check` produced no output,
and the natural-user Playwright repro passed headlessly in `22.0s`.

Pass 67 also reran the generated source browser repro against the known-fixes
base on `http://localhost:9903`:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-67/known-fixes-5ee0be2f9b7d npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed normally after convergence wait, with the same product
divergence captured in `attempt-1.json`: primary
`inserted paragraph, displaced sibling, moved paragraph`; collaborator
`inserted paragraph, moved paragraph, moved paragraph`.

Pass 67 generated and verified a fresh annotated headless stitched video at:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-67/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass67-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `28.0s`, and `700` frames.
`ffmpeg -v error -i ... -f null -` exited 0. The extracted 8s frame is a
valid `1920x1080` PNG and was visually inspected; it shows the source failure
screens side by side, visible action-log text, the known-fixes rerun result,
and the below-Playwright root-cause proof.

Pass 68 independently re-read the pass-67 summary, source result row, generated
spec, source log, trace action titles, error-context snapshot, and failure
screenshots. The source row still shows a normal non-timeout failure:

```text
result=failed exitCode=1 timedOut=false durationMs=48363
startedAt=2026-05-05T10:20:12.857Z completedAt=2026-05-05T10:21:01.220Z
```

The trace action stream contains ordinary editor operations: create a post,
open both editors, delete the heading via block Options > Delete, insert a
paragraph via collaborator block Options > Add before, then move the original
paragraph down with the toolbar Move down button. The error context and
screenshots show a loaded editor, not a locator miss or unloaded page. The
semantic split is unchanged:

```text
primary:      inserted paragraph, displaced sibling, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

Pass 68 added a fresh known-fixes-base low-level control rather than relying on
the existing pass-67 pre-fix worktree. The worktree was created at the
known-fixes base commit `3cba2b1e56a98787de08dc6c7df2434759e8f908`, then only
the non-Playwright repro commit was cherry-picked without committing:

```text
/private/tmp/gutenberg-5ee0-pass68-knownfix-testonly.srfcxS
```

Commands:

```bash
git worktree add --detach /private/tmp/gutenberg-5ee0-pass68-knownfix-testonly.srfcxS 3cba2b1e56a98787de08dc6c7df2434759e8f908
git cherry-pick -n e2ec1c90d85b2792a73bf35fd9540fea0b7b7e22
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern='adjacent|structural array changes|record' --runInBand
```

Results: both focused low-level commands failed on the known-fixes base. The
post-sync entrypoint emitted nested CRDT targets
`["YMap","YText","YMap","YText"]` and
`["YMap","YMap","YText","YText"]`; the direct block helper test also showed
that the captured moved block record was rewritten to the displaced sibling
content. This confirms the known-fixes base is not fixed below Playwright.

Pass 68 also made a separate fresh test-only control at the first PR commit:

```text
/private/tmp/gutenberg-5ee0-pass68-testonly.huGSuW
```

That worktree is detached at
`e2ec1c90d85b2792a73bf35fd9540fea0b7b7e22`. The same post-sync and direct
block-helper tests failed there with the same nested `YMap`/`YText` event
shape and record-morphing assertion.

The pass-68 browser rerun of the generated source spec against the known-fixes
base used the correct running base URL, `http://localhost:9903`, but hit a
`page.waitForResponse` timeout during sync-cycle waiting before the final
divergence point:

```bash
RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-68/knownfix-e2e WP_BASE_URL=http://localhost:9903 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

That browser rerun was treated as an environment/readiness control failure and
not used as the product-bug proof. The source run, source screenshots, prior
known-fixes browser reruns, and the fresh pass-68 known-fixes-base low-level
control still prove the product defect.

Pass 68 fixed-branch verification at
`79d95958957bf95479528f108fb75e28d8b99e70`, based on `origin/trunk` at
`64575b44eb6a18f9324a84a634d70ddbaee3b748`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern='adjacent|structural array changes|record' --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_BASE_URL=http://localhost:9902 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the post-sync repro passed (`3 passed`), the focused block tests
passed (`3 passed, 71 skipped`), the full `crdt-blocks` file passed
(`74 passed`), targeted JS lint passed, `git diff --check` produced no output,
and the natural-user Playwright repro passed headlessly in `23.0s`.

Pass 69 independently rechecked the source failure, current branch base,
known-fixes negative controls, fixed branch, origin commits, PR metadata, and
video artifact. Current `origin/trunk` remains:

```text
64575b44eb6a18f9324a84a634d70ddbaee3b748
```

The source result row, log, trace action stream, error-context snapshot, and
failure screenshots still support the same classification: ordinary editor
actions reached a semantic convergence failure, not a readiness-only failure,
locator error, malformed generated spec, environment failure, or inverted
assertion. The pass-69 screenshot inspection again showed loaded editor
surfaces with primary
`inserted paragraph, displaced sibling, moved paragraph` and collaborator
`inserted paragraph, moved paragraph, moved paragraph`.

Pass 69 added a fresh known-fixes-base test-only worktree:

```text
/private/tmp/gutenberg-5ee0-pass69-knownfix-testonly.32kMLc
```

It was created at the known-fixes base commit
`3cba2b1e56a98787de08dc6c7df2434759e8f908`, then only the non-Playwright repro
commit `e2ec1c90d85b2792a73bf35fd9540fea0b7b7e22` was cherry-picked without
committing.

Fresh pass-69 known-fixes low-level commands:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
```

Results: both failed on the known-fixes base. The post-sync entrypoint failed
all three tests, with nested non-array CRDT targets including
`["YMap","YText","YMap","YText"]` and
`["YMap","YMap","YText","YText"]`. The direct block-helper test also failed all
three focused tests and proved the captured moved `Y.Map` record was rewritten
to the displaced sibling content.

Pass 69 also reran the generated natural-user source spec against the
known-fixes base on `http://localhost:9903`:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `43.1s` with the same product divergence as the source row:
primary `inserted, displaced sibling, moved paragraph`; collaborator
`inserted, moved paragraph, moved paragraph`. Playwright emitted trace-copy
`ENOENT` teardown noise, but only after the convergence assertion had already
captured the divergent editor states.

Pass 69 fixed-branch verification on
`try/rtc-top-level-move-reconciliation-duplicates-adjacent-para-5ee0be2f9b7d-pr`
at `79d95958957bf95479528f108fb75e28d8b99e70`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9902 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the post-sync repro passed (`3 passed`), the focused block tests
passed (`3 passed, 71 skipped`), the full `crdt-blocks` file passed
(`74 passed`), targeted JS lint passed, `git diff --check` produced no output,
and the natural-user Playwright repro passed headlessly in `23.0s`.

Pass 69 confirmed the root-cause origin with `git log`, `git blame`, `git
show`, and GitHub PR metadata. `84019935998c16f877e976ad85e84748355d7282`
from PR #72262 introduced the post entity CRDT merge logic and the positional
update/delete/insert path. `128a3c29b7f1db4f35faf9e326dd1e5e7ac11104` from PR
#75923 expanded `mergeCrdtBlocks()` testing but did not add record-identity or
event-shape assertions for pure moves. The GitHub CLI was unavailable in the
local shell, so pass 69 used the GitHub connector for PR metadata.

Pass 69 generated and verified a fresh annotated headless stitched video at:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-69/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass69-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `28.0s`, and `700` frames.
`ffmpeg -v error -i ... -f null -` exited 0. Sample frames at 4s and 16s are
valid `1920x1080` PNGs and were visually inspected; they show the source
failure screens side by side, the natural action log, the pass-69 known-fixes
negative controls, and the fixed-branch verification.

Pass 70 independently re-read the pass-69 summary, raw source row, generated
source spec, source run log, trace action titles, error-context snapshot, and
fresh rerun artifacts. The source and pass-70 known-fixes browser rerun both
completed the natural editor actions and then split only after the convergence
wait:

```text
primary:      inserted paragraph, displaced sibling, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

That continues to rule out a readiness-only wait, locator failure, malformed
generated spec, environment failure, inverted assertion, or expected editor
behavior.

Pass 70 added a fresh known-fixes-base low-level control:

```text
/private/tmp/gutenberg-5ee0-pass70-knownfix.7ID3l4/repo
base: 3cba2b1e56a98787de08dc6c7df2434759e8f908
tests cherry-picked without committing: e2ec1c90d85, d145962893f
```

Commands:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves"
```

Results: both commands failed on the known-fixes base. The post-sync entrypoint
failed all three tests with nested non-array CRDT targets, including
`["YMap","YText","YMap","YText"]` and
`["YMap","YMap","YText","YText"]`. The direct block-helper command also failed
all three focused tests; the captured `moved-block` `Y.Map` record was rewritten
to the displaced sibling paragraph content. This is the pass-70 narrower
root-cause proof: the defect is the positional CRDT mutation shape itself.

Pass 70 also reran the generated natural-user source spec against the
known-fixes base on the already-running `http://localhost:9903` environment:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/private/tmp/gutenberg-5ee0-pass70-knownfix.7ID3l4/knownfix-browser-output npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `44.6s` with the same product divergence. The attempt JSON
records primary `inserted, displaced sibling, moved paragraph` and secondary
`inserted, moved paragraph, moved paragraph`.

Pass 70 fixed-branch verification on
`try/rtc-top-level-move-reconciliation-duplicates-adjacent-para-5ee0be2f9b7d-pr`
at `79d95958957bf95479528f108fb75e28d8b99e70`, based on `origin/trunk` at
`64575b44eb6a18f9324a84a634d70ddbaee3b748`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves"
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the post-sync repro passed (`3 passed`), focused block tests passed
(`3 passed, 71 skipped`), the full `crdt-blocks` file passed (`74 passed`),
targeted JS lint passed, `git diff --check` produced no output, and the
natural-user Playwright repro passed headlessly in `21.4s`. The first browser
attempt before rebuilding failed at mutual-discovery readiness and was treated
as an environment/readiness miss, not product evidence. `npm run build` produced
the relevant JS/PHP build artifacts, then failed in the unrelated theme
primitive color token generator with `TypeError: [object Object] is not a valid
color space`.

Pass 70 generated and verified a fresh annotated headless stitched video at:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-70/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass70-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `28.0s`, and `700` frames.
`ffmpeg -v error -i ... -f null -` exited 0. Sample frames at 4s and 16s are
valid `1920x1080` PNGs and were visually inspected; they show the pass-70
known-fixes browser split, the natural action log, the below-Playwright
known-fixes proof, and the fixed-branch verification.

Pass 71 independently re-read the pass-70 summary, raw source row, generated
source spec, source log, trace action titles, error-context snapshot, and the
fresh screenshots. The source failure still distinguishes cleanly from harness
artifacts: the natural delete/add-before/type/move-down sequence completed, and
only the final convergence wait observed primary `inserted, displaced, moved`
versus collaborator `inserted, moved, moved`.

Pass 71 added a branch-freshness correction. `origin/trunk` had advanced by
`85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5` (`RTC: Attach sync observers after
hydrating persisted CRDT doc (#77966)`) after pass 70. Before rebasing, the PR
branch diff also showed an accidental reversal of the new trunk
`packages/sync/src/manager.ts` change. Pass 71 rebased both the explanation
branch and the PR branch onto current `origin/trunk`, leaving the PR branch
with only the intended CRDT fix and repro files.

Rebased PR branch commit order:

```text
992927a0ef3 Add CRDT repros for RTC adjacent move identity rewrite
866ed50014d Add RTC top-level move Playwright repro
d8308546111 Avoid rewriting CRDT block records for pure moves
```

After rebase, `git merge-base HEAD origin/trunk` equals current `origin/trunk`
at `85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5`, and `git diff --stat
origin/trunk..HEAD` lists only:

```text
packages/core-data/src/utils/crdt-blocks.ts
packages/core-data/src/utils/test/crdt-blocks.ts
packages/core-data/src/utils/test/crdt-post-block-move.ts
test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
```

Pass 71 fixed-branch verification:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves"
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run wp-env status
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-sync repro passed (`3 passed`), focused block tests passed
(`3 passed, 71 skipped`), full `crdt-blocks` passed (`74 passed`), targeted JS
lint passed, `git diff --check` produced no output, `wp-env status` reported a
running environment at `http://localhost:9901`, and the natural-user Playwright
repro passed headlessly in `20.7s`. The first browser attempt before rebuilding
failed at initial Collaborators-list readiness; after `npm run build` refreshed
`build:js` and `build:php`, the same browser repro passed. The build command
then failed in the unrelated theme primitive color token generator with
`TypeError: [object Object] is not a valid color space`.

Pass 71 known-fixes negative controls used the known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908`.

Lowest-level test-only control:

```bash
git worktree add --detach /private/tmp/gutenberg-5ee0-pass71-knownfix.6kykk7/repo 3cba2b1e56a98787de08dc6c7df2434759e8f908
git cherry-pick --no-commit 992927a0ef3
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves"
```

Results: both commands failed as expected on the known-fixes base. The
post-sync tests failed `3/3` with nested non-array CRDT event targets
`["YMap","YText","YMap","YText"]` and
`["YMap","YMap","YText","YText"]`. The direct block-helper tests failed `3/3`;
the captured `moved-block` Y.Map record was rewritten to the displaced sibling
paragraph, and pure moves emitted nested `YMap`/`YText` events instead of one
top-level structural array change.

Fresh known-fixes browser control:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run wp-env status
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-71/5ee0be2f9b7d-knownfix-browser npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: `wp-env status` reported the known-fixes environment running at
`http://localhost:9903`; the generated natural-user source spec failed in
`44.9s` after the final convergence wait with primary
`inserted, displaced sibling, moved paragraph` and collaborator
`inserted, moved paragraph, moved paragraph`.

Pass 71 reconfirmed the origin analysis with `git log --follow`, `git blame`,
and `git show`: `84019935998c16f877e976ad85e84748355d7282` / PR #72262
introduced `crdt-blocks.ts` and the positional update/delete/insert merge path;
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104` / PR #75923 expanded final-state
tests but did not assert record identity or event shape for pure moves.

Pass 71 generated and verified a fresh annotated headless stitched video at:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-71/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass71-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `32.0s`, and `800` frames.
`ffmpeg -v error -i ... -f null -` exited 0. A sample frame at 6s is a valid
`1920x1080` PNG and was visually inspected; it shows both known-fixes failure
screens, the action log, expected order, observed divergence, and the rebased
fixed-branch pass note.

Pass 72 independently re-read the pass-71 summary, the raw source row, the
generated source spec, the source run log, the source error-context snapshot,
trace action titles, and the current PR/explanation branches. The source and
fresh pass-72 browser control both complete the natural editor sequence before
failing only at final convergence:

```text
primary:      inserted paragraph, displaced sibling, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

This still rules out readiness-only waits, locator failures, malformed source
specs, inverted assertions, and expected behavior. The trace action titles show
ordinary editor actions: create/open the post in two editors, delete the heading
through block options, insert a paragraph with Add before, type the inserted
paragraph, and click toolbar Move down.

Pass 72 branch freshness check:

```text
origin/trunk = 85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5
PR branch    = d8308546111b1a2b76e1f44c295fc57b8038682d
merge-base   = 85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5
```

The PR branch diff remains limited to the intended files:

```text
packages/core-data/src/utils/crdt-blocks.ts
packages/core-data/src/utils/test/crdt-blocks.ts
packages/core-data/src/utils/test/crdt-post-block-move.ts
test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
```

Pass 72 fixed-branch verification:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves"
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-sync tests passed (`3 passed`), focused block-shape tests passed
(`3 passed, 71 skipped`), full `crdt-blocks.ts` passed (`74 passed`), targeted
JS lint passed, `git diff --check` produced no output, and the natural-user
Playwright repro passed in `21.3s`. One first browser attempt failed before the
action sequence at the Collaborators-list readiness wait; after `npm run build`
refreshed `build:js` and `build:php`, the same repro passed. The build command
still fails later in the unrelated theme primitive color token generator with
`TypeError: [object Object] is not a valid color space`.

Pass 72 known-fixes negative controls used the known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` with commit `992927a0ef3`
cherry-picked without committing to add the repro tests:

```bash
git worktree add --detach /private/tmp/gutenberg-5ee0-pass72-knownfix.E4IDzd/repo 3cba2b1e56a98787de08dc6c7df2434759e8f908
git cherry-pick --no-commit 992927a0ef3
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves"
```

Results: the post-sync command failed `3/3` with nested CRDT event targets
`["YMap","YText","YMap","YText"]` and
`["YMap","YMap","YText","YText"]`. The direct block-helper command failed
`3/3`; the captured `moved-block` Y.Map was rewritten to the displaced sibling
paragraph, and pure moves emitted nested `YMap`/`YText` events instead of one
top-level structural array change.

Pass 72 also reran the generated natural-user source repro against the
known-fixes base:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-72/5ee0be2f9b7d-knownfix-browser npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `44.0s` after final convergence polling, with primary
`inserted, displaced sibling, moved paragraph` and collaborator
`inserted, moved paragraph, moved paragraph`.

Pass 72 generated and verified a fresh annotated headless stitched video at:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-72/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass72-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `32.0s`, and `800` frames.
`ffmpeg -v error -i ... -f null -` exited 0. A sample frame at 6s is a valid
`1920x1080` PNG and was visually inspected; it shows the pass-72 known-fixes
failure screens, action log, low-level negative controls, and fixed-branch pass
results.

Pass 73 re-read the pass-72 summary, the source row, source spec, source log,
error-context snapshot, trace action titles, current PR branch, current
explanation branch, root-cause code, and fix tests. The source failure is still
a normal product divergence after natural editor actions, not setup fallout:
the source row is `result=failed`, `exitCode=1`, `timedOut=false`,
`durationMs=48363`, and the failure occurs only after the final convergence
wait following delete heading, Add before, typed inserted paragraph, and toolbar
Move down.

Pass 73 added a fresh pre-fix detached-worktree proof from commit
`992927a0ef3` (`Add CRDT repros for RTC adjacent move identity rewrite`),
before the fix commit:

```bash
git worktree add --detach /private/tmp/gutenberg-5ee0-pass73-testonly.AThr4r/repo HEAD~2
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="represents adjacent pure moves as structural array changes" --runInBand
```

Results: `crdt-post-block-move.ts` failed `3/3`. The direct block-helper test
also failed. Both failures observed nested CRDT record edits for a pure move:
`["YMap","YText","YMap","YText"]` locally and
`["YMap","YMap","YText","YText"]` on the remote post-sync path. This is a
lower-than-Playwright proof that the bug is the CRDT mutation shape itself.

Pass 73 fixed-branch verification on PR branch head
`d8308546111b1a2b76e1f44c295fc57b8038682d`, merge-based exactly on current
`origin/trunk` `85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="represents adjacent pure moves as structural array changes" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check HEAD~3..HEAD
WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-sync tests passed (`3 passed`), focused structural-array block
test passed (`1 passed, 73 skipped`), full `crdt-blocks.ts` passed
(`74 passed`), targeted JS lint passed, `git diff --check` produced no output,
and the natural-user Playwright repro passed in `21.8s`.

Pass 73 known-fixes negative browser control:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-73/known-fixes-5ee0be2f9b7d-output npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `44.1s` after final convergence polling. The saved
`attempt-1.json` shows primary
`inserted, displaced sibling, moved paragraph` and secondary
`inserted, moved paragraph, moved paragraph`.

Pass 73 also verified the existing pass-72 annotated headless video rather than
regenerating the same artifact. `ffprobe` reports H.264 video, `1920x1080`,
`32.0s`, and `800` frames. `ffmpeg -v error -i ... -f null -` exited 0. A
sample frame extracted at 6s is a valid `1920x1080` PNG and was visually
inspected; it shows both editor screens, expected/observed states, the action
log, the low-level negative controls, and fixed-branch pass results.

Pass 74 independently re-read the previous summary, raw source row, generated
source spec, source run log, error-context snapshot, trace action titles,
screenshots, current PR branch, current explanation branch, root-cause code, and
fix tests. The source failure still reaches the final convergence wait after
ordinary editor actions and then reports a semantic split:

```text
primary:      inserted paragraph, displaced sibling, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

No evidence was found for a readiness-only failure, action locator failure,
malformed generated spec, environment failure, inverted assertion, or expected
behavior. The trace action titles include post creation/opening in two editors,
Options > Delete, collaborator Options > Add before, typing the inserted
paragraph, and primary toolbar Move down before convergence polling.

Pass 74 added a fresh detached pre-fix proof from commit `992927a0ef3`, before
the product fix:

```bash
git worktree add --detach /private/tmp/gutenberg-5ee0-pass74-testonly.mFqaCJ/repo 992927a0ef3
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
```

Results: `crdt-post-block-move.ts` failed `3/3`. The direct block-helper
command failed `3/3`. The post-sync failures observed nested non-array CRDT
event targets `["YMap","YText","YMap","YText"]` and
`["YMap","YMap","YText","YText"]`; the direct helper also proved that the
captured moved `Y.Map` record was rewritten into the displaced sibling
paragraph. This is a lower-than-Playwright root-cause proof of positional CRDT
record morphing.

Pass 74 fixed-branch verification on PR branch head
`d8308546111b1a2b76e1f44c295fc57b8038682d`, still merge-based exactly on
`origin/trunk` `85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-sync tests passed (`3 passed`), focused structural event-shape
tests passed (`3 passed, 71 skipped`), full `crdt-blocks.ts` passed
(`74 passed`), targeted JS lint passed, `git diff --check` produced no output,
and the natural-user Playwright repro passed headlessly in `22.4s`.

Pass 74 known-fixes negative browser control used the known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908`:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20418 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `43.9s` after final convergence polling with the same product
divergence: primary `inserted, displaced sibling, moved paragraph` and
collaborator `inserted, moved paragraph, moved paragraph`. Playwright emitted
trace `ENOENT` teardown messages after the convergence assertion had already
captured the divergent editor states, so those teardown messages are not the
cause of the failure.

Pass 74 reconfirmed origin with local Git because `gh` is not installed in this
environment. `git show`, `git blame`, and `git log` still point to
`84019935998c16f877e976ad85e84748355d7282` / PR #72262 as the introduction of
`crdt-blocks.ts` and the positional update/delete/insert reconciliation path.
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104` / PR #75923 expanded final-state
tests without asserting Yjs record identity or pure-move event shape.
`54af1ce400687f2ba51fee6c440207a07af5d55f` changed RichText cursor scoping and
attribute merge behavior but retained the same positional array reconciliation
shape; it did not introduce this pure-reorder failure.

Pass 74 also reverified the existing pass-72 annotated headless video rather
than regenerating the same artifact. `ffprobe` reports H.264 video,
`1920x1080`, `32.0s`, and `800` frames. `ffmpeg -v error -i ... -f null -`
exited 0. Fresh frames extracted at 6s, 16s, and 28s are valid `1920x1080`
PNGs; the 16s frame was visually inspected and shows both editor screens, the
expected order, observed peer split, action log, low-level negative controls,
and fixed-branch pass results.

Pass 75 refreshed the PR and explanation branches onto current `origin/trunk`
`369e71ec725855b95d11b46174aef436fa7f75c8`. The rebased PR branch keeps the
requested commit order:

```text
e5dbdea02c5 Add CRDT repros for RTC adjacent move identity rewrite
817cf8df335 Add RTC top-level move Playwright repro
66464e72726 Avoid rewriting CRDT block records for pure moves
```

Pass 75 added a fresh independent negative proof on the rebased test-only
commit, before the product fix:

```bash
git worktree add --detach /private/tmp/gutenberg-5ee0-pass75-testonly.LpL518/repo e5dbdea02c5
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
```

Results: the post-sync command failed `3/3` with nested CRDT event targets
`["YMap","YText","YMap","YText"]` and
`["YMap","YMap","YText","YText"]`. The direct block-helper command failed
`3/3`; it again proved the captured `moved-block` `Y.Map` record was rewritten
into the displaced sibling paragraph. This is a current-trunk, lower-than-
Playwright proof that the defect is positional CRDT record morphing.

Pass 75 fixed-branch verification on PR branch head
`66464e72726`, merge-based on `origin/trunk`
`369e71ec725855b95d11b46174aef436fa7f75c8`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-sync tests passed (`3 passed`), focused structural event-shape
tests passed (`3 passed, 71 skipped`), the full `crdt-blocks.ts` file passed
(`74 passed`), targeted JS lint passed, `git diff --check` produced no output,
and the natural-user Playwright repro passed headlessly in `21.7s`.

Pass 75 reconfirmed the known-fixes negative browser control on
`3cba2b1e56a98787de08dc6c7df2434759e8f908`:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20418 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-75/known-fixes-5ee0be2f9b7d-output npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `44.0s` after final convergence polling with the same
semantic divergence. The saved
`pass-75/known-fixes-5ee0be2f9b7d-output/attempt-1.json` records primary
`inserted, displaced sibling, moved paragraph` and secondary
`inserted, moved paragraph, moved paragraph`.

Pass 75 reran the origin check after rebasing. `git show`, `git blame
origin/trunk -L 470,650 -- packages/core-data/src/utils/crdt-blocks.ts`, and
`git log --ancestry-path` still point to
`84019935998c16f877e976ad85e84748355d7282` / PR #72262 as the introduction of
the positional update/delete/insert reconciliation path. PR #75923 expanded
coverage, but not the Yjs record-identity or pure-move event-shape invariant.
`gh` is still unavailable in this environment, so PR metadata was taken from
local Git commit messages and GitHub PR numbers embedded in commit subjects.

Pass 75 fix-plan audit remains unchanged after the current-trunk rebase.
Kernel-maintainer robustness: the patch is still localized to `mergeCrdtBlocks`
and rejects missing, duplicate, ambiguous, or edited identities. Jepsen-style
correctness: a strict logical move is now one atomic top-level array replacement
instead of replicated sibling record rewrites. Dan-Luu-style
simplicity/performance: the fix is O(n) over the already-detected changed slice,
avoids an LCS rewrite, and keeps mixed edit cases on the existing path.

Pass 75 reverified the annotated headless video and copied the verified artifact
to a pass-75-local path:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-75/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass75-verified-pass72-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `32.0s`, and `800` frames.
`ffmpeg -v error -i ... -f null -` exited 0. Fresh 6s, 16s, and 28s frames
were extracted into the pass-75 video directory; the 16s frame was visually
inspected and shows both editor screens, expected and observed orders, the
action log, low-level negative controls, and fixed-branch pass results.

Pass 76 independently re-read the source result, generated spec, failure log,
error-context snapshot, screenshots, trace metadata, current fix, and origin
history. The source failure and pass-76 known-fixes rerun both failed after
real editor actions had completed, with the same populated semantic split:
primary `inserted, displaced sibling, moved paragraph`; collaborator
`inserted, moved paragraph, moved paragraph`. The pass-76 source artifact
inspection also confirmed that the final screenshot contains real post content
and not a locator/readiness failure.

Pass 76 added a fresh current-branch negative proof using the test-only commit
`e5dbdea02c5e2716bf2f906be4f64d8d59553011`:

```bash
git worktree add --detach /private/tmp/gutenberg-5ee0-pass76-testonly.kLfeh9 e5dbdea02c5e2716bf2f906be4f64d8d59553011
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
```

Results: the post-sync proof failed `3/3` with nested event targets
`["YMap","YText","YMap","YText"]` and
`["YMap","YMap","YText","YText"]`; the direct block-helper proof failed `3/3`
and again showed the captured `moved-block` record morphing into the displaced
paragraph. This reconfirms the root cause below Playwright.

Pass 76 fixed-branch verification on PR branch head `66464e72726`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the post-sync tests passed (`3 passed`), focused structural tests
passed (`3 passed, 71 skipped`), the full `crdt-blocks.ts` file passed
(`74 passed`), targeted JS lint passed, `git diff --check` produced no output,
and the natural-user Playwright repro passed in `22.2s`. The first pass-76
Playwright attempt failed before the scenario started while waiting for the
collaborator presence button; a rerun after refreshing the JS bundle passed.
`npm run build` itself failed later in primitive color-token generation with
`TypeError: [object Object] is not a valid color space`, after the JS and PHP
build subtasks had completed.

Pass 76 reconfirmed the known-fixes base at
`3cba2b1e56a98787de08dc6c7df2434759e8f908`:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20418 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-76/known-fixes-5ee0be2f9b7d-output npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed with the same non-converged primary/secondary block states saved
in `pass-76/known-fixes-5ee0be2f9b7d-output/attempt-1.json`. Playwright also
reported trace-copy `ENOENT` errors during teardown, after the semantic failure
had already been captured.

Pass 76 reran origin checks. `git blame origin/trunk -L 470,650` still points
the left/right sweep and positional update/delete/insert path back to
`84019935998c16f877e976ad85e84748355d7282` / PR #72262, with later commits
including `128a3c29b7f1db4f35faf9e326dd1e5e7ac11104` expanding final-state
coverage without asserting Yjs record identity or pure-move event shape.

Pass 76 verified the existing annotated headless video and copied it to:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-76/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass76-verified-pass75-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `32.0s`, and `800` frames;
`ffmpeg -v error -i ... -f null -` exited 0. The SHA-256 is
`6da5f8880e00e6e1d45357b244862f80427bfc551f3c78424f047c8a8289c723`. The
16s frame was visually inspected and shows both editor screens, expected and
observed orders, the action log, low-level negative controls, and fixed-branch
pass results. This pass therefore verifies that the existing branch, fix, and
video still satisfy the requested standard.

Pass 77 independently rechecked the source row, generated natural-user spec,
source failure log, source screenshots, current fix, and origin history. The
source and known-fixes failures are still semantic convergence failures with
real editor content, not locator, readiness, malformed-spec, assertion, or
environment-only failures.

Pass 77 reran the current test-only negative proof at
`e5dbdea02c5e2716bf2f906be4f64d8d59553011`:

```bash
git worktree add --detach /private/tmp/gutenberg-5ee0-pass77-testonly.J14QWu e5dbdea02c5e2716bf2f906be4f64d8d59553011
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules /private/tmp/gutenberg-5ee0-pass77-testonly.J14QWu/node_modules
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves" --runInBand
```

Results: the post-sync proof failed `3/3` with nested CRDT event targets
`["YMap","YText","YMap","YText"]` and
`["YMap","YMap","YText","YText"]`. The direct helper proof failed `2/2`; the
captured moved `Y.Map` contained the displaced sibling paragraph, and the event
stream again contained nested `YMap`/`YText` edits. This is a fresh pass-77
below-browser root-cause proof.

Pass 77 adds one narrower fix-audit proof: Yjs cannot simply move already
integrated `Y.Map` block records by deleting and reinserting the same objects.
A standalone Yjs check using `[a,b,c] -> [a,c,b]` throws
`TypeError: Cannot read properties of null (reading 'forEach')` when the old
integrated maps are reinserted. That confirms why the small fix uses one atomic
delete/insert of fresh records for strict pure reorders instead of attempting
to reuse deleted Yjs types directly.

Pass 77 fixed-branch verification on PR branch head `66464e72726`, based on
`origin/trunk` `369e71ec725855b95d11b46174aef436fa7f75c8`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-sync unit tests passed (`3 passed`), focused direct block tests
passed (`3 passed, 71 skipped`), targeted JS lint passed, `git diff --check`
produced no output, and the natural-user Playwright repro passed headlessly in
`19.9s`.

Pass 77 reconfirmed the known-fixes base on port `9903`:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20418 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-77/known-fixes-5ee0be2f9b7d-output npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed after the natural editor actions with primary
`inserted, displaced sibling, moved paragraph` and collaborator
`inserted, moved paragraph, moved paragraph`, saved in
`pass-77/known-fixes-5ee0be2f9b7d-output/attempt-1.json`. Playwright also
reported trace-copy `ENOENT` teardown noise after the semantic failure was
captured.

Pass 77 reran origin checks. `git blame origin/trunk -L 424,630` still points
the left/right sweep and positional update/delete/insert path to
`84019935998c16f877e976ad85e84748355d7282` / PR #72262, with later commits
including `128a3c29b7f1db4f35faf9e326dd1e5e7ac11104` adding final-state
coverage but not the Yjs record-identity or pure-move event-shape invariant.

`npm run build` still fails locally after `build:js` and `build:php` both exit
0, in `packages/theme/bin/generate-primitive-tokens`, with
`TypeError: [object Object] is not a valid color space`. The failure is the
same symlinked-`node_modules` source/dependency mismatch recorded in pass 76
and is outside the RTC fix files.

Pass 78 independently re-read the pass-77 summary, source result row, source
natural-user spec, failure log, source screenshots, Playwright error-context,
current fix, and branch metadata. The source screenshots and normalized
failure state still show two populated editor block trees after the final
toolbar move, with primary `inserted, displaced sibling, moved paragraph` and
collaborator `inserted, moved paragraph, moved paragraph`. This remains a
semantic RTC convergence failure, not a readiness wait, locator miss, malformed
spec, environment issue, or inverted assertion.

Pass 78 reran a fresh browserless test-only negative proof in a new worktree at
`/private/tmp/gutenberg-5ee0-pass78-testonly.eoCTRq`, detached at
`e5dbdea02c5e2716bf2f906be4f64d8d59553011`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
```

Results: the post-sync repro failed `3/3` with nested `YMap`/`YText` event
targets, and the direct helper repro failed `3/3`. The captured moved record
again contained the displaced sibling paragraph. This is pass 78's independent
below-Playwright reproduction route and root-cause confirmation.

Pass 78 fixed-branch verification on PR branch head `66464e72726`, based on
`origin/trunk` `369e71ec725855b95d11b46174aef436fa7f75c8`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-sync unit tests passed (`3 passed`), focused direct block tests
passed (`3 passed, 71 skipped`), targeted JS lint passed, `git diff --check`
produced no output, and the natural-user Playwright repro passed headlessly in
`20.2s` after rebuilding JS assets. The first pass-78 Playwright attempt
timed out waiting for the collaborators-list readiness control before any
scenario actions; after `npm run build` refreshed JS and PHP assets, the same
command passed. The full build still exits 1 later in the known local
`colorjs.io` primitive token generation failure, after `build:js` and
`build:php` exit 0.

Pass 78 reconfirmed the known-fixes base on port `9903`:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20418 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-78/known-fixes-5ee0be2f9b7d-output npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed after the natural editor actions with primary
`inserted, displaced sibling, moved paragraph` and collaborator
`inserted, moved paragraph, moved paragraph`, saved in
`pass-78/known-fixes-5ee0be2f9b7d-output/attempt-1.json`.

Pass 78 also verified the branch contract: the PR branch still has exactly the
requested three commits (`e5dbdea02c5`, `817cf8df335`, `66464e72726`), with
commit 1 containing non-Playwright repros, commit 2 containing the Playwright
natural-user repro, and commit 3 containing the fix.

Pass 79 independently re-read the pass-78 summary, source result row, generated
natural-user spec, source failure log, Playwright error-context snapshot,
branch metadata, fix code, repro tests, and origin blame/log output. The source
failure still reaches the convergence assertion after normal editor actions;
the two editor states are populated and semantically split, so this is still
not a readiness wait, locator miss, malformed generated spec, environment
failure, or inverted assertion.

Pass 79 adds a fresh below-browser proof in a new detached worktree:

```text
/private/tmp/gutenberg-5ee0-pass79-testonly.oNSBjd
```

That worktree is detached at the test-only repro commit
`e5dbdea02c5e2716bf2f906be4f64d8d59553011`, before the fix commit. The
post-sync entrypoint repro fails `3/3`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
```

Results:

```text
represents adjacent pure block moves:       ["YMap","YText","YMap","YText"]
applies adjacent pure block moves remotely: ["YMap","YMap","YText","YText"]
generated structural edit sequence:         ["YMap","YMap","YText","YText"]
```

The direct helper repro also fails `3/3`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
```

The first direct failure is the narrowest pass-79 root-cause proof: the
captured `moved-block` `Y.Map` contains the displaced sibling paragraph after
the merge. The other two failures show nested `YMap`/`YText` event targets for
pure moves. This proves the defect is positional Yjs record rewriting, below
Playwright and below the editor UI.

Pass 79 reconfirmed the known-fixes base on port `9903`:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20418 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-79/known-fixes-5ee0be2f9b7d-output npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `43.2s` with primary
`inserted, displaced sibling, moved paragraph` and collaborator
`inserted, moved paragraph, moved paragraph`, saved in
`pass-79/known-fixes-5ee0be2f9b7d-output/attempt-1.json`.

Pass 79 fixed-branch verification on PR branch head `66464e72726`, based on
`origin/trunk` `369e71ec725855b95d11b46174aef436fa7f75c8`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-sync unit tests passed (`3 passed`), focused direct block tests
passed (`3 passed, 71 skipped`), the full `crdt-blocks` file passed
(`74 passed`), targeted JS lint passed, `git diff --check` produced no output,
and the natural-user Playwright repro passed headlessly in `22.5s`
(`24.7s` wall time).

`npm run build` was rerun in pass 79. `build:js` and `build:php` both exited
0, then the full build exited 1 in the same unrelated local
`packages/theme/bin/generate-primitive-tokens` / `colorjs.io` failure:
`TypeError: [object Object] is not a valid color space`. The refreshed JS/PHP
artifacts were sufficient for the fixed Playwright repro above.

Pass 79 also verified the existing annotated headless video artifact and copied
it to the pass-79 directory:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-79/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass79-verified-pass78-annotated.mp4
```

Video verification: H.264, `1920x1080`, `32.000000s`, `800` frames,
SHA-256 `6da5f8880e00e6e1d45357b244862f80427bfc551f3c78424f047c8a8289c723`;
`ffmpeg -v error -i ... -f null -` exited 0. The extracted 16s frame shows
both editor screens, expected and observed orders, and the action log. This is
a verified pass-79 copy of the existing annotated headless video, not a newly
rendered video.

Pass 79 rechecked the origin chain. `git show` still identifies
`84019935998c16f877e976ad85e84748355d7282` / PR #72262 as the introduction of
`mergeCrdtBlocks()` and the left/right positional update path. `git log
--ancestry-path 84019935998c16f877e976ad85e84748355d7282..origin/trunk --
packages/core-data/src/utils/crdt-blocks.ts` shows later RTC changes,
including `128a3c29b7f1db4f35faf9e326dd1e5e7ac11104` / PR #75923, but none
adds a Yjs record-identity or pure-move event-shape invariant before this fix.
The local environment does not have `gh`, so pass 79 used local commit metadata
instead of GitHub CLI metadata.

Pass 80 adds a broader browserless repro to the first PR-branch commit. In
addition to the adjacent and generated-sequence cases, the post-sync test now
enumerates all 23 non-identity permutations of a four-block top-level list and
requires each pure reorder to replicate as one top-level `Y.Array` structural
change with no nested `YMap` or `YText` record rewrites.

The same new test was applied to a fresh pre-fix/test-only worktree:

```text
/private/tmp/gutenberg-5ee0-pass80-testonly.BKxewA
```

That worktree was detached at
`e5dbdea02c5e2716bf2f906be4f64d8d59553011`, with the pass-80 permutation test
applied locally. The post-sync file failed `4/4`; the new all-permutations
case failed on nested remote event targets:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

On the fixed PR branch, the same post-sync file passed `4/4`, including the
new all-permutations invariant. The PR branch was rewritten to keep the
requested three-commit order:

```text
df8cd83e1ef Add CRDT repros for RTC adjacent move identity rewrite
640c986904a Add RTC top-level move Playwright repro
2dfa7efa125 Avoid rewriting CRDT block records for pure moves
```

Pass 80 fixed-branch verification, based on `origin/trunk`
`369e71ec725855b95d11b46174aef436fa7f75c8`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-sync tests passed (`4 passed`), focused direct block tests
passed (`3 passed, 71 skipped`), the full `crdt-blocks` file passed
(`74 passed`), targeted JS lint passed, `git diff --check` produced no output,
and the natural-user Playwright repro passed headlessly in `22.4s`
(`25.4s` wall time).

`npm run build` was rerun. `build:js` and `build:php` both exited 0, then the
full build exited 1 in the same unrelated
`packages/theme/bin/generate-primitive-tokens` / `colorjs.io` failure:
`TypeError: [object Object] is not a valid color space`.

Pass 80 reconfirmed the known-fixes base on port `9903`:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20418 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-80/known-fixes-5ee0be2f9b7d-output npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `43.2s` with the same semantic split as the source row:
primary `inserted, displaced sibling, moved paragraph`; collaborator
`inserted, moved paragraph, moved paragraph`, saved in
`pass-80/known-fixes-5ee0be2f9b7d-output/attempt-1.json`.

Pass 80 also refreshed GitHub PR metadata through the GitHub connector. PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262) was merged at
`2025-10-14T17:38:19Z` with merge commit
`84019935998c16f877e976ad85e84748355d7282` and explicitly introduced recursive
post block CRDT merge logic. PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923) was merged at
`2026-02-25T22:17:47Z` with merge commit
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104`; it expanded
`mergeCrdtBlocks()` edge-case tests, but still did not assert pure-reorder
event shape or Yjs record identity.

Pass 81 independently verified that the existing branch, fix, and video
standard still satisfy the requested bar. `origin/trunk` was fetched and
remained `369e71ec725855b95d11b46174aef436fa7f75c8`; the PR branch was still
exactly three commits on top:

```text
df8cd83e1ef Add CRDT repros for RTC adjacent move identity rewrite
640c986904a Add RTC top-level move Playwright repro
2dfa7efa125 Avoid rewriting CRDT block records for pure moves
```

Pass 81 re-read the archived source trace directly. The trace stack shows the
normal user-action route through `deleteSelectedBlock()`,
`insertParagraphBeforeSelected()`, and `moveSelectedBlockDown()`, followed by
`waitForConvergence()`. The final trace snapshots and error context show a
loaded editor and the same semantic divergence, not a locator or readiness
failure.

Pass 81 verification on the fixed branch:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
npm run build
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-sync tests passed (`4 passed`), focused direct block tests
passed (`3 passed, 71 skipped`), the full `crdt-blocks` file passed
(`74 passed`), targeted JS lint passed, and `git diff --check` produced no
output. `npm run build` again completed `build:js` and `build:php`, then failed
in the same unrelated primitive-token color-space generator. After that JS/PHP
asset refresh, the fixed natural-user Playwright repro passed in `19.5s`
(`21.2s` wall time). A first browser run before rebuilding failed at initial
collaboration readiness; it did not exercise the bug and was treated as an
environment/build-staleness signal, not as product evidence.

Pass 81 reran the pre-fix post-sync proof in the test-only worktree
`/private/tmp/gutenberg-5ee0-pass80-testonly.BKxewA` at
`e5dbdea02c5e2716bf2f906be4f64d8d59553011`. It failed `4/4` below Playwright
with nested `YMap`/`YText` remote event targets, including the generated
structural edit sequence:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

Pass 81 reconfirmed the known-fixes base on port `9903`:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20418 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-81/known-fixes-5ee0be2f9b7d-output npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `43.2s` with primary `inserted, displaced sibling, moved
paragraph`; collaborator `inserted, moved paragraph, moved paragraph`, saved in
`pass-81/known-fixes-5ee0be2f9b7d-output/attempt-1.json`.

Pass 81 also rendered a new pass-specific stitched headless video from the
archived headless screenshots, with both editor screens, expected/observed
orders, action log, and command results visible:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-81/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass81-annotated.mp4
```

Video verification: H.264, `1920x1080`, `32.000000s`, `800` frames,
SHA-256 `7ee7b4a5a98983e31dca2c66b2a3fc764208e5e6110e47461da04181099c2fe5`;
`ffmpeg -v error -i ... -f null -` exited 0, and the extracted 16s frame was
visually inspected.

Pass 82 independently re-read the pass-81 summary, the source result row,
the generated natural-user spec, source failure log, error-context snapshot,
trace archive, current fix, current tests, branch metadata, origin history,
and GitHub metadata for PRs #72262 and #75923. The classification is unchanged:
this is a product CRDT reconciliation bug, not a readiness wait, locator error,
malformed generated spec, environment failure, inverted assertion, or expected
behavior.

Pass 82 adds a compact trace-action proof from the archived Playwright trace.
The parsed trace records successful calls for the normal user route:

```text
primary click Seed heading -> Options -> Delete
collaborator click Emoji paragraph -> Options -> Add before -> type inserted paragraph
primary click Emoji paragraph -> toolbar Move down
final waitForConvergence polling reports the semantic split
```

The same trace stack then stays in `waitForConvergence()` and repeatedly reads
both editor states. That independently narrows the source artifact away from a
locator or action-readiness failure.

Pass 82 also created a fresh test-only worktree at the first PR-branch commit,
before the fix:

```text
/private/tmp/gutenberg-5ee0-pass82-testonly.6c1EgF
df8cd83e1ef Add CRDT repros for RTC adjacent move identity rewrite
```

The below-browser post-sync proof failed `4/4`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
```

Observed nested event targets:

```text
adjacent local move:        ["YMap", "YText", "YMap", "YText"]
adjacent remote move:       ["YMap", "YMap", "YText", "YText"]
all four-block permutations:["YMap", "YMap", "YText", "YText"]
generated edit sequence:    ["YMap", "YMap", "YText", "YText"]
```

The direct block-helper proof failed `3/3`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
```

The narrowest failure is still the captured moved `Y.Map` being rewritten to
the displaced sibling paragraph:

```text
Expected moved record content: "Emoji and multibyte: ..."
Observed moved record content: "Another paragraph exists so the top-level list is not degenerate."
```

Pass 82 fixed-branch verification on `2dfa7efa125`, still based on
`origin/trunk` `369e71ec725855b95d11b46174aef436fa7f75c8`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
npm run build
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-sync tests passed (`4 passed`), focused direct block tests
passed (`3 passed, 71 skipped`), full `crdt-blocks` passed (`74 passed`),
targeted JS lint passed, `git diff --check` produced no output, and the
natural-user Playwright repro passed headlessly in `20.1s`. `npm run build`
again completed `build:js` and `build:php`, then exited 1 in the same unrelated
`packages/theme/bin/generate-primitive-tokens` / `colorjs.io` failure:
`TypeError: [object Object] is not a valid color space`.

Pass 82 reconfirmed the known-fixes base on port `9903`:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20418 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-82/known-fixes-5ee0be2f9b7d-output npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `43.9s` with the same product divergence as the source row:
primary `inserted, displaced sibling, moved paragraph`; collaborator
`inserted, moved paragraph, moved paragraph`. The normalized states were saved
in `pass-82/known-fixes-5ee0be2f9b7d-output/attempt-1.json`.

Pass 82 rendered a fresh annotated stitched headless video from the pass-82
known-fixes screenshots:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-82/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass82-annotated.mp4
```

Video verification: H.264, `1920x1080`, `32.000000s`, `800` frames,
SHA-256 `eee771a841b43907b4533740ba3543044c590fb3a224b0032641d6d83e8708b7`;
`ffmpeg -v error -i ... -f null -` exited 0, and the extracted 16s frame shows
both editor screens, expected/observed orders, action log, and pass-82 command
results.

Pass 83 independently re-read the pass-82 summary, source result row, generated
natural-user spec, source failure log, error-context snapshot, source
screenshots, archived trace, current fix/tests, branch metadata, and origin
history. The classification remains unchanged: the source run reached the final
convergence assertion after ordinary editor actions, and the loaded editor
showed a semantic state split rather than a locator, readiness, malformed spec,
environment, inverted assertion, or expected-behavior failure.

Pass 83 adds a fresh trace-action check and a fresh pre-fix/test-only proof. The
trace parse shows successful `Delete`, `Add before`, keyboard typing of the
inserted paragraph, and toolbar `Move down` actions before final convergence
polling. A new detached test-only worktree was created at the first PR-branch
commit, before the fix:

```text
/private/tmp/gutenberg-5ee0-pass83-testonly.UQvY1n
df8cd83e1ef Add CRDT repros for RTC adjacent move identity rewrite
```

The direct block-helper proof failed `3/3` before the fix:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
```

The narrowest failure again proves positional record morphing: the captured
`moved-block` `Y.Map` contains the displaced sibling paragraph after the merge.
The event-shape failures show nested `YMap` and `YText` targets for pure moves.

The post-sync entrypoint proof also failed `4/4` before the fix:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
```

Observed nested event targets included:

```text
adjacent local move:         ["YMap", "YText", "YMap", "YText"]
adjacent remote move:        ["YMap", "YMap", "YText", "YText"]
all four-block permutations: ["YMap", "YMap", "YText", "YText"]
generated edit sequence:     ["YMap", "YMap", "YText", "YText"]
```

Pass 83 reconfirmed the known-fixes base on port `9903`:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20428 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-83/known-fixes-5ee0be2f9b7d-output npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `43.6s` with the same product divergence as the source row:
primary `inserted, displaced sibling, moved paragraph`; collaborator
`inserted, moved paragraph, moved paragraph`. The normalized states were saved
in `pass-83/known-fixes-5ee0be2f9b7d-output/attempt-1.json`.

Pass 83 fixed-branch verification on `2dfa7efa125`, still based on
`origin/trunk` `369e71ec725855b95d11b46174aef436fa7f75c8`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
npm run build
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-sync tests passed (`4 passed`), focused direct block tests passed
(`3 passed, 71 skipped`), full `crdt-blocks` passed (`74 passed`), targeted JS
lint passed, `git diff --check` produced no output, and the natural-user
Playwright repro passed headlessly in `20.1s` after rebuilding branch assets.
The first fixed-branch Playwright attempt before rebuilding timed out waiting
for the collaborators button and did not exercise the bug; it was treated as an
environment/build-staleness signal. `npm run build` completed `build:js` and
`build:php`, then exited 1 in the same unrelated
`packages/theme/bin/generate-primitive-tokens` / `colorjs.io` failure:
`TypeError: [object Object] is not a valid color space`.

Pass 83 refreshed origin metadata. PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262) was merged at
`2025-10-14T17:38:19Z` with merge commit
`84019935998c16f877e976ad85e84748355d7282` and introduced recursive
post-specific CRDT block merge logic. PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923) was merged at
`2026-02-25T22:17:47Z` with merge commit
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104`; it expanded
`mergeCrdtBlocks()` edge-case tests but still did not assert pure-reorder
event shape or Yjs record identity.

Pass 83 rendered a fresh annotated stitched headless video from the pass-83
known-fixes screenshots:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-83/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass83-annotated.mp4
```

Video verification: H.264, `1920x1080`, `32.000000s`, `800` frames,
SHA-256 `f0f337242aa2ac4deff84cd71f45f03bec04b02e07a3b560c1d91291330e28f8`;
`ffmpeg -v error -i ... -f null -` exited 0, and the extracted 16s frame shows
both editor screens, expected/observed orders, action log, command results, and
the fix strategy.

Pass 84 independently re-read the pass-83 summary, source manifest row, source
log, generated spec, error-context snapshot, current trace/screenshots,
branch commits, fix code, tests, and origin metadata. The classification is
unchanged: the source run and fresh pass-84 reruns reached final convergence
after ordinary editor actions and observed a semantic split, not a readiness,
locator, malformed-spec, environment, inverted-assertion, or expected-behavior
failure.

Pass 84 added two pieces of new evidence. First, it tested the existing PR
branch's Playwright repro at the no-fix plain-trunk prefix
`640c986904a`. After refreshing JS/PHP assets, that repro passed in `20.0s`;
after tightening the oracle to the fuzzer-style normalized post state, it still
passed in `20.5s`. The repro commit was kept because it is a natural-user
regression check on the fixed branch, but pass 84 records that it is not a
negative control on plain `origin/trunk`. The actual generated source spec was
therefore rerun on the known-fixes base, where it failed in `43.3s` and again
after restoration in `43.4s` with primary `inserted, displaced sibling, moved`
and collaborator `inserted, moved, moved`.

Second, pass 84 applied the same strict pure-reorder guard as a local throwaway
patch to the known-fixes base, rebuilt with `npm run build -- --skip-types`,
and reran the generated source spec. That exact source repro passed in `25.5s`
with both pages converged to `inserted, displaced sibling, moved`. The local
probe patch was saved under pass-84 logs, reverted from the known-fixes source
tree, and the known-fixes assets were rebuilt from the restored source. The
restored generated spec failed again, confirming that the pure-reorder guard
fixes the actual known-fixes product failure and that the checkout was not left
with fixed bundles.

Pass 84 rewrote the PR branch to keep the requested three-commit order while
tightening the Playwright repro's oracle:

```text
df8cd83e1ef Add CRDT repros for RTC adjacent move identity rewrite
b829e91ae66 Add RTC top-level move Playwright repro
d4fbb35b220 Avoid rewriting CRDT block records for pure moves
```

The branch is still based on `origin/trunk`
`369e71ec725855b95d11b46174aef436fa7f75c8`.

Pass 84 fixed-branch verification:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
npm run build -- --skip-types
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: focused direct block tests passed (`3 passed, 71 skipped`),
post-sync tests passed (`4 passed`), full `crdt-blocks` passed (`74 passed`),
targeted JS lint passed, and `git diff --check` produced no output. The fixed
natural-user Playwright check passed headlessly in `21.0s`. The build command
completed `build:js` and `build:php`, then exited 1 in the same unrelated
`packages/theme/bin/generate-primitive-tokens` / `colorjs.io` failure:
`TypeError: [object Object] is not a valid color space`.

Pass 84 refreshed origin metadata. `git blame origin/trunk -L 400,620 --
packages/core-data/src/utils/crdt-blocks.ts` still points the left/right sweep
and positional update loop to `84019935998c16f877e976ad85e84748355d7282`,
PR [#72262](https://github.com/WordPress/gutenberg/pull/72262), merged on
`2025-10-14T17:38:19Z`. GitHub metadata for #72262 says it introduced
recursive post-specific CRDT block merge logic to isolate atomic block changes.
PR [#75923](https://github.com/WordPress/gutenberg/pull/75923), merged on
`2026-02-25T22:17:47Z`, added `mergeCrdtBlocks()` edge-case tests but did not
assert pure-reorder Yjs record identity or event shape.

Pass 84 rendered a fresh annotated stitched headless video from the pass-84
known-fixes failure screenshots:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-84/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass84-annotated.mp4
```

Video verification: H.264, `1920x1080`, `32.000000s`, `800` frames,
SHA-256 `490affeafd4f8b233951bce728a9fbcb926593a7c9f90f53b2058085ec5a523e`;
`ffmpeg -v error -i ... -f null -` exited 0, and the extracted 16s frame shows
both editor screens, expected/observed orders, action log, pass-84 new
evidence, and verification results.

Pass 85 independently rechecked the source result, failure log, generated spec,
error-context snapshot, screenshots, current PR branch commits, fix code, tests,
and origin history. The classification remains a product CRDT reconciliation
bug: the source and pass-85 known-fixes rerun both reached the final convergence
wait after ordinary editor actions and split into primary `inserted, displaced
sibling, moved` versus collaborator `inserted, moved, moved`.

Pass 85's added value is a fresh verification that the existing branch, fix, and
video standard still satisfy the requested bar. A detached no-fix worktree at
commit `df8cd83e1ef` reran the commit-1 repros before the fix:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
```

Results: the post entrypoint failed `4/4`, with nested `YMap`/`YText` edits for
a pure move. The direct helper failed `3/3`; the record-identity test showed the
original moved `Y.Map` being rewritten into the displaced sibling paragraph,
and the event-shape tests showed nested non-array targets instead of one
structural `Y.Array` change.

Pass 85 fixed-branch verification on `d4fbb35b220`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check HEAD~3..HEAD
npm run build -- --skip-types
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-sync repros passed `4/4`, focused direct repros passed `3/3`,
full `crdt-blocks` passed `74/74`, targeted JS lint passed, and `git diff
--check` produced no output. `npm run build -- --skip-types` completed
`build:js` and `build:php`, then exited 1 in the known unrelated primitive
color-token generation failure, so the browser bundles were refreshed. The
natural-user Playwright repro then passed headlessly in `20.4s`.

Pass 85 also reran the original generated source spec against the known-fixes
refresh base:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20428 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-85/known-fixes-5ee0be2f9b7d-output npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `43.5s` with the same non-converged state. The first attempt
to start the stopped known-fixes wp-env hit Docker's existing address-pool
exhaustion; the run used the already-running known-fixes test environment on
port `9903`.

Pass 85 rendered and verified a new stitched headless video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-85/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass85-annotated.mp4
```

Video verification: H.264, `1920x1080`, `32.000000s`, `800` frames,
SHA-256 `1bf2723fc6a3f298b15d1d142fe6d00e15563d82ed6250575e8d57d0479b7805`;
`ffmpeg -v error -i ... -f null -` exited 0, and the extracted 16s frame shows
both editor screens, the natural action sequence, the known-fixes bad state,
the no-fix unit control, and the fixed-branch verification results.

Pass 86 rebased both the explanation branch and the PR branch onto current
`origin/trunk` `4425c07cbc7`, removing the previous incidental trunk delta from
the PR diff. The requested PR commit order is preserved:

```text
febfecced30 Add CRDT repros for RTC adjacent move identity rewrite
27e76aff3c1 Add RTC top-level move Playwright repro
b3200984b33 Avoid rewriting CRDT block records for pure moves
```

Pass 86 reran the rebased commit-1 no-fix controls before the fix. The post
CRDT entrypoint failed `4/4`; the direct helper tests failed `3/3`. The direct
record-identity assertion again showed the original moved `Y.Map` being
rewritten into the displaced sibling, and the event-shape assertions again
reported nested `YMap`/`YText` updates instead of one top-level structural
`Y.Array` change:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
```

Pass 86 fixed-branch verification on `b3200984b33`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check HEAD~3..HEAD
npm run build -- --skip-types
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-sync tests passed `4/4`, focused direct tests passed `3/3`, full
`crdt-blocks` passed `74/74`, targeted JS lint passed, `git diff --check`
produced no output, and the natural-user Playwright repro passed headlessly in
`21.0s`. `npm run build -- --skip-types` completed `build:js` and `build:php`,
then failed in the same unrelated primitive color-token generation error:
`TypeError: [object Object] is not a valid color space`.

Pass 86 also reran the original generated source spec against the known-fixes
refresh base:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20428 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-86/known-fixes-5ee0be2f9b7d-output npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `43.7s` with the same split as the source run: primary
`inserted, displaced sibling, moved paragraph`; collaborator `inserted, moved
paragraph, moved paragraph`. The non-test known-fixes wp-env instance was
stopped; starting it first hit Docker address-pool exhaustion, then port `9903`
was already allocated by the already-running known-fixes Playwright test
environment. The generated e2e was therefore run against that existing test
environment on `9903`.

Pass 86 rendered and verified a new annotated stitched headless video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-86/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass86-annotated.mp4
```

Video verification: H.264, `1920x1080`, `32.000000s`, `800` frames,
SHA-256 `af510c85dc37cda6ee059da92038dc2d69d31b8c138824bcdb6d08659b374b97`;
`ffmpeg -v error -i ... -f null -` exited 0, and the inspected frame shows
both failing editor screens, the natural action sequence, the known-fixes bad
state, the rebased no-fix lower-level failures, and the rebased fixed-branch
verification results.

Pass 87 independently verified that the existing branch, video standard, and
fix still satisfy the requested bar on the same current `origin/trunk`
`4425c07cbc7`. The source result row, source log, generated spec,
error-context snapshot, trace inventory, and pass-87 known-fixes rerun all point
to the same product split after ordinary editor actions, not to readiness,
locator, malformed-spec, environment, inverted-assertion, or expected-behavior
failure.

The PR branch still has the requested commit order:

```text
febfecced30 Add CRDT repros for RTC adjacent move identity rewrite
27e76aff3c1 Add RTC top-level move Playwright repro
b3200984b33 Avoid rewriting CRDT block records for pure moves
```

Pass 87 reran a fresh detached commit-1 no-fix worktree at `febfecced30`.
The post CRDT entrypoint failed `4/4`, and the direct helper tests failed
`3/3`. The direct helper again showed record morphing: the captured moved
`Y.Map` contains the displaced sibling content on the old path. The event-shape
checks again reported nested `YMap`/`YText` updates instead of one top-level
structural `Y.Array` change.

Pass 87 fixed-branch verification on `b3200984b33`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check HEAD~3..HEAD
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
npm run build -- --skip-types
```

Results: post-sync tests passed `4/4`, focused direct tests passed `3/3`, full
`crdt-blocks` passed `74/74`, targeted JS lint passed, `git diff --check`
produced no output, and the natural-user Playwright repro passed headlessly in
`21.5s`. The build command completed `build:js` and `build:php`, then failed
in the same unrelated primitive color-token generation error:
`TypeError: [object Object] is not a valid color space`.

Pass 87 reconfirmed the known-fixes base with the original generated source
spec:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20428 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-87/known-fixes-5ee0be2f9b7d-output npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `43.9s` with primary `inserted, displaced sibling, moved
paragraph` and collaborator `inserted, moved paragraph, moved paragraph`.
Starting the non-test known-fixes wp-env first hit Docker address-pool
exhaustion, then port `9903` was already allocated by the running known-fixes
Playwright test environment, so the control used that existing environment.

Pass 87 rendered and verified a fresh annotated stitched headless video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-87/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass87-annotated.mp4
```

Video verification: H.264, `1920x1080`, `32.000000s`, `800` frames,
SHA-256 `6a54599d3520e15d3c9e12104ecdc2b3934293c8aad0ee52880664c35f2dc6c5`;
`ffmpeg -v error -i ... -f null -` exited 0, and the inspected frame shows
both pass-87 failing editor screens, the natural action sequence, the observed
known-fixes split, the no-fix controls, the fixed-branch verification, and the
root-cause summary.

Pass 88 re-read the pass-87 summary, source row, original failure log,
generated spec, error-context snapshot, screenshots, trace inventory, current
fix/tests, and origin history. The source failure is still a non-timeout final
convergence failure after ordinary editor actions, not a locator/action failure
or malformed generated test:

```text
primary:      inserted paragraph, displaced sibling, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

Pass 88 adds a fresh narrower root-cause proof on a detached commit-1
worktree at `febfecced30`. Before the fix, the post CRDT entrypoint fails
`4/4`, and the direct helper tests fail `3/3`. Representative failures:

```text
Expected: []
Received: ["YMap", "YText", "YMap", "YText"]
```

and the direct record-identity assertion again shows the captured moved
`Y.Map` being rewritten into the displaced sibling. This keeps the defect below
Playwright: the old merge path represents a pure reorder as nested block-record
and rich-text rewrites instead of one top-level `Y.Array` structural change.

Pass 88 fixed-branch verification on `b3200984b33`, still based on
`origin/trunk` `4425c07cbc7`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check HEAD~3..HEAD
npm run build -- --skip-types
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-sync tests passed `4/4`, focused direct tests passed `3/3`, full
`crdt-blocks` passed `74/74`, targeted JS lint passed, and `git diff --check`
produced no output. `npm run build -- --skip-types` completed `build:js` and
`build:php`, then failed in the same unrelated primitive color-token generation
error, so the browser bundles were refreshed before the final Playwright run.
The first browser attempt in pass 88 failed before exercising the bug because
the collaborators UI never became visible; that run was classified as a
readiness/setup failure and was discarded as product evidence. After rebuilding
the branch bundles, the same natural-user Playwright repro passed headlessly in
`20.7s`.

Pass 88 reconfirmed that the known-fixes base does not fix this case. Starting
the stopped non-test known-fixes wp-env failed due to a Docker missing-container
dependency error, so the generated source spec was run against the existing
known-fixes Playwright test environment already listening on port `9903`:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20428 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-88/known-fixes-5ee0be2f9b7d-output npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `44.0s` after the final convergence wait with the same split
as the source run: primary `inserted, displaced sibling, moved paragraph`;
collaborator `inserted, moved paragraph, moved paragraph`.

Pass 89 independently re-read the pass-88 summary, source result row, source
log, generated natural-user spec, error-context snapshot, screenshots, trace
inventory, branch state, fix code, tests, and origin history. The classification
still holds: the source row is `result=failed`, `exitCode=1`, `timedOut=false`,
and the failure occurs after ordinary editor actions and a final convergence
wait. The final editor states are still:

```text
primary:      inserted paragraph, displaced sibling, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

That continues to rule out readiness waits, locator/action failures, malformed
generated specs, environment failures, inverted assertions, and expected
behavior.

Pass 89 added a fresh detached pre-fix control worktree at
`/private/tmp/gutenberg-5ee0-pass89-testonly.QpXDU4/repo`, checked out at
commit `febfecced30` before the product fix. The post CRDT entrypoint repros
failed `4/4`, and the direct helper repros failed `3/3`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
```

Representative pass-89 pre-fix failures:

```text
Expected: []
Received: ["YMap", "YText", "YMap", "YText"]
```

The direct helper also failed the captured-record invariant:

```text
Expected value: "Another paragraph exists so the top-level list is not degenerate."
Received array: [undefined, "Emoji and multibyte: hi ..., cafe, naive, ..."]
```

This proves again, below Playwright, that the old positional merge path morphs
the moved `Y.Map` into the adjacent sibling and emits nested CRDT record edits
for a pure move.

Pass 89 re-ran fixed-branch verification on PR branch `b3200984b33`, based on
`origin/trunk` `4425c07cbc7`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
git diff --check HEAD
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the post-sync tests passed `4/4`, the focused direct helper tests
passed `3/3`, the full `crdt-blocks` file passed `74/74`, targeted JS lint
passed, both diff checks produced no output, and the natural-user Playwright
repro passed in `21.7s`.

Build verification in pass 89 reproduced the known unrelated build problems.
`npm run build -- --skip-types` completed `build:js` and `build:php`, then
failed in `packages/theme/bin/generate-primitive-tokens` with:

```text
TypeError: [object Object] is not a valid color space
```

A narrower `wp-build` run rebuilt the `core-data` packages and
`build/scripts/core-data`, then failed while bundling unrelated packages because
`postcss-urlrebase`, `framer-motion`, `@emotion/css`, and `react-colorful`
could not be resolved. Pass 89 verified the rebuilt outputs contain the fix by
searching for `canReorderBlocksByClientId` in `build/scripts/core-data/index.js`,
`packages/core-data/build/utils/crdt-blocks.cjs`, and
`packages/core-data/build-module/utils/crdt-blocks.mjs`.

Pass 89 reconfirmed the known-fixes negative control. The known-fixes base is
`3cba2b1e56a98787de08dc6c7df2434759e8f908`, and
`git merge-base --is-ancestor b3200984b33a499c248c741fa49a6b54d5815ae8 HEAD`
exited `1`, so it does not include the fix. Starting the non-test known-fixes
wp-env on `9903` failed because port `9903` was already allocated by an
existing known-fixes Playwright test environment. Running the generated source
spec against that environment:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20428 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-89/known-fixes-5ee0be2f9b7d-output npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

failed in `43.4s` after the final convergence wait with the same product split:
primary `inserted, displaced sibling, moved paragraph`; collaborator
`inserted, moved paragraph, moved paragraph`.

Pass 89 refreshed the origin metadata using local git and the GitHub connector.
PR [#72262](https://github.com/WordPress/gutenberg/pull/72262) merged on
`2025-10-14T17:38:19Z` as
`84019935998c16f877e976ad85e84748355d7282` and introduced post-specific CRDT
block merge logic that recursively inspects `blocks` and represents data with
Y.js shared types. PR [#75923](https://github.com/WordPress/gutenberg/pull/75923)
merged on `2026-02-25T22:17:47Z` as
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104` and expanded
`mergeCrdtBlocks()` testing, but still did not assert Yjs record identity or
top-level event shape for pure reorders. `git blame origin/trunk -L 414,560`
continues to place the left/right sweep and positional update path in the
#72262 lineage, with later unrelated rich-text/type-safety changes layered on
top.

Pass 89 rendered and verified a fresh annotated stitched headless video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-89/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass89-annotated.mp4
```

Video verification: H.264, `1920x1080`, `32.000000s`, `800` frames, SHA-256
`2fd74c8c069d193dfd5cc3cd645be4e30e3bb3c0e3667ef8eaf9d82f5ca7ae01`;
`ffmpeg -v error -i ... -f null -` exited 0. The inspected frame shows both
failing editor screenshots, the natural action sequence, the observed
known-fixes split, the pass-89 no-fix controls, the fixed-branch verification,
and the build caveat.

Pass 90 refreshed the branches onto current `origin/trunk`
`ebc3c0a4663d79c5581bf2b94b68531349e96c48` and reran the controls. This pass
adds a freshness verification rather than just restating pass 89.

The rebased PR branch keeps the requested commit order:

```text
daab7613e91 Add CRDT repros for RTC adjacent move identity rewrite
dca2bafd302 Add RTC top-level move Playwright repro
56ab983a401 Avoid rewriting CRDT block records for pure moves
```

Pass 90 no-fix control used a fresh detached worktree at
`/private/tmp/gutenberg-5ee0-pass90-testonly.1nSbQp/repo`, checked out at the
rebased commit-1 repro-only revision `daab7613e91`. The post CRDT entrypoint
still failed `4/4`, and the direct helper tests still failed `3/3` before the
product fix:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
```

Representative failures still show nested CRDT record edits for a pure reorder:

```text
Expected: []
Received: ["YMap", "YText", "YMap", "YText"]
```

The direct helper also still proves record morphing: the captured moved
`Y.Map` contains the adjacent displaced paragraph after the old positional
merge path runs.

Pass 90 fixed-branch verification on `56ab983a401`, rebased onto
`origin/trunk` `ebc3c0a4663`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
git diff --check HEAD
rg -n "canReorderBlocksByClientId|handledReorder" build/scripts/core-data/index.js packages/core-data/build/utils/crdt-blocks.cjs packages/core-data/build-module/utils/crdt-blocks.mjs
npm run build -- --skip-types
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the post-sync tests passed `4/4`; the focused direct helper tests
passed `3/3`; the full `crdt-blocks` test file passed `74/74`; targeted JS
lint passed; both diff checks produced no output; the built `core-data`
artifacts contained `canReorderBlocksByClientId`; and the natural-user
Playwright repro passed headlessly in `21.3s`. The build command completed
`build:js` and `build:php`, then failed in the same unrelated primitive
color-token generator with `TypeError: [object Object] is not a valid color
space`.

Pass 90 reconfirmed the known-fixes base does not fix the bug. The non-test
known-fixes wp-env start hit Docker address-pool exhaustion, but Docker showed
the known-fixes Playwright test environment already serving WordPress on
`0.0.0.0:9903`. Running the original generated source spec against that
environment:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20428 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-90/known-fixes-5ee0be2f9b7d-output npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

failed in `45.8s` after the final convergence wait with the same product split:
primary `inserted, displaced sibling, moved paragraph`; collaborator
`inserted, moved paragraph, moved paragraph`.

Pass 90 refreshed the origin analysis. `git blame origin/trunk -L 390,570 --
packages/core-data/src/utils/crdt-blocks.ts` still places the left/right sweep,
changed-slice sizing, and positional update loop in the lineage of
`84019935998c16f877e976ad85e84748355d7282`, PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262), merged on
`2025-10-14T17:38:19Z`. The GitHub metadata for #72262 still says it
introduced post-specific CRDT logic that recursively inspects `blocks` and
represents data with Y.js shared types. PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923), merged as
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104` on `2026-02-25T22:17:47Z`,
expanded edge-case tests for `mergeCrdtBlocks()` but did not assert record
identity or top-level event shape for pure reorders.

Pass 90 rendered and verified a fresh annotated headless video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-90/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass90-annotated.mp4
```

Video verification: H.264, `1920x1080`, `32.000000s`, `800` frames, SHA-256
`22c9d8296c8ef3ccecbb1c4bcf7cf8454657c414731324c1189499dca3ceb200`;
`ffmpeg -v error -i ... -f null -` exited 0. The inspected frame shows the
source failing editor screenshots, the natural action sequence, the
known-fixes split, the rebased no-fix failures, and the rebased fixed-branch
verification.

Pass 91 independently re-read the pass-90 summary, source result row, source
log, generated natural-user spec, error-context snapshot, screenshots, trace
inventory, branch state, fix code, tests, and origin history. The bug remains
a product defect: the source row is still a completed non-timeout failure, the
actions are ordinary editor UI actions, and the final normalized post states
diverge after the final convergence wait.

Pass 91 added a stronger root-cause proof rather than only restating the prior
pass. A fresh detached no-fix control worktree was created at:

```text
/private/tmp/gutenberg-5ee0-pass91-testonly.RjBBDr/repo
```

It was checked out at the repro-only commit:

```text
daab7613e91 Add CRDT repros for RTC adjacent move identity rewrite
```

The post-level remote-sync tests failed before the fix:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --testNamePattern="replays the generated structural edit sequence|applies adjacent pure block moves" --runInBand
```

Result: failed `2/2`. Both failures saw nested remote CRDT record edits for a
pure block move:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

The direct helper tests also failed before the fix:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
```

Result: failed `3/3`. The captured-record invariant showed the original moved
`Y.Map` morphed into the adjacent displaced paragraph, and the event-shape
invariants saw nested `YMap`/`YText` edits instead of one top-level structural
array event.

Pass 91 fixed-branch verification on `56ab983a401`, still based on
`origin/trunk` `ebc3c0a4663d79c5581bf2b94b68531349e96c48`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --testNamePattern="replays the generated structural edit sequence|applies adjacent pure block moves|represents all pure block permutations" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: focused post-level tests passed `3/3`, including the stronger
all-permutations remote-sync proof; focused direct helper tests passed `3/3`;
the full `crdt-blocks` test file passed `74/74`; targeted JS lint passed;
`git diff --check` produced no output; and the natural-user Playwright repro
passed headlessly in `22.1s`.

Pass 91 also reran the known-fixes negative control below Playwright. The
known-fixes wp-env status was stopped, and start failed with Docker address
pool exhaustion:

```text
failed to create network ... all predefined address pools have been fully subnetted
```

To avoid destructive Docker network pruning, pass 91 created a fresh detached
known-fixes test-only worktree at:

```text
/private/tmp/gutenberg-5ee0-pass91-knownfix-testonly.zFpreq/repo
```

It was checked out at known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908`, then the repro-only commit
`daab7613e91` was cherry-picked without the fix. The known-fixes base failed
the same checks:

```bash
git cherry-pick --no-commit daab7613e91a68ee9e9ba2faab3aeff22eb970ce
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --testNamePattern="replays the generated structural edit sequence|applies adjacent pure block moves|represents all pure block permutations" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
```

Results: post-level tests failed `3/3` and direct helper tests failed `3/3`.
The all-permutations test is the pass-91 addition: it shows the known-fixes
base still represents pure permutations as nested record rewrites, not just the
one adjacent source case.

Pass 91 reran the origin analysis using local git and GitHub metadata. PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262) merged on
`2025-10-14T17:38:19Z` as
`84019935998c16f877e976ad85e84748355d7282`; its PR body says the work
introduced post-specific CRDT logic that recursively inspects `blocks` and
represents data with Y.js shared types. `git blame origin/trunk -L 414,580 --
packages/core-data/src/utils/crdt-blocks.ts` still places the left/right sweep,
changed-slice sizing, and positional update loop in that lineage, with later
rich-text cursor/type-safety changes layered on top. PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923) merged on
`2026-02-25T22:17:47Z` as
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104`; it expanded
`mergeCrdtBlocks()` tests but still did not assert Yjs record identity or
top-level event shape for pure reorders.

Pass 91 rendered and verified a fresh annotated headless video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-91/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass91-annotated.mp4
```

Video verification: H.264, `1920x1080`, `34.000000s`, `850` frames, SHA-256
`d2c52db3a129703088c27e0fcb464faa54d2dfcc76555fd92886706c1a0d9ef6`;
`ffmpeg -v error -i ... -f null -` exited 0. The inspected frame shows the
source failing editor screenshots, the natural action log, the fresh pass-91
no-fix control, the known-fixes unit negative control, the fixed-branch
verification, and the pass-91 permutation root-cause proof.

Pass 92 independently verified that the existing branch, fix, and video still
satisfy the requested standard. The PR branch remained at
`56ab983a401c10deacc1ef066f758b2ddb3a9943`, based on `origin/trunk`
`ebc3c0a4663d79c5581bf2b94b68531349e96c48`, with the requested three-commit
order:

```text
daab7613e91 Add CRDT repros for RTC adjacent move identity rewrite
dca2bafd302 Add RTC top-level move Playwright repro
56ab983a401 Avoid rewriting CRDT block records for pure moves
```

The fixed branch was rechecked with:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --testNamePattern="replays the generated structural edit sequence|applies adjacent pure block moves|represents all pure block permutations" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
npm run build -- --skip-types
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the post-level focused tests passed `3/3`, including the
all-permutations structural remote-change proof; the direct helper focused
tests passed `3/3`; the full `crdt-blocks` file passed `74/74`; targeted JS
lint passed; `git diff --check` produced no output; and the natural-user
Playwright repro passed headlessly in `20.7s` after refreshing generated
JavaScript assets. The build again completed `build:js` and `build:php`, then
failed in the unrelated primitive color-token generator with `TypeError:
[object Object] is not a valid color space`.

Pass 92 also reconfirmed the known-fixes base below Playwright in a fresh
detached worktree:

```text
/private/tmp/gutenberg-5ee0-pass92-knownfix-testonly.MmsFmx/repo
```

The worktree was checked out at known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908`, then the repro-only commit
`daab7613e91` was cherry-picked without the fix. The same focused commands
failed before the fix: post-level remote-sync failed `3/3`, and direct helper
tests failed `3/3`. The post-level failures observed nested remote event
targets `["YMap", "YMap", "YText", "YText"]`; the direct helper again showed
the original moved block record being rewritten into the adjacent displaced
paragraph.

The pass-91 annotated video was revalidated and copied into the pass-92
artifact directory as the verified video for this pass:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-92/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass92-verified-existing-annotated.mp4
```

Video verification: H.264, `1920x1080`, `34.000000s`, `850` frames, SHA-256
`d2c52db3a129703088c27e0fcb464faa54d2dfcc76555fd92886706c1a0d9ef6`;
`ffmpeg -v error -i ... -f null -` exited 0.

Pass 93 independently rechecked the source row, source log, error-context
snapshot, failed screenshots, trace inventory, fixed branch, known-fixes
negative control, origin blame, and video. The source failure remains a
completed non-timeout natural-action convergence failure: one editor ended at
`inserted, displaced sibling, moved paragraph`; the other ended at `inserted,
moved paragraph, moved paragraph`. The screenshots show those editor states,
so this is not a locator/action/readiness failure or an inverted assertion.

The fixed PR branch was unchanged from pass 92 and still has the requested
three-commit order on `origin/trunk`
`ebc3c0a4663d79c5581bf2b94b68531349e96c48`:

```text
daab7613e91 Add CRDT repros for RTC adjacent move identity rewrite
dca2bafd302 Add RTC top-level move Playwright repro
56ab983a401 Avoid rewriting CRDT block records for pure moves
```

Pass 93 reran the fixed branch checks:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
npm run build -- --skip-types
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-level tests passed `4/4`; focused direct helper tests passed
`3/3`; the full `crdt-blocks` file passed `74/74`; targeted JS lint passed;
`git diff --check` produced no output; and the natural-user Playwright repro
passed headlessly in `20.7s`. As in pass 92, `build:js` and `build:php`
completed, then the unrelated primitive color-token generator failed with
`TypeError: [object Object] is not a valid color space`. A Playwright attempt
before the build refresh timed out waiting for the collaboration presence
button before any bug action, matching the stale/generated-asset readiness
artifact observed previously; after the asset refresh, the same command passed.

Pass 93 also created a fresh detached known-fixes test-only worktree:

```text
/private/tmp/gutenberg-5ee0-pass93-knownfix-testonly.FfYgn1/repo
```

It was checked out at known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908`, then the repro-only commit
`daab7613e91` was cherry-picked without the fix. The known-fixes base still
failed below Playwright:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --testNamePattern="replays the generated structural edit sequence|applies adjacent pure block moves|represents all pure block permutations" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
```

Results: post-level tests failed `3/3` with nested remote event targets
`["YMap", "YMap", "YText", "YText"]`; direct helper tests failed `3/3`, and
the record-identity test showed the original moved block Y.Map being rewritten
into the displaced sibling. This is the pass-93 added proof: the same failure
is reproduced in a fresh known-fixes test-only worktree and remains below the
browser, at the CRDT event-shape and Y.Map identity layer.

Pass 93 revalidated and copied the existing annotated headless video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-93/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass93-verified-existing-annotated.mp4
```

Video verification: H.264, `1920x1080`, `34.000000s`, `850` frames, SHA-256
`d2c52db3a129703088c27e0fcb464faa54d2dfcc76555fd92886706c1a0d9ef6`;
`ffmpeg -v error -i ... -f null -` exited 0.

Pass 94 independently re-read the source result, source log, error-context
snapshot, failed screenshots, trace inventory, current PR branch, origin blame,
and GitHub PR metadata. The source failure is still a completed non-timeout
natural-action convergence failure, with the primary editor ending at
`inserted, displaced sibling, moved paragraph` and the collaborator editor
ending at `inserted, moved paragraph, moved paragraph`. The page snapshot and
screenshots show loaded editors with divergent block lists, not a readiness
wait, locator failure, malformed generated spec, environment failure, or
inverted assertion.

The fixed PR branch was unchanged from pass 93 and still has the requested
three-commit order on `origin/trunk`
`ebc3c0a4663d79c5581bf2b94b68531349e96c48`:

```text
daab7613e91 Add CRDT repros for RTC adjacent move identity rewrite
dca2bafd302 Add RTC top-level move Playwright repro
56ab983a401 Avoid rewriting CRDT block records for pure moves
```

Pass 94 added a fresh pre-fix proof on the test-only commit:

```text
/private/tmp/gutenberg-5ee0-pass94-testonly.Pxq5of/repo
```

That worktree was checked out at `daab7613e91`, before the fix. The
post-sync repro and direct helper repro were rerun:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
```

Results: post-level tests failed `4/4` before the fix with nested event targets
`["YMap", "YText", "YMap", "YText"]` and
`["YMap", "YMap", "YText", "YText"]`; the direct helper tests failed `3/3`.
The direct record-identity assertion again showed the captured `moved-block`
Y.Map being rewritten to the displaced sibling paragraph. This is a narrower
root-cause proof independent of Playwright and independent of previous
pass-93 temp worktrees.

Pass 94 also reconfirmed the known-fixes base in a fresh detached test-only
worktree:

```text
/private/tmp/gutenberg-5ee0-pass94-knownfix-testonly.38mTZq/repo
```

It was checked out at known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908`; the repro-only commit
`daab7613e91` was cherry-picked without the fix. The same two commands failed:
post-level tests failed `4/4`, and direct helper tests failed `3/3`, with the
same nested `YMap`/`YText` event targets and moved-record rewrite. A fresh
known-fixes browser rerun was attempted, but `wp-env start` first failed with
Docker address-pool exhaustion and then, with an explicit subnet, failed before
WordPress was available because port `9903` was already allocated. The original
source Playwright artifact remains the browser-level known-fixes failure for
this pass; the fresh known-fixes confirmation is the lower-level CRDT negative
control.

The fixed branch was rechecked with:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
npm run build -- --skip-types
./node_modules/.bin/wp-build
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-level tests passed `4/4`; focused direct helper tests passed
`3/3`; full `crdt-blocks` passed `74/74`; targeted JS lint passed; `git diff
--check` produced no output; and the natural-user Playwright repro passed
headlessly in `21.7s`. The root build again failed in the unrelated primitive
color-token generator after workspace `build:js` and `build:php` completed.
The direct `wp-build` then failed later on missing optional front-end
dependencies, but it successfully generated `build/scripts/core-data` with the
fixed pure-reorder guard before failing; that refreshed bundle was used by the
passing Playwright run.

Origin was rechecked locally and through the GitHub connector. PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262), merge commit
`84019935998c16f877e976ad85e84748355d7282`, introduced the post-specific CRDT
block merge logic on `2025-10-14T17:38:19Z`. PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923), merge commit
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104`, expanded tests on
`2026-02-25T22:17:47Z` but still did not assert pure-move record identity or
top-level Y.Array event shape. `git blame origin/trunk -L 414,580 --
packages/core-data/src/utils/crdt-blocks.ts` still places the vulnerable
left/right sweep and positional update loop in the #72262 lineage, with later
rich-text and cursor changes layered on top.

Pass 94 revalidated and copied the existing annotated headless video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-94/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass94-verified-existing-annotated.mp4
```

Video verification: H.264, `1920x1080`, `34.000000s`, `850` frames, SHA-256
`d2c52db3a129703088c27e0fcb464faa54d2dfcc76555fd92886706c1a0d9ef6`;
`ffmpeg -v error -i ... -f null -` exited 0.

Pass 95 independently rechecked the source artifacts and the existing branch
rather than changing the PR branch. The source trace action log confirms the
natural user route below, with no failed locator or readiness step before the
convergence assertion:

```text
primary:      click heading, Options > Delete
collaborator: click paragraph, Options > Add before, type inserted paragraph
primary:      click original paragraph, toolbar Move down
```

The failure payload and screenshots still show loaded editors with a semantic
state split: primary `inserted, displaced sibling, moved paragraph`;
collaborator `inserted, moved paragraph, moved paragraph`.

The fixed PR branch remains at:

```text
daab7613e91 Add CRDT repros for RTC adjacent move identity rewrite
dca2bafd302 Add RTC top-level move Playwright repro
56ab983a401 Avoid rewriting CRDT block records for pure moves
```

Pass 95 reran the fixed branch checks on `origin/trunk`
`ebc3c0a4663d79c5581bf2b94b68531349e96c48`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-level tests passed `4/4`; focused direct helper tests passed
`3/3`; full `crdt-blocks` passed `74/74`; targeted JS lint passed; `git diff
--check` produced no output; and the natural-user Playwright repro passed
headlessly in `23.2s`.

The pass-95 build command was also rerun:

```bash
npm run build -- --skip-types
```

Result: `build:js` and `build:php` exited `0`, then the build failed in the
unrelated theme primitive color-token generator with `TypeError: [object
Object] is not a valid color space`, matching the previous passes.

Pass 95 also reconfirmed the known-fixes base in a fresh detached test-only
worktree:

```text
/private/tmp/gutenberg-5ee0-pass95-knownfix-testonly.wddNu4/repo
```

It was checked out at known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908`; the repro-only commit
`daab7613e91` was cherry-picked without the fix. The same low-level commands
failed before the fix: post-level tests failed `4/4`, and direct helper tests
failed `3/3`, with nested `YMap`/`YText` event targets and the captured
`moved-block` Y.Map rewritten to the displaced sibling paragraph. This is a
fresh pass-95 verification that the known-fixes base does not contain the fix.

Origin was rechecked with `git blame`, `git log`, and `git show`. The
vulnerable left/right sweep and positional update loop still trace to PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262), merge commit
`84019935998c16f877e976ad85e84748355d7282`, with later rich-text and cursor
changes layered on top. PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923), merge commit
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104`, expanded tests but did not assert
pure-move Y.Map identity or top-level `Y.Array` event shape.

Pass 95 revalidated and copied the existing annotated headless video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-95/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass95-verified-existing-annotated.mp4
```

Video verification: H.264, `1920x1080`, `34.000000s`, `850` frames, SHA-256
`d2c52db3a129703088c27e0fcb464faa54d2dfcc76555fd92886706c1a0d9ef6`;
`ffmpeg -v error -i ... -f null -` exited 0.

Pass 96 added a fresh, narrower known-fixes root-cause proof on the same
`origin/trunk` base (`ebc3c0a4663d79c5581bf2b94b68531349e96c48`) rather than
only reusing the previous branch/video audit. A detached known-fixes worktree at
`/private/tmp/gutenberg-5ee0-pass96-knownfix-testonly.NF2NnZ/repo` checked out
`3cba2b1e56a98787de08dc6c7df2434759e8f908` and cherry-picked only the
repro-test commit `daab7613e91`. The focused post-entrypoint invariant failed
below Playwright:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern="replays the generated structural edit sequence|represents adjacent pure block moves"
```

Result: both focused tests failed. The old code emitted nested record updates
for a pure reorder:

```text
represents adjacent pure block moves:
Expected: []
Received: ["YMap", "YText", "YMap", "YText"]

replays the generated structural edit sequence:
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

Pass 96 also reran the archived natural-user Playwright route against the
known-fixes base on a fresh `wp-env` at `http://localhost:9923`:

```bash
RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-96/playwright-output/5ee0be2f9b7d WP_ENV_DOCKER_SUBNET=10.253.96.0/24 WP_ENV_PORT=9923 WP_ENV_PHPMYADMIN_PORT=9043 WP_BASE_URL=http://localhost:9923 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1 --output=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-96/playwright-artifacts/5ee0be2f9b7d
```

Result: failed in `43.1s` after the final convergence wait, with primary
`inserted, displaced sibling, moved paragraph` and collaborator
`inserted, moved paragraph, moved paragraph`.

The fixed PR branch passed the same proof and the broader verification:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern="replays the generated structural edit sequence|represents adjacent pure block moves"
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: focused post-entrypoint tests passed `2/2`; full
`crdt-post-block-move` passed `4/4`; focused direct helper tests passed `3/3`;
full `crdt-blocks` passed `74/74`; targeted JS lint passed; `git diff --check`
produced no output; and the natural-user Playwright repro passed headlessly in
`19.7s`.

Pass 97 added a new independent non-Playwright repro route through
`applyPostChangesToCRDTDoc()` for nested child-block moves. This does not rely
on the browser route or on a direct call to `mergeCrdtBlocks()`: it creates a
single group block with three inner paragraph blocks, syncs it to a remote
Y.Doc, then reorders two adjacent inner blocks. The same product invariant
applies recursively: a pure child-block move should arrive at remote peers as a
structural child `Y.Array` change, not as nested `YMap`/`YText` rewrites.

The PR branch was rewritten to keep the requested three-commit order:

```text
ed0e1802810 Add CRDT repros for RTC adjacent move identity rewrite
a4fc196b357 Add RTC top-level move Playwright repro
414b4edfc52 Avoid rewriting CRDT block records for pure moves
```

Known-fixes base was reconfirmed in a fresh detached test-only worktree:

```text
/private/tmp/gutenberg-5ee0-pass97-knownfix-final-testonly.GGobkZ/repo
```

That worktree checked out known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908`, cherry-picked only the final
autosquashed repro-test commit `ed0e1802810`, and ran:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern="nested pure block moves"
```

Result: failed before the fix with nested remote event targets:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

The fixed PR branch passed the expanded coverage:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
npm run build -- --skip-types
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: full post-level CRDT repros passed `5/5`, including the new nested
child-block move route; focused direct helper tests passed `3/3`; full
`crdt-blocks` passed `74/74`; targeted JS lint passed; `git diff --check`
produced no output; and the natural-user Playwright repro passed headlessly in
`21.2s`. The first Playwright attempt in pass 97 failed before any bug action
while waiting for the collaborators-list button; after the build refresh, the
same command passed. The build again completed `build:js` and `build:php`, then
failed in the unrelated primitive color-token generator with `TypeError:
[object Object] is not a valid color space`.

Pass 98 independently rechecked the current branches and verified that the
existing PR branch, explanation branch, and annotated video still satisfy the
requested standard on `origin/trunk`
`ebc3c0a4663d79c5581bf2b94b68531349e96c48`.

The PR branch still has the requested three-commit order:

```text
ed0e1802810 Add CRDT repros for RTC adjacent move identity rewrite
a4fc196b357 Add RTC top-level move Playwright repro
414b4edfc52 Avoid rewriting CRDT block records for pure moves
```

Known-fixes base was reconfirmed in a fresh detached test-only worktree:

```text
/private/tmp/gutenberg-5ee0-pass98-knownfix-testonly.ew76Tt/repo
```

That worktree checked out known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908`, cherry-picked only the
repro-test commit `ed0e1802810`, and ran:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern="replays the generated structural edit sequence as a structural remote move|applies nested pure block moves"
```

Result: failed `2/2` before the fix. Both the nested child-block proof and the
generated structural edit proof emitted nested remote event targets:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

That is pass 98's narrower root-cause confirmation: the same positional
record/text rewrite occurs through the real post CRDT entrypoint for both the
browser-derived sequence and a recursively nested child-block move. It is below
Playwright and does not depend on a locator, wait, or final assertion wording.

The fixed PR branch passed the same coverage and the broader checks:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: full post-entrypoint repros passed `5/5`; focused direct helper tests
passed `3/3`; full `crdt-blocks` passed `74/74`; targeted JS lint passed;
`git diff --check` produced no output; and the natural-user Playwright repro
passed headlessly in `20.5s`. The first pass-98 Playwright attempt again failed
before any bug action while waiting for the collaborators-list button; after
rerunning `npm run build -- --skip-types`, the same command passed. The build
completed `build:js` and `build:php`, then failed in the unrelated theme
primitive color-token generator with `TypeError: [object Object] is not a valid
color space`.

Pass 98 also revalidated and copied the existing annotated headless video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-98/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass98-verified-existing-annotated.mp4
```

Video verification: H.264, `1920x1080`, `34.000000s`, `850` frames, SHA-256
`d2c52db3a129703088c27e0fcb464faa54d2dfcc76555fd92886706c1a0d9ef6`;
`ffmpeg -v error -i ... -f null -` exited 0.

Origin was rechecked in pass 98 with `git show`, `git blame`, and `git log`.
`84019935998c16f877e976ad85e84748355d7282` / PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262) created
`packages/core-data/src/utils/crdt-blocks.ts` and the left/right sweep over
post blocks. `128a3c29b7f1db4f35faf9e326dd1e5e7ac11104` / PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923) expanded
`mergeCrdtBlocks()` tests but still did not assert Y.Map identity or
top-level/child `Y.Array` event shape for strict pure moves.

Pass 99 adds an independent trace-level negative-classification check and a
broader known-fixes root-cause proof. The archived Playwright trace records the
natural editor actions directly:

```text
Click "Seed 950301 multibyte heading"
Click menuitem "Delete"
Click "Emoji and multibyte"
Click menuitem "Add before"
Type "RTC ec47 realistic inserted paragraph 1"
Click "Emoji and multibyte"
Click toolbar button "Move down"
```

After those actions, the trace shows repeated convergence polling returning the
same collaborator state with the inserted paragraph followed by two copies of
the moved paragraph. That rules out a malformed generated block tree, direct
state mutation, or a locator failure: the browser drove ordinary editor
controls and then observed a stable CRDT divergence.

Known-fixes base was reconfirmed in a fresh detached test-only worktree:

```text
/private/tmp/gutenberg-5ee0-pass99-knownfix-testonly.RtnvnC/repo
```

That worktree checked out known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908`, cherry-picked only the repro-test
commit `ed0e1802810`, and ran:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern="represents all pure block permutations|replays the generated structural edit sequence|applies nested pure block moves"
```

Result: failed `3/3` before the fix. The new pass-99 proof covers every
non-identity permutation of four paragraph blocks through
`applyPostChangesToCRDTDoc()`, in addition to the nested child-block route and
the browser-derived structural edit sequence. All three failures emitted nested
remote event targets:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

The fixed PR branch at `414b4edfc52895422963bf5e4d782e51d6ed585f` still has
the requested three-commit order and passed the same coverage:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: full post-entrypoint repros passed `5/5`; focused direct helper tests
passed `3/3`; full `crdt-blocks` passed `74/74`; targeted JS lint passed;
`git diff --check` produced no output; and the natural-user Playwright repro
passed headlessly in `21.6s`. `npm run build -- --skip-types` completed
`build:js` and `build:php`, then failed in the unrelated theme primitive
color-token generator with `TypeError: [object Object] is not a valid color
space`.

Pass 101 adds a narrower post-entrypoint object-morph proof. Commit 1 now
includes a test that drives the browser-derived structural sequence through
`applyPostChangesToCRDTDoc()`, captures the actual Y.Map records for the moved
and displaced paragraphs before the final move, and asserts that a pure move
does not rewrite either captured record into its adjacent sibling.

Before the fix, the new proof fails below Playwright on the current test-only
PR prefix `0036669570a`:

```bash
cd /private/tmp/gutenberg-5ee0-pass101-prefix.f271ZN/repo
git checkout --force --detach 0036669570a
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern="does not morph post-entrypoint"
```

Result: failed. The captured moved Y.Map contained the displaced paragraph:

```text
Expected value: "Another paragraph exists so the top-level list is not degenerate."
Received array: [undefined, "Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا."]
```

Known-fixes base was reconfirmed twice in pass 101. First, a detached
known-fixes worktree at `3cba2b1e56a98787de08dc6c7df2434759e8f908` cherry-picked
only the updated test commit `640be159381` and failed the focused
post-entrypoint proofs:

```bash
cd /private/tmp/gutenberg-5ee0-pass101-knownfix.frNGHb/repo
git cherry-pick --no-commit 640be159381
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern="does not morph post-entrypoint|replays the generated structural edit sequence|represents all pure block permutations"
```

Result: failed `3/3`. The permutation and browser-derived sequence emitted
nested remote `YMap`, `YMap`, `YText`, `YText` events, and the new morph proof
again showed the moved record rewritten to the displaced sibling.

Second, the original generated browser repro was rerun against the running
known-fixes base on port `9903`:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `42.5s` after the same normal user actions and the same 20s
convergence wait: primary `inserted, displaced sibling, moved paragraph`;
collaborator `inserted, moved paragraph, moved paragraph`.

The PR branch was rewritten to keep the requested three-commit order after the
new proof was folded into commit 1:

```text
640be159381 Add CRDT repros for RTC adjacent move identity rewrite
0036669570a Add RTC top-level move Playwright repro
b836fa3d436 Avoid rewriting CRDT block records for pure moves
```

Pass 101 fixed-branch verification on `b836fa3d436`, based on `origin/trunk`
`ebc3c0a4663d79c5581bf2b94b68531349e96c48`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
npm run build -- --skip-types
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-entrypoint repros passed `6/6`; full `crdt-blocks` passed
`74/74`; targeted JS lint passed; `git diff --check` produced no output; and
the natural-user Playwright repro passed headlessly in `20.3s`. The build
completed `build:js` and `build:php`, then failed in the unrelated theme
primitive color-token generator with `TypeError: [object Object] is not a valid
color space`.

Pass 101 also created a fresh annotated stitched video from the known-fixes
browser rerun screenshots:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-101/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass101-annotated.mp4
```

Video verification: H.264, `1920x1080`, `24.000000s`, `600` frames, SHA-256
`b2a869c64b768c8b33517825e2f96d71c46ca375b5c3d546dfcfe2dd8c47b314`;
`ffmpeg -v error -i ... -f null -` exited 0.

Pass 102 independently verified that the existing pass-101 PR branch, fix, and
video standard still satisfy the requested bar on `origin/trunk`
`ebc3c0a4663d79c5581bf2b94b68531349e96c48`. The pass re-read the source
manifest row, source log, error-context snapshot, screenshots, trace archive,
current tests, current fix, and origin history. The source failure is still a
completed non-timeout convergence failure after normal editor controls, not a
readiness wait, locator error, malformed spec, environment failure, direct state
mutation, inverted assertion, or expected behavior.

Pass 102's fresh pre-fix proof used the current test-only PR prefix
`0036669570a`:

```bash
tmp=$(mktemp -d /private/tmp/gutenberg-5ee0-pass102-prefix.XXXXXX)
git worktree add --detach "$tmp/repo" 0036669570a
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules "$tmp/repo/node_modules"
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/vendor "$tmp/repo/vendor"
cd /private/tmp/gutenberg-5ee0-pass102-prefix.8WXmIL/repo
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern="does not morph post-entrypoint"
```

Result: failed before the fix. The captured Y.Map that originally represented
the moved paragraph contained the displaced sibling after the final pure move:

```text
Expected value: "Another paragraph exists so the top-level list is not degenerate."
Received array: [undefined, "Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا."]
```

Known-fixes base was reconfirmed in a fresh detached test-only worktree:

```bash
tmp=$(mktemp -d /private/tmp/gutenberg-5ee0-pass102-knownfix.XXXXXX)
git worktree add --detach "$tmp/repo" 3cba2b1e56a98787de08dc6c7df2434759e8f908
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules "$tmp/repo/node_modules"
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/vendor "$tmp/repo/vendor"
git -C "$tmp/repo" cherry-pick --no-commit 640be159381
cd /private/tmp/gutenberg-5ee0-pass102-knownfix.VctDGe/repo
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern="does not morph post-entrypoint|replays the generated structural edit sequence"
```

Result: failed `2/2` on the known-fixes base. The browser-derived structural
sequence emitted nested remote event targets:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

The morph proof again showed the moved Y.Map rewritten to the displaced sibling.

Pass 102 fixed-branch verification on the PR branch at `b836fa3d436`:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-5ee0be2f9b7d
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 npm run wp-env status
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/build build
npm run build -- --skip-types
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-entrypoint repros passed `6/6`; full `crdt-blocks` passed
`74/74`; targeted JS lint passed; `git diff --check` produced no output;
`wp-env status` reported the worktree environment already running at
`http://localhost:9901`; and the headless Chromium natural-user Playwright repro
passed in `20.6s`. The build again completed `build:js` and `build:php`, then
failed in the unrelated theme primitive color-token generator with
`TypeError: [object Object] is not a valid color space`.

Origin analysis was rechecked in pass 102 with `git show`, `git log`, and
`git blame`. Commit `84019935998c16f877e976ad85e84748355d7282` / PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262) introduced
`mergeCrdtBlocks()` and the left/right sweep on `2025-10-14`. Commit
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104` / PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923) expanded the
tests on `2026-02-25` but still did not assert Y.Map identity or array-event
shape for strict pure moves. `gh` was not installed in this environment, so the
pass used local commit metadata and PR URLs from the commit messages.

Pass 102 created a new stitched headless video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-102/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass102-annotated.mp4
```

Video verification: H.264, `1920x1080`, `30.000000s`, `750` frames, SHA-256
`5d3a36c74aee5941af73ea5f55388340977a1972b22cc51aa63d6e98c73c00ae`;
`ffmpeg -v error -i ... -f null -` exited 0.

Pass 103 independently re-read the source row, generated spec, source log,
error context, trace archive, screenshots, current fix, current tests, and
origin history. The source failure remains a completed natural-editor sequence,
not readiness or locator fallout: the trace shows create/open in two editors,
Options > Delete for the heading, collaborator Options > Add before, typing the
inserted paragraph, primary toolbar Move down, then convergence polling.

The source row is still:

```text
result=failed exitCode=1 timedOut=false durationMs=48363
startedAt=2026-05-05T10:20:12.857Z completedAt=2026-05-05T10:21:01.220Z
```

The captured final state is the same product divergence:

```text
primary:      inserted paragraph, displaced sibling, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

Pass 103 added a fresh known-fixes base negative control below Playwright:

```bash
git worktree add --detach /tmp/gutenberg-5ee0-knownfix-pass103.FlBMxE 3cba2b1e56a98787de08dc6c7df2434759e8f908
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/vendor vendor
git cherry-pick --no-commit 640be159381
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='replays the generated structural edit sequence|does not morph post-entrypoint'
```

Result: failed `2/2` on known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908`. The browser-derived structural
sequence emitted nested remote event targets:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

The post-entrypoint morph proof again showed the moved Y.Map record rewritten
to the displaced sibling paragraph:

```text
Expected value: "Another paragraph exists so the top-level list is not degenerate."
Received array: [undefined, "Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا."]
```

Pass 103 fixed-branch verification on the PR branch at `b836fa3d436`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
npm run build -- --skip-types
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-entrypoint repros passed `6/6`; full `crdt-blocks` passed
`74/74`; targeted JS lint passed; `git diff --check` produced no output; and,
after branch JS/PHP assets were rebuilt, the natural-user Playwright repro
passed in `21.0s`. Before the asset rebuild, two Playwright attempts failed
at the initial Collaborators-list readiness wait before any edit actions; those
runs were classified as readiness/artifact misses, not product evidence. The
build command completed `build:js` and `build:php`, then failed in the
unrelated theme primitive color-token generator with `TypeError: [object Object]
is not a valid color space`.

Pass 103 created and verified a fresh annotated headless video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-103/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass103-annotated.mp4
```

Video verification: H.264, `1920x1080`, `24.000000s`, `600` frames, SHA-256
`c64fdac718f1daf8fa112df50c1845e100944cdb0373f31bc337e9c04bc51b8c`;
`ffmpeg -v error -i ... -f null -` exited 0. A frame extracted at 8s shows the
two source failure screens plus the pass-103 action/result overlay.

Pass 104 refreshed both branches onto current `origin/trunk`
`3babe1c1f095d92e8f08aa653dbfbe75b4b13c84` and independently verified that
the existing fix still satisfies the requested standard. The PR branch keeps
the requested three-commit order:

```text
1a7bd172e55 Add CRDT repros for RTC adjacent move identity rewrite
9fd6d2d72b8 Add RTC top-level move Playwright repro
3c29b3ec4c3 Avoid rewriting CRDT block records for pure moves
```

Pass 104 added a current-trunk prefix proof in addition to the known-fixes
negative control. Current trunk plus only the rebased repro commit fails below
Playwright:

```bash
git worktree add --detach /private/tmp/gutenberg-5ee0-pass104-prefix.OemY1R/repo 1a7bd172e55bd3e362ae501bb35264f89a28fb85
cd /private/tmp/gutenberg-5ee0-pass104-prefix.OemY1R/repo
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='replays the generated structural edit sequence|does not morph post-entrypoint'
```

Result: failed `2/2` before the fix. The browser-derived structural sequence
emitted nested remote event targets:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

The post-entrypoint morph proof again showed the moved Y.Map record rewritten
to the displaced sibling:

```text
Expected value: "Another paragraph exists so the top-level list is not degenerate."
Received array: [undefined, "Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا."]
```

Known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908` was also
reconfirmed by cherry-picking only the rebased repro commit
`1a7bd172e55bd3e362ae501bb35264f89a28fb85`. It failed the same two
post-entrypoint repros with the same nested `YMap`/`YText` event shape and
moved-record morphing, so the known-fixes base does not contain this fix.

Pass 104 fixed-branch verification on `3c29b3ec4c3`, based on current
`origin/trunk`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
npm run build -- --skip-types
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-entrypoint repros passed `6/6`; full `crdt-blocks` passed
`74/74`; targeted JS lint passed after pointing the local dependency layout at
the current worktree's `@wordpress/eslint-plugin`; `git diff --check` produced
no output; and the natural-user Playwright repro passed headlessly in `20.2s`.
The build again completed `build:js` and `build:php`, then failed in the
unrelated primitive color-token generator with `TypeError: [object Object] is
not a valid color space`.

Pass 104 also recreated and verified the annotated stitched video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-104/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass104-annotated.mp4
```

Video verification: H.264, `1920x1080`, `30.000000s`, `750` frames, SHA-256
`dacb734ec0d23888bfbf71f82e9aa68248e1e8489e1142f955ceaba315914711`;
`ffmpeg -v error -i ... -f null -` exited 0.

Pass 105 added a lower-level independent repro route that bypasses
`applyPostChangesToCRDTDoc()` and calls `mergeCrdtBlocks()` directly. This
narrows the root cause to the block-array reconciliation function itself:

```bash
git worktree add --detach /private/tmp/gutenberg-5ee0-pass105-prefix.Pvdv7j/repo 1a7bd172e55bd3e362ae501bb35264f89a28fb85
cd /private/tmp/gutenberg-5ee0-pass105-prefix.Pvdv7j/repo
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='does not rewrite block records when moving adjacent top-level blocks|represents adjacent pure moves as structural array changes'
```

Result before the fix: failed `2/2`. The direct `mergeCrdtBlocks()` morph
proof showed the captured moved Y.Map rewritten to the displaced paragraph:

```text
Expected value: "Another paragraph exists so the top-level list is not degenerate."
Received array: [undefined, "Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا."]
```

The direct event-shape proof showed nested record rewrites instead of one
structural array change:

```text
Expected: []
Received: ["YMap", "YText", "YMap", "YText"]
```

Known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only the
rebased repro commit cherry-picked, also failed the post-entrypoint repros:

```bash
git worktree add --detach /private/tmp/gutenberg-5ee0-pass105-knownfix.3qXBjp/repo 3cba2b1e56a98787de08dc6c7df2434759e8f908
cd /private/tmp/gutenberg-5ee0-pass105-knownfix.3qXBjp/repo
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/vendor vendor
git cherry-pick --no-commit 1a7bd172e55bd3e362ae501bb35264f89a28fb85
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='replays the generated structural edit sequence|does not morph post-entrypoint'
```

Result: failed `2/2` with nested `["YMap", "YMap", "YText", "YText"]` remote
events and the same moved-record morphing.

Pass 105 fixed-branch verification remained on the same current-trunk stack:

```text
origin/trunk = 3babe1c1f095d92e8f08aa653dbfbe75b4b13c84
1a7bd172e55 Add CRDT repros for RTC adjacent move identity rewrite
9fd6d2d72b8 Add RTC top-level move Playwright repro
3c29b3ec4c3 Avoid rewriting CRDT block records for pure moves
```

Fixed-branch commands:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='does not rewrite block records when moving adjacent top-level blocks|represents adjacent pure moves as structural array changes'
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
git diff --check origin/trunk..HEAD
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 npm run wp-env status
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
npm run build -- --skip-types
```

Results: focused direct `mergeCrdtBlocks()` repros passed `2/2`; post
entrypoint repros passed `6/6`; full `crdt-blocks` passed `74/74`; targeted JS
lint passed; `git diff --check` produced no output; wp-env was already running
at `http://localhost:9901`; and the natural-user Playwright repro passed
headlessly in `20.6s`. The build again completed `build:js` and `build:php`,
then failed in the unrelated primitive color-token generator with
`TypeError: [object Object] is not a valid color space`.

Pass 105 created a new annotated stitched video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-105/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass105-annotated.mp4
```

Video verification: H.264, `1920x1080`, `14.033333s`, `421` frames;
the extracted frame shows the primary and collaborator final screens plus the
pass-105 action and proof log.

Pass 106 independently re-verified the branch and video standard instead of
only restating pass 105. Since `origin/trunk` advanced to
`5f1ee5529e1c8b50e7ecd35ff022f5b26dc575bb`, both branches were rebased onto
that commit. The PR branch still has the requested three-commit order:

```text
c98711eccdc Add CRDT repros for RTC adjacent move identity rewrite
a33cee8f7be Add RTC top-level move Playwright repro
f03721ab0ba Avoid rewriting CRDT block records for pure moves
```

Current trunk plus only the rebased non-Playwright repro commit fails before
the fix:

```bash
git worktree add --detach /private/tmp/gutenberg-5ee0-pass106-prefix.1778074151.23713/repo c98711eccdc3364dda9b37dc70f6084179d704b2
cd /private/tmp/gutenberg-5ee0-pass106-prefix.1778074151.23713/repo
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='does not rewrite block records when moving adjacent top-level blocks|represents adjacent pure moves as structural array changes'
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='replays the generated structural edit sequence|does not morph post-entrypoint'
```

Result: both focused test commands failed `2/2`. The direct
`mergeCrdtBlocks()` proof again reported nested `["YMap", "YText", "YMap",
"YText"]` changes instead of a structural array reorder, and the
post-entrypoint generated-sequence proof reported nested `["YMap", "YMap",
"YText", "YText"]` remote targets. Both morph proofs showed the captured moved
record rewritten to the displaced paragraph:

```text
Expected value: "Another paragraph exists so the top-level list is not degenerate."
Received array: [undefined, "Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا."]
```

Known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908` still does not
contain the fix. Pass 106 cherry-picked only the rebased repro commit
`c98711eccdc3364dda9b37dc70f6084179d704b2`; the cherry-pick succeeded and the
focused post-entrypoint repro failed with status `1`.

Pass 106 fixed-branch verification on `f03721ab0ba`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='does not rewrite block records when moving adjacent top-level blocks|represents adjacent pure moves as structural array changes'
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
git diff --check origin/trunk..HEAD
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 npm run wp-env status
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
npm run build -- --skip-types
```

Results: focused direct `mergeCrdtBlocks()` repros passed `2/2`; post
entrypoint repros passed `6/6`; full `crdt-blocks` passed `74/74`; targeted JS
lint passed; `git diff --check` produced no output; wp-env reported running
with URL `http://localhost:9901`; and the natural-user Playwright repro passed
headlessly in `20.8s`. The broad build again completed `build:js` and
`build:php`, then failed in the unrelated primitive color-token generator with
`TypeError: [object Object] is not a valid color space`.

GitHub metadata was refreshed for the origin commits. PR #72262
(`https://github.com/WordPress/gutenberg/pull/72262`) is closed and merged;
it introduced `mergeCrdtBlocks()` and the left/right positional sweep in merge
commit `84019935998c16f877e976ad85e84748355d7282` on
`2025-10-14T17:38:19Z`. PR #75923
(`https://github.com/WordPress/gutenberg/pull/75923`) is closed and merged;
it expanded `mergeCrdtBlocks()` tests in merge commit
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104` on `2026-02-25T22:17:47Z`, but
did not assert stable block identity or remote event shape for pure top-level
moves.

Pass 106 created a self-contained annotated video by adding a pass-106
verification overlay to the pass-105 stitched screens and action log:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-106/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass106-annotated.mp4
```

Video verification: H.264, `1920x1080`, `14.033333s`, `421` frames,
`312913` bytes. The extracted frame shows both divergent editor screens, the
natural-user action log, the pass-105 root-cause proof, and the pass-106
rebase/test/known-fixes overlay.

Pass 107 adds an independent non-Playwright repro route. It is not the exact
three-block generated sequence: it replays all non-identity permutations of a
four-block post through `applyPostChangesToCRDTDoc()`, sends only the Yjs update
delta to a remote doc, and asserts that a pure reorder reaches the remote peer
as one top-level array event with no nested `YMap`/`YText` edits.

Current trunk plus only the rebased non-Playwright repro commit fails this
independent permutation route before the fix:

```bash
git worktree add --detach /private/tmp/gutenberg-5ee0-pass107-prefixtest.OE8trJ/repo c98711eccdc3364dda9b37dc70f6084179d704b2
cd /private/tmp/gutenberg-5ee0-pass107-prefixtest.OE8trJ/repo
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='represents all pure block permutations as structural remote changes'
```

Result: failed with status `1`; the first failing permutation reached the
remote peer with nested targets instead of a structural array-only change:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

Known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908` was also
rechecked in pass 107 by cherry-picking only the non-Playwright repro commit:

```bash
git worktree add --detach /private/tmp/gutenberg-5ee0-pass107-knownfix.dpdc1D/repo 3cba2b1e56a98787de08dc6c7df2434759e8f908
cd /private/tmp/gutenberg-5ee0-pass107-knownfix.dpdc1D/repo
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
git cherry-pick --no-commit c98711eccdc3364dda9b37dc70f6084179d704b2
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='replays the generated structural edit sequence|represents all pure block permutations as structural remote changes'
```

Result: failed with status `1`; both the generated-sequence replay and the
independent all-permutation replay reported nested `YMap`/`YText` remote
events.

Pass 107 fixed-branch verification on `f03721ab0ba`, based on
`origin/trunk` at `5f1ee5529e1c8b50e7ecd35ff022f5b26dc575bb`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='adjacent|non-adjacent|structural array changes|record'
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
git diff --check origin/trunk..HEAD
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 npm run wp-env status
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-entrypoint repros passed `6/6`, focused block move tests passed
`3/3`, full `crdt-blocks` passed `74/74`, `git diff --check` produced no
output, targeted JS lint passed, wp-env reported running with URL
`http://localhost:9901`, and the natural-user Playwright repro passed
headlessly in `20.9s`. A direct `wp-build` could not complete in this shared
install because optional frontend dependencies such as `framer-motion`,
`react-colorful`, `@emotion/css`, and `postcss-urlrebase` were absent; it did
successfully emit the fixed `build/scripts/core-data` bundle, which was used
for the headless Playwright verification.

Pass 108 rebased the PR branch and explanation branch onto current
`origin/trunk` at `158d5fcc99ba20d5929d76ba25494e1716a6d12a`. The PR branch
still has the requested three-commit order:

```text
6f756c7aa96 Add CRDT repros for RTC adjacent move identity rewrite
72f487ef18b Add RTC top-level move Playwright repro
137f2083950 Avoid rewriting CRDT block records for pure moves
```

Pass 108's added value is a current-trunk branch refresh plus fresh negative
controls at both non-Playwright and browser levels. Current trunk plus only the
rebased non-Playwright repro commit still fails before the fix:

```bash
git worktree add --detach /private/tmp/gutenberg-5ee0-pass108-prefix.zX2sTB/repo 6f756c7aa96
cd /private/tmp/gutenberg-5ee0-pass108-prefix.zX2sTB/repo
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='represents all pure block permutations as structural remote changes'
```

Result: failed with status `1`. The remote peer observed nested CRDT record
edits for a pure reorder:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

Known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908` was rechecked by
cherry-picking only the rebased non-Playwright repro commit:

```bash
git worktree add --detach /private/tmp/gutenberg-5ee0-pass108-knownfix.H55jxg/repo 3cba2b1e56a98787de08dc6c7df2434759e8f908
cd /private/tmp/gutenberg-5ee0-pass108-knownfix.H55jxg/repo
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
git cherry-pick --no-commit 6f756c7aa96
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='replays the generated structural edit sequence|represents all pure block permutations as structural remote changes'
```

Result: failed with status `1`; both focused tests reported nested
`YMap`/`YText` remote events.

Pass 108 also reran the archived generated natural-user Playwright spec against
the known-fixes browser environment on port `9903`:

```bash
GUTENBERG_RTC_BROWSER_SKIP_GLOBAL_POST_CLEANUP=1 GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-108/artifacts-knownfix RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-108/knownfix-ec47-output RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `42.5s` after the normal editor actions and final convergence
wait. The pass-108 `attempt-1.json` records post `695`, primary `inserted,
displaced sibling, moved paragraph`, and collaborator `inserted, moved
paragraph, moved paragraph`.

Pass 108 fixed-branch verification on `137f2083950`, based on current
`origin/trunk`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='adjacent|non-adjacent|structural array changes|record'
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
git diff --check origin/trunk..HEAD
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 npm run wp-env status
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-entrypoint repros passed `6/6`, focused block move tests passed
`3/3`, full `crdt-blocks` passed `74/74`, `git diff --check` produced no
output, targeted JS lint passed, wp-env reported running with URL
`http://localhost:9901`, and the natural-user Playwright repro passed
headlessly in `22.5s`. A direct `wp-build` again refreshed
`build/scripts/core-data` but failed on missing optional shared-install
dependencies (`framer-motion`, `react-colorful`, `@emotion/css`, and
`postcss-urlrebase`), so the Playwright check used the complete known-good
build tree with the freshly built fixed `build/scripts/core-data` overlaid.

Pass 108 generated a fresh annotated headless stitched video from the
known-fixes browser rerun:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-108/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass108-annotated.mp4
```

Video verification: H.264, `1920x1080`, `18.0s`, `450` frames, `381734`
bytes. `ffmpeg -v error -i ... -f null -` exited 0, and the extracted 8s frame
is a valid `1920x1080` PNG showing both final editor screens and the pass-108
action/result overlay.

Pass 109 rebased the PR and explanation branches onto current `origin/trunk`:

```text
origin/trunk = 70f50bcfaca05383e5d227deb8c053e981494e2b
PR branch commits:
b395c4a04e3 Add CRDT repros for RTC adjacent move identity rewrite
050af43d121 Add RTC top-level move Playwright repro
aa1854e7248 Avoid rewriting CRDT block records for pure moves
```

The added pass-109 check is a fresh current-trunk verification that the existing
branch, fix, and video still meet the requested standard after trunk advanced.
The first PR commit contains only the non-Playwright repros. Running those
repros before the fix fails below Playwright:

```bash
git worktree add --detach /private/tmp/gutenberg-5ee0-pass109-prefix.k5jOkM/repo b395c4a04e3
cd /private/tmp/gutenberg-5ee0-pass109-prefix.k5jOkM/repo
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='represents all pure block permutations as structural remote changes|replays the generated structural edit sequence|does not morph post-entrypoint'
```

Result: failed with status `1`. Two remote-sync tests observed nested CRDT
record edits for pure moves:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

The record-morphing test also failed because the original moved block Y.Map had
been rewritten into the displaced paragraph. This is a narrower root-cause proof
than the browser failure: the replicated mutation shape is wrong before any
Playwright wait, locator, or assertion can matter.

Known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908` was rechecked by
cherry-picking only the pass-109 repro commit:

```bash
git worktree add --detach /private/tmp/gutenberg-5ee0-pass109-knownfix.2dnq6E/repo 3cba2b1e56a98787de08dc6c7df2434759e8f908
cd /private/tmp/gutenberg-5ee0-pass109-knownfix.2dnq6E/repo
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
git cherry-pick --no-commit b395c4a04e3
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='represents all pure block permutations as structural remote changes|replays the generated structural edit sequence|does not morph post-entrypoint'
```

Result: failed with the same nested `YMap`/`YText` remote events and block-record
morphing, so the known-fixes base did not already fix this bug.

Fixed-branch verification on `aa1854e7248`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves|handles complex block reordering'
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
git diff --check origin/trunk..HEAD
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 npm run wp-env status
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-109/playwright-fixed-artifacts RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-entrypoint repros passed `6/6`; focused block tests passed
`4/4`; full `crdt-blocks` passed `74/74`; `git diff --check` produced no
output; targeted JS lint exited `0`; wp-env reported running at
`http://localhost:9901`; and the natural-user Playwright repro passed
headlessly in `26.2s`.

Pass 110 independently re-read the source JSONL row, source log, generated
source spec, screenshots, error context, existing branch stack, tests, and
`mergeCrdtBlocks()` implementation. The source run is still classified as a
product bug: the generated spec used ordinary editor UI actions, exited `1`
without timing out, and failed only after a convergence wait with primary
`inserted paragraph, displaced sibling, moved paragraph` and collaborator
`inserted paragraph, moved paragraph, moved paragraph`.

`origin/trunk` was unchanged from pass 109:

```text
origin/trunk = 70f50bcfaca05383e5d227deb8c053e981494e2b
PR branch commits:
b395c4a04e3 Add CRDT repros for RTC adjacent move identity rewrite
050af43d121 Add RTC top-level move Playwright repro
aa1854e7248 Avoid rewriting CRDT block records for pure moves
```

Pass 110's added value is a fresh verification that the existing branch, fix,
and video standard still satisfy the requested bar. Current trunk plus only the
first non-Playwright repro commit still fails before the fix:

```bash
git worktree add --detach /private/tmp/gutenberg-5ee0-pass110-prefix.V1XPXT/repo b395c4a04e3f07f9c96cf63602eabe075b5e2c20
cd /private/tmp/gutenberg-5ee0-pass110-prefix.V1XPXT/repo
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='represents all pure block permutations as structural remote changes|replays the generated structural edit sequence|does not morph post-entrypoint'
```

Result: failed with status `1`. The two remote-sync tests observed nested CRDT
record edits for pure moves:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

The record-morphing test also failed because the original moved block Y.Map was
rewritten into the displaced paragraph.

Known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908` was rechecked in
pass 110 by cherry-picking only the same non-Playwright repro commit:

```bash
git worktree add --detach /private/tmp/gutenberg-5ee0-pass110-knownfix.UDwe8W/repo 3cba2b1e56a98787de08dc6c7df2434759e8f908
cd /private/tmp/gutenberg-5ee0-pass110-knownfix.UDwe8W/repo
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
git cherry-pick --no-commit b395c4a04e3f07f9c96cf63602eabe075b5e2c20
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='represents all pure block permutations as structural remote changes|replays the generated structural edit sequence|does not morph post-entrypoint'
```

Result: failed with the same nested `YMap`/`YText` remote events and
block-record morphing. This reconfirms that the known-fixes base did not
already fix the defect.

Pass 110 fixed-branch verification on `aa1854e7248`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='does not rewrite block records|represents adjacent pure moves|represents non-adjacent pure moves|handles complex block reordering'
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
git diff --check origin/trunk..HEAD
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 npm run wp-env status
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-110/playwright-fixed-artifacts RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: post-entrypoint repros passed `6/6`; focused block tests passed
`4/4`; full `crdt-blocks` passed `74/74`; `git diff --check` produced no
output; targeted JS lint exited `0`; wp-env reported running at
`http://localhost:9901`; the browser build contained
`canReorderBlocksByClientId`; and the natural-user Playwright repro passed
headlessly in `20.6s`.

Pass 110 generated a fresh annotated stitched video from the source failure
screenshots:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-110/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass110-annotated.mp4
```

Video verification: H.264, `1920x1080`, `18.0s`, `450` frames, `343139`
bytes. `ffmpeg -v error -i ... -f null -` exited 0, and the extracted 8s frame
is a valid `1920x1080` PNG showing both final editor screens plus the action,
expected-state, observed-state, and pass-110 proof overlays.

## Pass 111 Refresh

Pass 111 rebased both branches onto current `origin/trunk`:

```text
origin/trunk = c70fc1929c5177202c8ce3094d6c53e548b54aeb
PR branch commits:
33a9dd8ceb9 Add CRDT repros for RTC adjacent move identity rewrite
e285330a3c2 Add RTC top-level move Playwright repro
4bf416e8891 Avoid rewriting CRDT block records for pure moves
```

The added pass-111 value is a current-trunk verification after `origin/trunk`
advanced from pass 110. A fresh current-trunk test-only worktree with only the
non-Playwright repro commit cherry-picked still fails before the fix:

```bash
cd /private/tmp/gutenberg-5ee0-pass111-current-trunk-testonly.B6JbCI/repo
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent pure moves|moving adjacent top-level|non-adjacent pure moves"
```

Result: both commands failed with status `1`. The post-entrypoint test failed
`6/6` with nested `YMap`/`YText` events for pure moves, and the direct
`mergeCrdtBlocks()` tests failed `3/3`, including the original moved-block
Y.Map being rewritten into the displaced paragraph.

Known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908` was reconfirmed
with the same test-only repro commit:

```bash
cd /private/tmp/gutenberg-5ee0-pass111-knownfix-testonly.gkYLKn/repo
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent pure moves|moving adjacent top-level|non-adjacent pure moves"
```

Result: both commands failed with status `1` and the same nested CRDT event
shape plus record-morphing assertion failure. The known-fixes base still does
not contain this fix.

Fixed-branch pass-111 verification on `4bf416e8891`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent pure moves|moving adjacent top-level|non-adjacent pure moves"
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: `crdt-post-block-move.ts` passed `6/6`; focused `crdt-blocks.ts`
passed `3/3`; full `crdt-blocks.ts` passed `74/74`; targeted JS lint exited
`0`; the natural-user Playwright repro passed headlessly in `20.0s`; and
`git diff --check origin/trunk..HEAD` produced no output.

An attempted full build got through JS and PHP bundling, then failed in
`packages/theme/bin/generate-primitive-tokens` with `TypeError: [object Object]
is not a valid color space`. That failure is outside the CRDT files and left
the worktree clean.

## Pass 112 Refresh

Pass 112 re-read the source JSONL row, source Playwright log, page snapshot,
source failure screenshots, branch state, and pass-111 summary. The source
failure remains a real product split: the generated spec completed normal user
actions, then failed convergence with the primary editor at
`inserted paragraph, displaced sibling, moved paragraph` and the collaborator
at `inserted paragraph, moved paragraph, moved paragraph`.

The pass-112 addition is a fresh verification that the existing branch, fix,
and video standard still satisfy the requested bar on current
`origin/trunk = c70fc1929c5177202c8ce3094d6c53e548b54aeb`, plus a new
pass-112 annotated stitched video.

Current trunk with only the non-Playwright repro commit applied still fails
below Playwright:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-112/work/current-trunk-testonly
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='replays the generated structural edit sequence|does not morph post-entrypoint'
```

Result: failed with status `1`. The post-entrypoint remote-sync proof observed
nested CRDT record edits for the generated structural edit sequence:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

The record-morphing proof also failed because the original moved block Y.Map
was rewritten into the displaced sibling paragraph.

Known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908`, again with only
the same non-Playwright repro commit applied, failed the identical proof:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-112/work/knownfix-testonly
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='replays the generated structural edit sequence|does not morph post-entrypoint'
```

Result: failed with status `1` and the same nested `YMap`/`YText` updates plus
the same moved-record morphing failure. The known-fixes base still does not
contain this fix.

Fixed PR branch:

```text
33a9dd8ceb9 Add CRDT repros for RTC adjacent move identity rewrite
e285330a3c2 Add RTC top-level move Playwright repro
4bf416e8891 Avoid rewriting CRDT block records for pure moves
```

Pass 112 fixed-branch verification on `4bf416e8891`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='adjacent pure moves|moving adjacent top-level|non-adjacent pure moves'
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 npm run wp-env status
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-112/playwright-fixed-artifacts RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: `crdt-post-block-move.ts` passed `6/6`; focused `crdt-blocks.ts`
passed `3/3`; full `crdt-blocks.ts` passed `74/74`; targeted JS lint exited
`0`; `git diff --check` produced no output; `wp-env` reported the bug worktree
environment running for `http://localhost:9901`; and the natural-user
Playwright repro passed headlessly in `20.7s`.

Pass 112 generated a fresh annotated stitched video from the source failure
screenshots:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-112/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass112-annotated.mp4
```

Video validation: H.264, `1920x1080`, `18.0s`, `450` frames, `283006` bytes.
`ffmpeg -v error -i ... -f null -` exited `0`, and the extracted frame is a
valid `1920x1080` PNG showing both final editor screenshots plus readable
action, expected-state, observed-state, and pass-112 proof overlays.

## Pass 113 Refresh

Pass 113 re-read the pass-112 summary, source JSONL row, archived source spec,
trace, error-context snapshot, screenshots, and the rebased fix. The source
trace still rules out readiness, locator, generated-spec, environment, and
inverted-assertion explanations: the spec completed normal editor actions
before `waitForConvergence()` reported the replicated document split.

The added value in this pass is a current-base verification. `origin/trunk`
advanced to `ae940c4384d8d1d95fb52e7c76765ad2cdc18c6a`, so both branches were
rebased and retested. The PR branch now keeps the required commit order:

```text
c7c44db4ec3 Add CRDT repros for RTC adjacent move identity rewrite
b3a535a2c05 Add RTC top-level move Playwright repro
790175e180c Avoid rewriting CRDT block records for pure moves
```

Current trunk plus only the non-Playwright repro commit still fails below
Playwright:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-113/work/5ee0-current-trunk-testonly
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='replays the generated structural edit sequence|does not morph post-entrypoint'
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='does not rewrite block records|adjacent pure moves'
```

Results: both commands exited `1`. The post-entrypoint proof observed nested
`YMap`, `YMap`, `YText`, `YText` remote edits for the generated structural edit
sequence, and the direct helper proof showed the captured moved Y.Map rewritten
into the displaced sibling paragraph.

Known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908` with the same
test-only repro commit also still fails:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-113/work/5ee0-knownfix-testonly
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='replays the generated structural edit sequence|does not morph post-entrypoint'
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='does not rewrite block records|adjacent pure moves'
```

Results: both commands exited `1` with the same nested CRDT record edits and
record-morphing assertion failure. The known-fixes base still does not contain
the fix.

Fixed branch verification on `790175e180c1ebe66a8b3bc01f7f303da6947095`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='adjacent pure moves|moving adjacent top-level|non-adjacent pure moves|structural remote changes|generated structural edit sequence'
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-113/5ee0-playwright-fixed-artifacts RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: `crdt-post-block-move.ts` passed `6/6`; focused `crdt-blocks.ts`
passed `3/3`; full `crdt-blocks.ts` passed `74/74`; targeted JS lint exited
`0`; `git diff --check` produced no output; and the natural-user Playwright
repro passed headlessly in `20.2s`.

`npm run build` again failed after JS/PHP bundling in the unrelated theme
primitive-token generator with `TypeError: [object Object] is not a valid color
space`.

Pass 113 origin analysis reconfirmed the original source:

- `84019935998c16f877e976ad85e84748355d7282`, PR
  [#72262](https://github.com/WordPress/gutenberg/pull/72262), introduced the
  recursive post-entity CRDT merge and the positional block update loop.
- `128a3c29b7f1db4f35faf9e326dd1e5e7ac11104`, PR
  [#75923](https://github.com/WordPress/gutenberg/pull/75923), added edge-case
  tests but not the Yjs record identity or nested-event-shape invariant for
  pure moves.
- `54af1ce400687f2ba51fee6c440207a07af5d55f` changed the attribute update path
  for RichText cursor origin safety, but preserved the same positional update
  design and did not introduce the pure-move bug.

Pass 113 generated a fresh annotated stitched video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-113/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass113-annotated.mp4
```

Video validation: H.264, `1920x1080`, `20.0s`, `500` frames, `302048` bytes.
`ffmpeg -v error -i ... -f null -` exited `0`, and the extracted frame is a
valid `1920x1080` PNG with both final editor screenshots plus the source action
log, expected state, observed divergence, and pass-113 negative/fixed proof.

## Pass 114 Verification

Pass 114 independently re-read the archived source result, final screenshots,
trace metadata, previous summary, current branches, and CRDT code. The source
artifact is still a product failure: the final page snapshot is a loaded editor
with the collaborator showing `inserted, moved, moved`, while the primary has
the expected `inserted, displaced, moved` order after normal user actions and a
convergence wait.

The added value in this pass is a clean current-base verification that the
existing explanation branch, PR branch, and video/fix package still satisfy the
requested standard on `origin/trunk`:

```text
origin/trunk = ae940c4384d8d1d95fb52e7c76765ad2cdc18c6a
PR branch    = 790175e180c1ebe66a8b3bc01f7f303da6947095
```

The PR branch still has the required commit order:

```text
c7c44db4ec3 Add CRDT repros for RTC adjacent move identity rewrite
b3a535a2c05 Add RTC top-level move Playwright repro
790175e180c Avoid rewriting CRDT block records for pure moves
```

Current trunk plus only the non-Playwright repro commit still fails below
Playwright:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-114/work/5ee0-current-trunk-testonly
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='replays the generated structural edit sequence|does not morph post-entrypoint'
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='does not rewrite block records|adjacent pure moves'
```

Results: both commands exited `1`. The post-entrypoint proof observed nested
`YMap`, `YMap`, `YText`, `YText` remote edits for a pure move, and the direct
helper proof showed the captured moved Y.Map rewritten into the displaced
sibling paragraph.

Known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908` plus the same
test-only repro commit still fails with the same evidence:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-114/work/5ee0-knownfix-testonly
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='replays the generated structural edit sequence|does not morph post-entrypoint'
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='does not rewrite block records|adjacent pure moves'
```

Results: both commands exited `1`, again with nested record events and the
record-morphing assertion failure. This reconfirms that the known-fixes base
does not contain the fix.

Fixed branch verification on `790175e180c1ebe66a8b3bc01f7f303da6947095`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='adjacent pure moves|non-adjacent pure moves|moving adjacent top-level|generated structural edit sequence|all pure block permutations|nested pure block moves'
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 npm run wp-env status
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-114/5ee0-playwright-fixed-artifacts RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: `crdt-post-block-move.ts` passed `6/6`; focused
`crdt-blocks.ts` passed `3/3`; full `crdt-blocks.ts` passed `74/74`; targeted
JS lint exited `0`; `git diff --check` produced no output; `wp-env` was
running at `http://localhost:9901`; and the natural-user Playwright repro
passed headlessly in `20.8s`.

`npm run build` was retried. JS and PHP bundling exited `0`, then the build
failed in the same unrelated theme primitive-token generator with
`TypeError: [object Object] is not a valid color space`.

Pass 114 regenerated and validated an annotated stitched video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-114/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass114-annotated.mp4
```

Video validation: H.264, `1920x1080`, `24.0s`, `600` frames, `501977` bytes.
`ffmpeg -v error -i ... -f null -` exited `0`, and the extracted frame is a
valid `1920x1080` PNG with both failed editor screenshots plus the visible
action log, expected state, observed divergence, and low-level CRDT proof.

## Pass 115 Refresh

Pass 115 rebased the PR branch onto current `origin/trunk`:

```text
origin/trunk = 33949961c95cc929e03d3bb1ed0632b5f7e99cd9
PR branch = 8b9c1c13c75f17dde846079610d97ee52a76e720
```

The required commit order is preserved:

```text
2836b7e47e4 Add CRDT repros for RTC adjacent move identity rewrite
1271babc2c6 Add RTC top-level move Playwright repro
8b9c1c13c75 Avoid rewriting CRDT block records for pure moves
```

Current-trunk and known-fixes test-only negative controls still fail before
the fix. With only the non-Playwright repro commit applied, both bases report
nested remote CRDT record edits for a pure move:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

Both bases also show the identity rewrite directly: the captured `moved-block`
Y.Map is rewritten to the displaced sibling paragraph. This re-validates the
root cause independently of Playwright and independently of the older branch
base.

Fixed-branch verification after the rebase:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='adjacent pure moves|non-adjacent pure moves|moving adjacent top-level|generated structural edit sequence|all pure block permutations|nested pure block moves'
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-115/5ee0-playwright-fixed-artifacts RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
npm run build
```

Results: `crdt-post-block-move.ts` passed `6/6`; focused `crdt-blocks.ts`
passed `3/3` with `71` skipped; full `crdt-blocks.ts` passed `74/74`;
targeted JS lint passed; `git diff --check` was clean; wp-env was already
running at `http://localhost:9900`; the natural-user Playwright repro passed
headlessly in `23.1s`. `npm run build` completed JS and PHP bundling, then
failed in the unrelated primitive-token generator with
`TypeError: [object Object] is not a valid color space`, matching the previous
pass.

## Pass 116 Refresh

Pass 116 re-read the archived source row, generated spec, failure log,
screenshots, trace manifest, and the CRDT/sync-manager code. The source
artifact still shows a normal-user browser flow and a durable convergence split,
not a readiness wait, locator error, malformed spec, environment failure, or
inverted assertion. The final archived screenshots show one editor with
`inserted, displaced sibling, moved paragraph` and the other with
`inserted, moved paragraph, moved paragraph`.

`origin/trunk` advanced again:

```text
origin/trunk = 1e87b2cd7874aaf9df553db901fe395d6a96a0a2
PR branch = ac313a81d9a5d2549c32ad95a4c383aaff434686
```

The PR branch was rebased onto that trunk and still has the required commit
order:

```text
24391737982 Add CRDT repros for RTC adjacent move identity rewrite
441db69f8ab Add RTC top-level move Playwright repro
ac313a81d9a Avoid rewriting CRDT block records for pure moves
```

Fresh current-trunk and known-fixes negative controls were rerun with only the
non-Playwright repro commit applied. Both fail below Playwright:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

Both controls also still show the direct identity rewrite: the captured
`moved-block` Y.Map is rewritten to the displaced sibling paragraph. This pass
adds an independently refreshed root-cause proof on a newer upstream base: the
failure is the CRDT mutation shape itself. A pure block reorder reaches the
remote side as nested record/text edits rather than one structural `Y.Array`
change.

Pass 116 fixed-branch verification:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='adjacent pure moves|non-adjacent pure moves|moving adjacent top-level|generated structural edit sequence|all pure block permutations|nested pure block moves'
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-116/5ee0-playwright-fixed-artifacts RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
npm run build
```

Results: `crdt-post-block-move.ts` passed `6/6`; the focused `crdt-blocks.ts`
run passed `3/3` with `71` skipped; the full `crdt-blocks.ts` file passed
`74/74`; targeted JS lint passed; `git diff --check` was clean; wp-env was
running at `http://localhost:9900`; and the natural-user Playwright repro
passed headlessly in `21.5s`. `npm run build` again completed JS and PHP
bundling, then failed in the unrelated theme primitive-token generator with
`TypeError: [object Object] is not a valid color space`.

## Pass 117 Refresh

Pass 117 re-read the previous summary, the source JSONL row, the source failure
log, error context, screenshots, the existing repros, and `mergeCrdtBlocks()`.
`origin/trunk` remains:

```text
origin/trunk = 1e87b2cd7874aaf9df553db901fe395d6a96a0a2
PR branch = ac313a81d9a5d2549c32ad95a4c383aaff434686
```

The PR branch still has the required three-commit order:

```text
24391737982 Add CRDT repros for RTC adjacent move identity rewrite
441db69f8ab Add RTC top-level move Playwright repro
ac313a81d9a Avoid rewriting CRDT block records for pure moves
```

The pass-specific addition is a fresh verification that the existing branch,
video standard, and fix still satisfy the requested bar, plus a narrower
negative-control restatement from newly run test logs. With only commit
`24391737982` applied, both current trunk and the known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` fail below Playwright:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='replays the generated structural edit sequence|does not morph post-entrypoint'
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='does not rewrite block records|adjacent pure moves'
```

Results on both bases: the post-sync entrypoint reports nested remote CRDT
events:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

The direct block merge test also reports nested `YMap`/`YText` events for pure
moves and the same identity rewrite: the captured `moved-block` Y.Map is
morphed into the displaced sibling paragraph. This is not explainable as a
browser readiness, locator, malformed spec, or assertion inversion problem.

Pass 117 fixed-branch verification:

```bash
git diff --check origin/trunk..HEAD
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='adjacent pure moves|non-adjacent pure moves|moving adjacent top-level|generated structural edit sequence|all pure block permutations|nested pure block moves'
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-117/5ee0-playwright-fixed-artifacts RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
npm run build
```

Results: `git diff --check` was clean; `crdt-post-block-move.ts` passed `6/6`;
the focused `crdt-blocks.ts` run passed `3/3` with `71` skipped; the full
`crdt-blocks.ts` file passed `74/74`; targeted JS lint passed; wp-env was
running at `http://localhost:9900`; and the natural-user Playwright repro
passed headlessly in `21.7s`. `npm run build` completed JS and PHP bundling,
then failed in the unrelated theme primitive-token generator with
`TypeError: [object Object] is not a valid color space`.

Pass 117 generated a fresh annotated stitched video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-117/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass117-annotated.mp4
```

Video validation: H.264, `1920x1080`, `14.0s`, `326594` bytes. The extracted
frame shows both archived failed editor screenshots plus the visible action log,
expected state, observed split, current-trunk/known-fixes negative controls,
fixed-branch verification, and build caveat.

## Pass 120 Refresh

Pass 120 independently re-read the source row, source failure log, archived
error context, trace action stream, implementation, tests, previous summary, and
branch history. The source trace shows successful natural editor actions before
the failure:

```text
click Seed 950301 multibyte heading
click Block tools > Options
click Delete
click Emoji and multibyte
click Block tools > Options
click Add before
type RTC ec47 realistic inserted paragraph 1
click Emoji and multibyte
click Block tools > Move down
```

After those actions, the trace shows repeated normalized-state polling for the
20s convergence window. The archived failure still has primary
`inserted, displaced sibling, moved paragraph` and collaborator
`inserted, moved paragraph, moved paragraph`, so this pass again rules out a
readiness wait, action locator error, malformed generated spec, inverted
assertion, and expected behavior.

Pass 120 adds a branch-prefix proof, separate from the known-fixes base: at
`441db69f8ab1eb2d6e154c80524f354c99f872ce` (the PR branch after the
non-browser and Playwright repro commits, before the fix), the selected
non-browser tests fail below Playwright:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='replays the generated structural edit sequence|does not morph post-entrypoint'
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='does not rewrite block records when moving adjacent top-level blocks|represents adjacent pure moves as structural array changes|represents non-adjacent pure moves as structural array changes'
```

Results: the post-sync entrypoint reports nested remote events
`["YMap", "YMap", "YText", "YText"]`; the direct helper reports nested
`YMap`/`YText` events for adjacent and non-adjacent pure moves; and the captured
`moved-block` Y.Map is rewritten into the displaced sibling paragraph. At fixed
head `ac313a81d9a5d2549c32ad95a4c383aaff434686`, the same selected tests pass.

Pass 120 also reconfirmed the known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` by applying only
`24391737982` without the fix. The same selected post-sync and direct-helper
tests fail with the same nested CRDT event shape and Y.Map record morphing, so
the known-fixes base does not contain this fix.

Fixed-branch verification in pass 120:

```bash
git fetch origin trunk
git diff --check origin/trunk..HEAD
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 npm run wp-env status
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-120/5ee0-playwright-fixed-artifacts-retry RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
npm run build
```

Results: `origin/trunk` remained
`1e87b2cd7874aaf9df553db901fe395d6a96a0a2`; `git diff --check` was clean;
`crdt-post-block-move.ts` passed `6/6`; `crdt-blocks.ts` passed `74/74`;
targeted JS lint passed; and the natural-user Playwright repro passed
headlessly in `23.0s` after a branch rebuild. The first browser attempt on
this pass failed at collaborator discovery because port `9900` was serving a
different bug worktree (`gutenberg-bug-07f8eb5c4218`) while this worktree's
wp-env was actually on `9902`. That was an environment/port collision, not a
product assertion failure. `npm run build` again completed JS and PHP bundling,
then failed in the unrelated theme primitive-token generator with
`TypeError: [object Object] is not a valid color space`.

Pass 120 video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-120/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass120-annotated.mp4
```

Video validation: H.264, `1920x1080`, `18.0s`, `547388` bytes. The video is a
pass-120 annotated copy of the previously validated headless stitched artifact;
it preserves the archived failed editor screens and action log, and overlays the
new prefix/known-fixes negative-control result and fixed-branch verification.

## Pass 121 Verification

Pass 121 re-read the previous pass, source JSONL row, generated source spec,
failure log, error context, trace manifest, fix branch, explanation branch, and
video artifact. The source artifact still fails only after successful natural
editor actions and a convergence wait; the final error-context snapshot shows a
loaded collaborator editor with:

```text
inserted paragraph
moved paragraph
moved paragraph
```

while the primary side had:

```text
inserted paragraph
displaced sibling paragraph
moved paragraph
```

This pass did not find evidence for a readiness wait, locator failure,
malformed generated spec, environment failure, inverted assertion, or expected
behavior.

`origin/trunk` remains:

```text
1e87b2cd7874aaf9df553db901fe395d6a96a0a2
```

The PR branch remains based directly on that trunk and keeps the requested
commit order:

```text
24391737982 Add CRDT repros for RTC adjacent move identity rewrite
441db69f8ab Add RTC top-level move Playwright repro
ac313a81d9a Avoid rewriting CRDT block records for pure moves
```

Pass 121 added value is a fresh verification that the existing branch, fix, and
video still satisfy the requested standard. A new known-fixes worktree was
created at:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-121/work/5ee0-knownfix-testonly
```

with only the repro commit cherry-picked onto
`3cba2b1e56a98787de08dc6c7df2434759e8f908`. The known-fixes base still fails
below Playwright:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='replays the generated structural edit sequence|does not morph post-entrypoint'
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='does not rewrite block records when moving adjacent top-level blocks|represents adjacent pure moves as structural array changes|represents non-adjacent pure moves as structural array changes'
```

Results: the post-sync entrypoint failed with nested remote events
`["YMap", "YMap", "YText", "YText"]`; the direct block helper failed with
nested `YMap`/`YText` events for adjacent and non-adjacent pure moves; and the
captured `moved-block` Y.Map was rewritten into the displaced sibling paragraph.

The branch-prefix control at `441db69f8ab1eb2d6e154c80524f354c99f872ce`
failed the same selected tests before the fix commit. At fixed head
`ac313a81d9a5d2549c32ad95a4c383aaff434686`, pass 121 reran:

```bash
git diff --check origin/trunk..HEAD
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-121/5ee0-playwright-fixed-artifacts RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: `git diff --check` was clean; `crdt-post-block-move.ts` passed `6/6`;
`crdt-blocks.ts` passed `74/74`; targeted JS lint passed; and the natural-user
Playwright repro passed headlessly in `22.7s`.

Pass 121 video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-121/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass121-verified-annotated.mp4
```

Video validation: H.264, `1920x1080`, `18.0s`, `568349` bytes. It is a
headless annotated copy of the stitched proof with a pass-121 verification
overlay; it preserves the archived failed editor screens, action log, negative
controls, fixed-branch verification, and build caveat.

## Pass 122 Verification

Pass 122 independently re-read the source row, source log, generated source
spec, archived error context, trace zip, implementation, upstream PR metadata,
previous pass summary, fixed branch, and video artifact. It extracted the trace
action stream directly from `test.trace`; the failed run created a normal draft
post and then completed these editor UI actions before the assertion:

```text
Click Seed 950301 multibyte heading
Click Block tools > Options
Click Delete
Click Emoji and multibyte
Click Block tools > Options
Click Add before
Type RTC ec47 realistic inserted paragraph 1
Click Emoji and multibyte
Click Block tools > Move down
```

The trace error then records the same semantic split after the 20s convergence
wait: primary `inserted, displaced sibling, moved paragraph`; collaborator
`inserted, moved paragraph, moved paragraph`. That gives this pass an
independent trace-level check that the source failure is not a malformed spec,
readiness wait, locator problem, environment failure, inverted assertion, or
expected behavior.

Pass 122 also refreshed upstream origin metadata with the GitHub connector:
PR [#72262](https://github.com/WordPress/gutenberg/pull/72262) introduced the
recursive CRDT post/block merge logic and merged as
`84019935998c16f877e976ad85e84748355d7282` on `2025-10-14T17:38:19Z`; PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923) expanded
`mergeCrdtBlocks()` tests and merged as
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104` on `2026-02-25T22:17:47Z`.
The latter covered final content but not Yjs event shape or record identity for
strict pure moves, so the positional-record-rewrite failure remained untested.

`origin/trunk` remains:

```text
1e87b2cd7874aaf9df553db901fe395d6a96a0a2
```

The PR branch remains based directly on that trunk and keeps the requested
three-commit order:

```text
24391737982 Add CRDT repros for RTC adjacent move identity rewrite
441db69f8ab Add RTC top-level move Playwright repro
ac313a81d9a Avoid rewriting CRDT block records for pure moves
```

Pass 122 known-fixes negative control was run in:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-122/work/5ee0-knownfix-testonly
```

with only the repro commit cherry-picked onto
`3cba2b1e56a98787de08dc6c7df2434759e8f908`. The known-fixes base still fails
below Playwright:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='replays the generated structural edit sequence|does not morph post-entrypoint'
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='does not rewrite block records when moving adjacent top-level blocks|represents adjacent pure moves as structural array changes|represents non-adjacent pure moves as structural array changes'
```

Results: the post-sync entrypoint failed with nested remote events
`["YMap", "YMap", "YText", "YText"]`; direct block merge failed with nested
`YMap`/`YText` events for adjacent and non-adjacent pure moves; and the
captured `moved-block` Y.Map was rewritten into the displaced sibling paragraph.

Pass 122 fixed-branch verification at
`ac313a81d9a5d2549c32ad95a4c383aaff434686`:

```bash
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-122/5ee0-playwright-fixed-artifacts RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
git diff --check origin/trunk..HEAD
```

Results: wp-env was running at `http://localhost:9900`;
`crdt-post-block-move.ts` passed `6/6`; `crdt-blocks.ts` passed `74/74`;
targeted JS lint exited `0`; the natural-user Playwright repro passed
headlessly in `22.7s`; and `git diff --check` was clean.

Pass 122 video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-122/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass122-verified-annotated.mp4
```

Video validation: H.264, `1920x1080`, `18.0s`, `561805` bytes. It is a
headless annotated copy of the stitched proof with a pass-122 verification
overlay; it preserves the archived failed editor screens, action log, negative
controls, fixed-branch verification, and build caveat.

## Pass 123 Verification

Pass 123 independently re-read the source JSONL row, generated source spec,
source failure log, error context, screenshots, trace zip, implementation,
branch contents, previous pass summary, and upstream origin metadata. It
re-extracted the trace action stream and again found only normal editor actions
before the failure:

```text
REST create draft post with valid serialized blocks
primary: click heading, Block tools > Options, Delete
collaborator: click paragraph, Block tools > Options, Add before, type inserted paragraph
primary: click original paragraph, Block tools > Move down
```

The archived failure remains a semantic convergence split after those actions,
not a readiness, locator, malformed spec, environment, inverted assertion, or
expected-behavior failure:

```text
primary:      inserted paragraph, displaced sibling paragraph, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

Pass 123 refreshed the origin proof locally with `git blame`, `git log`, and
`git show`, and with GitHub PR metadata. PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262) introduced the
recursive CRDT block merge path as
`84019935998c16f877e976ad85e84748355d7282` on `2025-10-14T17:38:19Z`. PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923) expanded
`mergeCrdtBlocks()` tests as
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104` on `2026-02-25T22:17:47Z`, but
still did not assert record identity or Yjs event shape for pure moves.

`origin/trunk` still resolves to:

```text
1e87b2cd7874aaf9df553db901fe395d6a96a0a2
```

The PR branch still has the required three-commit order:

```text
24391737982 Add CRDT repros for RTC adjacent move identity rewrite
441db69f8ab Add RTC top-level move Playwright repro
ac313a81d9a Avoid rewriting CRDT block records for pure moves
```

Pass 123 known-fixes negative control was run in:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-123/work/knownfix-testonly.bAwcOm/repo
```

with only repro commit `24391737982` cherry-picked onto
`3cba2b1e56a98787de08dc6c7df2434759e8f908`. The post-sync tests failed with
nested remote events:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

The direct block tests also failed, including adjacent pure move event shape:

```text
Expected: []
Received: ["YMap", "YText", "YMap", "YText"]
```

and the captured moved Y.Map was rewritten to the displaced sibling paragraph.
That reconfirms the known-fixes base does not contain this fix.

Pass 123 fixed-branch verification at
`ac313a81d9a5d2549c32ad95a4c383aaff434686`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-123/5ee0-playwright-fixed-artifacts RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: `crdt-post-block-move.ts` passed `6/6`; `crdt-blocks.ts` passed
`74/74`; targeted JS lint exited `0`; `git diff --check` was clean; wp-env
reported the correct worktree running at `http://localhost:9900`; and the
natural-user Playwright repro passed headlessly in `22.1s`.

Pass 123 video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-123/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass123-verified-annotated.mp4
```

Video validation: H.264, `1920x1080`, `18.0s`, `573309` bytes. The extracted
frame shows the pass-123 overlay, archived failed editor screens, action log,
negative controls, fixed-branch verification, and build caveat.

## Pass 124 Verification

Pass 124 independently re-read the source JSONL row, generated source spec,
failure error context, previous summary, fixed branch, and vulnerable
`mergeCrdtBlocks()` path. The archived source artifact still shows a normal
editor state split after convergence, not a readiness, locator, generated-spec,
environment, expected-behavior, or inverted-assertion issue:

```text
primary:      inserted paragraph, displaced sibling paragraph, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

The PR branch remains based directly on current `origin/trunk`:

```text
origin/trunk = 1e87b2cd7874aaf9df553db901fe395d6a96a0a2
merge-base = 1e87b2cd7874aaf9df553db901fe395d6a96a0a2
rev-list origin/trunk...HEAD = 0 3
```

It still has the requested commit order:

```text
24391737982 Add CRDT repros for RTC adjacent move identity rewrite
441db69f8ab Add RTC top-level move Playwright repro
ac313a81d9a Avoid rewriting CRDT block records for pure moves
```

Pass 124 fixed-branch verification at
`ac313a81d9a5d2549c32ad95a4c383aaff434686`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-124/5ee0-playwright-fixed-artifacts RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: `crdt-post-block-move.ts` passed `6/6`; `crdt-blocks.ts` passed
`74/74`; targeted JS lint exited `0`; `git diff --check` was clean; wp-env
reported the requested `http://localhost:9900` URL; and the natural-user
Playwright repro passed headlessly in `22.1s`.

Pass 124 known-fixes negative control used a fresh detached worktree at
`3cba2b1e56a98787de08dc6c7df2434759e8f908` with only repro commit
`24391737982` cherry-picked:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-124/work-knownfix.xjde7h/repo
```

Commands:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='replays the generated structural edit sequence|does not morph post-entrypoint'
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='does not rewrite block records when moving adjacent top-level blocks|represents adjacent pure moves as structural array changes|represents non-adjacent pure moves as structural array changes'
```

Results: both failed below Playwright. The post-sync entrypoint emitted nested
remote targets:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

The direct block helper emitted nested targets for adjacent and non-adjacent
pure moves:

```text
adjacent pure move:     ["YMap", "YText", "YMap", "YText"]
non-adjacent pure move: ["YMap", "YText", "YMap", "YText", "YMap", "YText"]
```

Both entrypoints also proved record morphing: the captured `moved-block`
Y.Map contained the displaced sibling paragraph after the old positional
rewrite. That is pass 124's added value: a fresh verification that the existing
branch, fix, and video still satisfy the requested standard on the current
trunk base and that the known-fixes base still lacks the fix at both CRDT
entrypoints.

Pass 124 video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-124/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass124-verified-annotated.mp4
```

Video validation: H.264, `1920x1080`, `18.0s`, `595232` bytes. The extracted
frame shows the pass-124 overlay, archived failed editor screens, action log,
known-fixes negative controls, fixed-branch verification, and build caveat.

## Pass 125 Verification

Pass 125 re-read the source result row, generated spec, archived failure log,
Playwright error context, screenshots, trace metadata, fix branch, and origin
commits. It did not find a readiness wait, locator error, malformed spec,
environment failure, inverted assertion, or expected-behavior explanation.

The existing PR branch still satisfies the requested standard on the current
`origin/trunk` base:

```text
origin/trunk = 1e87b2cd7874aaf9df553db901fe395d6a96a0a2
merge-base = 1e87b2cd7874aaf9df553db901fe395d6a96a0a2
rev-list origin/trunk...HEAD = 0 3
```

Fresh fixed-branch verification:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-125/5ee0-playwright-fixed-artifacts RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: `crdt-post-block-move.ts` passed `6/6`; `crdt-blocks.ts` passed
`74/74`; targeted JS lint exited `0`; wp-env was running at
`http://localhost:9900`; and the natural-user Playwright repro passed
headlessly in `23.3s`.

Pass 125 also created a fresh known-fixes test-only worktree at
`3cba2b1e56a98787de08dc6c7df2434759e8f908` with only repro commit
`24391737982` cherry-picked:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-125/work/knownfix-testonly.mDyn4O/repo
```

The post-sync repro still failed below Playwright with nested remote CRDT
record edits:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

The direct `mergeCrdtBlocks()` repro still failed with nested `YMap`/`YText`
events for adjacent and non-adjacent pure moves, and the captured moved record
was still morphed into the displaced sibling paragraph. This is pass 125's
added value: a fresh verification that the existing branch, video, and fix
remain sufficient, plus a current known-fixes negative control that rules out
the bug being fixed by the known-fixes base.

Pass 125 video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-125/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass125-verified-annotated.mp4
```

Video validation: H.264, `1920x1080`, `18.0s`, `573598` bytes.

## Pass 126 Verification

Pass 126 independently re-read the source result row, generated source spec,
archived failure log, error-context snapshot, screenshots, trace metadata, fix
branch, and origin commits. The failure is still classified as a product bug:
the generated spec uses valid serialized heading/paragraph blocks and ordinary
editor controls, and the archived run failed after explicit convergence waits
with primary `inserted, displaced sibling, moved paragraph` and collaborator
`inserted, moved paragraph, moved paragraph`.

Fresh branch-state verification:

```bash
git fetch origin trunk
git rev-parse origin/trunk FETCH_HEAD
git -C /Users/danluu/dev/fuzz/gutenberg-bug-5ee0be2f9b7d rev-parse origin/trunk HEAD
git -C /Users/danluu/dev/fuzz/gutenberg-bug-5ee0be2f9b7d merge-base origin/trunk HEAD
git -C /Users/danluu/dev/fuzz/gutenberg-bug-5ee0be2f9b7d rev-list --left-right --count origin/trunk...HEAD
git -C /Users/danluu/dev/fuzz/gutenberg-bug-5ee0be2f9b7d log --oneline --reverse origin/trunk..HEAD
```

Results: `origin/trunk` and `FETCH_HEAD` were both
`1e87b2cd7874aaf9df553db901fe395d6a96a0a2`; the PR branch head was
`ac313a81d9a5d2549c32ad95a4c383aaff434686`; the merge-base was exactly
`origin/trunk`; `rev-list` was `0 3`; and the commit order remained:

```text
24391737982 Add CRDT repros for RTC adjacent move identity rewrite
441db69f8ab Add RTC top-level move Playwright repro
ac313a81d9a Avoid rewriting CRDT block records for pure moves
```

Pass 126 added a current-prefix negative control that was not just another
known-fixes rerun. A detached worktree at the PR branch's pre-fix browser-repro
commit `441db69f8ab1eb2d6e154c80524f354c99f872ce` failed below Playwright:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-126/work/current-prefix-no-fix.d9dXxz/repo
```

Commands:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='replays the generated structural edit sequence|does not morph post-entrypoint'
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='does not rewrite block records when moving adjacent top-level blocks|represents adjacent pure moves as structural array changes|represents non-adjacent pure moves as structural array changes'
```

Results: the post-entrypoint tests failed `2/2` selected tests. The generated
structural edit sequence emitted nested remote CRDT targets instead of a pure
array change:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

The captured moved record was morphed into the displaced sibling:

```text
Expected value: "Another paragraph exists so the top-level list is not degenerate."
Received array: [undefined, "Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا."]
```

The direct `mergeCrdtBlocks()` tests failed `3/3` selected tests. Adjacent
pure moves emitted `["YMap", "YText", "YMap", "YText"]`; non-adjacent pure
moves emitted `["YMap", "YText", "YMap", "YText", "YMap", "YText"]`; and the
record-morphing assertion failed in the same way. This proves the fix commit,
not just the repro commits, is what removes the low-level defect on the current
PR branch base.

Known-fixes base was also reconfirmed in pass 126 with a fresh detached
worktree at `3cba2b1e56a98787de08dc6c7df2434759e8f908` and only the low-level
repro commit `24391737982366d9103c3cb38f5c018d27c7512c` cherry-picked:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-126/work/knownfix-testonly.yC5kIt/repo
```

The same targeted post-entrypoint and direct-helper commands failed there too.
The post-entrypoint failure again reported nested
`["YMap", "YMap", "YText", "YText"]` targets and record morphing; direct
`mergeCrdtBlocks()` failed with nested `YMap`/`YText` targets for adjacent and
non-adjacent pure moves. This is the pass-126 known-fixes negative control.

Fixed-branch verification at `ac313a81d9a5d2549c32ad95a4c383aaff434686`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-126/5ee0-playwright-fixed-artifacts RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: `crdt-post-block-move.ts` passed `6/6`; `crdt-blocks.ts` passed
`74/74`; targeted JS lint exited `0`; wp-env reported `status: running` for
the 5ee0 worktree at `http://localhost:9900`; and the natural-user Playwright
repro passed headlessly in `22.4s`.

Pass 126 refreshed the origin proof with `git show`, `git blame`, `git log`,
and GitHub metadata for PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262) and PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923). PR #72262
introduced `packages/core-data/src/utils/crdt-blocks.ts` and the left/right
positional update algorithm. PR #75923 expanded edge-case testing but still
tested final content rather than record identity or remote Yjs event shape for
strict pure moves. The missing invariant was that a same-ID, same-payload
reorder must not be encoded as nested record/text rewrites.

Pass 126 video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-126/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass126-verified-annotated.mp4
```

Video validation: H.264, `1920x1080`, `18.0s`, `561982` bytes. The extracted
frame shows the pass-126 overlay, archived primary and collaborator failure
screens, action-log summary, current-prefix negative control, known-fixes
negative control, and fixed-branch verification.

Pass 127 independently re-read the pass-126 summary, source result row,
generated source spec, source log, error-context snapshot, archived failure
screenshots, current PR branch, and CRDT block code. The classification remains
a real product bug: the source run failed after ordinary editor actions and a
final convergence wait, with primary `inserted, displaced sibling, moved` and
collaborator `inserted, moved, moved`.

Pass 127 added a fresh current-PR-prefix negative control at
`441db69f8ab1eb2d6e154c80524f354c99f872ce`, the requested PR branch prefix
after both repro commits and before the fix commit:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-127/work/current-prefix-no-fix.zYDQca/repo
```

Commands:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='replays the generated structural edit sequence|does not morph post-entrypoint|applies adjacent pure block moves to remote peers'
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='does not rewrite block records when moving adjacent top-level blocks|represents adjacent pure moves as structural array changes|represents non-adjacent pure moves as structural array changes'
```

Results: the post-entrypoint tests failed `3/3` selected tests before the fix.
Remote observers saw nested `["YMap", "YMap", "YText", "YText"]` targets for a
pure move, and the captured moved post-entrypoint record was rewritten into
the displaced sibling. Direct `mergeCrdtBlocks()` failed `3/3` selected tests:
adjacent pure moves emitted `["YMap", "YText", "YMap", "YText"]`, non-adjacent
pure moves emitted `["YMap", "YText", "YMap", "YText", "YMap", "YText"]`, and
the direct record-morphing assertion failed in the same way. This ties the
defect to the exact current three-commit PR branch order.

Pass 127 also created a fresh known-fixes negative-control worktree at
`3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only repro commit
`24391737982366d9103c3cb38f5c018d27c7512c` cherry-picked:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-127/work/knownfix-testonly.JNwRKZ/repo
```

The same two targeted commands failed there too. The post-entrypoint remote
observer again saw nested `["YMap", "YMap", "YText", "YText"]` targets and
record morphing; direct `mergeCrdtBlocks()` again emitted nested `YMap`/`YText`
targets for adjacent and non-adjacent pure moves. This confirms the
known-fixes base still lacks the product fix below Playwright.

Pass 127 fixed-branch verification at
`ac313a81d9a5d2549c32ad95a4c383aaff434686`, based on `origin/trunk` at
`1e87b2cd7874aaf9df553db901fe395d6a96a0a2`:

```bash
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='adjacent|structural array changes|record'
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-127/artifacts-fixed RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: wp-env was running for this worktree at configured URL
`http://localhost:9900`; `crdt-post-block-move.ts` passed `6/6`; focused
`crdt-blocks.ts` passed `3` selected tests; full `crdt-blocks.ts` passed
`74/74`; targeted JS lint exited `0`; and the natural-user Playwright repro
passed headlessly in `22.5s`.

Pass 127 attempted one fresh known-fixes browser negative-control setup in the
archived HTTP worktree. `wp-env status` reported the environment was not
initialized on port `9903`; `wp-env start` first failed with Docker address
pool exhaustion, and the explicit-subnet retry failed before WordPress boot
with `fatal: You are on a branch yet to be born`. That run is classified as an
environment/setup failure and is not used as product evidence. The source
browser failure, the fresh current-prefix failures, and the fresh known-fixes
below-Playwright failures remain the product evidence.

Pass 127 refreshed origin metadata using local git and the GitHub API. PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262) is closed/merged,
title `Improve CRDT "merge logic" for post entities`, merged
`2025-10-14T17:38:19Z`, merge commit
`84019935998c16f877e976ad85e84748355d7282`. PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923) is closed/merged,
title `Real-time collaboration: Expand mergeCrdtBlocks() automated testing`,
merged `2026-02-25T22:17:47Z`, merge commit
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104`. The GitHub MCP connector timed
out in this pass, so the pass-127 PR metadata comes from the public GitHub API
plus local `git show`, `git blame`, and `git log`.

Pass 127 video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-127/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass127-verified-annotated.mp4
```

Video validation: H.264, `1920x1080`, `18.0s`, `540` frames, `574735` bytes.
The extracted frame shows the pass-127 overlay, archived primary and
collaborator failure screens, action-log summary, prefix negative control,
known-fixes negative control, fixed-branch verification, and the known-fixes
browser setup caveat.

## Pass 128 Verification

Pass 128 re-read the pass-127 summary, source result row, generated source
spec, archived failure log, error-context snapshot, screenshot metadata, trace
archive listing, PR branch, CRDT merge code, and origin commits. The failure is
still classified as a product bug: the source browser run completed ordinary
editor actions, did not time out, and failed only after a final convergence
wait with primary `inserted, displaced sibling, moved paragraph` and
collaborator `inserted, moved paragraph, moved paragraph`.

This pass adds a fresh verification that the existing branches, video standard,
and fix already satisfy the requested three-commit repro/repro/fix standard on
the current local `origin/trunk`:

```text
origin/trunk = 1e87b2cd7874aaf9df553db901fe395d6a96a0a2
PR branch = ac313a81d9a5d2549c32ad95a4c383aaff434686
merge-base = 1e87b2cd7874aaf9df553db901fe395d6a96a0a2
rev-list origin/trunk...HEAD = 0 3
```

Commit order remains:

```text
24391737982 Add CRDT repros for RTC adjacent move identity rewrite
441db69f8ab Add RTC top-level move Playwright repro
ac313a81d9a Avoid rewriting CRDT block records for pure moves
```

Fresh current-prefix negative control at the exact PR branch prefix before the
fix commit:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-128/work/current-prefix-no-fix.AXrGjO/repo
```

Commands:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='replays the generated structural edit sequence|does not morph post-entrypoint|applies adjacent pure block moves to remote peers'
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='does not rewrite block records when moving adjacent top-level blocks|represents adjacent pure moves as structural array changes|represents non-adjacent pure moves as structural array changes'
```

Results: the post-entrypoint test command failed `3/3` selected tests. Remote
observers saw nested `["YMap", "YMap", "YText", "YText"]` targets for a pure
move, and the captured moved post-entrypoint record was rewritten into the
displaced sibling. Direct `mergeCrdtBlocks()` failed `3/3` selected tests:
adjacent pure moves emitted nested `["YMap", "YText", "YMap", "YText"]`,
non-adjacent pure moves emitted
`["YMap", "YText", "YMap", "YText", "YMap", "YText"]`, and the direct
record-morphing assertion failed in the same way.

Fresh known-fixes negative control at
`3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only low-level repro commit
`24391737982366d9103c3cb38f5c018d27c7512c` cherry-picked:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-128/work/knownfix-testonly.6ryeqK/repo
```

The same two targeted commands failed there too. The post-entrypoint observer
again saw nested `["YMap", "YMap", "YText", "YText"]` targets and record
morphing; direct `mergeCrdtBlocks()` again emitted nested `YMap`/`YText`
targets for adjacent and non-adjacent pure moves. This reconfirms that the
known-fixes base still lacks the product fix below Playwright.

Fixed-branch verification at
`ac313a81d9a5d2549c32ad95a4c383aaff434686`:

```bash
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-128/artifacts-fixed RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: wp-env reported `status: running` for this worktree with configured
URL `http://localhost:9900`; `crdt-post-block-move.ts` passed `6/6`;
`crdt-blocks.ts` passed `74/74`; targeted JS lint exited `0`; and the
natural-user Playwright repro passed headlessly in `22.6s`.

Pass 128 refreshed origin metadata with local `git show`, `git blame`, `git
log`, and the GitHub REST API. `gh` was not installed. PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262) is closed/merged,
title `Improve CRDT "merge logic" for post entities`, merged
`2025-10-14T17:38:19Z`, merge commit
`84019935998c16f877e976ad85e84748355d7282`. PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923) is closed/merged,
title `Real-time collaboration: Expand mergeCrdtBlocks() automated testing`,
merged `2026-02-25T22:17:47Z`, merge commit
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104`.

Pass 128 video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-128/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass128-verified-annotated.mp4
```

Video validation: H.264, `1920x1080`, `18.0s`, `540` frames, `565653` bytes.
The extracted frame shows the pass-128 overlay, archived primary and
collaborator failure screens, action-log summary, fresh prefix negative
control, fresh known-fixes negative control, fixed-branch verification, and
branch/video standard revalidation.

## Pass 129 Verification

Pass 129 independently re-read the pass-128 summary, source manifest row,
generated source spec, archived failure log, error-context snapshot,
screenshots, trace archive listing, PR branch, and CRDT merge code. The
classification remains a product bug. The archived browser failure happened
after ordinary editor actions and produced a semantic split: primary
`inserted, displaced sibling, moved paragraph`; collaborator
`inserted, moved paragraph, moved paragraph`.

The added pass-129 evidence is a narrower root-cause proof: at the PR branch
prefix before the fix commit, the same generated sequence reaches
`mergeCrdtBlocks()` with the same-length reordered slice
`[inserted, moved, displaced] -> [inserted, displaced, moved]`. In the
pre-fix source, after the left/right sweep calculates `numOfUpdatesNeeded = 2`,
the unconditional positional update loop starts at old lines 494-620 and
mutates each existing Y.Map in place. That loop sets `clientId`, `attributes`,
and nested `Y.Text` content on the records currently occupying positions 1 and
2. This is the exact record-morphing mechanism seen in the failure: the
original moved paragraph record is rewritten into the displaced sibling, and
the replicated nested edits can leave a remote peer with two moved paragraphs.

Fresh current-prefix negative control at
`441db69f8ab1eb2d6e154c80524f354c99f872ce`, before the fix commit:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-129/work/current-prefix-no-fix
```

Commands:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='replays the generated structural edit sequence|does not morph post-entrypoint|applies adjacent pure block moves to remote peers'
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='does not rewrite block records when moving adjacent top-level blocks|represents adjacent pure moves as structural array changes|represents non-adjacent pure moves as structural array changes'
```

Results: the post-entrypoint command failed `3/3` selected tests. Remote
observers saw nested `["YMap", "YMap", "YText", "YText"]` targets for a pure
move, the generated structural sequence emitted the same nested target shape,
and the captured moved record was rewritten into the displaced sibling. Direct
`mergeCrdtBlocks()` also failed `3/3` selected tests: adjacent pure moves
emitted nested `["YMap", "YText", "YMap", "YText"]`, non-adjacent pure moves
emitted `["YMap", "YText", "YMap", "YText", "YMap", "YText"]`, and the
record-morphing assertion failed.

Fresh known-fixes negative control at
`3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only repro commit
`24391737982366d9103c3cb38f5c018d27c7512c` cherry-picked:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-129/work/knownfix-testonly
```

The same two targeted commands failed there as well. This independently
reconfirms that the known-fixes base does not include the product fix below
Playwright.

Fixed-branch verification at
`ac313a81d9a5d2549c32ad95a4c383aaff434686`, based on
`origin/trunk = 1e87b2cd7874aaf9df553db901fe395d6a96a0a2`:

```text
merge-base origin/trunk HEAD = 1e87b2cd7874aaf9df553db901fe395d6a96a0a2
rev-list origin/trunk...HEAD = 0 3
```

Commit order remains:

```text
24391737982 Add CRDT repros for RTC adjacent move identity rewrite
441db69f8ab Add RTC top-level move Playwright repro
ac313a81d9a Avoid rewriting CRDT block records for pure moves
```

Fixed-branch commands:

```bash
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
git diff --check origin/trunk..HEAD
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-129/artifacts-fixed RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: `wp-env` reported `status: running` at `http://localhost:9900`;
`git diff --check` was clean; `crdt-post-block-move.ts` passed `6/6`;
`crdt-blocks.ts` passed `74/74`; targeted JS lint exited `0`; and the
natural-user Playwright repro passed headlessly in `22.7s`.

Pass 129 refreshed origin evidence with `git log`, `git blame`, `git show`,
and the GitHub REST API. `84019935998c16f877e976ad85e84748355d7282`, PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262), introduced
`packages/core-data/src/utils/crdt-blocks.ts` and the positional update loop.
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104`, PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923), expanded CRDT
block tests but still did not assert Yjs record identity or mutation shape for
strict pure moves.

Pass 129 video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-129/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass129-verified-annotated.mp4
```

Video validation: H.264, `1920x1080`, `18.0s`, `540` frames, `542775` bytes.
The extracted frame shows the pass-129 overlay, archived primary and
collaborator failure screens, action-log summary, fresh prefix negative
control, fresh known-fixes negative control, fixed-branch verification, and
the narrower positional-update-loop root-cause proof.

## Pass 130 Verification

Pass 130 re-read the pass-129 summary, source manifest row, source generated
spec, archived failure log, error-context snapshot, screenshots, trace archive
listing, PR branch, CRDT block code, and origin metadata. The classification
remains unchanged: this is a product bug in CRDT block reconciliation, not a
readiness wait, locator issue, malformed spec, environment failure, inverted
assertion, or expected behavior.

The archived browser failure still shows normal editor actions followed by a
semantic convergence split. The source run was not timed out
(`exitCode=1`, `timedOut=false`), and the final states were primary
`inserted, displaced sibling, moved paragraph` versus collaborator
`inserted, moved paragraph, moved paragraph`.

Pass 130 adds a fresh verification that the existing branches, video artifact,
and fix still satisfy the requested repro/repro/fix standard on the current
local `origin/trunk`:

```text
origin/trunk = 1e87b2cd7874aaf9df553db901fe395d6a96a0a2
FETCH_HEAD = 1e87b2cd7874aaf9df553db901fe395d6a96a0a2
PR branch = ac313a81d9a5d2549c32ad95a4c383aaff434686
merge-base origin/trunk HEAD = 1e87b2cd7874aaf9df553db901fe395d6a96a0a2
rev-list origin/trunk...HEAD = 0 3
```

Commit order remains:

```text
24391737982 Add CRDT repros for RTC adjacent move identity rewrite
441db69f8ab Add RTC top-level move Playwright repro
ac313a81d9a Avoid rewriting CRDT block records for pure moves
```

Fresh current-prefix negative control at
`441db69f8ab1eb2d6e154c80524f354c99f872ce`, before the fix commit:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-130/work/current-prefix-no-fix
```

Commands:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='replays the generated structural edit sequence|does not morph post-entrypoint|applies adjacent pure block moves to remote peers'
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='does not rewrite block records when moving adjacent top-level blocks|represents adjacent pure moves as structural array changes|represents non-adjacent pure moves as structural array changes'
```

Results: the post-entrypoint command failed `3/3` selected tests. Remote
observers saw nested `["YMap", "YMap", "YText", "YText"]` targets, and the
captured moved post-entrypoint record was rewritten into the displaced
sibling. Direct `mergeCrdtBlocks()` failed `3/3` selected tests; adjacent pure
moves emitted nested `["YMap", "YText", "YMap", "YText"]`, non-adjacent pure
moves emitted `["YMap", "YText", "YMap", "YText", "YMap", "YText"]`, and the
record-morphing assertion failed.

Fresh known-fixes negative control at
`3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only repro commit
`24391737982366d9103c3cb38f5c018d27c7512c` cherry-picked:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-130/work/knownfix-testonly
```

The same two targeted commands failed there as well. This reconfirms that the
known-fixes base still lacks the product fix below Playwright.

Fixed-branch verification at
`ac313a81d9a5d2549c32ad95a4c383aaff434686`:

```bash
git fetch origin trunk
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-130/artifacts-fixed RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: `git diff --check` was clean; `wp-env` reported `status: running`
with URL `http://localhost:9900`; `crdt-post-block-move.ts` passed `6/6`;
`crdt-blocks.ts` passed `74/74`; targeted JS lint exited `0`; and the
natural-user Playwright repro passed headlessly in `24.5s`.

Pass 130 refreshed origin evidence with `git log`, `git blame`, `git show`,
and the GitHub REST API because `gh` is not installed. PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262) remains the
introducing merge commit for `crdt-blocks.ts` and the positional update loop:
`84019935998c16f877e976ad85e84748355d7282`, merged
`2025-10-14T17:38:19Z`. PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923) expanded tests at
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104`, merged
`2026-02-25T22:17:47Z`, but still did not assert Yjs record identity or pure
move mutation shape.

Pass 130 video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-130/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass130-verified-annotated.mp4
```

Video validation: H.264, `1920x1080`, `18.0s`, `540` frames, `553255` bytes.
The extracted frame shows the pass-130 overlay over the stitched evidence:
archived primary and collaborator failure screens, low-level negative
controls, fixed-branch verification, and the three-commit branch standard.

## Pass 131 Verification

Pass 131 rechecked the source artifact, branch topology, pre-fix/test-only
failures, known-fixes negative control, fixed branch, and video evidence
without changing the PR branch.

The archived source failure is still a real product failure: ordinary editor
actions completed and the failure occurred only after convergence reported
primary `inserted, displaced, moved` versus collaborator
`inserted, moved, moved`.

After `git fetch origin trunk`, the PR branch remained exactly
`origin/trunk + 3`:

```text
24391737982 Add CRDT repros for RTC adjacent move identity rewrite
441db69f8ab Add RTC top-level move Playwright repro
ac313a81d9a Avoid rewriting CRDT block records for pure moves
```

`origin/trunk`, `FETCH_HEAD`, and the PR branch merge-base were all
`1e87b2cd7874aaf9df553db901fe395d6a96a0a2`; `rev-list --left-right --count`
reported `0 3`, and `git diff --check origin/trunk..HEAD` was clean.

Pass 131 reran the same targeted current-prefix and known-fixes test-only
negative controls used in pass 130. Both still failed below Playwright. The
post-entrypoint tests emitted nested `YMap/YMap/YText/YText` remote observer
targets and the direct `mergeCrdtBlocks()` tests emitted nested
`YMap/YText/...` targets. The record-identity assertions also failed because
the captured moved Y.Map was morphed into the displaced sibling before the
fix.

Fixed-branch verification at
`ac313a81d9a5d2549c32ad95a4c383aaff434686`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-131/artifacts-fixed RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the post-entrypoint repro suite passed `6/6`, full `crdt-blocks.ts`
passed `74/74`, targeted JS lint exited `0`, and the natural-user Playwright
repro passed headlessly in `22.4s`.

Pass 131 video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-131/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass131-verified-annotated.mp4
```

Video validation: H.264, `1920x1080`, `24.0s`, `720` frames, `473253` bytes.
The extracted frame shows the archived primary and collaborator final screens,
the natural UI action route, the convergence split, pass-131 negative controls,
and fixed-branch verification.

## Pass 132 Verification

Pass 132 independently re-read the pass-131 summary, source manifest row,
generated source spec, archived failure log, error-context snapshot,
screenshots, trace archive, current PR branch, CRDT block merge code, and
origin history. The classification remains unchanged: the archived run used
ordinary editor UI actions and failed after convergence with a semantic product
state split, not a timeout, locator miss, malformed generated spec,
environment failure, inverted assertion, or expected behavior.

The source screenshots still show:

```text
primary:      inserted paragraph, displaced sibling paragraph, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

Pass 132 added a fresh known-fixes negative control below Playwright. A new
test-only worktree was created at known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only repro commit
`24391737982366d9103c3cb38f5c018d27c7512c` cherry-picked:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-132/work/knownfix-testonly
```

Known-fixes commands:

```bash
git worktree add --detach /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-132/work/knownfix-testonly 3cba2b1e56a98787de08dc6c7df2434759e8f908
git cherry-pick 24391737982366d9103c3cb38f5c018d27c7512c
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --testNamePattern='replays the generated structural edit sequence|does not morph post-entrypoint|applies adjacent pure block moves to remote peers'
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='does not rewrite block records when moving adjacent top-level blocks|represents adjacent pure moves as structural array changes|represents non-adjacent pure moves as structural array changes'
```

Results: both commands failed before the fix. The post-entrypoint remote
observer saw nested `YMap`, `YMap`, `YText`, `YText` targets, the generated
structural-edit replay saw the same nested target shape, and the
post-entrypoint record-morphing assertion showed the captured moved record had
the displaced sibling content. The direct `mergeCrdtBlocks()` tests failed
with nested `YMap`, `YText`, `YMap`, `YText` targets for the adjacent pure
move, nested `YMap`, `YText`, `YMap`, `YText`, `YMap`, `YText` targets for a
non-adjacent pure move, and the same adjacent-record morphing proof.

Fixed-branch verification at
`ac313a81d9a5d2549c32ad95a4c383aaff434686`, based on
`origin/trunk = 1e87b2cd7874aaf9df553db901fe395d6a96a0a2`:

```text
merge-base origin/trunk HEAD = 1e87b2cd7874aaf9df553db901fe395d6a96a0a2
rev-list origin/trunk...HEAD = 0 3
```

Commit order remains:

```text
24391737982 Add CRDT repros for RTC adjacent move identity rewrite
441db69f8ab Add RTC top-level move Playwright repro
ac313a81d9a Avoid rewriting CRDT block records for pure moves
```

Fixed-branch commands:

```bash
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
git diff --check origin/trunk..HEAD
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-132/artifacts-fixed RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
npm run build
```

Results: `wp-env` was already running at `http://localhost:9900`;
`git diff --check` was clean; `crdt-post-block-move.ts` passed `6/6`; full
`crdt-blocks.ts` passed `74/74`; targeted JS lint exited `0`; and the
natural-user Playwright repro passed headlessly in `22.5s`. `npm run build`
completed JS and PHP builds but then failed in the unrelated theme primitive
color-token generator with `TypeError: [object Object] is not a valid color
space`; the branch diff does not touch the theme generator or dependency
metadata, and the build left the worktree clean.

Pass 132 refreshed origin evidence with `git log`, `git blame`, `git show`,
and GitHub connector metadata. PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262) introduced
`crdt-blocks.ts` and the positional update loop as merge commit
`84019935998c16f877e976ad85e84748355d7282`, merged
`2025-10-14T17:38:19Z`. PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923) expanded
`mergeCrdtBlocks()` tests as merge commit
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104`, merged
`2026-02-25T22:17:47Z`, but still did not assert Yjs record identity or pure
move mutation shape.

Pass 132 video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-132/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass132-verified-annotated.mp4
```

Video validation: H.264, `1920x1080`, `24.0s`, `720` frames, `434308` bytes.
The extracted frame shows the archived primary and collaborator final screens,
the natural UI action route, the convergence split, pass-132 known-fixes
negative control, and fixed-branch verification.

## Pass 133 Verification

Pass 133 independently re-read the pass-132 summary, source manifest row,
generated source spec, archived source log, error-context snapshot, fixed PR
branch, explanation branch, and CRDT merge code. The classification remains a
product bug. The source and fresh reruns fail after normal editor UI actions
and a convergence wait, with no evidence of a readiness wait, locator error,
malformed generated spec, environment failure, inverted assertion, or expected
behavior.

Pass 133 added a fresh known-fixes negative control in a new test-only worktree
at known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only
repro commit `24391737982366d9103c3cb38f5c018d27c7512c` applied:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-133/work/knownfix-testonly
```

Both non-Playwright repro suites failed before the fix. The post-entrypoint
suite failed `6/6`: local observers emitted nested `YMap`, `YText`, `YMap`,
`YText` targets; remote observers emitted nested `YMap`, `YMap`, `YText`,
`YText` targets; and the record-morphing assertion showed the moved block
record had been rewritten into the displaced sibling. The direct
`mergeCrdtBlocks()` targeted tests failed `3/3` with the same adjacent
record-morphing proof and nested non-array CRDT update targets.

Pass 133 also reran the original generated natural-user browser spec against
the known-fixes base on `http://localhost:19913` after starting wp-env with an
explicit Docker subnet and phpMyAdmin port. It failed in `45.0s` after the
normal editor actions:

```text
primary:      inserted paragraph, displaced sibling paragraph, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

The pass-133 `attempt-1.json` records post `5` and the same normalized
divergent states as the archived source run.

Fixed-branch verification at
`ac313a81d9a5d2549c32ad95a4c383aaff434686`, based on
`origin/trunk = 1e87b2cd7874aaf9df553db901fe395d6a96a0a2`, was rerun:

```text
merge-base origin/trunk HEAD = 1e87b2cd7874aaf9df553db901fe395d6a96a0a2
rev-list origin/trunk...HEAD = 0 3
```

Results: `git diff --check origin/trunk..HEAD` was clean;
`crdt-post-block-move.ts` passed `6/6`; full `crdt-blocks.ts` passed `74/74`;
targeted JS lint exited `0`; and the natural-user Playwright repro passed
headlessly in `22.8s`.

Pass 133 refreshed origin evidence with `git log`, `git blame`, `git show`,
and GitHub connector metadata. The origin remains PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262), merge commit
`84019935998c16f877e976ad85e84748355d7282`, which introduced
`crdt-blocks.ts` and the positional update loop. PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923), merge commit
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104`, expanded edge-case tests but still
did not assert Yjs record identity or pure-move mutation shape. PR
[#77164](https://github.com/WordPress/gutenberg/pull/77164) fixed structural
array-attribute merging, not this top-level pure block move path.

Pass 133 verified the existing annotated video and copied it to:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-133/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass133-reverified-annotated.mp4
```

Video validation: H.264, `1920x1080`, `24.0s`, `720` frames, `434308` bytes.

## Pass 134 Verification

Pass 134 independently re-read the pass-133 summary, source manifest row,
generated natural-user spec, source failure log, source error-context snapshot,
fixed PR branch, explanation branch, and `mergeCrdtBlocks()` implementation.
The classification remains a product CRDT reconciliation bug.

Fresh pass-134 known-fixes negative control used a new detached test-only
worktree at known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908`,
with only repro commit `24391737982366d9103c3cb38f5c018d27c7512c` applied:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
```

Result: failed `6/6` before the fix. The local pure-move observer still saw
nested `YMap`, `YText`, `YMap`, `YText` targets; the remote-peer observer saw
nested `YMap`, `YMap`, `YText`, `YText` targets; and the post-entrypoint
record-morphing assertion showed the captured moved block record had been
rewritten to the displaced sibling content.

Fixed-branch pass-134 verification at
`ac313a81d9a5d2549c32ad95a4c383aaff434686`, based on
`origin/trunk = 1e87b2cd7874aaf9df553db901fe395d6a96a0a2`, was rerun:

```bash
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-134/artifacts-fixed RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: `wp-env` was already running at `http://localhost:9900`;
`crdt-post-block-move.ts` passed `6/6`; full `crdt-blocks.ts` passed `74/74`;
targeted JS lint exited `0`; `git diff --check` was clean; and the
natural-user Playwright repro passed headlessly in `22.5s`.

Pass 134 attempted an additional browser negative control in a fresh
known-fixes/test-only wp-env. The first source checkout attempt failed before
WordPress booted with `fatal: You are on a branch yet to be born`. A second
known-fixes test-only run reached Playwright but was an environment failure:
the RTC test plugin was not installed initially, then after manual plugin
installation the HTTP polling provider returned 500s before mutual discovery.
A third pre-fix no-fix worktree could not finish creating wp-env because the
local Docker/OrbStack volume was full. Those browser attempts are therefore not
counted as product evidence. The valid pass-134 negative control is the fresh
non-Playwright known-fixes failure above; the valid browser evidence remains
the archived source failure and pass-133 known-fixes browser rerun, while the
fixed branch passed the natural-user repro again in pass 134.

Pass 134 verified the annotated headless video again and copied it to:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-134/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass134-verified-annotated.mp4
```

Video validation: H.264, `1920x1080`, `24.0s`, `720` frames, `434308` bytes.

## Pass 135 Verification

Pass 135 independently re-read the pass-134 summary, source manifest row,
source failure log, source screenshots, source error-context snapshot, trace
archive contents, the generated natural-user spec, the fixed PR branch, and
the relevant CRDT reconciliation code. The classification remains unchanged:
this is a product bug in CRDT block reconciliation, not a readiness wait,
locator failure, malformed generated spec, environment failure, inverted
assertion, or expected behavior.

The added pass-135 proof is narrower than the previous full-suite negative
control. It targets only the real post CRDT entrypoint record-identity
invariant on the known-fixes base, with only the repro tests applied:

```bash
set -o pipefail
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --testNamePattern="does not morph post-entrypoint block records" --runInBand
```

Result on known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908`: exit `1`. The captured Y.Map for
the original moved block no longer contained the moved paragraph after the
logical move; it had been rewritten to the displaced sibling instead:

```text
Expected value: "Another paragraph exists so the top-level list is not degenerate."
Received array: [undefined, "Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا."]
```

That failure happens below Playwright through `applyPostChangesToCRDTDoc()`,
so it directly proves the defect is the CRDT record rewrite shape itself. The
same targeted test passed on the fixed PR branch.

Fixed-branch pass-135 verification at
`ac313a81d9a5d2549c32ad95a4c383aaff434686`, based on
`origin/trunk = 1e87b2cd7874aaf9df553db901fe395d6a96a0a2`, was rerun:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --testNamePattern="does not morph post-entrypoint block records" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-135/artifacts-fixed RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the targeted post-entrypoint invariant passed; the full
`crdt-post-block-move.ts` suite passed `6/6`; the full `crdt-blocks.ts` suite
passed `74/74`; targeted JS lint exited `0`; `git diff --check` was clean; and
the natural-user Playwright repro passed headlessly in `22.5s`.

Pass 135 also rebuilt the annotated headless video by overlaying a pass-135
verification note on the existing source/known-fixes/fixed evidence video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-135/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass135-verified-annotated.mp4
```

Video validation: H.264, `1920x1080`, `24.0s`, `473287` bytes.

## Pass 136 Verification

Pass 136 independently re-read the source manifest row, archived source log,
error-context snapshot, generated natural-user spec, current PR branch, current
explanation branch, and `mergeCrdtBlocks()` implementation. The classification
remains a product CRDT reconciliation bug: ordinary editor actions completed,
then convergence failed with primary `inserted, displaced sibling, moved
paragraph` and collaborator `inserted, moved paragraph, moved paragraph`.

The added pass-136 evidence is a verification that the existing branch, fix,
and video still satisfy the requested standard on the current local
`origin/trunk`. After an explicit trunk fetch, the PR branch remained exactly
three commits ahead of `origin/trunk`:

```text
24391737982 Add CRDT repros for RTC adjacent move identity rewrite
441db69f8ab Add RTC top-level move Playwright repro
ac313a81d9a Avoid rewriting CRDT block records for pure moves
```

`origin/trunk` and the merge base were both
`1e87b2cd7874aaf9df553db901fe395d6a96a0a2`, and
`git rev-list --left-right --count origin/trunk...HEAD` returned `0 3`.

Known-fixes base was reconfirmed with the targeted post-entrypoint
record-identity negative control:

```bash
bash -lc 'set -o pipefail; npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --testNamePattern="does not morph post-entrypoint block records" --runInBand 2>&1 | tee /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-136/logs/5ee0-pass136-knownfix-post-entrypoint-record-morph.log; exit ${PIPESTATUS[0]}'
```

Result on known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908`: exit `1`. The captured moved
Y.Map was still rewritten to the displaced sibling:

```text
Expected value: "Another paragraph exists so the top-level list is not degenerate."
Received array: [undefined, "Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا."]
```

Fixed-branch pass-136 verification at
`ac313a81d9a5d2549c32ad95a4c383aaff434686`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-136/artifacts-fixed RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: `crdt-post-block-move.ts` passed `6/6`; `crdt-blocks.ts` passed
`74/74`; targeted JS lint exited `0`; `git diff --check` was clean;
`wp-env` was running at `http://localhost:9900`; and the natural-user
Playwright repro passed headlessly in `22.8s`.

Pass 136 rebuilt the annotated headless video by overlaying a pass-136
verification note on the existing source/known-fixes/fixed evidence video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-136/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass136-verified-annotated.mp4
```

Video validation: H.264, `1920x1080`, `24.0s`, `720` frames, `475346` bytes.

## Pass 137 Verification

Pass 137 re-read the previous pass, source result row, archived source log,
error-context snapshot, generated natural-user spec, trace archive listing,
current PR branch, explanation branch, and the relevant CRDT reconciliation
code. The classification remains unchanged: the source run completed ordinary
editor actions and failed only after a convergence wait with primary
`inserted, displaced sibling, moved paragraph` and collaborator
`inserted, moved paragraph, moved paragraph`.

The new pass-137 evidence is a broader pre-fix proof below Playwright. On the
test-only first PR commit, before the product fix, the post CRDT entrypoint
fails for all pure block permutations, not only the adjacent three-block shape
from the browser seed:

```bash
cd /tmp/gutenberg-5ee0-pass137-testonly
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --testNamePattern="represents all pure block permutations as structural remote changes" --runInBand
```

Result: exit `1`. A pure permutation produced nested remote edits instead of a
single top-level array structural event:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

That independently proves the root cause is the positional record-rewrite
mutation shape in `mergeCrdtBlocks()`, not a Playwright readiness, locator,
assertion, or environment issue.

Known-fixes base was reconfirmed with the generated-sequence post-entrypoint
record-identity negative control:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-134/work/knownfix-testonly-5ee0
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --testNamePattern="does not morph post-entrypoint block records" --runInBand
```

Result on known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908`: exit `1`. The captured moved
Y.Map was still rewritten to the displaced sibling:

```text
Expected value: "Another paragraph exists so the top-level list is not degenerate."
Received array: [undefined, "Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا."]
```

Fixed-branch pass-137 verification at
`ac313a81d9a5d2549c32ad95a4c383aaff434686`, still exactly three commits ahead
of `origin/trunk = 1e87b2cd7874aaf9df553db901fe395d6a96a0a2`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-137/artifacts-fixed RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: `crdt-post-block-move.ts` passed `6/6`; `crdt-blocks.ts` passed
`74/74`; targeted JS lint exited `0`; `git diff --check` was clean; and the
natural-user Playwright repro passed headlessly in `23.2s`.

Pass 137 rebuilt the annotated headless video by overlaying a pass-137
verification note on the existing source/known-fixes/fixed evidence video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-137/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass137-verified-annotated.mp4
```

Video validation: H.264, `1920x1080`, `24.0s`, `720` frames, `504413` bytes.

## Pass 138 Verification

Pass 138 re-read the pass-137 summary, source manifest row, archived source
log, source error-context snapshot, generated natural-user spec, current PR
branch, explanation branch, `mergeCrdtBlocks()`, post-sync repro tests, and
origin commits. The classification remains unchanged: the source run completed
ordinary editor actions, then failed after convergence polling with primary
`inserted, displaced sibling, moved paragraph` and collaborator
`inserted, moved paragraph, moved paragraph`.

The added pass-138 evidence is an independent nested child-block repro below
Playwright. On the test-only first PR commit, before the product fix, a pure
inner-block move inside a group still replicates as nested record edits instead
of one structural child-array event:

```bash
rm -rf /tmp/gutenberg-5ee0-pass138-testonly
git worktree add --detach /tmp/gutenberg-5ee0-pass138-testonly 24391737982
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules /tmp/gutenberg-5ee0-pass138-testonly/node_modules 2>/dev/null || true
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/vendor /tmp/gutenberg-5ee0-pass138-testonly/vendor 2>/dev/null || true
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/build /tmp/gutenberg-5ee0-pass138-testonly/build 2>/dev/null || true
cd /tmp/gutenberg-5ee0-pass138-testonly
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --testNamePattern="applies nested pure block moves to remote peers as structural child block changes" --runInBand
```

Result: exit `1`. The nested move emitted non-array CRDT targets:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

This gives a different route from the original top-level adjacent browser seed
and from pass 137's all-permutations top-level proof. The same bug affects
recursive `innerBlocks`, because the positional update loop is reused by
recursive `mergeCrdtBlocks()` calls.

Known-fixes base was checked at
`3cba2b1e56a98787de08dc6c7df2434759e8f908`. The archived known-fixes source
run remains the direct browser negative control for that base. A fresh browser
rerun was attempted in pass 138, but local Docker infrastructure failed before
WordPress was reachable:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 npm run wp-env status
WP_ENV_DOCKER_SUBNET=10.253.39.0/24 WP_ENV_PORT=9903 WP_ENV_PHPMYADMIN_PORT=9023 WP_BASE_URL=http://localhost:9903 npm run wp-env start
WP_ENV_PORT=9913 WP_ENV_PHPMYADMIN_PORT=9033 WP_BASE_URL=http://localhost:9913 npm run wp-env start
WP_ENV_DOCKER_SUBNET=10.253.138.0/24 WP_ENV_PORT=9913 WP_ENV_PHPMYADMIN_PORT=9033 WP_BASE_URL=http://localhost:9913 npm run wp-env start
WP_ENV_DOCKER_SUBNET=10.253.138.0/24 WP_ENV_PORT=9913 WP_ENV_PHPMYADMIN_PORT=9033 WP_BASE_URL=http://localhost:9913 npm run wp-env clean all
```

Results: the first status reported `stopped`; one start failed with MySQL
exiting before WordPress startup; one start failed because Docker address pools
were exhausted; the final cleanup/start path failed with Docker reporting
`no space left on device` while creating the MySQL container. These are
environment failures, so they were not counted as product evidence.

Fixed-branch pass-138 verification at
`ac313a81d9a5d2549c32ad95a4c383aaff434686`, still exactly three commits ahead
of `origin/trunk = 1e87b2cd7874aaf9df553db901fe395d6a96a0a2`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record|pure block permutations" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-138/artifacts-fixed RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: `crdt-post-block-move.ts` passed `6/6`; focused CRDT block tests
passed `3` tests with `71` skipped; the full `crdt-blocks.ts` suite passed
`74/74`; targeted JS lint exited `0`; `git diff --check` was clean; `wp-env`
reported running at `http://localhost:9900`; and the natural-user Playwright
repro passed headlessly in `23.3s`.

Pass 138 refreshed origin metadata with `git show`, `git blame`, `git log`, and
GitHub connector PR metadata. The introducing commit is still
`84019935998c16f877e976ad85e84748355d7282`, PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262), merged
`2025-10-14T17:38:19Z`. PR #72262 introduced the recursive CRDT block merge and
the left/right positional update loop. PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923), merged
`2026-02-25T22:17:47Z` as
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104`, expanded edge-case tests but did
not assert record identity or pure-move mutation shape.

Pass 138 rebuilt the annotated headless video by overlaying a pass-138
verification note on the existing source/known-fixes/fixed evidence video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-138/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass138-verified-annotated.mp4
```

Video validation: H.264, `1920x1080`, `24.0s`, `720` frames, `515352` bytes.

## Pass 139 Verification

Pass 139 independently re-read the pass-138 summary, source manifest row,
archived source log, source error-context snapshot, generated natural-user
spec, current PR branch, explanation branch, `mergeCrdtBlocks()`, the
post-sync repro tests, and origin metadata. The classification remains a
product CRDT reconciliation bug: the source run completed normal editor block
actions and failed only after convergence polling with primary
`inserted, displaced sibling, moved paragraph` and collaborator
`inserted, moved paragraph, moved paragraph`.

The added pass-139 evidence is a fresh known-fixes low-level control on
`3cba2b1e56a98787de08dc6c7df2434759e8f908`. I overlaid only the PR branch's
test commit on the known-fixes base and ran the post-entrypoint checks below
Playwright:

```bash
git worktree add --detach /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-139/work/knownfix-testonly 3cba2b1e56a98787de08dc6c7df2434759e8f908
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-139/work/knownfix-testonly
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
git checkout 24391737982366d9103c3cb38f5c018d27c7512c -- packages/core-data/src/utils/test/crdt-post-block-move.ts packages/core-data/src/utils/test/crdt-blocks.ts
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --testNamePattern="applies adjacent pure block moves to remote peers as structural post block changes|replays the generated structural edit sequence as a structural remote move|does not morph post-entrypoint block records during the generated structural edit sequence" --runInBand
```

Result: exit `1`. The known-fixes base still emits nested remote CRDT record
edits for pure moves and still morphs the captured moved record:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]

Expected value: "Another paragraph exists so the top-level list is not degenerate."
Received array: [undefined, "Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا."]
```

That is a narrower root-cause proof than the original browser failure. It
exercises the real post CRDT entrypoint and has no Playwright readiness waits,
action locators, generated browser actions, Docker startup, or assertion
timing in the path.

Fixed-branch pass-139 verification at
`ac313a81d9a5d2549c32ad95a4c383aaff434686`, exactly three commits ahead of
`origin/trunk = 1e87b2cd7874aaf9df553db901fe395d6a96a0a2`:

```bash
git fetch origin trunk
git rev-parse origin/trunk HEAD
git merge-base origin/trunk HEAD
git rev-list --left-right --count origin/trunk...HEAD
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record|pure block permutations" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-139/artifacts-fixed RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: `crdt-post-block-move.ts` passed `6/6`; focused CRDT block tests
passed `3` tests with `71` skipped; the full `crdt-blocks.ts` suite passed
`74/74`; targeted JS lint exited `0`; `git diff --check` was clean; `wp-env`
reported running at `http://localhost:9900`; and the natural-user Playwright
repro passed headlessly in `21.7s`.

Pass 139 refreshed origin metadata with `git show`, `git blame`, and GitHub
connector PR metadata. The introducing commit remains
`84019935998c16f877e976ad85e84748355d7282`, PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262), merged
`2025-10-14T17:38:19Z`. That PR introduced the recursive CRDT block merge and
left/right positional update loop. PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923), merged
`2026-02-25T22:17:47Z` as
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104`, expanded edge-case tests but did
not assert Y.Map record identity or pure-move transaction shape.

Pass 139 rebuilt the annotated headless video by overlaying a pass-139
verification note on the existing source/known-fixes/fixed evidence video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-139/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass139-verified-annotated.mp4
```

Video validation: H.264, `1920x1080`, `24.0s`, `720` frames, `517351` bytes.

## Pass 140 Verification

Pass 140 independently re-read the pass-139 summary, source manifest row,
archived source log, source screenshots/error context, generated natural-user
spec, current PR branch, explanation branch, `mergeCrdtBlocks()`, the
post-sync repro tests, and origin metadata. The classification remains a
product CRDT reconciliation bug: the source run completed normal editor block
actions and failed only after convergence polling with primary
`inserted, displaced sibling, moved paragraph` and collaborator
`inserted, moved paragraph, moved paragraph`.

The added pass-140 evidence is a direct verification that the existing branch,
video, and fix still satisfy the requested standard on the current local
`origin/trunk`. After fetching trunk, the PR branch remained exactly
`origin/trunk + 3`:

```text
origin/trunk = 1e87b2cd7874aaf9df553db901fe395d6a96a0a2
HEAD = ac313a81d9a5d2549c32ad95a4c383aaff434686
merge-base = 1e87b2cd7874aaf9df553db901fe395d6a96a0a2
rev-list --left-right --count origin/trunk...HEAD = 0 3
```

Commit order:

```text
24391737982 Add CRDT repros for RTC adjacent move identity rewrite
441db69f8ab Add RTC top-level move Playwright repro
ac313a81d9a Avoid rewriting CRDT block records for pure moves
```

Known-fixes base was reconfirmed with a fresh pass-140 test-only worktree at
`3cba2b1e56a98787de08dc6c7df2434759e8f908`. I overlaid only the PR branch's
first test commit and reran the post-entrypoint checks below Playwright:

```bash
git worktree add --detach /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-140/work/knownfix-testonly-fresh 3cba2b1e56a98787de08dc6c7df2434759e8f908
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-140/work/knownfix-testonly-fresh
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/vendor vendor
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/build build
git checkout 24391737982366d9103c3cb38f5c018d27c7512c -- packages/core-data/src/utils/test/crdt-post-block-move.ts packages/core-data/src/utils/test/crdt-blocks.ts
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --testNamePattern="applies adjacent pure block moves to remote peers as structural post block changes|replays the generated structural edit sequence as a structural remote move|does not morph post-entrypoint block records during the generated structural edit sequence" --runInBand
```

Result: exit `1`. The known-fixes base still emits nested remote CRDT record
edits and still morphs the captured moved record:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]

Expected value: "Another paragraph exists so the top-level list is not degenerate."
Received array: [undefined, "Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا."]
```

Fixed-branch pass-140 verification at
`ac313a81d9a5d2549c32ad95a4c383aaff434686`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record|pure block permutations" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-140/artifacts-fixed RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: `crdt-post-block-move.ts` passed `6/6`; focused CRDT block tests
passed `3` tests with `71` skipped; the full `crdt-blocks.ts` suite passed
`74/74`; targeted JS lint exited `0`; `git diff --check` was clean; `wp-env`
reported running at `http://localhost:9900`; and the natural-user Playwright
repro passed headlessly in `22.1s`.

Pass 140 refreshed origin metadata with `git show`, `git blame`, and GitHub
connector PR metadata. The introducing commit remains
`84019935998c16f877e976ad85e84748355d7282`, PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262), merged
`2025-10-14T17:38:19Z`. That PR introduced the recursive CRDT block merge and
left/right positional update loop. PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923), merged
`2026-02-25T22:17:47Z` as
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104`, expanded edge-case tests but did
not assert Y.Map record identity or pure-move transaction shape.

Pass 140 rebuilt the annotated headless video by overlaying a pass-140
verification note on the existing source/known-fixes/fixed evidence video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-140/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass140-verified-annotated.mp4
```

Video validation: H.264, `1920x1080`, `24.0s`, `720` frames, `532032` bytes.

## Pass 141 Verification

Pass 141 re-read the pass-140 summary, the source JSONL row, the source log,
the archived screenshots/error context/trace action list, the generated source
spec, the rebased PR branch, `mergeCrdtBlocks()`, the post-sync repro tests,
and origin metadata. The bug still classifies as a real product defect. The
source run completed ordinary editor actions and then failed only after a 20s
convergence wait, with primary state `inserted, displaced sibling, moved
paragraph` and collaborator state `inserted, moved paragraph, moved paragraph`.

The added pass-141 evidence is a current-trunk test-only proof and a fresh
known-fixes test-only proof below Playwright. After fetching trunk, the PR
branch was rebased to current `origin/trunk`:

```text
origin/trunk = f770b5df8225ed572deef98d05c3138d724b3528
HEAD = 9c119592b7a43ed91afd32bff2d175d1efb50047
merge-base = f770b5df8225ed572deef98d05c3138d724b3528
rev-list --left-right --count origin/trunk...HEAD = 0 3
```

Commit order:

```text
b6e68d10a4f Add CRDT repros for RTC adjacent move identity rewrite
0df41bcde8f Add RTC top-level move Playwright repro
9c119592b7a Avoid rewriting CRDT block records for pure moves
```

On the rebased test-only commit `b6e68d10a4f16392d13ef2122999fbe30d3bb7b1`,
the post-entrypoint CRDT tests fail before the product fix:

```bash
git worktree add --detach /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-141/work/test-only-current-trunk b6e68d10a4f
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-141/work/test-only-current-trunk
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --testNamePattern="applies adjacent pure block moves to remote peers as structural post block changes|does not morph post-entrypoint block records during the generated structural edit sequence" --runInBand
```

Result: exit `1`. The failure is the root mutation shape, not browser timing:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]

Expected value: "Another paragraph exists so the top-level list is not degenerate."
Received array: [undefined, "Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا."]
```

Known-fixes base was also reconfirmed at
`3cba2b1e56a98787de08dc6c7df2434759e8f908` by overlaying the same test-only
files and running the same focused command. It failed with the same nested
remote CRDT targets and the same record-morphing assertion, so the known-fixes
base still does not contain this fix.

Fixed-branch pass-141 verification:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-141/artifacts-fixed RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: `crdt-post-block-move.ts` passed `6/6`; the full `crdt-blocks.ts`
suite passed `74/74`; targeted JS lint exited `0`; `git diff --check` was
clean; `wp-env` was already running at `http://localhost:9900`; and the
natural-user Playwright repro passed headlessly in `22.8s`.

Pass 141 refreshed origin metadata. `git show` still identifies
`84019935998c16f877e976ad85e84748355d7282`, PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262), merged
`2025-10-14T17:38:19Z`, as the commit that introduced
`packages/core-data/src/utils/crdt-blocks.ts` and the recursive post CRDT merge
logic. `git blame origin/trunk -L 480,610 -- packages/core-data/src/utils/crdt-blocks.ts`
still attributes the left/right changed-slice calculation and positional update
loop to that family of CRDT merge commits, with later rich-text and attribute
typing work changing the internals but not adding a pure-move transaction-shape
invariant. PR [#75923](https://github.com/WordPress/gutenberg/pull/75923),
merged `2026-02-25T22:17:47Z` as
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104`, expanded edge-case tests but still
did not assert Y.Map record identity or pure-move structural-only updates.

Pass 141 also produced a fresh stitched-screen headless video with the source
failure screens, natural action route, divergent states, non-browser proof, and
fixed-branch verification visible:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-141/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass141-stitched-annotated.mp4
```

Video validation: H.264, `1920x1080`, `18.0s`, `540` frames, `448471` bytes.

## Pass 142 Verification

Pass 142 independently re-read the pass-141 summary, source manifest row,
generated natural-user spec, archived source log, error context, trace action
list, and failure screenshots. The source failure still classifies as a real
product bug: all editor actions completed successfully, and the only failure
was a 20s convergence wait ending with primary
`inserted, displaced sibling, moved paragraph` and collaborator
`inserted, moved paragraph, moved paragraph`.

Pass 142 adds a narrower direct `mergeCrdtBlocks()` replication repro in
`packages/core-data/src/utils/test/crdt-blocks.ts`. It bypasses Playwright,
post fixtures, REST setup, and editor readiness waits: one Y.Doc performs the
pure adjacent reorder, a remote Y.Doc receives the incremental Yjs update, and
the test asserts that the remote peer observes only a top-level `Y.Array`
structural change. Before the fix, the test fails with the same root mutation
shape:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

That proves the pre-fix path represents a pure move as nested block-record and
rich-text rewrites, not as one structural move.

After folding the new repro into commit 1, the PR branch remains exactly
`origin/trunk + 3`:

```text
origin/trunk = f770b5df8225ed572deef98d05c3138d724b3528
HEAD = 8247425096fd12ff9ad253016b06b0178048189d
merge-base = f770b5df8225ed572deef98d05c3138d724b3528
rev-list --left-right --count origin/trunk...HEAD = 0 3
```

Commit order:

```text
43bc655b55c Add CRDT repros for RTC adjacent move identity rewrite
1d0931789c4 Add RTC top-level move Playwright repro
8247425096f Avoid rewriting CRDT block records for pure moves
```

The final test-only commit `43bc655b55c` fails below Playwright:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="replicates direct pure move merges as structural array changes" --runInBand
```

Result: exit `1`, with nested remote CRDT event targets
`["YMap", "YMap", "YText", "YText"]`.

Known-fixes base was reconfirmed at
`3cba2b1e56a98787de08dc6c7df2434759e8f908` by overlaying the test/repro
commit and running the same focused direct test. It failed with the same
nested `YMap/YText` event targets, so the known-fixes base still does not
contain this fix.

Fixed-branch pass-142 verification:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="replicates direct pure move merges as structural array changes" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-142/artifacts-fixed RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: focused direct repro passed; full `crdt-blocks.ts` suite passed
`75/75`; `crdt-post-block-move.ts` passed `6/6`; targeted JS lint exited `0`;
`git diff --check` was clean; `wp-env` was already running at
`http://localhost:9900`; and the natural-user Playwright repro passed
headlessly in `21.9s`.

Pass 142 refreshed origin metadata with `git blame`, `git log`, `git show`,
and GitHub connector PR metadata. The introducing commit remains
`84019935998c16f877e976ad85e84748355d7282`, PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262), merged
`2025-10-14T17:38:19Z`. That PR introduced the recursive post block CRDT merge
and left/right positional update sweep. PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923), merged as
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104` on `2026-02-25T22:17:47Z`,
expanded `mergeCrdtBlocks()` tests but still did not assert Y.Map record
identity or pure-move transaction shape. PR
[#77164](https://github.com/WordPress/gutenberg/pull/77164), merged
`2026-04-10T23:25:05Z`, reused the same left/right sweep idea for array
attributes, but it addressed array-attribute stability rather than top-level
block pure-move identity.

Pass 142 also produced a fresh stitched-screen headless video with source
failure screens, action route, the new direct Yjs proof, known-fixes negative
control, and fixed-branch verification visible:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-142/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass142-stitched-annotated.mp4
```

Video validation: H.264, `1920x1080`, `20.0s`, `600` frames, `449757` bytes.

## Pass 143 Verification

Pass 143 independently re-read the pass-142 summary, source result row, source
natural-user spec, source log, error context, trace action list, failure
screenshots, current fix branch, and CRDT code. The source trace still shows
ordinary editor actions only: selecting the heading, block Options > Delete,
selecting the paragraph in the collaborator editor, Options > Add before,
typing the inserted paragraph, and toolbar Move down. The failure is still a
semantic convergence split after the final 20s wait, not a readiness wait,
locator failure, malformed spec, environment error, or inverted assertion:

```text
primary:      inserted, displaced sibling, moved paragraph
collaborator: inserted, moved paragraph, moved paragraph
```

The PR branch was re-fetched against current `origin/trunk` and still has the
requested three-commit shape:

```text
origin/trunk = f770b5df8225ed572deef98d05c3138d724b3528
HEAD = 8247425096fd12ff9ad253016b06b0178048189d
merge-base = f770b5df8225ed572deef98d05c3138d724b3528
rev-list --left-right --count origin/trunk...HEAD = 0 3
```

Commit order remains:

```text
43bc655b55c Add CRDT repros for RTC adjacent move identity rewrite
1d0931789c4 Add RTC top-level move Playwright repro
8247425096f Avoid rewriting CRDT block records for pure moves
```

Pass 143 adds a fresh known-fixes negative control below Playwright. A new
worktree at known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908` had
only the repro-test diff from commit `43bc655b55c` applied:

```bash
git -C /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505 worktree add -f --detach /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-143/work/knownfix-testonly 3cba2b1e56a98787de08dc6c7df2434759e8f908
git -C /Users/danluu/dev/fuzz/gutenberg-bug-5ee0be2f9b7d diff origin/trunk..43bc655b55c -- packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts | git apply -
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="replicates direct pure move merges as structural array changes" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --testNamePattern="applies adjacent pure block moves to remote peers as structural post block changes" --runInBand
```

Both known-fixes tests failed with the remote peer observing nested CRDT
record/text mutations instead of one structural array update:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

That is the pass-143 added evidence: the known-fixes base still contains the
bad mutation shape at both the direct `mergeCrdtBlocks()` layer and the real
`applyPostChangesToCRDTDoc()` post-sync entrypoint.

Fixed-branch pass-143 verification:

```bash
git fetch origin trunk
git -C /Users/danluu/dev/fuzz/gutenberg-bug-5ee0be2f9b7d fetch origin trunk
git -C /Users/danluu/dev/fuzz/gutenberg-bug-5ee0be2f9b7d rev-parse origin/trunk HEAD
git -C /Users/danluu/dev/fuzz/gutenberg-bug-5ee0be2f9b7d merge-base origin/trunk HEAD
git -C /Users/danluu/dev/fuzz/gutenberg-bug-5ee0be2f9b7d rev-list --left-right --count origin/trunk...HEAD
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-143/artifacts-fixed RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: `crdt-post-block-move.ts` passed `6/6`; the focused direct block
tests passed `4` tests with `71` skipped; the full `crdt-blocks.ts` suite
passed `75/75`; targeted JS lint exited `0`; `git diff --check` was clean;
`wp-env status` reported running at `http://localhost:9900`; and the
natural-user Playwright repro passed headlessly in `22.1s`.

Pass 143 refreshed the origin proof with local `git blame`, `git show`, and
`git log`. The vulnerable left/right changed-slice calculation and positional
update loop still trace to the CRDT merge lineage introduced by
`84019935998c16f877e976ad85e84748355d7282`, PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262), merged
`2025-10-14T17:38:19Z`. PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923), merged as
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104` on `2026-02-25T22:17:47Z`,
expanded final-state tests but still did not assert Y.Map identity or
pure-move structural transaction shape.

Pass 143 also refreshed the annotated headless video from the pass-142
stitched source-failure evidence and validated it with `ffprobe`, a decode
pass, and an extracted frame:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-143/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass143-verified-annotated.mp4
```

Video validation: H.264, `1920x1080`, `20.0s`, `600` frames, `445325` bytes.

## Pass 144 Verification

Pass 144 re-read the pass-143 summary, source result row, generated source
spec, source log, error context, screenshots, trace action list, current PR
branch, and CRDT code. The source evidence still shows normal user actions and
a semantic convergence split after the final 20s wait:

```text
primary:      inserted paragraph, displaced sibling paragraph, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

The refreshed branch shape remains the requested three commits on current
`origin/trunk`:

```text
origin/trunk = f770b5df8225ed572deef98d05c3138d724b3528
HEAD = 8247425096fd12ff9ad253016b06b0178048189d
merge-base = f770b5df8225ed572deef98d05c3138d724b3528
rev-list --left-right --count origin/trunk...HEAD = 0 3
```

Commit order:

```text
43bc655b55c Add CRDT repros for RTC adjacent move identity rewrite
1d0931789c4 Add RTC top-level move Playwright repro
8247425096f Avoid rewriting CRDT block records for pure moves
```

Pass 144 added a fresh clean known-fixes negative control below Playwright. A
new worktree at known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` had only the repro-test diff from
commit `43bc655b55c` applied:

```bash
git -C /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505 worktree add -f --detach /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-144/work/knownfix-testonly 3cba2b1e56a98787de08dc6c7df2434759e8f908
git -C /Users/danluu/dev/fuzz/gutenberg-bug-5ee0be2f9b7d diff origin/trunk..43bc655b55c -- packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts | git apply -
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="replicates direct pure move merges as structural array changes" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --testNamePattern="applies adjacent pure block moves to remote peers as structural post block changes" --runInBand
```

Both tests failed before the fix, and both failures showed the same remote
Yjs mutation shape:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

`git merge-base --is-ancestor 8247425096fd12ff9ad253016b06b0178048189d HEAD`
returned exit code `1` in that known-fixes worktree, confirming the negative
control does not include the product fix.

Fixed-branch pass-144 verification:

```bash
git fetch origin trunk
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-144/artifacts-fixed RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: `crdt-post-block-move.ts` passed `6/6`; the focused direct block
tests passed `4` tests with `71` skipped; the full `crdt-blocks.ts` suite
passed `75/75`; targeted JS lint exited `0`; `git diff --check` was clean;
`wp-env status` reported the environment running at `http://localhost:9900`;
and the natural-user Playwright repro passed headlessly in `20.9s` test time
(`23.8s` overall).

Pass 144 also reran local origin analysis. `git blame origin/trunk -L 414,577
-- packages/core-data/src/utils/crdt-blocks.ts` still traces the left/right
changed-slice calculation and positional update loop to
`84019935998c16f877e976ad85e84748355d7282`, PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262), merged
`2025-10-14T17:38:19Z`. `git show --stat` still shows that PR added
`packages/core-data/src/utils/crdt-blocks.ts` and expanded `crdt.ts`.
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104`, PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923), added broad
`mergeCrdtBlocks()` tests on `2026-02-25T22:17:47Z`, but those tests still did
not assert remote Yjs event shape or Y.Map record identity for strict pure
moves.

## Pass 145 Verification

Pass 145 added a narrower root-cause proof on a fresh known-fixes worktree at
`3cba2b1e56a98787de08dc6c7df2434759e8f908`. A temporary pass-local probe
asserted the old bad behavior directly in `mergeCrdtBlocks()`, below
Playwright and below post sync. For the pure move
`[inserted, moved, displaced] -> [inserted, displaced, moved]`, the pre-fix
event stream was:

```json
{"eventsLog":[{"target":"YMap","keys":["clientId"],"clientId":"displaced-block"},{"target":"YText","text":"Displaced paragraph"},{"target":"YMap","keys":["clientId"],"clientId":"moved-block"},{"target":"YText","text":"Moved paragraph"}],"finalContents":["Inserted paragraph","Displaced paragraph","Moved paragraph"],"movedRecordAfter":{"clientId":"displaced-block","content":"Displaced paragraph"},"displacedRecordAfter":{"clientId":"moved-block","content":"Moved paragraph"}}
```

That proves the old code did not encode a move as a structural `Y.Array`
operation. It rewrote the captured moved Y.Map record into the displaced
paragraph record, and rewrote the displaced record into the moved paragraph.
This is a direct causal explanation for the browser symptom where the remote
peer later sees the moved paragraph duplicated and the displaced sibling
dropped.

Pass 145 also reconfirmed the known-fixes base by applying only the repro tests
from commit `43bc655b55c` to a fresh known-fixes worktree. Both the direct
`mergeCrdtBlocks()` repro and the real `applyPostChangesToCRDTDoc()`
post-sync repro failed with remote non-array event targets:

```text
["YMap", "YMap", "YText", "YText"]
```

The fixed PR branch still has the requested three-commit shape on
`origin/trunk`:

```text
origin/trunk = f770b5df8225ed572deef98d05c3138d724b3528
HEAD = 8247425096fd12ff9ad253016b06b0178048189d
rev-list --left-right --count origin/trunk...HEAD = 0 3
```

Commit order:

```text
43bc655b55c Add CRDT repros for RTC adjacent move identity rewrite
1d0931789c4 Add RTC top-level move Playwright repro
8247425096f Avoid rewriting CRDT block records for pure moves
```

Fixed-branch pass 145 results:

```text
crdt-post-block-move.ts: 6 passed
focused crdt-blocks.ts event-shape tests: 4 passed, 71 skipped
full crdt-blocks.ts: 75 passed
targeted JS lint: exit 0
git diff --check origin/trunk..HEAD: clean
wp-env status: running at http://localhost:9900
natural-user Playwright repro: 1 passed in 22.3s
```

Pass 145 refreshed origin metadata with local `git blame`, `git show`,
`git log`, and GitHub connector PR metadata. The introducing commit remains
`84019935998c16f877e976ad85e84748355d7282`, PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262), merged
`2025-10-14T17:38:19Z`. PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923), merged as
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104` on `2026-02-25T22:17:47Z`, added
tests but did not assert Y.Map identity or pure-move event shape. PR
[#77164](https://github.com/WordPress/gutenberg/pull/77164), merged as
`a6bfd3e55432981c7c2cb09190ee77954530b1a5` on `2026-04-10T23:25:05Z`,
improved array-attribute diffing with the same left/right sweep idea but did
not address top-level block pure moves.

## Pass 146 Verification

Pass 146 independently re-read the pass-145 summary, source result row, source
spec, source log, error context, failure screenshots, current PR branch, and
CRDT merge code. The source evidence still distinguishes this from a readiness,
locator, malformed-spec, environment, or inverted-assertion failure: both
editors were loaded, the final assertion ran only after a 20s convergence wait,
and the semantic states differed as:

```text
primary:      inserted paragraph, displaced sibling paragraph, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

The PR branch was refreshed against current `origin/trunk` and still has the
requested three commits:

```text
origin/trunk = f770b5df8225ed572deef98d05c3138d724b3528
HEAD = 8247425096fd12ff9ad253016b06b0178048189d
merge-base = f770b5df8225ed572deef98d05c3138d724b3528
rev-list --left-right --count origin/trunk...HEAD = 0 3

43bc655b55c Add CRDT repros for RTC adjacent move identity rewrite
1d0931789c4 Add RTC top-level move Playwright repro
8247425096f Avoid rewriting CRDT block records for pure moves
```

Pass 146 added a fresh known-fixes negative control below Playwright. A new
worktree at known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908` had
only the repro-test diff from commit `43bc655b55c` applied. The fix commit
`8247425096fd12ff9ad253016b06b0178048189d` is not an ancestor of that
known-fixes worktree (`merge-base --is-ancestor` exit code `1`). Both targeted
repros failed before the fix:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="replicates direct pure move merges as structural array changes" --runInBand --no-cache
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --testNamePattern="applies adjacent pure block moves to remote peers as structural post block changes" --runInBand --no-cache
```

Both failures observed the remote peer receiving nested record/text mutations,
not one structural array update:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

Fixed-branch pass 146 verification:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --no-cache
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="adjacent|structural array changes|record" --runInBand --no-cache
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --no-cache
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-146/artifacts-fixed RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: `crdt-post-block-move.ts` passed `6/6`; focused direct block tests
passed `4` tests with `71` skipped; full `crdt-blocks.ts` passed `75/75`;
targeted JS lint exited `0`; `git diff --check` was clean; and the
natural-user Playwright repro passed headlessly in `20.8s` test time
(`22.4s` overall). `npx wp-build` successfully rebuilt
`build/scripts/core-data/index.js` with the fix before later failing on
unrelated missing optional frontend dependencies (`framer-motion`,
`react-colorful`, `@emotion/css`, and `postcss-urlrebase`).

A fresh known-fixes browser rerun was attempted, but `wp-env start` failed
while Docker was creating the known-fixes container with `no space left on
device`. Pass 146 therefore does not use that attempted run as product
evidence. The fresh known-fixes evidence for this pass is the below-Playwright
negative control above, and the browser-level evidence remains the archived
source failure plus the already-created annotated headless video.

Pass 146 copied the existing annotated stitched-screen evidence into a
pass-local path and revalidated it:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-146/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass146-verified-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `20.0s`, `600` frames, and size
`445325` bytes. A full decode pass completed with no ffmpeg errors, and the
8s extracted frame shows both editor screens plus the action/evidence overlay.

## Pass 147 Verification

Pass 147 re-read the pass-146 summary, source result row, generated source
spec, source log, error context, failure screenshots, CRDT merge code, current
PR branch, and origin metadata. The source failure remains a real product
convergence bug: the generated spec used ordinary editor actions, did not time
out, and failed only after a 20s convergence wait with primary
`inserted, displaced sibling, moved paragraph` and collaborator
`inserted, moved paragraph, moved paragraph`.

The new pass-147 contribution is a narrower known-fixes negative proof. A fresh
known-fixes worktree at `3cba2b1e56a98787de08dc6c7df2434759e8f908` had only
the repro-test diff from commit `43bc655b55c` applied. The fix commit
`8247425096fd12ff9ad253016b06b0178048189d` is not an ancestor of that
worktree (`merge-base --is-ancestor` exit code `1`). Two record-identity tests
then failed before the fix:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --testNamePattern="does not morph post-entrypoint block records during the generated structural edit sequence" --runInBand --no-cache
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records when moving adjacent top-level blocks" --runInBand --no-cache
```

Both failures showed the captured `moved-block` Y.Map now containing the
displaced sibling content:

```text
Expected value: "Another paragraph exists so the top-level list is not degenerate."
Received array: [undefined, "Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا."]
```

That is stronger than observing nested CRDT events alone: the old positional
update loop actually morphs the stable moved-block record into its adjacent
sibling. This directly explains the browser symptom where the remote peer drops
the displaced paragraph and shows the moved paragraph twice.

Fixed-branch pass 147 verification on `try/rtc-top-level-move-reconciliation-duplicates-adjacent-para-5ee0be2f9b7d-pr`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --no-cache
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records|does not morph post-entrypoint|replicates direct pure move merges|represents adjacent pure moves" --runInBand --no-cache
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --no-cache
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-147/artifacts-fixed RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the post-sync move suite passed `6/6`; the focused direct block tests
passed `3` tests with `72` skipped; full `crdt-blocks.ts` passed `75/75`;
targeted JS lint exited `0`; `git diff --check` was clean; and the
natural-user Playwright repro passed headlessly in `21.3s` test time
(`23.6s` overall).

Pass 147 refreshed origin analysis with local `git log`, `git show`, `git
blame`, and GitHub connector PR metadata. The introducing commit remains
`84019935998c16f877e976ad85e84748355d7282`, PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262), merged
`2025-10-14T17:38:19Z`. PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923), merged as
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104` on `2026-02-25T22:17:47Z`, added
tests but not pure-move identity or event-shape coverage. PR
[#77164](https://github.com/WordPress/gutenberg/pull/77164), merged as
`a6bfd3e55432981c7c2cb09190ee77954530b1a5` on `2026-04-10T23:25:05Z`, moved
the same left/right sweep idea into array-attribute merging but did not fix
top-level block pure moves.

Pass 147 also made a pass-local annotated video artifact:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-147/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass147-record-morph-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `20.0s`, `600` frames, and size
`461196` bytes. A full decode pass completed with no ffmpeg errors, and the 8s
extracted frame shows both editor screens plus action/evidence text and the
pass-147 record-morph overlay.

## Pass 148 Verification

Pass 148 independently verified that the existing PR branch, video, and fix
still satisfy the requested standard. The source result row still failed with
exit code `1`, did not time out, and the generated spec used ordinary editor
actions only: primary deletes the heading, collaborator inserts a paragraph
before the original first paragraph, then primary moves that original paragraph
down. The source log, error context, and screenshots show loaded editors and a
semantic split after the final 20s convergence wait:

```text
primary:      inserted paragraph, displaced sibling paragraph, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

Pass 148 added a fresh known-fixes negative control in a new scratch worktree:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-148/work/knownfix-testonly
```

That worktree is based on known-fixes commit
`3cba2b1e56a98787de08dc6c7df2434759e8f908` and had only the repro-test diff
from commit `43bc655b55c070652e79c90c36baf37087f00f03` applied. Both targeted
record-morph tests still fail before the fix:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --testNamePattern="does not morph post-entrypoint block records during the generated structural edit sequence" --runInBand --no-cache
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records when moving adjacent top-level blocks" --runInBand --no-cache
```

Both failures reproduce the record rewrite directly:

```text
Expected value: "Another paragraph exists so the top-level list is not degenerate."
Received array: [undefined, "Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا."]
```

This confirms, independently from Playwright, that the known-fixes base still
morphs the captured moved-block Y.Map into the displaced sibling.

Fixed-branch pass 148 verification on
`try/rtc-top-level-move-reconciliation-duplicates-adjacent-para-5ee0be2f9b7d-pr`
at `8247425096fd12ff9ad253016b06b0178048189d`, based on `origin/trunk` at
`f770b5df8225ed572deef98d05c3138d724b3528`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --no-cache
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --no-cache
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-148/artifacts-fixed RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the post-sync move suite passed `6/6`; the full `crdt-blocks.ts`
suite passed `75/75`; targeted JS lint exited `0`; `git diff --check` was
clean; and the natural-user Playwright repro passed headlessly in `21.1s` test
time (`22.4s` overall).

Pass 148 also refreshed origin analysis. Local `git log`, `git show`, and
`git blame` plus GitHub connector PR metadata still identify
`84019935998c16f877e976ad85e84748355d7282`, PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262), merged
`2025-10-14T17:38:19Z`, as the introducing change for the left/right sweep and
positional update loop. PR [#75923](https://github.com/WordPress/gutenberg/pull/75923)
added broad `mergeCrdtBlocks()` testing on `2026-02-25T22:17:47Z`, but not
the Y.Map identity/event-shape invariants. PR
[#77164](https://github.com/WordPress/gutenberg/pull/77164), merged
`2026-04-10T23:25:05Z`, reused the sweep idea for array attributes without
addressing top-level block pure moves.

Pass 148 made a new pass-local annotated video artifact:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-148/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass148-verified-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `20.0s`, `600` frames, and size
`474087` bytes. A full decode pass completed with no ffmpeg errors, and the 8s
extracted frame shows both editor screens plus the pass-148 verification
overlay.

## Pass 149 Verification

Pass 149 added a browser-level known-fixes negative control and corrected a
local verification ambiguity. On this machine, `http://localhost:9900` currently
resolves to a different bug worktree (`gutenberg-bug-07f8eb5c4218`), while the
`5ee0be2f9b7d` test site is on `http://localhost:9901` and the known-fixes
test site is on `http://localhost:9903`, as confirmed through `/wp-json`.

Fixed branch verification was rerun against the correct `5ee0be2f9b7d` test
site:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --runInBand --no-cache
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --no-cache
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9901 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-149/artifacts-fixed RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: `crdt-post-block-move.ts` passed `6/6`; `crdt-blocks.ts` passed
`75/75`; targeted JS lint exited `0`; `git diff --check` was clean; and the
natural-user Playwright repro passed headlessly against `http://localhost:9901`
in `19.5s` test time (`21.0s` overall).

The test-only commit before the fix still fails below Playwright:

```bash
git switch --detach 43bc655b55c070652e79c90c36baf37087f00f03
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --testNamePattern="does not morph post-entrypoint block records during the generated structural edit sequence" --runInBand --no-cache
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records when moving adjacent top-level blocks" --runInBand --no-cache
git switch try/rtc-top-level-move-reconciliation-duplicates-adjacent-para-5ee0be2f9b7d-pr
```

Both targeted tests failed before the fix with the same record-morph proof:

```text
Expected value: "Another paragraph exists so the top-level list is not degenerate."
Received array: [undefined, "Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا."]
```

Pass 149 also reran the generated source spec against the known-fixes test site
on `http://localhost:9903`:

```bash
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9903 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-149/artifacts-knownfix RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-149/knownfix-browser-output RTC_EC47_ATTEMPTS=1 RTC_MANIFEST_WS_START_PORT=20420 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: failed in `43.5s` after the final 20s convergence wait, with the same
semantic split as the source row:

```text
primary:      inserted paragraph, displaced sibling paragraph, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

That browser negative control confirms the bug is not fixed by the known-fixes
base and is not an artifact of the archived source run.

## Pass 150 Verification

Pass 150 independently re-read the source row, generated spec, source log,
error context, screenshots, and trace inventory. The source failure remains a
loaded-editor convergence mismatch after ordinary editor actions, not a
readiness wait, locator problem, malformed generated spec, inverted assertion,
or environment failure.

Pass 150 also rebased the PR branch onto the current `origin/trunk`:

```text
origin/trunk = 777af47425fbb6608b8f1453976abd1458c3d81d
PR branch HEAD = f72df45f8e3 Avoid rewriting CRDT block records for pure moves
merge-base = 777af47425fbb6608b8f1453976abd1458c3d81d
rev-list --left-right --count origin/trunk...HEAD = 0 3
```

The rebased PR branch keeps the requested commit order:

```text
a7f79df448e Add CRDT repros for RTC adjacent move identity rewrite
83bc38f49ec Add RTC top-level move Playwright repro
f72df45f8e3 Avoid rewriting CRDT block records for pure moves
```

Fresh fixed-branch verification on the rebased PR branch:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --no-cache
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-150/artifacts-fixed RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the focused CRDT suites passed `81/81`; targeted JS lint exited `0`;
`git diff --check` was clean; and the natural-user Playwright repro passed
headlessly against the `5ee0be2f9b7d` site on `http://localhost:9901` in
`19.9s` test time (`23.0s` overall).

Pass 150 reconfirmed the known-fixes base with a fresh scratch worktree based
on `3cba2b1e56a98787de08dc6c7df2434759e8f908` and only the repro commits
applied. The two targeted low-level tests still fail before the fix:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not morph post-entrypoint block records|does not rewrite block records when moving adjacent top-level blocks" --runInBand --no-cache
```

Both failures reproduce the record rewrite directly:

```text
Expected value: "Another paragraph exists so the top-level list is not degenerate."
Received array: [undefined, "Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا."]
```

Pass 150 also added a fresh browser-level known-fixes negative control using
the natural-user-action repro, not the generated source spec:

```bash
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-150/artifacts-knownfix RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Result: failed in `42.6s` after the final convergence assertion. The expected
final order was `inserted paragraph, displaced sibling paragraph, moved
paragraph`; the known-fixes base produced `inserted paragraph, moved paragraph,
moved paragraph` on one peer.

Pass 150 created a new annotated stitched-screen video from that headless
known-fixes failure:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-150/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass150-knownfix-negative-control-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `20.0s`, and `600` frames. A full
ffmpeg decode completed with no errors, and the 8s extracted frame shows both
editor screens plus the natural action log, expected order, observed
known-fixes order, and pass-150 result.

## Pass 151 Verification

Pass 151 re-read the source row, generated spec, archived log, source
screenshots, and error context. The source failure is still a loaded-editor
semantic split after ordinary editor actions, not a timeout of the whole run,
malformed block input, bad locator, inverted assertion, or expected behavior:

```text
primary:      inserted paragraph, displaced sibling paragraph, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

The PR branch remains exactly three commits over current `origin/trunk`:

```text
origin/trunk = 777af47425fbb6608b8f1453976abd1458c3d81d
PR branch HEAD = f72df45f8e3 Avoid rewriting CRDT block records for pure moves
merge-base = 777af47425fbb6608b8f1453976abd1458c3d81d
rev-list --left-right --count origin/trunk...HEAD = 0 3
```

Commit order is still:

```text
a7f79df448e Add CRDT repros for RTC adjacent move identity rewrite
83bc38f49ec Add RTC top-level move Playwright repro
f72df45f8e3 Avoid rewriting CRDT block records for pure moves
```

Fresh fixed-branch pass-151 verification:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --no-cache
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-151/artifacts-fixed RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the two CRDT suites passed `81/81`; targeted JS lint exited `0`;
`git diff --check` exited `0`; and the natural-user Playwright repro passed
headlessly against the live `5ee0be2f9b7d` site on `http://localhost:9902` in
`21.0s` test time (`22.7s` overall).

Pass 151 added a fresh known-fixes low-level negative control in:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-151/work/knownfix-testonly-clean
```

That scratch worktree is based on
`3cba2b1e56a98787de08dc6c7df2434759e8f908` and had only the first repro commit
`a7f79df448e0ecb9c6b9a1f7048031cf532af5d0` applied with `--no-commit`.

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not morph post-entrypoint block records|does not rewrite block records when moving adjacent top-level blocks" --runInBand --no-cache
```

Result: expected failure on the known-fixes base. Both tests failed before the
fix with the same record-morph proof:

```text
Expected value: "Another paragraph exists so the top-level list is not degenerate."
Received array: [undefined, "Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا."]
```

Pass 151 also attempted to rerun the natural-user browser repro against the
known-fixes site on `http://localhost:9903` with WebSocket ports `20400` and
`20460`. Both attempts failed too early waiting for the Collaborators list
button, so those browser retries are recorded as environment/readiness noise
and are not used as product-bug evidence. The source run and the fresh
known-fixes low-level negative control still prove the base is unfixed.

Pass 151 refreshed origin analysis with `git grep`, `git blame`, `git log`,
`git show`, and GitHub PR metadata. The introducing commit remains
`84019935998c16f877e976ad85e84748355d7282`, PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262), merged
`2025-10-14T17:38:19Z`. PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923), merged as
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104` on `2026-02-25T22:17:47Z`,
expanded `mergeCrdtBlocks()` tests but did not cover pure-move Y.Map identity
or event shape. PR
[#77164](https://github.com/WordPress/gutenberg/pull/77164), merged as
`a6bfd3e55432981c7c2cb09190ee77954530b1a5` on `2026-04-10T23:25:05Z`,
reused the left/right sweep for array attributes without fixing top-level
block pure moves.

Pass 151 made a new annotated stitched-screen video from the archived source
screenshots plus the fresh pass-151 low-level result:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-151/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass151-source-record-morph-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `20.0s`, and `600` frames. A full
ffmpeg decode completed with no errors, and the extracted 8s frame shows both
source editor screens, the action log, expected order, observed duplicate
order, and pass-151 fixed/known-fixes verification.

## Pass 152 Verification

Pass 152 independently re-read the prior summary, source JSONL row, generated
spec, archived log, error context, screenshots, trace inventory, PR branch,
and explanation branch. The source run still classifies as a real product bug:
it failed with `exitCode=1`, `timedOut=false`, and a loaded-editor convergence
split after normal editor actions, not a malformed spec, locator failure,
readiness wait, environment failure, inverted assertion, or expected behavior.

The PR branch remains exactly three commits over current `origin/trunk`:

```text
origin/trunk = 777af47425fbb6608b8f1453976abd1458c3d81d
PR branch HEAD = f72df45f8e3 Avoid rewriting CRDT block records for pure moves
merge-base = 777af47425fbb6608b8f1453976abd1458c3d81d
rev-list --left-right --count origin/trunk...HEAD = 0 3
```

Commit order remains:

```text
a7f79df448e Add CRDT repros for RTC adjacent move identity rewrite
83bc38f49ec Add RTC top-level move Playwright repro
f72df45f8e3 Avoid rewriting CRDT block records for pure moves
```

Fresh pass-152 fixed-branch verification:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --no-cache
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-152/artifacts-fixed RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the two CRDT suites passed `81/81`; targeted JS lint exited `0`;
`git diff --check` exited `0`; and the natural-user Playwright repro passed
headlessly against the live `5ee0be2f9b7d` site on `http://localhost:9902` in
`20.9s` test time (`22.8s` overall).

Pass 152 created a fresh known-fixes scratch worktree in:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-152/work/knownfix-testonly-clean
```

That worktree is based on `3cba2b1e56a98787de08dc6c7df2434759e8f908` and had
only the first repro commit `a7f79df448e0ecb9c6b9a1f7048031cf532af5d0` applied
with `--no-commit`.

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not morph post-entrypoint block records|does not rewrite block records when moving adjacent top-level blocks" --runInBand --no-cache
```

Result: both targeted tests failed before the fix with the same record-morph
proof:

```text
Expected value: "Another paragraph exists so the top-level list is not degenerate."
Received array: [undefined, "Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا."]
```

This pass also verified the existing video standard and produced a fresh
pass-152 annotated headless video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-152/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass152-verification-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `24.0s`, and `720` frames. A full
ffmpeg decode completed with no errors, and the extracted 8s frame shows both
source editor screens, the action log, expected order, observed duplicate
order, the pass-152 known-fixes low-level failure, and the pass-152
fixed-branch verification.

## Pass 153 Verification

Pass 153 re-read the pass-152 summary, source JSONL row, generated spec,
archived log, error context, screenshots, trace inventory, current PR branch,
and explanation branch. The source run still classifies as a real product bug:
the run failed with `exitCode=1`, `timedOut=false`, and a loaded-editor state
split after ordinary editor actions. The source editor states were:

```text
primary:      inserted paragraph, displaced sibling paragraph, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

The PR branch is still exactly three commits over current `origin/trunk`:

```text
origin/trunk = 777af47425fbb6608b8f1453976abd1458c3d81d
PR branch HEAD = f72df45f8e3 Avoid rewriting CRDT block records for pure moves
merge-base = 777af47425fbb6608b8f1453976abd1458c3d81d
rev-list --left-right --count origin/trunk...HEAD = 0 3
```

Commit order remains:

```text
a7f79df448e Add CRDT repros for RTC adjacent move identity rewrite
83bc38f49ec Add RTC top-level move Playwright repro
f72df45f8e3 Avoid rewriting CRDT block records for pure moves
```

Pass 153 adds a stronger known-fixes negative control than pass 152 by running
the generated structural-edit remote-event repro in addition to the record-morph
tests. A fresh scratch worktree was created at:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-153/work/knownfix-testonly-clean
```

That worktree is based on `3cba2b1e56a98787de08dc6c7df2434759e8f908` and had
only the first repro commit `a7f79df448e0ecb9c6b9a1f7048031cf532af5d0` applied
with `--no-commit`.

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not morph post-entrypoint block records|does not rewrite block records when moving adjacent top-level blocks|replays the generated structural edit sequence" --runInBand --no-cache
```

Result: expected failure on the known-fixes base. The direct helper and
post-entrypoint record-morph tests both failed with the captured moved Y.Map
rewritten into the adjacent displaced paragraph:

```text
Expected value: "Another paragraph exists so the top-level list is not degenerate."
Received array: [undefined, "Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا."]
```

The generated structural-edit remote-event test also failed before the fix:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

That is the pass-153 added proof: the known-fixes base emits replicated nested
record edits for a pure move through the post CRDT entrypoint, below Playwright
and outside any readiness or locator behavior.

Fresh pass-153 fixed-branch verification:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --no-cache
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-153/artifacts-fixed RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the two CRDT suites passed `81/81`; targeted JS lint exited `0`;
`git diff --check` exited `0`; and the natural-user Playwright repro passed
headlessly against the live `5ee0be2f9b7d` site on `http://localhost:9902` in
`20.5s` test time (`22.0s` overall).

Pass 153 refreshed origin analysis with `git grep`, `git blame`, `git log`,
`git show`, and GitHub PR metadata. The introducing commit remains
`84019935998c16f877e976ad85e84748355d7282`, PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262), merged
`2025-10-14T17:38:19Z`. PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923), merged as
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104` on `2026-02-25T22:17:47Z`,
expanded `mergeCrdtBlocks()` tests but did not assert pure-move Y.Map identity
or remote event shape. PR
[#77164](https://github.com/WordPress/gutenberg/pull/77164), merged as
`a6bfd3e55432981c7c2cb09190ee77954530b1a5` on `2026-04-10T23:25:05Z`,
reused the left/right sweep for array attributes without fixing top-level
block pure moves.

Pass 153 made a fresh annotated stitched-screen video from the archived source
screenshots plus the fresh known-fixes and fixed-branch results:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-153/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass153-verification-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `24.0s`, and `720` frames. A full
ffmpeg decode completed with no errors, and the extracted 8s frame shows both
source editor screens, the natural action log, expected order, observed
duplicate order, the pass-153 known-fixes low-level failure, and the pass-153
fixed-branch verification.

## Pass 154 Verification

Pass 154 independently re-read the pass-153 summary, source JSONL row, generated
spec, archived log, error-context snapshot, source screenshots, trace archive
inventory, PR branch, explanation branch, and relevant CRDT code. The
classification remains unchanged: this is a product bug in CRDT block
reconciliation. The source and fresh rerun both complete ordinary user actions
and fail only after the final convergence wait with loaded editors:

```text
primary:      inserted paragraph, displaced sibling paragraph, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

The PR branch still has the requested three-commit shape over `origin/trunk`:

```text
origin/trunk = 777af47425fbb6608b8f1453976abd1458c3d81d
PR branch HEAD = f72df45f8e3 Avoid rewriting CRDT block records for pure moves
merge-base = 777af47425fbb6608b8f1453976abd1458c3d81d
rev-list --left-right --count origin/trunk...HEAD = 0 3
```

Commit order remains:

```text
a7f79df448e Add CRDT repros for RTC adjacent move identity rewrite
83bc38f49ec Add RTC top-level move Playwright repro
f72df45f8e3 Avoid rewriting CRDT block records for pure moves
```

Pass 154 created a fresh known-fixes scratch worktree at:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-154/work/knownfix-testonly-clean
```

It is based on `3cba2b1e56a98787de08dc6c7df2434759e8f908` and has only the
first repro commit `a7f79df448e0ecb9c6b9a1f7048031cf532af5d0` applied with
`--no-commit`. The targeted unit negative control still fails with exit code
`1`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not morph post-entrypoint block records|does not rewrite block records when moving adjacent top-level blocks|replays the generated structural edit sequence" --runInBand --no-cache
```

The direct and post-entrypoint record-morph checks still show the moved Y.Map
rewritten into the displaced sibling:

```text
Expected value: "Another paragraph exists so the top-level list is not degenerate."
Received array: [undefined, "Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا."]
```

The post-entrypoint remote-event check also still fails below Playwright:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

Pass 154 also reran the generated natural-user Playwright spec against the
known-fixes site on `http://localhost:9903`:

```bash
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-154/artifacts/knownfix-ec47-attempts PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: exit code `1` after `43.7s`, reproducing the same semantic split as the
source row: primary `inserted, displaced sibling, moved paragraph` and
collaborator `inserted, moved paragraph, moved paragraph`.

Fresh pass-154 fixed-branch verification:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --no-cache
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-154/artifacts-fixed RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the two CRDT suites passed `81/81`; targeted JS lint exited `0`;
`git diff --check` produced no output; and the natural-user Playwright repro
passed headlessly against `http://localhost:9902` in `20.5s` test time
(`22.1s` overall). The built `build/scripts/core-data/index.js` in the worktree
contains `canReorderBlocksByClientId` and `handledReorder`.

Pass 154 refreshed origin metadata with local `git log`, `git blame`,
`git show`, `git grep`, and GitHub PR metadata. The introducing commit remains
`84019935998c16f877e976ad85e84748355d7282`, PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262), merged
`2025-10-14T17:38:19Z`. PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923), merged as
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104` on `2026-02-25T22:17:47Z`,
expanded `mergeCrdtBlocks()` tests but not pure-move Y.Map identity or remote
event shape. PR
[#77164](https://github.com/WordPress/gutenberg/pull/77164), merged as
`a6bfd3e55432981c7c2cb09190ee77954530b1a5` on `2026-04-10T23:25:05Z`, reused
the left/right sweep for array attributes and did not change top-level block
pure-move reconciliation.

Pass 154 made and verified a fresh annotated stitched-screen video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-154/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass154-verification-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `24.0s`, and `720` frames. A full
ffmpeg decode completed with no errors, and the extracted 8s frame shows both
source editor screens, the natural action log, expected order, observed
duplicate order, pass-154 known-fixes failures, and pass-154 fixed-branch
verification.

## Pass 155 Verification

Pass 155 independently re-read the pass-154 summary, source JSONL row, archived
generated spec, source run log, error-context snapshot, screenshots, trace
inventory, explanation branch, PR branch, and relevant CRDT code. The bug still
classifies as a product defect in block CRDT reconciliation. The source run and
fresh known-fixes rerun both complete normal editor actions and fail after the
final convergence wait with:

```text
primary:      inserted paragraph, displaced sibling paragraph, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

Pass 155 adds a fresh verification that the existing three-commit PR branch and
video/fix still satisfy the requested standard on current `origin/trunk`
`777af47425fbb6608b8f1453976abd1458c3d81d`:

```text
PR branch HEAD = f72df45f8e3 Avoid rewriting CRDT block records for pure moves
merge-base = 777af47425fbb6608b8f1453976abd1458c3d81d
rev-list --left-right --count origin/trunk...HEAD = 0 3
```

Commit order remains:

```text
a7f79df448e Add CRDT repros for RTC adjacent move identity rewrite
83bc38f49ec Add RTC top-level move Playwright repro
f72df45f8e3 Avoid rewriting CRDT block records for pure moves
```

Known-fixes low-level negative control was rerun from a clean scratch worktree
based on `3cba2b1e56a98787de08dc6c7df2434759e8f908` with only the first repro
commit applied. The targeted unit command exited `1` as expected. The direct
helper still morphs the moved Y.Map into the displaced sibling, and the
post-entrypoint remote-event proof still emits nested record edits for a pure
move:

```text
Expected value: "Another paragraph exists so the top-level list is not degenerate."
Received array: [undefined, "Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا."]

Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

Known-fixes natural-user Playwright negative control was rerun headlessly
against the live known-fixes site on `http://localhost:9903`:

```bash
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-155/artifacts/knownfix-ec47-attempts PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: exit code `1` after `43.6s`, with the same split state: primary
`inserted, displaced sibling, moved paragraph`; collaborator `inserted, moved
paragraph, moved paragraph`.

Fresh fixed-branch verification:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --no-cache
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-155/artifacts/fixed-playwright RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the two CRDT unit suites passed `81/81`; targeted JS lint exited `0`;
`git diff --check` produced no output; and the natural-user Playwright repro
passed headlessly against `http://localhost:9902` in `21.2s` test time
(`23.5s` overall).

Pass 155 also refreshed origin metadata. The introducing merge remains
`84019935998c16f877e976ad85e84748355d7282`, PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262), merged
`2025-10-14T17:38:19Z`. The relevant `origin/trunk` hunk still has the
left/right sweep followed directly by the positional update loop and no
`canReorderBlocksByClientId` or `handledReorder` path. PR
[#75923](https://github.com/WordPress/gutenberg/pull/75923), merged as
`128a3c29b7f1db4f35faf9e326dd1e5e7ac11104`, added `mergeCrdtBlocks()` tests but
not pure-move Y.Map identity or remote event-shape checks. PR
[#77164](https://github.com/WordPress/gutenberg/pull/77164), merged as
`a6bfd3e55432981c7c2cb09190ee77954530b1a5`, reused the same left/right sweep
for array attributes and did not alter top-level block move reconciliation.

Pass 155 created and verified a fresh annotated stitched-screen video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-155/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass155-verification-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `24.0s`, and `720` frames. A full
ffmpeg decode completed with no errors, and the extracted 8s frame shows the
source/fresh known-fixes split, the natural action log, the below-Playwright
record-morph proof, and the fixed-branch unit/lint/Playwright verification.

## Pass 157 Verification

Pass 157 re-read the pass-156 summary, the source JSONL row, the generated
spec, source run log, source failure artifacts, the current CRDT merge code,
and both existing branches. The bug still classifies as a product defect in
CRDT block reconciliation. The source and fresh known-fixes browser failures
both finish ordinary editor actions and then diverge after the final move:

```text
primary:      inserted paragraph, displaced sibling paragraph, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

The pass-157 independent contribution is a narrower low-level proof that the
known-fixes base mutates existing same-clientId Y.Map records into their sibling
contents during a pure adjacent move. This is stronger than a browser-only
non-convergence observation: the old `moved-block` record is expected to remain
the moved paragraph or be detached, but on the pre-fix path it contains the
displaced paragraph instead:

```text
Expected value: "Another paragraph exists so the top-level list is not degenerate."
Received array: [undefined, "Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا."]
```

The same clean known-fixes test-only run also reconfirmed the event-shape root
cause. A strict pure move emitted nested record/text edits instead of one
structural array event:

```text
Expected: []
Received: ["YMap", "YText", "YMap", "YText"]
```

Known-fixes negative controls were rerun from pass-157 scratch artifacts:

```bash
git -C /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505 worktree add --detach /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-157/work/knownfix-testonly-clean 3cba2b1e56a98787de08dc6c7df2434759e8f908
git -C /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-157/work/knownfix-testonly-clean cherry-pick --no-commit a7f79df448e0ecb9c6b9a1f7048031cf532af5d0
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="represents adjacent pure moves as structural array changes|replicates direct pure move merges as structural array changes|applies adjacent pure block moves to remote peers as structural post block changes|replays the generated structural edit sequence as a structural remote move|does not rewrite block records when moving adjacent top-level blocks|does not morph post-entrypoint block records during the generated structural edit sequence" --runInBand --no-cache
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-157/artifacts/knownfix-ec47-attempts-pass157 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: the known-fixes test-only command failed as expected with `6 failed,
79 skipped`; the known-fixes natural-user Playwright command failed in `44.3s`
with the same split editor state.

The fixed PR branch remained based on current `origin/trunk`
`777af47425fbb6608b8f1453976abd1458c3d81d` and kept the requested commit
order:

```text
a7f79df448e Add CRDT repros for RTC adjacent move identity rewrite
83bc38f49ec Add RTC top-level move Playwright repro
f72df45f8e3 Avoid rewriting CRDT block records for pure moves
```

Fresh pass-157 fixed-branch verification:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --no-cache
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-157/artifacts/fixed-playwright-pass157 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the two CRDT unit suites passed `81/81`; targeted JS lint exited `0`;
`git diff --check` produced no output; and the natural-user Playwright repro
passed headlessly against `http://localhost:9902` in `21.0s` test time
(`22.5s` overall).

Pass 157 also created and verified a fresh annotated stitched-screen video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-157/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass157-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `24.0s`, and `720` frames. A full
ffmpeg decode completed with no errors, and the extracted 8s frame shows both
fresh known-fixes editor screens, the natural action log, the expected/observed
orders, the record-morph root-cause proof, and the fixed-branch verification.

## Pass 159 Verification

Pass 159 independently re-read the pass-158 summary, the source JSONL row, the
generated natural-user spec, the archived source log, the error-context
snapshot, fresh known-fixes screenshots, trace inventory, branch state, and the
current CRDT reconciliation code. The classification remains a product defect in
CRDT block reconciliation. The source and fresh known-fixes browser runs both
complete normal editor actions and fail only at the final convergence check:

```text
primary:      inserted paragraph, displaced sibling paragraph, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

The pass-159 added proof is a nested non-Playwright route through the real post
CRDT entrypoint, `applyPostChangesToCRDTDoc()`. On the known-fixes base with
only the repro commit applied, a pure child-block move inside a group also emits
nested record edits instead of one structural child-array change:

```text
Expected: []
Received: ["YMap", "YMap", "YText", "YText"]
```

The same clean test-only run reconfirmed the broader pure-permutation failure
and the generated-sequence record morph: the captured moved Y.Map is rewritten
to the adjacent sibling content instead of remaining the moved paragraph or
being structurally detached.

Fresh pass-159 known-fixes checks:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts -- --testNamePattern="applies nested pure block moves to remote peers as structural child block changes|represents all pure block permutations as structural remote changes|does not morph post-entrypoint block records during the generated structural edit sequence" --runInBand --no-cache
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-159/artifacts/knownfix-playwright-artifacts-pass159 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-159/artifacts/knownfix-ec47-attempts-pass159 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: the test-only command failed as expected with the nested child-move,
pure-permutation, and record-morph proofs; the known-fixes browser rerun failed
in `43.2s` with the same semantic split as the source row.

Fresh pass-159 fixed-branch verification:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --no-cache
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-159/artifacts/fixed-playwright-artifacts-pass159 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the two CRDT unit suites passed `81/81`; targeted JS lint exited `0`;
`git diff --check` exited `0`; and the natural-user Playwright repro passed
headlessly against `http://localhost:9902` in `21.2s` test time (`22.6s`
overall). The PR branch still has the requested three-commit stack over current
`origin/trunk`: non-Playwright repros, natural-user Playwright repro, then the
strict pure-move fix.

Pass 159 created and verified a fresh annotated stitched-screen video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-159/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass159-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `24.0s`, and `720` frames. A full
ffmpeg decode completed with no errors, and the extracted 8s frame shows both
fresh known-fixes editor screens, the natural action log, the expected/observed
orders, the nested child-move root-cause proof, and the fixed-branch
verification.

## Pass 161 Verification

Pass 161 independently re-read the source JSONL row, generated spec, archived
source log, error-context snapshot, trace actions, current branch state, and
`mergeCrdtBlocks()` implementation. The source trace still shows only ordinary
editor operations: block Options > Delete, collaborator Options > Add before,
typing the inserted paragraph, and the toolbar Move down button. The failure is
still a semantic split after convergence, not a locator or readiness failure:

```text
primary:      inserted paragraph, displaced sibling paragraph, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

The added pass-161 proof is a direct `mergeCrdtBlocks()` negative control on a
clean known-fixes worktree at `3cba2b1e56a98787de08dc6c7df2434759e8f908`, with
only the repro-test commit `a7f79df448e0ecb9c6b9a1f7048031cf532af5d0`
cherry-picked. Before the fix, the direct helper fails below Playwright:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records when moving adjacent top-level blocks|represents adjacent pure moves as structural array changes|replicates direct pure move merges as structural array changes" --runInBand --no-cache
```

Results: all three tests failed. The captured moved Y.Map contained the
displaced sibling content, and the local/remote observer proofs saw nested
`YMap`/`YText` events instead of one structural array change. The same focused
direct helper tests pass on the fixed branch.

Pass 161 also reran the browser-level known-fixes negative control against
`http://localhost:9903`; it failed in `43.2s` with the same split editor state
as the source row. The fixed branch remains a clean three-commit stack over
current `origin/trunk` `777af47425fbb6608b8f1453976abd1458c3d81d`:

```text
a7f79df448e Add CRDT repros for RTC adjacent move identity rewrite
83bc38f49ec Add RTC top-level move Playwright repro
f72df45f8e3 Avoid rewriting CRDT block records for pure moves
```

Fresh pass-161 fixed-branch verification:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records when moving adjacent top-level blocks|represents adjacent pure moves as structural array changes|replicates direct pure move merges as structural array changes" --runInBand --no-cache
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --no-cache
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the focused direct helper tests passed, the two CRDT unit suites
passed `81/81`, targeted JS lint exited `0`, `git diff --check` produced no
output, and the natural-user Playwright repro passed headlessly in `20.7s` test
time (`22.1s` overall).

## Pass 162 Verification

Pass 162 independently re-read the pass-161 summary, source JSONL row, generated
natural-user spec, archived source log, error-context snapshot, source trace
actions, current branch state, and the current `mergeCrdtBlocks()` code. The
source trace still shows ordinary editor actions only: block Options > Delete,
collaborator Options > Add before, typing the inserted paragraph, and toolbar
Move down. The source and fresh known-fixes browser states fail only after the
semantic convergence check:

```text
primary:      inserted paragraph, displaced sibling paragraph, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

The pass-162 added value is a fresh verification that the existing branch,
video standard, and fix still satisfy the requested bar after independently
recovering a broken local Docker/OrbStack state. Initial browser attempts were
discarded because Docker disappeared mid-run and the pages navigated to
Chromium error documents. After `orb start`, explicit wp-env subnets, and
recreating only the stale fixed-branch wp-env containers, both WordPress sites
returned HTTP 200 and the browser reruns were valid.

Fresh pass-162 known-fixes direct negative control used a clean detached
worktree at `3cba2b1e56a98787de08dc6c7df2434759e8f908` with only repro commit
`a7f79df448e0ecb9c6b9a1f7048031cf532af5d0` cherry-picked:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --testNamePattern="does not rewrite block records when moving adjacent top-level blocks|represents adjacent pure moves as structural array changes|replicates direct pure move merges as structural array changes" --runInBand --no-cache
```

Result: expected failure, `3 failed`. The captured moved Y.Map was rewritten to
the displaced sibling content, and local/remote observer proofs saw nested
`YMap`/`YText` updates instead of one structural array change.

Fresh pass-162 known-fixes browser negative control:

```bash
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-162/artifacts/knownfix-playwright-artifacts-pass162-rerun RTC_MANIFEST_WS_START_PORT=20450 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-162/artifacts/knownfix-ec47-attempts-pass162-rerun PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: expected failure in `43.1s`, with the same primary/collaborator split
as the source row.

Fresh pass-162 fixed-branch verification on the unchanged PR branch
`f72df45f8e3a19ca3238332d31522522267456c4`, based on current `origin/trunk`
`777af47425fbb6608b8f1453976abd1458c3d81d`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-post-block-move.ts packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --no-cache
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-162/artifacts/fixed-playwright-artifacts-pass162-rerun RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the two CRDT unit suites passed `81/81`, targeted JS lint exited `0`,
`git diff --check` produced no output, and the natural-user Playwright repro
passed headlessly in `20.4s` test time (`22.0s` overall).

Pass 162 created and validated a fresh annotated stitched-screen video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-162/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass162-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `24.0s`, and `720` frames. A full
ffmpeg decode completed with no errors, and the extracted 8s frame shows both
fresh known-fixes editor screens, the natural action log, the expected/observed
orders, and pass-162 fixed-branch verification.

## Pass 163 Verification

Pass 163 re-read the pass-162 summary, the source JSONL row, the generated
natural-user spec, the archived source log, the error-context snapshot, source
screenshots, trace actions, branch state, and current `mergeCrdtBlocks()` code.
The source result remains a clean semantic failure after successful ordinary UI
actions and a convergence wait, not a timeout, locator failure, malformed spec,
or environment failure:

```text
primary:      inserted paragraph, displaced sibling paragraph, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

Pass 163 added a wider non-Playwright negative-control rerun on the known-fixes
base worktree at `3cba2b1e56a98787de08dc6c7df2434759e8f908` with only repro
tests applied. Instead of rerunning only the three focused direct-helper tests,
it reran both CRDT suites:

```bash
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts
```

Result: expected failure, `10 failed, 75 passed`. The failures cover direct
`mergeCrdtBlocks()`, the real post entrypoint `applyPostChangesToCRDTDoc()`,
remote update application, pure permutations, nested child moves, and the exact
generated structural edit sequence. The event-level symptom is still nested
`YMap`/`YText` mutation of block records instead of one structural array change,
and the captured moved Y.Map still reads the displaced sibling content.

Pass 163 attempted to create a fresh detached known-fixes test-only worktree, but
the filesystem had only about `194 MiB` free and Git failed while checking out
files with `No space left on device`. The existing pass-162 known-fixes
test-only worktree was therefore reused for the fresh pass-163 command above.

Fresh pass-163 fixed-branch verification on PR branch
`f72df45f8e3a19ca3238332d31522522267456c4`, based on current `origin/trunk`
`777af47425fbb6608b8f1453976abd1458c3d81d`:

```bash
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check
WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts --project=chromium --workers=1
```

Results: the two CRDT unit suites passed `81/81`, targeted JS lint exited `0`,
`git diff --check` produced no output, and the natural-user Playwright repro
passed headlessly in `21.9s`. Local wp-env was already running for this worktree,
but on port `9902`; `http://localhost:9900` was closed.

Pass 163 did not create another full browser video because the filesystem was
full. It revalidated the pass-162 annotated video instead:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-162/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass162-annotated.mp4
```

`ffprobe` reports H.264 video, `1920x1080`, `24.0s`, and size `467829` bytes.
A full `ffmpeg -f null` decode completed with no errors.

## Pass 165 Verification

Pass 165 independently re-read the pass-163 summary, the source JSONL row, the
generated natural-user spec, the archived source log, the error-context
snapshot, source screenshots, trace actions, current branch state, and the
current `mergeCrdtBlocks()` implementation. The source trace still shows
ordinary editor actions only: block Options > Delete, collaborator Options >
Add before, typing the inserted paragraph, and toolbar Move down. The archived
failure is still a semantic split after those actions, not a timeout, locator
failure, malformed spec, or inverted assertion:

```text
primary:      inserted paragraph, displaced sibling paragraph, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

Pass 165 added a clean known-fixes negative control outside the handoff tree so
Jest would not scan old copied worktrees. The detached worktree
`/Users/danluu/dev/fuzz/gutenberg-pass165-knownfix-clean` was checked out at
known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only the
low-level repro test commit `a7f79df448e` applied:

```bash
git worktree add /Users/danluu/dev/fuzz/gutenberg-pass165-knownfix-clean 3cba2b1e56a98787de08dc6c7df2434759e8f908
cd /Users/danluu/dev/fuzz/gutenberg-pass165-knownfix-clean
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
git checkout a7f79df448e -- packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts
PATH=/Users/danluu/dev/fuzz/gutenberg/node_modules/.bin:$PATH NODE_PATH=/Users/danluu/dev/fuzz/gutenberg/node_modules npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts --runInBand --testNamePattern="does not rewrite block records|represents adjacent pure moves|replicates direct pure move merges|non-adjacent pure moves|represents adjacent pure block moves|applies adjacent pure block moves|generated structural edit sequence|does not morph post-entrypoint"
```

Result: expected failure, `8 failed, 73 skipped, 81 total`. The failures cover
both `mergeCrdtBlocks()` and `applyPostChangesToCRDTDoc()`. The captured moved
Y.Map was rewritten to the displaced sibling content, and local/remote observer
proofs saw nested `YMap`/`YText` updates instead of a single structural array
change.

Pass 165 also rebased the PR branch onto current `origin/trunk`
`12a12af12a48b86223152498c688d7f87fbfae2f` while preserving the requested
three-commit order:

```text
acff11ccd56 Add CRDT repros for RTC adjacent move identity rewrite
0e30cf7cfa5 Add RTC top-level move Playwright repro
6c49ea3f0f1 Avoid rewriting CRDT block records for pure moves
```

Fresh pass-165 fixed-branch verification:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-5ee0be2f9b7d
PATH=/Users/danluu/dev/fuzz/gutenberg/node_modules/.bin:$PATH NODE_PATH=/Users/danluu/dev/fuzz/gutenberg/node_modules npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts --runInBand
PATH=/Users/danluu/dev/fuzz/gutenberg/node_modules/.bin:$PATH NODE_PATH=/Users/danluu/dev/fuzz/gutenberg/node_modules npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-post-block-move.ts test/e2e/specs/editor/collaboration/rtc-top-level-move-reconciliation.spec.ts
git diff --check origin/trunk..HEAD
```

Results: the two CRDT unit suites passed `81/81`, targeted JS lint exited `0`,
and `git diff --check` produced no output.

Fresh pass-165 browser reruns were blocked by the local container runtime:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20424 RTC_MANIFEST_WS_FIXED_PORT=1 npm run wp-env start
```

Result: `wp-env start` failed before any Playwright action with an
OrbStack/Docker socket EOF while listing compose containers. This is an
environment blocker for fresh browser reruns only; it does not affect the
archived source Playwright failure, the pass-162/pass-163 headless browser
reruns, or the pass-165 low-level proof.
