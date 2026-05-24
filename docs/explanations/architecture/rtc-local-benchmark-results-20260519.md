# RTC Fixed-Branch Local Benchmark Results, 2026-05-24

This updates the local benchmark readout with the fresh maintainer snapshot
benchmark canary for the `20260524T075953Z` all-merged PR07C build-clean stack.
The run used isolated local `wp-env` homes and ports under the maintainer
snapshot gate.

## Inputs

Pinned refs from `danluu/gutenberg`:

| label | branch | commit |
| --- | --- | --- |
| known bad, not publishable | `rtc-pr-stack-20260519T214027Z-validated-no-harness` | `e922771984f5bd37a3d5e76dc246a8c5001675ff` |
| validated base | `rtc-pr-stack-20260519T214027Z-tested-base` | `c173c18fbcd60eac93612f7f3d9550ca4975db8d` |
| prior documented green | `rtc-pr-stack-20260522T175152Z-all-merged-pr07c-reload-record-snapshots` | `b8ca68ad22c01ffa19cbe08a8d56651e5d1ea638` |
| failed build-preflight candidate, not publishable | `rtc-pr-stack-20260524T065052Z-all-merged-ready-pr07c-reload-record-snapshots` | `2f8247258316bde60869c06c383090904e9426bd` |
| fixed | `rtc-pr-stack-20260524T075953Z-all-merged-pr07c-build-clean` | `f4ba087d2fe34c66530afa8828081aecc1df81ac` |

Fixed branch URL:

```text
https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260524T075953Z-all-merged-pr07c-build-clean
```

Compare against the validated base:

```text
https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T214027Z-tested-base...rtc-pr-stack-20260524T075953Z-all-merged-pr07c-build-clean
```

Compare against the prior green stack:

```text
https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260522T175152Z-all-merged-pr07c-reload-record-snapshots...rtc-pr-stack-20260524T075953Z-all-merged-pr07c-build-clean
```

Compare against the failed build-preflight candidate:

```text
https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260524T065052Z-all-merged-ready-pr07c-reload-record-snapshots...rtc-pr-stack-20260524T075953Z-all-merged-pr07c-build-clean
```

Diff size against base: `20 files, +5664 / -140`.
Diff size against prior green stack: `27 files, +2915 / -1512`.
Diff size against failed build-preflight candidate: `5 files, +42 / -21`.

## Benchmark Meanings

The timed rows use these levels:

| row | what it measures |
| --- | --- |
| `lower / micro-crdt` | Jest-hosted `mergeCrdtBlocks` microbenchmark on synthetic RTC-shaped stale snapshot conflicts. |
| `lower / micro-html` | Jest-hosted `isEquivalentHTML` normalization over entity, rich text, attribute, boolean-attribute, and SVG-ish HTML pairs. |
| `lower / micro-sync` | Jest-hosted HTTP polling sync helper benchmark for update encoding, queue restore, compaction filtering, payload serialization, and room-window rotation. |
| `multi-user / many-users-sync` | Jest-hosted synthetic many-user sync benchmark for high-user payloads, update queues, awareness, and polling-window churn. |
| `unit-suite / crdt-stale-top-level` | Targeted CRDT unit tests for stale top-level block behavior. |
| `unit-suite / http-polling-manager` | Targeted HTTP polling manager unit tests. |
| `e2e / collaboration-code-editor-performance-ws` | Playwright WebSocket smoke/performance path for the collaboration code editor. |
| `e2e / collaboration-sync-body-size-http` | Playwright HTTP polling request body size coverage. |
| `realistic-e2e / large-post-three-user-http` | Three browser users edit a roughly 5000-word mixed-block post over HTTP polling, save, refresh, move blocks, type concurrently, and publish. |
| `realistic-e2e / list-item-move-refresh-http` | Two-user list-item movement over HTTP polling, including concurrent moves, save, and refresh into the moved order. |
| `realistic-e2e / table-stale-snapshot-http` | Stale table snapshot flows over HTTP polling: stale HTML edit versus remote row insert, and stale row append versus another user's cell edit. |
| `focused / title-reload-http` | Reload/convergence coverage for title persistence over HTTP polling. |
| `focused / persistence-reload-http` | CRDT persistence reload coverage over HTTP polling. |
| `focused / autosave-retention-http` | Autosave/recovery coverage for autodraft loss over HTTP polling. |
| `focused / same-user-stale-content-http` | Same-user/multi-tab stale content overwrite coverage over HTTP polling. |
| `focused / revision-table-body-http` | Revision persistence coverage for duplicate table row edits over HTTP polling. |
| `focused / self-presence-ui-signal-http` | UI-signal coverage for self presence over HTTP polling. |
| `focused / collaborator-autosave-http` | Autosave/recovery coverage for collaborator-first autosave over HTTP polling. |
| `focused / same-user-title-reload-ws` | Same-user/multi-tab title reload coverage over WebSocket sync. |

## Local Run

Run id:

`pr07c-build-clean-gate-20260524T075953Z`

Local artifact root:

```text
/Users/danluu/dev/fuzz/rtc-maintainer-snapshot-benchmark-gate-20260520/results/pr07c-build-clean-gate-20260524T075953Z.noindex/results/pr07c-build-clean-gate-20260524T075953Z
```

Host and runner notes:

- macOS 26.5, Apple M5 Max, 18 logical CPUs.
- Node `v20.20.2`, npm `10.8.2`, Docker server `29.4.0`.
- The run used isolated `wp-env` ports: `WP_ENV_PORT=38183`,
  `WP_ENV_TESTS_PORT=38184`, and `GUTENBERG_RTC_TEST_WS_PORT=38185`.
- Exact refs are recorded in `refs.tsv`.
- Setup commands, exit codes, elapsed times, and logs are recorded in
  `setup.tsv`.
- Row commands, exit codes, elapsed times, and logs are recorded in
  `summary.tsv`.
- The four benchmark-only microbenchmark files are local harness inputs copied
  into the exact stack worktree; their source paths and hashes are recorded in
  `harness-files.tsv` in the local artifact root. The branch itself does not
  include those local-only harness files.

All fixed-stack rows passed. No failing fixed-stack benchmark rows are being
presented as acceptable.

| kind | case | fixed failures/reps | fixed avg elapsed s |
| --- | --- | ---: | ---: |
| lower | micro-crdt | 0/2 | 14.00 |
| lower | micro-html | 0/2 | 8.50 |
| lower | micro-sync | 0/2 | 5.00 |
| multi-user | many-users-sync | 0/2 | 4.50 |
| unit-suite | crdt-stale-top-level | 0/2 | 21.50 |
| unit-suite | http-polling-manager | 0/2 | 5.50 |
| e2e | collaboration-code-editor-performance-ws | 0/2 | 7.00 |
| e2e | collaboration-sync-body-size-http | 0/2 | 15.50 |
| realistic-e2e | large-post-three-user-http | 0/2 | 35.00 |
| realistic-e2e | list-item-move-refresh-http | 0/2 | 25.00 |
| realistic-e2e | table-stale-snapshot-http | 0/2 | 26.50 |
| focused | title-reload-http | 0/1 | 19.00 |
| focused | persistence-reload-http | 0/1 | 7.00 |
| focused | autosave-retention-http | 0/1 | 6.00 |
| focused | same-user-stale-content-http | 0/1 | 32.00 |
| focused | revision-table-body-http | 0/1 | 19.00 |
| focused | self-presence-ui-signal-http | 0/1 | 20.00 |
| focused | collaborator-autosave-http | 0/1 | 9.00 |
| focused | same-user-title-reload-ws | 0/1 | 9.00 |

Setup rows:

| case | exit code | elapsed s |
| --- | ---: | ---: |
| npm-ci | 0 | 165 |
| composer-install | 0 | 6 |
| generate-icons-library | 0 | 0 |
| build | 0 | 54 |
| wp-env-status-before | 0 | 1 |
| wp-env-start | 0 | 46 |
| wp-env-status-after | 0 | 2 |

Teardown rows:

| case | exit code | elapsed s |
| --- | ---: | ---: |
| status-before | 0 | 2 |
| stop | 0 | 14 |
| status-after | 0 | 1 |

## Readout

The fixed stack is a clean maintainer snapshot candidate for this gate. The
current passing branch is
`rtc-pr-stack-20260524T075953Z-all-merged-pr07c-build-clean` at
`f4ba087d2fe34c66530afa8828081aecc1df81ac`.

This branch replaces the known-bad
`rtc-pr-stack-20260519T214027Z-validated-no-harness` branch, the prior
`20260522T175152Z` green branch, and the failed
`20260524T065052Z` build-preflight candidate. It preserves the existing CRDT
content snapshot behavior from the prior green stack, carries the newer PR07C
snapshot behavior, and includes the narrow build-clean repair commit
`f4ba087d2fe`. The fresh exact-stack run passed the large-post three-user HTTP
row `2/2`, persistence reload `1/1`, WebSocket code-editor smoke `2/2`, and
expanded same-user/multi-tab, UI-signal, autosave/recovery,
parser/serialization, revision, many-user lifecycle, and large-document
reload/convergence-adjacent rows.

The important result is process-oriented: the benchmark canary is green because
the continuous Jetstream fuzz and promotion loops should already cover these
user-hit behaviors. This document records the local backstop result for the
maintainer snapshot; it does not redefine the trust model as "fuzz evidence,
then fix branch, then benchmark gate, then publish." Future failures in these
rows should be routed back into coverage scheduling and PR refinement before
another maintainer-facing branch is named current.
