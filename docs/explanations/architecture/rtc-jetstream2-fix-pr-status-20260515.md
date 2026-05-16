# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T23:46:22Z`

Trigger event:
`pr-split-2026-05-16T23-45-38Z-20260516T233834Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-16T23-45-38Z-20260516T233834Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked. The current maintainer-facing recommendation is:

```text
ready PR01-PR06A
-> PR6B malformed outgoing RTC save request-payload restack if it is clean
   after PR6A; otherwise restack the same two commits as PR16 after PR15C
-> ready PR07A-PR15C, plus PR02A as the PR02 sidecar once audited
-> PR17 seed 1020002 follower-side Yjs update application repair or
   proof-based reclassification
-> rebuilt combined validation stack
-> focused 1020002 gate
-> final-stack fuzz and filing
```

The latest split-persona synthesis,
`pr-split-20260516T233834Z-synthesis.md`, changes the tail from the previous
report. The ready heads remain a known-fix prefix, not a complete filing stack,
and the malformed-save restack now belongs immediately after PR6A if that
placement is clean. `deferred/rtc-malformed-save-payload-20260516T230550Z` must
not be filed as-is because it is based on the validation/deferred stack.
Restack only these two request-payload commits:

```text
8340c5d794a Avoid valid block originalContent in CRDT saves
008b7258fe4 Protect RTC saves from malformed evaluated content
```

Try that restack first as PR6B after
`ready/rtc-pr06a-persisted-empty-content-guard`, before the PR7A-PR15C tail. If
that placement depends on later stack state, file the same cleaned delta as
PR16 after
`ready/rtc-pr15c-fallback-group-delete-green`. Broader malformed post-save
settlement residuals and sidecar seed `7410076` stay deferred.

PR17 remains separate from PR6, PR13, PR15, PR16, reload hydration, pre-save
search/live-collapse, HTTP room isolation, and rich-text suffix work. Current
evidence says the marker-bearing update reaches the relay/page 1, while page 0
applies the remote client range as deleted. The next PR17 gate is follower-side
Yjs update application repair or proof-based reclassification for seed
`1020002`.

Seed `5700084` is no longer a product PR candidate. The latest comparison
classifies it as PR5C-covered plus strict oracle/exact-content drift, not
PR18A or PR5D. Keep strict-expansion rows as source-reduction evidence only
until they are source-reduced to uncovered product behavior.

Do not launch broad final-stack fuzz or file PRs yet. Final filing still waits
on the malformed-save restack/audit, PR17 repair or reclassification, rebuilt
combined validation, a focused `1020002` gate, and final-stack fuzz over the
rebuilt stack.

## Branch And Ref Status

The remote status input was generated at `2026-05-16T23:46:18Z`.

The fix-planning repo is checked out at:

```text
## fix/rtc-fallback-group-delete-stale-local
d06e3528cbd Fix stale fallback group deletes
```

That checkout still has an untracked reload-hydration E2E gate spec:

```text
test/e2e/specs/editor/collaboration/websocket-only/collaboration-reload-hydration-empty-live-gate.spec.ts
```

Keep that spec out of PR 6, PR 6A, PR 8A, PR 15A/15B/15C, fallback-group
evidence, and final branch claims unless it is deliberately copied into a clean
evidence worktree.

The fuzz repo remains on the validation stack:

```text
## try/rtc-fix-stack-validation
72854f05ed2 Hydrate saved CRDT responses without invalidation
```

That stack has modified product/test files and many untracked fuzz, analysis,
and documentation artifacts. It is active validation infrastructure, not the
final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-16T23:46:22Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`.

For repaired PR 13 content, use only these audit refs:

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
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | 1 | +115 / -0 | local ready head exists per prior manifest work; publish/fetch/audit a remote review branch or fold/restack before filing |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; seed `5500002` marker-retention remains separate follow-up |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified branch; keep in known-fix prefix |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | 2 | +465 / -8 | replacement for old aggregate PR 5; local ready head still needs remote verified-content branch link |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | 2 | +925 / -42 | replacement for old aggregate PR 5; local ready head still needs remote verified-content branch link |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | +287 / -15 | replacement for old aggregate PR 5; seed `5700084` now classifies as PR5C-covered plus strict oracle/exact-content drift, not a new product PR |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified branch; excludes malformed-save restack and broader residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified branch; narrow persisted-body guard |
| PR 6B preferred / PR 16 fallback | Malformed outgoing RTC save request-payload restack from `8340c5d794a` and `008b7258fe4` only | No verified branch link yet | TBD | TBD | do not file `deferred/rtc-malformed-save-payload-20260516T230550Z` as-is; try clean PR6B immediately after PR6A and before PR7A, otherwise restack as PR16 after PR15C |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified branch; repaired split head |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified branch stacked after PR 7A |
| PR 8A | Narrow title reload replacement | No verified branch link yet | TBD | TBD | broad verified PR 8 is prior art only; shape a narrow title-reload branch only if revived |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; keep in known-fix prefix |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified branch; start CRDT block stack |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | 2 | +257 / -3 | green in validation-stack rebuild; local ready head still needs remote verified-content branch link |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | 2 | +240 / -2 | green in validation-stack rebuild; local ready head still needs remote verified-content branch link |
| PR 11C | Explicit-base middle insert | No verified branch link yet | 2 | +220 / -0 | green in validation-stack rebuild; local ready head still needs remote verified-content branch link |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | 2 | +259 / -0 | green in validation-stack rebuild; local ready head still needs remote verified-content branch link |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | 2 | +170 / -0 | green in validation-stack rebuild; local ready head still needs remote verified-content branch link |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified branch; keep in known-fix prefix |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired audit link; first maintainer-facing PR13 delta |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired audit link; carries the source-retirement delta |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired audit link; third maintainer-facing PR13 delta |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified branch; keep after PR13 source sequence |
| PR 15A | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 | +123 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 15B | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | 2 | +197 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 15C | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | 2 | +161 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 17 | Seed `1020002` WebSocket/Yjs follower-side update application repair or proof-based reclassification | No verified branch link yet | TBD | TBD | active final-stack blocker; shape only after the focused diagnostic proves repair or reclassification |

Verified branches that are prior art or staging only:

- [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence)
  is verified content for old aggregate PR 5, not the recommended
  maintainer-facing split.
- [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record)
  is verified content for old broad PR 8, not an active filing unit.
- [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops)
  is verified content for old aggregate PR 11, but the active recommendation
  is the PR11A-E split.

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-16T23:46:18Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T233749Z
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
stack because PR02A still needs a verified review branch, malformed-save must
be cleanly restacked and audited, PR17 still needs seed `1020002`
repair/reclassification, and the rebuilt validation stack has not been rerun
over those final decisions.

The collected `raw/novelty-status.md` is non-empty for this update. It was
updated at `2026-05-16T23:45:05.457Z` and reports current-output-dir-only
triage with `0` signatures, `0` likely-real visible, `0` likely-real merged
duplicates, and no paused groups. It also reports `current-run records by
profile: {}` and a health warning that no behavioral coverage files were found
under the current novelty output dir, so treat the raw novelty data as current
health/control-plane evidence, not product validation.

The latest trend evidence packet was generated at `2026-05-16T23:40:52Z` from
monitor data through `2026-05-16T23:39:46Z`:

```text
monitor passes: 1755
coverage files: 272 -> 36922
coverage files delta: 36650
unmet coverage goals: 24 -> 7
likely_real_max: 0
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.353
summary_startup_failures_last: 0
quality_issues_last: 1
fuzz level mix: browser-e2e=30 lanes/30 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 2373290
browser-e2e execution: 91058 cumulative / 1412 per-hour
unit-property execution: 2068956 cumulative / 168560 per-hour
coverage-guided-lower-level execution: 210270 cumulative / 24832 per-hour
load1/load5/load15: 38.31 / 35.59 / 35.62 on 64 cores
memory: 433.2G free
```

Enabled current groups:

```text
novelty-ws-persistence-no-title
novelty-ws-lifecycle
novelty-http-persistence-probe
novelty-ws-real-user-editing
novelty-ws-real-user-rich-text
```

Largest remaining coverage gaps in the trend evidence are `reload-post-action`
`613/1000`, `ui-heading-shortcut` `647/1000`, title-save-reload `225/500`,
body-save-reload `284/500`, successful real-user-editing records `346/500`,
`ui-format-paragraph` `923/1000`, and `core/html` `486/500`.

The `0` likely-real trend result and the raw novelty `0` current signatures are
useful health evidence, not final-stack validation and not filing unblockers.
Historical duplicate/noise remains a separate control-plane concern and must
not be presented as current product failure.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260516T233834Z-synthesis.md`; its matching feedback-action file is
zero bytes and edited no files. It supersedes the prior report tail in five
places:

- replace the tail with `ready PR01-PR06A -> PR6B if clean after PR6A ->
  ready PR07A-PR15C plus PR02A sidecar -> PR17 -> rebuilt validation ->
  focused 1020002 -> final-stack fuzz and filing`;
- do not file `deferred/rtc-malformed-save-payload-20260516T230550Z` as-is;
  restack only commits `8340c5d794a` and `008b7258fe4`, preferably as PR6B
  immediately after PR6A or otherwise as PR16 after PR15C;
- keep PR17 framed as seed `1020002` follower-side Yjs update application
  repair or proof-based reclassification;
- drop `5700084` from product PR consideration because the latest comparison
  classifies it as PR5C-covered plus strict oracle/exact-content drift.
- keep reload hydration, pre-save search/live-collapse, rich-text suffix, HTTP
  residuals, and post-save settlement residuals deferred unless separately
  promoted with clean source evidence.

The latest split synthesis asks for only bounded follow-up work:

- `rtc-pr16-malformed-save-request-payload-restack-audit` or
  `rtc-pr06b-malformed-save-restack-and-manifest`;
- `rtc-ws-seed-1020002-follower-apply-live-struct-diagnostic` unless an
  equivalent active job already exists;
- an optional small oracle/downscope job for `5700084`;
- manifest/deferred cleanup and loop-hardening work so zero-byte reports,
  stale manifests, missing rc files, disk-preflight-only reports, and
  wait-only feedback do not count as progress while independent work remains.

Do not launch broad final-stack fuzz or extra fuzz lanes from this state.

The latest duplicate/noise synthesis is
`duplicate-noise-20260516T231459Z-synthesis.md`; its matching feedback-action
file is zero bytes and edited no files. The synthesis still converges on a
fuzzer control-plane leak, not a confirmed RTC product failure. It recommends a
shared conservative no-product startup/bootstrap predicate across triage,
analysis, deep analysis, live monitoring, and supervisor/novelty scheduling;
failing closed on missing or stale current-output pointers; and preserving all
product-evidence failures.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older
"keep existing split", "do not add PR6B", and stale PR13 review-ref warnings
are superseded by the `2026-05-16T23:46:22Z` branch-link audit and the
`20260516T233834Z` split synthesis.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Malformed-save request-payload restack | `deferred/rtc-malformed-save-payload-20260516T230550Z`; commits `8340c5d794a`, `008b7258fe4` | useful evidence, but the deferred branch is not a filing source because it is based on the validation/deferred stack | Restack only the two request-payload commits immediately after PR6A if clean, otherwise after PR15C as PR16; generate branch graph, containment, adjacent range-diff, diffstat/numstat, manifest row, focused tests, lint, Prettier, `git diff --check`, build, and seed replay evidence |
| Malformed post-save settlement residuals and sidecar | `f51c425df8a5`, `f46859898576`, `7410076` | deferred/evidence-only; not part of PR6B or PR16 unless separately source-proven | Keep source-reducing; promote only with clean local source evidence and a verified branch link |
| Seed `1020002` WebSocket marker divergence | marker-bearing relay/page-1 evidence plus follower-side update evidence | active PR17/final-stack blocker; no verified filing branch exists | Run at most one bounded follower-side update-application replay with live `Y.applyUpdate` struct refs and deleted-state before/after apply; then repair or proof-classify |
| Seed `5700084` strict linebreak divergence | live `core/verse.attributes.content` `\n` vs `<br>` comparison | no product PR and no active PR18x row; classified as PR5C-covered plus strict oracle/exact-content drift | Downscope/update the strict oracle; do not create PR18A or PR5D for this seed |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit | Shape and audit a narrowed title-reload branch only if PR 8A is revived |
| Reload hydration empty live editor | deferred reload-hydration candidates and gate branches | evidence-only; not in PR 6, PR 6A, PR 8A, PR 15, or fallback-group claims | Promote only if a clean gate reaches the post-reload assertion and live editor state stays empty after exact-room WebSocket sync while REST body and persisted `_crdt_document` remain populated |
| Pre-save search/live document collapse | deferred pre-save search/live-collapse candidate rows | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Rich-text formatted suffix corruption | current diagnostic publication candidate `deferred/rtc-rich-text-formatted-suffix-20260516T230547Z` | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Broader HTTP polling room-isolation residuals | deferred HTTP room-isolation residual rows; PR02A has no verified branch link yet | PR02A remains in the known-fix prefix, but broader residuals stay deferred | Publish/fetch/audit a PR02A review branch before filing; promote additional residuals only with narrowed evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack blockers; no automatic PR slot | Triage only after `1020002` is repaired or reclassified and the rebuilt stack is available |
| Duplicate/noise control-plane leak | latest duplicate/noise synthesis `20260516T231459Z` | fuzzer infrastructure issue, not product validation | Apply only bounded control-plane gates/backoff; do not suppress failures with real product evidence |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr` branches as-is.

Before filing any maintainer-facing PR:

1. Verify environment health first. A disk-preflight-only report, zero-byte
   report, missing rc file, or stale active session is not durable progress
   while actionable Parallel Progress Gate rows remain.
2. Use the explicit ready prefix. Do not wildcard import or file
   `final/rtc-pr*`, validation-stack branches, deferred branches, or dirty
   evidence branches.
3. Keep old aggregate PR 5, broad PR 8, aggregate PR 11, stale/misordered
   PR13 refs, old dropped save snapshot/no-op PR6B material, PR 6C, dirty
   evidence branches, and the untracked reload-hydration gate spec out of
   filing branches and push allow-lists.
4. Publish/fetch and audit PR02A plus individual PR 5A/5B/5C, PR 8A, PR11A-E,
   and the malformed-save restack branch, or keep rows marked
   `No verified branch link yet`.
5. Use the repaired audited PR13A/B/C review refs for maintainer-facing PR13
   links until any finer PR13 subheads have verified audit rows.
6. Restack malformed-save from only commits `8340c5d794a` and `008b7258fe4`.
   Prefer PR6B after PR6A if clean; otherwise file the same cleaned delta as
   PR16 after PR15C. Require focused tests, lint, formatting, build,
   `git diff --check`, seed replay evidence, manifest/branch audit, and a
   verified branch link before filing it.
7. Consume the PR17 follower-side Yjs update application evidence. Run at most
   one bounded follow-up with the diagnostic provider patch, only if no
   equivalent active job exists. Require seed `1020002` to pass or be explicitly
   reclassified, then shape PR17 and add a verified branch link before filing.
8. Treat `5700084` as PR5C-covered plus strict oracle/exact-content drift. Do
   not name PR18A or PR5D from that seed.
9. Rebase or recreate each intended PR branch on the intended upstream base if
   that base moves.
10. Regenerate branch graph/containment evidence and adjacent
    range-diffs/diffstats from the actual filing repo.
11. Rerun focused checks, touched-file lint, and `git diff --check` on every
    imported/rebased branch.
12. Keep dirty analysis-only artifacts out of product PR branches.
13. Rebuild the combined stack from explicit PR01-PR06A heads, PR02A, the
    accepted malformed-save restack, PR07A-PR15C, the PR17 `1020002` decision,
    and any accepted source-reduced residual branches. Rerun bounded
    final-stack validation against the rebuilt stack and count it only if it
    reaches action-level product coverage.
14. Block filing if new visible likely-real failures appear.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after the environment preflight is healthy. Do not
run broad/final-stack fuzz while the malformed-save restack, PR17 decision,
rebuilt validation, and branch-link audits are open. The latest trend packet
reports `likely_real_max: 0`, and this run's non-empty
`raw/novelty-status.md` reports `0` current signatures, but none of that is
final-stack fuzz validation or a filing unblocker.
