# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T09:16:05Z`

Trigger event:
`pr-split-2026-05-16T09-15-12Z-20260516T090702Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Base handoff:
`docs/explanations/architecture/rtc-likely-real-bug-handoff-20260514.md`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-16T09-15-12Z-20260516T090702Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The current plan is closer, but still not filing-ready. The latest completed
split-persona synthesis, `pr-split-20260516T090702Z-synthesis.md`, supersedes
the older Cycle 116 wording in `current-pr-split.md`: the PR 13 adjudication
report that was previously empty has landed and selected a green identity-first
PR 13 sequence instead of collapsing all source-retirement and identity-smear
work into one PR.

Current PR 13 decision:

- Drop the old aggregate `final/rtc-pr13b-source-retirement` as a filing head.
- Drop the old PR 13C aggregate wording/head as a filing head.
- Drop the Cycle 110 red `PR 13B1` / `PR 13B2` / `PR 13B3` filing heads.
- Replace them with the green PR 13 sequence selected by the landed
  adjudication report:
  `final/rtc-pr13a-observed-delete-provenance-green` at `737fbaf0fca`,
  `final/rtc-pr13b0-identity-provenance-guard` at `b64158c44d8`,
  `final/rtc-pr13b1-direct-source-retirement-green` at `404f9b14231`,
  `final/rtc-pr13b2-current-only-source-retirement-green` at `0492a7ae759`,
  and `final/rtc-pr13b3-explicit-base-source-retirement-green` at
  `ba95f820097`.
- Reattach PR 14 and PR 15 on the green PR 13B3 stack.

The landed PR 13 report, as summarized by the latest synthesis, says focused
CRDT tests, touched-file lint, and `git diff --check` passed at each chosen
PR 13 head, and that PR 13B3 is tree-equivalent to the old accepted PR 13C
filing tree. That is strong branch-shaping evidence, but the green PR 13 refs
are not yet verified by the branch-link audit and were not found in
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514/repo`. The next branch
step is therefore import/fetch and audit, not filing.

Other split decisions:

- Keep the accepted `PR 5A/5B/5C`, `PR 7A/7B`, and `PR 15A/15B/15C` shapes.
- Replace broad PR 8 with a narrow title-reload path around
  `origin/try/rtc-title-reload-pr`; keep broader persisted-record hydration
  deferred.
- Keep PR 6B blocked until focused replay of `ws-parser-transform` seeds
  `5500001`, `5500002`, and `5500006` passes; drop PR 6B if replay fails.
- Keep PR 6C malformed evaluated save content blocked pending Jest, lint, and
  replay evidence.
- Keep reload-hydration empty-live-editor, pre-save search/live-collapse,
  rich-text suffix corruption, malformed-save residuals, and HTTP
  room-isolation residuals evidence-only/deferred.

Do not start broad fuzzing, duplicate PR 13 repair, reload diagnostics, or new
fuzz lanes now. Existing background fuzz can continue, but current `0` visible
likely-real status is not final-stack validation. The next bounded action after
PR 13 finalization reconciliation is the PR 6B focused replay. If the separate
40-commit validation lineage is required, do exactly one bounded rebuild using
the green PR 13 boundaries before PR 6B.

## Latest Branch And Ref Status

The collected remote status input was generated at `2026-05-16T09:16:05Z`.

The fix-planning repo is currently checked out at:

```text
## fix/rtc-fallback-group-delete-stale-local
d06e3528cbd Fix stale fallback group deletes
```

That checkout still has an untracked reload-hydration E2E gate spec:

```text
test/e2e/specs/editor/collaboration/websocket-only/collaboration-reload-hydration-empty-live-gate.spec.ts
```

Keep that spec out of PR 15A/15B/15C, PR 6, PR 6A, PR 8, fallback-group
evidence, and any final branch claim unless it is deliberately copied into a
clean evidence worktree for the reload-hydration gate.

The fuzz repo remains on the validation stack:

```text
## try/rtc-fix-stack-validation
72854f05ed2 Hydrate saved CRDT responses without invalidation
```

That stack still has modified fuzz harness files and many untracked fuzz and
analysis scripts. It is active validation infrastructure, not the final PR
stack.

The branch-link audit was generated at `2026-05-16T09:16:10Z` from fetched
`danluu` refs. The proposed PR table below uses only rows marked
`verified-content` as PR-content links, or explicitly says
`No verified branch link yet`.

Use only these repaired PR 13 audit refs when mentioning current audited PR 13
review content:

| Purpose | Verified branch containing audited content | Current SHA | Status |
| --- | --- | --- | --- |
| PR 13A observed-delete provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | `eddf2dd38c09` | repaired audit link; superseded filing head is the green final ref above |
| Aggregate PR 13B source-retirement provenance | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | `6ea7f425b009` | verified content, but rejected as a filing head |
| PR 13C stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | `fa0f00a1c025` | verified content; old standalone PR 13C wording is superseded by green PR 13B3 |

Do not use these stale or misordered refs as PR-content links for repaired
PR 13:

- `review/rtc-pr13a-observed-delete-provenance`
- `review/rtc-pr13b-stale-block-identity-smear`
- `review/rtc-pr13c-cross-parent-source-retirement`

The supporting provenance base
[`shape/rtc-crdt-pr12-previous-local`](https://github.com/danluu/gutenberg/tree/shape/rtc-crdt-pr12-previous-local)
is pushed only so the repaired PR 13A compare link has the source base.

## Proposed PR Split

The old aggregate PR 5, broad PR 8, aggregate PR 13B, old standalone PR 13C
wording, and aggregate PR 15 rows are stale for maintainer-facing filing. The
table is the current working split. Rows without an audited branch explicitly
say `No verified branch link yet`.

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified branch; final rebase/checks still required |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified branch; final rebase/checks still required |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; final rebase/checks still required |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified branch; final rebase/checks still required |
| PR 5A | Entity/entity-reference normalization in `crdt.ts` | No verified branch link yet | 2 | about +465 / -8 | accepted replacement for old aggregate PR 5; create/audit from `f39c621c90d` plus `589226af0fe` |
| PR 5B | Parser/rich-text HTML equivalence in `crdt-blocks.ts` | No verified branch link yet | 2 | about +925 / -42 | accepted replacement for old aggregate PR 5; create/audit from `1a78db8d4ab` |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | about +287 / -15 | accepted replacement for old aggregate PR 5; create/audit from `a517f83913c`, stacked after PR 5B |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | does not claim browser-only gates, PR 6B, or malformed-save residuals beyond audited scope |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | narrow persisted-body guard |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | accepted split; repaired final head expected, import/rebase/link refresh still required |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | accepted split; stacked after PR 7A |
| PR 8 | Narrow reload-title prior-art path | No verified branch link yet | TBD | TBD | replace broad PR 8 with `origin/try/rtc-title-reload-pr`; broader persisted-record hydration remains deferred |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; final rebase/checks still required |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | start CRDT stack |
| PR 11 | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | 2 | +1145 / -4 | stacked on PR 10 |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified branch; final export/rebase still required |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | audit link for repaired content; green filing candidate is `final/rtc-pr13a-observed-delete-provenance-green` at `737fbaf0fca`, not yet verified by audit |
| PR 13B0 | Identity-smear/provenance guard before source retirement | No verified branch link yet | TBD | TBD | green filing candidate is `final/rtc-pr13b0-identity-provenance-guard` at `b64158c44d8`; import/fetch/audit required |
| PR 13B1 | Direct cross-parent source retirement | No verified branch link yet | TBD | TBD | green filing candidate is `final/rtc-pr13b1-direct-source-retirement-green` at `404f9b14231`; replaces red Cycle 110 subhead |
| PR 13B2 | Current-only cross-parent source retirement | No verified branch link yet | TBD | TBD | green filing candidate is `final/rtc-pr13b2-current-only-source-retirement-green` at `0492a7ae759`; replaces red Cycle 110 subhead |
| PR 13B3 | Explicit-base source retirement plus old accepted identity-smear tree | No verified branch link yet | TBD | TBD | green filing candidate is `final/rtc-pr13b3-explicit-base-source-retirement-green` at `ba95f820097`; latest synthesis says it is tree-equivalent to old accepted PR 13C filing tree |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | reattach after green PR 13B3, then rerun filing-repo evidence |
| PR 15A | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 | +123 / -4 | reattach after PR 14; keep reload-hydration gate spec out |
| PR 15B | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | 2 | +197 / -4 | accepted split; keep reload-hydration gate spec out |
| PR 15C | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | 2 | +161 / -4 | accepted split; keep reload-hydration gate spec out |

Old verified branches that are now prior art only:

- [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence)
  remains a verified content link for old aggregate PR 5 (`4` files,
  `+1664 / -52`), but not the recommended maintainer-facing split.
- [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record)
  remains a verified content link for old broad PR 8 (`11` files,
  `+618 / -61`), but not the active PR 8 shape.
- [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement)
  remains the verified aggregate source-retirement content link (`2` files,
  `+1672 / -4`), but the latest synthesis says not to file it.
- [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard)
  remains a verified content link for old standalone PR 13C (`2` files,
  `+345 / -51`), but the latest synthesis says the accepted content is covered
  by green PR 13B3's tree-equivalent final head after import/audit.

## Fuzz And Validation Status

Latest collected status input:

```text
collected_at_utc: 2026-05-16T09:16:05Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T080053Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Latest novelty monitor snapshot:

```text
updated: 2026-05-16T09:14:44.761Z
coverage files: 28154
total records seen: 41306
records processed this pass: 52
coverage lines seen this pass: 42722
summary files read this pass: 7
summary startup failures processed this pass: 0
new behavioral feature keys this pass: 10
new CDP coverage hashes this pass: 10
unmet goals: 9
likely-real visible: 0
likely-real merged duplicates: 0
likely-real oracle/noise questions: 0
load1: 93.53 / 64 cores
memory: 414.3G free / 492.0G total
headroom for adding groups: no
```

Enabled coverage-guided groups:

- `novelty-ws-common-blocks`
- `novelty-ws-block-gauntlet`
- `novelty-ws-real-user-editing`
- `novelty-ws-real-user-rich-text`
- `novelty-ws-async-server-blocks`
- `novelty-ws-media-cross-entity`
- `novelty-ws-long-session-large-doc`

Paused groups: none.

Recommended groups from the same snapshot are
`novelty-ws-real-user-editing`, `novelty-ws-real-user-rich-text`,
`novelty-ws-block-gauntlet`, `novelty-ws-common-blocks`,
`novelty-ws-parser-transform`, `novelty-ws-async-server-blocks`,
`novelty-ws-media-cross-entity`, and `novelty-ws-long-session-large-doc`.
Treat this as fuzz-depth guidance, not final PR-stack validation.

Current-run triage is populated and still reports no visible likely-real
failures:

```text
current output dir scope:
triage roots: 1
triage state files: 1
signatures: 421
likely-real visible: 0
likely-real merged duplicates: 0
likely-real oracle/noise questions: 0
normalization-noise candidates: 0
bootstrap stalls: 12
top duplicate family share: 0.7625
top semantic families: unknown=321, rest_meta_database_error=45,
  collaboration_non_convergence=32, assertion=18, timeout=5
```

Historical and external live triage remain noisy but are reporting/advisory
unless current-run evidence confirms product failures:

```text
closed historical scope:
triage roots: 97
triage state files: 155
signatures: 8801
bootstrap stalls: 4209
top duplicate family share: 0.4672
top semantic family: pre_action_bootstrap_stall

external live sidecar scope:
triage roots: 3
triage state files: 98
signatures: 10030
bootstrap stalls: 7308
top duplicate family share: 0.7137
top semantic family: pre_action_bootstrap_stall

combined reporting scope:
triage roots: 101
triage state files: 254
signatures: 19262
bootstrap stalls: 11529
top duplicate family share: 0.5851
top semantic family: pre_action_bootstrap_stall
```

The trend evidence packet was generated at `2026-05-16T09:07:11Z` from monitor
data through `2026-05-16T09:06:52Z`:

```text
monitor passes: 1391
coverage files: 272 -> 28024
coverage files delta: 27752
unmet coverage goals: 24 -> 9
likely_real_max: 0
duplicate_share_current_last: 0.7558
duplicate_share_historical_last: 0.4672
summary_startup_failures_last: 0
quality_issues_last: 2
fuzz level mix: browser-e2e=31 lanes/31 groups; transport-integration=1 lane/1 group
```

Largest current unmet goals in the trend packet:

- CDP coverage records: `4488/5000`
- successful real-user-editing records: `264/500`
- `core/html`: `321/500`
- `core/details`: `365/500`
- `core/more`: `366/500`
- `ui-heading-shortcut`: `411/500`
- `reload-post-action`: `433/500`
- `core/gallery`: `482/500`
- real-user body save/reload template: `197/200`

This fuzz status is health and coverage-depth evidence for the active
validation infrastructure. It is not final-stack validation and does not make
the PR split filing-ready.

## Status-Persona Analysis

Completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` are still useful for report hygiene:
remove stale PR 13 repair-missing language, separate current-run fuzz health
from historical noise, keep evidence-only families out of the split, and make
filing gates explicit. Some older status-analysis conclusions are stale,
including the recommendation to keep the old three-part PR 13 shape.

The newest completed split-persona synthesis is
`pr-split-20260516T090702Z-synthesis.md`. It says:

- The split needs a PR 13 change and is not filing-ready.
- The PR 13 adjudication report has landed and selected a repaired green split,
  not a collapse.
- The green sequence is PR 13A observed-delete provenance, PR 13B0
  identity/provenance guard, PR 13B1 direct source retirement, PR 13B2
  current-only source retirement, and PR 13B3 explicit-base source retirement.
- Old aggregate PR 13B, old PR 13C wording/head, and the Cycle 110 red
  tri-split heads must be removed from filing heads and push allow-lists.
- PR 14 and PR 15 must be reattached on green PR 13B3.
- The green refs exist in the PR 13 job clone but were not found in the
  fix-planning repo, so they need import/fetch, branch graph, containment,
  adjacent range-diff, diffstat/numstat, focused tests, lint, and
  `git diff --check` from the actual filing repo.
- PR 6B replay should wait until PR 13 finalization reconciliation completes.

The newest completed pr-split feedback-action is
`pr-split-20260516T085735Z-feedback-action.md`. It is superseded on PR 13
status by the `090702Z` synthesis because that later synthesis says the
previously empty PR 13 adjudication report has landed.

The latest duplicate-noise synthesis file,
`duplicate-noise-20260516T090853Z-synthesis.md`, is zero bytes and has no
usable completed analysis. The newest completed duplicate-noise synthesis is
`duplicate-noise-20260516T084305Z-synthesis.md`; the newest completed
duplicate-noise feedback-action is
`duplicate-noise-20260516T084305Z-feedback-action.md`.

Completed duplicate/noise analysis changes no product PR validation status. It
records a control-plane admission issue, not a product failure:

- Coverage-guided current-run triage is now measurable, with one current-run
  triage state file and `0` visible likely-real failures.
- Startup/noise accounting was improved in `bin/rtc-browser-fuzz-supervisor.mjs`
  and `bin/rtc-browser-fuzz-novelty-monitor.mjs`, and both files passed
  `node --check`.
- The gate-only triage watcher completed once with `candidates=426`,
  `signatures=359`, `active=0`, and `analysisGated=0`.
- The novelty and supervisor sessions were restarted, a current-run gate-only
  triage session was started, and an open-ended coverage-guidance Codex session
  was stopped.
- Remaining duplicate/noise risk is unresolved `unknown` signatures queued
  rather than semantically capped because that action did not edit the triage
  watcher or analysis tier.

This control-plane work is useful, but it is not a substitute for PR 13 import,
focused post-rebase tests, or fresh combined-stack validation.

## Deferred Or Evidence-Only Work

These must not be described as fixed.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR 6B save snapshot/no-op guard candidate | `final/rtc-pr06b-save-snapshot-noop-guard`; seeds `5500001`, `5500002`, `5500006` | blocked candidate, not part of filing-ready split; exclude from wildcard final-ref import and from PR 6 claims | After PR 13 finalization reconciliation, run a bounded focused `ws-parser-transform` replay; pass condition is no duplicated content marker at `save-checkpoint-persisted-crdt-projection`; drop PR 6B if replay fails |
| PR 6C malformed evaluated save content | no verified filing branch | blocked pending Jest, lint, and replay evidence | Promote only after focused product evidence and a verified branch link exist |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; active PR 8 is only the narrow title-reload prior-art path | Shape and audit the narrowed title-reload branch; give any remaining persisted-record hydration claim separate product evidence and a verified branch link |
| Reload hydration empty live editor | `e75c8829e4e9`, `3bbdc3cdb393`; gate branch `try/rtc-reload-hydration-gate-e75c8829` | evidence-only; not in PR 6, PR 6A, PR 8, PR 15, or fallback-group claims | Promote only if a clean gate reaches the post-reload assertion and live editor state stays empty after exact-room WebSocket sync while REST body and persisted `_crdt_document` remain populated |
| Pre-save search/live document collapse | `ddf9559af37e`, `0932bed35c7a`, conditional `1e0ade5ec5a8`; `try/rtc-pre-save-search-collapse-gate-ddf9559` | evidence-only; not in active split | Capture editor blocks, serialized content, core-data edited record, live CRDT record, provider state, REST body, and save state before/after `core/search` insertion |
| Rich-text formatted suffix corruption | `4148230f681d`, `b0db7b80c6f2`, `dc8ea6e78d4d`, `1ccac75d7faa`, `2722f0e897de`, `712b98ba96ff` | not fixed; latest split synthesis keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Malformed save payload and save-settlement residuals | `fc154ebec48c`, `e40aa1b7863d`, `f51c425df8a5`, `f46859898576`, `afd389d7f139`, `02289235f55f`, `eef8b8932e11`, `b60eecd4ac03` | deferred beyond isolated PR 6B/6C candidates | Create a source-level `saveEntityRecord()` / `prePersistPostType()` repro where clean local blocks exist but evaluated outgoing `content` is malformed |
| HTTP polling room-isolation residuals | `f5738470d026`, `fda8d2334e65`, conditional `fc99825fb6c2`, `b75435787be1`; possible `PR 1A` | deferred; possible PR 1A is not in the active split | Promote only if fuzzing still shows healthy post rooms stalled by auxiliary room failures after PR 1/2 |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr` branches as-is.

Before filing any maintainer-facing PR, require:

1. Import/fetch the green PR 13 refs from the PR 13 job repo into the
   filing/finalization repo.
2. Reconcile the finalization split and push allow-list so old aggregate
   PR 13B, old PR 13C wording/head, and red Cycle 110 PR 13B1/B2/B3 heads are
   not imported or filed.
3. Reattach PR 14 and PR 15 on green PR 13B3.
4. Regenerate branch graph/containment evidence and adjacent
   range-diffs/diffstats from the actual filing repo.
5. Rerun focused checks, touched-file lint, and `git diff --check` on every
   imported/rebased branch.
6. Decide whether the separate 40-commit validation lineage must be rewritten;
   if yes, do one bounded rebuild using the green PR 13 boundaries.
7. Shape and audit PR 5A/5B/5C and narrow PR 8, or explicitly defer them.
8. Rebase or recreate each intended PR branch on the intended upstream base.
9. Drop analysis-only artifacts and keep only product code plus focused tests.
10. Assemble a fresh final combined validation stack from the actual PR heads.
11. Run final focused checks and coverage-guided fuzzing on that stack.
12. Block filing if new visible likely-real failures appear.

Existing fuzz infrastructure can continue where healthy. The current populated
novelty snapshot has `0` visible likely-real failures, `9` unmet goals,
`7` enabled WS coverage-guided groups, no paused groups, and no sampled headroom
for adding groups. None of this is broad final-stack coverage or PR-filing
validation. Broad fuzzing waits for corrected final PR heads and a fresh
combined validation stack.
