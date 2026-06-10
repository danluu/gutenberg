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

- First bad: `85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5`, "RTC: Attach sync observers after hydrating persisted CRDT doc (#77966)".
- First-parent parent: `64575b44eb6a18f9324a84a634d70ddbaee3b748`, "RTC: Fix compaction unit test (#77986)".
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

Conclusion: cite `85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5` as the confirmed first bad commit for the original broad fuzzer/original wp-env endpoint. Do not cite `05bf6da85b4d5ec7465f59c0c915614bddbae70d` as the first bad commit. The focused published command still needs follow-up because it passes even though the broader original endpoint reproduces.
