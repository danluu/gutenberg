# RTC table move into Group stale-base corruption

Bug signature: `bcc959491960`

Transport in handoff: `http` (the archived artifact path is under `ws-gen-15`;
the defect is in the shared `core-data` CRDT block merge path).

## Summary

Moving a top-level Table into a Group can corrupt a collaborative peer's block
tree when that peer's previous local block snapshot still reflects an older
top-level order. The bcc-shaped replay is:

1. Both peers start with `Paragraph`, `Group(Paragraph, Heading)`, trailing
   `Heading`, and a top-level `Table`.
2. Peer A moves the Table to the top level before the Paragraph and syncs that
   reorder.
3. Peer B, whose previous local merge base still has the old
   `Paragraph, Group, Heading, Table` order, moves the same Table into the
   Group.

The expected root shape is:

```text
paragraph, group[table, paragraph, heading], heading
```

On the May 7 known-fixes base
`f256024286dd80a4c0e2579f658c109256abf648`, the deterministic replay produces:

```text
table, paragraph[table, paragraph, heading], heading
```

That is real block-tree corruption. The Table remains top-level and the
Group's intended children are grafted under a sibling Paragraph, creating an
invalid structure that can persist if the corrupted peer saves.

Pass 178 strengthened the low-level proof by adding a second replay through
`applyPostChangesToCRDTDoc()`. That path creates the same stale local block
cache used by normal post-entity RTC sync, applies the remote Table reorder as a
Yjs update, and then applies the local Table-into-Group edit. Both the direct
block merge replay and the post-adapter replay fail before the fix with the
same `table, paragraph[table, paragraph, heading], heading` corruption.

## Root Cause

The failure is the stale-index fallback in `mergeCrdtBlocksIntoYBlocks`.
The clientId-aware rebase path cannot handle this transition because the final
incoming top-level set has three blocks while the current Y doc and stale base
have four. The fallback then updates by array index while still passing
`previousBlocks[index]` as the merge base.

At the failing merge:

```text
previous local base: paragraph, group, heading, table
current Y doc:        table, paragraph, group, heading
incoming snapshot:    paragraph, group[table, paragraph, heading], heading
```

The stale base suppresses updates because the incoming block at index 0 matches
the stale Paragraph, even though the current Y block at index 0 is the Table.
At index 1, the stale base and incoming block are both the Group, so the current
Paragraph keeps its identity while receiving the Group's incoming children.
The original Group is then deleted by the length-difference delete step.

The same root cause also explains the sibling `87101fb17dd3` Quote/Group
failure. The narrow invariant is that an indexed stale merge base is only safe
when the previous block, incoming block, and current Y block represent the same
logical block clientId.

## Practical Impact

Likelihood: low.

The natural user workflow is a collaborative post editor session with RTC
enabled. The content uses ordinary blocks: Paragraph, Group, Heading, and
Table. One collaborator reorders a top-level Table; another collaborator moves
that same Table into a Group before their previous local merge base has caught
up. No save or reload is required for the live divergence, but saving the
corrupted peer can persist the bad structure.

Common prerequisites: multiple collaborators or tabs editing the same post,
ordinary Group/Table/Paragraph/Heading blocks, and ordinary block movement.

Rare prerequisites: a parent-changing move racing with a top-level reorder of
the same block while the acting peer still has a stale local block snapshot.
The deterministic replay uses CRDT-level snapshots to force that interleaving;
the archived handoff says a natural drag-and-drop repro was produced, but that
artifact was not present in the local roots for this pass.

Blast radius:

-   Content corruption: yes, the peer's block tree can become invalid.
-   Duplicate content: yes, the moved Table can appear both top-level and nested.
-   UI-only inconsistency: no, the CRDT block tree is wrong.
-   Persistence risk: possible if the corrupted peer saves.
-   Save loop/performance/OOM: not observed for this signature.
-   Recovery: reload may recover if only local live state is bad; after save,
    recovery likely requires undo, manual block repair, or post revisions.

## Fix Plan

Initial plan: extend the clientId-aware rebase path to support a top-level
removal plus nested insertion of the same clientId.

Robustness audit: that turns this bug into a broader tree-diff rewrite inside a
delicate CRDT path, increasing risk for deletes, nested moves, and blocks with
missing clientIds.

Distributed-systems correctness audit: the required invariant is simpler. A
stale base can only be used to suppress updates when it describes the same
object as both the current CRDT block and the incoming local block.

Simplicity/performance audit: a per-index clientId guard is O(1), leaves the
existing clientId-aware rebase behavior intact, and only disables stale-base
suppression when the fallback has already lost object alignment.

Revised fix: before passing `previousBlocks[index]` into the indexed fallback,
require the previous block, incoming block, and current Y block to share the
same clientId whenever any of them has one. If they do not align, merge the
incoming block without a stale base at that index.

## Verification

Failing before the fix on the known-fixes base, with both the direct
`mergeCrdtBlocks()` replay and the post-adapter stale-cache replay:

```sh
npm run test:unit packages/core-data/src/utils/test/rtc-bcc959-table-move-into-group-replay.test.ts -- --runInBand
```

Failure:

```text
Expected: paragraph, group[table,paragraph,heading], heading
Received: table, paragraph[table,paragraph,heading], heading
```

Passing after the fix:

```sh
npm run test:unit packages/core-data/src/utils/test/rtc-bcc959-table-move-into-group-replay.test.ts -- --runInBand
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
```

The targeted bcc replay and the general CRDT block suite passed after the fix.
The natural Playwright artifact recorded by the handoff manifest was not present
in the local artifact roots during this pass, so the browser-level proof remains
metadata-backed rather than locally rerun.
