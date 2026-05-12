# PR 77673 Cursor Awareness Audit

Audit target: <https://github.com/WordPress/gutenberg/pull/77673>

PR head audited: `cb1473de6557485ecb6961444cc818a561c77d85`

## Scope

This audit focused on the updated cursor-awareness work in PR 77673, including
Alec's latest changes:

- `120e6e3c8ee` - `Update cell test to use non-first cell`
- `1181f5b23df` - `Add attributeKey to ResolvedSelection, pass through to awareness overlay`
- `05e42d4bb9e` - `Fix use-post-editor-awareness-state.ts unit tests`
- `cb1473de655` - `Remove unnecessary comment contents`

The requested named reviewers were used as technical review lenses, not as
impersonated voices. I ran independent passes for:

- systems-code correctness and API boundaries;
- state-machine, CRDT, and invariant checking;
- distributed failure modes, stale data, compatibility, and fallbacks;
- empirical/fuzzing coverage and reproducibility;
- adversarial/API-contract hardening;
- a contrarian pass to reject weak findings.

The final rankings below reflect the issues that survived the second pass.

## Findings

### 1. Stale table-cell `attributeKey` can render the cursor in the wrong cell

Severity: high.

`packages/core-data/src/awareness/post-editor-awareness.ts` resolves the live
`Y.RelativePosition` back to a concrete `Y.Text`, but then returns
`cursorPos.attributeKey` from the sender's awareness payload:

```ts
return {
	richTextOffset: htmlIndexToRichTextOffset(
		absolutePosition.type.toString(),
		asHtmlStringIndex( absolutePosition.index )
	),
	localClientId,
	attributeKey: cursorPos.attributeKey ?? null,
};
```

For table cells, the new `RichText` identifier is positional:

```js
identifier={ `${ name }.${ rowIndex }.cells.${ columnIndex }.content` }
```

That means a cursor in `body.1.cells.1.content` can become stale after a
row or column is inserted before it. The `Y.RelativePosition` still points to
the original cell's `Y.Text`, but the copied `attributeKey` can now point to a
different DOM cell. The overlay then trusts that string in
`packages/editor/src/components/collaborators-overlay/compute-selection.ts`:

```ts
blockElement.querySelector< HTMLElement >(
	`[data-wp-block-attribute-key="${ attrKey }"]`
)
```

There is a second path to the same bug:
`packages/core-data/src/utils/crdt-user-selections.ts` compares cursor
positions using only the Yjs relative position and absolute offset. It ignores
`attributeKey`, so a correction that only changes the rendered cell path can
be suppressed as "unchanged".

Recommended tests:

- Browser/e2e: place user A's cursor in the bottom-right table cell, insert a
  row or column before it from user B, and assert the remote cursor stays in
  the moved original cell rather than the old positional cell.
- Unit: create two cursor states with the same `relativePosition` and
  `absoluteOffset` but different `attributeKey`; `areSelectionsStatesEqual()`
  should return `false`.
- Unit: after resolving a text position, assert the resolved `attributeKey`
  either is derived from `absolutePosition.type` in the receiver document, or
  at least satisfies:

```ts
getYTextByAttributeKey( attributes, resolved.attributeKey ) ===
	absolutePosition.type
```

### 2. Same-block selections across multiple RichText fields render as one field

Severity: high/medium.

`packages/core-data/src/utils/crdt-user-selections.ts` classifies selections by
`clientId` only. A selection from one table cell to another has the same block
client ID, but distinct RichText fields and distinct nested `attributeKey`
values.

The receiver-side rendering path then handles `SelectionInOneBlock` by
resolving only the start target:

```ts
const result = computeSingleBlockRects( start, end, overlayContext );
```

`computeSingleBlockRects()` calls `resolveTargetElement()` with `start`, then
passes both start and end offsets into that one DOM element. A range from
`body.0.cells.0.content` to `body.0.cells.1.content` can therefore compute
selection rectangles and caret placement inside the start cell only.

Recommended tests:

- Browser/e2e: select from one table cell into another within the same
  `core/table` block. Assert sender state preserves distinct start/end
  `attributeKey`s and the remote overlay spans both cells.
- Unit: call `computeSelectionVisual()` with the same `localClientId` but
  different start/end `attributeKey`s. Assert the end offset is not applied
  inside the start element and that the active caret uses the active-end
  element.

### 3. Explicit `attributeKey` misses fail open to a block-level cursor

Severity: medium.

`resolveTargetElement()` falls back to the whole block if an explicit
`attributeKey` is present but no matching RichText DOM node is found:

```ts
return (
	blockElement.querySelector< HTMLElement >(
		`[data-wp-block-attribute-key="${ attrKey }"]`
	) ?? blockElement
);
```

That fallback is useful for old payloads that have no `attributeKey`. It is not
safe for a new payload with an explicit key. If the key is stale or malformed,
the offset is RichText-relative, not block-relative. Falling back to the whole
block can draw a visible cursor in unrelated text and mask the real lookup
failure.

The same query also searches all descendants of the block element. If a parent
container block and a child block both have a `content` RichText, a parent
lookup can match the child unless candidates are filtered by their closest
`[data-block]`.

Recommended tests:

- DOM/unit: explicit missing `attributeKey` should return no target or no
  cursor, not the block root.
- DOM/unit: parent block with an inner child block using
  `data-wp-block-attribute-key="content"` should not resolve the parent
  selection to the child RichText.

### 4. `getContainingBlockYMap()` can misidentify block-shaped attribute data

Severity: medium/low.

`packages/core-data/src/awareness/block-lookup.ts` identifies a block by shape:
the candidate parent is a `Y.Map`, its parent is a `Y.Array`, it has a
`clientId`, and it has an `innerBlocks` `Y.Array`.

That is normally true for Gutenberg blocks, but it can also be true for a
nested attribute array item in a custom block. The current test covers a
block-like map directly under attributes, but the actual predicate is dangerous
when the fake block-like object is inside a `Y.Array`.

Recommended test:

- Build a real root block whose `attributes.cards[0]` is a Y.Map containing
  `clientId`, `innerBlocks`, and a nested `Y.Text`. A cursor inside that text
  should resolve to the outer block, not to the array item.

## Reproduction Videos

Videos were generated from the local PR 77673 fuzzing worktree at
`/Users/danluu/dev/fuzz/gutenberg-pr77673-cursor-fuzz`.

Each confirmed video uses a composite reproduction layout: User A and User B
editor screens are visible side by side, with a running annotated log at the
bottom.

### Issue 1: nested table-cell cursor missing remotely

User A places the cursor in the `Delta` table cell. The local selection is
`body.1.cells.1.content` at offset 5, but User B renders zero collaborator
cursors. The updated video zooms both users' table areas and marks the User A
click point on-screen.

Local videos:

- MP4: `/Users/danluu/dev/fuzz/gutenberg-pr77673-cursor-fuzz/artifacts/cursor-videos/issue-1-nested-table-cell-cursor-missing-remotely-visible-click-20260512T224543382Z/issue-1-nested-table-cell-cursor-missing-remotely-visible-click.mp4`
- WebM: `/Users/danluu/dev/fuzz/gutenberg-pr77673-cursor-fuzz/artifacts/cursor-videos/issue-1-nested-table-cell-cursor-missing-remotely-visible-click-20260512T224543382Z/issue-1-nested-table-cell-cursor-missing-remotely-visible-click.webm`

### Issue 2: nested table-cell `attributeKey` becomes stale after row deletion

User A places the cursor in `Delta`, which advertises
`body.1.cells.1.content`. User B uses the table toolbar path
`Edit table -> Delete row`; after the row delete, `Delta` moves to DOM key
`body.0.cells.1.content`, so the old cursor key is stale. The updated video
marks the stale key string in red and the actual Delta cell key in green.

Local videos:

- MP4: `/Users/danluu/dev/fuzz/gutenberg-pr77673-cursor-fuzz/artifacts/cursor-videos/issue-2-nested-attributekey-becomes-stale-after-row-deletion-20260512T225145673Z/issue-2-nested-attributekey-becomes-stale-after-row-deletion.mp4`
- WebM: `/Users/danluu/dev/fuzz/gutenberg-pr77673-cursor-fuzz/artifacts/cursor-videos/issue-2-nested-attributekey-becomes-stale-after-row-deletion-20260512T225145673Z/issue-2-nested-attributekey-becomes-stale-after-row-deletion.webm`

### Issue 3: missing keyed RichText target falls back to the whole block

User A advertises a nested keyed target. User B deletes the row containing that
keyed target through the table toolbar. The keyed target no longer exists, and
the current cursor lookup falls back to the table block. The updated video
marks the missing keyed target in red and the whole-block fallback in blue.

Local videos:

- MP4: `/Users/danluu/dev/fuzz/gutenberg-pr77673-cursor-fuzz/artifacts/cursor-videos/issue-3-missing-keyed-richtext-target-falls-back-to-block-20260512T224918329Z/issue-3-missing-keyed-richtext-target-falls-back-to-block.mp4`
- WebM: `/Users/danluu/dev/fuzz/gutenberg-pr77673-cursor-fuzz/artifacts/cursor-videos/issue-3-missing-keyed-richtext-target-falls-back-to-block-20260512T224918329Z/issue-3-missing-keyed-richtext-target-falls-back-to-block.webm`

### Rejected candidate

The same-table-block cross-RichText candidate is not a confirmed issue video.
Natural user-action probes on table cells and other multi-RichText blocks did
not produce a cross-field editor selection. The earlier candidate capture had
empty selection state, so it should not be used as a bug video.

## Follow-Up Risks

These issues are real concerns, but I would not treat them as the primary
blockers for this PR without a more focused reproducer.

### Nested rich-text cursor-scope merge misses

`packages/core-data/src/utils/crdt-blocks.ts` still scopes cursor-guided
rich-text merges by the top-level attribute name:

```ts
{ attributeKey: attributeName, clientId }
```

For table cell edits this is `body`, while the selection key is
`body.0.cells.0.content`. `resolveRichTextCursorPosition()` requires exact key
equality, so nested rich-text edits miss the cursor hint and fall back to an
unscoped diff. This looks like an adjacent CRDT cursor-preservation bug, not a
new overlay-only regression.

Recommended test:

- Edit repeated text in a table cell with the local cursor inside that cell.
  Assert `Delta.diffWithCursor()` receives a non-null cursor index for the
  exact nested cell `Y.Text`, matching top-level RichText behavior.

### `RichText.identifier` contract drift

The table change uses a nested dot path as `RichText.identifier`, while the
RichText docs and several block-editor actions still describe `identifier` as
the block attribute name and index into `block.attributes[ attributeKey ]`.

This may be acceptable if nested identifiers become part of the supported
selection contract, but it needs explicit coverage or documentation. Otherwise
generic editor actions can observe an `attributeKey` that is not a top-level
block attribute.

Recommended tests:

- Focus a table cell and exercise edit, backspace/delete, copy/cut, split, and
  merge paths that read `block.attributes[ attributeKey ]`.
- Assert no console error such as "The RichText identifier prop does not match
  any attributes defined by the block" and no synthetic top-level
  `body.0.cells.0.content` attribute is created.

## Weaker / Out-of-Scope Items

- Selector escaping: the new `attributeKey` selector uses `CSS.escape()`. The
  existing `localClientId` interpolation is not escaped, but it is locally
  resolved/generated and was already present in the old code. This is hardening
  polish, not a PR-blocking cursor-awareness finding.
- Awareness throttling: `setThrottledLocalStateField()` appears to publish
  immediately on each call, but that behavior predates this PR. The relevant
  bug for this audit is that `attributeKey` changes are ignored by cursor
  equality, not throttling itself.

## Verification

This was a static/source audit of PR head
`cb1473de6557485ecb6961444cc818a561c77d85`.

I did not run the full test suite. In the original working tree,
`npm run wp-env status` failed before reporting environment state because the
local `node_modules` tree was missing `@sindresorhus/is`:

```text
Error: Cannot find module '@sindresorhus/is'
```

The final report therefore relies on code inspection and independent review
passes, not local e2e/PHP execution.

## Conclusion

The narrow non-first-cell cursor bug is improved by Alec's latest change, but
the new `attributeKey` path is still not a stable receiver-side identity. The
main remaining blocker is that the receiver trusts a sender-owned positional
table-cell key after resolving a live Yjs position. The second major gap is
that same-block selections spanning multiple RichText instances are still
modeled and rendered as a single RichText range.
