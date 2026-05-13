# RTC table prepend after remote cell edit loses the trailing row update

Bug signature: `9000e0395bb1`

Bug type: `rtc_table_prepend_after_remote_cell_edit_truncates_trailing_row`

## Summary

This is a real RTC merge defect in the nested query-array handling used by `core/table`.

The original failure is a normal editor workflow:

1. Two collaborators edit the same post over the websocket RTC transport.
2. The post contains a normal `core/table` block.
3. One collaborator edits a cell in the old trailing row.
4. The other collaborator prepends a table row while its outgoing block snapshot still contains the old trailing-cell value.

Without a correct local baseline, the merge treats the stale unchanged trailing cell as an intentional local overwrite. Depending on the exact RTC fix stack, the result is either a two-row/three-row split or a three-row table whose old trailing cell reverts from the remote value to the stale value.

## Pass 180 update

The May 7 known-fixes base at `f256024286dd80a4c0e2579f658c109256abf648` already has no-`baseRecord` stale table protections, but the normal editor path can still fail when `editEntityRecord()` forwards the current edited record as `options.baseRecord`.

Pass 180 added an integration-level repro through `applyPostChangesToCRDTDoc()`:

- current payload plus current `baseRecord` passes;
- stale table-prepend payload plus current `baseRecord` fails on unmodified `f256024286d` by reverting `B2-remote` to `B2`;
- the same repro passes after treating a `baseRecord` that matches the current CRDT document as a current snapshot, not as the user's pre-change base.

The important distinction is whether the supplied base is a true pre-change base or just the editor's current post snapshot after remote changes have been applied. If the base matches the current CRDT state, the merge must compute local deltas from the cached previous local snapshot while still using the existing stale-block reconciliation path.

## Root cause

`core/table` row and cell arrays have no stable user-visible row identity. The merge code therefore relies on positional anchors plus synthetic array element IDs.

In the failing sequence, the relevant states are:

```text
cached previous local body: [ row1, row2(B2) ]
current CRDT body:          [ row1, row2(B2-remote) ]
editor baseRecord body:     [ row1, row2(B2-remote) ]
incoming local body:        [ newRow, row1, row2(B2) ]
```

On `f256024286d`, `mergeCrdtBlocks()` prefers `baseRecord.blocks` over the cached previous local blocks and skips stale-local reconciliation whenever a base is supplied. That makes `row2(B2)` look like a deliberate local change from `row2(B2-remote)` back to `row2(B2)`.

## Fix direction

When `baseRecord.blocks` is supplied, compare it with the current `Y.Array` contents after stripping synthetic array element IDs.

- If the supplied base differs from the current CRDT document, keep the explicit base behavior. Existing known-fixes tests rely on this for direct rebasing cases.
- If the supplied base matches the current CRDT document, treat it as a current editor snapshot and use `previousLocalBlocksCache` as the local delta base. In that case, still run `reconcileStaleLocalBlocks()` so remote top-level inserts/deletes are not lost.

This narrowly fixes the integration-path survivor without regressing the existing duplicate-row and stale nested-object tests in `packages/core-data/src/utils/test/crdt-blocks.ts`.

## Verification

Pass 180 refreshed the PR branch on top of the exact known-fixes base:

`https://github.com/danluu/gutenberg/tree/try/rtc-table-prepend-after-remote-cell-edit-truncates-trailin-9000e0395bb1-pr`

Commits:

```text
90c06f95f68 Add RTC table base-record stale snapshot repro
3ae1701154f Add RTC table prepend natural browser repro
ba7c5c9cb25 Preserve table edits when base record is current
```

Commands run on the fixed branch:

```bash
npm run --workspace @wordpress/unit-tests test:unit -- packages/core-data/src/utils/test/crdt-9000e0395bb1-pass180-apply-post-base-record.test.ts --no-cache
npm run --workspace @wordpress/unit-tests test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --testNamePattern="table|stale|Y.Map identity" --no-cache
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-9000e0395bb1-pass180-apply-post-base-record.test.ts test/e2e/specs/editor/collaboration/websocket/triage-9000e0395bb1-realistic.spec.ts
git diff --check HEAD~3..HEAD
```

All passed. The Playwright spec was materialized but not rerun in pass 180 because the exact-base `wp-env` was uninitialized and no full Gutenberg build was available in the scratch worktree.

Existing historical browser evidence remains at:

`/Users/danluu/dev/fuzz/gutenberg-bug-9000e0395bb1/artifacts/9000e0395bb1-video/9000e0395bb1-annotated-stitch.mp4`
