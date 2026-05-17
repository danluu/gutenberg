# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T01:09:54Z`

Trigger event:
`pr-split-2026-05-17T01-06-53Z-20260517T005833Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T01-06-53Z-20260517T005833Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked. The latest split-persona synthesis,
`pr-split-20260517T005833Z-synthesis.md`, keeps the Cycle 214 topology:
PR6B is canonical, but it is a PR06A sidecar, not a linear base for
PR07A-PR15C and not a default PR16 tail. The PR07A restack hit a real conflict
in `packages/core-data/src/test/actions.js`, so PR07A-PR15C stay on the
existing PR06A-based chain while final validation must prove both PR6B and
PR15C are included. PR6B sidecar integration evidence now exists, but no
`verified-content` branch-link audit row exists for PR6B yet.

PR17 remains the final-stack blocker, but the status changed: the active PR17
job now has a nonempty report saying local single-module Yjs replay does not
reproduce the deletion and the current evidence is not product-owned. The next
PR17 decision is whether that medium-confidence evidence is enough to
reclassify seed `1020002`; if not, run one browser/provider ownership
diagnostic before shaping a product branch. "Wait for active PR17" is no
longer enough progress by itself.

The current maintainer-facing recommendation is:

```text
ready PR01 -> PR02 -> PR02A -> PR03 -> PR04 -> PR05A/B/C
-> PR06 -> PR06A
-> PR6B malformed outgoing RTC save payloads as an explicit PR06A sidecar
-> PR07A/B -> PR09 -> PR10
-> PR11A-E -> PR12
-> PR13A/B/C using the repaired audited review refs until any finer PR13
   split has verified branch links
-> PR14 -> PR15A/B/C
-> validation-only PR6B+PR15C integration head, not a product PR
-> PR17 seed 1020002 proof/reclassification/repair decision
-> rebuilt combined validation stack
-> focused 1020002 gate
-> final-stack fuzz and filing
```

The ready heads remain a known-fix prefix, not a complete filing stack. The
new PR6B source is `ready/rtc-pr06b-malformed-save-request-payload` at
`87e0ed20ab8`, after `ready/rtc-pr06a-persisted-empty-content-guard`. It still
has no `verified-content` branch-link audit row in this update, so the report
must not present it as a fileable GitHub review branch yet. The current sidecar
integration job has produced useful validation evidence:
`validation/rtc-pr06b-plus-pr15c-sidecar-20260517T004623Z` at
`0662b838eaf0961605a95ecb1bd83bd4713e33d3`, with both PR6B and PR15C
ancestry checks passing. That head is validation-only and must not be filed as
product content. The latest persona synthesis now refers to the
PR6B+PR15C validation report as available evidence, but the filing gate still
needs a refreshed PR6B-inclusive push manifest, branch audit, verified PR6B
branch link, and rebuilt combined validation after the PR17 decision.

Do not file `deferred/rtc-malformed-save-payload-20260516T230550Z` or
`deferred/rtc-malformed-save-payload-20260516T235059Z` as-is. They are useful
request-payload evidence on the validation/deferred base, but PR6B publication
must come from only these two request-payload commits:

```text
8340c5d794a Avoid valid block originalContent in CRDT saves
008b7258fe4 Protect RTC saves from malformed evaluated content
```

The previous deterministic restack audit, conflict-resolution work, and blind
linear-restack plan are now superseded by the PR6B ready ref plus explicit
sidecar topology, unless that topology proves unusable. Broader malformed
post-save settlement residuals and sidecar seed `7410076` stay deferred.

PR17 remains separate from PR6, PR13, PR15, PR16, reload hydration, pre-save
search/live-collapse, HTTP room isolation, and rich-text suffix work. Current
evidence still says the marker-bearing update reaches the relay/page 1 while
page 0 applies the remote client range as deleted, but the newest PR17 report
points away from product-owned single-module Yjs apply behavior and toward
browser/provider runtime ownership or reclassification.

Seed `5700084` is no longer a product PR candidate. The latest comparison
classifies it as PR5C-covered plus strict oracle/exact-content drift, not
PR18A or PR5D. Keep strict-expansion rows as source-reduction evidence only
until they are source-reduced to uncovered product behavior.

The latest duplicate/noise synthesis and action report,
`duplicate-noise-20260517T003444Z-synthesis.md` and
`duplicate-noise-20260517T003444Z-feedback-action.md`, identify the remaining
noise as a fuzz control-plane scoping issue, not product validation. The action
implemented active-supervisor current-run scoping in novelty/live analysis,
marked inactive generation triage sources stale, restarted the coverage-guided
novelty/live-analysis sessions, and reported post-action current scope
`supervisor-active-run-dirs` with `0` actionable signatures. The collected raw
novelty snapshot for this update moved to the new coverage root
`run-20260517T010509Z`; it has `0` current actionable signatures and `0`
visible likely-real failures, but also warns that no behavioral coverage files
were found under the new output directory yet. Do not launch broad final-stack
fuzz or file PRs yet. Final filing still waits on PR6B publish/branch audit,
PR17 repair or reclassification, rebuilt combined validation, a focused
`1020002` gate, and final-stack fuzz over the rebuilt stack.

## Branch And Ref Status

The remote status input was generated at `2026-05-17T01:09:47Z`.

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

The branch-link audit was generated at `2026-05-17T01:09:54Z` from fetched
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
branch-link audit or explicitly says `No verified branch link yet`. Earlier
split notes mention a finer local PR13A/B0/B1/B2/B3 shape, but this audit only
verifies the repaired PR13A/B/C review refs, so those remain the
maintainer-facing links in this report.

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
| PR 6B | Malformed outgoing RTC save request-payload guard from `ready/rtc-pr06b-malformed-save-request-payload` at `87e0ed20ab8` | No verified branch link yet | TBD | TBD | promoted after PR6A and treated as an explicit sidecar by `pr-split-20260517T005833Z-synthesis.md`; validation-only head `validation/rtc-pr06b-plus-pr15c-sidecar-20260517T004623Z` proves PR6B and PR15C ancestry, but filing still needs a verified branch link, refreshed PR6B-inclusive manifest/audit evidence, the PR17 decision, and rebuilt validation over the final stack |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified branch; repaired split head |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified branch stacked after PR 7A |
| PR 8A | Narrow title reload replacement | No verified branch link yet | TBD | TBD | not in the current `20260517T005833Z` topology; broad verified PR 8 is prior art only, and any PR8A revival needs a shaped and audited branch |
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
| PR 17 | Seed `1020002` WebSocket/Yjs proof, reclassification, or repair | No verified branch link yet | TBD | TBD | active final-stack blocker; latest nonempty report says local single-module Yjs replay does not reproduce the deletion and current evidence is not product-owned, so decide whether to reclassify or run one browser/provider ownership diagnostic before shaping a product branch |

Verified branches that are prior art or staging only:

- [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence)
  is verified content for old aggregate PR 5, not the recommended
  maintainer-facing split.
- [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record)
  is verified content for old broad PR 8, not an active filing unit.
- [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops)
  is verified content for old aggregate PR 11, but the active recommendation
  is the PR11A-E split.

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-17T01:09:47Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T010509Z
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
updated at `2026-05-17T01:07:15.900Z` and reports current-output-dir-only
triage with `0` actionable signatures, `0` raw signatures, and `0`
likely-real visible. It saw `37,689` coverage files and `57,860` total
records, with `load1: 52.70 / 64 cores`, `437.3G` free memory, and headroom
for adding groups. Treat this as current health/control-plane evidence, not
product validation.

The active coverage root is now `run-20260517T010509Z`. Current-run record
breakdowns are empty because the novelty monitor had just moved roots and
reported no behavioral coverage files under the new output directory yet. The
enabled groups are `novelty-ws-lifecycle`, `novelty-ws-real-user-editing`,
`novelty-ws-real-user-rich-text`, and `novelty-http-persistence-probe`; no
groups are paused.

The same novelty status records the `2026-05-17T00:53:51Z`,
`2026-05-17T00:58:20Z`, and `2026-05-17T01:03:15Z` holds on
open-ended coverage-guidance Codex because historical raw
`pre_action_bootstrap_stall` noise dominated observed triage
(`13,828/26,817`, share `0.5156` at the latest hold). The historical aggregate
still shows `13,828` raw `pre_action_bootstrap_stall` signatures and combined
raw duplicate share around `0.5146`. That hold is a control-plane safeguard;
it does not change the maintainer-facing PR split.

The latest trend evidence packet was generated at `2026-05-17T01:01:46Z` from
monitor data through `2026-05-17T00:58:21Z`:

```text
monitor passes: 1779
coverage files: 272 -> 37549
coverage files delta: 37277
unmet coverage goals: 24 -> 6
likely_real_max: 0
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3526
summary_startup_failures_last: 0
quality_issues_last: 1
fuzz level mix: browser-e2e=27 lanes/27 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 2669073
browser-e2e execution: 93143 cumulative / 88 per-hour
unit-property execution: 2319388 cumulative / 19264 per-hour
coverage-guided-lower-level execution: 253536 cumulative / 3072 per-hour
load1/load5/load15: 66.58 / 112.54 / 129.42 on 64 cores
memory: 423G free
```

The trend packet lists only the two real-user groups as enabled:

```text
novelty-ws-real-user-editing
novelty-ws-real-user-rich-text
```

Largest remaining coverage gaps in the trend evidence are `reload-post-action`
`646/1000`, `ui-heading-shortcut` `667/1000`, title-save-reload `239/500`,
body-save-reload `298/500`, successful real-user-editing records `369/500`,
and `ui-format-paragraph` `947/1000`. The raw novelty snapshot one pass later
has `reload-post-action` at `657/1000`, `ui-heading-shortcut` at `672/1000`,
title-save-reload at `244/500`, body-save-reload at `303/500`, successful
real-user-editing records at `377/500`, and `ui-format-paragraph` at
`952/1000`.

The `0` likely-real trend result and the raw novelty `0` current likely-real
visible count are useful health evidence, not final-stack validation and not
filing unblockers. Historical duplicate/noise remains a separate control-plane
concern and must not be presented as current product failure; the duplicate/noise
action report says active-supervisor scoping now drives current-run policy.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T005833Z-synthesis.md`. Its feedback-action file is zero
bytes, so the useful update is the synthesis itself. It keeps malformed
outgoing RTC save payloads as concrete PR6B after PR6A, and keeps the
Cycle 212 linear PR6B hypothesis replaced by explicit sidecar topology because
PR07A restack hit a real conflict:

- use `ready/rtc-pr06b-malformed-save-request-payload` at `87e0ed20ab8` after
  `ready/rtc-pr06a-persisted-empty-content-guard`;
- keep the existing PR07A-PR15C chain based on PR06A instead of forcing it to
  restack over PR6B;
- require final/integration validation to explicitly contain both PR6B and the
  existing PR15C chain, including both `merge-base --is-ancestor` checks, branch
  graph, containment, range-diff, diffstat/numstat, audit, and push manifest
  evidence proving PR6B was not omitted;
- do not file `deferred/rtc-malformed-save-payload-20260516T230550Z` or
  `deferred/rtc-malformed-save-payload-20260516T235059Z` as-is;
- treat the late default PR16 malformed-save slot as superseded unless PR6B
  import or rebuilt combined validation fails;
- keep PR17 separate. The latest PR17 report says local single-module Yjs
  replay does not reproduce the deletion and current evidence is not
  product-owned; create a product branch only if browser/provider diagnostics
  prove WordPress-owned deletion, otherwise reclassify or defer;
- leave PR8A out of the current topology unless a narrow title-reload branch is
  later shaped and audited;
- keep pre-save search/live-collapse and rich-text suffix diagnostic/deferred;
  reload hydration has a product candidate slice, but broader same-user/stale-tab
  reload claims still need replay evidence;
- keep HTTP pointed at `ready/rtc-pr02a-http-room-isolation-regression`; do not
  add a new HTTP product PR without fresh healthy-user evidence.

The Cycle 212 PR6B topology job remains the named PR6B topology artifact:

```text
runs/20260517T001709Z/jobs/run-rtc-pr06b-linear-restack-and-manifest-20260517T002555Z.sh
runs/20260517T001709Z/jobs/outputs/rtc-pr06b-linear-restack-and-manifest-20260517T002555Z/report.md
```

The latest split synthesis says not to launch another blind linear restack.
It records progress from the bounded PR6B sidecar integration lane:
`validation/rtc-pr06b-plus-pr15c-sidecar-20260517T004623Z` exists at
`0662b838eaf0961605a95ecb1bd83bd4713e33d3`, and both PR6B and PR15C ancestry
checks pass. That is not enough to file: the branch audit still lacks a PR6B
`verified-content` row, and rebuilt combined validation must wait for the PR17
repair/reclassification decision. Keep PR6B marked `No verified branch link
yet` until the GitHub branch-link audit contains a `verified-content` row for
it.

The latest split synthesis says the useful next work is not waiting:
refresh/import manifests, replay the reload-hydration candidate on seeds
`5300002` and `5700013`, and enforce the Parallel Progress Gate so active
`1020002`, stderr growth, `report.tmp`, zero-byte reports, stale manifests,
lock holders, prompt files, and run scripts do not count as progress. It
recommends exactly one bounded non-broad job:
`rtc-prsplit-cycle216-manifest-import-refresh-and-reload-replay`. Do not
launch broad final-stack fuzz, extra browser lanes, or another open-ended
coverage Codex job from this state. Launch the focused PR17
browser/provider runtime diagnostic only if the existing PR17 report is not
accepted as sufficient reclassification evidence.

The newest duplicate/noise synthesis and action report,
`duplicate-noise-20260517T003444Z-synthesis.md` and
`duplicate-noise-20260517T003444Z-feedback-action.md`, are non-empty. They
converge on a current-run scoping bug in the fuzz control plane: novelty policy
could scan the whole coverage output root, so inactive generation triage states
could count as current and continue driving duplicate/noise policy or analysis
launches. The action report says active-supervisor scoping is now implemented
for novelty/live analysis, inactive generation source signatures are marked
`stale-source`, `node --check` passed for the five changed `.mjs` files, a
live-analysis `--once` reconciliation ran, novelty/live-analysis sessions were
restarted, and post-action current triage had roots/files `2/2`, actionable
signatures `0`, top duplicate family share `0`, and `7` inactive queued
signatures marked stale-source. The secondary `uncertain` summary-record
duplication should be handled only after the active-scope fix validates. Do not
broadly suppress product-evidence timeout or non-convergence failures.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older
"keep existing split", "do not add PR6B", "only novelty-http is enabled", and
stale PR13 review-ref warnings are superseded by the
`2026-05-17T01:09:54Z` branch-link audit, the current novelty status, and the
`20260517T005833Z` split synthesis.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Malformed-save request-payload PR6B | `ready/rtc-pr06b-malformed-save-request-payload` at `87e0ed20ab8`; sidecar topology report path `runs/20260517T001709Z/jobs/outputs/rtc-pr06b-linear-restack-and-manifest-20260517T002555Z/report.md`; validation-only head `validation/rtc-pr06b-plus-pr15c-sidecar-20260517T004623Z` at `0662b838eaf0961605a95ecb1bd83bd4713e33d3`; evidence heads `deferred/rtc-malformed-save-payload-20260516T230550Z` and `deferred/rtc-malformed-save-payload-20260516T235059Z`; commits `8340c5d794a`, `008b7258fe4` | active recommended PR after PR6A as an explicit sidecar; no current `verified-content` branch-link audit row; both PR6B and PR15C ancestry checks pass in the validation-only head, but deferred heads remain evidence-only | Refresh/publish the PR6B-inclusive manifest/audit, add a verified branch link, decide PR17, and rebuild combined validation so it explicitly includes both PR6B and the existing PR15C chain |
| Malformed post-save settlement residuals and sidecar | `f51c425df8a5`, `f46859898576`, `7410076` | deferred/evidence-only; not part of PR6B or PR16 unless separately source-proven | Keep source-reducing; promote only with clean local source evidence and a verified branch link |
| Seed `1020002` WebSocket marker divergence | marker-bearing relay/page-1 evidence plus latest nonempty PR17 report saying local single-module Yjs replay does not reproduce the deletion and current evidence is not product-owned | active PR17/final-stack blocker; no verified filing branch exists | Decide whether the report is enough to reclassify. If not, run one browser/provider ownership diagnostic with runtime fingerprints and exact raw update capture; then repair, reclassify, or defer |
| Seed `5700084` strict linebreak divergence | live `core/verse.attributes.content` `\n` vs `<br>` comparison | no product PR and no active PR18x row; classified as PR5C-covered plus strict oracle/exact-content drift | Downscope/update the strict oracle; do not create PR18A or PR5D for this seed |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit and not in the current `20260517T005833Z` topology | Shape and audit a narrowed title-reload branch only if PR 8A is revived |
| Reload hydration empty live editor | latest deferred row `20260516T233554Z` plus prior reload-hydration candidates and gate branches | evidence-only; not in PR 6, PR 6A, PR 8A, PR 15, or fallback-group claims | Promote only if a clean gate reaches the post-reload assertion and live editor state stays empty after exact-room WebSocket sync while REST body and persisted `_crdt_document` remain populated |
| Pre-save search/live document collapse | latest deferred row `20260516T233555Z` plus prior pre-save search/live-collapse candidate rows | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Rich-text formatted suffix corruption | current diagnostic publication candidate `20260516T235057Z` plus prior `deferred/rtc-rich-text-formatted-suffix-20260516T230547Z` | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Broader HTTP polling room-isolation residuals | HTTP downscope row `20260516T232052Z`; PR02A has no verified branch link yet | PR02A remains in the known-fix prefix and points back to `ready/rtc-pr02a-http-room-isolation-regression`, but broader residuals stay deferred | Publish/fetch/audit a PR02A review branch before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack blockers; no automatic PR slot | Triage only after `1020002` is repaired or reclassified and the rebuilt stack is available |
| Duplicate/noise control-plane leak | latest synthesis/action `duplicate-noise-20260517T003444Z-synthesis.md` and `duplicate-noise-20260517T003444Z-feedback-action.md`; active root now `run-20260517T010509Z`; action artifacts `artifacts/cycle-88-control-plane.patch` and `artifacts/cycle-88-status.md` | control-plane issue, not product validation; active-supervisor scoping is implemented, latest raw novelty has `0` current actionable signatures and `0` likely-real visible, and it warns that the new output dir has no behavioral coverage files yet | Keep monitoring under active-supervisor scoping, then address duplicate `uncertain` summary intake only if it persists without hiding product-evidence signatures |

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
   not name PR18A or PR5D from that seed.
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
rebuilt validation, and branch-link audits are open. The latest trend packet
reports `likely_real_max: 0`, this run's non-empty `raw/novelty-status.md`
reports `0` current actionable signatures and `0` current likely-real visible
failures, and the duplicate/noise action report records post-action
active-supervisor scoping with `0` actionable signatures. None of that is
final-stack fuzz validation or a filing unblocker.
