# Real-Time Collaboration Same-User Revision Loss

This branch documents and reproduces a real revision-loss bug found while
searching for same-user restore failures in real-time collaboration (RTC).

## Summary

A same-user browser session can reload while another session for the same user
has an unsaved title edit. The reloaded session joins the live RTC room, receives
the newer unsaved title, then applies stale persisted REST record data as CRDT
state and broadcasts that stale title back to the active session. If the active
session then performs a normal save, the stale title is saved and the user's
newer title is absent from revision history.

This is a user-triggerable revision-loss bug. The browser repro uses normal
editor actions: open the same draft in two same-user browser sessions, edit the
title, reload the second session, edit body content, and save. It does not use
fault injection.

The exact saved form-option loss from the original support report was not
reproduced on the known-fixes base. The same-user title bug is still the same
failure class: a support or same-user session can cause a later normal save to
record stale data, making the user's intermediate edit unrecoverable from
revisions.

## Reproduction Levels

- CRDT-level repro:
  `packages/core-data/src/utils/test/rtc-same-user-title-reload-loss.test.ts`
  (`does not let a reloaded same-user session broadcast a stale persisted title
  over the active unsaved title`).
- SyncManager-level repro:
  `packages/core-data/src/utils/test/rtc-same-user-title-reload-loss.test.ts`
  (`does not let SyncManager hydration replay a stale persisted title after a
  same-user reload joins a live room`).
- Browser repro:
  `test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts`
  (`saves the active title after a same-user browser session reloads`).

The browser repro command is:

```sh
npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts -g "saves the active title after a same-user browser session reloads" --workers=1
```

Expected failure on the buggy code:

- The persisted post title is the stale initial title.
- The post revisions contain the stale initial title.
- The user-entered title is not in revision history.

## Relevant History

The bug is an interaction across the RTC boot path, not a single obviously bad
patch.

- [#72183](https://github.com/WordPress/gutenberg/pull/72183) introduced
  `createSyncManager` and the basic `loadEntity` shape. In that first version,
  providers were created before the current entity record was applied to the
  CRDT document.
- [#72373](https://github.com/WordPress/gutenberg/pull/72373) added persisted
  CRDT documents. It kept the same general load ordering and added the fallback
  path: when there is no persisted CRDT document, or when the persisted document
  is invalidated, apply the current REST entity record to the CRDT document.
- [#75448](https://github.com/WordPress/gutenberg/pull/75448) moved title,
  content, and excerpt to `Y.Text`. That made title a synchronized CRDT field
  and gives this bug a minimal, revision-visible reproducer.
- [#76017](https://github.com/WordPress/gutenberg/pull/76017) fixed a refresh
  synchronization issue by changing Yjs document initialization. It addressed a
  missing-operation refresh bug, but it did not define a safe linearization point
  between live provider state and stale REST-record hydration.
- [#75975](https://github.com/WordPress/gutenberg/pull/75975) fixed stale CRDT
  document serialization on save by flushing deferred Yjs updates before
  persisting `_crdt_document`. That is related but distinct from this bug.

The known-fixes base used for this branch includes Dan-only local RTC fixes.
One of those fixes pre-hydrates existing persisted CRDT documents before
connecting providers. That narrows this bug to the fallback path where an entity
record has no persisted CRDT document, which is realistic for old posts, imported
posts, REST-created test fixtures, and any content created before RTC metadata
existed.

## Root Cause

The no-persisted-CRDT fallback treats the current REST entity record as an edit
to the live CRDT document after provider connection has already been established.

For the failing case:

1. Active same-user session loads a draft whose persisted title is
   `initial`.
2. Active session changes the title to `customer title` but does not save.
3. Reloaded same-user session joins the same RTC room.
4. The reloaded session receives `customer title` from the active session.
5. Because the reloaded session's REST record still says `initial`, the fallback
   hydration path applies `initial` to the CRDT document.
6. That local CRDT update propagates back to the active session as if it were a
   legitimate peer edit.
7. The active session performs a normal save. WordPress revisions contain the
   stale title, and the user-entered title is unrecoverable.

The broken invariant is:

> Bootstrap data from a stale REST record must never overwrite live CRDT state
> that has already arrived from a peer.

The current code has no explicit "bootstrap versus live state" boundary for the
fallback path. It also lacks a provider-level "initial sync complete and room was
empty/non-empty" signal that would let the loader safely choose between the REST
record and live CRDT state.

## Why This Is Not A False Positive

The browser repro performs the failure through normal editor UI actions. The
only test setup shortcut is creating the initial draft fixture, which represents
a real old or externally-created post without persisted CRDT metadata. The
actual trigger is a user-visible editor sequence: two same-user sessions, title
edit, second-session reload, body edit, save.

The failure is observed below the UI as well:

- The CRDT-level test shows that stale title application after live sync creates
  a CRDT state whose computed entity changes overwrite the active title.
- The SyncManager-level test uses the real manager and a linked provider mock to
  model a normal live room. The active manager receives `editRecord` with the
  stale title.
- The browser test confirms that the final persisted post and its revisions
  contain the stale title and not the user's title.

This rules out a Playwright-only timing artifact. The same ordering fails at the
state model, manager, and browser levels.

## Distinction From Similar Known Bugs

- Not the stale serialized `_crdt_document` save bug fixed by
  [#75975](https://github.com/WordPress/gutenberg/pull/75975). That bug persisted
  an old CRDT snapshot because deferred Yjs updates had not flushed before save.
  This bug can occur when there is no persisted CRDT document at all.
- Not the refresh missing-dependency bug fixed by
  [#76017](https://github.com/WordPress/gutenberg/pull/76017). That bug lost an
  initialization operation needed for future remote updates. This bug accepts a
  live remote update and then overwrites it with stale REST data.
- Not an awareness, cursor, or selection-history bug. The loss is in synced
  entity data (`title` in the minimal repro), and the bad value is persisted into
  revisions.
- Not the exact saved form-option support case from the original report. A
  browser test for saved form-option markers passes on this known-fixes base.
  The confirmed title bug remains a real revision-loss bug in the same same-user
  reload/save workflow.

## Fix Plan

1. Define the load invariant explicitly in `createSyncManager`:
   stale REST-record bootstrap may initialize missing CRDT fields, but it must
   not overwrite fields populated by live provider state.
2. Split the entity load path into two phases:
   - local bootstrap from persisted CRDT metadata or REST record;
   - live provider join and reconciliation.
3. For entities with a persisted CRDT document, keep the known-fixes behavior:
   apply the persisted CRDT state before provider connection and only reconcile
   invalidated keys deliberately.
4. For entities without a persisted CRDT document, do not blindly apply the REST
   record after provider connection. Instead, use a guarded fallback:
   - if a synced field is already present in the CRDT document, treat it as live
     CRDT state and skip the REST-record value for that field;
   - if the field is absent, initialize it from the REST record;
   - after adopting live CRDT state, update the local editor store from the CRDT
     document rather than pushing stale REST data into the CRDT document.
5. Add or expose a provider initial-sync signal if the current provider API
   cannot reliably distinguish an empty room from a room whose first update has
   not arrived yet. The safest version has an explicit linearization point:
   "initial remote sync is complete; this room was empty/non-empty."
6. Persist the CRDT document after successful bootstrap or live-state adoption so
   the same old/no-meta post does not keep re-entering the no-persisted fallback
   on every reload.
7. Keep the repro tests as regression tests:
   - CRDT-only ordering test;
   - SyncManager linked-provider test;
   - browser same-user reload/save/revision test;
   - fuzzer persistence profile with realistic form-option/table checkpoint
     blocks and browser revision restore probing.

The risky part is step 4. A naive "apply the REST record before connecting" fix
can reintroduce the RTC initialization problem: two clients may independently
seed the same logical field from the same stale REST value with different Yjs
client clocks. The fix should be phrased as "initialize missing state or adopt
live state," not "move the stale write earlier."

## Fix Plan Audit

These are review lenses based on public engineering priorities associated with
the named reviewers; they are not claims that those people reviewed this code.

### Linus Torvalds-style systems review

The plan needs a simple invariant in code, not a comment-dependent timing hack.
The core rule should be mechanically obvious: bootstrap writes are not peer
edits, and stale REST data must not win over already-present CRDT state. Avoid a
field-specific special case for title if the same load-order bug can affect
content, excerpt, or blocks. Also avoid adding sleeps or retry loops to tests or
production code; those would hide the race instead of defining ownership of the
state transition.

The main concern with the plan is complexity around "field is present." For
`Y.Text`, an empty string can be valid content; absence and emptiness must remain
different states. For block trees, a parsed empty document, an unparsed
`undefined` blocks value, and real empty content are not interchangeable. The
fix should use typed helpers, not generic truthiness checks.

### Kyle Kingsbury / Jepsen-style distributed-systems review

The plan should state the consistency property as an invariant over histories:
after a client has observed an unsaved value through RTC, a later reload of
another same-user client must not cause that value to disappear unless a user
performs an explicit overwriting edit. Revision creation then needs its own
postcondition: if a normal save follows, the saved revision must contain the
latest user-visible editor state, not an older server snapshot.

The provider API also needs an explicit synchronization boundary. Without a
well-defined initial-sync completion event, "room empty" and "remote update has
not arrived yet" are observationally similar. Any fix that depends on timing
between provider creation and REST fallback hydration should be rejected. The
tests should include both arrival orders and should model an old/no-CRDT post,
not only a freshly-created post with ideal metadata.

### Dan Luu-style fuzzing and regression review

The branch already found one false positive: comparing raw cached CRDT blobs
made the fuzzer report differences even when user-visible content and revisions
were correct. Keep the fuzzer oracle centered on user-observable state:
rendered/editor blocks, title, persisted post content, and revision contents.

The regression suite should keep cheap tests at every level. The CRDT and
SyncManager tests should fail deterministically and run before the browser test.
The browser test is still necessary because the loss is only complete once a
normal save proves that revision history cannot restore the user value. The
fuzzer should continue to bias toward old/no-CRDT records, same-user reloads,
normal saves, and browser revision restore checks, because those are the
conditions that expose this class without artificial fault injection.
