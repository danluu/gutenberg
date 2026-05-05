# Distinct Manifest Rerun Status

Updated: 2026-05-05T10:09:32.425Z

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

- Attempted: 53 of 184
- Remaining: 131
- Passed: 24
- Failed: 28
- Missing spec: 0
- Timed out: 1
- Skipped: 0
- HTTP records completed: 21
- WebSocket records completed: 31
- Runner status updated at: `2026-05-05T10:07:10.001Z`
- Completed at: `not complete`
- Stop reason: `running`
- Current index: 52
- Current bug type: `RTC title persistence gap on reload after move-block + edit-title`
- Current signature: `cf62e53692ba`
- Current transport: `websocket`
- Current spec: `test/e2e/specs/editor/collaboration/websocket/collaboration-cf62e53692ba-realistic.spec.ts`

Recent full-run results:

- failed: `rtc_ws_persisted_block_markup_corruption_stuck_save` (`2f060b0d43fe`, websocket)
- passed: `rtc_ws_table_move_into_group_leaves_stale_top_level_table_duplicate` (`87ea40a2fdb1`, websocket)
- failed: `rtc-entity-normalization-save-loop` (`440c86261e16`, websocket)
- passed: `rtc-top-level-move-after-remote-insert-paragraph-into-table-duplication` (`64edf2f8cbab`, http)
- passed: `stale-local structural table body merge after remote append` (`703ef0771ea5`, http)
- passed: `collaboration_revision_restore_reload_resurrects_newer_blocks` (`58b782e101aa`, http)
- passed: `cross_scope_move_duplicates_block_after_group_insert` (`d465f26f6b79`, http)
- passed: `mergeYArrayLocalChanges-drops-stale-local-table-row-append-after-remote-divergence` (`85a36d801db9`, http)
- failed: `RTC nested delete divergence after a converged move-into-group leaves a stale checkpoint paragraph on one collaborator` (`ecae18a9f40b`, websocket)
- failed: `RTC save/REST divergence where the save response and CRDT meta advance but later persisted title/content reads stay stale` (`2cc4a4a920f5`, websocket)

Recent full-run failures:

- `rtc_delete_of_recent_remote_top_level_insert_lost_by_stale_local_reconcile` (`3ac375556552`, websocket, failed)
- `rtc_delete_of_remote_concurrent_insert_readded_by_stale_local_reconcile` (`69f024e5e4c4`, websocket, failed)
- `rtc_group_reparent_wrapper_corruption_after_move_into_group` (`bcbe66104201`, websocket, failed)
- `rtc_move_into_group_replays_stale_top_level_block` (`d3da847aa279`, websocket, failed)
- `rtc_pullquote_delete_leaves_remote_peer_with_stale_top_level_pullquote` (`acf2880f01d6`, websocket, failed)
- `rtc_reload_move_nonconvergence_under_sync_faults` (`513786743f99`, websocket, failed)
- `rtc_ws_checkpoint_save_persists_corrupted_block_markup` (`939a21e9690b`, websocket, failed)
- `rtc_ws_move_into_group_hangs_other_collaborator_after_structural_edits` (`60e483562733`, websocket, failed)
- `rtc_ws_persisted_block_markup_corruption_stuck_save` (`2f060b0d43fe`, websocket, failed)
- `rtc-entity-normalization-save-loop` (`440c86261e16`, websocket, failed)
- `RTC nested delete divergence after a converged move-into-group leaves a stale checkpoint paragraph on one collaborator` (`ecae18a9f40b`, websocket, failed)
- `RTC save/REST divergence where the save response and CRDT meta advance but later persisted title/content reads stay stale` (`2cc4a4a920f5`, websocket, failed)

Resume by rerunning the command above with the same `--results-dir`.
Completed keys already present in `results.jsonl` are skipped.
