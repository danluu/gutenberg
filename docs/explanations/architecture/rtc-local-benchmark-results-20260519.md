# RTC Fixed-Branch Local Benchmark Results, 2026-05-22

This updates the 2026-05-19 local benchmark readout with the fresh maintainer
snapshot benchmark canary for the `20260522T074557Z` all-merged stack. The run
used isolated local wp-env homes and ports under the maintainer snapshot gate.

## Inputs

Pinned refs from `danluu/gutenberg`:

| label | branch | commit |
| --- | --- | --- |
| current documented green | `rtc-pr-stack-20260520T141903Z-all-merged-revision-restore-canary` | `8eda4fa2db455c44d043e3b462c7c1a1d788e187` |
| parent canary replacement | `rtc-pr-stack-20260522T041409Z-all-merged-benchmark-canary-replacement` | `9a9ccbb67d8ff70a2ce8a0bc7e34ef30122b7ca2` |
| previous failed canary | `rtc-pr-stack-20260522T044520Z-all-merged-benchmark-canary-harness` | `c4028ca8cfe190b7296bdbfc92619ba984c92373` |
| fixed | `rtc-pr-stack-20260522T074557Z-all-merged-unsoundness-base-fix` | `431635f36ecfa528d139c19cf2c7a195d34d6c0a` |

Fixed branch URL:

```text
https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260522T074557Z-all-merged-unsoundness-base-fix
```

Compare against the validated base:

```text
https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T214027Z-tested-base...rtc-pr-stack-20260522T074557Z-all-merged-unsoundness-base-fix
```

Diff size against base: `27 files, +3906 / -119`.

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
| `focused / same-user-stale-content-overwrite-http` | Same-user/multi-tab stale content overwrite coverage over HTTP polling. |
| `focused / self-presence-ui-signal-http` | UI-signal coverage for self presence over HTTP polling. |
| `focused / autodraft-autosave-http` | Autosave/recovery coverage for autodraft loss over HTTP polling. |
| `focused / collaborator-autosave-http` | Autosave/recovery coverage for collaborator autosave loss over HTTP polling. |
| `focused / title-reload-http` | Reload/convergence coverage for title persistence over HTTP polling. |
| `focused / persistence-reload-http` | CRDT persistence reload coverage over HTTP polling. |
| `focused / same-user-title-reload-ws` | Same-user/multi-tab title reload coverage over WebSocket sync. |

## Local Run

Run id:

`unsoundness-base-fix-20260522T082808Z-rerun2`

Local artifact root:

```text
/Users/danluu/dev/fuzz/rtc-maintainer-snapshot-benchmark-gate-20260520/results/unsoundness-base-fix-20260522T082808Z-rerun2.noindex/results/unsoundness-base-fix-20260522T082808Z-rerun2
```

Host and runner notes:

- macOS 26.5, Apple M5 Max, 18 logical CPUs.
- Node `v20.20.2`, npm `10.8.2`, Docker server `29.4.0`.
- The run used isolated `wp-env` ports: `WP_ENV_PORT=34383`,
  `WP_ENV_TESTS_PORT=34384`, and `GUTENBERG_RTC_TEST_WS_PORT=34385`.
- The isolated `wp-env` was stopped after the run.
- Exact refs are recorded in `refs.tsv`.
- Setup commands, exit codes, elapsed times, and logs are recorded in
  `setup.tsv`.
- Row commands, exit codes, elapsed times, and logs are recorded in
  `summary.tsv`.

All fixed-stack rows passed. No failing fixed-stack benchmark rows are being
presented as acceptable.

| kind | case | fixed failures/reps | fixed avg elapsed s |
| --- | --- | ---: | ---: |
| lower | micro-crdt | 0/2 | 6.00 |
| lower | micro-html | 0/2 | 2.50 |
| lower | micro-sync | 0/2 | 2.00 |
| multi-user | many-users-sync | 0/2 | 2.00 |
| unit-suite | crdt-stale-top-level | 0/2 | 10.50 |
| unit-suite | http-polling-manager | 0/2 | 2.00 |
| e2e | collaboration-code-editor-performance-ws | 0/2 | 4.50 |
| e2e | collaboration-sync-body-size-http | 0/2 | 14.00 |
| realistic-e2e | large-post-three-user-http | 0/2 | 30.50 |
| realistic-e2e | list-item-move-refresh-http | 0/2 | 22.50 |
| realistic-e2e | table-stale-snapshot-http | 0/2 | 24.00 |
| focused | same-user-stale-content-overwrite-http | 0/1 | 27.00 |
| focused | self-presence-ui-signal-http | 0/1 | 20.00 |
| focused | autodraft-autosave-http | 0/1 | 5.00 |
| focused | collaborator-autosave-http | 0/1 | 6.00 |
| focused | title-reload-http | 0/1 | 17.00 |
| focused | persistence-reload-http | 0/1 | 6.00 |
| focused | same-user-title-reload-ws | 0/1 | 7.00 |

Setup rows:

| case | exit code | elapsed s |
| --- | ---: | ---: |
| build | 0 | 25 |
| wp-env-status-before | 0 | 1 |
| wp-env-start | 0 | 32 |
| wp-env-status-after | 0 | 2 |

## Readout

The fixed stack is a clean maintainer snapshot candidate for this gate. The
current passing branch is
`rtc-pr-stack-20260522T074557Z-all-merged-unsoundness-base-fix` at
`431635f36ecfa528d139c19cf2c7a195d34d6c0a`.

This branch replaces the known-bad
`rtc-pr-stack-20260519T214027Z-validated-no-harness` branch and the later
non-publishable `20260522T044520Z` exact-stack canary, which had failed
large-post/persistence behavior before the unsoundness-base fix branch was
built and rerun. The fresh exact-stack run passed the large-post three-user
HTTP row `2/2`, persistence reload `1/1`, WebSocket code-editor smoke `2/2`,
and the expanded same-user, UI-signal, autosave/recovery, parser/serialization,
and large-document reload/convergence-adjacent rows that are present in this
formal benchmark suite.

The important result is process-oriented: the benchmark canary is green because
the continuous Jetstream fuzz and promotion loops should already cover these
user-hit behaviors. This document records the local backstop result for the
maintainer snapshot; it does not redefine the trust model as "fuzz evidence,
then fix branch, then benchmark gate, then publish." Future failures in these
rows should be routed back into coverage scheduling and PR refinement before
another maintainer-facing branch is named current.
