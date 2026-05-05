# RTC fuzz known-bugs handoff

Date: 2026-05-05

This file is for handing the most likely remaining RTC bugs to another agent on another machine. It assumes the agent starts from the refreshed fixed base and should avoid spending time on bug families that no longer reproduce there.

## Checkout

```bash
git clone git@github.com:danluu/gutenberg.git
cd gutenberg
git checkout try/fuzz-fixed-base-20260505
```

Remote branch: https://github.com/danluu/gutenberg/tree/try/fuzz-fixed-base-20260505

Known-good handoff ref:

```text
ad3408a5b35 Allow RTC collaborators to promote auto-drafts
```

This base includes the current fuzz-fix stack from #77716 that was available during the handoff:

- #77865 current head integrated as local cherry-picks.
- #77866 duplicate/no-CRDT table row fix.
- #77876 stale saved-content overwrite fix.
- #77887 stale object+query map fix.
- #77890 stale persisted CRDT document rejection.

It intentionally does not include:

- `7cbe36591fa2c2986693c9c90f2606e65b567aff`
- #77889, which is an alternate draft to #77890 rather than an additional included fix.

## Setup notes

Use an isolated `wp-env` per investigation. Do not share a WordPress environment with a fuzz monitor or post cleanup job while validating repros.

```bash
npm install
composer install
npm run wp-env status
npm run wp-env start
```

For HTTP-polling RTC repros, use the normal Playwright config and a clean `WP_BASE_URL`.

For WebSocket repros, use the fixed-base WS harness:

```bash
GUTENBERG_RTC_TEST_WS_PROVIDER=1
GUTENBERG_RTC_TEST_WS_URL=ws://127.0.0.1:<port>
GUTENBERG_RTC_TEST_WS_PORT=<port>
```

The fixed-base branch includes the test WebSocket provider files and global setup changes. The old fixed-base canonical fuzzer lane is stale and should not be treated as product evidence by itself.

## Portable artifact caveat

The strongest realistic repro specs were generated locally in `/Users/danluu/dev/fuzz/gutenberg/test/e2e/specs/editor/collaboration/` and are not all tracked on this branch. If the other machine has an artifact bundle from the original fuzz machine, copy these files into the same paths before running the commands:

- `triage-4ba23abee72f-realistic.spec.ts`
- `triage-ccd0d72f4c1b-realistic.spec.ts`
- `triage-a2e6705b1ea0-realistic.spec.ts`
- `triage-811d61edbfe2-shared.spec.ts`

If those files are not available, recreate the scenarios below. The expected symptoms and JSON evidence are enough to rebuild the tests.

## Highest-priority likely bugs

### 1. Title split after reload with identical body blocks

Status: still valid on refreshed fixed base.

Signatures/families:

- `ccd0d72f4c1b`
- `4ba23abee72f`
- Related older title-only families include `cdd06c7d84ce`, `f9b393af36c7`, `78dcd89724df`, and `5e16a43298ce`; treat those as the same broad family unless a new repro proves otherwise.

Why this is likely real:

- The refreshed validation reproduced title divergence after normal editor reload flows.
- Body blocks matched, including the table edit in the seed-931006-shaped repro.
- The title state split across peers while the persisted title stayed stale.
- No network fault injection was used in the realistic repros.

Canonical current evidence from the original machine:

```text
artifacts/rtc-browser-fuzz/fixed-base-20260505-3174ff0/validation-20260505-refresh/http-realistic/json/seed-931006-like-title-loss-after-reload.json
artifacts/rtc-browser-fuzz/fixed-base-20260505-3174ff0/validation-20260505-refresh/http-realistic/json/reload-primary.json
artifacts/rtc-browser-fuzz/fixed-base-20260505-3174ff0/validation-20260505-refresh/http-realistic/json/reload-collaborator.json
```

Key observed result for `ccd0d72f4c1b`:

- Before reload: both peers had `RTC seed 931006 step 0 user 0 title 320724`.
- After reload: primary kept that updated title.
- After reload: collaborator reverted to `RTC seed 931006 initial title`.
- The table body edit was present on both sides.

Useful run command if the generated spec is available:

```bash
WP_BASE_URL=http://localhost:<port> \
RTC_TITLE_REPRO_DIR=/tmp/rtc-title-repro \
npm run test:e2e -- --config playwright.config.ts \
  test/e2e/specs/editor/collaboration/triage-ccd0d72f4c1b-realistic.spec.ts \
  --project=chromium --workers=1
```

Important repro note:

- If using an older generated `ccd0` spec, repair the stale assertion in `editSecondTableCell()`: table cells are contenteditable textboxes, so use `toContainText()` rather than `toHaveValue()`.

Suggested next work:

- Convert the title split into a deterministic, committed Playwright repro.
- Reduce to a core-data/CRDT unit repro if possible.
- Investigate title vs content CRDT persistence on reload. The body CRDT appears to converge while title state falls back to persisted/stale title on one peer.

### 2. Block deletion plus follow-up persistence can corrupt or collapse body content

Status: still likely real, exact original symptom not stable in the realistic repro.

Signature:

- `a2e6705b1ea0`

Original triage classification:

```text
Distinct bug type: rtc_block_tree_collapse_after_delete_and_followup_persistence
Classification: real
Confidence: medium
Recommended action: file_bug
```

Original seed:

```text
950056
```

Original symptom:

- After collaborative delete/checkpoint/save activity, both peers briefly agreed on a non-empty block tree.
- A later state collapsed to `blocks: []`.
- The post title survived.
- Persisted `content.raw` became empty while `_crdt_document` was still present.

Refreshed-base realistic status:

- The exact empty-block-tree collapse did not reproduce cleanly.
- The same realistic flow still failed in the same block-delete/follow-up-edit area.
- One refreshed run lost/truncated the collaborator paragraph before the heading insertion step.
- An earlier same-base run saved a heading block with empty content where the expected heading text should have been.

Canonical original evidence from the original machine:

```text
artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-5-20260502T074048Z/.triage-watcher/signatures/a2e6705b1ea0/STATUS.md
artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-5-20260502T074048Z/.triage-watcher/signatures/a2e6705b1ea0/analysis.md
```

Useful run command if the generated spec is available:

```bash
WP_BASE_URL=http://localhost:<port> \
RTC_A2E6705_REPRO_DIR=/tmp/rtc-a2e6705-repro \
npm run test:e2e -- --config playwright.config.ts \
  test/e2e/specs/editor/collaboration/triage-a2e6705b1ea0-realistic.spec.ts \
  --project=chromium --workers=1
```

Suggested next work:

- Run this in an isolated environment, not a shared fuzz environment.
- If the exact empty-tree symptom is needed, reduce from the original fuzz trace/seed rather than relying only on the current realistic spec.
- Try to isolate the lower-level transition where a delete plus follow-up insert/save turns a valid block tree into an empty or truncated serialized body.
- File only if the agent can produce either a stable realistic repro or a lower-level proof that the original fuzz trace cannot be an artifact.

## Do not spend first-pass time on these fixed/not-reproduced families

These realistic WebSocket repros passed on the refreshed fixed base with the current WS-aware harness:

```text
58b782e101aa  1/1 passed
85a36d801db9  3/3 passed
12ec8c36ed8d  6/6 passed on clean rerun
64edf2f8cbab  1/1 passed on clean rerun
ec47d94c5251  3/3 passed
```

Only reopen these if they reproduce on `ad3408a5b35` or a newer refreshed fixed base with an isolated test environment.

## Passing control

`811d61edbfe2` remains useful as a same-user title reload control:

```bash
WP_BASE_URL=http://localhost:<port> \
npm run test:e2e -- --config playwright.config.ts \
  test/e2e/specs/editor/collaboration/triage-811d61edbfe2-shared.spec.ts \
  --project=chromium --workers=1
```

Expected on the refreshed fixed base: 2/2 passed.

## Common traps

- Do not let a fuzz monitor clean up posts while a repro is running. That caused false "post deleted" failures during validation.
- Do not classify old canonical seed replay failures from the stale fixed-base fuzzer as product bugs. Use the current harness or a focused realistic repro.
- Clear stale `wp_sync_storage` rows before canonical seed replay. Stale rows caused earlier HTTP 403 failures.
- Treat "no realistic repro found" as a status, not exoneration, when the original trace has strong product evidence.
- Prefer one isolated `wp-env` per signature when doing deep triage; shared environments produced misleading 404/connection-loss noise.

## Recommended handoff order

1. Start with `ccd0d72f4c1b` and `4ba23abee72f`. They are the clearest currently-valid failures and should be consolidated into one title-split bug unless deeper analysis proves distinct causes.
2. Then work on `a2e6705b1ea0`. Its original evidence is severe, but the exact realistic repro needs more reduction.
3. Only after those are handled, generate a manifest of one canonical repro per remaining distinct `Classification: real` bug type and run the manifest against the refreshed fixed base.

## Local validation report

The full local validation report on the source machine was:

```text
artifacts/rtc-browser-fuzz/fixed-base-20260505-3174ff0/validation-20260505-refresh/triage-validity-recheck.md
```

That file is under gitignored `artifacts/`, so it may not be present on another machine unless the artifact bundle was copied.
