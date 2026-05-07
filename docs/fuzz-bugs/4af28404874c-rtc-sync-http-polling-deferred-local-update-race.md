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

Pass 165 re-read the source log, screenshots, error contexts, and Playwright
trace. The trace shows the editor readiness waits completing, normal login,
click, save, reload, toolbar, and keyboard actions, and repeated successful
`POST /wp-json/wp-sync/v1/updates` responses. There are no captured `500`
responses, PHP OOMs, or locator/action failures in the source trace for this
signature.

```bash
rg -n "Error: expect\\(received\\)|Admin was here|betaIdx|Expected: > 2|Received:   1" \
  /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-3/fuzz-handoff/distinct-manifest-20260505/results-refresh-http-shard-3/logs/0014-4af28404874c-rtc-sync-http-polling-oom-due-to-oversized-shared-rooms.log

unzip -p \
  /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-3/fuzz-handoff/distinct-manifest-20260505/results-refresh-http-shard-3/outputs/0014-4af28404874c/playwright-artifacts/test-results/editor-collaboration-colla-61b7f-ge-post-with-diverse-blocks-chromium/trace.zip \
  '*trace.network' |
  rg -n 'wp-sync|"status":500|Fatal error|Allowed memory size|oom' -i
```

Result: the log points directly at semantic convergence assertions, while the
network trace shows healthy `wp-sync` polling traffic and no OOM evidence. This
reclassifies the bucket label as misleading for this refreshed source run.

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

Pass-165 fixed commands:

```bash
npm run test:unit packages/sync/src/test/manager.ts -- --runInBand

npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- \
  --testNamePattern="preserves (concurrent non-overlapping list item moves|list item moves when clients independently initialized)" \
  --runInBand
```

Fixed result: the full `SyncManager` suite passed, 27/27 tests. The two list
move negative controls passed, with the rest of `crdt-blocks.ts` skipped by the
test-name filter.

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

Fresh pass-165 browser execution was blocked by local Docker/wp-env state before
Playwright could start:

```bash
WP_ENV_PORT=9902 \
WP_BASE_URL=http://localhost:9902 \
RTC_MANIFEST_WS_START_PORT=20416 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run wp-env status

WP_ENV_PORT=9902 \
WP_BASE_URL=http://localhost:9902 \
RTC_MANIFEST_WS_START_PORT=20416 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run wp-env start
```

Result: `wp-env status` reported `uninitialized`. `wp-env start` hung in
`docker compose down` for the pass-165 worktree, and read-only `docker ps` /
`docker network ls` calls also hung. The source Playwright trace remains the
browser evidence, and the committed Playwright repro remains the natural-user
regression coverage.

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

## Pass 166 Independent Verification

Pass 166 re-read the refreshed source artifacts rather than relying on the prior
summary. The source test log still fails only on semantic assertions:

- The large-post test missed `Admin was here` after normal editor typing.
- The list-item test kept `Item Beta` before `Item Gamma` after toolbar moves.

Trace parsing found the natural user actions in the source traces:

```text
insertText "Admin was here"
insertText "Editor was here"
click "Item Beta"
click toolbar "Move down"
click "Item Epsilon"
click toolbar "Move up"
```

The same trace parse counted successful `wp-sync` polling responses for the
relevant endpoint: 59 successful `POST /wp-json/wp-sync/v1/updates` responses
in the large-post trace and 28 successful responses in the list-item trace. The
non-2xx entries were expected login/options redirects, cancelled external
Gravatar/admin-ajax requests, and one cancelled polling request during page
transition; there were no `500`, PHP fatal, allowed-memory, or OOM responses.
This keeps the classification as a real RTC convergence defect with a
misleading OOM bucket label.

The focused unit repro was also re-run against the requested known-fixes base
commit `3cba2b1e56a98787de08dc6c7df2434759e8f908` after applying only the
repro test from commit 1. It failed with the stale local field:

```diff
  {
    body: "Remote Body",
+   title: "Initial Title",
  }
```

On the fixed PR branch, pass 166 re-ran:

```bash
npm run test:unit packages/sync/src/test/manager.ts -- \
  --testNamePattern="flushes queued local changes before remote CRDT updates read the edited record" \
  --runInBand

npm run test:unit packages/sync/src/test/manager.ts -- --runInBand

npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- \
  --testNamePattern="preserves (concurrent non-overlapping list item moves|list item moves when clients independently initialized)" \
  --runInBand
```

Results: PASS, PASS, PASS.

The local pass-166 browser attempt on `WP_ENV_PORT=9901` was blocked before
Playwright by host Docker state: `wp-env start` hung in
`docker compose ... down --remove-orphans`, and a read-only `docker ps` call
also hung. This is an environment blocker, not a counterexample to the browser
repro or fix. A fresh pass-166 headless stitched video was generated at:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-166/video/4af28404874c-pass166-annotated.mp4
```

## Pass 167 Verification

Pass 167 rechecked the branch stack against current `origin/trunk`
`19c460ff7c8` and rebased both branches. The PR branch remains the requested
three-commit sequence:

1. `024a3238452 Add RTC deferred update race repro`
2. `c0b0c9bf28e Add RTC stress Playwright repro`
3. `b18fe432b17 Flush RTC updates before remote reconciliation`

The explanation branch was also rebased and keeps this Markdown explanation
under `docs/fuzz-bugs/`.

Pass 167 independently verified the GitHub PR metadata for the origin analysis:

- #75029, `Improve sync performance metrics`, merged as
  `62054e939e02f730302c71be4f5fdc5d37ccfe58` on 2026-02-10. Its body
  explicitly says the change yields to the event loop before updating the CRDT
  document to avoid interrupting interaction events.
- #75975, `RTC: Fix stale CRDT document persisted on save`, merged as
  `8051e14451cf85c5e6713bf2098149f30229e47b` on 2026-03-02. Its body
  explicitly identifies deferred Y.Doc updates via `setTimeout(0)` and fixes
  only the save serialization path.
- #76055, `RTC: Add E2E "stress test" with complex interactions`, merged as
  `503f4f243c20a0d95f2104147fc2a7815d5ff79c` on 2026-03-24. It added the
  large-post and list-item stress workflows that exposed this failure mode.

The source trace was parsed again in pass 167. It shows the normal browser
actions that the test intended:

```text
insertText "Admin was here"
insertText "Editor was here"
click "Item Beta"
click toolbar "Move down"
click "Item Epsilon"
click toolbar "Move up"
```

The HTTP polling evidence is still healthy: 59 successful `wp-sync` update
responses in the large-post trace and 28 in the list-item trace. The only
non-200 `wp-sync` entry is one cancelled large-post polling request during page
transition. No trace evidence points to an OOM, PHP fatal, HTTP 500, readiness
wait, or locator failure.

The pass-167 known-fixes check applied only the commit-1 deterministic
`SyncManager` repro to known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908`. It still failed with the stale
local field being projected back:

```diff
  {
    body: "Remote Body",
+   title: "Initial Title",
  }
```

The rebased fixed branch passed:

```bash
npm run test:unit packages/sync/src/test/manager.ts -- --runInBand

npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- \
  --testNamePattern="preserves (concurrent non-overlapping list item moves|list item moves when clients independently initialized)" \
  --runInBand
```

Results: PASS, 27/27 `SyncManager` tests; PASS, 2 targeted list-move negative
controls with the rest skipped by the name filter.

The pass-167 local browser attempt remained blocked before Playwright:

```bash
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 \
RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run wp-env status

WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 \
RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run wp-env start
```

`wp-env status` reported `Environment not initialized`; `wp-env start` hung in
`docker compose ... down --remove-orphans` for the pass-167 worktree until the
start attempt was terminated. That is a host Docker blocker before browser
startup, not a counterexample to the source Playwright trace or committed
natural-user Playwright repro.

Current build/lint state after the rebase:

```bash
npm run build
npm run clean:package-types && npm run build
npm run lint:js -- \
  packages/sync/src/manager.ts \
  packages/sync/src/test/manager.ts \
  packages/core-data/src/utils/test/crdt-blocks.ts \
  test/e2e/specs/editor/collaboration/collaboration-stress.spec.ts \
  test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts
```

The clean build still fails on unrelated TypeScript contract errors in packages
outside this patch, including `global-styles-ui`, `media-editor`, `editor`,
`lazy-editor`, `boot`, and an existing `core-data/src/utils/crdt-selection.ts`
`@ts-expect-error` line. Scoped lint fails before reaching the changed files
because the symlinked dependency tree cannot resolve `eslint-plugin-jsdoc`.

Pass 167 generated a fresh annotated headless video at:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-167/video/4af28404874c-pass167-annotated.mp4
```

`ffprobe` reports a 1280x720 video, 1050 frames, 35 seconds.

## Pass 168 Practical Impact

Pass 168 rechecked the source result and classifies the real-user likelihood as
`low`.

This is a real product bug, but the normal workflow has several prerequisites:

- Real-time collaboration must be enabled. In the Gutenberg plugin this is an
  early-access setting and is enabled by default when collaboration is allowed,
  but it is still a narrower population than ordinary single-user editing.
- The affected surface is the post editor. Collaboration is disabled on the
  site editor by `gutenberg_inject_real_time_collaboration_setting`.
- The default transport is HTTP polling. Plugins can replace the provider, but
  the source failure and repro use the default `wp-sync` polling provider.
- At least two browser sessions or users must be editing the same post at the
  same time. The source has both a two-user list-item move failure and a
  three-user large-post failure.
- A local edit must be accepted into the WordPress edited record while its
  Y.Doc write is still queued by `setTimeout(0)`, and an incoming remote Yjs
  update must be projected back to the store before that queued write runs.

The fuzz-only parts are the high-concurrency stress choreography, the generated
large 5000-word fixture, and the precise `Promise.all` timing. The ordinary
editor behavior is stronger than the fuzz shape: valid clicks, normal toolbar
Move up/Move down buttons, normal keyboard text insertion, save, reload, and
HTTP polling sync. The deterministic unit repro shows the core race does not
depend on malformed blocks, direct state mutation, artificial transport faults,
or oversized documents.

The blast radius is content/state loss rather than an OOM for this refreshed
source run. A stale local CRDT value can be written back into the editor and
drop a collaborator's unsaved text or leave peers with divergent block/list
order. If the stale projection is saved, the bad state can persist. There is no
evidence in this refreshed trace of duplicate content, repeated HTTP 500s,
process OOM, or a save loop. Recovery is manual: a user can retype the lost
content or use revisions/undo if the loss is noticed before or after save.

Strongest evidence for `low` rather than `very-low`:

- The feature is enabled by default for allowed Gutenberg plugin installs, and
  HTTP polling is the default provider.
- The unit repro needs only one local edit plus one remote update in the
  deferred-write window.
- Polling with active collaborators is periodic, so long editing sessions create
  repeated opportunities for the race.

Strongest evidence against a higher classification:

- Real-time collaboration is explicitly early access and applies to fewer users
  than normal post editing.
- The race window is one event-loop tick, so a single isolated edit is unlikely
  to hit it.
- The source browser failures use stress-style overlapping actions and a large
  generated document to amplify the race.
- Oversized single-document updates have a separate lockout path and are not
  the mechanism here.

The shortest additional experiment that would improve confidence is a
statistical two-user browser loop on the unfixed base: use a small ordinary post
with one shared paragraph, have user A type a marker while user B applies a
remote title/body edit, repeat 100 to 1000 times under the HTTP polling provider,
and record the empirical marker-loss rate with and without a small artificial
server response delay.

Pass 168 refreshed the exact focused known-fixes check. Applying only the
deterministic `SyncManager` repro to known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` still fails:

```diff
  {
    body: "Remote Body",
+   title: "Initial Title",
  }
```

The fixed PR branch still passes the focused repro and the full
`packages/sync/src/test/manager.ts` suite, and the targeted block CRDT
negative controls still pass.

Pass 168 again attempted the requested browser environment on the suggested
port:

```bash
WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 \
RTC_MANIFEST_WS_START_PORT=20416 RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run wp-env status

WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 \
RTC_MANIFEST_WS_START_PORT=20416 RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run wp-env start
```

`wp-env status` reported `Environment not initialized`. `wp-env start` produced
only the npm banner for roughly 70 seconds and hung in the same Docker startup
path as pass 167; the process group was terminated before Playwright was
launched. This is an environment blocker, not a product counterexample.

Pass 168 generated a fresh annotated headless video at:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-168/video/4af28404874c-pass168-annotated.mp4
```

`ffprobe` reports a 1280x720 video, 900 frames, 30 seconds.
