# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T20:12:23Z`

Trigger event:
`pr-split-2026-05-17T20-10-56Z-20260517T200249Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T20-10-56Z-20260517T200249Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The logical split still converges on the Cycle 293 explicit-ref topology. The
Cycle 298 manifest/deferred harvest is now the fresh local-machine publication
artifact, and the latest split-persona synthesis at `20260517T200249Z` confirms
that the topology should not change while the active PR07 readiness/replay job
is outstanding. Filing, GitHub PR opening, broad final-stack fuzzing, and
rebuilt stack-wide validation remain blocked because PR07 reload/post-save
ownership has still not replayed through a healthy runtime and the stack still
needs validation against audited refs.

Use the explicit `finalized/cycle293/*` publication shape as the current
source-of-truth for local-machine publication instructions. The accepted PR01
range is the two-file HTTP polling generated-update-size delta based on
`finalized/cycle293/base/rtc-likely-real-bug-handoff-base`; the old
`origin/trunk..PR01` / `ready/*` / `ready-pr03b/*` shape remains rejected as
the 1048-file handoff hazard. Do not push from Jetstream.

Current maintainer-facing topology:

```text
PR01 -> PR02 (+ PR02A sidecar)
-> PR03 -> PR04 -> PR05A -> PR05B -> PR05C -> PR05D
-> PR06 -> PR06A -> PR07A -> PR07B0 -> PR07B1
-> PR09 -> PR10 -> PR11A-E -> PR12
-> PR13A/B0/B1/B2/B3 -> PR14 -> PR14B
-> PR15A/B/C-on-PR14B
```

Current sidecars and held work:

```text
PR02A after PR02: HTTP room-isolation regression
PR03B after PR03: browser restoreRevision CRDT invalidation, held/runtime-gated
PR06B after PR07B1: repaired malformed-save request-payload sidecar
PR07C after PR07B1: reload record snapshots
validation heads: fetch-only evidence, not product PR links
```

Do not add `PR07D`, `PR17`, `PR18`, or `PR18x` from current evidence. PR07D
requires fresh red-at-active-PR07C non-coverage with first-divergence snapshots
after the PR07 runtime-readiness gate is repaired. Seed `1020002` remains
terminal/downscoped for product-branch purposes unless rebuilt validation
produces newer product-owned evidence. Strict/rich-text seed `5700084` remains
mapped to the `PR05B -> PR05C -> PR05D` owner path, with `PR05C` coverage in
current split-persona evidence.

Cycle 294, Cycle 296, and Cycle 298 now provide the current publication and
runtime-gate evidence:

- `rtc-cycle294-cycle293-audit-harvest` copied the fresh Cycle 293 branch audit
  and push manifest into the latest run. The harvest was regenerated at
  `2026-05-17T19:07:15Z`, newer than the current deferred timestamp it observed
  at `2026-05-17T19:05:43Z`, with `0` branch-audit failures and `0`
  bundle/manifest/head agreement failures.
- `rtc-cycle294-root-space-pr07-readiness-continuation` removed only stale
  completed split-review work directories with nonempty parent reports, but
  its final run still reported `/` below the `2048 MB` replay threshold
  (`8 MB` free), so no Docker/wp-env/browser PR07 replay was launched.
- `pr-split-20260517T191553Z-feedback-action.md` then updated
  `current-pr-split.md`, verified the local publish manifest has 35 fresh
  `refs/heads/danluu/cycle293-*` rows from `2026-05-17T19:15:03Z` through
  `2026-05-17T19:20:08Z`, repaired the wrapper to copy the Cycle 288 patched
  harness, and launched `rtc-cycle296-pr07-runtime-readiness-after-root-recovery`
  in tmux.
- `pr-split-20260517T194638Z-synthesis.md` checked that Cycle 296
  replay after completion: it wrote nonempty artifacts, but all `15`
  PR07B0/PR07B1/PR07C replay rows are `runtime-readiness-blocked` before seeded
  actions with `collaborationEnabled=null`. Treat this as durable setup-blocked
  evidence only, not PR07 coverage, not PR07D justification, not filing
  readiness, and not final-stack validation.
- `pr-split-20260517T194638Z-feedback-action.md` launched
  `rtc-cycle298-pr07-collaboration-enabled-readiness-repair-and-replay`, which
  must prove `window._wpCollaborationEnabled === true` before any seeded replay
  can count as PR07 owner evidence.
- The completed Cycle 298 manifest/deferred harvest was generated at
  `2026-05-17T20:01:20Z`, newer than the deferred queue timestamp it observed
  at `2026-05-17T20:01:14Z`. It reports `0` branch audit failures, `0` base
  sanity failures, `0` base allowlist/disallowed-ref failures, and `0`
  repo/head/bundle/manifest agreement failures. Use its `push-manifest.tsv` as
  the fresh local-machine publication instruction artifact for the Cycle 293
  explicit-ref topology.

The latest split-persona synthesis at `20260517T200249Z` keeps PR07D, PR17,
PR18, and PR18x absent. It says to consume the active Cycle 298 PR07
readiness/replay output rather than duplicate it; if not already covered, the
only new automatic job it recommends is one bounded non-Docker owner/downscope
comparison for pre-save live-collapse and rich-text suffix diagnostics. Active
sessions, active `1020002`, zero-byte reports, `report.tmp`, stderr/log growth,
disk-preflight-only output, stale manifests, and duplicate active-slot rows are
not durable progress while actionable Parallel Progress Gate rows remain.

The duplicate/noise issue is a control-plane status item, not a product split
change. The earlier `duplicate-noise-20260517T193222Z-feedback-action.md`
implemented consumer-side family-cap/session-gating and live-analysis
housekeeping in `rtc-browser-fuzz-live-analysis-monitor.mjs` and
`rtc-browser-fuzz-analysis-tier.mjs`. The newest
`duplicate-noise-20260517T195834Z-synthesis.md` says the remaining problem is
producer-side scheduler backpressure: once repeated
`reload_rejoin_awareness_stall` signatures are family-capped, they stop showing
as actionable while the raw duplicate-dominant family can still consume browser
capacity. The latest `2026-05-17T20:11:49.027Z` novelty snapshot is on
`run-20260517T194224Z`, has four active-current product-evidence signatures,
fifteen current family-capped signatures, `0` no-product actionable signatures,
and two active-current visible likely-real signatures. It keeps
`novelty-ws-real-user-rich-text` and `novelty-http-persistence-probe` enabled,
keeps the real-user save/reload and editing groups in startup-noise cooldown,
and marks no-product startup signatures as no-analysis while preserving
product-evidence cases. The next safe control-plane fix is novelty-monitor
producer pause/rotation for raw duplicate-dominant product-evidence families
with `preserveProductEvidence`; this is not a PR split change.

## Branch And Ref Status

Remote status was collected at `2026-05-17T20:12:18Z`.

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

The branch-link audit was generated at `2026-05-17T20:12:23Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`. The fresh
Cycle 293 audit is publication-shape evidence for local refs; it does not by
itself create branch-link-audit verified GitHub PR-content links for finer rows
such as PR07B0, PR07B1, PR05A-D, PR11A-E, PR14B, or PR15-on-PR14B.

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
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified branch exists; Cycle 294 accepts the Cycle 293 explicit-base two-file PR01 range and keeps `origin/trunk..PR01` rejected |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified branch; keep in known-fix prefix |
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | TBD | TBD | sidecar; needs fetched `verified-content` audit before filing |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; seed `5500002` marker-retention remains separate follow-up |
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR 3 | No verified branch link yet | TBD | TBD | held PR03 sidecar / validation-only sidecar until browser/PHP runtime replay passes |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified branch; no-PR03B product ref still needs verified audit if republished |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | TBD | replacement for old aggregate PR 5; needs verified branch link |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | progress-unblock local-machine ref exists; GitHub verified-content link is still missing |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | strict seed `5700084` remains covered by PR05C in current evidence; GitHub verified-content link is still missing |
| PR 5D | Semicolonless entity/reference block validation after PR 5C | No verified branch link yet | TBD | TBD | Cycle 264 clean-base candidate remains the only valid PR05D path; publish/fetch/audit before filing |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified branch; excludes malformed-save sidecar and broader residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified branch; narrow persisted-body guard |
| PR 6B | Malformed outgoing RTC save request-payload guard, revised against PR07B0/PR07B1 helper shape | No verified branch link yet | TBD | TBD | repaired sidecar after PR07B1; Cycle 294 preserves placement but no branch-link-audit verified PR-content link exists yet |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified branch; no-PR03B product ref still needs verified audit if republished |
| PR 7B0 | Saved CRDT response hydration split from old opaque PR 7B | No verified branch link yet | TBD | TBD | Cycle 293/Cycle 294 local refs preserve the split, but no branch-link-audit verified GitHub PR-content link exists yet |
| PR 7B1 | Stale base-record/title filtering split from old opaque PR 7B | No verified branch link yet | TBD | TBD | Cycle 293/Cycle 294 local refs preserve PR07B0 as ancestor of PR07B1, but no branch-link-audit verified GitHub PR-content link exists yet |
| PR 7C | Reload record snapshots sidecar after PR 7B1 | No verified branch link yet | TBD | TBD | seed `1100002` remains covered-by-pr07c in prior replay classification; no current verified branch link |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; keep in known-fix prefix |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified branch; start CRDT block stack |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | TBD | TBD | Cycle 293 topology keeps PR11 split; GitHub verified-content link is still missing |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | TBD | TBD | Cycle 293 topology keeps PR11 split; GitHub verified-content link is still missing |
| PR 11C | Explicit-base middle insert | No verified branch link yet | TBD | TBD | source-local evidence marks `a914c862c29e` / seed `5200005` covered here; verified-content link is still missing |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | TBD | TBD | Cycle 293 topology keeps PR11 split; GitHub verified-content link is still missing |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | TBD | TBD | Cycle 293 topology keeps PR11 split; GitHub verified-content link is still missing |
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
collected_at_utc: 2026-05-17T20:12:18Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T194224Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The raw `novelty-status.md` snapshot was updated at
`2026-05-17T20:11:49.027Z`:

```text
coverage files: 47468
total records seen: 73407
records processed this pass: 44
new behavioral feature keys this pass: 1
new CDP coverage hashes this pass: 1
unmet goals: 6
headroom for adding groups: yes
load1: 52.70 / 64 cores
memory: 418.3G free / 492.0G total
quality issues: 0
active-current actionable signatures: 4
active-current likely-real visible: 2
active-current product-evidence signatures: 4
active-current family-capped signatures: 15
active-current no-product actionable signatures: 0
current-drain actionable signatures: 4
current-drain likely-real visible: 2
enabled groups: novelty-ws-real-user-rich-text,
  novelty-http-persistence-probe
paused groups: novelty-ws-real-user-save-reload,
  novelty-ws-lifecycle, novelty-ws-real-user-editing
raw top current semantic family: reload_rejoin_awareness_stall
raw top duplicate family share: 0.7391
health: ok
```

This is health/triage evidence only. The 20:11 snapshot has two visible
likely-real product-evidence signatures in active current and current-drain
scope, but it is not final-stack validation and does not make any PR
filing-ready. The active current-run and current-drain triage scopes now show
four product-evidence signatures, fifteen family-capped siblings, and no
no-product actionable signatures. The raw current signal is still dominated by
`reload_rejoin_awareness_stall` product-evidence duplicates, with raw
duplicate-family share `0.7391`; that is control-plane/triage evidence for
producer backpressure, not proof that product-evidence reload/rejoin,
save/reload/autosave, revision, timeout, unknown, assertion, convergence, or
operation-witness families can be hidden. Historical triage remains dominated
by prior product-evidence duplicate families and no-product startup noise; it
should guide control-plane cleanup but must not be reported as active current
product failure.

The latest trend packet was generated at `2026-05-17T20:03:43Z` from monitor
data through `2026-05-17T20:00:00Z`:

```text
monitor passes: 2095
coverage files: 272 -> 47404
coverage files delta: 47132
unmet goals: 6
likely_real_max: 4
duplicate_share_current_last: 1
duplicate_share_historical_last: 0.3458
summary startup failures last: 0
quality issues last: 1
enabled groups current: novelty-ws-real-user-rich-text,
  novelty-http-persistence-probe
latest fuzz level mix: browser-e2e=31 lanes/27 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5345595
browser-e2e execution: 117358 cumulative / 444 per-hour
unit-property execution: 4796896 cumulative / 2048 per-hour
coverage-guided-lower-level execution: 428335 cumulative / 0 per-hour
browser-e2e likely-real findings: 595 over 1920.8 runner-hours
largest unmet goals: reload-post-action 1038/2000,
  title-save-reload 494/1000, ui-format-paragraph 1564/2000,
  body-save-reload 553/1000, real-user-editing success 576/1000
```

The trend packet is graph-derived input evidence, not an instruction and not a
product-bug count. The raw novelty snapshot is newer than the trend packet and
supersedes the trend packet's exact current-health counters when they differ.
Browser E2E remains the only level with confirmed likely-real findings in the
trend packet, but lower-level lanes are under-triaged and should not be declared
useless from zero likely-real output. The raw novelty snapshot is newer than the
trend packet: it now reports group headroom and health `ok`, but still shows
raw duplicate-family dominance and startup-noise cooldowns on two recommended
real-user groups. Prefer startup-stall reduction, PR07 runtime preflight,
novelty producer backpressure for raw duplicate-dominant product-evidence
families, and bounded lower-level targets with clear oracles over broad browser
concurrency increases.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T200249Z-synthesis.md`. It confirms:

- The split shape has converged on the Cycle 293 explicit-ref topology.
- Filing and final-stack validation remain blocked by missing PR07
  reload/post-save/rejoin ownership evidence, not by lack of split consensus.
- Use `finalized/cycle293/*` refs with PR01 based on
  `finalized/cycle293/base/rtc-likely-real-bug-handoff-base`.
- Reject old `origin/trunk`, `ready/*`, `ready-pr03b/*`, monolithic `PR07B`,
  fallback/PR15-tail `PR05D`, raw `PR07D`, `PR17`, `PR18`, and `PR18x`.
- The now-completed Cycle 296 replay wrote nonempty artifacts, but all `15`
  PR07B0/PR07B1/PR07C replay rows are `runtime-readiness-blocked` with
  `collaborationEnabled=null`.
- Treat Cycle 296 as setup evidence only: no PR07D, no filing, and no
  final-stack fuzz from it.
- Consume the active Cycle 298 PR07 collaboration-readiness job rather than
  duplicating it. It must prove `window._wpCollaborationEnabled === true`, then
  rerun seeds `5200011`, `5200017`, `5200010`, `7110004`, `7110017`, and reload
  residual seed `5200008` against finalized PR07B0, PR07B1, and PR07C with
  snapshots.
- The completed Cycle 298 manifest/deferred harvest supplies fresh
  local-machine publication evidence newer than the deferred queue it observed,
  with `0` branch audit, base sanity, allowlist, and head/bundle/manifest
  agreement failures.
- Continue independent deferred replay, manifest freshness, PR02A/PR05/PR11
  shaping, and loop durable-progress repair instead of waiting on `1020002`.

The most recent split feedback-action file remains
`pr-split-20260517T194638Z-feedback-action.md`; the later
`pr-split-20260517T200249Z-synthesis.md` reports no files edited. Cycle 298
feedback was applied to `current-pr-split.md`, kept the active topology on
explicit `finalized/cycle293/*` refs, recorded Cycle 296 as setup-only
evidence, launched the PR07 collaboration-readiness repair/replay, and
completed the non-Docker Cycle 298 manifest/deferred harvest. PR07D remains
deferred because no replay has yet proven red-at-active-PR07C non-coverage with
first-divergence snapshots. The latest synthesis recommends consuming the
active PR07 readiness job, running one bounded owner/downscope comparison for
pre-save live-collapse and rich-text suffix diagnostics if it is not already
covered, and still rejects broad fuzzing, PR17/PR18/PR18x automation, and raw
PR07D fuzz.

The newest duplicate/noise synthesis,
`duplicate-noise-20260517T195834Z-synthesis.md`, says strict no-product
`pre_action_bootstrap_stall` is no longer the main consumer leak. The remaining
problem is scheduler/control-plane backpressure for raw product-evidence
duplicate families: after `reload_rejoin_awareness_stall` peers become
family-capped, the raw duplicate-dominant producer can still consume browser
capacity while the product-evidence representative is intentionally preserved.

The latest duplicate/noise feedback-action file,
`duplicate-noise-20260517T193222Z-feedback-action.md`, implemented that bounded
housekeeping path. It patched `rtc-browser-fuzz-live-analysis-monitor.mjs` and
`rtc-browser-fuzz-analysis-tier.mjs` so live analysis can run the existing
analysis tier once in no-Codex family-cap-only mode, then refresh gate-only
triage. Both scripts passed `node --check`; the active live-analysis tmux
session was restarted; strict startup queued in triage, analysis, and deep
analysis is `0`; queued `reload_rejoin_awareness_stall` duplicates are `0`;
and one active product-evidence representative remains visible intentionally.
Remaining risk is producer-side raw duplicate recurrence; the next safe change
is to patch `rtc-browser-fuzz-novelty-monitor.mjs` so raw/family-capped
duplicate dominance pauses or rotates only the producing real-user lane while
preserving product-evidence signatures.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", old PR13 review-ref warnings, old enabled-group claims, and "do not add
PR06B" recommendations are superseded by the repaired PR13 audit links, the
Cycle 282+ PR07B0/PR07B1 split/adoption proof, the Cycle 293/Cycle 294/Cycle
298 publication-shape evidence, PR06B/PR07C sidecar placement after PR07B1,
PR05D's real slot after PR05C, the completed duplicate/noise consumer-side
family-cap plus live-analysis housekeeping fixes, and the newer
producer-backpressure finding.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR07B split and deferred adoption | `PR07B0` saved-response hydration at `e746c32e3f9` / deferred `72854f05ed2`; `PR07B1` stale base-record/title filter at `4bdd9465a97`; Cycle 293/Cycle 294 audit evidence; Cycle 298 manifest/deferred harvest | Local publication shape is current and freshly harvested at `2026-05-17T20:01:20Z`, but no branch-link-audit verified GitHub PR links exist for PR07B0/PR07B1 and PR07 runtime ownership is still missing | Publish/fetch/audit explicit PR07B0 and PR07B1 GitHub-facing product branches, then run focused checks and rebuilt stack validation against audited refs |
| PR07 runtime / root-space gate | seeds `5200011`, `5200017`, `5200010`, `7110004`, `7110017`, plus reload residual `5200008`; Cycle 288 replay; Cycle 294 cleanup; Cycle 296 runtime-readiness replay; active Cycle 298 collaboration-readiness repair/replay | Cycle 288 failed before seeded action/reload/checkpoint at `collaborationEnabled=null`; Cycle 294 cleanup removed stale work dirs but did not launch replay; completed Cycle 296 wrote nonempty artifacts but all `15` PR07B0/PR07B1/PR07C replay rows are `runtime-readiness-blocked` with `collaborationEnabled=null`; Cycle 298 PR07 readiness/replay is the active pending gate | Consume Cycle 298 output; require `window._wpCollaborationEnabled === true`, then rerun the PR07B0/PR07B1/PR07C seed matrix with snapshots and capture first-divergence snapshots before naming PR07D |
| PR05D semicolonless entity validation | Cycle 264 clean-base branch `cycle264/pr05d-clean-base/semicolonless-entity-validation` at `27c6e7924217`; Cycle 266 validation head `b9bf4ccb7940` | real PR05-family work after PR05C; no fetched `verified-content` product branch link exists yet | Publish/fetch/audit PR05D; keep fallback/PR15-tail PR05D rows rejected |
| PR06B / PR07B helper dedupe | active candidate `finalized/cycle268/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b` at `e91d2fe829f2` | old independent PR06A sidecar is superseded; active topology places the sidecar after PR07B1 and still lacks a verified branch link | Publish/fetch/audit an explicit PR06B product branch after PR07B0/PR07B1 and rebuild validation against the active topology |
| PR14B / PR15-on-PR14B finalization | Cycle 252 no-PR03B branch-shaping artifacts | mandatory replacement topology, but no current `verified-content` branch links exist for PR14B or PR15-on-PR14B | Publish/fetch/audit explicit no-PR03B product refs after sidecar-aware audit and keep validation-only heads out of product PRs |
| PR07C reload record snapshots | `finalized/cycle252/sidecar/rtc-pr07c-reload-record-snapshots` at `2d112932f0e3`; replay target `06441205b872` | accepted sidecar after PR07B1; no current verified branch-link row exists | Publish/fetch/audit sidecar-aware PR07C product branch after PR07B0/PR07B1; reopen PR07D only on fresh red-at-active-PR07C non-coverage proof |
| PR03B browser `restoreRevision` CRDT invalidation | `ready-pr03b/rtc-pr03b-browser-revision-restore-crdt-invalidation` at `cbab481fe760` | PR03 sidecar is held/runtime-gated until browser/PHP runtime replay passes | Finish bounded runtime replay for PR03B after root-space/runtime readiness is healthy; do not put PR03B back into the main spine without passing evidence |
| PR05B/PR05C/PR05D owner comparison | Cycle 260 owner-comparison evidence plus Cycle 282 strict/rich-text owner-comparison proof | strict seed `5700084` maps to `covered-by-PR05C`; parser/rich-text/linebreak evidence remains out of PR18/PR18x | Compare any remaining linebreak/parser/rich-text reductions against PR05B/PR05C/PR05D before allowing a later owner |
| PR13 finer split | PR13B0/B1/B2/B3 source-level evidence; repaired audited PR13A/B/C fallback links | preferred source split remains PR13A/B0/B1/B2/B3, but proposed rows currently use only repaired audited PR13A/B/C links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing repaired PR13B/C fallback rows |
| Seed `1020002` WebSocket marker divergence | critical-path classification under `runs/20260517T120127Z/continuations/pr17-1020002/classification.tsv` | downscoped unless rebuilt validation produces fresh product evidence; not an independent-work blocker and not a current PR17 product slot | Revisit only after rebuilt validation produces fresh product evidence newer than the terminal/downscope classifications |
| Sync undo/history issue | `9f4dcc759070`, `44110608ba86`, `977ed437bafe`; seeds `1090016` / `1090017` | isolated runtime replay reached the owner path but did not reproduce a stable redo-stack-loss product owner; not PR05B/PR05C and not PR18x | Use a lower-intrusion history subscription repro or source-level sync/core-data history test before naming any product PR |
| Reload-hydration diagnostics | retained raw branch `72854f05ed2`; latest deferred reload branch `deferred/rtc-reload-hydration-20260517T160811Z`; replay row `06441205b872` | raw deferred reload-hydration remains mapped to active PR07B0 lineage and out of PR07D; Cycle 288 replay is resource/runtime-gated | Repair runtime readiness and rerun residual owner replay against PR07B0/PR07B1/PR07C with first-divergence snapshots |
| Rich-text formatted suffix corruption | diagnostic candidates and prior deferred refs | evidence-only; current owner-comparison keeps it out of active PR split and out of PR18/PR18x | Compare against PR05B/PR05C first and recover exact replay artifact or emitted delta before naming any later product owner |
| Pre-save search/live document collapse | seed `961308` / `ddf9559af37e`; only run `0932bed35c7a` if red or ambiguous | evidence-only; not in active split; latest split-persona keeps the row actionable and says it must not block behind `1020002` | Run one bounded owner comparison against PR06, PR06A, PR07B0, PR07B1, and PR07C after PR07 stops consuming E2E capacity |
| Broader HTTP polling room-isolation residuals | PR02A sidecar plus stale deferred relaunches | PR02A remains in the known-fix prefix but has no verified branch link; broader residuals stay deferred | Publish/fetch/audit PR02A before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Duplicate/noise control-plane recycling | `duplicate-noise-20260517T193222Z-feedback-action.md`; `duplicate-noise-20260517T195834Z-synthesis.md`; nonempty `novelty-status.md` at `2026-05-17T20:11:49.027Z` | consumer-side family-cap/session-gating and live-analysis housekeeping fixes are applied and validated; latest novelty snapshot has four active-current product-evidence signatures, fifteen family-capped siblings, `0` no-product actionable signatures, two visible likely-real signatures, health `ok`, raw duplicate-family share `0.7391`, rich-text plus HTTP persistence groups enabled, and startup-noise pauses on the real-user save/reload and editing groups; no product split change | Preserve product evidence and avoid broad suppression; patch novelty-monitor producer backpressure so raw/family-capped duplicate dominance pauses or rotates only the producing real-user lane with `preserveProductEvidence` |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr`, `ready/*`, or `ready-pr03b/*` branches as-is.

Before filing any maintainer-facing PR:

1. Use only explicit product refs. Do not wildcard import or file `final/rtc-pr*`,
   validation-stack branches, deferred branches, dirty evidence branches, old
   downstream `ready/*` refs, stale `ready-pr03b/*` main-spine refs, or
   validation-only heads.
2. Treat the Cycle 293/Cycle 294 audit harvest plus the completed Cycle 298
   manifest/deferred harvest as current local-machine publication-shape
   evidence: they verify explicit `finalized/cycle293/*` refs with
   branch/head/bundle/manifest agreement and the corrected PR01 base. They are
   not GitHub PR opening, not final-stack validation, and not a substitute for
   branch-link-audit verified GitHub PR-content links.
3. Keep old aggregate PR 5, broad PR 8, aggregate PR 11, stale/misordered PR13
   refs, old PR06B/PR16 material, dirty evidence branches, and the untracked
   reload-hydration gate spec out of filing branches and push allow-lists.
4. Reject stale `ready/*`, raw `deferred/*` filing refs, stale PR06B/PR07C
   rows, `PR17` / `1020002`, and `PR18` / `PR18x` from the active manifest and
   executor queue.
5. Use the repaired PR06B sidecar candidate only after the PR07B0/PR07B1 shape
   is audited:
   `finalized/cycle268/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b`.
6. Treat `cycle266/validation/no-pr03b-pr05d-plus-pr06b-pr07c-sidecars` at
   `b9bf4ccb794004b634d1427bf18d1a7d788af03f` as fetch-only validation
   evidence, not product content.
7. Publish/fetch and audit explicit sidecar-aware product refs for PR02A,
   PR03B, PR04-through-PR07A, PR07B0, PR07B1, PR05A/B/C, clean-base PR05D,
   repaired PR06B, PR07C, PR11A-E, PR13B0/B1/B2/B3 if available, PR14B, and
   PR15A/B/C-on-PR14B before treating those finer refs as maintainer-facing
   links.
8. Until PR13B0/B1/B2/B3 have verified branch links, keep using only repaired
   PR13A/B/C links from the audit for PR13 content.
9. Do not publish raw reload-hydration deferred refs as PR07D. Current evidence
   treats the raw reload branch as rejected/held unless fresh replay proves
   PR07B0/PR07B1/PR07C non-coverage.
10. Treat the completed Cycle 296 bounded PR07 runtime-readiness replay as
    setup-blocked evidence only: it wrote nonempty artifacts, but every
    PR07B0/PR07B1/PR07C row stopped at `runtime-readiness-blocked` with
    `collaborationEnabled=null`. Consume the active Cycle 298 PR07
    collaboration-readiness repair/replay before any PR07D decision; it must
    prove `window._wpCollaborationEnabled === true`, then rerun the same
    residual seeds with snapshots.
11. Run one bounded pre-save-search/live collapse owner comparison for seed
    `961308` / `ddf9559af37e` and one rich-text suffix owner/downscope
    comparison only if those diagnostics are not already covered by the active
    continuation; keep them out of the active split until focused replay
    identifies a product owner.
12. Treat strict seed `5700084` as `covered-by-PR05C` per current
    split-persona synthesis; parser/rich-text/linebreak cases still need
    PR05B/PR05C/PR05D comparison before naming any later owner.
13. Rerun focused checks, touched-file lint, branch graph/containment evidence,
    adjacent range-diffs/diffstats/numstats, `git diff --check`, and feasible
    PR03B/PR07B0/PR07B1/PR07C runtime checks.
14. Treat the raw novelty snapshot, trend packet, and duplicate/noise synthesis
    as fuzz/control-plane health and triage evidence. The current novelty status
    supports producer backpressure work for raw duplicate-dominant
    product-evidence families, but it is not final-stack validation, a
    validated final-stack pass or failure, or filing readiness.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after environment preflight is healthy. None of the
current trend, duplicate/noise, residual reducer, or status-persona evidence is
final-stack fuzz validation or a filing unblocker.
