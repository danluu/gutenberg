# Real-time Collaboration Title Reload Bug

## Summary

This is a real production-path bug in real-time collaboration.

If two collaborators are editing the same post, and an unsaved title change has already synced to both users, reloading one collaborator can cause the other collaborator to lose that synced unsaved title and fall back to the initial title. The collaboration room itself does not die: later block edits still sync, and later fresh title edits still sync. The bug is specifically that reload fails to preserve or reapply the already-synced unsaved title edit.

The focused repro and analysis live in [test/e2e/specs/editor/collaboration/collaboration-title-reload-repro.spec.ts](../../../../test/e2e/specs/editor/collaboration/collaboration-title-reload-repro.spec.ts).

## User-visible Behavior

Expected behavior:

- User A changes the title.
- User B sees the changed title.
- User A reloads.
- Both users should still see the changed title.

Actual behavior:

- User A changes the title.
- User B sees the changed title.
- User A reloads.
- One of the users falls back to the initial title.
- The other user still shows the unsaved edited title.

In the strongest reproduction, the non-reloading collaborator is the one that regresses. That matters because it rules out a simple explanation like “the reloaded page lost its own local UI state.”

## Why This Is A Real Bug

This does not look like a false positive.

The evidence is:

- The bug reproduces in an isolated git worktree, outside the long-running fuzz harness.
- It does not depend on injected faults or Antithesis.
- The failing scenario is ordinary product behavior: two collaborators, one synced title edit, one reload.
- The regression is visible to the other collaborator, not just to the page that reloaded.
- The issue survives a long bounded wait instead of disappearing after extra polling cycles.

The focused evidence suite in [collaboration-title-reload-repro.spec.ts](../../../../test/e2e/specs/editor/collaboration/collaboration-title-reload-repro.spec.ts) establishes all of the following:

- The minimal repro fails within the normal convergence window.
- A 90-second convergence check still does not restore agreement on the pre-reload unsaved title.
- Before reload, both collaborators show the same unsaved title.
- After one collaborator reloads, the other collaborator can regress back to the initial title without making a local title change.
- After the split, later block edits still sync.
- After the split, later fresh title edits still sync.
- Saving a page holding a later dirty title restores convergence and updates the persisted post.

Control tests in the existing collaboration suite also pass:

- [collaboration-sync.spec.ts](../../../../test/e2e/specs/editor/collaboration/collaboration-sync.spec.ts): `Title changes sync between users`
- [collaboration-refresh.spec.ts](../../../../test/e2e/specs/editor/collaboration/collaboration-refresh.spec.ts): `User A edits are synced to User B after User A refreshes`

That narrows the defect to reload-time reconciliation of an already-synced unsaved title edit. It is not a general title-sync failure, and it is not a general refresh transport failure.

## Minimal Reproduction

1. Create a draft post with a non-empty title and at least one paragraph.
2. Open the post in two collaborative editor sessions.
3. Change the title in one session.
4. Wait until the second session shows the new title.
5. Reload one of the sessions before saving.
6. Wait for reconnect.

Expected result:

- both sessions continue to show the edited title

Actual result:

- one session shows the edited title
- the other session falls back to the initial title

The basic repro command is:

```bash
PATH="$PWD/.tooling/node-v20.19.0-darwin-arm64/bin:$PWD/node_modules/.bin:$PATH" \
npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-title-reload-repro.spec.ts --project=chromium
```

Additional focused checks in the same spec:

```bash
PATH="$PWD/.tooling/node-v20.19.0-darwin-arm64/bin:$PWD/node_modules/.bin:$PATH" \
npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-title-reload-repro.spec.ts --project=chromium --grep "reload divergence persists"
```

```bash
PATH="$PWD/.tooling/node-v20.19.0-darwin-arm64/bin:$PWD/node_modules/.bin:$PATH" \
npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-title-reload-repro.spec.ts --project=chromium --grep "regresses the other collaborator"
```

## Observed State

When the bug reproduces:

- both pages still agree on blocks
- both pages still agree on the persisted `_crdt_document`
- one page has `editedTitle = RTC reload repro synced title`
- the other page has `editedTitle = RTC reload repro initial title`

The more detailed state inspection shows that the page which still has the edited title keeps it as an unsaved edit:

- `entityEditsTitle = RTC reload repro synced title`
- `postEditsTitle = RTC reload repro synced title`

The other page has no corresponding unsaved title edit and falls back to the initial title.

One subtle point matters here: the last saved entity record staying on the initial title before save is normal editor behavior by itself. [getEditedPostAttribute()](../../../../packages/editor/src/store/selectors.js:348) prefers unsaved edits over the last known saved state, so `currentPost` or entity-record title remaining initial before save is not evidence of the bug. The real bug evidence is that one collaborator loses the already-synced unsaved title edit after reload while the other collaborator does not.

## What The Bug Is Not

This bug is not:

- a general collaboration disconnect
- a general refresh failure
- a general title-sync failure
- a stale-saved-record misunderstanding

The post-reload room is still healthy enough to exchange new block updates and new title updates. What fails is preservation of the pre-existing unsaved title edit across the reload boundary.

## Lowest Reproducible Layer

The lowest confirmed repro layer is the real browser/e2e layer.

I could not reduce this to a stable unit or mocked integration test because the failure depends on the interaction of multiple layers that are usually tested separately:

- entity reload through the `core-data` resolver in [packages/core-data/src/resolvers.js](../../../../packages/core-data/src/resolvers.js)
- reload/bootstrap in [packages/sync/src/manager.ts](../../../../packages/sync/src/manager.ts)
- title CRDT translation in [packages/core-data/src/utils/crdt.ts](../../../../packages/core-data/src/utils/crdt.ts)

The most relevant code paths are:

- title writes become `Y.Text` updates in [applyPostChangesToCRDTDoc()](../../../../packages/core-data/src/utils/crdt.ts:173)
- title replay after CRDT updates happens in [getPostChangesFromCRDTDoc()](../../../../packages/core-data/src/utils/crdt.ts:277)
- reload bootstraps the Y.Doc and applies persisted CRDT state in [loadEntity() / _applyPersistedCrdtDoc()](../../../../packages/sync/src/manager.ts:271)

The local browser autosave restore path is not a good explanation here. [packages/editor/src/components/local-autosave-monitor/index.js](../../../../packages/editor/src/components/local-autosave-monitor/index.js:70) requires a restore notice and an explicit click, and this repro does not use that path.

## Technical Interpretation

The best current explanation is:

1. A title edit syncs live to both collaborators.
2. The edit is still unsaved.
3. One collaborator reloads.
4. During reload/bootstrap, the system fails to re-establish the already-synced unsaved title edit symmetrically across both peers.
5. One page retains the edit as an unsaved title change.
6. The other page loses it and falls back to the initial title.
7. The room remains live, so later edits continue to propagate.

That failure shape points to a title-specific reload/reconciliation bug, not to a transport-wide collaboration failure.

## Most Likely Introduction

The strongest introduction candidate is:

- `22e067b0243` — `Real-time Collaboration: Use Y.text for title, content and excerpt (#75448)`

Why this is the strongest candidate:

- It is the only title-specific structural change in the candidate set.
- It changed `title` from a plain value to `Y.Text` handling in [packages/core-data/src/utils/crdt.ts](../../../../packages/core-data/src/utils/crdt.ts).
- It routed title writes through `mergeRichTextUpdate()`, reusing machinery from the rich-text/block path.
- The current bug is specifically about a pre-existing unsaved title edit surviving reload asymmetrically.

There is nearby corroborating history:

- `c977aee732e` — `Fix auto draft bug for Y.text titles (#75560)`

That follow-up does not prove this specific bug, but it does show that the newly introduced `Y.Text` title path was still unstable right after `22e067b0243`.

The strongest alternative candidate is:

- `9375c0e0148` — `[Real-time Collaboration] Fix sync issue on refresh (#76017)`

This is weaker because:

- its stated root cause is transport-generic
- the current bug is title-specific
- after the split, later block edits and later fresh title edits still sync, which is the opposite of the generic broken-refresh transport fixed by `9375c0e0148`

So `9375c0e0148` looks more like a commit that made the refresh path robust enough for this latent title bug to show up reliably, rather than the commit that most likely created the bug.

`8051e14451c` (`RTC: Fix stale CRDT document persisted on save`) is much weaker than either of the above because this bug appears before save, and save can repair the visible split rather than create it.

## Fix Plan

The fix should be structured as a reload-reconciliation fix, not as a generic sync retry or timeout increase.

The expected shape is:

1. Lock in the current regression with the browser repro in [collaboration-title-reload-repro.spec.ts](../../../../test/e2e/specs/editor/collaboration/collaboration-title-reload-repro.spec.ts).
2. Add a narrower automated check around the manager/bootstrap path so the browser test is not the only guardrail.
3. Trace the exact ordering between:
   - persisted CRDT application in [packages/sync/src/manager.ts](../../../../packages/sync/src/manager.ts)
   - entity reload from `core-data`
   - title replay through [getPostChangesFromCRDTDoc()](../../../../packages/core-data/src/utils/crdt.ts:277)
   - local edit application through [applyPostChangesToCRDTDoc()](../../../../packages/core-data/src/utils/crdt.ts:173)
4. Prevent the stale initial entity title from overwriting an already-synced unsaved title during reload/bootstrap.
5. Re-run the focused browser repro plus the existing collaboration refresh/title-sync tests to confirm the fix does not break normal convergence.

The most likely code-level fix is one of these two shapes:

- treat the CRDT title as authoritative for unsaved collaborative state during reload until local entity state has been reconciled
- or make reload detect that the current title edit is already represented in the CRDT and avoid replaying the stale initial entity title back into local state

What should not be done:

- do not fix this by adding sleeps, retries, or a longer convergence timeout
- do not special-case only the exact browser repro sequence
- do not rely on save to repair the split, because the bug is specifically about pre-save collaborative visibility

Minimum verification for a real fix:

- the repro no longer splits after reload
- the non-reloading collaborator no longer regresses
- later block edits still sync
- later fresh title edits still sync
- the existing refresh and title-sync collaboration tests still pass

## Confidence

This is a strongest-evidence introduction call, not a mathematically complete bisect.

I attempted a direct historical check before `9375c0e0148`, but that older revision did not bootstrap RTC cleanly in the current local environment, so it did not provide a clean yes/no result for the title regression itself. Because of that, the introduction judgment is based on:

- isolated behavioral repros
- the exact scope of the candidate diffs
- the fact that the room remains alive after the split
- the fact that the bug is title-specific
- the nearby follow-up fix for another `Y.Text` title issue

## Bottom Line

- Reality assessment: real bug
- False-positive assessment: not a false positive
- Lowest confirmed repro layer: browser/e2e
- Strongest current description: reload loses an already-synced unsaved title on one collaborator, while the room remains live for later block and title edits
- Most likely introduction: `22e067b0243`
