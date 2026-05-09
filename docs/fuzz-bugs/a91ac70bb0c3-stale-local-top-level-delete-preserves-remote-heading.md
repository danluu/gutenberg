# a91ac70bb0c3: stale local top-level delete preserves remote heading

## Summary

The `a91ac70bb0c3` fuzz signature describes a real-time collaboration
divergence where one editor deletes a recently inserted top-level Heading, but a
stale full-block snapshot from another editor preserves or resurrects that
deleted Heading.

The exact HTTP fuzz row is non-runnable and has no archived generated spec in
the local handoff. It is still credible because the manifest marks it
high-confidence and describes it as a same-run duplicate of the
`4b50d5ef2b68` stale top-level insert/delete family. The same failure is also
reproducible at the CRDT merge layer and at the post-adapter layer with
ordinary Paragraph and Heading block arrays.

## User Workflow

A natural workflow uses the post editor with real-time collaboration enabled:

- User A and user B edit the same post.
- The post contains ordinary top-level Paragraph blocks.
- One user inserts a top-level Heading.
- Another user deletes that Heading.
- The first user continues editing another block while their local full-block
  snapshot is stale and still contains the deleted Heading.

The bug does not require malformed blocks, direct state mutation, custom block
types, or artificial server errors. It does require overlapping RTC sessions and
an unlucky stale snapshot ordering. HTTP polling can widen that timing window,
but the merge defect is in the shared block CRDT code, below the transport.

## Impact

The practical impact is content divergence and possible content corruption. A
Heading that one collaborator deleted can remain visible to another collaborator
and can be saved if that stale editor persists the post. There is no evidence of
a save loop, performance/OOM risk, or a broad REST persistence failure.
Recovery is manual: reload/reconverge and delete the stale block again, or use
post revisions after stale content is saved.

## Root Cause

As of current trunk `f4df834d9f8b64b610fd677087e79d0cd6632598`,
`mergeCrdtBlocks()` treats each local editor update as an
authoritative full block array. If the current Yjs document already incorporated
a remote delete, a later stale local array that still contains the deleted
block can be interpreted as a local insertion and can re-add that block.

The backlink-aware known-fixes base at
`f256024286dd80a4c0e2579f658c109256abf648` contains later stale-snapshot
reconciliation work, but a narrower variant remained there: the normal
`baseRecord.blocks` path bypassed stale-local reconciliation. Pass 178
independently reproved that adapter-level path through
`applyPostChangesToCRDTDoc()` on the exact `f256024286d` object and showed the
deleted Heading reappearing as `["Alpha local edit","Remote heading","Beta"]`.
Pass 179 repeated that adapter check with a temporary focused unit test: the
exact known-fixes object still failed, while the rebased fixed head passed.

The existing later fix commit
`c8af86c24a5c70784e4604b66b772a0511859a00` changes stale-local reconciliation
to accept base blocks and applies it before merge, so remote deletes that are
already present in the current CRDT document are not undone by stale full-block
snapshots.

## Evidence

- `likely-real-issues.jsonl:246` marks `a91ac70bb0c3` high-confidence and says
  seed `952388` is a real same-run duplicate of `4b50d5ef2b68`.
- `analysis-tier-likely-real-supplement.jsonl:622` says one peer retained an
  inserted Heading after a title edit, move, and later delete for the full
  convergence timeout.
- A direct CRDT repro fails before stale-snapshot reconciliation by leaving the
  deleted block in the final array. Pass 179 reran this at pre-fix commit
  `2877b0411ff` and saw `["Alpha local edit","Remote heading","Beta"]`;
  the rebased fixed head `76e8696ad06` passed the same test.
- A post-adapter repro fails on the official known-fixes SHA `f256024286d` and
  passes on the rebased fixed head `76e8696ad06`.
- Source inspection shows normal editor edits flow through `editEntityRecord()`,
  the sync manager, `applyPostChangesToCRDTDoc()`, and `mergeCrdtBlocks()`.
- A fresh pass-179 browser attempt was blocked before product actions: this
  worktree had no `build/`, so `gutenberg.php` returned before loading
  `lib/load.php`; `wp eval` showed `wp_is_collaboration_enabled()` was not
  defined. A subsequent `npm run build -- --skip-types` failed in the theme
  primitive-token generator before producing `build/scripts/blocks`.

## Fix Plan

Reconcile stale local full-block snapshots against the last known local block
base, or against an explicit `baseRecord.blocks` snapshot when one is supplied.
When a block existed in the local/base snapshot and still appears in the stale
incoming snapshot, but no longer exists in the current CRDT document, treat that
as a remote delete that must be preserved. Preserve local edits to blocks that
still exist, and preserve remote inserts that the stale local snapshot does not
know about.

This keeps the change local to block CRDT reconciliation. The implementation
uses client IDs and linear scans over block arrays already being merged. If
client IDs are missing or duplicated, it falls back to the existing positional
merge behavior rather than guessing.
