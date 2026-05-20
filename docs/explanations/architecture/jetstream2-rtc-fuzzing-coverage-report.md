# Jetstream2 RTC Fuzzing Coverage Report

This report summarizes what the Jetstream2 RTC fuzzing project is exercising,
what new coverage was added by the May 20 coverage-gap closure loop, and what
still should not be treated as covered or merge-ready.

This document is written for maintainers reviewing the RTC PR set. It is not a
claim that the exact proposed merge branch is ready. Coverage evidence and merge
readiness are different:

- **Existing coverage evidence** means a fuzzer, model test, PHP test, or gate
  exercises the same class of behavior.
- **New closure coverage** means the May 20 closure loop added a concrete test,
  harness, or executable queue in an isolated Jetstream2 worktree.
- **Validated closure coverage** means that worker also ran the relevant focused
  tests, lint, or syntax checks successfully.
- **Merge readiness** still requires exact branch/SHA validation with commands,
  results, and artifacts.

The live state in this report was last sampled from Jetstream2 around
`2026-05-20T17:55Z`. The closure work is mutable; before filing PRs, re-check the
exact worker branch, SHA, test command, result, and artifact path.

## Current Bottom Line

Jetstream2 has strong class-level evidence for Gutenberg post-editor RTC
behavior: Chromium browser fuzzing, HTTP polling, the test WebSocket provider,
save/reload/autosave/revision paths, selected real-user editing, parser/block
profiles, lower-level CRDT/rich-text/table tests, PHP sync/storage tests, replay
artifacts, and triage/analysis infrastructure.

The May 20 closure loop materially improved the missing-test backlog. All six
coverage-gap families now have concrete worker output or an executable queue:

- `polling-state-machine`: validated unit/lint coverage.
- `save-payload-correctness`: validated unit/lint coverage plus a small repair
  path.
- `parser-semantic-equivalence`: validated unit/lint coverage plus parser/list
  handling changes.
- `list-nested-structure`: model/unit coverage passed and a focused browser spec
  was authored; browser validation is still pending.
- `transport-compaction`: PHP tests were authored and syntax/diff checks passed;
  focused PHPUnit is still pending.
- `wider-product-coverage`: an executable smoke queue/config and targeted checks
  were authored; most meaningful product gates are still pending or require
  external environments.

Do not describe the wider product queue, production WebSocket/proxy path,
non-Chromium/mobile coverage, multisite/object-cache coverage, or the new
list/nested browser spec as fully proven until their gates run and pass.

## Evidence Status

| Area | Status | Evidence | Important caveat |
| --- | --- | --- | --- |
| Browser RTC fuzzing | Existing coverage evidence | `test/e2e/specs/editor/collaboration/collaboration-fuzz.spec.ts`, `test/e2e/specs/editor/collaboration/websocket/collaboration-fuzz.spec.ts`, Jetstream lane summaries, replay manifests, behavioral coverage artifacts | Chromium and test-provider focused. Broad profiles often use `wp.data` reachability, not every toolbar, inserter, drag, keyboard, selection, touch, or browser path. Current pass-sensitive concurrency evidence includes successful two-user and three-user records; twelve-user success remains below target, and the new thirty-user target has no completed successful record yet. |
| HTTP polling and test WebSocket transport | Existing coverage evidence | Browser fuzz profiles, WebSocket wrapper, HTTP polling lanes, targeted PHP/server tests | Test WebSocket provider coverage is not production proxy/load-balancer/WebSocket deployment coverage. |
| CRDT/rich-text/table/parser lower-level behavior | Existing and newly expanded coverage | CRDT block tests, stale snapshot tests, rich-text offset tests, table/query-array tests, parser semantic-equivalence worker output | File paths vary by exact branch. Reports must cite the branch/SHA carrying the actual test file. |
| PHP/server storage | Existing and newly expanded coverage | `phpunit/tests/collaboration/wpHttpPollingSyncServer.php`, `phpunit/tests/collaboration/wpSyncPostMetaStorage.php`, transport-compaction worker output | Some new PHP coverage has only syntax/diff validation so far because the closure worktree lacked PHP test dependencies and `wp-env`. |
| Polling manager state machine | Newly validated unit coverage | `packages/sync/src/providers/http-polling/test/polling-manager.test.ts` in `rtc-coverage-gap-polling-state-machine-20260520`; unit tests and JS lint passed | This is deterministic unit coverage, not a randomized source-level state-machine fuzzer. |
| Save-payload correctness | Newly validated unit coverage | `packages/core-data/src/entities.js` and `packages/core-data/src/test/entities.js` in `rtc-coverage-gap-save-payload-correctness-20260520`; 29 unit tests, prettier, lint, and diff check passed | Browser persistence follow-up was not run in that worker. The branch changes product code and needs normal PR review. |
| Parser and semantic equivalence | Newly validated unit coverage | `packages/blocks/src/api/validation/index.ts`, validation tests, list reducer tests, and `packages/core-data/src/utils/test/rtc-parser-semantic-equivalence.test.js`; 3 suites / 85 tests plus lint passed | Full browser RTC parser gate was not run. |
| List and nested structure | Newly authored and partly validated coverage | CRDT model/unit additions plus `collaboration-list-nested-structure.spec.ts` in `rtc-coverage-gap-list-nested-structure-20260520`; CRDT unit test passed 81 tests | Focused browser validation is still blocked by local install/build/wp-env issues in the worker. |
| Wider product coverage | Executable queue and partial targeted coverage | `rtc-wider-product-coverage-smoke.mjs`, `playwright.rtc-product-coverage.config.ts`, `wider-product-coverage-queue.json`, targeted core-data/CRDT/PHP changes | Queue/config is not proof. Firefox/WebKit/mobile, production WebSocket, object cache, multisite, site editor, CPT, metabox/classic, and third-party block paths need their gates run. |
| Jetstream2 campaign infrastructure | Existing operational evidence | supervisors, replay manifests, summary/events NDJSON, novelty monitor, triage watcher, analysis tiers, watchdogs, disk/resource controls | Infrastructure health is not product correctness by itself. |

## 2026-05-20 Concrete Coverage Snapshot

Latest checked Jetstream2 monitor state: `2026-05-20T17:55:08Z`.

Current monitor output directory:
`/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260520T174857Z`.

The novelty monitor reported `4290` coverage files, `120689` all-time novelty
records, `114294` WebSocket records, `6395` HTTP records, `10795` same-user
records, `21` many-user lifecycle records, `30` collaboration UI signal records,
and `249` large-post three-user HTTP lifecycle records. The active run had
browser lanes for parser transforms, real-user save/reload, real-user rich text,
async/server-backed blocks, long-session/large-document coverage, and
collaboration UI signals.

The new thirty-user target is configured in the novelty supervisor as
`novelty-ws-thirty-user-lifecycle`. It uses the many-user lifecycle profile with
`GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS=28`, which means the primary user,
the default collaborator, and `28` extra collaborators are all intended to join
one document. At this sample it had launched seed `1210001`, but the current
coverage counters still showed `0` thirty-user lifecycle records and `0`
successful thirty-user records. The supervisor had also marked that lane
inactive under the strict pre-action startup-noise cooldown after no product
evidence was produced. Treat thirty-user coverage as an active goal, not as
covered behavior.

A detailed direct scan of the monitor's current/observed behavioral artifact
roots earlier on May 20 counted `4743` `rtc-behavioral-coverage.ndjson` files
from `21` roots and `8794` raw JSON records: `2269` passed records and `6525`
records that failed or stopped early. The raw-record count is intentionally
different from the novelty monitor count: novelty records are derived feature
keys, while this scan counts one behavioral JSON record per seed artifact line.
The direct scan is retained below for action-shape detail; the pass-sensitive
goal state above is the current source for which concurrency goals are closed.

### Users And Server Concurrency

Server-wide browser load and users in one document are separate axes:

- At the checked instant, Jetstream2 had multiple supervised browser groups
  active, but thirty-user lifecycle had not produced product evidence and was
  paused by the startup-noise policy.
- The largest observed single document has `12` users: the base users plus `10`
  extra collaborators in the many-user lifecycle profile.
- Current novelty counters show records with `2`, `3`, and `12` users in one
  document. Successful current-window counters show `2057` two-user records and
  `44` three-user records; successful twelve-user and thirty-user goals are
  still unmet in the pass-sensitive novelty state.
- Same-account multi-tab coverage is present. The novelty monitor reports
  `10795` same-user records and `44` same-user successful records.
- A thirty-user-in-one-document goal is now explicit. It is configured and
  scheduled, but it has `0` completed records and `0` successful records in the
  checked snapshot.
- Local complementary coverage is synced back into Jetstream2 artifacts for the
  controller to see. Those imported records add `permissions-auth-locks`,
  `revision-persistence`, and `session-lifecycle` coverage, including 2-user
  and 3-user records, but they do not add browser load to the Jetstream2
  `wp-env` server.

Per-profile user-count evidence from the earlier direct artifact scan:

| Profile | Observed user-count shape |
| --- | --- |
| `large-post-three-user-http-lifecycle` | `491` records; `432` reached three users; successful large-post HTTP lifecycle coverage is still below target |
| `three-user-late-join` | `1109` records; `4` reached three users; `3` passed |
| `many-user-lifecycle` | `11` records; `9` reached twelve users; `4` passed |
| `session-lifecycle` | `558` records; includes `9` three-user records; `2` passed |
| `permissions-auth-locks` | `1707` records; contributor-role and auth/lock coverage, mostly two-user |
| `revision-persistence` | `168` records; local complementary runs are still feeding new revision/autosave/recovery cases |

### Simultaneous Editing

The current novelty counters do not expose every action histogram. The latest
detailed action scan still shows same-logical-step and multi-actor pressure:

- `concurrent-paragraphs`: `4882` action records, including `2758` in passing
  records.
- Late join overlapping with live edits/moves: same-step combinations include
  `late-join-post-action + move-block` (`66`),
  `edit-table-array-attributes + late-join-post-action` (`41`),
  `append-paragraph + late-join-post-action` (`38`),
  `insert-heading + late-join-post-action` (`36`),
  `concurrent-paragraphs + late-join-post-action` (`34`), and
  `insert-nested-group + late-join-post-action` (`34`).
- Late join also overlaps with real UI actions: list indent (`30`), paragraph
  typing (`25`), link editing (`24`), undo/redo (`24`), toolbar formatting
  (`23`), paste (`18`), and table-cell editing (`12`).
- Common structural edits are heavily represented: `move-block` (`9402`),
  `insert-heading` (`4860`), `append-paragraph` (`4765`), `delete-block`
  (`4699`), `insert-common-block` (`4668`), nested group insert/move (`4532`
  each), `insert-paragraph` (`4418`), `delete-nested-block` (`4348`), and
  `edit-nested-paragraph` (`4293`).
- Table/rich-text/UI coverage includes `edit-table-array-attributes` (`4880`),
  `ui-list-indent` (`214`), `ui-table-cell-edit` (`189`),
  `ui-undo-redo-paragraph` (`188`), `ui-toolbar-format-paragraph` (`147`),
  `ui-paste-paragraph` (`145`), and `ui-link-paragraph` (`139`).
- Async/server-backed and cross-entity edits include
  `insert-async-server-block` (`17851`) and
  `insert-media-cross-entity-block` (`139`).

### Lifecycle, Persistence, And Document Shape

The latest detailed action scan included:

- save checkpoints: `16771` phase events, `10222` in passing records;
- reloads: `15509` phase events, `10348` in passing records;
- revision restore: `4792` phase events, `4538` in passing records;
- final persistence oracle: `2796` phase events, `2450` in passing records;
- final persistence after reload: `2503` phase events, `2254` in passing
  records;
- final UI witness sweep: `16` events, `8` in passing records;
- publish persistence witness: `6` phase events in this scan, which is still too
  thin to close the publish/save-payload gap.

The largest observed document shape is `160` configured large-document blocks
and `298` total blocks after fuzz operations. Covered core block types include
paragraph, heading, group, list/list-item, quote, image, table, embed, latest
posts, categories, query, calendar, reusable block, buttons/button, separator,
freeform, media-text, gallery, file, cover, details, preformatted, code,
columns/column, spacer, verse, HTML, shortcode, and social links.

Operation-witness tracking is present in the fuzz records: `75733` created
operation markers, `75258` witnessed markers, and `475` missing markers in the
direct artifact scan. `1499` records used fail-mode operation ledgers and `7295`
used shadow mode.

Coverage goals still below target at the checked instant include successful
twelve-user lifecycle completion, all thirty-user goals, successful large-post
three-user HTTP lifecycle, successful table stale snapshot, successful
collaboration UI signals, remote selection/cursor evidence, final publish
persistence, final UI witness sweep, and several real-user editing action
ratchets. Those should remain active fuzzing goals.

## Browser Fuzzing

The browser fuzzer drives the real editor in Chromium against `wp-env`. The
WebSocket spec wraps the same core fuzz spec so the same action grammar can run
against HTTP polling or the test WebSocket provider.

Covered classes include:

- HTTP polling transport and the test WebSocket provider.
- Distinct-user and same-user sessions.
- Two-user default sessions, three-user sessions, same-user sessions, and late
  joins.
- Reload/reconnect lifecycle profiles.
- Save checkpoints, autosave checkpoints, final persistence checks, and
  revision restore probes.
- Paragraph/title/heading edits, top-level moves, table body updates, nested
  groups, common blocks, block-gauntlet blocks, parser stress, selected UI
  typing/formatting/paste/link/list/table actions, media/server-backed blocks,
  permissions/auth profiles, and long-session/large-document profiles.
- Oracles for convergence, title state, persisted `_crdt_document`, save/reload
  behavior, revision behavior, operation witnesses, invariant snapshots, and
  behavioral coverage records.

Important browser gaps remain:

- Real browser diversity beyond Chromium is only queued by the wider-product
  worker; Firefox/WebKit gates have not been shown passing.
- Mobile/touch editing is queued, not proven.
- Production WebSocket/proxy/load-balancer behavior requires an actual endpoint
  and was not executed by the closure worker.
- Twelve-user concurrency is observed, but successful twelve-user goals remain
  below target in the current novelty state.
- Thirty-user concurrency is now a first-class coverage goal and has an
  executable lane, but it has not yet produced a completed or successful
  coverage record.
- Many broad actions use direct editor state mutation through `wp.data`. That
  is useful for reachability, but it is not equivalent to covering every
  toolbar, inserter, drag-and-drop, keyboard, selection, or touch path.
- Server restarts, database failover, object-cache inconsistency, long offline
  edits, and independent network partitions remain environment-level campaigns,
  not standard browser lane coverage.

## Lower-Level Coverage

Lower-level tests give faster feedback and better fault isolation than browser
fuzzing. Existing evidence includes selected CRDT block, stale snapshot,
rich-text, table/query-array, parser, polling-manager, and PHP/server storage
coverage.

The May 20 closure loop added or expanded these areas:

### Polling Manager

Branch/worktree: `rtc-coverage-gap-polling-state-machine-20260520`

Added deterministic unit coverage for:

- registration/unregistration listener lifecycle;
- duplicate room registration;
- auxiliary-only collaborator gating;
- hidden-tab polling interval;
- unload-pending retry behavior;
- allowed-room update restoration after room-specific `403`;
- primary/auxiliary room churn.

Validation:

- `npm install`: passed.
- `npm run test:unit packages/sync/src/providers/http-polling/test/polling-manager.test.ts`: passed, 41 tests.
- `npm run lint:js packages/sync/src/providers/http-polling/test/polling-manager.test.ts`: passed.

Remaining gap: this is deterministic state-machine coverage. A seeded
source-level fuzzer for delayed, duplicated, stale, and reordered responses
would still be useful.

### Save-Payload Correctness

Branch/worktree: `rtc-coverage-gap-save-payload-correctness-20260520`

Added unit coverage and a small repair path for:

- correct editor payload with stale CRDT block order;
- empty evaluated content with non-empty CRDT content;
- malformed evaluated content repaired from non-empty live CRDT blocks;
- changed valid content not overwritten by CRDT serialization.

Validation:

- `npm run test:unit packages/core-data/src/test/entities.js -- --runInBand`: passed, 29 tests.
- Prettier check/write/check: passed.
- `npx wp-scripts lint-js packages/core-data/src/entities.js packages/core-data/src/test/entities.js`: passed after generating theme lint prerequisites.
- `git diff --check`: passed.

Remaining gap: browser persistence/reload confirmation was not run in the
worker. The worker suggested `collaboration-persistence.spec.ts` as the follow-up
browser oracle.

### Parser and Semantic Equivalence

Branch/worktree: `rtc-coverage-gap-parser-semantic-equivalence-20260520`

Added or expanded coverage for:

- semicolonless entity normalization and non-normalization;
- preserve-whitespace parsed rich text through CRDT merge;
- equivalent HTML no-op cases;
- ambiguous list item content containing `&nbsp;`;
- deprecated block migration and validation-fix transforms in collaboration
  merge.

Validation:

- `npm run test:unit packages/blocks/src/api/test/validation.js packages/blocks/src/api/raw-handling/test/list-reducer.js packages/core-data/src/utils/test/rtc-parser-semantic-equivalence.test.js -- --runInBand`: passed, 3 suites / 85 tests.
- `npm run lint:js -- ...`: passed after Prettier formatting.
- `git diff --check`: passed.

Remaining gap: full browser RTC parser/serialization gates were not run by this
worker.

### List and Nested Structure

Branch/worktree: `rtc-coverage-gap-list-nested-structure-20260520`

Added:

- CRDT model/unit coverage for nested list reorder, duplicate/near-duplicate
  list items, rich-text/entity list variants, and sibling-edit/move cases.
- A focused browser spec,
  `test/e2e/specs/editor/collaboration/collaboration-list-nested-structure.spec.ts`,
  for moving blocks into and out of groups/columns across save/reload.
- A targeted CRDT repair that applies client-ID-based deletions before
  positional diffing.

Validation:

- `npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts`: passed, 81 tests.
- `git diff --check`: passed.

Remaining gap: focused browser validation did not run successfully in the worker.
The worktree lacked a complete install/build/wp-env setup, and WebSocket/browser
attempts failed before the browser oracle ran. This branch should not be called
browser-validated yet.

### Transport and Compaction

Branch/worktree: `rtc-coverage-gap-transport-compaction-20260520`

Added PHP/API tests for:

- more than the bounded read window of updates after a cursor;
- stale compaction where a newer compaction exists beyond the first read window;
- high-backlog mixed-room isolation;
- compaction plus concurrent writes across clients.

Validation:

- `php -l` on the changed PHP files: passed.
- `git diff --check`: passed.

Remaining gap: focused PHPUnit did not run because the worktree lacked
`vendor/bin/phpunit`, `composer`, `wp-env`, and a usable PHP test setup. This is
authored coverage with syntax/diff validation, not a passed PHP gate.

### Wider Product Queue

Branch/worktree: `rtc-coverage-gap-wider-product-coverage-20260520`

Added:

- `test/e2e/bin/rtc-wider-product-coverage-smoke.mjs`;
- `test/e2e/playwright.rtc-product-coverage.config.ts`;
- `test/e2e/specs/editor/collaboration/data/wider-product-coverage-queue.json`;
- targeted sync-config, CRDT, PHP, and multisite/object-cache-adjacent checks.

The queue makes these areas explicit and executable:

- site editor templates, template parts, and navigation;
- custom post types and REST schemas;
- meta boxes and classic editor interop;
- publish/update workflows;
- document-size and collaboration-gating boundaries;
- third-party block/block-support strategy;
- media, attachments, reusable blocks, and synced patterns;
- persistent object cache;
- multisite;
- Firefox, WebKit, and mobile/touch;
- production WebSocket/proxy behavior.

Validation:

- PHP syntax checks on changed PHP files: passed.
- `node --check test/e2e/bin/rtc-wider-product-coverage-smoke.mjs`: passed.
- `node test/e2e/bin/rtc-wider-product-coverage-smoke.mjs`: passed and reported an 11-item valid queue.
- `git diff --check`: passed.

Remaining gaps:

- Jest, PHPUnit, and Playwright gates did not run because dependencies and
  `wp-env` were unavailable in the worker.
- Production WebSocket/proxy behavior requires a real endpoint via
  `GUTENBERG_RTC_PRODUCTION_WS_URL`.
- Queue/config coverage is useful scheduling infrastructure, not proof that
  each wider product surface is robust.

## PHP and REST Storage Coverage

Existing PHP tests cover:

- room format and permission validation;
- per-room permission failures;
- multiple rooms in a single request;
- isolation between post rooms;
- awareness storage, update, and ownership;
- cursor monotonicity and update retrieval;
- malformed update JSON handling;
- duplicate awareness row coalescing;
- cursor reads that should not skip updates inserted during a fetch window;
- compaction that should not delete an update inserted during the delete.

The May 20 transport/compaction worker adds authored test coverage for
high-backlog read windows, stale compaction beyond the first read window, mixed
room batches under high backlog, and compaction with concurrent writes. Those
tests still need focused PHPUnit execution before maintainers should treat them
as passed.

## Jetstream2 Campaign and Triage Coverage

Jetstream2 is doing two jobs:

1. Wide exploration through long-running fuzz lanes.
2. Exact-ref validation and regression isolation for the RTC PR set.

Campaign tooling covers:

- supervised HTTP, HTTP persistence, WebSocket, focused, strict-expansion,
  backend/API, lower-level, and coverage-guided lanes;
- parallel lanes with disjoint seed ranges;
- per-seed replay manifests and summary records;
- retry/recheck logic before classifying failures;
- first-level and second-level analysis tiers;
- browser-heavy triage watcher for likely-real candidates;
- novelty monitor that enables focused groups when coverage is missing;
- watchdog repair and disk cleanup for stale `wp-env`/Docker resources;
- the May 20 coverage-gap closure controller:
  `bin/rtc-coverage-gap-closure-start-remote.sh`;
- the runbook:
  `docs/explanations/architecture/rtc-coverage-gap-closure-runbook-20260520.md`.

The useful artifacts are files, not a single authoritative database:

- lane `summary.ndjson`;
- lane `events.ndjson`;
- `replay.json`;
- behavioral coverage NDJSON;
- triage watcher state and signature directories;
- analysis-tier result JSON and Markdown handoffs;
- supervisor and watchdog state JSON;
- coverage closure reports under
  `/media/volume/danluu-fuzz-data/rtc-coverage-gap-closure-20260520/reports`;
- coverage closure worktrees under
  `/media/volume/danluu-fuzz-data/rtc-coverage-gap-closure-20260520/worktrees`.

The closure controller status table lagged some done sentinels during this
sample, and the integrator report was still running. Grade closure work by the
worker report, changed files, commands, results, blockers, and eventual
integrator output, not by the status table alone.

## PR-Set Review Guidance

The high-signal process rule remains:

> Any branch touching CRDT block reconciliation, save projection, persisted CRDT
> content, parser semantic equivalence, or transport storage must pass its owned
> unit/PHP tests and the realistic collaboration gate on the exact branch head or
> exact merge-candidate SHA before it is presented as ready.

Branches that require the strongest gates include changes to:

- `packages/core-data/src/utils/crdt-blocks.ts`;
- rich-text equivalence, semantic identity, block rebasing, or list reducers;
- `packages/core-data/src/entities.js` save projection or persistence repair;
- persisted `_crdt_document` load/save/recovery;
- HTTP storage read windows or compaction semantics;
- site editor or wider product entity synchronization.

For each PR or stack report, maintainers should ask for:

- exact branch name and SHA;
- whether the branch is standalone or cumulative;
- targeted unit/PHP/browser command and result;
- whether focused list-item, save/reload, parser, revision, or transport gates
  ran on the exact branch head;
- whether HTTP, WebSocket, or both were covered;
- whether the run used Chromium only or also Firefox/WebKit/mobile;
- where `summary.ndjson`, `events.ndjson`, `replay.json`, worker reports, and
  Playwright artifacts live.

The previously failed realistic list-item gate on
`rtc-pr-stack-20260519T214027Z-tested-merge-candidate-v3` remains negative
evidence until the exact recomposed candidate passes the relevant gate. Fixed
PR06 refs and new list/nested unit coverage are useful, but they are not a
substitute for exact-head browser validation of the merge candidate.

## Remaining Gaps

The highest-value remaining gaps are now narrower than the previous report, but
they are not zero.

### Needs Validation, Not Just Authored Tests

- Transport/compaction PHP tests need focused PHPUnit.
- List/nested browser save/reload spec needs a complete install/build/wp-env and
  then focused browser validation.
- Wider product queue needs the queued Jest/PHP/Playwright/browser/project gates.
- Production WebSocket/proxy behavior needs a real endpoint and environment.
- Any product-code change made by closure workers needs normal PR review and
  exact branch validation.

### Needs Better Fuzzing, Not Only Deterministic Tests

- Polling manager now has better deterministic coverage, but a seeded
  state-machine fuzzer below Playwright would explore more duplicate, delayed,
  stale, forbidden, and reordered response schedules.
- Save-payload correctness now has focused unit coverage, but browser
  persistence/reload/revision fuzz should verify the full editor/server/reload
  loop.
- Parser semantic-equivalence now has deterministic tests, but browser
  parser-serialization fuzz should keep exercising equivalent HTML,
  deprecated forms, validation fixes, and ambiguous list identities.

### Wider Product and Environment

These are queued or partially represented, not fully proven:

- site editor entities, templates, template parts, and navigation menus;
- custom post types and unusual REST schemas;
- meta boxes and classic editor interop;
- publish/update workflows distinct from draft save and autosave;
- persistent object cache;
- multisite;
- non-Chromium browsers;
- mobile/touch editing;
- third-party blocks and block supports;
- real production WebSocket/proxy/load-balancer behavior.

## Existing Documentation to Keep in Sync

Related docs:

- `docs/explanations/architecture/real-time-collaboration-fuzzing.md`
- `docs/explanations/architecture/real-time-collaboration-fuzzing-strategies.md`
- `docs/explanations/architecture/real-time-collaboration-fuzzing-pipeline-runbook.md`
- `docs/explanations/architecture/real-time-collaboration-fuzz-issues-handoff.md`
- `docs/explanations/architecture/real-time-collaboration-agent-handoff-protocol.md`
- `docs/explanations/architecture/rtc-coverage-gap-closure-runbook-20260520.md`

When using this report for maintainer review, prefer actual file lists, branch
names, SHAs, worker reports, commands, and artifacts over planned architecture
notes. The exact branch carrying a test is the thing maintainers can review.
