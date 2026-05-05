# Distinct Manifest Rerun Status

Updated: 2026-05-05T09:54:28.018Z

This is the local rerun status for the distinct-bug manifest on refreshed base
`try/fuzz-fixed-base-20260505`.

## Manifest

- Manifest: `fuzz-handoff/distinct-manifest-20260505/distinct-bug-manifest.json`
- STATUS files scanned: 5083
- `Classification: real` files: 452
- Distinct bug types: 279
- Runnable canonical repros: 184
- Runnable HTTP repros: 75
- Runnable WebSocket repros: 109
- Groups without an existing spec: 95

## Smoke Results

HTTP smoke:

- Attempted: 5
- Passed: 4
- Failed: 1
- Skipped: 0
- Stop reason: `limit`
- Failed canonical repros:
  - `http-polling-sync-json-oom-on-persisted-collection-sync-step2-history` (`efd66c496097`)

WebSocket smoke:

- Attempted: 5
- Passed: 0
- Failed: 5
- Skipped: 0
- Stop reason: `limit`
- Failed canonical repros:
  - `rtc_websocket_checkpoint_body_corruption_after_reload` (`28e600fa97ba`)
  - `Top-level stale-local reconciliation cancels a later local delete of a remotely inserted block` (`4ebafacb6e10`)
  - `rtc_collab_save_stale_title_content_after_real_edits` (`9db3d5fce72d`)
  - `rtc-websocket-collaborator-state-diverges-after-block-insert` (`b143e4f23158`)
  - `rtc-crdt-top-level-insert-merge-corrupts-block-identity-and-attributes` (`40b91aaca7bb`)

## Full Rerun

Started at 2026-05-05T09:00:05Z in tmux session
`rtc-manifest-rerun-20260505`.

Command:

```bash
RTC_MANIFEST_REPRO_TIMEOUT_MS=420000 \
RTC_MANIFEST_WS_START_PORT=19491 \
WP_ENV_PORT=9492 \
WP_BASE_URL=http://localhost:9492 \
node bin/rtc-browser-fuzz-rerun-manifest.mjs \
  --manifest fuzz-handoff/distinct-manifest-20260505/distinct-bug-manifest.json \
  --results-dir fuzz-handoff/distinct-manifest-20260505/results-full-all \
  --transport all
```

Live state:

- Status: `fuzz-handoff/distinct-manifest-20260505/results-full-all/status.json`
- Results: `fuzz-handoff/distinct-manifest-20260505/results-full-all/results.jsonl`
- Logs: `fuzz-handoff/distinct-manifest-20260505/results-full-all/logs/`
- Playwright artifacts: `fuzz-handoff/distinct-manifest-20260505/results-full-all/outputs/`

Current progress:

- Attempted: 42 of 184
- Remaining: 142
- Passed: 18
- Failed: 23
- Missing spec: 0
- Timed out: 1
- Skipped: 0
- HTTP records completed: 16
- WebSocket records completed: 25
- Runner status updated at: `2026-05-05T09:54:08.281Z`
- Completed at: `not complete`
- Stop reason: `running`
- Current index: 41
- Current bug type: `rtc_ws_move_into_group_hangs_other_collaborator_after_structural_edits`
- Current signature: `60e483562733`
- Current transport: `websocket`
- Current spec: `test/e2e/specs/editor/collaboration/manifest/60e483562733-rtc-ws-move-into-group-hangs-other-collaborator-after-structural-edits.spec.ts`

Recent full-run results:

- passed: `rtc_empty_content_persisted_after_delete_plus_pullquote_edit` (`e87fc90859a8`, http)
- failed: `rtc_group_reparent_wrapper_corruption_after_move_into_group` (`bcbe66104201`, websocket)
- failed: `rtc_move_into_group_replays_stale_top_level_block` (`d3da847aa279`, websocket)
- failed: `rtc_pullquote_delete_leaves_remote_peer_with_stale_top_level_pullquote` (`acf2880f01d6`, websocket)
- failed: `rtc_reload_move_nonconvergence_under_sync_faults` (`513786743f99`, websocket)
- passed: `rtc_save_reload_persistence_corruption` (`da6c1f4bcecd`, http)
- passed: `rtc_top_level_move_divergence_duplicate_heading_after_fallback_group_insert` (`7423aed9058a`, websocket)
- passed: `rtc_top_level_move_group_shape_corruption` (`a81ea0fc772d`, http)
- failed: `rtc_ws_checkpoint_save_persists_corrupted_block_markup` (`939a21e9690b`, websocket)
- passed: `rtc_ws_delete_of_recent_remote_heading_not_replayed_to_other_peer` (`62db5968059e`, websocket)

Recent full-run failures:

- `rtc_ws_crdt_state_churn_save_loop_after_collaborator_save` (`0b1e58467037`, websocket, failed)
- `rtc_ws_delete_of_recently_appended_top_level_paragraph_not_propagated` (`185aeebeb2a3`, websocket, failed)
- `rtc_ws_paragraph_move_into_group_leaves_nested_and_top_level_duplicate` (`5742d02c2bd9`, websocket, failed)
- `rtc-ws-collaboration-block-tree-corruption` (`c30da48d353a`, websocket, failed)
- `rtc_collab_content_regression_to_search_only_before_save` (`4d8aec7d7a06`, http, failed)
- `rtc_delete_of_recent_remote_top_level_insert_lost_by_stale_local_reconcile` (`3ac375556552`, websocket, failed)
- `rtc_delete_of_remote_concurrent_insert_readded_by_stale_local_reconcile` (`69f024e5e4c4`, websocket, failed)
- `rtc_group_reparent_wrapper_corruption_after_move_into_group` (`bcbe66104201`, websocket, failed)
- `rtc_move_into_group_replays_stale_top_level_block` (`d3da847aa279`, websocket, failed)
- `rtc_pullquote_delete_leaves_remote_peer_with_stale_top_level_pullquote` (`acf2880f01d6`, websocket, failed)
- `rtc_reload_move_nonconvergence_under_sync_faults` (`513786743f99`, websocket, failed)
- `rtc_ws_checkpoint_save_persists_corrupted_block_markup` (`939a21e9690b`, websocket, failed)

Resume by rerunning the command above with the same `--results-dir`.
Completed keys already present in `results.jsonl` are skipped.
