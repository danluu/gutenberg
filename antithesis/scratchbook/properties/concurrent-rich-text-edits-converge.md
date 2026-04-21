# concurrent-rich-text-edits-converge

## Summary

Concurrent edits to rich-text-backed post fields should converge to identical state on both peers after the same update set is observed.

## Evidence

- `packages/core-data/src/utils/crdt.ts` merges `content`, `excerpt`, and `title` through `mergeRichTextUpdate()`.
- `packages/sync/src/manager.ts` feeds remote document changes back into the entity record through `getChangesFromCRDTDoc()`.
- `packages/sync/src/providers/http-polling/polling-manager.ts` can delay, batch, or retry update delivery, which makes ordering meaningful.
- `changelog.txt` includes multiple RTC regressions around same-rich-text collaboration and rich-text deserialization.

## Relevant Code Paths

- `applyPostChangesToCRDTDoc()`
- `getPostChangesFromCRDTDoc()`
- `SyncManager.update()`
- `processDocUpdate()` in the polling manager

## Failure Mode

If concurrent text edits do not converge, one peer can lose inserted text, duplicate content, or display a different canonical `content.raw` than another peer after both appear "caught up."

## Planned Instrumentation

- Add a `Reachable` marker when overlapping rich-text edit windows are active.
- Add an `Always` assertion in workload code comparing final normalized post fields after both sessions settle.

## Existing Antithesis Instrumentation Status

- Missing.

## Assumptions

- The workload can normalize rich-text HTML before comparison.

## Open Questions

- None.
