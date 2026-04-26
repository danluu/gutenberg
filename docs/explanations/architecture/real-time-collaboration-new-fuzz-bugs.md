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

### 2. Failed provider creation leaves an entity permanently loaded

-   Commit: `3e76fdf6e8f Add five RTC sync lifecycle bug repros`
-   Repro: `packages/sync/src/test/manager.ts`
-   Failure: `SyncManager.load()` stores the entity state before provider creation
    finishes. If the provider creator rejects, a later retry for the same entity
    is skipped because the stale entity state remains registered.
-   Impact: a transient provider startup failure can permanently prevent RTC from
    connecting for that entity until the manager is recreated.

### 3. Partial provider creation failure leaks already-created providers

-   Commit: `3e76fdf6e8f Add five RTC sync lifecycle bug repros`
-   Repro: `packages/sync/src/test/manager.ts`
-   Failure: when one provider creator resolves and a later provider creator
    rejects, `SyncManager.load()` rejects without destroying the provider that was
    already created.
-   Impact: listeners, polling rooms, awareness state, or other provider resources
    can remain active after a failed load.

### 4. Undo metadata is written to the wrong synced entity

-   Commit: `3e76fdf6e8f Add five RTC sync lifecycle bug repros`
-   Repro: `packages/sync/src/test/manager.ts`
-   Failure: each `SyncUndoManager.addToScope()` call registers global
    `stack-item-added` and `stack-item-popped` listeners that close over that
    entity's handlers but do not check which Yjs document emitted the undo event.
    A change in entity A also calls entity B's undo metadata handler.
-   Impact: undo/redo metadata can be attached to or restored from the wrong
    Gutenberg entity when multiple synced entities are loaded.

### 5. A surviving room's compaction update is dropped after a 403 in another room

-   Commit: `3e76fdf6e8f Add five RTC sync lifecycle bug repros`
-   Repro: `packages/sync/src/providers/http-polling/test/polling-manager.test.ts`
-   Failure: after a server-requested compaction update is sent for a room, a 403
    for another room unregisters the forbidden room and restores updates for
    surviving rooms. The restore path filters out compaction updates, so the
    surviving room's only compaction update is lost.
-   Impact: a permission loss in one synced room can cause another room to miss a
    server-requested full-state compaction.

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

## Verification

The repros are intentionally failing on the current implementation:

-   `npx wp-scripts test-unit-js packages/sync/src/test/manager.ts --runInBand`
    passes the existing tests and fails the three new `SyncManager` repros.
-   `npx wp-scripts test-unit-js packages/sync/src/providers/http-polling/test/polling-manager.test.ts --runInBand`
    passes the existing tests and fails the two new polling-manager repros.
-   The duplicate table bug has both a deterministic unit/fuzz repro and a
    Playwright browser repro using normal table UI actions.
