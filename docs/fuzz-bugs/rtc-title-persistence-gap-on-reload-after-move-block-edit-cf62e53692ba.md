# RTC title persistence gap after move-block, title edit, and reload

Bug signature: `cf62e53692ba`

Bug type: `RTC title persistence gap on reload after move-block + edit-title`

Transport: `websocket`

Covering fix branch:
`try/rtc-title-persistence-gap-on-reload-after-move-block-edit--cf62e53692ba-pr`

## Classification

This signature is a real RTC persistence bug shape. It is best treated as a
member of the stale title / stale persisted CRDT document reload-save family,
with this signature's branch carrying the current repro-and-fix sequence.

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

Real-user likelihood: `medium` overall; `high` conditional on a site/user cohort
already using RTC collaboration.

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

## Pass 175 Evidence

Fresh checks in pass 175:

- Recovered the original generated cf62 spec from
  `1f5dc5bad4c560765d1f1ba12440671ad768266e`. The spec uses natural UI actions:
  create a draft, join a collaborator, click the Heading block, click Move down
  in the block toolbar, edit the title, and reload either session.
- Confirmed the generated spec only fails when
  `waitForConvergence( { includeCrdtDocument: true } )` throws. It captures REST
  and CRDT snapshots but does not assert that the edited title survived in the
  visible editor, REST `title.raw`, or decoded persisted `_crdt_document`.
- Re-ran the lowest-level known-fixes repro at
  `f256024286dd80a4c0e2579f658c109256abf648` in a detached temporary worktree
  with the repro tests from `23fce95a1c6`. The sync-manager tests failed because
  the serialized CRDT title stayed `Initial title` instead of `Customer title`,
  and because `getChangesFromCRDTDoc` was called without the persisted record.
- Re-ran the focused PR-branch unit coverage on
  `98f39bdcdd02a0e3ff771d8408acaa7c7470f08a`; the title/persisted-record tests
  passed.
- Verified the existing stitched video artifact is present and readable:
  H.264, 1920x1080, 28.0s,
  `/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-118/6f589c89600c-pass118-stitched.mp4`.

## Relationship To The Covering Fix

The current cf62 PR branch includes:

```text
23fce95a1c6 Add RTC title reload unit repros
8439cc4d913 Add same-user title save-after-reload browser repro
98f39bdcdd0 Preserve RTC title across reload saves
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
`957b5e83014`, but it does not contain the later cf62 fix commit
`98f39bdcdd0`. In that base,
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
- `98f39bdcdd0`: adds the persisted-record context and exact persisted raw field
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
reload, then run once against `f256024286d` and once with `98f39bdcdd0` applied.

That experiment should be routed to the same title-persistence fix branch rather
than creating a separate root-cause track.
