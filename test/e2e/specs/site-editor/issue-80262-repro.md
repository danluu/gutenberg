# Gutenberg #80262 reproduction notes

## Result and Alec's criteria

The persistent human-visible blank from
[issue #80262](https://github.com/WordPress/gutenberg/issues/80262) did **not**
reproduce locally. The two reporter scenarios are isolated in
`issue-80262-human-flows.spec.js`; both passed on clean trunk and their previews
were still visible five seconds after the final route change.

A separate test, `issue-80262-iframe-lifecycle-mechanism.spec.js`,
deterministically makes the real Gutenberg load handler throw the exact
null-`contentDocument` exception from the report. It uses an explicitly
documented non-human iframe timing step and the portal later recovers.

This does not meet Alec's exact-reproduction criterion. It instead documents
the unsuccessful human attempts and an artificial mechanism experiment. Do not
present the ordinary route-remount flash or the recovering mechanism test as
the reported persistent blank.

## Test environment

-   Gutenberg commit: `2eca416d45bfba5920b8e70b8759bc4e570ef48c`
-   Block Editor production asset: `ae8f14e90632f9e1151b` (also visible in the
    reporter's console capture)
-   WordPress: `7.1-alpha-62740`, commit
    `558828206710d533bed65ddfaccfac05bc3f402f`
-   Playwright: `1.61.1`
-   Browser: Chrome for Testing `149.0.7827.55`, headless
-   Theme: Twenty Twenty-Five for the human flows; Empty Theme for the isolated
    iframe lifecycle test
-   Local runtime: clean `wp-env` at `http://localhost:8890`, rather than the
    reporter's hosted WordPress Playground

The recorded WordPress revision is the exact local snapshot used for these
results. `.wp-env.test.json` tracks an unpinned WordPress source, so starting a
fresh environment later may resolve a newer WordPress revision and will not by
itself reconstruct that snapshot.

Check the test environment before running either test, and start it only if it
is stopped:

```bash
WP_ENV_PORT=8890 npx wp-env status --config .wp-env.test.json
WP_ENV_PORT=8890 npx wp-env start --config .wp-env.test.json # only if stopped
```

Port 8890 isolates this investigation from other local projects. Substitute a
different free port if needed, and set `WP_BASE_URL` to that same port.

The reporter's two videos end with a persistent blank preview. The associated
console capture contains this exception:

```text
Uncaught TypeError: Cannot destructure property 'documentElement' ... as it is null.
```

### Console comparison

The artificial lifecycle test produces the same relevant exception text once:

```text
Cannot destructure property 'documentElement' of 'N' as it is null.
    at HTMLIFrameElement.I (.../index.min.js?ver=ae8f14e90632f9e1151b:81:927)
```

The reporter's console shows that exception twice at
`HTMLIFrameElement.I (.../index.min.js?...:122:927)`. The error message, handler,
asset version, and minified column match. Playwright reports an uncaught browser
exception as a `pageerror`, without DevTools' `Uncaught TypeError:` prefix. The
local served line number and the number of induced events differ.

Both environments also log JQMIGRATE once and the
`global-styles-css-custom-properties-inline-css was added to the iframe incorrectly`
warning twice. The artificial local `wp-env` test does not reproduce the
Playground-specific deprecation, cache, worker, and fetch messages elsewhere in
the reporter's console capture. The test assertion intentionally targets only
the null-document exception, not the full console transcript.

## Human scenario 1: Dusk save, then Identity

The first video begins with a responsive Mobile edit already pending.

1. Open the Site Editor with Twenty Twenty-Five active.
2. Open **Design > Identity**, verify the preview, and click **Edit**.
3. Select the Query Loop and click **Edit pattern**.
4. Enable the Mobile view and Responsive styles, select a Post Title, and set
   its mobile font size to Large.
5. Exit pattern editing, open **Styles > Browse styles**, and choose Dusk.
6. Review the two changes, verify Blog Home and Custom Styles/Typography are
   listed, save, and wait for Saved.
7. Click **Identity**.

Expected healthy result: the preview remains available after navigation and no
null-`contentDocument` exception occurs.

Reported result: the preview remains blank and the null-`contentDocument`
exception appears.

Current local result: the Identity preview is visible after five seconds and
the exact exception does not occur. The isolated E2E passes.

## Human scenario 2: responsive edit and block visibility, then Styles

The second video starts from a recovered Site Editor session with the Dusk and
responsive changes from scenario 1 already saved. The E2E creates that
precondition afresh so it does not depend on scenario 1 running first.

1. Reopen the Site Editor, open **Identity**, and click **Edit**.
2. Edit the Query Loop pattern, enable Mobile/Responsive styles, set a Post
   Title's mobile font size to Small, and exit pattern editing.
3. Select the Header, choose **Hide**, enable **Hide on Mobile**, and apply.
4. Open Navigation, review the one Blog Home change, save, and wait for Saved.
5. Click **Styles**.

Expected healthy result: the preview remains available after navigation and no
null-`contentDocument` exception occurs.

Reported result: the preview remains blank and the same exception appears.

Current local result: the Styles preview is visible after five seconds and the
exact exception does not occur. The isolated E2E passes.

Run both human probes headlessly with:

```bash
WP_ENV_PORT=8890 WP_BASE_URL=http://localhost:8890 \
npm run test:e2e -- \
test/e2e/specs/site-editor/issue-80262-human-flows.spec.js \
--workers=1
```

Final local result:

```text
2 passed (20.9s)
```

A diagnostic observer measured a roughly 149-150 ms missing-canvas interval
during Identity-to-Styles replacement. That assertion was deliberately removed
from the human E2E: it only demonstrated normal lifecycle churn and was not the
reported persistent failure.

## Deterministic exception mechanism (non-human)

The lifecycle test exercises the exact failing source path:

1. Open a real Site Editor canvas and verify its real blob-backed iframe and
   React portal body are visible.
2. Start a native iframe `load` event.
3. In a capture-phase listener, detach the iframe after event dispatch has
   begun.
4. Let the browser continue the frozen event path into Gutenberg's real target
   listener while `iframe.contentDocument` is null.
5. Reinsert the iframe on the next task. That causes a second, valid load, so a
   lifecycle-safe implementation can recover.
6. Verify the original iframe and portal body recover, then assert that the
   exact null-document page error did not occur.

No DOM property is mocked and no Gutenberg data store is changed. The detach
and reinsert are not normal user operations. Current trunk reaches both
recovery assertions, then fails the targeted page-error assertion with:

```text
Cannot destructure property 'documentElement' of 'N' as it is null.
```

Run it headlessly with:

```bash
WP_ENV_PORT=8890 WP_BASE_URL=http://localhost:8890 \
npm run test:e2e -- \
test/e2e/specs/site-editor/issue-80262-iframe-lifecycle-mechanism.spec.js \
--workers=1
```

## Source analysis

`packages/block-editor/src/components/iframe/index.js` installs a native load
handler which reads `node.contentDocument`, immediately destructures its
`documentElement`, and only then stores the document for the React portal. If
the browsing context is temporarily absent, the exception stops initialization
for that load event. The handler fails to install the current document. Without
a later valid load, the portal may remain absent or attached to a stale browsing
context.

The same component already guards a later body-ref callback because moving an
iframe can temporarily destroy and recreate its window. The native load handler
was introduced by commit `7295c00f862` (PR #76314).

The Site Editor provides a plausible timing surface, but not a proven cause.
Identity supplies `<Editor />` directly, while Styles supplies
`<StylesPreviewArea><Editor /></StylesPreviewArea>`. Switching routes therefore
replaces the editor/provider/iframe tree. Each new editor also waits for a 100 ms
quiet period in core-data resolution before rendering. A one-off experiment
that returned `<Editor />` directly for ordinary Styles preview removed the
transient continuity gap, but that was a proxy result and did not prove a fix
for the persistent report.

No explicit responsive-edit remount path was found. Saving may affect resolver
timing, but the investigation did not prove that responsive edits or saving
cause the null document.

As a controlled source validation, adding only
`if ( ! contentDocument ) return;` before the destructure and rebuilding the
production assets changed the deterministic mechanism test from the exact
page-error failure to `1 passed`. Reinsertion deliberately supplies a second
valid load in that test, so this proves that this guard suppresses the forced
null-event exception when a later valid load is supplied. Other lifecycle fixes
remain possible, and the experiment does not prove the guard alone repairs the
reporter's persistent blank. The source experiment was reverted, and the
worktree is on the failing trunk baseline.
