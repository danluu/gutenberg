# Real-Time Collaboration Oversized Compaction Snapshot Bug Analysis

This document analyzes a real-time collaboration failure mode where the
editor shows the generic `Connection lost` modal after the sync server asks a
client to compact a large room.

## Summary

This is a likely real bug, not a browser-fuzz false positive.

The core issue is a protocol mismatch:

- the client can generate a compaction update from the entire current Yjs
  document state
- the server enforces a `1 MiB` maximum on each update `data` string
- the client only applies the `1 MiB` guard to live incremental updates, not
  to compaction snapshots

Once a collaborative room is large enough, ordinary editing over time can
leave it in a state where reopening the document with two users is enough to
trigger compaction and fail with a structured REST `400`. That failure then
flows into the generic disconnect modal.

## How The Bug Happens

The current code path is:

1. The server marks a room for compaction after it has more than `50` stored
   updates in `/lib/compat/wordpress-7.0/class-wp-http-polling-sync-server.php`.
2. The nominated client sees `should_compact` and clears its queue in
   `/packages/sync/src/providers/http-polling/polling-manager.ts`.
3. That client generates a compaction update from the full document state with
   `Y.encodeStateAsUpdateV2( doc )`.
4. `createSyncUpdate()` base64-encodes that full-state snapshot into the
   request `data` string.
5. The server validates each update `data` field against
   `MAX_UPDATE_DATA_SIZE = 1 MiB` and rejects oversized compactions with
   `rest_invalid_param`.
6. The polling manager treats the non-`403` failure as a generic poll failure,
   retries with backoff, and eventually the editor shows `Connection lost`.

Relevant code:

- `/lib/compat/wordpress-7.0/class-wp-http-polling-sync-server.php`
  `COMPACTION_THRESHOLD`, `MAX_UPDATE_DATA_SIZE`, route arg validation, and
  `should_compact`
- `/packages/sync/src/providers/http-polling/polling-manager.ts`
  `room.should_compact`, `createCompactionUpdate()`, and the generic
  disconnect path
- `/packages/sync/src/providers/http-polling/utils.ts`
  `createSyncUpdate()` base64-encoding
- `/packages/editor/src/components/sync-connection-error-modal/index.tsx`
  modal display once retries are exhausted

## Why Users Do Not Need To Paste A Million Characters

The `1,048,576` limit is not a limit on raw visible editor text.

The capped value is the `data` string of one sync update, and that string is a
base64-encoded Yjs update. For compaction, the client sends a full snapshot of
the current CRDT document state, not a single user edit. That encoded snapshot
includes:

- visible text
- block structure
- formatting structure
- CRDT metadata
- base64 expansion overhead

So the practical trigger is not "user pasted a million visible characters in
one action." The trigger is "the room reached compaction territory, and the
full-state snapshot for the current document no longer fits inside the
per-update limit."

## Confirmed Reproduction

The focused local reproduction that was checked repeatedly had these
properties:

- room: collaborative `postType/post:151`
- document: `60` large paragraph blocks
- room history: `74` stored updates
- generated compaction sizes: about `1,612,700` to `1,618,360` characters
- server response: HTTP `400`
- REST error: `rest_invalid_param`
- response message fragment:
  `rooms[0][updates][0][data] must be at most 1,048,576 characters long`

It reproduced `5/5` in isolated reruns.

The important part is what the reproduction did not require:

- no offline mode
- no packet loss
- no synthetic latency
- no server OOM
- no "too many rooms" failure

Once the room was already large enough, simply reopening it collaboratively was
enough to trigger the bug.

## Evidence That This Is A Real Bug

Several facts argue strongly against this being a false positive:

- The failure is a normal browser-to-WordPress request/response exchange, not
  a Playwright startup timeout or a fuzz-only harness artifact.
- The server returns a structured REST validation error with a precise size
  complaint. This is a semantic application failure, not a transport glitch.
- The failure reproduced `5/5` in isolated reruns.
- The code has an obvious asymmetry: live updates are checked against
  `MAX_UPDATE_SIZE_IN_BYTES`, while compaction snapshots are not.
- The protocol documentation in
  `/packages/sync/src/providers/http-polling/README.md` explicitly describes
  compaction as a full-state update after the room crosses the `>50` stored
  update threshold.
- The reproduction does not depend on timing-sensitive browser fuzzing once the
  room is in the failing state.

## Evidence Against Treating It As A Common User Bug

There are also real reasons to be cautious about how broadly this should be
generalized:

- The confirmed repro used a fairly large collaborative document and a room
  with substantial accumulated history.
- There is not yet a field HAR or production log from a real user session
  showing this exact `400 rest_invalid_param` failure.
- The bug is deterministic once the room is large enough, but the current
  evidence does not establish how often ordinary collaborative documents reach
  that state in practice.
- Other `Connection lost` causes found during the browser investigation appear
  more likely to explain a large share of naturally reported modal failures.

So the correct classification is:

- likely a real product bug
- not a browser-fuzz false positive
- plausibly user-reachable
- not yet proven to be one of the highest-frequency field causes

## Fix Plan

The short-term containment and the real protocol fix are different.

### Short-Term Containment

1. Apply the same `1 MiB` client-side guard to compaction snapshots that
   already exists for live incremental updates.
2. Do not let an oversized compaction flow into the generic retry/disconnect
   path. Surface a specific collaboration error instead.
3. Apply the same guard to every compaction creation path, not just
   `room.should_compact`. The retry-recovery path added later can also replace
   a room queue with `state.createCompactionUpdate()`.

This would stop the confusing "generic connection lost after repeated 400s"
behavior, but it would not solve the underlying compaction problem by itself.

### Protocol-Level Fix

The real fix is to make compaction compatible with the protocol limits.

Options include:

1. Support chunked compaction instead of requiring one full-state snapshot to
   fit inside one update record.
2. Move compaction logic server-side so storage can be compacted without asking
   one client to upload a single monolithic snapshot.
3. Revisit whether the same per-update size limit should apply equally to live
   updates and compactions, if the protocol is going to keep single-record
   compaction.

Without a protocol fix, simply refusing oversize compactions risks leaving
large rooms permanently uncompactable and allowing storage growth to continue.

### Regression Coverage

Add tests for both behavior and UX:

1. A sync-layer test proving that oversized compaction snapshots are detected
   before posting.
2. A server/client integration test proving that compaction and validation
   limits stay aligned.
3. A browser-level regression test proving that this case does not fall through
   to the generic `Connection lost` modal.

## How The Bug Was Introduced

This failure mode appears to be the result of a sequence of changes rather than
one isolated bad line.

### 1. Latent Mismatch Introduced

Commit `2dc7ac3938c` (`RTC: Compact on request with encodeStateAsUpdate`,
February 18, 2026) changed compaction to use a client-generated full-state
snapshot:

- the server now returns `should_compact`
- the client clears its queue and calls `createCompactionUpdate()`
- `createCompactionUpdate()` encodes the entire document state with
  `Y.encodeStateAsUpdate()`

That introduced the core mismatch: the client could now generate a full-state
compaction snapshot without checking whether the encoded result fit within the
same size budget already enforced for ordinary live updates.

### 2. Payload Format Updated

Commit `129e66829f0` (`Use V2 Yjs methods for HTTP Polling`, March 10, 2026)
switched the same path from `Y.encodeStateAsUpdate()` to
`Y.encodeStateAsUpdateV2()`.

That did not create the bug class, but it preserved the same "full-state
compaction with no size check" design.

### 3. Exposure Widened

Commit `ad334569475` (`Restore with compaction update`, March 30, 2026) added
another compaction creation path during failed-request recovery. After a failed
request, a room with outgoing updates can now be rewritten to a compaction
snapshot even without an immediate server compaction request.

That widened the surface area for the same mismatch.

### 4. Failure Became Explicit And User-Visible

Commit `1be2ef27e68` (`Backport: Improve validation and permission checks for
WP_HTTP_Polling_Sync_Server`, April 1, 2026) added:

- `MAX_UPDATE_DATA_SIZE = 1 MiB`
- `maxLength` validation for update `data`
- route-level request validation

After that change, oversized compaction snapshots started failing
deterministically with structured REST validation errors instead of silently
depending on looser server behavior.

So the most accurate introduction story is:

- the latent client/server size mismatch was introduced by `2dc7ac3938c`
- it was preserved by `129e66829f0`
- the number of paths hitting it grew with `ad334569475`
- it became a clear, user-visible `400` failure after `1be2ef27e68`
