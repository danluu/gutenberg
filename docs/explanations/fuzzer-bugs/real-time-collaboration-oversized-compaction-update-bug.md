# Real-Time Collaboration Oversized Compaction Update Bug

Status: real product bugs.

## Summary

The original fuzzer failure is real, and it covers multiple client-side bugs in
the HTTP polling provider's size and room-lifecycle handling.

First, the client and server did not measure update size in the same units: the
server validates the base64-encoded update `data` string, while the client
guard used raw Yjs byte length with a 1 MiB cap. Second, the ordinary local
`updateV2` overflow path disconnected the room but then continued and queued
the oversized update. Third, server-requested compaction and retry-generated
compaction bypassed the local size guard entirely. Once a collaborative room has
more than
`WP_HTTP_Polling_Sync_Server::COMPACTION_THRESHOLD` stored updates, the server
sets `should_compact: true`; the nominated client responds with a full Yjs
state update from `Y.encodeStateAsUpdateV2( doc )`. For large but otherwise
ordinary documents, that full-state `compaction` update can exceed the server's
1 MiB per-update `data` limit and produce repeated `400` responses until the
editor shows the generic `Connection lost` modal.

The audit of the PR also found a second, independent state-machine bug: async
poll success/error handling keyed only by room name, so a stale in-flight
response could mutate a newly registered room with the same name. The same area
also left `isPolling` true after a terminal size-limit unregister, delaying
sync for the next registered room until a stale scheduled tick ran.

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

PR branch `danluu/audit-rtc-size-limit` adds focused tests for the local update
and compaction enqueue paths:

- raw-vs-encoded update size limit
- local oversized update disconnect with no queued doomed update
- server `should_compact: true` response
- ambiguous failed poll retry that replaces outgoing updates with compaction
- deprecated server `compaction_request` response

Verification command:

```bash
npm run test:unit packages/sync/src/providers/http-polling/test/polling-manager.test.ts -- --runInBand
```

Result on the fixed branch: passed, `34` tests.

Fail-before-fix check: with the audit code fix removed but the new tests kept,
the same command failed with `4` failures:

- `polls immediately for a new room after a local size-limit disconnect clears the last room`
- `does not send an oversized deprecated server-requested compaction update`
- `ignores a success response for a re-registered room with the same name`
- `ignores an error response for a re-registered room with the same name`

Those failures prove the added tests exercise real pre-fix behavior rather than
only asserting the implementation shape.

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
- raw Playwright source video: `/Users/danluu/conductor/workspaces/gutenberg-v1/cayenne/.context/rtc-issue-05-source-repro.webm`
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

## Root Causes

### Bug 1: Encoded vs Raw Size Accounting

The server accepts updates through a schema whose `data` field is a string with
`maxLength` equal to `MAX_UPDATE_DATA_SIZE`:
[`class-wp-http-polling-sync-server.php`](../../../lib/compat/wordpress-7.0/class-wp-http-polling-sync-server.php#L64)
and
[`class-wp-http-polling-sync-server.php`](../../../lib/compat/wordpress-7.0/class-wp-http-polling-sync-server.php#L122-L128).

The client cap was a raw byte count set to 1 MiB:
[`config.ts`](../../../packages/sync/src/providers/http-polling/config.ts#L27).
Because base64 expands three raw bytes to four string characters, a raw update
below the old client cap could still encode to more than the server's 1 MiB
string cap.

### Bug 2: Local Oversized Updates Continued After Disconnect

The client only checked `update.byteLength > MAX_UPDATE_SIZE_IN_BYTES` inside
the document `updateV2` observer for ordinary local edits. On overflow it
disconnected and unregistered the room, but it did not return before the normal
enqueue path:
[`polling-manager.ts`](../../../packages/sync/src/providers/http-polling/polling-manager.ts#L862-L886).
That means a single oversized local update could still be appended to the
queue object captured by the observer closure.

### Bug 3: Compaction Updates Bypassed The Size Guard

Compaction updates are created outside the local `updateV2` observer:

- `room.should_compact` clears the queue and enqueues
  `Y.encodeStateAsUpdateV2( doc )` as `compaction`
- poll-error recovery clears outgoing updates and enqueues the same full-state
  compaction
- the deprecated `compaction_request` path merges updates and enqueues the
  merged compaction

Those paths did not use the size guard before placing updates in the queue, so
the next poll could send a payload the server must reject.

Sources:

- server-requested compaction:
  [`polling-manager.ts`](../../../packages/sync/src/providers/http-polling/polling-manager.ts#L683-L688)
- deprecated `compaction_request`:
  [`polling-manager.ts`](../../../packages/sync/src/providers/http-polling/polling-manager.ts#L689-L696)
- retry-generated compaction:
  [`polling-manager.ts`](../../../packages/sync/src/providers/http-polling/polling-manager.ts#L757-L759)

### Bug 4: Stale Poll Responses Could Mutate New Room State

The poll loop built a request from concrete `RoomState` objects but processed
responses by checking only whether a room name still existed:
[`polling-manager.ts`](../../../packages/sync/src/providers/http-polling/polling-manager.ts#L620-L626).
The error recovery path made the same room-name lookup:
[`polling-manager.ts`](../../../packages/sync/src/providers/http-polling/polling-manager.ts#L750-L755).

If a request was in flight while a room was unregistered and then registered
again with the same room string, the old response could apply updates, restore
old outgoing updates, or log retry state into the new room's Y.Doc/queue. That
is a real provider lifecycle bug: `registerRoom` and `unregisterRoom` are the
public manager operations used as editor entities mount and unmount.

The same lifecycle area caused a liveness bug after terminal size-limit
disconnects. `registerRoom` only starts polling when `isPolling` is false:
[`polling-manager.ts`](../../../packages/sync/src/providers/http-polling/polling-manager.ts#L927-L929).
But `unregisterRoom` removed listeners and room state without clearing an
already scheduled polling timeout or resetting `isPolling`:
[`polling-manager.ts`](../../../packages/sync/src/providers/http-polling/polling-manager.ts#L958-L969).
After the last room disconnected for document size, a newly registered room
could fail to poll immediately.

## Fix Plan

Use one size-limit disconnect path for ordinary local updates and all
compaction producers. Return immediately after terminal local-update overflow.
Create compaction updates through a guarded helper, and do not enqueue them if
they exceed the client-side cap.

Keep the cap aligned with the server by accounting for base64 expansion: the
server validates the encoded string, so the raw Yjs limit must be
`floor( 1 MiB / 4 ) * 3`.

When an oversized compaction is detected, unregister the room with the existing
`document-size-limit-exceeded` error instead of sending a doomed request and
entering generic retry/backoff.

For poll lifecycle correctness, snapshot the exact `RoomState` objects used to
build each request. On success, forbidden-error handling, and generic retry
recovery, mutate a room only if the current map still contains that same object
for the room name. When unregistering the last room, clear any pending poll
timeout and reset `isPolling` so future `registerRoom()` calls can start a new
poll immediately.

## Fix Branch

Branch:

`danluu/audit-rtc-size-limit`

PR:

https://github.com/WordPress/gutenberg/pull/77674

Commits:

- `1b42ab1e87f` Add RTC oversized compaction regression tests
- `188976ac441` Guard RTC compaction update size
- `fe65e827450` Harden polling manager against stale room states
- `984b51ea2d0` Cover RTC oversized update edge cases
