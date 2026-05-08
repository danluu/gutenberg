# 59b7e7cdec39: stale local table body merge after remote divergence

## Summary

`59b7e7cdec39` is a real RTC table merge bug. It affects `core/table`
`attributes.body` when two collaborators edit the same table row range: one user
edits and deletes the old tail row while another user edits that stale tail row
and appends a replacement row.

The May 8 pass reproduced the issue below the browser with Yjs/core-data unit
tests and with a natural two-editor Playwright flow over the HTTP polling
transport. The current known-fixes base
`f256024286dd80a4c0e2579f658c109256abf648` still fails the focused stale-row
replacement case, so this is not covered by the May 7 known-fixes integration.

## Practical Impact

Likelihood: low.

The natural workflow is ordinary, but the timing is narrow:

- Editor surface: post editor with RTC enabled.
- Transport: HTTP polling collaboration.
- Block type: `core/table`.
- Actions: user A edits the first row and deletes the old tail row; user B still
  has the old tail row locally, edits it, inserts a row after it, and types into
  the replacement row.
- Timing: the stale local edit and append must overlap a remote structural delete
  of the same row range.
- Save/reload: no save or reload is required. Once the in-memory CRDT converges
  incorrectly, a later save can persist the bad table.
- User setup: two browser sessions or two users are required. No malformed blocks,
  direct state mutation, or artificial network faults are required.

Common prerequisites: using a table, editing table cells, inserting/deleting rows,
and RTC collaboration.

Rare prerequisites: two collaborators editing the same small row range at the same
time, with one deleting the row the other still edits.

Artificial prerequisites in the original fuzz case: generated labels and an exact
interleaving. The Playwright repro uses only normal table UI actions.

Blast radius: silent content corruption inside a table. The stale deleted row can
survive as an extra row, and the appended replacement row may diverge or be dropped
on one peer in the fuzzed shape. There is no observed save loop, persistence
failure, OOM, or performance cliff. Recovery is manual table editing or restoring
from revision/autosave history after persistence.

Strongest evidence for `low`: the browser repro passes with real user actions, no
state injection, and no synthetic malformed block tree. The failing row identity
shape was observed in the live editor: a typed table snapshot can keep a row ID on
one row while the edited tail row loses the row-level ID but keeps nested cell IDs.

Strongest evidence against a higher likelihood: it requires RTC plus concurrent
same-table structural editing. Most table edits are single-user or happen on
different rows/blocks, and a remote delete often reaches the other editor before
the stale user can complete the append.

Shortest confidence-improving experiment: run the fixed Playwright repro 50 times
against the pre-fix and fixed branches with HTTP polling interval jitter recorded.
That would estimate whether the natural concurrent UI flow is flaky or reliably
hits the vulnerable interleaving.

## Root Cause

The original CRDT block merge code was introduced by
`84019935998c` (#72262). It used a left/right positional diff for block and
attribute arrays. Later table-specific work in `09a21c64b5b` (#76913) taught
query-array attributes such as table rows and cells to use Yjs nested types. The
array stability work in `a6bfd3e55432` (#77164) added array element IDs and an
ID-based merge path.

That ID path handled fully identified arrays, but real table editing can produce
partial ID snapshots. During ordinary typing in a table, Gutenberg can clone the
edited row object. The survivor row can retain its row sync ID while the edited
tail row loses its row-level sync ID and retains only nested cell IDs.

On such a partial snapshot, `mergeYArrayByElementIds()` saw that some elements
had IDs and entered the ID-based path. It matched the identified survivor row,
then treated the ID-less edited tail row as a new row. The new row received a
fresh path-derived ID such as `body/1`, replacing the original tail row locally.
When a collaborator's delete for the original tail row ID later arrived, it no
longer matched this locally replaced stale row, so the stale row survived and
converged on both peers.

A second related problem was that the cached previous plain block snapshot did
not consistently carry IDs back from the Yjs document after merges. That made
later local snapshots harder to relate to the Yjs array, especially after a
stale row was skipped and a replacement row was inserted.

## Fix Plan

Initial plan:

1. Give query-array elements stable IDs and use previous local snapshots to
   distinguish stale local edits from local inserts.
2. Preserve appended replacement rows while refusing to resurrect rows deleted by
   a remote peer.

Kernel-maintainer audit:

- The fix must not depend on object identity from the block editor. Table editing
  legitimately clones row/cell objects.
- Partial IDs are normal input, not corrupt input.
- A partial top-level ID array must not enter an ID-only merge path that replaces
  live array element identity.

Jepsen-style audit:

- Deletes must remain deletes for the row identity they target.
- A stale full table snapshot must not act as an authoritative replacement for
  the whole body after remote divergence.
- New rows can be inserted only when they are new relative to the previous local
  snapshot, not merely because a cloned existing row lost an ID.

Dan-Luu-style simplicity/performance audit:

- Avoid a global LCS or expensive content matching on every table keystroke.
- Reuse the existing previous-snapshot cache and Yjs nested merge functions.
- Keep matching local to the array being merged.

Revised plan:

1. Hydrate array element IDs from the current Yjs document back into the cached
   previous plain block snapshot after each merge. Hydration matches by existing
   ID, then exact value with same-index preference, so a replacement row ID is not
   written onto a skipped stale row.
2. When a previous element has an ID and the incoming cloned element lost it,
   carry the previous ID forward before merging.
3. Do not run `mergeYArrayByElementIds()` unless every top-level incoming element
   has an ID. Partial top-level ID snapshots fall back to the previous-snapshot
   merge path instead of replacing identity.
4. Add low-level and post-level repros for remote-delete-first, remote-delete-late,
   incremental append typing, partial row IDs, and independent peer
   initialization.
5. Add a two-editor Playwright repro using only table UI controls.

## Verification

Known-fixes base check:

```bash
git -C /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-current-20260507 rev-parse HEAD
# f256024286dd80a4c0e2579f658c109256abf648

npm run test:unit -- packages/core-data/src/utils/test/crdt-stale-table-row-append.test.ts --runInBand --testNamePattern='keeps a stale-local append while dropping a stale edit to a remotely deleted row'
# failed on the known-fixes base
```

Fixed branch checks:

```bash
npm run test:unit -- packages/core-data/src/utils/test/crdt-59b7e7cdec39-table-merge.test.ts packages/core-data/src/utils/test/crdt-59b7e7cdec39-post-table-merge.test.ts packages/core-data/src/utils/test/crdt-blocks.ts --runInBand
# PASS, 3 suites, 82 tests

npm run build -- --skip-types
# PASS

WP_ENV_PORT=10176 WP_BASE_URL=http://localhost:10176 WP_ENV_PHPMYADMIN_PORT=10177 RTC_MANIFEST_WS_START_PORT=22608 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-59b7e7cdec39-realistic.spec.ts --project=chromium --workers=1
# PASS, 1 test
```

## Residual Risk

This fix keeps matching intentionally local and cheap. It does not solve every
possible concurrent table reorder/delete/edit case. The remaining risk is more
complex multi-row reordering or duplicate-content rows where exact value matching
is ambiguous. The added partial-ID regression covers the shape found in the
browser trace for this bug.
