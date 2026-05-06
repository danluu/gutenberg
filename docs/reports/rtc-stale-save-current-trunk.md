# RTC same-account stale-save overwrite: current status

Date checked: 2026-05-06

Tested current trunk:

```text
f770b5df8225ed572deef98d05c3138d724b3528
2026-05-06T13:38:20-07:00 RTC: Fix race condition on room creation which can cause a split update log (#77675)
```

## Summary

The bug is real on current trunk, but it is timing-sensitive.

The colleague's observation is also correct: if HTTP polling/refetch reaches the stale editor before it saves, the two edits reconcile correctly. That does not disprove the bug. It identifies the safe timing path.

The failing timing path is:

1. Two same-account editor windows are open on the same post with RTC enabled.
2. Window A types and saves content.
3. The server has A's saved content.
4. Window B has not yet incorporated A through polling/refetch.
5. Window B types a small edit and saves.
6. Window B's REST save sends a stale full `content` body containing B but not A.
7. The server accepts that body and A's already-saved content is lost.

## Video artifact

New video generated for this report:

```text
artifacts/current-trunk-rtc-repro-video/current-trunk-rtc-stale-save-repro.mp4
```

Generator:

```text
artifacts/current-trunk-rtc-repro-video/make-current-trunk-rtc-repro-video.mjs
```

Video validation:

```text
duration: 32s
resolution: 1920x1154
frames: 8 annotated frames
```

The video contains two segments:

- `immediate-save-bug`: demonstrates the stale overwrite.
- `delayed-polling-control`: demonstrates the colleague's safe path where polling catches up before B saves.

The annotations include current trunk SHA, RTC enablement, collaborator UI readiness, `/wp-sync` room evidence, loaded built assets, save request/response marker checks, and final direct WP-CLI server checks.

## Video run evidence

Bug segment:

```text
postId: 266
markerA: video-a-1778101563537-1-immediate-save-bug
markerB: video-b-1778101563537-1-immediate-save-bug
/wp-sync counts: A=18, B=14
room: postType/post:266
finalHasA: false
finalHasB: true
```

Important facts from the annotation log:

```text
RTC proved: _wpCollaborationEnabled=true; collaborator UI visible; /wp-sync counts A=5, B=2; both saw postType/post:266.
A clicked toolbar Save draft. Server now has A. Immediately after A save, B has A=false.
Natural action: B clicked the editor and typed marker B. Before B save, B editor has A=false.
A REST save: request A=true, B=false; response A=true, B=false.
B REST save: request A=false, B=true; response A=false, B=true.
Final direct WP-CLI read: A=false, B=true. Browser REST final: A=false, B=true.
BUG: B saved stale full content and overwrote A.
```

Delayed polling control:

```text
postId: 272
markerA: video-a-1778101615549-1-delayed-polling-control
markerB: video-b-1778101615549-1-delayed-polling-control
/wp-sync counts: A=17, B=19
room: postType/post:272
delay before B save: 12000ms
finalHasA: true
finalHasB: true
```

Important facts from the annotation log:

```text
A clicked toolbar Save draft. Server now has A. Immediately after A save, B has A=false.
Control wait: after 12000ms, polling/refetch state in B has A=true.
B REST save: request A=true, B=true; response A=true, B=true.
Final direct WP-CLI read: A=true, B=true. Browser REST final: A=true, B=true.
CONTROL: B had received A first, so final content preserved both edits.
```

## Why the colleague's local result makes sense

Current Gutenberg RTC uses HTTP polling as the default provider. If polling delivers A's update to B before B saves, then B's local editor state includes A, and B's save payload includes both A and B. That is the delayed control segment.

The bug is not that polling can never reconcile. The bug is that the save path does not enforce freshness when polling has not yet reconciled.

Slowing polling down is not enough by itself to reproduce the bug if the manual flow still saves after B has already incorporated A. To reproduce the bug, B has to save before receiving/applying A.

## Current trunk code path

Toolbar save serializes the current editor body into a full content edit:

```text
packages/editor/src/store/actions.js:191
```

Core-data then saves the local `edits` object directly:

```text
packages/core-data/src/actions.js:772-786
```

The post pre-persist hook only serializes the local CRDT document into post meta:

```text
packages/core-data/src/entities.js:309-323
```

Peer-save detection starts a refetch asynchronously:

```text
packages/sync/src/manager.ts:235-241
```

There is no save-time latest-record fetch, base comparison, `If-Match`/CAS, conflict rejection, or forced wait for the peer-save refetch before the REST `content` body is submitted.

## Status of adjacent fixes

PR #77876 and PR #77890 are not on current trunk at the tested commit.

The current HEAD, #77675, fixes a polling update-log room creation race in sync post meta storage. That can make polling convergence more reliable, but it does not add a save-time guard against a stale REST post `content` body overwriting newer saved content.

## Conclusion

The correct current understanding is:

- The issue is a real lost-update race on current trunk.
- The issue is timing-sensitive.
- The colleague's "polling reconciles correctly" result is expected when B receives A before saving.
- The missing invariant is save-time freshness for full post `content` saves.
