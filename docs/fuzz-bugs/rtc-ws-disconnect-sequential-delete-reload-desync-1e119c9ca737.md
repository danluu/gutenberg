# RTC WebSocket Sequential Delete Reload Desync

Fuzz signature: `1e119c9ca737`

Bug type: `rtc_ws_disconnect_sequential_delete_reload_desync`

## Summary

The archived row describes two collaborators editing a post over WebSocket RTC. After two top-level paragraph deletes, a retriable WebSocket interruption, and a reload, one peer kept only the first paragraph while another peer restored the original three-paragraph document.

The original artifact is no longer available locally and the row has no durable natural Playwright repro. Passes 172 and 173 found a deterministic CRDT adapter reconstruction on the May 7 known-fixes base (`f256024286dd80a4c0e2579f658c109256abf648`): if a peer has already received the two remote top-level deletes, then applies a stale full block snapshot with `baseRecord.blocks` still containing the original three paragraphs, the stale second and third paragraphs are resurrected in both `blocks` and derived `content`.

Pass 174 found a second reload-specific route in the same family. During `SyncManager.load()`, provider updates can arrive before stale REST/persisted-record hydration completes. The known-fixes base had a guard for "provider already applied remote state", but the sync manager did not make that guard provider-independent when bootstrap updates arrived through its own observers. It also registered the same record and state observers twice, which could double-dispatch later remote updates.

Pass 175 independently re-read the code and re-ran the targeted checks. On the fixed PR branch, the signature CRDT regression passed (`2/2`), the sync-manager suite passed (`30/30`), and lint passed for the touched files. On a disposable tests-only worktree at `1289a0c796c` on top of the frozen known-fixes base, `packages/sync/src/test/manager.ts` failed in the expected three places: provider bootstrap still replayed stale hydration, invalidated persisted-doc updates were applied without `baseRecord`, and duplicate observers double-dispatched a later remote edit.

Pass 176 re-ran those targeted checks and got the same fixed-branch and tests-only-base results. It also tightened the reachability assessment: Gutenberg's `sync` package is a real collaboration product path gated by `window._wpCollaborationEnabled`, but the built-in provider is HTTP polling. The WebSocket transport in this signature is reached through the pluggable `sync.providers` hook, such as the RTC WebSocket e2e test provider or a custom provider. Therefore the general "normal Gutenberg user" likelihood is lower than the likelihood for sites actively exercising RTC with a WebSocket provider.

Pass 177 re-ran the fixed-branch unit checks and the known-fixes-base negative control. It also attempted a bounded natural WebSocket browser probe on the known-fixes base. That probe did not produce a valid repro: the first version accidentally used an invalid Docker-visible `build` symlink, and after replacing `build`/`vendor` with real copies, the editor loaded unrelated stale collaboration state before the intended user-typed paragraphs could be created. The browser attempt therefore strengthens the evidence boundary rather than the bug proof: lower-level product-path evidence remains strong, but a natural Playwright repro still needs an isolated WebSocket/server-state harness before it can be trusted.

Pass 178 adds an independent code-path and origin check. The named known-fixes worktree had unrelated dirty state and was no longer checked out at the manifest SHA, so the pass used the exact `f256024286dd80a4c0e2579f658c109256abf648` object for comparisons. In a disposable tests-only worktree at `1289a0c796c`, `packages/sync/src/test/manager.ts` still failed in the same three places on the known-fixes base: stale hydration after provider bootstrap, missing `baseRecord` for persisted-doc invalidation, and duplicate observer dispatch. The fixed branch at `ca859ff32a2` passed the same manager suite (`30/30`). The block-level CRDT regression could not run in this environment because the available dependency tree is missing `framer-motion`, so pass 178 does not claim fresh block-test execution.

## Root Cause

The known-fixes stack already reconciled stale full block snapshots when `mergeCrdtBlocks()` used `previousLocalBlocksCache`. The first missing case was the normal editor `baseRecord` path:

1. `editEntityRecord()` passes `{ baseRecord: editedRecord }` to the sync manager.
2. The sync manager forwards `baseRecord` into `applyPostChangesToCRDTDoc()`.
3. `applyPostChangesToCRDTDoc()` passes `baseRecord.blocks` to `mergeCrdtBlocks()`.
4. On the May 7 known-fixes base, `mergeCrdtBlocks()` skipped stale-snapshot reconciliation whenever explicit `baseBlocks` were present.

For this signature's shape, the current Y blocks are `[Alpha]`, the stale local snapshot is `[Alpha, Beta, Gamma]`, and the stale base record is also `[Alpha, Beta, Gamma]`. Because the explicit-base path bypassed the remote-delete filter, `Beta` and `Gamma` were reintroduced.

The second missing case was reload hydration. `SyncManager.load()` attaches observers before creating providers so bootstrap provider updates can reach the local editor. If those provider updates arrive before the stale REST record is hydrated, `_applyPersistedCrdtDoc()` should not replay the stale record into the same Y document. The code checked `hasProviderSyncedRemoteState`, and the test WebSocket provider already sets that metadata in some snapshot/update paths, but the sync manager itself did not set it when its observer saw provider-origin remote record changes during load. That left the invariant dependent on provider implementation details and allowed stale record hydration to run after remote updates in the provider-agnostic manager path.

The May 7 integration also combined two individually reasonable observer changes into a bad final state. Commit `1a46ebf1621c` attached observers before provider creation so bootstrap updates could be observed. Commit `85cbd148b1c7` moved observer attachment after persisted-doc hydration to avoid a redundant local edit, with the assumption that provider connection was asynchronous and no peer update could land before observers were attached. In the WebSocket test provider, `createWebSocketProvider()` waits for `provider.ready` before returning, and `provider.ready` can include remote snapshot/update application. The synthetic known-fixes base ended up with both observer registrations, which explains the duplicate remote edit dispatch and why provider-before-hydration remains reachable for a provider whose creator resolves only after initial sync.

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

Real-user likelihood: very-low for the broad installed Gutenberg population, low for RTC-enabled sites using a WebSocket provider, and medium only for a custom RTC provider that performs initial sync inside its provider-creator promise before resolving. The user-facing actions are ordinary paragraph deletes, reload, and reconnect, but the signature is specifically WebSocket and the built-in provider is HTTP polling; WebSocket requires a provider supplied through the `sync.providers` filter. The explicit `baseRecord` route has a narrow timing requirement: a stale full block snapshot with a stale `baseRecord` must be applied after the peer has already incorporated the remote deletes. The provider-before-hydration route is more product-shaped because the code itself names remote changes before hydration as a race, but the strongest WebSocket evidence still uses the local-only e2e provider. The original row's exact timing came from fuzzing (`closeNextSocket`), and pass 177's browser probe showed that the local WebSocket harness can be contaminated by stale collaboration state unless isolation is explicitly verified. This should not be classified higher for normal Gutenberg use without a clean natural-user Playwright repro.

Blast radius is semantic content corruption: deleted paragraphs can reappear and may be persisted if the stale peer saves. Recovery is manual: notice the restored blocks, wait/reload, compare against the other collaborator, or delete the stale blocks again before saving.

## Follow-Up

The shortest confidence-improving browser experiment is a two-tab WebSocket Playwright timing search using natural editor actions only, but it must first prove harness isolation: start a clean `.wp-env.test.json` environment with Docker-visible real `build` files, use a fresh WebSocket port, reset the server immediately before the test, assert that the opened post title and initial blocks match the post just created, then type three paragraphs, delete the last two on one peer, reload the other peer around that boundary, log provider-bootstrap state, `hasProviderSyncedRemoteState`, `baseRecord.blocks`, current CRDT block IDs, `applyPersistedCrdtDoc()` decisions, and assert both visible blocks and persisted `content` after convergence/save.
