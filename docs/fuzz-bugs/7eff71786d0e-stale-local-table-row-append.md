# RTC stale-local table row append drop (`7eff71786d0e`)

## Summary

`7eff71786d0e` is a real RTC table merge defect. In a collaborative post editor
session, one user can delete a table row, receive a collaborator's edit to the
surviving row, and then append a new row from a stale local table snapshot. The
original browser artifact and some intermediate PR heads drop the appended row.
Current upstream `origin/trunk` no longer drops that row in the focused unit
shape, but it still loses the collaborator's remote cell edit. The rebased fix
preserves both operations.

The original HTTP shard used real editor table controls and failed semantic
table convergence, not selector readiness, malformed block markup, injected
state, or an inverted assertion.

## Natural User Workflow

The browser repro uses ordinary editor actions:

1. Open a draft post with a two-row `core/table` in two collaborating editor
   sessions.
2. In the primary editor, select a cell in row 2 and use `Edit table` ->
   `Delete row`.
3. Wait for RTC convergence.
4. In the collaborator editor, edit the remaining row's last cell.
5. Wait for RTC convergence.
6. In the primary editor, use `Edit table` -> `Insert row after` and type into
   both cells of the appended row.

The old failing artifact ended with the primary editor containing the remote
cell edit plus the appended row, while the collaborator contained only the
remote cell edit. The current-trunk unit shape keeps the appended row but
reverts the remote cell edit, so it remains a data-loss class stale-table merge
bug even though the exact current low-level symptom differs from the archived
browser row-drop symptom.

## Low-Level Reproduction

The focused unit repro exercises `mergeCrdtBlocks()` with two `Y.Doc`
instances:

1. Both docs start with a two-row table.
2. Doc A deletes row 2 and syncs to doc B.
3. Doc B edits row 1 cell B and syncs back to doc A.
4. Doc A merges a stale local snapshot containing the old row 1 plus a newly
   appended row.

Pass 177 ran that repro as a matrix:

```text
manifest-trunk-86d1   failed
current-origin-trunk  failed
pr-77775              failed
pr-77887              failed
pr-77924              failed
knownfix-f256         passed
existing-pr-f89b      passed
current-origin-trunk-3d0 failed
```

Current `origin/trunk`, manifest trunk `86d1`, and `pr/77924` keep the appended
row but overwrite the collaborator's remote cell edit with the stale local cell
value. `pr/77775` and `pr/77887` still drop the appended row in this unit test
shape. The synthetic known-fixes integration commit
`f256024286dd80a4c0e2579f658c109256abf648` preserves both operations for the
exact archived row-append shape, as does the rebased PR branch.

Pass 178 reran the full focused stale-table file against current
`origin/trunk` `96263113a87`, the synthetic known-fixes commit `f256024...`, and
the rebased PR branch. Current trunk failed all six cases. The synthetic
known-fixes commit passed the exact archived append-after-remote-edit case, but
failed two broader stale-table cases: stale local edit plus append after remote
delete, and stale local delete after remote replacement. The rebased PR branch
passed all six cases.

## Root Cause

The failure is in nested query-array reconciliation for the table block's
`body` attribute. There are two bad fallback shapes:

- a stale-local helper may conclude that a shared prefix handled the whole
  array and drop the local append;
- a base-unaware array merge may keep the append but treat the stale local row
  as authoritative, overwriting the remote edit.

The problematic stale-local path treats a shared-prefix comparison as a complete
array merge:

```ts
const sharedLength = Math.min( previousValue.length, newValue.length );

for ( let i = 0; i < sharedLength; i++ ) {
	const previousElement = previousValue[ i ];
	const newElement = newValue[ i ];

	if ( arePlainValuesEqual( previousElement, newElement ) ) {
		continue;
	}

	// merge paired changed elements only
}

return true;
```

For this bug:

```text
previousValue = [ surviving row before remote edit ]
yArray        = [ surviving row with remote edit ]
newValue      = [ stale surviving row, appended row ]
```

The only shared element is unchanged between `previousValue` and the stale
`newValue`, so the helper returns `true` without inserting `newValue[1]`. The
append is then lost as a collaborative operation.

The final known-fixes integration avoids the append-drop early return for
length-changing stale snapshots:

```ts
if ( newValue.length !== previousValue.length ) {
	return false;
}
```

That lets the base-aware merge path handle the append while keeping the remote
edit. The PR branch goes further and applies the local delta over the previous
local snapshot so both the old append-drop failure and the current remote-edit
overwrite failure are covered.

## Fix Plan

The fix should treat a stale editor snapshot as a local delta over the previous
local snapshot, not as complete array truth:

- preserve remote edits already present in the current `Y.Array`;
- insert local additions at the nearest surviving anchor;
- delete only previous elements that the local snapshot actually removed and
  that still exist remotely;
- keep the logic in the CRDT adapter, not in table UI code;
- keep the algorithm linear over the affected query array.

The rebased PR branch implements this plan with focused unit coverage and a
natural Playwright repro.

## Practical Impact

Real-user likelihood is **low** on current upstream `origin/trunk` for the
stale-table data-loss class, and **very-low** for the exact appended-row-drop
symptom on the required synthetic known-fixes base. The workflow requires
active RTC collaboration plus a narrow same-table edit order, but it is not
artificial: all operations are visible post-editor table actions, and no network
fault or direct state mutation is required.

The blast radius on unfixed heads is silent table content loss/divergence. If
the peer missing the appended row saves or continues editing from that state,
the missing row can become persisted content loss. There is no evidence for
duplicate content, save loops, OOM, or performance failure in this signature.

On the required synthetic known-fixes base `f256024...`, pass-170/pass-172
browser artifacts and pass-178's first focused unit case preserve the remote
edit and the appended row, so the exact signature is not reproduced there. The
broader stale nested-array problem is not fully covered by that synthetic base.

## Verification

After pass 178 rebased the PR branch onto current `origin/trunk`
`96263113a87`, the commit order is:

```text
bdd73bcb751 Add stale table row CRDT repros
dd586fbde66 Add natural table row append collaboration repro
18bff057067 Fix stale table row append CRDT merge
```

Commands run on the pass-178 rebased PR branch:

```text
git diff --check origin/trunk...HEAD
# passed

npm run test:unit -- packages/core-data/src/utils/test/crdt-stale-table-row-append.test.ts --runInBand
# 6 passed / 6

npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-stale-table-row-append.test.ts --runInBand
# 77 passed / 77
```

Known artifacts:

```text
Annotated video:
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-167/7eff71786d0e-pass167-annotated-stitch.mp4

Source HTTP failure:
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1/fuzz-handoff/distinct-manifest-20260505/results-refresh-http-shard-1/results.jsonl

Pass-177 matrix:
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-177/7eff71786d0e-matrix/results.tsv
```
