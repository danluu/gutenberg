# 703ef0771ea5: stale local table-body structural merge after remote append

## Verdict

This is a real RTC table merge defect in the backlink-aware known-fixes stack,
not a readiness wait or locator failure. The original fuzz seed used ordinary
Table block toolbar operations and produced a persistent `core/table`
`attributes.body` split: one peer duplicated a row, lost a previously appended
row, and missed a later tail-cell edit.

The exact generated browser spec from the handoff was weak because it caught
the final convergence error without asserting it. Pass 170 reconstructed the
sequence at the CRDT layer and reproduced the failure on the required May 7
known-fixes base, `f256024286dd80a4c0e2579f658c109256abf648`.

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

Shortest additional confidence experiment: run the committed Playwright repro
against a clean environment both before and after the fix with a save/reload
after the final edit, then fetch the REST post body and `_crdt_document`.

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

After the guard:

```bash
npm run test:unit -- packages/core-data/src/utils/test/crdt-703ef0771ea5-exact-sequence.test.ts packages/core-data/src/utils/test/crdt-stale-query-array.test.ts packages/core-data/src/utils/test/crdt-table-query-identity.test.ts packages/core-data/src/utils/test/crdt-table-duplicates-repro.test.ts --runInBand
```

Result: 4 suites passed, 8 tests passed.

PR branch verification:

```bash
npm run test:unit -- packages/core-data/src/utils/test/crdt-703ef0771ea5-exact-sequence.test.ts packages/core-data/src/utils/test/crdt-blocks.ts --runInBand
WP_ENV_PORT=9950 WP_BASE_URL=http://localhost:9950 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-703ef0771ea5-realistic.spec.ts --project=chromium --workers=1
```

Results: unit tests passed, and the natural Playwright repro passed headlessly.

`npm run build` could not complete in this worktree because the theme primitive
token generation step failed with `TypeError: [object Object] is not a valid
color space`; the JS/PHP build subprocesses finished before that failure. The
strict ESLint command was also blocked by a missing generated
`@wordpress/theme/build/prebuilt/js/design-tokens.cjs` module in the symlinked
dependency setup. `git diff --check HEAD~3..HEAD` passed.
