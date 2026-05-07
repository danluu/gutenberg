# RTC title diverges after reload without save

Bug signature: `445d4b755b6d`

Bug type: `rtc_title_diverges_after_reload_without_save`

Transport: HTTP polling RTC provider

## Classification

This is a real RTC title reload bug family, not a harness-only failure. The
manifest row has 11 same-family signatures, 8 runnable repros, high confidence,
and describes the same invariant break repeatedly: after a reload, body blocks
and the persisted CRDT document converge while one editor keeps the unsaved
edited title and another editor reverts to the initial persisted title.

The generated `triage-4ba23abee72f-realistic.spec.ts` is an observer, not a
failing assertion by itself. It records both distinct-user reload directions
after normal editor actions: type a title, edit paragraph body content, reload
one editor, then capture each page's edited title, visible title, browser
backup notice state, and persisted REST title. A later "passed" run of this
observer only means the observer completed.

The old handoff's strongest concrete validation is the same family under
`4ba23abee72f` / `ccd0d72f4c1b`: before reload both peers had the updated title;
after reload the primary kept the updated title while the collaborator reverted
to the initial title; the body edit was present on both sides. That flow used
ordinary browser/editor operations and no network fault injection.

## Practical Impact

Real-user likelihood: **low**.

Natural workflow:

```text
editor surface: post editor
transport: RTC HTTP polling
block types: post title plus ordinary paragraph/table body blocks
sessions: two editor sessions on the same post
timing: title edit has synced, body edit has synced, then one peer reloads before a save resolves the title
save/reload: reload is central; explicit save is not required for the immediate split
multiple users: usually distinct users, but same-user duplicate sessions hit adjacent failures too
network delay: not required in the strongest realistic repros
unusual order: moderately unusual because reload occurs during an unsaved collaborative edit session
```

Common prerequisites are editing a title, editing body content, RTC enabled, and
one editor tab being reloaded. The narrower prerequisite is that the reload
happens while the edited title is synced through RTC but not yet safely
represented in the reloaded page's bootstrap/persistence path. The exact seed
strings, waits, and recorder output are fuzzing artifacts; the title edit, body
edit, collaboration, and reload are normal Gutenberg actions.

Blast radius is bounded but real. The immediate symptom is editor-state
divergence: one collaborator can see and later save or publish the stale title.
There is no evidence of duplicate body content, save loops, performance risk, or
OOM in this title-only member. Recovery is straightforward if noticed before a
later save: the user can retype the title or reload the editor that still has
the newer value. Recovery becomes harder after a stale-title save/publish.

Evidence for the `low` classification:

- The family repeats across many seeds and adjacent signatures.
- The realistic repro route uses normal editor operations rather than malformed
  blocks, direct state mutation, or injected faults.
- Body content converges while only title state diverges, which matches a
  product-state reconciliation bug instead of a locator/readiness failure.
- The same root area has a stronger same-user save-after-reload repro with
  trace evidence proving REST state and live editor state can diverge.

Evidence against a higher likelihood:

- RTC must be enabled.
- The workflow needs multiple open editor sessions on the same post.
- The reload must land during a relatively narrow unsaved collaboration window.
- The bug is visible and recoverable if the user notices the stale title before
  saving.

The shortest additional experiment is to run the natural distinct-user title
reload Playwright repro without deterministic waits and measure how often the
title rolls back under human-scale reload timing.

## Known-Fixes Base Check

The required known-fixes base was:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-current-20260507
HEAD f256024286dd80a4c0e2579f658c109256abf648
```

That base is a synthetic integration of overlapping RTC proposals. Its own
status manifest says the final branch is best-effort after conflicts in
`packages/core-data/src/utils/crdt-blocks.ts`, `packages/core-data/src/utils/crdt.ts`,
`packages/core-data/src/resolvers.js`, `packages/sync/src/manager.ts`, and
`packages/sync/src/types.ts`.

The existing `try/rtc-safe-sync-title-lost-after-reload-6f589c89600c-pr` fix is
not an ancestor of the synthetic base:

```text
git merge-base --is-ancestor fd4dc607adc f256024286dd
exit status: 1
```

Targeted lower-level tests on the synthetic base did not pass cleanly:

```text
npm run test:unit -- packages/core-data/src/test/actions.js packages/core-data/src/test/resolvers.js --runInBand --testNamePattern='saveEntityRecord|persistCRDTDoc|sync manager|stale persisted CRDT|entity with sync manager'

Test Suites: 2 failed, 2 total
Tests: 3 failed, 54 skipped, 10 passed, 67 total
```

Two failures are expectation drift in the mocked sync origin. The important
resolver failure shows the conflict-integrated `persistCRDTDoc` path saving only
`{ id, meta }` where the title-preservation test expected the current edited
record. Browser verification on port `9903` was blocked by Docker returning EOF
while starting `wp-env`, so the synthetic base should not be treated as a clean
fix verification for this family.

## Root Cause

The bug comes from the RTC bootstrap/persistence path treating a stale persisted
or raw title as an authoritative CRDT/editor update after reload. The relevant
history is:

- `2d8b22633dd` / `#72373`: CRDT persistence for collaborative editing.
- `50b0a31ec01` / `#74668`: apply only detected changes from the persisted CRDT
  document.
- `22e067b0243` / `#75448`: represent title/content/excerpt as CRDT text.
- `8051e14451c` / `#75975`: flush deferred Y.Doc updates before save
  serialization.
- `9375c0e0148` / `#76017`: refresh synchronization fix.
- `a78518cb824`: skip replaying stale save responses into RTC title state.
- `fd4dc607adc`: preserve RTC title across reload saves by passing persisted
  raw record context through the CRDT diff and serializing the record being
  saved.

The common unsafe shape is comparing incoming persisted CRDT text only with the
current edited record. If the incoming value exactly matches the old persisted
raw title while the editor has a dirty newer title, the old value can be
misclassified as a fresh remote change and applied back into the editor.

## Fix Plan

The fix should keep the existing narrow shape from the title-loss PR:

1. Serialize CRDT metadata from the record being saved, not only from the
   manager's current Y.Doc snapshot.
2. Add optional `getPersistedRecord` support to sync record handlers.
3. Pass the persisted raw record into `getChangesFromCRDTDoc`.
4. For `title`, `content`, and `excerpt`, suppress only exact replays of the
   persisted raw value while the local edited raw field is dirty.

Robustness audit:

- This is not a reload-specific timer or transport heuristic.
- The guard is scoped to raw post fields and exact persisted-value replay.
- It is constant-time per raw field and does not add polling or retry loops.
- The residual tradeoff is an intentional exact reversion: if a collaborator
  deliberately changes a title back to the exact persisted value while this tab
  has a dirty title, the dirty local value wins. That is narrower than allowing
  stale persisted bootstrap state to erase active edits.
