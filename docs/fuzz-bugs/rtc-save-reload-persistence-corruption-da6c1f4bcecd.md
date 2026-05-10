# RTC stale block snapshot can drop a concurrent sibling insert

## Summary

Bug `da6c1f4bcecd` is a real RTC product bug, not a readiness wait, locator error, malformed generated spec, inverted assertion, or expected behavior.

The source failure was reported as `rtc_save_reload_persistence_corruption`, but the earliest proven defect happens before the save/reload assertions: two editors append paragraphs after the same shared paragraph, and the later converged block tree contains only one of the two user paragraphs. Any later save can persist that already-corrupted tree.

Source markers:

- Missing after convergence: `rtc-9b9e-primary-1777975808112`
- Still present after convergence: `rtc-9b9e-collaborator-1777975808112`

The Playwright trace shows the primary marker was typed and its visible assertion passed. The collaborator marker was also typed and its visible assertion passed. Later convergence reads show both the normalized block state and serialized content contain the collaborator marker and omit the primary marker, before the final primary-marker click times out. That final timeout is therefore a symptom of product state loss, not the cause.

## Reproductions

The low-level deterministic reproductions are in the PR branch:

- `packages/core-data/src/utils/test/crdt-blocks.ts`
- `packages/core-data/src/utils/test/crdt.ts`

They model the same shape without Playwright:

1. Initial local base has `Baseline`, `Shared anchor`, and `Trailing`.
2. A remote editor appends `Primary paragraph` after `Shared anchor`.
3. The local editor applies a stale full block snapshot with `Collaborator paragraph` after `Shared anchor`, based on the older view that did not contain the remote primary paragraph.

Before the fix, the CRDT-read hydration path drops the unobserved remote insert:

```text
Expected length: 5
Received length: 4
Received array: ["Baseline", "Shared anchor", "Collaborator paragraph", "Trailing"]
```

The nested variant drops the corresponding inner block:

```text
Expected length: 4
Received length: 3
Received array: ["Nested anchor", "Collaborator nested paragraph", "Nested trailing"]
```

The natural-user Playwright repro is:

```text
test/e2e/specs/editor/collaboration/collaboration-stale-append-persistence.spec.ts
```

It creates a draft with normal block content, opens two editors, appends two paragraphs after the same visible paragraph using keyboard actions, saves, reloads, and asserts that both user paragraphs survive. It does not inject malformed blocks, mutate editor state directly, or rely on synthetic block trees.

## Known-Fixes Negative

Pass 165 created a fresh known-fixes test-only worktree from:

```text
3cba2b1e56a98787de08dc6c7df2434759e8f908
```

Only the non-Playwright repro commit was cherry-picked. The focused unit command failed in `packages/core-data/src/utils/test/crdt.ts` with the missing-primary results above. This confirms the known-fixes base does not include the CRDT-read hydration-base fix.

## Root Cause

`mergeCrdtBlocks()` was introduced by:

```text
84019935998c16f877e976ad85e84748355d7282
Improve CRDT "merge logic" for post entities (#72262)
```

That change added a left/right sweep over full Gutenberg block snapshots and a shared `Y.Array`. The algorithm assumes the incoming snapshot is based on the current CRDT array. In RTC sessions, that assumption is false: a tab can emit a full local snapshot based on an older editor view after the CRDT has already received remote structural edits.

If the current `Y.Array` contains a remote insert that is absent from the stale local snapshot, the old positional diff can treat the absence as a local delete or replacement. In this bug, that turns a valid concurrent sibling append into data loss.

Later RTC commits improved adjacent behavior but did not address stale full block snapshots:

- `22e067b02438e110efc39de2ff1c7b4d23eb74c3` / #75448: moved title/content/excerpt to `Y.Text`.
- `128a3c29b7f1` / #75923: expanded `mergeCrdtBlocks()` tests and refactored attribute logic.
- `a6bfd3e55432` / #77164: improved array-attribute stability.
- `54af1ce400687f2ba51fee6c440207a07af5d55f` / rich-text cursor scoping: made text/cursor changes target the right RichText instance.

Those changes leave the unsafe full-array structural inference intact.

## Fix

The fix records the last local base for each block `Y.Array` and reconciles each incoming local full snapshot against:

- the previous local block snapshot,
- the current CRDT block array,
- and stable block `clientId`s.

A block that was not in the previous local base but exists in the current CRDT is treated as a remote insert, not as something the local stale snapshot intended to delete. A block that was in the previous local base and is now absent from the local snapshot can still be treated as a local delete. If the snapshot lacks unique `clientId`s, the code falls back to the existing merge behavior rather than inventing identity.

The first raw-merge fix was not sufficient by itself. A reload/joining editor can first hydrate local editor state from `getPostChangesFromCRDTDoc()` and then issue a local block snapshot before it has ever called `mergeCrdtBlocks()`. The final fix therefore also records the CRDT-read block list as the local base for that `Y.Array`.

## Robustness Audit

Kernel-maintainer check:

- Do not infer deletion of a remote block from absence in a causally stale full snapshot.
- Seed the local base on CRDT reads as well as writes.
- Keep the existing positional merge as the final application step after reconciliation.
- Use `WeakMap<YBlocks, Block[]>` so base tracking follows the lifetime of the CRDT array.

Jepsen-style check:

- Treat editor block snapshots as causally stale reads.
- Preserve remote inserts not observed by the writer.
- Do not impose a total order on concurrent appends after the same anchor.
- Keep explicit deletes possible when the block was present in the writer's previous base.

Simplicity/performance check:

- Use `clientId` identity and existing block objects; do not parse serialized HTML.
- Keep the change localized to `core-data` CRDT utilities.
- Fall back on malformed or duplicate IDs instead of adding heuristics.

## Pass 165 Verification

Pass 165 rebased the PR branch onto current `origin/trunk`:

```text
origin/trunk = 12a12af12a48b86223152498c688d7f87fbfae2f
```

The PR branch has exactly three commits over trunk:

```text
be3da0f2469 Add RTC stale top-level append regression test
8902eb3351b Add RTC stale append persistence browser repro
e4cc37761dc Preserve RTC remote inserts across stale block snapshots
```

Focused fixed-branch unit verification passed:

```text
PASS packages/core-data/src/utils/test/crdt-blocks.ts
PASS packages/core-data/src/utils/test/crdt.ts
Tests: 122 passed, 122 total
```

The full build reached successful JS/PHP workspace builds, then failed in unrelated theme primitive token generation because the shared local `colorjs.io` install rejected the current token-generation API:

```text
TypeError: [object Object] is not a valid color space
packages/theme/bin/generate-primitive-tokens/index.ts
```

`wp-env status` on port 9906 reported the environment as uninitialized. `wp-env start` then terminated with signal 143 and did not initialize the environment; direct Docker server inspection also hung after printing client info. A fresh pass-165 Playwright rerun was therefore blocked by the local Docker/OrbStack environment, not by the test or fix. The branch still carries the natural-user Playwright repro, and previous headless evidence video is preserved in the pass artifacts.

## Pass 167 Verification

Pass 167 rebased both branches onto current `origin/trunk`:

```text
origin/trunk = 19c460ff7c872d376ac12018720138898b5c9bc3
```

The PR branch still has exactly three commits over trunk:

```text
bd543ef0896 Add RTC stale top-level append regression test
0d4274e9df0 Add RTC stale append persistence browser repro
49caa410929 Preserve RTC remote inserts across stale block snapshots
```

Focused fixed-branch unit verification passed:

```text
PASS packages/core-data/src/utils/test/crdt-blocks.ts
PASS packages/core-data/src/utils/test/crdt.ts
Tests: 122 passed, 122 total
```

Pass 167 also created a fresh known-fixes test-only worktree from `3cba2b1e56a98787de08dc6c7df2434759e8f908`, cherry-picked only the non-Playwright repro commit, and reran the focused negative tests. The raw `mergeCrdtBlocks()` stale-append test passed, but the CRDT-read/reload route still failed:

```text
persists both sibling appends after a CRDT-read stale local snapshot:
Expected length: 5
Received length: 4
Received array: ["Baseline", "Shared anchor", "Collaborator paragraph", "Trailing"]

keeps unobserved remote inner-block inserts after a CRDT-read stale local inner-block snapshot:
Expected length: 4
Received length: 3
Received array: ["Nested anchor", "Collaborator nested paragraph", "Nested trailing"]
```

This fresh negative run narrows the defect to the CRDT-read hydration-base path: the lower raw merge shape alone is not enough once a reloaded editor first populates block state from `getPostChangesFromCRDTDoc()`.

GitHub metadata for the origin analysis was read through the GitHub connector because `gh` was unavailable locally. PR #72262 was merged on 2025-10-14 as `84019935998c16f877e976ad85e84748355d7282` and introduced the post-entity block merge logic. PRs #75448, #75923, and #77164 were verified as later merged RTC changes that did not add stale-snapshot base tracking for `blocks`.

`wp-env status` on port 9903 reported the environment as uninitialized. `wp-env start` hung in:

```text
docker compose -f /Users/danluu/.wp-env/wp-env-gutenberg-bug-da6c1f4bcecd-pr-ca086e74/docker-compose.yml down --remove-orphans
```

Direct `docker info` also hung after printing the client header and `Server:`. I killed only those da6c1f4bcecd/wp-env and docker-info processes. A fresh headless browser rerun remains blocked by the local Docker/OrbStack environment; the branch still carries the natural-user Playwright repro.

## Pass 169 Verification

Pass 169 rebased both branches onto current `origin/trunk`:

```text
origin/trunk = 86d1b6741a57cdc066485370fe051285f2ebd0b4
```

The PR branch still has exactly three commits over trunk:

```text
525421fcf7a Add RTC stale top-level append regression test
3d57d653163 Add RTC stale append persistence browser repro
0ce55073906 Preserve RTC remote inserts across stale block snapshots
```

Pass 169 also created a fresh detached test-only worktree from the current backlink-aware known-fixes base:

```text
f256024286dd80a4c0e2579f658c109256abf648
```

Only the focused CRDT-read stale snapshot regression tests were added. The current known-fixes base still fails both:

```text
keeps unobserved remote inserts after a CRDT-read stale no-op block snapshot:
Expected ["Baseline", "Shared anchor", "Primary paragraph", "Trailing"]
Received ["Baseline", "Shared anchor", "Trailing"]

persists both sibling appends after a CRDT-read stale local snapshot:
Expected length: 5
Received length: 4
Received array: ["Baseline", "Shared anchor", "Collaborator paragraph", "Trailing"]
```

The rebased PR branch passes those focused regressions and the focused CRDT unit files:

```text
PASS packages/core-data/src/utils/test/crdt.ts
PASS packages/core-data/src/utils/test/crdt-blocks.ts
Tests: 122 passed, 122 total
```

`wp-env status` on port 9906 reported the environment as uninitialized. `wp-env start` again hung in:

```text
docker compose -f /Users/danluu/.wp-env/wp-env-gutenberg-bug-da6c1f4bcecd-pr-ca086e74/docker-compose.yml down --remove-orphans
```

I killed only the da6c1f4bcecd-specific startup chain and confirmed the environment was still uninitialized. A fresh local Playwright run remains blocked by the local Docker/wp-env startup issue; the natural-user Playwright repro remains committed.

## Pass 170 Verification

Pass 170 fetched and rebased both branches onto current `origin/trunk`:

```text
origin/trunk = c9c72087881e7e8c3887df4c9b0acf000ecba0c8
```

The PR branch still has exactly three commits over trunk:

```text
52e87497387 Add RTC stale top-level append regression test
a876d5bbe9b Add RTC stale append persistence browser repro
7dfc25e2c33 Preserve RTC remote inserts across stale block snapshots
```

Pass 170 added an independent, narrow test-only repro in a fresh detached worktree from the current backlink-aware known-fixes base:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-170/work/knownfix-current-testonly-narrow
base = f256024286dd80a4c0e2579f658c109256abf648
test file = packages/core-data/src/utils/test/da6c-pass170-crdt-read-stale.ts
```

That repro does not cherry-pick the broad PR test commit. It only exercises the CRDT-read stale snapshot path: hydrate blocks from the CRDT document, receive an unobserved remote insert, then apply a local full `blocks` snapshot based on the stale hydrated view. The current known-fixes base still fails both tests:

```text
keeps an unobserved remote insert after a stale no-op block snapshot:
Expected ["Baseline", "Shared anchor", "Primary paragraph", "Trailing"]
Received ["Baseline", "Shared anchor", "Trailing"]

persists both sibling appends after a stale local snapshot:
Expected length: 5
Received length: 4
Received array: ["Baseline", "Shared anchor", "Collaborator paragraph", "Trailing"]
```

The rebased PR branch passes the focused stale-snapshot regressions, including the nested inner-block case:

```text
PASS packages/core-data/src/utils/test/crdt.ts
Tests: 46 skipped, 3 passed, 49 total
```

The broader focused CRDT unit files also pass:

```text
PASS packages/core-data/src/utils/test/crdt.ts
PASS packages/core-data/src/utils/test/crdt-blocks.ts
Tests: 122 passed, 122 total
```

Pass 170 also rechecked source artifacts. The source spec uses normal editor actions (`click`, `End`, `Enter`, `keyboard.type`) for both user appends. The trace records the primary marker being typed and visibly asserted, the collaborator marker being typed and visibly asserted, and later normalized `blocks`/`serializedContent` containing only the collaborator marker. The final click timeout is therefore downstream of content loss.

`wp-env status` on the requested port 9936 reported `status: uninitialized`. A bounded `wp-env start` attempt produced only the initial banner for 120 seconds and was killed; a follow-up process check found no da6c-specific `wp-env` or Docker compose process, and status still reported the environment as uninitialized. A fresh local Playwright run remains blocked by local Docker/wp-env startup, not by the committed repro.

## Pass 171 Verification

Pass 171 fetched and rebased both branches onto current `origin/trunk`:

```text
origin/trunk = b2de87b2a7d89096bfbeabfaa0905916f97d56b5
```

The PR branch still has exactly three commits over trunk:

```text
70a402a4523 Add RTC stale top-level append regression test
e24c5927355 Add RTC stale append persistence browser repro
54874041294 Preserve RTC remote inserts across stale block snapshots
```

Pass 171 created another fresh detached test-only worktree from the current backlink-aware known-fixes base:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-171/work/knownfix-current-testonly
base = f256024286dd80a4c0e2579f658c109256abf648
test file = packages/core-data/src/utils/test/da6c-pass171-crdt-read-stale.ts
```

This standalone repro again exercises the ordinary reload/hydration route: the editor reads blocks through `getPostChangesFromCRDTDoc()`, receives an unobserved remote paragraph insert, then emits a stale full `blocks` snapshot. The current known-fixes base still fails both tests:

```text
keeps a remote insert after a stale no-op snapshot from a hydrated editor:
Expected ["Baseline", "Shared anchor", "Primary paragraph", "Trailing"]
Received ["Baseline", "Shared anchor", "Trailing"]

persists both same-anchor sibling appends after a stale hydrated snapshot:
Expected length: 5
Received length: 4
Received array: ["Baseline", "Shared anchor", "Collaborator paragraph", "Trailing"]
```

The rebased PR branch passes the focused CRDT unit files:

```text
PASS packages/core-data/src/utils/test/crdt.ts
PASS packages/core-data/src/utils/test/crdt-blocks.ts
Tests: 122 passed, 122 total
```

`git diff --check origin/trunk...HEAD` also passed on the PR branch. A fresh local Playwright run is still blocked before the browser test can start: `wp-env status` on port 9936 reports the environment as uninitialized, and `wp-env start` fails because another local `wp-env` phpMyAdmin container already owns port 9000:

```text
Bind for 0.0.0.0:9000 failed: port is already allocated
wp-env-gutenberg-bug-ba7fe0fd5418-a63fe623-phpmyadmin-1 Up 4 hours 0.0.0.0:9000->80/tcp
```

The committed browser repro remains natural-user-action-only, and the saved pass-167 annotated headless evidence video remains present and readable.

## Residual Risk

The fix depends on stable unique `clientId`s in each block list. If a degraded block tree lacks usable IDs, the code intentionally falls back to the old merge behavior. That avoids guessing identity but means such malformed snapshots still have weaker conflict handling.

The reconciliation preserves remote inserts around current neighbors, but concurrent sibling order is intentionally not specified. The correctness property is preservation, not a deterministic total order for simultaneous appends.

## Pass 172 Verification

Pass 172 fetched current `origin/trunk` and rebased both branches again:

```text
origin/trunk = dc3bc7decd0aed8733ee6538c0feb368da19703d
```

The PR branch still has exactly three commits over trunk:

```text
b46d3384b96 Add RTC stale top-level append regression test
1428b959aec Add RTC stale append persistence browser repro
9ee413402dc Preserve RTC remote inserts across stale block snapshots
```

The rebased PR branch passes the focused CRDT unit files:

```text
PASS packages/core-data/src/utils/test/crdt.ts
PASS packages/core-data/src/utils/test/crdt-blocks.ts
Tests: 122 passed, 122 total
```

`git diff --check origin/trunk...HEAD` also passed on the PR branch.

Pass 172 added a fresh detached test-only worktree from the current backlink-aware known-fixes base:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-172/work/knownfix-da6c-current
base = f256024286dd80a4c0e2579f658c109256abf648
test file = packages/core-data/src/utils/test/da6c-pass172-crdt-read-stale.ts
```

The pass-172 test again exercises the ordinary reload/hydration route: an editor reads blocks through `getPostChangesFromCRDTDoc()`, receives an unobserved remote paragraph insert, then emits either an unchanged stale full `blocks` snapshot or a stale same-anchor collaborator append. The current known-fixes base still fails both tests:

```text
keeps an unobserved remote insert after a hydrated editor emits an unchanged stale snapshot:
Expected ["Baseline", "Shared anchor", "Primary paragraph", "Trailing"]
Received ["Baseline", "Shared anchor", "Trailing"]

keeps both same-anchor sibling appends after a hydrated stale local snapshot is saved:
Expected length: 5
Received length: 4
Received array: ["Baseline", "Shared anchor", "Collaborator paragraph", "Trailing"]
```

Pass 172 also rechecked the source trace. It records the primary marker being typed and visibly asserted, then the collaborator marker being typed and visibly asserted. The later normalized `blocks` and `serializedContent` contain `rtc-9b9e-collaborator-1777975808112` but omit `rtc-9b9e-primary-1777975808112`. The final click timeout is therefore still downstream of content loss.

The saved headless evidence video remains readable:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-167/video/da6c1f4bcecd/da6c1f4bcecd-pass167-evidence.mp4
duration=56.000000
size=407706
```

A fresh local Playwright run remains blocked before browser execution. `wp-env status` on the requested port 9936 reports the environment as uninitialized, and `wp-env start` fails because another local `wp-env` phpMyAdmin container owns port 9000:

```text
Bind for 0.0.0.0:9000 failed: port is already allocated
wp-env-gutenberg-bug-ba7fe0fd5418-a63fe623-phpmyadmin-1 Up 12 hours 0.0.0.0:9000->80/tcp
```

## Pass 173 Verification

Pass 173 fetched current `origin/trunk` and rebased both branches again:

```text
origin/trunk = 114082fd16895304936ddd048e617891ab8f9f48
```

The PR branch still has exactly three commits over trunk:

```text
b7753b0e152 Add RTC stale top-level append regression test
f94f4e5dacd Add RTC stale append persistence browser repro
b11a69daf3 Preserve RTC remote inserts across stale block snapshots
```

The rebased PR branch passes the focused CRDT unit files:

```text
PASS packages/core-data/src/utils/test/crdt.ts
PASS packages/core-data/src/utils/test/crdt-blocks.ts
Tests: 122 passed, 122 total
```

`git diff --check origin/trunk...HEAD` also passed on the PR branch.

Pass 173 reran the current known-fixes negative using the existing detached test-only worktree at the backlink-aware base:

```text
base = f256024286dd80a4c0e2579f658c109256abf648
test file = packages/core-data/src/utils/test/da6c-pass172-crdt-read-stale.ts
```

The current known-fixes base still fails the ordinary CRDT-read stale snapshot route:

```text
keeps an unobserved remote insert after a hydrated editor emits an unchanged stale snapshot:
Expected ["Baseline", "Shared anchor", "Primary paragraph", "Trailing"]
Received ["Baseline", "Shared anchor", "Trailing"]

keeps both same-anchor sibling appends after a hydrated stale local snapshot is saved:
Expected length: 5
Received length: 4
Received array: ["Baseline", "Shared anchor", "Collaborator paragraph", "Trailing"]
```

Pass 173 contribution: the likelihood classification remains `medium`, but the evidence is now narrower. The failing browser trace and the known-fixes unit repro both collapse to the same real-user shape: a hydrated editor emits a full `blocks` snapshot that is causally older than a remote sibling paragraph insert. The trace timing is only about 0.65s between the primary typing start and collaborator typing start, so the window is a normal quick collaborative edit rather than a long artificial sleep.

## Pass 174 Verification

Pass 174 fetched current `origin/trunk` and rebased both branches again:

```text
origin/trunk = 6aa5ea1a40db818a9c0d2d85d0d0476f7d40392a
```

The PR branch still has exactly three commits over trunk:

```text
866aabe0e9f Add RTC stale top-level append regression test
f2fad5986d0 Add RTC stale append persistence browser repro
84f47ddd1a4 Preserve RTC remote inserts across stale block snapshots
```

The rebased PR branch still passes the focused CRDT unit files:

```text
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt.ts --runInBand

PASS packages/core-data/src/utils/test/crdt.ts
PASS packages/core-data/src/utils/test/crdt-blocks.ts
Tests: 122 passed, 122 total
```

`git diff --check origin/trunk...HEAD` also passed on both the PR branch and explanation branch.

Pass 174 also avoided relying on the mutable shared known-fixes checkout because that path was dirty and on another bug branch. Instead it created a fresh detached worktree at the manifest's exact backlink-aware base:

```text
base = f256024286dd80a4c0e2579f658c109256abf648
worktree = /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-174/work/da6c-knownfix-f256
test file = packages/core-data/src/utils/test/da6c-pass174-crdt-read-stale.ts
```

The isolated known-fixes negative still fails both minimal CRDT-read stale snapshot tests:

```text
npm run test:unit -- packages/core-data/src/utils/test/da6c-pass174-crdt-read-stale.ts --runInBand

FAIL packages/core-data/src/utils/test/da6c-pass174-crdt-read-stale.ts
Tests: 2 failed, 2 total

keeps an unobserved remote insert after a hydrated editor emits an unchanged stale snapshot:
Expected ["Baseline", "Shared anchor", "Primary paragraph", "Trailing"]
Received ["Baseline", "Shared anchor", "Trailing"]

keeps both same-anchor sibling appends after a hydrated stale local snapshot is saved:
Expected length: 5
Received length: 4
Received array: ["Baseline", "Shared anchor", "Collaborator paragraph", "Trailing"]
```

Pass 174 contribution: this independently rechecked the known-fixes base from a clean detached `f256024...` worktree, not from the mutable shared checkout. It also confirms that the ordinary CRDT-read/hydrated-editor route fails even when the local stale snapshot is unchanged, so the risk is not limited to an active same-anchor collaborator append. A user tab that has hydrated an older block list can later emit a no-op full `blocks` snapshot and still delete a remote paragraph it never observed.

## Pass 175 Verification

Pass 175 fetched current `origin/trunk` and rebased both branches again:

```text
origin/trunk = b38f9b4d86d0505199f5efd78c2adf213e428e78
```

The PR branch still has exactly three commits over trunk:

```text
ace190e7ada Add RTC stale top-level append regression test
b5dab7b9d7c Add RTC stale append persistence browser repro
e674126c2ef Preserve RTC remote inserts across stale block snapshots
```

The rebased PR branch still passes the focused CRDT unit files:

```text
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt.ts --runInBand

PASS packages/core-data/src/utils/test/crdt.ts
PASS packages/core-data/src/utils/test/crdt-blocks.ts
Tests: 122 passed, 122 total
```

`git diff --check origin/trunk...HEAD` also passed on the PR branch.

Pass 175 again avoided the mutable shared known-fixes checkout because it was dirty and on another bug branch. A fresh detached worktree was created at the manifest's exact backlink-aware base:

```text
base = f256024286dd80a4c0e2579f658c109256abf648
worktree = /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-175/work/da6c-knownfix-f256-pass175
test file = packages/core-data/src/utils/test/da6c-pass175-crdt-read-stale.ts
```

The isolated known-fixes negative still fails both minimal CRDT-read stale snapshot tests:

```text
npm run test:unit -- packages/core-data/src/utils/test/da6c-pass175-crdt-read-stale.ts --runInBand

FAIL packages/core-data/src/utils/test/da6c-pass175-crdt-read-stale.ts
Tests: 2 failed, 2 total

keeps an unobserved remote insert after a hydrated editor emits an unchanged stale snapshot:
Expected ["Baseline", "Shared anchor", "Primary paragraph", "Trailing"]
Received ["Baseline", "Shared anchor", "Trailing"]

keeps both same-anchor sibling appends after a hydrated stale local snapshot is saved:
Expected ["Baseline", "Shared anchor", "Primary paragraph", "Collaborator paragraph", "Trailing"]
Received ["Baseline", "Shared anchor", "Collaborator paragraph", "Trailing"]
```

Pass 175 contribution: the practical-impact classification remains `medium` inside RTC collaboration and low across all Gutenberg usage, but the workflow is now sharper. The most realistic risk is a joining or reloaded collaborator tab that hydrates an older block list and then emits a full `blocks` snapshot while another collaborator's paragraph insert is already in the CRDT document. The user does not need malformed blocks, direct state mutation, or an unusual block type; ordinary paragraph blocks and ordinary save/reload are enough to make the loss persistent.

## Pass 176 Verification

Pass 176 fetched current `origin/trunk`; it remains:

```text
origin/trunk = b38f9b4d86d0505199f5efd78c2adf213e428e78
```

The PR branch still has exactly three commits over trunk:

```text
ace190e7ada Add RTC stale top-level append regression test
b5dab7b9d7c Add RTC stale append persistence browser repro
e674126c2ef Preserve RTC remote inserts across stale block snapshots
```

The PR branch still passes the focused CRDT unit files:

```text
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt.ts --runInBand

PASS packages/core-data/src/utils/test/crdt.ts
PASS packages/core-data/src/utils/test/crdt-blocks.ts
Tests: 122 passed, 122 total
```

Pass 176 also created a fresh detached worktree at the exact backlink-aware known-fixes base, avoiding the mutable shared checkout:

```text
base = f256024286dd80a4c0e2579f658c109256abf648
worktree = /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-176/work/da6c-knownfix-f256-pass176
test file = packages/core-data/src/utils/test/da6c-pass176-crdt-read-stale.ts
```

The pass-176 known-fixes negative still fails after exercising a CRDT-read stale snapshot:

```text
npm run test:unit -- packages/core-data/src/utils/test/da6c-pass176-crdt-read-stale.ts --runInBand

FAIL packages/core-data/src/utils/test/da6c-pass176-crdt-read-stale.ts
Tests: 2 failed, 2 total

keeps an unobserved remote insert after a reloaded editor saves an unchanged stale block snapshot:
Expected ["Baseline", "Shared anchor", "Primary paragraph", "Trailing"]
Received ["Baseline", "Shared anchor", "Trailing"]

persists both same-anchor appends after a stale reloaded editor writes its full block snapshot:
Expected length: 5
Received length: 4
Received array: ["Baseline", "Shared anchor", "Collaborator paragraph", "Trailing"]
```

`wp-env status` on the requested port `9936` reported the PR-branch environment as uninitialized. A bounded `wp-env start` failed while creating phpMyAdmin because host port `9000` is already allocated by another wp-env container, so fresh local Playwright remains blocked by environment setup. The committed natural-user Playwright repro and existing annotated evidence video remain the browser-level artifacts for this pass.

Pass 176 contribution: this reverified that the existing branch, video, and fix still satisfy the requested standard on current trunk, and it independently reran the current known-fixes negative from a new detached `f256024...` worktree. The practical impact classification remains `medium` inside RTC collaboration: the ordinary trigger is a reloaded or joining editor saving a stale full block snapshot after another collaborator's paragraph insert, which is uncommon but natural in collaborative editing and persists as real content loss after save/reload.

## Pass 177 Verification

Pass 177 fetched current `origin/trunk` and rebased both branches again:

```text
origin/trunk = daf20d82b937e13d0f55e908008be8b3037c2d67
```

The PR branch still has exactly three commits over trunk:

```text
a4207cfaeed Add RTC stale top-level append regression test
9ac51d90b99 Add RTC stale append persistence browser repro
6630f171e31 Preserve RTC remote inserts across stale block snapshots
```

The rebased PR branch still passes the focused CRDT unit files:

```text
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt.ts --runInBand

PASS packages/core-data/src/utils/test/crdt.ts
PASS packages/core-data/src/utils/test/crdt-blocks.ts
Tests: 122 passed, 122 total
```

`git diff --check origin/trunk...HEAD` also passed on the PR branch.

Pass 177 added a narrower, one-test adapter-level negative in the existing detached exact known-fixes worktree:

```text
base = f256024286dd80a4c0e2579f658c109256abf648
worktree = /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-177/exact-f256
test file = packages/core-data/src/utils/test/da6c-pass177-crdt-read-stale.ts
```

The test models the ordinary reload/hydration path only: `getPostChangesFromCRDTDoc()` hydrates an editor from the CRDT document, another collaborator inserts `Primary paragraph`, and the hydrated editor writes a stale full `blocks` snapshot with `Collaborator paragraph` after the same shared anchor. The exact known-fixes base still drops the unobserved remote insert:

```text
npm run test:unit -- packages/core-data/src/utils/test/da6c-pass177-crdt-read-stale.ts --runInBand

FAIL packages/core-data/src/utils/test/da6c-pass177-crdt-read-stale.ts
Expected length: 5
Received length: 4
Received array: ["Baseline", "Shared anchor", "Collaborator paragraph", "Trailing"]
```

Pass 177 also re-read the source scenario from the refresh checkout. The provided spec path is no longer present in the main checkout, but the refresh source shows normal user actions for the failing sequence: visible text click, `End`, `Enter`, keyboard typing, save, collaborator reload, and further visible block deletes. Trace evidence is consistent with a product merge failure rather than a malformed generated spec: the primary marker was typed at trace time `55008.065` and visibly found; the collaborator marker was typed at `55655.889` and visibly found; later convergence snapshots at calls `1369` and `1374` contain only the collaborator marker in both normalized `blocks` and `serializedContent`.

For a fresh browser check, `wp-env` started on the requested port `9936`, but the committed Playwright repro could not reach its assertion. The first run failed in global setup because the local wp-env had not installed the optional `gutenberg-test-plugin-disables-the-css-animations` test plugin. After installing that local test plugin into wp-env without changing the branch, the repro reached the test body but timed out waiting for `_wpCollaborationEnabled === true`. This is an RTC harness/readiness blocker, not a content-loss result. The source trace and pass-167 annotated video remain the browser-level evidence.

Pass 177 contribution: this rebases both branches to the latest trunk, reruns the fixed-branch focused suite, and adds a fresh exact-`f256024...` negative that isolates the practical reload/hydration route. The real-user likelihood classification remains `medium` for RTC collaborators and low across all Gutenberg usage. The workflow is natural but timing-dependent: two active editors, one reload/join/hydration window, one remote paragraph insert, one stale full block snapshot, then save/reload persistence.
