# RTC WebSocket Collaboration: Current Evidence

Date: 2026-05-05

Analysis branch:
[`codex/rtc-websocket-failure-analysis-report-20260502`](https://github.com/danluu/gutenberg/tree/codex/rtc-websocket-failure-analysis-report-20260502)

PR-style implementation branch:
[`codex/rtc-websocket-e2e-explanation-20260502-pr`](https://github.com/danluu/gutenberg/tree/codex/rtc-websocket-e2e-explanation-20260502-pr)

Recent known-fixes comparison branch:
`latest-known-ws-repro-with-tests` at
`052c634f8512ef1657209e034f95e67a60bf546b`.

Current known-fixes-plus-PR local branch:
`latest-known-ws-pr-combined` at
`aa48ddde13a75896b8431467fd0da1236063e1ba`.

## Summary

The latest rebuilt comparison run used recent
[`origin/trunk` `eff36b477eb7`](https://github.com/WordPress/gutenberg/commit/eff36b477eb788b03171f4d4b181f2ec164bc423)
plus the known RTC fixes from `latest-known-ws-repro-with-tests`, rebuilt with
`npm run build -- --skip-types`, and served through the local WebSocket RTC test
provider on port `18991`.

That current-baseline run gives valid user-visible evidence for one bug still
failing after recent trunk plus the known fixes:

- same-user title reload loss/corruption.

The duplicate-table run does still expose a stale internal table attribute on
Browser B, but the original table video was invalid as user-visible evidence:
Browser B's visible table, textboxes, edited post serialization, saved REST
content, and reload all kept `anchor`, `same`, `same` in the direct repro. A
deeper natural follow-up path can make the stale table object worse across
duplicate/reload/edit operations, and `Save draft` can briefly return before
REST raw content reflects a newly inserted row, but the row appeared after a
short poll and was present after publish/front-end view. Treat this as an
internal stale-state bug with follow-up risk, not as a confirmed durable
user-visible table content-loss repro from the current evidence.

The current PR branch also contains a fix for concurrent list-item move loss.
That bug has earlier valid trace-level evidence and a natural-user video, but
the latest current-baseline rerun did not reach the list-order assertion because
the toolbar move click repeatedly detached/timed out. Treat the list result from
that specific rerun as inconclusive, not as a pass.

Undo selection metadata and same-user excerpt reload divergence are not current
PR claims from this rerun. The undo repro passed 5/5 on the current known-fixes
baseline. The excerpt repro completed but did not find the expected bug.

## Latest Current-Baseline Results

Baseline:

- source: `/private/tmp/gutenberg-rerun-defaultws-20260504`;
- branch: `latest-known-ws-repro-with-tests`;
- commit: `052c634f8512ef1657209e034f95e67a60bf546b`;
- trunk base:
  [`eff36b477eb7`](https://github.com/WordPress/gutenberg/commit/eff36b477eb788b03171f4d4b181f2ec164bc423);
- build: `npm run build -- --skip-types`;
- WebSocket relay: default `127.0.0.1:18991`.

Results:

| Repro | Result on recent trunk plus known fixes | Evidence |
| --- | --- | --- |
| Same-user title reload | Failed 5/5 | `/private/tmp/gutenberg-rerun-defaultws-20260504/title-video-source-rerun.log` |
| Duplicate table rows | Internal stale attribute reproduced; direct visible loss disconfirmed | `/private/tmp/gutenberg-table-duplicate-current-diagnostics.json`, `/private/tmp/gutenberg-table-stale-visible-followups.json` |
| Concurrent list-item moves | Inconclusive | `/private/tmp/gutenberg-rerun-defaultws-20260504/list-rerun.log` |
| Undo selection with another synced entity loaded | Passed 5/5 | `/private/tmp/gutenberg-rerun-defaultws-20260504/undo-rerun.log` |
| Same-user excerpt reload divergence | Did not reproduce | `/private/tmp/gutenberg-rerun-defaultws-20260504/excerpt-rerun.log` |

Fresh annotated video for the current-baseline user-visible failure:

- title reload loss:
  `/private/tmp/gutenberg-ws-current-known-fixes-videos-20260505/ws-title-reload-loss-current-known-fixes-trace-repro.mp4`;
- title action log:
  `/private/tmp/gutenberg-ws-current-known-fixes-videos-20260505/ws-title-reload-loss-current-known-fixes-trace-action-log.md`.

Superseded artifacts that should not be cited as current proof:

- `/private/tmp/gutenberg-ws-current-known-fixes-videos-20260505/ws-title-reload-loss-current-known-fixes-annotated.mp4`
  was a stitched still artifact, not an action video;
- `/private/tmp/gutenberg-ws-current-known-fixes-videos-20260505/table-duplicate-row-content-loss-current-known-fixes.mp4`
  asserted table loss from a stale internal value while the visible table
  content was still correct.

Existing list-move videos are still useful for the user-visible failure shape,
but they are not proof from the latest current-baseline rerun:

- `/private/tmp/gutenberg-ws-unfixed-repro-videos-20260504/ws-concurrent-list-item-move-loss.mp4`;
- `/private/tmp/gutenberg-ws-repro-videos/ws-concurrent-list-item-move-loss.mp4`.

## Bugs Fixed By The PR Branch

### 1. Same-user title reload loss/corruption

Natural user flow:

1. Browser A and Browser B open the same post as the same WordPress user.
2. Browser A changes the unsaved post title.
3. Browser B observes the edit, makes a normal edit, reloads, and reconnects.
4. Expected: Browser B keeps Browser A's unsaved title.
5. Actual on the current known-fixes baseline: Browser B either reverts to
   `RTC same-user reload initial initial` or produces duplicated/corrupted title
   text such as `RTC same-user unsunsaveved tittle before reloade before reload`.

Current evidence:

- failed 5/5 in
  `/private/tmp/gutenberg-rerun-defaultws-20260504/title-video-source-rerun.log`;
- fresh trace-derived annotated video:
  `/private/tmp/gutenberg-ws-current-known-fixes-videos-20260505/ws-title-reload-loss-current-known-fixes-trace-repro.mp4`.

How it was introduced:

The bad behavior is a composition bug, not one obviously bad standalone commit.
The relevant mechanisms arrived in these commits:

- [`b6989b74039b`](https://github.com/WordPress/gutenberg/commit/b6989b74039b4d6064ba296e77def8fa959ecd66)
  from [#72183](https://github.com/WordPress/gutenberg/pull/72183)
  introduced the `createSyncManager` lifecycle that owns provider setup,
  Y.Doc creation, remote update observers, and core-data reconciliation.
- [`2a52cba6add4`](https://github.com/WordPress/gutenberg/commit/2a52cba6add49f42689f95b72b09b59e45ba2ff5)
  from [#75830](https://github.com/WordPress/gutenberg/pull/75830)
  moved CRDT document metadata into the state map.
- [`22e3d7f93663`](https://github.com/WordPress/gutenberg/commit/22e3d7f93663d1eab574e49f5840f7d8d7384ed1)
  from [#76311](https://github.com/WordPress/gutenberg/pull/76311)
  replaced the old save-record hook with `persistCRDTDoc()`. That made an
  invisible CRDT-document persistence save run through normal
  `saveEntityRecord()` behavior.
- [`8a511c5cced5`](https://github.com/WordPress/gutenberg/commit/8a511c5cced55e1cbbf3cda39340f03f6d356950)
  from [#74562](https://github.com/WordPress/gutenberg/pull/74562)
  moved collaborative editing from an experiment into the default Gutenberg
  plugin experience, so this lifecycle affected normal plugin usage.

The failing path is: the reloaded page receives fresher peer title state, but a
previously started `persistCRDTDoc()` save returns a stale REST title and normal
`saveEntityRecord()` feeds the full server response back through
`syncManager.update( ..., { isSave: true } )`. That stale REST title is then a
new local Yjs operation, so Yjs correctly replicates the overwrite.

Known fix
[`ad82e23fc02`](https://github.com/danluu/gutenberg/commit/ad82e23fc02da3d697310f04e655895cb2b44774)
(`Fix RTC title reload reconciliation`) added the right save-boundary idea, but
the latest WebSocket run still found a failing same-user title path when combined
with the current WebSocket bootstrap behavior.

The PR fixes this by making CRDT-document persistence saves pass
`__unstableSkipSyncUpdate`, so the save marker can be recorded without applying
stale REST fields to the collaborative document. It also fixes the WebSocket
test provider handshake so a joining/reloading peer is not considered ready
until it has received a real room snapshot or peer-state response.

### 2. Duplicate table row internal stale state

Natural user flow:

1. Browser A inserts a normal Table block through the editor UI.
2. Browser A creates a 3-row, 1-column table.
3. Browser A types `anchor`, `same`, `same`.
4. Expected Browser B table body and block attributes: `anchor`, `same`,
   `same`.
5. Actual on the current known-fixes baseline: Browser B's internal table block
   attributes can be `anchor`, `same`, `null`.

The direct repro is not a valid user-visible table-loss repro. Browser B's
visible table, textboxes, edited post serialization, saved REST content, and
reload all stayed `anchor`, `same`, `same`.

Natural follow-up experiments show the stale object can persist and deepen:
duplicating the stale table creates another table whose internal duplicate row
is `null`; after save/reload, the duplicated table can have internal
`null`, `null`, `null` while still visibly rendering all rows. Editing or
inserting rows through the UI updates visible/editor serialization correctly.
One `Save draft` check returned before REST raw content contained a newly
inserted row, but a short poll later did contain it, and publishing plus the
front-end view also contained it. This is follow-up risk, not current durable
visible data-loss evidence.

Current evidence:

- direct diagnostics:
  `/private/tmp/gutenberg-table-duplicate-current-diagnostics.json`;
- follow-up natural workflow diagnostics:
  `/private/tmp/gutenberg-table-stale-visible-followups.json`;
- screenshots:
  `/private/tmp/gutenberg-table-stale-visible-followups-screenshots/`.

How it was introduced:

The table failure comes from the block-attribute CRDT merge path. The important
upstream changes are:

- [`84019935998c`](https://github.com/WordPress/gutenberg/commit/84019935998c16f877e976ad85e84748355d7282)
  from [#72262](https://github.com/WordPress/gutenberg/pull/72262)
  introduced the post-entity CRDT merge logic and `mergeCrdtBlocks()`.
- [`09a21c64b5b9`](https://github.com/WordPress/gutenberg/commit/09a21c64b5b92c2626bd93065d4a0192eb4fac47)
  from [#76913](https://github.com/WordPress/gutenberg/pull/76913)
  made `core/table` cell attributes schema-aware Yjs structures instead of
  plain replacement values.
- [`a6bfd3e55432`](https://github.com/WordPress/gutenberg/commit/a6bfd3e55432981c7c2cb09190ee77954530b1a5)
  from [#77164](https://github.com/WordPress/gutenberg/pull/77164)
  changed array attribute merging to preserve structure with a left/right sweep.

Those changes were directionally correct, but table rows are array elements
without durable per-row identity. When two rows have the same text, equality and
left/right array matching can treat distinct rows as interchangeable. In the
WebSocket RTC path, a stale local snapshot can then collapse the duplicated row
and leave the receiving editor missing the third cell's content.

The known-fixes branch already contains table-specific attempts to close this:

- [`088e143412b`](https://github.com/danluu/gutenberg/commit/088e143412bb267fa1798f25e9121ab636f9e5f4)
  (`Fix table query array identity in RTC merge`);
- [`a7a8df9ef08`](https://github.com/danluu/gutenberg/commit/a7a8df9ef088537aacdee5124a0b7286892a1217)
  (`Preserve duplicate table row identity in RTC merges`);
- [`76690ee33f3`](https://github.com/danluu/gutenberg/commit/76690ee33f3f7c41447e6c8ecf03db428574a579)
  (`Preserve remote table edits from stale local snapshots`).

The latest current-baseline run shows those known fixes are still not enough for
the WebSocket duplicate-row repro. The PR's broader stale-snapshot guard carries
the pre-edit `baseRecord` through the scheduled sync-manager update and avoids
rewriting attributes that match the base snapshot. That is the same missing
causal information needed for both stale table snapshots and stale block-order
snapshots.

### 3. Concurrent list-item moves lose one user's move

Natural user flow:

1. Create a list containing `Item Alpha`, `Item Beta`, `Item Gamma`,
   `Item Delta`, `Item Epsilon`, and `Item Zeta`.
2. Browser A selects `Item Beta` and clicks the normal toolbar `Move down`
   button.
3. Browser B selects `Item Epsilon` and clicks the normal toolbar `Move up`
   button.
4. Expected final order includes both moves:
   `Alpha, Gamma, Beta, Epsilon, Delta, Zeta`.
5. Failing historical runs converge to only one move, such as
   `Alpha, Gamma, Beta, Delta, Epsilon, Zeta`.

Current evidence status:

- the latest current-baseline list rerun is inconclusive because Playwright
  timed out clicking the natural toolbar move buttons before the order assertion;
- earlier trace-level evidence showed the real failure: a stale whole-`blocks`
  write from one editor overwrote a remote whole-`blocks` move from the other;
- existing videos show the user-visible failure shape, but should not be cited
  as proof from the latest rebuilt current-baseline run.

How it was introduced:

The list bug is the block-order version of the same stale-authority class:

- [`84019935998c`](https://github.com/WordPress/gutenberg/commit/84019935998c16f877e976ad85e84748355d7282)
  from [#72262](https://github.com/WordPress/gutenberg/pull/72262)
  introduced whole-block-array CRDT merging for post entities.
- [`001a2561482`](https://github.com/WordPress/gutenberg/commit/001a25614827c855e283ee0623a17762360ae591)
  from [#75437](https://github.com/WordPress/gutenberg/pull/75437)
  expanded RTC syncing to post `content` and undefined `blocks`, making
  top-level block order part of the synced post state.
- [`b6989b74039b`](https://github.com/WordPress/gutenberg/commit/b6989b74039b4d6064ba296e77def8fa959ecd66)
  from [#72183](https://github.com/WordPress/gutenberg/pull/72183)
  supplied the sync-manager lifecycle where delayed local store writes and
  remote CRDT-to-store reconciliation can overlap.

The old merge path saw arrays, not semantic operations like "move Beta after
Gamma". If Browser A had a delayed local `blocks` snapshot based on the old
order, and Browser B's Epsilon move entered A's Y.Doc first, the later delayed
snapshot could become a new Yjs operation that removed B's move.

The PR fixes this in two layers:

- `Fix WebSocket collaboration bootstrap sync`
  ([`c72cbb4a0e8`](https://github.com/danluu/gutenberg/commit/c72cbb4a0e89f14bcb0a794be96a0ce916926760),
  local known-fixes-plus-PR equivalent `11b02005d6d`) gives the WebSocket relay
  a room Y.Doc, changes join from "publish my local state" to state-vector
  sync, waits for real initial synchronization, and filters stale same-key
  local writes during remote reconciliation.
- `Preserve rebased block fields in RTC merge`
  ([`87a680ece2e`](https://github.com/danluu/gutenberg/commit/87a680ece2e8805693b34f10287f4115ce932e7e),
  local known-fixes-plus-PR equivalent `aa48ddde13a`) carries the pre-edit base
  block order into `mergeCrdtBlocks()` and rebases same-clientId list reorders
  over the current CRDT order.

This is not a full operation-level block CRDT. It handles the observed
same-clientId reorder shape. Concurrent insert/delete plus move, or mixed
same-key structural edits, still need broader design work.

## Not Claimed By This Current PR Evidence

Undo selection metadata applied to the wrong synced entity was previously a
real bug, but the current known-fixes baseline passed the repro 5/5:
`/private/tmp/gutenberg-rerun-defaultws-20260504/undo-rerun.log`.

Same-user excerpt reload divergence was attempted on the current known-fixes
baseline and did not reproduce. The saved repro expected `bugFound` to be true,
but observed false:
`/private/tmp/gutenberg-rerun-defaultws-20260504/excerpt-rerun.log`.

Same-user content reload divergence has historical artifacts, but there is no
fresh current-baseline failure from this pass.

## Verification Needed Before Final PR Claims

Before making a final upstream PR claim, run the fresh known-fixes-plus-PR
branch after a full build and verify:

```bash
npm run build -- --skip-types
WP_BASE_URL=http://localhost:8910 npm run test:e2e:rtc-websocket -- \
	test/e2e/specs/editor/collaboration/websocket/collaboration-same-user-title-reload-loss.spec.ts \
	test/e2e/specs/editor/collaboration/websocket/collaboration-stress.spec.ts \
	--project=chromium \
	--grep "keeps an unsaved same-user title|two users concurrently move list items"
```

The focused table duplicate-row repro used for the latest current-baseline run
currently exists in the rerun worktree, not in the PR-style branch. Carry that
test into the test-only branch before making a table-fix PR claim, then run it
against the known-fixes-plus-PR branch as well.

For the list repro, the test may need a more robust natural-action selector for
the block mover because the latest current-baseline run failed at toolbar-click
time rather than at the list-order assertion.
