# RTC stale local autosave after remote save reload

Bug signature: `d49c30442f02`

Bug type: `rtc_collaboration_stale_local_autosave_after_remote_save_reload`

Transport: HTTP polling

## Conclusion

This is a real RTC/local-autosave race. A collaborator can save a draft while another editor tab has a stale `sessionStorage` local autosave. If the non-saving tab reloads immediately after receiving the collaborator's edit, but before the remote-save refetch/purge path settles, the editor can show the browser-backup restore notice for an older local backup.

The highest-impact path is a user clicking "Restore the backup" after reload. That can roll the editor view back to the stale local backup, omitting the peer's just-saved content. If the user then saves, the stale content can be persisted over the collaborator's saved edit.

## Source Evidence

The handoff manifest row for this signature says:

- `canonicalSignature`: `d49c30442f02`
- `canonicalConfidence`: `medium`
- `canonicalRecommendedAction`: `file_bug`
- `canonicalSummary`: duplicate of `1dc2d26a929c`; remote collaborator save leaves stale local autosave on the non-saving collaborator; reload shows the restore-backup banner; fuzzed save/refresh/sync-fault interleavings escalated to title non-convergence.

The referenced `STATUS.md` artifact path was not present locally during this pass, so this analysis relies on the manifest row, a reconstructed natural-user repro, and code inspection.

## Known-Fixes Base Check

The required known-fixes base was `/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-current-20260507`, branch `rtc-known-fixes-current-20260507`, SHA `f256024286dd80a4c0e2579f658c109256abf648`.

The base manifest says it includes current trunk plus the #77716 backlink-aware RTC fix set, with a caveat that the branch is a buildable synthetic integration and overlapping open RTC PRs were merged best-effort.

Two checks were useful:

1. Settled path: after a peer save, if the non-saving editor waits for the remote-save refetch/purge path to settle, the stale browser backup is cleared. The temporary known-fixes spec passed: `1 passed (1.1m)`.
2. Immediate reload path: if the non-saving editor reloads immediately after peer save, before that path settles, the known-fixes base still shows the backup warning. The failure was `expected count 0, received 2` for `The backup of this post in your browser is different from the version below.`

That narrows the remaining bug to an immediate reload race rather than a permanent failure to purge stale local autosaves.

Pass 172 refreshed both artifact branches onto `origin/trunk`
`114082fd16895304936ddd048e617891ab8f9f48`, which includes #77666
(`RTC: Fix title divergence between users on page refresh after title update`).
That adjacent fix changes CRDT save/reload reconciliation in `core-data`, but it
does not add a `pagehide`/`beforeunload` local-autosave flush and does not touch
`LocalAutosaveMonitor`.

Pass 173 refreshed both artifact branches onto current `origin/trunk`
`80699422e63115adf1bd39c4db520575a816e747`
(`Docs: shortcode transforms with wrapped content + rawHandler JSDoc`). That
trunk commit does not touch editor autosave, RTC, or sync code. Pass 173 also
reran the committed repro on current trunk with the fixed ignored editor build
bundle deliberately replaced by the known-fixes build bundle that lacks
`useAutosaveOnPageUnload`; the pre-fix/current-trunk repro failed with
`expected count 0, received 2` for the stale browser-backup notice. Restoring the
fixed bundle and rerunning the PR branch passed.

Pass 174 refreshed both artifact branches onto current `origin/trunk`
`b38f9b4d86d0505199f5efd78c2adf213e428e78`
(`Fix lockfile drift and missing dep from content-types consolidation (#78109)`).
The two trunk commits after pass 173 affect lockfiles/dependencies and PHPStan
types, not editor autosave or RTC sync ordering. Static checks still show no
`useAutosaveOnPageUnload`, `pagehide`, or relevant `beforeunload` hook in
`origin/trunk` or in the required known-fixes base
`f256024286dd80a4c0e2579f658c109256abf648`. Pass 174 reran the same natural
repro at the pre-fix repro commit, again replacing the ignored editor build
bundle with the no-unload known-fixes bundle. It failed at the stale warning
assertion with `expected count 0, received 2`. The rebased PR branch, with the
fixed bundle restored, passed the same test.

Pass 176 refreshed both artifact branches onto current `origin/trunk`
`5fc7223e96b2751c57b6c4ae840bb9e838bee9f0`
(`Classic Block: Use onReplace prop for migration actions (#78113)`). The only
new trunk commit after pass 175 is a Classic block migration change and does not
touch editor autosave, `core-data` save/refetch handling, or RTC sync. A targeted
static check still finds no `useAutosaveOnPageUnload`, `pagehide`, or relevant
`beforeunload` hook in `origin/trunk` or the required known-fixes base
`f256024286dd80a4c0e2579f658c109256abf648` under
`packages/editor/src/components/local-autosave-monitor`,
`packages/editor/src/store`, `packages/core-data/src`, or `packages/sync/src`.
The rebased fixed branch passed the same natural two-user Playwright repro:

`WP_ENV_PORT=10109 WP_BASE_URL=http://localhost:10109 RTC_MANIFEST_WS_START_PORT=22072 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-stale-local-autosave-after-remote-save.spec.ts --project=chromium`

Result after fix: `1 passed (21.0s)`.

Pass 177 refreshed the explanation branch onto current `origin/trunk`
`bf2d0cc1f1e82d0db286f4aa9851f151e407b163`
(`Editor: Refactor 'PostPublishPanel' into function component (#78083)`). The
nine trunk commits after pass 176 do not touch
`packages/editor/src/components/local-autosave-monitor`,
`packages/editor/src/store`, `packages/core-data/src`, `packages/sync/src`,
`test/e2e/specs/editor/collaboration`, or this explanation doc. Targeted static
checks still show that current trunk and the required known-fixes base lack an
editor-local `pagehide`/`beforeunload` flush; the only lifecycle hooks matching
those names are in the HTTP polling sync provider. This pass also sharpened the
practical likelihood assessment: the bug remains `medium` for active RTC
collaboration sessions because the visible-tab HTTP polling path is asynchronous
at a 1-second collaborator interval, and the ordinary background-tab path polls
at 25 seconds. That background path gives a realistic non-fuzz workflow where a
non-saving collaborator can leave the editor tab inactive while another user
saves, return to the tab, and reload/rejoin before the remote-save refetch has
purged or refreshed the stale browser backup.

Pass 178 refreshed both artifact branches onto current `origin/trunk`
`96263113a874ab1fc1668f7bb500c98766e90e76`
(`Dashboard: staging layer for in-progress layout edits (#78071)`). The only
new trunk commits touching the bounded RTC surface since pass 177 are
`569ea262b57` (`e2e tests: use editPost and createNewPost helpers everywhere
(#78170)`) and `939b0ff02a9` (`Add RTC y-websocket-server tests (#78179)`),
and both are collaboration test/fixture changes rather than runtime autosave,
editor-store, `core-data`, or sync-manager changes. A targeted grep still finds
no editor-local `pagehide`/`beforeunload` local-autosave flush in current
`origin/trunk` or in the required known-fixes base
`f256024286dd80a4c0e2579f658c109256abf648`; the matching runtime lifecycle
hooks remain only in the HTTP polling sync provider. Pass 178 also checked the
exact source boundary: current trunk's `LocalAutosaveMonitor` creates stale
restore notices from `sessionStorage`, purges only on local dirty/autosave
transitions, and delegates all local writes to the interval-driven
`AutosaveMonitor`. The fix branch adds the missing unload flush at that boundary
without changing CRDT or remote-save semantics.

Pass 179 refreshed both artifact branches onto current `origin/trunk`
`be37a93529d83d6dbe4f19274357dbbad5cca578`
(`Tools: Remove save-exact from .npmrc (#78196)`). The bounded runtime diff from
pass 178's trunk base through this commit still has no upstream edit to
`LocalAutosaveMonitor`, editor local autosave storage, `core-data`, or the RTC
sync providers that could close this race; the final trunk advance observed
during pass 179 only touched `.npmrc`. After replacing the stale shared
dependency symlink with a local `npm install`, `npm run build -- --skip-types`
completed successfully. The pass-179 pre-fix repro commit
`f267d4d50b3` was rebuilt on current trunk and failed at the stale-warning
assertion with `expected 0, received 2`. The rebased fixed PR branch
`f8e2da42c42` was rebuilt and passed the same natural two-user Playwright repro:
`1 passed (23.7s)`.

## Natural Repro

The committed repro on the PR branch creates a draft post with one paragraph and uses two real browser users in the post editor:

1. Primary editor opens the draft.
2. Collaborator opens the same draft through RTC over HTTP polling.
3. Primary types marker `d49alpha`.
4. The primary browser's normal local-autosave interval writes a sessionStorage backup containing `d49alpha`.
5. Collaborator types marker `d49beta`.
6. Primary receives `d49beta` through RTC and its live block tree contains both markers.
7. The primary `sessionStorage` backup is still stale: it contains `d49alpha` and not `d49beta`.
8. Collaborator saves the draft.
9. Primary reloads immediately.

On trunk and the known-fixes base, this can surface the stale browser-backup restore notice. The repro uses ordinary editor input and save/reload operations. It does not inject malformed blocks, mutate stores directly, synthesize block trees, or introduce artificial network faults.

## Root Cause

The older local autosave monitor is a single-tab safety mechanism. It stores edited title/content/excerpt in `window.sessionStorage` and, on page load, compares that local backup to current edited post attributes. If they differ, it shows:

`The backup of this post in your browser is different from the version below.`

The relevant comparison and restore notice descend from:

- `e99c21244741cba21b9dfab1cc90951b7ed2524f` (2019-09-16), "Editor: Add sessionStorage autosave mechanism (#16490)"
- `95e4f3f06a449b9f8dd44654b5f9443c465ba354` (2020-07-17), "Prevent content loss after refreshing an editor with unsaved auto-draft post (#23928)"

Those commits predate default RTC and assume the local browser backup is a good candidate to restore if it differs from the loaded post.

RTC changed the ordering:

- `8a511c5cced55e1cbbf3cda39340f03f6d356950` (2026-01-14), "Real-time collaboration: Move collaborative editing from experiments to default Gutenberg plugin experience (#74562)"
- `be1c20e213e7d2a2858d6ec92da23268ea0a8127` (2026-01-15), "Real-time collaboration: Refetch entity when it is saved by a peer (#74637)"
- `48ce44dac7981eb730079563a3a2975b89840fac` (2026-01-28), "Real-time collaboration: Add default HTTP polling sync provider (#74564)"

When a peer edit arrives, the non-saving tab's in-memory editor state can be newer than its local sessionStorage backup. When another peer saves, the remote-save signal and refetch/purge are asynchronous. If the user reloads before that asynchronous path clears or refreshes the local backup, the next page load compares the persisted server state against an older browser backup and offers to restore the older backup.

Pass 174 narrowed the exact race boundary:

- `autosave( { local: true } )` writes the current edited `title`, `content`,
  and `excerpt` synchronously through `localAutosaveSet`.
- `LocalAutosaveMonitor` on trunk only calls that local autosave through
  `AutosaveMonitor`'s interval path; it has no page-lifecycle flush.
- A peer save updates the CRDT saved timestamp via `markEntityAsSaved`; the
  non-saving peer observes that remote state and calls `handlers.refetchRecord()`
  asynchronously.
- The local autosave purge path clears storage only after local save/autosave or
  dirty-state transitions. It is not tied to the remote-save timestamp.

That leaves a real browser lifecycle gap: the editor state can already include
the peer's content while the local `sessionStorage` backup is still the older
interval snapshot.

## Practical Impact

Likelihood: `medium`.

Natural workflow: two users collaboratively edit the same draft in the post editor with RTC enabled over HTTP polling. One user edits, their browser local-autosave interval records a backup, another user edits and saves, then the first user reloads the editor immediately after the peer save. The repro uses a paragraph block, but the local autosave stores serialized post content, so the risk is not paragraph-specific.

Common prerequisites:

- Multiple people or multiple browser sessions editing the same post.
- Browser `sessionStorage` available.
- Normal editor typing, collaborator save, and reload.

Rare or timing-sensitive prerequisites:

- The non-saving tab must have a stale local backup.
- The non-saving tab must reload before the remote-save refetch/purge path catches up.
- HTTP polling makes this easier to see because remote save notification is asynchronous.

Artificial prerequisites from fuzzing:

- The original title non-convergence involved fuzzed save/refresh/sync-fault interleavings.
- The minimized natural repro does not require sync faults or malformed content.

Blast radius:

- Content loss/corruption risk: real if the user clicks "Restore the backup" and then saves; this can omit a peer's just-saved edit.
- Duplicate content risk: possible only as a secondary effect if stale restore replays older serialized content over newer content.
- UI-only inconsistency: the warning itself is a UI inconsistency when the live/server content is newer than the backup.
- Persistence failure: not a save API failure; persistence becomes wrong only if the stale restore is accepted and saved.
- Save loop/performance/OOM risk: not indicated.
- Recovery: avoid clicking restore, use the peer's still-open tab, browser/session backup inspection, or WordPress revisions/autosaves after a bad restore-save.

Strongest evidence for `medium`:

- Reproduces with ordinary post editor actions and a paragraph block.
- Requires no malformed block, direct store mutation, synthetic CRDT state, or network fault.
- The restore notice offers an explicit action that can persist stale content if followed.
- RTC is now a default Gutenberg plugin experience.
- WordPress sets `localAutosaveInterval` to 15 seconds, so the stale local
  backup can be a normal interval-lagged snapshot, not just a millisecond-scale
  scheduler artifact.

Strongest evidence against `high`:

- Requires two active collaborators.
- Requires a reload in a narrow window after peer save and before remote-save refetch/purge settles.
- If the user waits for the settled path, the known-fixes base clears the stale backup.
- The current HTTP polling config in this base polls collaborators every 1
  second, so the remote-save/refetch path usually has a short opportunity to
  clear or supersede the stale backup before a user reloads.

Shortest confidence-improving experiment:

Run the natural repro in a loop with reload delays of 0, 1, 2, and 5 seconds after collaborator save, recording how often the restore notice appears for HTTP polling. That would estimate the real race window and separate likely user exposure from pure scheduler timing.

## Fix Plan

Initial plan considered clearing or suppressing local backups when a remote save is observed. That is risky because remote save observation itself is delayed and because a local backup may contain legitimate local-only edits that are not yet safely represented in the saved entity.

Revised plan:

1. Keep the existing interval-based local autosave behavior.
2. Add a page-unload flush in `LocalAutosaveMonitor`.
3. On `pagehide` and `beforeunload`, if the editor is autosaveable and either dirty or already has a local backup, call `autosave( { local: true } )`.

This makes the browser backup match the current in-memory editor state at the reload boundary. In the repro, the live editor state already contains both local and peer edits; the stale backup is the only lagging piece.

## Robustness Audit

Kernel-maintainer-style audit:

- The change is local to `packages/editor/src/components/local-autosave-monitor/index.js`.
- The handlers are registered and unregistered through React effect cleanup.
- The handler is guarded by `isEditedPostAutosaveable()`.
- It avoids creating a new local backup for a clean editor with no existing backup.
- Duplicate `pagehide` and `beforeunload` events are idempotent because the same current editor state is written.

Jepsen-style distributed-systems audit:

- The fix does not claim the server accepted anything.
- It does not alter CRDT merge semantics, sync transport ordering, or peer-save metadata.
- It preserves the latest local view at the crash/reload boundary, which is the state the user actually saw before reloading.
- It avoids treating an asynchronously observed remote save as proof that every local backup is obsolete.

Simplicity/performance/failure-mode audit:

- One small hook, no new storage schema, no new timers, no server round trip.
- Work is limited to a synchronous sessionStorage local autosave at unload, only when needed.
- Storage failure behavior remains under the existing sessionStorage support gate.
- The main residual risk is browser unload behavior: some browsers constrain unload work, but this path only performs a small local storage write and does not depend on async network I/O.

## Branches

Explanation branch:

`try/rtc-collaboration-stale-local-autosave-after-remote-save-r-d49c30442f02`

PR branch:

`try/rtc-collaboration-stale-local-autosave-after-remote-save-r-d49c30442f02-pr`

PR branch commits:

1. `31de34797b9` - empty commit documenting why no lower-level non-Playwright repro honestly exercises the browser/page lifecycle race.
2. `f2df55de25f` - natural two-user Playwright repro.
3. `0013f4074b6` - page-unload local autosave flush fix.

## Verification

Repro before fix:

`WP_ENV_PORT=10109 WP_BASE_URL=http://localhost:10109 RTC_MANIFEST_WS_START_PORT=22072 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-stale-local-autosave-after-remote-save.spec.ts --project=chromium`

Result before fix: failed at the stale backup warning assertion, `expected count 0, received 2`.

After fix:

`WP_ENV_PORT=10109 WP_BASE_URL=http://localhost:10109 RTC_MANIFEST_WS_START_PORT=22072 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-stale-local-autosave-after-remote-save.spec.ts --project=chromium`

Result after fix: `1 passed (22.1s)`.

Pass 172 rebase verification on current `origin/trunk`
`114082fd16895304936ddd048e617891ab8f9f48`:

`WP_ENV_PORT=10109 WP_BASE_URL=http://localhost:10109 RTC_MANIFEST_WS_START_PORT=22072 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-stale-local-autosave-after-remote-save.spec.ts --project=chromium`

Result after fix: `1 passed (24.6s)`.

Pass 173 rebase verification on current `origin/trunk`
`80699422e63115adf1bd39c4db520575a816e747`:

`WP_ENV_PORT=10109 WP_BASE_URL=http://localhost:10109 RTC_MANIFEST_WS_START_PORT=22072 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-stale-local-autosave-after-remote-save.spec.ts --project=chromium`

Result after fix: `1 passed (22.1s)`.

Pass 173 pre-fix/current-trunk verification used the repro commit
`c8a4964689b` and temporarily replaced ignored `build/scripts/editor/index.js`
and `index.min.js` with the known-fixes editor build bundle, because the
worktree's ignored build output still contained the fixed unload hook after
switching source commits. With the no-unload build active, the same command
failed at the stale warning assertion:

`expected count 0, received 2` for
`The backup of this post in your browser is different from the version below.`

Pass 174 rebase verification on current `origin/trunk`
`b38f9b4d86d0505199f5efd78c2adf213e428e78`:

`WP_ENV_PORT=10109 WP_BASE_URL=http://localhost:10109 RTC_MANIFEST_WS_START_PORT=22072 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-stale-local-autosave-after-remote-save.spec.ts --project=chromium`

Pre-fix repro commit `089d3db2058`, with ignored editor build output replaced
by the no-unload known-fixes bundle:

`expected count 0, received 2` for
`The backup of this post in your browser is different from the version below.`

Fixed PR branch commit `3f900de8570`, with the fixed editor build bundle
restored:

`1 passed (21.7s)`.

Pass 174 targeted lint:

`npm run lint:js -- packages/editor/src/components/local-autosave-monitor/index.js test/e2e/specs/editor/collaboration/collaboration-stale-local-autosave-after-remote-save.spec.ts`

Result: exit code 0, with four existing `react-hooks/exhaustive-deps` warnings
in `local-autosave-monitor/index.js`.

Pass 176 rebase verification on current `origin/trunk`
`5fc7223e96b2751c57b6c4ae840bb9e838bee9f0`:

`npm run lint:js -- packages/editor/src/components/local-autosave-monitor/index.js test/e2e/specs/editor/collaboration/collaboration-stale-local-autosave-after-remote-save.spec.ts`

Result: exit code 0, with the same four existing
`react-hooks/exhaustive-deps` warnings in `local-autosave-monitor/index.js`.

`git diff --check origin/trunk..HEAD`

Result: exit code 0.

The first pass-176 e2e attempt used the default `.wp-env.json` environment and
failed in global setup because the E2E test plugins were not mounted there. The
test environment was restarted with `npm run wp-env-test -- start`, which uses
`.wp-env.test.json` and mounts `packages/e2e-tests/plugins`; the same e2e command
then passed on the rebased fixed branch.

Pass 178 rebase verification on current `origin/trunk`
`96263113a874ab1fc1668f7bb500c98766e90e76`:

`WP_ENV_PORT=10109 WP_BASE_URL=http://localhost:10109 RTC_MANIFEST_WS_START_PORT=22072 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-stale-local-autosave-after-remote-save.spec.ts --project=chromium`

Result after fix on rebased PR branch `0013f4074b6`: `1 passed (21.9s)`.

`npm run lint:js -- packages/editor/src/components/local-autosave-monitor/index.js test/e2e/specs/editor/collaboration/collaboration-stale-local-autosave-after-remote-save.spec.ts`

Result: exit code 0, with the same four existing
`react-hooks/exhaustive-deps` warnings in `local-autosave-monitor/index.js`.

`git diff --check origin/trunk..HEAD`

Result: exit code 0.

Pass 179 rebase verification on current `origin/trunk`
`be37a93529d83d6dbe4f19274357dbbad5cca578`:

`npm run build -- --skip-types`

Result: exit code 0 after replacing the stale shared `node_modules` symlink
with a local `npm install`.

Pre-fix repro commit `f267d4d50b3`, rebuilt from source:

`WP_ENV_PORT=10109 WP_BASE_URL=http://localhost:10109 RTC_MANIFEST_WS_START_PORT=22072 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-stale-local-autosave-after-remote-save.spec.ts --project=chromium`

Result: failed at the stale warning assertion with `expected 0, received 2`.

Fixed PR branch commit `f8e2da42c42`, rebuilt from source:

`WP_ENV_PORT=10109 WP_BASE_URL=http://localhost:10109 RTC_MANIFEST_WS_START_PORT=22072 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-stale-local-autosave-after-remote-save.spec.ts --project=chromium`

Result: `1 passed (23.7s)`.

`npm run lint:js -- packages/editor/src/components/local-autosave-monitor/index.js test/e2e/specs/editor/collaboration/collaboration-stale-local-autosave-after-remote-save.spec.ts`

Result: exit code 0, with the same four existing
`react-hooks/exhaustive-deps` warnings in `local-autosave-monitor/index.js`.

`git diff --check origin/trunk..HEAD`

Result: exit code 0.

Video run:

`WP_ENV_PORT=10109 WP_BASE_URL=http://localhost:10109 RTC_MANIFEST_WS_START_PORT=22072 RTC_MANIFEST_WS_FIXED_PORT=1 npm exec --workspace @wordpress/e2e-tests-playwright -- wp-scripts test-playwright --config playwright.d49-video.config.ts specs/editor/collaboration/d49c30442f02-video.spec.ts --project=chromium`

Result: `1 passed (24.4s)`. The temporary video-only spec and config were removed after producing the artifact.

Lint:

`npm run lint:js -- packages/editor/src/components/local-autosave-monitor/index.js test/e2e/specs/editor/collaboration/collaboration-stale-local-autosave-after-remote-save.spec.ts`

Result: exit code 0 with four existing `react-hooks/exhaustive-deps` warnings in `local-autosave-monitor/index.js`.

Whitespace:

`git diff --check HEAD~3..HEAD`

Result: exit code 0.

Build caveat:

`npm run build` in the worktree failed because the symlinked known-fixes dependency tree hit theme token generation/dependency issues unrelated to this patch (`[object Object] is not a valid color space`; later direct `wp-build` attempts also missed borrowed build dependencies). For runtime verification, the prebuilt `build/` directory from the known-fixes base was restored and the ignored editor build output was patched locally to match the committed source fix.
