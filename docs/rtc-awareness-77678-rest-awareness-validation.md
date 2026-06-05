# Issue 77678: REST awareness payload validation

Code branch: `codex/77678-rest-awareness-validation`

Code branch head: `2c54b945821`

Related links:

-   [Issue 77678](https://github.com/WordPress/gutenberg/issues/77678)
-   [Alec's suggested split for independent fixes](https://github.com/WordPress/gutenberg/issues/77678#issuecomment-4435570069)
-   [Alec's maintainer explanation guidance](https://github.com/WordPress/gutenberg/issues/77716#issuecomment-4464309206)

## Scope

This branch implements the independent PHP REST-side validation fix for incoming
awareness data. It rejects malformed non-empty awareness payloads, accepts empty
startup awareness, and treats identity-less awareness as a no-op instead of
publishing it.

This branch does not provide canonical collaborator identity, client-boundary
validation, or UI display guards.

## Reproduction / test substitute

A normal browser reproduction is not reliable because the malformed payload is
best produced by a crafted authenticated REST request. The PHPUnit tests are the
deterministic substitute.

Manual/debug reproduction:

1. Authenticate as a user who can edit a post.
2. Send `POST /wp-sync/v1/updates` with malformed awareness, for example an
   unexpected top-level field, list-shaped `avatar_urls`, invalid
   `collaboratorInfo`, or malformed `editorState`.
3. On trunk, malformed awareness can be stored and fanned out.
4. On this branch, malformed non-empty awareness is rejected by the REST
   endpoint. Empty `{}` and editor-state-only startup awareness are accepted but
   not stored or returned as collaborator presence.

The validation deliberately allows numeric avatar-size keys such as `24`, `48`,
and `96`; PHP parses those JSON object keys as integer array keys, so rejecting
all integer-keyed maps would reject valid WordPress avatar data.

## Tests

Added/updated PHPUnit coverage in
`phpunit/tests/collaboration/wpHttpPollingSyncServer.php`:

-   malformed awareness payloads are rejected
-   empty awareness is accepted and ignored
-   identity-less awareness is accepted and ignored
-   numeric avatar-size keys are accepted
-   list-shaped `avatar_urls` is rejected
-   malformed stored awareness is omitted from responses

## Verification

Ran:

```bash
php -l lib/compat/wordpress-7.1/class-wp-http-polling-sync-server.php
php -l phpunit/tests/collaboration/wpHttpPollingSyncServer.php
/Users/danluu/dev/fuzz/gutenberg/vendor/bin/phpcs lib/compat/wordpress-7.1/class-wp-http-polling-sync-server.php phpunit/tests/collaboration/wpHttpPollingSyncServer.php
git diff --check
```

PHPUnit was not run locally because `wp-env` was uninitialized in this worktree
and `npm run wp-env start` stalled while cloning WordPress.

## Video

No video is attached for this branch. The meaningful repro is a crafted REST
payload and response assertion, not a visible UI workflow.
