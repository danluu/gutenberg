# Real-Time Collaboration Browser Fuzzer Triage

## Summary

This note classifies the main failure modes found during the browser-level RTC
fuzzing campaigns and the focused follow-up repro work on 2026-04-23.

The current split is:

-   confirmed product bugs
-   known excluded bug family
-   test environment or harness failures
-   still-open startup signatures that have not earned promotion to real bugs

The raw bucket counts are tracked in
[distinct-failure-tracker-20260423.md](../../../artifacts/rtc-browser-fuzz/distinct-failure-tracker-20260423.md).

## Confirmed Product Bugs

-   `P1 data corruption`: [Real-Time Collaboration Rich-Text Offset-Space Bug](real-time-collaboration-rich-text-offset-space-bug.md)
    Browser-reproduced write-path bug. A block-editor rich-text text offset is
    passed into HTML-index diff logic, which can corrupt formatted content.
-   `P1 data corruption`: [Real-Time Collaboration Rich-Text Cursor-Scope Bug](real-time-collaboration-rich-text-cursor-scope-bug.md)
    Write-path confirmed. One field's cursor can be reused for a different
    rich-text field during block merging. Browser reachability is strongly
    expected, but the final natural browser repro is still pending.
-   `P1 availability / resource exhaustion`: [Connection Lost bug](../../../artifacts/rtc-browser-fuzz/connection-lost-20260423/summary.md)
    Large persisted `root/comment` history can OOM PHP at the default `128M`
    limit and surface the generic `Connection lost` modal. Focused modal repro
    passed `5/5`.
-   `P1 availability / protocol mismatch`: [Oversized compaction causes `Connection lost`](../../../artifacts/rtc-browser-fuzz/oversized-compaction-connection-lost-20260423/summary.md)
    A compaction update can exceed the server's 1 MiB per-update cap even when
    normal incremental edits stay below the client-side size guard. Focused
    modal repro passed `5/5`.
-   `P2 scalability / room accounting`: [Connection Lost via too many synced rooms in one poll request](../../../artifacts/rtc-browser-fuzz/too-many-rooms-connection-lost-20260423/summary.md)
    A single editor page can exceed the server's `50`-room limit and get
    repeated `400 rest_invalid_param` failures. Focused modal repro passed
    `5/5`.
-   `P2 scalability / request sizing`: [Connection Lost via oversized sync request body](../../../artifacts/rtc-browser-fuzz/sync-body-size-connection-lost-20260423/summary.md)
    Many ordinary-sized edits across many synced entities can overflow the
    server's `16 MiB` request-body cap and yield repeated `413`s. Focused modal
    repro passed `5/5`.
-   `P2 auth / session handling`: [Connection Lost via auth / nonce loss mid-session](../../../artifacts/rtc-browser-fuzz/auth-loss-connection-lost-20260423/summary.md)
    Losing auth state mid-session yields repeated
    `rest_cookie_invalid_nonce` `403`s, but the client surfaces the generic
    disconnect modal instead of an auth-specific recovery path. Focused modal
    repro passed `5/5`.
-   `P3 external-condition handling`: [Connection Lost via browser offline state (`ERR_INTERNET_DISCONNECTED`)](../../../artifacts/rtc-browser-fuzz/browser-offline-connection-lost-20260423/summary.md)
    This one is real, but it is not the same class as the product-internal
    sync bugs above. The captured HAR shows browser or OS offline state being
    surfaced as the same generic modal.

## Known Excluded

-   `Known existing bug`: [collaboration-title-reload-repro.spec.ts](../../../test/e2e/specs/editor/collaboration/collaboration-title-reload-repro.spec.ts)
    The reload-title family is real, but it was explicitly excluded from this
    bug search. The latest all-core tracker snapshot still records `349` hits.

## Triaged Infra / Harness Failures

These showed up in the campaigns but should not be treated as collaboration
product bugs:

-   `Missing test theme`: `5` hits. Global setup fails because
    `twentytwentyone` is not installed.
-   `Dirty or inconsistent test env`: `4` hits. Setup or editor open fails
    with `rest_post_invalid_id`.
-   `Dirty shared content state`: `4` hits. Global setup `deleteAllPosts()`
    fails with `rest_cannot_delete`.
-   `Login / navigation startup failure`: `1` hit. `page.waitForURL(
    '**/wp-admin/**' )` never resolves before the overall test timeout.

These buckets are now reflected directly in
[distinct-failure-tracker.mjs](../../../artifacts/rtc-browser-fuzz/tools/distinct-failure-tracker.mjs)
and the regenerated
[distinct-failure-tracker-20260423.md](../../../artifacts/rtc-browser-fuzz/distinct-failure-tracker-20260423.md).

## Open But Unconfirmed

The raw tracker snapshot still contains these startup buckets:

-   `startup-collaborators-list-never-visible`: `5505` hits
-   `startup-editor-runtime-never-ready`: `787` hits
-   `startup-no-sync-response`: `50` hits

After deeper analysis, those bucket names turned out to be misleading on the
current campaign envs.

The follow-up note is:
[open-signature-fivepass-20260423/summary.md](../../../artifacts/rtc-browser-fuzz/open-signature-fivepass-20260423/summary.md)

Representative isolated reruns on `8899` for seeds `11000`, `11009`, `11117`,
and `11125` all failed `5/5`, but every one reduced to the same failure shape:

-   repeated `500` responses from `POST /wp-json/wp-sync/v1/updates`
-   repeated retry logs for `postType/post:<id>`, `root/comment`, and
    `taxonomy/wp_pattern_category`
-   final downstream timeout while waiting for `Collaborators list`

So these signatures are not distinct new bugs. They are current manifestations
of the already-confirmed sync-server failure, most plausibly the known
`root/comment` OOM family.

Separate from that, earlier clean-env isolated checks on `8897` still showed a
real load-only false-positive family for some startup timeouts (`1305`,
`1309`, `1329` all passed `5/5` in isolation). That means startup fuzzing
noise still exists, but the currently dominant tracker buckets are not new bug
families.
