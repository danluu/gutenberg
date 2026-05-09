# RTC stale base-record move can corrupt adjacent blocks

Bug signature: `c1c8ee8f4449`

Bug type: `rtc_ws_remote_heading_insert_then_local_move_duplicates_trailing_paragraph`

## Summary

The archived fuzzer failure is a real RTC block merge bug, not just a WebSocket readiness issue. The original realistic Playwright refresh failed before user actions because the generated spec used an HTTP-style readiness wait under the WebSocket provider. However, the underlying operation is valid editor behavior and still fails at the post/CRDT adapter level on the requested known-fixes base `f256024286dd80a4c0e2579f658c109256abf648`.

The minimal operation is:

1. Start with top-level blocks `heading -> emoji paragraph -> tail paragraph`.
2. A collaborator inserts a new heading before the original heading.
3. The local user moves the emoji paragraph down while their editor change is based on the old three-block `baseRecord`.

On current known-fixes base `f256024`, the adapter can produce:

```text
core/heading:Inserted heading
core/heading:Other paragraph
core/paragraph:Emoji paragraph
```

That loses the original heading and rewrites the tail paragraph into a heading slot. The archived fuzz symptom was slightly different, `inserted heading -> original heading -> emoji -> emoji`, but both are the same stale top-level block identity failure: a local full-block snapshot is interpreted positionally after remote top-level insertion has already changed the shared Yjs array.

## Practical Impact

Real-user likelihood: `low`.

The user workflow is ordinary: two collaborators in the post editor, WebSocket RTC enabled, Heading and Paragraph blocks, one user inserting a heading before the first block, and the other moving a paragraph with the block toolbar. It needs narrow timing: the remote insert must already be in the local Y.Doc while the local `editEntityRecord` call still carries a stale `baseRecord.blocks` snapshot. Real network delay or event-loop timing can create that window; deterministic WebSocket delay from fuzzing makes it much easier to hit.

Blast radius is content corruption. Depending on the exact interleaving, a peer can duplicate a paragraph, drop a sibling, or smear a sibling's content into the wrong block type. If that peer saves first, the corrupted content can be persisted. There is no evidence of an OOM, save loop, or pure UI-only issue. Recovery is reload/undo before save, or manual repair/revision restore after save.

## Evidence

- `likely-real-issues.jsonl` row 154 classifies seed `954733` as a likely real WebSocket RTC correctness bug.
- `analysis-tier-likely-real-supplement.jsonl` rows 1083 and 1747 describe the same two-action remote heading insert plus local paragraph move split.
- A same-seed sibling row at line 2043 reports `insert-heading -> move-block` duplicating the source paragraph and dropping the target sibling in primary plus two watcher reruns.
- The refreshed materialized Playwright result is not a product repro: it times out in `waitForAwarenessPeerCount()` before either the insert or move action.
- A pass-174 unit probe against clean `f256024` reproduces the stale `baseRecord.blocks` corruption through `applyPostChangesToCRDTDoc()`.
- Applying the tiny base-record reconciliation change from `c8af86c24a5` to the clean `f256024` probe makes the same test pass.

## Root Cause

`editEntityRecord()` sends full post block snapshots to the sync manager along with `baseRecord`, the editor record before the edit. `applyPostChangesToCRDTDoc()` passes `baseRecord.blocks` to `mergeCrdtBlocks()` so the CRDT merge can rebase local changes.

The known-fixes stack added `reconcileStaleLocalBlocks()` to preserve remote top-level inserts/deletes before merging stale local full snapshots. The remaining bug is that the explicit `baseRecord.blocks` path bypassed that reconciliation and used the stale local block array directly. When the shared Yjs array already contains a remote top-level insertion, the positional merge can match the wrong YBlock slots and smear block content/type across adjacent siblings.

The fix is to run stale-local reconciliation for both paths:

- no explicit base: use `previousLocalBlocksCache.get( yblocks )`;
- explicit base: use `baseBlocks` as the previous local snapshot.

This keeps the merge identity-based and preserves remote top-level blocks before reordering or merging block fields.

## Fix Plan

Add regression coverage for the exact post adapter scenario, then update `mergeCrdtBlocks()` so `baseBlocksToSync` goes through `reconcileStaleLocalBlocks()` instead of bypassing it. Keep the fix narrow and linear in the top-level block count; do not add a transport-specific workaround or special-case Heading/Paragraph.

Robustness audit:

- Kernel-maintainer view: treat remote insert/delete preservation as an invariant of the merge API, regardless of whether the previous local snapshot arrives from cache or explicit base.
- Jepsen-style view: the local full snapshot is not an authoritative deletion of remote concurrent blocks; use stable `clientId` identity and fall back only when IDs are missing or duplicated.
- Simplicity/performance view: reuse the existing reconciliation code path; do not add another diff algorithm or extra serialization pass.
