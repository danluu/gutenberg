# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-18T07:18:27Z`

Trigger event:
`pr-split-2026-05-18T07-16-57Z-20260518T070538Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-18T07-16-57Z-20260518T070538Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The newest completed split-persona synthesis is
`pr-split-20260518T070538Z-synthesis.md`. It keeps the Cycle324/i40 ungrouped
topology as the active working hypothesis and keeps exactly one clean
sync-manager epoch guard after `PR07B1`. Normalize that slot as `PR07B1A`,
head `c1d8ca017bce4f43aa89cc0128e45fe5568d74e2`, from the
`20260518T063329Z` finalization:
`finalized/cycle324-i40/runtime-gated/rtc-pr07b1a-stale-sync-manager-entity-epochs`.
The local `PR07B2` epoch ref is only an alias at the same head, not a second
PR, and it must not collide with the existing held `HOLD-07B2` reload-provider
unload guard. `PR07B1A` is review-shaped, but it is still runtime-gated and has
no verified GitHub branch link in the current audit.

The latest synthesis changes the report status, not the core product topology:
`PR06A-E`, `PR11A-E`, `PR12A-C`, `PR13A/B0/B1/B2/B3`, `PR14B`, and
`PR15A-D` remain the active source-family shape. Grouped `PR06`, `PR11`,
`PR12`, and `PR15` remain inactive review units, and raw `PR07D`, `PR17`,
`PR18`, and `PR18x` remain rejected. Add and keep
`DIAG-RELOAD-063159` and `DIAG-RELOAD-064709` as diagnostic-only rows alongside
current search/live-collapse and rich-text diagnostics; they are not product PR
slots.

The completed Cycle340 local `PR07B1A` branch/bundle/manifest audit remains
useful prior evidence: it verified that the `PR07B1A` manifest head, live
branch head, and bundle head all agree at
`c1d8ca017bce4f43aa89cc0128e45fe5568d74e2`; the `PR07B2` alias points to the
same commit; the base allowlist passed; the bundle verified; and listed job
artifacts were nonzero. It did not push to GitHub and is not browser owner
replay evidence. The newest `070538Z` synthesis now says the latest
`070338` / `60`-row manifest also needs a durable non-Docker
bundle/manifest audit before filing, with a nonzero report, bundle,
`manifest-age.tsv`, base allowlist, head/bundle/manifest agreement, and
explicit checks for clean `PR05D`, `PR07B1A`, `DIAG-RELOAD-063159`, and
`DIAG-RELOAD-064709`.

Filing, broad final-stack fuzzing, and rebuilt stack-wide validation remain
blocked. The live blockers are missing PR07 owner evidence, strict same-user
reload witnesses for `PR07B1A` (`5200013`, `5200020`, and `5200024`), seed
`1020002`, the separate `1030002` HTTP route diagnostic, missing exact GitHub
refs for many active rows, a missing durable audit for the newest `60`-row
manifest, and root space below the `2048 MB` Docker/browser replay threshold.
The newest split synthesis observed `/` free space at about `1197 MB`.

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
- The latest split synthesis keeps the `PR07B1A` slot after `PR07B1`, grounded
  in the `20260518T063329Z` finalization at
  `c1d8ca017bce4f43aa89cc0128e45fe5568d74e2`. `HOLD-07B2` and `HOLD-07C`
  stay held as siblings off `PR07B1`. Do not file `PR07B1A` or any PR07 epoch
  alias until strict same-user reload witnesses, corrected PR07 owner replay,
  a verified GitHub branch link, and the `070338` / `60`-row manifest audit
  exist.
- The branch-link audit generated at `2026-05-18T07:18:27Z` verifies PR01,
  PR02, PR03, PR04, aggregate PR05, aggregate PR06, PR06A prior art, aggregate
  PR07A/PR07B, PR08 prior art, PR09, PR10, aggregate PR11, aggregate PR12,
  repaired PR13A/B/C, PR14, and PR15A-C component refs. It still does not
  verify the exact active i40 sub-PR refs for PR02A, PR05A-D, PR06A-D, PR06E,
  PR07A1-A3, PR07B0-B1, `PR07B1A`, PR11A-E, PR12A-C,
  PR13B0-B3, PR14B, or PR15D.
- Current active-run fuzz status remains health/control-plane evidence only,
  not final-stack validation. The latest raw novelty monitor at
  `2026-05-18T07:14:16.403Z` for `run-20260518T064422Z` completed a pass:
  `50881` coverage files, `80407` total records seen, `150` records processed
  this pass, `4` current-run records, no current-run successes recorded in that
  pass, `0` active-scope actionable signatures, `4` family-capped raw
  product-evidence signatures, and `0` active-scope current likely-real visible
  findings. The current-drain scope preserves `1` likely-real visible
  product-evidence representative. Enabled groups are now
  `novelty-ws-common-blocks` and `novelty-ws-block-gauntlet`; many other
  groups remain paused or held. This is still coverage/control-plane evidence
  on `try/rtc-fix-stack-validation`, not final PR-stack validation.
- The newest duplicate/noise synthesis and feedback action are
  `duplicate-noise-20260518T064914Z-synthesis.md` and
  `duplicate-noise-20260518T064914Z-feedback-action.md`. The bounded
  fuzzer-side control-plane fix is now implemented: below-threshold
  zero-product strict startup seed drains enter `paused-startup-stall`
  cooldown instead of recovering/relaunching, and novelty scheduling treats
  `startupStallDrainRecordedUntil` / active startup-drain state as an active
  cooldown. `node --check` passed for the changed supervisor and novelty
  monitor files, the affected control-plane sessions were restarted, and the
  post-restart status at `2026-05-18T07:14:16Z` had no current-run
  pre-action startup failures, no no-product raw signatures in active scope, no
  suppressed strict startup records in active scope, and top duplicate-family
  share `0`. Remaining duplicate pressure is product-evidence
  `reload_rejoin_awareness_stall`, which is visible and family-capped rather
  than suppressed as startup noise.

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
DIAG-RELOAD-063159
DIAG-RELOAD-064709
DIAG-RICH-TEXT-051616
```

Hard blockers remain:

- Do not file GitHub PRs, launch broad final-stack fuzz, or claim rebuilt
  stack-wide validation yet.
- Publish, fetch, and audit exact product refs for every active row that says
  `No verified branch link yet`.
- Treat the completed Cycle340 non-Docker `PR07B1A` branch/bundle/manifest
  audit from the `20260518T063329Z` finalization as local audit evidence only;
  it passed, but it did not publish a GitHub ref, cover the newer `070338` /
  `60`-row manifest, or produce owner replay witnesses.
- Run the bounded non-Docker `070338` bundle/manifest audit before filing:
  nonzero report and bundle, `manifest-age.tsv`, base allowlist,
  head/bundle/manifest agreement, and explicit checks for all `60` rows,
  including clean `PR05D`, `PR07B1A`, `DIAG-RELOAD-063159`, and
  `DIAG-RELOAD-064709`.
- Recheck `/` above the `2048 MB` replay threshold immediately before
  Docker/browser replay; the latest split synthesis observed only about
  `1197 MB` free.
- Classify and stop/replace the broken Cycle328 PR07 replay; fix wrapper
  quoting/glob issues and add timeouts around `wp-env` setup.
- Publish/fetch/audit an exact GitHub PR-content ref for `PR07B1A`; the
  current verified branch-link audit still has no `PR07B1A` branch link.
- Run one corrected PR07 owner replay over `PR07B0`, `PR07B1`, `PR07B1A`,
  `HOLD-07B2`, and `HOLD-07C`, with
  `collaborationEnabled=true`, REST/meta, `_crdt_document`, edited record,
  Y.Doc/provider/awareness, UI collaborator state, block-tree first-divergence
  snapshots, and per-step `wp-env run cli` timeouts. The current synthesis
  calls out `5200013`, `5200020`, and `5200024` for PR07B1A replay.
- Run the separate `1030002` HTTP route-disappearance diagnostic around
  `/wp-sync/v1/updates`, route registration, `_wpCollaborationEnabled`, server
  logs, and polling request/response bodies.
- Run the strict stale-projection owner replay for seeds `5200005` and
  `5200008` against `PR11A`, `PR11E`, `PR12C`, `PR13B3`, `PR07B1`, `PR07B1A`,
  and `HOLD-07C`.
- Keep stale Cycle293/Cycle306/local-publish rows, fallback-tail PR05D, raw
  PR07D, PR17, PR18, PR18x, active-session-only status, setup-only output,
  disk-preflight-only output, header-only TSVs, `report.tmp`, and zero-byte
  reports out of filing evidence.

## Branch And Ref Status

Remote status was collected at `2026-05-18T07:18:19Z`.

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

The branch-link audit was generated at `2026-05-18T07:18:27Z` from fetched
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
| PR 7B1A | Stale sync-manager entity epoch guard | No verified branch link yet | TBD | TBD | runtime-gated Cycle324/i40 row after PR07B1; local head `c1d8ca017bce`; `PR07B2` is only an alias; Cycle340 local audit passed, but strict same-user reload witnesses, corrected owner replay, a verified GitHub branch link, and the newer `070338`/`60`-row manifest audit are still missing |

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
| HOLD-07B2 | Save response terminal manager/base-record microhead | No verified branch link yet | still held as a sibling off PR07B1; do not confuse it with the `PR07B1A` epoch guard or local `PR07B2` alias |
| HOLD-07C | Save response/reload sibling evidence after PR07B1 | No verified branch link yet | held until owner replay proves coverage and distinctness; raw PR07D remains rejected |
| HOLD-STRICT-STALE-PROJECTION-5200005/5200008 | Strict stale projection/reload owner comparison against earlier plausible owners | No verified branch link yet | held comparison lane only; not a product PR slot |
| HARNESS-WS-URL | WebSocket/reload harness URL evidence | No verified branch link yet | harness-only row; not a product fix |
| HARNESS-PLUGIN-STATUS | Plugin status JSON stall/retry harness sidecar | No verified branch link yet | harness-only row; queue separately from product PRs |
| HARNESS-WS-BOOTSTRAP-051619 | WebSocket bootstrap harness guard | No verified branch link yet | harness-only row from an earlier 57-row handoff; not a product fix |
| DIAG-RELOAD-045607 | Reload diagnostic row from latest nonzero Cycle324/i40 finalization | No verified branch link yet | diagnostic/evidence-only row; not a product PR slot |
| DIAG-RELOAD-063159 | Reload diagnostic row from the latest 60-row handoff | No verified branch link yet | diagnostic/evidence-only row; not a product PR slot |
| DIAG-RELOAD-064709 | Reload diagnostic row from the latest 60-row handoff | No verified branch link yet | diagnostic/evidence-only row; not a product PR slot |
| DIAG-RICH-TEXT-051616 | Rich-text suffix instrumentation row | No verified branch link yet | diagnostic/test-only row from an earlier 57-row handoff; not a product PR slot |
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
collected_at_utc: 2026-05-18T07:18:19Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T064422Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The raw `novelty-status.md` for this update was written at
`2026-05-18T07:14:16.403Z` for `run-20260518T064422Z`:

```text
coverage files: 50881
total records seen: 80407
records processed this pass: 150
current-run records: 4
current-run successful records: 0
current-run groups: novelty-ws-parser-serialization=2, novelty-ws-revision-recovery=2
current-run pre-action startup failures: none
active current signatures: 0
active current raw signatures: 4
active current actionable signatures: 0
active current product-evidence signatures: 0
active current raw product-evidence signatures: 4
active-scope current likely-real visible: 0
current-drain-scope likely-real visible: 1
current no-product actionable signatures: 0
current active top duplicate family share: 0
current raw top duplicate family share: 1, family=reload_rejoin_awareness_stall, count=4
current drain top duplicate family share: 1, family=reload_rejoin_awareness_stall, count=1
current drain suppressed strict startup records: 1
historical top duplicate family share: 0.3435
raw historical top duplicate family share: 0.5732
enabled groups: novelty-ws-common-blocks, novelty-ws-block-gauntlet
paused groups include novelty-ws-three-user-late-join, novelty-ws-revision-persistence,
  novelty-ws-revision-recovery, and novelty-ws-parser-serialization
headroom for adding groups: no
health: ok
```

Interpretation:

- The latest current run has a completed monitor pass, but it is still
  active-run health and control-plane evidence only. It does not clear PR07,
  seed `1020002`, branch-link gates, root-space gates, duplicate-ratio
  questions, or final-stack validation.
- Current active scope has no actionable signatures and no visible likely-real
  finding. The raw active signatures are family-capped product-evidence
  `reload_rejoin_awareness_stall` records, and the active-plus-paused drain
  scope preserves one likely-real visible product-evidence representative. The
  active top-duplicate share is `0`; the raw duplicate family is visible
  product-evidence, not no-product startup noise.
- Historical/raw historical duplicate shares remain dominated by old startup
  and session families, especially raw `pre_action_bootstrap_stall`; these are
  useful for scheduler hygiene but must not be presented as live product
  failures.
- The completed `064914Z` feedback action has applied the producer-cooldown
  fix requested by the latest duplicate/noise synthesis. Below-threshold
  strict no-product startup drains now pause/cooldown producers instead of
  allowing immediate recovery/relaunch, novelty scheduling honors the startup
  drain/cooldown, and product-evidence signatures remain visible.
- Current active validation still runs on `try/rtc-fix-stack-validation`, not
  on a refreshed final PR stack. It cannot clear filing or final-stack gates.

Latest raw unmet coverage goals remain concentrated in save/reload and
real-user depth:

```text
reload-post-action: 1095/2000
title-save-reload: 551/1000
real-user-editing success: 602/1000
body-save-reload: 610/1000
ui-format-paragraph: 1885/2000
```

The latest trend packet was generated at `2026-05-18T07:06:48Z`:

```text
monitor passes: 2217
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-18T07:02:50Z
coverage files: 272 -> 50810
coverage files delta: 50538
unmet goals: 5
likely_real_max: 4
duplicate_share_current_last: 1
duplicate_share_historical_last: 0.3436
summary startup failures last: 0
quality issues last: 0
memory free: 405.7 GB
load averages: 74.15 / 81.85 / 78.72 on 64 cores
enabled groups current: blank in trend snapshot
latest fuzz level mix:
  browser-e2e=25 lanes/25 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5587454
browser-e2e likely-real findings: 705 over 2147.2 runner-hours
latest suggested PR net LOC total: 2152
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. CPU is already high enough that top-offs should be
guarded by startup-stall, supervisor-state, materialization, and
product-evidence checks rather than simply adding browser concurrency. The
trend packet predates the `07:14` monitor refresh, so prefer the raw novelty
monitor for current enabled/paused group state.

## Status-Persona Analysis

The newest completed split-persona synthesis,
`pr-split-20260518T070538Z-synthesis.md`, says:

- Overall status is blocked, with a report update required. The consensus
  replacement is still the Cycle324/i40 ungrouped topology with `PR07B1A`
  inserted after `PR07B1`.
- The current PR07 lane is:
  `PR07A1 -> PR07A2 -> PR07A3 -> PR07B0 -> PR07B1 -> PR07B1A`.
  `HOLD-07B2` and `HOLD-07C` remain held siblings off `PR07B1`; raw `PR07D`
  stays rejected.
- The independent CRDT/data-loss lane still starts from `PR06D`:
  `PR09 -> PR10 -> PR11A..PR11E -> PR12A..PR12C -> PR13A ->
  PR13B0..PR13B3 -> PR14 -> PR14B -> PR15A..PR15D`.
- Keep `DIAG-RELOAD-063159`, `DIAG-RELOAD-064709`, current
  search/live-collapse diagnostics, and current rich-text suffix diagnostics
  diagnostic-only. They are not product PR rows.
- Reject grouped `PR06`, `PR11`, `PR12`, and `PR15`; stale
  Cycle293/Cycle306/local-publish rows; fallback-tail `PR05D`;
  `d06e3528cbd`; `fix/rtc-fallback-group-delete-stale-local`; raw deferred
  reload heads; raw `PR07D`; `PR07B2` as a separate PR; `PR17`; `PR18`; and
  `PR18x`. Clean `PR05D` is only
  `27c6e7924217038ed9b4ff71585e8041c67765a4`.
- Do not run broad final-stack fuzzing, GitHub filing, or rebuilt stack-wide
  validation until seed `1020002`, PR07 owner evidence, and the current
  manifest/bundle audit are resolved.

The raw `current-pr-split.md` Cycle340 action remains useful supporting
evidence for `PR07B1A`: it validated `58/58` rows in the `063329Z`
finalization, verified `PR07B1A` at
`c1d8ca017bce4f43aa89cc0128e45fe5568d74e2`, verified that the local `PR07B2`
ref is only an alias, and completed the local non-Docker
`rtc-cycle340-pr07b1a-bundle-manifest-audit` at `2026-05-18T06:54:13Z`. That
audit did not publish GitHub refs, run browser owner replay, or cover the newer
`070338` / `60`-row manifest. The latest synthesis therefore requires one
bounded `rtc-cycle342-070338-bundle-manifest-audit-after-deferred` job with
nonzero report, bundle, `manifest-age.tsv`, base allowlist, and
head/bundle/manifest agreement before filing.

The latest independent split next actions are bounded and parallelizable:
recover `/` above `2048 MB` from the latest observed `1197 MB`; after disk
recovery, run one PR07 owner replay over `PR07B0`, `PR07B1`, `PR07B1A`,
`HOLD-07B2`, and `HOLD-07C` for seeds `5200013`, `5200020`, and `5200024`;
run a separate `1030002` HTTP route-disappearance diagnostic; run strict owner
comparison for revision/reload and rich-text ownership; and keep the controller
loop from treating zero-byte reports, `report.tmp`, stale manifests,
active-session-only status, or disk-preflight-only output as progress.

The latest duplicate/noise synthesis and matching feedback action are
`duplicate-noise-20260518T064914Z-synthesis.md` and
`duplicate-noise-20260518T064914Z-feedback-action.md`. The consensus target was
producer backpressure, and the action completed it without touching product
code:

- `bin/rtc-browser-fuzz-supervisor.mjs` now puts below-threshold zero-product
  strict startup seed drains into `paused-startup-stall` cooldown instead of
  `recovering` relaunch.
- `bin/rtc-browser-fuzz-novelty-monitor.mjs` now treats
  `startupStallDrainRecordedUntil` and active startup-drain state as an active
  startup-noise cooldown.
- `node --check` passed for both changed files.
- The active coverage-guided supervisor and novelty sessions were restarted,
  stale orphan novelty process `4124182` was killed, and fresh sessions were
  running.
- The post-restart status at `2026-05-18T07:14:16Z` had active current dirs
  `2`, no no-product raw signatures in active scope, no suppressed strict
  startup records in active scope, no current-run pre-action startup failures,
  and top duplicate-family share `0`.

Remaining duplicate/noise risk is product-evidence
`reload_rejoin_awareness_stall`. It is visible and family-capped, so it should
not be suppressed as startup noise and should not be counted as product
validation.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older "keep
existing split", old PR13 review-ref warnings, old enabled-group claims, and
"do not add PR06B" recommendations are superseded by the repaired PR13 audit
links, current i40 source-family recommendation, ungrouped replacement split,
PR07 setup-only evidence decision, Cycle332/Cycle334/Cycle336 evidence,
`PR07B1A` consensus, the new `070538Z` requirement for a `60`-row manifest
audit, the completed `064914Z` duplicate/noise remediation, and latest
novelty/trend/control-plane evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| i40 source family | `fresh-prset/iteration-40/*`, `finalized/cycle324-i40/*`, Cycle332/Cycle334/Cycle336 manifest output, `20260518T042251Z`, `20260518T045301Z`, `20260518T053312Z`, `20260518T055317Z`, `20260518T061324Z`, `20260518T063329Z`, completed Cycle340 `PR07B1A` local branch/bundle audit, newest `070338` / `60`-row manifest, `DIAG-RELOAD-045607`, `DIAG-RELOAD-063159`, `DIAG-RELOAD-064709`, `DIAG-RICH-TEXT-051616`, and harness rows | active source family; latest split consensus uses the Cycle324/i40 ungrouped shape plus runtime-gated `PR07B1A` at `c1d8ca017bce`; the local `PR07B2` epoch ref is only an alias, not a second product PR; newest diagnostic reload rows are evidence-only | Run the `070338` / `60`-row audit, publish/fetch/audit a verified GitHub branch link for `PR07B1A`, then clear PR07 runtime owner evidence before filing |
| Stale or incomplete publication artifacts | stale local-publish rows, old Cycle293/Cycle306 rows, previous zero-byte reports after they are superseded, `report.tmp`, header-only outputs, stale `045301Z`-only refresh for current filing, zero-byte or initially zero-byte finalization artifacts, the `2026-05-18T06:45Z` local publish manifest that still lacks `cycle324-i40-pr07b1a-stale-sync-manager-entity-epochs`, and any `070338` / `60`-row manifest without a durable bundle/head/manifest audit | no filing evidence; Cycle332/Cycle334/Cycle336/Cycle340 are useful local evidence but not current GitHub publication; the newest `60`-row manifest still needs nonzero audit artifacts before filing | Replace stale rows with nonzero report, manifest, bundle, branch graph, range-diff/diffstat/numstat/patch-id, freshness evidence, and verified GitHub refs |
| Missing verified product refs | PR02A, PR05A-D, PR06A-D, PR06E, PR07A1-A3, PR07B0-B1, PR07B1A, old `HOLD-07B2`, `HOLD-07C`, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A-D | active rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0-B1, PR07B1A, old `HOLD-07B2`, `HOLD-07C`; current replay seeds `5200013`, `5200020`, and `5200024` plus prior owner-replay seeds as needed | existing replay/continuation evidence is setup/runtime-readiness only unless it writes durable rows and snapshots; Cycle334 classified Cycle328 as broken-wrapper evidence, Cycle336 classified it as `broken-wrapper-still-active`; PR07B1A is review-shaped at `c1d8ca017bce` and Cycle340 local audit passed, but runtime witnesses are still missing; latest root free space is about `1197 MB` | Recover root space above `2048 MB`, fix wrapper quoting/glob issues and timeouts, stop/replace the broken Cycle328 replay, and rerun one corrected Cycle324 owner replay including PR07B1A |
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
| Active deferred sessions | reload-hydration, pre-save search/live-collapse, rich-text suffix, `DIAG-RELOAD-045607`, `DIAG-RELOAD-063159`, `DIAG-RELOAD-064709`, `DIAG-RICH-TEXT-051616`, `HARNESS-WS-URL`, `HARNESS-PLUGIN-STATUS`, `HARNESS-WS-BOOTSTRAP-051619` | active sessions are not progress by themselves; latest split synthesis keeps reload/search/rich-text diagnostic or held; harness rows are not product fixes | Count only nonempty durable reports/artifacts, audited harness refs, or a clear downscope/promotion decision |
| Reload hydration, rich-text suffix, malformed-save residuals, HTTP room isolation | diagnostic/deferred families, including plugin-status/bootstrap harness sidecars, `DIAG-RELOAD-045607`, `DIAG-RELOAD-063159`, `DIAG-RELOAD-064709`, and `DIAG-RICH-TEXT-051616` | evidence-only unless a focused owner replay proves otherwise; reload/plugin/bootstrap work remains harness or diagnostic material unless ownership evidence changes; malformed-save is `PR06E` and HTTP room isolation is `PR02A` | Queue/publish harness sidecars separately, rerun targeted reload/revision shards, and keep these out of product PR rows until ownership evidence is refreshed |
| Duplicate/noise producer churn | strict no-product startup stalls, same-profile relaunch, novelty replacement/bootstrap cooldowns, paused/no-analysis drain scoping | bounded `064914Z` fuzzer-side control-plane fix implemented and validated with `node --check`; strict no-product startup drains now pause/cooldown producers, novelty scheduling honors active startup drains, and active-scope no-product startup noise is absent in the post-restart monitor | Monitor long-window behavior and keep product-evidence `reload_rejoin_awareness_stall` visible/family-capped; do not treat control-plane fixes as product validation |
| Current fuzz validation | `run-20260518T064422Z`, raw novelty pass through `2026-05-18T07:14:16.403Z`, trend generated at `2026-05-18T07:06:48Z`, and completed `064914Z` scheduler/supervisor remediation | latest raw novelty has `50881` coverage files, `80407` records, `4` current-run records, no current-run successes in that pass, `0` active-scope actionable signatures, `4` family-capped raw product-evidence signatures, `0` active-scope current likely-real visible findings, `1` drain-scope likely-real visible representative, and enabled `novelty-ws-common-blocks` / `novelty-ws-block-gauntlet`; browser-e2e remains the only level with confirmed likely-real findings in the trend packet; this is fuzz/control-plane health, not final-stack validation | Use refreshed stack product evidence, not broad coverage health or drain-scope signatures, for filing or validation claims |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file i31, i32, i33, i34, i35, i36,
i37, stale i38, stale i39, stale/unpushed i40, Cycle293, Cycle306, Cycle312,
Cycle314, Cycle316, Cycle318, grouped Cycle320/i40, grouped PR06/PR11/PR12/PR15
as active units, `ready/*`, validation-stack, dirty evidence, fallback-tail
branches, raw deferred/candidate refs, PR17, PR18, PR18x, or zero-byte/stale
finalization artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the Cycle324/i40 ungrouped source family as the base, but treat
   `PR07B1A` at `c1d8ca017bce4f43aa89cc0128e45fe5568d74e2` as the current
   runtime-gated epoch row after `PR07B1`. Treat the local `PR07B2` epoch ref
   as an alias only, and keep `DIAG-RELOAD-045607`,
   `DIAG-RELOAD-063159`, `DIAG-RELOAD-064709`, and
   `DIAG-RICH-TEXT-051616` diagnostic-only.
2. Keep the completed Cycle340 non-Docker manifest/audit refresh from the
   `20260518T063329Z` finalization as local evidence only. It passed
   head/bundle/manifest, alias, base-allowlist, bundle, and artifact checks, but
   it did not push to GitHub, did not create a verified branch-link audit row,
   did not run browser owner replay, and does not cover the newer
   `070338` / `60`-row manifest. Run the bounded `070338` audit before filing.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
4. Treat Cycle324/Cycle326/Cycle330/Cycle332/Cycle334/Cycle336/Cycle340 and
   their local manifest or finalization evidence as source/local-audit context
   only. They are not a GitHub push, and they do not clear PR07 owner,
   seed-`1020002`, exact branch-link, harness publication, runtime replay,
   current `60`-row manifest audit, or final-stack validation gates.
5. Treat any zero-byte report, stale manifest, setup-only matrix, wait-only
   feedback, active-session-only status, or disk-preflight-only report as no
   evidence.
6. Recover and recheck root space above `2048 MB` from the latest observed
   `1197 MB`, repair PR07 wrapper quoting/glob issues
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
12. Treat duplicate/noise fixes as control-plane hygiene only. The completed
   `064914Z` feedback action made no-product strict startup drains
   pause/cooldown producers and made novelty scheduling honor the startup-drain
   cooldown, with `node --check` passing for the changed files and product
   evidence preserved. Monitor long-window behavior, keep product evidence
   visible in every scope, and do not count this as product validation or
   final-stack fuzzing.
13. After PR07B1A owner evidence lands, any naming alias is audited, and
   seed `1020002` clears, rebuild the combined validation stack from the
   explicit Cycle324 i40 heads plus the accepted epoch work, then run focused
   checks, touched-file lint, branch graph/containment evidence, adjacent
   range-diffs/diffstats/numstats, `git diff --check`, feasible runtime checks,
   and fresh stack-wide validation.

The current or next useful bounded jobs are:

- `rtc-cycle342-070338-bundle-manifest-audit-after-deferred`
- root cleanup / free-space recovery above `2048 MB`
- `rtc-cycle342-pr07-owner-and-reload-diagnostics-replay` after disk recovery,
  with exactly one PR07 owner replay and snapshots
- separate `1030002` HTTP route-disappearance diagnostic
- strict owner-comparison job for `5200005` and `5200008`
- long-window monitor check that the completed `064914Z` duplicate/noise
  producer-cooldown fix keeps no-product startup drains out of active scope

Do not launch broad final-stack fuzz, a duplicate broad/final-stack seed
`1020002` job outside focused diagnostic replay, raw PR07D, PR17, PR18, PR18x
promotion, or extra browser lanes.
