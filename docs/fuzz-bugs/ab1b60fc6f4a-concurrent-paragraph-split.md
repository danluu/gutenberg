# RTC concurrent paragraph split can corrupt adjacent text

Bug signature: `ab1b60fc6f4a`

Fuzz type: `rtc_concurrent_append_after_checkpoint_interleaves_text`

## Status

The supplied refresh artifact for this signature originally failed in harness readiness, not in the scenario itself: it waited for a stale HTTP `wp-sync` response while the websocket provider only exposes websocket synchronization plus `/health` and `/reset`. After replaying the same natural-user-action spec against the current known-fixes base `f256024286dd80a4c0e2579f658c109256abf648`, with websocket readiness using `window.__gutenbergTestWebSocketSync`, the scenario fails reliably.

The practical workflow is more specific than the generated type name suggests. Two collaborators focus the same wrapped paragraph before a Search block, press `End`, press `Enter`, and type different paragraph text concurrently. In Chromium this can split at the visual line end rather than the logical paragraph end. The shared checkpoint paragraph is truncated and its suffix is interleaved into one or both inserted paragraphs.

## Reproduction Evidence

Known-fixes command:

```bash
export WP_ENV_PORT=9969
export WP_BASE_URL=http://localhost:9969
export GUTENBERG_RTC_TEST_WS_PROVIDER=1
export GUTENBERG_RTC_TEST_WS_PORT=18991
export GUTENBERG_RTC_TEST_WS_URL=ws://127.0.0.1:18991
export WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-170/ab1b60fc6f4a-playwright-artifacts-18991-four
export RTC_AB1B60FC6F4A_ATTEMPTS=4
export RTC_AB1B60FC6F4A_OUTPUT_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-170/ab1b60fc6f4a-knownfix-results-18991-four
curl -sS -X POST http://127.0.0.1:18991/reset >/dev/null
npm exec --workspace @wordpress/e2e-tests-playwright -- wp-scripts test-playwright --config playwright.config.ts test/e2e/specs/editor/collaboration/triage-ab1b60fc6f4a-realistic.spec.ts --project=chromium --workers=1 --retries=0
```

Result: 4/4 attempts failed after both users reached websocket readiness. The canonical failure shape is:

```text
rtc-save-paragraph-marker-95325
Seed 953255 step 4 user 0 ... 5-3-0-end
Seed 953255 step 4 user 1 ... 5-3-0-end
```

The expected checkpoint paragraph is `rtc-save-paragraph-marker-953255-3-0-end`, so the text suffix is moved out of the original paragraph and mixed into the concurrent inserted paragraphs.

Pass 171 added an independent phase probe on the same known-fixes base. It split the workflow into natural user phases:

1. both users clicked the same checkpoint paragraph and pressed `End`;
2. both users pressed `Enter`;
3. both users typed into the newly split paragraph.

The probe failed on the first run using websocket sync. After the `Enter` phase, both peers had converged on a coherent block structure:

```text
rtc-save-paragraph-marker-95325
5-3-0-end
5-3-0-end
```

The two carets were at offset `0` in two different newly inserted paragraph `clientId`s. Only after the concurrent typing phase did the content corrupt, for example:

```text
Seed 95-255 step 4 use3 0 concurrent-paragraph 1851130-end
Seed 953255 step54 user 1 cn-rren3 pa-0-rend9409
```

This narrows the defect: concurrent `Enter` creates duplicate suffix paragraphs, but the destructive interleaving happens while both users type before identical suffix text in separate split paragraphs.

Pass 172 added timing and negative root-cause probes:

- Temporarily disabling shifted-selection restoration in the built `core-data` bundle did not fix the failure. The phase probe still corrupted both inserted paragraphs, so shifted selection is not sufficient as a root cause.
- A lower-level `mergeCrdtBlocks()` probe that modeled divergent per-browser editor `clientId`s around the concurrent split still preserved both typed strings. This makes a pure CRDT block-array merge bug less likely.
- The browser repro is cadence-sensitive. With `page.keyboard.type()` delay `50ms`, one inserted paragraph still had the checkpoint suffix injected into the middle of the typed sentence. With `80ms` and `120ms`, the same phase probe preserved both user strings, although the concurrent split still duplicated the suffix into both inserted paragraphs.

This makes the destructive interleaving look like a tight live editor/input race: remote sync applies block updates while the browser is still dispatching real key events into contenteditable paragraphs created by the same concurrent split.

Pass 173 checked whether the issue is limited to the wrapped-line `End` behavior. A widened viewport still left `End` at offset `31` in the 40-character checkpoint paragraph, so the original seed is genuinely a visual-line split. A second probe then sent nine `ArrowRight` key presses after `End`, putting both collaborators at offset `40`, the true logical end of the paragraph. On the clean known-fixes base `f256024286dd80a4c0e2579f658c109256abf648`, that true-end append variant still failed at `10ms` per character:

```text
rtc-save-paragraph-marker-953255-3-0-end
Seed 953255 step 4 user0 cocrrent pragaph 185113
Seed 953255 stepse 1 concurrent pargraph 169
```

In that run, after concurrent `Enter` both users were selected at offset `0` in different newly inserted empty paragraph `clientId`s. The original checkpoint paragraph stayed intact, and the corruption appeared only during concurrent typing. A matched true-end run at `50ms` per character preserved both user strings. This means the bug is not limited to suffix-duplication from visual-line splitting, but the true-end destructive variant is more cadence-sensitive than the original wrapped-line seed.

## Likely Root Cause

`mergeCrdtBlocks` was introduced by `84019935998` (`Improve CRDT "merge logic" for post entities`, PR #72262). Its left/right sweep uses block positions as a fallback when reconciling full block snapshots into Yjs block arrays. Later RTC fix work added saved-base snapshots and client-id rebasing, but the observed failure still reaches a browser path where a local full snapshot, the current Yjs array, and the block-editor selection are changing while keyboard input continues to stream.

Pass 171 tested three lower-level hypotheses:

- Typing before the suffix into one scoped `Y.Text` via `mergeRichTextUpdate` preserves the suffix.
- Two synced Yjs clients typing into two already-known split paragraph `clientId`s preserve both typed strings and suffixes.
- The same two-client model still preserves both paragraphs when each client's previous local snapshot omitted the remote split sibling.

Those lower-level probes did not reproduce the browser corruption. Pass 172 also failed to reproduce the corruption with a closer divergent-editor-client-id model, and disabling shifted-selection restoration did not help. That is evidence against a standalone `mergeRichTextUpdate` bug, against a simple block-array merge failure, and against shifted-selection restoration as the only trigger. The remaining likely layer is the live editor/sync loop: remote updates dispatch block changes and rerender/selection effects while the browser is still sending real keystrokes into two paragraphs created by the same concurrent split.

## Practical Impact

Likelihood for the destructive interleaving signature: `low`.

The workflow requires RTC collaboration, two browser tabs or users editing the same post, websocket sync, focus on the same paragraph, near-simultaneous paragraph splitting or paragraph-end appending, and immediate overlapping typing. Those timing and same-paragraph requirements are uncommon, but the individual actions are ordinary editor behavior. Pass 172 suggests the wrapped-line destructive character interleaving needs unusually fast synchronized typing: it reproduced at `10ms` and `50ms` per character, but not in single runs at `80ms` or `120ms`. Pass 173 raises the likelihood above `very-low` because a true logical-end append can also corrupt typed text, although that variant reproduced at `10ms` and passed at `50ms` in single clean-base runs.

Blast radius is content corruption. The corrupted state appears in the block tree on both peers before save, so saving can persist truncated, duplicated, or interleaved paragraph text. At slower typing cadences, the severe interleaving did not reproduce in pass 172, but the concurrent split still duplicated the suffix text into both inserted paragraphs. There is no evidence of a save loop, OOM, or performance failure. Recovery is by undo, manual repair, or post revisions if the corrupted content has already been saved.

## Fix Direction

Do not land a block-array-only fix without proving it against the browser path. The next fix should instrument the live sync manager and RichText input path enough to compare, per keystroke, the DOM selection, block-editor selected `clientId`, Yjs block `clientId`, relative selection target, and paragraph text before and after applying remote changes. Since disabling shifted-selection restoration did not clear the failure, the next suspect is remote block dispatch/rerender disturbing active contenteditable input rather than `getShiftedSelection()` alone.
