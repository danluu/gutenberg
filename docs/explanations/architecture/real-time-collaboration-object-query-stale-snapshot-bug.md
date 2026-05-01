# Stale local snapshots overwrite object+query map operations

## Summary

Object-backed `query` attributes are stored as nested `Y.Map` values, but the
current local merge path treats every incoming plain object snapshot as the full
desired value. If user A has a stale local editor snapshot of
`attributes.hero`, receives user B's remote update to `hero.caption`, and then
changes only `hero.headline`, the stale local snapshot writes the old
`hero.caption` back into the CRDT document. The same path resurrects a remote
delete when the stale object still contains the deleted key.

The focused example uses a custom block with this attribute schema:

```js
hero: {
	type: 'object',
	query: {
		headline: { type: 'string' },
		caption: { type: 'string' },
	},
}
```

## Status against known fixes

Base tested for the issue branch:
`5ddf4ad1b34bb0798185a663437955e7f10da01b` (`origin/trunk`), which already
contains the merged large-update fix from
[#77669](https://github.com/WordPress/gutenberg/pull/77669) and the merged
follow-up listed in the fuzz tracking issue,
[#77681](https://github.com/WordPress/gutenberg/pull/77681).

I reviewed the tracking issue
[#77716](https://github.com/WordPress/gutenberg/issues/77716), its listed PRs,
comments, and related open RTC fixes. Most listed fixes are not on the
object+query map merge path: the title reload fix
[#77666](https://github.com/WordPress/gutenberg/pull/77666), awareness fixes
[#77673](https://github.com/WordPress/gutenberg/pull/77673) and
[#77678](https://github.com/WordPress/gutenberg/issues/77678), room storage work
[#77675](https://github.com/WordPress/gutenberg/pull/77675), and the test-only
cursor scope PR [#77662](https://github.com/WordPress/gutenberg/pull/77662).

I applied the focused repros to the relevant branches that do touch nearby RTC
merge code:

| Ref tested | Result |
| --- | --- |
| `origin/trunk` at `5ddf4ad1b34` | Fails the unit/model, post-adapter, and Playwright repros. |
| `danluu/try/offset-space-bug-pr` at `cfcfe75228f` ([#77658](https://github.com/WordPress/gutenberg/pull/77658)) | Fails all three focused unit tests. |
| `danluu/try/rtc-duplicate-table-rows-stock-repro-pr-trunk` at `2e153b32280` ([#77723](https://github.com/WordPress/gutenberg/pull/77723)) | Fails the focused object+query map tests. That branch adds stable IDs for query-array elements, but the object map stale-snapshot overwrite remains. |
| `danluu/try/fuzz-known-issues-fixed-campaign` at `220392e83e9` | The direct `mergeCrdtBlocks()` update and delete repros still fail with the stale caption restored. The post-adapter helper diverges on that campaign branch, so the merge-level result is the useful signal there. |

### Current trunk and newer danluu branch revalidation

I re-fetched current refs on 2026-05-01:

```bash
git fetch origin trunk
git fetch danluu '+refs/heads/*:refs/remotes/danluu/*'
```

Current `origin/trunk` was `68484244df2d`. The proposed PR branch
`danluu/try/stale-query-object-map-pr` is rebased on that trunk and has this
three-commit structure:

```text
eb4c6383612 Add RTC stale snapshot merge repros
7fa898389e0 Add RTC stale table Playwright repro
17f5c915e93 Preserve remote CRDT edits from stale local snapshots
```

| Ref tested | Why tested | Command/result |
| --- | --- | --- |
| `7fa898389e0` (`origin/trunk` plus repro tests, no fix) | Current trunk baseline for the stock Table browser repro. | `WP_ENV_PORT=8922 WP_BASE_URL=http://localhost:8922 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-stale-query-object-map-baseline-rebased-check/artifacts/repeat-baseline-post-rebase-8922 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-table-stale-snapshot.spec.ts --project=chromium --grep "stale HTML snapshot" --repeat-each=5 --retries=0` failed 5/5 on user-visible table preservation assertions. |
| `17f5c915e93` (`danluu/try/stale-query-object-map-pr`) | Proposed fix branch after rebase onto current trunk. | Same Playwright command on `WP_ENV_PORT=8921`, with artifacts under `/Users/danluu/dev/fuzz/gutenberg-stale-query-object-map-pr/artifacts/repeat-fix-post-rebase-8921`, passed 5/5. The full file also passed 2/2. |
| `17f5c915e93` (`danluu/try/stale-query-object-map-pr`) | Targeted CI checks for changed files. | `npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-object-query-stale-snapshot-repro.test.ts packages/core-data/src/utils/test/crdt-stale-query-array.test.ts packages/core-data/src/utils/test/crdt-stale-query-array-post.test.ts test/e2e/specs/editor/collaboration/collaboration-table-stale-snapshot.spec.ts` passed. `npm run test:unit -- packages/core-data/src/utils/test/crdt-object-query-stale-snapshot-repro.test.ts packages/core-data/src/utils/test/crdt-stale-query-array.test.ts packages/core-data/src/utils/test/crdt-stale-query-array-post.test.ts --runInBand` passed 31 tests. `npm run build -- --skip-types` passed. |
| `danluu/try/stale-top-level-blocks-pr` at `d4f43fbf6954` | Recent stale-snapshot fix touching block CRDT merge code. | Scratch minimal object+query unit repro failed 2/2. |
| `danluu/try/stale-rich-text-sibling-pr` at `1455411c8049` | Recent stale-snapshot fix touching block CRDT merge code and rich-text siblings. | Scratch minimal object+query unit repro failed 2/2. |
| `danluu/try/stale-content-overwrite-pr` at `54ff99db2227` | Recent RTC stale content overwrite fix touching `crdt-blocks.ts` and post sync plumbing. | Scratch minimal object+query unit repro failed 2/2. |
| `danluu/try/form-content-overwrite-pr` at `cd6822b89c95` | Recent stale form overwrite fix touching `crdt-blocks.ts` and post sync plumbing. | Scratch minimal object+query unit repro failed 2/2. |
| `danluu/try/rtc-duplicate-table-body-revision-loss-pr` at `c7ef8332801b` | Recent table/CRDT fix touching table identity and merge code. | Scratch minimal object+query unit repro failed 2/2. |
| `danluu/try/rtc-table-stale-snapshot-pr` at `876398df67b8` | Directly overlapping stock Table stale-snapshot fix branch. | Scratch minimal object+query unit repro failed 2/2. I also copied the current HTML-mode Playwright repro into a fresh detached scratch worktree and ran it on `WP_ENV_PORT=8923`; it failed 3/3. Two repeats failed on visible data loss (`A-new/B-new` missing or A's HTML edit missing), and one repeat hit an old-branch harness timeout after the textarea left HTML mode. Artifacts: `/Users/danluu/dev/fuzz/issue2-table-candidate-e2e/artifacts/rtc-table-stale-snapshot-pr-html-repro-8923/`. |
| `danluu/try/offset-space-bug-pr` at `f136c427533b` | Recent rich-text/CRDT fix touching `crdt-blocks.ts`. | Scratch minimal object+query unit repro failed 2/2. |
| `danluu/try/draft-reopens-blank-pr` at `a3e4dbc6e81a` | Recent sync bootstrap fix that could affect stale editor state. | Scratch minimal object+query unit repro failed 2/2. |
| `danluu/try/nav-menu-stale-save-pr` at `82c7692768c4` | Recent stale-save fix; inspected because it is stale-state related, though it is on navigation entities rather than block CRDT maps. | Scratch minimal object+query unit repro failed 2/2. |
| `danluu/fix/rtc-autodraft-autosave-loss-pr` at `b677576fbfe8` | Recent RTC autosave fix. | Scratch minimal object+query unit repro failed 2/2. |
| `danluu/try/rich-text-html-corruption` at `0e3f72522e2` | Recent rich-text branch by committer date. | Inspected only: diff is documentation for rich-text HTML corruption and does not include a product-code fix for block CRDT maps. |
| `danluu/try/stale-query-array` at `97b9e88e363` | Recent stale query-array branch by committer date. | Inspected only: branch contains repros/analysis and no product-code fix commit. |

The scratch minimal candidate command was:

```bash
npm run test:unit -- packages/core-data/src/utils/test/crdt-object-query-stale-snapshot-minimal.test.ts --runInBand
```

The copied scratch test keeps only the two `mergeCrdtBlocks()` object+query
update/delete histories to avoid unrelated old-branch post-adapter and editor
dependency drift. Its result summary and per-branch logs are under:

```text
/Users/danluu/dev/fuzz/issue2-danluu-checks-20260501-minimal-results-20260501-005833/
```

Conclusion: this issue is still active after the relevant known fixes I could
identify from #77716 and related open branches.

## Reproductions

New focused repro file:
`packages/core-data/src/utils/test/crdt-object-query-stale-snapshot-repro.test.ts`.

Focused merge-level repro:

```bash
npm run test:unit -- packages/core-data/src/utils/test/crdt-object-query-stale-snapshot-repro.test.ts --runInBand --testNamePattern="mergeCrdtBlocks preserves a remote sibling object property update"
```

Expected: after user B changes `hero.caption` and user A later changes only
`hero.headline` from a stale local snapshot, the final object is:

```js
{ headline: 'headline from user A', caption: 'caption from user B' }
```

Actual on `5ddf4ad1b34`: `caption` is restored to `caption before`.

Focused delete repro:

```bash
npm run test:unit -- packages/core-data/src/utils/test/crdt-object-query-stale-snapshot-repro.test.ts --runInBand --testNamePattern="mergeCrdtBlocks preserves a remote sibling object property delete"
```

Expected: after user B deletes `hero.caption`, user A's later stale headline
edit must not bring it back.

Actual on `5ddf4ad1b34`: `caption before` is resurrected.

Post CRDT adapter repro:

```bash
npm run test:unit -- packages/core-data/src/utils/test/crdt-object-query-stale-snapshot-repro.test.ts --runInBand --testNamePattern="post CRDT adapter preserves remote object\\+query sibling changes"
```

Expected: `applyPostChangesToCRDTDoc()` and `getPostChangesFromCRDTDoc()`
preserve B's caption update after A's stale headline snapshot is applied.

Actual on `5ddf4ad1b34`: the adapter returns `caption before`.

Run all lower-level repros:

```bash
npm run test:unit -- packages/core-data/src/utils/test/crdt-object-query-stale-snapshot-repro.test.ts --runInBand
```

Actual on `5ddf4ad1b34`: all 3 tests fail.

Playwright repro:
`test/e2e/specs/editor/collaboration/collaboration-object-query-stale-snapshot.spec.ts`.

```bash
WP_ENV_PORT=8894 WP_BASE_URL=http://localhost:8894 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-object-query-stale-snapshot.spec.ts --project=chromium
```

The test creates a draft post, opens it in two collaborative editor sessions,
registers a custom block with the object+query schema, inserts the block through
the block inserter, and edits visible textboxes with normal keyboard actions.
The custom block keeps a local draft after the user has edited the form, which
is a realistic block UI pattern and creates the stale local object snapshot
without direct Y.Doc mutation, fault injection, clock changes, or network hacks.

Expected: after B edits the caption and A edits the headline, both editors show:

```js
{ headline: 'headline from user A', caption: 'caption from user B' }
```

Actual on `5ddf4ad1b34`: A's final attributes are:

```js
{ headline: 'headline from user A', caption: 'caption before' }
```

I first tried a simpler Playwright flow where both editors edited the shared
fields directly without a local draft held by the block. That passed because the
block UI immediately consumed the remote prop update and did not retain a stale
object snapshot. The retained local draft variant is still natural for a block
form and exercises the real editor data path.

### Stock Table browser repro evidence

The proposed fix branch also carries a browser-level repro using only the stock
`core/table` block and ordinary editor controls:
`test/e2e/specs/editor/collaboration/collaboration-table-stale-snapshot.spec.ts`.
This is the realistic browser repro used for PR-readiness because it does not
register a custom block, mutate a Y.Doc directly, mutate editor stores, pause
clocks or networks, or use fault injection.

Minimal user flow:

1. Create a draft containing a normal two-row Table block with cells
   `A1/B1` and `A2/B2`.
2. User A opens the stock Table block's built-in **Edit as HTML** mode,
   retaining a local HTML snapshot.
3. User B uses the stock Table toolbar's **Insert row after** action and types
   `A-new/B-new` into the inserted row.
4. User A edits only `A1` in the stock HTML textarea to
   `A1 local HTML edit`, then switches the block back to visual mode.

Expected final visible table on both editors:

```js
[ 'A1 local HTML edit', 'B1', 'A-new', 'B-new', 'A2', 'B2' ]
```

Repeated baseline command, run from a detached baseline worktree at
`7fa898389e0` (`trunk` plus the repro tests, without the fix):

```bash
WP_ENV_PORT=8922 WP_BASE_URL=http://localhost:8922 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-stale-query-object-map-baseline-rebased-check/artifacts/repeat-baseline-post-rebase-8922 \
npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-table-stale-snapshot.spec.ts --project=chromium --grep "stale HTML snapshot" --repeat-each=5 --retries=0
```

Result on the unfixed baseline: 5/5 repeats failed the user-visible preservation
assertion. In 3/5 repeats the remotely inserted `A-new/B-new` row disappeared
and the final visible table was:

```js
[ 'A1 local HTML edit', 'B1', 'A2', 'B2' ]
```

In 2/5 repeats the stale HTML handoff lost User A's local `A1` edit while
retaining User B's row:

```js
[ 'A1', 'B1', 'A-new', 'B-new', 'A2', 'B2' ]
```

Both outcomes are visible editor data loss from the same normal stock Table
workflow; the first is the stale-snapshot overwrite symptom this fix targets,
and the second is the same workflow failing the preservation invariant in the
other direction. The repeated baseline artifacts are under:

```text
/Users/danluu/dev/fuzz/gutenberg-stale-query-object-map-baseline-rebased-check/artifacts/repeat-baseline-post-rebase-8922/
```

Repeated fix-branch command, run from
`/Users/danluu/dev/fuzz/gutenberg-stale-query-object-map-pr` at
`17f5c915e93`:

```bash
WP_ENV_PORT=8921 WP_BASE_URL=http://localhost:8921 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-stale-query-object-map-pr/artifacts/repeat-fix-post-rebase-8921 \
npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-table-stale-snapshot.spec.ts --project=chromium --grep "stale HTML snapshot" --repeat-each=5 --retries=0
```

Result on the fix branch: 5/5 repeats passed. The repeated fix artifacts are
under:

```text
/Users/danluu/dev/fuzz/gutenberg-stale-query-object-map-pr/artifacts/repeat-fix-post-rebase-8921/
```

I also tried a keyboard-typing variant of the HTML textarea edit. It was less
useful as evidence because it sometimes failed before the final preservation
assertion when the textarea had already left HTML mode. The committed repro uses
Playwright's normal form-control `fill()` action on the stock HTML textarea,
which produced a clean 5/5 baseline-fails and 5/5 fix-passes split.

Verification commands that passed before writing this handoff:

```bash
npm run lint:js -- packages/core-data/src/utils/test/crdt-object-query-stale-snapshot-repro.test.ts test/e2e/specs/editor/collaboration/collaboration-object-query-stale-snapshot.spec.ts
npm run build -- --skip-types
```

## Failure mechanism

`mergeCrdtBlocks()` iterates the incoming block snapshot and compares each
incoming attribute against the current value in the local Y.Doc. For nested Yjs
values, including object+query attributes stored as `Y.Map`, it always delegates
to `mergeYValue()` because `fastDeepEqual()` cannot compare a Y type with a plain
object.

For `schema.type === 'object' && schema.query`, `mergeYValue()` calls
`mergeYMapValues()`. `mergeYMapValues()` then:

1. iterates every key in the incoming plain object and calls `mergeYValue()` for
   that key;
2. deletes every key currently in the `Y.Map` that is absent from the incoming
   object.

That is correct only if the incoming object is causally the latest intended
state of the whole object. In the stale-snapshot history, it is not. The
incoming object is a local UI snapshot that only proves user A changed
`hero.headline`; it says nothing reliable about `hero.caption`. Because the
merge diffs against the current Y.Doc instead of against user A's previous local
snapshot, the old caption is misclassified as a local write, and missing keys
are misclassified as local deletes.

## How this was introduced

The exact introducing PR is uncertain because this is a semantic bug in the
snapshot merge model, not a crash introduced by one isolated line.

Evidence from `packages/core-data/src/utils/crdt-blocks.ts` history:

- [#72262](https://github.com/WordPress/gutenberg/pull/72262) introduced the
  post/block CRDT merge infrastructure (`84019935998`). That established the
  broad pattern of merging incoming editor snapshots into the CRDT document.
- [#76913](https://github.com/WordPress/gutenberg/pull/76913) added the
  schema-aware nested Yjs representation for table/query attributes
  (`09a21c64b5b`). That commit added the relevant `object` with `query` handling
  through `Y.Map` and `mergeYMapValues()`, which is the active failure path for
  this issue.
- [#77164](https://github.com/WordPress/gutenberg/pull/77164) changed query
  array stability (`a6bfd3e5543`). It is related to stale snapshots for nested
  arrays, but this object+query map repro fails without needing array structural
  matching.

My best supported attribution is that the stale full-snapshot model originates
with the initial block CRDT merge design, while the object+query map-specific
failure became observable through the nested Y.Map handling added in #76913.

## Initial fix plan

Track the previous local editor snapshot for each local merge stream and derive
local operations by diffing:

```text
previous local snapshot -> next local snapshot
```

Then apply only those local operations to the current Y.Doc. For object+query
maps:

- update a key only if that key changed locally between the previous and next
  local snapshots;
- delete a key only if it existed in the previous local snapshot and is absent
  from the next local snapshot;
- preserve remote sibling keys already present in the Y.Doc when the local diff
  has no operation for that key.

The implementation should be schema-driven and not special-case
`test/object-query-card` or `hero`.

## Fix plan audit

### Linus Torvalds lens

The bug is an invariant failure: a stale snapshot is being treated as a set of
operations. Patching `mergeYMapValues()` with heuristics such as "do not replace
if the Y.Doc value differs" would hide one symptom while breaking legitimate
local overwrites. The fix needs an explicit local-base invariant: writes must be
derived from a known prior local state, and the merge code must be small enough
that updates and deletes follow the same rule.

### Kyle Kingsbury / Jepsen lens

The property to preserve is operation causality and convergence, not just final
deep equality for a happy path. The stale local snapshot has not observed B's
caption operation, so it cannot safely overwrite or delete that field. Tests
must include histories for remote update, remote add, remote delete, replayed
updates, late join, and both application orders. Deletes need special attention:
a missing field is only a delete if there is local-base evidence that the field
was removed locally.

### Dan Luu lens

The Playwright repro matters because this is not just an artificial model test.
Stateful block UIs commonly keep draft form objects, debounce updates, or stage
multi-field edits before committing them. A fix that only handles the exact unit
shape may still fail under real editor interleavings. The tests should leave a
debuggable trail with ordinary block attributes and should avoid hidden metadata
that leaks into serialized content or plugin-visible block data.

## Revised fix plan

1. Add local-base snapshot plumbing at the RTC adapter boundary, likely around
   `applyPostChangesToCRDTDoc()` or its caller, so `mergeCrdtBlocks()` can
   receive both the previous local blocks and the next local blocks for local
   writes.
2. Keep the existing full merge path only for initialization, loading a fresh
   CRDT document, or explicitly trusted full-state replacement.
3. Add recursive schema-aware diff application for object+query maps. The diff
   should emit key update/delete operations from previous-local to next-local
   and apply those operations to the current Y.Map. For nested Y.Text and
   Y.Array values, delegate to the corresponding operation-aware merge path.
4. When there is no previous local snapshot for an already-synced record, prefer
   preserving remote data and forcing an editor resync over applying a
   destructive full-object overwrite.
5. Extend tests:
   - keep the focused update/delete tests in
     `crdt-object-query-stale-snapshot-repro.test.ts`;
   - add remote add and replay-order cases;
   - add a late-join or reload assertion once the local-base plumbing exists;
   - keep the Playwright repro as the browser-level guard for realistic
     stateful block UI behavior.

## Open questions

- Where should the previous local snapshot live so it is per entity, per local
  editor stream, and not confused with remote state received from Yjs?
- How should full-state replacement be represented explicitly so initialization
  and migrations do not accidentally use the delta-only path?
- Should local-base diffing also become the shared fix for rich-text siblings,
  query arrays, and top-level block arrays, or should object maps land as the
  first narrow slice behind a common operation interface?
