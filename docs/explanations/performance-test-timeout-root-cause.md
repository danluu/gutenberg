# Site Editor Performance Timeout Root Cause

## Summary

The performance job is not timing out because the Site Editor test suite or the
Site Editor itself became 20+ minutes slower. It is timing out because the
`visitSiteEditor()` Playwright helper can wait a full 60 seconds for a canvas
loader that has already appeared and disappeared.

The direct trigger was #77443. That PR did not change Site Editor loading code,
the performance spec, or the `visitSiteEditor()` helper. It changed runtime
timing enough to expose an existing race in the helper.

The latent helper bug came from the sequence of earlier helper changes, most
importantly #68667. #68667 made a missed loader a successful fallback path, but
only after spending the full 60 second timeout waiting for the loader to become
visible.

Once #77443 was on trunk, PR performance jobs compared two branches that both
contained the timing trigger. The Site Editor loading test calls
`visitSiteEditor()` 11 times per branch, so one artificial 60 second wait per
iteration adds about 22 minutes to a full PR performance run.

## Relevant PRs and commits

- #61629 / `d301cf7d5152`: added a Site Editor canvas loader wait to avoid
  resolving `visitSiteEditor()` before large canvas content finished loading.
- #61816 / `7e24ae4f91ee`: limited that wait to Site Editor routes that are
  expected to load the canvas. The PR description says the previous behavior
  added about 2 minutes to each affected performance test.
- #68534 / `ad4da873ce4`: moved `setPreferences()` before the loader wait. This
  made the helper start waiting for the loader later in the page lifecycle.
- #68667 / `4085555f8ac`: added the important latent bug. The helper tries to
  wait for `.edit-site-canvas-loader, .edit-site-canvas-spinner` to become
  visible with a 60 second timeout, catches the timeout, and then waits for the
  editor content region. If the loader was already gone, the helper succeeds
  after wasting 60 seconds.
- #76969 / `309dfc2e885`: changed `catch ( error )` to `catch {}`. This was
  mechanical and did not change behavior.
- #77443 / `0f99b8a8044`: rebuilt the Experiments screen. This is the PR that
  changed timing enough for performance CI to hit the existing helper race.

## What the helper does

On trunk before the fix, `visitSiteEditor()` contains this sequence:

```js
await this.visitAdminPage( 'site-editor.php', query.toString() );

if ( ! options.showWelcomeGuide ) {
	await this.editor.setPreferences( 'core/edit-site', {
		welcomeGuide: false,
		welcomeGuideStyles: false,
		welcomeGuidePage: false,
		welcomeGuideTemplate: false,
	} );
}

if ( ! query.size || postId || canvas === 'edit' ) {
	const canvasLoader = this.page.locator(
		'.edit-site-canvas-loader, .edit-site-canvas-spinner'
	);

	try {
		await canvasLoader.waitFor( { state: 'visible', timeout: 60_000 } );
		await canvasLoader.waitFor( {
			state: 'hidden',
			timeout: 60_000,
		} );
	} catch {
		await this.page
			.getByRole( 'region', { name: 'Editor content' } )
			.waitFor();
	}
}
```

The catch block comment says "If the canvas loader is already disappeared, skip
the waiting", but the implementation cannot know that until after
`canvasLoader.waitFor( { state: 'visible', timeout: 60_000 } )` has already
timed out.

The Site Editor performance loading test hits this path 11 times per branch:

```js
const samples = 10;
const throwaway = 1;
const iterations = samples + throwaway;

await admin.visitSiteEditor( {
	postId: draftId,
	postType: 'page',
	canvas: 'edit',
} );
```

The test then records `results.firstBlock` from
`metrics.getLoadingDurations().timeSinceResponseEnd`, which is
`performance.now() - responseEnd`. That means the helper's 60 second wait is
included in the `firstBlock` metric even if the first block was already present.

## Evidence from CI

The #77443 performance run compared the PR merge commit
`cf45676490ae3900632a512f6deaa9ab259e2d54` against trunk and still finished,
but it was close to the 60 minute workflow limit. Its Site Editor summary showed
a signature 60 second `firstBlock` value on the PR side while server-side work
was normal:

```text
site-editor firstBlock:
  cf45676490ae3900632a512f6deaa9ab259e2d54: 65353.75 ms
  trunk:                                    4077.75 ms
  change:                                  1502.69%

site-editor wpTotal:
  cf45676490ae3900632a512f6deaa9ab259e2d54: 420.25 ms
  trunk:                                    418.41 ms

site-editor wpDbQueries:
  cf45676490ae3900632a512f6deaa9ab259e2d54: 52
  trunk:                                    52
```

That rules out a PHP/server/DB slowdown as the main cause of the 60 second
number.

After #77443 landed, later PRs compared PR branches against trunk where both
sides had the timing trigger. For example, the #77675 performance run was
canceled at the 60 minute job timeout while running the second Site Editor
branch:

```text
23:52:49 site-editor PR branch starts running tests
00:08:06 site-editor PR branch finishes running tests
00:08:26 site-editor trunk branch starts running tests
00:18:17 job canceled at the 60 minute workflow timeout
```

That is consistent with roughly 11 minutes of artificial loader-wait delay per
branch, plus normal setup/build/test time.

## Local reproduction and double-check

I reproduced the behavior with the actual performance test path, not a reduced
direct `page.goto()` probe. With instrumentation added around the old
`visitSiteEditor()` helper on #77443's PR merge commit, the page was already
loaded before the 60 second wait started:

```text
after_visit_admin_page:
  wallMs=1804
  sinceResponseEnd=1530
  loaderPresent=false
  editorRegion=true
  iframePresent=true
  iframeBlocks=1437

after_set_preferences:
  wallMs=1884
  sinceResponseEnd=1662
  loaderPresent=false
  editorRegion=true
  iframeBlocks=1437

before_loader_visible_wait:
  wallMs=1894
  sinceResponseEnd=1685
  loaderPresent=false
  editorRegion=true
  iframeBlocks=1437

loader_wait_catch:
  wallMs=61934
  sinceResponseEnd=61723
  waitError="TimeoutError: locator.waitFor: Timeout 60000ms exceeded."
  iframeBlocks=1437

reported firstBlock=61807ms
```

This answers the important question directly: yes, the content was present
before 60 seconds. The iframe already contained 1437 blocks before the helper
started the 60 second loader-visible wait.

I then ran the same instrumented path on the pre-#77443 base commit
`90e45267257fc4a4da0095933ecc24fa3bae776d`. There the loader was still present
when the helper started waiting, so the 60 second timeout was not hit:

```text
after_visit_admin_page:
  wallMs=739
  sinceResponseEnd=513
  loaderPresent=true
  editorRegion=false
  iframePresent=false

before_loader_visible_wait:
  wallMs=755
  sinceResponseEnd=531
  loaderPresent=true

after_loader_visible_wait:
  wallMs=841

after_loader_hidden_wait:
  wallMs=1020

reported firstBlock=1306.7ms
```

This isolates the behavior change to #77443's merge comparison: the helper code
was the same, but the loader was missed after #77443 and not missed before it.

## Why #77443 is the trigger but not the actual slowdown

The #77443 diff changes the Experiments screen and related settings plumbing:

```text
lib/experimental/experiments/load.php
lib/experiments-page.php
lib/init.php
lib/load.php
package-lock.json
package.json
packages/e2e-test-utils-playwright/src/request-utils/gutenberg-experiments.ts
routes/experiments-home/api.ts
routes/experiments-home/package.json
routes/experiments-home/route.ts
routes/experiments-home/stage.tsx
routes/experiments-home/style.scss
```

It does not change these Site Editor or performance-test files:

```text
packages/edit-site
packages/e2e-test-utils-playwright/src/admin/visit-site-editor.ts
test/performance/specs/site-editor.spec.js
packages/scripts/config/playwright.config.js
test/performance/playwright.config.ts
```

So the correct interpretation is:

1. #68667 left a race in `visitSiteEditor()`: a missed loader costs 60 seconds
   and then still succeeds.
2. #77443 changed page/runtime timing enough that, in performance CI, the
   loader was already gone by the time `visitSiteEditor()` started waiting for
   it to become visible.
3. The performance harness records the helper delay as `firstBlock`.
4. Once #77443 was on trunk, both compared branches hit the same delay, pushing
   the job past the workflow's 60 minute timeout.

## Fix direction

The helper should not require the loader to appear. It should wait for either:

- the loader to be present, or
- a ready editor/canvas state that proves the loader has already come and gone.

Then it should verify the loader is absent and the editor content/canvas is
ready. That preserves the intent of #61629 and #61816, while avoiding the
60-second penalty introduced by the fallback behavior from #68667.
