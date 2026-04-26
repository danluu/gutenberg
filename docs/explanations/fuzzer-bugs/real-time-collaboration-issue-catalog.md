# Real-Time Collaboration Issue Catalog

This file is the durable inventory of issues found during the browser-level
real-time collaboration fuzzing and follow-up analysis on `try/fuzz`.

For current grouping and counts, see
[Real-Time Collaboration Browser Fuzzer Triage](real-time-collaboration-browser-fuzzer-triage.md).

## Confirmed Product Bugs

-   `Rich-text offset-space corruption`. Status: confirmed product bug with
    browser reproduction. The write path passes a block-editor rich-text offset
    into HTML-index diff logic and can corrupt formatted content. Evidence:
    [real-time-collaboration-rich-text-offset-space-bug.md](real-time-collaboration-rich-text-offset-space-bug.md).
-   `Rich-text cursor-scope corruption`. Status: confirmed write-path bug.
    One field's cursor can be reused for another rich-text field during block
    merge. Browser reachability is strongly expected, but the final natural
    browser repro is still pending. Evidence:
    [real-time-collaboration-rich-text-cursor-scope-bug.md](real-time-collaboration-rich-text-cursor-scope-bug.md).
-   `Connection lost` via `root/comment` sync-storage OOM. Status: confirmed
    `5/5`. Ordinary collaborative editor startup can hit repeated `500`s when
    the `root/comment` room has grown large enough to exhaust PHP memory while
    loading stored updates. Evidence:
    [connection-lost-20260423/summary.md](../../../artifacts/rtc-browser-fuzz/connection-lost-20260423/summary.md).
-   `Connection lost` via oversized compaction update. Status: confirmed
    `5/5`. Once a room crosses the server compaction threshold, the client can
    send a full-state compaction update larger than the server's 1 MiB
    per-update limit, yielding repeated `400` failures. Evidence:
    [oversized-compaction-connection-lost-20260423/summary.md](../../../artifacts/rtc-browser-fuzz/oversized-compaction-connection-lost-20260423/summary.md).
-   `Connection lost` via too many rooms per request. Status: confirmed `5/5`.
    A single editor page can sync more than `50` rooms in one poll and hit the
    server `maxItems` limit. Evidence:
    [too-many-rooms-connection-lost-20260423/summary.md](../../../artifacts/rtc-browser-fuzz/too-many-rooms-connection-lost-20260423/summary.md).
-   `Connection lost` via oversized sync request body. Status: confirmed `5/5`.
    Many ordinary-sized queued updates across many rooms can make one
    `wp-sync` poll exceed the server `16 MiB` body limit and produce repeated
    `413`s. Evidence:
    [sync-body-size-connection-lost-20260423/summary.md](../../../artifacts/rtc-browser-fuzz/sync-body-size-connection-lost-20260423/summary.md).
-   `Connection lost` via auth or nonce loss mid-session. Status: confirmed
    `5/5`. After one successful poll, losing browser auth state causes repeated
    `rest_cookie_invalid_nonce` `403`s that are surfaced as the generic
    disconnect modal. Evidence:
    [auth-loss-connection-lost-20260423/summary.md](../../../artifacts/rtc-browser-fuzz/auth-loss-connection-lost-20260423/summary.md).
-   `Privilege escalation` via room-level sync authorization. Status:
    confirmed product bug with CRDT, save-payload, and browser reproductions.
    A lower-privilege collaborator can sync a protected field into a
    higher-privilege user's editor, and the higher-privilege user's normal save
    persists the lower-privilege value. Evidence:
    [real-time-collaboration-privilege-escalation-bug.md](real-time-collaboration-privilege-escalation-bug.md).

## Confirmed External-Condition Issue Classes

-   `Connection lost` via browser offline state. Status: confirmed issue class
    from the user HAR plus follow-up analysis. The captured failures were
    `net::ERR_INTERNET_DISCONNECTED`, which means the browser or OS network
    state went offline and the app surfaced the same generic modal. Evidence:
    [browser-offline-connection-lost-20260423/summary.md](../../../artifacts/rtc-browser-fuzz/browser-offline-connection-lost-20260423/summary.md).
-   `Connection lost` via browser-aborted sync requests. Status: locally
    reproduced issue class. Aborting enough `wp-sync` polls in the browser
    produces the same modal even without a server `500`, but this was not tied
    to the user's HAR and was not promoted as the main field root cause.
    Evidence:
    [browser-abort-connection-lost-20260423/summary.md](../../../artifacts/rtc-browser-fuzz/browser-abort-connection-lost-20260423/summary.md).

## Known Existing / Excluded Bug

-   `Reload-title collaboration bug`. Status: real existing bug, but excluded
    from the main search. Evidence:
    [collaboration-title-reload-repro.spec.ts](../../../test/e2e/specs/editor/collaboration/collaboration-title-reload-repro.spec.ts).

## Environment / Harness Issues

-   `Missing twentytwentyone theme in test env`. Status: environment failure,
    not a collaboration product bug. This breaks `activateTheme()` in global
    setup.
-   `Missing gutenberg-test-plugin-disables-the-css-animations plugin in a
    non-target env`. Status: environment failure, not a collaboration product
    bug. This showed up during isolated reruns against the wrong local
    WordPress instance.
-   `rest_post_invalid_id` during setup or editor open. Status: dirty or
    inconsistent test env issue, not a collaboration product bug.
-   `rest_cannot_delete` during `deleteAllPosts()`. Status: dirty shared-state
    setup issue, not a collaboration product bug.
-   `Login or navigation timeout before editor startup`. Status: harness or env
    startup issue, not a confirmed collaboration product bug.

## Collapsed / Not Distinct New Bugs

-   `startup-collaborators-list-never-visible`, `startup-editor-runtime-never-ready`,
    `startup-no-sync-response`, and the singleton
    `startup-login-navigation-timeout` were deeper-checked with isolated
    representative reruns and did not survive as distinct bug families on the
    current campaign envs. Each representative seed failed `5/5`, but every
    rerun reduced to the same repeated `500` `wp-sync` failure involving
    `root/comment`, followed by a downstream startup timeout. Evidence:
    [open-signature-fivepass-20260423/summary.md](../../../artifacts/rtc-browser-fuzz/open-signature-fivepass-20260423/summary.md).
-   Separate from that collapse, there is still genuine load-only startup noise
    in the browser fuzzer. Earlier clean-env isolated checks for seeds `1305`,
    `1309`, and `1329` passed `5/5`, so those signatures were false positives
    rather than product bugs. Evidence:
    [connection-lost-20260423/summary.md](../../../artifacts/rtc-browser-fuzz/connection-lost-20260423/summary.md).
