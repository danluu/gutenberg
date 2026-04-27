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

- Browser repro:
  https://github.com/danluu/gutenberg/blob/try/rtc-undo-cross-entity-stock-repro-pr-trunk/test/e2e/specs/editor/collaboration/collaboration-undo-redo.spec.ts
- Video:
  https://github.com/danluu/gutenberg/blob/try/rtc-undo-cross-entity-stock-repro/docs/explanations/architecture/rtc-stock-repros/videos/undo-metadata-cross-entity.mp4
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

1. Keep the shared undo stack so user-facing undo ordering across synced
   entities does not change.
2. Use the `ydoc` already emitted by `YMultiDocUndoManager` stack-item events to
   identify the document that produced the stack item.
3. In each metadata listener installed by `addToScope()`, return early unless
   `event.ydoc` is the Yjs document for that scope.
4. Invoke only the metadata handlers for the owning entity. If ownership cannot
   be determined, do not run unrelated entity handlers as a fallback.
5. Add regression coverage at the direct undo-wrapper level and the
   `SyncManager` integration level so the fix cannot regress back to global
   metadata dispatch.

The fix should not split the editor into independent undo managers per entity
unless product behavior explicitly wants separate undo stacks. Splitting stacks
would avoid this bug but would also change user-facing undo ordering across
entities. The safer fix is to keep the shared stack and scope only the metadata
dispatch.

## Repro coverage in the PR branch

PR branch:
https://github.com/danluu/gutenberg/tree/try/rtc-undo-cross-entity-stock-repro-pr-trunk

- Browser-level normal-user repro:
  https://github.com/danluu/gutenberg/blob/try/rtc-undo-cross-entity-stock-repro-pr-trunk/test/e2e/specs/editor/collaboration/collaboration-undo-redo.spec.ts
- `SyncManager` integration repro:
  https://github.com/danluu/gutenberg/blob/try/rtc-undo-cross-entity-stock-repro-pr-trunk/packages/sync/src/test/manager.ts
- Direct `SyncUndoManager` wrapper repro:
  https://github.com/danluu/gutenberg/blob/try/rtc-undo-cross-entity-stock-repro-pr-trunk/packages/sync/src/test/undo-manager.test.ts

There is no lower Gutenberg repro below `SyncUndoManager` for this bug. The
underlying `YMultiDocUndoManager` already emits the owning `ydoc`; the bug is in
Gutenberg's wrapper ignoring that ownership information when dispatching
metadata handlers.

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

Current PR-branch verification:

- Tests-only commit fails against trunk:
  `packages/sync/src/test/undo-manager.test.ts` fails because a stack item from
  one Yjs document invokes `addUndoMeta` for a different document.
- Tests-only commit fails against trunk:
  `packages/sync/src/test/manager.ts` fails because an update to one synced
  entity invokes undo metadata handlers for another synced entity.
- Branch head passes:
  `npm run test:unit -- packages/sync/src/test/undo-manager.test.ts packages/sync/src/test/manager.ts`
