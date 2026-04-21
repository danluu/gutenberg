# Gutenberg Real-Time Collaboration SUT Analysis

## Summary

This research pass is scoped to Gutenberg's real-time collaborative editing path for the post editor, not the entire monorepo. The SUT spans browser-side CRDT state management in `packages/sync` and `packages/core-data`, plus a WordPress/PHP relay and persistence layer in `lib/compat/wordpress-7.0/`.

The highest-value Antithesis targets are timing-sensitive interactions between:

- client-side Yjs merge logic for post fields and block trees
- persisted CRDT document rehydration and save/autosave flows
- the HTTP polling transport's retry, compaction, and permission-isolation behavior
- awareness/presence state and selection preservation under concurrent edits

## Scope Examined

Primary files and directories examined:

- `packages/sync/src/{manager.ts,utils.ts,undo-manager.ts}`
- `packages/sync/src/providers/http-polling/{http-polling-provider.ts,polling-manager.ts,utils.ts,README.md}`
- `packages/sync/src/test/manager.ts`
- `packages/sync/src/providers/http-polling/test/polling-manager.test.ts`
- `packages/core-data/src/{entities.js,resolvers.js,actions.js,sync.ts}`
- `packages/core-data/src/utils/{crdt.ts,crdt-blocks.ts}`
- `packages/core-data/src/awareness/{awareness-state.ts,base-awareness.ts,post-editor-awareness.ts}`
- `packages/core-data/src/awareness/test/post-editor-awareness.ts`
- `packages/edit-post/src/components/meta-boxes/{use-meta-box-initialization.js,test/use-meta-box-initialization.js}`
- `packages/editor/src/{store/selectors.js,components/post-locked-modal/index.js,utils/sync-error-messages.ts}`
- `lib/compat/wordpress-7.0/{collaboration.php,rest-api.php,class-gutenberg-rest-autosaves-controller.php,class-wp-http-polling-sync-server.php,class-wp-sync-post-meta-storage.php,meta-box-rtc-compat.php}`
- `changelog.txt` entries tagged `RTC` / `real-time collaboration`

## Product Context

From the user's perspective, this feature lets multiple editors work on the same post concurrently in the block editor. Correctness is not just "content eventually syncs"; it includes:

- no lost or duplicated content after concurrent edits
- selections/cursors staying usable while collaborators edit
- autosave/save flows not corrupting persisted CRDT state
- one broken room or permission failure not disrupting unrelated synced rooms
- stale collaborator presence disappearing quickly enough to avoid false UI state

When collaboration is not safe, Gutenberg is designed to fall back to single-editor behavior instead of continuing in a split-brain mode.

## Architecture And Data Flow

### Browser-side collaboration stack

The collaboration client is split across three layers:

- `packages/core-data` owns entity definitions, sync configs, persistence hooks, and editor-facing store updates.
- `packages/sync` owns the generic CRDT/document lifecycle, provider abstraction, retry logic, compaction, and sync-aware undo manager.
- `packages/core-data/src/awareness` owns ephemeral collaborator state such as presence and selection mapping into the block editor.

For post entities, `packages/core-data/src/entities.js` constructs a `syncConfig` that:

- writes local post edits into a Yjs document via `applyPostChangesToCRDTDoc`
- reads remote changes back out with `getPostChangesFromCRDTDoc`
- exposes persisted CRDT data through post meta key `_crdt_document`
- creates `PostEditorAwareness` for editor-specific presence/selection behavior

### Sync manager lifecycle

`packages/sync/src/manager.ts` creates one `Y.Doc` per synced entity and one per synced collection. On entity load it:

- creates the Yjs doc and root maps
- creates awareness if supported
- creates provider instances from `getProviderCreators()`
- attaches observers for record and state map updates
- initializes document state
- applies any persisted CRDT document from the entity record

On local edits, `core-data` dispatches `getSyncManager().update(...)` from `editEntityRecord()`. On remote updates, `SyncManager` compares the CRDT doc against the edited entity record and dispatches `editRecord()` only for changed properties.

### Provider and transport

The default provider is HTTP polling (`packages/sync/src/providers/http-polling`). Room names are encoded as `{entity_kind}/{entity_name}:{object_id}` or just `{entity_kind}/{entity_name}` for collections.

The transport has these important traits:

- requests batch multiple rooms into one `POST /wp-sync/v1/updates`
- each room sends `after` cursor, local awareness state, and queued typed updates
- update queue is initially paused until collaborators are observed on the primary room
- when collaborators are detected, all room queues are resumed
- failures trigger backoff and recovery logic; outgoing updates may be replaced by a full-document compaction update
- 403 permission failures are handled per room rather than as a global disconnect

### PHP relay and storage

`WP_HTTP_Polling_Sync_Server` is a relay, not a CRDT-aware server. It:

- validates request shape and room format
- checks permissions for each room
- rejects client ID reuse across different WordPress users
- stores typed updates via `WP_Sync_Post_Meta_Storage`
- merges awareness state with a 30 second timeout
- nominates the lowest client ID for compaction when update count passes a threshold

`WP_Sync_Post_Meta_Storage` stores each room in a dedicated `wp_sync_storage` post and uses post meta rows as the append-only update log. The effective cursor is `meta_id`, not a semantic timestamp. It intentionally uses direct SQL to avoid broad post meta cache invalidation.

### Save, autosave, and persisted CRDT flow

Persistence crosses the browser/server boundary in two different ways:

- The browser serializes the full Yjs document with `createPersistedCRDTDoc()`.
- `core-data` writes that serialized value into post meta `_crdt_document` during `prePersistPostType()`.

On later loads, `SyncManager.applyPersistedCrdtDoc()` applies the persisted document, then compares it against the current record. If the record has diverged because of server mutations, out-of-band edits, or remote changes that arrived during startup, it reapplies only invalidated keys and persists the result again.

Autosave is patched in PHP specifically because RTC changes the normal WordPress assumption that one author owns the draft. `Gutenberg_REST_Autosaves_Controller` always uses autosave revisions when RTC is enabled to avoid making the canonical post race ahead of the persisted CRDT document.

## State Management And Persistence

Durable state involved in RTC:

- canonical post data in WordPress posts/taxonomy/comment entities
- per-post serialized CRDT document in `_crdt_document` post meta
- relay-side sync update log in `wp_sync_storage` post meta
- relay-side awareness state in `wp_sync_awareness_state`

Ephemeral state involved in RTC:

- in-memory `Y.Doc` and awareness instances per entity/collection
- polling manager room state (`endCursor`, queued updates, primary-room flag)
- collaborator presence snapshots and delayed-removal state in `AwarenessState`
- undo metadata captured in Yjs undo stack items

Important persistence boundaries:

- `_crdt_document` must not be treated like user-facing synced meta; it is explicitly filtered from post-meta syncing.
- relay update rows are durable until compacted; compaction is coordinated but still client-driven.
- awareness is intentionally non-durable and expires after timeout or disconnect signaling.

## Concurrency Model

Concurrency is dominated by browser event ordering, Yjs transactions, and cross-request races.

Key concurrency mechanisms:

- `editEntityRecord()` can emit many small transient changes (`isCached`) and undo-ignored selection updates.
- `SyncManager.update()` is deferred with `yieldToEventLoop`, which intentionally changes ordering.
- Yjs document observers react differently to local and remote origins.
- selection history updates are deferred with `setTimeout(..., 0)` to avoid corrupting undo metadata.
- polling manager batches rooms, awareness, and updates across asynchronous network cycles.
- persisted CRDT rehydration races with remote updates arriving during startup.

Concurrency-sensitive assumptions in code:

- collaborator detection on the first-loaded room is treated as a proxy for "primary" editing activity
- remote updates plus local selection repair will keep cursor state meaningful
- queue replacement with compaction after ambiguous failures is sufficient to avoid duplication and loss
- direct SQL plus `meta_id` ordering is enough to make cursor-based replay race-safe

## Claimed And Implied Guarantees

The code and inline docs imply these guarantees:

- concurrent edits should converge without conflicts because the source of truth is a Yjs CRDT
- local-only block attributes are intentionally not shared to peers
- persisted CRDT documents should provide a safe common starting point and avoid re-initialization loss
- peer saves should eventually be observed locally through `savedAt` metadata and refetch
- one unauthorized or uneditable entity should not tear down collaboration for unrelated entities
- stale collaborator presence should disappear after timeout or explicit disconnect
- draft autosaves under RTC should not make canonical post state diverge from persisted CRDT state

These are strong candidates for Antithesis properties because multiple recent changelog entries show this area is still being hardened.

## Bug History And Regression Signals

`changelog.txt` shows a dense cluster of recent RTC fixes, especially in exactly the kinds of areas Antithesis is good at:

- persisted CRDT correctness: `Fix stale CRDT document persisted on save`, `Apply only detected changes from the persisted CRDT document`, `Do not wrap persisted doc applied update in transaction`
- transport failure handling: `Restore on failed request with compaction update`, `Prevent duplicate poll cycles`, `Isolate sync update failures to prevent full disconnect`, `Fix disconnect dialog due to uneditable entity`
- awareness/presence: `Remove ghost awareness state explicitly when refreshing`, `Improve collaboration within the same rich text`, `Scroll to collaborator on click`
- data-structure merging: `Fix core/table cell merging`, `Fix "Edit as HTML" content reset during collaboration`, `Improve array attribute stability when structural changes occur`
- feature gating: `Disable multiple collaborators if meta boxes are present`, `Implement front-end peer limits`, `Disable RTC in the site editor`

This bug density is a strong signal that transport, persistence, and merge logic should be treated as regression hotspots.

## Existing Test Strategy

Existing automated coverage is mostly unit-level and targeted:

- `packages/sync/src/test/manager.ts` covers load/unload, persisted-doc rehydration, invalidation, save metadata, and shouldSync behavior.
- `packages/sync/src/providers/http-polling/test/polling-manager.test.ts` covers document-size limit handling, connection limits, collaborator-triggered queue resumption, compaction-after-failure recovery, visibility changes, and 403 isolation.
- `packages/core-data/src/awareness/test/post-editor-awareness.ts` covers selection updates, nested-block resolution, template-mode path resolution, and subscriber behavior.
- `packages/edit-post/src/components/meta-boxes/test/use-meta-box-initialization.js` covers RTC disablement when metaboxes are incompatible.
- `packages/core-data/src/test/entities.js` and `packages/core-data/src/test/resolvers.js` cover persisted CRDT meta wiring and sync load/persist handlers.

What is notably missing from the local test picture:

- long-running multi-user browser sessions with concurrent saves/autosaves and injected faults
- end-to-end verification that transport retries plus persisted CRDT repair still converge
- combinations of refresh, disconnect, partial network failure, and concurrent edits

That gap is where Antithesis adds the most value.

## Failure And Degradation Modes

Important failure modes surfaced by the code:

- ambiguous poll failures where the client cannot know whether the server stored outgoing updates
- stale persisted CRDT documents after autosave/save/out-of-band mutations
- queue starvation for collection rooms until collaborator detection resumes the queue
- awareness entries lingering until timeout if disconnect signaling fails
- permission failures for one room inside a batched multi-room request
- compaction races where one client could compact over updates it has not seen if cursor logic is wrong
- large-document mode forcing RTC off and falling back to post locks
- incompatible metaboxes or site-editor contexts silently disabling collaboration

## External Dependencies And Integration Points

The collaboration path depends on:

- WordPress REST API auth and capability checks
- post meta and custom post type storage in MySQL/MariaDB
- browser APIs: timers, `beforeunload`, `pagehide`, `visibilitychange`, `sendBeacon`
- Yjs and awareness protocol behavior
- block-editor store selectors for mapping selection state into local block trees

There is no external message broker; the WordPress app itself is both the editor backend and the sync relay.

## Minimal Antithesis-Relevant Topology Insight

Because faults are injected at container boundaries, the WordPress app and database must be separate containers. The browser/client workload should also be separate so Antithesis can independently fault:

- client <-> WordPress traffic
- WordPress <-> database traffic
- WordPress process availability without simultaneously killing the client

## Assumptions

- The initial Antithesis harness will target the post editor, not the site editor.
- Workload coverage will use at least two authenticated browser sessions or session-equivalent clients against one WordPress instance.
- The first Antithesis pass will prioritize post entities and collection syncs that are loaded incidentally during post editing.

## Open Questions

- None that block setup. The main remaining judgment call is workload style: full browser automation versus a thinner API-driven harness for transport-only properties.
