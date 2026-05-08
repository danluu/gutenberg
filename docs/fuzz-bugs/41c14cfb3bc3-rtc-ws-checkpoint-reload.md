# RTC websocket save/reload can leave the saving tab on stale blocks

Bug signature: `41c14cfb3bc3`

Transport: websocket RTC test provider

## Summary

The fuzz seed models a normal collaborative post-editing workflow: two editor sessions open the same draft, one user appends a paragraph, inserts a Search block, edits the post title, saves, and the other session reloads. The original archived run reported persisted title and block-markup corruption. Fresh reruns on the current known-fixes base did not reproduce the exact terminal persisted corruption, but did reproduce a real post-save divergence: the database and collaborator retained the newly added paragraph/Search block, while the saving tab's block editor reverted to the pre-save five-block tree.

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
- Plausible follow-on: content loss if the stale tab continues editing and saves again.
- Original archived run: malformed persisted block markup/title was reported, but I did not re-confirm that exact terminal state on the current base.
- No save loop, OOM, or performance failure was observed. Recovery is reload or post revision if stale content was subsequently saved.

## Evidence

Strongest evidence for real impact:

- The repaired natural Playwright repro consistently reached product code and failed after save with primary/collaborator block divergence on the known-fixes base at `f256024286dd80a4c0e2579f658c109256abf648`.
- The failure snapshot had both peers carrying the same persisted CRDT payload while the saving tab's block editor showed only the pre-checkpoint blocks. That local-store/CRDT mismatch explains why a save-associated local reconciliation fixes the symptom.
- A low-level `SyncManager` regression test fails before the fix and passes after the fix.

Strongest evidence against the exact archived claim:

- The previous pass's refreshed failure was a harness/user-provisioning issue.
- Fresh reruns did not reproduce the exact persisted malformed title/raw-content terminal assertion; the confirmed fresh bug is a stale saving-tab block tree after a clean persisted save.
- The known-fixes checkout is a synthetic integration branch, so individual PR heads still need separate consideration for claims about "all proposed fixes."

## Root Cause

Local CRDT updates do not dispatch `editRecord` back into the local entity store; they assume the editor store already reflects the user's local edit. During save, however, core-data can clear transient block edits or receive save/refetch responses while the CRDT document still contains the correct newer block tree. Because the save update is local, the normal remote observer path does not repair the local entity/block-editor state. The saving tab can therefore remain stale while collaborators converge on the CRDT state.

The regression is in the RTC save pipeline added across the real-time collaboration work, especially the interaction between:

- `8051e14451c` / PR #75975, which added persisted CRDT creation around save.
- `85cbd148b1c` / PR #77966, which changed persisted-doc observer ordering and showed this area is sensitive to local store updates during hydration.
- Later CRDT merge/stale-save fixes in the known-fixes base, which reduce other corruption modes but do not force the saving tab back into agreement after a local save marker.

## Fix Plan

The small fix is to reconcile the local entity record from the CRDT document after an `isSave` entity update marks the CRDT as saved. This reuses the existing `updateEntityRecord` path instead of adding a second block/content merge path.

Audit:

- Kernel-maintainer robustness: the fix is idempotent and scoped to entity saves. If the local store already matches the CRDT, `getChangesFromCRDTDoc` returns no edits.
- Jepsen-style correctness: save is treated as a synchronization boundary; after the CRDT state is marked saved, the local materialized editor state is forced to observe the same value.
- Simplicity/performance: one existing diff/read path runs after saves only. It avoids new clocks, new provider protocol, and direct block-store mutation.

The shortest additional confidence experiment is to rerun this repro on a clean build of the PR branch, then repeat with an inserted delay around background CRDT meta persistence to stress save-response ordering.
