# RTC concurrent tail Add after corrupts typed paragraphs

Bug signature: `5fe795b32c10`

Transport: websocket

## Summary

Two collaborators editing the same post can converge on corrupted paragraph text when both select the same tail paragraph, use the block toolbar `Add after` action, and then type into the newly inserted paragraph concurrently. The bug is not the old May 5 readiness false positive: on the May 7 known-fixes base, WebSocket awareness reaches the ready state, both `Add after` menu actions run, both peers converge, and the final converged block tree contains the original three top-level blocks plus two inserted paragraphs with missing characters.

The current evidence points at a stale full-block-snapshot merge race during key-by-key typing after concurrent block insertion. A single atomic `keyboard.insertText()` control passed, while ordinary key-by-key typing at both 10 ms/key and 160 ms/key corrupted content. Pass 173 further reproduced the defect with about a one-second post-menu delay plus jitter, then confirmed that using the normal `Save draft` button persists the corrupted paragraphs into REST `content.raw`. Pass 174 reproduced a stronger variant with 1.8-2.4 second post-menu waits: both `Add after` actions succeeded and both users typed, but the converged editor dropped one entire inserted sibling paragraph.

## Reproduction Evidence

Known-fixes base:

- Worktree: `/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-current-20260507`
- Branch/commit: `rtc-known-fixes-current-20260507` at `f256024286dd80a4c0e2579f658c109256abf648`
- Manifest caveat: this is a synthetic current-base stack with recent trunk plus the known RTC fix set; proposed fixes were merged best-effort where conflicts overlapped in CRDT code.

The aligned WebSocket run used the default test provider port `18991`, because the PHP test plugin falls back to `18991` unless the wp-env PHP process itself has `GUTENBERG_RTC_TEST_WS_PORT` in its environment.

Failing command:

```bash
env WP_ENV_HOME=/tmp/wp-env-5fe795b32c10-p170 \
	WP_ENV_PORT=9970 \
	WP_BASE_URL=http://localhost:9970 \
	WP_ENV_PHPMYADMIN_PORT=9971 \
	RTC_5FE7_ADD_AFTER_ATTEMPTS=1 \
	RTC_5FE7_ADD_AFTER_TYPE_DELAY_MS=160 \
	RTC_5FE7_ADD_AFTER_OUTPUT_DIR=/tmp/5fe795b32c10-p170-knownfix-default18991-type160-output \
	npm run test:e2e:rtc-websocket -- \
	test/e2e/specs/editor/collaboration/websocket/collaboration-triage-5fe795b32c10-add-after-realistic.spec.ts \
	--project=chromium --workers=1
```

Observed converged content on both peers:

```text
Long shared paragraph used as the initial collaborative editing surface.
Follow-up heading
Tail paragraph kept for save and reload stability checks.
RTC 5fe7 add-after collaborator paragraph 1
TC 5fe7 add-after primary paragraph 1
```

Expected inserted primary text was `RTC 5fe7 add-after primary paragraph 1`; the leading `R` was dropped even with a 160 ms/key delay.

Pass 172 added repeatability checks against the same known-fixes commit using a
detached worktree with a real copied `build/` directory and the WebSocket
provider aligned to port `20960`. The earlier pass-171 "very-low" likelihood
classification is no longer supported: 160 ms/key typing reproduced repeatedly,
including with explicit post-menu pauses intended to model human reaction time.

```bash
env WP_ENV_HOME=/tmp/wp-env-5fe795b32c10-p172 \
	WP_ENV_PORT=9970 \
	WP_BASE_URL=http://localhost:9970 \
	WP_ENV_PHPMYADMIN_PORT=9971 \
	GUTENBERG_RTC_TEST_WS_PORT=20960 \
	RTC_MANIFEST_WS_START_PORT=20960 \
	RTC_MANIFEST_WS_FIXED_PORT=1 \
	RTC_5FE7_ADD_AFTER_ATTEMPTS=20 \
	RTC_5FE7_ADD_AFTER_TYPE_DELAY_MS=160 \
	RTC_5FE7_ADD_AFTER_POST_MENU_DELAY_MS=0 \
	RTC_5FE7_ADD_AFTER_OUTPUT_DIR=/tmp/5fe795b32c10-p172-knownfix-type160-postdelay0-attempts20-output \
	npm run test:e2e:rtc-websocket -- \
	test/e2e/specs/editor/collaboration/websocket/collaboration-5fe795b32c10-pass171-add-after-delay.spec.ts \
	--project=chromium --workers=1
```

Result: attempts 1-5 passed, attempt 6 failed and Playwright stopped the rest.
Both peers converged on a primary paragraph missing the leading `R`:

```text
TC 5fe7 add-after primary paragraph 6
RTC 5fe7 add-after collaborator paragraph 6
```

With a 250 ms pause after `Add after`, attempts 1-3 passed and attempt 4
failed. Both peers converged on a primary paragraph missing the `RTC ` prefix:

```text
5fe7 add-after primary paragraph 4
RTC 5fe7 add-after collaborator paragraph 4
```

With a 500 ms pause after `Add after`, attempts 1-2 passed and attempt 3
failed. Both peers converged on a primary paragraph missing the space before the
attempt number:

```text
RTC 5fe7 add-after primary paragraph3
RTC 5fe7 add-after collaborator paragraph 3
```

Trace timing for the 500 ms failure confirms this was not immediate
post-menu typing: one `Add after` click completed at 26616 ms, the other at
26634 ms, the test waited 500 ms on both pages, and typing began at 27127 ms
and 27137 ms with a 160 ms/key delay.

Pass 173 pushed the timing farther away from an automation-only immediate
typing path. It used the same detached known-fixes worktree at
`f256024286dd80a4c0e2579f658c109256abf648`, the same natural block toolbar
`Add after` action, and a temporary spec that records actual post-menu waits.
With 160 ms/key typing, a 1000 ms base post-menu delay, and +/-200 ms jitter,
attempts 1-5 passed and attempt 6 failed. The two `Add after` clicks completed
29 ms apart; the peers then waited 1149 ms and 1002 ms respectively before
typing. Both peers converged to:

```text
TC 5fe7 add-after primary paragraph 6
RTC 5fe7 add-after collaborator paragraph 6
```

A second pass-173 run saved after detecting corruption. With actual post-menu
waits of 1019 ms and 853 ms, attempt 2 converged both peers to:

```text
RTC 5fe7 add-after collaborator paragraph 2
5fe7 add-after primary paragraph 2
```

After clicking the normal `Save draft` button, REST `content.raw` contained both
corrupted inserted paragraphs:

```html
<!-- wp:paragraph -->
<p>RTC 5fe7 add-after collaborator paragraph 2</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>5fe7 add-after primary paragraph 2</p>
<!-- /wp:paragraph -->
```

At 10 ms/key, both inserted paragraphs were more severely corrupted:

```text
RTC 5fe7 adter prfmarypaaph 1
RTC 5fe7 add-after collabrato paragraph 1
```

Control command that passed:

```bash
env WP_ENV_HOME=/tmp/wp-env-5fe795b32c10-p170 \
	WP_ENV_PORT=9970 \
	WP_BASE_URL=http://localhost:9970 \
	WP_ENV_PHPMYADMIN_PORT=9971 \
	RTC_5FE7_ADD_AFTER_ATTEMPTS=1 \
	RTC_5FE7_ADD_AFTER_INPUT_MODE=insertText \
	RTC_5FE7_ADD_AFTER_OUTPUT_DIR=/tmp/5fe795b32c10-p170-knownfix-default18991-insertText-output \
	npm run test:e2e:rtc-websocket -- \
	test/e2e/specs/editor/collaboration/websocket/collaboration-triage-5fe795b32c10-add-after-realistic.spec.ts \
	--project=chromium --workers=1
```

This strongly suggests the failure requires interleaved per-key editor updates, which is how ordinary typing arrives, rather than a purely structural inability to merge two final inserted paragraphs.

Pass 174 tested the shortest timing follow-up from pass 173. The first 2-second jitter run failed on attempt 10 because a page timed out clicking the `Add after` menu item; that was classified as harness/action-locator noise, not this product bug. A rerun with action-locator failures separated failed on attempt 2 at the state assertion. Both toolbar `Add after` clicks completed 48 ms apart; the primary page waited 2435 ms and the collaborator waited 1775 ms before typing at 160 ms/key. Both peers were WebSocket-connected and synced, both typed, and both converged to four blocks containing only the collaborator's inserted paragraph:

```text
Long shared paragraph used as the initial collaborative editing surface.
Follow-up heading
Tail paragraph kept for save and reload stability checks.
RTC 5fe7 add-after collaborator paragraph 2
```

Artifacts:

- JSON: `/tmp/5fe795b32c10-p174-knownfix-type160-postdelay2000-jitter500-classified-attempts20-output/attempt-2.json`
- Screenshots: `/tmp/5fe795b32c10-p174-knownfix-type160-postdelay2000-jitter500-classified-attempts20-output/attempt-2-primary.png`, `/tmp/5fe795b32c10-p174-knownfix-type160-postdelay2000-jitter500-classified-attempts20-output/attempt-2-secondary.png`
- Trace: `/private/tmp/gutenberg-5fe795-p171-knownfix.SlckNV/test/e2e/artifacts/test-results/editor-collaboration-webso-1cb81-d-after-realistic-attempt-2-chromium/trace.zip`

Pass 174 also added a temporary unit-level repro that exercises the same merge invariant without Playwright, browser focus, menus, or WebSocket. It initializes `mergeCrdtBlocks()` with three paragraph blocks, applies a remote append, then applies a stale local append with the original three-block base snapshot. The current known-fixes code drops `Remote inserted` and leaves `Local inserted`:

```text
Expected: Alpha, Beta, Tail, Remote inserted, Local inserted
Received: Alpha, Beta, Tail, Local inserted
```

Command:

```bash
npm run test:unit -- packages/core-data/src/utils/test/rtc-tail-insert-base-repro.test.ts
```

Temporary repro file: `/private/tmp/gutenberg-5fe795-p171-knownfix.SlckNV/packages/core-data/src/utils/test/rtc-tail-insert-base-repro.test.ts`.

Pass 175 rebuilt that proof in the existing post CRDT adapter path rather than calling only the block merge helper. The new test applies an initial post, applies a remote tail append, then applies a local tail append with `options.baseRecord.blocks` still pointing at the initial three-block snapshot. On the exact known-fixes SHA `f256024286dd80a4c0e2579f658c109256abf648`, the test fails by dropping `Remote inserted`:

```text
Expected: Alpha, Beta, Tail, Remote inserted, Local inserted
Received: Alpha, Beta, Tail, Local inserted
```

Applying the adjacent RTC fix from `try/rtc-top-level-move-after-checkpoint-duplicates-heading-and-9cf81e169f7e-pr` makes the same focused test pass. The fix changes `mergeCrdtBlocks()` so the base-record path also runs `reconcileStaleLocalBlocks( yblocks, localBlocksToSync, baseBlocksToSync )`, preserving current remote client IDs before the left-right fallback. This is a narrow root-cause proof for the whole-paragraph loss seen in pass 174; the older partial-character failures still need a natural Playwright rerun on the fixed branch to prove they are covered by the same structural fix.

## Practical Impact

Likelihood: `medium`.

The natural workflow is ordinary post editor collaboration over the WebSocket RTC test transport:

1. Two users or two tabs open the same post.
2. The post has existing top-level content ending in a paragraph.
3. Both users select the same tail paragraph.
4. Both choose block toolbar Options -> `Add after`.
5. Both type into the newly inserted paragraph before the concurrent insertion and selection state fully settle.

Multiple users/tabs and RTC collaboration are required. No save/reload, injected malformed blocks, direct state mutation, or network delay is required to observe the defect. Human-speed typing at 160 ms/key still loses characters after 250 ms, 500 ms, roughly 1 second, and now 1.8-2.4 second post-menu waits, so the race is not limited to an unrealistically fast Playwright path, although the exact workflow requires both collaborators to choose the same insertion point almost simultaneously.

Blast radius is content corruption, not just a UI-only mismatch. Both peers converge to the same wrong text, the editor remains dirty, and pass 173 verified that saving persists the corrupted paragraphs into post content. Recovery is manual retyping or undo if noticed quickly; after save/reload, recovery depends on revisions or manual repair.

## Root-Cause Direction

The previous pass correctly identified the archived old run as a readiness false positive: no `Add after` actions occurred and the generated spec caught readiness errors as reproduction. That does not explain the current-base run.

The current run reaches WebSocket readiness and executes natural actions. Pass 174 narrows the strongest current hypothesis from general selection/input loss to a stale full-block-snapshot merge gap in the base-record path:

- `packages/core-data/src/actions.js` sends each cached typing update through `getSyncManager().update()` with a `baseRecord`.
- `packages/core-data/src/utils/crdt.ts` passes the edited blocks, parsed selection cursor, and base blocks into `mergeCrdtBlocks()`.
- `mergeCrdtBlocks()` has stale local snapshot reconciliation for the no-base path (`reconcileStaleLocalBlocks()`), which preserves remote top-level inserts before running the full-array merge.
- Real editor updates normally arrive with `baseRecord`; when `baseBlocksToSync` is present, `mergeCrdtBlocks()` uses `localBlocksToSync` directly and skips `reconcileStaleLocalBlocks()`.
- For concurrent sibling inserts, the by-client-id rebase guards reject the merge because the base/current/incoming block arrays do not have the same client-id set and length. The code then falls back to the left-right full-array merge, where the stale local four-block snapshot is treated as authoritative and the remote fifth block can be overwritten or deleted.
- The temporary unit repro confirms this path without any browser or transport: a remote top-level append is dropped when the local append is merged with a base snapshot.
- The current known-fixes stack includes cursor scoping in `packages/core-data/src/utils/crdt-blocks.ts`, so mis-scoped rich-text cursor hints across unrelated blocks are less likely than in older baselines. Partial text corruption may still involve rich-text delta ordering, but the pass-174 whole-paragraph loss is explained by structural stale-snapshot rebasing.

The likely origin is in the RTC block merge/selection architecture introduced by the CRDT block sync work and later cursor-aware rich-text updates, especially:

- `84019935998c` / PR `#72262`: base CRDT merge logic for post entities.
- `30c040ca8415` / PR `#73699`: cursor-aware rich-text delta updates.
- `54af1ce40068` / PR `#77662`: cursor scoping fix, which prevents a class of cross-field cursor bugs but does not cover this concurrent Add-after typing race.
- The known-fixes synthetic stack then adds stale snapshot and by-client-id rebasing work, yet the repro still survives.

## Fix Plan

Initial plan:

1. Add an e2e regression that keeps the user path natural: toolbar `Add after`, then key-by-key typing, with a human-speed delay case.
2. Add a lower-level regression only if it can honestly model two local editor docs applying interleaved key updates and remote block insertion without inventing malformed block trees.
3. Instrument the selection and block-sync path to confirm whether dropped characters are lost before they enter the local block tree or are overwritten by a later CRDT merge.
4. If lost before CRDT, fix the selection/focus preservation path around remote block-tree application while a local RichText field is active.
5. If overwritten by CRDT, tighten base-record rebasing so local key deltas for a newly inserted block are never merged against or replaced by a stale remote snapshot.

Audit:

- Kernel-maintainer robustness: the fix should preserve local user input as the highest-priority invariant and must not depend on timing sleeps, trace-only ordering, or one transport.
- Jepsen-style correctness: two peers inserting distinct sibling blocks at the same position and typing distinct text should converge to a state containing both exact strings. Convergence to the same corrupted value is still a consistency failure because it loses acknowledged local writes.
- Simplicity/performance skepticism: avoid broad serialization locks on all block updates; a targeted guard around active RichText/local pending input or a narrower CRDT rebase invariant is preferable to delaying all remote updates.

Revised plan after pass 175: keep the lower-level adapter regression as commit 1, keep the natural toolbar `Add after` Playwright repro as commit 2, and use the base-aware stale-snapshot reconciliation fix as commit 3. Before treating the fix as complete, rerun the Playwright repro on the fixed branch with the 160 ms/key and 2000 ms +/-500 ms post-menu jitter settings. If the structural paragraph loss is gone but partial character loss remains, instrument the rich-text delta path separately.

## Pass 176 Follow-up

Pass 176 independently checked the pushed PR branch rather than relying only on
the pass-175 summary.

The adapter-level before/after result is clean:

- Pre-fix PR-branch commit `1967025afb9` fails
  `packages/core-data/src/utils/test/crdt-stale-top-level-blocks.test.ts` on
  the stale-base tail append case, dropping `Remote inserted` and keeping
  `Local inserted`.
- Fixed PR-branch head `9b0f26239f1` passes the same six-test file.

That confirms the 12-line base-record reconciliation change is necessary for
the whole-paragraph loss proven by the post CRDT adapter. It does not yet prove
the user-visible browser bug is fixed.

Pass 176 also tried the committed natural Playwright repro on fixed head
`9b0f26239f1` with the isolated environment
`WP_ENV_HOME=/tmp/wp-env-5fe795b32c10-p176`, `WP_ENV_PORT=9970`, and
`RTC_MANIFEST_WS_START_PORT=20960`. Both the initial run and a rerun after
`wp option update wp_collaboration_enabled 1` failed before any `Add after`
action: `waitForCollaborationReady()` timed out because
`window._wpCollaborationEnabled` never became true. The attempt JSON has no
snapshots, so this is a harness/readiness failure, not evidence of surviving
content corruption on the fixed branch.

The committed Playwright repro currently catches all errors in `runAttempt()`
and marks them as `reproduced`. That is too broad for final branch quality: a
readiness timeout can be reported with the same top-level failure message as a
real state-corruption assertion. The branch still needs either the pass-174
classified repro logic or equivalent setup-error classification before the
browser test can be used as fixed-branch proof.

## Pass 177 Follow-up

Pass 177 hardened the PR-branch Playwright repro so it records one of
`passed`, `reproduced`, or `inconclusive`, records the phase that failed, and
only marks product reproduction when the run reaches the converged-state
assertion. It also adds the pass-174 timing knobs to the committed spec:

- `RTC_5FE7_ADD_AFTER_TYPE_DELAY_MS`
- `RTC_5FE7_ADD_AFTER_POST_MENU_DELAY_MS`
- `RTC_5FE7_ADD_AFTER_POST_MENU_JITTER_MS`

With that classification in place, the fixed PR branch no longer failed at
readiness in the isolated pass-177 environment. It reached the converged-state
assertion on attempt 1 and reproduced a product failure with both inserted
paragraphs present but the primary paragraph corrupted:

```text
RTC 5fe7 add-after primary paragrph 1
RTC 5fe7 add-after collaborator paragraph 1
```

The two `Add after` actions completed 7 ms apart. The pages then waited
1920 ms and 1522 ms before typing at 160 ms/key. Both peers converged to the
same corrupted five-block state, so the pass-175 structural fix is incomplete:
it addresses the whole-paragraph stale-base loss but not the natural per-key
rich-text corruption.

Pass 177 also added and pushed a narrower lower-level regression for a locally
inserted block whose stale base-record snapshot is replayed after the current
Yjs value has advanced. The test fails on the previous PR head `9b0f26239f1`
with `RTC primary paragrph` and passes after preserving current rich text for
inserted blocks that are unchanged from the last local snapshot. That patch is
useful for one stale-replay shape, but it is not a complete product fix.

After restoring a usable `build/` tree and patching the generated
`build/scripts/core-data/index.js` for local verification, the same natural
browser run still failed on attempt 1:

```text
RTC 5fe7 add-after primraragraph 1
RTC 5fe7 add-after collaborator paragraph 1
```

The `Add after` actions completed 35 ms apart; the pages waited 2070 ms and
2248 ms before typing at 160 ms/key. This leaves the root cause narrower but
still unresolved: the surviving natural bug is below top-level block
preservation and below a simple stale replay of an unchanged inserted-block
snapshot. The next useful investigation is an instrumented browser run that
logs every primary-block `content` value entering `mergeRichTextUpdate()`, the
resolved cursor `{ clientId, attributeKey, offset }`, and the resulting Y.Text
after each key. That should distinguish a bad incoming full snapshot from a bad
rich-text delta/cursor application.

## Pass 178 Follow-up

Pass 178 added a temporary adapter-level probe on PR head `e32f9d80c02` to test
one remaining stale full-snapshot shape: an inserted paragraph reaches
`RTC primary paragraph`, then an older queued key snapshot with the same
inserted block at `RTC primary paragrap` is applied with an older base record.
The branch rolls the CRDT value back to the older string:

```text
Expected: Alpha, Beta, Tail, RTC primary paragraph
Received: Alpha, Beta, Tail, RTC primary paragrap
```

Command:

```bash
npm run test:unit -- packages/core-data/src/utils/test/crdt-stale-top-level-blocks.test.ts --runInBand
```

Temporary worktree: `/private/tmp/5fe795-pass178-prqueue.AoAStk`.

This is not a replacement for the browser instrumentation requested in pass
177, because it does not prove that browser events are actually reordered in
that exact way. It does show why the current partial fix is not a general
"never roll acknowledged inserted-block text backward" invariant: the guard
handles an exact stale replay, but a queued snapshot that differs from its base
is still treated as authoritative and can overwrite a newer Y.Text value.

## Artifacts

- Failure JSON, pass-172 160 ms/key no post-menu pause: `/tmp/5fe795b32c10-p172-knownfix-type160-postdelay0-attempts20-output/attempt-6.json`
- Failure JSON, pass-172 160 ms/key with 250 ms post-menu pause: `/tmp/5fe795b32c10-p172-knownfix-type160-postdelay250-attempts20-output/attempt-4.json`
- Failure JSON, pass-172 160 ms/key with 500 ms post-menu pause: `/tmp/5fe795b32c10-p172-knownfix-type160-postdelay500-attempts10-output/attempt-3.json`
- Failure JSON, pass-173 160 ms/key with 1000 ms +/-200 ms post-menu jitter: `/tmp/5fe795b32c10-p173-knownfix-type160-postdelay1000-jitter200-attempts20-output/attempt-6.json`
- Save-persistence JSON, pass-173 160 ms/key with 1000 ms +/-200 ms post-menu jitter: `/tmp/5fe795b32c10-p173-knownfix-type160-postdelay1000-jitter200-save-attempts20-output/attempt-2.json`
- Pass-173 trace, jittered failure: `/private/tmp/gutenberg-5fe795-p171-knownfix.SlckNV/test/e2e/artifacts/test-results/editor-collaboration-webso-cee7d-d-after-realistic-attempt-6-chromium/trace.zip`
- Pass-173 trace, save-persistence failure: `/private/tmp/gutenberg-5fe795-p171-knownfix.SlckNV/test/e2e/artifacts/test-results/editor-collaboration-webso-58c40-d-after-realistic-attempt-2-chromium/trace.zip`
- Failure JSON, pass-174 160 ms/key with 2000 ms +/-500 ms post-menu jitter: `/tmp/5fe795b32c10-p174-knownfix-type160-postdelay2000-jitter500-classified-attempts20-output/attempt-2.json`
- Pass-174 trace, 2-second jitter failure: `/private/tmp/gutenberg-5fe795-p171-knownfix.SlckNV/test/e2e/artifacts/test-results/editor-collaboration-webso-1cb81-d-after-realistic-attempt-2-chromium/trace.zip`
- Temporary pass-174 unit-level repro: `/private/tmp/gutenberg-5fe795-p171-knownfix.SlckNV/packages/core-data/src/utils/test/rtc-tail-insert-base-repro.test.ts`
- Pass-175 fixed-branch unit repro: `packages/core-data/src/utils/test/crdt-stale-top-level-blocks.test.ts` on `try/rtc-concurrent-tail-insert-corrupts-or-diverges-top-level--5fe795b32c10-pr`
- Pass-175 PR branch URL: `https://github.com/danluu/gutenberg/tree/try/rtc-concurrent-tail-insert-corrupts-or-diverges-top-level--5fe795b32c10-pr`
- Pass-176 pre-fix repro worktree: `/private/tmp/5fe795-pass176-prefix.r3ksp7`
- Pass-176 fixed-branch readiness failure JSON:
  `/tmp/5fe795b32c10-p176-fixed-natural-afteroption-attempts20-output/attempt-1.json`
- Pass-176 fixed-branch readiness trace:
  `/private/tmp/5fe795-pass175-knownfix.Pu0Ir5/test/e2e/artifacts/test-results/editor-collaboration-webso-d842e-d-after-realistic-attempt-1-chromium/trace.zip`
- Pass-177 fixed-branch classified failure JSON before the inserted-block
  replay guard:
  `/tmp/5fe795b32c10-p177-prfixed-classified-type160-postdelay2000-jitter500-attempts20-output/attempt-1.json`
- Pass-177 fixed-branch classified trace before the inserted-block replay
  guard:
  `/private/tmp/5fe795-pass175-knownfix.Pu0Ir5/test/e2e/artifacts/test-results/editor-collaboration-webso-d842e-d-after-realistic-attempt-1-chromium/trace.zip`
- Pass-177 fixed-branch classified failure JSON after the inserted-block
  replay guard and local generated-bundle patch:
  `/tmp/5fe795b32c10-p177-prfix2-built-classified-type160-postdelay2000-jitter500-attempts20-output/attempt-1.json`
- Failure JSON, pass-170 160 ms/key: `/tmp/5fe795b32c10-p170-knownfix-default18991-type160-output/attempt-1.json`
- Failure screenshots: `/tmp/5fe795b32c10-p170-knownfix-default18991-type160-output/attempt-1-primary.png`, `/tmp/5fe795b32c10-p170-knownfix-default18991-type160-output/attempt-1-secondary.png`
- Trace copy: `/tmp/5fe795b32c10-p170-knownfix-default18991-type160-trace.zip`
- Annotated stitched video: `/tmp/5fe795b32c10-p170-current-knownfix-type160-annotated.mp4`
