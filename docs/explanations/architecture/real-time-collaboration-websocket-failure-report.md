# RTC WebSocket Collaboration: Current Evidence

Date: 2026-05-04

Analysis branch:
[`codex/rtc-websocket-failure-analysis-report-20260502`](https://github.com/danluu/gutenberg/tree/codex/rtc-websocket-failure-analysis-report-20260502)

Implementation branch:
[`codex/rtc-websocket-e2e-explanation-20260502-pr`](https://github.com/danluu/gutenberg/tree/codex/rtc-websocket-e2e-explanation-20260502-pr)

## Summary

The best current evidence points to one remaining WebSocket RTC bug class:
concurrent list item moves can still lose one user's move after applying recent
trunk plus the known RTC fixes.

The current implementation branch adds the local WebSocket e2e harness,
natural-user Playwright coverage, and candidate fixes for that list-move failure.
It should be treated as a candidate/follow-up branch until the list-move repro
passes repeated runs on a freshly built recent-trunk-plus-known-fixes baseline.

The same-user title reload loss, duplicate table row loss, and undo selection
metadata videos are historical evidence from older branches or from bugs already
covered by known fixes. They should not be claimed as current failures without a
fresh built run that reproduces them on recent trunk plus known fixes.

## Current Baselines

Recent `origin/trunk` checked during this pass:

[`eff36b477eb7`](https://github.com/WordPress/gutenberg/commit/eff36b477eb788b03171f4d4b181f2ec164bc423)
(`Editor: Improve revisions diff pairing performance (#77126)`, committed
2026-05-04).

Exact recent-trunk source worktree with known fixes and WebSocket fix source:

`/private/tmp/gutenberg-latest-known-ws-pr-combined` at local commit
`aa48ddde13a7`.

That worktree is useful as a source baseline, but not as browser evidence: its
container did not serve built `core-data` and `sync` assets for the source
changes. Browser failures from that worktree should be ignored until it is
rebuilt.

Built comparison worktree with the relevant known fixes and WebSocket changes:

`/private/tmp/gutenberg-pr-combined-unit-compare` at local commit
`3253125b847f`.

That worktree was based on
[`5d968eb9e7e6`](https://github.com/WordPress/gutenberg/commit/5d968eb9e7e6ee92cd50c90774b2d392e6ebf199)
rather than `eff36b477eb7`, but it did serve built `core-data` and `sync`
assets with the relevant known fixes and WebSocket changes.

Built comparison results:

- same-user title reload repro: passed 5/5;
- concurrent list-item move repro: failed 1/10.

## Current Repro Evidence

The current remaining bug class is:

**Concurrent list item moves can lose one user's move over the WebSocket RTC
provider.**

Natural user flow:

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

Current local evidence:

- historical annotated video:
  `/private/tmp/gutenberg-ws-repro-videos/ws-concurrent-list-item-move-loss.mp4`;
- re-encoded copy of that video:
  `/private/tmp/gutenberg-ws-unfixed-repro-videos-20260504/ws-concurrent-list-item-move-loss.mp4`;
- built comparison failure trace:
  `/private/tmp/gutenberg-pr-combined-unit-compare/test/e2e/artifacts/test-results/editor-collaboration-colla-fbe1f-oncurrently-move-list-items-chromium-repeat9/trace.zip`;
- built comparison screenshots:
  `/private/tmp/gutenberg-pr-combined-unit-compare/test/e2e/artifacts/test-results/editor-collaboration-colla-fbe1f-oncurrently-move-list-items-chromium-repeat9/test-failed-1.png`
  and
  `/private/tmp/gutenberg-pr-combined-unit-compare/test/e2e/artifacts/test-results/editor-collaboration-colla-fbe1f-oncurrently-move-list-items-chromium-repeat9/test-failed-2.png`.

The video is representative of the same user-visible list-move failure, but the
freshest valid current-baseline evidence is the built comparison trace and
screenshots.

## Historical Evidence Not In Current Scope

Same-user title reload loss:

`/private/tmp/gutenberg-ws-repro-videos/ws-same-user-title-reload-loss.mp4`
and
`/private/tmp/gutenberg-ws-repro-videos/ws-natural-same-user-title-reload-stale-writeback-loss.mp4`
show the historical title reload failure. The known-fixes stack contains the
direct fix as `ad82e23fc02` (`Fix RTC title reload reconciliation`); the pushed
equivalent used in earlier analysis is
[`8a7878eb3b7`](https://github.com/danluu/gutenberg/commit/8a7878eb3b76960be6d23bc93b270cb7a1d59539).
The built comparison run passed the title reload repro 5/5.

Duplicate table row content loss:

`/private/tmp/gutenberg-ws-other-repro-videos-20260504/table-duplicate-row-content-loss.mp4`
was generated on
[`220392e83e96`](https://github.com/danluu/gutenberg/commit/220392e83e961a7a81ccd76435427d998cb3c6b0),
not on recent trunk plus known fixes. The known-fixes stack contains table merge
fixes including `088e143412b` and `a7a8df9ef08`; pushed equivalents used in
earlier analysis include
[`5e624175833`](https://github.com/danluu/gutenberg/commit/5e624175833ba12b9ca73ba3b0dedfa35c18769a)
and
[`0474b537e1a`](https://github.com/danluu/gutenberg/commit/0474b537e1aa96c538cdb7984ac9f8e461a2a7e3).

Undo selection metadata applied to the wrong synced entity:

`/private/tmp/gutenberg-ws-other-repro-videos-20260504/rtc-undo-wrong-synced-entity-side-by-side-annotated.mp4`
was also generated on `220392e83e96`. The known-fixes stack contains
[`b0891b76181`](https://github.com/danluu/gutenberg/commit/b0891b7618188de5f80d7564aef03c769aff76ed)
(`Scope undo metadata handlers to changed entity`) and regression coverage.

Same-user content reload divergence:

This was attempted and did not reproduce in the saved result:
`/private/tmp/gutenberg-ws-repro-videos/ws-same-user-content-reload-divergence-result.json`.

Same-user excerpt reload divergence:

This reproduced historically, but has not been validated as still failing on
recent trunk plus known fixes.

## Where The Current Bug Came From

The list-move failure is an interaction between WebSocket room membership,
editor-store scheduling, and whole-key block syncing. None of these upstream
commits is individually wrong in isolation; the bug appears when these design
choices are combined.

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
are part of the persisted CRDT document/meta path. That path matters because
reload/bootstrap state can race with live provider state.

[`9c1211ed2b0`](https://github.com/danluu/gutenberg/commit/9c1211ed2b0ac8e0bc3cb4a908d06e7c5ff3863a)
introduced the local WebSocket e2e suite and test relay. Its initial test relay
accepted joining client state as room history and treated socket open as
readiness. That made stale or independently initialized local state easier to
turn into collaborative history.

## Candidate Fix Strategy

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

- base order: `Alpha, Beta, Gamma, Delta, Epsilon, Zeta`;
- remote current order after Epsilon moves up:
  `Alpha, Beta, Gamma, Epsilon, Delta, Zeta`;
- delayed local Beta move relative to base:
  `Alpha, Gamma, Beta, Delta, Epsilon, Zeta`;
- desired rebased order:
  `Alpha, Gamma, Beta, Epsilon, Delta, Zeta`.

## Verification So Far

Historical verification on the implementation branch reported:

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

Current follow-up evidence is more constrained:

- title reload passed 5/5 in the built comparison worktree;
- list-item moves failed 1/10 in the built comparison worktree;
- the exact current source worktree needs a fresh build before browser evidence
  from it is usable.

## Remaining Work

Do not use this as a final production PR claim until the focused list-move repro
passes repeated runs on a freshly built branch based on recent trunk plus the
known fixes.

This branch is also not a general operation-level block CRDT. It handles the
observed same-clientId reorder shape, but concurrent insertions, deletions,
nested structure changes, or mixed reorder-plus-content edits may still need a
more explicit per-block operation model.
