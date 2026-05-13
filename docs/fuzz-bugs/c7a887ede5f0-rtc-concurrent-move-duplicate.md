# RTC concurrent block moves can corrupt adjacent blocks

Bug signature: `c7a887ede5f0`

Observed fuzz symptom: after a checkpoint/reload path with RTC over HTTP, one peer lost a saved Search block and kept a duplicate of the adjacent Table. The exact archived browser fault schedule was not available locally during passes 178 through 180, but the underlying current-base failure is reproducible at the CRDT product-adapter level.

## Practical Impact

Real-user likelihood is medium for the generic corruption class and low for the exact Search-drop/Table-duplicate terminal state.

A natural trigger is two collaborators editing the same post before either receives the other's structural update. The smallest verified shape uses five ordinary Paragraph blocks. One collaborator moves Paragraph A down across Paragraph C while another collaborator, from the same base, moves Paragraph B down across Paragraph C. When the Yjs updates are exchanged, the current merge code can expose two logical copies of Paragraph C. A later ordinary local edit rekeys one duplicate instead of merging or removing it, leaving six unique block ids and two user-visible Paragraph C contents.

Common prerequisites are RTC collaboration, multiple tabs or users, normal Paragraph blocks, normal block move actions, and enough network or polling delay for same-base edits. Rare prerequisites are concurrent structural moves in the same sibling list. The Search/Table fuzz symptom adds a less common block layout, checkpoint save/reload history, and an injected retriable sync failure.

The blast radius is real content corruption: duplicate visible content, corrupted rich-text content, and potentially missing adjacent structure if the corrupted tree is saved. Pass 180 shows the bad CRDT state is returned by `getPostChangesFromCRDTDoc()` as ordinary editor record changes, so a save from that state would persist the corrupted block list. There is no evidence for a save loop, editor crash, REST-only persistence bug, or performance/OOM risk. Recovery is undo while history is intact, manual content repair, or restoring a post revision after persistence.

## Evidence

Pass 180 added an extracted-changes proof on exact known-fixes commit `f256024286dd80a4c0e2579f658c109256abf648`:

```text
packages/core-data/src/utils/test/crdt-c7a887ede5f0-pass180-extracted-changes.test.ts
```

The serialized control passes. The same-base concurrent move case fails after a later normal edit, and the failure is observed through `getPostChangesFromCRDTDoc()` rather than only by inspecting a raw Y.Array:

```text
c7a887ede5f0 pass180 post-adapter extraction
  ✓ keeps one paragraph per clientId when adjacent moves are serialized
  ✕ does not expose duplicate moved content as extracted post changes after a later edit

Received:
  b: Beta
  c: Gamma edited after duplicate
  a: Alpha
  1288ad01-d84e-463b-b888-45954cde1d7c: Gamma
  d: Delta
  e: Epsilon
```

Pass 180 also ran the same extracted-changes test on current `origin/trunk` at `cb74beb786b366ff69dac328b04861add1a67974`. It fails through the older rich-text smear path, again as extracted post changes:

```text
Received:
  b: Beta
  c: Gamma edited after duplicate
  260a156c-310c-4266-964a-8032c2a12e04: AlphBeta
  d: Delta
  e: Epsilon
```

Pass 179 added a current `origin/trunk` control at `e20ec719971cebf6d7071ec2ea995a065d66ba72`. That branch does not yet have the known-fixes `baseRecord` reorder code, but the older positional merge path is also unsafe under the same user-level interleaving:

```text
packages/core-data/src/utils/test/crdt-c7a887ede5f0-pass179-origin-trunk-control.test.ts
```

The serialized control passes, while the same-base concurrent case converges to five unique clientIds with corrupted visible content:

```text
c7a887ede5f0 origin trunk same-base move control
  ✓ preserves one paragraph per clientId when the same moves are serialized
  ✕ preserves one paragraph per clientId after same-base paragraph moves and a later edit

Expected contents include: Alpha
Received contents include: AlphBeta
```

This is not a duplicate-id artifact. It is a current-trunk content corruption route from ordinary Paragraph moves.

Pass 179 also reran the same paragraph scenario on exact known-fixes commit `f256024286dd80a4c0e2579f658c109256abf648`, using the `baseRecord` product path from that synthetic fix stack:

```text
packages/core-data/src/utils/test/crdt-c7a887ede5f0-pass179-f256-knownfix-control.test.ts
```

The serialized control passes, while the same-base concurrent case fails with six blocks and duplicated Gamma content:

```text
c7a887ede5f0 f256 known-fixes same-base move control
  ✓ preserves one paragraph per clientId when the same moves are serialized
  ✕ preserves one paragraph per clientId after same-base paragraph moves and a later edit

Expected length: 5
Received length: 6
Received array:
  b: Beta
  c: Gamma edited after concurrent moves
  a: Alpha
  f501a6c1-f1a4-4cc0-acde-74a4dea1f538: Gamma edited after concurrent moves
  d: Delta
  e: Epsilon
```

Pass 178 created a temporary repro on exact known-fixes commit `f256024286dd80a4c0e2579f658c109256abf648`:

```text
packages/core-data/src/utils/test/crdt-c7a887ede5f0-pass178-divergent-duplicate.test.ts
```

The focused run produced:

```text
c7a887ede5f0 pass178 concurrent move duplicate fork
  ✓ preserves one paragraph per clientId when the same moves are serialized
  ✓ diagnoses that a later ordinary edit forks the duplicated paragraph
  ✕ preserves one logical paragraph after concurrent moves and a later edit

Expected length: 5
Received length: 6
Received array:
  b: Beta
  c: Gamma edited after duplicate
  a: Alpha
  c80c3eda-a063-4298-b9ff-13eaadfeba11: Gamma
  d: Delta
  e: Epsilon
```

The pass 178 and pass 179 known-fixes results matter because the final state no longer has only duplicate `clientId` metadata. The cleanup path has converted one copy into a distinct block id, while preserving duplicated content.

## Root Cause

There are two closely related current paths:

- On current `origin/trunk`, the positional merge path updates existing Y blocks in place when two same-base reorders race. Concurrent rich-text updates can then compose against the wrong logical block; pass 179 produced `AlphBeta`.
- On the known-fixes `f256024286d` base, the product edit path sends the pre-edit record as `baseRecord` to the sync manager. `applyPostChangesToCRDTDoc()` forwards `baseRecord.blocks` to `mergeCrdtBlocks()`.

In the known-fixes base, top-level reorder/rebase represents a move as delete plus insertion of a newly created Y block:

- `reorderYBlocksByClientId()` creates a new Y block, deletes the old item, and inserts the clone at the target index.
- `rebaseYBlocksByClientId()` does the same when a base record is present.

If two peers perform different same-base moves concurrently, both inserted clones survive Yjs merge. The local duplicate cleanup runs during local merge, but the remote-applied duplicate can be exposed. A subsequent local edit falls through duplicate cleanup and rekeys the later duplicate to a UUID. That prevents duplicate `clientId`s but preserves the duplicated logical content.

## Fix Constraints

A safe fix needs deterministic conflict semantics for concurrent moves. A patch that only rekeys duplicate client ids keeps the corrupted content. A patch that blindly deletes one clone can drop concurrent edits or inner blocks.

The regression suite should include:

- same-parent concurrent moves of ordinary Paragraph blocks;
- Search/Table/Pullquote/Group-shaped moves from the fuzz family;
- reparenting into inner block lists;
- concurrent content or attribute edits to a moved block;
- repeated and out-of-order Yjs update application;
- save/reload persistence after the corrupted state is created.

The shortest confidence-improving browser experiment is a two-page HTTP RTC Playwright test with five Paragraph blocks, delayed delivery so both pages act from the same base, normal toolbar move-down actions for Paragraph A and Paragraph B, then a normal edit to one duplicated paragraph followed by save/reload assertions.
