# RTC: a 403 on one room can drop another room's queued compaction

## Summary

A collaborator can lose a queued post compaction when a different synced room in
the same polling request becomes forbidden. The stock repro uses normal
WordPress UI actions: two editors load a post and its default category, the post
accumulates enough title updates for the server to request compaction, and an
admin deletes the loaded category. The next sync request contains both the
deleted category room and the post compaction update, so the server returns 403
for the category.

The expected recovery is to unregister only the forbidden category room and retry
the surviving post room, including its already-created compaction update. The
bug is that the recovery path can restore the failed batch through a queue helper
that intentionally filters out compaction updates. That is correct for ambiguous
network failures, but it is wrong for a definitive per-room 403 where the server
rejected the request before accepting the surviving room's compaction.

## Stock repro

- Browser repro: `test/e2e/specs/editor/collaboration/collaboration-compaction-permission.spec.ts`
- Video: `videos/compaction-permission-loss.mp4`
- Video provenance: regenerated on April 26, 2026 from the Playwright trace
  emitted by the checked-in browser repro. In this current worktree run, the
  real fixture fails earlier at `waitForMutualDiscovery()` because the
  `Collaborators list` button never appears, so the compaction and category
  deletion steps are not reached. The MP4 intentionally shows that actual e2e
  run rather than a hand-written compaction flow.
- Normal user actions:
  1. Create a category and make it the default category.
  2. Editor A and Editor B open the same collaborative post.
  3. Both editors open and cancel the publish panel so the default category
     entity is loaded and synced.
  4. Editor A types enough title text to make the server request post
     compaction.
  5. An admin uses the WordPress admin UI to move the default category back and
     delete the loaded category.
  6. The next sync request includes the deleted category room and the queued post
     compaction update.

## Observed vs expected

Expected: after the 403, the client unregisters the deleted category room and
the next sync request retries the post room with the compaction update still in
the payload.

Observed: the client can either keep retrying the forbidden category room because
the REST error is not recognized at the polling layer, or, after that is fixed,
drop the surviving post room's compaction update when restoring the failed
batch. In both cases the editor fails to make the intended progress for the
surviving post room.

## How it was introduced

The ingredients landed across several RTC HTTP polling PRs:

- #74564, `Real-time collaboration: Add default HTTP polling sync provider`,
  introduced the update queue restore behavior that filters compaction updates
  out of restored failed batches.
- #75682, `RTC: Compact on request with encodeStateAsUpdate`, introduced
  server-requested compaction updates in normal polling traffic.
- #77242, `RTC: Fix disconnect dialog due to uneditable entity`, added
  selective 403 handling that unregisters a forbidden room and resumes polling
  for the remaining rooms.
- #76872, `Restore with compaction update`, is relevant background because it
  handled generic failure recovery by generating a replacement compaction, but
  the narrow issue here is the #77242 403 path using a restore mode that can
  discard a compaction that must be retried.

The combination means a batch can contain a forbidden room and a valid
compaction for a different room. If recovery treats that failed batch like an
ambiguous transport failure, the compaction is removed even though the server's
403 definitively identifies the room that should be removed.

## Root cause

`updateQueue.restore()` filters out compaction updates because replaying stale
compactions after ordinary network errors can overwrite newer server state. That
is a useful safety property for generic failures.

A per-room 403 is different. The server tells the client which room is forbidden,
so the client can remove that room and retry the rest of the batch. For the
surviving rooms, the failed request was not accepted as a successful room update.
Dropping a surviving room's compaction at this point means the client loses a
server-requested state snapshot it still needs to send.

The stock browser repro also exposes an adjacent 403 normalization problem:
WordPress REST errors must reach polling recovery as structured 403 errors with
the forbidden room name available. If they arrive as a generic `Response`, the
client cannot take the selective unregister path.

## Fix plan

1. Normalize sync endpoint failures so WordPress REST 403 responses are parsed
   into the same structured error shape used by the selective 403 recovery code.
2. In the 403 path, identify the forbidden room by exact room name, unregister
   only that room, and restore only the surviving room payloads.
3. Restore surviving room updates in a mode that preserves compaction updates
   for definitive per-room 403 failures.
4. Keep the existing compaction-filtering restore behavior for ambiguous network
   errors, aborted requests, 5xx responses, and any failure where the client
   cannot prove which room was rejected.
5. Add regression coverage for:
   - a batch with `category` 403 plus surviving post compaction;
   - an ambiguous network failure with queued compaction, which must still avoid
     blindly replaying stale compaction;
   - exact room-name matching so prefix collisions do not unregister the wrong
     room;
   - browser coverage for deleting a loaded default category through the admin
     UI while a post compaction is queued.

The fix plan deliberately separates definitive authorization failures from
transport failures. That avoids solving this issue by replaying every compaction
after every failure, which would reintroduce the stale-compaction risk that the
queue restore filtering was designed to prevent.

## Verification

The failing stock repro is:

```bash
WP_BASE_URL=http://localhost:8990 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-compaction-permission.spec.ts --grep "retries a queued post compaction"
```

Known-fixes-base status, checked on `try/fuzz-known-issues-fixed-campaign`
after the previously found RTC fixes were applied:

-   **Fails:** browser stock repro
    `retries a queued post compaction after a loaded category room is deleted`.
    The retry payload still contains the deleted category room, so the current
    failure is at the 403 normalization/selective-unregister layer.
-   **Not yet reached in the browser repro:** the narrower assertion that the
    surviving post room retries its queued compaction update. That assertion is
    still part of the required fix, but the stock browser path currently fails
    first because the forbidden category room is not removed.
-   **Passes:** previously fixed size-limit and compaction-size behavior on this
    base. Those fixes prevent oversized local/compaction updates from taking
    down the transport, but they do not handle this per-room 403 recovery case.

The lower-level regression should live in the HTTP polling manager tests and
assert that a 403 for one room retries a surviving room's queued compaction,
while generic failures still use the safer compaction-filtering restore path.
