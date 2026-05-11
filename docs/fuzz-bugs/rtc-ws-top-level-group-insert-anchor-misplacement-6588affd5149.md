# RTC WebSocket Top-Level Group Insert Anchor Misplacement

Bug signature: `6588affd5149`

Bug type: `rtc_ws_top_level_group_insert_anchor_misplacement`

## Summary

The archived fuzz manifest describes a real WebSocket RTC ordering split:
one collaborator inserts a top-level Group after a tail Paragraph through the
normal block UI, while another collaborator can materialize that Group at the
front of the top-level list or lose it through a stale full-block snapshot.

The strongest current repro is a lower-level CRDT merge control on the May 7
known-fixes base `f256024286dd80a4c0e2579f658c109256abf648`. It starts from a
normal mixed block list:

1. Paragraph
2. Heading
3. tail Paragraph
4. formatted Paragraph
5. Pullquote

One peer inserts a top-level Group after the tail Paragraph. The other peer
then flushes a stale full-block edit based on the pre-Group block list. The
cache-only stale path preserves the remote Group, but the explicit
`baseRecord.blocks` path in `mergeCrdtBlocks()` bypasses stale-local
reconciliation and drops the Group on `f256`.

## Practical Impact

Real-user likelihood: `low` overall, `medium` within active same-post RTC
co-editing sessions with near-simultaneous edits.

Natural trigger:

- editor surface: post editor
- transport: WebSocket RTC
- block types: Paragraph, Heading, Group, formatted Paragraph, Pullquote
- users: two browser contexts or two users editing the same post
- timing: one user inserts a top-level Group after a tail Paragraph while the
  other user has a stale full-block edit in flight
- save/reload: not needed for live divergence; a later save can persist the
  bad order or missing Group

Common prerequisites are ordinary block insertion, paragraph typing, and mixed
top-level content. Rare prerequisites are active RTC collaboration and the
stale full-block interleaving. Fuzz-specific details include the seed text and
exact block IDs; they are not semantically required.

Blast radius is content/order corruption rather than a cosmetic UI-only issue.
The remote Group can disappear from one replica. If that replica saves, the
missing content can be persisted. There is no evidence here for a save loop,
persistence API failure, OOM, or performance failure.

## Evidence

Manifest row:

- `likely-real-issues.jsonl` row 163 marks the signature high confidence and
  describes the real UI flow `Add after -> /group -> choose Group`.

Archived realistic spec:

- `test/e2e/specs/editor/collaboration/websocket/collaboration-6588affd5149-realistic.spec.ts`
- This spec uses a real Group insertion action, but its oracle is weak because
  it computes `reproduced` only on the error/catch path.

Strict browser negative control:

- Pass 170 added a strict WebSocket spec on the known-fixes base.
- The direct single-writer Group insertion path passed twice on exact `f256`.
- That means the residual issue is narrower than "any Group insert after tail
  fails"; it needs a stale peer edit.

Pass 177 lower-level control:

- Test path on the PR branch:
  `packages/core-data/src/utils/test/crdt-6588-pass177-explicit-base-control.test.ts`
- Exact `f256` result:
  - cache-only stale snapshot path: pass
  - explicit `baseRecord.blocks` stale snapshot path: fail, missing Group
- Follow-up `c8af86c24a5c70784e4604b66b772a0511859a00` result:
  - both paths pass

The failing `f256` diff removes:

```text
group:Seed 954095 step 2 user 0 nested paragraph
```

## Root Cause

The known-fixes base added stale-local reconciliation for top-level block
snapshots. However, exact `f256` handles explicit `baseRecord.blocks` by
setting `blocksToSync` directly to the incoming local blocks:

```ts
const blocksToSync = baseBlocksToSync
	? localBlocksToSync
	: reconcileStaleLocalBlocks( yblocks, localBlocksToSync );
```

Normal synced entity edits pass a base record:

- `packages/core-data/src/actions.js` calls `getSyncManager().update(..., {
  baseRecord: editedRecord, isNewUndoLevel })`
- `packages/sync/src/manager.ts` forwards that base record
- `packages/core-data/src/utils/crdt.ts` passes `baseRecord.blocks` to
  `mergeCrdtBlocks()`

So the explicit-base branch is not a purely artificial test-only path.

The fix is to let `reconcileStaleLocalBlocks()` use explicit base blocks as the
previous local snapshot:

```ts
const previousBlocks =
	baseBlocks ?? previousLocalBlocksCache.get( yblocks );

const blocksToSync = baseBlocksToSync
	? reconcileStaleLocalBlocks( yblocks, localBlocksToSync, baseBlocksToSync )
	: reconcileStaleLocalBlocks( yblocks, localBlocksToSync );
```

## Branches

Explanation branch:

- `try/rtc-ws-top-level-group-insert-anchor-misplacement-6588affd5149`

PR branch:

- `try/rtc-ws-top-level-group-insert-anchor-misplacement-6588affd5149-pr`

The PR branch is intentionally based on the synthetic known-fixes base `f256`,
not plain `origin/trunk`, because the failing branch only exists after the
known-fixes stack has added explicit `baseRecord.blocks` merge plumbing.

## Remaining Gap

The shortest confidence-improving browser experiment is a two-peer WebSocket
loop on exact `f256`: preseed the mixed content, have primary insert the Group
after the tail Paragraph, and have secondary immediately type in the long
Paragraph. Assert both peers retain the Group after the tail, and run enough
attempts to measure the stale-edit timing window.

No durable natural-user Playwright repro for that explicit-base interleaving was
created in pass 177. The existing direct Group-insert Playwright oracle is a
negative control and passes on `f256`.
