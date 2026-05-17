# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T05:52:47Z`

Trigger event:
`pr-split-2026-05-17T05-51-13Z-20260517T054316Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T05-51-13Z-20260517T054316Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked, but the blocker set has changed. The newest completed
split-persona synthesis, `pr-split-20260517T054316Z-synthesis.md`, keeps the
PR01-through-PR15C-on-PR14B stack but replaces the stale tail: PR17 / seed
`1020002` should be downscoped as not product-owned and should no longer be
treated as a product PR or a final-stack product blocker. Do not relaunch
duplicate `1020002` work.

The active maintainer-facing shape is now:

```text
PR01 -> PR02, with PR02A as a PR02 sidecar
-> PR03 -> PR04 -> PR05A/B/C -> PR06 -> PR06A
-> PR6B minimal malformed outgoing RTC save payloads as a PR06A sidecar
-> PR07A/B, with conditional PR07C after PR07B if browser replay and branch-link validation pass
-> PR09 -> PR10 -> PR11A-E -> PR12
-> PR13A/B0/B1/B2/B3 if published and audited; otherwise the repaired audited PR13A/B/C fallback
-> PR14 -> PR14B -> PR15A/B/C-on-PR14B
-> validation-only PR6B + optional PR07C + PR14B + PR15C head
-> pre-final gates: PR07C browser replay, 1060015, 7510029, 045710 diagnostic,
   and strict-5200005 only if the newer a914c862c29e signal is still live
-> rebuilt combined validation stack
-> final-stack fuzz and filing
```

The Cycle 232/234 replacement topology still supersedes the older
PR14/PR15/PR6B/PR16 tail:

```text
PR14 -> PR14B -> PR15A-on-PR14B -> PR15B-on-PR14B -> PR15C-on-PR14B
```

Do not publish old PR15 refs, the old polluted PR6B, candidate PR16, wildcard
`final/*` refs, raw `deferred/*` refs, `try/*` refs, validation-only heads, or
PR17-as-product.

Current residual handling:

- Seed `1020002`: downscoped/not product-owned on the newest nonempty audit;
  remove it as a product blocker and do not relaunch duplicate work.
- Old `5200005` table-delete replay: PR12-covered by the previous-local-cache
  block delete fix; not a new PR candidate.
- Possible strict-expansion `5200005` nested-group signal: do not close it by
  seed number alone; compare by signature/family if still live.
- `1060015`: PR05-near invalid-block collaboration binding/recovery; no PR5D
  or PR18 until browser repro and PR5B/PR5C comparison are complete.
- `7510029`: UI-only discriminator gate; no PR18A yet.
- `045710`: diagnostic-only reload-hydration branch; not a product PR.

## Branch And Ref Status

The remote status input was generated at `2026-05-17T05:52:41Z`.

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

The branch-link audit was generated at `2026-05-17T05:52:47Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`.

For repaired PR13 content, use only these audited review refs:

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

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified branch; keep in known-fix prefix |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified branch; keep in known-fix prefix |
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | TBD | TBD | sidecar remains in the active prefix; publish/fetch/audit before filing |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; seed `5500002` marker-retention remains separate follow-up |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified branch; keep in known-fix prefix |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | 2 | +465 / -8 | replacement for old aggregate PR 5; needs verified GitHub branch link |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | 2 | +925 / -42 | replacement for old aggregate PR 5; comparison point for parser/rich-text residuals |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | +287 / -15 | seed `5700084` remains PR5C-covered plus strict oracle/exact-content drift |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified branch; excludes malformed-save restack and broader residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified branch; narrow persisted-body guard |
| PR 6B | Minimal malformed outgoing RTC save request-payload guard after PR06A | No verified branch link yet | 2 | TBD | recommended PR06A sidecar; publish/fetch/audit before filing |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified branch; repaired split head |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified branch stacked after PR 7A; scoped to saved-CRDT-response hydration |
| PR 7C | Reload record snapshots sidecar after PR07B | No verified branch link yet | TBD | TBD | conditional sidecar; installed-clone unit/lint evidence exists, but focused browser replay and branch-link validation remain open |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; keep in known-fix prefix |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified branch; start CRDT block stack |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | 2 | +257 / -3 | finer split still needs verified GitHub branch link |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | 2 | +240 / -2 | finer split still needs verified GitHub branch link |
| PR 11C | Explicit-base middle insert | No verified branch link yet | 2 | +220 / -0 | finer split still needs verified GitHub branch link |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | 2 | +259 / -0 | finer split still needs verified GitHub branch link |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | 2 | +170 / -0 | finer split still needs verified GitHub branch link |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified branch; `5200005` table-delete replay is PR12-covered |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired audit link; first PR13 delta |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired audit link; maintainer-facing fallback until PR13B0/B1/B2/B3 are published and audited |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired audit link; use instead of stale/misordered PR13C refs |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified branch; seed `7110017` proves PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | mandatory replacement topology; publish/fetch/audit before filing |
| PR 15A | Fallback group move stale reorder, restacked on PR14B | No verified branch link yet | TBD | TBD | use PR14B topology; old pre-PR14B audited branch is prior art only |
| PR 15B | Fallback group insert anchor, restacked on PR14B | No verified branch link yet | TBD | TBD | use PR14B topology; older conflict artifacts are superseded only after ingest/audit |
| PR 15C | Fallback group delete, restacked on PR14B | No verified branch link yet | TBD | TBD | use PR14B topology; validation-only PR6B/PR14B/PR15C head is not a product PR |

Verified branches that are prior art or staging only:

- [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence)
  is verified content for old aggregate PR 5, not the recommended PR5A/B/C
  split.
- [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record)
  is verified content for old broad PR 8, not an active filing unit.
- [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops)
  is verified content for old aggregate PR 11, but the active recommendation is
  the PR11A-E split.
- [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder),
  [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor),
  and [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete)
  are verified content for the pre-PR14B PR15 shape, not the recommended
  PR15A/B/C-on-PR14B replacement.
- The finer PR13B0/B1/B2/B3 refs remain source-level evidence only until they
  are published, fetched, and reported as `verified-content` in a branch-link
  audit.

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-17T05:52:41Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T054240Z
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
stack because PR02A, PR5A/B/C, PR11A-E, PR6B, PR07C if accepted, PR13B0-B3 or
an explicit audited fallback decision, PR14B, and PR15A/B/C-on-PR14B still need
verified branch links or explicit fallback decisions.

The current raw novelty monitor input is nonempty and was updated at
`2026-05-17T05:50:13.692Z`:

```text
output dir: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T054240Z
coverage files: 40799
total records seen: 63237
current-run records by profile: {"real-user-editing":3}
current-run successful records by profile: {"real-user-editing":2}
current-run records by transport: {"ws":3}
current-run summary-only startup failures by profile: {"real-user-editing":1}
current triage signatures: 1
current raw signatures: 1
current actionable signatures: 1
current product-evidence signatures: 1
current likely-real visible: 0
current likely-real merged duplicates: 0
current likely-real oracle/noise questions: 0
current top duplicate family share: 1
current top semantic family: timeout
enabled groups: novelty-ws-real-user-editing,
  novelty-ws-real-user-rich-text
paused startup-noise cooldown groups: novelty-ws-persistence-no-title,
  novelty-ws-lifecycle
resource load1: 42.63 / 64 cores
memory: 439.3G free / 492.0G total
```

Treat the one current timeout/actionable product-evidence signature as a live
triage signal to monitor, not as final-stack validation or a filing unblocker.
The monitor still reports zero visible current likely-real failures.

Historical triage is deliberately separate and remains noisy:

```text
historical signatures: 9835
historical raw signatures: 27569
historical product-evidence signatures: 9699
historical likely-real visible: 75
historical likely-real merged duplicates: 1265
historical likely-real oracle/noise questions: 17
historical raw top duplicate family: pre_action_bootstrap_stall
historical raw top duplicate family share: 0.5023
```

Do not present those historical counts as live current-run product failures.

The latest trend evidence packet was generated at `2026-05-17T05:39:05Z` from
monitor data through `2026-05-17T05:37:11Z`:

```text
monitor passes: 1851
coverage files: 272 -> 40721
coverage files delta: 40449
unmet coverage goals: 5
likely_real_max: 2
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3523
summary_startup_failures_last: 0
quality issues: 1
trend enabled groups at that earlier snapshot: novelty-http-persistence-probe,
  novelty-ws-real-user-editing,
  novelty-ws-real-user-rich-text
fuzz level mix: browser-e2e=28 lanes/28 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 3689137
browser-e2e execution: 98180 cumulative / 464 per-hour
unit-property execution: 3182656 cumulative / 120400 per-hour
coverage-guided-lower-level execution: 405295 cumulative / 17152 per-hour
load1/load5/load15: 85.6 / 65.0 / 57.85 on 64 cores
memory: 428.4G free
```

Largest remaining coverage gaps are `ui-heading-shortcut` `751/1000`,
`reload-post-action` `762/1000`, title-save-reload `300/500`,
body-save-reload `359/500`, and successful real-user-editing records
`435/500`.

Current-run triage and historical triage must remain separate. The older trend
packet reports current duplicate share and startup failures as zero at its
snapshot; the newer raw monitor has one current timeout/product-evidence
signature and one summary-only startup failure, but still no visible likely-real
failure. Historical raw noise remains dominated by no-product startup and
duplicate families.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T054316Z-synthesis.md`. It keeps the PR01-through-PR15C-on-
PR14B stack, drops PR17/seed `1020002` as a product PR/final-stack product
blocker, and moves the remaining tail to pre-final evidence gates for PR07C
browser replay, `1060015`, `7510029`, `045710`, and any still-live strict
`5200005` nested-group signal.

The same synthesis says the controller must stop serializing independent work
behind `1020002`. It also identifies two control-plane fixes before the next
review cycle: validate stacked PRs against adjacent manifest `base_ref` instead
of `origin/trunk`, and scan blockers from the current operative topology and
Parallel Progress Gate rows rather than historical `current-pr-split.md` text.

The latest nonempty raw split report, through Cycle 236, remains useful for the
PR14B/PR15-on-PR14B and residual evidence details:

- The `050245Z` finalization report is nonempty, audited `32` product ranges,
  and kept PR07C conditional because browser replay is still blocked by the
  Playwright host-library / built e2e-test-utils environment.
- `5200005` table-delete replay is PR12-covered by previous-local cache block
  delete evidence and should not become PR18x.
- `1060015` remains PR05-near and needs browser repro in a prepared Playwright
  environment before any PR5D/product branch is justified.
- `7510029` remains a UI-only discriminator gate because the source-local
  nested-delete test passed on PR15C-on-PR14B.
- The `045710` reload-hydration branch is nonempty diagnostic-only evidence;
  it has diff/format/lint evidence but no browser E2E run.

The newest duplicate/noise synthesis,
`duplicate-noise-20260517T053845Z-synthesis.md`, keeps duplicate/noise work in
the fuzzer control plane, not in the product PR split. It says the remaining
risk is root-wide analysis admission: `live-analysis-monitor`,
`analysis-tier`, and `deep-analysis-tier` can still spend repeated Codex work
on sibling same-family signatures under one supervised root, especially
product-evidence duplicate families such as `late_session_awareness_stall`.
The recommended next fix is one representative first-level and one
representative deep analysis per semantic family per supervised root while
preserving source signatures and product evidence.

The latest applied duplicate/noise action remains
`duplicate-noise-20260517T051517Z-feedback-action.md`. It updated only
`bin/rtc-browser-fuzz-novelty-monitor.mjs` in the remote fuzz repo: generic
duplicate holds now require no product evidence, active producer groups are
scanned independently for no-product duplicate/noise dominance, producer
no-analysis sentinels preserve product evidence, and open-ended coverage Codex
is held when historical known-noise dominates and current-run validation is
absent.

Validation for that duplicate/noise action:

```text
node --check bin/rtc-browser-fuzz-novelty-monitor.mjs: passed
bounded live-analysis consumer pass: all 3 active groups skipped as no actionable signature
new current root after restart: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T053102Z
```

After that action, the current root moved again to `run-20260517T054240Z`; the
`05:50:13Z` monitor reports one current timeout/actionable product-evidence
signature and zero visible likely-real failures. That is live triage input, not
final-stack fuzz validation.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", "do not add PR6B", stale PR13 review-ref warnings, and "only novelty-
http is enabled" claims are superseded by the `2026-05-17T05:52:47Z`
branch-link audit, the latest trend packet, the nonempty raw novelty monitor,
and the latest split and duplicate/noise syntheses.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR14B / PR15-on-PR14B finalization | Cycle 232/234 replacement topology and validation-only sidecar evidence | mandatory replacement topology, but no current `verified-content` branch links for PR14B or PR15-on-PR14B | Publish/fetch/audit the ready refs until the GitHub branch-link audit exposes verified PR-content links; keep validation-only heads out of product PRs |
| Malformed-save request-payload PR6B | minimal PR06A sidecar; old polluted PR6B and historical validation heads are superseded | active recommended sidecar after PR06A, but no current `verified-content` branch-link audit row exists | Publish/fetch/audit the minimal product branch, keep validation-only heads out of filing branches, verify inclusion in the PR14B/PR15-on-PR14B validation stack |
| PR07C reload record snapshots | conditional sidecar after PR07B | plausible sidecar only; adjacent ancestry, diff check, formatting, unit, dependency, and lint evidence exist, but no verified branch link or focused browser replay completion exists | Repair or explicitly own the Playwright host-library/build-artifact blocker; then run focused browser replay before adding it to filing |
| PR13 finer split | PR13B0/B1/B2/B3 source-level evidence; repaired audited PR13A/B/C fallback links | preferred source split is PR13A/B0/B1/B2/B3, but proposed rows currently use only repaired audited PR13A/B/C links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired PR13B/C fallback rows |
| Seed `1020002` WebSocket marker divergence | latest split synthesis downscopes it as not product-owned | no longer a product PR or final-stack product blocker; do not relaunch duplicate work | Consume the downscope into filing notes and keep it out of blocker scans unless later evidence contradicts the not-product-owned classification |
| Reload/post-save `5200005` table-delete replay | completed reducer evidence | PR12-covered by previous-local-cache block delete; not a new product branch | Consume the classification into filing notes; do not assign a PR18/reload product branch unless later evidence contradicts the PR12-covered result |
| Strict `5200005` nested-group signal | possible newer strict-expansion signal `a914c862c29e` | evidence-only if still live; do not close by seed number alone | Compare by signature/family against PR12, PR13B*, PR14B, and PR15C-on-PR14B before promotion |
| Parser-sensitive seed `1060015` | focused WebSocket artifact pending prepared browser environment | unassigned evidence; latest split keeps it near PR05B/PR05C/possible PR5D | Repair Playwright host libraries and built `@wordpress/e2e-test-utils-playwright`, then run the focused WebSocket artifact before naming a PR5D-style branch |
| Seed `7510029` nested-child delete residual | source-local nested-delete red test passed on PR15C-on-PR14B; UI-only discriminator prompt pending | evidence-only; do not name PR18A yet | Run the UI-only Playwright discriminator only after the PR07C browser environment blocker is repaired or explicitly owned |
| `045710` reload-hydration diagnostic | nonempty diagnostic-only branch and report | not a product PR; no browser E2E run | Replay only in the prepared browser environment; keep out of PR 6, PR 6A, PR 8A, PR 15, and fallback-group claims |
| Seed `7700055` table query-array identity loss | earlier minority signal | lower-priority evidence-only; do not create a generic PR18 bucket | Run a lower-priority red test only after comparing against PR14/PR14B |
| Seed `5700084` strict linebreak divergence | live `core/verse.attributes.content` `\n` vs `<br>` comparison | no product PR; classified as PR5C-covered plus strict oracle/exact-content drift | Downscope/update the strict oracle; do not create PR18A or PR5D for this seed |
| Fresh parser/rich-text/linebreak residuals | strict-expansion and focused-shard residuals | source-reduction input only; do not name PR18x yet | Source-reduce and compare against PR5B/PR5C, PR11, PR13, PR14B, PR15, and existing parser/oracle coverage |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit | Shape and audit a narrowed title-reload branch only if PR8A is revived |
| Pre-save search/live document collapse | prior pre-save search/live-collapse candidate rows | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Rich-text formatted suffix corruption | diagnostic publication candidates and prior deferred refs | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Broader HTTP polling room-isolation residuals | PR02A sidecar plus stale deferred relaunches | PR02A remains in the known-fix prefix but has no verified branch link; broader residuals stay deferred | Publish/fetch/audit a PR02A review branch before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack preparation; no automatic PR slot | Triage only after the rebuilt stack is available |
| Duplicate/noise control-plane recycling | latest duplicate/noise synthesis/action; raw novelty monitor at `2026-05-17T05:50:13.692Z` | producer-side monitor fix passed syntax and bounded live-analysis checks; current root reports one timeout/actionable product-evidence signature and zero visible likely-real failures; root-wide first/deep analysis family caps remain open | Keep current-run and historical duplicate/noise scopes separate, preserve product-evidence signatures, implement supervised-root semantic-family analysis caps before more open-ended Codex, and require fresh nonempty monitor evidence before treating future producer holds or broad launches as safe |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr` branches as-is.

Before filing any maintainer-facing PR:

1. Use the explicit ready/review prefix. Do not wildcard import or file
   `final/rtc-pr*`, validation-stack branches, deferred branches, or dirty
   evidence branches.
2. Keep old aggregate PR 5, broad PR 8, aggregate PR 11, stale/misordered
   PR13 refs, old PR6B/PR16 material, PR6C, dirty evidence branches, and the
   untracked reload-hydration gate spec out of filing branches and push
   allow-lists.
3. Publish/fetch and audit PR02A, PR5A/B/C, PR11A-E, PR6B minimal, PR07C if
   accepted, PR13B0/B1/B2/B3, and the current PR14B/PR15A/B/C-on-PR14B refs
   before treating those finer refs as maintainer-facing links.
4. Until PR13B0/B1/B2/B3 have verified branch links, keep using only repaired
   PR13A/B/C links from the audit for PR13 content.
5. Finish PR14B/PR15-on-PR14B ingestion. Require a nonempty report, branch
   audit, push manifest, range-diff, diffstat/numstat, focused validation,
   `git diff --check`, and verified branch links before filing those rows.
6. Finish PR6B publication and branch-link verification before filing it.
   Require a clean GitHub review ref, sidecar manifest/validation evidence,
   focused tests, lint, formatting, build, seed replay evidence, branch audit,
   explicit inclusion in the PR14B/PR15-on-PR14B validation stack, and a
   verified branch link.
7. Finish PR07C's focused browser replay from the installed clone, after the
   Playwright host-library/build-artifact blocker is repaired or explicitly
   owned, before deciding whether to add it after PR07B.
8. Consume PR17/seed `1020002` as downscoped/not product-owned and stop using
   it as a product PR/final-stack product blocker unless newer evidence
   contradicts that classification.
9. Consume the completed `5200005` table-delete reducer as PR12-covered
   evidence. If the strict-expansion `5200005` nested-group signal is still
   live, compare by signature/family before promotion.
10. Run the `1060015` focused browser / WebSocket artifact in a prepared e2e
    environment before assigning that signal to PR05, PR18, PR5D, or another
    product branch.
11. Run the `7510029` UI-only Playwright discriminator before naming any
    PR18A-style product branch.
12. Treat `045710` as diagnostic-only unless focused browser replay proves
    product ownership and a clean branch is shaped.
13. Compare lower-priority `7700055` against PR14/PR14B before treating it as a
    new product PR.
14. Rebase or recreate each intended PR branch on the intended upstream base if
    that base moves.
15. Regenerate branch graph/containment evidence and adjacent
    range-diffs/diffstats from the actual filing repo.
16. Rerun focused checks, touched-file lint, and `git diff --check` on every
    imported/rebased branch.
17. Rebuild the combined stack from explicit PR01-PR06A heads, PR02A, PR6B as
    a sidecar, PR07A/B plus PR07C if accepted, PR09-PR15C-on-PR14B, the PR13
    finer split or audited fallback decision, and any accepted source-reduced
    residual branches.
18. Rerun bounded final-stack validation against the rebuilt stack and count it
    only if it reaches action-level product coverage and proves PR6B and the
    PR14B/PR15-on-PR14B refs were included.
19. Block filing if any visible current likely-real failures appear in a fresh
    nonempty monitor snapshot.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after environment preflight is healthy. Do not run
broad/final-stack fuzz while PR14B/PR15-on-PR14B branch links, PR6B GitHub
branch links, PR07C validation, PR13 finer branch links or fallback decision,
the `1060015`, `7510029`, `045710`, and possible strict-`5200005` evidence
gates, rebuilt validation, branch-link audits, and fresh nonempty final-stack
monitor evidence are open. None of the current trend, duplicate/noise, or
residual reducer evidence is final-stack fuzz validation or a filing unblocker.
