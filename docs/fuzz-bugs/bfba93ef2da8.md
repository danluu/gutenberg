# RTC paragraph insert/move nonconvergence after new paragraph reconciliation

Bug signature: `bfba93ef2da8`

The fuzz manifest classifies this as a likely real RTC bug:

- bug type: `rtc_paragraph_insert_move_nonconvergence_after_new_paragraph_reconciliation`
- transport: `http`
- source seed: `932003`
- manifest summary: seed `932003`'s `293003` vs `293007` paragraph split was stable across isolated seeded replays, and a UI-only two-user insert-then-alternating-move flow reproduced a real paragraph-tree divergence.

## Product Route

The affected route is the normal `core-data` RTC entity update path in the May 7 backlink-aware known-fixes base `f256024286dd80a4c0e2579f658c109256abf648`.

`editEntityRecord` sends post edits to the sync manager with:

```js
{ baseRecord: editedRecord, isNewUndoLevel }
```

`applyPostChangesToCRDTDoc()` then forwards `baseRecord.blocks` into `mergeCrdtBlocks()`. In that exact base, `mergeCrdtBlocks()` uses `baseBlocksToSync` as `previousBlocks`, but skips `reconcileStaleLocalBlocks()` whenever the explicit base exists:

```js
const previousBlocks =
	baseBlocksToSync ?? previousLocalBlocksCache.get( yblocks );
const blocksToSync = baseBlocksToSync
	? localBlocksToSync
	: reconcileStaleLocalBlocks( yblocks, localBlocksToSync );
```

That lets a stale full block snapshot from one editor be interpreted as a local deletion of a paragraph that another editor inserted concurrently.

## Natural Workflow

1. Two editors, users, or tabs edit the same post with RTC enabled.
2. The post contains ordinary top-level `core/paragraph` blocks.
3. Peer A inserts a paragraph near an existing paragraph.
4. Peer B receives that Yjs update, but its entity `baseRecord.blocks` still reflects the older top-level block list.
5. Peer B moves a neighboring existing paragraph.
6. The stale full block snapshot plus stale `baseRecord.blocks` causes the remote-only inserted paragraph to be dropped from the CRDT block list.

The exact seed strings and fuzz step order are artificial. The ingredients themselves are ordinary editor behavior: paragraph insertion, top-level block movement, two live editors, and the HTTP RTC transport.

## Verification

Pass 178 added an integration-level unit repro that exercises `applyPostChangesToCRDTDoc()` with `{ baseRecord: { blocks } }`, not only the lower-level `mergeCrdtBlocks()` helper.

Command on the exact known-fixes base:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-178/bfba93ef2da8-f256-integration
npm run test:unit -- packages/core-data/src/utils/test/crdt-bfba93ef-pass178-integration.test.ts --runTestsByPath --runInBand
```

Result:

```text
FAIL packages/core-data/src/utils/test/crdt-bfba93ef-pass178-integration.test.ts
Expected ["Tail", "Alpha", "Checkpoint", "Inserted by remote peer"]
Received ["Tail", "Alpha", "Checkpoint"]
```

The same repro passes on existing duplicate fix commit `c8af86c24a5c70784e4604b66b772a0511859a00`.

## Fix

The minimal fix is to run stale-local-block reconciliation even when `baseRecord.blocks` is supplied, using the explicit base as the previous local snapshot:

```js
function reconcileStaleLocalBlocks( yblocks, localBlocksToSync, baseBlocks ) {
	const previousBlocks =
		baseBlocks ?? previousLocalBlocksCache.get( yblocks );
	// ...
}

const blocksToSync = baseBlocksToSync
	? reconcileStaleLocalBlocks(
			yblocks,
			localBlocksToSync,
			baseBlocksToSync
	  )
	: reconcileStaleLocalBlocks( yblocks, localBlocksToSync );
```

This keeps the reconciliation generic: it depends on stable block `clientId`s, not on fuzz seed text or action names.

## Practical Impact

Likelihood on the affected known-fixes stack is `low`: the required edits are normal, but the race window is narrow and needs two live editors touching the same small paragraph region. Plain current `origin/trunk` on May 12, 2026 no longer shows this exact explicit `baseRecord.blocks` route, so this is best treated as a proposed-fix/integration-stack correctness bug unless that route re-enters trunk.

Blast radius is content loss or corruption in the live editor state. The inserted paragraph can disappear on both peers after the bad update propagates. A bad save can persist the missing paragraph. Recovery is manual: undo/reload before saving, copy from a peer that still has the text, or restore a post revision.
