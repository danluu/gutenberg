# RTC stale Search move can drop or duplicate intervening blocks

Bug signature: `7647898476fc`

Bug type: `rtc_ws_checkpoint_search_move_duplicates_search_and_drops_intervening_paragraph`

Transport: WebSocket

## Classification

This is a real RTC product bug, not just an artifact of the refreshed manifest
run.

The supplied refresh artifact failed before the generated action sequence reached
the Search move. Both generated attempts timed out in
`waitForSessionReady -> waitForMutualDiscovery -> waitForAwarenessPeerCount`:

```text
page.waitForResponse: Timeout 40000ms exceeded
```

That failure alone is a readiness failure. I therefore built an independent
natural-action repro and a lower-level CRDT repro.

## Independent Repro

The natural repro uses only user-visible editor operations:

1. Open the same draft in two collaborators.
2. In editor 1, select the first Search block.
3. In editor 2, focus the first top-level paragraph after the Group block and
   use the editor shortcut for Add before to insert
   `Shared editing target paragraph.`
4. Assert editor 2 really has the shared paragraph in the expected nine-block
   document.
5. In editor 1, use the block toolbar Move up button on the stale Search
   selection.
6. Assert both editors converge to the same nine-block order.

Before the fix, this reproduces after the actions, not during setup. A diagnostic
run showed editor 1 still had the stale eight-block view immediately before the
move, editor 2 had the nine-block view, and later convergence produced a
duplicated suffix in the block list.

The lower-level repros exercise `mergeCrdtBlocks()` directly:

- acknowledged remote insert, then stale Search move;
- acknowledged remote insert, then stale one-slot Search move;
- true two-document concurrent remote insert and stale Search move.

The known-fixes checkout at
`/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505` still fails
this pass's stricter lower-level test: two of the three focused cases fail.

## Root Cause

`84019935998` (`Improve CRDT "merge logic" for post entities`, #72262) introduced
the generic block-array CRDT merge. The top-level block merge uses a left/right
positional sweep over complete block snapshots. That works for many local edits,
but it treats the incoming local block array as an authoritative full snapshot.

When a collaborator inserts a paragraph while another editor has a stale selected
Search block, the mover can send a block list that:

- does not include the remote paragraph yet;
- does reorder known neighboring blocks.

The old merge cannot distinguish "this block was intentionally deleted" from
"this block is absent because the local snapshot is stale." It can therefore
delete the intervening paragraph, or, after a remote echo has advanced the last
snapshot, reconcile incompatible structural histories and duplicate part of the
document.

Later hardening commits improved adjacent RTC areas but did not solve stale
whole-block structural snapshots:

- `22e067b0243` / #75448: Y.Text for title/content/excerpt.
- `0180c417fc4` / #75703: same-rich-text collaboration.
- `128a3c29b7f` / #75923: expanded `mergeCrdtBlocks()` tests.
- `d2eb0cf1215` / #76049: emoji/surrogate-pair syncing.
- `85695dcffdc` / #76607: RichTextData deserialization.
- `09a21c64b5b` / #76913: table cell merging.
- `a6bfd3e5543` / #77164: array attribute structural stability.
- `54af1ce40068`: scoped rich-text and cursor changes.

## Fix Plan

The fix should keep the existing merge architecture but make stale local block
snapshots explicit:

- Track the previous serializable block snapshot per Y.Array.
- Reconcile unchanged attributes and inner blocks from the current Y document
  when the local block is unchanged relative to the previous snapshot.
- Preserve current blocks missing from the local snapshot when the local snapshot
  also reorders known previous client IDs. In that case the omission is more
  likely stale than an intentional delete.
- Use `clientId` identity only when every block in the compared arrays has a
  unique client ID. Fall back to the existing positional merge otherwise.
- When applying previous-snapshot skips during the positional update pass, only
  use the previous block if the incoming and current Y block have the same
  `clientId`. This prevents index-based stale skips from corrupting moved blocks.

## Robustness Audit

Kernel-maintainer view: the change is local to the CRDT block merge and keeps the
old path for malformed or duplicate IDs. It does not introduce a new cross-store
dependency or rewrite the block editor's move behavior.

Jepsen view: the key safety property is preserving acknowledged remote inserts
under stale local full-snapshot writes. The fix avoids treating every absent item
as a delete when the same incoming snapshot also proves it is stale by reordering
known previous IDs.

Simplicity/performance view: the added work is linear in top-level block count
and uses maps/sets over existing serializable snapshots. This is much smaller
than replacing the block merge algorithm. The residual risk is the ambiguous case
where a user intentionally deletes a remote block and moves another block in one
stale-looking snapshot; without action-level intent metadata, the merge has to
choose between preserving data and honoring that compound delete+move. This fix
chooses preservation.

## Verification

Useful commands:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-stale-search-move.test.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-stale-search-move.test.ts test/e2e/specs/editor/collaboration/manifest/7647898476fc-rtc-ws-checkpoint-search-move-duplicates-search-and-drops-intervening-paragraph.spec.ts
WP_ENV_PORT=9930 WP_BASE_URL=http://localhost:9930 RTC_MANIFEST_WS_START_PORT=20640 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/manifest/7647898476fc-rtc-ws-checkpoint-search-move-duplicates-search-and-drops-intervening-paragraph.spec.ts --project=chromium
```

Observed on the fix branch:

- `crdt-stale-search-move.test.ts`: 3 passed.
- `crdt-blocks.ts`: 71 passed.
- focused E2E: 1 passed.

