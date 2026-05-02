# RTC WebSocket failure analysis

This follows the handoff for the two real WebSocket-specific RTC failures found
in the local WebSocket e2e run:

-   #21: same-user unsaved title loss after reload.
-   #24: concurrent list item moves lose one user's move.

The local WebSocket test suite branch used as the base was
`codex/rtc-websocket-e2e-local-20260502` at `9c1211ed2b0`.

## Branches and artifacts

-   Final PR-style branch:
    `codex/rtc-websocket-e2e-explanation-20260502-pr`
-   Bug branches forked from `origin/trunk`:
    -   `try/ws-same-user-title-reload-loss`
    -   `try/ws-concurrent-list-item-move-loss`
-   Repro videos:
    -   `/tmp/gutenberg-ws-repro-videos/ws-same-user-title-reload-loss.mp4`
    -   `/tmp/gutenberg-ws-repro-videos/ws-concurrent-list-item-move-loss.mp4`
-   Pre-fix repro logs created during this analysis:
    -   `/tmp/gutenberg-prefx-ws-video-same-user.log`
    -   `/tmp/gutenberg-prefx-ws-video-list-move-repeat.log`
-   Trace-level pre-fix logs from the deeper pass:
    -   `/tmp/gutenberg-trace-title-test.log`
    -   `/tmp/gutenberg-trace-title-summary.log`
    -   `/tmp/gutenberg-trace-list-test.log`
    -   `/tmp/gutenberg-trace-list-summary.log`
    -   `/tmp/gutenberg-trace-ws-server.log`
-   Final focused verification after the direct core-data guard:
    -   `/tmp/gutenberg-final-deeper-focused-e2e.log`
    -   `/tmp/gutenberg-final-deeper-ws-server.log`
-   Prior handoff evidence logs:
    -   `/tmp/gutenberg-ws-rerun-same-user-title.log`
    -   `/tmp/gutenberg-http-rerun-same-user-title.log`
    -   `/tmp/gutenberg-ws-rerun-stress.log`
    -   `/tmp/gutenberg-http-rerun-stress.log`

## Known-fixes check

The newest usable known-fixes candidate found locally was
`try/fuzz-all-local-known-fixes` at `6a1a8d30794` (`Restore nested rich text
selection lookup`, committed 2026-04-30 14:14:22 -0700).

I checked it by applying only the local WebSocket suite and the two focused
natural Playwright repros on top of that commit, then running:

```bash
WP_BASE_URL=http://localhost:8892 GUTENBERG_RTC_TEST_WS_REUSE_SERVER=1 \
	npm run test:e2e:rtc-websocket -- --project=chromium \
	test/e2e/specs/editor/collaboration/websocket/collaboration-same-user-title-reload-loss.spec.ts \
	test/e2e/specs/editor/collaboration/websocket/collaboration-stress.spec.ts \
	--grep "keeps an unsaved same-user title|two users concurrently move list items"
```

Result: `2 passed (11.1s)`. These two failures did not reproduce on that
known-fixes head. The check reused the already-running RTC wp-env because Docker
had exhausted its subnet pool for new wp-env stacks; the source tree was switched
to the known-fixes check commit during the run and switched back afterward.

## Deeper isolation matrix

After the initial pass, I isolated the known-fixes branch further because
`try/fuzz-all-local-known-fixes` is not current trunk plus one small patch. It
diverged at `0f99b8a8044a`; current `origin/trunk` is 102 commits ahead of that
merge-base, and the known-fixes branch is 78 commits ahead.

The focused probes below were run against current `origin/trunk` plus the local
WebSocket suite and the two natural Playwright repros. They used the same
already-running wp-env and a local relay on port `18991`.

| Probe                                                                           | Same-user title reload | Concurrent list moves | Log                                                 |
| ------------------------------------------------------------------------------- | ---------------------- | --------------------- | --------------------------------------------------- |
| `15ff93d3065` only (`Fix persisted CRDT hydration sync`)                        | failed 5/5             | failed 1/5            | `/tmp/gutenberg-15ff-probe-focused.log`             |
| `573b567b8d4` only (`Fix RTC title reload reconciliation`)                      | passed 5/5             | failed 3/5            | `/tmp/gutenberg-573-probe-focused.log`              |
| `573b567b8d4` plus known-fixes `crdt-blocks.ts`/`crdt-utils.ts`                 | passed 5/5             | failed 1/5            | `/tmp/gutenberg-known-crdtblocks-probe-focused.log` |
| final WebSocket protocol/readiness fix branch before the direct core-data guard | passed 5/5             | passed 5/5            | `/tmp/gutenberg-final-repeat-focused.log`           |

This changes the interpretation:

-   #21 is primarily a core-data CRDT-persistence save echo. The WebSocket provider
    made it visible, but the direct fix is the `573b567b8d4` behavior: persistence
    saves must not feed the server response back into `syncManager.update()` as a
    saved local edit. The WebSocket bootstrap/readiness fix avoided the observed
    repro trigger, but the direct core-data guard is still needed to close the
    stale-save edge itself.
-   #24 is not solved by the title fix and is not fully solved by the known-fixes
    block merge implementation. The block merge improvements reduce stale local
    overwrite pressure, but a WebSocket peer can still act before it has received a
    canonical peer snapshot. The final protocol/readiness boundary eliminates that
    repeated-run failure in this focused check.

## Trace-level mechanism

I then instrumented current `origin/trunk` plus only the local WebSocket suite
and the two repro commits. The temporary trace logged WebSocket provider
messages, relay room state, `persistCRDTDoc`, `saveEntityRecord`, and
`syncManager.update()` transitions.

For #21, the trace made the stale writer unambiguous:

1. Browser B reloads with the REST title
   `RTC same-user reload initial`, then receives the peer snapshot containing
   `RTC same-user unsaved title before reload`.
2. The resolver-triggered CRDT persistence path still has an edited record with
   `RTC same-user reload initial` and dispatches `saveEntityRecord()`.
3. The server response also contains `RTC same-user reload initial`.
4. `saveEntityRecord()` calls `syncManager.update()` with that stale response as
   a saved local update. Immediately before the write, the CRDT title is the
   unsaved title; immediately after the write, the CRDT title is the initial
   title.
5. The WebSocket provider broadcasts that update, and browser A applies it,
   changing browser A from the unsaved title back to the initial title.

The key trace line is the page-B transition at `1777758772674` in
`/tmp/gutenberg-trace-title-summary.log`: `updateCRDTDoc-before-apply` has
`docTitle=RTC same-user unsaved title before reload` and
`changeTitle=RTC same-user reload initial`. The following provider update is
received by page A at `1777758772676` and page A's edited record is reconciled
to the initial title.

For #24, the trace showed a stale whole-`blocks` echo rather than the exact
title-save echo:

1. Browser B moves `Item Epsilon` up. Its CRDT becomes
   `Alpha, Beta, Gamma, Epsilon, Delta, Zeta`, and the provider sends that
   update.
2. Browser A receives browser B's update while browser A's editor store already
   contains its own local move, `Alpha, Gamma, Beta, Delta, Epsilon, Zeta`.
3. `_updateEntityRecord()` applies the remote `blocks` change to browser A's
   editor store. This temporarily loses browser A's local move in the rendered
   editor.
4. A pending local editor-store update then writes browser A's stale local
   `blocks` value back through `updateCRDTDoc()`. That write carries the Beta
   move only and new list-item `clientId`s for the interior items.
5. Browser B receives the Beta-only CRDT update and reconciles its editor store,
   losing its own Epsilon move.

The failure snapshot in `/tmp/gutenberg-trace-list-test.log` captures the split:
browser A rendered `Alpha, Beta, Gamma, Epsilon, Delta, Zeta` while browser B
rendered `Alpha, Gamma, Beta, Delta, Epsilon, Zeta`. The relay trace then shows
room state first at Epsilon-only (`updateCount=8`) and then Beta-only
(`updateCount=9`) in `/tmp/gutenberg-trace-ws-server.log`.

That makes the final fix more specific than "wait longer": the system needs a
real remote-state reconciliation boundary. While a remote `blocks` key is being
applied to the editor store, a stale local editor-store notification for that
same key must not be allowed to write back into the CRDT. Separately, a joining
WebSocket peer must not be declared ready while its CRDT branch can still be
only local bootstrap state.

One follow-up from this deeper pass: the WebSocket bootstrap fix alone can make
#21 pass by ensuring a reloading peer applies remote state before
`applyPersistedCrdtDoc()` runs. In that path, the provider sets
`hasProviderSyncedRemoteState`, `applyPersistedCrdtDoc()` returns early, and the
resolver-triggered `persistCRDTDoc()` save is never started. That removes the
test trigger, but it does not remove the stale-save primitive shown in the
trace. The final branch therefore also includes the known-fixes behavior:
resolver-triggered CRDT persistence saves pass `__unstableSkipSyncUpdate`, and
`saveEntityRecord()` still marks the CRDT as saved with `{ isSave: true }` but
does not apply the REST response into the CRDT document.

## Code-path analysis from the deeper pass

The title failure had two distinct layers, and treating them as one bug obscures
the fix:

1. `getEntityRecord()` starts `getSyncManager().load()` for synced entities, but
   intentionally does not await it. The resolver then continues with normal
   REST record handling. The sync-manager handlers include `getEditedRecord()`,
   which resolves the current edited entity record, and `persistCRDTDoc()`,
   which saves that edited record so `meta._crdt_document` can be regenerated.
2. `applyPersistedCrdtDoc()` can call `persistCRDTDoc()` when a CRDT document is
   missing or invalidated. In the stale reload trace, the edited record visible
   to that persistence path still had the REST title
   `RTC same-user reload initial`, even though the local Y.Doc had already
   received the peer title `RTC same-user unsaved title before reload`.
3. A normal `saveEntityRecord()` receives the server response, stores it, then
   calls `syncManager.update( updatedRecord, LOCAL_UNDO_IGNORED_ORIGIN, { isSave: true } )`.
   That is reasonable for a user save, where the server response is
   authoritative enough to mark the synced entity saved. It is wrong for a
   CRDT-document persistence save, where the goal is only to persist the CRDT
   blob in post meta. The REST title/content in that response can be older than
   unsaved peer CRDT state.
4. The direct guard therefore has to live at the core-data save boundary:
   `persistCRDTDoc()` passes `__unstableSkipSyncUpdate`, and `saveEntityRecord()`
   sends an empty change object to `syncManager.update()` while still passing
   `{ isSave: true }`. This preserves the save marker without letting stale
   server fields become collaborative edits.

The WebSocket readiness fix still matters for #21 because it removes the
specific trigger: a reloading peer now applies remote state before persisted or
local bootstrap state can be reapplied. But the direct core-data guard is what
closes the stale-save primitive itself.

The list failure has a different shape:

1. Remote CRDT changes are reconciled into core-data by
   `_updateEntityRecord()`, which computes `changes` with
   `getPostChangesFromCRDTDoc()` and dispatches them through `editRecord()`.
2. For `blocks`, `getPostChangesFromCRDTDoc()` returns changed whenever the
   CRDT has a `blocks` key, except for the special persisted-document comparison.
   So a remote move is applied to the editor store as a whole `blocks` value,
   not as an operation such as "move Beta after Gamma".
3. Local editor edits go the other direction through `editEntityRecord()`, which
   calls `syncManager.update( editsWithMerges, ... )` before dispatching the
   local `EDIT_ENTITY_RECORD` action. This keeps the Y.Doc close to local input,
   but it also means a pending local editor-store notification can reach the
   CRDT while a remote `blocks` reconciliation for the same record key is still
   settling.
4. `applyPostChangesToCRDTDoc()` sends the whole incoming block array to
   `mergeCrdtBlocks()`. That merge does a left/right equality sweep and updates
   the changed middle in place. It ignores `clientId` for equality and repairs
   duplicate client IDs, but it does not know the semantic operation that
   produced the array. If a stale whole array containing only browser A's Beta
   move is written after browser B's Epsilon move entered the CRDT, the later
   whole-array write can collapse the combined state back to the Beta-only
   order.
5. The final sync-manager guard tracks remote keys while they are being
   reconciled into the editor store. Non-save local updates for those keys are
   filtered until the edited record catches up. This is why the fix is scoped to
   the store/CRDT handoff instead of pretending the block array merge has become
   an operation-level move CRDT.

The provider/relay changes are the transport half of the same invariant. The
relay now maintains a room Y.Doc and only stores updates that successfully apply
to that room. A joining client sends a Yjs state vector, receives a snapshot of
known room updates, and existing peers receive a `sync-request` so they can send
only the missing state. The provider resolves its `ready` promise only after
that snapshot/peer-state boundary. Initial sync-manager updates are allowed for
the first peer in an empty room, but a joining peer that applied remote state
discards queued local bootstrap messages and marks the Y.Doc with
`hasProviderSyncedRemoteState`, which tells `applyPersistedCrdtDoc()` not to
reapply stale persisted/local REST state over the remote state.

## Happens-before reconstruction

The trace shows that neither failure is a Yjs convergence failure after two
valid causally ordered updates. Both failures are stale-authority bugs at the
boundary where WordPress entity state is converted to Yjs updates.

For #21, browser B's reload did eventually receive the correct unsaved peer
title, but the stale save was already in flight:

1. At `1777758771956`, browser B runs `applyPersistedCrdtDoc()` against the
   REST record and its local Y.Doc title becomes `RTC same-user reload initial`.
2. At `1777758771989`, `persistCRDTDoc()` resolves the edited record and starts
   a `saveEntityRecord()` using that same initial title.
3. At `1777758772007`, the old WebSocket provider sends B's local join state to
   the relay before B has applied any peer snapshot.
4. At `1777758772031` to `1777758772033`, B receives the relay snapshot and its
   Y.Doc becomes correct: `RTC same-user unsaved title before reload`.
   `_updateEntityRecord()` starts applying that title to the edited record, but
   this does not cancel the earlier persistence save.
5. At `1777758772668`, the REST save response comes back with the initial title.
   At `1777758772674`, `saveEntityRecord()` writes the full server response into
   the CRDT as a saved local update. The trace line shows the overwrite in one
   transition: before the write the CRDT title is the unsaved title, and the
   incoming change title is the initial title.
6. At `1777758772676`, browser A receives that update and its correct unsaved
   title is replaced by the initial title.

So the exact missing invariant was: "A save whose purpose is only CRDT-document
persistence must not make the REST entity response authoritative for synced
content fields." The WebSocket fix adds the earlier invariant that remote state
must be applied before local bootstrap/persisted state can be published, but the
core-data guard is still needed because the stale save response can arrive long
after the Y.Doc has already become correct.

For #24, the destructive update is much closer to the user action:

1. Browser B applies the Epsilon move at `1777758854429`; its local CRDT changes
   from `Alpha, Beta, Gamma, Delta, Epsilon, Zeta` to
   `Alpha, Beta, Gamma, Epsilon, Delta, Zeta` and the provider sends that update.
2. Browser A receives the update at `1777758854450` to `1777758854451`. At this
   instant A's Y.Doc is the Epsilon-move order, but A's edited record still shows
   its own Beta move:
   `Alpha, Gamma, Beta, Delta, Epsilon, Zeta`. That edited record also has new
   transient block `clientId`s for the interior list items.
3. `_updateEntityRecord()` begins reconciling the remote `content` and `blocks`
   keys into A's edited record. This is the critical window: remote CRDT state
   is correct, but the local editor/core-data state has not settled.
4. At `1777758854476`, a pending local editor update from A writes the stale
   Beta-only whole `blocks` value into the CRDT. The previous CRDT state had the
   Epsilon move; the incoming change has only the Beta move. `mergeCrdtBlocks()`
   receives arrays, not move operations, so it updates the changed middle and
   the room state becomes Beta-only.
5. At `1777758854479`, browser B receives that Beta-only update and reconciles
   to `Alpha, Gamma, Beta, Delta, Epsilon, Zeta`, losing its own Epsilon move.
6. The later save response at `1777758856424` reaffirms the already-collapsed
   Beta-only order. It is not the primary cause of the list failure.

This explains the intermittency. If A's local block update reaches its Y.Doc
before B's remote move is applied, or if B's remote move fully reconciles into
A's edited record before A's pending local notification writes back, the visible
failure does not happen. The bad case is the narrow window where A's edited
record contains a local whole-block array that its Y.Doc does not yet contain,
and a remote whole-block array is being reconciled at the same time.

That also explains why the pre-move Playwright check was necessary but not
sufficient. It proved both editors rendered the same list text and Gutenberg
`clientId`s before the move. It did not prove that every observer, queued
callback, save response, and remote reconciliation path had no pending whole-key
write left to run.

The final fix establishes the missing happens-before edges:

-   provider `ready` means snapshot or peer-state synchronization has completed,
    not merely that the WebSocket is open;
-   a joining peer's local bootstrap state is never room history by itself;
-   persisted/local REST bootstrap state cannot be applied after a provider has
    already synchronized remote state;
-   CRDT-document persistence saves mark the document as saved without applying
    stale REST fields as collaborative edits;
-   while a remote key is being reconciled into the edited record, local non-save
    writes for that same key are filtered so they cannot echo a stale whole-key
    value back into the Y.Doc.

## Why Yjs behaved correctly

One confusing part of #21 is that browser B's old join state did not immediately
overwrite browser A's title in the trace. That is expected Yjs behavior. The
join state from B was an old document state; it did not contain a deletion of
A's newer unsaved title. Applying that old state to A was either redundant or
merged behind the already-known newer text state, so A still showed the unsaved
title after B's join update.

The later save response was different. By the time `saveEntityRecord()` called
`syncManager.update()`, browser B's Y.Doc had already applied A's unsaved title.
`applyPostChangesToCRDTDoc()` then merged the stale server title into the current
Y.Text. That generated a new local Yjs operation whose meaning was effectively
"replace the current unsaved title with the initial title." Since that operation
was causally after the remote title, Yjs correctly delivered the overwrite to
browser A. The bug was not that Yjs picked the wrong winner; it was that
core-data manufactured a new collaborative edit from a stale persistence-save
response.

The same distinction explains #24. Browser A's stale Beta-only block update was
created after A's Y.Doc had received browser B's Epsilon move. From Yjs's point
of view, A was issuing a later edit to the `blocks` shared type. The problem is
that the later edit was not a real user decision to undo B's move. It was a
whole-record editor-state echo produced while remote `blocks` reconciliation was
still in progress.

The changed `clientId`s in the list trace are also explained by
`mergeCrdtBlocks()` rather than by the WebSocket transport. For same-length list
orders, the left/right sweep skips equal prefix/suffix entries and updates the
changed middle positions in place. Equality ignores `clientId`, but the update
loop still iterates over block properties and sets changed scalar fields,
including `clientId`. In the failed trace, `Item Alpha` and `Item Zeta` kept
their original IDs because they were skipped as equal prefix/suffix entries.
The interior list items were rewritten from browser A's stale whole-block array,
which is why their IDs changed together with the order collapse.

So the deeper diagnosis is:

-   the WebSocket relay/provider had no causal "this peer has synchronized"
    barrier and let local bootstrap state enter room history;
-   core-data and the sync manager then converted stale WordPress entity state
    into fresh Yjs operations;
-   once stale state had been converted into fresh Yjs operations, Yjs replicated
    those operations correctly.

The fix therefore must prevent stale WordPress entity state from becoming a new
Yjs operation. It cannot be solved by changing Yjs ordering or by adding a
delay after socket open.

## Layer-by-layer fault model

The old WebSocket path had five weak boundaries that lined up in these repros.
Each boundary was survivable on its own, which is why the failures were
intermittent, but together they allowed stale WordPress entity state to become
fresh collaborative Yjs operations.

| Layer                       | Old behavior                                                                                                                                                                  | Failure enabled                                                                                                                                     | Fixed behavior                                                                                                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relay room history          | `join.state` was appended directly to `room.updates` and broadcast. The relay did not keep a room Y.Doc or validate updates.                                                  | A joining or reloading peer's local bootstrap Y.Doc became part of room history before that peer had synchronized with existing peers.              | Joining peers send state vectors. The relay keeps a room Y.Doc, applies updates before storing them, sends snapshots, and asks existing peers for missing state. |
| Provider readiness          | The provider emitted `connected` on socket open, sent full local state, and flushed queued local updates before applying the room snapshot.                                   | Tests and sync-manager lifecycle could proceed while the local Y.Doc still represented REST/bootstrap state rather than peer state.                 | `ready` resolves only after snapshot/peer-state sync. Queued bootstrap messages are discarded after remote state.                                                |
| Sync-manager bootstrap      | Provider creation happened before record/state observers were attached. `applyPersistedCrdtDoc()` then ran without knowing whether provider remote state had already arrived. | Remote bootstrap updates could be missed, and stale persisted/REST state could be applied after remote state.                                       | Observers are attached before provider creation, and provider-applied remote state marks the Y.Doc so persisted/REST bootstrap is not reapplied over it.         |
| CRDT persistence save       | `persistCRDTDoc()` saved the edited record, and `saveEntityRecord()` fed the full REST response back into `syncManager.update()`.                                             | A persistence save could turn stale server title/content into a fresh saved collaborative edit. This is the direct #21 stale writer.                | CRDT-document persistence saves pass `__unstableSkipSyncUpdate`; the save marker is written, but stale REST fields are not applied to the CRDT.                  |
| Editor-store reconciliation | Remote CRDT changes were dispatched to core-data, but local editor updates for the same keys were still allowed to write back immediately.                                    | A pending local whole-`blocks` value could echo back while a remote whole-`blocks` value was being reconciled. This is the direct #24 stale writer. | Remote keys are tracked while reconciling; non-save local updates for those keys are filtered until the edited record catches up.                                |

This is also why the isolation matrix looked split:

-   `573b567b8d4` alone fixed the direct #21 stale-save writer, so the title repro
    passed even with the old WebSocket transport.
-   The known-fixes block merge files reduced pressure on #24 but did not close
    the store/CRDT reconciliation window, so the list repro still failed
    intermittently.
-   The final branch passes the focused repros because it closes both kinds of
    stale-writer conversion: persistence-save responses for title/content, and
    in-flight local whole-key echoes for blocks.

The remaining architectural limitation is that `blocks` is still synchronized as
a whole entity key. This patch does not make arbitrary block moves into
operation-level CRDT moves. It fixes the observed WebSocket failure by preventing
stale whole-key editor state from being reintroduced while remote CRDT state is
being applied.

## Why the HTTP control passed

The HTTP polling control is not the old WebSocket test transport over a different
wire. It already had most of the protocol boundaries the WebSocket path was
missing.

On the client, `registerRoom()` enqueues a Yjs sync-step-1 message, which is a
state-vector announcement, not a full local document update. Incoming
`sync_step1` messages are answered with `sync_step2`, and incoming `sync_step2`
messages are applied through the Yjs sync protocol before the provider marks
itself internally synced. That is a causal handshake: a peer asks "what am I
missing?" instead of saying "treat my current bootstrap state as room history."

The HTTP update queue also starts paused. While paused, `updateQueue.get()`
returns no outbound updates, but the poll still includes the room so the client
can receive awareness and missing server updates. Only after the primary room
observes another awareness client does the polling manager resume all room
queues. That means local REST/bootstrap mutations from a joining page are not
immediately transmitted as authoritative document updates just because the page
opened.

The server side keeps that distinction. It stores typed updates
(`sync_step1`, `sync_step2`, `update`, `compaction`) behind a cursor and filters a
client's own non-compaction updates when returning room history. A stored
`sync_step1` is an invitation for another peer to compute missing updates; it is
not applied as document content by the server. The old WebSocket relay did the
opposite: it accepted `join.state`, appended it directly to room history, and
broadcast it as an ordinary `update`.

The e2e readiness model also differed. HTTP tests waited for repeated
`wp-sync` responses, which indirectly waited for awareness/cursor progress and
gave the sync-step exchange time to complete. The old WebSocket helper treated
socket open plus awareness as enough; it had no separate `synced` state, so user
actions could start while a page's Y.Doc was still mostly REST/bootstrap state.

This explains the split result. The HTTP controls passing did not prove the
core-data and sync-manager stale-write primitives were harmless. It showed that
the HTTP transport usually avoided triggering them. Once the WebSocket path let
unsynchronized local state through the transport boundary, the higher layers
could still convert stale WordPress entity state into fresh Yjs operations. The
final WebSocket fix therefore copies the important HTTP invariants: state-vector
sync, no authoritative join state, a real synced/readiness barrier, and no stale
local queue flush after remote state has arrived.

## Writer-level diagnosis

There are two store-to-CRDT entry points that matter in these failures.

The first is ordinary editor editing. `editEntityRecord()` computes
`editsWithMerges` and, when the entity has `syncConfig`, calls
`syncManager.update( objectType, objectId, editsWithMerges, origin, ... )`.
For normal edits that origin is `gutenberg`; for undo-ignored edits it is
`gutenberg-undo-ignored`. The sync manager exposes this method through
`yieldToEventLoop( updateCRDTDoc )`, so the actual Yjs transaction runs on a
later `setTimeout( 0 )` tick.

That event-loop deferral explains the #24 trace. Browser A had a local Beta move
scheduled for CRDT application. Before that scheduled local write ran, browser A
received browser B's Epsilon move and applied it to the Y.Doc. The remote update
then flowed CRDT-to-store through `onRecordUpdate()` and `_updateEntityRecord()`.
Twenty-six milliseconds later, A's older local whole-`blocks` value finally ran
through `updateCRDTDoc()` with origin `gutenberg`. Since it ran after the remote
Epsilon update, Yjs correctly treated it as the later operation and replicated
the Beta-only block order to browser B.

The second entry point is saving. `saveEntityRecord()` receives the REST response
and, when the entity has `syncConfig`, calls
`syncManager.update( ..., updatedRecord, gutenberg-undo-ignored, { isSave: true } )`.
That is correct for a real user save because server-side canonicalization may
need to update the CRDT and the save marker must be broadcast. It is wrong for
the resolver-triggered `persistCRDTDoc()` save, whose purpose is only to persist
`meta._crdt_document`. In #21 that invisible persistence save returned a stale
server title. Because it was marked `isSave`, it bypassed the remote-key
reconciliation filter and became a fresh `gutenberg-undo-ignored` Yjs operation
that replaced the peer's unsaved title.

The CRDT-to-store path is deliberately different. The resolver's sync-manager
handler dispatches a raw `EDIT_ENTITY_RECORD` action for remote changes; it does
not call the public `editEntityRecord()` action creator, so remote CRDT changes
do not immediately echo back through `syncManager.update()`. The problem is the
overlap with local work that was already queued or with save work that is allowed
to update the CRDT.

This is why the fix has two different writer guards:

-   `reconcilingRemoteKeys` blocks non-save local writes for keys that are currently
    being copied from the CRDT into the editor store. This targets the #24 stale
    local editor update.
-   `__unstableSkipSyncUpdate` makes CRDT-document persistence saves call
    `syncManager.update()` with an empty change object and `{ isSave: true }`. This
    still broadcasts the save marker, but it does not let a stale REST response
    rewrite title/content/blocks. This targets the #21 stale save response.

The WebSocket handshake/readiness fix reduces the chance that these stale writers
are armed during bootstrap. The writer guards are still necessary because the
bad state transition is not "WebSocket applied an update"; it is "local
WordPress entity state was converted into a new Yjs operation after fresher peer
state already existed."

## Guard precision and remaining limits

The `reconcilingRemoteKeys` guard is a suppression mechanism, not a general
concurrent-edit merge algorithm. It is intentionally narrow in two ways.

First, it only applies to local non-save updates. Save updates still call
`markEntityAsSaved()` because other peers need the save marker. That is why the
CRDT-document persistence path needed its own `__unstableSkipSyncUpdate` flag:
otherwise a stale persistence-save response would bypass the reconciliation
filter by design.

Second, it filters by changed key and by remote reconciliation version. If a
local update is scheduled, then a remote `title` update begins reconciling before
the delayed local CRDT write runs, the stale `title` value is filtered. A
different key, such as `content`, still applies. If the local `title` update is
scheduled after that remote `title` reconciliation has already started, it is
allowed because it is causally later than the remote update at the WordPress
store boundary.

The deeper ordering check found two subtle windows in this guard. First, a
remote Yjs transaction invokes `onRecordUpdate()`, which then calls the async
`_updateEntityRecord()` path. If the guard is armed only after
`_updateEntityRecord()` awaits `getEditedRecord()`, a delayed local editor
update can write the stale same-key value before the remote key is marked as
reconciling. The branch closes that by deriving the top-level changed record
keys from the Yjs observer events and marking those keys as reconciling
synchronously inside `onRecordUpdate()`.

Second, a repeated focused Playwright run exposed the opposite edge. In one
concurrent list-item run, User 2's Epsilon move arrived on User 1's page between
User 1 selecting Beta and clicking "Move down". A simple same-key guard treated
User 1's Beta move as stale and filtered it, leaving both editors with the
Epsilon-only order. The branch now increments a per-key remote reconciliation
version when a remote key starts reconciling and captures those versions when a
local update is scheduled. At execution time, a same-key local write is filtered
only if the remote version advanced after that local write was scheduled.
`_updateEntityRecord()` still holds the reconciling key until the edited record
catches up.

For `blocks`, the repeat runs showed that suppression alone is still too coarse.
A `blocks` update is a whole-key post edit even though the user action may be a
small list-item move. If User 1's Beta move is scheduled from the original list
order, then User 2's Epsilon move reaches User 1 before the delayed Beta CRDT
write runs, the local Y.Doc has to apply Beta over an already changed list. A
plain whole-array write either has to be filtered, losing Beta, or accepted,
losing Epsilon.

The final branch therefore carries the pre-edit entity record into the scheduled
sync-manager update. `mergeCrdtBlocks()` uses that base block order to rebase
same-clientId list reorders over the current CRDT order. In the failing
interleaving, the delayed Beta move is interpreted relative to the original
`Alpha, Beta, Gamma, Delta, Epsilon, Zeta` order and replayed over the current
`Alpha, Beta, Gamma, Epsilon, Delta, Zeta` order, yielding
`Alpha, Gamma, Beta, Epsilon, Delta, Zeta`.

This is still not a full operation-level block CRDT. It handles reorders when
the base, incoming, and current arrays have the same unique block `clientId` set.
If a concurrent edit also inserts or deletes blocks in the same array, the code
falls back to the existing merge behavior. A complete solution for arbitrary
concurrent block moves would need a model that can express "move this stable
block identity after that stable block identity" rather than deriving moves from
whole-array snapshots.

This matters for interpreting the passing e2e. The focused WebSocket repros pass
because the branch establishes a real sync boundary before natural user actions,
blocks stale writer windows, and rebases the specific independent list-item move
shape that the traces and repeat runs exposed. It does not prove that all
possible same-key `blocks` edits commute. The remaining architectural work is to
make block structure edits first-class CRDT operations or otherwise add a
per-block causal merge layer.

## WebSocket handshake edge case

The final deeper pass found one more WebSocket-specific edge in the proposed
test transport fix. `createSyncManager()` intentionally creates the provider
before applying persisted/local record state, because a joining peer must be able
to receive remote state before local bootstrap writes run. That means the first
peer in a room can briefly be connected with an empty Y.Doc. In the normal e2e
flow this window closes before the second browser finishes logging in and
opening the editor, but the protocol should not rely on that timing.

The problematic interleaving is:

1. Peer A joins an empty room and receives an empty snapshot.
2. Before A's `provider.ready` continuation applies the local record to its
   Y.Doc, peer B joins the same room.
3. The relay has no stored room updates yet, so B receives an empty snapshot
   with `peerCount > 1` and waits for a peer snapshot.
4. The relay sends `sync-request` to A. If A still has an empty Y.Doc, its
   `Y.encodeStateAsUpdateV2( ydoc, stateVector )` reply is a valid Yjs V2 update,
   but it is the canonical no-op update: 13 bytes, no structs, no delete set.
5. If B treats that no-op update as "peer state arrived", B can mark itself
   synced before any meaningful room state exists.

That edge is a smaller version of the original bug: readiness would again mean
"a WebSocket message arrived" rather than "peer document state arrived." The
patch now computes the canonical empty Yjs V2 update and ignores it for handshake
completion. The relay also avoids appending that no-op update to `room.updates`,
so later joiners do not see empty state as room history.

A follow-up check found that "non-empty Yjs update" is still too broad as a
readiness predicate. After the first peer's provider becomes ready,
`initializeYjsDoc()` writes CRDT schema metadata into the `state` map before the
post record is written into the `document` map. That update is a valid non-empty
Yjs update, but it still is not usable collaborative post state. A second peer
that joins between the metadata write and the record write must continue waiting.
The provider therefore treats initial sync as complete only once the CRDT
`document` map has keys, not merely once any Yjs update has been applied. This
predicate is only required for record-entity rooms. Collection rooms can be
state-only, so the WebSocket test provider does not require a populated
`document` map for rooms created with `objectId: null`.

This does not change the handling of delete-only updates. A delete-only Yjs
update is not the canonical empty update; it may leave the state vector
unchanged, but its encoded payload is different and must still be applied and
broadcast.

## #21 same-user title reload loss

The natural-user Playwright repro creates a draft titled
`RTC same-user reload initial`, opens the post in two browser sessions for the
same WordPress user, types `RTC same-user unsaved title before reload` in browser
A, confirms browser B observes it, then has browser B make a companion paragraph
edit and reload.

Pre-fix WebSocket result:

```text
Expected: "RTC same-user unsaved title before reload"
Received: "RTC same-user reload initial"
```

The HTTP control in `/tmp/gutenberg-http-rerun-same-user-title.log` passed this
exact same-user unsaved-title case, while
`/tmp/gutenberg-ws-rerun-same-user-title.log` failed it. The pre-fix repro in
this branch also failed and produced the video artifact above.

Transport root cause: the test WebSocket provider treated a joining browser's
local bootstrap Y.Doc as authoritative room history. On socket open it sent a
full `Y.encodeStateAsUpdateV2( this.ydoc )` as `join.state`; the relay appended
that state to `room.updates` and broadcast it as a normal `update`. On reload,
the browser's stale REST/bootstrap state could therefore become part of shared
room history before a real peer-state synchronization boundary existed.

The deeper trace found a more direct title-specific mechanism. The sync
manager's `persistCRDTDoc` handler calls `saveEntityRecord()` to persist
`meta._crdt_document`. In current trunk, `saveEntityRecord()` then calls
`syncManager.update( updatedRecord, LOCAL_UNDO_IGNORED_ORIGIN, { isSave: true } )`
with the server response. If the save was only meant to persist the CRDT
document, that server response can contain stale REST/title state and echo it
back into the CRDT as a saved local update. Commit `573b567b8d4` adds
`__unstableSkipSyncUpdate` for that resolver-triggered persistence save; with
that patch alone, the same-user title reload repro passed 5/5 even with the old
WebSocket provider/relay. The final branch now carries that direct guard in
addition to the WebSocket bootstrap/readiness fix.

The sync manager made that worse because provider creation happened before
record/state observers were attached and before persisted-document handling had
settled. Provider bootstrap updates could be missed or could race with
`applyPersistedCrdtDoc`, which applied the current REST record with default Yjs
origin and could re-send stale local bootstrap data.

Relevant origin commits:

-   `9c1211ed2b0` introduced the local WebSocket e2e suite and the test relay.
-   `b6989b74039b` (`#72183`) refactored sync provider setup into
    `createSyncManager`, leaving provider creation before observer attachment.
-   `22e3d7f93663` (`#76311`) and `2a52cba6add4` (`#75830`) are part of the
    persisted CRDT document/meta path that reloads and bootstrap state now use.
-   `8a511c5cced5` (`#74562`) made collaborative editing default plugin
    experience, increasing the blast radius of this lifecycle contract.
-   `573b567b8d4` (`Fix RTC title reload reconciliation`, local known-fixes
    commit) directly prevents CRDT-document persistence saves from re-entering
    stale server responses into the sync manager.

## #24 concurrent list item move loss

The natural-user repro creates a list:

```text
Item Alpha, Item Beta, Item Gamma, Item Delta, Item Epsilon, Item Zeta
```

Two users open the post. Before moving, the repro checks that both rendered list
text order and list-item block identities match. Then browser A clicks
`Item Beta` and uses the block toolbar `Move down`; browser B clicks
`Item Epsilon` and uses `Move up`.

Pre-fix WebSocket result was intermittent, matching the handoff. In a 10x
headless repeat, 3 runs failed. One representative failure:

```text
Expected betaIdx > gammaIdx
Received betaIdx = 1, gammaIdx = 2
```

That is the original symptom: the `Item Beta` move was lost while the other
move could be visible. The HTTP control in `/tmp/gutenberg-http-rerun-stress.log`
passed the stress test.

The traced mechanism is the same protocol/lifecycle class as #21, but it is a
block-store echo rather than a title-save echo. A remote `blocks` update can
enter the CRDT and begin reconciling into the local editor store while that
editor still has a pending local `blocks` change. Because `blocks` is applied as
a whole synced key, the stale local editor notification can write an older
whole-block order back into the CRDT and erase the remote move. Earlier
simulations from the handoff showed the same shape at the CRDT level: when two
docs independently create or rewrite different root arrays, merging tends to
show only one independent move. When the initial root and later remote edits
converge first, both moves survive.

Relevant origin commits:

-   `84019935998c` (`#72262`) introduced improved post-entity CRDT merge logic,
    including block merge behavior.
-   `001a2561482` (`#75437`) expanded RTC syncing to post `content` and undefined
    `blocks` values, making top-level post block state part of this lifecycle.
-   `9c1211ed2b0` introduced the local WebSocket provider/relay whose join
    protocol allowed stale or independently initialized document state to enter
    room history.

I did not find evidence that `mergeCrdtBlocks` is the primary defect here once
the clients start from the same canonical CRDT state and remote editor-store
reconciliation is protected from stale local write-back. The failure disappears
when the protocol/lifecycle enforces a real sync boundary before user actions
and filters local keys that are still reconciling from remote CRDT state.

The deeper probes refine that: the known-fixes block merge implementation is
relevant but not sufficient. Pulling in known-fixes `crdt-blocks.ts` and
`crdt-utils.ts` on top of the title fix still failed the list repro 1/5. The
important distinction is that the repro's pre-move check proves both editors
render the same list text and Gutenberg block `clientId`s; it does not prove
that there are no queued editor-store notifications and no in-flight remote
`blocks` reconciliation. The old WebSocket provider could still mark a peer
connected before applying a peer snapshot, so both editors could look aligned
while local moves were applied to a CRDT/editor-store boundary that was still
settling.

## Audit of the fix plan

Linus-style audit:

-   Do not paper over the bug with sleeps. A fixed delay would make the tests
    quieter without defining a synchronization invariant.
-   Do not accept raw join state as room history. A joining client is not
    authoritative just because it connected.
-   Keep the fix local to the provider handshake, relay, and sync-manager
    bootstrap lifecycle.

Jepsen-style audit:

-   The system needs a clear source of truth during membership changes. The
    previous relay let a stale joining replica rewrite history.
-   The handshake must carry causality. Yjs state vectors are the right primitive;
    a full local update from an unsynchronized peer is not.
-   "Connected" is not a consistency property. Tests need a visible "synced" state
    that means snapshot/peer-state application and local editor reconciliation
    have crossed a meaningful boundary.

Dan-Luu-style audit:

-   The repros use ordinary editor actions: filling the title, typing text,
    reloading, clicking list items, and toolbar move buttons.
-   The video artifact shows both browser screens and an action log rather than
    relying on only CRDT-level assertions.
-   The analysis separates the local test-relay bug from the production contract:
    a production WebSocket transport must not make joining stale state
    authoritative and must not expose readiness before peer state is reconciled.

Final plan: replace the join-state broadcast with a state-vector handshake,
delay test-visible connected readiness until the provider has synchronized, and
teach the sync manager to observe and reconcile provider bootstrap updates
before applying persisted/local bootstrap state.

## Fix

The fix has four pieces.

First, CRDT-document persistence saves no longer feed stale REST responses back
into synced entity state. The resolver passes `__unstableSkipSyncUpdate` when
`persistCRDTDoc()` dispatches `saveEntityRecord()`. `saveEntityRecord()` still
marks the synced entity as saved, but sends an empty change object to
`syncManager.update()` instead of the full server response. This preserves the
save marker while preventing a stale title/content response from overwriting
unsaved peer CRDT state.

Second, the WebSocket relay no longer accepts `join.state` as authoritative room
history. Joining clients send a Yjs state vector. The relay sends a snapshot of
known room updates and broadcasts a `sync-request` to existing peers. Peers reply
with `Y.encodeStateAsUpdateV2( ydoc, stateVector )`. The relay validates updates
by applying them to a room Y.Doc before appending/broadcasting them.

Third, the test WebSocket provider exposes `synced` separately from socket
open. Initial local sync-manager updates are allowed only for the first peer in
an empty room; stale sync-manager updates after remote peer state has been
applied are suppressed. If a joining peer sees existing peers but no snapshot
updates, it waits for the peer snapshot reply before marking itself synced.

Fourth, `createSyncManager` now attaches observers before provider creation so
provider bootstrap updates are not missed. If a provider has already applied
remote state, persisted local bootstrap CRDT state is not reapplied over it.
Remote keys being reconciled into the editor store are tracked synchronously
from the Yjs transaction events. The sync manager records a per-key remote
reconciliation version so delayed local writes scheduled before that remote
version are filtered, while local writes scheduled after that version are
allowed. The key is then held briefly so a stale local editor update cannot echo
an old value for the same key back into the CRDT while the remote edit is still
settling.

Fifth, local block updates carry the edited record that existed when the update
was scheduled. For same-clientId block reorders, `mergeCrdtBlocks()` uses that
base record to rebase the delayed local reorder over the current CRDT order
instead of treating the delayed local `blocks` array as an authoritative whole
array replacement.

## Verification

Final fixed-branch checks:

```bash
npm run test:unit -- \
	packages/core-data/src/test/actions.js \
	packages/core-data/src/test/resolvers.js \
	packages/sync/src/test/manager.ts
```

Result after the final synchronous reconciliation guard: `93 passed`. Result
after the per-key remote-version guard: `94 passed`. Result after the block
rebase fix, with the CRDT block/entity tests included: `179 passed`.

```bash
WP_BASE_URL=http://localhost:8892 GUTENBERG_RTC_TEST_WS_REUSE_SERVER=1 \
	npm run test:e2e:rtc-websocket -- --project=chromium \
	test/e2e/specs/editor/collaboration/websocket/collaboration-same-user-title-reload-loss.spec.ts \
	test/e2e/specs/editor/collaboration/websocket/collaboration-stress.spec.ts \
	--grep "keeps an unsaved same-user title|two users concurrently move list items"
```

Result: `2 passed (12.4s)`.

After adding the direct core-data guard, I rebuilt with `npx wp-build` and reran
the same focused e2e command. Result: `2 passed (35.0s)`. After the final
synchronous reconciliation guard, I rebuilt again with `npx wp-build` and reran
the focused WebSocket repros against the test wp-env on port `8893`. Result:
`2 passed (10.2s)`. A later repeated run found remaining list-move failures;
after the block reorder rebase fix, the focused browser run passed once and then
passed with `--repeat-each=5`: `10 passed (56.6s)`.

Full `npm test`, full e2e, and PHP suites were not run; the requested scope was
the two focused WebSocket failures and their non-Playwright core-data/sync
regressions.
