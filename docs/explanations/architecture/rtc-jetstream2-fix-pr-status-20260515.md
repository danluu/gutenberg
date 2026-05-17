# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T06:20:08Z`

Trigger event:
`duplicate-noise-2026-05-17T06-19-07Z-104`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/duplicate-noise-2026-05-17T06-19-07Z-104/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked, but the blocker set has changed again. The newest
completed split-persona synthesis, `pr-split-20260517T060214Z-synthesis.md`,
keeps the PR01-through-PR15C-on-PR14B spine, promotes PR07C to an accepted
PR07B sidecar based on Cycle 236 browser-pass evidence, downscopes PR17 / seed
`1020002`, `1060015`, and `7510029` out of the current product-blocker set, and
leaves the remaining useful tail work independent of `1020002`.

The active maintainer-facing shape is now:

```text
PR01 -> PR02, with PR02A as a PR02 sidecar
-> PR03 -> PR04 -> PR05A/B/C -> PR06 -> PR06A
-> PR6B minimal malformed outgoing RTC save payloads as a PR06A sidecar
-> PR07A/B, with PR07C accepted as a PR07B sidecar
-> PR09 -> PR10 -> PR11A-E -> PR12
-> PR13A/B0/B1/B2/B3 if published and audited; otherwise the repaired audited PR13A/B/C fallback
-> PR14 -> PR14B -> PR15A/B/C-on-PR14B
-> validation-only PR6B + PR07C + PR14B + PR15C head
-> pre-final gates: a914c862c29e / seed 5200005 owner comparison,
   seed 5700084 PR5B/PR5C comparison, and 045710 diagnostic adjudication
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
  seed number alone; compare `a914c862c29e` against PR11C and PR12 first, then
  PR13B/PR14B/PR15C only if still red.
- Seed `5700084`: compare against PR5B/PR5C before any PR18x claim.
- `1060015`: downscoped out of the current product-blocker set unless new red
  evidence appears; do not name PR5D or PR18 from the current evidence.
- `7510029`: downscoped out of the current product-blocker set unless new red
  evidence appears; do not name PR18A from the current evidence.
- `045710`: diagnostic-only reload-hydration branch; not a product PR.

## Branch And Ref Status

The remote status input was generated at `2026-05-17T06:20:03Z`.

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

The branch-link audit was generated at `2026-05-17T06:20:08Z` from fetched
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
collected_at_utc: 2026-05-17T06:20:03Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T061731Z
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
stack because PR02A, PR5A/B/C, PR11A-E, PR6B, PR07C, PR13B0-B3 or an explicit
audited fallback decision, PR14B, and PR15A/B/C-on-PR14B still need verified
branch links or explicit fallback decisions.

The collected `raw/novelty-status.md` input for this update is zero bytes, so
do not reuse older raw novelty-status counts as the current-run monitor state.
The latest applied duplicate/noise action measured the patched monitor at
`2026-05-17T06:15:28Z`:

```text
policy: 13 loaded
raw signatures: 0
no-product raw signatures: 0
suppressed strict startup virtual signatures: 0
likely-real visible: 0
product-evidence signatures: 0
consumer-path queued/retry/running: 0 / 0 / 0
current coverage root from remote-status: run-20260517T061731Z
```

The zero current signatures are health evidence for the active control plane,
not final-stack validation or a filing unblocker. Historical triage remains
deliberately separate; do not present historical duplicate/noise as live
current-run product failure.

The latest trend evidence packet was generated at `2026-05-17T06:12:00Z` from
monitor data through `2026-05-17T06:09:06Z`:

```text
monitor passes: 1861
coverage files: 272 -> 40814
coverage files delta: 40542
unmet coverage goals: 5
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.352
summary_startup_failures_last: 0
quality issues: 1
trend enabled groups: novelty-ws-real-user-editing,
  novelty-ws-real-user-rich-text,
  novelty-http-persistence-probe
fuzz level mix: browser-e2e=28 lanes/28 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 3832285
browser-e2e execution: 98384 cumulative / 232 per-hour
unit-property execution: 3307872 cumulative / 163744 per-hour
coverage-guided-lower-level execution: 423023 cumulative / 23552 per-hour
load1/load5/load15: 38.65 / 42.31 / 50.58 on 64 cores
memory: 434.9G free
```

Largest remaining coverage gaps are `ui-heading-shortcut` `755/1000`,
`reload-post-action` `765/1000`, title-save-reload `303/500`,
body-save-reload `362/500`, and successful real-user-editing records
`437/500`.

Current-run triage and historical triage must remain separate. The trend packet
and duplicate/noise action both report zero visible current likely-real
failures, while the collected raw novelty-status input is empty. Treat that as
live health evidence only until a fresh nonempty current-run monitor snapshot
and rebuilt final-stack validation exist.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T060214Z-synthesis.md`. All six reports were nonzero. They
preserve the PR01-through-PR15C-on-PR14B spine, promote PR07C to an accepted
PR07B sidecar from the Cycle 236 browser pass, and replace the stale tail:
`1020002`, `1060015`, and `7510029` should not block the product PR split on
current evidence.

The same synthesis keeps filing blocked until the branch manifest is refreshed
after the Cycle 236 browser evidence, adjacent `base_ref` validation remains
enforced, `a914c862c29e` / seed `5200005` is compared against PR11C and PR12
first, and seed `5700084` is compared against PR5B/PR5C before any PR18x claim.
It also repeats the hard-progress rule: zero-byte reports, `report.tmp`, active
sessions, disk-preflight-only output, stale manifests, and "job launched" alone
do not count as progress while the Parallel Progress Gate has actionable rows.

The latest raw split report, through Cycle 238, remains useful for the durable
artifact trail:

- The Cycle 236 manifest is newer than the `045710` reload-hydration diagnostic
  and includes it as optional diagnostic-only.
- The Cycle 238 critical-executor repair checked `32` adjacent publication
  rows, passed `32` adjacent `diff --check` rows, found zero `origin/trunk`
  base rows, and passed loop `bash -n`.
- The Cycle 238 strict owner-comparison report records `a914c862c29e` and seed
  `5700084` as still likely-real, assigns no PR18x, and sets the next bounded
  comparison to PR11C/PR12 first for `a914c862c29e` while preserving the
  PR5B/PR5C guard for `5700084`.
- `5200005` table-delete replay remains PR12-covered by previous-local cache
  block delete evidence and should not become PR18x.
- `1060015` and `7510029` are downscoped out of the current product-blocker set unless
  newer red evidence appears.
- The `045710` reload-hydration branch remains nonempty diagnostic-only
  evidence; it has diff/format/lint evidence but is not a product PR.

The newest duplicate/noise synthesis and action,
`duplicate-noise-20260517T054934Z-synthesis.md` and
`duplicate-noise-20260517T054934Z-feedback-action.md`, keep duplicate/noise
work in the fuzzer control plane, not in the product PR split. The action
patched only `bin/rtc-browser-fuzz-novelty-monitor.mjs` in the remote fuzz
repo. The monitor now uses no-product duplicate/noise accounting, folds
suppressed strict-startup identities into virtual `pre_action_bootstrap_stall`
family counts, and gates no-product startup noise without letting mixed
product-evidence signatures veto the guard. Mixed producers write
`no-analysis.json` with `preserveProductEvidence: true`.

Validation and live status for that duplicate/noise action:

```text
node --check bin/rtc-browser-fuzz-novelty-monitor.mjs: passed
policy: 13 loaded
latest measured active status: 2026-05-17T06:15:28Z
raw signatures: 0
no-product raw signatures: 0
suppressed strict startup virtual signatures: 0
likely-real visible: 0
product-evidence signatures: 0
present triage queued/retry/running/signatures: 0 / 0 / 0 / 0
```

Strict no-product startup stalls were blocked with `no-analysis.json` for
`novelty-http-persistence-probe` and `novelty-ws-real-user-editing`, and the
consumer-path check found no analysis-tier, deep-analysis-tier, live-analysis,
failure-analysis, or deep-triage artifacts for those sentinel runs. The
current root moved again by collection time to `run-20260517T061731Z`; this is
live control-plane health evidence, not final-stack fuzz validation.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", "do not add PR6B", stale PR13 review-ref warnings, and "only novelty-
http is enabled" claims are superseded by the `2026-05-17T06:20:08Z`
branch-link audit, the latest trend packet, the zero-byte raw novelty-status
input for this collection, and the latest split and duplicate/noise syntheses.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR14B / PR15-on-PR14B finalization | Cycle 232/234 replacement topology and validation-only sidecar evidence | mandatory replacement topology, but no current `verified-content` branch links for PR14B or PR15-on-PR14B | Publish/fetch/audit the ready refs until the GitHub branch-link audit exposes verified PR-content links; keep validation-only heads out of product PRs |
| Malformed-save request-payload PR6B | minimal PR06A sidecar; old polluted PR6B and historical validation heads are superseded | active recommended sidecar after PR06A, but no current `verified-content` branch-link audit row exists | Publish/fetch/audit the minimal product branch, keep validation-only heads out of filing branches, verify inclusion in the PR14B/PR15-on-PR14B validation stack |
| PR07C reload record snapshots | accepted sidecar after PR07B | Cycle 236 browser-pass evidence promotes it into the split, but no current `verified-content` branch-link audit row exists | Refresh the manifest, publish/fetch/audit the PR07C review branch, and keep validation-only heads out of product PRs |
| PR13 finer split | PR13B0/B1/B2/B3 source-level evidence; repaired audited PR13A/B/C fallback links | preferred source split is PR13A/B0/B1/B2/B3, but proposed rows currently use only repaired audited PR13A/B/C links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired PR13B/C fallback rows |
| Seed `1020002` WebSocket marker divergence | latest split synthesis downscopes it as not product-owned | no longer a product PR or final-stack product blocker; do not relaunch duplicate work | Consume the downscope into filing notes and keep it out of blocker scans unless later evidence contradicts the not-product-owned classification |
| Reload/post-save `5200005` table-delete replay | completed reducer evidence | PR12-covered by previous-local-cache block delete; not a new product branch | Consume the classification into filing notes; do not assign a PR18/reload product branch unless later evidence contradicts the PR12-covered result |
| Strict `5200005` nested-group signal | newer strict-expansion signal `a914c862c29e` | still likely-real, but no PR18x assignment; do not close by seed number alone | Compare by signature/family against PR11C and PR12 first, then PR13B/PR14B/PR15C only if still red |
| Parser-sensitive seed `1060015` | prior focused WebSocket/browser artifacts | downscoped out of the current product-blocker set unless new red evidence appears | Keep out of PR5D/PR18 unless a fresh prepared-browser repro and source-owner reducer prove product ownership |
| Seed `7510029` nested-child delete residual | source-local nested-delete red test passed on PR15C-on-PR14B; UI-only discriminator prompt pending | downscoped out of the current product-blocker set unless new red evidence appears | Keep out of PR18A unless a fresh UI-only browser repro proves source ownership |
| `045710` reload-hydration diagnostic | nonempty diagnostic-only branch and report | diagnostic-only; included in the newer manifest as optional diagnostic evidence, not a product PR | Adjudicate only as a diagnostic; keep out of PR 6, PR 6A, PR 8A, PR 15, and fallback-group claims |
| Seed `7700055` table query-array identity loss | earlier minority signal | lower-priority evidence-only; do not create a generic PR18 bucket | Run a lower-priority red test only after comparing against PR14/PR14B |
| Seed `5700084` strict linebreak divergence | live `core/verse.attributes.content` `\n` vs `<br>` comparison | still likely-real in Cycle 238 strict comparison; no PR18x assignment | Compare against PR5B/PR5C before any PR18x or PR5D claim |
| Fresh parser/rich-text/linebreak residuals | strict-expansion and focused-shard residuals | source-reduction input only; do not name PR18x yet | Source-reduce and compare against PR5B/PR5C, PR11, PR13, PR14B, PR15, and existing parser/oracle coverage |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit | Shape and audit a narrowed title-reload branch only if PR8A is revived |
| Pre-save search/live document collapse | prior pre-save search/live-collapse candidate rows | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Rich-text formatted suffix corruption | diagnostic publication candidates and prior deferred refs | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Broader HTTP polling room-isolation residuals | PR02A sidecar plus stale deferred relaunches | PR02A remains in the known-fix prefix but has no verified branch link; broader residuals stay deferred | Publish/fetch/audit a PR02A review branch before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack preparation; no automatic PR slot | Triage only after the rebuilt stack is available |
| Duplicate/noise control-plane recycling | `duplicate-noise-20260517T054934Z` synthesis/action; zero-byte `raw/novelty-status.md` in this collection | monitor policy `13` passed `node --check`; no-product startup stalls were blocked with product-evidence preservation; latest measured active status at `2026-05-17T06:15:28Z` had zero raw/product-evidence/likely-real signatures, but the current root had moved to `run-20260517T061731Z` by collection time | Keep current-run and historical duplicate/noise scopes separate, preserve product-evidence signatures, fold suppressed startup into no-product duplicate/noise accounting, and require fresh nonempty monitor evidence before treating future producer holds or broad launches as safe |

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
3. Publish/fetch and audit PR02A, PR5A/B/C, PR11A-E, PR6B minimal, PR07C,
   PR13B0/B1/B2/B3, and the current PR14B/PR15A/B/C-on-PR14B refs before
   treating those finer refs as maintainer-facing links.
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
7. Consume the Cycle 236 PR07C browser-pass evidence, refresh the manifest, and
   verify a `verified-content` PR07C branch link before filing it.
8. Consume PR17/seed `1020002` as downscoped/not product-owned and stop using
   it as a product PR/final-stack product blocker unless newer evidence
   contradicts that classification.
9. Consume the completed `5200005` table-delete reducer as PR12-covered
   evidence. If the strict-expansion `5200005` nested-group signal is still
   live as `a914c862c29e`, compare against PR11C and PR12 first, then
   PR13B/PR14B/PR15C only if still red.
10. Keep `1060015` downscoped out of the current product-blocker set unless new
    prepared browser/source-owner evidence appears; do not assign it to PR05,
    PR18, PR5D, or another product branch from current evidence.
11. Keep `7510029` downscoped out of the current product-blocker set unless a
    fresh UI-only browser repro proves source ownership; do not name PR18A from
    current evidence.
12. Treat `045710` as diagnostic-only unless focused browser replay proves
    product ownership and a clean branch is shaped.
13. Compare lower-priority `7700055` against PR14/PR14B before treating it as a
    new product PR.
14. Compare seed `5700084` against PR5B/PR5C before any PR18x or PR5D claim.
15. Rebase or recreate each intended PR branch on the intended upstream base if
    that base moves.
16. Regenerate branch graph/containment evidence and adjacent
    range-diffs/diffstats from the actual filing repo.
17. Rerun focused checks, touched-file lint, and `git diff --check` on every
    imported/rebased branch.
18. Rebuild the combined stack from explicit PR01-PR06A heads, PR02A, PR6B as
    a sidecar, PR07A/B plus PR07C, PR09-PR15C-on-PR14B, the PR13 finer split or
    audited fallback decision, and any accepted source-reduced residual
    branches.
19. Rerun bounded final-stack validation against the rebuilt stack and count it
    only if it reaches action-level product coverage and proves PR6B and the
    PR14B/PR15-on-PR14B refs were included.
20. Block filing if any visible current likely-real failures appear in a fresh
    nonempty monitor snapshot.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after environment preflight is healthy. Do not run
broad/final-stack fuzz while PR14B/PR15-on-PR14B branch links, PR6B GitHub
branch links, PR07C branch-link validation, PR13 finer branch links or fallback
decision, the `a914c862c29e` / strict-`5200005`, `5700084`, and `045710`
evidence gates, rebuilt validation, branch-link audits, and fresh nonempty
final-stack monitor evidence are open. None of the current trend,
duplicate/noise, or residual reducer evidence is final-stack fuzz validation or
a filing unblocker.
