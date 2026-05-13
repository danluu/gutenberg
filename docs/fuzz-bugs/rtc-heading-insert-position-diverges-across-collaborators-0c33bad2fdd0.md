# RTC Heading Insert Position Diverges Across Collaborators

Signature: `0c33bad2fdd0`

## Summary

The fuzz handoff row reports seed `952337` as an HTTP RTC divergence where a collaborator's inserted heading lands at different top-level positions across peers. Earlier passes proved a stale local full-block snapshot can drop the remote H3 on the unpatched May 7 trunk target and that the cache-based stale-snapshot path passes on the synthetic known-fixes base `f256024286dd80a4c0e2579f658c109256abf648`.

Pass 174 found a narrower surviving path: normal `editEntityRecord` calls pass `baseRecord: editedRecord` into the sync manager. In exact `f256024286dd`, `mergeCrdtBlocks()` uses `baseBlocksToSync ? localBlocksToSync : reconcileStaleLocalBlocks(...)`, so the base-record path skips remote top-level insert reconciliation. A focused post-adapter repro fails on exact `f256` by dropping `core/heading:RTC inserted H3` after a stale local edit, then passes on `c8af86c24a5c70784e4604b66b772a0511859a00`, whose minimal fix lets `reconcileStaleLocalBlocks()` use `baseBlocks`.

## Trigger

Natural workflow:

- Gutenberg post editor with RTC enabled over HTTP polling.
- Two tabs or two users collaborate on the same non-empty post.
- The post contains ordinary top-level blocks such as headings, paragraphs, search, and rich text.
- One collaborator inserts a heading at an interior top-level position.
- Another collaborator emits a stale full-block edit based on the older pre-insert block list. This is normal editor plumbing because `packages/core-data/src/actions.js` sends the previous edited record as `baseRecord`.

No malformed block tree or direct browser state mutation is needed for the underlying product state. The exact original browser timing trace is missing, and the refreshed simplified Playwright repro did not reproduce the race.

## Impact

The failure is content/order corruption, not a cursor-only issue. A remote H3 can disappear from the stale peer's block list and derived post content. If the stale peer saves after divergence, the bad order/content can persist. Recovery before persistence is reload/undo; after persistence it requires manual repair or revision restore.

## Evidence

- `likely-real-issues.jsonl:79` records the stable HTTP seed `952337` heading-position divergence.
- `analysis-tier-likely-real-supplement.jsonl:1114` classifies the seed as high-confidence top-level block order divergence after `step 5 insert-heading user 0`.
- Scratch test `crdt-0c33-pass174-base-record.test.ts` fails on exact known-fixes base `f256024286dd`: the received block list omits `core/heading:RTC inserted H3`.
- The same scratch test passes on `c8af86c24a5`.
- The fix diff from `f256` to `c8af` changes `reconcileStaleLocalBlocks()` to accept optional `baseBlocks` and calls it for the `baseBlocksToSync` path before `rebaseYBlocksByClientId()`.

## Pass 175 Audit

Pass 175 reran the focused unit repro on exact `f256024286dd80a4c0e2579f658c109256abf648` and on the PR branch. The exact base still fails by deleting `RTC inserted H3`; the PR branch passes.

The product-path audit is also direct:

- `editEntityRecord()` calls `getSyncManager()?.update(..., { baseRecord: editedRecord, isNewUndoLevel })`.
- `packages/sync/src/manager.ts` forwards `options.baseRecord` to `syncConfig.applyChangesToCRDTDoc()`.
- `applyPostChangesToCRDTDoc()` passes `options.baseRecord.blocks` into `mergeCrdtBlocks()`.
- In exact `f256`, `mergeCrdtBlocks()` chooses `blocksToSync = baseBlocksToSync ? localBlocksToSync : reconcileStaleLocalBlocks(...)`, so the base-record path bypasses stale remote-insert reconciliation.

The remaining gap is browser determinism. The preserved realistic Playwright spec passed 16/16 attempts because it inserts the heading and waits for convergence; it does not make the other collaborator perform a stale full-block edit while their editor record is still behind the CRDT document. A durable UI/video artifact still needs a natural timing harness or the recovered seed `952337` trace.

## Pass 177 Audit

Pass 177 reran the same focused repro. Exact `f256024286dd80a4c0e2579f658c109256abf648` still drops `RTC inserted H3`; `try/rtc-heading-insert-position-diverges-across-collaborators-0c33bad2fdd0-pr` still preserves it.

The practical reachability assessment is narrower than the adapter-level failure:

- Current fetched `origin/trunk` at `84ecc0f1476e14806bba84a30bd2f74b3470f04a` passes only `{ isNewUndoLevel }` to `getSyncManager().update()` and does not pass `baseRecord` through `applyPostChangesToCRDTDoc()`.
- The exact surviving residual therefore applies to the synthetic known-fixes / PR stack that includes the `baseRecord` rebasing work, not to ordinary current-trunk users as of this audit.
- Individual PR head `refs/remotes/pr/77924` introduces the same `baseRecord` path without the later stale-local reconciliation, so the failure is still relevant if that shape lands without the additional `baseBlocks` reconciliation.

Practical likelihood is `very-low` for normal current-trunk Gutenberg use and `low` for testers or future users of the current synthetic/baseRecord RTC stack. The impact remains high when the race is hit because it can turn a concurrent remote heading insert into content/order corruption.

## Pass 178 Audit

Pass 178 splits the evidence into two related merge failures:

- The original no-baseRecord stale-snapshot shape still fails on fetched `origin/trunk` `3f5663559310564284181788a43c756e6ba5816c`. A current-trunk unit replay where one peer inserts an interior H3 and another peer then syncs an older full block list drops `core/heading:RTC inserted H3`.
- Exact known-fixes base `f256024286dd80a4c0e2579f658c109256abf648` fixes that older no-baseRecord stale-snapshot shape; the same replay preserves the H3 there.
- The narrower baseRecord residual still fails on exact `f256`, because `baseBlocksToSync` bypasses `reconcileStaleLocalBlocks()`.
- `try/rtc-heading-insert-position-diverges-across-collaborators-0c33bad2fdd0-pr` still fixes the baseRecord residual.

The practical classification is therefore `low` for broad normal current-trunk Gutenberg use, with higher risk inside active two-user RTC sessions that perform concurrent structural block edits. For the synthetic/baseRecord known-fixes stack, the residual is `low` until the PR branch's `baseBlocks` reconciliation lands. The preserved realistic Playwright spec remains a negative control, not a durable reproduction, because it waits after the insert and never forces the stale-peer full-block edit.

## Pass 179 Audit

Pass 179 rechecked the current line of development and the existing fix artifacts:

- Fetched `origin/trunk` is now `b41e4e944f7852d89ac58ecfd1dc854447173fa2` (`Correct capitalization in help text for Breadcrumbs block (#78175)`).
- The no-baseRecord stale-snapshot replay still fails on that trunk commit. After one peer inserts `core/heading:RTC inserted H3` at an interior top-level position, a second peer's older full-block paragraph edit causes the merged local block list to omit the H3.
- Exact known-fixes base `f256024286dd80a4c0e2579f658c109256abf648` still passes the original no-baseRecord replay but still fails the baseRecord variant by dropping the H3.
- The PR branch head `f2331386480a7152cbb5cfc5853af3f0a8a98801` still passes the baseRecord regression.

The practical classification stays `low` for broad normal Gutenberg use and `medium` only inside active two-user RTC sessions with concurrent structural edits and a stale full-block edit window. The ordinary workflow pieces are common blocks, a heading insertion, and a nearby paragraph edit; the rare part is the ordering in which the stale full-block snapshot reaches the CRDT merge after the remote insert. The preserved Playwright spec remains insufficient as proof of absence because it waits for convergence immediately after insertion and does not create that stale-peer edit.

## Pass 180 Audit

Pass 180 fetched `origin/trunk` again and rechecked the same product boundary on `cb74beb786b366ff69dac328b04861add1a67974` (`Bump node-forge from 1.3.1 to 1.3.2 (#73601)`). No commits between the pass-179 trunk checkpoint and this SHA touched `packages/core-data/src/utils/crdt-blocks.ts`, `packages/core-data/src/utils/crdt.ts`, `packages/core-data/src/actions.js`, or the RTC sync manager files.

The current-trunk no-baseRecord replay still fails on `cb74beb786b`: the stale local full-block edit drops `core/heading:RTC inserted H3` from the merged block list. Exact known-fixes base `f256024286dd80a4c0e2579f658c109256abf648` still passes that original replay, but still fails the baseRecord variant. The PR branch head `f2331386480a7152cbb5cfc5853af3f0a8a98801` still passes the baseRecord regression.

The sharper practical classification remains `low` for broad current-trunk Gutenberg use, not `very-low`, because current trunk still contains the stale full-block merge failure and the source seed was a stable HTTP RTC divergence. It is not `medium` for ordinary use because the preserved natural Playwright replay passed 16/16 attempts and the missing piece is a narrow stale-peer timing window, not just a normal heading insertion. For the exact backlink-aware known-fixes base alone, the original shape is fixed; the remaining risk is the baseRecord residual in that synthetic stack until the PR branch's reconciliation lands.

## Fix Plan

Apply the `c8af86c24a5` reconciliation shape to the active RTC fix stack:

1. Preserve the existing cache-based stale snapshot behavior.
2. When `baseBlocks` is supplied, run the same remote insert/delete reconciliation using that base before the positional merge.
3. Add a regression that drives `applyPostChangesToCRDTDoc()` with `options.baseRecord`, a remote interior H3 insert, and a stale local edit to the anchor paragraph.
4. Keep Playwright coverage separate unless the original seed trace or a deterministic natural stale-base timing harness is recovered.

The main robustness risk is over-preserving remote inserts when the local user intentionally deletes a block. The reconciliation must continue to distinguish remote inserts, remote deletes, and local deletes by comparing previous/base, current CRDT, and incoming local clientIds.
