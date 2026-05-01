# Same-account stale content overwrite

## Bug summary

Two editor windows for the same WordPress account, including support/SU-style sessions, can edit the same post or page. Window A saves current content. Window B was opened before A's save and still has stale local editor state. If B makes a small edit and saves, the REST `content` body can be replaced by B's stale full body plus B's small edit, dropping A's already-saved content.

This is the content/title-loss class from Zendesk #11173217 and the content/title part of #11112607. It is distinct from the large-update "Connection lost" issue, which matches #77669.

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

The relevant architecture comes from the RTC/Yjs backend-sync work in [WordPress/gutenberg#68483](https://github.com/WordPress/gutenberg/pull/68483), which introduced reliable backend synchronization with a persisted Yjs document and explicitly targeted content duplication/loss from earlier collaboration approaches.

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
