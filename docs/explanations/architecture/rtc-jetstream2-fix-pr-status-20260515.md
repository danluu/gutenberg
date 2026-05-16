# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T08:33:26Z`

Trigger event:
`pr-split-2026-05-16T08-32-14Z-20260516T082656Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Base handoff:
`docs/explanations/architecture/rtc-likely-real-bug-handoff-20260514.md`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-16T08-32-14Z-20260516T082656Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The current plan is not filing-ready. The latest split persona synthesis,
`pr-split-20260516T082656Z-synthesis.md`, confirms the active PR 13 status is
"tri-split needs repair."

Current PR 13 conclusion:

- Do not file the old aggregate `final/rtc-pr13b-source-retirement`.
- Do not file the current `PR 13B1` / `PR 13B2` / `PR 13B3` heads as-is. The
  referenced Cycle 110 report shows focused CRDT failures at each standalone
  PR 13B subhead, even though the combined validation head passes.
- Test one smaller green sequence next:
  `PR 13A -> identity-smear/provenance guard -> direct source retirement -> current-only source retirement -> explicit-base source retirement`.
- If every intermediate PR head cannot pass focused CRDT tests, collapse
  `PR 13B1 + PR 13B2 + PR 13B3 + PR 13C` into one complete
  source-retirement/identity-smear PR rather than filing broken stacked heads.

Other split decisions from the latest persona analysis:

- Keep the accepted splits for `PR 5A/5B/5C`, `PR 7A/7B`, and
  `PR 15A/15B/15C`.
- Replace the broad `PR 8` row with a narrow title-reload path from
  `origin/try/rtc-title-reload-pr`; broader persisted-record hydration remains
  deferred.
- Keep `PR 6B` blocked until focused replay of `ws-parser-transform` seeds
  `5500001`, `5500002`, and `5500006` passes; drop `PR 6B` if replay fails.
- Keep reload-hydration empty-live-editor, pre-save search/live-collapse,
  rich-text suffix corruption, HTTP room isolation, and `PR 1A`
  evidence-only/deferred.

The next maintainer-facing branch step is one bounded PR 13 restack/adjudication
job using the Cycle 110 evidence. This status update did not launch that job.
Do not start broad fuzzing, final-stack fuzzing, reload diagnostics, duplicate
tri-split work, or `PR 6B` replay until PR 13 has independently green filing
heads.

## Latest Branch And Ref Status

The collected remote status input was generated at `2026-05-16T08:33:22Z`.

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

The branch-link audit was generated at `2026-05-16T08:33:26Z` from fetched
`danluu` refs. The proposed PR table below uses only rows marked
`verified-content` as PR-content links, or explicitly says
`No verified branch link yet`.

Use only these repaired PR 13 audit refs when mentioning current PR 13 review
content:

| Purpose | Verified branch containing audited content | Current SHA | Status |
| --- | --- | --- | --- |
| PR 13A observed-delete provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | `eddf2dd38c09` | still the repaired first PR 13 head |
| Aggregate PR 13B source-retirement provenance | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | `6ea7f425b009` | verified content, but rejected as a filing head by the latest synthesis |
| PR 13C stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | `fa0f00a1c025` | verified content, but ordering may change or collapse into the PR 13 repair |

Do not use these stale or misordered refs as PR-content links for repaired
PR 13:

- `review/rtc-pr13a-observed-delete-provenance`
- `review/rtc-pr13b-stale-block-identity-smear`
- `review/rtc-pr13c-cross-parent-source-retirement`

The supporting provenance base
[`shape/rtc-crdt-pr12-previous-local`](https://github.com/danluu/gutenberg/tree/shape/rtc-crdt-pr12-previous-local)
is pushed only so the repaired PR 13A compare link has the source base.

## Proposed PR Split

The old aggregate PR 5, broad PR 8, aggregate PR 13B, and aggregate PR 15 rows
are stale for maintainer-facing filing. The table is the current working split.
Rows without an audited branch explicitly say `No verified branch link yet`.

For PRs whose final filing head is expected to come from a repaired
`final/rtc-pr*` ref, the audit link is the latest verified GitHub content link,
not proof that the branch is ready to file without import, rebase, checks, and
final validation.

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified branch; final rebase/checks still required |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified branch; final rebase/checks still required |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; final rebase/checks still required |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified branch; final rebase/checks still required |
| PR 5A | Entity/entity-reference normalization in `crdt.ts` | No verified branch link yet | 2 | about +465 / -8 | accepted replacement for old PR 5; create/audit from `f39c621c90d` plus `589226af0fe` |
| PR 5B | Parser/rich-text HTML equivalence in `crdt-blocks.ts` | No verified branch link yet | 2 | about +925 / -42 | accepted replacement for old PR 5; create/audit from `1a78db8d4ab` |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | about +287 / -15 | accepted replacement for old PR 5; create/audit from `a517f83913c`, stacked after PR 5B |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | does not claim browser-only gates, PR 6B, or malformed-save residuals beyond audited scope |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | narrow persisted-body guard |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | accepted split; repaired final head expected, import/rebase/link refresh still required |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | accepted split; stacked after PR 7A |
| PR 8 | Narrow reload-title prior-art path | No verified branch link yet | TBD | TBD | replace broad PR 8 with `origin/try/rtc-title-reload-pr`; broader persisted-record hydration remains deferred |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; final rebase/checks still required |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | start CRDT stack |
| PR 11 | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | 2 | +1145 / -4 | stacked on PR 10 |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified branch; final export/rebase still required |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired first PR 13 head |
| PR 13B0 | Identity-smear/provenance guard before source retirement | No verified branch link yet | TBD | TBD | preferred repair step after PR 13A; must make later source-retirement heads independently green |
| PR 13B1 | Direct cross-parent source retirement | No verified branch link yet | 2 | about +484 / -0 | do not file current failed subhead; repair/adjudicate with focused CRDT tests |
| PR 13B2 | Current-only cross-parent source retirement | No verified branch link yet | 2 | about +412 / -4 | do not file current failed subhead; repair/adjudicate with focused CRDT tests |
| PR 13B3 | Explicit-base source retirement | No verified branch link yet | 2 | about +778 / -2 | do not file current failed subhead; repair/adjudicate with focused CRDT tests |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | verified content, but latest repair may move this earlier or collapse it with PR 13B |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | repaired final head expected after PR 13 repair |
| PR 15A | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 | +123 / -4 | accepted split; keep reload-hydration gate spec out |
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

## Fuzz And Validation Status

Latest collected status input:

```text
collected_at_utc: 2026-05-16T08:33:22Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T080053Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Latest novelty monitor snapshot:

```text
updated: 2026-05-16T08:31:40.085Z
coverage files: 27381
total records seen: 40203
records processed this pass: 54
coverage lines seen this pass: 41534
summary files read this pass: 7
summary startup failures processed this pass: 0
new behavioral feature keys this pass: 9
new CDP coverage hashes this pass: 9
unmet goals: 9
likely-real visible: 0
likely-real merged duplicates: 0
likely-real oracle/noise questions: 0
load1: 75.53 / 64 cores
memory: 417.6G free / 492.0G total
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

Recommended groups from the same snapshot include the enabled groups above plus
`novelty-ws-parser-transform`. Treat this as fuzz-depth guidance, not final
PR-stack validation.

Current-run triage remains empty and reports no visible failures in the
generated novelty snapshot:

```text
current output dir scope:
triage roots: 1
triage state files: 0
signatures: 0
likely-real visible: 0
likely-real merged duplicates: 0
likely-real oracle/noise questions: 0
normalization-noise candidates: 0
bootstrap stalls: 0
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
signatures: 9473
bootstrap stalls: 6968
top duplicate family share: 0.7199
top semantic family: pre_action_bootstrap_stall

combined reporting scope:
triage roots: 101
triage state files: 253
signatures: 18274
bootstrap stalls: 11177
top duplicate family share: 0.5982
top semantic family: pre_action_bootstrap_stall
```

The trend evidence packet was generated at `2026-05-16T08:26:39Z` from monitor
data through `2026-05-16T08:25:20Z`. It supports continuing coverage progress
with no visible likely-real failures so far:

```text
monitor passes: 1371
coverage files: 272 -> 27251
coverage files delta: 26979
unmet coverage goals: 24 -> 9
likely_real_max: 0
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.4672
summary_startup_failures_last: 0
fuzz level mix: browser-e2e=31 lanes/31 groups; transport-integration=1 lane/1 group
```

Largest current unmet goals in the trend packet:

- CDP coverage records: `4328/5000`
- successful real-user-editing records: `255/500`
- `core/html`: `314/500`
- `core/details`: `350/500`
- `core/more`: `358/500`
- `ui-heading-shortcut`: `390/500`
- `reload-post-action`: `410/500`
- `core/gallery`: `455/500`
- real-user body save/reload template: `186/200`

This fuzz status is health and coverage-depth evidence for the active
validation infrastructure. It is not final-stack validation and does not make
the PR split filing-ready.

Completed validation evidence that still matters:

- PR 13 source-import gate:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260515T212143Z/jobs/outputs/pr13-source-import-verify-retry3-20260515T212143Z/report.md`
- That report recorded `63/63` focused stale top-level CRDT tests passing,
  touched-file JS lint passing, and `git diff --check` passing for the earlier
  repaired PR 13 source heads.
- Newer Cycle 110 PR 13B tri-split evidence supersedes the old filing
  conclusion: the smaller source-retirement subheads now need repair because
  each standalone subhead failed focused CRDT tests.

## Status-Persona Analysis

Completed status-analysis reports through
`final-20260516T040744Z-final-analysis` agree on the report shape: remove stale
PR 13 repair-missing language, separate current-run fuzz health from historical
noise, keep evidence-only families out of the split, and make filing gates
explicit. Some older status-analysis details are stale, including the claim
that only an HTTP persistence probe was enabled; the raw
`2026-05-16T08:31:40Z` novelty snapshot is the source for the current enabled
WS groups and current triage status.

The newest split persona synthesis is
`pr-split-20260516T082656Z-synthesis.md`. It says:

- The split needs a change and is not filing-ready.
- The old aggregate `final/rtc-pr13b-source-retirement` must not be filed.
- The current `PR 13B1/13B2/13B3` heads also must not be filed as-is because
  focused CRDT tests fail at each standalone subhead.
- The preferred next repair is identity-smear/provenance before source
  retirement, followed by direct, current-only, and explicit-base source
  retirement.
- If every intermediate head cannot be made green, collapse the
  source-retirement plus identity-smear work into one complete PR instead of
  filing broken stacked heads.
- PR 8 must be narrowed around `origin/try/rtc-title-reload-pr`.
- PR 6B and reload/pre-save/rich-text/HTTP residuals remain deferred until
  focused evidence lands.

The matching latest pr-split feedback-action,
`pr-split-20260516T082656Z-feedback-action.md`, is zero bytes, so this cycle
records no newer automatic split action. The previous actionable feedback file,
`pr-split-20260516T080500Z-feedback-action.md`, launched
`rtc-pr13b-trisplit-shape-check-20260516T080500Z`; the latest synthesis consumes
the resulting Cycle 110 evidence and says that tri-split needs repair, not
filing.

The newest duplicate-noise synthesis is
`duplicate-noise-20260516T081555Z-synthesis.md`. It changes no product PR
validation status. Its consensus is that the remaining duplicate/noise issue is
mostly control-plane mismatch:

- Current-run live triage is effectively absent or broken, including invalid
  generated shell loops in the live-analysis command builder.
- The triage watcher should suppress or canonicalize strict no-user/no-action
  pre-action bootstrap stalls before Codex/deep analysis sees them.
- Live-analysis startup should be gated on non-suppressed launchable
  candidates.
- Supervisor startup-stall handling should use a dominance/rate guard while
  preserving real product failures.
- Do not suppress late-session stalls, post-action failures, assertions,
  non-convergence, operation-witness issues, persistence/save/title/content
  failures, unknowns after user activity, or non-exact REST/meta cases.

The matching duplicate-noise feedback-action updated only
`bin/rtc-browser-fuzz-supervisor.mjs` in the remote fuzz repo, adding a
conservative mixed-lane startup-stall dominance/rate gate while preserving
product-evidence visibility. `node --check bin/rtc-browser-fuzz-supervisor.mjs`
passed, the coverage-guided supervisor was restarted, and the active state shows
`strictStartupRecords`, `productEvidenceRecords`, `otherRecords`, and
`strictStartupRecordShare`. Current-run triage is still absent
(`signatures=0`), and external live sidecar noise remains advisory.

This control-plane work is useful, but it is not a substitute for PR 13 repair,
focused post-rebase tests, or fresh combined-stack validation.

## Deferred Or Evidence-Only Work

These must not be described as fixed.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR 6B save snapshot/no-op guard candidate | `final/rtc-pr06b-save-snapshot-noop-guard`; seeds `5500001`, `5500002`, `5500006` | blocked candidate, not part of filing-ready split; exclude from wildcard final-ref import and from PR 6 claims | After PR 13 has green heads, run a bounded focused `ws-parser-transform` replay; pass condition is no duplicated content marker at `save-checkpoint-persisted-crdt-projection`; drop PR 6B if replay fails |
| Broad PR 8 persisted-record hydration | old audit branch `review/rtc-pr08-title-reload-persisted-record` | deferred; active PR 8 is only the narrow title-reload prior-art path | Shape and audit the narrowed title-reload branch; give any remaining persisted-record hydration claim separate product evidence and a verified branch link |
| Reload hydration empty live editor | `e75c8829e4e9`, `3bbdc3cdb393`; gate branch `try/rtc-reload-hydration-gate-e75c8829` | evidence-only; not in PR 6, PR 6A, PR 8, PR 15, or fallback-group claims | Promote only if a clean gate reaches the post-reload assertion and live editor state stays empty after exact-room WebSocket sync while REST body and persisted `_crdt_document` remain populated |
| Pre-save search/live document collapse | `ddf9559af37e`, `0932bed35c7a`, conditional `1e0ade5ec5a8`; `try/rtc-pre-save-search-collapse-gate-ddf9559` | evidence-only; not in active split | Capture editor blocks, serialized content, core-data edited record, live CRDT record, provider state, REST body, and save state before/after `core/search` insertion |
| Rich-text formatted suffix corruption | `4148230f681d`, `b0db7b80c6f2`, `dc8ea6e78d4d`, `1ccac75d7faa`, `2722f0e897de`, `712b98ba96ff` | not fixed; latest split synthesis keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Malformed save payload and save-settlement residuals | `fc154ebec48c`, `e40aa1b7863d`, `f51c425df8a5`, `f46859898576`, `afd389d7f139`, `02289235f55f`, `eef8b8932e11`, `b60eecd4ac03` | deferred beyond the isolated PR 6B candidate | Create a source-level `saveEntityRecord()` / `prePersistPostType()` repro where clean local blocks exist but evaluated outgoing `content` is malformed |
| HTTP polling room-isolation residuals | `f5738470d026`, `fda8d2334e65`, conditional `fc99825fb6c2`, `b75435787be1`; possible `PR 1A` | deferred; possible PR 1A is not in the active split | Promote only if fuzzing still shows healthy post rooms stalled by auxiliary room failures after PR 1/2 |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr` branches as-is.

Before filing any maintainer-facing PR, require:

1. Repair or adjudicate PR 13 so every filed intermediate head passes focused
   CRDT tests; otherwise collapse the source-retirement plus identity-smear
   work into one complete PR.
2. Rebuild the final combined validation stack from explicit accepted heads
   only. Do not wildcard-import blocked candidates such as `final/rtc-pr06b-*`.
3. Shape and audit PR 5A/5B/5C and narrow PR 8, or explicitly defer them.
4. Rebase or recreate each intended PR branch on the intended upstream base.
5. Drop analysis-only artifacts and keep only product code plus focused tests.
6. Regenerate branch graph/containment evidence and adjacent
   range-diffs/diffstats from the rebased branch heads.
7. Rerun focused checks, touched-file lint, and `git diff --check` on every
   branch after rebase.
8. Assemble a fresh final combined validation stack from the actual PR heads.
9. Run final focused checks and coverage-guided fuzzing on that stack.
10. Block filing if new visible likely-real failures appear.

Existing fuzz infrastructure can continue where healthy. The current populated
novelty snapshot has `0` visible likely-real failures, `9` unmet goals,
`7` enabled WS coverage-guided groups, no paused groups, and no headroom for
adding groups, but none of this is broad final-stack coverage or PR-filing
validation. Do not start broad final-stack fuzzing until the rebased combined
stack exists.
