# RTC code editor insertion before freeform content can leave collaborators stale

Bug signature: `6b4ae1624fa5`

Bug type: `rtc_collaboration_code_editor_freeform_insert_not_synced`

## Summary

A real-time collaboration session can fail to converge when one collaborator edits the post in the code editor and inserts a serialized paragraph immediately before existing `core/freeform` content.

The realistic trigger is a legacy or mixed post whose visual block list already contains a normal block followed by Classic/freeform content. If user A switches to the code editor and pastes serialized content that inserts a paragraph between the existing paragraph and the freeform HTML, user B does not receive the inserted paragraph in the visual editor. User B remains on the stale block list.

This survived the May 7 known-fixes base `f256024286dd80a4c0e2579f658c109256abf648` (`rtc-known-fixes-current-20260507`). A focused known-fixes run failed with user B still seeing:

```json
[
	{ "name": "core/paragraph", "content": "RTC 6b4ae existing lead paragraph" },
	{ "name": "core/freeform", "content": "<p>Existing classic freeform content.</p>" }
]
```

instead of:

```json
[
	{ "name": "core/paragraph", "content": "RTC 6b4ae existing lead paragraph" },
	{ "name": "core/paragraph", "content": "RTC 6b4ae inserted between blocks" },
	{ "name": "core/freeform", "content": "<p>Existing classic freeform content.</p>" }
]
```

## Practical Impact

Likelihood: `medium`.

The workflow is ordinary editor behavior, but it is not the most common path. It requires:

- the post editor RTC surface;
- HTTP sync transport in the reproduced configuration;
- at least two collaborators in the same post;
- a post containing a visual block followed by Classic/freeform content, which is common for older or migrated posts;
- one collaborator using the code editor to edit serialized post content;
- no artificial network delay, malformed block injection, direct store mutation, save/reload step, or unusual timing window.

The uncommon part is the combination of active collaboration and manual code-editor editing. The common parts are legacy Classic/freeform content and inserting content before it. The failure is not just a UI locator or readiness problem: the remote editor's block list remains stale after the local code-editor edit is accepted and synced as post content.

Blast radius is content divergence during a live collaboration session. The inserting user keeps the paragraph locally, while the collaborator can continue from a stale block tree. If the stale collaborator edits or saves from that state, the inserted content is at risk of being overwritten or omitted. This is not a performance/OOM issue and not a save loop. Recovery is possible if the authoritative edited content is saved and the stale collaborator reloads or receives a later block update, but the session itself does not reliably converge.

Strong evidence for this classification:

- the repro uses the real post editor, real collaboration setup, real code editor textbox, and ordinary serialized post markup;
- the same scenario fails on the current known-fixes integration base;
- the failing collaborator state matches the root-cause analysis: `blocks` is synced as `undefined`, so the mounted block editor keeps its previous controlled blocks.

Strong evidence against a higher classification:

- code-editor editing during an RTC session is less common than visual editing;
- the reproduced case needs existing freeform content after another block, not a plain all-paragraph post;
- users who save from the inserting tab and force collaborators to reload may avoid persistent data loss.

The shortest confidence-improving experiment is to run the same natural-user Playwright repro against a post imported from an actual Classic Editor legacy post and then have the stale collaborator make a visual edit plus save, to measure whether the inserted paragraph is persistently lost.

## Root Cause

`packages/editor/src/components/post-text-editor/index.js` sends code-editor changes as serialized `content` and explicitly clears `blocks`:

```js
editEntityRecord( 'postType', type, id, {
	content: event.target.value,
	blocks: undefined,
	selection: undefined,
} );
```

That shape was made collaborative by `001a25614827` (`Real-time collaboration: Sync post content and undefined 'blocks' value (#75437)`). In `packages/core-data/src/utils/crdt.ts`, `applyPostChangesToCRDTDoc` treats a falsy `blocks` edit as an explicit CRDT value:

```ts
if ( ! newValue ) {
	ymap.set( key, undefined );
	break;
}
```

The local editor can parse serialized `content` back into blocks when there is no edited `blocks` value, but a mounted remote block editor does not reset from an undefined controlled value. `packages/block-editor/src/components/provider/use-block-sync.js` returns before resetting if `controlledBlocks` is undefined:

```js
if ( ! controlledBlocks ) {
	return;
}
```

The result is a split-brain editor state:

1. the CRDT document contains the new serialized post `content`;
2. the CRDT `blocks` field is explicitly `undefined`;
3. the collaborator's already-mounted visual editor keeps the previous block list;
4. the inserted paragraph is not delivered as a block update.

The bug is easiest to see when an existing paragraph precedes freeform content because the stale block list remains plausible and does not get replaced by reparsing the new serialized content.

## Fix Plan

Initial plan: when a code-editor edit sends both `content` and `blocks: undefined`, parse the serialized content and store the parsed blocks in the CRDT `blocks` array instead of leaving `blocks` undefined.

Robustness audit:

- Kernel-maintainer view: the fix should be local to the boundary where ambiguous serialized content enters the CRDT document. Downstream render hooks should not need to infer that an undefined CRDT value means "reparse another field now."
- Distributed-systems view: peers should converge on one representation. Syncing content while deliberately deleting the block CRDT state creates two authorities for the same document.
- Simplicity/performance view: parsing on every code-editor keystroke has a cost, so the parse should be limited to the explicit code-editor shape: an own `content` edit plus an own `blocks` property whose value is `undefined`. Normal visual-editor block edits should continue to merge block arrays directly.

Revised plan: in `applyPostChangesToCRDTDoc`, pre-detect the code-editor/revision shape, derive blocks from the raw serialized content with `parse`, and pass those parsed blocks through the existing `mergeCrdtBlocks` path for the `blocks` key. Empty content should become an empty block array, not an undefined block state. The original serialized `content` should still sync as text.

## Verification

Known-fixes failure command:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-current-20260507
WP_ENV_PORT=10086 WP_BASE_URL=http://localhost:10086 npm run test:e2e -- test/e2e/specs/editor/collaboration/manifest/6b4ae1624fa5-knownfix-repro.spec.ts --workers=1 --reporter=line --grep "between a paragraph"
```

Result: failed after about 100 seconds because the collaborator still had `[core/paragraph, core/freeform]` and never received the inserted middle paragraph.
