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
