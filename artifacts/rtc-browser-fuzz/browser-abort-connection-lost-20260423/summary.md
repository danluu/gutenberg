# Connection Lost via browser-aborted sync requests

- Date: 2026-04-23 UTC
- Environment: `WP_BASE_URL=http://localhost:8897`
- Symptom: the real-time collaboration editor shows the `Connection lost` modal even when the sync endpoint does not return an HTTP error, if the browser aborts enough `POST /wp-json/wp-sync/v1/updates` requests.

## Key findings

- The user-provided HAR at [rtc-error.har](/Users/danluu/Downloads/rtc-error.har) contains repeated `status 0` entries for:
  - `POST https://wordpress.org/wp-json/wp-sync/v1/updates?_locale=user`
  - `POST https://wordpress.org/wp-admin/admin-ajax.php`
- Those HAR entries have:
  - no response status text
  - no server IP
  - no connect/send/wait/receive time
  - time spent entirely in `blocked`
- This indicates a browser-side cancellation pattern rather than a server `500`.

## Local reproduction

- A focused Chromium repro that aborts five consecutive `wp-sync` poll requests with `net::ERR_ABORTED` reproduces the modal without any server error.
- The modal appeared consistently after the fifth aborted poll, around `31-35s` after editor startup.
- Focused reruns passed `5/5`:
  - iteration 1: modal at `31626ms`
  - iteration 2: modal at `34691ms`
  - iteration 3: modal at `34690ms`
  - iteration 4: modal at `34676ms`
  - iteration 5: modal at `34690ms`

## Why this happens

- `@wordpress/api-fetch` rethrows `AbortError`, but otherwise normalizes opaque fetch failures to a generic `fetch_error`:
  - [packages/api-fetch/src/index.ts](../../../packages/api-fetch/src/index.ts#L98)
- The polling manager treats any non-403 poll failure as a disconnect candidate and escalates to the modal retry path:
  - [packages/sync/src/providers/http-polling/polling-manager.ts](../../../packages/sync/src/providers/http-polling/polling-manager.ts#L646)
- The only browser lifecycle suppression in that path is `beforeunload` via `isUnloadPending`:
  - [packages/sync/src/providers/http-polling/polling-manager.ts](../../../packages/sync/src/providers/http-polling/polling-manager.ts#L442)
- So browser-aborted sync polls that are not covered by `beforeunload` are surfaced as `Connection lost` even when the server never failed.

## Server-side evidence

- During the local abort-based repro, the WordPress container logs showed no PHP fatals and no `500` responses.
- The aborted `wp-sync` requests simply never appeared in the server logs during the injected abort window, and polling resumed with `200`s afterward.

## Conclusion

- This is a second real `Connection lost` cause distinct from the OOM case.
- Trigger class: browser-side cancellation of sync polls (`status 0` / `net::ERR_ABORTED`) being treated as a hard collaboration disconnect.
