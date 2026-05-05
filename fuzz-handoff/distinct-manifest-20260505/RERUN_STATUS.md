# Distinct Manifest Rerun Status

Updated: 2026-05-05T10:39:42.743Z

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

- Attempted: 79 of 184
- Remaining: 105
- Passed: 33
- Failed: 45
- Missing spec: 0
- Timed out: 2
- Skipped: 0
- HTTP records completed: 36
- WebSocket records completed: 42
- Runner status updated at: `2026-05-05T10:39:15.108Z`
- Completed at: `not complete`
- Stop reason: `running`
- Current index: 78
- Current bug type: `rtc_heading_insert_position_diverges_across_collaborators`
- Current signature: `0c33bad2fdd0`
- Current transport: `http`
- Current spec: `test/e2e/specs/editor/collaboration/triage-0c33bad2fdd0-realistic.spec.ts`

Recent full-run results:

- failed: `rtc_collaboration_transient_empty_body_on_reload` (`213a2b68b661`, http)
- failed: `rtc_concurrent_append_after_checkpoint_interleaves_text` (`ab1b60fc6f4a`, websocket)
- failed: `rtc_concurrent_tail_insert_corrupts_or_diverges_top_level_paragraphs` (`5fe795b32c10`, websocket)
- passed: `rtc_crdt_merge_reorder_after_fallback_group_insert_duplicates_heading_and_drops_paragraph` (`222f6c558dee`, http)
- failed: `rtc_crdt_move_after_fallback_group_insert_duplicates_baseline_and_drops_shared_paragraph` (`4492f7048c22`, websocket)
- failed: `rtc_crdt_top_level_search_move_after_checkpoint_churn_duplicates_multibyte_heading` (`30316f449e06`, websocket)
- failed: `rtc_delete_nested_after_converged_move_into_group_leaves_stale_moved_paragraph` (`a48cbaacb3c8`, websocket)
- passed: `rtc_delete_propagation_loss_due_to_stale_local_block_cache` (`ae9a3cdc8424`, http)
- passed: `rtc_distinct_user_reload_title_divergence` (`08d6f3fb22ac`, http)
- failed: `rtc_formatted_richtext_programmatic_update_diverges_to_trailing_gt_after_recovery` (`712b98ba96ff`, http)

Recent full-run failures:

- `rtc_checkpoint_save_reload_partial_serialized_body_behind_visible_block_tree` (`549d46417342`, http, failed)
- `rtc_checkpoint_save_reload_persisted_markup_corruption` (`9f310b30e0b7`, http, failed)
- `rtc_collab_heading_group_tree_corruption_after_move_into_group_then_top_level_move` (`9a90b69f2672`, websocket, failed)
- `rtc_collaboration_delete_then_move_heading_order_split` (`f1637972ea57`, http, failed)
- `rtc_collaboration_malformed_heading_transiently_saves_empty_post_then_rolls_back` (`b60eecd4ac03`, http, failed)
- `rtc_collaboration_transient_empty_body_on_reload` (`213a2b68b661`, http, failed)
- `rtc_concurrent_append_after_checkpoint_interleaves_text` (`ab1b60fc6f4a`, websocket, failed)
- `rtc_concurrent_tail_insert_corrupts_or_diverges_top_level_paragraphs` (`5fe795b32c10`, websocket, failed)
- `rtc_crdt_move_after_fallback_group_insert_duplicates_baseline_and_drops_shared_paragraph` (`4492f7048c22`, websocket, failed)
- `rtc_crdt_top_level_search_move_after_checkpoint_churn_duplicates_multibyte_heading` (`30316f449e06`, websocket, failed)
- `rtc_delete_nested_after_converged_move_into_group_leaves_stale_moved_paragraph` (`a48cbaacb3c8`, websocket, failed)
- `rtc_formatted_richtext_programmatic_update_diverges_to_trailing_gt_after_recovery` (`712b98ba96ff`, http, failed)

Resume by rerunning the command above with the same `--results-dir`.
Completed keys already present in `results.jsonl` are skipped.
