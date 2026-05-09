# a184dfcf0447: HTTP sync storage OOM surfaces as awareness timeout

## Summary

The `a184dfcf0447` fuzz signature is not a standalone awareness bug. The
preserved handoff row and source supplement describe real repeated
`/wp-json/wp-sync/v1/updates` `500` responses with PHP memory exhaustion in
`WP_Sync_Post_Meta_Storage`; the later `waitForAwarenessPeerCount()` timeout is
only the visible downstream symptom after collaboration transport has failed.

The sharpest root cause is the same response-budget gap tracked by canonical
branch `try/wp-sync-collection-room-pruning-ignores-byte-cap-causing-u-cb90ef38e6b1`.
HTTP polling caps request body size, room count, and single incoming update
size, but the server can still read and JSON-encode every retained update after
a client's cursor. A late or reloaded client starting from cursor `0` can
therefore force one response to materialize many MiB of valid persisted history.

The source rows for this signature implicate ordinary collection rooms,
especially `root/comment` and `taxonomy/wp_pattern_category`, after they are
requested with `after: 0`. Those rooms are registered by normal post-editor RTC
startup, but the large retained `sync_step2` history shape appears rare and was
fuzz-amplified.

## Evidence

The large shared-room row shape is plausible without synthetic block trees or
malformed update bytes. Collection rooms only update the CRDT `state` map, but
the HTTP polling provider responds to a fresh peer with y-protocols sync-step
messages. A local Yjs probe using Gutenberg's ordinary `savedAt` / `savedBy`
save markers produced this size profile:

```text
saveMarks=1000  syncStep2Bytes=17949   base64Chars=23932
saveMarks=10000 syncStep2Bytes=183566  base64Chars=244756
saveMarks=38000 syncStep2Bytes=743563  base64Chars=991420
saveMarks=50000 syncStep2Bytes=983566  base64Chars=1311424
```

For comparison, `Y.encodeStateAsUpdateV2()` of the same final collection state
is only about 112-115 bytes after 38,000-50,000 repeated save markers. The
inflation is therefore specific to the sync-step response path used by HTTP
polling catch-up. The 38,000-save-marker response is below the current 1 MiB
per-update request cap after base64 encoding, so a normal client can persist
source-sized rows that the current server later replays without a response
budget.

## Practical Impact

Normal-user likelihood is low. The ordinary workflow is a collaborative post
editor session over the default HTTP polling transport where a second tab,
second user, refreshed tab, or late-joining user catches up from an old cursor.
The block type is not special. Reload or late join is the natural trigger;
network delay is not required once the backlog exists.

Common prerequisites are collaboration being enabled, multiple editors or tabs,
HTTP polling, and ordinary post-editor startup that loads post, note/comment,
and pattern-category rooms. The rare prerequisite is enough retained valid room
history to exceed a practical response byte budget while staying below the
count-based compaction threshold.

The blast radius is collaboration availability and server memory pressure:
large responses, PHP OOM, repeated sync `500`s, `Connection lost`, and failed
awareness/catch-up. This signature does not prove saved post-content
corruption, duplicate blocks, or a save loop. Recovery is to clear or compact
the affected sync-room history, or to serve catch-up in bounded chunks.

## Fix Direction

Use the canonical response-budget fix stack rather than creating a second
signature-specific fix:

- add a response update-data byte budget to sync history reads;
- fetch rows in bounded cursor order instead of loading the whole backlog;
- advance `end_cursor` only through rows actually returned;
- suppress compaction while the client has received only a prefix of history.

The canonical PR branch already carries a lower-level response-budget repro, a
natural late-user Playwright repro, and the bounded read-side fix.

## Pass 179 Status

On 2026-05-12, current `origin/trunk` (`fc8b3db6ace471328e39453e3eed552ad4f3de7a`)
and the manifest-declared known-fixes base (`f256024286dd80a4c0e2579f658c109256abf648`)
still expose only the unbounded `get_updates_after_cursor( $room, $cursor )`
storage contract. Neither contains a response-byte budget, a bounded storage
reader, nor a "more updates remain" flag to prevent compaction while a client
has received only a prefix of history.

The signature-specific PR branch was rebased onto that current trunk. Its
three commits are patch-equivalent to the pass-178 verified stack: response
history byte-budget PHPUnit repro, natural late-user Playwright repro, and the
bounded catch-up response fix.
