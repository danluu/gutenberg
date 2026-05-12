# RTC Stale Save Reconciliation Drops Local Content

Signature: `47950776c34e`

The archived handoff classifies seed `950011` as an HTTP RTC save/reconciliation issue on entity-stress content. The original source artifacts are not present locally, but the manifest says one participant's editor block list collapsed while the persisted CRDT document still contained the checkpointed post.

## Current Finding

On the May 7 backlink-aware known-fixes base (`f256024286dd80a4c0e2579f658c109256abf648`), the preserved realistic repro no longer passes. Pass 170 reproduced the failure with semicolonless/entity-heavy paragraph and heading markup. Pass 171 narrowed the issue further: the same stale-save retry loses an ordinary valid paragraph edit on a post containing only plain paragraph and heading blocks.

1. Open the post in two editor sessions with RTC enabled.
2. Edit the title.
3. Click the last paragraph, press `End`, press `Enter`, and type a marker paragraph.
4. Save the draft.

The marker is visible in the canvas immediately after typing, but the first save request receives `rest_crdt_document_stale` (`409`). The retry then sends the edited title with body content reverted to the original post and persists that reverted body. This is content loss, not a locator-only failure.

The key trace facts from the pass 171 valid-content run:

- First save request to `/wp-json/wp/v2/posts/16` included `rtc-pass171-valid-unsaved-marker` and `_crdt_document`.
- The server rejected that request with `rest_crdt_document_stale`.
- The retry request to the same endpoint omitted `rtc-pass171-valid-unsaved-marker`.
- The successful response and later `getEditedPostContent()` also omitted the marker.

## Root-Cause Read

The observed current-base failure is in the proposed stale persisted CRDT document retry path, not in current `origin/trunk` as of `939b0ff02a9d3eaa9da4eb0a1e96dc325b71a801`. `origin/trunk` does not contain the `rest_crdt_document_stale` retry logic, even after the later RTC y-websocket-server test merge. The relevant proposed head is `pr/77890` (`RTC: Reject stale persisted CRDT documents`), later integrated into the synthetic known-fixes branch. Pass 178 refreshed the exact PR head and confirmed it is still `bd511b424f1e7077a59fb7f61f2f24cbd3b3c7eb`; its retry code still calls `applyPersistedCRDTDoc()` and then trusts `select.getEditedEntityRecord()` as the retry payload.

In `packages/core-data/src/actions.js`, the retry path handles a stale CRDT document by:

1. fetching the latest record,
2. receiving it into the entity store,
3. applying the persisted CRDT document,
4. reading `select.getEditedEntityRecord()`, and
5. retrying the save with that merged record.

The repro shows that the post-refresh edited record can lose the local content edit. The save-time record still contains the local body edit; the selected edited record after the refetch/apply step has regressed to the previous body. Because the retry trusts that selected record, it persists a stale body while keeping the local title.

Pass 173 added a narrower code-level proof for why the retry can regress one saved field while preserving another. In `packages/sync/src/manager.ts`, `applyPersistedCRDTDoc()` calls `internal.updateEntityRecord()`, which diffs the CRDT document against `handlers.getEditedRecord()` and dispatches `handlers.editRecord( changes )`. In core-data, that handler is an `EDIT_ENTITY_RECORD` dispatch. `getEditedEntityRecord()` is then just `{ ...raw, ...edited }`, so any CRDT-derived `content` change written during reconciliation becomes part of the selected merged record. The stale retry in `packages/core-data/src/actions.js` uses that selected merged record as the retry payload, with no invariant that every save-time field from the failed request is still present. This matches the pass 171 network trace: the selected retry kept the local title edit but had body content equal to the pre-save/latest server value.

## Practical Impact

Likelihood: `very-low` for normal current-trunk Gutenberg use because the confirmed data-loss mechanism depends on a stale-save retry path that is absent from trunk. Conditional likelihood is `medium` for a build that includes the stale-CRDT retry path from `pr/77890` or the synthetic known-fixes stack, because the preserved repro uses valid content and normal editor actions once a stale persisted CRDT conflict occurs. Current `origin/trunk` does not yet contain that retry path, so current-trunk likelihood is limited to the original unresolved archived symptom, whose exact artifact is no longer present locally.

The natural workflow is no longer entity-specific: a collaborative post with ordinary paragraph and heading blocks, two editor sessions open over HTTP RTC, and a user saves shortly after editing title and body content. The common prerequisites are ordinary post editing, save, and multiple RTC participants or tabs. The uncommon prerequisite is the stale persisted CRDT document conflict: in `pr/77890`, the server rejects a save only when the submitted `_crdt_document` is neither equal to the current persisted CRDT document nor based on the current persisted document's `baseVersion`. This corresponds to a real concurrent persistence race where another session has advanced the CRDT document before the first session's save reaches the server. No direct store mutation, malformed block injection, synthetic block tree, or artificial network fault is needed in the browser repro.

Blast radius is real content loss: the newly typed paragraph is dropped from the edited content and from the successful persisted response after the retry. The title survives, making the saved post look partially updated. Recovery is manual undo/retyping before reload or later revision recovery if a revision captures the lost edit.

Pass 171 performed the previously proposed confidence-improving experiment with ordinary valid paragraphs. The result promotes this from an entity-stress-specific low-likelihood issue to a general stale-save retry issue with medium practical likelihood for any deployment that includes the stale-CRDT retry path.

## Status

This explanation branch is documentation only because the concrete current-base failure is introduced by an open proposed fix stack, not by current trunk. Pass 171 created a fix branch on the known-fixes base:

`try/rtc-save-reconciliation-empty-block-tree-on-entity-stress--47950776c34e-pr`

That branch adds a unit repro, a natural valid-content Playwright repro, and a retry fix that preserves save-time local edits when the selected edited record regresses to the pre-save/latest server value during stale CRDT recovery.

Pass 172 independently checked the branch and artifact package rather than adding another repro variant. The fix branch is based directly on `f256024286dd80a4c0e2579f658c109256abf648` and has the required commit order: unit repro, natural Playwright repro, then fix. The annotated video at `bug-processing/deep-state/pass-171/artifacts/47950776c34e-pass171-annotated.mp4` is a 20-second 1280x720 H.264 clip with subtitles covering the ordinary two-session workflow, the unfixed `409` stale-save retry that drops the marker, and the fixed verification. Pass 172 also reran the targeted unit verification successfully with:

```bash
npm run test:unit packages/core-data/src/test/actions.js -- --runInBand --testNamePattern='preserves save-time edits'
```

Pass 173 rebased this explanation branch onto `origin/trunk` `80699422e63115adf1bd39c4db520575a816e747`, reconfirmed that trunk still lacks the stale retry path, and reran the same targeted unit verification on the fix branch successfully.

Pass 174 rebased this explanation branch onto `origin/trunk` `b38f9b4d86d0505199f5efd78c2adf213e428e78` and reran the targeted unit repro as a true before/after check in fresh detached worktrees. The repro-only commit `e9c37d40c3fd857c78c148170e3f96a4b2cd7c01` fails because the third `apiFetch` retry payload contains `content: "previous content"` instead of `content: "local content"`. The fix commit `7f9aaaaad0286666ee92495c50f5093742e7fbc0` passes the same test and sends `content: "local content"` with the fresh `_crdt_document`.

Pass 175 independently rechecked the branch and artifact sufficiency. `origin/trunk` is still `b38f9b4d86d0505199f5efd78c2adf213e428e78`, and `packages/core-data/src/actions.js` on trunk still has no `rest_crdt_document_stale`/`applyPersistedCRDTDoc` retry path. The exact `pr/77890` head is still `bd511b424f1e7077a59fb7f61f2f24cbd3b3c7eb`; `git blame` shows the stale-save retry sequence, including the `select.getEditedEntityRecord()` retry payload, was introduced by that commit. The named known-fixes checkout was dirty and checked out to another bug branch during pass 175, so the pass used the manifest SHA `f256024286dd80a4c0e2579f658c109256abf648` and the dedicated fix worktree for conclusions. The PR/fix branch still has the required order on top of `f256024286d`: unit repro, natural valid-content Playwright repro, then fix. Pass 175 reran:

```bash
npm run test:unit packages/core-data/src/test/actions.js -- --runInBand --testNamePattern='preserves save-time edits'
```

in `/Users/danluu/dev/fuzz/gutenberg-47950776c34e-pass171-knownfix` at `7f9aaaaad0286666ee92495c50f5093742e7fbc0`; the targeted unit test passed (`31 skipped, 1 passed, 32 total`).

Pass 176 rebased this explanation branch onto current `origin/trunk` `5fc7223e96b2751c57b6c4ae840bb9e838bee9f0` (`Classic Block: Use onReplace prop for migration actions (#78113)`). Trunk still has only the ordinary `getEditedEntityRecord()` save/edit paths and no `rest_crdt_document_stale`, `applyPersistedCRDTDoc`, or stale-save retry logic. Exact `pr/77890` remains unchanged at `bd511b424f1e7077a59fb7f61f2f24cbd3b3c7eb`; line-level review again places the unsafe retry at `packages/core-data/src/actions.js` lines 817-845, where the code fetches the latest record, applies the persisted CRDT document, then uses `select.getEditedEntityRecord()` as the retry payload without preserving fields from the failed save-time record. Pass 176 reran the fixed branch's targeted unit verification:

```bash
npm run test:unit packages/core-data/src/test/actions.js -- --runInBand --testNamePattern='preserves save-time edits'
```

Result in `/Users/danluu/dev/fuzz/gutenberg-47950776c34e-pass171-knownfix` at `7f9aaaaad0286666ee92495c50f5093742e7fbc0`: passed (`31 skipped, 1 passed, 32 total`). The PR/fix branch remote still points to `7f9aaaaad0286666ee92495c50f5093742e7fbc0`, and the explanation branch was updated only for current evidence and likelihood framing.

Pass 177 rebased this explanation branch onto current `origin/trunk` `e359bb010becda46b5f58aaa6baa37079c36f557` (`Fix: Guard require_once calls in generated PHP files against deployment race conditions (#78110)`). Trunk still has no `rest_crdt_document_stale`, `applyPersistedCRDTDoc`, or stale-save retry path. Exact `pr/77890` is still `bd511b424f1e7077a59fb7f61f2f24cbd3b3c7eb`. The additional pass 177 read was server-side: `lib/compat/wordpress-7.0/collaboration.php` rejects the incoming `_crdt_document` only when the current persisted document exists, the incoming document is not identical to it, and the incoming document's `baseVersion` is not the current document version. That makes the trigger a natural concurrent CRDT persistence conflict, not entity-stress markup or a generated-spec fault. The PR's own unit test for the retry path asserts that an arbitrary `mergedRecord` is resent, but it does not model the observed mixed state where title remains local while content has regressed to the latest server body. Pass 177 reran the fixed branch's targeted unit verification:

```bash
npm run test:unit packages/core-data/src/test/actions.js -- --runInBand --testNamePattern='preserves save-time edits'
```

Result in `/Users/danluu/dev/fuzz/gutenberg-47950776c34e-pass171-knownfix` at `7f9aaaaad0286666ee92495c50f5093742e7fbc0`: passed (`31 skipped, 1 passed, 32 total`). The shortest remaining confidence experiment is still frequency measurement: run the natural Playwright repro as two distinct users over 20-50 iterations with modest HTTP latency/jitter and record how often a normal edit/save creates `rest_crdt_document_stale`.

Pass 178 rebased this explanation branch onto current `origin/trunk` `939b0ff02a9d3eaa9da4eb0a1e96dc325b71a801` (`Add RTC y-websocket-server tests (#78179)`). The newer trunk still has no `rest_crdt_document_stale`, `applyPersistedCRDTDoc`, or stale-save retry path under `packages` or `lib`, so the confirmed pass-171 data-loss mechanism remains a proposed-stack risk rather than a current-trunk user exposure. Exact `pr/77890` remains unchanged at `bd511b424f1e7077a59fb7f61f2f24cbd3b3c7eb`. Pass 178 also found that the named known-fixes checkout path is currently dirty and checked out to an unrelated bug branch, so this note relies on the manifest SHA `f256024286dd80a4c0e2579f658c109256abf648`, the exact PR head, and the dedicated fix worktree rather than the mutable checkout directory. The fixed branch's targeted unit verification still passes:

```bash
npm run test:unit packages/core-data/src/test/actions.js -- --runInBand --testNamePattern='preserves save-time edits'
```

Result in `/Users/danluu/dev/fuzz/gutenberg-47950776c34e-pass171-knownfix` at `7f9aaaaad0286666ee92495c50f5093742e7fbc0`: passed (`31 skipped, 1 passed, 32 total`). Pass 178's classification change is narrower and more release-focused: normal current-trunk likelihood is now `very-low`; conditional likelihood remains `medium` if `pr/77890` or equivalent retry logic ships without the preservation fix.

Pass 179 rebased this explanation note onto current `origin/trunk` `fc8b3db6ace471328e39453e3eed552ad4f3de7a` (`Dashboard: use design animation tokens (#78204)`). Targeted greps on trunk still find no `rest_crdt_document_stale` or `applyPersistedCRDTDoc` under `packages` or `lib`; the current save path still issues one `PUT`/`POST` and records the error instead of performing the proposed stale-save retry. The exact `pr/77890` head remains `bd511b424f1e7077a59fb7f61f2f24cbd3b3c7eb`, and that head still has the unsafe retry sequence: detect `rest_crdt_document_stale`, fetch the latest record, apply the persisted CRDT document, then retry with `select.getEditedEntityRecord()` and no save-time field preservation. The pass-171 fix branch still has the requested commit order, preserved natural Playwright repro, and annotated video. A fresh unit rerun was attempted in `/Users/danluu/dev/fuzz/gutenberg-47950776c34e-pass171-knownfix`, but it did not execute because both the known-fixes and main `node_modules` trees are absent, leaving the existing symlink target without `wp-scripts`; this pass therefore relies on the preserved pass-171/pass-174/pass-178 test evidence plus static inspection. The likelihood classification remains `very-low` for normal current-trunk users and `medium` for a build that ships the `pr/77890` stale retry without the preservation fix.
