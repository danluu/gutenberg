# RTC WebSocket Block-Type And Attribute Leakage

Bug signature: `747c653e7b3b`

Transport: websocket

Status: adapter-level reproduction survives the May 7 known-fixes manifest base `f256024286dd80a4c0e2579f658c109256abf648`. A later sibling branch, `try/rtc-top-level-move-after-checkpoint-duplicates-heading-and-9cf81e169f7e-pr` at `c8af86c24a5`, fixes this exact low-level shape, but that branch is not a complete artifact lane for this signature.

## Summary

The handoff row is non-runnable and has no materialized Playwright spec, but it describes seed `953417` producing permanent two-peer divergence after websocket disruption. The preserved analysis rows report ordinary Paragraph, Group, Pullquote, and Heading blocks becoming crosswired after save checkpoints, reload, mixed edits, and a final top-level move.

Pass 174 reconstructed the core failure through `applyPostChangesToCRDTDoc`, using valid block objects and an explicit `baseRecord.blocks` checkpoint:

1. Start from Paragraph, Group with nested Paragraph, Paragraph, Pullquote, Heading, Paragraph.
2. Let the live CRDT document receive two top-level inserted Paragraphs and a remote edit inside the Group.
3. Apply a stale checkpoint-view top-level Group move with `baseRecord.blocks` set to the checkpoint.

On `f256024286d`, the final tree drops the two live inserted Paragraphs, moves nested Group content into the Pullquote, reverts the moved Group's nested edit, and puts Pullquote-only `value` and `citation` attributes on a Paragraph. On `c8af86c24a5`, the same test passes.

## Root Cause

At `f256024286d`, `mergeCrdtBlocks()` bypasses stale snapshot reconciliation when callers provide an explicit base:

```ts
const blocksToSync = baseBlocksToSync
	? localBlocksToSync
	: reconcileStaleLocalBlocks( yblocks, localBlocksToSync );
```

That means a stale full block array submitted with `baseRecord.blocks` can omit remote top-level blocks already present in the Yjs document. Because the current Yjs block set and the stale incoming block set differ, client-id rebase/reorder cannot safely handle the move, and the code falls through to the positional merge path. That path updates `yblocks.get( index )` with `blocksToSync[ index ]`, so heterogeneous siblings can receive another block's `name`, `attributes`, and `innerBlocks`.

Relevant history:

- `84019935998c` introduced the broad positional post-entity CRDT merge logic.
- `1a46ebf1621c` added base-record/rebase machinery for stale RTC merge bugs.
- `5bda437f0cc4` added stale top-level reconciliation for the no-explicit-base path.
- `f256024286d` integrated the known-fixes stack but still bypasses stale reconciliation for explicit `baseRecord.blocks`.
- `c8af86c24a5` lets stale reconciliation use the explicit base snapshot and fixes this exact reconstructed `747c653e7b3b` case.

## Practical Impact

Real-user likelihood: low for affected WebSocket RTC deployments; very-low across the broad default Gutenberg installed base. The corruption is in the shared post-entity CRDT merge path, but Gutenberg's built-in provider is HTTP polling and WebSocket transport requires a provider supplied through the `sync.providers` filter.

Natural workflow: two users or tabs in the post editor using websocket RTC; ordinary Paragraph, Group, Pullquote, and Heading blocks; save/reload or checkpoint history; one participant receives live collaborator inserts/edits in the CRDT document, then submits a stale checkpoint-view top-level Group move before the visible block tree has caught up. Multiple active sessions and a narrow timing window are required.

Common prerequisites are the involved block types, draft saves, reloads, content edits, and block moves. RTC is an early-access plugin feature and may be enabled on plugin installs where collaboration is allowed, but WebSocket is not the default provider. Rare prerequisites are a WebSocket RTC provider, an explicit-base stale full-block snapshot, concurrent remote top-level inserts, and a move across heterogeneous siblings. The exact marker strings and action order are fuzz-derived.

Blast radius: real content corruption, not UI-only. Affected code can drop inserted blocks, move nested content to the wrong block type, leak Pullquote attributes onto Paragraphs, diverge peers, and persist corrupted markup if the bad tree is saved. Recovery is undo/reload before save, or revision restore/manual repair after save.

## Reproduction Evidence

Pass 175 rebuilt the focused adapter-level repro in fresh detached worktrees:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-175/work/747c653e7b3b-pass175/f256
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-175/work/747c653e7b3b-pass175/c8af
```

Temporary test:

```text
packages/core-data/src/utils/test/crdt-747c653e7b3b-pass175-explicit-base.test.ts
```

On `f256024286d`, the test failed because the final block client IDs dropped both live inserted Paragraphs:

```text
Expected: intro, remote-insert, middle, pullquote, local-insert, heading, tail, group
Received: intro, middle, pullquote, heading, tail, group
```

On `c8af86c24a5`, the same test passed. The same repro and fix are also carried on:

```text
https://github.com/danluu/gutenberg/tree/try/rtc-websocket-convergence-corruption-with-block-type-and-a-747c653e7b3b-pr
```

Scratch test path:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-174/work/747-pass174-f256-explicit-base/packages/core-data/src/utils/test/crdt-747c653e7b3b-pass174-explicit-base.test.ts
```

Failing command on exact known-fixes manifest base:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-174/work/747-pass174-f256-explicit-base
npm run test:unit -- packages/core-data/src/utils/test/crdt-747c653e7b3b-pass174-explicit-base.test.ts -- --runInBand
```

Result: failed. Expected final client IDs included `remote-insert` and `local-insert`; received `intro, middle, pullquote, heading, tail, group`. Diagnostic final tree also showed Pullquote carrying the Group nested Paragraph and the tail Paragraph carrying Pullquote `value` and `citation`.

Passing command on the later sibling fix branch:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-174/work/747-pass174-c8af-explicit-base
npm run test:unit -- packages/core-data/src/utils/test/crdt-747c653e7b3b-pass174-explicit-base.test.ts -- --runInBand
```

Result: passed.

Both runs emitted the known symlinked-dependency Yjs duplicate-import warning; it did not prevent execution.

Pass 176 checked the product call chain for the explicit-base case. Local post edits call the sync manager with `baseRecord: editedRecord`; the sync manager forwards that option to the post sync config; `applyPostChangesToCRDTDoc()` then passes `options.baseRecord.blocks` into `mergeCrdtBlocks()`. This makes the explicit-base path a normal collaborative editor path, not a test-only hook.

Pass 176 also reran the carried regression on the PR branch. At test-only commit `07e637acb29`, after adding the same package-local dependency symlinks used by previous passes, the test fails with the two live inserted block IDs missing:

```text
Expected: intro, remote-insert, middle, pullquote, local-insert, heading, tail, group
Received: intro, middle, pullquote, heading, tail, group
```

At PR branch head `74516c1fbb7`, the same focused test passes:

```text
PASS packages/core-data/src/utils/test/crdt-747c653e7b3b-pass175-explicit-base.test.ts
Tests: 1 passed, 1 total
```

Pass 177 rechecked the branch after rebasing the explanation write-up onto current `origin/trunk`. A fresh detached worktree at the test-only commit `07e637acb29` failed with the same dropped live block IDs:

```text
Expected: intro, remote-insert, middle, pullquote, local-insert, heading, tail, group
Received: intro, middle, pullquote, heading, tail, group
```

The PR branch head `74516c1fbb7` passed the same test in place. The pass-177 code audit also confirmed that the WebSocket transport is not the key data-corrupting layer: the failing path is shared once a provider delivers remote Yjs updates and a local full-block edit reaches `mergeCrdtBlocks()` with `baseRecord.blocks`.

Pass 178 repeated the same fail/pass check in a fresh detached test-only worktree:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-178/work/747c653e7b3b-test-only
```

At `07e637acb29`, the test failed with the same dropped live block IDs:

```text
Expected: intro, remote-insert, middle, pullquote, local-insert, heading, tail, group
Received: intro, middle, pullquote, heading, tail, group
```

At PR branch head `74516c1fbb7`, the same test passed. Pass 178 also inspected the local WebSocket e2e harness: `test/e2e/playwright.rtc-websocket.config.ts` enables the test provider plugin and starts `bin/rtc-test-ws-sync-server.mjs`, while `packages/e2e-tests/plugins/rtc-websocket-provider/index.js` exposes test controls for delaying the next message or closing the next socket. Those controls could force the historical transport disruption, but they would be an injected test fault. A strict natural-user Playwright repro still needs to create the stale explicit-base interleaving through editor timing, save/reload, and ordinary block actions alone.

## Fix Plan

Initial fix: reconcile explicit `baseRecord.blocks` edits against the explicit base before merging.

Audit result: sufficient for this reconstructed `747c653e7b3b` low-level case because it preserves live remote top-level blocks in `blocksToSync` and keeps Group-local edits attached to the Group client ID. Adjacent stale-move summaries indicate a broader family can still need an additional guard: after a successful client-id reorder, merge by client ID and return instead of falling through to positional left/right merge.

Robust plan:

1. Make stale reconciliation accept an optional explicit base snapshot.
2. Call stale reconciliation for explicit-base block edits.
3. For client-id-resolved reorders, update matched blocks by client ID and avoid positional fallback.
4. Cover both this Pullquote/Group/Heading shape and the adjacent ghost-Group stale-move shape with tests.

Kernel-maintainer check: the fix should narrow identity-aware behavior and preserve remote client IDs rather than infer deletions from a stale full snapshot.

Jepsen-style check: concurrent remote inserts/edits and a local move are operations over stable block identity; block type, attributes, and innerBlocks must remain attached to the same client ID.

Simplicity/performance check: the fix should reuse existing reconciliation/reorder helpers and avoid adding a larger transform system. Browser coverage is still needed because rebuilding Y blocks during reorder can affect selection/history behavior.

## Missing Artifact

This explanation does not include a natural-user Playwright repro or video. The exact manifest row is non-runnable, has no source spec, and the original exact result artifacts are unavailable locally. Pass 178 found that the local WebSocket harness can inject delay/socket-close events, but using those controls would not satisfy a strict natural-user-action repro. The shortest remaining experiment is a two-peer websocket Playwright test that uses ordinary editor actions, save/reload timing, and a final top-level Group move before post-live-edit convergence, then asserts both peers' normalized block trees for dropped inserted Paragraphs and Pullquote/Group/Paragraph attribute leakage.
