# RTC WebSocket stale save can persist empty or flattened content

Bug signature: `c00f0d531042`

Bug type: `rtc_ws_checkpoint_save_persists_empty_or_flattened_canonical_content_after_reload`

Transport: WebSocket

## Summary

The original fuzz artifact reported a destructive save/reload RTC failure: canonical post `content` was saved as empty or flattened text while the `_crdt_document` meta field remained populated. The refreshed realistic replay for this exact signature did not reach the destructive actions; it timed out during initial collaboration readiness, and its trace only saved the intact initial document.

The old internal checkpoint-save route is fixed in the backlink-aware known-fixes base: checkpoint persistence saves only the entity id and CRDT meta while skipping sync response replay. However, pass 177 found and fixed a narrower remaining normal-save guard gap in the synthetic known-fixes base. If the editor is about to save suspect serialized content, such as `""` or plain flattened text, while both latest REST content and CRDT blocks still contain the full block tree, `prePersistPostType` can return only CRDT meta. `saveEntityRecord` then merges those additions over the original bad payload and sends the empty or flattened `content`.

## Practical Impact

Real-user likelihood: `low`.

The natural workflow is a collaborative post or page editing session with RTC enabled over WebSocket, at least two tabs or users, ordinary post blocks, a checkpoint save, a reload, and then another save after the reloaded editor has an empty or flattened block-editor view while the CRDT document still has the full content. The individual operations are normal Gutenberg actions, but the stale local serialized-content state is timing-sensitive and was found by fuzzing rather than by a refreshed stable Playwright repro.

Blast radius is high if it occurs: persistent post-body loss or corruption, because REST `content` is overwritten even though `_crdt_document` remains non-empty. Recovery is possible from a still-good collaborator before save, undo before reload, revisions/autosaves, or manual restoration from CRDT/revision data.

## Evidence

Evidence for a real guard gap:

- Exact-source harness on known-fixes SHA `f256024286dd80a4c0e2579f658c109256abf648` showed `latest-equals-crdt-local-empty` retained final payload `content` length `0`.
- The same harness showed `latest-equals-crdt-local-flattened` retained final payload prefix `S2nested paragraph`.
- In both cases, `getCRDTRecordData` was called and returned blocks for the full content; the hook skipped `content` because CRDT content equaled latest REST content.
- `saveEntityRecord` merges pre-persist additions over the pending record, so returning only `meta` preserves the bad pending `content`.

Evidence against medium/high likelihood:

- The refreshed WebSocket realistic replay failed before the scenario's edits began, at the initial mutual-discovery wait.
- Its trace contained only intact initial saves with canonical content length `715` and non-empty CRDT meta.
- Current normal editor saves call `select.getEditedPostContent()` immediately before saving, so this requires the visible/editor block state itself to be empty or flattened, not merely an old core-data edit object.
- The exact no-injection browser route that creates this state on the known-fixes base is still missing.

## Root Cause

The stale-save protection compares CRDT-derived field values with latest REST values before deciding whether to overwrite pending saved fields. That is insufficient for the c00 failure shape. If latest REST and CRDT already agree on the full content, but the local pending save payload is empty or flattened, equality with REST says nothing about the safety of the pending payload.

For content, CRDT blocks are the stronger local source when the pending serialized content is suspect and not block-delimited. The fix treats empty or non-block-delimited pending `content` as suspect when CRDT blocks are available, replacing it with serialized CRDT blocks even if those blocks match latest REST. Valid block-serialized local content still falls through to the existing stale serialized-content merge path.

## Fix Plan

1. Add a `prePersistPostType` regression for empty and flattened local content while latest REST content and CRDT blocks match the full structured content.
2. Preserve existing stale serialized-content merge behavior for valid block-delimited local edits.
3. In `prePersistPostType`, replace suspect empty/flattened `content` from CRDT blocks when available, even when CRDT equals latest REST.
4. Remove dead intermediate CRDT serialization variables from the same helper so the touched file passes JS lint.

Pass 177 implemented this on branch `try/rtc-ws-checkpoint-save-persists-empty-or-flattened-canonic-c00f0d531042-pr`, based on the synthetic known-fixes base `f256024286d`.

## Remaining Gap

No natural Playwright repro was recovered in pass 177. The shortest confidence-improving browser experiment is a focused two-tab WebSocket probe that avoids the old readiness-failing generated wait sequence and checks whether a reload can leave `select( 'core/editor' ).getEditedPostContent()` empty or flattened while `core-data`/sync `getCRDTRecordData().blocks` still has the full block tree.
