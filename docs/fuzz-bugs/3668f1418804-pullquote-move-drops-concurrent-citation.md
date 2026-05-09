# RTC Pullquote Move Drops Concurrent Citation

Signature: `3668f1418804`

Bug type: `rtc_pullquote_move_causes_cross_peer_block_type_divergence`

Transport: HTTP RTC

## Summary

The original fuzz report said that seed `950044` could leave two collaborators
with different block trees after a Pullquote citation edit and a later block
move: one peer kept `core/pullquote`, while the other had a `core/paragraph`
with leaked Pullquote attributes and duplicated paragraph content.

The exact seed artifacts are not available locally, and earlier single-doc
replays showed that the May 7 known-fixes base composes a Pullquote move and a
citation edit when both operations are replayed through `baseRecord`. Pass 174
found a narrower surviving defect that those single-doc replays miss: with two
Yjs peers initialized from the same post, one peer moves the Pullquote and the
other peer edits its citation concurrently. After exchanging Yjs updates, both
peers converge to the moved Pullquote with the old citation.

Pass 177 reran the current-base two-peer interleaving with block-library schemas
registered for `core/paragraph`, `core/heading`, and `core/pullquote`. The same
delete-and-clone move loses undelivered edits to `core/heading.content` and
`core/paragraph.content`, so the surviving defect is not Pullquote-specific. The
original historical endpoint is still Pullquote-specific in the available
manifest evidence, but the root cause affects ordinary text blocks too.

This is content loss in the normal `baseRecord` path, not a malformed block
injection. It does not reproduce the exact historical `core/paragraph` shell,
but it exercises the same user-visible operation family.

## Reduced Operation

Initial top-level blocks:

1. `p1`: `core/paragraph`, content `Before`
2. `q1`: `core/pullquote`, value `Quoted text`, citation `Old citation`
3. `p2`: `core/paragraph`, content `After`

Concurrent user operations:

1. Peer A moves `q1` before `p1`.
2. Peer B edits `q1.attributes.citation` to `New citation`.
3. Both local edits call `applyPostChangesToCRDTDoc()` with
   `baseRecord.blocks` equal to the initial block array.
4. The peers exchange Yjs updates.

Expected converged state:

```text
q1:core/pullquote:New citation | p1:core/paragraph:Before | p2:core/paragraph:After
```

Observed on `f256024286dd80a4c0e2579f658c109256abf648`, the May 7
backlink-aware known-fixes base:

```text
q1:core/pullquote:Old citation | p1:core/paragraph:Before | p2:core/paragraph:After
```

## Interleaving Boundary

Pass 176 reran the scenario as a two-peer interleaving matrix on
`f256024286dd80a4c0e2579f658c109256abf648`:

```text
concurrent stale-base move vs citation edit:
q1:core/pullquote:Old citation | p1:core/paragraph:Before | p2:core/paragraph:After

citation delivered before move and included in the mover's base:
q1:core/pullquote:New citation | p1:core/paragraph:Before | p2:core/paragraph:After

move delivered before citation edit:
q1:core/pullquote:New citation | p1:core/paragraph:Before | p2:core/paragraph:After

citation update already in the mover's Yjs doc, but the UI/base still stale:
q1:core/pullquote:New citation | p1:core/paragraph:Before | p2:core/paragraph:After
```

That narrows the practical trigger. The loss requires the citation edit not to
have reached the mover's local CRDT document before the move is encoded. A stale
React/editor-store snapshot is not sufficient by itself once the remote Yjs edit
has already been applied locally, because the rebase clone is made from the
current Yjs block payload.

## Pass 178 Identity Proof

Pass 178 reran the two-peer interleaving on
`f256024286dd80a4c0e2579f658c109256abf648` and recorded the nested Yjs object
identities for the Pullquote block, its attributes map, and its citation
`Y.Text`.

Before the move, both peers shared the same visible `q1` object identities:

```text
MOVER_INITIAL_Q1 map=3494954224:14 attrs=3494954224:18 citation=3494954224:31 text=Old citation
EDITOR_INITIAL_Q1 map=3494954224:14 attrs=3494954224:18 citation=3494954224:31 text=Old citation
```

The editor's citation update was a valid update against that object. Applying
the exact same Yjs update to an unmoved control doc changed the visible citation:

```text
EDITOR_AFTER_CITATION_EDIT_Q1 map=3494954224:14 attrs=3494954224:18 citation=3494954224:31 text=New citation
EDIT_ONLY_CONTROL_Q1 map=3494954224:14 attrs=3494954224:18 citation=3494954224:31 text=New citation
```

If that update reached the mover before the move was encoded, the moved clone
preserved the new citation:

```text
DELIVERED_BEFORE_MOVE_CONTROL_Q1 map=3650108969:0 attrs=3650108969:4 citation=3650108969:17 text=New citation
```

If the mover encoded the move first, `rebaseYBlocksByClientId()` replaced the
visible Pullquote with a new block/attributes/citation object while tombstoning
the old one:

```text
MOVER_AFTER_MOVE_BEFORE_DELAYED_EDIT_Q1 map=3494954224:57 attrs=3494954224:61 citation=3494954224:74 text=Old citation
MOVE_REPLACED_VISIBLE_OBJECTS true true true
OLD_MOVER_OBJECT_AFTER_MOVE mapDeleted=true attrsDeleted=true citationDeleted=true citationText=
```

Applying the delayed edit update after that did not affect the visible clone:

```text
MOVER_AFTER_DELAYED_EDIT_Q1 map=3494954224:57 attrs=3494954224:61 citation=3494954224:74 text=Old citation
VISIBLE_OBJECT_STABLE_AFTER_DELAYED_EDIT true true
```

This turns the root-cause hypothesis into a concrete CRDT identity failure: the
remote edit targets the pre-move nested object, while the move publishes a
different visible nested object. The bug is not caused by an invalid
Pullquote schema, an invalid rich-text edit update, or a stale React snapshot
alone.

## Block-Type Scope

Pass 177 used the same product CRDT entry point,
`applyPostChangesToCRDTDoc()`, with real registered block schemas and a detached
worktree at the known-fixes base
`f256024286dd80a4c0e2579f658c109256abf648`.

The same interleaving produced:

```text
SCENARIO pullquote-citation-edit-vs-same-block-move
A q1:core/pullquote:Old citation | p1:core/paragraph:Before | p2:core/paragraph:After
B q1:core/pullquote:Old citation | p1:core/paragraph:Before | p2:core/paragraph:After

SCENARIO heading-content-edit-vs-same-block-move
A h1:core/heading:Old heading | p1:core/paragraph:Before | p2:core/paragraph:After
B h1:core/heading:Old heading | p1:core/paragraph:Before | p2:core/paragraph:After

SCENARIO paragraph-content-edit-vs-same-block-move
A p2:core/paragraph:Old paragraph | p1:core/paragraph:Before | p3:core/paragraph:After
B p2:core/paragraph:Old paragraph | p1:core/paragraph:Before | p3:core/paragraph:After
```

This does not prove the original `core/pullquote` to `core/paragraph` shell
divergence for paragraphs or headings. It does show the user-visible content-loss
mechanism is a general top-level same-block move/edit race for rich-text
attributes.

## Root Cause Hypothesis

`mergeCrdtBlocks()` rebases top-level moves by `clientId`, but the Yjs array
move is implemented as delete plus insert of a cloned `Y.Map`.

That is safe for single-doc sequential replay, because the later merge can find
the cloned block by `clientId`. It is not safe for concurrent Yjs updates:
the citation edit is applied to the original `q1` `Y.Map`, while the move update
deletes that original map and inserts a clone. When the updates merge, the
delete tombstones the map that received the citation edit.

Yjs does not allow simply deleting and reinserting the same integrated nested
type. A robust fix probably needs to separate stable block identity from order,
for example storing block payloads by `clientId` and top-level order as a
separate sequence, or another design that does not express reordering by
destroying the edited nested map.

## Practical Impact

Real-user likelihood: `medium` for the underlying same-block move/edit
content-loss race, and `low` for the exact Pullquote citation workflow from this
signature.

The user workflow is natural but narrow: two collaborators or browser tabs edit
the same post over RTC, one collaborator edits a rich-text attribute on a block,
and another collaborator moves that same block before the text update reaches the
mover's local CRDT document. The Pullquote citation version is narrower because
it requires a Pullquote and its citation field, but pass 177 reproduced the same
loss with Heading and Paragraph content, which are common editor blocks. On the
HTTP polling provider in this base, the collaborator poll interval is 1 second
before network and server latency. No save or reload is required for the live
loss. A later save can persist the stale text if no peer repairs it first.

Common prerequisites: collaborative editing, editing paragraph or heading text,
and moving blocks are ordinary editor behavior.

Rare prerequisites: both users must act on the same block concurrently, and one
edit must be a structural move while the other changes rich-text content before
the mover receives the remote edit.

Artificial prerequisites in the reduction: deterministic two-peer Yjs update
ordering. The reduction does not use malformed blocks, direct editor-state
mutation, or invalid serialized HTML.

## Fix Direction

Short-term guard patches that only reconcile stale arrays before rebasing are
not enough for this case. The failure comes from losing updates to a deleted
nested Yjs map during a concurrent move. The fix should preserve a block's CRDT
identity across top-level reorder operations, or otherwise merge concurrent
edits from the old map into the moved representation before the delete can
erase them.

Any fix should include a two-peer Yjs regression that creates two docs, applies
the move on one and the citation edit on the other with the same base snapshot,
exchanges updates, and asserts both the move and citation survive.
