# RTC websocket save/reload can leave the saving tab on stale blocks

Bug signature: `41c14cfb3bc3`

Transport: websocket RTC test provider

## Summary

The fuzz seed models a normal collaborative post-editing workflow: two editor sessions open the same draft, one user appends a paragraph, inserts a Search block, edits the post title, saves, and the other session reloads. The original archived run reported persisted title and block-markup corruption. Fresh reruns on the current known-fixes base did not reproduce the exact terminal persisted corruption, but did reproduce a real post-save divergence: the database and collaborator retained the newly added paragraph/Search block, while the saving tab's block editor reverted to the pre-save five-block tree. A deeper pass also found that the saved `_crdt_document` meta could remain stale relative to saved REST `content`, because the save path can update raw `content` without also updating the transient CRDT `blocks` map.

This is still a user-visible correctness bug. If the saving user continues editing from the stale tab, a later save can overwrite the blocks that were just saved and visible to collaborators.

## Practical Impact

Likelihood: medium.

Natural trigger:

- Editor surface: post editor with RTC collaboration enabled.
- Transport: websocket provider; the same failure class is about sync-manager save handling, not a malformed websocket packet.
- Users/tabs: two browser sessions on the same post.
- Blocks: ordinary paragraph, heading, group, and Search blocks.
- Timing: one user edits block content and title, then saves while peers are live. No artificial network fault is required in the passing/failing repro.
- Save/reload: the observed divergence occurs immediately after save; collaborator reload was part of the original checkpoint scenario but is not needed for the primary-tab stale-block symptom.

Common prerequisites are collaborative editing, a draft save, and ordinary block insertion. Less common prerequisites are two live sessions and a save while RTC state is active. The marker strings and strict convergence assertion came from fuzzing; the editor actions themselves are normal.

Blast radius:

- Confirmed fresh rerun: UI/editor-state corruption in one tab; persisted REST content and the collaborator's block tree were correct at the failure snapshot.
- Persisted CRDT meta risk: the first fresh fix probe repaired the visible editor state but still left `_crdt_document` stale relative to REST `content`; later joins can heal from REST content, but this is a bad persistence invariant and can cause follow-on reconciliation churn.
- Plausible follow-on: content loss if the stale tab continues editing and saves again.
- Original archived run: malformed persisted block markup/title was reported, but I did not re-confirm that exact terminal state on the current base.
- No save loop, OOM, or performance failure was observed. Recovery is reload or post revision if stale content was subsequently saved.

## Evidence

Strongest evidence for real impact:

- The repaired natural Playwright repro consistently reached product code and failed after save with primary/collaborator block divergence on the known-fixes base at `f256024286dd80a4c0e2579f658c109256abf648`.
- Decoding the saved `_crdt_document` from the pass-170 failing and first fixed artifacts showed its raw `content` still lacked the checkpoint paragraph/Search block while REST `content` had them. This narrows the persistence side of the bug to raw-content updates that bypass the transient `blocks` map.
- A low-level `SyncManager` regression test covers local record reconciliation after save, and a core-data CRDT regression test covers keeping the block map in sync when raw `content` changes without a `blocks` edit.

Strongest evidence against the exact archived claim:

- The previous pass's refreshed failure was a harness/user-provisioning issue.
- Fresh reruns did not reproduce the exact persisted malformed title/raw-content terminal assertion; the confirmed fresh bug is a stale saving-tab block tree after a clean persisted save.
- The known-fixes checkout is a synthetic integration branch, so individual PR heads still need separate consideration for claims about "all proposed fixes."

## Root Cause

There are two save-boundary gaps.

First, local CRDT updates do not dispatch `editRecord` back into the local entity store; they assume the editor store already reflects the user's local edit. During save, however, core-data can clear transient block edits or receive save/refetch responses while peers and REST content have the newer block tree. Because the save update is local, the normal remote observer path does not repair the local entity/block-editor state. The saving tab can therefore remain stale while collaborators converge on the saved content.

Second, post saves can evaluate a raw `content` edit derived from blocks without carrying a parallel transient `blocks` edit. `applyPostChangesToCRDTDoc` handled `content` as `Y.Text` but left the CRDT `blocks` map unchanged or undefined. The serialized `_crdt_document` can therefore lag behind the saved REST `content` even when the save itself succeeds.

The regression is in the RTC save pipeline added across the real-time collaboration work, especially the interaction between:

- `8051e14451c` / PR #75975, which added persisted CRDT creation around save.
- `85cbd148b1c` / PR #77966, which changed persisted-doc observer ordering and showed this area is sensitive to local store updates during hydration.
- Later CRDT merge/stale-save fixes in the known-fixes base, which reduce other corruption modes but do not force the saving tab back into agreement after a local save marker.

## Fix Plan

The fix has two scoped parts:

- Reconcile the local entity record from the CRDT document after an `isSave` entity update marks the CRDT as saved. This reuses the existing `updateEntityRecord` path instead of directly mutating block-editor state.
- When raw `content` changes and `blocks` are also a synced property, parse the raw content and merge it into the CRDT block map if the same change set did not already include `blocks`. This keeps persisted CRDT block state aligned with the content WordPress saves.

Audit:

- Kernel-maintainer robustness: the reconciliation half is idempotent and scoped to entity saves; if the local store already matches the CRDT, `getChangesFromCRDTDoc` returns no edits. The content-to-block merge only runs for content-only updates when blocks are part of the sync contract.
- Jepsen-style correctness: save is treated as a synchronization boundary; after the CRDT state is marked saved, the local materialized editor state and persisted CRDT block map are forced to observe the same saved value.
- Simplicity/performance: the fix avoids new clocks, new provider protocol, and direct block-store mutation. The extra parse is on raw-content update paths, not ordinary block `blocks` updates that already carry a block tree.

The shortest additional confidence experiment is to rerun this repro on a clean build of the PR branch, then repeat with an inserted delay around background CRDT meta persistence to stress save-response ordering.
