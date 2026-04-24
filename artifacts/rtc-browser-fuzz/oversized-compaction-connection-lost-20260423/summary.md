# Oversized compaction causes `Connection lost`

## Failure mode

This is a distinct `Connection lost` cause that does **not** require:

- browser offline / Chrome blocking
- server OOM
- too many rooms in a request

It happens when the server asks a client to compact a large collaborative room and the resulting full-state `compaction` update is larger than the server's per-update limit.

## Why it happens

- The server starts requesting compaction after more than `50` stored updates in a room: [class-wp-http-polling-sync-server.php:40](../../../lib/compat/wordpress-7.0/class-wp-http-polling-sync-server.php#L40), [class-wp-http-polling-sync-server.php:595](../../../lib/compat/wordpress-7.0/class-wp-http-polling-sync-server.php#L595)
- The client responds by replacing the queue with a full-document `compaction` update from `Y.encodeStateAsUpdateV2( doc )`: [polling-manager.ts:618](../../../packages/sync/src/providers/http-polling/polling-manager.ts#L618), [polling-manager.ts:829](../../../packages/sync/src/providers/http-polling/polling-manager.ts#L829)
- The server validates every update's `data` string against `MAX_UPDATE_DATA_SIZE = 1 MB`: [class-wp-http-polling-sync-server.php:64](../../../lib/compat/wordpress-7.0/class-wp-http-polling-sync-server.php#L64), [class-wp-http-polling-sync-server.php:124](../../../lib/compat/wordpress-7.0/class-wp-http-polling-sync-server.php#L124)
- The client only enforces the 1 MB limit for live incremental updates in `onDocUpdate`, not for compaction updates: [polling-manager.ts:789](../../../packages/sync/src/providers/http-polling/polling-manager.ts#L789)
- Non-403 poll failures go through the generic retry/disconnect path and eventually surface the modal: [polling-manager.ts:646](../../../packages/sync/src/providers/http-polling/polling-manager.ts#L646), [sync-connection-error-modal/index.tsx:103](../../../packages/editor/src/components/sync-connection-error-modal/index.tsx#L103)

## Repro shape

Local repro used a collaborative `postType/post:151` room on `http://localhost:8888` with:

- `60` large paragraph blocks in the document
- `74` stored updates in the room
- compaction payload sizes between `1,612,700` and `1,618,360` characters

Typical failing response:

- HTTP `400`
- code: `rest_invalid_param`
- message fragment: `rooms[0][updates][0][data] must be at most 1,048,576 characters long`

This is a normal browser/server exchange on localhost. No artificial offline mode, packet loss, or injected sync failures were used.

## Five isolated reruns

- Iteration 1: modal on tab `B`, `5` failures there, `4` on `A`, max compaction `1618360`, modal at `20510ms`
- Iteration 2: modal on tab `A`, `5` failures there, `0` on `B`, max compaction `1618348`, modal at `20788ms`
- Iteration 3: modal on tab `A`, `5` failures on both tabs, max compaction `1618348`, modal at `20584ms`
- Iteration 4: modal on tab `A`, `5` failures there, `0` on `B`, max compaction `1612700`, modal at `20393ms`
- Iteration 5: modal on tab `A`, `5` failures on both tabs, max compaction `1618360`, modal at `20557ms`

Result: `5/5` isolated reruns reproduced the `Connection lost` modal.

## Notes

- This is different from the existing document-size lock. Individual live updates stayed below the client-side 1 MB limit, so collaboration remained enabled until compaction.
- Once the room is large enough, simply reopening the collaborative document with two users is enough to trigger the failure. It does not depend on degraded network conditions.
