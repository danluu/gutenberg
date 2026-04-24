# Real-Time Collaboration Fuzzing Strategies

Gutenberg's real-time collaboration fuzzing is intentionally layered. The lower layers fuzz pure data structures and scheduling rules, where thousands of interleavings are cheap to explore. The upper layers fuzz the real editor in Chromium, where the state space is smaller but the coverage is closer to what users actually do.

This document describes the fuzzers that are implemented today, what each one fuzzes, and how each layer decides whether a run passed or failed.

## Why There Are Multiple Layers

One browser-only fuzzer would be too slow and too opaque. The current setup splits the problem by where nondeterminism lives:

-   The CRDT helpers fuzz merge logic and projections without any browser or transport noise.
-   The sync-layer fuzzers fuzz scheduling, persistence, and room-isolation behavior with mocked transport.
-   The browser fuzzer fuzzes the full editor, real network requests, save/reload behavior, and cross-user convergence.
-   The PHP randomized tests fuzz server-side room isolation, cursors, and storage behavior.
-   The long-running browser runner is a campaign layer on top of the browser fuzzer: it keeps exploring seeds, reruns failures, and triages them.

Each higher layer is slower, but it also validates a larger slice of the stack.

## Shared Strategy

Across layers, the fuzzers use the same core approach:

-   They are seeded. A failing seed can be rerun exactly.
-   They use bounded action grammars instead of unconstrained random mutation.
-   They inject the kinds of faults that matter for collaboration: reordering, duplicate delivery, retries, delayed sync, save/reload boundaries, and room-level permission failures.
-   They check durable invariants instead of incidental UI details.

The main invariants are:

-   **Convergence**: replicas settle on the same logical document.
-   **Isolation**: one entity or room does not leak into another.
-   **Persistence**: saved `_crdt_document` state matches the logical editor state.
-   **Idempotence**: replaying the same update does not corrupt state.
-   **Structural validity**: block trees remain valid and local-only data stays local.

## Layer 1: Pure CRDT And Rich-Text Model Fuzzers

These fuzzers live in `packages/core-data/src/utils/test/`. They run entirely in-process, mostly against `Y.Doc` and helper functions. This is the fastest layer.

### `crdt.fuzz.test.ts`

This fuzzer targets scalar post fields synchronized through the CRDT helpers: `title`, `content`, and `excerpt`.

What it fuzzes:

-   Random text edits to the synchronized fields.
-   Delivery order of local updates between two replicas.
-   Duplicate replay of already-delivered updates.

How it works:

-   It creates two `Y.Doc` replicas, `docA` and `docB`.
-   `docA` is initialized with a starting post state, then synced into `docB`.
-   Each step picks one replica and one field.
-   The new field value is produced by a small mutation grammar: `insert`, `delete`, or `replace`.
-   Inserted tokens are short generated strings such as `alpha-123`, `emoji-456`, sometimes with accented characters like `é`.
-   Local `updateV2` events are captured into a pending queue instead of being applied immediately.
-   The queue is flushed in random order, and some updates are replayed a second time.

The oracle:

-   After the pending queue is drained, both replicas must expose the same values for all synchronized fields.
-   The failing seed throws with the seed number and a step trace.

### `crdt-blocks.fuzz.test.ts`

This fuzzer targets block-tree synchronization through `mergeCrdtBlocks`.

What it fuzzes:

-   Random block-tree edits on two replicas.
-   Structural operations like insertion, deletion, and movement.
-   Local-only attribute filtering.
-   Duplicate delivery of CRDT updates.

How it works:

-   It builds randomized trees from a small block vocabulary: `core/paragraph`, `core/image`, and `core/group`.
-   The mutation grammar includes:
    -   insert paragraph
    -   insert image
    -   insert group
    -   edit paragraph content
    -   move a top-level block
    -   delete a top-level block
-   Image blocks intentionally include a local-only `blob` attribute.
-   Like the scalar CRDT fuzzer, updates are captured, then delivered in randomized order with occasional replay.

The oracle:

-   Both replicas must converge to the same logical block tree after stripping transient `clientId`s.
-   Every block must remain structurally valid.
-   The `blob` attribute must not survive synchronization, which checks that local-only attributes are not leaked into shared state.

### `merge-rich-text.fuzz.test.ts`

This fuzzer targets `mergeRichTextUpdate`, which is the cursor-aware rich-text merge helper used inside block synchronization.

What it fuzzes:

-   Rich-text mutation sequences.
-   Cursor positions supplied alongside the updated text.
-   Idempotent replay of the same rich-text update.

How it works:

-   The helper file `merge-rich-text-fuzz-utils.ts` models content as a fragment array rather than raw characters.
-   Fragments include plain tokens, spaces, newlines, emoji, combining characters, HTML markup, links, and even block-comment markup.
-   Each generated step is one of:
    -   insert a fragment
    -   delete a fragment span
    -   replace a span
    -   duplicate a span
    -   wrap a span in `<strong>`
-   Every step also gets a cursor position. The generator deliberately explores:
    -   the expected cursor
    -   a random cursor
    -   `null`
    -   a cursor beyond the end of the current value
-   Some steps are replayed a second time to check idempotence.
-   The model computes the expected next value directly from the fragment array, then applies `mergeRichTextUpdate` to a real `Y.Text`.

The oracle:

-   After each step, `ytext.toString()` must exactly equal the model value.
-   If replay is requested, the second application must still produce the same value.
-   The helper also includes `findMinimalFailingWindow()`, which can shrink a failure to the smallest subsequence that still reproduces it.

## Layer 2: Sync State-Machine Fuzzers

These fuzzers live in `packages/sync/src/`. They run the real sync code with mocked providers and mocked transport. This layer is where transport ordering, persistence, and room-isolation rules are stressed directly.

### `manager.fuzz.test.ts`

This fuzzer targets `createSyncManager()`.

What it fuzzes:

-   Per-entity synchronization for multiple records loaded into the same collection.
-   Save and persisted-document behavior.
-   Unload and reload boundaries.
-   Collection-level remote save markers.

How it works:

-   It creates two entities, `a` and `b`, each with `title`, `content`, and optional `_crdt_document`.
-   It uses the real sync manager, but injects mocked provider creators and mocked record handlers.
-   A collection-level `Y.Doc` and one `Y.Doc` per entity are tracked.
-   Each step picks one of four actions:
    -   `local-update`
    -   `persisted-reload`
    -   `collection-remote-save`
    -   `unload`

The action grammar is deliberately stateful:

-   `local-update` edits one field on one entity, sometimes marking it as a save and forcing `_crdt_document` persistence.
-   `persisted-reload` persists the document, unloads it, optionally mutates the backing record to simulate invalidation, then reloads it.
-   `collection-remote-save` applies a remote `savedAt` update to the collection doc and checks refetch behavior.
-   `unload` exercises manager teardown and the collection bookkeeping that happens when an entity leaves active memory.

The oracle:

-   Entity `a` must never leak into entity `b`, or vice versa.
-   The edited record, live `Y.Doc`, and expected model snapshot must all agree.
-   `getChangesFromCRDTDoc()` must report no remaining drift when the state is settled.
-   Persisted `_crdt_document` content must match the expected logical state on save.
-   Remote collection save markers must trigger exactly one refetch.
-   Unload must leave the entity without a persisted doc while still updating collection bookkeeping correctly.

### `polling-manager.fuzz.test.ts`

This fuzzer targets the HTTP polling transport manager.

What it fuzzes:

-   Collaborator discovery gating.
-   Room queue behavior before and after discovery.
-   Prefix-colliding room names.
-   Room-specific permission failure handling.
-   Recovery after transient transport errors.

How it works:

-   It registers three rooms:
    -   a primary post room
    -   a second post room with a prefix-colliding name
    -   a collection room
-   Local updates are queued before collaborators are visible.
-   The randomized branch is small but important:
    -   some seeds inject a transient polling failure and then force a manual retry
    -   other seeds let collaborator discovery happen on the normal timer
-   After discovery, the fuzzer injects a `403` for the longer prefix-colliding room.
-   The next poll then checks that the surviving rooms recover cleanly.

The oracle:

-   The forbidden room must be isolated without poisoning the healthy rooms.
-   The surviving rooms must still be the only rooms present in the next payload.
-   Queued collection updates must still be sent.
-   Healthy rooms must not receive spurious error states.
-   Non-blocking sync must not keep sending the forbidden room after it has been isolated.

## Layer 3: Real Browser Session Fuzzer

The browser fuzzer lives in `test/e2e/specs/editor/collaboration/collaboration-fuzz.spec.ts`. This is the highest-fidelity fuzzer because it drives the real editor in Chromium against `wp-env`.

What it fuzzes:

-   Real editing actions by multiple users in real browser tabs.
-   Save and reload boundaries.
-   Transient sync faults on actual `wp-sync` requests.
-   End-to-end convergence between editor state and persisted CRDT state.

How it works:

-   Each test starts from a deterministic seed.
-   The seed chooses one of several initial post templates, including:
    -   plain paragraphs
    -   multibyte-heavy content
    -   nested group/list/quote content
    -   longer shared paragraphs for edit-and-reload coverage
-   A post is created, the primary editor opens it, and a second user joins the same collaboration session.
-   Each test uses a unique collaborator account so parallel browser lanes do not fight over shared test users.
-   The action grammar includes:
    -   insert paragraph
    -   append paragraph
    -   edit paragraph
    -   delete block
    -   edit title
    -   insert heading
    -   move block
    -   insert concurrent paragraphs from both users
-   One random step becomes a save milestone, and another becomes a reload milestone.
-   Before some steps, the harness perturbs the next `wp-sync` request from the acting page:
    -   delay it by a randomized amount
    -   fail it with a retryable status such as `429`, `500`, or `503`

The browser layer is intentionally conservative about fault injection. It does not use `403` as a generic transient failure, because `403` is a semantic permission failure that legitimately unregisters the room. Treating that as a transient browser fault only produced harness false positives.

The oracle:

-   After each step, `waitForConvergence()` polls all pages until they expose the same normalized state.
-   That normalized state includes:
    -   post title
    -   top-level and nested blocks, normalized to `name`, `attributes`, and `innerBlocks`
    -   optionally, the persisted `_crdt_document`
-   The comparison deliberately ignores transient editor metadata such as `clientId`.
-   At save and reload milestones, the persisted `_crdt_document` must also be present and converge.
-   The final state must have a non-empty title, a non-empty block tree, and a persisted CRDT document.

This is the layer that should find bugs that users actually hit, because it exercises the real editor, the real collaboration runtime, the real REST path, and real browser timing.

## Layer 4: Long-Running Browser Campaign And Triage

The files `bin/rtc-browser-fuzz-runner.mjs` and `bin/rtc-browser-fuzz-launcher.mjs` sit above the Playwright spec. They are not a separate mutation engine, but they are a separate fuzzing level in practice because they control how browser seeds are explored over time.

What this layer fuzzes:

-   Large seed ranges over long wall-clock time.
-   Parallel browser exploration across multiple lanes.
-   Failure reproducibility and false-positive reduction.

How it works:

-   `rtc-browser-fuzz-launcher.mjs` launches one runner lane per performance core by default.
-   Each lane gets a different starting seed and a fixed seed stride, so the lanes cover disjoint seed sequences.
-   `rtc-browser-fuzz-runner.mjs`:
    -   verifies that the spec exists
    -   verifies that the failure-analysis schema exists
    -   checks or starts `wp-env-test`
    -   runs a Playwright `--list` preflight so missing specs or broken harness state are caught before a failure is treated as a product bug
-   For each seed, the runner executes the real browser spec once.
-   On failure, it does deeper checking:
    -   an isolated recheck
    -   a second deeper recheck
-   It then asks `codex` running `gpt-5.4` with `xhigh` reasoning to classify the failure as real, not real, or uncertain.
-   If Codex concludes that the failure is not real and applies a harness fix, the runner reruns preflight before continuing.

The oracle at this layer is broader than pass/fail:

-   A seed that fails once but not again is treated differently from one that fails in every recheck.
-   The runner records local classifications such as `harness`, `environment`, or `product-or-test`.
-   The final summary classifies failures as `real-bug`, `not-real`, `infra`, or `uncertain`.

This is the layer that turns the browser spec into a sustained bug-finding campaign instead of a one-off test.

## Layer 5: Randomized PHP Server And Storage Fuzzers

The PHP layer adds randomized coverage for the server-side collaboration code that sits behind the browser and sync layers.

### `phpunit/tests/collaboration/wpHttpPollingSyncServer.php`

The key randomized test here is `test_sync_randomized_room_batches_preserve_room_isolation()`.

What it fuzzes:

-   Mixed batched sync requests that target more than one room.
-   Random room targeting.
-   Random batch ordering.

How it works:

-   It creates two valid rooms.
-   In each iteration, it randomly chooses one target room and one client id.
-   It sends an update to that room only.
-   It then queries both rooms together, but shuffles the request order each time.

The oracle:

-   Every room response must contain exactly the updates that were sent to that room.
-   Querying rooms in a mixed batch must not leak updates across room boundaries.

### `phpunit/tests/collaboration/wpSyncPostMetaStorage.php`

The key randomized test here is `test_randomized_room_storage_operations_remain_isolated_and_monotonic()`.

What it fuzzes:

-   Repeated randomized storage operations across multiple rooms.
-   Cursor advancement.
-   Awareness storage and retrieval.

How it works:

-   It creates two rooms and tracks expected updates per room.
-   Each iteration randomly picks one room and one client id.
-   It appends an update and writes an awareness state for that room.
-   After every mutation, it queries both rooms.

The oracle:

-   Cursors must be monotonic for each room.
-   The update list for each room must exactly match the modelled update list for that room.
-   Awareness state written to one room must not appear in the other room.

## Reproduction And Control Knobs

The fuzzers are designed to be rerun from a failing seed.

Common controls:

-   `GUTENBERG_FUZZ_SEED_START`
-   `GUTENBERG_FUZZ_SEED_COUNT`

Layer-specific controls:

-   `GUTENBERG_RTC_CRDT_STEPS`
-   `GUTENBERG_RTC_CRDT_BLOCK_STEPS`
-   `GUTENBERG_RTC_RICH_TEXT_STEPS`
-   `GUTENBERG_RTC_MANAGER_STEPS`
-   `GUTENBERG_RTC_BROWSER_SEED_START`
-   `GUTENBERG_RTC_BROWSER_SEED_COUNT`
-   `GUTENBERG_RTC_BROWSER_STEPS`
-   `GUTENBERG_RTC_BROWSER_CONVERGENCE_TIMEOUT_MS`
-   `GUTENBERG_RTC_BROWSER_DISCOVERY_TIMEOUT_MS`
-   `GUTENBERG_RTC_BROWSER_BOOT_TIMEOUT_MS`
-   `GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS`
-   `GUTENBERG_RTC_BROWSER_DISABLE_RELOAD`
-   `RTC_FUZZ_START_SEED`
-   `RTC_FUZZ_SEED_STRIDE`
-   `RTC_FUZZ_DURATION_HOURS`
-   `RTC_FUZZ_STEP_COUNT`
-   `RTC_FUZZ_PARALLEL_LANES`
-   `RTC_FUZZ_CONVERGENCE_TIMEOUT_MS`
-   `RTC_FUZZ_DISCOVERY_TIMEOUT_MS`
-   `RTC_FUZZ_BOOT_TIMEOUT_MS`
-   `RTC_FUZZ_DISABLE_SYNC_FAULTS`
-   `RTC_FUZZ_DISABLE_RELOAD`
-   `RTC_FUZZ_BASE_URL`

Lower-level fuzzers usually report the failing seed and an action trace directly in the thrown test error. The long-running browser runner writes per-seed logs, Playwright artifacts, recheck logs, Codex-analysis output, and a summary record for each failure.

## What Each Layer Is For

The layers are complementary, not redundant:

-   Use the model fuzzers to catch merge and projection bugs quickly.
-   Use the sync state-machine fuzzers to catch queueing, persistence, and room-isolation bugs.
-   Use the browser fuzzer to catch real user-facing collaboration failures.
-   Use the long-running runner to keep exploring browser seeds and to separate real failures from harness noise.
-   Use the PHP randomized tests to catch server-side isolation and cursor bugs that do not require a browser to reproduce.

That split is the core strategy: push as much search as possible into fast deterministic layers, then spend browser time on the failures that only the full stack can reveal.
