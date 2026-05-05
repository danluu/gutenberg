# Distinct Manifest Rerun Status

Updated: 2026-05-05T09:08:54.769Z

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

- Attempted: 9 of 184
- Remaining: 175
- Passed: 4
- Failed: 4
- Missing spec: 0
- Timed out: 0
- Skipped: 0
- HTTP records completed: 5
- WebSocket records completed: 3
- Runner status updated at: `2026-05-05T09:08:39.396Z`
- Completed at: `not complete`
- Stop reason: `running`
- Current index: 8
- Current bug type: `rtc_title_only_reload_divergence`
- Current signature: `37c69948c4ea`
- Current transport: `http`
- Current spec: `test/e2e/specs/editor/collaboration/triage-4ba23abee72f-realistic.spec.ts`

Recent full-run results:

- failed: `http-polling-sync-json-oom-on-persisted-collection-sync-step2-history` (`efd66c496097`, http)
- failed: `rtc_websocket_checkpoint_body_corruption_after_reload` (`28e600fa97ba`, websocket)
- passed: `rtc_move_reconciliation_rewrites_neighboring_block_types_after_remote_shifts` (`58a3229d7ac7`, http)
- passed: `rtc_title_diverges_after_reload_without_save` (`445d4b755b6d`, http)
- passed: `rtc_saved_search_checkpoint_reload_corrupts_crdt` (`5bc6fa356c7c`, http)
- failed: `Top-level stale-local reconciliation cancels a later local delete of a remotely inserted block` (`4ebafacb6e10`, websocket)
- passed: `rtc_collaboration_move_reconciliation_duplicates_remote_paragraph` (`74dd38f291e0`, http)
- failed: `rtc_collab_save_stale_title_content_after_real_edits` (`9db3d5fce72d`, websocket)

Recent full-run failures:

- `http-polling-sync-json-oom-on-persisted-collection-sync-step2-history` (`efd66c496097`, http, failed)
- `rtc_websocket_checkpoint_body_corruption_after_reload` (`28e600fa97ba`, websocket, failed)
- `Top-level stale-local reconciliation cancels a later local delete of a remotely inserted block` (`4ebafacb6e10`, websocket, failed)
- `rtc_collab_save_stale_title_content_after_real_edits` (`9db3d5fce72d`, websocket, failed)

Resume by rerunning the command above with the same `--results-dir`.
Completed keys already present in `results.jsonl` are skipped.
