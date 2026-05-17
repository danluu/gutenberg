# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T17:39:00Z`

Trigger event:
`pr-split-2026-05-17T17-37-22Z-20260517T172803Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T17-37-22Z-20260517T172803Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing, pushing/opening GitHub PRs, broad final-stack fuzzing, and stack-wide
validation remain blocked by unresolved reload owner replay proof, missing
verified GitHub branch links for several finer product refs, clean local filing
gates, and rebuilt validation. They are not blocked by seed `1020002` alone.
The current working split remains the Cycle 282/Cycle 284/Cycle 286 replacement
PR07 topology. Cycle 286 completed local publication evidence, but that
evidence is now stale against the `2026-05-17T17:34:56Z` deferred queue and is
not final-stack validation:

```text
PR01 -> PR02 (+ PR02A sidecar)
-> PR03 -> PR04 -> PR05A -> PR05B -> PR05C -> PR05D
-> PR06 -> PR06A -> PR07A -> PR07B0 -> PR07B1
-> PR09 -> PR10 -> PR11A-E -> PR12
-> PR13A/B0/B1/B2/B3 -> PR14 -> PR14B
-> PR15A/B/C-on-PR14B
```

Current sidecars and runtime-gated work:

```text
PR02A after PR02: HTTP room-isolation regression
PR03B after PR03: browser restoreRevision CRDT invalidation, runtime-gated
PR06B after PR07B1: repaired malformed-save request-payload sidecar
PR07C after PR07B1: reload record snapshots
validation heads: fetch-only evidence, not product PR links
```

Split details:

- `PR07B0` is saved CRDT response hydration, represented by `e746c32e3f9` and
  deferred evidence commit `72854f05ed2`.
- `PR07B1` is stale base-record/title filtering, represented by current
  `4bdd9465a97`.
- The existing audited `review/rtc-pr07b-save-response-manager-base-record`
  branch is now prior art for the old opaque `PR07B`, not a replacement for
  audited `PR07B0` / `PR07B1` filing branches.

Do not add `PR07D`, `PR17`, `PR18`, or `PR18x` from current evidence. The
Cycle 276 replay classifies `06441205b872` / seed `1100002` as
`covered-by-pr07c`, so `PR07D` remains closed/no-change unless future fresh
evidence proves active `PR07B0` / `PR07B1` / `PR07C` non-coverage. Seed
`1020002` remains terminal/downscoped for product-branch purposes unless
rebuilt validation produces newer product-owned evidence.

Cycle 280 is now prior evidence. It generated a manifest at
`2026-05-17T15:43:25Z`, verified all `34` active manifest rows, harvested
`covered-by-pr07c` for seed `1100002`, kept `PR07D` closed, and left zero queue
rows for `1020002`, `PR17`, stale PR06B/PR07C, split report signals, or `PR18`
/ `PR18x` product work.

Cycle 282 completed the replacement PR07B split/deferred-adoption proof and is
still the active topology evidence. The bounded job emitted nonempty
`branch-audit.tsv`, `push-manifest.tsv`, `manifest-age.tsv`,
`deferred-adoption.tsv`, `stale-row-rejections.tsv`, and artifact verification
at `2026-05-17T16:15:44Z`; it verifies `PR07B0` is an ancestor of `PR07B1`,
rejects stale `ready/*`, raw `deferred/*` filing refs, stale PR06B/PR07C rows,
`PR17` / `1020002`, and `PR18` / `PR18x`, and maps raw reload-hydration
deferred work to active `PR07B0` lineage instead of publishing it as `PR07D`.
Cycle 286 refreshed that local publication evidence after the
`2026-05-17T16:53:16Z` deferred queue. Its manifest-age artifact was generated
at `2026-05-17T17:11:41Z`, all audited rows in `branch-audit.tsv` have
`base-is-ancestor`, and `push-manifest.tsv` includes source refs, source SHAs,
intended `danluu` branches, base refs, base SHAs, diffstats, and validation
evidence. That remains useful topology evidence, but the latest split synthesis
now treats it as stale against the current deferred queue generated at
`2026-05-17T17:34:56Z`. It does not replace the missing `verified-content`
GitHub branch links for finer PR rows, a fresh manifest/audit newer than that
queue, or the remaining owner-replay/final-validation gates.

Cycle 282 also completed the strict/rich-text owner-comparison proof. The
latest split-persona synthesis now maps strict seed `5700084` to
`covered-by-PR05C` from the current non-Docker owner comparison, so it remains
out of `PR18` / `PR18x`. Any remaining parser, linebreak, or rich-text
reduction must compare `PR05B`, `PR05C`, and `PR05D` before any later owner is
allowed.

Cycle 284 did not replace that topology; it made the filing block more
explicit. Cycle 286 consumed the Cycle 284 owner-replay status and completed the
active branch audit / push manifest / deferred-adoption refresh described
above, but that refresh is now stale against the `17:34:56Z` deferred queue.
The latest split-persona synthesis keeps the split blocked and asks for
bounded Cycle 288 work: consume the successful PR07C browser-env preflight, run
one non-`1020002` PR07 live replay with the requested snapshot hook, regenerate
a manifest/audit newer than the `17:34:56Z` deferred queue, and run the
pre-save search/live-collapse replay for seed `961308` / `ddf9559af37e` if
ports/resources are available. The remaining durable progress is reload
residual replay against `PR07B0` / `PR07B1` / `PR07C`, plus publication/fetch/
audit for the finer GitHub-facing product branches that still say
`No verified branch link yet`. The refreshed branch-link audit in this report
verifies available GitHub branch links, including repaired PR13 links, but it is
not by itself final-stack validation.

Independent bounded work can continue in parallel: consume the completed Cycle
286 manifest/audit artifacts as stale-but-useful topology evidence; regenerate
a fresh manifest/audit after the `17:34:56Z` deferred queue; reload residual
owner replay for `5200011`, `5200017`, `5200010`, `7110004`, and `7110017`,
with `7700005` if capacity allows; pre-save search/live-collapse owner
comparison for seed `961308` / `ddf9559af37e`; PR02A/PR05/PR11 shaping; PR05D
publication prep; and PR06B/PR07C sidecar validation. The reload replay should
use the Cycle 284
`next-replay-command.sh` only after adding the requested temporary
first-divergence snapshot hook and allocating non-conflicting `WP_ENV_PORT` /
`WP_ENV_PHPMYADMIN_PORT` values. Do not launch broad final-stack fuzzing,
another `1020002` job, or raw deferred branch validation.

The duplicate/noise issue remains control-plane work, not a product split
change. The earlier policy-`19` novelty-monitor patch suppressed strict
no-product startup noise and preserved product-evidence signatures, but the
latest duplicate/noise synthesis identifies the remaining scheduler leak as the
startup-noise cooldown bypass: broad group-level product evidence can re-open a
producer currently paused for no-product pre-action startup noise. The current
raw novelty snapshot shows no visible likely-real failures, three current-run
product-evidence `reload_rejoin_awareness_stall` signatures, no no-product
current-drain signatures, and cooldown holds for several startup-noise-paused
groups. Next control-plane work is to make startup-noise cooldowns hard for
browser scheduling, include paused/no-analysis current state in
coverage-Codex hold checks, and preserve product-evidence signatures for
analysis without letting them bypass a no-product startup hold.

## Branch And Ref Status

Remote status was collected at `2026-05-17T17:38:50Z`.

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

That repo has modified product/test files plus many untracked fuzz, analysis,
and documentation artifacts. It is active validation infrastructure, not the
final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-17T17:38:56Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`.

Use only these repaired audited PR13 review refs for current PR13 content:

- [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired)
- [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement)
- [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard)

Do not link these stale or misordered PR13 refs as current PR content:

- `review/rtc-pr13a-observed-delete-provenance`
- `review/rtc-pr13b-stale-block-identity-smear`
- `review/rtc-pr13c-cross-parent-source-retirement`

## Proposed PR Split

Every proposed row either uses a clickable branch link from the verified
branch-link audit or explicitly says `No verified branch link yet`.

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified branch; keep in known-fix prefix |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified branch; keep in known-fix prefix |
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | TBD | TBD | sidecar; needs fetched `verified-content` audit before filing |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; seed `5500002` marker-retention remains separate follow-up |
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR 3 | No verified branch link yet | TBD | TBD | PR03 sidecar / validation-only sidecar until browser/PHP runtime replay passes |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified branch; no-PR03B product ref still needs verified audit if republished |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | TBD | replacement for old aggregate PR 5; needs verified branch link |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | progress-unblock local-machine ref exists; GitHub verified-content link is still missing |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | progress-unblock local-machine ref exists; latest split-persona synthesis maps strict seed `5700084` to `covered-by-PR05C`, but GitHub verified-content link is still missing |
| PR 5D | Semicolonless entity/reference block validation after PR 5C | No verified branch link yet | TBD | TBD | Cycle 264 clean-base candidate is importable and included in the Cycle 266 validation head; publish/fetch/audit before filing |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified branch; excludes malformed-save sidecar and broader residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified branch; narrow persisted-body guard |
| PR 6B | Malformed outgoing RTC save request-payload guard, revised against PR07B0/PR07B1 helper shape | No verified branch link yet | TBD | TBD | repaired PR06B sidecar now after PR07B1; Cycle 286 manifest refresh preserves sidecar placement but is stale against the `17:34:56Z` deferred queue, and a verified branch link is still missing |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified branch; no-PR03B product ref still needs verified audit if republished |
| PR 7B0 | Saved CRDT response hydration split from old opaque PR 7B | No verified branch link yet | TBD | TBD | Cycle 286 refresh keeps deferred `72854f05ed2` mapped to active PR07B0 lineage but is stale against the `17:34:56Z` deferred queue; no verified PR-content branch link exists yet |
| PR 7B1 | Stale base-record/title filtering split from old opaque PR 7B | No verified branch link yet | TBD | TBD | Cycle 286 refresh keeps PR07B0 as ancestor of PR07B1 and current evidence points at `4bdd9465a97`, but it is stale against the `17:34:56Z` deferred queue and no verified PR-content branch link exists yet |
| PR 7C | Reload record snapshots sidecar after PR 7B1 | No verified branch link yet | TBD | TBD | latest replay classifies `06441205b872` / seed `1100002` as `covered-by-pr07c`; Cycle 284 residual replay remained resource-gated by port `8888`, so live replay still needs the snapshot hook and non-conflicting ports before any PR07D decision |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; keep in known-fix prefix |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified branch; start CRDT block stack |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | TBD | TBD | progress-unblock manifest includes PR11A-E rows, but GitHub verified-content link is still missing |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | TBD | TBD | progress-unblock manifest includes PR11A-E rows, but GitHub verified-content link is still missing |
| PR 11C | Explicit-base middle insert | No verified branch link yet | TBD | TBD | source-local evidence marks `a914c862c29e` / seed `5200005` covered here; verified-content link is still missing |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | TBD | TBD | progress-unblock manifest includes PR11A-E rows, but GitHub verified-content link is still missing |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | TBD | TBD | progress-unblock manifest includes PR11A-E rows, but GitHub verified-content link is still missing |
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
  is verified content for old aggregate PR 5, not the recommended PR05A/B/C/D
  split.
- [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record)
  is verified content for old opaque PR 7B. The active recommendation is to
  publish and audit separate PR07B0 and PR07B1 branches before filing.
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
collected_at_utc: 2026-05-17T17:38:50Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T170355Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The collected raw `novelty-status.md` snapshot is now nonempty and was updated
at `2026-05-17T17:37:14.822Z`:

```text
coverage files: 46977
total records seen: 72359
unmet goals: 6
headroom for adding groups: yes
load1: 25.11 / 64 cores
memory: 439.5G free / 492.0G total
current-run actionable signatures: 3
current-run likely-real visible: 0
current-run product-evidence signatures: 3
current-run raw signatures: 3
current-run top semantic family: reload_rejoin_awareness_stall
current-drain raw signatures: 3
current-drain no-product raw signatures: 0
current-drain suppressed strict startup records: 0
enabled groups: novelty-ws-parser-serialization
paused groups: novelty-ws-real-user-save-reload,
  novelty-ws-lifecycle, novelty-ws-persistence-no-title,
  novelty-http-persistence-probe, novelty-ws-real-user-editing,
  novelty-ws-real-user-rich-text, novelty-ws-parser-transform
recommended groups: novelty-ws-real-user-save-reload,
  novelty-ws-real-user-editing, novelty-ws-real-user-rich-text
```

The current fuzz status is health/triage evidence only: it reports no visible
current-run likely-real product failures, but it is not final-stack validation
and does not make any PR filing-ready. Startup-only/no-product producers remain
paused or under cooldown, while product-evidence signatures are still visible
and currently represented by `reload_rejoin_awareness_stall`.

The latest trend packet was generated at `2026-05-17T17:26:46Z` from monitor
data through `2026-05-17T17:25:59Z`:

```text
monitor passes: 2050
coverage files: 272 -> 46961
coverage files delta: 46689
unmet goals: 6
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3462
summary startup failures last: 0
quality issues last: 0
enabled groups current: novelty-ws-parser-transform
fuzz level mix: browser-e2e=28 lanes/26 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5309015
browser-e2e execution: 106250 cumulative / 516 per-hour
unit-property execution: 4771424 cumulative / 7424 per-hour
coverage-guided-lower-level execution: 428335 cumulative / 0 per-hour
browser-e2e likely-real findings: 580 over 1872.0 runner-hours
largest unmet goals: reload-post-action 1019/2000,
  title-save-reload 475/1000, ui-format-paragraph 1484/2000,
  body-save-reload 534/1000, real-user-editing success 561/1000
```

The trend packet is graph-derived input evidence, not an instruction and not a
product-bug count. The raw novelty snapshot is newer than the graph trend
packet and supersedes the trend packet's enabled-group line when they disagree.
Browser E2E remains the only level with confirmed likely-real findings in the
trend packet, but lower-level lanes are under-triaged and should not be
declared useless from zero likely-real output. Recent CPU/load remains variable,
with recent samples reaching high CPU and load on a 64-core host. Prefer
startup-stall reduction, reload/rejoin duplicate control, and bounded
lower-level targets with clear oracles over broad browser concurrency
increases.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T172803Z-synthesis.md`. It says:

- Filing, pushing, broad final-stack fuzzing, and stack-wide validation remain
  blocked. This is still not a `1020002`-only blocker, and the parallel
  progress gate has actionable rows, so wait-only feedback is invalid.
- The active topology remains the Cycle 282/Cycle 284/Cycle 286 replacement
  split: `PR07A -> PR07B0 -> PR07B1`, with `PR06B` and `PR07C` as sidecars
  after `PR07B1`, and `PR09` based on `PR07B1`.
- Keep `PR07D`, `PR17`, `PR18`, and `PR18x` closed unless fresh replay proves
  red-at-`PR07C` non-coverage with REST, CRDT, Y.Doc, provider, ledger, and
  first-divergence evidence.
- Strict seed `5700084` maps to `covered-by-PR05C` from the current non-Docker
  owner comparison. Do not name `PR18x`; linebreak, parser, and rich-text
  reductions must compare `PR05B` / `PR05C` / `PR05D` before any later owner is
  allowed.
- Raw `deferred/*`, `candidate/*`, `try/rtc-fix-stack-validation`, stale
  `ready/rtc-pr06b-*`, stale `ready/rtc-pr07c-*`, fallback/PR15-tail PR05D
  rows, and old PR17/PR18 rows are not publishable split rows.
- The `20260517T172949Z` finalization report is zero bytes and is not evidence.
  The latest local publish manifest at `2026-05-17T17:12:18Z` and Cycle 286
  manifest at `17:11:41Z` are stale against the deferred queue generated at
  `2026-05-17T17:34:56Z`.
- Consume the completed `pr07c-browser-env` preflight as
  `not_product_blocker_preflight_passed`, then run the Cycle 284 reload
  residual live replay from `next-replay-command.sh` after adding the requested
  temporary diagnostic snapshot hook and allocating non-conflicting `wp-env`
  ports. Cover seeds `5200011`, `5200017`, `5200010`, `7110004`, and
  `7110017`, with `7700005` if capacity allows.
- Launch only bounded Cycle 288 jobs: `rtc-cycle288-pr07-live-replay-with-snapshots`,
  `rtc-cycle288-fresh-manifest-after-173456-deferred-queue`, and
  `rtc-cycle288-pre-save-search-live-collapse-replay-961308` if ports/resources
  are available. Do not launch broad final-stack fuzz, a raw reload-hydration
  promotion, another persona loop, another `1020002` job, raw `PR07D`, `PR17`,
  or `PR18x` work.
- Repair the loop so wait-only/progress-unblock output is invalid unless it
  creates or verifies a nonempty artifact; active sessions, log growth,
  `report.tmp`, zero-byte reports, preflight-only output, stale manifests, and
  wait-only responses are no progress while gate rows exist.

The paired `pr-split-20260517T162903Z-feedback-action.md` says the Cycle 284
action updated `current-pr-split.md`, recorded named `PR07B0` / `PR07B1`
finalization evidence with `35` clean `git diff --check` ranges, patched the
deferred-work-promotion loop so diagnostic pre-save/rich-text families can
rotate by default, verified that loop script with `bash -n`, and launched two
bounded owner replay jobs: `rtc-cycle284-reload-residual-pr07b0-pr07b1-pr07c-owner-replay`
and `rtc-cycle284-strict-5700084-pr05b-pr05c-pr05d-owner-replay`.
The later split synthesis supersedes the strict-replay blocker by mapping
`5700084` to `covered-by-PR05C`; the reload replay remains the active owner
proof gap.

The paired `pr-split-20260517T165450Z-feedback-action.md` says the Cycle 286
manifest/audit job completed and wrote nonempty `report.md`,
`branch-audit.tsv`, `push-manifest.tsv`, `manifest-age.tsv`,
`deferred-adoption.tsv`, `owner-replay-status.tsv`, `executor-queue-proof.tsv`,
and artifact verification. It records all audited rows as `base-is-ancestor`,
includes source/base refs and validation evidence in the push manifest, and
does not launch broad final-stack fuzzing, GitHub pushes, another `1020002`
job, the PR07 live replay, or the pre-save search/live-collapse comparison.
The newer `pr-split-20260517T172803Z-synthesis.md` keeps those artifacts as
evidence, but marks the manifest/publish evidence stale against the
`2026-05-17T17:34:56Z` deferred queue.

The latest duplicate/noise synthesis,
`duplicate-noise-20260517T172447Z-synthesis.md`, says no product split change
is justified, but the novelty scheduler can still bypass a `startup-noise`
pause when broad group-level product evidence exists. The earlier
`duplicate-noise-20260517T163139Z-feedback-action.md` applied the narrow
policy-`19` novelty-monitor patch, validated `node --check` and
`git diff --check` on the touched fuzzer script, restarted the active
coverage-guided novelty monitor on `run-20260517T170355Z/run-monitor.sh`, and
kept product-evidence startup-like failures visible. The new synthesis says the
smallest safe next control-plane fix is to make `startup-noise` cooldowns hard
for browser scheduling, confirm both `enableGroup` and recommended-group paths
keep the group paused, make coverage-Codex holds consider paused/no-analysis
current state, and broaden paused-drain discovery for valid future
`startupStallPausedUntil` state. This remains fuzzer control-plane evidence,
not product PR content.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", old PR13 review-ref warnings, and old enabled-group claims are
superseded by the current branch-link audit, repaired PR13 refs, PR06B/PR07C
sidecar evidence, PR05D's real slot after PR05C, the Cycle 278/280 executor and
manifest proofs, the completed Cycle 282 PR07B0/PR07B1 split/adoption proof,
the now-stale Cycle 286 manifest refresh, the duplicate/noise startup gate plus
remaining hard-cooldown scheduler fix, and the no-PR17/no-PR18/no-PR18x
classification.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR07B split and deferred adoption | `PR07B0` saved-response hydration at `e746c32e3f9` / deferred `72854f05ed2`; `PR07B1` stale base-record/title filter at `4bdd9465a97`; Cycle 282 manifest at `2026-05-17T16:15:44Z`; Cycle 286 manifest-age at `2026-05-17T17:11:41Z`; local publish manifest at `2026-05-17T17:12:18Z`; branch-link audit refreshed at `2026-05-17T17:38:56Z` | Cycle 286 records all audited rows as `base-is-ancestor`, but the latest split synthesis marks the Cycle 286 manifest and local publish manifest stale against the `2026-05-17T17:34:56Z` deferred queue; the refreshed branch-link audit verifies existing review links but still has no `verified-content` PR links for PR07B0/PR07B1 | Regenerate manifest/audit newer than the `17:34:56Z` deferred queue; publish/fetch/audit explicit PR07B0 and PR07B1 product branches; rerun focused checks and rebuilt stack validation against those audited refs |
| Reload/post-save residual witnesses | latest seeds `5200011`, `5200017`, `5200010`, `7110004`, `7110017`; include `7700005` if capacity allows | focused residual replay target after PR07B split/adoption; not a product PR slot yet; latest split synthesis says to consume the completed `pr07c-browser-env` preflight as `not_product_blocker_preflight_passed` and advance to replay | Run the Cycle 284 reload replay through its `next-replay-command.sh` only after adding the temporary first-divergence snapshot hook and non-conflicting `wp-env` ports; compare against PR07B0/PR07B1/PR07C before naming PR07D and capture block trees, serialized content, clientIds, marker attributes, REST content, REST `_crdt_document`, Y.Doc vectors, operation ledger, focus/selection, and snapshots after each save/reload/mutation |
| PR05D semicolonless entity validation | Cycle 264 clean-base branch `cycle264/pr05d-clean-base/semicolonless-entity-validation` at `27c6e7924217`; Cycle 266 validation head `b9bf4ccb7940` | real PR05-family work after PR05C; bundle import and validation-head refresh completed, but no fetched `verified-content` product branch link exists yet | Publish/fetch/audit PR05D; consume the Cycle 266 validation head; keep the Cycle 262 fallback-tail manifest rejected |
| PR06B / PR07B helper dedupe | active candidate `finalized/cycle268/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b` at `e91d2fe829f2`; stale `ready/rtc-pr06b-*` manifest rows | old independent PR06A sidecar is superseded; Cycle 274/278/280/282 evidence rejects stale rows and Cycle 286 preserves sidecar placement, but the manifest is stale against the `17:34:56Z` deferred queue; still no verified branch link and the active topology places the sidecar after PR07B1 | Publish/fetch/audit an explicit PR06B product branch after PR07B0/PR07B1, classify runtime readiness, and rebuild stack validation against the active topology |
| PR14B / PR15-on-PR14B finalization | Cycle 252 no-PR03B branch-shaping artifacts | mandatory replacement topology, but no current `verified-content` branch links exist for PR14B or PR15-on-PR14B | Publish/fetch/audit explicit no-PR03B product refs after sidecar-aware audit and keep validation-only heads out of product PRs |
| PR07C reload record snapshots | accepted sidecar after PR07B1; `finalized/cycle252/sidecar/rtc-pr07c-reload-record-snapshots` at `2d112932f0e3`; replay target `06441205b872` | included in Cycle 266 fetch-only validation topology; latest replay classifies seed `1100002` as `covered-by-pr07c`; no current verified branch-link row exists | Publish/fetch/audit sidecar-aware PR07C product branch after PR07B0/PR07B1; reopen PR07D only on future fresh non-coverage proof |
| PR03B browser `restoreRevision` CRDT invalidation | `ready-pr03b/rtc-pr03b-browser-revision-restore-crdt-invalidation` at `cbab481fe760` | PR03 sidecar / validation-only sidecar until browser/PHP runtime replay passes | Finish bounded runtime replay for PR03B; do not put PR03B back into the main spine without passing evidence |
| PR05B/PR05C/PR05D owner comparison | Cycle 260 owner-comparison evidence plus Cycle 282 strict/rich-text owner-comparison proof and latest split-persona synthesis | strict seed `5700084` maps to `covered-by-PR05C` from the current non-Docker owner comparison; parser/rich-text/linebreak evidence and the current rich-text suffix diagnostic remain out of PR18/PR18x; semicolonless/entity false-invalid rows are routed to PR05D | Keep PR18x closed; compare any remaining linebreak/parser/rich-text reductions against PR05B/PR05C before allowing a later owner, and require per-peer block trees, edited content, serialized content, rich-text / verse attributes, client IDs, and operation-ledger snapshots for any fresh source-owned claim |
| PR13 finer split | PR13B0/B1/B2/B3 source-level evidence; repaired audited PR13A/B/C fallback links | preferred source split remains PR13A/B0/B1/B2/B3, but proposed rows currently use only repaired audited PR13A/B/C links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing repaired PR13B/C fallback rows |
| Nested parent-delete / descendant-edit triage | seed `7500019` | tracking-only evidence from split persona; no product slot named | Compare against PR13 and PR15 coverage before adding any new slot |
| Seed `1020002` WebSocket marker divergence | critical-path classification under `runs/20260517T120127Z/continuations/pr17-1020002/classification.tsv`; latest nonempty continuation repeats `reclassify_downscope_not_product_owned` | downscoped unless rebuilt validation produces fresh product evidence; not an independent-work blocker and not a current PR17 product slot | Revisit only after rebuilt validation produces fresh product evidence newer than the terminal/downscope classifications |
| Sync undo/history issue | `9f4dcc759070`, `44110608ba86`, `977ed437bafe`; seeds `1090016` / `1090017`; completed Cycle 268 isolated runtime replay artifacts | completed isolated runtime replay reached the owner path but did not reproduce a stable redo-stack-loss product owner; not PR05B/PR05C and not PR18x | Use a lower-intrusion history subscription repro or source-level sync/core-data history test before naming any product PR |
| Reload-hydration diagnostics | retained raw branch `72854f05ed2`; latest deferred reload branch `deferred/rtc-reload-hydration-20260517T160811Z`; replay row `06441205b872` | Cycle 286 refresh keeps raw deferred reload-hydration mapped to active PR07B0 lineage and out of PR07D, but that refresh is stale against the `17:34:56Z` deferred queue; residual replay still must prove any distinct owner before naming PR07D | Run residual owner replay against PR07B0/PR07B1/PR07C with first-divergence snapshots; keep diagnostics downscoped unless a focused replay proves a distinct product delta |
| Rich-text formatted suffix corruption | diagnostic candidates and prior deferred refs | evidence-only; Cycle 282 owner-comparison keeps it out of active PR split and out of PR18/PR18x | Compare against PR05B/PR05C first and recover exact replay artifact or emitted delta before naming any later product owner |
| Pre-save search/live document collapse | seed `961308` / `ddf9559af37e`; only run `0932bed35c7a` if red or ambiguous | evidence-only; not in active split; latest split-persona synthesis keeps the active pre-save/rich-text gate row actionable and says it must not block behind `1020002` | Run one bounded pre-save owner comparison against `PR06`, `PR06A`, `PR07B0`, `PR07B1`, and `PR07C`, capturing editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion before naming an owner |
| Broader HTTP polling room-isolation residuals | PR02A sidecar plus stale deferred relaunches | PR02A remains in the known-fix prefix but has no verified branch link; broader residuals stay deferred | Publish/fetch/audit PR02A before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack preparation; no automatic PR slot | Triage only after rebuilt stack is available |
| Duplicate/noise control-plane recycling | `duplicate-noise-20260517T154741Z-feedback-action.md`; `duplicate-noise-20260517T163139Z-feedback-action.md`; `duplicate-noise-20260517T172447Z-synthesis.md`; nonempty `novelty-status.md` at `2026-05-17T17:37:14.822Z` | bounded fuzzer-side startup gate and policy-`19` patch are implemented, but the latest synthesis shows a scheduler-bypass leak: `startup-noise` pauses can be bypassed by broad group-level product evidence; the raw novelty snapshot now has three product-evidence `reload_rejoin_awareness_stall` signatures, zero no-product current-drain signatures, and `novelty-ws-parser-serialization` as the only enabled group | Make `startup-noise` cooldowns hard for browser scheduling, confirm `enableGroup` and recommended-group paths keep paused groups paused, make coverage-Codex holds consider paused/no-analysis current state, and preserve product-evidence signatures without allowing a no-product startup bypass |

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
3. Treat the completed Cycle 280 manifest/queue proof as prior evidence only.
   Use the completed Cycle 282 split/adoption proof as topology evidence: it
   was generated at `2026-05-17T16:15:44Z`, splits old opaque `PR07B` into
   `PR07B0` / `PR07B1`, verifies `PR07B0` is an ancestor of `PR07B1`, and
   rejects raw deferred reload-hydration publication.
4. Treat the completed Cycle 286 manifest/push-manifest/deferred-adoption audit
   as stale-but-useful topology evidence. It is newer than the
   `2026-05-17T16:53:16Z` deferred queue but stale against the current
   `2026-05-17T17:34:56Z` deferred queue. It is still not final-stack
   validation and does not create GitHub `verified-content` branch links for
   PR07B0/PR07B1 or other finer rows.
5. Do not treat the Cycle 282 or Cycle 286 manifest proof as a GitHub
   branch-link audit for PR07B0/PR07B1. Those proposed PR rows still require
   explicit `verified-content` PR-content branch links before filing.
6. Reject stale `ready/*`, raw `deferred/*` filing refs, stale PR06B/PR07C
   rows, `PR17` / `1020002`, and `PR18` / `PR18x` from the active manifest and
   executor queue. Active sessions, zero-byte reports, `report.tmp`,
   preflight-only output, stale manifests, and wait-only feedback are not
   durable progress while actionable rows remain.
7. Use the repaired PR06B sidecar candidate only after the PR07B0/PR07B1 shape
   is audited:
   `finalized/cycle268/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b`.
   The old PR06B sidecar is superseded and must stay historical input evidence
   only.
8. Treat `cycle266/validation/no-pr03b-pr05d-plus-pr06b-pr07c-sidecars` at
   `b9bf4ccb794004b634d1427bf18d1a7d788af03f` as fetch-only validation
   evidence, not product content.
9. Publish/fetch and audit explicit sidecar-aware product refs for PR02A,
   PR03B, PR04-through-PR07A, PR07B0, PR07B1, PR05A/B/C, clean-base PR05D,
   repaired PR06B, PR07C, PR11A-E, PR13B0/B1/B2/B3 if available, PR14B, and
   PR15A/B/C-on-PR14B before treating those finer refs as maintainer-facing
   links.
10. Until PR13B0/B1/B2/B3 have verified branch links, keep using only repaired
   PR13A/B/C links from the audit for PR13 content.
11. Do not publish raw reload-hydration deferred refs as PR07D. Current
    evidence treats the raw reload branch as rejected/held unless fresh replay
    proves PR07B0/PR07B1/PR07C non-coverage.
12. Run the remaining bounded owner-comparison jobs: first consume the
    completed `pr07c-browser-env` preflight and run the PR07 live replay with
    the temporary snapshot hook and non-conflicting ports, comparing reload
    residual witnesses against PR07B0/PR07B1/PR07C; then run the bounded
    pre-save-search/live-collapse owner comparison for seed `961308` /
    `ddf9559af37e` if ports/resources are available. Treat strict seed
    `5700084` as `covered-by-PR05C` per the latest split-persona synthesis;
    parser/rich-text/linebreak cases still need PR05B/PR05C/PR05D comparison
    before naming any later owner.
13. The deferred-promotion loop patch is recorded as Cycle 284 evidence, and
    the split-review loop bounded-job/progress-unblock patch is recorded as
    Cycle 286 evidence. Existing active runners may still finish from older
    generated scripts, so wait-only, launcher-only, or stale-manifest cycles
    still do not count as durable progress.
14. Rerun focused checks, touched-file lint, branch graph/containment evidence,
    adjacent range-diffs/diffstats/numstats, `git diff --check`, and feasible
    PR03B/PR07B0/PR07B1/PR07C runtime checks.
15. Treat seed `1020002` as downscoped by the
    `reclassify_downscope_not_product_owned` classification. Do not launch a
    new `1020002` repair rerun unless rebuilt validation produces fresh product
    evidence.
16. Treat PR18x as rejected for the current parser/rich-text/linebreak and
    strict/rich-text suffix evidence. The narrow PR05D semicolonless
    entity-validation path belongs after PR05C, and the completed isolated sync
    undo/history runtime replay did not produce a stable owner proof.
17. Treat the raw novelty snapshot, trend packet, and duplicate/noise synthesis
    as fuzz/control-plane health and triage evidence. The collected raw novelty
    snapshot for this update is nonempty and fresher than the trend packet. It
    shows zero visible likely-real failures, three current-run product-evidence
    `reload_rejoin_awareness_stall` signatures, zero no-product current-drain
    signatures, and startup-noise cooldown holds that still need scheduler
    hardening; neither source is final-stack validation, a validated
    final-stack pass or failure, or filing readiness.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after environment preflight is healthy. None of the
current trend, duplicate/noise, residual reducer, or status-persona evidence is
final-stack fuzz validation or a filing unblocker.
