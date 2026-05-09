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

Revised plan after pass 174: add the unit-level base-snapshot sibling-insert regression first, then fix `mergeCrdtBlocks()` so base-aware local snapshots also preserve remote client IDs that were not present in the base and are not explicitly deleted locally. The fix should run before the left-right full-array fallback and should use client-id ancestry, not timing or selection state. After the structural invariant passes, keep the natural Playwright `Add after` repro because it verifies the real editor action path, per-key typing, and transport convergence. If partial character loss remains after structural preservation, instrument the rich-text delta path separately.

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
- Failure JSON, pass-170 160 ms/key: `/tmp/5fe795b32c10-p170-knownfix-default18991-type160-output/attempt-1.json`
- Failure screenshots: `/tmp/5fe795b32c10-p170-knownfix-default18991-type160-output/attempt-1-primary.png`, `/tmp/5fe795b32c10-p170-knownfix-default18991-type160-output/attempt-1-secondary.png`
- Trace copy: `/tmp/5fe795b32c10-p170-knownfix-default18991-type160-trace.zip`
- Annotated stitched video: `/tmp/5fe795b32c10-p170-current-knownfix-type160-annotated.mp4`
