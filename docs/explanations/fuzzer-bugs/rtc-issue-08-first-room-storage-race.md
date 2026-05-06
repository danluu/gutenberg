# RTC issue 08: first room storage race

## Status

Real product bug.

The post-meta sync storage backend creates one `wp_sync_storage` post per sync room and uses `md5( $room )` as the post slug. On first access to a new room, two concurrent writers can both miss the existing-storage lookup and both call `wp_insert_post()` with the same slug. WordPress keeps slugs unique, so one request receives the canonical slug and the other receives a suffixed slug such as `<hash>-2`.

There is one trunk/product bug covered by this fix:

**First-writer split storage bug.** The original storage creation path trusted the inserted post ID without checking whether WordPress kept the exact room-hash slug. If a request received a suffixed post, it could acknowledge awareness or sync updates written to the suffixed lineage. A fresh storage instance later looks up only the canonical room hash, so those acknowledged first-access writes are unreachable. Source: [`get_storage_post_id()` creates and caches the storage post](../../../lib/compat/wordpress-7.0/class-wp-sync-post-meta-storage.php#L245-L294). Repro/test: [`test_first_access_race_does_not_split_room_storage()`](../../../phpunit/tests/collaboration/wpSyncPostMetaStorage.php#L754-L818).

## Branch Layout

The PR branch `danluu/fix-rtc-room-split` intentionally contains only the PHPUnit regression tests and the storage fix. This explanation is kept on the separate `danluu/rtc-room-split-explanation` branch so it does not appear in the PR diff.

There is no top-level Playwright/e2e test in the PR branch.

## Reproduction Layers

### PHPUnit storage repro

`phpunit/tests/collaboration/wpSyncPostMetaStorage.php::test_first_access_race_does_not_split_room_storage`

This test installs a `wp_insert_post_data` filter that injects a competing `wp_insert_post()` exactly between the storage layer's miss and its insert. It then asserts:

-   only one published `wp_sync_storage` lineage exists for the room hash;
-   the surviving lineage uses the exact room hash slug;
-   a fresh `WP_Sync_Post_Meta_Storage` instance can read the acknowledged update.

On the vulnerable implementation, the test fails because WordPress creates both `<hash>` and `<hash>-2`, and the update can be written to the suffixed post.

### Normal REST concurrency repro

[`rtc-issue-08-normal-rest-repro.sh`](./rtc-issue-08-normal-rest-repro.sh) is a standalone script that tries to hit the same race without a forced interleaving. It creates fresh draft posts in local `wp-env`, sends concurrent normal first polls to `/wp-sync/v1/updates`, and checks whether the room has more than one `md5( room )` storage lineage. Depending on timing, the duplicate can use the exact same `post_name` or a suffixed `post_name` such as `<hash>-2`.

This is still probabilistic. It does not install a `wp_insert_post_data` filter, diagnostic mu-plugin, server-side delay, database lock, or scheduler hook. On a vulnerable checkout it can reproduce the split by normal HTTP concurrency alone; on a fixed checkout it should usually exhaust its attempts without finding duplicate storage rows.

The script defaults to three concurrent first polls so the request shape stays close to ordinary simultaneous editors or tabs. Raising `--concurrency` can make the timing window easier to hit on slower or more serialized local environments, but it is not required for the underlying race.

### Browser/video repro

The local browser/video harness uses editor-visible presence to expose the split. It creates a draft post, enables a test-only race injector for the post's sync room, opens the post as admin, and delays the initial empty sync polls until the admin's presence payload contains visible collaborator metadata. The first meaningful admin presence poll then travels through the production `/wp-sync/v1/updates` endpoint and triggers the storage race.

After that acknowledged first write, the test pauses admin polling so the normal retry loop cannot immediately heal the symptom. A collaborator opens the same post and polls the canonical room. The test then holds the collaborator's next poll and releases the admin poll. On the vulnerable implementation, the admin screen learns that the collaborator joined, but the collaborator screen still has no `Collaborators list` button, because the admin's acknowledged first presence write was written to the suffixed storage lineage.

The deterministic browser harness still drives the production editor and sync REST path. The artificial parts are the scheduler that forces the otherwise timing-dependent first-writer race and the short admin-poll pause that keeps the user-visible presence loss observable long enough for the assertion and video. The diagnostic REST endpoint verifies the supporting storage invariant. The browser/video harness is not part of the PR branch.

Annotated videos for this bug:

-   `/Users/danluu/conductor/workspaces/gutenberg-v1/providence/.context/rtc-issue-08/first-room-storage-live-repro.mp4`
-   `/Users/danluu/conductor/workspaces/gutenberg-v1/providence/.context/rtc-issue-08/first-room-storage-document-edit-repro.mp4`

Observed vulnerable-branch result:

```text
Expected lineage_count: 1
Received lineage_count: 2
Admin screen shows collaborator presence
Collaborator screen has no Collaborators list button
```

## Video

-   `/Users/danluu/conductor/workspaces/gutenberg-v1/providence/.context/rtc-issue-08/first-room-storage-live-repro.mp4`
-   `/Users/danluu/conductor/workspaces/gutenberg-v1/providence/.context/rtc-issue-08/first-room-storage-document-edit-repro.mp4`

## Real-vs-False-Positive Analysis

### Oracle validity

The oracle is valid. A sync room must have one reachable storage lineage because fresh readers find storage by the canonical room hash. If an acknowledged write lands in a suffixed lineage, it is not reachable through normal `get_storage_post_id()` lookup in a new request.

### Generated shape validity

The generated room shape is valid. The low-level repro uses `postType/post:<id>:first-access-race`, which matches the production REST room pattern. The browser repro uses the normal editor room `postType/post:<id>`.

### Helper misuse

The failing path does not rely on private test-only storage calls for the browser repro. It opens normal editor sessions and lets the production sync endpoint call `WP_Sync_Post_Meta_Storage`. The PHPUnit repro uses the storage class directly to minimize the race window, but the same get-or-insert code is used by production REST requests.

### Environment contamination

The tests reset the static room cache before fresh-reader checks. The room hash includes the test post ID and a unique suffix, and lineage counting filters by post type, publish status, exact room-hash slug, and suffixed room-hash slugs. The failure is not caused by stale cache state or older storage rows.

### Race-injection-only behavior

The injection forces an interleaving that can occur with two concurrent HTTP requests first accessing a new room: both miss lookup, both insert, and WordPress uniquifies one slug. The injected writer uses `wp_insert_post()` with the same post type, status, title, and slug as production storage creation.

### Known-fixed bug masking

The issue is independent of previously fixed cursor and compaction races. Those bugs affect update retrieval and deletion after storage already exists. This bug happens before the room has canonical storage and can lose the very first awareness or sync update into a suffixed lineage.

## Fix Plan

The storage layer must treat the exact room-hash slug as the only canonical
storage lineage, but the fix must not require duplicate storage posts to
disappear synchronously. The audit consensus was that immediate duplicate
deletion turns stale writers into a data-loss race: a request can cache a
suffixed duplicate post ID, repair can observe that duplicate as empty, and the
stale request can then write a newly acknowledged update to storage that repair
has already deleted or made unreachable.

The revised success condition is therefore:

-   exactly one readable canonical storage post uses the exact `md5( room )`
    slug;
-   duplicate storage posts may remain as repair queues or quarantine targets;
-   no acknowledged sync update is lost;
-   duplicate update rows copied into canonical storage receive fresh canonical
    `meta_id` values greater than any active canonical cursor that missed them;
-   repair is bounded and retry-safe;
-   duplicate awareness state cannot override canonical awareness state.

### Make tests prove the implementation under test

The first priority is to make the tests honest:

-   Add `ReflectionClass( 'WP_Sync_Post_Meta_Storage' )->getFileName()` checks
    in PHPUnit and the e2e helper route.
-   Fail with the loaded file path if CI exercises Core's
    `WP_Sync_Post_Meta_Storage` instead of Gutenberg's compat class.
-   Do not treat `class_exists()` as sufficient proof that the PR code is under
    test.
-   Fix the e2e TypeScript type issue by typing `requestUtils` as
    `RequestUtils`.

### Remove the data-loss edge

The synchronous repair path must not hard-delete duplicate storage posts:

-   Remove `wp_delete_post( $duplicate_id, true )` from hot-path repair.
-   Leave duplicate posts findable by future repair passes.
-   Change tests away from requiring `lineages.length === 1` immediately.
-   Treat leftover duplicates as cleanup debt, not as correctness failure.

This turns stale-writer interleavings from data loss into bounded repair work.
If a stale request writes to a duplicate after one repair pass, a later repair
pass can still find and copy that acknowledged update.

### Make repair bounded and idempotent

Repair should use small autocommit batches instead of raw transactions on the
shared `$wpdb` connection:

-   Remove raw `START TRANSACTION`, `COMMIT`, and `ROLLBACK`.
-   Acquire at most a zero-wait repair lock for repair work; if unavailable,
    skip repair and let the user request proceed.
-   Select at most one duplicate post and a fixed number of sync update rows per
    request, ordered by source `meta_id`.
-   Append copied sync rows to canonical storage so they receive fresh canonical
    `meta_id` values.
-   Delete only source rows proven copied.
-   Leave rows outside the batch high-water mark for future repair.
-   Record deterministic repair identity, preferably a private sidecar marker
    keyed by duplicate post ID and source `meta_id`, so retry after partial
    failure does not create endless canonical duplicates.

Repair should run after first-access duplicate detection or real sync update
writes. It should not run full repair from awareness-only writes or read-only
polling.

### Preserve cursor delivery

The cursor invariant is the heart of the bug:

-   If an active reader has canonical cursor `C`, old duplicate rows with source
    `meta_id < C` are invisible to that reader before repair.
-   After repair, copied rows must have canonical `meta_id > C`.
-   `get_updates_after_cursor( room, C )` must return those copied rows.
-   The response `end_cursor` must cover the copied canonical rows.

Both PHPUnit and e2e diagnostics should assert this exact storage state. A
visible editor-content assertion is useful, but not enough by itself.

### Handle awareness conservatively

Duplicate awareness rows should not be moved wholesale:

-   Exclude `AWARENESS_META_KEY` from duplicate update repair.
-   Canonical awareness wins.
-   Ignore or later discard duplicate awareness state.
-   Add a test where stale duplicate awareness has a higher postmeta `meta_id`
    than canonical awareness and still cannot override canonical state.

Awareness is ephemeral and clients republish it. Dropping stale duplicate
awareness is safer than inventing freshness semantics based on postmeta order.

### Prevent new first-access splits narrowly

The storage creation path still needs to canonicalize the room slug:

-   After inserting a storage post, resolve the exact-slug canonical post before
    returning or caching a post ID.
-   If the inserted post is the only candidate and no exact slug exists, promote
    that post to the exact room-hash slug before using it.
-   Cache only the resolved canonical post ID.
-   Add a narrow creation/canonicalization lock around lookup, insert, and
    recheck.
-   Do not lock every poll or writer in this PR.

Broad writer locking can be considered later if duplicate deletion or stronger
cleanup semantics require it, but it is not needed for the no-delete repair
design.

### Test coverage

Expected regression coverage:

-   PHPUnit provenance test proving the Gutenberg compat class is loaded.
-   TypeScript compile coverage for the e2e `RequestUtils` type.
-   First-access split test proving new writes resolve to canonical storage.
-   Cursor backfill test proving copied canonical rows have
    `meta_id > active_cursor`.
-   Stale-writer test where repair drains a duplicate, a stale writer appends to
    that duplicate afterward, and a later repair recovers the update.
-   Partial failure/retry test where append succeeds, source-row deletion fails,
    and retry converges without losing updates.
-   Awareness stale-state test.
-   Bounded-repair test over multiple passes.
-   E2E diagnostics for room, canonical post ID, duplicate IDs, source meta IDs,
    copied meta IDs, active cursor, and response cursor.

### Deferred cleanup

Duplicate storage post deletion should be a separate cleanup step:

-   Add tombstone or retired-state metadata only if needed for diagnostics or
    future garbage collection.
-   Delete duplicate posts only after a grace period and a final bounded recheck.
-   Do not make duplicate cleanup part of the correctness fix.

## Audit of PR Head 8cc08a6a0ad

Five independent review passes re-audited PR head `8cc08a6a0ad` after a
WordPress.com deployment concern was raised: MySQL advisory locks and raw
transactions may not behave as correctness primitives under HyperDB or database
proxy topologies. The concern is not only performance or connection pinning. In
those deployments, two requests can be routed to different database servers or
connections and both believe they acquired the same named lock.

The audit consensus was: do not ship that head as-is.

### Findings

-   `GET_LOCK()` is not a valid distributed correctness boundary for this code.
    The current repair path acquires a named lock in
    `merge_duplicate_storage_post_meta()`, then starts a raw transaction and
    copies/deletes postmeta rows. Under HyperDB/proxy routing, the lock,
    transaction, and DML may not be bound to the same authoritative connection.
-   The lock serializes only repair workers, not normal writers. A request can
    cache a stale duplicate post ID, insert a new sync update into that
    duplicate, and race with another request that already checked the duplicate
    as empty and is about to delete it.
-   Synchronous duplicate `wp_delete_post()` is the destructive edge. If a stale
    writer inserts before the delete, the acknowledged update can be deleted. If
    it inserts after the delete, WordPress postmeta has no foreign key, so the
    write can succeed against an orphaned `post_id` that future room scans never
    find.
-   The repair is not idempotent in durable state. Copying only
    `meta_key/meta_value` means a failed delete, split lock, or concurrent
    repair can append the same logical duplicate update to canonical storage
    more than once with fresh cursors.
-   Repair currently runs from the normal update and awareness write paths,
    turning rare historical cleanup into extra queries on routine collaboration
    polling.
-   The tests prove the happy-path cursor backfill, but not failed advisory
    locks, split locks, stale writers, partial transactions, replica lag,
    duplicate counts, or HyperDB routing. Some assertions also still require
    immediate single-lineage cleanup, which encodes the unsafe delete behavior.
-   The e2e helper must prove the actual compat class under test, not just
    `class_exists( 'WP_Sync_Post_Meta_Storage' )`, and the e2e TypeScript helper
    must not call a generic `requestUtils.rest< T >()` through an `any` value.

### Recommendation

The current secondary repair/backfill approach should be removed from the PR
branch before merge unless it is redesigned. A smaller PR should keep the
first-access room split fix only:

-   resolve the exact room-hash canonical storage post immediately after
    `wp_insert_post()`;
-   cache only the canonical storage post ID;
-   avoid acknowledging writes to suffixed storage;
-   avoid `GET_LOCK()`, raw transactions, source-row deletion, and duplicate
    post deletion in the synchronous request path;
-   make CI prove it is exercising the patched compat class.

Historical duplicate repair can come back later as a separate design: bounded,
idempotent, and non-destructive; or as an explicit master-pinned migration,
WP-CLI command, or cron cleanup with metrics and a grace period. The success
condition should be no lost acknowledged updates, not immediate duplicate post
removal.

The PR branch intentionally does not include this explanation, the browser-only
diagnostic mu-plugin, or an e2e repro harness.
