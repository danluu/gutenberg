# poll-failures-recover-without-losing-local-updates

## Summary

Ambiguous polling failures should recover safely without losing local edits or replaying them in a way that corrupts state.

## Evidence

- `packages/sync/src/providers/http-polling/polling-manager.ts` contains explicit recovery logic for the "server may have stored updates but response failed" case.
- When there were outgoing updates and a cursor exists, the queue is replaced by a compaction update rather than naïvely restored.
- Polling-manager tests explicitly verify compaction-based recovery after failed requests.

## Relevant Code Paths

- error handler inside `poll()`
- `UpdateQueue.restore()`
- `createCompactionUpdate()`

## Failure Mode

Retries can duplicate updates on the relay, lose pending local edits, or cause later convergence failures if the wrong recovery path is taken.

## Planned Instrumentation

- Add `Reachable` markers when the queue is converted to compaction-based recovery.
- Add workload-side `Always` assertions on final peer convergence after injected poll failures mid-edit.

## Existing Antithesis Instrumentation Status

- Missing.

## Assumptions

- The workload can fault the client-to-WordPress HTTP path at precise times.

## Open Questions

- None.
