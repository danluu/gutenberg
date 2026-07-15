# Gutenberg #80262 natural reproduction

## Result

This branch now has a real, persistent, **localhost-only Playwright
reproduction** of
[Gutenberg #80262](https://github.com/WordPress/gutenberg/issues/80262). It
self-hosts the official browser Playground distribution and a local Gutenberg
ZIP, starts both WordPress and the browser from local files, and blocks all
non-loopback browser DNS. It never connects to `playground.wordpress.net` or
another remote Playground at runtime.

The reduced reproduction follows the
[updated issue comment](https://github.com/WordPress/gutenberg/issues/80262#issuecomment-4983397095):
the manual attempt took long enough that the blank preview and exception had
already appeared by the time the user reached **Design > Identity**. The
responsive Title edit, Dusk variation, Review changes dialog, and Save step in
the original report are therefore not trigger conditions.

The local Playwright sequence is deliberately small:

1. Start a fresh, headless local Playground and enter the Site Editor using
   its visible controls.
2. If a full template editor opens, click **Open Navigation**, followed by
   **Back** or **Go to Site Editor** as presented, until the root **Design**
   screen is visible.
3. Confirm that the Design preview iframe is populated and that the local
   Playground service worker is running.
4. Disconnect every Playwright/CDP process for 45 seconds. Chrome and the tab
   remain running, with no debugger keeping the worker alive.
5. Reconnect after Chrome has naturally retired the worker, and click the
   visible **Identity** control with trusted Playwright mouse input.
6. Observe the Identity heading and a persistently blank preview five seconds
   later.

No step stops or updates a service worker, intercepts a request, changes the
DOM, mocks a browser property, mutates a Gutenberg store, or invokes a Site
Editor action through JavaScript. JavaScript instrumentation is passive: it
records errors and reads the iframe state without causing the failure.

The qualifying local run started with a healthy Design iframe, observed the
service worker present before idle and naturally absent after idle, then
received `wp-includes/empty.html` from the restarted worker without a
`Document-Isolation-Policy` header. Five seconds after the trusted Identity
click, the iframe was still connected but `contentDocument` was null. The
local run also captured the reporter's exact exception from the same
production asset and location:

```text
TypeError: Cannot destructure property 'documentElement' of 'N' as it is null.
    at HTMLIFrameElement.I (.../block-editor/index.min.js?ver=4b2c4bdfdd0eedf5e84b:122:927)
```

The Playwright test intentionally asserts the healthy behavior, so it fails
when the local run reproduces the bug. This meets the substance of
[Alec's reproduction criteria](https://github.com/WordPress/gutenberg/issues/77716#issuecomment-4464309206):
the human steps are stated, the checked-in end-to-end test fails on the bug,
the precondition is explicit, and the test records both the visible failure
and its service-worker/network/exception evidence.

## Earlier hosted evidence

The checked-in video and screenshot predate the localhost-only test. They are
retained because they show the complete interaction and annotations, but they
are no longer required to execute the reproduction.

The screenshot in [`issue-80262-natural-blank.png`](./issue-80262-natural-blank.png)
was taken five seconds after the canonical **Identity** click.
[`issue-80262-natural-repro-annotated.mp4`](./issue-80262-natural-repro-annotated.mp4)
is the complete annotated fresh-profile run. Its 1.0x timeline includes setup,
the healthy baseline, the entire 45.023-second interval with all automation
clients disconnected, and the post-idle **Open Navigation > Back > Styles**
route. A persistent panel reports every mouse move/down/up with root screenshot
coordinates, states that no keyboard input occurred, and logs the worker,
network, exception, and canvas observations. The final two seconds hold the
last evidence frame only for readability.

The sidecar
[`issue-80262-natural-repro-annotated-timeline.json`](./issue-80262-natural-repro-annotated-timeline.json)
contains the source events, screenshot hashes, render segments, evidence
checks, and MP4 hash. The video shows the route-transition iframe initially
absent 36 ms after the Styles click, then the newly mounted iframe connected
with `contentDocument === null` at +1.002 seconds and still null at +5.001
seconds. It also distinguishes the advancing hosted asset hash from the stable
exception path, text, and `:122:927` location.

The older
[`issue-80262-natural-repro.mp4`](./issue-80262-natural-repro.mp4) preserves
5.711 seconds of the reduced post-idle interaction, including 5.083 seconds of
the blank Styles canvas. It begins only after the disconnected idle period, so
the annotated video supersedes it as the complete evidence record.

## Manual localhost reproduction

Use a self-hosted browser Playground built from the official
[host-your-own-Playground instructions](https://wordpress.github.io/wordpress-playground/developers/architecture/host-your-own-playground/),
a local Gutenberg plugin ZIP, and a fresh Chrome profile. Configure the
blueprint with `networking: false`; do not use Playground's `trunk` or
`nightly` WordPress aliases because those aliases fetch a remote WordPress
build. The checked-in test uses Playground's bundled `beta` WordPress build,
PHP 8.2, Twenty Twenty-Five, and the local Gutenberg ZIP.

Keep DevTools closed until after the failure. An attached debugger can keep a
service worker alive and hide the required lifecycle transition.

1. Open the self-hosted Playground's loopback URL in a fresh Chrome profile
   and wait for WordPress to finish loading.
2. If WordPress is not already showing the Site Editor, click **Site Editor**
   (or **Edit site**) in the black admin bar at the top.
3. Reach the root Design screen. If a full template editor is open, click the
   **Open Navigation** left-arrow button in the editor's upper-left corner. If
   the next screen is the Templates list rather than the Design root, click
   the upper-left **Go to Site Editor** button. Some versions label that
   intermediate control **Back**. Repeat only until the left navigation shows
   **Design** choices such as **Identity**, **Navigation**, **Styles**, and
   **Pages**.
4. Confirm that the large site preview on the right is visibly populated.
5. Leave the tab completely untouched for at least 45 seconds.
6. In the left Design navigation, click **Identity**. The Identity heading
   appears, but its large preview remains blank. Open DevTools only now to
   inspect the exception.

This is what “go to the Blog Home template editor” meant in the original,
longer report: from **Design > Identity**, click **Edit** above the site
preview, or use **Design > Templates > Blog Home > Edit**. Neither route nor
editing the Blog Home Query Loop is needed by the reduced reproduction.

### Historical longer hosted route

The following preserves the original reporter-like route for comparison. It
is not needed by the localhost-only test.

Use Chrome 137 or newer. Keep DevTools closed until after the failure; an
attached debugger can keep a service worker alive and hide the precondition.

1. Open
   `https://playground.wordpress.net/?wp=trunk&gutenberg-branch=trunk` in a
   fresh browser profile and wait for the WordPress site to finish loading.
2. In the black WordPress admin bar across the top of the page, click **Site
   Editor** (some WordPress versions label this link **Edit site**). Depending
   on the current Site Editor state, this opens either the Design navigation
   or a full template editor.
3. Follow the reporter's route to the Design navigation. If a full template
   editor opened, click **Open Navigation**—the left-facing arrow in the
   editor's upper-left corner—to leave that editor. In the left-hand
   navigation, under **Design**, click **Identity**. The main content area
   changes to the Identity screen, with a large site preview on the right.
4. In that preview pane, click the **Edit** button above the preview. This
   opens the template used to render the posts homepage. Confirm that the
   center of the editor's top bar says **Blog Home · Template**; that label
   means the Blog Home template editor is open.

    There are two quicker ways to reach the same editor: the **Site Editor**
    admin-bar link may open it directly, or you can use **Design > Templates >
    Blog Home**, select **Blog Home**, and click **Edit**. In either case,
    confirm the **Blog Home · Template** label. The canonical reproduction used
    the Identity-preview route above because it matches the reporter's flow.

5. After the full template editor opens, go to its upper-left toolbar. Click
   **Document Overview**—the button with three staggered horizontal lines,
   immediately to the right of Undo and Redo. In the panel that opens, choose
   **List View** if it is not already active, then click the **Query Loop** row.
   This selects the parent block around the repeating posts. In the block
   toolbar above the selected content, click **Edit pattern**.
6. In the editor top bar, open **View**, choose **Mobile**, and enable
   **Responsive styles**. In the canvas, click the first post's **Title**
   block—the post heading such as “Hello world!”, not the website title. In
   the settings sidebar's **Font size** control, choose **Medium**, then click
   **Exit pattern**. The reporter chose a different responsive font size; the
   exact new size is not important to the trigger.
7. Open **Styles > Browse styles** and select **Dusk**.
8. Click **Review 2 changes**. Confirm that **Blog Home**, **Custom Styles**,
   and **Typography styles** are listed.
9. Leave the Review changes dialog open and the tab untouched for at least 45
   seconds.
10. Click **Save**, wait for **Saved**, and immediately click **Identity**.
11. The right-hand preview remains blank. Open DevTools now to see the exception
    above.

The 45-second pause is not a synthetic race injection. It lets Chrome perform
its normal idle service-worker lifecycle, just as it does in a browser with no
debugger attached. The responsive edit and save reproduce the reporter's
surface path, but they are not necessary: a reduced **loaded canvas -> 45
seconds idle -> Open Navigation -> Styles** sequence reproduced in every
completed fresh-profile attempt as well.

## Runnable failing repro

The primary repro is
[`issue-80262-local-playground-repro.cjs`](./issue-80262-local-playground-repro.cjs),
with the regression assertion in
[`issue-80262-local-playground.spec.js`](./issue-80262-local-playground.spec.js)
and its isolated
[`issue-80262-local-playground.config.cjs`](./issue-80262-local-playground.config.cjs).
It needs two inputs already present on disk:

-   the root of a built self-hosted Playground web distribution, containing
    at least `index.html` and `sw.js`; and
-   a locally built Gutenberg plugin ZIP. In this repository,
    `NO_CHECKS=1 npm run build:plugin-zip` writes `gutenberg.zip` at the
    repository root.

Run the standalone helper from the Gutenberg repository root:

```bash
LOCAL_PLAYGROUND_DIST=/absolute/path/to/wasm-wordpress-net \
LOCAL_GUTENBERG_ZIP=/absolute/path/to/gutenberg.zip \
node test/e2e/specs/site-editor/issue-80262-local-playground-repro.cjs
```

Or run the checked-in Playwright regression test:

```bash
LOCAL_PLAYGROUND_DIST=/absolute/path/to/wasm-wordpress-net \
LOCAL_GUTENBERG_ZIP=/absolute/path/to/gutenberg.zip \
npx playwright test \
    --config=test/e2e/specs/site-editor/issue-80262-local-playground.config.cjs
```

The helper starts an ephemeral static server bound to `127.0.0.1`, serves the
Playground distribution, blueprint, and Gutenberg ZIP itself, and launches
raw headless Chromium. Chrome's host resolver maps every non-loopback host to
`NOTFOUND`. The result is rejected if any unexpected external request is
attempted or any external request receives a successful response. The helper
therefore cannot silently fall back to the hosted Playground.

Each automation phase is a separate short-lived Node process. The first uses
Playwright to perform visible setup clicks and verify the healthy baseline,
then exits without closing Chrome. No Playwright driver or CDP socket exists
during the 45-second idle. A second process reconnects and performs the
visible **Identity** click. `locator.click()` produces browser-trusted pointer
input; the test does not call Gutenberg actions or invoke the control's DOM
handler.

The standalone helper exits 1 for a successful reproduction, 0 when the
canvas remains healthy, and 2 when a precondition is inconclusive. The
Playwright wrapper asserts the healthy result and therefore fails on an
affected build. Large fresh profiles and run artifacts are deleted on normal
completion, timeout, interruption, and process signals. Set `KEEP_ARTIFACTS=1`
only when a `result.json` and failure screenshot are needed.

### Historical hosted helper

`issue-80262-playground-lifecycle-repro.cjs` launches the repository's bundled
Chrome for Testing in headless mode, performs normal UI clicks, disconnects
every automation/CDP client for the 45-second idle interval, and reconnects
only after Chrome has naturally retired the Playground service worker. It then
uses trusted mouse input for **Open Navigation > Styles** and checks all of the
following:

-   the Playground service worker existed before the idle interval;
-   it was naturally absent afterward;
-   the restarted worker served `wp-includes/empty.html` with HTTP 200 but no
    `Document-Isolation-Policy` header;
-   the exact `documentElement` exception occurred at the stable block-editor
    asset path and `:122:927` location;
-   the editor iframe was still blank with `contentDocument === null` five
    seconds later.

Run the standalone probe from the repository root:

```bash
node test/e2e/specs/site-editor/issue-80262-playground-lifecycle-repro.cjs
```

The final checked-in helper was verified with Chrome 150 by setting
`CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`.
The environment override is optional; without it, the helper uses the
repository's bundled Chrome for Testing.

Because hosted `trunk` advances, the helper reports the observed
`assetVersion` separately from `matchesReporterAssetVersion`. The historical
reporter and canonical runs used `ae8f14e90632f9e1151b`; the qualifying oracle
uses the stable block-editor asset path, exact exception message, and
`:122:927` source location rather than requiring that historical build hash.

It intentionally exits 1 when current trunk reproduces the bug, exits 0 when
the canvas stays healthy, and exits 2 when a precondition is inconclusive. It
prints the temporary artifact directory containing `result.json` and
`repro.log`; a qualifying reproduction also contains a screenshot. Its large
fresh Chrome profile is deleted during normal, inconclusive, timeout, and
signal cleanup. Optional environment variables are `CHROME_PATH`,
`PLAYGROUND_URL`, `IDLE_MS`, `RUN_TIMEOUT_MS`, and `ARTIFACT_DIR`.

The associated Playwright wrapper is runnable with:

```bash
npx playwright test \
    test/e2e/specs/site-editor/issue-80262-playground-lifecycle.spec.js \
    --workers=1
```

The wrapper deliberately does not request Playwright's browser or page
fixtures. It invokes the raw-browser probe and asserts the healthy behavior, so
it fails against the affected hosted trunk. A normal continuously attached
Playwright page suppresses the lifecycle being tested.

### Hosted-helper automation disclosure

The setup and post-idle observations use Puppeteer/CDP, but the interaction is
browser-trusted mouse input at the center of visible controls. JavaScript is
used only to locate visible controls and inspect the final iframe. During the
idle interval the Puppeteer connection and the target session are both closed;
the Chrome process and user-visible tab remain alive. The probe never attaches
to the service-worker target.

## Repetition and environment

Every local helper run used a new browser profile and deleted it afterward.
The first three completed executions of the final localhost-only helper all
qualified, including the standalone helper, the kept-evidence run, and the
Playwright wrapper. The kept-evidence run took 58.2 seconds and passed every
recorded check:

| Flow                          | Environment                                    | Result                |
| ----------------------------- | ---------------------------------------------- | --------------------- |
| Local Design idle -> Identity | Self-hosted Playground, Chrome for Testing 145 | 3/3 persistent blanks |

In the kept-evidence run, the healthy pre-idle canvas contained 18 body
children. After 45 seconds with all automation clients disconnected, all ten
checks were true: healthy baseline, worker present then absent, exact
exception, missing-DIP `empty.html`, connected null document at five seconds,
failure during idle, blank Identity preview, Identity route and heading, and
loopback-only execution. There were 228 local static requests and no
successful external response.

The earlier hosted runs also used new profiles that were deleted afterward.
Their results on 2026-07-15 UTC were:

| Flow                                                           | Browser                                     | Result                |
| -------------------------------------------------------------- | ------------------------------------------- | --------------------- |
| Reporter responsive + Dusk, Review-open idle, Save -> Identity | Chrome 150.0.7871.115                       | 3/3 persistent blanks |
| Reduced idle -> Styles sequence                                | Chrome 150.0.7871.115                       | 8/8 persistent blanks |
| Annotated reduced idle -> Styles sequence                      | Chrome for Testing 150.0.7871.124           | 1/1 persistent blank  |
| Reduced idle -> Styles sequence                                | Repository Chrome for Testing 149.0.7827.55 | 1/1 persistent blanks |

Each completed qualifying attempt had all three decisive signals: a naturally
absent worker after idle, an `empty.html` response missing DIP, and the exact
`:122:927` exception with a blank/null canvas at five seconds. Additional
canonical repeats should be recorded here if they change the hit rate. The
three canonical save-completion timings from the trusted Save click resolving
until **Saved** appeared were 257, 297, and 277 ms. Two canonical runs used the
reporter's **Large** responsive Title size; the first used **Medium**.

The sixth Chrome 150 reduced run verified the original checked-in helper
against asset `ae8f14e90632f9e1151b`. It intentionally exited 1 after all
strict checks passed. Its two missing-DIP responses were followed by the exact
exception 18 and 15 ms later, respectively.

Two later completed Chrome 150 triggers used hosted asset
`4b2c4bdfdd0eedf5e84b`. The first exposed that the original oracle was coupled
to the historical asset hash: every stable product signal passed, but the old
matcher labeled the result inconclusive. After separating `assetVersion` from
the stable oracle, the committed Playwright wrapper reported
`reproduced: true` and failed its healthy-behavior assertion as intended. The
result also reported `matchesReporterAssetVersion: false`; the exception text
and `:122:927` location were unchanged.

The annotated Chrome for Testing 150 run used that same advancing hosted asset
and raised the same exact exception. It recorded 10 service-worker
`empty.html` responses with HTTP 200 and no DIP header, 10 matching exceptions,
and a connected null canvas through five seconds. Its fresh profile and owned
browser processes were removed after capture.

One attempted evidence-capture run is excluded from the hit rate: taking a
top-level screenshot after worker retirement coincided with a fresh preview
request before Save and invalidated the intended action order. It was
discarded and rerun without the pre-action capture. Screenshots taken after a
completed route failure do not affect qualification.

Setup and probe-development attempts that never completed the documented
trigger are also excluded. These included an earlier revision with too short a
route-control wait, hosted renderer stalls, and bundled-Chrome attempts where
WordPress displayed its reauthentication overlay instead of mounting
Gutenberg. The probe classified these as inconclusive rather than healthy,
removed their profiles and browser processes, and did not count them in the
table.

Annotated-capture development also discarded runs before qualification when a
reconnected client reported a different viewport or when out-of-process-frame
coordinates could not yet reach the visible route controls. Those runs made no
claim about product behavior and their profiles were deleted. The qualifying
capture's first presentation-only oracle also called the run inconclusive
because it required the WordPress Core asset directory even though hosted
trunk loaded the same stable filename from the Gutenberg plugin directory. The
immutable events contain the exact exception; the corrected strict validator
uses the filename, message, line, and column, just like the checked-in probe.

The canonical hosted environment reported:

-   WordPress `7.1-alpha-62752`;
-   Gutenberg `23.6.0-rc.1` from the hosted `trunk` branch;
-   block-editor production asset `ae8f14e90632f9e1151b`;
-   Twenty Twenty-Five;
-   headless Chrome 150 on macOS.

The reporter used WordPress commit
`558828206710d533bed65ddfaccfac05bc3f402f` (`7.1-alpha-62740`). The hosted
revision used for the canonical evidence retained the reporter's block-editor
asset hash. A later hosted deployment advanced that asset to
`4b2c4bdfdd0eedf5e84b`; the exact exception message, `:122:927` location,
missing-DIP response, and persistent null canvas remained unchanged.

## Console comparison

Yes: the natural localhost-only Playwright reproduction emits the exact
`documentElement` TypeError from the reporter's screenshot, not merely a
similar artificial error. It came from the local Gutenberg asset
`block-editor/index.min.js?ver=4b2c4bdfdd0eedf5e84b:122:927`. The earlier
hosted natural reproduction emitted that same error and also logged this
warning twice:

```text
global-styles-css-custom-properties-inline-css was added to the iframe incorrectly.
Please use block.json or enqueue_block_assets to add styles to the iframe.
```

The reporter also had unrelated Playground, cache, extension, and deprecation
noise. The reproduction does not claim that every incidental console line is
identical.

## Source-level cause

There are two cooperating failures.

### 1. Playground forgets which scopes require document isolation

Playground patches Gutenberg's block-editor script so blob-backed editor
iframes become scoped
[`/wp-includes/empty.html` documents](https://github.com/WordPress/wordpress-playground/blob/e0fd8992f9a6ded1a01015b6831ae2e39653b106/packages/playground/remote/service-worker.ts#L521-L557).
The parent Site Editor document carries
`Document-Isolation-Policy: isolate-and-credentialless`. The child iframe must
carry the same header; otherwise Chromium deliberately blocks the parent's
`iframe.contentDocument` access. Playground's own
[DIP investigation](https://github.com/WordPress/wordpress-playground/pull/3320)
documents exactly that behavior.

The service worker decides whether to add DIP to `empty.html` by looking in
[`scopesWithCrossOriginIsolation`](https://github.com/WordPress/wordpress-playground/blob/e0fd8992f9a6ded1a01015b6831ae2e39653b106/packages/playground/remote/service-worker.ts#L565-L587).
That registry is only an in-memory JavaScript
[`Set`](https://github.com/WordPress/wordpress-playground/blob/e0fd8992f9a6ded1a01015b6831ae2e39653b106/packages/playground/remote/service-worker.ts#L671-L715).
It is populated when the worker observes a parent HTML response that already
has DIP. Normal service-worker retirement discards the global and the Set. On
the next `empty.html` request, the restarted worker has not re-served the still
loaded parent document, so it does not know that the scope needs DIP.

The network evidence in every qualifying run is therefore internally
consistent:

1. before idle, the existing editor iframe is healthy and same-origin;
2. after idle, the Playground service-worker target is absent;
3. a normal route click restarts it;
4. it serves `empty.html` from the service worker with `content-type: text/html`
   but no DIP;
5. the isolated parent cannot access the non-matching child, so
   `contentDocument` is null permanently for that document.

This state-tracking path was added by
[WordPress Playground PR #3515](https://github.com/WordPress/wordpress-playground/pull/3515)
after Gutenberg began sending DIP directly in
[Gutenberg PR #75991](https://github.com/WordPress/gutenberg/pull/75991).
The likely primary fix belongs in Playground: persist or otherwise reconstruct
the per-scope DIP requirement across service-worker lifetimes. Adding DIP to
every `empty.html` response is not obviously safe; the current source comment
notes that unconditional credentialless isolation can break authenticated REST
requests.

### 2. Gutenberg's iframe load handler assumes access can never be null

`packages/block-editor/src/components/iframe/index.js` installs this native
load handler:

```js
function onLoad() {
	const { contentDocument } = node;
	const { documentElement } = contentDocument;
	iFrameDocument = contentDocument;
	setIframeDocument( contentDocument );
}
```

When Playground supplies the mismatched child document, the second destructure
throws before Gutenberg can initialize its portal. The native load listener
was introduced by commit `7295c00f862` in
[PR #76314](https://github.com/WordPress/gutenberg/pull/76314). A null guard would
avoid the uncaught exception and is sensible defensive code, but it cannot by
itself make a browser-isolated child accessible. Without a later correctly
isolated navigation, the canvas would still be blank. That is why the
Playground state-loss fix is necessary for the persistent report.

## Other probes retained on this branch

`issue-80262-local-playground-repro.cjs` and
`issue-80262-local-playground.spec.js` are the canonical real reproduction.
They replace the hosted Playground dependency while retaining the real
browser-Playground service-worker lifecycle.

`issue-80262-human-flows.spec.js` contains the two reporter flows for a local
`wp-env`. Both stayed healthy in that non-Playground environment (`2 passed`),
which is expected now that the missing Playground lifecycle is understood.

`issue-80262-iframe-lifecycle-mechanism.spec.js` deliberately detaches an iframe
during a native load event. It makes the same Gutenberg source line throw, but
the iframe later reloads and recovers. That test is non-human mechanism coverage
and must not be presented as the persistent reproduction. The hosted
Playground lifecycle probe is retained as historical confirmation only.
