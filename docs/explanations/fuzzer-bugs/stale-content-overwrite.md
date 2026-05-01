# Same-account stale content overwrite

## Bug summary

Two editor windows for the same WordPress account, including support/SU-style sessions, can edit the same post or page. Window A saves current content. Window B was opened before A's save and still has stale local editor state. If B makes a small edit and saves, the REST `content` body can be replaced by B's stale full body plus B's small edit, dropping A's already-saved content.

This is the same-account/support-session content/title-loss class. It is distinct from the large-update "Connection lost" issue, which matches #77669.

## Repros

Manual browser repro:

1. Enable real-time collaboration.
2. Create or open a published page with two paragraphs: `Alpha`, `Beta`.
3. Open the page editor in two same-account windows before either window saves.
4. In window A, append a new paragraph such as `same-account-current-*` and save.
5. Verify the REST page content contains that marker.
6. In window B, without reloading, replace `Alpha` with `same-account-stale-*` and save.
7. On the buggy base, REST content contains B's stale edit and `Beta`, but no longer contains A's saved marker.

Committed unit-level repros on `try/stale-content-overwrite-pr`:

- `packages/core-data/src/utils/test/crdt-stale-top-level-blocks.test.ts`
- `packages/core-data/src/test/entities.js`
- These cover stale full block snapshots, remote top-level appends/deletes, remote rich-text edits on unchanged sibling blocks, deriving serialized `content` from merged blocks, and save-time merging with the latest persisted CRDT record.

Committed browser repro:

- `test/e2e/specs/editor/collaboration/collaboration-same-user-stale-content-overwrite.spec.ts`
- The test uses normal editor actions: keyboard typing, block selection, toolbar Save, and REST reads only for setup/assertions. It does not mutate `wp.data`, stub requests, inject faults, alter clocks, or synthesize blocks in the browser.

Browser command:

```bash
WP_BASE_URL=http://localhost:8912 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-same-user-stale-content-overwrite.spec.ts --project=chromium
```

## Known-fixes status

Checked against:

- Worktree: `/Users/danluu/dev/fuzz/gutenberg-stale-content-overwrite-known`
- Base: `/Users/danluu/dev/fuzz/gutenberg-fuzz-all-local-known-fixes-clone`
- Branch: `try/fuzz-all-local-known-fixes-clone`
- Commit: `6a1a8d30794`

Focused known-base command:

```bash
WP_BASE_URL=http://localhost:8910 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-same-user-stale-save-content-loss.spec.ts --project=chromium --grep "reproduces saved content loss"
```

Result: still reproduces. The failure had final REST content containing `same-user-second-session-*` and the stale initial paragraph, but missing `same-user-customer-saved-*`.

The known fixes include stale nested/table/rich-text fixes, but they do not fix this same-account stale save path.

## Video

Local repro video:

```text
/Users/danluu/dev/fuzz/gutenberg-stale-content-overwrite-pr/artifacts/stale-content-overwrite-video/stale-content-overwrite-repro.mp4
```

The video was generated against the known-fixes base on `http://localhost:8910`. It shows both editor windows side-by-side and an annotation log. Window A saves a new paragraph, then window B saves a stale body; final REST content contains B's edit and is missing A's marker.

## Failure mechanism

The editor stores post content as a full serialized body in the REST `content` field. With collaboration enabled, Gutenberg also persists a CRDT document in post meta.

The stale window's local state can lag behind the current saved server state. Before this fix, `prePersistPostType` created the persisted CRDT meta from the stale local sync document during B's save. It did not first fetch and merge the latest saved server record/CRDT document. The subsequent `PUT` therefore sent stale full `content`, and WordPress accepted it as the latest version.

There was a second merge hazard inside the block CRDT path. Gutenberg receives full block snapshots, not granular "I changed only block X" operations. When a stale snapshot touched one block, unchanged sibling blocks and missing remote top-level blocks could be interpreted as local updates/deletes. That could discard remote additions after a save-time CRDT rebase.

## Introduction history

This was introduced as an architectural gap across the RTC/Yjs save and persistence work, not as a single obvious typo.

The original design direction came from [WordPress/gutenberg#68483](https://github.com/WordPress/gutenberg/pull/68483), "[Yjs Collab] Reliable sync with the backend." That PR called out the same class of risk: earlier collaboration did not reliably sync backend state with the Yjs document, collaborative documents were not preserved across sessions, and concurrent changes could overwrite each other. It proposed reconciling backend state into the Yjs document and persisting that rebased document.

The production path then landed incrementally:

- [c214929139f](https://github.com/WordPress/gutenberg/commit/c214929139f) / [#72114](https://github.com/WordPress/gutenberg/pull/72114), "Collaborative editing: Make syncing a side-concern instead of a replacement for local state," made syncing an overlay on top of normal editor/core-data state. That meant the editor could still save ordinary full `content` snapshots while a side Yjs document tried to track collaborative state.
- [84019935998c](https://github.com/WordPress/gutenberg/commit/84019935998c) / [#72262](https://github.com/WordPress/gutenberg/pull/72262), "Improve CRDT merge logic for post entities," introduced the block CRDT merge path used for post entities. The merge operates on full block snapshots from the editor and uses a left/right sweep to update a Y.Array. It did not retain a per-window base snapshot, so a stale full snapshot could make unchanged sibling blocks or missing top-level blocks look like intentional local updates.
- [2d8b22633dd3](https://github.com/WordPress/gutenberg/commit/2d8b22633dd3) / [#72373](https://github.com/WordPress/gutenberg/pull/72373), "Real-time collaboration: Implement CRDT persistence for collaborative editing," added the important save-time behavior: `prePersistPostType` serializes the local Y.Doc through `SyncManager#createPersistedCRDTDoc` and stores it in post meta as `_crdt_document`. This made saves preserve collaboration state, but it also meant a stale editor window could serialize and persist its stale local Y.Doc during a normal toolbar save. There was no save-time fetch/merge of the latest server record before forming the REST `PUT`.
- [be1c20e213e](https://github.com/WordPress/gutenberg/commit/be1c20e213e) / [#74637](https://github.com/WordPress/gutenberg/pull/74637), "Real-time collaboration: Refetch entity when it is saved by a peer," added a refetch after a peer save notification. That is useful when the stale window receives the save signal before it saves. It does not close the support-session/same-account race where B saves before incorporating A's persisted state.
- [50b0a31ec012](https://github.com/WordPress/gutenberg/commit/50b0a31ec012) / [#74668](https://github.com/WordPress/gutenberg/pull/74668), "Apply only detected changes from the persisted CRDT document," and [c3fdb79fdaf3](https://github.com/WordPress/gutenberg/commit/c3fdb79fdaf3) / [#74753](https://github.com/WordPress/gutenberg/pull/74753), "Do not wrap persisted doc applied update in transaction," refined how persisted CRDT documents are applied on load. They still do not perform a save-time rebase against the latest persisted server CRDT document.
- [001a25614827](https://github.com/WordPress/gutenberg/commit/001a25614827) / [#75437](https://github.com/WordPress/gutenberg/pull/75437), "Real-time collaboration: Sync post content and undefined `blocks` value," and [22e067b02438](https://github.com/WordPress/gutenberg/commit/22e067b02438) / [#75448](https://github.com/WordPress/gutenberg/pull/75448), "Use Y.Text for title, content and excerpt," brought serialized `content`, `title`, and `excerpt` into the CRDT path. That made the stale full serialized body another value that could be written from B's local state unless the save path first merged the latest persisted server state.
- [8051e14451cf](https://github.com/WordPress/gutenberg/commit/8051e14451cf) / [#75975](https://github.com/WordPress/gutenberg/pull/75975), "RTC: Fix stale CRDT document persisted on save," is similarly named but fixes a different stale-doc problem: deferred local Y.Doc updates were not flushed before serialization. It waits for local pending updates; it does not fetch and merge a newer server CRDT document from another same-account/support session before saving.
- [5d06c68c0ae](https://github.com/WordPress/gutenberg/commit/5d06c68c0ae) / [#76337](https://github.com/WordPress/gutenberg/pull/76337), "Core Data: Avoid stale values when in autosave payloads," addresses stale values in autosave payload construction. This repro uses toolbar saves and the collaborated post-type persistence path, so that autosave-specific protection is not sufficient.

Put together, the bug appears once these conditions are all true: post/page saves still send full serialized `content`; RTC persists a local Y.Doc into post meta on save; persisted CRDT docs are reconciled on load/refetch rather than immediately before every conflicting save; and full block/content snapshots are merged without a stale-base comparison. Same-account/support sessions make the timing realistic because the stale editor can save before it observes the other window's saved state.

This bug is a gap in that architecture, not a regression from the two recent fixes called out in the assignment:

- [#77865](https://github.com/WordPress/gutenberg/pull/77865) fixes an autosave/revision interaction where content can be lost even in a single-user flow.
- [#77866](https://github.com/WordPress/gutenberg/pull/77866) fixes table edit/revision loss for old or externally-created posts with no persisted CRDT document and duplicate table rows.

The same-account stale-save bug remains when a stale editor has a local CRDT document but has not incorporated the latest saved server CRDT document before its save.

## Initial fix plan

The first plan was to fix `mergeCrdtBlocks` only:

- keep the last local block snapshot per Y.Array;
- compare stale local snapshots with that base;
- preserve remote top-level inserts/deletes and unchanged sibling attributes;
- derive serialized post `content` from merged blocks when `blocks` are present.

This improved lower-level CRDT behavior but did not fix the browser repro by itself, because the stale same-account window may never receive A's save through live sync before B saves.

## Audit: Linus Torvalds

The block-merge-only plan was too clever and too low-level. The actual bug is a stale save overwriting newer persistent state. Fixing only an internal merge algorithm assumes the stale window already has the newer state locally. That assumption is exactly what the bug disproves. The save path must not blindly write an old full body when the server has moved on.

## Audit: Kyle Kingsbury / Jepsen

This is a lost-update anomaly. The system has no explicit compare-and-set on the post body and no user-visible conflict check. A last-writer-wins `PUT` is unsafe when clients send full snapshots. A correct mitigation needs to read the current server state, merge against it, and write a result that includes both updates, or else refuse the write.

## Audit: Dan Luu

The realistic support-session shape matters more than a unit-level CRDT proof. Same-account sessions often do not look like ordinary two-user collaboration in the UI, and the repro must show a user typing and pressing Save. The fix also needs a false-positive guard: do not rewrite the first user's save from an older local CRDT snapshot when the server has not changed.

## Revised fix plan

The PR branch implements the revised plan:

1. Before persisting an existing collaborated post/page, fetch the latest server record when saving `content`, `title`, or `excerpt`.
2. Compare latest server raw fields with the editor's saved base. Only run the freshness merge for fields that changed on the server since this editor loaded its base.
3. Apply the latest persisted CRDT document into the local sync document before creating the new persisted CRDT doc.
4. Use the merged CRDT record data for changed saved fields so the REST payload contains both the stale window's small edit and the already-saved current content.
5. In block merging, reconcile stale full snapshots against the last local base so unchanged stale sibling blocks do not overwrite remote edits, and missing remote top-level blocks are not treated as local deletes.
6. When both `blocks` and `content` are present, derive `content` from the merged block tree rather than trusting the stale serialized full-string snapshot.

## False-positive analysis

This is not the large-update connection loss issue: the repro uses tiny paragraph edits and no network faults.

This is not a direct REST last-writer smoke test: the browser repro uses normal editor UI actions for both writes. REST is only used for test setup and final observation.

This is not the #77865 autosave/revision bug: the page is published and the repro uses toolbar saves.

This is not the #77866 no-persisted-CRDT duplicate-table bug: the repro uses ordinary paragraph blocks and same-account stale editor state.

The first save is verified to contain A's marker before B saves. The final failure is therefore not "A failed to save"; it is B's stale save overwriting A's already-saved content.
