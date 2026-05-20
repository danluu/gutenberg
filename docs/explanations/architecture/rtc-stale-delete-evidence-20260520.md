# RTC stale-delete evidence, 2026-05-20

This is the evidence packet I would use for PR #78320 without relying on
anyone else's video. It is intentionally short and explicit about what is
proven, what is only a control, and what still needs a better rerun.

## Status

I do not currently have a reliable failing hand-recorded video for this bug.
The best self-contained evidence is an automated browser repro that uses
normal editor actions with two users and the WebSocket RTC provider. I also
have a lower-level trunk probe for the same stale full-snapshot ambiguity.

The branch containing this file also contains the browser repro test at:

```text
test/e2e/specs/editor/collaboration/websocket/collaboration-triage-3ac375556552-realistic.spec.ts
```

## Bug

One collaborator appends a paragraph. Both editors see it. Another
collaborator deletes that paragraph through the normal block UI. The expected
state is the original paragraphs, with the inserted paragraph gone.

The failing behavior is that the inserted paragraph can survive on one peer,
or after a longer wait both peers can converge to the wrong state with the
deleted paragraph present.

## Executable Repro

The repro test creates a draft with three ordinary paragraph blocks, opens it
as two users, appends a paragraph in the second editor, waits until both
editors agree, deletes that paragraph in the first editor, and then checks the
post state in both editors.

Command used for the saved run:

```bash
GUTENBERG_RTC_BROWSER_SKIP_GLOBAL_POST_CLEANUP=1 \
GUTENBERG_RTC_BROWSER_ASSUME_WP_ENV_RUNNING=1 \
GUTENBERG_RTC_TEST_WS_PORT=19152 \
WP_ENV_PORT=8963 \
WP_BASE_URL=http://localhost:8963 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-14-20260502T225744Z/.triage-watcher/signatures/3ac375556552/playwright-artifacts \
RTC_3AC3_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-14-20260502T225744Z/.triage-watcher/signatures/3ac375556552/realistic-results \
npm exec --workspace @wordpress/e2e-tests-playwright -- wp-scripts test-playwright \
  --config /Users/danluu/dev/fuzz/gutenberg/test/e2e/playwright.rtc-websocket.config.ts \
  test/e2e/specs/editor/collaboration/websocket/collaboration-triage-3ac375556552-realistic.spec.ts \
  --project=chromium
```

Saved failing result:

```text
/Users/danluu/dev/fuzz/gutenberg/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-14-20260502T225744Z/.triage-watcher/signatures/3ac375556552/realistic-results/append-from-tail-enter-attempt-0.json
```

That result has `statesEqualAfterInsert: true`,
`statesEqualAfterDelete: false`, `exactDeleteBug: true`, and
`reproduced: true`. In plain terms: both editors agreed after the insert, then
after the delete one editor had the original three paragraphs and the other
still had the deleted paragraph.

Longer-wait result:

```text
/Users/danluu/dev/fuzz/gutenberg/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-14-20260502T225744Z/.triage-watcher/signatures/3ac375556552/realistic-results-long-wait-60000-current/append-from-tail-enter-attempt-0.json
```

That run waited 60 seconds after the delete. It has
`statesEqualAfterDelete: true`, `semanticDeleteBug: true`, and
`insertedPresentAfterDelete: true`. In that run, the editors eventually agreed,
but they agreed on the wrong state: the deleted paragraph was still present.

## Manual Shape

The automated repro is doing these human actions:

1. Start `wp-env` and the RTC WebSocket test server.
2. Enable collaboration and the RTC WebSocket provider plugin.
3. Create a draft post with three paragraph blocks.
4. Open the post as user A and user B.
5. User B appends a paragraph at the end using normal keyboard input.
6. Wait until user A and user B both show the inserted paragraph.
7. User A selects that paragraph and deletes it from the block options menu.
8. Wait for collaboration to settle.
9. Expected: both editors show the original three paragraphs.
10. Failing result: the deleted paragraph remains on one editor, or comes back
    on both editors after a longer wait.

I would not present those as a reliable manual repro yet. The test has the
timing and state checks needed to make the sequence repeatable; a person
clicking through the same steps has not been reliable enough in my local
runs.

## Current Video State

I tried to make a local human-viewable video for the normal WebSocket flow.
The useful recordings are controls, not failing proof:

```text
/Users/danluu/dev/fuzz/gutenberg/artifacts/rtc-stale-delete-video/rtc-stale-delete-websocket-realistic-repro.mp4
```

This is the normal no-delay visible flow. It did not reproduce locally.

```text
/Users/danluu/dev/fuzz/gutenberg/artifacts/rtc-stale-delete-long-wait-video/rtc-stale-delete-long-wait-wrong-convergence.mp4
```

This was recorded on 2026-05-20 with two editor panes and a step log. It also
did not reproduce: after 60 seconds both editors were back to three
paragraphs. The final frame is:

```text
/Users/danluu/dev/fuzz/gutenberg/artifacts/rtc-stale-delete-long-wait-video/verification-frame.png
```

There was also one invalid setup recording before I fixed the WebSocket port
mismatch. It showed the collaboration connection-lost screen, so I discarded
it rather than listing it as evidence.

## Lower-level Check

The current-trunk family probe I have saved is:

```text
/Users/danluu/dev/fuzz/gutenberg/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-14-20260502T225744Z/.triage-watcher/signatures/3ac375556552/unit-current-origin-trunk-2b5a7a99304/stale-top-level-family-probe-result.json
```

It reproduced both sides of the same stale-snapshot problem on
`origin/trunk` at `2b5a7a9930490b13933a89c69f4455252072c14d`:

```text
remoteAppend.lostRemoteAppend: true
remoteDelete.resurrectedRemoteDelete: true
```

This is not a substitute for the browser repro. It is useful because it shows
the underlying ambiguity directly: when the sync layer receives a full block
snapshot that omits a block, it cannot always tell whether the editor deleted
that block or never saw it.

## What Is Missing

Before I would call this a complete reviewer packet, I would still want:

1. A fresh run of the browser repro on latest `trunk`.
2. The same run on the PR branch.
3. A failing video generated from the same executable repro, if the browser
   repro still fails.
4. Pass/fail counts if the repro is flaky.

Until then, the honest claim is narrower: there is an executable browser repro
and saved failing result for the stale-delete behavior, plus a lower-level
trunk probe for the same merge ambiguity. I do not have a reliable failing
manual video from my own local runs.
