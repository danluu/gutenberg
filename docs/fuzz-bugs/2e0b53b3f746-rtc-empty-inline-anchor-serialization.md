# RTC Empty Inline Anchor Serialization Corrupts Paragraph HTML

Bug signature: `2e0b53b3f746`

Bug type: `rtc_anchor_block_serialization_corruption_breaks_revision_restore`

## Summary

An empty inline anchor inside rich text, for example
`Before <a id="empty-anchor"></a> after`, is valid paragraph content. Direct
block parse and serialize preserves it, but the RTC path hydrates rich-text
block attributes from the CRDT document into `RichTextData`. That hydration
turns the empty anchor into an object replacement, and `toHTMLString()` has
historically serialized every object replacement as an opening tag only.

The same serialization boundary can also be reached without RTC after valid
legacy, pasted, imported, or code-editor content is opened in the visual editor
and the affected paragraph is edited. The initial parsed value can preserve the
original HTML, but the next rich-text change serializes a newly materialized
value without that original HTML fallback.

The resulting paragraph HTML becomes malformed:

```html
<p>Before <a id="empty-anchor"> after</p>
```

When persisted, the block reparses as invalid because the paragraph close is
inside the unterminated anchor.

## User Workflow

The natural workflow is uncommon but real:

1. Real-time collaboration is enabled for the post editor over the HTTP sync
   transport.
2. User A opens the code editor or pastes valid paragraph HTML containing an
   empty inline anchor.
3. User B receives the block through RTC.
4. User B serializes or saves the received block state.

A related single-user workflow does not require the sync transport: a user opens
or creates a paragraph containing the same valid empty inline anchor, switches
to or remains in the visual editor, changes that paragraph, and then saves.
Direct code-editor save without a rich-text edit is less risky because the
string/original-HTML path can preserve the closing tag.

The normal Advanced > HTML anchor UI creates a block-level paragraph anchor and
does not trigger this issue. Inline anchors with linked text also do not trigger
it. The narrow trigger is an empty non-void rich-text element with attributes,
which users can create through the code editor, pasted legacy HTML, or
plugin-generated content.

## Root Cause

The relevant path is:

- `packages/core-data/src/utils/crdt.ts` calls
  `deserializeBlockAttributes()` when reading block changes from the CRDT
  document.
- `packages/core-data/src/utils/crdt-blocks.ts` converts schema
  `{ type: 'rich-text' }` attribute strings into `RichTextData`.
- `packages/rich-text/src/create.js` stores empty formatted elements with
  attributes as object replacements.
- `packages/rich-text/src/to-tree.js` marks replacements as `object: true`.
- `packages/rich-text/src/to-html-string.js` serializes object replacements as
  `<tag attributes>` without considering whether the tag is a void HTML
  element.

That behavior is correct for `img`, `br`, and other void elements, but not for
non-void elements such as `a`.

`git blame` traces the object-only opening tag behavior to
`78d1254d4a43` (`RichText state structure for value manipulation`, #7890).
The current RTC bug became visible when collaborative editing started moving
block rich-text attributes through the CRDT hydration path.

## Fix Plan

Keep the fix at the rich-text serialization boundary:

1. Add a rich-text unit regression proving an empty non-void anchor round trips
   through `create()` and `toHTMLString()`.
2. Add a core-data CRDT regression proving hydrated rich-text block attributes
   preserve the explicit closing anchor tag.
3. Add a natural Playwright collaboration repro using two editor sessions and
   valid code-editor input.
4. Change `toHTMLString()` so object replacements keep opening-tag-only output
   only for HTML void elements. Non-void object replacements should emit a
   closing tag.

This avoids special-casing RTC or paragraph blocks, preserves existing inline
image behavior, and keeps the serialization cost to a constant set lookup per
object replacement.

## Practical Impact

Real-user likelihood: `low`.

The prerequisites are a normal editor surface and normal code-editor/paste
workflow, but the content shape is uncommon: an empty inline anchor in paragraph
rich text. RTC is not the only possible route, but it is the route reproduced by
the browser test and it lets a passive peer save malformed content. The blast
radius is persistent malformed block HTML if a hydrated or edited rich-text
value is saved. Recovery is possible through code-editor repair or restoring a
revision from before the malformed save.
