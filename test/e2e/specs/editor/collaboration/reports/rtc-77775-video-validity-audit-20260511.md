# Video Validity Audit - 2026-05-11

## Verdict

The video is valid only as a local, retry-selected RTC divergence witness for the exact harness and checkout used.

It is not valid as an accepted/submission-ready proof of a clean upstream Gutenberg bug, a settled convergence failure, or durable data loss.

## Artifact Reviewed

- Attempt: `/tmp/rtc-video-regeneration/77775/natural-round-pristine-selected-20260511-130730-N/attempts/n-004-table-inserted-row-delete-original-second-column-fw500-ar50-i20-td20`
- A video SHA256: `0cca131a6a439ae2ac7bb209dcee831c79f2a3a3e204850461dd65e18ca489f0`
- B video SHA256: `f005ff96acbf976d0602e441b356a9de5d8ebd60669705cb77fc2974dc9559c7`
- Report previously marked accepted: `/tmp/rtc-video-regeneration/77775/natural-repro-production-20260511-accepted-pristine.md`

## Positive Evidence

- Media/keyframes were previously verified as real and decodable.
- Run data reports `rtcA=true`, `rtcB=true`, `awarenessReachedTwo=true`.
- A received B's inserted-row token before A acted.
- Final JSON/keyframes agree that final A lacks the token while final B keeps it:
  - `finalAStillMissing=true`
  - `finalBStillKeeps=true`
  - `finalAStoreIncludes=false`
  - `finalBStoreIncludes=true`

This is enough to keep the artifact as a useful debugging lead.

## Decisive Problems

- Provenance is not clean upstream/pristine. Local verification shows `repo-pristine` is detached at `a78d5723c97 Add RTC stale table Playwright repro`, with `origin` pointing to `/tmp/rtc-video-regeneration/77775/gutenberg-video`, no `origin/trunk`, and parent runtime changes including `37f55dac1df RTC: Add stable table query array identity`, which modifies `packages/core-data/src/utils/crdt-blocks.ts` and `packages/block-library/src/table/state.js`.
- The final state is not quiescent. `finalAdditionalSyncDuringWindow=true`, `finalSyncWindowDeltaA=1`, and `finalSyncWindowDeltaB=1`; the artifact proves a sampled divergence, not that convergence had settled.
- The bug was not asserted by Playwright. The runner sets `RTC_VISIBLE_ASSERT_BROWSER_BUG=0`, and the spec only asserts `browserBugDetected` when that flag is enabled.
- The artifact is retry-selected. The strict hit is `n-004`; earlier attempts did not satisfy the strict predicate.
- The scenario is mislabeled. The path/name says `delete-original-second-column`, but the spec/run-data description says A deletes the preselected original first column.
- The harness/runtime identity is weak for proof: external spec directory, dummy `webServer` with `reuseExistingServer: true`, and `SCRIPT_DEBUG=false` with no build asset hash trail.
- There is no vector-clock/update-id proof, no causal proof that B processed A's delete, no third-client check, and no save/reload or persisted-state check.

## Cross-Review Consensus

- One reviewer called it invalid as an accepted artifact.
- Five reviewers called it valid only with caveats.
- None accepted it as clean submission-ready proof.

Common framing: the artifact is a plausible local race/live-divergence candidate, but should not be presented as final proof against clean trunk or an upstream PR base.

## Minimum Bar To Promote

- Rerun on a clean, named upstream or PR/base SHA with public remote provenance and recorded build/runtime asset hashes.
- Use a committed or fully disclosed harness.
- Enable the actual bug assertion, or run an independent verifier that fails when the divergence is absent.
- Require a quiet final window: no sync deltas for a meaningful interval, or protocol-level state/vector evidence that both clients processed the relevant updates.
- Record update IDs/vector clocks/server sequence evidence for the relevant operations.
- Clarify the scenario semantics and label.
- If claiming data loss, save/reload or inspect persisted post/server state.
- Report repeated cold-run results, not just the first strict selected retry.
