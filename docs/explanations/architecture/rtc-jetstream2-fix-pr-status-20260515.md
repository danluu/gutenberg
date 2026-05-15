# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-15T19:30:08Z`

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
- The branches currently live in the Jetstream2 fix-planning repo. They still
  need export to this machine, rebase onto the intended upstream base, and
  final PR shaping.
- Some earlier local/GitHub-facing `try/*-pr` branches already exist and should
  be reused as prior art or tests, but several are stacked or too broad against
  trunk and should not be filed as-is.
- Jetstream2 fuzzing is still running on the validation stack
  `try/rtc-fix-stack-validation` at `72854f05ed20106daac3d125206f2643dac41677`.
  That validates the active stack, but the final exported PR set still needs a
  fresh combined validation run after rebase.

At the fuzz snapshot, the coverage-guided monitor was healthy:

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

The main caution is that "no visible likely-real bugs" means "in the current
validation stack and current fuzz lanes." It does not by itself prove every
newly created fix-planning branch is PR-ready.

## Proposed PR Split

The smallest maintainable split is not one mega-PR. It is a set of mostly
independent PRs, plus a stacked CRDT block-reconciliation series. The proposed
split below optimizes for reviewability over minimizing the number of PRs.

## Proposed PR Sizes

Size was measured in the Jetstream2 fix-planning repo at
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514/repo`.

For single-branch PRs, the table is the branch diff. For grouped or stacked PRs,
the table uses the intended review delta after splitting/rebasing: additive
branch-local insertions/deletions and unique paths across the group. This is the
right number for review planning. It can differ from the current as-is branch
diff because some branches are stacked on earlier branches and include
dependency commits when compared directly to the handoff base.

| Proposed PR | Branches | Unique files | Insertions | Deletions |
| --- | ---: | ---: | ---: | ---: |
| PR 1: HTTP polling generated update size guard | 1 | 2 | 181 | 19 |
| PR 2: HTTP polling storage read window | 1 | 2 | 57 | 5 |
| PR 3: Revision restore CRDT meta reset | 1 | 2 | 58 | 5 |
| PR 4: Persisted CRDT save-meta idempotence | 1 | 2 | 160 | 1 |
| PR 5: Parser/entity normalization equivalence | 4 | 4 | 1680 | 68 |
| PR 6: Save request payload guards | 3 | 4 | 738 | 6 |
| PR 7: Save response guards | 5 | 5 | 1860 | 32 |
| PR 8: Reload title and persisted-record hydration | 1 | 11 | 618 | 61 |
| PR 9: Core-data lock fairness | 1 | 2 | 185 | 2 |
| PR 10: CRDT block reconciliation foundation | 1 | 2 | 145 | 4 |
| PR 11: Explicit-base top-level block operations | 5 | 2 | 1190 | 16 |
| PR 12: Previous-local-cache top-level block operations | 3 | 2 | 833 | 6 |
| PR 13: Cross-parent source retirement and identity smear guards | 5 | 2 | 3328 | 60 |
| PR 14: Table body nested array merge | 1 | 2 | 294 | 18 |
| PR 15: Fallback group residual structural fixes | 3 | 2 | 481 | 12 |

The largest review risks by size are PR 13, PR 7, and PR 5. PR 13 has only two
unique paths, but it is still large enough that it should probably be filed as a
stacked series if reviewers want to inspect each structural invariant
separately. PR 7 and PR 5 touch multiple subsystems or equivalence policies and
are also reasonable candidates for further split if review latency matters.

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
Prevent outgoing saves from persisting empty, stale, title-only, search-only, or
otherwise truncated `content`/`title` when local CRDT/editor evidence has the
current body and title.

Representative bugs:
`4784204aa5e0`, `cc9352f66288`, `b946488b6e6f`, `d90167363d42`,
`8ea19bda7f6b`, `b4c3a7e679f5`, `5ed4bffd266c`, `1e0ade5ec5a8`,
`1faa2255b622`, and the save-payload slice of `1362c67475b3`.

Introduction analysis:
Earlier stale-save protections could repair `_crdt_document` while leaving stale
raw `title` or `content` in the actual outgoing save payload. The save
projection path could also collapse body content before persistence.

### PR 7: Save response guards

Branches:

- `fix/rtc-save-response-stale-title-guard`
- `fix/rtc-save-response-crdt-document-guard`
- `fix/rtc-save-response-stale-content-guard`
- `fix/rtc-save-response-content-guard`
- `fix/rtc-base-record-stale-title-filter`

Files:

- `packages/core-data/src/actions.js`
- `packages/core-data/src/test/actions.js`
- `packages/sync/src/manager.ts`
- `packages/sync/src/test/manager.ts`

Fix:
Do not replay stale successful REST save responses back into local entity state
or CRDT state when the outgoing save and live CRDT state prove the title,
content, or `_crdt_document` should be newer.

Representative bugs:
`f9d1e1c8a6cc`, `8406e3878be3`, `4776bffd5407`, `7d6faa1f8935`,
`f5b2df85700d`, `4a94c4ed191d`; conditional `a811f15f6bc6`,
`a26f2eee5c44`, `c85df9d75fc2`, `01f80d2f28b`.

Introduction analysis:
The normal save path still trusted the full REST `updatedRecord`. It then sent
the stale response through `receiveEntityRecords()` and `SyncManager.update()`,
where save updates bypassed some stale-key filtering.

Review note:
This probably wants two PRs: one for response guarding in `actions.js`, one for
manager/base-record stale-key filtering.

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
possible.

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

### PR 13: Cross-parent source retirement and identity smear guards

Branches:

- `fix/rtc-cross-parent-move-source-retirement`
- `fix/rtc-current-only-cross-parent-source-retirement`
- `fix/rtc-stale-base-cross-parent-source-retirement`
- `fix/rtc-stale-block-identity-smear-guard`
- `fix/rtc-observed-top-level-delete-provenance`

Files:

- `packages/core-data/src/utils/crdt-blocks.ts`
- `packages/core-data/src/utils/test/crdt-stale-top-level-blocks.test.ts`

Fix:
When a block moves between parents, retire the old source by client id and do
not smear a stale block's name/attributes into a different live block by
position. Preserve observed remote deletes without resurrecting later stale
copies.

Representative bugs:
`130a60214fea`, `04cb3b53b722`, `15818a9948ef`, `12d3326bd344`,
`123203b4fdfa`, `6fed843e6120`, `890d98d04cda`, `3ac375556552`.

Introduction analysis:
Nested/cross-parent moves entered a merge path that could update the new
destination while leaving the old parent source alive, or match the stale source
to a different live block by index.

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
| Stale save response title/content/meta replay | fix branches exist | PR 7 |
| Reload title/persisted-record hydration | fix branch exists, needs branch comparison | PR 8 |
| Stuck save from core-data lock unfairness | fix branch exists | PR 9 |
| General stale CRDT block rebase | fix branch exists | PR 10 |
| Explicit-base top-level append/delete/insert/move/order | fix branches exist | PR 11 |
| Previous-local-cache delete/reorder/delete+reorder | fix branches exist | PR 12 |
| Cross-parent source copies and stale block identity smear | fix branches exist | PR 13 |
| Observed delete provenance / stale post-delete resurrection | fix branch exists | PR 13 |
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
Run the focused WebSocket replay with `WP_ENV_PORT=9763` and
`WP_BASE_URL=http://localhost:9763`, then only create a fix branch if live
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

1. Export Jetstream2 fix branches to this machine or push them to the `danluu`
   remote.
2. Rebase or recreate each PR branch on the intended upstream base.
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
fix/rtc-store-lock-fairness
```

Then file the save-response and title/reload branches. After that, file the
CRDT block-reconciliation series as an explicitly ordered stack, because those
branches touch the same core file and have overlapping tests:

```text
fix/rtc-crdt-block-rebase
fix/rtc-stale-base-record-block-append
fix/rtc-stale-base-block-delete
fix/rtc-stale-base-block-middle-insert
fix/rtc-previous-local-cache-block-delete
fix/rtc-previous-local-cache-block-reorder
fix/rtc-cross-parent-move-source-retirement
fix/rtc-previous-local-cache-delete-reorder
fix/rtc-stale-block-identity-smear-guard
fix/rtc-current-only-cross-parent-source-retirement
fix/rtc-stale-base-cross-parent-source-retirement
fix/rtc-observed-top-level-delete-provenance
fix/rtc-stale-top-level-move-reorder
fix/rtc-top-level-insert-anchor-after-delete
fix/rtc-table-body-array-stale-local-merge
fix/rtc-fallback-group-move-stale-reorder
fix/rtc-fallback-group-insert-anchor-stale-local
fix/rtc-fallback-group-delete-stale-local
```

This ordering keeps low-risk, independent fixes moving while the shared
`crdt-blocks.ts` series gets the extra review and fuzz validation it needs.
