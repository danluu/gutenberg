# RTC top-level move reconciliation can drop a sibling after a remote insert

Bug signature: `66edd42bfa52`

Canonical duplicate family: `ec47d94c5251`

## Classification

This is a real Gutenberg RTC product bug. The archived HTTP Playwright run
used normal editor actions and failed after the visible actions completed,
during the final collaborative convergence check.

The user-level sequence is:

1. User A deletes a top-level heading.
2. User B inserts a paragraph before the original first paragraph.
3. User A moves that original first paragraph below its sibling.

The intended converged paragraph order is:

```text
inserted, sibling, moved
```

The failing receiving editor state for `66edd42bfa52` is:

```text
inserted, moved, moved
```

So one paragraph is duplicated and the sibling paragraph is lost in that editor.
This is not a locator-only failure, readiness wait, malformed generated spec,
inverted assertion, or expected behavior. The failure is visible in the
materialized block tree and serialized post content.

## Practical Impact

Real-user likelihood: `low`.

It is not `very-low` for sites running the Gutenberg plugin RTC path because the
repro uses ordinary post-editor controls over ordinary top-level paragraph
blocks. It is not `medium` or `high` for Gutenberg overall because it requires
collaborative editing, overlapping edits in the same short top-level block
range, and timing that lets a stale full-block snapshot or same-array reorder
echo reach the CRDT merge layer.

Natural workflow:

- Editor surface: post editor.
- Transport: HTTP polling in the archived source failure.
- Blocks: ordinary `core/heading` and `core/paragraph` blocks.
- Timing: two browser tabs or users edit the same nearby top-level region while
  RTC propagation is active.
- Save/reload: no save or reload is required to create the divergent live
  editor state. A later save can persist whichever editor has the corrupted
  tree.
- Network delay: no injected packet loss or artificial transport fault is
  needed, but ordinary async delivery must interleave with the edits.
- Editing order: fuzz-found and narrow, but each visible action is normal
  editor behavior.

Common prerequisites are paragraphs, a delete, Add before or Insert before, and
Move down. Rare prerequisites are two collaborators changing the same short
top-level list close together and one editor re-emitting a stale or cache-hidden
block order. Artificial/fuzz-derived pieces are the exact seed content and the
tight action ordering.

Blast radius:

- Content loss/corruption: yes, a sibling paragraph can disappear in one
  editor.
- Duplicate content: yes, the moved paragraph can appear twice.
- UI-only inconsistency: no, the bad state is in the editor block tree and
  serialized content.
- Persistence failure: possible if the corrupted editor saves.
- Save loop: no evidence.
- Performance/OOM risk: no evidence.
- Recovery: undo while available, copy from the intact collaborator, or restore
  from post revisions after a bad save.

Strongest evidence for `low`: archived browser failure used normal controls;
screenshots and error context show duplicate/lost content; a pass-170 focused
unit negative control fails on the current known-fixes base; the refreshed fix
passes the focused and full CRDT unit suites.

Strongest evidence against a higher likelihood: RTC collaboration is outside
single-user editing; the users must touch the same nearby block region; and the
bad result depends on stale full snapshots or top-level array reuse, not every
move.

Shortest confidence-improving experiment: run the natural Playwright sequence
100-200 times with small randomized delays between delete, insert-before, and
move-down while logging each emitted block array order and object identity.
That would estimate timing sensitivity rather than only reachability.

## Source Evidence

Source result:

```text
signature=66edd42bfa52
bugType=rtc_top_level_move_reconciliation_preserves_inserted_block_and_drops_moved_sibling
transport=http
result=failed
exitCode=1
timedOut=false
durationMs=46070
startedAt=2026-05-05T10:22:43.731Z
completedAt=2026-05-05T10:23:29.801Z
```

The source failure state was:

```text
primary:      inserted paragraph, sibling paragraph, moved paragraph
collaborator: inserted paragraph, moved paragraph, moved paragraph
```

Source artifacts:

- Manifest:
  `/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/likely-real-issues.jsonl`
- Source log:
  `/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-2/fuzz-handoff/distinct-manifest-20260505/results-refresh-http-shard-2/logs/0014-66edd42bfa52-rtc-top-level-move-reconciliation-preserves-inserted-block-and-drops-moved-sibling.log`
- Error context and screenshots:
  `/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-2/fuzz-handoff/distinct-manifest-20260505/results-refresh-http-shard-2/outputs/0014-66edd42bfa52/playwright-artifacts/test-results/editor-collaboration-triag-c1f21-ic-ec47-realistic-attempt-1-chromium/`

## Current Known-Fixes Recheck

The current known-fixes base is:

```text
f256024286dd80a4c0e2579f658c109256abf648
Integrate RTC known-fix stack
```

That base is not enough. Pass 170 added an uncommitted focused test file in a
temporary worktree. Pass 171 independently repeated the negative control with a
standalone test file to avoid depending on the overlapping known-fixes test
conflict:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-171/work/66edd42bfa52-knownfix-standalone/packages/core-data/src/utils/test/66edd42bfa52-pass171-knownfix.test.ts
```

Command:

```bash
npm run test:unit packages/core-data/src/utils/test/66edd42bfa52-pass171-knownfix.test.ts -- --runInBand
```

Result:

```text
FAIL packages/core-data/src/utils/test/66edd42bfa52-pass171-knownfix.test.ts
2 failed

observes a move when the same top-level block array object is reused
Expected: [ "Inserted paragraph", "Sibling paragraph", "Moved paragraph" ]
Received: [ "Inserted paragraph", "Moved paragraph", "Sibling paragraph" ]

preserves a remote insert and moved sibling after a stale echo
Expected: [ "Inserted paragraph", "Sibling paragraph", "Moved paragraph" ]
Received: [ "Inserted paragraph", "Moved paragraph", "Sibling paragraph" ]
```

The current known-fixes branch has stale-snapshot reconciliation helpers, but it
also has `serializableBlocksCache`. If the editor reuses a top-level block
array object and mutates its entries for a move, the cached serializable copy
can hide the new order before `mergeCrdtBlocks()` compares it.

## Root Cause

`mergeCrdtBlocks()` receives full Gutenberg block snapshots and reconciles them
into a Yjs block array. The original positional diff, introduced by
`84019935998c16f877e976ad85e84748355d7282` in PR #72262, did not retain enough
local-base information to distinguish:

- a harmless local echo of the already-converged remote order; from
- a real local move emitted from a stale full snapshot; or
- a real local move hidden behind same-array object reuse.

Later RTC work added tests and rich-text/table merge improvements, but the
stale top-level order and same-array move cases remained uncovered. Pass 170's
extra negative control narrows the current-base failure to the object-identity
cache path.

Useful origin commands:

```bash
git log --oneline --decorate -- packages/core-data/src/utils/crdt-blocks.ts
git blame -L 400,1040 origin/trunk -- packages/core-data/src/utils/crdt-blocks.ts
git show 84019935998c16f877e976ad85e84748355d7282 --summary --format=fuller
git show 128a3c29b7f1db4f35faf9e326dd1e5e7ac11104 --summary --format=fuller
git show f256024286dd80a4c0e2579f658c109256abf648 -- packages/core-data/src/utils/crdt-blocks.ts
```

## Fix Plan

Initial plan: preserve the existing full-snapshot boundary, store the previous
local block snapshot per Yjs block array, and rebase incoming local snapshots
against the previous local and current CRDT snapshots by unique sibling
`clientId`.

Kernel-maintainer robustness:

- Use client-id-based reconciliation only when all compared siblings have
  unique IDs.
- Fall back to the existing merge behavior when IDs are missing or duplicated.
- Keep the fix localized to `mergeCrdtBlocks()`.

Jepsen-style correctness:

- A stale full snapshot must not erase a remote insert or undo a local move just
  because array positions line up with an older view.
- Remote-only blocks are reinserted by current-neighbor anchors.
- Unchanged local attributes and inner blocks are rebased from current CRDT
  state so unrelated remote edits survive.

Simplicity and failure-mode skepticism:

- A first-class collaborative move operation would be cleaner long-term, but it
  is a protocol change. This patch fixes the current full-snapshot ingestion
  point.
- The extra work is linear over sibling arrays already being walked.
- Same-array object reuse must be handled by serializing current inputs each
  call, not by caching on array identity.

## Branches

Explanation branch:

```text
try/rtc-top-level-move-reconciliation-preserves-inserted-block-66edd42bfa52
```

PR branch:

```text
try/rtc-top-level-move-reconciliation-preserves-inserted-block-66edd42bfa52-pr
```

Pass 174 rebased both branches onto:

```text
b38f9b4d86d Fix lockfile drift and missing dep from content-types consolidation (#78109)
```

PR branch commit order after the pass 174 refresh:

```text
038f583e8eb Add RTC stale top-level move merge regressions
a4eb8d2fc24 Add RTC top-level move Playwright repro
d4f1db34ab6 Preserve RTC block order across stale snapshots
```

Remote PR head pushed to `danluu` after the pass 174 refresh:

```text
d4f1db34ab6101bfc4bccfb5b070439a6f2e8bf0 try/rtc-top-level-move-reconciliation-preserves-inserted-block-66edd42bfa52-pr
```

## Verification

Known-fixes negative control failed on `f2560242` as described above.

Pass 174 repeated the known-fixes negative control by checking out the rebased
test file on top of:

```text
f256024286dd80a4c0e2579f658c109256abf648 Integrate RTC known-fix stack
```

Command:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='preserves a remotely inserted block and the moved sibling after a stale top-level move|observes reordered blocks when the editor reuses the same block array reference|preserves the moved sibling when a same-array move follows a remote insert echo'
```

Result: exit code `1`; the stale full-snapshot repro passed, but both
same-array/cache-sensitive repros failed with the stale order:

```text
Inserted paragraph, Emoji and multibyte, Another paragraph
```

That narrows the remaining known-fixes failure to the
`serializableBlocksCache` object-identity path.

Fixed-branch focused unit test:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='preserves a remotely inserted block and the moved sibling after a stale top-level move|observes reordered blocks when the editor reuses the same block array reference|preserves the moved sibling when a same-array move follows a remote insert echo'
```

Result: `PASS`, 3 passed.

Fixed-branch full CRDT unit file:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand
```

Result: `PASS`, 78 passed.

Fixed-branch lint:

```bash
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
```

Result: exit code 0.

Pass 174 also reran the natural-user Playwright repro on the rebased fixed
branch with one attempt:

```bash
WP_ENV_PORT=10026 WP_BASE_URL=http://localhost:10026 WP_ENV_PHPMYADMIN_PORT=10027 RTC_MANIFEST_WS_START_PORT=21408 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-174/playwright-output/66edd42bfa52 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: `1 passed (30.7s)`. Both editors converged to:

```text
RTC ec47 realistic inserted paragraph 1
Another paragraph exists so the top-level list is not degenerate.
Emoji and multibyte: hi 👋🏼, cafe, naive, こんにちは, مرحبا.
```

Diff check:

```bash
git diff --check HEAD~3..HEAD
```

Result: exit code 0.

Pass-171 build attempt:

```bash
npm run build
```

Result: failed after the JS and PHP build subtasks completed. The failing step
was primitive color token generation in
`packages/theme/bin/generate-primitive-tokens/index.ts`, where `colorjs.io`
reported `[object Object] is not a valid color space`. No working-tree files
were modified by the failed build.

Browser rerun status for pass 171:

```bash
WP_ENV_PORT=10026 WP_BASE_URL=http://localhost:10026 npm run wp-env status
```

Result: environment `uninitialized`. Pass 170 therefore reused the existing
annotated headless browser video from the earlier successful repro work and
added a pass-170 verification slide rather than starting another wp-env stack.
Pass 171 did not start a new wp-env stack because the unit-level negative
control, fixed-branch unit tests, lint, and existing annotated headless browser
artifact already covered the product defect, while the build remained blocked
outside the RTC patch.

Pass 175 rechecked the branch state after fetching current `origin/trunk`:

```text
b38f9b4d86d0505199f5efd78c2adf213e428e78 Fix lockfile drift and missing dep from content-types consolidation (#78109)
```

Both explanation and PR branches were already based on that commit and pushed
to `danluu`.

Pass 175 reran the focused fixed-branch unit repros:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-blocks.ts -- --runInBand --testNamePattern='preserves a remotely inserted block and the moved sibling after a stale top-level move|observes reordered blocks when the editor reuses the same block array reference|preserves the moved sibling when a same-array move follows a remote insert echo'
```

Result: `PASS`, 3 passed. It also reran the full `crdt-blocks` unit file
(`PASS`, 78 passed), `npm run lint:js` for the three touched files (exit code
0), and `git diff --check HEAD~3..HEAD` (exit code 0).

Pass 175 repeated the known-fixes negative control in a detached worktree at
`f256024286dd80a4c0e2579f658c109256abf648`, with the PR branch's regression
test file overlaid. The stale full-snapshot test passed, but the two
same-array/cache-sensitive tests failed:

```text
observes reordered blocks when the editor reuses the same block array reference
preserves the moved sibling when a same-array move follows a remote insert echo
```

Both received the stale order:

```text
Inserted paragraph, Emoji and multibyte, Another paragraph
```

That independently confirms the current known-fixes base still has the
`serializableBlocksCache` object-identity gap. A one-attempt known-fixes
browser run in the same detached worktree did not reach the editing sequence:
`waitForCollaborationReady()` timed out before `_wpCollaborationEnabled` became
true. Pass 175 therefore treats that browser result as an environment/harness
failure, not as product evidence for or against the bug.
