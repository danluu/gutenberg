# Real-Time Collaboration Oversized Compaction Update Bug

Status: real product bug.

## Summary

The HTTP polling client has a size guard for ordinary local `updateV2`
events, but server-requested compaction and retry-generated compaction bypass
that guard. Once a collaborative room has more than
`WP_HTTP_Polling_Sync_Server::COMPACTION_THRESHOLD` stored updates, the server
sets `should_compact: true`; the nominated client responds with a full Yjs
state update from `Y.encodeStateAsUpdateV2( doc )`. For large but otherwise
ordinary documents, that full-state `compaction` update can exceed the server's
1 MiB per-update `data` limit and produce repeated `400` responses until the
editor shows the generic `Connection lost` modal.

This is distinct from the request-body limit bug. The failing request contains
a single oversized update; it does not need to exceed the server's 16 MiB
`MAX_BODY_SIZE`.

## Reproduction Layers

### Fuzzer Baseline

Known-fixes baseline:

`/Users/danluu/dev/fuzz/gutenberg-known-fixes-fuzz`

Command:

```bash
GUTENBERG_FUZZ_SEED_START=501 GUTENBERG_FUZZ_SEED_COUNT=8 npm run test:unit packages/sync/src/providers/http-polling/test/polling-manager.fuzz.test.ts -- --runInBand
```

Result: failed on the protocol fuzzer. Seeds `501`, `507`, and `508` directly
show oversized queued `compaction` updates. Other seeds still expose the
separate cursor-advance failure from issue 4, so the compaction issue was
checked with narrower repros instead of relying on the mixed fuzzer alone.

### Unit Repro

PR branch `danluu/rtc-issue-05-oversized-update-pr` adds focused tests for both
compaction enqueue paths:

- server `should_compact: true` response
- ambiguous failed poll retry that replaces outgoing updates with compaction

Verification command:

```bash
npm run test:unit packages/sync/src/providers/http-polling/test/polling-manager.test.ts -- --runInBand
```

Result: passed, `30` tests.

### PHP Server Controls

Command:

```bash
WP_ENV_PORT=8896 WP_ENV_PHPMYADMIN_PORT=9002 npm run test:unit:php:base -- phpunit/tests/collaboration/wpHttpPollingSyncServer.php --filter 'test_sync_rejects_update_data_exceeding_max_length|test_sync_rejects_oversized_request_body|test_sync_should_compact_is_true_above_threshold_for_compactor'
```

Result: passed, `3` tests and `9` assertions. These controls confirm the
server-side per-update cap, request-body cap, and compaction threshold behavior.

### Realistic Browser Repro

Repro branch:

`danluu/rtc-issue-05-oversized-update-repro`

Spec:

`test/e2e/specs/editor/collaboration/collaboration-oversized-compaction-repro.spec.ts`

Command:

```bash
WP_ENV_PORT=8896 WP_ENV_PHPMYADMIN_PORT=9002 WP_BASE_URL=http://localhost:8896 GUTENBERG_RTC_OVERSIZED_COMPACTION_LOG=.context/rtc-issue-05-oversized-compaction-browser-log.json npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-oversized-compaction-repro.spec.ts --project=chromium
```

Result: passed on the unfixed repro branch by observing the bug. The test uses
realistic editor actions only: a collaborative post is opened in two browser
contexts, then one user repeatedly pastes paragraph text and presses Enter.
It does not inject network failures or call editor data APIs for the top-level
editing actions.

Observed browser artifacts:

- modal page: `A`
- maximum compaction `data` string length: `1,669,920`
- sync statuses included: `200`, `400`
- compaction requests observed: `6`
- video: `/Users/danluu/conductor/workspaces/gutenberg-v1/cayenne/.context/rtc-issue-05-oversized-compaction-repro.webm`
- traffic log: `/Users/danluu/conductor/workspaces/gutenberg-v1/cayenne/.context/rtc-issue-05-oversized-compaction-browser-log.json`
- committed video copy:
  `docs/explanations/fuzzer-bugs/artifacts/rtc-issue-05-oversized-compaction/repro.webm`
- committed traffic log:
  `docs/explanations/fuzzer-bugs/artifacts/rtc-issue-05-oversized-compaction/browser-log.json`

## Real vs False Positive Analysis

Invalid oracle: ruled out. The server schema enforces a 1 MiB `data` string
for every update type, including `compaction`. A queued update above that size
cannot be accepted by production.

Invalid generated shape: ruled out. The browser repro uses normal paragraph
pastes and Enter key presses in the block editor. The generated sync request is
the normal `wp-sync/v1/updates` payload emitted by the HTTP polling provider.

Helper misuse: ruled out. The failing top-level repro does not call
`window.wp.data.dispatch()` or provider internals for the editing workload. The
lower-level unit test only isolates the protocol transition already seen in
production traffic.

Environment contamination: ruled out. The repro runs on a fresh wp-env test
site on `http://localhost:8896`, with collaboration enabled by the standard
fixture. The failure is a deterministic server `400`, not missing themes,
plugins, auth, or network loss.

Race-injection-only behavior: ruled out. No network fault injection is used in
the browser repro. The repeated `400`s come from ordinary compaction retries.

Known-fixed bug masking: checked. The known-fixes baseline includes the local
base64 size-accounting fix, and the focused compaction repro still fails there.
The final fix also preserves encoded-size accounting so the branch is safe when
applied directly to `origin/trunk`.

## Root Cause

The client only checked `update.byteLength > MAX_UPDATE_SIZE_IN_BYTES` inside
the document `updateV2` observer for ordinary local edits. Compaction updates
are created outside that observer:

- `room.should_compact` clears the queue and enqueues
  `Y.encodeStateAsUpdateV2( doc )` as `compaction`
- poll-error recovery clears outgoing updates and enqueues the same full-state
  compaction
- the deprecated `compaction_request` path merges updates and enqueues the
  merged compaction

Those paths did not use the size guard before placing updates in the queue, so
the next poll could send a payload the server must reject.

## Fix Plan

Use one size-limit disconnect path for both ordinary updates and compaction.
Create compaction updates through a guarded helper, and do not enqueue them if
they exceed the client-side cap. Keep the cap aligned with the server by
accounting for base64 expansion: the server validates the encoded string, so
the raw Yjs limit must be `floor( 1 MiB / 4 ) * 3`.

When an oversized compaction is detected, unregister the room with the existing
`document-size-limit-exceeded` error instead of sending a doomed request and
entering generic retry/backoff.

## Fix Branch

Branch:

`danluu/rtc-issue-05-oversized-update-pr`

Commits:

- `1b42ab1e87f` Add RTC oversized compaction regression tests
- `188976ac441` Guard RTC compaction update size
