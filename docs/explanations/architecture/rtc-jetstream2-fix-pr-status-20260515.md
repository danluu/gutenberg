# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T02:35:11Z`

Trigger event:
`duplicate-noise-2026-05-17T02-34-24Z-92`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/duplicate-noise-2026-05-17T02-34-24Z-92/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked for the final stack, but not all useful work is blocked.
The latest split-persona synthesis, `pr-split-20260517T021947Z-synthesis.md`,
classifies the stack as needing split change before filing and not ready for
final-stack fuzz. It keeps the PR6B sidecar topology, but replaces the old
polluted PR6B with a minimal two-file sidecar branch. Do not revive the older
linear `PR6B -> PR07A-PR15C` restack, the old post-`PR15C` `PR16` tail, or
stale malformed-save candidate refs.

PR6B remains the malformed outgoing save request-payload lane after PR06A. The
old `ready/rtc-pr06b-malformed-save-request-payload` at
`87e0ed20ab8eafdb6a6e814400da20a658a7331d` is historical only because it
includes unrelated `cc3d7bf663a` / `crdt-blocks.ts` work. The conflict-resolution
job now reports a replacement product branch:
`ready/rtc-pr06b-malformed-save-request-payload-minimal` at
`7b123e0ef2334a03b22e9a968d402de9da4c5379`, based on PR06A. Its validation-only
PR6B+PR15C sidecar head is
`validation/rtc-pr06b-minimal-plus-pr15c-sidecar-20260517T021111Z` at
`243411d461698180088b5280587b2fb7ad0ba8cd`. Treat the old
`validation/rtc-pr06b-plus-pr15c-sidecar-20260517T004623Z` head at
`0662b838eaf0961605a95ecb1bd83bd4713e33d3` as historical evidence only because
it contains the old polluted PR6B.

The minimal PR6B branch is still not file-ready. The synthesis says the
conflict job produced a nonempty report and bundles, but the finalization report
at `20260517T022000Z/finalization.report.md` was still zero bytes when checked,
and the isolated conflict job skipped unit tests, lint, and Prettier because
`node_modules` was absent. Import/fetch the minimal PR6B and validation bundles
into a dependency-equipped worktree, verify ancestry and exclusion of
`cc3d7bf663a` / `crdt-blocks.ts`, regenerate branch audit and push manifest, and
run focused `packages/core-data/src/test/actions.js`, touched-file lint,
Prettier, and `git diff --check`. The current GitHub branch-link audit still
has no `verified-content` row for PR6B, so PR6B must stay
`No verified branch link yet`.

PR17 remains the final-stack blocker, but only for PR17 settlement, rebuilt
combined validation, the focused seed `1020002` gate, final-stack fuzz, and
filing. The current nonempty PR17 report says local single-module
Yjs/y-protocols replay does not reproduce the deletion and the evidence is not
product-owned. The next PR17 decision is whether that medium-confidence
evidence is enough to reclassify seed `1020002`; if not, run exactly one
browser/provider ownership diagnostic that captures runtime Yjs/module
identity, the exact raw update entering `applyUpdate`, and the emitted doc
update before shaping any product branch. Active or newly launched `1020002`
work is not progress by itself while non-`1020002` rows remain actionable.

The current maintainer-facing recommendation is:

```text
ready PR01 -> PR02, with PR02A as a PR02 sidecar
-> PR03 -> PR04 -> PR05A/B/C -> PR06 -> PR06A
-> replacement PR6B malformed outgoing RTC save payloads as a PR06A sidecar
-> existing PR07A/B -> PR09 -> PR10 -> PR11A-E -> PR12
-> PR13A/B/C using repaired audited review refs until any finer PR13 split has
   verified branch links
-> PR14 -> PR15A/B/C
-> validation-only PR6B+PR15C integration head, not a product PR
-> PR17 seed 1020002 proof/reclassification/repair decision
-> reload/post-save persistence and rehydration evidence gate
-> rebuilt combined validation stack
-> focused 1020002 gate
-> final-stack fuzz and filing
```

The ready heads remain a known-fix prefix, not a complete filing stack. The
minimal PR6B replacement now has an isolated job branch, but it still needs
import verification, a current push manifest, tests/lint/formatting, regenerated
branch audit, and a verified GitHub branch link before filing. Do not file the
raw `deferred/rtc-malformed-save-payload-*`, old
`ready/rtc-pr06b-malformed-save-request-payload`, `candidate/rtc-pr16-*`, or
scratch `candidate/rtc-pr06b-*` heads as-is. They are evidence or fallback
labels, not current product PR links. The old `87e0ed20ab8` candidate contained
these request-payload commits plus extra `cc3d7bf663a` work that is now
split/drop-pending:

```text
8340c5d794a Avoid valid block originalContent in CRDT saves
008b7258fe4 Protect RTC saves from malformed evaluated content
```

The previous deterministic restack audit, blind linear-restack plan, and
default PR16 malformed-save tail are superseded by the PR6B sidecar topology,
unless the replacement PR6B import or rebuilt validation proves that route
unusable. Broader malformed post-save settlement residuals and sidecar seed
`7410076` stay deferred.

PR17 remains separate from PR6, PR13, PR15, PR16, reload hydration, pre-save
search/live-collapse, HTTP room isolation, and rich-text suffix work. Current
evidence still says the marker-bearing update reaches the relay/page 1 while
page 0 applies the remote client range as deleted, but the newest PR17 report
points away from product-owned single-module Yjs apply behavior and toward
browser/provider runtime ownership or reclassification.

Seed `5700084` is not a product PR candidate. The latest comparison classifies
it as PR5C-covered plus strict oracle/exact-content drift, not PR18A or PR5D.
Fresh strict-expansion residuals, such as invalid/deprecated/parser-stress
delete divergence around seed `5200021`, remain evidence-only source-reduction
inputs unless they are reduced to uncovered product behavior. Do not create
speculative PR18x branches.

The duplicate/noise evidence still classifies the remaining noise as fuzz
control-plane work, not product validation. The newest nonempty duplicate/noise
synthesis, `duplicate-noise-20260517T020802Z-synthesis.md`, says strict current
`pre_action_bootstrap_stall` consumption is mostly sealed, but historical
known-noise and completed analysis outcomes are not consistently fed back into
scheduling, triage watcher, live analysis, analysis tier, and deep analysis
tier. Its matching feedback action implemented the consumer-side control-plane
fixes: triage watcher now coalesces same seed/source candidates, novelty monitor
reads completed analysis/deep-analysis `likely_real` result JSON, and
analysis/deep family caps ignore inactive no-product completed jobs unless they
have visible `likely_real` results. The latest collected `raw/novelty-status.md`
has current-run real-user-editing records flowing, `0` current output-dir
signatures, `0` current visible likely-real signatures, `0` current quality
issues, and `0` current duplicate share. Historical duplicate/noise is still
large and reporting-only: historical top duplicate family share is about
`0.3524`, raw historical `pre_action_bootstrap_stall` share is about `0.5094`,
and completed historical likely-real visibility is now reported as `27`. The
latest trend packet still reports `likely_real_max: 0` and current duplicate
share `0`, while its newest load sample includes a transient load spike that
eased in the later monitor sample. Do not launch broad final-stack fuzz or file
PRs yet. Final filing still waits on PR6B minimal import/verification plus a
verified branch link, PR17 repair or reclassification, the reload/post-save
evidence gate, rebuilt combined validation, a focused `1020002` gate, and
final-stack fuzz over the rebuilt stack.

## Branch And Ref Status

The remote status input was generated at `2026-05-17T02:35:06Z`.

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

The branch-link audit was generated at `2026-05-17T02:35:11Z` from fetched
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
branch-link audit or explicitly says `No verified branch link yet`. The latest
split synthesis still points at a finer local PR13A/B0/B1/B2/B3 shape, but the
current audit only verifies the repaired PR13A/B/C review refs, so those remain
the maintainer-facing links in this report until finer PR13 rows have verified
branch links.

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
| PR 6B | Malformed outgoing RTC save request-payload guard, replacing old `ready/rtc-pr06b-malformed-save-request-payload` at `87e0ed20ab8` with `ready/rtc-pr06b-malformed-save-request-payload-minimal` at `7b123e0ef233` after PR06A | No verified branch link yet | TBD | TBD | PR06A sidecar remains the recommended topology; conflict resolution produced the minimal branch and validation-only `validation/rtc-pr06b-minimal-plus-pr15c-sidecar-20260517T021111Z` at `243411d46169`, but finalization was still zero-byte, unit/lint/Prettier were skipped in the isolated clone, and no GitHub `verified-content` branch link exists yet |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified branch; repaired split head |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified branch stacked after PR 7A; scoped to saved-CRDT-response hydration, not broader reload/post-save residuals |
| PR 8A | Narrow title reload replacement | No verified branch link yet | TBD | TBD | not in the current `20260517T021947Z` topology; broad verified PR 8 is prior art only, and any PR8A revival needs a shaped and audited branch |
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
| PR 17 | Seed `1020002` WebSocket/Yjs proof, reclassification, or repair | No verified branch link yet | TBD | TBD | active final-stack blocker; latest nonempty report says local single-module Yjs replay does not reproduce the deletion and current evidence is not product-owned, so decide whether to reclassify or run one browser/provider ownership diagnostic before shaping a product branch; do not let this serialize independent non-`1020002` work |
| PR 18x | Future strict-expansion or focused-shard residuals only if source-reduced to uncovered product behavior | No verified branch link yet | TBD | TBD | no current product PR; seed `5700084` is PR5C/oracle drift, and newer invalid/deprecated/parser-stress or nested/move/delete rows need source reduction before any PR18x branch is named |

Verified branches that are prior art or staging only:

- [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence)
  is verified content for old aggregate PR 5, not the recommended
  maintainer-facing split.
- [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record)
  is verified content for old broad PR 8, not an active filing unit.
- [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops)
  is verified content for old aggregate PR 11, but the active recommendation
  is the PR11A-E split.

## Bug Coverage By Proposed PR

"Fixed" below means fixed by the proposed branch when the row has a verified
branch link. Rows without a verified branch link are intended coverage claims
from local ready heads, validation-stack work, or active investigation; they
still need the branch-link and validation gates in the main PR split table
before filing.

| PR | Bugs fixed or intended to fix |
| --- | --- |
| PR 1 | Fixes HTTP polling sessions that generate or accept oversized update payloads, which can stall or corrupt sync state before clients converge. |
| PR 2 | Fixes HTTP polling storage reads that scan the wrong update window, so late or reconnecting pollers can miss needed updates or reprocess stale data. |
| PR 2A | Intended to fix the narrowed HTTP room-isolation regression where one post/session can observe or retain another room's polling state; broader HTTP residuals remain deferred until separately source-proven. |
| PR 3 | Fixes revision restore leaving stale `_crdt_document` metadata attached to restored content, which can make collaborators reload or save against the pre-restore CRDT state. It does not yet cover the separate seed `5500002` marker-retention follow-up. |
| PR 4 | Fixes repeated save/meta churn around persisted CRDT metadata, where equivalent saved RTC state can be treated as a new edit and feed stale save loops or unnecessary persistence writes. |
| PR 5A | Intended to fix entity/reference normalization false differences, where semantically equivalent entity references are treated as RTC content changes and can trigger avoidable save or merge churn. |
| PR 5B | Intended to fix parser/rich-text HTML equivalence false differences, where equivalent rich-text serialization is treated as a destructive CRDT delta instead of a no-op. |
| PR 5C | Intended to fix preserve-whitespace linebreak equivalence, including the `\n` versus `<br>` class represented by seed `5700084`; the current conclusion is that `5700084` is PR5C-covered plus strict-oracle drift, not a new product PR. |
| PR 6 | Fixes outgoing save requests built from stale, empty, or unsafe CRDT projections, including cases where the save payload can drop valid block content or repair from stale raw content incorrectly. Malformed evaluated-content residuals are split to PR6B. |
| PR 6A | Fixes persisted empty-content records overwriting a valid CRDT-backed post body, preserving the saved CRDT body when the REST/entity record is empty or incomplete. |
| PR 6B | Intended to fix malformed outgoing RTC save request payloads. The current replacement is the minimal two-file `ready/rtc-pr06b-malformed-save-request-payload-minimal` branch at `7b123e0ef233`, based on PR06A; it still needs import verification, tests/lint/formatting, regenerated audit/manifest evidence, and a verified GitHub branch link before filing. The old `87e0ed20ab8` branch is no longer file-ready because it carries extra `cc3d7bf663a` / `crdt-blocks.ts` work. |
| PR 7A | Fixes stale save-response actions overwriting newer RTC entity/block state, including base-version regressions and stale block content returned by delayed saves. |
| PR 7B | Fixes save-response manager/base-record handling that can invalidate or overwrite newer CRDT-backed state, especially stale title/base-record updates after a save completes. It does not cover same-user stale-tab or broader reload/post-save persistence residuals. |
| PR 8A | If revived, would cover only a narrowed title reload/persisted-record replacement bug. The broad PR8 branch is prior art and no active PR8A filing unit is currently verified. |
| PR 9 | Fixes core-data store lock unfairness where older pending locks can be bypassed by newer work, allowing stale or out-of-order entity operations to win. |
| PR 10 | Fixes the CRDT block reconciliation foundation for stale block identity rebasing, preventing local stale snapshots from applying edits to the wrong logical block after remote structural changes. |
| PR 11A | Intended to fix explicit-base stale suffix append failures, where a stale local suffix append can drop or reorder remote top-level block changes. |
| PR 11B | Intended to fix explicit-base top-level delete failures, where a stale local snapshot mishandles a remote or concurrent top-level block deletion. |
| PR 11C | Intended to fix explicit-base middle insert failures, preserving remote top-level order when a local stale snapshot inserts into the middle of the block list. |
| PR 11D | Intended to fix explicit-base top-level move/reorder failures, preventing stale snapshots from undoing or corrupting remote block reorders. |
| PR 11E | Intended to fix explicit-base delete-plus-insert anchor failures, where a delete and insert in the same stale-base window can attach to the wrong block position. |
| PR 12 | Fixes previous-local-cache top-level block operations: remote top-level appends, deletes, and reorders must not be lost or resurrected when a stale local snapshot edits a different block. |
| PR 13A | Fixes observed-delete provenance for top-level blocks, preventing a stale local merge from resurrecting a block after this client has already observed the remote delete. |
| PR 13B | Fixes cross-parent source retirement, preventing moved blocks from leaving source-side ghosts or duplicate content after cross-parent/current-only or explicit-base moves. |
| PR 13C | Fixes stale block identity smear, where stale identity data can cause later edits or deletes to affect the wrong block after reconciliation. |
| PR 14 | Fixes nested table-body/query-array stale local merges, preserving remote table row/cell array edits instead of replacing the nested array with an older local shape. |
| PR 15A | Fixes fallback-group move/reorder stale merges, where block groups without a better explicit identity fallback can reorder incorrectly under stale local snapshots. |
| PR 15B | Fixes fallback-group insert-anchor stale merges, preserving the intended insertion anchor when local stale state and remote structural edits interact. |
| PR 15C | Fixes fallback-group delete stale merges, preventing fallback-group deletes from resurrecting or deleting the wrong grouped blocks under stale local state. |
| PR 17 | Not fixed yet. This row owns seed `1020002` only if browser/provider diagnostics prove a WordPress-owned WebSocket/Yjs marker divergence; otherwise the current evidence points toward reclassification or deferral rather than a product PR. |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-17T02:35:06Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T020817Z
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
stack because PR02A still needs a verified review branch, PR6B still needs
replacement and a verified branch link, PR17 still needs a
repair/reclassification decision, and the rebuilt validation stack has not
been rerun over those final decisions.

The collected `raw/novelty-status.md` was updated at
`2026-05-17T02:32:36.716Z`:

```text
coverage files: 38393
total records seen: 59144
unmet goals: 6
current-run records by profile: {"real-user-editing":13}
current-run successful records by profile: {"real-user-editing":13}
current output-dir signatures: 0
current likely-real visible: 0
historical likely-real visible: 27
quality issues: 0
load1: 78.29 / 64 cores
memory: 422.9G free / 492.0G total
headroom for adding groups: no
```

The enabled group in the raw monitor is:

```text
novelty-ws-real-user-editing
```

Paused groups are `novelty-http-persistence-probe`,
`novelty-ws-persistence-no-title`, `novelty-ws-lifecycle`, and
`novelty-ws-real-user-rich-text`. The rich-text group is paused by the
supervisor `paused-startup-stall` guard with zero product-evidence records in
that startup window. The monitor keeps open-ended coverage Codex held because
historical raw `pre_action_bootstrap_stall` noise still dominates observed
prior roots, but current-run triage is clean: `0` current signatures, `0`
current likely-real visible, `0` current duplicate share, and `0` current
quality issues.

The latest trend evidence packet was generated at `2026-05-17T02:26:48Z` from
monitor data through `2026-05-17T02:25:22Z`:

```text
monitor passes: 1803
coverage files: 272 -> 38370
coverage files delta: 38098
unmet coverage goals: 24 -> 6
likely_real_max: 0
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3524
summary_startup_failures_last: 0
quality_issues_last: 0
fuzz level mix: browser-e2e=26 lanes/26 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 2963852
browser-e2e execution: 94837 cumulative / 900 per-hour
unit-property execution: 2567412 cumulative / 154112 per-hour
coverage-guided-lower-level execution: 298597 cumulative / 24832 per-hour
load1/load5/load15: 50.5 / 49.67 / 81.33 on 64 cores
memory: 427.8G free
```

Largest remaining coverage gaps in the trend evidence are
`ui-heading-shortcut` `697/1000`, `reload-post-action` `697/1000`,
title-save-reload `269/500`, body-save-reload `328/500`,
successful real-user-editing records `409/500`, and `ui-format-paragraph`
`980/1000`.

The `0` likely-real trend and raw-monitor result is useful health evidence,
not final-stack validation and not a filing unblocker. Historical
duplicate/noise remains a separate control-plane concern and must not be
presented as current product failure. The latest duplicate/noise action
implemented consumer-side source coalescing, completed-analysis
`likely_real` visibility, and inactive/no-product family-cap filtering. The
newer raw monitor has advanced the real-user gaps to title-save-reload
`274/500`, body-save-reload `333/500`, reload-post-action `702/1000`,
`ui-heading-shortcut` `702/1000`, successful real-user-editing records
`414/500`, and `ui-format-paragraph` `985/1000`.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T021947Z-synthesis.md`. It says the stack needs split change:
replace the polluted old PR6B with the minimal PR06A sidecar at
`7b123e0ef233`, use `243411d46169` only as PR6B+PR15C validation evidence, and
keep PR17/seed `1020002` as a final-stack blocker only. Independent PR6B
import, branch audit, manifest refresh, reload residual reduction, deferred
downscope, and loop hardening should continue instead of waiting on active
`1020002` work.

The latest PR-split feedback action,
`pr-split-20260517T021947Z-feedback-action.md`, is nonempty and applied the
latest two-review feedback. It updated `current-pr-split.md` with the Cycle 222
review update, replaced the polluted old PR6B with
`ready/rtc-pr06b-malformed-save-request-payload-minimal` at `7b123e0ef233`,
marked `validation/rtc-pr06b-minimal-plus-pr15c-sidecar-20260517T021111Z` at
`243411d46169` as validation evidence only, kept old PR6B/PR16/deferred
malformed-save heads historical, preserved the rule that seed `1020002` blocks
only PR17/final-stack work, repaired deferred queue downscope rows, and wrote
current-run PR6B branch-audit and push-manifest artifacts for the local machine.
It recorded this completed loop-repair job:

```text
rtc-cycle222-loop-repair-20260517T023022Z: completed rc 0; verified queue
downscope rows, loop syntax, generator hardening, and current PR6B
manifest/audit artifacts
```

The current synthesis read the conflict-resolution job as nonempty and producing
the minimal branch plus validation bundle, but canonical import and validation
remain open because the finalization report was still zero bytes and
dependency-backed tests/lint/formatting were skipped in the isolated clone. The
active reload/post-save replay remains the independent product-evidence lane;
no duplicate replay should launch while
`rtc-reload-postsave-replay-20260517T013904Z` is still active.

The newest nonempty duplicate/noise synthesis is
`duplicate-noise-20260517T020802Z-synthesis.md`, and its feedback action is now
the latest implemented duplicate/noise patch. It updated
`bin/rtc-browser-fuzz-triage-watcher.mjs`,
`bin/rtc-browser-fuzz-novelty-monitor.mjs`,
`bin/rtc-browser-fuzz-analysis-tier.mjs`, and
`bin/rtc-browser-fuzz-deep-analysis-tier.mjs` in the remote fuzz repo. The
changes coalesce same seed/source candidates before signature creation, prefer
product-evidence/artifact-rich candidates over disabled inline-analysis or
summary-only duplicates, count completed analysis/deep-analysis `likely_real`
JSON in novelty summaries, and keep inactive/no-product completed jobs out of
family caps unless they have visible `likely_real` results.

Validation for that duplicate/noise action passed `node --check` on all touched
scripts. A historical replay of the leaking `20260517T014736Z` roots retained
one product-evidence signature per source, and novelty replay reported
`likely-real visible: 2` for that observed root with actionable duplicate share
`0`. The action restarted only `rtc-coverage-guided-novelty`; live analysis was
already skipping because there were no actionable signatures. The current raw
monitor now shows `0` current raw signatures, `0` current actionable signatures,
`0` current likely-real visible, `0` current duplicate share, no active
analysis/deep-analysis state files, and historical likely-real visible `27`.
The remaining risk is runner-side emission of an initial strict startup record
before the supervisor pauses a noisy group. This is control-plane work only and
must not be presented as product validation.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older
"keep existing split", "do not add PR6B", "only novelty-http is enabled", and
stale PR13 review-ref warnings are superseded by the
`2026-05-17T02:35:11Z` branch-link audit, the current nonempty raw novelty
status, the latest trend packet, and the latest split syntheses.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Malformed-save request-payload PR6B | Old `ready/rtc-pr06b-malformed-save-request-payload` at `87e0ed20ab8`; minimal replacement `ready/rtc-pr06b-malformed-save-request-payload-minimal` at `7b123e0ef233`; validation-only `validation/rtc-pr06b-minimal-plus-pr15c-sidecar-20260517T021111Z` at `243411d46169`; split/drop-pending `cc3d7bf663a`; completed reconcile report `runs/20260517T015400Z/jobs/outputs/rtc-pr06b-minimal-reconcile-20260517T020421Z/report.md`; conflict report `runs/20260517T015400Z/jobs/outputs/rtc-pr06b-minimal-conflict-resolve-20260517T021111Z/report.md`; zero-byte finalization report `20260517T022000Z/finalization.report.md`; old validation-only head `validation/rtc-pr06b-plus-pr15c-sidecar-20260517T004623Z` at `0662b838eaf0961605a95ecb1bd83bd4713e33d3` | active recommended topology after PR6A as an explicit sidecar; minimal replacement exists in the job output, but no current GitHub `verified-content` branch-link audit row exists, finalization was still zero-byte, and dependency-backed tests/lint/formatting were skipped; the old PR6B+PR15C validation head is historical only because it contains the polluted PR6B | Import/fetch the minimal PR6B and validation bundles into the fix-plan repo or dependency-equipped validation worktree; verify ancestry, containment, and exclusion of `cc3d7bf663a` / `crdt-blocks.ts`; regenerate branch audit, push manifest, range-diff, diffstat, and numstat; run focused `packages/core-data/src/test/actions.js`, touched-file lint, Prettier, and `git diff --check`, then decide PR17 and rebuild combined validation |
| Malformed post-save settlement residuals and sidecar | `f51c425df8a5`, `f46859898576`, `7410076` | deferred/evidence-only; not part of PR6B or PR16 unless separately source-proven | Keep source-reducing; promote only with clean local source evidence and a verified branch link |
| Seed `1020002` WebSocket marker divergence | marker-bearing relay/page-1 evidence plus latest nonempty PR17 report saying local single-module Yjs replay does not reproduce the deletion and current evidence is not product-owned | active PR17/final-stack blocker; no verified filing branch exists | Decide whether the report is enough to reclassify. If not, run one browser/provider ownership diagnostic with runtime fingerprints and exact raw update capture; then repair, reclassify, or defer |
| Seed `5700084` strict linebreak divergence | live `core/verse.attributes.content` `\n` vs `<br>` comparison | no product PR and no active PR18x row; classified as PR5C-covered plus strict oracle/exact-content drift | Downscope/update the strict oracle; do not create PR18A or PR5D for this seed |
| Fresh strict-expansion residuals | invalid/deprecated/parser-stress delete divergence such as seed `5200021`; nested/move/delete focused-shard residual clusters | source-reduction input only; no current PR18x branch and no verified branch link | Source-reduce and compare against PR5, PR11, PR13, PR14, PR15, PR17, and existing parser/oracle coverage before naming any PR18x product branch |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit and not in the current `20260517T021947Z` topology | Shape and audit a narrowed title-reload branch only if PR 8A is revived |
| Reload hydration empty live editor / broader reload-post-save sync loss | active/latest deferred candidate `deferred/rtc-reload-hydration-20260517T010615Z`; replay job `rtc-reload-postsave-replay-20260517T013904Z`; replay seeds `5300002`, `5700013`, `5200005`, `5200009`, and `6000004` or `6000005`; prior row `20260516T233554Z` plus older gate branches | evidence-only; not in PR 6, PR 6A, PR 8A, PR 15, or fallback-group claims; latest split synthesis says the current replay output still needs a nonempty report | Promote only if a clean replay classifies each seed with command evidence and, for product rows, reaches the post-reload assertion with live editor state, REST body, persisted `_crdt_document`, provider phase, provider-synced skip path, and update/application witnesses |
| Pre-save search/live document collapse | latest deferred row `20260516T233555Z` plus prior pre-save search/live-collapse candidate rows | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Rich-text formatted suffix corruption | current diagnostic publication candidate `20260516T235057Z` plus prior `deferred/rtc-rich-text-formatted-suffix-20260516T230547Z` | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Broader HTTP polling room-isolation residuals | HTTP downscope row `20260516T232052Z`; PR02A has no verified branch link yet | PR02A remains in the known-fix prefix and points back to `ready/rtc-pr02a-http-room-isolation-regression`, but broader residuals stay deferred | Publish/fetch/audit a PR02A review branch before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack blockers; no automatic PR slot | Triage only after `1020002` is repaired or reclassified and the rebuilt stack is available |
| Duplicate/noise control-plane leak | latest synthesis and implemented action `duplicate-noise-20260517T020802Z-*`; active root now `run-20260517T020817Z`; action artifacts `duplicate-noise-remediation-cycle-92.patch`, `.stat.txt`, and `-status.md` | control-plane issue, not product validation; the cycle-92 action updated triage watcher, novelty monitor, analysis tier, and deep-analysis tier so same-source duplicates coalesce, completed `likely_real` analyses are visible, and inactive/no-product completed jobs do not consume family caps; latest raw monitor shows `0` current output-dir signatures, `0` current visible likely-real signatures, current-run real-user records flowing, historical duplicate share about `0.3524`, raw historical startup share about `0.5094`, historical likely-real visible `27`, and `0` current quality issues | Remaining risk is runner-side initial strict startup emission before supervisor pause; continue only bounded control-plane hardening, preserving all product-evidence failures and keeping product PR validation separate |

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
4. Publish/fetch and audit PR02A plus individual PR 5A/5B/5C, PR11A-E, and
   PR6B, plus PR 8A only if it is revived and shaped, or keep rows marked
   `No verified branch link yet`.
5. Use the repaired audited PR13A/B/C review refs for maintainer-facing PR13
   links until any finer PR13 subheads have verified audit rows.
6. Finish PR6B import verification before filing. The minimal replacement
   branch now exists as
   `ready/rtc-pr06b-malformed-save-request-payload-minimal` at
   `7b123e0ef233`, and the validation-only PR6B+PR15C head exists at
   `243411d46169`, but the finalization report was zero-byte and the isolated
   job skipped unit tests, lint, and Prettier. Import/fetch the bundles into a
   dependency-equipped worktree, verify ancestry and exclusion of `cc3d7bf663a`
   / `crdt-blocks.ts`, regenerate PR6B+PR15C validation-only evidence and a
   non-placeholder push manifest, and keep the old PR16 fallback superseded
   unless PR6B import or rebuilt combined validation fails. Require a clean ref,
   sidecar manifest/validation evidence, focused tests, lint, formatting, build,
   `git diff --check`, seed replay evidence, branch audit, explicit inclusion
   beside the existing PR15C chain, and a verified branch link before filing it.
7. Consume the latest PR17 report. If medium-confidence "not product-owned"
   evidence is enough, reclassify seed `1020002`; otherwise run one focused
   browser/provider ownership diagnostic with runtime fingerprints and exact
   raw update capture. Require seed `1020002` to pass or be explicitly
   reclassified, then shape PR17 and add a verified branch link only if a
   product branch is still warranted.
8. Treat `5700084` as PR5C-covered plus strict oracle/exact-content drift. Do
   not name PR18A or PR5D from that seed. Source-reduce fresh strict-expansion
   residuals, including invalid/deprecated/parser-stress delete divergence such
   as seed `5200021`, and nested/move/delete focused-shard residuals before
   naming any PR18x branch; compare against PR5, PR11, PR13, PR14, PR15, and
   PR17 first.
9. Rebase or recreate each intended PR branch on the intended upstream base if
   that base moves.
10. Regenerate branch graph/containment evidence and adjacent
    range-diffs/diffstats from the actual filing repo.
11. Rerun focused checks, touched-file lint, and `git diff --check` on every
    imported/rebased branch.
12. Keep dirty analysis-only artifacts out of product PR branches.
13. Rebuild the combined stack from explicit PR01-PR06A heads, PR02A, PR6B as
    a sidecar, the existing PR07A-PR15C chain, the PR17 `1020002` decision, and
    any accepted source-reduced residual branches. Rerun bounded final-stack
    validation against the rebuilt stack and count it only if it reaches
    action-level product coverage and proves PR6B was included.
14. Block filing if new visible likely-real failures appear.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after the environment preflight is healthy. Do not
run broad/final-stack fuzz while PR6B import/verification, the PR17 decision, the
reload/post-save evidence gate, rebuilt validation, and branch-link audits are
open. The latest trend packet reports `likely_real_max: 0`, and this run's
`raw/novelty-status.md` also shows `0` current visible likely-real signatures
with current-run real-user-editing records flowing and `0` current quality
issues. The duplicate/noise evidence keeps current noise classified as
control-plane work. None of that is final-stack fuzz validation or a filing
unblocker.
