# RTC WebSocket failure handoff

Date: 2026-05-03

Latest follow-up: 2026-05-04

Analysis branch:
`codex/rtc-websocket-failure-analysis-report-20260502`

Primary fix branch:
`codex/rtc-websocket-e2e-explanation-20260502-pr`

Primary fix commit:
`87a680ece2e8805693b34f10287f4115ce932e7e`

Repository remote for preserved work:
`danluu`

## Current status

The two requested WebSocket-specific RTC failures have been analyzed, reproduced,
fixed on a PR-style branch, documented, and pushed to the `danluu` remote. No PR
has been created.

Follow-up validation on 2026-05-04 found that browser results from
`/private/tmp/gutenberg-latest-known-ws-pr-combined` should not be used as
product-fix evidence because that worktree/container did not have built
`build/scripts/core-data` or `build/scripts/sync` assets. The built comparison
worktree `/private/tmp/gutenberg-pr-combined-unit-compare` did serve the
core-data/sync fixes: the title reload repro passed 5/5 there, while the
concurrent list-item move repro still failed 1/10. Treat title as likely fixed
by the current PR-style branch and list moves as still requiring follow-up
validation/fix work.

The failures were:

-   #21: same-user unsaved title loss after reload.
-   #24: concurrent list item moves lose one user's move.

The analysis branch contains this handoff plus two supporting documents:

-   `docs/explanations/architecture/real-time-collaboration-websocket-failure-analysis.md`
-   `docs/explanations/architecture/real-time-collaboration-websocket-failure-report.md`

Use the analysis file for the detailed trace-level reconstruction. Use the
report for a shorter external summary. Use this handoff to continue the work
operationally.

## Branch map

These branches are pushed to `danluu`:

-   `codex/rtc-websocket-failure-analysis-report-20260502`
    -   Contains the full fix branch history plus the report and this handoff.
    -   Current purpose: preserved analysis branch for another agent.
-   `codex/rtc-websocket-e2e-explanation-20260502-pr`
    -   PR-style implementation branch.
    -   Head: `87a680ece2e8805693b34f10287f4115ce932e7e`.
    -   Contains separate commits for the local WebSocket suite, non-Playwright
        regression coverage, Playwright repros, and the fix.
-   `codex/rtc-websocket-e2e-tests-20260502`
    -   Test-only branch for the local WebSocket suite and Playwright repros.
    -   Head on `danluu`: `cbb630e754f03f0e8f870f1d115617c30f75784d`.
-   `try/ws-same-user-title-reload-loss`
    -   Bug-specific preserved branch for #21.
    -   Preserved at `5d968eb9e7e6ee92cd50c90774b2d392e6ebf199`.
-   `try/ws-concurrent-list-item-move-loss`
    -   Bug-specific preserved branch for #24.
    -   Preserved at `5d968eb9e7e6ee92cd50c90774b2d392e6ebf199`.

The PR-style branch has these commits on top of `origin/trunk`:

```text
77132ffead0 Add local RTC WebSocket e2e suite
cbb630e754f Add WebSocket collaboration Playwright repros
c72cbb4a0e8 Fix WebSocket collaboration bootstrap sync
87a680ece2e Preserve rebased block fields in RTC merge
```

The analysis branch then adds:

```text
6e9c7848997 Add RTC WebSocket failure analysis report
```

This handoff was added after that report commit on the same analysis branch.

## Key files

Implementation and tests:

-   `bin/rtc-test-ws-sync-server.mjs`
-   `packages/e2e-tests/plugins/rtc-websocket-provider/index.js`
-   `packages/sync/src/manager.ts`
-   `packages/sync/src/types.ts`
-   `packages/sync/src/test/manager.ts`
-   `packages/core-data/src/actions.js`
-   `packages/core-data/src/entities.js`
-   `packages/core-data/src/resolvers.js`
-   `packages/core-data/src/test/actions.js`
-   `packages/core-data/src/test/entities.js`
-   `packages/core-data/src/test/resolvers.js`
-   `packages/core-data/src/utils/crdt.ts`
-   `packages/core-data/src/utils/crdt-blocks.ts`
-   `packages/core-data/src/utils/test/crdt-blocks.ts`
-   `test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts`
-   `test/e2e/specs/editor/collaboration/websocket/collaboration-same-user-title-reload-loss.spec.ts`
-   `test/e2e/specs/editor/collaboration/websocket/collaboration-stress.spec.ts`

Analysis docs:

-   `docs/explanations/architecture/real-time-collaboration-websocket-failure-analysis.md`
-   `docs/explanations/architecture/real-time-collaboration-websocket-failure-report.md`
-   `docs/explanations/architecture/real-time-collaboration-websocket-failure-handoff.md`

## Repro artifacts

Headless repro videos created during the investigation:

-   `/private/tmp/gutenberg-ws-repro-videos/ws-same-user-title-reload-loss.mp4`
-   `/private/tmp/gutenberg-ws-repro-videos/ws-natural-same-user-title-reload-stale-writeback-loss.mp4`
-   `/private/tmp/gutenberg-ws-repro-videos/ws-concurrent-list-item-move-loss.mp4`
-   `/private/tmp/gutenberg-ws-unfixed-repro-videos-20260504/ws-bootstrap-title-context.mp4`
-   `/private/tmp/gutenberg-ws-unfixed-repro-videos-20260504/ws-concurrent-list-item-move-loss.mp4`
-   `/private/tmp/gutenberg-ws-other-repro-videos-20260504/table-duplicate-row-content-loss.mp4`
-   `/private/tmp/gutenberg-ws-other-repro-videos-20260504/rtc-undo-wrong-synced-entity-side-by-side-annotated.mp4`

Trace logs from the deeper analysis:

-   `/tmp/gutenberg-trace-title-summary.log`
-   `/tmp/gutenberg-trace-title-test.log`
-   `/tmp/gutenberg-trace-list-summary.log`
-   `/tmp/gutenberg-trace-list-test.log`
-   `/tmp/gutenberg-trace-ws-server.log`

Other useful logs:

-   `/tmp/gutenberg-prefx-ws-video-same-user.log`
-   `/tmp/gutenberg-prefx-ws-video-list-move-repeat.log`
-   `/tmp/gutenberg-final-deeper-focused-e2e.log`
-   `/tmp/gutenberg-final-deeper-ws-server.log`
-   `/tmp/gutenberg-ws-rerun-same-user-title.log`
-   `/tmp/gutenberg-http-rerun-same-user-title.log`
-   `/tmp/gutenberg-ws-rerun-stress.log`
-   `/tmp/gutenberg-http-rerun-stress.log`

Some of these paths are local `/tmp` artifacts rather than repository files. If
they are missing in a fresh environment, regenerate the evidence from the
Playwright repro specs and the trace instrumentation described in the analysis
doc.

## Reproductions

### #21 same-user title reload loss

Spec:

```text
test/e2e/specs/editor/collaboration/websocket/collaboration-same-user-title-reload-loss.spec.ts
```

Natural-user flow:

1. Create a draft titled `RTC same-user reload initial`.
2. Open the same post in two browser contexts as the same WordPress user.
3. In browser A, replace the title with
   `RTC same-user unsaved title before reload`.
4. Confirm browser B observes the unsaved title.
5. In browser B, make a companion paragraph edit and reload.
6. Observe that pre-fix WebSocket runs can replace the unsaved title with the
   old REST title.

Representative pre-fix failure:

```text
Expected: "RTC same-user unsaved title before reload"
Received: "RTC same-user reload initial"
```

### #24 concurrent list item move loss

Spec:

```text
test/e2e/specs/editor/collaboration/websocket/collaboration-stress.spec.ts
```

Focused test name:

```text
two users concurrently move list items
```

Natural-user flow:

1. Create a list with:
   `Item Alpha, Item Beta, Item Gamma, Item Delta, Item Epsilon, Item Zeta`.
2. Open the post in two browser contexts.
3. Before moving, assert both editors render the same list text and list-item
   block identities.
4. Browser A selects `Item Beta` and uses the block toolbar `Move down`.
5. Browser B selects `Item Epsilon` and uses the block toolbar `Move up`.
6. Observe that pre-fix WebSocket runs can lose either independent move.

One representative pre-fix symptom:

```text
Expected betaIdx > gammaIdx
Received betaIdx = 1, gammaIdx = 2
```

## Root cause summary

The failures were stale-authority bugs at the WordPress entity state to Yjs
boundary. They were not Yjs convergence bugs.

For #21:

-   Browser B reloaded with stale REST title state.
-   Browser B did receive browser A's correct unsaved peer title through Yjs.
-   A resolver-triggered CRDT persistence save was still in flight with the
    stale REST title.
-   When that REST save response returned, `saveEntityRecord()` fed the stale
    full server response back into `syncManager.update()` as a saved local edit.
-   That converted the old title into a fresh collaborative Yjs operation and
    broadcast it to browser A.

The direct fix is the `__unstableSkipSyncUpdate` path:

-   `persistCRDTDoc()` passes `{ __unstableSkipSyncUpdate: true }`.
-   `saveEntityRecord()` still marks the synced entity as saved.
-   The save marker is written with `{ isSave: true }`, but the changed fields
    passed into `syncManager.update()` are `{}` instead of the stale REST
    response.

For #24:

-   Local `editEntityRecord()` writes to the sync manager through a delayed
    `yieldToEventLoop( updateCRDTDoc )` path.
-   Remote CRDT changes are reconciled into the editor store through
    `_updateEntityRecord()`.
-   A remote `blocks` update could enter browser A's Y.Doc while browser A still
    had a delayed local whole-`blocks` update pending.
-   The delayed local whole-array update then ran after the remote update and
    collapsed the CRDT back to one user's move.
-   A simple remote-key suppression guard was not enough because it could drop a
    real later local move.
-   The final fix records per-key remote reconciliation versions and carries the
    pre-edit `baseRecord` into the scheduled sync-manager update.
-   `mergeCrdtBlocks()` uses the base order to rebase same-clientId block
    reorders over the current CRDT order.

Transport/lifecycle issues made both failures easier to trigger:

-   The old WebSocket relay accepted `join.state` as authoritative room history.
-   The old provider treated WebSocket open as readiness.
-   Provider creation happened before observers were attached.
-   Local bootstrap/persisted state could be applied or queued before peer state
    was actually synchronized.

The fix establishes these invariants:

-   Joining peers send a Yjs state vector, not authoritative local join state.
-   The relay maintains a room `Y.Doc`, validates updates by applying them, and
    serves snapshots.
-   Existing peers answer `sync-request` with missing state.
-   Provider readiness means snapshot or peer-state synchronization completed.
-   Empty Yjs updates and metadata-only initial state are not treated as usable
    document readiness.
-   If provider remote state has already been applied, persisted/local REST
    bootstrap state is not reapplied over it.
-   Remote keys are marked synchronously while reconciling into the editor store.
-   Delayed same-key local writes are filtered only when a remote reconciliation
    version advanced after the local write was scheduled.

## Verification already run

Final non-Playwright verification:

```bash
npm run test:unit -- \
	packages/core-data/src/test/actions.js \
	packages/core-data/src/test/resolvers.js \
	packages/core-data/src/test/entities.js \
	packages/sync/src/test/manager.ts \
	packages/core-data/src/utils/test/crdt-blocks.ts
```

Result:

```text
179 passed
```

Build:

```bash
npx wp-build
```

Result:

```text
build passed
```

Focused WebSocket e2e:

```bash
WP_ENV_PORT=8893 WP_ENV_PHPMYADMIN_PORT=9003 \
WP_BASE_URL=http://localhost:8893 \
GUTENBERG_RTC_TEST_WS_PORT=18992 \
npm run test:e2e:rtc-websocket -- --project=chromium \
	test/e2e/specs/editor/collaboration/websocket/collaboration-same-user-title-reload-loss.spec.ts \
	test/e2e/specs/editor/collaboration/websocket/collaboration-stress.spec.ts \
	--grep "keeps an unsaved same-user title|two users concurrently move list items"
```

Result:

```text
2 passed (29.5s)
```

Repeated focused WebSocket e2e:

```bash
WP_ENV_PORT=8893 WP_ENV_PHPMYADMIN_PORT=9003 \
WP_BASE_URL=http://localhost:8893 \
GUTENBERG_RTC_TEST_WS_PORT=18992 \
npm run test:e2e:rtc-websocket -- --project=chromium \
	test/e2e/specs/editor/collaboration/websocket/collaboration-same-user-title-reload-loss.spec.ts \
	test/e2e/specs/editor/collaboration/websocket/collaboration-stress.spec.ts \
	--grep "keeps an unsaved same-user title|two users concurrently move list items" \
	--repeat-each=5
```

Result:

```text
10 passed (56.6s)
```

Also run:

```bash
git diff --check
```

Result: clean.

Full `npm test`, full e2e, and PHP suites were not run. The verification was
scoped to the two requested WebSocket failures and the non-Playwright
core-data/sync paths that caused them.

## How to pick this up

Start from a clean worktree. The main user workspace may contain unrelated fuzz
work, so avoid reusing a dirty checkout unless you have checked it carefully.

Fetch the preserved branches:

```bash
git fetch danluu \
	codex/rtc-websocket-failure-analysis-report-20260502 \
	codex/rtc-websocket-e2e-explanation-20260502-pr \
	try/ws-same-user-title-reload-loss \
	try/ws-concurrent-list-item-move-loss
```

Create a local review branch for the implementation:

```bash
git switch -c review/rtc-websocket-fix \
	danluu/codex/rtc-websocket-e2e-explanation-20260502-pr
```

Check environment status before starting WordPress:

```bash
npm run wp-env status
```

Only start wp-env if it is not already running:

```bash
npm run wp-env start
```

If you need the same isolated ports used in the final focused run:

```bash
WP_ENV_PORT=8893 WP_ENV_PHPMYADMIN_PORT=9003 npm run wp-env start
```

Then run the focused verification command from the previous section.

If the focused e2e regresses, inspect these first:

-   provider readiness and snapshot completion in
    `packages/e2e-tests/plugins/rtc-websocket-provider/index.js`;
-   relay room update validation and `sync-request` handling in
    `bin/rtc-test-ws-sync-server.mjs`;
-   remote-key reconciliation tracking in `packages/sync/src/manager.ts`;
-   `__unstableSkipSyncUpdate` handling in `packages/core-data/src/actions.js`
    and `packages/core-data/src/resolvers.js`;
-   base-aware block reorder rebasing in
    `packages/core-data/src/utils/crdt-blocks.ts`.

## Known limits and follow-up work

The fix intentionally handles the observed failure class. It does not implement
a general operation-level block CRDT.

The base-aware block rebase covers same-length reorders where base, incoming,
and current block arrays have the same unique `clientId` set. Concurrent
insertions, deletions, or more complex structural edits can still fall back to
the existing merge behavior. A more complete solution would represent block
structure operations explicitly, for example "move stable block identity after
stable block identity", instead of inferring operations from whole-array
snapshots.

Before proposing this as a production PR, an agent should consider:

-   Running a larger RTC WebSocket e2e repeat, not only the two focused repros.
-   Running full unit suites for `core-data` and `sync`.
-   Checking whether the WebSocket provider protocol should remain test-only or
    be aligned with the production transport contract.
-   Reviewing the `__unstableSkipSyncUpdate` naming and whether a more explicit
    public/internal option name is appropriate.
-   Extending block merge coverage for nested blocks, insertions, deletions, and
    mixed reorder-plus-edit cases.

## Do not lose these details

-   Do not replace the synchronization fix with sleeps. The bug is a missing
    causal boundary, not a timing preference.
-   Do not treat WebSocket open as collaborative readiness.
-   Do not accept a joining peer's local bootstrap state as authoritative room
    history.
-   Do not feed CRDT-document persistence-save REST responses back into synced
    title/content/block fields.
-   Do not filter all same-key local writes during remote reconciliation; that
    drops real local moves scheduled after the remote version was observed.
-   Do not treat the passing focused repros as proof that all concurrent block
    edits commute. The remaining architecture limit is documented above.
