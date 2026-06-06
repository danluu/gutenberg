# Template Part Query ID Normalization Repeated Dirty Save Report

Date: June 6, 2026

## Summary

This is a recent repeated dirty-save bug in the post editor. A user can edit only a post title, click Save, and see an unexpected site entity in the multi-entity save panel:

- `Template Part > Sidebar`
- the edited post title

If the user responds reasonably by unchecking `Sidebar` and saving only the post, the same `Sidebar` save row comes back on later post edits. This is surprising because the user did not select, edit, or intend to save the Sidebar template part.

The stock, non-custom repro uses Twenty Twenty-Five (TT5):

1. Create a Single item: Post template in the Site Editor.
2. Choose the stock TT5 pattern `News blog single post with sidebar`.
3. Save the template.
4. Open a normal published post in the post editor.
5. Turn on `View > Show template`.
6. Edit only the post title.
7. Click Save.
8. Uncheck `Sidebar` in the save panel and save only the post.
9. Repeat with another post.

Observed result: `Template Part > Sidebar` appears in the save panel again.

Expected result: saving a post title should not also ask the user to save an unrelated template part, and declining that unrelated save should not make the prompt recur.

## Capture Artifacts

The capture in this directory shows the stock TT5 sequence with visible annotations:

- [Annotated MP4 capture](./template-part-queryid-normalization-repeat-dirty-save-capture.mp4)
- [Capture timeline](./template-part-queryid-normalization-repeat-dirty-save-capture-timeline.txt)
- [Capture evidence JSON](./template-part-queryid-normalization-repeat-dirty-save-capture-evidence.json)
- [Site Editor setup screenshot](./template-part-queryid-normalization-repeat-dirty-save-site-editor-pattern-selected.png)
- [Cycle 1 save panel screenshot](./template-part-queryid-normalization-repeat-dirty-save-cycle-1-save-panel.png)
- [Cycle 2 save panel screenshot](./template-part-queryid-normalization-repeat-dirty-save-cycle-2-save-panel.png)

The video uses the UI for the relevant user path: Site Editor template creation, pattern selection, saving the template, opening posts, enabling `Show template`, editing post titles, opening the save panel, unchecking `Sidebar`, and saving only the post. The test environment reset and the creation of ordinary published posts are setup; the user-visible bug path is through normal editor controls.

The evidence JSON records the important state:

- after saving the Single Posts template, `Sidebar` is still theme-sourced;
- the saved Sidebar content does not contain `queryId`;
- opening a post with the template shown makes `wp_template_part:Sidebar` dirty before the user edits the post;
- the save panel contains both the post and `wp_template_part:Sidebar`;
- after saving only the post, Sidebar still has no saved `queryId`, so the next edit repeats the same dirty row.

## What Is Required

This does not require a custom block. The required content shape is a core Query block inside a template part or theme pattern where the saved block markup does not include `queryId`.

The stock TT5 path uses this chain:

- The user creates a custom Single Posts template from the stock pattern `twentytwentyfive/template-single-news-blog`.
- That pattern references the TT5 `sidebar` template part.
- The TT5 `parts/sidebar.html` file contains only this pattern reference:

```html
<!-- wp:pattern {"slug":"twentytwentyfive/hidden-sidebar"} /-->
```

- The resolved `twentytwentyfive/hidden-sidebar` pattern contains a core Query block with no `queryId`.

The user does not create a custom Sidebar part in this stock repro. The only custom site entity they intentionally create is the Single Posts template through the normal Site Editor template flow. The Sidebar remains a theme template part, and that is why declining to save Sidebar leaves the underlying source unchanged and lets the bug recur.

Earlier synthetic repros used multiple custom TT5 template parts that each contained Query blocks without `queryId`. That broader repro was useful for validating repeated multi-row dirty states, but it is not required for the stock failure mode described here.

## Why This Is Plausible In Real Sites

The TT5 stock path is plausible because it is a normal editor path:

- Twenty Twenty-Five is a bundled block theme.
- `News blog single post with sidebar` is a stock pattern.
- `Show template` is a normal post-editor view option.
- Users often decline unexpected site-wide save rows when they believe they only edited a post.

The underlying content shape also exists beyond TT5. A sampled scan of 80 public WordPress.org full-site-editing themes found 10 themes with at least one actual `<!-- wp:query ... -->` block comment that omitted `queryId`. Examples from that sample included `reclaim-the-web`, `car-dealership-carkit`, `dentabeam`, `nexusslash`, `magazinespare`, `corelite-blocks`, `prism-magazine`, `virza`, `blogspare`, and `rundizstrap`.

That scan proves the raw pattern exists in public theme source. It does not prove every one of those themes has the exact post-editor repeat path, because the repeat requires the unresolved Query block to be loaded through a template/template-part entity in the post editor and then for the user to save only the post while declining the template-part row.

On front-end webpages, the literal block comment is not normally visible to visitors. The rendered result can be visible as a sidebar, more-posts area, query loop, archive list, or similar block-theme layout. The bug surfaces in the editor when that theme content is loaded as editable site structure.

## When It Was Introduced

The bug is recent in the WordPress core release line.

Validated release signal:

- WordPress 6.8.5: negative, no site entity dirty at the save panel.
- WordPress 6.9.4: negative, no site entity dirty at the save panel.
- WordPress 7.0: positive, template-part rows recur.
- WordPress 7.1-alpha-62469: positive.

Core bisect result:

- First bad core commit: `5a2463711bbf88095781b00ba9d6b4c19194f3ca`
- Date: March 26, 2026 17:11:56 +0000
- Subject: `Editor: Bump pinned hash for the Gutenberg repository.`
- Immediate parent tested negative: `998a7729fab179501bdb27db3ee9f48d04ea53c9`
- Parent date: March 26, 2026 16:47:45 +0000
- Parent subject: `Build/Test Tools: Update built asset file after [62146].`

The first-bad core commit changed the pinned Gutenberg hash from:

- old: `3edafcc90fc4520939d69279e26ace69390582be`
- new: `0d133bf7e7437d65d68a06551f3d613a7d8e4361`

An asset-level confirmation was also run on the first-bad core environment. Replacing only these files from the immediate parent made the repro go negative:

- `wp-includes/js/dist/block-editor.js`
- `wp-includes/js/dist/block-editor.min.js`

That test confirms the first-bad behavior is in the bundled block-editor asset, not in an unrelated server-side core change.

Within the pinned Gutenberg range, the relevant Gutenberg commit is:

- Gutenberg commit: `05cad063fa9d25909e2abfbe793779ce706ac2f0`
- Date: March 25, 2026 13:23:30 +0000
- Subject: `Reset blockEditingModes on RESET_BLOCKS (#76529)`

This was the only commit in the pin range that modified the block-editor store path for `RESET_BLOCKS` and `blockEditingModes`, and reverting the first-bad core block-editor asset to the parent asset removes the bug. That makes `05cad063fa9d25909e2abfbe793779ce706ac2f0` the implementation-level introduction point.

## How The Bug Was Introduced

The Query block has long had editor initialization logic that fills in missing Query attributes. In particular, when a Query block has no finite `queryId`, the Query edit component calls `setAttributes( { queryId: instanceId } )`. It marks that update as not persistent with `__unstableMarkNextChangeAsNotPersistent()` because the user did not intentionally edit the Query block.

That behavior is not new. The regression is that the post-editor template-part flow now exposes that normalization as an edited template-part entity.

The introducing commit changed the block-editor store in two important ways:

1. It moved `blockEditingModes` into the combined `blocks` reducer state.
2. It changed `RESET_BLOCKS` handling so that block editing modes for blocks still present in the new tree are preserved across reset.

Before the change, the standalone `blockEditingModes` reducer handled `RESET_BLOCKS` by clearing per-block modes and preserving only the root mode. After the change, `withBlockReset` rebuilds the block tree and then copies `state.blocks.blockEditingModes` entries into the new tree when the client ID still exists:

```js
const preservedBlockEditingModes = state?.blockEditingModes ?? new Map();
for ( const [ clientId, mode ] of preservedBlockEditingModes ) {
	if ( ! newState.tree.has( clientId ) ) {
		continue;
	}
	newState.blockEditingModes.set( clientId, mode );
}
```

That change is reasonable for the bug it was meant to fix: template parts, controlled inner blocks, and content-only sections should not lose their editability mode just because the editor resets blocks. The missing case is that loading a template around a post can also load controlled template-part contents that include editor-only normalization updates, such as Query `queryId`.

In this repro, the sequence is:

1. The post editor loads a post.
2. `Show template` causes the surrounding Single Posts template to be loaded.
3. The template references the Sidebar template part.
4. Sidebar is a theme source that resolves a pattern containing a Query block with no `queryId`.
5. The Query block initializes `queryId` in editor state.
6. With the new `RESET_BLOCKS`/`blockEditingModes` preservation behavior, the loaded controlled template-part tree remains part of the edited entity state in this flow.
7. Core data sees non-transient edits for the Sidebar template-part entity, so `__experimentalGetDirtyEntityRecords()` includes `wp_template_part:Sidebar`.
8. The multi-entity save panel therefore asks the user to save Sidebar even though the user edited only the post title.
9. If the user unchecks Sidebar and saves only the post, the saved Sidebar source remains the original theme pattern reference with no `queryId`.
10. The next time the post editor loads the template, the same normalization happens again and the save row returns.

This explains why the bug repeats. It is not a random dirty flag, and it is not caused by the title edit itself. The dirty Sidebar row already exists immediately after opening the post with the template shown.

## Why It Is A Bug

The save panel row is user-visible evidence of a site-wide change. In this repro, the user edited only post titles. The Sidebar row is caused by editor normalization of template-part content that the user did not select or modify.

Saving Sidebar would persist an implementation detail into site state. Declining to save Sidebar is a reasonable response, especially because saving a template part is site-wide and can affect multiple pages. The surprising part is that the editor keeps asking for the same site-wide save on later post edits.

The bug has the right shape for repeated user reports:

- it happens during ordinary post editing after a normal `Show template` setup;
- it presents as a site-wide save prompt, which users notice;
- users who decline the unexpected site-wide row can hit it repeatedly;
- the repeated row is deterministic for the same unresolved template-part content.

## Caveats

The stock TT5 repro shows one repeated site entity row, `Template Part > Sidebar`, plus the edited post. Earlier synthetic repros showed multiple repeated template-part rows by placing multiple Query blocks without `queryId` in multiple template parts. The stock repro is narrower but more realistic.

If the user saves the unexpected Sidebar row once, this exact Sidebar recurrence should stop for that site because Sidebar becomes a custom/resolved template part with `queryId` saved. That does not make the bug benign: the problematic UX is that the editor asks users to save a site-wide entity they did not edit, and users who decline that unexpected save will see the row return.

The asset-revert test confirms the first-bad behavior is in the block-editor asset, and the Gutenberg range analysis identifies `05cad063fa9d25909e2abfbe793779ce706ac2f0` as the implementation-level introduction. An isolated source-level Gutenberg build bisect was not run because Gutenberg commits in that range do not include built plugin assets; the core pin, parent/child validation, and block-editor asset revert provide the practical introduction evidence.
