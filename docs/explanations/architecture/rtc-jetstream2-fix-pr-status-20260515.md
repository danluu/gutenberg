# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T01:26:59Z`

Trigger event:
`pr-split-2026-05-17T01-25-58Z-20260517T011749Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T01-25-58Z-20260517T011749Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked for the final stack, but not all useful work is blocked.
The latest split-persona synthesis, `pr-split-20260517T011749Z-synthesis.md`,
keeps the Cycle 216 sidecar shape and adds a tail correction: do not let
PR17/seed `1020002` serialize the independent Parallel Progress Gate rows.
PR6B is canonical malformed-save product work after PR06A, but it remains a
PR06A sidecar rather than a linear base for PR07A-PR15C or a default PR16 tail.
The PR07A-over-PR6B restack hit a real conflict in
`packages/core-data/src/test/actions.js`, so PR07A-PR15C stay on their existing
PR06A-based chain while final validation must prove both PR6B and PR15C are
included.

PR6B sidecar integration evidence exists:
`validation/rtc-pr06b-plus-pr15c-sidecar-20260517T004623Z` at
`0662b838eaf0961605a95ecb1bd83bd4713e33d3`, with both PR6B and PR15C ancestry
checks passing. That head is validation-only and must not be filed as product
content. The local manifest/import refresh action from
`pr-split-20260517T005833Z-feedback-action.md` wrote a nonempty branch audit,
push manifest, loop-gate verification, and reload handoff, but the current
GitHub branch-link audit still has no `verified-content` row for PR6B. PR6B
must stay `No verified branch link yet` until the audit exposes a verified
review branch.

PR17 remains the final-stack blocker. The current nonempty PR17 report says
local single-module Yjs/y-protocols replay does not reproduce the deletion and
the evidence is not product-owned. The next PR17 decision is whether that
medium-confidence evidence is enough to reclassify seed `1020002`; if not, run
one browser/provider ownership diagnostic that captures runtime Yjs/module
identity, the exact raw update entering `applyUpdate`, and the emitted doc
update before shaping any product branch. Active or newly launched `1020002`
work is not progress by itself while non-`1020002` rows remain actionable.

The current maintainer-facing recommendation is:

```text
ready PR01 -> PR02, with PR02A as a PR02 sidecar
-> PR03 -> PR04 -> PR05A/B/C -> PR06 -> PR06A
-> PR6B malformed outgoing RTC save payloads as an explicit PR06A sidecar
-> existing PR07A/B -> PR09 -> PR10 -> PR11A-E -> PR12
-> PR13A/B/C using repaired audited review refs until any finer PR13 split has
   verified branch links
-> PR14 -> PR15A/B/C
-> validation-only PR6B+PR15C integration head, not a product PR
-> PR17 seed 1020002 proof/reclassification/repair decision
-> strict-expansion source-reduction gate
-> PR18x only for source-reduced uncovered product bugs
-> rebuilt combined validation stack
-> focused 1020002 gate
-> final-stack fuzz and filing
```

The ready heads remain a known-fix prefix, not a complete filing stack. The
PR6B source remains `ready/rtc-pr06b-malformed-save-request-payload` at
`87e0ed20ab8`, after `ready/rtc-pr06a-persisted-empty-content-guard`. Do not
file `deferred/rtc-malformed-save-payload-20260516T230550Z` or
`deferred/rtc-malformed-save-payload-20260516T235059Z` as-is. They are useful
request-payload evidence on the validation/deferred base, but PR6B publication
must come from only these two request-payload commits:

```text
8340c5d794a Avoid valid block originalContent in CRDT saves
008b7258fe4 Protect RTC saves from malformed evaluated content
```

The previous deterministic restack audit, conflict-resolution work, blind
linear-restack plan, and default PR16 malformed-save tail are superseded by the
PR6B ready ref plus explicit sidecar topology, unless that topology later
proves unusable. Broader malformed post-save settlement residuals and sidecar
seed `7410076` stay deferred.

PR17 remains separate from PR6, PR13, PR15, PR16, reload hydration, pre-save
search/live-collapse, HTTP room isolation, and rich-text suffix work. Current
evidence still says the marker-bearing update reaches the relay/page 1 while
page 0 applies the remote client range as deleted, but the newest PR17 report
points away from product-owned single-module Yjs apply behavior and toward
browser/provider runtime ownership or reclassification.

Seed `5700084` is not a product PR candidate. The latest comparison classifies
it as PR5C-covered plus strict oracle/exact-content drift, not PR18A or PR5D.
Fresh strict-expansion residuals, such as invalid/deprecated/parser-stress
delete divergence around seed `5200021`, are source-reduction inputs only until
they are reduced to uncovered product behavior. Do not create speculative PR18x
branches.

The duplicate/noise evidence still classifies the remaining noise as a fuzz
control-plane issue, not product validation. The latest duplicate/noise
synthesis, `duplicate-noise-20260517T011444Z-synthesis.md`, made no file
edits; it narrows the next safe fix to durable no-product startup/discovery
noise suppression across output-root changes, supervisor `paused-startup-stall`
sync, and consumer guard parity without hiding product-evidence signatures. The
collected raw novelty snapshot moved again to coverage root
`run-20260517T012157Z`; it has `0` current actionable signatures and `0`
visible likely-real failures, but still warns that no behavioral coverage files
were found under the new output directory. Do not launch broad final-stack fuzz
or file PRs yet. Final filing still waits on a verified PR6B branch link, PR17
repair or reclassification, strict-expansion source-reduction decisions,
rebuilt combined validation, a focused `1020002` gate, and final-stack fuzz over
the rebuilt stack.

## Branch And Ref Status

The remote status input was generated at `2026-05-17T01:26:54Z`.

The fix-planning repo is checked out at:

```text
## fix/rtc-fallback-group-delete-stale-local
d06e3528cbd Fix stale fallback group deletes
```

That checkout still has an untracked reload-hydration E2E gate spec:

```text
test/e2e/specs/editor/collaboration/websocket-only/collaboration-reload-hydration-empty-live-gate.spec.ts
```

Keep that spec out of PR 6, PR 6A, PR 8A, PR 15A/15B/15C, fallback-group
evidence, and final branch claims unless it is deliberately copied into a clean
evidence worktree.

The fuzz repo remains on the validation stack:

```text
## try/rtc-fix-stack-validation
72854f05ed2 Hydrate saved CRDT responses without invalidation
```

That stack has modified product/test files and many untracked fuzz, analysis,
and documentation artifacts. It is active validation infrastructure, not the
final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-17T01:26:59Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`.

For repaired PR 13 content, use only these audit refs:

- [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired)
- [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement)
- [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard)

Do not link the stale or misordered PR13 refs listed in the audit under
"Explicitly Not PR-Content Links":
`review/rtc-pr13a-observed-delete-provenance`,
`review/rtc-pr13b-stale-block-identity-smear`, or
`review/rtc-pr13c-cross-parent-source-retirement`.

The supporting provenance base
[`shape/rtc-crdt-pr12-previous-local`](https://github.com/danluu/gutenberg/tree/shape/rtc-crdt-pr12-previous-local)
is pushed only so the repaired PR13A compare link has the source base.

## Proposed PR Split

Every proposed row either uses a clickable branch link from the verified
branch-link audit or explicitly says `No verified branch link yet`. The latest
split synthesis still points at a finer local PR13A/B0/B1/B2/B3 shape, but the
current audit only verifies the repaired PR13A/B/C review refs, so those remain
the maintainer-facing links in this report until finer PR13 rows have verified
branch links.

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified branch; keep in known-fix prefix |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified branch; keep in known-fix prefix |
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | 1 | +115 / -0 | local ready head exists per prior manifest work; publish/fetch/audit a remote review branch or fold/restack before filing |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; seed `5500002` marker-retention remains separate follow-up |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified branch; keep in known-fix prefix |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | 2 | +465 / -8 | replacement for old aggregate PR 5; local ready head still needs remote verified-content branch link |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | 2 | +925 / -42 | replacement for old aggregate PR 5; local ready head still needs remote verified-content branch link |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | +287 / -15 | replacement for old aggregate PR 5; seed `5700084` now classifies as PR5C-covered plus strict oracle/exact-content drift, not a new product PR |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified branch; excludes malformed-save restack and broader residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified branch; narrow persisted-body guard |
| PR 6B | Malformed outgoing RTC save request-payload guard from `ready/rtc-pr06b-malformed-save-request-payload` at `87e0ed20ab8` | No verified branch link yet | TBD | TBD | canonical PR06A sidecar; validation-only head `validation/rtc-pr06b-plus-pr15c-sidecar-20260517T004623Z` proves PR6B and PR15C ancestry, and the latest local manifest/import refresh wrote nonempty audit/manifest evidence, but filing still needs a GitHub `verified-content` branch link, the PR17 decision, strict source-reduction decisions, and rebuilt validation over the final stack |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified branch; repaired split head |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified branch stacked after PR 7A |
| PR 8A | Narrow title reload replacement | No verified branch link yet | TBD | TBD | not in the current `20260517T011749Z` topology; broad verified PR 8 is prior art only, and any PR8A revival needs a shaped and audited branch |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; keep in known-fix prefix |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified branch; start CRDT block stack |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | 2 | +257 / -3 | green in validation-stack rebuild; local ready head still needs remote verified-content branch link |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | 2 | +240 / -2 | green in validation-stack rebuild; local ready head still needs remote verified-content branch link |
| PR 11C | Explicit-base middle insert | No verified branch link yet | 2 | +220 / -0 | green in validation-stack rebuild; local ready head still needs remote verified-content branch link |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | 2 | +259 / -0 | green in validation-stack rebuild; local ready head still needs remote verified-content branch link |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | 2 | +170 / -0 | green in validation-stack rebuild; local ready head still needs remote verified-content branch link |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified branch; keep in known-fix prefix |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired audit link; first maintainer-facing PR13 delta |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired audit link; carries the source-retirement delta |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired audit link; third maintainer-facing PR13 delta |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified branch; keep after PR13 source sequence |
| PR 15A | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 | +123 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 15B | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | 2 | +197 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 15C | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | 2 | +161 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 17 | Seed `1020002` WebSocket/Yjs proof, reclassification, or repair | No verified branch link yet | TBD | TBD | active final-stack blocker; latest nonempty report says local single-module Yjs replay does not reproduce the deletion and current evidence is not product-owned, so decide whether to reclassify or run one browser/provider ownership diagnostic before shaping a product branch; do not let this serialize independent non-`1020002` work |
| PR 18x | Future strict-expansion residuals only if source-reduced to uncovered product behavior | No verified branch link yet | TBD | TBD | no current product PR; seed `5700084` is PR5C/oracle drift, and newer invalid/deprecated/parser-stress rows such as seed `5200021` need source reduction before any PR18x branch is named |

Verified branches that are prior art or staging only:

- [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence)
  is verified content for old aggregate PR 5, not the recommended
  maintainer-facing split.
- [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record)
  is verified content for old broad PR 8, not an active filing unit.
- [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops)
  is verified content for old aggregate PR 11, but the active recommendation
  is the PR11A-E split.

## Bug Coverage By Proposed PR

"Fixed" below means fixed by the proposed branch when the row has a verified
branch link. Rows without a verified branch link are intended coverage claims
from local ready heads, validation-stack work, or active investigation; they
still need the branch-link and validation gates in the main PR split table
before filing.

| PR | Bugs fixed or intended to fix |
| --- | --- |
| PR 1 | Fixes HTTP polling sessions that generate or accept oversized update payloads, which can stall or corrupt sync state before clients converge. |
| PR 2 | Fixes HTTP polling storage reads that scan the wrong update window, so late or reconnecting pollers can miss needed updates or reprocess stale data. |
| PR 2A | Intended to fix the narrowed HTTP room-isolation regression where one post/session can observe or retain another room's polling state; broader HTTP residuals remain deferred until separately source-proven. |
| PR 3 | Fixes revision restore leaving stale `_crdt_document` metadata attached to restored content, which can make collaborators reload or save against the pre-restore CRDT state. It does not yet cover the separate seed `5500002` marker-retention follow-up. |
| PR 4 | Fixes repeated save/meta churn around persisted CRDT metadata, where equivalent saved RTC state can be treated as a new edit and feed stale save loops or unnecessary persistence writes. |
| PR 5A | Intended to fix entity/reference normalization false differences, where semantically equivalent entity references are treated as RTC content changes and can trigger avoidable save or merge churn. |
| PR 5B | Intended to fix parser/rich-text HTML equivalence false differences, where equivalent rich-text serialization is treated as a destructive CRDT delta instead of a no-op. |
| PR 5C | Intended to fix preserve-whitespace linebreak equivalence, including the `\n` versus `<br>` class represented by seed `5700084`; the current conclusion is that `5700084` is PR5C-covered plus strict-oracle drift, not a new product PR. |
| PR 6 | Fixes outgoing save requests built from stale, empty, or unsafe CRDT projections, including cases where the save payload can drop valid block content or repair from stale raw content incorrectly. Malformed evaluated-content residuals are split to PR6B. |
| PR 6A | Fixes persisted empty-content records overwriting a valid CRDT-backed post body, preserving the saved CRDT body when the REST/entity record is empty or incomplete. |
| PR 6B | Intended to fix malformed outgoing RTC save request payloads using only commits `8340c5d794a` and `008b7258fe4`: valid block `originalContent` must not be used as malformed CRDT save content, and evaluated content must be guarded before REST save. |
| PR 7A | Fixes stale save-response actions overwriting newer RTC entity/block state, including base-version regressions and stale block content returned by delayed saves. |
| PR 7B | Fixes save-response manager/base-record handling that can invalidate or overwrite newer CRDT-backed state, especially stale title/base-record updates after a save completes. |
| PR 8A | If revived, would cover only a narrowed title reload/persisted-record replacement bug. The broad PR8 branch is prior art and no active PR8A filing unit is currently verified. |
| PR 9 | Fixes core-data store lock unfairness where older pending locks can be bypassed by newer work, allowing stale or out-of-order entity operations to win. |
| PR 10 | Fixes the CRDT block reconciliation foundation for stale block identity rebasing, preventing local stale snapshots from applying edits to the wrong logical block after remote structural changes. |
| PR 11A | Intended to fix explicit-base stale suffix append failures, where a stale local suffix append can drop or reorder remote top-level block changes. |
| PR 11B | Intended to fix explicit-base top-level delete failures, where a stale local snapshot mishandles a remote or concurrent top-level block deletion. |
| PR 11C | Intended to fix explicit-base middle insert failures, preserving remote top-level order when a local stale snapshot inserts into the middle of the block list. |
| PR 11D | Intended to fix explicit-base top-level move/reorder failures, preventing stale snapshots from undoing or corrupting remote block reorders. |
| PR 11E | Intended to fix explicit-base delete-plus-insert anchor failures, where a delete and insert in the same stale-base window can attach to the wrong block position. |
| PR 12 | Fixes previous-local-cache top-level block operations: remote top-level appends, deletes, and reorders must not be lost or resurrected when a stale local snapshot edits a different block. |
| PR 13A | Fixes observed-delete provenance for top-level blocks, preventing a stale local merge from resurrecting a block after this client has already observed the remote delete. |
| PR 13B | Fixes cross-parent source retirement, preventing moved blocks from leaving source-side ghosts or duplicate content after cross-parent/current-only or explicit-base moves. |
| PR 13C | Fixes stale block identity smear, where stale identity data can cause later edits or deletes to affect the wrong block after reconciliation. |
| PR 14 | Fixes nested table-body/query-array stale local merges, preserving remote table row/cell array edits instead of replacing the nested array with an older local shape. |
| PR 15A | Fixes fallback-group move/reorder stale merges, where block groups without a better explicit identity fallback can reorder incorrectly under stale local snapshots. |
| PR 15B | Fixes fallback-group insert-anchor stale merges, preserving the intended insertion anchor when local stale state and remote structural edits interact. |
| PR 15C | Fixes fallback-group delete stale merges, preventing fallback-group deletes from resurrecting or deleting the wrong grouped blocks under stale local state. |
| PR 17 | Not fixed yet. This row owns seed `1020002` only if browser/provider diagnostics prove a WordPress-owned WebSocket/Yjs marker divergence; otherwise the current evidence points toward reclassification or deferral rather than a product PR. |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-17T01:26:54Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T012157Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The clean structural validation ref remains:

```text
validation/rtc-final-combined-stack-post-pr11-20260516T110608Z
921f093cc47b46844bf8fb48552483686c55ef6b
```

That rebuild reported focused CRDT checks, touched-file JS lint,
`git diff --check`, containment, range-diff, and diffstat evidence passing.
Treat it as structural and focused-check evidence for the known-fix prefix. It
is not final-stack fuzz validation and no longer represents the complete filing
stack because PR02A still needs a verified review branch, PR6B still needs a
verified branch link, PR17 still needs a repair/reclassification decision, and
the rebuilt validation stack has not been rerun over those final decisions.

The collected `raw/novelty-status.md` is non-empty for this update. It was
updated at `2026-05-17T01:23:57.931Z` and reports current-output-dir-only
triage with `0` actionable signatures, `0` raw signatures, and `0` likely-real
visible. It saw `37,829` coverage files and `58,127` total records, processed
`39` records this pass, and reported `load1: 41.51 / 64 cores`, `434.7G` free
memory, and headroom for adding groups. Treat this as current
health/control-plane evidence, not product validation.

The active coverage root is now `run-20260517T012157Z`. Current-run record
breakdowns are still empty because the novelty monitor had just moved roots and
reported no behavioral coverage files under the new output directory yet. The
enabled groups are `novelty-ws-lifecycle`,
`novelty-ws-persistence-no-title`, `novelty-ws-real-user-editing`,
`novelty-ws-real-user-rich-text`, and `novelty-http-persistence-probe`; no
groups are paused.

The same novelty status records the `2026-05-17T01:10:02Z`,
`2026-05-17T01:17:01Z`, and `2026-05-17T01:22:07Z` root/policy changes and the
hold on open-ended coverage-guidance Codex because historical raw
`pre_action_bootstrap_stall` noise dominated observed triage. The historical
aggregate still shows `13,828` raw `pre_action_bootstrap_stall` signatures and
historical raw duplicate share around `0.5137`, while the current output dir
has current duplicate share `0`. That hold is a control-plane safeguard; it
does not change the maintainer-facing PR split.

The latest trend evidence packet was generated at `2026-05-17T01:16:15Z` from
monitor data through `2026-05-17T01:15:23Z`:

```text
monitor passes: 1784
coverage files: 272 -> 37764
coverage files delta: 37492
unmet coverage goals: 24 -> 6
likely_real_max: 0
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3526
summary_startup_failures_last: 0
quality_issues_last: 0
fuzz level mix: browser-e2e=30 lanes/30 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 2726809
browser-e2e execution: 93451 cumulative / 144 per-hour
unit-property execution: 2368752 cumulative / 14448 per-hour
coverage-guided-lower-level execution: 261600 cumulative / 1792 per-hour
load1/load5/load15: 44.59 / 63.11 / 96.26 on 64 cores
memory: 430.6G free
```

The trend packet lists these enabled groups:

```text
novelty-ws-lifecycle
novelty-ws-persistence-no-title
novelty-ws-real-user-editing
novelty-ws-real-user-rich-text
novelty-http-persistence-probe
```

Largest remaining coverage gaps in the trend evidence are `reload-post-action`
`657/1000`, `ui-heading-shortcut` `672/1000`, title-save-reload `244/500`,
body-save-reload `303/500`, successful real-user-editing records `377/500`,
and `ui-format-paragraph` `954/1000`. The raw novelty snapshot one pass later
has `reload-post-action` at `660/1000`, `ui-heading-shortcut` at `674/1000`,
title-save-reload at `246/500`, body-save-reload at `305/500`, successful
real-user-editing records at `380/500`, and `ui-format-paragraph` at
`957/1000`.

The `0` likely-real trend result and the raw novelty `0` current likely-real
visible count are useful health evidence, not final-stack validation and not
filing unblockers. Historical duplicate/noise remains a separate control-plane
concern and must not be presented as current product failure; the latest
duplicate/noise synthesis keeps the next fix bounded to no-product
startup/discovery suppression and representative-preserving duplicate gates.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T011749Z-synthesis.md`. Its useful change is the tail
correction after Cycle 216: keep PR6B as the canonical PR06A sidecar, but do
not let PR17/seed `1020002` serialize independent progress. It recommends:

- keep `ready/rtc-pr06b-malformed-save-request-payload` at `87e0ed20ab8` after
  `ready/rtc-pr06a-persisted-empty-content-guard`;
- keep the existing PR07A-PR15C chain based on PR06A instead of forcing it to
  restack over PR6B;
- use the validation-only PR6B+PR15C integration head only as validation
  evidence, not as a product PR;
- require final validation to explicitly contain both PR6B and the existing
  PR15C chain;
- keep PR17 separate and decide reclassification versus one browser/provider
  ownership diagnostic before shaping any product branch;
- add a strict-expansion source-reduction gate before final validation, and
  create PR18x only for source-reduced uncovered product bugs;
- keep broader reload-hydration, stale-tab/same-user reload, pre-save
  search/live-collapse, rich-text suffix, and broader HTTP claims evidence-gated
  unless fresh product evidence appears;
- treat loop/controller wait-only feedback as invalid while Parallel Progress
  Gate rows exist.

The latest PR-split feedback action,
`pr-split-20260517T005833Z-feedback-action.md`, is nonempty. It applied the
Cycle 216 sidecar topology to the remote current split, updated deferred
malformed-save and HTTP rows, and launched
`rtc-prsplit-cycle216-manifest-reload-20260517T010930Z`. That job wrote a
nonempty branch audit, push manifest, loop-gate verification, and reload replay
handoff, verified PR6B, PR15C, the validation-only PR6B+PR15C head, and the
reload-hydration candidate, and did not push to GitHub. This is useful local
evidence, but it does not replace the GitHub branch-link audit rows in this
report.

The Cycle 212 PR6B topology job remains the named PR6B topology artifact:

```text
runs/20260517T001709Z/jobs/run-rtc-pr06b-linear-restack-and-manifest-20260517T002555Z.sh
runs/20260517T001709Z/jobs/outputs/rtc-pr06b-linear-restack-and-manifest-20260517T002555Z/report.md
```

Do not launch another blind linear restack. The bounded PR6B sidecar
integration lane produced:

```text
runs/20260517T003651Z/jobs/outputs/rtc-pr06b-sidecar-integration-validation-manifest-20260517T004623Z/report.md
```

That report records `validation/rtc-pr06b-plus-pr15c-sidecar-20260517T004623Z`
at
`0662b838eaf0961605a95ecb1bd83bd4713e33d3`, and both PR6B and PR15C ancestry
checks pass. That is not enough to file: the GitHub branch-link audit still
lacks a PR6B `verified-content` row, and rebuilt combined validation must wait
for the PR17 repair/reclassification decision plus strict-expansion
source-reduction decisions. Keep PR6B marked `No verified branch link yet`
until the GitHub branch-link audit contains a `verified-content` row for it.

The latest split synthesis says useful next work is not waiting: run a real
reload-hydration replay for `deferred/rtc-reload-hydration-20260517T010615Z`
and seeds `5300002`/`5700013`, preferably also `5200005`, `5200009`, and
`6000004` or `6000005`; refresh branch audit and push manifest evidence; source
reduce fresh strict-expansion residuals; and enforce the Parallel Progress Gate
so active `1020002`, stderr growth, `report.tmp`, zero-byte reports, stale
manifests, lock holders, prompt files, "job launched", and run scripts do not
count as progress. Do not launch broad final-stack fuzz, extra browser lanes,
or another open-ended coverage Codex job from this state. Launch the focused
PR17 browser/provider runtime diagnostic only if the existing PR17 report is
not accepted as sufficient reclassification evidence.

The newest duplicate/noise synthesis is
`duplicate-noise-20260517T011444Z-synthesis.md`; its matching feedback-action
file is zero bytes, so no new files were edited in that pass. It supersedes the
earlier active-scope action only as analysis, not as an implementation report:
strict no-product startup suppression mostly works downstream, but novelty and
supervisor pause state are not durable enough across output-root rollover, and
consumer duplicate/family gates can still hide the only useful representative.
The next safe control-plane fix is durable no-product startup/discovery
cooldown preservation, supervisor `paused-startup-stall` sync, and
triage/analysis/live guard parity. Do not broadly suppress late-session,
timeout, assertion, non-convergence, save/reload, or witness failures when they
carry product evidence.

The previous duplicate/noise action,
`duplicate-noise-20260517T003444Z-feedback-action.md`, remains the latest
implemented control-plane fix. It implemented active-supervisor current-run
scoping in novelty/live analysis, marked inactive generation triage sources
stale, restarted the coverage-guided novelty/live-analysis sessions, and
reported `0` actionable signatures after the action.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older
"keep existing split", "do not add PR6B", "only novelty-http is enabled", and
stale PR13 review-ref warnings are superseded by the
`2026-05-17T01:26:59Z` branch-link audit, the current novelty status, and the
latest split syntheses.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Malformed-save request-payload PR6B | `ready/rtc-pr06b-malformed-save-request-payload` at `87e0ed20ab8`; sidecar topology report path `runs/20260517T001709Z/jobs/outputs/rtc-pr06b-linear-restack-and-manifest-20260517T002555Z/report.md`; validation-only head `validation/rtc-pr06b-plus-pr15c-sidecar-20260517T004623Z` at `0662b838eaf0961605a95ecb1bd83bd4713e33d3`; latest local manifest/import refresh `rtc-prsplit-cycle216-manifest-reload-20260517T010930Z`; evidence heads `deferred/rtc-malformed-save-payload-20260516T230550Z` and `deferred/rtc-malformed-save-payload-20260516T235059Z`; commits `8340c5d794a`, `008b7258fe4` | active recommended PR after PR6A as an explicit sidecar; no current GitHub `verified-content` branch-link audit row; both PR6B and PR15C ancestry checks pass in the validation-only head; local manifest/audit evidence is useful but not a PR-content branch link; deferred heads remain evidence-only | Add a verified GitHub branch link, decide PR17, source-reduce strict residuals, and rebuild combined validation so it explicitly includes both PR6B and the existing PR15C chain |
| Malformed post-save settlement residuals and sidecar | `f51c425df8a5`, `f46859898576`, `7410076` | deferred/evidence-only; not part of PR6B or PR16 unless separately source-proven | Keep source-reducing; promote only with clean local source evidence and a verified branch link |
| Seed `1020002` WebSocket marker divergence | marker-bearing relay/page-1 evidence plus latest nonempty PR17 report saying local single-module Yjs replay does not reproduce the deletion and current evidence is not product-owned | active PR17/final-stack blocker; no verified filing branch exists | Decide whether the report is enough to reclassify. If not, run one browser/provider ownership diagnostic with runtime fingerprints and exact raw update capture; then repair, reclassify, or defer |
| Seed `5700084` strict linebreak divergence | live `core/verse.attributes.content` `\n` vs `<br>` comparison | no product PR and no active PR18x row; classified as PR5C-covered plus strict oracle/exact-content drift | Downscope/update the strict oracle; do not create PR18A or PR5D for this seed |
| Fresh strict-expansion residuals | invalid/deprecated/parser-stress delete divergence such as seed `5200021` | source-reduction input only; no current PR18x branch and no verified branch link | Source-reduce and compare against PR13, PR15, PR6B/PR17, and existing parser/oracle coverage before naming any PR18x product branch |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit and not in the current `20260517T011749Z` topology | Shape and audit a narrowed title-reload branch only if PR 8A is revived |
| Reload hydration empty live editor | active/latest deferred candidate `deferred/rtc-reload-hydration-20260517T010615Z`; replay seeds `5300002` and `5700013`, with broader replay set `5200005`, `5200009`, and `6000004` or `6000005`; prior row `20260516T233554Z` plus older gate branches | evidence-only; not in PR 6, PR 6A, PR 8A, PR 15, or fallback-group claims; the latest manifest/import job wrote a replay handoff but the latest split synthesis still asks for a real replay | Promote only if a clean gate reaches the post-reload assertion and live editor state stays empty after exact-room WebSocket sync while REST body and persisted `_crdt_document` remain populated |
| Pre-save search/live document collapse | latest deferred row `20260516T233555Z` plus prior pre-save search/live-collapse candidate rows | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Rich-text formatted suffix corruption | current diagnostic publication candidate `20260516T235057Z` plus prior `deferred/rtc-rich-text-formatted-suffix-20260516T230547Z` | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Broader HTTP polling room-isolation residuals | HTTP downscope row `20260516T232052Z`; PR02A has no verified branch link yet | PR02A remains in the known-fix prefix and points back to `ready/rtc-pr02a-http-room-isolation-regression`, but broader residuals stay deferred | Publish/fetch/audit a PR02A review branch before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack blockers; no automatic PR slot | Triage only after `1020002` is repaired or reclassified and the rebuilt stack is available |
| Duplicate/noise control-plane leak | latest synthesis `duplicate-noise-20260517T011444Z-synthesis.md`; latest implemented action `duplicate-noise-20260517T003444Z-feedback-action.md`; active root now `run-20260517T012157Z`; action artifacts `artifacts/cycle-88-control-plane.patch` and `artifacts/cycle-88-status.md` | control-plane issue, not product validation; active-supervisor scoping is implemented, latest raw novelty has `0` current actionable signatures and `0` likely-real visible, and it warns that the new output dir has no behavioral coverage files yet; newest synthesis says no-product startup/discovery suppression still needs durable pause/supervisor sync and consumer guard parity | Keep monitoring under active-supervisor scoping; implement durable no-product startup/discovery cooldown preservation and representative-preserving duplicate gates only if product-evidence signatures remain visible |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr` branches as-is.

Before filing any maintainer-facing PR:

1. Verify environment health first. A disk-preflight-only report, zero-byte
   report, missing rc file, or stale active session is not durable progress
   while actionable Parallel Progress Gate rows remain.
2. Use the explicit ready prefix. Do not wildcard import or file
   `final/rtc-pr*`, validation-stack branches, deferred branches, or dirty
   evidence branches.
3. Keep old aggregate PR 5, broad PR 8, aggregate PR 11, stale/misordered
   PR13 refs, old dropped save snapshot/no-op PR6B material, PR 6C, dirty
   evidence branches, and the untracked reload-hydration gate spec out of
   filing branches and push allow-lists.
4. Publish/fetch and audit PR02A plus individual PR 5A/5B/5C, PR11A-E, and
   PR6B, plus PR 8A only if it is revived and shaped, or keep rows marked
   `No verified branch link yet`.
5. Use the repaired audited PR13A/B/C review refs for maintainer-facing PR13
   links until any finer PR13 subheads have verified audit rows.
6. Import PR6B from `ready/rtc-pr06b-malformed-save-request-payload` at
   `87e0ed20ab8`, using only commits `8340c5d794a` and `008b7258fe4` as the
   product delta. Treat the old PR16 fallback as superseded unless PR6B import
   or rebuilt combined validation fails. Require a clean ref, sidecar
   manifest/validation evidence, focused tests, lint, formatting, build,
   `git diff --check`, seed replay evidence, branch audit, explicit inclusion
   beside the existing PR15C chain, and a verified
   branch link before filing it.
7. Consume the latest PR17 report. If medium-confidence "not product-owned"
   evidence is enough, reclassify seed `1020002`; otherwise run one focused
   browser/provider ownership diagnostic with runtime fingerprints and exact
   raw update capture. Require seed `1020002` to pass or be explicitly
   reclassified, then shape PR17 and add a verified branch link only if a
   product branch is still warranted.
8. Treat `5700084` as PR5C-covered plus strict oracle/exact-content drift. Do
   not name PR18A or PR5D from that seed. Source-reduce fresh strict-expansion
   residuals, including invalid/deprecated/parser-stress delete divergence such
   as seed `5200021`, before naming any PR18x branch.
9. Rebase or recreate each intended PR branch on the intended upstream base if
   that base moves.
10. Regenerate branch graph/containment evidence and adjacent
    range-diffs/diffstats from the actual filing repo.
11. Rerun focused checks, touched-file lint, and `git diff --check` on every
    imported/rebased branch.
12. Keep dirty analysis-only artifacts out of product PR branches.
13. Rebuild the combined stack from explicit PR01-PR06A heads, PR02A, PR6B as
    a sidecar, the existing PR07A-PR15C chain, the PR17 `1020002` decision, and
    any accepted source-reduced residual branches. Rerun bounded final-stack
    validation against the rebuilt stack and count it only if it reaches
    action-level product coverage and proves PR6B was included.
14. Block filing if new visible likely-real failures appear.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after the environment preflight is healthy. Do not
run broad/final-stack fuzz while the PR6B branch audit, the PR17 decision,
strict-expansion source reduction, rebuilt validation, and branch-link audits
are open. The latest trend packet reports `likely_real_max: 0`, this run's
non-empty `raw/novelty-status.md` reports `0` current actionable signatures and
`0` current likely-real visible failures, and the duplicate/noise evidence keeps
current noise classified as control-plane work. None of that is final-stack
fuzz validation or a filing unblocker.
