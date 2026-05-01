# RTC browser fuzz overnight run, 2026-05-01

This is the remote-facing summary for the local RTC browser fuzz run stored at:

`artifacts/rtc-browser-fuzz/overnight-20260501-3ce8141-10h-allcores`

Raw Playwright traces and generated triage artifacts are intentionally not
committed here. They remain in the local artifact directory above.

## Base

- Branch under test: `try/fuzz-overnight-20260501`
- Commit under test: `3ce81418ea27a9d76bd98ec6cebf45d04868b425`
- Fuzz lanes: 18
- Start seed: `200001`
- Seed stride: `18`
- Step count: `12`
- Started: `2026-05-01T07:38:23Z`
- Last useful fuzz work: around `2026-05-01T15:54Z`

The run was requested for 10 hours. It produced useful fuzz and triage data for
about 8 hours 16 minutes, then all lanes stopped because the working tree was
switched to a branch where
`test/e2e/specs/editor/collaboration/collaboration-fuzz.spec.ts` did not exist:

```text
runner-error: ENOENT: no such file or directory, access
'/Users/danluu/dev/fuzz/gutenberg/test/e2e/specs/editor/collaboration/collaboration-fuzz.spec.ts'
```

The failures before that checkout change are still useful. The stop reason only
invalidates the missing final portion of the planned 10-hour run.

## Run Counts

Latest local status, generated at `2026-05-01T16:00:51Z`:

- Attempts: `4287`
- Product-or-test uncertain failures: `4240`
- Infrastructure failures: `47`
- Successful seeds: `0`
- Deep-triage buckets processed: `6`

The zero-success result is important: this run was dominated by a basic RTC
post content/block synchronization failure. After that, many seeds are not
independent discoveries; they are mostly variations of the same underlying
non-convergence family plus some environment noise.

## Main Result

The strongest confirmed bug from the run is a real RTC block/content sync
product/config failure, demonstrated most cleanly by seed `200202`.

Short version:

- Post title sync works.
- Post block/content edits do not appear to be admitted into post-room CRDT
  updates.
- The inserted paragraph is present in the editing user's local editor state.
- The other user's editor never receives it.
- The missing paragraph marker does not appear in traced post-room sync payloads.
- Awareness and HTTP transport are healthy in the confirming runs.

The strongest code clue is that `SAFE_POST_SYNC_PROPERTIES` only contains
`title`, and post changes for other properties are filtered before they can be
sent through the post-room CRDT path:

- `packages/core-data/src/utils/crdt.ts`
- `packages/core-data/src/entities.js`
- `packages/core-data/src/hooks/use-entity-block-editor.js`

Local handoff:

`artifacts/rtc-browser-fuzz/repro-seed-200202/HANDOFF.md`

## Seed 200202 Evidence

Confirmed seed rerun:

```bash
GUTENBERG_RTC_BROWSER_SKIP_GLOBAL_POST_CLEANUP=1 \
GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS=1 \
GUTENBERG_RTC_BROWSER_DISABLE_RELOAD=1 \
GUTENBERG_RTC_BROWSER_DISABLE_REVISION_RESTORE=1 \
WP_ARTIFACTS_PATH=artifacts/rtc-browser-fuzz/repro-seed-200202/confirmed-rerun \
GUTENBERG_RTC_BROWSER_SEED_START=200202 \
GUTENBERG_RTC_BROWSER_SEED_COUNT=1 \
GUTENBERG_RTC_BROWSER_STEPS=1 \
GUTENBERG_RTC_BROWSER_CONVERGENCE_TIMEOUT_MS=30000 \
GUTENBERG_RTC_LANE_LABEL=repro-confirmed \
npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-fuzz.spec.ts --project=chromium
```

Result: reproduced the original convergence failure. The secondary inserted:

```text
Seed 200202 step 0 user 1 paragraph 358727
```

The primary never received it.

Trace scan:

- `logs/03-trace-sync-marker-analysis.log`
- post room: `postType/post:3271`
- relevant events were HTTP 200
- awareness repeatedly showed 2 peers
- marker hits for the inserted paragraph: `0`

Real-user browser repro:

```bash
WP_ARTIFACTS_PATH=artifacts/rtc-browser-fuzz/repro-seed-200202/real-user-keyboard-artifact-config-rerun \
npx playwright test -c artifacts/rtc-browser-fuzz/repro-seed-200202/playwright-artifact.config.ts --project=chromium
```

Spec:

`artifacts/rtc-browser-fuzz/repro-seed-200202/snippets/real-user-keyboard-repro.spec.ts`

This repro uses editor canvas focus and keyboard actions for the edit. It does
not use sync fault injection and does not directly create blocks during the
action being tested.

Existing baseline probe:

```bash
WP_ARTIFACTS_PATH=artifacts/rtc-browser-fuzz/repro-seed-200202/existing-sync-user-b-run \
npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-sync.spec.ts --project=chromium --grep "User B adds a paragraph block"
```

Result: also failed. User B locally had `Hello from User B`; User A never saw
the block during the poll.

## Other Triage Buckets

Deep triage processed six buckets:

1. `not_real`, high confidence: Playwright sync route handling false positive.
2. `infra`, high confidence: setup/login/REST discovery stalls.
3. `infra`, high confidence: bootstrap and transport instability before useful
   fuzz actions.
4. `uncertain`, medium confidence: stable collaboration non-convergence,
   product-leaning, but only reproduced through fuzz/programmatic block actions.
5. `uncertain`, medium confidence: likely real RTC non-convergence family, but
   mixed action-specific manifestations and no clean user-only repro in that
   shared environment.
6. `uncertain`, medium confidence: product-leaning divergence after disabling
   sync faults, but no clean user-only repro for that specific seed.

The confirmed seed `200202` should be used as the filing/fix-validation base.
The other product-leaning buckets should not be filed as distinct bugs until
they are separated from the content/block admission failure or converted into
clean real-user repros.

## Local Files To Use Next

- Overall status:
  `artifacts/rtc-browser-fuzz/overnight-20260501-3ce8141-10h-allcores/reports/latest-status.md`
- Deep triage index:
  `artifacts/rtc-browser-fuzz/overnight-20260501-3ce8141-10h-allcores/deep-triage/index.json`
- Seed 200202 handoff:
  `artifacts/rtc-browser-fuzz/repro-seed-200202/HANDOFF.md`
- Real-user repro spec:
  `artifacts/rtc-browser-fuzz/repro-seed-200202/snippets/real-user-keyboard-repro.spec.ts`

## Recommended Next Step

Fix or intentionally configure the post-room CRDT sync path to admit the
intended block/content property with the right permission model. Then rerun:

1. the seed `200202` confirmed rerun,
2. the real-user keyboard repro,
3. the existing `collaboration-sync.spec.ts` "User B adds a paragraph block"
   probe,
4. a shorter all-core fuzz pass to see which uncertain buckets remain after the
   dominant content/block sync failure is removed.
