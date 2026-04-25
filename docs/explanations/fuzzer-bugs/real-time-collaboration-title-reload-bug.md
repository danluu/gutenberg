# Real-time Collaboration Title Reload Bug

## Summary

This is a real production-path bug in real-time collaboration.

If two collaborators are editing the same post, an unsaved title edit can sync to both users and then be undone for one collaborator when the other collaborator reloads. The collaboration room remains connected: later block edits and later fresh title edits still sync. The lost value is specifically the already-synced, unsaved title value.

The PR branch for review is [`try/rtc-title-reload-pr`](https://github.com/danluu/gutenberg/tree/try/rtc-title-reload-pr). It has the requested commit shape:

- Tests: [`c7b996a1fa40d3bb76839b1f9c167c792b0940d7`](https://github.com/danluu/gutenberg/commit/c7b996a1fa40d3bb76839b1f9c167c792b0940d7)
- Fix: [`c973f94d4ef356ebe50a942c16647cc02bc28138`](https://github.com/danluu/gutenberg/commit/c973f94d4ef356ebe50a942c16647cc02bc28138)
- PR creation URL: <https://github.com/danluu/gutenberg/pull/new/try/rtc-title-reload-pr>

## User-visible Behavior

Expected behavior:

- User A changes the title.
- User B sees the changed title.
- User A reloads before saving.
- Both users continue to see the changed title.

Actual behavior:

- User A changes the title.
- User B sees the changed title.
- User A reloads before saving.
- One user falls back to the original saved title.
- The other user still shows the unsaved edited title.

The strongest reproduction regresses the non-reloading collaborator, which rules out a simple local page-state explanation.

## Confirmed Mechanism

The bug is caused by the CRDT persistence save path replaying a stale REST save response back into the live sync document.

The failure sequence is:

1. A collaborator edits the title. The title edit syncs through the RTC Y.Doc, but it is not saved to the post record yet.
2. The persisted server-side post title is still the original title. That is normal before an explicit save.
3. A collaborator reloads. During sync bootstrap, the sync manager asks core-data to persist the current CRDT document to post meta.
4. The persistence callback in [`packages/core-data/src/resolvers.js`](https://github.com/danluu/gutenberg/blob/try/rtc-title-reload-pr/packages/core-data/src/resolvers.js) calls `saveEntityRecord` so `__unstablePrePersist` can write `_crdt_document`.
5. That save is intended to persist the CRDT document, not to make the stale saved title authoritative.
6. The REST API response is still a full post record. In the failing case, its `title` is the stale saved title.
7. The generic synced-save path in [`packages/core-data/src/actions.js`](https://github.com/danluu/gutenberg/blob/try/rtc-title-reload-pr/packages/core-data/src/actions.js) applies the full save response to the sync manager with `LOCAL_UNDO_IGNORED_ORIGIN` and `{ isSave: true }`.
8. That turns the stale saved title into a live CRDT update, so the other collaborator can receive an update that changes the title back to the original value.

This matches the deeper instrumentation:

- The stale title update originated from the save-response path, not from normal editor typing.
- The update origin was the undo-ignored save origin, which explains why it did not behave like a user edit in undo history.
- Sync storage showed the reloaded client emitting a title update back to the original title after it had already received the synced edited title.
- After the split, new block edits and new title edits still sync, so the transport and room membership are not the underlying failure.

## Repros And Checks

The committed product-level repro is the browser test [`test/e2e/specs/editor/collaboration/collaboration-title-reload.spec.ts`](https://github.com/danluu/gutenberg/blob/try/rtc-title-reload-pr/test/e2e/specs/editor/collaboration/collaboration-title-reload.spec.ts). This is the top-level repro because I could not reduce the behavior to a lower-level product repro; it requires a real reload, two editor sessions, core-data entity resolution, the sync manager, REST save response handling, and the collaboration provider.

To rerun the browser repro on the PR branch:

```bash
git fetch danluu try/rtc-title-reload-pr
git switch try/rtc-title-reload-pr
npm install
npx wp-env --config .wp-env.test.json start
npm run build -- --skip-types
WP_BASE_URL=http://localhost:8889 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-title-reload.spec.ts --project=chromium
```

To see the repro fail before the fix, check out the tests commit and run the same browser test:

```bash
git checkout c7b996a1fa40d3bb76839b1f9c167c792b0940d7
npm run build -- --skip-types
WP_BASE_URL=http://localhost:8889 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-title-reload.spec.ts --project=chromium
```

The fix also includes narrower unit-level guardrails:

- [`packages/core-data/src/test/resolvers.js`](https://github.com/danluu/gutenberg/blob/try/rtc-title-reload-pr/packages/core-data/src/test/resolvers.js) verifies that CRDT persistence saves use the internal skip option.
- [`packages/core-data/src/test/actions.js`](https://github.com/danluu/gutenberg/blob/try/rtc-title-reload-pr/packages/core-data/src/test/actions.js) verifies that skipped sync updates still mark the sync document as saved without applying the REST response fields.

To rerun those unit checks:

```bash
npm run test:unit packages/core-data/src/test/actions.js packages/core-data/src/test/resolvers.js -- --runInBand
```

The audit branch also contains a broader diagnostic repro suite in [`collaboration-title-reload-repro.spec.ts`](../../../../test/e2e/specs/editor/collaboration/collaboration-title-reload-repro.spec.ts). That file is intentionally not part of the PR branch; it contains exploratory checks that are useful for investigation but too broad for the small PR.

## Environment Used

- WordPress core in wp-env: `7.1-alpha-62260`
- Gutenberg package version: `23.0.1`
- PR base: [`1642980d599`](https://github.com/WordPress/gutenberg/commit/1642980d599), `RTC: Fix "Connection Lost" dialog when too many entities are loaded (#77631)`
- Node: `v20.19.0`
- npm: `10.8.2`
- Browser runner: Playwright Chromium against `WP_BASE_URL=http://localhost:8889`

## Why This Is Not A False Positive

The bug does not depend on fuzz-only hooks, injected faults, or mocked browser state. It reproduces in normal Playwright browser sessions with two real editor pages.

The bug also survives deeper checks:

- Before reload, both collaborators show the synced unsaved title.
- After reload, one collaborator can lose that title without making a local title edit.
- Waiting longer does not restore the lost pre-reload title.
- The room remains live enough to sync later block edits.
- The room remains live enough to sync later fresh title edits.
- Saving can repair convergence, which is consistent with the bug being a stale pre-save response replay rather than a permanent transport failure.

One subtle non-bug is worth separating: the saved post record remaining on the initial title before explicit save is normal. The production bug is that the stale saved title is replayed into the live CRDT document during an automatic CRDT persistence save.

## Introduction Analysis

The strongest direct introduction candidate is [`ea2cfb87be4`](https://github.com/WordPress/gutenberg/commit/ea2cfb87be4a91c9de5ce6430d1cda9ff9d0553c), from [PR #75841](https://github.com/WordPress/gutenberg/pull/75841), `RTC: Fix entity save call / initial persistence`.

That change altered the CRDT persistence callback from saving only edited fields to resolving the full edited entity record and calling `saveEntityRecord`. The change was made so CRDT persistence could trigger even when there were no ordinary unsaved entity edits. That solved the initial-persistence problem, but it also meant an automatic CRDT persistence save could now receive a full stale REST response and feed that response into the generic synced-save path.

Relevant history:

- [PR #72373](https://github.com/WordPress/gutenberg/pull/72373) added CRDT persistence. It is a prerequisite, but its original callback used `saveEditedEntityRecord`.
- [PR #75448](https://github.com/WordPress/gutenberg/pull/75448) moved title/content/excerpt to `Y.Text`. It is a prerequisite for this title-specific symptom, but it is not the most direct stale-save-response introduction point.
- [PR #75560](https://github.com/WordPress/gutenberg/pull/75560) fixed a separate auto-draft issue in the Y.Text title path, which is corroborating evidence that this area was still settling.
- [PR #75975](https://github.com/WordPress/gutenberg/pull/75975) fixed stale CRDT document serialization on save by waiting for deferred Y.Doc updates before serialization. That is adjacent but not this bug: it does not prevent the REST save response from being replayed into the sync document.
- [PR #76017](https://github.com/WordPress/gutenberg/pull/76017) fixed a generic refresh sync issue. This title bug is narrower because later block edits and later title edits still sync after the split.
- [PR #77658](https://github.com/WordPress/gutenberg/pull/77658), the offset-space fix, is a different RTC rich-text bug and does not address this title save-response replay path.

## Fix Plan And Rationale

The fix should not add sleeps, retries, or reload-specific special cases. The failure is deterministic once the automatic CRDT persistence save replays a stale full REST response.

The proposed fix is the one in the PR branch:

1. Keep normal `saveEntityRecord` behavior unchanged by default.
2. Add an internal `__unstableSkipSyncUpdate` option to `saveEntityRecord`.
3. When the option is false, continue applying the REST save response to the sync manager as before.
4. When the option is true, call the sync manager with an empty change object and `{ isSave: true }`.
5. Use that option only from `persistCRDTDoc`, where the save exists to persist `_crdt_document` and should not make stale REST fields authoritative.

The rationale is that the sync manager still needs to mark the document as saved, but it must not treat the REST response title/content fields as new collaborative edits for this internal persistence save. Passing `{}` preserves the save marker path without applying stale post fields.

Minimum verification for the fix:

- The browser repro fails at the tests commit and passes at the fix commit.
- The focused browser test passes after a fresh build.
- The core-data unit tests pass.
- Targeted JS lint passes for the touched source and test files.

Verification run on the PR branch:

```bash
npm run test:unit packages/core-data/src/test/actions.js packages/core-data/src/test/resolvers.js -- --runInBand
npm run lint:js -- packages/core-data/src/actions.js packages/core-data/src/resolvers.js packages/core-data/src/test/actions.js packages/core-data/src/test/resolvers.js test/e2e/specs/editor/collaboration/collaboration-title-reload.spec.ts test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts
npm run build -- --skip-types
WP_BASE_URL=http://localhost:8889 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-title-reload.spec.ts --project=chromium
```

## Bottom Line

- Reality assessment: real production bug
- False-positive assessment: not a false positive
- Lowest confirmed behavior-level repro: browser/e2e
- Root cause: automatic CRDT persistence save replays a stale full REST save response into the live sync document
- Strongest direct introduction candidate: [PR #75841](https://github.com/WordPress/gutenberg/pull/75841)
