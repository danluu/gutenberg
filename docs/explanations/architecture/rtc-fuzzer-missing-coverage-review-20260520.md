# RTC Fuzzer Missing Coverage Review

Date: 2026-05-20

This report reviews missing coverage in the RTC fuzzing and validation setup after
the fixed branch `rtc-pr-stack-20260519T214027Z-validated-no-harness` still
failed a maintainer-facing benchmark row. The review used three local tmux
rounds of independent Codex analysis: an initial six-way review, a six-way
critique pass over all first-round outputs, and a repeated six-way final pass
over the prior two rounds. This document is the synthesis, not a transcript.

The important conclusion is simple: the missed `large-post-three-user-http`
failure is a real fuzzer coverage failure, not just a missing benchmark row.
The fuzzer can touch many of the ingredients separately, but the validation
process did not require the product-shaped combination that failed.

## Hard Evidence

The local benchmark rerun recorded:

- base: `large-post-three-user-http` had `0/2` failures;
- fixed branch: `large-post-three-user-http` had `2/2` failures;
- the fixed branch still failed to propagate `Final paragraph from Editor` to
  at least one participant within the convergence window.

See the [local benchmark report](rtc-local-benchmark-results-20260519.md).

The deterministic stress test already describes the product shape that was
missed: three users, a roughly 5000-word mixed-block post, save, refresh,
concurrent text editing, toolbar block moves, final concurrent UI-typed
paragraphs from all users, and publish. See
[`collaboration-stress.spec.ts`](../../../test/e2e/specs/editor/collaboration/collaboration-stress.spec.ts).

That stress test is necessary, but it is still not a complete persistence gate:
it checks the final markers in live editors, then saves and calls
`publishPost()`. It does not currently reload or fetch REST raw content after
publish and assert that the final markers and `status=publish` survived.

The browser fuzzer itself is also too weak as a promotion claim. In the checked
snapshot it selects a profile, picks one actor/action per step, waits for
convergence, and ends with broad non-empty title/block/CRDT checks. See
[`collaboration-fuzz.spec.ts`](../../../test/e2e/specs/editor/collaboration/collaboration-fuzz.spec.ts).
Current local Jetstream2 harness work has added more profile knobs, but the same
problem remains: third user, large document, HTTP polling, real UI actions,
save/reload, publish/update, and hard persistence witnesses must be composed in
one required gate.

Convergence is not correctness. Peers can converge on the same wrong content.
Any branch that changes RTC merge, save, projection, transport, or persistence
must prove operation survival with hard witnesses, not only normalized block
equality.

## Missing Scenario Families

### P0: Large Mixed Post, Three HTTP Users, Published Witnesses

This is the observed miss.

Required deterministic gate:

- run the existing large-post stress flow over HTTP polling on the exact branch
  head;
- keep the three users and stress-sized mixed document;
- include save, reload/refresh, toolbar moves, same-paragraph editing, final
  UI-typed markers from every user, final save, and publish;
- after publish, fetch REST `context=edit`, fresh-open or reload participants,
  and assert `status=publish`, all final markers, title, serialized content,
  and CRDT document consistency.

Fuzzer expansion:

- add a `large-post-three-user-http-lifecycle` profile;
- force or heavily weight three users, HTTP polling, a stress-sized mixed
  corpus, save/reload milestones, toolbar moves, same-block edits, final
  UI-typed witnesses, publish/update, operation ledger `fail`, and final
  persistence `fail`.

### P0: Save Payload Correctness

The fuzzer should not treat editor convergence as a substitute for persistence
correctness. A branch can preserve live editor state but save stale, empty, or
malformed content.

Required deterministic gate:

- compare live editor blocks, serialized save payload, REST raw content,
  `_crdt_document`, and content after reload;
- run this across draft save, publish, and published update;
- assert that no repair path overwrites valid changed content, and no stale CRDT
  state overwrites user-visible content.

Fuzzer expansion:

- add a `save-payload-oracle` mode that samples live editor state, serialized
  block output, REST raw content, CRDT projection, and fresh reload state at
  each save/publish/update milestone.

### P0: Same-User Stale Tabs And Natural Draft Reopen

The normal product has multiple tabs for the same account, auto-drafts, list
reopens, autosaves, stale local state, and reloads. These are basic RTC
workflows, not obscure edge cases.

Relevant deterministic tests already exist in the local RTC suite, including
same-user title/content preservation and stale auto-draft reopen flows.

Required deterministic gate:

- same account in two or three tabs;
- title/body edits from stale and fresh tabs;
- autosave and manual save;
- close/reload/reopen from the Posts list, not only direct REST-created drafts;
- final REST and fresh-open assertions for title, body, and CRDT document.

Fuzzer expansion:

- add a `same-user-stale-draft-http` profile with `COLLABORATOR_MODE=same-user`,
  UI-created drafts, Posts-list open, stale blank/title/body tabs, save/autosave
  ordering, reload/close/reopen churn, and hard persisted witnesses.

### P1: HTTP Polling State Machine, Backlog, And Reconnect

HTTP polling is not just "a transport". It has room registration, collaborator
discovery, awareness, request batching, retryable failures, forbidden-room
handling, high backlog, compaction, body-size limits, visibility/background
state, and reconnect behavior.

The strategy docs mention source-level sync fuzzers such as
`manager.fuzz.test.ts` and `polling-manager.fuzz.test.ts`, but those should not
be counted as implemented coverage unless they exist and ran. Deterministic
polling-manager tests are useful, but they are not a seeded state-machine
fuzzer.

Required deterministic gate:

- exactly three browser clients over HTTP, because the missed row sits on a
  three-client collaboration boundary;
- queued updates before and after discovery;
- one retryable failed poll;
- reload/rejoin while updates are queued;
- high backlog beyond the read window;
- compaction plus concurrent writes;
- one valid room and one forbidden room in the same schedule, proving the
  forbidden room does not poison healthy rooms.

Fuzzer expansion:

- implement `polling-manager.fuzz.test.ts` around registration/unregistration,
  discovery gating, visibility/background transitions, retry schedules, payload
  chunking, room churn, high backlog, compaction, and delayed/duplicate/reordered
  responses.

### P1: UI-Authentic Multi-Actor Editing

Programmatic `wp.data` mutations are useful for reach, but they do not prove the
real editor UI path. The missed stress row involved user-facing typing and
toolbar interactions.

Required deterministic gate:

- two or three users type into the same paragraph or same title field;
- remote edits land between local action, undo, redo, save, and reload;
- list/table/columns/group moves happen through real UI controls;
- final assertions prove each user's intended operation survived and undo/redo
  only affected the local user's operation.

Fuzzer expansion:

- add multi-actor UI windows instead of only one actor/action per fuzz step;
- add real UI variants for list moves, table cell typing/row insertion,
  columns/group moves, media insertion, and keyboard undo/redo;
- require every marker-producing UI action to return operation witnesses.

### P1: Notes, Presence, Selection, And Cursor State

RTC product correctness includes visible collaboration signals. Notes, presence,
cursor overlays, selection ranges, and stale collaborator cleanup are not covered
by title/block convergence.

Required deterministic gate:

- add/reply/resolve a note while the target block is moved or edited;
- reload or close one participant;
- assert the note/thread and target relationship survive;
- assert presence list, cursor position, selection range, and stale participant
  cleanup under join/reload/leave churn.

Fuzzer expansion:

- add an `awareness-notes` or `collaboration-ui-signals` profile that randomizes
  note operations, cursor movement, selection ranges, formatted text boundaries,
  participant close/rejoin, and stale presence cleanup.

### P2 Unless Claimed In Scope

These should not be represented as covered unless a PR specifically runs gates
for them:

- excerpt and scalar post fields beyond title/content;
- true Author/Contributor capability paths and role changes during a session;
- media library UI, attachment metadata, reusable blocks, and synced patterns;
- code editor/raw HTML collaboration;
- custom post types, pages, site-editor entities, template parts, navigation,
  taxonomy/comment rooms, and unusual REST schemas;
- mobile/touch, non-Chromium browsers, multisite, persistent object cache, and
  production WebSocket/proxy behavior.

## Misleading Coverage Claims To Avoid

- "The branch passed fuzzing" is meaningless unless the report names the exact
  branch SHA, transport, profile, env, seed set, and oracle modes.
- "Large documents are covered" is not enough unless the run also includes the
  user count, transport, lifecycle, UI action, and persistence axes relevant to
  the PR.
- "Publish is covered" is not enough if the test only calls `publishPost()`
  without REST and fresh-open verification after publish.
- "Convergence passed" is not enough unless operation witnesses and persistence
  oracles ran in failing mode.
- "UI coverage" is not enough when the action path uses direct `wp.data`
  mutations.
- Planned fuzzers in strategy docs are not evidence. Only present source files
  and run artifacts count.

## Required Promotion Matrix

For RTC branches that touch merge, save, projection, transport, storage, or
presence/session behavior, maintainers should require at least:

| Gate | Required dimensions |
| --- | --- |
| Large-post HTTP stress | 3 users, HTTP, large mixed post, save, reload, UI moves, final UI markers, publish, REST/fresh-open witnesses |
| Save payload | live blocks, serialized payload, REST raw content, CRDT document, reload state across save/publish/update |
| Same-user stale draft | same account, 2-3 tabs, auto-draft/list reopen, stale title/body, autosave/save/reload |
| HTTP polling state machine | 3 clients, queued updates, retry, reload/rejoin, high backlog, compaction, forbidden-room isolation |
| UI ownership | same-block/title typing, keyboard undo/redo, real list/table/columns moves, save/reload witnesses |
| Collaboration signals | notes, presence, cursor, selection, participant leave/rejoin cleanup |

Passing lower-level model or unit fuzzers should not replace these gates. Passing
these gates also should not be marketed as broad WordPress coverage; it is RTC
post-editor coverage unless additional product surfaces are explicitly gated.

## Questions For Maintainers

- Did the exact branch head pass the extended large-post three-user HTTP gate
  after publish, REST fetch, and fresh open?
- Which artifact proves the combined profile, not separate "large doc",
  "three user", "HTTP", and "persistence" claims?
- Were operation ledger and final persistence both in `fail` mode?
- Which actions are still witnessless?
- Are same-user stale tabs and natural auto-draft/list reopen in scope for the
  fix claim?
- Are notes, presence, selection, excerpt/scalars, media UI, roles,
  code-editor/raw HTML, CPT/site-editor entities, and offline reconnect covered
  or explicit non-goals?
- Are claimed lower-level fuzzers actually present and run, or still only
  architecture notes?
