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

- Browser repro:
  https://github.com/danluu/gutenberg/blob/try/rtc-primary-unregister-stock-repro-pr-trunk/test/e2e/specs/editor/collaboration/collaboration-primary-room-unregister.spec.ts
- Video:
  https://github.com/danluu/gutenberg/blob/try/rtc-primary-unregister-stock-repro/docs/explanations/architecture/rtc-stock-repros/videos/primary-room-unregister.mp4
- Video provenance: regenerated on April 26, 2026 from the Playwright trace
  emitted by the checked-in browser repro. This current worktree run reaches
  the intended failure: after another user joins the surviving `root/comment`
  room, normal note creation sends a `root/comment` payload with `0` updates.
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

1. Preserve the existing primary-room behavior: when the primary room sees more
   than one awareness client, resume all queues so related rooms such as
   `root/comment` can send updates.
2. Add a non-primary fallback: when a non-primary room sees more than one
   awareness client, resume only that room's own queue.
3. Keep a separate global "has collaborators" signal for polling cadence. Any
   active room with more than one awareness client can justify faster polling,
   but non-primary awareness must not flush unrelated room queues.
4. Do not promote a replacement primary room just to recover from unregistering
   the first room. Promotion risks changing request-selection semantics; the
   smaller fix is to let surviving rooms resume themselves.
5. Remove the dependency on a surviving primary room for room-local queue
   resume. If the primary room is unregistered, remaining rooms should still
   process awareness and resume themselves when they have peers.
6. Add regression coverage for:
   - oversized-title unregister of the post room followed by normal note
     creation in `root/comment`;
   - provider-level room registration and provider disconnect, so the repro
     exercises the public HTTP polling provider interface and not only the
     polling manager singleton;
   - normal post plus notes collaboration when the primary room remains active;
   - two unrelated posts that share a collection room, ensuring collection
     awareness does not flush unrelated post room updates;
   - unregistering and later registering rooms so queue resume state does not
     leak across stale room objects.

This plan preserves the false-positive protection from #76704 by allowing
non-primary rooms to resume only themselves. It fixes the surviving-room case
without going back to a global "any shared collection means all rooms can send"
rule.

## Repro coverage in the PR branch

PR branch:
https://github.com/danluu/gutenberg/tree/try/rtc-primary-unregister-stock-repro-pr-trunk

- Browser-level normal-user repro:
  https://github.com/danluu/gutenberg/blob/try/rtc-primary-unregister-stock-repro-pr-trunk/test/e2e/specs/editor/collaboration/collaboration-primary-room-unregister.spec.ts
- HTTP polling provider-level repro:
  https://github.com/danluu/gutenberg/blob/try/rtc-primary-unregister-stock-repro-pr-trunk/packages/sync/src/providers/http-polling/test/http-polling-provider.test.ts
- Polling manager-level repro:
  https://github.com/danluu/gutenberg/blob/try/rtc-primary-unregister-stock-repro-pr-trunk/packages/sync/src/providers/http-polling/test/polling-manager.test.ts

There is no meaningful lower standalone Yjs or `UpdateQueue` repro for this
specific bug. The failure requires room lifecycle, primary-room classification,
collaborator awareness, and queue-resume policy; those are introduced in the
HTTP polling provider/polling manager layer. Below that layer, the queue only
stores and returns updates, and Yjs only emits document updates.

## Verification

The failing stock repro is:

```bash
WP_BASE_URL=http://localhost:8990 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-primary-room-unregister.spec.ts --grep "syncs notes after an oversized title"
```

Known-fixes-base status, checked on `try/fuzz-known-issues-fixed-campaign`
after the previously found RTC fixes were applied:

-   **Fails:** normal stock browser repro
    `syncs notes after an oversized title removes the original post room`.
    After another user joins the surviving `root/comment` room, normal note
    creation still sends a `root/comment` payload with `0` updates.
-   **Fails:** lower-level/browser lifecycle repro in the same spec,
    `resumes category updates after the original post room is deleted in place`.
    The post room is gone as expected, but the surviving category room also
    sends `0` updates.
-   **Passes:** the previously fixed large-update transport behavior on this
    base. The oversized title disables collaboration for the post room instead
    of repeatedly surfacing the generic transport-limit failure, but the
    remaining room-local queue-resume bug is still present.

The lower-level polling manager regression should assert that a non-primary
surviving room resumes its own queue when it sees a collaborator, while a shared
collection room does not resume unrelated post room queues.

Current PR-branch verification:

- Tests-only commit fails against trunk:
  `packages/sync/src/providers/http-polling/test/http-polling-provider.test.ts`
  fails because the surviving `root/comment` room still sends an empty update
  list after collaborator discovery.
- Tests-only commit fails against trunk:
  `packages/sync/src/providers/http-polling/test/polling-manager.test.ts`
  fails for the same empty surviving-room update list.
- Branch head passes:
  `npm run test:unit -- packages/sync/src/providers/http-polling/test/http-polling-provider.test.ts packages/sync/src/providers/http-polling/test/polling-manager.test.ts`
