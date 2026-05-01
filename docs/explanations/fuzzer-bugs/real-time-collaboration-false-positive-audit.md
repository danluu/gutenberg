# Real-Time Collaboration Bug False-Positive Audit

This document summarizes the RTC bugs found during the revision-loss fuzzing and
Zendesk-ticket audit, and classifies whether each one is a false positive.

## Classification

- **Real**: normal user actions, or a production server/client path, can trigger
  the failure with a user-visible oracle.
- **Real but masked**: the lower-level implementation is wrong, but current
  product wiring makes ordinary user reachability weak or disabled.
- **Likely real**: the mechanism and repro are valid, but field frequency is not
  established.
- **Not direct data loss**: the bug is real, but it is unlikely to explain
  missing post content or missing revisions by itself.
- **False positive**: the failure depends on an invalid oracle, impossible
  production arguments, or test-only behavior.

## Confirmed User-Data Or Revision-Loss Bugs

### 1. Title reload / stale REST save response

**Verdict: Real. Not a false positive.**

An automatic CRDT persistence save can receive a full REST post response whose
title, content, or excerpt fields are stale relative to live RTC state. If that
full REST response is replayed into the sync manager, it becomes a live CRDT
update and can overwrite the collaborator's already-synced unsaved value.

The failure is not a browser timing artifact. It reproduces at the core-data
action level, the resolver/persistence level, and in a browser with normal
reload and edit actions. The important user-visible check is that the edited
title is visible through RTC before reload, then disappears from the live editor
state after reload/save handling.

This explains revision loss because a later normal save can persist the stale
value, and revision history then contains the stale value rather than the
previous user-visible RTC edit.

The false-positive checks are:

- The saved database title remaining old before the user saves is normal and is
  not the bug.
- The bug is specifically the stale saved value being written back into the
  live CRDT document.
- The repro does not require network faults, artificial clock changes, or direct
  Y.Doc mutation.

### 2. Same-user no-CRDT fallback revision loss

**Verdict: Real. Not a false positive.**

When a post has no persisted CRDT metadata, a reloaded same-user session can join
a live RTC room, receive newer unsaved RTC state, and then apply the stale REST
record as fallback bootstrap data. That stale bootstrap write can propagate back
to the active same-user session.

This is realistic for old posts, imported posts, REST-created posts, and content
created before RTC metadata existed. The browser repro uses normal actions:
open the same draft in two same-user sessions, edit the title, reload the second
session, edit body content, and save.

The failure is not merely "two tabs are dangerous" as a vague support
explanation. The lower-level analysis identifies the broken invariant:
bootstrap data from a stale REST record must not overwrite live CRDT state that
has already arrived from a peer.

It is not the exact same bug as duplicate table body loss or auto-draft autosave
loss, but it is a real revision-loss class because the user's newer value can be
absent from revisions after a normal save.

### 3. Duplicate table body revision loss

**Verdict: Real. Not a false positive.**

A table with duplicate rows can lose a body edit when one collaborator edits the
later duplicate row and another collaborator deletes the earlier duplicate row.
The loss happens during RTC convergence. A later normal Save draft then persists
the already-lost table body, so revisions cannot recover the edited marker.

The browser repro uses stock editor actions:

1. Open a collaborative post with a table containing `anchor`, `same`, `same`.
2. User A changes the later `same` row to `edited-second-duplicate`.
3. User B deletes the earlier `same` row through the table toolbar.
4. Both editors converge on `anchor`, `same`.
5. A normal save records revisions without `edited-second-duplicate`.

This is not a Playwright-only assertion issue. The marker is observed in the
editing user's browser before the other row is deleted, and lower-level CRDT and
SyncManager repros hit the same duplicate-row identity failure.

### 4. Independent no-CRDT duplicate table bootstrap

**Verdict: Real. Not a false positive.**

This is related to, but distinct from, shared-CRDT duplicate table row identity.
When two sessions independently bootstrap from the same serialized post HTML,
each can assign different internal query-array identities to the same visible
duplicate rows. If the content has no persisted CRDT document yet, there is no
shared hidden identity to distinguish one `same` row from the other.

The setup is realistic because old, imported, API-created, or newly converted
content can start from serialized HTML rather than persisted CRDT state. The
bug is not caused by a synthetic custom block or direct Y.Doc mutation.

The strongest product symptom is the duplicate table body revision-loss repro:
the independently bootstrapped duplicate rows make the later edit and earlier
delete ambiguous, then the normal save records the lost state.

### 5. RTC auto-draft autosave loss

**Verdict: Real. Not a false positive.**

With RTC enabled, the autosave controller routes even `auto-draft` posts to
autosave revisions instead of promoting or updating the parent draft. A single
user can create a new post, have autosave fire, lose the editor URL or session,
and then not find a visible draft containing the content.

This matches the Zendesk pattern where a user worked on a new post, expected
autosaves to exist, and could not find a draft or recoverable revision. The
server-level repro is a normal REST autosave request, not fault injection. The
important distinction is that an autosave revision attached to an `auto-draft`
does not provide the same discoverability as promoting the parent post to a
draft.

This is not the same bug as stale block merge loss. It is a PHP/server autosave
policy bug. It can happen with one user and does not require two collaborators.

## Confirmed Content-Corruption Or Merge Bugs

### 6. Rich-text cursor-scope corruption

**Verdict: Real. Not a false positive.**

The RTC block-merge path historically collapsed a scoped rich-text selection
down to a bare cursor offset. If a user selects one rich-text field in a block
and then performs an action that changes another rich-text field in the same
block, the merge can reuse the wrong field's cursor offset.

The confirmed stock repro uses the core File block:

1. Put the caret in the visible Download button text.
2. Toggle the normal File block setting `Open in new tab`.
3. Replace the file through the normal toolbar/media-library flow.
4. The collaborator receives a corrupted file name.

This is a bundled core block and normal user UI. It is not a synthetic helper
case. The false-positive checks rule out the earlier offset-space bug because
the selected field is plain text; the corruption comes from losing the
`attributeKey` scope, not from converting offsets in the selected field.

### 7. Stale rich-text sibling overwrite

**Verdict: Real. Not a false positive.**

The post block merge path receives full block snapshots. If user A emits an
older snapshot that changes rich-text sibling A while the local CRDT document
already contains user B's newer sibling B edit, the merge can treat A's old
sibling B value as authoritative and overwrite or truncate B's edit.

The browser repro used normal user actions in a large post with a File block:
one user continues typing in the download button text while another user edits
the file name. The lower-level tests isolate the same problem with sibling
rich-text attributes. The failure is not direct Y.Doc mutation or a mocked
provider artifact.

The key invariant violation is that a stale full snapshot is being treated as
an operation log. A local write should apply only the local delta, not old
values for siblings the user did not touch.

### 8. Stale top-level block snapshot overwrite

**Verdict: Real merge bug, but masked on the current title-only branch.**

At the CRDT merge layer, an older full block-array snapshot can delete a remote
top-level append or resurrect a remote top-level delete. For example:

1. Current Y.Doc has `Alpha`, `Beta`, `Gamma` after a remote append.
2. A stale local snapshot has only `Alpha local edit`, `Beta`.
3. `mergeCrdtBlocks()` compares the shorter incoming array to the current
   Y.Array and infers a delete.
4. The remotely appended `Gamma` is removed.

That is a real algorithmic bug. It is not a Yjs convergence failure; Gutenberg
writes the wrong operation into Yjs.

The current branch has an important reachability caveat: post RTC syncing is
gated to safe properties, and `SAFE_POST_SYNC_PROPERTIES` contains `title` but
not `blocks`. That means ordinary post block content does not usually enter
this merge path on this branch. The bug is therefore masked unless block sync is
enabled or another production entity path feeds blocks into `mergeCrdtBlocks()`.

### 9. Stale table/query-array snapshot overwrite

**Verdict: Real lower-level bug; stock UI reachability is weaker on the current
branch.**

Nested table rows and cells are query-array attributes stored as nested Yjs
structures. A stale local table snapshot can overwrite remote cell edits, delete
remote appended rows, or resurrect remote deleted rows because the merge treats
the entire stale table body as the desired current body.

The CRDT and post-adapter repros are valid. They use normal Yjs update exchange
and the production-shaped post adapter. The weak point is browser reachability:
many normal table UI attempts refresh editor state before the stale write is
emitted, so the exact stale schedule is harder to hit through current stock UI.

This is not an invalid oracle. It is a real stale-snapshot merge bug whose
current user frequency is uncertain and partly mitigated by title-only block
sync gating.

### 10. Object+query stale snapshot overwrite

**Verdict: Real for the block platform and custom/stateful blocks. Not proven
common for bundled core blocks.**

A block with an object-backed `query` attribute can keep a local draft object in
its edit UI. If that local draft is stale, committing one property can overwrite
a remote sibling property already present in the CRDT document.

The browser repro uses normal editor actions with a custom block. The custom
block setup is realistic for plugin/block-platform code: stateful block UIs
commonly stage object edits locally before committing them. The lower-level
repros show the same failure through `mergeCrdtBlocks()` and the post adapter.

This is not a false positive, but the evidence is strongest for plugin/custom
blocks rather than a specific bundled core block.

## Real RTC Correctness Bugs That Are Not Direct Revision Loss

### 11. Nested selection history

**Verdict: Real correctness bug, but not direct content or revision loss.**

Selection history needs to store relative positions for nested rich-text fields.
For nested Y.Map/Y.Array/Y.Text structures, the old path could fall back to a
block-only selection instead of preserving a relative text position.

The fuzzer oracle is valid because it checks a real Yjs invariant: after text is
inserted before the cursor, the relative position should resolve back to the
same nested Y.Text. The production-shaped tests exercise the same structure used
by schema-aware CRDT block attributes.

The caveat is browser reachability. The closest first-party UI is table cells,
but current table cell RichText selections do not provide the stable nested
`attributeKey` needed for a pure stock UI repro. This is still not a false
positive; it is a real nested-selection bug with weak first-party browser proof.

### 12. Awareness and presence lost-update bugs

**Verdict: Real RTC correctness bugs, not direct data loss.**

The awareness/storage bugs found during the broader RTC work can lose presence,
selection, or collaborator state under races or stale writes. These are valid
production-shaped failures and affect collaboration correctness.

They should not be treated as explanations for missing written post content by
themselves. They can make the editor misleading, but they do not directly prove
that title/body revisions lost user content.

### 13. Undo cross-entity metadata

**Verdict: Real, but not direct revision loss.**

When the editor syncs more than one entity, each entity can register undo
metadata handlers on a shared undo manager. If handlers are not scoped by the
Yjs document/entity that produced the undo stack item, a post undo can run
metadata logic for a category or another entity.

The stock repro uses normal UI: opening the publish panel can load and sync a
default category entity, then typing into the post and pressing undo can restore
metadata from the wrong scope.

This is a real multi-entity RTC undo bug. It is unlikely to explain missing
saved content or missing revisions directly because the failure is in undo
metadata, especially selection restoration, not in the save/revision path.

## Real Transport And Room-Lifecycle Bugs

### 14. Sync update size and body-size accounting

**Verdict: Real transport bug. Not a false positive.**

The client and server have byte limits for individual updates and whole sync
request bodies. Several bugs came from accounting for raw Yjs byte length while
the server validates base64-encoded strings, or from batching too many room
updates into one request.

These failures can produce real `400`, `413`, or generic "Connection lost"
behavior. They explain publish/sync failures like the Zendesk connection-lost
ticket better than they explain silent revision loss.

The valid oracle is transport behavior: request size, server status, and absence
of the generic connection-lost modal after the fix. It is not a raw data-loss
oracle.

### 15. Oversized compaction snapshot

**Verdict: Likely real; field frequency unknown.**

After a room accumulates enough history, the server can ask a client to compact
the room. The client then creates a full-state Yjs compaction update. That
encoded compaction can exceed the server's per-update `data` size limit even if
ordinary incremental updates fit.

The repro is deterministic once the room and document are large enough, and the
server returns a structured REST validation error. That is strong evidence this
is not a fuzz harness artifact.

The reason for caution is frequency. The confirmed repro used a large document
and substantial accumulated room history. It is plausibly user-reachable but not
yet proven to be a common field cause.

### 16. Primary-room unregister

**Verdict: Real. Not a false positive.**

The HTTP polling provider uses a primary room to decide when collaborators are
present and queued updates can resume. If the primary post room is unregistered
after an oversized document/update while another room such as notes/comments
survives, the surviving room can continue polling but never resume its own
queued updates.

The stock repro uses normal editor actions: trigger the post room to exceed the
document size limit, let another editor join a surviving room, then add a note.
The note exists locally but is not sent to the collaborator.

This is a real room-lifecycle bug. It is not direct revision loss, but it can
make collaboration updates disappear until the room/provider state is repaired.

### 17. Compaction 403 recovery

**Verdict: Real. Not a false positive.**

A sync request can contain multiple rooms. If one room becomes forbidden, for
example because a category was deleted, the server can return a 403 while
another room in the same request has a queued compaction update. Recovery must
remove the forbidden room and preserve the surviving room's valid queued work.

The bug is that recovery can either fail to recognize the structured 403 or can
restore the failed batch in a mode that drops compaction updates. This is a real
protocol recovery bug with normal WordPress UI ingredients.

It is not itself a revision-loss bug, but it can prevent valid room state from
making progress.

## Actual False Positives

### 18. Rich-text helper seed 46016

**Verdict: False positive.**

The expected target HTML was malformed and unstable under Gutenberg rich-text
normalization. A mismatch against an invalid expected string does not prove the
editor can corrupt valid user-created rich text.

This seed was useful because it improved the fuzzer oracle: rich-text expected
values must be stable under the same RichTextData normalization that production
uses before we classify a mismatch as a product bug.

### 19. Rich-text helper seeds 46153 and 46181

**Verdict: False positives.**

These seeds require non-null cursor hints on a production path that calls
`mergeRichTextUpdate()` with `cursor = null`. The low-level helper can behave
badly under those forced arguments, but the corresponding product path does not
pass those arguments.

The lesson is that cursor-sensitive helper failures must be replayed against the
real production caller before being treated as user-triggerable bugs.

### 20. Raw CRDT blob mismatch oracle

**Verdict: False positive as a data-loss signal.**

Two CRDT documents or persisted CRDT blobs can differ while user-visible editor
content and saved revisions are correct. A raw blob mismatch is useful for
debugging, but it is not by itself a valid user-data-loss oracle.

For revision-loss fuzzing, the stronger oracle is:

1. editor-visible title/body/block content;
2. persisted post content after normal save/autosave;
3. revision contents that a user can restore.

If those are correct, a raw CRDT serialization difference should not be reported
as user-visible revision loss.

## Current Branch Caveat

Several block-content merge bugs are real in the CRDT layer, but the current
known-fixes branch gates post RTC syncing to `title` only. That means normal
post `blocks` are not currently synced through `applyPostChangesToCRDTDoc()` on
this branch. This is a mitigation or mask, not proof that the underlying block
merge bugs are false positives.

The strongest confirmed user-data and revision-loss bugs from this audit are:

- title reload / stale REST save response;
- same-user no-CRDT fallback revision loss;
- duplicate table body revision loss;
- RTC auto-draft autosave loss.

