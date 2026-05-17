# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T10:53:24Z`

Trigger event:
`duplicate-noise-2026-05-17T10-52-34Z-118`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/duplicate-noise-2026-05-17T10-52-34Z-118/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked, but the PR06B wait state changed. The newest completed
split-persona synthesis, `pr-split-20260517T103916Z-synthesis.md`, keeps the
Cycle 252/254 no-PR03B main spine and invalidated the old PR06B-as-PR06A
sidecar assumption. The raw split file now has a Cycle 260 addendum recording
that the Cycle 258 helper-dedupe job completed the required artifact package
and produced a repaired PR06B-on-PR07B sidecar candidate. Bounded checks passed
for `actions.js`, `entities.js`, touched JS lint, and `git diff --check`.
Filing is still blocked because runtime readiness and final-stack validation
must be rebuilt against the repaired topology, and the PR06B/PR07C sidecars
still lack current `verified-content` GitHub branch links.

Current maintainer-facing product spine, excluding runtime-gated sidecars:

```text
PR01 -> PR02 -> PR03 -> PR04 -> PR05A/B/C -> PR06 -> PR06A
-> PR07A/B -> PR09 -> PR10 -> PR11A-E -> PR12
-> PR13A/B0/B1/B2/B3 -> PR14 -> PR14B
-> PR15A/B/C-on-PR14B
```

Sidecar and validation-only shape:

```text
PR02A after PR02: HTTP room-isolation regression
PR03B after PR03: browser restoreRevision CRDT invalidation, runtime-gated
PR06B after PR07B: repaired malformed-save request-payload sidecar candidate
  `cycle258/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b`
PR07C after PR07B: reload record snapshots
validation heads: fetch-only, not product PRs
```

Current blockers and status changes:

- Do not file or push product PRs, run broad final-stack fuzz, or rerun seed
  `1020002` until runtime readiness is classified against the repaired
  Cycle258 topology and rebuilt stack-wide validation proves it is still
  needed.
- Use
  `cycle258/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b`
  at `b7addcd16ae9ca4a2f7a1255e6580a74f89ccb88` as the active PR06B
  publication candidate. The old
  `finalized/cycle252/sidecar/rtc-pr06b-malformed-save-request-payload-minimal`
  branch is historical input evidence only.
- Treat
  `cycle258/validation/no-pr03b-main-plus-pr03b-pr06b-on-pr07b-pr07c-sidecars`
  at `b13c888954fce271c3f64e48d2f83e9b1403fbbf` as fetch-only validation
  evidence, not product PR content.
- The refreshed Cycle258 manifest covers the newer reload-hydration diagnostic,
  `deferred/rtc-reload-hydration-20260517T100637Z` at `c59a2fba4ff1`. Refresh
  those artifacts again if a newer deferred candidate lands.
- Continue PR03B, `980007`, `5900001`, and `5400002` runtime-readiness
  classification against the repaired topology only when it produces nonempty
  replay reports.
- Add the narrow `9f4dcc759070` sync undo/history red or instrumented test.
- The Cycle260 PR05B/PR05C strict parser/rich-text/entity/linebreak
  owner-comparison job is the active independent gate before any PR17, PR18, or
  PR18x naming.

Duplicate/noise work remains fuzzer control-plane work, not product PR work.
The latest duplicate/noise action pass,
`duplicate-noise-20260517T102647Z-feedback-action.md`, completed a narrow
remediation: gate-only triage status rendering was hardened, known-noise family
lookup was fixed, stale external analysis/deep-analysis tmux cleanup was
broadened, and novelty policy now separates active current dirs from
paused/no-analysis drain dirs. `node --check` passed for all four changed
scripts, gate-only triage on the active current run reported `candidates=0` and
`signatures=0` for both active groups, live-analysis one-shot skipped both
groups as no-actionable-signature, and 27 stale external analysis/deep-analysis
sessions were killed. Product-evidence failures must remain eligible when they
appear, but the reset current run now has zero active-current actionable,
product-evidence, likely-real, or duplicate-family-dominated signatures. Do not
make product split changes, broad suppression changes, or start new fuzz/Codex
campaigns from that control-plane evidence.

## Branch And Ref Status

Remote status was collected at `2026-05-17T10:53:19Z`.

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

That repo has modified product/test files and many untracked fuzz, analysis,
and documentation artifacts. It is active validation infrastructure, not the
final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-17T10:53:24Z` from fetched
`danluu` refs. Proposed PR rows below use only rows marked `verified-content`,
or explicitly say `No verified branch link yet`.

The current local-machine mappings from the latest progress-unblock pass are
useful branch/ref status, but they are not `verified-content` rows in the
fetched branch-link audit and are therefore not used as PR-content links in the
proposed rows below:

- PR02A: `ready-pr03b/rtc-pr02a-http-room-isolation-regression` at
  `9303a7715cf3e2495e743c90ec5a4f8f0080e2dc`.
- PR03B: `ready-pr03b/rtc-pr03b-browser-revision-restore-crdt-invalidation`
  at `cbab481fe76057c17cafeea6353d7bf75c904052`.
- Active no-PR03B main spine tip:
  `finalized/cycle252/no-pr03b/rtc-pr15c-fallback-group-delete-green-on-pr14b`
  at `98034aa49b4b7bff7f3d61b2a247bca807bef08d`.
- Active PR06B sidecar candidate:
  `cycle258/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b`
  at `b7addcd16ae9ca4a2f7a1255e6580a74f89ccb88`, based on PR07B at
  `623383357ab063799a0cd047d11091dde17284d1`.
- Old PR06B sidecar, now historical input evidence only:
  `finalized/cycle252/sidecar/rtc-pr06b-malformed-save-request-payload-minimal`
  at `9ee162f7c2bd9e6551dcc133994983da6967ad4f`; this shape was blocked by the
  duplicate-helper failure when combined with PR07B/PR07C.
- PR07C: `finalized/cycle252/sidecar/rtc-pr07c-reload-record-snapshots` at
  `2d112932f0e30bb50f6a0277d6803d3a1d6dd1d5`.
- Current fetch-only validation evidence head:
  `cycle258/validation/no-pr03b-main-plus-pr03b-pr06b-on-pr07b-pr07c-sidecars`
  at `b13c888954fce271c3f64e48d2f83e9b1403fbbf`; it contains PR03B,
  repaired PR06B-on-PR07B, and PR07C as evidence only.
- Old fetch-only validation head, now superseded:
  `finalized/cycle254/validation/no-pr03b-main-plus-pr03b-pr06b-pr07c-sidecars`
  at `6b36a3bd79afc6e8c63b1d7c6200d52d22f0b179`.
- Older reload-hydration diagnostic:
  `deferred/rtc-reload-hydration-20260517T093634Z` at
  `7c98344661b3123069c94c79776304a6db686aac`.
- Newer completed reload-hydration diagnostic covered by the refreshed
  progress-unblock manifest:
  `deferred/rtc-reload-hydration-20260517T100637Z` at `c59a2fba4ff1`.

For repaired PR13 content, use only these audited review refs:

- [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired)
- [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement)
- [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard)

Do not link stale or misordered PR13 refs listed by the audit under
`Explicitly Not PR-Content Links`.

## Proposed PR Split

Every proposed row either uses a clickable branch link from the verified
branch-link audit or explicitly says `No verified branch link yet`.

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified branch; keep in known-fix prefix |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified branch; keep in known-fix prefix |
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | TBD | TBD | sidecar; publish/fetch/audit before filing |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; seed `5500002` marker-retention remains separate follow-up |
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR 3 | No verified branch link yet | TBD | TBD | PR03 sidecar / validation-only sidecar until browser/PHP runtime replay passes |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified original branch; no-PR03B product ref still needs verified audit if republished |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | 2 | +465 / -8 | replacement for old aggregate PR 5; needs verified GitHub branch link |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | 2 | +925 / -42 | replacement for old aggregate PR 5; comparison point for parser/rich-text residuals |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | +287 / -15 | seed `5700084` is PR05C-covered plus oracle-equivalence downscope unless new evidence contradicts it |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified original branch; excludes malformed-save sidecar and broader residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified original branch; narrow persisted-body guard |
| PR 6B | Malformed outgoing RTC save request-payload guard, revised against PR07B helper shape | No verified branch link yet | TBD | TBD | active local candidate is `cycle258/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b` at `b7addcd16ae9ca4a2f7a1255e6580a74f89ccb88`; publish/fetch/audit before filing |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified original branch; no-PR03B product ref still needs verified audit if republished |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified original branch stacked after PR 7A |
| PR 7C | Reload record snapshots sidecar after PR 7B | No verified branch link yet | TBD | TBD | accepted sidecar included in the Cycle258 fetch-only validation evidence head; publish/fetch/audit the product branch before filing |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; keep in known-fix prefix |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified branch; start CRDT block stack |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | 2 | +257 / -3 | finer split still needs verified GitHub branch link |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | 2 | +240 / -2 | finer split still needs verified GitHub branch link |
| PR 11C | Explicit-base middle insert | No verified branch link yet | 2 | +220 / -0 | latest source-local evidence marks `a914c862c29e` / seed `5200005` covered here |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | 2 | +259 / -0 | finer split still needs verified GitHub branch link |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | 2 | +170 / -0 | finer split still needs verified GitHub branch link |
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
  is verified content for old aggregate PR 5, not the recommended PR05A/B/C
  split.
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
collected_at_utc: 2026-05-17T10:53:19Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T104119Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Raw novelty status is present for `run-20260517T104119Z`, but it is
coverage/control-plane health evidence only. It is not rebuilt final-stack
validation and must not be treated as either filing readiness or a validated
final-stack failure.

Latest novelty monitor snapshot, updated at `2026-05-17T10:51:29.461Z`:

```text
coverage files: 43183
total records seen: 66836
records processed this pass: 62
new behavioral feature keys this pass: 3
new CDP coverage hashes this pass: 3
current-run actionable signatures: 0
current-run likely-real visible: 0
current-run product-evidence signatures: 0
current-run records by profile: real-user-editing=7
current-run successful records by profile: real-user-editing=7
active-current duplicate family share: 0
drain duplicate family share: 0
historical signatures: 9888
historical likely-real visible: 156
top historical duplicate family share: 0.353
enabled groups: novelty-ws-real-user-editing, novelty-ws-real-user-rich-text
paused groups: novelty-ws-lifecycle, novelty-http-persistence-probe
load1: 67.41 / cores: 64
memory free: 423.9G / 492.0G
headroom for adding groups: no
```

The current run reset from `run-20260517T101235Z` to `run-20260517T104119Z` at
`2026-05-17T10:41:31Z`, preserving the two unexpired startup-noise cooldowns
while resetting current-run startup and quality counters. It is producing
successful `real-user-editing` records, but it currently has no current-run
actionable, likely-real, product-evidence, or active duplicate-family-dominated
signatures. That is coverage/control-plane health evidence, not rebuilt
final-stack validation. The
paused lifecycle and HTTP probe groups remain inside startup-noise cooldowns;
the enabled groups are the two WS real-user lanes.

The latest trend evidence packet was generated at `2026-05-17T10:44:16Z` from
monitor data through `2026-05-17T10:38:11Z`:

```text
monitor passes: 1938
coverage files: 272 -> 43016
coverage files delta: 42744
unmet coverage goals: 5
likely_real_max: 4
duplicate_share_current_last: 1
duplicate_share_historical_last: 0.3536
summary_startup_failures_last: 0
quality issues: 0
enabled groups current: novelty-ws-real-user-rich-text,
  novelty-ws-real-user-editing
fuzz level mix: browser-e2e=28 lanes/27 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 4949517
browser-e2e execution: 101420 cumulative / 704 per-hour
transport-integration execution: 3006 cumulative / 0 per-hour
unit-property execution: 4416756 cumulative / 216720 per-hour
coverage-guided-lower-level execution: 428335 cumulative / 0 per-hour
load1/load5/load15: 62.69 / 64.94 / 63.53 on 64 cores
memory: 424.1G free
```

The trend packet's `duplicate_share_current_last` is from before the
`10:41:31Z` current-run reset. The newer novelty monitor is the current
duplicate/noise authority for this report and shows active-current and drain
duplicate share at `0`.

Largest current novelty gaps in the newer novelty monitor are
`ui-heading-shortcut` `827/1000`, `reload-post-action` `845/1000`,
title-save-reload `352/500`, body-save-reload `411/500`, and successful
real-user-editing records `477/500`.

The fuzzing level mix is still browser-heavy. With current headroom closed,
prefer guarded top-offs, startup-stall reduction, and bounded lower-level
targets with clear oracles over broad browser concurrency.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T103916Z-synthesis.md`. It says:

- status remains blocked and not filing-ready;
- keep the Cycle 252/254 no-PR03B main spine;
- keep PR03B as a runtime-gated PR03 sidecar and PR07C as a PR07B sidecar;
- keep validation heads fetch-only, not product PRs;
- replace the current PR06B assumption because the independent PR06A sidecar
  is not proven composable with PR07B/PR07C;
- try a deduped PR06B-on-PR07B sidecar that reuses the PR07B block-tree helper,
  with a mainline PR06B-before-PR07A/B restack only if the sidecar is worse;
- the raw split file's Cycle 260 addendum supersedes the earlier wait state:
  Cycle258 produced nonempty `report.md`, `classification.tsv`,
  `validation-checks.tsv`, `branch-audit.tsv`, `push-manifest.tsv`,
  `artifact-verification.tsv`, `repair.diff`, and `validation-merge.log`;
  the active PR06B sidecar candidate is now
  `cycle258/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b`,
  and the fetch-only validation evidence head is
  `cycle258/validation/no-pr03b-main-plus-pr03b-pr06b-on-pr07b-pr07c-sidecars`;
- do not create PR17, PR18, or PR18x product slots from strict-expansion
  reductions before PR05B/PR05C owner comparison;
- do not count active `1020002`, wait-only feedback, zero-byte/tmp outputs, or
  stale manifests as progress;
- the `20260517T103150Z` progress-unblock pass produced fresh branch/audit and
  manifest artifacts for the no-PR03B stack, held sidecars, fetch-only
  validation refs, and `20260517T100637Z` reload-hydration diagnostic; the
  newer Cycle258 helper-dedupe manifest is fresher and covers that diagnostic;
- bounded follow-up work can proceed on PR05B/PR05C strict parser/rich-text
  owner comparison, the `9f4dcc759070` sync undo/history red or instrumented
  test, and stale split-tail/ref filtering if the controller loops still
  consume stale inputs;
- after runtime is usable, replay `6dffde406703` / seed `5900001` against
  `candidate/rtc-reload-ws-provider-lifecycle-diagnostics-20260517T100637Z`
  as diagnostic evidence, not product promotion.

The latest duplicate/noise synthesis and completed feedback action say:

- the duplicate/noise problem is control-plane drift, not evidence of a
  product split change;
- no-product strict startup noise should stay non-actionable, while
  product-evidence and visible likely-real records must stay eligible;
- the smallest safe cleanup is to fix gate-only triage status rendering, force
  gate-only refresh before launch decisions, kill analysis sessions outside the
  current output root, and use only active current dirs for novelty policy,
  health, and Codex holds;
- that cleanup has now run for the active coverage-guided root:
  `node --check` passed on all touched scripts, gate-only triage found no
  active current candidates/signatures, live-analysis skipped both enabled
  groups as no-actionable-signature, 27 stale external analysis sessions were
  killed, and current novelty active/drain triage both report zero signatures;
- broad product-evidence family capping, extra fuzz launch, and product PR
  changes stay deferred; external focused/gap/strict campaign supervisors
  still exist outside the active coverage-guided root, so keep checking only
  confirmed local control-plane leaks.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", "do not add PR06B", stale PR13 review-ref warnings, and "only
novelty-http is enabled" claims are superseded by the current branch-link
audit, current novelty/trend inputs, Cycle 252/254 no-PR03B topology, repaired
PR13 audit refs, and the latest PR06B/PR07B composability evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR06B / PR07B helper dedupe | Cycle 256 validation failure in `packages/core-data/src/actions.js`; Cycle258 repair artifacts | old independent PR06A sidecar is superseded; Cycle258 produced repaired PR06B-on-PR07B candidate `b7addcd16ae9ca4a2f7a1255e6580a74f89ccb88` and fetch-only validation head `b13c888954fce271c3f64e48d2f83e9b1403fbbf`; `actions.js`, `entities.js`, touched JS lint, and `git diff --check` passed | Publish/fetch/audit an explicit PR06B product branch before filing; classify runtime readiness and rebuilt stack validation against the Cycle258 topology |
| PR14B / PR15-on-PR14B finalization | `20260517T074254Z`, `20260517T082257Z`, and Cycle 252 no-PR03B branch-shaping artifacts | mandatory replacement topology; the progress-unblock pass maps the active no-PR03B main spine tip to `finalized/cycle252/no-pr03b/rtc-pr15c-fallback-group-delete-green-on-pr14b` at `98034aa49b4b`, but no current `verified-content` branch links exist for PR14B or PR15-on-PR14B; stale `ready-pr03b/*` main-spine reports are topology-stale | Publish/fetch/audit only explicit no-PR03B product refs after sidecar-aware audit and keep validation-only heads out of product PRs |
| PR07C reload record snapshots | accepted sidecar after PR07B; latest sidecar repair evidence | repair is durable at `2d112932f0e3` and included in the Cycle258 fetch-only validation topology; no current `verified-content` branch-link row exists | Publish/fetch/audit the sidecar-aware PR07C product branch and keep validation-only heads out of product PR rows |
| PR03B browser `restoreRevision` CRDT invalidation | `ee0d01a82e12`; Cycle 252 sidecar decision | PR03 sidecar / validation-only sidecar until browser/PHP runtime replay passes; progress-unblock maps it to `ready-pr03b/rtc-pr03b-browser-revision-restore-crdt-invalidation` at `cbab481fe760`, but current replay is blocked by `gutenberg_override_style()` and `collaborationEnabled:null` | Finish bounded runtime replay for PR03B; do not put PR03B back into the main spine without passing evidence |
| PR13 finer split | PR13B0/B1/B2/B3 source-level evidence; repaired audited PR13A/B/C fallback links | preferred source split is PR13A/B0/B1/B2/B3, but proposed rows currently use only repaired audited PR13A/B/C links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing repaired PR13B/C fallback rows |
| Seed `1020002` WebSocket marker divergence | final-stack validation/fuzz history | final-stack validation/fuzz/filing-only; not an independent-work blocker and not PR17 product work | Keep it out of product blocker scans unless later evidence proves product ownership; settle only after runtime readiness is classified against the repaired topology and rebuilt validation still requires it |
| `980007` / `980017` marker-divergence owner comparison | Cycle 248/250 owner-comparison queue; runtime unblock replays | no PR18x from current evidence; replay `980007` against the validation head first, then PR12, PR15C, and PR07C only if still red; keep `980017` blocked on missing `result.json` and `handoff.md` | Emit provider snapshots and consume runtime replay outputs before assigning ownership |
| `9f4dcc759070` Search button undo/history issue | Cycle 252 owner comparison | classified as sync undo/history redo-stack loss through `core/search.buttonText`, not PR05B/PR05C and not PR18x | Add a narrow sync undo-manager red test or instrumented repro around Search button-text undo |
| Reload/post-save `5200005` table-delete replay | completed reducer evidence | PR12-covered by previous-local-cache block delete; not a new product branch | Consume the classification into filing notes; reopen only if later evidence contradicts PR12 coverage |
| Strict `5200005` nested-group signal | `a914c862c29e` | latest source-local evidence marks it PR11C-covered; no PR18x assignment | Consume PR11C-covered classification; reopen only on fresh red evidence |
| Parser-sensitive seed `1060015` | prior focused WebSocket/browser artifacts | downscoped out of current product blockers unless new red evidence appears | Keep out of PR5D/PR18 unless a fresh prepared-browser repro and source-owner reducer prove product ownership |
| Seed `7510029` nested-child delete residual | source-local nested-delete red test passed on PR15C-on-PR14B | downscoped out of current product blockers unless new red evidence appears | Keep out of PR18A unless a fresh UI-only browser repro proves source ownership |
| Reload-hydration diagnostics | `045710`, `055716`, `062719`, `065722`, `073541`, `093634`, `100637` diagnostics | diagnostic-only unless newer evidence proves product ownership; latest completed diagnostic is `deferred/rtc-reload-hydration-20260517T100637Z` at `c59a2fba4ff1`, and the `20260517T103150Z` progress-unblock manifest now covers it | Keep branch audit / push manifest fresh if newer diagnostics land; after runtime is usable, replay `6dffde406703` / seed `5900001` against `candidate/rtc-reload-ws-provider-lifecycle-diagnostics-20260517T100637Z` as diagnostics only |
| Seed `7700055` table query-array identity loss | earlier minority signal | lower-priority evidence-only; do not create a generic PR18 bucket | Run a lower-priority red test only after comparing against PR14/PR14B |
| Seed `5700084` strict linebreak divergence | Cycle 240 owner/downscope artifacts | consumed as PR05C-covered / oracle-equivalence downscope; not an open PR18x gate | Keep out of PR18x/PR5D unless new source-owned product evidence appears |
| Fresh strict/focused/current likely-real residuals | current strict-expansion and focused-shard rows; Cycle260 PR05B/PR05C owner-comparison job | owner-triage input only; do not name PR18x from historical duplicate/noise aggregates or incomplete current-run novelty output | Let the Cycle260 PR05B/PR05C owner-comparison job emit nonempty `report.md`, `classification.tsv`, `owner-comparison.tsv`, `branch-audit.tsv`, and `artifact-verification.tsv`; compare revision rows against PR03/PR03B/PR07C and block-tree rows against PR11C/PR12 before later owners |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit | Shape and audit a narrowed title-reload branch only if PR8A is revived |
| Pre-save search/live document collapse | prior candidate rows | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Rich-text formatted suffix corruption | diagnostic candidates and prior deferred refs | not fixed; latest split keeps it out of active PR split | Recover exact replay artifact or emitted delta before product changes |
| Broader HTTP polling room-isolation residuals | PR02A sidecar plus stale deferred relaunches | PR02A remains in the known-fix prefix but has no verified branch link; broader residuals stay deferred | Publish/fetch/audit PR02A before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack preparation; no automatic PR slot | Triage only after rebuilt stack is available |
| Duplicate/noise control-plane recycling | `duplicate-noise-20260517T102647Z-synthesis.md`; `duplicate-noise-20260517T102647Z-feedback-action.md` | control-plane only; no product-code split change; narrow cleanup was patched and validated, current active/drain triage both report zero signatures, and stale external analysis sessions were killed | Keep product-evidence failures visible, avoid broad suppression, and verify only confirmed control-plane leaks outside the active coverage-guided root |

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
3. Use the repaired Cycle258 PR06B-on-PR07B sidecar candidate for further
   validation. The old Cycle254 validation head and old PR06B sidecar are
   superseded by the duplicate-helper failure and must stay historical input
   evidence only.
4. Treat
   `cycle258/validation/no-pr03b-main-plus-pr03b-pr06b-on-pr07b-pr07c-sidecars`
   at `b13c888954fce271c3f64e48d2f83e9b1403fbbf` as fetch-only validation
   evidence, not product content.
5. Before rebuilt combined validation or filing, classify runtime readiness
   against the repaired topology and rerun any feasible PR03B/PR07C runtime
   checks. Cycle258 already passed bounded `actions.js`, `entities.js`, touched
   JS lint, and `git diff --check`.
6. Publish/fetch and audit explicit sidecar-aware product refs for PR02A,
   PR03B, PR04-through-PR07B, PR05A/B/C, repaired PR06B, PR07C, PR11A-E,
   PR13B0/B1/B2/B3 if available, PR14B, and PR15A/B/C-on-PR14B before treating
   those finer refs as maintainer-facing links.
7. Until PR13B0/B1/B2/B3 have verified branch links, keep using only repaired
   PR13A/B/C links from the audit for PR13 content.
8. Use the refreshed branch-audit and push-manifest artifacts that cover
   `deferred/rtc-reload-hydration-20260517T100637Z`; refresh again if newer
   deferred diagnostics land, and do not let stale `093634` manifests count as
   current.
9. Rerun focused checks, touched-file lint, branch graph/containment evidence,
   adjacent range-diffs/diffstats/numstats, `git diff --check`, and any
   feasible PR03B/PR07C runtime checks.
10. Settle seed `1020002` only as a final-stack validation/fuzz/filing gate
    after runtime readiness is classified against the repaired topology and
    rebuilt validation still requires it.
11. Consume `980007`, `5900001`, and `5400002` runtime replay outputs; keep
    `980017` blocked until its missing `result.json` and `handoff.md` exist.
12. Let the Cycle260 PR05B/PR05C owner-comparison job emit nonempty comparison
    artifacts, then add the narrow `9f4dcc759070` sync undo/history red test or
    instrumented repro before inventing a PR18x bucket.
13. Keep reload-hydration diagnostics diagnostic-only until focused replay
    proves product ownership and a clean branch is shaped.
14. Treat the current novelty status and trend packet as fuzz/control-plane
    health evidence, not as final-stack validation, a validated final-stack
    pass or failure, or filing readiness.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after environment preflight is healthy. None of the
current trend, duplicate/noise, residual reducer, or status-persona evidence is
final-stack fuzz validation or a filing unblocker.
