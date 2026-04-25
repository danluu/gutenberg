# RTC nested awareness selection local block lookup

## Status

Real awareness conversion bug at the `PostEditorAwareness.convertSelectionStateToAbsolute()` layer.

The fuzzer selection state is valid for the CRDT representation: Gutenberg stores some rich-text fields inside nested Yjs maps/arrays, for example `core/table` cells under `body[].cells[].content`. The receiver should be able to resolve a `Y.RelativePosition` inside any nested `Y.Text` to the containing block's local client ID.

## Failure

Source fuzzer: `/Users/danluu/dev/fuzz/gutenberg-try-fuzz/packages/core-data/src/awareness/test/post-editor-awareness.ts`

Repro branch: `danluu/rtc-issue-06-nested-awareness-repro`

Command:

```bash
npm run test:unit packages/core-data/src/awareness/test/post-editor-awareness.ts -- --runInBand --testNamePattern="nested rich-text"
```

Observed on the repro branch:

- Seeds `1401`-`1405`, `1407`, and `1408` fail.
- `richTextOffset` resolves to the expected shifted offset.
- `localClientId` is `null`, expected `local-nested-attrs`.
- Seed `1406` passes because it picks a shallow enough target for the old fixed-depth parent lookup.

The same failure reproduced directly in the `try/fuzz` worktree with the original fuzzer file.

## Cause

`convertSelectionStateToAbsolute()` resolves the relative cursor position, then assumes the Yjs parent chain is:

```text
Y.Text -> attributes Y.Map -> block Y.Map
```

That is true for top-level rich-text attributes such as `attributes.content`, but false for nested rich-text attributes such as:

```text
Y.Text -> cell Y.Map -> cells Y.Array -> row Y.Map -> body Y.Array -> attributes Y.Map -> block Y.Map
```

The old code uses `absolutePosition.type.parent?.parent`, so nested targets resolve the text offset but never find the containing block. Without a local client ID, the collaborator cursor/selection cannot be anchored to a block element.

## Real-vs-False-Positive Checks

Invalid oracle: ruled out. The expected local ID is resolved through the same block index path used by existing root and inner-block awareness tests. The mocked editor store contains the corresponding local block at that path.

Invalid generated shape: ruled out for the conversion layer. Nested `Y.Text` values are a supported CRDT shape; `crdt-blocks` explicitly serializes nested rich-text attributes into nested Yjs structures.

Helper misuse: ruled out. The reproducer uses `Y.createRelativePositionFromTypeIndex()` and `Y.createAbsolutePositionFromRelativePosition()` on the same document, matching production selection conversion.

Environment contamination and race injection: ruled out. The failure is deterministic in a single `Y.Doc` with no async sync provider and no injected races.

Known-fixed bug masking: ruled out. This reproduces against trunk plus the known awareness/path fixes already present in this workspace. The older rich-text offset fix is not involved because the offset is correct.

## Browser Reachability

A pure realistic-user Playwright repro for this exact failure was not produced.

The blocker is product reachability, not test harness instability: current `getSelectionState()` only creates awareness cursor positions when `selection.attributeKey` points to a top-level block attribute whose CRDT value is a `Y.Text`. Core nested-rich-text controls, such as table cells, do not expose a nested attribute path through block-editor selection state. In `core/table`, cell `RichText` controls do not pass an `identifier`, so the selection uses the RichText instance symbol instead of a serializable `attributeKey`. `getCursorPosition()` then returns `null` before any nested `Y.Text` relative position is created.

Highest realistic layer reached: deterministic unit/fuzzer reproducer at the production awareness conversion method, with real Yjs relative positions and the production block path resolver. A separate user-facing issue likely exists for awareness not being generated for table-cell selections, but that is a broader selection-path feature gap and not this conversion failure.

Video: not produced, because there is no isolated top-level user-action path to this specific nested-`Y.Text` conversion failure in the current editor.

## Fix Plan

Replace the fixed `parent?.parent` assumption with an ancestor walk from the resolved `Y.Text` to the nearest Yjs block map, then reuse the existing Yjs-path-to-local-client-ID resolver. Keep whole-block selection handling unchanged.

PR branch: `danluu/rtc-issue-06-nested-awareness-pr`

Commits:

- `5f337883a9b` Add nested awareness selection tests
- `e334674e9c8` Resolve nested awareness selection blocks
