# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-18T06:35:34Z`

Trigger event:
`pr-split-2026-05-18T06-33-34Z-20260518T062127Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-18T06-33-34Z-20260518T062127Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The newest completed split-persona synthesis is
`pr-split-20260518T062127Z-synthesis.md`. It changes the prior recommendation
again: keep the Cycle324/i40 ungrouped topology as the base, but replace the
Cycle338 `HOLD-07EPOCH-SYNC` / candidate `PR07B2` wording with a runtime-gated
`PR07B1A` row after `PR07B1`. The row is the stale sync-manager entity epoch
guard from the `20260518T061324Z` Cycle324/i40 ungrouped split:
`finalized/cycle324-i40/runtime-gated/rtc-pr07b1a-stale-sync-manager-entity-epochs`.
It is one commit and two files, and is review-shaped, but it is still
runtime-gated and has no verified branch link in the current audit.

The rest of the ungrouped topology stays in force: `PR06A-E`, `PR11A-E`,
`PR12A-C`, `PR13A/B0/B1/B2/B3`, `PR14B`, and `PR15A-D` remain the active
source-family shape. Grouped `PR06`, `PR11`, `PR12`, and `PR15` remain inactive
review units, and raw `PR07D`, `PR17`, `PR18`, and `PR18x` remain rejected.
The late `20260518T062326Z` artifact reportedly filled in after initially being
zero bytes and aliases the epoch guard as `PR07B2`; treat that as post-review
input requiring an explicit freshness, allowlist, and naming audit. It does not
silently override the six-report `PR07B1A` consensus.

Filing, broad final-stack fuzzing, and rebuilt stack-wide validation remain
blocked. The live blockers are missing PR07 owner evidence, strict same-user
reload witnesses for `PR07B1A`, seed `1020002`, missing exact GitHub refs for
many active rows, and a fresh final-stack manifest/bundle/head audit newer than
the accepted PR07 epoch row. Root space must still be rechecked above the
`2048 MB` replay threshold before Docker/browser replay.

Important status changes since the prior report:

- Cycle332, Cycle334, and Cycle336 remain real completed local evidence.
  Cycle332 refreshed manifest/audit data from `20260518T042251Z`, repaired the
  loop progress gate, and set up strict stale-projection owner comparisons.
  Cycle334 refreshed manifest/audit data from `20260518T045301Z` with `54`
  audited rows and classified the Cycle328 PR07 replay as broken-wrapper
  evidence only. Cycle336 consumed the now-nonzero `053312Z` handoff, recovered
  root space, verified `57` manifest/audit rows, and produced an empty
  head/bundle/manifest mismatch set. These are local handoff/audit facts, not
  GitHub filing evidence.
- The latest split synthesis replaces the Cycle338 epoch-candidate wording with
  `PR07B1A` after `PR07B1`. `HOLD-07B2` and `HOLD-07C` stay held as siblings
  off `PR07B1`. Do not file `PR07B1A` or any PR07 epoch alias until strict
  same-user reload witnesses and corrected PR07 owner replay pass.
- The branch-link audit generated at `2026-05-18T06:35:34Z` verifies PR01,
  PR02, PR03, PR04, aggregate PR05, aggregate PR06, PR06A prior art, aggregate
  PR07A/PR07B, PR08 prior art, PR09, PR10, aggregate PR11, aggregate PR12,
  repaired PR13A/B/C, PR14, and PR15A-C component refs. It still does not
  verify the exact active i40 sub-PR refs for PR02A, PR05A-D, PR06A-D, PR06E,
  PR07A1-A3, PR07B0-B1, `PR07B1A`, PR11A-E, PR12A-C,
  PR13B0-B3, PR14B, or PR15D.
- Current active-run fuzz status remains health/control-plane evidence only,
  not final-stack validation. The latest raw novelty monitor at
  `2026-05-18T06:35:24.432Z` for `run-20260518T062837Z` shows `50599`
  coverage files, `79685` total records, `5` unmet goals, `0` active
  current-run triage roots/signatures, `2` drain-only raw no-product startup
  signatures, `0` likely-real visible, `0` current duplicate share, and
  `0.3436` historical duplicate share.
- The newest duplicate/noise synthesis and feedback action are
  `duplicate-noise-20260518T060527Z-synthesis.md` and
  `duplicate-noise-20260518T060527Z-feedback-action.md`. They completed a
  fuzzer-side control-plane fix, not a product fix: strict no-product
  `pre_action_bootstrap_stall` drains now require source product evidence to
  stay in downstream analysis, `node --check` passed for the changed scripts,
  current/prior live-analysis one-shot checks skipped no-product startup drains,
  and the active coverage-guided novelty/analysis/supervisor sessions are
  aligned on `run-20260518T062837Z`.

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
-> PR07B1A
(keep old HOLD-07B2 and HOLD-07C held as siblings off PR07B1; no raw PR07D)

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
HARNESS-WS-BOOTSTRAP-051619
```

Diagnostic/evidence-only rows:

```text
DIAG-RELOAD-045607
DIAG-RICH-TEXT-051616
```

Hard blockers remain:

- Do not file GitHub PRs, launch broad final-stack fuzz, or claim rebuilt
  stack-wide validation yet.
- Publish, fetch, and audit exact product refs for every active row that says
  `No verified branch link yet`.
- After the PR07B1A freshness/allowlist/naming audit is resolved, run a
  non-Docker manifest/audit refresh from a final stack newer than that row,
  including bundle verification and empty head/bundle/manifest mismatch files.
- Recheck `/` above the `2048 MB` replay threshold immediately before
  Docker/browser replay.
- Classify and stop/replace the broken Cycle328 PR07 replay; fix wrapper
  quoting/glob issues and add timeouts around `wp-env` setup.
- Run a fresh PR07B1A manifest/bundle/branch audit, producing branch graph,
  range-diff/patch-id, diffstat, base allowlist, manifest/bundle/head
  agreement, empty mismatch files, focused `packages/sync/src/test/manager.ts`,
  prettier, touched-file lint, and `git diff --check`.
- Run one corrected PR07 owner replay over `PR07B0`, `PR07B1`, `PR07B1A`,
  `HOLD-07B2`, and `HOLD-07C`, with
  `collaborationEnabled=true`, REST/meta, `_crdt_document`, edited record,
  Y.Doc/provider/awareness, UI collaborator state, block-tree first-divergence
  snapshots, and per-step `wp-env run cli` timeouts. The current synthesis
  calls out `5200013`, `5200020`, and `5200024` for PR07B1A replay.
- Run the strict stale-projection owner replay for seeds `5200005` and
  `5200008` against `PR11A`, `PR11E`, `PR12C`, `PR13B3`, `PR07B1`, `PR07B1A`,
  and `HOLD-07C`.
- Keep stale Cycle293/Cycle306/local-publish rows, fallback-tail PR05D, raw
  PR07D, PR17, PR18, PR18x, active-session-only status, setup-only output,
  disk-preflight-only output, header-only TSVs, `report.tmp`, and zero-byte
  reports out of filing evidence.

## Branch And Ref Status

Remote status was collected at `2026-05-18T06:35:25Z`.

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

The branch-link audit was generated at `2026-05-18T06:35:34Z` from fetched
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
| PR 7B1 | Save response manager/base-record owner microhead | No verified branch link yet | TBD | TBD | active i40 row; old holds stay siblings from here |
| PR 7B1A | Stale sync-manager entity epoch guard | No verified branch link yet | TBD | TBD | runtime-gated Cycle324/i40 row after PR07B1; one commit/two files, but still needs strict same-user reload witnesses and corrected owner replay |

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
| HOLD-07B2 | Save response terminal manager/base-record microhead | No verified branch link yet | still held as a sibling off PR07B1; do not relabel from the late PR07B2 alias without explicit freshness/allowlist/naming audit |
| HOLD-07C | Save response/reload sibling evidence after PR07B1 | No verified branch link yet | held until owner replay proves coverage and distinctness; raw PR07D remains rejected |
| HOLD-STRICT-STALE-PROJECTION-5200005/5200008 | Strict stale projection/reload owner comparison against earlier plausible owners | No verified branch link yet | held comparison lane only; not a product PR slot |
| HARNESS-WS-URL | WebSocket/reload harness URL evidence | No verified branch link yet | harness-only row; not a product fix |
| HARNESS-PLUGIN-STATUS | Plugin status JSON stall/retry harness sidecar | No verified branch link yet | harness-only row; queue separately from product PRs |
| HARNESS-WS-BOOTSTRAP-051619 | WebSocket bootstrap harness guard | No verified branch link yet | harness-only row from the latest 57-row handoff; not a product fix |
| DIAG-RELOAD-045607 | Reload diagnostic row from latest nonzero Cycle324/i40 finalization | No verified branch link yet | diagnostic/evidence-only row; not a product PR slot |
| DIAG-RICH-TEXT-051616 | Rich-text suffix instrumentation row | No verified branch link yet | diagnostic/test-only row from the latest 57-row handoff; not a product PR slot |
| PR 5 aggregate | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | verified prior art, not the active PR05A-D split |
| PR 6 aggregate | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | verified aggregate prior art; replaced by active PR06A-D recommendation |
| PR 6A prior art | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | verified prior art; do not confuse with active PR06A-D payload split |
| PR 7A aggregate | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | verified prior art, not the active PR07A1-A3 split |
| PR 7B aggregate | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified prior art, not the active PR07B0-B1 plus PR07B1A split |
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
collected_at_utc: 2026-05-18T06:35:25Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T062837Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The raw `novelty-status.md` for this update was written at
`2026-05-18T06:35:24.432Z` for `run-20260518T062837Z`:

```text
coverage files: 50599
total records seen: 79685
records processed this pass: 213
current-run active dirs: 0
active current triage roots/signatures: 0 / 0
current drain triage roots/raw signatures: 2 / 2
raw drain family: pre_action_bootstrap_stall
suppressed strict startup records in drain: 4
unmet goals: 5
recommended groups:
  novelty-ws-real-user-save-reload
  novelty-ws-real-user-editing
  novelty-ws-real-user-rich-text
enabled groups:
  novelty-ws-revision-recovery
```

Interpretation:

- This is a completed novelty pass, but it is still current-run
  health/control-plane evidence only. It is not final-stack validation and it
  does not clear PR07, seed `1020002`, or branch-link gates.
- The completed `060527Z` duplicate/noise feedback action gives the latest
  control-plane check: strict no-product startup drains carry source
  product-evidence metadata, downstream preservation requires source product
  evidence, no-product startup drains were skipped in current and prior
  live-analysis one-shot checks, and the coverage-guided novelty, analysis,
  and supervisor sessions are aligned on `run-20260518T062837Z`.
- The remaining duplicate/noise risk is long-window behavior after this
  control-plane patch. The current root is young, so the latest evidence is a
  gate/consumer-path validation, not a duplicate-ratio proof and not product
  validation.
- Current active validation still runs on `try/rtc-fix-stack-validation`, not
  on a refreshed final PR stack. It cannot clear filing or final-stack gates.

Current unmet coverage goals remain concentrated in save/reload and real-user
depth:

```text
reload-post-action: 1094/2000
title-save-reload: 550/1000
real-user-editing success: 602/1000
body-save-reload: 609/1000
ui-format-paragraph: 1875/2000
```

The latest trend packet was generated at `2026-05-18T06:23:51Z`:

```text
monitor passes: 2210
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-18T06:20:40Z
coverage files: 272 -> 50511
coverage files delta: 50239
unmet goals: 5
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3437
summary startup failures last: 0
quality issues last: 0
memory free: 409.1 GB
load averages: 65.17 / 71.1 / 73.14 on 64 cores
latest fuzz level mix:
  browser-e2e=27 lanes/27 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5570387
browser-e2e likely-real findings: 704 over 2122.9 runner-hours
latest suggested PR net LOC total: 2152
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. The trend packet predates the `06:35` monitor refresh,
so prefer the raw novelty monitor for current enabled/paused group state. CPU
is already high enough that top-offs should be guarded by
startup-stall, supervisor-state, materialization, and product-evidence checks
rather than simply adding browser concurrency.

## Status-Persona Analysis

The newest completed split-persona synthesis,
`pr-split-20260518T062127Z-synthesis.md`, says:

- Overall status needs a split change. The Cycle324/i40 ungrouped topology
  remains the right base, but replace Cycle338's `HOLD-07EPOCH-SYNC` /
  candidate `PR07B2` wording with `PR07B1A` after `PR07B1`.
- The current PR07 lane is:
  `PR07A1 -> PR07A2 -> PR07A3 -> PR07B0 -> PR07B1 -> PR07B1A`.
  `HOLD-07B2` and `HOLD-07C` remain held siblings off `PR07B1`.
- `PR07B1A` is one commit/two files and review-shaped, but still runtime-gated.
  Do not file it until strict same-user reload witnesses and corrected PR07
  owner replay pass.
- The late `20260518T062326Z` artifact reportedly filled in and aliases the
  epoch guard as `PR07B2`, but this is post-review input. It needs explicit
  freshness, allowlist, and naming audit before it can supersede `PR07B1A`.
- PR07 owner evidence and seed `1020002` still block final-stack fuzzing,
  GitHub filing, and rebuilt stack-wide validation only. Independent manifest
  and branch audit, corrected PR07 owner replay, strict stale owner comparison,
  branch linking, deferred downscope, and loop repair should continue.
- Keep diagnostics/support out of product PRs. Reload/search/rich-text/strict
  stale rows stay diagnostic or owner-comparison work. `PR05D` is the clean
  semicolonless entity validation fix only. `PR06E` covers malformed save
  payload. `PR02A` covers HTTP room isolation.
- Drop or reject as filing sources: grouped `PR06`, `PR11`, `PR12`, `PR15`;
  stale Cycle293/Cycle306/local-publish rows; fallback-tail `PR05D`;
  `d06e3528cbd`; `fix/rtc-fallback-group-delete-stale-local`; raw `PR07D`;
  `PR17`; `PR18`; and `PR18x`.
- The bounded independent work is now: refresh manifest/bundle audit newer than
  the deferred reports; recover root space above the replay threshold before
  browser replay; stop/replace the broken PR07 wrapper; run PR07 replay over
  `PR07B0`, `PR07B1`, `PR07B1A`, `HOLD-07B2`, and `HOLD-07C` for seeds
  `5200013`, `5200020`, and `5200024`; run a separate `1030002` HTTP
  route-disappearance diagnostic; and enforce the loop rule that active
  `1020002`, zero-byte reports, stale manifests, disk-preflight-only output,
  prompt-only artifacts, and broken active sessions do not satisfy progress.

The latest completed split-action,
`pr-split-20260518T060230Z-feedback-action.md`, says:

- It updated `current-pr-split.md` with the Cycle338 consensus at the time:
  Cycle324/i40 ungrouped topology plus a held stale sync-manager entity epoch
  candidate from `de083fcfb82`.
- It rejected raw `PR07D`, grouped PR rows, fallback-tail `PR05D`, `PR17`,
  `PR18`, and `PR18x` as current filing sources.
- It treated `055317Z` as the latest nonzero finalization and `060321Z` as
  zero-byte/non-evidence.
- It launched a bounded PR07 epoch restack/audit job. The observed result was
  `restack-conflict`, confined to `packages/sync/src/test/manager.ts`, while
  `packages/sync/src/manager.ts` merged as modified.

The `062127Z` split synthesis supersedes the `060230Z` PR07B2/HOLD naming. It
is not evidence that `PR07B1A` has strict same-user reload witnesses, that any
late PR07B2 alias has passed freshness/allowlist/naming audit, or that PR07
owner evidence / seed `1020002` have cleared.

The latest duplicate/noise synthesis with content is
`duplicate-noise-20260518T060527Z-synthesis.md`. It says:

- The remaining duplicate/noise issue is producer/control-plane leakage, not
  primarily analysis-tier leakage.
- Strict no-product `pre_action_bootstrap_stall` records are generally
  suppressed before Codex analysis, but the novelty/supervisor loop can still
  repeatedly produce the same startup noise through recommendations, bootstrap
  fallback, materialization-floor replacement, cooldown mismatch, or stale
  current-run accounting.
- The smallest safe fix is a hard current-run/group-level quarantine for strict
  no-product pre-action bootstrap stalls, while preserving source product
  evidence failures.

The matching completed feedback action,
`duplicate-noise-20260518T060527Z-feedback-action.md`, reports that the
bounded fuzzer-side fix was applied. No product code was touched:

- Novelty monitor now treats supervisor-active run dirs as authoritative and
  writes strict startup no-analysis sentinels with no-product/product-evidence
  metadata.
- Supervisor writes startup-stall sentinels with `noProductOnly`,
  `productEvidenceRecords`, `hasProductEvidence`, and `expiresAt`.
- Triage watcher, analysis tier, deep-analysis tier, and live-analysis monitor
  now preserve no-analysis drains only when source product evidence exists.
- `node --check` passed for all six changed `.mjs` files.
- Live-analysis one-shot checks on prior root `run-20260518T060222Z` and
  current root `run-20260518T062837Z` skipped no-product startup drains as
  gate-only / no-actionable-signature work.
- Stale orphan novelty monitor for `run-20260518T060222Z` was killed, and
  `rtc-coverage-guided-novelty`, `rtc-coverage-guided-analysis`, and
  `rtc-coverage-guided-supervisor` are aligned on
  `run-20260518T062837Z`.

This completed feedback action supersedes the earlier "next duplicate/noise
patch" recommendation. It does not supersede PR07 owner evidence, seed
`1020002`, branch-link, final-stack validation, or product fuzz gates.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older "keep
existing split", old PR13 review-ref warnings, old enabled-group claims, and
"do not add PR06B" recommendations are superseded by the repaired PR13 audit
links, current i40 source-family recommendation, ungrouped replacement split,
PR07 setup-only evidence decision, Cycle332/Cycle334/Cycle336 evidence, the
`PR07B1A` consensus in the `062127Z` split synthesis, and latest
novelty/trend/control-plane evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| i40 source family | `fresh-prset/iteration-40/*`, `finalized/cycle324-i40/*`, Cycle332/Cycle334/Cycle336 manifest output, `20260518T042251Z/finalization.report.md`, `20260518T045301Z`, `20260518T053312Z`, `20260518T055317Z`, `20260518T061324Z`, late `20260518T062326Z`, `DIAG-RELOAD-045607`, `DIAG-RICH-TEXT-051616`, and harness rows | active source family; latest split consensus uses the `061324Z` Cycle324/i40 ungrouped shape plus runtime-gated `PR07B1A`; late `062326Z` PR07B2 alias needs freshness/allowlist/naming audit before it can supersede that consensus | Regenerate manifest/bundle/head evidence from a final stack newer than accepted `PR07B1A` before filing |
| Stale or incomplete publication artifacts | stale local-publish rows, old Cycle293/Cycle306 rows, previous zero-byte reports after they are superseded, `report.tmp`, header-only outputs, stale `045301Z`-only refresh for current filing, zero-byte or initially zero-byte finalization artifacts | no filing evidence; Cycle332/Cycle334/Cycle336 are useful local evidence but not current GitHub publication; late artifacts that alias PR07B1A as PR07B2 need explicit audit | Replace stale rows with nonzero report, manifest, bundle, branch graph, range-diff/diffstat/numstat/patch-id, freshness evidence, and verified GitHub refs |
| Missing verified product refs | PR02A, PR05A-D, PR06A-D, PR06E, PR07A1-A3, PR07B0-B1, PR07B1A, old `HOLD-07B2`, `HOLD-07C`, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A-D | active rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0-B1, PR07B1A, old `HOLD-07B2`, `HOLD-07C`; current replay seeds `5200013`, `5200020`, and `5200024` plus prior owner-replay seeds as needed | existing replay/continuation evidence is setup/runtime-readiness only unless it writes durable rows and snapshots; Cycle334 classified Cycle328 as broken-wrapper evidence, Cycle336 classified it as `broken-wrapper-still-active`; PR07B1A is review-shaped but runtime-gated | Recheck root space above `2048 MB`, fix wrapper quoting/glob issues and timeouts, stop/replace the broken Cycle328 replay, and rerun one corrected Cycle324 owner replay including PR07B1A |
| PR07D | reload/post-save/rejoin residuals | raw PR07D is rejected | Add only if fresh PR07 replay proves red-at-`HOLD-07C` non-coverage with first-divergence evidence |
| PR05D semicolonless entity validation | clean PR05C-adjacent branch `27c6e7924217` | real PR05-family work after PR05C; no verified product branch link yet; rich-text residuals stay diagnostic | Publish/fetch/audit clean PR05D and compare PR05B/PR05C/clean-PR05D before assigning any PR18x owner |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06 and PR06A prior-art refs are verified; active PR06A-D and PR06E have no exact verified links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15D | latest replacement requires the CRDT/data-loss lane from PR06D, not PR07 | Prove `PR06D -> PR09`, `PR07B1 !-> PR09`, `PR07B1A !-> PR09` where required, old `HOLD-07B2 !-> PR09/PR15D`, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | PR13A plus desired PR13B0/B1/B2/B3 | PR13A has repaired verified link; repaired PR13B/C links are the only verified fallback/supporting PR13 links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing fallback refs |
| PR14B / PR15 placement | PR14B and active PR15A-D after PR14B | branch-link audit verifies PR15A-C component prior art, but no exact PR14B-based PR15A-D refs | Publish/fetch/audit explicit PR14B-based PR15A-D refs and confirm ancestry |
| PR03B browser restoreRevision invalidation | held PR03 sidecar | held until runtime replay distinguishes PR03 from PR03B ownership | Run PR03 vs PR03B after runtime readiness is healthy |
| Strict stale projection owner comparison | `HOLD-STRICT-STALE-PROJECTION-5200005/5200008`; compare `PR11A`, `PR11E`, `PR12C`, `PR13B3`, `PR07B1`, `PR07B1A`, and `HOLD-07C` | Cycle332 setup verified likely-real signals and candidate refs; Cycle334 verified all `12` comparison rows still target existing `045301Z` refs, but this is not a product PR slot and now needs PR07B1A in the matrix | Run focused owner replay for seeds `5200005` and `5200008` before creating any new strict-projection product row |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzz, filing, and rebuilt validation only | Repair or explicitly reclassify before final-stack validation and filing |
| Active deferred sessions | reload-hydration, pre-save search/live-collapse, rich-text suffix, `DIAG-RELOAD-045607`, `DIAG-RICH-TEXT-051616`, `HARNESS-WS-URL`, `HARNESS-PLUGIN-STATUS`, `HARNESS-WS-BOOTSTRAP-051619` | active sessions are not progress by themselves; latest split synthesis keeps reload/search/rich-text diagnostic or held; harness rows are not product fixes | Count only nonempty durable reports/artifacts, audited harness refs, or a clear downscope/promotion decision |
| Reload hydration, rich-text suffix, malformed-save residuals, HTTP room isolation | diagnostic/deferred families, including plugin-status/bootstrap harness sidecars, `DIAG-RELOAD-045607`, and `DIAG-RICH-TEXT-051616` | evidence-only unless a focused owner replay proves otherwise; reload/plugin/bootstrap work remains harness or diagnostic material unless ownership evidence changes; malformed-save is `PR06E` and HTTP room isolation is `PR02A` | Queue/publish harness sidecars separately, rerun targeted reload/revision shards, and keep these out of product PR rows until ownership evidence is refreshed |
| Duplicate/noise producer churn | strict no-product startup stalls, same-profile relaunch, novelty replacement/bootstrap cooldowns, paused/no-analysis drain scoping | bounded `060527Z` fuzzer-side control-plane fix implemented and validated with `node --check` plus prior/current live-analysis one-shot checks; current sessions align on `run-20260518T062837Z` | Monitor long-window behavior and preserve product-evidence visibility; do not treat control-plane fixes as product validation |
| Current fuzz validation | `run-20260518T062837Z`, raw novelty pass through `2026-05-18T06:35:24.432Z`, trend through `2026-05-18T06:23:51Z`, and `060527Z` post-fix action evidence | raw novelty shows `50599` coverage files, `79685` records, `5` unmet goals, active current triage `0`, drain-only raw startup signatures `2`, current duplicate share `0`, historical duplicate share `0.3436`, and browser-e2e as the only confirmed likely-real level; this is fuzz/control-plane health, not final-stack validation | Use refreshed stack product evidence, not broad coverage health or drain-scope signatures, for filing or validation claims |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file i31, i32, i33, i34, i35, i36,
i37, stale i38, stale i39, stale/unpushed i40, Cycle293, Cycle306, Cycle312,
Cycle314, Cycle316, Cycle318, grouped Cycle320/i40, grouped PR06/PR11/PR12/PR15
as active units, `ready/*`, validation-stack, dirty evidence, fallback-tail
branches, raw deferred/candidate refs, PR17, PR18, PR18x, or zero-byte/stale
finalization artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the Cycle324/i40 ungrouped source family as the base, but treat
   `PR07B1A` as the current runtime-gated epoch row after `PR07B1`. Treat
   late `PR07B2` aliases as unaudited naming/freshness input, and treat
   `DIAG-RELOAD-045607` and `DIAG-RICH-TEXT-051616` as diagnostic-only.
2. Run a fresh non-Docker manifest/audit refresh from a final stack newer than
   the accepted `PR07B1A`. Outputs must include `push-manifest.tsv`,
   `manifest-age.tsv`, `base-allowlist.tsv`, `head-bundle-manifest-check.tsv`,
   bundle verification, branch graph, artifact verification,
   deferred-output audit, root free-space evidence, and `report.md`.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
4. Treat Cycle324/Cycle326/Cycle330/Cycle332/Cycle334/Cycle336 and their local
   manifest or finalization evidence as source/local-audit context only. They
   are not a GitHub push, and they do not clear PR07 owner, PR07B1A
   freshness/naming audit, seed-`1020002`, exact branch-link,
   deferred-freshness, harness publication, latest-finalization freshness, or
   final-stack validation gates.
5. Treat any zero-byte report, stale manifest, setup-only matrix, wait-only
   feedback, active-session-only status, or disk-preflight-only report as no
   evidence.
6. Recheck root space above `2048 MB`, repair PR07 wrapper quoting/glob issues
   and setup timeouts, stop/replace the broken Cycle328 PR07 replay if still
   active, then run one current Cycle324 owner replay over `PR07B0`, `PR07B1`,
   `PR07B1A`, `HOLD-07B2`, and `HOLD-07C` with the required
   REST/meta, `_crdt_document`, edited-record, Y.Doc/provider, awareness, UI
   collaborator state, and block-tree first-divergence artifacts.
7. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`,
   `PR07B1 !-> PR09`, `PR07B1A !-> PR09` where required, old
   `HOLD-07B2 !-> PR09/PR15D`, clean PR05D only, PR15A-D after PR14B, and no
   fallback-tail PR05D.
8. Run the held strict stale-projection owner replay for `5200005` and
   `5200008` against `PR11A`, `PR11E`, `PR12C`, `PR13B3`, `PR07B1`,
   `PR07B1A`, and `HOLD-07C` before creating any new strict-projection product
   row.
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
12. Treat duplicate/noise fixes as control-plane hygiene only. The
   `060527Z` feedback action applied the fuzzer-side startup-noise quarantine,
   passed `node --check`, and verified current/prior live-analysis one-shots
   skipped no-product startup drains while preserving product-evidence paths.
   Keep product evidence visible in every scope, monitor long-window behavior,
   and do not count this as product validation or final-stack fuzzing.
13. After PR07B1A owner evidence lands, any naming alias is audited, and
   seed `1020002` clears, rebuild the combined validation stack from the
   explicit Cycle324 i40 heads plus the accepted epoch work, then run focused
   checks, touched-file lint, branch graph/containment evidence, adjacent
   range-diffs/diffstats/numstats, `git diff --check`, feasible runtime checks,
   and fresh stack-wide validation.

The next useful bounded jobs are:

- `rtc-cycle340-061324-root-cleanup-manifest-bundle-audit`
- `rtc-cycle340-pr07b1a-same-user-reload-owner-replay`
- `rtc-cycle340-http-route-1030002-diagnostic`
- `strict-stale-owner-matrix-replay-5200005-5200008`
- follow-up novelty/control-plane verification only if long-window behavior
  shows startup drain affecting active scheduling or live-analysis launch again

Do not launch broad final-stack fuzz, a duplicate broad/final-stack seed
`1020002` job outside focused diagnostic replay, raw PR07D, PR17, PR18, PR18x
promotion, or extra browser lanes.
