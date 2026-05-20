# Jetstream2 RTC Fuzzing Coverage Report

This report summarizes what the Jetstream2 RTC fuzzing project is exercising,
what it is not exercising, and how that should guide the current maintainer PR
set. It is written for maintainers reviewing a batch of real-time collaboration
fixes, not as a runbook for operating the fuzzing infrastructure.

The PR-stack status in this document reflects local and Jetstream2 tmux context
from May 19, 2026. Treat branch status as live data: before filing or merging,
re-check the exact branch head and current gate artifacts.

The most important distinction is between:

-   **coverage evidence**: a fuzzer or targeted gate exercises the same class of
    behavior as a proposed PR;
-   **merge readiness**: the exact branch or merge candidate has passed the
    high-signal gates that cover its risk.

A branch can have useful coverage and still not be ready if the exact exported
ref has not passed the relevant gate.

## Current PR-Set Context

The active Jetstream2 work is building a maintainer-facing RTC PR set from
several cumulative branches:

-   `rtc-pr-stack-20260519T214027Z-tested-pr01-http-generated-update-size`
-   `rtc-pr-stack-20260519T214027Z-tested-pr02-http-storage-read-window`
-   `rtc-pr-stack-20260519T214027Z-tested-sidecar-pr02a-http-room-isolation-test`
-   `rtc-pr-stack-20260519T214027Z-tested-pr03-revision-restore-crdt-reset`
-   `rtc-pr-stack-20260519T214027Z-tested-pr04-crdt-save-meta-idempotence`
-   `rtc-pr-stack-20260519T214027Z-tested-pr05a-entity-reference-normalization`
-   `rtc-pr-stack-20260519T214027Z-tested-pr05b-parser-rich-text-equivalence`
-   `rtc-pr-stack-20260519T214027Z-tested-pr05c-preserve-whitespace-linebreak-equivalence`
-   `rtc-pr-stack-20260519T214027Z-tested-pr05d-semicolonless-entity-equivalence`
-   `rtc-pr-stack-20260519T214027Z-tested-pr06a-empty-crdt-block-save-guard`
-   `rtc-pr-stack-20260519T214027Z-tested-pr06b-stale-raw-save-payload-repair`
-   `rtc-pr-stack-20260519T214027Z-tested-pr06c-save-projection-content-guard`
-   `rtc-pr-stack-20260519T214027Z-tested-pr06d-persisted-empty-content-guard`
-   `rtc-pr-stack-20260519T214027Z-tested-sidecar-pr06e-malformed-save-payload-sidecar`

Local audit notes and tmux state show that the full merge candidate
`rtc-pr-stack-20260519T214027Z-tested-merge-candidate-v3` failed a focused
realistic list-item ordering gate. The current practical use of Jetstream2 is
therefore not just broad fuzzing; it is also narrowing which cumulative branch
introduced the regression and which prefix is safe to send to maintainers.

After that failure, follow-up refs were prepared for the PR06 save-path range:

-   `rtc-pr-stack-20260519T214027Z-tested-pr06b-fix-list-order-regression`
-   `rtc-pr-stack-20260519T214027Z-tested-pr06c-fix-list-order-regression`
-   `rtc-pr-stack-20260519T214027Z-tested-pr06d-fix-list-order-regression`
-   `rtc-pr-stack-20260519T214027Z-tested-sidecar-pr06e-fix-list-order-regression`

The fixed PR06 refs have focused list-item gate signal that the earlier PR06
refs did not have. The recomposed exact candidate still needs exact-head
validation before it changes the maintainer recommendation. Do not treat the
fixed PR06 refs as equivalent to the earlier failed PR06 refs merely because
their branch names are similar.

The high-signal process rule is:

> Any branch touching CRDT block reconciliation, save projection, persisted CRDT
> content, or transport storage must pass its owned unit/PHP tests and the
> realistic collaboration gate on the exact branch head or exact merge-candidate
> SHA before it is presented as ready.

## Coverage Map

| Area                             | What is covered                                                                                                                                                                                         | Main files                                                                                                                                                                                                             | Main gaps                                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Browser RTC fuzzing              | Real editor sessions, two or more users, HTTP polling, WebSocket wrapper, save/reload, revision restore, parser stress, block movement, common blocks, media-backed blocks, and transient sync failures | `test/e2e/specs/editor/collaboration/collaboration-fuzz.spec.ts`, `test/e2e/specs/editor/collaboration/websocket/collaboration-fuzz.spec.ts`, `bin/rtc-browser-fuzz-runner.mjs`, `bin/rtc-browser-fuzz-supervisor.mjs` | Not exhaustive over all blocks, plugins, browsers, mobile, site editor flows, or real production network failures                       |
| CRDT block model fuzzing         | Two Yjs replicas, randomized block tree edits, duplicate delivery, stale local snapshots after acknowledged remote updates                                                                              | `packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts`                                                                                                                                                           | No full block-library semantics, no shrinker, limited client/session model, and only selected stale-snapshot patterns                   |
| Rich-text merge fuzzing          | Formatted paragraph updates, cursor-guided HTML deltas, ambiguous offset placement                                                                                                                      | `packages/core-data/src/utils/test/rtc-rich-text-offset-space.test.js`                                                                                                                                                 | Narrowly focused on offset-space/rich-text placement, not full editor input behavior                                                    |
| PHP/server storage tests         | Room permissions, room isolation, awareness, compaction, cursor race cases, malformed update handling                                                                                                   | `phpunit/tests/collaboration/wpHttpPollingSyncServer.php`, `phpunit/tests/collaboration/wpSyncPostMetaStorage.php`                                                                                                     | Mostly targeted cases, not a broad randomized REST fuzzer; high-backlog compaction windows need extra targeted coverage                 |
| Long-running Jetstream2 campaign | Parallel lanes, seed replay, summaries, analysis tiers, watchdogs, novelty-guided group selection, disk/resource controls                                                                               | `bin/rtc-browser-fuzz-launcher.mjs`, `bin/rtc-browser-fuzz-supervisor.mjs`, `bin/rtc-browser-fuzz-triage-watcher.mjs`, `bin/rtc-browser-fuzz-analysis-tier.mjs`, `bin/rtc-browser-fuzz-novelty-monitor.mjs`            | Results are file/artifact based, and Jetstream2 resource contention can create infra noise if too many browser-heavy gates run together |

## Browser Fuzzing

The browser fuzzer drives the real editor in Chromium against `wp-env`. The
WebSocket spec is a wrapper around the same core fuzz spec, so the same action
grammar can run against HTTP polling or the test WebSocket provider.

### Sessions and transports

Covered:

-   HTTP polling transport.
-   WebSocket test-provider transport.
-   Distinct-user collaboration and same-user mode.
-   Two-user sessions by default.
-   Three-user and late-join profiles.
-   Reload and reconnect-style lifecycle profiles.
-   Save checkpoints, autosave checkpoints, final persistence checks, and
    revision restore probes.

Partially covered:

-   Auth/permission failures are modeled in focused profiles, but broad role
    churn and real nonce/session expiry workflows are not heavily explored.
-   Large-document behavior exists as a profile, but this is not a replacement
    for performance/load testing.

Not covered well:

-   Real browser diversity beyond Chromium.
-   Mobile and touch editing.
-   Real proxy/load-balancer/WebSocket deployment failures.
-   Cross-site, multisite, or uncommon permalink/auth configurations.

### Action profiles

The fuzzer has several profile modes, each shifting probability toward a
different risk area:

-   `full`: mixed block, title, structure, table, parser, and persistence
    actions.
-   `persistence` and `persistence-no-title`: save/reload/title/content
    persistence.
-   `revision-persistence`: save/autosave/revision restore behavior.
-   `structure`: nested groups, moves, deletes, tables, and concurrent
    paragraphs.
-   `session-lifecycle`, `three-user-late-join`, and
    `multi-reload-lifecycle`: join/rejoin/reload timing.
-   `common-blocks`: buttons, image, code, columns, and preformatted content.
-   `block-gauntlet`: details, cover, media-text, gallery, file, social links,
    spacer, separator, verse, HTML, shortcode, more, quote, and related
    attributes.
-   `parser-serialization` and `parser-transform`: parser stress, reparse, HTML
    entities, deprecated/equivalent block shapes, validation fixes, and
    freeform content.
-   `real-user-editing`: UI-level typing, formatting, paste, link, list indent,
    cut/copy, composition, toolbar formatting, undo/redo, and table cell edits.
-   `async-server-blocks`: blocks that depend on server-rendered or entity-backed
    data, such as embed, latest posts, query, search, calendar, categories,
    template part, and reusable block references.
-   `media-cross-entity`: media upload, image/gallery/file/media-text, and
    reusable-block entity interactions.
-   `permissions-auth-locks`: auth and permission failure surfaces.
-   `long-session-large-doc`: larger document shape coverage.

Maintainer takeaway: if a PR changes a specific surface, the PR report should
name the profile that covers it. If no profile obviously covers it, maintainers
should ask for either a new profile or a focused deterministic gate.

### Browser actions

Covered action classes include:

-   paragraph insertion, append, edit, and deletion;
-   title edits;
-   heading insertion;
-   top-level block moves;
-   concurrent paragraphs from multiple users;
-   rich-text pair edits and formatted paragraph cursor edits;
-   table body array updates, including row insert/delete/update variants;
-   nested group insertion, nested paragraph edits, nested delete, and move into
    group;
-   common block insertion and attribute edits;
-   broader block-gauntlet insertion and attribute edits;
-   parser reparse and parser-stress append actions;
-   UI-driven typing, paste, link, list indent, composition, toolbar formatting,
    undo/redo, and table cell edits;
-   server-backed block insertion and media/reusable entity actions.

Many of the broad-profile actions use `wp.data` to create or mutate editor
state directly. That is useful for reaching many document states quickly, but it
is not the same as proving every toolbar, inserter, drag, keyboard, or selection
path. The `real-user-editing` profile provides narrower Chromium UI coverage
for selected typing and formatting flows.

Not covered well:

-   arbitrary third-party blocks and plugin block supports;
-   all possible core block transforms;
-   every inserter/sidebar/toolbar interaction path;
-   complex drag-and-drop pointer paths, especially on touch devices;
-   custom post types with unusual REST schemas;
-   meta boxes and classic-editor interop beyond targeted collaboration gates.

### Faults and lifecycle perturbations

Covered:

-   random `wp-sync` request delay;
-   retryable `wp-sync` failures such as `429`, `500`, and `503`;
-   focused auth failures such as `401` and `403`;
-   reload during a fuzz seed;
-   delayed/late collaborator join;
-   autosave, save, final persistence, and revision restore checkpoints.

Not covered well:

-   true packet duplication/reordering at the browser network layer;
-   server restarts during active editing;
-   database failover or object-cache inconsistency;
-   long offline edits followed by reconnect;
-   background/foreground tab scheduling as a primary fuzz dimension;
-   multiple browsers reconnecting after independent partitions.

Those belong either in a deterministic sync-manager model or in a separate
environment-level fault campaign. Browser route interception is useful, but it
is not a full distributed-systems scheduler.

### Browser oracles

The browser fuzzer checks durable state rather than only UI text:

-   normalized editor blocks converge across participants;
-   title converges;
-   persisted `_crdt_document` is present where expected;
-   save/reload/revision restore paths keep expected content;
-   operation-ledger witnesses survive later convergence, reload, save, and
    revision phases when the profile is low-noise enough to make that assertion
    meaningful;
-   invariant snapshots record block types, depth, malformed blocks, duplicate
    client IDs, serialization stability, and content hashes;
-   behavioral coverage records action, fault, lifecycle, block, and invariant
    summaries for triage and novelty selection.

The important limitation is that convergence is not the same as correctness. A
bug that makes all peers converge on the same wrong content may need operation
witnesses, final persistence checks, or a focused repro to catch it.

## CRDT and Rich-Text Model Fuzzing

The fastest implemented model fuzzer is
`packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts`.

It covers:

-   two Yjs documents with randomized local edits;
-   randomized delivery order;
-   duplicate replay of updates;
-   paragraphs, images, groups, rich-text pair blocks, and nested rich-text test
    blocks;
-   insert, edit, move, and delete operations;
-   local-only image attributes such as `blob`;
-   stale local snapshots applied after a remote update was already acknowledged.

The stale-snapshot scenarios are especially relevant to the current PR set. They
cover:

-   rich-text sibling update and delete;
-   object-query add, update, and delete;
-   query-array cell update, nested object update, append, prepend, and delete;
-   top-level block append and delete.

The rich-text offset-space test covers:

-   preserving formatted paragraph content through `mergeCrdtBlocks`;
-   placing cursor-guided inserts against the updated HTML, not the old HTML;
-   randomized formatted rich-text updates;
-   randomized cursor-guided deltas where the old and new HTML cursor index can
    differ.

Gaps:

-   The model block vocabulary is intentionally small.
-   It does not model every core block schema or third-party block.
-   It does not exercise real browser selection APIs or DOM input events.
-   It does not provide shrinking beyond the seed/trace output.
-   It does not fully model multi-client awareness, undo history, autosave, or
    REST persistence.

Maintainer takeaway: model fuzz failures are high-quality evidence for merge
logic, but passing model fuzz is not enough for branches that alter save,
reload, revision, or UI-driven behavior.

## PHP and REST Storage Coverage

The PHP tests cover many important server-side RTC invariants:

-   room format and permission validation;
-   per-room permission failures;
-   multiple rooms in a single request;
-   isolation between post rooms;
-   awareness storage, update, and ownership;
-   cursor monotonicity and update retrieval;
-   malformed update JSON handling;
-   duplicate awareness row coalescing;
-   cursor reads that should not skip updates inserted during a fetch window;
-   compaction that should not delete an update inserted during the delete.

The active PR stack includes transport/storage changes where these tests matter:

-   PR01: generated HTTP polling update size.
-   PR02: bounded HTTP polling storage reads.
-   PR02A sidecar: auxiliary room isolation.

These PHP tests are targeted deterministic tests, not a randomized or
property-based REST/server fuzzer.

Gaps maintainers should consider asking about:

-   A stale-compaction case where a newer compaction exists beyond the bounded
    read window.
-   High-backlog room reads with more than the storage read window size.
-   Mixed valid/forbidden rooms with updates queued before and after a
    permission failure.
-   Storage behavior under persistent object cache.
-   Multi-user role changes during an active room.
-   Taxonomy, comment, template, reusable-block, and custom post type rooms
    under the same randomized room-batch pressure as posts.

## Jetstream2 Campaign and Triage Coverage

Jetstream2 is doing two related jobs:

1. Wide exploration through long-running browser fuzz lanes.
2. Exact-ref validation and regression isolation for the maintainer PR set.

The campaign tooling covers:

-   supervised groups for HTTP, HTTP persistence, and WebSocket runs;
-   parallel lanes with disjoint seed ranges;
-   per-seed replay manifests and summary records;
-   retry/recheck logic before classifying failures;
-   first-level and second-level Codex analysis tiers;
-   browser-heavy triage watcher for likely-real candidates;
-   novelty monitor that enables focused groups when coverage is missing;
-   watchdog repair and disk cleanup for stale `wp-env`/Docker resources.

Current Jetstream2 caveat: PR-focused validation and broad fuzzing can compete
for the same machine. The local offload loop is meant to snapshot Jetstream2
state, run cheap local analysis, and avoid adding browser-heavy work when
Jetstream2 is already saturated.

The useful artifacts are files, not a central database:

-   lane `summary.ndjson`;
-   lane `events.ndjson`;
-   `replay.json`;
-   behavioral coverage NDJSON;
-   triage watcher state and signature directories;
-   analysis-tier result JSON and Markdown handoffs;
-   supervisor and watchdog state JSON.

This matters for maintainers because every PR report should include the exact
branch SHA and the exact gate artifacts. A summary like "the stack passed fuzz"
is too weak if the branch is cumulative or if the exact merge candidate differs
from the gated ref.

## PR-Set Review Guidance

### Safe-prefix thinking

Local audits around the current run mostly agree that the full merge candidate
should not be sent as-is after the list-item regression. The conservative
candidate prefix is the transport/storage/meta group through PR04, with PR02A
as a test sidecar if it passes its exact gates:

-   PR01 generated HTTP polling update size.
-   PR02 bounded storage reads.
-   PR02A HTTP room isolation test sidecar.
-   PR03 revision restore CRDT meta reset.
-   PR04 persisted CRDT save metadata idempotence.

PR05 and PR06 branches should remain gated until the list-item ordering
regression is isolated and the exact recomposed cumulative candidate passes the
focused gate.

### High-risk branch classes

Require the strongest gates for branches that touch:

-   `packages/core-data/src/utils/crdt-blocks.ts`;
-   rich-text equivalence, semantic identity, or block rebasing;
-   `packages/core-data/src/entities.js` save projection or `prePersistPostType`;
-   persisted `_crdt_document` load/save/recovery;
-   HTTP storage read windows or compaction semantics.

For these branches, targeted unit/PHP tests are necessary but not sufficient.
They also need the realistic collaboration list-item gate and, where relevant,
save/reload/revision gates.

### Exact gates to keep asking for

Maintainers should ask each PR or stack report to state:

-   exact branch name and SHA;
-   dependency closure, because these refs are cumulative;
-   targeted unit/PHP command and result;
-   whether the focused list-item realistic gate ran;
-   whether the gate ran on the individual fixed ref, the recomposed candidate,
    or both;
-   whether the full browser fuzzer profile relevant to the PR ran;
-   whether HTTP, WebSocket, or both were covered;
-   whether the gate ran against the exact exported branch head or only an
    earlier local state;
-   where the `summary.ndjson`, `events.ndjson`, `replay.json`, and Playwright
    artifacts live.

## Suggested Missing Tests

These are the highest-value gaps for maintainers to suggest.

### List and nested structure regressions

Add focused model and browser tests for:

-   nested `core/list` / `core/list-item` concurrent reorders;
-   duplicate or near-duplicate list items;
-   list items that differ only by HTML entity spelling or equivalent rich-text
    markup;
-   moving a list item while another user edits a sibling item;
-   moving blocks into and out of groups/columns while saving and reloading.

This directly targets the current failed list-item gate and the PR05/PR06 risk
area.

### High-backlog transport and compaction

Add PHP/API tests for:

-   more than the bounded storage read window of updates after a cursor;
-   stale compaction where a newer compaction is beyond the first read window;
-   room isolation under high backlog and mixed room batches;
-   compaction plus concurrent writes across multiple clients.

This targets PR01/PR02 risk.

### Sync and polling state-machine fuzzing

Add a lower-level seeded fuzzer for:

-   `PollingManager` room registration and unregistration;
-   collaborator discovery gating;
-   visibility and background/foreground transitions;
-   retryable failure schedules;
-   forbidden-room isolation;
-   generated payload size limits and chunking;
-   room churn across primary and auxiliary rooms.

This should run below Playwright with mocked transport so it can explore
duplicate, delayed, stale, and reordered responses cheaply. The current checkout
has deterministic polling-manager tests, but no source-level
`polling-manager.fuzz` or `manager.fuzz` test.

### Save-payload correctness

Add tests that compare:

-   editor save payload;
-   serialized CRDT blocks;
-   latest server content;
-   content after reload.

Use cases:

-   correct editor payload but stale CRDT block order;
-   empty evaluated content but non-empty CRDT content;
-   malformed evaluated content that should be repaired;
-   valid changed content that must not be overwritten by CRDT repair.

This targets PR06A-PR06E risk.

### Parser and semantic-equivalence edge cases

Add model and browser tests for:

-   semicolonless entities that should and should not normalize;
-   preserve-whitespace blocks;
-   equivalent HTML that should be a no-op;
-   equivalent-looking list items where semantic identity is ambiguous;
-   deprecated block forms and validation-fix transforms inside collaboration.

This targets PR05A-PR05D risk.

### Wider product coverage

Ask for additional coverage if maintainers care about:

-   site editor entities, templates, template parts, and navigation menus;
-   custom post types and REST schemas;
-   meta boxes and classic editor interop;
-   publish/update workflows distinct from draft save and autosave;
-   document-size and collaboration-gating boundaries;
-   third-party blocks and block supports;
-   media uploads, attachment metadata, reusable blocks, and synced patterns;
-   persistent object cache;
-   multisite;
-   non-Chromium browsers;
-   mobile/touch editing;
-   production WebSocket deployment behavior.

The current fuzzing project is strongest on Gutenberg RTC correctness in the
post editor. It should not be presented as broad WordPress product coverage.

## Existing Documentation to Keep in Sync

Related docs:

-   `docs/explanations/architecture/real-time-collaboration-fuzzing.md`
-   `docs/explanations/architecture/real-time-collaboration-fuzzing-strategies.md`
-   `docs/explanations/architecture/real-time-collaboration-fuzzing-pipeline-runbook.md`
-   `docs/explanations/architecture/real-time-collaboration-fuzz-issues-handoff.md`
-   `docs/explanations/architecture/real-time-collaboration-agent-handoff-protocol.md`

One caveat: the strategy doc describes some planned lower-level fuzzers that are
not present in this checkout, such as `manager.fuzz.test.ts` and
`polling-manager.fuzz.test.ts`. When using this report for maintainer review,
prefer the actual file list in the current branch over planned architecture
notes.
