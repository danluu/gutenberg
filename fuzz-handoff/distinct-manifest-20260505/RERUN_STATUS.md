# Distinct Manifest Rerun Status

Updated: 2026-05-05T09:39:22.452Z

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

- Attempted: 31 of 184
- Remaining: 153
- Passed: 13
- Failed: 17
- Missing spec: 0
- Timed out: 1
- Skipped: 0
- HTTP records completed: 13
- WebSocket records completed: 17
- Runner status updated at: `2026-05-05T09:36:04.841Z`
- Completed at: `not complete`
- Stop reason: `running`
- Current index: 30
- Current bug type: `rtc_delete_of_remote_concurrent_insert_readded_by_stale_local_reconcile`
- Current signature: `69f024e5e4c4`
- Current transport: `websocket`
- Current spec: `test/e2e/specs/editor/collaboration/websocket/collaboration-triage-44ad7b17993d-realistic.spec.ts`

Recent full-run results:

- failed: `rtc_ws_concurrent_top_level_paragraph_insert_corruption` (`373089edd5a5`, websocket)
- passed: `rtc_ws_crdt_stale_snapshot_reorder_duplicates_remote_paragraph` (`27a6a45298fe`, websocket)
- failed: `rtc_ws_crdt_state_churn_save_loop_after_collaborator_save` (`0b1e58467037`, websocket)
- failed: `rtc_ws_delete_of_recently_appended_top_level_paragraph_not_propagated` (`185aeebeb2a3`, websocket)
- failed: `rtc_ws_paragraph_move_into_group_leaves_nested_and_top_level_duplicate` (`5742d02c2bd9`, websocket)
- passed: `rtc_ws_remote_pullquote_delete_leaves_stale_top_level_pullquote` (`8e93920b7432`, websocket)
- failed: `rtc-ws-collaboration-block-tree-corruption` (`c30da48d353a`, websocket)
- passed: `top_level_move_reconciliation_preserves_wrong_yblock_after_remote_insert` (`45c313bc2541`, http)
- failed: `rtc_collab_content_regression_to_search_only_before_save` (`4d8aec7d7a06`, http)
- failed: `rtc_delete_of_recent_remote_top_level_insert_lost_by_stale_local_reconcile` (`3ac375556552`, websocket)

Recent full-run failures:

- `rtc-crdt-top-level-insert-merge-corrupts-block-identity-and-attributes` (`40b91aaca7bb`, websocket, failed)
- `remote-pullquote-survives-deletion-while-being-edited` (`8bd178f95d29`, http, failed)
- `rtc_reload_checkpoint_followup_edits_corrupt_adjacent_paragraph_text` (`9a939083ec8b`, websocket, failed)
- `rtc_save_path_persists_empty_content_while_title_and_crdt_survive` (`4a4d8ed3518a`, websocket, failed)
- `rtc_search_block_save_reload_persistence_corruption` (`f95a84583581`, websocket, failed)
- `rtc_ws_concurrent_top_level_paragraph_insert_corruption` (`373089edd5a5`, websocket, failed, timed out)
- `rtc_ws_crdt_state_churn_save_loop_after_collaborator_save` (`0b1e58467037`, websocket, failed)
- `rtc_ws_delete_of_recently_appended_top_level_paragraph_not_propagated` (`185aeebeb2a3`, websocket, failed)
- `rtc_ws_paragraph_move_into_group_leaves_nested_and_top_level_duplicate` (`5742d02c2bd9`, websocket, failed)
- `rtc-ws-collaboration-block-tree-corruption` (`c30da48d353a`, websocket, failed)
- `rtc_collab_content_regression_to_search_only_before_save` (`4d8aec7d7a06`, http, failed)
- `rtc_delete_of_recent_remote_top_level_insert_lost_by_stale_local_reconcile` (`3ac375556552`, websocket, failed)

Resume by rerunning the command above with the same `--results-dir`.
Completed keys already present in `results.jsonl` are skipped.
