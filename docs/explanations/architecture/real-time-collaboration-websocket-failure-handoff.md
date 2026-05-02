# RTC WebSocket Failure Analysis Handoff

This is a handoff for a follow-up agent running in tmux window `0:0`. The goal
is to do a deeper analysis of the real failures discovered while running the
RTC e2e suite through the local WebSocket test provider.

The WebSocket e2e PR-style branch is:

- Branch: `codex/rtc-websocket-e2e-local-20260502`
- Remote: `danluu`
- URL: <https://github.com/danluu/gutenberg/tree/codex/rtc-websocket-e2e-local-20260502>
- Head at time of handoff: `9c1211ed2b0`

The explanation-only branch for the WebSocket test changes is:

- Branch: `codex/rtc-websocket-e2e-explanation-20260502`
- URL: <https://github.com/danluu/gutenberg/blob/codex/rtc-websocket-e2e-explanation-20260502/docs/explanations/architecture/real-time-collaboration-websocket-e2e-test-branch.md>

## User Request For The Follow-Up Agent

Analyze the WebSocket e2e failures in tmux window `0:0`, where Codex is already
running. For each real bug:

1. At every level where a repro is possible, make a repro for the bug, up to and
   including a Playwright repro with natural user actions. Do not rely on
   artificial block objects, injected faults, direct store mutation, synthetic
   CRDT updates, or anything a normal user would not do.
2. In a bug-specific branch forked from `origin/trunk`, named
   `try/<name-relevant-to-bug>`, analyze where the bug came from. Link to
   specific commits and PRs and explain how they introduced the bug. Build a fix
   plan, then audit that plan from the viewpoints of Linus Torvalds, Kyle
   Kingsbury of Jepsen, and Dan Luu. Produce a final plan informed by that
   audit.
3. Check whether the bug is fixed by the current known-fixes branch. Candidate
   branches seen locally/remotely include:
   - `try/fuzz-all-local-known-fixes`
   - `try/fuzz-known-fixes-validation`
   - `try/fuzz-known-issues-fixed-campaign`
   - `danluu/try/fuzz-known-issues-fixed-campaign`
   Verify which is newest before relying on it. If none is usable, make a new
   known-fixes check branch.
4. Make a video of the Playwright repro. Show all relevant screens at once.
   Include a running annotated log that makes clear what actions are happening,
   including key presses, clicks, and the visible bug. Do not open headed browser
   windows that interfere with the user; use Playwright video/screenshot capture
   or stitched screenshots in headless mode. Ensure text does not cover relevant
   UI and does not spill outside the video frame.
5. Make a branch with the same name as the explanation branch but with `-pr`
   appended. That branch should have:
   - one commit for all non-Playwright tests;
   - one commit for the Playwright natural-user repro;
   - one commit for the fix.
6. Push all new branches/artifacts that should be preserved to the `danluu`
   remote only. Do not push to `origin` and do not create a PR.
7. Final response should include:
   - URL to the `.md` bug explanation;
   - URL to the `-pr` branch;
   - full local path to the repro video.

## Important Existing Artifacts

These local files were present during the initial analysis:

- Full broad WebSocket e2e run log:
  `/tmp/gutenberg-ws-e2e-20260502.log`
- Window 4 triage summary:
  `/tmp/gutenberg-ws-e2e-failure-triage.md`
- Focused WebSocket rerun for same-user title:
  `/tmp/gutenberg-ws-rerun-same-user-title.log`
- Focused HTTP control for same-user title:
  `/tmp/gutenberg-http-rerun-same-user-title.log`
- Focused WebSocket rerun for stress tests:
  `/tmp/gutenberg-ws-rerun-stress.log`
- Focused HTTP control for stress tests:
  `/tmp/gutenberg-http-rerun-stress.log`

The broad run reported many failures, but most were not WebSocket-specific
bugs. Window 4's triage reduced the real WebSocket-specific failures to the two
items below.

## Failure Classification From Prior Triage

Real WebSocket-specific failures to analyze deeply:

- `#21`: same-user unsaved title loss after reload.
- `#24`: concurrent list item moves lose one user's move.

Previously suspicious but clean on rerun:

- `#7`
- `#8`
- `#31`

Expected WebSocket-mode mismatches, not primary bugs:

- `#14`: document-size lock behavior is HTTP-polling-specific.
- `#25`: sync-error filter behavior is HTTP-polling-specific.
- `#28`: autosave/sessionStorage expectation differs because WebSocket CRDT
  state restores unsaved content immediately.

Everything else in the broad run was either a baseline HTTP failure or
harness/environment noise.

## Bug 1: Same-User Unsaved Title Loss After Reload

Observed failing test from the broader local suite:

- File in the broader local stack:
  `test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts`
- Test line from prior analysis: around line 169.
- Test name: `keeps an unsaved same-user title in a reloaded browser session`.

Scenario:

1. Create a post with title `RTC same-user reload initial` and initial content.
2. Open the same post in two browser sessions for the same user.
3. In session 1, type title `RTC same-user unsaved title before reload`.
4. Session 2 observes the new title.
5. Session 2 makes a companion content edit and reloads.
6. Expected: both sessions still show the unsaved title.
7. WebSocket result: title reverts to `RTC same-user reload initial`.

Evidence:

- WebSocket focused rerun failed:
  `/tmp/gutenberg-ws-rerun-same-user-title.log`
- HTTP focused control passed this exact test:
  `/tmp/gutenberg-http-rerun-same-user-title.log`
- The HTTP log had unrelated REST/baseline issues in other tests, but this
  same-user unsaved-title case passed under HTTP.

Likely mechanism from prior analysis:

- The WebSocket provider connects and starts observing `ydoc.updateV2` before
  the sync manager has finished local bootstrap and persisted-document handling.
- On socket open, the provider sends a `join` message with
  `Y.encodeStateAsUpdateV2( this.ydoc )`.
- The local relay appends this join state into room history and broadcasts it as
  a normal update.
- On reload, stale REST/bootstrap state can therefore become authoritative
  collaborative state and overwrite the unsaved remote title.

Key code paths to inspect:

- `packages/e2e-tests/plugins/rtc-websocket-provider/index.js`
  - constructor attaches `this.ydoc.on( 'updateV2', this.onDocUpdate )`
  - socket `open` sends `type: 'join'` with full document state
  - incoming snapshots apply updates with `REMOTE_ORIGIN`
  - `onDocUpdate` ignores only `REMOTE_ORIGIN`
- `bin/rtc-test-ws-sync-server.mjs`
  - `handleJoin` pushes `message.state` into `room.updates`
  - `handleJoin` broadcasts join state as a normal `update`
- `packages/sync/src/manager.ts`
  - providers are created before observers, initialization, and persisted CRDT
    application
  - `applyPersistedCrdtDoc` may apply current REST state with
    `LOCAL_SYNC_MANAGER_ORIGIN`
  - remote CRDT updates enqueue async editor-store updates rather than waiting
    for render/store convergence
- `packages/sync/src/providers/http-polling/polling-manager.ts`
  - HTTP uses a state-vector sync-step protocol rather than blindly accepting a
    joining client's whole Y.Doc as room history.

Minimum checks to perform:

- Reproduce on `origin/trunk` plus WebSocket test provider work, using natural
  Playwright actions.
- Check whether known-fixes branches still fail.
- Verify whether suppressing join-state append/broadcast fixes or reduces the
  failure.
- Verify whether delaying WebSocket provider observation/connection until after
  local bootstrap fixes or reduces the failure.
- Verify whether a true Yjs state-vector handshake fixes or reduces the
  failure.

Do not stop at "the local test relay is wrong" unless you can show whether the
same failure mode is impossible in the intended production WebSocket design. The
deep analysis should distinguish:

- bug in the test WebSocket shim;
- bug in sync manager provider lifecycle;
- bug in editor-store reconciliation readiness;
- missing protocol contract that production WebSocket must satisfy.

## Bug 2: Concurrent List Item Moves Lose One User's Move

Observed failing test from the broader local suite:

- File: `test/e2e/specs/editor/collaboration/collaboration-stress.spec.ts`
- Test line from prior analysis: around line 531.
- Test name: `two users concurrently move list items`.

Scenario:

1. Create a post with a list containing:
   `Alpha`, `Beta`, `Gamma`, `Delta`, `Epsilon`, `Zeta`.
2. Open the post in two users' editors.
3. User 1 moves `Beta` down.
4. User 2 moves `Epsilon` up.
5. Expected final order must include both moves:
   - `Beta` appears after `Gamma`.
   - `Epsilon` appears before `Delta`.
6. WebSocket failure: `Beta` remained before `Gamma`; one move was lost.

Evidence:

- WebSocket focused rerun failed:
  `/tmp/gutenberg-ws-rerun-stress.log`
- HTTP focused control passed both stress tests:
  `/tmp/gutenberg-http-rerun-stress.log`
- The repeated-run log for this issue was partly invalid after `wp-env` stopped
  responding on port `8963`, so rely first on the focused logs above.

Likely mechanism from prior analysis:

- The created post did not initially have a persisted `_crdt_document`.
- If two clients independently initialize or reconcile the top-level
  `document.blocks` branch before a canonical shared branch is established,
  later user-visible moves can land on different Yjs array branches.
- Prior local simulation showed that when two docs independently create
  different root arrays, exactly one of the two independent moves tends to be
  visible after merge. When the initial roots converge before the moves, both
  moves survive.

Key code paths to inspect:

- `packages/core-data/src/utils/crdt.ts`
  - post CRDT fields include `blocks`, `content`, and `title`
  - `applyPostChangesToCRDTDoc` uses `mergeCrdtBlocks`
  - `getPostChangesFromCRDTDoc` derives editor changes from CRDT state
- `packages/core-data/src/utils/crdt-blocks.ts`
  - `mergeCrdtBlocks`
  - `reconcileStaleLocalBlocks`
  - nested list item handling via `innerBlocks`
  - duplicate clientId removal
- `packages/sync/src/manager.ts`
  - provider creation before CRDT initialization
  - async `updateEntityRecord` path after remote CRDT updates
- WebSocket provider and relay paths listed in Bug 1.

Minimum checks to perform:

- Add a natural Playwright repro that moves list items using normal UI controls
  or keyboard interactions only.
- Add a pre-move readiness assertion that both users have the same rendered list
  order and, if practical without private internals, the same stable block
  identity information before moves begin.
- Test a variant where `_crdt_document` is persisted before the second user
  joins. If that passes, it strongly supports "edit before canonical CRDT branch"
  as the failure mode.
- Test a variant after suppressing join-state append/broadcast and/or adding a
  state-vector handshake. If the bug disappears, prioritize protocol/lifecycle
  over `mergeCrdtBlocks`.
- Only investigate `mergeCrdtBlocks` as the primary defect if the failure
  persists after proving both users start from the same canonical CRDT branch.

## Protocol And Readiness Hypothesis

The two real failures have a shared shape: the WebSocket shim currently treats a
joining browser's whole local Y.Doc as authoritative room history. The HTTP
polling provider does not do that; it uses state-vector sync steps and queues or
suppresses some updates during bootstrap.

The relevant state holders are:

- REST post record;
- persisted `_crdt_document`;
- relay `room.updates`;
- browser-local Y.Doc;
- editor store/render state.

Current WebSocket waits mostly prove connection/awareness, not full Y.Doc and
editor-store/render convergence. A "connected" status can therefore be too early
for tests that immediately perform conflicting user actions.

The likely fix direction is not just adding longer waits. Prefer a protocol and
lifecycle fix:

- Do not append/broadcast raw `join.state` as normal room history.
- Use a proper Yjs state-vector handshake on join/rejoin.
- Suppress or buffer local bootstrap/persisted-doc updates so they are not sent
  as user edits.
- Consider connecting/observing providers only after local CRDT initialization
  and persisted CRDT application are complete.
- Emit a test-visible "synced" signal only after snapshot/handshake application
  and editor-store reconciliation have reached a meaningful boundary.

## Suggested Branching

Use separate bug branches from `origin/trunk`, not from the WebSocket PR branch:

- `try/ws-same-user-title-reload-loss`
- `try/ws-concurrent-list-item-move-loss`

For the final fix branch requested by the user, use the explanation branch name
with `-pr` appended:

- `codex/rtc-websocket-e2e-explanation-20260502-pr`

Expected commit layout on the final `-pr` branch:

1. Non-Playwright tests.
2. Playwright natural-user repro.
3. Fix.

Push all resulting branches to `danluu`. Do not create PRs.

## Suggested Video Artifact

Use a local artifact directory such as:

`/tmp/gutenberg-ws-repro-videos/`

For each video, show both browser contexts side by side and a visible annotation
panel or log strip with:

- timestamp;
- actor;
- natural UI action;
- expected state;
- observed state.

Do not run headed browsers that interfere with the user's desktop. Use
Playwright video capture, screenshots, or a headless browser plus stitched media.

## Final Response Contract For The Follow-Up Agent

When done, report:

- URL to the pushed Markdown bug explanation file.
- URL to the pushed `-pr` branch.
- Full local path to the repro video.
- Which known-fixes branch was checked and whether it still reproduces.
- Any tests that could not be run, with the reason.
