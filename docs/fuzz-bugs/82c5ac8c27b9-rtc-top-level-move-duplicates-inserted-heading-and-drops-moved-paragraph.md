# RTC top-level move duplicates inserted heading sibling and drops moved paragraph

Bug signature: `82c5ac8c27b9`

Bug type: `rtc_top_level_move_duplicates_inserted_heading_and_drops_moved_paragraph`

Transport: `http`

## Classification

This is a product bug in RTC block-array reconciliation, not a readiness wait, locator issue, malformed generated spec, or inverted assertion.

The source shard command was:

```bash
npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

The source result in `results-refresh-http-shard-2/results.jsonl` failed with exit code 1 after 45909 ms. The failure was a non-converged editor state after the session was already active. The primary editor held:

```text
RTC ec47 realistic inserted paragraph 1
Another paragraph exists so the top-level list is not degenerate.
Emoji and multibyte: hi ...
```

The collaborator held:

```text
RTC ec47 realistic inserted paragraph 1
Emoji and multibyte: hi ...
Emoji and multibyte: hi ...
```

That duplicate paragraph plus dropped sibling is a persisted block-tree divergence. The original failure screenshots also show the same mismatch: one editor has the moved paragraph below its sibling while the other has two copies of the moved paragraph and no sibling.

## Reproduction

The natural user route is:

1. Start from a post with a heading followed by two top-level paragraphs.
2. User A deletes the heading.
3. User B inserts a paragraph before the first remaining paragraph.
4. User A moves that first paragraph down below its sibling.

The Playwright repro uses real editor UI actions: block selection by visible text, toolbar delete, toolbar insert-before, typing, and toolbar move-down. It does not inject malformed blocks or mutate editor state directly.

A lower-level Yjs repro exercises the same defect without Playwright by running `mergeCrdtBlocks` against two `Y.Doc` instances:

1. Initial shared block order is `[ heading, emoji, another ]`.
2. User A syncs `[ emoji, another ]`.
3. User B syncs `[ inserted, emoji, another ]`.
4. User A syncs `[ inserted, another, emoji ]`.
5. User B later emits the stale full snapshot `[ inserted, emoji, another ]`.

Before the fix, that stale full snapshot can be interpreted as the authoritative top-level order and can undo the remote move or corrupt the receiving block array. After the fix, both docs converge to `[ inserted, another, emoji ]`.

## Root Cause

The top-level merge path was introduced in commit `84019935998c16f877e976ad85e84748355d7282`:

```text
Improve CRDT "merge logic" for post entities (#72262)
AuthorDate: Tue Oct 14 11:38:19 2025 -0600
```

That commit added `packages/core-data/src/utils/crdt-blocks.ts` and its left/right trim plus index-based middle update algorithm. The algorithm compares the incoming full block array with the current `Y.Array`, skips equal prefix and suffix blocks, then updates the remaining middle by numeric index before applying length-based deletions and insertions.

That is reasonable for simple edits, but it loses the causal distinction between:

- a local user intentionally reordering existing top-level blocks, and
- a local editor emitting an older full-block snapshot after it has incorporated a remote reorder.

The RTC editor sends full block snapshots. When a stale snapshot contains the same client IDs in the same relative order as the previous local base, it is not evidence of a fresh local move. The pre-fix merge path still treats the stale snapshot's numeric order as authoritative. In this bug, that lets `[ inserted, emoji, another ]` race after `[ inserted, another, emoji ]` and overwrite the remote move. In the source run, the same stale-order confusion manifested as a duplicate moved paragraph and a dropped sibling.

Later RTC fixes refined rich-text deltas, nested attribute serialization, table cell merging, and stale snapshot value reconciliation. They did not add a same-member relative-order check for stale top-level block arrays, so this top-level stale-order case remained open.

## Fix Plan

Initial plan:

1. Add a unit-level Yjs repro for the stale full-snapshot sequence.
2. Add a Playwright repro using only real editor actions.
3. Teach `mergeCrdtBlocks` to compare local snapshots against the previous local base before applying the full-array merge.

Robustness audit:

- Kernel-maintainer view: the fix must be local to the merge function, deterministic, and guarded by block identity checks. It should fall back to the existing path when any block lacks a unique `clientId`.
- Jepsen-style view: a stale full snapshot is an old read, not a concurrent operation with a new move. The receiving editor should preserve the current remote order unless the local relative order changed since the previous local base.
- Simplicity/performance view: avoid introducing a second protocol or a new CRDT representation. Use small `Map` and `Set` checks over the already materialized block arrays.

Revised plan:

When all involved blocks have unique client IDs, compare previous local client-ID order with incoming local client-ID order. If relative order did not change, preserve the current `Y.Array` order, overlay local value changes for matching blocks, keep remote inserts, remove blocks deleted locally, and insert genuinely local new blocks near their local neighbors. If relative order did change, keep the existing local-move path while still preserving remote-only inserts and respecting remote deletes.

## Verification

Pass 37 rebased the explanation and PR branches onto `origin/trunk` at:

```text
384489f49bae7a3d5e7e96311e0adbfab5ad50af
Fix flaky Menu test (#77972)
```

It also re-ran the new unit repro against a disposable copy of the known-fixes
base (`3cba2b1e56a98787de08dc6c7df2434759e8f908`) with only the repro test
cherry-picked. That failed deterministically:

```text
Expected: Inserted paragraph, Another paragraph, Emoji and multibyte
Received: Inserted paragraph, Emoji and multibyte, Emoji and multibyte
```

That confirms the known-fixes base still misses this same-member stale-order
case, even though it already contains earlier stale-snapshot reconciliation.

Pass 38 added an independent lower-level repro that keeps the same stale-order
sequence but makes the remote insert a heading, matching this signature's
stored bug name more directly:

```bash
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --testNamePattern="preserves a remotely inserted heading and the moved paragraph after a stale top-level move"
```

Result on the fixed branch: passed.

Result on the known-fixes base, with only the repro tests applied: failed
deterministically. The receiving document became:

```text
Inserted heading
Moved paragraph
Moved paragraph
```

instead of:

```text
Inserted heading
Sibling paragraph
Moved paragraph
```

That gives a second non-Playwright proof that the unfixed algorithm treats a
stale full snapshot as authoritative top-level order and overwrites a sibling
by index.

Focused unit repro:

```bash
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --testNamePattern="preserves a remotely inserted block and the moved sibling after a stale top-level move"
```

Result: passed.

Full CRDT block unit file:

```bash
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts
```

Result after the pass 38 heading repro: passed, 73 tests.

Natural Playwright repro against the fixed branch:

```bash
WP_ENV_PORT=9937 \
WP_BASE_URL=http://localhost:9937 \
WP_ENV_PHPMYADMIN_PORT=9037 \
RTC_MANIFEST_WS_START_PORT=20696 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
RTC_EC47_ATTEMPTS=1 \
RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-bug-82c5ac8c27b9/artifacts/82c5ac8c27b9-fix-check \
npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: passed. The attempt JSON shows both editors converged to:

```text
RTC ec47 realistic inserted paragraph 1
Another paragraph exists so the top-level list is not degenerate.
Emoji and multibyte: hi ...
```

Annotated headless video:

```text
/Users/danluu/dev/fuzz/gutenberg-bug-82c5ac8c27b9/artifacts/82c5ac8c27b9-pass37-video/82c5ac8c27b9-pass37-annotated-repro-and-fix.mp4
```

Residual risk: `npm run build` still fails in the local checkout after `build:js` and `build:php` succeed because the theme primitive-token generator throws `TypeError: [object Object] is not a valid color space`. That appears unrelated to this RTC change.
