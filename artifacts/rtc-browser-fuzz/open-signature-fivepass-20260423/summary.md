# Startup signature five-pass recheck

## Goal

Check whether the remaining non-confirmed browser-fuzzer signatures were real
new bugs or false positives.

## Method

- Environment: `WP_BASE_URL=http://localhost:8899`
- Spec: `test/e2e/specs/editor/collaboration/collaboration-fuzz.spec.ts`
- Settings:
  - `GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS=1`
  - `GUTENBERG_RTC_BROWSER_DISABLE_RELOAD=1`
  - `GUTENBERG_RTC_BROWSER_DISCOVERY_TIMEOUT_MS=30000`
  - `GUTENBERG_RTC_BROWSER_BOOT_TIMEOUT_MS=30000`
  - `GUTENBERG_RTC_BROWSER_CONVERGENCE_TIMEOUT_MS=15000`
- Representative seeds:
  - `11000` for `startup-collaborators-list-never-visible`
  - `11009` for `startup-editor-runtime-never-ready`
  - `11117` for `startup-no-sync-response`
  - `11125` for `startup-login-navigation-timeout`
- Each seed was rerun `5` times in isolation.

## Result

All four signatures failed `5/5`, but they did **not** survive as distinct
bugs.

Every rerun collapsed to the same failure shape:

- browser got repeated `500 Internal Server Error` responses from
  `POST /wp-json/wp-sync/v1/updates`
- browser logs showed the same three rooms retrying on every run:
  - `postType/post:<id>`
  - `root/comment`
  - `taxonomy/wp_pattern_category`
- the final test failure was just the downstream startup timeout:
  - `waitForMutualDiscovery()` timing out while waiting for
    `Collaborators list`

The extracted key lines for every seed and every rerun show the same pattern.
For example, `11000`, `11009`, `11117`, and `11125` all contain:

- `Failed to load resource: the server responded with a status of 500`
- `Error posting sync update ... room: root/comment`
- `TimeoutError: locator.waitFor ... Collaborators list`

## Classification

- `startup-collaborators-list-never-visible`:
  not a distinct new bug on the current env; representative seed `11000`
  reduces to the known sync-server `500` failure.
- `startup-editor-runtime-never-ready`:
  not a distinct new bug; representative seed `11009` reduces to the same
  sync-server `500` failure before editor readiness completes.
- `startup-no-sync-response`:
  not a distinct new bug; representative seed `11117` reduces to the same
  sync-server `500` failure before any successful sync response arrives.
- `startup-login-navigation-timeout`:
  the original singleton signature does not survive as a distinct issue under
  isolated reruns on `8899`; representative seed `11125` also reduces to the
  same sync-server `500` failure.

So these buckets are not false positives in the narrow sense that the tests do
fail in isolation, but they are **false leads as new bugs**. They are current
surfaces of an already-confirmed server-side sync failure, not separate product
defects.

## Why this points back to the known OOM family

- The repeated failing room is again `root/comment`.
- The already-confirmed OOM note showed that `root/comment` alone can make
  startup hit repeated `500`s and then surface generic startup failures:
  [connection-lost-20260423/summary.md](../../../artifacts/rtc-browser-fuzz/connection-lost-20260423/summary.md)
- On the current `8899` env, the `root/comment` storage post still exists with
  substantial persisted state:
  - room hash: `469b1b9d5a562c1488248bad3cc3fc25`
  - storage post id: `10`
  - stored updates: `161`
  - stored update chars: `13,077,344`

That is enough evidence to treat these startup buckets as manifestations of the
known sync-storage failure mode rather than as new distinct bugs.

## Remaining caveat

There is still evidence for genuine load-only startup false positives from the
earlier clean-env check on `8897`:

- seed `1305`: isolated reruns passed `5/5`
- seed `1309`: isolated reruns passed `5/5`
- seed `1329`: isolated reruns passed `5/5`

So the browser fuzzer still has startup noise under load. But the currently
tracked `11000` / `11009` / `11117` / `11125` families are not examples of a
new startup-only false positive. On the current campaign envs, they reduce to
the already-known sync-server failure.
