# Known Fixes Base Status - 2026-05-07

Status: buildable and pushed.

Conclusion from the backlink audit: the previous worker configuration was incomplete. It used `/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505`, which was based on a May 5 checkout and did not encode the #77716 backlink/cross-reference set.

Current trunk target:
- `origin/trunk` `86d1b6741a57cdc066485370fe051285f2ebd0b4`
- Commit date: `2026-05-07T13:13:35-06:00`
- Subject: `Add RTC cursor-scope regression tests (#77662)`

Backlink-aware #77716 RTC fix set:
- Already merged in current trunk: `77658`, `77662`, `77669`, `77675`, `77681`, `77865`
- Open/proposed RTC PRs included in the synthetic known-fixes branch: `77666`, `77673`, `77723`, `77724`, `77775`, `77866`, `77874`, `77876`, `77887`, `77889`, `77890`, `77920`, `77924`
- Non-RTC/test-infra backlinks excluded from the runtime known-fixes base unless directly needed for a test harness: `77726`, `77727`, `77893`, `77896`

Current combined worktree:
- Path: `/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-current-20260507`
- Branch: `rtc-known-fixes-current-20260507`
- Initial merge policy: chronological merge of open RTC PR heads with `-X theirs` for textual conflicts.
- Final branch SHA: `f256024286dd80a4c0e2579f658c109256abf648`
- Remote branch: `https://github.com/danluu/gutenberg/tree/rtc-known-fixes-current-20260507`
- Initial merge result: all open RTC PR heads merged, but the branch did not build because several open PRs overlap in `packages/core-data/src/utils/crdt-blocks.ts` and related files.
- Final integration result: buildable synthetic base. The integration commit resolves overlapping changes in `packages/core-data/src/utils/crdt-blocks.ts`, `packages/core-data/src/utils/crdt.ts`, `packages/core-data/src/resolvers.js`, `packages/sync/src/manager.ts`, `packages/sync/src/types.ts`, and `test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts`.

Verification so far:
- `npm install` completed in the current combined worktree.
- `npm run build` initially failed after TypeScript caught integration conflicts in CRDT block merge code.
- After integration fixes and merging latest `origin/trunk`, `npm run build` passed on 2026-05-07.
- `node ./tools/eslint/lint-js.cjs --config eslint.config.strict.cjs ...` passed for the touched files after formatting.
- `git diff --check` passed.
- The pre-commit hook passed while creating commit `f256024286dd80a4c0e2579f658c109256abf648`.

Caveat:
- This is a synthetic integration base, not an upstream-reviewed combined PR. Several proposed fixes touched the same CRDT merge code, so the final base is a best-effort combination of the linked fixes plus current trunk. For claims that depend on exact semantics of one conflicting open PR, also check that PR head directly before saying a bug survives all proposed fixes.

Worker status:
- `run-bug-worker.sh`, `run-deep-worker.sh`, and `run-likelihood-worker.sh` now point at `/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-current-20260507` and explicitly require the backlink-aware #77716 set.
- Passes launched before this file was written should not be treated as backlink-aware known-fixes verification.
- Workers should be restarted after this manifest update so new prompts pick up the current base path and caveat.
