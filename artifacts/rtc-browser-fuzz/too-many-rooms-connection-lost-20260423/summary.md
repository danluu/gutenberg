# Connection Lost via too many synced rooms in one poll request

- Date: 2026-04-23 UTC
- Environment: `http://localhost:8888`
- Symptom: the editor reaches the `Connection lost` modal on a normal network because `POST /wp-json/wp-sync/v1/updates` is rejected with `400 rest_invalid_param` once the client includes more than `50` rooms in one poll.

## Why this is a real non-OOM, non-browser-offline case

- The server responds normally with a structured `400`, not a transport error.
- The error is validation failure, not PHP OOM:
  - `code: rest_invalid_param`
  - `rooms must contain at most 50 items.`
- The request reaches WordPress and gets a REST response.
- There is no `net::ERR_ABORTED`, no `ERR_INTERNET_DISCONNECTED`, and no PHP fatal involved in this repro.

## Relevant code path

- The server caps a sync request at `50` rooms:
  - [class-wp-http-polling-sync-server.php](../../../lib/compat/wordpress-7.0/class-wp-http-polling-sync-server.php#L186)
- `core-data` loads numeric `postType` entity records into the sync manager when `getEntityRecord()` resolves with no query:
  - [resolvers.js](../../../packages/core-data/src/resolvers.js#L160)
  - [resolvers.js](../../../packages/core-data/src/resolvers.js#L184)
- Post types, including attachments, get sync enabled by default:
  - [entities.js](../../../packages/core-data/src/entities.js#L412)

## HAR match

- The user-provided HAR includes a `wp-sync` request body with:
  - `184` rooms total
  - `178` `postType/attachment:*` rooms
- That exceeds the server limit by a large margin and matches this failure mode.
- The HAR itself was captured during browser-offline errors, so it does not prove the `400` happened in that exact session, but it proves the page state can naturally build a room set far above the limit.

## Local boundary repro

- I used a clean blank page and collaboration enabled editor state.
- Baseline collaboration on that page used `4` rooms:
  - `postType/page:81`
  - `root/comment`
  - `postType/wp_block`
  - `taxonomy/wp_pattern_category`
- Then I loaded attachment entities in the browser with:
  - `wp.data.resolveSelect( 'core' ).getEntityRecord( 'postType', 'attachment', id )`

Threshold result:

- `46` attachments => `50` rooms total
  - `200` responses
  - no modal
- `47` attachments => `51` rooms total
  - repeated `400 rest_invalid_param`
  - `Connection lost` modal

## Five-pass confirmation

Focused isolated reruns of the `47 attachments => 51 rooms` case:

- iteration 1: modal at `30238ms`, `5` repeated `400`s
- iteration 2: modal at `30233ms`, `5` repeated `400`s
- iteration 3: modal at `30240ms`, `5` repeated `400`s
- iteration 4: modal at `30247ms`, `5` repeated `400`s
- iteration 5: modal at `30231ms`, `5` repeated `400`s

All `5/5` runs reproduced the modal.

## Conclusion

- This is a second likely real `Connection lost` cause distinct from:
  - the sync storage OOM case
  - browser-offline / request-abort cases
- Root cause: the client can sync incidental entity records such as attachments, but the server rejects poll payloads once total room count exceeds `50`.
- Any editor/plugin flow that loads enough numeric `postType` entities while collaboration is active can trigger this path.
