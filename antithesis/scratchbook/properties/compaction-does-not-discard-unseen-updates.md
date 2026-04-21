# compaction-does-not-discard-unseen-updates

## Summary

Compaction must not erase updates that a delayed client has not yet observed.

## Evidence

- `WP_HTTP_Polling_Sync_Server::process_sync_update()` removes updates only before the caller's cursor when accepting a compaction.
- `WP_Sync_Post_Meta_Storage::get_updates_after_cursor()` snapshots `max_meta_id` before fetching updates, which is intended to make replay race-safe.
- The polling manager relies on this cursor discipline when replacing failed outgoing updates with a full-state compaction.

## Relevant Code Paths

- `process_sync_update()` compaction branch
- `remove_updates_before_cursor()`
- `get_updates_after_cursor()`
- client-side `should_compact` handling

## Failure Mode

A slow or partitioned collaborator can permanently miss updates after another client compacts, leading to silent divergence.

## Planned Instrumentation

- Add PHP-side `Reachable` markers for compaction accept/skip branches.
- Add workload-side `Always` assertions comparing delayed clients with continuously connected clients after compaction.

## Existing Antithesis Instrumentation Status

- Missing.

## Assumptions

- The workload can force one collaborator to lag behind while another becomes compactor.

## Open Questions

- None.
