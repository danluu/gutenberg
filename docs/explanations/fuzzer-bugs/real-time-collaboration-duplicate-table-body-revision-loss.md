# Real-Time Collaboration Duplicate Table Body Revision Loss

## Summary

Two collaborators can lose a table-body edit when an old or externally-created
post has no persisted CRDT document and contains duplicate table rows.

The browser repro starts with serialized post content containing a table body
with three one-cell rows:

```text
anchor
same
same
```

One user edits the later duplicate row to `edited-second-duplicate`. Another
user deletes the earlier duplicate row through the normal table toolbar. The
edit marker is visible in the editing user's browser before the delete is
clicked. After normal RTC convergence, both editors show only:

```text
anchor
same
```

When the user performs a normal Save draft, the saved post body contains the
lost two-row table and the post revisions do not contain
`edited-second-duplicate`.

This is a body-content loss bug, not a title-loss bug.

## Reproduction Levels

-   CRDT merge repro:
    `packages/core-data/src/utils/test/rtc-table-duplicate-body-revision-loss.test.ts`
    (`does not lose a later duplicate table row edit when another session deletes
the earlier duplicate row`).
-   SyncManager repro:
    `packages/core-data/src/utils/test/rtc-table-duplicate-body-revision-loss.test.ts`
    (`does not let SyncManager lose a duplicate table row edit after independent
no-CRDT bootstraps`).
-   Browser Playwright repro:
    `test/e2e/specs/editor/collaboration/collaboration-table-duplicates.spec.ts`
    (`saves the later duplicate row edit into revisions when another user deletes
the earlier duplicate row`).
-   Fuzzer coverage:
    `packages/core-data/src/utils/test/crdt-table-duplicates.fuzz.test.ts`.

The focused lower-level command is:

```sh
npm run test:unit -- packages/core-data/src/utils/test/rtc-table-duplicate-body-revision-loss.test.ts --maxWorkers=1
```

The browser command is:

```sh
npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-table-duplicates.spec.ts -g "saves the later duplicate row edit into revisions" --workers=1
```

Expected failure on the buggy code:

-   The editor body after convergence and before save is `["anchor", "same"]`.
-   The persisted post content is the two-row table.
-   The revisions contain the two-row table and the original three-row table.
-   No revision contains `edited-second-duplicate`.

## Why This Is Distinct From The Known Duplicate-Table Bug

The earlier duplicate-table bug was about ambiguous value matching for duplicate
query-array entries. Dan's stable table query-array identity work fixed the
shared-CRDT case by carrying an internal `__unstableSyncId` through runtime table
attributes without serializing it into post content.

That fix is present on this base, and the existing control repro passes:

```sh
npm run test:unit -- packages/core-data/src/utils/test/crdt-table-duplicates-repro.test.ts --maxWorkers=1
```

That control initializes document B from document A's CRDT state, so both
sessions share row identities before editing. The remaining bug is different:
old/no-CRDT serialized post content can be independently bootstrapped in two
browser sessions. Each session parses the same duplicate rows from HTML and
creates its own internal identities. Because the rows have the same visible
content and no shared persisted identity, "delete the earlier `same` row" and
"edit the later `same` row" are still ambiguous after the two independent CRDT
states meet.

I also checked the browser repro on Dan's hardened duplicate-table branch
`try/rtc-duplicate-table-rows-stock-repro-pr-trunk` (`2e153b32280`, containing
`Harden table query identity sync`). The stock table-body repro still fails
there, and the revision-level browser repro still saves a two-row table whose
revisions omit `edited-second-duplicate`. This is therefore not just a re-find
of the earlier shared-CRDT duplicate-table fix.

## Root Cause

`core/table` stores rows and cells as nested query-array attributes. The RTC
merge code represents those arrays as Yjs arrays of maps and uses
`__unstableSyncId` as the preferred stable identity for array elements.

That identity is intentionally not serialized into post HTML. For old posts,
REST-created posts, imported posts, or any post that has no persisted CRDT
document yet, two sessions can therefore construct different internal identities
for the same visible duplicate rows.

When the two sessions later converge:

1. The editing session has `anchor`, `same`, `edited-second-duplicate`.
2. The deleting session has `anchor`, `same`.
3. The merge sees duplicate visible values and incompatible internal row IDs.
4. `mergeYArrayLocalChanges()` / `findYArrayElementIndex()` can match the local
   edit against the wrong duplicate row.
5. The edited Yjs text is removed or overwritten, leaving only `anchor`, `same`.
6. A normal save persists that converged lost state, so revisions cannot restore
   the body edit.

The important invariant violation is:

> A user-visible body edit to one duplicate query-array element must not be lost
> merely because another collaborator deletes a different duplicate element.

## False-Positive Analysis

The browser repro does not inject faults, drop messages, modify application
state directly, or use a test-only collaboration provider. It uses the stock
editor flow:

1. Create a draft fixture with normal serialized post content and no persisted
   CRDT metadata.
2. Open two collaborative editor sessions.
3. Select and type into a table cell.
4. Open the table toolbar menu and click `Delete row`.
5. Wait for normal convergence.
6. Click Save draft.
7. Read persisted content and revisions through the normal REST API.

The only setup shortcut is creating the initial old/no-CRDT post fixture, which
represents real content created before RTC metadata existed, imported content,
or content created through APIs outside the editor.

The marker is explicitly observed in the editor before the second user clicks
Delete row. The failure is also reproduced below the browser layer in direct
CRDT and SyncManager tests. That rules out a Playwright-only race or a test
assertion that never made a real body edit.

The loss does happen before the final save: after convergence, the editor body
is already `["anchor", "same"]`. The revision-loss part is that the user's
subsequent normal save records only the lost body, leaving no revision that can
restore the marker.

## Fix Plan

1. Keep internal query-array IDs for live editor objects, but treat independently
   bootstrapped IDs from the same old/no-CRDT serialized content as provisional.
2. During first live convergence for no-persisted-CRDT records, reconcile
   identical parsed array elements so that sessions agree on one identity per
   logical element before local structural edits are allowed to collapse
   duplicates.
3. If duplicate elements cannot be unambiguously matched, prefer preserving both
   user-visible edits over deleting one. A visible duplicate row is less bad than
   silent body data loss.
4. Add a deterministic regression for the independent-bootstrap case, not only
   the shared-CRDT case.
5. Keep the browser revision test because the bug is user-impacting only after a
   normal save proves that the body edit is absent from revisions.
