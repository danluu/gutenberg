# RTC seed 200202: post content stops syncing after safe sync allowlist

## Summary

The overnight fuzz handoff at `artifacts/rtc-browser-fuzz/repro-seed-200202/HANDOFF.md` reports a real RTC convergence failure: user B can type normal post content, but user A never receives that content.

The failure is not from the WebSocket/HTTP sync transport. It comes from the post sync property allowlist introduced by the local privilege-containment branch:

- Broken commit: [`7cbe36591fa2c2986693c9c90f2606e65b567aff`](https://github.com/danluu/gutenberg/commit/7cbe36591fa2c2986693c9c90f2606e65b567aff), `Contain RTC privilege escalation sync surface`.
- Equivalent duplicate found in local history: `d9a5b94bb62d3940f97d62ecfcec08a2b96c3781`.
- Branches containing it: `try/privilege-escalation`, `danluu/try/privilege-escalation`, `try/fuzz-all-local-known-fixes`, and `try/fuzz-overnight-20260501`.

That commit changed post entity sync from a broad set that included `blocks` and `content` to `SAFE_POST_SYNC_PROPERTIES = new Set( [ 'title' ] )`. This preserved title sync but dropped the normal block editor payload, so paragraph edits are silently filtered out before they reach the CRDT document or before they are read back from it.

Current `origin/trunk` at `e1e460ae2c8224cf9b3772a4a578cb7c1b4a009f` does not have this title-only allowlist and passes the focused existing RTC paragraph sync scenario after a clean e2e database reset. However, trunk still has the broader unsafe sync surface. The fix should replace the failed privilege-containment attempt with a small fail-closed content allowlist that includes the fields users normally edit.

## Relationship To Known Fixes

This is not one of the already-known RTC bugs fixed by the known-fixes stack. It is a regression introduced by that stack.

The relevant known-fixes and overnight branches still contain the title-only safe sync allowlist:

- `try/fuzz-all-local-known-fixes`
- `try/fuzz-known-issues-fixed-campaign`
- `try/fuzz-known-fixes-runtime`
- `try/fuzz-revision-loss-known-fixes`
- `try/fuzz-overnight-20260501`

Those branches contain the duplicate local commit `d9a5b94bb62d3940f97d62ecfcec08a2b96c3781`, `Contain RTC privilege escalation sync surface`, which has the same product diff as `7cbe36591fa2c2986693c9c90f2606e65b567aff`. In those branches:

```ts
export const SAFE_POST_SYNC_PROPERTIES = new Set< string >( [ 'title' ] );
```

That means the "known fixes" line still admits `title` but does not admit `blocks` or `content`.

I also re-ran the natural keyboard repro against `try/fuzz-all-local-known-fixes`. It reproduced the bug after successful sync cycles: user B's editor had the typed paragraph, user A's editor still had no paragraph, and the generated local result was `bugPresent: true` in `artifacts/rtc-post-content-safe-sync/known-fixes-video/result.json`.

Older branches that predate the privilege-containment patch do not show this same failure mode because they still use the broad post sync set that includes `blocks` and `content`. That does not mean an existing known fix solved seed 200202; it means the seed 200202 regression did not exist until the title-only allowlist was added. The previous known RTC fixes cover separate problems such as sync storage races, oversized update handling, persisted hydration, cursor/selection bookkeeping, and autosave/draft behavior. This bug is specifically the post-room content admission gate dropping normal editor payloads.

## Repro Levels

### Handoff Repro

The fuzzer found the failure in:

`artifacts/rtc-browser-fuzz/repro-seed-200202/HANDOFF.md`

The important handoff clue is that the observed safe sync set was only:

```js
[ 'title' ]
```

That excludes both post `content` and `blocks`.

### CRDT Unit Repro

At the CRDT boundary, the broken branch rejects normal editor changes:

1. `applyPostChangesToCRDTDoc` iterates over local entity changes.
2. It calls `shouldSyncPostProperty( key, syncedProperties )`.
3. `shouldSyncPostProperty` requires the key to be in both the entity's `syncedProperties` and `SAFE_POST_SYNC_PROPERTIES`.
4. In the broken commit, `SAFE_POST_SYNC_PROPERTIES` contains only `title`.
5. `content` and `blocks` return false and are not written to the Y.Doc.

The inverse path has the same bug: `getPostChangesFromCRDTDoc` also uses `shouldSyncPostProperty`, so even if a post room document contains `content` or `blocks`, the local entity change reader ignores them.

The PR branch adds unit tests for both directions:

- `applyPostChangesToCRDTDoc` must write safe user-editable content fields.
- `applyPostChangesToCRDTDoc` must reject unsafe fields even if an entity config tries to include them.
- `getPostChangesFromCRDTDoc` must return safe content fields and ignore unsafe CRDT keys.

### Entity Config Repro

The broken commit also changes `loadPostTypeEntities` in `packages/core-data/src/entities.js` so post type entities receive only `SAFE_POST_SYNC_PROPERTIES`.

That was the right direction for privilege containment, but the set itself was incomplete. Entity config tests should prove two things at once:

- `blocks`, `content`, `excerpt`, and `title` are included.
- `author`, status/date fields, meta, and taxonomy REST bases are not included.

### Browser Repro

The natural browser reproduction is:

1. User A opens a post in the editor.
2. User B opens the same post in another authenticated session.
3. User B uses normal keyboard input to add paragraph text.
4. User B's editor shows the typed paragraph.
5. User A's editor never receives it on the broken branch.

No artificial blocks, injected faults, direct store manipulation, or direct CRDT writes are required.

I also checked the recent known-fixes branch `try/fuzz-all-local-known-fixes`. It still has `SAFE_POST_SYNC_PROPERTIES = new Set< string >( [ 'title' ] )`, so it does not contain a fix for this bug. A focused existing collaboration test on that branch did not reach its content assertion because the collaborator-list helper timed out, but the trace showed repeated HTTP 200 `wp-sync` responses and two awareness clients in `postType/post:5`; the code inspection and handoff failure both point to the title-only allowlist as the remaining bug.

## Origin

### Upstream RTC Taxonomy Expansion

Commit [`338747b7eb2d579e39bc262571f604538f420e44`](https://github.com/WordPress/gutenberg/commit/338747b7eb2d579e39bc262571f604538f420e44), from [WordPress/gutenberg#75983](https://github.com/WordPress/gutenberg/pull/75983), changed RTC post entity sync to auto-register taxonomy REST bases. It built a broad `syncedProperties` set containing:

```js
[
	'author',
	'blocks',
	'content',
	'comment_status',
	'date',
	'excerpt',
	'featured_media',
	'format',
	'meta',
	'ping_status',
	'slug',
	'status',
	'sticky',
	'template',
	'title',
	...taxonomyRestBases,
]
```

That commit made custom taxonomy collaboration work, and because it still included `blocks` and `content`, normal paragraph sync worked. The problem is that this set also synced fields whose authority depends on the origin user's capabilities. That was the privilege-escalation concern.

### Local Privilege-Containment Regression

Commit [`7cbe36591fa2c2986693c9c90f2606e65b567aff`](https://github.com/danluu/gutenberg/commit/7cbe36591fa2c2986693c9c90f2606e65b567aff) tried to contain the privilege surface by replacing the broad set with `SAFE_POST_SYNC_PROPERTIES`.

The relevant diff did three things:

1. Removed the taxonomy REST-base fetch from `loadPostTypeEntities`.
2. Set every post type's `syncedProperties` to `new Set( SAFE_POST_SYNC_PROPERTIES )`.
3. Added a second safety gate in `crdt.ts`:

```ts
export const SAFE_POST_SYNC_PROPERTIES = new Set< string >( [ 'title' ] );
```

The new safety gate was conceptually sound but operationally incomplete. Gutenberg's block editor does not represent normal paragraph edits as `title`; it syncs post body state through `content` and block state. With only `title` admitted, real user edits are dropped by both the writer and reader paths.

## Fix Plan Before Audit

1. Keep the fail-closed safety gate.
2. Expand `SAFE_POST_SYNC_PROPERTIES` from `title` only to the minimal normal editing set:

```ts
new Set( [ 'blocks', 'content', 'excerpt', 'title' ] )
```

3. Use that same set for post type entity sync config.
4. Continue excluding author, status/date fields, meta, template, slug, sticky, featured media, comment/ping status, format, and taxonomy REST bases until there is an origin-aware authorization design for those fields.
5. Add unit tests at the CRDT boundary and entity-config boundary.
6. Add a natural Playwright repro that uses two logged-in browser sessions and keyboard input.

## Audit

### Linux Torvalds Lens

The original broad set had a vague trust model: it mixed ordinary content with capability-sensitive fields and relied on later REST save behavior. The title-only patch went too far in the other direction and broke the primary user path. The replacement should be small, explicit, and boring: a named allowlist with tests that fail if someone expands it casually. Dynamic taxonomy rest-base sync should not be mixed back in until the authorization model is explicit.

### Kyle Kingsbury / Jepsen Lens

The important property is convergence under normal concurrent editing. A transport-level green path is insufficient if the application state machine filters out the payload. The tests need to hit both the state-machine boundary (`applyPostChangesToCRDTDoc` and `getPostChangesFromCRDTDoc`) and the browser-level convergence path. The browser repro should also distinguish "transport never connected" from "transport connected but state did not converge."

### Dan Luu Lens

The repro must avoid becoming a test artifact. It should use natural user actions, a clean e2e database, and explicit evidence that the known-fixes branch still contains the faulty allowlist. The fix should also avoid large RTC redesign work in the same branch; the useful change here is the smallest one that preserves content sync while closing the known privilege escalation surface.

## Fix Plan After Audit

1. Implement `SAFE_POST_SYNC_PROPERTIES` as exactly `blocks`, `content`, `excerpt`, and `title`.
2. Gate both CRDT writes and CRDT reads through `shouldSyncPostProperty`.
3. Configure post type entity sync from that safe set only.
4. Remove taxonomy REST-base auto-registration from RTC sync for now.
5. Add tests proving safe content fields sync and unsafe fields do not.
6. Add a Playwright repro with normal keyboard input from user B and a user A convergence assertion.
7. Keep the PR branch split into three commits: non-Playwright tests, Playwright repro, fix.
