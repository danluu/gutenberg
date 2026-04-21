# Real-Time Collaboration Rich-Text Bug Analysis

This report documents the real bugs found while expanding the fast non-browser real-time collaboration fuzzing. It also records why the three originally reported seeds were rejected as false positives so the final bug list is limited to production-relevant failures.

## Scope

The original failing seeds `46016`, `46153`, and `46181` all minimized successfully, but deeper analysis showed that none of them represented a production bug:

- `46016` expected an invalid rich-text HTML string that `RichTextData` does not preserve.
- `46153` required a non-null cursor on the plain-text update path, but production plain-text updates call `mergeRichTextUpdate(..., null)`.
- `46181` had the same problem as `46153`: the failure depended on an impossible cursor for the plain-text path, and the update succeeds when run with the production contract.

After filtering those out, production-shaped fuzzing found two real bugs on the block rich-text HTML path. Both bugs occur in valid, balanced HTML strings, both reproduce through `mergeRichTextUpdate()`, and both corrupt the result instead of producing the requested new value.

## Bug 1: Nested `<strong>` Replacement Corrupts Closing Tags

### Minimized Reproduction

- Seed: `8970`
- Step: `62`
- Old value: `"<strong><strong>😀😀</strong></strong><br> <br>"`
- New value: `"<strong>bold</strong><br>"`
- Cursor after change: `21`
- Expected result: `"<strong>bold</strong><br>"`
- Actual result: `"<strong>bold</st<br> <br>"`

Both the old and new values are valid rich-text HTML. They round-trip through `RichTextData.fromHTMLString(...).toHTMLString()` without modification, so this is not an oracle bug caused by invalid input. The corruption also reproduces through both:

- `mergeRichTextUpdate()` in `packages/core-data/src/utils/crdt-blocks.ts`
- `Delta.diffWithCursor()` in `packages/sync/src/quill-delta/Delta.ts`

### What The Bug Does

The user is effectively replacing a nested bold region followed by `<br> <br>` with a simpler bold region followed by a single `<br>`. Instead of producing the requested result, the diff logic splices part of the closing `</strong>` tag into the middle of the final HTML and leaves stale suffix content behind.

The broken diff emitted for this case is:

```json
[
  { "retain": 8 },
  { "insert": "b" },
  { "delete": 4 },
  { "retain": 1 },
  { "insert": "ld" },
  { "delete": 7 },
  { "retain": 1 },
  { "delete": 9 },
  { "retain": 3 },
  { "delete": 5 }
]
```

Applying that diff to the old value produces:

```text
<strong>bold</st<br> <br>
```

This is HTML corruption, not a harmless formatting mismatch. The edit leaves a truncated closing tag (`</st`) and preserves stale trailing content from the old string.

### Why This Is A Real Production Bug

This input shape matches the real block rich-text code path:

- `mergeCrdtBlocks()` passes a non-null cursor position for block edits.
- Rich-text block attributes are merged through `mergeRichTextUpdate()`.
- `mergeRichTextUpdate()` converts the current and new values to `Delta`s and calls `diffWithCursor()`.

Unlike the false-positive plain-text seeds, this failure does not rely on an impossible cursor contract or invalid HTML. It is reachable on the exact path Gutenberg uses for block rich-text synchronization.

### Root Cause

The bug comes from the cursor-guided post-processing in `Delta.diffWithCursor()`, not from Yjs itself.

`diffWithCursor()` first computes a character diff, then tries to move insertions and deletions toward the cursor using:

- `tryMoveInsertionToCursor()`
- `tryMoveDeletionToCursor()`

Those helpers only verify local substring equality around the cursor. That is enough for simple repeated text like `"aaaa"`, which is what the current unit tests focus on, but it is not enough for repeated or nested HTML markup where the same short substrings appear in multiple structurally different positions.

In this bug, repeated `<strong>` and `</strong>` regions create ambiguous alignments. The heuristic sees a locally matching substring and decides that a diff segment can be moved closer to the cursor, but that move breaks the global structure of the HTML. Once the move is accepted, later delta conversion emits a sequence that deletes only part of the old closing-tag structure and leaves stale suffix text behind.

### How The Bug Was Introduced

This bug class was introduced by commit `30c040ca841` on January 14, 2026:

- `packages/core-data/src/utils/crdt-blocks.ts` stopped doing full-string replacement and started applying incremental rich-text diffs.
- `packages/sync/src/quill-delta/Delta.ts` was added with the custom `diffWithCursor()` logic and the cursor-moving heuristics.

Before that change, `mergeRichTextUpdate()` deleted the whole string and inserted the new one. That was less efficient, but it did not have this corruption mode. The new diff path improved incremental behavior, but it also introduced a heuristic that assumes local substring equivalence is enough to relocate edits safely. That assumption is false for nested or repeated markup.

Later fixes in `d2eb0cf1215` and `af635a669bf` addressed surrogate pairs and large-input performance. They did not address this structural ambiguity problem.

### Proposed Fix Plan

1. Add a direct regression test for this exact repro in `packages/sync/src/quill-delta/test/Delta.ts`.
2. Add a higher-level regression for `mergeRichTextUpdate()` so the CRDT integration path is also covered.
3. Add a correctness guard in `diffWithCursor()`:
   - Compose the adjusted diff back onto the old delta.
   - If the composed result does not equal the requested new value, discard the cursor-adjusted diff and fall back to plain `diff()` or full replacement.
4. Replace the current move heuristics with a cursor-anchored replacement strategy that computes one contiguous replacement region around the cursor rather than relocating already-generated diff chunks through repeated markup.

### Fix Rationale

The immediate guard is the lowest-risk fix because it stops corruption even if the heuristic remains imperfect. The deeper heuristic rewrite is still worthwhile because the current algorithm is fundamentally underconstrained: it tries to infer editor intent from local substring equality in strings where the same markup fragments repeat. A cursor-anchored contiguous replacement is a better model for editor-style edits and avoids manufacturing partial closing tags.

## Bug 2: Nested Formatting With Repeated Suffix Text Produces Split Closing Tags

### Minimized Reproduction

- Seed: `10276`
- Step: `46`
- Old value: `"<strong>é<strong>é</strong></strong>beta<br>"`
- New value: `"<strong>bold</strong><br>"`
- Cursor after change: `21`
- Expected result: `"<strong>bold</strong><br>"`
- Actual result: `"<strong>bold</strbeta<br>"`

Again, both the old and new values are valid rich-text HTML, and both round-trip through `RichTextData` unchanged. The failure reproduces through both `mergeRichTextUpdate()` and `Delta.diffWithCursor()`.

### What The Bug Does

The edit is replacing nested bold content followed by plain text (`beta`) and a line break with a simpler bold span and the same trailing line break. Instead of fully removing the old nested content and the stale plain-text suffix, the resulting diff leaves part of the old `beta` text behind and splices an incomplete closing tag into the result:

```text
<strong>bold</strbeta<br>
```

The broken diff emitted for this case is:

```json
[
  { "retain": 8 },
  { "insert": "b" },
  { "delete": 6 },
  { "retain": 1 },
  { "insert": "ld" },
  { "delete": 5 },
  { "retain": 1 },
  { "insert": "/str" },
  { "delete": 17 }
]
```

That is not just the wrong formatting boundary. It is a corrupted HTML result that blends a partial closing tag with stale text from the old suffix.

### Why This Is A Real Production Bug

This case is also production-shaped:

- The values are valid block rich-text HTML.
- The cursor is a plausible local rich-text cursor.
- The failure occurs only when the non-null cursor path is used, which is the intended path for block rich-text updates.

This means the bug can corrupt a collaborator-visible block attribute during normal incremental synchronization, rather than only failing inside a fuzzer-only input model.

### Root Cause

This is the same underlying bug class as Bug 1, but with a slightly different ambiguous context.

The combination of:

- nested `<strong>` markup,
- repeated short substrings around the cursor,
- a trailing plain-text suffix (`beta`), and
- a shared `<br>` suffix

gives `diffWithCursor()` multiple locally plausible alignments. The cursor-moving heuristic chooses an alignment that looks valid near the cursor, then rewrites diff segments around that choice. Because the choice is only locally justified, the final delta no longer represents a globally correct transformation from old value to new value.

In practical terms, the heuristic "pulls" pieces of the transformation through repeated markup boundaries and reuses the wrong suffix occurrence. That is why the result contains `/str` plus stale `beta` text instead of a clean `</strong>`.

### How The Bug Was Introduced

The introduction point is the same as Bug 1: commit `30c040ca841` on January 14, 2026.

That change replaced the previous full-string overwrite behavior with incremental diffs produced by `diffWithCursor()`. The new code path made block rich-text syncing more incremental, but it also introduced a heuristic that assumes repeated local substrings can be disambiguated safely using only cursor position plus local substring comparison. This repro shows that the assumption breaks when repeated formatting and repeated suffixes coexist.

### Proposed Fix Plan

1. Add a regression test for this exact repro in `packages/sync/src/quill-delta/test/Delta.ts`.
2. Add a high-level regression around `mergeRichTextUpdate()` so the CRDT application path is covered.
3. Add a verification step after cursor-guided adjustment:
   - apply the candidate delta to the old value,
   - compare the result to the target new value,
   - fall back if the candidate does not exactly match.
4. Rework the cursor-guided algorithm so it prefers one contiguous replacement around the cursor instead of relocating insertion and deletion segments independently.

### Fix Rationale

This bug is a strong argument for separating "use the cursor as a hint" from "mutate the diff structure after the fact". The current approach tries to improve an already ambiguous diff by moving operations independently. That is precisely what creates the split closing tag and stale suffix reuse. A verified fallback prevents corruption immediately, and a cursor-anchored replacement strategy removes the specific ambiguity that allowed this bug to happen.

## Relationship Between The Two Bugs

These are best understood as two minimized repros for the same underlying defect:

- `diffWithCursor()` can mis-handle repeated or nested HTML when its cursor-moving heuristics find a locally matching substring in more than one structurally distinct place.
- The resulting delta can be syntactically incorrect and can preserve stale suffix content from the old value.

The emoji-heavy case and the combining-mark-plus-text case are still worth keeping as separate regressions because they exercise different ambiguous contexts:

- Bug 1 emphasizes repeated closing-tag structure and repeated `<br>` suffix context.
- Bug 2 emphasizes nested formatting plus a repeated trailing plain-text suffix that leaks into the result.

## Rejected False Positives

For completeness, the three originally reported seeds were rejected for the following reasons:

- `46016`: invalid expected HTML; `RichTextData` repairs it by closing the dangling `<strong>`.
- `46153`: plain-text case with non-null cursor; succeeds with the real plain-text contract of `cursor = null`.
- `46181`: plain-text case with non-null cursor; succeeds with the real plain-text contract of `cursor = null`.

Those seeds still exposed limitations in `diffWithCursor()`, but not bugs on a currently reachable production path. The two bugs documented above are the production-relevant failures that remained after that filtering.
