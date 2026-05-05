# Distinct Manifest Rerun Status

Updated: 2026-05-05T09:02:15Z

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

- Results: `fuzz-handoff/distinct-manifest-20260505/results-http-smoke/results.jsonl`
- Status: `fuzz-handoff/distinct-manifest-20260505/results-http-smoke/status.json`
- Attempted: 5
- Passed: 4
- Failed: 1
- Failed canonical repro:
  `http-polling-sync-json-oom-on-persisted-collection-sync-step2-history`
  (`efd66c496097`)

WebSocket smoke:

- Results: `fuzz-handoff/distinct-manifest-20260505/results-ws-smoke/results.jsonl`
- Status: `fuzz-handoff/distinct-manifest-20260505/results-ws-smoke/status.json`
- Attempted: 5
- Passed: 0
- Failed: 5
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

Initial progress check at 2026-05-05T09:02:15Z:

- Attempted: 4 of 184
- Passed: 1
- Failed: 2
- Skipped: 0
- Current repro:
  `rtc_title_diverges_after_reload_without_save` (`445d4b755b6d`)

Resume by rerunning the exact command above with the same `--results-dir`.
Completed keys already present in `results.jsonl` are skipped.
