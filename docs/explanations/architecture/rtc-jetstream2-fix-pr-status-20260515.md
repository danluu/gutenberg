# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T03:11:28Z`

Trigger event:
`pr-split-2026-05-17T03-10-58Z-20260517T030103Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T03-10-58Z-20260517T030103Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked. The newest split-persona synthesis,
`pr-split-20260517T030103Z-synthesis.md`, keeps Cycle 224 as authoritative and
adds concrete gates that are not satisfied by waiting on PR17 alone: PR14 seed
`7110017` coverage, reload/post-save seed `5200005`, parser-sensitive seed
`1060015`, PR17 / seed `1020002`, rebuilt combined validation, focused
`1020002` rerun, and final-stack fuzz.

The current operational topology is:

```text
ready PR01 -> PR02, with PR02A as a PR02 sidecar
-> PR03 -> PR04 -> PR05A/B/C -> PR06 -> PR06A
-> PR6B minimal malformed outgoing RTC save payloads as a PR06A sidecar
-> PR07A/B -> PR09 -> PR10 -> PR11A-E -> PR12
-> PR13A/B0/B1/B2/B3 -> PR14
-> conditional PR14B only if seed 7110017 is not covered by PR14
-> PR15A/B/C
-> validation-only PR6B-minimal+PR15C integration head, not a product PR
-> PR17 seed 1020002 proof/reclassification or repair
-> reload/post-save residual gate for 5200005 and parser-sensitive 1060015
-> rebuilt combined validation stack
-> focused 1020002 gate
-> final-stack fuzz and filing
```

PR6B is no longer the old polluted sidecar and no longer a post-PR15C `PR16`
tail. Use the minimal product branch:

```text
ready/rtc-pr06b-malformed-save-request-payload-minimal
7b123e0ef2334a03b22e9a968d402de9da4c5379
```

That branch is based on PR06A, touches only
`packages/core-data/src/actions.js` and
`packages/core-data/src/test/actions.js`, and excludes `cc3d7bf663a` /
`crdt-blocks.ts`. It still has no GitHub `verified-content` branch-link audit
row, so PR6B remains `No verified branch link yet` in the proposed PR table.

Use this PR6B+PR15C head only as fetch-only validation evidence:

```text
validation/rtc-pr06b-minimal-plus-pr15c-sidecar-20260517T021111Z
243411d461698180088b5280587b2fb7ad0ba8cd
```

Do not file the old `ready/rtc-pr06b-malformed-save-request-payload` at
`87e0ed20ab8eafdb6a6e814400da20a658a7331d`, the old
`validation/rtc-pr06b-plus-pr15c-sidecar-20260517T004623Z` head at
`0662b838eaf0961605a95ecb1bd83bd4713e33d3`, raw malformed-save deferred heads,
or the old post-PR15C `PR16` tail. They are historical evidence only.

Cycle 224 also fixed a deferred-work loop regression. The completed
`rtc-cycle224-deferred-hard-deny-reexec-and-manifest-verify-20260517T025409Z`
job reported `rc=0`, killed the stale malformed-save deferred session,
invalidated the stale HTTP room-isolation relaunch for progress accounting,
restarted the deferred loop from the patched script, and wrote current-run
PR6B branch-audit and push-manifest artifacts. Jetstream must not push those
refs; the local machine may publish explicit manifest refs only after review.

The latest split-persona synthesis says the Cycle 224 residual reducer has now
produced a nonempty report with `rc=0`; "wait for reducer" is no longer a
useful next action. The next bounded work is PR14/seed `7110017` coverage,
generated `5200005` deterministic reduction, generated `1060015` parser-invalid
repro, and at most one focused PR17 browser/provider ownership diagnostic if
proof-based reclassification is not accepted. Do not start broad final-stack
fuzz until those gates are resolved or explicitly classified out.

PR17 remains separate. Current PR17 evidence says local single-module
Yjs/y-protocols replay does not reproduce seed `1020002`'s deletion and the
evidence is not product-owned. Decide whether that medium-confidence evidence
is enough to reclassify seed `1020002`; if not, run exactly one
browser/provider ownership diagnostic that captures runtime Yjs/module
identity, the raw update entering `applyUpdate`, and the emitted document
update. Do not fold `1020002` into PR6, PR13, PR15, PR6B, reload hydration,
pre-save search/live-collapse, HTTP room isolation, or rich-text suffix without
exact same-source proof.

The latest `raw/novelty-status.md` is empty, so it is not a current-monitor
override. The trend packet generated at `2026-05-17T03:03:34Z` reports
`likely_real_max: 1`, `duplicate_share_current_last: 0`,
`duplicate_share_historical_last: 0.3521`, `0` startup summary failures, and
`0` current quality issues. Treat this as current fuzz health evidence, not
final-stack validation.

## Branch And Ref Status

The remote status input was generated at `2026-05-17T03:11:23Z`.

The fix-planning repo is checked out at:

```text
## fix/rtc-fallback-group-delete-stale-local
d06e3528cbd Fix stale fallback group deletes
```

That checkout still has an untracked reload-hydration E2E gate spec:

```text
test/e2e/specs/editor/collaboration/websocket-only/collaboration-reload-hydration-empty-live-gate.spec.ts
```

Keep that spec out of PR 6, PR 6A, PR 8A, PR 15A/15B/15C,
fallback-group evidence, and final branch claims unless it is deliberately
copied into a clean evidence worktree.

The fuzz repo remains on the validation stack:

```text
## try/rtc-fix-stack-validation
72854f05ed2 Hydrate saved CRDT responses without invalidation
```

That stack has modified product/test files and many untracked fuzz, analysis,
and documentation artifacts. It is active validation infrastructure, not the
final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-17T03:11:28Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`.

For repaired PR13 content, these are the only current audited PR13 review refs:

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
branch-link audit or explicitly says `No verified branch link yet`.

The preferred PR13 shape is now the finer Cycle 118/224
`PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3` sequence. The current GitHub
audit does not yet have `verified-content` branch links for PR13B0/B1/B2/B3.
Until those refs are published and audited, the only audited PR13 fallback refs
are the repaired PR13A/B/C review refs listed above; do not claim they are the
finer split.

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified branch; keep in known-fix prefix |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified branch; keep in known-fix prefix |
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | 1 | +115 / -0 | local ready head exists per manifest work; publish/fetch/audit before filing |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; seed `5500002` marker-retention remains separate follow-up |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified branch; keep in known-fix prefix |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | 2 | +465 / -8 | replacement for old aggregate PR 5; local ready head still needs remote verified-content branch link |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | 2 | +925 / -42 | replacement for old aggregate PR 5; local ready head still needs remote verified-content branch link |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | +287 / -15 | seed `5700084` is PR5C-covered plus strict oracle/exact-content drift, not a new product PR |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified branch; excludes malformed-save restack and broader residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified branch; narrow persisted-body guard |
| PR 6B | Malformed outgoing RTC save request-payload guard, replacing old `87e0ed20ab8` with minimal branch `7b123e0ef233` after PR06A | No verified branch link yet | 2 | TBD | recommended PR06A sidecar; Cycle 222/224 evidence verifies local minimal branch and fetch-only PR6B+PR15C validation head, but no GitHub `verified-content` branch link exists yet |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified branch; repaired split head |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified branch stacked after PR 7A; scoped to saved-CRDT-response hydration, not broader reload/post-save residuals |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; keep in known-fix prefix |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified branch; start CRDT block stack |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | 2 | +257 / -3 | green in validation-stack rebuild; local ready head still needs remote verified-content branch link |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | 2 | +240 / -2 | green in validation-stack rebuild; local ready head still needs remote verified-content branch link |
| PR 11C | Explicit-base middle insert | No verified branch link yet | 2 | +220 / -0 | green in validation-stack rebuild; local ready head still needs remote verified-content branch link |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | 2 | +259 / -0 | green in validation-stack rebuild; local ready head still needs remote verified-content branch link |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | 2 | +170 / -0 | green in validation-stack rebuild; local ready head still needs remote verified-content branch link |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified branch; keep in known-fix prefix |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired audit link; first PR13 delta |
| PR 13B0 | Identity/provenance guard, moving stale block identity protection before source-retirement deltas | No verified branch link yet | 2 | +430 / -50 | preferred finer split from green Cycle 118/224 sequence; publish/fetch/audit before filing |
| PR 13B1 | Direct cross-parent source retirement | No verified branch link yet | 2 | +482 / -0 | preferred finer split; publish/fetch/audit before filing |
| PR 13B2 | Current-only cross-parent source retirement | No verified branch link yet | 2 | +410 / -0 | preferred finer split; publish/fetch/audit before filing |
| PR 13B3 | Explicit-base cross-parent source retirement | No verified branch link yet | 2 | +758 / -0 | preferred finer split; publish/fetch/audit before filing |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified branch; run bounded seed `7110017` coverage job before final filing |
| PR 14B | Stale-shorter query-array local suffix append, only if seed `7110017` is not covered by PR14 | No verified branch link yet | TBD | TBD | conditional only; create immediately after PR14 only if the focused PR14 coverage job fails |
| PR 15A | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 | +123 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 15B | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | 2 | +197 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 15C | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | 2 | +161 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 17 | Seed `1020002` WebSocket/Yjs proof, reclassification, or repair | No verified branch link yet | TBD | TBD | active final-stack blocker; latest report says local single-module replay does not reproduce the deletion and current evidence is not product-owned |
| PR 18x | Future strict-expansion or focused-shard residuals only if source-reduced to uncovered product behavior | No verified branch link yet | TBD | TBD | no current product PR; seed `5700084` is PR5C/oracle drift, and newer parser/reload residuals need source reduction before any PR18x branch is named |

Verified branches that are prior art or staging only:

- [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence)
  is verified content for old aggregate PR 5, not the recommended
  maintainer-facing split.
- [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record)
  is verified content for old broad PR 8, not an active filing unit.
- [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops)
  is verified content for old aggregate PR 11, but the active recommendation
  is the PR11A-E split.
- [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement)
  and [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard)
  are repaired audited fallback PR13 links, not verified links for the finer
  PR13B0/B1/B2/B3 sequence.

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-17T03:11:23Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T031038Z
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
stack because PR02A, PR5A/B/C, PR11A-E, PR6B, and the finer PR13B0-B3 rows still
need verified branch links, PR14 may need a conditional PR14B, PR17 still needs
a repair/reclassification decision, and the rebuilt validation stack has not
been rerun over those final decisions.

The collected `raw/novelty-status.md` is zero bytes in this update, so it is
not a usable current-monitor override. Use the trend evidence packet and the
latest persona reports as the active fuzz summary until the next nonempty
monitor snapshot is collected.

The latest trend evidence packet was generated at `2026-05-17T03:03:34Z` from
monitor data through `2026-05-17T03:01:12Z`:

```text
monitor passes: 1812
coverage files: 272 -> 38874
coverage files delta: 38602
unmet coverage goals: 24 -> 5
likely_real_max: 1
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3521
summary_startup_failures_last: 0
quality_issues_last: 0
enabled groups: novelty-ws-real-user-editing
fuzz level mix: browser-e2e=26 lanes/26 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 3095286
browser-e2e execution: 95365 cumulative / 196 per-hour
unit-property execution: 2680588 cumulative / 28896 per-hour
coverage-guided-lower-level execution: 316327 cumulative / 5632 per-hour
load1/load5/load15: 66.74 / 174.79 / 193.55 on 64 cores
memory: 423.1G free
```

Largest remaining coverage gaps in the trend evidence are
`ui-heading-shortcut` `718/1000`, `reload-post-action` `724/1000`,
title-save-reload `286/500`, body-save-reload `345/500`, and successful
real-user-editing records `425/500`.

The trend packet shows a current likely-real maximum but does not provide a
nonempty raw novelty record in this collection. Treat that as an open
classification input, not final-stack validation. Historical duplicate/noise
remains a separate control-plane concern and must not be presented as current
product failure.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T030103Z-synthesis.md`. It says the split has changed and
Cycle 224 is authoritative: PR6B is the minimal two-file PR06A sidecar at
`7b123e0ef233`, the old PR6B/PR16 path is historical, PR6B-minimal+PR15C at
`243411d46169` is validation-only, and final stack filing is blocked by PR17,
PR14/`7110017`, `5200005`, `1060015`, rebuilt validation, focused `1020002`,
and final-stack fuzz.

That synthesis also says the Cycle 224 residual reducer report now exists and
generated focused next-action prompts. The next actions are bounded:

- run `rtc-pr14-query-array-local-suffix-7110017-compare`;
- run the generated `next-action-5200005-product-reduce.prompt.md`;
- run the generated `next-action-1060015-parser-invalid-repro.prompt.md`;
- run at most one focused `1020002` browser/provider ownership diagnostic if
  proof-based reclassification is not accepted.

Do not start broad/final-stack fuzz until PR14 coverage, `5200005`, `1060015`,
and PR17 are resolved or explicitly classified out.

The latest nonempty PR-split feedback action,
`pr-split-20260517T024253Z-feedback-action.md`, applied Cycle 224 feedback. It
reaffirmed PR6B minimal as authoritative, patched and restarted the
deferred-work loop so malformed-save and HTTP stay hard-denied, invalidated the
stale malformed-save and HTTP deferred launches, wrote fresh Cycle 224 PR6B
branch audit and push manifest artifacts, completed
`rtc-cycle224-deferred-hard-deny-reexec-and-manifest-verify-20260517T025409Z`
with `rc=0`, and launched the bounded `5200005` / `1060015` reducer that the
newest synthesis now treats as completed enough to move to next-action prompts.

The newest duplicate/noise synthesis is
`duplicate-noise-20260517T024456Z-synthesis.md`. It keeps duplicate/noise in
the fuzz control-plane lane, not product validation. Consensus is that strict
startup filters mostly exist in consumers, but duplicate/noise knowledge is
too local, so noisy current-run producer groups and sibling run dirs can keep
feeding triage/analysis. The smallest safe next fix is a narrow current-run
known-noise producer/run-dir gate that preserves product-evidence signatures;
do not add blanket family suppression and do not suppress current
`collaboration_non_convergence` or records with action/reload/save/revision,
fault, or operation-witness evidence.

The latest implemented duplicate/noise patch remains the
`duplicate-noise-20260517T020802Z-*` feedback action. It updated
`bin/rtc-browser-fuzz-triage-watcher.mjs`,
`bin/rtc-browser-fuzz-novelty-monitor.mjs`,
`bin/rtc-browser-fuzz-analysis-tier.mjs`, and
`bin/rtc-browser-fuzz-deep-analysis-tier.mjs` in the remote fuzz repo. The
changes coalesce same seed/source candidates, prefer product-evidence or
artifact-rich candidates, count completed analysis/deep-analysis `likely_real`
JSON in novelty summaries, and keep inactive/no-product completed jobs out of
family caps unless they have visible `likely_real` results.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful only for report
hygiene: separate current fuzz health from historical noise, keep
evidence-only families out of the split, and make filing gates explicit. Their
older "keep existing split", "do not add PR6B", "only novelty-http is enabled",
and stale PR13 review-ref warnings are superseded by the
`2026-05-17T03:11:28Z` branch-link audit, the current empty raw novelty status,
the latest trend packet, and the Cycle 224 split syntheses.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Malformed-save request-payload PR6B | Old `ready/rtc-pr06b-malformed-save-request-payload` at `87e0ed20ab8`; minimal replacement `ready/rtc-pr06b-malformed-save-request-payload-minimal` at `7b123e0ef233`; validation-only `validation/rtc-pr06b-minimal-plus-pr15c-sidecar-20260517T021111Z` at `243411d46169`; old validation-only head `validation/rtc-pr06b-plus-pr15c-sidecar-20260517T004623Z` at `0662b838eaf0961605a95ecb1bd83bd4713e33d3`; Cycle 224 audit/manifest artifacts | active recommended topology after PR6A as an explicit sidecar; local finalization verified adjacency, containment, `cc3d7bf663a` / `crdt-blocks.ts` exclusion, `git diff --check`, and `node --check`; no current GitHub `verified-content` branch-link audit row exists | Publish/fetch the minimal PR6B product branch to a GitHub review ref, regenerate branch-link audit and push manifest from fetched refs, run missing focused tests/lint/formatting, keep `243411d46169` fetch-only, decide PR17, then rebuild combined validation including PR6B |
| PR13 finer split | `final/rtc-pr13b0-identity-provenance-guard`, `final/rtc-pr13b1-direct-source-retirement-green`, `final/rtc-pr13b2-current-only-source-retirement-green`, `final/rtc-pr13b3-explicit-base-source-retirement-green` in the raw split history; repaired audited fallback refs PR13A/B/C on GitHub | preferred reviewability split is PR13A/B0/B1/B2/B3, but only repaired PR13A/B/C fallback links are verified in the current branch-link audit | Publish/fetch/audit PR13B0/B1/B2/B3 before claiming them as maintainer-facing links; otherwise use only repaired PR13A/B/C fallback refs |
| PR14 seed `7110017` coverage | stale-shorter query-array local suffix append coverage question | unresolved coverage gate, not yet a product branch | Run bounded `rtc-pr14-query-array-local-suffix-7110017-compare`; create PR14B immediately after PR14 only if PR14 fails the focused test |
| Reload/post-save `5200005` | generated `next-action-5200005-product-reduce.prompt.md`; previous reload/post-save replay lane | residual reducer report now exists; still no product branch assignment | Run the generated deterministic reducer to classify marker retirement vs reload/post-reload edit/delete product ownership before any branch |
| Parser-sensitive seed `1060015` | `f3f7e9990751` / seed `1060015`; generated `next-action-1060015-parser-invalid-repro.prompt.md` | unassigned evidence; do not assign to PR05, PR07B, PR13, PR15, PR17, or PR18 before focused repro | Run parser-invalid repro with clean-content control; only create a PR05-near branch after invalid-content failure with clean control |
| Seed `1020002` WebSocket marker divergence | marker-bearing relay/page-1 evidence plus latest PR17 report saying local single-module Yjs replay does not reproduce the deletion and current evidence is not product-owned | active PR17/final-stack blocker; no verified filing branch exists | Accept proof-based reclassification or run one browser/provider ownership diagnostic with runtime fingerprints and exact raw update capture; then repair, reclassify, or defer |
| Seed `5700084` strict linebreak divergence | live `core/verse.attributes.content` `\n` vs `<br>` comparison | no product PR and no active PR18x row; classified as PR5C-covered plus strict oracle/exact-content drift | Downscope/update the strict oracle; do not create PR18A or PR5D for this seed |
| Fresh strict-expansion and focused-shard residuals | invalid/deprecated/parser-stress delete divergence such as seed `5200021`; nested/move/delete focused-shard residual clusters | source-reduction input only; no current PR18x branch and no verified branch link | Source-reduce and compare against PR5, PR11, PR13, PR14, PR15, PR17, and existing parser/oracle coverage before naming any PR18x product branch |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit and not in Cycle 224 topology | Shape and audit a narrowed title-reload branch only if PR8A is revived |
| Reload hydration empty live editor / broader reload-post-save sync loss | `deferred/rtc-reload-hydration-20260517T010615Z`, prior replay seeds `5300002`, `5700013`, `5200005`, `5200009`, and `6000004` or `6000005` | evidence-only; not in PR 6, PR 6A, PR 8A, PR 15, or fallback-group claims | Promote only with clean replay, command evidence, live editor state, REST body, persisted `_crdt_document`, provider phase, provider-synced skip path, and update/application witnesses |
| Pre-save search/live document collapse | latest deferred row `20260516T233555Z` plus prior pre-save search/live-collapse candidate rows | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Rich-text formatted suffix corruption | current diagnostic publication candidate `20260516T235057Z` plus prior `deferred/rtc-rich-text-formatted-suffix-20260516T230547Z` | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Broader HTTP polling room-isolation residuals | PR02A local ready head; stale deferred job `rtc-deferred-job-http-room-isolation-20260517T023739Z` | PR02A remains in the known-fix prefix but has no verified branch link; broader residuals stay deferred; Cycle 224 invalidated stale generic HTTP relaunches | Publish/fetch/audit a PR02A review branch before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack blockers; no automatic PR slot | Triage only after `1020002` is repaired or reclassified and the rebuilt stack is available |
| Duplicate/noise control-plane leak | latest synthesis `duplicate-noise-20260517T024456Z-synthesis.md`; implemented action `duplicate-noise-20260517T020802Z-*` | control-plane issue, not product validation; current duplicate share is `0`, historical duplicate share is about `0.3521`, and raw novelty is empty | Continue only bounded current-run known-noise producer/run-dir gating, preserving all product-evidence failures and keeping product PR validation separate |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr` branches as-is.

Before filing any maintainer-facing PR:

1. Verify environment health first. A disk-preflight-only report, zero-byte
   report, missing rc file, stale active session, stderr growth, lock holder,
   `report.tmp`, or "job launched" alone is not durable progress while
   actionable Parallel Progress Gate rows remain.
2. Use the explicit ready prefix. Do not wildcard import or file
   `final/rtc-pr*`, validation-stack branches, deferred branches, or dirty
   evidence branches.
3. Keep old aggregate PR 5, broad PR 8, aggregate PR 11, stale/misordered
   PR13 refs, old PR6B/PR16 material, PR6C, dirty evidence branches, and the
   untracked reload-hydration gate spec out of filing branches and push
   allow-lists.
4. Publish/fetch and audit PR02A, PR5A/B/C, PR11A-E, PR6B minimal, and
   PR13B0/B1/B2/B3 before treating them as maintainer-facing links. Until then,
   keep rows marked `No verified branch link yet` and use only repaired PR13A/B/C
   fallback links from the audit.
5. Finish PR6B publication and branch-link verification before filing. Require
   a clean GitHub review ref, sidecar manifest/validation evidence, any missing
   focused tests, lint, formatting, build, seed replay evidence, branch audit,
   explicit inclusion beside the existing PR15C chain, and a verified branch
   link before filing it.
6. Run the bounded PR14 seed `7110017` coverage job. If PR14 does not cover
   stale-shorter query-array local suffix append, create PR14B immediately after
   PR14 and require a verified branch link before filing that row.
7. Consume the latest PR17 report. If medium-confidence "not product-owned"
   evidence is enough, reclassify seed `1020002`; otherwise run one focused
   browser/provider ownership diagnostic with runtime fingerprints and exact raw
   update capture. Add a verified PR17 branch link only if a product branch is
   still warranted.
8. Run the generated `5200005` and `1060015` next actions before assigning those
   signals to PR05, PR07B, PR13, PR15, PR17, PR18, or a new reload/post-save PR.
9. Treat `5700084` as PR5C-covered plus strict oracle/exact-content drift. Do
   not name PR18A or PR5D from that seed. Source-reduce fresh strict-expansion
   residuals before naming any PR18x branch.
10. Rebase or recreate each intended PR branch on the intended upstream base if
    that base moves.
11. Regenerate branch graph/containment evidence and adjacent
    range-diffs/diffstats from the actual filing repo.
12. Rerun focused checks, touched-file lint, and `git diff --check` on every
    imported/rebased branch.
13. Keep dirty analysis-only artifacts out of product PR branches.
14. Rebuild the combined stack from explicit PR01-PR06A heads, PR02A, PR6B as
    a sidecar, PR07A-PR15C, the PR13 finer split or audited fallback decision,
    PR14B if needed, the PR17 `1020002` decision, and any accepted
    source-reduced residual branches. Rerun bounded final-stack validation
    against the rebuilt stack and count it only if it reaches action-level
    product coverage and proves PR6B was included.
15. Block filing while the latest trend packet's current likely-real signal is
    unclassified, and block again if any additional visible likely-real failures
    appear. This collection's `raw/novelty-status.md` is empty, so do not claim
    a named current signal without a fresh nonempty monitor snapshot.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after the environment preflight is healthy. Do not
run broad/final-stack fuzz while PR14 coverage, PR6B GitHub branch link, PR13
finer branch links or fallback decision, the PR17 decision, the `5200005` and
`1060015` evidence gates, rebuilt validation, and branch-link audits are open.
None of the current trend, duplicate/noise, or residual-reducer evidence is
final-stack fuzz validation or a filing unblocker.
