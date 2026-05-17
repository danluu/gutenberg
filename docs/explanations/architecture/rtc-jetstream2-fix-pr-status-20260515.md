# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T22:33:35Z`

Trigger event:
`pr-split-2026-05-17T22-32-15Z-20260517T222450Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T22-32-15Z-20260517T222450Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The latest completed split-persona synthesis,
`pr-split-20260517T222450Z-synthesis.md`, says filing is still blocked and the
old Cycle293 linear stack must no longer drive filing, final manifests, or
rebuilt stack-wide validation. The active replacement recommendation is now the
Cycle308 `fresh-prset/iteration-26/*` shape, not the older iteration-23 or
iteration-24 references.

Current replacement target:

```text
Common mainline:
PR01 -> PR02 (+ PR02A sidecar)
-> PR03 (hold PR03B)
-> PR04 -> PR05A -> PR05B -> PR05C -> clean PR05D
-> grouped PR06 save-request-payload guards
(+ PR06E sidecar from PR06, not PR07B)

Runtime-gated lane:
PR07A -> PR07B
(hold PR07C; no raw PR07D)

Independent CRDT/data-loss lane from PR06:
PR09 -> PR10 -> grouped PR11 -> grouped PR12
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B -> grouped PR15
```

The Cycle308 non-Docker manifest/deferred artifact was generated at
`2026-05-17T22:23:11Z`, newer than the deferred queue timestamp
`2026-05-17T22:22:32Z`. It records `27` manifest rows, `5` topology checks
passing and `0` failing, `0` hard check failures, `0` head/bundle/manifest
agreement failures, and `0` grouped-head alias failures. The required topology
checks pass: `PR06 -> PR06E`, `PR07B !-> PR06E`, `PR06 -> PR09`,
`PR07B !-> PR09`, and `PR07B !-> PR15`. Jetstream2 did not push GitHub refs;
the Cycle308 `push-manifest.tsv` is a local publication artifact only.

Hard blockers remain:

- Do not file GitHub PRs, launch broad final-stack fuzz, or claim rebuilt
  stack-wide validation yet.
- PR07 reload/post-save/rejoin ownership is still unproven. The Cycle306 PR07
  matrix produced all `18` requested rows, but every row was `setup-only` with
  `collaborationEnabled=null`; that is not product coverage and does not
  justify raw `PR07D`.
- Seed `1020002` blocks final-stack validation, filing, and rebuilt full-stack
  validation only. It must not block independent branch audit, split refresh,
  deferred promotion/downscope, PR07 readiness repair, or loop repair.
- The iteration-26 manifest must remain current before publication or filing.
- Keep raw `PR07D`, `PR17`, `PR18`, and `PR18x` absent. Parser/rich-text and
  linebreak residuals stay on the `PR05B -> PR05C -> clean PR05D` comparison
  path unless fresh owner evidence disproves that.

## Branch And Ref Status

Remote status was collected at `2026-05-17T22:33:29Z`.

The fix-planning repo is checked out at:

```text
## fix/rtc-fallback-group-delete-stale-local
d06e3528cbd Fix stale fallback group deletes
```

That checkout still has an untracked reload-hydration E2E gate spec:

```text
test/e2e/specs/editor/collaboration/websocket-only/collaboration-reload-hydration-empty-live-gate.spec.ts
```

Keep that spec out of PR 6, PR 6E, PR 7, PR 8, PR 15, fallback-group
evidence, and final branch claims unless it is deliberately copied into a
clean evidence worktree.

The fuzz repo remains on the validation stack:

```text
## try/rtc-fix-stack-validation
72854f05ed2 Hydrate saved CRDT responses without invalidation
```

That repo has modified product/test files plus many untracked fuzz, analysis,
and documentation artifacts. It is active validation infrastructure, not the
final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-17T22:33:35Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`.

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
branch-link audit or explicitly says `No verified branch link yet`. A verified
branch link confirms that the linked ref exists and has a non-empty audited
diff; it does not remove the filing blockers above.

### Common And Independent Lanes

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified content |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified content |
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | TBD | TBD | sidecar; needs iteration-26 GitHub ref |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified content; PR03B remains held |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified content |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | TBD | active fresh row; old aggregate PR5 is prior art |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | active fresh row |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | active fresh row |
| PR 5D | Clean semicolonless/entity-validation after PR 5C | No verified branch link yet | TBD | TBD | valid only for clean `27c6e7924217`; reject fallback/PR15-tail `PR05D` |
| PR 6 | Grouped save-request-payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified grouped content; iteration-26 placement is local until pushed/audited on GitHub |
| PR 6E | Malformed outgoing RTC save sidecar from PR06 | No verified branch link yet | TBD | TBD | must hang from PR06, not PR07B |
| PR 9 | Core-data lock fairness from PR06 | No verified branch link yet | TBD | TBD | active row must prove PR06 ancestry; old PR9 branch is prior art |
| PR 10 | CRDT block reconciliation foundation after PR9 | No verified branch link yet | TBD | TBD | active row needs iteration-26 GitHub ref |
| PR 11 | Grouped explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | 2 | +1145 / -4 | verified grouped content; placement must match iteration-26 manifest before filing |
| PR 12 | Grouped previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified grouped content; placement must match iteration-26 manifest before filing |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired verified content |
| PR 13B0-B3 | Finer source-retirement rows | No verified branch link yet | TBD | TBD | preferred finer split still needs published/audited refs |
| PR 13B fallback | Cross-parent source retirement fallback | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired verified fallback until PR13B0-B3 exist |
| PR 13C fallback | Stale block identity smear guard fallback | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired verified fallback only |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | mandatory before grouped PR15 |
| PR 15 | Grouped fallback-group move/insert/delete after PR14B | No verified branch link yet | TBD | TBD | active grouped row needs PR14B-based GitHub ref |

### Runtime-Gated Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified content; runtime ownership still setup-only |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified content; rerun owner matrix only after readiness is true |
| PR 7C | Reload record snapshots sidecar after PR7B | No verified branch link yet | TBD | TBD | held; no raw PR07D without first-divergence evidence |

### Held Sidecars And Prior Art

| Row | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR3 | No verified branch link yet | held until PR03-vs-PR03B replay proves ownership |
| PR 5 aggregate | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | verified prior art, not the active PR05A-D split |
| PR 6A prior art | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | verified prior art; do not substitute for active grouped PR06 unless the refresh maps it there |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 9 prior art | Core-data lock fairness on old base | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | verified prior art; active PR9 must be audited from PR06 |
| PR 10 prior art | CRDT foundation on old base | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | verified prior art until refreshed PR09 placement is audited |
| PR15 prior art | Pre-PR14B fallback-group rows | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder), [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor), [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified prior art only; active grouped PR15 must be after PR14B |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-17T22:33:29Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T222443Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The current novelty/control-plane snapshot was updated at
`2026-05-17T22:31:06.972Z`:

```text
coverage files: 48013
total records seen: 74383
coverage lines seen this pass: 76743
new behavioral feature keys this pass: 2
new CDP coverage hashes this pass: 2
all-time records by transport:
  ws=70994
  http=3389
current-run records by profile/group: {}
current-run triage signatures: 0
current-run likely-real visible: 0
current-drain likely-real visible: 0
unmet goals: 5
quality issues: 0
health: ok
enabled groups:
  novelty-ws-real-user-save-reload
  novelty-http-persistence-probe
paused groups:
  novelty-ws-parser-transform
  novelty-ws-lifecycle
```

This is current fuzz/control-plane health, not final-stack validation and not a
no-bugs claim. The new coverage root had no current-run records in the latest
novelty pass, so current-run triage is clean but still shallow. The live
scheduler is aimed at the remaining real-user coverage gaps plus an HTTP
persistence canary.

The latest trend packet was generated at `2026-05-17T22:26:59Z` from monitor
data through `2026-05-17T22:21:39Z`:

```text
monitor passes: 2131
coverage files: 272 -> 47905
coverage files delta: 47633
unmet goals: 5
likely_real_max: 4
duplicate_share_current_last: 1
duplicate_share_historical_last: 0.3462
summary startup failures last: 0
quality issues last: 0
memory free: 426.4 GB
load averages: 35.4 / 41.17 / 48.39 on 64 cores
latest fuzz level mix:
  browser-e2e=27 lanes/27 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5374225
browser-e2e likely-real findings: 619 over 1955.3 runner-hours
largest unmet goals:
  reload-post-action 1067/2000
  title-save-reload 523/1000
  body-save-reload 582/1000
  real-user-editing success 592/1000
  ui-format-paragraph 1664/2000
```

The novelty snapshot supersedes the trend packet for current enabled/paused
groups. The trend packet remains evidence for load, coverage growth, and fuzz
level effectiveness. Browser E2E remains the only level with confirmed
likely-real findings, but the lower-level lanes are under-triaged and should
not be declared useless from zero likely-real output.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T222450Z-synthesis.md`. It confirms:

- The active split changed from the previous Cycle306/iteration-23 target to
  Cycle308 `fresh-prset/iteration-26/*`.
- Cycle293, stale Cycle304/Cycle306 manifests, local-machine Cycle293 publish
  rows, `ready/*`, fallback-tail `PR05D`, raw `PR07D`, `PR17`, `PR18`, and
  `PR18x` are historical or rejected filing sources.
- The active fileable units are grouped `PR06`, grouped `PR11`, grouped
  `PR12`, and grouped `PR15`, with microheads retained for audit or
  reviewer-requested staging.
- `PR06E` is a sidecar from `PR06`, not from `PR07B`.
- `PR09+` must be independent from `PR07B`: prove `PR06 -> PR09` and
  `PR07B !-> PR09/PR15`.
- The Cycle306 PR07 matrix remains setup-only while
  `window._wpCollaborationEnabled === null`. Any PR07 owner replay must wait
  for readiness true and must capture REST/meta, Y.Doc, provider, awareness,
  and block-tree first-divergence snapshots.
- Clean `PR05D` means `27c6e7924217038ed9b4ff71585e8041c67765a4`. Reject
  `fix/rtc-fallback-group-delete-stale-local`, `d06e3528cbd`, and any
  fallback/PR15-tail row as `PR05D`.
- Waiting only on seed `1020002` is invalid while independent Progress Gate
  rows are actionable.

The newest split feedback action,
`pr-split-20260517T220648Z-feedback-action.md`, completed the Cycle308
iteration-26 manifest/deferred refresh. It produced the local
`push-manifest.tsv`, base allowlist, head/bundle/manifest checks, grouped-head
audit, branch graph, adjacent diffstat/numstat, deferred-output audit,
latest-fresh audit, and artifact-verification files with `5/0` topology checks
and no hard/head/manifest/grouped-head failures.

The newest duplicate/noise synthesis is
`duplicate-noise-20260517T220328Z-synthesis.md`. It identifies a remaining
producer-side scheduler leak in `bin/rtc-browser-fuzz-novelty-monitor.mjs`:
mixed product-evidence producers can classify no-product
`pre_action_bootstrap_stall` as `known-noise`, write a product-preserving
`no-analysis.json`, and keep running. The recommended small fix is to treat
current no-product `pre_action_bootstrap_stall` as startup-pause-worthy for
pause, enable, materialization/top-off, and coverage-Codex gating while
preserving product-evidence signatures. The latest collected
`duplicate-noise-20260517T220328Z-feedback-action.md` is empty, so no completed
feedback action accompanies that synthesis in these inputs.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older
"keep existing split", old PR13 review-ref warnings, old enabled-group claims,
and "do not add PR06B" recommendations are superseded by the repaired PR13
audit links, the Cycle308 iteration-26 replacement split, the PR07
runtime-gated lane, and later duplicate/noise evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Iteration-26 publication | Cycle308 `fresh-prset/iteration-26/*`, local `push-manifest.tsv`, branch graph, adjacent diffstats, allowlist, bundle checks | active split target; local artifact is current as of `2026-05-17T22:23:11Z` | Refresh if the fresh set or deferred queue advances; push/fetch/audit GitHub refs before filing |
| PR07 runtime / owner gate | PR07A, PR07B, held PR07C; seeds `5200011`, `5200017`, `5200010`, `7110004`, `7110017`, and `5200008` | setup-only because collaboration readiness was null | Prove readiness true, then run the owner matrix with first-divergence snapshots |
| PR07D | reload/post-save/rejoin residuals | absent; raw PR07D is not justified | Add only after fresh PR07 replay proves red-at-active-PR07C non-coverage |
| PR05D semicolonless entity validation | clean PR05C-adjacent branch `27c6e7924217` | real PR05-family work after PR05C; no verified product branch link yet | Publish/fetch/audit clean PR05D; keep fallback-tail `PR05D` rejected |
| PR06E malformed-save sidecar | outgoing RTC save request-payload guard | useful only as a PR06 sidecar | Publish/fetch/audit explicit sidecar and prove `PR07B` is not in its ancestry |
| PR09 placement | PR09 through grouped PR15 | independent CRDT/data-loss lane must fork from PR06, not PR07B | Prove `PR06 -> PR09` and `PR07B !-> PR09/PR15` in the filing refs |
| PR13 finer split | PR13A plus desired PR13B0/B1/B2/B3 | repaired PR13A/B/C review refs are the only verified current PR13 content links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired fallback refs |
| PR14B / grouped PR15 | PR14B and grouped fallback-group PR15 after PR14B | active topology lacks verified current PR14B and PR15 branch links | Publish/fetch/audit explicit PR14B-based product refs |
| PR03B browser restoreRevision invalidation | held PR03 sidecar | held until runtime replay distinguishes PR03 from PR03B ownership | Run PR03 vs PR03B after runtime readiness is healthy |
| PR05B/PR05C/PR05D owner comparison | parser/rich-text/linebreak/suffix residuals | completed at `2026-05-17T21:29:52Z` with `0` check failures; no `PR18x` owner assigned | Keep future residuals on this comparison path unless fresh evidence disproves earlier ownership |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzz, filing, and rebuilt validation only | Revisit only after refreshed stack validation produces newer product evidence |
| Pre-save search/live document collapse | seed `961308` / `ddf9559af37e`; run `0932bed35c7a` only if red or ambiguous | evidence-only; not in active split | Run a bounded owner comparison after PR07 stops consuming E2E capacity |
| Reload hydration, rich-text suffix, malformed-save residuals, HTTP room isolation | diagnostic/deferred families | evidence-only unless a focused owner replay proves otherwise | Keep out of PR rows until branch, owner, and fuzz evidence are refreshed |
| Duplicate/noise producer scheduling | `duplicate-noise-20260517T220328Z-synthesis.md` | strict startup noise is suppressed downstream, but mixed product-evidence producers can still leak capacity | Patch novelty scheduling for current no-product startup dominance while preserving product evidence |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file `ready/*`, `ready-pr03b/*`,
Cycle293, stale Cycle304/Cycle306 manifests, validation-stack, dirty evidence,
or fallback-tail branches as-is.

Before filing any maintainer-facing PR:

1. Use the Cycle308 iteration-26 grouped shape as the current working target.
2. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
3. Prove `PR06 -> PR06E`, `PR07B !-> PR06E`, `PR06 -> PR09`,
   `PR07B !-> PR09/PR15`, clean `PR05D` only, and no fallback-tail `PR05D`.
4. Until PR13B0/B1/B2/B3 have verified branch links, use only the repaired
   PR13A/B/C audit links listed above for PR13 content.
5. Keep old aggregate PR5, broad PR8, old-base PR9/10, stale/misordered PR13
   refs, old pre-PR14B PR15 refs, dirty evidence branches, and the untracked
   reload-hydration gate spec out of filing branches and push allow-lists.
6. Prove runtime readiness and rerun the PR07A/PR07B/held-PR07C owner matrix
   before any PR07D decision.
7. Patch/enforce the progress gate so active sessions, active/terminal
   `1020002`, zero-byte artifacts, `report.tmp`, stale manifests,
   disk/runtime-preflight-only reports, and stderr growth are not counted as
   durable progress while actionable rows exist.
8. Apply the duplicate/noise mixed-run scheduler follow-up so current
   no-product startup dominance gates producer scheduling while product-evidence
   families stay visible or family-capped.
9. Run focused checks, touched-file lint, branch graph/containment evidence,
   adjacent range-diffs/diffstats/numstats, `git diff --check`, and feasible
   runtime checks on refreshed audited refs.
10. Treat novelty, trend, and duplicate/noise reports as fuzz/control-plane
    health and triage evidence. They are not final-stack validation, a
    validated final-stack pass or failure, or filing readiness.

The next useful work is keeping the Cycle308 iteration-26 manifest current,
publishing/fetching/auditing the missing GitHub refs, PR07 collaboration
bootstrap/root-cause work, the bounded PR07 owner matrix after readiness is
true, loop-gate enforcement, and the duplicate/noise producer-scheduling patch.
Do not launch broad final-stack fuzz, a duplicate seed `1020002` job, raw
`PR07D`, `PR17`, or `PR18x`.
