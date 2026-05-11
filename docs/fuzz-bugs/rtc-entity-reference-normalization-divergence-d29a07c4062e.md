# RTC Entity Reference Normalization Divergence: `d29a07c4062e`

## Decision

This is a real RTC persisted-block reconciliation bug. It is a narrower sibling
of the `440c86261e16` entity-normalization save-loop bug, but it is not fully
covered by that branch because the d29 shape also differs by HTML-equivalent
link attribute ordering.

The manifest row is high confidence and reports seed `930889` producing invalid
paragraph and heading blocks. One peer kept preserved raw source such as
`&lt;em&gt;...&lt;/em&gt;` plus `href,title` attribute order while another peer saw
generated content such as `&lt;em>...&lt;/em>` plus `title,href`. The exact archived
seed artifacts are missing locally, so this branch adds a reconstructed d29
unit repro and a natural Code Editor collaboration repro.

Practical real-user likelihood is **very-low**. The content and history
requirements are unusual, but all user-facing actions in the Playwright repro
are normal editor actions. Pass 178 kept this classification after checking
that the natural route is a raw-source/import route: ordinary Visual Editor
typing does not normally create preserved invalid `originalContent` with this
mix of semicolonless entities, escaped visible tags, URL ampersands, and
attribute-order differences.

## Practical Impact

Natural trigger:

- Editor surface: post editor.
- Transport: HTTP collaboration sync in the manifest; the root comparison is
  below the HTTP/WebSocket transport choice.
- Blocks: invalid `core/paragraph` and `core/heading` blocks.
- Content shape: raw block HTML with semicolonless or alternate entity
  spellings, escaped visible tag text, and link attributes whose order can
  differ while the DOM is equivalent.
- Timing: no network race is required after a persisted `_crdt_document` exists.
- Collaboration: two tabs/users make the symptom visible, but the bad decision
  is the persisted CRDT hydration comparison.
- Save/reload: required. The bug appears when persisted CRDT blocks preserve
  raw invalid `originalContent` but post content is equivalent after entity or
  DOM normalization.

Common prerequisites are ordinary paragraph/heading blocks, saving and
reloading posts, and surfaces that accept raw block markup such as Code Editor,
imports, REST, WP-CLI, or plugins. Rare prerequisites are RTC persistence, users
leaving invalid blocks unrecovered, and a stale CRDT document beside equivalent
canonicalized post content. The dense exact entity mix is fuzz-specific.

Blast radius is save and sync churn rather than proven content loss: false
`blocks` changes, repeated `_crdt_document` writes, extra revisions/meta writes,
and collaborators disagreeing over preserved versus generated source spelling.
Recovery is to recover/normalize the invalid blocks, clear/regenerate
`_crdt_document`, disable RTC persistence, or run the fix.

## Root Cause

`2d8b22633dd3889e1a4405dcc7ebfd4bb8dbf71c`
([#72373](https://github.com/WordPress/gutenberg/pull/72373)) introduced
persisted CRDT validation. The logic was intended to detect external
`post_content` changes before trusting persisted CRDT blocks.

`001a25614827c855e283ee0623a17762360ae591`
([#75437](https://github.com/WordPress/gutenberg/pull/75437)) kept that logic
while syncing `content` and `undefined` `blocks` values. The current trunk code
still does this for persisted documents:

```ts
__unstableSerializeAndClean( blocksJson ).trim() !==
	getRawValue( editedRecord.content )
```

That byte comparison is too strict for invalid blocks. Invalid blocks preserve
`originalContent` to avoid data loss. For d29-shaped content, the preserved raw
source and the generated post content can be DOM-equivalent while differing by
entity spelling and link attribute order.

## Fix Plan Audit

Initial fix direction: parse persisted content into a fresh block tree and
compare normalized block trees.

Rejected: that is too broad for a hot hydration path, creates client ID noise,
and risks trusting parser recovery over invalid-block preservation.

Revised fix:

1. Keep the exact byte comparison fast path.
2. Only enter the fallback when persisted CRDT blocks include invalid blocks
   with string `originalContent`.
3. Generate serialization with those invalid blocks treated as valid
   serialization-only copies.
4. If that still differs, compare the generated serialization and persisted
   content as HTML fragments with root whitespace ignored. This treats entity
   spellings and attribute order as representation-only.
5. Fail closed on missing DOM support or parsing/serialization exceptions.

Kernel-maintainer robustness: the slow path is gated to invalid persisted
blocks, and failures still report blocks as changed.

Jepsen-style correctness: equivalent encodings are not conflicts, but real
generated-content changes still invalidate persisted blocks.

Simplicity/performance: no full block-tree reparse in the common path; one DOM
fragment comparison only after both string checks fail.

## Verification

Known-fixes base `f256024286dd80a4c0e2579f658c109256abf648` is still affected.
Cherry-picking only the unit repro onto that SHA failed: the d29 equivalence
test returned `blocks`, while the real changed-content control passed.

Pass 177 rebased the explanation and PR branches onto `origin/trunk`
`3d0da214614`. The d29 patch cherry-picked cleanly on that trunk, and the
focused unit repro/fix check passed there.

Pass 178 rebased both branches onto `origin/trunk`
`96263113a874ab1fc1668f7bb500c98766e90e76`. The unchanged fix stack still
applies cleanly. A fresh focused unit run on the rebased PR branch passed both
d29 checks:

```text
npm install --ignore-scripts
npm run --workspace @wordpress/icons build
npm run test:unit -- packages/core-data/src/utils/test/crdt.ts --testNamePattern='equivalent entity references|generated content really changed' --runInBand --no-cache
PASS, 2 selected tests passed, 45 skipped

git diff --check origin/trunk...HEAD
PASS
```

PR branch commit order:

```text
7202f58a717 Add RTC entity reference normalization CRDT repro
e8011bbb08c Add RTC d29 entity reference Playwright repro
da75fd4a253 Fix RTC entity reference normalization comparison
```

Final verification on the fixed branch:

```text
Pass 177 refreshed branch:
npm run --workspace @wordpress/icons build
PASS

npm run test:unit -- packages/core-data/src/utils/test/crdt.ts --testNamePattern='equivalent entity references|generated content really changed' --runInBand --no-cache
PASS, 2 selected tests passed, 45 skipped

git diff --check origin/trunk...HEAD
PASS

Pass 176 full branch:
npm run test:unit -- packages/core-data/src/utils/test/crdt.ts --runInBand --no-cache
PASS, 47 tests passed

WP_ENV_PORT=10085 WP_BASE_URL=http://localhost:10085 \
RTC_MANIFEST_WS_START_PORT=21880 RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-d29a07c4062e-realistic.spec.ts --project=chromium --workers=1
PASS, 1 Chromium test passed

npm run format -- --check packages/core-data/src/utils/crdt.ts packages/core-data/src/utils/test/crdt.ts test/e2e/specs/editor/collaboration/triage-d29a07c4062e-realistic.spec.ts
PASS

npm run lint:js -- packages/core-data/src/utils/crdt.ts packages/core-data/src/utils/test/crdt.ts test/e2e/specs/editor/collaboration/triage-d29a07c4062e-realistic.spec.ts
PASS
```

Video artifact:

```text
/Users/danluu/dev/fuzz/gutenberg-bug-d29a07c4062e/artifacts/fuzz-bug-videos/d29a07c4062e-annotated.mp4
```
