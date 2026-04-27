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

## Reproduction levels

The full `Connection lost` modal is only visible at the browser/editor layer,
but the bug can be reproduced at lower levels by separating the failure into
the client payload shape and the server validator.

### Payload-shape repro

This is the lowest-level client-side repro. It constructs the same `SyncPayload`
shape that the polling manager sends, while staying under the `50` room cap and
under the `1 MiB` per-update cap. The resulting JSON body still exceeds the
server's `16 MiB` body cap.

Run from any checkout:

```bash
node <<'NODE'
const MAX_BODY_SIZE = 16 * 1024 * 1024;
const ROOM_COUNT = 44;
const BASELINE_ROOMS = [
	'postType/post:1',
	'root/comment',
	'taxonomy/category',
	'root/site',
];
const ENCODED_UPDATE_SIZE = 600 * 1024;
const rooms = Array.from( { length: ROOM_COUNT }, ( _, index ) => ( {
	after: 0,
	awareness: { user: `client-${ index + 1 }` },
	client_id: index + 1,
	room: BASELINE_ROOMS[ index ] || `postType/post:${ index + 1 }`,
	updates:
		index < BASELINE_ROOMS.length
			? []
			: [ { type: 'update', data: 'x'.repeat( ENCODED_UPDATE_SIZE ) } ],
} ) );
const body = JSON.stringify( { rooms } );
console.log(
	JSON.stringify(
		{
			rooms: rooms.length,
			updates: rooms.reduce(
				( total, room ) => total + room.updates.length,
				0
			),
			encodedUpdateBytes: ENCODED_UPDATE_SIZE,
			bodyBytes: Buffer.byteLength( body, 'utf8' ),
			maxBodyBytes: MAX_BODY_SIZE,
			exceedsLimit:
				Buffer.byteLength( body, 'utf8' ) > MAX_BODY_SIZE,
		},
		null,
		2
	)
);
NODE
```

Expected result: `rooms` is `44`, each encoded update is `614400` bytes, and
`bodyBytes` is about `24581413`, which is greater than `16777216`.

### Server-validator repro

This isolates the server behavior: the route-level validator rejects an
oversized raw request body with `rest_sync_body_too_large` and status `413`.
This does not exercise the editor modal, but it proves that the server rejects
the aggregate request before the sync handler stores updates.

```bash
vendor/bin/phpunit \
	--filter test_sync_rejects_oversized_request_body \
	phpunit/tests/collaboration/wpHttpPollingSyncServer.php
```

This test is in
`phpunit/tests/collaboration/wpHttpPollingSyncServer.php`.

### Browser HTTP repro

This is the focused browser repro without relying on a fuzzer campaign. It
loads the extra synced entity rooms, edits them, observes a `POST
/wp-json/wp-sync/v1/updates` request above `16 MiB`, observes repeated `413`
responses, and then asserts that the `Connection lost` modal appears.

```bash
WP_ENV_PORT=8893 npm run wp-env-test start
WP_ENV_PORT=8893 WP_BASE_URL=http://localhost:8893 npm exec \
	--workspace @wordpress/e2e-tests-playwright -- wp-scripts test-playwright \
	test/e2e/specs/editor/collaboration/collaboration-sync-body-size-connection-lost.spec.ts \
	--project=chromium
WP_ENV_PORT=8893 npm run wp-env-test stop
```

Use a different `WP_ENV_PORT` if `8893` is already occupied.

## How this was introduced

This appears to be a composition bug in the original HTTP polling sync design,
not a bug introduced by the later `1 MiB` single-update accounting fix.

Relevant history:

- [#72114](https://github.com/WordPress/gutenberg/pull/72114),
  `c214929139f50337250efe2bb24ff82c3ff2b6aa`, made syncing a
  side-concern in the core-data resolver. This is part of the path where
  resolved entity records can be loaded into the sync manager.
- [#74564](https://github.com/WordPress/gutenberg/pull/74564),
  `48ce44dac7981eb730079563a3a2975b89840fac`, added the default HTTP
  polling sync provider. Its polling manager built one payload from all
  registered `roomStates` and drained each room's queued updates with
  `state.updateQueue.get()`, without an aggregate request-byte budget.
- [#75699](https://github.com/WordPress/gutenberg/pull/75699),
  `c4e4fac0a26bfb2dc38f17c765f2e84266b68b99`, removed the
  `IS_GUTENBERG_PLUGIN` guards around collaborative editing. In the current
  path, any resolved numeric entity record with `entityConfig.syncConfig` and
  no query is loaded into sync.
- [#76987](https://github.com/WordPress/gutenberg/pull/76987),
  `1be2ef27e6819597dacc3b395caa05670d494194`, backported the server
  validation hardening from `WordPress/wordpress-develop#11296`. It added
  `MAX_BODY_SIZE = 16 * MB_IN_BYTES`, `MAX_ROOMS_PER_REQUEST = 50`,
  `MAX_UPDATE_DATA_SIZE = MB_IN_BYTES`, and the route-level
  `validate_request()` path that returns `rest_sync_body_too_large` with
  status `413`.

Two later nearby fixes are related but do not fix this aggregate-body bug:

- [#77631](https://github.com/WordPress/gutenberg/pull/77631),
  `1642980d599be51c7cce7b2dc3a0c052b69ad367`, rotates rooms when the
  registered room count exceeds `MAX_ROOMS_PER_REQUEST`. It addresses the
  `>50` rooms failure, but a request with `50` or fewer rooms can still exceed
  the `16 MiB` body cap.
- [#77669](https://github.com/WordPress/gutenberg/pull/77669),
  `a54911b0c49e3b4abea4d6d7ce85c0e2c2bad11e`, fixes the separate
  per-update base64 accounting mismatch. That prevents a single encoded update
  from exceeding the `1 MiB` update limit, but does not limit the total body
  size of a multi-room poll.

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
