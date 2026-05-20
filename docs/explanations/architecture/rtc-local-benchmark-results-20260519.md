# RTC Fixed-Branch Local Benchmark Results, 2026-05-20

This updates the 2026-05-19 local benchmark readout with the fresh maintainer
snapshot benchmark canary for the `20260520T141903Z` all-merged stack. The run
used isolated local wp-env homes and ports under the maintainer snapshot gate.

## Inputs

Pinned refs from `danluu/gutenberg`:

| label | branch | commit |
| --- | --- | --- |
| base | `rtc-pr-stack-20260519T214027Z-tested-base` | `c173c18fbcd60eac93612f7f3d9550ca4975db8d` |
| fixed | `rtc-pr-stack-20260520T141903Z-all-merged-revision-restore-canary` | `8eda4fa2db455c44d043e3b462c7c1a1d788e187` |

Fixed branch URL:

```text
https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260520T141903Z-all-merged-revision-restore-canary
```

Local setup excluded from timed rows: bundle fetch/clone, `npm install`, `composer install`, `npm run build -- --skip-types`, Docker image pull/build, and wp-env startup.

## Benchmark Meanings

The timed rows use five levels:

| row | what it measures |
| --- | --- |
| `lower / micro-crdt` | A Jest-hosted microbenchmark for `mergeCrdtBlocks` on synthetic RTC-shaped stale snapshot conflicts. This isolates block reconciliation cost and excludes browser, wp-env, and e2e setup. |
| `lower / micro-html` | A Jest-hosted microbenchmark for `isEquivalentHTML` normalization over entity, rich text, attribute, boolean-attribute, and SVG-ish HTML pairs. |
| `lower / micro-sync` | A Jest-hosted microbenchmark for HTTP polling sync helpers: update encoding, queue take/restore, compaction filtering, payload serialization, and room-window rotation. |
| `unit-suite / crdt-stale-top-level` | Targeted CRDT unit tests for stale top-level block behavior. This is both correctness signal and CI-cost signal; it includes Jest startup and transform overhead. |
| `unit-suite / http-polling-manager` | Targeted HTTP polling manager unit tests. This is correctness plus CI-cost signal, not a pure kernel benchmark. |
| `e2e / collaboration-code-editor-performance-ws` | Playwright e2e coverage for the collaboration code-editor performance path using the WebSocket sync server. This includes browser, editor, WordPress, and test harness work. |
| `e2e / collaboration-sync-body-size-http` | Playwright e2e coverage for collaboration sync request body size using the HTTP polling path. This catches payload growth and sync-body behavior in the browser/editor stack. |
| `multi-user / many-users-sync` | A Jest-hosted synthetic many-user sync benchmark for 100-user payloads, 100-user update queues, and a 1000-room polling window. This isolates client-side sync fan-out work and excludes browser, wp-env, and e2e setup. |
| `realistic-e2e / large-post-three-user-http` | Playwright e2e coverage for the existing large-post collaboration stress flow over HTTP polling: three browser users edit a roughly 5000-word mixed-block post, save, refresh, move blocks, type concurrently, and publish. |
| `realistic-e2e / list-item-move-refresh-http` | Playwright e2e coverage for the existing two-user list-item movement flow over HTTP polling, including concurrent moves, save, and both users refreshing into the moved order. |
| `realistic-e2e / table-stale-snapshot-http` | Playwright e2e coverage for existing stale table snapshot flows over HTTP polling: stale HTML edit versus remote row insert, and stale row append versus another user's cell edit. |

The raw microbenchmark scenarios mean:

| scenario | meaning |
| --- | --- |
| `small_stale_suffix_append_50` | Start from 50 paragraphs. The remote document has appended one paragraph; the incoming local snapshot is based on the stale base and appends a different paragraph. |
| `large_stale_suffix_append_250` | Same stale suffix append shape as above, scaled to 250 base paragraphs. |
| `stale_top_level_delete_100` | Start from 100 paragraphs. The remote document has appended a paragraph; the incoming stale local snapshot deletes one existing top-level paragraph. |
| `nested_group_move_with_remote_append` | Move a paragraph from one group into another while the remote side appends a different child to the destination group. |
| `table_body_suffix_append_40_rows` | Start with a 40-row table body. Remote and local stale snapshots each append a different row. |
| `entity_and_rich_text_equivalence` | Compare HTML pairs that differ by entity decoding, rich text spacing, attribute ordering, boolean attributes, and equivalent open/closed SVG-ish tags. |
| `base64_encode_1kb_update` | Encode 1 KiB binary sync updates to base64. |
| `queue_take_restore_1000_updates` | Build a 1000-update sync queue, take a batch of 250, restore that exact batch, then drain and validate the queue. |
| `queue_restore_filters_compactions` | Restore 1000 mixed updates where every tenth item is a compaction update, validating that compactions are filtered out. |
| `payload_json_20_rooms_200_updates` | Serialize an HTTP polling payload for 20 rooms with 10 updates per room, 200 updates total. |
| `rotate_window_75_rooms` | Repeatedly rotate a 10-room polling window across 75 rooms. |
| `server_response_json_100_users_single_room` | Serialize and parse a server sync response for one room with 100 awareness entries and 20 updates. |
| `batched_disconnect_json_100_users_10_room_batches` | Serialize 100 disconnect room envelopes in 10-room batches, approximating many-user leave/disconnect churn. |
| `awareness_apply_100_users_10_changed` | Apply a 100-user awareness map with 10 changed users per iteration, including JSON comparison and add/delete map churn. |
| `queue_take_restore_100_users_100_updates_each` | Exercise 100 per-user update queues, each with 100 updates, by taking a batch, restoring it, then draining the queues. |
| `rotate_window_1000_rooms_10_slots` | Rotate a 10-slot polling window through 1000 rooms, stressing room-selection bookkeeping for high-room-count clients. |

## Local Runs

Run id:

`revision-restore-canary-isolated-20260520T150007Z`

Local artifact root:

```text
/Users/danluu/dev/fuzz/rtc-maintainer-snapshot-benchmark-gate-20260520/results/revision-restore-canary-150007.noindex/results/revision-restore-canary-isolated-20260520T150007Z
```

Host and runner notes:

- macOS 26.5, Apple M5 Max, 18 logical CPUs.
- Node `v20.20.2`, npm `10.8.2`, Docker server `29.4.0`.
- The run used two isolated wp-env instances: base on `http://localhost:29781`, fixed on `http://localhost:29783`.
- Exact refs are recorded in `benchmark-revision-restore-isolated-refs.tsv`; row-level elapsed times, exit codes, and log paths are recorded in `benchmark-revision-restore-isolated-summary.tsv`.

All fixed-stack rows passed. The base control rows also passed in this fresh
run, including the large-post row that had exposed the stale branch and the
prior flaky control rerun.

| kind | case | base failures/reps | fixed failures/reps | base avg s | fixed avg s | fixed/base |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| lower | micro-crdt | 0/2 | 0/2 | 8.34 | 6.21 | 0.745 |
| lower | micro-html | 0/2 | 0/2 | 2.08 | 1.13 | 0.544 |
| lower | micro-sync | 0/2 | 0/2 | 1.90 | 1.31 | 0.689 |
| unit-suite | crdt-stale-top-level | 0/2 | 0/2 | 15.29 | 9.75 | 0.638 |
| unit-suite | http-polling-manager | 0/2 | 0/2 | 2.49 | 1.39 | 0.558 |
| e2e | collaboration-code-editor-performance-ws | 0/2 | 0/2 | 6.33 | 5.94 | 0.938 |
| e2e | collaboration-sync-body-size-http | 0/2 | 0/2 | 13.10 | 14.69 | 1.122 |
| multi-user | many-users-sync | 0/2 | 0/2 | 2.22 | 1.64 | 0.737 |
| realistic-e2e | large-post-three-user-http | 0/2 | 0/2 | 30.55 | 31.70 | 1.037 |
| realistic-e2e | list-item-move-refresh-http | 0/2 | 0/2 | 21.45 | 22.44 | 1.046 |
| realistic-e2e | table-stale-snapshot-http | 0/2 | 0/2 | 24.95 | 24.52 | 0.983 |

Realistic e2e status:

| row | base result | fixed result | observed fixed behavior |
| --- | ---: | ---: | --- |
| large-post-three-user-http | 0/2 failures | 0/2 failures | All three participants observed the final concurrent paragraphs and the publish flow completed in both reps. |
| list-item-move-refresh-http | 0/2 failures | 0/2 failures | The fixed branch preserved the moved list-item order across concurrent moves, save, and refresh. |
| table-stale-snapshot-http | 0/2 failures | 0/2 failures | Stale table snapshot edits converged without dropped rows or stale-cell clobbering. |

## Ratio Graphs

The plotted data and generator are checked in under
`docs/explanations/architecture/rtc-local-benchmark-results-20260519/`. The
main graph uses the fixed/base average elapsed-time ratios from the table
above. The detailed microbench graphs use the average of the per-rep p50 values
from the raw JSONL output.

![Local fixed/base command ratios](rtc-local-benchmark-results-20260519/plots/local-command-ratios.png)

![CRDT microbench p50 ratios](rtc-local-benchmark-results-20260519/plots/crdt-microbench-p50-ratios.png)

![Many-user sync microbench p50 ratios](rtc-local-benchmark-results-20260519/plots/many-user-sync-p50-ratios.png)

![Realistic e2e status ratios](rtc-local-benchmark-results-20260519/plots/realistic-e2e-status-ratios.png)

Additional focused expanded-coverage rows that exist on the candidate branch
were run fixed-only before publishing the snapshot:

| kind | case | fixed failures/reps | fixed elapsed s |
| --- | --- | ---: | ---: |
| focused-e2e | same-user-stale-content-overwrite-http | 0/1 | 29.45 |
| focused-e2e | self-presence-ui-signal-http | 0/1 | 20.24 |

The candidate branch does not contain the newer
`collaboration-revision-restore-loss.spec.ts` or
`collaboration-same-user-title-loss.spec.ts` e2e files, so those probes were
not counted as product benchmark rows. Revision/autosave/recovery coverage for
this canary came from the focused unit/PHP checks used during stack
construction plus the exact all-merged branch passing the formal benchmark row
set above.

## Readout

The fixed stack is a clean maintainer snapshot candidate for this gate. The
current passing branch is
`rtc-pr-stack-20260520T141903Z-all-merged-revision-restore-canary` at
`8eda4fa2db455c44d043e3b462c7c1a1d788e187`; it replaces the known-bad
`rtc-pr-stack-20260519T214027Z-validated-no-harness` branch and the intermediate
`20260520T130342Z` canary that still failed the large-post behavior.

The important result is process-oriented: the benchmark canary is green because
the continuous Jetstream fuzz and promotion loops should already cover these
user-hit behaviors. This document records the local backstop result for the
maintainer snapshot; it does not redefine the trust model as "benchmark after
the fact." Future failures in these rows should be routed back into coverage
scheduling and PR refinement before another maintainer-facing branch is named
current.
