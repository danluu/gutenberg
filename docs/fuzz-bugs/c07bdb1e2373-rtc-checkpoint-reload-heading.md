# c07bdb1e2373: RTC checkpoint save can persist correct REST content while leaving collaborators on divergent block state

## Summary

Deep pass 171 reproduced a real RTC save/checkpoint divergence on the current known-fixes base (`f256024286dd80a4c0e2579f658c109256abf648`), which contains the May 7 known-fix stack. The original generated symptom was a save/reload/heading sequence where one collaborator could end up with duplicated baseline suffix content after a saved Search block. The stronger current-base repro fails earlier: after a natural save, REST `content.raw` contains the six-block checkpoint, but the saving tab's active block state rolls back to the original three-block baseline while the collaborator keeps the six-block body.

This is not a readiness wait or locator-only failure. The one-attempt Playwright probe captured:

- persisted REST body: six blocks, including the inserted paragraph, marker paragraph, and Search block;
- persisted `_crdt_document` before candidate patching: stale three-block content;
- active editor state: primary tab three baseline blocks, secondary tab six checkpoint blocks, same title marker.

## Natural Workflow

The workflow uses ordinary editor actions:

1. Open a draft post in two collaborating browser sessions with HTTP RTC enabled.
2. In the primary editor, insert a paragraph after an existing Heading.
3. Append a marker paragraph and a Search block by using the block toolbar "Add after" and the slash inserter.
4. Edit the title and click "Save draft".
5. Wait for collaboration convergence, then reload one collaborator and continue editing.

The failure does require RTC collaboration, two sessions, and a save checkpoint while edits are still represented partly as transient block-editor state. It did not require artificial malformed blocks, direct state mutation, network fault injection, or unusual block JSON.

## Practical Impact

Real-user likelihood: **low**.

The prerequisites are not default single-user editing, but they are realistic for the RTC feature: two collaborators, post editor, paragraph/heading/Search blocks, save draft, and reload/continued editing. The exact generated heading-after-reload suffix duplication has not yet been isolated from the earlier post-save divergence on the known-fixes base, but the post-save divergence itself is user-visible and can lead to a stale tab overwriting or duplicating body content on a later save.

Observed blast radius:

- UI divergence between collaborators after save;
- duplicate or reverted body content risk if the stale editor continues editing/saving;
- persisted REST content was correct in the captured run, so immediate server-side content loss was not proven;
- no performance or OOM signal;
- recovery is likely by reloading from the correct persisted post before making another stale save, or by restoring a revision after a bad follow-up save.

## Root-Cause Narrowing

Pass 172 narrowed the first bad state to the save completion path on the
current known-fixes base, using an isolated `wp-env-test` instance on port
9957.

Before save, the primary editor had the expected six blocks in both
`core/block-editor.getBlocks()` and `core.getEditedEntityRecord()`. At the
save snackbar, the REST-backed entity record contained the correct six-block
checkpoint, but the saving tab had a stale non-transient `content` edit with
the original three-block baseline layered over that raw record:

- `core/block-editor.getBlocks()`: three baseline blocks;
- raw entity record `content.raw`: six checkpoint blocks;
- edited record `content`: three baseline blocks;
- non-transient edit keys: `content`;
- `hasEdits`: `true`.

The collaborator still had the six-block checkpoint. This shows the bug is not
caused by the later collaborator reload or heading insertion; those actions are
only the original fuzzer's oracle for the already-diverged save state.

The likely root cause is `prePersistPostType` replaying an unchanged persisted
`_crdt_document` from the freshness check into the active sync manager before a
normal local save. `syncManager.applyPersistedCRDTDoc()` is not harmless: it
eventually calls `updateEntityRecord()`, so replaying the stale baseline CRDT
document can write stale CRDT-derived content back into the saving tab even
though the REST save response contains the correct local body.

The pass-172 candidate fix changes the replay guard so `prePersistPostType`
only applies the latest persisted CRDT document when either:

- server-saved fields changed during the freshness check; or
- the latest persisted CRDT document differs from the base persisted CRDT
  document already known to this editor.

With that guard, the same timeline probe converged: both collaborators kept the
six-block checkpoint after save and both reached the expected seven-block state
after reload plus heading insertion. The targeted `prePersistPostType` unit
tests and `npm run build -- --skip-types` also passed.

This fix was verified in the synthetic current known-fixes checkout
(`f256024286dd80a4c0e2579f658c109256abf648`). The existing repro PR branch is
based on `origin/trunk`, which does not yet contain the full stale-save
protection code path from the proposed RTC stack, so pass 172 did not add this
small guard as a standalone trunk-based fix commit.

Pass 171 had pointed at two broader stale-state paths:

1. `prePersistPostType` serializes `_crdt_document` during save. On the known-fixes base, the saved REST body can be correct while the serialized CRDT document remains stale, so a save response can reapply a stale CRDT snapshot to an active editor.
2. Content-only CRDT updates can intentionally set `blocks` to `undefined` so blocks should be reparsed from serialized content, but active editor state can retain a stale transient block array and never reparse.

Candidate patches tested during pass 171:

- invalidating CRDT `blocks` when syncing content without blocks: unit-level behavior passed, but the Playwright repro still failed;
- including `blocks` in `savePost`: built successfully, but the Playwright repro still failed;
- including `blocks` in `useEntityBlockEditor` callbacks: built successfully, but the Playwright repro still failed;
- forcing `prePersistPostType` to update the CRDT document with local save edits before serializing: made persisted `_crdt_document` contain the six-block content, but active editor divergence still failed;
- clearing transient blocks after successful save: did not resolve the active editor divergence.

The next most useful experiment is to run the pass-172 timeline probe multiple
times on both the patched known-fixes checkout and the head of the proposed
stale-save protection PR, with and without the guard above. That would quantify
flake rate and separate the proposed PR's behavior from the synthetic
known-fixes integration base.
