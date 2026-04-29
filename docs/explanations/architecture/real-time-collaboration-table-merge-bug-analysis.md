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

## Repro video

The normal-user Playwright repro video is
[rtc-table-stale-snapshot-repro.mp4](./assets/rtc-table-stale-snapshot-repro.mp4).

It shows two real editor sessions side by side:

-   User A inserts a normal table, then types into cell A1.
-   User B uses the table toolbar to insert a row after B1 and types
    `remote inserted row`.
-   The bottom annotation band shows the bug: User A has only two rows and no
    remote inserted row, while User B still has the inserted row.

The video was recorded from `try/fuzz` at
`4c5412d836192fa02523199395334d6245abfc64` with wp-env at
`http://localhost:8888`. The recording adds a bottom annotation band outside the
two editor views; the reproduced editor actions are normal clicks, toolbar menu
selections, and keyboard typing.

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

## Relationship to the duplicate-row fix

[WordPress/gutenberg#77723](https://github.com/WordPress/gutenberg/pull/77723)
fixes a related but different table merge bug: duplicate-looking rows are
ambiguous when `mergeYArray()` matches query-array elements by serialized value.
That PR adds stable internal identities for query-array elements so two rows with
the same visible contents are no longer treated as interchangeable.

This stale-snapshot bug is not fixed by stable row identity alone. The stale
snapshot can already refer to the right logical row or cell and still carry an
old value. It can also omit a remotely inserted row because the local editor
snapshot was created before that row existed. With the #77723 ID-based merge, an
incoming stale snapshot can still:

-   delete a remote row whose ID exists in the current Y.Doc but not in the stale
    incoming snapshot;
-   resurrect a remote-deleted row whose ID still exists in the stale incoming
    snapshot;
-   overwrite a remote cell edit on the same cell ID because the incoming cell
    string is old.

The fixes are therefore complementary, not independent. The preferred landing
order is:

1.  Land [#77723](https://github.com/WordPress/gutenberg/pull/77723) first, so
    query-array rows and cells have stable internal identities.
2.  Implement this stale-snapshot fix on top of that identity layer.

If this stale-snapshot fix has to land before #77723, it should not invent a
parallel row-identity system. It should keep structural changes conservative and
expect a follow-up rebase onto the #77723 identity mechanism. A textual clean
merge is not enough; the combined behavior must be tested because both fixes
touch `packages/core-data/src/utils/crdt-blocks.ts` and the same table/query
merge path.

## Fix plan

### 1. Make the invariant explicit

The invariant should be:

> Merging a local editor snapshot must only apply changes that happened locally
> since that client's previous editor snapshot. It must not overwrite remote
> changes merely because the local snapshot is stale.

Convergence alone is not enough. The tests must assert preservation of known
remote operations.

### 2. Use #77723 identity as the array basis

Do not solve row identity twice. Once
[#77723](https://github.com/WordPress/gutenberg/pull/77723) lands, use its
internal query-array IDs to identify rows and cells when deriving and applying
local structural operations.

The stale-snapshot fix should change the authority model, not the identity
model. Stable IDs answer "which row is this?" They do not answer "is this stale
snapshot allowed to delete or overwrite this row?" The second question is the
bug being fixed here.

### 3. Add deterministic regressions before changing code

Keep the randomized test, but add small deterministic tests for the specific
failure modes:

-   remote edit to B1, stale local edit to A1;
-   remote append row, stale local edit to an existing cell;
-   remote prepend row, stale local edit to an existing cell;
-   remote delete row, stale local edit to a different row.

Add at least one test that runs against the #77723-style identity path and shows
that stable IDs alone do not preserve the remote operation. These should fail
before the stale-snapshot fix and pass after it.

### 4. Stop treating local block snapshots as authoritative state

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

### 5. Handle structural table edits as local operations

For query-backed arrays, derive structural operations from the local base:

```text
base rows -> next local rows
```

Then apply those operations to the current Y.Array using the stable row/cell IDs
from #77723 when available.

Deletion must require positive evidence of a local delete from the local base. A
row being absent from a stale incoming snapshot is not enough, because that same
absence is exactly how a remote insert gets lost. Similarly, insertion must not
resurrect a row that was remotely deleted unless the local delta actually added
that logical row after the local base.

The first safe implementation should support the common unambiguous cases:

-   append;
-   prepend;
-   middle insert with unchanged surrounding rows;
-   delete with unchanged surrounding rows.

If the local base and next local snapshot are ambiguous, preserve remote data and
force the editor to resync from the Y.Doc rather than deleting or moving rows by
heuristic.

### 6. Reconcile editor state after remote updates

The merge layer should make stale snapshots less likely by ensuring that remote
Y.Doc updates are reflected into the editor state before later local snapshots
are treated as merge inputs.

This does not replace local-base delta tracking. It is a second defense. In a
browser/editor pipeline, asynchronous updates can still be reordered or batched
in surprising ways.

### 7. Keep the randomized test as a bug finder

The new fuzz test should remain after the deterministic regressions pass. It
should grow to cover:

-   multi-step stale snapshots;
-   repeated remote edits before a stale local merge;
-   duplicate row contents;
-   nested head/body/foot attributes;
-   row and cell structural edits in the same run;
-   the combined #77723 identity path plus stale local snapshots.

The test should report the seed and operation trace, and the default seed range
should be small enough for normal unit-test runs while allowing larger runs via
environment variables.

## Fix plan audit

This section uses engineering lenses inspired by Linus Torvalds, Kyle Kingsbury,
and Dan Luu. It is not speaking for them.

### Linus Torvalds lens

The core smell is still pretending that a full stale state object is an
operation. Stable row IDs do not change that. They make the object easier to
match, but they do not make stale values safe to write.

The plan should not grow a second identity scheme or a pile of special cases in
`mergeYArray()`. Land or rebase on #77723, then make one narrow semantic change:

```text
If it did not change locally, do not write it.
```

The implementation should make ownership explicit. A caller-owned local merge
context is reviewable. A hidden global cache of previous snapshots is not. If a
structural edit is ambiguous, do not be clever; skip the destructive operation
and resync.

### Kyle Kingsbury / Jepsen lens

The model must distinguish identity from causality. #77723 gives rows and cells
identity, but the stale-snapshot bug is about whether an operation is causally
allowed to overwrite another operation.

The tests need operation-preservation invariants:

-   remote edit acknowledged before stale local merge must remain visible unless a
    causally later local operation overwrites the same logical field;
-   remote insert acknowledged before stale local merge must remain present unless
    a causally later local delete targets that same logical row ID;
-   remote delete acknowledged before stale local merge must not be resurrected by
    an old snapshot containing that same logical row ID.

The dangerous case after #77723 is that the code will look more correct because
it has identities, while still applying stale snapshots as full desired states.
The tests should explicitly run the stale-snapshot cases through the ID-aware
path and show that operation preservation, not just convergence, is the success
criterion.

### Dan Luu lens

This is exactly the kind of bug where "the fixes merge cleanly" can be a false
signal. #77723 and this fix can both be reasonable in isolation while combining
into a system that still deletes remote rows absent from a stale incoming
snapshot.

The plan should optimize for reviewability and future debugging:

-   document the distinction between identity and freshness in the code comment
    next to the merge logic;
-   keep deterministic tests small enough that a reviewer can see the lost
    operation without replaying the fuzzer;
-   keep the fuzz test because it explores schedules humans will not enumerate;
-   make destructive fallback paths observable in tests;
-   avoid a broad "fix all CRDT merges" patch when the current repro is the RTC
    editor-to-Y.Doc path for table query attributes.

The revised plan should explicitly say that #77723 is the preferred base. If it
cannot be the base, the stale-snapshot patch must stay conservative enough that
rebasing onto #77723 does not require redesigning the fix.

## Updated post-audit fix plan

The first fix plan did not fully account for the interaction with #77723. This
plan incorporates the audit comments and treats #77723's stable query-array
identity as the preferred foundation.

### Constraints

-   Prefer landing after [#77723](https://github.com/WordPress/gutenberg/pull/77723).
-   Do not add a second row/cell identity mechanism.
-   Do not replace the block merge system.
-   Do not add more "guess the right row" special cases to `mergeYArray()`.
-   Do not make full block snapshots globally behave like operations without a
    caller-provided base snapshot.
-   Do not use convergence as the success condition. The success condition is
    preserving acknowledged remote operations unless a real later local operation
    targets the same logical value.
-   When a structural table edit is ambiguous, preserve remote data and resync the
    editor instead of inventing a delete or move.

### Phase 0: establish the base

Rebase the stale-snapshot fix on top of #77723 if it has landed. If it has not
landed, either base the work on that branch intentionally or keep the production
change limited to local-delta plumbing and non-structural stale writes. Do not
ship a competing table row identity design.

The PR should say which base it used:

-   "built on #77723 identity path"; or
-   "pre-#77723, intentionally avoids structural identity changes and expects a
    rebase."

### Phase 1: add focused failing tests

Before changing production code, add deterministic tests for the failures the
fuzzer found:

-   remote B1 edit, stale local A1 edit;
-   remote append row, stale local cell edit;
-   remote prepend row, stale local cell edit;
-   remote delete row, stale local cell edit in another row.

Add combined-branch tests that prove #77723 alone is insufficient:

-   current Y.Doc has a remote inserted row ID absent from the stale incoming
    snapshot, and the stale merge must not delete it;
-   stale incoming snapshot contains a row ID that was remotely deleted, and the
    stale merge must not resurrect it;
-   same cell ID has newer remote text in the Y.Doc and stale old text in the
    incoming snapshot, and the stale merge must not revert it.

Keep the randomized test, but make the deterministic tests the primary review
surface.

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

### Phase 4: apply structural operations by identity when available

For query-backed arrays, derive structural operations from the local base and the
next local snapshot. When #77723 IDs are present, use those IDs to apply
unambiguous local inserts and deletes to the current Y.Array.

Deletion rule:

```text
delete row ID X only if X existed in previousLocalBlocks and is absent from
nextLocalBlocks because of the local delta
```

Insertion rule:

```text
insert row ID X only if X is absent from previousLocalBlocks and present in
nextLocalBlocks because of the local delta
```

Never delete a current Y.Array element merely because it is absent from the
incoming snapshot. Never insert an old incoming element merely because the
current Y.Array no longer has it.

For pre-#77723 code, support only unambiguous prefix/suffix structural edits and
prefer skip-and-resync for duplicates or overlapping changes. After #77723, keep
the same conservative behavior for operations whose IDs or local base evidence
are missing.

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
    unchanged except for clearly local leaf edits;
-   the #77723 duplicate-row edit/delete regression must still pass after this
    fix is applied.

Run the deterministic tests, the table fuzzer, the existing block-tree fuzzer,
and the #77723 duplicate-row regression. Then run a larger seed range locally
before opening the PR.

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

Using #77723 as the identity layer reduces the chance of a second,
incompatible table identity scheme. The stale-snapshot fix then has one job:
decide whether the local snapshot has authority to write a path or perform a
structural operation.

The risky part is structural editing. The plan deliberately requires both
identity and local-base evidence before applying deletes or inserts. Everything
else is a no-op plus resync, not a best-effort rewrite. That may temporarily
prefer preserving remote data over applying an ambiguous local structural edit,
but it avoids silent data loss and gives the editor a chance to present the
current document state.

The change is reviewable: a small context object, local-delta derivation,
table-query-specific tests, reuse of #77723 IDs, and conservative handling for
ambiguous arrays. If an implementation needs more machinery than that, it should
be split into a later design change rather than hidden inside this bug fix.
