# Real-Time Collaboration Large Update Connection Lost Bug

## Status

This note is intentionally kept outside the PR branch.

The PR branch is `fix-connection-error-large-update-pr`. It contains only the
regression test commit and the fix commit. This explanatory history lives on the
separate branch `try/connection-error-large-update-explanation`.

## Bug Summary

An edit that produced a sync update near the client's old `1 MiB` size limit
could still be rejected by the server and then surface the generic
`Connection lost` modal.

The mismatch was in the unit being limited:

-   The client checked the raw Yjs update byte length.
-   The sync REST payload sends each update as a base64 `data` string.
-   The server schema validates that encoded `data` string with a `1 MiB`
    `maxLength`.
-   Base64 expands three raw bytes into four encoded characters.

Before the fix, the client allowed a raw update of `1,048,576` bytes. Encoding
that update produces a `1,398,104` character string, which is larger than the
server's per-update limit. The client therefore treated the update as safe, but
the server rejected it. The repeated poll failure eventually reached the
existing retryable connection-error path and displayed `Connection lost`.

## Existing UI Behavior

The PR does not add a new popup.

Two pre-existing UI paths matter here:

-   `Connection lost`: the generic retryable sync failure modal.
-   `This post is already being edited`: the normal WordPress post-lock modal.

After the fix, oversized document updates use the existing
`document-size-limit-exceeded` path. Real-time collaboration is disabled for
that document, and WordPress falls back to ordinary post locking. A second user
then sees the existing post-lock modal with the existing explanation that the
post is too large for real-time collaboration.

## Fix Plan

The fix keeps the server contract unchanged and makes the client enforce the
same effective limit before enqueueing an update.

1. Define the server's encoded update limit as `1 MiB`.
2. Compute the largest raw update that cannot exceed that encoded limit:
   `Math.floor( encodedLimit / 4 ) * 3`, which is `786,432` bytes.
3. Use that computed value as `MAX_UPDATE_SIZE_IN_BYTES`.
4. When `PollingManager` sees a local Yjs update larger than that raw limit,
   emit `document-size-limit-exceeded`, unregister the room, and return without
   queueing the oversized update.
5. Let the existing editor behavior disable real-time collaboration and fall
   back to post locking.

The small `return` after unregistering the room is important. Without it, the
oversized update can still be added to the queue after the room is marked
unrecoverable.

## Why Not Chunk The Update

Splitting the update into arbitrary request chunks is not a local client-only
fix.

The sync endpoint stores and forwards typed Yjs updates. It does not currently
have a protocol for partial update chunks. A chunking design would need explicit
metadata such as update IDs, chunk indexes, total chunks, ordering rules, and
completion state. It would also need server-side storage and reassembly,
cleanup of abandoned chunks, idempotency for retrying chunks, backward
compatibility for older clients, and clear interaction with compaction.

Sending arbitrary byte slices as normal updates would be unsafe because peers
and the server would not have a complete Yjs update to apply until all pieces
were reassembled.

For this PR, graceful degradation is the safer behavior: detect the oversize
update before the server rejects it, disable real-time collaboration for that
document, and fall back to the existing post-lock workflow.

## Reproduction Levels

The narrow regression can be reproduced at the utility-test level:

```bash
npm run test:unit packages/sync/src/providers/http-polling/test/utils.test.ts -- --runInBand
```

Before the fix, a test that creates a sync update at `MAX_UPDATE_SIZE_IN_BYTES`
shows the encoded `data` string can exceed `1 MiB`. After the fix, the largest
allowed raw update encodes within the server limit.

The lower-level polling manager tests cover the existing
`document-size-limit-exceeded` path with a mocked small limit:

```bash
npm run test:unit packages/sync/src/providers/http-polling/test/polling-manager.test.ts -- --runInBand
```

There is also an existing browser-level path in:

```text
test/e2e/specs/editor/collaboration/collaboration-document-size-lock.spec.ts
```

That test exercises the post-fix user behavior: an oversized document disables
real-time collaboration, and another editor sees the standard post-lock modal.

A separate exploratory top-level Playwright repro for an oversized aggregate
sync request body exists outside this PR work. That path is related to the same
generic `Connection lost` symptom, but it is a different limit: the full request
body can exceed `16 MiB` even when individual updates are under the per-update
limit. This PR targets the per-update base64 accounting mismatch.

## PR Contents

The PR branch has two commits:

-   `Add sync update size limit test`
-   `Fix sync update size limit accounting`

The code changes are limited to:

-   `packages/sync/src/providers/http-polling/config.ts`
-   `packages/sync/src/providers/http-polling/polling-manager.ts`
-   `packages/sync/src/providers/http-polling/test/utils.test.ts`

No markdown explanation file is included in the PR branch.

## Verification

The PR branch was checked with:

```bash
npm run format -- packages/sync/src/providers/http-polling/config.ts packages/sync/src/providers/http-polling/polling-manager.ts packages/sync/src/providers/http-polling/test/utils.test.ts
npm run lint:js -- packages/sync/src/providers/http-polling/config.ts packages/sync/src/providers/http-polling/polling-manager.ts packages/sync/src/providers/http-polling/test/utils.test.ts
npm run test:unit packages/sync/src/providers/http-polling/test/utils.test.ts -- --runInBand
npm run test:unit packages/sync/src/providers/http-polling/test/polling-manager.test.ts -- --runInBand
git diff --check try/fuzz..HEAD
```

The browser-level post-fix behavior was also recorded locally: it shows the
post-lock fallback instead of the generic `Connection lost` modal.
