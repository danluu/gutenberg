# awareness-clears-stale-collaborators-after-refresh

## Summary

Collaborators who refresh or disconnect should stop appearing as connected peers after explicit disconnect signaling or timeout cleanup.

## Evidence

- `packages/sync/src/providers/http-polling/polling-manager.ts` sends awareness `null` on unload/pagehide and uses `sendBeacon`-style keepalive requests.
- `WP_HTTP_Polling_Sync_Server::process_awareness_update()` drops expired awareness entries after 30 seconds.
- `packages/core-data/src/awareness/awareness-state.ts` keeps a delayed disconnected-collaborator view for UI purposes, then removes it after `REMOVAL_DELAY_IN_MS`.
- Changelog history explicitly includes a ghost-awareness refresh fix.

## Relevant Code Paths

- `handlePageHide()`
- `unregisterRoom()`
- `process_awareness_update()`
- `AwarenessState.setUp()` removal-delay logic

## Failure Mode

Users keep seeing a collaborator who is no longer actually participating, which misleads editing decisions and may suppress transport optimizations.

## Planned Instrumentation

- Add `Reachable` markers for explicit disconnect signaling and timeout expiration.
- Add a `Sometimes(cond)` assertion when a collaborator transitions from connected to absent/disconnected on a peer after refresh.

## Existing Antithesis Instrumentation Status

- Missing.

## Assumptions

- The workload can trigger refresh/unload-like behavior and wait past timeout windows when needed.

## Open Questions

- None.
