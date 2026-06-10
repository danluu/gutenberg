# RTC List Replacement Repro: Seed 2300

This documents the published, checkoutable repro attempt for the list replacement failure observed by the seed 2300 RTC oracle. The repro is e2e-first: the important path is the deterministic seed, revision restore, RTC reload, and save oracle.

Post-publication verification on 2026-06-10 found that the published command currently passes in a clean checkout and in the original repro environment. See [Bisect Check](#bisect-check) before using this as a failing endpoint.

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

The assertion is intended to fail if the RTC editor, or the post persisted after the RTC save, still contains the later list replacement markers instead of the restored revision content. As noted in [Bisect Check](#bisect-check), the currently published command passed during verification and therefore cannot yet serve as the bad side of a product-code bisect.

## Video Evidence

Primary local video:

```text
/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/repro-multipanel-fuzz-seed-2300-20260610T204223Z/highres-self-heal-repro-seed-2300-v2.webm
```

This is a 3840x2160 moving-panel stitched video. It keeps all major panels visible over time:

- The top row contains three moving editor videos from the same failing fuzz run, aligned so the pages reach the failure together.
- The bottom-left panel is a large same-seed visible inspection artifact that scrolls the duplicated visual lists and then switches to code view.
- The bottom-right panel records the synchronized seed path and oracle transition.
- The final section keeps the failure state on screen with a wait timer. The duplicated markers do not self-heal: post-reload edited content equals serialized content, all pages have the same canonical hash, and the same-seed code view continues to show duplicated list markup.
- The video is intentionally based on the fresh failing run artifacts, not a hand-written mockup.

Sampled verification frames from the same render:

```text
/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/repro-multipanel-fuzz-seed-2300-20260610T204223Z/highres-self-heal-v2-frame-5s.png
/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/repro-multipanel-fuzz-seed-2300-20260610T204223Z/highres-self-heal-v2-frame-47s.png
/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/repro-multipanel-fuzz-seed-2300-20260610T204223Z/highres-self-heal-v2-frame-62s.png
/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/repro-multipanel-fuzz-seed-2300-20260610T204223Z/highres-self-heal-v2-frame-72s.png
```

## Observed Failure

Fresh visible rerun:

```text
/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/repro-visible-seed-2300-20260610T195150Z
```

The run failed on the initial attempt and both retries at `reload-convergence step 5` for seed `2300`. The post persisted by WordPress still had one copy of each `rtc-list-2300-{first,second,third}-{1,2,3}` marker after the revision restore, but the reloaded RTC editor state reported two copies of every marker on all three editor pages. That is the mismatch the oracle uses: the server-side restored post content is single-copy, while the RTC editor state reloads duplicate list content and would save the duplicated state back.

## Bisect Check

Status: no breaking commit confirmed.

On 2026-06-10, the published checkoutable repro was rebuilt and rerun before bisecting. The bad endpoint required for a valid `git bisect` did not reproduce:

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

However, the same broad fuzzer check passed in clean rebuilt wp-env worktrees, including a same-basename worktree. A parent/child product-code check around the previously suspected trunk commit also passed on both sides:

- Parent `4c728f9aa8af2b4fdcca0c55d175acd9420dbaa6`: passed.
- Child `05bf6da85b4d5ec7465f59c0c915614bddbae70d` / PR #78891, "RTC: Add separate doc persistence endpoint": passed.

Artifacts:

```text
/tmp/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/tmp-sameslug-parent-4c728f9-norev-2300-20260610T133540
/tmp/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/tmp-sameslug-child-05bf6da-norev-2300-20260610T133853
```

Conclusion: do not cite `05bf6da85b4d5ec7465f59c0c915614bddbae70d` as the confirmed breaking commit for seed `2300`. The visible failure artifacts remain useful evidence, but the published command must first be made to fail from a clean checkout before a product-code bisect can produce a defensible introduction commit.
