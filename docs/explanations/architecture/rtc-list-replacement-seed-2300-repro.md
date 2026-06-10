# RTC List Replacement Repro: Seed 2300

This documents a trunk reproduction for a reported RTC/list corruption issue where list content appears to be replaced or duplicated across lists after save/autosave/reload/revision-like flows.

This write-up follows the reviewer guidance from Alec in:

- https://github.com/WordPress/gutenberg/issues/77716#issuecomment-4464309206
- https://github.com/WordPress/gutenberg/issues/77716#issuecomment-4464603395
- https://github.com/WordPress/gutenberg/issues/77716#issuecomment-4464619967

In particular, this provides:

- A deterministic e2e repro that fails on trunk.
- A video tied to the exact e2e run.
- The concrete steps executed by the fuzzer.
- The non-human part of the repro, namely deterministic sync-delay injection and automated multi-user timing.

## Summary

Repro seed: `2300`

Action profile: `list-revision-replacement`

Trunk tested: `dc92ba4293c`

Failure:

After a reload at step 5, every sentinel marker in all three seeded lists appears exactly twice on all three editor pages. The failing invariant is `list-revision-replacement-marker-isolation`.

That means the issue is not just a visual rendering artifact. The editor/code-state oracle sees duplicated list marker content after persisted RTC state is reloaded.

## Video

Primary all-screens annotated video:

`/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/repro-video-seed-2300-20260610T192624Z/annotated-repro-seed-2300-all-screens.webm`

This is the reviewer-facing video. It shows the three editor sessions at the same time, with a running annotated log for setup, each action, why that action matters, the reload, and the final duplicated-marker failure. The last frame shows all three editor pages reporting the same duplicated marker counts.

Single-page annotated video:

`/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/repro-video-seed-2300-20260610T192624Z/annotated-repro-seed-2300.webm`

This is the earlier one-page annotation pass for the same failing run.

Raw Playwright video:

`/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/repro-video-seed-2300-20260610T192624Z/test-results/editor-collaboration-colla-1c444-ave-refresh-and-sync-faults-chromium/video.webm`

Coverage record used for the annotations:

`/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/test/e2e/artifacts/repro-video-seed-2300-20260610T192624Z/rtc-behavioral-coverage-2300.json`

## Repro Command

Run this from the trunk repro worktree:

`/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610`

The test env must be running at `http://localhost:8889`.

```bash
WP_BASE_URL=http://localhost:8889 \
WP_ARTIFACTS_PATH="$(pwd)/test/e2e/artifacts/repro-2300" \
STORAGE_STATE_PATH="$(pwd)/test/e2e/artifacts/repro-2300/storage-states/admin.json" \
GUTENBERG_RTC_BROWSER_ACTION_PROFILE=list-revision-replacement \
GUTENBERG_RTC_BROWSER_SEED_START=2300 \
GUTENBERG_RTC_BROWSER_SEED_COUNT=1 \
GUTENBERG_RTC_BROWSER_STEPS=14 \
GUTENBERG_RTC_BROWSER_CONVERGENCE_TIMEOUT_MS=25000 \
GUTENBERG_RTC_BROWSER_DISCOVERY_TIMEOUT_MS=25000 \
GUTENBERG_RTC_BROWSER_BOOT_TIMEOUT_MS=45000 \
GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE=shadow \
GUTENBERG_RTC_BROWSER_SKIP_GLOBAL_POST_CLEANUP=1 \
npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-fuzz.spec.ts --project=chromium --trace off
```

Expected result on trunk:

The test fails during `reload-convergence step 5` with:

```text
RTC editor invariant failure during reload-convergence step 5
name: list-revision-replacement-marker-isolation
```

The failing marker counts are:

```text
rtc-list-2300-first-1: 2
rtc-list-2300-first-2: 2
rtc-list-2300-first-3: 2
rtc-list-2300-second-1: 2
rtc-list-2300-second-2: 2
rtc-list-2300-second-3: 2
rtc-list-2300-third-1: 2
rtc-list-2300-third-2: 2
rtc-list-2300-third-3: 2
```

Those counts are observed on all three editor pages/users.

## Steps Executed

The fuzzer creates a post containing three sentinel lists. The intended oracle is simple: every `rtc-list-2300-{first,second,third}-{1,2,3}` marker should occur exactly once, and no list block should mix markers from different sentinel groups.

The deterministic seed then executes:

1. User 0 performs `ui-type-paragraph`.
2. Two more editor sessions join, for three users total.
3. User 1 performs `ui-cut-copy-paragraph`.
4. User 2 performs `ui-list-indent`.
5. User 0 saves a checkpoint.
6. The harness injects a 272 ms sync delay.
7. User 1 performs `insert-heading`.
8. User 1 performs `append-paragraph`.
9. User 0 performs an autosave checkpoint.
10. The harness injects a 1347 ms sync delay.
11. User 2 performs `concurrent-paragraphs`.
12. All users converge before reload; the block count is 22.
13. User 0 reloads the editor.
14. After reload, the block count is 25 and every sentinel list marker appears twice.

## Human-Repro Notes

This is not a clean manual-only repro like "click A, type B, reload." The critical path depends on deterministic multi-user RTC timing and two injected sync delays. The editor-visible operations are ordinary editing actions, saves/autosaves, and reloads, but the exact interleaving is produced by the e2e harness.

Per Alec's guidance, this should be treated as an e2e-first repro with documented non-human timing controls. The important reviewer check is that the test fails on trunk with a direct content oracle, and that a candidate fix makes the same test pass without weakening the oracle.

## Why This Matches The User Report

The user report says list contents are being lost/replaced by items from other lists, and that the issue is visible in code view, not only in the visual editor.

This repro targets that class of failure directly:

- The initial document has multiple distinct lists.
- Each list has unique sentinel items.
- The oracle checks serialized/editor content, not only pixels.
- After reload, all markers from all three lists are duplicated.
- The failure occurs after save/autosave/reload pressure, which is close to the reported revision/restore workflow.

The repro does not prove this is the exact same production bug on the user's Atomic site. It does show that current trunk has a deterministic RTC/list persistence corruption path in the same behavioral class.

## How This Was Introduced

Confidence: medium. I have not completed a product-code bisect with this repro. The current evidence is from the failing path, local commit history, and the files touched by the RTC save/reload stack.

The failure is not list-block-specific. Before reload, the three editor sessions converge. The corruption appears after save/autosave pressure, persisted RTC state, and editor reload. That points at the persisted-CRDT materialization/reload pipeline rather than ordinary list editing.

The relevant trunk introduction point identified so far is [05bf6da85b4d5ec7465f59c0c915614bddbae70d](https://github.com/WordPress/gutenberg/commit/05bf6da85b4d5ec7465f59c0c915614bddbae70d), [PR #78891](https://github.com/WordPress/gutenberg/pull/78891), "RTC: Add separate doc persistence endpoint." That commit is an ancestor of `origin/trunk` and added the separate CRDT document persistence endpoint, including `WP_Sync_Save_Server`, `packages/core-data/src/utils/save-crdt-doc.js`, and persistence support in `packages/sync/src/manager.ts`. This is the trunk PR that made the current persisted CRDT document path available.

I previously checked PR07C save/reload snapshot commits as possible history context, but they should not be described as trunk introduction history. These commits are not ancestors of `origin/trunk` in this checkout:

- [2f8247258316bde60869c06c383090904e9426bd](https://github.com/WordPress/gutenberg/commit/2f8247258316bde60869c06c383090904e9426bd), "Fix RTC PR07C save/reload convergence", changed `packages/core-data/src/actions.js`, `packages/core-data/src/entities.js`, and added `packages/core-data/src/utils/crdt-blocks.ts`.
- [b8ca68ad22c01ffa19cbe08a8d56651e5d1ea638](https://github.com/WordPress/gutenberg/commit/b8ca68ad22c01ffa19cbe08a8d56651e5d1ea638), "Preserve RTC record snapshots through reload", changed record snapshot and sync-manager handling through reload.

Those PR07C commits can still be useful for design comparison because they touch the same conceptual area, but they are not evidence for how the bug was introduced on trunk. GitHub only associated an upstream PR with `05bf6da85b4d5ec7465f59c0c915614bddbae70d` / #78891 for the commits checked here.

Two additional local/Jetstream-only commits are relevant context but did not resolve to public GitHub commit URLs in this checkout: `69df480bc3dcfe99e7fe09afbbcd9990dba006da`, "Reconcile persisted CRDT after provider sync", and `4c0a229302a295459fa33affe0304f4d5ee7890b`, "Materialize CRDT content for collaborative saves."

The user report also mentions revision restore. That part is adjacent but likely not the immediate cause of seed `2300`, because this repro fails at reload before a revision restore step is needed. The related revision-restore commit is [8294c3bb7aabab16266af25d428b3e0559646607](https://github.com/WordPress/gutenberg/commit/8294c3bb7aabab16266af25d428b3e0559646607), "Restore revisions as authoritative CRDT snapshots." It should stay in scope for follow-up because the production report says restored revisions later picked up content from other lists.

The PHP comments in the RTC autosave path explicitly describe the failure mode to guard against: if edits are applied to the post and then re-applied to the CRDT on reload, edits can be duplicated. Seed `2300` is consistent with that class of failure: the list sentinels are correct before reload and duplicated after persisted RTC state is reloaded.

## Secondary Atomic-Shim Finding

An Atomic-like shim lane also produced a separate reproducible failure on seed `6300` with `GUTENBERG_RTC_BROWSER_ATOMIC_SITE_SHIM=1`.

That failure is a revision-restore `rest_post_invalid_id` / `Invalid revision ID` path, not the main list duplication failure above. It should be triaged separately.

Artifacts:

`/Users/danluu/dev/fuzz/gutenberg-trunk-list-replace-fuzz-20260610/artifacts/rtc-browser-fuzz/atomic-list-replacement-parallel-20260610T191403Z/lane-0/seed-6300/primary/replay.json`

## Validity Checks

The seed `2300` repro failed in the original primary run and in two automatic rechecks:

- `artifacts/rtc-browser-fuzz/list-replacement-parallel2-20260610T191402Z/lane-0/seed-2300/primary/replay.json`
- `artifacts/rtc-browser-fuzz/list-replacement-parallel2-20260610T191402Z/lane-0/seed-2300/analysis-1-isolated-recheck/replay.json`
- `artifacts/rtc-browser-fuzz/list-replacement-parallel2-20260610T191402Z/lane-0/seed-2300/analysis-2-deeper-recheck/replay.json`

The video run also reproduced the same failure on the initial attempt and both Playwright retries.
