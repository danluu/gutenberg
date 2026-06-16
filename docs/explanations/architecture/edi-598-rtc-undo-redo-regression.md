# EDI-598 RTC Undo/Redo Regression Notes

## Summary

EDI-598 reports that Undo and Redo stay disabled in the post editor when the
Gutenberg plugin's real-time collaboration (RTC) support is enabled alongside
third-party plugins with classic meta boxes.

The regression was introduced by:

- Commit: `de0dde644b0691f029509161afdeaafa868a53bf`
- PR: `#78145`
- Title: `Fix: Disable collab sync when incompatible meta boxes are present.`

The parent commit, `db03118bfc5`, does not reproduce the issue. The introducing
commit, `de0dde644b0`, does reproduce it.

## Local Environment

The reproduction used a fresh trunk worktree:

- Worktree: `/Users/danluu/dev/fuzz/gutenberg-trunk-codex-20260616T051559Z`
- Current trunk base: `7d8e02165f2`
- WordPress: `7.1-alpha-62504`
- Gutenberg plugin: `23.4.0-rc.1`
- RTC option: `wp_collaboration_enabled=1`
- Theme: Twenty Twenty-Four
- Browser probe: Playwright Chromium, headless

PostX Pro was not available locally or through WordPress.org, so tests used the
available public plugins:

- Advanced Ads: `advanced-ads`
- All in One SEO: `all-in-one-seo-pack`
- PostX/free: `ultimate-post`

Current trunk reproduced with any one of those public plugins active, so the
minimal local repro is RTC plus Advanced Ads.

## Reproduction Procedure

The automated browser probe did the following:

1. Start an isolated `wp-env` for the candidate commit.
2. Build the Gutenberg plugin for that commit so `wp-sync` and current
   `core-data` assets are loaded from the plugin rather than WordPress core.
3. Enable RTC with `wp option update wp_collaboration_enabled 1`.
4. Install and activate the target plugin set.
5. Create a fresh draft post.
6. Open the post editor as `admin`.
7. Verify `window._wpCollaborationEnabled === true` and `wp.sync` is loaded.
8. Dismiss the welcome guide if needed.
9. Click the default block appender inside the editor iframe.
10. Type text into the paragraph block.
11. Check `core.hasUndo()`, `core/editor.hasEditorUndo()`, and the Undo
    toolbar button's `aria-disabled` state.
12. Press Cmd+Z and check whether the paragraph content changes.

## Results

### Current trunk controls

On `7d8e02165f2`:

| Setup | Result |
| --- | --- |
| RTC on, no third-party plugins | Undo works |
| RTC off, Advanced Ads + AIOSEO + PostX/free | Undo works |
| RTC on, Advanced Ads only | Reproduces |
| RTC on, AIOSEO only | Reproduces |
| RTC on, PostX/free only | Reproduces |
| RTC on, Advanced Ads + AIOSEO + PostX/free | Reproduces |

For the failing cases, typed paragraph content existed in the editor state, but:

- `core.hasUndo()` was `false`
- `core/editor.hasEditorUndo()` was `false`
- Undo button had `aria-disabled="true"`
- Cmd+Z left the paragraph content unchanged

### Commit boundary

Minimal repro with Advanced Ads:

| Commit | Relation | Result after typing | Cmd+Z |
| --- | --- | --- | --- |
| `db03118bfc5` | Parent of `#78145` | Undo enabled | Clears paragraph text |
| `de0dde644b0` | `#78145` | Undo disabled | No effect |

Public plugin subset repro with Advanced Ads + AIOSEO + PostX/free:

| Commit | Relation | Result after typing | Cmd+Z |
| --- | --- | --- | --- |
| `db03118bfc5` | Parent of `#78145` | Undo enabled | Clears paragraph text |
| `de0dde644b0` | `#78145` | Undo disabled | No effect |

Additional parallel candidate checks:

| Boundary | Before | After | Finding |
| --- | --- | --- | --- |
| `#78864` (`cd4513491ec`) | `ac1566bd9ac` reproduced | `cd4513491ec` reproduced | Not introducer |
| `#78984` (`e11c0788f01`) | `d83ec0f1e11` reproduced | `e11c0788f01` reproduced | Not introducer |

## Likely Mechanism

The issue appears to be an interaction between the sync-aware undo manager and
the meta-box compatibility fallback added in `#78145`.

Relevant current code paths:

- `packages/edit-post/src/components/meta-boxes/use-meta-box-initialization.js`
  calls `setCollaborationSupported( false )` when RTC is enabled and any active
  meta box lacks `__rtc_compatible`.
- `packages/core-data/src/private-actions.js` handles that action and, after
  `#78145`, calls `getSyncManager().unloadAll()` when collaboration becomes
  unsupported.
- `packages/core-data/src/private-selectors.ts` still returns
  `getSyncManager()?.undoManager ?? state.undoManager`.
- `packages/core-data/src/selectors.ts` uses `state.syncUndoManagerState` for
  `hasUndo()` and `hasRedo()` whenever the sync undo manager exists.
- `packages/sync/src/undo-manager.ts` makes `addRecord()` a no-op because Yjs is
  expected to track changes for synced entities.

Before `#78145`, the synced post entity remained loaded even when a plugin added
classic meta boxes, so Yjs captured the local paragraph edit and Undo worked.

After `#78145`, the incompatible-meta-box path unloads synced entities after the
sync manager and its undo manager have already been created. Later post-content
edits still go through the sync undo manager path, but that manager is no longer
tracking a scoped CRDT document for the post. Because `addRecord()` is a no-op
for the sync undo manager and the fallback `WPUndoManager` is bypassed, no undo
level is recorded. The toolbar therefore stays disabled and Cmd+Z has no effect.

## Notes

- The Linear issue describes the full set of Advanced Ads, AIOSEO, PostX, and
  PostX Pro. The local repro did not require the full set; each available public
  plugin was sufficient on current trunk.
- PostX Pro could not be tested locally because it is not available through
  WordPress.org.
- The current failing behavior is not introduced by the later visible RTC
  changes in `#78864` or `#78984`; both sides of those boundaries already
  reproduce.

## Fix Plan

The fix should enforce the sync undo lifetime invariant, not special-case the
Undo button or gate undo selectors on the collaboration support flag.

Invariant:

`getSyncManager()?.undoManager` should be exposed only while at least one synced
entity scope is loaded and capable of capturing Yjs undo history. Once all
synced entity docs have been unloaded, core-data should naturally fall back to
the default `state.undoManager`.

### Required implementation

1. Update `packages/sync/src/manager.ts`.

   In `createSyncManager()`, make the private `undoManager` follow loaded
   entity scope lifetime:

   - In `unloadEntity()`, after `entityStates.get( entityId )?.unload()`, set
     `undoManager = undefined` only when `entityStates.size === 0`.
   - In `unloadAll()`, set `undoManager = undefined` after all entity states
     have been unloaded and cleared.
   - Do not let collection state keep sync undo alive. `loadCollection()` does
     not add scopes to `SyncUndoManager`; entity record maps are the undo scopes.
   - Optionally make the `undoManager` getter defensive by returning
     `undefined` when `entityStates.size === 0`, but still clear the field so a
     later valid load creates a fresh manager.

2. Update `packages/core-data/src/private-actions.js`.

   In `setCollaborationSupported( false )`, keep the `getSyncManager().unloadAll()`
   behavior added by `#78145`, and after unloading dispatch the existing private
   action:

   ```js
   dispatch.__unstableNotifySyncUndoManagerChange( {
    hasUndo: false,
    hasRedo: false,
   } );
   ```

   This reset is defensive. Once `SyncManager.undoManager` is absent, selectors
   should ignore `syncUndoManagerState`, but clearing the mirrored state avoids
   stale UI state if sync is later re-created.

3. Add narrow resolver hardening in `packages/core-data/src/resolvers.js`.

   Prevent resolver-driven sync from being re-created after the store has already
   declared collaboration unsupported:

   - In the `getEntityRecord` resolver, guard `getSyncManager()?.load(...)` with
     `select.isCollaborationSupported?.() !== false`.
   - In the `getEntityRecords` resolver, apply the same guard before
     `getSyncManager()?.loadCollection(...)`.

   Keep this as load-start prevention only. Do not gate `editEntityRecord()` or
   save-path `getSyncManager()?.update()` calls on `collaborationSupported`;
   already-loaded Yjs docs may still be the valid undo backend in non-metabox
   failure paths.

4. Leave these selectors structurally unchanged:

   - `packages/core-data/src/private-selectors.ts` `getUndoManager()`
   - `packages/core-data/src/selectors.ts` `hasUndo()`
   - `packages/core-data/src/selectors.ts` `hasRedo()`

   They already have the correct contract once `getSyncManager()?.undoManager`
   becomes absent: use sync undo when it exists, otherwise use the default undo
   manager.

### Behavior after the fix

Before the fix, incompatible meta boxes call `setCollaborationSupported( false )`
and `unloadAll()` destroys the synced entity docs, but the stale sync undo
manager remains visible. Core-data continues to route undo recording and
availability through `SyncUndoManager`; `SyncUndoManager.addRecord()` is a no-op,
so `core.hasUndo()` stays false and Cmd/Ctrl+Z does nothing.

After the fix, unloading the last synced entity removes the exposed sync undo
manager. Local edits after RTC is disabled for incompatible meta boxes record
into the fallback `WPUndoManager`; `core.hasUndo()` and
`core/editor.hasEditorUndo()` become true, the toolbar Undo button enables, and
Cmd/Ctrl+Z removes the typed paragraph.

Normal RTC editing with loaded synced entities should continue to use
`SyncUndoManager`. RTC-off editing should remain unchanged.

### Tests to add

Unit coverage:

- `packages/sync/src/test/manager.ts`
  - `undoManager` is undefined before load.
  - `undoManager` is defined after an entity load.
  - `undoManager` remains defined after unloading one of two loaded entities.
  - `undoManager` is undefined after unloading the last entity.
  - `undoManager` is undefined after `unloadAll()`.
  - An unload during pending provider creation does not leave `undoManager`
    exposed.
  - A valid reload after unload creates a fresh undo manager.
  - A collection load alone does not keep `undoManager` alive.
- `packages/core-data/src/test/private-selectors.js`
  - When the sync manager object exists but `undoManager` is undefined,
    `getUndoManager()` returns fallback `state.undoManager`.
- `packages/core-data/src/test/selectors.js`
  - When the sync manager has no undo manager, `hasUndo()` and `hasRedo()` call
    the fallback manager and ignore stale `syncUndoManagerState`.
- `packages/core-data/src/test/private-actions.js` or equivalent action coverage
  - `setCollaborationSupported( false )` calls `unloadAll()` when a sync manager
    exists and resets sync undo state to `{ hasUndo: false, hasRedo: false }`.
- `packages/core-data/src/test/resolvers.js`
  - When `isCollaborationSupported()` is false, `getEntityRecord` does not call
    `syncManager.load()`.
  - When `isCollaborationSupported()` is false, `getEntityRecords` does not call
    `syncManager.loadCollection()`.

Browser regression coverage:

- Extend `test/e2e/specs/editor/collaboration/collaboration-metabox-lock.spec.ts`.
- Activate `gutenberg-test-plugin-meta-box`.
- Open a draft with RTC enabled.
- Wait until collaboration is disabled for the post.
- Type paragraph content.
- Assert `wp.data.select( 'core' ).hasUndo()` is true.
- Assert `wp.data.select( 'core/editor' ).hasEditorUndo()` is true.
- Assert the Undo toolbar button is enabled.
- Press primary undo and verify the typed paragraph is removed.

### Risks and non-goals

- Do not make `collaborationSupported === false` the primary condition in
  `getUndoManager()`, `hasUndo()`, or `hasRedo()`. That fixes this repro but is
  the wrong predicate: document-size failures also set collaboration unsupported
  while active local Yjs state may still exist.
- Do not gate `editEntityRecord()` or save-path sync updates globally on
  `collaborationSupported`. If an entity is still actively synced, updates
  should continue to reach its CRDT doc.
- The main implementation risk is clearing sync undo too aggressively while
  another synced entity is still loaded. The multi-entity unload test is
  mandatory.
- Rollback is not the preferred fix. It would restore undo, but would also undo
  `#78145`'s intended protection against RTC with incompatible classic meta
  boxes.

### Analysis process

I ran three rounds of independent `codex exec` analyses in tmux: initial fix
plans, cross-review of the first-pass plans, and final reconciliation of the
second-pass recommendations. The final outputs converged on the active synced
entity scope invariant above and rejected selector-level
`collaborationSupported` gating as the primary fix.

## PR Branch Minimality Review

Branch reviewed:

- Branch: `try/rtc-undo-meta-regression-pr`
- Commit: `94cf40eba799a77505a23a14d3e47f41976625a1`
- Remote: `danluu`

After the PR branch was created, I ran another three-round tmux review against
the actual branch diff: 11 first-pass `codex exec` reviews, 11 cross-reviews of
those reports, and 11 final reconciliation reviews. The review goal was to find
new issues introduced by the PR branch and identify whether the patch can be
made smaller.

The branch fixes the target metabox path, but the current diff is larger than
the minimum needed for this regression. The strongest recommendation is to ship
the metabox-disable undo recovery as a narrow cleanup fix, not as a broad
collaboration lifecycle rewrite.

### Main findings

1. Do not ship generic individual `unload()` clearing as-is.

   The current PR clears `SyncManager.undoManager` after the final individual
   `unload()` call as well as after `unloadAll()`. That is a wider lifecycle
   change than the metabox regression. Delete/direct unload paths can call
   `getSyncManager()?.unload()` without also dispatching
   `__unstableNotifySyncUndoManagerChange( { hasUndo: false, hasRedo: false } )`.
   A later synced entity reload can expose a fresh empty sync undo manager while
   core-data selectors still read stale `syncUndoManagerState`.

   Minimal plan: clear `undoManager` from `unloadAll()` only in this PR. If
   generic final-entity `unload()` should also clear it, add a separate
   core-data notification/reset path and tests for delete/direct unload plus
   reload.

2. Keep the single-record resolver guard, but treat it as one-way hardening.

   The `getEntityRecord` guard prevents a later entity resolver from recreating
   sync and a sync undo manager after incompatible metaboxes have disabled
   collaboration. That is relevant to this bug.

   Caveat: resolver fulfillment does not invalidate on
   `SET_COLLABORATION_SUPPORTED`. If collaboration can be set back to true in
   the same editor session, a record resolved while unsupported will not
   automatically load sync later. The current metabox path appears to be
   effectively one-way for the page, so this guard is acceptable with that
   assumption.

3. Remove the collection resolver guard.

   `loadCollection()` does not create or expose the sync undo manager; entity
   `load()` does. The `getEntityRecords` / `loadCollection` guard is broader
   "unsupported means no sync providers" policy, not required for restoring undo
   after metaboxes disable RTC.

4. Remove selector fallback tests from the PR.

   The new `getUndoManager()`, `hasUndo()`, and `hasRedo()` fallback tests assert
   behavior already present on trunk: when `getSyncManager()?.undoManager` is
   absent, core-data falls back to the default undo manager. The actual change
   to protect is making `SyncManager.undoManager` absent after metabox-triggered
   `unloadAll()`.

5. Keep the e2e scenario, but it can be leaner.

   The important browser regression test is: wait for metaboxes to disable
   collaboration, insert a block, press primary undo, and assert the block is
   gone. The Undo button assertion is not vacuous in this stack; Playwright
   treats `aria-disabled` as disabled. It is still redundant next to the store
   poll and actual keyboard undo. Keep one undo-availability signal at most, or
   scope the button assertion explicitly.

6. Do not describe this as a complete collaboration kill switch.

   The document-size path can set `collaborationSupported` false from the
   reducer without going through `setCollaborationSupported( false )`,
   `unloadAll()`, or the sync undo-state reset. That is not the metabox bug, but
   it means this PR should not claim that every unsupported-collaboration state
   tears down sync.

### Updated minimal plan

Production changes:

1. Keep the `setCollaborationSupported( false )` sync undo-state reset after the
   existing `unloadAll()` call:

   ```js
   dispatch.__unstableNotifySyncUndoManagerChange( {
    hasUndo: false,
    hasRedo: false,
   } );
   ```

2. Make `SyncManager.unloadAll()` clear `undoManager` after entity states are
   unloaded and cleared, so core-data falls back to the default undo manager
   after metaboxes disable RTC.

3. Do not clear `undoManager` from generic individual `unload()` in this
   regression PR unless a general core-data reset/notification path is added.

4. Keep the `getEntityRecord` guard against sync reload while collaboration is
   unsupported.

5. Remove the `getEntityRecords` / `loadCollection` collaboration guard.

Tests:

1. Keep one private-action test proving `setCollaborationSupported( false )`
   unloads sync and resets cached sync undo flags.

2. Keep one sync-manager unit test proving `unloadAll()` makes
   `manager.undoManager` undefined.

3. Keep one resolver test proving `getEntityRecord` does not call
   `syncManager.load()` when `isCollaborationSupported()` is false, if the entity
   guard remains.

4. Keep one browser regression test in
   `test/e2e/specs/editor/collaboration/collaboration-metabox-lock.spec.ts`:
   wait for collaboration disabled, insert a block, undo, and verify the block
   is gone.

5. Drop collection resolver tests, selector fallback tests, individual-unload
   tests, lazy/baseline manager tests that only document pre-existing behavior,
   and redundant e2e undo assertions.
