# Issue 77678: Collaborator presence UI guards

Code branch: `codex/77678-presence-ui-guards`

Code branch head: `03412d8ccb6`

Related links:

-   [Issue 77678](https://github.com/WordPress/gutenberg/issues/77678)
-   [Alec's suggested split for independent fixes](https://github.com/WordPress/gutenberg/issues/77678#issuecomment-4435570069)
-   [Alec's maintainer explanation guidance](https://github.com/WordPress/gutenberg/issues/77716#issuecomment-4464309206)

## Scope

This branch implements the independent UI display-guard fix. Collaborator
presence rendering and notifications filter active collaborator state before
reading `collaboratorInfo` or enhanced state fields.

This branch does not provide canonical server identity, PHP REST validation, or
client-boundary validation.

## Reproduction / test substitute

A normal click-through browser reproduction is not reliable because the bad
state requires forged or malformed awareness data reaching the active
collaborator store. The component and hook unit tests are the deterministic
substitute.

Manual/debug reproduction:

1. Populate active collaborators with one valid current user, one valid other
   collaborator, and one malformed other collaborator missing
   `collaboratorInfo`.
2. Render `CollaboratorsPresence`.
3. On trunk, rendering can throw when the malformed collaborator is treated as
   renderable and the component reads `collaboratorInfo.avatar_urls`.
4. On this branch, malformed collaborators are filtered out. Valid collaborators
   still render, notifications still fire for valid collaborators, and malformed
   states are skipped.

## Tests

Added/updated unit coverage:

-   `packages/editor/src/components/collaborators-presence/test/index.tsx`
    -   renders valid collaborators while filtering malformed active collaborator
        state
-   `packages/editor/src/components/collaborators-presence/test/utils.ts`
    -   validates required enhanced fields: `clientId`, `isConnected`, and `isMe`
    -   rejects non-finite or non-integer IDs and non-finite `enteredAt`
-   `packages/editor/src/components/collaborators-presence/test/use-collaborator-notifications.ts`
    -   existing malformed join/leave/save notification guards continue to pass

## Verification

Ran:

```bash
npm run test:unit packages/editor/src/components/collaborators-presence/test/utils.ts packages/editor/src/components/collaborators-presence/test/use-collaborator-notifications.ts packages/editor/src/components/collaborators-presence/test/index.tsx -- --runInBand
npx prettier --check packages/editor/src/components/collaborators-presence/utils.ts packages/editor/src/components/collaborators-presence/test/utils.ts packages/editor/src/components/collaborators-presence/test/index.tsx
git diff --check
```

The focused test run passed: 19 tests.

Focused `npm run lint:js` for these editor files was blocked by a local
ESLint/plugin mismatch:

```text
Could not find "no-non-module-stylesheet-imports" in plugin "@wordpress".
```

## Video

No video is attached for this branch. The meaningful repro is malformed store
state injected before the component renders, so the component regression test is
the clearest maintainer-facing demonstration.
