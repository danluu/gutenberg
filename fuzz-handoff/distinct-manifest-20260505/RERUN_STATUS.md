# Distinct Manifest Rerun Status

Updated: 2026-05-05T10:24:37.640Z

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

- Attempted: 65 of 184
- Remaining: 119
- Passed: 29
- Failed: 35
- Missing spec: 0
- Timed out: 2
- Skipped: 0
- HTTP records completed: 29
- WebSocket records completed: 35
- Runner status updated at: `2026-05-05T10:23:32.888Z`
- Completed at: `not complete`
- Stop reason: `running`
- Current index: 64
- Current bug type: `rtc_collab_heading_group_tree_corruption_after_move_into_group_then_top_level_move`
- Current signature: `9a90b69f2672`
- Current transport: `websocket`
- Current spec: `test/e2e/specs/editor/collaboration/triage-5d01e9eb73c9-realistic.spec.ts`

Recent full-run results:

- passed: `rtc_chained_top_level_reorder_drops_heading_and_duplicates_adjacent_paragraph` (`2f1615fef9d1`, http)
- passed: `rtc_checkpoint_body_reverts_to_prior_checkpoint_while_title_advances` (`a88b8bf04f5f`, websocket)
- failed: `rtc_checkpoint_reload_followup_body_edit_desync` (`e3ab170829f6`, websocket)
- failed: `rtc_checkpoint_reload_heading_insert_duplicates_baseline_suffix` (`c07bdb1e2373`, http)
- failed: `rtc_checkpoint_reload_trailing_table_delete_lost` (`baa3b9ef6312`, websocket)
- passed: `rtc_checkpoint_save_oscillates_between_corrupted_title_and_empty_content_after_reload` (`e1b81f6e98b9`, http)
- failed: `rtc_checkpoint_save_reload_partial_serialized_body_behind_visible_block_tree` (`549d46417342`, http)
- failed: `rtc_checkpoint_save_reload_persisted_markup_corruption` (`9f310b30e0b7`, http)
- passed: `rtc_checkpoint_save_stale_full_record_clobbers_fields` (`7d6faa1f8935`, http)
- passed: `rtc_checkpoint_second_save_content_collapse_after_reload` (`6e3ddc0030a8`, http)

Recent full-run failures:

- `rtc_ws_move_into_group_hangs_other_collaborator_after_structural_edits` (`60e483562733`, websocket, failed)
- `rtc_ws_persisted_block_markup_corruption_stuck_save` (`2f060b0d43fe`, websocket, failed)
- `rtc-entity-normalization-save-loop` (`440c86261e16`, websocket, failed)
- `RTC nested delete divergence after a converged move-into-group leaves a stale checkpoint paragraph on one collaborator` (`ecae18a9f40b`, websocket, failed)
- `RTC save/REST divergence where the save response and CRDT meta advance but later persisted title/content reads stay stale` (`2cc4a4a920f5`, websocket, failed)
- `RTC title persistence gap on reload after move-block + edit-title` (`cf62e53692ba`, websocket, failed, timed out)
- `rtc_block_tree_collapse_after_delete_and_followup_persistence` (`a2e6705b1ea0`, http, failed)
- `rtc_checkpoint_reload_followup_body_edit_desync` (`e3ab170829f6`, websocket, failed)
- `rtc_checkpoint_reload_heading_insert_duplicates_baseline_suffix` (`c07bdb1e2373`, http, failed)
- `rtc_checkpoint_reload_trailing_table_delete_lost` (`baa3b9ef6312`, websocket, failed)
- `rtc_checkpoint_save_reload_partial_serialized_body_behind_visible_block_tree` (`549d46417342`, http, failed)
- `rtc_checkpoint_save_reload_persisted_markup_corruption` (`9f310b30e0b7`, http, failed)

Resume by rerunning the command above with the same `--results-dir`.
Completed keys already present in `results.jsonl` are skipped.
