# RTC stale query-array snapshots overwrite remote table operations

## Summary

Issue 3 is still a real RTC merge problem below the browser layer. A collaborator can apply a remote update to a local `Y.Doc`, then a later local editor snapshot that was computed from an older table attribute can make the stale snapshot authoritative for the whole nested query array.

The deterministic repros cover three nested `core/table` query-array failures:

-   a stale local cell edit reverts a remote cell edit in another row;
-   a stale local cell edit deletes a remotely appended row;
-   a stale local snapshot resurrects a remotely deleted row.

The bug is not table UI specific. The same failure reproduces directly through `mergeCrdtBlocks()` and through the post wrapper path using `applyPostChangesToCRDTDoc()` plus `getPostChangesFromCRDTDoc()`.

## Status against known fixes

Checked on April 28, 2026 against [#77716](https://github.com/WordPress/gutenberg/issues/77716), which currently lists [#77532](https://github.com/WordPress/gutenberg/issues/77532), [#77658](https://github.com/WordPress/gutenberg/pull/77658), [#77662](https://github.com/WordPress/gutenberg/issues/77662), [#77666](https://github.com/WordPress/gutenberg/pull/77666), [#77669](https://github.com/WordPress/gutenberg/pull/77669), [#77673](https://github.com/WordPress/gutenberg/pull/77673), [#77675](https://github.com/WordPress/gutenberg/pull/77675), [#77678](https://github.com/WordPress/gutenberg/issues/77678), and [#77681](https://github.com/WordPress/gutenberg/pull/77681), with comments also referencing [#77726](https://github.com/WordPress/gutenberg/pull/77726).

This branch is based on `origin/trunk` at `5ddf4ad1b34bb0798185a663437955e7f10da01b`. That base already includes:

-   [#77669](https://github.com/WordPress/gutenberg/pull/77669), merged as `5ddf4ad1b34`;
-   [#77681](https://github.com/WordPress/gutenberg/pull/77681), merged as `e60a0cbd5d3`.

The focused repros still fail on that base, so the merged known fixes do not fix this issue.

Additional checks:

-   [#77658](https://github.com/WordPress/gutenberg/pull/77658) / [#77662](https://github.com/WordPress/gutenberg/issues/77662): cherry-picked `0fb29efe461` and `4f33ca740c1` onto this repro branch. The same four focused tests still failed. These rich-text cursor fixes do not address stale query-array authority.
-   `try/fuzz-known-issues-fixed-campaign`: cherry-picked this repro commit onto the broader known-fixes campaign branch. The direct `mergeCrdtBlocks()` repros still failed. The post-wrapper repro hit an older branch interface mismatch where `changes.blocks` was undefined, so the direct merge repros are the useful signal from that run.
-   [#77723](https://github.com/WordPress/gutenberg/pull/77723): this open table identity PR is not in the #77716 body, but it links to the tracking issue and is relevant. Cherry-picking the production identity commit `14b3da16eca` made `__unstableSyncId` appear in the table rows, but the stale snapshot tests still failed: remote appends were still deleted, remote deletes were still resurrected, and remote cell edits were still overwritten. The hardening commit `07b4a5a1267` conflicts with the current repro branch test files, and combining #77723 with #77658 conflicts in `packages/core-data/src/utils/crdt-blocks.ts`, so a full integrated known-fixes branch still needs a rebase.
-   [#77666](https://github.com/WordPress/gutenberg/pull/77666), [#77673](https://github.com/WordPress/gutenberg/pull/77673), [#77675](https://github.com/WordPress/gutenberg/pull/77675), [#77678](https://github.com/WordPress/gutenberg/issues/77678), and [#77726](https://github.com/WordPress/gutenberg/pull/77726) target title reload, nested awareness, room storage, malformed awareness input, or performance helper behavior. Their mechanisms do not make stale local block snapshots causally safe.

## Reproductions

### Block CRDT level

File:

```text
packages/core-data/src/utils/test/crdt-stale-query-array.test.ts
```

Command:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-stale-query-array.test.ts packages/core-data/src/utils/test/crdt-stale-query-array-post.test.ts -- --runInBand
```

Result on this branch:

```text
FAIL packages/core-data/src/utils/test/crdt-stale-query-array.test.ts
Expected: "remote-B2"
Received: "B2"

Expected length: 3
Received length: 2

Expected length: 2
Received length: 3
```

This uses two real `Y.Doc` instances and normal Yjs update exchange, but no browser, REST, provider, network fault injection, or direct mutation of a shared table after setup.

### Post wrapper level

File:

```text
packages/core-data/src/utils/test/crdt-stale-query-array-post.test.ts
```

Same command as above.

Result on this branch:

```text
FAIL packages/core-data/src/utils/test/crdt-stale-query-array-post.test.ts
Expected body:
[ [ "local-A1", "B1" ], [ "A2", "remote-B2" ] ]

Received body:
[ [ "local-A1", "B1" ], [ "A2", "B2" ] ]
```

This proves the issue is reachable through the same post-change adapter that collaboration uses before the generic sync provider sees updates.

### Browser level

File:

```text
test/e2e/specs/editor/collaboration/collaboration-table-stale-snapshot.spec.ts
```

Setup used locally:

```bash
WP_ENV_PORT=19043 npm run wp-env-test start
npm run build -- --skip-types
```

Command:

```bash
WP_BASE_URL=http://localhost:19043 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-table-stale-snapshot.spec.ts --project=chromium
```

Result:

```text
11 passed
```

The committed browser attempts use only normal user actions:

-   two collaborators edit different table cells;
-   one collaborator appends a table row and the other edits a different cell;
-   one collaborator keeps typing while the other appends a table row.
-   one collaborator edits a table caption while the other inserts a row;
-   one collaborator changes column alignment while the other inserts a row;
-   one collaborator undoes a local table edit after the other inserts a row;
-   one collaborator deletes a row after the other edits a different row;
-   both collaborators repeatedly use table menu actions concurrently;
-   the deprecated stock `core/text-columns` block is opened from saved content
    and tested with remote query-array text edits plus local alignment changes,
    plus simultaneous typing in different columns;
-   a late-joining collaborator opens a stale saved post after an unsaved remote
    RTC row insertion and edits during initial sync catch-up.

These natural browser interleavings did not reproduce the stale overwrite on current trunk. The only browser failures seen while searching were not RTC data-loss failures:

-   a focus-holding table-row attempt preserved the remote row, but the local
    keystrokes no longer landed in the originally focused cell after the remote
    insertion;
-   an early caption attempt failed because the caption control was not visible
    until the user clicked the normal `Add caption` toolbar button;
-   already-open table and alignment menu attempts sometimes had the menu closed
    by the collaborator update before the local user clicked the item;
-   a focused text-columns attempt preserved the remote text, but the local
    keystrokes did not land in the originally focused column after the remote
    update;
-   80-row and 500-row table alignment attempts passed in isolation, but the
    larger variant was not kept as a committed test because block toolbar
    selection was flaky in the full file.

The practical blocker for a failing Playwright repro is that the bad lower-level ordering requires a remote update to be applied to the local `Y.Doc` before a local stale editor snapshot is merged, while the block-editor store still returns the stale query-array value for a subsequent local edit. The normal editor flows tried so far either apply the remote change to editor state before the next local table/text-columns snapshot, or they move focus such that the attempted local edit does not happen. I did not use network interception, clock manipulation, direct `Y.Doc` mutation in Playwright, injected scheduler hooks, or a deliberately stale custom block to force the gap.

## Failure mechanism

`mergeCrdtBlocks()` receives a full Gutenberg block snapshot and treats it as the desired final state for the shared block tree. That is already risky for collaboration because a full local snapshot contains both local edits and old values for paths the local user did not touch.

For a table body, the relevant path is:

```text
mergeCrdtBlocks()
  -> updateYBlockAttribute()
  -> mergeYValue()
  -> mergeYArray()
  -> mergeYMapValues()
  -> mergeYValue()
  -> mergeRichTextUpdate()
```

`mergeYArray()` compares the incoming plain array against the current `Y.Array`, skips equal entries from the left and right, merges the middle entries in place, then deletes or inserts to make the current array length match the incoming snapshot. `mergeYMapValues()` then treats the incoming object as authoritative for its keys. For nested rich text, `mergeRichTextUpdate()` diffs the current `Y.Text` against the incoming stale string and applies the delta needed to make the Yjs text equal the stale string.

That means a stale local table snapshot can perform destructive writes on paths that were not locally edited:

-   if remote B2 is already `remote-B2`, a stale local snapshot with B2 still `B2` applies a text delta back to `B2`;
-   if the remote doc has a third row, a stale local two-row snapshot makes `mergeYArray()` delete the third row;
-   if the remote doc deleted the third row, a stale local three-row snapshot makes `mergeYArray()` insert it again.

The missing invariant is simple: a local merge should only write paths for which the local editor has evidence of a local change relative to its previous local snapshot. Current code has no local-base snapshot, so it cannot distinguish "locally changed to old value" from "unchanged locally, just stale."

## How this was introduced

The stale full-snapshot authority problem traces back to the original CRDT block merge design, while the nested table/query-array version became visible as table attributes moved into nested Yjs structures.

Relevant history:

-   [#72262](https://github.com/WordPress/gutenberg/pull/72262), `84019935998c`, added the post/block CRDT merge infrastructure. It made full editor block snapshots the write API into the shared CRDT tree.
-   [#76597](https://github.com/WordPress/gutenberg/pull/76597), `80605517663` / `ac9073b15d3`, made nested `RichTextData` serialization recursive.
-   [#76607](https://github.com/WordPress/gutenberg/pull/76607), `85695dcffdc`, added matching recursive rich-text deserialization.
-   [#76913](https://github.com/WordPress/gutenberg/pull/76913), `09a21c64b5b`, made `core/table` cell merging schema-aware by representing query arrays and nested cell content as nested Yjs structures. That made stale table-cell and row-level operations reachable through `mergeYArray()` and nested `Y.Text`.
-   [#77164](https://github.com/WordPress/gutenberg/pull/77164), `a6bfd3e5543`, improved query-array structural stability with the current left/right sweep in `mergeYArray()`. That avoided wholesale rebuilds in some cases, but it preserved the assumption that an incoming full array snapshot is authoritative for updates, deletes, and inserts.

So the narrow introduction is not one line in the table UI. The design became unsafe when full snapshots from the local editor were allowed to overwrite nested CRDT query-array state without a local-base delta. [#76913](https://github.com/WordPress/gutenberg/pull/76913) made the assigned nested table path possible; [#77164](https://github.com/WordPress/gutenberg/pull/77164) changed how structural edits are preserved but did not add causal protection against stale local snapshots.

## Initial fix plan

1. Add an explicit local merge context for the editor-to-CRDT write path. The context should store the previous local block snapshot that produced a local write.
2. Before writing to Yjs, diff `previousLocalBlocks` against `nextLocalBlocks` and apply only paths that actually changed locally.
3. For nested query arrays, treat local-base evidence as mandatory for destructive operations:
    - update a nested value only when that value changed between the previous and next local snapshots;
    - delete an element only when the previous local snapshot contained that logical element and the next local snapshot removed it;
    - insert an element only when the next local snapshot contains a logical element absent from the previous local snapshot.
4. Reuse the identity work from [#77723](https://github.com/WordPress/gutenberg/pull/77723) for query-array elements. Without row and cell identity, a delta algorithm cannot reliably distinguish duplicate rows or duplicate cells.
5. Preserve current behavior for the initial document load, where there is no previous local snapshot and the local snapshot is intentionally seeding the CRDT tree.
6. Add regression tests for all deterministic stale cases here, plus a combined duplicate-row identity plus stale-snapshot case after #77723 is rebased.

## Fix plan audit

### Linus Torvalds lens

The bug is caused by pretending a state snapshot is an operation. That is the core mistake. A fix that adds more special cases inside `mergeYArray()` without changing the write contract will still be fragile because it will keep guessing intent from stale state.

The plan should keep the invariant blunt: unchanged local state must not write the CRDT. Avoid hidden process-wide caches and avoid a second row identity system if #77723 already introduces one.

### Kyle Kingsbury / Jepsen lens

Convergence alone is not the right oracle. The system can converge after losing a remote edit, deleting a remote row, or resurrecting a remote row. The property should be operation preservation: a remote operation already applied to the local CRDT must survive a later local operation unless the local operation causally targets the same logical object and field.

The test suite should assert this property under both update orders and with duplicate query-array elements. Identity fixes address object matching; they do not by themselves provide causal intent.

### Dan Luu lens

The fix needs to be reviewable and diagnosable in the real editor. A large clever merge rewrite is high risk in this part of Gutenberg. The minimum useful change is to make local writes carry enough old-local context to avoid destructive stale writes, then test the exact interleavings found by fuzzing.

The browser repro attempts matter because they keep us honest about whether users can hit the exact schedule through normal UI. Since the natural Playwright attempts did not fail, the lower-level tests should remain the canonical repros and the browser file should be treated as reachability/regression coverage, not as proof that the exact stale schedule is easy to hit through today's UI.

## Revised fix plan

1. Land or rebase on top of the #77723 query-array identity approach before attempting a full structural fix. Identity and stale-snapshot causality are separate problems, but the structural stale fix needs identity to handle duplicate rows correctly.
2. Add an opt-in `LocalBlockMergeContext` only to the local editor write path. Do not change remote Yjs update application.
3. Store the previous local serializable block snapshot in that context after each successful local merge.
4. Replace authoritative full-snapshot writes with local-base deltas:
    - for rich text, compute and apply a delta only for fields that changed locally;
    - for object/query attributes, recurse only into locally changed keys and do not delete remotely added keys unless the key was present in the previous local snapshot and removed locally;
    - for query arrays, match by stable element identity first, then use value/index fallback only for initial migration cases where identity is absent and no destructive operation is needed.
5. When a destructive local array operation is ambiguous, preserve the remote Yjs state and force the editor snapshot to be refreshed from CRDT state rather than guessing.
6. Add focused tests before any production patch:
    - the three direct `mergeCrdtBlocks()` tests in this branch;
    - the post-wrapper test in this branch;
    - duplicate-row plus stale-snapshot coverage after #77723;
    - a fuzz invariant that a local snapshot with no local change at a path cannot modify that path in Yjs.
7. Keep Playwright coverage as normal-action reachability coverage. Do not add a failing Playwright repro by pausing the network, mutating `Y.Doc` directly, or injecting a scheduler hook.

## Open questions

-   Can the live editor produce the exact bad ordering often enough for a stable normal-action Playwright repro, or is the stale snapshot mainly exposed by lower-level interleavings today?
-   Should ambiguous destructive local operations be dropped silently, or should the collaboration layer surface an internal diagnostic event so future fuzz runs can count them?
-   After #77723 is rebased, should the stale-snapshot fix live in the same PR or a separate follow-up? The mechanisms are distinct, but the structural stale fix depends on stable query-array identity for duplicate elements.
