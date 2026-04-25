# RTC nested awareness selection local block lookup

## Status

Real awareness conversion bug at the `PostEditorAwareness.convertSelectionStateToAbsolute()` layer.

The fuzzer selection state is valid for the CRDT representation: Gutenberg stores some rich-text fields inside nested Yjs maps/arrays, for example `core/table` cells under `body[].cells[].content`. The receiver should be able to resolve a `Y.RelativePosition` inside any nested `Y.Text` to the containing block's local client ID.

## Failure

Source fuzzer: `/Users/danluu/dev/fuzz/gutenberg-try-fuzz/packages/core-data/src/awareness/test/post-editor-awareness.ts`

Repro branch: `danluu/realistic-browser-repro`

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

## Introduction

The fixed-depth parent lookup was introduced on February 23, 2026 by [PR #75590](https://github.com/WordPress/gutenberg/pull/75590), commit `d5add1a75a1` (`Real-time collaboration: Remove block client IDs from Awareness, fix "Show Template" view`). That PR intentionally stopped carrying block client IDs in awareness state and instead resolved the local block by walking from the resolved Yjs relative position back to a block map. The text-selection path added this assumption:

```text
Y.Text -> attributes Y.Map -> block Y.Map
```

So the regression point for this lookup bug is PR #75590, not the original awareness-selection work.

Relevant related PRs:

- [PR #74728](https://github.com/WordPress/gutenberg/pull/74728) introduced user and selection information in awareness on January 23, 2026. Before PR #75590, text selection states still carried the block client ID (`blockId`, `blockStartId`, `blockEndId`) alongside the Yjs relative text position, so this specific parent-walk failure did not exist yet.
- [PR #76913](https://github.com/WordPress/gutenberg/pull/76913) made `core/table` cell merging schema-aware on April 2, 2026 and created nested Yjs structures such as `body[].cells[].content` as nested `Y.Text` values. That did not introduce the incorrect lookup, but it made the `core/table` nested-rich-text CRDT shape that exposes the latent PR #75590 assumption.

## Real-vs-False-Positive Checks

Invalid oracle: ruled out. The expected local ID is resolved through the same block index path used by existing root and inner-block awareness tests. The mocked editor store contains the corresponding local block at that path.

Invalid generated shape: ruled out for the conversion layer. Nested `Y.Text` values are a supported CRDT shape; `crdt-blocks` explicitly serializes nested rich-text attributes into nested Yjs structures.

Helper misuse: ruled out. The reproducer uses `Y.createRelativePositionFromTypeIndex()` and `Y.createAbsolutePositionFromRelativePosition()` on the same document, matching production selection conversion.

Environment contamination and race injection: ruled out. The failure is deterministic in a single `Y.Doc` with no async sync provider and no injected races.

Known-fixed bug masking: ruled out. This reproduces against trunk plus the table-cell selection-path support in this workspace, but without the awareness conversion fix. The older rich-text offset fix is not involved because the offset is correct.

## Lower-Level Repros

Standalone Yjs shape repro: [repros/nested-awareness-parent-walk-repro.cjs](./repros/nested-awareness-parent-walk-repro.cjs)

Command:

```bash
node docs/explanations/fuzzer-bugs/repros/nested-awareness-parent-walk-repro.cjs
```

This script does not import Gutenberg. It builds both relevant Yjs parent chains and shows that `parent.parent` finds the block for a top-level rich-text attribute but returns `null` for nested table-cell rich text. The same script also verifies that an ancestor walk reaches the containing block. It exits successfully only when that mismatch is reproduced.

Production conversion unit/fuzzer repro: [packages/core-data/src/awareness/test/post-editor-awareness.ts](../../../packages/core-data/src/awareness/test/post-editor-awareness.ts)

Command:

```bash
npm run test:unit packages/core-data/src/awareness/test/post-editor-awareness.ts -- --runInBand --testNamePattern="nested rich-text"
```

On the repro branch, the seeded nested-rich-text cases fail at `convertSelectionStateToAbsolute()` with `localClientId: null`. On the fix branch, the same cases pass.

Selection-state nested path unit repro: [packages/core-data/src/utils/test/crdt-user-selections.ts](../../../packages/core-data/src/utils/test/crdt-user-selections.ts)

Command:

```bash
npm run test:unit packages/core-data/src/utils/test/crdt-user-selections.ts -- --runInBand --testNamePattern="nested rich-text attribute path"
```

This verifies the sender-side lower layer: a block-editor selection with `attributeKey: "body.0.cells.0.content"` resolves to a `Y.RelativePosition` in the nested table-cell `Y.Text`. That proves the receiver-side conversion bug can be reached without synthetic awareness writes once table cells expose a stable nested `RichText` identifier.

## Browser Repro

Test: `test/e2e/specs/editor/collaboration/collaboration-nested-awareness-selection.spec.ts`

This is a browser-level reproduction with user actions:

- Create a draft post containing a `core/table` block.
- Open a collaborative editing session for that post.
- In user 1's editor, click a real contenteditable table cell and press `ArrowRight`.
- Assert that block-editor selection state exposes a nested rich-text attribute key such as `body.0.cells.0.content`.
- In user 2's editor, wait for the remote collaborator cursor line.

On the repro branch, the test reaches the nested attribute path and then fails because no `.collaborators-overlay-user-cursor` appears for user 2. That isolates the original conversion bug: the sender now produces a nested `Y.Text` relative position from a realistic table-cell selection, while the receiver still cannot walk from that nested `Y.Text` back to the containing block.

The browser reachability prerequisite is commit `3e7ae5a6997` (`Emit nested table cell awareness selections`). It gives table-cell `RichText` controls a stable nested `identifier` and teaches `getCursorPosition()` to resolve dot-path attribute keys into nested CRDT `Y.Text` instances. The conversion fix is intentionally absent from the repro branch.

Command used locally from `test/e2e`:

```bash
WP_BASE_URL=http://localhost:8902 npm exec --workspace @wordpress/e2e-tests-playwright -- playwright test --config ../../.context/playwright-8902.config.ts editor/collaboration/collaboration-nested-awareness-selection.spec.ts --project=chromium
```

The alternate `wp-env` config in `.context/wp-env.e2e-8902.json` uses port `8902` only because the default local `8888`/`8889` ports were already occupied by other workspaces.

Failing browser artifact:

```text
/Users/danluu/conductor/workspaces/gutenberg-v1/louisville/.context/artifacts/rtc-issue-06/nested-awareness-browser-repro-failing.webm
```

## Fix Plan

Replace the fixed `parent?.parent` assumption with an ancestor walk from the resolved `Y.Text` to the nearest Yjs block map, then reuse the existing Yjs-path-to-local-client-ID resolver. Keep whole-block selection handling unchanged.

PR branch: `danluu/rtc-issue-06-nested-awareness-pr`

Commits:

- `5f337883a9b` Add nested awareness selection tests
- `35c58f9ee75` Add browser repro for nested awareness selection
- `4f12e11bcb9` Emit nested table cell awareness selections
- `379be64280b` Stabilize nested awareness browser repro
- `e334674e9c8` Resolve nested awareness selection blocks
