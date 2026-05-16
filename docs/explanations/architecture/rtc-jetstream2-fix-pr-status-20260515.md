# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T14:45:53Z`

Trigger event:
`pr-split-2026-05-16T14-45-09Z-20260516T143821Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-16T14-45-09Z-20260516T143821Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked, but not on split design. The newest split-persona
synthesis, `pr-split-20260516T143821Z-synthesis.md`, keeps the
Cycle 134/146/148/150 explicit 28-head allow-list as the replacement filing
shape. The remaining blocker is credible final-stack WebSocket validation: seed
`1020002` still has an unclassified post-first-action marker divergence, the
previous classifier output was only `launcher-no-report` with `codex rc: 1`
after a Codex `429 Too Many Requests` failure, and the already-launched bounded
classifier retry is still active without a usable `report.md`.

Use this replacement split, not the older aggregate split:

```text
PR01-PR04
PR05A -> PR05B -> PR05C
PR06 -> PR06A
PR07A -> PR07B
PR09 -> PR10
PR11A -> PR11B -> PR11C -> PR11D -> PR11E
PR12
PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
PR14
PR15A -> PR15B -> PR15C
```

The clean structural validation ref remains:

```text
validation/rtc-final-combined-stack-post-pr11-20260516T110608Z
921f093cc47b46844bf8fb48552483686c55ef6b
```

That rebuild reported focused CRDT checks, touched-file JS lint,
`git diff --check`, containment, range-diff, and diffstat evidence passing.
Treat it as structural and focused-check evidence for the rebuilt stack. It is
not final-stack fuzz validation.

Cycle 150 launched exactly one bounded rerun of the seed `1020002`
marker-divergence classifier after preserving the failed launcher output. Let
that active job finish; do not launch a new split-review or fuzz job while it is
running:

```text
job: rtc-ws-seed-1020002-marker-divergence-followup-rerun
script: /media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T142344Z/jobs/run-rtc-ws-seed-1020002-marker-divergence-followup-rerun-20260516T142344Z.sh
expected report: /media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T142344Z/jobs/outputs/rtc-ws-seed-1020002-marker-divergence-followup-rerun-20260516T142344Z/report.md
```

After that report exists, it must classify seed `1020002` as harness-only,
product behavior, infrastructure, or needing narrower instrumentation. If the
active tmux job exits without a usable report, the only permitted follow-up is a
single bounded rerun of the same script. Only after the classifier writes a real
report should bounded final-stack validation resume on
`validation/rtc-final-combined-stack-post-pr11-20260516T110608Z` at
`921f093cc47b46844bf8fb48552483686c55ef6b`.

Do not launch broad final-stack fuzz, extra fuzz lanes, reload diagnostics,
PR13 repair/import, PR6B/PR6C/PR16 work, or another split-review loop until the
seed `1020002` classifier produces a real report. Existing coverage-guided
background fuzz can continue.

Deferred/evidence-only work remains outside the filing split: reload-hydration
empty-live-editor, pre-save search/live-collapse, rich-text suffix corruption,
broader malformed-save residuals, HTTP room-isolation residuals, seed
`5500002`, `PR 1A`, `PR 6B`, `PR 6C`, and blocked `PR 16`.

## Latest Branch And Ref Status

The collected remote status input was generated at `2026-05-16T14:45:49Z`.

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
copied into a clean evidence worktree for the reload-hydration gate.

The fuzz repo remains on the validation stack:

```text
## try/rtc-fix-stack-validation
72854f05ed2 Hydrate saved CRDT responses without invalidation
```

That stack still has modified product/test files and many untracked fuzz,
analysis, and documentation artifacts. It is active validation infrastructure,
not the final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-16T14:45:53Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`.

For repaired PR 13 content, use only these audit refs:

- [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired)
- [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement)
- [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard)

Do not link the stale or misordered PR 13 refs listed in the audit under
"Explicitly Not PR-Content Links":
`review/rtc-pr13a-observed-delete-provenance`,
`review/rtc-pr13b-stale-block-identity-smear`, or
`review/rtc-pr13c-cross-parent-source-retirement`.

The supporting provenance base
[`shape/rtc-crdt-pr12-previous-local`](https://github.com/danluu/gutenberg/tree/shape/rtc-crdt-pr12-previous-local)
is pushed only so the repaired PR 13A compare link has the source base.

## Proposed PR Split

Every proposed row either uses a clickable branch link from the verified
branch-link audit or explicitly says `No verified branch link yet`.

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified branch; keep in replacement split |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified branch; keep in replacement split |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; seed `5500002` marker-retention remains a separate follow-up |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified branch; keep in replacement split |
| PR 5A | Entity/entity-reference normalization in `crdt.ts` | No verified branch link yet | 2 | +465 / -8 | replacement for old aggregate PR 5; allow-list head exists but needs audited review branch |
| PR 5B | Parser/rich-text HTML equivalence in `crdt-blocks.ts` | No verified branch link yet | 2 | +925 / -42 | replacement for old aggregate PR 5; allow-list head exists but needs audited review branch |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | +287 / -15 | replacement for old aggregate PR 5; allow-list head exists but needs audited review branch |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified branch; excludes dropped PR 6B and broader malformed-save residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified branch; narrow persisted-body guard |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified branch; repaired split head |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified branch stacked after PR 7A; repaired split head |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; keep in replacement split |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified branch; start CRDT block stack |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | 2 | +257 / -3 | green in validation-stack rebuild; needs audited review branch before filing |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | 2 | +240 / -2 | green in validation-stack rebuild; needs audited review branch before filing |
| PR 11C | Explicit-base middle insert | No verified branch link yet | 2 | +220 / -0 | green in validation-stack rebuild; needs audited review branch before filing |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | 2 | +259 / -0 | green in validation-stack rebuild; needs audited review branch before filing |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | 2 | +170 / -0 | green in validation-stack rebuild; needs audited review branch before filing |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified branch; keep in replacement split |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired audit link; first maintainer-facing PR 13 delta |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired audit link; covers source-retirement content while green B1/B2/B3 subheads lack individual audit rows |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired audit link; covers identity/provenance guard content while green B0 lacks its own audit row |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified branch; keep after PR13 source sequence |
| PR 15A | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 | +123 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 15B | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | 2 | +197 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 15C | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | 2 | +161 / -4 | verified branch; keep reload-hydration gate spec out |

Verified branches that are now prior art or staging only:

- [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence)
  is verified content for old aggregate PR 5 (`4` files, `+1664 / -52`), not
  the recommended maintainer-facing split.
- [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record)
  is verified content for old broad PR 8 (`11` files, `+618 / -61`), not an
  active filing unit.
- [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops)
  is verified content for old aggregate PR 11 (`2` files, `+1145 / -4`), but
  the active recommendation is the green PR 11A-E split.

The latest allow-list shape still names green source subheads
`PR 13B0/B1/B2/B3`. Those are source-shaping facts for the validation ref.
Until individual branch-link-audit rows exist for those subheads, the
maintainer-facing PR13 links are the repaired audited `PR 13A/B/C` refs shown
above.

## Fuzz And Validation Status

Latest collected status input:

```text
collected_at_utc: 2026-05-16T14:45:49Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T143955Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The raw `novelty-status.md` input is present for the fresh
`run-20260516T143955Z` coverage root. Treat it as current-root control-plane
state, not final-stack validation:

```text
updated: 2026-05-16T14:45:18.652Z
coverage files: 33087
total records seen: 49024
records processed this pass: 5
current-run records: {"persistence-no-title":1,"session-lifecycle":1}
current-run successful records: {}
current-run pre-action startup failures: {"persistence-no-title":1}
new behavioral feature keys this pass: 2
new CDP coverage hashes this pass: 1
likely-real visible: 0
quality issues: 0
current triage signatures: 3
current top duplicate family share: 0.6667
enabled groups: novelty-ws-lifecycle, novelty-http-persistence-probe
recommended groups: none
startup-noise held recommended groups: real-user-editing, real-user-rich-text,
  block-gauntlet, common-blocks, parser-transform, async-server-blocks,
  media-cross-entity, long-session-large-doc
startup-noise probation: historical pre_action_bootstrap_stall
  14232/24132 signatures, share=0.5898; successful current-run records=0 total
health: ok
```

This means the newest root has reset run-local evidence, the startup-noise
warmup cap is active, only the lifecycle and HTTP persistence canaries are
enabled, and current-run successes are still zero. Do not present this minimal
current-root state as product approval.

The latest available trend evidence packet was generated at
`2026-05-16T14:41:03Z` from monitor data through `2026-05-16T14:38:25Z`:

```text
monitor passes: 1542
coverage files: 272 -> 33071
coverage files delta: 32799
unmet coverage goals: 24 -> 5
likely_real_max: 0
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.5921
summary_startup_failures_last: 0
quality_issues_last: 1
enabled groups current: novelty-ws-lifecycle, novelty-http-persistence-probe
fuzz level mix: browser-e2e=27 lanes/27 groups
browser-e2e execution: 49937 cumulative / 2220 per-hour
transport-integration execution: 3006 cumulative / 0 per-hour
load1: 40.13 / 64 cores
memory: 445.5G free / 492.0G total
```

Largest remaining trend goals:

- successful real-user-editing records: `284/500`
- `core/html`: `366/500`
- CDP coverage records: `4870/5000`
- `core/details`: `406/500`
- `core/more`: `421/500`

Weak completion profiles remain a reason to prefer guarded top-offs and
startup-stall reduction over simply increasing browser concurrency. The weakest
success ratios in the trend packet are `full` (`18/840`),
`revision-persistence` (`76/3381`), `multi-reload-lifecycle` (`58/2504`),
`parser-serialization` (`60/2014`), and `real-user-editing` (`284/5083`).

This trend packet is background fuzz-health and control-plane evidence. It is
not final-stack validation because the final-stack WebSocket path is still
blocked on the seed `1020002` marker-divergence classifier.

The previous bootstrap state has advanced: the active blocker is no longer just
"WS bootstrap report missing." The latest split synthesis says seed `1020002`
reached post-first-action marker divergence, but the follow-up classifier did
not produce a usable classification report because the Codex CLI hit `429 Too
Many Requests` and the wrapper wrote `launcher-no-report`. The bounded retry is
already running and has not yet produced `report.md`; wait for that report
before making any filing claim or starting another broad validation pass.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260516T143821Z-synthesis.md`. Its consensus:

- Keep the Cycle 134/146/148/150 explicit 28-head allow-list as the replacement
  filing shape.
- Do not file from wildcard `final/rtc-pr*`.
- Do not file aggregate PR5/PR11/PR15, old or red PR13 heads, broad PR8/PR8A,
  former PR6B/PR6C, `shape/*`, `finalize/*`, `deferred/*`, dirty worktrees, or
  `try/rtc-fix-stack-validation`.
- Keep reload-hydration, pre-save collapse, rich-text suffix corruption,
  malformed-save residuals, HTTP room-isolation residuals, seed `5500002`,
  `PR 1A`, `PR 6B`, `PR 6C`, and `PR 16` deferred/evidence-only.
- Let the active seed `1020002` marker-divergence classifier finish before
  final-stack validation, filing, broad fuzzing, or another split-review loop.

The latest split feedback action file for `20260516T143821Z` is empty, so it
records no new automatic action. The previous non-empty split feedback action
for `20260516T142344Z` applied the Cycle 150 documentation/action feedback to
the remote split report and launched exactly one bounded retry:

```text
rtc-ws-seed-1020002-marker-divergence-followup-rerun
```

No product files were edited by this status update.

The newest duplicate/noise synthesis,
`duplicate-noise-20260516T143459Z-synthesis.md`, classifies the remaining
duplicate/noise problem as an admission-control mismatch, not product-code
failure. The runner and monitor can identify strict no-user/no-action startup
noise, but `rtc-browser-fuzz-triage-watcher.mjs` still has a narrower
suppression predicate than the runner startup gate, so some strict
`seed/bootstrap/open/join` stalls remain queued for expensive analysis.

The latest duplicate/noise feedback action remains
`duplicate-noise-20260516T140722Z-feedback-action.md`. It changed only
`bin/rtc-browser-fuzz-novelty-monitor.mjs`, passed
`node --check bin/rtc-browser-fuzz-novelty-monitor.mjs`, restarted
`rtc-coverage-guided-novelty`, and confirmed active
`rtc-coverage-guided-novelty`, `rtc-coverage-guided-supervisor`, and
`rtc-coverage-guided-triage` sessions. The control-plane change gates browser
admission under bounded historical/live startup-noise probation, dedupes
summary startup failures by output/profile/seed, and prefers canaries or
current-run-clean floor groups before broad expansion.

Remaining duplicate/noise follow-up from the latest synthesis:

- Add a strict pre-action startup-noise predicate in
  `bin/rtc-browser-fuzz-triage-watcher.mjs`.
- Add a matching analysis-tier skip in
  `bin/rtc-browser-fuzz-analysis-tier.mjs`.
- Require the predicate to prove `userCount === 0`, no editor action, phase in
  `seed/bootstrap/open/join`, startup/discovery/bootstrap wait failure or
  runner `preAnalysisGate.bucket === "pre-action-bootstrap-stall"`, and no
  save/reload/lifecycle/operation/fault/persistence/oracle product evidence.
- Validate with `node --check` for both changed files, synthetic positive and
  negative fixtures, and a short observation that strict startup noise stops
  entering `queued`/`retry`/`running`.
- Keep failures recorded and never suppress post-action, late-session,
  assertion, timeout, non-convergence, persistence, operation-witness, or
  likely-real cases.
- Treat historical known-noise import, novelty-monitor scheduler changes, and
  raw/final summary coalescing as follow-ups unless the strict current-run
  startup gate still leaks duplicate work.

This is control-plane follow-up only and is not product PR content.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older warning that the
GitHub-facing PR13 review links were stale is superseded by the
`2026-05-16T14:45:53Z` branch-link audit, which verifies the repaired PR 13
review refs listed above.

## Deferred Or Evidence-Only Work

These must not be described as fixed.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Dropped PR 6B save snapshot/no-op guard | `final/rtc-pr06b-save-snapshot-noop-guard`; seeds `5500001`, `5500002`, `5500006` | dropped from filing path and allow-list after corrected replay classification | Do not rerun as the next gate; track seed `5500002` separately as revision-restore marker retention if it reproduces cleanly |
| PR 6C malformed evaluated save content | no verified filing branch | blocked/deferred pending focused Jest, lint, and replay evidence | Promote only after focused product evidence and a verified branch link exist |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit | Shape and audit a narrowed title-reload branch only if PR 8A is revived; give any persisted-record hydration claim separate product evidence and a verified branch link |
| Reload hydration empty live editor | `e75c8829e4e9`, `3bbdc3cdb393`; gate branch `try/rtc-reload-hydration-gate-e75c8829` | evidence-only; not in PR 6, PR 6A, PR 8, PR 15, or fallback-group claims | Promote only if a clean gate reaches the post-reload assertion and live editor state stays empty after exact-room WebSocket sync while REST body and persisted `_crdt_document` remain populated |
| Pre-save search/live document collapse | `ddf9559af37e`, `0932bed35c7a`, conditional `1e0ade5ec5a8`; `try/rtc-pre-save-search-collapse-gate-ddf9559` | evidence-only; not in active split | Capture editor blocks, serialized content, core-data edited record, live CRDT record, provider state, REST body, and save state before/after `core/search` insertion |
| Rich-text formatted suffix corruption | `4148230f681d`, `b0db7b80c6f2`, `dc8ea6e78d4d`, `1ccac75d7faa`, `2722f0e897de`, `712b98ba96ff` | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Malformed save payload and save-settlement residuals | `fc154ebec48c`, `e40aa1b7863d`, `f51c425df8a5`, `f46859898576`, `afd389d7f139`, `02289235f55f`, `eef8b8932e11`, `b60eecd4ac03` | deferred beyond dropped PR 6B and isolated PR 6C candidate | Create a source-level `saveEntityRecord()` / `prePersistPostType()` repro where clean local blocks exist but evaluated outgoing `content` is malformed |
| PR 16 valid-block `originalContent` candidate | seed replay candidate only | blocked/deferred; latest split synthesis says it is not part of the filing stack | Replay and classify the seed before considering any product branch or verified branch link |
| HTTP smoke `rest_crdt_document_stale` | final-stack bootstrap repair reached one HTTP action before this signal | separate triage signal; not split coverage and not a final-stack fuzz pass | Classify separately after the seed `1020002` WebSocket classifier produces a usable result |
| HTTP polling room-isolation residuals | `f5738470d026`, `fda8d2334e65`, conditional `fc99825fb6c2`, `b75435787be1`; possible PR 1A | deferred; possible PR 1A is not in the active split | Promote only if fuzzing still shows healthy post rooms stalled by auxiliary room failures after PR 1/2 |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr` branches as-is.

Before filing any maintainer-facing PR:

1. Use only the explicit filing/push allow-list from the clean validation-stack
   rebuild. Do not wildcard import or file `final/rtc-pr*`.
2. Keep old aggregate PR 5, broad PR 8, aggregate PR 11, stale/misordered PR 13
   refs, dropped PR 6B, PR 6C, PR16 seed-replay candidates, dirty evidence
   branches, and the untracked reload-hydration gate spec out of filing
   branches and push allow-lists.
3. Push/import and audit individual PR 5A/5B/5C and PR 11A-E review branches,
   or keep the table rows marked `No verified branch link yet`.
4. Use the repaired audited PR13A/B/C review refs for maintainer-facing PR13
   links until the green PR13B0/B1/B2/B3 subheads have verified audit rows.
   Do not file old aggregate PR 13B, old PR 13C, Cycle 110 red tri-split refs,
   or stale/misordered review refs.
5. Rebase or recreate each intended PR branch on the intended upstream base if
   that base moves.
6. Regenerate branch graph/containment evidence and adjacent
   range-diffs/diffstats from the actual filing repo.
7. Rerun focused checks, touched-file lint, and `git diff --check` on every
   imported/rebased branch.
8. Keep dirty analysis-only artifacts out of product PR branches.
9. Wait for the already-launched bounded seed `1020002` classifier retry to
   write a usable report at the Cycle 150 output path above. Do not launch broad
   final-stack fuzz, extra fuzz lanes, reload diagnostics, PR13 repair/import,
   PR6B/PR6C/PR16 work, or another split-review loop until that report exists
   and classifies the marker divergence.
10. After seed `1020002` is classified as harness-only, product behavior,
   infrastructure, or needing narrower instrumentation, rerun bounded
   final-stack validation against
   `validation/rtc-final-combined-stack-post-pr11-20260516T110608Z` at
   `921f093cc47b46844bf8fb48552483686c55ef6b`. Count it only if it reaches
   action-level product coverage.
11. Block filing if new visible likely-real failures appear.

Existing fuzz infrastructure can continue where healthy. The latest trend
evidence has `likely_real_max: 0`, `5` unmet goals, graph current duplicate
share `0`, and browser-e2e execution at `49937` cumulative / `2220` per-hour.
The raw `novelty-status.md` for the newer current root has `likely-real
visible: 0`, lifecycle plus HTTP persistence canaries enabled, two current-run
records, three current triage signatures, no quality issues, and no current-run
successes yet. Treat both the trend packet and current novelty status as useful
control-plane and fuzz-health evidence, not final-stack fuzz validation.
