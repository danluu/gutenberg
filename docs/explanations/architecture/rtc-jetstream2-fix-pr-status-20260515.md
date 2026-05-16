# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T09:50:20Z`

Trigger event:
`pr-split-2026-05-16T09-49-23Z-20260516T093801Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Base handoff:
`docs/explanations/architecture/rtc-likely-real-bug-handoff-20260514.md`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-16T09-49-23Z-20260516T093801Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The plan is not whole-stack filing-ready, but the blocker moved. The latest
completed split-persona synthesis, `pr-split-20260516T093801Z-synthesis.md`,
reports that the PR 13 green finalization reconciliation report is now
nonempty and green. It says focused CRDT tests, touched-file lint, and
`git diff --check` passed for the green PR 13 identity-first sequence and the
reattached green PR 14/PR 15 refs.

Current PR 13 decision:

- Drop the old aggregate `final/rtc-pr13b-source-retirement` as a filing head.
- Drop the old standalone PR 13C wording/head as a filing head.
- Drop the Cycle 110 red `PR 13B1` / `PR 13B2` / `PR 13B3` filing heads.
- Use the Cycle 118 green identity-first sequence:
  `final/rtc-pr13a-observed-delete-provenance-green` at `737fbaf0fca`,
  `final/rtc-pr13b0-identity-provenance-guard` at `b64158c44d8`,
  `final/rtc-pr13b1-direct-source-retirement-green` at `404f9b14231`,
  `final/rtc-pr13b2-current-only-source-retirement-green` at `0492a7ae759`,
  and `final/rtc-pr13b3-explicit-base-source-retirement-green` at
  `ba95f820097`.
- Reattach PR 14 and PR 15 on the green PR 13B3 stack:
  `final/rtc-pr14-table-body-array-green`,
  `final/rtc-pr15a-fallback-group-move-green`,
  `final/rtc-pr15b-fallback-group-insert-anchor-green`, and
  `final/rtc-pr15c-fallback-group-delete-green`.

The branch-link audit has not caught up with those green final refs. It still
verifies only the repaired review PR 13 links and the older review PR 14/PR 15
content links. Treat the green report as PR-shape and check evidence, not as a
public branch-link audit. Proposed PR rows below either use an audit row marked
`verified-content` or explicitly say `No verified branch link yet`.

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

The next bounded PR work is PR 6B replay. The latest
`pr-split-20260516T093801Z-feedback-action.md` file collected for this run is
zero bytes, so this status update records the recommendation but does not claim
that a PR 6B replay job was launched. Do not start broad fuzzing, final-stack
fuzzing, reload diagnostics, duplicate PR 13 repair, or validation-lineage
rebuilds in parallel with that replay.

## Latest Branch And Ref Status

The collected remote status input was generated at `2026-05-16T09:50:16Z`.

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

The branch-link audit was generated at `2026-05-16T09:50:20Z` from fetched
`danluu` refs. Use only rows marked `verified-content` as PR-content links.

Use only these repaired PR 13 audit refs when mentioning current audited PR 13
review content:

| Purpose | Verified branch containing audited content | Current SHA | Status |
| --- | --- | --- | --- |
| PR 13A observed-delete provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | `eddf2dd38c09` | repaired audit link; green filing head is separate and not audit-verified |
| Aggregate PR 13B source-retirement provenance | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | `6ea7f425b009` | verified content, but rejected as a filing head |
| PR 13C stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | `fa0f00a1c025` | verified content; old standalone PR 13C wording is superseded by green PR 13B0/B3 |

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
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | accepted split; repaired final head exists separately, but filing refresh still required |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | accepted split; stacked after PR 7A, final filing refresh still required |
| PR 8A | Narrow reload-title prior-art path | No verified branch link yet | TBD | TBD | replace broad PR 8 with a narrow branch shaped from `origin/try/rtc-title-reload-pr`; broader persisted-record hydration remains deferred |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; final rebase/checks still required |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | start CRDT stack |
| PR 11 | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | 2 | +1145 / -4 | stacked on PR 10 |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified branch; final export/rebase still required |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | audit link for repaired content; green filing ref `final/rtc-pr13a-observed-delete-provenance-green` passed reconciliation checks but has no verified green branch link yet |
| PR 13B0 | Identity-smear/provenance guard before source retirement | No verified branch link yet | 2 | about +430 / -50 | green filing ref `final/rtc-pr13b0-identity-provenance-guard` passed reconciliation checks; no verified branch link yet |
| PR 13B1 | Direct cross-parent source retirement | No verified branch link yet | 2 | about +482 / -0 | green filing ref `final/rtc-pr13b1-direct-source-retirement-green` passed reconciliation checks; replaces red Cycle 110 subhead |
| PR 13B2 | Current-only cross-parent source retirement | No verified branch link yet | 2 | about +410 / -0 | green filing ref `final/rtc-pr13b2-current-only-source-retirement-green` passed reconciliation checks; replaces red Cycle 110 subhead |
| PR 13B3 | Explicit-base source retirement plus old accepted identity-smear tree | No verified branch link yet | 2 | about +758 / -0 | green filing ref `final/rtc-pr13b3-explicit-base-source-retirement-green` passed reconciliation checks and is reported tree-equivalent to the old accepted PR 13C filing tree |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | audited content link; green reattached ref `final/rtc-pr14-table-body-array-green` passed reconciliation checks but still needs public branch-link audit |
| PR 15A | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 | +123 / -4 | audited content link; green reattached ref passed reconciliation checks; keep reload-hydration gate spec out |
| PR 15B | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | 2 | +197 / -4 | audited content link; green reattached ref passed reconciliation checks; keep reload-hydration gate spec out |
| PR 15C | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | 2 | +161 / -4 | audited content link; green reattached ref passed reconciliation checks; keep reload-hydration gate spec out |

Old verified branches that are now prior art only:

- [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence)
  remains a verified content link for old aggregate PR 5 (`4` files,
  `+1664 / -52`), but not the recommended maintainer-facing split.
- [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record)
  remains a verified content link for old broad PR 8 (`11` files,
  `+618 / -61`), but not the active PR 8A shape.
- [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement)
  remains the verified aggregate source-retirement content link (`2` files,
  `+1672 / -4`), but the latest split says not to file it.
- [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard)
  remains a verified content link for old standalone PR 13C (`2` files,
  `+345 / -51`), but the latest split says the accepted content is covered by
  green PR 13B0/B3 after filing refs are audited.

## Fuzz And Validation Status

Latest collected status input:

```text
collected_at_utc: 2026-05-16T09:50:16Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T094459Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Latest novelty monitor snapshot:

```text
updated: 2026-05-16T09:48:24.811Z
coverage files: 28743
total records seen: 42142
records processed this pass: 57
coverage lines seen this pass: 43633
summary files read this pass: 0
summary startup failures processed this pass: 0
new behavioral feature keys this pass: 0
new CDP coverage hashes this pass: 0
unmet goals: 8
likely-real visible: 0
likely-real merged duplicates: 0
likely-real oracle/noise questions: 0
load1: 62.79 / 64 cores
memory: 418.6G free / 492.0G total
headroom for adding groups: yes
```

Enabled coverage-guided groups in the latest monitor snapshot:

- `novelty-ws-common-blocks`
- `novelty-ws-block-gauntlet`
- `novelty-ws-parser-transform`
- `novelty-ws-real-user-editing`
- `novelty-ws-real-user-rich-text`
- `novelty-ws-async-server-blocks`
- `novelty-ws-media-cross-entity`
- `novelty-ws-long-session-large-doc`
- `novelty-http-persistence-probe`

Paused groups:

- `novelty-ws-persistence-no-title`: rotated browser budget to media-cross
  entity for the CDP coverage-record gap.
- `novelty-ws-lifecycle`: rotated browser budget to long-session-large-doc for
  the same CDP coverage-record gap.

Current-run triage is immature in the new output directory and has no visible
likely-real signal:

```text
current output dir scope:
triage roots: 1
triage state files: 1
signatures: 0
likely-real visible: 0
likely-real merged duplicates: 0
likely-real oracle/noise questions: 0
normalization-noise candidates: 0
bootstrap stalls: 0
known-noise signatures: 0
top duplicate family share: 0
```

Historical and external live triage remain reporting/advisory unless
current-run evidence confirms product failures:

```text
closed historical scope:
triage roots: 97
triage state files: 155
signatures: 8801
bootstrap stalls: 4209
top duplicate family share: 0.4782
top semantic family: pre_action_bootstrap_stall

external live sidecar scope:
triage roots: 4
triage state files: 101
signatures: 11098
bootstrap stalls: 7712
top duplicate family share: 0.6949
top semantic family: pre_action_bootstrap_stall

combined reporting scope:
triage roots: 102
triage state files: 257
signatures: 19904
bootstrap stalls: 11925
top duplicate family share: 0.5991
top semantic family: pre_action_bootstrap_stall
```

The monitor also warns that no behavioral coverage files were found under the
new novelty output directory. Treat the current `0` likely-real status as
health and triage signal only, not final rebased-stack validation.

The trend evidence packet was generated at `2026-05-16T09:42:05Z` from monitor
data through `2026-05-16T09:41:45Z`, before the new `run-20260516T094459Z`
coverage root and group rotation. Use it for trend interpretation, not current
enabled-group membership:

```text
monitor passes: 1408
coverage files: 272 -> 28632
coverage files delta: 28360
unmet coverage goals: 24 -> 8
likely_real_max: 0
duplicate_share_current_last: 0.6286
duplicate_share_historical_last: 0.4782
summary_startup_failures_last: 0
quality_issues_last: 3
fuzz level mix: browser-e2e=27 lanes/27 groups; transport-integration=1 lane/1 group
```

Largest current unmet goals in the latest monitor snapshot:

- CDP coverage records: `4559/5000`
- successful real-user-editing records: `266/500`
- `core/html`: `332/500`
- `core/details`: `371/500`
- `core/more`: `376/500`
- `ui-heading-shortcut`: `428/500`
- `reload-post-action`: `445/500`
- `core/gallery`: `492/500`

This fuzz status is health and coverage-depth evidence for active validation
infrastructure. It is not final-stack validation and does not make the PR split
filing-ready.

## Status-Persona Analysis

Completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` are still useful for report hygiene:
separate current-run fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older PR 13
and enabled-group conclusions are stale and superseded by later split-persona
and novelty inputs.

The newest completed split-persona synthesis is
`pr-split-20260516T093801Z-synthesis.md`. It says:

- The PR 13 green reconciliation report is nonempty and green.
- The filing shape should be PR 13A observed-delete provenance, PR 13B0
  identity/provenance guard, PR 13B1 direct source retirement, PR 13B2
  current-only source retirement, and PR 13B3 explicit-base source retirement.
- Reattached green PR 14 and PR 15 refs are part of that sequence.
- Old aggregate PR 13B, old PR 13C wording/head, old PR 14/PR 15 refs, red
  Cycle 110 PR 13B1/B2/B3 heads, and wildcard `final/rtc-pr*` should not be
  filed.
- Current fuzz has `0` visible likely-real failures, but that is background
  signal, not final rebased-stack validation.
- The next concrete action is exactly one bounded PR 6B focused replay for
  `ws-parser-transform` seeds `5500001`, `5500002`, and `5500006`.
- Do not launch broad fuzz, final-stack fuzz, reload diagnostics, PR 13
  reconciliation, or validation-lineage rebuild now.

The latest `pr-split-20260516T093801Z-feedback-action.md` is zero bytes, so no
post-synthesis action artifact confirms a launched PR 6B job from this loop.
The previous nonempty pr-split feedback action remains
`pr-split-20260516T091517Z-feedback-action.md`; it launched the now-completed
PR 13 green finalization reconciliation job.

The newest completed duplicate-noise synthesis is
`duplicate-noise-20260516T093712Z-synthesis.md`; the newest nonempty
duplicate-noise feedback action remains
`duplicate-noise-20260516T091615Z-feedback-action.md`.

Completed duplicate/noise analysis changes no product PR validation status. It
records control-plane admission and classification issues:

- The latest duplicate-noise synthesis recommends a watcher-first fix:
  dedupe raw attempt records against final per-seed records, add a strict
  no-product-evidence pre-action startup predicate, canonicalize only those
  startup signatures, and keep structural/content/post-action failures visible.
- The latest duplicate-noise feedback action implemented only the allowed
  monitor-side part in `bin/rtc-browser-fuzz-novelty-monitor.mjs`, validated
  it with `node --check`, and respawned only `rtc-coverage-guided-novelty`.
- Summary-row dedupe, stale queued-analysis skipping, and better `unknown`
  classification remain unresolved because that action did not edit
  `rtc-browser-fuzz-triage-watcher.mjs` or analysis-tier code.
- Historical known-noise remains advisory only. Do not suppress current
  `unknown`, non-convergence, assertion, save/reload, user/action, fault, or
  product-evidence failures with a historical blanket rule.

This control-plane work is useful, but it is not a substitute for public branch
audit of green filing refs, focused post-rebase tests, PR 6B replay, or fresh
combined-stack validation.

## Deferred Or Evidence-Only Work

These must not be described as fixed.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR 6B save snapshot/no-op guard candidate | `final/rtc-pr06b-save-snapshot-noop-guard`; seeds `5500001`, `5500002`, `5500006` | next bounded gate, but still blocked candidate; not part of filing-ready split; exclude from wildcard final-ref import and from PR 6 claims | Run exactly one bounded focused `ws-parser-transform` replay; pass condition is no duplicated content marker at `save-checkpoint-persisted-crdt-projection`; drop PR 6B if replay fails |
| PR 6C malformed evaluated save content | no verified filing branch | blocked pending Jest, lint, and replay evidence | Promote only after focused product evidence and a verified branch link exist |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; active PR 8A is only the narrow title-reload prior-art path | Shape and audit the narrowed title-reload branch; give any remaining persisted-record hydration claim separate product evidence and a verified branch link |
| Reload hydration empty live editor | `e75c8829e4e9`, `3bbdc3cdb393`; gate branch `try/rtc-reload-hydration-gate-e75c8829` | evidence-only; not in PR 6, PR 6A, PR 8A, PR 15, or fallback-group claims | Promote only if a clean gate reaches the post-reload assertion and live editor state stays empty after exact-room WebSocket sync while REST body and persisted `_crdt_document` remain populated |
| Pre-save search/live document collapse | `ddf9559af37e`, `0932bed35c7a`, conditional `1e0ade5ec5a8`; `try/rtc-pre-save-search-collapse-gate-ddf9559` | evidence-only; not in active split | Capture editor blocks, serialized content, core-data edited record, live CRDT record, provider state, REST body, and save state before/after `core/search` insertion |
| Rich-text formatted suffix corruption | `4148230f681d`, `b0db7b80c6f2`, `dc8ea6e78d4d`, `1ccac75d7faa`, `2722f0e897de`, `712b98ba96ff` | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Malformed save payload and save-settlement residuals | `fc154ebec48c`, `e40aa1b7863d`, `f51c425df8a5`, `f46859898576`, `afd389d7f139`, `02289235f55f`, `eef8b8932e11`, `b60eecd4ac03` | deferred beyond isolated PR 6B/6C candidates | Create a source-level `saveEntityRecord()` / `prePersistPostType()` repro where clean local blocks exist but evaluated outgoing `content` is malformed |
| HTTP polling room-isolation residuals | `f5738470d026`, `fda8d2334e65`, conditional `fc99825fb6c2`, `b75435787be1`; possible `PR 1A` | deferred; possible PR 1A is not in the active split | Promote only if fuzzing still shows healthy post rooms stalled by auxiliary room failures after PR 1/2 |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr` branches as-is.

Before filing any maintainer-facing PR, require:

1. Use only the explicit green final-head filing/push allow-list produced by
   the PR 13 reconciliation report. Do not wildcard import or file
   `final/rtc-pr*`.
2. Keep old aggregate PR 13B, old PR 13C wording/head, red Cycle 110
   PR 13B1/B2/B3 heads, and old PR 14/PR 15 refs out of filing branches and
   push allow-lists.
3. Push or expose the green final PR 13B0/B1/B2/B3 and reattached PR 14/PR 15
   refs, then regenerate the branch-link audit so every proposed row has a
   verified public PR-content link or explicitly remains unverified.
4. Rebase or recreate each intended PR branch on the intended upstream base.
5. Regenerate branch graph/containment evidence and adjacent
   range-diffs/diffstats from the actual filing repo.
6. Rerun focused checks, touched-file lint, and `git diff --check` on every
   imported/rebased branch.
7. Run the bounded PR 6B replay and drop PR 6B if seeds `5500001`, `5500002`,
   or `5500006` still reproduce duplicated persisted CRDT projection.
8. Shape and audit PR 5A/5B/5C and narrow PR 8A, or explicitly defer them.
9. Keep dirty analysis-only artifacts and the untracked reload-hydration gate
   spec out of product PR branches.
10. Assemble a fresh final combined validation stack from the actual PR heads.
11. Run final focused checks and coverage-guided fuzzing on that stack.
12. Block filing if new visible likely-real failures appear.

Existing fuzz infrastructure can continue where healthy. The current novelty
snapshot has `0` visible likely-real failures and `8` unmet goals, but the new
current-run triage directory is immature and has a behavioral-coverage warning.
None of this is broad final-stack coverage or PR-filing validation. Broad
fuzzing waits for corrected public final PR heads and a fresh combined
validation stack.
