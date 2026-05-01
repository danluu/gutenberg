# Rich-Text Merge Corrupts Valid HTML Closing Tags

## Summary

The Issue 5 fuzzer failure is a real RTC rich-text corruption bug. A valid local
rich-text snapshot such as `ab<em>b</em><strong>it</strong>` can be merged into
the local Y.Doc as `ab<em>b</em><strong>it</stronm>`.

The observed failure is not caused by invalid source HTML. It is the same class
as [#77532](https://github.com/WordPress/gutenberg/issues/77532): the block
merge write path passes a block-editor rich-text text offset into
`Delta.diffWithCursor()`, which works over serialized HTML string indices. A
cursor in the wrong coordinate space can steer the diff into a closing tag and
produce internally valid Yjs text with invalid HTML.

## Status against known fixes

Checked tracking issue: [#77716](https://github.com/WordPress/gutenberg/issues/77716).
The relevant known fixes are:

-   [#77658](https://github.com/WordPress/gutenberg/pull/77658), open, not merged:
    carries scoped rich-text cursor hints, converts editor offsets to HTML indices
    only for the matching rich-text field, and verifies cursor-guided deltas before
    applying them.
-   [#77662](https://github.com/WordPress/gutenberg/pull/77662), open, not merged:
    adds tests for a related cursor-scope corruption case. It changes only test
    coverage and does not fix this offset-space Playwright repro.
-   [#77669](https://github.com/WordPress/gutenberg/pull/77669), merged into
    `origin/trunk` at `5ddf4ad1b34`, fixes update-size accounting and is not a
    rich-text corruption fix.
-   [#77666](https://github.com/WordPress/gutenberg/pull/77666),
    [#77673](https://github.com/WordPress/gutenberg/pull/77673),
    [#77675](https://github.com/WordPress/gutenberg/pull/77675),
    [#77678](https://github.com/WordPress/gutenberg/issues/77678), and
    [#77681](https://github.com/WordPress/gutenberg/pull/77681) cover other RTC
    failure modes and do not directly target this closing-tag corruption.

As of May 1, 2026, I do not know of a merged upstream PR that fixes the
normal-user Playwright repro on `origin/trunk`. The open #77658 PR does fix the
natural Playwright repro when tested in a clean PR-head worktree with matching
dependencies and a successful build. A May 1 repeated browser validation found
the committed normal-user repro fails 3/3 times on the tests-only unfixed base
and passes 3/3 times on #77658. A later May 1 current-upstream validation
rebased `danluu/try/offset-space-bug-pr` to `f136c427533b` on
`origin/trunk` `68484244df2d`, confirmed current trunk still fails 3/3, and
confirmed the rebased fix still passes 3/3. Newer plausible danluu RTC/sync
fix branches were also checked and did not fix this repro.

Local checks:

-   Broken base: `danluu/try/fuzz` at `4c5412d8361`. Seed 2 fails with the exact
    closing-tag corruption.
-   Known rich-text fix base:
    `/Users/danluu/dev/fuzz/gutenberg-fuzz-with-rich-text-offset-fix` at
    `58b6239cb57`, which contains `48058d67104`, the RTC rich-text offset-space
    cursor fix. Seed 2 passes.
-   Scratch all-known-fixes runtime base:
    `/Users/danluu/dev/fuzz/gutenberg-try-fuzz` at `86b2df5cacc`. The same fuzz
    command fails because expected objects do not include new `__unstableSyncId`
    fields, but the diff no longer shows malformed rich-text closing tags. I treat
    that as blocked for the exact fuzzer oracle, not as evidence that Issue 5 still
    reproduces.

Updated conclusion after a clean PR-head Playwright rerun: Issue 5 is fixed by
[#77658](https://github.com/WordPress/gutenberg/pull/77658)'s code, but the fix
is not merged into `origin/trunk`. An earlier
PR-head Playwright run that appeared to fail was invalid: its Playwright trace
shows the editor loaded WordPress core's
`/wp-includes/js/dist/core-data.min.js`, not the Gutenberg plugin override at
`/wp-content/plugins/.../build/scripts/core-data/index.min.js`. That happened
after an incomplete/mismatched local build, so the browser never exercised
[#77658](https://github.com/WordPress/gutenberg/pull/77658)'s fixed bundle.

## Reproductions

### Fuzzer repro

Naturalness: package-level randomized editor operations over `mergeCrdtBlocks()`
and the RTC Yjs block representation. It does not use fault injection; it is not
a Playwright user flow, but it is the original Issue 5 signal.

Broken command, run from `/tmp/gutenberg-issue5-broken` at `4c5412d8361`:

```bash
GUTENBERG_FUZZ_SEED_COUNT=1 GUTENBERG_FUZZ_SEED_START=2 \
  npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts \
  --runInBand --testNamePattern="concurrent-block-tree-edits"
```

Result: failed. The reduced failure included:

```text
Expected second: ab<em>b</em><strong>it</strong>
Received second: ab<em>b</em><strong>it</stronm>
```

Known-fix command, run from
`/Users/danluu/dev/fuzz/gutenberg-fuzz-with-rich-text-offset-fix` at
`58b6239cb57`:

```bash
GUTENBERG_FUZZ_SEED_COUNT=1 GUTENBERG_FUZZ_SEED_START=2 \
  npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts \
  --runInBand --testNamePattern="concurrent-block-tree-edits"
```

Result: passed.

All-known-fixes scratch command, run from
`/Users/danluu/dev/fuzz/gutenberg-try-fuzz` at `86b2df5cacc`:

```bash
GUTENBERG_FUZZ_SEED_COUNT=1 GUTENBERG_FUZZ_SEED_START=2 \
  npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts \
  --runInBand --testNamePattern="concurrent-block-tree-edits"
```

Result: failed on `__unstableSyncId` metadata differences, not on malformed
rich-text HTML. The rich-text strings shown in the failure were valid.

### Focused unit/model repro

Naturalness: direct exercise of the first production-relevant rich-text merge
layer. It supplies the same kind of block-editor selection offset that the real
editor sends, not a made-up HTML index.

Command on the #77658 fix branch:

```bash
npm run test:unit -- packages/core-data/src/utils/test/rtc-rich-text-offset-space.test.js --runInBand
```

Result on `/Users/danluu/dev/fuzz/gutenberg-fuzz-with-rich-text-offset-fix`:
passed, 6 tests. Coverage includes `mergeCrdtBlocks()`,
`applyPostChangesToCRDTDoc()`, `SyncManager.update()`, and fuzzed formatted
rich-text updates.

Attempted broken-base run from the tests-only commit `70a64c95ea2` failed before
the repro assertions because that disposable worktree did not have matching
generated package artifacts and workspace dependencies (`framer-motion`, then
`packages/icons/src/library`). The same tests are documented as failing
pre-fix in [#77532](https://github.com/WordPress/gutenberg/issues/77532).

### Integration repro

Naturalness: exercises the real `useEntityBlockEditor().onInput()` data flow
with block content plus selection, then lets `editEntityRecord()` and the sync
manager apply the change to the CRDT document.

Command on the #77658 fix branch:

```bash
npm run test:unit -- packages/core-data/src/test/rtc-rich-text-offset-space.test.js --runInBand
```

Result on `/Users/danluu/dev/fuzz/gutenberg-fuzz-with-rich-text-offset-fix`:
passed, 1 test.

### Playwright repro with normal user actions

Naturalness: the valid top-level repro is the second test in
[`collaboration-rich-text-offset-space.spec.ts`](https://github.com/danluu/gutenberg/blob/try/offset-space-bug/test/e2e/specs/editor/collaboration/collaboration-rich-text-offset-space.spec.ts).
It creates a collaborative post, clicks the paragraph, presses `End`, presses
`Backspace`, selects four characters with `Shift+ArrowLeft`, and uses the Italic
shortcut. It only reads editor selection state for assertions.

Command from the `try/offset-space-bug` branch:

```bash
npm run build -- --skip-types
npm run wp-env-test -- start
WP_BASE_URL=http://localhost:8889 \
  npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-rich-text-offset-space.spec.ts \
  --project=chromium \
  --grep="user unitalicizes"
```

Expected on the broken implementation: author reaches
`italic<em>beta</em>beta`; collaborator receives corrupted
`italic<em>beta</em>/em>`.

Expected after a complete fix: both editors show
`italic<em>beta</em>beta`.

Local status update on May 1, 2026:

The normal-user Playwright repro is committed in
`test/e2e/specs/editor/collaboration/collaboration-rich-text-offset-space.spec.ts`
at `70a64c95ea2` (`Add RTC rich-text offset-space repro tests`). The second test
is the handoff-level repro. It uses browser actions for the edit itself:
clicking the paragraph, `End`, `Backspace`, four `Shift+ArrowLeft` presses, and
the Italic shortcut. The only `page.evaluate()` calls in that test read editor
selection offsets for assertions; they do not mutate the store, mutate a Y.Doc,
pause clocks/network, or inject faults.

I reran the repro from a fresh tests-only worktree:
`/tmp/gutenberg-rich-text-user-repro` at `70a64c95ea2`. Setup was:

```bash
npm ci
npm run build -- --skip-types
WP_ENV_PORT=8903 WP_ENV_PHPMYADMIN_PORT=9103 npm run wp-env start
```

The fresh wp-env did not include the local e2e disable-animations test plugin,
so I copied the existing test plugin into the WordPress plugins directory before
running Playwright:

```bash
WP_ENV_PORT=8903 WP_ENV_PHPMYADMIN_PORT=9103 \
  npm run wp-env run cli -- bash -lc \
  'cp /var/www/html/wp-content/plugins/gutenberg-rich-text-user-repro/packages/e2e-tests/plugins/disable-animations.php /var/www/html/wp-content/plugins/gutenberg-test-plugin-disables-the-css-animations.php'
```

Repeated broken-base command:

```bash
for i in 1 2 3; do
  WP_BASE_URL=http://localhost:8903 \
  WP_ARTIFACTS_PATH=/tmp/rtc-rich-text-natural-baseline-70a64/run-$i \
    npm run test:e2e -- \
    test/e2e/specs/editor/collaboration/collaboration-rich-text-offset-space.spec.ts \
    --project=chromium \
    --grep="user unitalicizes" \
    --trace=on
done
```

Result: failed 3/3 times at the intended collaborator assertion. Each run showed
the author-side expected HTML but the collaborator-side corruption:

```text
Expected content: italic<em>beta</em>beta
Received content: italic<em>beta</em>/em>
```

Broken-base artifacts:

```text
/tmp/rtc-rich-text-natural-baseline-70a64/loop.log
/tmp/rtc-rich-text-natural-baseline-70a64/run-1/test-results/editor-collaboration-colla-e3706-cizes-part-of-an-italic-run-chromium/trace.zip
/tmp/rtc-rich-text-natural-baseline-70a64/run-2/test-results/editor-collaboration-colla-e3706-cizes-part-of-an-italic-run-chromium/trace.zip
/tmp/rtc-rich-text-natural-baseline-70a64/run-3/test-results/editor-collaboration-colla-e3706-cizes-part-of-an-italic-run-chromium/trace.zip
```

I reran the same test against a clean #77658 worktree:
`/tmp/gutenberg-pr77658-deep` at `610e02e28b6`. Setup was:

```bash
npm run build -- --skip-types
WP_ENV_PORT=8902 WP_ENV_PHPMYADMIN_PORT=9102 npm run wp-env start
```

and the same local e2e plugin copy, with the PR-head plugin path:

```bash
WP_ENV_PORT=8902 WP_ENV_PHPMYADMIN_PORT=9102 \
  npm run wp-env run cli -- bash -lc \
  'cp /var/www/html/wp-content/plugins/gutenberg-pr77658-deep/packages/e2e-tests/plugins/disable-animations.php /var/www/html/wp-content/plugins/gutenberg-test-plugin-disables-the-css-animations.php'
```

Repeated #77658 command:

```bash
for i in 1 2 3; do
  WP_BASE_URL=http://localhost:8902 \
  WP_ARTIFACTS_PATH=/tmp/rtc-rich-text-natural-pr77658/run-$i \
    npm run test:e2e -- \
    test/e2e/specs/editor/collaboration/collaboration-rich-text-offset-space.spec.ts \
    --project=chromium \
    --grep="user unitalicizes" \
    --trace=on
done
```

Result: passed 3/3 times. Passing artifacts:

```text
/tmp/rtc-rich-text-natural-pr77658/loop.log
/tmp/rtc-rich-text-natural-pr77658/run-1/test-results/editor-collaboration-colla-e3706-cizes-part-of-an-italic-run-chromium/trace.zip
/tmp/rtc-rich-text-natural-pr77658/run-2/test-results/editor-collaboration-colla-e3706-cizes-part-of-an-italic-run-chromium/trace.zip
/tmp/rtc-rich-text-natural-pr77658/run-3/test-results/editor-collaboration-colla-e3706-cizes-part-of-an-italic-run-chromium/trace.zip
```

Bundle verification:

```text
baseline served: http://localhost:8903/wp-content/plugins/gutenberg-rich-text-user-repro/build/scripts/core-data/index.js?ver=80dab1b7ebe54cd9ba83
#77658 served:   http://localhost:8902/wp-content/plugins/gutenberg-pr77658-deep/build/scripts/core-data/index.js?ver=603bd24d5723510ae5e6
```

The built baseline bundle did not contain the `verification-text` guard. The
built #77658 bundle did contain it.

Current upstream validation on May 1, 2026:

I fetched current refs before retesting:

```bash
git fetch origin trunk
git fetch danluu '+refs/heads/*:refs/remotes/danluu/*'
```

`origin/trunk` was `68484244df2d` (`Media editor modal: name landmark regions
and add panel headings (#77875)`). I rebased the proposed fix branch
`danluu/try/offset-space-bug-pr` from `610e02e28b6a` onto that trunk. The
rebased branch head is `f136c427533b`. `git range-diff` showed the three-commit
stack was preserved:

```text
1:  0a217a34ddf = 1:  064ba3d3331 Add RTC rich-text offset-space repro tests
2:  cfcfe75228f = 2:  664ec12429a Fix RTC rich-text offset-space cursor handling
3:  610e02e28b6 = 3:  f136c427533 Strengthen RTC rich-text cursor types
```

I pushed the rebased branch back to the existing danluu branch with:

```bash
git push --force-with-lease=refs/heads/try/offset-space-bug-pr:610e02e28b6a091da264c14b6a275c4e5fdde95e \
  danluu HEAD:try/offset-space-bug-pr
```

Current-trunk browser baseline setup used a tests-only worktree at
`/tmp/gutenberg-issue5-trunk-baseline`, based on `origin/trunk` with only the
normal-user Playwright repro file copied from `70a64c95ea2`. Ports `8941` and
`9141` were checked free before starting wp-env.

```bash
npm ci
npm run build -- --skip-types
WP_ENV_PORT=8941 WP_ENV_PHPMYADMIN_PORT=9141 npm run wp-env start
WP_ENV_PORT=8941 WP_ENV_PHPMYADMIN_PORT=9141 \
  npm run wp-env run cli -- bash -lc \
  'cp /var/www/html/wp-content/plugins/gutenberg-issue5-trunk-baseline/packages/e2e-tests/plugins/disable-animations.php /var/www/html/wp-content/plugins/gutenberg-test-plugin-disables-the-css-animations.php'

for i in 1 2 3; do
  WP_BASE_URL=http://localhost:8941 \
  WP_ARTIFACTS_PATH=/tmp/rtc-issue5-current-trunk-baseline/run-$i \
    npm run test:e2e -- \
    test/e2e/specs/editor/collaboration/collaboration-rich-text-offset-space.spec.ts \
    --project=chromium \
    --grep="user unitalicizes" \
    --trace=on
done
```

Result: failed 3/3 times at the intended product assertion. Each run showed
`Expected content: italic<em>beta</em>beta` and
`Received content: italic<em>beta</em>/em>`. Logs and traces:

```text
/tmp/rtc-issue5-current-trunk-baseline/loop.log
/tmp/rtc-issue5-current-trunk-baseline/run-1/test-results/editor-collaboration-colla-e3706-cizes-part-of-an-italic-run-chromium/trace.zip
/tmp/rtc-issue5-current-trunk-baseline/run-2/test-results/editor-collaboration-colla-e3706-cizes-part-of-an-italic-run-chromium/trace.zip
/tmp/rtc-issue5-current-trunk-baseline/run-3/test-results/editor-collaboration-colla-e3706-cizes-part-of-an-italic-run-chromium/trace.zip
```

Rebased fix setup used `/tmp/gutenberg-issue5-pr-rebase` at `f136c427533b`. The
branch itself carries lower-level repro tests; for the browser rerun I copied
only the same Playwright repro file from `70a64c95ea2` into the scratch worktree.
Ports `8942` and `9142` were checked free before starting wp-env.

```bash
npm ci
npm run build -- --skip-types
WP_ENV_PORT=8942 WP_ENV_PHPMYADMIN_PORT=9142 npm run wp-env start
WP_ENV_PORT=8942 WP_ENV_PHPMYADMIN_PORT=9142 \
  npm run wp-env run cli -- bash -lc \
  'cp /var/www/html/wp-content/plugins/gutenberg-issue5-pr-rebase/packages/e2e-tests/plugins/disable-animations.php /var/www/html/wp-content/plugins/gutenberg-test-plugin-disables-the-css-animations.php'

git checkout 70a64c95ea2 -- \
  test/e2e/specs/editor/collaboration/collaboration-rich-text-offset-space.spec.ts

for i in 1 2 3; do
  WP_BASE_URL=http://localhost:8942 \
  WP_ARTIFACTS_PATH=/tmp/rtc-issue5-rebased-pr-browser/run-$i \
    npm run test:e2e -- \
    test/e2e/specs/editor/collaboration/collaboration-rich-text-offset-space.spec.ts \
    --project=chromium \
    --grep="user unitalicizes" \
    --trace=on
done
```

Result: passed 3/3 times. Passing log:

```text
/tmp/rtc-issue5-rebased-pr-browser/loop.log
```

Targeted checks on the rebased fix also passed:

```bash
npm run build -- --skip-types
npm run test:unit -- \
  packages/core-data/src/utils/test/rtc-rich-text-offset-space.test.js \
  packages/core-data/src/test/rtc-rich-text-offset-space.test.js
npm run lint:js -- \
  packages/core-data/src/awareness/post-editor-awareness.ts \
  packages/core-data/src/test/rtc-rich-text-offset-space.test.js \
  packages/core-data/src/utils/block-selection-history.ts \
  packages/core-data/src/utils/crdt-blocks.ts \
  packages/core-data/src/utils/crdt-selection.ts \
  packages/core-data/src/utils/crdt-user-selections.ts \
  packages/core-data/src/utils/crdt-utils.ts \
  packages/core-data/src/utils/crdt.ts \
  packages/core-data/src/utils/test/crdt-blocks.ts \
  packages/core-data/src/utils/test/crdt-utils.ts \
  packages/core-data/src/utils/test/rtc-rich-text-offset-space.test.js
```

Newer danluu branch check:

I inspected recent `danluu` branches by committer date and included branches with
production changes touching RTC, sync, stale-save merging, rich text, tables,
query blocks, or top-level block handling. In a scratch worktree
`/tmp/gutenberg-issue5-branch-check`, I cherry-picked only the test commit
`064ba3d3331` onto each candidate and ran:

```bash
npm run test:unit -- \
  packages/core-data/src/utils/test/rtc-rich-text-offset-space.test.js \
  packages/core-data/src/test/rtc-rich-text-offset-space.test.js
```

All candidate failures were product assertion failures, not harness failures.
Representative assertion: expected `"<em>italic</em>beta"` and received
`"<em>italic</em>bet>"`.

I also inspected recent companion branches that contained only documentation or
repro-test changes, not production fixes: `danluu/try/stale-top-level-blocks`
(`5dc53be84b75`), `danluu/try/stale-query-object-map` (`d027ad13af59`),
`danluu/try/stale-rich-text-sibling` (`73691fd22d28`),
`danluu/try/stale-query-array` (`97b9e88e363c`),
`danluu/try/form-content-overwrite` (`28b7f047b0b2`),
`danluu/try/stale-content-overwrite` (`99bbe5f3db5f`),
`danluu/try/draft-reopens-blank` (`81299fc396f0`), and
`danluu/try/nav-menu-stale-save` (`738a3b3d59ba`). I did not count these as
newer submitted fixes because their diffs did not include production code for
this issue.

| Branch | SHA | Why checked | Command | Result |
| --- | --- | --- | --- | --- |
| `origin/trunk` | `68484244df2d` | Current upstream control | unit command above | Failed |
| `danluu/fix/rtc-autodraft-autosave-loss-pr` | `b677576fbfe8` | RTC autosave/sync production fix | unit command above | Failed |
| `danluu/try/stale-rich-text-sibling-pr` | `1455411c8049` | Rich-text sibling CRDT merge production fix | unit command above and Playwright spot-check below | Failed |
| `danluu/try/stale-top-level-blocks-pr` | `0b375470eef2` | Top-level stale merge/sync production fix | unit command above | Failed |
| `danluu/try/stale-content-overwrite-pr` | `54ff99db2227` | Stale content merge/sync production fix | unit command above | Failed |
| `danluu/try/form-content-overwrite-pr` | `cd6822b89c95` | Stale form content merge/sync production fix | unit command above | Failed |
| `danluu/try/draft-reopens-blank-pr` | `a3e4dbc6e81a` | RTC polling/bootstrap production fix | unit command above | Failed |
| `danluu/try/rtc-duplicate-table-body-revision-loss-pr` | `c7ef8332801b` | Table CRDT merge production fix | unit command above | Failed |
| `danluu/try/nav-menu-stale-save-pr` | `82c7692768c4` | Navigation entity stale-save production fix | unit command above | Failed |
| `danluu/try/stale-query-object-map-pr` | `17f5c915e932` | Query-object CRDT merge production fix | unit command above | Failed |
| `danluu/try/rtc-table-stale-snapshot-pr` | `876398df67b8` | Table/query stale snapshot production fix | unit command above | Failed |
| `danluu/fix-connection-error-large-update-pr` | `077986ffaa17` | RTC sync large-update production fix | unit command above | Failed |
| `danluu/try/rtc-undo-cross-entity-stock-repro-pr-trunk` | `e60a0cbd5d37` | RTC undo/sync entity production fix | unit command above | Failed |

Unit logs:

```text
/tmp/rtc-issue5-newer-branch-unit-valid/summary.tsv
/tmp/rtc-issue5-newer-branch-unit-valid/*.log
```

The closest newer rich-text production branch also received a Playwright-level
spot-check. I switched `/tmp/gutenberg-issue5-branch-check` to
`danluu/try/stale-rich-text-sibling-pr`, copied only the browser repro spec from
`70a64c95ea2`, built, and ran wp-env on checked-free ports `8943` and `9143`:

```bash
git switch --detach refs/remotes/danluu/try/stale-rich-text-sibling-pr
git checkout 70a64c95ea2 -- \
  test/e2e/specs/editor/collaboration/collaboration-rich-text-offset-space.spec.ts
npm run build -- --skip-types
WP_ENV_PORT=8943 WP_ENV_PHPMYADMIN_PORT=9143 npm run wp-env start
WP_ENV_PORT=8943 WP_ENV_PHPMYADMIN_PORT=9143 \
  npm run wp-env run cli -- bash -lc \
  'cp /var/www/html/wp-content/plugins/gutenberg-issue5-branch-check/packages/e2e-tests/plugins/disable-animations.php /var/www/html/wp-content/plugins/gutenberg-test-plugin-disables-the-css-animations.php'
WP_BASE_URL=http://localhost:8943 \
WP_ARTIFACTS_PATH=/tmp/rtc-issue5-newer-branch-playwright/stale-rich-text-sibling-pr/run-1 \
  npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-rich-text-offset-space.spec.ts \
  --project=chromium \
  --grep="user unitalicizes" \
  --trace=on
```

Result: failed at the same user-visible browser assertion,
`italic<em>beta</em>/em>` instead of `italic<em>beta</em>beta`.

```text
/tmp/rtc-issue5-newer-branch-playwright/stale-rich-text-sibling-pr/run.log
/tmp/rtc-issue5-newer-branch-playwright/stale-rich-text-sibling-pr/run-1/test-results/editor-collaboration-colla-e3706-cizes-part-of-an-italic-run-chromium/trace.zip
```

Conclusion from the newer-branch sweep: none of the inspected newer danluu fix
branches already fixes Issue 5. The rebased `try/offset-space-bug-pr` remains
the branch that fixes the natural Playwright repro.

Local status update on April 29, 2026:

Broken/repro branch command, run from
`/tmp/gutenberg-rich-text-playwright-repro` at `f7b9f40c72f` with
`WP_ENV_PORT=8897`, `WP_BASE_URL=http://localhost:8897`, and forced video
recording:

```bash
WP_ENV_PORT=8897 \
WP_ARTIFACTS_PATH=/tmp/rtc-rich-text-playwright-artifacts-isolated \
WP_BASE_URL=http://localhost:8897 \
  npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-rich-text-offset-space.spec.ts \
  --project=chromium \
  --grep="user unitalicizes"
```

Result: failed at the intended assertion. The author reached
`italic<em>beta</em>beta`, but the collaborator received
`italic<em>beta</em>/em>`.

Local video:

```text
/tmp/rtc-rich-text-playwright-artifacts-isolated/test-results/editor-collaboration-colla-e3706-cizes-part-of-an-italic-run-chromium/video.webm
```

Invalid #77658 PR-head command, run from
`/tmp/gutenberg-rich-text-playwright-fix` at `610e02e28b6` with the same
normal-user repro spec copied in, `WP_ENV_PORT=8898`,
`WP_BASE_URL=http://localhost:8898`, and forced video recording:

```bash
WP_ENV_PORT=8898 \
WP_ARTIFACTS_PATH=/tmp/rtc-rich-text-playwright-artifacts-fix \
WP_BASE_URL=http://localhost:8898 \
  npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-rich-text-offset-space.spec.ts \
  --project=chromium \
  --grep="user unitalicizes"
```

Initial result: failed the same way. The collaborator received
`italic<em>beta</em>/em>` instead of `italic<em>beta</em>beta`.

This result is not a valid test of #77658. The trace for this failed run shows
the browser loaded:

```text
http://localhost:8898/wp-includes/js/dist/core-data.min.js?ver=4d15c0f82a9fb01a04ed
```

That is WordPress core's script, not the Gutenberg plugin script generated from
the #77658 worktree. In a valid plugin-override run, the editor should load a
URL under `wp-content/plugins/.../build/scripts/core-data/index.js` or
`index.min.js`.

Invalid PR-head local video:

```text
/tmp/rtc-rich-text-playwright-artifacts-fix/test-results/editor-collaboration-colla-e3706-cizes-part-of-an-italic-run-chromium/video.webm
```

Clean #77658 PR-head command, run from `/tmp/gutenberg-pr77658-deep` at
`610e02e28b6` after `npm ci`, a successful `npm run build -- --skip-types`, and
verification that the served `core-data` bundle contained the #77658
verification path:

```bash
WP_ENV_PORT=8902 \
WP_ARTIFACTS_PATH=/tmp/pr77658-deep-artifacts \
WP_BASE_URL=http://localhost:8902 \
  npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-rich-text-offset-space.spec.ts \
  --project=chromium \
  --grep="user unitalicizes"
```

Result: passed. The same command with `--trace=on` also passed and wrote:

```text
/tmp/pr77658-deep-trace-artifacts/test-results/editor-collaboration-colla-e3706-cizes-part-of-an-italic-run-chromium/trace.zip
```

The passing trace shows the browser loaded:

```text
http://localhost:8902/wp-content/plugins/gutenberg-pr77658-deep/build/scripts/core-data/index.min.js?ver=603bd24d5723510ae5e6
```

That served bundle includes the #77658 `verification-text` guard and
`diffWithCursor()` path. The earlier failed trace did not load this plugin
bundle, so the discrepancy was a local build/asset-registration problem, not a
remaining bug in #77658's rich-text offset fix.

Annotated side-by-side video with a running log:

```text
/tmp/rtc-rich-text-annotated-video/rtc-rich-text-annotated-repro.mp4
```

The annotated video was generated from a fresh natural Playwright run in
`/tmp/gutenberg-rich-text-annotated-video` at `f7b9f40c72f`. It shows the author
editor and collaborator editor at the same time, with cumulative log entries and
the block HTML read by Playwright. The final frame shows the author at
`italic<em>beta</em>beta` and the collaborator at
`italic<em>beta</em>/em>`.

The invalid failing run reported a build failure before the browser test. That
left the wp-env instance using WordPress core's `core-data` package rather than
the #77658 Gutenberg plugin package. The clean rerun used a dependency install
from the PR-head lockfile and a successful build before starting wp-env.

The first Playwright test in that file uses `editEntityRecord()` from
`page.evaluate()`. I do not count that as a valid handoff-level Playwright repro
because this handoff requires normal user actions.

## Failure mechanism

The failing path is:

1. The editor produces a `WPBlockSelection.offset` in rich-text text space.
2. `applyPostChangesToCRDTDoc()` forwards
   `changes.selection?.selectionStart?.offset ?? null`.
3. `mergeCrdtBlocks()` recursively passes that bare number to rich-text merges.
4. `mergeRichTextUpdate()` builds two HTML-string-backed Deltas and calls
   `Delta.diffWithCursor()`.
5. `Delta.diffWithCursor()` interprets the cursor as an index into the HTML
   string, not as a visible rich-text text offset.
6. In formatted content, the wrong cursor can land inside markup such as
   `</strong>`, so the cursor-guided diff emits a delta that produces malformed
   HTML while still being a valid Yjs text operation.

[#77658](https://github.com/WordPress/gutenberg/pull/77658) fixes both parts of
the contract violation: it keeps the cursor scoped to the selected block and
attribute, and converts the rich-text offset to the HTML index only when merging
that exact field. Its verification guard also prevents a bad cursor-guided delta
from being applied if the candidate result does not equal the requested updated
HTML.

## How this was introduced

The direct introduction point is
[PR #73699](https://github.com/WordPress/gutenberg/pull/73699), commit
`30c040ca841` (`Real-time collaboration: Use alternative diff in quill-delta,
provide incremental text updates`) on January 14, 2026. That change replaced
coarse rich-text replacement with cursor-guided incremental diffs and introduced
the block merge handoff that forwarded a bare selection offset.

[PR #76418](https://github.com/WordPress/gutenberg/pull/76418), commit
`848188b4f12` (`RTC: Fix cursor index sync with rich text formatting`) on
March 17, 2026, is relevant because it added the rich-text/HTML offset
conversion helpers used by other RTC selection paths. It did not update the
block merge write path.

[PR #76913](https://github.com/WordPress/gutenberg/pull/76913), commit
`09a21c64b5b` (`RTC: Fix core/table cell merging`) on April 2, 2026, later
extended the same cursor plumbing into schema-aware nested object and array
merges. That widened the area where a bare cursor could be misapplied, including
nested rich-text fields, but the top-level corruption bug already existed after
[#73699](https://github.com/WordPress/gutenberg/pull/73699).

## Initial fix plan

1. Treat #77658 as the Issue 5 fix candidate; it passes the normal-user
   Playwright repro when the browser loads the plugin bundle generated from the
   PR branch.
2. Keep cursor information as a scoped descriptor:
   `clientId`, `attributeKey`, and editor-space rich-text offset.
3. Convert with `richTextOffsetToHtmlIndex()` only when the merge reaches the
   matching block client ID and rich-text attribute.
4. Pass `null` to unrelated rich-text merges.
5. Keep the candidate-delta verification guard so malformed cursor hints fall
   back to a normal diff instead of corrupting shared content.
6. Keep #77662 or equivalent regression coverage for the cursor-scope variant.
7. Add an explicit test-handoff guard for browser repro runs: verify the trace or
   served script URL points at `wp-content/plugins/.../build/scripts/core-data/`
   before interpreting a Playwright result as a #77658 result.
8. Update the fuzz oracle to tolerate expected `__unstableSyncId` metadata, then
   rerun Issue 5 representative seeds against the combined known-fixes branch.

## Fix plan audit

### Linus Torvalds lens

The invariant should be simple: a cursor offset must never be passed across an
API boundary without its coordinate space and target field. A bare `number` is
the wrong data structure. The fix should remove that bad API shape rather than
adding special cases for `strong`, `em`, or particular fuzzer strings.

The delta verification guard is good as a postcondition, but it must not become
the primary correctness model. The primary fix is preserving and converting the
right cursor.

### Kyle Kingsbury / Jepsen lens

The important history property is operation preservation: a local edit should
converge to the exact editor-produced HTML string, and a remote peer should not
observe an acknowledged local rich-text edit as a different malformed value.
Convergence to the same corrupted string is still data loss.

Tests should check both the local post-merge value and collaborator-observed
value. They should include the history where the CRDT `blocks` tree is already
seeded, because first-edit initialization can otherwise mask the merge path.

### Dan Luu lens

The production risk is not one seed. It is any interleaving where formatted
content and a stale or wrongly scoped cursor meet the recursive block merge
machinery. Debuggability improves if the merge code preserves cursor scope and
if failed delta verification can be counted or logged in development builds.

The Playwright test must use real editor interactions. Browser tests that call
`editEntityRecord()` are useful probes, but they do not prove user reachability.
The normal-user `End`/`Backspace`/selection/Italic repro is the one to keep for
handoff proof.

## Revised fix plan

1. #77658 is sufficient for Issue 5's rich-text closing-tag corruption mechanism
   based on the clean source, bundle, unit, and natural Playwright checks.
2. Keep the merge API typed so call sites cannot pass an unscoped cursor number
   except through a clearly legacy/internal compatibility path.
3. Preserve the exact-result delta verification guard, but treat guard fallback
   events as signals to add tests rather than as normal behavior.
4. Merge #77662's cursor-scope regression tests or fold equivalent tests into
   #77658 before landing.
5. Add a small natural Playwright suite that covers the user-action offset-space
   repro and one cursor-scope repro, while avoiding direct store mutation for the
   reproduction action.
6. For every browser repro validation, record the loaded `core-data` script URL
   or grep the served bundle for the #77658 guard. A failed run that loads
   `wp-includes/js/dist/core-data.min.js` is a setup failure for this PR, not a
   product failure.
7. Fix the fuzz expected-state normalization for `__unstableSyncId`, then rerun
   seeds `2`, `3`, `8`, `17`, `18`, `25`, `30`, and `35` on the combined
   known-fixes branch.
8. After merge, rerun the Issue 5 fuzzer command on `origin/trunk`; do not mark
   this issue closed until the natural Playwright repro passes on the fix and
   fails on a pre-fix tests-only base.

## Open questions

-   Should the delta verification fallback produce a development-only warning or
    metric so future cursor-space bugs are visible before fuzzing finds them?
-   Should `mergeRichTextUpdate()` reject cursor hints that are known editor-space
    objects, forcing callers to resolve scope and coordinate conversion earlier?
-   Should the Issue 5 fuzzer canonicalizer strip internal sync IDs, or should
    `__unstableSyncId` be made explicit in expected outputs for query arrays and
    nested objects?
