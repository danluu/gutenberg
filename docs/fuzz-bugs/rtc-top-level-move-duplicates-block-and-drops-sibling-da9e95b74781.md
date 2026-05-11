# RTC top-level move can drop a remote sibling when rebasing a stale block snapshot

Bug signature: `da9e95b74781`

Bug type: `rtc_top_level_move_duplicates_block_and_drops_sibling`

Transport: WebSocket

## Summary

The original fuzz result reports a real collaboration correctness bug: after
nearby structural edits and a top-level block move, one peer applies the reorder
while another peer duplicates a moved/adjacent block and drops a sibling block.

Earlier reductions showed that the broad issue is stale full-block-array
reconciliation in the `core-data` CRDT bridge. A collaborator can publish a full
block snapshot that was based on an older top-level list while the local Y.Doc
already contains a remote sibling. A positional merge treats the stale array as
authoritative by index, so the remote sibling can be overwritten/deleted.

Pass 178 found a narrower surviving gap in the backlink-aware known-fixes base
`f256024286dd80a4c0e2579f658c109256abf648`: the cache-based stale snapshot path
preserved the remote sibling, but the explicit `baseBlocks` path did not. When
`mergeCrdtBlocks` received a stale local move plus a stale base block list, it
skipped `reconcileStaleLocalBlocks`, fell through to the positional merge, and
dropped the remote sibling.

## Minimal Failing Shape

Initial top-level blocks:

1. `Heading`
2. `Emoji paragraph`
3. `Another paragraph`

Concurrent remote state in the local Y.Doc:

1. `Heading`
2. `Remote sibling`
3. `Emoji paragraph`
4. `Another paragraph`

Stale local move based on the old three-block list:

1. `Emoji paragraph`
2. `Heading`
3. `Another paragraph`

Expected merged state:

1. `Emoji paragraph`
2. `Heading`
3. `Remote sibling`
4. `Another paragraph`

Observed on exact known-fixes base before the pass-178 patch:

1. `Emoji paragraph`
2. `Heading`
3. `Another paragraph`

## Practical Impact

Historical unfixed builds have low overall real-user likelihood, rising for
active RTC collaborators editing the same small top-level block neighborhood.
The actions are ordinary: inserting, deleting, and moving Heading/Paragraph
blocks in the post editor. The uncommon prerequisite is tight collaboration
timing where a participant's local block snapshot/base is stale while their
Y.Doc already contains another peer's structural edit.

If hit, the blast radius is semantic content corruption, not just UI
inconsistency. A peer can lose a sibling block and keep a duplicate/reordered
block; saving from that peer can persist the bad content. Recovery is manual by
noticing the divergence or revision diff and restoring the missing block.

## Fix Direction

Treat an explicit `baseBlocks` snapshot the same way as the previous local
snapshot cache for stale reconciliation. `mergeCrdtBlocks` should reconcile the
incoming full block list against whichever previous block list it has, whether
that list came from `baseBlocks` or `previousLocalBlocksCache`, before attempting
clientId rebase or positional fallback.

This preserves remote top-level inserts/deletes while still allowing the local
move intent to be applied by stable `clientId`.
