# PR 77924 Test Results And Split Plan

Date: 2026-05-13

This note summarizes a local comparison of WordPress/gutenberg PR 77924 against
current trunk, plus a proposed way to split the PR for review.

## Commits Tested

- Current trunk: `e1d8635c960`
  - `scripts: Fix path for license type detection in license.js (#78245)`
- PR head: `1bda16e1a19`
  - `RTC: Migrate websocket regression fixes to trunk`
- Local merge into current trunk: `abf1e3e5b82`
  - Merge of `origin/pr/77924` into `origin/trunk`

The local merge was conflict-free.

## Commands Run

Targeted unit tests:

```sh
npm run test:unit -- \
  packages/core-data/src/utils/test/crdt-blocks.ts \
  packages/core-data/src/test/actions.js \
  packages/core-data/src/test/resolvers.js \
  packages/sync/src/test/manager.ts
```

Full WebSocket e2e suite:

```sh
npm run test:e2e:rtc-websocket
```

Focused repeat:

```sh
npm run test:e2e:rtc-websocket -- \
  --grep "two users concurrently move list items" \
  --repeat-each=3
```

The valid e2e runs used built plugin assets and a pre-started `wp-env` test
site. Earlier harness attempts that failed before Playwright reached the RTC
tests were discarded.

## Results

### Current trunk: `e1d8635c960`

- Build: passed
- Targeted unit tests: `162/162` passed
- `npm run test:e2e:rtc-websocket`: `39 passed, 2 failed`

Failures:

- `test/e2e/specs/editor/collaboration/collaboration-stress.spec.ts:362`
  - `three users concurrently edit a large post with diverse blocks`
- `test/e2e/specs/editor/collaboration/collaboration-stress.spec.ts:570`
  - `two users concurrently move list items`

The persistence tests passed on trunk in this run.

### PR head: `1bda16e1a19`

- Targeted unit tests: `171/171` passed
- `npm run test:e2e:rtc-websocket`: `42/42` passed

### Local merge into current trunk: `abf1e3e5b82`

- Build: passed
- Targeted unit tests: `171/171` passed
- `npm run test:e2e:rtc-websocket`: `43/43` passed
- Focused repeat for list-item movement: `3/3` passed

This is the most relevant result for merge readiness because it tests PR 77924
applied to the current `origin/trunk`.

## Practical Delta

The current red/green signal is:

- Trunk fails both RTC stress tests.
- PR 77924, merged into current trunk, passes both RTC stress tests.
- Persistence is not a current trunk failure in the clean built run.
- The two new WebSocket-only tests pass on the merged branch.

Important caveat: these results only matter for branches based on the current
WebSocket test setup. A split PR is wrong if it makes its tests pass by carrying
forward the old custom WebSocket setup. Treat the WebSocket harness as shared
infrastructure, not incidental support code for a CRDT fix.

## Recommended Split

Split by failure mode, not by package.

### 0. WebSocket Harness Baseline

Goal: make sure every later slice uses the current trunk WebSocket setup.

Status: prerequisite. If the separate WebSocket setup fix changes
`test/e2e/playwright.rtc-websocket.config.ts`,
`test/e2e/config/rtc-websocket-setup.ts`,
`packages/e2e-tests/plugins/rtc-websocket-provider/`, or
`bin/rtc-test-ws-sync-server.mjs`, rebase every split branch onto that fix
before selecting code from PR 77924.

Likely scope:

- Current trunk WebSocket setup only.
- No CRDT merge, sync-manager, persistence, or regression-test logic.
- No feature behavior beyond making the RTC WebSocket harness current and
  repeatable.

Acceptance checks:

- Functional split PRs should normally have no diff in WebSocket harness files.
- If harness changes are required, land them in this prerequisite PR first.
- Run at least one WebSocket smoke test on current trunk and on the split branch
  before claiming a feature red/green delta.
- Do not cherry-pick old `websocket-only` setup, old provider readiness code, or
  old custom server behavior unless that exact change is the harness PR.

### 1. Existing Stress Failures

Goal: fix the two failures that reproduce on current trunk:

- `three users concurrently edit a large post with diverse blocks`
- `two users concurrently move list items`

Likely scope:

- Minimal `baseRecord` plumbing needed for block CRDT rebasing.
- Block/list move merge logic in `packages/core-data/src/utils/crdt-blocks.ts`.
- Any sync-manager reconciliation code that is required to make the three-user
  stress test pass.

Tests to include:

- The list/block unit tests in `packages/core-data/src/utils/test/crdt-blocks.ts`.
- The existing `collaboration-stress.spec.ts` red/green e2e coverage.

This should be the first PR because it has the clearest existing failure on
trunk and the clearest passing result after applying the fix.

### 2. Nested Table Merge Follow-Up

Goal: isolate table/query-attribute merge behavior.

Likely scope:

- Base-aware nested array/object merge code.
- Duplicate table row preservation logic.

Tests to include:

- The duplicate table row unit tests.
- `test/e2e/specs/editor/collaboration/websocket-only/collaboration-table-followups.spec.ts`

This should not be bundled with the list-move fix unless the two are truly
inseparable.

### 3. WebSocket Provider And Title Reload Behavior

Goal: isolate WebSocket initial sync/readiness behavior and the same-user title
reload regression.

Likely scope:

- WebSocket test provider readiness changes.
- Any explicit provider-to-sync-manager metadata contract.
- `test/e2e/specs/editor/collaboration/websocket-only/collaboration-same-user-title-reload-loss.spec.ts`

This has a different risk profile from CRDT block merging and should be reviewed
separately.

### 4. Persistence Save Narrowing

Goal: decide whether the meta-only CRDT persistence save is independently
desirable.

Likely scope:

- `persistCRDTDoc` saving only the entity key plus `meta`.
- `__unstableSkipSyncUpdate` documentation or tests, if reviewers want that
  internal option documented.

Because the persistence e2e tests passed on current trunk, this should not be
presented as required for the current WebSocket e2e failures.

## Per-Split Guardrails

Before opening each follow-up PR:

- Start from current `origin/trunk` after the WebSocket setup fix lands.
- Cherry-pick only files required for that failure mode; do not copy old
  WebSocket setup files wholesale.
- Run `git diff origin/trunk -- test/e2e/playwright.rtc-websocket.config.ts test/e2e/config/rtc-websocket-setup.ts packages/e2e-tests/plugins/rtc-websocket-provider bin/rtc-test-ws-sync-server.mjs`.
  For non-harness PRs, the expected result is empty.
- Include the exact trunk command that fails and branch command that passes.
- If a split needs new WebSocket-only tests, those tests must rely on current
  harness APIs only.

## Review Risks To Call Out

- The current PR mixes sync scheduling, block merge semantics, table merge
  semantics, persistence save behavior, WebSocket provider readiness, and new
  e2e coverage.
- `packages/sync/src/manager.ts` and `packages/core-data/src/utils/crdt-blocks.ts`
  are both large behavioral changes and should not be reviewed as one unit.
- The sync-manager stale-key logic needs tests that match the real core-data path
  where `baseRecord` is present.
- Any test change that weakens readiness or identity assertions should be
  justified in the same PR that changes the underlying identity contract.

## Suggested Reply

I can split this. Based on a clean rebuilt run, current trunk fails the two RTC
stress tests while the PR merged into current trunk passes the full
`npm run test:e2e:rtc-websocket` suite. Before opening functional splits, I will
rebase onto the current WebSocket setup fix. If any harness delta is still
needed, I will land it as its own prerequisite PR. The later feature PRs should
not carry WebSocket setup changes except for the WebSocket-specific slice, and
each one will include a harness diff check in the PR description.
