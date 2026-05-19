# RTC Local Benchmark Results, 2026-05-19

This follows `rtc-less-busy-benchmark-handoff-20260519.md`, but the local run uses a cleaner runner structure instead of preserving the earlier remote-run ordering. The local runner used balanced ABBA ordering for lower-level, e2e, many-user, and realistic e2e rows and fixed host-specific wp-env behavior on macOS.

## Inputs

Pinned refs from `danluu/gutenberg`:

| label | commit |
| --- | --- |
| base | `c173c18fbcd60eac93612f7f3d9550ca4975db8d` |
| all-ready-merged | `eae83fa6f594083c07bce4599a2a725704700e9b` |

Local setup excluded from timed rows: bundle fetch/clone, `npm install`, `composer install`, `npm run build -- --skip-types`, and wp-env startup. Both local worktrees built successfully before timings started.

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

## Local Run

Run ids:

- Main lower/unit/e2e run: `local-abba-20260519T193459Z`
- Many-user sync run: `local-many-users-20260519T200914Z`
- Realistic e2e run: `local-realistic-e2e-20260519T203043Z`

Local artifact root:

```text
/Users/danluu/dev/fuzz/rtc-benchmark-20260519-local.noindex/results/local-abba-20260519T193459Z
/Users/danluu/dev/fuzz/rtc-benchmark-20260519-local.noindex/results/local-many-users-20260519T200914Z
/Users/danluu/dev/fuzz/rtc-benchmark-20260519-local.noindex/results/local-realistic-e2e-20260519T203043Z
```

Host and runner notes:

- macOS 26.5, Apple M3 Max, 14 logical CPUs, 38.65 GB RAM.
- Node `v20.20.2`, npm `10.8.2`, Docker server `29.4.0`.
- Lower-level order: base rep 1, merged rep 1, merged rep 2, base rep 2.
- E2E order: base rep 1, merged rep 1, merged rep 2, base rep 2, after prestarting both isolated wp-env instances.
- Many-user order: base rep 1, merged rep 1, merged rep 2, base rep 2.
- Realistic e2e order: base rep 1, merged rep 1, merged rep 2, base rep 2, after prestarting both isolated wp-env instances.
- Local wp-env needed `WP_BASE_URL=http://localhost:<port>`; `127.0.0.1` caused login/REST auth churn on this machine. The WebSocket server stayed on `127.0.0.1`.
- `RTC_BENCH_LOAD_GATE=off`; macOS load average did not settle because of unrelated background indexing/media work. Per-row load samples were still recorded. Local 1-minute load samples ranged from 16.82 to 31.59, mean 23.39.
- The many-user run's 1-minute load samples ranged from 8.59 to 19.29, mean 16.24.
- The realistic e2e run's 1-minute load samples ranged from 21.08 to 36.45, mean 27.55.

The original lower/unit/e2e run and the many-user run exited zero for all 32 timed rows. The realistic e2e run added 12 timed rows: 8 exited zero and 4 failed, all in the merged snapshot's stress flows.

| kind | case | base failures/reps | merged failures/reps | base median s | merged median s | merged/base |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| lower | micro-crdt | 0/2 | 0/2 | 8.82 | 13.57 | 1.539 |
| lower | micro-html | 0/2 | 0/2 | 1.86 | 1.87 | 1.005 |
| lower | micro-sync | 0/2 | 0/2 | 5.10 | 5.11 | 1.001 |
| unit-suite | crdt-stale-top-level | 0/2 | 0/2 | 13.22 | 4.05 | 0.306 |
| unit-suite | http-polling-manager | 0/2 | 0/2 | 1.96 | 1.93 | 0.987 |
| e2e | collaboration-code-editor-performance-ws | 0/2 | 0/2 | 9.77 | 10.13 | 1.037 |
| e2e | collaboration-sync-body-size-http | 0/2 | 0/2 | 15.99 | 15.74 | 0.985 |
| multi-user | many-users-sync | 0/2 | 0/2 | 7.90 | 8.01 | 1.015 |
| realistic-e2e | large-post-three-user-http | 0/2 | 2/2 | 31.59 | 108.19 | n/a, merged failed |
| realistic-e2e | list-item-move-refresh-http | 0/2 | 2/2 | 23.52 | 82.05 | n/a, merged failed |
| realistic-e2e | table-stale-snapshot-http | 0/2 | 0/2 | 25.33 | 26.38 | 1.041 |

Local CRDT microbench p50 ratios:

| scenario | base p50 ms | merged p50 ms | merged/base |
| --- | ---: | ---: | ---: |
| small_stale_suffix_append_50 | 0.2783 | 0.7811 | 2.806 |
| large_stale_suffix_append_250 | 1.5910 | 4.6671 | 2.934 |
| stale_top_level_delete_100 | 8.0966 | 27.8004 | 3.434 |
| nested_group_move_with_remote_append | 0.4133 | 0.4042 | 0.978 |
| table_body_suffix_append_40_rows | 0.3054 | 0.5535 | 1.813 |

Local many-user sync microbench p50 ratios:

| scenario | base p50 ms | merged p50 ms | merged/base | base p95 ms | merged p95 ms | p95 merged/base |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| server_response_json_100_users_single_room | 0.153229 | 0.154146 | 1.006 | 0.165625 | 0.170729 | 1.031 |
| batched_disconnect_json_100_users_10_room_batches | 0.021229 | 0.022916 | 1.079 | 0.024000 | 0.025396 | 1.058 |
| awareness_apply_100_users_10_changed | 0.162396 | 0.162270 | 0.999 | 0.187730 | 0.185750 | 0.989 |
| queue_take_restore_100_users_100_updates_each | 0.040041 | 0.037042 | 0.925 | 0.075438 | 0.065458 | 0.868 |
| rotate_window_1000_rooms_10_slots | 0.002042 | 0.002042 | 1.000 | 0.003604 | 0.003771 | 1.046 |

Realistic e2e failure signatures:

| row | base result | merged result | observed merged failure |
| --- | ---: | ---: | --- |
| large-post-three-user-http | 0/2 failures | 2/2 failures | Both merged reps timed out waiting for every participant to observe the final concurrent paragraphs from the other users in `collaboration-stress.spec.ts`. |
| list-item-move-refresh-http | 0/2 failures | 2/2 failures | Both merged reps timed out waiting for the moved list order; the assertion expected `Item Beta` after `Item Gamma`, but saw the old order. |
| table-stale-snapshot-http | 0/2 failures | 0/2 failures | No failure; this is the only all-pass realistic e2e ratio row. |

## Graphs

The plotted data and generator are checked in under `docs/explanations/architecture/rtc-local-benchmark-results-20260519/`. The graphs use `ggplot2` with ColorBrewer scales and the minimal RTC report style used by the existing benchmark trend plots.

![Local merged/base command ratios](rtc-local-benchmark-results-20260519/plots/local-command-ratios.png)

![CRDT microbench p50 ratios](rtc-local-benchmark-results-20260519/plots/crdt-microbench-p50-ratios.png)

![Many-user sync microbench p50 ratios](rtc-local-benchmark-results-20260519/plots/many-user-sync-p50-ratios.png)

![Realistic e2e status ratios](rtc-local-benchmark-results-20260519/plots/realistic-e2e-status-ratios.png)

## Readout

The local lower/unit/e2e and many-user runs are clean timing runs because they used balanced ABBA order and all rows passed. They show no meaningful smoke e2e regression: WS e2e was +3.7% and HTTP e2e was -1.5% for merged versus base. The synthetic CRDT stale/suffix scenarios are consistently slower in the merged snapshot, around 1.8x to 3.4x by p50 depending on scenario.

HTML-equivalence and HTTP-polling microbenches were effectively neutral. The many-user sync benchmark was also near neutral overall: the aggregate elapsed-time ratio was 1.015x, p50 ratios ranged from 0.925x to 1.079x, awareness apply was 0.999x, and 1000-room window rotation was 1.000x.

The realistic e2e addition changes the correctness picture: base passed all six stress-flow commands, but merged failed both reps of the 3-user large-post flow and both reps of the list-item move/refresh flow. The failed rows' elapsed medians include Playwright retries, so they should be read as repeated e2e failures rather than clean performance ratios. The realistic table stale-snapshot row passed on both branches, with merged/base at 1.041x.
