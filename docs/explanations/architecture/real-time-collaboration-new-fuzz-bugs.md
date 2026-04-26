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
-   Repro: `packages/sync/src/test/manager.ts`
-   Failure: `SyncManager.load()` stores the entity state before provider creation
    finishes. If the provider creator rejects, a later retry for the same entity
    is skipped because the stale entity state remains registered.
-   Impact: a transient provider startup failure can permanently prevent RTC from
    connecting for that entity until the manager is recreated.
-   Repro status:
    -   SyncManager public API: created in `packages/sync/src/test/manager.ts`.
    -   Core-data/editor integration: not created. `core-data` starts sync by
        calling `SyncManager.load()` and intentionally does not await the result,
        so a higher-level repro needs a provider fault injected before the entity
        resolver starts.
    -   Playwright normal-user browser repro: not created for the stock editor.
        The default HTTP polling provider does not reject during construction;
        reproducing this in the browser requires an injected or third-party
        provider that fails during creation, then a same-page retry of the same
        entity.

### 3. Partial provider creation failure leaks already-created providers

-   Commit: `3e76fdf6e8f Add five RTC sync lifecycle bug repros`
-   Repro: `packages/sync/src/test/manager.ts`
-   Failure: when one provider creator resolves and a later provider creator
    rejects, `SyncManager.load()` rejects without destroying the provider that was
    already created.
-   Impact: listeners, polling rooms, awareness state, or other provider resources
    can remain active after a failed load.
-   Repro status:
    -   SyncManager public API: created in `packages/sync/src/test/manager.ts`.
    -   Core-data/editor integration: not created. A higher-level repro needs
        multiple provider creators registered through the `sync.providers` hook,
        where one creator succeeds and a later creator rejects.
    -   Playwright normal-user browser repro: not created for the stock editor.
        The browser-level trigger requires a plugin or injected provider list;
        ordinary editor actions with the default provider do not create the
        partial-provider-failure state.

### 4. Undo metadata is written to the wrong synced entity

-   Commit: `3e76fdf6e8f Add five RTC sync lifecycle bug repros`
-   Repro: `packages/sync/src/test/manager.ts`
-   Failure: each `SyncUndoManager.addToScope()` call registers global
    `stack-item-added` and `stack-item-popped` listeners that close over that
    entity's handlers but do not check which Yjs document emitted the undo event.
    A change in entity A also calls entity B's undo metadata handler.
-   Impact: undo/redo metadata can be attached to or restored from the wrong
    Gutenberg entity when multiple synced entities are loaded.
-   Repro status:
    -   SyncManager and Yjs undo integration: created in
        `packages/sync/src/test/manager.ts`.
    -   Core-data/editor integration: not created. The next useful level is an
        editor test with two concurrently loaded synced entities and observable
        selection metadata on both entities.
    -   Playwright normal-user browser repro: not created yet. A stock normal-user
        repro needs a UI workflow that loads and edits two synced entities in the
        same page and makes the wrong-entity selection restore visible.

### 5. A surviving room's compaction update is dropped after a 403 in another room

-   Commit: `3e76fdf6e8f Add five RTC sync lifecycle bug repros`
-   Repro: `packages/sync/src/providers/http-polling/test/polling-manager.test.ts`
-   Failure: after a server-requested compaction update is sent for a room, a 403
    for another room unregisters the forbidden room and restores updates for
    surviving rooms. The restore path filters out compaction updates, so the
    surviving room's only compaction update is lost.
-   Impact: a permission loss in one synced room can cause another room to miss a
    server-requested full-state compaction.
-   Repro status:
    -   HTTP polling manager unit/integration: created in
        `packages/sync/src/providers/http-polling/test/polling-manager.test.ts`.
    -   REST server integration: not created. The next level needs an actual sync
        server state with at least two rooms in one poll, a compaction nomination
        for the surviving room, and a simultaneous 403 for another room.
    -   Playwright normal-user browser repro: not created for the stock editor.
        The required timing combines server compaction nomination with a
        concurrent permission loss; ordinary editor actions do not deterministically
        create that race without server-side test setup.

### 6. Remaining rooms never resume queued updates after the primary room is unregistered

-   Commit: `3e76fdf6e8f Add five RTC sync lifecycle bug repros`
-   Repro: `packages/sync/src/providers/http-polling/test/polling-manager.test.ts`
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
    -   Core-data/editor integration: not created. The next level needs a page with
        a primary post room and a secondary synced room, then a primary-room
        unregister while the secondary room remains loaded.
    -   Playwright normal-user browser repro: not created yet. The most plausible
        stock workflow is to unregister the post room through a normal
        unrecoverable event such as an oversized paste, then edit a remaining
        synced secondary entity with another collaborator present and assert that
        the secondary edit never syncs.

## Verification

The repros are intentionally failing on the current implementation:

-   `npx wp-scripts test-unit-js packages/sync/src/test/manager.ts --runInBand`
    passes the existing tests and fails the three new `SyncManager` repros.
-   `npx wp-scripts test-unit-js packages/sync/src/providers/http-polling/test/polling-manager.test.ts --runInBand`
    passes the existing tests and fails the two new polling-manager repros.
-   The duplicate table bug has both a deterministic unit/fuzz repro and a
    Playwright browser repro using normal table UI actions.
