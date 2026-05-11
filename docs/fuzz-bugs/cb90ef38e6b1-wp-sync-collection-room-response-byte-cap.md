# cb90ef38e6b1: HTTP sync collection-room history can exceed the response byte budget

## Summary

The original fuzz signature is a downstream `waitForResponse` timeout caused by real `/wp-sync/v1/updates` backend failures. The preserved handoff row reports PHP memory exhaustion while `WP_Sync_Post_Meta_Storage::get_updates_after_cursor()` materializes persisted shared-room history. The problematic rooms are long-lived auxiliary collection rooms such as `root/comment` and `taxonomy/wp_pattern_category`, not a malformed post body.

The May 7 known-fixes base adds useful input-side guards: a 16 MiB request-body limit, a 50-room request limit, and a 1 MiB encoded update-data limit. Those guards do not close the read-side failure mode. On current `origin/trunk`, `get_updates_after_cursor()` still selects every `wp_sync_update_data` row after the client's cursor, decodes every row, and only then lets the HTTP server filter updates for the response. A fresh or reloaded client with cursor `0` can therefore force the server to load and JSON-encode all retained history for each requested room.

Pass 171 confirmed this independently on the May 7 known-fixes wp-env. A REST-level probe seeded 20 valid 512 KiB update payloads through `/wp-sync/v1/updates`, which stays under the 16 MiB request cap, then requested catch-up from a second client at cursor `0`. The server returned all 20 updates in one `200` response: `catch_updates=20`, `catch_total_updates=20`, and `catch_json_bytes=13981772` despite an intended 8 MiB response-update budget.

Pass 177 tightened the proof and fix. A single-room byte cap is not enough because the HTTP polling client can naturally batch up to 50 rooms into one `/wp-sync/v1/updates` request. Two rooms that are each capped to a near-8 MiB prefix can still produce a roughly 15 MiB response, and more rooms can scale that further. The updated repro therefore seeds two valid rooms and asserts that every batched catch-up response stays under the endpoint budget while the client eventually receives all updates.

Pass 178 rechecked current `origin/trunk` at `96263113a874ab1fc1668f7bb500c98766e90e76`. The read-side gap is still present: `WP_HTTP_Polling_Sync_Server::handle_request()` appends each room into one response, and `WP_Sync_Post_Meta_Storage::get_updates_after_cursor()` still selects all `meta_value` rows after the cursor. The pass also verified the natural client path: the default HTTP polling provider registers every synced entity or collection room with one process-wide polling manager, sends all rooms in one request when the count is under `MAX_ROOMS_PER_REQUEST`, and registers collection rooms for `getEntityRecords()` calls with `per_page: -1`. The collection-room trigger is therefore a real editor path, even though the multi-MiB retained history remains uncommon.

## Why This Matters

The count-only compaction threshold does not bound bytes. A room can hold fewer than `COMPACTION_THRESHOLD` rows while still retaining many MiB of valid update data. The handoff describes exactly that shape: roughly 13.20 MiB retained after pruning, above the intended 8 MiB cap. With multiple rooms in one HTTP poll, response assembly can become much larger than either the request-body budget or PHP's practical memory headroom.

The visible user impact is not a Playwright-only timeout. Users see collaboration disconnects and failed room catch-up. Saved post content was not shown corrupting in this signature, but collaboration state can fail to recover until persisted sync-room history is compacted or cleared.

One current-runtime caveat: depending on the wp-env/Core combination, the loaded implementation may come from WordPress core's collaboration classes rather than Gutenberg's compat copy. The same response-budget invariant has to hold in the runtime class that services `/wp-sync/v1/updates`.

## Practical Likelihood

Current normal-user likelihood is low. The workflow requires real-time collaboration over the HTTP polling provider, at least one reloaded or newly joining client, and enough retained valid shared-room history to make cursor-0 catch-up large. Opening a post, loading comment/category-style collection data, editing paragraphs, saving, and reloading are common; the unusually large retained auxiliary-room history is rare and was fuzz-amplified.

The natural Playwright repro now uses two active editors, 18 ordinary large replacements of one paragraph, and a late third editor join. Replacing the paragraph still creates valid Yjs update history large enough to exercise response chunking, but keeps the final rendered post small. Earlier append-only variants could OOM in the unrelated `WP_HTML_Tag_Processor` editor-loading path before reaching the sync assertion.

The shortest confidence-improving experiment is to seed `root/comment` and `taxonomy/wp_pattern_category` with the retained history shape from the source run, then run one natural two-user reload/join flow on the current known-fixes base and measure `/wp-sync` response status and byte size.

## Fix Direction

Bound the read side, not just the write side:

- teach storage retrieval to return a cursor-bounded prefix under a byte budget;
- preserve cursor semantics by advancing only to the last returned row;
- make the HTTP server spend one response update-data budget across all rooms in the batched request;
- when no response budget remains for a room, return that room with its previous cursor and no updates so a later poll can retry it;
- read candidate row IDs and byte lengths before fetching `meta_value`, so the storage layer does not materialize a full oversized batch just to discover that it is over budget;
- suppress compaction while a room response is only a bounded prefix;
- continue returning later rows on subsequent polls rather than loading all history in one response.

This preserves eventual catch-up while preventing one poll from materializing an unbounded historical backlog.
