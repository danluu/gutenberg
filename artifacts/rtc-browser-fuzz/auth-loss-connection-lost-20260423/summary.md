# Connection Lost via auth / nonce loss mid-session

- Date: 2026-04-23 UTC
- Environment used for confirmation: `http://localhost:8895`
- Symptom: the editor shows the `Connection lost` modal after browser auth state is lost mid-session, even on a healthy local network.

## Why this is distinct

- Not PHP OOM.
- Not browser offline / `ERR_INTERNET_DISCONNECTED`.
- Not the `>50 rooms` limit.
- Not oversized compaction.
- The failure is auth-related: repeated `403` responses with `rest_cookie_invalid_nonce`.

## Browser repro

- Open a collaborative editor session.
- Wait for one successful `wp-sync` poll.
- Clear the browser context cookies without reloading the page.
- The next sync polls fail with:
  - `status: 403`
  - body: `{"code":"rest_cookie_invalid_nonce","message":"Cookie check failed","data":{"status":403}}`
- After retries are exhausted, the editor shows the `Connection lost` modal.

## Relevant code path

- `api-fetch` retries only when the parsed error code is `rest_cookie_invalid_nonce`, but the polling path here receives a generic `Response` error and falls through to disconnect handling:
  - [packages/api-fetch/src/index.ts](../../../packages/api-fetch/src/index.ts#L74)
  - [packages/sync/src/providers/http-polling/polling-manager.ts](../../../packages/sync/src/providers/http-polling/polling-manager.ts#L646)
- The modal text is the generic unknown-error mapping:
  - [packages/editor/src/utils/sync-error-messages.ts](../../../packages/editor/src/utils/sync-error-messages.ts#L48)

## Five-pass confirmation

Focused isolated reruns on `8895`:

- iteration 1: modal at `21.2s`, repeated `403 rest_cookie_invalid_nonce`
- iteration 2: modal at `21.0s`, repeated `403 rest_cookie_invalid_nonce`
- iteration 3: modal at `22.2s`, repeated `403 rest_cookie_invalid_nonce`
- iteration 4: modal at `21.8s`, repeated `403 rest_cookie_invalid_nonce`
- iteration 5: modal at `21.8s`, repeated `403 rest_cookie_invalid_nonce`

All `5/5` runs reproduced.

## Conclusion

Losing auth state mid-session is a real `Connection lost` cause. In the confirmed repro, cookie loss leads to repeated `rest_cookie_invalid_nonce` `403`s and the editor surfaces them as the generic disconnect modal instead of an auth-specific failure.
