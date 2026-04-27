# RTC: undo metadata can be restored from the wrong synced entity

## Summary

Undo state can be corrupted when a session has more than one synced entity. The
stock repro uses only normal editor actions: open the publish panel so the
default category entity is synced, type into the post, and press undo. The text
undo is applied, but the selection metadata that should be restored with the
undo stack item is missing or comes from the wrong entity scope.

This is a cross-entity scoping bug in `packages/sync/src/undo-manager.ts`. Each
synced entity adds metadata handlers to the shared Yjs `UndoManager`, but the
event listeners installed for those handlers are global to the undo manager
rather than scoped to the document/entity that produced the undo event.

## Stock repro

- Browser repro: `test/e2e/specs/editor/collaboration/collaboration-undo-redo.spec.ts`
- Video: `videos/undo-metadata-cross-entity.mp4`
- Video provenance: regenerated on April 26, 2026 from the Playwright trace
  emitted by the checked-in browser repro. In this current worktree run, after
  moving the undo environment from Playground to Docker, the real fixture fails
  earlier than the historical selection assertion: the normal undo shortcut
  leaves the split `abc` / `def` paragraphs in place, so the selection snapshot
  assertion is not reached. The MP4 intentionally shows that actual e2e run
  rather than a hand-written undo flow.
- Normal user actions:
  1. Editor A opens a collaborative post.
  2. Editor A opens the pre-publish panel, which loads and syncs the default
     category entity.
  3. Editor A closes the panel and types into the post title/body.
  4. Editor A presses undo.
  5. The content undo happens, but selection metadata for the post is not
     restored correctly.

## Observed vs expected

Expected: undo restores both the post content and the post selection metadata
that was recorded for the stack item.

Observed: after a second synced entity has been added, the undo stack item can be
handled through metadata callbacks for the wrong entity. The visible symptom is
that the post content changes but the selection metadata is unset or incorrect.

## How it was introduced

Undo support for RTC was added in #72407, `Real-time collaboration: Add
UndoManager support for collaborative editing`.

The cross-entity metadata bug was introduced by #74878, `Real-time
collaboration: Use relative positions in undo stack`. That PR added per-entity
`addUndoMeta` and `restoreUndoMeta` handlers inside `addToScope()`. The handlers
close over the entity-specific document state, but the listeners are registered
on the shared `UndoManager` events `stack-item-added` and `stack-item-popped`.
Those events are not filtered before calling each entity's handlers.

When a second synced entity is added, one undo manager has multiple sets of
entity-specific metadata listeners. A post undo event can therefore run category
metadata logic, or the category listener can overwrite/omit metadata that should
belong to the post.

## Root cause

The undo manager is shared across synced entities, but undo metadata handlers are
registered as if each entity has a private undo manager. Listener lifetime and
listener dispatch are both too broad:

- each scope registration adds another global listener pair;
- listeners close over entity-local metadata functions;
- dispatch does not first prove that the stack item belongs to that entity's
  Yjs document or tracked type;
- cleanup is easy to get wrong because listener ownership is duplicated per
  scope.

The issue is not specific to categories. Categories are just the stock UI path
that makes the editor sync a second entity without custom setup.

## Fix plan

1. Keep one `stack-item-added` listener and one `stack-item-popped` listener per
   shared undo manager.
2. Maintain an explicit map from synced document/tracked type to that entity's
   metadata handlers.
3. On stack item events, determine the owning document or tracked type from the
   event before invoking metadata handlers.
4. Invoke only the handlers for the owning entity. If ownership cannot be
   determined, do not run unrelated entity handlers as a fallback.
5. Remove handlers from the map when an entity is unloaded or removed from undo
   scope, and remove the shared listeners when the undo manager is destroyed.
6. Add regression coverage for post plus category, post plus notes, and entity
   unload/reload so the fix does not introduce stale listener leaks.

The fix should not split the editor into independent undo managers per entity
unless product behavior explicitly wants separate undo stacks. Splitting stacks
would avoid this bug but would also change user-facing undo ordering across
entities. The safer fix is to keep the shared stack and scope only the metadata
dispatch.

## Verification

The failing stock repro is:

```bash
WP_BASE_URL=http://localhost:8990 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-undo-redo.spec.ts --grep "Undo restores the post selection"
```

Known-fixes-base status, checked on `try/fuzz-known-issues-fixed-campaign`
after the previously found RTC fixes were applied:

-   **Fails:** browser stock repro
    `Undo restores the post selection when another synced entity is loaded`.
    Content undo still happens, but the selection snapshot has
    `attributeKey: undefined`, `blockIndex: -1`, and no offsets/content instead
    of the expected post paragraph selection.
-   **Passes:** baseline undo/redo collaboration tests in the same spec:
    `User A undo only affects their own changes, not User B changes` and
    `Redo restores the undone change`.

The pass/fail split matters: the previously fixed RTC write-path and ordinary
undo behavior remain functional, but the multi-entity undo metadata scoping bug
is still present.

Lower-level coverage should assert that a stack item created from one Yjs
document never invokes metadata handlers registered for a different synced
entity.
