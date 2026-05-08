# cb90ef38e6b1: HTTP sync collection-room history can exceed the response byte budget

## Summary

The original fuzz signature is a downstream `waitForResponse` timeout caused by real `/wp-sync/v1/updates` backend failures. The preserved handoff row reports PHP memory exhaustion while `WP_Sync_Post_Meta_Storage::get_updates_after_cursor()` materializes persisted shared-room history. The problematic rooms are long-lived auxiliary collection rooms such as `root/comment` and `taxonomy/wp_pattern_category`, not a malformed post body.

The May 7 known-fixes base adds useful input-side guards: a 16 MiB request-body limit, a 50-room request limit, and a 1 MiB encoded update-data limit. Those guards do not close the read-side failure mode. On current `origin/trunk`, `get_updates_after_cursor()` still selects every `wp_sync_update_data` row after the client's cursor, decodes every row, and only then lets the HTTP server filter updates for the response. A fresh or reloaded client with cursor `0` can therefore force the server to load and JSON-encode all retained history for each requested room.

Pass 171 confirmed this independently on the May 7 known-fixes wp-env. A REST-level probe seeded 20 valid 512 KiB update payloads through `/wp-sync/v1/updates`, which stays under the 16 MiB request cap, then requested catch-up from a second client at cursor `0`. The server returned all 20 updates in one `200` response: `catch_updates=20`, `catch_total_updates=20`, and `catch_json_bytes=13981772` despite an intended 8 MiB response-update budget.

## Why This Matters

The count-only compaction threshold does not bound bytes. A room can hold fewer than `COMPACTION_THRESHOLD` rows while still retaining many MiB of valid update data. The handoff describes exactly that shape: roughly 13.20 MiB retained after pruning, above the intended 8 MiB cap. With multiple rooms in one HTTP poll, response assembly can become much larger than either the request-body budget or PHP's practical memory headroom.

The visible user impact is not a Playwright-only timeout. Users see collaboration disconnects and failed room catch-up. Saved post content was not shown corrupting in this signature, but collaboration state can fail to recover until persisted sync-room history is compacted or cleared.

One important current-runtime caveat: the running wp-env for current WordPress loads `/var/www/html/wp-includes/collaboration/class-wp-sync-post-meta-storage.php`, not Gutenberg's compat copy. The pass-170 PR branch patches the Gutenberg compat class, which is the right shape for a backport/source fix, but the same change has to be mirrored into WordPress core's collaboration classes before it fixes current-trunk wp-env behavior.

## Practical Likelihood

Current normal-user likelihood is low. The workflow requires real-time collaboration over the HTTP polling provider, at least one reloaded or newly joining client, and enough retained valid shared-room history to make cursor-0 catch-up large. Opening a post, editing paragraphs, saving, and reloading are common; the unusually large retained auxiliary-room history is rare and was fuzz-amplified.

The shortest confidence-improving experiment is to seed `root/comment` and `taxonomy/wp_pattern_category` with the retained history shape from the source run, then run one natural two-user reload/join flow on the current known-fixes base and measure `/wp-sync` response status and byte size.

## Fix Direction

Bound the read side, not just the write side:

- teach storage retrieval to return a cursor-bounded prefix under a byte budget;
- preserve cursor semantics by advancing only to the last returned row;
- make the HTTP server pass a response update-data budget per room or per request;
- continue returning later rows on subsequent polls rather than loading all history in one response.

This preserves eventual catch-up while preventing one poll from materializing an unbounded historical backlog.
