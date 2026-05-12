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

The same serializer is vulnerable whenever valid empty non-void inline markup is
materialized as a `RichTextData` object and then serialized without the original
HTML fallback. Pass 177 found an important boundary: a full single-user browser
workflow that enters the same paragraph through the code editor, switches to the
visual editor, types in the paragraph, and saves still preserves the anchor.
Pass 179 found a second boundary: the committed two-session RTC browser spec
also passes at the pre-fix commit when the receiver only saves, and a temporary
variant where the receiver exits code editor, clicks the paragraph, types `!`,
and saves also preserves the anchor. The durable reproduction is therefore the
lower-level RTC/CRDT rich-text hydration path and historical fuzz evidence, not
a currently minimized failing natural browser flow.

The resulting paragraph HTML becomes malformed:

```html
<p>Before <a id="empty-anchor"> after</p>
```

When persisted, the block reparses as invalid because the paragraph close is
inside the unterminated anchor.

## User Workflow

The likely workflow remains uncommon, and the exact natural browser trigger has
not been minimized:

1. Real-time collaboration is enabled for the post editor over the HTTP sync
   transport.
2. User A opens the code editor or pastes valid paragraph HTML containing an
   empty inline anchor.
3. User B receives the block through RTC.
4. Some subsequent path serializes the received `RichTextData` block attribute
   rather than preserving the original HTML string.

Pass 177 tested the most plausible single-user browser workflow on the
unpatched known-fixes base: enter the paragraph through the code editor, switch
to visual mode, type `!` in the paragraph, save, and inspect REST
`content.raw`. That workflow preserved
`<p>Before <a id="empty-anchor"></a> after!</p>`. Direct code-editor save and
the ordinary visual editor path therefore both appear to stay on a string or
original-HTML preservation path unless another RTC, plugin, or lower-level code
path materializes and serializes a `RichTextData` object. Pass 179 repeated this
kind of negative browser check in a detached pre-fix worktree for the RTC
receiver path: receiver save-only passed, and receiver visual edit plus save
also passed. The rich-text unit and CRDT hydration tests still fail pre-fix with
the exact malformed output.

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
3. Keep the Playwright collaboration coverage as a natural preservation check,
   but do not treat it as a failing pre-fix browser repro unless a minimized
   natural flow is found.
4. Change `toHTMLString()` so object replacements keep opening-tag-only output
   only for HTML void elements. Non-void object replacements should emit a
   closing tag.

This avoids special-casing RTC or paragraph blocks, preserves existing inline
image behavior, and keeps the serialization cost to a constant set lookup per
object replacement.

## Practical Impact

Real-user likelihood: `very-low`.

The prerequisites are a normal editor surface and normal code-editor/paste
workflow inside a collaborative post, but the content shape is uncommon: an
empty inline anchor in paragraph rich text. The lower-level trigger requires a
`RichTextData` value created from the RTC/CRDT rich-text hydration path to be
serialized. Pass 179 shows that the ordinary receiver save-only path and a
simple receiver visual edit plus save path do not reach the corrupting
serializer in the browser. The blast radius is persistent malformed block HTML
if a hydrated rich-text value is saved. Recovery is possible through code-editor
repair or restoring a revision from before the malformed save.
