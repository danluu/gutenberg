# PR 77924 Step 1 Explanation

Date: 2026-05-14

Implementation branch:
`try/pr77924-step1-plan-20260513`

This branch explains the first split from
[WordPress/gutenberg#77924](https://github.com/WordPress/gutenberg/pull/77924).
It focuses on the list-item move convergence failure and intentionally does not
try to absorb every fix from PR 77924.

## Relevant History

The failure is not from one isolated bad commit. It comes from a few RTC design
choices interacting:

- [#68483](https://github.com/WordPress/gutenberg/pull/68483) introduced the
  reliable sync protocol foundation. The block merge strategy remained largely
  snapshot-oriented: local block trees are converted into Yjs structures, and
  later snapshots are merged into the current Yjs document.
- [#75699](https://github.com/WordPress/gutenberg/pull/75699) removed plugin
  checks around collaborative editing and made this path more broadly active.
- [#75029](https://github.com/WordPress/gutenberg/pull/75029) deferred
  `SyncManager.update()` through `yieldToEventLoop()`. That improved scheduling,
  but it also opened a race: a local snapshot can be captured before a remote
  update arrives, then applied after that remote update has already modified the
  Yjs document.
- [#75975](https://github.com/WordPress/gutenberg/pull/75975) fixed one save
  manifestation of this by waiting for deferred Y.Doc writes before serializing
  `_crdt_document`, confirming that deferred local writes are observable at save
  boundaries.
- [#77966](https://github.com/WordPress/gutenberg/pull/77966) moved sync
  observers after persisted CRDT hydration, fixing a redundant hydration edit.
  That did not address stale local snapshots that are already queued before
  remote reconciliation finishes.
- [#76913](https://github.com/WordPress/gutenberg/pull/76913) added
  schema-aware table/query merging. That is relevant to the full PR 77924
  branch, but is not part of this first split.

## Bug Shape

The list-item stress failure is:

```sh
npm run test:e2e:rtc-websocket -- \
  --grep "two users concurrently move list items"
```

Two users move different list items at about the same time. The old merge path
could only see the incoming full block snapshot, not the record the local user
edited from. When a queued local snapshot was stale, the merge could not tell:

- "this field is unchanged relative to my local base, preserve the remote
  update", from
- "this field is a deliberate local write, apply it over the remote update".

For structural block changes, the positional merge also treated moves as
delete/insert-like rewrites. That can replace Yjs block objects instead of moving
the existing objects. Once that happens, rich text and nested block state may
attach to the wrong list item, duplicate an item, or smear text across siblings.

The visible e2e symptom was a persisted/reloaded list such as:

```text
Item Alpha
Item Gamma
Item Gamma
Item EpsiEpsilonon
Item DeDeltata
Item Zeta
```

The live editors could converge before save, while a reload immediately after
save exposed stale provider/store reconciliation. The test now waits for the
semantic post-save state on both editors before reloading; without that wait,
the test can race its own save boundary instead of testing the merge semantics.

## Fix Plan Used In The Split

This split keeps the fix to the smallest code surface that made the list-move
case reliable.

1. Pass a pre-edit `baseRecord` from `editEntityRecord()` into
   `SyncManager.update()`.

   This gives CRDT block merging a three-way view: base record, current Yjs
   document, and incoming local edits.

2. Thread `baseRecord.blocks` into `mergeCrdtBlocks()`.

   The block merger can now skip fields that are unchanged from the local base
   instead of overwriting remote changes with stale local values.

3. Rebase block order by identity before falling back to positional merging.

   For same-size block arrays with stable `clientId`s, the merger moves the
   current Yjs block objects into the incoming order. This preserves nested
   Yjs state and avoids rewriting adjacent blocks. Where `clientId`s are not
   enough, the code can use unique semantic block keys.

4. Track remote key versions in `SyncManager`.

   Remote Yjs updates mark top-level record keys as reconciling. A deferred
   local update that was scheduled before a remote change can then filter stale
   non-block keys instead of replaying them. Block updates are still passed
   through to the base-aware block merger.

5. Strengthen the list-move e2e assertion.

   The old test only checked relative ordering:

   - Beta after Gamma.
   - Epsilon before Delta.

   The split asserts the exact semantic order:

   ```text
   Item Alpha
   Item Gamma
   Item Beta
   Item Epsilon
   Item Delta
   Item Zeta
   ```

   It also checks that exact order after save and before reload, so the reload
   phase does not race a pending sync/save boundary.

## What Stayed Out

The first split does not attempt to fix every current trunk RTC stress failure.
In local validation, the other existing failure,
`three users concurrently edit a large post with diverse blocks`, still failed
after this reduced branch. Its failures were broader: same-paragraph convergence,
block toolbar movement, and final paragraph propagation. Those require more of
the full PR 77924 surface and should be reviewed in later splits.

The table/query-array merge work and WebSocket/provider reload behavior should
also remain separate review slices.

## Verification

On `try/pr77924-step1-plan-20260513`:

```sh
npm run test:unit -- \
  packages/core-data/src/utils/test/crdt-blocks.ts \
  packages/core-data/src/test/actions.js \
  packages/sync/src/test/manager.ts
```

Result: passed, 134 tests.

```sh
npm run test:e2e:rtc-websocket -- \
  --grep "two users concurrently move list items" \
  --repeat-each=10
```

Result during validation: passed, 10/10.

```sh
npm run build
```

Result: passed.

No PR was created from either branch.
