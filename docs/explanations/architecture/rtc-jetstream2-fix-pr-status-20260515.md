# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T16:29:17Z`

Trigger event:
`pr-split-2026-05-16T16-28-22Z-20260516T162217Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-16T16-28-22Z-20260516T162217Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked. The current split is not a complete filing split; it is
a known-fix 28-head prefix plus one active post-`PR15C` product blocker for
seed `1020002`.

Latest split-persona synthesis, `pr-split-20260516T162217Z-synthesis.md`,
replaces the old "28-head allow-list is filing-ready" assumption with this
shape:

```text
known-fix 28-head prefix
-> new narrow post-PR15C seed 1020002 WebSocket/Yjs store-transition repair PR
-> rebuilt combined validation stack
-> focused seed 1020002 gate
-> final-stack fuzz
```

Seed `1020002` is product-confirmed WebSocket/Yjs divergence. Page 1 and the
relay materialize marker `async-server-1020002-0-1-589451`; page 0 remains
`connected`/`synced` but lacks it locally. The completed state-vector/diff
diagnostic shows page 0 advertising peer client `353740376` through clock `820`
while storing that range as deleted; relay/page 1 retain live marker-bearing
structs. The completed `153219Z` peer-client store-transition report reproduced
the failure without a passing product repair and narrowed the next owner to
`@wordpress/sync` manager load/hydrate replay after provider-synced state.

The active bounded repair/evidence job is:

```text
rtc-ws-seed-1020002-sync-manager-load-hydrate-repair-20260516T160617Z
```

The latest persona synthesis reports that tmux session as active and its
expected report as not yet present:

```text
/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T160617Z/jobs/outputs/rtc-ws-seed-1020002-sync-manager-load-hydrate-repair-20260516T160617Z/report.md
```

Do not fold the seed `1020002` work into PR13, PR15A-C, PR6B/PR6C, old PR16,
reload hydration, pre-save collapse, rich-text suffix, malformed-save residuals,
or HTTP room isolation unless the active repair proves the same source owner.
PR6B remains dropped/deferred. Reload hydration, pre-save collapse, rich-text
suffix, malformed-save residuals, HTTP residuals, seed `5500002`, and old PR16
remain evidence-only or deferred.

The clean structural validation ref remains:

```text
validation/rtc-final-combined-stack-post-pr11-20260516T110608Z
921f093cc47b46844bf8fb48552483686c55ef6b
```

That rebuild reported focused CRDT checks, touched-file JS lint,
`git diff --check`, containment, range-diff, and diffstat evidence passing.
Treat it as structural and focused-check evidence for the known-fix prefix. It
is not final-stack fuzz validation and no longer represents the complete filing
stack because seed `1020002` still needs the post-`PR15C` repair decision.

## Latest Branch And Ref Status

The collected remote status input was generated at `2026-05-16T16:29:12Z`.

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

The branch-link audit was generated at `2026-05-16T16:29:17Z` from fetched
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
table as the known-fix prefix plus the current post-`PR15C` filing slot for
seed `1020002`. The post-`PR15C` row still needs a branch after the
sync-manager load/hydrate repair is implemented and validated.

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
| PR 8A | Narrow title reload replacement | No verified branch link yet | TBD | TBD | broad verified PR 8 is not the active filing unit; shape a narrow title-reload branch only if revived |
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
| New post-PR15C PR | WS seed `1020002` sync-manager load/hydrate replay after provider-synced state / live editor-Yjs peer-client propagation divergence | No verified branch link yet | TBD | TBD | active blocker; shape only after the bounded sync-manager repair produces passing focused seed evidence |

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
collected_at_utc: 2026-05-16T16:29:12Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T161759Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The latest novelty monitor status was updated at `2026-05-16T16:28:47.772Z`
for the same coverage root:

```text
coverage files: 33978
total records seen: 50585
records processed this pass: 52
new behavioral feature keys this pass: 1
unmet coverage goals: 5
current-run records: 5
current-run successful records: 5
current-run triage signatures: 0
current-run likely-real visible: 0
current-run bootstrap stalls: 0
historical signatures: 24353
historical bootstrap stalls: 14316
historical top duplicate share: 0.5879
external live signatures: 187
combined signatures: 24540
combined likely-real visible: 0
combined bootstrap stalls: 14370
combined top duplicate share: 0.5856
enabled groups: novelty-http-persistence-probe
paused groups: none
startup-noise policy: broad WS recommendations held until current clean evidence exists
load1: 58.24 / 64 cores
memory: 426.1G free
```

The monitor reset run-local noise state when the active output dir moved from
`run-20260516T160246Z` to `run-20260516T161759Z`, restarted the current-run
triage watcher, and started the coverage-guided supervisor. The current output
dir now has `5` current-run HTTP `persistence-no-title` records, all successful,
and still has no current visible likely-real failures. The only enabled group
is `novelty-http-persistence-probe`. Broad WS recommendations remain held until
current clean evidence exists, with release per profile at `10` successful
current-run records.

The latest trend evidence packet was generated at `2026-05-16T16:24:36Z` from
monitor data through `2026-05-16T16:24:15Z`:

```text
monitor passes: 1589
coverage files: 272 -> 33905
coverage files delta: 33633
unmet coverage goals: 24 -> 5
likely_real_max: 0
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.5879
summary_startup_failures_last: 0
quality_issues_last: 0
enabled groups current: novelty-http-persistence-probe
fuzz level mix: browser-e2e=26 lanes/26 groups; unit-property=1 lane/1 group; coverage-guided-lower-level=1 lane/1 group
browser-e2e execution: 52240 cumulative / 596 per-hour
transport-integration execution: 3006 cumulative / 0 per-hour
unit-property execution: 573 cumulative / 96 per-hour
coverage-guided-lower-level execution: 1082 cumulative / 108 per-hour
load1: 56.21 / 64 cores
memory: 425.1G free
```

Largest remaining current unmet goals from the latest trend and novelty
packets:

- successful real-user-editing records: `287/500`
- `core/html`: `382/500`
- CDP coverage records: `4887/5000`
- `core/details`: `426/500` in the later novelty snapshot (`423/500` in the trend packet)
- `core/more`: `455/500` in the later novelty snapshot (`454/500` in the trend packet)

Weak completion profiles remain a reason to prefer guarded top-offs and
startup-stall reduction over simply increasing browser concurrency. The weakest
success ratios in the trend packet are `full` (`18/840`),
`revision-persistence` (`86/3453`), `multi-reload-lifecycle` (`72/2628`),
`parser-serialization` (`69/2137`), and `real-user-editing` (`287/5201`).

This novelty/trend evidence is background fuzz-health and control-plane
evidence. It is not final-stack validation because the final-stack WebSocket
path is blocked on the seed `1020002` sync-manager load/hydrate repair decision
and the resulting rebuilt validation stack.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260516T162217Z-synthesis.md`. Its consensus:

- Filing remains blocked and the split must change.
- Keep the explicit 28-head allow-list only as the known-fix prefix.
- Treat seed `1020002` as product-confirmed WebSocket/Yjs divergence, narrowed
  to `@wordpress/sync` manager load/hydrate replay after provider-synced state.
- Append a new narrow post-`PR15C` PR for the seed `1020002` repair, then
  rebuild and validate the combined stack.
- Do not fold this into PR13, PR15A-C, PR6B/PR6C, old PR16, reload hydration,
  pre-save collapse, rich-text suffix, malformed-save, or HTTP residual work
  unless the active repair proves the exact same source owner.
- PR6B stays dropped/deferred. Reload hydration, pre-save collapse, rich-text
  suffix, malformed-save residuals, HTTP room isolation, and seed `5500002`
  remain evidence-only or deferred.
- Consume the already-running
  `rtc-ws-seed-1020002-sync-manager-load-hydrate-repair-20260516T160617Z`
  job. Its report was not present at the time of synthesis.
- After that report lands, shape the repair as the new post-`PR15C` PR unless
  it proves a narrower existing owner, rerun the focused seed `1020002`
  diagnostic/gate, rebuild the combined stack, regenerate graph/containment/
  range-diff/diffstat evidence, then run focused checks, lint,
  `git diff --check`, and final-stack fuzz.

The latest split feedback-action file,
`pr-split-20260516T162217Z-feedback-action.md`, is zero bytes; it launched no
new work. The latest nonempty split feedback action,
`pr-split-20260516T160617Z-feedback-action.md`, applied this direction to the
remote split report and launched exactly one tmux job:

```text
rtc-ws-seed-1020002-sync-manager-load-hydrate-repair-20260516T160617Z
```

It deferred broad final-stack fuzz, extra fuzz lanes, reload diagnostics,
PR6B/PR6C work, old PR16 replay, PR13 repair/import, and another split-review
loop until seed `1020002` passes or is explicitly reclassified and the combined
stack is rebuilt with fresh evidence.

The latest duplicate/noise synthesis,
`duplicate-noise-20260516T160140Z-synthesis.md`, identifies control-plane
leakage rather than a proven product bug. Historical strict startup noise,
mainly `pre_action_bootstrap_stall`, dominates aggregate signatures, while the
current run has no visible likely-real signal and no mature clean evidence. The
smallest safe direction is evidence-gated startup-noise handling:

- Suppress only strict pre-action startup/bootstrap stalls with zero users,
  zero actions, and no reload/save/revision/fault/operation/product evidence.
- In `rtc-browser-fuzz-novelty-monitor.mjs`, allow at most one bounded
  startup-noise floor/canary path, release profiles only after
  `STARTUP_NOISE_PROBATION_SUCCESS_RECORDS` current-run successes, and stop or
  pause on strict startup failure threshold.
- In `rtc-browser-fuzz-live-analysis-monitor.mjs`, skip analysis/deep-analysis
  session startup when gate-only triage is known-noise-only.
- Keep mixed runs analyzable for non-suppressed signatures and never suppress
  product-evidence failures.

The latest duplicate/noise feedback action with code changes,
`duplicate-noise-20260516T160140Z-feedback-action.md`, implemented the allowed
novelty-monitor control-plane fix in `rtc-browser-fuzz-novelty-monitor.mjs`.
It bumped the startup-noise policy to `v15`, removed
`novelty-ws-lifecycle` as a startup-noise floor/canary bypass, made
current-run startup dominance use deduped strict startup evidence, limited the
capacity-floor bypass to the low-noise HTTP probe or profiles with enough
current-run clean successes, and stopped current-run startup dominance from
pausing unrelated historically noisy profiles. Validation passed with:

```text
node --check bin/rtc-browser-fuzz-novelty-monitor.mjs
```

It restarted the coverage-guided control loop; active novelty, supervisor,
triage, and watchdog sessions were confirmed. The later novelty snapshot now
shows only `novelty-http-persistence-probe` enabled, no paused groups, `5`
successful current-run HTTP records, and no current-run likely-real failures.
Runner-side startup detection, triage-watcher changes, and known-noise-only
live-analysis gating remain control-plane follow-up, not product PR content.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older warning
that GitHub-facing PR13 review links were stale is superseded by the
`2026-05-16T16:29:17Z` branch-link audit, which verifies the repaired PR 13
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
| Seed `1020002` WebSocket marker divergence | Cycle 152 classifier report; completed `143821Z` repair report; completed `151306Z` state-vector/diff diagnostic; completed `153219Z` peer-client store-transition report; active `160617Z` sync-manager load/hydrate repair job | active final-stack blocker; classified as product divergence; page 0 stores peer client `353740376` as deleted `0..820` while relay/page 1 retain live marker-bearing structs; next owner narrowed to `@wordpress/sync` manager load/hydrate replay after provider-synced state | Consume `rtc-ws-seed-1020002-sync-manager-load-hydrate-repair-20260516T160617Z`, rerun focused seed `1020002`, then create a new narrow post-`PR15C` PR with a verified branch link before filing |
| PR 16 valid-block `originalContent` candidate | seed replay candidate only | blocked/deferred; latest split synthesis says it is not part of the filing stack | Replay and classify the seed before considering any product branch or verified branch link |
| HTTP smoke `rest_crdt_document_stale` | final-stack bootstrap repair reached one HTTP action before this signal | separate triage signal; not split coverage and not a final-stack fuzz pass | Classify separately after the seed `1020002` sync-manager repair/split decision |
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
3. Push/import and audit individual PR 5A/5B/5C, PR 8A, and PR 11A-E review
   branches, or keep the table rows marked `No verified branch link yet`.
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
9. Consume the active
   `rtc-ws-seed-1020002-sync-manager-load-hydrate-repair-20260516T160617Z`
   job before launching broad final-stack fuzz, extra fuzz lanes, reload
   diagnostics, PR13 repair/import, PR6B/PR6C work, old PR16 replay work, or
   another split-review loop.
10. After the new post-`PR15C` sync-manager repair PR exists, rebuild the
   combined stack from the 28-head known-fix prefix plus that new PR, rerun
   focused seed `1020002`, then rerun bounded final-stack validation against
   the rebuilt stack. Count it only if it reaches action-level product coverage.
11. Block filing if new visible likely-real failures appear.

Existing fuzz infrastructure can continue where healthy. The latest novelty and
trend evidence has `likely_real_max: 0`, `5` unmet goals, current-run triage
signatures `0`, current-run likely-real visible `0`, current-run duplicate
share `0`, historical duplicate share `0.5879`, summary startup failures `0`,
only `novelty-http-persistence-probe` enabled, no paused groups, `5`
successful current-run HTTP records, and browser-e2e execution at `52240`
cumulative / `596` per-hour in the trend packet. Treat the novelty, trend, and
remote status packets as useful
control-plane and fuzz-health evidence, not final-stack fuzz validation.
