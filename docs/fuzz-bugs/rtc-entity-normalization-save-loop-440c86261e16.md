# RTC Entity Normalization Save Loop: `440c86261e16`

## Decision

This is a real product bug in RTC persisted entity reconciliation, not just
the WebSocket readiness timeout observed in the archived fuzz run.

The archived WebSocket run failed while waiting for an HTTP `wp-sync`
response in a WebSocket transport run. That explains the direct Playwright
failure surface, but the artifact also shows both collaborators online, the
post in `Saved` state, and deterministic invalid-block validation warnings
for entity-rich paragraph and heading content.

Pass 172 reconfirmed the product defect below Playwright on the May 7
backlink-aware known-fixes base (`f256024286dd80a4c0e2579f658c109256abf648`),
rebased the explanation and fix branches onto current `origin/trunk`
(`dc3bc7decd0aed8733ee6538c0feb368da19703d`), and tightened the
natural-user Playwright repro so it waits for the persisted CRDT document after
collaborative hydration instead of assuming the first single-user save already
persisted `_crdt_document`.
When a persisted CRDT document contains invalid parsed blocks, Gutenberg preserves
`originalContent` to avoid data loss. If the saved post content differs from
that preserved `originalContent` only by equivalent HTML entity normalization,
the persisted CRDT blocks are byte-compared against post content and
misclassified as stale. That can make reload/save reconciliation produce a
new block edit with no user-visible content change.

Pass 175 rebased both artifact branches onto `origin/trunk`
`b38f9b4d86d0505199f5efd78c2adf213e428e78`, reran the focused CRDT repro on
the rebased fix, reran the May 7 known-fixes control with the rebased repro
patch, and verified that the existing headless video artifact is still present.
It does not change the root-cause claim; it tightens the practical-impact
boundary around stale `_crdt_document` plus a later equivalent
`post_content` canonicalization.

Pass 178 rebased the PR and explanation branches onto current `origin/trunk`
`569ea262b573872d5f364e9f4829132c47c683d4`, reconfirmed that current trunk
still has the strict persisted-block serialization comparison, reran the
focused fixed-head unit repro, and reran the May 7 known-fixes control with
only the rebased repro commit. The browser repro was not rerun in pass 178
because the worktree dependency install is stale relative to current trunk:
the build first hit a copied `esbuild` platform mismatch and then, after
switching to the May 7 dependency tree, failed because the newer
`@wordpress/style-runtime` workspace package is absent from that dependency
install. The existing headless video and pass-174 Chromium run remain the
browser evidence; pass 178's new evidence is current-trunk and current-branch
unit verification plus a sharper practical-impact classification.

Pass 179 rebased both branches onto current `origin/trunk`
`b41e4e944f7311d860b25ee8fbe279655d09bf099` and reran the focused controls.
Current trunk and the May 7 backlink-aware known-fixes base still fail the
entity-normalized persisted-block assertion, while the rebased fixed head
passes. Current trunk already contains the WebSocket-aware collaboration
fixture helpers, so the rebased Playwright repro commit now only adds the
signature-specific spec file.

Pass 180 refreshed the PR branch onto current `origin/trunk`
`cb74beb786b366ff69dac328b04861add1a67974`. The current-trunk control, with
only the CRDT repro commit applied, still fails the entity-normalized
persisted-block assertion; the exact May 7 known-fixes manifest SHA
`f256024286dd80a4c0e2579f658c109256abf648` fails the same assertion. The
three-commit fix stack cherry-picks cleanly onto current trunk and passes the
focused assertions. Pass 180 also tightens the browser-evidence boundary: the
archived WebSocket failure is a real editor state with both collaborators
online, `Saved`, and invalid entity-rich paragraph/heading blocks visible, but
the thrown surface is still a readiness wait. The product proof remains the
persisted CRDT comparison where stale invalid-block `originalContent` is
compared byte-for-byte with canonicalized `post_content`.

## Practical Impact

Real-user likelihood is **very-low**. The bug does not require a network race,
but it does require a specific content, feature, and history combination:
RTC/collaboration must be enabled, `_crdt_document` must have been persisted,
the post must contain invalid parsed blocks, and a later normalizing path must
rewrite `post_content` to an equivalent generated/canonical representation
while stale CRDT blocks still preserve the older `originalContent`.

The natural user workflow is a post-editor import/migration/plugin workflow, or
a Code Editor workflow followed by a separate canonicalizing rewrite. A user or
tool creates ordinary paragraph or heading block markup with legacy or
hand-authored entity spellings such as semicolonless `&nbsp`, `&copy`, `&amp`,
`&lt`, numeric ampersands, or ambiguous named references in text or link
attributes. The editor parses those blocks as invalid and preserves their raw
`originalContent`. After `_crdt_document` has been persisted, another path
canonicalizes `post_content` without clearing or regenerating the CRDT document.
On RTC-enabled reopen or reload, persisted CRDT reconciliation compares stale
raw `originalContent` bytes to canonical post content and can re-emit a
representation-only `blocks` change. Two browser tabs or two users make the
collaborative symptom visible, but the root persisted document comparison is
transport-independent and is not timing-sensitive.

Common prerequisites are ordinary paragraph/heading blocks, saving/reloading a
post, and a product surface that accepts raw block markup. Uncommon but
realistic prerequisites are RTC persistence, leaving visible invalid blocks in
place, and entity-only invalidity rather than true content drift. Rare
prerequisites are the stale-CRDT-plus-canonicalized-content ordering and any
importer/plugin/server path that normalizes `post_content` while leaving
`_crdt_document` intact. The archived fuzz spec's REST seeding and the
low-level CRDT state mutation are artificial; the PR-branch Playwright repro
uses normal Code Editor UI actions to cover the invalid-block collaboration
surface, while the focused unit repro covers the stale canonicalized-content
state directly.

The observed blast radius is save churn, not proven content loss: repeated
`_crdt_document` persistence, possible `Saving`/`Saved` flicker, extra REST
writes, and revision/meta churn. Recovery is to recover or normalize the
invalid blocks, clear/regenerate RTC persistence, disable collaboration
persistence, or run fixed code.

## Source Evidence

Source JSONL:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-ws-0/fuzz-handoff/distinct-manifest-20260505/results-refresh-websocket-shard-0/results.jsonl
```

Matching row:

```json
{"key":"rtc-entity-normalization-save-loop::440c86261e16::test/e2e/specs/editor/collaboration/triage-440c86261e16-realistic.spec.ts","bugType":"rtc-entity-normalization-save-loop","signature":"440c86261e16","specPath":"test/e2e/specs/editor/collaboration/triage-440c86261e16-realistic.spec.ts","transport":"websocket","result":"failed","exitCode":1,"timedOut":false,"durationMs":24056,"startedAt":"2026-05-05T10:24:24.498Z","completedAt":"2026-05-05T10:24:48.554Z"}
```

The log records generated save output canonicalizing entity spellings such as
`&notin;`, `&notin text`, `&copy`, `&#38`, and `&#x26`, while the retrieved post
body retained user-authored semicolonless and numeric spellings.

## Reproduction

Commit `a07a89df071` adds the lowest-level repro in
`packages/core-data/src/utils/test/crdt.ts`. It parses a normal paragraph block
whose user-authored entity spellings make the block invalid. The parsed block
has generated rich-text attributes, but also preserved `originalContent`. The
persisted post content is the generated serialization. Before the fix,
`getPostChangesFromCRDTDoc` reports `blocks` as changed anyway.

Pass 167 reran this first commit in a throwaway worktree:

```text
FAIL packages/core-data/src/utils/test/crdt.ts
Expected path: not "blocks"
Received value: [ invalid core/paragraph block with preserved originalContent ]
```

Commit `46373eb53fe` adds the natural-user Playwright repro:

```text
test/e2e/specs/editor/collaboration/triage-440c86261e16-realistic.spec.ts
```

It uses normal editor UI actions: create a post, switch to the built-in code
editor, type valid block markup containing entity-rich content, switch back,
save, open a two-user WebSocket collaborative session, reload both peers, and
assert that the persisted CRDT document stays stable.

Pass 172 reran this repro headlessly using a clean Playwright runner pointed at
the rebased bug-worktree `wp-env-test` server, with `.wp-env.test.json`,
`WP_ENV_PORT=9944`, `WP_BASE_URL=http://localhost:9944`,
`RTC_MANIFEST_WS_START_PORT=20752`, and `RTC_MANIFEST_WS_FIXED_PORT=1`. It
passed in Chromium with the expected paragraph and heading block-validation
warnings from entity normalization.

## Known-Fixes Status

The known-fixes base is still affected. Pass 170 read the May 7 manifest, then
applied the focused unit repro to
`f256024286dd80a4c0e2579f658c109256abf648` and reran with `--no-cache`. It
failed for the same product assertion, returning `blocks` when only
entity-normalized `originalContent` differed.

## Root Cause

`2d8b22633dd3889e1a4405dcc7ebfd4bb8dbf71c`
([PR #72373](https://github.com/WordPress/gutenberg/pull/72373)) introduced
persisted CRDT validation. The intent was sound: do not blindly trust a
persisted CRDT document if the underlying post content was changed externally.

The implementation serialized persisted CRDT blocks and compared that byte
string to persisted post content. `git blame origin/trunk -L 320,350 --
packages/core-data/src/utils/crdt.ts` shows that this persisted-doc branch
came from PR #72373.

`001a25614827c855e283ee0623a17762360ae591`
([PR #75437](https://github.com/WordPress/gutenberg/pull/75437)) later synced
post `content` and `undefined` `blocks` for code-editor and revision-restore
workflows. That preserved the too-literal comparison as:

```text
__unstableSerializeAndClean( blocksJson ).trim() !==
	getRawValue( editedRecord.content )
```

The comparison is too strict for invalid blocks. For these blocks,
`originalContent` intentionally preserves the user's source spelling. Entity
normalization can make the generated serialization match the persisted post
content while `originalContent` remains byte-different.

`a0c7c38face25a84c83a43d996f2e8e90371a2db`
([PR #77529](https://github.com/WordPress/gutenberg/pull/77529)) fixed an
analogous RTC dirty-state loop for orphaned meta keys, but not this block
content equivalence bug.

## Fix Plan Audit

The broad fix would be to parse persisted post content and compare normalized
block trees. That is too much machinery for a reconciliation fast path: it
allocates fresh block trees, introduces client-ID noise, and risks trusting
parser recovery over preserved invalid-block content.

The adopted fix keeps the exact string comparison as the common fast path.
Only when that differs and the CRDT document contains invalid blocks with
preserved `originalContent` does it attempt a generated-serialization
fallback. The fallback is fail-closed: if generation throws or still differs,
the persisted blocks remain classified as changed.

Pass 166 tightened this fallback further. It now forces generated serialization
only for invalid blocks that actually carry string `originalContent`; other
valid or unrelated invalid blocks are preserved in the serialization copy.
Pass 167 rechecked that narrower fallback without changing it.

## Fix

Commit `6cf4d1d36e2` updates `packages/core-data/src/utils/crdt.ts`:

1. Serialize persisted CRDT blocks exactly as before and return unchanged if
   they match persisted post content.
2. If they differ, check whether any invalid block has preserved
   `originalContent`.
3. For that narrow case, create a serialization-only copy of the block tree.
   Invalid blocks with `originalContent` are marked valid and stripped of
   parser-only fields (`originalContent`, `validationIssues`, and
   `__unstableBlockSource`).
4. Compare the generated serialization to persisted post content.
5. Treat the CRDT document as unchanged only if that generated serialization
   matches.

## Verification

Pass 172 verification on the rebased PR branch:

```text
a07a89df071 Add RTC entity normalization CRDT repro
46373eb53fe Add RTC entity normalization Playwright repro
6cf4d1d36e2 Fix RTC persisted entity normalization save loop
```

Focused known-fixes control at `f256024286d`, with commit `a07a89df071`
applied as a repro patch:

```text
FAIL packages/core-data/src/utils/test/crdt.ts
expected path not "blocks"; received invalid paragraph block
```

Focused fixed-head unit repro, run from a clean temporary worktree at
`6cf4d1d36e2` with the May 7 dependency install:

```text
npm run test:unit -- packages/core-data/src/utils/test/crdt.ts --testNamePattern='entity-normalized|generated content differs' --no-cache
PASS, 2 passed
```

Natural-user Playwright repro, using the clean temp runner against the
rebased bug-worktree `wp-env-test` server:

```text
env WP_ENV_PORT=9944 WP_BASE_URL=http://localhost:9944 RTC_MANIFEST_WS_START_PORT=20752 RTC_MANIFEST_WS_FIXED_PORT=1 npm run wp-env-test -- status
status: uninitialized

env WP_ENV_PORT=9944 WP_BASE_URL=http://localhost:9944 RTC_MANIFEST_WS_START_PORT=20752 RTC_MANIFEST_WS_FIXED_PORT=1 npm run wp-env-test -- start
WordPress development site started at http://localhost:9944

env WP_ENV_PORT=9944 WP_BASE_URL=http://localhost:9944 RTC_MANIFEST_WS_START_PORT=20752 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-440c86261e16-realistic.spec.ts --project=chromium --workers=1
PASS, 1 Chromium test passed

env WP_ENV_PORT=9944 WP_BASE_URL=http://localhost:9944 RTC_MANIFEST_WS_START_PORT=20752 RTC_MANIFEST_WS_FIXED_PORT=1 npm run wp-env-test -- stop
Stopped WordPress
```

Pass 172 also caught and removed a repro flake: the Playwright spec no longer
requires `_crdt_document` to be present immediately after the first single-user
draft save. The defect requires a persisted document on collaborative reload, so
the repro now waits for both collaborative peers to share a non-empty persisted
CRDT document and then verifies it remains stable across reload.

Quality checks:

```text
npm run format -- --check packages/core-data/src/utils/crdt.ts packages/core-data/src/utils/test/crdt.ts test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts test/e2e/specs/editor/collaboration/triage-440c86261e16-realistic.spec.ts
npm run lint:js -- packages/core-data/src/utils/crdt.ts packages/core-data/src/utils/test/crdt.ts test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts test/e2e/specs/editor/collaboration/triage-440c86261e16-realistic.spec.ts
npm run build -- --skip-types
```

The focused format and lint commands passed again in pass 172 using the clean
runner. The broader `npm run build -- --skip-types` check was not rerun in pass
172; it had passed sequentially in pass 167 before the later rebases, and pass
172 changed only the Playwright assertion timing.

Pass 167 additionally regenerated the annotated headless video as:

```text
/Users/danluu/dev/fuzz/gutenberg-bug-440c86261e16/artifacts/fuzz-bug-videos/rtc-entity-normalization-save-loop-440c86261e16-pass167.mp4
```

Pass 173 rebased both artifact branches onto `origin/trunk`
`114082fd16895304936ddd048e617891ab8f9f48`. The PR branch kept the required
three-commit order:

```text
2b1f39c3c74 Add RTC entity normalization CRDT repro
08cbda46630 Add RTC entity normalization Playwright repro
32d4e3e2ba8 Fix RTC persisted entity normalization save loop
```

The focused fixed-head unit repro passed from a clean detached worktree at
`32d4e3e2ba8`:

```text
npm run test:unit -- packages/core-data/src/utils/test/crdt.ts --testNamePattern='entity-normalized|generated content differs' --no-cache
PASS, 2 passed
```

The exact May 7 known-fixes manifest SHA
`f256024286dd80a4c0e2579f658c109256abf648`, with the first repro commit
applied as a patch, still failed:

```text
FAIL packages/core-data/src/utils/test/crdt.ts
Expected path: not "blocks"; received the invalid paragraph block from
entity-normalized originalContent.
```

Pass 174 rebased both artifact branches onto `origin/trunk`
`6aa5ea1a40db818a9c0d2d85d0d0476f7d40392a`. The PR branch still has the
required three-commit order:

```text
e7ea3b46a82 Add RTC entity normalization CRDT repro
e60575508d9 Add RTC entity normalization Playwright repro
2dfafbc210b Fix RTC persisted entity normalization save loop
```

The fixed branch passed the focused unit repro from a clean detached worktree:

```text
/private/tmp/gutenberg-440c-pass174-fixed.DS687d
npm run test:unit -- packages/core-data/src/utils/test/crdt.ts --testNamePattern='entity-normalized|generated content differs' --no-cache
PASS, 2 passed
```

The exact May 7 known-fixes SHA, with the rebased first repro commit applied,
still failed the same focused assertion:

```text
/private/tmp/gutenberg-440c-pass174-knownfix-f256.5j9CUj
FAIL packages/core-data/src/utils/test/crdt.ts
Expected path: not "blocks"; received the invalid paragraph block from
entity-normalized originalContent.
```

Pass 174 also reran the natural-user Playwright repro headlessly from the clean
detached fixed worktree against the `wp-env-test` server at
`http://localhost:9944`:

```text
env WP_ENV_PORT=9944 WP_BASE_URL=http://localhost:9944 RTC_MANIFEST_WS_START_PORT=20752 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-440c86261e16-realistic.spec.ts --project=chromium --workers=1
PASS, 1 Chromium test passed
```

The pass-174 practical-impact refinement is a negative control. A parser probe
for minimal, fuzz-shaped, attribute-heavy, and heading samples showed that raw
entity-rich Code Editor/import content creates invalid blocks but preserves the
raw source exactly:

```text
rawEqualsPreserved=true
oldStrictWouldInvalidateRawContent=false
oldStrictWouldInvalidateGeneratedContent=true
```

So raw input alone is not a clean trigger. The practical trigger needs a later
canonicalizing `post_content` rewrite while stale persisted CRDT blocks still
carry invalid-block `originalContent`.

Pass 175 rebased both artifact branches onto `origin/trunk`
`b38f9b4d86d0505199f5efd78c2adf213e428e78`. The PR branch still has the
required three-commit order:

```text
5133208d901 Add RTC entity normalization CRDT repro
0beb35932d3 Add RTC entity normalization Playwright repro
747035bb4a9 Fix RTC persisted entity normalization save loop
```

The focused fixed-head unit repro passed from a clean detached worktree:

```text
/private/tmp/gutenberg-440c-pass175-fixed.A4w8qd
npm run test:unit -- packages/core-data/src/utils/test/crdt.ts --testNamePattern="entity-normalized|generated content differs" --no-cache
PASS, 2 passed, 45 skipped
```

The exact May 7 known-fixes manifest SHA
`f256024286dd80a4c0e2579f658c109256abf648`, with the rebased first repro commit
applied as a patch, still failed the focused assertion:

```text
/private/tmp/gutenberg-440c-pass175-knownfix.UjReyH
FAIL packages/core-data/src/utils/test/crdt.ts
Expected path: not "blocks"; received the invalid paragraph block from
entity-normalized originalContent.
```

Focused quality checks also passed in pass 175:

```text
npm run format -- --check packages/core-data/src/utils/crdt.ts packages/core-data/src/utils/test/crdt.ts test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts test/e2e/specs/editor/collaboration/triage-440c86261e16-realistic.spec.ts
npm run lint:js -- packages/core-data/src/utils/crdt.ts packages/core-data/src/utils/test/crdt.ts test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts test/e2e/specs/editor/collaboration/triage-440c86261e16-realistic.spec.ts
git diff --check origin/trunk..HEAD
```

The pass-167 annotated video is still present and has the expected metadata:

```text
/Users/danluu/dev/fuzz/gutenberg-bug-440c86261e16/artifacts/fuzz-bug-videos/rtc-entity-normalization-save-loop-440c86261e16-pass167.mp4
1920x1080, 600 frames, 20.0 seconds
```

Pass 175 did not rerun Playwright because `wp-env` was uninitialized and the
existing fixed-branch Chromium run plus video already cover the natural-action
browser repro. The new evidence in this pass is the rebase onto current trunk,
fresh known-fixes failure, fresh fixed-head unit pass, and the sharper
very-low-likelihood boundary.

Pass 176 did not change the fix shape. It independently rechecked the branch
package and narrowed the root-cause proof:

```text
origin/trunk: b38f9b4d86d0505199f5efd78c2adf213e428e78
PR branch head: 747035bb4a9a497051d872d27d9859fb9613361d
explanation branch head before this update: fa6bb68cd0d0d6c79927ea91fc761c176bcbb36f
known-fixes SHA: f256024286dd80a4c0e2579f658c109256abf648
```

The focused fixed-head unit repro passed again from a clean detached worktree:

```text
/private/tmp/gutenberg-440c-pass176-fixed.4mpbI0
npm run test:unit -- packages/core-data/src/utils/test/crdt.ts --testNamePattern="entity-normalized|generated content differs" --no-cache
PASS, 2 passed, 45 skipped
```

The exact May 7 known-fixes SHA, with only the repro commit applied, still
failed the entity-normalized assertion:

```text
/private/tmp/gutenberg-440c-pass176-knownfix.1uO3LN
FAIL packages/core-data/src/utils/test/crdt.ts
Expected path: not "blocks"; received the invalid paragraph block from
entity-normalized originalContent.
```

Focused quality checks also passed in pass 176:

```text
npm run format -- --check packages/core-data/src/utils/crdt.ts packages/core-data/src/utils/test/crdt.ts test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts test/e2e/specs/editor/collaboration/triage-440c86261e16-realistic.spec.ts
npm run lint:js -- packages/core-data/src/utils/crdt.ts packages/core-data/src/utils/test/crdt.ts test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts test/e2e/specs/editor/collaboration/triage-440c86261e16-realistic.spec.ts
git diff --check origin/trunk..HEAD
```

`git blame origin/trunk -L 340,348 -- packages/core-data/src/utils/crdt.ts`
confirms the persisted-CRDT guard came from #72373 and the current
`blocksJson`/`getRawValue( editedRecord.content )` strict comparison came from
#75437. `git show f256024286d:packages/core-data/src/utils/crdt.ts` confirms
the backlink-aware known-fixes base still uses that same byte comparison, so
the pass-176 failure is not a test harness artifact from an older checkout.

Pass 177 rebased both artifact branches onto current `origin/trunk`
`daf20d82b9336c73d3ba781e8a88bcd1d5a9f77d`. The PR branch still has the
required three-commit order:

```text
daa1ab7befa Add RTC entity normalization CRDT repro
5b5a372c308 Add RTC entity normalization Playwright repro
4c9d281adca Fix RTC persisted entity normalization save loop
```

The focused fixed-head unit repro passed from a clean detached worktree:

```text
/private/tmp/gutenberg-440c-pass177-fixed-rebased.bLE7UO
npm run test:unit -- packages/core-data/src/utils/test/crdt.ts --testNamePattern="entity-normalized|generated content differs" --no-cache
PASS, 2 passed, 45 skipped
```

The exact May 7 known-fixes SHA, with only the rebased repro commit applied,
still failed the entity-normalized assertion:

```text
/private/tmp/gutenberg-440c-pass177-knownfix-rebased.I4uLdb
FAIL packages/core-data/src/utils/test/crdt.ts
Expected path: not "blocks"; received the invalid paragraph block from
entity-normalized originalContent.
```

`git diff --check origin/trunk..HEAD` passed after the rebase. The annotated
headless video artifact remains present and valid; the newest checked video
metadata is `1920x1080`, `600` frames, and `20.0` seconds for
`rtc-entity-normalization-save-loop-440c86261e16-pass168.mp4`.

Pass 178 rebased both artifact branches onto current `origin/trunk`
`569ea262b573872d5f364e9f4829132c47c683d4`. The PR branch still has the
required three-commit order:

```text
0911d6ff740 Add RTC entity normalization CRDT repro
d5ccbbf9603 Add RTC entity normalization Playwright repro
48e1322ae80 Fix RTC persisted entity normalization save loop
```

Current trunk remains affected. `git show origin/trunk:packages/core-data/src/utils/crdt.ts`
shows the same persisted-doc branch comparing:

```text
__unstableSerializeAndClean( blocksJson ).trim() !==
	getRawValue( editedRecord.content )
```

The focused fixed-head unit repro passed from a clean detached worktree:

```text
/private/tmp/gutenberg-440c-pass178-fixed.INoZ9u
npm run test:unit -- packages/core-data/src/utils/test/crdt.ts --testNamePattern="entity-normalized|generated content differs" --no-cache
PASS, 2 passed, 45 skipped
```

The exact May 7 known-fixes SHA, with only the rebased repro commit applied,
still failed the entity-normalized assertion:

```text
/private/tmp/gutenberg-440c-pass178-knownfix.1XQn0L
FAIL packages/core-data/src/utils/test/crdt.ts
Expected path: not "blocks"; received the invalid paragraph block from
entity-normalized originalContent.
```

`git diff --check origin/trunk..HEAD` passed after the PR-branch rebase.
Pass 178 also rechecked the existing annotated headless video:

```text
/Users/danluu/dev/fuzz/gutenberg-bug-440c86261e16/artifacts/fuzz-bug-videos/rtc-entity-normalization-save-loop-440c86261e16-pass168.mp4
1920x1080, 600 frames, 20.0 seconds, 625895 bytes
```

The pass-178 browser/build path was blocked by local dependency state rather
than by product behavior. `npm run build -- --skip-types` failed first because
the copied dependency graph resolved `esbuild` through an older May 5 install
with the wrong platform package. After replacing the worktree `node_modules`
with the May 7 known-fixes dependency tree, the build progressed through
transpilation and much of bundling but failed because current trunk's
`@wordpress/style-runtime` workspace package was not present in that older
install. A follow-up browser rerun should begin with a fresh `npm install` in
a clean current-trunk worktree rather than the copied dependency tree.

Pass 179 rebased both artifact branches onto current `origin/trunk`
`b41e4e944f7311d860b25ee8fbe279655d09bf099`. The PR branch still has the
required three-commit order:

```text
d422e1f3a9c Add RTC entity normalization CRDT repro
dac0329d529 Add RTC entity normalization Playwright repro
174005ba5bd Fix RTC persisted entity normalization save loop
```

Current trunk remains affected. `git show origin/trunk:packages/core-data/src/utils/crdt.ts`
still shows the persisted-doc branch comparing:

```text
__unstableSerializeAndClean( blocksJson ).trim() !==
	getRawValue( editedRecord.content )
```

The current-trunk control, with only the rebased repro commit applied, failed
the entity-normalized assertion:

```text
/private/tmp/gutenberg-440c-pass179-trunk.Mki1ID
npm --prefix "$tmp" run test:unit -- packages/core-data/src/utils/test/crdt.ts --testNamePattern="entity-normalized|generated content differs" --no-cache
FAIL packages/core-data/src/utils/test/crdt.ts
Expected path: not "blocks"; received the invalid paragraph block from
entity-normalized originalContent.
```

The exact May 7 known-fixes SHA, with only the rebased repro commit applied,
also failed the same focused assertion:

```text
/private/tmp/gutenberg-440c-pass179-knownfix.bAzUBA
FAIL packages/core-data/src/utils/test/crdt.ts
Expected path: not "blocks"; received the invalid paragraph block from
entity-normalized originalContent.
```

The rebased fixed head passed the focused assertions:

```text
npm run test:unit -- packages/core-data/src/utils/test/crdt.ts --testNamePattern="entity-normalized|generated content differs" --no-cache
PASS packages/core-data/src/utils/test/crdt.ts
2 passed, 45 skipped
```

`git diff --check origin/trunk..HEAD` passed after the PR-branch rebase. The
only rebase conflict was in
`test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts`; current
trunk already has the WebSocket readiness helpers needed by this repro, so the
rebased Playwright repro commit now leaves the shared fixture untouched and
adds only
`test/e2e/specs/editor/collaboration/triage-440c86261e16-realistic.spec.ts`.

Pass 180 rebased the PR branch onto current `origin/trunk`
`cb74beb786b366ff69dac328b04861add1a67974`. The required commit order is:

```text
cb6b1af9df5 Add RTC entity normalization CRDT repro
23b6ed3fa77 Add RTC entity normalization Playwright repro
28618f10ccd Fix RTC persisted entity normalization save loop
```

Current trunk remains affected with only the CRDT repro applied:

```text
/private/tmp/gutenberg-440c-pass180-trunk.H0LoJz
npm --prefix "$tmp" run test:unit -- packages/core-data/src/utils/test/crdt.ts --testNamePattern="entity-normalized|generated content differs" --no-cache
FAIL packages/core-data/src/utils/test/crdt.ts
Expected path: not "blocks"; received the invalid paragraph block from
entity-normalized originalContent.
```

The exact May 7 known-fixes SHA remains affected with only the same repro
applied:

```text
/private/tmp/gutenberg-440c-pass180-knownfix.xITp2c
FAIL packages/core-data/src/utils/test/crdt.ts
Expected path: not "blocks"; received the invalid paragraph block from
entity-normalized originalContent.
```

The pass-180 fixed head passed the focused assertions and diff check:

```text
/private/tmp/gutenberg-440c-pass180-pr.Al3mzk
git diff --check origin/trunk..HEAD
npm --prefix "$tmp" run test:unit -- packages/core-data/src/utils/test/crdt.ts --testNamePattern="entity-normalized|generated content differs" --no-cache
PASS packages/core-data/src/utils/test/crdt.ts
2 passed, 45 skipped
```

The same repro and fix commits also cherry-picked cleanly onto current trunk in
`/private/tmp/gutenberg-440c-pass180-fixed-on-trunk.URSbvp`, where the focused
assertions passed. `wp-env` was not started in pass 180; status was
`uninitialized` for `WP_ENV_PORT=9944`. The archived pass-168 video remains
valid at `1920x1080`, `600` frames, `20.0` seconds, `625895` bytes.

## Residual Risk

This fix does not make the entity-rich blocks valid. It only prevents RTC
reconciliation from converting representation-only entity normalization into a
persisted-block save loop.

The practical frequency remains unmeasured. The strongest next data point would
be sampling imported or legacy posts under RTC to see how often users keep
invalid entity-only blocks in place across save/reload.
