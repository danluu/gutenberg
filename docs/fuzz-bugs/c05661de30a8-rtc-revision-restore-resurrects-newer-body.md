# RTC revision restore can resurrect newer body content

## Summary

Fuzz signature `c05661de30a8` covers an RTC revision-restore corruption path. With collaborative editing enabled over the HTTP polling transport, a user can save an old body revision, save a newer body revision, restore the old revision through the normal Revisions UI, and then reload into a persisted mixed state that still contains the newer body block.

The original generated spec was not preserved in runnable form, but pass 173 reconstructed the natural workflow for this exact signature. The repro uses ordinary paragraph blocks, two browser users, draft saves, the editor Revisions UI, restore, reload, and a REST `content.raw` invariant. No malformed blocks, synthetic block tree mutation, direct store mutation, or injected network fault is required.

## Practical Impact

Real-user likelihood: `medium`.

Common prerequisites: paragraph editing, saving drafts, using the post editor, and restoring a revision are normal WordPress workflows.

Less common prerequisites: RTC must be enabled, a second user or tab must be present or have left collaborative state behind, and the user must restore an older revision after newer collaborative body content has been saved. The exact marker strings and immediate REST assertion are fuzz/test artifacts; the editing and restore workflow is ordinary.

Blast radius: persisted content corruption. The user asks WordPress to roll the post body back, but newer body blocks can remain in `content.raw` after restore and reload. This is not only a UI preview problem once the REST post record contains the resurrected block. I found no evidence in this signature for a save loop, OOM, or broad performance failure. Recovery is manual cleanup or a later restore after the stale collaborative state can no longer reintroduce the newer content.

Strongest evidence for `medium`:

- `likely-real-issues.jsonl:239` records `c05661de30a8` as high-confidence, canonical, HTTP, non-runnable, with the old-title/new-body mixed-state summary.
- The known-fixes base commit is `f256024286dd80a4c0e2579f658c109256abf648`, the manifest's buildable synthetic integration of the backlink-aware RTC fix stack.
- Pass 173 ran the exact c056 natural Playwright flow against a worktree using the known-fixes build output. It reached the restore/reload invariant and failed because persisted `content.raw` contained both `rtc-triage-c05661de30a8-old` and `rtc-triage-c05661de30a8-new`.
- Pass 172's lower-level probe showed the same semantic failure inside `prePersistPostType()`: a restore-shaped shorter body save from `[old, new]` to `[old]` is treated as stale local content and returns merged content containing `[old, new]`.
- Pass 174 checked the relevant stale-save PR head separately (`origin/pr/77876`, `6aad4e5801a`). That head independently has `restoreRevision()` using `blocks: undefined` and plain `savePost()`, plus `mergeStaleSerializedBlockContent()` and no revision-restore escape hatch, so this is not just an artifact of the synthetic known-fixes conflict resolution.

Strongest evidence against `high`:

- Revision restore is rarer than ordinary collaborative editing.
- The workflow needs RTC collaboration and usually two tabs or two users.
- The preserved canonical source artifact is not runnable, so exact evidence now comes from reconstruction plus the manifest row rather than the original generated spec.
- The Playwright path is harness-sensitive around wp-env config, build output, and revision-slider selection.

The shortest additional confidence experiment is to run the same exact c056 flow twice on the known-fixes base: once closing the collaborator before restore and once keeping it open. Log the restore save payload, final REST `content.raw`, and `_crdt_document` base version. That separates active-peer requirements from persisted-CRDT-only resurrection.

## Root Cause

`restoreRevision()` in the known-fixes base restores serialized revision content but saves it like an ordinary post edit:

```js
const edits = {
	blocks: undefined,
	content: revision.content.raw,
};
dispatch.editPost( edits );
await dispatch.savePost();
```

That is wrong under RTC stale-save protection. A revision restore is an authoritative rollback, not a normal stale edit that should merge with the latest collaborative body. The known-fixes pre-persist path fetches the latest REST record, applies the latest persisted CRDT document, and can call `mergeStaleSerializedBlockContent()` for locally changed content. For ordinary saves this preserves concurrent work; for revision restore it can reintroduce the newer block the user explicitly rolled back.

Origin chain:

- `1e90c30b08c` (`Real-time Collaboration: Fix revision restore bug (#75233)`) parsed restored revision content into blocks.
- `001a25614827` (`Real-time collaboration: Sync post content and undefined blocks value (#75437)`) changed restore back to `blocks: undefined`.
- `5bda437f0cc4` (`Preserve saved content from stale editor snapshots`) added the stale-save preservation layer that is correct for normal concurrent saves but needs a restore escape hatch.

## Fix Plan

Initial plan:

1. Parse `revision.content.raw` in `restoreRevision()` so the restored block tree is locally authoritative.
2. Mark the subsequent save with a narrow internal option, `__unstableIsRevisionRestore`.
3. Thread save options through `saveEntityRecord()` and post-type `__unstablePrePersist()`.
4. In the stale-save CRDT merge path, skip the latest-persisted-CRDT/body merge only for revision restores, while still creating a fresh persisted CRDT document for the restored body.

Kernel-maintainer robustness audit: the option is internal, scoped to one editor action, and ordinary saves keep stale-save protection.

Jepsen-style correctness audit: restore is an explicit write that should dominate prior collaborative state. Peers should converge to the restored revision after the save, not merge back the newer body.

Simplicity/performance audit: the fix adds no polling, no new network request, and no new merge algorithm. The main risk is option leakage into ordinary saves, covered by the focused unit test asserting only `restoreRevision()` sends the restore option.

Revised plan after pass 173: keep the trunk-facing branch with parsed restore blocks and option plumbing, and apply the pre-persist guard in the branch where the stale-save CRDT code lands. The exact c056 Playwright repro now reaches the persisted-content failure and should be retained as the natural-user regression test.

Pass 174 rebased the trunk-facing PR branch to `origin/trunk` `b38f9b4d86d`. Current trunk still does not contain the stale-save body merge from PR `77876`, so the branch remains a forward-compatible restore fix plus option plumbing; the pre-persist restore guard must be applied when that stale-save code lands.

## Verification

Pass 173 exact c056 natural repro command:

```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
WP_ENV_PORT=10138 \
WP_BASE_URL=http://localhost:10138 \
WP_ENV_PHPMYADMIN_PORT=10140 \
RTC_MANIFEST_WS_START_PORT=22304 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-c05661de30a8-realistic.spec.ts --reporter=line
```

Result with known-fixes build output: failed at the intended product invariant. `persistedContent` contained both `rtc-triage-c05661de30a8-old` and `rtc-triage-c05661de30a8-new` after restore and reload.

Focused unit verification on the rebased PR branch:

```bash
npm run test:unit -- packages/editor/src/store/test/private-actions.js
```

Result: passed.
