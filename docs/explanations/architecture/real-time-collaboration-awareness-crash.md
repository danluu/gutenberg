# Real-Time Collaboration Awareness Crash

## Summary

The real-time collaboration awareness path trusts remote awareness state as if it
were a typed `PostEditorAwarenessState`. In practice, awareness is client
provided JSON. The server accepts any non-null object, stores it, and returns it
to other clients in the same room. The HTTP polling provider then writes that
state directly into the local Yjs awareness map. Core-data publishes it to
subscribers, and the editor presence UI dereferences `collaboratorInfo` as a
required field.

A collaborator with edit access to the same room can therefore send malformed
awareness such as:

```json
{
	"unexpected": "missing collaboratorInfo"
}
```

When another editor receives that state, the presence UI can throw:

```text
Cannot read properties of undefined (reading 'avatar_urls')
```

This is a collaborator-to-collaborator UI denial of service. It also overlaps
with the existing awareness spoofing issue because the same trust boundary lets a
client provide arbitrary `collaboratorInfo` values. This path does not currently
look like script execution by itself: the known sinks pass names through React
text rendering and avatar URLs through normal attributes. The severe behavior
here is that one authorized collaborator can crash another collaborator's editor
surface.

## Data Flow

The vulnerable path is:

1. A client posts a sync payload to `/wp-sync/v1/updates`.
2. The PHP sync endpoint accepts `awareness` when it is any object or `null`.
3. `WP_HTTP_Polling_Sync_Server::process_awareness_update()` stores the submitted
   object under the sender's client ID and returns the stored `client_id => state`
   map to other room clients.
4. `processAwarenessUpdate()` in the HTTP polling manager writes each returned
   state into `awareness.getStates()` without validating the state shape.
5. `AwarenessState.updateSubscribers()` treats the raw Yjs awareness entry as the
   generic `State`, adds `clientId`, `isConnected`, and `isMe`, and publishes it
   to core-data subscribers.
6. `CollaboratorsPresence` and `CollaboratorsList` render
   `collaboratorState.collaboratorInfo.avatar_urls`,
   `collaboratorState.collaboratorInfo.name`, and
   `collaboratorState.collaboratorInfo.id` without checking that
   `collaboratorInfo` exists.

The current repro stack covers each boundary:

-   PHP endpoint replay:
    [`wpHttpPollingSyncServer.php`](../../../phpunit/tests/collaboration/wpHttpPollingSyncServer.php)
-   HTTP polling ingestion:
    [`polling-manager.test.ts`](../../../packages/sync/src/providers/http-polling/test/polling-manager.test.ts)
-   Core-data awareness publication and equality crash:
    [`awareness-state.ts`](../../../packages/core-data/src/awareness/test/awareness-state.ts)
-   Presence UI error-boundary crash:
    [`collaborators-presence/test/index.tsx`](../../../packages/editor/src/components/collaborators-presence/test/index.tsx)
-   Browser-level repro:
    [`collaboration-awareness-exception.spec.ts`](../../../test/e2e/specs/editor/collaboration/collaboration-awareness-exception.spec.ts)

## Root Cause

The root cause is a trust-boundary mismatch:

-   The transport layer models remote awareness as
    `Record< string, object | null >`, which is effectively untrusted JSON.
-   Core-data models post-editor awareness as `PostEditorAwarenessState`, where
    `collaboratorInfo` is required.
-   The HTTP polling provider converts the transport shape into the Yjs awareness
    map without parsing, validating, or normalizing it.
-   `AwarenessState` assumes every entry in `getStates()` has the subclass's
    expected fields, even though Yjs awareness maps can contain arbitrary remote
    values.
-   The editor UI trusts the TypeScript type and dereferences required fields at
    runtime.

There is a second crash mode in the same area. `AwarenessState.isFieldEqual()`
throws when it sees a top-level field without an equality checker. That is useful
for catching local implementation mistakes, but remote awareness can introduce
unknown fields. Once malformed remote state is in `previousSnapshot`, a later
update can trigger:

```text
No equality check implemented for awareness state field "unexpected".
```

So malformed awareness can break consumers either by missing required fields or
by adding unexpected fields.

## How The Bug Was Introduced

This was introduced by composing several changes that each made a reasonable
local assumption, but together crossed a trust boundary unsafely.

The awareness foundation, added by `fcbeef1c21a` (`Real-time Collaboration: Add
Yjs awareness foundation (#74565)`), created a typed awareness abstraction with
field-specific equality checks. That abstraction assumes awareness fields are
controlled by the subclass and throws when an unknown field appears.

The default HTTP polling provider, added by `48ce44dac79` (`Real-time
collaboration: Add default HTTP polling sync provider (#74564)`), made the
server-returned awareness map authoritative for remote clients. Its
`processAwarenessUpdate()` implementation writes remote awareness values directly
into `awareness.getStates()` and emits a Yjs awareness change event.

The PHP sync server path, later moved into the WordPress 7.0 compat location by
`69699955ed0` (`Real-time collaboration: Move PHP code to compat / backports
directory (#75366)`), accepts `awareness` as an object or `null`, stores the
object under the client ID, and returns the same object to peers. Later
permission and client-ID hardening, including `7f8ada36a3e` (`RTC: Verify client
ID to avoid awareness mutation (#76056)`) and `1be2ef27e68` (`Backport: Improve
validation and permission checks for WP_HTTP_Polling_Sync_Server (#76987)`),
improved who may use the endpoint and which client ID they may update, but did
not make the awareness state itself schema-safe.

The collaborators presence UI, introduced by `8e5a0039ff6` (`Real-time
Collaboration: Add collaborators presence UI (#75065)`) and later expanded by
presence polish changes such as `cbda05fa088` and `903cef79660`, renders
collaborator avatar and name fields as required data. That is correct if the
state is a validated `PostEditorAwarenessState`, but not if it is raw remote
JSON.

The bug therefore appears to have existed since the HTTP polling, awareness, and
presence UI paths were connected. It became reachable because the system never
added a runtime conversion point from "untrusted awareness JSON" to "valid
post-editor awareness state".

## Fix Plan

Fix this in layers. The client guard should land even if server validation also
lands, because existing bad state, old servers, plugins, or future transport bugs
must not be able to crash the editor.

### 1. Define the runtime awareness contract

Create one runtime validator/normalizer for post-editor awareness state. The
minimum valid non-empty state should be:

-   `collaboratorInfo` is present.
-   `collaboratorInfo.id` is a finite number.
-   `collaboratorInfo.name` and `collaboratorInfo.slug` are strings.
-   `collaboratorInfo.avatar_urls` is an object containing only string URL values
    for known sizes, or an empty object.
-   `collaboratorInfo.browserType` is a string.
-   `collaboratorInfo.enteredAt` is a finite number.
-   `editorState`, when present, matches the existing selection-state runtime
    expectations.
-   Unknown top-level fields are rejected or stripped before state reaches
    `AwarenessState.updateSubscribers()`.

Keep `null` as the disconnect signal. Decide explicitly whether `{}` remains an
allowed transient local state while collaborator info is loading. If `{}` remains
allowed, it must be treated as empty presence and must not be rendered or counted
as a collaborator.

### 2. Validate at the client trust boundary

Change the HTTP polling awareness types from "object" to "unknown until parsed".
Then validate each remote state before writing it into the Yjs awareness map.

Recommended behavior:

-   Drop invalid remote awareness entries.
-   If an invalid entry was already present locally, delete it and emit a removal
    change.
-   Do not emit an update for invalid state.
-   Optionally log a development-only warning with the room and client ID, but do
    not include attacker-controlled values in user-visible UI.

The sync package should not depend directly on editor/core-data state types. Use
one of these approaches:

-   Add an optional `validateAwarenessState` or `normalizeAwarenessState`
    callback to the room/provider registration path, supplied by core-data for
    post-editor rooms.
-   Or make the sync package perform only generic hardening (`plain object`,
    no arrays, bounded size), then have core-data validate before publishing
    `PostEditorAwarenessState` to hooks.

The stronger option is to validate before writing to Yjs and again before
publishing typed state.

### 3. Make `AwarenessState` robust against remote data

`AwarenessState.updateSubscribers()` should not assume that every entry returned
by `getStates()` is a valid `State`. Add a protected parser hook, for example:

```ts
protected normalizeRemoteState( rawState: unknown ): State | null;
```

Subclasses can implement schema-specific validation. The base implementation can
accept plain objects for generic awareness, but post-editor awareness should
return `null` for malformed values. `updateSubscribers()` should skip `null`
states before updating `seenStates`, `previousSnapshot`, or subscribers.

After this change, `isFieldEqual()` should only see fields from normalized
states. It can keep throwing for local developer mistakes, but malformed remote
state should never reach that comparison path.

### 4. Harden the PHP endpoint

Server validation is still needed because the server is the fan-out point.

Implement a REST schema or explicit validator for awareness state:

-   `null` is allowed for disconnect.
-   Empty state is allowed only if clients still need it during startup, and it
    should not be treated as renderable collaborator presence.
-   Non-empty state must match the post-editor awareness schema.
-   Unknown top-level fields should be rejected.
-   Invalid stored awareness entries should be skipped and removed when the room
    state is rewritten.

For the spoofing side of the same trust issue, prefer making identity fields
server-authoritative. The server already records `wp_user_id` for an awareness
entry. It can derive or verify `collaboratorInfo.id`, `name`, `slug`, and avatar
URLs from the authenticated WordPress user instead of trusting the client. The
client may still provide non-security-sensitive activity state such as selection.

### 5. Keep UI defensive

The UI should not be the primary validator, but it should remain resilient:

-   Filter collaborators without valid `collaboratorInfo` before rendering
    avatars, names, notifications, or scroll targets.
-   Avoid optional chaining that silently renders misleading partial identities;
    invalid collaborators should be absent from the presence UI.
-   Keep error boundaries as last-resort containment, not normal control flow.

### 6. Convert repros into regression tests

The repro tests on this branch should become passing regression tests for the
fixed behavior:

-   PHP: malformed awareness is rejected or omitted from the returned awareness
    map.
-   HTTP polling manager: malformed remote awareness is not stored in
    `awareness.getStates()` and does not emit an added/updated collaborator.
-   Core-data awareness: unknown remote fields do not throw and do not publish a
    malformed collaborator.
-   Presence UI: malformed awareness does not trip an error boundary.
-   Browser: one collaborator can post malformed awareness, but the other editor
    remains usable and the malformed collaborator is not shown.

Keep a separate positive-path test proving that valid collaborators still appear
and update normally.

## Fix Ordering

The safest landing order is:

1. Client-side validation and UI resilience, to stop the crash even with old or
   corrupted server state.
2. PHP validation and cleanup, to stop propagating bad awareness to other
   clients.
3. Server-authoritative collaborator identity, to address spoofing from the same
   trust boundary.
4. Test conversion from "repro demonstrates crash" to "malformed awareness is
   ignored or rejected".

This order reduces user-visible risk first without depending on every deployment
having the server fix immediately.
