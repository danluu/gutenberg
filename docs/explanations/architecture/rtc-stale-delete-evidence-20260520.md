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

There is also a current-trunk delayed-update video later in this file. That
one uses a test-only 10-second delay between receiving a remote Yjs update and
calling `updateEntityRecord`. It is a valid timing-window repro, not a
stock-trunk repro.

## Clean repro setup

The clean worktree used for the repro is:

```text
/Users/danluu/dev/fuzz/gutenberg-stale-delete-clean-run-20260520
```

It was checked out at:

```text
2f59cd94b1ba41b004f4707ff25674506c81d796
```

This is the affected local branch state named in the PR evidence. It is not
the current PR head. Current PR head is:

```text
b67abf18ab00c4324f110897a7fbce1642130e50
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

The primary human-viewable video recorded from the clean repro setup is:

```text
/Users/danluu/dev/fuzz/gutenberg-stale-delete-clean-run-20260520/artifacts/rtc-stale-delete-valid-video-20260520-no-editor-overlays/rtc-stale-delete-websocket-no-editor-overlays-long-wait.mp4
```

This version waits 25 seconds after editor A deletes the paragraph before it
reads editor state and marks the run as reproduced. The recorder exits with an
error if editor A still has the deleted paragraph, if editor B no longer has
it, or if both editors have the same final block state. It does not inject
labels or banners into either editor page and does not activate the
disable-animations test plugin.

The final verification frame is:

```text
/Users/danluu/dev/fuzz/gutenberg-stale-delete-clean-run-20260520/artifacts/rtc-stale-delete-valid-video-20260520-no-editor-overlays/verification-frame.png
```

The frame shows editor A with three paragraphs and editor B with four
paragraphs. The extra paragraph on editor B is the deleted paragraph.

The saved final state manifest is:

```text
/Users/danluu/dev/fuzz/gutenberg-stale-delete-clean-run-20260520/artifacts/rtc-stale-delete-valid-video-20260520-no-editor-overlays/final-state.json
```

It records `reproduced: true`, `postDeleteWaitMs: 25000`, a connected
`postType/post:46` WebSocket room on both editors, editor A's three final
paragraphs, and editor B's same three paragraphs plus `A short collaborator
update.`.

Video hashes:

```text
c80250baad8e8ecd1f298d3d6602bf02ce4ebd5cb144e0f58f3e6d293d251941  rtc-stale-delete-websocket-no-editor-overlays-long-wait.mp4
89828c4fca26e51d4e8a8667729dbe1f0a7fa3c019b033df7d8612b76bbdbd4b  verification-frame.png
6697a93f95092d9034a10bff0c83dae40c6a3332b5b3ceeac6d89bd7bdb78839  final-state.json
```

The raw browser recordings are:

```text
/Users/danluu/dev/fuzz/gutenberg-stale-delete-clean-run-20260520/artifacts/rtc-stale-delete-valid-video-20260520-no-editor-overlays/raw/ca1f5c73c468159b963c7b9717b68c47.webm
/Users/danluu/dev/fuzz/gutenberg-stale-delete-clean-run-20260520/artifacts/rtc-stale-delete-valid-video-20260520-no-editor-overlays/raw/34a6d4b631ebfef42a3cc4a38530bd7d.webm
/Users/danluu/dev/fuzz/gutenberg-stale-delete-clean-run-20260520/artifacts/rtc-stale-delete-valid-video-20260520-no-editor-overlays/raw/8b986b7a7dfcd2d725c4a2f328eb4dd1.webm
```

I also have earlier recordings from the same clean setup:

```text
/Users/danluu/dev/fuzz/gutenberg-stale-delete-clean-run-20260520/artifacts/rtc-stale-delete-valid-video-20260520/rtc-stale-delete-websocket-realistic-repro.mp4
/Users/danluu/dev/fuzz/gutenberg-stale-delete-clean-run-20260520/artifacts/rtc-stale-delete-valid-video-20260520-long-wait/rtc-stale-delete-websocket-realistic-repro-long-wait.mp4
```

Those videos reproduced the bug too, but the first one only waited 6.5 seconds
after the delete, and the second one used editor-page labels for readability.
Use the no-editor-overlays long-wait video above as the strongest artifact.

## PR head control

I also ran the same no-editor-overlays, 25-second-wait video recorder on the
current PR head:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-stale-delete-fix-20260514
b67abf18ab00c4324f110897a7fbce1642130e50
```

That control did not reproduce the simple append-then-delete failure. It is
useful as a control video, not as bug evidence:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-stale-delete-fix-20260514/artifacts/rtc-stale-delete-pr-head-no-editor-overlays-20260520/rtc-stale-delete-pr-head-no-editor-overlays-long-wait.mp4
/Users/danluu/dev/fuzz/gutenberg-rtc-stale-delete-fix-20260514/artifacts/rtc-stale-delete-pr-head-no-editor-overlays-20260520/final-state.json
```

The final state manifest records `reproduced: false`; both editors ended with
the original three paragraphs after the 25-second post-delete wait. That means
the primary video above should be described as a valid affected-branch repro,
not as a current-PR-head failure video.

## Current trunk delayed-update video

I also recorded the delayed-update reproduction shape on latest `origin/trunk`
as of this run:

```text
502be98431f7beac683e85895195f3fd1be77f7b
```

For this video only, I applied a test-only 10-second delay in
`packages/sync/src/manager.ts` after the remote Yjs update is observed and
before `internal.updateEntityRecord( objectType, objectId )` runs. The video
shows:

1. Editor A creates `P3 (delete this)`.
2. Editor B sees it and deletes it.
3. Editor A receives the remote Yjs update, then edits `P1` before the delayed
   local store refresh runs.
4. After the delayed refresh, the final state contains the local edit and the
   deleted paragraph.

Video:

```text
/Users/danluu/dev/fuzz/gutenberg-current-trunk-delayed-delete-video-20260520-latest/artifacts/rtc-stale-delete-current-trunk-delayed-update-video-20260520-latest/rtc-stale-delete-current-trunk-delayed-update-repro.mp4
```

Final verification frame:

```text
/Users/danluu/dev/fuzz/gutenberg-current-trunk-delayed-delete-video-20260520-latest/artifacts/rtc-stale-delete-current-trunk-delayed-update-video-20260520-latest/verification-frame.png
```

Final state manifest:

```text
/Users/danluu/dev/fuzz/gutenberg-current-trunk-delayed-delete-video-20260520-latest/artifacts/rtc-stale-delete-current-trunk-delayed-update-video-20260520-latest/final-state.json
```

Extra validation frame, taken after Editor B's delete, after Editor A's local
edit, and before the delayed store update:

```text
/Users/danluu/dev/fuzz/gutenberg-current-trunk-delayed-delete-video-20260520-latest/artifacts/rtc-stale-delete-current-trunk-delayed-update-video-20260520-latest/validation-frames/after-delete-before-update.png
```

That validation frame matters because it shows the delete really happened:
Editor B no longer shows `P3`, while Editor A still has stale local state and
has already changed `P1`.

The final state manifest records:

```text
reproduced: true
delayedUpdatePatch: true
remoteAppliedAt: 2026-05-20T22:44:31.807Z
localEditAt: 2026-05-20T22:44:33.919Z
applyingUpdateAt: 2026-05-20T22:44:41.806Z
finalReadAt: 2026-05-20T22:44:50.117Z
paragraphsA: ["P1 - User A makes local changes", "P2", "P3 (delete this)"]
paragraphsB: ["P1 - User A makes local changes", "P2", "P3 (delete this)"]
```

Hashes:

```text
2fbe59b07325869fc66823b86e10dd5273ff1c3ceb8245a5bef0a63b4689690d  rtc-stale-delete-current-trunk-delayed-update-repro.mp4
703921fad23b8c9af196f35a74b1ff263258695496d2526fe1968629a882764c  verification-frame.png
f65d7e3e61a2b0701beca6406e47920e3621fb88709b9cd7835b7bec09d9812e  final-state.json
326509ef7842c89ff00be452122c16d7bdc0ec813b2af4e0d86e2096587d7058  validation-frames/after-delete-before-update.png
```

I had also recorded the same delayed-update shape earlier on
`9cd9fa50ee042622cccaff60866c2b9d9ba6b818`. That video reproduced too, but
`origin/trunk` moved after that recording, so the `502be98431f7` run above is
the one to use for latest-trunk wording.

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

1. Run the delayed-update reproduction shape against the PR branch.
2. Save pass/fail counts for each branch.

The clean repro and video above are enough to show the bug locally without
depending on any external recording.
