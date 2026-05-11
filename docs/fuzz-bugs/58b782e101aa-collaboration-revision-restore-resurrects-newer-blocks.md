# RTC revision restore can preserve newer blocks after reload

## Summary

Fuzz signature `58b782e101aa` reports that a real-time collaboration post can preserve content from a newer revision after the user restores an older revision and reloads the editor. The practical failure is persisted content corruption: the REST post content can contain the older restored paragraph plus a newer paragraph that the restore should have removed.

The natural repro uses ordinary editor operations:

1. Open the same draft post in two collaborating browser contexts over the HTTP RTC transport.
2. Type and save an older paragraph.
3. Append and save a newer paragraph.
4. Open the Revisions UI, select the older revision, and click Restore.
5. Reload the editor and inspect the editor block tree plus `/wp/v2/posts/<id>?context=edit`.

No malformed block markup, synthetic block tree mutation, or direct state edit is needed.

## Practical Impact

Real-user likelihood: `low` overall, `medium` conditional on an RTC-enabled team using revision restore.

Common prerequisites are normal paragraph editing, draft saves, revisions, and later reopening/reloading the post. Less common prerequisites are RTC/collaboration being enabled and a collaborator or second tab having already produced the newer persisted body/CRDT state. The restore itself is a recovery workflow, not a routine editing path. Fuzz-only details include the exact marker strings, immediate reload timing, and invariant polling.

Blast radius is content corruption, not just a transient UI mismatch. A user explicitly rolls back to an older revision, but newer content can be written back to `content.raw`. The expected recovery path is manual cleanup or another restore after the collaborative state no longer reintroduces the newer content. I saw no evidence for a save loop, OOM/performance issue, or broad persistence outage.

Evidence for the classification:

- The manifest row has `canonicalConfidence=high`, `canonicalRecommendedAction=file_bug`, and says newer blocks are resurrected and persisted after revision restore/reload.
- The Playwright repro uses natural actions: two collaborators, paragraph blocks, Save draft, Revisions UI, Restore, reload, and REST/editor assertions.
- The exact known-fixes base `f256024286dd80a4c0e2579f658c109256abf648` still saves revision restore through `restoreRevision()` with `blocks: undefined` and no restore option.
- The same known-fixes base calls `entityConfig.__unstablePrePersist( persistedRecord, edits )` without forwarding save options, and `prePersistPostType()` can merge latest CRDT or latest serialized block content into a locally changed `content` save.
- The known-fixes unit fixture `preserves latest trailing serialized blocks when a stale content edit submits an older shorter body` codifies the behavior that is correct for ordinary stale saves but wrong for revision restore.

Evidence against a higher overall likelihood:

- Revision restore is uncommon compared with normal editing, autosaves, and reloads.
- The bug requires RTC state from multiple collaborators/tabs or at least a prior collaborative session.
- Browser repros are readiness-sensitive around collaborator discovery and revision preview, although lower-level source analysis isolates the corruption path from those waits.

Shortest experiment to improve confidence: run the natural browser repro with the second collaborator closed after the newer save, then restore from the remaining editor while logging the restore request body and `_crdt_document` base/version. That would validate at full-editor level that a live peer is not required at restore time once the newer state is already persisted.

## Root Cause

Revision restore is an authoritative rollback, but the RTC save-preparation layer treats it as an ordinary stale local save.

On current trunk `569ea262b573872d5f364e9f4829132c47c683d4`, `packages/editor/src/store/private-actions.js` still applies revision content this way:

```js
const edits = {
	blocks: undefined,
	content: revision.content.raw,
};

dispatch.editPost( edits );
await dispatch.savePost();
```

The save has no context saying "this content is the selected older revision and must replace the latest content." In the backlink-aware known-fixes base, the post-type pre-persist hook fetches the latest record/CRDT state and can preserve latest trailing serialized blocks when a stale save submits a shorter body. That protection is useful for ordinary concurrent edits. It is invalid for revision restore because the latest state is precisely the state the user is rolling back from.

Relevant history:

- `1e90c30b08c` (`Real-time Collaboration: Fix revision restore bug (#75233)`) changed restore to parse revision blocks.
- `001a25614827` (`Real-time collaboration: Sync post content and undefined blocks value (#75437)`) changed restore back to `blocks: undefined` while syncing content and undefined blocks.
- Later RTC stale-save work added latest-CRDT/latest-serialized-content merge behavior in `packages/core-data/src/entities.js`.

The bug is the combination: revision restore lacks authoritative-save metadata, and stale-save merge logic cannot distinguish rollback from normal stale editing.

## Fix Plan

The refreshed PR branch uses three commits:

1. Add non-Playwright coverage for `restoreRevision()` and save-option forwarding into `__unstablePrePersist()`.
2. Add the natural-user Playwright repro.
3. Apply the fix.

The fix:

- Parse restored revision blocks in `restoreRevision()` so the editor block tree and serialized content agree on the selected revision.
- Call `savePost( { __unstableIsRevisionRestore: true } )`.
- Thread save options from `saveEntityRecord()` into entity `__unstablePrePersist()` hooks.
- Forward those options from the post-type entity wrapper into `prePersistPostType()`.
- In RTC stale-save stacks that merge latest persisted CRDT/serialized content, use the restore marker to skip the stale merge only for authoritative revision restores while preserving ordinary stale-save protection.

Robustness audit:

- Kernel-maintainer view: the option is internal, narrow, and tied to one restore call site.
- Distributed-systems view: revision restore chooses an authoritative value; it is not a CRDT merge with the value being rolled back.
- Simplicity/performance view: the fix adds no new network round trip or conflict algorithm. The main failure risk is option propagation, covered by focused unit tests.

## Pass 178 Status

Pass 178 verified that current trunk `569ea262b573872d5f364e9f4829132c47c683d4` has not independently fixed the restore/save path. The PR branch was rebased cleanly onto that trunk and pushed to:

```text
https://github.com/danluu/gutenberg/tree/try/collaboration-revision-restore-reload-resurrects-newer-blo-58b782e101aa-pr
```

Current PR-branch commit order after pass 178:

```text
a2d5489daec Add revision restore RTC regression test
bc2444e2972 Add RTC revision restore reload e2e repro
b281140d099 Preserve restored revision as authoritative RTC save
```

Focused checks after the pass-178 rebase:

```bash
npm run test:unit -- packages/core-data/src/test/actions.js --testNamePattern="passes save options to the entity pre-persist hook"
npm run test:unit -- packages/editor/src/store/test/private-actions.js --testNamePattern="restoreRevision\\(\\)"
npm run lint:js -- packages/core-data/src/actions.js packages/core-data/src/entities.js packages/core-data/src/test/actions.js packages/editor/src/store/private-actions.js packages/editor/src/store/test/private-actions.js test/e2e/specs/editor/collaboration/triage-58b782e101aa-realistic.spec.ts
git diff --check origin/trunk...HEAD
```

All passed.

Existing annotated video artifact:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-170/video/58b782e101aa/58b782e101aa-pass170-annotated.mp4
duration=24.000000
size=236011
```
