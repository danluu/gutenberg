# RTC stale title with newer body save

Bug signature: `cc9352f66288`

Bug type: `rtc_save_stale_title_newer_body_double_put`

## Summary

An RTC collaborator can persist a post update that combines an older title with newer body content. The durable symptom is a later REST post update whose `title` regresses while `content` contains the newer checkpoint/body markers.

There are two related routes:

1. Current trunk still has the broad background persistence route in `packages/core-data/src/resolvers.js`: `persistCRDTDoc()` reads the full edited entity record and calls `saveEntityRecord()` with that full record. A CRDT meta save can therefore carry stale title/content fields that happened to be dirty in the editor snapshot.
2. The May 7 known-fixes base fixes that broad route by saving only entity id plus CRDT meta, but leaves a narrower save-time route in `prePersistPostType()`. After applying the latest persisted CRDT document, it only overrides a locally changed saved field when the CRDT value differs from `latestRecord[key]`. If the CRDT and latest REST title already agree on the newest title, the hook returns no `title` override, so the caller keeps the stale outgoing `edits.title`.

The second route is not only a synthetic integration artifact: exact PR head `origin/pr/77876` has the same `crdtValue !== getRawPostValue( latestRecord?.[ key ] )` comparison.

## User Workflow

This requires RTC collaboration on a post or page using the post editor.

1. Two collaborators open the same post/page with RTC enabled.
2. A title value such as `older synced title` reaches one collaborator through normal remote sync, making it a local dirty edit against the older persisted record.
3. Another collaborator advances and saves a newer title, and the persisted CRDT/REST state now contains `newest title`.
4. Before the first collaborator's outgoing save payload is rebuilt from that newer title, they save newer body content.

The outgoing save can contain the older dirty `title` plus the newer serialized `content`. This needs multiple browser sessions/users and unlucky RTC/save ordering. It does not require malformed blocks, direct store mutation in the browser repro, unusual block types, or a save loop.

## Impact

The impact is persisted content corruption: the title can roll back while body content remains current. Recovery is manual title correction or revision restore if a good revision exists. There is no evidence for duplicate blocks, an unrecoverable save loop, persistence failure after correction, or performance/OOM risk for this signature.

## Root Cause

Current trunk root cause:

- `ea2cfb87be4a91c9de5ce6430d1cda9ff9d0553c` introduced the CRDT persistence callback that saves the full edited entity record.
- Current `origin/trunk` at `f4df834d9f8b64b610fd677087e79d0cd6632598` still calls `dispatch.saveEntityRecord( kind, name, editedRecord, { __unstableSkipSyncUpdate: true } )` from `persistCRDTDoc()`.
- `114082fd16895304936ddd048e617891ab8f9f48` added `__unstableSkipSyncUpdate`, which avoids replaying the save response into CRDT state, but it does not narrow the outgoing REST payload.

Known-fixes residual root cause:

- Remote RTC updates are ordinary store edits. `createSyncManager()` observes remote Yjs changes, computes changes with `getPostChangesFromCRDTDoc()`, and calls the record handler's `editRecord()`, which dispatches `EDIT_ENTITY_RECORD`.
- `saveEditedEntityRecord()` snapshots `getEntityRecordNonTransientEdits()` before the save and passes that object to `saveEntityRecord()`.
- `prePersistPostType()` can fetch the latest record and call `applyPersistedCRDTDoc()`, which updates the local CRDT/store to the newest title, but the REST payload is still built from the earlier `record` object plus whatever the hook returns.
- The hook compares `crdtValue` to `latestRecord[key]`. When both are `newest title`, it omits a `title` override even if the outgoing edit is still `older synced title`.

The local invariant should be: after a save-time CRDT reconciliation, no saved field in the outgoing payload may be older than the CRDT value just applied for that same field. The comparison must therefore be against the outgoing edit, not the latest REST record.

## Evidence

- Manifest row `likely-real-issues.jsonl:243` records high-confidence `rtc_save_stale_title_newer_body_double_put`, HTTP transport, nonrunnable, and a stale title/newer body double post-update summary.
- Supplement rows for seeds `952870`, `953424`, `953439`, and related duplicate signatures describe the same title rollback after body persistence.
- The original artifact files referenced by the manifest were not present in either expected local artifact path during pass 179, so the raw trace payloads could not be re-read locally.
- In a clean throwaway worktree at known-fixes SHA `f256024286dd80a4c0e2579f658c109256abf648`, pass 179 added an exact-shape save-hook unit probe:
  - persisted record: title `initial title`, body `base body`
  - outgoing edits: title `older synced title`, body `newer body`
  - latest REST/CRDT state: title `newest title`, body `newer body`
  - expected hook result: override `title` to `newest title` and include merged CRDT meta
- Before the fix, that probe failed because the hook returned only CRDT meta. The final REST payload would therefore keep `older synced title` while sending `newer body`.
- Changing the condition to `crdtValue !== getRawPostValue( edits[ key ] )` made the exact-shape probe pass with adjacent stale-content save-hook tests.
- Exact PR head `origin/pr/77876` contains the same stale comparison against `latestRecord[key]`, so the residual survives the relevant proposed stale-save fix before integration conflict resolution.

## Practical Likelihood

Likelihood is `low` for all Gutenberg usage and plausibly `medium` within active RTC sessions that involve title and body edits. The single classification for this bug is `low` because RTC collaboration itself and the required timing window are narrower than ordinary single-user editing.

Common prerequisites:

- post/page editor
- title editing
- body editing with ordinary blocks
- Save Draft/Update

Less common prerequisites:

- RTC collaboration over HTTP polling
- two active tabs or users on the same entity

Timing-sensitive prerequisites:

- one peer must hold an older synced title as a dirty edit
- a newer title must already be persisted in REST/CRDT state
- the stale peer must save body content before its outgoing save payload is rebuilt from the newer title

Fuzz-only details:

- exact marker strings
- deterministic checkpoint naming
- generated action timing

Blast radius is durable title rollback with newer body content preserved. I did not find evidence for duplicate content, UI-only inconsistency, save loops, unrecoverable database corruption, or OOM/performance risk.

## Fix Plan

1. Keep background CRDT persistence saves restricted to entity id plus CRDT meta.
2. During `prePersistPostType()`, after applying the latest persisted CRDT document, replace any locally changed saved field when the CRDT value differs from the outgoing edit.
3. Add the exact stale-title/newer-body save-hook unit regression.
4. Add a natural two-collaborator request-audit E2E that captures outgoing `/wp/v2/posts/:id` or `/wp/v2/pages/:id` writes and fails if any request contains an older title with newer body content.

The smallest confidence-improving browser experiment is a two-user HTTP Playwright test that lets one collaborator receive title T1, then delays that collaborator's receipt of title T2 while another collaborator saves T2. The delayed collaborator then saves body content. Capture all PUT/POST payloads and final REST state.
