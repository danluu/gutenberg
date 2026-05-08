# RTC remote table delete is reintroduced after remote insert

Bug signature: `98e7f896ffb0`

Bug type: `rtc_remote_top_level_table_delete_reintroduced_after_remote_insert`

Transport: WebSocket RTC collaboration

## Status

This is a real product bug, not a Playwright readiness failure. The source run
used normal editor actions, had one adjacent scenario pass, and failed only at
the final convergence assertion:

- Primary editor content still contained an inserted `core/table`.
- Collaborator content had the expected paragraph-only block list after
  deleting that table.
- The source run did not time out and did not fail on a locator/action error.

Pass 170 classifies the real-user likelihood as **medium**. The workflow needs
RTC collaboration with two tabs or users and a specific interleaving, but the
actual actions are ordinary Gutenberg actions: insert a paragraph, insert a
table with the slash inserter, fill cells, select a table cell, and delete the
table from Block tools > Options > Delete.

## Practical impact

Natural triggering workflow:

1. Two users or browser tabs edit the same post in the post editor using
   WebSocket RTC.
2. User A inserts a normal top-level paragraph near the shared editing target.
3. User B inserts a top-level Table block with `/table`, creates the table, and
   types normal cell values.
4. User A has already observed the remote table, selects a table cell, opens
   Block tools > Options, and deletes the table.
5. The remote-delete snapshot is reconciled against a stale local snapshot on
   another client, and the already-delivered table is spliced back into that
   client.

Common prerequisites:

- Multiple browser tabs or multiple users in the same post.
- Normal paragraph editing and normal table insertion/deletion.
- Ordinary RTC async delivery; no artificial network fault is needed.

Less common prerequisites:

- A top-level Table block is involved.
- The delete happens after a preceding remote paragraph/order shift and after
  the deleter has observed the table.
- The failure was intermittent in the full realistic Playwright route, although
  the lower-level CRDT repro is deterministic.

Artificial fuzz/test details:

- The exact seed text, generated post setup, and strict final block-array
  assertion are test scaffolding.
- The Playwright repro does not inject malformed blocks, mutate store state
  directly, or create synthetic block trees.

Blast radius:

- Editor state can diverge between collaborators.
- A table deleted by one collaborator can remain visible on another collaborator
  and can be persisted if that collaborator saves or publishes.
- This is content corruption/resurrection risk, not just a UI-only mismatch.
- No save loop, OOM, or performance failure was observed.
- Recovery is manual: delete the resurrected block again or recover from a
  revision if the wrong state is saved.

Strongest evidence for `medium` likelihood:

- The source Playwright trace is a natural user-action route.
- The source run failed by content divergence, not by harness readiness.
- A focused unit repro fails deterministically on the current May 7 known-fixes
  base.
- A fixed branch passes the focused unit repros and the natural Playwright route.

Strongest evidence against `high` likelihood:

- RTC collaboration itself is a narrower feature surface than single-user
  editing.
- The exact table-delete ordering is less common than plain paragraph edits.
- The realistic browser route has been intermittent, so hit rate in normal
  sessions still needs measurement.

Shortest confidence-improving experiment:

Run a 20-50 iteration headless Playwright loop on the May 7 known-fixes base
with human-scale randomized waits around paragraph insertion, table delivery,
and table deletion, then record the hit rate and whether a save/reload persists
the resurrected table.

## Known-fixes control

The current known-fixes base used for pass 170 was:

`f256024286dd80a4c0e2579f658c109256abf648`

The handoff manifest says this base is a best-effort integration of current
trunk plus the backlink-aware RTC fix set. It includes the relevant proposed RTC
heads best-effort, so this bug was checked against that base rather than the
older May 5 refresh checkout.

I added only the focused repro commit to a detached worktree on that base:

`2ada87827b0 Add RTC remote insert delete CRDT repro`

Command:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-remote-insert-delete-base.test.ts -- --runInBand --no-cache --testNamePattern='preserves a remote table insert|does not reintroduce a remote table|matches the source order|deletes delivered blocks while preserving unseen remote inserts'
```

Result:

- `preserves a remote table insert when a stale local snapshot edits another block`: PASS
- `does not reintroduce a remote table after that remote insert has become the local base`: FAIL, returned `core/table`
- `matches the source order: collaborator paragraph, primary table, collaborator delete`: FAIL, ended with the table
- `deletes delivered blocks while preserving unseen remote inserts`: FAIL, kept a delivered-deleted paragraph

This proves the known-fixes base still cannot distinguish a remote insert that
the local editor has never seen from a remote block that the local editor has
already observed and intentionally deleted.

## Root cause

The RTC CRDT block layer exchanges full editor block snapshots. During
stale-local reconciliation, a block missing from the local snapshot is ambiguous:

- it might be a remote insertion the local editor has not observed yet, so it
  must be preserved; or
- it might be a remote insertion that was already delivered to the local editor
  and then intentionally deleted by that local editor, so it must be removed.

The known-fixes base preserves current-only CRDT blocks when reconciling stale
local snapshots, but its comparison base is only the previous local outbound
snapshot. It is not advanced when a remote CRDT block tree is delivered back
into the editor. That means an already-observed table can still look like an
unseen remote insertion later. When the collaborator deletes the delivered table,
another client treats the missing table as something to preserve and writes it
back into the CRDT block array.

The relevant code paths are:

- `packages/core-data/src/utils/crdt-blocks.ts`: stale-local block merge and
  current-only block preservation.
- `packages/core-data/src/utils/crdt.ts`: `getPostChangesFromCRDTDoc()`, which
  delivers CRDT block changes to editor state.

Origin history:

- `84019935998c16f877e976ad85e84748355d7282` (`Improve CRDT "merge logic" for post entities (#72262)`) introduced the CRDT post/entity block merge machinery.
- `85695dcffdc9a7cb3448441e2a98f85b1042e139` (`RTC: Fix RichTextData deserialization (#76607)`) made the CRDT-to-editor block delivery/deserialization path important for normal editor block updates.
- The later stale-snapshot preservation work in the known-fixes base added the right instinct, preserving unseen remote inserts, but did not mark delivered CRDT blocks as the new editor-visible base.

## Fix plan

Initial plan:

- Add a table-specific delete guard for the failing scenario.

Audit result:

- That would only fix one block type and one interleaving.
- It would not solve the distributed-systems ambiguity between unseen remote
  inserts and observed local deletes.
- It would leave nested blocks and mixed delete/insert snapshots fragile.

Revised plan:

1. Maintain a block-type-agnostic synced-base snapshot for each CRDT `Y.Array`.
2. Whenever `getPostChangesFromCRDTDoc()` delivers CRDT blocks to the editor,
   recursively mark the current CRDT block tree as the editor-visible base.
3. During stale-local reconciliation, preserve current-only CRDT blocks only
   when they are absent from that synced base.
4. If a current-only block is present in the synced base but missing from the
   local snapshot, treat the absence as an observed local delete.

Robustness audit:

- Kernel-maintainer lens: keep the state local to the CRDT block arrays with a
  `WeakMap`; do not add global room state or block-type special cases.
- Jepsen lens: the causality boundary is "delivered to editor", not "last local
  outbound snapshot"; tests must cover both unseen insert preservation and
  observed delete removal.
- Simplicity/performance lens: use linear block walks and client IDs already
  used by the CRDT layer; avoid an operation-log rewrite or expensive serialized
  HTML diffs.

Residual risk:

- Correctness depends on stable block `clientId` values while blocks are edited
  in memory.
- The fix is still built around full-snapshot reconciliation, so more complex
  concurrent moves can expose separate ordering bugs.
- Save/reload persistence of the resurrected table should be measured with a
  short repeated browser experiment before severity is raised above medium.

## Verification on the PR branch

PR branch:

`try/rtc-remote-top-level-table-delete-reintroduced-after-remot-98e7f896ffb0-pr`

Head:

`743297b2c14 Advance RTC block merge base after remote delivery`

Commit order:

1. `4300e6174e2 Add RTC remote insert delete CRDT repro`
2. `7cd83bfe39f Add WebSocket table delete Playwright repro`
3. `743297b2c14 Advance RTC block merge base after remote delivery`

Commands run on the rebased PR branch:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-remote-insert-delete-base.test.ts -- --runInBand --no-cache
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --no-cache
npm run lint:js -- packages/core-data/src/utils/crdt.ts packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-remote-insert-delete-base.test.ts test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts test/e2e/specs/editor/collaboration/websocket/collaboration-triage-98e7f896ffb0-realistic.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9997 WP_BASE_URL=http://localhost:9997 RTC_MANIFEST_WS_START_PORT=21176 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_98E7_REALISTIC_REPRO_DIR="$PWD/artifacts/pass-170/playwright-fixed-results" npm run test:e2e -- test/e2e/specs/editor/collaboration/websocket/collaboration-triage-98e7f896ffb0-realistic.spec.ts --project=chromium --workers=1
```

Results:

- Focused repro unit file: PASS, 6 tests.
- Existing CRDT block unit file: PASS, 71 tests.
- Targeted JS lint: exit 0.
- `git diff --check origin/trunk..HEAD`: exit 0.
- Natural Playwright repro: PASS, 2 scenarios.

Evidence video:

`/Users/danluu/dev/fuzz/gutenberg-bug-98e7f896ffb0/artifacts/pass-170/98e7f896ffb0-pass170-stitched-evidence.mp4`

The video stitches the source failure screenshots, source trace action route,
known-fixes control failure, and rebased fixed-branch verification.

## Pass 171 refresh

Pass 171 rechecked the bug against the May 7 known-fixes base and rebased the
PR branch onto current `origin/trunk`:

- `origin/trunk`: `000ad18641c i18n: add context to table header/footer label (#78007)`.
- Known-fixes base: `f256024286dd80a4c0e2579f658c109256abf648`.
- Fresh known-fixes repro-only commit: `24bf4bc1fc2 Add RTC remote insert delete CRDT repro`.
- Rebased PR branch head: `c1eb7ba2401 Advance RTC block merge base after remote delivery`.
- Rebased PR commit order:
  1. `c8e4cd4e63d Add RTC remote insert delete CRDT repro`
  2. `e052b78556a Add WebSocket table delete Playwright repro`
  3. `c1eb7ba2401 Advance RTC block merge base after remote delivery`

Fresh known-fixes control:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-remote-insert-delete-base.test.ts -- --runInBand --no-cache --testNamePattern='preserves a remote table insert|does not reintroduce a remote table|matches the source order|deletes delivered blocks while preserving unseen remote inserts'
```

Result on `f256024286d` plus the repro commit:

- `preserves a remote table insert when a stale local snapshot edits another block`: PASS.
- `does not reintroduce a remote table after that remote insert has become the local base`: FAIL; the CRDT block list still included `core/table`.
- `matches the source order: collaborator paragraph, primary table, collaborator table delete`: FAIL; the primary document still included the table content.
- `deletes delivered blocks while preserving unseen remote inserts in the same stale snapshot`: FAIL; the delivered-deleted paragraph remained next to the unseen table.

Fresh verification on the rebased PR branch:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-remote-insert-delete-base.test.ts -- --runInBand --no-cache
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --no-cache
npm run lint:js -- packages/core-data/src/utils/crdt.ts packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-remote-insert-delete-base.test.ts test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts test/e2e/specs/editor/collaboration/websocket/collaboration-triage-98e7f896ffb0-realistic.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9997 WP_BASE_URL=http://localhost:9997 RTC_MANIFEST_WS_START_PORT=21176 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_98E7_REALISTIC_REPRO_DIR=/Users/danluu/dev/fuzz/gutenberg-bug-98e7f896ffb0/artifacts/pass-171/playwright-fixed-results npm run test:e2e -- test/e2e/specs/editor/collaboration/websocket/collaboration-triage-98e7f896ffb0-realistic.spec.ts --project=chromium --workers=1
```

Results:

- Focused repro unit file: PASS, 6 tests.
- Existing CRDT block unit file: PASS, 71 tests.
- Targeted JS lint: exit 0.
- `git diff --check origin/trunk..HEAD`: exit 0.
- Natural Playwright repro: PASS, 2 scenarios.
- Pass-171 result JSONs showed `convergenceError: null` and no `core/table`
  in either editor after deletion.
