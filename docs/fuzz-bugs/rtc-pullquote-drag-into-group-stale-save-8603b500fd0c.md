# RTC Pullquote Drag Into Group Can Persist a Stale Top-Level Duplicate

Bug signature: `8603b500fd0c`

The original handoff described a collaboration bug where a Pullquote inserted by
one editor and dragged into a Group by another editor could leave a stale
top-level duplicate. The straightforward convergence path is covered by the
stale top-level block reconciliation work in `pr/77876`, but pass 172 found a
remaining persistence race on the current known-fixes stack. Pass 173 narrowed
that race to the stale serialized-content merge fallback used by
`prePersistPostType`.

## Practical Trigger

1. Open the post editor with RTC collaboration enabled over the HTTP polling
   transport.
2. Use two browser sessions or users on the same draft.
3. Start with a Heading, a Group containing two Paragraph blocks, and a tail
   Paragraph.
4. One collaborator inserts a top-level Pullquote after the tail Paragraph using
   normal editor UI.
5. The other collaborator drags the Pullquote into the existing Group using the
   block toolbar drag handle.
6. Before the stale collaborator receives the move, the stale collaborator
   clicks Save draft.
7. After convergence, another Save draft and reload can persist both the nested
   Pullquote and the stale top-level Pullquote.

No malformed block markup, direct store mutation, synthetic block trees, or
network fault injection is required. The narrow part is the save timing: the
stale collaborator has to save after the other editor moves the Pullquote but
before the local HTTP polling session has applied that move.

## Evidence

Pass 172 reproduced the surviving bug on the current known-fixes base
`f256024286dd80a4c0e2579f658c109256abf648`, which includes the `pr/77876`
stale top-level reconciliation changes.

The corrected post-convergence persistence check passed:

```bash
RTC_8603_REPRO_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-172/8603-knownfix-persist-results \
WP_ENV_PORT=9990 WP_ENV_PHPMYADMIN_PORT=9992 WP_BASE_URL=http://localhost:9990 \
npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-8603b500fd0c-pass172-persist.spec.ts --reporter=line
```

Result: `2 passed`.

The fast-save variant failed on the same base:

```bash
RTC_8603_REPRO_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-172/8603-knownfix-immediate-save-results \
WP_ENV_PORT=9990 WP_ENV_PHPMYADMIN_PORT=9992 WP_BASE_URL=http://localhost:9990 \
npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-8603b500fd0c-pass172-immediate-save.spec.ts --reporter=line
```

The captured final persisted content contained one Pullquote nested in the
Group and a second stale top-level Pullquote after the tail Paragraph:

```html
<!-- wp:group {"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
<!-- wp:pullquote -->
<figure class="wp-block-pullquote"><blockquote><p><em>alpha</em><strong>beta</strong></p><cite>plain <strong>text</strong></cite></blockquote></figure>
<!-- /wp:pullquote --></div>
<!-- /wp:group -->

<!-- wp:paragraph -->
<p>Tail paragraph kept for save and reload stability checks.</p>
<!-- /wp:paragraph -->

<!-- wp:pullquote -->
<figure class="wp-block-pullquote"><blockquote><p><em>alpha</em><strong>beta</strong></p><cite>plain <strong>text</strong></cite></blockquote></figure>
<!-- /wp:pullquote -->
```

## Root Cause

The stale save writes content whose Pullquote is still a top-level block. After
the live editor converges to the correct nested shape, a later save calls
`prePersistPostType` in `packages/core-data/src/entities.js`. When applying the
persisted CRDT document does not replace local content, the save path falls back
to `mergeStaleSerializedBlockContent`.

That helper has a branch for stale local content that is shorter than the latest
saved content:

```js
latestBlocks.length > localBlocks.length &&
	baseBlocks.length === latestBlocks.length;
```

It verifies that the top-level prefix block names still match, then appends the
latest trailing blocks to the local blocks. That is correct when the local save
is genuinely missing newly appended remote blocks. It is wrong when the trailing
latest block was moved into an earlier local container. In this bug:

- latest/stale REST content still has the Pullquote after the tail Paragraph;
- local editor content has a shorter top-level list because the Pullquote moved
  into the Group;
- the top-level prefix still matches: Heading, Group, Paragraph;
- the fallback appends the stale trailing Pullquote, producing a nested
  Pullquote plus the stale top-level duplicate.

Pass 173 added a focused unit repro for exactly this shape and a guard that
counts serialized block identities recursively in local content. A latest
trailing block is not appended if an extra matching serialized block is already
present inside the local prefix. A companion unit test preserves legitimate
trailing duplicate content when the prefix already contained the same serialized
block.

The natural fast-save Playwright repro passed after rebuilding the minified
core-data bundle with that guard. The first pass-173 browser run still failed
because the browser loaded `build/scripts/core-data/index.min.js`, while only
the source and unminified build artifact had been patched.

Focused unit verification:

```bash
npm run test:unit -- packages/core-data/src/test/entities.js --runInBand --testNamePattern='does not append a stale trailing block|preserves a trailing duplicate block|preserves latest trailing serialized blocks'
```

Result after the guard: `PASS`, 3 tests passed.

Natural fixed repro:

```bash
RTC_8603_REPRO_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-173/8603-minified-guard-trace-results \
WP_ENV_PORT=9990 WP_ENV_PHPMYADMIN_PORT=9992 WP_BASE_URL=http://localhost:9990 \
npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-8603b500fd0c-pass173-immediate-save.spec.ts --grep 'remote-pullquote-drag-into-group' --reporter=line --trace on
```

Result after rebuilding the minified core-data bundle: `1 passed`.

## Impact

This is persistent content duplication/corruption, not just a transient UI-only
divergence. It does not look like a save loop, OOM, or performance failure.
Recovery is straightforward before persistence: wait for convergence or reload.
After persistence, recovery requires manually deleting the duplicate block and
saving again.

The likely real-user frequency is medium: the block actions are normal editor
operations, and two collaborative sessions are a supported RTC workflow. The
timing requirement is narrower than ordinary editing because the stale peer must
save before receiving the move.
