# Real-Time Collaboration Privilege Escalation Bug

## Summary

Real-time collaboration can turn a lower-privilege collaborator into a confused
deputy of a higher-privilege collaborator.

The sync server authorizes access to a post room with post-level permissions,
for example `edit_post` on `postType/post:123`. Once a user is in that room,
their Yjs update can change any post property that the client-side post sync
configuration accepts. That set currently includes fields whose save
permissions can be stricter than ordinary post editing, including `author`,
`status`, `meta`, taxonomy terms, `date`, `featured_media`, `sticky`,
`template`, `comment_status`, `ping_status`, and `format`.

The remote change is then applied to the higher-privilege user's local
`core-data` edits. When that higher-privilege user saves the post through the
normal editor UI, `saveEditedEntityRecord()` sends the merged edits with the
higher-privilege user's REST nonce and capabilities.

That makes the higher-privilege user the deputy that persists the
lower-privilege user's unauthorized field change.

## Concrete Reproduction

The current repro uses an ordinary two-user editor session:

1. A test plugin registers `rtc_privileged_meta` as post meta with
   `show_in_rest: true` and an `auth_callback` requiring `manage_options`.
2. The same plugin displays a normal document settings sidebar field for that
   meta key.
3. An admin opens a draft post whose `rtc_privileged_meta` value is
   `admin-only original`.
4. A contributor who can edit the post opens the same collaborative editor
   session.
5. The contributor types `changed by limited collaborator` into the visible
   sidebar field.
6. Collaboration sync copies the new value into the admin's editor.
7. The admin clicks the normal `Save draft` button.
8. The saved REST value becomes `changed by limited collaborator`.

No direct REST write, console mutation, synthetic Playwright action, or
out-of-band state injection is needed. The contributor only types into a
visible editor control, and the admin only saves through the editor.

## Production Path

The vulnerable path is:

1. The lower-privilege user's editor calls `editEntityRecord()` with a synced
   post field.
2. `SyncManager.update()` applies the edit to the local CRDT document.
3. The HTTP polling provider sends an opaque Yjs update to the sync room.
4. `WP_HTTP_Polling_Sync_Server::check_permissions()` verifies room access,
   not field-level write authority for the contents of the update.
5. The higher-privilege user's client receives and applies the remote update.
6. `SyncManager` observes the remote CRDT transaction and calls
   `handlers.editRecord( changes )`.
7. `getPostChangesFromCRDTDoc()` turns the remote CRDT value into local
   non-transient `core-data` edits.
8. `saveEditedEntityRecord()` saves all non-transient edits with the current
   user's credentials.

The critical trust-boundary error is between steps 4 and 7: after a user has
room-level access, the system does not preserve or re-check the origin user's
authority for each changed field.

## Why Post-Level Authorization Is Not Enough

`edit_post` answers whether a user can edit the post object at all. It does not
mean that the user may perform every REST write associated with that post.

Examples of fields that can require stronger or different capabilities:

-   `status`: publishing can require `publish_posts`.
-   `author`: reassignment can require permission to edit the target author or
    otherwise manage the post.
-   taxonomy terms: assignment can require taxonomy-specific `assign_terms`
    capabilities.
-   post meta: each key can have its own REST `auth_callback`.
-   `featured_media`: setting media can involve upload or media permissions.

The REST API normally checks those permissions when the same user sends the
save request. In this bug, the lower-privilege user does not send the final
save request. Their change is first imported into an admin editor, then the
admin sends the save request.

## How The Bug Was Introduced

This is a composition bug, not a single intentionally unsafe line. The relevant
PRs created three assumptions that are individually reasonable but unsafe
together.

1. [#72114: Collaborative editing: Make syncing a side-concern instead of a replacement for local state](https://github.com/WordPress/gutenberg/pull/72114)

    This made collaboration a side effect of the `core-data` store rather than a
    replacement for it. That kept local entity records authoritative, but it also
    meant remote sync changes are applied as ordinary local edits.

2. [#72262: Improve CRDT "merge logic" for post entities](https://github.com/WordPress/gutenberg/pull/72262)

    This added post-specific CRDT merge logic and expanded the synced post
    surface beyond block content. The resulting allow list included fields such
    as `author`, `status`, `sticky`, `template`, taxonomy fields, and other
    properties with capability requirements that are not equivalent to
    `edit_post`.

3. [#72332: Real-time collaboration: Add support for syncing post meta](https://github.com/WordPress/gutenberg/pull/72332)

    This added post meta to the synced CRDT state and synced all meta by default
    except the internal CRDT persistence key. That made arbitrary REST-exposed
    meta keys eligible for collaboration sync, even when a key's `auth_callback`
    requires a stricter capability than ordinary post editing.

4. [#74562: Real-time collaboration: Move collaborative editing from experiments to default Gutenberg plugin experience](https://github.com/WordPress/gutenberg/pull/74562)

    This removed the experiment gate for the Gutenberg plugin experience. The
    earlier sync behavior was no longer confined to an explicitly enabled
    experiment.

5. [#74564: Real-time collaboration: Add default HTTP polling sync provider](https://github.com/WordPress/gutenberg/pull/74564)

    This introduced the default HTTP polling provider. The PR describes a relay
    approach: the server stores and forwards Yjs messages while clients handle
    CRDT operations. That design means the PHP server does not inspect the
    semantic field changes inside an update before forwarding it.

6. [#75681: Add minimum cap check to sync endpoint](https://github.com/WordPress/gutenberg/pull/75681)

    This added a minimum capability check to the sync endpoint. It improved the
    unauthenticated/no-role case, but the check is still too coarse for this bug:
    a contributor can pass the room check while lacking permission for fields
    inside the room.

7. [#75983: RTC: Auto-register custom taxonomy rest_base values for CRDT sync](https://github.com/WordPress/gutenberg/pull/75983)

    This changed the static post-property allow list into the current
    per-post-type `syncedProperties` set and auto-added taxonomy REST bases. It
    widened the set of field names that can flow through the post room. The PR
    notes that the REST API enforces taxonomy permissions on save; this bug is
    the case where that assumption breaks because a different, higher-privilege
    user performs the eventual save.

8. [#76987: Backport: Improve validation and permission checks for `WP_HTTP_Polling_Sync_Server`](https://github.com/WordPress/gutenberg/pull/76987)

    This hardened request validation and improved room-level object checks, such
    as validating post type and taxonomy term identity. It did not add
    field-level authorization for CRDT update contents, so the confused-deputy
    path remains.

## Why This Was Easy To Miss

The design relies on the REST API as the final authority for saves. That works
when the same user both creates an edit and sends the REST save.

Collaboration splits those two facts:

-   the lower-privilege user originates the edit
-   the higher-privilege user saves the edit

The sync layer currently does not retain enough provenance to let the save path
distinguish "admin typed this" from "admin received this from a contributor".

## Fix Plan

### Immediate Containment

1. Narrow the default post CRDT sync surface to fields that are safe for every
   participant who can enter the post room.
2. Remove privileged or capability-sensitive fields from default post sync:
   `author`, `status`, `meta`, taxonomy REST bases, `date`, `featured_media`,
   `sticky`, `template`, `comment_status`, `ping_status`, and `format`.
3. Do not sync arbitrary post meta by default. Only sync explicitly declared
   collaborative meta keys, and require that those keys are safe for all room
   participants or have a field-level authorization strategy.
4. Keep block content/title/excerpt syncing only after confirming that the same
   post-level permission is sufficient for all participating roles in the
   target editor workflow.

This containment is intentionally conservative. It prevents known privilege
crossing while a more complete authorization model is designed.

### Structural Fix

1. Add provenance to remote changes before they enter `core-data` edits.
   `SyncManager` should know whether each dirty field came from local input or
   from a remote user, and which WordPress user/client originated it.
2. Add a `syncConfig` authorization layer for remote fields. For post entities,
   this layer must be per property and, for `meta`, per meta key.
3. Filter remote CRDT changes before calling `handlers.editRecord( changes )`.
   Unauthorized remote fields should be ignored or left as remote-only CRDT
   state, not placed into the local save payload.
4. Filter save payloads by provenance as a second line of defense.
   `saveEditedEntityRecord()` or the post entity pre-persist path should avoid
   saving remote-origin fields unless the origin user was authorized for that
   exact field.
5. For fields where PHP must be authoritative and Yjs updates are opaque, stop
   using generic CRDT room updates. Use structured operations that the server
   can validate, or require the originating user to perform a real REST write
   and use collaboration only to notify/refetch peers.
6. Treat server room permission as a transport permission only. Do not use it as
   authorization for every field inside the room.

### Test Plan

Keep repro coverage at three levels:

1. CRDT utility test: a lower-privilege remote update to `author`, taxonomy
   fields, `meta`, and `status` must not surface as local save edits.
2. Save-payload test: remote-only privileged edits must not be included in
   `saveEditedEntityRecord()` payloads.
3. Playwright test: a contributor using normal editor UI must not be able to
   change an admin-only meta key by syncing it into an admin editor and waiting
   for the admin to save.

Add negative controls:

1. Ordinary collaborative block/content edits still sync and save.
2. A user who is actually authorized for a protected field can still edit and
   save that field.
3. Unauthorized remote edits are not persisted by autosave, manual save,
   publish, reload reconciliation, or CRDT persistence replay.

## Non-Fix

Only tightening `WP_HTTP_Polling_Sync_Server::can_user_sync_entity_type()` is
not sufficient. That function can decide whether a user may join
`postType/post:123`, but it cannot validate an opaque Yjs update's semantic
changes without additional protocol support.

Likewise, relying on the REST API save check alone is not sufficient, because
the final REST save is made by the higher-privilege user, not by the user who
originated the collaborative edit.
