# Navigation menu stale-save overwrite in the Site Editor

## Bug summary

Two same-account Site Editor windows can overwrite each other's changes to the
same `wp_navigation` menu. If window A opens a menu, restores or adds a page
link, and saves, then window B, which was opened before A's save, can add a
different link and save stale serialized navigation content. The current
`wp_navigation` post keeps B's stale edit and loses A's page link.

This maps to the menu-disappearance side of Zendesk ticket `#11112607`: the
page still existed, but the navigation menu no longer contained the link users
expected to see.

This is distinct from the large-update "Connection lost" issue tracked by
[#77669](https://github.com/WordPress/gutenberg/pull/77669), and it is not
covered by the fixes in
[#77865](https://github.com/WordPress/gutenberg/pull/77865) or
[#77866](https://github.com/WordPress/gutenberg/pull/77866).

## Realistic repros

### User-level repro

1. Enable real-time collaboration.
2. Open the same published navigation menu in two same-account Site Editor
   windows.
3. In window A, add or restore a published page link and save.
4. In window B, which loaded the menu before A saved, add a different link and
   save.
5. Reload or fetch the `wp_navigation` menu. The menu contains B's link and no
   longer contains A's restored page link.

This is the closest product-level match for ticket `#11112607`: the affected
page remains published, but the menu's saved content no longer references it.

### Store-level regression

The non-browser regression is in `packages/core-data/src/test/actions.js`.
It exercises `saveEntityRecord( 'postType', 'wp_navigation', ... )` through the
real core-data pre-persist path:

```bash
npm run test:unit packages/core-data/src/test/actions.js -- --runInBand
```

Relevant test:

```text
merges stale wp_navigation content with the latest server content before save
```

The test models the real stale-save shape:

- base record in the stale editor: `Home`;
- latest server record after another window saves: `Home + Debussy Images`;
- stale editor edit: `Home + Support`;
- expected PUT body after the fix: `Home + Debussy Images + Support`.

### Browser-level Playwright repro

The browser repro is in
`test/e2e/specs/editor/collaboration/collaboration-navigation-menu-stale-save.spec.ts`.
The fixture setup creates a page and a navigation menu over REST, but the
browser-level edits are normal Site Editor actions only: open the navigation
menu editor, click the navigation block appender, use the "Search or type URL"
control, choose the page, type the custom URL, and press the Site Editor Save
button.

Run it with an E2E wp-env:

```bash
npm run wp-env start -- --config .wp-env.test.json --auto-port --update
WP_BASE_URL=http://localhost:8898 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-navigation-menu-stale-save.spec.ts --project=chromium
```

Use the actual port reported by `npm run wp-env status` if it differs.

### Video repro

The browser failure was also captured as a side-by-side video with an annotated
running log:

```text
/tmp/nav-menu-stale-save-video/navigation-menu-stale-save-overwrite.mp4
```

The video shows:

- window A and window B open on the same `wp_navigation` menu;
- A adds the Debussy page link through the Site Editor UI and saves;
- B, opened before A's save, adds the support URL through the Site Editor UI and
  saves;
- the final database check reports that the current menu has B's support link
  and does not have A's Debussy page link.

## Status against the known-fixes base

The known-fixes worktree was checked at:

```text
/Users/danluu/dev/fuzz/gutenberg-fuzz-all-local-known-fixes-clone
branch: try/fuzz-all-local-known-fixes-clone
observed HEAD: 6a1a8d30794
```

The bug still reproduced there with the existing known-fixes browser repro:

```bash
WP_BASE_URL=http://localhost:8897 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-zendesk-navigation-menu-loss-browser-repro.spec.ts --project=chromium
```

The failing assertion showed that the current `wp_navigation` content contained
the stale support URL from window B and did not contain the Debussy page link
saved by window A. Therefore no existing known fix in that branch covers this
bug.

## Failure mechanism

The Site Editor currently disables the real-time collaboration setting that the
post editor uses:

- [PR #76223](https://github.com/WordPress/gutenberg/pull/76223)
- [commit 6798ab430ed20a9591aac640feab526276ec4256](https://github.com/WordPress/gutenberg/commit/6798ab430ed20a9591aac640feab526276ec4256)
- local code: `lib/compat/wordpress-7.0/collaboration.php`

That commit explicitly set collaboration off for `site-editor.php` and
`site-editor-v2`. As a result, a navigation menu edited in the Site Editor does
not get the post-editor RTC merge behavior.

The menu save path then writes the full serialized `wp_navigation` content. In
the failing case, window B's core-data store still has the base menu content it
loaded before A saved. When B saves, core-data sends a full `content` update for
the menu without first reconciling it with the latest server content. The REST
update replaces the current `post_content`, so A's restored page link is lost.

The problem is a stale whole-entity save. It does not require network failure,
request stubbing, clock changes, large payloads, or cross-account permission
tricks.

## How the bug was introduced

The proximate supported introduction point is
[commit 6798ab430ed20a9591aac640feab526276ec4256](https://github.com/WordPress/gutenberg/commit/6798ab430ed20a9591aac640feab526276ec4256),
`Temp: Disable RTC in the site editor (#76223)`. That change does not create
the general possibility of blind REST replacement, but it makes the Site Editor
navigation menu surface opt out of the collaboration machinery that protects
post-editor content.

The underlying `wp_navigation` save still behaves like a normal full-content
entity update. I did not identify a narrower single commit where navigation
menus started accepting blind stale replacement; the actionable regression is
the mismatch between the newly disabled Site Editor RTC surface and the existing
full-content menu save semantics.

## Initial fix plan

The first-pass options were:

1. Re-enable full real-time collaboration in the Site Editor.
2. Add a server-side compare-and-swap or base-revision guard for
   `wp_navigation` updates.
3. Add a targeted core-data pre-save reconciliation for `wp_navigation` content
   before sending the full update.

## Audit of the initial plan

### Linus Torvalds audit

Do not turn on full Site Editor collaboration as an incidental fix for a
navigation menu data-loss bug. That has too much unrelated surface area and
would make a small data-loss fix depend on a broad experimental behavior.

A targeted fix is better, but it must be simple enough to reason about. Silent
client-side merges can become another bug factory if they try to infer user
intent for deletion and reordering. The fix should preserve existing server
content first and only carry over stale additions when the shape is obviously
safe.

### Kyle Kingsbury / Jepsen audit

Fetch-before-PUT is not a linearizable write protocol. Another writer can still
save between the fetch and the PUT. A complete distributed-systems fix would add
a server-side precondition, such as a base revision or content version, and
reject or merge conflicting saves atomically.

The client-side reconciliation is still useful because it closes the observed
same-account stale-window loss mode, but it should be documented as mitigation,
not as a complete concurrency-control protocol.

### Dan Luu audit

The important thing is the user-visible content-loss path, not a synthetic unit
case. The fix needs a browser repro that operates through the same Site Editor
controls a user would use, plus a lower-level regression to pin down the data
flow where stale content becomes a destructive full update.

False positives matter here. Direct `wp.data` edits, artificial block creation,
network faults, or request stubbing in the browser repro would make the failure
less persuasive. The browser repro should use normal UI for both edits and use
REST only for fixture setup and final verification.

## Revised fix plan

The implemented fix is intentionally scoped:

1. In `prePersistPostType`, detect saves of existing `wp_navigation` records
   that include `content`.
2. Fetch the latest navigation menu content with `context=edit` immediately
   before the PUT.
3. If the latest server content differs from both the stale base and the stale
   edit, preserve the latest server content.
4. If the stale edit contains obvious top-level block additions relative to its
   base, append those additions to the latest server content before saving.
5. If the shape is not an obvious additive merge, send the latest server content
   instead of overwriting it with stale content.

This targets the observed data-loss case while avoiding broad Site Editor RTC
enablement. It also leaves room for the stronger future fix: server-side
revision preconditions or atomic merge/reject behavior for `wp_navigation`
updates.

## False-positive analysis

The browser repro uses normal user actions for the critical operations. It does
not use direct browser `wp.data` mutation, artificial block creation, request
stubbing, network failures, clock hacks, or fault injection.

REST is used only to create a deterministic page/menu fixture and to verify the
saved `wp_navigation` record and revisions after the UI saves. Those checks
match the user-visible symptom: a published page still exists, but the current
navigation menu content no longer references it.

The known-fixes base still failed the browser repro, so this is not already
covered by the local known-fixes branch. The fixed branch passes both the
core-data regression and the browser-level Playwright regression.

This also avoids conflating the bug with:

- the large-update "Connection lost" behavior in
  [#77669](https://github.com/WordPress/gutenberg/pull/77669);
- draft/autosave collaboration behavior in
  [#77865](https://github.com/WordPress/gutenberg/pull/77865);
- duplicate-table-row behavior in
  [#77866](https://github.com/WordPress/gutenberg/pull/77866).
