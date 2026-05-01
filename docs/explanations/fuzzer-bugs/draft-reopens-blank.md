# Draft Reopens Blank Despite Saved Draft Content

## Bug Summary

An RTC-enabled editor session can save a real draft whose parent post and revisions contain the expected title and marker content, but a later editor reopen shows a blank "No title" draft. If the user trusts that blank editor state and saves again, the blank state can become an actual overwrite.

The concrete failing shape is:

- the parent post is `post_status=draft`;
- the parent post content contains the expected marker;
- revisions for the parent also contain the marker;
- the draft is visible in the Posts list by its real title;
- reopening the exact `post.php?post=<id>&action=edit` URL shows "No title", "Add title", and an empty canvas.

This is an editor rehydration/display path bug, not a save rejection.

## Repros Built

### Browser Repro

Branch `try/draft-reopens-blank-pr` adds:

```bash
WP_ENV_PORT=8911 WP_BASE_URL=http://localhost:8911 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-draft-reopens-blank.spec.ts --project=chromium
```

The browser repro uses normal editor actions:

- enable collaboration through the test fixture;
- create a new post through `admin.createNewPost`;
- open the same post in a second browser context using the same authenticated user session;
- fill the title field;
- click "Add default block";
- type the marker paragraph through the keyboard;
- click Save draft through the editor helper;
- navigate through the Posts list and reopen the post by URL.

The browser repro does not create blocks artificially, mutate `wp.data` content, stub requests, inject network faults, alter clocks, or directly change the database. The only `wp.data` reads/writes in setup are reading the current post ID and disabling editor welcome/fullscreen preferences, matching existing collaboration test conventions.

### Lower-Level Repro

Branch `try/draft-reopens-blank-pr` also adds a polling-manager regression:

```bash
npm run test:unit -- packages/sync/src/providers/http-polling/test/polling-manager.test.ts --runInBand
```

The focused test reproduces the bad lower-level behavior: a local Yjs update with origin `syncManager` is queued while outbound sync is paused, then published after the polling manager detects another collaborator and resumes queues. That is the stale blank bootstrap update that later overwrites the visible editor state.

### Database/Storage Evidence

On an unfixed trunk-derived run, the browser test failed while SQL showed the saved content was present:

```sql
SELECT ID, post_type, post_status, post_parent, post_title,
       LENGTH(post_content) AS len,
       post_content LIKE '%same-user-saved-draft-marker-%' AS marker
FROM wp_posts
WHERE ID = 19 OR post_parent = 19
ORDER BY ID;
```

Result shape:

- parent `ID=19`, `post_status=draft`, title `Same user saved draft ...`, content marker present;
- revision `ID=21`, marker present;
- revision `ID=22`, marker present.

The sync room for `postType/post:19` contained only blank document bootstrap updates. Decoding those Yjs updates produced:

```json
{
  "title": "",
  "status": "auto-draft",
  "content": "",
  "blocks": []
}
```

That explains why the DB and revisions were correct while the editor reopened blank.

### PHP-Only Repro Status

I did not build a PHP-only repro because the failure requires browser sync-provider origin handling and Yjs room replay. The PHP server is acting as durable storage for sync-room updates; the incorrect write originates in the browser polling provider, then PHP stores and replays it.

## Known-Fixes Base Status

Known-fixes base checked:

- worktree: `/Users/danluu/dev/fuzz/gutenberg-fuzz-all-local-known-fixes-clone`;
- branch: `try/fuzz-all-local-known-fixes-clone`;
- caller-observed HEAD: `6a1a8d30794`;
- detached verification worktree: `/Users/danluu/dev/fuzz/gutenberg-draft-reopens-blank-known`.

I applied the known-fixes clone's tracked dirty patch into the detached verification worktree so the autosaves-controller known fix was included without mutating the caller's dirty worktree.

Known-fixes command:

```bash
npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-same-user-saved-draft-reopen-loss.spec.ts --project=chromium
```

Result: the control passed, but the same-account saved-draft reopen test failed. The failure screenshot showed a blank "No title" editor with `Draft` status and `Revisions 2`. Therefore the known-fixes base still reproduces this bug; none of the known local fixes eliminate it.

## Browser Video

Local video:

```text
/Users/danluu/dev/fuzz/gutenberg-draft-reopens-blank-pr/test/e2e/artifacts/draft-reopens-blank-video/draft-reopens-blank-repro.mp4
```

The video is a stitched Playwright trace contact sheet from the failing known-fixes run. It keeps these screens visible at once: saved editor content, same-account stale window, draft list with the visible title, blank reopen, and a running annotation log.

## Failure Mechanism

The important sequence is:

1. A new post is opened with RTC enabled. There is no persisted CRDT document yet.
2. The sync manager bootstraps a local Yjs document from the current REST record, which is still a blank `auto-draft`.
3. That bootstrap transaction uses the internal `LOCAL_SYNC_MANAGER_ORIGIN`/`syncManager` origin.
4. The HTTP polling provider registered before the bootstrap and queued every local update except updates from its own `POLLING_MANAGER_ORIGIN`.
5. While the room queue is paused for a solo editor, the blank bootstrap update sits locally. When the same account opens a second editor window, collaborator detection resumes queues.
6. The stale blank bootstrap update is published to `wp_sync_storage`.
7. The primary editor saves. The parent post and revisions are correct in the database; the persisted `_crdt_document` also contains title/content, although it can retain stale `status: auto-draft`.
8. On reopen, the editor applies the saved persisted CRDT document, then connects to the room and receives the stale blank bootstrap update.
9. Because the stale update contains Y.Map assignments to blank Y.Text/block structures from a different Yjs client, it can hide the saved content in the merged document.
10. The editor renders the merged blank state even though the durable post/revisions still contain the user's content.

The fix is to prevent sync-manager bootstrap transactions from being published to the collaborative room. Bootstrapping local state from REST/persisted data is not a user edit and should not become a room update. Real editor edits and save markers still use other origins and continue to sync.

## Introduction History

This appears to be a composition bug rather than one isolated bad line.

- CRDT persistence for collaborative editing was introduced in [WordPress/gutenberg#72373](https://github.com/WordPress/gutenberg/pull/72373), including the local persisted/REST bootstrap path.
- The default HTTP polling provider was introduced in [WordPress/gutenberg#74564](https://github.com/WordPress/gutenberg/pull/74564), including room update queues and filtering only the polling provider's own origin.
- Later polling changes such as [WordPress/gutenberg#76704](https://github.com/WordPress/gutenberg/pull/76704) made queue pause/resume behavior more explicit. That makes the bug easier to hit: a blank solo bootstrap can be queued and then sent once another editor appears.

The bad invariant is that `syncManager` bootstrap updates were classified as publishable local collaboration updates. That violates the boundary between "initialize this local document from durable state" and "broadcast a user edit."

## Distinct From #77865

This is not [WordPress/gutenberg#77865](https://github.com/WordPress/gutenberg/pull/77865).

In #77865, the important failure shape is an auto-draft promotion/discoverability problem: content may only live on an auto-draft/autosave path, so the draft is hard to find or not promoted as expected.

Here:

- the parent is already a visible `draft`;
- the parent has the expected title/content;
- revisions also have the expected title/content;
- the Posts list can find the draft by title;
- the reopen path renders a blank editor because stale RTC room state is replayed over saved durable content.

It is also not [WordPress/gutenberg#77669](https://github.com/WordPress/gutenberg/pull/77669): there is no large update and no "Connection lost" modal in this repro.

## Initial Fix Plan

Initial ideas considered:

- force the save path to flush the saved CRDT document to the sync room before returning from Save draft;
- make rehydration prefer the database record whenever the persisted/remote CRDT document contains `status: auto-draft`;
- special-case title/content/blocks on reopen so a visible draft cannot be replaced by an empty remote room document;
- filter bootstrap updates so the room never receives local initialization snapshots.

The first three plans either introduce ordering dependencies, special-case post fields too deeply, or treat the symptom after the stale room write already exists. The fourth plan removes the bad state at the source.

## Audit: Linus Torvalds

The field-specific plans are too clever. If a local bootstrap transaction is not a user edit, it should not be broadcast. Do not add a pile of special cases for title, blocks, draft status, or autosaves when the origin boundary already exists.

The fix should be small, obvious, and located at the provider boundary where outbound updates are classified.

## Audit: Kyle Kingsbury / Jepsen

The failure is an ordering bug across two state stores: durable WordPress posts/revisions and the polling room log. The system let an initialization snapshot enter the operation log, where it could later race against saved durable state.

The fix must preserve the invariant that room updates are user/editor operations, not arbitrary local rehydration snapshots. A test should exercise the queue-paused/queue-resumed interleaving because that is what made a stale solo bootstrap become a later room write.

## Audit: Dan Luu

The browser repro must stay realistic. A test that directly mutates `wp.data`, creates blocks programmatically, or stubs network responses would be too easy to dismiss as a test artifact. The real report is "I saved a draft, found it, reopened it, and it was blank", so the test has to use the editor the way a user does.

The final assertion should be on the visible editor content after reopen, with DB checks proving that a failure is not just a missing save.

## Revised Fix Plan

The implemented PR branch follows the audited plan:

1. Add a lower-level polling-manager regression showing that `syncManager` bootstrap updates must not be published after queue resume.
2. Add a browser Playwright repro using normal editor actions and a second same-account editor window.
3. Change `packages/sync/src/providers/http-polling/polling-manager.ts` so `onDocUpdate` ignores both `POLLING_MANAGER_ORIGIN` and `LOCAL_SYNC_MANAGER_ORIGIN`.
4. Verify unit and browser coverage.

This keeps the provider from writing stale local bootstrap snapshots into `wp_sync_storage`, while preserving outbound sync for real editor edits and save-origin updates.

## False-Positive Analysis

This is not a false save failure: REST and SQL both show the parent draft and revisions contain the marker.

This is not a draft-list discoverability failure: the browser repro finds the draft by title in `edit.php?post_status=draft`.

This is not a direct-store test artifact: the browser repro inserts title and paragraph through normal UI controls and keyboard input.

This is not a network-fault artifact: no requests are stubbed, aborted, or delayed by the test.

This is not a clock/race injection artifact: no clock manipulation is used. The race exists in ordinary polling queue behavior.

This is not the large-update connection-loss issue: the marker content is tiny and no connection modal appears.

This is not merely #77865: the parent is already a visible draft with saved content, and the failure is replay of stale RTC room state over that saved content during editor reopen.

The residual risk is that existing production rooms can already contain stale bootstrap updates. This fix prevents new stale bootstrap writes. For already-contaminated rooms, a later saved-state compaction or room cleanup strategy may still be needed if the room log is retained indefinitely.

## Verification

Pre-fix trunk/known-fixes behavior:

- known-fixes browser repro: control passed, same-account reopen failed blank;
- trunk-derived browser repro: control passed, same-account reopen failed blank;
- SQL showed parent/revisions contained marker while the editor reopened blank;
- decoded sync room showed blank `title`, `content`, and `blocks`.

Post-fix branch `try/draft-reopens-blank-pr`:

```bash
npm run test:unit -- packages/sync/src/providers/http-polling/test/polling-manager.test.ts --runInBand
```

Result: 29 passed.

```bash
WP_ENV_PORT=8911 WP_BASE_URL=http://localhost:8911 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-draft-reopens-blank.spec.ts --project=chromium
```

Result: 2 passed.

Additional post-fix SQL check on the successful browser run:

- latest same-account draft was `post_status=draft`;
- title/content marker remained present;
- the sync storage room for that post contained only state initialization (`{"version":1}`), not a blank `document` payload.
