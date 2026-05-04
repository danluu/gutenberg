# RTC WebSocket Collaboration Fix: PR Description Draft

Date: 2026-05-04

Analysis branch:
[`codex/rtc-websocket-failure-analysis-report-20260502`](https://github.com/danluu/gutenberg/tree/codex/rtc-websocket-failure-analysis-report-20260502)

Implementation branch:
[`codex/rtc-websocket-e2e-explanation-20260502-pr`](https://github.com/danluu/gutenberg/tree/codex/rtc-websocket-e2e-explanation-20260502-pr)

Important status correction: this draft should not claim that the current PR
branch fixes five bugs against recent trunk plus all known fixes. That earlier
claim mixed together:

- bugs already fixed by the known-fixes stack tracked around
  [WordPress/gutenberg#77716](https://github.com/WordPress/gutenberg/issues/77716);
- videos generated on older branches;
- browser failures from a worktree whose source commits were present but whose
  built Gutenberg assets were stale or missing.

Under the strict baseline of recent `origin/trunk` plus the known fixes, the
only bug class with valid remaining browser evidence is concurrent list-item
move loss. Even there, the current implementation branch should be treated as a
candidate fix, not a fully validated final fix, because the built comparison
worktree still reproduced the list-move loss once in ten repeats.

## Summary

This branch adds a local RTC WebSocket e2e harness, natural-user Playwright
repros, and candidate fixes for a WebSocket-specific collaboration failure where
two users concurrently move different list items and one move can be lost.

The root cause is not a Yjs convergence bug. Yjs converges on the updates it is
given. The problem is at the Gutenberg entity-store to Yjs boundary:

1. A joining WebSocket peer could be treated as ready before it had crossed a
   real peer-state synchronization boundary.
2. The local relay accepted joining peer state as room history instead of
   maintaining an authoritative room `Y.Doc`.
3. `blocks` changes are synced as a whole entity key, so a delayed local
   editor-store notification can write an older whole-block order back into the
   CRDT after a remote move has already arrived.
4. Applying a delayed local reorder as an authoritative whole-array replacement
   can erase the already-applied remote reorder.

The branch changes the test WebSocket protocol so readiness means "snapshot or
peer-state sync completed", not merely "socket opened". It also carries the
pre-edit entity record into scheduled sync-manager updates so block reorders can
be rebased over the current CRDT order instead of replacing it blindly.

## What Should Be Claimed As Fixed

Strictly, no five-bug claim should be made from the current evidence.

The bug this PR is aimed at is:

**Concurrent list item moves can lose one user's move over the WebSocket RTC
provider.**

Natural repro:

1. Create a list containing `Item Alpha`, `Item Beta`, `Item Gamma`,
   `Item Delta`, `Item Epsilon`, and `Item Zeta`.
2. Open the same post in two browser contexts.
3. Browser A selects `Item Beta` and uses the normal block toolbar
   `Move down` button.
4. Browser B selects `Item Epsilon` and uses the normal block toolbar
   `Move up` button.
5. Expected final order includes both independent moves:
   `Alpha, Gamma, Beta, Epsilon, Delta, Zeta`.
6. Failing runs converge to only one move, for example:
   `Alpha, Gamma, Beta, Delta, Epsilon, Zeta`.

Current evidence:

- historical annotated video:
  `/private/tmp/gutenberg-ws-repro-videos/ws-concurrent-list-item-move-loss.mp4`
- current-baseline-style built comparison failure:
  `/private/tmp/gutenberg-pr-combined-unit-compare/test/e2e/artifacts/test-results/editor-collaboration-colla-fbe1f-oncurrently-move-list-items-chromium-repeat9/trace.zip`
- failure screenshots:
  `/private/tmp/gutenberg-pr-combined-unit-compare/test/e2e/artifacts/test-results/editor-collaboration-colla-fbe1f-oncurrently-move-list-items-chromium-repeat9/test-failed-1.png`
  and
  `/private/tmp/gutenberg-pr-combined-unit-compare/test/e2e/artifacts/test-results/editor-collaboration-colla-fbe1f-oncurrently-move-list-items-chromium-repeat9/test-failed-2.png`

The built comparison worktree was not exact current trunk: it was based on
[`5d968eb9e7e6`](https://github.com/WordPress/gutenberg/commit/5d968eb9e7e6ee92cd50c90774b2d392e6ebf199)
rather than
[`eff36b477eb7`](https://github.com/WordPress/gutenberg/commit/eff36b477eb788b03171f4d4b181f2ec164bc423).
It did, however, serve built `core-data` and `sync` assets with the relevant
known-fixes and WebSocket fix commits. The later exact-current source worktree
at local commit `aa48ddde13a7` had the source changes but not valid built
browser assets, so browser failures from that worktree are not evidence.

## Bugs Not To Claim For This PR

These videos are useful historical provenance, but they are not proof that those
bugs still fail on recent trunk plus known fixes:

- Same-user title reload loss:
  `/private/tmp/gutenberg-ws-repro-videos/ws-same-user-title-reload-loss.mp4`
  and
  `/private/tmp/gutenberg-ws-repro-videos/ws-natural-same-user-title-reload-stale-writeback-loss.mp4`.
  The direct fix is already in the known-fixes stack as `ad82e23fc02`
  (`Fix RTC title reload reconciliation`); the pushed equivalent used in earlier
  analysis is
  [`8a7878eb3b7`](https://github.com/danluu/gutenberg/commit/8a7878eb3b76960be6d23bc93b270cb7a1d59539).
  A built comparison run passed the title reload repro 5/5.
- Duplicate table row content loss:
  `/private/tmp/gutenberg-ws-other-repro-videos-20260504/table-duplicate-row-content-loss.mp4`.
  That video was generated on
  [`220392e83e96`](https://github.com/danluu/gutenberg/commit/220392e83e961a7a81ccd76435427d998cb3c6b0),
  not recent trunk plus known fixes. The known-fixes stack contains table merge
  fixes including `088e143412b` and `a7a8df9ef08`; pushed equivalents used in
  earlier analysis include
  [`5e624175833`](https://github.com/danluu/gutenberg/commit/5e624175833ba12b9ca73ba3b0dedfa35c18769a)
  and
  [`0474b537e1a`](https://github.com/danluu/gutenberg/commit/0474b537e1aa96c538cdb7984ac9f8e461a2a7e3).
- Undo selection metadata applied to the wrong synced entity:
  `/private/tmp/gutenberg-ws-other-repro-videos-20260504/rtc-undo-wrong-synced-entity-side-by-side-annotated.mp4`.
  That video was also generated on `220392e83e96`. The known-fixes stack contains
  [`b0891b76181`](https://github.com/danluu/gutenberg/commit/b0891b7618188de5f80d7564aef03c769aff76ed)
  (`Scope undo metadata handlers to changed entity`) and its regression coverage.
- Same-user content reload divergence was attempted and did not reproduce in the
  saved result:
  `/private/tmp/gutenberg-ws-repro-videos/ws-same-user-content-reload-divergence-result.json`.
- Same-user excerpt reload divergence reproduced historically, but it has not
  been validated as still failing against recent trunk plus known fixes.

Those bugs should be described as already-covered or historical unless a fresh,
built, recent-baseline run proves otherwise.

## Where The Remaining Bug Came From

The list-move bug is the intersection of several earlier RTC design choices.
None of the upstream commits below is individually "bad" in isolation; the
failure appears when WebSocket room membership, editor-store scheduling, and
whole-key block syncing interact.

[`b6989b74039b`](https://github.com/WordPress/gutenberg/commit/b6989b74039b4d6064ba296e77def8fa959ecd66)
from
[#72183](https://github.com/WordPress/gutenberg/pull/72183)
refactored sync provider setup into `createSyncManager`. In the affected path,
provider creation could happen before all record/state observers and persisted
document handling had crossed a stable synchronization boundary.

[`84019935998c`](https://github.com/WordPress/gutenberg/commit/84019935998c16f877e976ad85e84748355d7282)
from
[#72262](https://github.com/WordPress/gutenberg/pull/72262)
improved post-entity CRDT merge logic. The remaining limitation is that block
tree structure is still reconstructed from whole `blocks` arrays rather than
operation-level moves.

[`8a511c5cced5`](https://github.com/WordPress/gutenberg/commit/8a511c5cced55e1cbbf3cda39340f03f6d356950)
from
[#74562](https://github.com/WordPress/gutenberg/pull/74562)
moved collaboration from an experiment to the default Gutenberg plugin
experience, increasing the importance of the RTC lifecycle invariants.

[`001a2561482`](https://github.com/WordPress/gutenberg/commit/001a25614827c855e283ee0623a17762360ae591)
from
[#75437](https://github.com/WordPress/gutenberg/pull/75437)
expanded RTC syncing to post content and the undefined `blocks` value. That made
top-level post block order part of the synced entity state that can be affected
by stale whole-key write-back.

[`2a52cba6add4`](https://github.com/WordPress/gutenberg/commit/2a52cba6add49f42689f95b72b09b59e45ba2ff5)
from
[#75830](https://github.com/WordPress/gutenberg/pull/75830)
and
[`22e3d7f93663`](https://github.com/WordPress/gutenberg/commit/22e3d7f93663d1eab574e49f5840f7d8d7384ed1)
from
[#76311](https://github.com/WordPress/gutenberg/pull/76311)
are part of the persisted CRDT document/meta path. That path is relevant because
reload/bootstrap state can race with live provider state.

[`9c1211ed2b0`](https://github.com/danluu/gutenberg/commit/9c1211ed2b0ac8e0bc3cb4a908d06e7c5ff3863a)
introduced the local WebSocket e2e suite and test relay. Its initial test relay
accepted joining client state as room history and treated socket open as
readiness. That made stale or independently initialized local state easier to
turn into collaborative history.

## Fix Strategy In This Branch

[`c72cbb4a0e8`](https://github.com/danluu/gutenberg/commit/c72cbb4a0e89f14bcb0a794be96a0ce916926760)
(`Fix WebSocket collaboration bootstrap sync`) changes the test WebSocket
provider and relay:

- the relay keeps a room `Y.Doc`;
- incoming updates are applied before they are stored or broadcast;
- joiners exchange Yjs state vectors instead of sending local bootstrap state as
  authoritative room history;
- existing peers can answer `sync-request` with missing state;
- provider readiness waits for snapshot or peer-state synchronization;
- queued local bootstrap updates are discarded when remote provider state has
  already been applied.

[`87a680ece2e`](https://github.com/danluu/gutenberg/commit/87a680ece2e8805693b34f10287f4115ce932e7e)
(`Preserve rebased block fields in RTC merge`) changes the block merge path:

- scheduled sync-manager updates carry the pre-edit entity record as
  `baseRecord`;
- `mergeCrdtBlocks()` detects same-length reorders with the same unique
  `clientId` set;
- the incoming reorder is rebased over the current CRDT order using the base
  order, instead of replacing the current order as a whole array.

For the representative failure:

- base order: `Alpha, Beta, Gamma, Delta, Epsilon, Zeta`
- remote current order after Epsilon moves up:
  `Alpha, Beta, Gamma, Epsilon, Delta, Zeta`
- delayed local Beta move relative to base:
  `Alpha, Gamma, Beta, Delta, Epsilon, Zeta`
- desired rebased order:
  `Alpha, Gamma, Beta, Epsilon, Delta, Zeta`

## Verification

Historical final verification on the implementation branch reported:

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
	--grep "keeps an unsaved same-user title|two users concurrently move list items" \
	--repeat-each=5
```

Result: `10 passed`.

Follow-up validation corrected the scope of that result. The title reload repro
passed 5/5 in a built comparison worktree, so it should not be treated as a
remaining current-baseline bug. The list-move repro still failed 1/10 in that
built comparison worktree, so this PR-description draft should not be used as a
final production PR claim until the list-move repro is rerun successfully against
an exact, freshly built recent-trunk-plus-known-fixes baseline.

## Remaining Risk

This branch is not a general operation-level block CRDT. It handles the observed
same-clientId reorder shape, but concurrent insertions, deletions, nested
structure changes, or mixed reorder-plus-content edits may still need a more
explicit per-block operation model.

Before opening a production PR, rerun the focused WebSocket list-move repro on a
freshly built current trunk plus known-fixes branch, and only claim the bug as
fixed if repeated runs no longer reproduce it.
