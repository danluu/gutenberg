# Real-time collaboration fuzz issues handoff

This file lists distinct RTC bugs found by fuzzing so separate agents can take
one issue each without needing the full chat history.

Use `docs/explanations/architecture/real-time-collaboration-agent-handoff-protocol.md`
for the required branch, repro, known-fix-check, analysis, and fix-plan workflow.

Current fuzz entry point:

```bash
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts --runInBand
```

The modified fuzz test is `packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts`.
Use `GUTENBERG_FUZZ_SEED_COUNT=1` and `GUTENBERG_FUZZ_SEED_START=<seed>` to
reproduce one seed.

## Issue 1: Stale local snapshots overwrite remote rich-text sibling attributes

### Summary

When one peer receives a remote update to one rich-text attribute and then merges
an older local block snapshot containing an edit to a different rich-text
attribute, the older snapshot rewrites the untouched sibling attribute. This can
lose a remote update or resurrect a remote delete.

### Reproduction

Remote update lost:

```bash
GUTENBERG_FUZZ_SEED_COUNT=1 GUTENBERG_FUZZ_SEED_START=7 \
	npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts \
	--runInBand --testNamePattern="stale-local-snapshots"
```

Remote delete resurrected:

```bash
GUTENBERG_FUZZ_SEED_COUNT=1 GUTENBERG_FUZZ_SEED_START=8 \
	npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts \
	--runInBand --testNamePattern="stale-local-snapshots"
```

### Observed

Seed `7`:

-   Remote operation: update `test/rich-text-pair.attributes.second`.
-   Stale local operation: update `test/rich-text-pair.attributes.first`.
-   Final state keeps the local `first` edit but reverts `second` to the old value.

Seed `8`:

-   Remote operation: delete `test/rich-text-pair.attributes.second`.
-   Stale local operation: update `first`.
-   Final state resurrects deleted `second`.

### Expected

An older local snapshot must not write rich-text sibling fields that did not
change locally. The remote sibling update/delete must remain visible after the
stale local merge.

### Likely code path

-   `mergeCrdtBlocks()`
-   attribute loop in `mergeCrdtBlocks()`
-   `updateYBlockAttribute()`
-   `mergeYValue()`
-   `mergeRichTextUpdate()`
-   attribute deletion loop for removed attributes

Relevant file: `packages/core-data/src/utils/crdt-blocks.ts`.

### Suggested fix direction

Track the previous local editor snapshot per merge stream. Diff previous local
snapshot to next local snapshot, and only apply fields that changed locally. Do
not treat fields that merely differ from the current Y.Doc as local writes.

## Issue 2: Stale local snapshots overwrite object+query map operations

### Summary

Object-backed query attributes are merged in place with `Y.Map`, but a stale
incoming plain object is still treated as authoritative. Remote property adds or
updates are lost, and remote property deletes can be resurrected.

### Reproduction

Remote object property add lost:

```bash
GUTENBERG_FUZZ_SEED_COUNT=1 GUTENBERG_FUZZ_SEED_START=9 \
	npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts \
	--runInBand --testNamePattern="stale-local-snapshots"
```

Remote object property update lost:

```bash
GUTENBERG_FUZZ_SEED_COUNT=1 GUTENBERG_FUZZ_SEED_START=12 \
	npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts \
	--runInBand --testNamePattern="stale-local-snapshots"
```

Remote object property delete resurrected:

```bash
GUTENBERG_FUZZ_SEED_COUNT=1 GUTENBERG_FUZZ_SEED_START=18 \
	npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts \
	--runInBand --testNamePattern="stale-local-snapshots"
```

### Observed

The fuzz block is `test/nested-rich-text`. It has an object+query attribute:
`attributes.hero.{headline,caption}`.

-   Remote changes `hero.caption`.
-   Local stale snapshot changes `hero.headline`.
-   Final state applies the local headline edit but reverts or resurrects
    `hero.caption`.

### Expected

A local headline edit must not rewrite an unchanged caption field from a stale
snapshot.

### Likely code path

-   `mergeYValue()` object branch
-   `mergeYMapValues()`
-   `mergeYMapValues()` deletes keys absent from the incoming object

Relevant file: `packages/core-data/src/utils/crdt-blocks.ts`.

### Suggested fix direction

Use local-base diffing for object properties. Only call `mergeYValue()` for
properties changed locally, and only delete properties deleted locally. Do not
delete a property merely because it is missing from an older snapshot.

## Issue 3: Stale local snapshots overwrite nested query-array operations

### Summary

Nested query-array attributes use `Y.Array` plus nested `Y.Map` and `Y.Text`, but
the merge still treats the incoming plain array as the desired final array.
Remote element edits, nested object edits, appends, prepends, and deletes are
lost or resurrected by stale local snapshots.

### Reproduction

Remote nested object update lost:

```bash
GUTENBERG_FUZZ_SEED_COUNT=1 GUTENBERG_FUZZ_SEED_START=6 \
	npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts \
	--runInBand --testNamePattern="stale-local-snapshots"
```

Remote cell update lost:

```bash
GUTENBERG_FUZZ_SEED_COUNT=1 GUTENBERG_FUZZ_SEED_START=14 \
	npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts \
	--runInBand --testNamePattern="stale-local-snapshots"
```

Remote append lost:

```bash
GUTENBERG_FUZZ_SEED_COUNT=1 GUTENBERG_FUZZ_SEED_START=1 \
	npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts \
	--runInBand --testNamePattern="stale-local-snapshots"
```

Remote prepend lost:

```bash
GUTENBERG_FUZZ_SEED_COUNT=1 GUTENBERG_FUZZ_SEED_START=2 \
	npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts \
	--runInBand --testNamePattern="stale-local-snapshots"
```

Remote delete resurrected:

```bash
GUTENBERG_FUZZ_SEED_COUNT=1 GUTENBERG_FUZZ_SEED_START=20 \
	npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts \
	--runInBand --testNamePattern="stale-local-snapshots"
```

### Observed

The fuzz block is `test/nested-rich-text`. It has a query-array attribute:
`attributes.cards[]`, with nested rich text and nested object fields.

Remote operations on `cards[1]` or the `cards` array structure are removed when
the stale local snapshot only changes a different path, such as
`hero.headline` or `cards[0].title`.

### Expected

Stale snapshots must not force a query-array back to an older length or older
element values. Remote operations already present in the Y.Doc should remain
unless a causally later local operation changes the same logical element/path.

### Likely code path

-   `mergeYValue()` array branch
-   `mergeYArray()`
-   `mergeYMapValues()` for array elements
-   `mergeRichTextUpdate()` for nested rich-text fields

Relevant file: `packages/core-data/src/utils/crdt-blocks.ts`.

### Suggested fix direction

Derive array operations from local-base to next-local snapshot, not from
current-Y.Doc to next-local snapshot. Preserve remote inserts/deletes unless the
local delta targets the same logical array element. For ambiguous cases without
stable element identity, prefer preserving remote data and forcing an editor
resync over applying a destructive heuristic.

## Issue 4: Stale local snapshots overwrite top-level block array operations

### Summary

The same stale-snapshot bug exists at the top-level block array. Remote block
appends are lost and remote block deletes are resurrected when a stale local
snapshot edits a different existing block.

### Reproduction

Remote top-level append lost:

```bash
GUTENBERG_FUZZ_SEED_COUNT=1 GUTENBERG_FUZZ_SEED_START=30 \
	npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts \
	--runInBand --testNamePattern="stale-local-snapshots"
```

Remote top-level delete resurrected:

```bash
GUTENBERG_FUZZ_SEED_COUNT=1 GUTENBERG_FUZZ_SEED_START=4 \
	npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts \
	--runInBand --testNamePattern="stale-local-snapshots"
```

### Observed

Remote appends/deletes are acknowledged in A's Y.Doc before A merges the stale
local snapshot. After the stale merge, A's local edit is present, but the remote
structural operation is undone.

### Expected

A local edit to an existing block must not remove a remotely appended block or
resurrect a remotely deleted block.

### Likely code path

-   `mergeCrdtBlocks()` left/right sweep
-   top-level update/delete/insert calculation
-   `yblocks.delete(...)`
-   `yblocks.insert(...)`

Relevant file: `packages/core-data/src/utils/crdt-blocks.ts`.

### Suggested fix direction

Use local-base block-tree diffing before writing to `yblocks`. Apply only local
block operations derived from previous-local to next-local snapshots. Avoid
using a stale full block array as the target final state.

## Issue 5: Rich-text merge corrupts valid HTML closing tags

### Summary

The existing convergence fuzz finds rich-text HTML corruption without needing
the new stale-snapshot invariant. Valid strings such as
`ab<em>b</em><strong>it</strong>` become invalid strings like
`ab<em>b</em><strong>it</stronm>`.

### Reproduction

```bash
GUTENBERG_FUZZ_SEED_COUNT=1 GUTENBERG_FUZZ_SEED_START=2 \
	npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts \
	--runInBand --testNamePattern="concurrent-block-tree-edits"
```

Other representative seeds: `3`, `8`, `17`, `18`, `25`, `30`, `35`.

### Observed

Examples from the 18-core sweep:

-   Expected `ab<em>b</em><strong>it</strong>`, received
    `ab<em>b</em><strong>it</stronm>`.
-   Expected `ab<em>b</em><strong>i</strong>t`, received
    `ab<em>b</em><strong>i</strong>>`.

The failure occurs in both plain rich-text pair attributes and nested rich-text
fields inside query-array/object attributes.

### Expected

Rich-text string merges must preserve the exact target HTML string when applying
a local snapshot to the local Y.Doc. At minimum, `assertLocalMergeMatches()` in
the fuzz test should never fail after a local merge.

### Likely code path

-   `mergeRichTextUpdate()`
-   `Delta.diffWithCursor()`
-   `Y.Text.applyDelta()`

Relevant files:

-   `packages/core-data/src/utils/crdt-blocks.ts`
-   `packages/sync/src/quill-delta/Delta.ts`

### Suggested fix direction

Start with seed `2` and reduce it to a direct unit test for
`mergeRichTextUpdate()` or `Delta.diffWithCursor()`. Check whether cursor
positions are interpreted as UTF-16 offsets, text-character offsets, or HTML
indices. The corruption pattern suggests the diff is applying a replacement at
the wrong offset inside the closing tag.

## Sweep summary

Stale-snapshot sweep:

-   Seeds: `1-1800`
-   Command pattern: `--testNamePattern="stale-local-snapshots"`
-   Result: `1800 / 1800` active stale-snapshot cases failed.
-   All 12 scenario classes failed.

Convergence sweep:

-   Seeds: `1-3600`
-   Command pattern: `--testNamePattern="concurrent-block-tree-edits"`
-   Result: `982 / 3600` active convergence cases failed.
-   All convergence failures observed in this sweep were rich-text HTML corruption.

Temporary JSON/log outputs from the sweep were written to:

```text
/tmp/gutenberg-fuzz-stale-*.json
/tmp/gutenberg-fuzz-stale-*.log
/tmp/gutenberg-fuzz-conv-*.json
/tmp/gutenberg-fuzz-conv-*.log
```
