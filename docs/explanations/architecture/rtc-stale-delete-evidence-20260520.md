# RTC stale-delete evidence, 2026-05-20

This is the evidence packet for the stale-delete RTC bug. It uses a clean
checkout, an executable browser repro, and a video recorded from that same
setup.

## What it shows

Two editors open the same post through the WebSocket RTC provider. Editor B
adds a paragraph at the end. Both editors see the paragraph. Editor A then
deletes that paragraph through the block options menu.

Expected result: both editors go back to the original three paragraphs.

Actual result in the clean repro: editor A has the original three paragraphs,
while editor B still has the paragraph that editor A deleted.

## Clean repro setup

The clean worktree used for the repro is:

```text
/Users/danluu/dev/fuzz/gutenberg-stale-delete-clean-run-20260520
```

It was checked out at:

```text
2f59cd94b1ba41b004f4707ff25674506c81d796
```

I built it with:

```bash
npm ci
npm run build -- --skip-types
```

The test environment was:

```text
wp-env: http://localhost:8973
WP_ENV_PORT: 8973
RTC websocket: ws://127.0.0.1:18991
```

The branch containing this file also contains the repro test:

```text
test/e2e/specs/editor/collaboration/websocket/collaboration-triage-3ac375556552-realistic.spec.ts
```

## Executable repro

Command used for the saved clean run:

```bash
rm -rf /Users/danluu/dev/fuzz/gutenberg-stale-delete-clean-run-20260520/artifacts/rtc-stale-delete-valid-repro-20260520-delete-fixed &&
mkdir -p /Users/danluu/dev/fuzz/gutenberg-stale-delete-clean-run-20260520/artifacts/rtc-stale-delete-valid-repro-20260520-delete-fixed/results \
         /Users/danluu/dev/fuzz/gutenberg-stale-delete-clean-run-20260520/artifacts/rtc-stale-delete-valid-repro-20260520-delete-fixed/playwright &&
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 \
GUTENBERG_RTC_TEST_WS_PORT=18991 \
WP_ENV_PORT=8973 \
WP_BASE_URL=http://localhost:8973 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-stale-delete-clean-run-20260520/artifacts/rtc-stale-delete-valid-repro-20260520-delete-fixed/playwright \
RTC_3AC3_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-stale-delete-clean-run-20260520/artifacts/rtc-stale-delete-valid-repro-20260520-delete-fixed/results \
npm exec --workspace @wordpress/e2e-tests-playwright -- wp-scripts test-playwright \
  --config /Users/danluu/dev/fuzz/gutenberg-stale-delete-clean-run-20260520/test/e2e/playwright.rtc-websocket.config.ts \
  /Users/danluu/dev/fuzz/gutenberg-stale-delete-clean-run-20260520/test/e2e/specs/editor/collaboration/websocket/collaboration-triage-3ac375556552-realistic.spec.ts \
  --project=chromium \
  --grep "append-from-tail-enter"
```

That run reproduced the bug in all three attempts. The Playwright test fails
on purpose when it sees the stale-delete bug:

```text
3 failed
expect(reproduced).toBe(false)
Received: true
```

Saved result files:

```text
/Users/danluu/dev/fuzz/gutenberg-stale-delete-clean-run-20260520/artifacts/rtc-stale-delete-valid-repro-20260520-delete-fixed/results/append-from-tail-enter-attempt-0.json
/Users/danluu/dev/fuzz/gutenberg-stale-delete-clean-run-20260520/artifacts/rtc-stale-delete-valid-repro-20260520-delete-fixed/results/append-from-tail-enter-attempt-1.json
/Users/danluu/dev/fuzz/gutenberg-stale-delete-clean-run-20260520/artifacts/rtc-stale-delete-valid-repro-20260520-delete-fixed/results/append-from-tail-enter-attempt-2.json
```

All three have:

```text
statesEqualAfterInsert: true
statesEqualAfterDelete: false
exactDeleteBug: true
semanticDeleteBug: true
insertedPresentAfterDelete: true
primaryContainsInsertedAfterDelete: false
secondaryContainsInsertedAfterDelete: true
reproduced: true
```

In attempt 0, editor A ends with the original three paragraph blocks. Editor B
ends with those same three paragraph blocks plus:

```text
Seed 954092 realistic append-from-tail-enter 0 paragraph
```

That paragraph is the one editor A deleted.

Playwright traces and screenshots for the clean run are under:

```text
/Users/danluu/dev/fuzz/gutenberg-stale-delete-clean-run-20260520/artifacts/rtc-stale-delete-valid-repro-20260520-delete-fixed/playwright
```

## Video

The human-viewable video recorded from the clean repro setup is:

```text
/Users/danluu/dev/fuzz/gutenberg-stale-delete-clean-run-20260520/artifacts/rtc-stale-delete-valid-video-20260520/rtc-stale-delete-websocket-realistic-repro.mp4
```

The final verification frame is:

```text
/Users/danluu/dev/fuzz/gutenberg-stale-delete-clean-run-20260520/artifacts/rtc-stale-delete-valid-video-20260520/verification-frame.png
```

The frame shows editor A with three paragraphs and editor B with four
paragraphs. The extra paragraph on editor B is the deleted paragraph.

The raw browser recordings are:

```text
/Users/danluu/dev/fuzz/gutenberg-stale-delete-clean-run-20260520/artifacts/rtc-stale-delete-valid-video-20260520/raw/25ad617b39321f39f511e138d10ff895.webm
/Users/danluu/dev/fuzz/gutenberg-stale-delete-clean-run-20260520/artifacts/rtc-stale-delete-valid-video-20260520/raw/972bb3d293e081e1d21d9db9c71af313.webm
/Users/danluu/dev/fuzz/gutenberg-stale-delete-clean-run-20260520/artifacts/rtc-stale-delete-valid-video-20260520/raw/2184e9e88affac988b2023a33532899d.webm
```

## Why the earlier visible run did not reproduce

The earlier visible run was useful as a control, but it was not the same as
this clean repro. It was recorded from the dirty main worktree, which was at
the same commit hash but also had uncommitted RTC changes in the checkout. It
also used the normal no-delay path.

The clean repro above removes those variables: fresh worktree, local
dependencies installed in that worktree, production build, wp-env on a known
port, and the WebSocket port that the test plugin actually uses.

There was also one invalid run during setup where the Playwright process used
port `19273`, while the PHP-side test plugin still pointed the editor at the
default `18991`. That produced a connection-lost screen, so it is not counted
as evidence.

The repro test also needed one selector fix. The delete action now scopes the
menu item lookup to `.components-popover`, because the admin bar can also
match text containing "Delete" and make the locator ambiguous.

## Lower-level check

The lower-level current-trunk probe is still useful background:

```text
/Users/danluu/dev/fuzz/gutenberg/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-14-20260502T225744Z/.triage-watcher/signatures/3ac375556552/unit-current-origin-trunk-2b5a7a99304/stale-top-level-family-probe-result.json
```

It reproduced both sides of the same stale full-snapshot ambiguity on
`origin/trunk` at `2b5a7a9930490b13933a89c69f4455252072c14d`:

```text
remoteAppend.lostRemoteAppend: true
remoteDelete.resurrectedRemoteDelete: true
```

This does not replace the browser repro. It explains why the browser failure
is plausible: when a peer receives a full block snapshot that omits a block,
the sync layer can mistake "I deleted this block" for "I never saw this
block."

## Remaining checks

The remaining useful checks are:

1. Run the same browser repro on latest `trunk`.
2. Run the same browser repro on the PR branch.
3. Save pass/fail counts for each branch.

The clean repro and video above are enough to show the bug locally without
depending on any external recording.
