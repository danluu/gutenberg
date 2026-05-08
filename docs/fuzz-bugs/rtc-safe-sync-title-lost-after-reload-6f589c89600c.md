# RTC same-user title loss after reload

Bug signature: `6f589c89600c`

Bug type: `rtc-safe-sync-title-lost-after-reload`

Existing repro spec: `test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts`

Transport: `http`

## Classification

This is a real product bug in the RTC persistence and refresh path. The failing source run does not look like a readiness wait, locator issue, malformed generated action, environment failure, inverted assertion, or expected behavior.

The source run in the known-fixes refresh data failed without timing out:

```text
result: failed
exitCode: 1
timedOut: false
durationMs: 54416
startedAt: 2026-05-05T10:23:10.922Z
completedAt: 2026-05-05T10:24:05.338Z
```

The final assertion failure was:

```text
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The source trace shows that the final REST save and persistence poll had the customer title, while the active editor tab read the initial title. That separates the defect from a failed save or a stale REST read:

```text
POST /wp/v2/posts/<id> title:
  RTC same-user save-after-reload customer title

GET /wp/v2/posts/<id> title.raw:
  RTC same-user save-after-reload customer title

final editor title read:
  RTC same-user save-after-reload initial
```

The failure is therefore a live editor state rollback after same-user reload synchronization, with persisted REST state and active editor state diverging.

## Independent repro routes

The proposed PR branch adds two repro levels.

The non-Playwright repros exercise the RTC data path directly:

```text
packages/core-data/src/test/entities.js
packages/core-data/src/test/resolvers.js
packages/core-data/src/utils/test/crdt.ts
packages/sync/src/test/manager.ts
```

These cover:

- saving a record while a same-user reload snapshot exists;
- passing the persisted raw entity record into the sync manager;
- suppressing an exact persisted raw title replay while the active edited title is dirty;
- proving `getChangesFromCRDTDoc` receives persisted-record context.

The Playwright repro uses natural user actions only:

```text
1. Page 1 creates a post.
2. Page 2 opens the same post as the same WordPress user.
3. Page 1 types the customer title.
4. Page 2 reloads.
5. Page 1 saves.
6. The test checks both the active editor title and the REST-persisted title.
```

It does not inject malformed blocks, mutate editor state directly, or synthesize a fake block tree.

## Origin analysis

The bug sits at the intersection of CRDT persistence, selective persisted-document application, and the later conversion of post title fields to CRDT text.

Key commits:

- `2d8b22633dd` / PR `#72373`, `Real-time collaboration: Implement CRDT persistence for collaborative editing`: introduced CRDT persistence for collaborative entity records.
- `50b0a31ec01` / PR `#74668`, `Apply only detected changes from the persisted CRDT document`: changed persisted-document loading from broad record application to computing invalidated keys from a temporary persisted CRDT document.
- `22e067b0243` / PR `#75448`, `Real-time Collaboration: Use Y.text for title, content and excerpt`: moved title, content, and excerpt into the Y.Text path.
- `8051e14451c` / PR `#75975`, `RTC: Fix stale CRDT document persisted on save`: attempted to avoid stale CRDT documents during save, but the save path still serialized the manager's current Y.Doc snapshot rather than applying the exact record being saved before persistence metadata was written.
- `9375c0e0148` / PR `#76017`, `Real-time Collaboration: Fix sync issue on refresh`: improved refresh synchronization, but did not provide the raw persisted record to the CRDT-to-editor diff.
- `0c8d486a3d5`, `RTC: Reject stale persisted CRDT documents`: added additional stale persisted-document protection, but still left the title invalidation comparison with only the active edited record as context.

The important implementation detail is that persisted CRDT invalidation compared the persisted temporary Y.Doc against the current edited record only. After the title became a Y.Text field, a reload could present an old persisted/raw title as a CRDT change relative to the dirty local edited title. The sync manager then pushed the persisted raw value back into the editor even though the local editor had a newer unsaved title and the final REST save would persist that newer title.

Blame points on the affected paths:

- `packages/sync/src/manager.ts` computed `invalidations` with `getChangesFromCRDTDoc( tempDoc, record )`, without the persisted raw entity record.
- `packages/core-data/src/resolvers.js` created sync-manager handlers without a way to read the persisted raw record.
- `packages/core-data/src/utils/crdt.ts` compared title/content/excerpt CRDT text against the current edited raw values, but could not recognize an exact replay of the persisted raw value while the editor was dirty.

## Initial fix plan

The first plan was:

1. Serialize the record being saved into the persisted CRDT document metadata before writing CRDT metadata.
2. Let sync-manager load handlers fetch the persisted raw entity record.
3. Pass that persisted raw record into `getChangesFromCRDTDoc`.
4. For raw text fields, ignore a CRDT change that only replays the exact persisted raw value while the active edited raw value differs from that persisted value.

## Fix-plan audit

Kernel-maintainer robustness:

- The browser repro stays at the user-action boundary.
- The lower-level tests use exported data-layer and sync APIs instead of malformed private state.
- The API extension is optional and preserves existing callers.
- The guard is scoped to exact raw persisted values for title/content/excerpt, not a broad "ignore reloads" rule.

Jepsen-style distributed-systems correctness:

- The stale persisted snapshot must not overwrite a newer dirty local edit just because another same-user tab reloaded.
- The fix preserves the local monotonic edit when the incoming CRDT value is exactly the old persisted value.
- It does not pretend the provider delivered a newer remote operation; it only prevents the persisted base value from being misclassified as a new field change.

Simplicity, performance, and failure-mode skepticism:

- The change is O(1) for each raw text field checked.
- It avoids a new polling loop, timeout, retry heuristic, transport rewrite, or editor-level special case.
- The known residual risk is intentional exact reversion: if one collaborator intentionally changes a raw text field back to precisely the persisted value while another tab has a dirty unsaved edit, this rule favors the dirty local edit. That is narrower and safer than allowing a stale persisted snapshot to clear active edits after reload.

## Revised fix plan

The revised plan keeps the original shape but narrows the guard to the CRDT raw field diff:

1. Persist CRDT metadata from the record being saved, not only from the manager's current Y.Doc snapshot.
2. Add optional `getPersistedRecord` support to sync record handlers.
3. Pass `persistedRecord` through the sync manager into the core-data CRDT diff.
4. Suppress only exact persisted raw value replays for `title`, `content`, and `excerpt` when the local edited raw value is dirty.

## Verification

Known-fixes base source result:

```bash
rg '"signature":"6f589c89600c"' \
  /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-3/fuzz-handoff/distinct-manifest-20260505/results-refresh-http-shard-3/results.jsonl
```

Result: one failed known-fixes refresh record for `rtc-safe-sync-title-lost-after-reload::6f589c89600c`, `exitCode:1`, `timedOut:false`.

Targeted unit repros after the fix:

```bash
npm run test:unit -- \
  packages/core-data/src/test/entities.js \
  packages/core-data/src/test/resolvers.js \
  packages/core-data/src/utils/test/crdt.ts \
  packages/sync/src/test/manager.ts \
  --runInBand
```

Result:

```text
Test Suites: 4 passed, 4 total
Tests:       123 passed, 123 total
```

Targeted package build:

```bash
WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production \
  node packages/wp-build/lib/build.mjs
```

Result: build passed for the three targeted packages.

The rebuilt `data`, `core-data`, and `sync` bundles were copied into the `wp-env` test container's `wp-includes/js/dist` directory so the browser test exercised the patched scripts that WordPress core loaded in the test environment.

Natural-user Playwright repro after the fix:

```bash
WP_ENV_PORT=9927 \
WP_BASE_URL=http://localhost:9927 \
WP_ENV_PHPMYADMIN_PORT=9900 \
RTC_MANIFEST_WS_START_PORT=20616 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1
```

Result:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

## Pass 37 verification

Pass 37 independently re-read the source failure trace and verified that the
final REST save persisted the customer title while the active editor store read
the initial title. The source failure is therefore still a product-state
rollback, not a save failure or an inverted assertion.

The explanation and PR branches were rebased onto current `origin/trunk`
(`384489f49ba`, `Fix flaky Menu test (#77972)`) so the PR branch diff no longer
contains the unrelated upstream Menu test change. The rebased PR branch commit
order is:

```text
83d6f889e2b Add RTC title reload unit repros
e97acb618ad Add same-user title save-after-reload browser repro
5036d249ab0 Preserve RTC title across reload saves
```

Targeted lower-level repro tests passed on the rebased PR branch:

```text
Test Suites: 4 passed, 4 total
Tests:       123 passed, 123 total
```

The natural-user Playwright repro also passed headlessly against the running
`wp-env` test site on port `9927`:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

The broad build command was attempted but the local checkout's dependency
state failed before completing the build, on the unrelated stylesheet import
`@arraypress/waveform-player/dist/waveform-player`.

## Pass 38 update

Pass 38 added a narrower payload-level proof from the archived source trace and
reran the natural-user repro directly on the known-fixes checkout.

The source trace's REST resources were decoded with `yjs` and `lib0/buffer`.
This showed a two-step split between the canonical REST record and the persisted
CRDT metadata:

```text
2026-05-05T10:24:02 response 675d696f573f1ae...
  post title:  RTC same-user save-after-reload initial
  CRDT title:  RTC same-user save-after-reload customer title
  post body:   Initial body only
  CRDT body:   Initial body + same user save-after-reload edit

2026-05-05T10:24:04 final save request 9fa56e5d16b9...
  request title: RTC same-user save-after-reload customer title
  CRDT title:    RTC same-user save-after-reload initial
  request body:  Initial body + post-reload active edit + save-after-reload edit
  CRDT body:     Initial body only
```

That is the minimal root-cause shape: after reload, the persisted/raw post
record and `_crdt_document` can represent different title/content snapshots. The
final save request sends the user's visible raw title and content, but the CRDT
metadata serialized with that save can still be the old initial snapshot. The
active editor then remains vulnerable to applying an exact persisted/raw replay
as if it were a new collaborative field change.

Direct known-fixes rerun:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
WP_ENV_PORT=9904 \
WP_BASE_URL=http://localhost:9904 \
WP_ENV_PHPMYADMIN_PORT=9900 \
RTC_MANIFEST_WS_START_PORT=20432 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run wp-env start -- --config .wp-env.test.json

WP_ENV_PORT=9904 \
WP_BASE_URL=http://localhost:9904 \
WP_ENV_PHPMYADMIN_PORT=9900 \
RTC_MANIFEST_WS_START_PORT=20432 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result on known-fixes commit `3cba2b1e56a`:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The non-Playwright repros also fail before the fix at the test-only browser
repro commit `e97acb618ad`:

```text
Test Suites: 4 failed, 4 total
Tests:       8 failed, 115 passed, 123 total
```

They pass again at the fix commit `5036d249ab0`:

```text
Test Suites: 4 passed, 4 total
Tests:       123 passed, 123 total
```

The same natural-user Playwright repro passed on the fix branch against the
existing fixed worktree environment:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-6f589c89600c
WP_ENV_PORT=9927 \
WP_BASE_URL=http://localhost:9927 \
WP_ENV_PHPMYADMIN_PORT=9900 \
RTC_MANIFEST_WS_START_PORT=20616 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

## Pass 39 update

Pass 39 independently rebuilt the source trace timeline instead of relying on
the prior decoded snippets. The full chronological REST/CRDT table shows two
opposite splits in the same run:

```text
10:24:02 POST request/response:
  REST post title: RTC same-user save-after-reload initial
  CRDT title:      RTC same-user save-after-reload customer title
  REST body:       Initial body
  CRDT body:       Initial body + same user save-after-reload edit

10:24:04 final POST request/response:
  REST post title: RTC same-user save-after-reload customer title
  CRDT title:      RTC same-user save-after-reload initial
  REST body:       Initial body + post-reload active edit + save-after-reload edit
  CRDT body:       Initial body
```

That narrows the root-cause proof: the reload/save path can persist a raw REST
record and `_crdt_document` from different editor snapshots. The browser failure
is therefore not only a stale UI read; the persisted collaboration metadata
itself can lag behind the just-saved raw record.

Pass 39 also rechecked the false-positive alternatives:

- The run failed after four same-file controls passed; it did not time out.
- The archived action trace uses natural editor actions: fill title, edit a
  paragraph, reload the same-user tab, edit another paragraph, and Save draft.
- The failure screenshots show two saved editor tabs for the same post with
  different titles.
- The final REST GET returned the customer title, while the active editor store
  read the initial title.

Fresh known-fixes rerun:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
WP_ENV_PORT=9904 \
WP_BASE_URL=http://localhost:9904 \
RTC_MANIFEST_WS_START_PORT=20432 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result on `3cba2b1e56a`:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

Fresh non-Playwright before/after proof:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-6f589c89600c
git switch --detach e97acb618ad
npm run test:unit -- \
  packages/core-data/src/test/entities.js \
  packages/core-data/src/test/resolvers.js \
  packages/core-data/src/utils/test/crdt.ts \
  packages/sync/src/test/manager.ts \
  --runInBand
```

Result before the fix:

```text
Test Suites: 4 failed, 4 total
Tests:       8 failed, 115 passed, 123 total
```

The failing assertions directly covered stale persisted-title replay, missing
persisted-record context, and serializing the older local CRDT snapshot instead
of the record being saved.

The same tests passed again at fix commit `5036d249ab0`:

```text
Test Suites: 4 passed, 4 total
Tests:       123 passed, 123 total
```

Fresh fixed-branch browser verification:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-6f589c89600c
WP_ENV_PORT=9927 \
WP_BASE_URL=http://localhost:9927 \
RTC_MANIFEST_WS_START_PORT=20616 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

The targeted package build was attempted again, and again failed outside the
changed code on the pre-existing missing stylesheet import:

```text
@use "@arraypress/waveform-player/dist/waveform-player";
```

The build had already completed the package transpilation phase for `sync`,
`data`, and `core-data`; the fixed browser repro still passed headlessly against
the running worktree environment.

## Pass 40 update

Pass 40 rebased both branches onto current `origin/trunk`:

```text
e7f55c1b4d2 Widget Types: server-side registry, decouple wp-build pages (#77958)
```

The source trace was decoded again from scratch. The strongest payload-level
row is the final save request:

```text
2026-05-05T10:24:04.080Z POST /wp-json/wp/v2/posts/226?_locale=user
  request REST title: RTC same-user save-after-reload customer title
  request CRDT title: RTC same-user save-after-reload initial
  response REST title: RTC same-user save-after-reload customer title
  response CRDT title: RTC same-user save-after-reload initial
```

That directly proves the persisted REST record and `_crdt_document` were written
from different snapshots in the same HTTP save. The same trace's action stream
uses ordinary editor interactions only: open the same post twice as admin, fill
the title, edit paragraph text, reload a same-user tab, edit paragraph text, and
click Save draft.

Pass 40 also narrowed the code-level cause:

- before the fix, `prePersistPostType` called
  `createPersistedCRDTDoc( objectType, objectId )` without the current save
  edits;
- before the fix, `createPersistedCRDTDoc` yielded one tick and serialized the
  manager's current `Y.Doc`;
- after a reload/same-user race, that `Y.Doc` can still contain the initial
  title even while the REST save body contains the customer title;
- the fix passes `{ record: edits }` to `createPersistedCRDTDoc` and applies
  those exact edits to the `Y.Doc` before serializing metadata.

Fresh known-fixes rerun used port `9905` because the requested `9903` was
already allocated by OrbStack:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
WP_ENV_PORT=9903 \
WP_BASE_URL=http://localhost:9903 \
RTC_MANIFEST_WS_START_PORT=20424 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run wp-env status -- --config .wp-env.test.json

WP_ENV_PORT=9903 \
WP_BASE_URL=http://localhost:9903 \
RTC_MANIFEST_WS_START_PORT=20424 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run wp-env start -- --config .wp-env.test.json
```

Result:

```text
status: stopped
Bind for 0.0.0.0:9903 failed: port is already allocated
```

The alternate known-fixes rerun:

```bash
WP_ENV_PORT=9905 \
WP_BASE_URL=http://localhost:9905 \
RTC_MANIFEST_WS_START_PORT=20440 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run wp-env start -- --config .wp-env.test.json

WP_ENV_PORT=9905 \
WP_BASE_URL=http://localhost:9905 \
RTC_MANIFEST_WS_START_PORT=20440 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result on known-fixes commit `3cba2b1e56a`:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

Playwright also reported trace-artifact `ENOENT` errors during teardown, but
those appeared after the title assertion and do not explain the product-state
rollback.

The rebased PR branch has the required commit order:

```text
f63a9b8eddd Add RTC title reload unit repros
aac47c7825b Add same-user title save-after-reload browser repro
477cc8b2f91 Preserve RTC title across reload saves
```

Focused non-Playwright tests passed after the rebase:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-6f589c89600c
npm run test:unit -- \
  packages/core-data/src/test/entities.js \
  packages/core-data/src/test/resolvers.js \
  packages/core-data/src/utils/test/crdt.ts \
  packages/sync/src/test/manager.ts \
  --runInBand
```

Result:

```text
Test Suites: 4 passed, 4 total
Tests:       123 passed, 123 total
```

The fixed natural-user browser repro passed on the rebased PR branch:

```bash
WP_ENV_PORT=9927 \
WP_BASE_URL=http://localhost:9927 \
RTC_MANIFEST_WS_START_PORT=20616 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

The package build was reattempted:

```bash
WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production \
node packages/wp-build/lib/build.mjs
```

It again failed after transpiling `sync`, `data`, and `core-data` because the
local dependency set is missing this unrelated stylesheet:

```text
@use "@arraypress/waveform-player/dist/waveform-player";
```

## Pass 41 verification

Pass 41 re-read the source log, screenshots, and trace independently, then
reran the natural-user repro on both the known-fixes base and the fixed PR
branch. The source trace again rules out a readiness wait, locator failure,
malformed generated action, inverted assertion, stale REST read, or
environment-only failure.

The decoded source trace shows the record split at the HTTP payload boundary:

```text
2026-05-05T10:24:02.082Z POST /wp-json/wp/v2/posts/226?_locale=user
  request  REST title="RTC same-user save-after-reload initial"
           CRDT title="RTC same-user save-after-reload customer title"

2026-05-05T10:24:04.080Z POST /wp-json/wp/v2/posts/226?_locale=user
  request  REST title="RTC same-user save-after-reload customer title"
           CRDT title="RTC same-user save-after-reload initial"

2026-05-05T10:24:04.193Z GET /wp-json/wp/v2/posts/226?context=edit
  response REST title="RTC same-user save-after-reload customer title"
           CRDT title="RTC same-user save-after-reload initial"
```

The screenshots still show two saved editor tabs for the same post: one with
`RTC same-user save-after-reload initial`, and one with
`RTC same-user save-after-reload customer title`.

The known-fixes base was checked first on the requested port:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
WP_ENV_PORT=9903 \
WP_BASE_URL=http://localhost:9903 \
RTC_MANIFEST_WS_START_PORT=20424 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run wp-env status -- --config .wp-env.test.json
```

Result:

```text
status: stopped
```

Starting on `9903` failed because OrbStack already owned the listener:

```text
Bind for 0.0.0.0:9903 failed: port is already allocated
```

The alternate known-fixes run on `9905` reproduced the bug again on commit
`3cba2b1e56a`:

```bash
WP_ENV_PORT=9905 \
WP_BASE_URL=http://localhost:9905 \
RTC_MANIFEST_WS_START_PORT=20440 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The existing PR branch did not need another code change for pass 41. It is
still forked from current `origin/trunk` (`e7f55c1b4d2`) with the required commit
order:

```text
f63a9b8eddd Add RTC title reload unit repros
aac47c7825b Add same-user title save-after-reload browser repro
477cc8b2f91 Preserve RTC title across reload saves
```

Focused non-Playwright verification on the PR branch:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-6f589c89600c
npm run test:unit -- \
  packages/core-data/src/test/entities.js \
  packages/core-data/src/test/resolvers.js \
  packages/core-data/src/utils/test/crdt.ts \
  packages/sync/src/test/manager.ts \
  --runInBand
```

Result:

```text
Test Suites: 4 passed, 4 total
Tests:       123 passed, 123 total
```

Fixed natural-user browser verification on the PR branch:

```bash
WP_ENV_PORT=9927 \
WP_BASE_URL=http://localhost:9927 \
RTC_MANIFEST_WS_START_PORT=20616 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

Pass 41 also generated a fresh annotated stitched video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-41/6f589c89600c-title-loss-analysis-pass41-stitch.mp4
```

The video was checked with `ffprobe`:

```text
width=1920
height=1080
duration=30.000000
nb_frames=900
```

## Pass 42 verification

Pass 42 rebased both branches onto current `origin/trunk`:

```text
02bfdaa5ca9 RTC: Fix divergence when two offline users reconnect (#77980)
```

The rebased PR branch keeps the requested commit order:

```text
c30db1c133d Add RTC title reload unit repros
80c71d4d9a1 Add same-user title save-after-reload browser repro
0349549d2fe Preserve RTC title across reload saves
```

This pass independently decoded the archived `trace.zip` again and included
both raw REST fields and decoded `_crdt_document` fields. The final save request
is the narrowest proof:

```text
2026-05-05T10:24:04.080Z POST /wp-json/wp/v2/posts/226?_locale=user
  request REST title="RTC same-user save-after-reload customer title"
  request CRDT title="RTC same-user save-after-reload initial"
  request REST content=Initial body + same-user edits
  request CRDT content=Initial body only

2026-05-05T10:24:04.193Z GET /wp-json/wp/v2/posts/226?context=edit
  response REST title="RTC same-user save-after-reload customer title"
  response CRDT title="RTC same-user save-after-reload initial"
```

That shows the bug at the persistence boundary: one HTTP save writes the current
raw REST record while storing `_crdt_document` from an older `Y.Doc` snapshot.
The failure is therefore not a stale assertion read after a successful save.

Fresh non-Playwright before/after proof:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-6f589c89600c
git switch --detach c30db1c133d
npm run test:unit -- \
  packages/core-data/src/test/entities.js \
  packages/core-data/src/test/resolvers.js \
  packages/core-data/src/utils/test/crdt.ts \
  packages/sync/src/test/manager.ts \
  --runInBand
git switch try/rtc-safe-sync-title-lost-after-reload-6f589c89600c-pr
```

Result at the test-only commit:

```text
Test Suites: 4 failed, 4 total
Tests:       8 failed, 115 passed, 123 total
```

The failing assertions covered the precise fix obligations: pass current save
edits into CRDT serialization, pass persisted-record context into CRDT diffing,
avoid replaying a stale persisted title over a dirty title, and serialize
`Customer title` rather than `Initial title`.

The same focused suite passed at the rebased fix commit `0349549d2fe`:

```text
Test Suites: 4 passed, 4 total
Tests:       123 passed, 123 total
```

Fixed natural-user browser verification on the rebased PR branch:

```bash
WP_ENV_PORT=9927 \
WP_BASE_URL=http://localhost:9927 \
RTC_MANIFEST_WS_START_PORT=20616 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

Known-fixes confirmation for this pass:

- the archived known-fixes refresh source run is still a failed run on the
  known-fixes checkout, with `exitCode=1` and `timedOut=false`;
- a fresh `wp-env start` attempt for the known-fixes test environment on a free
  HTTP port failed before WordPress startup with Docker network exhaustion:
  `all predefined address pools have been fully subnetted`;
- trying the already-listening `9905` WordPress site did not provide a valid
  substitute because it was not the test environment and lacked the RTC test
  provider plugin.

The package build was reattempted after the rebase:

```bash
WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production \
node packages/wp-build/lib/build.mjs
```

It again failed outside the changed code, after transpiling `sync`, `data`, and
`core-data`, on the local missing stylesheet dependency:

```text
@use "@arraypress/waveform-player/dist/waveform-player";
```

Pass 42 generated a fresh annotated stitched video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-42/6f589c89600c-title-loss-analysis-pass42-stitch.mp4
```

Video verification:

```text
width=1920
height=1080
duration=30.000000
nb_frames=900
```

## Pass 43 verification

Pass 43 re-read the pass-42 summary, source result, failure log, screenshots,
and trace. The source result is still the known-fixes checkout
`3cba2b1e56a` and still failed without timing out:

```text
rtc-safe-sync-title-lost-after-reload::6f589c89600c
result=failed
exitCode=1
timedOut=false
durationMs=54416
```

The independent trace decode in this pass enumerated all
`/wp-json/wp/v2/posts/226` requests and decoded `_crdt_document` from the
archived trace resources. The final save request is again the narrowest
root-cause proof:

```text
2026-05-05T10:24:04.080Z POST /wp-json/wp/v2/posts/226?_locale=user
  req.restTitle="RTC same-user save-after-reload customer title"
  req.crdtTitle="RTC same-user save-after-reload initial"
  req.restContent=Initial body + same-user post-reload active edit
  req.crdtContent=Initial body only

2026-05-05T10:24:04.193Z GET /wp-json/wp/v2/posts/226?context=edit
  res.restTitle="RTC same-user save-after-reload customer title"
  res.crdtTitle="RTC same-user save-after-reload initial"
```

The action log in the same trace shows natural user actions only: open the same
draft twice as the admin user, fill the title, edit paragraph content, reload
the same-user tab, edit paragraph content again, and click `Save draft`. There
is no malformed block injection, artificial state mutation, synthetic block
tree, locator failure, timeout, or inverted assertion involved.

Known-fixes confirmation was attempted on the requested ports:

```bash
WP_ENV_PORT=9902 \
WP_BASE_URL=http://localhost:9902 \
RTC_MANIFEST_WS_START_PORT=20416 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run wp-env status -- --config .wp-env.test.json
```

Result:

```text
status: stopped
```

Starting that clean known-fixes environment failed before WordPress startup:

```bash
WP_ENV_PORT=9902 \
WP_BASE_URL=http://localhost:9902 \
RTC_MANIFEST_WS_START_PORT=20416 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run wp-env start -- --config .wp-env.test.json
```

Result:

```text
failed to create network wp-env-gutenberg-rtc-known-fixes-refresh-20260505-test-67d46abf_default:
Error response from daemon: all predefined address pools have been fully subnetted
```

So the fresh known-fixes browser rerun was blocked by local Docker network
exhaustion. The archived source run remains a valid known-fixes failure at the
same commit.

Pass 43 reran the focused non-Playwright repro suite at the test-only commit:

```bash
git switch --detach c30db1c133d
npm run test:unit -- \
  packages/core-data/src/test/entities.js \
  packages/core-data/src/test/resolvers.js \
  packages/core-data/src/utils/test/crdt.ts \
  packages/sync/src/test/manager.ts \
  --runInBand
```

Result:

```text
Test Suites: 4 failed, 4 total
Tests:       8 failed, 115 passed, 123 total
```

The same suite passed on the fix branch:

```bash
git switch try/rtc-safe-sync-title-lost-after-reload-6f589c89600c-pr
npm run test:unit -- \
  packages/core-data/src/test/entities.js \
  packages/core-data/src/test/resolvers.js \
  packages/core-data/src/utils/test/crdt.ts \
  packages/sync/src/test/manager.ts \
  --runInBand
```

Result:

```text
Test Suites: 4 passed, 4 total
Tests:       123 passed, 123 total
```

One pass-43 browser run on `WP_BASE_URL=http://localhost:9902` failed, but it
was not a valid result for this worktree: Docker showed port `9902` belonged to
`wp-env-gutenberg-bug-5ee0be2f9b7d-5bd31855-wordpress-1`, while this worktree's
running test container was mapped to `9927`.

The fixed natural-user Playwright repro passed on the actual container port:

```bash
WP_ENV_PORT=9927 \
WP_BASE_URL=http://localhost:9927 \
RTC_MANIFEST_WS_START_PORT=20616 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1
```

Result:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

The targeted build command was reattempted:

```bash
WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production \
node packages/wp-build/lib/build.mjs
```

It failed outside the changed code on the same local missing stylesheet import:

```text
@use "@arraypress/waveform-player/dist/waveform-player";
```

Pass 43 generated and checked a new annotated stitched video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-43/6f589c89600c-title-loss-analysis-pass43-stitch.mp4
```

Video verification:

```text
width=1920
height=1080
duration=35.000000
nb_frames=1050
```

## Pass 47 update

Pass 47 independently decoded the original archived source trace from
`results-refresh-http-shard-3`, instead of relying on the later pass-46 rerun.
That source trace used post `226` and shows the same two-stage persistence
split:

```text
#4 post=226 2026-05-05T10:24:03.545Z GET 200 /wp-json/wp/v2/posts/226?context=edit&_locale=user
  response.restTitle="RTC same-user save-after-reload initial"
  response.crdtTitle="RTC same-user save-after-reload customer title"
  response.restContent="Initial body."
  response.crdtContent="Initial body. | same user save-after-reload edit"

#6 post=226 2026-05-05T10:24:04.080Z POST 200 /wp-json/wp/v2/posts/226?_locale=user
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload initial"
  request.restContent="Initial body. | same user post-reload active edit | same user save-after-reload edit"
  request.crdtContent="Initial body."
  response.restTitle="RTC same-user save-after-reload customer title"
  response.crdtTitle="RTC same-user save-after-reload initial"

request title/CRDT title mismatches: 1
```

The original failure screenshots also show both same-user editor tabs after the
save: one saved tab has reverted to
`RTC same-user save-after-reload initial`, while the other still shows
`RTC same-user save-after-reload customer title`. The Playwright error context
contains the customer title in the active editor before the final store read, so
the final assertion is not inverted and the locator did see the intended title.

The source trace action stream contains normal user actions only: log in, open
the post, type paragraph text, reload one same-user session, open the same post
in the other session, fill the title textbox, type another paragraph edit, and
click `Save draft`. The first four tests in the source run passed and the fifth
failed without timeout, which rules out a collaboration-readiness failure for
the product evidence.

Pass 47 also rechecked the existing branches after fetching `origin/trunk`.
`origin/trunk` remained at `02bfdaa5ca96deb050cd0c40bad1c1da75858caf`, and the
PR branch still has the requested commit order:

```text
c30db1c133d Add RTC title reload unit repros
80c71d4d9a1 Add same-user title save-after-reload browser repro
0349549d2fe Preserve RTC title across reload saves
```

Fresh lower-level verification on the PR branch:

```text
Test Suites: 4 passed, 4 total
Tests:       123 passed, 123 total
```

Fresh lower-level verification on the test-only commit still fails with the
expected repro assertions:

```text
Test Suites: 4 failed, 4 total
Tests:       8 failed, 115 passed, 123 total
```

Fresh fixed-branch natural-user Playwright verification, run headlessly against
the already-running test site on mapped host port `9927`, passed:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

No fix changes were needed in pass 47. The branch, tests, and pass-46 annotated
video still satisfy the requested standard; pass 47 adds the narrower
source-trace proof that the original known-fixes failure itself had the REST
record and CRDT metadata crossing in opposite directions around the final save.

## Pass 48 verification

Pass 48 added a fresh before/after verification on the current local
environments and rechecked the existing branch/video/fix standard.

After `git fetch origin trunk`, `origin/trunk` was still
`02bfdaa5ca96deb050cd0c40bad1c1da75858caf`, so the PR branch remained based
directly on current trunk with the requested commit order:

```text
c30db1c133d Add RTC title reload unit repros
80c71d4d9a1 Add same-user title save-after-reload browser repro
0349549d2fe Preserve RTC title across reload saves
```

The known-fixes checkout was still `3cba2b1e56a`. Its `wp-env` test
environment was running, with configured URL `http://localhost:9902` and mapped
host port `9906`. Running the natural-user repro against that mapped known-fixes
port reached the product failure:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
WP_ENV_PORT=9906 \
WP_BASE_URL=http://localhost:9906 \
WP_ENV_PHPMYADMIN_PORT=9901 \
RTC_MANIFEST_WS_START_PORT=20416 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-48/playwright-known-fixes-9906 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-48 known-fixes trace used post `330` and reproduced the same
request/response invariant as the archived source trace:

```text
#4 post=330 2026-05-05T23:58:34.399Z GET 200 /wp-json/wp/v2/posts/330?context=edit&_locale=user
  response.restTitle="RTC same-user save-after-reload initial"
  response.crdtTitle="RTC same-user save-after-reload customer title"
  response.restContent="Initial body."
  response.crdtContent="Initial body. | same user save-after-reload edit"

#6 post=330 2026-05-05T23:58:35.351Z POST 200 /wp-json/wp/v2/posts/330?_locale=user
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload initial"
  request.restContent="Initial body. | same user post-reload active edit | same user save-after-reload edit"
  request.crdtContent="Initial body."
  response.restTitle="RTC same-user save-after-reload customer title"
  response.crdtTitle="RTC same-user save-after-reload initial"

request title/CRDT title mismatches: 1
```

The fixed worktree `wp-env` test environment was also running, with configured
URL `http://localhost:9902` and mapped host port `9927`. The same natural-user
Playwright repro passed headlessly on the fixed branch:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-6f589c89600c
WP_ENV_PORT=9927 \
WP_BASE_URL=http://localhost:9927 \
WP_ENV_PHPMYADMIN_PORT=9900 \
RTC_MANIFEST_WS_START_PORT=20416 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-48/playwright-fixed-9927 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

Pass 48 also reran the lower-level repro suite on both sides. The test-only
commit `c30db1c133d`, after linking the same package-local dependencies and
generated icons used by the fixed worktree, failed with exactly the expected
targeted repro assertions:

```text
Test Suites: 4 failed, 4 total
Tests:       8 failed, 115 passed, 123 total
```

Representative failures:

```text
Expected path: not "title"
Received value: "Persisted Title"

Expected: "Customer title"
Received: "Initial title"
```

The fixed branch passed the same lower-level suite:

```bash
npm run test:unit -- \
  packages/core-data/src/test/entities.js \
  packages/core-data/src/test/resolvers.js \
  packages/core-data/src/utils/test/crdt.ts \
  packages/sync/src/test/manager.ts \
  --runInBand
```

Result:

```text
Test Suites: 4 passed, 4 total
Tests:       123 passed, 123 total
```

The fix plan did not change in pass 48. The fresh failure on known-fixes and
the fresh fixed-branch pass support the same narrow fix: serialize the record
being saved into the persisted CRDT document and give the CRDT diff the
persisted raw record so exact persisted raw title/content/excerpt replays do
not overwrite a dirty active edit after reload.

The existing pass-46 annotated stitched video remains the video artifact for
this bug:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-46/6f589c89600c-title-loss-analysis-pass46-stitch.mp4
```

Pass 48 rechecked it:

```text
width=1920
height=1080
duration=35.000000
nb_frames=1050
```

It includes the relevant screens, action-log summary, trace decode, and
verification matrix; pass 48 additionally extracted a frame for inspection at:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-48/6f589c89600c-pass46-video-pass48-check.png
```

## Pass 44 verification

Pass 44 added a stricter trace-invariant decode instead of only restating the
prior failing assertion. It decoded every archived
`/wp-json/wp/v2/posts/226` request/response resource and compared the raw REST
title/content with the decoded `_crdt_document` title/content.

The full request sequence had exactly one save-time title/CRDT mismatch, and it
was the final user save:

```text
#1 2026-05-05T10:23:54.058Z GET
  response.restTitle="RTC same-user save-after-reload initial"
  response.crdtTitle=undefined

#2 2026-05-05T10:23:54.169Z POST
  request.restTitle="RTC same-user save-after-reload initial"
  request.crdtTitle="RTC same-user save-after-reload initial"
  response.restTitle="RTC same-user save-after-reload initial"
  response.crdtTitle="RTC same-user save-after-reload initial"

#3 2026-05-05T10:23:58.179Z GET
  response.restTitle="RTC same-user save-after-reload initial"
  response.crdtTitle="RTC same-user save-after-reload initial"

#4 2026-05-05T10:24:03.545Z GET
  response.restTitle="RTC same-user save-after-reload initial"
  response.crdtTitle="RTC same-user save-after-reload customer title"

#5 2026-05-05T10:24:03.995Z GET
  response.restTitle="RTC same-user save-after-reload initial"
  response.crdtTitle="RTC same-user save-after-reload customer title"

#6 2026-05-05T10:24:04.080Z POST
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload initial"
  request.restContent=Initial body + post-reload active edit + save-after-reload edit
  request.crdtContent=Initial body only
  response.restTitle="RTC same-user save-after-reload customer title"
  response.crdtTitle="RTC same-user save-after-reload initial"
```

This is the narrowest current proof: one normal REST save wrote current raw
post fields and stale CRDT metadata into the same post record. That rules out a
stale read, inverted assertion, action-locator problem, timeout, and malformed
generated spec.

Pass 44 also reran the known-fixes browser repro directly. The requested
`WP_ENV_PORT=9902` environment existed, but `wp-env status` showed Docker had
mapped that known-fixes test site to actual HTTP port `9906`. Running the
focused natural-user repro against that port on known-fixes commit
`3cba2b1e56a` still failed:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
WP_ENV_PORT=9906 \
WP_BASE_URL=http://localhost:9906 \
RTC_MANIFEST_WS_START_PORT=20416 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The non-Playwright repro suite still fails before the fix at test-only commit
`c30db1c133d`:

```text
Test Suites: 4 failed, 4 total
Tests:       8 failed, 115 passed, 123 total
```

The same suite passes at fix commit `0349549d2fe`:

```text
Test Suites: 4 passed, 4 total
Tests:       123 passed, 123 total
```

The fixed natural-user Playwright repro also passed on the actual mapped port
for this worktree:

```bash
WP_ENV_PORT=9927 \
WP_BASE_URL=http://localhost:9927 \
RTC_MANIFEST_WS_START_PORT=20616 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1
```

Result:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

The targeted build command was reattempted:

```bash
WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production \
node packages/wp-build/lib/build.mjs
```

It failed after transpiling `sync`, `data`, and `core-data`, on the same
unrelated local stylesheet dependency:

```text
@use "@arraypress/waveform-player/dist/waveform-player";
```

Pass 44 generated a fresh annotated stitched video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-44/6f589c89600c-title-loss-analysis-pass44-stitch.mp4
```

Video verification:

```text
width=1920
height=1080
duration=35.000000
nb_frames=1050
```

## Pass 45 verification

Pass 45 added an independent rerun and a dynamic trace decoder instead of
reusing the archived post ID. The known-fixes `.wp-env.test.json` environment
could not be started on the requested `WP_ENV_PORT=9902` because another
container already held that host port:

```text
Bind for 0.0.0.0:9902 failed: port is already allocated
```

Retrying the test environment on `9906` failed earlier in Docker setup with
local network exhaustion:

```text
failed to create network wp-env-gutenberg-rtc-known-fixes-refresh-20260505-test-67d46abf_default:
Error response from daemon: all predefined address pools have been fully subnetted
```

An existing known-fixes environment for the same checkout was already running
and reachable on `http://localhost:9903`, so pass 45 used that site for a fresh
natural-user repro on known-fixes commit `3cba2b1e56a`:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
WP_ENV_PORT=9903 \
WP_BASE_URL=http://localhost:9903 \
RTC_MANIFEST_WS_START_PORT=20416 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh failure trace is:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/test/e2e/artifacts/test-results/editor-collaboration-colla-da7f1-ser-browser-session-reloads-chromium/trace.zip
```

Pass 45 decoded that new trace with a decoder that discovers the post ID from
the trace instead of hardcoding `226`:

```bash
node /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-45/trace-post-crdt-invariant-decoder.js \
  /tmp/rtc-pass45-known-fixes-trace
```

The independently generated trace reproduced the same save-time raw/CRDT split
on post `109`:

```text
#6 post=109 2026-05-05T23:15:05.673Z POST 200 /wp-json/wp/v2/posts/109?_locale=user
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload initial"
  request.restContent="Initial body. | same user post-reload active edit"
  request.crdtContent="Initial body."
  response.restTitle="RTC same-user save-after-reload customer title"
  response.crdtTitle="RTC same-user save-after-reload initial"

request title/CRDT title mismatches: 1
```

This is a stronger proof than the archived trace alone: a new headless browser
run on the known-fixes checkout wrote current raw post fields and stale CRDT
metadata into the same REST save request.

The same pass reran the lower-level before/after proof. At test-only commit
`c30db1c133d`, before the fix, the targeted non-Playwright tests failed:

```bash
git switch --detach c30db1c133d
npm run test:unit -- \
  packages/core-data/src/test/entities.js \
  packages/core-data/src/test/resolvers.js \
  packages/core-data/src/utils/test/crdt.ts \
  packages/sync/src/test/manager.ts \
  --runInBand
```

Result:

```text
Test Suites: 4 failed, 4 total
Tests:       8 failed, 115 passed, 123 total
```

Representative failures:

```text
Expected path: not "title"
Received value: "Persisted Title"

Expected: "Customer title"
Received: "Initial title"
```

At fix commit `0349549d2fe`, the same non-Playwright suite passed:

```text
Test Suites: 4 passed, 4 total
Tests:       123 passed, 123 total
```

The fixed natural-user Playwright repro also passed against the running fixed
worktree environment on `http://localhost:9927`:

```bash
WP_ENV_PORT=9927 \
WP_BASE_URL=http://localhost:9927 \
RTC_MANIFEST_WS_START_PORT=20616 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

The targeted build command was reattempted again:

```bash
WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production \
node packages/wp-build/lib/build.mjs
```

It failed outside this change after transpiling `sync`, `data`, and
`core-data`, on the same local missing stylesheet dependency:

```text
@use "@arraypress/waveform-player/dist/waveform-player";
```

## Pass 46 verification

Pass 46 independently reran the targeted checks and verified that the existing
PR branch and video/fix standard still hold.

The known-fixes checkout was still `3cba2b1e56a`. Its requested test
environment was running, but `wp-env status` showed the configured `9902` URL
was mapped to actual host port `9906`:

```text
status: running
url: http://localhost:9902
http port: 9906
```

Running the focused repro against `9906` failed before the bug path because
the joined page never became collaboration-ready. This was treated as an
environment/readiness failure, not as product evidence:

```text
TimeoutError: page.waitForFunction: Timeout 15000ms exceeded
waitForCollaborationReady
```

The already-running known-fixes environment on `http://localhost:9903`
reproduced the real product failure again:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
WP_ENV_PORT=9903 \
WP_BASE_URL=http://localhost:9903 \
RTC_MANIFEST_WS_START_PORT=20416 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-46/playwright-known-fixes-9903 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-46 screenshots show the same post saved in two same-user editor
tabs with different titles: one tab at the initial title and the other at the
customer title.

The fresh pass-46 trace was decoded with the dynamic post-ID decoder. It found
post `125` and reproduced the same persistence-boundary split:

```text
#6 post=125 2026-05-05T23:31:04.249Z POST 200 /wp-json/wp/v2/posts/125?_locale=user
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload initial"
  request.restContent="Initial body. | same user post-reload active edit"
  request.crdtContent="Initial body."
  response.restTitle="RTC same-user save-after-reload customer title"
  response.crdtTitle="RTC same-user save-after-reload initial"

request title/CRDT title mismatches: 1
```

The action stream from that trace used ordinary editor operations: open the
post, join the same post as the same admin user, fill the title field, edit a
paragraph, reload the same-user page, edit another paragraph, and click
`Save draft`. No synthetic block tree, direct store mutation, malformed block
injection, or artificial transport fault was involved.

Pass 46 also reran the lower-level repro suite. At the test-only commit
`c30db1c133d`, before the fix, the targeted suite failed with the expected
eight repro assertions:

```text
Test Suites: 4 failed, 4 total
Tests:       8 failed, 115 passed, 123 total
```

Representative failures again covered the exact obligations of the fix:

```text
Expected path: not "title"
Received value: "Persisted Title"

Expected: "Customer title"
Received: "Initial title"
```

At fix commit `0349549d2fe`, the same lower-level suite passed:

```bash
npm run test:unit -- \
  packages/core-data/src/test/entities.js \
  packages/core-data/src/test/resolvers.js \
  packages/core-data/src/utils/test/crdt.ts \
  packages/sync/src/test/manager.ts \
  --runInBand
```

Result:

```text
Test Suites: 4 passed, 4 total
Tests:       123 passed, 123 total
```

The fixed natural-user browser repro also passed on the PR branch using the
actual mapped test-container port `9927`:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-6f589c89600c
WP_ENV_PORT=9927 \
WP_BASE_URL=http://localhost:9927 \
RTC_MANIFEST_WS_START_PORT=20616 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-46/playwright-fixed \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

The PR branch remains based exactly on `origin/trunk` at
`02bfdaa5ca96deb050cd0c40bad1c1da75858caf` and keeps the requested commit
order:

```text
c30db1c133d Add RTC title reload unit repros
80c71d4d9a1 Add same-user title save-after-reload browser repro
0349549d2fe Preserve RTC title across reload saves
```

Pass 46 refreshed the local origin analysis with `git log`, `git blame`, and
`git show --stat`. The relevant unchanged blame points are:

- `packages/sync/src/manager.ts` still calls `getChangesFromCRDTDoc( ydoc, await handlers.getEditedRecord() )` on trunk, without persisted-record context.
- `packages/sync/src/manager.ts` still serializes `entityState.ydoc` after one event-loop tick in `createPersistedCRDTDoc`, without applying the exact save record first.
- `packages/core-data/src/entities.js` still calls the pre-persist CRDT serialization path without passing the current save edits on trunk.
- `packages/core-data/src/utils/crdt.ts` still treats a CRDT raw title/content/excerpt value that differs from the edited raw value as a field change, without recognizing an exact replay of the persisted raw base.

The targeted package build was reattempted:

```bash
WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production \
node packages/wp-build/lib/build.mjs
```

It again failed outside the changed code after transpiling `sync`, `data`, and
`core-data`, on the same local missing stylesheet dependency:

```text
@use "@arraypress/waveform-player/dist/waveform-player";
```

Pass 46 generated a fresh annotated stitched video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-46/6f589c89600c-title-loss-analysis-pass46-stitch.mp4
```

Video verification:

```text
width=1920
height=1080
duration=35.000000
nb_frames=1050
```

## Pass 49 verification

Pass 49 rechecked the bug independently from the current local state rather
than only carrying forward pass 48.

After fetching `origin/trunk`, the trunk tip in this environment remained:

```text
02bfdaa5ca96deb050cd0c40bad1c1da75858caf
```

The PR branch still has exactly the requested commit order:

```text
c30db1c133d Add RTC title reload unit repros
80c71d4d9a1 Add same-user title save-after-reload browser repro
0349549d2fe Preserve RTC title across reload saves
```

The lowest-level targeted repro suite still fails before the fix at the
test-only commit `c30db1c133d`:

```text
Test Suites: 4 failed, 4 total
Tests:       8 failed, 115 passed, 123 total
```

The failures again cover the exact root-cause obligations:

```text
Expected path: not "title"
Received value: "Persisted Title"

Expected: "Customer title"
Received: "Initial title"
```

The same suite passes after the fix:

```text
Test Suites: 4 passed, 4 total
Tests:       123 passed, 123 total
```

Pass 49 also reran the natural-user browser repro. The requested `9902`
known-fixes start failed before testing because that port was already allocated
by another running `wp-env` environment:

```text
Bind for 0.0.0.0:9902 failed: port is already allocated
```

The known-fixes environment was therefore started on the unused alternate port
`9906`. On known-fixes commit `3cba2b1e56a`, the same headless Playwright repro
failed:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-49 known-fixes screenshots again show the same saved post open
in two same-user tabs with divergent titles: the active saved tab has reverted
to `RTC same-user save-after-reload initial`, while the other same-user tab
still shows `RTC same-user save-after-reload customer title`.

The pass-49 trace was decoded from scratch. It used post `334` and gives the
same narrower payload-level proof as prior passes: the final REST save request
sent the customer title, but the serialized `_crdt_document` still contained the
initial title.

```text
#6 post=334 2026-05-06T00:10:08.767Z POST 200 /wp-json/wp/v2/posts/334?_locale=user
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload initial"
  response.restTitle="RTC same-user save-after-reload customer title"
  response.crdtTitle="RTC same-user save-after-reload initial"

request title/CRDT title mismatches: 1
```

The fresh action trace contains ordinary editor actions: login, open the post,
type paragraph text, reload one same-user browser session, fill the title
textbox with the customer title, type another paragraph edit, and click
`Save draft`. There is no direct store mutation, synthetic block tree, malformed
block injection, artificial transport fault, locator failure, or timeout.

The same natural-user repro passed headlessly on the fixed branch against the
running fixed worktree test site on mapped host port `9927`:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

Pass 49 rechecked the origin proof with `git show`, `git log`, and `git blame`.
The relevant pre-fix blame points remain:

- `packages/core-data/src/entities.js` called `createPersistedCRDTDoc( objectType, objectId )` without the exact current save edits.
- `packages/sync/src/manager.ts` serialized `entityState.ydoc` after one event-loop tick, so a same-user reload race could serialize an older Y.Doc snapshot than the REST save payload.
- `packages/sync/src/manager.ts` diffed remote CRDT state against only `await handlers.getEditedRecord()`, with no persisted raw record.
- `packages/core-data/src/utils/crdt.ts` treated exact persisted raw `title`/`content`/`excerpt` replays as edits when the active editor had a dirty local value.

The pass-49 review does not change the fix plan. The existing fix remains the
smallest adequate shape: serialize the record being saved into the persisted
CRDT document, pass the persisted raw record into CRDT diffing, and suppress
only exact persisted raw title/content/excerpt replays while the active editor
has a dirty local value.

The pass-46 annotated stitched video remains the video artifact. Pass 49
verified it again:

```text
width=1920
height=1080
duration=35.000000
nb_frames=1050
```

The pass-49 extracted frame is:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-49/6f589c89600c-pass46-video-pass49-frame.png
```

## Pass 50 verification

Pass 50 added fresh before/after verification rather than relying only on the
pass-49 result.

The source trace was decoded again from the archived run. The final save in the
source trace still gives the minimal payload proof:

```text
#6 post=226 2026-05-05T10:24:04.080Z POST 200 /wp-json/wp/v2/posts/226?_locale=user
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload initial"
  response.restTitle="RTC same-user save-after-reload customer title"
  response.crdtTitle="RTC same-user save-after-reload initial"
```

The pass-50 action trace has normal editor actions only: login, open post, edit
a paragraph, reload the same-user tab, fill the title textbox, edit another
paragraph, and click `Save draft`.

The targeted non-Playwright repro suite still fails before the fix at
`c30db1c133d`:

```text
Test Suites: 4 failed, 4 total
Tests:       8 failed, 115 passed, 123 total
```

Representative pass-50 failures:

```text
Expected path: not "title"
Received value: "Persisted Title"

Expected: "Customer title"
Received: "Initial title"
```

The same suite passes at fix head `0349549d2fe`:

```text
Test Suites: 4 passed, 4 total
Tests:       123 passed, 123 total
```

Pass 50 reran the focused browser repro on the already-running known-fixes
environment at `http://localhost:9906`. The known-fixes checkout was
`3cba2b1e56a`, and the repro still failed:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-50 known-fixes trace used post `338` and reproduced the same
REST/CRDT split:

```text
#6 post=338 2026-05-06T00:23:09.276Z POST 200 /wp-json/wp/v2/posts/338?_locale=user
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload initial"
  response.restTitle="RTC same-user save-after-reload customer title"
  response.crdtTitle="RTC same-user save-after-reload initial"
```

The fixed branch passed the focused natural-user Playwright repro headlessly on
the running fixed worktree environment at `http://localhost:9927`:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

The code-level origin proof remains unchanged after the fresh pass-50 audit:

- `prePersistPostType` serialized `_crdt_document` without passing the current
  save edits to `createPersistedCRDTDoc`.
- `createPersistedCRDTDoc` waited one tick and serialized the manager's current
  `Y.Doc`, which can lag behind the REST save payload after a same-user reload.
- `_updateEntityRecord` called `getChangesFromCRDTDoc` with only the edited
  record, so CRDT diffing could not tell an exact persisted raw replay from a
  new remote edit.
- `getPostChangesFromCRDTDoc` therefore treated stale persisted raw
  `title`/`content`/`excerpt` values as changes against dirty local edits.

The existing pass-46 stitched video remains valid and was checked again in
pass 50:

```text
width=1920
height=1080
duration=35.000000
nb_frames=1050
```

The pass-50 extracted video frame is:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-50/6f589c89600c-pass46-video-pass50-frame.png
```

## Pass 51 verification

Pass 51 independently rechecked the source failure, branch shape, failing
known-fixes behavior, pre-fix non-Playwright repros, fixed non-Playwright
suite, and fixed natural-user Playwright repro.

The source artifact decode again gives the product-level failure, not a
readiness wait or assertion inversion. The final REST save carries the customer
title, while the serialized `_crdt_document` still carries the initial title:

```text
#6 post=226 2026-05-05T10:24:04.080Z POST 200 /wp-json/wp/v2/posts/226?_locale=user
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload initial"
  response.restTitle="RTC same-user save-after-reload customer title"
  response.crdtTitle="RTC same-user save-after-reload initial"
```

The source trace actions remain normal editor actions: login, open the post,
type a paragraph edit, reload the same-user browser session, fill the title
textbox, type another paragraph edit, and click `Save draft`.

Pass 51 reran the focused natural-user repro on the known-fixes checkout at
`http://localhost:9906`; the checkout still failed:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-51 known-fixes trace used post `342` and reproduced the same
payload split:

```text
#6 post=342 2026-05-06T00:36:15.150Z POST 200 /wp-json/wp/v2/posts/342?_locale=user
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload initial"
  response.restTitle="RTC same-user save-after-reload customer title"
  response.crdtTitle="RTC same-user save-after-reload initial"
```

The first PR commit, `c30db1c133d`, contains only the non-Playwright repros.
Running the four targeted suites at that commit failed as expected:

```text
Test Suites: 4 failed, 4 total
Tests:       8 failed, 115 passed, 123 total
```

Representative failures prove the lower-level defect:

```text
Expected path: not "title"
Received value: "Persisted Title"

Expected: "Customer title"
Received: "Initial title"
```

At the fixed PR head, `0349549d2fe`, the same non-Playwright suite passed:

```text
Test Suites: 4 passed, 4 total
Tests:       123 passed, 123 total
```

The fixed PR head also passed the focused natural-user Playwright repro
headlessly on the running fixed worktree environment at
`http://localhost:9927`:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

Pass 51 also verified that the PR branch still has the requested commit order
on top of `origin/trunk`:

```text
c30db1c133d Add RTC title reload unit repros
80c71d4d9a1 Add same-user title save-after-reload browser repro
0349549d2fe Preserve RTC title across reload saves
```

The pass-46 stitched video remains the canonical annotated headless video and
was checked again in pass 51:

```text
width=1920
height=1080
duration=35.000000
nb_frames=1050
```

## Pass 52 verification

Pass 52 added a fresh, narrower payload proof on the known-fixes checkout and
reran both sides of the repro pair.

The known-fixes checkout was still at:

```text
3cba2b1e56a98787de08dc6c7df2434759e8f908
```

The running known-fixes `wp-env` test environment used HTTP port `9906`.
Rerunning only the natural-user repro still failed without a timeout:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-52 trace used post `346` and reproduced the same invariant
break at the final save: the REST record saved the customer title, but the
serialized CRDT metadata sent with that same save still contained the initial
title.

```text
#6 post=346 2026-05-06T00:51:42.094Z POST 200 /wp-json/wp/v2/posts/346?_locale=user
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload initial"
  request.restContent="Initial body. | same user post-reload active edit"
  request.crdtContent="Initial body."
  response.restTitle="RTC same-user save-after-reload customer title"
  response.crdtTitle="RTC same-user save-after-reload initial"
```

The decoded trace actions were still normal user actions:

```text
goto /wp-login.php
fill #user_login admin
fill #user_pass password
click Log In
goto /wp-admin/post.php?post=346&action=edit
type same user save-after-reload edit
reload
fill Add title RTC same-user save-after-reload customer title
type same user post-reload active edit
click Save draft
```

This rules out the main non-product explanations again: there was no timeout,
locator failure, direct state mutation, malformed block injection, synthetic
block tree, artificial transport fault, or inverted assertion. The final save
request itself proves that two persisted representations diverged.

Pass 52 reran the first PR commit, `c30db1c133d`, which contains only the
non-Playwright repro tests. The tests failed as expected before the fix:

```text
Test Suites: 4 failed, 4 total
Tests:       8 failed, 115 passed, 123 total
```

The failures isolate the two root-cause facts:

```text
Expected path: not "title"
Received value: "Persisted Title"

Expected: "Customer title"
Received: "Initial title"

Expected getPersistedRecord in sync-manager handlers
Received handlers without getPersistedRecord
```

At the fixed PR head, `0349549d2fe`, the same lower-level suite passed:

```text
Test Suites: 4 passed, 4 total
Tests:       123 passed, 123 total
```

The fixed branch also passed the focused natural-user Playwright repro
headlessly on the running fixed worktree environment at
`http://localhost:9927`:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

Pass 52 rechecked that the built assets in the fixed worktree contain the
`getPersistedRecord` and `persistedRecord` paths used by `wp-env`, and verified
the existing annotated stitched video again:

```text
width=1920
height=1080
duration=35.000000
nb_frames=1050
```

## Pass 53 verification

Pass 53 added a direct before/after trace comparison with tracing enabled for
both the known-fixes repro and the fixed PR branch.

The known-fixes checkout was still `3cba2b1e56a`. Its running `wp-env` test
environment on port `9906` reproduced the natural-user failure again:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-53 known-fixes trace used post `350`. Its final save request
again wrote the user's raw REST title while storing `_crdt_document` from the
initial snapshot:

```text
#6 post=350 2026-05-06T01:09:48.828Z POST 200 /wp-json/wp/v2/posts/350?_locale=user
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload initial"
  request.restContent="Initial body. | same user post-reload active edit"
  request.crdtContent="Initial body."
  response.restTitle="RTC same-user save-after-reload customer title"
  response.crdtTitle="RTC same-user save-after-reload initial"

request title/CRDT title mismatches: 1
```

At the fixed PR head `0349549d2fe`, the focused non-Playwright suite passed:

```text
Test Suites: 4 passed, 4 total
Tests:       123 passed, 123 total
```

The test-only commit `c30db1c133d` still fails those same repro tests before
the fix:

```text
Test Suites: 4 failed, 4 total
Tests:       8 failed, 115 passed, 123 total
```

The fixed natural-user Playwright repro passed headlessly with trace recording
enabled against the running fixed worktree environment on port `9927`:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

The fresh fixed trace used post `165`. Its final save request now carries the
customer title and edited content in both the REST fields and the serialized
CRDT metadata:

```text
#4 post=165 2026-05-06T01:10:52.919Z POST 200 /wp-json/wp/v2/posts/165?_locale=user
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload customer title"
  request.restContent="Initial body. | same user post-reload active edit"
  request.crdtContent="Initial body. | same user post-reload active edit"
  response.restTitle="RTC same-user save-after-reload customer title"
  response.crdtTitle="RTC same-user save-after-reload customer title"

request title/CRDT title mismatches: 0
```

This is the narrowest pass-53 proof that the existing fix addresses the actual
defect: it changes the save payload invariant itself, not just the final UI
assertion.

## Pass 54 verification

Pass 54 independently re-read the source result, log, screenshots, error
context, and trace. The original shard run failed without timing out after four
same-file controls passed. The source screenshots show the same post saved in
two same-user tabs with divergent titles: the active saved editor has reverted
to `RTC same-user save-after-reload initial`, while the other same-user tab
still shows `RTC same-user save-after-reload customer title`.

The source trace was decoded again from the archived `trace.zip`. The final
save in the source run remains the product-level invariant break:

```text
#6 post=226 2026-05-05T10:24:04.080Z POST /wp-json/wp/v2/posts/226?_locale=user
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload initial"
  request.restContent="Initial body. | same user post-reload active edit | same user save-after-reload edit"
  request.crdtContent="Initial body."

request title/CRDT title mismatches: 1
```

That proves the failure is not an inverted assertion, locator issue, readiness
wait, malformed generated spec, direct state mutation, synthetic block tree,
malformed block injection, artificial transport fault, or environment failure.
The saved REST payload and serialized `_crdt_document` disagree in the same
successful HTTP save request.

Pass 54 reran the focused natural-user repro on the known-fixes checkout
`3cba2b1e56a` using the already-running test environment on port `9906`. It
failed again:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-54 known-fixes trace used post `354` and reproduced the same
payload split:

```text
#6 post=354 2026-05-06T01:28:14.796Z POST /wp-json/wp/v2/posts/354?_locale=user
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload initial"
  request.restContent="Initial body. | same user post-reload active edit"
  request.crdtContent="Initial body."

request title/CRDT title mismatches: 1
```

The fixed PR head `0349549d2fe` still passes the focused non-Playwright suite:

```text
Test Suites: 4 passed, 4 total
Tests:       123 passed, 123 total
```

The first PR commit, `c30db1c133d`, contains only the non-Playwright repros and
still fails before the fix:

```text
Test Suites: 4 failed, 4 total
Tests:       8 failed, 115 passed, 123 total
```

The representative failures again isolate the code-level obligations:

```text
Expected path: not "title"
Received value: "Persisted Title"

Expected: "Customer title"
Received: "Initial title"

Expected getPersistedRecord in sync-manager handlers
Received handlers without getPersistedRecord
```

The fixed natural-user Playwright repro passed headlessly with tracing enabled
against the fixed worktree environment on port `9927`:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

The fresh pass-54 fixed trace used post `169`. Its final save has matching REST
and CRDT title/content:

```text
#4 post=169 2026-05-06T01:28:34.411Z POST /wp-json/wp/v2/posts/169?_locale=user
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload customer title"
  request.restContent="Initial body. | same user post-reload active edit"
  request.crdtContent="Initial body. | same user post-reload active edit"

request title/CRDT title mismatches: 0
```

Pass 54 also tightened the pre-fix code proof with fresh blame checks on
`origin/trunk`:

- `packages/core-data/src/entities.js` still calls
  `createPersistedCRDTDoc( objectType, objectId )` without the current save
  edits.
- `packages/sync/src/manager.ts` still waits one event-loop tick and serializes
  `entityState.ydoc`; after a same-user reload race that snapshot can lag the
  REST record being saved.
- `packages/core-data/src/utils/crdt.ts` still compares raw
  `title`/`content`/`excerpt` CRDT values only against the active edited raw
  value, so an exact persisted raw replay is misclassified as a new change when
  the editor has a dirty local value.

The existing pass-46 stitched video remains the video artifact. Pass 54
verified its stream metadata and sampled a frame that shows the annotated trace
decode:

```text
width=1920
height=1080
duration=35.000000
nb_frames=1050
```

## Pass 55 verification

Pass 55 added a narrower independent repro check at the sync-manager level and
reran the focused browser repro on both the known-fixes base and the fixed
worktree.

The known-fixes checkout `3cba2b1e56a` still fails the natural-user repro on
the already-running test environment at port `9906`:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-55 known-fixes trace used post `358`. Its final successful save
again persists the customer title in the REST fields while writing an initial
title into `_crdt_document`:

```text
#6 post=358 2026-05-06T01:38:51.856Z POST /wp-json/wp/v2/posts/358?_locale=user
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload initial"
  request.restContent="Initial body. | same user post-reload active edit"
  request.crdtContent="Initial body."

request title/CRDT title mismatches: 1
```

The trace action stream is ordinary Playwright user interaction: login, open the
post editor, type paragraph text, reload one browser session, fill the title,
type another paragraph edit, and click `Save draft`. There is no direct store
mutation, malformed block injection, synthetic block tree, or transport fault in
this repro.

The test-only PR commit `c30db1c133d` was checked with the lowest runnable
non-Playwright file in this dependency snapshot:

```bash
npm run test:unit -- packages/sync/src/test/manager.ts --runInBand
```

It fails before the fix with the two targeted sync-manager obligations:

```text
Expected: "Customer title"
Received: "Initial title"

Expected getChangesFromCRDTDoc(..., persistedRecord)
Received getChangesFromCRDTDoc(..., editedRecord)
```

The same command passes at fixed PR head `0349549d2fe`:

```text
Test Suites: 1 passed, 1 total
Tests:       28 passed, 28 total
```

The broader four-file unit command was attempted in pass 55, but this shared
node_modules snapshot is missing `framer-motion`, which blocks the core-data
test files before they reach the repro assertions. The sync-manager file avoids
that unrelated import path and directly exercises the persistence bug.

The fixed worktree browser repro still passes headlessly against the running
fixed test environment at actual HTTP port `9927`:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

Pass 55 also rechecked the canonical pass-46 stitched video. The video is still
present and readable:

```text
width=1920
height=1080
duration=35.000000
nb_frames=1050
```

The sampled frame written to
`pass-55/6f589c89600c-pass55-video-frame.png` shows the annotated trace decode
with the REST title set to the customer title and the CRDT title set to the
initial title.

## Pass 56 verification

Pass 56 rechecked the original source-run trace rather than only relying on the
later pass-55 reproduction. The archived source trace used post `226`; the final
save request already contains the product invariant violation below the
Playwright assertion layer:

```text
#6 post=226 2026-05-05T10:24:04.080Z POST /wp-json/wp/v2/posts/226?_locale=user
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload initial"
  request.restContent="Initial body. | same user post-reload active edit | same user save-after-reload edit"
  request.crdtContent="Initial body."

request title/CRDT title mismatches: 1
```

The source action stream is still ordinary browser use: login, open the post,
type paragraph text, reload, fill the title, type another paragraph edit, and
click `Save draft`. The error context also shows the visible title as the
customer title while `getEditedPostAttribute( 'title' )` returned the initial
title, so this remains a live editor-state rollback rather than a locator,
readiness, REST polling, or inverted assertion issue.

Pass 56 then reran the focused natural-user browser repro on the known-fixes
base. The known-fixes checkout still fails:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-56 known-fixes trace used post `362` and reproduced the same
split save payload:

```text
#6 post=362 2026-05-06T01:59:58.333Z POST /wp-json/wp/v2/posts/362?_locale=user
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload initial"
  request.restContent="Initial body. | same user post-reload active edit"
  request.crdtContent="Initial body."

request title/CRDT title mismatches: 1
```

The PR branch `try/rtc-safe-sync-title-lost-after-reload-6f589c89600c-pr`
still has the requested commit order:

```text
c30db1c133d Add RTC title reload unit repros
80c71d4d9a1 Add same-user title save-after-reload browser repro
0349549d2fe Preserve RTC title across reload saves
```

Fresh detached pass-56 worktrees reran the sync-manager unit proof before and
after the fix. At the test-only commit `c30db1c133d`, the targeted file fails
with the two required obligations:

```text
Test Suites: 1 failed, 1 total
Tests:       2 failed, 26 passed, 28 total

Expected: "Customer title"
Received: "Initial title"

Expected getChangesFromCRDTDoc(..., persistedRecord)
Received getChangesFromCRDTDoc(..., editedRecord)
```

At fixed PR head `0349549d2fe`, the same command passes:

```text
Test Suites: 1 passed, 1 total
Tests:       28 passed, 28 total
```

Pass 56 also attempted the lower-level
`packages/core-data/src/utils/test/crdt.ts` route on both the test-only and
fixed heads, but this dependency snapshot still fails before assertions because
`framer-motion` is missing from the shared `node_modules` tree. That result does
not bear on the product bug; the sync-manager unit file and the browser repro
remain the runnable before/after checks in this environment.

The fixed PR branch browser repro passed headlessly against the running fixed
wp-env instance at actual HTTP port `9927`:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

Pass 56 rechecked the canonical stitched headless video from pass 46:

```text
width=1920
height=1080
duration=35.000000
nb_frames=1050
```

The sampled frame written to
`pass-56/6f589c89600c-pass56-video-frame.png` shows the annotated trace decode
with the REST title equal to the customer title and the CRDT title equal to the
initial title.

## Pass 57 verification

Pass 57 independently decoded the original archived source trace into a fresh
pass-57 trace directory. The source run still shows the bad state in the HTTP
save payload itself, before the final Playwright assertion:

```text
#6 post=226 2026-05-05T10:24:04.080Z POST /wp-json/wp/v2/posts/226?_locale=user
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload initial"
  response.restTitle="RTC same-user save-after-reload customer title"
  response.crdtTitle="RTC same-user save-after-reload initial"

request title/CRDT title mismatches: 1
```

That confirms the failure is not a stale REST poll, readiness wait, locator
mistake, or inverted assertion. The save sends a raw post title from one
snapshot and `_crdt_document` metadata from another.

Pass 57 reran the focused natural-user browser repro on the known-fixes base
commit `3cba2b1e56a98787de08dc6c7df2434759e8f908`:

```bash
WP_ENV_PORT=9906 \
WP_BASE_URL=http://localhost:9906 \
RTC_MANIFEST_WS_START_PORT=20416 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-57/playwright-known-fixes-9906 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-57 known-fixes trace used post `366` and reproduced the same
split final save:

```text
#6 post=366 2026-05-06T02:13:07.067Z POST /wp-json/wp/v2/posts/366?_locale=user
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload initial"
  response.restTitle="RTC same-user save-after-reload customer title"
  response.crdtTitle="RTC same-user save-after-reload initial"

request title/CRDT title mismatches: 1
```

Pass 57 also reran the full four-file non-Playwright before/after proof. At
the test-only commit `80c71d4d9a1`, the lower-level repros fail exactly where
the fix is expected to apply:

```bash
git switch --detach 80c71d4d9a1
npm run test:unit -- \
  packages/core-data/src/test/entities.js \
  packages/core-data/src/test/resolvers.js \
  packages/core-data/src/utils/test/crdt.ts \
  packages/sync/src/test/manager.ts \
  --runInBand
```

Result:

```text
Test Suites: 4 failed, 4 total
Tests: 8 failed, 115 passed, 123 total
```

The failing assertions cover the narrow root cause: serializing the older local
CRDT snapshot instead of the record being saved, missing persisted-record
context in the sync manager and resolver handlers, and accepting a stale
persisted-title replay as an editor change.

At fixed PR head `0349549d2fe9b99e14ae78b4b1e75e1d30cf9557`, the same
lower-level command passes:

```text
Test Suites: 4 passed, 4 total
Tests: 123 passed, 123 total
```

The fixed natural-user browser repro also passed against the already-running
fixed test environment at actual HTTP port `9927`:

```bash
WP_ENV_PORT=9902 \
WP_BASE_URL=http://localhost:9927 \
RTC_MANIFEST_WS_START_PORT=20416 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-57/playwright-fixed-9927 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

The focused package build was attempted again:

```bash
WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production \
node packages/wp-build/lib/build.mjs
```

It still fails after transpiling the affected `sync`, `data`, and `core-data`
packages because this dependency snapshot is missing the unrelated Sass import:

```text
@use "@arraypress/waveform-player/dist/waveform-player";
```

The canonical stitched headless video from pass 46 remains present and
readable:

```text
width=1920
height=1080
duration=35.000000
nb_frames=1050
```

## Pass 58 verification

Pass 58 rebased both branches onto current `origin/trunk`
`0742e801c4e12ee31316faa1f8ed9be11a4782c7` after trunk advanced by the
unrelated media-editor commit `Media editor: replace fine-rotation slider with
RotationRuler (#77906)`. This removed the stale trunk delta from the PR branch
diff. The PR branch now contains only the three intended commits:

```text
0f5733368ea Add RTC title reload unit repros
abd929b5982 Add same-user title save-after-reload browser repro
42bdfd105fc Preserve RTC title across reload saves
```

The pass-58 archived-source trace decode independently reproduced the payload
invariant violation:

```text
#6 post=226 2026-05-05T10:24:04.080Z POST /wp-json/wp/v2/posts/226?_locale=user
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload initial"
  response.restTitle="RTC same-user save-after-reload customer title"
  response.crdtTitle="RTC same-user save-after-reload initial"

request title/CRDT title mismatches: 1
```

The trace action log contains normal browser actions only: login, open post,
fill the title textbox, type into paragraph blocks, reload a same-user page,
save draft, and REST reads. No Playwright action error appears before the final
assertion.

Pass 58 reran the natural-user browser repro on the known-fixes checkout
`3cba2b1e56a98787de08dc6c7df2434759e8f908`; it still fails:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-58 known-fixes trace used post `370` and again showed the same
mixed final save:

```text
#6 post=370 2026-05-06T02:25:44.944Z POST /wp-json/wp/v2/posts/370?_locale=user
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload initial"
  response.restTitle="RTC same-user save-after-reload customer title"
  response.crdtTitle="RTC same-user save-after-reload initial"

request title/CRDT title mismatches: 1
```

At the rebased test-only commit `abd929b5982`, the lower-level repro tests
still fail in the expected eight assertions:

```text
Test Suites: 4 failed, 4 total
Tests: 8 failed, 115 passed, 123 total
```

At the rebased fix head `42bdfd105fc`, the same tests pass:

```text
Test Suites: 4 passed, 4 total
Tests: 123 passed, 123 total
```

The rebased fixed branch also passes the natural-user browser repro
headlessly:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

The targeted production build command was rerun after the rebase:

```bash
WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production \
node packages/wp-build/lib/build.mjs
```

It still fails later on the unrelated missing Sass dependency:

```text
@use "@arraypress/waveform-player/dist/waveform-player";
```

No files were left modified by that failed build. The canonical stitched
headless video from pass 46 remains readable:

```text
width=1920
height=1080
duration=35.000000
nb_frames=1050
```

## Pass 59 verification

Pass 59 re-read the pass-58 summary, source result, source log, screenshots,
fresh known-fixes artifacts, and relevant source. It did not find a stronger
negative classification. The failure still reproduces as a product defect, not
as readiness, locator, malformed-spec, environment, stale-REST-read, or
inverted-assertion noise.

The archived source trace was decoded again into a pass-59 directory. The final
source save still proves the snapshot split at the HTTP payload boundary:

```text
#6 post=226 2026-05-05T10:24:04.080Z POST /wp-json/wp/v2/posts/226?_locale=user
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload initial"
  request.restContent="Initial body. | same user post-reload active edit | same user save-after-reload edit"
  request.crdtContent="Initial body."
  response.restTitle="RTC same-user save-after-reload customer title"
  response.crdtTitle="RTC same-user save-after-reload initial"

request title/CRDT title mismatches: 1
```

The fresh known-fixes browser rerun on checkout
`3cba2b1e56a98787de08dc6c7df2434759e8f908` still fails:

```bash
WP_ENV_PORT=9906 \
WP_BASE_URL=http://localhost:9906 \
RTC_MANIFEST_WS_START_PORT=20416 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-59/playwright-known-fixes-9906 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-59 known-fixes trace used post `374` and reproduced the same
final-save invariant violation:

```text
#6 post=374 2026-05-06T02:39:11.273Z POST /wp-json/wp/v2/posts/374?_locale=user
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload initial"
  request.restContent="Initial body. | same user post-reload active edit"
  request.crdtContent="Initial body."
  response.restTitle="RTC same-user save-after-reload customer title"
  response.crdtTitle="RTC same-user save-after-reload initial"

request title/CRDT title mismatches: 1
```

The action logs in both the archived source trace and the fresh known-fixes
trace contain no Playwright action errors before the final assertion.

The PR branch is still based directly on current `origin/trunk`
`0742e801c4e12ee31316faa1f8ed9be11a4782c7` and still has exactly the requested
three commits:

```text
0f5733368ea Add RTC title reload unit repros
abd929b5982 Add same-user title save-after-reload browser repro
42bdfd105fc Preserve RTC title across reload saves
```

Pass 59 reran the lower-level repro suite before and after the fix. At the
test-only commit `abd929b5982`, it fails in the same eight root-cause
assertions:

```text
Test Suites: 4 failed, 4 total
Tests: 8 failed, 115 passed, 123 total
```

Representative failures were the exact obligations of the fix:

```text
Expected path: not "title"
Received value: "Persisted Title"

Expected: "Customer title"
Received: "Initial title"
```

At fixed PR head `42bdfd105fc`, the same lower-level command passes:

```text
Test Suites: 4 passed, 4 total
Tests: 123 passed, 123 total
```

The natural-user Playwright repro also passes headlessly on the fixed branch
against the running fixed worktree environment:

```bash
WP_ENV_PORT=9902 \
WP_BASE_URL=http://localhost:9927 \
RTC_MANIFEST_WS_START_PORT=20416 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-59/playwright-fixed-9927 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

The build check was reattempted:

```bash
WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production \
node packages/wp-build/lib/build.mjs
```

The affected `sync`, `data`, and `core-data` packages transpiled, but the
overall build still fails later on the same unrelated missing Sass dependency:

```text
@use "@arraypress/waveform-player/dist/waveform-player";
```

Pass 59 therefore adds a fresh verification that the existing branch, fix, and
canonical pass-46 annotated video still satisfy the requested standard. The
video remains readable:

```text
width=1920
height=1080
duration=35.000000
nb_frames=1050
```

## Pass 60 verification

Pass 60 added a fresh payload-level trace proof independent of the earlier
trace decoder. The script read Playwright's `*.trace.network` resource
snapshots, opened the request/response JSON bodies by SHA, decoded
`meta._crdt_document` with `yjs`, and compared the raw REST title/content to
the persisted CRDT title/content.

The original source trace still shows the bug as a snapshot split, not a
readiness wait or stale REST poll:

```text
source post=226
2026-05-05T10:24:02.082Z request/rest title=initial
2026-05-05T10:24:02.082Z request/crdt title=customer title
2026-05-05T10:24:02.082Z request/rest paragraphs=1
2026-05-05T10:24:02.082Z request/crdt paragraphs=2

2026-05-05T10:24:04.080Z request/rest title=customer title
2026-05-05T10:24:04.080Z request/crdt title=initial
2026-05-05T10:24:04.080Z request/rest paragraphs=3
2026-05-05T10:24:04.080Z request/crdt paragraphs=1
```

The fresh pass-60 known-fixes browser rerun on
`3cba2b1e56a98787de08dc6c7df2434759e8f908` still fails:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh known-fixes trace repeats the same invariant violation on post `378`:

```text
known-fixes post=378
2026-05-06T02:52:49.098Z request/rest title=initial
2026-05-06T02:52:49.098Z request/crdt title=customer title

2026-05-06T02:52:51.574Z request/rest title=customer title
2026-05-06T02:52:51.574Z request/crdt title=initial
2026-05-06T02:52:51.574Z request/rest paragraphs=2
2026-05-06T02:52:51.574Z request/crdt paragraphs=1
```

Both the archived source trace and the fresh known-fixes trace have no
Playwright action errors before the final assertion. The failure screenshots
show the same split visible in the UI: one tab has saved back to the initial
title while the other tab still has the customer title.

The lower-level repro suite was rerun in pass 60. At the test-only commit
`abd929b5982`, it fails in the eight expected assertions: stale persisted title
replay, missing `getPersistedRecord` handler context, and stale
`createPersistedCRDTDoc` serialization. At fixed PR head `42bdfd105fc`, the
same command passes:

```text
Test Suites: 4 passed, 4 total
Tests:       123 passed, 123 total
```

The fixed branch remains based directly on current `origin/trunk`
`0742e801c4e12ee31316faa1f8ed9be11a4782c7` and still has exactly the requested
three-commit PR stack:

```text
0f5733368ea Add RTC title reload unit repros
abd929b5982 Add same-user title save-after-reload browser repro
42bdfd105fc Preserve RTC title across reload saves
```

The natural-user Playwright repro passes headlessly on the fixed branch when
run against the `wp-env` test container's mapped HTTP port:

```text
WP_ENV_PORT=9902
WP_BASE_URL=http://localhost:9927

1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

Pass 60 also found a port-footgun worth recording. In this worktree,
`npm run wp-env status -- --config .wp-env.test.json` reports URL
`http://localhost:9902` and mapped HTTP port `9927`. Running the fixed browser
repro with `WP_BASE_URL=http://localhost:9902` failed against stale or wrong
served assets, while the same branch and same test passed against the mapped
test port `http://localhost:9927`. This is an environment-selection issue, not
a regression in the fix; the lower-level tests and the mapped-port browser
repro both pass on the fixed branch.

The build check was reattempted in pass 60:

```bash
WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production \
node packages/wp-build/lib/build.mjs
```

As before, `sync`, `data`, and `core-data` transpiled, then the broader build
failed on the unrelated missing Sass import:

```text
@use "@arraypress/waveform-player/dist/waveform-player";
```

The root-cause analysis is unchanged but narrower after the pass-60 proof:
the product can write a REST payload whose raw title/content and
`_crdt_document` describe different logical snapshots. On reload, the diff path
has no raw persisted-record context and can treat the old persisted title as a
new CRDT change relative to the dirty editor state. The fix keeps the save
payload internally consistent by serializing the record being saved into the
persisted CRDT doc, and gives the reload diff enough persisted-record context
to suppress exact stale raw text-field replays.

## Pass 61 verification

Pass 61 reran the natural-user browser repro against the known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` on the active `wp-env` HTTP port
`9903`. The repro still fails without timeout:

```text
KNOWN_FIXES_E2E_EXIT=1
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-61 trace has no Playwright action errors before the final
assertion. Decoding the rerun trace again shows two saves with internally
inconsistent snapshots:

```text
known-fixes pass-61 post=349
2026-05-06T03:06:44.546Z request/rest title=initial
2026-05-06T03:06:44.546Z request/crdt title=customer title

2026-05-06T03:06:47.118Z request/rest title=customer title
2026-05-06T03:06:47.118Z request/crdt title=initial
2026-05-06T03:06:47.118Z request/rest paragraphs=2
2026-05-06T03:06:47.118Z request/crdt paragraphs=1
```

Pass 61 also reran the lowest clean non-Playwright repro at the sync-manager
boundary. On the test-only commit `0f5733368ea`, the suite fails exactly on the
two persistence/root-context invariants:

```text
packages/sync/src/test/manager.ts
Expected: "Customer title"
Received: "Initial title"

Expected call to include persistedRecord:
{"id":"123","meta":{},"title":"Persisted title"}
```

On fixed PR head `42bdfd105fc`, the same sync-manager suite passes:

```text
Test Suites: 1 passed, 1 total
Tests:       28 passed, 28 total
FIXED_SYNC_MANAGER_EXIT=0
```

The pass-61 checks strengthen the same root-cause proof: before the fix,
`createPersistedCRDTDoc` serializes an older local CRDT snapshot instead of the
record being saved, and `_updateEntityRecord` diffs incoming CRDT state without
the persisted raw record needed to identify stale raw title replays.

## Pass 62 verification

Pass 62 re-read the source result, source screenshots, source spec, pass-61
summary, trace decoder output, and the current PR stack. The classification is
unchanged: this is a real RTC product bug, not a generated-spec, locator,
readiness, environment, or inverted-assertion failure. Four neighboring tests
in the source run passed; the failing test used normal editor typing, reload,
and save actions.

Fresh known-fixes browser rerun on the active mapped `wp-env` HTTP port `9903`
still fails:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The pass-62 trace has no Playwright action errors before the final assertion.
Decoding the successful REST saves gives the same internal payload split:

```text
known-fixes pass-62 post=361
2026-05-06T03:17:17.367Z request/rest title=initial
2026-05-06T03:17:17.367Z request/crdt title=customer title
2026-05-06T03:17:17.367Z request/rest paragraphs=1
2026-05-06T03:17:17.367Z request/crdt paragraphs=2

2026-05-06T03:17:20.025Z request/rest title=customer title
2026-05-06T03:17:20.025Z request/crdt title=initial
2026-05-06T03:17:20.025Z request/rest paragraphs=3
2026-05-06T03:17:20.025Z request/crdt paragraphs=1

mismatches=2
```

Pass 62 reran the sync-manager repros again from clean temporary worktrees. At
the test-only head `0f5733368ea`, `packages/sync/src/test/manager.ts` fails on
exactly the two root-context invariants:

```text
serializes the record being saved instead of an older local CRDT snapshot
Expected: "Customer title"
Received: "Initial title"

passes the persisted record when remote updates are diffed
Expected call to include {"id":"123","meta":{},"title":"Persisted title"}
```

At fixed PR head `42bdfd105fc`, the same suite passes:

```text
Test Suites: 1 passed, 1 total
Tests:       28 passed, 28 total
```

Pass 62 also narrowed the origin proof. PR
[#72262](https://github.com/WordPress/gutenberg/pull/72262), merged as
`84019935998c`, introduced the edited-record-only CRDT diff shape:
`getChangesFromCRDTDoc( ydoc, await handlers.getEditedRecord() )`. That was
reasonable for detecting ordinary remote changes, but after PR
[#72373](https://github.com/WordPress/gutenberg/pull/72373) added persisted
CRDT documents, PR [#74668](https://github.com/WordPress/gutenberg/pull/74668)
started applying only detected persisted-document changes, PR
[#75448](https://github.com/WordPress/gutenberg/pull/75448) moved
title/content/excerpt to Y.Text, and PR
[#76017](https://github.com/WordPress/gutenberg/pull/76017) exercised the
reload path, the old raw persisted title could be reclassified as a new CRDT
change because the diff had no persisted raw-record context. PR
[#75975](https://github.com/WordPress/gutenberg/pull/75975) added a save-time
flush before CRDT serialization, but pass 62 again confirmed that flushing alone
does not guarantee the serialized CRDT document reflects the exact record being
saved.

The existing PR branch remains based on current `origin/trunk`
`0742e801c4e12ee31316faa1f8ed9be11a4782c7` and keeps the requested three-commit
order:

```text
0f5733368ea Add RTC title reload unit repros
abd929b5982 Add same-user title save-after-reload browser repro
42bdfd105fc Preserve RTC title across reload saves
```

Pass 62 attempted a fresh full build and isolated fixed Playwright rerun. The
build completed the JS and PHP workspace build phases, then failed in the theme
primitive-token generator with:

```text
TypeError: [object Object] is not a valid color space
```

Starting a separate fixed `wp-env` on port `9902` then failed before containers
started because Docker could not allocate another network:

```text
all predefined address pools have been fully subnetted
```

Those are environment/build-tool blockers for a fresh pass-62 fixed browser
rerun, not evidence against the fix. The fixed low-level repro passes, the
known-fixes browser repro freshly fails, the previous fixed natural-user
Playwright run and annotated stitched video remain available, and the video was
revalidated in pass 62:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-46/6f589c89600c-title-loss-analysis-pass46-stitch.mp4
width=1920
height=1080
nb_frames=1050
duration=35.000000
```

## Pass 63 verification

Pass 63 re-read the pass-62 summary, source result, source screenshots, source
trace, current branches, and relevant RTC code. The classification is still a
real product bug. The source failure and fresh pass-63 rerun both use normal
editor actions only: open the same draft twice as the same user, edit title and
paragraph text, reload one same-user session, edit again, and click Save draft.
The traces have no Playwright action errors before the final assertion.

The known-fixes `wp-env` test environment was already running. `wp-env status`
reported configured URL `http://localhost:9902` and mapped HTTP port `9906`, so
the fresh known-fixes browser repro used `WP_BASE_URL=http://localhost:9906`.
It still fails on known-fixes commit `3cba2b1e56a98787de08dc6c7df2434759e8f908`:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-63 known-fixes trace used post `382`. Its final save is the
payload-level bug:

```text
#6 post=382 2026-05-06T03:30:42.489Z POST /wp-json/wp/v2/posts/382?_locale=user
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload initial"
  request.restContent="Initial body. | same user post-reload active edit"
  request.crdtContent="Initial body."
  response.restTitle="RTC same-user save-after-reload customer title"
  response.crdtTitle="RTC same-user save-after-reload initial"

request title/CRDT title mismatches: 1
```

The lowest clean non-Playwright boundary was rerun from temporary worktrees.
At the test-only head `0f5733368ea`, `packages/sync/src/test/manager.ts` fails
on the two root-cause obligations:

```text
Test Suites: 1 failed, 1 total
Tests:       2 failed, 26 passed, 28 total

serializes the record being saved instead of an older local CRDT snapshot
Expected: "Customer title"
Received: "Initial title"

passes the persisted record when remote updates are diffed
Expected getChangesFromCRDTDoc(..., persistedRecord)
Received getChangesFromCRDTDoc(..., editedRecord)
```

At fixed PR head `42bdfd105fc`, the same sync-manager file passes:

```text
Test Suites: 1 passed, 1 total
Tests:       28 passed, 28 total
```

Pass 63 also reran the fixed natural-user Playwright repro headlessly against
the fixed worktree's running mapped test port `9927`. It passed:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

A second fixed run forced trace recording. Decoding that fixed trace gives the
before/after comparison missing from pass 62: the final fixed save now has the
same customer title and edited content in both the REST fields and persisted
CRDT metadata:

```text
#4 post=201 2026-05-06T03:32:43.291Z POST /wp-json/wp/v2/posts/201?_locale=user
  request.restTitle="RTC same-user save-after-reload customer title"
  request.crdtTitle="RTC same-user save-after-reload customer title"
  request.restContent="Initial body. | same user post-reload active edit"
  request.crdtContent="Initial body. | same user post-reload active edit"
  response.restTitle="RTC same-user save-after-reload customer title"
  response.crdtTitle="RTC same-user save-after-reload customer title"

request title/CRDT title mismatches: 0
```

The branch shape remains correct after fetching `origin/trunk`. The PR branch
is based directly on `0742e801c4e12ee31316faa1f8ed9be11a4782c7` and keeps the
required three-commit order:

```text
0f5733368ea Add RTC title reload unit repros
abd929b5982 Add same-user title save-after-reload browser repro
42bdfd105fc Preserve RTC title across reload saves
```

Pass 63 rechecked the origin commits:

```text
84019935998c Improve CRDT "merge logic" for post entities (#72262)
2d8b22633dd Real-time collaboration: Implement CRDT persistence for collaborative editing (#72373)
50b0a31ec01 Apply only detected changes from the persisted CRDT document (#74668)
22e067b0243 Real-time Collaboration: Use Y.text for title, content and excerpt (#75448)
8051e14451c RTC: Fix stale CRDT document persisted on save (#75975)
9375c0e0148 [Real-time Collaboration] Fix sync issue on refresh (#76017)
0c8d486a3d5 RTC: Reject stale persisted CRDT documents
```

The pass-63 trace comparison strengthens the existing root-cause proof rather
than changing the fix plan: before the fix, one successful save can persist raw
REST fields and `_crdt_document` from different snapshots; after the fix, the
save payload is internally consistent because the record being saved is applied
before CRDT metadata serialization, and persisted-record context is available
when diffing reload-time CRDT state.

The canonical pass-46 annotated stitched headless video remains valid and was
checked again:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-46/6f589c89600c-title-loss-analysis-pass46-stitch.mp4
width=1920
height=1080
duration=35.000000
nb_frames=1050
```

## Pass 64 verification

Pass 64 re-read the archived source trace and ran a fresh known-fixes browser
negative control on the already-running known-fixes test environment. The
focused natural-user repro still fails on known-fixes commit `3cba2b1e56a`:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
WP_ENV_PORT=9906 \
WP_BASE_URL=http://localhost:9906 \
RTC_MANIFEST_WS_START_PORT=20416 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-64/known-fixes-e2e-rerun \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

Both the archived source trace and the fresh known-fixes trace had no
Playwright action errors before the final assertion:

```bash
jq -r 'select(.type=="after") | select(.error? != null) |
  [.apiName, .error.message] | @tsv' \
  .../pass-64/source-trace/*-trace.trace

jq -r 'select(.type=="after") | select(.error? != null) |
  [.apiName, .error.message] | @tsv' \
  .../pass-64/known-fixes-e2e-rerun-trace/*-trace.trace
```

Result: no output for either trace.

Pass 64 also decoded the `_crdt_document` payloads from both traces. The same
title/CRDT split appears in the archived source run and in the fresh
known-fixes run:

```text
source final save:
2026-05-05T10:24:04.080Z POST /wp-json/wp/v2/posts/226?_locale=user
  request title="RTC same-user save-after-reload customer title"
  request CRDT title="RTC same-user save-after-reload initial"
  response title="RTC same-user save-after-reload customer title"
  response CRDT title="RTC same-user save-after-reload initial"

pass-64 known-fixes final save:
2026-05-06T03:40:38.754Z POST /wp-json/wp/v2/posts/386?_locale=user
  request title="RTC same-user save-after-reload customer title"
  request CRDT title="RTC same-user save-after-reload initial"
  response title="RTC same-user save-after-reload customer title"
  response CRDT title="RTC same-user save-after-reload initial"
```

That rules out a stale REST poll or an inverted assertion: the raw REST save is
successful, but the persisted CRDT metadata in the same save is stale.

The low-level sync-manager repro still fails at repro commit `0f5733368ea`:

```bash
cd /private/tmp/gutenberg-6f589c-pass63-testonly.igHpcw
npm run test:unit -- packages/sync/src/test/manager.ts --runInBand
```

Result:

```text
Test Suites: 1 failed, 1 total
Tests:       2 failed, 26 passed, 28 total

serializes the record being saved instead of an older local CRDT snapshot
Expected: "Customer title"
Received: "Initial title"

passes the persisted record when remote updates are diffed
Expected getChangesFromCRDTDoc(..., persistedRecord)
Received getChangesFromCRDTDoc(..., editedRecord)
```

At fixed PR head `42bdfd105fc`, the same sync-manager test passes:

```bash
cd /private/tmp/gutenberg-6f589c-pass63-fixed.eJ8wNP
npm run test:unit -- packages/sync/src/test/manager.ts --runInBand
```

Result:

```text
Test Suites: 1 passed, 1 total
Tests:       28 passed, 28 total
```

The broader fixed low-level command was attempted again, but the local shared
`node_modules` now lacks unrelated dependency `framer-motion`, so the
core-data suites failed during import before executing these repro assertions.
That is an environment/dependency gap, not a failure in the fixed sync-manager
path.

Pass 64 also checked the branch and video sufficiency:

```text
origin/trunk: 0742e801c4e12ee31316faa1f8ed9be11a4782c7
PR branch merge-base: 0742e801c4e12ee31316faa1f8ed9be11a4782c7

0f5733368ea Add RTC title reload unit repros
abd929b5982 Add same-user title save-after-reload browser repro
42bdfd105fc Preserve RTC title across reload saves

canonical video:
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-46/6f589c89600c-title-loss-analysis-pass46-stitch.mp4
width=1920 height=1080 duration=35.000000 nb_frames=1050
```

The existing PR branch, explanation branch, and annotated headless video still
satisfy the requested standard. Pass 64 adds a fresh known-fixes negative
control and a duplicate-independent payload decode, but does not require a code
change beyond this explanation update.

## Pass 65 update

Pass 65 independently redecoded the archived source trace into:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-65/source-trace
```

The final save request is still the strongest root-cause proof:

```text
2026-05-05T10:24:04.080Z POST /wp-json/wp/v2/posts/226?_locale=user
  request title="RTC same-user save-after-reload customer title"
  request CRDT title="RTC same-user save-after-reload initial"
  request body="Initial body. same user post-reload active edit same user save-after-reload edit"
  request CRDT body="<!-- wp:paragraph --><p>Initial body.</p><!-- /wp:paragraph -->"
  response title="RTC same-user save-after-reload customer title"
  response CRDT title="RTC same-user save-after-reload initial"
```

The source trace has two POST requests whose raw title and CRDT title disagree.
The action-error query again produced no output, so the source failure is not a
Playwright action failure.

Pass 65 also reran the natural-user browser repro directly on the known-fixes
checkout, using its already-running `wp-env` test environment on HTTP port
`9906`:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
WP_ENV_PORT=9906 \
WP_BASE_URL=http://localhost:9906 \
RTC_MANIFEST_WS_START_PORT=20416 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-65/known-fixes-e2e-rerun \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result on known-fixes commit `3cba2b1e56a`:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-65 known-fixes trace reproduced the same save-metadata split:

```text
2026-05-06T03:56:09.171Z POST /wp-json/wp/v2/posts/402?_locale=user
  request title="RTC same-user save-after-reload customer title"
  request CRDT title="RTC same-user save-after-reload initial"
  response title="RTC same-user save-after-reload customer title"
  response CRDT title="RTC same-user save-after-reload initial"
```

For the lowest non-Playwright proof, pass 65 used fresh temporary worktrees and
ran the narrow sync-manager test that decodes the persisted CRDT document after
save serialization:

```bash
cd /private/tmp/gutenberg-6f589c-pass65-testonly.hQAjsw
npm run test:unit -- packages/sync/src/test/manager.ts --runInBand \
  --testNamePattern="serializes the record being saved instead of an older local CRDT snapshot"
```

Result before the fix at `0f5733368ea`:

```text
FAIL packages/sync/src/test/manager.ts
Expected: "Customer title"
Received: "Initial title"
```

The same test passed at fixed commit `42bdfd105fc`, and the full fixed
sync-manager suite passed:

```bash
cd /private/tmp/gutenberg-6f589c-pass65-fixed.bD0hmA
npm run test:unit -- packages/sync/src/test/manager.ts --runInBand
```

Result:

```text
PASS packages/sync/src/test/manager.ts
Test Suites: 1 passed, 1 total
Tests:       28 passed, 28 total
```

Pass 65 attempted to rebuild the fixed browser bundles for a fresh after-fix
browser run, but the local shared `node_modules` failed before the changed
packages were built because `wasm-vips` is missing:

```text
ERROR: Could not resolve "wasm-vips"
ERROR: Could not resolve "wasm-vips/vips.wasm"
ERROR: Could not resolve "wasm-vips/vips-heif.wasm"
```

The after-fix browser evidence therefore remains the pass-63 fixed trace, while
pass 65 adds a fresh known-fixes browser failure, a narrower low-level
before/after proof, and a new annotated headless video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-65/6f589c89600c-pass65-annotated.mp4
width=1920 height=1080 duration=40.000000 nb_frames=1200
```

After this pass started, `origin/trunk` advanced to:

```text
64575b44eb6a18f9324a84a634d70ddbaee3b748 RTC: Fix compaction unit test (#77986)
```

Both branches were rebased onto that trunk. The rebased PR branch commit order
is:

```text
f3ef534df61 Add RTC title reload unit repros
d737764aff5 Add same-user title save-after-reload browser repro
2f52d8a8830 Preserve RTC title across reload saves
```

The narrow sync-manager repro was rerun at rebased test-only commit
`f3ef534df61` and still failed with `Expected: "Customer title"`, `Received:
"Initial title"`. The full sync-manager suite was rerun at rebased fix head
`2f52d8a8830` and passed with `28 passed`.

## Pass 66 verification

Pass 66 independently re-read the source result, original run log, screenshots,
freshly unzipped source trace, existing spec, and the rebased PR branch diff.
The source run still classifies as a product bug: it failed normally
(`exitCode=1`, `timedOut=false`) after four same-file control tests passed, and
the failing screenshots show one editor surface on the initial title while
another editor surface names the customer title.

The pass-66 trace decode adds a narrower payload proof. In the original source
trace, the reload path first exposed a stale raw REST record with a newer CRDT
title, then the final save sent the correct raw REST title alongside stale CRDT
metadata:

```text
2026-05-05T10:24:03.545Z GET /wp-json/wp/v2/posts/226?context=edit
  response REST title="RTC same-user save-after-reload initial"
  response CRDT title="RTC same-user save-after-reload customer title"

2026-05-05T10:24:04.080Z POST /wp-json/wp/v2/posts/226
  request REST title="RTC same-user save-after-reload customer title"
  request CRDT title="RTC same-user save-after-reload initial"
  response REST title="RTC same-user save-after-reload customer title"
  response CRDT title="RTC same-user save-after-reload initial"
```

That rules out a pure wait or locator problem: the same HTTP transaction carries
the user-visible raw title and stale `_crdt_document` title in different fields.

Pass 66 reran the natural-user browser repro against the known-fixes base using
the already-running `wp-env` test site on port `9906`:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
WP_ENV_PORT=9906 \
WP_BASE_URL=http://localhost:9906 \
RTC_MANIFEST_WS_START_PORT=20416 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-66/known-fixes-e2e-rerun \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The pass-66 fresh known-fixes trace also shows the reload-time split in the
opposite direction:

```text
2026-05-06T04:14:22.936Z POST /wp-json/wp/v2/posts/406
  request REST title="RTC same-user save-after-reload initial"
  request CRDT title="RTC same-user save-after-reload customer title"
```

The lowest non-Playwright repro was rerun in a fresh detached test-only worktree
at `f3ef534df61`:

```bash
cd /private/tmp/gutenberg-6f589c-pass66-testonly
npm run test:unit -- packages/sync/src/test/manager.ts --runInBand \
  --testNamePattern="serializes the record being saved instead of an older local CRDT snapshot"
```

Result before the fix:

```text
FAIL packages/sync/src/test/manager.ts
Expected: "Customer title"
Received: "Initial title"
```

The rebased PR branch still has the requested commit order:

```text
f3ef534df61 Add RTC title reload unit repros
d737764aff5 Add same-user title save-after-reload browser repro
2f52d8a8830 Preserve RTC title across reload saves
```

The fixed branch targeted unit verification passed:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-6f589c89600c
npm run test:unit -- \
  packages/core-data/src/test/entities.js \
  packages/core-data/src/test/resolvers.js \
  packages/core-data/src/utils/test/crdt.ts \
  packages/sync/src/test/manager.ts \
  --runInBand
```

Result:

```text
Test Suites: 4 passed, 4 total
Tests:       123 passed, 123 total
```

The fixed browser rerun remains blocked by local dependency state. The attempted
targeted build fails before browser-bundle verification on an unrelated
stylesheet import:

```text
Error: Can't find stylesheet to import.
@use "@arraypress/waveform-player/dist/waveform-player";
```

Pass 66 made a new annotated stitched video with current branch references and
fresh pass-66 evidence:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-66/6f589c89600c-pass66-annotated.mp4
width=1920 height=1080 duration=42.000000 nb_frames=1260
```

## Pass 67 narrower proof

Pass 67 independently re-read the pass-66 summary, source log, source
screenshots, source trace, existing spec, and PR branch diff. It also reran the
known-fixes natural-user browser repro, reran the pre-fix lowest-level
sync-manager proof, and reran the fixed branch targeted unit suites.

The pass-67 source trace decode narrows the root cause further than the visible
title split. The final source save contains a raw REST title and raw REST content
from the current editor, while the `_crdt_document` stored in the same request
still contains the older title and does not contain the active post-reload
paragraph:

```text
2026-05-05T10:24:04.080Z POST /wp-json/wp/v2/posts/226
  request raw title="RTC same-user save-after-reload customer title"
  request raw content has active edit=true
  request CRDT title="RTC same-user save-after-reload initial"
  request CRDT content has active edit=false
  response raw title="RTC same-user save-after-reload customer title"
  response CRDT title="RTC same-user save-after-reload initial"
```

That is a same-request stale serialization proof: the browser save operation
knows the newer record being saved, but the CRDT metadata persisted beside it is
serialized from an older local Y.Doc snapshot.

Pass 67 reran the natural-user browser repro against the known-fixes base using
the already-running test environment on port `9906`:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
WP_ENV_PORT=9906 \
WP_BASE_URL=http://localhost:9906 \
RTC_MANIFEST_WS_START_PORT=20416 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-67/known-fixes-e2e-rerun \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-67 known-fixes trace reproduced the same same-request raw/CRDT
split:

```text
2026-05-06T04:27:09.855Z POST /wp-json/wp/v2/posts/410
  request raw title="RTC same-user save-after-reload customer title"
  request raw content has active edit=true
  request CRDT title="RTC same-user save-after-reload initial"
  request CRDT content has active edit=false
```

Pass 67 reran the lowest non-Playwright proof in a fresh detached test-only
worktree at the first PR commit:

```bash
cd /private/tmp/gutenberg-6f589c-pass67-testonly
npm run test:unit -- packages/sync/src/test/manager.ts --runInBand \
  --testNamePattern="serializes the record being saved instead of an older local CRDT snapshot"
```

Result before the fix:

```text
FAIL packages/sync/src/test/manager.ts
Expected: "Customer title"
Received: "Initial title"
```

The fixed branch unit proof still passes on
`try/rtc-safe-sync-title-lost-after-reload-6f589c89600c-pr` at
`2f52d8a8830`:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-6f589c89600c
npm run test:unit -- \
  packages/core-data/src/test/entities.js \
  packages/core-data/src/test/resolvers.js \
  packages/core-data/src/utils/test/crdt.ts \
  packages/sync/src/test/manager.ts \
  --runInBand
```

Result:

```text
Test Suites: 4 passed, 4 total
Tests:       123 passed, 123 total
```

The fixed browser rerun is still blocked in this checkout before patched browser
bundles can be produced:

```text
ERROR: Error: Can't find stylesheet to import.
@use "@arraypress/waveform-player/dist/waveform-player";
```

Pass 67 made a new annotated stitched headless video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-67/6f589c89600c-pass67-annotated.mp4
width=1920 height=1080 duration=44.000000 nb_frames=1320
```

## Pass 68 verification

Pass 68 independently re-read the previous summary, source result, source log,
source trace, existing natural-user spec, relevant sync/core-data code, and the
current explanation and PR branches.

The source trace was decoded again directly from the archived trace resources.
The narrower proof is still a same-request split between the raw REST record and
the persisted CRDT metadata:

```text
pre-final GET response
  raw title:  RTC same-user save-after-reload initial
  CRDT title: RTC same-user save-after-reload customer title

final save request
  raw title:  RTC same-user save-after-reload customer title
  CRDT title: RTC same-user save-after-reload initial
  raw body has active edit:  true
  CRDT body has active edit: false
```

This continues to rule out a stale REST poll, inverted assertion, locator issue,
or readiness wait. The save payload itself contains the newer user-visible title
and stale `_crdt_document` metadata.

Pass 68 reran the lowest non-Playwright proof in the pre-fix/test-only worktree:

```bash
cd /private/tmp/gutenberg-6f589c-pass67-testonly
npm run test:unit -- packages/sync/src/test/manager.ts --runInBand \
  --testNamePattern="serializes the record being saved instead of an older local CRDT snapshot"
```

Result before the fix:

```text
FAIL packages/sync/src/test/manager.ts
Expected: "Customer title"
Received: "Initial title"
```

Pass 68 reran the fixed branch targeted unit suite:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-6f589c89600c
npm run test:unit -- \
  packages/core-data/src/test/entities.js \
  packages/core-data/src/test/resolvers.js \
  packages/core-data/src/utils/test/crdt.ts \
  packages/sync/src/test/manager.ts \
  --runInBand
```

Result:

```text
Test Suites: 4 passed, 4 total
Tests:       123 passed, 123 total
```

The first pass-68 known-fixes browser rerun used the already-running
known-fixes `wp-env` on port `9903`, but that environment failed earlier than
the canonical bug assertion because the second page received an HTTP-polling
provider `403` and never received the live title. I treated that as an
environment-readiness failure for that specific rerun, not as primary product
evidence.

The fixed browser rerun initially failed on stale built assets. After adding a
local package dependency symlink for `packages/block-library/node_modules` and
running:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-6f589c89600c
WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production \
  node packages/wp-build/lib/build.mjs
```

the rebuilt browser bundles contained the fix paths:

```text
build/scripts/sync/index.js:
  getPersistedRecord
  options.record

build/scripts/core-data/index.js:
  getPostChangesFromCRDTDoc(..., persistedRecord)
  currentRawValue / persistedRawValue guard
```

The fixed natural-user browser repro then passed headlessly against the running
bug worktree test site on port `9927`:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-6f589c89600c
WP_ENV_PORT=9927 \
WP_BASE_URL=http://localhost:9927 \
RTC_MANIFEST_WS_START_PORT=20416 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-68/playwright-fixed-artifacts-9927-rebuilt \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

Pass 68 also verified and wrapped the existing annotated headless evidence video
with a pass-68 slate:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-68/6f589c89600c-pass68-annotated.mp4
width=1920 height=1080 duration=49.000000 nb_frames=1470
```

## Pass 69 verification

Pass 69 re-read the pass-68 summary, source JSONL, source failure log,
screenshots, archived trace resources, existing repro spec, and the current
sync/core-data code. The bug still classifies as a real RTC product bug.

The source run failed after the first four same-file controls passed, and the
failing assertion was still the final active-title check:

```text
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The failure screenshots show both same-user editor sessions after save: one
saved editor view has reverted to the initial title, while the other still shows
the customer title. This is not an all-test environment outage or a locator
miss.

Pass 69 independently decoded every archived
`/wp-json/wp/v2/posts/226` REST request from
`pass-67/source-trace/1-trace.network` and the referenced resource payloads.
The final sequence was:

```text
#4 GET /wp-json/wp/v2/posts/226?context=edit
  response raw title="RTC same-user save-after-reload initial"
  response CRDT title="RTC same-user save-after-reload customer title"

#6 POST /wp-json/wp/v2/posts/226?_locale=user
  request raw title="RTC same-user save-after-reload customer title"
  request CRDT title="RTC same-user save-after-reload initial"
  request raw body has active edit=true
  request CRDT body has active edit=false
  response raw title="RTC same-user save-after-reload customer title"
  response CRDT title="RTC same-user save-after-reload initial"
```

That is the strongest pass-69 proof: the same HTTP save request wrote the
current raw post title while persisting `_crdt_document` metadata from an older
snapshot. It rules out a stale REST poll, inverted assertion, action-readiness
wait, malformed block tree, or synthetic state mutation.

Pass 69 also rechecked origin metadata. `gh` was not installed in this tmux
environment, so GitHub PR metadata was read through the connector. Relevant
merged PRs:

```text
#72373  2025-10-27  2d8b22633dd  Real-time collaboration: Implement CRDT persistence for collaborative editing
#75448  2026-02-13  22e067b0243  Real-time Collaboration: Use Y.text for title, content and excerpt
#75975  2026-03-02  8051e14451c  RTC: Fix stale CRDT document persisted on save
#76017  2026-03-02  9375c0e0148  Real-time Collaboration: Fix sync issue on refresh
```

`git blame` still shows the unfixed contract on current `origin/trunk`
`64575b44eb6a18f9324a84a634d70ddbaee3b748`:

```text
packages/sync/src/manager.ts
  createPersistedCRDTDoc waits one tick, then serializes entityState.ydoc.

packages/core-data/src/entities.js
  prePersistPostType calls createPersistedCRDTDoc(objectType, objectId)
  without passing the exact edits being saved.

packages/core-data/src/utils/crdt.ts
  title/content/excerpt diffing compares CRDT text only against the active
  edited raw value, without the persisted raw record needed to identify an
  exact persisted-value replay.
```

The lowest non-Playwright repro was rerun in a fresh detached test-only
worktree at commit `f3ef534df61`:

```bash
cd /private/tmp/gutenberg-6f589c-pass69-testonly.wIX9J6/repo
npm run test:unit -- packages/sync/src/test/manager.ts --runInBand \
  --testNamePattern="serializes the record being saved instead of an older local CRDT snapshot"
```

Result before the fix:

```text
FAIL packages/sync/src/test/manager.ts
Expected: "Customer title"
Received: "Initial title"
```

The requested `WP_ENV_PORT=9902` bug-worktree environment could not be started
fresh because local Docker address pools were exhausted, and Docker also showed
`9902` was already mapped to another running `wp-env`. Pass 69 therefore used
the already-running `6f589c89600c` test environment on mapped host port `9927`.

After switching to the PR branch and rebuilding browser bundles, the targeted
build completed:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-6f589c89600c
WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production \
  node packages/wp-build/lib/build.mjs
```

Result:

```text
All packages built successfully! (23829ms total)
```

Focused fixed-branch unit verification:

```bash
npm run test:unit -- \
  packages/core-data/src/test/entities.js \
  packages/core-data/src/test/resolvers.js \
  packages/core-data/src/utils/test/crdt.ts \
  packages/sync/src/test/manager.ts \
  --runInBand
```

Result:

```text
Test Suites: 4 passed, 4 total
Tests:       123 passed, 123 total
```

Fixed natural-user Playwright repro:

```bash
WP_ENV_PORT=9927 \
WP_BASE_URL=http://localhost:9927 \
RTC_MANIFEST_WS_START_PORT=20416 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-69/playwright-fixed-artifacts-9927 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result:

```text
1 passed
Collaboration - same user title loss > saves the active title after a same-user browser session reloads
```

## Pass 119 update

Pass 119 re-read the archived source result, screenshots, source log, and
network trace, then added a narrower source-trace decoder for the final save
payload. The final failing save was not a stale REST poll or an assertion
against the wrong tab. The request itself persisted current raw fields next to
stale CRDT metadata:

```text
2026-05-05T10:24:04.080Z POST /wp-json/wp/v2/posts/226?_locale=user
  requestKeys=content,id,meta,title
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContentHasReloadEdit=true
  rawContentHasPostReloadEdit=true
  crdtContentHasReloadEdit=false
  crdtContentHasPostReloadEdit=false
```

The response and final REST `GET` preserved the same split:

```text
rawTitle="RTC same-user save-after-reload customer title"
crdtTitle="RTC same-user save-after-reload initial"
```

This proves the stale `_crdt_document` was present in the HTTP save payload
before any later editor assertion. The source failure is therefore still a real
product bug, not a locator issue, malformed generated spec, readiness wait,
failed save, stale REST read, timeout, environment-only failure, expected
behavior, or inverted assertion.

Pass 119 also checked the known-fixes base. The checkout at
`3cba2b1e56a98787de08dc6c7df2434759e8f908` still has stale-save protection,
but it still serializes the manager's current `Y.Doc` snapshot and does not
pass a persisted raw record into `getChangesFromCRDTDoc`. A fresh browser rerun
on the running known-fixes wp-env site at `http://localhost:9903` failed with
the same title rollback:

```text
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The pre-fix low-level repro at `a331ec7ec0f` still fails the three root
contracts:

```text
serializes the record being saved instead of an older local CRDT snapshot:
  Expected: "Customer title"
  Received: "Initial title"

serializes the current edited record when the save payload is partial:
  Expected: "Customer title"
  Received: "Initial title"

passes the persisted record when remote updates are diffed:
  expected getChangesFromCRDTDoc( ydoc, editedRecord, persistedRecord )
  received getChangesFromCRDTDoc( ydoc, editedRecord )
```

The unchanged PR branch still satisfies the requested three-commit structure:

```text
764f3d4b4d9 Add RTC title reload unit repros
a331ec7ec0f Add same-user title save-after-reload browser repro
ffbcba101b5 Preserve RTC title across reload saves
```

Fresh pass-119 fixed verification:

```text
focused unit contracts: PASS
  Test Suites: 1 skipped, 3 passed, 3 of 4 total
  Tests: 118 skipped, 6 passed, 124 total

targeted data/core-data/sync production build: PASS
  All packages built successfully! (19730ms total)

natural-user Playwright repro on http://localhost:9912: PASS
  Collaboration - same user title loss > saves the active title after a
  same-user browser session reloads
```

The requested `WP_ENV_PORT=9901` fixed test environment could not start because
Docker reported `all predefined address pools have been fully subnetted`.
Pass 119 therefore used the already-running default wp-env for this same fixed
worktree on `http://localhost:9912`, which is the correct mounted checkout and
the same fixed-site route used by the earlier successful verification.

No fix logic changed in pass 119. The existing fix remains the revised plan:
serialize CRDT metadata from the current edited record overlaid with the exact
save payload, pass persisted raw record context into sync-manager diffs, and
ignore only exact stale persisted raw `title`/`content`/`excerpt` replays over
dirty local text fields.

## Pass 118 update

Pass 118 added an independent payload-table decode of every `POST`/`GET` for
the failing post in the archived Playwright trace, rather than reusing the
hand-picked resource IDs from pass 117. The table is in:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-118/trace-payload-snapshot-table.txt
```

The key rows are:

```text
2026-05-05T10:24:03 GET /wp-json/wp/v2/posts/226?context=edit
  response REST title: RTC same-user save-after-reload initial
  response CRDT title: RTC same-user save-after-reload customer title

2026-05-05T10:24:04 final POST /wp-json/wp/v2/posts/226
  request REST title: RTC same-user save-after-reload customer title
  request CRDT title: RTC same-user save-after-reload initial
  response REST title: RTC same-user save-after-reload customer title
  response CRDT title: RTC same-user save-after-reload initial
```

That is a narrower root-cause proof than the assertion alone: within one trace,
the persisted raw REST record and `_crdt_document` alternated between two
different snapshots. The final save writes the user's current raw title/content
while saving CRDT metadata from the stale initial snapshot.

Fresh pass-118 known-fixes rerun on commit `3cba2b1e56a`:

```text
env WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20480 RTC_MANIFEST_WS_FIXED_PORT=1 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-118/playwright-known-fixes-9903-rerun npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts --project=chromium --workers=1 --grep 'saves the active title after a same-user browser session reloads'
```

Result:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

Fresh pass-118 pre-fix low-level repro at test-only commit `a331ec7ec0f`:

```text
npm run test:unit -- packages/sync/src/test/manager.ts --runInBand --testNamePattern='serializes the record being saved|serializes the current edited record|passes the persisted record'
```

Result:

```text
Test Suites: 1 failed, 1 total
Tests: 3 failed, 26 skipped, 29 total
```

The failures are the exact data-path contracts: stale CRDT serialization keeps
`Initial title` instead of `Customer title`, partial save payloads do not carry
the current title into metadata, and `getChangesFromCRDTDoc` is called without
the persisted raw record.

Fresh pass-118 fixed verification on unchanged PR head `ffbcba101b5`:

```text
focused units: PASS
  Test Suites: 1 skipped, 3 passed, 3 of 4 total
  Tests: 118 skipped, 6 passed, 124 total

targeted production build: PASS
  All packages built successfully! (22818ms total)

natural-user Playwright repro on http://localhost:9912: PASS
  1 passed
  Collaboration - same user title loss > saves the active title after a same-user browser session reloads
```

Pass 118 also generated a fresh annotated headless video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-118/6f589c89600c-pass118-stitched.mp4
width=1920
height=1080
duration=28.000000
nb_frames=840
```

No fix logic changed in pass 118. The existing PR branch still has the required
three-commit order:

```text
764f3d4b4d9 Add RTC title reload unit repros
a331ec7ec0f Add same-user title save-after-reload browser repro
ffbcba101b5 Preserve RTC title across reload saves
```

The only pass-118 verification gap is `npm run lint:js`: it aborted before
linting the changed files because the shared installed ESLint plugin lacks the
configured `@wordpress/no-non-module-stylesheet-imports` rule.

## Pass 115 update

Pass 115 rebased both branches onto current `origin/trunk`
(`33949961c95cc929e03d3bb1ed0632b5f7e99cd9`, `Experiment: add first
basic user post types e2e tests and update taxonomy tests (#77998)`). The PR
branch still has the required three-commit shape:

```text
ff2f79895e3 Add RTC title reload unit repros
145d4fa75f8 Add same-user title save-after-reload browser repro
13f183b7c15 Preserve RTC title across reload saves
```

Pass 115 adds a fresh trace-level root-cause proof. The archived source
`trace.zip` was decoded directly from Playwright network resources and each
REST post body was compared with its decoded `_crdt_document`. The final save
request, final save response, and final REST poll all have the raw customer
title while the persisted CRDT document still has the initial title:

```text
final save request:
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawHasActiveBody=true
  crdtHasActiveBody=false
  updateId=443057791

final save response:
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawHasActiveBody=true
  crdtHasActiveBody=false
  updateId=443057791

final REST poll:
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawHasActiveBody=true
  crdtHasActiveBody=false
  updateId=443057791
```

The same trace also shows the earlier opposite split, where the raw REST title
was still initial while the CRDT title had already received the customer title.
That proves the save path can persist raw REST fields and `_crdt_document` from
different editor snapshots, not just that a later assertion read a stale value.

Known-fixes base was rerun directly at `3cba2b1e56a98787de08dc6c7df2434759e8f908`
against `http://localhost:9903`. The natural-user browser repro still fails:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The current-base pre-fix low-level repro was rerun at `145d4fa75f8`, the
rebased browser-repro commit before the fix. It fails the three intended sync
contracts:

```text
serializes the record being saved instead of an older local CRDT snapshot:
  Expected: "Customer title"
  Received: "Initial title"

serializes the current edited record when the save payload is partial:
  Expected: "Customer title"
  Received: "Initial title"

passes the persisted record when remote updates are diffed:
  expected getChangesFromCRDTDoc( ydoc, editedRecord, persistedRecord )
  received getChangesFromCRDTDoc( ydoc, editedRecord )
```

Fixed-branch verification after the rebase:

```text
focused units: PASS
  Test Suites: 1 skipped, 3 passed, 3 of 4 total
  Tests: 118 skipped, 6 passed, 124 total

targeted build: PASS
  All packages built successfully! (20026ms total)

natural-user Playwright on the correct wp-env site http://localhost:9912: PASS
  1 passed
```

The port check matters: `WP_ENV_PORT=9901` currently routes to another bug
worktree, while this bug worktree is served by Docker on `http://localhost:9912`.
Pass 115 therefore used `9912` for fixed browser verification.

Pass 115 generated a refreshed annotated headless video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-115/6f589c89600c-pass115-annotated.mp4
width=1920
height=1080
duration=36.000000
nb_frames=1080
```

## Pass 116 update

Pass 116 rebased both branches onto current `origin/trunk`
(`1e87b2cd7874aaf9df553db901fe395d6a96a0a2`, `Grid: add warning about being
under development (#78022)`). The PR branch still has the required three-commit
shape:

```text
764f3d4b4d9 Add RTC title reload unit repros
a331ec7ec0f Add same-user title save-after-reload browser repro
ffbcba101b5 Preserve RTC title across reload saves
```

Pass 116 adds a current-trunk verification that the existing branch, video, and
fix still satisfy the requested standard. The known-fixes checkout was
rechecked on its running test environment at `http://localhost:9903`; the
natural-user browser repro still fails before the fix:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

A detached current-trunk pre-fix worktree at the rebased test-only commit
`a331ec7ec0f` also fails the sync-manager repro contracts without Playwright:

```text
serializes the record being saved instead of an older local CRDT snapshot:
  Expected: "Customer title"
  Received: "Initial title"

serializes the current edited record when the save payload is partial:
  Expected: "Customer title"
  Received: "Initial title"

passes the persisted record when remote updates are diffed:
  expected getChangesFromCRDTDoc( ydoc, editedRecord, persistedRecord )
  received getChangesFromCRDTDoc( ydoc, editedRecord )
```

The rebased fixed branch passes the focused low-level contracts, targeted
production build, and natural-user browser repro:

```text
focused units: PASS
  Test Suites: 1 skipped, 3 passed, 3 of 4 total
  Tests: 118 skipped, 6 passed, 124 total

targeted build: PASS
  All packages built successfully! (21327ms total)

natural-user Playwright on http://localhost:9912: PASS
  1 passed
```

Pass 116 also revalidated the existing annotated headless video from pass 115:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-115/6f589c89600c-pass115-annotated.mp4
width=1920
height=1080
duration=36.000000
nb_frames=1080
```

No fix logic changed in pass 116. The added value is a fresh current-trunk
verification that the existing branch and video remain valid after rebase.

## Pass 117 update

Pass 117 independently re-read the source result row, source log, failure
screenshots, Playwright error context, archived trace, existing repro, and the
current PR branch. The classification remains a real product bug. The source
run completed without timeout, four same-file controls passed, and the failing
assertion is the active editor title after a successful save sequence:

```text
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The source screenshots show the product-state split directly: the active editor
is saved with the initial title while the sibling same-user editor still shows
the customer title.

Pass 117 adds a fresh narrow trace decode. The archived `trace.zip` final save
request and response were decoded with `yjs` and `lib0/buffer`. Both the REST
post body and the persisted `_crdt_document` are present in the same resources,
and they disagree:

```text
final save request:
  REST title: RTC same-user save-after-reload customer title
  CRDT title: RTC same-user save-after-reload initial
  REST content: includes same user post-reload active edit
  CRDT content: Initial body only

final save response:
  REST title: RTC same-user save-after-reload customer title
  CRDT title: RTC same-user save-after-reload initial
  REST content: includes same user post-reload active edit
  CRDT content: Initial body only
```

The same trace also has an earlier pre-final-save REST read with the opposite
split: the raw title is still initial while the decoded CRDT title has already
seen the customer title. That proves the bug is not a failed save, stale REST
poll, inverted assertion, or locator artifact. The raw REST fields and
persisted CRDT metadata can be written from different editor snapshots.

Known-fixes base was rerun directly at
`3cba2b1e56a98787de08dc6c7df2434759e8f908` on the already-running test
environment at `http://localhost:9903`. The natural-user browser repro still
fails before the fix:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

A detached pre-fix worktree at the current PR branch's test-only prefix
`a331ec7ec0f7a1fc5cf0db8502dda1b9b0b8282b` again fails without Playwright:

```text
serializes the record being saved instead of an older local CRDT snapshot:
  Expected: "Customer title"
  Received: "Initial title"

serializes the current edited record when the save payload is partial:
  Expected: "Customer title"
  Received: "Initial title"

passes the persisted record when remote updates are diffed:
  expected getChangesFromCRDTDoc( ydoc, editedRecord, persistedRecord )
  received getChangesFromCRDTDoc( ydoc, editedRecord )
```

The PR branch remains unchanged on top of current `origin/trunk`
(`1e87b2cd7874aaf9df553db901fe395d6a96a0a2`) with the required three-commit
shape:

```text
764f3d4b4d9 Add RTC title reload unit repros
a331ec7ec0f Add same-user title save-after-reload browser repro
ffbcba101b5 Preserve RTC title across reload saves
```

Fresh pass-117 fixed verification:

```text
focused units: PASS
  Test Suites: 1 skipped, 3 passed, 3 of 4 total
  Tests: 118 skipped, 6 passed, 124 total

targeted build: PASS
  All packages built successfully! (22113ms total)

natural-user Playwright on http://localhost:9912: PASS
  1 passed
```

The suggested `WP_ENV_PORT=9901` is occupied by another bug worktree's test
environment. This bug worktree's `wp-env` instance is running on Docker HTTP
port `9912`, so pass 117 used `WP_BASE_URL=http://localhost:9912` for fixed
browser verification.

Pass 117 produced a fresh stitched headless video from the source failure
screenshots and decoded trace facts:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-117/6f589c89600c-pass117-stitched.mp4
width=1920
height=1080
duration=28.000000
nb_frames=840
```

No fix logic changed in pass 117. The added value is an independent low-level
pre-fix rerun, a fresh known-fixes browser rerun, and a narrower same-resource
trace proof that the final save persisted the customer raw title beside stale
CRDT metadata.

## Pass 114 update

Pass 114 rechecked the original source failure and added a narrower trace
invariant proof. A local checker parsed the archived Playwright trace directly,
decoded `_crdt_document` with Yjs, and asserted all three conditions below:

```text
earlier_crdt_had_customer_title=true
final_save_raw_customer_crdt_initial=true
final_rest_raw_customer_crdt_initial=true
```

The decisive row is the final save and final REST read:

```text
final_save=1-trace.network request t=51567.659 updateId=443057791 savedAt=1777976642148
final_rest=2-trace.network t=51680.274 updateId=443057791 savedAt=1777976642148
PASS trace proves raw title customer while persisted CRDT title is initial
```

That rules out a failed save, stale REST poll, inverted assertion, and pure
locator issue. The customer title reached CRDT state earlier, but the final save
persisted a stale CRDT title alongside the correct raw REST title.

Pass 114 also cleaned the explanation branch final tree so it is
documentation-only relative to `origin/trunk`; the code and tests remain only on
the PR branch.

Known-fixes base remains unfixed:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
HEAD 3cba2b1e56a98787de08dc6c7df2434759e8f908
source result: failed, exitCode=1, timedOut=false
fix hooks absent: getPersistedRecord, options.record, record: edits
```

Pre-fix low-level verification at the repro-before-fix commit
`8637b3bbc3898006ff6bd019458cc876990f70b7` still fails:

```text
serializes the record being saved instead of an older local CRDT snapshot:
  Expected: "Customer title"
  Received: "Initial title"

serializes the current edited record when the save payload is partial:
  Expected: "Customer title"
  Received: "Initial title"

passes the persisted record when remote updates are diffed:
  expected getChangesFromCRDTDoc( ydoc, editedRecord, persistedRecord )
  received getChangesFromCRDTDoc( ydoc, editedRecord )
```

Fixed verification on PR branch
`ebad8eb4d56bc9a13b3077cf6a0fb2b9109c455d`:

```text
focused unit repros: PASS
  Test Suites: 1 skipped, 3 passed, 3 of 4 total
  Tests: 118 skipped, 6 passed, 124 total

targeted data/core-data/sync production build: PASS
  All packages built successfully! (21536ms total)

natural-user Playwright repro on http://localhost:9912: PASS
  1 passed
  Collaboration - same user title loss > saves the active title after a same-user browser session reloads
```

The branch still has the required three-commit PR shape:

```text
276527bee0f Add RTC title reload unit repros
8637b3bbc38 Add same-user title save-after-reload browser repro
ebad8eb4d56 Preserve RTC title across reload saves
```

## Pass 113 update

Pass 113 rechecked the source artifacts, rebased both branches onto current
`origin/trunk` (`ae940c4384d8d1d95fb52e7c76765ad2cdc18c6a`), and verified that
the existing fix still satisfies the requested standard.

The independent trace decode for this pass again proves the product-state split:
the final REST record has the customer title in the raw post title, while the
persisted `_crdt_document` inside that same record still carries the initial
title:

```text
final POST request/response and final GET response
  rawTitle:  RTC same-user save-after-reload customer title
  crdtTitle: RTC same-user save-after-reload initial
```

That keeps the classification as a real RTC persistence bug, not a timeout,
locator failure, malformed generated spec, failed save, stale REST poll, or
inverted assertion.

The PR branch was rebased cleanly and still has the required commit order:

```text
276527bee0f Add RTC title reload unit repros
8637b3bbc38 Add same-user title save-after-reload browser repro
ebad8eb4d56 Preserve RTC title across reload saves
```

The pre-fix prefix `8637b3bbc38` still fails at the lowest focused sync-manager
level:

```text
serializes the record being saved instead of an older local CRDT snapshot:
  Expected: "Customer title"
  Received: "Initial title"

serializes the current edited record when the save payload is partial:
  Expected: "Customer title"
  Received: "Initial title"

passes the persisted record when remote updates are diffed:
  expected getChangesFromCRDTDoc( ydoc, editedRecord, persistedRecord )
  received getChangesFromCRDTDoc( ydoc, editedRecord )
```

Fresh fixed verification on the rebased head `ebad8eb4d56`:

```text
focused unit verification:
  Test Suites: 1 skipped, 3 passed, 3 of 4 total
  Tests: 118 skipped, 6 passed, 124 total

build verification:
  All packages built successfully! (25688ms total)

natural-user Playwright verification on http://localhost:9912:
  1 passed
  Collaboration - same user title loss > saves the active title after a
  same-user browser session reloads
```

`http://localhost:9902` is still occupied by `gutenberg-bug-5ee0be2f9b7d`; this
worktree's wp-env remains `gutenberg-bug-6f589c89600c` on `http://localhost:9912`.

Pass 113 also reran the known-fixes checkout on `http://localhost:9903`. That
rerun failed before the final save, with a 403 room permission message during
same-user propagation, so it is recorded only as an additional negative
known-fixes signal. The primary proof remains the archived source run from the
same known-fixes base, which reaches the final save and exposes the raw
title/CRDT title split.

Pass 113 produced a refreshed annotated headless video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-113/6f589c89600c-pass113-annotated.mp4
width=1920
height=1080
duration=36.000000
nb_frames=1080
```

## Pass 112 update

Pass 112 independently re-decoded the archived source trace and reproduced the
same payload-level root cause without relying on prior summaries. The source
trace still shows the final saved REST record carrying the customer title while
the persisted `_crdt_document` inside that same record carries the stale initial
title:

```text
final POST request/response and final GET response
  rawTitle:  RTC same-user save-after-reload customer title
  crdtTitle: RTC same-user save-after-reload initial
```

That is a narrower root-cause proof than the original screenshot failure: the
bug is not a failed REST save or a stale REST poll. The canonical REST title is
fresh, but the CRDT metadata that a reloaded collaborator hydrates from is stale.

Pass 112 also ran the PR branch at the pre-fix prefix `5f0c5c338d2`, after the
unit and Playwright repro commits but before the implementation fix. The focused
sync-manager repros fail exactly on the expected contracts:

```text
serializes the record being saved instead of an older local CRDT snapshot:
  Expected: "Customer title"
  Received: "Initial title"

serializes the current edited record when the save payload is partial:
  Expected: "Customer title"
  Received: "Initial title"

passes the persisted record when remote updates are diffed:
  expected getChangesFromCRDTDoc( ydoc, editedRecord, persistedRecord )
  received getChangesFromCRDTDoc( ydoc, editedRecord )
```

The known-fixes checkout and the archived HTTP source checkout are both still at
`3cba2b1e56a98787de08dc6c7df2434759e8f908`. The source row for this signature is
failed, non-timeout, and the known-fixes checkout still has none of the fix-path
hooks (`getPersistedRecord`, `options.record`, or `{ record: edits }`) in the
affected files.

Fresh fixed verification on `cdca4643a371c12c229ea724248f99891610c984`:

```text
focused unit verification:
  Test Suites: 1 skipped, 3 passed, 3 of 4 total
  Tests: 118 skipped, 6 passed, 124 total

build verification:
  All packages built successfully! (23043ms total)

natural-user Playwright verification on http://localhost:9912:
  1 passed
  Collaboration - same user title loss > saves the active title after a
  same-user browser session reloads
```

The pass again confirmed the environment collision: `http://localhost:9902` is
serving `gutenberg-bug-5ee0be2f9b7d`, while this bug worktree is
`gutenberg-bug-6f589c89600c` on `http://localhost:9912`.

Pass 112 produced a refreshed annotated headless video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-112/6f589c89600c-pass112-annotated.mp4
width=1920
height=1080
duration=36.000000
nb_frames=1080
```

No implementation changes were needed in pass 112. The existing PR branch still
satisfies the requested structure and standard:

```text
166a2a8ca39 Add RTC title reload unit repros
5f0c5c338d2 Add same-user title save-after-reload browser repro
cdca4643a37 Preserve RTC title across reload saves
```

Pass 69 produced a fresh annotated headless video by prepending a pass-69 slate
to the existing annotated evidence video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-69/6f589c89600c-pass69-annotated.mp4
width=1920 height=1080 duration=55.000000 nb_frames=1650
```

## Pass 70 verification

Pass 70 independently extracted the archived source trace directly from the
original `trace.zip` into:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-70/source-trace
```

The decoded REST/CRDT timeline again proves the bug at the persistence
boundary. The final save request was internally split:

```text
2026-05-05T10:24:04.080Z POST /wp-json/wp/v2/posts/226?_locale=user
  request raw title="RTC same-user save-after-reload customer title"
  request CRDT title="RTC same-user save-after-reload initial"
  request raw content has post-reload active edit=true
  request CRDT content has post-reload active edit=false
  response raw title="RTC same-user save-after-reload customer title"
  response CRDT title="RTC same-user save-after-reload initial"
```

That row is a narrower root-cause proof than the UI screenshots alone: the
successful HTTP save wrote the user's current raw title while persisting
`_crdt_document` metadata from the old initial snapshot.

The requested `WP_ENV_PORT=9902` environment was checked first:

```bash
WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 \
RTC_MANIFEST_WS_START_PORT=20416 RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run wp-env status
```

Result:

```text
status: stopped
```

Port `9902` was occupied by another running `wp-env` container:

```text
wp-env-gutenberg-bug-5ee0be2f9b7d-5bd31855-wordpress-1 0.0.0.0:9902->80/tcp
```

The existing `6f589c89600c` test container on port `9927` was therefore used
again for browser verification.

Lowest non-Playwright repro before the fix:

```bash
tmp=$(mktemp -d /private/tmp/gutenberg-6f589c-pass70-testonly.XXXXXX)
git worktree add --detach "$tmp/repo" f3ef534df61
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules "$tmp/repo/node_modules" 2>/dev/null || true
cd "$tmp/repo"
npm run test:unit -- packages/sync/src/test/manager.ts --runInBand \
  --testNamePattern="serializes the record being saved instead of an older local CRDT snapshot"
```

Result before the fix:

```text
FAIL packages/sync/src/test/manager.ts
Expected: "Customer title"
Received: "Initial title"
Tests: 1 failed, 27 skipped, 28 total
```

Focused fixed-branch unit verification:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-6f589c89600c
npm run test:unit -- \
  packages/core-data/src/test/entities.js \
  packages/core-data/src/test/resolvers.js \
  packages/core-data/src/utils/test/crdt.ts \
  packages/sync/src/test/manager.ts \
  --runInBand
```

Result:

```text
PASS packages/core-data/src/utils/test/crdt.ts
PASS packages/core-data/src/test/resolvers.js
PASS packages/core-data/src/test/entities.js
PASS packages/sync/src/test/manager.ts
Test Suites: 4 passed, 4 total
Tests: 123 passed, 123 total
```

Fresh fixed-branch package build:

```bash
WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production \
  node packages/wp-build/lib/build.mjs
```

Result:

```text
All packages built successfully! (24993ms total)
```

Fresh fixed natural-user Playwright repro:

```bash
WP_ENV_PORT=9927 \
WP_BASE_URL=http://localhost:9927 \
RTC_MANIFEST_WS_START_PORT=20416 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-70/playwright-fixed-artifacts-9927 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep "saves the active title after a same-user browser session reloads"
```

Result:

```text
1 passed
Collaboration - same user title loss > saves the active title after a same-user browser session reloads
```

Pass 70 verified that the existing PR branch still satisfies the requested
commit order on current `origin/trunk`:

```text
f3ef534df61 Add RTC title reload unit repros
d737764aff5 Add same-user title save-after-reload browser repro
2f52d8a8830 Preserve RTC title across reload saves
```

Pass 70 also produced a fresh annotated headless video by prepending a pass-70
verification slate to the pass-69 annotated evidence video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-70/6f589c89600c-pass70-annotated.mp4
width=1920 height=1080 duration=62.000000 nb_frames=1860
```

## Pass 71 update

Pass 71 rebased both branches onto current `origin/trunk`:

```text
85cbd148b1c RTC: Attach sync observers after hydrating persisted CRDT doc (#77966)
```

The rebased PR branch keeps the requested commit order:

```text
82db15c7972 Add RTC title reload unit repros
72ba28a892c Add same-user title save-after-reload browser repro
b7148b6a429 Preserve RTC title across reload saves
```

Pass 71 added an independent trace-level invariant check from the original
failed `trace.zip`. The trace resources were decoded directly with `yjs` and
`lib0/buffer`; the final successful save request itself had the customer title
in the raw REST payload while the `_crdt_document` embedded in that same request
still encoded the initial title:

```text
1-trace.network:174 POST request status=200
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent="<!-- wp:paragraph -->
<p>Initial body.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>same user post-reload active edit</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>same user save-after-reload edit</p>
<!-- /wp:paragraph -->"
  crdtContent="<!-- wp:paragraph --><p>Initial body.</p><!-- /wp:paragraph -->"
  updateId=443057791 version=document:1572:5badfbc8e72806ad baseVersion=document:1480:19dc4d0e73e3195f
FINAL_POST_INVARIANT {"rawTitle":"RTC same-user save-after-reload customer title","crdtTitle":"RTC same-user save-after-reload initial","mismatched":true}
```

This is a narrower proof than the editor assertion alone: the bad state is
already present in a successful save payload, so the failure is not caused by a
late REST poll, a screenshot race, or an inverted assertion.

Pass 71 also reran a pre-fix low-level negative control on the test-only commit:

```bash
tmp=$(mktemp -d /private/tmp/gutenberg-6f589c-pass71-testonly.XXXXXX)
git worktree add --detach "$tmp/repo" f3ef534df61
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules "$tmp/repo/node_modules" 2>/dev/null || true
cd "$tmp/repo"
npm run test:unit -- packages/core-data/src/utils/test/crdt.ts packages/sync/src/test/manager.ts --runInBand \
  --testNamePattern="serializes the record being saved|does not overwrite a dirty title"
```

The manager repro failed before the fix:

```text
FAIL packages/sync/src/test/manager.ts
Expected: "Customer title"
Received: "Initial title"
```

The companion detached-tree core-data test was inconclusive because that older
worktree hit a local dependency-resolution failure for `framer-motion` before
running the assertion; it was not counted as product evidence.

Focused fixed-branch unit verification after the rebase:

```text
PASS packages/core-data/src/utils/test/crdt.ts
PASS packages/core-data/src/test/resolvers.js
PASS packages/core-data/src/test/entities.js
PASS packages/sync/src/test/manager.ts
Test Suites: 4 passed, 4 total
Tests: 123 passed, 123 total
```

Targeted fixed-branch build after the rebase:

```text
WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production node packages/wp-build/lib/build.mjs
All packages built successfully! (22275ms total)
```

Focused fixed natural-user Playwright repro after the rebase:

```text
WP_ENV_PORT=9927 WP_BASE_URL=http://localhost:9927 RTC_MANIFEST_WS_START_PORT=20416 RTC_MANIFEST_WS_FIXED_PORT=1 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-71/playwright-fixed-artifacts-9927-rebased \
npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts --project=chromium --workers=1 --grep "saves the active title after a same-user browser session reloads"

1 passed
Collaboration - same user title loss > saves the active title after a same-user browser session reloads
```

## Pass 72 update

Pass 72 kept `origin/trunk` at:

```text
85cbd148b1c RTC: Attach sync observers after hydrating persisted CRDT doc (#77966)
```

The PR branch still has the requested commit order:

```text
82db15c7972 Add RTC title reload unit repros
72ba28a892c Add same-user title save-after-reload browser repro
b7148b6a429 Preserve RTC title across reload saves
```

Pass 72 added a fresh trace-derived payload matrix from the original failing
`trace.zip`. This is broader than the pass-71 final-request invariant because it
captures both stale-state crossings:

```text
1-trace.network:170 GET response status=200
  rawTitle="RTC same-user save-after-reload initial"
  crdtTitle="RTC same-user save-after-reload customer title"

1-trace.network:174 POST request status=200
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"

PASS72_TRACE_ASSERTION {"staleCanonicalNewCrdt":true,"finalPostRawTitle":"RTC same-user save-after-reload customer title","finalPostCrdtTitle":"RTC same-user save-after-reload initial","finalResponseRawTitle":"RTC same-user save-after-reload customer title","finalResponseCrdtTitle":"RTC same-user save-after-reload initial","finalPostRawCrdtMismatch":true}
```

This shows that the reload path first served stale canonical raw post fields
with newer CRDT metadata, then the final save carried the correct raw title but
persisted stale CRDT metadata in the opposite direction. That rules out a simple
readiness wait, REST polling lag, locator issue, screenshot-only artifact, or
expected behavior.

Pass 72 also reran the lowest focused non-Playwright repro before the fix at
the test-only commit:

```bash
npm run test:unit -- packages/sync/src/test/manager.ts --runInBand \
  --testNamePattern='serializes the record being saved'
```

Result:

```text
FAIL packages/sync/src/test/manager.ts
Expected: "Customer title"
Received: "Initial title"
```

Fresh fixed-branch verification:

```text
npm run test:unit -- packages/core-data/src/test/entities.js packages/core-data/src/test/resolvers.js packages/core-data/src/utils/test/crdt.ts packages/sync/src/test/manager.ts --runInBand
PASS packages/core-data/src/utils/test/crdt.ts
PASS packages/core-data/src/test/resolvers.js
PASS packages/core-data/src/test/entities.js
PASS packages/sync/src/test/manager.ts
Test Suites: 4 passed, 4 total
Tests: 123 passed, 123 total

WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production node packages/wp-build/lib/build.mjs
All packages built successfully! (39096ms total)

WP_ENV_PORT=9927 WP_BASE_URL=http://localhost:9927 WP_ENV_PHPMYADMIN_PORT=9900 RTC_MANIFEST_WS_START_PORT=20416 RTC_MANIFEST_WS_FIXED_PORT=1 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-72/playwright-fixed-artifacts-9927 \
npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts --project=chromium --workers=1 --grep "saves the active title after a same-user browser session reloads"
1 passed
```

Pass 72 produced a new stitched annotated headless video with the source
screenshots, natural-user action log, trace matrix assertion, and verification
summary:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-72/6f589c89600c-pass72-annotated.mp4
width=1920 height=1080 duration=57.000000 nb_frames=1710
```

## Pass 73 update

Pass 73 kept `origin/trunk` at:

```text
85cbd148b1c RTC: Attach sync observers after hydrating persisted CRDT doc (#77966)
```

The PR branch was kept in the requested three-commit order and the fix commit
was amended only to add missing JSDoc parameters caught by targeted lint:

```text
82db15c7972 Add RTC title reload unit repros
72ba28a892c Add same-user title save-after-reload browser repro
b190f18550a Preserve RTC title across reload saves
```

Pass 73 added an independent low-level repro route at the test-only commit. The
existing manager repro still fails before the fix:

```text
FAIL packages/sync/src/test/manager.ts
Expected: "Customer title"
Received: "Initial title"
```

After repairing the temporary worktree's workspace dependency links, the
core-data CRDT diff repro also runs far enough to fail on the intended stale
replay assertion:

```text
FAIL packages/core-data/src/utils/test/crdt.ts
Expected path: not "title"
Received value: "Persisted Title"
```

That gives two separate non-Playwright failures before the implementation
commit: the save path serializes an old CRDT title, and the CRDT diff path
accepts an exact persisted-title replay over a dirty local title.

Pass 73 also decoded the archived source `trace.zip` into a fresh state-machine
check. The decoded REST rows had no non-200 status and showed both out-of-phase
transitions:

```text
PASS73_ASSERTION {"postPayloadRows":14,"interestingRows":12,"staleRawNewCrdt":true,"staleCrdtOnSave":true,"echoedStaleCrdtOnSave":true,"non200Rows":0,"finalSaveVersion":"document:1572:5badfbc8e72806ad","finalSaveBaseVersion":"document:1480:19dc4d0e73e3195f"}
```

Fixed-branch verification after the JSDoc amend:

```text
npm run test:unit -- packages/core-data/src/test/entities.js packages/core-data/src/test/resolvers.js packages/core-data/src/utils/test/crdt.ts packages/sync/src/test/manager.ts --runInBand
PASS packages/core-data/src/utils/test/crdt.ts
PASS packages/core-data/src/test/resolvers.js
PASS packages/core-data/src/test/entities.js
PASS packages/sync/src/test/manager.ts
Test Suites: 4 passed, 4 total
Tests: 123 passed, 123 total

npm run lint:js -- packages/core-data/src/entities.js packages/core-data/src/resolvers.js packages/core-data/src/utils/crdt.ts packages/core-data/src/test/entities.js packages/core-data/src/test/resolvers.js packages/core-data/src/utils/test/crdt.ts packages/sync/src/manager.ts packages/sync/src/types.ts packages/sync/src/test/manager.ts test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts
passed

WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production node packages/wp-build/lib/build.mjs
All packages built successfully! (32825ms total)

WP_ENV_PORT=9927 WP_BASE_URL=http://localhost:9927 WP_ENV_PHPMYADMIN_PORT=9900 RTC_MANIFEST_WS_START_PORT=20416 RTC_MANIFEST_WS_FIXED_PORT=1 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-73/playwright-fixed-artifacts-9927 \
npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts --project=chromium --workers=1 --grep "saves the active title after a same-user browser session reloads"
1 passed
```

Pass 73 video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-73/6f589c89600c-pass73-annotated.mp4
width=1920 height=1080 duration=70.000000 nb_frames=1750
```

## Pass 74 update

Pass 74 independently rechecked the current branch geometry after fetching
`origin/trunk`:

```text
origin/trunk 85cbd148b1c RTC: Attach sync observers after hydrating persisted CRDT doc (#77966)
try/rtc-safe-sync-title-lost-after-reload-6f589c89600c-pr is 0 behind, 3 ahead
```

The existing PR branch still has the requested commit order:

```text
82db15c7972 Add RTC title reload unit repros
72ba28a892c Add same-user title save-after-reload browser repro
b190f18550a Preserve RTC title across reload saves
```

Pass 74 added a narrower source-trace proof focused only on the save boundary.
It decodes the archived `trace.zip` and asserts that the final successful HTTP
save carried correct raw REST state but stale `_crdt_document` metadata:

```bash
node /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-74/pass74-save-boundary-invariant.js
```

Key output:

```text
1-trace.network:170 GET response status=200
  rawTitle="RTC same-user save-after-reload initial"
  crdtTitle="RTC same-user save-after-reload customer title"

1-trace.network:174 POST request status=200
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent includes "same user post-reload active edit"
  crdtContent is still only "Initial body."

1-trace.network:174 POST response status=200
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"

PASS74_ASSERTION {"postRowsWithCrdtMeta":14,"titleMismatchRows":7,"preSaveSplitBrainRead":true,"finalSaveRequestStaleCrdt":true,"finalSaveResponseEchoedStaleCrdt":true,"finalSaveRawContentHasPostReloadEdit":true,"finalSaveCrdtContentHasPostReloadEdit":false,"non200Rows":0,"finalSaveVersion":"document:1572:5badfbc8e72806ad","finalSaveBaseVersion":"document:1480:19dc4d0e73e3195f"}
```

That rules out a failed save, stale REST poll, or network error: the problem is
that the editor persisted and then reapplied stale CRDT metadata after the raw
record had the correct title and content.

Known-fixes was also rerun live against the already-running checkout on port
`9903`:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 WP_ENV_PHPMYADMIN_PORT=9023 RTC_MANIFEST_WS_START_PORT=20416 RTC_MANIFEST_WS_FIXED_PORT=1 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-74/playwright-knownfixes-artifacts-9903 \
npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts --project=chromium --workers=1 --grep "saves the active title after a same-user browser session reloads"
```

Result:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The two lower-level negative controls were rerun at the test-only commit before
the implementation fix. The sync-manager repro fails because persisted CRDT
serialization keeps the old title, and the core-data diff repro fails because a
stale persisted-title replay is accepted over a dirty local title:

```text
FAIL packages/sync/src/test/manager.ts
Expected: "Customer title"
Received: "Initial title"

FAIL packages/core-data/src/utils/test/crdt.ts
Expected path: not "title"
Received value: "Persisted Title"
```

Fixed-branch verification in pass 74:

```text
npm run test:unit -- packages/core-data/src/test/entities.js packages/core-data/src/test/resolvers.js packages/core-data/src/utils/test/crdt.ts packages/sync/src/test/manager.ts --runInBand
Test Suites: 4 passed, 4 total
Tests: 123 passed, 123 total

npm run lint:js -- packages/core-data/src/entities.js packages/core-data/src/resolvers.js packages/core-data/src/utils/crdt.ts packages/core-data/src/test/entities.js packages/core-data/src/test/resolvers.js packages/core-data/src/utils/test/crdt.ts packages/sync/src/manager.ts packages/sync/src/types.ts packages/sync/src/test/manager.ts test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts
passed

WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production node packages/wp-build/lib/build.mjs
All packages built successfully! (25771ms total)

WP_ENV_PORT=9927 WP_BASE_URL=http://localhost:9927 WP_ENV_PHPMYADMIN_PORT=9900 RTC_MANIFEST_WS_START_PORT=20416 RTC_MANIFEST_WS_FIXED_PORT=1 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-74/playwright-fixed-artifacts-9927 \
npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts --project=chromium --workers=1 --grep "saves the active title after a same-user browser session reloads"
1 passed
```

The requested port `9902` was still occupied by an unrelated `wp-env` container,
so pass 74 used the running known-fixes environment on `9903` for the negative
control and the running `6f589c89600c` test environment on `9927` for the fixed
browser verification.

Pass 74 video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-74/6f589c89600c-pass74-annotated.mp4
width=1920 height=1080 duration=50.000000 nb_frames=1250
```

## Pass 75 update

Pass 75 fetched current `origin/trunk` and rebased both branches onto:

```text
369e71ec725 Fix: Buttons block shows inserter picker when multiple allowed blocks are registered (#77858)
```

The PR branch remains in the requested three-commit order:

```text
9c06fd65ea2 Add RTC title reload unit repros
f638763b3c1 Add same-user title save-after-reload browser repro
8cf74ce40fd Preserve RTC title across reload saves
```

Pass 75 added an action-aligned source-trace checker:

```bash
node /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-75/pass75-action-aligned-save-proof.js
```

The checker pairs Playwright's action trace with decoded REST and CRDT payloads.
It proves the customer title had already propagated before the same-user reload,
the active tab then performed a normal post-reload body edit and clicked Save
draft, the save notice appeared, the REST persisted-title poll passed, the
revision title assertion passed, and only the final active editor title
assertion failed:

```text
PASS75_ACTION_TIMELINE
fill customer title: pw:api@56 46768-46802
other same-user tab saw title: expect@57 46803-48681
other same-user tab typed body edit: pw:api@71 48849-48975
other same-user tab reloaded: pw:api@72 48975-49339
active tab typed post-reload body edit: pw:api@82 51283-51439
active tab clicked Save draft: pw:api@83 51440-51486
Draft saved notice appeared: pw:api@84 51487-51678
REST persisted-title poll passed: expect@85 51679-51729
revision contains customer title: expect@89 51765-51765
active editor title assertion failed: expect@91 51772-51772
  received="RTC same-user save-after-reload initial"
```

The same checker confirms the final successful HTTP save wrote correct raw REST
state with stale CRDT metadata:

```text
1-trace.network:174 POST request status=200 monotonic=51567.659
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent includes "same user post-reload active edit"
  crdtContent is still only "Initial body."

PASS75_ASSERTION {"actionOrderIsNatural":true,"titleWasPropagatedBeforeReload":true,"saveDraftNoticeObserved":true,"persistedTitlePollPassed":true,"revisionTitleAssertionPassed":true,"finalEditorTitleReceived":"RTC same-user save-after-reload initial","finalSaveRequestStaleCrdt":true,"finalSaveResponseEchoedStaleCrdt":true,"finalSaveFallsInsideSave":true,"finalSaveRawContentHasActiveEdit":true,"finalSaveCrdtContentHasActiveEdit":false,"non200PostRows":0,"finalSaveVersion":"document:1572:5badfbc8e72806ad","finalSaveBaseVersion":"document:1480:19dc4d0e73e3195f"}
```

This is the pass-75 addition over pass 74: the proof now explicitly ties the
payload split to the natural action sequence and to the passing REST/revision
assertions before the final editor-state rollback.

Known-fixes was checked first on the requested `9902` environment, but that
environment failed before the test because the RTC websocket test plugin was not
installed:

```text
Error: The plugin "gutenberg-test-plugin-rtc-websocket-provider" isn't installed
```

The live known-fixes repro was then rerun against the already-running
known-fixes environment on `9903`:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 WP_ENV_PHPMYADMIN_PORT=9023 RTC_MANIFEST_WS_START_PORT=20416 RTC_MANIFEST_WS_FIXED_PORT=1 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-75/playwright-knownfixes-artifacts-9903 \
npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts --project=chromium --workers=1 --grep "saves the active title after a same-user browser session reloads"
```

Result on known-fixes commit `3cba2b1e56a`:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The non-Playwright negative control was rerun at the rebased test-only commit
`9c06fd65ea2`, where the repro tests exist but the fix is absent:

```bash
npm run test:unit -- packages/core-data/src/test/entities.js packages/core-data/src/test/resolvers.js packages/core-data/src/utils/test/crdt.ts packages/sync/src/test/manager.ts --runInBand --testNamePattern='serializes the record being saved|does not overwrite a dirty title|passes the persisted record through'
```

Result:

```text
FAIL packages/sync/src/test/manager.ts
Expected: "Customer title"
Received: "Initial title"

FAIL packages/core-data/src/utils/test/crdt.ts
Expected path: not "title"
Received value: "Persisted Title"

FAIL packages/core-data/src/test/entities.js
getPostChangesFromCRDTDoc was called without the persisted record
```

Fixed-branch verification after the rebase:

```text
npm run test:unit -- packages/core-data/src/test/entities.js packages/core-data/src/test/resolvers.js packages/core-data/src/utils/test/crdt.ts packages/sync/src/test/manager.ts --runInBand
PASS packages/core-data/src/utils/test/crdt.ts
PASS packages/core-data/src/test/resolvers.js
PASS packages/core-data/src/test/entities.js
PASS packages/sync/src/test/manager.ts
Test Suites: 4 passed, 4 total
Tests: 123 passed, 123 total

npm run lint:js -- packages/core-data/src/entities.js packages/core-data/src/resolvers.js packages/core-data/src/utils/crdt.ts packages/core-data/src/test/entities.js packages/core-data/src/test/resolvers.js packages/core-data/src/utils/test/crdt.ts packages/sync/src/manager.ts packages/sync/src/types.ts packages/sync/src/test/manager.ts test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts
passed

WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production node packages/wp-build/lib/build.mjs
All packages built successfully! (23807ms total)

WP_ENV_PORT=9927 WP_BASE_URL=http://localhost:9927 WP_ENV_PHPMYADMIN_PORT=9900 RTC_MANIFEST_WS_START_PORT=20416 RTC_MANIFEST_WS_FIXED_PORT=1 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-75/playwright-fixed-artifacts-9927 \
npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts --project=chromium --workers=1 --grep "saves the active title after a same-user browser session reloads"
1 passed
```

Pass 75 video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-75/6f589c89600c-pass75-annotated.mp4
width=1920 height=1080 duration=40.000000 nb_frames=1000
```

## Pass 76 update

Pass 76 independently verified that the existing explanation, video, and fix
still satisfy the requested standard on current `origin/trunk`:

```text
369e71ec725 Fix: Buttons block shows inserter picker when multiple allowed blocks are registered (#77858)
```

The PR branch still has the requested three-commit order:

```text
9c06fd65ea2 Add RTC title reload unit repros
f638763b3c1 Add same-user title save-after-reload browser repro
8cf74ce40fd Preserve RTC title across reload saves
```

Pass 76 added a narrower source-trace proof focused on the exact save payload:

```bash
node /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-76/pass76-save-payload-root-cause-proof.js
```

Result:

```text
PASS76_SAVE_PAYLOAD_ROOT_CAUSE
1-trace.network:174 POST request status=200 monotonic=51567.659
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent="...same user post-reload active edit..."
  crdtContent="<!-- wp:paragraph --><p>Initial body.</p><!-- /wp:paragraph -->"

1-trace.network:174 POST response status=200 monotonic=51567.659
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"

PASS76_FINAL_EDITOR_FAILURE {"callId":"expect@91","startTime":51771.779,"endTime":51772.085,"received":"RTC same-user save-after-reload initial"}
PASS76_ASSERTION {"requestHasCorrectRawTitleAndStaleCrdtTitle":true,"responseEchoesCorrectRawTitleAndStaleCrdtTitle":true,"finalEditorRolledBackToInitial":true,"rawContentHasActivePostReloadEdit":true,"crdtContentMissingActivePostReloadEdit":true}
```

This is the pass-76 addition over pass 75: it proves the bug exists inside one
successful HTTP save payload. The request had all the customer data needed to
save the correct post, but `_crdt_document` still serialized the old title and
old content. The response echoed the same split state, and the active editor
then rolled back to the initial title. That is a tighter root-cause proof for
the save-time CRDT serialization defect.

Fresh pass-76 non-Playwright negative control at test-only commit
`9c06fd65ea2`:

```bash
npm run test:unit -- packages/core-data/src/test/entities.js packages/core-data/src/test/resolvers.js packages/core-data/src/utils/test/crdt.ts packages/sync/src/test/manager.ts --runInBand --testNamePattern='serializes the record being saved|does not overwrite a dirty title|passes the persisted record through|passes the persisted record when remote updates are diffed'
```

Result:

```text
FAIL packages/core-data/src/utils/test/crdt.ts
Expected path: not "title"
Received value: "Persisted Title"

FAIL packages/core-data/src/test/entities.js
getPostChangesFromCRDTDoc was called without the persisted record

FAIL packages/sync/src/test/manager.ts
Expected: "Customer title"
Received: "Initial title"

FAIL packages/sync/src/test/manager.ts
getChangesFromCRDTDoc was called without the persisted record
```

The same focused unit tests pass on the fixed PR branch:

```text
Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests: 119 skipped, 4 passed, 123 total
```

Known-fixes was checked again on the requested `9902` environment, but it still
failed before test execution because the RTC websocket provider test plugin was
not installed there:

```text
Error: The plugin "gutenberg-test-plugin-rtc-websocket-provider" isn't installed
```

The fresh known-fixes browser negative control on the already-running port
`9903` still reproduces:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 WP_ENV_PHPMYADMIN_PORT=9023 RTC_MANIFEST_WS_START_PORT=20416 RTC_MANIFEST_WS_FIXED_PORT=1 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-76/playwright-knownfixes-artifacts-9903 \
npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts --project=chromium --workers=1 --grep "saves the active title after a same-user browser session reloads"
```

Result:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

Fixed-branch pass-76 verification:

```text
WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production node packages/wp-build/lib/build.mjs
All packages built successfully! (27344ms total)

npm run lint:js -- packages/core-data/src/entities.js packages/core-data/src/resolvers.js packages/core-data/src/utils/crdt.ts packages/core-data/src/test/entities.js packages/core-data/src/test/resolvers.js packages/core-data/src/utils/test/crdt.ts packages/sync/src/manager.ts packages/sync/src/types.ts packages/sync/src/test/manager.ts test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts
passed

WP_ENV_PORT=9927 WP_BASE_URL=http://localhost:9927 WP_ENV_PHPMYADMIN_PORT=9900 RTC_MANIFEST_WS_START_PORT=20416 RTC_MANIFEST_WS_FIXED_PORT=1 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-76/playwright-fixed-artifacts-9927 \
npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts --project=chromium --workers=1 --grep "saves the active title after a same-user browser session reloads"
1 passed

git diff --check origin/trunk..HEAD
no output
```

The default fixed wp-env for this worktree could not be started during pass 76
because Docker had exhausted predefined address pools while other wp-env
containers were running. The already-running test-config wp-env for this
worktree on port `9927` was therefore used for the fixed browser verification.

Pass 76 video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-76/6f589c89600c-pass76-annotated.mp4
width=1920 height=1080 duration=40.000000 nb_frames=1000
```

## Pass 77 update

Pass 77 independently rechecked the existing branches after a fresh
`git fetch origin trunk`; `origin/trunk` remained `369e71ec7258`, and the PR
branch remained exactly three commits ahead:

```text
9c06fd65ea2 Add RTC title reload unit repros
f638763b3c1 Add same-user title save-after-reload browser repro
8cf74ce40fd Preserve RTC title across reload saves
```

The pass-77 addition is a fresh known-fixes trace proof, not only a restatement
of the archived source trace. The natural-user browser repro was rerun on the
known-fixes checkout and failed again on port `9903`. The newly generated trace
was decoded and showed the same save-time split:

```text
PASS77_FRESH_KNOWNFIXES_SAVE_PAYLOAD_SPLIT
1-trace.network:203 POST request status=200 monotonic=17517.47
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent="<!-- wp:paragraph --> <p>Initial body.</p> <!-- /wp:paragraph --> <!-- wp:paragraph --> <p>same user post-reload active edit</p> <!-- /wp:paragraph -->"
  crdtContent="<!-- wp:paragraph --><p>Initial body.</p><!-- /wp:paragraph -->"
1-trace.network:203 POST response status=200 monotonic=17517.47
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent="<!-- wp:paragraph --> <p>Initial body.</p> <!-- /wp:paragraph --> <!-- wp:paragraph --> <p>same user post-reload active edit</p> <!-- /wp:paragraph -->"
  crdtContent="<!-- wp:paragraph --><p>Initial body.</p><!-- /wp:paragraph -->"
PASS77_FRESH_FINAL_EDITOR_FAILURE {"callId":"expect@103","received":"RTC same-user save-after-reload initial"}
```

This fresh trace again rules out readiness waits, action locator errors,
malformed generated specs, stale REST polling, inverted assertions, and expected
behavior. The successful Save request carried the user-visible raw title and
body, but `_crdt_document` embedded in that same request still represented the
initial title and initial body. The final active editor assertion then read the
initial title.

Pass 77 lower-level repro and verification:

```text
test-only commit 9c06fd65ea2:
Test Suites: 3 failed, 1 skipped, 3 of 4 total
Tests: 4 failed, 119 skipped, 123 total

fixed PR branch:
Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests: 119 skipped, 4 passed, 123 total

targeted lint: passed
targeted build: All packages built successfully! (29444ms total)
git diff --check origin/trunk..HEAD: no output
```

Pass 77 browser matrix:

```text
known-fixes checkout on 9903:
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"

fixed PR branch on 9927:
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

Pass 77 video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-77/6f589c89600c-pass77-annotated.mp4
width=1920 height=1080 duration=48.000000 nb_frames=1200
```

## Pass 78 update

Pass 78 independently verified that the existing explanation, PR branch, and
video still satisfy the requested standard on current `origin/trunk`:

```text
origin/trunk 369e71ec7258
PR branch delta: 0 behind, 3 ahead
9c06fd65ea2 Add RTC title reload unit repros
f638763b3c1 Add same-user title save-after-reload browser repro
8cf74ce40fd Preserve RTC title across reload saves
```

The pass-78 addition is another fresh known-fixes browser rerun and decoded
trace, generated after pass 77. The natural-user repro still fails on the
known-fixes checkout at port `9903`, while a successful final HTTP save carries
correct raw post data and stale CRDT metadata in the same payload:

```text
PASS78_FRESH_KNOWNFIXES_SAVE_PAYLOAD_SPLIT
1-trace.network:203 POST request status=200 monotonic=15407.245
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent="<!-- wp:paragraph --> <p>Initial body.</p> <!-- /wp:paragraph --> <!-- wp:paragraph --> <p>same user post-reload active edit</p> <!-- /wp:paragraph -->"
  crdtContent="<!-- wp:paragraph --><p>Initial body.</p><!-- /wp:paragraph -->"
  version=document:1292:185b5e4427652785 baseVersion=document:1044:b1b40e6fe2d836ee updateId=332014925
1-trace.network:203 POST response status=200 monotonic=15407.245
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent="<!-- wp:paragraph --> <p>Initial body.</p> <!-- /wp:paragraph --> <!-- wp:paragraph --> <p>same user post-reload active edit</p> <!-- /wp:paragraph -->"
  crdtContent="<!-- wp:paragraph --><p>Initial body.</p><!-- /wp:paragraph -->"
  version=document:1292:185b5e4427652785 baseVersion=document:1044:b1b40e6fe2d836ee updateId=332014925
PASS78_FRESH_FINAL_EDITOR_FAILURE {"callId":"expect@101","received":"RTC same-user save-after-reload initial"}
```

That fresh trace again rules out readiness waits, action locator errors,
malformed generated specs, stale REST polling, inverted assertions, and expected
behavior. The browser used ordinary editor actions, the save completed with
status `200`, and only the active editor title rolled back.

Pass 78 lower-level repro and verification:

```text
test-only commit 9c06fd65ea2:
Test Suites: 3 failed, 1 skipped, 3 of 4 total
Tests: 4 failed, 119 skipped, 123 total

fixed PR branch:
Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests: 119 skipped, 4 passed, 123 total

targeted lint: passed
targeted build: All packages built successfully! (33544ms total)
git diff --check origin/trunk..HEAD: no output
```

Pass 78 browser matrix:

```text
known-fixes checkout on 9903:
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"

fixed PR branch on 9927:
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

Pass 78 reused the still-valid pass-77 annotated headless video after checking
its container metadata:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-77/6f589c89600c-pass77-annotated.mp4
width=1920 height=1080 duration=48.000000 nb_frames=1200
sha256=8ca2d311b6cad2510653e7b4832de38475799faed5c45a040044db7536ebcb64
```

## Pass 79 update

Pass 79 adds a source-artifact proof in addition to the prior fresh reruns. I
decoded the original failing fuzz trace from
`results-refresh-http-shard-3/outputs/0019-6f589c89600c`, not only the later
known-fixes rerun traces. The original trace shows the same final-save split in
one successful HTTP request/response:

```text
PASS79_SOURCE_KNOWNFIXES_SAVE_PAYLOAD_SPLIT
1-trace.network:174 POST request status=200 monotonic=51567.659
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent="<!-- wp:paragraph --> <p>Initial body.</p> <!-- /wp:paragraph --> <!-- wp:paragraph --> <p>same user post-reload active edit</p> <!-- /wp:paragraph --> <!-- wp:paragraph --> <p>same user save-after-reload edit</p> <!-- /wp:paragraph -->"
  crdtContent="<!-- wp:paragraph --><p>Initial body.</p><!-- /wp:paragraph -->"
  version=document:1572:5badfbc8e72806ad baseVersion=document:1480:19dc4d0e73e3195f updateId=443057791
1-trace.network:174 POST response status=200 monotonic=51567.659
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent="<!-- wp:paragraph --> <p>Initial body.</p> <!-- /wp:paragraph --> <!-- wp:paragraph --> <p>same user post-reload active edit</p> <!-- /wp:paragraph --> <!-- wp:paragraph --> <p>same user save-after-reload edit</p> <!-- /wp:paragraph -->"
  crdtContent="<!-- wp:paragraph --><p>Initial body.</p><!-- /wp:paragraph -->"
  version=document:1572:5badfbc8e72806ad baseVersion=document:1480:19dc4d0e73e3195f updateId=443057791
PASS79_SOURCE_FINAL_EDITOR_FAILURE {"callId":"expect@91","received":"RTC same-user save-after-reload initial"}
```

That is the narrowest root-cause proof for the original source failure: the
REST save body and response persist the customer title, while the embedded
`_crdt_document` in that same save still carries the initial title and initial
body. The failure is therefore not a stale REST poll, locator issue, readiness
wait, inverted assertion, or malformed generated spec.

Pass 79 also reran the natural-user browser repro against the known-fixes
checkout. The requested `WP_ENV_PORT=9902` default environment was running but
failed global setup because it did not have
`gutenberg-test-plugin-rtc-websocket-provider` installed. The test-config
environment for that checkout was running with actual HTTP port `9906`, and the
same repro failed there:

```text
known-fixes checkout 3cba2b1e56a9 on WP_BASE_URL=http://localhost:9906:
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-79 known-fixes trace also shows the same split:

```text
PASS79_KNOWNFIXES_KNOWNFIXES_SAVE_PAYLOAD_SPLIT
1-trace.network:177 POST request status=200 monotonic=15002.427
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent="<!-- wp:paragraph --> <p>Initial body.</p> <!-- /wp:paragraph --> <!-- wp:paragraph --> <p>same user post-reload active edit</p> <!-- /wp:paragraph -->"
  crdtContent="<!-- wp:paragraph --><p>Initial body.</p><!-- /wp:paragraph -->"
1-trace.network:177 POST response status=200 monotonic=15002.427
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
PASS79_KNOWNFIXES_FINAL_EDITOR_FAILURE {"callId":"expect@102","received":"RTC same-user save-after-reload initial"}
```

Pass 79 reconfirmed that the existing PR branch still satisfies the requested
standard on current `origin/trunk`:

```text
origin/trunk 369e71ec7258
PR branch delta: 0 behind, 3 ahead
9c06fd65ea2 Add RTC title reload unit repros
f638763b3c1 Add same-user title save-after-reload browser repro
8cf74ce40fd Preserve RTC title across reload saves
```

Focused non-Playwright repro tests still fail at the test-only commit and pass
after the fix:

```text
test-only commit 9c06fd65ea2:
Test Suites: 3 failed, 1 skipped, 3 of 4 total
Tests: 4 failed, 119 skipped, 123 total

fixed PR branch:
Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests: 119 skipped, 4 passed, 123 total
```

Pass 79 fixed-branch verification:

```text
targeted lint: passed
targeted build: All packages built successfully! (39792ms total)
git diff --check origin/trunk..HEAD: no output

fixed PR branch on 9927:
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

The pass-77 annotated headless video remains valid and was rechecked again:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-77/6f589c89600c-pass77-annotated.mp4
width=1920 height=1080 duration=48.000000 nb_frames=1200
sha256=8ca2d311b6cad2510653e7b4832de38475799faed5c45a040044db7536ebcb64
```

## Pass 80 update

Pass 80 independently verified that the existing branches, repros, fix, and
video still satisfy the requested standard.

The original source log was re-read. Four same-user title/content reload tests
passed, and only the save-after-reload assertion failed:

```text
4 passed
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The original screenshots show the split directly: one editor tab is saved with
the initial title while the other tab still shows the customer title. The
pass-79 decoded source trace remains the narrow root-cause proof: the final
successful REST save carried current raw title/content, but the `_crdt_document`
in the same payload and response still carried the initial title/body.

Pass 80 added a fresh lower-level before/after verification using the existing
test-only commit and PR head:

```text
test-only commit 9c06fd65ea2:
Test Suites: 3 failed, 1 skipped, 3 of 4 total
Tests: 4 failed, 119 skipped, 123 total

fixed PR branch 8cf74ce40fd:
Test Suites: 4 passed, 4 total
Tests: 123 passed, 123 total
```

The known-fixes checkout still fails the natural-user browser repro:

```text
known-fixes checkout 3cba2b1e56a9 on WP_BASE_URL=http://localhost:9906:
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fixed PR branch passed the same natural-user browser repro headlessly after
rebuilding packages:

```text
PR branch 8cf74ce40fd on WP_BASE_URL=http://localhost:9905:
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

Pass 80 also rechecked the video artifact:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-77/6f589c89600c-pass77-annotated.mp4
width=1920 height=1080 duration=48.000000 nb_frames=1200
sha256=8ca2d311b6cad2510653e7b4832de38475799faed5c45a040044db7536ebcb64
```

## Pass 81 update

Pass 81 adds a fresh known-fixes browser rerun and trace decode, plus a
fresh before/after lower-level check. This is not only a restatement of pass
80.

The known-fixes environment was already running on actual HTTP port `9906`.
The same natural-user browser repro failed again there:

```text
known-fixes checkout 3cba2b1e56a9 on WP_BASE_URL=http://localhost:9906:
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-81 trace from that run was decoded. The final successful save
again wrote correct raw post data and stale CRDT metadata in the same HTTP
request/response:

```text
PASS81_FRESH_KNOWNFIXES_SAVE_PAYLOAD_SPLIT
1-trace.network:176 POST request status=200 monotonic=14236.267
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent="<!-- wp:paragraph --> <p>Initial body.</p> <!-- /wp:paragraph --> <!-- wp:paragraph --> <p>same user post-reload active edit</p> <!-- /wp:paragraph -->"
  crdtContent="<!-- wp:paragraph --><p>Initial body.</p><!-- /wp:paragraph -->"
  version=document:1280:2646a10e32adcdb3 baseVersion=document:1040:217a659c883e6f5d updateId=27452435
1-trace.network:176 POST response status=200 monotonic=14236.267
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
PASS81_FRESH_FINAL_EDITOR_FAILURE {"callId":"expect@100","received":"RTC same-user save-after-reload initial"}
```

That fresh pass-81 artifact rules out readiness waits, stale REST polling,
locator errors, malformed generated actions, inverted assertions, and an
environment-only failure. The save completed with status `200` and persisted
the customer title in raw REST state; only the active editor state was rolled
back from stale CRDT metadata.

Pass 81 lower-level before/after:

```text
test-only commit 9c06fd65ea2:
Test Suites: 3 failed, 1 skipped, 3 of 4 total
Tests: 4 failed, 119 skipped, 123 total

fixed PR branch 8cf74ce40fd:
Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests: 119 skipped, 4 passed, 123 total
```

The failing test-only assertions are exactly the intended ones: the old sync
manager serializes the initial title instead of the record being saved, does
not pass the persisted record into the CRDT diff, and replays the persisted raw
title over a dirty local title.

The fixed branch passed the same natural-user Playwright repro headlessly on
port `9905` after port `9902` was rejected as already allocated:

```text
PR branch 8cf74ce40fd on WP_BASE_URL=http://localhost:9905:
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

The PR branch still has exactly the requested three commits on top of
`origin/trunk`:

```text
9c06fd65ea2 Add RTC title reload unit repros
f638763b3c1 Add same-user title save-after-reload browser repro
8cf74ce40fd Preserve RTC title across reload saves
```

`git diff --check origin/trunk..HEAD` produced no output on the PR branch.

The pass-77 annotated headless video remains valid and was rechecked in pass
81:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-77/6f589c89600c-pass77-annotated.mp4
width=1920 height=1080 duration=48.000000 nb_frames=1200
sha256=8ca2d311b6cad2510653e7b4832de38475799faed5c45a040044db7536ebcb64
```

## Pass 82 update

Pass 82 adds a fresh source-trace decoder proof and a same-day before/after
verification. This is not only a restatement of pass 81.

The original archived trace and a fresh known-fixes rerun on actual HTTP port
`9903` were decoded from Playwright `trace.zip` resources with `yjs` and
`lib0/buffer`. Both traces show the same split inside successful REST saves:
the raw post data is current, but the embedded `_crdt_document` still contains
the initial title/body.

Original source trace:

```text
SOURCE_ORIGINAL final POST request/response status=200
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent="Initial body + post-reload active edit + save-after-reload edit"
  crdtContent="Initial body only"
```

Fresh pass-82 known-fixes trace:

```text
PASS82_KNOWNFIXES_9903 final POST request/response status=200
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent="Initial body + post-reload active edit"
  crdtContent="Initial body only"
```

The full decoder output is:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-82/6f589c89600c-pass82-trace-payload-proof.log
```

That payload-level proof rules out readiness waits, action locator errors,
malformed generated specs, environment failures, inverted assertions, and stale
REST polling. The server accepted the save and returned `200`; the rollback is
caused by stale CRDT persistence being replayed into the active editor state.

Pass 82 known-fixes browser repro:

```text
known-fixes checkout 3cba2b1e56a9 on WP_BASE_URL=http://localhost:9903:
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

Pass 82 non-Playwright negative control isolated the lowest sync-manager
surface so it did not depend on browser readiness:

```text
test-only commit 9c06fd65ea2:
packages/sync/src/test/manager.ts
Tests: 2 failed, 26 skipped, 28 total

Expected: "Customer title"
Received: "Initial title"

getChangesFromCRDTDoc was called without the persisted record argument.
```

The broader test-only unit command also hit the same intended sync-manager
failures, but the temporary worktree's shared dependency tree could not load
the core-data suites because `framer-motion` was absent from that tree. The PR
branch worktree did have enough package dependency layout to run the full
focused fixed set.

Pass 82 fixed-branch lower-level verification:

```text
fixed PR branch 8cf74ce40fd:
Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests: 119 skipped, 4 passed, 123 total
```

Pass 82 fixed-branch natural-user Playwright repro:

```text
PR branch 8cf74ce40fd on WP_BASE_URL=http://localhost:9912:
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

The first fixed Playwright run used the default `.wp-env.json` environment and
failed global setup because the e2e test plugin directory was not mounted. The
test-config environment could not be started because Docker had exhausted its
predefined address pools. The final passing run used the already-running
PR-branch environment and symlinked the repo's e2e test plugins into
`wp-content/plugins/gutenberg-test-plugins`, matching the `.wp-env.test.json`
plugin layout without changing product code.

Pass 82 rechecked origin points. The immediate affected lines still blame to:

- `2d8b22633dd` / PR `#72373`, which introduced CRDT persistence.
- `50b0a31ec01` / PR `#74668`, which made persisted-document application rely
  on `getChangesFromCRDTDoc( tempDoc, record )`.
- `22e067b0243` / PR `#75448`, which moved title/content/excerpt through the
  Y.Text path.
- `8051e14451c` / PR `#75975`, which flushed deferred Y.Doc updates but still
  serialized the manager's current document rather than the exact record being
  saved.
- `85cbd148b1c` / PR `#77966`, current `origin/trunk`, which correctly avoids
  a redundant hydration observer fire but does not address stale save-time
  `_crdt_document` metadata.

The existing PR branch still has exactly the requested three commits on top of
current `origin/trunk`:

```text
9c06fd65ea2 Add RTC title reload unit repros
f638763b3c1 Add same-user title save-after-reload browser repro
8cf74ce40fd Preserve RTC title across reload saves
```

## Pass 83 update

Pass 83 independently reran the focused natural-user repro on the known-fixes
checkout and decoded the fresh pass-83 trace. This reproduced the same product
state rollback on actual HTTP port `9903`:

```text
known-fixes checkout 3cba2b1e56a9 on WP_BASE_URL=http://localhost:9903:
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-83 trace used post id `633`. The final same-save request and
response both show current raw REST state paired with stale `_crdt_document`
metadata:

```text
1-trace.network POST request status=200 /wp-json/wp/v2/posts/633?_locale=user
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent="Initial body + same user post-reload active edit"
  crdtContent="Initial body only"

1-trace.network POST response status=200 /wp-json/wp/v2/posts/633?_locale=user
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent="Initial body + same user post-reload active edit"
  crdtContent="Initial body only"

2-trace.network GET response status=200 /wp-json/wp/v2/posts/633?context=edit
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
```

That is a fresh pass-83 root-cause proof, not a reliance on the older archived
source trace. It again rules out stale REST polling: after the save, REST
returns the customer title while the active editor assertion still reads the
initial title.

Pass 83 also reran the lowest focused non-Playwright repro from the test-only
commit:

```text
test-only commit 9c06fd65ea2:
packages/sync/src/test/manager.ts
Tests: 2 failed, 26 skipped, 28 total

Expected: "Customer title"
Received: "Initial title"

getChangesFromCRDTDoc was called without the persisted record argument.
```

The fixed PR branch still passes the focused lower-level checks:

```text
fixed PR branch 8cf74ce40fd:
Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests: 119 skipped, 4 passed, 123 total
```

The fixed PR branch also passed the same natural-user browser repro headlessly
on the already-running PR-branch environment:

```text
PR branch 8cf74ce40fd on WP_BASE_URL=http://localhost:9912:
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

Pass 83 rechecked the existing annotated video artifact rather than generating
another equivalent copy:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-82/6f589c89600c-pass82-annotated.mp4
width=1920
height=1080
duration=48.000000
nb_frames=1200
```

The PR branch still has the required commit order and `git diff --check
origin/trunk..HEAD` is clean:

```text
9c06fd65ea2 Add RTC title reload unit repros
f638763b3c1 Add same-user title save-after-reload browser repro
8cf74ce40fd Preserve RTC title across reload saves
```

## Pass 84 update

Pass 84 independently verified that the existing branch, repros, fix, and video
still satisfy the requested standard, and added a fresh known-fixes browser
rerun plus trace decode.

The original source trace was decoded again from the archived fuzz artifacts.
The final successful save in that trace has the raw REST record and CRDT
metadata split in the same HTTP request/response:

```text
1-trace.network POST request/response status=200 /wp-json/wp/v2/posts/226?_locale=user
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent="Initial body + same user post-reload active edit + same user save-after-reload edit"
  crdtContent="Initial body only"

2-trace.network GET response status=200 /wp-json/wp/v2/posts/226?context=edit
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
```

A fresh pass-84 known-fixes repro was run on the already-running known-fixes
site, actual HTTP port `9903`. It failed the same natural-user-action test:

```text
known-fixes checkout 3cba2b1e56a9 on WP_BASE_URL=http://localhost:9903:
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-84 trace used post id `645` and again shows current raw REST
state paired with stale `_crdt_document` metadata:

```text
1-trace.network POST request status=200 /wp-json/wp/v2/posts/645?_locale=user
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent="Initial body + same user post-reload active edit"
  crdtContent="Initial body only"

1-trace.network POST response status=200 /wp-json/wp/v2/posts/645?_locale=user
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"

2-trace.network GET response status=200 /wp-json/wp/v2/posts/645?context=edit
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
```

The test-only lower-level repro still fails before the fix at commit
`9c06fd65ea2`:

```text
packages/sync/src/test/manager.ts
Tests: 2 failed, 26 skipped, 28 total

Expected: "Customer title"
Received: "Initial title"

getChangesFromCRDTDoc was called without the persisted record argument.
```

The fixed PR branch still passes the focused lower-level checks:

```text
fixed PR branch 8cf74ce40fd:
Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests: 119 skipped, 4 passed, 123 total
```

The fixed PR branch also passed the same natural-user browser repro headlessly
on actual HTTP port `9912`:

```text
PR branch 8cf74ce40fd on WP_BASE_URL=http://localhost:9912:
1 passed
Collaboration - same user title loss - saves the active title after a same-user browser session reloads
```

Pass 84 also ran the targeted build:

```text
WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production node packages/wp-build/lib/build.mjs
All packages built successfully! (24797ms total)
```

The existing pass-82 annotated headless video remains valid:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-82/6f589c89600c-pass82-annotated.mp4
width=1920
height=1080
duration=48.000000
nb_frames=1200
```

The PR branch still has the required commit order and `git diff --check
origin/trunk..HEAD` is clean:

```text
9c06fd65ea2 Add RTC title reload unit repros
f638763b3c1 Add same-user title save-after-reload browser repro
8cf74ce40fd Preserve RTC title across reload saves
```

## Pass 85 update

Pass 85 added a narrower payload-level proof from the archived source trace and
reran both the lowest focused repro and the fixed-branch browser verification.

The original source trace was decoded from:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-3/fuzz-handoff/distinct-manifest-20260505/results-refresh-http-shard-3/outputs/0019-6f589c89600c/playwright-artifacts/test-results/editor-collaboration-colla-da7f1-ser-browser-session-reloads-chromium/trace.zip
```

The final save request and response in that trace carry the correct raw REST
title and a stale persisted CRDT title in the same payload:

```text
1-trace.network POST request status=200 /wp-json/wp/v2/posts/226?_locale=user
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent="Initial body + same user post-reload active edit + same user save-after-reload edit"
  crdtContent="Initial body only"

1-trace.network POST response status=200 /wp-json/wp/v2/posts/226?_locale=user
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"

2-trace.network GET response status=200 /wp-json/wp/v2/posts/226?context=edit
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
```

That rules out stale REST polling and strengthens the root-cause proof: the
server has the customer title, but the saved `_crdt_document` still contains the
initial title and is later replayed into the active editor.

Pass 85 also checked blame on current `origin/trunk`. The immediate stale
serialization point is `8051e14451c` / PR `#75975`: it waits one event-loop tick
before serializing, but still calls `serializeCrdtDoc( entityState.ydoc )`
without applying the exact `edits` record being saved. The save hook in
`packages/core-data/src/entities.js` calls `createPersistedCRDTDoc( objectType,
objectId )` without passing those edits, and the title diff in
`packages/core-data/src/utils/crdt.ts` has no persisted-record context to
distinguish a stale base replay from a real remote title update.

A fresh known-fixes browser rerun on the suggested `WP_ENV_PORT=9902` was
blocked before WordPress startup by local Docker network exhaustion:

```text
failed to create network wp-env-gutenberg-rtc-known-fixes-refresh-20260505-9ee89b91_default:
Error response from daemon: all predefined address pools have been fully subnetted
```

The non-Playwright repro still fails on the test-only checkout based on current
`origin/trunk` plus only the repro tests:

```text
/private/tmp/gutenberg-6f589c-pass82-testonly
HEAD 9c06fd65ea2 Add RTC title reload unit repros

packages/sync/src/test/manager.ts
Tests: 2 failed, 26 skipped, 28 total

Expected: "Customer title"
Received: "Initial title"

getChangesFromCRDTDoc was called without the persisted record argument.
```

The fixed PR branch still passes the focused lower-level checks:

```text
fixed PR branch 8cf74ce40fd:
Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests: 119 skipped, 4 passed, 123 total
```

The fixed branch also passed the natural-user browser repro headlessly on the
already-running PR-branch environment, actual HTTP port `9912`:

```text
WP_BASE_URL=http://localhost:9912
1 passed
Collaboration - same user title loss - saves the active title after a same-user browser session reloads
```

Pass 85 reran the targeted production build:

```text
WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production node packages/wp-build/lib/build.mjs
All packages built successfully! (21411ms total)
```

The existing pass-82 annotated headless video remains valid:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-82/6f589c89600c-pass82-annotated.mp4
width=1920
height=1080
duration=48.000000
nb_frames=1200
```

The PR branch commit order is still:

```text
9c06fd65ea2 Add RTC title reload unit repros
f638763b3c1 Add same-user title save-after-reload browser repro
8cf74ce40fd Preserve RTC title across reload saves
```

## Pass 86 update

Pass 86 rebased the PR branch onto current `origin/trunk`
`4425c07cbc7` and re-verified the existing fix and video rather than only
restating the prior pass.

The rebased PR branch commit order is:

```text
38595ac3c1d Add RTC title reload unit repros
1b6c925607d Add same-user title save-after-reload browser repro
402acf7bc30 Preserve RTC title across reload saves
```

A detached test-only worktree at `1b6c925607d` reproduced the lowest-level
failure before the fix:

```text
env WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 npm run test:unit -- \
  packages/sync/src/test/manager.ts \
  --runInBand \
  --testNamePattern='serializes the record being saved|passes the persisted record when remote updates are diffed'

Test Suites: 1 failed, 1 total
Tests: 2 failed, 26 skipped, 28 total

Expected: "Customer title"
Received: "Initial title"

getChangesFromCRDTDoc was called without the persisted record argument.
```

The archived known-fixes browser trace was decoded again. The final successful
save request still contains the correct raw REST title and stale serialized
CRDT title in the same payload:

```text
1-trace.network POST request status=200 /wp-json/wp/v2/posts/226?_locale=user
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"

2-trace.network GET response status=200 /wp-json/wp/v2/posts/226?context=edit
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
```

That remains the narrowest root-cause proof: save-time REST state and saved
CRDT metadata diverge before any later assertion or polling code can affect the
result.

The known-fixes checkout was checked first and was stopped:

```text
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
npm run wp-env status

status: stopped
```

A fresh known-fixes browser rerun was blocked before WordPress startup by the
same local Docker network-capacity failure:

```text
env WP_ENV_PORT=9902 WP_ENV_PHPMYADMIN_PORT=9002 npm run wp-env start

failed to create network wp-env-gutenberg-rtc-known-fixes-refresh-20260505-9ee89b91_default:
Error response from daemon: all predefined address pools have been fully subnetted
```

The archived known-fixes source result remains the browser-level failure
evidence:

```text
rtc-safe-sync-title-lost-after-reload::6f589c89600c
result: failed
exitCode: 1
timedOut: false
```

The rebased fixed branch passed the focused non-browser checks:

```text
env WP_ENV_PORT=9912 WP_ENV_PHPMYADMIN_PORT=9012 WP_BASE_URL=http://localhost:9912 npm run test:unit -- \
  packages/core-data/src/test/entities.js \
  packages/core-data/src/test/resolvers.js \
  packages/core-data/src/utils/test/crdt.ts \
  packages/sync/src/test/manager.ts \
  --runInBand \
  --testNamePattern='serializes the record being saved|does not overwrite a dirty title|passes the persisted record through|passes the persisted record when remote updates are diffed'

Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests: 119 skipped, 4 passed, 123 total
```

The rebased fixed branch passed the targeted production build:

```text
env WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production node packages/wp-build/lib/build.mjs
All packages built successfully! (24687ms total)
```

The rebased fixed branch passed the natural-user Playwright repro headlessly
against the already-running PR worktree `wp-env` on actual HTTP port `9912`:

```text
env WP_ENV_PORT=9912 WP_ENV_PHPMYADMIN_PORT=9012 WP_BASE_URL=http://localhost:9912 \
  RTC_MANIFEST_WS_START_PORT=20416 RTC_MANIFEST_WS_FIXED_PORT=1 \
  WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-86/playwright-fixed \
  npm run test:e2e -- \
    test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
    --project=chromium \
    --workers=1 \
    --grep 'saves the active title after a same-user browser session reloads'

1 passed
Collaboration - same user title loss - saves the active title after a same-user browser session reloads
```

The existing pass-82 annotated headless video was revalidated:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-82/6f589c89600c-pass82-annotated.mp4
width=1920
height=1080
duration=48.000000
nb_frames=1200
```

## Pass 87 update

Pass 87 independently re-read the source result, source log, screenshots,
archived trace, current PR branch diff, current `origin/trunk` blame, and the
prior pass summary. The classification remains real product bug. The source run
had four same-user control tests pass and only the save-after-reload active
title assertion fail:

```text
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The two source screenshots show both sides of the same split: one same-user tab
still displays the customer title while the saved active tab has reverted to
the initial title. A fresh trace decode again shows the narrower payload-level
cause, independent of the final UI assertion:

```text
1-trace.network POST request status=200 /wp-json/wp/v2/posts/226?_locale=user
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"

1-trace.network POST response status=200 /wp-json/wp/v2/posts/226?_locale=user
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"

2-trace.network GET response status=200 /wp-json/wp/v2/posts/226?context=edit
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
```

That rules out stale REST polling: the server-visible raw title is already the
customer title, while the `_crdt_document` saved with the same record still
contains the initial title.

Pass 87 also created a fresh stitched headless video rather than relying only
on the earlier pass-82 artifact:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-87/6f589c89600c-pass87-annotated.mp4
width=1920
height=1080
duration=16.000000
nb_frames=480
```

The video places the two source failure screenshots side-by-side and overlays
the natural action sequence plus the decisive trace payload facts.

The known-fixes checkout was checked first and remained stopped:

```text
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
npm run wp-env status

status: stopped
HEAD 3cba2b1e56a98787de08dc6c7df2434759e8f908
```

A fresh known-fixes browser rerun was again blocked before WordPress startup by
local Docker network exhaustion:

```text
env WP_ENV_PORT=9902 WP_ENV_PHPMYADMIN_PORT=9002 npm run wp-env start

failed to create network wp-env-gutenberg-rtc-known-fixes-refresh-20260505-9ee89b91_default:
Error response from daemon: all predefined address pools have been fully subnetted
```

The archived known-fixes refresh failure remains the browser-level known-fixes
evidence, and pass 87 refreshed the non-browser negative control on a detached
test-only worktree at `1b6c925607d`:

```text
/private/tmp/gutenberg-6f589c-pass87-testonly
HEAD 1b6c925607d Add same-user title save-after-reload browser repro

env WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 npm run test:unit -- \
  packages/sync/src/test/manager.ts \
  --runInBand \
  --testNamePattern='serializes the record being saved|passes the persisted record when remote updates are diffed'

Test Suites: 1 failed, 1 total
Tests: 2 failed, 26 skipped, 28 total

Expected: "Customer title"
Received: "Initial title"

getChangesFromCRDTDoc was called without the persisted record argument.
```

The fixed PR branch still has the requested commit order:

```text
38595ac3c1d Add RTC title reload unit repros
1b6c925607d Add same-user title save-after-reload browser repro
402acf7bc30 Preserve RTC title across reload saves
```

The fixed branch passed the focused lower-level checks:

```text
env WP_ENV_PORT=9912 WP_ENV_PHPMYADMIN_PORT=9012 WP_BASE_URL=http://localhost:9912 npm run test:unit -- \
  packages/core-data/src/test/entities.js \
  packages/core-data/src/test/resolvers.js \
  packages/core-data/src/utils/test/crdt.ts \
  packages/sync/src/test/manager.ts \
  --runInBand \
  --testNamePattern='serializes the record being saved|does not overwrite a dirty title|passes the persisted record through|passes the persisted record when remote updates are diffed'

Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests: 119 skipped, 4 passed, 123 total
```

The fixed branch passed a production build:

```text
env WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production node packages/wp-build/lib/build.mjs
All packages built successfully! (22900ms total)
```

The fixed branch passed the natural-user Playwright repro headlessly against
the already-running PR worktree `wp-env` on actual HTTP port `9912`:

```text
env WP_ENV_PORT=9912 WP_ENV_PHPMYADMIN_PORT=9012 WP_BASE_URL=http://localhost:9912 \
  RTC_MANIFEST_WS_START_PORT=20416 RTC_MANIFEST_WS_FIXED_PORT=1 \
  WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-87/playwright-fixed \
  npm run test:e2e -- \
    test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
    --project=chromium \
    --workers=1 \
    --grep 'saves the active title after a same-user browser session reloads'

1 passed
Collaboration - same user title loss - saves the active title after a same-user browser session reloads
```

Current `origin/trunk` blame still points at the same failure shape:

- `packages/core-data/src/entities.js` calls
  `createPersistedCRDTDoc( objectType, objectId )` on trunk without passing the
  current save edits.
- `packages/sync/src/manager.ts` waits one event-loop tick after
  `8051e14451c` / PR `#75975`, but still serializes
  `entityState.ydoc` as-is.
- `packages/core-data/src/utils/crdt.ts` compares title/content/excerpt raw
  values with no persisted-record context, so an exact stale persisted raw
  replay can look like a new CRDT field change.

The implemented fix is still the revised plan: pass `{ record: edits }` into
CRDT metadata serialization, apply that record to the Y.Doc immediately before
serialization, pass the persisted raw record into CRDT diffing, and suppress
only exact persisted raw replays for dirty `title`, `content`, and `excerpt`
fields.

## Pass 88 verification

Pass 88 added a fresh browser-level known-fixes rerun and a fresh trace decode,
rather than relying only on the archived source trace or the previous Docker
startup attempts.

The known-fixes checkout was still at:

```text
3cba2b1e56a98787de08dc6c7df2434759e8f908
```

The requested `WP_ENV_PORT=9902` status check showed that the known-fixes test
environment was already running, but Docker had mapped this worktree's
WordPress container to actual HTTP port `9903`; port `9902` belonged to an
unrelated bug worktree. The pass therefore ran the known-fixes browser repro
against `WP_BASE_URL=http://localhost:9903`.

```text
env WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9903 \
  RTC_MANIFEST_WS_START_PORT=20416 RTC_MANIFEST_WS_FIXED_PORT=1 \
  WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-88/knownfix-playwright \
  npm run test:e2e -- \
    test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
    --project=chromium \
    --workers=1 \
    --grep 'saves the active title after a same-user browser session reloads'
```

Result on known-fixes:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-88 known-fixes trace reproduced the same payload split on post
`487`:

```text
POST /wp-json/wp/v2/posts/487?_locale=user
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"

GET /wp-json/wp/v2/posts/487?context=edit
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
```

That is the narrow pass-88 root-cause proof: in a fresh run, the save request,
save response, and follow-up REST read all preserve the raw customer title
while `_crdt_document` still decodes to the initial title.

Pass 88 also created a detached test-only worktree at `HEAD~1` of the PR branch
and reran the lowest non-Playwright sync-manager repro:

```text
/private/tmp/gutenberg-6f589c-pass88-testonly.kyvaEB
HEAD 1b6c925607d Add same-user title save-after-reload browser repro

env WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 npm run test:unit -- \
  packages/sync/src/test/manager.ts \
  --runInBand \
  --testNamePattern='serializes the record being saved|passes the persisted record when remote updates are diffed'
```

Result before the fix:

```text
Test Suites: 1 failed, 1 total
Tests: 2 failed, 26 skipped, 28 total

Expected: "Customer title"
Received: "Initial title"

getChangesFromCRDTDoc was called without the persisted record argument.
```

The fixed PR branch still has the required commit order:

```text
38595ac3c1d Add RTC title reload unit repros
1b6c925607d Add same-user title save-after-reload browser repro
402acf7bc30 Preserve RTC title across reload saves
```

Focused fixed unit checks passed:

```text
env WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 npm run test:unit -- \
  packages/core-data/src/test/entities.js \
  packages/core-data/src/test/resolvers.js \
  packages/core-data/src/utils/test/crdt.ts \
  packages/sync/src/test/manager.ts \
  --runInBand \
  --testNamePattern='serializes the record being saved|does not overwrite a dirty title|passes the persisted record through|passes the persisted record when remote updates are diffed'

Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests: 119 skipped, 4 passed, 123 total
```

The production build passed after the browser rerun:

```text
env WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production node packages/wp-build/lib/build.mjs
All packages built successfully! (24147ms total)
```

The fixed natural-user browser repro then passed again against the PR worktree's
running `wp-env` on actual HTTP port `9912`, after the production build:

```text
env WP_ENV_PORT=9912 WP_ENV_PHPMYADMIN_PORT=9012 WP_BASE_URL=http://localhost:9912 \
  RTC_MANIFEST_WS_START_PORT=20416 RTC_MANIFEST_WS_FIXED_PORT=1 \
  WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-88/playwright-fixed \
  npm run test:e2e -- \
    test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
    --project=chromium \
    --workers=1 \
    --grep 'saves the active title after a same-user browser session reloads'

1 passed
Collaboration - same user title loss - saves the active title after a same-user browser session reloads
```

Pass 88 generated a new annotated stitched headless video from the fresh
known-fixes failure screenshots and action/payload proof:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-88/6f589c89600c-pass88-annotated.mp4
width=1920
height=1080
duration=30.000000
nb_frames=900
```

The pass-88 conclusion is unchanged but better supported: this is a product
bug at the save-time CRDT persistence boundary. The existing PR branch and fix
still satisfy the requested standard after a fresh known-fixes failure, a fresh
payload decode, focused lower-level before/after checks, production build, and
post-build natural-user browser verification.

## Pass 89 verification

Pass 89 verified that the existing explanation branch, PR branch, and annotated
video still satisfy the requested standard. `origin/trunk` remained at
`4425c07cbc701bb57acc5fa65aabeb256b5285db`, so the PR branch is still exactly
the requested three commits on top of trunk:

```text
38595ac3c1d Add RTC title reload unit repros
1b6c925607d Add same-user title save-after-reload browser repro
402acf7bc30 Preserve RTC title across reload saves
```

The fresh pass-89 known-fixes browser rerun again failed on known-fixes commit
`3cba2b1e56a98787de08dc6c7df2434759e8f908`. The `.wp-env.test.json` status
check reported the known-fixes environment running with actual HTTP port `9903`,
so the repro used that port:

```text
env WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9903 \
  RTC_MANIFEST_WS_START_PORT=20416 RTC_MANIFEST_WS_FIXED_PORT=1 \
  WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-89/knownfix-playwright \
  npm run test:e2e -- \
    test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
    --project=chromium \
    --workers=1 \
    --grep 'saves the active title after a same-user browser session reloads'

1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-89 trace decoded to the same split, now on post `502`:

```text
POST /wp-json/wp/v2/posts/502?_locale=user
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"

GET /wp-json/wp/v2/posts/502?context=edit
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
```

That is a fresh payload-level proof that the raw REST save succeeds while the
persisted `_crdt_document` stores the older title snapshot.

The pre-fix non-Playwright repro still fails in the detached test-only worktree
at `1b6c925607d`:

```text
env WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 npm run test:unit -- \
  packages/sync/src/test/manager.ts \
  --runInBand \
  --testNamePattern='serializes the record being saved|passes the persisted record when remote updates are diffed'

Test Suites: 1 failed, 1 total
Tests: 2 failed, 26 skipped, 28 total
Expected: "Customer title"
Received: "Initial title"
```

The fixed PR branch passed the focused lower-level checks:

```text
env WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 npm run test:unit -- \
  packages/core-data/src/test/entities.js \
  packages/core-data/src/test/resolvers.js \
  packages/core-data/src/utils/test/crdt.ts \
  packages/sync/src/test/manager.ts \
  --runInBand \
  --testNamePattern='serializes the record being saved|does not overwrite a dirty title|passes the persisted record through|passes the persisted record when remote updates are diffed'

Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests: 119 skipped, 4 passed, 123 total
```

The fixed branch also passed a fresh production build and the natural-user
Playwright repro against the running PR worktree `wp-env` on port `9912`:

```text
env WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production node packages/wp-build/lib/build.mjs
All packages built successfully! (21364ms total)

env WP_ENV_PORT=9912 WP_ENV_PHPMYADMIN_PORT=9012 WP_BASE_URL=http://localhost:9912 \
  RTC_MANIFEST_WS_START_PORT=20416 RTC_MANIFEST_WS_FIXED_PORT=1 \
  WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-89/playwright-fixed \
  npm run test:e2e -- \
    test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
    --project=chromium \
    --workers=1 \
    --grep 'saves the active title after a same-user browser session reloads'

1 passed
Collaboration - same user title loss - saves the active title after a same-user browser session reloads
```

The pass-88 annotated stitched headless video was rechecked in pass 89 and is
still valid:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-88/6f589c89600c-pass88-annotated.mp4
width=1920
height=1080
duration=30.000000
nb_frames=900
```

No PR-branch code changes were needed in pass 89.

## Pass 90 verification

Pass 90 re-read the source artifacts and independently confirmed the same
product-bug shape. The source run had four same-user collaboration controls pass
before the final save-after-reload case failed, which argues against a malformed
spec, broken collaboration setup, readiness wait, or action locator problem. The
source screenshots and the fresh pass-90 screenshots show a same-user split:
the active saved tab has reverted to the initial title while the other same-user
tab still shows the customer title.

Both target branches were rebased onto current `origin/trunk`:

```text
origin/trunk ebc3c0a4663d79c5581bf2b94b68531349e96c48
```

The PR branch remains the requested three-commit sequence after the rebase:

```text
29cb3160fed Add RTC title reload unit repros
aca4e1bc10a Add same-user title save-after-reload browser repro
a0af5a2dca0 Preserve RTC title across reload saves
```

Fresh pass-90 known-fixes browser repro, after checking `wp-env status` and
using the actual HTTP port `9903`, still fails:

```text
env WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9903 \
  RTC_MANIFEST_WS_START_PORT=20416 RTC_MANIFEST_WS_FIXED_PORT=1 \
  WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-90/knownfix-playwright \
  npm run test:e2e -- \
    test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
    --project=chromium \
    --workers=1 \
    --grep 'saves the active title after a same-user browser session reloads'

1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

Pass 90 decoded the fresh known-fixes trace for post `518`. This is the narrower
root-cause proof: the final REST save stores the user-visible customer title in
the raw post fields, but the persisted `_crdt_document` stores the older initial
title, so reload-time CRDT hydration can replay a stale title over the active
editor state.

```text
POST /wp-json/wp/v2/posts/518?_locale=user
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"

GET /wp-json/wp/v2/posts/518?context=edit
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
```

Fresh pre-fix unit repro on the rebased test-only commit still fails:

```text
cd /private/tmp/gutenberg-6f589c-pass90-testonly
env WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 npm run test:unit -- \
  packages/sync/src/test/manager.ts \
  --runInBand \
  --testNamePattern='serializes the record being saved|passes the persisted record when remote updates are diffed'

Test Suites: 1 failed, 1 total
Tests: 2 failed, 26 skipped, 28 total
Expected: "Customer title"
Received: "Initial title"
getChangesFromCRDTDoc was called without the persisted record argument.
```

The rebased fixed branch passes the focused lower-level checks:

```text
env WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 npm run test:unit -- \
  packages/core-data/src/test/entities.js \
  packages/core-data/src/test/resolvers.js \
  packages/core-data/src/utils/test/crdt.ts \
  packages/sync/src/test/manager.ts \
  --runInBand \
  --testNamePattern='serializes the record being saved|does not overwrite a dirty title|passes the persisted record through|passes the persisted record when remote updates are diffed'

Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests: 119 skipped, 4 passed, 123 total
```

The production build and fixed natural-user browser repro also pass after the
rebase:

```text
env WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production node packages/wp-build/lib/build.mjs
All packages built successfully! (36473ms total)

env WP_ENV_PORT=9912 WP_ENV_PHPMYADMIN_PORT=9012 WP_BASE_URL=http://localhost:9912 \
  RTC_MANIFEST_WS_START_PORT=20416 RTC_MANIFEST_WS_FIXED_PORT=1 \
  WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-90/playwright-fixed \
  npm run test:e2e -- \
    test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
    --project=chromium \
    --workers=1 \
    --grep 'saves the active title after a same-user browser session reloads'

1 passed
```

Pass 90 also generated a fresh annotated stitched headless video from the
current failure screenshots, action log, payload proof, unit repro, and fixed
verification:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-90/6f589c89600c-pass90-annotated.mp4
width=1920
height=1080
duration=30.000000
nb_frames=900
```

No fix logic changed in pass 90. The pass-90 contribution is a current-trunk
rebase plus a fresh narrower payload proof and fresh before/after verification
on the rebased branches.

## Pass 91 verification

Pass 91 independently re-read the source failure, source trace, current spec,
PR diff, and explanation branch. `origin/trunk` was still
`ebc3c0a4663d79c5581bf2b94b68531349e96c48`, so the pass-90 rebased branches
remained current.

The lowest non-Playwright repro was rerun on the rebased test-only commit
`aca4e1bc10ad3fcd2c7b9edb5bc678c853635e91` and still failed below
Playwright:

```text
Test Suites: 1 failed, 1 total
Tests: 2 failed, 26 skipped, 28 total
Expected: "Customer title"
Received: "Initial title"
getChangesFromCRDTDoc was called without the persisted record argument.
```

The fixed PR branch then passed the same focused lower-level checks:

```text
Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests: 119 skipped, 4 passed, 123 total
```

Pass 91 also reran the known-fixes browser repro after checking `wp-env status`
and using the Docker-reported HTTP port `9903`. It failed the same way:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-91 trace decoded to the same raw/CRDT split on post `530`:

```text
POST /wp-json/wp/v2/posts/530?_locale=user
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"

GET /wp-json/wp/v2/posts/530?context=edit
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
```

That keeps the classification as a product defect: a normal save persists the
user-visible raw title while CRDT metadata is serialized from an older title
snapshot.

The fixed branch passed a production build and the natural-user Playwright
repro again:

```text
All packages built successfully! (23205ms total)
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

Pass 91 generated a fresh annotated stitched headless video from the new
known-fixes failure screenshots and decoded payload proof:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-91/6f589c89600c-pass91-annotated.mp4
width=1920
height=1080
duration=30.000000
nb_frames=900
```

No fix logic changed in pass 91. The pass-91 contribution is a verification
that the existing branch, fix, and video standard still satisfy the requested
bar, plus a fresh known-fixes trace/video on the current pass.

## Pass 92 verification

Pass 92 re-read the pass-91 summary, source result, source failure log,
screenshots, decoded traces, current PR branch diff, and the blamed source
paths. `origin/trunk` remained
`ebc3c0a4663d79c5581bf2b94b68531349e96c48`, so the PR branch still has the
requested three commits directly on top of trunk:

```text
29cb3160fed Add RTC title reload unit repros
aca4e1bc10a Add same-user title save-after-reload browser repro
a0af5a2dca0 Preserve RTC title across reload saves
```

The source run still contains useful negative controls: four same-user tests
passed before the save-after-reload title case failed, so the failure is not a
global collaboration setup issue. The source trace and fresh pass-92 trace both
show the same narrower payload split: a browser save sends the current raw REST
record while `_crdt_document` encodes an older title snapshot.

Pass 92 reran the known-fixes browser repro after checking `wp-env status` and
using the Docker-reported HTTP port `9903`. The repro failed again:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-92 trace decoded to post `538` with the same mismatch:

```text
POST /wp-json/wp/v2/posts/538?_locale=user
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent="Initial body + same user post-reload active edit"
  crdtContent="Initial body"

GET /wp-json/wp/v2/posts/538?context=edit
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
```

The lowest non-Playwright repro was rerun on test-only commit
`aca4e1bc10ad3fcd2c7b9edb5bc678c853635e91` and failed below Playwright:

```text
Test Suites: 1 failed, 1 total
Tests: 2 failed, 26 skipped, 28 total
Expected: "Customer title"
Received: "Initial title"
getChangesFromCRDTDoc was called without the persisted record argument.
```

The fixed PR branch passed the focused lower-level checks:

```text
Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests: 119 skipped, 4 passed, 123 total
```

The fixed branch also passed a production build and the natural-user browser
repro:

```text
All packages built successfully! (19385ms total)
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

Pass 92 generated a new annotated stitched headless video from the fresh
known-fixes screenshots and pass-92 payload proof:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-92/6f589c89600c-pass92-annotated.mp4
width=1920
height=1080
duration=30.000000
nb_frames=900
```

No fix logic changed in pass 92. The pass-92 addition is a fresh independent
known-fixes repro and a narrower payload-level proof on a new post (`538`),
plus renewed verification that the existing branch, video, and fix still meet
the requested standard.

## Pass 93 verification

Pass 93 independently re-read the pass-92 summary, source result row, source
failure log, source error context, source trace, current PR branch diff, and
the save/hydration code paths. The source run remains a useful negative-control
run: four same-user collaboration tests passed before only the save-after-reload
title case failed.

The new pass-93 contribution is an independent non-Playwright repro route on
the core-data CRDT diff side, separate from the earlier sync-manager save
serialization proof. On the test-only commit
`aca4e1bc10ad3fcd2c7b9edb5bc678c853635e91`, after linking the local generated
package artifacts needed for Jest to reach the test body, the focused
core-data test fails before the fix:

```text
env WP_ENV_PORT=9902 WP_BASE_URL=http://localhost:9902 npm run test:unit -- \
  packages/core-data/src/utils/test/crdt.ts \
  --runInBand \
  --testNamePattern='does not overwrite a dirty title'

Test Suites: 1 failed, 1 total
Tests: 1 failed, 45 skipped, 46 total
Expected path: not "title"
Received value: "Persisted Title"
```

That proves the reload/hydration half of the defect below Playwright: an exact
persisted raw title can be misclassified as a CRDT field change and replayed
over a dirty local title.

Pass 93 also reran the known-fixes natural-user browser repro after checking
`wp-env status` and using the Docker-reported HTTP port `9903`. The repro still
fails:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-93 trace decoded to post `550` with the same final-save split:

```text
POST /wp-json/wp/v2/posts/550?_locale=user
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent="Initial body + same user post-reload active edit"
  crdtContent="Initial body"

GET /wp-json/wp/v2/posts/550?context=edit
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
```

The fixed PR branch still has the requested three commits on top of
`origin/trunk`:

```text
29cb3160fed Add RTC title reload unit repros
aca4e1bc10a Add same-user title save-after-reload browser repro
a0af5a2dca0 Preserve RTC title across reload saves
```

The fixed branch passes the focused lower-level checks:

```text
Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests: 119 skipped, 4 passed, 123 total
```

The fixed branch also passes a production build and the natural-user browser
repro:

```text
All packages built successfully! (21673ms total)
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

Pass 93 generated a new annotated stitched headless video from the fresh
known-fixes screenshots and pass-93 payload/core-data proof:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-93/6f589c89600c-pass93-annotated.mp4
width=1920
height=1080
duration=30.000000
nb_frames=900
```

No fix logic changed in pass 93. The existing PR branch, fix, and video
standard still satisfy the requested bar; pass 93 adds the lower-level
core-data diff proof that the stale persisted raw title replay exists
independently of the browser assertion and sync-manager serialization repro.

## Pass 94 verification

Pass 94 independently re-read the pass-93 summary, source result row, source
failure log, source screenshots, source trace, current PR branch diff, and the
explanation branch. The source classification still holds: this is not a
readiness wait, locator problem, malformed generated action, environment
failure, inverted assertion, or expected behavior. The failing source run had
four same-user collaboration tests pass before only the save-after-reload title
case failed, and the archived screenshots show a real same-user editor-state
split.

The pass-94 addition is a fresh verification that the existing branch, video,
and fix still satisfy the requested standard after rebuilding and rerunning the
negative and positive browser checks.

The known-fixes base environment was checked first:

```text
status: running
environment url: http://localhost:9902
http port: 9903
mysql port: 33062
```

Using the Docker-reported HTTP port `9903`, the known-fixes natural-user
browser repro still fails on post `554`:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-94 trace decodes to the same raw/CRDT split:

```text
POST /wp-json/wp/v2/posts/554?_locale=user
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent="Initial body + same user post-reload active edit"
  crdtContent="Initial body"

GET /wp-json/wp/v2/posts/554?context=edit
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
```

The fixed PR branch still has the requested three commits on top of
`origin/trunk`:

```text
29cb3160fed Add RTC title reload unit repros
aca4e1bc10a Add same-user title save-after-reload browser repro
a0af5a2dca0 Preserve RTC title across reload saves
```

Focused lower-level checks on the fixed branch passed:

```text
Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests: 118 skipped, 5 passed, 123 total
```

The fixed branch also passed a production build and the natural-user browser
repro:

```text
All packages built successfully! (24488ms total)
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

Pass 94 generated a new annotated stitched headless video from the fresh
known-fixes screenshots and pass-94 trace/build/test verification:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-94/6f589c89600c-pass94-annotated.mp4
width=1920
height=1080
duration=30.000000
nb_frames=900
```

No fix logic changed in pass 94. The pass-94 result is a stronger verification
that the existing three-commit PR branch, fix behavior, and video evidence
remain sufficient after a fresh known-fixes failure, decoded trace, focused
unit checks, production build, and fixed natural-user Playwright pass.

## Pass 95 verification

Pass 95 independently re-read the pass-94 summary, source result row, source
failure log, source screenshots, source trace, current PR branch diff, and the
sync/core-data code path. `origin/trunk` still resolves to:

```text
ebc3c0a4663d79c5581bf2b94b68531349e96c48 Use theme gray for muted Text (#77999)
```

The fixed PR branch remains the requested three-commit sequence directly on top
of that trunk commit:

```text
29cb3160fed Add RTC title reload unit repros
aca4e1bc10a Add same-user title save-after-reload browser repro
a0af5a2dca0 Preserve RTC title across reload saves
```

The pass-95 addition is a fresh lower-level before/after proof on the
sync-manager side, separate from the browser assertion and the pass-93
core-data diff proof. At the pre-fix test-only commit
`aca4e1bc10ad3fcd2c7b9edb5bc678c853635e91`, the focused non-Playwright test
fails below Playwright:

```text
packages/sync/src/test/manager.ts
Expected: "Customer title"
Received: "Initial title"

getChangesFromCRDTDoc was called with only the CRDT doc and edited record,
not the persisted raw record argument.
```

That directly proves both root-cause halves at the sync-manager boundary:
save-time CRDT metadata can be serialized from the older local Y.Doc snapshot,
and remote-update diffing lacked the persisted raw record needed to identify an
exact persisted-value replay.

The known-fixes base was checked first:

```text
status: running
environment url: http://localhost:9902
http port: 9903
mysql port: 33062
```

Using the Docker-reported HTTP port `9903`, the fresh pass-95 known-fixes
natural-user browser repro still fails on post `562`:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The pass-95 trace decodes to the same final-save raw/CRDT split:

```text
POST /wp-json/wp/v2/posts/562?_locale=user
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent="Initial body + same user post-reload active edit"
  crdtContent="Initial body"

GET /wp-json/wp/v2/posts/562?context=edit
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
```

The fixed branch passes the focused lower-level checks:

```text
Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests: 118 skipped, 5 passed, 123 total
```

The fixed branch also passes a production build and the natural-user browser
repro:

```text
All packages built successfully! (21314ms total)
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

Pass 95 generated a fresh annotated stitched headless video from the pass-95
known-fixes screenshots, decoded trace, pre-fix sync-manager unit failure, and
fixed-branch verification:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-95/6f589c89600c-pass95-annotated.mp4
width=1920
height=1080
duration=30.000000
nb_frames=900
```

No fix logic changed in pass 95. The new evidence is the focused pre-fix
sync-manager unit failure paired with a fresh known-fixes browser failure,
fresh payload decode, fresh fixed-branch unit/build/browser pass, and a new
annotated video.

## Pass 96 verification

Pass 96 re-read the pass-95 summary, the raw source result/log/context, the
source trace, fresh screenshots, the PR branch diff, and the affected
sync/core-data paths. The source failure remains a real product bug: four
same-user controls passed, the failing test did not time out, and the assertion
is a direct check that a natural save preserves the customer title.

Pass 96 adds another fresh verification of the existing branch/video/fix
standard. The known-fixes test environment was checked first. The non-test
environment was stopped, but the running test environment reported:

```text
status: running
environment url: http://localhost:9902
http port: 9903
mysql port: 33062
```

The focused known-fixes browser repro was rerun into a bug-specific artifact
directory and still fails on post `578`:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-96 trace again proves the defect below the page assertion. The
final save request itself contains a split raw/CRDT payload:

```text
POST /wp-json/wp/v2/posts/578?_locale=user
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent="Initial body + same user post-reload active edit"
  crdtContent="Initial body"

GET /wp-json/wp/v2/posts/578?context=edit
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
```

The pass-96 low-level negative control used a detached test-only worktree at
`aca4e1bc10ad3fcd2c7b9edb5bc678c853635e91`. The focused sync-manager tests
still fail before the fix:

```text
Expected: "Customer title"
Received: "Initial title"

getChangesFromCRDTDoc was called with the CRDT doc and edited record, but not
the persisted raw record argument.
```

The fixed PR branch remains the requested three-commit sequence on top of
`origin/trunk`:

```text
29cb3160fed Add RTC title reload unit repros
aca4e1bc10a Add same-user title save-after-reload browser repro
a0af5a2dca0 Preserve RTC title across reload saves
```

The fixed branch passes the focused lower-level checks:

```text
Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests: 118 skipped, 5 passed, 123 total
```

It also passes a production build and the natural-user browser repro on the
running `9912` environment:

```text
All packages built successfully! (24322ms total)
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

The first fixed browser run timed out at login because the long-lived local
test environment had a stale admin password. Pass 96 reset only that local
test environment's `admin` password to the standard e2e value with WP-CLI and
reran the same browser repro successfully. This was an environment readiness
issue in the verification attempt, not the product failure.

Pass 96 generated a fresh annotated headless video from the bug-specific
known-fixes screenshots, decoded trace, low-level pre-fix failure, and fixed
verification:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-96/6f589c89600c-pass96-annotated.mp4
width=1920
height=1080
duration=30.000000
nb_frames=900
```

No fix logic changed in pass 96. The existing PR branch and video standard are
verified again with fresh known-fixes failure artifacts, fresh payload decode,
fresh pre-fix sync-manager failure, fresh fixed lower-level/build/browser
passes, and a bug-specific pass-96 video.

## Pass 97 update

Pass 97 re-read the pass-96 summary, the source JSONL row, source log, source
screenshots, source trace, the existing repro spec, and the affected
core-data/sync code after a fresh `git fetch origin trunk`. `origin/trunk`
remained at:

```text
ebc3c0a4663 Use theme gray for muted Text (#77999)
```

Pass 97 found no evidence for a readiness wait, bad locator, malformed
generated spec, environment-only failure, inverted assertion, or expected
behavior. The source and fresh known-fixes screenshots both show the active
saved editor with the initial title while the same-user companion still shows
the customer title.

Pass 97 added a narrower root-cause proof on the core-data hydration side. In a
detached pre-fix test-only worktree at
`aca4e1bc10ad3fcd2c7b9edb5bc678c853635e91`, the focused CRDT diff test fails:

```text
FAIL packages/core-data/src/utils/test/crdt.ts
does not overwrite a dirty title with the persisted title from a stale CRDT update

Expected path: not "title"
Received value: "Persisted Title"
```

This proves the rollback decision below Playwright and below transport: when the
edited record has `"Unsaved Local Title"` and the persisted raw record has
`"Persisted Title"`, pre-fix `getPostChangesFromCRDTDoc` still returns a title
change back to the persisted value.

Pass 97 also reran the focused natural-user Playwright repro on the known-fixes
base at `3cba2b1e56a` using the already running test environment on
`http://localhost:9903`. It failed again:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-97 trace for post `586` shows the same split persistence:

```text
POST /wp-json/wp/v2/posts/586?_locale=user
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent="Initial body + same user post-reload active edit"
  crdtContent="Initial body"

GET /wp-json/wp/v2/posts/586?context=edit
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
```

The fixed PR branch remains the same three-commit sequence on top of
`origin/trunk`:

```text
29cb3160fed Add RTC title reload unit repros
aca4e1bc10a Add same-user title save-after-reload browser repro
a0af5a2dca0 Preserve RTC title across reload saves
```

Pass 97 reverified the fixed branch:

```text
Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests: 118 skipped, 5 passed, 123 total

All packages built successfully! (19637ms total)

1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

Pass 97 generated a fresh annotated headless video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-97/6f589c89600c-pass97-annotated.mp4
width=1920
height=1080
duration=30.000000
nb_frames=900
```

No fix logic changed in pass 97. The added evidence is the narrower core-data
CRDT diff failure proving that the stale persisted raw title is misclassified as
a CRDT update over a dirty local title.

## Pass 98 update

Pass 98 re-read the pass-97 summary, the source JSONL row, source log, source
screenshots, source trace, generated natural-user repro spec, and the
core-data/sync code. `origin/trunk` was freshly fetched and remained at:

```text
ebc3c0a4663 Use theme gray for muted Text (#77999)
```

The source and pass-98 screenshots again rule out a readiness, locator, or
inverted-assertion failure: the active saved editor shows
`RTC same-user save-after-reload initial`, while the same-user companion still
shows `RTC same-user save-after-reload customer title`.

Pass 98 reran the known-fixes natural-user browser repro on the running test
environment at `http://localhost:9903`. It failed again:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-98 trace for post `590` shows the same raw/CRDT split in the
final save and follow-up REST read:

```text
POST /wp-json/wp/v2/posts/590?_locale=user
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent="Initial body + same user post-reload active edit"
  crdtContent="Initial body"

GET /wp-json/wp/v2/posts/590?context=edit
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
```

Pass 98 also reran the pre-fix test-only repro at
`aca4e1bc10ad3fcd2c7b9edb5bc678c853635e91`. The sync-manager side failed with
`Expected: "Customer title"; Received: "Initial title"` and showed
`getChangesFromCRDTDoc` still being called without the persisted raw record. The
narrow core-data proof also failed:

```text
FAIL packages/core-data/src/utils/test/crdt.ts
does not overwrite a dirty title with the persisted title from a stale CRDT update

Expected path: not "title"
Received value: "Persisted Title"
```

The PR branch remains the same requested three-commit sequence on top of
`origin/trunk`:

```text
29cb3160fed Add RTC title reload unit repros
aca4e1bc10a Add same-user title save-after-reload browser repro
a0af5a2dca0 Preserve RTC title across reload saves
```

Pass 98 reverified the fixed branch:

```text
Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests: 118 skipped, 5 passed, 123 total

All packages built successfully! (24925ms total)

1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

Pass 98 generated a fresh annotated headless stitched video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-98/6f589c89600c-pass98-annotated.mp4
width=1920
height=1080
duration=30.000000
nb_frames=900
```

No fix logic changed in pass 98. The added evidence is a fresh known-fixes
negative browser repro, a fresh decoded payload split, a rerun of the pre-fix
sync-manager and core-data low-level failures, and fixed branch verification
that the existing branch/video/fix satisfy the requested standard.

## Pass 99 update

Pass 99 re-read the pass-98 summary, the source JSONL row, source log,
screenshots, decoded source trace, generated natural-user repro spec, and the
affected core-data/sync code. `origin/trunk` was freshly fetched and remained
at:

```text
ebc3c0a4663 Use theme gray for muted Text (#77999)
```

Pass 99 adds a fresh known-fixes browser negative control and a focused
pre-fix low-level root-cause proof. The known-fixes checkout was still at:

```text
3cba2b1e56a Merge remote-tracking branch 'origin/trunk' into HEAD
```

The default known-fixes wp-env was stopped, but the test environment was
running at `http://localhost:9903`. The focused natural-user repro failed again
on post `598`:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-99 trace shows that the final save persisted raw REST fields from
the customer-title record while persisting stale CRDT metadata:

```text
POST /wp-json/wp/v2/posts/598?_locale=user
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent="Initial body + same user post-reload active edit"
  crdtContent="Initial body"

GET /wp-json/wp/v2/posts/598?context=edit
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
```

The pass-99 pre-fix low-level worktree at
`aca4e1bc10ad3fcd2c7b9edb5bc678c853635e91` failed three focused assertions
without Playwright:

```text
FAIL packages/sync/src/test/manager.ts
serializes the record being saved instead of an older local CRDT snapshot
Expected: "Customer title"
Received: "Initial title"

passes the persisted record when remote updates are diffed
Expected third argument: persistedRecord
Received only: ydoc, editedRecord

FAIL packages/core-data/src/utils/test/crdt.ts
does not overwrite a dirty title with the persisted title from a stale CRDT update
Expected path: not "title"
Received value: "Persisted Title"
```

That is the pass-99 narrower root-cause proof: the save path can serialize an
older CRDT title than the record being saved, and the reload diff path lacks
persisted-record context, so it treats the stale persisted raw title as a remote
CRDT update over a dirty local title.

The PR branch remains the requested three-commit sequence on top of current
`origin/trunk`:

```text
29cb3160fed Add RTC title reload unit repros
aca4e1bc10a Add same-user title save-after-reload browser repro
a0af5a2dca0 Preserve RTC title across reload saves
```

Pass 99 reverified the fixed branch:

```text
Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests: 118 skipped, 5 passed, 123 total

All packages built successfully! (23403ms total)

1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

Pass 99 generated a fresh annotated headless stitched video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-99/6f589c89600c-pass99-annotated.mp4
width=1920
height=1080
duration=30.000000
nb_frames=900
```

No fix logic changed in pass 99. The added evidence is the fresh known-fixes
post-598 browser trace, the three-assertion pre-fix low-level failure, fixed
branch verification, and a new pass-99 annotated video.

## Pass 100 update

Pass 100 independently re-read the pass-99 summary, source JSONL row, source
log, source error snapshot, source screenshots, decoded source trace, generated
natural-user spec, and the affected core-data/sync code. `origin/trunk` was
freshly fetched again and remained:

```text
ebc3c0a4663 Use theme gray for muted Text (#77999)
```

Pass 100 did not change the fix logic. It verifies that the existing branch,
video standard, and three-commit PR branch still satisfy the requested bug-fix
standard, and adds fresh pass-100 reruns of the negative and fixed checks.

The source and fresh pass-100 traces both rule out test-noise classifications:
the browser action route is natural user editing and reload, the test waits for
entity readiness and two sync cycles, the failure is not a timeout, and the
final save/read show a persisted raw title of
`RTC same-user save-after-reload customer title` while `_crdt_document` carries
`RTC same-user save-after-reload initial`.

Pass 100 reran the focused pre-fix low-level tests at
`aca4e1bc10ad3fcd2c7b9edb5bc678c853635e91`. They failed in the same three
places:

```text
FAIL packages/sync/src/test/manager.ts
serializes the record being saved instead of an older local CRDT snapshot
Expected: "Customer title"
Received: "Initial title"

passes the persisted record when remote updates are diffed
Expected third argument: persistedRecord
Received only: ydoc, editedRecord

FAIL packages/core-data/src/utils/test/crdt.ts
does not overwrite a dirty title with the persisted title from a stale CRDT update
Expected path: not "title"
Received value: "Persisted Title"
```

Pass 100 reran the known-fixes browser negative control on the running
known-fixes test environment at `http://localhost:9903`. It failed again on post
`611`:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-100 known-fixes trace shows the same save-time raw/CRDT split:

```text
POST /wp-json/wp/v2/posts/611?_locale=user
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
  rawContent="Initial body + same user post-reload active edit"
  crdtContent="Initial body"

GET /wp-json/wp/v2/posts/611?context=edit
  rawTitle="RTC same-user save-after-reload customer title"
  crdtTitle="RTC same-user save-after-reload initial"
```

Pass 100 reverified the PR branch:

```text
Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests: 118 skipped, 5 passed, 123 total

All packages built successfully! (22216ms total)

1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

The PR branch remains the requested three-commit sequence:

```text
29cb3160fed Add RTC title reload unit repros
aca4e1bc10a Add same-user title save-after-reload browser repro
a0af5a2dca0 Preserve RTC title across reload saves
```

Pass 100 generated a fresh annotated headless stitched video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-100/6f589c89600c-pass100-annotated.mp4
width=1920
height=1080
duration=30.000000
nb_frames=900
```

Remote branch heads after pass 100 are recorded in the pass-100 summary.

## Pass 101 update

Pass 101 re-read the pass-100 summary, source result row, source failure log,
source trace/screenshots, the current repro spec, and the affected sync and
core-data code. The bug still classifies as a real product correctness issue.
The source run and fresh reruns are action-complete, non-timeout failures, not
readiness, locator, malformed-spec, environment-only, or inverted-assertion
failures.

Fresh known-fixes negative control:

```bash
env WP_ENV_PORT=9903 \
WP_BASE_URL=http://localhost:9903 \
RTC_MANIFEST_WS_START_PORT=20416 \
RTC_MANIFEST_WS_FIXED_PORT=1 \
WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-101/knownfix-playwright-9903 \
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --workers=1 \
  --grep 'saves the active title after a same-user browser session reloads'
```

Result:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

Fresh pass-101 pre-fix low-level repros at
`aca4e1bc10ad3fcd2c7b9edb5bc678c853635e91` still fail the same three focused
assertions:

```text
FAIL packages/core-data/src/utils/test/crdt.ts
does not overwrite a dirty title with the persisted title from a stale CRDT update
Expected path: not "title"
Received value: "Persisted Title"

FAIL packages/sync/src/test/manager.ts
serializes the record being saved instead of an older local CRDT snapshot
Expected: "Customer title"
Received: "Initial title"

passes the persisted record when remote updates are diffed
Expected persistedRecord as third argument; received only ydoc and editedRecord
```

Fresh pass-101 fixed verification on
`try/rtc-safe-sync-title-lost-after-reload-6f589c89600c-pr`:

```text
focused units: PASS
targeted production build: PASS
natural-user browser repro: PASS on http://localhost:9912
```

Pass 101 also added a port-sanity check. `http://localhost:9902` was occupied
by another bug worktree, while the active 6f589c worktree was exposed on
`http://localhost:9912`. A first browser attempt against `9902` failed with a
different persisted-title symptom because it was exercising the wrong site.
After verifying that the `9912` container served patched `sync.js` and
`core-data.js` containing `options.record` and `getPersistedRecord`, the same
natural-user repro passed on the fix branch.

Pass 101 generated a fresh annotated stitched video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-101/6f589c89600c-pass101-annotated.mp4
width=1920
height=1080
duration=30.000000
nb_frames=900
```

No fix logic changed in pass 101. The added evidence is a fresh known-fixes
browser negative control, fresh fixed branch verification, and the explicit
environment-port falsification check that prevents confusing this RTC defect
with a stale or wrong wp-env target.

## Pass 102 update

Pass 102 independently re-read the pass-101 summary, source result row, source
failure log, source Playwright trace, current PR-branch code, current
known-fixes base, and both branch states. The classification remains a real
product correctness bug. The source run and fresh reruns are deterministic
state mismatches after completed user actions, not timeout, readiness, locator,
malformed-spec, environment-only, or inverted-assertion failures.

The pass-102 addition is a narrower source-trace proof. Decoding the archived
source trace REST resources and the persisted `_crdt_document` values with
`yjs`/`lib0/buffer` shows the exact save-time split:

```text
before final save response 675d696f573f1ae807099a65944dc719ffc66526.json
  rawTitle:  RTC same-user save-after-reload initial
  crdtTitle: RTC same-user save-after-reload customer title
  rawBody:   Initial body only
  crdtBody:  Initial body + same user save-after-reload edit

final save payload 9fa56e5d16b9406fdc91b5e15ab967a25136c277.json
  rawTitle:  RTC same-user save-after-reload customer title
  crdtTitle: RTC same-user save-after-reload initial
  rawBody:   Initial body + post-reload active edit + save-after-reload edit
  crdtBody:  Initial body only

final save response 154f5d55fcfb5beb89767408527651439a57431a.json
  rawTitle:  RTC same-user save-after-reload customer title
  crdtTitle: RTC same-user save-after-reload initial
```

That proves the root cause at the payload boundary: after the same-user reload,
the raw record and `_crdt_document` can describe different title/content
snapshots. The visible/raw save payload contains the user's customer title, but
the CRDT metadata persisted with that save still serializes the initial title.
The active editor can then apply that stale CRDT title as a field update and
roll its edited title back to the initial value even though REST persistence
and revisions contain the customer title.

Fresh pass-102 pre-fix non-Playwright repro at
`aca4e1bc10ad3fcd2c7b9edb5bc678c853635e91`:

```text
FAIL packages/sync/src/test/manager.ts
serializes the record being saved instead of an older local CRDT snapshot
Expected: "Customer title"
Received: "Initial title"

passes the persisted record when remote updates are diffed
Expected third argument: persistedRecord
Received only: ydoc, editedRecord
```

Fresh pass-102 known-fixes browser negative control on the running known-fixes
test environment at `http://localhost:9903` failed again:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

Fresh pass-102 fixed verification on
`try/rtc-safe-sync-title-lost-after-reload-6f589c89600c-pr`:

```text
focused units: PASS
targeted production build: PASS
natural-user browser repro: PASS on http://localhost:9912
```

The same port-sanity caveat from pass 101 remains relevant. `9902` is still not
the active 6f589c WordPress container; the active 6f589c site is on
`localhost:9912`, and pass 102 verified that served `sync.js` and
`core-data.js` contain `options.record` and `getPersistedRecord` before
interpreting the fixed browser pass.

Pass 102 generated a fresh annotated stitched video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-102/6f589c89600c-pass102-annotated.mp4
width=1920
height=1080
duration=30.000000
nb_frames=900
```

No fix logic changed in pass 102. The existing PR branch already satisfies the
requested three-commit structure and the pass-102 evidence strengthens the
payload-level proof that the fix addresses the actual raw-record/CRDT split.

## Pass 103 update

Pass 103 independently re-read the pass-102 summary, source JSONL row, source
failure log, source artifacts, the PR branch commits, the existing explanation,
the served bundles, and the relevant blame/log history. The classification
remains a real product bug.

The current PR branch is already based on current `origin/trunk`
(`ebc3c0a4663d79c5581bf2b94b68531349e96c48`) and still has the required
three-commit order:

```text
29cb3160fed Add RTC title reload unit repros
aca4e1bc10a Add same-user title save-after-reload browser repro
a0af5a2dca0 Preserve RTC title across reload saves
```

Pass 103 added a fresh known-fixes repro and decoded that new trace, rather
than relying only on the archived source trace. The known-fixes site on
`http://localhost:9903` was verified to be serving the unfixed sync bundle:

```text
createPersistedCRDTDoc(objectType, objectId)
no getPersistedRecord path
no options.record path
```

The natural-user Playwright repro then failed again on known-fixes:

```text
1 failed
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fresh pass-103 known-fixes trace shows the same narrow raw/CRDT split:

```text
2026-05-06T12:47:00.294Z POST /wp/v2/posts/643
  request 3544447b2692fd237d6338aea6adf1e30cd004e0.json
    rawTitle:  RTC same-user save-after-reload initial
    crdtTitle: RTC same-user save-after-reload customer title

2026-05-06T12:47:02.680Z POST /wp/v2/posts/643
  request ab98f3e5160ebf09a5d1cadc4d84478273d8d2cb.json
    rawTitle:  RTC same-user save-after-reload customer title
    crdtTitle: RTC same-user save-after-reload initial

  response f3e764b47667ae7912dc04c719eaf029ec6fdd88.json
    rawTitle:  RTC same-user save-after-reload customer title
    crdtTitle: RTC same-user save-after-reload initial
```

This strengthens the root-cause proof: the bug is not just a final assertion
race. In a fresh failure, the saved REST title and the serialized
`_crdt_document` title diverged in the final save request itself.

Pass 103 also created a fresh detached pre-fix low-level worktree at
`aca4e1bc10ad3fcd2c7b9edb5bc678c853635e91` and reran the sync-manager tests
before the fix:

```text
FAIL packages/sync/src/test/manager.ts

serializes the record being saved instead of an older local CRDT snapshot
Expected: "Customer title"
Received: "Initial title"

passes the persisted record when remote updates are diffed
Expected third argument: persistedRecord
Received only: ydoc, editedRecord
```

The fixed branch was reverified without changing the fix:

```text
focused unit checks: PASS
targeted production build: PASS
served 9912 sync/core-data bundles: contain getPersistedRecord and options.record
natural-user browser repro on http://localhost:9912: PASS
```

Origin analysis was rechecked with blame. `packages/sync/src/manager.ts` still
computes CRDT changes against only `await handlers.getEditedRecord()` on
`origin/trunk`, and `createPersistedCRDTDoc` still serializes the current
manager Y.Doc after a one-tick flush. `packages/core-data/src/entities.js`
still calls `createPersistedCRDTDoc( objectType, objectId )` without the record
being saved. `packages/core-data/src/utils/crdt.ts` still compares raw
`title`/`content`/`excerpt` values against only the current edited value.

No fix logic changed in pass 103. The additional evidence verifies that the
existing branch/video/fix already satisfy the requested standard, with a fresh
independent known-fixes payload proof and a fresh pre-fix non-Playwright
negative control.

## Pass 104 update

Pass 104 added an independent decode of the original source failure trace from
the known-fixes refresh run, rather than relying on the pass-103 reproduced
trace. The source trace was decoded from:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-3/fuzz-handoff/distinct-manifest-20260505/results-refresh-http-shard-3/outputs/0019-6f589c89600c/playwright-artifacts/test-results/editor-collaboration-colla-da7f1-ser-browser-session-reloads-chromium/trace.zip
```

The decoded REST payloads for source post `226` show the persisted resource
itself became internally inconsistent:

```text
2026-05-05T10:24:02 POST /wp-json/wp/v2/posts/226
  rawTitle:    RTC same-user save-after-reload initial
  crdtTitle:   RTC same-user save-after-reload customer title
  rawContent:  Initial body.
  crdtContent: Initial body. same user save-after-reload edit

2026-05-05T10:24:04 final POST /wp-json/wp/v2/posts/226
  rawTitle:    RTC same-user save-after-reload customer title
  crdtTitle:   RTC same-user save-after-reload initial
  rawContent:  Initial body. same user post-reload active edit same user save-after-reload edit
  crdtContent: Initial body.

2026-05-05T10:24:04 final GET /wp-json/wp/v2/posts/226?context=edit
  rawTitle:    RTC same-user save-after-reload customer title
  crdtTitle:   RTC same-user save-after-reload initial
```

The same trace's action log confirms natural user actions: fill the customer
title, wait for the same-user peer to observe it, type companion body text,
reload the peer, type another body edit from the active page, click Save draft,
then read the edited title. There is no malformed block injection or direct
store mutation in the browser route.

Pass 104 rebased the PR branch onto current `origin/trunk`
(`3babe1c1f095`, `Dashboard experiment: new icon (#78016)`). The current PR
branch commit order is:

```text
6657f7966fc Add RTC title reload unit repros
7618d44ed19 Add same-user title save-after-reload browser repro
975e004a828 Preserve RTC title across reload saves
```

Fresh pass-104 verification:

```text
pre-fix detached low-level sync-manager repro at 7618d44ed19: FAIL
  Expected serialized title: "Customer title"
  Received serialized title: "Initial title"
  persistedRecord was not passed into getChangesFromCRDTDoc

rebased fixed focused units: PASS
targeted data/core-data/sync production build: PASS
served fixed bundles on http://localhost:9912: contain getPersistedRecord and options.record
served known-fixes bundles on http://localhost:9903: no getPersistedRecord and no options.record
fixed natural-user Playwright repro on http://localhost:9912: PASS
known-fixes natural-user Playwright repro on http://localhost:9903: FAIL with the same initial-vs-customer title split
```

No fix logic changed in pass 104. The contribution over pass 103 is the
source-trace payload proof from the archived original failure plus a rebase and
fresh verification of the existing three-commit PR branch on current trunk.

## Pass 105 update

Pass 105 independently rechecked the source row, source failure log, current
PR branch, served bundles, existing explanation, and current `origin/trunk`.
`origin/trunk` is still `3babe1c1f095`, and both explanation and PR branches
are already based on that commit.

The pass-105 contribution is a fresh known-fixes browser failure and trace
decode from the known-fixes base on `http://localhost:9903`, plus fresh
before/after low-level and browser verification. The known-fixes site was
confirmed to serve the unfixed bundle shape:

```text
sync.js: createPersistedCRDTDoc(objectType, objectId)
sync.js: no getPersistedRecord path and no options.record path
```

The fixed site on `http://localhost:9912` was confirmed to serve the patched
bundle shape:

```text
sync.js: getPersistedRecord
sync.js: createPersistedCRDTDoc(objectType, objectId, options = {})
sync.js: options.record
core-data.js: createPersistedCRDTDoc(..., { record: edits })
```

Fresh pass-105 verification:

```text
pre-fix detached low-level sync-manager repro at 7618d44ed19: FAIL
  Expected serialized title: "Customer title"
  Received serialized title: "Initial title"
  persistedRecord was not passed into getChangesFromCRDTDoc

fixed focused units: PASS
targeted data/core-data/sync production build: PASS
fixed natural-user Playwright repro on http://localhost:9912: PASS
known-fixes natural-user Playwright repro on http://localhost:9903: FAIL
  Expected: "RTC same-user save-after-reload customer title"
  Received: "RTC same-user save-after-reload initial"
```

The fresh pass-105 known-fixes trace decoded post `663` and reproduced the
same raw-record/CRDT metadata split:

```text
2026-05-06T13:14:00.381Z POST /wp-json/wp/v2/posts/663
  request rawTitle:    RTC same-user save-after-reload initial
  request crdtTitle:   RTC same-user save-after-reload customer title
  response rawTitle:   RTC same-user save-after-reload initial
  response crdtTitle:  RTC same-user save-after-reload customer title

2026-05-06T13:14:02.806Z final POST /wp-json/wp/v2/posts/663
  request rawTitle:    RTC same-user save-after-reload customer title
  request crdtTitle:   RTC same-user save-after-reload initial
  response rawTitle:   RTC same-user save-after-reload customer title
  response crdtTitle:  RTC same-user save-after-reload initial

2026-05-06T13:14:02.868Z final GET /wp-json/wp/v2/posts/663?context=edit
  response rawTitle:   RTC same-user save-after-reload customer title
  response crdtTitle:  RTC same-user save-after-reload initial
```

The pass-105 action log again confirms a natural browser route: fill the
customer title, wait for the same-user peer to observe it, type body text in
the peer, reload the peer, type another active edit, click Save draft, and
then assert the persisted and active titles. The browser route still has no
malformed blocks, direct store mutation, synthetic block tree, or artificial
transport fault.

Pass 105 generated a fresh annotated stitched video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-105/6f589c89600c-pass105-annotated.mp4
width=1920
height=1080
duration=32.000000
nb_frames=960
```

No fix logic changed in pass 105. The existing three-commit PR branch remains
the revised fix plan and satisfies the requested structure:

```text
6657f7966fc Add RTC title reload unit repros
7618d44ed19 Add same-user title save-after-reload browser repro
975e004a828 Preserve RTC title across reload saves
```

## Pass 106 update

Pass 106 rebased both branches onto current `origin/trunk`
(`5f1ee5529e1`, `Testing: Add createRecord e2e request util (#78017)`).
The rebased PR branch still has the required three-commit structure:

```text
824f2da677f Add RTC title reload unit repros
fd900f488c7 Add same-user title save-after-reload browser repro
4f2e809af04 Preserve RTC title across reload saves
```

The pass-106 contribution is a fresh decode of the original source failure
trace, independent of the pass-105 reproduced trace. The decoder wrote:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-106/source-trace-post-226-rest-crdt.txt
```

The archived source trace for post `226` shows the same root-cause split:

```text
2026-05-05T10:24:02.082Z POST /wp-json/wp/v2/posts/226
  request  rawTitle:  RTC same-user save-after-reload initial
  request  crdtTitle: RTC same-user save-after-reload customer title
  response rawTitle:  RTC same-user save-after-reload initial
  response crdtTitle: RTC same-user save-after-reload customer title

2026-05-05T10:24:04.080Z final POST /wp-json/wp/v2/posts/226
  request  rawTitle:  RTC same-user save-after-reload customer title
  request  crdtTitle: RTC same-user save-after-reload initial
  response rawTitle:  RTC same-user save-after-reload customer title
  response crdtTitle: RTC same-user save-after-reload initial

2026-05-05T10:24:04.193Z final GET /wp-json/wp/v2/posts/226?context=edit
  response rawTitle:  RTC same-user save-after-reload customer title
  response crdtTitle: RTC same-user save-after-reload initial
```

That independently proves the saved REST resource can contain a fresh canonical
post title while the persisted CRDT metadata carries the stale initial title.
The failure is therefore not a locator issue, malformed generated spec,
readiness wait, failed save, stale REST poll, timeout, or inverted assertion.

Fresh pass-106 verification:

```text
pre-fix detached low-level sync-manager repro at fd900f488c7: FAIL
  Expected serialized title: "Customer title"
  Received serialized title: "Initial title"
  persistedRecord was not passed into getChangesFromCRDTDoc

fixed focused units on rebased PR branch: PASS
targeted data/core-data/sync production build: PASS
served fixed bundles on http://localhost:9912: contain getPersistedRecord and options.record
served known-fixes bundles on http://localhost:9903: no getPersistedRecord and no options.record
fixed natural-user Playwright repro on http://localhost:9912: PASS
known-fixes natural-user Playwright repro on http://localhost:9903: FAIL
  Expected: "RTC same-user save-after-reload customer title"
  Received: "RTC same-user save-after-reload initial"
```

One known-fixes browser attempt with WebSocket port `20416` failed before the
bug was exercised because the joined page never reached collaboration
readiness. A rerun with WebSocket port `20426` reached the assertion and
reproduced the title loss, so the readiness failure was treated as harness
noise, not product evidence.

Pass 106 generated a new source-trace annotated stitched video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-106/6f589c89600c-pass106-annotated.mp4
width=1920
height=1080
duration=32.000000
nb_frames=960
```

No fix logic changed in pass 106. The existing fix remains the revised plan:
persist the exact record being saved into CRDT metadata, pass persisted raw
record context through sync-manager diffs, and reject exact stale persisted
raw title/content/excerpt replays over dirty local text fields.

## Pass 107 update

Pass 107 independently re-extracted the archived source `trace.zip` and ran a
fresh decoder over the post `226` REST resources. The pass-107 decoder checked
one narrower invariant: when a save request persists `_crdt_document`, the raw
REST title in that same request/response should match the decoded CRDT title.

The invariant fails on the final save:

```text
2026-05-05T10:24:04.080Z POST /wp-json/wp/v2/posts/226
  request  rawTitle:  RTC same-user save-after-reload customer title
  request  crdtTitle: RTC same-user save-after-reload initial  <-- DIVERGES
  response rawTitle:  RTC same-user save-after-reload customer title
  response crdtTitle: RTC same-user save-after-reload initial  <-- DIVERGES

2026-05-05T10:24:04.193Z GET /wp-json/wp/v2/posts/226?context=edit
  response rawTitle:  RTC same-user save-after-reload customer title
  response crdtTitle: RTC same-user save-after-reload initial  <-- DIVERGES
```

That is a payload-level root-cause proof: the save itself persisted stale CRDT
metadata next to the fresh canonical REST title. The product can therefore
later reapply the stale title from `_crdt_document` even though the raw post
title was saved correctly.

Fresh pass-107 verification:

```text
pre-fix detached low-level sync-manager repro at fd900f488c7: FAIL
  Expected serialized title: "Customer title"
  Received serialized title: "Initial title"
  persistedRecord was not passed into getChangesFromCRDTDoc

fixed focused units on PR branch: PASS
fixed production build command: PASS
fixed natural-user Playwright repro on http://localhost:9912: PASS

known-fixes source row: FAIL
  result=failed exitCode=1 timedOut=false durationMs=54416

known-fixes local browser rerun: BLOCKED
  wp-env start failed before tests because Docker reported:
  "all predefined address pools have been fully subnetted"
```

Pass 107 also rechecked the known-fixes checkout at
`3cba2b1e56a`. It still lacks the PR branch's `getPersistedRecord`,
`options.record`, and `record: edits` paths, while the archived known-fixes
refresh result for this exact signature is failed and non-timeout.

Pass 107 generated a new annotated stitched video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-107/6f589c89600c-pass107-annotated.mp4
width=1920
height=1080
duration=36.000000
nb_frames=1080
```

No fix logic changed in pass 107. The existing three-commit PR branch still
satisfies the requested structure:

```text
824f2da677f Add RTC title reload unit repros
fd900f488c7 Add same-user title save-after-reload browser repro
4f2e809af04 Preserve RTC title across reload saves
```

## Pass 108 update

Pass 108 rebased both branches onto current `origin/trunk`
(`158d5fcc99ba`, `Block Editor: Remove unused reducer action types (#77880)`).
The rebased PR branch keeps the required three-commit structure:

```text
68eb9fe9b82 Add RTC title reload unit repros
1b38e17d280 Add same-user title save-after-reload browser repro
9f48492e433 Preserve RTC title across reload saves
```

This pass adds a current-branch verification rather than a new fix. The
pass-108 pre-fix low-level repro was rerun at `fd900f488c7` and still fails on
the two contracts that define the bug:

```text
serializes the record being saved instead of an older local CRDT snapshot:
  Expected: "Customer title"
  Received: "Initial title"

passes the persisted record when remote updates are diffed:
  expected getChangesFromCRDTDoc( ydoc, editedRecord, persistedRecord )
  received getChangesFromCRDTDoc( ydoc, editedRecord )
```

The same focused contracts pass on the rebased fixed branch:

```text
fixed focused units: PASS
  Test Suites: 1 skipped, 3 passed, 3 of 4 total
  Tests: 118 skipped, 5 passed, 123 total

targeted data/core-data/sync production build: PASS
  All packages built successfully! (24829ms total)

fixed natural-user Playwright repro on http://localhost:9912: PASS
  Collaboration - same user title loss › saves the active title after a
  same-user browser session reloads
```

The suggested port `9902` was already occupied by another wp-env container, so
pass 108 used the running wp-env instance for this worktree on `9912` to avoid
testing the wrong WordPress site.

Pass 108 generated an updated annotated video from the existing headless screen
recording with the current rebased branch and fresh verification overlaid:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-108/6f589c89600c-pass108-annotated.mp4
width=1920
height=1080
duration=36.000000
nb_frames=1080
```

No fix logic changed in pass 108. The current verification supports the same
classification: this is a real RTC product bug, not a readiness wait, locator
failure, malformed generated spec, failed REST save, stale REST poll, timeout,
environment-only failure, or inverted assertion.

## Pass 109 update

Pass 109 rebased both branches onto current `origin/trunk`
(`70f50bcfaca`, `Experiment: Sync user taxonomies with post types (#77997)`).
The rebased PR branch keeps the required three-commit structure:

```text
196d8536eef Add RTC title reload unit repros
08dfa02e60d Add same-user title save-after-reload browser repro
771b1e9784e Preserve RTC title across reload saves
```

This pass adds a fresh current-trunk tests-only repro instead of relying on the
older `fd900f488c7` pre-fix worktree. A detached worktree was created at
`196d8536eef`, which contains only the repro tests on top of current trunk and
does not include the fix. The pure sync-manager repro fails cleanly:

```text
serializes the record being saved instead of an older local CRDT snapshot:
  Expected: "Customer title"
  Received: "Initial title"

passes the persisted record when remote updates are diffed:
  expected getChangesFromCRDTDoc( ydoc, editedRecord, persistedRecord )
  received getChangesFromCRDTDoc( ydoc, editedRecord )
```

That is a narrower current-base root-cause proof: before the fix, the save path
serializes the manager's older local Y.Doc snapshot instead of applying the
exact record being saved, and the remote-update diff path lacks the persisted
raw record needed to distinguish a stale persisted title replay from a real
new title update.

Pass 109 also re-read the archived Playwright trace. The final failure occurs
after successful natural actions and REST calls, at the active editor title
assertion:

```text
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The same trace has a final save request/response with raw REST title
`RTC same-user save-after-reload customer title` while `_crdt_document` decodes
to `RTC same-user save-after-reload initial`. That preserves the negative
classification from prior passes: the bug is not a locator error, readiness
wait, failed REST save, stale REST poll, environment-only failure, malformed
spec, timeout, expected behavior, or inverted assertion.

Known-fixes base `3cba2b1e56a` is still not fixed. The archived known-fixes
source row for this exact signature is failed/non-timeout, and a current static
check of that checkout still finds no `getPersistedRecord`, no `options.record`,
and no `record: edits` path in the affected save/diff code.

Fresh pass-109 fixed verification:

```text
fixed focused units: PASS
  Test Suites: 1 skipped, 3 passed, 3 of 4 total
  Tests: 118 skipped, 5 passed, 123 total

targeted data/core-data/sync production build: PASS
  All packages built successfully! (30647ms total)

fixed natural-user Playwright repro on http://localhost:9912: PASS
  Collaboration - same user title loss › saves the active title after a
  same-user browser session reloads
```

The suggested `WP_ENV_PORT=9902` status check showed this worktree's wp-env
instance running with Docker's HTTP port mapped to `9912`, so pass 109 again
used `WP_BASE_URL=http://localhost:9912` to hit the correct WordPress site.

Pass 109 generated an updated annotated headless video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-109/6f589c89600c-pass109-annotated.mp4
width=1920
height=1080
duration=36.000000
nb_frames=1080
```

No fix logic changed in pass 109. The existing fix remains the revised plan:
persist CRDT metadata from the exact record being saved, pass persisted raw
record context through sync-manager diffs, and ignore only exact stale
persisted raw `title`/`content`/`excerpt` replays over dirty local text fields.

## Pass 110 update

Pass 110 independently re-decoded the archived source `trace.zip` and checked
the saved REST resources against the decoded `_crdt_document` payloads. This
adds a two-step payload proof:

```text
2026-05-05T10:24:02 pre-reload POST response
  rawTitle:  RTC same-user save-after-reload initial
  crdtTitle: RTC same-user save-after-reload customer title

2026-05-05T10:24:04 final POST request/response
  rawTitle:  RTC same-user save-after-reload customer title
  crdtTitle: RTC same-user save-after-reload initial
  content:   includes same user post-reload active edit

2026-05-05T10:24:04 final GET response
  rawTitle:  RTC same-user save-after-reload customer title
  crdtTitle: RTC same-user save-after-reload initial
```

The screenshots from the same failure show the visible split between the two
same-user browser sessions: one editor has the stale initial title while the
other has the customer title. This rules out a pure assertion inversion or REST
poll issue; the persisted CRDT metadata and live editor state really diverge.

Pass 110 reran the current-trunk tests-only prefix from commit `196d8536eef`.
The prefix still fails before the fix on the two exact sync-manager contracts:

```text
serializes the record being saved instead of an older local CRDT snapshot:
  Expected: "Customer title"
  Received: "Initial title"

passes the persisted record when remote updates are diffed:
  expected getChangesFromCRDTDoc( ydoc, editedRecord, persistedRecord )
  received getChangesFromCRDTDoc( ydoc, editedRecord )
```

Pass 110 also rechecked the known-fixes checkout at `3cba2b1e56a`: the source
row for this signature is still failed/non-timeout, and the checkout still has
no `getPersistedRecord`, no `options.record`, and no `record: edits` path in
the affected save/diff code.

Fresh pass-110 fixed verification on the unchanged PR branch
`771b1e9784e`:

```text
fixed focused units: PASS
  Test Suites: 1 skipped, 3 passed, 3 of 4 total
  Tests: 118 skipped, 5 passed, 123 total

targeted data/core-data/sync production build: PASS
  All packages built successfully! (21260ms total)

fixed natural-user Playwright repro on http://localhost:9912: PASS
  Collaboration - same user title loss > saves the active title after a
  same-user browser session reloads
```

The pass-110 `wp-env status` check again showed the worktree's environment
running with the configured URL `http://localhost:9902` and Docker HTTP port
`9912`, so the browser repro used `WP_BASE_URL=http://localhost:9912`.

Pass 110 generated a refreshed annotated headless video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-110/6f589c89600c-pass110-annotated.mp4
width=1920
height=1080
duration=36.000000
nb_frames=1080
```

No fix logic changed in pass 110. The existing PR branch and video satisfy the
requested standard: independent source-trace proof, current-base low-level
pre-fix failure, natural-user browser repro, targeted fixed verification, and
the required three-commit PR branch structure.

## Pass 111 update

Pass 111 found one useful correction beyond pass 110: the existing fix covered
full-record CRDT persistence but not a partial save payload. In a fresh browser
run, the final save request contained the post-reload body edit but no raw
`title` field. Applying only the save payload before serializing
`_crdt_document` could therefore leave the CRDT title at the stale initial
value.

The PR branch fix was improved so `createPersistedCRDTDoc` reads the current
edited record from the sync handler and overlays the save payload on top before
serialization. That preserves non-dirty-but-current synced fields, including a
title typed before a later body-only save. A new low-level repro covers this
specific shape: `serializes the current edited record when the save payload is
partial`.

Pass 111 also caught an environment trap. `WP_BASE_URL=http://localhost:9902`
was serving another worktree (`gutenberg-bug-5ee0be2f9b7d`), while this bug
worktree's wp-env was actually on `http://localhost:9912`. The failing 9902
browser run was retained as negative environment evidence; the final browser
verification used the correct `gutenberg-bug-6f589c89600c` site on 9912.

The final PR branch is rebased onto current `origin/trunk`
(`c70fc1929c5177202c8ce3094d6c53e548b54aeb`) with commit order:

```text
166a2a8ca39 Add RTC title reload unit repros
5f0c5c338d2 Add same-user title save-after-reload browser repro
cdca4643a37 Preserve RTC title across reload saves
```

Focused verification after the origin/trunk rebase:

```text
npm run test:unit -- packages/core-data/src/test/entities.js packages/core-data/src/test/resolvers.js packages/core-data/src/utils/test/crdt.ts packages/sync/src/test/manager.ts --runInBand --testNamePattern='serializes the record being saved|serializes the current edited record|passes the persisted record|does not overwrite a dirty title|passes the current save edits'
```

Result:

```text
Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests: 118 skipped, 6 passed, 124 total
```

Build verification:

```text
env WP_BUILD_ONLY_PACKAGES=data,core-data,sync NODE_ENV=production node packages/wp-build/lib/build.mjs
```

Result: all packages built successfully.

Natural-user Playwright verification on the correct wp-env site:

```text
env WP_ENV_PORT=9912 WP_BASE_URL=http://localhost:9912 RTC_MANIFEST_WS_START_PORT=20416 RTC_MANIFEST_WS_FIXED_PORT=1 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-111/final-playwright-9912-after-origin-rebase npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts --project=chromium --workers=1 --grep 'saves the active title after a same-user browser session reloads'
```

Result:

```text
1 passed
Collaboration - same user title loss > saves the active title after a same-user browser session reloads
```

## Pass 120 update

Pass 120 added an independent action-plus-payload proof from the original
Playwright trace. The trace chronology shows natural user actions at the failing
lines: fill the customer title, wait for the sibling same-user editor to see it,
type the reload-side body edit, reload, type the post-reload active body edit,
click `Save draft`, observe `Draft saved`, then poll REST before reading the
active editor store.

The same script decoded the network payloads from the trace and asserted:

```text
PASS final POST request has current raw title/content and stale CRDT title/content
PASS server 200 response preserves the same mixed raw/CRDT payload
PASS subsequent GET rehydrates current raw title with stale CRDT title
PASS editor store read after saved/persisted poll returns initial title
```

The final save request in the source trace is the narrow root-cause shape:

```text
rawTitle="RTC same-user save-after-reload customer title"
crdtTitle="RTC same-user save-after-reload initial"
rawContent reload=true postReload=true
crdtContent reload=false postReload=false
```

Pass 120 also reran the known-fixes browser repro on
`/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505`
(`HEAD 3cba2b1e56a`) against its already-running wp-env on port `9903`.
It still fails with:

```text
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The unchanged PR branch still has the requested commit order:

```text
764f3d4b4d9 Add RTC title reload unit repros
a331ec7ec0f Add same-user title save-after-reload browser repro
ffbcba101b5 Preserve RTC title across reload saves
```

Fresh pass-120 fixed verification on `ffbcba101b5`:

```text
focused unit repros: PASS
  Test Suites: 1 skipped, 3 passed, 3 of 4 total
  Tests: 118 skipped, 6 passed, 124 total

targeted data/core-data/sync production build: PASS
  All packages built successfully! (21602ms total)
```

The fixed browser env could not be restarted on the requested `9901` port in
pass 120 because Docker returned `all predefined address pools have been fully
subnetted`. The pass-119 fixed browser run remains the current successful
headless Playwright verification for the same PR branch head.

## Pass 121 update

Pass 121 added a lower-level independent repro by checking out commit
`764f3d4b4d9`, which contains only the focused unit/reducer tests and not the
fix. The sync-manager-only command fails without Playwright:

```text
npm run test:unit -- packages/sync/src/test/manager.ts --runInBand --testNamePattern='serializes the record being saved|serializes the current edited record|passes the persisted record'
```

The failures are the expected contracts:

```text
Expected: "Customer title"
Received: "Initial title"

Expected getChangesFromCRDTDoc(..., editedRecord, persistedRecord)
Received getChangesFromCRDTDoc(..., editedRecord)
```

The same sync-manager tests pass on the fixed PR head `ffbcba101b5`, and the
full focused fixed unit command still passes:

```text
Test Suites: 1 skipped, 3 passed, 3 of 4 total
Tests: 118 skipped, 6 passed, 124 total
```

Pass 121 also reran the natural-user Playwright repro on the known-fixes base
`3cba2b1e56a` using its already-running test wp-env on port `9903`. It still
fails after reaching the final assertion:

```text
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

The fixed worktree could not start a new test wp-env on `9901` because Docker
again reported `all predefined address pools have been fully subnetted`, but an
existing wp-env for `/Users/danluu/dev/fuzz/gutenberg-bug-6f589c89600c` was
already running on `9912` and mounted from the fixed PR worktree. The pass 121
fixed browser rerun against that environment passed:

```text
env WP_ENV_PORT=9912 WP_BASE_URL=http://localhost:9912 RTC_MANIFEST_WS_START_PORT=20408 RTC_MANIFEST_WS_FIXED_PORT=1 WP_ARTIFACTS_PATH=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-121/fixed-playwright-9912 npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts --project=chromium --workers=1 --grep 'saves the active title after a same-user browser session reloads'

1 passed
```

The targeted `data`, `core-data`, and `sync` production build also passed on
the fixed PR head.

## Pass 122 update

Pass 122 added a narrower trace-derived root-cause proof. Instead of only
observing the browser assertion, it decoded the final `GET
/wp-json/wp/v2/posts/226?context=edit` response from the original failing
trace:

```text
persisted raw title="RTC same-user save-after-reload customer title"
persisted CRDT title="RTC same-user save-after-reload initial"
raw content has reload edit=true
raw content has post-reload edit=true
CRDT content has reload edit=false
CRDT content has post-reload edit=false
```

This is the exact bad state: WordPress persisted the current raw title/content,
but `_crdt_document` persisted the stale initial CRDT title/content. Under the
old `getPostChangesFromCRDTDoc` comparison, the active editor then compares the
current edited raw title to the stale CRDT title and dispatches the initial
title back into the editor. The save-time overlay fix prevents this mixed
raw/CRDT response from being persisted; the persisted-record diff context
separately guards exact persisted-base replays over dirty local fields.

Fresh pass-122 known-fixes browser verification on
`/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505` using its
already-running wp-env on port `9903` still fails:

```text
Expected: "RTC same-user save-after-reload customer title"
Received: "RTC same-user save-after-reload initial"
```

Fresh pass-122 fixed verification on PR branch head `ffbcba101b5`:

```text
sync-manager focused unit tests: PASS
core-data CRDT focused unit test: PASS
prePersistPostType focused unit test: PASS
targeted data/core-data/sync production build: PASS
natural-user Playwright repro on the fixed worktree wp-env at 9912: PASS
```

The tests-only repro commit `764f3d4b4d9` still fails at the sync-manager level
without Playwright:

```text
Expected: "Customer title"
Received: "Initial title"

Expected getChangesFromCRDTDoc(..., editedRecord, persistedRecord)
Received getChangesFromCRDTDoc(..., editedRecord)
```

The PR branch remains in the required order:

```text
764f3d4b4d9 Add RTC title reload unit repros
a331ec7ec0f Add same-user title save-after-reload browser repro
ffbcba101b5 Preserve RTC title across reload saves
```

## Pass 165 update

Pass 165 rebased the PR branch onto current `origin/trunk`:

```text
origin/trunk: 12a12af12a48b86223152498c688d7f87fbfae2f
1470c718116 Add RTC title reload unit repros
0a650295ee1 Add same-user title save-after-reload browser repro
1c082180019 Preserve RTC title across reload saves
```

The rebase applied cleanly. The upstream RTC commits added since the previous
pass (`f770b5df822`, `3c09a4eb806`) affect PHP sync-post-meta storage and do
not touch the JavaScript title diff or CRDT serialization path fixed here.

The independent lower-level repro still fails on the test-only commit
`1470c718116`, which contains the repro tests but not the fix:

```text
npm run test:unit -- packages/sync/src/test/manager.ts --runInBand --testNamePattern='serializes the record being saved|serializes the current edited record|passes the persisted record'

Expected: "Customer title"
Received: "Initial title"

Expected getChangesFromCRDTDoc(..., editedRecord, persistedRecord)
Received getChangesFromCRDTDoc(..., editedRecord)
```

The same focused sync-manager repro passes on the fixed current-trunk PR head
`1c082180019`:

```text
Test Suites: 1 passed, 1 total
Tests: 26 skipped, 3 passed, 29 total
```

The broader fixed unit set also passes on the rebased PR head:

```text
npm run test:unit -- packages/core-data/src/test/entities.js packages/core-data/src/test/resolvers.js packages/core-data/src/utils/test/crdt.ts packages/sync/src/test/manager.ts --runInBand

Test Suites: 4 passed, 4 total
Tests: 124 passed, 124 total
```

Pass 165 attempted a fresh `wp-env` browser rerun on port `9904`, but the local
Docker layer hung: both `wp-env start` and a concurrent `docker ps` failed to
return until the commands were terminated. The existing pass-118 stitched
headless video remains valid and was rechecked with `ffprobe`:

```text
width=1920
height=1080
nb_frames=840
duration=28.000000
```

The targeted package build produced the affected `sync`, `data`, and
`core-data` bundles, then failed later in route-building because this dependency
tree cannot resolve `@wordpress/content-types/package.json`. That failure is
outside the touched packages and was not used as product evidence.

## Pass 167 practical-impact update

Pass 167 reclassified the real-user likelihood as **low** for normal Gutenberg
use, not because the defect is synthetic, but because the triggering workflow is
narrow. The required user workflow is:

1. Real-time collaboration is enabled for the post editor. In the Gutenberg
   plugin this is early-access functionality and is enabled by the plugin
   activation/migration path unless disabled; the default provider is HTTP
   polling.
2. The same WordPress user opens the same post in two browser sessions or tabs.
3. One session edits the post title and leaves that title unsaved.
4. The other same-user session edits ordinary paragraph content and reloads.
5. The first session then makes another ordinary body edit and saves.

The common parts are editing a post title, editing paragraph content, reloading
an editor tab, and saving a draft. The uncommon parts are having two same-user
editor sessions on the same post at once and reloading one of them after a
cross-session title update but before the later save. No malformed block input,
direct store mutation, artificial fault injection, multiple WordPress users, or
network-delay injection is required. The fuzz-only parts are the exact strings,
the deterministic waits for sync cycles, and the compact ordering that makes the
race reproducible on demand.

Blast radius is meaningful but bounded. The immediate failure is an editor-state
rollback: the canonical REST post title can be saved as the customer title while
the active editor store and persisted `_crdt_document` replay the initial title.
That creates a real risk that a later save or publish from the rolled-back
editor overwrites the intended title. The same raw/CRDT split can leave
`_crdt_document` content behind the canonical REST content. This is not a
duplicate-content bug, save loop, performance issue, or OOM risk. Recovery is
possible if the user notices before another save, because the raw REST title was
observed saved correctly in the source trace; recovery becomes worse after a
subsequent save from the rolled-back editor.

Strongest evidence for the low-but-real classification:

- The source run failed after four adjacent same-file controls passed, without
  timeout or locator/action errors.
- The archived trace decodes to a final REST raw title of
  `RTC same-user save-after-reload customer title` but a persisted CRDT title of
  `RTC same-user save-after-reload initial`.
- The natural-user Playwright repro uses normal editor actions only.
- The lowest sync-manager repro fails without Playwright before the fix and
  passes after the fix.

Strongest evidence against a higher likelihood:

- It needs duplicate same-user sessions on one post, not a single normal editor
  session.
- It needs a reload at a specific point in the collaboration/save sequence.
- The real-time collaboration surface is still labeled early access and may be
  disabled by site policy or incompatible editor features.

The shortest additional experiment that would most improve confidence is a
small frequency probe over the natural-user Playwright scenario: run the same
two-tab workflow without deterministic sync-cycle waits, with randomized human
pauses around the reload/save boundary, and record how often the active title
rolls back. That would separate "possible under a precise interleaving" from
"likely during ordinary duplicate-tab editing".

Pass 167 also rebased the branches onto current `origin/trunk`
`19c460ff7c85289ad7bcc92911fdae9bc650b0c3`:

```text
54672a414e0 Add RTC title reload unit repros
e1de784ce1e Add same-user title save-after-reload browser repro
dbf9ad0eee8 Preserve RTC title across reload saves
```

Fresh pass-167 focused sync-manager verification:

```text
test-only pre-fix commit: FAIL
  Expected: "Customer title"
  Received: "Initial title"
  Expected getChangesFromCRDTDoc(..., editedRecord, persistedRecord)
  Received getChangesFromCRDTDoc(..., editedRecord)

rebased fixed PR head: PASS
  Test Suites: 1 passed, 1 total
  Tests: 26 skipped, 3 passed, 29 total
```

Pass 167 attempted to start `wp-env` on `WP_ENV_PORT=9906` for a fresh browser
rerun. `wp-env status` reported the environment was not initialized, and
`wp-env start --config .wp-env.test.json` produced no output beyond the command
banner for about 37 seconds, so it was interrupted rather than left running.
The existing annotated headless video remains the pass-118 stitched video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-118/6f589c89600c-pass118-stitched.mp4
width=1920
height=1080
nb_frames=840
duration=28.000000
```

## Pass 168 practical-impact and branch refresh

Pass 168 keeps the real-user likelihood classification at **low**. In broad
normal Gutenberg use the exposure is narrow because RTC must be enabled and the
same user must have duplicate editor sessions on one post. It is not
`very-low` for RTC-enabled editing, because the required actions are still
ordinary editor actions: type a title, type paragraph content in another tab,
reload that tab, then save from the first tab. The repro does not require
malformed blocks, direct state mutation, synthetic REST faults, multiple
WordPress users, network-delay injection, or unusual block types.

Pass 168 independently reran the source trace decoder:

```text
earlier_crdt_had_customer_title=true
final_save_raw_customer_crdt_initial=true
final_rest_raw_customer_crdt_initial=true
PASS trace proves raw title customer while persisted CRDT title is initial
```

This is the narrow root-cause proof: the final REST record contains the
customer title in the canonical raw post field, while `_crdt_document` still
contains the initial title. A later CRDT-to-editor diff can therefore replay
the stale persisted title into an editor with a dirty newer title.

The branches were rebased onto current `origin/trunk`
`86d1b6741a5435ac4611e6e8ae36bf54e1d546e9`:

```text
explanation branch head after rebase, before this pass-168 doc update:
4221f12c435 Update RTC title loss pass 167 impact analysis

PR branch commit order:
1b9db7b372d Add RTC title reload unit repros
d09ceb420b3 Add same-user title save-after-reload browser repro
fd4dc607adc Preserve RTC title across reload saves
```

Fresh pass-168 fixed sync-manager verification after the rebase:

```text
npm run test:unit -- packages/sync/src/test/manager.ts --runInBand --testNamePattern='serializes the record being saved|serializes the current edited record|passes the persisted record'

PASS packages/sync/src/test/manager.ts
Test Suites: 1 passed, 1 total
Tests: 26 skipped, 3 passed, 29 total
```

A broader local core-data unit run was attempted but did not execute those
tests because the local test bootstrap failed while importing `packages/date`:

```text
TypeError: Cannot read properties of undefined (reading 'zone')
at packages/date/src/index.ts:212
```

That was not counted as product evidence. A fresh browser rerun on
`WP_ENV_PORT=9904` was also locally blocked: `wp-env status` reported that the
environment was not initialized, and `wp-env start --config .wp-env.test.json`
produced no output beyond the npm/wp-env banner for about 60 seconds before the
start process was terminated. The archived source trace and pass-118 headless
stitched video remain the browser evidence.

## Pass 169 current known-fixes check

Pass 169 rechecked the bug against the backlink-aware May 7 known-fixes base:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-current-20260507
f256024286dd80a4c0e2579f658c109256abf648
```

That base includes the merged and proposed #77716 backlink-aware RTC fix set,
including stale persisted CRDT/base-version work, but it still lacks the raw
persisted-record context needed for this exact title rollback. In that base:

- `packages/sync/src/manager.ts` still calls
  `getChangesFromCRDTDoc( tempDoc, record )` when diffing a persisted CRDT doc.
- `createPersistedCRDTDoc` serializes the current manager Y.Doc plus
  `baseVersion`; it does not first overlay the exact save payload.
- `packages/core-data/src/utils/crdt.ts` still treats a CRDT `title` value that
  differs from the edited raw title as a change, with no check for "this value
  is exactly the persisted raw base value".

The smallest current-base repro was a test-only application of the PR's
core-data CRDT assertion. It failed for the product reason:

```text
FAIL packages/core-data/src/utils/test/crdt.ts
expect(received).not.toHaveProperty(path)
Expected path: not "title"
Received value: "Persisted Title"
```

The same focused checks on the fixed PR branch passed in a clean temporary
worktree:

```text
PASS packages/sync/src/test/manager.ts
Tests: 26 skipped, 3 passed, 29 total

PASS packages/core-data/src/utils/test/crdt.ts
Tests: 45 skipped, 1 passed, 46 total
```

Pass 169 keeps real-user likelihood at **low**. The workflow is natural once a
site is using RTC, but the prerequisite set is narrow: one WordPress user needs
the same post open in two editor sessions, one session edits the title, the
other receives that title and reloads after a body edit, then the first session
saves from a state whose raw REST title and persisted `_crdt_document` title can
diverge. No second WordPress user, network-delay injection, custom block, direct
state mutation, malformed block tree, or artificial REST fault is required.

The blast radius is bounded but real: the active editor title can roll back to
the initial title, and a later save from the rolled-back session can persist
that rollback. There is no evidence of duplicate content, save loops,
performance risk, or OOM risk. Recovery is straightforward if noticed before a
later save, because the source trace showed the canonical REST title had been
saved correctly; recovery becomes harder after a subsequent stale-title save.

## Pass 170 current known-fixes correction

Pass 170 rechecked the bug on the current backlink-aware May 7 known-fixes base
rather than the older May 5 refresh checkout:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-current-20260507
f256024286dd80a4c0e2579f658c109256abf648
```

The earlier pass-169 lower-level assertion is still true in a narrow API sense:
that base does not implement this PR branch's explicit
`createPersistedCRDTDoc( ..., { record } )` save-payload overlay, and a
test-only sync-manager assertion expecting that API fails with:

```text
Expected: "Customer title"
Received: "Initial title"
```

However, pass 170 found that this is no longer enough to claim the natural user
workflow survives the current known-fixes base. The current base has additional
stale-save protection in `prePersistPostType`: it fetches the latest persisted
record, applies persisted CRDT state when needed, and uses the current CRDT
record to reconcile locally changed raw saved fields. With the current
known-fixes `build/` copied into the Docker-visible test worktree, the natural
same-user title reload Playwright repro passed four consecutive times:

```text
npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium

1 passed

npm run test:e2e -- \
  test/e2e/specs/editor/collaboration/collaboration-same-user-title-loss.spec.ts \
  --project=chromium \
  --repeat-each=3

3 passed
```

The fixed PR branch was rebased onto current `origin/trunk`
`b57b0ae2291f504caf44018b18b3e412e8411acc` and still has the requested commit
order:

```text
214b35e7370 Add RTC title reload unit repros
a1d262cdd06 Add same-user title save-after-reload browser repro
f4caa7a8927 Preserve RTC title across reload saves
```

The rebased PR branch's focused sync-manager checks passed:

```text
PASS packages/sync/src/test/manager.ts
Tests: 26 skipped, 3 passed, 29 total
```

The same natural browser repro also passed after copying the existing fixed
`build/` artifact into the Docker-visible test worktree:

```text
1 passed
Collaboration - same user title loss › saves the active title after a same-user browser session reloads
```

Pass 170 therefore changes the current status from "survives all current
known-fixes" to "historically real and still well explained, but the current
backlink-aware known-fixes base appears to cover the natural user workflow." The
PR branch remains a narrower hardening proposal for the save-payload
serialization invariant, not required evidence that the browser workflow is
still user-reachable on the current combined known-fixes base.
