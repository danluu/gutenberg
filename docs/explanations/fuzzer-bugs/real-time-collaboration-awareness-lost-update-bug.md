# Real-Time Collaboration Awareness Lost Update Bug

## Status

Real product bug. The HTTP polling sync server updated awareness with a whole-room read-modify-write. If another client's awareness write completed after the stale request read the room and before it wrote the merged list, the stale request could overwrite the completed client state.

## Source

-   Handoff item: `real-time-collaboration-distinct-fuzzer-failures.md` item 9.
-   Fuzzer evidence: `phpunit/tests/collaboration/wpHttpPollingSyncServer.php`.
-   Failure signature: "Awareness read-modify-write can lose completed client states."

## Introduced

The vulnerable awareness read-modify-write path was introduced in Gutenberg by [WordPress/gutenberg#74564](https://github.com/WordPress/gutenberg/pull/74564), "Real-time collaboration: Add default HTTP polling sync provider", merged on January 28, 2026. The relevant commit is [`48ce44dac7981eb730079563a3a2975b89840fac`](https://github.com/WordPress/gutenberg/commit/48ce44dac7981eb730079563a3a2975b89840fac), which added `Gutenberg_HTTP_Polling_Sync_Server::process_awareness_update()` with the non-atomic `get_awareness_state()` → PHP merge → `set_awareness_state()` sequence.

The same behavior moved into the current `lib/compat/wordpress-7.0/` path in [WordPress/gutenberg#75366](https://github.com/WordPress/gutenberg/pull/75366), "Real-time collaboration: Move PHP code to compat / backports directory", merged on February 13, 2026. That PR was a relocation/backport step rather than the original introduction of the race; it linked the Gutenberg compat move to the WordPress Core backport proposal [WordPress/wordpress-develop#10894](https://github.com/WordPress/wordpress-develop/pull/10894).

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

-   Invalid oracle: ruled out. The server response and client code both model awareness as the current active client map. Dropping a non-expired completed client entry violates that model.
-   Invalid generated shape: ruled out. The reproducer uses valid room names, positive client IDs, ordinary object awareness states, and the same entry shape the server stores.
-   Helper misuse: ruled out. The minimized reproducer calls the production server/storage methods. The committed regression wraps storage only to force the same interleaving that concurrent HTTP requests can create.
-   Environment contamination: ruled out. The failure reproduces on the known-fixes validation baseline with earlier RTC fixes present.
-   Race-injection-only behavior: ruled out as a false-positive explanation. The injection represents a completed concurrent HTTP polling request. PHP/Apache can process multiple REST requests concurrently, and both requests touch the same single post-meta awareness row.
-   Known-fixed bug masking: ruled out by using the known-fixes baseline and by focusing only on awareness state, not CRDT document updates, cursor scopes, hydration, room creation, or size-limit failures.

## Browser Reachability

Natural multi-user editing can reach the race because each editor tab polls the same room and sends awareness state through the same endpoint. However, a deterministic top-level Playwright repro using realistic user actions only was not practical in this workspace:

-   User actions can cause concurrent polls, but they cannot force one PHP request to pause exactly after the awareness read and before the awareness write.
-   The visible UI symptom can self-heal on the next 250 ms collaborator poll when the overwritten client sends awareness again, making video capture flaky.
-   Adding a server sleep, storage wrapper, REST request injection, or network interception would make the top-level repro deterministic, but those are artificial harness controls rather than user actions.

The deterministic Playwright repro is `test/e2e/specs/editor/collaboration/collaboration-awareness-lost-update.spec.ts`. It activates the `gutenberg-test-plugin-sync-awareness-lost-update-race` e2e plugin, creates a draft post, and makes a browser-authenticated REST request to a test-only endpoint. That endpoint constructs the production `WP_HTTP_Polling_Sync_Server` with an instrumented storage object and injects the storage effect of a second completed awareness request at the vulnerable scheduling point.

The Playwright test includes static annotations explaining both sides of the injection:

-   `event-injection`: the test injects the completed write because Playwright cannot deterministically schedule PHP to pause after the awareness read and before the write.
-   `practical-reachability`: the injected event models a real interleaving where two editor tabs poll `/wp-sync/v1/updates` concurrently for the same room, and one PHP request completes its awareness write while another request is between read and write.

Highest practical deterministic layer reached: Playwright-driven browser REST request into production sync server code, with a test-only storage event injection to force the concurrent completed-write interleaving.

Video: `/Users/danluu/conductor/workspaces/gutenberg-v1/hong-kong/.context/videos/rtc-awareness-lost-update-failing-visible-user-panes.webm`. The video uses the same deterministic event injection as the Playwright repro, but runs the old vulnerable read-modify-write path so the completed client state is visibly lost. It shows two actual WordPress editor screens for the same post, pane A's real Collaborators popover before the stale response, pane A after the collaborator presence UI disappears, the stale browser request, injected completed request, stored awareness row, and annotated running log in one viewport.

Earlier user-screen video without the disappearing Collaborators UI: `/Users/danluu/conductor/workspaces/gutenberg-v1/hong-kong/.context/videos/rtc-awareness-lost-update-failing-user-screens.webm`.

Earlier instrumentation-only video: `/Users/danluu/conductor/workspaces/gutenberg-v1/hong-kong/.context/videos/rtc-awareness-lost-update-failing-injected.webm`.

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
  phpunit/tests/collaboration/wpHttpPollingSyncServer.php \
  packages/e2e-tests/plugins/sync-awareness-lost-update-race.php

WP_BASE_URL=http://localhost:8912 WP_ENV_PORT=8912 WP_ENV_PHPMYADMIN_PORT=9012 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-awareness-lost-update.spec.ts

WP_ENV_PORT=8912 WP_ENV_PHPMYADMIN_PORT=9012 npm run wp-env-test -- run cli wp plugin activate gutenberg-test-plugins/sync-awareness-lost-update-race
WP_ENV_PORT=8912 WP_ENV_PHPMYADMIN_PORT=9012 npm run wp-env-test -- run cli wp option update wp_collaboration_enabled 1
WP_BASE_URL=http://localhost:8912 node .context/record-awareness-lost-update-video.mjs
WP_ENV_PORT=8912 WP_ENV_PHPMYADMIN_PORT=9012 npm run wp-env-test -- run cli wp plugin deactivate gutenberg-test-plugins/sync-awareness-lost-update-race
WP_ENV_PORT=8912 WP_ENV_PHPMYADMIN_PORT=9012 npm run wp-env-test -- run cli wp option update wp_collaboration_enabled 0

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

-   PHP standards: passed.
-   Playwright awareness lost-update repro: passed.
-   `wpHttpPollingSyncServer.php` on WordPress 6.8.3 plugin compat classes: `OK (59 tests, 148 assertions)`.
-   `wpHttpPollingSyncServer.php` on current WordPress trunk Core classes: `OK`, with one expected skip for the plugin-only `update_awareness_state()` method test.
-   `wpSyncPostMetaStorage.php`: `OK (14 tests, 53 assertions)`.
