# RTC List Replacement Repro: Seed 2300

This documents the published, checkoutable repro attempt for the list replacement failure observed by the seed 2300 RTC oracle. The repro is e2e-first: the important path is the deterministic seed, revision restore, RTC reload, and save oracle.

Post-publication verification on 2026-06-10 found that the published focused command currently passes in a clean checkout and in the original repro environment. The original broad fuzzer endpoint still reproduces, and a first-parent bisect of that endpoint confirmed `85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5` as the first bad commit. See [Bisect Check](#bisect-check) before citing a breaking commit.

## Published Repro Code

- Branch: https://github.com/danluu/gutenberg/tree/danluu/rtc-list-replacement-seed-2300-repro
- Exact commit: https://github.com/danluu/gutenberg/commit/237463e9a9ce0dae92133c2c8e1a7de5343b036f
- Base commit: `dc92ba4293c Fix code editor cursor jump on remote RTC updates (#79005)`

Important files at the published commit:

- Spec: https://github.com/danluu/gutenberg/blob/237463e9a9ce0dae92133c2c8e1a7de5343b036f/test/e2e/specs/editor/collaboration/collaboration-list-revision-oracle-fuzz.spec.ts
- Collaboration helper changes: https://github.com/danluu/gutenberg/blob/237463e9a9ce0dae92133c2c8e1a7de5343b036f/test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts
- Focused Playwright config: https://github.com/danluu/gutenberg/blob/237463e9a9ce0dae92133c2c8e1a7de5343b036f/test/e2e/playwright.rtc-repro-video.config.ts
- Atomic-site shim plugin: https://github.com/danluu/gutenberg/blob/237463e9a9ce0dae92133c2c8e1a7de5343b036f/packages/e2e-tests/mu-plugins/atomic-site-shim.php

## Checkout

```bash
git remote add danluu git@github.com:danluu/gutenberg.git # if needed
git fetch danluu danluu/rtc-list-replacement-seed-2300-repro
git checkout --detach 237463e9a9ce0dae92133c2c8e1a7de5343b036f
npm install
composer install
```

## Run

Check the test environment status first, then start it only if it is not already running:

```bash
npm run wp-env-test status
npm run wp-env-test start
```

Run only the focused seed 2300 repro. The config and spec paths are relative to Gutenberg's `test/e2e` workspace because `npm run test:e2e` delegates to that workspace:

```bash
WP_BASE_URL=http://localhost:8889 \
WP_ARTIFACTS_PATH="${TMPDIR:-/tmp}/gutenberg-rtc-list-replacement-seed-2300" \
STORAGE_STATE_PATH="${TMPDIR:-/tmp}/gutenberg-rtc-list-replacement-seed-2300/storage-states/admin.json" \
GUTENBERG_RTC_BROWSER_ATOMIC_SITE_SHIM=1 \
GUTENBERG_RTC_BROWSER_SEED_START=2300 \
GUTENBERG_RTC_BROWSER_SEED_COUNT=1 \
GUTENBERG_RTC_BROWSER_CONVERGENCE_TIMEOUT_MS=20000 \
GUTENBERG_RTC_BROWSER_DISCOVERY_TIMEOUT_MS=30000 \
npm run test:e2e -- --config=playwright.rtc-repro-video.config.ts --project=chromium specs/editor/collaboration/collaboration-list-revision-oracle-fuzz.spec.ts
```

## Oracle

The spec saves an old revision containing sentinel list content, saves a later edit that replaces a list item and appends extra blocks, restores the old revision through REST, reloads the RTC editor, and saves again.

The assertion is intended to fail if the RTC editor, or the post persisted after the RTC save, still contains the later list replacement markers instead of the restored revision content. As noted in [Bisect Check](#bisect-check), the currently published focused command passed during verification and therefore was not used as the bad side of the confirmed bisect. The confirmed bisect used the original broad fuzzer endpoint that still reproduces the marker-duplication failure.

## Video Evidence

Primary local video:

```text
/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/repro-multipanel-fuzz-seed-2300-20260610T204223Z/actual-failure-screens-self-heal-repro-seed-2300.webm
```

This is a 3840x2160 moving-panel stitched video. It keeps all major panels visible over time:

- The top row starts with three moving editor videos from the same failing fuzz run, then switches at the failure point to the exact Playwright failure screenshots: `test-failed-1.png`, `test-failed-2.png`, and `test-failed-3.png`.
- The bottom-left panel is a large same-seed visible inspection artifact that scrolls the duplicated visual lists and then switches to code view.
- The bottom-right panel records the synchronized seed path and shows the actual oracle error: `RTC editor invariant failure during reload-convergence step 5`.
- The final section keeps the failure state on screen with a wait timer. The duplicated markers do not self-heal: post-reload edited content equals serialized content, all pages have the same canonical hash, and the same-seed code view continues to show duplicated list markup.
- The video is intentionally based on the fresh failing run artifacts, not a hand-written mockup.

Sampled verification frames from the same render:

```text
/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/repro-multipanel-fuzz-seed-2300-20260610T204223Z/actual-failure-screens-frame-5s.png
/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/repro-multipanel-fuzz-seed-2300-20260610T204223Z/actual-failure-screens-frame-48s.png
/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/repro-multipanel-fuzz-seed-2300-20260610T204223Z/actual-failure-screens-frame-62s.png
/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/repro-multipanel-fuzz-seed-2300-20260610T204223Z/actual-failure-screens-frame-72s.png
```

## Observed Failure

Fresh visible rerun:

```text
/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/repro-visible-seed-2300-20260610T195150Z
```

The run failed on the initial attempt and both retries at `reload-convergence step 5` for seed `2300`. The post persisted by WordPress still had one copy of each `rtc-list-2300-{first,second,third}-{1,2,3}` marker after the revision restore, but the reloaded RTC editor state reported two copies of every marker on all three editor pages. That is the mismatch the oracle uses: the server-side restored post content is single-copy, while the RTC editor state reloads duplicate list content and would save the duplicated state back.

## Bisect Check

Status: breaking commit confirmed for the original broad fuzzer endpoint, not for the published focused command.

On 2026-06-10, the published checkoutable focused repro was rebuilt and rerun before bisecting. That command did not reproduce:

- Exact published repro commit `237463e9a9ce0dae92133c2c8e1a7de5343b036f`, rebuilt in `/tmp/gutenberg-trunk-list-replace-fuzz-20260610`, wp-env at `http://localhost:8898`: the documented command passed.
- Same documented command in the original repro worktree `/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610`, wp-env at `http://localhost:8889`: passed.

Artifacts:

```text
/tmp/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/published-237463-seed-2300-20260610T134541
/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/published-command-original-env-2300-20260610T134629
```

The earlier broad fuzzer command still reproduced the marker-duplication failure in the original `8889` environment, even with revision restore disabled:

```text
/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/repro-2300-norev-20260610T131556
```

However, the same broad fuzzer check passed in clean rebuilt wp-env worktrees, including a same-basename worktree. A parent/child product-code check around the previously suspected trunk commit also passed on both sides in the clean rebuilt environment:

- Parent `4c728f9aa8af2b4fdcca0c55d175acd9420dbaa6`: passed.
- Child `05bf6da85b4d5ec7465f59c0c915614bddbae70d` / PR #78891, "RTC: Add separate doc persistence endpoint": passed.

Artifacts:

```text
/tmp/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/tmp-sameslug-parent-4c728f9-norev-2300-20260610T133540
/tmp/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/tmp-sameslug-child-05bf6da-norev-2300-20260610T133853
```

That clean-environment check means `05bf6da85b4d5ec7465f59c0c915614bddbae70d` should not be cited as the confirmed breaking commit for seed `2300`.

The original reproducing worktree and wp-env did provide a valid bad endpoint for the broad fuzzer. A first-parent bisect from known-good `e1e460ae2c8224cf9b3772a4a578cb7c1b4a009f` to known-bad `fb04417bf884258e7f86f9488832b526a4a013c76` found:

- First bad: [`85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5`](https://github.com/WordPress/gutenberg/commit/85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5), "RTC: Attach sync observers after hydrating persisted CRDT doc" ([PR #77966](https://github.com/WordPress/gutenberg/pull/77966)).
- First-parent parent: [`64575b44eb6a18f9324a84a634d70ddbaee3b748`](https://github.com/WordPress/gutenberg/commit/64575b44eb6a18f9324a84a634d70ddbaee3b748), "RTC: Fix compaction unit test" ([PR #77986](https://github.com/WordPress/gutenberg/pull/77986)).
- Changed file: `packages/sync/src/manager.ts`.

Confirmation runs with the stable broad fuzzer classifier:

- Parent `64575b44eb6a18f9324a84a634d70ddbaee3b748`: passed.
- Child `85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5`: failed with `RTC editor invariant failure during reload-convergence step 5` and `list-revision-replacement-marker-isolation`.

Artifacts:

```text
/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/bisect-seed-2300/64575b44eb6a-20260610T152259
/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/bisect-seed-2300/85cbd148b1c7-20260610T152652
```

Bisect classifier details: the confirmed bisect used `WP_BASE_URL=http://localhost:8889`, `GUTENBERG_RTC_BROWSER_ACTION_PROFILE=list-revision-replacement`, seed `2300`, `GUTENBERG_RTC_BROWSER_STEPS=14`, `GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE=shadow`, `GUTENBERG_RTC_BROWSER_SKIP_GLOBAL_POST_CLEANUP=1`, and `GUTENBERG_RTC_BROWSER_DISABLE_REVISION_RESTORE=1`. The harness was recovered from the original reproducer overlay and patched only to tolerate absent optional RTC websocket provider test plugins on older commits.

## How the Bug Was Introduced

The breaking commit is small: [PR #77966](https://github.com/WordPress/gutenberg/pull/77966) moved the sync-manager record/state observers from before persisted CRDT hydration to after hydration. Before the commit, `loadEntity()` attached `recordMap.observeDeep( onRecordUpdate )` and `stateMap.observe( onStateMapUpdate )` before `initializeYjsDoc()` and `internal.applyPersistedCrdtDoc()` ([parent code](https://github.com/WordPress/gutenberg/blob/64575b44eb6a18f9324a84a634d70ddbaee3b748/packages/sync/src/manager.ts#L289-L297)). After the commit, it initializes and hydrates the live Y.Doc first, then attaches observers ([child code](https://github.com/WordPress/gutenberg/blob/85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5/packages/sync/src/manager.ts#L289-L301)).

That change was intended to remove what looked like a redundant store update. The commit message says the hydration update ran `_updateEntityRecord` on the same `applyUpdateV2` that loaded the persisted CRDT doc, and that this dispatched an `editRecord` whose blocks already matched the editor's parsed content. That is true at the HTML/content level, but the fuzzer shows the update was not behaviorally redundant. It was also the only post-hydration path that normalized the editor's in-memory block tree onto the hydrated CRDT block tree before the next local list edit.

The relevant data flow is:

1. `loadEntity()` creates the live Y.Doc, connects providers, and hydrates from the persisted CRDT document.
2. `internal.applyPersistedCrdtDoc()` deserializes the saved `_crdt_document` into a temporary Y.Doc. `deserializeCrdtDoc()` marks that temporary doc with `CRDT_DOC_META_PERSISTENCE_KEY` / `fromPersistence=true` ([utils.ts](https://github.com/WordPress/gutenberg/blob/85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5/packages/sync/src/utils.ts#L77-L91)).
3. The temporary doc is encoded and applied to the live Y.Doc with `Y.applyUpdateV2( targetDoc, update )` ([manager.ts](https://github.com/WordPress/gutenberg/blob/85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5/packages/sync/src/manager.ts#L494-L503)).
4. The sync manager compares the temporary persisted doc against the current entity record with `getChangesFromCRDTDoc( tempDoc, record )`; if any keys are invalidated, it applies the current record values back into the live Y.Doc and asks core-data to persist a new CRDT document ([manager.ts](https://github.com/WordPress/gutenberg/blob/85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5/packages/sync/src/manager.ts#L505-L547)).
5. Separately, when `recordMap.observeDeep` sees a non-local CRDT update, it calls `internal.updateEntityRecord()`, which computes changes from the live Y.Doc and dispatches `handlers.editRecord( changes )` ([manager.ts](https://github.com/WordPress/gutenberg/blob/85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5/packages/sync/src/manager.ts#L209-L223), [manager.ts](https://github.com/WordPress/gutenberg/blob/85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5/packages/sync/src/manager.ts#L611-L642)).

Before [PR #77966](https://github.com/WordPress/gutenberg/pull/77966), step 5 ran during persisted-doc hydration because [PR #74753](https://github.com/WordPress/gutenberg/pull/74753) deliberately stopped wrapping the persisted-doc `applyUpdateV2` in a local-origin transaction ([commit `c3fdb79fdaf38007f0846f2143609d5162f7c7dc`](https://github.com/WordPress/gutenberg/commit/c3fdb79fdaf38007f0846f2143609d5162f7c7dc)). The observer therefore treated hydration like a remote Yjs update. `_updateEntityRecord()` then compared the live Y.Doc to the current edited record and called `editRecord()` if the Y.Doc had changes.

For `blocks`, the comparison is intentionally asymmetric. `getPostChangesFromCRDTDoc()` only performs the persisted-doc HTML comparison when the CRDT doc has the transient `fromPersistence` metadata. In that case, it serializes the persisted CRDT blocks and compares them to the server record's raw `content` ([crdt.ts](https://github.com/WordPress/gutenberg/blob/85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5/packages/core-data/src/utils/crdt.ts#L321-L349)). The live Y.Doc does not have `fromPersistence=true`, so the same `blocks` key falls through to `return true` ([crdt.ts](https://github.com/WordPress/gutenberg/blob/85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5/packages/core-data/src/utils/crdt.ts#L339-L352)). That makes `_updateEntityRecord()` dispatch hydrated CRDT blocks into the editor store whenever the live Y.Doc carries a `blocks` entry.

That dispatch was the side effect [PR #77966](https://github.com/WordPress/gutenberg/pull/77966) removed. The commit treated it as duplicate work because the editor's parsed blocks and the CRDT blocks usually serialize to the same post content. The missing case is that identical serialized content is not the same as identical runtime state. CRDT blocks are deserialized through `deserializeBlockAttributes()` so rich-text attributes regain the runtime shape expected by block edit components ([PR #76607](https://github.com/WordPress/gutenberg/pull/76607), [commit `2af539b7da5c3d4d3993924e3b94104c18e0e821`](https://github.com/WordPress/gutenberg/commit/2af539b7da5c3d4d3993924e3b94104c18e0e821)). The block merge code then mutates an existing Y.Array by left/right structural diff, recursive inner-block merge, middle-section delete/insert, and duplicate-clientId cleanup ([crdt-blocks.ts](https://github.com/WordPress/gutenberg/blob/85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5/packages/core-data/src/utils/crdt-blocks.ts#L424-L650)). If the editor store is still using a freshly parsed block tree while the live Y.Doc is using a hydrated persisted block tree, the next list replacement can be merged against a structurally similar but not fully synchronized tree. In seed `2300`, that merge leaves the old list markers in place and inserts the replacement list path as well, yielding two copies of every `rtc-list-2300-{first,second,third}-{1,2,3}` marker after reload convergence.

The earlier persisted-CRDT work made this interaction possible:

- [PR #74668](https://github.com/WordPress/gutenberg/pull/74668), [`50b0a31ec012cf262960e52a252428c4a50a7a2d`](https://github.com/WordPress/gutenberg/commit/50b0a31ec012cf262960e52a252428c4a50a7a2d), changed hydration to "apply only detected changes" from the current record instead of always replacing the CRDT state. That made the persisted CRDT document authoritative when its serialized blocks matched the current record.
- [PR #74753](https://github.com/WordPress/gutenberg/pull/74753), [`c3fdb79fdaf38007f0846f2143609d5162f7c7dc`](https://github.com/WordPress/gutenberg/commit/c3fdb79fdaf38007f0846f2143609d5162f7c7dc), made persisted-doc hydration a non-local Yjs update. With observers attached before hydration, that non-local update triggered the editor-store synchronization path.
- [PR #75975](https://github.com/WordPress/gutenberg/pull/75975), [`8051e14451cf85c5e6713bf2098149f30229e47b`](https://github.com/WordPress/gutenberg/commit/8051e14451cf85c5e6713bf2098149f30229e47b), made CRDT serialization wait for deferred Y.Doc updates before save. That strengthened the persistence path and made stale or partially flushed CRDT documents less likely, but it also means the post-save `_crdt_document` is expected to be the source of truth on reload.
- [PR #77966](https://github.com/WordPress/gutenberg/pull/77966), [`85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5`](https://github.com/WordPress/gutenberg/commit/85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5), removed the hydration observer side effect without adding an explicit replacement synchronization step.

The fix direction should not be to reintroduce accidental observer timing. A safer fix would make the load sequence explicit: after persisted CRDT hydration and any invalidation repair, decide whether the edited record must be updated from the live Y.Doc, and perform that update through a named path with tests. The regression test should cover a persisted CRDT reload followed by a nested/list item replacement, then assert both the editor block tree and the saved post content contain exactly one copy of each sentinel marker.

Conclusion: cite `85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5` as the confirmed first bad commit for the original broad fuzzer/original wp-env endpoint. Do not cite `05bf6da85b4d5ec7465f59c0c915614bddbae70d` as the first bad commit. The focused published command still needs follow-up because it passes even though the broader original endpoint reproduces.
