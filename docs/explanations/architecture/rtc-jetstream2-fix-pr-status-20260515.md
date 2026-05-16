# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T15:23:39Z`

Trigger event:
`pr-split-2026-05-16T15-22-48Z-20260516T151306Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-16T15-22-48Z-20260516T151306Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked and the split must change. The newest split-persona
synthesis, `pr-split-20260516T151306Z-synthesis.md`, keeps the
Cycle 134/146/148/150/152 explicit 28-head allow-list only as a known-fix
prefix. Seed `1020002` is now product-confirmed WebSocket divergence: page 1
and the relay materialize the inserted `core/search` marker, while page 0 stays
`connected`/`synced` but never gets it in its local post Y.Doc. The completed
product-divergence repair pass reproduced the failure and found no bounded fix.
Background fuzz still reports `0` visible likely-real failures, but that is not
filing evidence for the final stack.

Use this known-fix prefix plus seed `1020002` repair decision, not the older
aggregate split:

```text
PR01-PR04
PR05A -> PR05B -> PR05C
PR06 -> PR06A
PR07A -> PR07B
PR09 -> PR10
PR11A -> PR11B -> PR11C -> PR11D -> PR11E
PR12
PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
PR14
PR15A -> PR15B -> PR15C
default new post-PR15C PR for seed 1020002 unless the next diagnostic proves an existing owner
```

The clean structural validation ref remains:

```text
validation/rtc-final-combined-stack-post-pr11-20260516T110608Z
921f093cc47b46844bf8fb48552483686c55ef6b
```

That rebuild reported focused CRDT checks, touched-file JS lint,
`git diff --check`, containment, range-diff, and diffstat evidence passing.
Treat it as structural and focused-check evidence for the rebuilt stack. It is
not final-stack fuzz validation.

The bounded classifier report exists and classifies seed `1020002` as
`product-marker-divergence`:

```text
/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T142344Z/jobs/outputs/rtc-ws-seed-1020002-marker-divergence-followup-rerun-20260516T142344Z/report.md
```

The bounded product repair/evidence job also completed:

```text
job: rtc-ws-seed-1020002-product-divergence-repair
script: /media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T143821Z/jobs/run-rtc-ws-seed-1020002-product-divergence-repair-20260516T143821Z.sh
report: /media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T143821Z/jobs/outputs/rtc-ws-seed-1020002-product-divergence-repair-20260516T143821Z/report.md
```

The repair report found no bounded fix. The default replacement split is a new
narrow post-`PR15C` PR for WebSocket post-sync remote-update materialization /
live editor-Yjs marker propagation. Only fold that repair into an existing head
if the next diagnostic proves the same source boundary.

The next gate is exactly one bounded state-vector/diff diagnostic:

```text
job: rtc-ws-seed-1020002-state-vector-diff-diagnostic-20260516T151306Z
base evidence: /media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T143821Z/jobs/outputs/rtc-ws-seed-1020002-product-divergence-repair-20260516T143821Z/
```

It should add relay/browser diagnostics for:

```text
/diff?room=postType/post:<id>&stateVector=<base64>&marker=async-server-1020002-0-1-589451
```

Interpret the diagnostic this way: an empty relay diff means page 0's state
vector or client clock falsely advanced; a non-empty diff plus failed manual
`Y.applyUpdate(page0Doc, relayDiff)` means pending dependency or struct
corruption; a manual apply that works means the provider/sync handler is not
applying later updates. After that result, either implement the bounded fix and
assign the owning PR slot, or explicitly create the new post-`PR15C` PR.

Do not launch broad final-stack fuzz, extra fuzz lanes, reload diagnostics,
PR13 repair/import, PR6B/PR6C work, old PR16 replay work, or another
split-review loop until the state-vector/diff diagnostic is consumed and the
combined stack is rebuilt. Existing coverage-guided background fuzz can
continue.

Deferred/evidence-only work remains outside the filing split: reload-hydration
empty-live-editor, pre-save search/live-collapse, rich-text suffix corruption,
broader malformed-save residuals, HTTP room-isolation residuals, seed
`5500002`, `PR 1A`, `PR 6B`, `PR 6C`, and the old blocked `PR 16`
valid-block `originalContent` candidate. The seed `1020002` post-`PR15C`
decision is a separate active blocker, not evidence that the old PR16 candidate
is ready.

## Latest Branch And Ref Status

The collected remote status input was generated at `2026-05-16T15:23:34Z`.

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
copied into a clean evidence worktree for the reload-hydration gate.

The fuzz repo remains on the validation stack:

```text
## try/rtc-fix-stack-validation
72854f05ed2 Hydrate saved CRDT responses without invalidation
```

That stack still has modified product/test files and many untracked fuzz,
analysis, and documentation artifacts. It is active validation infrastructure,
not the final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-16T15:23:39Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`.

For repaired PR 13 content, use only these audit refs:

- [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired)
- [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement)
- [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard)

Do not link the stale or misordered PR 13 refs listed in the audit under
"Explicitly Not PR-Content Links":
`review/rtc-pr13a-observed-delete-provenance`,
`review/rtc-pr13b-stale-block-identity-smear`, or
`review/rtc-pr13c-cross-parent-source-retirement`.

The supporting provenance base
[`shape/rtc-crdt-pr12-previous-local`](https://github.com/danluu/gutenberg/tree/shape/rtc-crdt-pr12-previous-local)
is pushed only so the repaired PR 13A compare link has the source base.

## Proposed PR Split

Every proposed row either uses a clickable branch link from the verified
branch-link audit or explicitly says `No verified branch link yet`. Treat this
table as the reviewed known-fix prefix plus the current default post-`PR15C`
filing unit for seed `1020002`. The post-`PR15C` row still needs a branch only
after the state-vector/diff diagnostic proves its ownership and the bounded fix
is implemented.

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified branch; keep in known-fix prefix |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified branch; keep in known-fix prefix |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; seed `5500002` marker-retention remains a separate follow-up |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified branch; keep in known-fix prefix |
| PR 5A | Entity/entity-reference normalization in `crdt.ts` | No verified branch link yet | 2 | +465 / -8 | replacement for old aggregate PR 5; allow-list head exists but needs audited review branch |
| PR 5B | Parser/rich-text HTML equivalence in `crdt-blocks.ts` | No verified branch link yet | 2 | +925 / -42 | replacement for old aggregate PR 5; allow-list head exists but needs audited review branch |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | +287 / -15 | replacement for old aggregate PR 5; allow-list head exists but needs audited review branch |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified branch; excludes dropped PR 6B and broader malformed-save residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified branch; narrow persisted-body guard |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified branch; repaired split head |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified branch stacked after PR 7A; repaired split head |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; keep in known-fix prefix |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified branch; start CRDT block stack |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | 2 | +257 / -3 | green in validation-stack rebuild; needs audited review branch before filing |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | 2 | +240 / -2 | green in validation-stack rebuild; needs audited review branch before filing |
| PR 11C | Explicit-base middle insert | No verified branch link yet | 2 | +220 / -0 | green in validation-stack rebuild; needs audited review branch before filing |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | 2 | +259 / -0 | green in validation-stack rebuild; needs audited review branch before filing |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | 2 | +170 / -0 | green in validation-stack rebuild; needs audited review branch before filing |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified branch; keep in known-fix prefix |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired audit link; first maintainer-facing PR 13 delta |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired audit link; covers source-retirement content while green B1/B2/B3 subheads lack individual audit rows |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired audit link; covers identity/provenance guard content while green B0 lacks its own audit row |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified branch; keep after PR13 source sequence |
| PR 15A | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 | +123 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 15B | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | 2 | +197 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 15C | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | 2 | +161 / -4 | verified branch; keep reload-hydration gate spec out |
| New post-PR15C PR | WS seed `1020002` post-sync remote-update materialization / live editor-Yjs marker propagation divergence | No verified branch link yet | TBD | TBD | default replacement after the repair pass found no bounded fix; fold into an existing head only if the state-vector/diff diagnostic proves the same owner; not the old PR 16 valid-block candidate |

Verified branches that are now prior art or staging only:

- [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence)
  is verified content for old aggregate PR 5 (`4` files, `+1664 / -52`), not
  the recommended maintainer-facing split.
- [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record)
  is verified content for old broad PR 8 (`11` files, `+618 / -61`), not an
  active filing unit.
- [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops)
  is verified content for old aggregate PR 11 (`2` files, `+1145 / -4`), but
  the active recommendation is the green PR 11A-E split.

The latest allow-list shape still names green source subheads
`PR 13B0/B1/B2/B3`. Those are source-shaping facts for the validation ref.
Until individual branch-link-audit rows exist for those subheads, the
maintainer-facing PR13 links are the repaired audited `PR 13A/B/C` refs shown
above.

## Fuzz And Validation Status

Latest collected status input:

```text
collected_at_utc: 2026-05-16T15:23:34Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T151145Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The raw `novelty-status.md` input is present for the fresh
`run-20260516T151145Z` coverage root. Treat it as current-root control-plane
state, not final-stack validation:

```text
updated: 2026-05-16T15:22:17.734Z
coverage files: 33271
total records seen: 49437
records processed this pass: 27
current-run records by profile: {"persistence-no-title":2,"session-lifecycle":1}
current-run successful records by profile: {"persistence-no-title":1}
current-run pre-action startup failures by profile: {"session-lifecycle":1}
current-run summary-only startup failures by profile: {"session-lifecycle":1}
new behavioral feature keys this pass: 0
new CDP coverage hashes this pass: 0
likely-real visible: 0
quality issues: 1
current triage signatures: 3
current top duplicate family share: 0.6667
enabled groups: novelty-ws-persistence-no-title, novelty-http-persistence-probe
recommended groups: none
paused groups: none
startup-noise held recommended groups: novelty-ws-real-user-editing,
  novelty-ws-real-user-rich-text, novelty-ws-block-gauntlet,
  novelty-ws-common-blocks, novelty-ws-parser-transform,
  novelty-ws-async-server-blocks, novelty-ws-media-cross-entity,
  novelty-ws-long-session-large-doc
startup-noise probation: current-run triage is dominated by strict startup
  known-noise family pre_action_bootstrap_stall (2/3, share=0.6667)
startup-noise capacity floor: novelty-http-persistence-probe
health warning: triage yield is current-run known-noise dominated
```

This means the novelty state moved to a new run root at
`run-20260516T151145Z`, reset run-local pause/startup/quality counters, and
restarted current-run triage for that root. The startup-noise warmup cap is
still active, only two bounded canaries are enabled, and the small current-run
sample is known-noise dominated. Do not present this constrained current-root
state as product approval.

The latest available trend evidence packet was generated at
`2026-05-16T15:10:46Z` from monitor data through `2026-05-16T15:08:24Z`:

```text
monitor passes: 1556
coverage files: 272 -> 33207
coverage files delta: 32935
unmet coverage goals: 24 -> 5
likely_real_max: 0
duplicate_share_current_last: 0.5294
duplicate_share_historical_last: 0.5896
summary_startup_failures_last: 0
quality_issues_last: 1
enabled groups current: novelty-http-persistence-probe
fuzz level mix: browser-e2e=26 lanes/26 groups
browser-e2e execution: 50561 cumulative / 652 per-hour
transport-integration execution: 3006 cumulative / 0 per-hour
load1: 69.45 / 64 cores
memory: 426.5G free
```

Largest remaining trend goals:

- successful real-user-editing records: `284/500`
- `core/html`: `369/500`
- CDP coverage records: `4874/5000`
- `core/details`: `409/500`
- `core/more`: `423/500`

Weak completion profiles remain a reason to prefer guarded top-offs and
startup-stall reduction over simply increasing browser concurrency. The weakest
success ratios in the trend packet are `full` (`18/840`),
`revision-persistence` (`77/3393`), `multi-reload-lifecycle` (`61/2529`),
`parser-serialization` (`62/2047`), and `real-user-editing` (`284/5120`).

This trend packet is background fuzz-health and control-plane evidence. It is
not final-stack validation because the final-stack WebSocket path is blocked on
the seed `1020002` state-vector/diff diagnostic and the resulting repair/split
decision. It also predates the later `15:22:17Z` novelty snapshot, so use the
raw `novelty-status.md` data above for current-root enabled-group and
current-run counters.

The previous bootstrap/classifier/repair state has advanced: the active blocker
is no longer "WS bootstrap report missing," "classifier missing," or "repair
report missing." Seed `1020002` is classified as product divergence, the
bounded repair reproduced it but found no bounded fix, and the only justified
next product-directed step is the state-vector/diff diagnostic listed above.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260516T151306Z-synthesis.md`. Its consensus:

- The report needs a split change and filing remains blocked.
- Keep the explicit 28-head allow-list only as the known-fix prefix.
- Treat seed `1020002` as product-confirmed WebSocket divergence: page 1 and
  the relay have marker `async-server-1020002-0-1-589451`; page 0 stays
  connected/synced but lacks it locally.
- The completed repair pass found no bounded fix, so `0` visible likely-real
  background fuzz is not filing evidence.
- Default to a new narrow post-`PR15C` PR for WebSocket post-sync remote-update
  materialization / live editor-Yjs marker propagation.
- Fold it into an existing head only if the next diagnostic proves the same
  source boundary.
- Do not fold this into PR13, PR15, PR6B/PR6C, PR8/reload hydration,
  pre-save/live-collapse, rich-text suffix, HTTP room isolation, or old PR16
  without proof.
- Keep broad PR8, former PR6B, PR6C, PR1A HTTP room isolation, seed `5500002`,
  reload hydration, pre-save search collapse, and rich-text suffix work
  deferred/evidence-only.
- Run exactly one bounded state-vector/diff diagnostic for seed `1020002`, then
  rebuild the combined stack from the known-fix prefix plus the repair decision
  before focused seed validation, final-stack validation, or final-stack fuzz.

The latest split feedback action file,
`pr-split-20260516T151306Z-feedback-action.md`, is zero bytes. No product files
were edited by that action pass or by this status update.

The newest duplicate/noise synthesis,
`duplicate-noise-20260516T145914Z-synthesis.md`, classifies the remaining
duplicate/noise problem as an admission-control failure, not product-code
failure. Strict pre-action startup stalls are not classified consistently early
enough: `triage-watcher` suppresses only a narrow seed shape,
`analysis-tier` can still trust stale `queued` statuses, and raw
`kind:"attempt"` plus later terminal records for the same seed can both enter
triage candidates.

The latest duplicate/noise feedback action,
`duplicate-noise-20260516T143459Z-feedback-action.md`, changed only
`bin/rtc-browser-fuzz-session-watchdog.mjs`. It applied an allowlisted
control-plane fix so the active `rtc-coverage-guided-novelty` watchdog floors
effective stale detection at 15 minutes and startup grace at 10 minutes even
though the launcher still requests 4 minutes and 3 minutes. Validation passed
with both available `node --check` invocations, only
`rtc-coverage-guided-watchdog` was restarted, and the watchdog reported
`staleMs: 900000`, `requestedStaleMs: 240000`, `startGraceMs: 600000`, and
`requestedStartGraceMs: 180000`. This reduces restart churn and helps preserve
current-run evidence; it does not replace the triage-watcher/analysis-tier
admission gate still listed below.

The latest duplicate/noise feedback action file,
`duplicate-noise-20260516T145914Z-feedback-action.md`, is zero bytes, so no new
control-plane changes were recorded after the watchdog-grace update. Remaining
duplicate/noise follow-up from the latest synthesis:

- Add one shared strict pre-action startup-noise predicate in
  `bin/rtc-browser-fuzz-triage-watcher.mjs` and apply it narrowly.
- Add a matching defensive analysis-tier skip in
  `bin/rtc-browser-fuzz-analysis-tier.mjs`.
- Deduplicate same-seed attempt/final summary pairs before signature creation,
  preferring terminal classified records over raw `kind:"attempt"` records.
- Require the predicate to prove zero users, no last/editor action, startup
  phase only (`seed`, `bootstrap`, `open`, `join`), an equivalence or
  pre-analysis class of pre-action bootstrap or awareness stall, and no
  save/reload/revision/fault/operation/product witness evidence.
- Validate with `node --check` for touched scripts, a triage watcher
  `--once --gate-only` pass against the active coverage dir, synthetic positive
  and negative fixtures, and a short observation that strict startup noise
  stops entering `queued`/`retry`/`running` while product-evidence failures
  remain visible.
- Keep failures recorded and never suppress post-action, late-session,
  assertion, timeout, non-convergence, persistence, operation-witness, or
  likely-real cases.
- Treat live-analysis paused-dir filtering, novelty capacity-floor tightening,
  run-root family caps, broader seed cursor persistence, and supervisor
  pause-threshold changes as follow-ups unless the narrow current-run startup
  gate still leaks duplicate work.

This is control-plane follow-up only and is not product PR content.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older warning that the
GitHub-facing PR13 review links were stale is superseded by the
`2026-05-16T15:23:39Z` branch-link audit, which verifies the repaired PR 13
review refs listed above.

## Deferred Or Evidence-Only Work

These must not be described as fixed.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Dropped PR 6B save snapshot/no-op guard | `final/rtc-pr06b-save-snapshot-noop-guard`; seeds `5500001`, `5500002`, `5500006` | dropped from filing path and allow-list after corrected replay classification | Do not rerun as the next gate; track seed `5500002` separately as revision-restore marker retention if it reproduces cleanly |
| PR 6C malformed evaluated save content | no verified filing branch | blocked/deferred pending focused Jest, lint, and replay evidence | Promote only after focused product evidence and a verified branch link exist |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit | Shape and audit a narrowed title-reload branch only if PR 8A is revived; give any persisted-record hydration claim separate product evidence and a verified branch link |
| Reload hydration empty live editor | `e75c8829e4e9`, `3bbdc3cdb393`; gate branch `try/rtc-reload-hydration-gate-e75c8829` | evidence-only; not in PR 6, PR 6A, PR 8, PR 15, or fallback-group claims | Promote only if a clean gate reaches the post-reload assertion and live editor state stays empty after exact-room WebSocket sync while REST body and persisted `_crdt_document` remain populated |
| Pre-save search/live document collapse | `ddf9559af37e`, `0932bed35c7a`, conditional `1e0ade5ec5a8`; `try/rtc-pre-save-search-collapse-gate-ddf9559` | evidence-only; not in active split | Capture editor blocks, serialized content, core-data edited record, live CRDT record, provider state, REST body, and save state before/after `core/search` insertion |
| Rich-text formatted suffix corruption | `4148230f681d`, `b0db7b80c6f2`, `dc8ea6e78d4d`, `1ccac75d7faa`, `2722f0e897de`, `712b98ba96ff` | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Malformed save payload and save-settlement residuals | `fc154ebec48c`, `e40aa1b7863d`, `f51c425df8a5`, `f46859898576`, `afd389d7f139`, `02289235f55f`, `eef8b8932e11`, `b60eecd4ac03` | deferred beyond dropped PR 6B and isolated PR 6C candidate | Create a source-level `saveEntityRecord()` / `prePersistPostType()` repro where clean local blocks exist but evaluated outgoing `content` is malformed |
| Seed `1020002` WebSocket marker divergence | Cycle 152 classifier report; completed repair job `rtc-ws-seed-1020002-product-divergence-repair`; next job `rtc-ws-seed-1020002-state-vector-diff-diagnostic-20260516T151306Z` | active final-stack blocker; classified as product divergence; repair pass reproduced the marker split and found no bounded fix | Run the bounded state-vector/diff diagnostic, then either assign a bounded fix to an existing owning head if proven or create the new narrow post-`PR15C` PR |
| PR 16 valid-block `originalContent` candidate | seed replay candidate only | blocked/deferred; latest split synthesis says it is not part of the filing stack | Replay and classify the seed before considering any product branch or verified branch link |
| HTTP smoke `rest_crdt_document_stale` | final-stack bootstrap repair reached one HTTP action before this signal | separate triage signal; not split coverage and not a final-stack fuzz pass | Classify separately after the seed `1020002` state-vector/diff diagnostic and repair/split decision |
| HTTP polling room-isolation residuals | `f5738470d026`, `fda8d2334e65`, conditional `fc99825fb6c2`, `b75435787be1`; possible PR 1A | deferred; possible PR 1A is not in the active split | Promote only if fuzzing still shows healthy post rooms stalled by auxiliary room failures after PR 1/2 |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr` branches as-is.

Before filing any maintainer-facing PR:

1. Use only the explicit filing/push allow-list from the clean validation-stack
   rebuild. Do not wildcard import or file `final/rtc-pr*`.
2. Keep old aggregate PR 5, broad PR 8, aggregate PR 11, stale/misordered PR 13
   refs, dropped PR 6B, PR 6C, PR16 seed-replay candidates, dirty evidence
   branches, and the untracked reload-hydration gate spec out of filing
   branches and push allow-lists.
3. Push/import and audit individual PR 5A/5B/5C and PR 11A-E review branches,
   or keep the table rows marked `No verified branch link yet`.
4. Use the repaired audited PR13A/B/C review refs for maintainer-facing PR13
   links until the green PR13B0/B1/B2/B3 subheads have verified audit rows.
   Do not file old aggregate PR 13B, old PR 13C, Cycle 110 red tri-split refs,
   or stale/misordered review refs.
5. Rebase or recreate each intended PR branch on the intended upstream base if
   that base moves.
6. Regenerate branch graph/containment evidence and adjacent
   range-diffs/diffstats from the actual filing repo.
7. Rerun focused checks, touched-file lint, and `git diff --check` on every
   imported/rebased branch.
8. Keep dirty analysis-only artifacts out of product PR branches.
9. Run exactly one bounded seed `1020002` state-vector/diff diagnostic from the
   completed product-divergence repair evidence. Do not launch broad final-stack
   fuzz, extra fuzz lanes, reload diagnostics, PR13 repair/import, PR6B/PR6C
   work, old PR16 replay work, or another split-review loop until that
   diagnostic is consumed.
10. After the diagnostic decides whether the fix belongs in a new narrow
   post-`PR15C` PR or inside an existing final head, rebuild the combined stack
   from the 28-head known-fix prefix plus that decision, rerun the focused seed
   diagnostic, then rerun bounded final-stack validation against
   `validation/rtc-final-combined-stack-post-pr11-20260516T110608Z` at
   `921f093cc47b46844bf8fb48552483686c55ef6b`. Count it only if it reaches
   action-level product coverage.
11. Block filing if new visible likely-real failures appear.

Existing fuzz infrastructure can continue where healthy. The latest trend
evidence has `likely_real_max: 0`, `5` unmet goals, graph current duplicate
share `0.5294`, and browser-e2e execution at `50561` cumulative / `652`
per-hour.
The raw `novelty-status.md` for the newer current root has `likely-real
visible: 0`, WebSocket persistence and HTTP persistence canaries enabled, three
current-run records, one current-run success, three current triage signatures,
one quality issue, and current-run triage dominated by strict startup
known-noise. Treat both the trend packet and current novelty status as useful
control-plane and fuzz-health evidence, not final-stack fuzz validation.
