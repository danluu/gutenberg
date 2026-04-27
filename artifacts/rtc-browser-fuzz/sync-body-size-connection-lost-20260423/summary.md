# Connection Lost via oversized sync request body

- Date: 2026-04-23 UTC
- Environment used for confirmation: `http://localhost:8895`
- Symptom: the editor shows the `Connection lost` modal because one `POST /wp-json/wp-sync/v1/updates` exceeds the server's `16 MiB` request-body limit and is rejected with `413`.

## Why this is distinct

- Not PHP OOM.
- Not browser offline / request abort.
- Not the `>50 rooms` validation limit.
- Not the `1 MB` single-update limit or oversized compaction case.
- The server rejects the request at the route validator with `413 Request body is too large`.

## Repro shape

- Baseline collaborative editor state contributes `4` rooms.
- Load `40` additional numeric `postType/post:*` entity records into sync.
- Edit all `40` extra post records with sub-`1 MB` title changes (`450 KiB` each).
- The next poll sends:
  - `44` rooms total
  - multiple queued updates
  - request body around `24.6 MB`
- WordPress responds with repeated `413 Request Entity Too Large`.
- After retries are exhausted, the editor shows the `Connection lost` modal.

## How this was introduced

This appears to be a composition bug in the original HTTP polling sync design,
not a bug introduced by the later `1 MiB` single-update accounting fix.

The sync endpoint has three independent caps:

- at most `50` rooms per request
- at most `1 MiB` of encoded `data` for one update
- at most `16 MiB` for the whole request body

The client batches every registered room into one poll request and drains every
room's queued updates into that request. That makes the first two caps
insufficient to protect the third cap. For example, `40` rooms with updates far
below `1 MiB` can still create a request body larger than `16 MiB` once their
base64 update strings, awareness payloads, room metadata, and JSON overhead are
combined.

The number of rooms can grow beyond what a user would perceive as the one
document they are editing because resolved numeric entity records are loaded
into the sync manager. A page that touches many synced post records can
therefore create many sync rooms, each with ordinary-sized queued updates.

The failure then becomes sticky. A `413` from the route-level body validator
means the server rejected the request before storing the updates, but the client
treats it like a generic retryable poll failure. It retries the same oversized
shape after backoff, eventually surfacing the generic `Connection lost` modal.

## Issue analysis

This is an availability and scalability issue, not evidence of server-side
partial write corruption. The server body-size validator runs before the sync
handler stores updates, so the failing request is rejected as a unit.

The risky part is the client recovery behavior after rejection. The current
generic failure path cannot tell that the payload is structurally too large to
ever succeed. It may restore the same queued updates, or replace failed outgoing
updates with compaction updates in cases where the room already has a cursor.
That behavior is appropriate for ambiguous network errors where the server
might have committed the write, but it is the wrong shape for a deterministic
`413`: retrying or compacting does not reduce the aggregate request size and can
keep the session in a permanent retry loop.

The fix should preserve these invariants:

- never drop local queued updates silently
- never split the bytes of a single Yjs update
- preserve FIFO ordering of updates within each room
- keep room cursors and awareness state scoped to the room that was actually
sent
- avoid raising the server body limit as the primary fix, because that shifts
the failure toward memory pressure and slower requests
- avoid disabling real-time collaboration for the whole editor when smaller
poll batches can make progress

## Relevant code path

- Server-side body cap:
  - [class-wp-http-polling-sync-server.php](../../../lib/compat/wordpress-7.0/class-wp-http-polling-sync-server.php#L48)
  - [class-wp-http-polling-sync-server.php](../../../lib/compat/wordpress-7.0/class-wp-http-polling-sync-server.php#L268)
- Numeric entity records are loaded into the sync manager when `getEntityRecord()` resolves:
  - [packages/core-data/src/resolvers.js](../../../packages/core-data/src/resolvers.js#L160)
  - [packages/core-data/src/resolvers.js](../../../packages/core-data/src/resolvers.js#L184)
- Generic poll failures become disconnected status and then the modal:
  - [packages/sync/src/providers/http-polling/polling-manager.ts](../../../packages/sync/src/providers/http-polling/polling-manager.ts#L646)
  - [packages/editor/src/utils/sync-error-messages.ts](../../../packages/editor/src/utils/sync-error-messages.ts#L48)

## Fix plan

The least risky fix is client-side request budgeting and batching, with a
specific `413` recovery path.

1. Add a client constant for the server request-body limit and use a smaller
   soft budget, for example `15 MiB`, to leave room for serialization details
   and future metadata.
2. Build poll payloads in bounded batches instead of sending every registered
   room in one request. Enforce both:
   - `MAX_ROOMS_PER_REQUEST`
   - serialized JSON byte length under the soft body budget
3. Measure the actual serialized payload size with the same object shape passed
   to `apiFetch`, rather than estimating from raw update sizes. The update data
   is already base64 at this point, so `JSON.stringify( payload )` measured with
   `TextEncoder` should be close to the request body that the REST endpoint
   receives.
4. Change update queue handling so batching can choose a sendable prefix
   without losing updates. A safe design is to add queue operations that can
   peek at pending updates and then take only the updates assigned to the
   current batch. Rooms and updates not assigned to the batch must remain queued.
5. Preserve per-room update order. If one room has many queued updates, split
   that room across multiple polls at update boundaries. Do not split a single
   Yjs update byte array. A single encoded update should already be bounded by
   the per-update limit.
6. Prioritize rooms with outgoing updates, but keep a round-robin cursor for
   rooms without outgoing updates so incoming updates and awareness do not
   starve for secondary rooms.
7. Detect `413` / `rest_sync_body_too_large` separately from ambiguous network
   failures. Because the route validator rejected the request before storing
   updates, restore the exact attempted updates and retry with a smaller batch
   budget. Do not replace them with compaction updates on this path.
8. Add regression coverage:
   - unit tests for payload batching by body size and room count
   - queue tests proving unsent updates remain queued and sent updates restore
     exactly on `413`
   - a polling-manager test where many rooms with sub-`1 MiB` updates are sent
     across multiple successful polls, with every serialized payload below the
     budget
   - a `413` test proving the next retry shrinks the batch and does not trigger
     the disconnect modal
   - an end-to-end version of this repro once the lower-level behavior is
     stable

This plan avoids new protocol semantics. It does not require server-side Yjs
chunk reassembly, does not alter sync storage, and does not raise server limits.
It makes the existing polling protocol respect the server's aggregate request
limit before sending.

## Five-pass confirmation

Focused isolated reruns on `8895`:

- iteration 1: request `24,617,807` bytes, modal at `22.7s`, repeated `413`
- iteration 2: request `24,617,433` bytes, modal at `22.8s`, repeated `413`
- iteration 3: request `24,617,457` bytes, modal at `22.6s`, repeated `413`
- iteration 4: request `24,617,468` bytes, modal at `22.8s`, repeated `413`
- iteration 5: request `24,617,453` bytes, modal at `23.4s`, repeated `413`

All `5/5` runs reproduced.

## Conclusion

This is a real `Connection lost` cause: many ordinary-sized synced edits across
many synced entities can overflow the server's `16 MiB` poll-body cap, yielding
repeated `413`s and the generic disconnect modal.
