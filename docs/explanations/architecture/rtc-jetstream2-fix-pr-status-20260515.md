# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T07:30:31Z`

Trigger event:
`pr-split-2026-05-17T07-29-32Z-20260517T072137Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T07-29-32Z-20260517T072137Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked, and the newest completed split-persona synthesis,
`pr-split-20260517T072137Z-synthesis.md`, keeps the replacement split from the
previous update: insert a narrow PR03-family `PR03B` immediately after PR03 for
browser `restoreRevision` CRDT invalidation. The PR01-through-PR15C-on-PR14B
spine remains usable, PR07C stays an accepted PR07B sidecar, PR6B stays the
minimal malformed-save sidecar near PR06A, PR17 / seed `1020002` remains
removed as product work, and seed `5700084` remains PR05C-covered /
oracle-equivalence downscoped. `ee0d01a82e12` is no longer a generic pre-final
owner gate, PR07C slot, or PR18x candidate; it is PR03B work until the PR03B
job produces durable accept/drop evidence.

The active independent gates are now PR03B branch shaping, owner-ordered
strict/focused comparison for fresh rows, and branch-link/manifest refreshes as
new product refs appear. The latest split synthesis says the active PR03B job
has worktree/log output but still lacks nonempty `report.md`,
`classification.tsv`, `branch-audit.tsv`, and `push-manifest.tsv`. The
`20260517T072132Z` progress-unblock pass did produce fresh non-`1020002`
branch-audit and push-manifest artifacts, mapping ready refs for PR02A, PR6B,
PR07C, PR14B, and PR15A/B/C-on-PR14B, but those are not yet verified GitHub
PR-content links in the local branch-link audit. `a914c862c29e` / seed
`5200005` remains PR11C-covered, and none of the remaining gates justify a
generic PR18x slot.

The duplicate/noise work remains fuzzer control-plane health work, not a
product PR split change. The earlier fault-metadata-only product-evidence fix
is still the latest applied patch. The newest duplicate/noise synthesis,
`duplicate-noise-20260517T071132Z-synthesis.md`, edited no files and says the
remaining issue is a bounded actionability leak: startup/discovery/awareness
no-product failures are mostly suppressed in the managed current path, but
runner, watcher, analysis, deep-analysis, and live-analysis predicates are still
duplicated enough that no-product noise can consume budget in some paths. Do
not use this as product evidence or suppress real product-evidence failures.

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
-> validation-only PR6B + PR07C + PR03B + PR14B + PR15C head
-> residual owner gates: fresh strict/focused owner triage, parser/rich-text/
   entity/linebreak rows only after PR05B/PR05C comparison, and
   reload-hydration diagnostics only if newer nonempty product evidence appears
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
- Possible strict-expansion `5200005` nested-group signal: the latest
  split-persona synthesis marks `a914c862c29e` as PR11C-covered, so remove it
  from the open tail gates. Reopen only if newer red evidence contradicts the
  source-local PR11C coverage.
- Seed `5700084`: consumed as PR05C-covered / oracle-equivalence downscoped;
  do not use it as an open PR18x gate unless fresh product evidence appears.
- `1060015`: downscoped out of the current product-blocker set unless new red
  evidence appears; do not name PR5D or PR18 from the current evidence.
- `7510029`: downscoped out of the current product-blocker set unless new red
  evidence appears; do not name PR18A from the current evidence.
- `ee0d01a82e12`: consumed by the latest split synthesis as a narrow
  PR03-family browser `restoreRevision` CRDT invalidation gap. Insert PR03B
  after PR03 and before PR04; do not assign it to PR07C or PR18x.
- `045710` / `055716` / `20260517T062719Z` / `20260517T065722Z`:
  reload-hydration diagnostics only; the Cycle 244 progress-unblock manifest is
  newer than the `065722` diagnostic and keeps it optional diagnostic /
  product-plus-diagnostic candidate output, not PR03B or product coverage. Do
  not make a product PR unless newer evidence proves product ownership.
- Fresh strict/focused likely-real rows: triage by owner first. Parser,
  rich-text, entity, and linebreak rows must compare against PR5B/PR5C before
  any PR18x naming.

## Branch And Ref Status

The remote status input was generated at `2026-05-17T07:30:27Z`.

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

The branch-link audit was generated at `2026-05-17T07:30:31Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`.

The current split report's progress-unblock artifacts map several missing
filing units to ready refs, but the local branch-link audit below still has no
`verified-content` rows for PR02A, PR03B, PR5A/B/C, PR6B, PR07C, PR11A-E,
PR13B0/B1/B2/B3, PR14B, or PR15A/B/C-on-PR14B. Keep using
`No verified branch link yet` for those proposed PR rows until a refreshed
GitHub audit verifies their content.

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
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | TBD | TBD | sidecar remains in the active prefix; progress-unblock maps a ready ref, but publish/fetch/audit before filing |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; seed `5500002` marker-retention remains separate follow-up |
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR03 | No verified branch link yet | TBD | TBD | active required slot from `pr-split-20260517T072137Z-synthesis.md`; Cycle 244 job is active but lacks durable artifacts and verified link |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified branch; keep in known-fix prefix |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | 2 | +465 / -8 | replacement for old aggregate PR 5; needs verified GitHub branch link |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | 2 | +925 / -42 | replacement for old aggregate PR 5; comparison point for parser/rich-text residuals |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | +287 / -15 | seed `5700084` remains PR5C-covered plus strict oracle/exact-content drift |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified branch; excludes malformed-save restack and broader residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified branch; narrow persisted-body guard |
| PR 6B | Minimal malformed outgoing RTC save request-payload guard after PR06A | No verified branch link yet | 2 | TBD | recommended PR06A sidecar; progress-unblock maps a ready ref, but publish/fetch/audit before filing |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified branch; repaired split head |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified branch stacked after PR 7A; scoped to saved-CRDT-response hydration |
| PR 7C | Reload record snapshots sidecar after PR07B | No verified branch link yet | TBD | TBD | accepted sidecar from Cycle 236 browser-pass evidence; progress-unblock maps a ready ref, but publish/fetch/audit before filing |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; keep in known-fix prefix |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified branch; start CRDT block stack |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | 2 | +257 / -3 | finer split still needs verified GitHub branch link |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | 2 | +240 / -2 | finer split still needs verified GitHub branch link |
| PR 11C | Explicit-base middle insert | No verified branch link yet | 2 | +220 / -0 | finer split still needs verified GitHub branch link; latest source-local evidence marks `a914c862c29e` / seed `5200005` covered here |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | 2 | +259 / -0 | finer split still needs verified GitHub branch link |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | 2 | +170 / -0 | finer split still needs verified GitHub branch link |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified branch; `5200005` table-delete replay is PR12-covered |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired audit link; first PR13 delta |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired audit link; maintainer-facing fallback until PR13B0/B1/B2/B3 are published and audited |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired audit link; use instead of stale/misordered PR13C refs |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified branch; seed `7110017` proves PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | mandatory replacement topology; progress-unblock maps a ready ref, but publish/fetch/audit before filing |
| PR 15A | Fallback group move stale reorder, restacked on PR14B | No verified branch link yet | TBD | TBD | use PR14B topology; progress-unblock maps a ready ref, but old pre-PR14B audited branch is prior art only |
| PR 15B | Fallback group insert anchor, restacked on PR14B | No verified branch link yet | TBD | TBD | use PR14B topology; progress-unblock maps a ready ref, but older conflict artifacts are superseded only after ingest/audit |
| PR 15C | Fallback group delete, restacked on PR14B | No verified branch link yet | TBD | TBD | use PR14B topology; progress-unblock maps a ready ref, but validation-only PR6B/PR14B/PR15C head is not a product PR |

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
collected_at_utc: 2026-05-17T07:30:27Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T072958Z
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

The collected `raw/novelty-status.md` input is empty in this update, and the
collected `raw/supervisor-groups.json` input is also empty. Do not carry forward
the previous nonempty raw novelty snapshot as current-run proof, and do not
present this collection as a clean current-run product-health pass.

The latest trend evidence packet was generated at `2026-05-17T07:23:31Z` from
monitor data through `2026-05-17T07:20:56Z`:

```text
monitor passes: 1882
coverage files: 272 -> 41478
coverage files delta: 41206
unmet coverage goals: 5
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3521
summary_startup_failures_last: 0
quality issues: 0
enabled groups current: novelty-ws-lifecycle
fuzz level mix: browser-e2e=26 lanes/26 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 4126131
browser-e2e execution: 99162 cumulative / 448 per-hour
unit-property execution: 3595628 cumulative / 115584 per-hour
coverage-guided-lower-level execution: 428335 cumulative / 0 per-hour
load1/load5/load15: 75.72 / 68.56 / 64.51 on 64 cores
memory: 428G free
```

The trend packet is graph-derived evidence, not a replacement for the empty
raw novelty status. It supports only control-plane/coverage health statements:
current duplicate share is zero, startup failures are zero, quality issues are
zero, only `novelty-ws-lifecycle` is currently enabled, and historical duplicate
share remains nonzero. It does not prove final-stack health or a clean current
product run.

Largest remaining coverage gaps in the latest trend packet are
`ui-heading-shortcut` `759/1000`, `reload-post-action` `776/1000`,
title-save-reload `303/500`, body-save-reload `362/500`, and successful
real-user-editing records `437/500`. Weak completion profiles remain `full`
`18/840`, `multi-reload-lifecycle` `102/3129`, `revision-persistence`
`148/4225`, `parser-serialization` `143/3035`, and `real-user-editing`
`437/6131`.

Current-run triage and historical triage must remain separate. The raw novelty
status for this collection is empty, while the trend packet still shows
historical duplicate/noise data. Require a fresh nonempty raw monitor/novelty
snapshot, strict-current owner triage, rebuilt combined validation, and bounded
final-stack monitor evidence before filing.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T072137Z-synthesis.md`. It says the split still needs the
same narrow structural change: replace `PR03 -> PR04` with
`PR03 -> PR03B -> PR04`, where PR03B is a browser `restoreRevision` CRDT
invalidation fix. The rest of the PR01-through-PR15C-on-PR14B spine remains
usable: PR07C is accepted, PR6B remains the minimal sidecar, PR17 / seed
`1020002` is final-stack-only rather than product work, seed `5700084` is
PR05C-covered / oracle-equivalence downscoped, and no generic PR18x slot should
be named from current evidence.

The same synthesis keeps filing blocked and sharpens the PR03B gate. The active
`rtc-cycle244-pr03b-restore-invalidation` job has started and has worktree/log
output, but it has not yet written nonempty durable artifacts: `report.md`,
`classification.tsv`, `branch-audit.tsv`, or `push-manifest.tsv`. Treat PR03B
as an active product slot but not a filing-ready branch. If that job exits
without the required artifacts, the split synthesis recommends exactly one
bounded rerun of the existing PR03B job script, not duplicate final-stack fuzz.

The latest `pr-split-20260517T070459Z-feedback-action.md` records the Cycle 244
action pass:

- It applied the PR03B topology and reclassified `ee0d01a82e12` as
  `pr03_family_gap_pr03b_needed`.
- It removed `a914c862c29e` / seed `5200005` from open tail gates because fresh
  source-local red/green evidence marks it PR11C-covered.
- It preserved PR07C as an accepted PR07B sidecar and PR6B minimal as the PR06A
  sidecar.
- It kept seed `1020002` final-stack-only.
- It patched loop guardrails so PR03B and owner-proof classifications count as
  actionable independent progress signals, patched deferred promotion to reject
  empty final reports, and restarted only the deferred-promotion controller.
- It launched `rtc-cycle244-pr03b-restore-invalidation`; only the
  `wrapper-started.md` artifact was verified at launch time.

The latest raw split report adds a `20260517T072132Z` progress-unblock update.
That pass produced fresh non-`1020002` `report.md`, `branch-audit.tsv`, and
`push-manifest.tsv` artifacts. It maps ready refs for PR02A, PR6B, PR07C,
PR14B, and PR15A/B/C-on-PR14B; keeps PR03B intentionally unpublished until the
active job produces durable evidence; keeps PR17/seed `1020002` out of product
branch/ref status; and records the refreshed manifest as newer than the
`20260517T065722Z` deferred reload-hydration report. This is local
branch/manifest progress only, not verified GitHub branch-link evidence.

The older Cycle 240/242 trail remains useful for durable classification:
PR07C is a product sidecar, seed `5700084` is PR05C-covered /
oracle-equivalence downscoped, `5200005` table-delete replay is PR12-covered,
`a914c862c29e` is PR11C-covered, `1060015` and `7510029` are downscoped unless
new red evidence appears, and `045710` / `055716` / `062719` / `065722`
reload-hydration rows remain diagnostic-only unless newer evidence proves
product ownership.

The newest duplicate/noise synthesis is
`duplicate-noise-20260517T071132Z-synthesis.md`. It keeps duplicate/noise work
in the fuzzer control plane, not in the product PR split. It edited no files
and says the current managed triage path reports `0` actionable signatures, but
startup/discovery/awareness no-product gating is still duplicated across
producer and consumer scripts. The earlier
`duplicate-noise-20260517T063152Z-feedback-action.md` fault-metadata-only fix
remains applied and validated. The next control-plane pass should align shared
no-product startup predicates and preserve all real product-evidence failures;
it is not product-code PR work.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", "do not add PR6B", stale PR13 review-ref warnings, and "only novelty-
http is enabled" claims are superseded by the `2026-05-17T07:30:31Z`
branch-link audit, the latest trend packet, the empty raw novelty-status input
for this collection, and the latest split and duplicate/noise syntheses/actions.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR14B / PR15-on-PR14B finalization | Cycle 232/234 replacement topology and progress-unblock ready-ref mapping | mandatory replacement topology, but no current `verified-content` branch links for PR14B or PR15-on-PR14B | Publish/fetch/audit the ready refs until the GitHub branch-link audit exposes verified PR-content links; keep validation-only heads out of product PRs |
| Malformed-save request-payload PR6B | minimal PR06A sidecar; old polluted PR6B and historical validation heads are superseded | active recommended sidecar after PR06A; progress-unblock maps a ready ref, but no current `verified-content` branch-link audit row exists | Publish/fetch/audit the minimal product branch, keep validation-only heads out of filing branches, verify inclusion in the PR14B/PR15-on-PR14B validation stack |
| PR07C reload record snapshots | accepted sidecar after PR07B | Cycle 236 browser-pass evidence promotes it into the split and Cycle 240 marks it `product-sidecar`; progress-unblock maps a ready ref, but no current `verified-content` branch-link audit row exists | Publish/fetch/audit the PR07C review branch and keep validation-only heads out of product PRs |
| PR03B browser `restoreRevision` CRDT invalidation | `ee0d01a82e12`; `pr-split-20260517T072137Z-synthesis.md` | active required PR03-family product slot; Cycle 244 job is active with worktree/log output but no durable artifacts or verified branch link yet | Finish the PR03B branch job, require nonempty report/classification/branch audit/push manifest/range-diff/diffstat evidence and `git diff --check`, then fetch/audit the branch before filing; rerun the bounded job once only if it exits without artifacts |
| PR13 finer split | PR13B0/B1/B2/B3 source-level evidence; repaired audited PR13A/B/C fallback links | preferred source split is PR13A/B0/B1/B2/B3, but proposed rows currently use only repaired audited PR13A/B/C links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired PR13B/C fallback rows |
| Seed `1020002` WebSocket marker divergence | latest split synthesis removes it as product work | final-stack validation/fuzz/filing-only; not an independent-work blocker and not a PR17 product branch | Keep it out of product blocker scans unless later evidence proves product ownership; do not relaunch duplicate work while other Parallel Progress Gate rows exist |
| Reload/post-save `5200005` table-delete replay | completed reducer evidence | PR12-covered by previous-local-cache block delete; not a new product branch | Consume the classification into filing notes; do not assign a PR18/reload product branch unless later evidence contradicts the PR12-covered result |
| Strict `5200005` nested-group signal | newer strict-expansion signal `a914c862c29e` | latest source-local evidence marks it PR11C-covered; no PR18x assignment and no longer an open tail gate | Consume the PR11C-covered classification; reopen only if newer red evidence contradicts the current source-local result |
| `ee0d01a82e12` revision-restore owner gate | latest split-persona synthesis | resolved into PR03B branch-shaping work, not PR07C or PR18x | Track through the PR03B row above; do not leave it as a passive pre-final owner gate |
| Parser-sensitive seed `1060015` | prior focused WebSocket/browser artifacts | downscoped out of the current product-blocker set unless new red evidence appears | Keep out of PR5D/PR18 unless a fresh prepared-browser repro and source-owner reducer prove product ownership |
| Seed `7510029` nested-child delete residual | source-local nested-delete red test passed on PR15C-on-PR14B; UI-only discriminator prompt pending | downscoped out of the current product-blocker set unless new red evidence appears | Keep out of PR18A unless a fresh UI-only browser repro proves source ownership |
| Reload-hydration diagnostics | nonempty diagnostic-only branch/report for `045710`; `055716` still diagnostic-only; newer nonempty `20260517T062719Z` and `20260517T065722Z` diagnostics | diagnostic-only unless newer evidence proves product ownership; Cycle 244 progress-unblock manifest is newer than `065722` and keeps it optional diagnostic / product-plus-diagnostic candidate output | Keep out of PR 6, PR 6A, PR 8A, PR 15, and fallback-group claims unless a later focused browser replay proves product ownership and a clean branch is shaped |
| Seed `7700055` table query-array identity loss | earlier minority signal | lower-priority evidence-only; do not create a generic PR18 bucket | Run a lower-priority red test only after comparing against PR14/PR14B |
| Seed `5700084` strict linebreak divergence | Cycle 240 owner/downscope artifacts | freshly consumed as PR05C-covered / oracle-equivalence downscope; not an open PR18x gate | Keep out of PR18x/PR5D unless new source-owned product evidence appears |
| Fresh strict/focused likely-real residuals | current strict-expansion and focused-shard rows; raw novelty status is empty in this collection | owner-triage input only; do not name PR18x from raw rows or from a missing raw novelty snapshot | Continue or run owner-only classification; compare parser/rich-text/entity/linebreak rows against PR5B/PR5C first, revision-restore rows against PR03/PR03B/PR07C, and block-tree rows against PR11C/PR12 before later owners |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit | Shape and audit a narrowed title-reload branch only if PR8A is revived |
| Pre-save search/live document collapse | prior pre-save search/live-collapse candidate rows | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Rich-text formatted suffix corruption | diagnostic publication candidates and prior deferred refs | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Broader HTTP polling room-isolation residuals | PR02A sidecar plus stale deferred relaunches | PR02A remains in the known-fix prefix but has no verified branch link; broader residuals stay deferred | Publish/fetch/audit a PR02A review branch before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack preparation; no automatic PR slot | Triage only after the rebuilt stack is available |
| Duplicate/noise control-plane recycling | `duplicate-noise-20260517T071132Z-synthesis.md`; earlier `duplicate-noise-20260517T063152Z-feedback-action.md`; empty `raw/novelty-status.md` in this collection | no product-code split change; earlier fault-metadata-only product-evidence leak is fixed, validated, and restarted; newest synthesis says the remaining risk is duplicated no-product startup predicates across producer and consumer scripts | Keep current-run and historical duplicate/noise scopes separate, preserve real product-evidence signatures, align shared no-product startup/discovery/awareness gates, and require fresh nonempty final-stack monitor evidence |

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
   before treating those finer refs as maintainer-facing links. The
   progress-unblock ready-ref mapping is not a substitute for
   `verified-content` GitHub branch-link audit rows.
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
8. Use the Cycle 244 progress-unblock branch audit and push manifest as the
   current reload-hydration diagnostic context, including the newer `065722`
   deferred report, but do not treat those rows as product coverage. Refresh
   again only if a newer diagnostic/product candidate appears.
9. Consume PR17/seed `1020002` as removed from product work. Treat it as
   final-stack validation/fuzz/filing-only unless newer evidence proves product
   ownership, and do not let it block independent gate work.
10. Consume the completed `5200005` table-delete reducer as PR12-covered
   evidence and the newer strict-expansion `a914c862c29e` / seed `5200005`
   result as PR11C-covered. Do not leave either as an open tail blocker or
   PR18x candidate unless fresh red evidence contradicts the source-local
   coverage result.
11. Treat `ee0d01a82e12` as PR03B work. Shape, validate, publish/fetch, and
    audit a narrow browser `restoreRevision` CRDT invalidation branch after
    PR03 and before PR04; do not assign this signal to PR07C or PR18x.
12. Keep `1060015` downscoped out of the current product-blocker set unless new
    prepared browser/source-owner evidence appears; do not assign it to PR05,
    PR18, PR5D, or another product branch from current evidence.
13. Keep `7510029` downscoped out of the current product-blocker set unless a
    fresh UI-only browser repro proves source ownership; do not name PR18A from
    current evidence.
14. Treat `045710`, `055716`, `20260517T062719Z`, and `20260517T065722Z`
    reload-hydration evidence as diagnostic-only unless focused browser replay
    proves product ownership and a clean branch is shaped.
15. Compare lower-priority `7700055` against PR14/PR14B before treating it as a
    new product PR.
16. Consume seed `5700084` as PR05C-covered / oracle-equivalence downscoped.
    Reopen it only if fresh source-owned product evidence appears.
17. Treat the duplicate/noise first-pass control-plane fix as applied and
    validated for fault-only startup evidence. The latest duplicate/noise
    synthesis adds control-plane follow-up, not product PR work: align shared
    no-product startup/discovery/awareness predicates across runner, watcher,
    analysis, deep-analysis, and live-analysis paths. Startup/no-analysis gates
    must still require real session/editor progress and must keep real
    product-evidence signatures visible.
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
    nonempty monitor snapshot. This collection's raw novelty status is empty, so
    it cannot be used as current-run product-health evidence; the latest trend
    packet is graph-derived control-plane evidence only and is not final-stack
    health evidence.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after environment preflight is healthy. Do not run
broad/final-stack fuzz while PR03B branch shaping/link validation,
PR14B/PR15-on-PR14B branch links, PR6B GitHub branch links, PR07C branch-link
validation, PR13 finer branch links or fallback decision, current
strict/focused owner triage, reload-hydration diagnostic adjudication, rebuilt
validation, branch-link audits, and fresh nonempty final-stack monitor evidence
are open. None of the current trend, duplicate/noise, or residual reducer
evidence is final-stack fuzz validation or a filing unblocker.
