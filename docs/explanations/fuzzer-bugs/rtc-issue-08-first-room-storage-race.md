# RTC issue 08: first room storage race

## Status

Real product bug.

The post-meta sync storage backend creates one `wp_sync_storage` post per sync room and uses `md5( $room )` as the post slug. On first access to a new room, two concurrent writers can both miss the existing-storage lookup and both call `wp_insert_post()` with the same slug. WordPress keeps slugs unique, so one request receives the canonical slug and the other receives a suffixed slug such as `<hash>-2`.

There are two related bugs covered by this fix:

1. **First-writer split storage bug.** The original storage creation path trusted the inserted post ID without checking whether WordPress kept the exact room-hash slug. If a request received a suffixed post, it could acknowledge awareness or sync updates written to the suffixed lineage. A fresh storage instance later looks up only the canonical room hash, so those acknowledged first-access writes are unreachable. Source: [`get_storage_post_id()` creates and caches the storage post](../../../lib/compat/wordpress-7.0/class-wp-sync-post-meta-storage.php#L249-L294). Repro/test: [`test_first_access_race_does_not_split_room_storage()`](../../../phpunit/tests/collaboration/wpSyncPostMetaStorage.php#L754-L818).

2. **Draft repair could preserve the wrong slug.** The initial repair plan merged exact and suffixed storage posts by lowest post ID. That is not a safe canonical rule: a pre-existing or concurrently-created suffixed row can have a lower ID than the exact row, and choosing it leaves the only surviving lineage at `<hash>-2`. Fresh readers still use exact-slug lookup, so the repair can keep the room unreachable. Source: canonical selection and duplicate merge now explicitly prefer the exact slug in [`merge_duplicate_storage_posts()`](../../../lib/compat/wordpress-7.0/class-wp-sync-post-meta-storage.php#L337-L379) and [`find_canonical_storage_post_id()`](../../../lib/compat/wordpress-7.0/class-wp-sync-post-meta-storage.php#L382-L405). Repro/test: [`test_duplicate_storage_merge_preserves_exact_room_slug()`](../../../phpunit/tests/collaboration/wpSyncPostMetaStorage.php#L820-L898).

## Reproduction Layers

### PHPUnit storage repro

`phpunit/tests/collaboration/wpSyncPostMetaStorage.php::test_first_access_race_does_not_split_room_storage`

This test installs a `wp_insert_post_data` filter that injects a competing `wp_insert_post()` exactly between the storage layer's miss and its insert. It then asserts:

-   only one published `wp_sync_storage` lineage exists for the room hash;
-   the surviving lineage uses the exact room hash slug;
-   a fresh `WP_Sync_Post_Meta_Storage` instance can read the acknowledged update.

On the vulnerable implementation, the test fails because WordPress creates both `<hash>` and `<hash>-2`, and the update can be written to the suffixed post.

### Repair regression repro

`phpunit/tests/collaboration/wpSyncPostMetaStorage.php::test_duplicate_storage_merge_preserves_exact_room_slug`

This test creates a suffixed storage post first, adds an update to it, then creates the exact room-hash storage post and writes another update through the storage API. It asserts that merge repair leaves one lineage with the exact room hash slug and preserves updates from both lineages.

I verified this test fails without the additional canonical-selection fix. The failing result was:

```text
Merging must keep the exact room hash slug even when a suffixed duplicate has the lower post ID.
Expected: 9720966d49404caf2b77f40844a67593
Actual:   9720966d49404caf2b77f40844a67593-2
```

With the fix restored, the same test passes.

### Browser repro

`test/e2e/specs/editor/collaboration/collaboration-first-room-storage-race.spec.ts`

The browser test uses editor-visible presence to expose the split. It creates a draft post, enables a test-only race injector for the post's sync room, opens the post as admin, and delays the initial empty sync polls until the admin's presence payload contains visible collaborator metadata. The first meaningful admin presence poll then travels through the production `/wp-sync/v1/updates` endpoint and triggers the storage race.

After that acknowledged first write, the test pauses admin polling so the normal retry loop cannot immediately heal the symptom. A collaborator opens the same post and polls the canonical room. The test then holds the collaborator's next poll and releases the admin poll. On the vulnerable implementation, the admin screen learns that the collaborator joined, but the collaborator screen still has no `Collaborators list` button, because the admin's acknowledged first presence write was written to the suffixed storage lineage.

The deterministic browser harness still drives the production editor and sync REST path. The artificial parts are the scheduler that forces the otherwise timing-dependent first-writer race and the short admin-poll pause that keeps the user-visible presence loss observable long enough for the assertion and video. The diagnostic REST endpoint verifies the supporting storage invariant.

Video artifacts:

-   `/Users/danluu/conductor/workspaces/gutenberg-v1/providence/.context/rtc-issue-08/first-room-storage-live-repro.mp4`
-   `/Users/danluu/conductor/workspaces/gutenberg-v1/providence/.context/rtc-issue-08/first-room-storage-live-repro.webm`
-   `/Users/danluu/conductor/workspaces/gutenberg-v1/providence/.context/rtc-issue-08/first-room-storage-race-annotated.mp4`
-   `/Users/danluu/conductor/workspaces/gutenberg-v1/providence/.context/rtc-issue-08/first-room-storage-race-annotated.webm`
-   raw Playwright capture: `/Users/danluu/conductor/workspaces/gutenberg-v1/providence/.context/rtc-issue-08/artifacts-visible-asym/test-results/editor-collaboration-colla-0a839-sible-collaborator-presence-chromium/video.webm`

Observed vulnerable-branch result:

```text
Expected lineage_count: 1
Received lineage_count: 2
Admin screen shows collaborator presence
Collaborator screen has no Collaborators list button
```

## Real-vs-False-Positive Analysis

### Oracle validity

The oracle is valid. A sync room must have one reachable storage lineage because fresh readers find storage by the canonical room hash. If an acknowledged write lands in a suffixed lineage, it is not reachable through normal `get_storage_post_id()` lookup in a new request.

The repair-regression oracle is also valid. A repair that leaves only `<hash>-2` is still broken because fresh readers query `name => $room_hash` and will not find the surviving suffixed post.

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

The storage layer must treat the exact room-hash slug as the only canonical storage lineage:

-   After inserting a storage post, resolve the canonical exact-slug post before returning or caching a post ID.
-   If the inserted post is the only candidate and no exact slug exists, promote that post to the exact room-hash slug before using it.
-   If exact and suffixed duplicates exist, merge metadata into the exact-slug post, never into the lowest-ID suffixed post.
-   Do not delete a duplicate storage post if moving its postmeta rows fails.
-   Cache only the resolved canonical post ID.
-   Cover both the first-access race and the repair canonical-selection case in PHPUnit.

The fix branch intentionally does not include the browser-only diagnostic mu-plugin or e2e repro harness.
