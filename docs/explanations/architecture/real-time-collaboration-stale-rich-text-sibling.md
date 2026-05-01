# Stale Local Snapshots Overwrite Remote Rich-Text Sibling Attributes

## Summary

Issue 1 from the RTC fuzz handoff is still reproducible in the CRDT merge layer on current `origin/trunk` at `e4fcfecee9271267101a15ebda121374c7410fed`.

When one client receives a remote rich-text attribute change and then emits an older local full-block snapshot that only intended to change a sibling rich-text attribute, `mergeCrdtBlocks` treats the stale sibling value as the desired current state. The result is a lost remote update or a resurrected remote delete.

The focused reproductions use a synthetic two-rich-text-attribute block and a real `core/file` shape because `core/file` has sibling rich-text attributes: `fileName` and `downloadButtonText`. A browser-level reproduction is now available with normal user actions in a large post.

## Status against known fixes

Checked against the known fixes tracked from [WordPress/gutenberg#77716](https://github.com/WordPress/gutenberg/issues/77716) and related RTC fuzz work:

-   [#77658](https://github.com/WordPress/gutenberg/pull/77658), open: fixes rich-text cursor scope and offset behavior for [#77532](https://github.com/WordPress/gutenberg/issues/77532). This is a cursor mapping issue, not stale full-block snapshot reconciliation.
-   [#77662](https://github.com/WordPress/gutenberg/pull/77662), open: adds regression coverage for the cursor-scope issue fixed by #77658.
-   [#77666](https://github.com/WordPress/gutenberg/pull/77666), open: title reload divergence. It does not touch block rich-text sibling reconciliation.
-   [#77669](https://github.com/WordPress/gutenberg/pull/77669), merged and included in this trunk base: fixes large update size checking.
-   [#77673](https://github.com/WordPress/gutenberg/pull/77673), open: nested rich-text cursor awareness behavior.
-   [#77675](https://github.com/WordPress/gutenberg/pull/77675), open: room creation and split update-log race.
-   [#77678](https://github.com/WordPress/gutenberg/issues/77678), open issue: malformed awareness input crash.
-   [#77681](https://github.com/WordPress/gutenberg/pull/77681), merged and present in trunk history: fixes undo targeting the wrong synced entity.

No matching stale-local-snapshot rich-text sibling fix was found in the tracking issue or repository searches.

I also applied the focused direct merge repro to the existing known-fixes runtime branch `try/fuzz-known-fixes-runtime` at `86b2df5cacc18ea1ac3ddffc976d83428fd05dae`. The repro still failed there: the remote `second` value was replaced with the stale initial value.

### Current trunk and newer danluu branch revalidation

On 2026-05-01, I fetched current `origin/trunk` and all `danluu` branch refs, then re-ran the natural Playwright repro against current trunk, the rebased proposed PR branch, and the newer plausible `danluu` fix branches. All runs used normal browser actions only and asserted the user-visible `core/file` sibling text loss.

| Branch | HEAD tested | Why tested | Command and artifact | Result |
| --- | --- | --- | --- | --- |
| `origin/trunk` | `e4fcfecee9271267101a15ebda121374c7410fed` | Current upstream baseline with only the repro copied in | `WP_BASE_URL=http://localhost:8945 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-stale-rich-text-sibling.spec.ts --project=chromium --repeat-each=3`; `/Users/danluu/dev/fuzz/gutenberg-stale-rich-text-current-trunk/artifacts/stale-rich-text-candidate-search/current_origin_trunk_repro_repeat3.log` | Failed 2/3 on the real visible file-name assertion: expected `Remote file`, received `Re`. |
| `danluu/try/stale-rich-text-sibling-pr` | `40480dc4243501438c39cf704d9082ebff8581d1` | Proposed Issue 1 fix branch after rebase onto current trunk | `WP_BASE_URL=http://localhost:8946 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-stale-rich-text-sibling.spec.ts --project=chromium --repeat-each=3`; `/Users/danluu/dev/fuzz/gutenberg-stale-rich-text-sibling-pr/artifacts/stale-rich-text-candidate-search/rebased_pr_branch_repro_repeat3.log` | Failed 2/3; unit/lint/build passed, but the strengthened browser repro still observed truncated `fileName` values (`Remote f`, `Remo`). |
| `danluu/try/stale-content-overwrite-pr` | `244072e083d4997eb9e87adcaac3cd6aa866b516` | New broad stale snapshot/content overwrite fix branch | `WP_BASE_URL=http://localhost:8940 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-stale-rich-text-sibling.spec.ts --project=chromium --repeat-each=3`; `/Users/danluu/dev/fuzz/gutenberg-stale-content-overwrite-pr/artifacts/stale-rich-text-candidate-search/danluu_stale_content_overwrite_pr_repro_repeat3.log` | Failed 2/3 on the visible file-name assertion (`Remote `, `Remo`). |
| `danluu/try/stale-top-level-blocks-pr` | `d4f43fbf6954e72cff69dc6577222358fcf7d354` | New stale top-level block merge fix branch touching CRDT snapshot preservation | `WP_BASE_URL=http://localhost:8941 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-stale-rich-text-sibling.spec.ts --project=chromium --repeat-each=3`; `/Users/danluu/dev/fuzz/gutenberg-stale-top-level-blocks-pr/artifacts/stale-rich-text-candidate-search/danluu_stale_top_level_blocks_pr_repro_repeat3.log` | Failed 2/3, including visible file-name truncation (`R`). |
| `danluu/try/stale-query-object-map-pr` | `17f5c915e9326c9a566d5506aa99a4d9d464882e` | New stale object/query CRDT merge branch touching related merge code | `WP_BASE_URL=http://localhost:8942 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-stale-rich-text-sibling.spec.ts --project=chromium --repeat-each=3`; `/Users/danluu/dev/fuzz/gutenberg-stale-query-object-map-pr/artifacts/stale-rich-text-candidate-search/danluu_stale_query_object_map_pr_repro_repeat3.log` | Failed 1/3 on the visible file-name assertion (`Remote `). |
| `danluu/try/offset-space-bug-pr` | `f136c427533badb2ba67bd38957f8be8dfea128a` | New rich-text cursor/selection fix branch | `WP_BASE_URL=http://localhost:8944 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-stale-rich-text-sibling.spec.ts --project=chromium --repeat-each=3`; `/private/tmp/gutenberg-issue5-pr-rebase/artifacts/stale-rich-text-candidate-search/danluu_offset_space_bug_pr_repro_repeat3.log` | Failed 3/3 on the visible file-name assertion (`Re`, `Rem`, `Remot`). |

`danluu/try/rich-text-html-corruption` was considered because of its rich-text name, but it is an analysis-only branch and does not contain a candidate code fix for this issue.

## Reproductions

### Focused unit and adapter repro

Command:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-stale-rich-text-sibling.test.ts -- --runInBand
```

Result on this branch: fails with three reproductions.

-   Synthetic rich-text sibling update: expected `second: "remote second"`, got `second: "initial second"`.
-   Synthetic rich-text sibling delete: expected `second` to remain deleted, got resurrected `second: "remote second"`.
-   `core/file` post-CRDT adapter repro: expected `fileName: "remote file"`, got `fileName: "initial file"` while the local `downloadButtonText` edit was applied.

The test file is `packages/core-data/src/utils/test/crdt-stale-rich-text-sibling.test.ts`.

### Known-fixes branch check

The original handoff fuzz file is not present on clean `origin/trunk`, so the exact fuzz seed commands from the dirty handoff checkout cannot run directly in this clean worktree.

The focused direct merge repro was temporarily copied to `/Users/danluu/dev/fuzz/gutenberg-try-fuzz` on `try/fuzz-known-fixes-runtime` and run with:

```bash
npm exec --workspace @wordpress/unit-tests -- wp-scripts test-unit-js --config jest.config.js packages/core-data/src/utils/test/crdt-stale-rich-text-sibling.test.ts --runInBand --testNamePattern='mergeCrdtBlocks receives an older local snapshot'
```

Result: fails. Expected `remote second`, received `initial second`.

The temporary file was removed from that worktree afterward.

### Playwright natural repro

Setup:

```bash
WP_ENV_PORT=8896 npm run wp-env-test start
npm run build -- --skip-types
```

Command:

```bash
WP_BASE_URL=http://localhost:8896 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-stale-rich-text-sibling.spec.ts --project=chromium
```

Result: fails reliably on this worktree with normal user actions.

The Playwright test uses normal editor actions only. It creates a large draft post with one `core/file` block followed by 2,000 normal paragraph blocks, opens two collaborative editor sessions, keeps user A typing in the file block's download button text, and has user B replace the file name with `Remote file` during that continuous typing. It does not mutate a `Y.Doc`, inject faults, alter the network, alter clocks, patch providers, or use test-only CRDT behavior.

Observed result from repeated runs:

-   expected both users to converge on `fileName: "Remote file"`;
-   received a truncated remote sibling value such as `fileName: "Remo"`, `fileName: "Remote"`, or `fileName: "Remote "`;
-   user A's `downloadButtonText` edit is preserved.

This is a browser-level variant of the same stale sibling class: user B's rich-text sibling edit is partially overwritten while user A continues editing the other rich-text sibling in the same block.

Earlier natural attempts with smaller documents passed:

-   1,700 trailing paragraphs with the same continuous-typing workflow;
-   1,500 trailing paragraphs with the same continuous-typing workflow;
-   500 trailing paragraphs with the same continuous-typing workflow;
-   a `core/pullquote` block with user A continuously editing the citation while user B edited the quote text;
-   user A typed a long download-button edit while user B edited the file name after a short normal delay;
-   user A waited one normal collaboration sync cycle after user B's edit before changing the download button text.

## Failure mechanism

The CRDT path receives block changes as full block snapshots.

`applyPostChangesToCRDTDoc` forwards `changes.blocks` to `mergeCrdtBlocks` without the previous local block snapshot that produced the change. `mergeCrdtBlocks` then compares the incoming full snapshot against the current `Y.Array`.

For attributes, the current logic treats any existing Yjs shared type as changed:

```ts
const isYType = currentAttribute instanceof Y.AbstractType;
const isAttributeChanged =
	isYType ||
	JSON.stringify( currentAttribute ) !== JSON.stringify( newAttribute );
```

Rich-text attributes are stored as `Y.Text`, so every rich-text sibling in an incoming block snapshot is considered changed. If the incoming snapshot is older than a remote update already applied to the local `Y.Doc`, `mergeRichTextUpdate` diffs the stale value against the current remote value and applies the stale value. That loses the remote update. In the Playwright repro, this appears as a truncated `fileName` prefix because user B's typing and user A's sibling snapshots interleave while the large block tree is being synced.

For remote deletes, the stale full snapshot still contains the deleted attribute, so the merge path recreates it.

The missing invariant is: an older local snapshot should only apply the local delta from the previous local snapshot, not assert every rich-text sibling value in the block as current truth.

## How this was introduced

The best-supported introduction point is [#72262](https://github.com/WordPress/gutenberg/pull/72262), commit `84019935998c16f877e976ad85e84748355d7282`, which introduced the post block CRDT merge logic and represented block data with Yjs shared types.

That PR improved collaboration by avoiding whole-block replacement and recursively merging block attributes and inner blocks. However, the block write path still accepted full editor snapshots as authoritative merge targets. It did not carry a local base snapshot, so it could not distinguish "this local edit changed sibling A" from "this older local snapshot also wants to restore sibling B."

[#73946](https://github.com/WordPress/gutenberg/pull/73946) later hardened rich-text Y.Text type checks, but it did not create the stale-snapshot base problem. [#76913](https://github.com/WordPress/gutenberg/pull/76913) and [#77164](https://github.com/WordPress/gutenberg/pull/77164) expanded nested and array/object merge behavior and are relevant to nearby stale-snapshot risks, but the top-level rich-text sibling failure is already explained by the full-snapshot merge contract from #72262.

## Initial fix plan

Add local-base-aware block reconciliation at the post CRDT adapter boundary.

The write path should track the previous local block snapshot for each synced entity. When the editor emits a new local `blocks` snapshot, compute the local delta from `previousLocalBlocks` to `nextLocalBlocks` and apply only that delta to the CRDT document.

For rich-text attributes, this means:

-   update an attribute only when it changed between the previous local snapshot and the new local snapshot;
-   delete an attribute only when it existed in the previous local snapshot and is absent from the new local snapshot;
-   leave sibling attributes untouched when they are unchanged locally, even if the current `Y.Doc` value differs because of a remote update.

Add tests before the fix:

-   focused `mergeCrdtBlocks` update and delete cases;
-   `applyPostChangesToCRDTDoc` using a real `core/file` block shape;
-   the large-document `core/file` Playwright repro with normal typing in both editor sessions.

## Fix plan audit

### Linus Torvalds lens

The fix should not be a special case for `core/file`, `Y.Text`, or sibling attribute names. The bad abstraction is treating a stale full snapshot as a desired final state. The cleaner invariant is to merge local changes, not stale local state.

The code should make that invariant explicit at one boundary. A pile of per-attribute exceptions inside `mergeRichTextUpdate` would hide the real bug and leave the same class of error for nested blocks, object attributes, and future block shapes.

### Kyle Kingsbury / Jepsen lens

This is a causality bug. A remote operation that has already reached the local CRDT document should not be undone by an older local operation that did not observe or intend to change that field.

Convergence alone is not enough. Both clients can converge on the stale value and still lose acknowledged user data. The regression tests should assert preservation of independent sibling operations, not just eventual equality.

### Dan Luu lens

The dangerous production case is an ordinary UI scheduling interleaving: the editor emits an older tree snapshot while collaboration updates are also flowing. A fix that only handles the exact synthetic sequence is weak.

The implementation should be debuggable. It should be possible to answer which local base a block write was diffed against, and why a remote sibling was preserved or overwritten. The tests should cover deletes as well as updates because stale resurrection bugs often survive update-only coverage.

## Revised fix plan

Implement a base-aware block merge path rather than patching rich-text diffing in isolation.

1. Store a previous local block snapshot per synced post entity in the local sync/write layer.
2. When a new local `blocks` snapshot is emitted, compute changed block and attribute paths against that previous local snapshot.
3. Apply only those local changes to the CRDT document. For unchanged sibling rich-text attributes, skip `mergeRichTextUpdate` entirely.
4. Treat attribute deletion as local only when the attribute was present in the previous local snapshot and absent in the new local snapshot.
5. Keep the existing full-snapshot merge path for initial hydration and explicit resync cases where there is no local base.
6. For ambiguous structural edits where identity cannot be established safely, prefer preserving remote data and forcing a resync over deleting remote fields from a stale snapshot.
7. Land the focused unit, adapter, and large-document Playwright regression before changing merge behavior.

## Open questions

-   Where should the previous local block snapshot live: the SyncManager entity state, the core-data entity sync layer, or the block-editor bridge that emits post changes?
-   After remote CRDT updates reconcile into the editor store, when should the local base advance without making older queued local snapshots look current?
-   Is the 2,000-paragraph Playwright repro acceptable as a regression test despite its runtime, or should it be kept as an issue-specific reproducer while unit/adapter coverage guards the fix in CI?
-   How should the same local-base contract be extended to nested blocks and array/object attributes without duplicating diff logic in multiple merge helpers?
