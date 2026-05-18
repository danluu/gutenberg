# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-18T05:33:34Z`

Trigger event:
`pr-split-2026-05-18T05-32-20Z-20260518T052256Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-18T05-32-20Z-20260518T052256Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The newest completed split-persona synthesis is
`pr-split-20260518T052256Z-synthesis.md`. It keeps the Cycle324/i40 ungrouped
split as the maintainer-facing target and advances the active source target to
the latest nonzero `20260518T052309Z` finalization, which preserves the same
shape, verifies `55/55` rows, and adds diagnostic `DIAG-RELOAD-045607`. The
split is stable only in that sense: grouped `PR06`, `PR11`, `PR12`, and `PR15`
are no longer active review units, and raw `PR07D`, `PR17`, `PR18`, and `PR18x`
remain absent.

Filing, broad final-stack fuzzing, and rebuilt stack-wide validation remain
blocked. The live blockers are missing PR07 owner evidence, seed `1020002`,
missing exact GitHub refs for many active rows, stale/incomplete publication
evidence for the latest finalization, and root disk pressure for Docker/browser
replay. The latest synthesis says root space is below the replay threshold
again, so cleanup must precede Docker/browser replay.

Important status changes since the prior report:

- Cycle332 and Cycle334 remain real completed local evidence. Cycle332 refreshed
  manifest/audit data from `20260518T042251Z`, repaired the loop progress gate,
  and set up strict stale-projection owner comparisons. Cycle334 refreshed
  manifest/audit data from `20260518T045301Z` with `54` audited rows and
  classified the Cycle328 PR07 replay as broken-wrapper evidence only. Both are
  superseded as active source targets by `20260518T052309Z`.
- The latest split synthesis says `20260518T052309Z` is the current nonzero
  finalization and verifies `55/55` rows, including diagnostic
  `DIAG-RELOAD-045607`. That finalization still lacks a fresh bundle/manifest
  refresh and verified GitHub publication evidence; `20260518T051306Z` is only
  the minimum review-consensus fallback source if `052309Z` cannot be consumed.
- The branch-link audit generated at `2026-05-18T05:33:34Z` verifies PR01,
  PR02, PR03, PR04, aggregate PR05, aggregate PR06, PR06A prior art, aggregate
  PR07A/PR07B, PR08 prior art, PR09, PR10, aggregate PR11, aggregate PR12,
  repaired PR13A/B/C, PR14, and PR15A-C component refs. It still does not
  verify the exact active i40 sub-PR refs for PR02A, PR05A-D, PR06A-D, PR06E,
  PR07A1-A3, PR07B0-B1, PR11A-E, PR12A-C, PR13B0-B3, PR14B, or PR15D.
- Current active-run fuzz is healthy but not final-stack validation. The latest
  raw novelty monitor at `2026-05-18T05:30:50.064Z` reports `health: ok`,
  `1` active current-run directory for revision-persistence, `1` active
  product-evidence signature, and `0` active visible likely-real failures. The
  drain scope has `0` visible likely-real failures and `2` raw product-evidence
  signatures, so drain/reporting evidence must stay separate from active-run
  health.
- The `duplicate-noise-20260518T044446Z-feedback-action.md` control-plane fix
  was applied and validated, but the newer
  `duplicate-noise-20260518T050842Z-synthesis.md` identifies a remaining
  scheduling leak: paused/no-analysis drain dirs can still steer active novelty
  policy. The next duplicate/noise work is active-only novelty scheduling and
  producer attribution, with including-paused scope retained only for reporting,
  cleanup, and product-evidence preservation.

Current replacement target:

```text
Common mainline:
PR01 -> PR02 (+ PR02A)
-> PR03 (hold PR03B)
-> PR04 -> PR05A -> PR05B -> PR05C -> clean PR05D
-> PR06A -> PR06B -> PR06C -> PR06D
(+ PR06E sidecar from PR06D)

Runtime-gated lane:
PR07A1 -> PR07A2 -> PR07A3 -> PR07B0 -> PR07B1
(hold HOLD-07B2 and HOLD-07C; no raw PR07D)

Held owner-comparison lane:
HOLD-STRICT-STALE-PROJECTION-5200005/5200008

Independent CRDT/data-loss lane from PR06D:
PR09 -> PR10
-> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B
-> PR15A -> PR15B -> PR15C -> PR15D
```

Non-product harness rows:

```text
HARNESS-WS-URL
HARNESS-PLUGIN-STATUS
```

Diagnostic/evidence-only rows:

```text
DIAG-RELOAD-045607
```

Hard blockers remain:

- Do not file GitHub PRs, launch broad final-stack fuzz, or claim rebuilt
  stack-wide validation yet.
- Publish, fetch, and audit exact product refs for every active row that says
  `No verified branch link yet`.
- Run root cleanup plus a non-Docker manifest/audit refresh from the latest
  nonzero `20260518T052309Z` Cycle324/i40 finalization. Fall back to
  `20260518T051306Z` only if the current `052309Z` artifacts cannot be consumed.
- Recover `/` above the `2048 MB` replay threshold before Docker/browser
  replay.
- Classify and stop/replace the broken Cycle328 PR07 replay; fix wrapper
  quoting/glob issues and add timeouts around `wp-env` setup.
- Run one corrected PR07 owner replay over `PR07B0`, `PR07B1`, `HOLD-07B2`,
  and `HOLD-07C`, with `collaborationEnabled=true`, REST/meta,
  `_crdt_document`, edited record, Y.Doc/provider/awareness, block-tree
  first-divergence snapshots, and per-step `wp-env run cli` timeouts. The seed
  set named by the latest synthesis is `5200011`, `5200017`, `5200010`,
  `7110004`, `7110017`, `1000001`, `1000002`, and relevant `5200008`.
- Run the strict stale-projection owner replay for seeds `5200005` and
  `5200008` against `PR11A`, `PR11E`, `PR12C`, `PR13B3`, `PR07B1`, and
  `HOLD-07C`.
- Keep stale Cycle293/Cycle306/local-publish rows, fallback-tail PR05D, raw
  PR07D, PR17, PR18, PR18x, active-session-only status, setup-only output,
  disk-preflight-only output, header-only TSVs, `report.tmp`, and zero-byte
  reports out of filing evidence.

## Branch And Ref Status

Remote status was collected at `2026-05-18T05:33:27Z`.

The fix-planning repo is checked out at:

```text
## fix/rtc-fallback-group-delete-stale-local
d06e3528cbd Fix stale fallback group deletes
```

That checkout still has an untracked reload-hydration E2E gate spec:

```text
test/e2e/specs/editor/collaboration/websocket-only/collaboration-reload-hydration-empty-live-gate.spec.ts
```

Keep that spec out of PR06, PR06E, PR07, PR08, PR15, fallback-group evidence,
and final branch claims unless it is deliberately copied into a clean evidence
worktree.

The fuzz repo remains on the validation stack:

```text
## try/rtc-fix-stack-validation
72854f05ed2 Hydrate saved CRDT responses without invalidation
```

That repo has modified product/test files plus many untracked fuzz, analysis,
and documentation artifacts. It is active validation infrastructure, not the
final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-18T05:33:34Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`. A verified
branch link confirms that the linked ref exists and has a non-empty audited
diff; it does not prove exact i40 publication shape, ancestry, owner evidence,
or filing readiness.

Use only these repaired audited PR13 review refs for current PR13 content or
fallback evidence:

- [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired)
- [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement)
- [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard)

Do not link these stale or misordered PR13 refs as current PR content:

- `review/rtc-pr13a-observed-delete-provenance`
- `review/rtc-pr13b-stale-block-identity-smear`
- `review/rtc-pr13c-cross-parent-source-retirement`

Supporting provenance base:
[`shape/rtc-crdt-pr12-previous-local`](https://github.com/danluu/gutenberg/tree/shape/rtc-crdt-pr12-previous-local)
exists only so the repaired PR13A compare has the correct source base.

## Proposed PR Split

Every proposed row either uses a clickable branch link from the verified
branch-link audit or explicitly says `No verified branch link yet`.

### Common Mainline

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified content |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified content |
| PR 2A | HTTP room-isolation regression sidecar after PR2 | No verified branch link yet | TBD | TBD | evidence-only until pushed/fetched/audited |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified content; PR03B remains held |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified content |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | TBD | active i40 row; aggregate PR05 is prior art only |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | active i40 row; exact branch still missing |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | active i40 row; exact branch still missing |
| PR 5D | Clean semicolonless/entity-validation after PR5C | No verified branch link yet | TBD | TBD | valid only for clean `27c6e7924217`; reject fallback/PR15-tail PR05D |
| PR 6A | Save-request payload guard subhead `705d84c` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split; exact branch still missing |
| PR 6B | Save-request payload guard subhead `d127d3d` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split; exact branch still missing |
| PR 6C | Save-request payload guard subhead `d4041cc` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split; exact branch still missing |
| PR 6D | Save-request payload guard subhead `e072401` | No verified branch link yet | TBD | TBD | PR09 and PR06E must hang from this row |
| PR 6E | Malformed outgoing RTC save sidecar from PR06D | No verified branch link yet | TBD | TBD | sidecar must hang from PR06D, not PR07 |

### Runtime-Gated Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 7A1 | Save response entity-state guard microhead | No verified branch link yet | TBD | TBD | active i40 row; runtime owner evidence still missing |
| PR 7A2 | Save response skipped/base guard microhead | No verified branch link yet | TBD | TBD | active i40 row; stale replay must be cleared before rerun |
| PR 7A3 | Save response stale block/content guard microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 7B0 | Save response manager/base-record entry microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 7B1 | Save response manager/base-record owner microhead | No verified branch link yet | TBD | TBD | active i40 row; held PR07B2 and PR07C branch from here |

### Independent CRDT/Data-Loss Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 9 | Core-data lock fairness from PR06D | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified content; replacement manifest must prove PR06D ancestry and PR07 non-ancestry |
| PR 10 | CRDT block reconciliation foundation after PR9 | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified content |
| PR 11A | Explicit-base top-level operation subhead `9376ea9` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; exact branch still missing |
| PR 11B | Explicit-base top-level operation subhead `3d228d0` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; exact branch still missing |
| PR 11C | Explicit-base top-level operation subhead `eb02980` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; exact branch still missing |
| PR 11D | Explicit-base top-level operation subhead `0f18951` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; exact branch still missing |
| PR 11E | Explicit-base top-level operation subhead `75e065` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; exact branch still missing |
| PR 12A | Previous-local-cache operation subhead `fa13d1` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split; exact branch still missing |
| PR 12B | Previous-local-cache operation subhead `80d6a4` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split; exact branch still missing |
| PR 12C | Previous-local-cache operation subhead `95d3a0` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split; exact branch still missing |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired verified content |
| PR 13B0 | Identity/provenance guard microhead | No verified branch link yet | TBD | TBD | active i40 row; repaired PR13C is supporting fallback evidence |
| PR 13B1 | Direct cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i40 row; repaired PR13B is supporting fallback evidence |
| PR 13B2 | Current-only cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 13B3 | Explicit-base cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | required before active PR15A-D |
| PR 15A | Fallback-group operation subhead `687a13` after PR14B | No verified branch link yet | TBD | TBD | active i40 row; verified component prior art is not exact PR14B-based ref |
| PR 15B | Fallback-group operation subhead `17569a` after PR15A | No verified branch link yet | TBD | TBD | active i40 row; exact PR14B-based link missing |
| PR 15C | Fallback-group operation subhead `bcf1c4` after PR15B | No verified branch link yet | TBD | TBD | active i40 row; exact PR14B-based link missing |
| PR 15D | Fallback-group operation subhead `276709` after PR15C | No verified branch link yet | TBD | TBD | active i40 row; exact PR14B-based link missing |

### Held Sidecars, Fallbacks, And Prior Art

| Row | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR3 | No verified branch link yet | held until PR03-vs-PR03B replay proves ownership |
| PR 7B2 | Save response terminal manager/base-record microhead | No verified branch link yet | held until PR07B0/PR07B1/HOLD-07C replay proves a distinct product delta |
| PR 7C | Save response/reload sibling evidence after PR07B1 | No verified branch link yet | held until owner replay proves coverage and distinctness; raw PR07D remains rejected |
| HOLD-STRICT-STALE-PROJECTION-5200005/5200008 | Strict stale projection/reload owner comparison against earlier plausible owners | No verified branch link yet | held comparison lane only; not a product PR slot |
| HARNESS-WS-URL | WebSocket/reload harness URL evidence | No verified branch link yet | harness-only row; not a product fix |
| HARNESS-PLUGIN-STATUS | Plugin status JSON stall/retry harness sidecar | No verified branch link yet | harness-only row; queue separately from product PRs |
| DIAG-RELOAD-045607 | Reload diagnostic row from latest nonzero Cycle324/i40 finalization | No verified branch link yet | diagnostic/evidence-only row; not a product PR slot |
| PR 5 aggregate | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | verified prior art, not the active PR05A-D split |
| PR 6 aggregate | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | verified aggregate prior art; replaced by active PR06A-D recommendation |
| PR 6A prior art | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | verified prior art; do not confuse with active PR06A-D payload split |
| PR 7A aggregate | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | verified prior art, not the active PR07A1-A3 split |
| PR 7B aggregate | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified prior art, not the active PR07B0-B1 plus held PR07B2 split |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 11 aggregate | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | verified aggregate prior art; replaced by active PR11A-E recommendation |
| PR 12 aggregate | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | verified aggregate prior art; replaced by active PR12A-C recommendation |
| PR 13B repaired fallback | Cross-parent source retirement fallback | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | repaired verified fallback until PR13B0-B3 have verified exact links |
| PR 13C repaired fallback | Stale block identity smear guard fallback | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | repaired verified fallback and supporting evidence |
| PR 15A component | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | verified component prior art; active PR15A-D exact PR14B-based refs still missing |
| PR 15B component | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | verified component prior art; active PR15A-D exact PR14B-based refs still missing |
| PR 15C component | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified component prior art; not a clean PR05D substitute |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-18T05:33:27Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T052348Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The raw `novelty-status.md` for this update was written at
`2026-05-18T05:30:50.064Z` for `run-20260518T052348Z`:

```text
health: ok
coverage files: 50138
total records seen: 78657
records processed this pass: 54
new behavioral feature keys this pass: 0
new CDP coverage hashes this pass: 0
active current-run dirs: 1
current-run records: {"revision-persistence":1}
current-run group records: {"novelty-ws-revision-persistence":1}
current-run pre-action startup failures: {}
active current-run signatures: 1
active current-run product-evidence signatures: 1
active current-run visible likely-real failures: 0
current drain likely-real visible: 0
current drain raw signatures: 2
current drain product-evidence signatures: 1
current drain top families:
  reload_rejoin_awareness_stall=1
recommended groups:
  novelty-ws-real-user-save-reload
  novelty-ws-real-user-editing
  novelty-ws-real-user-rich-text
enabled groups:
  novelty-ws-revision-persistence
  novelty-ws-parser-transform
```

Interpretation:

- This is current active-run health evidence only. The active current-run scope
  has one revision-persistence record, one product-evidence signature, and no
  visible likely-real failures.
- The drain scope has no visible likely-real failures and two raw
  product-evidence signatures. Treat those as drain/reporting evidence, not as
  active current-run status.
- The monitor still recommends real-user save/reload, real-user editing, and
  real-user rich-text top-offs, but headroom is `no`, CPU is high, and the
  recommended real-user groups are within recent startup-noise cooldowns.
  Additions should be guarded by startup-stall, supervisor-state,
  materialization, and product-evidence checks rather than raw browser
  concurrency.
- Current active validation still runs on `try/rtc-fix-stack-validation`, not
  on a refreshed final PR stack. It cannot clear filing or final-stack gates.

Current unmet coverage goals remain concentrated in save/reload and real-user
depth:

```text
reload-post-action: 1093/2000
title-save-reload: 549/1000
real-user-editing success: 602/1000
body-save-reload: 608/1000
ui-format-paragraph: 1856/2000
```

The latest trend packet was generated at `2026-05-18T05:25:17Z`:

```text
monitor passes: 2202
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-18T05:23:27Z
coverage files: 272 -> 50113
coverage files delta: 49841
unmet goals: 5
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3439
summary startup failures last: 0
quality issues last: 1
memory free: 415.2 GB
load averages: 65.22 / 61.26 / 68.09 on 64 cores
latest fuzz level mix:
  browser-e2e=27 lanes/27 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5547018
browser-e2e likely-real findings: 693 over 2093.8 runner-hours
latest suggested PR net LOC total: 2152
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. The trend packet's enabled-group snapshot is older
than the raw novelty status above, so use the raw status for current scheduling.
CPU is already high enough that top-offs should be guarded by startup-stall,
supervisor-state, materialization, and product-evidence checks rather than
simply adding browser concurrency.

## Status-Persona Analysis

The newest completed split-persona synthesis,
`pr-split-20260518T052256Z-synthesis.md`, says:

- Overall status is blocked. The consensus split is still the Cycle324/i40
  ungrouped split, but the active source namespace should now use
  `finalized/cycle324-i40/*` from the latest nonzero `20260518T052309Z`
  finalization. It verifies `55/55` rows and adds diagnostic-only
  `DIAG-RELOAD-045607`.
- Filing, final-stack fuzzing, and stack-wide validation remain blocked by
  missing PR07 owner evidence, seed `1020002`, missing exact GitHub refs, no
  fresh bundle/manifest refresh for `052309Z`, and root space below the replay
  threshold.
- Use `20260518T052309Z` if consuming current artifacts; `20260518T051306Z` is
  only the minimum review-consensus fallback source. A fresh refresh must
  produce `push-manifest.tsv`, `base-allowlist.tsv`,
  `head-bundle-manifest-check.tsv`, branch graph, artifact verification,
  root-space evidence, and `report.md`.
- Current PR07 replay evidence is not product evidence unless it reaches
  `collaborationEnabled=true` and writes REST/meta, `_crdt_document`,
  edited-record, Y.Doc/provider/awareness, UI collaborator state, and
  block-tree first-divergence snapshots for `PR07B0`, `PR07B1`,
  `HOLD-07B2`, and `HOLD-07C`.
- Reload/search/rich-text remain diagnostic or held evidence work. Malformed
  save stays downscoped to `PR06E`; HTTP room isolation stays downscoped to
  `PR02A`; harness rows remain harness-only.
- Strict stale projection needs focused owner replay for seeds `5200005` and
  `5200008` before any new product slot. Rich-text/linebreak/parser reductions
  need PR05B/PR05C/clean-PR05D comparison before any `PR18x`.

The latest completed split-action,
`pr-split-20260518T045730Z-feedback-action.md`, says:

- It applied Cycle334 feedback and appended a `Cycle 334 Review Feedback
  Action` section to remote `current-pr-split.md`.
- It completed a non-Docker manifest refresh from `20260518T045301Z` with `54`
  audited rows, `0` failures, bundle `PASS`, base allowlist `PASS`,
  head/bundle/manifest agreement `PASS`, and freshness `PASS`.
- It classified the active Cycle328 PR07 replay as broken-wrapper evidence only:
  wrapper errors, `0` data rows in `replay-runs.tsv`, and no current PR07 owner
  evidence. It wrote a bounded replacement prompt but did not launch browser
  replay.
- It verified all `12` strict stale-projection seed/ref comparison rows still
  target existing `045301Z` Cycle324/i40 refs and wrote the next replay prompt.
- It did not launch final-stack fuzz, GitHub filing, rebuilt validation, raw
  PR07D, PR17, PR18, or PR18x promotion.

No newer split-action file edited product, fuzz, or report files. The
`052256Z` split synthesis is the current decision input, not evidence that the
`052309Z` finalization has been pushed to GitHub or that a fresh manifest job
has already run.

The latest duplicate/noise synthesis with content is
`duplicate-noise-20260518T050842Z-synthesis.md`; the later
`duplicate-noise-20260518T052217Z-synthesis.md` is zero bytes and is ignored.
The `044446Z` feedback-action remains completed control-plane evidence, but
the `050842Z` synthesis says:

- The remaining leak is control-plane scoping, not Codex analysis. Paused or
  no-analysis drain dirs can still be treated as current scheduling evidence by
  novelty policy.
- The smallest safe fix is active-only novelty scheduling: use
  `triageYieldCurrent` for producer/scheduling decisions, keep
  including-paused scope only for reporting, cleanup, gate-only drain
  reconciliation, and product-evidence preservation, and exclude
  paused/no-analysis drain dirs from active producer attribution.
- Bootstrap supervisor group reuse should be filtered through pause/cooldown
  gates instead of returning early.
- This is control-plane hygiene, not product validation or final-stack fuzzing.
  It should preserve product-evidence signatures while avoiding duplicate
  analysis or noisy producer launches.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older "keep
existing split", old PR13 review-ref warnings, old enabled-group claims, and
"do not add PR06B" recommendations are superseded by the repaired PR13 audit
links, current i40 source-family recommendation, ungrouped replacement split,
PR07 setup-only evidence decision, Cycle332/Cycle334 evidence, the `052309Z`
nonzero finalization recommendation, and latest novelty/trend evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| i40 source family | `fresh-prset/iteration-40/*`, `finalized/cycle324-i40/*`, Cycle332/Cycle334 manifest output, `20260518T042251Z/finalization.report.md`, `20260518T045301Z`, latest nonzero `20260518T052309Z`, `DIAG-RELOAD-045607`, and harness rows | active source family; `052309Z` verifies `55/55` rows and supersedes `045301Z`; `051306Z` is only a fallback if current artifacts cannot be consumed | Run root cleanup plus non-Docker manifest/audit refresh from `052309Z`; publish/fetch/audit exact GitHub refs before filing |
| Stale or incomplete publication artifacts | stale local-publish rows, old Cycle293/Cycle306 rows, previous zero-byte reports after they are superseded, `report.tmp`, header-only outputs, stale `045301Z`-only refresh for current filing | no filing evidence; Cycle332/Cycle334 and `045301Z` are useful local evidence but not current GitHub publication; the latest `052309Z` finalization lacks fresh bundle/manifest refresh | Replace stale rows with nonzero report, manifest, bundle, branch graph, range-diff/diffstat/numstat/patch-id, freshness evidence, and verified GitHub refs |
| Missing verified product refs | PR02A, PR05A-D, PR06A-D, PR06E, PR07A1-A3, PR07B0-B1, held PR07B2, held PR07C, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A-D | active rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0-B1, held PR07B2, held PR07C; seeds `5200011`, `5200017`, `5200010`, `7110004`, `7110017`, `1000001`, `1000002`, and relevant `5200008` | existing replay/continuation evidence is setup/runtime-readiness only unless it writes durable rows and snapshots; Cycle334 classified Cycle328 as broken-wrapper evidence, and latest synthesis says root space is below replay threshold again | Recover root space above `2048 MB`, fix wrapper quoting/glob issues and timeouts, stop/replace the broken Cycle328 replay, and rerun one corrected Cycle324 owner replay |
| PR07D | reload/post-save/rejoin residuals | raw PR07D is rejected | Add only if fresh PR07 replay proves red-at-held-PR07C non-coverage with first-divergence evidence |
| PR05D semicolonless entity validation | clean PR05C-adjacent branch `27c6e7924217` | real PR05-family work after PR05C; no verified product branch link yet; rich-text residuals stay diagnostic | Publish/fetch/audit clean PR05D and compare PR05B/PR05C/clean-PR05D before assigning any PR18x owner |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06 and PR06A prior-art refs are verified; active PR06A-D and PR06E have no exact verified links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15D | latest replacement requires the CRDT/data-loss lane from PR06D, not PR07 | Prove `PR06D -> PR09`, `PR07B1 !-> PR09`, held `PR07B2 !-> PR09/PR15D`, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | PR13A plus desired PR13B0/B1/B2/B3 | PR13A has repaired verified link; repaired PR13B/C links are the only verified fallback/supporting PR13 links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing fallback refs |
| PR14B / PR15 placement | PR14B and active PR15A-D after PR14B | branch-link audit verifies PR15A-C component prior art, but no exact PR14B-based PR15A-D refs | Publish/fetch/audit explicit PR14B-based PR15A-D refs and confirm ancestry |
| PR03B browser restoreRevision invalidation | held PR03 sidecar | held until runtime replay distinguishes PR03 from PR03B ownership | Run PR03 vs PR03B after runtime readiness is healthy |
| Strict stale projection owner comparison | `HOLD-STRICT-STALE-PROJECTION-5200005/5200008`; compare `PR11A`, `PR11E`, `PR12C`, `PR13B3`, `PR07B1`, and `HOLD-07C` | Cycle332 setup verified likely-real signals and candidate refs; Cycle334 verified all `12` comparison rows still target existing `045301Z` refs, but this is not a product PR slot | Run focused owner replay for seeds `5200005` and `5200008` before creating any new strict-projection product row |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzz, filing, and rebuilt validation only | Repair or explicitly reclassify before final-stack validation and filing |
| Active deferred sessions | reload-hydration, pre-save search/live-collapse, rich-text suffix, `DIAG-RELOAD-045607`, `HARNESS-WS-URL`, `HARNESS-PLUGIN-STATUS` | active sessions are not progress by themselves; latest split synthesis keeps reload/search/rich-text diagnostic or held; harness rows are not product fixes | Count only nonempty durable reports/artifacts, audited harness refs, or a clear downscope/promotion decision |
| Reload hydration, rich-text suffix, malformed-save residuals, HTTP room isolation | diagnostic/deferred families, including plugin-status harness sidecar and `DIAG-RELOAD-045607` | evidence-only unless a focused owner replay proves otherwise; reload/plugin-status work remains harness-sidecar material unless ownership evidence changes; malformed-save is `PR06E` and HTTP room isolation is `PR02A` | Queue/publish harness sidecars separately, rerun targeted reload/revision shards, and keep these out of product PR rows until ownership evidence is refreshed |
| Duplicate/noise producer churn | strict no-product startup stalls, same-profile relaunch, novelty replacement/bootstrap cooldowns, paused/no-analysis drain scoping | bounded `044446Z` producer-control fix implemented and validated; `050842Z` synthesis still finds a scheduling leak where drain dirs can influence active novelty policy | Patch active-only novelty scheduling/producer attribution, preserve including-paused scope only for reporting/cleanup/product-evidence preservation, and do not treat control-plane fixes as product validation |
| Current fuzz validation | `run-20260518T052348Z`, raw novelty through `2026-05-18T05:30:50.064Z`, trend through `2026-05-18T05:25:17Z` | active current-run scope has `1` revision-persistence record, `1` product-evidence signature, and `0` visible likely-real failures; trend shows fuzz/control-plane health, not final-stack validation | Use refreshed stack product evidence, not broad coverage health or drain-scope signatures, for filing or validation claims |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file i31, i32, i33, i34, i35, i36,
i37, stale i38, stale i39, stale/unpushed i40, Cycle293, Cycle306, Cycle312,
Cycle314, Cycle316, Cycle318, grouped Cycle320/i40, grouped PR06/PR11/PR12/PR15
as active units, `ready/*`, validation-stack, dirty evidence, fallback-tail
branches, raw deferred/candidate refs, PR17, PR18, PR18x, or zero-byte/stale
finalization artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the latest nonzero Cycle324/i40 source family from `20260518T052309Z`,
   but keep the active rows in this report and treat `DIAG-RELOAD-045607` as
   diagnostic-only.
2. Run root cleanup plus a fresh non-Docker manifest/audit refresh from
   `20260518T052309Z`. Fall back to `20260518T051306Z` only if the current
   `052309Z` artifacts cannot be consumed. Outputs must include
   `push-manifest.tsv`, `manifest-age.tsv`, `base-allowlist.tsv`,
   `head-bundle-manifest-check.tsv`, bundle verification, branch graph,
   artifact verification, deferred-output audit, root free-space evidence, and
   `report.md`.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
4. Treat Cycle324/Cycle326/Cycle330/Cycle332/Cycle334 and their local manifest
   or finalization evidence as source/local-audit context only. They are not a
   GitHub push, and they do not clear PR07 owner, seed-`1020002`, exact
   branch-link, deferred-freshness, harness publication, latest-finalization
   freshness, or final-stack validation gates.
5. Treat any zero-byte report, stale manifest, setup-only matrix, wait-only
   feedback, active-session-only status, or disk-preflight-only report as no
   evidence.
6. Recover root space above `2048 MB`, repair PR07 wrapper quoting/glob issues
   and setup timeouts, stop/replace the broken Cycle328 PR07 replay if still
   active, then run one current Cycle324 owner replay over `PR07B0`, `PR07B1`,
   `HOLD-07B2`, and `HOLD-07C` with the required REST/meta, `_crdt_document`,
   edited-record, Y.Doc/provider, awareness, and block-tree first-divergence
   artifacts.
7. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`,
   `PR07B1 !-> PR09`, held `PR07B2 !-> PR09/PR15D`, clean PR05D only,
   PR15A-D after PR14B, and no fallback-tail PR05D.
8. Run the held strict stale-projection owner replay for `5200005` and
   `5200008` before creating any new strict-projection product row.
9. Until PR13B0/B1/B2/B3 have verified branch links, use only the repaired
   PR13A/B/C audit links listed above for current PR13 content/fallback
   evidence.
10. Keep old aggregate or stale prior art, broad PR08, dirty evidence branches,
   stale/misordered PR13 refs, fallback-tail PR15/PR05D confusion, and the
   untracked reload-hydration gate spec out of filing branches and push
   allow-lists.
11. Keep the progress gate behavior verified by Cycle332 and reinforced by the
   latest synthesis: active sessions, active/terminal `1020002`, zero-byte
   artifacts, `report.tmp`, stale manifests, stale-wrapper replays,
   disk/runtime-preflight-only reports, setup-only PR07 matrices,
   `runtime-readiness-blocked` rows, and stderr growth are not durable progress
   while actionable rows exist.
12. Treat duplicate/noise fixes as control-plane hygiene only. The next
   duplicate/noise patch should make novelty scheduling active-only while
   preserving including-paused drain scope for reporting and product evidence;
   this is not product validation or final-stack fuzzing.
13. After PR07 owner evidence and seed `1020002` clear, rebuild the combined
   validation stack from the explicit Cycle324 i40 heads, then run focused
   checks, touched-file lint, branch graph/containment evidence, adjacent
   range-diffs/diffstats/numstats, `git diff --check`, feasible runtime checks,
   and fresh stack-wide validation.

The next useful bounded jobs are:

- `root-cleanup-and-current-cycle324-i40-manifest-audit-refresh`
- `current-cycle324-pr07-owner-replay-with-snapshots`
- `strict-stale-owner-matrix-replay-5200005-5200008`
- active-only novelty scheduling / producer-attribution control-plane patch

Do not launch broad final-stack fuzz, a duplicate broad/final-stack seed
`1020002` job outside focused diagnostic replay, raw PR07D, PR17, PR18, or
PR18x promotion.
