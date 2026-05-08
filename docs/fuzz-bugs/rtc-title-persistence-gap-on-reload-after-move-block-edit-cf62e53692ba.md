# RTC title persistence gap after move-block, title edit, and reload

Bug signature: `cf62e53692ba`

Bug type: `RTC title persistence gap on reload after move-block + edit-title`

Transport: `websocket`

Covering fix branch: `try/rtc-safe-sync-title-lost-after-reload-6f589c89600c-pr`

## Classification

This signature is a real RTC persistence bug shape, but it is best treated as a
member of the broader stale title / stale persisted CRDT document reload-save
family covered by `6f589c89600c`.

The high-confidence handoff row says that after a normal block move and title
edit, both collaborators briefly show the edited title, but the title is not
durably persisted before reload. Reloading one peer can expose title divergence
while block content remains converged.

The strongest supplement row narrows the source schedule to:

```text
seed 953190
step 0: move-block
step 1: edit-title
then: reload
```

There are no injected faults in that summary. The live editor state converges on
both peers, but the decoded persisted `_crdt_document` still carries the initial
title and old top-level block order. That is product state divergence, not a
readiness wait, locator issue, malformed block input, inverted assertion, or
expected behavior.

## Why The May 5 Passing Spec Is Not A Fix Signal

The generated spec
`test/e2e/specs/editor/collaboration/websocket/collaboration-cf62e53692ba-realistic.spec.ts`
uses natural editor actions for the important steps: it selects a Heading,
presses the toolbar Move down button, edits the post title, and reloads either
the primary or collaborator page.

However, the assertion only checks:

```text
expect( result.reproduced ).toBe( false )
```

`result.reproduced` is set to `true` only when
`waitForConvergence( { includeCrdtDocument: true } )` throws. The spec records
REST `title.raw` and `_crdt_document` snapshots, but it does not assert that the
visible title, REST title, or decoded CRDT title contains the edited target
title. A stale-but-converged persisted title can therefore pass this spec.

The May 5 refresh result of 12 passing attempts is only evidence that the harness
did not hit a convergence exception. It is not evidence that the title
persistence bug is fixed.

## Practical Impact

Real-user likelihood: `high` for users who are already using RTC
collaboration.

Natural workflow:

1. Two collaborators or two browser sessions open the same post in the post
   editor with RTC over WebSocket.
2. The document contains ordinary blocks such as Heading, Group, List, and Quote.
3. One collaborator moves a top-level Heading block with normal block controls.
4. A collaborator edits the post title.
5. One collaborator reloads or rejoins before the stale persisted CRDT metadata
   has been made consistent with the edited title.

Common prerequisites: collaborative editing enabled, a shared draft, ordinary
post title editing, ordinary block movement, and a reload or rejoin.

Rare prerequisites: RTC itself is still an experimental surface, and the exact
move-before-title-before-reload ordering is narrower than a plain title edit.

Artificial prerequisites: the exact seed content, marker strings, and repeated
generated retry loop come from fuzzing. The core actions do not.

Blast radius: title rollback or loss after reload/save, stale persisted
`_crdt_document` metadata, and possibly stale block-order metadata. This is not
an OOM, save loop, or pure UI-only inconsistency. Recovery is manual title
repair or revision/autosave recovery if the stale state has already been saved.

## Relationship To The Covering Fix

The closest fixed and branch-backed issue is `6f589c89600c`, whose repro showed
a stale persisted CRDT document replaying an old raw title over a newer active
editor title after reload/save. That branch includes:

```text
3fc0fd5da86 Add RTC title reload unit repros
59e9d53c93c Add same-user title save-after-reload browser repro
81334095e53 Preserve RTC title across reload saves
```

The fix is transport-independent. It changes the shared sync/core-data path
rather than a WebSocket-specific caller:

- `createPersistedCRDTDoc` can overlay the exact record being saved before
  serializing CRDT metadata.
- sync handlers can provide the current persisted raw entity record.
- `getPostChangesFromCRDTDoc` receives that persisted record.
- `title`, `content`, and `excerpt` suppress an exact persisted raw value replay
  when the active edited raw value is dirty.

That is the narrow mechanism cf62 points at: a persisted snapshot is being
mistaken for a fresh CRDT title change during reload reconciliation.

## Known-Fixes Base Status

The required known-fixes base for this pass is:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-current-20260507
f256024286dd80a4c0e2579f658c109256abf648
```

It includes the #77716 backlink-aware set and the earlier title reload
reconciliation work from PR `77666`, including commits `573b567b8d4` and
`957b5e83014`.

It does not contain the later covering fix commit `81334095e53`. In that base,
`createPersistedCRDTDoc` serializes the manager Y.Doc with base-version metadata,
but it does not overlay the exact record being saved, and
`getPostChangesFromCRDTDoc` has no persisted raw record context for raw text
fields. That leaves the cf62 stale persisted-title replay class unresolved by
the known-fixes base.

## Origin Analysis

Relevant commits and PRs:

- `2d8b22633dd` / PR `#72373`: introduced CRDT persistence for collaborative
  editing.
- `50b0a31ec01` / PR `#74668`: applied only detected changes from persisted
  CRDT documents.
- `22e067b0243` / PR `#75448`: moved title, content, and excerpt into Y.Text
  fields.
- `8051e14451c` / PR `#75975`: tried to avoid stale CRDT persistence on save,
  but still serialized the current manager Y.Doc rather than overlaying the
  exact record being saved.
- `9375c0e0148` / PR `#76017`: improved refresh sync but still lacked persisted
  raw-record context when diffing persisted CRDT snapshots.
- `573b567b8d4` and `957b5e83014` / PR `#77666`: fixed an earlier title reload
  reconciliation case, but not the save-after-reload stale persisted raw title
  replay addressed by the covering branch.
- `81334095e53`: adds the persisted-record context and exact persisted raw field
  replay guard.

## Fix Plan Audit

Kernel-maintainer robustness: the fix is in the shared sync/core-data boundary,
keeps the handler extension optional, and avoids a browser-only special case.

Jepsen-style correctness: a stale persisted base value must not be treated as a
new remote write that overwrites a newer dirty local title. The guard preserves
that local monotonic edit only when the incoming value exactly equals the
persisted raw value.

Simplicity and failure modes: the raw-field check is constant time for
`title`, `content`, and `excerpt`. It avoids retries, timeouts, transport
switches, and broad reload suppression. The known residual risk is an
intentional exact reversion to the persisted value racing with a dirty local
edit; in that case the dirty local edit wins.

## Shortest Additional Experiment

For exact signature-level confidence, copy the cf62 generated spec onto the
current known-fixes base, add hard assertions for the edited target title in the
visible editors, REST `title.raw`, and decoded persisted `_crdt_document` after
reload, then run once against `f256024286d` and once with `81334095e53` applied.

That experiment should be routed to the same title-persistence fix branch rather
than creating a separate root-cause track.
