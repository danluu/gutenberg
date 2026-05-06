# RTC top-level move reconciliation can duplicate a sibling and drop another block

Bug signature: `a55350721046`

Bug type: `rtc_top_level_move_reconciliation_preserves_inserted_heading_and_drops_moved_sibling_after_checkpoint_churn`

Transport: HTTP polling

## Summary

Two collaborative editors can permanently diverge after a normal top-level block sequence:

1. User A deletes an earlier top-level block.
2. User B inserts a block before a remaining sibling.
3. User A moves that sibling down.
4. A stale full-block snapshot from the other editor is merged after the move.

The expected state keeps the inserted block and both original siblings in the moved order. The failing state keeps the inserted block, duplicates one sibling, and drops the other sibling.

This is a product bug, not a readiness or locator failure. The Playwright repro uses visible editor UI for delete, add-before, and move-down. The failure occurs after both clients are online and after waiting for collaborative state convergence. The divergent final block trees are valid editor states, but they are not equal and one side has lost user content.

## Evidence

The known-fixes-base rerun used the already-running source HTTP wp-env on port `9495` because a new `wp-env` network could not be created locally. The one-attempt rerun failed in 43.5s:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-3
export WP_BASE_URL=http://localhost:9495
export WP_ENV_PORT=9495
export RTC_MANIFEST_WS_START_PORT=20840
export RTC_MANIFEST_WS_FIXED_PORT=1
export RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-36/a553-known-base-rerun
export RTC_EC47_ATTEMPTS=1
npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium
```

The primary page ended with:

```text
inserted paragraph
another paragraph
emoji paragraph
```

The collaborator ended with:

```text
inserted paragraph
emoji paragraph
emoji paragraph
```

So the collaborator duplicated the moved emoji paragraph and dropped the `another paragraph` sibling.

## Root Cause

`mergeCrdtBlocks()` receives full local block snapshots from the editor and reconciles them into a CRDT-backed `Y.Array`. During collaboration, those full snapshots can be stale relative to the CRDT array: another editor may already have inserted a block or moved a sibling, while the local editor is still echoing the older top-level order.

Before the fix, `mergeCrdtBlocks()` treated every incoming snapshot as authoritative unless the positional diff found no work. With a stale incoming order, the positional update path could rewrite the wrong `Y.Map` records and then run duplicate-clientId cleanup. In the failing sequence, the primary editor had the correct order:

```text
inserted paragraph
another paragraph
emoji paragraph
```

The collaborator later merged a stale snapshot ordered as:

```text
inserted paragraph
emoji paragraph
another paragraph
```

That stale snapshot was enough to preserve the remote insert while duplicating the emoji paragraph and dropping the moved `another paragraph` sibling. The issue is not malformed block HTML or a bad Playwright locator; it is stale snapshot authority at the CRDT array boundary.

Pass 37 narrowed the known-fixes-base failure mode. The known-fixes base at `3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only the regression tests applied, already passes the two stale-order Y.Doc repros. It still fails the same-array-reference reorder test:

```text
Expected: inserted paragraph, another paragraph, emoji paragraph
Received: inserted paragraph, emoji paragraph, another paragraph
```

That isolates the remaining source-manifest failure to the original `serializableBlocksCache`. The cache keys only on the incoming block array object. If the editor reuses that array object after a real top-level move, `mergeCrdtBlocks()` can reuse the old serialized snapshot and never observe the user move. The browser repro's final divergence is consistent with that: one editor applies the move, while the other keeps the stale pre-move order and then the positional merge/duplicate-clientId cleanup drops the intervening sibling.

Pass 39 isolated the cache more directly. In a temporary known-fixes-base worktree with only the regression-test commit applied, the same-array-reference reorder test failed. Applying only this minimal code change:

```diff
-const serializableBlocksCache = new WeakMap< WeakKey, Block[] >();
 ...
-	const localBlocksToSync =
-		serializableBlocksCache.get( incomingBlocks ) ?? [];
+	const localBlocksToSync = makeBlocksSerializable( incomingBlocks );
```

made the same test pass, and the three focused regressions passed together. That rules out the later stale-snapshot reconciliation as the remaining blocker for this signature and pins the observed known-fixes-base failure on the cache hiding a real reorder.

Pass 40 refreshed that proof after rebasing the PR branch onto `origin/trunk` at `e7f55c1b4d23b3eaebde1288b258b0d1c3bce938`. With only the current regression-test commit applied, current trunk fails all three focused repros. The known-fixes base at `3cba2b1e56a98787de08dc6c7df2434759e8f908` passes the two stale-snapshot Y.Doc repros but still fails the same-array-reference reorder repro. The rebased PR branch passes the same focused set and the full `crdt-blocks` unit suite. This separates the bug into two layers: known fixes already cover stale snapshot authority, while this signature still requires removing the object-identity serialization cache so same-reference editor reorders are observable.

Pass 41 independently repeated the same split against the same current trunk and known-fixes base. The trunk negative control, with only the regression-test commit applied, failed all three focused repros: the two stale-snapshot Y.Doc cases and the same-array-reference reorder case. The known-fixes-base negative control again passed the two stale-snapshot cases and failed only `observes reordered blocks when the editor reuses the same block array reference`. The PR branch passed the same three-test focus set. A fresh headless Playwright rerun was attempted on the fixed branch, but local `wp-env start` still failed before WordPress boot because Docker could not allocate another bridge network:

```text
failed to create network wp-env-gutenberg-bug-a55350721046-09e684eb_default: Error response from daemon: all predefined address pools have been fully subnetted
```

That environment failure does not affect the classification: every active `wp-env` bridge network had running containers attached, so the pass did not stop unrelated environments, and the prior fixed-branch headless Playwright run remains the latest feasible natural-user-action browser verification.

Pass 42 refreshed the same controls after `origin/trunk` advanced to:

```text
02bfdaa5ca9 RTC: Fix divergence when two offline users reconnect (#77980)
```

That new trunk commit only changes the HTTP polling sync server and a changelog entry, not the CRDT block merge code. With only the regression-test commit applied to current trunk, all three focused repros still fail. With the same regression tests applied to the known-fixes base, the two stale-snapshot Y.Doc repros still pass and the same-array-reference reorder repro still fails. The rebased PR branch passes the three focused repros, the full `crdt-blocks` unit file, targeted JS lint, and `git diff --check`. This is the pass-42 narrower root-cause proof: an editor can lose a top-level move without any Playwright, HTTP polling, readiness wait, or second browser involved, solely because `mergeCrdtBlocks()` reuses a stale serialized result for a mutated block-array object.

Pass 43 added fresh runtime verification after starting the correct `.wp-env.test.json` environment on `WP_ENV_PORT=9905` with `WP_ENV_PHPMYADMIN_PORT=19905`. The fixed PR branch passed the natural-user Playwright repro in 23.4s; both editors converged to:

```text
RTC ec47 realistic inserted paragraph 1
Another paragraph exists so the top-level list is not degenerate.
Emoji and multibyte: hi ..., こんにちは, مرحبا.
```

The same pass repeated the focused unit controls. Current `origin/trunk` plus only the regression-test commit still fails all three focused repros. The known-fixes base plus only the regression-test commit still passes the two stale-snapshot Y.Doc repros and fails only the same-array-reference reorder repro. The PR branch passes the focused repros, the full `crdt-blocks` unit file, and targeted JS lint. That confirms the existing branch and video satisfy the requested standard, with pass-43 adding the previously blocked fresh browser verification.

Pass 44 repeated the controls in fresh detached worktrees after fetching `origin/trunk` at:

```text
02bfdaa5ca9 RTC: Fix divergence when two offline users reconnect (#77980)
```

Current trunk plus only the regression-test commit failed all three focused non-Playwright repros. The known-fixes base at `3cba2b1e56a98787de08dc6c7df2434759e8f908`, again with only that same test commit applied, passed the two Y.Doc stale-snapshot repros and still failed only `observes reordered blocks when the editor reuses the same block array reference`. The fixed PR branch passed the same three focused repros, the full `crdt-blocks` unit file, targeted JS lint, `git diff --check`, and a fresh one-attempt headless Playwright run on `.wp-env.test.json` port `9905`. The emitted Playwright JSON had both editors converged to:

```text
RTC ec47 realistic inserted paragraph 1
Another paragraph exists so the top-level list is not degenerate.
Emoji and multibyte: hi ..., こんにちは, مرحبا.
```

This is the pass-44 independent proof: after the known stale-snapshot fix set, the remaining unresolved source-manifest failure is still reproduced without a browser by mutating and reusing the same block-array object. That isolates the bug to the `serializableBlocksCache` object-identity assumption, not to HTTP polling, Playwright readiness, generated locator actions, malformed block markup, or inverted assertions.

Pass 45 repeated the split in fresh detached worktrees after fetching `origin/trunk`, which remained at:

```text
02bfdaa5ca9 RTC: Fix divergence when two offline users reconnect (#77980)
```

The corrected focused Jest invocation was:

```bash
npm run --workspace @wordpress/unit-tests test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runInBand --testNamePattern='preserves an inserted heading|observes reordered blocks|preserves a remotely inserted block'
```

Current trunk plus only regression commit `d71d0bc87fe` failed all three focused repros. The known-fixes base at `3cba2b1e56a98787de08dc6c7df2434759e8f908`, plus the same regression commit, passed the two stale Y.Doc cases and failed only `observes reordered blocks when the editor reuses the same block array reference`. The fixed PR branch passed the focused regressions, the full `packages/core-data/src/utils/test/crdt-blocks.ts` file (`76` tests), targeted JS lint, and `git diff --check`.

This pass adds a more precise negative-control note: an earlier top-level `npm run test:unit ... -- --testNamePattern=...` command did not forward the name filter to Jest in this workspace and therefore ran the wrong test set. The pass-45 controls use the workspace-level command above and the logs show the three added tests selected by name. With that corrected invocation, the same-reference block-array mutation remains the only known-fixes-base failure, which is the narrowest non-browser proof for this signature.

The requested fresh Playwright rerun on `WP_ENV_PORT=9905` was attempted after confirming `wp-env-test` status was `stopped`, but Docker failed before WordPress boot:

```text
failed to create network wp-env-gutenberg-bug-a55350721046-test-82fb78c1_default: Error response from daemon: all predefined address pools have been fully subnetted
```

Running containers were attached to the existing `wp-env` bridge networks, so pass 45 did not stop unrelated environments. The pass-44 fixed-branch Playwright JSON was copied into the pass-45 evidence directory and still shows both editors converged to `inserted paragraph`, `another paragraph`, `emoji paragraph`. Pass 45 also created a new headless annotated video from the source screenshots, action log, low-level controls, and fixed-branch verification artifacts.

Pass 46 repeated the corrected focused controls after fetching `origin/trunk`, which still resolved to:

```text
02bfdaa5ca9 RTC: Fix divergence when two offline users reconnect (#77980)
```

Current trunk plus only regression commit `d71d0bc87fe` failed all three focused repros. The known-fixes base at `3cba2b1e56a98787de08dc6c7df2434759e8f908`, plus the same regression commit, passed the two stale Y.Doc cases and failed only `observes reordered blocks when the editor reuses the same block array reference`. The fixed PR branch passed the same focused set, the full `packages/core-data/src/utils/test/crdt-blocks.ts` file (`76` tests), targeted JS lint, and `git diff --check`.

Pass 46 also restored fresh browser coverage on the requested `.wp-env.test.json` port family. With `WP_ENV_PORT=9905`, `WP_BASE_URL=http://localhost:9905`, `RTC_MANIFEST_WS_START_PORT=20440`, and `RTC_MANIFEST_WS_FIXED_PORT=1`, the fixed PR branch passed the one-attempt natural-user Playwright repro in 23.1s. The emitted attempt JSON showed both editors converged to:

```text
RTC ec47 realistic inserted paragraph 1
Another paragraph exists so the top-level list is not degenerate.
Emoji and multibyte: hi ..., こんにちは, مرحبا.
```

This pass verifies that the existing branch, branch ordering, natural-user repro, and fix still satisfy the requested standard on the current fetched trunk. The additional fresh browser pass removes the pass-45 Docker-network caveat.

Pass 47 repeated the verification against the same fetched `origin/trunk` (`02bfdaa5ca9`). A fresh trunk worktree with only regression commit `d71d0bc87fe` failed all three focused low-level repros. A fresh known-fixes-base worktree with the same test commit passed the two stale-snapshot Y.Doc repros and failed only the same-reference block-array reorder repro. The fixed PR branch passed the focused repros, the full `crdt-blocks` unit file (`76` tests), targeted JS lint, and `git diff --check`. The requested `wp-env-test` start initially failed because Docker's automatic address pool was exhausted; pass 47 avoided stopping unrelated active stacks by pre-creating this task's Compose default network with an explicit private subnet, then reran the natural-user Playwright repro headlessly on `http://localhost:9905`. It passed in 21.1s, and both editors converged to `inserted paragraph`, `another paragraph`, `multibyte paragraph`. This is a fresh pass-47 verification that the existing explanation branch, PR branch, video standard, and fix still satisfy the requested standard.

Pass 48 added an independent trace-level negative check of the source artifact. The Playwright `test.trace` records natural UI operations for the failing run: `Click getByText("Seed 950301 multibyte heading")`, `Click getByRole("menuitem", { name: "Delete" })`, `Click getByRole("menuitem", { name: "Add before" })`, `Type "RTC ec47 realistic inserted paragraph 1"`, and `Click getByRole("button", { name: "Move down" })`. The `page.evaluate` calls in the trace only read normalized editor state and serialized content for convergence checks. That rules out a generated-spec mutation, malformed direct block injection, or inverted assertion as the cause of the source failure.

Pass 48 also reran the controls after fetching `origin/trunk`, still at:

```text
02bfdaa5ca9 RTC: Fix divergence when two offline users reconnect (#77980)
```

Current trunk plus only regression commit `d71d0bc87fe` failed all three focused non-Playwright repros. The known-fixes base at `3cba2b1e56a98787de08dc6c7df2434759e8f908`, plus the same regression commit, passed the two stale Y.Doc cases and failed only `observes reordered blocks when the editor reuses the same block array reference`. The fixed PR branch passed the focused repros, the full `crdt-blocks` unit file (`76` tests), targeted JS lint, `git diff --check`, and a fresh one-attempt headless Playwright run on `http://localhost:9905` after pre-creating the exhausted Docker Compose network. The pass-48 Playwright JSON shows both editors converged to `inserted paragraph`, `another paragraph`, `multibyte paragraph`.

The vulnerable positional merge was introduced with `packages/core-data/src/utils/crdt-blocks.ts` in:

```text
84019935998 Improve CRDT "merge logic" for post entities (#72262)
```

`git blame` still points the object-identity serialization cache, left/right diff, positional update loop, delete/insert tail, and duplicate-clientId cleanup to that initial CRDT block merge implementation, with later RTC text and array improvements layered on top. Local `gh` was unavailable in pass 44, so PR metadata was taken from local commit titles. The relevant follow-up commits were `54af1ce40068` (`RTC: Ensure that changes are only applied to text and cursors for their associated RichText instances`) and `128a3c29b7f1` (`Real-time collaboration: Expand mergeCrdtBlocks() automated testing (#75923)`). Those later commits expanded CRDT text/array handling and test coverage, but did not remove the object-identity cache or make top-level order reconciliation identity-aware.

Pass 49 repeated the verification after fetching `origin/trunk`, which still resolved to:

```text
02bfdaa5ca9 RTC: Fix divergence when two offline users reconnect (#77980)
```

Current trunk plus only regression commit `d71d0bc87fe` still fails all three focused low-level repros. The known-fixes base at `3cba2b1e56a98787de08dc6c7df2434759e8f908`, plus the same regression commit, still passes the two stale-snapshot Y.Doc repros and fails only `observes reordered blocks when the editor reuses the same block array reference`.

Pass 49 adds a narrower cache proof: on that same known-fixes-base worktree, the pre-existing `handles block reordering` test passes when the reorder is delivered through a fresh `Block[]`, while `observes reordered blocks when the editor reuses the same block array reference` fails with the same expected order. That isolates the remaining bug to object-identity caching, not to the base positional reorder algorithm.

The fixed PR branch passes the focused repros, the full `packages/core-data/src/utils/test/crdt-blocks.ts` file (`76` tests), targeted JS lint, and `git diff --check`. A fresh one-attempt headless Playwright rerun on `WP_ENV_PORT=9905`, after pre-creating the exhausted Docker Compose network with subnet `10.253.210.0/24`, passed in 21.4s. The emitted pass-49 Playwright JSON shows both editors converged to `inserted paragraph`, `another paragraph`, `multibyte paragraph`.

Pass 50 verified that the existing branches, video standard, and fix still satisfy the requested bar without changing the PR branch commit order. After fetching `origin/trunk` at `02bfdaa5ca9`, a fresh trunk worktree with only regression commit `d71d0bc87fe` failed the two stale-snapshot repros and the same-array-reference reorder repro while the ordinary `handles block reordering` control passed. A fresh known-fixes-base worktree at `3cba2b1e56a98787de08dc6c7df2434759e8f908`, with that same regression commit, passed the two stale-snapshot repros and the ordinary fresh-array reorder control, but still failed only `observes reordered blocks when the editor reuses the same block array reference`. The fixed PR branch passed the four focused repros, the full `crdt-blocks` unit file (`76` tests), targeted JS lint, `git diff --check`, and a fresh headless Playwright run on `http://localhost:9905`. The pass-50 Playwright JSON shows both editors converged to `inserted paragraph`, `another paragraph`, `multibyte paragraph`.

Pass 51 added a narrow independent proof for the remaining same-array failure mode. On the test-only commit `d71d0bc87fe`, the focused unit test `observes reordered blocks when the editor reuses the same block array reference` fails without any browser, network transport, or CRDT peer:

```text
Expected: Inserted paragraph, Another paragraph, Emoji and multibyte
Received: Inserted paragraph, Emoji and multibyte, Another paragraph
```

The test mutates one `Block[]` in place from `[ inserted, emoji, another ]` to `[ inserted, another, emoji ]` and calls `mergeCrdtBlocks()` again. The pre-fix implementation still reads the earlier serialized value from `serializableBlocksCache`, proving that the move can be lost solely at the local merge boundary. Repeating the same focused set on known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908` plus `d71d0bc87fe` passed the two stale-snapshot Y.Doc repros and failed only the same-array-reference reorder test. The fixed PR branch passed the same focused test, the full `packages/core-data/src/utils/test/crdt-blocks.ts` file (`76` tests), targeted JS lint, and `git diff --check`.

Pass 51 also rechecked the archived source artifact. The failure log and trace show successful natural UI actions followed by a settled convergence failure: the primary editor had `inserted paragraph`, `another paragraph`, `emoji paragraph`, while the collaborator had `inserted paragraph`, `emoji paragraph`, `emoji paragraph`. The trace `page.evaluate` calls only read normalized block state and serialized content for convergence checks; they do not mutate editor data. A fresh browser rerun on `WP_ENV_PORT=9905` was attempted, but `wp-env start` failed before WordPress boot because Docker's bridge address pools were fully subnetted. Existing bridge networks had running containers attached, so pass 51 did not stop unrelated environments. The pass-51 video therefore stitches a new root-cause evidence card onto the previously verified annotated headless browser repro.

Pass 52 added a second, narrower same-array proof that does not depend on block movement at all. The new focused unit regression reuses the same `Block[]` reference, changes a paragraph's `content` attribute, and calls `mergeCrdtBlocks()` again. On the test-only commit:

```text
939fc6fca8c Add RTC stale top-level move merge regressions
```

the focused test fails with:

```text
Expected: Edited through reused array
Received: Initial content
EXIT_CODE=1
```

That proves the pre-fix `serializableBlocksCache` can hide any same-reference editor change, not only the particular top-level reorder from the source bug. Repeating the focused set on known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908` plus the same test commit produced this split:

```text
PASS preserves a remotely inserted block and the moved sibling after a stale top-level move
PASS preserves an inserted heading and the moved sibling after checkpoint-style stale snapshots
FAIL observes reordered blocks when the editor reuses the same block array reference
FAIL observes attribute edits when the editor reuses the same block array reference
EXIT_CODE=1
```

The rebased PR branch now has this commit order:

```text
939fc6fca8c Add RTC stale top-level move merge regressions
99c1002b998 Add RTC top-level move Playwright repro
a6e6efc42e5 Preserve RTC block order across stale snapshots
```

The fixed branch passes both same-array focused tests, the full `packages/core-data/src/utils/test/crdt-blocks.ts` file (`77` tests), targeted JS lint, and `git diff --check`. A fresh Playwright rerun was attempted again on `WP_ENV_PORT=9905`, but Docker still failed before WordPress boot with `all predefined address pools have been fully subnetted`; the active wp-env bridge networks had running containers attached, so pass 52 again avoided stopping unrelated environments. Pass 52 created a new stitched video with the attribute-cache proof card followed by the archived annotated headless UI repro.

Pass 53 added a counterexample to the tempting minimal fix. On current `origin/trunk`:

```text
02bfdaa5ca9 RTC: Fix divergence when two offline users reconnect (#77980)
```

the test-only commit `939fc6fca8c` fails four focused non-Playwright repros: the two stale top-level snapshot cases and both same-array-reference cases. A temporary minimal patch that only removed `serializableBlocksCache` made the same-array reorder and same-array attribute tests pass, but the stale top-level move cases still failed:

```text
FAIL preserves a remotely inserted block and the moved sibling after a stale top-level move
FAIL preserves an inserted heading and the moved sibling after checkpoint-style stale snapshots
PASS observes reordered blocks when the editor reuses the same block array reference
PASS observes attribute edits when the editor reuses the same block array reference
EXIT_CODE=1
```

That pass-53 negative experiment justifies the broader PR-branch fix on trunk: fresh serialization fixes same-reference editor mutations, but identity-aware stale-snapshot reconciliation is still needed for the top-level move failures. The known-fixes base check remains narrower: `3cba2b1e56a98787de08dc6c7df2434759e8f908` plus the same test commit still passes the stale-snapshot repros and fails only the same-array-reference reorder/attribute tests, so the source-manifest refresh remains unfixed by the known-fixes base.

The fixed PR branch `a6e6efc42e5` passed the full `packages/core-data/src/utils/test/crdt-blocks.ts` file (`77` tests), targeted JS lint, and `git diff --check`. A fresh Playwright run was attempted on `WP_ENV_PORT=9905`, but Docker again failed to create this task's wp-env network because all predefined address pools were fully subnetted. The active bridge networks had running containers attached, so pass 53 did not stop unrelated environments. Pass 53 created a new stitched video from the archived browser screenshots and the minimal-fix/test-only/fixed-branch evidence:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-53/video/a55350721046-pass53-annotated-evidence.mp4
```

## Fix Direction

Track the previous local block snapshot per `Y.Array`. Before applying a new local snapshot, compare its top-level clientId order with the previous local order:

- If the incoming snapshot has the same local order as before, but the CRDT array currently has a different order for those same blocks, treat the incoming snapshot as stale with respect to order and preserve the CRDT/current order.
- If the incoming snapshot changed local order, keep the existing merge behavior so intentional local moves still apply.
- If clientIds are missing, duplicated, or do not line up cleanly, fall back to the existing conservative merge path.
- Recompute the serializable block snapshot every call instead of using object identity as a cache key, so in-place or same-reference block-array reuse cannot hide a real reorder.

This targets the actual failure mode: an unchanged local snapshot should not reorder or rewrite blocks solely because it arrived after a remote insert or move.

## Audit Notes

Kernel-maintainer robustness: the detection is conservative and refuses ambiguous identity. It uses only unique `clientId`s already assigned by the block editor and falls back when identity is unclear.

Distributed-systems correctness: a stale local snapshot is not a causally newer order operation. The fix preserves the newer CRDT order when the local editor has not actually changed its top-level order since the last snapshot.

Simplicity/performance: the check is linear over top-level block arrays and avoids a general move-diff algorithm. It records one previous snapshot per `Y.Array`, and removes the old object-identity cache so in-place array reuse cannot hide real local reorders.

## Residual Risk

The fix covers unchanged stale local order after concurrent remote structural changes, including the inserted-heading/checkpoint variant added for this signature. Mixed operations that combine a real local reorder with content edits, insertions, or deletions in the same changed range still use the existing merge path and need separate coverage if fuzzing finds distinct failures there.
