# Fuzzing Real-Time Collaboration

Gutenberg's real-time collaboration stack spans multiple layers:

-   CRDT transforms in `packages/core-data/src/utils/`.
-   Awareness state in `packages/core-data/src/awareness/`.
-   Sync orchestration in `packages/sync/src/manager.ts`.
-   HTTP polling transport in `packages/sync/src/providers/http-polling/`.
-   Persistence and permissions in `lib/compat/wordpress-7.0/`.
-   Editor behavior and collaboration gating in `packages/editor/` and `packages/edit-post/`.

The existing test suite already covers many named RTC scenarios, but most of that coverage is example-driven. Fuzzing should focus on the interleavings that are hard to enumerate ahead of time: concurrent edits, refresh and rejoin timing, autosave boundaries, selective transport failure, stale awareness state, and permission isolation across rooms and users.

This document describes how to fuzz real-time collaborative editing in Gutenberg without Antithesis, using the repository's existing Jest, Playwright, and `wp-env` tooling.

## Scope

The main RCE surfaces are:

-   CRDT merge and projection logic in `packages/core-data/src/utils/crdt.ts` and `crdt-blocks.ts`.
-   Persisted document reconciliation in `packages/sync/src/manager.ts`.
-   Polling, retries, compaction, and per-room queue behavior in `packages/sync/src/providers/http-polling/`.
-   Awareness propagation and cleanup in `packages/core-data/src/awareness/`.
-   Save and autosave integration in `lib/compat/wordpress-7.0/class-gutenberg-rest-autosaves-controller.php`.
-   Server-side room storage, cursor handling, and authorization in `class-wp-http-polling-sync-server.php` and `class-wp-sync-post-meta-storage.php`.
-   Collaboration gating for incompatible posts, including meta boxes and document-size limits.

The goal is not just "make random edits". The goal is to generate action sequences and failures that stress the boundaries between those layers while preserving deterministic reproduction of failures.

## Existing Coverage To Build On

Gutenberg already has strong RTC-specific tests that should serve as a seed corpus and oracle source:

-   `packages/core-data/src/utils/test/crdt.ts`
-   `packages/core-data/src/utils/test/crdt-blocks.ts`
-   `packages/sync/src/providers/http-polling/test/polling-manager.test.ts`
-   `packages/sync/src/test/manager.ts`
-   `test/e2e/specs/editor/collaboration/`

The browser suite already exercises persistence, refresh, presence, multibyte input, selection behavior, undo/redo, collaboration locks, and multi-user stress. That is useful, but it is still mostly scenario coverage. Fuzzing should reuse those helpers and fixtures, not replace them.

## Why Fuzzing Should Be Layered

Trying to do everything in Playwright will be slow, flaky, and shallow. The better approach is to split the problem by where the nondeterminism lives:

1. Pure model fuzzing for CRDT transforms and projections.
2. State-machine fuzzing for sync manager and HTTP polling behavior.
3. Browser-session fuzzing for true end-to-end convergence and UX gating.
4. Targeted PHP/API fuzzing for permission and storage invariants.

The lower layers can explore far more states per minute and are the right place to test out-of-order, duplicate, and missing updates. The browser layer should validate that the full editor remains correct under realistic user behavior and network disruption.

## Core Invariants

Every fuzz layer should assert a small set of durable properties:

-   **Convergence**: after the system becomes quiescent, all live peers expose the same logical document.
-   **Structural validity**: block trees remain well-formed; block order, nesting, and attributes are representable by the editor.
-   **Persistence round-trip**: after save, refresh, or rejoin, the persisted `_crdt_document` and the canonical post content reconcile to the same state.
-   **Selection sanity**: remote changes do not produce impossible caret or range positions.
-   **Awareness hygiene**: active collaborators appear exactly once, and stale collaborators disappear after disconnect or timeout.
-   **Authorization and isolation**: one room or post cannot observe or mutate another; a 403 for one room must not poison unrelated rooms.
-   **Retry and compaction safety**: ambiguous failures may trigger compaction, but they must not permanently diverge the document.
-   **Collaboration gating correctness**: incompatible posts should disable collaboration consistently; compatible posts should not be spuriously locked out.

## Input Model

The fuzzer should operate on an explicit action grammar instead of arbitrary DOM mutation.

### Document actions

-   Insert text into an existing rich-text block.
-   Delete a range from a paragraph, heading, list item, quote, or table cell.
-   Split or merge paragraphs.
-   Insert, delete, duplicate, or move blocks.
-   Reorder nested blocks, list items, and columns.
-   Toggle block attributes that affect serialization.
-   Undo and redo.
-   Save, autosave, publish, refresh, and reopen.

### Session actions

-   Join a second or third collaborator.
-   Close and reopen a tab.
-   Background and foreground a page.
-   Delay a participant before they discover other collaborators.
-   Race local edits with refresh, save, or reconnect.

### Fault actions

-   Slow down or temporarily disconnect a participant using Playwright network emulation.
-   Delay, fail, or abort selected `wp-sync` requests with Playwright route interception.
-   Return targeted HTTP errors such as 403, 429, or 5xx.
-   Duplicate or replay mocked transport responses in unit and state-machine layers.
-   Drop awareness updates or room updates in mocked polling responses.

Playwright can emulate latency, bandwidth limits, and offline mode for Chromium. It can also intercept `wp-sync` requests and inject delays or failures. That is enough for realistic browser faults, but not enough for exhaustive packet reordering. True duplicate and out-of-order response exploration belongs in the mocked transport layer, where scheduling is deterministic.

## Seed Corpus

The first fuzz cases should start from content and scenarios that are already known to matter:

-   The large mixed-block document in `collaboration-stress.spec.ts`.
-   The complex block sequences in `collaboration-block-gauntlet.spec.ts`.
-   Multibyte and emoji cases in `collaboration-multibyte.spec.ts`.
-   Selection-sensitive cases in `collaboration-selection.spec.ts`.
-   Persistence and refresh cases in `collaboration-persistence.spec.ts` and `collaboration-refresh.spec.ts`.
-   Presence and awareness cases in `collaboration-presence.spec.ts`.
-   Meta-box and document-size collaboration gating specs.

Additional seed content should emphasize:

-   Deeply nested groups and lists.
-   Tables with edits in multiple cells.
-   Columns and quote blocks.
-   Repeated block moves across long documents.
-   Concurrent edits in the same paragraph.
-   Mixed ASCII and multibyte content, including surrogate pairs and emoji.

## Recommended Fuzzing Layers

### 1. Model Fuzzing For CRDT Helpers

Start with the fastest layer: randomized block trees and edit traces against the CRDT helper functions.

Primary targets:

-   `packages/core-data/src/utils/crdt.ts`
-   `packages/core-data/src/utils/crdt-blocks.ts`
-   `packages/core-data/src/utils/crdt-text.ts`

Recommended checks:

-   Applying a random edit trace and then projecting back from the CRDT document yields a stable logical document.
-   Reapplying the same logical state does not introduce duplicate blocks or drift.
-   Local-only attributes remain excluded from synchronized state.
-   Nested block edits preserve block identity and ordering.
-   Selection-shifting logic never produces negative or out-of-bounds positions.

Implementation notes:

-   Add dedicated fuzz suites near the existing Jest tests, for example `crdt.fuzz.ts` and `crdt-blocks.fuzz.ts`.
-   Prefer adding a shrinking-capable property-based library such as `fast-check` for this layer.
-   If adding a dependency is undesirable, use a small seeded generator and always print the failing seed and action trace.

`fast-check` is not currently in the repository, so adding it should be an explicit decision. The main benefit is shrinking. Without shrinking, failures in this layer will be harder to diagnose.

### 2. State-Machine Fuzzing For Sync And Polling

The next layer should fuzz scheduling and transport semantics with the real sync code but mocked network I/O.

Primary targets:

-   `packages/sync/src/providers/http-polling/test/polling-manager.test.ts`
-   `packages/sync/src/test/manager.ts`

Model the system as a deterministic scheduler over actions such as:

-   local document update
-   local awareness update
-   outgoing poll
-   delayed poll completion
-   duplicate response
-   stale cursor response
-   per-room 403
-   ambiguous failure that should trigger compaction
-   visibility change
-   collaborator join or leave

Recommended checks:

-   Non-primary room queues stay paused until collaborator discovery rules are satisfied.
-   A room that receives 403 is isolated without breaking healthy rooms.
-   Compaction after ambiguous failure preserves convergence.
-   Duplicate or stale responses do not reapply already-consumed updates incorrectly.
-   Room naming edge cases do not cause prefix collisions or state leakage.
-   Persisted-document reconciliation after refresh or save never loses canonical edits.

This layer should do most of the heavy lifting for transport faults because it can explicitly replay and reorder responses in ways the browser cannot.

### 3. Browser-Session Fuzzing With Playwright

Once the lower layers are stable, add a browser-level fuzz runner that reuses the existing collaboration fixtures.

Primary entry points already exist:

-   `test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts`
-   `packages/e2e-test-utils-playwright/src/page-utils/emulate-network-conditions.ts`

Recommended shape:

-   Create a deterministic action runner under `test/e2e/specs/editor/collaboration/fixtures/`.
-   Start with two collaborators; add a third only after the runner is stable.
-   Generate a bounded sequence of actions from a seed.
-   After each step, or after a short quiescence window, compare normalized editor state across participants.
-   Periodically save, refresh, and reopen the post to validate persistence.

Useful browser-level assertions:

-   `editor.getBlocks()` normalizes to the same block tree on all pages.
-   `getCrdtDocument()` remains present and consistent after save and refresh.
-   Collaborator presence reflects live sessions after disconnects.
-   Collaboration-disabled states produce the expected lock behavior instead of partial sync.

Useful browser-level fault injection:

-   `pageUtils.emulateNetworkConditions( 'Slow 3G' )`
-   targeted `page.route()` or `browserContext.route()` interception for `wp-sync`
-   temporary offline mode for one participant
-   refresh during in-flight edits
-   delayed join and rejoin ordering

This layer should not try to prove every transport property. Its job is to validate that the editor, sync stack, and server still converge when exercised through real user surfaces.

### 4. Targeted PHP And REST Fuzzing

The server-side collaboration code has a smaller state space but still benefits from randomized requests.

Primary targets:

-   `lib/compat/wordpress-7.0/class-wp-http-polling-sync-server.php`
-   `lib/compat/wordpress-7.0/class-wp-sync-post-meta-storage.php`
-   `lib/compat/wordpress-7.0/class-gutenberg-rest-autosaves-controller.php`

Recommended request generation:

-   random room names and room combinations
-   mixed valid and invalid cursors
-   mismatched client IDs
-   malformed awareness payloads
-   save and autosave races around the same post
-   users with different roles hitting the same and different posts

Recommended checks:

-   cursors are monotonic per room
-   unauthorized users cannot read or write another post's room
-   client ID ownership is enforced
-   autosave and persisted CRDT document state do not diverge after refresh

This layer can be implemented either as targeted PHPUnit coverage around the relevant classes or as REST-level tests that drive the endpoints directly. The main point is to fuzz request structure and permission boundaries without going through the browser every time.

## Reproduction And Minimization

Fuzzing is only useful if failures are easy to replay.

Each failing run should record:

-   seed
-   generated action trace
-   initial content seed
-   participant and room metadata
-   intercepted `wp-sync` request and response log
-   final editor state per participant
-   persisted post content and `_crdt_document`

For Jest-based layers, shrinking should be automatic if a property-based library is used. For browser runs, start with seed replay and a simple reducer that removes chunks of the action trace until the failure no longer reproduces.

## Suggested Rollout

### Phase 1: fast local fuzzing

-   Add model fuzzing for `crdt.ts` and `crdt-blocks.ts`.
-   Add sync and polling state-machine fuzzing with mocked transport.
-   Run these in CI with fixed seeds and a small iteration budget.

### Phase 2: seeded browser fuzzing

-   Add one Playwright RTC fuzz spec in Chromium only.
-   Run a small number of seeds in CI.
-   Store traces and action logs for failures.

### Phase 3: broader nightly exploration

-   Increase iteration counts for model and transport fuzzers.
-   Run longer browser fuzz jobs nightly or on demand.
-   Expand from two to three participants once failures are reproducible and triageable.

### Phase 4: hardening

-   Promote minimized failures into explicit regression tests.
-   Refresh the seed corpus as new bug classes are discovered.
-   Periodically rebalance between unit, transport, and browser fuzzing to keep runtime manageable.

## Practical Recommendations

-   Start at the CRDT and transport layers. They will find the highest volume of real bugs for the least runtime.
-   Keep browser fuzzing deterministic and bounded. Long random browser sessions without good logs are expensive and low-signal.
-   Treat the current RTC E2E specs as seed generators and regression oracles.
-   Separate PR-safe fuzzing from deeper nightly fuzzing.
-   Prefer a small number of durable invariants over many brittle UI assertions.

The most important design choice is to make browser fuzzing the last layer, not the first. The hard bugs in RCE are usually interleaving bugs. Those are easier to explore, reproduce, and shrink in deterministic model and transport tests than in a full browser stack.
