# Real-Time Collaboration Privilege Escalation Bug

## Summary

Real-time collaboration can turn a lower-privilege collaborator into a confused
deputy of a higher-privilege collaborator.

The sync server authorizes access to a post room with post-level permissions,
for example `edit_post` on `postType/post:123`. Once a user is in that room,
their Yjs update can change any post property that the client-side post sync
configuration accepts. That set currently includes fields whose save
permissions can be stricter than ordinary post editing, including `blocks`,
`content`, `author`, `status`, `meta`, taxonomy terms, `date`,
`featured_media`, `sticky`, `template`, `comment_status`, `ping_status`, and
`format`.

`content` is not automatically safe just because it is the primary editor
field. WordPress filters post content differently depending on the saving
user's capabilities. For example, a contributor without `unfiltered_html` can
type a `<script>` tag into a Custom HTML block, but a direct contributor save
is sanitized by KSES. If the same block content is synced into an admin editor
and then published by the admin, the final save runs with the admin's
`unfiltered_html` capability.

The remote change is then applied to the higher-privilege user's local editor
state and eventual `core-data` save payload. When that higher-privilege user
saves the post through the normal editor UI, `saveEditedEntityRecord()` sends
the merged edits with the higher-privilege user's REST nonce and capabilities.

That makes the higher-privilege user the deputy that persists the
lower-privilege user's unauthorized field change.

## Concrete Reproductions

There are two concrete repros. They demonstrate the same confused-deputy bug
through two different authorization boundaries.

### Repro 1: Fixture Plugin Admin-Only Meta

The first repro uses an ordinary two-user editor session with a small test
plugin. The plugin is only there to make the field-level authorization boundary
obvious and deterministic:

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

This repro isolates the generic entity-field problem. The contributor can
enter the post room because they can edit the post, but they cannot directly
write this meta key. RTC nevertheless transfers the contributor's meta edit
into the admin's local save payload, and the final save is authorized as the
admin.

### Repro 2: Standard Custom HTML Block

The second repro uses only standard Gutenberg and WordPress components. No
custom bug plugin is active:

1. A contributor owns a draft post and an admin opens the same post in the
   collaborative editor.
2. As a negative control, the same contributor directly saves post content
   containing a Custom HTML block with `<script>`. The REST save returns
   success, but KSES strips the script tag because the contributor does not
   have `unfiltered_html`.
3. The contributor opens the same collaborative editor session.
4. The contributor uses the normal block inserter to add the built-in Custom
   HTML block.
5. The contributor uses the block's normal `Edit HTML` dialog and types a
   `<script>` tag.
6. RTC sync copies that block content into the admin's editor state before any
   server-side KSES filtering.
7. The admin uses the normal `Publish` flow.
8. The published `post_content` still contains the contributor-controlled
   `<script>` tag.

This repro is more realistic because the UI and field are both built in. The
authorization boundary is WordPress' existing `unfiltered_html` capability:
the contributor may edit the post, but their direct save must not persist
unfiltered script content. RTC changes who performs the final save, so the
contributor's content is judged under the admin's capability set instead.

### Why Both Repros Matter

The fixture-plugin meta repro proves that arbitrary synced entity fields can
cross per-field REST authorization boundaries such as meta `auth_callback`s.
The standard Custom HTML repro proves that even primary block content can be
capability-sensitive. A fix that only removes `meta` from sync would miss the
`unfiltered_html` path. A fix that only sanitizes block content would miss
other fields such as `author`, `status`, taxonomy terms, and privileged meta.

## Production Path

The vulnerable path is:

1. The lower-privilege user's editor changes a synced post field or synced
   block content.
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

For the Custom HTML repro, the privileged value is in the synced
`blocks`/`content` surface instead of in `meta`. The final REST request is
still made by the admin, so KSES applies the admin's `unfiltered_html`
capability rather than the contributor's missing capability.

The critical trust-boundary error is between steps 4 and 7: after a user has
room-level access, the system does not preserve or re-check the origin user's
authority for each changed field.

## Why Post-Level Authorization Is Not Enough

`edit_post` answers whether a user can edit the post object at all. It does not
mean that the user may perform every REST write associated with that post.

Examples of fields that can require stronger or different capabilities:

-   `content`/`blocks`: unfiltered HTML is controlled by `unfiltered_html`, so
    a contributor's direct save can be sanitized while an admin save preserves
    the same HTML.
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
PRs created several assumptions that are individually reasonable but unsafe
together.

1. [#72114: Collaborative editing: Make syncing a side-concern instead of a replacement for local state](https://github.com/WordPress/gutenberg/pull/72114)

    This made collaboration a side effect of the `core-data` store rather than a
    replacement for it. That kept local entity records authoritative, but it also
    meant remote sync changes are applied as ordinary local edits.

2. [#72262: Improve CRDT "merge logic" for post entities](https://github.com/WordPress/gutenberg/pull/72262)

    This added post-specific CRDT merge logic and expanded the synced post
    surface beyond the smallest possible set of editor content. The resulting
    allow list included `blocks`/`content` as well as fields such as `author`,
    `status`, `sticky`, `template`, taxonomy fields, and other properties with
    capability requirements that are not equivalent to `edit_post`.

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

The meta repro depends on the later addition of post meta sync. The Custom HTML
repro does not. It follows from the more fundamental decision to sync editor
content through a room transport whose server permission check is coarser than
WordPress' per-user content filtering rules.

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
2. Do not treat `blocks` or `content` as automatically safe. Remote-origin
   block content must either be filtered as the origin user before it can be
   saved by another user, or cross-user content sync must be disabled when the
   participants do not share the same relevant content capabilities, especially
   `unfiltered_html`.
3. Remove privileged or capability-sensitive fields from default post sync:
   `author`, `status`, `meta`, taxonomy REST bases, `date`, `featured_media`,
   `sticky`, `template`, `comment_status`, `ping_status`, and `format`.
4. Do not sync arbitrary post meta by default. Only sync explicitly declared
   collaborative meta keys, and require that those keys are safe for all room
   participants or have a field-level authorization strategy.
5. Keep title, excerpt, and other text-like fields only after confirming
   whether they have the same KSES or capability-sensitive behavior as content
   in the target editor workflow.

This containment is intentionally conservative. It prevents known privilege
crossing while a more complete authorization model is designed.

### Structural Fix

1. Add provenance to remote changes before they enter `core-data` edits or
   block editor content. `SyncManager` should know whether each dirty field or
   block/content delta came from local input or from a remote user, and which
   WordPress user/client originated it.
2. Add a `syncConfig` authorization layer for remote fields. For post entities,
   this layer must be per property and, for `meta`, per meta key. For
   `blocks`/`content`, it must account for origin-user content filtering such
   as `unfiltered_html`.
3. Filter remote CRDT changes before calling `handlers.editRecord( changes )`.
   Unauthorized remote fields should be ignored or left as remote-only CRDT
   state, not placed into the local save payload.
4. Filter save payloads by provenance as a second line of defense.
   `saveEditedEntityRecord()` or the post entity pre-persist path should avoid
   saving remote-origin fields unless the origin user was authorized for that
   exact field.
5. For content where PHP/KSES must be authoritative and Yjs updates are opaque,
   either use structured operations that the server can validate and sanitize
   as the origin user, or require the originating user to perform a real REST
   write and use collaboration only to notify/refetch peers.
6. Treat server room permission as a transport permission only. Do not use it as
   authorization for every field inside the room.

### Test Plan

Keep repro coverage at three levels:

1. CRDT utility test: a lower-privilege remote update to `author`, taxonomy
   fields, `meta`, `status`, and unfiltered block content must not surface as
   local save edits for a higher-privilege user.
2. Save-payload test: remote-only privileged edits must not be included in
   `saveEditedEntityRecord()` payloads.
3. Playwright test: a contributor using normal editor UI must not be able to
   change an admin-only meta key by syncing it into an admin editor and waiting
   for the admin to save.
4. Playwright test: a contributor using the built-in Custom HTML block must not
   be able to persist `<script>` by syncing it into an admin editor and waiting
   for the admin to publish.

Add negative controls:

1. Ordinary collaborative block/content edits still sync and save.
2. A user who is actually authorized for a protected field can still edit and
   save that field.
3. A contributor's direct save of the Custom HTML `<script>` test content is
   sanitized, proving the script only persists through the collaboration
   confused-deputy path.
4. Unauthorized remote edits are not persisted by autosave, manual save,
   publish, reload reconciliation, or CRDT persistence replay.

## Fix Plan Audit Perspectives

These are reviews of the proposed fix plan, not reviews of a landed production
fix. They are written as engineering lenses associated with each reviewer,
rather than direct quotes or impersonations.

### Linus Torvalds-Style Systems Review

Findings:

1. The plan has the right first instinct: reduce the sync surface before
   designing a richer authorization system. A small hard allow list is easier
   to reason about than provenance threaded through a large generic CRDT path.
2. The structural fix is still too abstract. A vague `syncConfig`
   authorization layer could become another stringly typed policy table that
   looks good in review but is bypassed by the next field added to
   `syncedProperties`.
3. Provenance must not become hidden mutable state that is separate from the
   data being saved. If the save path can lose or ignore provenance, the bug
   will come back under a different field name.
4. The current plan should be explicit that default behavior must fail closed.
   New post properties, taxonomy REST bases, and meta keys should not
   automatically become collaboratively writable.

Suggested changes:

1. Make the containment patch brutally simple: remove every capability-sensitive
   property from default sync until each one has a field-specific permission
   proof.
2. Put the allow list and its authorization predicate in one obvious code path.
   Avoid scattered checks where sync setup, CRDT merge, and save preparation
   each know only part of the rule.
3. Add tests directly next to the code that constructs `syncedProperties` and
   directly next to the code that prepares save payloads. Do not rely only on
   end-to-end tests.
4. Require any future synced field to include a test proving that a lower-role
   origin user cannot persist it through a higher-role saver.

### Kyle Kingsbury / Jepsen-Style Distributed Systems Review

Findings:

1. The bug is a distributed authorization failure, not just a bad field list.
   The important property is: if the origin user is not authorized for a value,
   no later merge, replay, save, publish, autosave, or reconnect by another
   participant should persist that value.
2. Single-session happy-path repros are necessary but not sufficient. The fix
   must survive concurrent edits, delayed sync updates, persisted CRDT replay,
   users joining late, users leaving, and capability changes while updates are
   in flight.
3. Provenance needs causal durability. If provenance exists only in ephemeral
   client memory, then reload, compaction, CRDT persistence, or room replay can
   detach the privileged value from its lower-privilege origin.
4. The system needs an explicit invariant that can be tested across histories,
   not just examples for `meta` and Custom HTML.

Suggested changes:

1. Define the safety property in tests: for every remote-origin field or content
   update, persistence must be authorized against the origin user, not the
   eventual saver.
2. Add replay tests where an unauthorized CRDT update is persisted in the room,
   an admin joins later, and the admin saves or publishes.
3. Add revocation tests where a user originates or receives an update, then the
   user's role or capabilities change before save.
4. Add concurrent tests where an authorized admin and unauthorized contributor
   edit the same field or block content, and verify the merge cannot launder
   the unauthorized value.
5. Track provenance through any CRDT snapshot, merge, persistence, compaction,
   and reload path, or else keep privileged data out of opaque CRDT updates.

### tptacek-Style Security Review

Findings:

1. The core security boundary is simple: attacker-controlled data must not be
   blessed by a more privileged principal merely because it arrived through
   collaboration.
2. Client-side provenance is not a strong security primitive by itself. If a
   malicious client can forge, omit, or reshape provenance, the server cannot
   trust it as authorization evidence.
3. The plan should avoid saying "sanitize before save" without specifying whose
   authority is used. Sanitizing at the final admin save is exactly the broken
   behavior for `unfiltered_html`.
4. The Yjs update should be treated as untrusted transport bytes. Room access
   proves only that a user may participate in a collaboration session; it does
   not prove authority over every operation encoded in the update.

Suggested changes:

1. For privileged fields and privileged content, prefer structured operations
   that the server validates as the origin user, or require the origin user to
   perform the real REST write and use collaboration only to notify peers.
2. If content sync remains client mediated, filter remote-origin content using
   the origin user's content rules before it can enter another user's save
   payload.
3. Add direct REST negative controls for every repro: prove the lower-privilege
   user cannot directly persist the value, then prove collaboration no longer
   changes that result.
4. Extend the Custom HTML test beyond `<script>` to include representative KSES
   cases such as event-handler attributes, dangerous URLs, and embeds if those
   are accepted or rejected differently by role.
5. Do not rely on UI hiding as a security boundary. The fix must hold for a
   malicious collaborator that can send arbitrary sync updates after joining a
   room.

### Dan Luu-Style Debugging And Regression Review

Findings:

1. The plan is directionally right, but it needs an inventory. Without a table
   of every synced property, its UI exposure, direct REST behavior, relevant
   capabilities, and collaboration behavior, the fix risks solving only the two
   repros.
2. The Custom HTML repro changes the priority. This is not just about obscure
   plugin meta. A standard block and a standard WordPress capability are enough
   to demonstrate the issue.
3. The immediate containment plan should state the product tradeoff. Removing
   fields from RTC can break some collaborative niceties, but silent privilege
   escalation is worse than temporarily not syncing a field.
4. The test plan needs a crisp definition of "fixed" that includes every
   persistence path users naturally trigger, not just the manual save path in
   the first repro.

Suggested changes:

1. Build and keep a synced-property matrix covering `blocks`, `content`,
   `title`, `excerpt`, `author`, `status`, `meta`, taxonomy REST bases, `date`,
   `featured_media`, `sticky`, `template`, `comment_status`, `ping_status`, and
   `format`.
2. For each property, record the minimum capability for direct REST persistence,
   whether the standard UI exposes it to lower roles, and whether RTC can import
   it into a higher-role user's payload.
3. Treat the two videos as complementary regression artifacts: the fixture meta
   video explains field-level authorization, and the Custom HTML video explains
   why standard content sync is also in scope.
4. Make the acceptance criterion explicit: unauthorized remote-origin data must
   not persist through save, autosave, publish, reload reconciliation, late
   join, CRDT persistence replay, or role changes.
5. Prefer a conservative shipped fix with documented temporarily disabled sync
   behavior over a broad provenance redesign that leaves the known exploit
   reachable while the full design is debated.

## Non-Fix

Only tightening `WP_HTTP_Polling_Sync_Server::can_user_sync_entity_type()` is
not sufficient. That function can decide whether a user may join
`postType/post:123`, but it cannot validate an opaque Yjs update's semantic
changes without additional protocol support.

Likewise, relying on the REST API save check alone is not sufficient, because
the final REST save is made by the higher-privilege user, not by the user who
originated the collaborative edit.
