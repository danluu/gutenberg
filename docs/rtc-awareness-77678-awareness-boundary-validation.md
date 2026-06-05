# Issue 77678: Client awareness boundary validation

Code branch:
[`codex/77678-awareness-boundary-validation`](https://github.com/danluu/gutenberg/tree/codex/77678-awareness-boundary-validation)

Code branch head: `70b7a452dca`

Related links:

-   [Issue 77678](https://github.com/WordPress/gutenberg/issues/77678)
-   [Alec's suggested split for independent fixes](https://github.com/WordPress/gutenberg/issues/77678#issuecomment-4435570069)
-   [Alec's maintainer explanation guidance](https://github.com/WordPress/gutenberg/issues/77716#issuecomment-4464309206)

## Scope

This branch implements the independent client-boundary validation fix. Sync
providers validate remote awareness with the room's awareness schema before
inserting it into the local Yjs awareness map or using it for collaborator
cadence and connection-limit decisions.

This branch does not provide canonical server identity, PHP REST validation, or
UI display guards.

## Reproduction / test substitute

A normal click-through browser reproduction is not reliable because this path is
triggered by a malformed server awareness response. The unit tests directly mock
that response and are the deterministic substitute.

Manual/debug reproduction:

1. Run a client with an awareness implementation that exposes
   `getValidatedRemoteState`.
2. Return a polling response with a remote awareness entry that is non-empty but
   missing required room fields, such as `collaboratorInfo`.
3. On trunk, the polling manager can insert that malformed state or count it as
   a collaborator for connection-limit and queue-resume decisions.
4. On this branch, invalid remote entries are dropped or removed before they
   reach subscribers and before they affect collaborator policy decisions.

The branch also avoids deleting the local client's own awareness state when it
is temporarily incomplete during startup.

## Tests

Added/updated unit coverage:

-   `packages/core-data/src/awareness/test/awareness-state.ts`
    -   rejects inherited/prototype equality-field names such as `toString`
    -   does not delete the local client state when it is not yet valid
-   `packages/core-data/src/awareness/test/post-editor-awareness.ts`
    -   accepts valid post-editor selection state
    -   rejects malformed selection envelopes
-   `packages/sync/src/providers/http-polling/test/polling-manager.test.ts`
    -   drops malformed remote awareness when a validator is present
    -   removes a previously tracked remote client when the server replaces it with
        malformed awareness
    -   ignores invalid remote awareness for connection-limit checks
    -   does not resume secondary room queues for invalid remote awareness

## Verification

Ran:

```bash
npm run lint:js -- packages/core-data/src/awareness/awareness-state.ts packages/core-data/src/awareness/post-editor-awareness.ts packages/core-data/src/awareness/test/awareness-state.ts packages/core-data/src/awareness/test/post-editor-awareness.ts packages/sync/src/providers/http-polling/polling-manager.ts packages/sync/src/providers/http-polling/test/polling-manager.test.ts
npm run test:unit packages/core-data/src/awareness/test/awareness-state.ts packages/core-data/src/awareness/test/post-editor-awareness.ts packages/sync/src/providers/http-polling/test/polling-manager.test.ts -- --runInBand
git diff --check
```

The focused test run passed: 106 tests.

## Video

No video is attached for this branch. The meaningful repro is a malformed sync
response at the transport boundary, so the mocked polling-manager and awareness
unit tests provide a clearer maintainer repro than a browser recording.
