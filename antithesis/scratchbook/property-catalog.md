---
commit: c994c186704ce38fd6ed8ce5b02e42219183bf2f
updated: 2026-04-20
---

# RCE Property Catalog

## Scope

This catalog is limited to Gutenberg's post-editor real-time collaboration path: CRDT merge logic, persisted CRDT documents, HTTP polling transport, awareness/presence, and save/autosave correctness.

## Category: CRDT Merge And Editor State

These properties target convergence and editor usability under concurrent edits.

### concurrent-rich-text-edits-converge — Concurrent Rich Text Edits Converge

| | |
|---|---|
| **Type** | Safety |
| **Priority** | High |
| **Property** | Two collaborators editing the same rich-text field concurrently eventually converge to identical post state without duplicated or dropped text. |
| **Invariant** | Use `Always` on a workload-visible comparison of final `content`, `title`, or `excerpt` after both sessions quiesce, plus `Reachable` markers for overlapping edit windows. `Always` matches the semantics because divergence is never acceptable once both clients have processed the same update set. |
| **Antithesis Angle** | Explore interleavings between local typing, `yieldToEventLoop` update scheduling, polling delays, retries, and remote update application. |
| **Why It Matters** | Recent RTC fixes touched rich-text deserialization, same-rich-text collaboration, and content-reset regressions; this is a core user-facing guarantee. |

### concurrent-block-tree-edits-preserve-structure — Concurrent Block Tree Edits Preserve Structure

| | |
|---|---|
| **Type** | Safety |
| **Priority** | High |
| **Property** | Concurrent structural edits to blocks never leave peers with different or invalid block trees. |
| **Invariant** | Use `Always` on serialized block-tree equivalence and block validity after concurrent insert/move/delete operations, with SUT-side `Reachable` markers around structural merge branches. `Always` is correct because malformed or divergent trees are not acceptable outcomes. |
| **Antithesis Angle** | Interleave structural mutations with remote merges, delayed polling, and compaction/recovery to stress `mergeCrdtBlocks`. |
| **Why It Matters** | Changelog history includes fixes for table cell merges, edit-as-HTML resets, and array attribute stability during structural changes. |

### local-only-block-attributes-do-not-replicate — Local-Only Block Attributes Do Not Replicate

| | |
|---|---|
| **Type** | Safety |
| **Priority** | Medium |
| **Property** | Attributes marked as block-local never leak into replicated CRDT state or other peers' rendered block attributes. |
| **Invariant** | Use `Always` on peer-visible block attributes after edits touching role=`local` attributes, with optional SUT-side `Unreachable` if filtered attributes appear in outgoing CRDT maps. `Always` matches the "must never leak" semantics. |
| **Antithesis Angle** | Combine concurrent edits to serializable and non-serializable attributes so filtering is exercised during active merge traffic. |
| **Why It Matters** | `crdt-blocks.ts` explicitly strips local attributes, and regressions here create invisible cross-user state corruption. |

### remote-edits-preserve-local-selection — Remote Edits Preserve Local Selection

| | |
|---|---|
| **Type** | Safety |
| **Priority** | High |
| **Property** | Remote content changes never reset a collaborator's local selection to a stale position; selection is shifted to the correct logical location. |
| **Invariant** | Use `Always` on selection-history correctness after remote edits, plus `Reachable` markers for selection-shift code paths. `Always` is appropriate because cursor resets are correctness failures, not merely quality issues. |
| **Antithesis Angle** | Race local cursor movement, remote content edits, delayed awareness propagation, and undo restoration. |
| **Why It Matters** | The awareness layer explicitly injects undo-ignored selection edits to counter remote-reset behavior. |

### collection-room-updates-release-after-collaborator-detection — Collection Room Updates Release After Collaborator Detection

| | |
|---|---|
| **Type** | Liveness |
| **Priority** | Medium |
| **Property** | Updates queued for collection rooms eventually begin flowing once the primary room detects a collaborator. |
| **Invariant** | Use `Sometimes(cond)` where `cond` is "a queued collection-room update is later emitted after primary-room collaborator detection", plus `Reachable` on the resume path. `Sometimes` is correct because this is progress through a gated transport state machine. |
| **Antithesis Angle** | Explore delayed collaborator arrival, staggered room registration, and transient transport failures while queued collection updates accumulate. |
| **Why It Matters** | The polling manager intentionally pauses queues until collaboration is detected; mistakes here can silently starve comments/taxonomies/secondary rooms. |

## Category: Persistence, Save, And Autosave

These properties cover the boundary between browser CRDT state and durable WordPress state.

### persisted-crdt-reload-does-not-duplicate-content — Persisted CRDT Reload Does Not Duplicate Content

| | |
|---|---|
| **Type** | Safety |
| **Priority** | High |
| **Property** | Reloading from a persisted CRDT document never duplicates or deletes content when the canonical record and persisted doc briefly diverge. |
| **Invariant** | Use `Always` on post state after reload/rejoin sequences, with SUT-side `Reachable` markers for persisted-doc invalidation and repair branches in `applyPersistedCrdtDoc()`. |
| **Antithesis Angle** | Interleave refresh/rejoin with remote edits and save/autosave operations so persisted-doc initialization races are exercised. |
| **Why It Matters** | The code and changelog both call out this exact failure mode as a source of duplicate inserts/deletions. |

### out-of-band-server-mutations-repersist-clean-crdt — Out-Of-Band Server Mutations Repersist A Clean CRDT

| | |
|---|---|
| **Type** | Safety |
| **Priority** | High |
| **Property** | If the server mutates the record outside the local CRDT view, the client repairs only the invalidated keys and re-persists a CRDT document consistent with the canonical record. |
| **Invariant** | Use `Always` on post fields and `_crdt_document` consistency after server-side mutation, with SUT-side `Reachable` markers when invalidated keys are detected and persisted. |
| **Antithesis Angle** | Inject saves, autosaves, and restart/reload windows around record mutation so the repair logic runs under ambiguous ordering. |
| **Why It Matters** | `applyPersistedCrdtDoc()` explicitly lists out-of-band updates as a supported invalidation source. |

### peer-save-triggers-record-and-collection-refresh — Peer Save Triggers Record And Collection Refresh

| | |
|---|---|
| **Type** | Liveness |
| **Priority** | High |
| **Property** | A save performed by one peer eventually causes other peers to refetch the affected record or collection and converge on the saved state. |
| **Invariant** | Use `Sometimes(cond)` where `cond` is "a peer observes remote `savedAt` metadata and refetches to the saved state", plus SUT-side `Reachable` markers on state-map save notifications. |
| **Antithesis Angle** | Vary polling delays, partial failures, and overlapping unsaved local edits while one peer saves. |
| **Why It Matters** | Without this refresh path, peers can keep editing against stale persistence assumptions. |

### draft-autosaves-do-not-diverge-canonical-state — Draft Autosaves Do Not Diverge Canonical State

| | |
|---|---|
| **Type** | Safety |
| **Priority** | High |
| **Property** | Under RTC, draft autosaves never move the canonical post ahead of the persisted CRDT document in a way that causes reload divergence. |
| **Invariant** | Use `Always` on the relationship between canonical post fields, autosave revision behavior, and persisted CRDT consistency across reloads; add `Reachable` markers around the RTC-specific autosave branch in PHP. |
| **Antithesis Angle** | Interleave autosaves from multiple users, reloads, and remote content updates while faults delay or reorder HTTP requests. |
| **Why It Matters** | `Gutenberg_REST_Autosaves_Controller` exists almost entirely to prevent this corruption mode. |

### persisted-crdt-meta-does-not-sync-back-to-peers — Persisted CRDT Meta Does Not Sync Back To Peers

| | |
|---|---|
| **Type** | Safety |
| **Priority** | Medium |
| **Property** | The `_crdt_document` persistence blob is never replicated as ordinary synced post meta and never becomes peer-visible editor state. |
| **Invariant** | Use `Always` on peer-visible post meta and CRDT contents, with optional SUT-side `Unreachable` if `_crdt_document` is observed in synced meta maps. |
| **Antithesis Angle** | Exercise concurrent meta edits and save/reload cycles so persistence and ordinary meta syncing overlap. |
| **Why It Matters** | Replicating the persistence blob as user meta would feed the serialized CRDT back into collaborative state and corrupt future merges. |

## Category: Transport, Retry, And Presence

These properties target the HTTP polling protocol and its degraded states.

### poll-failures-recover-without-losing-local-updates — Poll Failures Recover Without Losing Local Updates

| | |
|---|---|
| **Type** | Safety |
| **Priority** | High |
| **Property** | After an ambiguous polling failure, the client eventually recovers without losing locally generated updates or replaying them in a way that corrupts the document. |
| **Invariant** | Use `Always` on final convergence after forced poll failures, plus `Reachable` markers when the queue switches to compaction-based recovery. |
| **Antithesis Angle** | Fault network requests between client and WordPress precisely after the server may or may not have accepted outgoing updates. |
| **Why It Matters** | The retry path explicitly exists to handle "write may have succeeded, response failed" ambiguity. |

### compaction-does-not-discard-unseen-updates — Compaction Does Not Discard Unseen Updates

| | |
|---|---|
| **Type** | Safety |
| **Priority** | High |
| **Property** | Server-initiated compaction never drops updates that some client has not yet observed. |
| **Invariant** | Use `Always` on document equivalence across clients before and after compaction, with SUT-side `Reachable` markers for compaction nomination and storage pruning branches. |
| **Antithesis Angle** | Explore delayed clients, stale cursors, and concurrent update/compaction races. |
| **Why It Matters** | The relay is append-only until compaction; incorrect cursor handling is a direct data-loss risk. |

### forbidden-room-isolated-from-other-sync-rooms — Forbidden Room Isolated From Other Sync Rooms

| | |
|---|---|
| **Type** | Safety |
| **Priority** | High |
| **Property** | A permission failure for one room in a batched polling request never disconnects or corrupts other authorized rooms. |
| **Invariant** | Use `Always` on continued sync for authorized rooms after a batched 403 affecting another room, plus `Reachable` on the 403 room-identification path. |
| **Antithesis Angle** | Combine mixed-permission room sets with retries and prefix-colliding room names to stress the failure-isolation code. |
| **Why It Matters** | This is a recent regression area; the code has special handling for longest-room-name matching and silent unregister. |

### client-id-hijack-is-rejected — Client ID Hijack Is Rejected

| | |
|---|---|
| **Type** | Safety |
| **Priority** | Medium |
| **Property** | A different WordPress user cannot reuse another collaborator's Yjs client ID for the same room and successfully join the session. |
| **Invariant** | Use `Always` on permission rejection for cross-user client-ID reuse, with SUT-side `Reachable` markers in the PHP ownership check. |
| **Antithesis Angle** | Reorder joins, reconnects, and refreshes while multiple users race to claim IDs. |
| **Why It Matters** | Client ID ownership is the main server-side guard against cross-user impersonation inside a room. |

### awareness-clears-stale-collaborators-after-refresh — Awareness Clears Stale Collaborators After Refresh

| | |
|---|---|
| **Type** | Liveness |
| **Priority** | Medium |
| **Property** | After a collaborator refreshes or disconnects, other peers eventually stop showing that collaborator as connected. |
| **Invariant** | Use `Sometimes(cond)` where `cond` is "a previously connected collaborator transitions to disconnected/removed on peers", with `Reachable` markers for explicit disconnect signaling and timeout-based cleanup. |
| **Antithesis Angle** | Fault unload-time requests, delay polls, and vary visibility/unload ordering so cleanup must occur through both explicit and timeout paths. |
| **Why It Matters** | Ghost collaborators are a real regression area and they directly affect user trust in presence UI. |

## Assumptions

- Initial workload will exercise at least two concurrent authenticated collaborators.
- Where external behavior is hard to observe, the workload can add surgical SUT-side instrumentation in `packages/sync`, `packages/core-data`, or the PHP relay.

## Open Questions

- None. Setup/workload still need to choose the most practical browser harness, but the properties themselves are concrete enough to implement.
