# Zendesk RTC bug summary excluding PRs 77865 and 77866

This document summarizes the recent Zendesk-related real-time collaboration
(RTC) bugs found while fuzzing against a base intended to include the known RTC
fixes plus the auto-draft autosave fix.

It intentionally excludes:

- [WordPress/gutenberg#77865](https://github.com/WordPress/gutenberg/pull/77865),
  the new `auto-draft` autosave discoverability/revision-loss bug.
- [WordPress/gutenberg#77866](https://github.com/WordPress/gutenberg/pull/77866),
  the old/no-CRDT duplicate table row body-edit loss bug.

The Zendesk tickets in scope reported lost content, missing drafts or revisions,
support-session/form erasure, a page and menu disappearing, and `Connection
lost` while editing or publishing.

## Summary table

| Bug | Status | Main user symptom | New relative to 77865/77866? |
| --- | --- | --- | --- |
| Navigation menu stale-save overwrite | Real, browser repro confirmed | A restored page link disappears from the menu | Yes |
| Same-account/support-session stale content overwrite | Real, fuzz repro confirmed | Current post/page content is replaced by stale content | Yes |
| Form-content overwrite variant | Real, fuzz repro confirmed | Customer form/body content is replaced by support-session content | Yes |
| Draft opens blank despite saved DB content | Real, serial repro confirmed | Draft exists in DB/revisions but editor reopens blank | Yes |
| Large edit `Connection lost` | Known bug by failure signature | Repeated sync failures lead to `Connection lost` | No, matches #77669 |

## 1. Navigation menu stale-save overwrite

### User-visible symptom

This matches the navigation-menu part of the `#11112607` ticket: a page appears
to have disappeared from the site's navigation even though the page itself still
exists.

### Repro shape

1. Enable RTC.
2. Use a block theme and open a `wp_navigation` menu in the Site Editor.
3. Open the same navigation menu in a second browser window using the same
   account.
4. In window A, add or restore a page link to the menu and save.
5. In window B, which loaded the old menu state before window A's save, add a
   different link and save.
6. The current `wp_navigation` post contains the stale window's link, but the
   restored page link from window A is gone.

### Evidence

The dedicated navigation-menu fuzzer failed on all seeds in an 18-worker run:

```text
18 failed / 18 run
```

A stricter browser-level repro also failed using normal visible UI controls:

- the Navigation block appender;
- the link search UI;
- the standard Site Editor Save button;
- two normal same-account browser windows.

Database evidence from the UI repro:

```text
3199 wp_navigation publish current menu:
  Home + support-ui link
  missing Debussy page link

3200 revision:
  Home + Debussy Images UI page link, id 3198

3201 revision:
  Home + support-ui link
  missing Debussy page link
```

### Why it is real

There is no fault injection, direct REST overwrite, direct `wp.data` mutation in
the browser UI repro, network stubbing, or artificial timing control. The stale
state comes from a normal second editor window.

The important architectural detail is that the `wp_navigation` Site Editor path
did not expose `_wpCollaborationEnabled` in the repro. That means the post-editor
RTC protection and fixes do not cover this surface.

### Likely fix direction

The menu editor needs a stale-save guard or a merge strategy for `wp_navigation`
records. A full stale menu serialization should not blindly replace a newer menu
that added a page link. Reasonable fix shapes include:

- enable the same RTC/conflict-prevention machinery for navigation menus;
- add entity-version or revision checks before saving `wp_navigation`;
- merge navigation-link additions at block level instead of overwriting the
  entire menu from the stale editor state;
- show a conflict/reload prompt rather than saving when the menu base revision is
  older than the server's current revision.

## 2. Same-account or support-session stale content overwrite

### User-visible symptom

This matches the saved draft/page content-loss reports: content a user sees as
saved can later be replaced by stale content from another window or a
support/SU-style same-account session.

### Repro shape

1. Open the same post or page in two same-account editor windows.
2. Window A writes the user's current content and saves.
3. Window B was opened before that save and still has stale local editor state.
4. Window B makes a smaller edit and saves.
5. The current post/page content is replaced by window B's stale body plus its
   small edit.

### Evidence

The page/content fuzzers found repeated current-content replacement. A
representative page repro left the current page with only the stale support
marker, while a revision still contained the original body and file markers.

This reproduces the content/title side of the `#11112607` page-loss ticket, and
the general saved-writing-loss shape in `#11173217`.

### Why it is real

The repros use normal editor windows and normal save paths. The failure is not a
test-only malformed REST payload: the stale editor's save is accepted and becomes
the current post content.

### Likely fix direction

The editor should not submit a full stale block tree as authoritative after a
newer server revision or CRDT state has been observed. The save path needs a
clear invariant:

> A save from an editor loaded from revision N must not overwrite content from
> revision N+1 unless the editor has merged or explicitly resolved that newer
> state.

Possible fixes include:

- save-time base revision checks;
- forcing stale same-account/support windows to reload before saving;
- CRDT-aware merge before save;
- making support/SU sessions read-only or conflict-aware for customer content.

## 3. Form-content overwrite variant

### User-visible symptom

This matches the DOTCOM-16667 style report linked from `#11173217`: customer
form block content is erased or replaced after a support/SU session interacts
with the page.

### Repro shape

The form-content fuzz lane creates a customer form/body marker and a stale
support-session marker. After the stale support save, the current content
contains the support form/body state and loses the customer marker.

### Why it is distinct enough to track

This is probably the same underlying stale-save class as bug 2, but it deserves
separate tracking because form/support blocks are exactly the support-ticket
surface. Losing form configuration or form body content has a different product
impact than losing plain paragraphs.

### Likely fix direction

The fix should be shared with the stale content overwrite fix, but regression
coverage should include form/support blocks specifically. A paragraph-only
regression would be too narrow for the Zendesk report.

## 4. Draft reopens blank despite saved DB content

### User-visible symptom

A draft is discoverable and contains the expected content in the database and in
revisions, but reopening it in the editor shows a blank or no-title document. If
the user then saves from the blank editor, this can turn into actual overwrite
loss.

### Evidence

A serial repro of draft-discoverability seed `10134` showed the editor reopened
blank while the database still had the marker:

```text
post 2869 draft:
  content length 78
  marker present

revisions 2871 and 2875:
  content length 78
  marker present
```

### Why this is not PR 77865

PR [#77865](https://github.com/WordPress/gutenberg/pull/77865) is about a new
post staying as a hidden `auto-draft`, with user content stored only in an
autosave revision and no ordinary draft-list recovery path.

This bug is different:

- the parent is already a visible `draft`;
- the content exists on the parent and in revisions;
- the editor rehydration/display path opens the draft as blank.

### Likely fix direction

The rehydration path needs to identify why the editor prefers blank local or CRDT
state over the persisted REST entity. The fix should preserve this invariant:

> If the parent draft record and its revisions contain content, reopening the
> editor must not initialize to a blank document unless the user explicitly
> chooses a blank revision or discard action.

Regression coverage should assert both the REST state and the editor-rendered
state after reopen.

## 5. Large normal edit causes `Connection lost`

### Classification against PRs 77669 and 77724

This finding is the same failure class as
[WordPress/gutenberg#77669](https://github.com/WordPress/gutenberg/pull/77669),
not [WordPress/gutenberg#77724](https://github.com/WordPress/gutenberg/pull/77724).

The observed failure signature was:

```text
400 rest_invalid_param
rooms[0][updates][0][data] must be at most 1,048,576 characters long.
```

That is the single-update `data` field max-length failure. PR #77669 fixed that
class by making the client account for base64 expansion before enqueueing a Yjs
update.

PR #77724 is thematically similar but distinct. It covers aggregate request-body
overflow:

```text
413 Request Entity Too Large
rest_sync_body_too_large
```

The #77724 failure can happen when many rooms each have individually valid
sub-1 MiB updates, but the combined `/wp-sync/v1/updates` request body exceeds
the server's 16 MiB body cap.

### What to do with this finding

Do not count this as a new bug if the target base includes #77669 and the
browser assets are rebuilt from that source. If the repro still fails on a clean,
built base containing #77669, then the next investigation should look for a path
that bypasses `MAX_UPDATE_SIZE_IN_BYTES` or runs stale built sync assets.

The current source tree checked during this writeup already contains both:

- the #77669 raw-size cap derived from the encoded 1 MiB server limit;
- the #77724 aggregate body-size budget constants.

That makes the most likely explanation for the observed large-edit failure that
the repro hit a stale or incomplete fixed base, not a new distinct bug.

## Recommended tracking

Track the following as distinct open issues or explanation branches:

1. `wp_navigation` stale-save overwrite in the Site Editor.
2. Post/page stale same-account or support-session overwrite.
3. Form/support-block stale overwrite coverage, either as its own issue or as a
   required regression case for issue 2.
4. Draft rehydration opens blank despite persisted content.

Do not open a new issue for the large single-update `Connection lost` repro
unless it reproduces on a clean built base after #77669.
