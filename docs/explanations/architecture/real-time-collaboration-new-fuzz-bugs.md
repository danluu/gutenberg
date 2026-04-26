# Real-Time Collaboration Fuzz Bug Catalog

This catalog lists the new RTC bugs found while fuzzing a base that included
the known issue fixes from the surrounding fuzz branches and worktrees. It does
not include the previously known transport limit bug.

## Findings

### 1. Duplicate table rows can lose cell content across peers

-   Commit: `d5d1e7041c8 Add RTC duplicate table row repros`
-   Repros:
    -   `packages/core-data/src/utils/test/crdt-table-duplicates.fuzz.test.ts`
    -   `test/e2e/specs/editor/collaboration/collaboration-table-duplicates.spec.ts`
-   Failure: table rows with duplicate serialized cell content are not tracked as
    distinct logical rows in the CRDT merge path. In the browser repro, one user
    creates a three-row table with contents `anchor`, `same`, `same`; the other
    peer receives `anchor`, `same`, `undefined` instead of the same three cell
    contents.
-   Impact: normal table editing can desynchronize collaborator views or drop a
    duplicate row's cell content.
-   Repro status:
    -   CRDT merge unit/fuzz: created in
        `packages/core-data/src/utils/test/crdt-table-duplicates.fuzz.test.ts`.
    -   Sync/core-data integration: covered by the CRDT block merge path used by
        `core-data`'s post sync config.
    -   Playwright normal-user browser repro: created in
        `test/e2e/specs/editor/collaboration/collaboration-table-duplicates.spec.ts`.
        The test uses the editor UI to create a table and type duplicate row
        contents.

### 2. Failed provider creation leaves an entity permanently loaded

-   Commit: `3e76fdf6e8f Add five RTC sync lifecycle bug repros`
-   Repros:
    -   `packages/sync/src/test/manager.ts`
    -   `test/e2e/specs/editor/collaboration/collaboration-provider-lifecycle.spec.ts`
    -   `packages/e2e-tests/plugins/sync-provider-lifecycle.php`
-   Failure: `SyncManager.load()` stores the entity state before provider creation
    finishes. If the provider creator rejects, a later retry for the same entity
    is skipped because the stale entity state remains registered.
-   Impact: a transient provider startup failure can permanently prevent RTC from
    connecting for that entity until the manager is recreated.
-   Repro status:
    -   SyncManager public API: created in `packages/sync/src/test/manager.ts`.
    -   Core-data/editor integration: created in
        `test/e2e/specs/editor/collaboration/collaboration-provider-lifecycle.spec.ts`.
        The browser test activates an editor plugin that uses the public
        `sync.providers` filter to behave like a third-party RTC provider that is
        temporarily unavailable.
    -   Playwright plugin-user browser repro: created in
        `test/e2e/specs/editor/collaboration/collaboration-provider-lifecycle.spec.ts`.
        A user opens a post while the provider is unavailable, then clicks the
        plugin's visible `Reconnect RTC provider` button after the provider is
        available. The button invalidates and re-resolves the normal
        `core-data` post entity. With the bug, the post provider creator is not
        called a second time because the stale entity state from the failed first
        load is still registered.
    -   Playwright extension-user browser repro with automatic recovery and the
        real default provider: created in
        `test/e2e/specs/editor/collaboration/collaboration-provider-lifecycle.spec.ts`.
        An activated provider extension wraps Gutenberg's default HTTP provider.
        User A opens a post while the provider is temporarily unavailable. The
        extension then automatically recovers and re-resolves the current post,
        delegating to the real HTTP provider after recovery. User B opens the
        same post with the provider already available. With the bug, User A never
        reconnects to normal collaboration and never sees User B in the
        Collaborators list.
    -   Playwright stock-editor repro: still not created. The default HTTP polling
        provider does not reject during construction: it constructs the
        `HttpPollingProvider`, registers the room, and returns before any network
        request is awaited. The stock Retry modal only retries an already-created
        polling provider, so it is not shown for provider-creator rejection. I
        also did not find a stock post-editor action that invalidates and
        re-resolves the current post entity in the same page; a full page reload
        recreates the sync manager and therefore does not exercise this stale
        in-memory state.

### 3. Partial provider creation failure leaks already-created providers

-   Commit: `3e76fdf6e8f Add five RTC sync lifecycle bug repros`
-   Repros:
    -   `packages/sync/src/test/manager.ts`
    -   `test/e2e/specs/editor/collaboration/collaboration-provider-lifecycle.spec.ts`
    -   `packages/e2e-tests/plugins/sync-provider-lifecycle.php`
-   Failure: when one provider creator resolves and a later provider creator
    rejects, `SyncManager.load()` rejects without destroying the provider that was
    already created.
-   Impact: listeners, polling rooms, awareness state, or other provider resources
    can remain active after a failed load.
-   Repro status:
    -   SyncManager public API: created in `packages/sync/src/test/manager.ts`.
    -   Core-data/editor integration: created in
        `test/e2e/specs/editor/collaboration/collaboration-provider-lifecycle.spec.ts`.
        The test exercises the real `core-data` entity resolver and
        `SyncManager.load()` path from the editor.
    -   Playwright plugin-user browser repro: created in
        `test/e2e/specs/editor/collaboration/collaboration-provider-lifecycle.spec.ts`.
        An activated plugin registers two providers through `sync.providers`: the
        first provider starts and the second provider rejects. With the bug, the
        first provider's `destroy()` method is never called.
    -   Playwright extension-user browser repro with the real default provider:
        created in
        `test/e2e/specs/editor/collaboration/collaboration-provider-lifecycle.spec.ts`.
        An activated provider extension appends a failing provider after
        Gutenberg's default HTTP provider. The user simply opens a post. With the
        bug, the real HTTP provider keeps polling the post room after the later
        extension provider rejects. The test first allows for the initial
        in-flight sync request, then fails when a later post-room sync request is
        still sent instead of the default provider being destroyed.
    -   Playwright stock-editor repro: still not created. Stock Gutenberg only
        registers the default HTTP polling provider, so ordinary stock editor
        actions do not create a partial provider failure.

### 4. Undo metadata is written to the wrong synced entity

-   Commit: `3e76fdf6e8f Add five RTC sync lifecycle bug repros`
-   Repros:
    -   `packages/sync/src/test/manager.ts`
    -   `test/e2e/specs/editor/collaboration/collaboration-undo-redo.spec.ts`
-   Failure: each `SyncUndoManager.addToScope()` call registers global
    `stack-item-added` and `stack-item-popped` listeners that close over that
    entity's handlers but do not check which Yjs document emitted the undo event.
    A change in entity A also calls entity B's undo metadata handler.
-   Impact: undo/redo metadata can be attached to or restored from the wrong
    Gutenberg entity when multiple synced entities are loaded.
-   Repro status:
    -   SyncManager and Yjs undo integration: created in
        `packages/sync/src/test/manager.ts`.
    -   Core-data/editor integration: covered by the browser repro because it
        exercises the real `core-data` resolver handlers, post sync config,
        default taxonomy sync config, and editor selection store.
    -   Playwright normal-user browser repro: created in
        `test/e2e/specs/editor/collaboration/collaboration-undo-redo.spec.ts`.
        The test opens the normal pre-publish panel, which loads the default
        category entity as a second synced Yjs document. It then types
        `abcdef`, places the caret after `abc`, splits the paragraph with
        Enter, and undoes with the normal keyboard shortcut. With the bug, the
        content is restored to `abcdef` but the editor selection is unset
        instead of restored to offset 3. A control run with the category load
        removed passes, confirming the failure is caused by the second synced
        entity.

### 5. A surviving room's compaction update is dropped after a 403 in another room

-   Commit: `3e76fdf6e8f Add five RTC sync lifecycle bug repros`
-   Repros:
    -   `packages/sync/src/providers/http-polling/test/polling-manager.test.ts`
    -   `test/e2e/specs/editor/collaboration/collaboration-compaction-permission.spec.ts`
-   Failure: after a server-requested compaction update is sent for a room, a 403
    for another room unregisters the forbidden room and restores updates for
    surviving rooms. The restore path filters out compaction updates, so the
    surviving room's only compaction update is lost.
-   Impact: a permission loss in one synced room can cause another room to miss a
    server-requested full-state compaction.
-   Repro status:
    -   HTTP polling manager unit/integration: created in
        `packages/sync/src/providers/http-polling/test/polling-manager.test.ts`.
    -   REST server integration: created in
        `test/e2e/specs/editor/collaboration/collaboration-compaction-permission.spec.ts`.
        The test drives the real editor and sync server until the server nominates
        the post room for compaction.
    -   Playwright normal-user browser repro: created in
        `test/e2e/specs/editor/collaboration/collaboration-compaction-permission.spec.ts`.
        Two administrator browser sessions open the same post and load the default
        category room through the normal pre-publish panel. One user then types
        80 characters into the normal title field, which produces enough post-room
        sync updates for the real server to request compaction. A third admin page
        uses the normal Writing settings and Categories screens to move the
        default category back to `Uncategorized` and delete the loaded category.
        The current browser repro fails before the narrow unit-test assertion: the
        403 is surfaced to the polling manager as a generic `Response`, so the
        deleted category room remains in later retry payloads and all rooms back
        off. The test's next assertion checks that, once that 403 handling layer is
        fixed, the queued post compaction update is retried instead of dropped.

### 6. Remaining rooms never resume queued updates after the primary room is unregistered

-   Commit: `3e76fdf6e8f Add five RTC sync lifecycle bug repros`
-   Repros:
    -   `packages/sync/src/providers/http-polling/test/polling-manager.test.ts`
    -   `test/e2e/specs/editor/collaboration/collaboration-primary-room-unregister.spec.ts`
    -   `packages/e2e-tests/plugins/sync-room-lifecycle.php`
-   Failure: the polling provider marks the first registered room as primary and
    only uses the primary room for collaborator detection and queue resumption. If
    that primary room is unregistered, no remaining room is promoted, so later
    collaborator awareness in the surviving room does not resume queued local
    updates.
-   Impact: local edits in remaining synced rooms can stay queued indefinitely
    after the original primary room is removed.
-   Repro status:
    -   HTTP polling manager unit/integration: created in
        `packages/sync/src/providers/http-polling/test/polling-manager.test.ts`.
    -   Core-data/editor integration: created in
        `test/e2e/specs/editor/collaboration/collaboration-primary-room-unregister.spec.ts`.
        The stock repro uses the normal editor title and Notes UI; the plugin
        repro uses public `core-data` actions from an activated editor plugin so
        the page stays open after deleting the current post entity and can
        continue editing a loaded category entity.
    -   Playwright normal-user stock browser repro: created in
        `test/e2e/specs/editor/collaboration/collaboration-primary-room-unregister.spec.ts`.
        User A opens a post alone, so the post room is primary and the notes
        collection room's update queue is still paused. User A then replaces the
        normal title field with an oversized pasted title, which triggers the
        document-size limit and unregisters only the primary post room. User B
        opens the same post and joins the surviving `root/comment` room. User A
        then adds a note through the normal Notes UI. With the bug, User A's
        next `root/comment` sync payload has zero updates, and User B never gets
        the `All notes` button for that note.
    -   Playwright plugin-user browser repro: created in
        `test/e2e/specs/editor/collaboration/collaboration-primary-room-unregister.spec.ts`.
        User A opens a post, loads the default category room through the normal
        pre-publish panel, then clicks a visible plugin button that deletes the
        current post entity in place. User B opens a different post and loads the
        same category room through the normal pre-publish panel. User A then
        clicks a visible plugin button that edits the loaded category entity.
        The next sync payload from User A contains the category room but zero
        updates, showing that collaborator awareness in the surviving category
        room did not resume its queued local update after the original post room
        was unregistered.
    -   Stock paths that were ruled out: the stock "Move to trash" action
        redirects away after deleting the post, and the remote post-deletion path
        is blocked by the browser-level 403 handling behavior reproduced in bug 5. The working stock path is the oversized-title route above, combined
        with the normal Notes UI as the surviving synced room.

## Verification

The repros are intentionally failing on the current implementation:

-   `npx wp-scripts test-unit-js packages/sync/src/test/manager.ts --runInBand`
    passes the existing tests and fails the three new `SyncManager` repros.
-   `npx wp-scripts test-unit-js packages/sync/src/providers/http-polling/test/polling-manager.test.ts --runInBand`
    passes the existing tests and fails the two new polling-manager repros.
-   The duplicate table bug has both a deterministic unit/fuzz repro and a
    Playwright browser repro using normal table UI actions.
-   `WP_BASE_URL=http://localhost:8990 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-undo-redo.spec.ts --grep "Undo restores the post selection"`
    fails the new undo selection browser repro with the selection unset after
    undo. Temporarily removing the normal pre-publish category load makes the
    same test pass.
-   `WP_BASE_URL=http://localhost:8990 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-compaction-permission.spec.ts --grep "retries a queued post compaction"`
    uses normal title typing to trigger server-requested compaction, then fails
    after a normal admin UI category deletion because the next retry payload still
    contains the deleted `taxonomy/category` room.
-   `WP_BASE_URL=http://localhost:8990 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-provider-lifecycle.spec.ts`
    fails the provider retry repro with one post-room provider creation attempt
    instead of two, and fails the partial-provider repro with zero destroys for
    the provider that was created before the later provider rejected.
-   `WP_BASE_URL=http://localhost:8990 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-provider-lifecycle.spec.ts --grep "transient default-provider startup outage"`
    uses a provider extension that automatically recovers and then delegates to
    Gutenberg's real default HTTP provider. It fails because User A never
    reconnects and never sees User B in the normal Collaborators list.
-   `WP_BASE_URL=http://localhost:8990 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-provider-lifecycle.spec.ts --grep "cleans up the default HTTP provider"`
    uses the real default HTTP provider plus a failing extension provider. It
    fails because a later post-room sync request is still sent after the
    extension provider rejects, showing that the default provider was leaked.
-   `WP_BASE_URL=http://localhost:8990 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-primary-room-unregister.spec.ts`
    fails after User A deletes the original post room in place and User B joins
    the surviving category room; the next User A payload has no post room and has
    the category room with zero queued updates.
-   `WP_BASE_URL=http://localhost:8990 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-primary-room-unregister.spec.ts --grep "syncs notes after an oversized title"`
    uses no repro plugin. It fails after normal editor actions: User A pastes an
    oversized title, User B opens the same post, and User A adds a note. The next
    User A `root/comment` payload has zero updates, and User B never sees the
    `All notes` button for the note.
