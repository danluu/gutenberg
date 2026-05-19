# RTC Jetstream2 Maintainer PR Snapshot

Snapshot time: `2026-05-19T17:01:21Z`

This is a one-time maintainer review snapshot of the current best RTC fix
split. No GitHub pull requests have been opened from this document. The linked
branches are pushed to `danluu/gutenberg` under the snapshot prefix
`rtc-pr-stack-20260519T161502Z-*`.

The branch links were verified with:

```text
git ls-remote --heads danluu 'rtc-pr-stack-20260519T161502Z-*'
```

That command returned `61` heads: the finalized branch set plus one merged test
branch.

Source status report:
[`rtc-jetstream2-fix-pr-status-20260515.md`](https://github.com/danluu/gutenberg/blob/explain/rtc-jetstream2-fuzz-progress-20260515/docs/explanations/architecture/rtc-jetstream2-fix-pr-status-20260515.md)

## Merged Test Branch

Maintainers who want to test the current reviewable code together should use:

- Branch:
  [`rtc-pr-stack-20260519T161502Z-all-ready-merged`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-all-ready-merged)
- Compare against the snapshot base:
  [`base...all-ready-merged`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-base...rtc-pr-stack-20260519T161502Z-all-ready-merged)
- Diff size against base: `24 files, +10022 / -314`

This merged branch starts from `PR15C` and merges the reviewable/support side
branches `PR02A`, `PR06E`, `HARNESS-WS-CONFIG-022004`, and the current
validation regression branch. It intentionally excludes blocked, candidate, and
diagnostic artifact refs.

## Suggested Review Order

Main lane:
`PR01 -> PR02 -> PR03 -> PR04 -> PR05A -> PR05B -> PR05C -> PR05D -> PR06A -> PR06B -> PR06C -> PR06D`

Side/support lane:
`PR02A`, `PR06E`, `HARNESS-WS-CONFIG-022004`, validation regression

CRDT/data-loss lane:
`PR09 -> PR10 -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E -> PR12A -> PR12B -> PR12C -> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3 -> PR14 -> PR14B -> PR15A -> PR15B -> PR15C`

## Main Lane

Files/diff is the adjacent diff for the linked compare.

| Review unit | Scope / bug fixed | Compare | Head branch | Files / diff | Commit(s) |
| --- | --- | --- | --- | --- | --- |
| PR01 | Guard generated HTTP polling update size | [`base...PR01`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-base...rtc-pr-stack-20260519T161502Z-pr01-http-generated-update-size) | [`rtc-pr-stack-20260519T161502Z-pr01-http-generated-update-size`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr01-http-generated-update-size) | 2 files, +181 / -19 | `20d1b80a98d` |
| PR02 | Bound HTTP polling storage reads | [`PR01...PR02`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr01-http-generated-update-size...rtc-pr-stack-20260519T161502Z-pr02-http-storage-read-window) | [`rtc-pr-stack-20260519T161502Z-pr02-http-storage-read-window`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr02-http-storage-read-window) | 2 files, +57 / -5 | `d32ba161ddd` |
| PR03 | Reset CRDT document metadata on revision restore | [`PR02...PR03`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr02-http-storage-read-window...rtc-pr-stack-20260519T161502Z-pr03-revision-restore-crdt-reset) | [`rtc-pr-stack-20260519T161502Z-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr03-revision-restore-crdt-reset) | 2 files, +58 / -5 | `c7b66e9751f` |
| PR04 | Stabilize persisted CRDT save metadata | [`PR03...PR04`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr03-revision-restore-crdt-reset...rtc-pr-stack-20260519T161502Z-pr04-crdt-save-meta-idempotence) | [`rtc-pr-stack-20260519T161502Z-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr04-crdt-save-meta-idempotence) | 2 files, +160 / -1 | `f0a15247ab1` |
| PR05A | Entity/reference normalization equivalence | [`PR04...PR05A`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr04-crdt-save-meta-idempotence...rtc-pr-stack-20260519T161502Z-pr05a-entity-reference-normalization) | [`rtc-pr-stack-20260519T161502Z-pr05a-entity-reference-normalization`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr05a-entity-reference-normalization) | 2 files, +465 / -8 | `09d3c718487`, `a9094aa9444` |
| PR05B | Parser/rich-text HTML equivalence | [`PR05A...PR05B`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr05a-entity-reference-normalization...rtc-pr-stack-20260519T161502Z-pr05b-parser-rich-text-equivalence) | [`rtc-pr-stack-20260519T161502Z-pr05b-parser-rich-text-equivalence`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr05b-parser-rich-text-equivalence) | 2 files, +925 / -42 | `e1fda090dce` |
| PR05C | Preserve whitespace/linebreak equivalence | [`PR05B...PR05C`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr05b-parser-rich-text-equivalence...rtc-pr-stack-20260519T161502Z-pr05c-preserve-whitespace-linebreak-equivalence) | [`rtc-pr-stack-20260519T161502Z-pr05c-preserve-whitespace-linebreak-equivalence`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr05c-preserve-whitespace-linebreak-equivalence) | 2 files, +287 / -15 | `6a2eba716e0` |
| PR05D | Semicolonless entity equivalence | [`PR05C...PR05D`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr05c-preserve-whitespace-linebreak-equivalence...rtc-pr-stack-20260519T161502Z-pr05d-semicolonless-entity-equivalence) | [`rtc-pr-stack-20260519T161502Z-pr05d-semicolonless-entity-equivalence`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr05d-semicolonless-entity-equivalence) | 2 files, +33 / -0 | `27c6e792421` |
| PR06A | Guard empty CRDT block saves | [`PR05D...PR06A`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr05d-semicolonless-entity-equivalence...rtc-pr-stack-20260519T161502Z-pr06a-empty-crdt-block-save-guard) | [`rtc-pr-stack-20260519T161502Z-pr06a-empty-crdt-block-save-guard`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr06a-empty-crdt-block-save-guard) | 2 files, +116 / -0 | `705d84c03b9` |
| PR06B | Repair stale raw save payloads | [`PR06A...PR06B`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr06a-empty-crdt-block-save-guard...rtc-pr-stack-20260519T161502Z-pr06b-stale-raw-save-payload-repair) | [`rtc-pr-stack-20260519T161502Z-pr06b-stale-raw-save-payload-repair`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr06b-stale-raw-save-payload-repair) | 2 files, +344 / -1 | `d127d3d2422` |
| PR06C | Guard save projection content | [`PR06B...PR06C`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr06b-stale-raw-save-payload-repair...rtc-pr-stack-20260519T161502Z-pr06c-save-projection-content-guard) | [`rtc-pr-stack-20260519T161502Z-pr06c-save-projection-content-guard`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr06c-save-projection-content-guard) | 2 files, +278 / -5 | `d4041cccdd4` |
| PR06D | Guard persisted empty content | [`PR06C...PR06D`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr06c-save-projection-content-guard...rtc-pr-stack-20260519T161502Z-pr06d-persisted-empty-content-guard) | [`rtc-pr-stack-20260519T161502Z-pr06d-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr06d-persisted-empty-content-guard) | 2 files, +63 / -0 | `e0724015e95` |

## Sidecars And Support

| Review unit | Scope | Compare | Head branch | Files / diff | Commit(s) |
| --- | --- | --- | --- | --- | --- |
| PR02A | HTTP room-isolation regression test | [`PR02...PR02A`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr02-http-storage-read-window...rtc-pr-stack-20260519T161502Z-sidecar-pr02a-http-room-isolation-test) | [`rtc-pr-stack-20260519T161502Z-sidecar-pr02a-http-room-isolation-test`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-sidecar-pr02a-http-room-isolation-test) | 1 file, +115 / -0 | `9303a7715cf` |
| PR06E | Malformed save payload sidecar | [`PR06D...PR06E`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr06d-persisted-empty-content-guard...rtc-pr-stack-20260519T161502Z-sidecar-pr06e-malformed-save-payload-sidecar) | [`rtc-pr-stack-20260519T161502Z-sidecar-pr06e-malformed-save-payload-sidecar`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-sidecar-pr06e-malformed-save-payload-sidecar) | 2 files, +272 / -4 | `ab31a873f5f` |
| HARNESS-WS-CONFIG-022004 | WebSocket harness runtime config by host | [`base...harness`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-base...rtc-pr-stack-20260519T161502Z-harness-ws-runtime-config-host-map-022004) | [`rtc-pr-stack-20260519T161502Z-harness-ws-runtime-config-host-map-022004`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-harness-ws-runtime-config-host-map-022004) | 2 files, +180 / -6 | `e8c05fad712` |
| Validation | Local delete rebase regression on current PR15C | [`PR15C...validation`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr15c-fallback-group-delete-reconciliation...rtc-pr-stack-20260519T161502Z-artifact-validation-local-delete-rebase-regression-on-current-pr15c) | [`rtc-pr-stack-20260519T161502Z-artifact-validation-local-delete-rebase-regression-on-current-pr15c`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-artifact-validation-local-delete-rebase-regression-on-current-pr15c) | 1 file, +43 / -1 | `b289f8f216a` |

## CRDT/Data-Loss Lane

| Review unit | Scope / bug fixed | Compare | Head branch | Files / diff | Commit(s) |
| --- | --- | --- | --- | --- | --- |
| PR09 | Core-data store lock fairness | [`PR06D...PR09`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr06d-persisted-empty-content-guard...rtc-pr-stack-20260519T161502Z-pr09-store-lock-fairness) | [`rtc-pr-stack-20260519T161502Z-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr09-store-lock-fairness) | 2 files, +185 / -2 | `981efcd9a1c` |
| PR10 | CRDT block rebase foundation | [`PR09...PR10`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr09-store-lock-fairness...rtc-pr-stack-20260519T161502Z-pr10-crdt-block-rebase-foundation) | [`rtc-pr-stack-20260519T161502Z-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr10-crdt-block-rebase-foundation) | 2 files, +138 / -0 | `b526674e1a1` |
| PR11A | Stale-base suffix append | [`PR10...PR11A`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr10-crdt-block-rebase-foundation...rtc-pr-stack-20260519T161502Z-pr11a-stale-base-suffix-append) | [`rtc-pr-stack-20260519T161502Z-pr11a-stale-base-suffix-append`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr11a-stale-base-suffix-append) | 2 files, +257 / -3 | `9376ea9ce79` |
| PR11B | Stale-base top-level delete | [`PR11A...PR11B`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr11a-stale-base-suffix-append...rtc-pr-stack-20260519T161502Z-pr11b-stale-base-top-level-delete) | [`rtc-pr-stack-20260519T161502Z-pr11b-stale-base-top-level-delete`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr11b-stale-base-top-level-delete) | 2 files, +240 / -2 | `3d228d0604a` |
| PR11C | Stale-base middle insert | [`PR11B...PR11C`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr11b-stale-base-top-level-delete...rtc-pr-stack-20260519T161502Z-pr11c-stale-base-middle-insert) | [`rtc-pr-stack-20260519T161502Z-pr11c-stale-base-middle-insert`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr11c-stale-base-middle-insert) | 2 files, +220 / -0 | `eb029803ae9` |
| PR11D | Stale top-level move/reorder | [`PR11C...PR11D`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr11c-stale-base-middle-insert...rtc-pr-stack-20260519T161502Z-pr11d-stale-top-level-move-reorder) | [`rtc-pr-stack-20260519T161502Z-pr11d-stale-top-level-move-reorder`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr11d-stale-top-level-move-reorder) | 2 files, +259 / -0 | `0f1895180ab` |
| PR11E | Insert anchor after delete | [`PR11D...PR11E`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr11d-stale-top-level-move-reorder...rtc-pr-stack-20260519T161502Z-pr11e-insert-anchor-after-delete) | [`rtc-pr-stack-20260519T161502Z-pr11e-insert-anchor-after-delete`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr11e-insert-anchor-after-delete) | 2 files, +170 / -0 | `75e0653fcae` |
| PR12A | Previous-local block deletes | [`PR11E...PR12A`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr11e-insert-anchor-after-delete...rtc-pr-stack-20260519T161502Z-pr12a-previous-local-block-deletes) | [`rtc-pr-stack-20260519T161502Z-pr12a-previous-local-block-deletes`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr12a-previous-local-block-deletes) | 2 files, +256 / -1 | `fa13d1bd3b3` |
| PR12B | Previous-local block reorders | [`PR12A...PR12B`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr12a-previous-local-block-deletes...rtc-pr-stack-20260519T161502Z-pr12b-previous-local-block-reorders) | [`rtc-pr-stack-20260519T161502Z-pr12b-previous-local-block-reorders`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr12b-previous-local-block-reorders) | 2 files, +298 / -1 | `80d6a4bc8ab` |
| PR12C | Previous-local delete reorders | [`PR12B...PR12C`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr12b-previous-local-block-reorders...rtc-pr-stack-20260519T161502Z-pr12c-previous-local-delete-reorders) | [`rtc-pr-stack-20260519T161502Z-pr12c-previous-local-delete-reorders`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr12c-previous-local-delete-reorders) | 2 files, +332 / -0 | `95d3a046bab` |
| PR13A | Observed-delete provenance | [`PR12C...PR13A`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr12c-previous-local-delete-reorders...rtc-pr-stack-20260519T161502Z-pr13a-observed-delete-provenance) | [`rtc-pr-stack-20260519T161502Z-pr13a-observed-delete-provenance`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr13a-observed-delete-provenance) | 2 files, +1151 / -25 | `65fd61e8cae` |
| PR13B0 | Identity provenance guard | [`PR13A...PR13B0`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr13a-observed-delete-provenance...rtc-pr-stack-20260519T161502Z-pr13b0-identity-provenance-guard) | [`rtc-pr-stack-20260519T161502Z-pr13b0-identity-provenance-guard`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr13b0-identity-provenance-guard) | 2 files, +362 / -50 | `4a320dfd291`, `db5704f15b8` |
| PR13B1 | Direct source retirement | [`PR13B0...PR13B1`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr13b0-identity-provenance-guard...rtc-pr-stack-20260519T161502Z-pr13b1-direct-source-retirement) | [`rtc-pr-stack-20260519T161502Z-pr13b1-direct-source-retirement`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr13b1-direct-source-retirement) | 2 files, +482 / -0 | `05815ca6d4b` |
| PR13B2 | Current-only source retirement | [`PR13B1...PR13B2`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr13b1-direct-source-retirement...rtc-pr-stack-20260519T161502Z-pr13b2-current-only-source-retirement) | [`rtc-pr-stack-20260519T161502Z-pr13b2-current-only-source-retirement`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr13b2-current-only-source-retirement) | 2 files, +410 / -0 | `966c9a6d070` |
| PR13B3 | Explicit-base source retirement | [`PR13B2...PR13B3`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr13b2-current-only-source-retirement...rtc-pr-stack-20260519T161502Z-pr13b3-explicit-base-source-retirement) | [`rtc-pr-stack-20260519T161502Z-pr13b3-explicit-base-source-retirement`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr13b3-explicit-base-source-retirement) | 2 files, +758 / -0 | `493a9984e3d` |
| PR14 | Table body array reconciliation | [`PR13B3...PR14`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr13b3-explicit-base-source-retirement...rtc-pr-stack-20260519T161502Z-pr14-table-body-array-reconciliation) | [`rtc-pr-stack-20260519T161502Z-pr14-table-body-array-reconciliation`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr14-table-body-array-reconciliation) | 2 files, +287 / -14 | `71c86db4a7f` |
| PR14B | Table/query array suffix append | [`PR14...PR14B`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr14-table-body-array-reconciliation...rtc-pr-stack-20260519T161502Z-pr14b-table-query-array-suffix-append) | [`rtc-pr-stack-20260519T161502Z-pr14b-table-query-array-suffix-append`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr14b-table-query-array-suffix-append) | 2 files, +143 / -3 | `d92908665c9` |
| PR15A | Fallback group move reconciliation | [`PR14B...PR15A`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr14b-table-query-array-suffix-append...rtc-pr-stack-20260519T161502Z-pr15a-fallback-group-move-reconciliation) | [`rtc-pr-stack-20260519T161502Z-pr15a-fallback-group-move-reconciliation`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr15a-fallback-group-move-reconciliation) | 2 files, +107 / -0 | `cde8c391cbe` |
| PR15B | Fallback group insert anchor | [`PR15A...PR15B`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr15a-fallback-group-move-reconciliation...rtc-pr-stack-20260519T161502Z-pr15b-fallback-group-insert-anchor) | [`rtc-pr-stack-20260519T161502Z-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr15b-fallback-group-insert-anchor) | 2 files, +172 / -0 | `6823e04302f`, `a25a7bc4266` |
| PR15C | Fallback group delete reconciliation | [`PR15B...PR15C`](https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T161502Z-pr15b-fallback-group-insert-anchor...rtc-pr-stack-20260519T161502Z-pr15c-fallback-group-delete-reconciliation) | [`rtc-pr-stack-20260519T161502Z-pr15c-fallback-group-delete-reconciliation`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-pr15c-fallback-group-delete-reconciliation) | 2 files, +117 / -0 | `062e2a198ec` |

## Linked Artifacts Not In The Review Stack

These refs are linked so the code is not hidden behind "no branch link"
language. They are not part of the recommended maintainer PR stack above.
Blocked/candidate/diagnostic labels mean the branch is evidence, a replay
candidate, or investigation support rather than a fileable product PR.

| Artifact | Branch |
| --- | --- |
| Blocked reload hydration block-content invalidation, `060902` | [`rtc-pr-stack-20260519T161502Z-artifact-blocked-pr16-reload-hydration-block-content-invalidation-060902`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-artifact-blocked-pr16-reload-hydration-block-content-invalidation-060902) |
| Blocked reload hydration save snapshot before persist, `063921` | [`rtc-pr-stack-20260519T161502Z-artifact-blocked-pr16-reload-hydration-save-snapshot-before-persist-063921`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-artifact-blocked-pr16-reload-hydration-save-snapshot-before-persist-063921) |
| Candidate reload hydration block-content invalidation, `072949` | [`rtc-pr-stack-20260519T161502Z-artifact-candidate-pr16-reload-hydration-block-content-invalidation-072949`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-artifact-candidate-pr16-reload-hydration-block-content-invalidation-072949) |
| Candidate reload hydration block-content invalidation, `074457` | [`rtc-pr-stack-20260519T161502Z-artifact-candidate-pr16-reload-hydration-block-content-invalidation-074457`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-artifact-candidate-pr16-reload-hydration-block-content-invalidation-074457) |
| Candidate reload hydration block-content invalidation, `080005` | [`rtc-pr-stack-20260519T161502Z-artifact-candidate-pr16-reload-hydration-block-content-invalidation-080005`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-artifact-candidate-pr16-reload-hydration-block-content-invalidation-080005) |
| Candidate reload hydration block-content invalidation, `081510` | [`rtc-pr-stack-20260519T161502Z-artifact-candidate-pr16-reload-hydration-block-content-invalidation-081510`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-artifact-candidate-pr16-reload-hydration-block-content-invalidation-081510) |
| Candidate reload hydration block-content invalidation, `090432` | [`rtc-pr-stack-20260519T161502Z-artifact-candidate-pr16-reload-hydration-block-content-invalidation-090432`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-artifact-candidate-pr16-reload-hydration-block-content-invalidation-090432) |
| Candidate reload hydration CRDT content normalization, `140154` | [`rtc-pr-stack-20260519T161502Z-artifact-candidate-pr16-reload-hydration-crdt-content-normalization-140154`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-artifact-candidate-pr16-reload-hydration-crdt-content-normalization-140154) |
| Candidate reload hydration CRDT content normalization, `142710` | [`rtc-pr-stack-20260519T161502Z-artifact-candidate-pr16-reload-hydration-crdt-content-normalization-142710`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-artifact-candidate-pr16-reload-hydration-crdt-content-normalization-142710) |
| Diagnostic pre-save search live collapse, `070433` | [`rtc-pr-stack-20260519T161502Z-artifact-diagnostic-pre-save-search-live-collapse-070433`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-artifact-diagnostic-pre-save-search-live-collapse-070433) |
| Diagnostic pre-save search live collapse, `072947` | [`rtc-pr-stack-20260519T161502Z-artifact-diagnostic-pre-save-search-live-collapse-072947`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-artifact-diagnostic-pre-save-search-live-collapse-072947) |
| Diagnostic pre-save search live collapse, `075501` | [`rtc-pr-stack-20260519T161502Z-artifact-diagnostic-pre-save-search-live-collapse-075501`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-artifact-diagnostic-pre-save-search-live-collapse-075501) |
| Diagnostic pre-save search live collapse, `084023` | [`rtc-pr-stack-20260519T161502Z-artifact-diagnostic-pre-save-search-live-collapse-084023`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-artifact-diagnostic-pre-save-search-live-collapse-084023) |
| Diagnostic pre-save search live collapse, `085929` | [`rtc-pr-stack-20260519T161502Z-artifact-diagnostic-pre-save-search-live-collapse-085929`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-artifact-diagnostic-pre-save-search-live-collapse-085929) |
| Diagnostic pre-save search live collapse, `144215` | [`rtc-pr-stack-20260519T161502Z-artifact-diagnostic-pre-save-search-live-collapse-144215`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-artifact-diagnostic-pre-save-search-live-collapse-144215) |
| Diagnostic reload awareness timeout, `144217` | [`rtc-pr-stack-20260519T161502Z-artifact-diagnostic-reload-awareness-timeout-144217`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-artifact-diagnostic-reload-awareness-timeout-144217) |
| Diagnostic rich-text suffix corruption, `064925` | [`rtc-pr-stack-20260519T161502Z-artifact-diagnostic-rich-text-suffix-corruption-064925`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-artifact-diagnostic-rich-text-suffix-corruption-064925) |
| Diagnostic rich-text suffix corruption, `071438` | [`rtc-pr-stack-20260519T161502Z-artifact-diagnostic-rich-text-suffix-corruption-071438`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-artifact-diagnostic-rich-text-suffix-corruption-071438) |
| Diagnostic rich-text suffix corruption, `073954` | [`rtc-pr-stack-20260519T161502Z-artifact-diagnostic-rich-text-suffix-corruption-073954`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-artifact-diagnostic-rich-text-suffix-corruption-073954) |
| Diagnostic rich-text suffix corruption, `090936` | [`rtc-pr-stack-20260519T161502Z-artifact-diagnostic-rich-text-suffix-corruption-090936`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-artifact-diagnostic-rich-text-suffix-corruption-090936) |
| Diagnostic rich-text suffix corruption, `092944` | [`rtc-pr-stack-20260519T161502Z-artifact-diagnostic-rich-text-suffix-corruption-092944`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-artifact-diagnostic-rich-text-suffix-corruption-092944) |
| Diagnostic rich-text suffix corruption, `142707` | [`rtc-pr-stack-20260519T161502Z-artifact-diagnostic-rich-text-suffix-corruption-142707`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-artifact-diagnostic-rich-text-suffix-corruption-142707) |
| Diagnostic rich-text suffix entity divergence, `160256` | [`rtc-pr-stack-20260519T161502Z-artifact-diagnostic-rich-text-suffix-entity-divergence-160256`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260519T161502Z-artifact-diagnostic-rich-text-suffix-entity-divergence-160256) |

## Verification Notes

- The all-ready merged branch was produced locally by merging the side/support
  refs into `PR15C`; `git diff --check` against the snapshot base returned no
  output.
- This snapshot does not claim upstream rebase, full CI, PHP tests, or browser
  E2E validation.
- Branches in the artifact table are deliberately linked for inspectability,
  but should not be treated as maintainer-ready PRs without the evidence gates
  described in the status report.
