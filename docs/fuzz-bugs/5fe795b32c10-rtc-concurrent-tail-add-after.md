# RTC concurrent tail Add after corrupts typed paragraphs

Bug signature: `5fe795b32c10`

Transport: websocket

## Summary

Two collaborators editing the same post can converge on corrupted paragraph text when both select the same tail paragraph, use the block toolbar `Add after` action, and then type into the newly inserted paragraph concurrently. The bug is not the old May 5 readiness false positive: on the May 7 known-fixes base, WebSocket awareness reaches the ready state, both `Add after` menu actions run, both peers converge, and the final converged block tree contains the original three top-level blocks plus two inserted paragraphs with missing characters.

The current evidence points at a real input/selection/sync race during key-by-key typing after concurrent block insertion. A single atomic `keyboard.insertText()` control passed, while ordinary key-by-key typing at both 10 ms/key and 160 ms/key corrupted content.

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

## Practical Impact

Likelihood: `medium`.

The natural workflow is ordinary post editor collaboration over the WebSocket RTC test transport:

1. Two users or two tabs open the same post.
2. The post has existing top-level content ending in a paragraph.
3. Both users select the same tail paragraph.
4. Both choose block toolbar Options -> `Add after`.
5. Both type into the newly inserted paragraph before the concurrent insertion and selection state fully settle.

Multiple users/tabs and RTC collaboration are required. No save/reload, injected malformed blocks, direct state mutation, or network delay is required to observe the defect. Human-speed typing at 160 ms/key still lost a character, so the race is not limited to an unrealistically fast Playwright path, although the exact workflow requires both collaborators to edit the same insertion point at nearly the same time.

Blast radius is content corruption, not just a UI-only mismatch. Both peers converge to the same wrong text, the editor remains dirty, and saving would persist the corrupted paragraphs. Recovery is manual retyping or undo if noticed quickly; if saved or autosaved unnoticed, the corrupted content can survive.

## Root-Cause Direction

The previous pass correctly identified the archived old run as a readiness false positive: no `Add after` actions occurred and the generated spec caught readiness errors as reproduction. That does not explain the current-base run.

The current run reaches WebSocket readiness and executes natural actions. The strongest current hypothesis is a selection/input race after concurrent block insertion:

- `packages/core-data/src/actions.js` sends each cached typing update through `getSyncManager().update()` with a `baseRecord`.
- `packages/core-data/src/utils/crdt.ts` passes the edited blocks, parsed selection cursor, and base blocks into `mergeCrdtBlocks()`.
- The current known-fixes stack includes cursor scoping in `packages/core-data/src/utils/crdt-blocks.ts`, so mis-scoped rich-text cursor hints across unrelated blocks are less likely than in older baselines.
- Atomic full-text insertion passes while key-by-key typing fails, pointing toward transient selection/focus restoration or stale local snapshots during per-key sync rather than a deterministic final-state merge failure.

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

Revised plan: first instrument and prove whether each missing character was present in the local block tree before sync. Without that proof, a fix risks papering over either DOM selection loss or CRDT overwrite with a timing workaround.

## Artifacts

- Failure JSON, 160 ms/key: `/tmp/5fe795b32c10-p170-knownfix-default18991-type160-output/attempt-1.json`
- Failure screenshots: `/tmp/5fe795b32c10-p170-knownfix-default18991-type160-output/attempt-1-primary.png`, `/tmp/5fe795b32c10-p170-knownfix-default18991-type160-output/attempt-1-secondary.png`
- Trace copy: `/tmp/5fe795b32c10-p170-knownfix-default18991-type160-trace.zip`
- Annotated stitched video: `/tmp/5fe795b32c10-p170-current-knownfix-type160-annotated.mp4`

