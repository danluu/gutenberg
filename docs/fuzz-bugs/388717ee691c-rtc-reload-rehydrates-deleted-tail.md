# RTC reload rehydrates deleted top-level paragraph as duplicate tail

Bug signature: `388717ee691c`

Bug type: `rtc_reload_rehydrates_deleted_top_level_paragraph_as_duplicate_tail_after_move`

## Summary

A delayed full-block snapshot from a reloaded RTC peer can combine badly with a
nearby top-level move and delete. The failing shape is ordinary block data:

1. Start with `Long paragraph -> Follow-up heading -> Tail paragraph`.
2. Move the tail paragraph before the heading:
   `Long paragraph -> Tail paragraph -> Follow-up heading`.
3. Delete the long paragraph:
   `Tail paragraph -> Follow-up heading`.
4. Merge a stale reload snapshot carrying the original block list and original
   base.

On the current backlink-aware known-fixes base
`f256024286dd80a4c0e2579f658c109256abf648`, the final CRDT block order becomes:

```text
Tail paragraph -> Follow-up heading -> Tail paragraph
```

The deleted region is therefore rehydrated as duplicate visible content.

## Practical Impact

Real-user likelihood is `low` overall, and `medium` only for active RTC sessions
where a peer reloads or rejoins during nearby structural edits.

The natural workflow is two collaborators or two browser tabs editing the same
post in the post editor with RTC enabled over the HTTP polling transport. The
block types are common top-level paragraph and heading blocks. The common pieces
are block move, block delete, and browser reload/rejoin. The rare pieces are the
timing: a stale full-block snapshot based on the old order must land after the
move/delete sequence, and the corrupted peer must save for the duplicate to
persist.

The blast radius is content corruption, not only a transient UI mismatch. A
deleted paragraph can return as duplicate visible content and be saved. I found
no evidence of a save loop, persistence API failure, performance risk, or OOM
behavior for this signature. Recovery is manual: notice the duplicate, delete it
again, use a still-correct peer, or restore a revision after a bad save.

## Evidence

The handoff manifest row records archived seed `951623` plus watcher reruns with
the same semantic split: the reloaded peer reached
`Tail paragraph -> Follow-up heading -> Tail paragraph`, while the other peer
stayed at `Tail paragraph -> Follow-up heading`. The archived browser artifacts
are not present locally, and the handoff has no runnable natural Playwright spec.

Pass 171 recreated the current-base failure with a focused Jest reduction in a
temporary worktree:

```bash
cd /private/tmp/gutenberg-388717-pass171-knownfix.Tzaydj/repo
npm run test:unit packages/core-data/src/utils/test/crdt-388717ee691c-pass171.test.ts -- --runInBand
```

Result:

```text
Expected: [ "Tail paragraph", "Follow-up heading" ]
Received: [ "Tail paragraph", "Follow-up heading", "Tail paragraph" ]
```

This is below Playwright, but it exercises the product CRDT merge entry point
with normal `Block[]` snapshots and explicit `baseBlocks`. It does not inject
malformed blocks or directly mutate editor state.

Pass 172 moved the same sequence one layer up through
`applyPostChangesToCRDTDoc()` with normal post-record `blocks` changes and
`baseRecord.blocks` snapshots. On the same known-fixes base, the wrapper-level
regression failed with the same result:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-172/work/388717-post-wrapper-knownfix
npm run test:unit packages/core-data/src/utils/test/crdt-388717-post-wrapper-pass172.test.ts -- --runInBand
```

```text
Expected: [ "Tail paragraph", "Follow-up heading" ]
Received: [ "Tail paragraph", "Follow-up heading", "Tail paragraph" ]
```

Cherry-picking the prototype fix commit
`1536fca9720fad8a8f5906cb0711a4b8fd09c101` into that temporary worktree made
the wrapper regression pass. The existing `crdt-blocks.ts` unit suite also
passed in that patched temporary state: 76 tests passed.

## Root Cause

The vulnerable path is `mergeCrdtBlocks()` in
`packages/core-data/src/utils/crdt-blocks.ts`.

The known-fixes stack can rebase by `clientId` when current, base, and incoming
block lists contain the same unique client IDs. This bug falls outside that
case: after the delete, the current CRDT list has two blocks while the stale base
and incoming reload snapshot still have three. `rebaseYBlocksByClientId()` then
returns false, `reorderYBlocksByClientId()` also cannot apply because the lengths
differ, and the fallback positional merge updates the first two positions while
inserting the stale third `Tail paragraph`.

The individual `pr/77924` head has the same boundary: its
`rebaseYBlocksByClientId()` requires `canReorderYBlocksByClientId( yblocks,
baseBlocks )` and `canReorderBlocksByClientId( baseBlocks, blocksToSync )`, both
of which are same-length reorder checks. That PR therefore does not cover the
move-plus-delete-plus-stale-reload shape by itself.

The historical origin is the post-entity CRDT merge path introduced by:

```text
84019935998c16f877e976ad85e84748355d7282 Improve CRDT "merge logic" for post entities (#72262)
```

The newer RTC fixes add clientId-aware reordering and stale-local filtering, but
they do not jointly enforce deletion preservation and move preservation for a
stale snapshot that carries a pre-delete base.

## Fix Plan

The fix should stay local to block-list reconciliation and avoid unbounded
tombstones. A practical rule is:

1. If an incoming snapshot carries `baseBlocks`, compute unique clientId sets for
   base, incoming, and current CRDT blocks.
2. Drop incoming blocks whose clientId was present in the base but is absent from
   the current CRDT list, unless the incoming update can prove a true new
   insertion/reinsertion.
3. Preserve current relative order for shared survivors when the incoming shared
   order is unchanged from the base.
4. Apply an incoming reorder only when the incoming shared order differs from the
   base order.
5. Keep the rule O(n) and fail open when client IDs are missing or duplicated.

That handles the distributed-systems invariant directly: a delayed full-state
update must not resurrect an object that was in its base and has already been
deleted by a concurrent update, and it must not roll back a concurrent move
unless it actually expresses a move relative to its base.

## Remaining Gap

This explanation has a fresh low-level reproduction and a static PR-head
boundary check, but not a clean natural-user Playwright repro or video. The
shortest confidence-improving experiment is a two-user Playwright spec that uses
normal block toolbar actions to move the tail paragraph, delays one HTTP polling
update across a reload/rejoin, deletes the long paragraph, then asserts both
live and saved block order.
