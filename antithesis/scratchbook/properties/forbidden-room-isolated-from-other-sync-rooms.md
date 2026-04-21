# forbidden-room-isolated-from-other-sync-rooms

## Summary

A 403 for one room inside a batched poll request should isolate only that room and allow others to continue syncing.

## Evidence

- `handleForbiddenError()` in the polling manager identifies the forbidden room by matching room names inside the server's error message.
- The implementation sorts room names by length to avoid prefix-collision mistakes such as `post:1` versus `post:10`.
- Tests explicitly cover per-room isolation, prefix collisions, and the no-disconnect-signal case.

## Relevant Code Paths

- `isForbiddenError()`
- `identifyForbiddenRoom()`
- `handleForbiddenError()`
- `unregisterRoom(..., { sendDisconnectSignal: false })`

## Failure Mode

One unauthorized entity can silently tear down syncing for unrelated authorized rooms, producing broad false disconnects and stale data.

## Planned Instrumentation

- Add `Reachable` markers for room-specific 403 handling and for the prefix-collision branch.
- Add workload-side `Always` assertions that authorized rooms continue to exchange updates after another room is rejected.

## Existing Antithesis Instrumentation Status

- Missing.

## Assumptions

- The workload can create a mixed-permission or mixed-editability room batch.

## Open Questions

- None.
