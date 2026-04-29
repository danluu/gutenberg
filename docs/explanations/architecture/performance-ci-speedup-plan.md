# Performance CI speedup plan

## Summary

The current branch carries the CI fix from
[WordPress/gutenberg#77726](https://github.com/WordPress/gutenberg/pull/77726).
It replaces the Site Editor helper's "wait for the loader to become visible"
sequence with a readiness predicate that accepts either a visible loader or an
already-ready canvas, then waits until the loader is gone and the canvas is
ready.

The performance job was not slow because the Site Editor suddenly became tens
of minutes slower. It was slow because the test helper could miss a short-lived
loader and then spend the full timeout waiting for that loader to become
visible. The Site Editor performance tests call that helper repeatedly, so a
single missed loader can turn into many minutes of artificial CI time.

## What is going on

The performance workflow in `.github/workflows/performance.yml` has a 60 minute
job timeout. The runner delegates to `./bin/plugin/cli.js perf`, implemented in
`bin/plugin/commands/performance.js`. That command does expensive work by
design:

- It fetches each compared branch.
- It creates one test-runner checkout and a built plugin checkout for each
  compared branch.
- It runs `npm ci` and `npm run build` for the test runner and for every branch
  environment.
- It discovers every file under `test/performance/specs`.
- For each suite, round, and branch, it starts `wp-env`, runs the suite, and
  stops `wp-env`.

That structure gives stable comparisons because the same test code drives each
branch, and each branch gets its own WordPress environment. It also means fixed
per-navigation delays are multiplied by the number of samples and by the number
of compared branches.

The sharp regression was in `visitSiteEditor()` in
`packages/e2e-test-utils-playwright/src/admin/visit-site-editor.ts`. The older
helper did this for routes expected to load the Site Editor canvas:

1. Visit `site-editor.php`.
2. Set Site Editor preferences.
3. Wait for `.edit-site-canvas-loader, .edit-site-canvas-spinner` to become
   visible, with a long timeout.
4. Wait for the loader to become hidden.
5. If that failed, fall back to waiting for the editor content region.

The fallback comment said that, if the canvas loader had already disappeared,
the helper should skip the wait. In practice the helper could not know that
until after the "visible" wait had already consumed the timeout.

That is especially expensive in `test/performance/specs/site-editor.spec.js`.
The loading case uses a large 371 KB fixture and repeats the load 11 times per
branch: 10 samples plus one throwaway. The same file also uses
`visitSiteEditor()` for typing, pattern-loading, and page-loading cases. The
loading metric maps `metrics.getLoadingDurations().timeSinceResponseEnd` to
`firstBlock`; `timeSinceResponseEnd` is `performance.now() - responseEnd`, so
an artificial helper delay is counted as a large `firstBlock` result even when
the first block was already rendered.

The history explains why this was latent:

- `d301cf7d5152` / #61629 added a loader wait to avoid resolving the helper
  before large canvas content finished loading.
- `7e24ae4f91ee` / #61816 limited that wait to Site Editor routes that should
  load the canvas.
- `ad4da873ce4` / #68534 moved preference writes before the loader wait, which
  made the helper start observing later in the page lifecycle.
- `4085555f8ac` / #68667 made a missed loader a fallback path, but only after
  waiting up to 60 seconds for the loader to become visible.
- `1ba1a21c3cc` / #77725 mitigated the current CI pain by lowering the visible
  wait from 60 seconds to 3 seconds.
- #77726 removes the successful-case 3 second penalty by waiting on a combined
  canvas state instead of requiring the loader to appear.

The important distinction is that the loader is an observation mechanism, not
the thing the tests are trying to cover. The coverage target is that
`visitSiteEditor()` returns only after the editor canvas is usable and the
loading overlay is gone.

## Initial fix plan

1. Keep the #77726 helper change as the immediate CI fix.
2. Keep the 60 second "loaded" timeout for legitimately slow large entities.
3. Do not reduce Site Editor performance sample counts.
4. Do not skip performance suites, increase retries, or mark tests flaky.
5. Do not parallelize performance suites just to save wall clock, because that
   would add CPU and database contention to the metrics.
6. Consider a later harness optimization that reduces repeated environment
   start/stop cost, but only after measuring setup time separately from test
   time.

## Audit

### Linus Torvalds-style maintainer audit

The initial plan fixes the bad helper behavior, but it is too comfortable with
"consider a later optimization." If the helper is a state machine, say what the
states are and make the failure mode explicit. The old code was wrong because
it encoded a race in control flow and hid it under `catch`. The new code is
better because it tests the page state directly, but the plan should call out
the invariant: the helper must not require seeing a transient loader edge.

The plan also needs to reject clever broad changes. Do not rewrite the
performance runner, build system, and test helper in one patch. A small,
obviously correct helper fix is easier to review and easier to revert than a
large CI refactor.

### Kyle Kingsbury / Jepsen-style audit

This is an observation race. The helper was waiting for an event edge that had
already happened. In distributed-systems terms, it was treating a missed
message as proof that the system was still not ready, then timing out and
declaring success through a fallback. That is not a reliable readiness protocol.

The plan should prefer monotonic state over transient events. "A visible loader
exists" is useful only while it is true. "A ready canvas exists and no visible
loader is present" is closer to the desired stable state. The plan should also
account for old and new Site Editor UIs, iframe and non-iframe canvases, and the
case where the iframe exists but is not fully loaded.

Do not treat shorter sleeps as correctness. #77725 is a practical mitigation,
but a 3 second visible wait still encodes timing. It reduces blast radius, but
it does not remove the race.

### Dan Luu-style systems and measurement audit

The initial plan needs more measurement discipline. A CI job timeout is not the
same as a product performance regression. The evidence should separate:

- server time from browser/client time,
- test helper wall time from measured editor work,
- fixed setup/build cost from per-suite execution time,
- one-off runner noise from repeated-sample behavior.

The plan must avoid "speedups" that improve CI wall clock by damaging the
experiment. Reducing samples, dropping suites, running branches under different
resource contention, or adding retries would make the job look better while
making the data worse. The right speedup removes known artificial waiting and
then measures any runner-level changes separately.

## Revised fix plan

### Phase 1: land the narrow correctness fix

Use the #77726 helper semantics:

- Wait for `loading-or-ready`: either the loader is visibly active, or the
  ready canvas state is already present.
- Then wait for `loaded`: no visible loader and a ready canvas.
- Treat iframe readiness as part of canvas readiness by requiring iframe
  `contentDocument.readyState === 'complete'`.
- Preserve support for the historical spinner selector and the current canvas
  loader selector.
- Preserve the large-entity timeout for the final loaded state.

This removes the missed-loader race without reducing coverage, reducing sample
counts, adding retries, or asserting that the editor is ready before the canvas
can actually be used.

### Phase 2: validate without weakening the tests

Before merging a follow-up that changes the performance harness itself, collect
separate timings for:

- performance-command setup,
- dependency installation,
- build time per branch,
- `wp-env start` and `wp-env stop`,
- each test suite's Playwright runtime,
- each `visitSiteEditor()` wait branch: saw loader, skipped to ready canvas, or
  timed out.

Those timings should be attached as CI artifacts or emitted in the workflow
summary. They should not feed into the performance metrics reported to
CodeVitals.

### Phase 3: only optimize the runner where isolation is preserved

Potential safe follow-ups:

- Keep all suites and samples, but report setup/build/runtime components so
  future timeouts are diagnosable.
- If `wp-env` start/stop dominates, prototype running multiple suites per
  branch start only if the prototype can reset WordPress state between suites
  as strongly as the current model.
- If dependency installation dominates, investigate cache improvements that do
  not share `node_modules` across branches with different lockfiles.
- Keep branch comparisons serial unless there is a dedicated, isolated runner
  per branch; parallelizing compared branches on the same machine would distort
  the metrics.

Rejected shortcuts:

- Do not lower `samples` or remove the throwaway iteration.
- Do not skip Site Editor loading, typing, pattern, or pages cases.
- Do not add Playwright retries to hide timing bugs.
- Do not replace readiness checks with fixed sleeps.
- Do not remove the large-post fixture, since it is the path that exposed the
  regression and is the kind of workload the benchmark is supposed to protect.

### Phase 4: make the readiness contract explicit

The durable product-side fix is to expose a stable Site Editor readiness signal
instead of making tests infer readiness from implementation details like loader
classes. A future UI change should be able to replace the visual loader without
breaking test readiness. Until that exists, `visitSiteEditor()` should keep the
readiness predicate small, explicit, and tied to user-observable usability:
canvas present, iframe loaded when iframed, and overlay absent.
