# Form block stale overwrite

## Bug Summary

This investigates a Real-Time Collaboration stale-save failure involving form
content. The observed failure is:

1. A post is opened in two same-account editor sessions.
2. Session A adds body text and a Form block, then saves.
3. Session B was opened before that save and still has an old editor snapshot.
4. Session B adds its own body text and Form block, then saves.
5. The current post contains Session B's body/form markers but no longer
   contains Session A's body/form markers.

This is not the large-update `Connection lost` failure. That signature matches
WordPress/gutenberg#77669 and was intentionally excluded from this work.

The public conclusion is that this form case is a payload-specific instance of
the broader stale-content overwrite class. The fix should be shared, but form
coverage is still required because nested Form block structure and field
attributes are a higher-risk content shape than a single paragraph.

## Repros Built

### CRDT Unit Repro

File:

```text
packages/core-data/src/utils/test/crdt-form-stale-snapshot.ts
```

Command:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-form-stale-snapshot.ts -- --runInBand
```

Shape:

- create an initial paragraph block;
- apply a first-session snapshot that appends a body marker and a nested
  `core/form` tree;
- apply a stale second-session snapshot that was based only on the initial
  paragraph and appends a different body/form marker set;
- assert that the merged CRDT block tree contains both marker sets.

Pre-fix failure:

```text
Expected substring: "form-overwrite-customer-body"
Received string:    ... "form-overwrite-stale-body" ...
```

This level isolates the block-array merge failure, including nested form input
attributes, without depending on browser timing.

### Direct Editor/Save-Path Repro

File:

```text
test/e2e/specs/editor/collaboration/collaboration-form-content-stale-overwrite.spec.ts
```

Command:

```bash
WP_ENV_PORT=8899 WP_BASE_URL=http://localhost:8899 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-form-content-stale-overwrite.spec.ts --project=chromium
```

Shape:

- enable collaboration and the Form block experiment;
- create a draft with an initial paragraph;
- open the same draft in two authenticated same-account editor sessions;
- make a first-session form/body edit and save;
- make a second-session form/body edit from stale state and save;
- assert that the current post and revision history contain both marker sets.

This repro exercises more of the real editor save path than the unit test, but
it is not the browser-level realism proof because it uses direct editor/block
helpers for setup and insertion.

### Browser UI Repro

File:

```text
test/e2e/specs/editor/collaboration/collaboration-form-content-browser.spec.ts
```

Command:

```bash
WP_ENV_PORT=8899 WP_BASE_URL=http://localhost:8899 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-form-content-browser.spec.ts --project=chromium
```

Browser-level restrictions:

- no artificial block creation for the user-visible repro;
- no direct `wp.data` mutation;
- no request stubbing;
- no network failure injection;
- no clock hacks;
- no fault injection.

The browser repro uses ordinary editor actions:

- two normal browser contexts logged in as the same user;
- focus the stale session by clicking the existing paragraph;
- type both body markers;
- insert Form blocks through the slash inserter with `/form`;
- edit form labels by clicking the visible labels and typing;
- click the visible `Save draft` button in each session.

Pre-fix, the same sequence leaves the current post with all second-session
markers and none of the first-session markers. Post-fix, it preserves both
marker sets in the current post and in revisions.

### Video Repro

The local video made from the pre-fix tree is:

```text
/Users/danluu/dev/fuzz/gutenberg-form-content-overwrite-pr/artifacts/form-content-overwrite-repro.mp4
```

It is a 1920x1080 stitched recording with the first editor session, second
same-account editor session, and an annotated running log visible at the same
time.

The final video state showed:

```text
present stale-session markers: 4/4
missing first-session markers:
  form-overwrite-customer-body-video
  form-overwrite-customer-video-name
  form-overwrite-customer-video-email
  form-overwrite-customer-video-story
```

## Status Against Known-Fixes Base

Known-fixes base checked:

```text
worktree: /Users/danluu/dev/fuzz/gutenberg-fuzz-all-local-known-fixes-clone
branch:   try/fuzz-all-local-known-fixes-clone
HEAD:     6a1a8d30794f4313ed114900d70433354a586cf7
```

For isolation, I created a separate checking worktree at
`/Users/danluu/dev/fuzz/gutenberg-form-content-overwrite-known-check` and copied
the deterministic form stale-snapshot repro there.

Command:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-form-stale-snapshot.ts -- --runInBand
```

Result on `6a1a8d30794`: failed. The final CRDT block JSON contained the stale
session body/form markers and did not contain `form-overwrite-customer-body`.

Conclusion: the known-fixes base does not fix this form stale overwrite variant.
The form bug therefore was not already covered by the local known-fixes branch at
`6a1a8d30794`.

## Status Against PR 77876 And Other Stale Fixes

The current broad stale-content overwrite fix is:

```text
https://github.com/WordPress/gutenberg/pull/77876
```

I checked the PR head:

```text
refs/pull/77876/head
commit: a16b1ca90f4bd365800bb16d9647db2cfc7c6563
title:  RTC: fix stale block snapshot overwriting newer state
```

The production fix in PR 77876 is the same mechanism needed for this form case:

- `prePersistPostType` fetches the latest saved REST record before persisting a
  collaborated `content`, `title`, or `excerpt` save.
- It compares the latest saved raw fields with the editor's stale
  `persistedRecord`.
- If the server moved ahead, it applies the latest persisted CRDT document to the
  local `SyncManager`.
- It derives outgoing saved fields from the merged CRDT record instead of from
  the stale local snapshot.
- The block CRDT path reconciles stale full block snapshots against the previous
  local base.
- Serialized `content` is derived from merged blocks when block changes are
  present, so the raw REST field is not left as a stale full-string snapshot.

I also copied the neutral deterministic form repro onto a temporary worktree at
PR 77876 head and ran:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-form-stale-snapshot.ts -- --runInBand
```

Result on `a16b1ca90f4`: passed.

The remaining production-code delta between PR 77876 and the form branch is not
behavioral for this bug. It is limited to a JSDoc line and local statement
ordering in the block-attribute reconciliation helper. The meaningful difference
is coverage: the form branch adds form-specific direct and browser-level repros
that PR 77876 does not currently contain.

Older stale-content-related fixes do not cover this form variant:

- https://github.com/WordPress/gutenberg/pull/77865 addresses a different
  autosave/revision content-loss shape.
- https://github.com/WordPress/gutenberg/pull/77866 addresses a different
  table/revision shape involving old or externally-created content.
- https://github.com/WordPress/gutenberg/pull/75975 fixes a stale local CRDT
  document being persisted before pending local updates flush. It does not fetch
  and merge a newer server CRDT document from another same-account editor before
  saving.
- https://github.com/WordPress/gutenberg/pull/76337 addresses stale values in
  autosave payload construction, while this repro uses toolbar saves through the
  collaborated post-type persistence path.

Conclusion: this form bug should be treated as fixed by PR 77876's production
mechanism if that PR lands as currently written. The form-specific branch should
be folded into PR 77876 as additional coverage or referenced from it, rather than
shipped as a separate production fix.

## Failure Mechanism

The user-visible bug is a stale full-snapshot overwrite.

Before the fix, a same-account editor could save from a local block tree loaded
before another session's save. That stale local tree did not include the newer
paragraph and Form block. When the stale session later saved, the editor treated
its stale block snapshot as authoritative for the post's `blocks`/`content`
state.

The damaging transition happens at save time. The local editor state can be old,
and `persistedRecord` in `core-data` can also be old. The REST update is then
submitted as a normal post update, so the server accepts the stale serialized
content as the new current content. Prior revisions may still contain the newer
body/form markers, but the current post has been moved backward to the stale
session's view plus its own local additions.

The block merge code alone cannot guarantee safety for this browser shape:

- `mergeCrdtBlocks` receives a full local block snapshot.
- The stale session's local snapshot omits the newer Form block.
- The stale session's local Y.Doc may not yet contain the newer persisted CRDT
  document at the moment the user saves.
- Block `clientId` values are useful for local in-memory alignment, but they are
  not durable database identities across independently loaded browser sessions.

Form blocks make the overwrite visible because a single lost parent block also
loses nested form input labels, names, textarea attributes, and submit-button
structure. The Form block is therefore a good regression payload, but it is not
the root cause.

## Distinct or Special Case?

This is a special case of the broader stale-content overwrite bug fixed by PR
77876, not a separate root cause.

It still deserves form-specific regression coverage. A paragraph-only stale-save
test would not prove that nested Form block structure and form field attributes
survive the merge.

## How This Was Introduced

I did not find evidence that the Form block introduced the overwrite. The failure
comes from a consistency gap introduced as post content editing moved to a
CRDT-backed local state while the final REST save still allowed an unconditional
write based on the editor's stale local base.

The relevant design history is:

- https://github.com/WordPress/gutenberg/pull/68483 supplied the block-array
  diff approach that `mergeCrdtBlocks` is explicitly modeled after.
- https://github.com/WordPress/gutenberg/pull/72114 made syncing a side concern
  of local editor state instead of replacing the local editor state model.
- https://github.com/WordPress/gutenberg/pull/72262 added the custom CRDT merge
  path for post entities, including block-tree merging.
- https://github.com/WordPress/gutenberg/pull/72373 implemented CRDT persistence
  for collaborative editing, storing a serialized CRDT document with the post.
- https://github.com/WordPress/gutenberg/pull/74562 moved collaborative editing
  toward the default Gutenberg plugin experience.
- https://github.com/WordPress/gutenberg/pull/75699 removed plugin-only gating
  checks around collaborative editing.
- https://github.com/WordPress/gutenberg/pull/75975 fixed one stale-persistence
  issue by avoiding stale CRDT documents in saved post meta, but it did not add
  a save-time check against the latest persisted post record before writing
  `content`, `title`, or `excerpt`.

The key architectural mismatch is between "merge local edits through CRDT" and
"save a whole post field through REST". The editor can merge live peer updates
while both sessions are current, but a session that was loaded from an older
record can still later submit a complete serialized content field. Without a
base-revision check, a latest-record fetch, or a pre-save merge with the latest
persisted CRDT document, that save has last-writer-wins semantics over the entire
content field.

The bug therefore emerges from this sequence:

1. Session B loads record version N and initializes local editor state plus a
   local CRDT document.
2. Session A saves version N+1 with new body/form content and a persisted CRDT
   document containing that content.
3. Session B remains based on version N.
4. Session B makes a local edit, producing a local block snapshot that contains
   version N plus Session B's changes, but not Session A's version N+1 changes.
5. Session B saves. The previous `prePersistPostType` path persisted a CRDT
   document from Session B's local state, but did not first load version N+1 and
   merge it.
6. The server stores Session B's stale serialized `content` as the current post
   content.

This is a classic stale read followed by a blind write. The form payload only
changes the blast radius: the lost data is not just paragraph text, but nested
block attributes and structure.

The missing invariant was:

```text
A save from an editor loaded from version N must not overwrite content from
version N+1 unless the editor has merged or explicitly resolved that newer state.
```

## Initial Fix Plan

The first candidate fix was block-array local:

1. Teach `mergeCrdtBlocks` to remember the previous local block snapshot for a
   Y.Array.
2. When a stale incoming local snapshot omits blocks that are present in the
   current Y.Array but absent from the previous local snapshot, treat those
   blocks as remote inserts and keep them.
3. Reconcile unchanged attributes from stale local blocks with newer current
   blocks so stale snapshots do not revert attributes they did not edit.
4. Add form-specific CRDT coverage.

That plan fixed the deterministic unit repro, but it was too narrow for the
browser/save-path failure.

## Audit of the Initial Plan

### Linus Torvalds Review

The plan was too clever at the wrong layer. A block-array reconciliation
heuristic can paper over one missing-block shape, but it does not establish the
save invariant. It also leans on `clientId`, and `clientId` is not a durable
identity across separately loaded browser sessions. The save path is where the
stale write becomes destructive, so the fix needs to stop stale saves from being
blindly authoritative there.

### Kyle Kingsbury / Jepsen Review

The system is accepting a write derived from an old read after a later committed
write exists. That is a consistency bug, not only a merge-algorithm bug. The
right test is a history: first write commits, stale write commits, final read
must include both or the stale write must be rejected/conflicted. The fix should
explicitly observe the latest persisted state before committing a
`content`/`title`/`excerpt` save, merge it, and then persist the merged state.

### Dan Luu Review

The repro has to match the real product surface. A low-level block test is
valuable, but it is not sufficient evidence that the product bug is fixed. The
browser repro must use normal block editor UI actions and specifically cover the
Form block because that is the high-risk nested content shape. The analysis also
needs to avoid counting the known large-update `Connection lost` issue as part
of this bug.

## Revised Fix Plan

The revised fix uses the broader stale-content overwrite mechanism:

1. In `prePersistPostType`, when RTC is enabled and a post save edits
   `content`, `title`, or `excerpt`, fetch the latest saved REST record before
   persisting.
2. Compare the latest saved raw fields against the local `persistedRecord` that
   the editor believes it is saving over.
3. If a saved field changed, apply the latest persisted CRDT document from the
   REST record into the local `SyncManager`.
4. Derive outgoing saved fields from the merged CRDT record instead of from the
   stale local snapshot.
5. When block changes are present, derive `content` from the merged CRDT blocks
   so the raw post content and transient `blocks` state stay consistent.
6. Keep block-array stale snapshot reconciliation as a helper for local CRDT
   merges, but do not rely on it as the only save-time defense.
7. Cover the fix at three levels:
   - CRDT unit form repro;
   - direct editor/save-path form repro;
   - browser UI form repro using normal user actions.

PR 77876 implements this production plan for the broader stale-content overwrite
class. The form branch applies the same mechanism and adds form-specific
regression coverage.

## False-Positive Analysis

Reasons this is not a test-only artifact:

- The browser-level repro uses normal editor actions for the content changes:
  typing, slash inserter, visible Form block fields, and `Save draft`.
- There is no direct browser `wp.data` mutation in the browser repro.
- There is no artificial block creation, request stubbing, network failure,
  clock hack, or fault injection in the browser repro.
- The stale state comes from two normal same-account editor sessions.
- The assertion checks that stale-session markers are present, so the failure is
  not simply "second save failed".
- The assertion checks first-session markers in the current post and in revision
  history, so preserving only an old revision is not counted as success.
- The deterministic repro fails on the known-fixes base at `6a1a8d30794`, which
  rules out the current known-fix branch as already covering this shape.
- The same deterministic form repro passes on PR 77876 head `a16b1ca90f4`, which
  supports folding this form case into that broader stale-content fix.

Remaining limits:

- The local repro uses a same-admin wp-env account to model same-account access.
- The lower-level tests construct block payloads directly. They are mechanism
  tests, not the realism proof. The browser UI repro is the realism proof.
- This analysis does not cover the large-update `Connection lost` issue because
  that matches WordPress/gutenberg#77669.

## Verification Status

On the fixed `try/form-content-overwrite-pr` branch:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-form-stale-snapshot.ts -- --runInBand
WP_ENV_PORT=8899 WP_BASE_URL=http://localhost:8899 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-form-content-stale-overwrite.spec.ts --project=chromium
WP_ENV_PORT=8899 WP_BASE_URL=http://localhost:8899 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-form-content-browser.spec.ts --project=chromium
```

All three passed after the fix.
