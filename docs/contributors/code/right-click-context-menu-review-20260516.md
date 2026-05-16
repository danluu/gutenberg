# Right-click Block Context Menu Review

Reviewed compare:
`WordPress/gutenberg@trunk...s1sfa/gutenberg-right-click:add/block-context-right-click-menu`

Head checked: `da42e798c4514e3f76d9920e33bab155da060b1b`.

The change adds a custom block context menu, clipboard helpers, paste-as-block helpers, split-block behavior, paragraph formatting fills, a spell-check popover, and table context menu fills. The downloaded patch was 16 files and 2690 insertions.

## Findings

### High: spell check sends selected editor text to a hard-coded third-party service

The new spell-check popover hard-codes LanguageTool:

-   `packages/block-editor/src/components/block-context-menu/spell-check-popover.js:16`
-   `packages/block-editor/src/components/block-context-menu/spell-check-popover.js:73`
-   `packages/block-editor/src/components/block-context-menu/spell-check-popover.js:78`

The selected text is POSTed to `https://api.languagetool.org/v2/check` whenever the user chooses `Check spelling`. There is no site setting, user opt-in, filter, proxy, privacy notice, or capability check. In Gutenberg this can include unpublished draft content, private post content, credentials pasted into a block, or enterprise content in locked-down deployments.

This should not ship as an unconditional editor feature. Either remove it, make it explicitly opt-in and site-controlled, or route it through a configured service that installations can audit and disable.

### High: the captured DOM selection is not tied to the block that was right-clicked

The context-menu handler derives the target block from the right-click target, then separately captures the current document selection:

-   `packages/block-editor/src/components/block-context-menu/index.js:174`
-   `packages/block-editor/src/components/block-context-menu/index.js:187`
-   `packages/block-editor/src/components/block-context-menu/index.js:198`
-   `packages/block-editor/src/components/block-context-menu/index.js:209`

There is no containment check that the captured `Range` belongs to the same block as `clientIds[0]`. Several later actions trust the range and the target client ID together:

-   paragraph inline formatting updates `clientId` using RichText created from the captured range: `packages/block-editor/src/components/block-context-menu/paragraph-fills.js:75`
-   color updates do the same: `packages/block-editor/src/components/block-context-menu/text-color-popover.js:169`
-   spell check sends and applies replacements from the captured range to `clientId`: `packages/block-editor/src/components/block-context-menu/spell-check-popover.js:62`, `packages/block-editor/src/components/block-context-menu/spell-check-popover.js:143`
-   inline paste restores the captured range and executes DOM insertion: `packages/block-editor/src/components/block-context-menu/use-clipboard-helpers.js:263`

The focused fuzz harness reproduced the missing invariant:

```text
selection range is not validated against right-click target:
{"seed":1,"targetClientId":"b","editableClientId":"a","selectedText":"alpha-1"}
```

At minimum, selection-powered menu items should be disabled unless the range's editable element is inside the right-clicked block. Prefer carrying the editable's owning client ID through the menu state and checking it before each action.

This confirms the missing validation in the implementation. A browser E2E pass should still pin down the exact right-click selection behavior across browsers and editor modes.

### High: `Paste as new block` treats plain text as RichText HTML

The manual paste-as-block path reads clipboard plain text, then writes it directly into RichText-backed attributes:

-   `packages/block-editor/src/components/block-context-menu/use-clipboard-helpers.js:346`
-   `packages/block-editor/src/components/block-context-menu/use-clipboard-helpers.js:373`
-   `packages/block-editor/src/components/block-context-menu/use-clipboard-helpers.js:375`
-   `packages/block-editor/src/components/block-context-menu/use-clipboard-helpers.js:384`
-   `packages/block-editor/src/components/block-context-menu/use-clipboard-helpers.js:398`

For paragraph, preformatted, list item, and table cells, a literal clipboard string such as `<strong>literal</strong>` is stored as `content`. Those attributes are interpreted as RichText HTML, so plain text can become markup instead of literal text.

The fuzz harness found this immediately:

```text
plain text is stored as raw RichText HTML:
{"seed":0,"blockName":"core/paragraph","content":"<strong>literal-0</strong>"}
```

The fix should escape or build RichText values from text instead of assigning raw text to HTML-valued attributes. Do not rely on the later save pipeline to discover which payloads were supposed to be literal.

### High: `Split block` bypasses removal/template-lock checks

The menu enables split based on `canSplitBlock`, but not on whether the target can be removed or replaced:

-   `packages/block-editor/src/components/block-context-menu/index.js:668`
-   `packages/block-editor/src/components/block-context-menu/index.js:503`

`replaceBlock` dispatches `replaceBlocks`, whose action-level guard checks whether replacement blocks can be inserted, not whether the original block can be removed:

-   `packages/block-editor/src/store/actions.js:379`
-   `packages/block-editor/src/store/actions.js:385`
-   `packages/block-editor/src/store/actions.js:388`

That means a block whose Delete action is unavailable through `canRemove` can still be replaced by split pieces if the replacement block types are insertable. Split is semantically a replace/remove operation and should honor the same template lock and block lock constraints.

### Medium: spell-check replacements always write the top-level `content` attribute

The menu enables `Check spelling` for any highlighted text:

-   `packages/block-editor/src/components/block-context-menu/index.js:737`

The replacement path always reads and writes the target block's top-level `content` attribute:

-   `packages/block-editor/src/components/block-context-menu/spell-check-popover.js:122`
-   `packages/block-editor/src/components/block-context-menu/spell-check-popover.js:143`

That is only correct for blocks whose selected RichText is actually backed by `attributes.content`. It is wrong for table cells, button text, image captions, and other blocks where the highlighted text lives in a different attribute or nested structure. In the best case the replacement appears to do nothing; in the worse case it dirties or corrupts an unrelated attribute.

### Medium: split duplicates whole-block attributes and trims whitespace-sensitive content

`splitBlockAs` spreads all original attributes into every resulting block:

-   `packages/block-editor/src/components/block-context-menu/index.js:473`
-   `packages/block-editor/src/components/block-context-menu/index.js:488`
-   `packages/block-editor/src/components/block-context-menu/index.js:497`

For blocks with an `anchor`, this creates duplicate DOM IDs after splitting. The same pattern can duplicate other attributes whose meaning is per-block rather than per-fragment.

The same code trims all split fragments:

-   `packages/block-editor/src/components/block-context-menu/index.js:465`
-   `packages/block-editor/src/components/block-context-menu/index.js:470`
-   `packages/block-editor/src/components/block-context-menu/index.js:471`

The feature is explicitly enabled for any block with a `content` attribute and no inner blocks, including whitespace-sensitive text blocks mentioned in the comment:

-   `packages/block-editor/src/components/block-context-menu/index.js:311`
-   `packages/block-editor/src/components/block-context-menu/index.js:328`

Code, preformatted, and verse content should not lose leading or trailing whitespace just because a context-menu split was used.

### Medium: non-iframed editors can close the menu before menu-item clicks fire

The menu installs capture-phase `mousedown` and `keydown` listeners on the canvas document:

-   `packages/block-editor/src/components/block-context-menu/index.js:143`

The popover is rendered in the same document context for non-iframed editors:

-   `packages/block-editor/src/components/block-context-menu/index.js:565`

In that configuration, a mousedown on a menu item can hit the capture listener first, call `close()`, unmount the menu, and prevent the later click handler from running. This needs a browser test across the iframed and non-iframed editor modes, but the event-ordering risk is real. The dismiss handler should ignore events inside the popover, or otherwise avoid unmounting before menu item activation.

### Medium: Add block above/below can replace an empty default block instead of inserting

Right-clicking a single block selects that block:

-   `packages/block-editor/src/components/block-context-menu/index.js:187`

The `Add block above` path passes the target as the inserter client ID with `isAppender = false`; `Add block below` also uses `isAppender = false` when there is a next sibling:

-   `packages/block-editor/src/components/block-context-menu/index.js:521`
-   `packages/block-editor/src/components/block-context-menu/index.js:535`

The shared QuickInserter insertion hook replaces the selected block when it is an unmodified default block and `isAppender` is false:

-   `packages/block-editor/src/components/inserter/hooks/use-insertion-point.js:149`
-   `packages/block-editor/src/components/inserter/hooks/use-insertion-point.js:151`
-   `packages/block-editor/src/components/inserter/hooks/use-insertion-point.js:156`

That is normal when the inserter is being used as a placeholder replacement, but it is surprising for commands named "Add block above" and "Add block below". This should get a UI regression test with an empty paragraph target.

### Medium: `Copy Text` writes literal selected text as `text/html`

`writeSystemClipboard` always publishes both MIME types:

-   `packages/block-editor/src/components/block-context-menu/use-clipboard-helpers.js:60`
-   `packages/block-editor/src/components/block-context-menu/use-clipboard-helpers.js:62`

`useCopyTextToClipboard` passes the same selected text as both HTML and plain text:

-   `packages/block-editor/src/components/block-context-menu/use-clipboard-helpers.js:170`

The fuzz harness reproduced a literal selected string becoming an HTML clipboard payload:

```text
raw text/html from Copy Text:
{"seed":17,"text":"<strong onclick=alert(1)>x</strong>","html":"<strong onclick=alert(1)>x</strong>"}
```

This is not the same as saying the browser will execute the example payload in WordPress, but it is still the wrong clipboard contract. Plain-text copy should either omit `text/html` or HTML-escape it.

### Medium: context-menu block copy bypasses the native wrapper-on-copy behavior

The new copy path serializes selected blocks directly:

-   `packages/block-editor/src/components/block-context-menu/use-clipboard-helpers.js:137`
-   `packages/block-editor/src/components/block-context-menu/use-clipboard-helpers.js:141`

The native copy path has special handling for block types that require their parent wrapper on copy:

-   `packages/block-editor/src/components/writing-flow/utils.js:40`
-   `packages/block-editor/src/components/writing-flow/utils.js:49`

`core/list-item` opts into that behavior:

-   `packages/block-library/src/list-item/index.js:36`

Copying selected list items through the context menu can therefore produce different clipboard HTML from keyboard/native copy. The new path should reuse the native clipboard serialization helper instead of cloning only part of its behavior.

### Medium: table context-menu operations use the focused cell, not the clicked cell

The table fill only checks that the right-clicked block is the current table:

-   `packages/block-library/src/table/edit.js:489`
-   `packages/block-library/src/table/edit.js:495`

The row and column actions operate on `selectedCell`:

-   `packages/block-library/src/table/edit.js:256`
-   `packages/block-library/src/table/edit.js:296`
-   `packages/block-library/src/table/edit.js:312`

`selectedCell` is updated from RichText focus:

-   `packages/block-library/src/table/edit.js:885`

If a user right-clicks a different cell from the one currently focused and the browser does not focus the new cell before the context-menu handler runs, the menu can edit the previous cell's row or column. The focused model harness reproduced the stale-state behavior, but this one should be validated with browser E2E because right-click focus behavior varies.

### Low: clipboard read fallback misses `readText`-only browsers

`readSystemClipboard` returns `null` when `navigator.clipboard.read` is absent:

-   `packages/block-editor/src/components/block-context-menu/use-clipboard-helpers.js:16`
-   `packages/block-editor/src/components/block-context-menu/use-clipboard-helpers.js:20`
-   `packages/block-editor/src/components/block-context-menu/use-clipboard-helpers.js:22`

The `readText` fallback only runs inside the `read()` catch path:

-   `packages/block-editor/src/components/block-context-menu/use-clipboard-helpers.js:41`

The fuzz harness confirmed that a `readText`-only clipboard implementation is skipped. The fallback should be attempted whenever `readText` exists and rich clipboard read is unavailable.

## Fuzz and Test Evidence

The review used an isolated patched worktree at:

`/tmp/gutenberg-right-click-fuzz-worktree-202605161246`

Focused fuzz harnesses were added under:

`/tmp/gutenberg-right-click-fuzz-worktree-202605161246/tools/right-click-fuzz/`

Harnesses and results:

-   `clipboard-fuzz.mjs`: failed on raw `text/html` from `Copy Text` and skipped `readText` fallback.
-   `paste-as-block-fuzz.cjs`: failed on raw RichText HTML storage for paragraph paste-as-block.
-   `range-target-fuzz.mjs`: failed on selection range not matching right-click target client ID.
-   `table-cell-target-fuzz.mjs`: failed on stale focused table cell model; treat as a UI-validation risk, not a full browser reproduction by itself.

The relevant logs are in:

`/tmp/gutenberg-context-menu-review-20260516122957/fuzz-results/`

Other validation:

-   The compare branch head was checked by remote ref lookup: `da42e798c4514e3f76d9920e33bab155da060b1b`.
-   The patch applied cleanly to the isolated worktree based on local `origin/trunk` at `8c11289526ef807331bea68fc18409ef7283573d`.
-   `npm run lint:js -- packages/block-editor/src/components/block-context-menu packages/block-editor/src/components/block-context-menu-controls packages/block-library/src/table/edit.js` did not run to a useful result because the isolated symlinked dependency setup reported a missing ESLint rule from `@wordpress/eslint-plugin`.
-   `npm run test:unit -- --runTestsByPath packages/block-editor/src/components/block-context-menu/index.js` found no matching tests for the new component path.

Discounted evidence:

-   Initial fuzz logs that failed with harness syntax/runtime bugs were not used as product evidence; only rerun logs were used.
-   "Guaranteed XSS" is too strong for the paste/copy findings. The supported claim is plain text being interpreted as HTML-shaped RichText or clipboard HTML, with exploitability dependent on sanitization and capabilities.
-   Hard-coded `core/*` paste submenu entries in `packages/block-editor/src/components/block-context-menu/paste-new-block-submenu.js` are layering and UX debt, but claims of guaranteed invalid insertion are weaker because insertion paths filter disallowed block types.

## Review Method

The review used independent `codex exec` runs in tmux with xhigh reasoning effort for five named review passes plus a contrarian pass, then two cross-analysis loops over the prior responses. A separate fuzz-target loop with the same names selected risky areas to exercise. The final report was written from the consensus issues, direct code inspection, and the focused fuzz harness results.
