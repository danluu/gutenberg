# Connection Lost bug

- Date: 2026-04-23 UTC
- Environment: `WP_BASE_URL=http://localhost:8896`
- Symptom: browser shows the real-time collaboration `Connection lost` modal during ordinary editor startup on a fast local network, with no synthetic network faults.

## Key findings

- Browser startup probe hit repeated `500` responses from `POST /wp-json/wp-sync/v1/updates`.
- The `500` response body was:
  - `internal_server_error`
  - `Allowed memory size of 134217728 bytes exhausted`
  - file: `/var/www/html/wp-includes/collaboration/class-wp-sync-post-meta-storage.php`
  - line: `335`
- The in-repo corresponding code is [lib/compat/wordpress-7.0/class-wp-sync-post-meta-storage.php](../../../lib/compat/wordpress-7.0/class-wp-sync-post-meta-storage.php#L341).
- The shared sync room `root/comment` had `2080` persisted updates totaling about `54,545,077` bytes.
- The OOM happened at PHP's default `128M` limit in the running `wp-env-test` container:
  - `memory_limit => 128M => 128M`
  - fatal tried to allocate another `36,864` bytes after reaching `134,217,728` bytes
- This does not appear to depend on a fuzz-only low-memory setup:
  - [.wp-env.test.json](../../../.wp-env.test.json#L1) does not override PHP memory settings
  - WordPress constants were `WP_MEMORY_LIMIT=40M` and `WP_MAX_MEMORY_LIMIT=256M`
  - the failing collaboration endpoint is a REST route, not a classic admin screen that naturally inherits the `admin` memory raise in `/var/www/html/wp-admin/admin.php`
- Type breakdown for `root/comment` updates:
  - `sync_step2`: `1483`
  - `sync_step1`: `298`
  - `update`: `298`
  - `compaction`: `1`
- Browser-side isolation showed:
  - `postType/post:<id>` request succeeds
  - `taxonomy/wp_pattern_category` request succeeds
  - `root/comment` request alone reproduces the `500`

## Browser evidence

- Failed two-user startup trace:
  - [trace.zip](../../../test/e2e/artifacts/test-results/editor-collaboration-tmp-c-9483b-inary-collaborative-editing-chromium/trace.zip)
  - [error-context.md](../../../test/e2e/artifacts/test-results/editor-collaboration-tmp-c-9483b-inary-collaborative-editing-chromium/error-context.md)
  - [test-failed-1.png](../../../test/e2e/artifacts/test-results/editor-collaboration-tmp-c-9483b-inary-collaborative-editing-chromium/test-failed-1.png)

## Stability

- Focused single-user modal repro passed `5/5` times.

## Other signatures checked

- Clean all-core browser fuzzing on `http://localhost:8897` with the known reload bug removed from discovery only surfaced one additional signature: startup timeout in `waitForMutualDiscovery()` while waiting for the `Collaborators list` button.
- That startup-timeout signature did not survive isolation:
  - seed `1305`: isolated reruns passed `5/5`
  - seed `1309`: isolated reruns passed `5/5`
  - seed `1329` with a longer `30s` discovery timeout: isolated reruns passed `5/5`
- Conclusion: the extra startup-timeout signature is a load-induced browser-fuzz false positive under all-core parallel startup, not a second likely real collaboration bug.
