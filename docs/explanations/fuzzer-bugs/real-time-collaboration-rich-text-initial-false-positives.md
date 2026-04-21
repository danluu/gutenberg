# Real-Time Collaboration Rich-Text Initial False Positives

This note records the first three minimized seeds from the early
`mergeRichTextUpdate()` fuzzer: `46016`, `46153`, and `46181`.

All three looked suspicious at the helper level. None of them was a real
production bug.

The later confirmed production bug is documented in
[Real-Time Collaboration Rich-Text Bug Analysis](/docs/explanations/architecture/real-time-collaboration-rich-text-bug-analysis.md).

## Summary

-   `46016` was an oracle failure. The expected next value was not stable
    rich-text HTML, so a mismatch against it did not prove editor corruption.
-   `46153` depended on a non-null cursor on a plain-string path that
    production calls with `cursor = null`.
-   `46181` had the same contract problem as `46153`: it only failed when the
    helper was given a cursor that the corresponding production path does not
    supply.

These seeds were still useful because they exposed two modeling mistakes in
the original fuzzing pass:

-   rich-text bug claims need stable Gutenberg HTML on both sides of the
    comparison
-   cursor-sensitive helper failures need to be rechecked against the real
    production path that supplies the cursor

## Seed `46016`: Invalid Target HTML

### Minimized reproduction

-   initial value: `"<strong><strong>bold</strong></strong>"`
-   requested next value: `"<strong><strong>bold</strong>é"`
-   helper cursor: `20`
-   helper result: `"<strong><strong>bold</</strong>"`

### Why it looked real

The failure minimized to a single replace step and the helper returned
corrupted markup. At first glance that looked like strong evidence that
`diffWithCursor()` had a real rich-text corruption bug.

### Why it is not a real bug

The requested next value is not stable rich-text HTML. It leaves the outer
`<strong>` tag open:

```text
<strong><strong>bold</strong>é
```

That means the fuzzer oracle was comparing against a target state that the
rich-text system does not preserve as-is. The original minimizer output already
showed this: the old state round-tripped through `RichTextData`, but the
expected next state did not.

So this seed proved that the helper can behave badly on malformed targets, but
it did not prove a production bug on a valid editor-generated rich-text value.

### What it taught us

Helper-level rich-text fuzzing must treat "string mismatch" and
"production-relevant rich-text mismatch" as different categories. For the
latter, the target HTML has to be stable under the same `RichTextData`
round-trip the editor uses.

## Seed `46153`: Impossible Cursor On The Plain-String Path

### Minimized reproduction

-   initial value: `"éalphaalphaalphaééé"`
-   requested next value: `"éalphaalpha\néé"`
-   helper cursor: `7`
-   helper result: `"éalphaalpháéé"`

### Why it looked real

The helper dropped the newline and produced the wrong suffix, which looked like
the kind of cursor-guided corruption the richer HTML cases were also surfacing.

### Why it is not a real bug

This seed comes from the low-level helper fuzzer, not from the production
block rich-text path.

The key production detail is in `applyPostChangesToCRDTDoc()`:

-   the `blocks` branch passes
    `changes.selection?.selectionStart?.offset ?? null` into
    `mergeCrdtBlocks()`
-   the top-level `content`, `excerpt`, and `title` branch calls
    `mergeRichTextUpdate( currentValue, rawValue ?? '' )` with no cursor
    argument

So the plain-string path that could carry this kind of value does not supply a
cursor hint. Its production contract is effectively `cursor = null`.

This minimized failure depends on `cursorPosition = 7`. That makes it useful as
a helper edge case, but not as evidence of a currently reachable production
bug.

### What it taught us

The fuzzer needed to separate two models that were initially mixed together:

-   block rich-text merges, where the merge code does receive a cursor hint
-   top-level plain-string merges, where the helper is called with `null`

Without that distinction, the helper fuzzer reports failures that production
cannot actually trigger.

## Seed `46181`: Same Cursor-Contract Mismatch, Smaller String

### Minimized reproduction

-   initial value: `"betabeta"`
-   requested next value: `"betaalpha"`
-   helper cursor: `0`
-   helper result: `"betaaleta"`

### Why it looked real

This case is very small and has no HTML tags at all. That made it tempting to
read as a clean, minimal proof that `diffWithCursor()` was corrupting repeated
text under ordinary editing.

### Why it is not a real bug

The production-contract problem is the same as in seed `46153`.

This seed only fails because the helper is forced to use `cursorPosition = 0`.
The relevant plain-string production path does not pass a cursor at all; it
calls `mergeRichTextUpdate()` with the default `null` cursor.

So this case shows a helper-level limitation under an impossible contract, not
a reachable user-facing corruption bug.

### What it taught us

Very small minimized repros are still easy to over-interpret. A tiny failing
string pair is not enough by itself; the triage step still has to check whether
the failure depends on arguments that the real write path never provides.

## Final Takeaways

These three seeds were false positives for two different reasons:

-   one seed (`46016`) depended on an invalid target state
-   two seeds (`46153`, `46181`) depended on a cursor contract that the real
    plain-string path does not use

They were still valuable because they improved the fuzzing process:

1. Only treat helper mismatches as rich-text production candidates when the
   expected value is stable under `RichTextData`.
2. Only treat cursor-sensitive failures as production candidates when the
   modeled path can actually pass a non-null cursor.
3. Promote low-level seeds to real bugs only after replaying them against
   `applyPostChangesToCRDTDoc()` or another production-shaped path.
