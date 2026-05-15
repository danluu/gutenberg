# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-15T20:37:00Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Base handoff:
`docs/explanations/architecture/rtc-likely-real-bug-handoff-20260514.md`

## Executive Status

The fix-planning loop completed the requested 40 iterations. Each iteration
ran the six named primary analyses, then response analysis layers where needed,
and produced either a source-local fix branch or an evidence gate. The result is
not yet a polished set of GitHub PRs, but it is a concrete branch inventory and
PR split plan.

Current state:

- `40/40` fix-planning iterations completed on Jetstream2.
- Most production branches are source-local and touch two files: one product
  file and one focused test file.
- The original fix-planning branch refs plus the new PR 6A / PR 7A / PR 7B
  review refs have been exported from Jetstream2 and pushed to the `danluu`
  remote. They still need rebase onto the intended upstream base and final PR
  shaping before filing.
- Some earlier local/GitHub-facing `try/*-pr` branches already exist and should
  be reused as prior art or tests, but several are stacked or too broad against
  trunk and should not be filed as-is.
- Jetstream2 fuzzing is still running on the validation stack
  `try/rtc-fix-stack-validation` at `72854f05ed20106daac3d125206f2643dac41677`.
  That validates the active stack, but the final exported PR set still needs a
  fresh combined validation run after rebase.

At the earlier `2026-05-15T19:30:08Z` fuzz snapshot, the coverage-guided monitor
was healthy:

```text
coverage files: 8271
total records seen: 16000
unmet goals: 0
recommended groups: none
harness-work candidates: 0
likely-real visible: 0
likely-real merged duplicates: 0
oracle/noise questions: 0
load1: 37.12 / 64 cores
memory: 438.0G free / 492.0G total
disk: 100G used / 3.5T total
```

Latest coverage-guided status at `2026-05-15T20:36:50Z`:

```text
coverage files: 9077
total records seen: 17144
unmet goals: 11
recommended groups: novelty-ws-media-cross-entity, novelty-ws-multi-reload-lifecycle, novelty-ws-parser-serialization, novelty-ws-real-user-editing, novelty-ws-real-user-rich-text
harness-work candidates: 0
likely-real visible: 0
likely-real merged duplicates: 0
oracle/noise questions: 0
load1: 57.03 / 64 cores
memory: 427.8G free / 492.0G total
media/cross-entity coverage: uploads 5/10, reusable-block 3/5, image 3/5, gallery 3/5, core/block 2/5, file 2/5, media-text 2/5
```

The main caution is that "no visible likely-real bugs" means "in the current
validation stack and current fuzz lanes." It does not by itself prove every
newly created fix-planning branch is PR-ready.

## Cycle 6 Review Update

The two latest split-review iterations agree that the written PR 13 split is
the right review shape, but the current live shaped branch stack does not match
it. Do not file or review the current `shape/rtc-crdt-pr13*` heads as the
documented PR 13A/13B/13C sequence.

Observed live branch problem:

- `shape/rtc-crdt-pr13a-cross-parent-source-retirement` starts PR 13 at
  cross-parent source retirement.
- `fix/rtc-observed-top-level-delete-provenance` is not represented as the
  first shaped PR 13 delta after `shape/rtc-crdt-pr12-previous-local`.
- Reviewing the current shaped PR 13 heads would either omit observed-delete
  provenance or review source-retirement and identity-smear changes on the
  wrong base.

Required queue change before the next filing/review cycle:

1. Restack from `shape/rtc-crdt-pr12-previous-local`.
2. Create `shape/rtc-crdt-pr13a-observed-delete-provenance` from
   `fix/rtc-observed-top-level-delete-provenance`.
3. Replay/relabel the source-retirement and identity-smear deltas after that
   observed-delete branch.
4. Produce branch containment checks, a branch graph, `range-diff`, and
   per-adjacent `diff --stat --numstat` for each intended CRDT PR delta.
5. Rerun the focused stale top-level CRDT unit test, `npm run lint:js`, and
   `git diff --check` on the repaired stack.

The same review iterations also repeat the reload-hydration empty-live-editor
guardrail: keep `e75c8829e4e9` / `3bbdc3cdb393` out of PR 6, PR 6A, and PR 8
claims until the focused WebSocket gate has product evidence, and keep the
reconstructed reload-hydration E2E spec off the fallback-group CRDT branch.
No new broad fuzz campaign should start until the corrected, rebased PR stack
exists.

## Proposed PR Split

The smallest maintainable split is not one mega-PR. It is a set of mostly
independent PRs, plus a stacked CRDT block-reconciliation series. The proposed
split below optimizes for reviewability over minimizing the number of PRs.

## How To Read Multi-Branch PR Entries

When a proposed PR lists more than one branch, it does **not** mean GitHub would
file one pull request with multiple head branches. GitHub PRs still have one
head branch. The extra branch links are source branches from the Jetstream2
fix-planning loop that should be used as inputs when building the final review
branch.

There are three cases in this report:

- **Single-branch PRs**: the listed branch is expected to become the PR branch
  after export, rebase, cleanup, and focused validation.
- **Grouped fix branches**: several small branches cover adjacent subcases of
  the same bug family. The intended final PR is one clean branch that combines
  the compatible pieces, usually as one or a few commits, with duplicate tests
  collapsed. PR 5, PR 6, PR 13B, and PR 15 mostly fall into this category.
- **Stacked-series branches**: the branches are not intended to be squashed into
  one review unless maintainers ask for that. They are an ordered set of
  dependency branches or focused commits that touch the same reconciliation
  path. The final output may be a stack of several one-head-branch PRs, or a
  single consolidated branch if reviewers prefer. PR 11, PR 12, PR 13A/13B/13C,
  PR 14, and PR 15 are the clearest examples.

So "Branches: 5" means "five current source branches inform this proposed PR
area." Before filing, those branches still need to be exported from Jetstream2,
rebased onto the intended base, deduplicated, and shaped into one final head
branch or an explicitly ordered stack.

## Proposed PR Sizes

Size was measured in the Jetstream2 fix-planning repo at
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514/repo`.

For single-branch PRs, the table is the branch diff. For grouped or stacked
areas, the table uses the intended review delta after splitting/rebasing:
additive branch-local insertions/deletions and unique paths across the source
branches. This is the right number for review planning. It can differ from the
current as-is branch diff because some branches are stacked on earlier branches
and include dependency commits when compared directly to the handoff base.

| Proposed PR | Branches | Unique files | Insertions | Deletions |
| --- | ---: | ---: | ---: | ---: |
| PR 1: HTTP polling generated update size guard | 1 | 2 | 181 | 19 |
| PR 2: HTTP polling storage read window | 1 | 2 | 57 | 5 |
| PR 3: Revision restore CRDT meta reset | 1 | 2 | 58 | 5 |
| PR 4: Persisted CRDT save-meta idempotence | 1 | 2 | 160 | 1 |
| PR 5: Parser/entity normalization equivalence | 4 | 4 | 1680 | 68 |
| PR 6: Save request payload guards | 3 | 4 | 738 | 6 |
| PR 6A: Persisted empty-content CRDT body guard | 1 | 2 | 64 | 1 |
| PR 7A: Save response entity-state guards | 1 | 2 | 1339 | 8 |
| PR 7B: Save response manager/base-record guards | 1 | 5 | 404 | 8 |
| PR 8: Reload title and persisted-record hydration | 1 | 11 | 618 | 61 |
| PR 9: Core-data lock fairness | 1 | 2 | 185 | 2 |
| PR 10: CRDT block reconciliation foundation | 1 | 2 | 145 | 4 |
| PR 11: Explicit-base top-level block operations | 5 | 2 | 1190 | 16 |
| PR 12: Previous-local-cache top-level block operations | 3 | 2 | 833 | 6 |
| PR 13A: Observed-delete top-level provenance | 1 | 2 | 1171 | 21 |
| PR 13B: Cross-parent source retirement | 3 | 2 | 1687 | 0 |
| PR 13C: Stale block identity smear guard | 1 | 2 | 470 | 39 |
| PR 14: Table body nested array merge | 1 | 2 | 294 | 18 |
| PR 15: Fallback group residual structural fixes | 3 | 2 | 481 | 12 |

The largest remaining review risks by size are PR 13B, PR 5, and PR 7A. The
former PR 13 is now explicitly split into PR 13A/13B/13C so reviewers can inspect
observed-delete provenance, cross-parent source retirement, and identity-smear
protection as separate CRDT invariants. PR 7 has also been split into two
official review units: actions-side save-response entity-state guarding first,
then the `SyncManager` / base-record stale-key filtering delta.

## Pushed Branch Links

These are branch refs pushed to the `danluu` remote for the proposed PR split.
They are review/export candidates, not opened PRs.

| Proposed PR | Pushed branch links |
| --- | --- |
| PR 1: HTTP polling generated update size guard | [`fix/rtc-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/fix/rtc-http-polling-generated-update-size) |
| PR 2: HTTP polling storage read window | [`fix/rtc-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/fix/rtc-http-polling-storage-read-window) |
| PR 3: Revision restore CRDT meta reset | [`fix/rtc-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/fix/rtc-revision-restore-crdt-reset) |
| PR 4: Persisted CRDT save-meta idempotence | [`fix/rtc-crdt-save-meta-churn`](https://github.com/danluu/gutenberg/tree/fix/rtc-crdt-save-meta-churn) |
| PR 5: Parser/entity normalization equivalence | [`fix/rtc-entity-normalization-save-loop`](https://github.com/danluu/gutenberg/tree/fix/rtc-entity-normalization-save-loop)<br>[`fix/rtc-entity-reference-normalization`](https://github.com/danluu/gutenberg/tree/fix/rtc-entity-reference-normalization)<br>[`fix/rtc-parser-entity-block-equivalence`](https://github.com/danluu/gutenberg/tree/fix/rtc-parser-entity-block-equivalence)<br>[`fix/rtc-preserve-whitespace-linebreak-equivalence`](https://github.com/danluu/gutenberg/tree/fix/rtc-preserve-whitespace-linebreak-equivalence) |
| PR 6: Save request payload guards | [`fix/rtc-empty-content-crdt-guard`](https://github.com/danluu/gutenberg/tree/fix/rtc-empty-content-crdt-guard)<br>[`fix/rtc-stale-save-crdt-raw-fields`](https://github.com/danluu/gutenberg/tree/fix/rtc-stale-save-crdt-raw-fields)<br>[`fix/rtc-save-projection-content-guard`](https://github.com/danluu/gutenberg/tree/fix/rtc-save-projection-content-guard) |
| PR 6A: Persisted empty-content CRDT body guard | [`fix/rtc-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/fix/rtc-persisted-empty-content-guard) |
| PR 7A: Save response entity-state guards | [`shape/rtc-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/shape/rtc-save-response-actions-guard) |
| PR 7B: Save response manager/base-record guards | [`shape/rtc-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/shape/rtc-save-response-manager-base-record) |
| PR 8: Reload title and persisted-record hydration | [`fix/rtc-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/fix/rtc-title-reload-persisted-record) |
| PR 9: Core-data lock fairness | [`fix/rtc-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/fix/rtc-store-lock-fairness) |
| PR 10: CRDT block reconciliation foundation | [`fix/rtc-crdt-block-rebase`](https://github.com/danluu/gutenberg/tree/fix/rtc-crdt-block-rebase) |
| PR 11: Explicit-base top-level block operations | [`fix/rtc-stale-base-record-block-append`](https://github.com/danluu/gutenberg/tree/fix/rtc-stale-base-record-block-append)<br>[`fix/rtc-stale-base-block-delete`](https://github.com/danluu/gutenberg/tree/fix/rtc-stale-base-block-delete)<br>[`fix/rtc-stale-base-block-middle-insert`](https://github.com/danluu/gutenberg/tree/fix/rtc-stale-base-block-middle-insert)<br>[`fix/rtc-stale-top-level-move-reorder`](https://github.com/danluu/gutenberg/tree/fix/rtc-stale-top-level-move-reorder)<br>[`fix/rtc-top-level-insert-anchor-after-delete`](https://github.com/danluu/gutenberg/tree/fix/rtc-top-level-insert-anchor-after-delete) |
| PR 12: Previous-local-cache top-level block operations | [`fix/rtc-previous-local-cache-block-delete`](https://github.com/danluu/gutenberg/tree/fix/rtc-previous-local-cache-block-delete)<br>[`fix/rtc-previous-local-cache-block-reorder`](https://github.com/danluu/gutenberg/tree/fix/rtc-previous-local-cache-block-reorder)<br>[`fix/rtc-previous-local-cache-delete-reorder`](https://github.com/danluu/gutenberg/tree/fix/rtc-previous-local-cache-delete-reorder) |
| PR 13A: Observed-delete top-level provenance | [`fix/rtc-observed-top-level-delete-provenance`](https://github.com/danluu/gutenberg/tree/fix/rtc-observed-top-level-delete-provenance) |
| PR 13B: Cross-parent source retirement | [`fix/rtc-cross-parent-move-source-retirement`](https://github.com/danluu/gutenberg/tree/fix/rtc-cross-parent-move-source-retirement)<br>[`fix/rtc-current-only-cross-parent-source-retirement`](https://github.com/danluu/gutenberg/tree/fix/rtc-current-only-cross-parent-source-retirement)<br>[`fix/rtc-stale-base-cross-parent-source-retirement`](https://github.com/danluu/gutenberg/tree/fix/rtc-stale-base-cross-parent-source-retirement) |
| PR 13C: Stale block identity smear guard | [`fix/rtc-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/fix/rtc-stale-block-identity-smear-guard) |
| PR 14: Table body nested array merge | [`fix/rtc-table-body-array-stale-local-merge`](https://github.com/danluu/gutenberg/tree/fix/rtc-table-body-array-stale-local-merge) |
| PR 15: Fallback group residual structural fixes | [`fix/rtc-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/fix/rtc-fallback-group-move-stale-reorder)<br>[`fix/rtc-fallback-group-insert-anchor-stale-local`](https://github.com/danluu/gutenberg/tree/fix/rtc-fallback-group-insert-anchor-stale-local)<br>[`fix/rtc-fallback-group-delete-stale-local`](https://github.com/danluu/gutenberg/tree/fix/rtc-fallback-group-delete-stale-local) |

The PR 13 links above are source branches only. The current live shaped
`shape/rtc-crdt-pr13*` heads on Jetstream2 are intentionally **not** linked
because cycle 6 found that they put source-retirement before observed-delete
provenance. Repair that stack before pushing or reviewing shaped PR 13 heads.

### PR 1: HTTP polling generated update size guard

Branch:
`fix/rtc-http-polling-generated-update-size`

Files:

- `packages/sync/src/providers/http-polling/polling-manager.ts`
- `packages/sync/src/providers/http-polling/test/polling-manager.test.ts`

Fix:
Guard generated outbound HTTP polling updates, especially generated
`sync_step2` and compaction updates, before queueing updates that the server
will reject by size.

Representative bugs:
`d9ec73c63782`, `7218207e82be`, `1519298f5985`, `6baf429a1807`,
`f10c70e0a1bc`.

Introduction analysis:
The server enforced per-update and request-size limits, but generated client
responses could bypass the existing local update guard. That made an auxiliary
room poison batched polling convergence.

### PR 2: HTTP polling storage read window

Branch:
`fix/rtc-http-polling-storage-read-window`

Files:

- `lib/compat/wordpress-7.0/class-wp-sync-post-meta-storage.php`
- `phpunit/tests/collaboration/wpSyncPostMetaStorage.php`

Fix:
Bound cursor-0 shared collection-room history reads so a fresh HTTP polling
client does not materialize an unbounded room history.

Representative bugs:
`1e54c164a822`, `3de36c6963cb`; conditional `757369dad354`.

Introduction analysis:
Long-lived shared collection rooms can accumulate retained update rows. Cursor
0 reads were able to decode the full history at once and abort the whole batched
response under memory pressure.

### PR 3: Revision restore must clear persisted RTC CRDT meta

Branch:
`fix/rtc-revision-restore-crdt-reset`

Files:

- `lib/compat/wordpress-7.0/collaboration.php`
- `phpunit/tests/collaboration/persistedCrdtDocumentMeta.php`

Fix:
Delete `_crdt_document` on revision restore so restoring an older revision does
not merge newer collaborative body content back into the restored post.

Representative bugs:
revision restore rows including `58b782e101aa`, `5acf14696835`,
`d3273f68ee65`, `764569beccd9`, `5c5f942efa88`.

Introduction analysis:
`_crdt_document` was intentionally registered as non-revisioned, so the latest
collaboration state survived a revision restore and could override the restored
body.

### PR 4: Persisted CRDT save-meta idempotence

Branch:
`fix/rtc-crdt-save-meta-churn`

Files:

- `packages/sync/src/manager.ts`
- `packages/sync/src/test/manager.ts`

Fix:
Treat persisted CRDT documents as unchanged when only volatile save metadata
such as `savedAt` / `savedBy` changes.

Representative bugs:
`fe67e654ee5e`, `5b392c5fc0e4`, `61d325fc614c`; conditional parts of
`0dda8fd1b523`, `18e6f469955c`, `5d1a7466f14c`, `1c50c36451ee`.

Introduction analysis:
Successful save notification metadata was serialized into `_crdt_document`,
creating dirty loops even when durable post state was semantically unchanged.

### PR 5: Parser and entity normalization equivalence

Branches:

- `fix/rtc-entity-normalization-save-loop`
- `fix/rtc-entity-reference-normalization`
- `fix/rtc-parser-entity-block-equivalence`
- `fix/rtc-preserve-whitespace-linebreak-equivalence`

Files:

- `packages/core-data/src/utils/crdt.ts`
- `packages/core-data/src/utils/crdt-blocks.ts`
- focused tests under `packages/core-data/src/utils/test/`

Fix:
Treat generated block serialization, equivalent HTML entity spellings, DOM
fragment equivalence, and preserve-whitespace linebreak encodings as no-op
where they are actually equivalent. Keep byte-sensitive and invalid negative
cases fail-closed.

Representative bugs:
`440c86261e16`, `d29a07c4062e`, `1c6e2823fe24`, `c864e850b092`,
`1d251d84f4ec`, and related parser/serialization drift rows.

Introduction analysis:
The CRDT comparison path mixed raw persisted HTML, generated serialization,
invalid-block `originalContent`, and rich-text attributes without a sufficiently
schema-aware equivalence policy.

Review note:
These can be two or three PRs if reviewers prefer: entity/generated
serialization first, DOM/entity fragment equivalence second, preserve-whitespace
linebreak third.

### PR 6: Save request payload guards

Branches:

- `fix/rtc-empty-content-crdt-guard`
- `fix/rtc-stale-save-crdt-raw-fields`
- `fix/rtc-save-projection-content-guard`

Files:

- `packages/core-data/src/entities.js`
- `packages/core-data/src/test/entities.js`
- `packages/core-data/src/actions.js`
- `packages/core-data/src/test/actions.js`

Fix:
Prevent outgoing saves from persisting empty or stale raw `content`/`title`
payloads when local CRDT/editor evidence has the current body and title. This
PR covers save-request projection and raw-field repair; it does not claim the
browser-only reload-hydration or pre-save search/live-document collapse gates.

Representative bugs:
`4784204aa5e0`, `cc9352f66288`, `b946488b6e6f`, `d90167363d42`,
`8ea19bda7f6b`, `b4c3a7e679f5`, `5ed4bffd266c`, `1e0ade5ec5a8`,
`1faa2255b622`, and the save-payload slice of `1362c67475b3`.

Introduction analysis:
Earlier stale-save protections could repair `_crdt_document` while leaving stale
raw `title` or `content` in the actual outgoing save payload. The save
projection path could also collapse body content before persistence.

### PR 6A: Persisted empty-content CRDT body guard

Branch:
`fix/rtc-persisted-empty-content-guard`

Files:

- `packages/core-data/src/utils/crdt.ts`
- `packages/core-data/src/utils/test/crdt.ts`

Fix:
Preserve the persisted CRDT body when the incoming persisted record has an empty
body/title-only shape but the CRDT document still contains durable content.

Representative bugs:
`1133c7f51e41`, `134abb018a9a`.

Introduction analysis:
The persisted-record merge path could treat an empty or title-only REST record
as authoritative even when the CRDT body still represented the durable editor
state. Keep this as a narrow persisted-body guard near PR 6, not as proof that
reload-hydration or pre-save live-document collapse is fixed.

### PR 7A: Save response entity-state guards

Branch:

`shape/rtc-save-response-actions-guard`

Files:

- `packages/core-data/src/actions.js`
- `packages/core-data/src/test/actions.js`

Fix:
Do not replay stale successful REST save responses back into local entity state
when the outgoing save and live CRDT/editor state prove the title, content, or
`_crdt_document` should be newer.

Representative bugs:
`f9d1e1c8a6cc`, `8406e3878be3`, `4776bffd5407`, `7d6faa1f8935`,
`f5b2df85700d`, `4a94c4ed191d`; conditional `a811f15f6bc6`,
`a26f2eee5c44`, `c85df9d75fc2`, `01f80d2f28b`.

Introduction analysis:
The normal save path still trusted the full REST `updatedRecord` and sent stale
response fields through `receiveEntityRecords()`. Keep this PR focused on the
core-data save-response arbitration; it should be rebased after PR 6's save
projection branch because both touch `saveEntityRecord()` and adjacent tests.

### PR 7B: Save response manager/base-record guards

Branch:

`shape/rtc-save-response-manager-base-record`

Files:

- `packages/core-data/src/actions.js`
- `packages/core-data/src/test/actions.js`
- `packages/sync/src/manager.ts`
- `packages/sync/src/test/manager.ts`
- `packages/sync/src/types.ts`

Fix:
Filter stale base-record local keys and save-response CRDT updates in
`SyncManager` after the actions-side response guard is in place.

Representative bugs:
`f9d1e1c8a6cc`, `8406e3878be3`, `4776bffd5407`, `7d6faa1f8935`,
`f5b2df85700d`, `4a94c4ed191d`; conditional `a811f15f6bc6`,
`a26f2eee5c44`, `c85df9d75fc2`, `01f80d2f28b`.

Introduction analysis:
After entity-state response guarding, save updates could still reach
`SyncManager.update()` and bypass some stale-key filtering. This branch is
stacked on PR 7A; review it as the manager/base-record delta, not as the broad
five-branch PR 7 aggregate.

Review note:
The broad original `fix/rtc-save-response-content-guard` branch is too tangled
to file as-is because it includes stale-base block-append / `crdt-blocks.ts`
work outside the save-response boundary.

### PR 8: Reload title and persisted-record hydration

Branch:
`fix/rtc-title-reload-persisted-record`

Existing local prior-art branch:
`try/rtc-title-reload-pr`

Files:
`packages/core-data/src/*` and `packages/sync/src/*` touched by the branch.

Fix:
Preserve current RTC title/content snapshots across reload and persisted-record
hydration. Do not let stale REST record fields win after a provider has already
applied current remote state.

Representative bugs:
`aff7f518a6c0`, `a80403a30da5`, `cff45917db50`, `25f85885e326`;
conditional `c85df9d75fc2`.

Introduction analysis:
The provider-applied-remote-state guard existed conceptually, but no reliable
writer set the marker. Provider initialization and persisted-doc invalidation
could therefore apply stale REST title fields after current remote CRDT state
had entered the doc.

Review note:
This branch is larger than most fix-plan branches. Before filing, compare it
against `try/rtc-title-reload-pr` and split test helpers from product logic if
possible. Do not claim the reload-hydration empty-live-editor family
(`e75c8829e4e9` / `3bbdc3cdb393`) from this PR until the focused WebSocket gate
produces product evidence.

### PR 9: Core-data lock fairness for stuck saves

Branch:
`fix/rtc-store-lock-fairness`

Files:

- `packages/core-data/src/locks/engine.js`
- `packages/core-data/src/locks/test/engine.js`

Fix:
Do not grant younger shared locks over an older pending conflicting exclusive
save lock.

Representative bugs:
`403b0aeebb08`; conditional `86000062da44`, `152e248004a3`,
`7f77106403c9`, `a811f15f6bc6`.

Introduction analysis:
The lock engine could grant any currently compatible pending request. Under RTC
save/reload load, younger shared reads could starve an older exclusive save,
leaving `isSavingPost()` stuck.

### PR 10: CRDT block reconciliation foundation

Branch:
`fix/rtc-crdt-block-rebase`

Related earlier local branch:
`try/rtc-stale-delete-base-merge-890d98d04cda-pr`

Files:

- `packages/core-data/src/utils/crdt-blocks.ts`
- `packages/core-data/src/utils/test/crdt-stale-top-level-blocks.test.ts`

Fix:
Stop treating stale local block snapshots as authoritative full-document
replacements. Rebase by stable block identity where possible.

Representative bugs:
dominant stale block reconciliation family, including `007e79caf228`,
`890d98d04cda`, `723313b91dd2`, `05f594c537f7`, `acf2880f01d6`.

Introduction analysis:
The proximate cause across this series is the stale merge path introduced by
the `mergeYBlocksLocalChanges()` / stale merge changes around `2f0367297eff`.
The prior `previousLocalBlocksCache` work and `baseRecord.blocks` plumbing made
the stale snapshots available to production editor updates.

### PR 11: Explicit-base top-level block operations

Branches:

- `fix/rtc-stale-base-record-block-append`
- `fix/rtc-stale-base-block-delete`
- `fix/rtc-stale-base-block-middle-insert`
- `fix/rtc-stale-top-level-move-reorder`
- `fix/rtc-top-level-insert-anchor-after-delete`

Files:

- `packages/core-data/src/utils/crdt-blocks.ts`
- `packages/core-data/src/utils/test/crdt-stale-top-level-blocks.test.ts`

Fix:
Handle explicit-base top-level appends, deletes, middle inserts, delete-plus
insert anchors, and retained-block moves without mutating the wrong Y.Map by
position.

Representative bugs:
`56b4d8f2257d`, `12ec8c36ed8d`, `0401b7f960a5`,
`1908e3c1f1a1`, `797c3b5a7def`, `c8f014980c03`, `418f66dcf163`,
`01cfc985a98f`, `0807b990d645`, `14bf369fe913`, `e52fa38cd263`,
`1f68391941c2`, `86a2aac99e27`, `380b9696ecd9`.

Introduction analysis:
The stale explicit-base merge path returned "handled" after positional prefix
or slot processing without applying the intended suffix, delete, insert, or
reorder operation by client id.

Review note:
This is best as a stacked series, not a single large PR, unless maintainers
prefer one consolidated CRDT block-array PR with many focused tests.

### PR 12: Previous-local-cache top-level block operations

Branches:

- `fix/rtc-previous-local-cache-block-delete`
- `fix/rtc-previous-local-cache-block-reorder`
- `fix/rtc-previous-local-cache-delete-reorder`

Files:

- `packages/core-data/src/utils/crdt-blocks.ts`
- `packages/core-data/src/utils/test/crdt-stale-top-level-blocks.test.ts`

Fix:
Handle no-explicit-base stale local deletes, reorders, and delete-plus-reorder
shapes using `previousLocalBlocksCache` without duplicate/lost retained block
identity.

Representative bugs:
`007e79caf228`, `7b809e0f5ed7`, `12b4aba13420`, `05f594c537f7`,
`0886b31519f0`, `0f02c626574d`, `2b5789985811`, `062d1b861312`.

Introduction analysis:
`previousLocalBlocksCache` supplied a stale base, but the positional fallback
could mutate retained blocks instead of deleting/reordering by stable client id.

### PR 13A: Observed-delete top-level provenance

Branch:
`fix/rtc-observed-top-level-delete-provenance`

Intended shaped head after the cycle-6 branch repair:
`shape/rtc-crdt-pr13a-observed-delete-provenance`

Files:

- `packages/core-data/src/utils/crdt-blocks.ts`
- `packages/core-data/src/utils/test/crdt-stale-top-level-blocks.test.ts`

Fix:
Track top-level block IDs that were actually observed in local Y state and then
deleted remotely, so later stale local snapshots cannot resurrect those deleted
blocks.

Representative bugs:
Observed delete provenance / stale post-delete resurrection rows from iteration
26.

Introduction analysis:
Earlier stale-delete filtering inferred delete provenance from stale incoming
or previous-local snapshots too broadly, and in some partial-snapshot cases too
narrowly. This PR should be reviewed before the source-retirement and
identity-smear guards because it changes the evidence used by later top-level
block reconciliation decisions.

Cycle-6 branch-shape gate:
The current live `shape/rtc-crdt-pr13*` heads do not include this branch as the
first PR 13 delta. Repair that stack before filing or reviewing PR 13.

### PR 13B: Cross-parent source retirement

Branches:

- `fix/rtc-cross-parent-move-source-retirement`
- `fix/rtc-current-only-cross-parent-source-retirement`
- `fix/rtc-stale-base-cross-parent-source-retirement`

Files:

- `packages/core-data/src/utils/crdt-blocks.ts`
- `packages/core-data/src/utils/test/crdt-stale-top-level-blocks.test.ts`

Fix:
When a block moves between parents, retire the old source by client id across
the direct, current-only, and stale-explicit-base shapes.

Representative bugs:
`130a60214fea`, `04cb3b53b722`; conditional source-retirement portions of
`15818a9948ef`, `12d3326bd344`, `123203b4fdfa`, `6fed843e6120`.

Introduction analysis:
Nested/cross-parent moves entered a merge path that could update the new
destination while leaving the old parent source alive. Keep the table/attribute
smear portions conditional unless the branch-specific tests prove that exact
source-retirement mechanism.

### PR 13C: Stale block identity smear guard

Branch:
`fix/rtc-stale-block-identity-smear-guard`

Files:

- `packages/core-data/src/utils/crdt-blocks.ts`
- `packages/core-data/src/utils/test/crdt-stale-top-level-blocks.test.ts`

Fix:
Do not smear a stale block's name or attributes into a different live block by
position when stable client-id evidence says the incoming block is stale.

Representative bugs:
Identity-smear portions of `12d3326bd344`, `123203b4fdfa`, `6fed843e6120`,
and related stale structural rows.

Introduction analysis:
After source retirement, stale snapshots could still match by index and mutate a
different live block's identity. This should stay separate from PR 13B so
reviewers can distinguish "remove the old source" from "do not mutate the wrong
target."

### PR 14: Table body nested array merge

Branch:
`fix/rtc-table-body-array-stale-local-merge`

Earlier local prior-art branches:

- `try/rtc-table-stale-snapshot-pr`
- `try/rtc-duplicate-table-rows-stock-repro-pr-trunk`
- `try/rtc-duplicate-table-body-revision-loss-pr`

Files:

- `packages/core-data/src/utils/crdt-blocks.ts`
- `packages/core-data/src/utils/test/crdt-blocks.ts`

Fix:
Merge stale local nested table `body[]` arrays without dropping or duplicating
remote rows.

Representative bugs:
`e24d3cf5e25d`, `9000e0395bb1`, `85a36d801db9`, `fd4ecd64ab6e`,
`943c670fbf29`; supporting `22800a0df928`, `59b7e7cdec39`.

Introduction analysis:
Nested table body arrays were being reconciled by stale local array state rather
than row identity and current remote changes.

### PR 15: Fallback group residual structural fixes

Branches:

- `fix/rtc-fallback-group-move-stale-reorder`
- `fix/rtc-fallback-group-insert-anchor-stale-local`
- `fix/rtc-fallback-group-delete-stale-local`

Files:

- `packages/core-data/src/utils/crdt-blocks.ts`
- `packages/core-data/src/utils/test/crdt-stale-top-level-blocks.test.ts`

Fix:
Handle fallback-created `core/group` move, changed-clientId insertion anchor,
and delete propagation cases.

Representative bugs:
`e0724aafa81d`, `a5dd455dc1f0`, `735c4a1a6a73`, `6588affd5149`,
`8ce36f39462e`, `17650eb0eba4`, `2b5789985811`, `c4186e1b5d15`,
`b2833d6c7275`.

Introduction analysis:
The same stale local positional fallback is the common source, but these rows
only appeared after the more general top-level and source-retirement branches
were accounted for.

## Existing PR-Candidate Branches To Reuse Or Compare

These branches already exist locally or on the `danluu` remote and should be
compared before filing final PRs. Some are good review candidates; some are
stacked and include unrelated prior RTC fixes.

```text
try/rtc-title-reload-pr
try/rtc-post-content-safe-sync-pr
try/rtc-stale-delete-base-merge-890d98d04cda-pr
try/rtc-table-stale-snapshot-pr
try/rtc-duplicate-table-rows-stock-repro-pr-trunk
try/rtc-duplicate-table-body-revision-loss-pr
try/rtc-undo-cross-entity-stock-repro-pr-trunk
try/rtc-primary-unregister-stock-repro-pr-trunk
try/rtc-compaction-403-stock-repro-pr
try/rtc-sync-body-size-pr
fix/rtc-autodraft-autosave-loss-pr
fix-connection-error-large-update-pr
danluu/rtc-issue-01-rich-cursor-pr
danluu/rtc-issue-04-remote-apply-cursor-pr
danluu/rtc-issue-06-nested-awareness-pr
danluu/rtc-issue-07-selection-history-pr
danluu/danluu/rtc-issue-09-awareness-lost-update-pr
```

The most important audit finding is that several stock-repro `*-pr` branches
show very large diffs against trunk because they are stacked on prior awareness,
storage, and transport fixes. Those should be split or rebased before filing.

## Bug-Family Coverage Summary

| Bug family | Status | Proposed PR area |
| --- | --- | --- |
| HTTP generated oversized updates and poisoned polling batches | fix branch exists | PR 1 |
| Cursor-0 HTTP storage history OOM | fix branch exists | PR 2 |
| Revision restore merges newer CRDT/body into restored revision | fix branch exists | PR 3 |
| `_crdt_document` save-meta dirty loops | fix branch exists | PR 4 |
| Parser/entity/reference normalization save loops | fix branches exist | PR 5 |
| Preserve-whitespace newline vs `<br>` equivalence | fix branch exists | PR 5 |
| Empty/stale outgoing save payloads | fix branches exist | PR 6 |
| Persisted empty/title-only body collapse | fix branch exists | PR 6A |
| Stale save response entity-state replay | shape branch exists | PR 7A |
| Stale save response manager/base-record replay | stacked shape branch exists | PR 7B |
| Reload title/persisted-record hydration | fix branch exists, needs branch comparison; does not claim empty-live-editor gate | PR 8 |
| Stuck save from core-data lock unfairness | fix branch exists | PR 9 |
| General stale CRDT block rebase | fix branch exists | PR 10 |
| Explicit-base top-level append/delete/insert/move/order | fix branches exist | PR 11 |
| Previous-local-cache delete/reorder/delete+reorder | fix branches exist | PR 12 |
| Observed delete provenance / stale post-delete resurrection | fix branch exists | PR 13A |
| Cross-parent source copies | fix branches exist | PR 13B |
| Stale block identity smear | fix branch exists | PR 13C |
| Table nested `body[]` duplicate/loss | fix branch exists | PR 14 |
| Fallback group move/insert/delete residuals | fix branches exist | PR 15 |
| Autosave autodraft loss | older PR branch exists | `fix/rtc-autodraft-autosave-loss-pr` |
| Undo cross-entity Y.Doc scope | older PR branch exists | `try/rtc-undo-cross-entity-stock-repro-pr-trunk` |
| Primary room unregister / surviving room queues | older PR branch exists | `try/rtc-primary-unregister-stock-repro-pr-trunk` |
| Rich cursor / awareness / selection issues | older PR branches exist | `danluu/rtc-issue-*` |

## Significant Gaps And Deferred Work

These should not be described as fixed yet.

### Reload hydration empty live editor

Rows:
`e75c8829e4e9`, `3bbdc3cdb393`

Status:
Evidence gate only. The exact WebSocket evidence branch is
`try/rtc-reload-hydration-gate-e75c8829`, but the local reconstructed e2e gate
was blocked by `wp-env` / Playwright startup trouble, not product evidence.

Next step:
Run the focused WebSocket replay from `try/rtc-reload-hydration-gate-e75c8829`
with `WP_ENV_PORT=9763`, `WP_ENV_TESTS_PORT=9764`, and
`WP_BASE_URL=http://localhost:9763`. Keep the reconstructed gate spec out of
`fix/rtc-fallback-group-delete-stale-local`. Only create a fix branch if live
editor state stays empty after exact-room WebSocket sync while REST body and
persisted `_crdt_document` remain populated.

### Pre-save search/live document collapse

Rows:
`ddf9559af37e`, `0932bed35c7a`, conditional `1e0ade5ec5a8`

Status:
Evidence gate only:
`try/rtc-pre-save-search-collapse-gate-ddf9559`.

Next step:
Capture editor blocks, serialized content, core-data edited record, live CRDT
record, provider state, REST body, and save state before/after the checkpoint
`core/search` insertion. Promote only if the live editor/CRDT collapses before
save.

### Rich-text formatted suffix corruption

Rows:
`4148230f681d`, `b0db7b80c6f2`, `dc8ea6e78d4d`, `1ccac75d7faa`,
`2722f0e897de`, `712b98ba96ff`

Status:
Not fixed. Iteration 28 could not get the expected two-doc focused source repro
to fail with the available local test shape. Existing short rich-text offset
tests were already green on the handoff base.

Next step:
Recover an exact replay artifact or derive the emitted delta for the suffix
case before changing product code.

### Malformed save payload and save-settlement residuals

Rows:
`fc154ebec48c`, `e40aa1b7863d`, `f51c425df8a5`, `f46859898576`,
`afd389d7f139`, `02289235f55f`, `eef8b8932e11`, `b60eecd4ac03`

Status:
Deferred. Multiple iterations identified this as a plausible next evidence
gate, but it lost priority to source-local table/fallback-group fixes after the
main save request/response guards were created.

Next step:
Create a source-level `saveEntityRecord()` / `prePersistPostType()` repro where
clean local blocks exist but the evaluated outgoing `content` is malformed.

### HTTP polling room-isolation residuals

Rows:
`f5738470d026`, `fda8d2334e65`; conditional `fc99825fb6c2`, `b75435787be1`

Status:
Deferred. The main generated-update-size and storage-window branches cover the
highest-confidence HTTP issues. Room-isolation/backoff remains a possible
follow-up if fuzzing still sees healthy post rooms stalled by auxiliary room
failures.

## Validation Status

The fix-planning summaries record focused unit/PHPUnit/lint checks for many
individual branches. Examples include:

- focused and full polling-manager unit tests for generated update size;
- focused and group PHPUnit for revision restore CRDT meta reset;
- focused and full CRDT utility tests for entity normalization;
- focused entity/action/sync-manager tests for save request/response guards;
- focused lock-engine tests for store lock fairness;
- focused `crdt-blocks.ts` tests for structural CRDT branches.

What remains before PR filing:

1. Rebase or recreate each PR branch on the intended upstream base.
2. Repair the CRDT PR 13 shaped stack so observed-delete provenance is its own
   first PR 13 delta after PR 12, then regenerate containment, range-diff, and
   diff-stat evidence for each adjacent CRDT review delta.
3. Drop analysis-only artifacts and keep only product code plus focused tests.
4. Run focused tests for every branch after rebase.
5. Build a fresh combined validation stack from the final branches.
6. Run the Jetstream2 coverage-guided and focused fuzz lanes on that final
   stack; block PR filing if new visible likely-real failures appear.
7. Resolve or explicitly defer the evidence-only gaps above.

## Current Recommendation

Do not file a single PR and do not file the large stacked `*-stock-repro-pr`
branches as-is. File the small independent branches first:

```text
fix/rtc-http-polling-generated-update-size
fix/rtc-http-polling-storage-read-window
fix/rtc-revision-restore-crdt-reset
fix/rtc-crdt-save-meta-churn
fix/rtc-entity-normalization-save-loop
fix/rtc-entity-reference-normalization
fix/rtc-empty-content-crdt-guard
fix/rtc-stale-save-crdt-raw-fields
fix/rtc-persisted-empty-content-guard
fix/rtc-store-lock-fairness
```

Then file the save-response and title/reload branches:

```text
shape/rtc-save-response-actions-guard
shape/rtc-save-response-manager-base-record
fix/rtc-title-reload-persisted-record
```

Then file the CRDT block-reconciliation series as an explicitly ordered stack,
because those branches touch the same core file and have overlapping tests:

```text
fix/rtc-crdt-block-rebase
fix/rtc-stale-base-record-block-append
fix/rtc-stale-base-block-delete
fix/rtc-stale-base-block-middle-insert
fix/rtc-previous-local-cache-block-delete
fix/rtc-previous-local-cache-block-reorder
fix/rtc-previous-local-cache-delete-reorder
fix/rtc-observed-top-level-delete-provenance
fix/rtc-cross-parent-move-source-retirement
fix/rtc-current-only-cross-parent-source-retirement
fix/rtc-stale-base-cross-parent-source-retirement
fix/rtc-stale-block-identity-smear-guard
fix/rtc-stale-top-level-move-reorder
fix/rtc-top-level-insert-anchor-after-delete
fix/rtc-table-body-array-stale-local-merge
fix/rtc-fallback-group-move-stale-reorder
fix/rtc-fallback-group-insert-anchor-stale-local
fix/rtc-fallback-group-delete-stale-local
```

This ordering keeps low-risk, independent fixes moving while the shared
`crdt-blocks.ts` series gets the extra review and fuzz validation it needs.
