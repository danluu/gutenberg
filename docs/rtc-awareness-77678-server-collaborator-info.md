# Issue 77678: Server-provided collaborator info

Code branch:
[`codex/77678-server-collaborator-info`](https://github.com/danluu/gutenberg/tree/codex/77678-server-collaborator-info)

Code branch head: `ccc10b714d8`

Related links:

-   [Issue 77678](https://github.com/WordPress/gutenberg/issues/77678)
-   [Alec's suggested split for independent fixes](https://github.com/WordPress/gutenberg/issues/77678#issuecomment-4435570069)
-   [Alec's maintainer explanation guidance](https://github.com/WordPress/gutenberg/issues/77716#issuecomment-4464309206)

## Scope

This branch implements the independent fix for server-provided `collaboratorInfo`.
It makes the PHP sync endpoint overwrite collaborator identity data with canonical
WordPress user data from the authenticated request before awareness is stored or
returned.

This branch does not implement the separate REST payload validation,
client-boundary validation, or UI display-guard fixes.

## Reproduction / test substitute

A normal click-through browser reproduction is not a good fit because the bug
requires sending crafted awareness JSON as an authenticated editor. The PHPUnit
tests are the deterministic substitute.

Manual/debug reproduction:

1. Authenticate as a user who can edit a post.
2. Send `POST /wp-sync/v1/updates` with a room for that post and an awareness
   payload that spoofs `collaboratorInfo.id`, `name`, `slug`, `avatar_urls`,
   `browserType`, and `enteredAt`.
3. On trunk, the server can store and return the client-supplied collaborator
   identity.
4. On this branch, the server returns collaborator identity derived from the
   authenticated WordPress user and current user agent. Room-specific
   `editorState` is preserved.

The branch also preserves `enteredAt` for an active same-client session and
resets it when the prior stored entry is expired, so stale stored data cannot
pin an old timestamp forever.

## Tests

Added/updated PHPUnit coverage in
`phpunit/tests/collaboration/wpHttpPollingSyncServer.php`:

-   spoofed collaborator identity is overwritten with canonical user data
-   multiple clients get canonical collaborator info
-   active same-client `enteredAt` is preserved
-   expired same-client `enteredAt` is reset
-   malformed stored awareness wrappers are skipped

## Verification

Ran:

```bash
php -l lib/compat/wordpress-7.1/class-wp-http-polling-sync-server.php
php -l lib/compat/wordpress-7.1/collaboration.php
php -l phpunit/tests/collaboration/wpHttpPollingSyncServer.php
/Users/danluu/dev/fuzz/gutenberg/vendor/bin/phpcs lib/compat/wordpress-7.1/class-wp-http-polling-sync-server.php lib/compat/wordpress-7.1/collaboration.php phpunit/tests/collaboration/wpHttpPollingSyncServer.php
git diff --check
```

PHPUnit was not run locally because `wp-env` was uninitialized in this worktree
and `npm run wp-env start` stalled while cloning WordPress.

## Video

No video is attached for this branch. The meaningful repro is a crafted REST
payload, not a visible UI workflow. The PHPUnit assertions above are the
maintainer-facing repro and fix demonstration.
