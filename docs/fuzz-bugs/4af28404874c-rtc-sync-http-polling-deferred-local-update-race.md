# RTC HTTP polling deferred local update race

Bug signature: `4af28404874c`
Bug type label: `rtc_sync_http_polling_oom_due_to_oversized_shared_rooms`
Transport: `http`
Spec: `test/e2e/specs/editor/collaboration/collaboration-stress.spec.ts`

## Classification

The classifier label mentions OOM, but the refreshed source run captured a
semantic synchronization failure, not a process crash:

```json
{"result":"failed","exitCode":1,"timedOut":false,"durationMs":50990}
```

The source log failed after the editor loaded and after normal user actions:

- `three users concurrently edit a large post with diverse blocks` missed a
  typed marker such as `Admin was here` or `Editor was here`.
- `two users concurrently move list items` failed because the moved list item
  order did not converge.

I reran the same refreshed known-fixes shard environment and reproduced the
product failure rather than a readiness, timeout, or setup issue:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-3
WP_BASE_URL=http://localhost:9603 \
WP_ENV_TESTS_PORT=9603 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-stress.spec.ts \
  --project=chromium --workers=1
```

Result: exit code 1. The large-post test again lost one of the concurrent text
markers, and the list-item test again failed the final order assertion. The run
also logged a later permission-denied room unregister, but that occurred after
the editor actions and does not explain the content divergence.

## Repros

### SyncManager unit repro

The deterministic lower-level repro is in
`packages/sync/src/test/manager.ts`. It models the exact ordering that HTTP
polling can expose:

1. The local edited record already contains `title: 'Local Title'`.
2. `SyncManager.update` has queued the local CRDT write for the next timer tick.
3. A remote Yjs update arrives before that timer fires.
4. Remote reconciliation compares the remote Y.Doc against the edited record.

Unfixed command:

```bash
npm run test:unit -- \
  packages/sync/src/test/manager.ts \
  --testNamePattern="flushes queued local changes before remote CRDT updates read the edited record"
```

Unfixed result: FAIL. `editRecord` receives
`{ body: 'Remote Body', title: 'Initial Title' }` instead of only
`{ body: 'Remote Body' }`, proving that a stale local CRDT value can clobber a
local editor change.

Fixed result: PASS.

### Block CRDT negative controls

Commit 1 also includes lower-level list move tests in
`packages/core-data/src/utils/test/crdt-blocks.ts`. Those tests converge when
the same moves are applied directly to Yjs documents, which narrows the source
failure away from the block merge algorithm and toward the sync-manager
scheduling boundary.

Fixed command:

```bash
npm run test:unit -- \
  packages/sync/src/test/manager.ts \
  packages/core-data/src/utils/test/crdt-blocks.ts
```

Fixed result: PASS, 2 suites and 100 tests.

### Playwright repro

Commit 2 adds a narrower natural-user Playwright repro:

```bash
WP_BASE_URL=http://localhost:9910 \
WP_ENV_PORT=9910 \
RTC_MANIFEST_WS_START_PORT=20680 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-stress.spec.ts \
  --project=chromium --workers=1 \
  --grep "two users preserve simultaneous paragraph edits"
```

The test uses a valid large post fixture, opens the normal editor with two
users, saves and refreshes, then has both users type normal text into the same
paragraph. On an unfixed run it failed with `Expected substring:
"Editor was here"` while the received block tree contained only the other
marker. This repro is timing-sensitive, so the unit test is the deterministic
proof and the full stress spec remains useful as a broader regression check.

Fixed full-spec command:

```bash
WP_BASE_URL=http://localhost:9910 \
WP_ENV_PORT=9910 \
RTC_MANIFEST_WS_START_PORT=20680 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-stress.spec.ts \
  --project=chromium --workers=1
```

Fixed result: PASS, all 3 tests.

## Root Cause

`SyncManager.update` is fire-and-forget and was changed to defer local Y.Doc
writes to the next event-loop tick:

```ts
update: debugWrap( yieldToEventLoop( updateCRDTDoc ) ),
```

That creates this race:

1. A normal editor edit updates the WordPress edited entity record.
2. `SyncManager.update` queues the corresponding Y.Doc write with
   `setTimeout(..., 0)`.
3. An HTTP polling response applies a remote update to the same Y.Doc before the
   local timer fires.
4. The Y.Doc observer calls `_updateEntityRecord`.
5. `_updateEntityRecord` reads `handlers.getEditedRecord()` while the local edit
   is in the WordPress store but not yet in the Y.Doc.
6. `getChangesFromCRDTDoc` computes a stale local Y.Doc field as if it were a
   remote change.
7. `handlers.editRecord` writes that stale field back into the editor.

The introducing commit is:

- `62054e939e02f730302c71be4f5fdc5d37ccfe58`, 2026-02-10,
  `Improve sync performance metrics (#75029)`.
  GitHub: `https://github.com/WordPress/gutenberg/pull/75029`.

Local `git show` shows that commit added
`packages/sync/src/performance.ts` and changed `packages/sync/src/manager.ts`.
Local `git blame` attributes both `yieldToEventLoop` and the public
`update: debugWrap( yieldToEventLoop( updateCRDTDoc ) )` line to that commit.
The performance motivation was reasonable, but it removed the happens-before
edge between accepting a local store edit and projecting remote Y.Doc state back
into the store.

A later related commit is:

- `8051e14451cf85c5e6713bf2098149f30229e47b`, 2026-03-03,
  `RTC: Fix stale CRDT document persisted on save (#75975)`.
  GitHub: `https://github.com/WordPress/gutenberg/pull/75975`.

That commit recognized one save-path consequence of deferred local Y.Doc writes
and added a raw next-tick sleep before serializing a persisted CRDT document. It
did not protect the remote observer path, so HTTP polling could still reconcile
against a Y.Doc missing a local write that the manager had already accepted.

The stress coverage that exposed the issue was later added by:

- `503f4f243c20a0d95f2104147fc2a7815d5ff79c`, 2026-03-23,
  `RTC: Add E2E "stress test" with complex interactions (#76055)`.
  GitHub: `https://github.com/WordPress/gutenberg/pull/76055`.

## Initial Fix Plan

- Keep `SyncManager.update` fire-and-forget so callers and typing latency do
  not regress.
- Track queued local CRDT writes inside `createSyncManager`.
- Before remote reconciliation calls `getEditedRecord`, flush the queued local
  writes that the manager already accepted.
- Use the same flush before persisted CRDT serialization, replacing the raw
  next-tick sleep added for saves.

## Plan Audit

Kernel-maintainer robustness lens:

- Removing deferral entirely would be simple but would reintroduce large-update
  input stalls, so the fix should preserve deferred scheduling.
- The queue must be local to the sync manager instance and must not require a
  provider protocol change.
- `update(...): void` should remain unchanged.
- The flush must loop while pending work exists, so writes queued during a wait
  are not skipped.

Jepsen-style distributed-systems correctness lens:

- The important invariant is not immediate network delivery; it is the local
  happens-before relationship from accepted local store edit to local Y.Doc
  write before remote projection reads the edited record.
- Remote updates can still enter Yjs immediately, but projection back into the
  WordPress store must compare against a Y.Doc containing all known local writes.
- The fix should not invent a new conflict policy; it should restore the
  ordering required by the existing CRDT merge logic.

Dan-Luu-style simplicity/performance/failure-mode skepticism lens:

- A counter plus promise chain is enough; a new provider protocol or block-tree
  algorithm would add more failure modes than it removes.
- Continuous typing can make a reconciliation wait through more than one timer
  tick, but each queued write is finite and the wait only happens at
  reconciliation or save boundaries.
- A global queue across all browser state would be harder to reason about; this
  remains scoped to one `SyncManager`.

## Revised Fix Plan

Implement `scheduleUpdateCRDTDoc` and `flushPendingUpdates` in
`packages/sync/src/manager.ts`:

- `scheduleUpdateCRDTDoc` preserves the next-tick deferral, increments a pending
  counter, and chains each timer into a promise.
- `_updateEntityRecord` awaits `flushPendingUpdates()` before reading
  `handlers.getEditedRecord()`.
- `createPersistedCRDTDoc` awaits the same precise flush before serializing.
- The public manager API remains unchanged.

## Verification

Build:

```bash
npm run clean:package-types && npm run build
```

Result: PASS.

Focused unit verification:

```bash
npm run test:unit -- \
  packages/sync/src/test/manager.ts \
  packages/core-data/src/utils/test/crdt-blocks.ts
```

Result: PASS, 2 suites and 100 tests.

Focused Playwright verification:

```bash
WP_BASE_URL=http://localhost:9910 \
WP_ENV_PORT=9910 \
RTC_MANIFEST_WS_START_PORT=20680 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-stress.spec.ts \
  --project=chromium --workers=1 \
  --grep "two users preserve simultaneous paragraph edits"
```

Result: PASS.

Full stress verification:

```bash
WP_BASE_URL=http://localhost:9910 \
WP_ENV_PORT=9910 \
RTC_MANIFEST_WS_START_PORT=20680 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-stress.spec.ts \
  --project=chromium --workers=1
```

Result: PASS, all 3 tests.

Annotated video:

`/Users/danluu/dev/fuzz/gutenberg-bug-4af28404874c/artifacts/fuzz-bug-videos/4af28404874c-rtc-sync-http-polling-repro.mp4`

The video is a headless screenshot stitch from the refreshed known-fixes
Playwright failure artifacts. It shows all three editor screens from the source
failure and a progressive action/observation log.
