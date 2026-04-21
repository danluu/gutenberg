# collection-room-updates-release-after-collaborator-detection

## Summary

Collection-room updates that accumulate while queues are paused should eventually be emitted once a collaborator is detected on the primary room.

## Evidence

- `packages/sync/src/providers/http-polling/polling-manager.ts` initializes room queues paused.
- The manager resumes all queues only when the primary room reports more than one awareness entry.
- The polling-manager tests explicitly cover this delayed-release behavior.

## Relevant Code Paths

- `registerRoom()`
- collaborator detection block inside `poll()`
- `UpdateQueue.pause()/resume()/get()`

## Failure Mode

Secondary synced state such as collection notifications or related entities can remain silently stale even though the primary document appears collaborative.

## Planned Instrumentation

- Add a `Reachable` marker when collection queues transition from paused to resumed.
- Add a `Sometimes(cond)` assertion when a queued collection-room update is eventually emitted after collaborator detection.

## Existing Antithesis Instrumentation Status

- Missing.

## Assumptions

- The workload can trigger a collection update while the queue is paused.

## Open Questions

- None.
