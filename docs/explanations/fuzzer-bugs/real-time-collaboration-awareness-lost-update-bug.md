# Real-Time Collaboration Awareness Lost Update Bug

## Status

Real product bug. The HTTP polling sync server updated awareness with a whole-room read-modify-write. If another client's awareness write completed after the stale request read the room and before it wrote the merged list, the stale request could overwrite the completed client state.

## Source

- Handoff item: `real-time-collaboration-distinct-fuzzer-failures.md` item 9.
- Fuzzer evidence: `phpunit/tests/collaboration/wpHttpPollingSyncServer.php`.
- Failure signature: "Awareness read-modify-write can lose completed client states."

## Baseline Reproduction

I reproduced the failure against the known-fixes validation worktree, not raw `try/fuzz`, to avoid masking from older RTC bugs:

```bash
WP_ENV_PORT=8893 WP_ENV_PHPMYADMIN_PORT=9003 npm run wp-env start
WP_ENV_PORT=8893 WP_ENV_PHPMYADMIN_PORT=9003 npm run wp-env -- run cli \
  /var/www/html/wp-content/plugins/gutenberg-known-fixes-fuzz/vendor/bin/phpunit \
  --bootstrap /var/www/html/wp-content/plugins/gutenberg-known-fixes-fuzz/.context/issue9-phpunit-bootstrap.php \
  /var/www/html/wp-content/plugins/gutenberg-known-fixes-fuzz/phpunit/tests/collaboration/wpHttpPollingSyncServerIssue9Race.php
```

Result before the fix:

```text
Completed awareness state was lost for seed 9473 step 0 client 1000.
Failed asserting that an array has the key 1000.
```

## Product Impact

The production path is:

1. `POST /wp-sync/v1/updates`
2. `WP_HTTP_Polling_Sync_Server::handle_request()`
3. `process_awareness_update()`
4. `WP_Sync_Post_Meta_Storage::get_awareness_state()`
5. merge the full awareness list in PHP
6. `WP_Sync_Post_Meta_Storage::set_awareness_state()`

That sequence was not atomic. Concurrent PHP requests for the same room can naturally interleave at that boundary. The browser polling manager sends awareness on every poll and treats missing clients in a server response as removed, so a lost server awareness entry can make collaborator avatars/cursors disappear until the overwritten client polls again. If the overwritten write was the client's final completed write before leaving or timing out, other clients may never observe that completed state.

## False-Positive Checks

- Invalid oracle: ruled out. The server response and client code both model awareness as the current active client map. Dropping a non-expired completed client entry violates that model.
- Invalid generated shape: ruled out. The reproducer uses valid room names, positive client IDs, ordinary object awareness states, and the same entry shape the server stores.
- Helper misuse: ruled out. The minimized reproducer calls the production server/storage methods. The committed regression wraps storage only to force the same interleaving that concurrent HTTP requests can create.
- Environment contamination: ruled out. The failure reproduces on the known-fixes validation baseline with earlier RTC fixes present.
- Race-injection-only behavior: ruled out as a false-positive explanation. The injection represents a completed concurrent HTTP polling request. PHP/Apache can process multiple REST requests concurrently, and both requests touch the same single post-meta awareness row.
- Known-fixed bug masking: ruled out by using the known-fixes baseline and by focusing only on awareness state, not CRDT document updates, cursor scopes, hydration, room creation, or size-limit failures.

## Browser Reachability

Natural multi-user editing can reach the race because each editor tab polls the same room and sends awareness state through the same endpoint. However, a deterministic top-level Playwright repro using realistic user actions only was not practical in this workspace:

- User actions can cause concurrent polls, but they cannot force one PHP request to pause exactly after the awareness read and before the awareness write.
- The visible UI symptom can self-heal on the next 250 ms collaborator poll when the overwritten client sends awareness again, making video capture flaky.
- Adding a server sleep, storage wrapper, REST request injection, or network interception would make the top-level repro deterministic, but those are artificial harness controls rather than user actions.

Highest practical deterministic layer reached: production PHP server/storage code with a forced completed-write interleaving, plus ordinary REST and awareness tests proving the surrounding production path.

Video: not produced because no deterministic user-only Playwright repro was available. The product/harness gap is the lack of a test-only server scheduling hook that can pause a real browser-initiated `wp-sync` request inside the PHP awareness read/write window while all top-level actions remain realistic.

## Fix

The fix moves awareness merging into the storage layer via `WP_Sync_Storage::update_awareness_state()`. The post-meta storage implementation takes a per-room MySQL advisory lock, reads the latest awareness state, removes the requesting client's old entry and expired entries, adds the requesting client's new state when non-null, writes the merged list, and returns the `client_id => state` response map.

Current WordPress trunk already loads older Core copies of the RTC server/storage classes before the Gutenberg plugin can load its compat copies. For that runtime path, Gutenberg wraps Core's storage object in `Gutenberg_Sync_Awareness_Merging_Storage`. The wrapper remembers the awareness snapshot returned to Core's older read/write server path, takes the same per-room advisory lock during `set_awareness_state()`, and preserves entries that completed after the stale read.

If the advisory lock cannot be acquired, the server returns a merged response without writing. That avoids overwriting completed states under lock contention; the client will retry awareness on the next poll.

## Verification

Commands run in this workspace:

```bash
vendor/bin/phpcs lib/compat/wordpress-7.0/interface-wp-sync-storage.php \
  lib/compat/wordpress-7.0/class-wp-sync-post-meta-storage.php \
  lib/compat/wordpress-7.0/class-wp-http-polling-sync-server.php \
  phpunit/tests/collaboration/wpHttpPollingSyncServer.php

WP_ENV_PORT=8911 WP_ENV_PHPMYADMIN_PORT=9011 npm run wp-env -- --config=.context/wp-env-wp68.json run cli \
  /var/www/html/wp-content/plugins/hong-kong/vendor/bin/phpunit \
  --bootstrap /var/www/html/wp-content/plugins/hong-kong/.context/issue9-phpunit-bootstrap.php \
  /var/www/html/wp-content/plugins/hong-kong/phpunit/tests/collaboration/wpHttpPollingSyncServer.php

WP_ENV_PORT=8911 WP_ENV_PHPMYADMIN_PORT=9011 npm run wp-env -- --config=.context/wp-env-wp68.json run cli \
  /var/www/html/wp-content/plugins/hong-kong/vendor/bin/phpunit \
  --bootstrap /var/www/html/wp-content/plugins/hong-kong/.context/issue9-phpunit-bootstrap.php \
  /var/www/html/wp-content/plugins/hong-kong/phpunit/tests/collaboration/wpSyncPostMetaStorage.php
```

Results:

- PHP standards: passed.
- `wpHttpPollingSyncServer.php` on WordPress 6.8.3 plugin compat classes: `OK (59 tests, 148 assertions)`.
- `wpHttpPollingSyncServer.php` on current WordPress trunk Core classes: `OK`, with one expected skip for the plugin-only `update_awareness_state()` method test.
- `wpSyncPostMetaStorage.php`: `OK (14 tests, 53 assertions)`.
