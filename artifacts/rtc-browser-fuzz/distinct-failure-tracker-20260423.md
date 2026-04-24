# Distinct Failure Tracker

- Snapshot time: 2026-04-23T18:59:09.825Z
- Roots scanned: `artifacts/rtc-browser-fuzz/allcore-no-reload-nofaults-8899-pty-20260423T073135Z`, `artifacts/rtc-browser-fuzz/allcore-no-reload-nofaults-8889-pty-20260423T073135Z`
- Summary files scanned: 18

## Triaged Real

- `auth-loss-invalid-nonce`: Mid-session auth loss yields repeated rest_cookie_invalid_nonce 403s and Connection lost. Count: 0. Seeds: n/a. Note: [summary.md](../../artifacts/rtc-browser-fuzz/auth-loss-connection-lost-20260423/summary.md).
- `browser-offline-disconnect`: Browser or OS offline state yields wp-sync failures and Connection lost. Count: 0. Seeds: n/a. Note: [summary.md](../../artifacts/rtc-browser-fuzz/browser-offline-connection-lost-20260423/summary.md).
- `oversized-compaction-update`: Compaction update over 1 MiB triggers server validation failure and Connection lost. Count: 0. Seeds: n/a. Note: [summary.md](../../artifacts/rtc-browser-fuzz/oversized-compaction-connection-lost-20260423/summary.md).
- `php-oom-root-comment`: root/comment room growth can OOM PHP and surface Connection lost. Count: 0. Seeds: n/a. Note: [summary.md](../../artifacts/rtc-browser-fuzz/connection-lost-20260423/summary.md).
- `request-body-too-large`: Large multi-room poll body exceeds 16 MiB cap, returns 413, then Connection lost. Count: 0. Seeds: n/a. Note: [summary.md](../../artifacts/rtc-browser-fuzz/sync-body-size-connection-lost-20260423/summary.md).
- `too-many-rooms-per-request`: More than 50 rooms in one poll request yields repeated 400s and Connection lost. Count: 0. Seeds: n/a. Note: [summary.md](../../artifacts/rtc-browser-fuzz/too-many-rooms-connection-lost-20260423/summary.md).

## Known Excluded

- `reload-title-known`: Known reload-title family; excluded from current bug search. Count: 349. Seeds: 11018, 11063, 11126, 11189, 11270, 11342, 11486, 11612, 11648, 11684. Note: [collaboration-title-reload-repro.spec.ts](../../test/e2e/specs/editor/collaboration/collaboration-title-reload-repro.spec.ts).
  Example seed 11018 (reload-title-known): [hd]: Error posting sync update, will retry with backoff {room: taxonomy/wp_pattern_category, error: Response, nextPoll: 16000}   ✘  1 [chromium] › specs/editor/collaboration/colla
  Example seed 11063 (reload-title-known): [hd]: Error posting sync update, will retry with backoff {room: taxonomy/wp_pattern_category, error: Response, nextPoll: 16000}   ✘  1 [chromium] › specs/editor/collaboration/colla
  Example seed 11126 (reload-title-known): [hd]: Error posting sync update, will retry with backoff {room: taxonomy/wp_pattern_category, error: Response, nextPoll: 16000}   ✘  1 [chromium] › specs/editor/collaboration/colla
  Example seed 11189 (reload-title-known): [hd]: Error posting sync update, will retry with backoff {room: taxonomy/wp_pattern_category, error: Response, nextPoll: 16000}   ✘  1 [chromium] › specs/editor/collaboration/colla
  Example seed 11270 (reload-title-known): [hd]: Error posting sync update, will retry with backoff {room: taxonomy/wp_pattern_category, error: Response, nextPoll: 16000}   ✘  1 [chromium] › specs/editor/collaboration/colla

## Triaged Infra / Env

- `global-setup-theme-missing`: Global setup activateTheme() fails because twentytwentyone is missing. Count: 5. Seeds: 12125, 11660, 11546, 12419, 10513.
  Example seed 12125 (unknown): > gutenberg@23.0.0-rc.1 test:e2e > npm exec --workspace @wordpress/e2e-tests-playwright -- wp-scripts test-playwright --config playwright.config.ts test/e2e/specs/editor/collaborat
  Example seed 11660 (unknown): > gutenberg@23.0.0-rc.1 test:e2e > npm exec --workspace @wordpress/e2e-tests-playwright -- wp-scripts test-playwright --config playwright.config.ts test/e2e/specs/editor/collaborat
  Example seed 11546 (unknown): > gutenberg@23.0.0-rc.1 test:e2e > npm exec --workspace @wordpress/e2e-tests-playwright -- wp-scripts test-playwright --config playwright.config.ts test/e2e/specs/editor/collaborat
  Example seed 12419 (unknown): > gutenberg@23.0.0-rc.1 test:e2e > npm exec --workspace @wordpress/e2e-tests-playwright -- wp-scripts test-playwright --config playwright.config.ts test/e2e/specs/editor/collaborat
  Example seed 10513 (unknown): > gutenberg@23.0.0-rc.1 test:e2e > npm exec --workspace @wordpress/e2e-tests-playwright -- wp-scripts test-playwright --config playwright.config.ts test/e2e/specs/editor/collaborat
- `global-setup-delete-post-500`: Global setup deleteAllPosts() fails with 500 rest_cannot_delete. Count: 4. Seeds: 10027, 10003, 10008, 10134.
  Example seed 10027 (unknown): > gutenberg@23.0.0-rc.1 test:e2e > npm exec --workspace @wordpress/e2e-tests-playwright -- wp-scripts test-playwright --config playwright.config.ts test/e2e/specs/editor/collaborat
  Example seed 10003 (unknown): > gutenberg@23.0.0-rc.1 test:e2e > npm exec --workspace @wordpress/e2e-tests-playwright -- wp-scripts test-playwright --config playwright.config.ts test/e2e/specs/editor/collaborat
  Example seed 10008 (unknown): > gutenberg@23.0.0-rc.1 test:e2e > npm exec --workspace @wordpress/e2e-tests-playwright -- wp-scripts test-playwright --config playwright.config.ts test/e2e/specs/editor/collaborat
  Example seed 10134 (unknown): > gutenberg@23.0.0-rc.1 test:e2e > npm exec --workspace @wordpress/e2e-tests-playwright -- wp-scripts test-playwright --config playwright.config.ts test/e2e/specs/editor/collaborat
- `global-setup-invalid-post-id`: Setup or editor open fails with rest_post_invalid_id against a dirty or inconsistent test env. Count: 4. Seeds: 12441, 12256, 10434, 10372.
  Example seed 12441 (unknown): > gutenberg@23.0.0-rc.1 test:e2e > npm exec --workspace @wordpress/e2e-tests-playwright -- wp-scripts test-playwright --config playwright.config.ts test/e2e/specs/editor/collaborat
  Example seed 12256 (unknown): > gutenberg@23.0.0-rc.1 test:e2e > npm exec --workspace @wordpress/e2e-tests-playwright -- wp-scripts test-playwright --config playwright.config.ts test/e2e/specs/editor/collaborat
  Example seed 10434 (unknown): > gutenberg@23.0.0-rc.1 test:e2e > npm exec --workspace @wordpress/e2e-tests-playwright -- wp-scripts test-playwright --config playwright.config.ts test/e2e/specs/editor/collaborat
  Example seed 10372 (unknown): > gutenberg@23.0.0-rc.1 test:e2e > npm exec --workspace @wordpress/e2e-tests-playwright -- wp-scripts test-playwright --config playwright.config.ts test/e2e/specs/editor/collaborat
- `startup-login-navigation-timeout`: Login or post-editor navigation never finishes before startup timeout. Count: 1. Seeds: 11125.
  Example seed 11125 (startup-timeout):      [31mTest timeout of 180000ms exceeded.[39m      Error: page.waitForURL: Test ended.     =========================== logs ===========================     waiting for navigati

## Open Untriaged

- `startup-collaborators-list-never-visible`: Collaborators list button never becomes visible during discovery. Count: 5505. Seeds: 11000, 11027, 11036, 11045, 11072, 11081, 11090, 11099, 11135, 11144.
  Example seed 11000 (startup-timeout):   1) [chromium] › specs/editor/collaboration/collaboration-fuzz.spec.ts:554:3 › Collaboration - Seeded Fuzzing › seed 11000 converges under save, refresh, and sync faults       Tim
  Example seed 11027 (startup-timeout):   1) [chromium] › specs/editor/collaboration/collaboration-fuzz.spec.ts:554:3 › Collaboration - Seeded Fuzzing › seed 11027 converges under save, refresh, and sync faults       Tim
  Example seed 11036 (startup-timeout):   1) [chromium] › specs/editor/collaboration/collaboration-fuzz.spec.ts:554:3 › Collaboration - Seeded Fuzzing › seed 11036 converges under save, refresh, and sync faults       Tim
  Example seed 11045 (startup-timeout):   1) [chromium] › specs/editor/collaboration/collaboration-fuzz.spec.ts:554:3 › Collaboration - Seeded Fuzzing › seed 11045 converges under save, refresh, and sync faults       Tim
  Example seed 11072 (startup-timeout):   1) [chromium] › specs/editor/collaboration/collaboration-fuzz.spec.ts:554:3 › Collaboration - Seeded Fuzzing › seed 11072 converges under save, refresh, and sync faults       Tim
- `startup-editor-runtime-never-ready`: Editor runtime never reaches window.wp.data/window.wp.blocks readiness. Count: 787. Seeds: 11009, 11054, 11108, 11153, 11243, 11252, 11378, 11432, 11450, 11468.
  Example seed 11009 (startup-timeout): [hd]: Error posting sync update, will retry with backoff {room: taxonomy/wp_pattern_category, error: Response, nextPoll: 30000}   ✘  1 [chromium] › specs/editor/collaboration/colla
  Example seed 11054 (startup-timeout): [hd]: Error posting sync update, will retry with backoff {room: taxonomy/wp_pattern_category, error: Response, nextPoll: 30000}   ✘  1 [chromium] › specs/editor/collaboration/colla
  Example seed 11108 (startup-timeout): [hd]: Error posting sync update, will retry with backoff {room: taxonomy/wp_pattern_category, error: Response, nextPoll: 30000}   ✘  1 [chromium] › specs/editor/collaboration/colla
  Example seed 11153 (startup-timeout): [hd]: Error posting sync update, will retry with backoff {room: taxonomy/wp_pattern_category, error: Response, nextPoll: 30000}   ✘  1 [chromium] › specs/editor/collaboration/colla
  Example seed 11243 (startup-timeout): [hd]: Error posting sync update, will retry with backoff {room: taxonomy/wp_pattern_category, error: Response, nextPoll: 30000}   ✘  1 [chromium] › specs/editor/collaboration/colla
- `startup-no-sync-response`: No successful wp-sync response arrives during discovery. Count: 50. Seeds: 11117, 11207, 11225, 11333, 11720, 11226, 11235, 11334, 12135, 12513.
  Example seed 11117 (startup-timeout):   ✘  1 [chromium] › specs/editor/collaboration/collaboration-fuzz.spec.ts:554:3 › Collaboration - Seeded Fuzzing › seed 11117 converges under save, refresh, and sync faults (18.5s)
  Example seed 11207 (startup-timeout):   ✘  1 [chromium] › specs/editor/collaboration/collaboration-fuzz.spec.ts:554:3 › Collaboration - Seeded Fuzzing › seed 11207 converges under save, refresh, and sync faults (17.7s)
  Example seed 11225 (startup-timeout):   ✘  1 [chromium] › specs/editor/collaboration/collaboration-fuzz.spec.ts:554:3 › Collaboration - Seeded Fuzzing › seed 11225 converges under save, refresh, and sync faults (18.2s)
  Example seed 11333 (startup-timeout):     1) [chromium] › specs/editor/collaboration/collaboration-fuzz.spec.ts:554:3 › Collaboration - Seeded Fuzzing › seed 11333 converges under save, refresh, and sync faults       T
  Example seed 11720 (startup-timeout):     1) [chromium] › specs/editor/collaboration/collaboration-fuzz.spec.ts:554:3 › Collaboration - Seeded Fuzzing › seed 11720 converges under save, refresh, and sync faults       T
