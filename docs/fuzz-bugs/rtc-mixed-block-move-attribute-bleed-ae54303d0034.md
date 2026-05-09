# RTC mixed block move attribute bleed (`ae54303d0034`)

## Summary

The fuzz signature describes an RTC collaboration race where one editor applies a
top-level block move from an older block snapshot while another editor's mixed
block insert and edits have already reached the shared Y document. On the
known-fixes base `f256024286d`, the deferred `SyncManager.update()` path still
forwards the stale `baseRecord.blocks` snapshot to `mergeCrdtBlocks()` without
reconciling remote-only top-level blocks. The result is persistent block tree
corruption: the remote inserted paragraph is dropped, and affected fuzz runs also
showed cross-type attribute bleed around Pullquote, Search, and Table blocks.

Pass 173 added a SyncManager-level reconstruction of the race, and pass 177
reverified the same pass/fail split after rebasing this explanation onto current
`origin/trunk`:

1. Load a post with `lead`, Pullquote, Search, Table, and `tail` blocks.
2. Apply a remote Pullquote/Search/Table edit plus a remote paragraph insert
   between Search and Table.
3. Before the local store fully settles that remote edit, schedule a local move
   of `lead` to the end with the stale `baseRecord.blocks` captured before the
   remote insert.
4. Observe that pre-fix commit `9b8a2f92d30` drops `remote-insert`, while fix
   commit `0bec707c58f` preserves `pullquote, search, remote-insert, table,
   tail, lead` and the remote attributes.

## Practical Impact

Real-user likelihood is **very low** for ordinary manual editing. The block
types and action are ordinary: two collaborators in the post editor, a mixed
top-level block list, a remote insert or edit, and a local block move. The rare
prerequisite is timing: the local move must be scheduled after a remote `blocks`
update has reached the local Y.Doc and incremented the remote-key version, but
before the asynchronous remote-to-core-data reconciliation has updated the
edited-record snapshot used as `baseRecord`. In normal browser scheduling,
promise continuations from the WebSocket task usually finish before a separate
human click or key event can dispatch. The likelihood is closer to low for
plugin code, automation, or a fuzzer that can dispatch the local move in the
same turn. Multiple browser tabs or users are required. Network delay is not
required, but provider/store latency and rapid queued edits make the window
easier to hit. Save/reload is not needed for the short `954196` shape, although
related duplicate signatures used checkpoint/save history.

The blast radius is content corruption, not a UI-only inconsistency. A dropped
remote paragraph or smeared heterogeneous block attributes can be persisted if
the corrupted peer saves. Recovery is manual undo while the session still has a
usable history, or revision/manual block cleanup after persistence. I found no
evidence of save loops, OOM, or performance collapse.

## Root Cause

`editEntityRecord()` captures the current edited record and calls
`SyncManager.update(..., { baseRecord: editedRecord })`. `SyncManager.update()`
defers the actual CRDT write with `setTimeout(0)` and records remote key version
counters. The remote-key guard filters local updates when a newer remote edit
arrives after scheduling, but it allows updates scheduled after the remote
version counter has already advanced. In that allowed window, the store snapshot
can still be stale.

The known-fixes base already reconciles stale local block snapshots when
`mergeCrdtBlocks()` relies on its `previousLocalBlocksCache`. It does not do the
same reconciliation when explicit `baseBlocks` are supplied. That explicit
`baseBlocks` path is the normal product path for `editEntityRecord()` updates.

The fix is to use the supplied `baseBlocks` as the previous snapshot inside
`reconcileStaleLocalBlocks()`, then pass the reconciled block list into the
existing clientId-based rebase. This preserves remote-only top-level inserts and
remote sibling attribute edits while still applying the local move.

## Evidence

- Manifest row 223: `rtc_mixed_block_move_attribute_bleed`,
  `canonicalSignature=ae54303d0034`, `runnable=false`,
  `canonicalStatus=no-realistic-repro`.
- Supplement rows for seed `954196` classify the source as real: one peer stays
  sane while another duplicates a paragraph and smears Pullquote/Search/Table
  attributes after a top-level move.
- Pass 177 SyncManager probe:
  - `9b8a2f92d30`: fails, received
    `pullquote, search, table, tail, lead`.
  - `0bec707c58f`: passes, preserving
    `pullquote, search, remote-insert, table, tail, lead`.

No durable natural-user Playwright repro is currently available for this exact
signature. The deterministic unit-level race is the shortest faithful repro
found so far.
