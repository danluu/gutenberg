# Jetstream2 RTC Fuzzing Resume Save

Written: 2026-05-29T05:37:26Z

This file is a recovery note for resuming the Jetstream2 fuzzing work if the
machine restarts or the session is lost.

Important: this is a point-in-time snapshot. Some future progress may have been
made after this file was written, including new fuzz results, committed fixes,
or a restarted run. Always re-check the remote state before applying the next
steps below.

## Connection

```bash
ssh danluu-fuzzer-cpu
```

Current CPU host, verified 2026-06-02:

- SSH alias: `danluu-fuzzer-cpu`
- User/host: `exouser@danluu-fuzzer-cpu.cis251402.projects.jetstream-cloud.org`
- IP: `149.165.152.251`

## Key Remote Paths

- All-merged repo:
  `/media/volume/danluu-fuzz-data/rtc-all-merged-fuzz-20260526T195420Z/repo`
- All-merged branch:
  `fuzz/all-merged-rtc-pr-stack-20260526T195420Z`
- Validation/fuzz harness source repo:
  `/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`
- Coverage-guided fuzz root:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515`
- Node 20 PATH prefix:
  `/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin`
- Fuzz start script:
  `/tmp/start_rtc_coverage_guided_remote.sh`
- Fuzz cleanup script:
  `/tmp/cleanup_rtc_coverage_guided_remote.sh`

## First Resume Checks

Run these first because the remote may have advanced after this save:

```bash
ssh danluu-fuzzer-cpu '
set -e
cd /media/volume/danluu-fuzz-data/rtc-all-merged-fuzz-20260526T195420Z/repo
printf "HEAD=" && git rev-parse --short HEAD
git status --short -- \
  packages/core-data/src/utils/crdt-blocks.ts \
  packages/core-data/src/utils/test/crdt-stale-top-level-blocks.test.ts \
  test/e2e/specs/editor/collaboration/collaboration-fuzz.spec.ts
OUT=$(cat /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/current-output-dir.txt 2>/dev/null || true)
printf "current-output=%s\n" "$OUT"
/usr/bin/tmux -L rtc-fuzz ls 2>/dev/null | grep -E "rtc-coverage-guided|watchdog" || true
'
```

If HEAD is still `6f6241e4483`, the latest committed all-merged fix is
`Skip oversized optional RTC compactions`, and the current CRDT stale-block fix
below is still uncommitted.

## Current Patch State At Save Time

There is an uncommitted product patch in the all-merged repo:

- `packages/core-data/src/utils/crdt-blocks.ts`
- `packages/core-data/src/utils/test/crdt-stale-top-level-blocks.test.ts`

Intent: fix seed `1150001`, where final convergence and the REST save agree on
canonical content hash `9fa534...`, but after final persistence/reload the live
editor hydrates to `a5b584...` from stale CRDT block/content state.

Patch shape at save time:

- `insertMissingLocalBlocks` tracks whether an insertion anchor still exists.
- Base blocks are matched by client ID only.
- Non-base blocks are matched by client ID only.
- Existing locally inserted blocks are merged with incoming block data via
  `mergeBlockIntoYBlock(...)` instead of preserving stale nested children.
- Added test:
  `updates an existing locally inserted block instead of preserving stale nested children`

Verification already passed for this uncommitted patch:

```bash
npm run format -- \
  packages/core-data/src/utils/crdt-blocks.ts \
  packages/core-data/src/utils/test/crdt-stale-top-level-blocks.test.ts
npm run test:unit -- \
  packages/core-data/src/utils/test/crdt-stale-top-level-blocks.test.ts \
  --runInBand
npm run test:unit -- \
  packages/core-data/src/utils/test/crdt.ts \
  packages/core-data/src/utils/test/crdt-stale-top-level-blocks.test.ts \
  --runInBand
npm run build -- --skip-types
```

Focused replay of seed `1150001` still failed after that first patch with:

```text
RTC final persistence oracle failure:
editedHash=a5b584b295f1787e20d6970d3710aa35a6d6fadf50c18cc02d225a5f6baa5293
persistedHash=9fa534cfa9ad1cd12705934644f4c70840f7bc54554c56ca625ff46e1dbd8b16
```

At save time, the next debugging step was to decode persisted post `13`
`_crdt_document` and compare:

- `post_content`
- CRDT top-level `content`
- CRDT `blocks`
- `recordSnapshot.content`

The `post_content` fetched from the running wp-env instance was correct and had
only one copy of the nested group inserted at step 21.

## Running wp-env State

All-merged wp-env was started for manual replay on alternate ports:

```text
WordPress:   http://localhost:16699
phpMyAdmin:  http://localhost:16799
```

Use these env vars for local replay on the remote:

```bash
export PATH=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin:$PATH
cd /media/volume/danluu-fuzz-data/rtc-all-merged-fuzz-20260526T195420Z/repo
WP_ENV_PORT=16699 WP_ENV_PHPMYADMIN_PORT=16799 npm run wp-env status
```

If it is stopped, restart with:

```bash
WP_ENV_PORT=16699 WP_ENV_PHPMYADMIN_PORT=16799 npm run wp-env start
```

Do not use the default phpMyAdmin port; port `9000` was already allocated.

## Manual Replay Command For Seed 1150001

```bash
export PATH=/media/volume/danluu-fuzz-data/rtc-e2e-setup-20260514/.local/node-v20.19.0-linux-x64/bin:$PATH
cd /media/volume/danluu-fuzz-data/rtc-all-merged-fuzz-20260526T195420Z/repo
WP_BASE_URL=http://localhost:16699 \
RTC_FUZZ_BASE_URL=http://localhost:16699 \
WP_ENV_PORT=16699 \
WP_ENV_PHPMYADMIN_PORT=16799 \
GUTENBERG_RTC_BROWSER_SEEDS=1150001 \
GUTENBERG_RTC_BROWSER_SEED_COUNT=1 \
GUTENBERG_RTC_BROWSER_STEPS=24 \
GUTENBERG_RTC_BROWSER_ACTION_PROFILE=session-lifecycle \
GUTENBERG_RTC_BROWSER_COLLABORATOR_MODE=same-user \
GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS=0 \
GUTENBERG_RTC_BROWSER_DISABLE_RELOAD=0 \
GUTENBERG_RTC_BROWSER_DISABLE_REVISION_RESTORE=0 \
GUTENBERG_RTC_BROWSER_ENABLE_REVISION_RESTORE_PROBE=1 \
GUTENBERG_RTC_BROWSER_SKIP_GLOBAL_POST_CLEANUP=1 \
GUTENBERG_RTC_BROWSER_COLLECT_CDP_COVERAGE=0 \
GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS=1 \
GUTENBERG_RTC_BROWSER_ENABLE_LIFECYCLE_EVENTS=1 \
GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE=fail \
GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE=fail \
GUTENBERG_RTC_BROWSER_FORCE_RELOAD_STEPS=4,9,14,20 \
GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT=2 \
GUTENBERG_RTC_BROWSER_LIFECYCLE_RELOAD_COUNT=3 \
GUTENBERG_RTC_TEST_WS_PROVIDER=0 \
GUTENBERG_RTC_LANE_LABEL=manual-1150001 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-fuzz.spec.ts \
  --project=chromium
```

Latest replay artifacts were under:

```text
/media/volume/danluu-fuzz-data/rtc-all-merged-fuzz-20260526T195420Z/repo/test/e2e/artifacts/
```

## Previously Committed All-Merged Fixes

These commits were already on the all-merged branch before this save:

```text
36d9c44d73f Fix all-merged RTC table stale snapshot fuzz failures
26b6a326e72 Avoid bytewise CRDT document fuzz convergence checks
037a87b8506 Preserve revision fields during RTC restore
476d7cfdd3c Avoid duplicating reparsed nested blocks in RTC merge
7d608b6fba2 Persist explicit revision restore fields
4b95ae642c5 Clear stale incoming block sync markers
030fdc343a0 Ignore stale CRDT content when blocks are present
0d3e32df3c4 Avoid disconnecting RTC polling on persisted pagehide
7732806467d Fallback to compaction for oversized sync responses
6f6241e4483 Skip oversized optional RTC compactions
```

## Blocking Failure Triage Snapshot

- `1140001`: product sync bugs already fixed. The blockers were persisted
  `pagehide` disconnect, then oversized `sync_step2`, then oversized optional
  compaction. This seed passed after those fixes plus the publish-oracle harness
  patch.
- Publish oracle issue: harness bug, not product. The untracked fuzz harness
  file was patched to wait dynamically for the actual publish/save control.
- `1150001`: still active. Product bug. Final convergence and final REST save
  use canonical content `9fa534...`, but persisted CRDT state can hydrate the
  editor to `a5b584...`, indicating stale/internal-inconsistent CRDT state.
- `1180001`: likely harness revision-restore UI readiness issue after product
  persistence already passed. Not yet fixed.
- `1190002`, `1210002`, `1140002`: convergence timeouts not fully triaged.
  Re-run after the `1150001` CRDT fix before classifying.

## After Fixing The Current Product Bug

Once seed `1150001` replay passes:

```bash
cd /media/volume/danluu-fuzz-data/rtc-all-merged-fuzz-20260526T195420Z/repo
git add \
  packages/core-data/src/utils/crdt-blocks.ts \
  packages/core-data/src/utils/test/crdt-stale-top-level-blocks.test.ts
git commit -m "Update existing inserted CRDT blocks during local merge"
git push origin fuzz/all-merged-rtc-pr-stack-20260526T195420Z
```

Then restart fuzzing so it runs against the new all-merged HEAD:

```bash
ssh danluu-fuzzer-cpu '/tmp/cleanup_rtc_coverage_guided_remote.sh; /tmp/start_rtc_coverage_guided_remote.sh'
```

After restart, check:

```bash
ssh danluu-fuzzer-cpu '
OUT=$(cat /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/current-output-dir.txt)
printf "OUT=%s\n" "$OUT"
find "$OUT" -name summary.ndjson -print
'
```
