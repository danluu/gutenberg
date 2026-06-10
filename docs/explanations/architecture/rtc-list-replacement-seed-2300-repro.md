# RTC List Replacement Repro: Seed 2300

This documents the published, checkoutable repro for the list replacement failure observed by the seed 2300 RTC oracle. The repro is e2e-first: the important path is the deterministic seed, revision restore, RTC reload, and save oracle.

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

The assertion fails if the RTC editor, or the post persisted after the RTC save, still contains the later list replacement markers instead of the restored revision content. On a fix, the same command should pass without weakening the revision/content assertions.

## Video Evidence

Primary local video:

```text
/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/repro-visible-seed-2300-20260610T195150Z/visible-editor-capture-probe/constant-panels-repro-seed-2300.webm
```

This is a constant-panel stitched video. It keeps the same four evidence screens visible for the whole video while the annotated log advances:

- The upper-left panel is the original Playwright recording from the fresh failing seed run.
- The lower-left panel keeps all three editor pages visible at the invariant failure.
- The middle panel keeps the post-reload visual editor on the duplicated list content.
- The right panel keeps the post-reload code view on the duplicated block markup.
- The lower log records the seed path and the oracle counts without cutting between screen layouts.
- The video is intentionally based on the fresh failing run artifacts, not a hand-written mockup.

Sampled verification frames from the same render:

```text
/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/repro-visible-seed-2300-20260610T195150Z/visible-editor-capture-probe/constant-panels-frame-5s.png
/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/repro-visible-seed-2300-20260610T195150Z/visible-editor-capture-probe/constant-panels-frame-20s.png
/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/repro-visible-seed-2300-20260610T195150Z/visible-editor-capture-probe/constant-panels-frame-38s.png
/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/repro-visible-seed-2300-20260610T195150Z/visible-editor-capture-probe/constant-panels-frame-49s.png
```

## Observed Failure

Fresh visible rerun:

```text
/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/repro-visible-seed-2300-20260610T195150Z
```

The run failed on the initial attempt and both retries at `reload-convergence step 5` for seed `2300`. The post persisted by WordPress still had one copy of each `rtc-list-2300-{first,second,third}-{1,2,3}` marker after the revision restore, but the reloaded RTC editor state reported two copies of every marker on all three editor pages. That is the mismatch the oracle uses: the server-side restored post content is single-copy, while the RTC editor state reloads duplicate list content and would save the duplicated state back.
