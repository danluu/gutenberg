# Real-Time Collaboration Distinct Fuzzer Failures

This is a handoff list for agents triaging the `try/fuzz` real-time
collaboration work. It lists distinct failure signatures that current fuzzers
can surface, with the file or artifact to start from.

For status and bug grouping, also see
[Real-Time Collaboration Issue Catalog](real-time-collaboration-issue-catalog.md).

## Repro Baseline / Known Fixes

The fuzzer code lives on branch `try/fuzz` in this worktree:

`/Users/danluu/dev/fuzz/gutenberg-try-fuzz`

When reproducing current failures, run the fuzzer against trunk plus all known
fixes rather than against raw `try/fuzz`; otherwise older fixed bugs can mask
newer failures. The scratch validation worktree used for that is:

`/Users/danluu/dev/fuzz/gutenberg-known-fixes-fuzz`

Branch:

`try/fuzz-known-fixes-validation`

That worktree is trunk plus these known product fixes:

-   `c4aaec62074` `Fix RTC rich-text offset-space cursor handling`
-   `358ca18c765` `Fix RTC title reload reconciliation`
-   `0b6d73fd35c` `Fix sync update size limit accounting`
-   The trunk-side fix for too many entities loaded:
    `1642980d599 RTC: Fix "Connection Lost" dialog when too many entities are loaded (#77631)`
-   One local validation patch in `packages/sync/src/manager.ts`: in
    `unloadEntity()`, call `updateCRDTDoc()` with `LOCAL_SYNC_MANAGER_ORIGIN`
    instead of the caller-supplied `origin`, so unload/persist cleanup is not
    emitted as an ordinary local provider update.

The fuzzer files from `try/fuzz` should be copied or applied onto that
known-fixes baseline for repro runs. The known-fixes worktree is intentionally
scratch/dirty because it includes the fuzzer files plus the local
`manager.ts` validation patch.

## Unit / Integration Fuzz Failures

| No. | Failure signature                                                            | Fuzzer / evidence                                                                                             | Notes                                                                                                                                                                                                                                                        |
| --- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Rich-text cursor-scope corruption across multiple rich-text fields           | `packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts`; example seed `303`                              | A single cursor offset is reused while merging multiple rich-text fields. Typical symptom: expected `</strong>`, actual malformed `</stronm>`.                                                                                                               |
| 2   | Nested rich-text cursor-scope corruption                                     | `packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts`; example seeds `308`, `312`, `313`               | Same invariant as above, but through object/query or array/query rich-text attributes such as `cards.2.meta.caption`.                                                                                                                                        |
| 3   | Persisted CRDT hydration emitted as an outgoing local update                 | `packages/sync/src/test/manager.fuzz.test.ts`                                                                 | The SyncManager lifecycle fuzzer watches unload/persist/reload flows for large `origin: null` provider-visible updates.                                                                                                                                      |
| 4   | Remote update apply failure skips the server cursor                          | `packages/sync/src/providers/http-polling/test/polling-manager.fuzz.test.ts`                                  | The protocol state-machine fuzzer injects remote apply failures and asserts the next poll does not advance past unapplied updates.                                                                                                                           |
| 5   | Oversized local or compaction update escapes the client size guard           | `packages/sync/src/providers/http-polling/test/polling-manager.fuzz.test.ts`                                  | The same protocol fuzzer treats any queued room update larger than the server per-update cap as an invariant violation.                                                                                                                                      |
| 6   | Nested awareness selection cannot resolve a local block ID                   | `packages/core-data/src/awareness/test/post-editor-awareness.ts`; example seeds `1401`-`1405`, `1407`, `1408` | The nested rich-text selection fuzzer resolves `richTextOffset` but gets `localClientId: null` for nested `Y.Text` targets.                                                                                                                                  |
| 7   | Nested selection history downgrades rich-text selections to block selections | `packages/core-data/src/utils/test/block-selection-history.fuzz.test.ts`; example seeds `1701`-`1708`         | The history fuzzer expects `RelativeSelection` for nested rich text, but receives `BlockSelection`.                                                                                                                                                          |
| 8   | First access to a new sync room can split storage                            | `phpunit/tests/collaboration/wpSyncPostMetaStorage.php`                                                       | The PHP race fuzzer injects a competing first writer via `wp_insert_post()` and checks for a single reachable room lineage plus fresh-reader visibility. Local execution still needs a clean PHP test bootstrap.                                             |
| 9   | Awareness read-modify-write can lose completed client states                 | `phpunit/tests/collaboration/wpHttpPollingSyncServer.php`                                                     | The PHP server fuzzer injects completed awareness writes between a poll's awareness read and write. Local execution still needs a clean PHP test bootstrap.                                                                                                  |
| 10  | Room-level sync auth can become a confused-deputy privilege escalation       | `packages/core-data/src/utils/test/crdt-authorization.fuzz.test.ts`; example seeds `1901`-`1908`              | The CRDT authorization fuzzer randomizes peer capability profiles and post field classes. Lower-privilege remote updates can dirty privileged-peer save payloads for `author`, `status`, `meta`, taxonomies, media/date/sticky, and policy-dependent fields. |

## Browser / Campaign Failures

| No. | Failure signature                                     | Evidence                                                                                                       | Notes                                                                                                  |
| --- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 11  | Rich-text offset-space corruption                     | [real-time-collaboration-rich-text-offset-space-bug.md](real-time-collaboration-rich-text-offset-space-bug.md) | Browser-reproduced data corruption from passing a block-editor text offset into HTML-index diff logic. |
| 12  | Rich-text cursor-scope corruption                     | [real-time-collaboration-rich-text-cursor-scope-bug.md](real-time-collaboration-rich-text-cursor-scope-bug.md) | Confirmed at the write-path level; natural browser repro is still pending.                             |
| 13  | `Connection lost` via `root/comment` sync-storage OOM | `artifacts/rtc-browser-fuzz/connection-lost-20260423/summary.md`                                               | Repeated `500`s when a large stored `root/comment` room exhausts PHP memory.                           |
| 14  | `Connection lost` via oversized compaction update     | `artifacts/rtc-browser-fuzz/oversized-compaction-connection-lost-20260423/summary.md`                          | A full-state compaction update can exceed the server's 1 MiB per-update cap.                           |
| 15  | `Connection lost` via too many rooms per request      | `artifacts/rtc-browser-fuzz/too-many-rooms-connection-lost-20260423/summary.md`                                | One editor page can sync more than the server's `50` room limit.                                       |
| 16  | `Connection lost` via oversized sync request body     | `artifacts/rtc-browser-fuzz/sync-body-size-connection-lost-20260423/summary.md`                                | Many ordinary queued updates can exceed the server's `16 MiB` request-body cap.                        |
| 17  | `Connection lost` via auth or nonce loss mid-session  | `artifacts/rtc-browser-fuzz/auth-loss-connection-lost-20260423/summary.md`                                     | Repeated `rest_cookie_invalid_nonce` `403`s are surfaced as generic disconnect.                        |
| 18  | `Connection lost` via browser offline state           | `artifacts/rtc-browser-fuzz/browser-offline-connection-lost-20260423/summary.md`                               | External-condition class from `net::ERR_INTERNET_DISCONNECTED`.                                        |
| 19  | `Connection lost` via browser-aborted sync requests   | `artifacts/rtc-browser-fuzz/browser-abort-connection-lost-20260423/summary.md`                                 | Locally reproduced external/harness class for aborted `wp-sync` polls.                                 |

## Known Non-Distinct Or Excluded Failures

-   `startup-collaborators-list-never-visible`,
    `startup-editor-runtime-never-ready`, and `startup-no-sync-response`
    collapse into the already-confirmed `root/comment` sync-server failure on
    the current campaign environments.
-   `Reload-title collaboration bug` is real but explicitly excluded from this
    bug search. Start from
    `test/e2e/specs/editor/collaboration/collaboration-title-reload-repro.spec.ts`
    if it needs follow-up.
