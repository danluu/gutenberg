# RTC: surviving rooms stop sending updates after the primary room is removed

## Summary

A collaborator can stop syncing notes after the original post room is removed
from the polling manager. The stock repro uses normal editor actions: open a
post, paste an oversized title so RTC unregisters the post room for that editor,
let a second editor join, and add a note. The note appears locally, but the
surviving `root/comment` room sends an empty update payload and the second
editor does not receive the note.

This happens because the HTTP polling provider uses the first registered room as
the "primary" room. Queue resume and collaborator detection depend on seeing
another client in that primary room. If the primary room is later unregistered,
other rooms can remain active, but their queues never resume even when those
rooms themselves have another collaborator.

## Stock repro

- Browser repro: `test/e2e/specs/editor/collaboration/collaboration-primary-room-unregister.spec.ts`
- Video: `videos/primary-room-unregister.mp4`
- Normal user actions:
  1. Editor A opens a collaborative post that contains a paragraph.
  2. Editor A pastes an oversized title. The post room exceeds the sync size
     limit, collaboration is disabled for the post entity, and the post room is
     unregistered.
  3. The `root/comment` room remains registered because notes still use it.
  4. Editor B opens the same post and shares the surviving `root/comment` room.
  5. Editor A uses the block options menu to add a note to the paragraph.
  6. Editor B opens All notes and does not see the note.

## Observed vs expected

Expected: once Editor B is present in `root/comment`, Editor A's note creation
should send a `root/comment` update and Editor B should see the note through the
normal All notes UI.

Observed: the next `root/comment` sync request from Editor A has zero updates.
The local note exists, but it is withheld in the paused queue because no primary
room remains to trigger queue resume.

## How it was introduced

The primary-room behavior was introduced by #76704, `RTC: Increase polling
intervals, increase polling on primary room only`. That PR made collaborator
detection and polling cadence depend on the first registered room so shared
collection rooms would not create false positives.

#76873, `RTC: Fix notes not syncing between collaborative editors`, made primary
room collaborator detection resume all room queues. That fixed the normal notes
case when the primary post room still exists: collaborators are discovered on
the post room, and queued note updates in `root/comment` are allowed to send.

The remaining gap is the room lifecycle case. If the first registered post room
is unregistered, #76704 and #76873 leave no replacement path for collaborator
detection, even when a surviving room such as `root/comment` has multiple
clients and is exactly the room that needs to send updates.

## Root cause

`packages/sync/src/providers/http-polling/polling-manager.ts` pauses local
updates until another collaborator is detected. During each poll response it
checks:

- is this room marked as the primary room?
- does this primary room have more than one awareness client?

Only then does it set the global collaborator flag and resume all queues. After
the primary room is unregistered, no remaining room satisfies
`roomState.isPrimaryRoom`, so queue resume never happens. `root/comment`
continues polling and receiving awareness, but its own awareness is not allowed
to resume its own queue.

The original false-positive concern is real: a shared collection room should not
cause unrelated post rooms to send local updates just because two editors happen
to share a taxonomy or comment collection. The bug is the all-or-nothing global
resume tied to primary-room existence.

## Fix plan

1. Make queue resume room-local: when a room sees more than one awareness client,
   resume that room's own update queue.
2. Keep a separate global "has collaborators" signal only for polling cadence
   and connection status. Any active room with more than one awareness client can
   justify faster polling, but it must not automatically flush unrelated room
   queues.
3. Remove the dependency on a surviving primary room for room-local queue
   resume. If the primary room is unregistered, remaining rooms should still
   process awareness and resume themselves when they have peers.
4. If a primary room is still useful for request selection, promote a remaining
   active room only for request scheduling/status purposes. Do not use promotion
   to resume unrelated queues.
5. Add regression coverage for:
   - oversized-title unregister of the post room followed by normal note
     creation in `root/comment`;
   - normal post plus notes collaboration when the primary room remains active;
   - two unrelated posts that share a collection room, ensuring collection
     awareness does not flush unrelated post room updates;
   - unregistering and later registering rooms so queue resume state does not
     leak across stale room objects.

This plan preserves the false-positive protection from #76704 by narrowing
queue resume to the room where collaborator awareness was observed. It fixes the
surviving-room case without going back to a global "any shared collection means
all rooms can send" rule.

## Verification

The failing stock repro is:

```bash
WP_BASE_URL=http://localhost:8990 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-primary-room-unregister.spec.ts --grep "syncs notes after an oversized title"
```

The lower-level polling manager regression should assert that a non-primary
surviving room resumes its own queue when it sees a collaborator, while a shared
collection room does not resume unrelated post room queues.
