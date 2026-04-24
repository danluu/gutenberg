# Connection Lost via oversized sync request body

- Date: 2026-04-23 UTC
- Environment used for confirmation: `http://localhost:8895`
- Symptom: the editor shows the `Connection lost` modal because one `POST /wp-json/wp-sync/v1/updates` exceeds the server's `16 MB` request-body limit and is rejected with `413`.

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

## Five-pass confirmation

Focused isolated reruns on `8895`:

- iteration 1: request `24,617,807` bytes, modal at `22.7s`, repeated `413`
- iteration 2: request `24,617,433` bytes, modal at `22.8s`, repeated `413`
- iteration 3: request `24,617,457` bytes, modal at `22.6s`, repeated `413`
- iteration 4: request `24,617,468` bytes, modal at `22.8s`, repeated `413`
- iteration 5: request `24,617,453` bytes, modal at `23.4s`, repeated `413`

All `5/5` runs reproduced.

## Conclusion

This is a real `Connection lost` cause: many ordinary-sized synced edits across many synced entities can overflow the server's `16 MB` poll-body cap, yielding repeated `413`s and the generic disconnect modal.
