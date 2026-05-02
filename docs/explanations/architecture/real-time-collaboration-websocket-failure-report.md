# RTC WebSocket failure report

Date: 2026-05-02

Analysis branch:
`codex/rtc-websocket-failure-analysis-report-20260502`

Fix branch analyzed:
`codex/rtc-websocket-e2e-explanation-20260502-pr` at
`c2f5e5a775e295d86066485c674eac0f6a811a84`

## Scope

This report covers the two real WebSocket-specific RTC failures from the local
WebSocket collaboration suite:

-   #21: same-user unsaved title loss after reload.
-   #24: concurrent list item moves lose one user's move.

The investigation used the handoff repros, the current known-fixes branch,
natural-user Playwright repros, trace instrumentation, repeated focused browser
runs, and non-Playwright unit coverage.

## Summary

The failures were not Yjs convergence bugs. Yjs replicated the operations it was
given. The failures came from Gutenberg converting stale or insufficiently
rebased WordPress entity state into fresh Yjs operations.

For #21, a reload could receive the correct unsaved peer title, but a
resolver-triggered CRDT persistence save was already in flight with the stale
REST title. When the save response returned, `saveEntityRecord()` fed that stale
server response back into `syncManager.update()` as a saved local edit. That
turned the old title into a new collaborative Yjs update and broadcast it to the
other tab.

For #24, there were several layers:

-   The test WebSocket provider originally treated socket open as readiness and
    allowed bootstrap state into room history before peer state was applied.
-   Remote whole-`blocks` updates were reconciled into the editor store while
    delayed local editor-store callbacks could still write an old whole-`blocks`
    value back into the CRDT.
-   A simple same-key suppression guard was too blunt. It could suppress a real
    local move if a remote `blocks` update arrived between selection and the
    delayed CRDT write.
-   Accepting that delayed local move as a raw whole-array replacement was also
    wrong, because it could overwrite the already-applied remote move.
-   The final data loss was fixed by rebasing same-clientId block reorders over
    the current CRDT order using the pre-edit block order as the base.

## Evidence

The known-fixes branch made the two focused repros pass, but isolating the
individual fixes showed different mechanisms:

-   `573b567b8d4` (`Fix RTC title reload reconciliation`) fixed the title reload
    repro but did not fix concurrent list moves.
-   The WebSocket protocol/readiness changes made the focused list-move repro pass
    in short runs, but repeated focused runs still exposed list-move loss.
-   A later `--repeat-each=10` run found `19/20` passing with a Beta-only /
    Epsilon-only list order. After adding a per-key reconciliation version guard,
    another `--repeat-each=10` run still found Epsilon-loss failures. This showed
    that stale-write filtering was necessary but not sufficient; the block reorder
    itself needed a base-aware merge.

Trace logs from the deeper pass:

-   `/tmp/gutenberg-trace-title-summary.log`
-   `/tmp/gutenberg-trace-title-test.log`
-   `/tmp/gutenberg-trace-list-summary.log`
-   `/tmp/gutenberg-trace-list-test.log`
-   `/tmp/gutenberg-trace-ws-server.log`

Headless repro videos:

-   `/tmp/gutenberg-ws-repro-videos/ws-same-user-title-reload-loss.mp4`
-   `/tmp/gutenberg-ws-repro-videos/ws-concurrent-list-item-move-loss.mp4`

## Finding 1: WebSocket readiness was not a sync boundary

The original local WebSocket provider effectively said "connected" when the
socket opened. A joining peer could send or flush local bootstrap state before
it had applied existing room state. The relay also accepted joining state as
room history without validating it against a room document.

That behavior made WebSocket-specific failures much more likely than the HTTP
test setup. HTTP state was serialized through request/response persistence
points. WebSocket state was live, unordered relative to editor bootstrap, and
could let local REST/bootstrap state become room state.

The fixed relay now keeps a room `Y.Doc`, applies updates before storing or
broadcasting them, sends snapshots to joiners, and asks existing peers for
missing state using a Yjs state vector. The fixed provider resolves readiness
only after snapshot or peer-state synchronization, discards queued bootstrap
updates after remote state, and marks the Y.Doc when provider remote state has
already been applied.

## Finding 2: #21 was a stale persistence-save echo

The title loss timeline was:

1. Browser B reloads and initially has the REST title.
2. Browser B receives Browser A's unsaved title through WebSocket state.
3. A resolver-triggered CRDT persistence save, started earlier, still carries
   the stale REST title.
4. The REST save response returns with the stale title.
5. `saveEntityRecord()` calls `syncManager.update()` with the full stale server
   response and `{ isSave: true }`.
6. The CRDT title changes from the unsaved title back to the stale initial title
   and that update is broadcast to Browser A.

The direct fix is not just provider readiness. CRDT-document persistence saves
now pass `__unstableSkipSyncUpdate`, and `saveEntityRecord()` still writes the
save marker but passes an empty change object to `syncManager.update()` for that
save. This preserves save semantics without turning stale REST fields into a
collaborative edit.

## Finding 3: #24 had both stale-write and rebase failures

The list-move failure began as a stale whole-`blocks` echo:

1. User B moves Epsilon up and sends a remote `blocks` update.
2. User A receives that remote update while User A has a delayed local editor
   update pending.
3. If the delayed local update writes User A's old whole-`blocks` array into the
   CRDT, it can erase User B's Epsilon move.

The first guard tracked remote keys while they were being reconciled into the
editor store and filtered local non-save writes for those keys. That fixed the
initial stale echo, but deeper repeated runs found two more issues:

-   The guard had to be armed synchronously from Yjs observer events, before
    `_updateEntityRecord()` awaited `getEditedRecord()`. Otherwise a delayed local
    callback could slip through the await window.
-   The guard could suppress a real user move. In one failing interleaving, User
    B's Epsilon move reached User A after User A selected Beta but before User A's
    delayed Beta CRDT write ran. Suppressing all same-key writes during remote
    reconciliation dropped the real Beta move.

The next fix recorded a per-key remote reconciliation version. A local update
captures the remote versions when it is scheduled. At execution time, same-key
local writes are filtered only if the remote version advanced after scheduling.
That distinguishes stale callbacks from local writes scheduled after remote
reconciliation began.

Repeated runs then showed the remaining fundamental issue: a real local Beta
move scheduled against the old list order still cannot be applied as an
authoritative whole-array replacement after the Epsilon move has already changed
the CRDT. The final fix passes the pre-edit entity record into the scheduled
sync-manager update. `mergeCrdtBlocks()` uses that base block order to rebase
same-clientId reorders over the current CRDT order.

For the failing list case:

-   Base order: `Alpha, Beta, Gamma, Delta, Epsilon, Zeta`
-   Remote current order after Epsilon: `Alpha, Beta, Gamma, Epsilon, Delta, Zeta`
-   Delayed local Beta move relative to base: `Alpha, Gamma, Beta, Delta, Epsilon, Zeta`
-   Rebased order: `Alpha, Gamma, Beta, Epsilon, Delta, Zeta`

## Implementation summary

Transport and provider:

-   `bin/rtc-test-ws-sync-server.mjs` stores room state in a `Y.Doc`, validates
    updates by applying them, sends snapshots, broadcasts `sync-request`, and
    ignores canonical empty Yjs update messages.
-   `packages/e2e-tests/plugins/rtc-websocket-provider/index.js` separates socket
    open from synced readiness, applies snapshots before readiness, waits for peer
    snapshots when needed, discards queued bootstrap messages after remote state,
    and marks provider-applied remote state in Y.Doc metadata.

Sync manager:

-   Observers are attached before provider creation so provider bootstrap updates
    are not missed.
-   Persisted/local bootstrap state is skipped if the provider already applied
    remote state.
-   Remote record keys are tracked synchronously from Yjs observer events.
-   Per-key remote reconciliation versions distinguish stale scheduled writes from
    later local writes.
-   Scheduled updates carry the base edited record so block reorders can be
    rebased.

Core data:

-   CRDT persistence saves use `__unstableSkipSyncUpdate`.
-   `saveEntityRecord()` writes the CRDT save marker without applying stale REST
    response fields when that flag is set.
-   `editEntityRecord()` passes the current edited record as `baseRecord` to the
    sync manager.

Block merge:

-   `mergeCrdtBlocks()` detects same-length, same-unique-clientId reorders.
-   When a base order is available, it rebases the incoming reorder over the
    current Yjs order instead of treating the incoming `blocks` array as an
    authoritative whole-array replacement.
-   If the block arrays do not have the same unique `clientId` set, the code falls
    back to the existing merge behavior.

## Verification

Commands run on the final fix head:

```bash
npm run test:unit -- \
	packages/core-data/src/test/actions.js \
	packages/core-data/src/test/resolvers.js \
	packages/core-data/src/test/entities.js \
	packages/sync/src/test/manager.ts \
	packages/core-data/src/utils/test/crdt-blocks.ts
```

Result: `179 passed`.

```bash
npx wp-build
```

Result: build passed.

```bash
WP_ENV_PORT=8893 WP_ENV_PHPMYADMIN_PORT=9003 \
WP_BASE_URL=http://localhost:8893 \
GUTENBERG_RTC_TEST_WS_PORT=18992 \
npm run test:e2e:rtc-websocket -- --project=chromium \
	test/e2e/specs/editor/collaboration/websocket/collaboration-same-user-title-reload-loss.spec.ts \
	test/e2e/specs/editor/collaboration/websocket/collaboration-stress.spec.ts \
	--grep "keeps an unsaved same-user title|two users concurrently move list items"
```

Result: `2 passed (29.5s)`.

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

Result: `10 passed (56.6s)`.

## Remaining limits

The block rebase is intentionally scoped. It handles reorders when the base,
incoming, and current arrays have the same unique block `clientId` set. It does
not make arbitrary same-key `blocks` edits commute. Concurrent insertions,
deletions, and complex structural edits still need a real operation-level block
CRDT or another per-block causal merge layer.

Full `npm test`, full e2e, and PHP suites were not run. The verification focused
on the two requested WebSocket failures and the non-Playwright core-data/sync
paths that caused them.

## Branches

Analysis report branch:
`codex/rtc-websocket-failure-analysis-report-20260502`

Final fix branch:
`codex/rtc-websocket-e2e-explanation-20260502-pr`

Bug repro branches preserved on `danluu`:

-   `try/ws-same-user-title-reload-loss`
-   `try/ws-concurrent-list-item-move-loss`
