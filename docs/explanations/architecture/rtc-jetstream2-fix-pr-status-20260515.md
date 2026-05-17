# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T19:02:24Z`

Trigger event:
`pr-split-2026-05-17T18-47-31Z-20260517T183858Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T18-47-31Z-20260517T183858Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing, pushing/opening GitHub PRs, broad final-stack fuzzing, and stack-wide
validation remain blocked. The publication-shape blocker moved again: Cycle 290
is still rejected because it audits `PR01` against `origin/trunk` as a
`1048`-file diff, and Cycle 292 is now prior evidence rather than the current
publication instruction. The latest split-persona evidence says Cycle 293
supersedes the old Cycle 292 state, but the Cycle 293 refs are only
review-shaped, not filing-cleared. The `2026-05-17T18:36Z` /
`2026-05-17T18:40Z` publication artifacts also predate the
`2026-05-17T18:45Z` deferred queue, so the stale-publication rule applies.
Before filing or broad validation, run a fresh non-Docker Cycle 293
manifest/bundle/head audit with nonempty `branch-audit.tsv`,
`push-manifest.tsv`, `manifest-age.tsv`, `base-sanity.tsv`,
`bundle-manifest-agreement.tsv`, and `artifact-verification.tsv`.

The execution blocker is also active again. The collection pass found remote
`/` effectively full, below the `2048` MB replay threshold, so Docker/wp-env and
browser replay work need root-space recovery first. PR07 replay still has only
setup-gated evidence: the durable Cycle 288 outputs stopped before the seeded
action/reload/checkpoint flow at the collaboration-readiness gate with
`collaborationEnabled=null`. Seed `1020002` only blocks final-stack fuzzing,
filing, and rebuilt full-stack validation; it must not serialize branch audit,
PR07 runtime repair, PR05/PR11 shaping, sidecar work, deferred audits, or loop
repair.

```text
PR01 -> PR02 (+ PR02A sidecar)
-> PR03 -> PR04 -> PR05A -> PR05B -> PR05C -> PR05D
-> PR06 -> PR06A -> PR07A -> PR07B0 -> PR07B1
-> PR09 -> PR10 -> PR11A-E -> PR12
-> PR13A/B0/B1/B2/B3 -> PR14 -> PR14B
-> PR15A/B/C-on-PR14B
```

Current sidecars and runtime-gated work:

```text
PR02A after PR02: HTTP room-isolation regression
PR03B after PR03: browser restoreRevision CRDT invalidation, held/runtime-gated
PR06B after PR07B1: repaired malformed-save request-payload sidecar
PR07C after PR07B1: reload record snapshots
validation heads: fetch-only evidence, not product PR links
```

Split details:

- `PR01` still has a verified branch-link-audit row against
  `review/rtc-shared-base-20260515`. Cycle 292 proved the accepted PR01 shape
  is a two-file HTTP polling range and explicitly rejected the origin-trunk
  1048-file range, but the latest persona pass says Cycle 293 supersedes that
  state and still needs a fresh manifest/bundle/head audit before it can be used
  as current publication evidence.
- `PR07B0` is saved CRDT response hydration, represented by `e746c32e3f9` and
  deferred evidence commit `72854f05ed2`.
- `PR07B1` is stale base-record/title filtering, represented by current
  `4bdd9465a97`.
- The existing audited `review/rtc-pr07b-save-response-manager-base-record`
  branch is now prior art for the old opaque `PR07B`, not a replacement for
  audited `PR07B0` / `PR07B1` filing branches.

Do not add `PR07D`, `PR17`, `PR18`, or `PR18x` from current evidence. The
Cycle 276 replay classifies `06441205b872` / seed `1100002` as
`covered-by-pr07c`, so `PR07D` remains closed/no-change unless future fresh
evidence proves active `PR07B0` / `PR07B1` / `PR07C` non-coverage. Seed
`1020002` remains terminal/downscoped for product-branch purposes unless
rebuilt validation produces newer product-owned evidence.

Cycle 282 completed the replacement PR07B split/deferred-adoption proof and is
still the active topology evidence. Cycle 286 refreshed branch audit /
push-manifest / deferred-adoption evidence, Cycle 288 launched PR07 owner replay,
Cycle 290 is rejected because its PR01 range is polluted from `origin/trunk`,
and Cycle 292 is now stale prior evidence. The latest split-persona files move
the publication-shape target to Cycle 293, but explicitly say Cycle 293 is not
filing-ready until a fresh manifest/bundle/head audit is generated after the
latest deferred queue. Cycle 292's nonempty finalized-ref audit remains useful
as historical proof that PR01 must be the two-file handoff-base delta and that
the origin-trunk 1048-file range must stay rejected.

Cycle 282 also completed the strict/rich-text owner-comparison proof. The
latest split-persona synthesis keeps strict seed `5700084` mapped to
`covered-by-PR05C`, so it remains out of `PR18` / `PR18x`. Any remaining parser,
linebreak, or rich-text reduction must compare `PR05B`, `PR05C`, and `PR05D`
before any later owner is allowed.

The remaining durable progress is publication/fetch/audit for the finer
GitHub-facing product branches that still say `No verified branch link yet`, a
PR07 runtime-readiness repair followed by the same PR07B0/PR07B1/PR07C replay
matrix, and rebuilt validation against audited refs. The refreshed branch-link
audit in this report verifies available GitHub branch links, including repaired
PR13 links, but it is not by itself final-stack validation.

Independent bounded work can continue in parallel: run exactly one PR07
fixture/plugin-map or runtime-readiness continuation with the existing snapshot
hook and non-conflicting ports, then rerun the PR07B0/PR07B1/PR07C seed matrix;
run pre-save search/live-collapse owner comparison after PR07 stops consuming
E2E capacity; continue PR02A/PR05/PR11 shaping, PR05D publication prep, sidecar
validation, deferred downscope/promotion audits, local publication prep, and
loop repair. Do not launch broad final-stack fuzzing, another `1020002` job,
raw `PR07D`, `PR17`, `PR18`, or `PR18x` work.

The duplicate/noise issue remains control-plane work, not a product split
change. Earlier remediation restarted coverage-guided novelty/supervisor and
live-analysis into `run-20260517T183817Z`; the newest duplicate/noise synthesis
does not ask for broader triage suppression. It says strict no-product
`pre_action_bootstrap_stall` is mostly historical/raw accounting, while the
remaining waste is consumer-side scheduling: live analysis, analysis scheduling,
and coverage guidance can preserve or duplicate stale/no-analysis/startup-stall
dirs or repeated product-evidence families. Product-evidence failures such as
`reload_rejoin_awareness_stall`, save/reload/autosave/revision, timeout,
unknown, assertion, convergence, and operation-witness families must stay
visible and should be capped/steered only after representative analysis.

## Branch And Ref Status

Remote status was collected at `2026-05-17T19:01:43Z`.

The fix-planning repo is checked out at:

```text
## fix/rtc-fallback-group-delete-stale-local
d06e3528cbd Fix stale fallback group deletes
```

That checkout still has an untracked reload-hydration E2E gate spec:

```text
test/e2e/specs/editor/collaboration/websocket-only/collaboration-reload-hydration-empty-live-gate.spec.ts
```

Keep that spec out of PR 6, PR 6A, PR 8, PR 15, fallback-group evidence, and
final branch claims unless it is deliberately copied into a clean evidence
worktree.

The fuzz repo remains on the validation stack:

```text
## try/rtc-fix-stack-validation
72854f05ed2 Hydrate saved CRDT responses without invalidation
```

That repo has modified product/test files plus many untracked fuzz, analysis,
and documentation artifacts. It is active validation infrastructure, not the
final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-17T19:02:24Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`.

Cycle 292 `finalized/cycle292/*` refs are now prior publication-shape evidence.
The latest split-persona synthesis says Cycle 293 supersedes them, but the
Cycle 293 refs are review-shaped rather than filing-cleared until a fresh
manifest/bundle/head audit is generated. Neither Cycle 292 nor Cycle 293
finalized refs are used as proposed PR branch links below unless the branch-link
audit marks them as `verified-content`.

Use only these repaired audited PR13 review refs for current PR13 content:

- [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired)
- [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement)
- [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard)

Do not link these stale or misordered PR13 refs as current PR content:

- `review/rtc-pr13a-observed-delete-provenance`
- `review/rtc-pr13b-stale-block-identity-smear`
- `review/rtc-pr13c-cross-parent-source-retirement`

## Proposed PR Split

Every proposed row either uses a clickable branch link from the verified
branch-link audit or explicitly says `No verified branch link yet`.

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified branch exists against the shared-base audit; Cycle 292/293 evidence keeps PR01 as the two-file handoff-base HTTP polling delta and keeps the origin-trunk 1048-file range rejected, but Cycle 293 still needs fresh manifest/bundle/head audit before filing |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified branch; keep in known-fix prefix |
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | TBD | TBD | sidecar; needs fetched `verified-content` audit before filing |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; seed `5500002` marker-retention remains separate follow-up |
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR 3 | No verified branch link yet | TBD | TBD | held PR03 sidecar / validation-only sidecar until browser/PHP runtime replay passes |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified branch; no-PR03B product ref still needs verified audit if republished |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | TBD | replacement for old aggregate PR 5; needs verified branch link |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | progress-unblock local-machine ref exists; GitHub verified-content link is still missing |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | progress-unblock local-machine ref exists; latest split-persona synthesis maps strict seed `5700084` to `covered-by-PR05C`, but GitHub verified-content link is still missing |
| PR 5D | Semicolonless entity/reference block validation after PR 5C | No verified branch link yet | TBD | TBD | Cycle 264 clean-base candidate is importable and included in the Cycle 266 validation head; publish/fetch/audit before filing |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified branch; excludes malformed-save sidecar and broader residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified branch; narrow persisted-body guard |
| PR 6B | Malformed outgoing RTC save request-payload guard, revised against PR07B0/PR07B1 helper shape | No verified branch link yet | TBD | TBD | repaired PR06B sidecar now after PR07B1; Cycle 288 finalization evidence is branch-hygiene only, and a verified branch link is still missing |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified branch; no-PR03B product ref still needs verified audit if republished |
| PR 7B0 | Saved CRDT response hydration split from old opaque PR 7B | No verified branch link yet | TBD | TBD | Cycle 282/286 evidence keeps deferred `72854f05ed2` mapped to active PR07B0 lineage; Cycle 293 publication shape is still review-only and no branch-link-audit verified PR-content link exists yet |
| PR 7B1 | Stale base-record/title filtering split from old opaque PR 7B | No verified branch link yet | TBD | TBD | Cycle 282/286 evidence keeps PR07B0 as ancestor of PR07B1 and current evidence points at `4bdd9465a97`; Cycle 293 publication shape is still review-only and no branch-link-audit verified PR-content link exists yet |
| PR 7C | Reload record snapshots sidecar after PR 7B1 | No verified branch link yet | TBD | TBD | latest replay classifies `06441205b872` / seed `1100002` as `covered-by-pr07c`; Cycle 288 PR07 live replay now has durable files but is `still-diagnostic-resource-gated`, so it does not justify PR07D or final validation |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; keep in known-fix prefix |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified branch; start CRDT block stack |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | TBD | TBD | progress-unblock manifest includes PR11A-E rows, but GitHub verified-content link is still missing |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | TBD | TBD | progress-unblock manifest includes PR11A-E rows, but GitHub verified-content link is still missing |
| PR 11C | Explicit-base middle insert | No verified branch link yet | TBD | TBD | source-local evidence marks `a914c862c29e` / seed `5200005` covered here; verified-content link is still missing |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | TBD | TBD | progress-unblock manifest includes PR11A-E rows, but GitHub verified-content link is still missing |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | TBD | TBD | progress-unblock manifest includes PR11A-E rows, but GitHub verified-content link is still missing |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified branch; old `5200005` table-delete replay is PR12-covered |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired audit link; first PR13 delta |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired audit link; maintainer-facing fallback until PR13B0/B1/B2/B3 are published and audited |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired audit link; use instead of stale/misordered PR13C refs |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified branch; seed `7110017` proves PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR 14 | No verified branch link yet | TBD | TBD | mandatory replacement topology; publish/fetch/audit before filing |
| PR 15A | Fallback group move stale reorder, restacked on PR14B | No verified branch link yet | TBD | TBD | use PR14B topology; old pre-PR14B audited branch is prior art only |
| PR 15B | Fallback group insert anchor, restacked on PR14B | No verified branch link yet | TBD | TBD | use PR14B topology; publish/fetch/audit before filing |
| PR 15C | Fallback group delete, restacked on PR14B | No verified branch link yet | TBD | TBD | use PR14B topology; include in validation-only sidecar but do not file until audited |

Verified branches that are prior art or staging only:

- [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence)
  is verified content for old aggregate PR 5, not the recommended PR05A/B/C/D
  split.
- [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record)
  is verified content for old opaque PR 7B. The active recommendation is to
  publish and audit separate PR07B0 and PR07B1 branches before filing.
- [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record)
  is verified content for old broad PR 8, not an active filing unit.
- [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops)
  is verified content for old aggregate PR 11, but the active recommendation is
  the PR11A-E split.
- [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder),
  [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor), and
  [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete)
  are verified content for the pre-PR14B PR15 shape, not the recommended
  PR15A/B/C-on-PR14B replacement.

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-17T19:01:43Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T183817Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The collected raw `novelty-status.md` snapshot is now nonempty and was updated
at `2026-05-17T18:55:15.392Z`:

```text
coverage files: 47188
total records seen: 72848
records processed this pass: 16
new behavioral feature keys this pass: 2
new CDP coverage hashes this pass: 2
unmet goals: 6
headroom for adding groups: yes
load1: 61.15 / 64 cores
memory: 420.6G free / 492.0G total
quality issues: 0
current-run records by group: novelty-ws-real-user-editing=1,
  novelty-ws-real-user-save-reload=6
current-run pre-action startup failures: novelty-ws-real-user-save-reload=2
active-current actionable signatures: 4
active-current likely-real visible: 0
active-current product-evidence signatures: 2
current-drain actionable signatures: 4
current-drain likely-real visible: 0
current-drain product-evidence signatures: 2
family-capped signatures: 2
historical likely-real visible: 225
combined likely-real visible: 225
raw active semantic families: unknown=7, reload_rejoin_awareness_stall=3,
  pre_action_bootstrap_stall=2, startup_rest_user_creation_wp_roles_crash=1
enabled groups: novelty-ws-real-user-editing, novelty-ws-real-user-save-reload
paused groups: novelty-http-persistence-probe, novelty-ws-lifecycle
recommended groups: novelty-ws-real-user-save-reload,
  novelty-ws-real-user-editing, novelty-ws-real-user-rich-text
health: ok
```

The current fuzz status is health/triage evidence only: it reports no visible
current-run likely-real product failures, but it is not final-stack validation
and does not make any PR filing-ready. Active-current triage now has product
evidence and family-capped duplicate/noise, so the right control-plane action is
to cap/steer repeated current-output semantic families while preserving product
evidence, not to broaden suppression. The HTTP persistence canary remains
paused as no-product startup noise, while the real-user editing/save-reload
lanes stay active.

The latest trend packet was generated at `2026-05-17T18:43:21Z` from monitor
data through `2026-05-17T18:40:54Z`:

```text
monitor passes: 2072
coverage files: 272 -> 47146
coverage files delta: 46874
unmet goals: 6
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3464
summary startup failures last: 0
quality issues last: 1
enabled groups current: novelty-ws-lifecycle,
  novelty-ws-real-user-save-reload
latest fuzz level mix: browser-e2e=34 lanes/27 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5326261
browser-e2e execution: 111176 cumulative / 4116 per-hour
unit-property execution: 4783744 cumulative / 8064 per-hour
coverage-guided-lower-level execution: 428335 cumulative / 0 per-hour
browser-e2e likely-real findings: 581 over 1892.5 runner-hours
largest unmet goals: reload-post-action 1023/2000,
  title-save-reload 479/1000, ui-format-paragraph 1499/2000,
  body-save-reload 538/1000, real-user-editing success 564/1000
```

The trend packet is graph-derived input evidence, not an instruction and not a
product-bug count. The raw novelty snapshot is newer than the graph trend
packet and supersedes the trend packet's enabled-group line when they disagree.
Browser E2E remains the only level with confirmed likely-real findings in the
trend packet, but lower-level lanes are under-triaged and should not be
declared useless from zero likely-real output. Recent CPU/load remains variable,
with recent samples reaching high CPU and load on a 64-core host. Prefer
startup-stall reduction, reload/rejoin duplicate control, and bounded
lower-level targets with clear oracles over broad browser concurrency
increases.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T184736Z-synthesis.md`. It is short but changes the
publication status: the old Cycle 292 state is superseded by Cycle 293
finalization, but the Cycle 293 report says those refs are review-shaped rather
than filing-cleared. It also says the stale-publication rule applies because
the `2026-05-17T18:36Z` / `2026-05-17T18:40Z` artifacts predate the
`2026-05-17T18:45Z` deferred queue in the run context.

The fuller current split synthesis,
`pr-split-20260517T183858Z-synthesis.md`, says:

- The stack is still blocked. The old `origin/trunk` / `ready-*` / monolithic
  `PR07B` shape is not reviewable, and Cycle 293 still needs a fresh
  manifest/bundle/head audit before filing.
- Use the replacement topology shown above: split old `PR07B` into
  `PR07B0 -> PR07B1`, keep `PR06B` and `PR07C` as sidecars after `PR07B1`, keep
  `PR03B` held, and keep `PR07D`, `PR17`, `PR18`, and `PR18x` absent unless new
  owner replay proves otherwise.
- Root disk is below the `2048` MB replay threshold, so Docker/wp-env/browser
  replay must wait for root-space recovery.
- PR07 replay is setup-gated at `collaborationEnabled=null`. It proves setup
  failure, not PR07 coverage or PR07 non-coverage.
- Final-stack-blocked work is root-space recovery, PR07 runtime-readiness /
  plugin-map repair, the same `5200011`, `5200017`, `5200010`, `7110004`, and
  `7110017` replay matrix against `PR07B0`, `PR07B1`, and `PR07C`, and then
  rebuilt final combined validation.
- Independent work can continue: run a fresh non-Docker Cycle 293 audit newer
  than the deferred queue, continue deferred downscope/promotion,
  pre-save-search/live-collapse and rich-text suffix owner comparison,
  PR02A/PR05/PR11 branch shaping, sidecar validation, and loop repair.
- Active sessions, zero-byte reports, `report.tmp`, stale manifests,
  disk-preflight-only output, and wait-only feedback are not progress while the
  Parallel Progress Gate has actionable rows.

The most recent split feedback-action file available here,
`pr-split-20260517T181644Z-feedback-action.md`, is now prior Cycle 292 evidence.
It completed `rtc-cycle292-finalized-ref-push-manifest-audit`, verified PR01 as
the two-file delta on the explicit Cycle 292 base, rejected the origin-trunk
1048-file range, and produced nonempty `branch-audit.tsv`,
`push-manifest.tsv`, `base-sanity.tsv`, `bundle-manifest-agreement.tsv`, bundle
artifacts, and artifact verification. That remains useful branch-shape evidence,
but the latest persona pass says it is not the current filing gate after Cycle
293 and the later deferred queue.

The latest duplicate/noise synthesis,
`duplicate-noise-20260517T184308Z-synthesis.md`, found no product split change
and did not edit files. It says strict no-product `pre_action_bootstrap_stall`
is mostly blocked downstream and mostly historical/raw accounting. The next
safe action is a bounded consumer-side control-plane patch, preferably starting
in `rtc-browser-fuzz-live-analysis-monitor.mjs`, so stale/no-analysis/startup
dirs are excluded unless current triage shows actionable product evidence and
repeated first-level Codex analysis is capped per semantic family per current
output root. It explicitly rejects broad suppression of product-evidence
families such as `reload_rejoin_awareness_stall`, `late_session_awareness_stall`,
save/reload/autosave/revision, timeout, unknown, assertion, convergence, and
operation-witness failures.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", old PR13 review-ref warnings, and old enabled-group claims are
superseded by the current branch-link audit, repaired PR13 refs, PR06B/PR07C
sidecar evidence, PR05D's real slot after PR05C, the completed Cycle 282
PR07B0/PR07B1 split/adoption proof, the Cycle 290 manifest/audit output, the
Cycle 292 finalized-ref manifest/audit output, the Cycle 293 supersession /
fresh-audit requirement, the repaired PR07 replay's
`still-diagnostic-resource-gated` classification, the current
duplicate/noise consumer-side scheduling recommendation, and the
no-PR17/no-PR18/no-PR18x classification.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR07B split and deferred adoption | `PR07B0` saved-response hydration at `e746c32e3f9` / deferred `72854f05ed2`; `PR07B1` stale base-record/title filter at `4bdd9465a97`; Cycle 282 manifest at `2026-05-17T16:15:44Z`; Cycle 286 manifest-age at `2026-05-17T17:11:41Z`; Cycle 290 manifest/audit at `2026-05-17T18:06:49Z`; Cycle 292 finalized-ref audit under `runs/20260517T181644Z/jobs/outputs/rtc-cycle292-finalized-ref-push-manifest-audit/`; branch-link audit refreshed at `2026-05-17T19:02:24Z`; latest persona requires Cycle 293 audit | Cycle 292 is now prior evidence; latest split-persona says Cycle 293 supersedes it but is review-shaped, not filing-cleared, and stale against the later deferred queue until a fresh manifest/bundle/head audit exists. No `verified-content` PR links exist yet for PR07B0/PR07B1 | Publish/fetch/audit explicit PR07B0 and PR07B1 GitHub-facing product branches; run the fresh Cycle 293 non-Docker audit; repair PR07 runtime readiness and rerun the PR07B0/PR07B1/PR07C matrix; rerun focused checks and rebuilt stack validation against audited refs |
| Reload/post-save residual witnesses | latest seeds `5200011`, `5200017`, `5200010`, `7110004`, `7110017`; include `7700005` if capacity allows | focused residual replay target after PR07B split/adoption; not a product PR slot yet; Cycle 288 PR07 replay has durable `report.md` and `replay-classification.tsv`, but classifies as `still-diagnostic-resource-gated` because all primary seeds failed before the seeded action/reload/checkpoint flow at `collaborationEnabled=null`; remote `/` is below the replay threshold | Recover root disk above `2048` MB, then run exactly one bounded fixture/plugin-map or runtime-readiness continuation with the existing snapshot hook and non-conflicting ports; compare against PR07B0/PR07B1/PR07C before naming PR07D and capture block trees, serialized content, clientIds, marker attributes, REST content, REST `_crdt_document`, Y.Doc vectors, operation ledger, focus/selection, and snapshots after each save/reload/mutation |
| PR05D semicolonless entity validation | Cycle 264 clean-base branch `cycle264/pr05d-clean-base/semicolonless-entity-validation` at `27c6e7924217`; Cycle 266 validation head `b9bf4ccb7940` | real PR05-family work after PR05C; bundle import and validation-head refresh completed, but no fetched `verified-content` product branch link exists yet | Publish/fetch/audit PR05D; consume the Cycle 266 validation head; keep the Cycle 262 fallback-tail manifest rejected |
| PR06B / PR07B helper dedupe | active candidate `finalized/cycle268/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b` at `e91d2fe829f2`; stale `ready/rtc-pr06b-*` manifest rows | old independent PR06A sidecar is superseded; Cycle 274/278/280/282 evidence rejects stale rows and Cycle 286/Cycle 288 branch-hygiene evidence preserves sidecar placement, but there is still no verified branch link and the active topology places the sidecar after PR07B1 | Publish/fetch/audit an explicit PR06B product branch after PR07B0/PR07B1, classify runtime readiness, and rebuild stack validation against the active topology |
| PR14B / PR15-on-PR14B finalization | Cycle 252 no-PR03B branch-shaping artifacts | mandatory replacement topology, but no current `verified-content` branch links exist for PR14B or PR15-on-PR14B | Publish/fetch/audit explicit no-PR03B product refs after sidecar-aware audit and keep validation-only heads out of product PRs |
| PR07C reload record snapshots | accepted sidecar after PR07B1; `finalized/cycle252/sidecar/rtc-pr07c-reload-record-snapshots` at `2d112932f0e3`; replay target `06441205b872` | included in Cycle 266 fetch-only validation topology; latest replay classifies seed `1100002` as `covered-by-pr07c`; Cycle 288 PR07 replay has durable files but is resource-gated before coverage; no current verified branch-link row exists | Publish/fetch/audit sidecar-aware PR07C product branch after PR07B0/PR07B1; reopen PR07D only on future fresh red-at-active-PR07C non-coverage proof after runtime readiness is repaired |
| PR03B browser `restoreRevision` CRDT invalidation | `ready-pr03b/rtc-pr03b-browser-revision-restore-crdt-invalidation` at `cbab481fe760` | PR03 sidecar is held/runtime-gated until browser/PHP runtime replay passes | Finish bounded runtime replay for PR03B after root-space/runtime readiness is healthy; do not put PR03B back into the main spine without passing evidence |
| PR05B/PR05C/PR05D owner comparison | Cycle 260 owner-comparison evidence plus Cycle 282 strict/rich-text owner-comparison proof and latest split-persona synthesis | strict seed `5700084` maps to `covered-by-PR05C` from the current non-Docker owner comparison; parser/rich-text/linebreak evidence and the current rich-text suffix diagnostic remain out of PR18/PR18x; semicolonless/entity false-invalid rows are routed to PR05D | Keep PR18x closed; compare any remaining linebreak/parser/rich-text reductions against PR05B/PR05C before allowing a later owner, and require per-peer block trees, edited content, serialized content, rich-text / verse attributes, client IDs, and operation-ledger snapshots for any fresh source-owned claim |
| PR13 finer split | PR13B0/B1/B2/B3 source-level evidence; repaired audited PR13A/B/C fallback links | preferred source split remains PR13A/B0/B1/B2/B3, but proposed rows currently use only repaired audited PR13A/B/C links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing repaired PR13B/C fallback rows |
| Nested parent-delete / descendant-edit triage | seed `7500019` | tracking-only evidence from split persona; no product slot named | Compare against PR13 and PR15 coverage before adding any new slot |
| Seed `1020002` WebSocket marker divergence | critical-path classification under `runs/20260517T120127Z/continuations/pr17-1020002/classification.tsv`; latest nonempty continuation repeats `reclassify_downscope_not_product_owned` | downscoped unless rebuilt validation produces fresh product evidence; not an independent-work blocker and not a current PR17 product slot | Revisit only after rebuilt validation produces fresh product evidence newer than the terminal/downscope classifications |
| Sync undo/history issue | `9f4dcc759070`, `44110608ba86`, `977ed437bafe`; seeds `1090016` / `1090017`; completed Cycle 268 isolated runtime replay artifacts | completed isolated runtime replay reached the owner path but did not reproduce a stable redo-stack-loss product owner; not PR05B/PR05C and not PR18x | Use a lower-intrusion history subscription repro or source-level sync/core-data history test before naming any product PR |
| Reload-hydration diagnostics | retained raw branch `72854f05ed2`; latest deferred reload branch `deferred/rtc-reload-hydration-20260517T160811Z`; replay row `06441205b872` | Cycle 282/286 evidence keeps raw deferred reload-hydration mapped to active PR07B0 lineage and out of PR07D; Cycle 288 replay is durable but resource-gated at collaboration readiness, so it is not owner-proof yet | Repair runtime readiness and rerun residual owner replay against PR07B0/PR07B1/PR07C with first-divergence snapshots; keep diagnostics downscoped unless a focused replay proves a distinct product delta |
| Rich-text formatted suffix corruption | diagnostic candidates and prior deferred refs | evidence-only; Cycle 282 owner-comparison keeps it out of active PR split and out of PR18/PR18x | Compare against PR05B/PR05C first and recover exact replay artifact or emitted delta before naming any later product owner |
| Pre-save search/live document collapse | seed `961308` / `ddf9559af37e`; only run `0932bed35c7a` if red or ambiguous | evidence-only; not in active split; latest split-persona synthesis keeps the active pre-save/rich-text gate row actionable and says it must not block behind `1020002` | Run one bounded pre-save owner comparison against `PR06`, `PR06A`, `PR07B0`, `PR07B1`, and `PR07C`, capturing editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion before naming an owner |
| Broader HTTP polling room-isolation residuals | PR02A sidecar plus stale deferred relaunches | PR02A remains in the known-fix prefix but has no verified branch link; broader residuals stay deferred | Publish/fetch/audit PR02A before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack preparation; no automatic PR slot | Triage only after rebuilt stack is available |
| Duplicate/noise control-plane recycling | `duplicate-noise-20260517T184308Z-synthesis.md`; nonempty `novelty-status.md` at `2026-05-17T18:55:15.392Z` | Strict no-product startup noise is mostly historical/raw accounting; current active triage has `4` actionable signatures, `2` product-evidence signatures, `0` visible likely-real failures, and `2` family-capped signatures. Active groups are `novelty-ws-real-user-editing` and `novelty-ws-real-user-save-reload`; `novelty-http-persistence-probe` and `novelty-ws-lifecycle` are paused | Patch consumer-side scheduling/capping, preferably in `rtc-browser-fuzz-live-analysis-monitor.mjs`, so stale/no-analysis/startup dirs are ignored unless current triage has actionable product evidence and repeated first-level analysis is capped by semantic family; do not broadly suppress product-evidence reload/rejoin, timeout, unknown, assertion, save/revision, convergence, or operation-witness failures |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr` branches as-is.

Before filing any maintainer-facing PR:

1. Use only explicit product refs. Do not wildcard import or file `final/rtc-pr*`,
   validation-stack branches, deferred branches, dirty evidence branches, old
   downstream `ready/*` refs, stale `ready-pr03b/*` main-spine refs, or
   validation-only heads.
2. Keep old aggregate PR 5, broad PR 8, aggregate PR 11, stale/misordered PR13
   refs, old PR06B/PR16 material, dirty evidence branches, and the untracked
   reload-hydration gate spec out of filing branches and push allow-lists.
3. Treat the completed Cycle 280 manifest/queue proof as prior evidence only.
   Use the completed Cycle 282 split/adoption proof as topology evidence: it
   was generated at `2026-05-17T16:15:44Z`, splits old opaque `PR07B` into
   `PR07B0` / `PR07B1`, verifies `PR07B0` is an ancestor of `PR07B1`, and
   rejects raw deferred reload-hydration publication.
4. Treat the completed Cycle 286 and Cycle 290 manifest/push-manifest/
   deferred-adoption audits, plus Cycle 288 finalization reports, as
   stale-but-useful topology and branch-hygiene evidence. They are still not
   final-stack validation and do not create GitHub `verified-content` branch
   links for PR07B0/PR07B1 or other finer rows. Cycle 290's PR01 origin-trunk
   audit is unsafe.
5. Treat Cycle 292 as prior branch-shape evidence, not the current publication
   instruction. It proves `PR01` is the expected two HTTP polling files and
   rejects the `1048`-file origin-trunk PR01 shape, but the latest split-persona
   evidence says Cycle 293 supersedes it. Cycle 293 is review-shaped, not
   filing-cleared, until a fresh non-Docker manifest/bundle/head audit is newer
   than the deferred queue and writes nonempty branch audit, push manifest,
   manifest age, base sanity, bundle/manifest agreement, and artifact
   verification outputs.
6. Reject stale `ready/*`, raw `deferred/*` filing refs, stale PR06B/PR07C
   rows, `PR17` / `1020002`, and `PR18` / `PR18x` from the active manifest and
   executor queue. Active sessions, zero-byte reports, `report.tmp`,
   preflight-only output, stale manifests, stale published rows, and wait-only
   feedback are not durable progress while actionable rows remain.
7. Use the repaired PR06B sidecar candidate only after the PR07B0/PR07B1 shape
   is audited:
   `finalized/cycle268/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b`.
   The old PR06B sidecar is superseded and must stay historical input evidence
   only.
8. Treat `cycle266/validation/no-pr03b-pr05d-plus-pr06b-pr07c-sidecars` at
   `b9bf4ccb794004b634d1427bf18d1a7d788af03f` as fetch-only validation
   evidence, not product content.
9. Publish/fetch and audit explicit sidecar-aware product refs for PR02A,
   PR03B, PR04-through-PR07A, PR07B0, PR07B1, PR05A/B/C, clean-base PR05D,
   repaired PR06B, PR07C, PR11A-E, PR13B0/B1/B2/B3 if available, PR14B, and
   PR15A/B/C-on-PR14B before treating those finer refs as maintainer-facing
   links.
10. Until PR13B0/B1/B2/B3 have verified branch links, keep using only repaired
   PR13A/B/C links from the audit for PR13 content.
11. Do not publish raw reload-hydration deferred refs as PR07D. Current
    evidence treats the raw reload branch as rejected/held unless fresh replay
    proves PR07B0/PR07B1/PR07C non-coverage.
12. Treat the completed Cycle 288 PR07 live replay as diagnostic only: it wrote
    durable replay artifacts but classified as `still-diagnostic-resource-gated`
    because the seed matrix failed before the seeded action/reload/checkpoint
    flow at `collaborationEnabled=null`. Recover remote `/` above the `2048` MB
    replay threshold, then run exactly one bounded fixture/plugin-map or
    runtime-readiness continuation with the corrected RTC E2E harness, plugin
    map, non-conflicting ports, the existing snapshot hook, and the same residual
    seeds; only then compare against PR07B0/PR07B1/PR07C for PR07D decisions.
    Then run the bounded pre-save-search/live collapse owner comparison for
    seed `961308` / `ddf9559af37e` if PR07 is no longer consuming E2E capacity.
    Treat strict seed `5700084` as `covered-by-PR05C` per the latest
    split-persona synthesis; parser/rich-text/linebreak cases still need
    PR05B/PR05C/PR05D comparison before naming any later owner.
13. The deferred-promotion loop patch is recorded as Cycle 284 evidence, and
    the split-review loop bounded-job/progress-unblock patch is recorded as
    Cycle 286 evidence. Existing active runners may still finish from older
    generated scripts, so wait-only, launcher-only, or stale-manifest cycles
    still do not count as durable progress.
14. Rerun focused checks, touched-file lint, branch graph/containment evidence,
    adjacent range-diffs/diffstats/numstats, `git diff --check`, and feasible
    PR03B/PR07B0/PR07B1/PR07C runtime checks.
15. Treat seed `1020002` as downscoped by the
    `reclassify_downscope_not_product_owned` classification. Do not launch a
    new `1020002` repair rerun unless rebuilt validation produces fresh product
    evidence.
16. Treat PR18x as rejected for the current parser/rich-text/linebreak and
    strict/rich-text suffix evidence. The narrow PR05D semicolonless
    entity-validation path belongs after PR05C, and the completed isolated sync
    undo/history runtime replay did not produce a stable owner proof.
17. Treat the raw novelty snapshot, trend packet, and duplicate/noise synthesis
    as fuzz/control-plane health and triage evidence. The collected raw novelty
    snapshot for this update is nonempty and fresher than the trend packet. It
    shows zero visible likely-real failures, `4` active-current actionable
    signatures, `2` active-current product-evidence signatures, `2`
    family-capped signatures, enabled `novelty-ws-real-user-editing` and
    `novelty-ws-real-user-save-reload` groups, paused
    `novelty-http-persistence-probe` and `novelty-ws-lifecycle` groups, and a
    need for consumer-side scheduling/capping rather than broad suppression.
    Neither source is final-stack validation, a validated final-stack pass or
    failure, or filing readiness.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after environment preflight is healthy. None of the
current trend, duplicate/noise, residual reducer, or status-persona evidence is
final-stack fuzz validation or a filing unblocker.
