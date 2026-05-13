# PR 77673 cursor awareness fix plan

This plan covers the cursor-awareness bugs found while reviewing PR 77673,
including the cases already covered by the PR tests and the additional failing
tests added during follow-up review.

The central invariant is:

Remote text cursor identity is the live `Y.RelativePosition` into a live
`Y.Text`. A WordPress `attributeKey` is useful to find that `Y.Text` when the
local user creates the selection, but on a receiver it is only a current
RichText address for DOM targeting. For positional nested attributes such as
table cells, it must be derived from the resolved Yjs object at read time.

## Relevant PRs

- [#74728](https://github.com/WordPress/gutenberg/pull/74728)
  introduced the first RTC awareness payload containing user and selection
  information.
- [#74878](https://github.com/WordPress/gutenberg/pull/74878) added
  relative positions to selection history and the undo stack.
- [#75590](https://github.com/WordPress/gutenberg/pull/75590) removed block
  client IDs from awareness and made receiver-side block lookup depend on the
  Yjs block tree.
- [#76107](https://github.com/WordPress/gutenberg/pull/76107) added the
  collaborator rich-text selection overlay.
- [#76597](https://github.com/WordPress/gutenberg/pull/76597),
  [#76913](https://github.com/WordPress/gutenberg/pull/76913), and
  [#77164](https://github.com/WordPress/gutenberg/pull/77164) extended RTC
  serialization and merge behavior for nested attributes, especially table
  data.
- [#77136](https://github.com/WordPress/gutenberg/pull/77136) changed the
  block-editor selection observer path for edge selections inside one block.
- [#77673](https://github.com/WordPress/gutenberg/pull/77673) is the cursor
  awareness PR under review. It starts carrying `attributeKey` for nested
  RichText targeting, which fixes the initial missing-target bug but also
  exposes stale-address and strict-targeting bugs.

## Known bugs

1. Initial nested RichText cursors can target the wrong editor element.

   Before PR 77673, awareness resolution carried a block clientId and text
   offset, but not the specific RichText target inside the block. Blocks such
   as `core/table` have many RichText instances inside one block. Rendering a
   remote cursor against the block element can place the cursor in the wrong
   cell or first matching text root.

   This was introduced by the original awareness and overlay split:
   [#74728](https://github.com/WordPress/gutenberg/pull/74728) added
   selection awareness around block-level identity, and
   [#76107](https://github.com/WordPress/gutenberg/pull/76107) rendered
   remote rich-text cursors from that model. Those PRs did not need to
   distinguish multiple RichText roots inside one block. PR
   [#77673](https://github.com/WordPress/gutenberg/pull/77673) is the first
   pass at adding that missing RichText address.

2. Stale table-cell `attributeKey` after row or column structure changes.

   PR 77673 passes the sender's `attributeKey` through to the receiver. That
   fixes the initial non-first-cell case, but treats a positional key such as
   `body.1.cells.1.content` as stable identity. Table cell RichText identifiers
   are regenerated from current row and column indexes. After another user
   inserts or deletes a preceding row, the same `Y.Text` may now have a new
   path.

   This was introduced by PR
   [#77673](https://github.com/WordPress/gutenberg/pull/77673)'s
   attribute-key pass-through fix: it added the right kind of data to the wire
   shape, but reused the sender's old address on the read path instead of
   deriving the current address from the resolved `Y.Text`. The failure is most
   visible in the table paths that became RTC-editable through
   [#76913](https://github.com/WordPress/gutenberg/pull/76913) and more stable
   under structural edits in
   [#77164](https://github.com/WordPress/gutenberg/pull/77164).

3. Deleted or missing keyed RichText targets can fall back to the whole block.

   `resolveTargetElement()` narrows to `[data-wp-block-attribute-key]` when a
   key is present, but falls back to the block element when no matching keyed
   node exists. That produces plausible but wrong cursors for removed captions,
   stale table-cell paths, and temporarily absent RichText targets.

   This was introduced when PR
   [#77673](https://github.com/WordPress/gutenberg/pull/77673) layered keyed
   nested-RichText lookup onto the older overlay fallback from
   [#76107](https://github.com/WordPress/gutenberg/pull/76107). The fallback
   is valid only for legacy unkeyed selections, not for keyed text selections
   whose offsets are local to one RichText field.

4. Block-shaped nested attribute objects can be misclassified as real blocks.

   `getContainingBlockYMap()` currently identifies a block-shaped `Y.Map` by
   checking for `clientId`, `innerBlocks`, and a parent `Y.Array`. Nested
   attribute data can legally have those keys. For example,
   `attributes.cards[0] = { clientId, innerBlocks, content: Y.Text }` can be
   treated as a document block and resolve to the wrong local block path.

   This was introduced by the generic nested-RichText support in PR
   [#77673](https://github.com/WordPress/gutenberg/pull/77673). It correctly
   stopped assuming a fixed parent depth, but replaced that with shape-based
   block detection rather than membership in the actual block tree. That became
   dangerous because
   [#75590](https://github.com/WordPress/gutenberg/pull/75590) intentionally
   removed awareness block client IDs and made receivers recover the local
   block by walking the Yjs block tree.

5. Same-block selections across different RichText fields render as one text
   root.

   `SelectionInOneBlock` currently means same block clientId, but the overlay
   also treats it as same DOM text root. A selection from one table cell to
   another can have one block clientId and two different `attributeKey`s. The
   current single-block rendering path applies both offsets to the start
   element.

   This comes from the selection model introduced by
   [#74728](https://github.com/WordPress/gutenberg/pull/74728) and the overlay
   renderer added by
   [#76107](https://github.com/WordPress/gutenberg/pull/76107): both treated
   "same block" as enough information to render one continuous text selection.
   PR [#77673](https://github.com/WordPress/gutenberg/pull/77673) adds
   endpoint `attributeKey`s, but the rendering branch still conflates same
   block with same RichText root.

6. Same-block browser selections may lose independent start/end RichText keys.

   The block-editor selection observer has a singular-selection branch that
   chooses one RichText element from either endpoint and uses that key for both
   start and end. If a natural drag stays inside one block but crosses two
   RichText fields, this can collapse the sender-side selection before
   awareness sees it.

   This was exposed by
   [#77136](https://github.com/WordPress/gutenberg/pull/77136), which fixed a
   writing-flow toolbar case by choosing a single RichText element for a
   singular same-block selection. That is reasonable for toolbar focus, but RTC
   awareness now needs independent start and end RichText identities when a
   natural selection crosses table cells or other same-block fields.

7. Nested RichText cursor scope in CRDT merges is top-level only.

   `updateYBlockAttribute()` seeds `cursorScope.attributeKey` with the
   top-level attribute name, such as `body`. The merge code descends through
   query arrays and maps, but does not accumulate the full RichText path such
   as `body.1.cells.1.content`. Cursor-scoped rich-text updates therefore do
   not reliably match nested RichText fields.

   This was introduced in stages. The cursor-aware rich-text merge path was
   designed around top-level RichText attributes. Then
   [#76597](https://github.com/WordPress/gutenberg/pull/76597),
   [#76913](https://github.com/WordPress/gutenberg/pull/76913), and
   [#77164](https://github.com/WordPress/gutenberg/pull/77164) extended RTC
   support into nested attributes and table structures without carrying the
   accumulated nested RichText path through the cursor scope.

8. Selection history and restore paths can replay stale `attributeKey`s.

   Selection history stores a relative position plus the `attributeKey`, then
   converts the relative position back to a `WPBlockSelection` using the stored
   key. If the underlying `Y.Text` moved to a new nested path, undo/redo or
   restored selections can resurrect the old table-cell path.

   This was introduced by
   [#74878](https://github.com/WordPress/gutenberg/pull/74878), which stores a
   `Y.RelativePosition` plus an `attributeKey` in selection history. That is
   safe while the key is a stable top-level address. PR
   [#77673](https://github.com/WordPress/gutenberg/pull/77673) makes nested
   positional keys part of cursor awareness, so the same stale-address bug now
   applies to undo/redo and selection restore.

9. Overlay DOM lookup is too broad and too selector-dependent.

   The overlay builds selectors from `localClientId` and `attributeKey`, and
   then uses `blockElement.querySelector()` for the keyed RichText target. That
   can match descendant child blocks with common keys such as `content`, and
   `localClientId` is not escaped. The safer contract is exact attribute
   comparison scoped to the resolved block element.

   This was introduced by the selector-based lookup in
   [#76107](https://github.com/WordPress/gutenberg/pull/76107), which was
   adequate when the overlay only needed to find a block-level target. PR
   [#77673](https://github.com/WordPress/gutenberg/pull/77673) extends that
   pattern to nested `data-wp-block-attribute-key` values, where child-block
   scoping and selector escaping become correctness issues.

## Fix plan

1. Harden Yjs block membership.

   A real block map must be in the root `blocks` array, or in the exact
   `innerBlocks` array of another real block. Update `getContainingBlockYMap()`
   and `getBlockPathInYdoc()` to validate that ancestry by object identity.
   Do not accept arbitrary maps just because they have `clientId` and
   `innerBlocks`.

2. Add reverse `Y.Text` to `attributeKey` resolution.

   Add a helper that starts from a resolved `Y.Text`, walks parent links back
   to the containing block's `attributes` map, and builds the current dotted
   path by map keys and array indexes. It should return `null` if the text is
   deleted, outside `attributes`, or ambiguous. Preserve the existing rule that
   direct top-level keys win before dotted-path traversal.

3. Use the derived key in awareness resolution.

   In `PostEditorAwareness.convertSelectionStateToAbsolute()`, resolve the
   relative position, find the containing real block, derive the current key,
   and return that key in `ResolvedSelection`. The sender key should be kept as
   a compatibility or debugging hint only, and used as a fallback only when it
   still resolves to the same live `Y.Text`.

4. Use the same derivation in selection restore paths.

   Update `crdt-selection` and `block-selection-history` conversions so a
   stored relative position is restored with the current RichText key, not the
   stale saved address.

5. Make keyed overlay lookup strict and scoped.

   If a resolved selection has an `attributeKey`, the overlay must find that
   exact RichText node inside the resolved block or render nothing. Only
   unkeyed legacy selections may fall back to the block element. Filter keyed
   candidates so their closest `[data-block]` is the resolved block element.
   Prefer exact attribute comparison over selector construction.

6. Add same-block, multi-RichText rendering.

   Keep awareness selection types stable. In the overlay, split rendering into:
   cursor, same RichText range, same block with different RichText targets, and
   cross-block range. For same block plus different keys, resolve both endpoint
   RichText elements, order by DOM position, draw endpoint partial ranges and
   any intermediate RichText fields as needed, and anchor the cursor to the
   active endpoint based on direction.

7. Verify and, if needed, fix sender selection capture.

   Before changing the block-editor observer, test whether natural same-block
   drags across table cells produce distinct `getSelectionStart()` and
   `getSelectionEnd()` keys. If not, update the singular-selection branch in
   the writing-flow observer to record independent start and end RichText
   elements and offsets.

8. Thread full nested cursor scope through CRDT merges.

   When `mergeYValue()` descends through maps and arrays, carry the accumulated
   attribute path. RichText cursor scope should compare against
   `body.1.cells.1.content`, not just `body`.

9. Add redraw liveness without awareness feedback.

   Once keyed misses hide cursors, the overlay needs a deterministic recompute
   when block or RichText DOM changes. Add a debounced redraw-only trigger from
   block/content DOM changes or relevant store updates. It must not publish
   awareness or edit entity state.

## Validation plan

- Unit-test block-tree membership with block-shaped nested attributes.
- Unit-test current-key derivation after table row insert, row delete, and
  caption removal.
- Unit-test awareness resolution for block-shaped nested arrays.
- Unit-test strict keyed overlay lookup, child-block scoping, and
  selector-hostile keys.
- Unit-test same-block, different-RichText selection rendering, including
  backward selection.
- Unit-test nested cursor scope through CRDT query arrays and maps.
- Run the focused awareness and overlay unit suites.
- Run the collaboration nested-awareness E2E suite headlessly.
- Add adversarial table cases with duplicate row/cell content before claiming
  the row-following behavior is fully correct under ambiguous table merges.
