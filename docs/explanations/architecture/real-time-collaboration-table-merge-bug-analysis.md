# Real-time collaboration table merge bug analysis

## Summary

The RTC table merge path can lose remote edits when a client applies a stale
local block snapshot after receiving a remote CRDT update.

The problem is not that table cells are stored at the wrong Yjs granularity.
The current code does store table rows, cells, and rich-text cell contents as
nested Yjs types. The problem is that the merge code still treats the incoming
Gutenberg block tree as an authoritative full snapshot. If that snapshot was
created before a remote update was reflected into the editor state, values that
are merely stale are interpreted as local writes, deletes, or structural changes.
Those stale values can overwrite remote table edits already present in the
Y.Doc.

This is a data-loss class bug: both clients can converge, but converge to a
state that has dropped an acknowledged remote edit.

## How the bug was introduced

The relevant RTC table behavior was introduced by
[WordPress/gutenberg#76913](https://github.com/WordPress/gutenberg/pull/76913),
"RTC: Fix core/table cell merging".

That PR fixed an important earlier problem: query-backed attributes like
`core/table` `body` were previously stored as plain arrays, so editing one cell
replaced the whole table body. The PR changed query-backed `array` and `object`
attributes to use nested Yjs structures:

-   table `body` is stored as a `Y.Array`;
-   rows and cells are stored as `Y.Map`;
-   rich-text cell `content` is stored as `Y.Text`.

That makes concurrent edits to different table cells merge correctly when both
local snapshots are based on the current local CRDT state.

[WordPress/gutenberg#77164](https://github.com/WordPress/gutenberg/pull/77164),
"RTC: Improve array attribute stability when structural changes occur", then
changed `mergeYArray()` from rebuilding arrays on every length change to a
left/right sweep that preserves existing Yjs objects for unchanged array
elements. That improved append, prepend, and middle-insert behavior, but it did
not change the deeper assumption: a full block snapshot is still merged as if it
were the desired final state.

The fuzzing work that exposes this bug is on the `try/fuzz` branch. The focused
test is in `packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts` and is
named:

```text
table query-array merges preserve remote edits after stale local snapshots
```

## Failure example

A minimal randomized failure from seed `910`:

```text
initial table 2x2 synced from A to B
B edit row 1 cell 1 -> remote-910-cell-74epi6
A stale snapshot edit row 0 cell 0 -> local-910-cell-1wfzm7d
Expected remote content "remote-910-cell-74epi6" to be present after stale local merge
```

The observed final table body contains A's local edit, but B's remote edit is
reverted to the old value.

The focused test also finds failures for remote structural changes:

-   remote prepend is removed by a stale local snapshot;
-   remote append is removed by a stale local snapshot;
-   remote row deletion is undone by a stale local snapshot.

## Why this happens

The key path is:

```text
mergeCrdtBlocks()
  updateYBlockAttribute()
    mergeYValue()
      mergeYArray()
        mergeYMapValues()
          mergeYValue()
            mergeRichTextUpdate()
```

`mergeCrdtBlocks()` receives a full Gutenberg block tree. For Yjs-backed
attributes, it delegates to `mergeYValue()` even when the attribute may be
unchanged locally, because Yjs types cannot be compared directly with plain
values.

For table bodies, `mergeYValue()` calls `mergeYArray()`. `mergeYArray()` compares
the incoming plain rows against the current `Y.Array` contents. When it sees a
difference, it treats the incoming row or cell value as a local update to apply
to the Y.Doc.

For rich text, `mergeRichTextUpdate()` computes a delta from the current
`Y.Text` value to the incoming string and applies that delta. If the incoming
string is stale, the computed delta is a revert.

That is correct only if the incoming block tree is known to include all remote
updates already present in the Y.Doc. RTC does not have that guarantee. Remote
Yjs updates and local editor snapshots can be interleaved. A stale editor
snapshot therefore contains two different kinds of data:

-   real local edits;
-   old values for fields the user did not touch.

The current merge algorithm cannot distinguish those cases.

Nested Yjs types reduce the blast radius from "whole table body" to
"row/cell/property paths", but they do not solve stale full-state writes. A stale
cell value is still a write to a `Y.Text`; a stale missing row is still a delete
from a `Y.Array`.

## Fix plan

### 1. Make the invariant explicit

The invariant should be:

> Merging a local editor snapshot must only apply changes that happened locally
> since that client's previous editor snapshot. It must not overwrite remote
> changes merely because the local snapshot is stale.

Convergence alone is not enough. The tests must assert preservation of known
remote operations.

### 2. Add deterministic regressions before changing code

Keep the randomized test, but add small deterministic tests for the specific
failure modes:

-   remote edit to B1, stale local edit to A1;
-   remote append row, stale local edit to an existing cell;
-   remote prepend row, stale local edit to an existing cell;
-   remote delete row, stale local edit to a different row.

These should fail before the fix and pass after the fix.

### 3. Stop treating local block snapshots as authoritative state

Introduce local-base tracking for the block merge path.

For each local merge stream, keep the last serializable block snapshot that came
from the local editor. When a new local snapshot arrives, compute a local delta:

```text
previous local editor snapshot -> next local editor snapshot
```

Apply only that delta to the current Y.Doc. Do not write fields that are
unchanged between the previous and next local snapshots, even if those fields now
differ from the current Y.Doc because of remote updates.

For table query attributes, this means:

-   if a cell's content is unchanged locally, do not call `mergeRichTextUpdate()`
    for that cell;
-   if a row is unchanged locally, do not merge every property in that row;
-   if a property is absent from the stale local snapshot but was not deleted
    locally, do not delete it from the Y.Map;
-   if an array length differs only because the current Y.Doc has remote
    insertions or deletions, do not try to force it back to the stale local length.

### 4. Handle structural table edits as operations

For query-backed arrays, derive structural operations from the local base:

```text
base rows -> next local rows
```

Then apply those operations to the current Y.Array.

The first safe implementation can support the common cases already covered by
the current left/right sweep:

-   append;
-   prepend;
-   middle insert with unchanged surrounding rows;
-   delete with unchanged surrounding rows.

If the local base and next local snapshot are ambiguous, for example duplicate
rows with identical content or concurrent moves, prefer a conservative fallback
that preserves remote data over a clever best guess. For example, skip an
ambiguous structural write and force the editor to resync from the Y.Doc rather
than deleting remote rows.

### 5. Reconcile editor state after remote updates

The merge layer should make stale snapshots less likely by ensuring that remote
Y.Doc updates are reflected into the editor state before later local snapshots
are treated as merge inputs.

This does not replace local-base delta tracking. It is a second defense. In a
browser/editor pipeline, asynchronous updates can still be reordered or batched
in surprising ways.

### 6. Keep the randomized test as a bug finder

The new fuzz test should remain after the deterministic regressions pass. It
should grow to cover:

-   multi-step stale snapshots;
-   repeated remote edits before a stale local merge;
-   duplicate row contents;
-   nested head/body/foot attributes;
-   row and cell structural edits in the same run.

The test should report the seed and operation trace, and the default seed range
should be small enough for normal unit-test runs while allowing larger runs via
environment variables.

## Fix plan audit

This section uses engineering lenses inspired by Linus Torvalds, Kyle Kingsbury,
and Dan Luu. It is not speaking for them.

### Linus Torvalds lens

The core smell is pretending that a full stale state object is an operation.
Fix that directly. Do not add more special cases to `mergeYArray()` that try to
guess when stale values are safe. That will become unreviewable.

The simplest defensible rule is:

```text
If it did not change locally, do not write it.
```

The plan should avoid broad rewrites and hidden magic. Start with a tiny set of
failing tests and a small local-base delta mechanism. If the fix needs elaborate
heuristics for arrays, the data model is missing identity and the code should say
so instead of pretending the heuristic is correct.

### Kyle Kingsbury / Jepsen lens

The existing tests mostly check convergence and shape. That is insufficient for
collaboration systems. Two replicas can converge after losing an operation.

The fix needs a model of operations and invariants:

-   remote edit acknowledged before stale local merge must remain visible unless a
    causally later local operation overwrites the same logical field;
-   remote insert acknowledged before stale local merge must remain present unless
    a causally later local delete targets that same logical row;
-   remote delete acknowledged before stale local merge must not be resurrected by
    an old snapshot.

Array identity is the hard part. Index-based operations are not stable under
concurrency. The tests should include duplicate rows and concurrent structural
changes because those are where index-based algorithms quietly invent the wrong
history.

### Dan Luu lens

This is exactly the kind of bug that a plausible happy-path test misses: the
feature demo works, the data structure looks more granular, and convergence
tests pass. The missing test is the mundane production interleaving: remote
update arrives, local UI emits an older full snapshot, and a user loses work.

The fix should be evaluated by blast radius and debuggability:

-   add small deterministic regressions that future maintainers can understand in
    one screen;
-   keep the fuzz test because it exercises schedules humans will not enumerate;
-   add comments that state the stale-snapshot invariant, not just the mechanics of
    Y.Array and Y.Map;
-   consider instrumentation or logging around destructive fallback paths so that
    remaining lossy merges are observable during RTC rollout.

Do not ship a fix that only handles the seed that failed. The important question
is whether the system has stopped treating stale full snapshots as truth.

## Audit-informed narrow fix plan

The first fix plan points in the right direction, but it is still broad enough
that an implementation could accidentally turn into another heuristic-heavy
merge algorithm. This second plan incorporates the audit comments as explicit
constraints.

### Constraints

-   Do not replace the block merge system.
-   Do not add more "guess the right row" special cases to `mergeYArray()`.
-   Do not make full block snapshots globally behave like operations without a
    caller-provided base snapshot.
-   Do not use convergence as the success condition. The success condition is
    preserving acknowledged remote operations unless a real later local operation
    targets the same logical value.
-   When a structural table edit is ambiguous, preserve remote data and resync the
    editor instead of inventing a delete or move.

### Phase 1: add small failing tests

Before changing production code, add deterministic tests for the failures the
fuzzer found:

-   remote B1 edit, stale local A1 edit;
-   remote append row, stale local cell edit;
-   remote prepend row, stale local cell edit;
-   remote delete row, stale local cell edit in another row.

Keep the randomized test, but make the deterministic tests the primary review
surface. They explain the invariant better and reduce the chance of fixing only
one seed.

### Phase 2: add opt-in local merge context

Add a small merge context owned by the caller that merges editor state into a
Y.Doc. The context stores the previous serialized local block snapshot for that
specific stream:

```ts
interface LocalBlockMergeContext {
	previousLocalBlocks?: Block[];
}
```

Thread this context through the RTC editor-to-Y.Doc path. Do not make it a hidden
global keyed only by `Y.Array`, because that would make tests pass while leaving
call order and ownership unclear.

When no context is provided, keep the current behavior. That keeps the change
narrow and avoids breaking unrelated callers that use `mergeCrdtBlocks()` as a
simple state-replacement helper.

### Phase 3: derive local changes before touching Yjs

For context-backed merges, compare:

```text
previousLocalBlocks -> nextLocalBlocks
```

Then apply only paths that changed locally. For table `body`, `head`, and `foot`
query attributes:

-   if a rich-text cell is unchanged between previous and next local snapshots,
    do not call `mergeRichTextUpdate()` for that cell;
-   if a plain property is unchanged locally, do not set it on the `Y.Map`;
-   if a property is absent in both previous and next local snapshots, do not
    delete a remote property from the `Y.Map`;
-   if a row or cell array is unchanged locally, do not merge through it just
    because the current Y.Doc differs.

This directly implements the Linus-style rule from the audit: if it did not
change locally, do not write it.

### Phase 4: handle only unambiguous structural edits

For query-backed arrays, derive structural operations from the local base and the
next local snapshot. In the first production fix, support only unambiguous cases:

-   append rows/cells where the base is an exact prefix of the next local array;
-   prepend rows/cells where the base is an exact suffix of the next local array;
-   one middle insertion where the unchanged prefix and suffix identify a single
    insertion range;
-   one deletion where the unchanged prefix and suffix identify a single deletion
    range.

Apply those operations to the current Y.Array. For ambiguous cases such as
duplicate rows, moves, overlapping structural edits, or multiple independent
splices, do not delete or rewrite the current Y.Array. Mark the merge as needing
an editor resync from the current Y.Doc and leave remote data intact.

This keeps the first fix small. It also avoids pretending that index-based rows
have stable identity when they do not.

### Phase 5: make lossy fallbacks observable

The existing wrong-type migration path that rebuilds an entire Y.Array should
remain available for old data, but it should not silently run during ordinary
collaboration. Add a debug-only or test-visible signal for destructive fallback
paths so tests can assert that the stale-snapshot fix is not passing by
rebuilding more data.

The fix should prefer "skip and resync" over "rebuild and hope" whenever the
input is a stale editor snapshot rather than an explicit migration.

### Phase 6: validate with operation-preservation checks

The tests should check operation preservation, not only final equality:

-   after a remote edit has been applied locally, a stale local snapshot must not
    remove that edit;
-   after a remote insert has been applied locally, a stale local snapshot must
    not remove that inserted row;
-   after a remote delete has been applied locally, a stale local snapshot must
    not resurrect the deleted row;
-   after an ambiguous local structural edit, the current Y.Doc should remain
    unchanged except for clearly local leaf edits.

Run the deterministic tests, the table fuzzer, and the existing block-tree fuzzer.
Then run a larger seed range locally before opening the PR.

### Phase 7: rollout discipline

Keep the code change behind the local merge context path at first. Do not
retarget every CRDT merge caller in the same patch. The first PR should only wire
the context into the RTC editor-to-Y.Doc path that can produce stale local
snapshots.

After that lands, separately consider whether other callers need the same
context. Each additional caller should come with a test that demonstrates why it
can receive stale full snapshots.

### Why this should not introduce more issues

The plan reduces writes rather than adding broader writes. Unchanged local data
stops being written to the Y.Doc, which is exactly the class of write that causes
the bug.

The risky part is structural editing. The plan deliberately supports only
structural edits whose local base uniquely identifies the operation. Everything
else is a no-op plus resync, not a best-effort rewrite. That may temporarily
prefer preserving remote data over applying an ambiguous local structural edit,
but it avoids silent data loss and gives the editor a chance to present the
current document state.

The change is also reviewable: a small context object, local-delta derivation,
table-query-specific tests, and conservative handling for ambiguous arrays. If an
implementation needs more machinery than that, it should be split into a later
design change with stable row/cell identity rather than hidden inside this bug
fix.
