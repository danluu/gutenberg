# Connection Lost via browser offline state (`ERR_INTERNET_DISCONNECTED`)

- Date: 2026-04-23 UTC
- Evidence source: [rtc-error.har](/Users/danluu/Downloads/rtc-error.har)
- Symptom: the real-time collaboration editor shows the `Connection lost` modal after repeated browser-side network failures, even without a server `500`.

## Key findings

- The HAR does **not** show generic request cancellation as its primary signature.
- All 10 captured failures are `status 0` with `response._error = net::ERR_INTERNET_DISCONNECTED`.
- The failures affect both:
  - `POST https://wordpress.org/wp-json/wp-sync/v1/updates?_locale=user`
  - `POST https://wordpress.org/wp-admin/admin-ajax.php`
- Every failed request has:
  - no server IP
  - no response headers/body
  - no connect/send/wait/receive time
  - only a small `blocked` time before failure
- That means the browser/network stack decided the request could not be sent at all; this is not a server-side application failure.

## What this rules in

- A browser- or OS-level offline transition affecting the tab's requests.
- Chrome/Chromium offline mode or a browser-local network state flip.
- A local network stack interruption such as:
  - machine sleep / wake
  - interface change (Wi-Fi, Ethernet, dock, VPN, proxy)
  - security software or local filtering software disrupting browser connectivity

## What this rules out

- A WordPress REST `500` or PHP fatal for these specific requests.
- A collaboration-only bug in `wp-sync`, because Heartbeat (`admin-ajax.php`) fails the same way in the same window.
- A request that reached the server and then timed out, because the HAR never shows a connection being established.

## Relevant code path

- `@wordpress/api-fetch` converts failed fetches into `offline_error` when `navigator.onLine === false`, otherwise `fetch_error`:
  - [packages/api-fetch/src/index.ts](../../../packages/api-fetch/src/index.ts#L82)
- The polling manager treats non-403 poll failures as disconnects and escalates to the modal after the retry ladder is exhausted:
  - [packages/sync/src/providers/http-polling/polling-manager.ts](../../../packages/sync/src/providers/http-polling/polling-manager.ts#L646)
  - [packages/sync/src/providers/http-polling/config.ts](../../../packages/sync/src/providers/http-polling/config.ts#L8)
- The hard modal variant in the screenshot appears once retries are exhausted:
  - [packages/editor/src/components/sync-connection-error-modal/index.tsx](../../../packages/editor/src/components/sync-connection-error-modal/index.tsx#L122)

## Additional observations

- The Heartbeat requests in the HAR include `has_focus=false`, so the page was not focused when at least some failures happened.
- This HAR should be kept separate from the other browser-side failure class I reproduced locally:
  - `ERR_ABORTED` due to browser request cancellation / lifecycle events
  - That class is real too, but it is **not** what this HAR shows.

## Conclusion

- The user-provided HAR points to a browser-offline failure mode, not a server error and not just a generic abort.
- The most likely causes are browser/OS network-state transitions or local network stack interference, on a path that affects both Heartbeat and collaboration sync.
