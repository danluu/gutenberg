# RTC group reparent stale-edit corruption

Bug signature: `bcbe66104201`

## Summary

The RTC block merge path can drop a collaborator's paragraph edit when another collaborator moves that same paragraph from the top level into a Group before the stale editor has received the move.

The original fuzz signature reported a stronger wrapper-corruption shape where a Paragraph shell inherited Group children. The refreshed browser artifact did not reach the move and is not product evidence by itself, but a smaller CRDT replay on the current backlink-aware known-fixes base shows the same move-into-Group family still has a real content-loss route.

## User workflow

1. Two collaborators edit the same post over the websocket RTC transport.
2. The post contains ordinary Paragraph blocks and a Group block.
3. Collaborator B moves a top-level Paragraph into the Group, for example through List View.
4. Before collaborator A receives that move because of normal network delay, collaborator A edits the still-top-level Paragraph.
5. The stale editor syncs its local snapshot after receiving the remote reparent.

Expected result: the Paragraph is nested inside the Group and keeps collaborator A's edit.

Observed result on known-fixes base `f256024286dd80a4c0e2579f658c109256abf648`: the nested Paragraph keeps the old text, so collaborator A's edit is lost.

## Root cause

`mergeCrdtBlocks()` stores block structure as nested `Y.Array<Y.Map>` values. A same-parent reorder can be rebased by `clientId`, but moving a block across parents changes the top-level clientId set and falls through to the indexed diff in `mergeCrdtBlocksIntoYBlocks()`.

For the stale editor:

- the previous local cache says the target Paragraph is top level;
- the current Y document says that clientId now exists under the Group;
- `reconcileStaleLocalBlocks()` filters the stale top-level target as remotely deleted;
- reconciliation only compares blocks within the same parent array, so it never applies the local paragraph edit to the moved block now under the Group.

The adjacent wrapper-smear risk comes from the same fallback: indexed updates can pair a current Y block, incoming block, and previous base block with different clientIds unless the base is guarded.

## Fix plan

The fix branch adds two guards:

- indexed fallback bases are only used when the previous block, incoming block, and current Y block share the same clientId;
- stale local reconciliation walks the whole block tree by clientId and applies local edits to the current location of a block whose parent changed remotely.

This keeps normal same-parent merge behavior intact while covering the cross-parent move case that ordinary List View actions can create.

## Impact

Real-user likelihood: `medium`.

The required workflow is plausible for RTC users: two collaborators, ordinary Paragraph and Group blocks, a List View move, and a network-delay race. RTC itself is still a specialized collaboration feature, and the timing window is narrower than single-user editing, but the actions are normal editor actions.

Blast radius is content loss or block-tree corruption in the edited post. I found no evidence of an OOM risk or save loop for this signature. If noticed immediately, undo may recover; after save, recovery likely depends on revisions or manual cleanup.

## Verification

Non-browser replay:

```sh
npm run test:unit packages/core-data/src/utils/test/rtc-bcbe661-group-move-stale-edit-replay.test.ts -- --runInBand
```

Regression coverage:

```sh
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
```

The attempted websocket Playwright repro uses normal editor actions but is not yet a clean product artifact: in this local pass, the browser hydrated a stale RTC Yjs state from an earlier post ID before the target List View locator was available, while the REST post content itself was correct.
