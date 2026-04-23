# Real-time Collaboration Title Reload Bug

## Summary

This is a real production-path bug.

When two collaborators are editing the same post, a title change can sync live to both users, but if one user reloads before the post is saved, the already-synced unsaved title can be lost on one collaborator. After reload, one page still shows the synced unsaved title, while the other page falls back to the initial title.

The strongest current evidence is that this is an active regression on the non-reloading collaborator, not just a failure to restore state on the reloading page:

- before reload, both collaborators show the synced unsaved title
- one collaborator reloads
- afterward, the other collaborator regresses from the synced unsaved title back to the initial title without making a local title change

This is not just a short timeout or a DOM-only mismatch:

- the original minimal repro still fails after 30 seconds
- a longer 90-second convergence check still does not rejoin the two pages
- live title sync works without reload
- generic collaborative refresh behavior works for content
- reloading one collaborator actively regresses the other collaborator from the synced unsaved title back to the initial title
- later block sync still works after the split
- later fresh title edits still sync after the split
- saving the page that still holds the lost-title successor edit makes both pages and the persisted record converge again

The isolated minimal repro is in [test/e2e/specs/editor/collaboration/collaboration-title-reload-repro.spec.ts](../../../../test/e2e/specs/editor/collaboration/collaboration-title-reload-repro.spec.ts).

## Why This Is Thought To Be Real

- It reproduces in its own git worktree, outside the long-run fuzz harness.
- The repro does not depend on injected faults, Antithesis, or the 12-hour runner.
- The scenario is production-like: two editors, one synced title edit, one reload.
- The failure is a user-visible and store-visible state split, not just a console warning or timing assertion.
- The issue survives a deeper bounded analysis run instead of disappearing with more sync time.

Short control runs also passed in the same isolated worktree:

- [collaboration-sync.spec.ts](../../../../test/e2e/specs/editor/collaboration/collaboration-sync.spec.ts): `Title changes sync between users`
- [collaboration-refresh.spec.ts](../../../../test/e2e/specs/editor/collaboration/collaboration-refresh.spec.ts): `User A edits are synced to User B after User A refreshes`
- [collaboration-title-reload-repro.spec.ts](../../../../test/e2e/specs/editor/collaboration/collaboration-title-reload-repro.spec.ts): `reloading one collaborator regresses the other collaborator from the synced unsaved title`

That narrows the bug to the reload reconciliation of an already-synced unsaved title edit, not title sync in general and not refresh in general.

Local isolated runs also produced matching Playwright screenshots, traces, and error snapshots in the worktree test artifact directories. Those generated artifacts are not checked in, so the stable evidence in this branch is the repro spec plus the captured state summarized below.

The key observed state is:

- original 30-second repro:
  - page 1 title: `RTC reload repro synced title`
  - page 2 title: `RTC reload repro initial title`
  - blocks: equal
  - persisted `_crdt_document`: equal
- deeper 90-second analysis:
  - one page still has `editedTitle = RTC reload repro synced title`
  - the other page still has `editedTitle = RTC reload repro initial title`
  - the page with the synced title keeps it as an unsaved edit via `entityEditsTitle = RTC reload repro synced title`
  - the other page remains on `RTC reload repro initial title`
  - both pages still share the same persisted `_crdt_document`
- targeted regression check:
  - before reload, both pages have `editedTitle = RTC reload repro synced title`
  - after one collaborator reloads, the non-reloading collaborator regresses to `editedTitle = RTC reload repro initial title`
  - the reloading collaborator still has `editedTitle = RTC reload repro synced title`
- post-split liveness check:
  - a new paragraph block added after the split still syncs across pages
  - a brand-new title edit made after the split also syncs across pages
  - both pages then converge again on the new unsaved title
  - this shows the room is still live; the bug is the loss of the pre-reload unsaved title on one page

That is the signature of a real collaboration-state bug, not a false positive.

## Minimal Repro

1. Create a draft post with a non-empty title and at least one paragraph.
2. Open the post in two collaborative editor sessions.
3. Change the title in one session.
4. Wait until the second session shows the new title.
5. Reload one of the sessions before saving.
6. Wait for reconnect and convergence.

Expected result:

- both sessions should still show the edited title

Actual result:

- the two sessions stop agreeing on the already-synced unsaved title
- in deeper inspection, that pre-reload unsaved title survives only on one page
- more specifically, reloading one collaborator can make the other collaborator regress from the synced unsaved title back to the initial title
- later fresh edits can still sync, so the defect is loss of the earlier synced edit, not total title-sync failure

The current repro command is:

```bash
PATH="$PWD/.tooling/node-v20.19.0-darwin-arm64/bin:$PWD/node_modules/.bin:$PATH" \
npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-title-reload-repro.spec.ts --project=chromium
```

The deeper diagnostic command is:

```bash
PATH="$PWD/.tooling/node-v20.19.0-darwin-arm64/bin:$PWD/node_modules/.bin:$PATH" \
npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-title-reload-repro.spec.ts --project=chromium --grep "reload divergence persists"
```

The regression-focused command is:

```bash
PATH="$PWD/.tooling/node-v20.19.0-darwin-arm64/bin:$PWD/node_modules/.bin:$PATH" \
npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-title-reload-repro.spec.ts --project=chromium --grep "regresses the other collaborator"
```

## Lowest Reproducible Layer

The lowest reproducible layer found so far is the real browser/e2e layer.

I could not push this lower into a stable unit or mocked integration test because the failure depends on the interaction of three subsystems that are mostly tested separately today:

- entity reload through the `core-data` resolver in [packages/core-data/src/resolvers.js](../../../../packages/core-data/src/resolvers.js)
- reload/bootstrap in [packages/sync/src/manager.ts](../../../../packages/sync/src/manager.ts)
- post title CRDT translation in [packages/core-data/src/utils/crdt.ts](../../../../packages/core-data/src/utils/crdt.ts)

The relevant paths are:

- title writes become `Y.Text` updates in [applyPostChangesToCRDTDoc()](../../../../packages/core-data/src/utils/crdt.ts:173)
- title replay after CRDT updates happens in [getPostChangesFromCRDTDoc()](../../../../packages/core-data/src/utils/crdt.ts:277)
- reload bootstraps the Y.Doc and applies persisted CRDT state in [loadEntity() / _applyPersistedCrdtDoc()](../../../../packages/sync/src/manager.ts:271)

Local browser autosave is not currently the best explanation. The restore path in [packages/editor/src/components/local-autosave-monitor/index.js](../../../../packages/editor/src/components/local-autosave-monitor/index.js:70) requires a restore notice and an explicit click, which this repro does not perform.

The deeper run makes the bug more specific than the original writeup:

- the already-synced unsaved title is lost on one page after reload
- the room is still healthy enough to exchange later block updates and later title updates
- the bug is therefore in reload-time reconciliation of the earlier unsaved title edit

One important correction from the deeper analysis: the last saved post record staying on the initial title before save is not bug evidence by itself. That is normal editor behavior. [getEditedPostAttribute()](../../../../packages/editor/src/store/selectors.js:348) explicitly prefers unsaved edits over the last known saved state, so `currentPost` / entity-record title remaining initial before save is expected. The bug evidence is that one collaborator loses the already-synced unsaved title edit after reload while the other does not.

## Technical Analysis

The latest evidence suggests this failure model:

1. A live collaborative title edit reaches both peers.
2. The post is not saved, so the persisted `_crdt_document` still reflects the initial title.
3. One peer reloads.
4. The reloaded peer bootstraps from the persisted document and the REST-loaded entity record.
5. The pre-reload unsaved title delta is not restored symmetrically to both peers.
6. One page retains the edit, while the other loses it and falls back to the initial title.
7. Live collaboration continues afterward, so later block and title edits still propagate.

This matches the observed state:

- title sync works before reload
- generic content refresh works in a separate control test
- the original synced unsaved title remains on only one page after reload
- the other page loses that title and falls back to the initial title
- the non-reloading page can be the one that regresses, which rules out a simple “the reloaded page forgot its own local state” explanation
- later block edits still sync
- later fresh title edits still sync
- explicit save from a page holding the later dirty title restores convergence and updates the persisted title

That failure shape points away from a general provider failure and toward a title-specific reload/reconciliation bug for pre-existing unsaved title edits. It also makes the false-positive explanation much weaker, because the regression is externally visible on the peer that did not reload.

## How The Bug Was Probably Introduced

### Strongest candidate: `22e067b0243`

`22e067b0243` — `Real-time Collaboration: Use Y.text for title, content and excerpt (#75448)`

This is the strongest candidate because it is the only title-specific change in the candidate set. It changed `title`, `content`, and `excerpt` from plain values to `Y.Text` handling in [packages/core-data/src/utils/crdt.ts](../../../../packages/core-data/src/utils/crdt.ts), including routing title writes through `mergeRichTextUpdate()`.

That is a direct fit for a bug where:

- blocks still work
- generic refresh still works for content
- persisted CRDT still matches
- only the title is stranded as a local edit after reload

### Second candidate: `9375c0e0148`

`9375c0e0148` — `[Real-time Collaboration] Fix sync issue on refresh (#76017)`

This commit clearly touched the right lifecycle family. It changed reload/rejoin setup in [packages/sync/src/manager.ts](../../../../packages/sync/src/manager.ts:293) by initializing the Y.Doc before applying the persisted document.

It is a credible secondary suspect because this bug happens on reload. It is weaker than `22e067b0243`, though, because the observed failure is field-specific rather than a broad document divergence.

### Weakest candidate: `8051e14451c`

`8051e14451c` — `RTC: Fix stale CRDT document persisted on save (#75975)`

This is the weakest candidate because the bug appears before save. The deeper analysis shows that save can repair the visible split, not that save creates it.

## Bottom Line

- Reality assessment: real bug
- Lowest confirmed repro layer: browser/e2e
- False-positive assessment: not a false positive; deeper analysis strengthens the real-bug classification
- Stronger current description: reload loses the already-synced unsaved title on one collaborator, while the room remains live for later block and title edits
- Most likely introduction: `22e067b0243`
- Secondary introduction candidate: `9375c0e0148`
- Current status: active on this checkout, with a stable isolated repro
