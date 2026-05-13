# 703ef0771ea5: stale local table-body structural merge after remote append

## Verdict

This is a real RTC table merge defect in the backlink-aware known-fixes stack,
not a readiness wait or locator failure. The original fuzz seed used ordinary
Table block toolbar operations and produced a persistent `core/table`
`attributes.body` split: one peer duplicated a row, lost a previously appended
row, and missed a later tail-cell edit.

The exact generated browser spec from the handoff was weak because it caught
the final convergence error without asserting it. Pass 170 reconstructed the
sequence at the CRDT layer and reproduced the failure on the May 7 known-fixes
base, `f256024286dd80a4c0e2579f658c109256abf648`. Pass 173 rechecked the
current known-fixes checkout at `c8af86c24a5c70784e4604b66b772a0511859a00`
and the same low-level repro still fails with a duplicated
`remote append A` / `remote append B` row.

## Practical Impact

Real-user likelihood: low.

Natural workflow:

- Editor surface: post editor with real-time collaboration enabled.
- Transport: the source signature used HTTP polling sync.
- Block type: `core/table`, specifically the schema query array
  `attributes.body`.
- Users/tabs: two active browser sessions in the same post.
- Editing order: one user appends a table row; the other user deletes an older
  row from a stale local base after receiving that append; the same peer later
  appends/prepends rows; the first user edits the later tail row.
- Save/reload: not necessary for the minimized live CRDT failure, although the
  source seed included checkpoint/save/reload variants.
- Delay/faults: no malformed block injection, direct state mutation, or
  artificial network fault is required for the minimized repro.

Common prerequisites are ordinary table row append/delete/prepend and cell edit
operations. Rare prerequisites are simultaneous RTC editing of the same table
and the stale local cache interleaving where a local delete is computed against
a pre-append base. The marker text, deterministic waits, and REST-created post
are fuzz/test conveniences.

Blast radius is silent content corruption: duplicated table rows, lost rows,
and missed cell edits in the live shared document. This is not just UI paint
state; the failing low-level Yjs document contains the duplicate/lost row state.
There is no evidence of a save loop, OOM/performance failure, or hard editor
crash. Recovery is manual: a collaborator must notice the table split before
reload/save and re-enter the missing row or use revisions/undo where available.

Strongest evidence for `low`: the actions are normal editor actions, and the
CRDT repro needs no synthetic block tree. Strongest evidence against a higher
classification: it needs RTC enabled, two active sessions on the same table,
and a narrow row append/delete/append/prepend/edit order.

Shortest additional confidence experiment: run a minimized browser repro that
stops immediately after the remote append plus stale delete interleaving, then
save/reload and fetch the REST post body and `_crdt_document`. That would prove
the earliest natural trigger and persistence path without the fuzz-derived
append/prepend/tail-edit suffix.

## Root Cause

The proposed stale local table merge path introduced by
`9c5dba15654e` (`Preserve remote CRDT edits from stale local snapshots`) and
carried through `f89b619813c` (`Fix stale table row append CRDT merge`) treats
some query-array substitutions as safe in-place edits.

The bad state is:

1. Previous local table body: `[row1, row2]`.
2. Current CRDT table body after remote append: `[row1, row2, appended]`.
3. Local user deletes `row2` from the stale base and submits
   `[row1, appended]`.

`mergeYArrayLocalChanges()` sees equal `previousValue.length` and
`newValue.length`, pairs `previousValue[1]` (`row2`) with `newValue[1]`
(`appended`), finds `row2` in the current Y.Array, and merges the appended row
content into that Y.Map. The real appended row remains at the tail, so the table
becomes `[row1, appended, appended]`.

The May 7 integration already added a guard for length-changing stale local
arrays, but this bug is an equal-length structural replacement. Stable query
array element ids are present; the merge code just failed to use them to reject
the in-place path.

Relevant history:

- `09a21c64b5b9` / #76913 added schema-aware nested table cell merging.
- `a6bfd3e55432` / #77164 made structural Y.Array changes preserve identity.
- `876398df67b8` and `9c5dba15654e` added stale snapshot preservation paths.
- `f89b619813cc` added the stale table row append merge path that reproduces
  this equal-length structural case.

## Fix Plan

Initial plan: make `mergeYArrayLocalChanges()` detect any changed row and merge
it in place only when the old row can be found in the current Y.Array.

Robustness audit:

- Kernel-maintainer view: row identity is the contract; content equality is not
  a safe proxy when arrays can contain duplicate rows.
- Jepsen view: a stale full-snapshot update is a rebase operation. If an array
  element id changes at a position, that is a structural operation and must be
  handled by the structural/id-aware merge, not an in-place map mutation.
- Simplicity/performance view: avoid adding another diff algorithm. The cheap
  id comparison is O(1) per changed paired element and falls back to the
  existing id-aware path.

Revised plan: in `mergeYArrayLocalChanges()`, when a changed paired element has
stable query-array ids and the ids differ, return `false`. That delegates the
operation to `mergeYArrayByElementIds()`, which deletes skipped stale rows,
preserves the already-appended remote row, and then applies the local cell edit.

## Verification

Known-fixes base before this fix:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-170/work/703-exact-knownfix
npm run test:unit -- packages/core-data/src/utils/test/crdt-703ef0771ea5-exact-sequence.test.ts --runInBand
```

Result before the guard: failed with duplicated `remote append A` after the
collaborator delete step.

Current known-fixes checkout before this fix:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-173/work/703ef0771ea5-c8af-knownfix
git rev-parse HEAD
npm run test:unit -- packages/core-data/src/utils/test/crdt-703ef0771ea5-exact-sequence.test.ts --runInBand
```

Result: `HEAD` was `c8af86c24a5c70784e4604b66b772a0511859a00`; the focused
test failed because the CRDT table body had an extra `remote append A` /
`remote append B` row.

Pass 174 added a shorter scratch-only CRDT repro that stops immediately after
the earliest bad interleaving: remote row append, then stale-local delete of
the old tail row. On the same `c8af86c24a5c70784e4604b66b772a0511859a00`
known-fixes head, that minimized test failed with `[row1, remote append,
remote append]`, proving the append/prepend/tail-cell-edit suffix is not needed
to trigger the corruption. The same minimized test passed on the fix branch.

The same natural-user Playwright spec on this current known-fixes checkout
timed out in `waitForCollaborationReady()` before exercising the table
sequence, so that run is harness/readiness evidence only.

Earlier local scratch verification after the guard:

```bash
npm run test:unit -- packages/core-data/src/utils/test/crdt-703ef0771ea5-exact-sequence.test.ts packages/core-data/src/utils/test/crdt-stale-query-array.test.ts packages/core-data/src/utils/test/crdt-table-query-identity.test.ts packages/core-data/src/utils/test/crdt-table-duplicates-repro.test.ts --runInBand
```

Result: 4 suites passed, 8 tests passed.
Those adjacent scratch tests are not all committed on the current PR branch;
the committed PR branch regression suite for this signature is
`packages/core-data/src/utils/test/crdt-703ef0771ea5-exact-sequence.test.ts`.

PR branch verification, rebased onto `origin/trunk` at
`6aa5ea1a40db818a9c0d2d85d0d0476f7d40392a`:

```bash
npm run test:unit -- packages/core-data/src/utils/test/crdt-703ef0771ea5-exact-sequence.test.ts --runInBand
WP_ENV_PORT=9946 WP_BASE_URL=http://localhost:9946 RTC_MANIFEST_WS_START_PORT=20768 RTC_MANIFEST_WS_FIXED_PORT=1 npm run wp-env start -- --config .wp-env.test.json
WP_ENV_PORT=9946 WP_BASE_URL=http://localhost:9946 RTC_MANIFEST_WS_START_PORT=20768 RTC_MANIFEST_WS_FIXED_PORT=1 PLAYWRIGHT_HTML_OPEN=never npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-703ef0771ea5-realistic.spec.ts
```

Results: the focused unit test passed after the May 9 rebase. The natural
Playwright repro passed headlessly before the rebase; the spec and fix content
were unchanged by the rebase.

`npm run build` could not complete in this worktree because the theme primitive
token generation step failed with `TypeError: [object Object] is not a valid
color space`; the JS/PHP build subprocesses finished before that failure. The
strict ESLint command was also blocked by a missing generated
`@wordpress/theme/build/prebuilt/js/design-tokens.cjs` module in the symlinked
dependency setup. `git diff --check HEAD~3..HEAD` passed.

Pass 175 rechecked the exact manifest base and the later local known-fixes
path state separately:

```bash
git worktree add --detach /private/tmp/gutenberg-703-pass175-f256.81226 \
	f256024286dd80a4c0e2579f658c109256abf648
git -C /private/tmp/gutenberg-703-pass175-f256.81226 cherry-pick --no-commit \
	450376d7c77
npm --prefix /private/tmp/gutenberg-703-pass175-f256.81226 run test:unit -- \
	packages/core-data/src/utils/test/crdt-703ef0771ea5-exact-sequence.test.ts \
	--runInBand

git worktree add --detach /private/tmp/gutenberg-703-pass175-c8af.81643 \
	c8af86c24a5c70784e4604b66b772a0511859a00
git -C /private/tmp/gutenberg-703-pass175-c8af.81643 cherry-pick --no-commit \
	450376d7c77
npm --prefix /private/tmp/gutenberg-703-pass175-c8af.81643 run test:unit -- \
	packages/core-data/src/utils/test/crdt-703ef0771ea5-exact-sequence.test.ts \
	--runInBand
```

Both negative controls failed with the same extra `remote append A` /
`remote append B` table row. This confirms the bug survives the manifest's
exact `f256024286d` synthetic known-fixes base and the later `c8af86c24a5`
known-fixes-derived checkout.

The PR branch was rebased again onto current `origin/trunk`
`b38f9b4d86d0505199f5efd78c2adf213e428e78` in pass 175:

```bash
git -C /private/tmp/gutenberg-703-pr-pass171.DoXd2p rebase origin/trunk
npm run test:unit -- \
	packages/core-data/src/utils/test/crdt-703ef0771ea5-exact-sequence.test.ts \
	--runInBand
git diff --check origin/trunk..HEAD
```

Result: the rebase completed cleanly, the focused unit test passed, and
`git diff --check` passed. The pass-170 annotated headless video remains the
current browser artifact; pass 175 did not rerun Playwright because the natural
spec and fix code were unchanged except for the clean rebase.

Pass 176 added a target-context check that is important for interpreting the
artifact branches:

```bash
git fetch origin trunk
git worktree add --detach .../pass-176/703ef0771ea5-trunk-min origin/trunk
git -C .../pass-176/703ef0771ea5-trunk-min cherry-pick --no-commit 450376d7c77
npm run test:unit -- \
	packages/core-data/src/utils/test/crdt-703ef0771ea5-exact-sequence.test.ts \
	--runInBand
```

Result: passed on current `origin/trunk`
`b38f9b4d86d0505199f5efd78c2adf213e428e78`. That does not disprove the
known-fixes bug; current trunk does not contain the stale-local
`mergeYArrayLocalChanges()` path from `9c5dba15654e` / PR 77887. A direct
ancestor check returned `1` for `9c5dba15654e` in `origin/trunk` and `0` for
the same commit in `f256024286dd80a4c0e2579f658c109256abf648`.

The same pass-176 test matrix failed on the relevant proposed PR head and on
the exact synthetic known-fixes base:

```bash
git worktree add --detach .../pass-176/703ef0771ea5-pr77887-head pr/77887
git -C .../pass-176/703ef0771ea5-pr77887-head cherry-pick --no-commit 450376d7c77
npm run test:unit -- \
	packages/core-data/src/utils/test/crdt-703ef0771ea5-exact-sequence.test.ts \
	--runInBand

git worktree add --detach .../pass-176/703ef0771ea5-f256-matrix \
	f256024286dd80a4c0e2579f658c109256abf648
git -C .../pass-176/703ef0771ea5-f256-matrix cherry-pick --no-commit 450376d7c77
npm run test:unit -- \
	packages/core-data/src/utils/test/crdt-703ef0771ea5-exact-sequence.test.ts \
	--runInBand
```

Results:

- `pr/77887` (`9c5dba15654e`) failed before the final assertions because the
  later appended tail row could no longer be found.
- `f256024286d` failed with the same extra duplicate `remote append A` /
  `remote append B` row recorded in pass 175.
- `try/stale-local-structural-table-body-merge-after-remote-appen-703ef0771ea5-pr`
  at `114e27186b598ad378ecdc64febf6395739cf899` passed the focused unit test
  and `git diff --check origin/trunk..HEAD`.

Practical impact nuance: for users on current trunk alone, this exact repro is
not currently a red test because the risky stale-local merge path is absent.
For users or reviewers evaluating the backlink-aware known-fixes/proposed RTC
stack, the bug remains real unless the stable-id mismatch guard from the PR
branch is included.

Pass 177 refreshed that target-context matrix after `origin/trunk` advanced to
`daf20d82b937e13d0f55e908008be8b3037c2d67`.

```bash
git fetch origin trunk
git rebase origin/trunk
```

Results:

- The explanation branch rebased cleanly.
- The PR branch rebased cleanly and kept the requested commit order:
  `9355bf9819c Add stale table body CRDT repro`,
  `6786e4b2656 Add stale table body collaboration repro`,
  `c2f23b8a26d Fix stale table body structural merges`.

Fresh pass-177 focused matrix:

```bash
git worktree add --detach .../pass-177/703ef0771ea5-f256-exact \
	f256024286dd80a4c0e2579f658c109256abf648
git -C .../pass-177/703ef0771ea5-f256-exact cherry-pick --no-commit \
	450376d7c77
npm run test:unit -- \
	packages/core-data/src/utils/test/crdt-703ef0771ea5-exact-sequence.test.ts \
	--runInBand
```

Result: failed on exact known-fixes base with an extra duplicate
`remote append A` / `remote append B` row.

```bash
git fetch origin '+pull/77887/head:refs/heads/pr/77887'
git worktree add --detach .../pass-177/703ef0771ea5-pr77887-exact pr/77887
git -C .../pass-177/703ef0771ea5-pr77887-exact cherry-pick --no-commit \
	9355bf9819c
npm run test:unit -- \
	packages/core-data/src/utils/test/crdt-703ef0771ea5-exact-sequence.test.ts \
	--runInBand
```

Result: failed on refreshed PR 77887 head `9c5dba15654e`, before the final
row-equality assertions, because the later appended tail row was already gone.

```bash
git worktree add --detach .../pass-177/703ef0771ea5-trunk-exact origin/trunk
git -C .../pass-177/703ef0771ea5-trunk-exact cherry-pick --no-commit \
	9355bf9819c
npm run test:unit -- \
	packages/core-data/src/utils/test/crdt-703ef0771ea5-exact-sequence.test.ts \
	--runInBand
```

Result: passed on current `origin/trunk`. `git grep` found no
`mergeYArrayLocalChanges` or `__unstableSyncId` in
`packages/core-data/src/utils/crdt-blocks.ts` on current trunk, so this is
expected and does not disprove the proposed-stack bug.

```bash
npm run test:unit -- \
	packages/core-data/src/utils/test/crdt-703ef0771ea5-exact-sequence.test.ts \
	--runInBand
git diff --check origin/trunk..HEAD
```

Result on the rebased PR branch: the focused unit test passed and
`git diff --check` passed.

The pass-177 natural Playwright attempt on the rebased fixed branch did not
reach the table workflow. It failed in `waitForCollaborationReady()` at
`test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts:323`,
with the editor loaded but `window._wpCollaborationEnabled` not true before the
15s readiness timeout. That is a harness/readiness gap for this pass, not a
product-failure signal. The existing pass-170 annotated fixed-workflow MP4
still exists and validates with `ffprobe` as an 8.566667s, 212080-byte video.

Pass 178 refreshed the branches again after `origin/trunk` advanced to
`569ea262b573872d5f364e9f4829132c47c683d4`.

```bash
git fetch origin trunk
git -C /Users/danluu/dev/fuzz/gutenberg-bug-703ef0771ea5 rebase origin/trunk
git -C .../pass-177/703ef0771ea5-pr-branch rebase origin/trunk
```

Results:

- Explanation branch post-rebase head before this documentation note:
  `bbf765725951d26c945f520c42d0a01f40ef78a7`.
- PR branch head:
  `343ca23e916bad6392a636d7fd19d2bf814b6efd`.
- PR branch commit order remains:
  `cc4813e718d Add stale table body CRDT repro`,
  `7ff8ccce472 Add stale table body collaboration repro`,
  `343ca23e916 Fix stale table body structural merges`.
- `git diff --check origin/trunk..HEAD` passed on the PR branch.
- The focused unit repro passed on the refreshed PR branch.

Pass-178 target matrix:

```bash
git worktree add --detach .../pass-178/703ef0771ea5-f256-exact \
	f256024286dd80a4c0e2579f658c109256abf648
git -C .../pass-178/703ef0771ea5-f256-exact cherry-pick --no-commit \
	cc4813e718d
npm run test:unit -- \
	packages/core-data/src/utils/test/crdt-703ef0771ea5-exact-sequence.test.ts \
	--runInBand
```

Result: failed on exact known-fixes base with a duplicate
`remote append A` / `remote append B` row.

```bash
git fetch origin '+pull/77887/head:refs/heads/pr/77887'
git worktree add --detach .../pass-178/703ef0771ea5-pr77887-head \
	refs/heads/pr/77887
git -C .../pass-178/703ef0771ea5-pr77887-head cherry-pick --no-commit \
	cc4813e718d
npm run test:unit -- \
	packages/core-data/src/utils/test/crdt-703ef0771ea5-exact-sequence.test.ts \
	--runInBand
```

Result: failed on refreshed PR 77887 head `9c5dba15654e`, with the later
appended tail row already missing before the final table equality assertion.

```bash
git worktree add --detach .../pass-178/703ef0771ea5-trunk-exact origin/trunk
git -C .../pass-178/703ef0771ea5-trunk-exact cherry-pick --no-commit \
	cc4813e718d
npm run test:unit -- \
	packages/core-data/src/utils/test/crdt-703ef0771ea5-exact-sequence.test.ts \
	--runInBand
```

Result: passed on current `origin/trunk` at `569ea262b573872d5f364e9f4829132c47c683d4`.
This continues to mean the proposed/known-fixes stack is vulnerable while
current trunk alone does not contain the risky stale-local path.

Pass 178 also retried the natural Playwright repro on the refreshed fixed
branch after starting `wp-env` on port 9946. The run again failed before any
table action in `waitForCollaborationReady()`, this time at
`fixtures/collaboration-utils.ts:311`, with the editor loaded but
`window._wpCollaborationEnabled` still not true after 15s. The screenshot and
trace are local harness artifacts under
`test/e2e/artifacts/test-results/editor-collaboration-triag-9db65-prepend-and-stale-tail-edit-chromium/`.
The environment was stopped after the attempt.

Pass 179 rebased both artifact branches onto current `origin/trunk`
`b41e4e944f7852d89ac58ecfd1dc854447173fa2`. The PR branch kept the requested
three-commit order:

- `20aea65d1b6 Add stale table body CRDT repro`
- `3376af99af0 Add stale table body collaboration repro`
- `4adaba6162b Fix stale table body structural merges`

Pass 179 also tightened the real-user workflow evidence by checking the Table
block implementation directly. `core/table` stores `attributes.body` as a
query array of `tbody tr` rows in `packages/block-library/src/table/block.json`
lines 66-110. The visible toolbar actions in `packages/block-library/src/table/edit.js`
lines 258-298 call `setAttributes( insertRow( attributes, ... ) )` and
`setAttributes( deleteRow( attributes, ... ) )`; those helpers in
`packages/block-library/src/table/state.js` lines 161-216 return replacement
row arrays using normal slice/filter operations. That means the low-level
stale full-array rebase shape used by the CRDT repro is not a synthetic block
tree mutation: it is the ordinary representation produced by Table block row
insert/delete controls. The rare part remains RTC concurrency on the same table
and the stale-local interleaving, not the editing operation itself.

Pass 180 rebased both artifact branches onto current `origin/trunk`
`cb74beb786b366ff69dac328b04861add1a67974`. The PR branch kept the requested
three-commit order:

- `bb449f1fc86 Add stale table body CRDT repro`
- `d2e61ede566 Add stale table body collaboration repro`
- `cc1fa4f35ec Fix stale table body structural merges`

Fresh pass-180 checks:

```bash
git fetch origin trunk
git -C /Users/danluu/dev/fuzz/gutenberg-bug-703ef0771ea5 \
	rebase --autostash origin/trunk
git -C .../pass-177/703ef0771ea5-pr-branch rebase origin/trunk
git -C .../pass-177/703ef0771ea5-pr-branch diff --check origin/trunk..HEAD
git -C .../pass-177/703ef0771ea5-pr-branch \
	npm run test:unit -- \
	packages/core-data/src/utils/test/crdt-703ef0771ea5-exact-sequence.test.ts \
	--runInBand
```

Results: both rebases completed cleanly. The explanation branch had a
pre-existing `.cache/.gitkeep` deletion, so `--autostash` preserved it. The
PR branch focused unit test passed, 1 suite / 1 test, and `git diff --check`
reported no whitespace errors.

Pass 180 also refreshed the negative controls:

```bash
git -C .../pass-178/703ef0771ea5-f256-exact rev-parse HEAD
git -C .../pass-178/703ef0771ea5-f256-exact \
	npm run test:unit -- \
	packages/core-data/src/utils/test/crdt-703ef0771ea5-exact-sequence.test.ts \
	--runInBand
```

Result: exact known-fixes base `f256024286dd80a4c0e2579f658c109256abf648`
still failed with an extra duplicate `remote append A` / `remote append B`
row.

```bash
git fetch origin '+pull/77887/head:refs/heads/pr/77887'
git rev-parse pr/77887
git -C .../pass-178/703ef0771ea5-pr77887-head \
	npm run test:unit -- \
	packages/core-data/src/utils/test/crdt-703ef0771ea5-exact-sequence.test.ts \
	--runInBand
```

Result: direct PR 77887 head is still
`9c5dba15654eda53a98889978e6751c22e0ca2af` and still failed before the final
row equality assertion because `tailRow` was already `undefined`.

Current trunk remains a negative product-control for this exact signature:

```bash
git grep -n 'mergeYArrayLocalChanges\|__unstableSyncId' origin/trunk -- \
	packages/core-data/src/utils/crdt-blocks.ts
git grep -n 'mergeYArrayLocalChanges\|__unstableSyncId' \
	f256024286dd80a4c0e2579f658c109256abf648 -- \
	packages/core-data/src/utils/crdt-blocks.ts
```

Result: the first command found no matches on current trunk; the second found
both `__unstableSyncId` and `mergeYArrayLocalChanges()` in the exact known-fixes
base. The direct stale-local path is therefore still proposed-stack-specific.
