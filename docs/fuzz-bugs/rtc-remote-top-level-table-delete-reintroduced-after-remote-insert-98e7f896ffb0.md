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

## Pass 172 refresh

Pass 172 rebased both requested branches onto current `origin/trunk` again:

- `origin/trunk`: `dc3bc7decd0 Add missing Portal Storybook subcomponents (#78108)`.
- Explanation branch head before this documentation update: `2f21b7bb42a Refresh RTC table delete reintroduction analysis`.
- PR branch head: `52b35aed841 Advance RTC block merge base after remote delivery`.
- PR branch commit order:
  1. `1e036e38e8a Add RTC remote insert delete CRDT repro`
  2. `44402e6c6de Add WebSocket table delete Playwright repro`
  3. `52b35aed841 Advance RTC block merge base after remote delivery`

Pass 172 reran the known-fixes control on the required May 7 base
`f256024286d` plus only the repro commit `24bf4bc1fc2`. The unseen remote
table insert preservation case still passed, while the three delivered-delete
cases still failed:

- delivered remote table delete returned an extra `core/table`;
- source-order collaborator paragraph, primary table, collaborator delete ended
  with the table content still present;
- mixed delivered-delete plus unseen-insert kept the delivered-deleted
  paragraph.

Fresh verification on the pass-172 rebased PR branch:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-remote-insert-delete-base.test.ts -- --runInBand --no-cache
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --no-cache
npm run lint:js -- packages/core-data/src/utils/crdt.ts packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-remote-insert-delete-base.test.ts test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts test/e2e/specs/editor/collaboration/websocket/collaboration-triage-98e7f896ffb0-realistic.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9997 WP_BASE_URL=http://localhost:9997 RTC_MANIFEST_WS_START_PORT=21176 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_98E7_REALISTIC_REPRO_DIR=/Users/danluu/dev/fuzz/gutenberg-bug-98e7f896ffb0/artifacts/pass-172/playwright-fixed-results npm run test:e2e -- test/e2e/specs/editor/collaboration/websocket/collaboration-triage-98e7f896ffb0-realistic.spec.ts --project=chromium --workers=1
```

Results:

- Focused repro unit file: PASS, 6 tests.
- Existing CRDT block unit file: PASS, 71 tests.
- Targeted JS lint: exit 0.
- `git diff --check origin/trunk..HEAD`: exit 0.
- Natural Playwright repro: PASS, 2 scenarios.
- Pass-172 result JSONs showed `convergenceError: null`, matching block-name
  arrays, and no `core/table` in either editor after deletion.

## Pass 173 current-trunk refresh

Pass 173 rebased the PR branch onto current `origin/trunk` again:

- `origin/trunk`: `80699422e63 Docs: shortcode transforms with wrapped content + rawHandler JSDoc (#78003)`.
- Newly included trunk RTC change: `114082fd168 RTC: Fix title divergence between users on page refresh after title update (#77666)`.
- PR branch head after rebase: `1d0bcd7d283 Advance RTC block merge base after remote delivery`.
- PR branch commit order:
  1. `9ef5b444d5a Add RTC remote insert delete CRDT repro`
  2. `b80df7b909a Add WebSocket table delete Playwright repro`
  3. `1d0bcd7d283 Advance RTC block merge base after remote delivery`

Pass 173 reran the required known-fixes negative control at repro commit
`24bf4bc1fc2`. The result matched pass 172: unseen remote table preservation
passed, but the delivered-delete cases still failed with a reintroduced
`core/table` or delivered-deleted paragraph.

Pass 173 also added a useful negative control: run the repro-only stack on
current `origin/trunk` without the proposed fix. That stack did not reintroduce
the delivered table, but only because current trunk still lacks the
stale-snapshot preservation behavior from the May 7 known-fixes integration.
The repro-only current-trunk run instead failed the opposite safety property:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-remote-insert-delete-base.test.ts -- --runInBand --no-cache
```

Result on `80699422e63` plus only the two repro commits:

- `preserves a remote table insert when a stale local snapshot edits another block`: FAIL; the unseen `core/table` was dropped.
- `does not reintroduce a remote table after that remote insert has become the local base`: PASS.
- `matches the source order: collaborator paragraph, primary table, collaborator table delete`: PASS.
- `deletes delivered blocks while preserving unseen remote inserts in the same stale snapshot`: FAIL; the unseen table was dropped.
- Remote paragraph and nested remote paragraph delivered-delete cases: PASS.

This narrows the root cause. The table-resurrection failure appears when the
runtime has stale-snapshot protection for unseen remote inserts but does not
advance the editor-visible base after CRDT delivery. Current trunk alone avoids
this signature by not preserving those unseen inserts, which is a data-loss
tradeoff rather than a proof that the underlying ambiguity is solved.

Fresh verification on the pass-173 rebased PR branch:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-remote-insert-delete-base.test.ts -- --runInBand --no-cache
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --no-cache
npm run lint:js -- packages/core-data/src/utils/crdt.ts packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-remote-insert-delete-base.test.ts test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts test/e2e/specs/editor/collaboration/websocket/collaboration-triage-98e7f896ffb0-realistic.spec.ts
WP_ENV_PORT=9997 WP_BASE_URL=http://localhost:9997 RTC_MANIFEST_WS_START_PORT=21176 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_98E7_REALISTIC_REPRO_DIR=/Users/danluu/dev/fuzz/gutenberg-bug-98e7f896ffb0/artifacts/pass-173/playwright-fixed-results npm run test:e2e -- test/e2e/specs/editor/collaboration/websocket/collaboration-triage-98e7f896ffb0-realistic.spec.ts --project=chromium --workers=1
```

Results:

- Focused repro unit file: PASS, 6 tests.
- Existing CRDT block unit file: PASS, 71 tests.
- Targeted JS lint: exit 0.
- Natural Playwright repro: PASS, 2 scenarios.
- Pass-173 result JSONs showed `convergenceError: null`, matching block-name
  arrays, and no `core/table` in either editor after deletion.

## Pass 174 current-trunk refresh

Pass 174 rebased both requested branches onto current `origin/trunk` again:

- `origin/trunk`: `b38f9b4d86d Fix lockfile drift and missing dep from content-types consolidation (#78109)`.
- Explanation branch was a documentation-only delta after rebase.
- PR branch head after rebase: `2cf336223cf Advance RTC block merge base after remote delivery`.
- PR branch commit order:
  1. `4c064df8177 Add RTC remote insert delete CRDT repro`
  2. `03c15208655 Add WebSocket table delete Playwright repro`
  3. `2cf336223cf Advance RTC block merge base after remote delivery`

Pass 174 reran the required known-fixes negative control on the May 7
backlink-aware base `f256024286d` plus only the repro commit. The result again
showed that the known-fixes base preserves an unseen remote table insert but
cannot distinguish that case from a delivered block that the local editor later
deletes:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-remote-insert-delete-base.test.ts -- --runInBand --no-cache --testNamePattern='preserves a remote table insert|does not reintroduce a remote table|matches the source order|deletes delivered blocks while preserving unseen remote inserts'
```

Result:

- `preserves a remote table insert when a stale local snapshot edits another block`: PASS.
- `does not reintroduce a remote table after that remote insert has become the local base`: FAIL; received a trailing `core/table`.
- `matches the source order: collaborator paragraph, primary table, collaborator table delete`: FAIL; received table content after the collaborator delete.
- `deletes delivered blocks while preserving unseen remote inserts in the same stale snapshot`: FAIL; retained the delivered-deleted paragraph alongside the unseen table.

Fresh verification on the pass-174 rebased PR branch:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-remote-insert-delete-base.test.ts -- --runInBand --no-cache
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --no-cache
npm run lint:js -- packages/core-data/src/utils/crdt.ts packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-remote-insert-delete-base.test.ts test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts test/e2e/specs/editor/collaboration/websocket/collaboration-triage-98e7f896ffb0-realistic.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9997 WP_BASE_URL=http://localhost:9997 RTC_MANIFEST_WS_START_PORT=21176 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_98E7_REALISTIC_REPRO_DIR=/Users/danluu/dev/fuzz/gutenberg-bug-98e7f896ffb0/artifacts/pass-174/playwright-fixed-results npm run test:e2e -- test/e2e/specs/editor/collaboration/websocket/collaboration-triage-98e7f896ffb0-realistic.spec.ts --project=chromium --workers=1
```

Results:

- Focused repro unit file: PASS, 6 tests.
- Existing CRDT block unit file: PASS, 71 tests.
- Targeted JS lint: exit 0.
- `git diff --check origin/trunk..HEAD`: exit 0.
- Natural Playwright repro: PASS, 2 scenarios.
- Pass-174 result JSONs showed `convergenceError: null`, matching block-name
  arrays, and no `core/table` in either editor after deletion.

Pass 174 keeps the practical-impact classification at `medium`. The refreshed
evidence strengthens the branch/artifact sufficiency claim: the exact source
workflow is still guarded by a natural-user Playwright test on current trunk,
and the focused non-browser repro still proves the May 7 known-fixes base has a
real causality/base-tracking bug rather than a browser readiness issue.

## Pass 177 current-trunk refresh

Pass 177 rebased both requested branches onto current `origin/trunk` again:

- `origin/trunk`: `84ecc0f1476 Connectors: Avoid using centered text (#78125)`.
- Explanation branch head after this documentation update:
  `d4a69cca649 Refresh RTC table delete pass 174 analysis` before the pass-177
  commit.
- PR branch head after rebase:
  `3bea34983d8 Advance RTC block merge base after remote delivery`.
- PR branch commit order:
  1. `623b625dd7c Add RTC remote insert delete CRDT repro`
  2. `a2f68193f99 Add WebSocket table delete Playwright repro`
  3. `3bea34983d8 Advance RTC block merge base after remote delivery`

Pass 177 reran the required known-fixes negative control on the May 7
backlink-aware base `f256024286d` plus only the repro commit. It also widened
the pattern to include the paragraph and nested paragraph delivered-delete
cases. The result was the same causal split:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-remote-insert-delete-base.test.ts -- --runInBand --no-cache --testNamePattern='preserves a remote table insert|does not reintroduce a remote table|matches the source order|deletes delivered blocks while preserving unseen remote inserts|does not reintroduce a remote paragraph|does not reintroduce a remote nested paragraph'
```

Result on `f256024286d` plus only the repro commit:

- `preserves a remote table insert when a stale local snapshot edits another block`: PASS.
- `does not reintroduce a remote table after that remote insert has become the local base`: FAIL; received a trailing `core/table`.
- `matches the source order: collaborator paragraph, primary table, collaborator table delete`: FAIL; received table content after the collaborator delete.
- `deletes delivered blocks while preserving unseen remote inserts in the same stale snapshot`: FAIL; retained the delivered-deleted paragraph alongside the unseen table.
- `does not reintroduce a remote paragraph after that remote insert has become the local base`: FAIL; retained the delivered-deleted paragraph.
- `does not reintroduce a remote nested paragraph after that remote insert has become the local base`: FAIL; retained the delivered-deleted nested paragraph.

Fresh verification on the pass-177 rebased PR branch:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-remote-insert-delete-base.test.ts -- --runInBand --no-cache
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --no-cache
node ./tools/eslint/lint-js.cjs --config eslint.config.strict.cjs packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/crdt.ts packages/core-data/src/utils/test/crdt-remote-insert-delete-base.test.ts test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts test/e2e/specs/editor/collaboration/websocket/collaboration-triage-98e7f896ffb0-realistic.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9997 WP_BASE_URL=http://localhost:9997 RTC_MANIFEST_WS_START_PORT=21176 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_98E7_REALISTIC_REPRO_DIR=/Users/danluu/dev/fuzz/gutenberg-bug-98e7f896ffb0/artifacts/pass-177/playwright-fixed-results npm run test:e2e -- test/e2e/specs/editor/collaboration/websocket/collaboration-triage-98e7f896ffb0-realistic.spec.ts --project=chromium --workers=1
```

Results:

- Focused repro unit file: PASS, 6 tests.
- Existing CRDT block unit file: PASS, 71 tests.
- Targeted strict JS lint: exit 0.
- `git diff --check origin/trunk..HEAD`: exit 0.
- Natural Playwright repro: PASS, 2 scenarios.
- Pass-177 result JSONs showed `convergenceError: null`, matching block-name
  arrays, and no `core/table` in either editor after deletion.

Pass 177 keeps the practical-impact classification at `medium`. The refreshed
negative control proves the May 7 known-fixes base still preserves unseen
remote inserts while reintroducing delivered-deleted blocks; the rebased fix
preserves the unseen-insert behavior and removes delivered-deleted table,
paragraph, and nested paragraph blocks.

## Pass 178 current-trunk refresh

Pass 178 rebased both requested branches onto current `origin/trunk` again:

- `origin/trunk`: `3f566355931 Text: Fix render prop CSS defenses (#78172)`.
- Relevant trunk movement since pass 177: `569ea262b57 e2e tests: use editPost and createNewPost helpers everywhere (#78170)` changed the collaboration fixture's `openPost()` helper to use `admin.editPost()`.
- Explanation branch remained a documentation-only delta after rebase.
- PR branch head after rebase:
  `94637bc383d Advance RTC block merge base after remote delivery`.
- PR branch commit order:
  1. `56aed5919a3 Add RTC remote insert delete CRDT repro`
  2. `3c309607d7d Add WebSocket table delete Playwright repro`
  3. `94637bc383d Advance RTC block merge base after remote delivery`

Pass 178 also reran the required known-fixes negative control in a fresh
detached worktree at `f256024286d` plus only the new repro commit
`56aed5919a3`:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-remote-insert-delete-base.test.ts -- --runInBand --no-cache --testNamePattern='preserves a remote table insert|does not reintroduce a remote table|matches the source order|deletes delivered blocks while preserving unseen remote inserts|does not reintroduce a remote paragraph|does not reintroduce a remote nested paragraph'
```

Result on the May 7 known-fixes base:

- `preserves a remote table insert when a stale local snapshot edits another block`: PASS.
- `does not reintroduce a remote table after that remote insert has become the local base`: FAIL; received a trailing `core/table`.
- `matches the source order: collaborator paragraph, primary table, collaborator table delete`: FAIL; received table content after the collaborator delete.
- `deletes delivered blocks while preserving unseen remote inserts in the same stale snapshot`: FAIL; retained the delivered-deleted paragraph alongside the unseen table.
- `does not reintroduce a remote paragraph after that remote insert has become the local base`: FAIL; retained the delivered-deleted paragraph.
- `does not reintroduce a remote nested paragraph after that remote insert has become the local base`: FAIL; retained the delivered-deleted nested paragraph.

Fresh verification on the pass-178 rebased PR branch:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-remote-insert-delete-base.test.ts -- --runInBand --no-cache
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --no-cache
node ./tools/eslint/lint-js.cjs --config eslint.config.strict.cjs packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/crdt.ts packages/core-data/src/utils/test/crdt-remote-insert-delete-base.test.ts test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts test/e2e/specs/editor/collaboration/websocket/collaboration-triage-98e7f896ffb0-realistic.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9997 WP_BASE_URL=http://localhost:9997 npm run wp-env-test -- status
WP_ENV_PORT=9997 WP_BASE_URL=http://localhost:9997 RTC_MANIFEST_WS_START_PORT=21176 RTC_MANIFEST_WS_FIXED_PORT=1 npm run wp-env-test -- start
WP_ENV_PORT=9997 WP_BASE_URL=http://localhost:9997 RTC_MANIFEST_WS_START_PORT=21176 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_98E7_REALISTIC_REPRO_DIR="$PWD/artifacts/pass-178/playwright-fixed-results" npm run test:e2e -- test/e2e/specs/editor/collaboration/websocket/collaboration-triage-98e7f896ffb0-realistic.spec.ts --project=chromium --workers=1
WP_ENV_PORT=9997 WP_BASE_URL=http://localhost:9997 npm run wp-env-test -- stop
```

Results:

- Focused repro unit file: PASS, 6 tests.
- Existing CRDT block unit file: PASS, 71 tests.
- Targeted strict JS lint: exit 0.
- `git diff --check origin/trunk..HEAD`: exit 0.
- Natural Playwright repro: PASS, 2 scenarios in 42.3 s.
- Pass-178 result JSONs showed `convergenceError: null`, matching block-name
  arrays, and no `core/table` in either editor after deletion.

Pass 178 keeps the practical-impact classification at `medium`. The stronger
evidence added in this pass is branch/artifact sufficiency after current trunk
advanced: the natural-user Playwright repro still passes after the upstream
collaboration helper refactor, and the fix stack remains a clean three-commit
delta on current `origin/trunk`.

## Pass 179 current-trunk refresh

Pass 179 rebased both requested branches onto current `origin/trunk` again:

- `origin/trunk`: `e20ec719971 isFulfilled: don't change resolution state, call in resolveSelect (#78151)`.
- PR branch head after rebase:
  `88055dbd956 Advance RTC block merge base after remote delivery`.
- PR branch commit order:
  1. `7b48f941462 Add RTC remote insert delete CRDT repro`
  2. `9750909673b Add WebSocket table delete Playwright repro`
  3. `88055dbd956 Advance RTC block merge base after remote delivery`

Pass 179 reran the required known-fixes negative control on the May 7
backlink-aware base `f256024286d` plus only the repro commit
`56aed5919a3`. The result again reproduced the causal split:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-remote-insert-delete-base.test.ts -- --runInBand --no-cache --testNamePattern='preserves a remote table insert|does not reintroduce a remote table|matches the source order|deletes delivered blocks while preserving unseen remote inserts|does not reintroduce a remote paragraph|does not reintroduce a remote nested paragraph'
```

Result:

- `preserves a remote table insert when a stale local snapshot edits another block`: PASS.
- `does not reintroduce a remote table after that remote insert has become the local base`: FAIL; received a trailing `core/table`.
- `matches the source order: collaborator paragraph, primary table, collaborator table delete`: FAIL; received table content after the collaborator delete.
- `deletes delivered blocks while preserving unseen remote inserts in the same stale snapshot`: FAIL; retained the delivered-deleted paragraph alongside the unseen table.
- `does not reintroduce a remote paragraph after that remote insert has become the local base`: FAIL; retained the delivered-deleted paragraph.
- `does not reintroduce a remote nested paragraph after that remote insert has become the local base`: FAIL; retained the delivered-deleted nested paragraph.

Fresh verification on the pass-179 rebased PR branch:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-remote-insert-delete-base.test.ts -- --runInBand --no-cache
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --no-cache
node ./tools/eslint/lint-js.cjs --config eslint.config.strict.cjs packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/crdt.ts packages/core-data/src/utils/test/crdt-remote-insert-delete-base.test.ts test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts test/e2e/specs/editor/collaboration/websocket/collaboration-triage-98e7f896ffb0-realistic.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9997 WP_BASE_URL=http://localhost:9997 npm run wp-env-test -- status
WP_ENV_PORT=9997 WP_BASE_URL=http://localhost:9997 RTC_MANIFEST_WS_START_PORT=21176 RTC_MANIFEST_WS_FIXED_PORT=1 npm run wp-env-test -- start
WP_ENV_PORT=9997 WP_BASE_URL=http://localhost:9997 GUTENBERG_RTC_TEST_WS_PORT=21176 RTC_98E7_REALISTIC_REPRO_DIR=/Users/danluu/dev/fuzz/gutenberg-bug-98e7f896ffb0/artifacts/pass-179/playwright-fixed-results npm run --workspace @wordpress/e2e-tests-playwright test:e2e:rtc-websocket -- specs/editor/collaboration/websocket/collaboration-triage-98e7f896ffb0-realistic.spec.ts --project=chromium --workers=1
WP_ENV_PORT=9997 WP_BASE_URL=http://localhost:9997 npm run wp-env-test -- stop
```

Results:

- Focused repro unit file: PASS, 6 tests.
- Existing CRDT block unit file: PASS, 71 tests.
- Targeted strict JS lint: exit 0.
- `git diff --check origin/trunk..HEAD`: exit 0.
- Natural WebSocket Playwright repro: PASS, 2 scenarios in 24.3 s via the
  current `playwright.rtc-websocket.config.ts` harness.
- Pass-179 result JSONs showed `convergenceError: null`, matching block-name
  arrays, and no `core/table` in either editor after deletion.

Pass 179 keeps the practical-impact classification at `medium`. The additional
evidence in this pass is a current-trunk refresh after the WebSocket suite moved
to the dedicated `test:e2e:rtc-websocket` config: default-config runs failed in
readiness before any table operation, but the correct WebSocket harness passed
the natural-user repro on the fixed branch.
