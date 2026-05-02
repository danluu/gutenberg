# RTC Post Content Safe Sync Fuzz Run, 2026-05-02

## Summary

This document records the final status of the RTC post-content safe-sync browser fuzz run based on branch `try/fuzz-post-content-safe-sync-clean-20260501`.

The run should not be treated as a clean 10-hour fuzz pass. It produced useful signal before it degraded, but the latter part was dominated by environment and harness health failures after the shared `wp-env` became unavailable to the fuzz lanes. The run was stopped to avoid generating more low-value environment noise.

Revisions were enabled for this run. The earlier temporary revision-restore disable workaround was not used.

## Run Metadata

- Fuzz base branch: `try/fuzz-post-content-safe-sync-clean-20260501`
- Pushed base reference: `danluu/try/fuzz-post-content-safe-sync-clean-20260501`
- Base HEAD at run start: `d5eeb18aa9c`
- Run directory:
  `/Users/danluu/dev/fuzz/gutenberg-rtc-post-content-safe-sync-fuzz/artifacts/rtc-browser-fuzz/post-content-safe-sync-clean-20260501-d5eeb18-10h-6lanes-revisions-enabled`
- Final local status artifact:
  `/Users/danluu/dev/fuzz/gutenberg-rtc-post-content-safe-sync-fuzz/artifacts/rtc-browser-fuzz/post-content-safe-sync-clean-20260501-d5eeb18-10h-6lanes-revisions-enabled/FINAL-STATUS-20260502T010832Z.md`

The final process check found no active fuzz lane, launcher, watcher, or deep-triage process for this run. The local `wp-env` for the worktree was later running again on port `8896`, but that does not make the stopped run valid retroactively.

## Aggregate Counts

- Attempt records: 565
- Passing attempts: 274
- Failing attempts: 291
- Lane-summary classified real bugs: 0
- Lane-summary classified infra failures: 113
- Lane-summary classified uncertain failures: 174

Top raw failure classes:

- 145: `TimeoutError: page.waitForResponse: Timeout 60000ms exceeded while waiting for event "response"`
- 86: `Error: The plugin "gutenberg-test-plugin-disables-the-css-animations" isn't installed`
- 14: `Error: The theme "twentytwentyone" is not installed`
- 12: `Error: expect(received).toBe(expected) // Object.is equality`
- 4: `Error: apiRequestContext.fetch: socket hang up`

The raw failure count should not be read as 291 product bugs. Much of the tail was downstream of `wp-env`, plugin/theme, or sync-backend health after the run stopped being a clean correctness run.

## Independent Triage Result

The independent triage watcher was reconciled after two stale running jobs had already written result files.

Final watcher state:

- 3 completed
- 9 infra
- 6 no-realistic-repro
- 166 queued

Direct watcher result files:

- 18 result files total
- 7 classified `real`
- 9 classified `infra`
- 2 classified `uncertain`
- 9 false-positive reports
- 7 bug-report files

The lane summaries and watcher disagree on "real" bug count because they represent different layers. Lane summaries captured quick inline classification during the degraded run and had `0` real. The watcher performed later deep triage on representative signatures and found `7` real-classified sightings that collapse into two main bug families.

## Distinct Product Signals

### 1. `wp-sync` shared-room OOM / unbounded update fetch

Canonical local report:

`/Users/danluu/dev/fuzz/gutenberg-rtc-post-content-safe-sync-fuzz/artifacts/rtc-browser-fuzz/post-content-safe-sync-clean-20260501-d5eeb18-10h-6lanes-revisions-enabled/.triage-watcher/signatures/fab9b236d6ec/bug-report.md`

Related local reports:

- `.triage-watcher/signatures/1b35f2029386/bug-report.md`
- `.triage-watcher/signatures/83101fd80f93/bug-report.md`

Summary:

Shared rooms, especially `root/comment`, can accumulate enough retained `wp_sync_update_data` that `WP_Sync_Post_Meta_Storage::get_updates_after_cursor()` exhausts PHP memory. The direct symptom is a `500` from `/wp-json/wp-sync/v1/updates`; downstream browser symptoms include collaboration timeouts, socket hangups, and later connection failures.

The strongest repro is a direct REST repro in the canonical bug report. There is also a seeded Playwright repro script in that signature directory.

This should be filed or fixed as a server/storage scalability bug, not as a browser timeout bug.

### 2. Active post room unexpected `rest_cannot_edit` 403

Canonical-ish local reports:

- `/Users/danluu/dev/fuzz/gutenberg-rtc-post-content-safe-sync-fuzz/artifacts/rtc-browser-fuzz/post-content-safe-sync-clean-20260501-d5eeb18-10h-6lanes-revisions-enabled/.triage-watcher/signatures/e4e6c13d808f/bug-report.md`
- `/Users/danluu/dev/fuzz/gutenberg-rtc-post-content-safe-sync-fuzz/artifacts/rtc-browser-fuzz/post-content-safe-sync-clean-20260501-d5eeb18-10h-6lanes-revisions-enabled/.triage-watcher/signatures/b6e0ef165da5/bug-report.md`
- `/Users/danluu/dev/fuzz/gutenberg-rtc-post-content-safe-sync-fuzz/artifacts/rtc-browser-fuzz/post-content-safe-sync-clean-20260501-d5eeb18-10h-6lanes-revisions-enabled/.triage-watcher/signatures/ab45f2dd934b/bug-report.md`

Related local report:

- `.triage-watcher/signatures/b8fa1e2a9b72/bug-report.md`

Summary:

The sync endpoint intermittently returns a real `403 rest_cannot_edit` for the live `postType/post:<id>` room even though normal post saves around the same time can succeed. Depending on the exact client path, this surfaces as generic `Response` retry/backoff, a `Connection lost` state, room unregistration, or editor divergence.

One no-fault seeded browser repro exists under `b6e0ef165da5`; other signatures are intermittent duplicates and should follow the canonical investigation.

This should be filed or fixed as an RTC sync permission/error-handling bug, with special attention to why the active post room can be denied while the editor still has post edit capability.

## Infra And Harness Findings

Several watcher results were correctly classified as infra or false positives:

- `wp-env` unavailable during Playwright global setup.
- Required test plugin or theme missing after environment degradation.
- Playwright REST verification `socket hang up` with no server-side product failure.
- Sync retry backoff exceeding the 15s convergence oracle after injected faults.
- Stale served sync bundle in at least one triage path, causing current-source and runtime behavior to differ.

Before another long run, the runner should fail fast or pause when `wp-env` health, required plugins, or required themes are missing. Otherwise, the run will spend most of its budget producing duplicate environment-noise signatures.

## Recommended Follow-Up

- Do not count this as a successful long fuzz pass.
- File or fix the two product bug families above using the local bug-report files as source artifacts.
- Keep revision restore enabled in future runs unless a product bug blocks it.
- Drain the 166 queued watcher signatures only after environment-health gating is fixed; most queued signatures are likely from the same degraded tail.
