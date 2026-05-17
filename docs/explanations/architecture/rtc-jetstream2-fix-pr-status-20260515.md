# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T07:08:25Z`

Trigger event:
`pr-split-2026-05-17T07-04-54Z-20260517T065712Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T07-04-54Z-20260517T065712Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked, and the newest completed split-persona synthesis,
`pr-split-20260517T065712Z-synthesis.md`, changes the split: insert a narrow
PR03-family `PR03B` immediately after PR03 for browser `restoreRevision` CRDT
invalidation. The PR01-through-PR15C-on-PR14B spine remains usable, PR07C stays
an accepted PR07B sidecar, PR6B stays the minimal malformed-save sidecar near
PR06A, PR17 / seed `1020002` remains removed as product work, and seed
`5700084` remains PR05C-covered / oracle-equivalence downscoped. `ee0d01a82e12`
is no longer a generic pre-final owner gate, PR07C slot, or PR18x candidate; it
is PR03B work until a branch job proves otherwise.

The active independent gates are now PR03B branch shaping, `a914c862c29e` /
seed `5200005` PR11C/PR12-first source-local red/green, and a strict-current
owner batch. The Cycle 242 post-`062719` manifest/branch refresh has completed
and keeps that reload-hydration branch diagnostic-only. None of the remaining
gates justify a generic PR18x slot yet.

The duplicate/noise first-pass control-plane fix remains applied and validated
by `duplicate-noise-20260517T063152Z-feedback-action.md`: fault injection
metadata alone no longer counts as product evidence for startup/no-analysis
gates across supervisor, triage, analysis, deep-analysis, live-monitor, and
novelty paths. Validation passed `node --check` on the six changed `.mjs`
files plus fault-only and product-evidence fixtures, and the coverage-guided
novelty/supervisor/live-analysis sessions were restarted. This is fuzzer
control-plane health work, not a product PR split change.

The active maintainer-facing shape is now:

```text
PR01 -> PR02, with PR02A as a PR02 sidecar
-> PR03 -> PR03B browser restoreRevision CRDT invalidation -> PR04
-> PR05A/B/C -> PR06 -> PR06A
-> PR6B minimal malformed outgoing RTC save payloads as a PR06A sidecar
-> PR07A/B, with PR07C accepted as a PR07B sidecar
-> PR09 -> PR10 -> PR11A-E -> PR12
-> PR13A/B0/B1/B2/B3 if published and audited; otherwise the repaired audited PR13A/B/C fallback
-> PR14 -> PR14B -> PR15A/B/C-on-PR14B
-> validation-only PR6B + PR07C + PR14B + PR15C head
-> pre-final gates: a914c862c29e / seed 5200005
   PR11C/PR12-first owner comparison,
   strict-current owner triage, and reload-hydration diagnostics only if newer
   nonempty product evidence appears
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

- Seed `1020002`: removed as product work; it is final-stack
  validation/fuzz/filing-only unless newer product-owned evidence appears. It
  is not a valid sole wait item while the Parallel Progress Gate is nonempty.
- Old `5200005` table-delete replay: PR12-covered by the previous-local-cache
  block delete fix; not a new PR candidate.
- Possible strict-expansion `5200005` nested-group signal: do not close it by
  seed number alone; compare `a914c862c29e` against PR11C and PR12 first, then
  PR13B/PR14B/PR15C only if still red.
- Seed `5700084`: consumed as PR05C-covered / oracle-equivalence downscoped;
  do not use it as an open PR18x gate unless fresh product evidence appears.
- `1060015`: downscoped out of the current product-blocker set unless new red
  evidence appears; do not name PR5D or PR18 from the current evidence.
- `7510029`: downscoped out of the current product-blocker set unless new red
  evidence appears; do not name PR18A from the current evidence.
- `ee0d01a82e12`: consumed by the latest split synthesis as a narrow
  PR03-family browser `restoreRevision` CRDT invalidation gap. Insert PR03B
  after PR03 and before PR04; do not assign it to PR07C or PR18x.
- `045710` / `055716` / `20260517T062719Z`: reload-hydration diagnostics only;
  Cycle 242 refreshed branch audit and push manifest after the nonempty
  `062719` diagnostic and kept it optional diagnostic-only. Do not make a
  product PR unless newer evidence proves product ownership.
- Fresh strict/focused likely-real rows: triage by owner first. Parser,
  rich-text, entity, and linebreak rows must compare against PR5B/PR5C before
  any PR18x naming.

## Branch And Ref Status

The remote status input was generated at `2026-05-17T07:08:18Z`.

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

The branch-link audit was generated at `2026-05-17T07:08:25Z` from fetched
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
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR03 | No verified branch link yet | TBD | TBD | new required slot from `pr-split-20260517T065712Z-synthesis.md`; launch/complete PR03B branch job before filing |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified branch; keep in known-fix prefix |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | 2 | +465 / -8 | replacement for old aggregate PR 5; needs verified GitHub branch link |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | 2 | +925 / -42 | replacement for old aggregate PR 5; comparison point for parser/rich-text residuals |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | +287 / -15 | seed `5700084` remains PR5C-covered plus strict oracle/exact-content drift |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified branch; excludes malformed-save restack and broader residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified branch; narrow persisted-body guard |
| PR 6B | Minimal malformed outgoing RTC save request-payload guard after PR06A | No verified branch link yet | 2 | TBD | recommended PR06A sidecar; publish/fetch/audit before filing |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified branch; repaired split head |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified branch stacked after PR 7A; scoped to saved-CRDT-response hydration |
| PR 7C | Reload record snapshots sidecar after PR07B | No verified branch link yet | TBD | TBD | accepted sidecar from Cycle 236 browser-pass evidence; publish/fetch/audit before filing |
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
collected_at_utc: 2026-05-17T07:08:18Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T065059Z
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
stack because PR02A, PR03B, PR5A/B/C, PR11A-E, PR6B, PR07C, PR13B0-B3 or an
explicit audited fallback decision, PR14B, and PR15A/B/C-on-PR14B still need
verified branch links, explicit fallback decisions, or branch-shaping evidence.

The collected `raw/novelty-status.md` input is nonempty in this update. It was
updated at `2026-05-17T07:07:34.219Z` for the current coverage root:

```text
output dir: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T065059Z
coverage files: 41306
total records seen: 64068
records processed this pass: 76
current-run records by profile: {"session-lifecycle":14}
current-run successful records by profile: {"session-lifecycle":13}
current-run records by transport: {"ws":14}
enabled groups: novelty-ws-lifecycle
paused groups: novelty-ws-persistence-no-title,
  novelty-ws-real-user-editing,
  novelty-http-persistence-probe,
  novelty-ws-real-user-rich-text
current output-dir signatures: 0
current output-dir product-evidence signatures: 0
current output-dir likely-real visible: 0
current output-dir no-product likely-real visible: 0
quality issues: 0
load1: 69.08 / 64 cores
memory: 426.5G free / 492.0G total
```

The latest raw novelty pass has a small amount of current-run lifecycle
coverage after the control-plane restart, zero current-run product-evidence
signatures, zero visible current-run likely-real signals, and no quality issues.
Treat this as control-plane/coverage health input, not as a final-stack clean
pass. Historical triage remains deliberately separate; do not present
historical duplicate/noise as live current-run product failure.

The latest trend evidence packet was generated at `2026-05-17T07:02:19Z` from
monitor data through `2026-05-17T06:56:55Z`:

```text
monitor passes: 1875
coverage files: 272 -> 41156
coverage files delta: 40884
unmet coverage goals: 5
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3524
summary_startup_failures_last: 0
quality issues: 0
trend enabled groups: novelty-ws-real-user-rich-text,
  novelty-ws-lifecycle
fuzz level mix: browser-e2e=27 lanes/27 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 4040319
browser-e2e execution: 98834 cumulative / 28 per-hour
unit-property execution: 3510144 cumulative / 9632 per-hour
coverage-guided-lower-level execution: 428335 cumulative / 0 per-hour
load1/load5/load15: 76.47 / 67.14 / 55.24 on 64 cores
memory: 426.7G free
```

Largest remaining coverage gaps in the latest raw novelty snapshot are
`ui-heading-shortcut` `759/1000`, `reload-post-action` `773/1000`,
title-save-reload `303/500`,
body-save-reload `362/500`, and successful real-user-editing records
`437/500`.

Current-run triage and historical triage must remain separate. The latest raw
novelty snapshot reports no visible current likely-real signal, while the
historical triage population remains nonzero and dominated by known
bootstrap/awareness/noise families. Require strict-current owner triage,
rebuilt combined validation, and bounded final-stack monitor evidence before
filing.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T065712Z-synthesis.md`. It says the split now needs a narrow
change: replace `PR03 -> PR04` with `PR03 -> PR03B -> PR04`, where PR03B is a
browser `restoreRevision` CRDT invalidation fix. The rest of the
PR01-through-PR15C-on-PR14B spine remains usable: PR07C is accepted, PR6B
remains the minimal sidecar, PR17 / seed `1020002` is final-stack-only rather
than product work, seed `5700084` is PR05C-covered / oracle-equivalence
downscoped, and no generic PR18x slot should be named from current evidence.

The same synthesis keeps filing blocked and moves independent work forward:
launch `rtc-cycle244-pr03b-browser-revision-restore-crdt-invalidation` from
`ready/rtc-pr03-revision-restore-crdt-reset`, let the active
`rtc-cycle242-a914-source-redgreen` job continue, and treat only nonempty
durable outputs as Parallel Progress Gate progress. `ee0d01a82e12` must not be
assigned to PR07C or PR18x. Compare `a914c862c29e` / seed `5200005` against
PR11C and PR12 first, then PR13B/PR14B/PR15C only if it stays red. Parser,
rich-text, entity, and linebreak rows must compare against PR5B/PR5C before any
PR18x naming.

The preceding `pr-split-20260517T061137Z-feedback-action.md` reports that the
Cycle 240 jobs completed and wrote nonempty artifacts:

- PR07C is now `product-sidecar` in the push manifest.
- Manifest validation checked `32` adjacent publication rows with zero
  `origin/trunk` base rows and zero diff-check failures.
- Seed `5700084` is freshly consumed as PR05C-covered / oracle-equivalence
  downscope, not PR18x.
- `a914c862c29e` remains owner-incomplete, with the next source-local
  PR11C/PR12 red/green prompt generated.

The latest `pr-split-20260517T063739Z-feedback-action.md` reports that Cycle
242 applied the tail update and launched the current non-`1020002` gate work:

- `rtc-cycle242-post-062719-manifest-refresh` completed and wrote nonempty
  `report.md`, `branch-audit.tsv`, `push-manifest.tsv`, `classification.tsv`,
  and `manifest-freshness.tsv`.
- `rtc-cycle242-a914-source-redgreen` remains active.
- `rtc-cycle242-revision-restore-owner` is superseded by the PR03B branch
  recommendation in `pr-split-20260517T065712Z-synthesis.md`.
- `rtc-cycle242-strict-current-owner-batch` remains active.
- Final-stack fuzz, rebuilt full-stack validation, and filing remain deferred
  until PR03B, a914 source red/green, and strict-current owner triage settle.

The latest raw split report, through Cycle 242, remains useful for the durable
artifact trail, but its `ee0d01a82e12` owner-gate language is superseded by the
new PR03B recommendation:

- The Cycle 236 manifest is newer than the `045710` reload-hydration diagnostic
  and includes it as optional diagnostic-only.
- The Cycle 238 critical-executor repair checked `32` adjacent publication
  rows, passed `32` adjacent `diff --check` rows, found zero `origin/trunk`
  base rows, and passed loop `bash -n`.
- The Cycle 240 action refresh consumed PR07C, seed `5700084`, and the
  PR11C/PR12-first `a914c862c29e` owner prompt into current artifacts.
- `5200005` table-delete replay remains PR12-covered by previous-local cache
  block delete evidence and should not become PR18x.
- `1060015` and `7510029` are downscoped out of the current product-blocker set
  unless newer red evidence appears.
- The `045710` / `055716` / `062719` reload-hydration rows remain
  diagnostic-only and are not product PRs.
- The Cycle 242 post-`062719` refresh is now the current manifest/branch audit
  context for reload-hydration diagnostics, not product coverage.
- The Cycle 242 revision-restore owner job is now consumed as input for PR03B
  shaping; PR03B still needs a clean branch, validation evidence, and branch
  audit before it is filing-ready.

The newest duplicate/noise synthesis is
`duplicate-noise-20260517T063152Z-synthesis.md`. It keeps duplicate/noise work
in the fuzzer control plane, not in the product PR split. The consensus root
cause is that several control-plane product-evidence predicates count
`faultTypes`, `faultCount`, or injected fault metadata as product evidence by
themselves, letting fault-only pre-action startup/discovery failures bypass
strict no-product suppression.

The latest `duplicate-noise-20260517T063152Z-feedback-action.md` applied that
bounded control-plane fix. It updated the supervisor, triage watcher, analysis
tier, deep-analysis tier, live-analysis monitor, and novelty monitor so fault
metadata alone cannot promote pre-action startup/discovery failures as product
evidence. `node --check` passed for all six changed scripts; fixture checks
suppressed fault-only startup noise while preserving product-evidence failures;
the analysis/deep/live fixtures stayed source-suppressed where expected; and
the novelty, supervisor, and live-analysis sessions were restarted. Remaining
risk is the broader cross-generation semantic-family cap for repeated
product-evidence duplicate families; do not fold that into product PR status.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", "do not add PR6B", stale PR13 review-ref warnings, and "only novelty-
http is enabled" claims are superseded by the `2026-05-17T07:08:25Z`
branch-link audit, the latest trend packet, the raw novelty-status input for
this collection, and the latest split and duplicate/noise syntheses/actions.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR14B / PR15-on-PR14B finalization | Cycle 232/234 replacement topology and validation-only sidecar evidence | mandatory replacement topology, but no current `verified-content` branch links for PR14B or PR15-on-PR14B | Publish/fetch/audit the ready refs until the GitHub branch-link audit exposes verified PR-content links; keep validation-only heads out of product PRs |
| Malformed-save request-payload PR6B | minimal PR06A sidecar; old polluted PR6B and historical validation heads are superseded | active recommended sidecar after PR06A, but no current `verified-content` branch-link audit row exists | Publish/fetch/audit the minimal product branch, keep validation-only heads out of filing branches, verify inclusion in the PR14B/PR15-on-PR14B validation stack |
| PR07C reload record snapshots | accepted sidecar after PR07B | Cycle 236 browser-pass evidence promotes it into the split and Cycle 240 marks it `product-sidecar`, but no current `verified-content` branch-link audit row exists | Publish/fetch/audit the PR07C review branch and keep validation-only heads out of product PRs |
| PR03B browser `restoreRevision` CRDT invalidation | `ee0d01a82e12`; `pr-split-20260517T065712Z-synthesis.md` | active required PR03-family product slot, but no current `verified-content` branch-link audit row exists | Launch/complete the PR03B branch job from `ready/rtc-pr03-revision-restore-crdt-reset`, require nonempty report/classification/branch audit/push manifest/range-diff/diffstat evidence and `git diff --check`, then fetch/audit the branch before filing |
| PR13 finer split | PR13B0/B1/B2/B3 source-level evidence; repaired audited PR13A/B/C fallback links | preferred source split is PR13A/B0/B1/B2/B3, but proposed rows currently use only repaired audited PR13A/B/C links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired PR13B/C fallback rows |
| Seed `1020002` WebSocket marker divergence | latest split synthesis removes it as product work | final-stack validation/fuzz/filing-only; not an independent-work blocker and not a PR17 product branch | Keep it out of product blocker scans unless later evidence proves product ownership; do not relaunch duplicate work while other Parallel Progress Gate rows exist |
| Reload/post-save `5200005` table-delete replay | completed reducer evidence | PR12-covered by previous-local-cache block delete; not a new product branch | Consume the classification into filing notes; do not assign a PR18/reload product branch unless later evidence contradicts the PR12-covered result |
| Strict `5200005` nested-group signal | newer strict-expansion signal `a914c862c29e` | main unresolved owner gate; no PR18x assignment and not closed by seed number alone | Run the generated source-local PR11C/PR12 red/green comparison, then PR13B/PR14B/PR15C only if still red |
| `ee0d01a82e12` revision-restore owner gate | latest split-persona synthesis | resolved into PR03B branch-shaping work, not PR07C or PR18x | Track through the PR03B row above; do not leave it as a passive pre-final owner gate |
| Parser-sensitive seed `1060015` | prior focused WebSocket/browser artifacts | downscoped out of the current product-blocker set unless new red evidence appears | Keep out of PR5D/PR18 unless a fresh prepared-browser repro and source-owner reducer prove product ownership |
| Seed `7510029` nested-child delete residual | source-local nested-delete red test passed on PR15C-on-PR14B; UI-only discriminator prompt pending | downscoped out of the current product-blocker set unless new red evidence appears | Keep out of PR18A unless a fresh UI-only browser repro proves source ownership |
| Reload-hydration diagnostics | nonempty diagnostic-only branch/report for `045710`; `055716` still diagnostic-only; newer nonempty `20260517T062719Z` diagnostic | diagnostic-only unless newer evidence proves product ownership; Cycle 242 post-`062719` manifest/branch refresh completed and keeps it optional diagnostic-only | Keep out of PR 6, PR 6A, PR 8A, PR 15, and fallback-group claims unless a later focused browser replay proves product ownership and a clean branch is shaped |
| Seed `7700055` table query-array identity loss | earlier minority signal | lower-priority evidence-only; do not create a generic PR18 bucket | Run a lower-priority red test only after comparing against PR14/PR14B |
| Seed `5700084` strict linebreak divergence | Cycle 240 owner/downscope artifacts | freshly consumed as PR05C-covered / oracle-equivalence downscope; not an open PR18x gate | Keep out of PR18x/PR5D unless new source-owned product evidence appears |
| Fresh strict/focused likely-real residuals | current strict-expansion and focused-shard rows; latest raw novelty snapshot has zero current-run product-evidence signatures after the control-plane restart | owner-triage input only; do not name PR18x from raw rows or from a small clean lifecycle-only snapshot | Let the active strict-current owner batch finish; compare parser/rich-text/entity/linebreak rows against PR5B/PR5C first, then PR11/PR13/PR14B/PR15 as applicable |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit | Shape and audit a narrowed title-reload branch only if PR8A is revived |
| Pre-save search/live document collapse | prior pre-save search/live-collapse candidate rows | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Rich-text formatted suffix corruption | diagnostic publication candidates and prior deferred refs | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Broader HTTP polling room-isolation residuals | PR02A sidecar plus stale deferred relaunches | PR02A remains in the known-fix prefix but has no verified branch link; broader residuals stay deferred | Publish/fetch/audit a PR02A review branch before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack preparation; no automatic PR slot | Triage only after the rebuilt stack is available |
| Duplicate/noise control-plane recycling | `duplicate-noise-20260517T063152Z-synthesis.md`; `duplicate-noise-20260517T063152Z-feedback-action.md`; nonempty `raw/novelty-status.md` in this collection | no product-code split change; first-pass fault-metadata-only product-evidence leak is fixed, validated, and restarted; current active root has zero queued current signatures | Keep current-run and historical duplicate/noise scopes separate, preserve real product-evidence signatures such as `66397198fb9b`, handle broader cross-generation semantic-family caps separately, and require fresh final-stack monitor evidence |

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
3. Publish/fetch and audit PR02A, PR03B, PR5A/B/C, PR11A-E, PR6B minimal,
   PR07C, PR13B0/B1/B2/B3, and the current PR14B/PR15A/B/C-on-PR14B refs
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
7. Treat PR07C as an accepted PR07B sidecar from the Cycle 236 browser-pass
   evidence and Cycle 240 `product-sidecar` manifest entry, then verify a
   `verified-content` PR07C branch link before filing it.
8. Use the Cycle 242 post-`062719` branch audit and push manifest as the
   current reload-hydration diagnostic context, but do not treat those rows as
   product coverage. Refresh again only if a newer diagnostic/product candidate
   appears.
9. Consume PR17/seed `1020002` as removed from product work. Treat it as
   final-stack validation/fuzz/filing-only unless newer evidence proves product
   ownership, and do not let it block independent gate work.
10. Consume the completed `5200005` table-delete reducer as PR12-covered
   evidence. If the strict-expansion `5200005` nested-group signal is still
   live as `a914c862c29e`, compare against PR11C and PR12 first, then
   PR13B/PR14B/PR15C only if still red.
11. Treat `ee0d01a82e12` as PR03B work. Shape, validate, publish/fetch, and
    audit a narrow browser `restoreRevision` CRDT invalidation branch after
    PR03 and before PR04; do not assign this signal to PR07C or PR18x.
12. Keep `1060015` downscoped out of the current product-blocker set unless new
    prepared browser/source-owner evidence appears; do not assign it to PR05,
    PR18, PR5D, or another product branch from current evidence.
13. Keep `7510029` downscoped out of the current product-blocker set unless a
    fresh UI-only browser repro proves source ownership; do not name PR18A from
    current evidence.
14. Treat `045710`, `055716`, and `20260517T062719Z` reload-hydration evidence
    as diagnostic-only unless focused browser replay proves product ownership
    and a clean branch is shaped.
15. Compare lower-priority `7700055` against PR14/PR14B before treating it as a
    new product PR.
16. Consume seed `5700084` as PR05C-covered / oracle-equivalence downscoped.
    Reopen it only if fresh source-owned product evidence appears.
17. Treat the duplicate/noise first-pass control-plane fix as applied and
    validated for fault-only startup evidence. Startup/no-analysis gates must
    keep requiring real session/editor progress and must not treat fault
    metadata alone as product evidence; broader semantic-family caps remain
    separate control-plane follow-up, not product PR status.
18. Rebase or recreate each intended PR branch on the intended upstream base if
    that base moves.
19. Regenerate branch graph/containment evidence and adjacent
    range-diffs/diffstats from the actual filing repo.
20. Rerun focused checks, touched-file lint, and `git diff --check` on every
    imported/rebased branch.
21. Rebuild the combined stack from explicit PR01-PR06A heads, PR02A, PR03B,
    PR6B as a sidecar, PR07A/B plus PR07C, PR09-PR15C-on-PR14B, the PR13 finer
    split or audited fallback decision, and any accepted source-reduced
    residual branches.
22. Rerun bounded final-stack validation against the rebuilt stack and count it
    only if it reaches action-level product coverage and proves PR6B and the
    PR14B/PR15-on-PR14B refs were included.
23. Block filing if any visible current likely-real failures appear in a fresh
    nonempty monitor snapshot. The `2026-05-17T07:07:34.219Z` raw novelty
    snapshot has zero visible current-run likely-real signals and no quality
    issues after the control-plane restart, but it is lifecycle-only current
    coverage and is not final-stack health evidence.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after environment preflight is healthy. Do not run
broad/final-stack fuzz while PR03B branch shaping/link validation,
PR14B/PR15-on-PR14B branch links, PR6B GitHub branch links, PR07C branch-link
validation, PR13 finer branch links or fallback decision, the `a914c862c29e` /
strict-`5200005` owner gate, current strict/focused owner triage,
reload-hydration diagnostic adjudication, rebuilt validation, branch-link
audits, and fresh nonempty final-stack monitor evidence are open. None of the
current trend, duplicate/noise, or residual reducer evidence is final-stack
fuzz validation or a filing unblocker.
