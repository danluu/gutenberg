# RTC Jetstream2 Found Bugs Running Report

Snapshot time: `2026-05-17T04:31Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Primary remote repo:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

This is a running report for product bugs, candidate product bugs, diagnostics,
and noise families found while fuzzing and fixing Gutenberg real-time
collaboration. It intentionally groups duplicate fuzz signatures into bug
families. Raw signature counts are useful for triage throughput, but not useful
as a direct "bug count".

## Source Inputs

Current inputs used for this snapshot:

- PR split and blocker state:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/current-pr-split.md`
- PR finalization state:
  `/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516/current-finalization-status.md`
- Deferred-work queue:
  `/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/current-deferred-status.md`
- Current novelty monitor status:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T042448Z/novelty-status.md`
- Current branch inventory from:
  `/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

## Reading This Report

- `Ready` means the bug has a maintainer-sized branch in the current proposed
  PR split, subject to the final combined validation/fuzz gate.
- `Ready sidecar` means the fix/test is intended to be reviewed beside a nearby
  PR, but not necessarily as part of the linear main stack.
- `Blocked` means the bug family has product evidence or a likely product
  owner, but still needs a reduced test, branch repair, or reclassification
  before it should become a PR.
- `Diagnostic` means the current output is instrumentation or classification
  support, not a product fix.
- `Downscoped` means the latest evidence says the family is already covered,
  duplicate/noise, or lacks product evidence.

The "introduced by" column is conservative. Unless a source bisection or commit
archaeology was actually done, it records the affected subsystem/mechanism
rather than claiming a specific introducing commit.

## Current Aggregate

Current coverage-guided run:

- current-run likely-real visible: `0`
- current-run actionable signatures: `0`
- current-run top duplicate family share: `0`
- historical actionable signatures: `9813`
- historical likely-real visible: `51`
- historical likely-real merged duplicates: `1237`
- historical oracle/noise questions: `13`
- current unmet coverage goals: `5`
- enabled coverage groups: `novelty-ws-real-user-editing`,
  `novelty-http-persistence-probe`

Interpretation: the current validation run is not surfacing fresh likely-real
failures at this snapshot, but historical fuzzing has produced many signatures
that collapse into the product and diagnostic families below.

## Product Bugs With Ready Fix Branches

| ID | Bug / failure family | User-visible risk | Current fix branch | Status | Introduced by / affected mechanism |
| --- | --- | --- | --- | --- | --- |
| PR01 | HTTP polling generated update payloads can grow without a useful bound. | Excessive response size and client/server work under collaboration churn. | `ready/rtc-pr01-http-generated-update-size` | Ready | HTTP polling server update generation. |
| PR02 | HTTP polling storage reads can scan too much historical state. | Slow or unstable polling under long sessions and many stored updates. | `ready/rtc-pr02-http-storage-read-window` | Ready | HTTP polling persistence read-window policy. |
| PR02A | Auxiliary HTTP polling rooms can regress primary-room isolation assumptions. | Failed/non-primary rooms risk contaminating or obscuring real post-room state. | `ready/rtc-pr02a-http-room-isolation-regression` | Ready sidecar | HTTP polling room isolation test coverage. |
| PR03 | Revision restore does not reset persisted CRDT document metadata cleanly. | Restored revisions can retain newer collaborative state. | `ready/rtc-pr03-revision-restore-crdt-reset` | Ready | Revision restore path interacting with CRDT persistence. |
| PR04 | Persisted CRDT save metadata churns when content is unchanged. | Repeated saves and stale metadata comparisons can create false or real divergence. | `ready/rtc-pr04-crdt-save-meta-churn` | Ready | Save metadata stabilization for persisted CRDT documents. |
| PR05A | Persisted entity reference normalization can cause save loops or false divergence. | Entity references can reserialize differently after save/load. | `ready/rtc-pr05a-entity-reference-normalization` | Ready | Entity reference normalization and comparison. |
| PR05B | Rich-text HTML that is semantically equivalent is treated as a CRDT change. | Formatting/parser equivalence can cause unnecessary CRDT churn or non-convergence. | `ready/rtc-pr05b-parser-rich-text-equivalence` | Ready | Rich-text/parser equivalence handling. |
| PR05C | Preserve-whitespace and linebreak-equivalent rich text is treated as divergent. | Blocks with whitespace-sensitive text can drift across peers. | `ready/rtc-pr05c-preserve-whitespace-linebreak-equivalence` | Ready | Rich-text whitespace and linebreak normalization. |
| PR06 | Save projection can use stale or malformed raw content instead of CRDT block state. | A save can persist stale/invalid block content. | `ready/rtc-pr06-save-request-payload-guards` | Ready | Core-data save request projection. |
| PR06A | Empty persisted content can overwrite a non-empty persisted CRDT body. | Data loss on partial/empty save paths. | `ready/rtc-pr06a-persisted-empty-content-guard` | Ready | Persisted body guard during save. |
| PR06B | Malformed evaluated content can be serialized into outgoing RTC save payloads. | Invalid block `originalContent` or malformed evaluated content can corrupt saved state. | `ready/rtc-pr06b-malformed-save-request-payload-minimal` | Ready sidecar | Save request payload validation; use minimal branch only. |
| PR07A | Save responses can apply stale titles, stale content, stale CRDT block content, or stale base versions. | A successful save response can roll the editor back. | `ready/rtc-pr07a-save-response-actions-guard` | Ready | Core-data save response application. |
| PR07B | Saved CRDT responses can be hydrated through invalidation/base-record paths that preserve stale state. | Reload/save flows can leave peers with stale persisted CRDT documents. | `ready/rtc-pr07b-save-response-manager-base-record` | Ready | Sync manager hydration from saved CRDT response. |
| PR07C | Reload record snapshots can be lost or built from the wrong raw fields. | Reload after save can reuse stale or incomplete record snapshots. | `ready/rtc-pr07c-reload-record-snapshots` | Ready branch exists; finalizer still active | Core-data pre-persist snapshot ordering. |
| PR09 | Store locks can favor newer pending writes over older pending locks. | Older collaborator state can be starved or overwritten. | `ready/rtc-pr09-store-lock-fairness` | Ready | Store lock ordering/fairness. |
| PR10 | Stale CRDT block identity rebasing can attach edits to the wrong block identity. | Block updates can smear across identities after rebase. | `ready/rtc-pr10-crdt-block-rebase` | Ready | CRDT block identity rebasing. |
| PR11A | Stale-base local suffix appends can be dropped. | User-appended blocks disappear after concurrent remote updates. | `ready/rtc-pr11a-stale-base-record-block-append` | Ready | Stale-base top-level block merge. |
| PR11B | Stale-base top-level deletes can be lost. | Deleted blocks can reappear. | `ready/rtc-pr11b-stale-base-block-delete` | Ready | Stale-base top-level delete merge. |
| PR11C | Stale-base middle inserts can land incorrectly or disappear. | Inserted blocks can be misplaced under concurrent edits. | `ready/rtc-pr11c-stale-base-block-middle-insert` | Ready | Stale-base middle insert merge. |
| PR11D | Stale explicit-base top-level moves can reorder incorrectly. | User block reorder can be lost or applied to the wrong order. | `ready/rtc-pr11d-stale-top-level-move-reorder` | Ready | Explicit-base top-level move/reorder. |
| PR11E | Delete plus insert-anchor interactions can revive or misplace blocks. | Inserted blocks can anchor to deleted state. | `ready/rtc-pr11e-top-level-insert-anchor-after-delete` | Ready | Top-level insert anchor after delete. |
| PR12 | Previous-local cache handling can lose deletes or reorders. | Cached local state can resurrect or reorder stale blocks. | `ready/rtc-pr12-previous-local-cache` | Ready | Previous-local cache merge path. |
| PR13A | Observed top-level deletes lack enough provenance to prevent resurrection. | Deleted blocks can return after concurrent stale edits. | `ready/rtc-pr13a-observed-delete-provenance` | Ready | Observed delete provenance. |
| PR13B0 | Stale block identity provenance can smear block content or operations. | Updates can attach to the wrong stale block identity. | `ready/rtc-pr13b0-identity-provenance-guard` | Ready | Block identity provenance guard. |
| PR13B1 | Cross-parent source retirement can leave stale source identities active. | Moved/reparented blocks can duplicate or revive. | `ready/rtc-pr13b1-direct-source-retirement-green` | Ready | Direct cross-parent source retirement. |
| PR13B2 | Current-only cross-parent sources can fail to retire. | Current-only stale sources can duplicate moved blocks. | `ready/rtc-pr13b2-current-only-source-retirement-green` | Ready | Current-only source retirement. |
| PR13B3 | Explicit-base cross-parent sources can fail to retire. | Explicit-base stale sources can reintroduce old block placement. | `ready/rtc-pr13b3-explicit-base-source-retirement-green` | Ready | Explicit-base source retirement. |
| PR14 | Stale table body-array merges can produce wrong table content/order. | Table edits can diverge across peers. | `ready/rtc-pr14-table-body-array-green` | Ready | Table body array merge logic. |
| PR14B | Table query-array local suffix appends can be dropped after PR14. | Table row/cell suffix edits can disappear. | `ready/rtc-pr14b-table-query-array-local-suffix-append` | Ready | Query-array local suffix append merge. |
| PR15A | Fallback-created top-level group moves can be lost. | Moved fallback groups can remain in stale positions. | `ready/rtc-pr15a-fallback-group-move-green-on-pr14b` | Ready restacked after PR14B | Fallback group move merge. |
| PR15B | Fallback group insert anchors can point at stale remote state. | Inserted fallback groups can land at the wrong location. | `ready/rtc-pr15b-fallback-group-insert-anchor-green-on-pr14b` | Ready restacked after PR14B | Fallback group insert-anchor merge. |
| PR15C | Fallback group deletes can be lost after restacking. | Deleted fallback groups can reappear. | `ready/rtc-pr15c-fallback-group-delete-green-on-pr14b` | Ready in latest finalization table; Cycle 230 had a conflicting preserved clone | Fallback group delete merge. |

## Product Candidates / Evidence Gates Not Yet PRs

| ID | Bug / signal | Current evidence | Status | Next required action |
| --- | --- | --- | --- | --- |
| PR17 / seed `1020002` | Follower-side Yjs update application or reclassification blocker. | Blocks final filing and final-stack fuzz, but current source ownership is not settled in the running split. | Blocked | Proof-based reclassification or a focused product fix before filing/final fuzz. |
| PR18A candidate / seed `7510029` | Nested child delete after nested edit leaves one peer with `core/group -> core/paragraph` and another with empty `core/group`. | Cycle 230 reducer classified this as `candidate-pr18a-after-red-test`; no deterministic source-local/UI red test yet. | Evidence gate | Build a red test and compare against PR13/PR15 coverage before adding a product PR. |
| Seed `5200005` | Same-user post-reload table-delete residual. | Needs same-user post-reload table-delete owner reduction; previous replay was blocked by `wp-env` readiness. | Evidence gate | Produce E2E-ready replay evidence and source owner before creating a branch. |
| Seed `1060015` | Invalid-block collaboration/reload residual near parser/normalization behavior. | Needs PR05-near invalid-block collaboration binding reducer; previous replay was blocked by environment readiness. | Evidence gate | Produce deterministic reducer and owner classification. |
| Reload-hydration residuals / seed `7700005` | Stale-tab/reload residuals after PR07B. | Latest deferred queue keeps reload-hydration high priority and PR07C now exists, but residuals still need replay reduction beyond saved-response hydration. | Active candidate family | Let PR07C finalization finish, then rerun focused reload/stale-tab gates. |

## Diagnostic / Deferred Families

| Family | Current branch / artifact | Status | Why it is not a product PR now |
| --- | --- | --- | --- |
| Pre-save search/live-collapse | `candidate/rtc-diagnostic-pre-save-search-live-collapse-022131-on-pr14b-split` | Diagnostic | Product owner not proven; used to capture/focus replay evidence. |
| Rich-text suffix corruption | `candidate/rtc-diagnostic-rich-text-suffix-corruption-022133-on-pr14b-split` | Diagnostic | Current branches classify divergence and support replay, but do not yet prove a product fix. |
| Malformed save payload raw deferred refs | many `deferred/rtc-malformed-save-payload-*` refs | Downscoped | Covered by canonical `ready/rtc-pr06b-malformed-save-request-payload-minimal`; raw deferred heads are superseded. |
| HTTP room isolation raw deferred refs | many `deferred/rtc-http-room-isolation-*` refs | Downscoped | Covered by PR02A unless fresh healthy primary-room contamination evidence appears. |
| HTTP room response diagnostics | `deferred/rtc-http-room-isolation-20260517T023739Z` and related diagnostics | Diagnostic/downscoped | Latest queue says no fresh healthy-user HTTP room-isolation product evidence. |
| Pre-action bootstrap stalls | historical `pre_action_bootstrap_stall` raw family | Noise/infra for product report | Dominates raw historical counts, but current policy suppresses strict startup/no-product records unless product evidence exists. |
| Late session awareness stalls | historical `late_session_awareness_stall` family | Mixed; mostly triage/noise unless product evidence appears | Needs product evidence beyond awareness/test-provider stall before becoming a product PR. |
| Revision selector ambiguity | singleton historical families such as `rtc_fuzz_revision_selector_ambiguously_restores_intermediate_checkpoint` | Oracle/noise question | Requires oracle clarification before product fix. |
| Toolbar/rich-text marker split false positive | historical `test_oracle_false_negative_marker_split_by_inline_markup` and related rows | Oracle/noise question | Some evidence points to marker/oracle mismatch rather than product divergence. |

## Duplicate Signature Context

At this snapshot, historical triage still contains many raw signatures:

- raw historical signatures: `27416`
- historical actionable signatures after policy: `9813`
- historical likely-real visible: `51`
- historical likely-real merged duplicates: `1237`
- raw top family: `pre_action_bootstrap_stall` at about `50.48%`
- visible top semantic families after policy include `late_session_awareness_stall`,
  `unknown`, `timeout`, `collaboration_non_convergence`, and `assertion`

Those numbers are not independent bugs. The product inventory above is the
current de-duplicated working set that has either a proposed fix, a candidate
branch, or a required evidence gate.

## Current Filing / Validation Blockers

The branch inventory is ahead of filing. Do not file the stack until these are
resolved:

1. Settle PR17 / seed `1020002`.
2. Finish or confirm PR07C finalization output. The branch and validation head
   exist, but the finalizer session was still active while this report was
   written.
3. Rebuild and validate the final combined stack with PR06B minimal, PR07C,
   PR14B, and restacked PR15A/B/C.
4. Run focused seed gates for `1020002`, `5200005`, `1060015`, and `7510029`
   as applicable.
5. Run final-stack fuzz before filing.

## Update Procedure

To refresh this report, collect:

```bash
ssh exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org \
  'sed -n "1,260p" /media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/current-pr-split.md'

ssh exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org \
  'sed -n "1,220p" /media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/current-deferred-status.md'

ssh exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org \
  'root=$(cat /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/current-output-dir.txt); sed -n "1,220p" "$root/novelty-status.md"'

ssh exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org \
  'cd /media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo && git branch --format="%(committerdate:iso8601)%09%(refname:short)%09%(objectname:short)%09%(contents:subject)" | grep -E "ready/rtc|candidate/rtc|deferred/rtc|validation/rtc" | sort'
```

Then update the snapshot time, aggregate counters, branch names, and blocker
rows above. Do not add a raw fuzz signature as a new product bug unless it has
either source-owner evidence, a red test, or a maintainer-sized proposed fix.
