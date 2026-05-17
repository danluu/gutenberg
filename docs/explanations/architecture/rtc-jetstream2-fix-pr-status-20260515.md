# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T08:06:17Z`

Trigger event:
`pr-split-2026-05-17T08-03-52Z-20260517T075636Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T08-03-52Z-20260517T075636Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked, but the newest completed split-persona synthesis,
`pr-split-20260517T075636Z-synthesis.md`, supersedes the older
"PR07C conflict is still blocking restack" state. It points to a newer
nonempty finalization report,
`rtc-pr-finalization-20260516/cycles/20260517T074254Z/finalization.report.md`,
which resolves PR07C on the PR03B topology, creates corrected `ready-pr03b/*`
product refs, and builds
`validation/rtc-pr03b-pr06b-pr07c-plus-pr14b-pr15c-sidecar-20260517T074254Z`
as a validation-only sidecar head.

The active maintainer-facing split is therefore the `ready-pr03b/*`
replacement stack, not the older downstream `ready/*` PR04+ heads. The old
`ready/*` heads are topology-stale because they omit PR03B. PR17, PR18, and
PR18x remain absent as product slots; PR17 / seed `1020002` is a final-stack
gate only. Parser, rich-text, entity, and linebreak strict rows still need
owner comparison against PR05B/PR05C before any later-owner claim.

Filing is still blocked by final validation gates rather than by the old PR07C
merge conflict:

- settle seed `1020002` by proof, reclassification, or focused repair before
  final-stack fuzz or filing;
- rebuild combined validation from
  `validation/rtc-pr03b-pr06b-pr07c-plus-pr14b-pr15c-sidecar-20260517T074254Z`;
- run a focused `1020002` gate if the rebuilt validation still requires it;
- publish/fetch only explicit `ready-pr03b/*` product refs, then regenerate a
  fresh GitHub branch-link audit and push manifest;
- run available PR03B/PR07C focused runtime checks only if the installed
  `wp-env`/Playwright environment is already usable, otherwise record the
  environment gap;
- run broad final-stack fuzz only after the rebuilt stack and focused gates are
  clean.

The current GitHub branch-link audit has not yet verified the new
`ready-pr03b/*` product refs. Proposed PR rows below therefore keep
`No verified branch link yet` for PR02A, PR03B, PR5A/B/C, PR6B, PR07C,
PR11A-E, PR13B0/B1/B2/B3, PR14B, and PR15A/B/C-on-PR14B until a refreshed
audit exposes `verified-content` rows. Use only the repaired audited PR13A/B/C
links for PR13 content for now.

The duplicate/noise work remains fuzzer control-plane health work, not a
product PR split change. The newest duplicate/noise synthesis,
`duplicate-noise-20260517T075352Z-synthesis.md`, says no disagreement blocks
the narrow current-run hardening path: suppress no-product known
infra/startup noise before queue/launch, clear current-run scheduler state on
output-root rotation, and keep product-evidence `unknown`,
`late_session_awareness_stall`, reload/save/revision/content divergence, and
likely-real signatures visible. Any broad suppression that hides
product-evidence signatures solely because duplicate share is high should be
rejected.

The active maintainer-facing shape is now:

```text
PR01 -> PR02, with PR02A as a PR02 sidecar
-> PR03 -> PR03B -> PR04
-> PR05A/B/C -> PR06 -> PR06A, PR6B-min sidecar
-> PR07A/B, PR07C sidecar
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
  validation/fuzz/filing-only unless newer product-owned evidence appears.
  It must be settled before final-stack fuzz/filing, but it is not a valid
  sole wait item while audit, manifest, runtime-check, or owner-comparison work
  is still open.
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
  PR03-family browser `restoreRevision` CRDT invalidation gap. Keep PR03B
  after PR03 and before PR04; do not assign it to PR07C or PR18x.
- `045710` / `055716` / `20260517T062719Z` / `20260517T065722Z` /
  `20260517T073541Z`: reload-hydration diagnostics only; the Cycle 246
  progress-unblock manifest maps the `073541` diagnostic and keeps it optional
  diagnostic / product-plus-diagnostic candidate output, not PR03B or product
  coverage. Do not make a product PR unless newer evidence proves product
  ownership.
- Fresh strict/focused likely-real rows: triage by owner first. Parser,
  rich-text, entity, and linebreak rows must compare against PR5B/PR5C before
  any PR18x naming.

## Branch And Ref Status

The remote status input was generated at `2026-05-17T08:06:12Z`.

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

The branch-link audit was generated at `2026-05-17T08:06:17Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`.

The latest split synthesis says the nonempty `20260517T074254Z` finalization
report resolved the prior PR07C restack conflict and created corrected
`ready-pr03b/*` product refs plus the validation-only
`validation/rtc-pr03b-pr06b-pr07c-plus-pr14b-pr15c-sidecar-20260517T074254Z`
head. Those refs are authoritative for the replacement topology, but this
GitHub branch-link audit still has no `verified-content` rows for PR02A,
PR03B, PR5A/B/C, PR6B, PR07C, PR11A-E, PR13B0/B1/B2/B3, PR14B, or
PR15A/B/C-on-PR14B. Keep using `No verified branch link yet` for those proposed
PR rows until a refreshed audit verifies their content. The existing verified
PR04-through-PR07B review links remain content evidence for the older review
branches, not proof that the `ready-pr03b/*` restack is published and ready to
file.

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
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | TBD | TBD | sidecar remains in the active prefix; a ready ref exists, but publish/fetch/audit before filing |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; seed `5500002` marker-retention remains separate follow-up |
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR03 | No verified branch link yet | TBD | TBD | required PR03-family slot; finalization report keeps it in the `ready-pr03b/*` replacement stack, but no verified GitHub branch link exists yet; run focused runtime checks only if the installed `wp-env`/Playwright environment is usable |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified original branch; `ready-pr03b/*` finalization produced the authoritative PR04-on-PR03B replacement, but it needs publication/fetch/audit before filing in the PR03B topology |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | 2 | +465 / -8 | replacement for old aggregate PR 5; needs verified GitHub branch link |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | 2 | +925 / -42 | replacement for old aggregate PR 5; comparison point for parser/rich-text residuals |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | +287 / -15 | seed `5700084` remains PR5C-covered plus strict oracle/exact-content drift |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified original branch; excludes malformed-save restack and broader residuals; `ready-pr03b/*` replacement evidence still needs verified GitHub links |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified original branch; narrow persisted-body guard; `ready-pr03b/*` replacement evidence still needs verified GitHub links |
| PR 6B | Minimal malformed outgoing RTC save request-payload guard after PR06A | No verified branch link yet | 2 | TBD | recommended PR06A sidecar; a ready ref exists and should be included in rebuilt validation, but publish/fetch/audit before filing |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified original branch; repaired split head; `ready-pr03b/*` replacement evidence still needs verified GitHub links |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified original branch stacked after PR 7A; scoped to saved-CRDT-response hydration; `ready-pr03b/*` replacement evidence still needs verified GitHub links |
| PR 7C | Reload record snapshots sidecar after PR07B | No verified branch link yet | TBD | TBD | accepted sidecar from Cycle 236 browser-pass evidence; finalization report resolves the prior PR03B restack conflict and includes PR07C in `ready-pr03b/*`, but publish/fetch/audit before filing |
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
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | mandatory replacement topology; finalization report includes a `ready-pr03b/*` ref, but publish/fetch/audit before filing |
| PR 15A | Fallback group move stale reorder, restacked on PR14B | No verified branch link yet | TBD | TBD | use PR14B topology; finalization report includes a `ready-pr03b/*` ref, but old pre-PR14B audited branch is prior art only until the replacement ref has a verified branch link |
| PR 15B | Fallback group insert anchor, restacked on PR14B | No verified branch link yet | TBD | TBD | use PR14B topology; finalization report includes a `ready-pr03b/*` ref, but publish/fetch/audit before filing |
| PR 15C | Fallback group delete, restacked on PR14B | No verified branch link yet | TBD | TBD | use PR14B topology; finalization report includes a `ready-pr03b/*` ref and validation-only sidecar head, but publish/fetch/audit the product ref before filing |

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
collected_at_utc: 2026-05-17T08:06:12Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T075630Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The older clean structural validation ref remains useful only as prior
focused-check evidence for the known-fix prefix:

```text
validation/rtc-final-combined-stack-post-pr11-20260516T110608Z
921f093cc47b46844bf8fb48552483686c55ef6b
```

That rebuild reported focused CRDT checks, touched-file JS lint,
`git diff --check`, containment, range-diff, and diffstat evidence passing.
Treat it as structural and focused-check evidence for the known-fix prefix. It
is not final-stack fuzz validation and no longer represents the complete filing
stack. The newer finalization synthesis names the replacement validation-only
sidecar head
`validation/rtc-pr03b-pr06b-pr07c-plus-pr14b-pr15c-sidecar-20260517T074254Z`,
but that still needs rebuilt validation, focused gates, branch-link audit, and
final-stack fuzz before filing. Until PR13B0/B1/B2/B3 have verified branch
links, the repaired audited PR13A/B/C fallback remains the only usable PR13
link set.

The current raw novelty monitor snapshot was updated at
`2026-05-17T08:05:57.822Z`:

```text
coverage files: 42120
total records seen: 65250
unmet goals: 5
recommended groups: novelty-ws-real-user-editing,
  novelty-ws-real-user-rich-text
headroom for adding groups: yes
current output-dir actionable signatures: 1
current output-dir product-evidence signatures: 1
likely-real visible: 0
likely-real merged duplicates: 0
oracle/noise questions: 0
load1: 60.92 / 64 cores
memory: 428.1G free / 492.0G total
enabled groups: novelty-ws-lifecycle, novelty-ws-persistence-no-title
paused groups: novelty-ws-real-user-editing,
  novelty-http-persistence-probe,
  novelty-ws-real-user-rich-text
```

The paused groups are held by recent strict startup-stall/noise cooldowns. The
current raw snapshot is useful as coverage/control-plane health evidence: it
has no visible likely-real failures in the active coverage-guided output dir.
It is not rebuilt final-stack validation and must not be treated as filing
readiness for the `ready-pr03b/*` stack.

The latest trend evidence packet was generated at `2026-05-17T08:00:17Z` from
monitor data through `2026-05-17T07:54:39Z`:

```text
monitor passes: 1890
coverage files: 272 -> 41993
coverage files delta: 41721
unmet coverage goals: 5
likely_real_max: 4
duplicate_share_current_last: 1
duplicate_share_historical_last: 0.3519
summary_startup_failures_last: 0
quality issues: 0
enabled groups current: novelty-ws-lifecycle, novelty-ws-persistence-no-title
fuzz level mix: browser-e2e=27 lanes/27 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 4276426
browser-e2e execution: 100161 cumulative / 2444 per-hour
unit-property execution: 3744924 cumulative / 221536 per-hour
coverage-guided-lower-level execution: 428335 cumulative / 0 per-hour
load1/load5/load15: 77.38 / 67.54 / 63.2 on 64 cores
memory: 426.5G free
```

Largest remaining coverage gaps are `ui-heading-shortcut` `762/1000`,
`reload-post-action` `784/1000` in the raw monitor (`783/1000` in the slightly
older trend packet), title-save-reload `305/500`, body-save-reload `364/500`,
and successful real-user-editing records `437/500`. Weak completion profiles
remain `full` `18/840`, `multi-reload-lifecycle` `102/3149`,
`revision-persistence` `150/4277`, `parser-serialization` `144/3062`, and
`real-user-editing` `437/6206`.

Current-run triage and historical triage must remain separate. Historical
aggregates still show duplicate/noise and prior likely-real maxima, while the
current output-dir monitor reports `0` visible likely-real failures. Require
strict-current owner triage, rebuilt combined validation, focused gates, and
bounded final-stack monitor evidence before filing; the active coverage-guided
root is not the rebuilt filing stack.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T075636Z-synthesis.md`. It says the replacement split needs
one more status update: the older "PR07C conflict blocks restack" state is
stale. The usable newer evidence is the nonempty
`20260517T074254Z` finalization report, which resolves PR07C on the PR03B
topology, creates corrected `ready-pr03b/*` product refs, and builds a
validation-only sidecar head.

The active topology remains:

```text
PR01 -> PR02, PR02A sidecar
-> PR03 -> PR03B -> PR04
-> PR05A/B/C -> PR06 -> PR06A, PR06B-min sidecar
-> PR07A/B, PR07C sidecar
-> PR09 -> PR10 -> PR11A-E -> PR12
-> PR13A/B0/B1/B2/B3 -> PR14 -> PR14B
-> PR15A/B/C-on-PR14B
-> validation-only PR6B + PR07C + PR03B + PR14B + PR15C head
```

Use the `ready-pr03b/*` replacement stack as authoritative. Drop old downstream
`ready/*` PR04+ heads for filing because they omit PR03B. Do not use old
`ready/*`, raw `deferred/*`, `candidate/rtc-pr16-*`, validation refs, or dirty
diagnostic branches as product PR heads.

The next branch queue is now:

1. Assimilate the `20260517T074254Z` finalization report into the canonical
   split context.
2. Verify and publish/fetch only explicit `ready-pr03b/*` refs, then generate
   a fresh standalone branch audit and push manifest newer than the
   finalization report and latest deferred candidates.
3. Rebuild combined validation from
   `validation/rtc-pr03b-pr06b-pr07c-plus-pr14b-pr15c-sidecar-20260517T074254Z`.
4. Settle seed `1020002` by proof, reclassification, or focused repair before
   final-stack fuzz or filing; run a focused `1020002` gate only if still
   required by rebuilt validation.
5. Run PR03B/PR07C focused runtime checks only if `wp-env`/Playwright is
   already usable; otherwise record the environment gap.
6. Replay reload/provider lifecycle diagnostics for seeds `5900001` and
   `5400002`, and run bounded owner comparison for `980007` and `980017`.
7. Compare parser, rich-text, entity, and linebreak residual rows against
   PR05B/PR05C before naming any later owner.

The latest raw split report also records the new reload-hydration diagnostic
branch `deferred/rtc-reload-hydration-20260517T073541Z` at
`c59a2fba4ff1223a501cd470b904d3308459f1e0`, with intended local publication
branch `danluu/rtc-ws-provider-lifecycle-diagnostics-20260517`. It is
diagnostics-only. Replay `d4490d81e882` / seed `5900001` and
`df41c4c0e0a1` / seed `5400002`, plus the strict reload/revision-persistence
families, against those diagnostics before any reload-hydration product
promotion.

The older Cycle 240/242 trail remains useful for durable classification:
PR07C is a product sidecar, seed `5700084` is PR05C-covered /
oracle-equivalence downscoped, `5200005` table-delete replay is PR12-covered,
`a914c862c29e` is PR11C-covered, `1060015` and `7510029` are downscoped unless
new red evidence appears, and `045710` / `055716` / `062719` / `065722`
reload-hydration rows remain diagnostic-only unless newer evidence proves
product ownership.

The newest duplicate/noise synthesis is
`duplicate-noise-20260517T075352Z-synthesis.md`. It keeps duplicate/noise work
in the fuzzer control plane, not in the product PR split, and now says no
blocking disagreement prevents the narrow fix. The consensus smallest safe
path is current-run hardening: write/suppress `no-analysis.json` only for
no-product known infra/startup noise, lower the current-run no-product
known-noise threshold to `2-3`, make strict `pre_action_bootstrap_stall`
immediate, add consumer backstops before queue/launch, clear current-run-only
scheduler state on output-root rotation, and treat historical pauses as
telemetry only. Product-evidence `unknown`, `late_session_awareness_stall`,
reload/save/revision/content divergence, and likely-real signatures must remain
visible.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", "do not add PR6B", stale PR13 review-ref warnings, and "only novelty-
http is enabled" claims are superseded by the `2026-05-17T08:06:17Z`
branch-link audit, the nonempty current raw novelty-status input, the latest
trend packet, and the latest split and duplicate/noise syntheses/actions.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR14B / PR15-on-PR14B finalization | `20260517T074254Z` finalization report; `ready-pr03b/*` refs | mandatory replacement topology; PR07C conflict is resolved in the finalization report, but no current `verified-content` branch links exist for PR14B or PR15-on-PR14B | Publish/fetch/audit only explicit `ready-pr03b/*` product refs until the GitHub branch-link audit exposes verified PR-content links; keep validation-only heads out of product PRs |
| Malformed-save request-payload PR6B | minimal PR06A sidecar; old polluted PR6B and historical validation heads are superseded | active recommended sidecar after PR06A; a ready ref exists, but no current `verified-content` branch-link audit row exists | Publish/fetch/audit the minimal product branch, keep validation-only heads out of filing branches, verify inclusion in the rebuilt PR03B/PR14B/PR15-on-PR14B validation stack |
| PR07C reload record snapshots | accepted sidecar after PR07B; `20260517T074254Z` finalization report | Cycle 236 browser-pass evidence promotes it into the split and Cycle 240 marks it `product-sidecar`; the prior PR03B restack conflict is resolved in `ready-pr03b/*`, but no current `verified-content` branch-link audit row exists | Publish/fetch/audit the `ready-pr03b/*` PR07C product branch, run focused runtime checks only if the environment is usable, and keep validation-only heads out of product PRs |
| PR03B browser `restoreRevision` CRDT invalidation | `ee0d01a82e12`; `pr-split-20260517T075636Z-synthesis.md`; `ready-pr03b/*` finalization stack | active required PR03-family product slot; finalization report makes it part of the authoritative replacement stack, but no verified GitHub branch link exists and focused runtime replay is still an environment-gated check | Publish/fetch/audit the explicit `ready-pr03b/*` PR03B product ref, run PR03B/PR07C focused runtime checks only if `wp-env`/Playwright is usable, rebuild validation from the finalization sidecar head, and settle `1020002` before final-stack fuzz/filing |
| PR13 finer split | PR13B0/B1/B2/B3 source-level evidence; repaired audited PR13A/B/C fallback links | preferred source split is PR13A/B0/B1/B2/B3, but proposed rows currently use only repaired audited PR13A/B/C links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired PR13B/C fallback rows |
| Seed `1020002` WebSocket marker divergence | latest split synthesis removes it as product work | final-stack validation/fuzz/filing-only; not an independent-work blocker and not a PR17 product branch | Keep it out of product blocker scans unless later evidence proves product ownership; settle it by proof, reclassification, or focused repair before final-stack fuzz/filing |
| Reload/post-save `5200005` table-delete replay | completed reducer evidence | PR12-covered by previous-local-cache block delete; not a new product branch | Consume the classification into filing notes; do not assign a PR18/reload product branch unless later evidence contradicts the PR12-covered result |
| Strict `5200005` nested-group signal | newer strict-expansion signal `a914c862c29e` | latest source-local evidence marks it PR11C-covered; no PR18x assignment and no longer an open tail gate | Consume the PR11C-covered classification; reopen only if newer red evidence contradicts the current source-local result |
| `ee0d01a82e12` revision-restore owner gate | latest split-persona synthesis | resolved into PR03B branch-shaping work, not PR07C or PR18x | Track through the PR03B row above; do not leave it as a passive pre-final owner gate |
| Parser-sensitive seed `1060015` | prior focused WebSocket/browser artifacts | downscoped out of the current product-blocker set unless new red evidence appears | Keep out of PR5D/PR18 unless a fresh prepared-browser repro and source-owner reducer prove product ownership |
| Seed `7510029` nested-child delete residual | source-local nested-delete red test passed on PR15C-on-PR14B; UI-only discriminator prompt pending | downscoped out of the current product-blocker set unless new red evidence appears | Keep out of PR18A unless a fresh UI-only browser repro proves source ownership |
| Reload-hydration diagnostics | nonempty diagnostic-only branch/report for `045710`; `055716` still diagnostic-only; newer nonempty `20260517T062719Z`, `20260517T065722Z`, and `20260517T073541Z` diagnostics | diagnostic-only unless newer evidence proves product ownership; latest mapped branch is `deferred/rtc-reload-hydration-20260517T073541Z` at `c59a2fba4ff1223a501cd470b904d3308459f1e0` with intended local publication branch `danluu/rtc-ws-provider-lifecycle-diagnostics-20260517` | Keep out of PR 6, PR 6A, PR 8A, PR 15, and fallback-group claims unless a later focused browser replay proves product ownership and a clean branch is shaped; replay `d4490d81e882` / seed `5900001`, `df41c4c0e0a1` / seed `5400002`, and strict reload/revision-persistence families against the `073541` diagnostics before promotion |
| Seed `7700055` table query-array identity loss | earlier minority signal | lower-priority evidence-only; do not create a generic PR18 bucket | Run a lower-priority red test only after comparing against PR14/PR14B |
| Seed `5700084` strict linebreak divergence | Cycle 240 owner/downscope artifacts | freshly consumed as PR05C-covered / oracle-equivalence downscope; not an open PR18x gate | Keep out of PR18x/PR5D unless new source-owned product evidence appears |
| Fresh strict/focused likely-real residuals | current strict-expansion and focused-shard rows; current raw novelty status has `0` visible likely-real failures, while trend evidence remains aggregate/control-plane only | owner-triage input only; do not name PR18x from historical duplicate/noise aggregates or from rows that have not been compared against earlier owners | Continue or run owner-only classification; compare parser/rich-text/entity/linebreak rows against PR5B/PR5C first, revision-restore rows against PR03/PR03B/PR07C, and block-tree rows against PR11C/PR12 before later owners |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit | Shape and audit a narrowed title-reload branch only if PR8A is revived |
| Pre-save search/live document collapse | prior pre-save search/live-collapse candidate rows | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Rich-text formatted suffix corruption | diagnostic publication candidates and prior deferred refs | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Broader HTTP polling room-isolation residuals | PR02A sidecar plus stale deferred relaunches | PR02A remains in the known-fix prefix but has no verified branch link; broader residuals stay deferred | Publish/fetch/audit a PR02A review branch before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack preparation; no automatic PR slot | Triage only after the rebuilt stack is available |
| Duplicate/noise control-plane recycling | `duplicate-noise-20260517T075352Z-synthesis.md`; current raw novelty status | no product-code split change; latest consensus is narrow current-run no-product known-noise hardening, not broad producer cooldown/quarantine or product-evidence suppression | Keep current-run and historical duplicate/noise scopes separate, preserve real product-evidence signatures, avoid broad suppression, complete only narrow current-root/current-output hardening, and require rebuilt final-stack monitor evidence before filing |

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
3. Publish/fetch and audit only explicit `ready-pr03b/*` product refs for
   PR02A, PR03B, PR04-through-PR07B-on-PR03B, PR5A/B/C, PR11A-E, PR6B
   minimal, PR07C, PR13B0/B1/B2/B3 if available, PR14B, and
   PR15A/B/C-on-PR14B before treating those finer refs as maintainer-facing
   links. The finalization report and ready-ref mapping are not substitutes for
   `verified-content` GitHub branch-link audit rows.
4. Until PR13B0/B1/B2/B3 have verified branch links, keep using only repaired
   PR13A/B/C links from the audit for PR13 content.
5. Treat the `20260517T074254Z` finalization report as the current PR03B
   downstream restack state: PR07C is no longer conflict-blocked, but PR14B and
   PR15-on-PR14B still need fresh publish/fetch/audit evidence. Require a
   nonempty report, branch audit, push manifest, range-diff, diffstat/numstat,
   focused validation, `git diff --check`, and verified branch links before
   filing those rows.
6. Finish PR6B publication and branch-link verification before filing it.
   Require a clean GitHub review ref, sidecar manifest/validation evidence,
   focused tests, lint, formatting, build, seed replay evidence, branch audit,
   explicit inclusion in the PR14B/PR15-on-PR14B validation stack, and a
   verified branch link.
7. Treat PR07C as an accepted PR07B sidecar from the Cycle 236 browser-pass
   evidence and Cycle 240 `product-sidecar` manifest entry. The finalization
   report resolves its prior PR03B restack conflict, but filing still requires
   a `verified-content` PR07C branch link and any focused runtime checks that
   are feasible in the available environment.
8. Use the Cycle 246 progress-unblock branch audit and push manifest as the
   current reload-hydration diagnostic context, including the newer `073541`
   diagnostic branch, but do not treat those rows as product coverage. Refresh
   again only if a newer diagnostic/product candidate appears.
9. Consume PR17/seed `1020002` as removed from product work. Treat it as
   final-stack validation/fuzz/filing-only unless newer evidence proves product
   ownership, and do not let it block independent gate work.
10. Consume the completed `5200005` table-delete reducer as PR12-covered
   evidence and the newer strict-expansion `a914c862c29e` / seed `5200005`
   result as PR11C-covered. Do not leave either as an open tail blocker or
   PR18x candidate unless fresh red evidence contradicts the source-local
   coverage result.
11. Treat `ee0d01a82e12` as PR03B work. The narrow browser
    `restoreRevision` CRDT invalidation branch after PR03 is part of the
    `ready-pr03b/*` finalization stack, but filing still requires
    publication/fetch, verified branch link, rebuilt validation, and PR03B/PR07C
    focused runtime checks where the environment supports them. Do not assign
    this signal to PR07C or PR18x.
12. Keep `1060015` downscoped out of the current product-blocker set unless new
    prepared browser/source-owner evidence appears; do not assign it to PR05,
    PR18, PR5D, or another product branch from current evidence.
13. Keep `7510029` downscoped out of the current product-blocker set unless a
    fresh UI-only browser repro proves source ownership; do not name PR18A from
    current evidence.
14. Treat `045710`, `055716`, `20260517T062719Z`, `20260517T065722Z`, and
    `20260517T073541Z` reload-hydration evidence as diagnostic-only unless
    focused browser replay proves product ownership and a clean branch is
    shaped.
15. Compare lower-priority `7700055` against PR14/PR14B before treating it as a
    new product PR.
16. Consume seed `5700084` as PR05C-covered / oracle-equivalence downscoped.
    Reopen it only if fresh source-owned product evidence appears.
17. Treat the latest duplicate/noise work as a fuzzer control-plane update, not
    product PR work. The current consensus is narrow current-run no-product
    known-noise hardening: write/suppress `no-analysis.json` only for
    no-product known infra/startup noise, add consumer queue/launch backstops,
    clear current-run state on output-root rotation, and keep real
    product-evidence signatures visible. Reject broad duplicate-share-based
    suppression of product-evidence failures.
18. Rebase or recreate each intended PR branch on the intended upstream base if
    that base moves.
19. Regenerate branch graph/containment evidence and adjacent
    range-diffs/diffstats from the actual filing repo.
20. Rerun focused checks, touched-file lint, and `git diff --check` on every
    imported/rebased branch.
21. Rebuild the combined stack from the explicit `ready-pr03b/*` product refs:
    PR01-PR06A heads, PR02A, PR03B, PR04-through-PR07B-on-PR03B, PR6B as a
    sidecar, PR07C, PR09-PR15C-on-PR14B, the PR13 finer split or audited
    fallback decision, and any accepted source-reduced residual branches.
22. Rerun bounded final-stack validation against the rebuilt stack and count it
    only if it reaches action-level product coverage and proves PR6B and the
    PR14B/PR15-on-PR14B refs were included.
23. Block filing if any visible current likely-real failures appear in a fresh
    final-stack monitor snapshot. This collection's raw novelty status reports
    `0` visible likely-real failures in the active coverage-guided output dir,
    and the latest trend packet is graph-derived control-plane evidence; neither
    is rebuilt final-stack product-health evidence.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after environment preflight is healthy. Do not run
broad/final-stack fuzz while `ready-pr03b/*` publication/fetch/audit,
PR14B/PR15-on-PR14B branch links, PR6B GitHub branch links, PR07C branch-link
validation, PR13 finer branch links or fallback decision, current
strict/focused owner triage, reload-hydration diagnostic adjudication, seed
`1020002` settlement, rebuilt validation, branch-link audits, and fresh
nonempty final-stack monitor evidence are open. The current raw novelty input
is active-run health evidence, and none of the current trend, duplicate/noise,
or residual reducer evidence is final-stack fuzz validation or a filing
unblocker.
