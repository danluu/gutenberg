# RTC concurrent paragraph save/reload can lose stale local paragraph edits

Bug signature: `627bd1cfa5aa`

Bug type: `rtc_concurrent_paragraph_save_reload_corruption_empty_block_list`

Transport: HTTP polling RTC

## Summary

The May 2026 fuzz handoff classifies this as a high-confidence real RTC
correctness bug: seed `950007` repeatedly left a reloaded collaborator with an
empty block list after concurrent paragraph edits and save/reload
reconciliation.

The original generated spec and status artifacts were missing locally, so pass
172 reconstructed a natural same-user two-editor workflow on the backlink-aware
known-fixes base `f256024286dd80a4c0e2579f658c109256abf648`. That browser
probe reproduced a product failure before the original empty-list terminal
state: editor B typed a normal paragraph and clicked `Save draft`, but no REST
save carrying B's paragraph was emitted. Persisted post content stayed at the
initial paragraph plus editor A's paragraph, and B's paragraph disappeared from
the editor.

Pass 173 narrowed the root cause. In the synthetic known-fixes base,
`prePersistPostType` applies the latest persisted CRDT document whenever the
latest REST record has any persisted CRDT document:

```js
const shouldApplyLatestCRDTDoc =
	hasLatestPersistedCRDTDoc || locallyChangedSavedFields.length;
```

That is too broad. When a stale editor has a local content edit and the fetched
latest record's persisted CRDT document is byte-for-byte the same document that
the editor already had as its base, replaying that unchanged document can replace
or suppress the local content edit during save preparation.

Pass 174 repaired the PR-style branch verification. The pre-fix branch now fails
the focused unit repro because `applyPersistedCRDTDoc` is called with the
unchanged latest CRDT document; the final fix branch skips that replay, passes
the full `packages/core-data/src/test/entities.js` file, passes a production
build with `--skip-types`, and passes the natural same-user Playwright
save/reload repro.

## Evidence

- Manifest row:
  `/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/likely-real-issues.jsonl:211`
  reports `confidence:"high"`, `recommendedAction:"file_bug"`, seed `950007`,
  and a produced UI-only same-user repro.
- Clean known-fixes browser failure from pass 172:
  `/private/tmp/gutenberg-627bd1-pass172-knownfix-clean/repo/test/e2e/specs/editor/collaboration/manifest/627bd1cfa5aa-pass172-reload-oracle.spec.ts`
  failed because persisted content never contained B's marker.
- Clean known-fixes unit repro from pass 173:
  `npm run test:unit packages/core-data/src/test/entities.js -- --runInBand --testNamePattern='does not replay an unchanged persisted CRDT document over local save edits'`
  failed on `f256024286dd80a4c0e2579f658c109256abf648`; the unexpected call was
  `applyPersistedCRDTDoc( 'postType/page', 123, latestRecord )`.
- Pass 174's final PR branch gates CRDT replay on a changed latest persisted
  CRDT document or a changed server saved field, and passes the focused unit
  repro plus the full `entities.js` unit file.
- The same patched runtime preserved both concurrent paragraphs through reload
  in the natural browser probe. The strict pass-172 oracle still failed because
  it counted an intermediate REST `409` conflict response with an empty body as
  an empty-content save, but the attached scenario JSON showed final persisted
  content and the reloaded editor both had `Initial body`, marker B, and marker A.

## Practical Impact

Likelihood: `medium`.

Natural workflow:

- Post editor with RTC collaboration enabled over HTTP polling.
- Ordinary `core/paragraph` blocks.
- Two open editor sessions for the same post, either two tabs for one user or
  two collaborators.
- Editor A appends a paragraph and saves.
- Before editor B has reconciled A's save, editor B appends another paragraph
  and saves or reloads through the stale-save window.

Common prerequisites are paragraph editing, save draft, reload/rejoin, and more
than one editor session on a post. The rare prerequisite is timing: B must save
while its local saved-field base and the latest REST record are stale relative to
one another. The marker strings and assertion oracle are fuzz artifacts; the
editing, save, and reload operations are normal editor actions.

Blast radius is real content loss or corruption, not just a UI-only mismatch. In
the clean current-base browser repro, a paragraph typed by B was present in the
block-editor store before save but was never persisted. Recovery depends on an
open tab, undo history, autosave, or revisions still retaining the lost text.

## Fix Direction

Do not apply a fetched persisted CRDT document over local saved-field edits
unless that fetched document changed from the editor's persisted base, or unless
the server changed saved fields that require reconciliation.

The candidate gate tested in pass 173 was:

```js
const latestPersistedCRDTDoc =
	latestRecord?.meta?.[ POST_META_KEY_FOR_CRDT_DOC_PERSISTENCE ];
const basePersistedCRDTDoc =
	persistedRecord?.meta?.[ POST_META_KEY_FOR_CRDT_DOC_PERSISTENCE ];
const hasChangedLatestPersistedCRDTDoc =
	Boolean( latestPersistedCRDTDoc ) &&
	latestPersistedCRDTDoc !== basePersistedCRDTDoc;
const shouldApplyLatestCRDTDoc =
	serverChangedSavedFields.length || hasChangedLatestPersistedCRDTDoc;
```

The fix needs to land in the same stack as the proposed stale-save protections
that introduced `prePersistPostType`; `origin/trunk` at
`80699422e63` does not yet contain that code path.
