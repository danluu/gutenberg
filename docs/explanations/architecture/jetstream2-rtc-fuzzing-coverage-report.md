# Jetstream2 RTC Fuzzing Coverage Report

This report describes what the Jetstream2 RTC fuzzing and validation campaign
currently covers, what is only partially covered, and what should still be
treated as uncovered or unproven. It is written for a maintainer who has not
followed the earlier coverage-gap reports.

Coverage evidence is not the same as merge readiness. A branch or stack that
touches RTC reconciliation, save projection, parser equivalence, persisted CRDT
state, or transport storage still needs exact-ref validation on the branch or
merge candidate that maintainers would review.

The live snapshot below was sampled from Jetstream2 at
`2026-05-20T18:04:19Z`.

## Status Key

| Status | Meaning |
| --- | --- |
| Covered and validated | There is a concrete test/fuzzer path and the relevant focused gate has passed. |
| Covered by active fuzzing | The live fuzzing campaign has run or is running this surface and emits replayable artifacts. Failures may still be under triage. |
| Partially covered | Some important behavior is exercised, but browser, PHPUnit, non-Chromium, production, or scale gates are missing. |
| Targeted but not proven | The queue or coverage goal exists, but successful evidence is not present yet. |
| Not covered | No meaningful evidence was found in the current campaign artifacts. |

## Bottom Line

The strongest coverage is for post-editor RTC behavior in Chromium using HTTP
polling and the test WebSocket provider. That includes two-user and three-user
sessions, same-account multi-tab sessions, save/reload/autosave/revision paths,
common block operations, parser-sensitive block transforms, selected real UI
rich-text actions, large documents, permissions/auth/lock profiles, and
lower-level CRDT/parser/table/storage tests.

The weakest or still unproven areas are high-concurrency documents, production
WebSocket/proxy deployments, non-Chromium and mobile/touch browser runs, broader
site-editor and custom-product surfaces, object-cache/multisite gates, exact
browser validation for the list/nested-structure work, and focused PHPUnit for
transport/compaction storage coverage.

The current campaign has explicit goals for 12-user and 30-user documents. The
latest snapshot has successful two-user and three-user records, but no
successful 12-user or 30-user records in the pass-sensitive novelty state.
Thirty-user coverage is configured and scheduled, but it is not covered yet.

## Current Snapshot

Current monitor output directory:
`/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260520T174857Z`.

At the sampled time the novelty monitor reported:

| Metric | Value |
| --- | --- |
| Coverage files | `4240` |
| Total novelty records seen | `120817` |
| WebSocket records | `114307` |
| HTTP records | `6510` |
| Same-user records | `10823` |
| Same-user successful records | `44` |
| Successful two-user records | `2060` |
| Successful three-user records | `44` |
| Max users observed in one document | `12` |
| Max users who edited one document | `11` |
| Max extra collaborators configured in one document | `28` |
| Thirty-user lifecycle records | `0` |
| Successful thirty-user records | `0` |
| Max total blocks observed in one document | `297` |
| Max configured large-document blocks | `160` |
| Real-user editing successful records | `1083 / 80` target |

Active or recently active supervisor groups included parser transforms,
real-user save/reload, async/server-backed blocks, long-session/large-document
coverage, collaboration UI signals, and several paused or disabled breadth
groups. The recommended coverage groups still include 30-user lifecycle,
collaboration UI signals, many-user lifecycle completion, table stale snapshot,
large-post HTTP lifecycle, three-user late join, real-user editing, parser
transforms, async/server-backed blocks, and media/cross-entity coverage.

## Coverage Matrix

| Surface | Current status | What is covered | What is not yet proven |
| --- | --- | --- | --- |
| Browser post-editor RTC fuzzing | Covered by active fuzzing | Seeded Playwright runs open the real editor, create primary/collaborator sessions, apply random but replayable action sequences, and check convergence, persistence, reload, title, revision, operation-witness, and behavioral coverage oracles. | Mostly Chromium. Many broad actions use `wp.data` to reach states quickly, which is not the same as covering every toolbar, inserter, keyboard, selection, drag, touch, or browser path. |
| HTTP polling transport | Covered by active fuzzing and lower-level tests | Browser lanes and PHP/JS tests cover room registration, update retrieval by cursor, awareness records, permission failures, mixed-room batches, retry/unload behavior, payload chunking, and compaction basics. | Some high-backlog and compaction cases have syntax/diff validation but still need focused PHPUnit execution in a complete PHP/wp-env setup. |
| Test WebSocket transport | Covered by active fuzzing | The same browser fuzz grammar runs through the test WebSocket provider, so editor actions and convergence are checked under WebSocket sync. | This is not proof for production WebSocket proxies, load balancers, TLS termination, idle timeout behavior, or real deployment configuration. |
| Production WebSocket/proxy | Targeted but not proven | A queue item records the websocket-only reload-loss smoke command and required `GUTENBERG_RTC_PRODUCTION_WS_URL`. | No successful production/proxy endpoint run is recorded in this report. |
| User/session concurrency | Partially covered | Two-user, three-user, same-user/multi-tab, late-join, reload/reconnect, and 12-user attempt records exist. Successful records exist for two-user and three-user cases. | Successful 12-user and 30-user goals are still unmet. Thirty-user has zero completed or successful coverage records in the current snapshot. |
| Real UI rich-text actions | Covered by active fuzzing | Successful action counters include paste, link editing, list indent, composition, toolbar formatting, cut/copy, table-cell editing, undo/redo, heading shortcuts, title typing, paragraph typing, and paragraph formatting. | Counts do not prove every selection range, IME path, browser editing implementation, or toolbar/keyboard route. |
| Save, reload, autosave, revision, recovery | Covered by active fuzzing | Fuzz records include save checkpoints, reloads, revision restore, final persistence, final persistence after reload, and save/reload profiles. | Publish persistence and final UI witness sweep remain thin. Exact merge candidates still need realistic save/reload/revision gates. |
| Parser, serialization, validation transforms | Covered by active fuzzing and validated unit tests | Parser profiles plus unit tests cover equivalent HTML, semicolonless entities, preserve-whitespace rich text, deprecated block migration, validation fixes, and ambiguous list item content. | Full browser parser/serialization gates should continue running because unit equivalence tests do not cover every editor/server/reload path. |
| Common blocks and block gauntlet | Covered by active fuzzing | The campaign exercises paragraph, heading, group, list/list-item, quote, image, table, embed, latest posts, categories, query, calendar, reusable block, buttons/button, separator, freeform, media-text, gallery, file, cover, details, preformatted, code, columns/column, spacer, verse, HTML, shortcode, and social links. | Some block coverage is generated through state APIs rather than complete user UI workflows. Third-party blocks are represented by targeted mocks, not a broad plugin ecosystem run. |
| Async/server-backed and cross-entity blocks | Partially covered | Async/server-backed block insertion and media/cross-entity block paths have fuzz records. Targeted tests cover attachment IDs, transient blobs, reusable block references, synced-pattern configuration, and media synced properties. | Server-rendered blocks, media upload flows, gallery/file/image workflows, embeds, query loop, reusable/synced pattern UI workflows, and cross-entity persistence need more successful browser evidence. |
| Permissions, locks, auth, sessions | Covered by active fuzzing | Permission/auth/lock profiles cover contributor-style permission failures, post locks, collaborator auth changes, same-user sessions, and lock/error behavior. | Nonce expiry, long-lived session changes, metabox lock fallback, and uncommon role/capability combinations still need more direct evidence. |
| Large documents and long sessions | Covered by active fuzzing | Long-session and large-document profiles reach up to 160 configured large-document blocks and 297 total observed blocks after fuzz operations. | Undo-stack growth, Yjs document growth, block identity drift, delayed persistence, and very long real sessions remain active fuzz targets rather than closed coverage. |
| Lower-level CRDT, table, rich-text, list behavior | Covered and validated for focused cases | Unit/model tests cover CRDT block reconciliation, stale snapshots, table/query-array identity, rich-text offsets/cursor scope, nested list reorders, duplicate or near-duplicate list items, entity/rich-text list variants, and sibling edits during moves. | These tests are not a replacement for browser save/reload validation on exact PR heads. Native/libFuzzer-style coverage-guided harnesses are still not mature coverage here. |
| Polling manager state machine | Covered and validated | Deterministic Jest coverage checks registration/unregistration, duplicate room registration, auxiliary-only collaborator gating, hidden-tab polling interval, unload-pending retry suppression, allowed-room restoration after room-specific `403`, payload chunking, and primary/auxiliary room churn. | There is not yet a randomized lower-level state-machine fuzzer for delayed, duplicated, stale, forbidden, and reordered responses. |
| Save-payload correctness | Covered and validated at unit level | Unit tests check stale CRDT order, empty evaluated content with non-empty CRDT content, malformed evaluated content repaired from live CRDT blocks, and valid changed content not overwritten by CRDT serialization. | The full browser persistence/reload/revision path still needs to run on exact PR heads that change save projection. |
| PHP/REST storage | Partially covered | PHP tests cover room format and permission validation, room isolation, awareness ownership, cursor monotonicity, malformed update JSON, duplicate awareness cleanup, basic compaction races, high-backlog read windows, stale compaction beyond first fetch window, mixed-room isolation, and concurrent write survival during compaction. | The high-backlog and compaction PHP tests need focused PHPUnit in a complete environment before they should be treated as passed. |
| Site editor, templates, navigation | Targeted but not proven | Entity-level tests cover sync configuration for `wp_template`, `wp_template_part`, and `wp_navigation`; the queue has site-editor smoke commands. | Browser site-editor template/template-part/navigation collaboration gates have not been shown passing. |
| Custom post types and REST schemas | Partially covered | Entity/PHP tests cover custom REST base URLs, revision URL construction, taxonomy REST bases, synced-property behavior, and capability rejection for RTC rooms backed by a CPT. | Broader CPT editor UI workflows and unusual real-world REST schemas need browser evidence. |
| Metabox and classic editor interop | Targeted but not proven | The queue references existing metabox lock, meta-box, and classic-editor compatibility specs. | The queue is not proof that those gates passed in this campaign. |
| Persistent object cache and multisite | Targeted but not proven | PHP storage tests target blog-ID scoping so storage-post lookup cannot bleed across blogs under `switch_to_blog()`. | Multisite and persistent-object-cache gates still need focused execution in the right environment. |
| Non-Chromium and mobile/touch | Targeted but not proven | Playwright config defines Firefox, WebKit, and Pixel 5/mobile-touch product smoke projects. | Passing Firefox/WebKit/mobile/touch RTC runs are not recorded in this report. |
| Campaign infrastructure | Operationally covered | Supervisors, novelty monitor, replay manifests, triage watcher, analysis tiers, watchdogs, disk/resource controls, and report generation are present. | Infrastructure health is not product correctness; it only supports scheduling, replay, triage, and auditability. |

## Browser Fuzzing Details

The main browser fuzzer is `collaboration-fuzz.spec.ts`. It drives the real post
editor and records enough data to replay a seed. The WebSocket wrapper runs the
same action grammar through the test WebSocket provider.

Covered action families include:

- Text and title editing: typing titles, typing paragraphs, formatting
  paragraphs, heading shortcuts, paste, cut/copy, undo/redo, link editing,
  toolbar formatting, composition, and list indentation.
- Structural editing: inserting, deleting, and moving top-level blocks; nested
  groups; nested block edits; list/list-item work; columns; and table body
  updates.
- Block breadth: common blocks, block-gauntlet blocks, async/server-rendered
  style blocks, media/cross-entity blocks, reusable block references, and
  synced-pattern-like data paths.
- Session lifecycle: same-user stale tabs, distinct users, late join,
  reload/reconnect, multi-reload, save checkpoints, autosave/revision probes,
  final persistence checks, and long-session/large-document profiles.
- Permission and lock behavior: contributor-style failures, lock/session
  changes, auth/permission profiles, and sync-error handling.

Current successful real-user editing action counters include:

| Action | Successful count |
| --- | ---: |
| `ui-type-paragraph` | `1403` |
| `ui-type-title` | `1379` |
| `reload-post-action` | `1713` |
| `ui-undo-redo-paragraph` | `1320` |
| `ui-format-paragraph` | `1322` |
| `ui-heading-shortcut` | `1298` |
| `ui-paste-paragraph` | `371` |
| `ui-link-paragraph` | `371` |
| `ui-composition-paragraph` | `372` |
| `ui-toolbar-format-paragraph` | `372` |
| `ui-list-indent` | `317` |
| `ui-cut-copy-paragraph` | `287` |
| `ui-table-cell-edit` | `320` |

The fuzzer oracles include convergence, visible title state, serialized block
content, persisted `_crdt_document`, save/reload behavior, revision behavior,
operation witnesses, invariant snapshots, and behavioral coverage records.

## Lower-Level And Storage Coverage

Lower-level tests provide faster and more local evidence than Playwright. They
are useful because many RTC bugs are reconciliation bugs that can be reduced to
CRDT, parser, table, rich-text, or transport state transitions.

Covered lower-level areas:

- CRDT block reconciliation: block order, identity, nested structures, stale
  snapshots, duplicate table/list structures, sibling edits during moves, and
  deletion/reinsert behavior.
- Rich text and selection: rich-text offsets, cursor scope, entity handling, and
  user-selection state.
- Parser/semantic equivalence: no-op equivalent HTML, deprecated block forms,
  validation transforms, ambiguous `&nbsp;` list items, and preserve-whitespace
  behavior.
- HTTP polling manager: registration, room churn, retries, unload suppression,
  hidden-tab behavior, room-specific `403`, chunking, and auxiliary rooms.
- Save projection: deciding which content gets sent to WordPress when local
  evaluated content and live CRDT content disagree.
- PHP storage and REST sync: room permission validation, post-room isolation,
  awareness storage, cursor reads, malformed update handling, duplicate
  awareness row handling, compaction, high backlog, mixed rooms, and concurrent
  writes.

Validation that has passed:

- Polling manager focused unit suite: `41` tests.
- Save-payload focused unit suite: `29` tests.
- Parser/semantic-equivalence focused unit suites: `85` tests.
- List/nested CRDT unit suite: `81` tests.
- PHP syntax checks for transport/compaction and wider-product PHP changes.
- Wider-product queue validator: `11` queue items.
- `git diff --check` on the coverage worktrees.

Validation that is still needed:

- Focused PHPUnit for the high-backlog transport/compaction tests.
- Browser validation for the list/nested save/reload spec.
- Browser persistence/reload confirmation for branches that change save-payload
  correctness.
- Exact branch or exact merge-candidate browser gates for any PR stack that
  changes CRDT reconciliation, save projection, parser equivalence, persisted
  CRDT state, or transport storage.

## Wider Product Coverage

The wider-product queue is a checklist and execution manifest for RTC surfaces
outside the normal post-content fuzzer. It is useful because it names the
surface, file(s), command, and oracle for each gate. It is not itself evidence
that the gate passed.

The wider-product coverage plan includes:

- Site editor templates, template parts, and navigation: entity sync-config
  tests plus queued browser smoke commands.
- Custom post types and REST schemas: custom REST bases, revision URLs, taxonomy
  REST bases, synced properties, and server-side capability rejection.
- Metabox/classic editor interop: queued metabox lock, meta-box, and classic
  editor compatibility commands.
- Publish/update workflows: queued persistence/title reload and publish smoke
  commands, plus entity coverage for template records that should avoid the
  normal post freshness path.
- Document-size and collaboration-gating boundaries: queued document-size lock,
  metabox lock, and sync-error-filter specs.
- Third-party block/block-support behavior: a mocked third-party block with
  block-support style/color attributes, supported-attribute preservation, and
  local-only preview stripping.
- Media, attachments, reusable blocks, and synced patterns: attachment IDs,
  transient blobs, reusable `core/block` references, synced-pattern config, and
  media synced properties.
- Persistent object cache and multisite: blog-ID scoping for storage-post cache
  lookup under `switch_to_blog()`.
- Firefox, WebKit, and mobile/touch: focused Playwright projects exist for these
  browser/device classes.
- Production WebSocket/proxy behavior: a websocket-only reload-loss smoke path
  exists, but it requires `GUTENBERG_RTC_PRODUCTION_WS_URL`.

Unproven wider-product surfaces remain important. Do not treat the site editor,
metabox/classic interop, non-Chromium/mobile, multisite/object-cache, or
production WebSocket paths as covered until their queued gates run successfully
and produce artifacts.

## Current Unmet Coverage Goals

The novelty monitor still reports these high-value gaps:

- `users:30`, `success-users:30`, and 30-user late-join lifecycle goals:
  `0 / 3`.
- `success-users:12` and 12-user late-join lifecycle goals: `0 / 10`.
- Successful large-post three-user HTTP lifecycle: `0 / 10`.
- Successful table stale snapshot over HTTP: `0 / 10`.
- Successful collaboration UI signals: `0 / 25`.
- Remote selection/cursor evidence: `0 / 25`.
- Publish UI readiness: `0 / 10`.
- Final publish persistence: `1 / 10`.
- Successful three-user late-join profile target: `0 / 25`.
- Successful three-user, 50-block profile target: `0 / 5`.
- Many-user lifecycle success target: `3 / 10`.

These numbers mean the fuzzer knows how to ask for the surface, but the current
pass-sensitive coverage state has not yet produced enough successful records to
close the goal.

## Not Covered Or Not Proven Enough

These are the most important areas a reader should not infer are solved from
the current report:

- Thirty users in one document: configured and scheduled, but no completed or
  successful coverage records yet.
- Successful 12-user documents: observed attempts exist, but the current
  successful goal is still unmet.
- Production WebSocket/proxy/load-balancer behavior: queued, not executed
  successfully here.
- Firefox, WebKit, and mobile/touch RTC editing: projects are defined, but
  passing artifacts are not recorded in this snapshot.
- Site editor RTC collaboration across templates, template parts, and
  navigation: entity-level checks and queues exist, but browser proof is still
  pending.
- Metabox/classic editor interop: queued, not proven.
- Persistent object cache and multisite: targeted by PHP tests, but focused
  environment execution is still needed.
- Long offline edits, real network partitions, server restarts, database
  failover, and proxy timeout behavior: these are environment-level campaigns,
  not closed by standard browser lanes.
- Native or source-level coverage-guided lower-level fuzzing: still immature
  compared with the browser and deterministic unit/PHP coverage.
- Third-party block ecosystem coverage: represented by targeted mocks and
  block-support tests, not broad plugin compatibility testing.

## Evidence Sources

Primary evidence artifacts are file-based:

- Lane `summary.ndjson` and `events.ndjson`.
- Per-seed `replay.json`.
- Behavioral coverage NDJSON files.
- Playwright artifacts for browser failures.
- Triage watcher state and signature directories.
- Analysis-tier JSON and Markdown reports.
- Supervisor, novelty monitor, watchdog, and resource-control state JSON.
- Worker reports and exact commands under
  `/media/volume/danluu-fuzz-data/rtc-coverage-gap-closure-20260520/reports`.
- Coverage worktrees under
  `/media/volume/danluu-fuzz-data/rtc-coverage-gap-closure-20260520/worktrees`.

Representative source files and tests:

- `test/e2e/specs/editor/collaboration/collaboration-fuzz.spec.ts`
- `test/e2e/specs/editor/collaboration/websocket/collaboration-fuzz.spec.ts`
- `packages/sync/src/providers/http-polling/test/polling-manager.test.ts`
- `packages/core-data/src/test/entities.js`
- `packages/core-data/src/utils/test/crdt-blocks.ts`
- `packages/core-data/src/utils/test/rtc-parser-semantic-equivalence.test.js`
- `packages/blocks/src/api/test/validation.js`
- `packages/blocks/src/api/raw-handling/test/list-reducer.js`
- `phpunit/tests/collaboration/wpHttpPollingSyncServer.php`
- `phpunit/tests/collaboration/wpSyncPostMetaStorage.php`
- `test/e2e/specs/editor/collaboration/data/wider-product-coverage-queue.json`
- `test/e2e/bin/rtc-wider-product-coverage-smoke.mjs`
- `test/e2e/playwright.rtc-product-coverage.config.ts`

## PR And Maintainer Review Guidance

For a PR or stack, ask for:

- Exact branch name and commit SHA.
- Whether the branch is standalone or cumulative.
- The focused unit/PHP/browser command and result for that exact SHA.
- Whether HTTP, WebSocket, or both were covered.
- Whether the run used Chromium only or also Firefox/WebKit/mobile.
- Whether save/reload, revision, parser, list/nested, transport, and
  persistence gates ran when the branch touches those areas.
- Where the replay, summary, event, worker report, and Playwright artifacts live.

The exact branch carrying a test or fix is the reviewable object. Coverage
architecture, queue entries, and previous reports are useful context, but they
do not replace exact-head validation.

## Related Documentation

- `docs/explanations/architecture/real-time-collaboration-fuzzing.md`
- `docs/explanations/architecture/real-time-collaboration-fuzzing-strategies.md`
- `docs/explanations/architecture/real-time-collaboration-fuzzing-pipeline-runbook.md`
- `docs/explanations/architecture/real-time-collaboration-fuzz-issues-handoff.md`
- `docs/explanations/architecture/real-time-collaboration-agent-handoff-protocol.md`
- `docs/explanations/architecture/rtc-coverage-gap-closure-runbook-20260520.md`
