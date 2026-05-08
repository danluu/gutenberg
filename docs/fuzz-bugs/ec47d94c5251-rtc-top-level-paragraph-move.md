# RTC top-level paragraph move can duplicate the moved paragraph and drop a sibling

Bug signature: `ec47d94c5251`

Bug type: `rtc_top_level_paragraph_move_duplicates_and_drops_sibling_after_delete_plus_add_before`

Transport: HTTP polling

## Summary

Two collaborators can diverge after a normal top-level edit sequence:

1. Start with a heading, an emoji/multibyte paragraph, and another paragraph.
2. User A deletes the heading through the block toolbar.
3. User B inserts a paragraph before the emoji paragraph through the block toolbar.
4. User A moves the emoji paragraph down with the toolbar move button.

The expected order is:

```text
Inserted paragraph
Another paragraph
Emoji paragraph
```

On the known-fixes base, User A reached that order, while User B ended with:

```text
Inserted paragraph
Emoji paragraph
Emoji paragraph
```

The bug is user-content loss plus duplication. It is not an assertion inversion: the sibling paragraph is absent from one editor and the moved paragraph is present twice.

## False-positive checks

The archived source run failed with exit code `1`, `timedOut: false`, and duration `46265ms`. The failure happened after all visible UI actions had completed, during the final convergence wait.

The Playwright trace records successful natural actions:

- click the seed heading;
- choose block toolbar `Options` then `Delete`;
- click the emoji paragraph in the collaborator editor;
- choose `Add before`;
- type `RTC ec47 realistic inserted paragraph 1`;
- click the emoji paragraph in the primary editor;
- click toolbar `Move down`.

The generated spec creates the initial post with normal serialized block HTML, then uses visible editor controls for every repro action. It does not inject malformed blocks, mutate editor state directly, or synthesize a block tree for the Playwright repro.

An independent rerun against `/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505` on port `9981` reproduced the same final states in `ec47-known-fixes-rerun/attempt-1.json`, so this is not only a stale artifact from the source shard.

## Low-level repro

The lowest useful repro is a `mergeCrdtBlocks()` test with two real `Y.Doc` instances:

1. Sync `[ heading, emoji, another ]`.
2. User A deletes the heading: `[ emoji, another ]`.
3. User B inserts before the block User A will later move: `[ inserted, emoji, another ]`.
4. User A observes the insert, then moves the emoji paragraph down: `[ inserted, another, emoji ]`.
5. User B emits the stale full snapshot it had before receiving the move: `[ inserted, emoji, another ]`.

Before the fix, the focused unit test at commit 1 fails with `received [ inserted, emoji, another ]` instead of `[ inserted, another, emoji ]`. The browser-level failure is worse because the stale snapshot path can also duplicate the moved block and drop the displaced sibling.

## Root cause

`mergeCrdtBlocks()` receives full block snapshots from each editor. The original merge code trims equal blocks on the left and right, then applies positional updates, deletes, and inserts to the middle of the Y.Array. It does not know whether an incoming full snapshot is a fresh local structural edit or a stale echo of an order the local editor already emitted earlier.

That distinction matters in this bug:

- the current CRDT order contains a remote insert and User A's later move;
- User B can still emit the previous local order after receiving the remote update;
- the positional merge interprets that stale full snapshot as authoritative local order;
- adjacent top-level block records are then rewritten by position rather than reconciled by identity.

There is a second contributing hazard: the old `serializableBlocksCache` was keyed by the block array object. If the editor reused the same array object after reordering its contents, the cache could hide the reorder from the CRDT merge layer.

## Origin analysis

The vulnerable top-level merge entered in:

```text
84019935998c16f877e976ad85e84748355d7282
2025-10-14 11:38:19 -0600
Improve CRDT "merge logic" for post entities (#72262)
```

That commit added `packages/core-data/src/utils/crdt-blocks.ts` and the initial left/right sweep update/delete/insert algorithm.

Later related commits improved test coverage or nested attribute handling but did not add stale full-snapshot order reconciliation:

```text
128a3c29b7f1db4f35faf9e326dd1e5e7ac11104
2026-02-25 15:17:47 -0700
Real-time collaboration: Expand mergeCrdtBlocks() automated testing (#75923)

a6bfd3e55432981c7c2cb09190ee77954530b1a5
2026-04-10 23:25:05 +0000
RTC: Improve array attribute stability when structural changes occur (#77164)

54af1ce400687f2ba51fee6c440207a07af5d55f
2026-05-04 21:54:48 -0700
RTC: Ensure that changes are only applied to text and cursors for their associated RichText instances.
```

`git blame -L 420,665 -- packages/core-data/src/utils/crdt-blocks.ts` still points the top-level snapshot cache, left/right sweep, positional update loop, deletes, inserts, and duplicate-clientId cleanup at the #72262 lineage, with later cursor and array-attribute changes layered around it. `gh` was not installed in the local environment, so PR metadata was taken from commit subjects and bodies.

## Fix plan

Initial plan: detect pure moves and encode them as CRDT structural reorders instead of positional record rewrites.

Revised plan: preserve current CRDT order only when the local editor is re-emitting the same relative clientId order as its previous local snapshot. If the local order really changed, let it through. If clientIds are missing, duplicated, or too disjoint to prove unchanged order, fall back to the existing merge path.

The patch:

- stores the previous serializable local block snapshot per `Y.Array`;
- compares previous, incoming local, and current CRDT clientId order;
- overlays local value changes onto blocks by clientId while preserving current CRDT order for unchanged stale echoes;
- rebases unrelated remote inserts by neighbor anchors;
- removes the object-identity `serializableBlocksCache`.

Robustness audit:

- Kernel-maintainer view: the change is localized to `mergeCrdtBlocks()` and guarded by unique clientId checks; ambiguous cases keep the prior behavior.
- Jepsen-style view: stale full snapshots no longer overwrite a causally newer CRDT order when they carry no local relative-order change.
- Simplicity/performance view: this is linear over the current block array and avoids adding LCS or a general move-operation protocol in a hot editor path.

## Pass 37 recheck

The branches were rebased onto `origin/trunk` after `384489f49ba` (`Fix flaky Menu test (#77972)`). The known-fixes HTTP environment could not be freshly started on the requested port because Docker reported `all predefined address pools have been fully subnetted`, so the Playwright negative check reused an already-running known-fixes HTTP test environment on port `9601`.

That known-fixes rerun still failed with the same product divergence: the primary editor converged to inserted paragraph, sibling paragraph, emoji paragraph, while the collaborator converged to inserted paragraph, emoji paragraph, emoji paragraph.

The rebased PR branch still passes the focused `mergeCrdtBlocks()` regression and the full `packages/core-data/src/utils/test/crdt-blocks.ts` file. A fixed Playwright rerun passed against an already-running fixed HTTP environment on port `9924`; the product source and built `core-data` bundle matched the PR branch for the files that exercise this defect.

Residual risk: this still reconciles full snapshots rather than first-class move operations. Concurrent move-vs-delete policy and malformed duplicate clientIds remain conservative fallback cases.

## Pass 38 recheck

Pass 38 independently re-read the source log, trace, screenshots, collaboration helper, CRDT merge code, and branch state. The source trace still shows only natural editor actions, and the screenshots plus `getNormalizedPostState()` output agree on the final divergence.

Fresh known-fixes browser startup on `WP_ENV_PORT=9912` was blocked before any test action by Docker network exhaustion: `all predefined address pools have been fully subnetted`. The source Playwright run and pass-37 rerun remain the browser-level negative evidence.

The pass-38 deterministic check created a temporary worktree at PR commit 2, before the fix, and ran the focused `mergeCrdtBlocks()` test. It failed with `[ inserted, emoji, another ]` instead of `[ inserted, another, emoji ]`. The same focused test and the full `packages/core-data/src/utils/test/crdt-blocks.ts` file passed on the fixed PR branch. JS lint and `git diff --check HEAD~3..HEAD` also passed. `origin/trunk` remained `384489f49bae7a3d5e7e96311e0adbfab5ad50af`, and both explanation and PR branches still have that commit as merge-base.

## Pass 39 recheck

Pass 39 narrowed the remaining root cause against the known-fixes base. That base already contains `24aa45777bb703ccf3931569dcd3b97c0cf57f64` (`Preserve saved content from stale editor snapshots`), which rebases remote top-level inserts/deletes when a later full snapshot carries a local structural edit. The archived HTTP failure still occurs on that base because the final bad packet is an unchanged-order stale echo: the collaborator re-emits `[ inserted, emoji, another ]` after receiving the newer CRDT order `[ inserted, another, emoji ]`. Since the relative local order did not change, the old known-fixes logic passes the stale array to the positional left/right sweep, which treats it as authoritative and reverts the newer move.

The PR fix closes that narrower gap by comparing previous, incoming, and current clientId order. When the incoming snapshot has the same relative order as the previous local snapshot, it preserves the current CRDT order and only overlays local value changes plus provably new local inserts. Ambiguous snapshots with missing or duplicate clientIds still fall back to the existing merge path.

Fresh pass-39 checks:

- `git blame origin/trunk -L 424,491 -- packages/core-data/src/utils/crdt-blocks.ts` still points the original top-level full-snapshot cache and positional left/right sweep at `84019935998c16f877e976ad85e84748355d7282` (`Improve CRDT "merge logic" for post entities (#72262)`), with later cursor/type changes layered around it.
- A fresh known-fixes Playwright rerun on `WP_ENV_PORT=9912` was blocked before any browser action by Docker network exhaustion while the test webServer tried to create `wp-env-gutenberg-rtc-known-fixes-refresh-20260505-test-67d46abf_default`.
- A new temporary worktree at PR commit 2 (`22c7bec3d22`) failed the focused unit repro with `[ inserted, emoji, another ]` instead of `[ inserted, another, emoji ]`.
- The fixed PR head passed the same focused repro, the full `packages/core-data/src/utils/test/crdt-blocks.ts` file, JS lint for all touched files, and `git diff --check HEAD~3..HEAD`.
- A pass-39 stitched video was regenerated under `fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-39/video/ec47d94c5251/`.

## Pass 40 recheck

Pass 40 found a sharper known-fixes negative control. The simple stale top-level move unit repro now passes on the known-fixes base because `a2c6ea3b19a10c90b79c7211463a2194773e3604` adds positional "unchanged from previous snapshot" guards. That does not close the browser bug by itself.

The known-fixes base still keeps `serializableBlocksCache` keyed by the incoming block array object. In a throwaway worktree at known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908`, cherry-picking only the PR branch's non-Playwright regression tests produced:

- `preserves a remotely inserted block and the moved sibling after a stale top-level move`: passed;
- `observes reordered blocks when the editor reuses the same block array reference`: failed, receiving `[ inserted, emoji, another ]` instead of `[ inserted, another, emoji ]`.

That is a narrower reason the archived HTTP run can still fail on the known-fixes base: a genuine editor reorder can be hidden before reconciliation if the editor reuses the same top-level block array reference. The PR fix removes the object-identity serialization cache and serializes every incoming snapshot before stale-order reconciliation, so the same focused cache/reorder repro passes on the PR branch.

Fresh pass-40 checks:

- `origin/trunk` remained `e7f55c1b4d23b3eaebde1288b258b0d1c3bce938`; the explanation and PR branches still fork from that commit.
- The PR branch passed the focused cache/reorder repro, the stale top-level move repro plus cache/reorder repro together, the full `packages/core-data/src/utils/test/crdt-blocks.ts` file, JS lint for all touched files, and `git diff --check HEAD~3..HEAD`.
- A fresh `.wp-env.test.json` Playwright run on `WP_ENV_PORT=9910` was blocked before browser actions by Docker network exhaustion: `all predefined address pools have been fully subnetted`.
- The existing pass-39 stitched video was revalidated with `ffprobe` and copied to the pass-40 artifact directory as the verified browser-level video.

## Pass 41 recheck

Pass 41 rebased both branches onto current `origin/trunk` at `02bfdaa5ca96deb050cd0c40bad1c1da75858caf` (`RTC: Fix divergence when two offline users reconnect (#77980)`). That new upstream commit only changes the HTTP polling sync server compaction path and a backport changelog file; it does not change `packages/core-data/src/utils/crdt-blocks.ts`.

The pass-41 negative control cherry-picked only the non-Playwright repro commit onto current `origin/trunk`, without the fix. The focused cache/reorder test still failed, receiving:

```text
[ inserted, emoji, another ]
```

instead of:

```text
[ inserted, another, emoji ]
```

The same focused test also still failed on known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908`, confirming the known-fixes base remains vulnerable to the old `serializableBlocksCache` object-identity hazard.

Fresh pass-41 fixed-branch checks:

- The rebased PR branch has the requested three-commit order: non-Playwright repros, natural-user Playwright repro, then fix.
- The built browser bundle already contains the fix (`build/scripts/core-data/index.js` includes `previousBlocksByYArray` and `reconcileStaleLocalBlocks`).
- The focused cache/reorder repro passed.
- The stale top-level move repro plus cache/reorder repro passed together.
- The full `packages/core-data/src/utils/test/crdt-blocks.ts` file passed (`76 passed`).
- JS lint for all touched files passed, and `git diff --check HEAD~3..HEAD` passed.
- A fresh headless Playwright run of `test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts` passed on `WP_ENV_PORT=9910`. The saved attempt JSON shows both editors converged to inserted paragraph, sibling paragraph, then emoji paragraph.
- The pass-40 stitched video was revalidated and copied to the pass-41 artifact directory as `ec47d94c5251-pass41-verified-stitched-repro.mp4`.

## Pass 42 recheck

Pass 42 re-read the archived HTTP result, source log, Playwright error context, trace actions, natural-user repro spec, CRDT merge code, and the existing explanation and PR branches. The source failure is still a real product divergence: all toolbar actions completed, the final convergence wait compared two materialized block trees, and the collaborator DOM snapshot shows the inserted paragraph followed by the emoji paragraph twice.

Fresh pass-42 checks confirmed the existing branches still satisfy the requested standard on `origin/trunk` `02bfdaa5ca96deb050cd0c40bad1c1da75858caf`:

- Cherry-picking only the non-Playwright repro commit onto current `origin/trunk` still fails the cache/reorder repro with `[ inserted, emoji, another ]` instead of `[ inserted, another, emoji ]`.
- Cherry-picking the same repro commit onto known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908` fails the same way, so the known-fixes base is still vulnerable.
- The PR branch still has the requested commit order: non-Playwright repros, natural-user Playwright repro, then fix.
- The fixed PR branch passes the full `packages/core-data/src/utils/test/crdt-blocks.ts` file (`76 passed`), JS lint for the touched files, and `git diff --check HEAD~3..HEAD`.
- A fresh headless Playwright run passed on `WP_ENV_PORT=9909`; the saved attempt JSON shows both editors converged to inserted paragraph, sibling paragraph, then emoji paragraph.
- A new pass-42 annotated H.264 stitched video was written as `ec47d94c5251-pass42-verified-stitched-repro.mp4`.

## Pass 43 recheck

Pass 43 added a dual low-level negative control. Cherry-picking only the non-Playwright repro commit onto current `origin/trunk` made both focused CRDT repros fail:

- the two-`Y.Doc` stale full-snapshot move repro received `[ inserted, emoji, another ]` instead of `[ inserted, another, emoji ]`;
- the same-array-reference reorder repro received `[ inserted, emoji, another ]` instead of `[ inserted, another, emoji ]`.

Running the same cherry-picked tests on known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908` showed the narrower remaining gap: the stale full-snapshot repro now passes there, but the same-array-reference reorder repro still fails. That independently supports the cache/reorder root cause for the archived HTTP failure.

The fixed PR branch still passes the full `packages/core-data/src/utils/test/crdt-blocks.ts` file, JS lint for the touched files, and `git diff --check HEAD~3..HEAD`. A fresh headless Playwright run on `WP_ENV_PORT=9908` with the natural toolbar sequence also passed; both editors converged to inserted paragraph, sibling paragraph, then emoji paragraph. The pass-43 video artifact is `ec47d94c5251-pass43-verified-stitched-repro.mp4`.

## Pass 44 recheck

Pass 44 isolated the remaining known-fixes failure to the serialization cache. In a temporary worktree at known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908`, cherry-picking only the non-Playwright repro commit still made the same-array-reference reorder test fail with:

```text
[ inserted, emoji, another ]
```

instead of:

```text
[ inserted, another, emoji ]
```

Applying only a temporary patch that removed `serializableBlocksCache` from that known-fixes worktree made the same focused test pass. That is a narrower root-cause proof for the remaining known-fixes gap: the stale `WeakMap` entry can hide an in-place editor reorder before the CRDT reconciliation code sees it. The PR fix removes that cache and serializes each incoming snapshot before stale-order reconciliation.

Fresh pass-44 fixed-branch checks:

- The PR branch still has the requested three-commit order: non-Playwright repros, natural-user Playwright repro, then fix.
- The fixed branch still passes the full `packages/core-data/src/utils/test/crdt-blocks.ts` file (`76 passed`).
- JS lint for the touched files passed, and `git diff --check HEAD~3..HEAD` passed.
- The built browser bundle contains `previousBlocksByYArray` and `reconcileStaleLocalBlocks`.
- Starting a new `.wp-env.test.json` browser environment on `WP_ENV_PORT=9907` was blocked before WordPress or browser actions by Docker network exhaustion: `all predefined address pools have been fully subnetted`.
- The pass-43 fixed Playwright output JSON and video were revalidated. Both saved editor states converge to inserted paragraph, sibling paragraph, then emoji paragraph. A pass-44 H.264 stitched video with the cache-proof annotation was written as `ec47d94c5251-pass44-cache-proof-stitched-repro.mp4`.

## Pass 45 recheck

Pass 45 verified that the existing branch, video standard, and fix still satisfy the requested bar, and added a fresh browser verification on the requested port.

Fresh pass-45 negative controls:

- Cherry-picking only the non-Playwright repro commit onto current `origin/trunk` `02bfdaa5ca96deb050cd0c40bad1c1da75858caf` made all three focused repros fail: the stale top-level paragraph move, the checkpoint-style heading variant, and the same-array-reference reorder.
- Cherry-picking the same repro commit onto known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908` passed the two stale-snapshot tests but still failed the same-array-reference reorder, receiving `[ inserted, emoji, another ]` instead of `[ inserted, another, emoji ]`. This confirms that known-fixes still lacks the cache-removal part of the PR fix.

Fresh pass-45 fixed-branch checks:

- The PR branch still has exactly the requested three commits: non-Playwright repros, natural-user Playwright repro, then fix.
- The two focused CRDT repros passed, and the full `packages/core-data/src/utils/test/crdt-blocks.ts` file passed (`76 passed`).
- JS lint for the touched files passed, `git diff --check HEAD~3..HEAD` passed, and the built browser bundle still contains `previousBlocksByYArray` and `reconcileStaleLocalBlocks` with no `serializableBlocksCache`.
- A fresh headless Playwright run passed on `WP_ENV_PORT=9907` using the natural toolbar sequence. A second traced run also passed; the saved attempt JSON shows both editors converged to inserted paragraph, sibling paragraph, then emoji paragraph.
- A pass-45 annotated H.264 video was generated from the successful traced headless run as `ec47d94c5251-pass45-traced-fixed-run.mp4`.

## Pass 46 recheck

Pass 46 added a narrower unit-level control for the remaining known-fixes gap. The non-Playwright repro commit now checks the same three-block reorder in two ways:

- a fresh block array reference, `[ inserted, another, emoji ]`, which passes on current trunk, known-fixes, and the fixed branch;
- an in-place mutation of the original block array from `[ inserted, emoji, another ]` to `[ inserted, another, emoji ]`, which still fails on current trunk and known-fixes but passes with the PR fix.

That separates a general top-level reorder from the object-identity cache hazard. On known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908`, the stale-snapshot paragraph move repro and the fresh-array reorder both pass, while the same-array-reference reorder still receives `[ inserted, emoji, another ]`. This confirms the known-fixes base still misses the cache-removal part of the fix.

Fresh pass-46 fixed-branch checks:

- The PR branch was rewritten back to exactly three commits: `1227c65fce4` non-Playwright repros, `0a61e09d2c7` natural-user Playwright repro, and `780321290fd` fix.
- The full `packages/core-data/src/utils/test/crdt-blocks.ts` file passed (`77 passed`).
- JS lint for the touched files passed, `git diff --check HEAD~3..HEAD` passed, and the built browser bundle contains `previousBlocksByYArray` and `reconcileStaleLocalBlocks` with no `serializableBlocksCache`.
- `wp-env` initially could not create another default Docker network because all predefined address pools were in use by active stacks. A dedicated project network was pre-created with subnet `10.254.47.0/24`, after which the requested `WP_ENV_PORT=9907` environment started without stopping other sessions.
- A fresh headless Playwright run passed on `WP_ENV_PORT=9907` using only the natural toolbar sequence. A second traced run also passed; both saved attempt JSON files show both editors converged to inserted paragraph, sibling paragraph, then emoji paragraph.
- A pass-46 annotated H.264 video was generated from the successful traced headless run as `ec47d94c5251-pass46-traced-fixed-run.mp4`.

## Pass 47 recheck

Pass 47 independently verified that the existing three-commit PR branch and video/fix standard still hold. The archived HTTP source run was re-read from `results.jsonl`, the failing log, the error-context DOM snapshot, and the natural-user Playwright spec. The source failure is still a product divergence after completed toolbar actions: one editor has inserted paragraph, sibling paragraph, emoji paragraph; the other has inserted paragraph, emoji paragraph, emoji paragraph.

Fresh pass-47 negative controls used clean temporary worktrees with only the non-Playwright repro commit cherry-picked:

- Current `origin/trunk` `02bfdaa5ca96deb050cd0c40bad1c1da75858caf` failed the stale top-level move repro and the same-array-reference reorder repro; the fresh-array reorder control passed.
- Known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908` passed the stale move repro and fresh-array reorder control, but still failed the same-array-reference reorder repro. That confirms the known-fixes base is not fixed for the object-identity `serializableBlocksCache` hazard.

The fixed PR branch still has exactly the requested commit order:

```text
1227c65fce4 Add RTC stale top-level move merge regressions
0a61e09d2c7 Add RTC top-level move Playwright repro
780321290fd Preserve RTC block order across stale snapshots
```

Fresh pass-47 fixed-branch checks passed:

- focused stale-move/cache-reorder CRDT repros (`3 passed`);
- full `packages/core-data/src/utils/test/crdt-blocks.ts` (`77 passed`);
- JS lint for all touched files;
- `git diff --check HEAD~3..HEAD`;
- built `build/scripts/core-data/index.js` contains `previousBlocksByYArray` and `reconcileStaleLocalBlocks`, with no `serializableBlocksCache`.

`gh` is not installed locally, but the GitHub connector confirmed that #72262 merged `84019935998c16f877e976ad85e84748355d7282` and introduced the recursive block CRDT merge design. It also confirmed #75923 and #77164 were later test/array-attribute work, and #77980 was an HTTP sync-server compaction fix rather than a change to `mergeCrdtBlocks()`.

A fresh headless traced Playwright run passed on the requested `WP_ENV_PORT=9907` after pre-creating the project Docker network with subnet `10.254.47.0/24` to avoid Docker address-pool exhaustion. The saved attempt JSON shows both editors converged to inserted paragraph, sibling paragraph, then emoji paragraph. A pass-47 annotated H.264 video was generated from the traced headless run as `ec47d94c5251-pass47-traced-fixed-run.mp4`.

## Pass 48 recheck

Pass 48 re-read the pass-47 summary, the source HTTP JSONL entry, the failing log, screenshots, error-context DOM snapshot, the natural-user Playwright spec, the existing explanation branch, the PR branch, and the relevant `mergeCrdtBlocks()` code. The source run remains a real product divergence: it exited with code `1`, did not time out, completed all toolbar actions, and failed only when the final convergence wait compared two materialized editor states. The failing screenshots and DOM snapshot show one editor at inserted paragraph, sibling paragraph, emoji paragraph, and the other at inserted paragraph, emoji paragraph, emoji paragraph.

Pass 48 added a cache-only root-cause proof on top of the existing controls. With only commit `1227c65fce4` cherry-picked:

- Current `origin/trunk` `02bfdaa5ca96deb050cd0c40bad1c1da75858caf` still fails the stale top-level move repro and the same-array-reference reorder repro; the fresh-array reorder control passes.
- Known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908` passes the stale top-level move repro and the fresh-array reorder control, but still fails the same-array-reference reorder repro.
- In a throwaway known-fixes worktree, applying only a tiny patch that removes `serializableBlocksCache` and calls `makeBlocksSerializable( incomingBlocks )` on each merge makes all three focused tests pass.

That isolates the remaining known-fixes gap to the object-identity serialization cache: the known-fixes branch already handles the stale full-snapshot order case, but an in-place editor reorder can still be hidden before reconciliation sees it. The PR fix removes that cache and keeps the stale-snapshot reconciliation.

Fresh pass-48 fixed-branch checks passed:

- focused stale-move/cache-reorder CRDT repros (`3 passed`);
- full `packages/core-data/src/utils/test/crdt-blocks.ts` (`77 passed`);
- JS lint for all touched files;
- `git diff --check HEAD~3..HEAD`;
- built `build/scripts/core-data/index.js` contains `previousBlocksByYArray` and `reconcileStaleLocalBlocks`, with no `serializableBlocksCache`;
- fresh headless Playwright run on `WP_ENV_PORT=9907` using the natural toolbar sequence. The saved attempt JSON shows both editors converged to inserted paragraph, sibling paragraph, then emoji paragraph.

`wp-env` initially failed to create the project Docker network because Docker had no remaining predefined address pools. Pre-creating `wp-env-gutenberg-bug-ec47d94c5251-pr-test-87b55580_default` with subnet `10.254.48.0/24` allowed the requested port environment to start. The environment was stopped after the run.

The pass-48 annotated H.264 trace video was generated as `ec47d94c5251-pass48-traced-fixed-run.mp4`.

## Pass 49 recheck

Pass 49 re-read the pass-48 summary, source HTTP JSONL row, failing log, screenshots, error-context DOM snapshot, trace manifest, natural-user Playwright spec, explanation branch, PR branch, and the current CRDT merge code. The source failure remains a product divergence rather than a readiness wait or locator issue: all toolbar actions completed, the run exited with code `1` without timing out, and the final convergence wait compared two materialized editor states. The collaborator-side screenshot and DOM snapshot still show the inserted paragraph followed by the emoji paragraph twice, with the sibling paragraph absent.

Pass 49 added an instrumented known-fixes proof for the remaining cache gap. In a temporary worktree at known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only the non-Playwright repro commit cherry-picked, a temporary log in `mergeCrdtBlocks()` reported:

```text
PASS49_CACHE_STALE incoming=inserted,another,emoji cached=inserted,emoji,another
```

The same focused test then failed with the stale order, receiving `[ inserted, emoji, another ]` instead of `[ inserted, another, emoji ]`. That directly shows the object-identity `serializableBlocksCache` returning a stale serialized snapshot after the live block array has been reordered in place.

A fresh known-fixes negative control without instrumentation confirmed the same shape:

- stale full-snapshot paragraph move repro: passed;
- fresh-array reorder control: passed;
- same-array-reference reorder repro: failed with `[ inserted, emoji, another ]`.

Fresh pass-49 fixed-branch checks passed:

- focused stale-move/cache-reorder CRDT repros (`3 passed`);
- full `packages/core-data/src/utils/test/crdt-blocks.ts` (`77 passed`);
- JS lint for all touched files;
- `git diff --check HEAD~3..HEAD`;
- built `build/scripts/core-data/index.js` contains `previousBlocksByYArray` and `reconcileStaleLocalBlocks`, with no `serializableBlocksCache`;
- fresh headless Playwright run on `WP_ENV_PORT=9907` using the natural toolbar sequence. The saved attempt JSON shows both editors converged to inserted paragraph, sibling paragraph, then emoji paragraph.

`wp-env` again initially failed to create the project Docker network because Docker had no remaining predefined address pools. Pre-creating `wp-env-gutenberg-bug-ec47d94c5251-pr-test-87b55580_default` with subnet `10.254.49.0/24` allowed the requested port environment to start. The environment was stopped after the run.

The pass-49 annotated H.264 trace video was generated as `ec47d94c5251-pass49-traced-fixed-run.mp4`.

## Pass 50 recheck

Pass 50 independently re-read the pass-49 summary, source HTTP JSONL row, failing log, error-context DOM snapshot, natural-user Playwright spec, the explanation branch, the three-commit PR branch, and the current `mergeCrdtBlocks()` fix. The source failure still classifies as a product bug: the archived run exited with code `1`, did not time out, completed the visible toolbar actions, and failed only when the final convergence wait compared two materialized editor states. The collaborator DOM snapshot still shows inserted paragraph, emoji paragraph, emoji paragraph, with the sibling paragraph absent.

Fresh pass-50 negative controls:

- Current `origin/trunk` `02bfdaa5ca96deb050cd0c40bad1c1da75858caf`, with only non-Playwright repro commit `1227c65fce4` cherry-picked, failed the stale full-snapshot move repro and the same-array-reference reorder repro; the fresh-array reorder control passed.
- Known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908`, with the same test-only cherry-pick, passed the stale full-snapshot move repro and the fresh-array reorder control but still failed the same-array-reference reorder repro, receiving `[ inserted, emoji, another ]` instead of `[ inserted, another, emoji ]`.

That confirms the previous narrower root cause without relying on the pass-49 instrumentation: current trunk is vulnerable to both the stale-snapshot and cache-hidden-reorder paths; known-fixes closes the stale-snapshot path but still leaves the object-identity `serializableBlocksCache` gap.

Fresh pass-50 fixed-branch checks passed:

- focused stale-move/cache-reorder CRDT repros (`3 passed`);
- full `packages/core-data/src/utils/test/crdt-blocks.ts` (`77 passed`);
- JS lint for all touched files;
- `git diff --check HEAD~3..HEAD`;
- built `build/scripts/core-data/index.js` contains `previousBlocksByYArray` and `reconcileStaleLocalBlocks`, with no `serializableBlocksCache`;
- fresh headless Playwright run on `WP_ENV_PORT=9907` using the natural toolbar sequence. The saved attempt JSON shows both editors converged to inserted paragraph, sibling paragraph, then emoji paragraph.

`wp-env` initially failed to create the project Docker network because Docker had no remaining predefined address pools. Pre-creating `wp-env-gutenberg-bug-ec47d94c5251-pr-test-87b55580_default` with subnet `10.254.50.0/24` allowed the requested port environment to start. The environment was stopped after the run, and the project network was gone afterward.

Full `npm run build` was also attempted after the targeted checks. The JS and PHP build steps completed, but the production build failed during `packages/theme/bin/generate-primitive-tokens/index.ts` with `TypeError: [object Object] is not a valid color space` from `colorjs.io`. The failure did not leave generated-file changes in the PR worktree and is outside the RTC files changed by this branch.

The pass-50 annotated H.264 trace video was generated as `ec47d94c5251-pass50-fixed-headless-annotated-final.mp4`.

## Pass 51 recheck

Pass 51 re-read the pass-50 summary, source HTTP JSONL row, failing log, error-context DOM snapshot, natural-user Playwright spec, explanation branch, PR branch, and the current CRDT merge code. The source run still classifies as a product bug: it exited with code `1`, did not time out, completed the visible toolbar actions, and failed only when the final convergence wait compared materialized editor states. The failing collaborator DOM still shows inserted paragraph, emoji paragraph, emoji paragraph, with the sibling paragraph absent.

Fresh pass-51 negative controls:

- Current `origin/trunk` `02bfdaa5ca96deb050cd0c40bad1c1da75858caf`, with only non-Playwright repro commit `1227c65fce4` cherry-picked, failed the stale full-snapshot move repro and the same-array-reference reorder repro; the fresh-array reorder control passed.
- Known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908`, with the same test-only cherry-pick, passed the stale full-snapshot move repro and the fresh-array reorder control but still failed the same-array-reference reorder repro, receiving `[ inserted, emoji, another ]` instead of `[ inserted, another, emoji ]`.

Pass 51 added a cache-only proof in the known-fixes temp worktree. After the known-fixes same-array-reference test failed, a temporary product patch removed only `serializableBlocksCache` and changed `mergeCrdtBlocks()` to call `makeBlocksSerializable( incomingBlocks )` for each merge. With that cache-only patch, the same focused test passed. This confirms the remaining known-fixes gap is specifically the object-identity serialization cache hiding in-place editor reorders before stale-snapshot reconciliation sees them.

Fresh pass-51 fixed-branch checks passed:

- focused stale-move/cache-reorder CRDT repros (`3 passed`);
- full `packages/core-data/src/utils/test/crdt-blocks.ts` (`77 passed`);
- JS lint for all touched files;
- `git diff --check HEAD~3..HEAD`;
- existing fixed Playwright attempt JSON from the PR branch trace still shows both editors converged to inserted paragraph, sibling paragraph, then emoji paragraph;
- existing pass-50 video metadata was verified, and a pass-51 annotated H.264 video was regenerated from that fixed headless trace as `ec47d94c5251-pass51-fixed-headless-annotated-final.mp4`.

The PR branch still has exactly the requested commit order:

```text
1227c65fce4 Add RTC stale top-level move merge regressions
0a61e09d2c7 Add RTC top-level move Playwright repro
780321290fd Preserve RTC block order across stale snapshots
```

The pass-51 worktree did not have a root `build/` directory, and a fresh `wp-build --help` probe invoked the build path and failed before bundling `core-data` because the shared checkout is missing `wasm-vips`, `wasm-vips/vips.wasm`, and `wasm-vips/vips-heif.wasm`. Since no fixed browser bundle could be freshly produced from that state, pass 51 used the already captured fixed PR-branch headless trace for video verification and did not run a new Playwright browser session.

## Pass 52 recheck

Pass 52 independently re-read the pass-51 summary, source HTTP JSONL row, failing log, screenshots, error-context DOM snapshot, natural-user Playwright spec, explanation branch, PR branch, current `mergeCrdtBlocks()` code, and GitHub PR metadata for #72262, #75923, #77164, and #77980. The archived source failure remains a product divergence: the run exited with code `1`, did not time out, all visible toolbar actions completed, and the final convergence wait compared real editor states where one editor had inserted paragraph, sibling paragraph, emoji paragraph, while the collaborator had inserted paragraph, emoji paragraph, emoji paragraph.

Fresh pass-52 negative controls used new temporary worktrees with only non-Playwright repro commit `1227c65fce4` cherry-picked:

- Current `origin/trunk` `02bfdaa5ca96deb050cd0c40bad1c1da75858caf` failed the stale full-snapshot move repro and the same-array-reference reorder repro; the fresh-array reorder control passed.
- Known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908` passed the stale full-snapshot move repro and fresh-array reorder control, but still failed the same-array-reference reorder repro, receiving `[ inserted, emoji, another ]` instead of `[ inserted, another, emoji ]`.

Fresh pass-52 fixed-branch checks passed:

- focused stale-move/cache-reorder CRDT repros (`3 passed`);
- full `packages/core-data/src/utils/test/crdt-blocks.ts` (`77 passed`);
- JS lint for all touched files;
- `git diff --check HEAD~3..HEAD`;
- PR branch commit order remains non-Playwright repros, natural-user Playwright repro, then fix.

The requested `WP_ENV_PORT=9907` test environment was checked first and was stopped. A fresh browser run was not feasible from this worktree because the root `build/` directory is absent and fresh build attempts failed before producing a fixed browser bundle: `wp-build` cannot resolve `wasm-vips`, `wasm-vips/vips.wasm`, and `wasm-vips/vips-heif.wasm`, and the root build also fails in `packages/theme/bin/generate-primitive-tokens/index.ts` with `TypeError: [object Object] is not a valid color space` from `colorjs.io`.

Pass 52 therefore revalidated the existing fixed PR-branch attempt JSON, which shows both editors converged to inserted paragraph, sibling paragraph, then emoji paragraph, and generated a new annotated H.264 stitched video from the existing fixed headless trace:

```text
ec47d94c5251-pass52-fixed-headless-annotated.mp4
```

## Pass 53 recheck

Pass 53 re-read the pass-52 summary, source HTTP JSONL row, failing log, screenshots, error-context DOM snapshot, trace action/state data, natural-user Playwright spec, explanation branch, PR branch, current `mergeCrdtBlocks()` code, and GitHub PR metadata for #72262, #75923, #77164, and #77980. The source failure remains a real product divergence: the run exited with code `1`, did not time out, completed the visible editor actions, and failed only when final convergence compared real editor states. The failing screenshots and DOM snapshot still show one editor at inserted paragraph, sibling paragraph, emoji paragraph and the collaborator at inserted paragraph, emoji paragraph, emoji paragraph.

Pass 53 added a fresh cache-only proof for the remaining known-fixes gap. With only non-Playwright repro commit `1227c65fce4` cherry-picked:

- current `origin/trunk` `02bfdaa5ca96deb050cd0c40bad1c1da75858caf` failed the stale full-snapshot move repro and the same-array-reference reorder repro; the fresh-array reorder control passed;
- known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908` passed the stale full-snapshot move repro and fresh-array reorder control, but still failed the same-array-reference reorder repro with `[ inserted, emoji, another ]` instead of `[ inserted, another, emoji ]`;
- applying only a temporary known-fixes patch that removes `serializableBlocksCache` and calls `makeBlocksSerializable( incomingBlocks )` on every merge makes all three focused repros pass.

That narrows the unresolved known-fixes defect to the object-identity serialization cache. Known-fixes already has stale full-snapshot order reconciliation, but a normal editor reorder can still be hidden if the editor mutates and reuses the same top-level block array object. The PR fix removes that cache and keeps the stale-snapshot reconciliation.

Fresh pass-53 fixed-branch checks passed:

- focused stale-move/cache-reorder CRDT repros (`3 passed`);
- full `packages/core-data/src/utils/test/crdt-blocks.ts` (`77 passed`);
- JS lint for all touched files;
- `git diff --check HEAD~3..HEAD`;
- PR branch commit order remains non-Playwright repros, natural-user Playwright repro, then fix.

Pass 53 checked this PR worktree first: it has the shared `node_modules` symlink and `vendor`, but no root `build/` directory, and `npm run wp-env status` reports `Environment not initialized`. A fresh browser run from this worktree would not honestly exercise the fixed browser bundle without first producing a new build, which remains blocked by the build failures recorded in pass 52. Pass 53 therefore generated a new annotated H.264 video from the existing successful fixed headless trace, with both editor panes and the pass-53 cache proof in the overlay:

```text
ec47d94c5251-pass53-fixed-headless-cache-proof.mp4
```

## Pass 54 recheck

Pass 54 independently re-read the pass-53 summary, source HTTP JSONL row, failing log, screenshots, error-context DOM snapshot, trace manifest, natural-user Playwright spec, explanation branch, PR branch, current `mergeCrdtBlocks()` fix, and GitHub metadata for #72262 and #77980. The source failure still classifies as a product bug: the run exited with code `1`, did not time out, completed the visible toolbar actions, and failed only when the final convergence wait compared materialized editor states. The primary editor had inserted paragraph, sibling paragraph, emoji paragraph, while the collaborator had inserted paragraph, emoji paragraph, emoji paragraph.

Fresh pass-54 negative controls used new temporary worktrees with only non-Playwright repro commit `1227c65fce4` cherry-picked:

- Current `origin/trunk` `02bfdaa5ca96deb050cd0c40bad1c1da75858caf` failed the stale full-snapshot move repro and the same-array-reference reorder repro; the fresh-array reorder control passed.
- Known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908` passed the stale full-snapshot move repro and fresh-array reorder control, but still failed the same-array-reference reorder repro, receiving `[ inserted, emoji, another ]` instead of `[ inserted, another, emoji ]`.

Pass 54 therefore verifies, rather than revises, the existing three-commit PR branch:

```text
1227c65fce4 Add RTC stale top-level move merge regressions
0a61e09d2c7 Add RTC top-level move Playwright repro
780321290fd Preserve RTC block order across stale snapshots
```

Fresh pass-54 fixed-branch checks passed:

- focused stale-move/cache-reorder CRDT repros (`3 passed`);
- full `packages/core-data/src/utils/test/crdt-blocks.ts` (`77 passed`);
- JS lint for all touched files;
- `git diff --check HEAD~3..HEAD`;
- remote `danluu` explanation and PR branches already matched the local heads, and push was a no-op.

Pass 54 checked the requested `WP_ENV_PORT=9907` environment first; `wp-env` reported `Environment not initialized`. This PR worktree still has no root `build/`, `packages/core-data/build`, or `packages/core-data/build-module`, so a fresh browser run from this worktree would not honestly exercise the fixed bundle without rebuilding. Pass 54 therefore verified the existing annotated headless video artifact and copied it to the pass-54 artifact directory. Metadata: H.264, 1600x720, 8 fps, 17.0 seconds, 322913 bytes.

```text
ec47d94c5251-pass54-fixed-headless-cache-proof.mp4
```

## Pass 55 recheck

Pass 55 re-read the pass-54 summary, archived source JSONL row, failing log, error-context DOM snapshot, trace action/state data, natural-user Playwright spec, explanation branch, PR branch, and current `mergeCrdtBlocks()` implementation. The source failure remains a real product divergence: all toolbar actions completed before the final convergence wait, and repeated trace state reads stayed split between inserted paragraph, sibling paragraph, emoji paragraph and inserted paragraph, emoji paragraph, emoji paragraph.

Pass 55 added a two-axis cache/stale-snapshot decomposition:

- Current `origin/trunk` `02bfdaa5ca96deb050cd0c40bad1c1da75858caf`, with only non-Playwright repro commit `1227c65fce4` cherry-picked, failed the stale full-snapshot move repro and same-array-reference reorder repro, while the fresh-array reorder control passed.
- Applying only a temporary cache-removal patch to that trunk control fixed the same-array-reference reorder repro, but the stale full-snapshot move repro still failed. Cache removal alone is not sufficient on trunk.
- Known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only the same repro commit cherry-picked, passed the stale full-snapshot move repro and fresh-array reorder control, but still failed the same-array-reference reorder repro.
- Applying only the same temporary cache-removal patch to that known-fixes control made all three focused repros pass. The remaining known-fixes gap is specifically the object-identity serialization cache.

Fresh pass-55 fixed-branch checks passed:

- focused stale-move/cache-reorder CRDT repros (`3 passed`);
- full `packages/core-data/src/utils/test/crdt-blocks.ts` (`77 passed`);
- JS lint for all touched files;
- `git diff --check HEAD~3..HEAD`;
- PR branch commit order remains non-Playwright repros, natural-user Playwright repro, then fix.

Pass 55 checked the requested PR worktree environment first: `wp-env` reported `Environment not initialized`, and the worktree still has no root `build/`, `packages/core-data/build`, or `packages/core-data/build-module`. A fresh browser run from this worktree would not honestly exercise the fixed browser bundle without rebuilding. The existing annotated H.264 headless video was revalidated and copied to the pass-55 artifact directory:

```text
ec47d94c5251-pass55-fixed-headless-cache-proof.mp4
```

## Pass 56 recheck

Pass 56 independently re-read the pass-55 summary, archived HTTP result row, failing log, error-context DOM snapshot, screenshots, trace actions, natural-user Playwright spec, explanation branch, PR branch, and the current `mergeCrdtBlocks()` implementation. The source failure still classifies as a product bug: the run exited with code `1`, did not time out, completed the toolbar `Delete`, `Add before`, text entry, and `Move down` actions, then failed only when the final convergence wait compared real editor states.

Pass 56 added a commit-boundary and base-boundary verification of the existing branch:

- `HEAD~1` of the PR branch, which has the non-Playwright repros and Playwright repro but not the final fix, fails the stale full-snapshot move repro and same-array-reference reorder repro; the fresh-array reorder control passes.
- Current `origin/trunk` `02bfdaa5ca96deb050cd0c40bad1c1da75858caf`, with only non-Playwright repro commit `1227c65fce4` cherry-picked, has the same failure pattern.
- Known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only the same repro commit cherry-picked, passes the stale full-snapshot move repro and fresh-array reorder control, but still fails the same-array-reference reorder repro.

That verifies the existing PR branch still satisfies the requested standard: commit 1 carries the low-level repros, commit 2 carries the natural-user Playwright repro, and commit 3 supplies the cache removal plus stale-snapshot reconciliation needed to make the focused failures pass.

Fresh pass-56 fixed-branch checks passed:

- focused stale-move/cache-reorder CRDT repros (`3 passed`);
- full `packages/core-data/src/utils/test/crdt-blocks.ts` (`77 passed`);
- JS lint for all touched files;
- `git diff --check HEAD~3..HEAD`.

The PR worktree still has `node_modules` and `vendor`, but no fixed root `build/`. `wp-env` reports `Environment not initialized`. A fresh browser run from this worktree would not honestly exercise the fixed browser bundle without rebuilding, and a direct `wp-build --help` probe attempted to build packages and failed before bundling because `wasm-vips`, `wasm-vips/vips.wasm`, and `wasm-vips/vips-heif.wasm` are not resolvable in the shared dependency tree. Pass 56 therefore revalidated the existing annotated H.264 headless video and copied it to the pass-56 artifact directory:

```text
ec47d94c5251-pass56-fixed-headless-cache-proof.mp4
```

## Pass 57 recheck

Pass 57 re-read the pass-56 summary, archived HTTP result row, source spec, failing log, screenshots, error-context DOM snapshot, trace actions, explanation branch, PR branch, and the current `mergeCrdtBlocks()` implementation. The source failure still classifies as a real product divergence: the test exited `1` without timing out, all toolbar actions completed, and the final convergence wait compared materialized editor states split between inserted paragraph, sibling paragraph, emoji paragraph and inserted paragraph, emoji paragraph, emoji paragraph.

Fresh `git fetch origin trunk` left `origin/trunk` at `02bfdaa5ca96deb050cd0c40bad1c1da75858caf`, with the PR branch still exactly three commits ahead:

```text
1227c65fce4 Add RTC stale top-level move merge regressions
0a61e09d2c7 Add RTC top-level move Playwright repro
780321290fd Preserve RTC block order across stale snapshots
```

Pass 57 adds a fresh commit/base-boundary verification of the existing fix:

- PR branch `HEAD~1` (`0a61e09d2c7`) fails the stale full-snapshot move repro and same-array-reference reorder repro; the fresh-array reorder control passes.
- Current `origin/trunk`, with only repro commit `1227c65fce4` cherry-picked, fails the same two repros; the fresh-array reorder control passes.
- Known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only the same repro commit cherry-picked, passes the stale full-snapshot move repro and fresh-array reorder control, but still fails the same-array-reference reorder repro.
- Fixed PR head passes all three focused repros.

This independently reconfirms the existing root-cause split: trunk still has both the stale full-snapshot positional-merge bug and the same-array serialization-cache bug; known-fixes already fixed the stale-snapshot part but still misses the object-identity cache hazard; the PR fix removes that cache and keeps stale-snapshot order reconciliation.

Fresh pass-57 fixed-branch checks passed:

- focused stale-move/cache-reorder CRDT repros (`3 passed`);
- full `packages/core-data/src/utils/test/crdt-blocks.ts` (`77 passed`);
- JS lint for all touched files;
- `git diff --check HEAD~3..HEAD`;
- remote `danluu` explanation and PR branches point at the expected heads.

The PR worktree still has no fixed root `build/`, `packages/core-data/build`, or `packages/core-data/build-module`, and `wp-env` reports `Environment not initialized`. A fresh browser run from this worktree would not honestly exercise the fixed bundle without rebuilding. Pass 57 therefore verified the existing annotated H.264 headless video and copied it to the pass-57 artifact directory. Metadata: H.264, 1600x720, 8 fps, 17.0 seconds, 322913 bytes.

```text
ec47d94c5251-pass57-fixed-headless-cache-proof.mp4
```

## Pass 58 recheck

Pass 58 re-read the pass-57 summary, archived HTTP result row, source spec, failing log, screenshots, error-context DOM snapshot, trace actions, explanation branch, PR branch, and the current CRDT merge code. The archived source failure still classifies as a real product divergence: all toolbar actions completed before the final convergence wait, and the collaborator materialized the inserted paragraph followed by the emoji paragraph twice while dropping the sibling paragraph.

`origin/trunk` advanced to `0742e801c4e12ee31316faa1f8ed9be11a4782c7` (`Media editor: replace fine-rotation slider with RotationRuler (#77906)`). The PR branch was rebuilt on that base with the same requested three-commit shape:

```text
7f009511543 Add RTC stale top-level move merge regressions
5e5e47acb7b Add RTC top-level move Playwright repro
37452c56a6a Preserve RTC block order across stale snapshots
```

Pass 58 adds a narrower non-Playwright proof in the first commit: `preserves the moved sibling when a same-array move follows a remote insert echo`. It models the editor echoing a remote insert, then reusing the same top-level block array object for the subsequent toolbar-style move. That repro fails before the fix with `[ inserted, emoji, another ]`, which directly exercises the remaining object-identity serialization-cache hazard.

Fresh pass-58 negative controls:

- PR branch `HEAD~2` (`7f009511543`), on current trunk but without the fix, failed the stale full-snapshot move repro, same-array-reference reorder repro, and the new remote-insert-echo same-array repro.
- Known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only `7f009511543` cherry-picked, passed the stale full-snapshot move repro but failed the same-array-reference reorder repro and the new remote-insert-echo same-array repro.

Fresh pass-58 fixed-branch checks passed:

- focused stale/cache/remote-insert-echo CRDT repros (`3 passed`);
- full `packages/core-data/src/utils/test/crdt-blocks.ts` (`78 passed`);
- JS lint for all touched files;
- `git diff --check origin/trunk..HEAD`.

The requested `WP_ENV_PORT=9906` browser rerun could not start because Docker reported `all predefined address pools have been fully subnetted`. A full repo build is also blocked by unrelated current build issues in `theme` token generation and `vips` resolution. For artifact verification, pass 58 copied the known-fixes built plugin assets, rebuilt only the `core-data` browser bundle from the fixed branch, and verified `build/scripts/core-data/index.js` contains `previousBlocksByYArray` and `reconcileStaleLocalBlocks`. The existing stitched headless browser video was re-encoded with a pass-58 overlay and copied to:

```text
ec47d94c5251-pass58-fixed-headless-cache-proof.mp4
```

## Pass 59 recheck

Pass 59 independently re-read the pass-58 summary, archived HTTP result row, generated natural-user Playwright spec, failing log, screenshots, error-context DOM snapshot, trace action/state data, current explanation branch, PR branch, known-fixes base, and `mergeCrdtBlocks()` implementation. The source failure remains a real product divergence: the run exited `1`, did not time out, completed the toolbar `Delete`, toolbar `Add before`, text entry, and toolbar `Move down` actions, then failed only while comparing real editor states. The two screenshots and DOM snapshot still agree with the serialized-state failure: one editor has inserted paragraph, sibling paragraph, emoji paragraph, while the collaborator has inserted paragraph, emoji paragraph, emoji paragraph.

Pass 59 verifies the existing branch/video/fix still satisfy the requested standard on current `origin/trunk`:

```text
0742e801c4e12ee31316faa1f8ed9be11a4782c7
```

The PR branch remains exactly three commits ahead of that base:

```text
7f009511543 Add RTC stale top-level move merge regressions
5e5e47acb7b Add RTC top-level move Playwright repro
37452c56a6a Preserve RTC block order across stale snapshots
```

Fresh pass-59 controls:

- PR branch `HEAD~2` (`7f009511543`), before the fix but with the non-Playwright repros, fails all three focused repros: stale full-snapshot move, same-array-reference reorder, and same-array move after remote insert echo.
- Known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only `7f009511543` cherry-picked, passes the stale full-snapshot move repro but fails the same-array-reference reorder and same-array move after remote insert echo repros.
- Fixed PR head passes all three focused repros and the full `packages/core-data/src/utils/test/crdt-blocks.ts` file (`78 passed`).

That reconfirms the narrow root-cause split: current trunk still has the stale full-snapshot order bug and cache bug; known-fixes already handles stale full snapshots but still has `serializableBlocksCache`; the PR fix removes the object-identity cache and keeps per-`Y.Array` previous-snapshot reconciliation.

Fresh pass-59 fixed-branch checks passed:

- focused stale/cache/remote-insert-echo CRDT repros (`3 passed`);
- full `packages/core-data/src/utils/test/crdt-blocks.ts` (`78 passed`);
- JS lint for all touched files;
- `git diff --check origin/trunk..HEAD`;
- built `build/scripts/core-data/index.js` contains `previousBlocksByYArray` and `reconcileStaleLocalBlocks` and no `serializableBlocksCache` hit.

The requested `WP_ENV_PORT=9906` browser rerun was attempted after `wp-env status` reported the PR worktree environment was uninitialized, but Docker again refused to create the compose network with `all predefined address pools have been fully subnetted`. Pass 59 therefore revalidated the existing stitched headless browser artifact and created a pass-59 annotated H.264 copy:

```text
ec47d94c5251-pass59-fixed-headless-cache-proof.mp4
```

## Pass 60 recheck

Pass 60 independently re-read the pass-59 summary, archived HTTP source row, generated natural-user Playwright spec, failing log, error-context DOM snapshot, trace actions, current explanation branch, PR branch, known-fixes base, and the current `mergeCrdtBlocks()` implementation. The archived source failure still classifies as a product bug: all visible toolbar actions completed, the run exited `1` without timing out, and the final convergence wait compared materialized editor states split between inserted paragraph, sibling paragraph, emoji paragraph and inserted paragraph, emoji paragraph, emoji paragraph.

Fresh pass-60 branch verification:

- `origin/trunk` remained `0742e801c4e12ee31316faa1f8ed9be11a4782c7`.
- The PR branch remained exactly three commits ahead: `7f009511543` non-Playwright repros, `5e5e47acb7b` natural-user Playwright repro, and `37452c56a6a` fix.
- The built browser bundle contains `previousBlocksByYArray` and `reconcileStaleLocalBlocks`, and does not contain `serializableBlocksCache`.
- Fixed PR head passed the three focused CRDT repros, the full `packages/core-data/src/utils/test/crdt-blocks.ts` file (`78 passed`), JS lint for the touched files, and `git diff --check origin/trunk..HEAD`.

Fresh pass-60 negative controls:

- Current `origin/trunk`, with only repro commit `7f009511543` cherry-picked, failed all three focused repros: stale full-snapshot move, same-array-reference reorder, and same-array move after remote insert echo.
- Known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only `7f009511543` cherry-picked, passed the stale full-snapshot move repro but failed the same-array-reference reorder and same-array move after remote insert echo repros.

Pass 60 also queried GitHub PR metadata directly. #72262 merged as `84019935998c16f877e976ad85e84748355d7282` on 2025-10-14 and introduced the recursive post/block CRDT merge logic. #75923 and #77164 were later merge test and array-attribute improvements. #77980 merged `02bfdaa5ca96deb050cd0c40bad1c1da75858caf` and fixes HTTP sync-server compaction on reconnect; it does not change the `mergeCrdtBlocks()` product merge path for this bug.

The requested `WP_ENV_PORT=9906` browser rerun was attempted. `wp-env status` reported the environment was uninitialized. `wp-env start` failed before WordPress or browser startup because Docker could not allocate a compose network: `all predefined address pools have been fully subnetted`. A manually pre-created network on `10.254.60.0/24` was rejected or discarded by Docker Compose because it did not match the generated compose config labels, so no fresh Playwright browser run was possible in pass 60.

Pass 60 revalidated the pass-59 headless browser artifact and wrote an annotated H.264 copy:

```text
ec47d94c5251-pass60-fixed-headless-cache-proof.mp4
```

## Pass 61 recheck

Pass 61 independently re-read the pass-60 summary, archived HTTP source row, generated natural-user Playwright spec, failing log, error-context DOM snapshot, trace actions, current explanation branch, PR branch, known-fixes base, and the current `mergeCrdtBlocks()` implementation. The source failure remains a real product bug: the run exited `1`, did not time out, completed toolbar `Delete`, toolbar `Add before`, text entry, and toolbar `Move down`, then failed only while comparing materialized editor states. The collaborator DOM still shows inserted paragraph, emoji paragraph, emoji paragraph, with the sibling paragraph absent.

Fresh pass-61 verification confirms the existing branch/video/fix still satisfy the requested standard on current `origin/trunk`:

```text
0742e801c4e12ee31316faa1f8ed9be11a4782c7
```

The PR branch remains exactly three commits ahead of that base:

```text
7f009511543 Add RTC stale top-level move merge regressions
5e5e47acb7b Add RTC top-level move Playwright repro
37452c56a6a Preserve RTC block order across stale snapshots
```

Fresh pass-61 fixed-branch checks passed:

- four focused CRDT repros passed: stale full-snapshot move, fresh-array reorder, same-array-reference reorder, and same-array move after remote insert echo;
- the full `packages/core-data/src/utils/test/crdt-blocks.ts` file passed (`78 passed`);
- JS lint for the touched files passed;
- `git diff --check origin/trunk..HEAD` passed;
- `build/scripts/core-data/index.js` contains `previousBlocksByYArray` and `reconcileStaleLocalBlocks`, and has no `serializableBlocksCache` reference.

Fresh pass-61 negative controls:

- Current `origin/trunk`, with only repro commit `7f009511543` cherry-picked, failed three of the four focused repros. The stale full-snapshot move, same-array-reference reorder, and same-array move after remote insert echo repros all received `[ inserted, emoji, another ]` instead of `[ inserted, another, emoji ]`; the fresh-array reorder control passed.
- Known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only `7f009511543` cherry-picked, passed the stale full-snapshot move and fresh-array reorder controls, but failed the same-array-reference reorder and same-array move after remote insert echo repros with `[ inserted, emoji, another ]`.

That keeps the root-cause split narrow: current trunk still has both the stale full-snapshot order bug and the object-identity serialization-cache bug; known-fixes handles the stale full-snapshot case but still has `serializableBlocksCache`; the PR fix removes that cache and preserves the per-`Y.Array` previous-snapshot reconciliation.

Pass 61 also refreshed origin metadata. GitHub PR #72262 merged `84019935998c16f877e976ad85e84748355d7282` on 2025-10-14 and introduced the recursive post/block CRDT merge logic. `git blame origin/trunk` still points the old `serializableBlocksCache` and positional left/right sweep in `mergeCrdtBlocks()` at that lineage, with later cursor and array-attribute work layered around it. #75923 added CRDT merge tests, #77164 improved array-attribute merging, and #77980 fixed HTTP sync-server compaction on reconnect without changing this block merge path.

The requested `WP_ENV_PORT=9906` browser rerun was attempted. `wp-env status` reported the PR worktree environment was uninitialized, and `wp-env start` failed before WordPress or Playwright startup because Docker could not allocate another compose network: `all predefined address pools have been fully subnetted`. Docker currently has many active `wp-env` stacks, so pass 61 did not remove unrelated networks or stop unrelated containers.

Pass 61 revalidated the existing headless browser artifact and wrote a new annotated H.264 copy:

```text
ec47d94c5251-pass61-fixed-headless-cache-proof.mp4
```

## Pass 62 recheck

Pass 62 independently re-read the pass-61 summary, archived HTTP source row, generated natural-user Playwright spec, failing log, error-context DOM snapshot, trace action records, explanation branch, PR branch, known-fixes base, and current `mergeCrdtBlocks()` implementation.

The archived source failure still classifies as a real product bug. The run exited `1` without timing out, completed the toolbar `Delete`, toolbar `Add before`, typed inserted paragraph, and toolbar `Move down` actions, then failed only while comparing materialized editor states. The final states remain split between:

```text
primary:      inserted paragraph, sibling paragraph, emoji paragraph
collaborator: inserted paragraph, emoji paragraph, emoji paragraph
```

Fresh pass-62 verification confirms the existing PR branch still satisfies the requested three-commit shape on current `origin/trunk`:

```text
0742e801c4e12ee31316faa1f8ed9be11a4782c7
7f009511543 Add RTC stale top-level move merge regressions
5e5e47acb7b Add RTC top-level move Playwright repro
37452c56a6a Preserve RTC block order across stale snapshots
```

Fresh pass-62 fixed-branch checks passed:

- four focused CRDT repros passed: stale full-snapshot move, fresh-array reorder, same-array-reference reorder, and same-array move after remote insert echo;
- the full `packages/core-data/src/utils/test/crdt-blocks.ts` file passed (`78 passed`);
- JS lint for the touched files passed;
- `git diff --check origin/trunk..HEAD` passed;
- the copied built browser bundle contains `previousBlocksByYArray` and `reconcileStaleLocalBlocks`, with no `serializableBlocksCache` reference.

Fresh pass-62 negative controls:

- Current `origin/trunk`, with only repro commit `7f009511543` cherry-picked, failed three of the four focused repros. The stale full-snapshot move, same-array-reference reorder, and same-array move after remote insert echo repros all received `[ inserted, emoji, another ]` instead of `[ inserted, another, emoji ]`; the fresh-array reorder control passed.
- Known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only `7f009511543` cherry-picked, passed the stale full-snapshot move and fresh-array reorder controls, but failed the same-array-reference reorder and same-array move after remote insert echo repros.

That reconfirms the narrow root-cause split: current trunk still has both the stale full-snapshot order bug and object-identity serialization-cache bug; known-fixes handles the stale full-snapshot case but still has the old `serializableBlocksCache`; the PR fix removes that cache and keeps per-`Y.Array` previous-snapshot reconciliation.

The requested `WP_ENV_PORT=9906` browser rerun was attempted again. `wp-env status` reported the PR worktree environment was uninitialized, and `wp-env start` failed before WordPress or Playwright startup because Docker could not allocate another compose network: `all predefined address pools have been fully subnetted`. Pass 62 did not stop unrelated containers or prune unrelated Docker networks.

Pass 62 wrote a fresh stitched headless H.264 video from the archived failure screenshots with the completed action trace and fresh fixed/negative-control results overlaid:

```text
ec47d94c5251-pass62-evidence.mp4
```

## Pass 63 recheck

Pass 63 independently re-read the pass-62 summary, source HTTP result row, generated natural-user Playwright spec, failing log, error-context DOM snapshot, source screenshots, trace action records, explanation branch, PR branch, known-fixes base, and current CRDT merge code.

The archived source failure still classifies as a real product bug. The run exited `1` without timing out, completed toolbar `Delete`, collaborator toolbar `Add before`, typed inserted paragraph, and primary toolbar `Move down`, then failed only while comparing materialized editor states. The final states remain:

```text
primary:      inserted paragraph, sibling paragraph, emoji paragraph
collaborator: inserted paragraph, emoji paragraph, emoji paragraph
```

Pass 63 adds a fresh line-level code-state split across the three relevant states:

- current `origin/trunk` has `serializableBlocksCache` and no per-`Y.Array` stale-snapshot reconciliation;
- known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908` has both `serializableBlocksCache` and `previousBlocksByYArray`/`reconcileStaleLocalBlocks`;
- the PR branch has `previousBlocksByYArray`/`reconcileStaleLocalBlocks` and no `serializableBlocksCache`.

That matches the fresh controls. Current `origin/trunk`, with only repro commit `7f009511543` cherry-picked, failed three of four focused repros: stale full-snapshot move, same-array-reference reorder, and same-array move after remote insert echo. Known-fixes head, with only that repro commit cherry-picked, passed the stale full-snapshot move and fresh-array reorder controls, but failed the same-array-reference reorder and same-array move after remote insert echo. The fixed PR branch passed all four focused repros and the full CRDT test file.

Fresh pass-63 fixed-branch checks passed:

- four focused CRDT repros passed;
- full `packages/core-data/src/utils/test/crdt-blocks.ts` passed (`78 passed`);
- JS lint for the touched files passed;
- `git diff --check origin/trunk..HEAD` passed;
- `build/scripts/core-data/index.js` contains `previousBlocksByYArray` and `reconcileStaleLocalBlocks`, with no `serializableBlocksCache` reference.

Pass 63 fetched GitHub PR metadata for the origin commits. #72262 merged `84019935998c16f877e976ad85e84748355d7282` on 2025-10-14 and introduced the recursive post/block CRDT merge path. #75923 expanded `mergeCrdtBlocks()` testing. #77164 changed nested array-attribute merging. #77980 fixed HTTP sync-server compaction on reconnect and does not change this block-order merge path.

The requested `WP_ENV_PORT=9906` browser rerun was attempted. `wp-env status` reported the PR worktree environment was uninitialized, and `wp-env start` failed before WordPress or Playwright startup because Docker could not allocate another compose network: `all predefined address pools have been fully subnetted`.

Pass 63 wrote a fresh annotated H.264 evidence video from the archived natural-user failure screenshots, with the completed action trace and pass-63 fixed/negative-control results overlaid:

```text
ec47d94c5251-pass63-evidence.mp4
```

## Pass 64 recheck

Pass 64 independently re-read the pass-63 summary, archived HTTP source row, generated natural-user Playwright spec, failing log, error-context DOM snapshot, source screenshots, trace action records, explanation branch, PR branch, known-fixes base, GitHub PR metadata, and current CRDT merge code.

The archived source failure remains a real product bug. The run exited `1`, did not time out, completed toolbar `Delete`, collaborator toolbar `Add before`, typed inserted paragraph, and primary toolbar `Move down`, then failed only while comparing materialized editor states:

```text
primary:      inserted paragraph, sibling paragraph, emoji paragraph
collaborator: inserted paragraph, emoji paragraph, emoji paragraph
```

Pass 64 adds a narrower cache-isolation proof in a fresh temporary worktree at known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908` with only repro commit `7f009511543` cherry-picked:

- With `serializableBlocksCache` still present, the same-array-reference reorder repro and the same-array move after remote insert echo repro both failed, receiving inserted paragraph, emoji paragraph, another paragraph instead of inserted paragraph, another paragraph, emoji paragraph.
- After removing only `serializableBlocksCache` from that temporary worktree and serializing `incomingBlocks` on every call, the same two focused repros passed.

That isolates the remaining known-fixes gap to the object-identity serialization cache: known-fixes already has `previousBlocksByYArray` and stale-snapshot reconciliation, but the cache can return an old serializable snapshot when the editor reuses the same top-level block array object for a genuine move. The PR fix removes that cache and keeps the per-`Y.Array` reconciliation.

Fresh pass-64 fixed-branch checks passed:

- four focused CRDT repros passed;
- full `packages/core-data/src/utils/test/crdt-blocks.ts` passed (`78 passed`);
- JS lint for the touched files passed;
- `git diff --check origin/trunk..HEAD` passed;
- `build/scripts/core-data/index.js` contains `previousBlocksByYArray` and `reconcileStaleLocalBlocks`, with no `serializableBlocksCache` reference.

Pass 64 refreshed origin metadata. GitHub PR #72262 merged `84019935998c16f877e976ad85e84748355d7282` on 2025-10-14 and introduced the recursive post/block CRDT merge path, including the object-identity `serializableBlocksCache` and the positional left/right sweep. PR #75923 expanded merge tests, PR #77164 improved nested array-attribute stability, and PR #77980 changed HTTP polling sync-server compaction only; it does not change this block-order merge path.

The requested `WP_ENV_PORT=9906` browser rerun was attempted. `wp-env status` reported the PR worktree environment was uninitialized, and `wp-env start` failed before WordPress or Playwright startup because Docker could not allocate another compose network: `all predefined address pools have been fully subnetted`.

Pass 64 wrote a fresh annotated H.264 evidence video from the archived natural-user failure screenshots, with the completed action trace and pass-64 cache-isolation results overlaid:

```text
ec47d94c5251-pass64-cache-isolation-evidence.mp4
```

## Pass 65 recheck

Pass 65 independently re-read the pass-64 summary, archived HTTP source row, generated natural-user Playwright spec, failing log, error-context DOM snapshot, source screenshots, trace action records, explanation branch, PR branch, known-fixes base, and current CRDT merge code.

The archived source failure still classifies as a real product bug. The run exited `1`, did not time out, completed toolbar `Delete`, collaborator toolbar `Add before`, typed inserted paragraph, and primary toolbar `Move down`, then failed only while comparing materialized editor states:

```text
primary:      inserted paragraph, sibling paragraph, emoji paragraph
collaborator: inserted paragraph, emoji paragraph, emoji paragraph
```

Pass 65 adds a current-trunk rebase verification. `origin/trunk` advanced from `0742e801c4e12ee31316faa1f8ed9be11a4782c7` to:

```text
64575b44eb6a18f9324a84a634d70ddbaee3b748
RTC: Fix compaction unit test (#77986)
```

That upstream commit changes the HTTP polling sync-server compaction unit test and changelog only. It does not touch `packages/core-data/src/utils/crdt-blocks.ts`. Both the explanation branch and PR branch were rebased onto this current trunk. The PR branch still has exactly the requested three-commit order:

```text
9efc2816fde Add RTC stale top-level move merge regressions
d037d83111f Add RTC top-level move Playwright repro
97b4e886b8d Preserve RTC block order across stale snapshots
```

Fresh pass-65 negative controls:

- Current `origin/trunk` `64575b44eb6a18f9324a84a634d70ddbaee3b748`, with only repro commit `9efc2816fde` cherry-picked, still has `serializableBlocksCache` and fails the same-array-reference reorder repro and the same-array move after remote insert echo repro. Both receive inserted paragraph, emoji paragraph, another paragraph instead of inserted paragraph, another paragraph, emoji paragraph.
- Known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only repro commit `9efc2816fde` cherry-picked, has both `previousBlocksByYArray`/`reconcileStaleLocalBlocks` and `serializableBlocksCache`; it still fails the same two cache-sensitive repros in the same way.

Fresh pass-65 fixed-branch checks passed:

- four focused CRDT repros passed;
- full `packages/core-data/src/utils/test/crdt-blocks.ts` passed (`78 passed`);
- JS lint for the touched files passed;
- `git diff --check origin/trunk..HEAD` passed;
- source and copied browser bundle contain `previousBlocksByYArray` and `reconcileStaleLocalBlocks`, with no `serializableBlocksCache` hit in the fixed merge path.

Pass 65 refreshed origin metadata. `git blame origin/trunk` still points the old object-identity `serializableBlocksCache`, `mergeCrdtBlocks()`, and the positional left/right sweep to `84019935998c16f877e976ad85e84748355d7282` (`Improve CRDT "merge logic" for post entities (#72262)`). Later commits #75923, #77164, #77980, and #77986 do not change this top-level block-order merge path.

The requested `WP_ENV_PORT=9906` browser rerun was attempted. `wp-env status` reported the PR worktree environment was uninitialized, and `wp-env start` failed before WordPress or Playwright startup because Docker could not allocate another compose network: `all predefined address pools have been fully subnetted`.

Pass 65 wrote a fresh annotated H.264 evidence video from the archived natural-user failure screenshots, with the completed action trace and pass-65 current-trunk/fixed/known-fixes results overlaid:

```text
ec47d94c5251-pass65-current-trunk-rebase-evidence.mp4
```

## Pass 66 recheck

Pass 66 independently re-read the pass-65 summary, archived HTTP source row, generated natural-user Playwright spec, failing log, error-context DOM snapshot, source screenshots, trace/action evidence, explanation branch, PR branch, known-fixes base, and current CRDT merge code.

The archived source failure still classifies as a real product bug. The run exited `1`, did not time out, completed toolbar `Delete`, collaborator toolbar `Add before`, typed inserted paragraph, and primary toolbar `Move down`, then failed only while comparing materialized editor states:

```text
primary:      inserted paragraph, sibling paragraph, emoji paragraph
collaborator: inserted paragraph, emoji paragraph, emoji paragraph
```

Pass 66 adds a fresh cache-isolation proof in a new temporary worktree at known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908` with only repro commit `9efc2816fde` cherry-picked:

- With `serializableBlocksCache` still present, the same-array-reference reorder repro and the same-array move after remote insert echo repro both failed, receiving inserted paragraph, emoji paragraph, another paragraph instead of inserted paragraph, another paragraph, emoji paragraph.
- After removing only `serializableBlocksCache` from that temporary worktree and serializing `incomingBlocks` on every call, the same two focused repros passed.

That reconfirms the narrow remaining known-fixes gap: stale object-identity serialization can hide a genuine in-place editor reorder before the CRDT reconciliation logic sees it. The PR fix removes that cache and keeps the per-`Y.Array` previous-snapshot reconciliation.

Fresh pass-66 fixed-branch checks passed:

- four focused CRDT repros passed;
- full `packages/core-data/src/utils/test/crdt-blocks.ts` passed (`78 passed`);
- JS lint for the touched files passed;
- `git diff --check HEAD~3..HEAD` passed;
- source and copied browser bundle contain `previousBlocksByYArray` and `reconcileStaleLocalBlocks`, with no `serializableBlocksCache` reference.

`origin/trunk` remained `64575b44eb6a18f9324a84a634d70ddbaee3b748`, so no rebase was needed after pass 65. The PR branch still has the requested three-commit order:

```text
9efc2816fde Add RTC stale top-level move merge regressions
d037d83111f Add RTC top-level move Playwright repro
97b4e886b8d Preserve RTC block order across stale snapshots
```

Pass 66 refreshed origin metadata. `git blame origin/trunk` still points the old object-identity `serializableBlocksCache`, `mergeCrdtBlocks()`, and the positional left/right sweep to `84019935998c16f877e976ad85e84748355d7282` (`Improve CRDT "merge logic" for post entities (#72262)`). Later commits #75923, #77164, #77980, and #77986 still do not change this top-level block-order merge path.

The requested `WP_ENV_PORT=9906` browser rerun was attempted. `wp-env status` reported the PR worktree environment was uninitialized, and `wp-env start` failed before WordPress or Playwright startup because Docker could not allocate another compose network: `all predefined address pools have been fully subnetted`.

Pass 66 wrote a fresh annotated H.264 evidence video by overlaying pass-66 cache-isolation results onto the existing headless natural-action browser evidence:

```text
ec47d94c5251-pass66-cache-isolation-evidence.mp4
```

## Pass 67 recheck

Pass 67 independently re-read the pass-66 summary, archived HTTP source row,
generated natural-user Playwright spec, failing log, error-context DOM
snapshot, source screenshots, explanation branch, PR branch, known-fixes base,
and current CRDT merge code.

The archived source failure still classifies as a real product bug. The run
exited `1`, did not time out, completed toolbar `Delete`, collaborator toolbar
`Add before`, typed the inserted paragraph, and primary toolbar `Move down`,
then failed only while comparing materialized editor states:

```text
primary:      inserted paragraph, sibling paragraph, emoji paragraph
collaborator: inserted paragraph, emoji paragraph, emoji paragraph
```

Pass 67 adds a branch/video/fix standard verification. `origin/trunk` is still:

```text
64575b44eb6a18f9324a84a634d70ddbaee3b748
RTC: Fix compaction unit test (#77986)
```

The PR branch still forks from that commit and still has exactly the requested
three-commit order:

```text
9efc2816fde Add RTC stale top-level move merge regressions
d037d83111f Add RTC top-level move Playwright repro
97b4e886b8d Preserve RTC block order across stale snapshots
```

Fresh pass-67 fixed-branch checks:

- four focused CRDT repros passed;
- the full `packages/core-data/src/utils/test/crdt-blocks.ts` file passed
  (`78 passed`);
- JS lint for all touched files passed;
- `git diff --check HEAD~3..HEAD` passed.

Fresh pass-67 known-fixes negative check used a new temporary worktree at
known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908` with only repro
commit `9efc2816fde` cherry-picked. Both cache-sensitive tests still failed,
receiving inserted paragraph, emoji paragraph, another paragraph instead of
inserted paragraph, another paragraph, emoji paragraph. That confirms the
known-fixes base is still missing the object-identity serialization-cache fix.

Pass 67 refreshed origin analysis. `git blame origin/trunk` still points the
old `serializableBlocksCache`, `mergeCrdtBlocks()`, and positional left/right
sweep to `84019935998c16f877e976ad85e84748355d7282` (`Improve CRDT "merge
logic" for post entities (#72262)`). Later commits #75923, #77164, #77980, and
#77986 still do not change this top-level block-order merge path.

The requested `WP_ENV_PORT=9906` browser rerun was attempted again. `wp-env
status` reported the PR worktree environment was uninitialized, and `wp-env
start` failed before WordPress or Playwright startup because Docker could not
allocate another compose network: `all predefined address pools have been fully
subnetted`.

`npm run build` was also attempted. JS and PHP bundling completed, but the full
build failed afterward in the existing theme primitive-token generation step
with `TypeError: [object Object] is not a valid color space`. The worktree
remained clean after the failure.

Pass 67 wrote a fresh annotated H.264 stitched evidence video from the archived
natural-user failure screenshots, with the action log and fresh branch/fix
verification overlaid:

```text
ec47d94c5251-pass67-branch-video-fix-verification.mp4
```

## Pass 68 recheck

Pass 68 independently re-read the pass-67 summary, archived HTTP source row,
generated natural-user Playwright spec, failing log, error-context DOM
snapshot, source screenshots, trace action records, explanation branch, PR
branch, known-fixes base, and current CRDT merge code.

The archived source failure still classifies as a real product bug. The run
exited `1`, did not time out, completed the natural editor actions (`Delete`,
collaborator `Add before`, typed inserted paragraph, primary `Move down`), and
failed only after final convergence polling observed stable divergent editor
states:

```text
primary:      inserted paragraph, sibling paragraph, emoji paragraph
collaborator: inserted paragraph, emoji paragraph, emoji paragraph
```

Pass 68 adds a fresh current-build and cache-causality verification:

- fixed PR branch targeted CRDT repros passed (`3 passed`);
- full `packages/core-data/src/utils/test/crdt-blocks.ts` passed
  (`78 passed`);
- JS lint for all touched files passed;
- `git diff --check HEAD~3..HEAD` passed;
- direct `wp-build` completed successfully after linking ignored workspace
  `node_modules` directories from the known-fixes checkout, confirming the
  fixed browser bundle can be built from this branch in the shared dependency
  setup.

Known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only repro
commit `9efc2816fde` cherry-picked, still failed both cache-sensitive tests:
`observes reordered blocks when the editor reuses the same block array
reference` and `preserves the moved sibling when a same-array move follows a
remote insert echo`. Both received inserted paragraph, emoji paragraph, another
paragraph instead of inserted paragraph, another paragraph, emoji paragraph.

In the same temporary known-fixes worktree, a throwaway patch that only replaced
the `serializableBlocksCache` lookup with a fresh `makeBlocksSerializable(
incomingBlocks )` call made the same three focused tests pass. This is the
pass-68 narrower proof: the stale object-identity serialization cache is
sufficient to hide the same-array toolbar move before the CRDT reconciliation
logic sees it.

The PR branch still forks from current `origin/trunk`:

```text
64575b44eb6a18f9324a84a634d70ddbaee3b748
RTC: Fix compaction unit test (#77986)
```

and still has exactly the requested three-commit order:

```text
9efc2816fde Add RTC stale top-level move merge regressions
d037d83111f Add RTC top-level move Playwright repro
97b4e886b8d Preserve RTC block order across stale snapshots
```

The requested `WP_ENV_PORT=9905` browser rerun was attempted after the browser
bundle build succeeded. `wp-env status` reported the PR worktree environment
was uninitialized, and `wp-env start` failed before WordPress or Playwright
startup because Docker could not allocate another compose network: `all
predefined address pools have been fully subnetted`.

Pass 68 wrote a fresh annotated H.264 stitched evidence video from the archived
natural-user failure screenshots, with the action log, cache-causality proof,
branch verification, and Docker rerun blocker overlaid:

```text
ec47d94c5251-pass68-cache-proof-verification.mp4
```

## Pass 69 recheck

Pass 69 independently re-read the pass-68 summary, archived HTTP source row,
generated natural-user Playwright spec, failing log, error-context DOM
snapshot, source screenshots, trace action records, explanation branch, PR
branch, known-fixes base, and current CRDT merge code.

The archived source failure still classifies as a real product bug, not a
locator/readiness/spec artifact. The trace records successful toolbar `Delete`,
collaborator toolbar `Add before`, keyboard typing of the inserted paragraph,
and primary toolbar `Move down`. The failure occurs only after the final
convergence wait compares materialized editor states:

```text
primary:      inserted paragraph, sibling paragraph, emoji paragraph
collaborator: inserted paragraph, emoji paragraph, emoji paragraph
```

Pass 69 adds a current branch/video/fix verification rather than a new code
change. The PR branch still forks from current `origin/trunk`:

```text
64575b44eb6a18f9324a84a634d70ddbaee3b748
RTC: Fix compaction unit test (#77986)
```

and still has exactly the requested three-commit order:

```text
9efc2816fde Add RTC stale top-level move merge regressions
d037d83111f Add RTC top-level move Playwright repro
97b4e886b8d Preserve RTC block order across stale snapshots
```

Fresh pass-69 fixed-branch checks passed:

- three focused CRDT repros passed;
- full `packages/core-data/src/utils/test/crdt-blocks.ts` passed
  (`78 passed`);
- JS lint for all touched files passed;
- `git diff --check HEAD~3..HEAD` passed;
- direct `wp-build` completed successfully and regenerated the fixed browser
  bundle.

The generated browser bundle contains `previousBlocksByYArray` and
`reconcileStaleLocalBlocks`, and no `serializableBlocksCache` reference.

Fresh pass-69 known-fixes negative control used a new temporary worktree at
known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908` with only repro
commit `9efc2816fde` cherry-picked. The stale full-snapshot repro passed there,
but both cache-sensitive tests still failed:

```text
observes reordered blocks when the editor reuses the same block array reference
preserves the moved sibling when a same-array move follows a remote insert echo
```

Both received inserted paragraph, emoji paragraph, another paragraph instead
of inserted paragraph, another paragraph, emoji paragraph. This reconfirms the
known-fixes base is still missing the object-identity serialization-cache fix.

Pass 69 refreshed origin analysis with local `git blame`, `git log`, and
`git show`. Current `origin/trunk` still has `serializableBlocksCache` at
`packages/core-data/src/utils/crdt-blocks.ts:80`, and the cache-backed
`mergeCrdtBlocks()` entry and positional left/right sweep at lines 424-491.
`git blame` points those lines to `84019935998c16f877e976ad85e84748355d7282`
(`Improve CRDT "merge logic" for post entities (#72262)`). Later related
commits still do not change this top-level order path. The local environment
does not have `gh` installed, so PR metadata was taken from commit subjects and
messages.

The requested `WP_ENV_PORT=9905` browser rerun was attempted. `wp-env status`
reported the PR worktree environment was uninitialized, and `wp-env start`
failed before WordPress or Playwright startup because Docker could not allocate
another compose network: `all predefined address pools have been fully
subnetted`.

Pass 69 revalidated the pass-68 annotated headless video and copied it into
the pass-69 artifact directory as:

```text
ec47d94c5251-pass69-verified-cache-proof-video.mp4
```

## Pass 70 recheck

Pass 70 re-read the pass-69 summary, archived HTTP source row, generated
natural-user Playwright spec, failing log, error-context DOM snapshot, source
screenshots, current trace artifacts, explanation branch, PR branch,
known-fixes base, and current CRDT merge code.

The archived browser failure remains a product divergence. The generated spec
uses normal serialized post content and visible editor controls only; the final
failure happens after toolbar `Delete`, collaborator toolbar `Add before`,
keyboard text entry, and toolbar `Move down` have all completed. The final
materialized states are still:

```text
primary:      inserted paragraph, sibling paragraph, emoji paragraph
collaborator: inserted paragraph, emoji paragraph, emoji paragraph
```

Pass 70 adds a narrower current-trunk cache isolation proof. A temporary
worktree at current `origin/trunk` (`64575b44eb6a18f9324a84a634d70ddbaee3b748`)
with only repro commit `9efc2816fde` cherry-picked failed
`observes reordered blocks when the editor reuses the same block array
reference`, receiving inserted paragraph, emoji paragraph, another paragraph
instead of inserted paragraph, another paragraph, emoji paragraph. In the same
tree, a throwaway patch that only removed the `serializableBlocksCache`
lookup made that narrow test pass. This proves the object-identity cache alone
is sufficient to hide an in-place top-level move before the CRDT block merge
sees it.

Fresh pass-70 known-fixes negative control used a new temporary worktree at
known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908` with only repro
commit `9efc2816fde` cherry-picked. The stale full-snapshot repro passed there,
but both cache-sensitive tests still failed:

```text
observes reordered blocks when the editor reuses the same block array reference
preserves the moved sibling when a same-array move follows a remote insert echo
```

Both failed with inserted paragraph, emoji paragraph, another paragraph instead
of inserted paragraph, another paragraph, emoji paragraph.

Fresh pass-70 fixed-branch checks passed:

- three focused CRDT repros passed;
- full `packages/core-data/src/utils/test/crdt-blocks.ts` passed
  (`78 passed`);
- JS lint for all touched files passed;
- `git diff --check HEAD~3..HEAD` passed;
- direct `wp-build` completed successfully;
- the generated browser bundle contains `previousBlocksByYArray` and
  `reconcileStaleLocalBlocks`, with no `serializableBlocksCache` reference.

Pass 70 refreshed PR metadata through the GitHub connector. The vulnerable
block merge code entered through
`https://github.com/WordPress/gutenberg/pull/72262`, merged as
`84019935998c16f877e976ad85e84748355d7282` on 2025-10-14. Related later PRs
`#75923`, `#77164`, `#77980`, and `#77986` were merged, but they do not remove
the top-level `serializableBlocksCache` object-identity hazard.

The requested `WP_ENV_PORT=9905` browser rerun was attempted again.
`wp-env status` reported the PR worktree environment was uninitialized, and
`wp-env start` failed before WordPress or Playwright startup because Docker
could not allocate another compose network: `all predefined address pools have
been fully subnetted`.

Pass 70 wrote an updated H.264 stitched evidence video by appending the new
cache-isolation proof to the existing annotated browser failure/action video:

```text
ec47d94c5251-pass70-cache-proof-verification.mp4
```

## Pass 71 recheck

Pass 71 independently re-read the pass-70 summary, archived HTTP source row,
generated natural-user Playwright spec, failing log, error-context DOM
snapshot, trace artifacts, explanation branch, PR branch, known-fixes base, and
current CRDT merge code.

The archived source failure still classifies as a real product divergence. It
exited with code `1`, did not time out, completed the toolbar `Delete`,
collaborator toolbar `Add before`, keyboard text entry, and toolbar `Move down`
actions, then failed only when final convergence compared materialized editor
states:

```text
primary:      inserted paragraph, sibling paragraph, emoji paragraph
collaborator: inserted paragraph, emoji paragraph, emoji paragraph
```

Pass 71 adds a current-upstream boundary verification. `origin/trunk` advanced
to:

```text
85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5
RTC: Attach sync observers after hydrating persisted CRDT doc (#77966)
```

That upstream change is in `packages/sync/src/manager.ts` and does not touch
`packages/core-data/src/utils/crdt-blocks.ts`. After rebasing both branches onto
that commit, a clean temporary worktree at current `origin/trunk` with only the
non-Playwright repro commit cherry-picked still failed all three focused CRDT
repros: the stale full-snapshot move, the same-array-reference reorder, and the
same-array move following a remote insert echo.

The known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908`, again with only the repro commit
cherry-picked, still passed the stale full-snapshot repro but failed both
cache-sensitive repros. Both cache-sensitive failures received inserted
paragraph, emoji paragraph, another paragraph instead of inserted paragraph,
another paragraph, emoji paragraph. This reconfirms that the known-fixes base
still lacks the object-identity serialization-cache fix.

The rebased PR branch preserves the requested three-commit order:

```text
bd4aadb32e9 Add RTC stale top-level move merge regressions
cc642418660 Add RTC top-level move Playwright repro
bec29bd6d8d Preserve RTC block order across stale snapshots
```

Fresh pass-71 fixed-branch checks passed:

- three focused CRDT repros passed;
- full `packages/core-data/src/utils/test/crdt-blocks.ts` passed
  (`78 passed`);
- JS lint for all touched files passed;
- `git diff --check HEAD~3..HEAD` passed;
- direct `wp-build` completed successfully;
- the generated browser bundle contains `previousBlocksByYArray` and
  `reconcileStaleLocalBlocks`, with no `serializableBlocksCache` reference.

Pass 71 also completed a fresh fixed headless Playwright run on
`WP_ENV_PORT=9905` after working around local Docker address-pool exhaustion by
adding an explicit subnet to the generated compose file, generating missing
block manifests, restoring the shared React vendor bundles, and aligning the
existing database `WP_HOME`/`WP_SITEURL` values with port `9905`. The run used
the natural toolbar sequence and passed. The saved `attempt-1.json` shows both
editors converged to inserted paragraph, sibling paragraph, then emoji
paragraph.

Pass 71 wrote a fresh annotated H.264 stitched evidence video:

```text
ec47d94c5251-pass71-rebased-fixed-headless-verification.mp4
```

## Pass 72 recheck

Pass 72 re-read the pass-71 summary, archived HTTP source row, generated
natural-user Playwright spec, failing log, error-context DOM snapshot,
screenshots, trace listing, explanation branch, PR branch, known-fixes base,
and current CRDT merge code. The source failure still classifies as a product
divergence, not a locator, readiness, malformed-spec, environment, or inverted
assertion failure: the final DOM and state snapshot show one editor at
inserted paragraph, sibling paragraph, emoji paragraph while the collaborator
has inserted paragraph, emoji paragraph, emoji paragraph.

`origin/trunk` is still:

```text
85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5
RTC: Attach sync observers after hydrating persisted CRDT doc (#77966)
```

The PR branch still forks directly from that commit and still has the requested
three-commit order:

```text
bd4aadb32e9 Add RTC stale top-level move merge regressions
cc642418660 Add RTC top-level move Playwright repro
bec29bd6d8d Preserve RTC block order across stale snapshots
```

Pass 72 added a fresh known-fixes negative control in a new temporary worktree
at known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908`, with only repro
commit `bd4aadb32e9` cherry-picked. The stale full-snapshot repro passed there,
but both cache-sensitive repros still failed:

```text
observes reordered blocks when the editor reuses the same block array reference
preserves the moved sibling when a same-array move follows a remote insert echo
```

Both received inserted paragraph, emoji paragraph, another paragraph instead
of inserted paragraph, another paragraph, emoji paragraph. This is the pass-72
independent check that the known-fixes base is still missing the fix for the
`serializableBlocksCache` object-identity hazard.

Fresh pass-72 fixed-branch checks passed:

- three focused CRDT repros passed;
- full `packages/core-data/src/utils/test/crdt-blocks.ts` passed
  (`78 passed`);
- JS lint for all touched files passed;
- `git diff --check HEAD~3..HEAD` passed;
- direct `wp-build` completed successfully;
- the generated browser bundle contains `previousBlocksByYArray` and
  `reconcileStaleLocalBlocks`, with no `serializableBlocksCache` reference.

Pass 72 also completed a fresh fixed headless Playwright run on
`WP_ENV_PORT=9905`. The normal `wp-env start` path again failed before
WordPress startup because Docker had exhausted its predefined address pools, so
the run used the same generated-compose explicit-subnet workaround. The test
then passed with the natural toolbar sequence. The saved pass-72
`attempt-1.json` shows both editors converged to inserted paragraph, sibling
paragraph, then emoji paragraph.

Pass 72 revalidated the annotated H.264 stitched evidence video and copied it
into the pass-72 artifact directory:

```text
ec47d94c5251-pass72-revalidated-annotated-headless-video.mp4
```

## Pass 73 recheck

Pass 73 independently re-read the pass-72 summary, archived HTTP result row,
generated Playwright spec, failing log, error-context DOM snapshot, trace
listing, explanation branch, PR branch, and current CRDT merge code. The source
failure still classifies as product state divergence after completed toolbar
actions, not a locator, readiness, malformed-spec, environment, or inverted
assertion failure.

`origin/trunk` remains:

```text
85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5
RTC: Attach sync observers after hydrating persisted CRDT doc (#77966)
```

The PR branch still forks directly from that commit and keeps the requested
three-commit order:

```text
bd4aadb32e9 Add RTC stale top-level move merge regressions
cc642418660 Add RTC top-level move Playwright repro
bec29bd6d8d Preserve RTC block order across stale snapshots
```

Pass 73 added another fresh known-fixes negative control in
`/private/tmp/gutenberg-ec47-pass73-knownfix-testonly.8AxlWc`, at known-fixes
head `3cba2b1e56a98787de08dc6c7df2434759e8f908` with only repro commit
`bd4aadb32e9` cherry-picked. The stale full-snapshot repro passed there, but
both cache-sensitive repros still failed:

```text
observes reordered blocks when the editor reuses the same block array reference
preserves the moved sibling when a same-array move follows a remote insert echo
```

Both received inserted paragraph, emoji paragraph, another paragraph instead
of inserted paragraph, another paragraph, emoji paragraph. This is a current
verification that known-fixes still lacks the object-identity cache fix.

Fresh pass-73 fixed-branch checks passed:

- three focused CRDT repros passed;
- full `packages/core-data/src/utils/test/crdt-blocks.ts` passed
  (`78 passed`);
- JS lint for all touched files passed;
- `git diff --check HEAD~3..HEAD` passed;
- the generated browser bundle contains `previousBlocksByYArray` and
  `reconcileStaleLocalBlocks`, with no `serializableBlocksCache` reference.

Pass 73 also completed a fresh fixed headless Playwright run on
`WP_ENV_PORT=9905`. The normal `wp-env start` path again failed before
WordPress startup because Docker had exhausted its predefined address pools, so
the run used the generated-compose explicit-subnet workaround. The natural
toolbar sequence passed, and the saved pass-73 `attempt-1.json` shows both
editors converged to inserted paragraph, sibling paragraph, then emoji
paragraph.

Pass 73 generated a new annotated H.264 stitched video from the fresh trace,
with primary and collaborator screenshots side-by-side and the action/final
state log embedded in the frame:

```text
ec47d94c5251-pass73-fresh-trace-stitched-video.mp4
```

## Pass 74 recheck

Pass 74 independently re-read the archived HTTP result row, source spec,
failing log, screenshots, error-context DOM snapshot, fresh pass-73 summary,
explanation branch, PR branch, known-fixes base, and CRDT merge code. The
source failure still classifies as a real product divergence after completed
toolbar actions, not a readiness wait, action locator error, malformed spec,
environment failure, inverted assertion, or expected behavior.

Pass 74 adds a fresh known-fixes negative control in
`/private/tmp/gutenberg-ec47-pass74-knownfix-testonly.Rb35qp`, at known-fixes
head `3cba2b1e56a98787de08dc6c7df2434759e8f908` with only repro commit
`bd4aadb32e9` cherry-picked. The stale full-snapshot repro passed there, but
both cache-sensitive repros still failed:

```text
observes reordered blocks when the editor reuses the same block array reference
preserves the moved sibling when a same-array move follows a remote insert echo
```

Both received inserted paragraph, emoji paragraph, another paragraph instead
of inserted paragraph, another paragraph, emoji paragraph. This is a current
independent proof that the known-fixes base still retains the old
`serializableBlocksCache` object-identity hazard.

Fresh pass-74 fixed-branch checks passed:

- three focused CRDT repros passed;
- full `packages/core-data/src/utils/test/crdt-blocks.ts` passed
  (`78 passed`);
- JS lint for all touched files passed;
- `git diff --check HEAD~3..HEAD` passed;
- the generated browser bundle contains `previousBlocksByYArray` and
  `reconcileStaleLocalBlocks`, with no `serializableBlocksCache` reference.

`wp-env start` again failed before WordPress startup with Docker address-pool
exhaustion, so pass 74 used the generated compose file with explicit subnet
`10.254.74.0/24` and started only `mysql`, `wordpress`, and `cli`. WordPress
served `http://localhost:9905`, the site URL matched that port, and the
Gutenberg plugin from the PR worktree was active. A fresh headless natural-user
Playwright run then passed on `WP_ENV_PORT=9905`; the saved
`attempt-1.json` shows both editors converged to inserted paragraph, sibling
paragraph, then emoji paragraph.

Pass 74 wrote a fresh annotated H.264 video from that trace:

```text
ec47d94c5251-pass74-fixed-trace-annotated.mp4
```

## Pass 75 recheck

Pass 75 independently re-read the pass-74 summary, archived HTTP result row,
generated natural-user Playwright spec, failing log, error-context DOM
snapshot, screenshots/traces list, known-fixes base, explanation branch, PR
branch, and current CRDT merge code. The source failure still classifies as a
real product divergence after completed toolbar and keyboard actions, not a
readiness wait, locator error, malformed generated spec, environment failure,
inverted assertion, or expected behavior.

`origin/trunk` advanced after pass 74 to:

```text
369e71ec725855b95d11b46174aef436fa7f75c8
Fix: Buttons block shows inserter picker when multiple allowed blocks are registered (#77858)
```

That upstream commit touches `packages/block-library/src/buttons/edit.js`,
not the CRDT block merge code. Pass 75 rebased the PR branch onto this current
trunk and preserved the requested commit order:

```text
54b881d38ae Add RTC stale top-level move merge regressions
65e5d949fa Add RTC top-level move Playwright repro
6fa5f390dc Preserve RTC block order across stale snapshots
```

Pass 75 added a stronger upstream negative control: cherry-picking only the
rebased non-Playwright repro commit onto current `origin/trunk` made all three
focused low-level repros fail. Each received inserted paragraph, emoji
paragraph, another paragraph instead of inserted paragraph, another paragraph,
emoji paragraph. So the current trunk movement did not fix this bug.

The requested known-fixes negative control was also rerun at
`3cba2b1e56a98787de08dc6c7df2434759e8f908` with only repro commit
`54b881d38ae` cherry-picked. The stale full-snapshot repro passed there, but
the two cache-sensitive repros still failed:

```text
observes reordered blocks when the editor reuses the same block array reference
preserves the moved sibling when a same-array move follows a remote insert echo
```

Both failures again produced inserted paragraph, emoji paragraph, another
paragraph instead of inserted paragraph, another paragraph, emoji paragraph.
This reconfirms that the known-fixes base still retains the
`serializableBlocksCache` object-identity hazard.

Fresh pass-75 fixed-branch checks passed:

- three focused CRDT repros passed;
- full `packages/core-data/src/utils/test/crdt-blocks.ts` passed
  (`78 passed`);
- JS lint for all touched files passed;
- `git diff --check HEAD~3..HEAD` passed;
- the generated browser bundle contains `previousBlocksByYArray` and
  `reconcileStaleLocalBlocks`, with no `serializableBlocksCache` reference.

`wp-env status` reported the requested port environment was not initialized.
`wp-env start` again failed before WordPress startup because Docker had
exhausted its predefined address pools. Pass 75 patched the generated compose
file with explicit subnet `10.254.75.0/24`, started `mysql`, `wordpress`, and
`cli`, verified `http://localhost:9905` served WordPress, verified the site URL
matched that port, and verified the PR worktree Gutenberg plugin was active.

A fresh headless natural-user Playwright run passed on `WP_ENV_PORT=9905`.
The saved `attempt-1.json` shows both editors converged to inserted paragraph,
sibling paragraph, then emoji paragraph. Pass 75 generated a fresh annotated
H.264 trace video with both editor screens unobscured and a separate visible
action/result log panel:

```text
ec47d94c5251-pass75-fixed-trace-annotated.mp4
```

## Pass 76 recheck

Pass 76 independently re-read the pass-75 summary, archived HTTP result row,
generated natural-user Playwright spec, failing log, error-context DOM
snapshot, screenshots/trace list, current CRDT merge code, known-fixes base,
and both branches. The source failure still classifies as a real product
divergence after completed toolbar and keyboard actions, not a readiness wait,
locator error, malformed generated spec, environment failure, inverted
assertion, or expected behavior.

`origin/trunk` remained:

```text
369e71ec725855b95d11b46174aef436fa7f75c8
Fix: Buttons block shows inserter picker when multiple allowed blocks are registered (#77858)
```

That upstream commit still does not touch `packages/core-data/src/utils/crdt-blocks.ts`.
The PR branch remains rebased onto that trunk with the requested commit order:

```text
54b881d38ae Add RTC stale top-level move merge regressions
65e5d949fa Add RTC top-level move Playwright repro
6fa5f390dc Preserve RTC block order across stale snapshots
```

Pass 76 refreshed both negative controls. Cherry-picking only repro commit
`54b881d38ae` onto current `origin/trunk` made all three focused CRDT repros
fail with inserted paragraph, emoji paragraph, another paragraph instead of
inserted paragraph, another paragraph, emoji paragraph. Cherry-picking the
same repro commit onto known-fixes head
`3cba2b1e56a98787de08dc6c7df2434759e8f908` made the stale full-snapshot repro
pass, but both cache-sensitive repros still failed with the same stale order.
This independently reconfirms that known-fixes still lacks the cache-removal
part of the fix.

Fresh pass-76 fixed-branch checks passed:

- three focused CRDT repros passed;
- full `packages/core-data/src/utils/test/crdt-blocks.ts` passed
  (`78 passed`);
- JS lint for all touched files passed;
- `git diff --check HEAD~3..HEAD` passed;
- the generated browser bundle contains `previousBlocksByYArray` and
  `reconcileStaleLocalBlocks`, with no `serializableBlocksCache` reference.

The requested `wp-env start` again failed before WordPress startup because
Docker had exhausted its predefined address pools. Pass 76 patched the
generated compose file with explicit subnet `10.254.76.0/24`, started
`mysql`, `wordpress`, and `cli`, verified `http://localhost:9905` served
WordPress, verified the site URL matched that port, and verified the PR
worktree Gutenberg plugin was active.

A fresh headless natural-user Playwright run passed on `WP_ENV_PORT=9905`.
The saved `attempt-1.json` shows both editors converged to inserted paragraph,
sibling paragraph, then emoji paragraph. Pass 76 generated a fresh annotated
H.264 video with source failure screens, fixed trace contact sheets, the
action/result log, and fixed final editor screens:

```text
ec47d94c5251-pass76-verified-annotated.mp4
```

## Pass 77 recheck

Pass 77 independently re-read the pass-76 summary, archived HTTP result row,
generated natural-user Playwright spec, failing log, error-context DOM
snapshot, screenshots/trace list, current CRDT merge code, known-fixes base,
and both branches. The source failure still classifies as a real product
divergence after completed toolbar and keyboard actions, not a readiness wait,
locator error, malformed generated spec, environment failure, inverted
assertion, or expected behavior.

`origin/trunk` remained:

```text
369e71ec725855b95d11b46174aef436fa7f75c8
Fix: Buttons block shows inserter picker when multiple allowed blocks are registered (#77858)
```

That upstream commit still does not touch `packages/core-data/src/utils/crdt-blocks.ts`.
The PR branch remains rebased onto that trunk with the requested commit order:

```text
54b881d38ae Add RTC stale top-level move merge regressions
65e5d949fa Add RTC top-level move Playwright repro
6fa5f390dc Preserve RTC block order across stale snapshots
```

Pass 77 refreshed both low-level negative controls. Cherry-picking only repro
commit `54b881d38ae` onto current `origin/trunk` made all three focused CRDT
repros fail with inserted paragraph, emoji paragraph, another paragraph
instead of inserted paragraph, another paragraph, emoji paragraph.
Cherry-picking the same repro commit onto known-fixes head
`3cba2b1e56a98787de08dc6c7df2434759e8f908` made the stale full-snapshot repro
pass, but both cache-sensitive repros still failed with the same stale order.
This is the pass-77 independent repro route: current trunk still lacks the
whole fix, while known-fixes still lacks the object-identity serialization
cache removal.

Fresh pass-77 fixed-branch checks passed:

- three focused CRDT repros passed;
- full `packages/core-data/src/utils/test/crdt-blocks.ts` passed
  (`78 passed`);
- JS lint for all touched files passed;
- `git diff --check HEAD~3..HEAD` passed.

The requested `wp-env status` reported the port-9905 environment was not
initialized. `wp-env start` again failed before WordPress startup because
Docker had exhausted its predefined address pools. Pass 77 patched the
generated compose file with explicit subnet `10.254.77.0/24`, then started
only `mysql`, `wordpress`, and `cli` because `phpmyadmin` hit an unrelated
host port `9000` conflict. WordPress served `http://localhost:9905`,
`wp core is-installed` exited `0`, the site URL matched that port, and the PR
worktree Gutenberg plugin was active.

A fresh headless natural-user Playwright run passed on `WP_ENV_PORT=9905` in
24.3 seconds. The saved `attempt-1.json` shows both editors converged to
inserted paragraph, sibling paragraph, then emoji paragraph, and the primary
and secondary normalized states were byte-identical. Pass 77 generated a fresh
annotated H.264 video from that trace with source failure screens, both fixed
trace streams, the action/result log, and fixed final editor screens:

```text
ec47d94c5251-pass77-fresh-annotated.mp4
```

## Pass 79 recheck

Pass 79 independently re-read the pass-78 summary, archived HTTP result row,
source Playwright spec, failing log, error-context DOM snapshot, screenshots,
fresh trace list, current CRDT merge code, known-fixes base, and both branches.
The source failure still classifies as a real product divergence after
completed natural toolbar actions, not a readiness wait, locator error,
malformed generated spec, environment failure, inverted assertion, or expected
behavior.

`origin/trunk` remained:

```text
369e71ec725855b95d11b46174aef436fa7f75c8
Fix: Buttons block shows inserter picker when multiple allowed blocks are registered (#77858)
```

Fresh pass-79 low-level negative controls still reproduce the defect with
only repro commit `54b881d38ae` applied:

- current `origin/trunk`: all three focused CRDT repros failed;
- known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908`: the plain
  stale-snapshot repro passed, but both same-array/cache repros failed.

This verifies the existing fix still has the necessary scope: the known-fixes
base handles one stale-snapshot route, but it does not remove the
object-identity serialization-cache hazard.

The PR branch remains exactly the requested three commits:

```text
54b881d38ae Add RTC stale top-level move merge regressions
65e5d949fa Add RTC top-level move Playwright repro
6fa5f390dc Preserve RTC block order across stale snapshots
```

Fresh pass-79 fixed-branch checks passed:

- three focused CRDT repros passed;
- full `packages/core-data/src/utils/test/crdt-blocks.ts` passed
  (`78 passed`);
- JS lint for all touched files passed;
- `git diff --check HEAD~3..HEAD` passed;
- the built `core-data` bundle contains `previousBlocksByYArray` and
  `reconcileStaleLocalBlocks`.

`npm run wp-env status` first reported the port-9905 environment was not
initialized. `npm run wp-env start` again failed before WordPress startup
because Docker had exhausted its predefined address pools. Pass 79 used the
generated test compose file with explicit subnet `10.254.78.0/24`, verified
WordPress served `http://localhost:9905`, verified `WP_HOME` and `WP_SITEURL`
matched that port, and verified the PR worktree Gutenberg plugin was active.

A fresh headless natural-user Playwright run passed on `WP_ENV_PORT=9905` in
22.7 seconds. The saved `attempt-1.json` shows both editors converged to
inserted paragraph, sibling paragraph, then emoji paragraph, and the primary
and secondary normalized states were byte-identical. Pass 79 generated a fresh
annotated H.264 video from that trace with source failure screens, both fixed
trace streams, the action/result log, and fixed final editor screens:

```text
ec47d94c5251-pass79-fresh-annotated.mp4
```

## Pass 165 recheck

Pass 165 re-read the pass-79 summary, archived HTTP result row, source
Playwright spec, failing log, error-context DOM snapshot, screenshots, current
CRDT merge code, known-fixes base, and both branches. The source failure still
classifies as a real product divergence after completed natural toolbar
actions, not a readiness wait, locator error, malformed generated spec,
environment failure, inverted assertion, or expected behavior.

Both branches were refreshed onto current `origin/trunk`:

```text
12a12af12a48b86223152498c688d7f87fbfae2f
Content types: flush rewrite rules on rewrite-impacting changes (#78058)
```

The rebased PR branch keeps the requested commit order:

```text
c4b412b5840 Add RTC stale top-level move merge regressions
679098f71f6 Add RTC top-level move Playwright repro
54c5ed51f74 Preserve RTC block order across stale snapshots
```

Pass 165 refreshed the low-level negative controls. With only the non-Playwright
repro commit applied to current `origin/trunk`, all three focused CRDT repros
failed with the stale order:

```text
Inserted paragraph
Emoji and multibyte
Another paragraph
```

instead of:

```text
Inserted paragraph
Another paragraph
Emoji and multibyte
```

With only the same repro commit applied to known-fixes head
`3cba2b1e56a98787de08dc6c7df2434759e8f908`, the plain stale-snapshot repro
passed, but both cache-sensitive repros failed with the same stale order. This
again narrows the remaining known-fixes gap to the object-identity
`serializableBlocksCache` path.

The fixed branch passed:

- three focused CRDT repros;
- full `packages/core-data/src/utils/test/crdt-blocks.ts` (`78 passed`);
- JS lint for all touched JS/TS files;
- `git diff --check HEAD~3..HEAD`;
- full production `npm run build` after `npm run clean:package-types`.

The generated browser bundle contains `previousBlocksByYArray` and
`reconcileStaleLocalBlocks`, and no `serializableBlocksCache` reference.

Fresh pass-165 blame against current trunk still points the vulnerable
top-level block snapshot cache and positional left/right sweep at
`84019935998c16f877e976ad85e84748355d7282` (`Improve CRDT "merge logic" for
post entities (#72262)`). GitHub metadata for #72262 confirms it introduced
post-specific CRDT block merge logic and was merged on 2025-10-14. Later
changes in #75923, #76913, #77164, #77980, and #77858 do not remove the
object-identity serialization cache.

`npm run wp-env status` on the requested `WP_ENV_PORT=9907` reported the
environment uninitialized. `npm run wp-env start` then hung inside
`docker compose down`, and `docker info` also hung until killed. No browser
actions ran in pass 165; this is a local Docker daemon/environment blocker, not
a product signal. Pass 165 revalidated the existing headless trace video and
created a new annotated H.264 copy with the pass-165 branch/test status banner:

```text
ec47d94c5251-pass165-revalidated-annotated.mp4
```

## Pass 167 practical impact recheck

Pass 167 rebased both branches onto current `origin/trunk`:

```text
19c460ff7c8f19f09ded768b39a854dbb276d6bc
Editor: Paginate revisions slider by 100 per page (#77200)
```

The upstream change is unrelated to RTC block merging. The PR branch still has
the requested three-commit order:

```text
b1e6cf6b3bd Add RTC stale top-level move merge regressions
b3717057f3c Add RTC top-level move Playwright repro
0c1fd6f6e25 Preserve RTC block order across stale snapshots
```

Real-user likelihood is `low`. The workflow uses ordinary editor behavior, but
the required overlap is narrow:

1. The editor surface is the post editor with RTC enabled over HTTP polling.
2. The content can be ordinary top-level `core/paragraph` blocks.
3. Two active collaborators must edit the same post at the same time.
4. One collaborator deletes or otherwise changes a nearby top-level block.
5. The other collaborator inserts before the paragraph that will later be
   moved.
6. The first collaborator then moves that paragraph down while a stale full
   block snapshot or same-array reorder echo is still possible.

The common prerequisites are normal paragraphs, toolbar delete, toolbar insert
before, toolbar move down, and collaborative editing. The rarer prerequisites
are two editors touching the same short top-level region in quick succession
and one client emitting a stale or cache-hidden full block order. Fuzzing
supplied the exact interleaving and short three-block setup; the actions
themselves are not artificial.

The blast radius is content corruption in one editor state: a moved paragraph
can be duplicated and a sibling paragraph can disappear. This is worse than a
UI-only disagreement because a save from the corrupted editor can persist the
bad serialized content. There is no save loop or performance/OOM risk. Recovery
is manual undo if still available, another collaborator's intact editor state,
or post revisions after a bad save.

Strong evidence for `low`: the archived failure and DOM snapshot show real
duplicated/lost paragraph content after visible toolbar actions; the low-level
repros use real `Y.Doc` instances and fail on current trunk; the known-fixes
base still fails the cache-sensitive repros; and the fix passes the focused and
full CRDT suites. Strong evidence against a higher likelihood: RTC is not the
default single-user editing path, two editors must concurrently edit the same
top-level region, and the bad order depends on a stale snapshot or reused block
array identity, not merely on any block move.

The shortest next experiment to improve confidence is an instrumented
headless Playwright run that repeats the natural sequence 100-200 times with
small randomized delays between delete, insert-before, and move-down, logging
which client emits each full block order. That would convert the likelihood
from structural reasoning plus one observed browser failure into an empirical
hit-rate estimate.

Fresh pass-167 verification:

- current `origin/trunk` plus only the non-Playwright repro commit fails all
  three focused CRDT repros with stale order `inserted, emoji, another`;
- known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908` plus only the
  same repro commit passes the plain stale-snapshot repro but still fails both
  same-array/cache repros;
- fixed PR branch passes the three focused CRDT repros;
- fixed PR branch passes full `packages/core-data/src/utils/test/crdt-blocks.ts`
  (`78 passed`);
- JS lint for touched files passes;
- `git diff --check HEAD~3..HEAD` passes;
- `npm run build` passes;
- rebuilt `build/scripts/core-data/index.js` contains `previousBlocksByYArray`
  and `reconcileStaleLocalBlocks` and no `serializableBlocksCache`.

Fresh browser rerun on the requested `WP_ENV_PORT=9907` was not feasible in
this local environment. `npm run wp-env status` reported the environment was
not initialized; `npm run wp-env start` produced no progress for 40 seconds and
was interrupted; `docker info` hung after printing the client header and was
killed. The existing source trace/screenshots and pass-79/pass-165 annotated
videos remain the browser-level evidence.

## Pass 168 practical-impact and branch recheck

Pass 168 re-read the source JSONL row, archived Playwright log, error context,
trace actions, natural-user repro spec, low-level repro commit, root-cause
code, and branch state. The bug remains a real RTC product defect, not a
readiness wait, locator error, generated-spec issue, environment failure,
inverted assertion, or expected behavior.

The archived HTTP source run still failed only after the natural editor
sequence completed. The trace shows:

- a normal REST-created post containing a heading and two paragraphs;
- primary user toolbar `Delete` of the heading;
- collaborator toolbar `Add before` and typing of the inserted paragraph;
- primary user toolbar `Move down` of the emoji paragraph;
- final convergence polling over materialized editor block trees.

The final source state is still content corruption: the primary editor has
`inserted, sibling, emoji`, while the collaborator has `inserted, emoji,
emoji`.

Real-user likelihood remains `low`, with one sharper distinction: it is not
`very-low` for sites actually using the Gutenberg plugin's RTC path because the
plugin registers the `wp_collaboration_enabled` setting with default `true`
when collaboration is allowed and the post editor has sync config. It is also
not `medium` or `high` for normal Gutenberg use overall because it still
requires two active editors in the same post, editing the same nearby top-level
region, with a stale full-block snapshot or same-array reorder echo occurring
around a delete, insert-before, and move-down sequence.

Fresh pass-168 verification:

- `origin/trunk` is still `19c460ff7c8` (`Editor: Paginate revisions slider by
  100 per page (#77200)`), and both ec47 branches still fork from that commit.
- The PR branch still has the requested three commits: non-Playwright repros,
  natural-user Playwright repro, then fix.
- `git ls-remote --heads danluu` confirms both branches are pushed:
  `20424d2ed38` for the explanation branch and `0c1fd6f6e25` for the PR
  branch before this documentation-only pass-168 update.
- The fixed PR branch passes the three focused CRDT repros, including the
  same-array cache/reorder repro.
- The fixed PR branch passes the full
  `packages/core-data/src/utils/test/crdt-blocks.ts` suite (`78 passed`).
- JS lint for the touched source, unit test, and Playwright spec files passes.
- `git diff --check HEAD~3..HEAD` passes.
- Known-fixes head `3cba2b1e56a98787de08dc6c7df2434759e8f908` plus only the
  non-Playwright repro commit still fails
  `observes reordered blocks when the editor reuses the same block array
  reference`, receiving `inserted, emoji, another` instead of
  `inserted, another, emoji`.
- The pass-75 annotated headless H.264 video is readable (`1600x900`,
  duration `39.0s`), and its saved fixed-run JSON shows both editors converged
  to `inserted, sibling, emoji`.

The shortest remaining experiment to improve practical-impact confidence is
still an instrumented repeated Playwright run of the natural sequence with
small randomized delays. That would estimate hit rate under realistic editor
timing; the current evidence proves reachability and impact but not frequency.

## Pass 169 current known-fixes recheck

Pass 169 re-read the May 7 known-fixes manifest and used the current
backlink-aware integration base directly:

```text
f256024286dd80a4c0e2579f658c109256abf648
Integrate RTC known-fix stack
```

This matters because the May 7 base includes several overlapping open RTC PRs
and an integration commit, not just the older May 5 known-fixes checkout.

The current base already contains stale-snapshot reconciliation helpers, but
it still keeps `serializableBlocksCache` keyed by the incoming block array
object. A temporary detached worktree of `f2560242...` with only a focused
pass-169 negative-control test file failed both cache-sensitive checks:

```text
FAIL packages/core-data/src/utils/test/ec47-pass169-knownfix-current.test.ts

observes reordered blocks when the editor reuses the same block array reference
Expected: [ "Inserted paragraph", "Another paragraph", "Emoji and multibyte" ]
Received: [ "Inserted paragraph", "Emoji and multibyte", "Another paragraph" ]

preserves the moved sibling when a same-array move follows a remote insert echo
Expected: [ "Inserted paragraph", "Another paragraph", "Emoji and multibyte" ]
Received: [ "Inserted paragraph", "Emoji and multibyte", "Another paragraph" ]
```

That is the narrowest current proof that the bug survives the May 7
known-fixes base: the integrated stack can reconcile some stale full snapshots,
but the object-identity serialization cache can still hide a real top-level
move when the editor reuses the same block array reference.

Fresh pass-169 fixed-branch verification:

- `origin/trunk` remains `86d1b6741a5` (`Add RTC cursor-scope regression tests
  (#77662)`).
- The PR branch still has the requested commit order: non-Playwright repros,
  natural-user Playwright repro, then fix.
- The focused three-test CRDT command passes on the PR branch.
- The full `packages/core-data/src/utils/test/crdt-blocks.ts` suite passes
  (`78 passed`).
- JS lint for the touched source, unit-test, and Playwright spec files passes.
- `git diff --check HEAD~3..HEAD` passes.
- `git ls-remote --heads danluu` confirms the explanation and PR branches are
  pushed.
- The existing pass-75 annotated H.264 video remains readable (`1600x900`,
  duration `39.0s`) and its saved attempt JSON shows both editors converged to
  inserted paragraph, sibling paragraph, then emoji paragraph on the fixed
  branch.

A fresh Playwright rerun was attempted on the requested `WP_ENV_PORT=9907`.
`npm run wp-env status` reported the environment was not initialized. A
subsequent `npm run wp-env start` stayed silent for more than two minutes while
other `wp-env` Docker compose teardown processes were also present, and was
terminated so no orphaned command was left running. The browser-level evidence
therefore remains the archived source failure plus previously generated
headless fixed-run video/artifacts.

Practical-impact classification remains `low`. The stronger pass-169 evidence
supports reachability on the current known-fixes base, but it does not raise
frequency: real users still need active RTC collaboration in the post editor,
two editors touching the same nearby top-level block list, and a stale or
cache-hidden full snapshot around delete, insert-before, and move-down.

## Pass 170 current known-fixes recheck

Pass 170 narrows the current May 7 known-fixes status and downgrades the
practical risk for the integrated known-fixes base.

The current known-fixes base remains:

```text
f256024286dd80a4c0e2579f658c109256abf648
Integrate RTC known-fix stack
```

A fresh detached worktree of that exact SHA was tested with a smaller
pass-170-only unit repro. The two-doc stale full-snapshot echo that models a
normal Yjs remote move now passes on current known-fixes. The only failing
check is the object-identity cache control, where the same JavaScript block
array object is mutated from `inserted, emoji, another` to `inserted, another,
emoji` and passed to `mergeCrdtBlocks()` again:

```text
FAIL packages/core-data/src/utils/test/ec47-pass170-knownfix-current.test.ts

preserves a later remote move when a peer emits its stale pre-move snapshot:
PASS

observes a top-level reorder even when the editor reuses the same block array object:
Expected: [ "Inserted paragraph", "Another paragraph", "Emoji and multibyte" ]
Received: [ "Inserted paragraph", "Emoji and multibyte", "Another paragraph" ]
```

The natural Playwright repro was then run against the same current known-fixes
code on the requested HTTP port. The first attempt used the regular
`.wp-env.json` environment and failed before browser actions because the e2e
RTC websocket test plugin was not mounted. After restarting with
`.wp-env.test.json`, the same natural-toolbar spec passed:

```text
WP_ENV_PORT=10030 WP_BASE_URL=http://localhost:10030 \
RTC_MANIFEST_WS_START_PORT=21440 RTC_MANIFEST_WS_FIXED_PORT=1 \
RTC_EC47_OUTPUT_DIR=.../pass-170/work/ec47-current-knownfix.8pVz1b/browser-output \
npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium

1 passed
```

The saved attempt JSON shows both editors converged to:

```text
RTC ec47 realistic inserted paragraph 1
Another paragraph exists so the top-level list is not degenerate.
Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.
```

This is a material correction to the pass-169 risk assessment. The historical
archived source run is still a real product bug on the older stack, and the PR
branch's cache-removal fix still closes a real defensive gap in
`mergeCrdtBlocks()`. But under the current backlink-aware known-fixes base, the
ordinary delete, add-before, and move-down workflow is no longer reproduced at
the unit fresh-array level or the browser natural-action level.

Practical-impact classification for current known-fixes is therefore
`very-low`, not `low`. A real user would need active RTC collaboration and the
same nearby top-level edit pattern, plus an unproven product path that reuses
the exact same top-level block array object after reordering it in place. Code
inspection of the ordinary post-editor path argues against that being common:
`useBlockSync()` sends `getBlocks()` output to `editEntityRecord()`, while the
block-editor reducer rebuilds the root `innerBlocks` array when toolbar move
actions update block order. The remaining same-array test is still useful as a
robustness regression, but pass 170 did not prove it is hit by normal toolbar
editing on the current known-fixes base.

The shortest experiment that would most improve confidence is an instrumented
current-known-fixes browser run that logs, for every `mergeCrdtBlocks()` call,
the incoming block-array object identity, clientId order, and call origin
during 100-200 randomized repetitions of delete, insert-before, move, drag,
undo, redo, and list-view reorder actions. That would directly answer whether
the residual same-array cache hazard is product-reachable.

Fresh pass-170 fixed-branch verification after rebasing onto current
`origin/trunk` `c9c72087881`:

- The PR branch still has the requested three commits: non-Playwright repros,
  natural-user Playwright repro, then fix.
- The focused three-test CRDT command passes on the PR branch.
- The full `packages/core-data/src/utils/test/crdt-blocks.ts` suite passes
  (`78 passed`).
- JS lint for the touched source, unit-test, and Playwright spec files passes.
- `git diff --check HEAD~3..HEAD` passes.

## Pass 171 branch and practical-impact recheck

Pass 171 re-read the current May 7 known-fixes manifest, the pass-170 summary,
the source JSONL row, the existing natural-user repro, current known-fixes
`crdt-blocks.ts`, and the ordinary post-editor move/data flow.

The May 7 known-fixes base is still
`f256024286dd80a4c0e2579f658c109256abf648` and still contains both the newer
stale-local reconciliation helpers and the old object-identity
`serializableBlocksCache`:

```text
packages/core-data/src/utils/crdt-blocks.ts:75
const serializableBlocksCache = new WeakMap< WeakKey, Block[] >();

packages/core-data/src/utils/crdt-blocks.ts:1117-1124
if ( ! serializableBlocksCache.has( incomingBlocks ) ) { ... }
const localBlocksToSync =
        serializableBlocksCache.get( incomingBlocks ) ?? [];
```

`git blame` on the current known-fixes base still attributes the cache and the
cache lookup to `84019935998c` (`Improve CRDT "merge logic" for post entities
(#72262)`), with the current integration commit only adapting the surrounding
lookup. The PR branch removes that cache-sensitive path and keeps the
same-array regression tests.

The practical-likelihood classification remains `very-low` for the current
known-fixes stack, not because the historical bug was false, but because the
remaining known-fixes failure requires same-array object reuse that pass 171
still did not observe in the ordinary toolbar route. The ordinary top-level
toolbar move path argues against same-array reuse:

- `moveBlockToPosition()` dispatches `MOVE_BLOCKS_TO_POSITION`.
- the block-editor reducer calls `moveTo()`;
- `moveTo()` clones the order array with `[ ...array ]` and returns a new array
  through `insertAt()`;
- `updateParentInnerBlocksInTree()` rebuilds the root `innerBlocks` array with
  `.map()`;
- `getBlocks()` returns that rebuilt `innerBlocks` array to the entity/block
  editor flow.

That does not prove no other block manipulation path can reuse the exact
top-level block array object. It does explain why pass 170's natural browser
run on the current known-fixes base passed while the synthetic same-array unit
control failed.

Fresh pass-171 branch verification:

- `origin/trunk` is `73662749ec2` (`Experiment: Content types reuse
  createStatusAction (#78102)`). The 18 commits since the previous branch base
  do not touch `packages/core-data/src/utils/crdt-blocks.ts`,
  `packages/core-data/src/utils/test/crdt-blocks.ts`, the collaboration spec,
  or the sync stack.
- The explanation branch was rebased onto `73662749ec2`.
- The PR branch was rebased onto `73662749ec2` and still has the requested
  three commits: non-Playwright repros, natural-user Playwright repro, then fix.
- The focused four-test CRDT command passed, including the stale snapshot and
  same-array cache cases.
- The full `packages/core-data/src/utils/test/crdt-blocks.ts` suite passed
  (`78 passed`).
- JS lint for the touched source, unit-test, and Playwright spec files passed.
- `git diff --check HEAD~3..HEAD` passed.
- A fresh one-attempt headless Playwright run of
  `test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts`
  passed on `WP_ENV_PORT=10030` / `RTC_MANIFEST_WS_START_PORT=21440`. The saved
  `attempt-1.json` shows both editors converged to inserted paragraph, sibling
  paragraph, then emoji paragraph.

Pass 171's shortest confidence-improving experiment is narrower than pass 170's
generic recommendation: instrument the current known-fixes browser bundle
inside `mergeCrdtBlocks()` to log whether the exact same `incomingBlocks`
object identity is reused across a top-level toolbar move, List View reorder,
drag reorder, undo/redo, and pattern/group transform. If those logs show only
fresh arrays for ordinary actions, the remaining cache-only risk should be
treated as defensive-hardening rather than a likely user workflow.
