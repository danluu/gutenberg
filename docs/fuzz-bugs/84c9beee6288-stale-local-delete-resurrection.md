# RTC stale local reconciliation can resurrect a remotely deleted top-level block

Bug signature: `84c9beee6288`

Bug type: `rtc_stale_local_reconciliation_preserves_deleted_remote_top_level_insert`

Transport: websocket

## Summary

A stale local full-block snapshot can reinsert a top-level block that another collaborator already deleted. The natural workflow is ordinary collaborative editing: one user appends a paragraph, another user deletes that paragraph, and a stale snapshot from the first editor later reaches the CRDT merge layer. If the stale snapshot is merged positionally, the deleted paragraph is interpreted as a local insertion and comes back.

## User Impact

This is a real RTC correctness issue for multi-user post editing. The visible impact is content divergence and deleted-content resurrection. If the peer that still has the resurrected paragraph saves, the stale paragraph can become durable post content.

The prerequisites are specialized but plausible:

- RTC collaboration enabled.
- Two browser tabs or two users editing the same post.
- Websocket transport or equivalent delayed sync ordering.
- Ordinary top-level `core/paragraph` insertion and deletion.
- A stale full-block snapshot arriving after the remote delete.

No malformed blocks, direct REST mutation, synthetic block trees, or custom blocks are required for the natural browser repro. The lower-level tests construct ordinary block objects only to isolate the merge invariant.

## Root Cause

The original merge path compares the incoming full editor block list directly against the current Yjs block array. It does not know which block list the local editor snapshot was based on.

For this reduced state:

- Previous local editor view: `[ Alpha, Beta, Gamma ]`
- Current CRDT after remote delete: `[ Alpha, Beta ]`
- Stale incoming local snapshot: `[ Alpha local edit, Beta, Gamma ]`

the left/right sweep cannot match the right edge because the stale incoming tail is `Gamma` while the current CRDT tail is `Beta`. The merge then computes one insertion and inserts `Gamma` back into the Y.Array.

The same bug can occur through the production `baseRecord` path. The May 7 backlink-aware known-fixes SHA `f256024286dd80a4c0e2579f658c109256abf648` has stale-local reconciliation for the no-base path, but bypasses it when `baseBlocksToSync` is supplied, leaving `applyPostChangesToCRDTDoc( ..., { baseRecord } )` vulnerable.

## Evidence

The handoff manifest row at `likely-real-issues.jsonl:102` classifies `84c9beee6288` as high-confidence and describes seed `951507` as a collaborator append followed by a later delete where one peer keeps the deleted paragraph.

On current `origin/trunk` `cb74beb786b`, a focused stale-delete regression still fails before the fix:

```text
Expected: [ "Alpha local edit", "Beta" ]
Received: [ "Alpha local edit", "Beta", "Gamma" ]
```

On exact known-fixes SHA `f256024286dd80a4c0e2579f658c109256abf648`, the no-base `mergeCrdtBlocks()` path now preserves the delete, but the production-path `applyPostChangesToCRDTDoc()` repro with `options.baseRecord` still fails with the same stale `Gamma` resurrection. That distinction matters because the post adapter commonly supplies a `baseRecord` when applying edited entity changes.

On the fixed branch rebased to `cb74beb786b`, the focused CRDT regression passes. The natural websocket Playwright repro was browser-verified before the current rebase and uses normal editor actions: open a two-user collaborative post, have the collaborator insert a top-level paragraph after an existing paragraph, have the primary user delete that paragraph while the collaborator edits another paragraph, then verify both peers converge and the deleted marker is absent.

## Fix Direction

Before full-array merge, reconcile the incoming local snapshot against the previous local base and the current CRDT state by stable block `clientId`.

Specifically:

- If a block was present in the previous local base and in the incoming stale snapshot, but is absent from the current CRDT state, treat it as remotely deleted and remove it from the snapshot before merging.
- If a block exists in the current CRDT state but not in either the previous local base or incoming local snapshot, preserve it as a remote insertion.
- Apply this reconciliation both to the no-base merge path and to the `baseRecord` path used by `applyPostChangesToCRDTDoc()`.

This is narrower than replacing the whole diff algorithm and keeps the repair tied to stable client IDs already used by RTC block identity.
