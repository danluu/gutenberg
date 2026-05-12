# RTC stale table row prepend after remote append

Bug signature: `943c670fbf29`

## Summary

`mergeCrdtBlocks()` can drop an already-acknowledged table row when a stale local
snapshot prepends a `core/table` body row after another collaborator has appended
a row to the same table. Pass 177 confirmed the same loss through the May 7
known-fixes `applyPostChangesToCRDTDoc()` entry point with the same
`changes.blocks` plus `options.baseRecord.blocks` shape that `editEntityRecord()`
forwarded to the sync manager in that base.

The focused low-level reproduction starts both peers with:

```text
A1
A2
```

Peer B appends:

```text
remote-appended
```

Peer A then applies a stale local table body snapshot that only prepends:

```text
local-prepended
A1
A2
```

The expected merged table is:

```text
local-prepended
A1
A2
remote-appended
```

On trunk and on the May 7 backlink-aware known-fixes base, the CRDT merge drops
`remote-appended` and converges to only three rows.

## Practical Impact

Real-user likelihood: low.

The affected surface is the post editor with real-time collaboration enabled,
over the WebSocket transport in the source handoff. The involved block type is
`core/table`, specifically its `attributes.body` query array. The harmful
interleaving requires two live collaborators editing one table: one collaborator
appends a row, while the other client later sends a table-body snapshot based on
the old two-row table but with a local prepended row.

The low-level defect is real, but the practical browser path is narrow. Natural
Playwright checks tried in pass 170 did not reproduce the stale snapshot without
test-only timing control: the block HTML editor returned to visual mode after a
remote row, the full Code Editor received the remote row, an open table menu
closed when the remote update arrived, and ordinary sequential/concurrent table
toolbar append/prepend actions converged. Pass 176 also checked the natural
undo/redo suspicion: synced entities use a Yjs-backed undo manager whose
WordPress history `addRecord()` method is a no-op, so redo replays Yjs
operations instead of submitting an old full `blocks` array. A focused control
test on the known-fixes base confirmed local prepend, undo, remote append, redo
keeps the remote row. Pass 177 raised confidence that the defect is on the real
post sync entry point, not only a helper-level artifact, but it did not find a
stock UI gesture that naturally produces the stale `baseRecord` after the remote
append is already integrated. This points to low likelihood in ordinary manual
use, while still leaving risk for rare editor timing windows, slow clients,
plugin code that submits stale block snapshots, or future UI paths that buffer
table HTML longer.

Blast radius if hit: silent content loss/corruption of table rows in the live
CRDT document. There is no evidence of duplicate content, save loops,
performance/OOM issues, or a UI-only inconsistency for the low-level repro.
Recovery is manual re-entry, undo while the losing editor still has history, or
post revisions/autosave if the loss is persisted.

## Root Cause

The original CRDT post merge machinery came from `84019935998c` ("Improve CRDT
\"merge logic\" for post entities", #72262). Table query arrays were then made
schema-aware by `09a21c64b5b9` (#76913), and array structural changes were
stabilized by `a6bfd3e55432` (#77164) with a left/right sweep in `mergeYArray()`.

That left/right sweep has no memory of the last local block snapshot. When the
current shared Y.Array is `[ A1, A2, remote-appended ]` and the incoming stale
local plain array is `[ local-prepended, A1, A2 ]`, the fallback diff cannot know
that `remote-appended` was not intentionally deleted. It treats the shared tail
as replaceable and rewrites the array to the stale local length.

The May 7 higher-level sync path can supply exactly that shape:
`editEntityRecord()` passes the current edited record as `baseRecord`, and
`applyPostChangesToCRDTDoc()` passes `baseRecord.blocks` down into
`mergeCrdtBlocks()`. If the edited-record snapshot is stale while the local
Y.Doc already contains the collaborator's appended row, the stale base guards in
the May 7 known-fixes base do not protect the remote row. Current `origin/trunk`
has since removed that explicit `baseRecord` parameter from
`applyPostChangesToCRDTDoc()`, so the refreshed PR branch's post-entry test uses
the current three-argument API and verifies the same remote-row preservation
above the helper boundary.

Related proposed fixes in the known-fixes stack, especially `876398df67b`
(PR `77775`) and `1a46ebf1621` (PR `77924`), added stale snapshot handling and
stable table query-array identity for adjacent cases. The exact length-changing
local prepend after remote append still failed on the required May 7 synthetic
known-fixes base `f256024286dd80a4c0e2579f658c109256abf648`.

## Fix Plan

Track the previous local block snapshot for each Y block array and use it as a
base when merging local array attributes. For query arrays, apply local edits
relative to that base: merge paired changed rows, delete rows that the local
snapshot actually removed, and insert rows that the local snapshot actually
added without treating concurrently appended remote rows as deletions. The
pass-177 PR branch folds a post-sync-entry regression into the non-browser test
commit so this protection is checked above the helper boundary as well.

Robustness audit:

- Kernel-maintainer view: avoid special-casing table row labels or serialized
  HTML; keep the fix in the shared CRDT merge path and add a regression test for
  the exact stale local prepend shape.
- Distributed-systems view: the merge must preserve acknowledged remote updates
  unless the local operation is causally based on a snapshot that contained and
  removed them. A stale local snapshot cannot delete a row it never observed.
- Simplicity/performance view: a WeakMap cache of previous local snapshots keeps
  the API unchanged and bounds the extra state to live Y arrays. Stable hidden
  query-array IDs make duplicate row matching safer, but increase code size; the
  residual risk is future query-array cases with ambiguous identity.

## Verification

Pass 177 refreshed both branches onto current `origin/trunk`
`bf2d0cc1f1e914a95cca7dd32872977b93483263` ("Editor: Refactor
'PostPublishPanel' into function component", #78083).

Pass 177 added a higher-level known-fixes repro in a clean detached worktree at
the exact May 7 synthetic known-fixes SHA
`f256024286dd80a4c0e2579f658c109256abf648`:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-177/943c670fbf29-knownfix-f256
npm run test:unit -- packages/core-data/src/utils/test/crdt-943c670fbf29-pass177-applypost.test.ts --runInBand
```

Result: failed through `applyPostChangesToCRDTDoc()` with received rows
`local-prepended,A1,A2` instead of
`local-prepended,A1,A2,remote-appended`.

Pass 177 refreshed PR-branch verification:

```bash
cd /private/tmp/943c670fbf29-pass177-pr
npm install
npm run test:unit -- packages/core-data/src/utils/test/crdt-stale-table-row-prepend.test.ts --runInBand
npm run build
WP_ENV_PORT=10100 WP_BASE_URL=http://localhost:10100 npm run wp-env-test -- start
WP_ENV_PORT=10100 WP_BASE_URL=http://localhost:10100 RTC_MANIFEST_WS_START_PORT=22000 RTC_MANIFEST_WS_FIXED_PORT=1 GUTENBERG_RTC_TEST_WS_PORT=22000 npm run test:e2e:rtc-websocket -- test/e2e/specs/editor/collaboration/websocket/collaboration-943c670fbf29-table-row-prepend.spec.ts --project=chromium --workers=1 --reporter=list --trace on
```

Result: passed; both the direct `mergeCrdtBlocks()` repro and the current
`applyPostChangesToCRDTDoc()` post-entry repro preserved `remote-appended`.
Production build completed successfully after a fresh `npm install`. The focused
WebSocket e2e passed after the branch's e2e spec was hardened to clear stale
primary-browser origin storage and to wait until both participants show the
intended initial table before switching to Code Editor. Earlier pass-177 e2e
attempts failed before exercising the merge because the default wp-env lacked
the test plugin, and then because stale editor state appeared before the table
record was ready.

Pass 178 refreshed both branches onto current `origin/trunk`
`96263113a874ab1fc1668f7bb500c98766e90e76` ("Dashboard: staging layer for
in-progress layout edits", #78071). Current trunk now includes shared RTC
WebSocket test infrastructure from #78179, so the PR branch's browser-coverage
commit was narrowed to the bug-specific spec plus a small
`playwright.rtc-websocket.config.ts` adjustment that lets the WebSocket suite
actually include `websocket-only/` specs while the default suite continues to
ignore them.

Pass 178 reran the known-fixes survival check on the exact May 7 synthetic
known-fixes SHA `f256024286dd80a4c0e2579f658c109256abf648`:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-177/943c670fbf29-knownfix-f256
npm run test:unit -- packages/core-data/src/utils/test/crdt-943c670fbf29-pass177-applypost.test.ts --runInBand
```

Result: still failed with received rows `local-prepended,A1,A2` instead of
`local-prepended,A1,A2,remote-appended`.

Pass 178 verification on the rebased PR branch:

```bash
cd /private/tmp/943c670fbf29-pass177-pr
npm install
npm run test:unit -- packages/core-data/src/utils/test/crdt-stale-table-row-prepend.test.ts --runInBand
npm run build
WP_ENV_PORT=10100 WP_BASE_URL=http://localhost:10100 npm run wp-env-test -- status
WP_ENV_PORT=10100 WP_BASE_URL=http://localhost:10100 npm run wp-env-test -- start
WP_ENV_PORT=10100 WP_BASE_URL=http://localhost:10100 RTC_MANIFEST_WS_START_PORT=22000 RTC_MANIFEST_WS_FIXED_PORT=1 GUTENBERG_RTC_TEST_WS_PORT=22000 npm run test:e2e:rtc-websocket -- specs/editor/collaboration/websocket-only/collaboration-943c670fbf29-table-row-prepend.spec.ts --project=chromium --workers=1 --reporter=list --trace on
WP_ENV_PORT=10100 WP_BASE_URL=http://localhost:10100 npm run wp-env-test -- stop
```

Results: focused unit regression passed, production build passed, and the
signature-specific headless WebSocket browser spec passed. Before the
`npm install`, the first pass-178 browser attempt failed before Playwright
started because `@y/websocket-server` was missing from the rebased worktree's
`node_modules`; after dependency refresh the next attempt used an obsolete
workspace path and reported "No tests found"; the final workspace-relative
command above passed.

Pass 179 rebased both existing branches onto current `origin/trunk`
`fc8b3db6ace471328e39453e3eed552ad4f3de7a` ("Dashboard: use design animation
tokens", #78204). The intervening trunk commits did not touch
`packages/core-data/src/utils/crdt-blocks.ts`, `packages/core-data/src/utils/crdt.ts`,
the focused CRDT tests, or the RTC WebSocket collaboration specs/config.

Pass 179 reran the exact known-fixes survival check against the May 7 synthetic
known-fixes SHA `f256024286dd80a4c0e2579f658c109256abf648`:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-177/943c670fbf29-knownfix-f256
npm run test:unit -- packages/core-data/src/utils/test/crdt-943c670fbf29-pass177-applypost.test.ts --runInBand
```

Result: still failed with received rows `local-prepended,A1,A2` instead of
`local-prepended,A1,A2,remote-appended`.

Pass 179 reran the focused non-browser regression on the rebased PR branch:

```bash
cd /private/tmp/943c670fbf29-pass177-pr
npm run test:unit -- packages/core-data/src/utils/test/crdt-stale-table-row-prepend.test.ts --runInBand
```

Result: passed, 2 tests.

Pass 176 refreshed both branches onto current `origin/trunk`
`5fc7223e96b2751c57b6c4ae840bb9e838bee9f0` ("Classic Block: Use onReplace prop
for migration actions", #78113), which did not touch the RTC/table merge
surface.

Known-fixes survival was rerun in a new detached pass-176 worktree at the exact
May 7 synthetic known-fixes SHA `f256024286dd80a4c0e2579f658c109256abf648`:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-176/943c670fbf29-knownfix-f256
npm run test:unit -- packages/core-data/src/utils/test/crdt-943c670fbf29-pass176-knownfix.test.ts --runInBand
```

Result: failed with received rows `local-prepended,A1,A2` instead of
`local-prepended,A1,A2,remote-appended`.

Pass 176 undo/redo control on the same known-fixes worktree:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-176/943c670fbf29-knownfix-f256
npm run test:unit -- packages/core-data/src/utils/test/crdt-943c670fbf29-pass176-knownfix.test.ts --runInBand --testNamePattern='does not reproduce through a Yjs undo redo replay'
```

Result: passed. This is negative evidence for stock editor undo/redo as the
stale concrete `blocks` source.

Pass 176 fixed-branch verification after rebasing the PR branch onto current
`origin/trunk`:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-943c670fbf29
npm run test:unit -- packages/core-data/src/utils/test/crdt-stale-table-row-prepend.test.ts --runInBand
npm run build
```

Result: focused regression passed; production build completed successfully.

Pass 174 known-fixes survival check, rerun against the exact May 7 synthetic
known-fixes SHA `f256024286dd80a4c0e2579f658c109256abf648` in a detached
throwaway worktree:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-173/work-knownfix-f256
npm run test:unit -- packages/core-data/src/utils/test/crdt-943c670fbf29-pass173-knownfix.test.ts --runInBand
```

Result: failed with received rows `local-prepended,A1,A2` instead of
`local-prepended,A1,A2,remote-appended`.

Pass 174 branch refresh rebased the explanation and PR branches onto current
`origin/trunk` `b38f9b4d86d0505199f5efd78c2adf213e428e78`. The focused
fixed-branch regression passed after that rebase:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-943c670fbf29
npm run test:unit -- packages/core-data/src/utils/test/crdt-stale-table-row-prepend.test.ts --runInBand
```

Result: passed.

Pass 173 fix branch verification after rebasing the PR branch onto
`origin/trunk` `80699422e632c4a8876499d31ad8a49759dffb47`:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-943c670fbf29
npm run test:unit -- packages/core-data/src/utils/test/crdt-stale-table-row-prepend.test.ts --runInBand
npm install
npm run build
WP_ENV_PORT=10101 WP_BASE_URL=http://localhost:10101 npm run wp-env-test -- start
WP_ENV_PORT=10101 WP_BASE_URL=http://localhost:10101 RTC_MANIFEST_WS_START_PORT=22000 RTC_MANIFEST_WS_FIXED_PORT=1 GUTENBERG_RTC_TEST_WS_PORT=22000 npm run test:e2e:rtc-websocket -- test/e2e/specs/editor/collaboration/websocket/collaboration-943c670fbf29-table-row-prepend.spec.ts --project=chromium --workers=1 --reporter=list --trace on
```

Result: unit regression, production build, and natural WebSocket browser
coverage all passed after the fix. The browser coverage demonstrates the
ordinary table-row workflow and transport wiring, but it is not a failing
pre-fix repro for the exact stale low-level snapshot.
