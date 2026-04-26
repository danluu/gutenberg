# Real-Time Collaboration Awareness Crash

## Summary

Real-time collaboration is still an unreleased feature, so this bug should be
treated as a pre-release protocol-design bug rather than a compatibility problem
with deployed RTC implementations.

The current awareness protocol lets an authenticated collaborator send arbitrary
JSON as their awareness state. The PHP sync endpoint stores that object and
returns it to other clients in the room. The HTTP polling provider writes the
returned object directly into the local Yjs awareness map. Core-data then treats
the entry as a typed `PostEditorAwarenessState`, and the editor presence UI
dereferences required fields such as `collaboratorInfo.avatar_urls`.

That means one collaborator with edit access to the same room can submit:

```json
{
	"unexpected": "missing collaboratorInfo"
}
```

When a peer receives that state, the peer can hit:

```text
Cannot read properties of undefined (reading 'avatar_urls')
```

This is a collaborator-to-collaborator editor UI denial of service. It is the
same trust-boundary failure as the awareness spoofing issue: the server treats
client-supplied presence and identity data as authoritative and fans it out to
other clients.

This path does not currently look like script execution by itself. The known
presence sinks render names through React text rendering and avatar URLs through
normal element attributes. The issue is still security-relevant because an
authorized collaborator can crash another collaborator's editor surface, and
because the same design allows identity spoofing in collaborator UI.

## Scope And Assumptions

This analysis assumes the RTC sync endpoint and awareness protocol have not been
released to a broad population. That matters for the fix:

-   We do not need to preserve the current weak awareness wire format for
    compatibility.
-   We can make breaking protocol changes before release.
-   We should prefer a narrow server-enforced schema over permissive parsing.
-   We do not need a migration for arbitrary existing production awareness
    state. At most, development or test environments may contain stale malformed
    entries, and those can be skipped and cleaned up opportunistically.

Client-side hardening is still required, but as defense-in-depth. Clients should
not crash on corrupted storage, plugin interference, direct REST calls, future
server bugs, or a partially rolled-out development build.

## Impact

An attacker needs permission to sync the same room as the victim. In the normal
post editor case, that means the attacker must be an authenticated user who can
edit the same post.

Current client-ID ownership checks prevent a user from taking over a client ID
that is already associated with another WordPress user. They do not make the
awareness state safe. A user can still publish malformed state under their own
client ID, and the endpoint also accepts a fresh client ID for that user. Peers
then receive and render that state.

The user-visible impact is:

-   Missing required fields can crash presence UI and trip the editor error
    boundary.
-   Unknown top-level fields can trigger the awareness equality checker to throw
    when state changes are compared.
-   Arbitrary `collaboratorInfo` values can spoof the name/avatar shown in
    collaborator UI.

## Vulnerable Data Flow

The vulnerable path crosses four layers:

1. **REST input.** A client posts `rooms[].awareness` to
   `/wp-sync/v1/updates`. The route schema currently accepts any object or
   `null`.
2. **Server fan-out.**
   `WP_HTTP_Polling_Sync_Server::process_awareness_update()` stores the object
   under the submitted client ID and returns the stored `client_id => state` map
   to room peers.
3. **Polling client ingestion.** `processAwarenessUpdate()` in
   [`polling-manager.ts`](https://github.com/danluu/gutenberg/blob/try/awareness-exception/packages/sync/src/providers/http-polling/polling-manager.ts)
   writes each returned value into `awareness.getStates()` without runtime
   validation.
4. **Typed publication and rendering.**
   [`AwarenessState.updateSubscribers()`](https://github.com/danluu/gutenberg/blob/try/awareness-exception/packages/core-data/src/awareness/awareness-state.ts)
   publishes the raw entry as typed state, and
   [`CollaboratorsPresence`](https://github.com/danluu/gutenberg/blob/try/awareness-exception/packages/editor/src/components/collaborators-presence/index.tsx)
   plus
   [`CollaboratorsList`](https://github.com/danluu/gutenberg/blob/try/awareness-exception/packages/editor/src/components/collaborators-presence/list.tsx)
   dereference `collaboratorInfo` fields.

The repros are committed as regression tests on
[`danluu/try/awareness-exception`](https://github.com/danluu/gutenberg/tree/try/awareness-exception).
They were introduced as failing tests against the vulnerable implementation and
now describe the behavior the proposed fix preserves. They cover these
boundaries:

-   Server rejection:
    [`test_sync_rejects_malformed_awareness_without_collaborator_info()`](https://github.com/danluu/gutenberg/blob/try/awareness-exception/phpunit/tests/collaboration/wpHttpPollingSyncServer.php#L1032)
-   Sync-safe local payload:
    [`uses sync-safe local awareness when the awareness implementation provides it`](https://github.com/danluu/gutenberg/blob/try/awareness-exception/packages/sync/src/providers/http-polling/test/polling-manager.test.ts#L565)
-   Polling ingestion drop:
    [`regression: drops malformed remote awareness from the server`](https://github.com/danluu/gutenberg/blob/try/awareness-exception/packages/sync/src/providers/http-polling/test/polling-manager.test.ts#L607)
-   Awareness publication guard:
    [`regression: should not publish non-empty malformed remote state to subscribers`](https://github.com/danluu/gutenberg/blob/try/awareness-exception/packages/core-data/src/awareness/test/awareness-state.ts#L159)
-   Awareness equality guard:
    [`regression: should not throw when a remote state update has an unknown top-level field`](https://github.com/danluu/gutenberg/blob/try/awareness-exception/packages/core-data/src/awareness/test/awareness-state.ts#L188)
-   Presence UI crash guard:
    [`regression: malformed remote awareness does not trip the editor error boundary`](https://github.com/danluu/gutenberg/blob/try/awareness-exception/packages/editor/src/components/collaborators-presence/test/index.tsx#L82)
-   Browser-level crash guard:
    [`malformed awareness from one collaborator does not crash another editor`](https://github.com/danluu/gutenberg/blob/try/awareness-exception/test/e2e/specs/editor/collaboration/collaboration-awareness-exception.spec.ts#L7)

## Root Cause

The root cause is that awareness crosses a trust boundary without a parser.

The transport type is effectively untrusted JSON:

```ts
Record< string, object | null >;
```

The consumer type is much stronger:

```ts
PostEditorAwarenessState;
```

`PostEditorAwarenessState` requires `collaboratorInfo`, and the UI is written as
if that requirement were enforced at runtime. It is not. TypeScript only proves
what the local code claims after the remote object has already been trusted.

There is also a second crash mechanism in the same trust boundary. The awareness
base class has field-specific equality checks and throws on unknown fields:

```text
No equality check implemented for awareness state field "unexpected".
```

That throw is reasonable for local developer mistakes, but remote clients can
currently introduce unknown fields. Remote input should be rejected or normalized
before it reaches equality comparison.

## How The Bug Was Introduced

No single commit introduced the full bug by itself. The bug came from connecting
several locally reasonable pieces without defining the awareness wire contract.

`fcbeef1c21a` (`Real-time Collaboration: Add Yjs awareness foundation (#74565)`)
introduced the typed awareness abstraction and equality checks. That code assumes
subclasses own the state shape.

`48ce44dac79` (`Real-time collaboration: Add default HTTP polling sync provider
(#74564)`) made server-returned awareness authoritative for remote clients. Its
polling code writes returned awareness directly into the Yjs awareness map.

`69699955ed0` (`Real-time collaboration: Move PHP code to compat / backports
directory (#75366)`) moved the PHP sync server into the WordPress 7.0 compat
path. The server stores `awareness` as client-provided room state and returns it
to peers. Later permission and client-ID ownership hardening, including
`7f8ada36a3e` (`RTC: Verify client ID to avoid awareness mutation (#76056)`) and
`1be2ef27e68` (`Backport: Improve validation and permission checks for
WP_HTTP_Polling_Sync_Server (#76987)`), improved who may use the endpoint and
which client IDs they may update. They did not validate or canonicalize the
awareness state itself.

`8e5a0039ff6` (`Real-time Collaboration: Add collaborators presence UI
(#75065)`) and later presence UI changes render `collaboratorInfo` as required
data. That is correct only if the server or client has already converted remote
JSON into a valid `PostEditorAwarenessState`.

The missing design step was a runtime boundary between "untrusted awareness
payload" and "typed collaborator state".

## Fix Strategy

Because the feature is unreleased, the branch fixes the protocol rather than
preserving the current permissive behavior. The proposed fix in this branch does
three things:

-   Client requests contain only the awareness fields the client is allowed to
    control.
-   Server responses contain canonical collaborator identity fields derived from
    WordPress authentication, not from client-provided identity JSON.
-   Both server and client reject malformed awareness before it reaches
    rendering or equality checks.

## Proposed Fix

### 1. Split the wire schema

Client-to-server awareness is now treated as `null` for disconnect or a narrow
activity object. The post editor awareness implementation keeps
`collaboratorInfo` locally for the current user's UI, but
[`BaseAwarenessState.getLocalStateForSync()`](https://github.com/danluu/gutenberg/blob/try/awareness-exception/packages/core-data/src/awareness/base-awareness.ts#L35)
removes it before the polling provider builds the sync request.

The proposed request contract is:

```ts
type ClientPostEditorAwareness = null | {
	editorState?: EditorState;
};
```

The server-to-client response contract includes canonical identity:

```ts
type ServerPostEditorAwareness = {
	collaboratorInfo: {
		id: number;
		name: string;
		slug: string;
		avatar_urls: Record< string, string >;
		browserType?: string;
		enteredAt: number;
	};
	editorState?: EditorState;
};
```

The server currently derives `browserType` from the request user agent and
preserves `enteredAt` for an existing client ID. Neither field is treated as
user identity.

### 2. Make the PHP endpoint authoritative

The PHP endpoint is the fan-out point, so the branch makes it enforce the
contract first:

-   [`ALLOWED_AWARENESS_FIELDS`](https://github.com/danluu/gutenberg/blob/try/awareness-exception/lib/compat/wordpress-7.0/class-wp-http-polling-sync-server.php#L104)
    limits client-controlled awareness to `collaboratorInfo` and `editorState`
    during the transition. `collaboratorInfo` may still be submitted directly to
    the REST endpoint, but the server ignores its identity fields.
-   [`validate_awareness_update()`](https://github.com/danluu/gutenberg/blob/try/awareness-exception/lib/compat/wordpress-7.0/class-wp-http-polling-sync-server.php#L458)
    rejects unknown top-level fields, lists, and malformed non-null awareness
    with `rest_invalid_param`.
-   [`normalize_awareness_update()`](https://github.com/danluu/gutenberg/blob/try/awareness-exception/lib/compat/wordpress-7.0/class-wp-http-polling-sync-server.php#L602)
    returns `collaboratorInfo.id`, `name`, `slug`, and `avatar_urls` from the
    authenticated WordPress user.
-   [`normalize_stored_awareness_entry()`](https://github.com/danluu/gutenberg/blob/try/awareness-exception/lib/compat/wordpress-7.0/class-wp-http-polling-sync-server.php#L627)
    drops malformed stored entries during room awareness cleanup.
-   Keep the existing room permission and client-ID ownership checks.

Because this is unreleased, rejecting bad requests is preferable to accepting
and silently stripping arbitrary fields. Silent stripping makes protocol
mistakes harder to detect before release.

One test-environment caveat: current `wp-env` may load the already-copied
WordPress core class at
`wp-includes/collaboration/class-wp-http-polling-sync-server.php` before the
Gutenberg compat class. That core copy needs the same server patch. This is a
source synchronization issue for the unreleased feature, not a compatibility
requirement for deployed RTC servers.

### 3. Parse awareness at sync and core-data boundaries

The sync package stays generic. It does not import post-editor types. Instead,
[`polling-manager.ts`](https://github.com/danluu/gutenberg/blob/try/awareness-exception/packages/sync/src/providers/http-polling/polling-manager.ts#L241)
detects awareness implementations that provide runtime parsing hooks:

-   `getLocalStateForSync()` for outbound state, so clients do not send trusted
    identity data when an awareness implementation can serialize a safer
    payload.
-   `getValidatedRemoteState()` for inbound state, so malformed room-specific
    awareness is not written into `awareness.getStates()`.

Core-data now owns the typed parser. The base class exposes a public transport
wrapper and a protected subclass hook:

```ts
public getValidatedRemoteState( rawState: unknown ): State | null;
protected normalizeRemoteState( rawState: unknown ): State | null;
```

The implementation is in
[`AwarenessState`](https://github.com/danluu/gutenberg/blob/try/awareness-exception/packages/core-data/src/awareness/awareness-state.ts#L210).
It rejects unknown top-level fields before equality comparison and removes
non-empty malformed entries before updating `seenStates`, `previousSnapshot`, or
subscribers.

Post-editor awareness then adds the room-specific checks:

-   [`BaseAwarenessState`](https://github.com/danluu/gutenberg/blob/try/awareness-exception/packages/core-data/src/awareness/base-awareness.ts#L35)
    requires a valid `collaboratorInfo`.
-   [`PostEditorAwareness`](https://github.com/danluu/gutenberg/blob/try/awareness-exception/packages/core-data/src/awareness/post-editor-awareness.ts#L59)
    requires `editorState`, when present, to be object-shaped.
-   [`isCollaboratorInfo()`](https://github.com/danluu/gutenberg/blob/try/awareness-exception/packages/core-data/src/awareness/utils.ts#L81)
    checks the runtime shape used by editor presence consumers.

### 4. Keep UI defensive

The UI should not be the main security boundary, but it should still avoid
turning malformed state into a full editor crash.

Presence UI now filters out collaborators without renderable collaborator info
through
[`hasRenderableCollaboratorInfo()`](https://github.com/danluu/gutenberg/blob/try/awareness-exception/packages/editor/src/components/collaborators-presence/utils.ts#L22).
[`CollaboratorsPresence`](https://github.com/danluu/gutenberg/blob/try/awareness-exception/packages/editor/src/components/collaborators-presence/index.tsx#L46)
and
[`CollaboratorsList`](https://github.com/danluu/gutenberg/blob/try/awareness-exception/packages/editor/src/components/collaborators-presence/list.tsx#L39)
use that guard before rendering avatars, names, and scroll targets. Invalid
collaborators are absent from the UI rather than partially rendered.

The error boundary should remain last-resort containment, not the expected
handling path.

## Verification

The branch contains executable regression tests for the fixed behavior:

-   PHP: malformed awareness is rejected with a 400, or existing malformed
    stored entries are omitted during cleanup.
-   Polling manager: malformed remote awareness is not stored in
    `awareness.getStates()` and does not emit an added collaborator.
-   Core-data awareness: unknown remote fields do not throw and are not
    published to subscribers.
-   Presence UI: malformed awareness does not trip an error boundary.
-   Browser: the attacker can attempt the malformed update, but the victim editor
    remains usable and no fake/malformed collaborator appears.

Focused JS repro tests pass with this implementation:

```bash
npm run test:unit packages/core-data/src/awareness/test/awareness-state.ts -- --runInBand
npm run test:unit packages/sync/src/providers/http-polling/test/polling-manager.test.ts -- --runInBand
npm run test:unit packages/editor/src/components/collaborators-presence/test/index.tsx -- --runInBand
```

The PHP repro is the right server-side assertion, but in a `wp-env` checkout that
already contains the core RTC server class, the test exercises the core copy
instead of the Gutenberg compat class. Apply the same server patch to that core
copy, or run against a core checkout that has received it, before using the PHP
test as end-to-end server verification.

The key release criterion is that arbitrary client-provided awareness JSON never
crosses into typed collaborator state.
