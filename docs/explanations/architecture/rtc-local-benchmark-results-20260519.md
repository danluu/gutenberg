# RTC Fixed-Branch Local Benchmark Results, 2026-05-22

This updates the 2026-05-19 local benchmark readout with the fresh maintainer
snapshot benchmark canary for the `20260522T175152Z` all-merged stack. The run
used isolated local `wp-env` homes and ports under the maintainer snapshot gate.

## Inputs

Pinned refs from `danluu/gutenberg`:

| label | branch | commit |
| --- | --- | --- |
| known bad, not publishable | `rtc-pr-stack-20260519T214027Z-validated-no-harness` | `e922771984f5bd37a3d5e76dc246a8c5001675ff` |
| validated base | `rtc-pr-stack-20260519T214027Z-tested-base` | `c173c18fbcd60eac93612f7f3d9550ca4975db8d` |
| prior documented green | `rtc-pr-stack-20260522T150233Z-all-merged-144538-large-canary-stabilization` | `80cae0b38df6c983b4562abd9efb575d6f336bcb` |
| fixed | `rtc-pr-stack-20260522T175152Z-all-merged-pr07c-reload-record-snapshots` | `b8ca68ad22c01ffa19cbe08a8d56651e5d1ea638` |

Fixed branch URL:

```text
https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260522T175152Z-all-merged-pr07c-reload-record-snapshots
```

Compare against the validated base:

```text
https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260519T214027Z-tested-base...rtc-pr-stack-20260522T175152Z-all-merged-pr07c-reload-record-snapshots
```

Compare against the prior green stack:

```text
https://github.com/danluu/gutenberg/compare/rtc-pr-stack-20260522T150233Z-all-merged-144538-large-canary-stabilization...rtc-pr-stack-20260522T175152Z-all-merged-pr07c-reload-record-snapshots
```

Diff size against base: `28 files, +4275 / -154`.
Diff size against prior green stack: `6 files, +355 / -34`.

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

`all-merged-pr07c-reload-record-snapshots-localdeps-harness-20260522T175152Z`

Local artifact root:

```text
/Users/danluu/dev/fuzz/rtc-maintainer-snapshot-benchmark-gate-20260520/results/all-merged-pr07c-reload-record-snapshots-localdeps-harness-20260522T175152Z.noindex/results/all-merged-pr07c-reload-record-snapshots-localdeps-harness-20260522T175152Z
```

Host and runner notes:

- macOS 26.5, Apple M5 Max, 18 logical CPUs.
- Node `v20.20.2`, npm `10.8.2`, Docker server `29.4.0`.
- The run used isolated `wp-env` ports: `WP_ENV_PORT=35383`,
  `WP_ENV_TESTS_PORT=35384`, and `GUTENBERG_RTC_TEST_WS_PORT=35385`.
- Exact refs are recorded in `refs.tsv`.
- Setup commands, exit codes, elapsed times, and logs are recorded in
  `setup.tsv`.
- Row commands, exit codes, elapsed times, and logs are recorded in
  `summary.tsv`.
- The four benchmark-only microbenchmark files are local harness inputs copied
  into the exact stack worktree; their source paths and hashes are recorded in
  `benchmark-harness-files.tsv` in the cycle directory. The branch itself does
  not include those local-only harness files.

All fixed-stack rows passed. No failing fixed-stack benchmark rows are being
presented as acceptable.

| kind | case | fixed failures/reps | fixed avg elapsed s |
| --- | --- | ---: | ---: |
| lower | micro-crdt | 0/2 | 7.00 |
| lower | micro-html | 0/2 | 2.50 |
| lower | micro-sync | 0/2 | 2.50 |
| multi-user | many-users-sync | 0/2 | 2.50 |
| unit-suite | crdt-stale-top-level | 0/2 | 11.00 |
| unit-suite | http-polling-manager | 0/2 | 2.00 |
| e2e | collaboration-code-editor-performance-ws | 0/2 | 6.50 |
| e2e | collaboration-sync-body-size-http | 0/2 | 15.00 |
| realistic-e2e | large-post-three-user-http | 0/2 | 31.50 |
| realistic-e2e | list-item-move-refresh-http | 0/2 | 22.50 |
| realistic-e2e | table-stale-snapshot-http | 0/2 | 24.50 |
| focused | title-reload-http | 0/1 | 22.00 |
| focused | persistence-reload-http | 0/1 | 7.00 |
| focused | autosave-retention-http | 0/1 | 5.00 |
| focused | same-user-stale-content-http | 0/1 | 28.00 |
| focused | revision-table-body-http | 0/1 | 17.00 |
| focused | self-presence-ui-signal-http | 0/1 | 21.00 |
| focused | collaborator-autosave-http | 0/1 | 7.00 |
| focused | same-user-title-reload-ws | 0/1 | 6.00 |

Setup rows:

| case | exit code | elapsed s |
| --- | ---: | ---: |
| build | 0 | 27 |
| wp-env-status-before | 0 | 1 |
| wp-env-start | 0 | 57 |
| wp-env-status-after | 0 | 2 |

Teardown rows:

| case | exit code | elapsed s |
| --- | ---: | ---: |
| status-before | 0 | 2 |
| stop | 0 | 13 |
| status-after | 0 | 1 |

## Readout

The fixed stack is a clean maintainer snapshot candidate for this gate. The
current passing branch is
`rtc-pr-stack-20260522T175152Z-all-merged-pr07c-reload-record-snapshots` at
`b8ca68ad22c01ffa19cbe08a8d56651e5d1ea638`.

This branch replaces the known-bad
`rtc-pr-stack-20260519T214027Z-validated-no-harness` branch and the prior
`20260522T150233Z` green branch. It preserves the existing CRDT content
snapshot behavior from the prior green stack and adds the `PR07C` title/excerpt
record snapshot preservation through reload. The fresh exact-stack run passed the
large-post three-user HTTP row `2/2`, persistence reload `1/1`, WebSocket
code-editor smoke `2/2`, and expanded same-user/multi-tab, UI-signal,
autosave/recovery, parser/serialization, revision, many-user lifecycle, and
large-document reload/convergence-adjacent rows.

The important result is process-oriented: the benchmark canary is green because
the continuous Jetstream fuzz and promotion loops should already cover these
user-hit behaviors. This document records the local backstop result for the
maintainer snapshot; it does not redefine the trust model as "fuzz evidence,
then fix branch, then benchmark gate, then publish." Future failures in these
rows should be routed back into coverage scheduling and PR refinement before
another maintainer-facing branch is named current.
