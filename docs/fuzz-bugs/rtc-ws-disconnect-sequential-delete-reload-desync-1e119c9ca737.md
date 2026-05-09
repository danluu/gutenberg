# RTC WebSocket Sequential Delete Reload Desync

Fuzz signature: `1e119c9ca737`

Bug type: `rtc_ws_disconnect_sequential_delete_reload_desync`

## Summary

The archived row describes two collaborators editing a post over WebSocket RTC. After two top-level paragraph deletes, a retriable WebSocket interruption, and a reload, one peer kept only the first paragraph while another peer restored the original three-paragraph document.

The original artifact is no longer available locally and the row has no durable natural Playwright repro. Passes 172 and 173 found a deterministic CRDT adapter reconstruction on the May 7 known-fixes base (`f256024286dd80a4c0e2579f658c109256abf648`): if a peer has already received the two remote top-level deletes, then applies a stale full block snapshot with `baseRecord.blocks` still containing the original three paragraphs, the stale second and third paragraphs are resurrected in both `blocks` and derived `content`.

Pass 174 found a second reload-specific route in the same family. During `SyncManager.load()`, provider updates can arrive before stale REST/persisted-record hydration completes. The known-fixes base had a guard for "provider already applied remote state", but no provider bootstrap path set that flag. It also registered the same record and state observers twice, which could double-dispatch later remote updates.

## Root Cause

The known-fixes stack already reconciled stale full block snapshots when `mergeCrdtBlocks()` used `previousLocalBlocksCache`. The first missing case was the normal editor `baseRecord` path:

1. `editEntityRecord()` passes `{ baseRecord: editedRecord }` to the sync manager.
2. The sync manager forwards `baseRecord` into `applyPostChangesToCRDTDoc()`.
3. `applyPostChangesToCRDTDoc()` passes `baseRecord.blocks` to `mergeCrdtBlocks()`.
4. On the May 7 known-fixes base, `mergeCrdtBlocks()` skipped stale-snapshot reconciliation whenever explicit `baseBlocks` were present.

For this signature's shape, the current Y blocks are `[Alpha]`, the stale local snapshot is `[Alpha, Beta, Gamma]`, and the stale base record is also `[Alpha, Beta, Gamma]`. Because the explicit-base path bypassed the remote-delete filter, `Beta` and `Gamma` were reintroduced.

The second missing case was reload hydration. `SyncManager.load()` attaches observers before creating providers so bootstrap provider updates can reach the local editor. If those provider updates arrive before the stale REST record is hydrated, `_applyPersistedCrdtDoc()` should not replay the stale record into the same Y document. The code checked `hasProviderSyncedRemoteState`, but nothing set it during provider bootstrap, so stale record hydration could still run after remote updates.

## Fix

The signature PR branch is:

- Branch: `try/rtc-ws-disconnect-sequential-delete-reload-desync-1e119c9ca737-pr`
- Commit: `ca859ff32a2`
- Subject: `Preserve remote blocks during RTC reload hydration`

The fix has three parts:

1. Let stale-snapshot reconciliation accept an explicit previous/base block array and run it for `baseRecord.blocks` edits before the rebase/fallback merge.
2. Mark the document when provider bootstrap applies remote record updates during load, so `_applyPersistedCrdtDoc()` skips replaying stale REST data into a document that already has provider state.
3. When persisted CRDT invalidations really do need to be applied, pass the persisted CRDT record as `baseRecord` so block reconciliation can distinguish stale saved blocks from new local inserts.

The fix also removes the duplicate observer registration left by the earlier integration stack.

## Practical Impact

Real-user likelihood: low. The user-facing actions are ordinary paragraph deletes, reload, and RTC WebSocket reconnect. The explicit `baseRecord` route has a narrow timing requirement: a stale full block snapshot with a stale `baseRecord` must be applied after the peer has already incorporated the remote deletes. Pass 174 raises confidence in the product reachability because provider-before-hydration ordering is a named race in the production reload path, not just a hand-scheduled adapter interleaving. The original row's exact timing still came from fuzzing (`closeNextSocket`) and no durable natural-user Playwright repro is available, so this should not be classified higher without browser data.

Blast radius is semantic content corruption: deleted paragraphs can reappear and may be persisted if the stale peer saves. Recovery is manual: notice the restored blocks, wait/reload, compare against the other collaborator, or delete the stale blocks again before saving.

## Follow-Up

The shortest confidence-improving browser experiment is a two-tab WebSocket Playwright timing search using natural editor actions only: create three paragraphs, delete the last two on one peer, close/reconnect/reload the other peer around that boundary, log `baseRecord.blocks` and current CRDT block IDs, and assert both visible blocks and persisted `content` after convergence/save.
