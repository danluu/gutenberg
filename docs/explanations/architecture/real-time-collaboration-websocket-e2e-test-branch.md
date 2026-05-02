# RTC WebSocket E2E Test Branch

This document explains the changes in the branch
`codex/rtc-websocket-e2e-local-20260502`, whose current pushed head on the
`danluu` remote is `9c1211ed2b0`.

## Purpose

The branch adds local-only WebSocket transport variants of the existing editor
real-time collaboration e2e tests. The intent is to run the same collaboration
test behavior against a test WebSocket provider without adding those tests to
normal CI, because the WebSocket transport is not expected to work in CI.

## Test Layout

The branch adds `test/e2e/specs/editor/collaboration/websocket/` and creates one
`collaboration-*.spec.ts` wrapper for each collaboration spec that exists on
`origin/trunk`. Each wrapper imports the matching spec from the parent
collaboration directory, so the WebSocket suite exercises the same test bodies
as the original HTTP-polling RTC suite.

The websocket directory also has a short README with the local run command and
configuration notes.

## Local Runner

The branch adds `test/e2e/playwright.rtc-websocket.config.ts`, plus npm scripts
in the root `package.json` and `test/e2e/package.json`:

```sh
npm run test:e2e:rtc-websocket
npm run test:e2e:rtc-websocket:debug
```

The dedicated Playwright config:

- sets `GUTENBERG_RTC_TEST_WS_PROVIDER=1`;
- defaults the relay URL to `ws://127.0.0.1:18991`;
- starts `bin/rtc-test-ws-sync-server.mjs` as a Playwright web server;
- matches only `test/e2e/specs/editor/collaboration/websocket/collaboration-*.spec.ts`;
- throws immediately when `CI` is set, unless explicitly overridden with
  `GUTENBERG_RTC_TEST_WS_ALLOW_CI=1`.

The normal e2e config is also updated to ignore the websocket directory, so the
new suite is opt-in locally instead of being picked up by `npm run test:e2e`.

## Test WebSocket Transport

The branch adds a minimal local relay at `bin/rtc-test-ws-sync-server.mjs`. It
keeps per-room update history and awareness state, exposes `/health` for
Playwright startup checks, and exposes `/reset` so global setup can clear state
between runs.

The branch also adds a test-only plugin:

- `packages/e2e-tests/plugins/rtc-websocket-provider.php`
- `packages/e2e-tests/plugins/rtc-websocket-provider/index.js`

When the dedicated websocket config is active, global setup activates this
plugin. The plugin registers a `sync.providers` filter that replaces the default
provider list with the test WebSocket provider. Outside websocket mode, global
setup deactivates the plugin.

## Collaboration Helper Changes

`test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts` gains
small websocket-mode branches for waits that normally depend on HTTP polling.
In websocket mode, mutual discovery and sync waits use the test provider's
debug state on `window.__gutenbergTestWebSocketSync` instead of waiting for
`wp-sync` HTTP responses.

Secondary user contexts are isolated in websocket mode by starting them with an
empty storage state. That keeps the joined user login flow independent from the
admin session.

## CI Behavior

The branch has two protections against accidental CI execution:

1. The default e2e Playwright config ignores
   `test/e2e/specs/editor/collaboration/websocket/**`.
2. The dedicated websocket config throws when `CI` is set.

This means the tests are available through an explicit local command but are not
part of normal Gutenberg CI.

## Scope Boundaries

The branch does not change production RTC sync behavior. It adds a test-only
WebSocket provider plugin and a local relay for exercising existing e2e tests
under a different transport.

The cleaned pushed branch intentionally excludes triage repros, fuzz generated
tests, bug explanation documents, and other local analysis artifacts. It only
contains files needed for a Gutenberg-style PR that adds the local websocket e2e
suite.

## Validation Performed

The cleaned branch was validated with:

```sh
git diff --check
node --check bin/rtc-test-ws-sync-server.mjs
npm run test:e2e:rtc-websocket -- --list
CI=1 npm run test:e2e:rtc-websocket -- --list
```

The local list command found 39 tests in 17 websocket wrapper files. The `CI=1`
command failed immediately with the intended local-only guard.
