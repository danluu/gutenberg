# RTC top-level block move duplicates a paragraph and drops a sibling

Bug signature: `07f8eb5c4218`

Bug type: `rtc_top_level_block_move_duplicates_paragraph_and_drops_sibling_after_collaborative_structural_edits`

Transport: `http`

## Pass 168 update

Pass 168 re-read the pass-167 summary, source JSONL row, source generated spec,
source log, source error context, source screenshots, source trace action
stream, RTC enablement code, current `mergeCrdtBlocks()` code, current trunk
negative controls, known-fixes negative controls, and the existing branch/video
artifacts.

The practical real-user likelihood is now classified as `low` for normal
Gutenberg use, with a `medium` conditional risk inside active real-time
collaboration sessions. The bug is still real, but normal single-user editing
cannot exercise it. The natural trigger requires the post editor with real-time
collaboration enabled, two browser sessions/users on the same draft, ordinary
top-level paragraph/heading blocks, and this structural sequence:

```text
editor A deletes a top-level heading
editor B inserts a paragraph before the original paragraph
editor A moves that original paragraph down below its sibling
```

The source Playwright trace uses normal toolbar actions only:

```text
click heading text
Block tools -> Options -> Delete
click paragraph text
Block tools -> Options -> Add before
type the inserted paragraph
click paragraph text
Block tools -> Move down
```

No malformed block tree, direct store mutation, injected CRDT document,
network fault, save/reload, or browser reload is part of the trigger. The
fuzz-only details are the exact seed strings, automatic user/post creation, and
explicit convergence waits between steps. Those waits make the ordering
deterministic, but they correspond to ordinary user pauses between edits rather
than an impossible product state.

The strongest evidence for `low` instead of `medium` across normal use is that
the feature is explicitly presented as early-access real-time collaboration,
the site editor is excluded, single-user sessions are immune, and the failure
needs two live editors to restructure adjacent top-level blocks in a specific
order. The strongest evidence against reducing it further is that the actual
editing operations are common, the setting is enabled on Gutenberg plugin
activation when collaboration is allowed, the source browser trace hit the bug
on the first attempt, and the low-level CRDT repro shows the duplicate/drop
state without Playwright timing.

Fresh pass-168 verification:

```text
fixed PR branch:
  npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --no-cache --runInBand
  exit 0
  81 passed, 81 total

  npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
  exit 0

current origin/trunk 86d1b6741a57cdc066485370fe051285f2ebd0b4
  + 29c497e2479 focused low-level repro:
  exit 1
  5 failed, 1 passed, 75 skipped

known-fixes base 3cba2b1e56a98787de08dc6c7df2434759e8f908
  + 29c497e2479 focused low-level repro:
  exit 1
  3 failed, 3 passed, 79 skipped
```

The known-fixes base still reproduces the product symptom:

```text
Expected: ["Inserted paragraph", "Sibling paragraph", "Moved paragraph"]
Received: ["Inserted paragraph", "Moved paragraph", "Moved paragraph"]
```

`WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status`
reported the environment was not initialized, and a plain `docker ps` hung for
30 seconds until killed. A fresh browser replay was therefore not feasible in
this local environment. The archived source Playwright trace remains the
natural-user browser repro, and the pass-165 annotated video is present and
valid:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-165/video/07f8eb5c4218-pass165-annotated.mp4
codec=h264 width=2560 height=1240 duration=18.000000 nb_frames=450 size=380479
```

The shortest additional experiment that would most improve confidence is a
healthy-wp-env Playwright run of this same natural workflow for about 20
attempts with human-like pauses and without explicit per-step convergence waits.
That would measure whether the harness-controlled ordering appears naturally in
ordinary co-editing cadence.

## Pass 167 update

Pass 167 refreshed both branches onto current `origin/trunk`
`19c460ff7c85289ad7bcc92911fdae9bc650b0c3` and focused on practical user
impact. The classification remains a real Gutenberg RTC product bug. The
real-user likelihood is `medium` for active real-time collaboration sessions:
the source repro uses ordinary post-editor actions on ordinary top-level blocks,
but it requires two live editors on the same post and a specific structural edit
interleaving. Across all Gutenberg usage the likelihood is lower because
single-user editing and sites with collaboration disabled cannot exercise this
path.

Natural triggering workflow:

```text
post editor, real-time collaboration enabled, HTTP sync transport
editor A and editor B open the same draft
initial top-level blocks: heading, paragraph, sibling paragraph
editor A deletes the heading through block Options -> Delete
editor B selects the paragraph and uses Options -> Add before
editor B types a normal inserted paragraph
editor A selects the original paragraph and clicks Move down
```

The source trace shows those UI actions completing. There is no injected block
tree, direct data-store mutation, malformed locator, save/reload requirement,
network fault, or browser-tab reload in the triggering path. The waits between
steps are fuzz-harness control points; they make the scenario easier to reason
about but are not the root cause. The low-level reducer reproduces the same
duplicate/drop state without Playwright or timing.

Pass 167 verification on the rebased PR branch:

```text
fixed PR branch:
  npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --no-cache --runInBand
  exit 0
  81 passed, 81 total

  npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
  exit 0

current origin/trunk 19c460ff7c85289ad7bcc92911fdae9bc650b0c3
  + f56839a80a8 focused low-level repro:
  exit 1
  6 failed, 75 passed, 81 total

known-fixes base 3cba2b1e56a98787de08dc6c7df2434759e8f908
  + f56839a80a8 focused low-level repro:
  exit 1
  3 failed, 82 passed, 85 total
```

The known-fixes base still reproduces the exact duplicate/drop symptom:

```text
Expected: ["Inserted paragraph", "Sibling paragraph", "Moved paragraph"]
Received: ["Inserted paragraph", "Moved paragraph", "Moved paragraph"]
```

Fresh browser replay was not feasible in pass 167 because
`WP_ENV_PORT=9904 npm run wp-env status` reported the environment as
uninitialized and `docker ps` hung until killed. The archived source
Playwright trace remains the natural-user negative browser repro, and the
pass-114 annotated headless video remains valid:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-114/video/07f8eb5c4218-pass114-verified-annotated.mp4
codec=h264 width=2560 height=1240 duration=18.000000 nb_frames=450 size=378303
```

The rebased PR branch now has the requested three commits:

```text
f56839a80a8 Add RTC top-level block move unit repro
1c55a4ce4d5 Add RTC top-level block move Playwright repro
ee639ba4b65 Fix RTC top-level block move reconciliation
```

## Pass 165 update

Pass 165 re-read the pass-114 summary, source JSONL row, source log, source
spec, source error context, screenshots, and a freshly extracted source trace
from the original `trace.zip`. The classification remains a real Gutenberg RTC
product bug.

The source run is still a clean semantic convergence failure:

```text
result=failed exitCode=1 timedOut=false durationMs=47666
startedAt=2026-05-05T10:14:48.655Z
completedAt=2026-05-05T10:15:36.321Z
```

The pass-165 trace extraction independently verifies the natural action path:

```text
POST a normal draft with heading, moved paragraph, and sibling paragraph
primary: click "Seed 950301 multibyte heading"
primary: block toolbar Options -> Delete
collaborator: click "Emoji and multibyte"
collaborator: block toolbar Options -> Add before
collaborator: type "RTC ec47 realistic inserted paragraph 1"
primary: click "Emoji and multibyte"
primary: block toolbar Move down
```

There is no locator timeout or malformed generated action in that path. The
final failure is that both editors are live but their block lists have different
semantic contents:

```text
admin peer:        [inserted paragraph, sibling paragraph, moved paragraph]
collaborator peer: [inserted paragraph, moved paragraph, moved paragraph]
```

Both requested branches were refreshed onto current `origin/trunk`
`12a12af12a48b86223152498c688d7f87fbfae2f`. No commits between the old base
`ae940c4384d8d1d95fb52e7c76765ad2cdc18c6a` and the new trunk touched
`packages/core-data/src/utils/crdt-blocks.ts`,
`packages/core-data/src/utils/test/crdt-blocks.ts`, or the collaboration
fixture/spec files used here. The PR branch remains the requested three-commit
stack:

```text
c32a2b026c9 Add RTC top-level block move unit repro
754aaf98422 Add RTC top-level block move Playwright repro
21f5b68a404 Fix RTC top-level block move reconciliation
```

Fresh pass-165 low-level verification:

```text
fixed PR branch:
  npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --no-cache --runInBand
  exit 0
  81 passed, 81 total

current origin/trunk 12a12af12a48b86223152498c688d7f87fbfae2f
  + c32a2b026c9 focused low-level repro:
  exit 1
  6 failed, 75 passed, 81 total

known-fixes base 3cba2b1e56a98787de08dc6c7df2434759e8f908
  + c32a2b026c9 focused low-level repro:
  exit 1
  3 failed, 82 passed, 85 total
```

The known-fixes base still reproduces the exact product symptom in the
non-Playwright CRDT-level sequence:

```text
Expected: ["Inserted paragraph", "Sibling paragraph", "Moved paragraph"]
Received: ["Inserted paragraph", "Moved paragraph", "Moved paragraph"]
```

Pass 165 attempted a fresh fixed-branch Playwright run from this rebased
worktree. `wp-env status` correctly reported the port-9900 environment as
uninitialized, but `wp-env start` and plain `docker ps` calls hung in Docker
before WordPress became reachable; `curl` to both `localhost:9900` and the old
source run's `localhost:9601` failed immediately. This is a local environment
blocker, not product evidence. The source Playwright trace remains the browser
negative repro, and pass 114 remains the latest successful fixed-branch
headless Playwright verification.

Pass-165-specific addition: the current-trunk low-level negative control now
runs against `12a12af12a48b86223152498c688d7f87fbfae2f`, which proves the
bug is still present after the 27 trunk commits that landed after pass 114 and
narrows the still-unfixed behavior to the same `mergeCrdtBlocks()` top-level
same-clientId reorder path.

Origin analysis remains stable. GitHub PR #72262,
https://github.com/WordPress/gutenberg/pull/72262, merged as
`84019935998c16f877e976ad85e84748355d7282` on 2025-10-14. The PR introduced
post-specific CRDT block merge logic and represented block trees as Yjs maps and
arrays. Local blame on current trunk still points the top-level positional
delete/insert skeleton at that merge commit:

```text
yblocks.delete( left, numOfDeletionsNeeded );
yblocks.insert( left, newBlock );
```

Later commits improved rich-text, nested array, table, cursor, emoji, local
attribute, and type-safety handling, but did not add a same-clientId top-level
move operation. The failure mode is therefore still that a pure top-level move
can be interpreted as positional content updates to existing `Y.Map` block
records. When a stale local snapshot reports that move after peer structural
edits, the positional rewrite duplicates the moved paragraph's content and
drops the sibling paragraph on the other peer.

The audited fix plan remains narrow and fail-closed: detect only strict
same-length top-level reorders with unique non-empty clientIds, preserve stable
prefix/suffix identity, rebuild only the reordered middle range as top-level
`Y.Array` delete/insert operations, source moved blocks from the current CRDT
state so already-applied peer edits survive stale local snapshots, and allow
through only the selected local rich-text attribute when the caller identifies
it. Residual risks remain mixed insert/delete/reorder shapes, duplicate or
missing clientIds, non-selected local attribute changes made in the same editor
gesture as a move, and remote cursor anchoring around rebuilt moved ranges.

## Pass 114 update

Pass 114 independently re-read the pass-113 summary, source JSONL row, source
log, source spec, source error context, source screenshots, source trace action
stream, fix branch, explanation branch, local history, blame, and PR #72262
metadata. The classification remains a real Gutenberg RTC product bug.

The pass-114 falsification check found no readiness, locator, malformed-spec,
environment, or inverted-assertion explanation. The source trace resolves each
intended natural action to the expected editor element: the heading is selected
and deleted through block Options, the collaborator uses Options -> Add before
on the multibyte paragraph and types the inserted paragraph, and the primary
editor clicks toolbar Move down on the same multibyte paragraph. The failure is
only the final semantic convergence mismatch:

```text
admin peer:        [inserted paragraph, sibling paragraph, moved paragraph]
collaborator peer: [inserted paragraph, moved paragraph, moved paragraph]
```

Pass 114 also verified that the existing branches and video still satisfy the
requested standard. `origin/trunk` is unchanged from pass 113 at
`ae940c4384d8d1d95fb52e7c76765ad2cdc18c6a`; the PR branch is still exactly the
three requested commits ahead of trunk and has no commits behind:

```text
82cf0023cf7 Add RTC top-level block move unit repro
71074f7aed4 Add RTC top-level block move Playwright repro
6c0f2860ca3 Fix RTC top-level block move reconciliation
```

Fresh pass-114 low-level verification:

```text
fixed PR branch:
  npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --no-cache
  exit 0
  81 passed, 81 total

current origin/trunk ae940c4384d8d1d95fb52e7c76765ad2cdc18c6a
  + 82cf0023cf7 focused low-level repro:
  exit 1
  6 failed, 75 passed, 81 total

known-fixes base 3cba2b1e56a98787de08dc6c7df2434759e8f908
  + 82cf0023cf7 focused low-level repro:
  exit 1
  3 failed, 82 passed, 85 total
```

The known-fixes base still reproduces the exact duplicate/drop symptom:

```text
Expected: ["Inserted paragraph", "Sibling paragraph", "Moved paragraph"]
Received: ["Inserted paragraph", "Moved paragraph", "Moved paragraph"]
```

Fresh pass-114 natural-user Playwright verification on the fixed branch passed
headlessly against the fixed browser bundle:

```text
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 \
RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1 --trace=on

exit 0
1 passed in 22.8s
```

Pass 114 generated a fresh annotated video copy and verified a nonblank frame:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-114/video/07f8eb5c4218-pass114-verified-annotated.mp4
codec=h264 width=2560 height=1240 duration=18.000000 nb_frames=450 size=378303
```

Origin analysis remains stable. GitHub PR #72262,
https://github.com/WordPress/gutenberg/pull/72262, merged as
`84019935998c16f877e976ad85e84748355d7282` on 2025-10-14. It introduced
`packages/core-data/src/utils/crdt-blocks.ts` and the positional top-level
block merge skeleton. Local blame on current trunk still points the top-level
`yblocks.delete( left, numOfDeletionsNeeded )` and
`yblocks.insert( left, newBlock )` operation shape at that merge commit. Later
commits improved rich-text, nested array, table, cursor, and type-safety
behavior, but did not change the same-clientId top-level move path that rewrites
existing `Y.Map` block records by position.

The audited fix plan is still the narrow fail-closed plan already implemented
on the PR branch: detect only same-length reorders with a unique non-empty
clientId set, preserve stable prefix/suffix identity, rebuild only the reordered
middle range as top-level `Y.Array` delete/insert operations, source moved
blocks from current CRDT state so already-applied peer edits survive, and allow
through only the selected local rich-text attribute when the caller identifies
it. Residual risks are mixed insert/delete/reorder shapes, duplicate or missing
clientIds, non-selected local attribute changes made in the same gesture as a
move, and remote cursor anchoring around rebuilt moved ranges.

## Pass 113 update

Pass 113 re-read the pass-112 summary, the source JSONL row, source log,
source spec, source error context, source screenshots, trace action stream,
current fix branch, local history, blame, and GitHub metadata for the
introducing PR. The classification remains a real Gutenberg RTC product bug.

The source failure is still a clean semantic convergence failure:

```text
result=failed exitCode=1 timedOut=false durationMs=47666
startedAt=2026-05-05T10:14:48.655Z
completedAt=2026-05-05T10:15:36.321Z
```

The trace reaches the intended natural editor actions:

```text
create a normal post with heading, moved paragraph, and sibling paragraph
join a collaborator
delete the heading through block Options
on the collaborator, Options -> Add before on the multibyte paragraph
type the inserted paragraph
on the primary editor, toolbar Move down on the multibyte paragraph
poll convergence
```

The failing state is not a readiness wait, action locator failure, malformed
spec, inverted assertion, or expected behavior:

```text
admin peer:        [inserted paragraph, sibling paragraph, moved paragraph]
collaborator peer: [inserted paragraph, moved paragraph, moved paragraph]
```

Pass-113-specific addition: both branches were rebased onto fresh
`origin/trunk` `ae940c4384d8d1d95fb52e7c76765ad2cdc18c6a` after trunk moved
since pass 112. The PR branch remains the requested three-commit stack:

```text
82cf0023cf7 Add RTC top-level block move unit repro
71074f7aed4 Add RTC top-level block move Playwright repro
6c0f2860ca3 Fix RTC top-level block move reconciliation
```

Fresh pass-113 low-level verification:

```text
fixed rebased PR branch:
  npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --no-cache
  exit 0
  81 passed, 81 total

current origin/trunk ae940c4384d8d1d95fb52e7c76765ad2cdc18c6a
  + 82cf0023cf7 focused low-level repro:
  exit 1
  6 failed, 75 passed, 81 total

known-fixes base 3cba2b1e56a98787de08dc6c7df2434759e8f908
  + 82cf0023cf7 focused low-level repro:
  exit 1
  3 failed, 82 passed, 85 total
```

The focused failures give a narrower root-cause proof on current trunk and on
the known-fixes base. For a same-clientId top-level reorder, the unfixed merge
path keeps the old `Y.Map` objects at their positions, emits no top-level
`Y.Array` delete/insert event, and can overwrite already-applied remote edits
from a stale local block snapshot. On the known-fixes base, the low-level
collaboration sequence still reproduces the exact product symptom:

```text
Expected: ["Inserted paragraph", "Sibling paragraph", "Moved paragraph"]
Received: ["Inserted paragraph", "Moved paragraph", "Moved paragraph"]
```

Fresh pass-113 natural-user Playwright verification on the rebased fixed
branch passed headlessly:

```text
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 \
RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 \
npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1 --trace=on

exit 0
1 passed in 22.6s
```

Pass 113 also created a fresh annotated headless stitched video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-113/video/07f8eb5c4218-pass113-annotated.mp4
codec=h264 width=2560 height=1240 duration=18.000000 nb_frames=450 size=365858
```

Origin analysis is unchanged. GitHub PR
https://github.com/WordPress/gutenberg/pull/72262 is merged; the connector
reported merge commit `84019935998c16f877e976ad85e84748355d7282`, merged at
`2025-10-14T17:38:19Z`, with 13 changed files, 1526 additions, and 97
deletions. Local `git show` confirms that commit created
`packages/core-data/src/utils/crdt-blocks.ts` and
`packages/core-data/src/utils/test/crdt-blocks.ts`. Local `git blame` still
points the top-level positional delete/insert skeleton at that commit,
including `yblocks.delete( left, numOfDeletionsNeeded )` and
`yblocks.insert( left, newBlock )`. Later commits improved rich-text, nested
array, table, cursor, and type-safety behavior but did not change the unsafe
operation shape for a strict same-clientId top-level move.

The audited fix plan remains the narrow one: detect only strict same-length
reorders with unique non-empty clientIds, preserve stable prefix/suffix
identity, rebuild only the reordered middle range as top-level `Y.Array`
delete/insert operations, source moved blocks from current CRDT state so
already-applied peer edits survive, and allow through only the selected local
rich-text attribute when the caller can identify it. The detector is
fail-closed and O(n). Mixed insert/delete/reorder shapes, duplicate or missing
clientIds, and remote cursor anchoring around rebuilt moved ranges remain
follow-up risks.

Pass-113 verification residuals:

```text
changed-file lint: exit 2 before touched-file linting starts because the
shared node_modules tree lacks @wordpress/no-non-module-stylesheet-imports.

build: build:js and build:php exited 0, then primitive color token generation
failed with TypeError: [object Object] is not a valid color space.
```

## Pass 111 update

Pass 111 re-read the pass-110 summary, source JSONL row, source log, source
error context, source screenshots, source trace action stream, the rebased PR
branch code, local history, blame, and the existing explanation branch. The
classification remains a real Gutenberg RTC product bug.

The source artifact is still a clean semantic failure. The source run exits
with `timedOut=false`, reaches the intended natural UI actions, and fails only
after polling two different block trees:

```text
admin peer:        [inserted paragraph, sibling paragraph, moved paragraph]
collaborator peer: [inserted paragraph, moved paragraph, moved paragraph]
```

Pass-111-specific addition: both requested branches were rebased onto current
`origin/trunk` `c70fc1929c5177202c8ce3094d6c53e548b54aeb`. The PR branch is
again the requested three-commit stack:

```text
b4379d998e5 Add RTC top-level block move unit repro
f35296b963c Add RTC top-level block move Playwright repro
139279b5792 Fix RTC top-level block move reconciliation
```

Fresh pass-111 low-level controls used only the unit repro commit on unfixed
trees:

```text
current origin/trunk c70fc1929c5177202c8ce3094d6c53e548b54aeb
  + b4379d998e5 focused low-level repro:
  PASS111_TRUNK_CHERRY_PICK_EXIT=0
  PASS111_TRUNK_TESTONLY_UNIT_EXIT=1
  6 failed, 75 passed, 81 total

known-fixes base 3cba2b1e56a98787de08dc6c7df2434759e8f908
  + b4379d998e5 focused low-level repro:
  PASS111_KNOWNFIX_CHERRY_PICK_EXIT=0
  PASS111_KNOWNFIX_TESTONLY_UNIT_EXIT=1
  3 failed, 82 passed, 85 total
```

The narrower root-cause proof is the event-shape assertion: without the fix,
the same-clientId reorder keeps the old `Y.Map` instances at their array
positions and emits no top-level `Y.Array` delete/insert event. The known-fixes
base also still reproduces the exact duplicate/drop state:

```text
Expected: ["Inserted paragraph", "Sibling paragraph", "Moved paragraph"]
Received: ["Inserted paragraph", "Moved paragraph", "Moved paragraph"]
```

The rebased fixed branch passes the full low-level suite:

```text
PASS111_FIXED_UNIT_EXIT=0
81 passed, 81 total
```

For browser verification, the first pass-111 e2e attempt failed before the
editor opened because an incomplete local `build/` tree left WordPress throwing
`Call to undefined function gutenberg_override_style()`, so the REST API link
header could not be discovered. After restoring the complete known-good build
tree and overlaying the freshly built fixed `core-data` browser bundle, the
same natural-user Playwright repro passed:

```text
PASS111_RESTORED_BUILD_HELPERS=present
PASS111_FIXED_E2E_RESTORED_EXIT=0
1 passed in 26.2s
```

Pass 111 also generated a fresh annotated headless stitched video from the
source failure screenshots:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-111/video/07f8eb5c4218-pass111-annotated.mp4
codec=h264 width=2560 height=1140 duration=18.000000 nb_frames=450 size=361794
```

Origin analysis is unchanged. The unsafe merge path was introduced by
`84019935998c16f877e976ad85e84748355d7282` ("Improve CRDT \"merge logic\" for
post entities", PR #72262), which created `crdt-blocks.ts` and its tests. Later
commits improved rich-text, nested array, table, cursor, and type-safety
handling, but did not change the fundamental operation shape for a top-level
same-clientId reorder.

The fix plan remains the audited narrow plan: detect only strict same-length
reorders with unique non-empty clientIds, preserve stable prefix/suffix
identity, rebuild only the reordered middle range as top-level `Y.Array`
delete/insert operations, source moved blocks from current CRDT state to avoid
clobbering already-applied peer edits, and allow through only the selected
local rich-text attribute when the caller can identify it. The detector remains
fail-closed and O(n).

Changed-file lint is still blocked by the shared dependency tree before
touched-file linting starts, and the full build is still blocked by the
existing color-token generation failure:

```text
PASS111_LINT_JS_EXIT=2
TypeError: Key "rules": Key "@wordpress/no-non-module-stylesheet-imports":
Could not find "no-non-module-stylesheet-imports" in plugin "@wordpress".

PASS111_BUILD_EXIT=1
TypeError: [object Object] is not a valid color space
```

## Pass 110 update

Pass 110 re-read the pass-109 summary, source JSONL row, source log, source
error context, source screenshots, source trace action stream, current branch
code, branch history, blame, and GitHub metadata for the introducing PR. The
classification remains a real Gutenberg RTC product bug.

The source trace is a clean semantic failure, not a harness failure. It reaches
these intended UI actions before the convergence assertion fails:

```text
click heading block
block Options -> Delete
click multibyte paragraph on collaborator
block Options -> Add before
type inserted paragraph
click multibyte paragraph on admin
toolbar Move down
poll convergence until the two block trees stay different
```

The source screenshots and fresh pass-110 pre-fix browser rerun show the same
bad state:

```text
primary/admin peer:
[inserted paragraph, sibling paragraph, moved multibyte paragraph]

collaborator peer:
[inserted paragraph, moved multibyte paragraph, moved multibyte paragraph]
```

Pass-110-specific addition: I made a fresh current-runtime negative/positive
browser control. With the worktree temporarily checked out at the repro-only
commit `7640a38d60f7676a938e320a243ec197f043bee9` and the pre-fix
`build/scripts/core-data/index.js` overlaid from the known-fixes base, the
natural-user Playwright repro failed exactly as above:

```text
PASS110_PREFIX_BUILD_HELPERS=absent
PASS110_PREFIX_E2E_EXIT=1
```

After switching back to fixed branch head
`5995d4ba7aaaf9907666167ed59a1fa949524544` and restoring the fixed browser
bundle, the same natural-user repro passed:

```text
PASS110_RESTORED_FIXED_BUILD_HELPERS=present
PASS110_FIXED_AFTER_RESTORE_E2E_EXIT=0
1 passed in 22.0s
```

Pass 110 also refreshed the low-level proof on current `origin/trunk`
`70f50bcfaca05383e5d227deb8c053e981494e2b`. Cherry-picking only the unit repro
commit still fails on trunk:

```text
PASS110_TRUNK_NO_CACHE_TEST_EXIT=1
6 failed, 75 passed, 81 total
```

The known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908` still fails
with the exact duplicate/drop state:

```text
PASS110_KNOWNFIX_NO_CACHE_TEST_EXIT=1
3 failed, 82 passed, 85 total

Expected: ["Inserted paragraph", "Sibling paragraph", "Moved paragraph"]
Received: ["Inserted paragraph", "Moved paragraph", "Moved paragraph"]
```

The fixed branch still passes the focused unit suite:

```text
PASS110_FIXED_UNIT_EXIT=0
81 passed, 81 total
```

And the fixed branch passed the natural-user Playwright repro before and after
the pre-fix overlay check:

```text
PASS110_FIXED_E2E_EXIT=0
PASS110_FIXED_AFTER_RESTORE_E2E_EXIT=0
```

Pass-110 annotated headless stitched video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-110/video/07f8eb5c4218-pass110-annotated.mp4
codec=h264 width=2560 height=1140 duration=18.000000 nb_frames=450 size=382073
```

Origin proof was refreshed again. GitHub PR
https://github.com/WordPress/gutenberg/pull/72262 is merged; its merge commit
is `84019935998c16f877e976ad85e84748355d7282`, merged at
`2025-10-14T17:38:19Z`, with 13 changed files, 1526 additions, and 97
deletions. Local `git show` confirms that commit created
`packages/core-data/src/utils/crdt-blocks.ts` and
`packages/core-data/src/utils/test/crdt-blocks.ts`. Local `git blame` still
points the left/right positional block-diff skeleton and in-place update loop
at that PR. Later commits added richer attribute and nested-array merging, but
they did not change the unsafe operation shape for a same-clientId top-level
move: without the fix, a reorder is emitted as position-based sibling map/text
rewrites rather than as top-level `Y.Array` structure changes.

The fix plan remains unchanged after the pass-110 audit. The fix detects only
strict same-length reorders with unique non-empty clientId sets, preserves
stable prefix/suffix identity, rebuilds only the reordered middle range as
`Y.Array` delete/insert operations, builds moved-range blocks from current CRDT
state so already-applied peer edits are not clobbered, and allows through only
the selected local rich-text attribute when the caller can identify it by
cursor. This is fail-closed and O(n); mixed insert/delete/reorder shapes remain
on the legacy path as residual risk for a later operation-aware design.

Changed-file lint remains blocked before touched-file linting starts:

```text
PASS110_LINT_JS_EXIT=2
TypeError: Key "rules": Key "@wordpress/no-non-module-stylesheet-imports":
Could not find "no-non-module-stylesheet-imports" in plugin "@wordpress".
```

Full build remains blocked after JS/PHP workspace builds finish:

```text
PASS110_BUILD_EXIT=1
TypeError: [object Object] is not a valid color space
```

## Pass 109 update

Pass 109 re-read the pass-108 summary, source JSONL row, source log, source
error context, source screenshots, source trace action stream, current fix
code, local history, blame, and GitHub PR metadata. The classification remains
a real Gutenberg RTC product bug. The source artifact and fresh pass-109
browser rerun both reach the intended user actions and fail only at semantic
convergence; this is not a readiness wait, action locator error, malformed
generated spec, environment failure, inverted assertion, or expected behavior.

Pass-109-specific addition: the existing branch/video/fix were verified again
after rebasing the PR branch onto current `origin/trunk`
`70f50bcfaca05383e5d227deb8c053e981494e2b`. This also gives a narrower
root-cause proof on current trunk: the focused event-level unit repro fails
because the pre-fix merge path emits no top-level `Y.Array` delete/insert event
for a same-clientId reorder and instead mutates existing block contents by
position.

The rebased PR branch is still the requested three-commit stack:

```text
872a0d817e5 Add RTC top-level block move unit repro
7640a38d60f Add RTC top-level block move Playwright repro
5995d4ba7aa Fix RTC top-level block move reconciliation
```

Fresh pass-109 low-level controls, all run with Jest's transform cache
disabled:

```text
current origin/trunk 70f50bcfaca05383e5d227deb8c053e981494e2b
  + 872a0d817e5 focused low-level repro:
  PASS109_TRUNK_CHERRY_EXIT=0
  PASS109_TRUNK_NO_CACHE_TEST_EXIT=1
  6 failed, 75 passed, 81 total

known-fixes base 3cba2b1e56a98787de08dc6c7df2434759e8f908
  + 872a0d817e5 focused low-level repro:
  PASS109_KNOWNFIX_CHERRY_EXIT=0
  PASS109_KNOWNFIX_NO_CACHE_TEST_EXIT=1
  3 failed, 82 passed, 85 total

fixed PR branch 5995d4ba7aaaf9907666167ed59a1fa949524544:
  npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --no-cache
  81 passed, 81 total
```

The known-fixes base still reproduces the exact duplicate/drop state:

```text
Expected: ["Inserted paragraph", "Sibling paragraph", "Moved paragraph"]
Received: ["Inserted paragraph", "Moved paragraph", "Moved paragraph"]
```

Fresh pass-109 browser-level verification also matches the source bug. With the
worktree temporarily checked out at repro-only commit `7640a38d60f` and the
pre-fix shared `build/scripts/core-data/index.js` overlaid, the branch's
natural-action Playwright repro failed headlessly on port 9900:

```text
PREFIX_BUILD_HELPERS=absent
PASS109_PREFIX_RERUN_E2E_EXIT=1

admin peer:
[inserted paragraph, sibling paragraph, moved paragraph]

collaborator peer:
[inserted paragraph, moved paragraph, moved paragraph]
```

After switching back to the rebased fixed PR branch and restoring the fixed
`core-data` browser bundle, the same natural-action Playwright repro passed:

```text
RESTORED_FIXED_BUILD_HELPERS=present
PASS109_FIXED_E2E_AFTER_RESTORE_EXIT=0
1 passed in 21.7s
```

Pass-109 annotated headless stitched video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-109/video/07f8eb5c4218-pass109-annotated.mp4
codec=h264 width=2560 height=1440 duration=18.000000 nb_frames=450 size=413798
```

Origin proof was refreshed. GitHub PR
https://github.com/WordPress/gutenberg/pull/72262 is merged; its merge commit
is `84019935998c16f877e976ad85e84748355d7282`, merged at
`2025-10-14T17:38:19Z`, with 13 changed files, 1526 additions, and 97
deletions. Local `git show` confirms that commit created
`packages/core-data/src/utils/crdt-blocks.ts` and
`packages/core-data/src/utils/test/crdt-blocks.ts`. Local `git blame` on the
pre-fix merge path still points the positional update/delete/insert skeleton at
that commit, with later commits adding rich-text, cursor, nested array, and
table handling without changing the unsafe top-level reorder operation shape.

The fix plan remains unchanged after pass-109 audit. Detect only strict
same-length reorders with unique non-empty clientId sets; preserve stable
prefix/suffix identity; rebuild only the reordered middle range as `Y.Array`
delete/insert operations; build moved-range blocks from current CRDT state so
already-applied peer edits are not clobbered; and pass through only the
selected local rich-text attribute when the caller can identify it by cursor.
The detector is fail-closed, O(n), and intentionally leaves mixed
insert/delete/reorder shapes on the legacy path for a later operation-aware
design.

Changed-file JS lint remains blocked before touched-file linting starts by the
shared `node_modules` tree:

```text
PASS109_LINT_JS_EXIT=2
TypeError: Key "rules": Key "@wordpress/no-non-module-stylesheet-imports":
Could not find "no-non-module-stylesheet-imports" in plugin "@wordpress".
```

`npm run build` remains blocked after JS and PHP workspace builds finish:

```text
PASS109_BUILD_EXIT=1
TypeError: [object Object] is not a valid color space
```

## Pass 108 update

Pass 108 independently re-read the pass-107 summary, source JSONL row, source
log, source error context, source screenshots, source trace action stream,
current fix code, origin history, and the rebased PR branch. The classification
remains a real Gutenberg RTC product bug. The source and pass-108 traces reach
the intended UI actions and fail only at the semantic convergence check; this is
not a readiness wait, locator failure, malformed generated spec, environment
failure, inverted assertion, or expected behavior.

`origin/trunk` advanced to
`158d5fcc99ba20d5929d76ba25494e1716a6d12a`, so pass 108 rebased the PR branch
again. The PR branch is still exactly the requested three-commit stack:

```text
6235edc4b58 Add RTC top-level block move unit repro
905c4d3b0d0 Add RTC top-level block move Playwright repro
ba4c6805e51 Fix RTC top-level block move reconciliation
```

Fresh pass-108 low-level controls, all run with Jest's transform cache disabled:

```text
current origin/trunk 158d5fcc99ba20d5929d76ba25494e1716a6d12a
  + 6235edc4b58 focused low-level repro:
  PASS108_TRUNK_CHERRY_EXIT=0
  PASS108_TRUNK_NO_CACHE_TEST_EXIT=1
  6 failed, 75 passed, 81 total

known-fixes base 3cba2b1e56a98787de08dc6c7df2434759e8f908
  + 6235edc4b58 focused low-level repro:
  PASS108_KNOWNFIX_CHERRY_EXIT=0
  PASS108_KNOWNFIX_NO_CACHE_TEST_EXIT=1
  3 failed, 82 passed, 85 total

fixed PR branch ba4c6805e510ee258d113d873664162c447ad1a8:
  npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --no-cache
  81 passed, 81 total
```

The known-fixes base still reproduces the exact duplicate/drop state:

```text
Expected: ["Inserted paragraph", "Sibling paragraph", "Moved paragraph"]
Received: ["Inserted paragraph", "Moved paragraph", "Moved paragraph"]
```

Pass 108 also added a fresh browser-level negative control rather than relying
on the prior pass. With the worktree temporarily checked out at the repro-only
commit `905c4d3b0d0` and the pre-fix shared
`build/scripts/core-data/index.js` overlaid, the fixed branch's natural-action
Playwright repro failed headlessly on port 9900:

```text
PASS108_PREFIX_BUILD_HELPERS=absent
PASS108_PREFIX_E2E_EXIT=1

primary/source peer A:
[inserted paragraph, sibling paragraph, moved paragraph]

collaborator/source peer B:
[inserted paragraph, moved paragraph, moved paragraph]
```

After switching back to the rebased fixed PR branch and restoring the fixed
`core-data` browser bundle, the same natural-action Playwright repro passed:

```text
PASS108_FIXED_BUILD_RESTORED=1
PASS108_FIXED_E2E_AFTER_RESTORE_EXIT=0
1 passed in 21.4s
```

Pass-108 annotated headless stitched video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-108/video/07f8eb5c4218-pass108-annotated.mp4
codec=h264 width=2560 height=1440 duration=18.000000 nb_frames=450 size=473075
```

Origin proof was refreshed. GitHub PR
https://github.com/WordPress/gutenberg/pull/72262 is merged; its merge commit
is `84019935998c16f877e976ad85e84748355d7282`. Local `git show` confirms that
commit created `packages/core-data/src/utils/crdt-blocks.ts` and
`packages/core-data/src/utils/test/crdt-blocks.ts`. The introduced merge path
uses a left/right positional diff and updates existing `Y.Map`/`Y.Text`
instances by array position, using top-level `Y.Array` delete/insert only for
length changes. That operation shape is unsafe for same-clientId top-level
moves: the local result may look correct only because sibling block records are
rewritten in place, and under collaborative structural edits one peer can
rewrite the sibling into a second copy of the moved paragraph.

The fix plan remains unchanged after the pass-108 audit: strictly detect
same-length top-level reorders with unique non-empty clientId sets, preserve
stable prefix/suffix identity, rebuild only the reordered middle range as
`Y.Array` delete/insert operations, build moved-range blocks from current CRDT
state so already-applied peer edits are not clobbered, and allow through only
the selected local rich-text attribute when the caller can identify it by
cursor. The detector is fail-closed, O(n), and intentionally leaves mixed
insert/delete/reorder shapes on the legacy path for a later operation-aware
design.

Changed-file JS lint is still blocked before touched-file linting starts by the
shared `node_modules` tree:

```text
PASS108_LINT_JS_EXIT=2
TypeError: Key "rules": Key "@wordpress/no-non-module-stylesheet-imports":
Could not find "no-non-module-stylesheet-imports" in plugin "@wordpress".
```

`npm run build` is also still blocked after JS and PHP workspace builds finish:

```text
PASS108_BUILD_EXIT=1
TypeError: [object Object] is not a valid color space
```

## Pass 107 update

Pass 107 re-read the pass-106 summary, the source JSONL row, source generated
Playwright spec, source log, error-context snapshot, source screenshots, source
trace action stream, the current PR branch, the current explanation branch, the
fix code, and origin history. The classification remains a real Gutenberg RTC
product bug, not a readiness wait, action locator error, malformed generated
spec, environment failure, inverted assertion, or expected behavior.

Pass-107-specific addition: I added a fresh natural-user Playwright negative
control on the pre-fix runtime. I temporarily checked the PR worktree out at
the repro-only commit `ec3013fb531`, overlaid the pre-fix shared build where
`build/scripts/core-data/index.js` has no `getClientIdReorderRange`,
`replaceYBlockRange`, or `getCurrentBlocksByClientId`, and ran the existing
headless Chromium natural-action repro against wp-env on port 9900. It failed
with the exact duplicate/drop state:

```text
PASS107_PREFIX_BUILD_HELPERS=absent
PASS107_PREFIX_E2E_EXIT=1

Peer A:
[inserted paragraph, sibling paragraph, moved paragraph]

Peer B:
[inserted paragraph, moved paragraph, moved paragraph]
```

The same worktree was then switched back to
`try/rtc-top-level-block-move-duplicates-paragraph-and-drops-si-07f8eb5c4218-pr`,
the fixed `core-data` build was restored, and the same natural-action repro
passed:

```text
PASS107_FIXED_BUILD_RESTORED=1
PASS107_FIXED_E2E_AFTER_RESTORE_EXIT=0
1 passed in 21.3s
```

Pass 107 also reran the low-level controls with Jest's transform cache
disabled. This matters because the first no-`--no-cache` rerun reused a stale
transform and incorrectly reported green on unfixed trees. The authoritative
no-cache results are:

```text
origin/trunk 5f1ee5529e1c8b50e7ecd35ff022f5b26dc575bb
  + 7d46d25263c focused low-level repro:
  PASS107_TRUNK_NO_CACHE_TEST_EXIT=1
  6 failed, 75 passed, 81 total

known-fixes base 3cba2b1e56a98787de08dc6c7df2434759e8f908
  + 7d46d25263c focused low-level repro:
  PASS107_KNOWNFIX_NO_CACHE_TEST_EXIT=1
  3 failed, 82 passed, 85 total

fixed PR branch 248b4348d978b385d8b45265117dd6a38d74f5bc:
  PASS107_FIXED_UNIT_NO_CACHE_EXIT=0
  81 passed, 81 total
  PASS107_DIFF_CHECK_EXIT=0
```

The known-fixes base still reproduces the exact low-level duplicate/drop
failure:

```text
Expected: ["Inserted paragraph", "Sibling paragraph", "Moved paragraph"]
Received: ["Inserted paragraph", "Moved paragraph", "Moved paragraph"]
```

Build status is unchanged. `npm run build` and `npx wp-build --help` were both
retried during pass 107. JS/PHP workspace and `core-data` package output was
produced, but the shared dependency tree still blocks full build completion:
`npm run build` fails in theme primitive color-token generation with
`TypeError: [object Object] is not a valid color space`; direct `wp-build`
later fails while bundling unrelated packages because this shared
`node_modules` tree cannot resolve `framer-motion`, `react-colorful`,
`@emotion/css`, and `postcss-urlrebase`. The fixed `core-data` browser bundle
was generated and verified directly before the Playwright pass:

```text
build/scripts/core-data/index.js contains:
getClientIdReorderRange
replaceYBlockRange
getCurrentBlocksByClientId
```

Pass-107 annotated headless stitched video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-107/video/07f8eb5c4218-pass107-annotated.mp4
codec=h264 width=2560 height=1440 duration=21.000000 nb_frames=525 size=398460
```

The PR branch remains the requested three-commit stack on current
`origin/trunk`:

```text
7d46d25263c Add RTC top-level block move unit repro
ec3013fb531 Add RTC top-level block move Playwright repro
248b4348d97 Fix RTC top-level block move reconciliation
```

## Pass 106 update

Pass 106 independently re-read the pass-105 summary, the source JSONL row, the
source generated Playwright spec, source log, source error context, source
screenshots, source trace action events, current PR branch, current explanation
branch, current fix code, and origin history. The classification remains a real
Gutenberg RTC product bug, not a readiness wait, locator failure, malformed
generated spec, environment failure, inverted assertion, or expected behavior.

Pass-106-specific addition: `origin/trunk` advanced to
`5f1ee5529e1c8b50e7ecd35ff022f5b26dc575bb`, and both branches were rebased
onto it. The PR branch is again exactly the requested three-commit stack:

```text
7d46d25263c Add RTC top-level block move unit repro
ec3013fb531 Add RTC top-level block move Playwright repro
248b4348d97 Fix RTC top-level block move reconciliation
```

The source trace confirms the failure is driven by natural user actions. It
records: create the post with heading, moved paragraph, and sibling paragraph;
click the heading; choose block Options -> Delete; click the moved paragraph in
the collaborator; choose Options -> Add before; type the inserted paragraph;
click the moved paragraph in the primary editor; click the toolbar Move down
button. The final error is the convergence check, not an action failure:

```text
primary:      [inserted paragraph, sibling paragraph, moved paragraph]
collaborator: [inserted paragraph, moved paragraph, moved paragraph]
```

Fresh pass-106 negative controls:

```text
current origin/trunk 5f1ee5529e1c8b50e7ecd35ff022f5b26dc575bb
  + 7d46d25263c focused low-level repro:
  WORKTREE_EXIT=0
  CHERRY_EXIT=0
  TEST_EXIT=1
  6 failed, 1 passed, 74 skipped, 81 total

known-fixes base 3cba2b1e56a98787de08dc6c7df2434759e8f908
  + 7d46d25263c focused low-level repro:
  WORKTREE_EXIT=0
  CHERRY_EXIT=0
  TEST_EXIT=1
  3 failed, 4 passed, 78 skipped, 85 total
```

The known-fixes base still reproduces the exact duplicate/drop state:

```text
Expected: ["Inserted paragraph", "Sibling paragraph", "Moved paragraph"]
Received: ["Inserted paragraph", "Moved paragraph", "Moved paragraph"]
```

Fresh pass-106 fixed-branch checks on
`248b4348d978b385d8b45265117dd6a38d74f5bc`:

```text
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath:
  81 passed, 81 total
git diff --check origin/trunk..HEAD:
  exit 0
core-data bundle helper grep:
  found getClientIdReorderRange, replaceYBlockRange, and getCurrentBlocksByClientId
curl http://localhost:9900/wp-json/:
  HTTP/1.1 200 OK
Chromium natural-user Playwright repro:
  1 passed in 22.5s
```

Changed-file JS lint is still blocked before touched-file linting starts
because the shared known-fixes `node_modules` resolves an older
`@wordpress/eslint-plugin` that does not expose the current-trunk
`@wordpress/no-non-module-stylesheet-imports` rule. `npm run build` was also
retried in pass 106; JS and PHP workspace builds completed, then the theme
primitive color token step failed in the shared dependency tree with
`TypeError: [object Object] is not a valid color space` from `colorjs.io`.
These are recorded as environment/tooling drift in the reused shared
dependencies, not as findings in the touched files.

Origin proof remains the same. Commit
`84019935998c16f877e976ad85e84748355d7282` / PR
https://github.com/WordPress/gutenberg/pull/72262 introduced
`packages/core-data/src/utils/crdt-blocks.ts` and its tests. That initial merge
logic used a left/right positional diff and rewrote existing Y.Map/Y.Text
instances by array position. Later array-attribute work reused the same
approach for nested arrays, but the top-level block bug already exists in the
original block merge shape: a same-clientId move can be encoded as sibling
content replacement rather than top-level Y.Array structure. The fix remains
the narrow same-length, unique-clientId reorder detector that rebuilds only the
reordered middle range with Y.Array delete/insert operations and preserves
already-applied peer edits from current CRDT state.

## Pass 105 update

Pass 105 independently re-read the pass-104 summary, the source JSONL row, the
source generated Playwright spec, the source log, the error-context snapshot,
the source screenshots, the current PR branch, the current fix, the current
explanation branch, the pass-104 video, and the origin/root-cause commit. The
classification remains a real Gutenberg RTC product bug, not a readiness wait,
locator problem, malformed generated spec, environment failure, inverted
assertion, or expected behavior.

`origin/trunk` is still `3babe1c1f095d92e8f08aa653dbfbe75b4b13c84`, so the PR
branch remains exactly the requested three-commit stack on current trunk:

```text
6ae2bf9b434 Add RTC top-level block move unit repro
b581819d4bf Add RTC top-level block move Playwright repro
f0e1837c7d1 Fix RTC top-level block move reconciliation
```

Fresh pass-105 fixed-branch checks on
`f0e1837c7d1b732eab793af8d44423786d687e47`:

```text
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath:
  81 passed, 81 total
git diff --check origin/trunk..HEAD:
  exit 0
core-data bundle helper grep:
  found getClientIdReorderRange, replaceYBlockRange, and getCurrentBlocksByClientId
curl http://localhost:9900/wp-json/:
  HTTP/1.1 200 OK
Chromium natural-user Playwright repro:
  1 passed in 22.1s
```

Fresh pass-105 negative controls:

```text
current origin/trunk + 6ae2bf9b434 focused low-level repro:
  TEST_EXIT=1
  6 failed, 1 passed, 74 skipped, 81 total

known-fixes base 3cba2b1e56a98787de08dc6c7df2434759e8f908
  + 6ae2bf9b434 focused low-level repro:
  TEST_EXIT=1
  3 failed, 4 passed, 78 skipped, 85 total
```

The known-fixes base still reproduces the exact duplicate/drop state:

```text
Expected: ["Inserted paragraph", "Sibling paragraph", "Moved paragraph"]
Received: ["Inserted paragraph", "Moved paragraph", "Moved paragraph"]
```

Pass-105-specific addition: I added a temporary operation-shape diagnostic
outside the branch stack. It observes Yjs events for a valid two-paragraph
top-level swap, without malformed blocks or direct state mutation. On current
trunk, the swap preserves both original `Y.Map` identities and emits rich-text
events instead of top-level array structure:

```text
PASS105_OPERATION_SHAPE
{"arrayDeleteInsertEvents":0,"textEvents":2,"mapEvents":2,
 "firstIdentityPreserved":true,"secondIdentityPreserved":true,
 "contents":[
   {"clientId":"sibling-paragraph","content":"Sibling paragraph"},
   {"clientId":"moved-paragraph","content":"Moved paragraph"}
 ]}
```

On the fixed branch, the same diagnostic emits top-level array delete/insert
events and no rich-text/map rewrite events:

```text
PASS105_OPERATION_SHAPE
{"arrayDeleteInsertEvents":2,"textEvents":0,"mapEvents":0,
 "firstIdentityPreserved":false,"secondIdentityPreserved":false,
 "contents":[
   {"clientId":"sibling-paragraph","content":"Sibling paragraph"},
   {"clientId":"moved-paragraph","content":"Moved paragraph"}
 ]}
```

This narrows the root-cause proof: before the fix, a same-clientId top-level
move can look correct locally only because the merge path mutates the sibling
blocks in place. In the source collaborative sequence, the same operation shape
is what lets one peer rewrite the sibling paragraph into a second copy of the
moved paragraph.

Changed-file JS lint was retried and is still blocked by the same shared
`node_modules` tooling mismatch recorded in pass 104:

```text
TypeError: Key "rules": Key "@wordpress/no-non-module-stylesheet-imports":
Could not find "no-non-module-stylesheet-imports" in plugin "@wordpress".
```

## Pass 104 update

Pass 104 re-read the pass-103 summary, source JSONL row, source generated
Playwright spec, source log, source error context, source screenshots, source
trace archive listing, current fix code, current PR branch, and origin
metadata. The classification remains a real Gutenberg RTC product bug, not a
readiness wait, locator problem, malformed generated spec, environment failure,
inverted assertion, or expected behavior.

Pass-104-specific addition: `origin/trunk` advanced to
`3babe1c1f095d92e8f08aa653dbfbe75b4b13c84`, so both branches were rebased.
The PR branch is again exactly the requested three-commit stack on current
trunk:

```text
6ae2bf9b434 Add RTC top-level block move unit repro
b581819d4bf Add RTC top-level block move Playwright repro
f0e1837c7d1 Fix RTC top-level block move reconciliation
```

Fresh pass-104 current-trunk negative control:

```text
origin/trunk 3babe1c1f095d92e8f08aa653dbfbe75b4b13c84
  + 6ae2bf9b434 focused low-level repro:
  WORKTREE_EXIT=0
  CHERRY_EXIT=0
  TEST_EXIT=1
  6 failed, 1 passed, 74 skipped, 81 total
```

This is the new independent pass-104 proof: the bug is still present on the
current upstream trunk before applying the fix, not only in the archived source
run or the older known-fixes base. The current-trunk repro-only failures include
the structural move-shape assertions and stale-snapshot preservation checks:

```text
does not encode top-level block moves as sibling content rewrites
encodes top-level block moves as array operations instead of rich-text rewrites
preserves applied remote rich-text edits when a stale local snapshot reports a top-level move
preserves applied remote rich-text edits on the moved block when a stale local snapshot reports a top-level move
keeps a selected local rich-text edit while preserving remote edits during a top-level move
preserves applied remote primitive attribute edits when a stale local snapshot reports a top-level move
```

Fresh pass-104 known-fixes control:

```text
known-fixes base 3cba2b1e56a98787de08dc6c7df2434759e8f908
  + 6ae2bf9b434 focused low-level repro:
  WORKTREE_EXIT=0
  CHERRY_EXIT=0
  TEST_EXIT=1
  3 failed, 4 passed, 78 skipped, 85 total
```

The known-fixes base still reproduces the exact low-level duplicate/drop state:

```text
Expected: ["Inserted paragraph", "Sibling paragraph", "Moved paragraph"]
Received: ["Inserted paragraph", "Moved paragraph", "Moved paragraph"]
```

Fresh pass-104 fixed-branch verification on rebased PR branch
`f0e1837c7d1b732eab793af8d44423786d687e47`:

```text
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath:
  UNIT_EXIT=0, 81/81 passed
git diff --check origin/trunk..HEAD:
  DIFF_CHECK_EXIT=0
core-data bundle helper grep:
  BUNDLE_GREP_EXIT=0
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900
  /wp-json/ returned HTTP 200 with the REST Link header
  Chromium natural-user Playwright repro:
  FIXED_PLAYWRIGHT_EXIT=0, 1 passed in 22.3s
```

Changed-file JS lint could not be completed after the rebase because this
worktree intentionally uses the shared known-fixes `node_modules` symlink. The
new upstream commit `f6f09ebd0ac` added
`@wordpress/no-non-module-stylesheet-imports`; current `tools/eslint/config.mjs`
expects that rule, but the shared known-fixes `@wordpress/eslint-plugin`
package resolves before the rebased worktree package and does not expose the
rule. A temporary local overlay proved this is tooling drift rather than a
touched-file lint finding, but did not have all current transitive plugin
dependencies. The recorded lint result is therefore a blocked environment
check, while unit, diff-check, REST readiness, bundle-presence, and Playwright
verification passed.

Origin proof was refreshed. GitHub PR
https://github.com/WordPress/gutenberg/pull/72262 is merged, its merge commit
is `84019935998c16f877e976ad85e84748355d7282`, and local `git show` confirms
that commit created the block CRDT merge implementation. The introduced
`mergeCrdtBlocks()` skipped equal left/right edges, then updated existing
`Y.Map`/`Y.Text` instances by array position, using `yblocks.delete()` and
`yblocks.insert()` only for length changes. That is unsafe for same-clientId
top-level moves: the reordered middle is encoded as content replacement on the
old sibling objects, which can duplicate the moved paragraph and drop the
sibling after collaborative structural edits.

The fix plan remains unchanged after pass-104 audit: strictly detect
same-length top-level reorders with unique non-empty clientId sets, preserve
stable prefix/suffix identity, rebuild only the reordered middle range as
Y.Array delete/insert operations, build moved-range blocks from current CRDT
state so already-applied peer edits are not clobbered, and allow only the
selected local rich-text attribute through when the caller can identify it by
cursor. Mixed insert/delete/reorder cases without that strict proof still fall
back to the legacy path.

Pass-104 video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-104/video/07f8eb5c4218-pass104-annotated.mp4
```

`ffprobe` reports H.264, `2560x1440`, 360 frames, 12.0s. Frame inspection shows
the pass-104 overlay, source/fix editor panes inherited from the stitched
recording, source divergence, natural action log, current-trunk negative
control, known-fixes control, fixed-branch verification, root cause,
classification, and residual risk.

## Pass 103 update

Pass 103 independently re-read the pass-102 summary, source JSONL row, source
generated Playwright spec, source log, source error context, source
screenshots, source trace archive listing, current explanation branch, current
PR branch, fix implementation, and origin metadata. The classification remains
a real Gutenberg RTC product bug, not a readiness wait, locator problem,
malformed generated spec, environment failure, inverted assertion, or expected
behavior.

Pass-103-specific addition: I freshly verified that the existing explanation
branch, PR branch, annotated video lineage, and fix still satisfy the requested
standard. `origin/trunk` is still
`ebc3c0a4663d79c5581bf2b94b68531349e96c48`, so the three-commit PR branch is
still based on current trunk:

```text
7987f730397 Add RTC top-level block move unit repro
d8ca5e7c31e Add RTC top-level block move Playwright repro
bbcb4532c44 Fix RTC top-level block move reconciliation
```

Fresh pass-103 known-fixes control:

```text
known-fixes base 3cba2b1e56a98787de08dc6c7df2434759e8f908
  + 7987f730397 focused low-level repro:
  WORKTREE_EXIT=0
  CHERRY_EXIT=0
  TEST_EXIT=1
  3 failed, 4 passed, 78 skipped, 85 total
```

The failing known-fixes tests were again:

```text
does not encode top-level block moves as sibling content rewrites
encodes top-level block moves as array operations instead of rich-text rewrites
keeps peers converged when a top-level move follows remote insertions and deletions
```

The exact low-level duplicate/drop state still appears in the known-fixes
failure:

```text
Expected: ["Inserted paragraph", "Sibling paragraph", "Moved paragraph"]
Received: ["Inserted paragraph", "Moved paragraph", "Moved paragraph"]
```

Fresh pass-103 fixed-branch verification on PR branch
`bbcb4532c444e35ca70f05ca1cfb84bba66e7b19`:

```text
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath:
  EXIT=0, 81/81 passed
npm run lint:js -- changed files:
  EXIT=0
git diff --check origin/trunk..HEAD:
  EXIT=0
core-data bundle helper grep:
  EXIT=0
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900
  /wp-json/ returned HTTP 200 with the REST Link header
  Chromium natural-user Playwright repro:
  EXIT=0, 1 passed in 21.6s
```

Origin proof was also rechecked. GitHub PR
https://github.com/WordPress/gutenberg/pull/72262 is merged, and its merge
commit is `84019935998c16f877e976ad85e84748355d7282`. Local `git show`
confirms that commit created `packages/core-data/src/utils/crdt-blocks.ts` and
`packages/core-data/src/utils/test/crdt-blocks.ts`. The introduced
`mergeCrdtBlocks()` ignored `clientId` for equality, skipped equal left/right
edges, updated existing `Y.Map` instances by position, and used
`yblocks.delete()`/`yblocks.insert()` only for length changes. That remains the
introduction point for same-clientId top-level moves being encoded as sibling
content rewrites.

Pass-103 video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-103/video/07f8eb5c4218-pass103-annotated.mp4
```

`ffprobe` reports H.264, `2560x1440`, 360 frames, 12.0s. Frame inspection shows
the pass-103 overlay, source/fix editor panes inherited from the stitched
recording, source divergence, natural action log, fresh known-fixes control,
fixed-branch verification, root cause, classification, and residual risk.

## Pass 102 update

Pass 102 re-read the pass-101 summary, source JSONL row, generated source
Playwright spec, source log, source error context, screenshots, trace archive
listing, current explanation branch, current PR branch, fix implementation, and
origin metadata. The classification remains a real Gutenberg RTC product bug,
not a readiness wait, locator problem, malformed generated spec, environment
failure, inverted assertion, or expected behavior.

Pass-102-specific addition: I added a temporary diagnostic test in the
known-fixes throwaway worktree after applying the unit repro commit. The
diagnostic observes Yjs events for a pure two-block top-level swap. It showed
that the known-fixes base still emits no top-level `Y.Array` delete/insert
event and instead emits rich-text events:

```text
PASS102_OPERATION_SHAPE
{"arrayDeleteInsertEvents":0,"textEvents":2,"finalContents":["Sibling paragraph","Moved paragraph"]}
```

That is a narrower root-cause proof than checking final content alone: the
local document can appear correctly ordered after a simple swap only because
the positional merge rewrites existing sibling maps and rich-text fields. In
the collaborative fuzz sequence, that same operation shape is what lets one
peer rewrite the sibling into another copy of the moved paragraph.

Fresh pass-102 controls:

```text
origin/trunk ebc3c0a4663d79c5581bf2b94b68531349e96c48
  + 7987f730397 focused low-level repro:
  WORKTREE_EXIT=0
  CHERRY_EXIT=0
  TEST_EXIT=1
  6 failed, 1 passed, 74 skipped

known-fixes base 3cba2b1e56a98787de08dc6c7df2434759e8f908
  + 7987f730397 focused low-level repro:
  WORKTREE_EXIT=0
  CHERRY_EXIT=0
  TEST_EXIT=1
  3 failed, 4 passed, 78 skipped
```

The known-fixes base still fails the structural operation-shape tests and the
content-convergence test:

```text
does not encode top-level block moves as sibling content rewrites
encodes top-level block moves as array operations instead of rich-text rewrites
keeps peers converged when a top-level move follows remote insertions and deletions
```

Fresh pass-102 fixed-branch verification on PR branch
`bbcb4532c444e35ca70f05ca1cfb84bba66e7b19`:

```text
git diff --check origin/trunk..HEAD: EXIT=0
core-data bundle helper grep: EXIT=0
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath:
  EXIT=0, 81/81 passed
npm run lint:js -- changed files:
  EXIT=0
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900
  RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1
  Chromium natural-user Playwright repro:
  EXIT=0, 1 passed in 22.1s
```

`/wp-json/` returned HTTP 200 with the expected REST `Link` header before the
Playwright run, so pass 102 did not hit the pass-101 ignored-build artifact
setup failure.

Origin proof is unchanged and was rechecked with local `git show`, `git blame`,
and GitHub PR metadata. PR
https://github.com/WordPress/gutenberg/pull/72262 merged as
`84019935998c16f877e976ad85e84748355d7282` on 2025-10-14. The merge commit
created `packages/core-data/src/utils/crdt-blocks.ts` and its tests. The
original `mergeCrdtBlocks()` ignored `clientId` in `areBlocksEqual()`, skipped
equal left/right edges, computed `numOfUpdatesNeeded`, then updated existing
`Y.Map` instances by position with `Object.entries(block)`. It only used
`yblocks.delete()` and `yblocks.insert()` for length differences. That is the
introduction point for representing same-clientId top-level moves as sibling
content rewrites.

Pass-102 video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-102/video/07f8eb5c4218-pass102-annotated.mp4
```

## Pass 101 update

Pass 101 independently re-read the pass-100 summary, source JSONL row, source
generated Playwright spec, source log, source error context, source screenshots,
source trace archive listing, current explanation branch, current PR branch,
fix implementation, and origin history. The classification remains a real
Gutenberg RTC product bug.

Pass-101-specific addition: I verified that the existing explanation branch,
PR branch, fix, and annotated video still satisfy the requested standard, and
reran fresh low-level controls against both current `origin/trunk` and the
known-fixes base. Applying only the non-Playwright repro commit
`7987f730397` to `origin/trunk`
`ebc3c0a4663d79c5581bf2b94b68531349e96c48` still fails the focused low-level
tests:

```text
WORKTREE_EXIT=0
CHERRY_EXIT=0
TEST_EXIT=1
6 failed, 1 passed, 74 skipped, 81 total
```

Applying the same repro commit to the known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` still fails the structural move
checks while passing the stale-edit preservation checks:

```text
WORKTREE_EXIT=0
CHERRY_EXIT=0
TEST_EXIT=1
3 failed, 4 passed, 78 skipped, 85 total
```

That confirms the known-fixes base is still not fixed for this bug. It narrows
the unresolved product defect to the same operation-shape issue described in
pass 100: a strict same-clientId top-level reorder is still encoded as
positional Y.Map rewrites rather than a top-level Y.Array delete/insert
reorder.

Fresh pass-101 fixed-branch verification on PR branch
`bbcb4532c444e35ca70f05ca1cfb84bba66e7b19`:

```text
git diff --check origin/trunk..HEAD: EXIT=0
core-data bundle helper grep: EXIT=0
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath:
  EXIT=0, 81/81 passed
npm run lint:js -- changed files:
  EXIT=0
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900
  RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1
  Chromium natural-user Playwright repro:
  EXIT=0, 1 passed in 22.3s
```

The first pass-101 Playwright attempt failed before the test body in global
setup because this ignored build directory was missing generated build
registration files; `/wp-json/` returned a PHP fatal for missing
`gutenberg_override_style()`. Restoring the missing ignored build registration
files from the known-fixes build cache made `/wp-json/` return the expected
WordPress `Link` header, and the rerun passed. The fixed core-data bundles were
checked after the restore and still contained `getClientIdReorderRange`,
`replaceYBlockRange`, and `currentBlocksByClientId`.

Pass-101 video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-101/video/07f8eb5c4218-pass101-annotated.mp4
```

`ffprobe` reports H.264, `2560x1440`, 360 frames, 12.0s. Frame inspection shows
the pass-101 overlay, source/fix editor panes, natural action log, fresh trunk
and known-fixes controls, fixed-branch verification, root cause, and
classification.

## Pass 100 update

Pass 100 re-read the pass-99 summary, source JSONL row, generated source spec,
source log, source error context, source screenshots, source trace archive
listing, current PR branch, current explanation branch, fix implementation, and
origin history. The classification remains a real Gutenberg RTC product bug.

Pass-100-specific addition: I added a narrower low-level robustness check to
the non-Playwright repro commit. The new test proves that the fix can preserve
an already-applied remote edit on the sibling while also allowing the selected
local rich-text edit on the moved block through the reorder path. This covers
the sharpest failure mode of rebuilding a moved range from current CRDT state:
the rebuild must avoid stale snapshot clobbering without dropping the local
edit that caused the sync.

Current PR branch order after folding in the pass-100 test remains exactly:

```text
7987f730397 Add RTC top-level block move unit repro
d8ca5e7c31e Add RTC top-level block move Playwright repro
bbcb4532c44 Fix RTC top-level block move reconciliation
```

Fresh pass-100 fixed-branch verification:

```text
git diff --check origin/trunk..HEAD: EXIT=0
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath:
  EXIT=0, 81/81 passed
npm run lint:js -- changed files:
  EXIT=0
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900
  RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1
  Chromium natural-user Playwright repro:
  EXIT=0, 1 passed in 22.3s
rebuilt core-data bundles contain getClientIdReorderRange,
  replaceYBlockRange, and currentBlocksByClientId
```

Fresh pass-100 low-level controls with the new repro commit:

```text
origin/trunk ebc3c0a4663d79c5581bf2b94b68531349e96c48
  + 7987f730397 focused low-level repro:
  CHERRY_EXIT=0
  TEST_EXIT=1
  6 failed, 1 passed, 74 skipped

known-fixes base 3cba2b1e56a98787de08dc6c7df2434759e8f908
  + 7987f730397 focused low-level repro:
  CHERRY_EXIT=0
  TEST_EXIT=1
  3 failed, 4 passed, 78 skipped
```

The known-fixes split is now even clearer. Current trunk fails both structural
same-clientId move tests and stale-edit preservation tests. The known-fixes
base passes remote rich-text, selected local rich-text, and primitive attribute
preservation, but still fails:

```text
does not encode top-level block moves as sibling content rewrites
encodes top-level block moves as array operations instead of rich-text rewrites
keeps peers converged when a top-level move follows remote insertions and deletions
```

That isolates the unresolved product defect to operation shape: a same-clientId
top-level reorder is still represented as positional Y.Map updates instead of
an array delete/insert reorder.

Fresh pass-100 known-fixes browser control was attempted on a separate port,
but did not reach WordPress startup:

```text
WP_ENV_PORT=9901 WP_BASE_URL=http://localhost:9901 npm run wp-env start
  EXIT=1
  Error response from daemon: all predefined address pools have been fully subnetted
```

The archived source Playwright failure is already from the known-fixes refresh
tree, and the fresh known-fixes low-level control still fails the exact
structural checks, so the known-fixes base remains not fixed.

Origin proof remains commit `84019935998c16f877e976ad85e84748355d7282`
("Improve CRDT \"merge logic\" for post entities", #72262). The commit created
`packages/core-data/src/utils/crdt-blocks.ts` and added the positional
left/right diff. The original implementation explicitly ignored `clientId` in
`areBlocksEqual()`, skipped common edges, computed `numOfUpdatesNeeded`, then
updated existing Y.Map instances by `Object.entries(block)` before doing only
length-based delete/insert. A same-clientId top-level move with no length
change therefore goes through the update path and smears block contents across
existing Yjs identities.

Build note: `npm run build` still fails outside the touched code after the JS
and PHP build phases, in `packages/theme/bin/generate-primitive-tokens`, with
`TypeError: [object Object] is not a valid color space`. Running `wp-build`
directly rebuilt the core-data bundles with the fix present, but the full
package bundling command then failed on missing optional/front-end dependencies
such as `framer-motion`, `react-colorful`, `@emotion/css`, and
`postcss-urlrebase`. The touched unit, lint, bundle-presence, and natural
Playwright checks passed.

## Pass 99 update

Pass 99 independently re-read the pass-98 summary, source JSONL row, source
generated Playwright spec, source log, source error context, source screenshots,
trace archive listing, current explanation branch, current PR branch, the fix
implementation, built bundles, and origin history. The classification remains a
real Gutenberg RTC product bug.

Pass-99-specific addition: I re-ran fresh low-level controls and used the
known-fixes split as a narrower root-cause check. Applying only the
non-Playwright repro commit `f1cec5bf167` to current `origin/trunk`
`ebc3c0a4663d79c5581bf2b94b68531349e96c48` failed 5 of 6 focused tests:

```text
does not encode top-level block moves as sibling content rewrites
encodes top-level block moves as array operations instead of rich-text rewrites
preserves applied remote rich-text edits when a stale local snapshot reports a top-level move
preserves applied remote rich-text edits on the moved block when a stale local snapshot reports a top-level move
preserves applied remote primitive attribute edits when a stale local snapshot reports a top-level move
```

Applying the same repro commit to the known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` still failed the structural move
identity tests:

```text
does not encode top-level block moves as sibling content rewrites
encodes top-level block moves as array operations instead of rich-text rewrites
keeps peers converged when a top-level move follows remote insertions and deletions
```

The known-fixes base did pass the three stale peer rich-text/primitive
attribute preservation tests. That narrows the remaining defect: the bug is not
just generic stale attribute clobbering. The still-broken operation shape is the
same-clientId top-level reorder being encoded as positional `Y.Map` updates
instead of a top-level `Y.Array` delete/insert reorder.

Origin proof remains commit `84019935998c16f877e976ad85e84748355d7282`
("Improve CRDT \"merge logic\" for post entities", #72262). The file did not
exist before that commit, and the original implementation ignored `clientId`
when checking block equality, skipped equal left/right edges, then updated the
remaining middle by position. That is exactly the path that can rewrite the
current sibling block's `Y.Map` with the moved block's content after the fuzz
sequence's delete, add-before, and move-down actions.

Fresh pass-99 fixed-branch verification on PR branch
`7620200b191196bef6a409a5c8a9e893364b38ef`:

```text
git diff --check origin/trunk..HEAD: EXIT=0
built core-data bundles contain getClientIdReorderRange,
  replaceYBlockRange, and currentBlocksByClientId
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath:
  EXIT=0, 80/80 passed
npm run lint:js -- changed files:
  EXIT=0
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900
  RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1
  Chromium natural-user Playwright repro:
  EXIT=0, 1 passed in 21.6s
```

Pass-99 video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-99/video/07f8eb5c4218-pass99-annotated.mp4
```

`ffprobe` reports H.264, `2560x1440`, 360 frames, 12.0s. Frame inspection shows
the pass-99 overlay, the source/fixed editor panes, natural action log,
low-level proof, known-fixes failure, fixed-branch verification, root cause, and
classification.

## Pass 98 update

Pass 98 independently re-read the pass-97 summary, source JSONL row, generated
source spec, source log, source error context, source trace archive, current
explanation branch, current PR branch, fix implementation, origin history, and
browser artifacts. The classification remains a real Gutenberg RTC product bug.

Pass-98-specific addition: I verified that the existing branches, video, and fix
still satisfy the requested standard, and added a narrower origin proof. The
CRDT block merge file did not exist before the introducing commit:

```text
git cat-file -e 84019935998c16f877e976ad85e84748355d7282^:packages/core-data/src/utils/crdt-blocks.ts
  fatal: path 'packages/core-data/src/utils/crdt-blocks.ts' exists on disk, but not in '84019935998c16f877e976ad85e84748355d7282^'
```

Commit `84019935998c16f877e976ad85e84748355d7282` ("Improve CRDT
\"merge logic\" for post entities", #72262) introduced
`packages/core-data/src/utils/crdt-blocks.ts` and the left/right positional
block diff. Current `origin/trunk` still has the same operation shape: when the
same top-level `clientId`s appear in a different order, the old path updates
the integrated `Y.Map` at each position instead of emitting a top-level
`Y.Array` delete/insert. That is the identity bug that duplicates the moved
paragraph and drops the sibling after collaborative structural edits.

Fresh pass-98 low-level controls:

```text
origin/trunk ebc3c0a4663d79c5581bf2b94b68531349e96c48
  + f1cec5bf167 focused low-level repro:
  CHERRY_EXIT=0
  TEST_EXIT=1
  5 failed, 1 passed, 74 skipped

known-fixes base 3cba2b1e56a98787de08dc6c7df2434759e8f908
  + f1cec5bf167 focused low-level repro:
  CHERRY_EXIT=0
  TEST_EXIT=1
  3 failed, 3 passed, 78 skipped
```

Fresh pass-98 fixed-branch verification on PR branch
`7620200b191196bef6a409a5c8a9e893364b38ef`:

```text
git diff --check origin/trunk..HEAD: EXIT=0
built core-data bundles contain getClientIdReorderRange,
  replaceYBlockRange, and currentBlocksByClientId
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath:
  EXIT=0, 80/80 passed
npm run lint:js -- changed files:
  EXIT=0
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900
  RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1
  Chromium natural-user Playwright repro:
  EXIT=0, 1 passed in 25.1s
```

The fixed Playwright trace again shows ordinary editor actions only:

```text
click "Seed 950301 multibyte heading"
click menuitem "Delete"
click "Emoji and multibyte"
click menuitem /^(Add|Insert) before/
keyboard type inserted paragraph text
click "Emoji and multibyte"
click toolbar button "Move down"
```

Pass-98 video:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-98/video/07f8eb5c4218-pass98-annotated.mp4
```

`ffprobe` reports H.264, `2560x1440`, 360 frames, 12.0s. Frame inspection shows
the pass-98 overlay, source/fix editor panes, natural action log, low-level
negative controls, known-fixes failure, fixed-branch verification, root cause,
and classification.

## Pass 97 update

Pass 97 re-read the pass-96 summary, source JSONL row, source generated
Playwright spec, source log, error context, source screenshots, source trace
archive, current explanation branch, current PR branch, unit repros, fixed
implementation, and origin history. The classification remains a real
Gutenberg RTC product bug.

Pass-97-specific addition: the source trace action stream was re-extracted and
used as an independent falsification check. The trace records successful
ordinary editor actions before the corruption:

```text
primary:      click heading, open Block tools Options, click Delete
collaborator: click paragraph, open Block tools Options, click Add before
collaborator: keyboard type "RTC ec47 realistic inserted paragraph 1"
primary:      click paragraph, click toolbar Move down
```

After those calls, the trace sits in convergence polling with stable divergent
block arrays. This narrows the negative classification: the source failure is
not an action locator failure, not an inverted assertion, and not a readiness
wait that happened before the user actions. The divergence is already visible
in the browser state:

```text
primary:      [ inserted paragraph 1, sibling paragraph, moved paragraph ]
collaborator: [ inserted paragraph 1, moved paragraph, moved paragraph ]
```

Fresh pass-97 controls on current `origin/trunk`
`ebc3c0a46634b1b0e435d7e6a4d997c6869a8a71`:

```text
origin/trunk + f1cec5bf167 focused low-level repro:
  CHERRY_EXIT=0
  TEST_EXIT=1
  5 failed, 1 passed, 74 skipped

known-fixes base 3cba2b1e56a98787de08dc6c7df2434759e8f908
  + f1cec5bf167 focused low-level repro:
  CHERRY_EXIT=0
  TEST_EXIT=1
  3 failed, 3 passed, 78 skipped

fixed PR branch 7620200b191:
  git diff --check origin/trunk..HEAD: EXIT=0
  built core-data bundles contain getClientIdReorderRange,
    replaceYBlockRange, and currentBlocksByClientId
  crdt-blocks unit file: EXIT=0, 80/80 passed
  lint changed files: EXIT=0
  natural-user Playwright repro on port 9900: EXIT=0, 1 passed in 24.0s
```

Known-fixes browser rerun note: the source browser artifact is already from the
known-fixes refresh tree and fails with the same inserted/sibling/moved versus
inserted/moved/moved split. A fresh pass-97 attempt to start the known-fixes
wp-env for another browser rerun failed before test execution because Docker
reported:

```text
all predefined address pools have been fully subnetted
```

I did not prune Docker networks during this pass. The fresh known-fixes
low-level failure and the source browser artifact still confirm that the
known-fixes base does not fix this bug.

The pass-97 annotated video overlays the fresh trace and control results on
the existing source/fix visualization:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-97/video/07f8eb5c4218-pass97-annotated.mp4
```

`ffprobe` reports H.264, `2560x1440`, 360 frames, 12.0s. Frame inspection shows
the pass-97 overlay, the original source editor panes, natural action log,
low-level proof, known-fixes failure, fixed-branch verification, root cause,
and classification.

## Pass 96 update

Pass 96 re-read the pass-95 summary, source JSONL row, generated source
Playwright spec, source log, source error context, screenshots, source trace
archive listing, current explanation branch, current PR branch, fix
implementation, low-level repros, and browser artifacts. The classification
remains a real Gutenberg RTC product bug.

Pass-96-specific addition: I freshly verified that the existing explanation
branch, PR branch, fix, and annotated video still satisfy the requested
standard on current `origin/trunk`
`ebc3c0a46634b1b0e435d7e6a4d997c6869a8a71`.

The PR branch is still exactly three commits ahead of trunk:

```text
f1cec5bf167 Add RTC top-level block move unit repro
f3da646c164 Add RTC top-level block move Playwright repro
7620200b191 Fix RTC top-level block move reconciliation
```

Fresh pass-96 low-level controls:

```text
origin/trunk + f1cec5bf167:
  CHERRY_EXIT=0
  TEST_EXIT=1
  5 failed, 1 passed, 74 skipped

known-fixes base 3cba2b1e56a98787de08dc6c7df2434759e8f908 + f1cec5bf167:
  CHERRY_EXIT=0
  TEST_EXIT=1
  3 failed, 3 passed, 78 skipped
```

Fresh pass-96 known-fixes browser control:

```text
WP_BASE_URL=http://localhost:9601 RTC_MANIFEST_WS_START_PORT=20595 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1 --trace=on
```

Result: exit `1` after 42.9s with the same split as the source run:

```text
primary:      [ inserted paragraph 1, sibling paragraph, moved paragraph ]
collaborator: [ inserted paragraph 1, moved paragraph, moved paragraph ]
```

Fresh pass-96 fixed-branch checks on `7620200b191`:

```text
git diff --check origin/trunk..HEAD: EXIT=0
rg build/scripts/core-data packages/core-data/build*: found getClientIdReorderRange, replaceYBlockRange, and currentBlocksByClientId
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath: EXIT=0, 80/80 passed
npm run lint:js -- changed files: EXIT=0
WP_ENV_PORT=9900 ... Chromium natural-user Playwright repro: EXIT=0, 1 passed in 24.5s
```

The pass-96 annotated video overlays those fresh checks on the pass-95 stitched
source/fix evidence:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-96/video/07f8eb5c4218-pass96-reverified-annotated.mp4
```

The pass-96 re-check does not change the root-cause analysis or fix plan. The
bug is still the same structural identity failure: the old same-clientId
top-level move path uses positional `Y.Map` updates rather than top-level
`Y.Array` delete/insert operations, so a stale local move can overwrite a
peer's already-applied edits and duplicate/drop sibling blocks.

## Pass 95 update

Pass 95 independently re-read the pass-94 summary, source JSONL row, generated
source Playwright spec, source log, source error context, screenshots, source
trace archive listing, current explanation branch, current PR branch,
`crdt-blocks` code, built core-data bundles, and the source/known-fixes/fixed
test artifacts. The classification remains a real Gutenberg RTC product bug.

Pass-95-specific addition: I added a low-level repro proving the same stale
top-level move failure can erase a peer edit to a primitive block attribute,
independent of the rich-text merge code:

```text
preserves applied remote primitive attribute edits when a stale local snapshot reports a top-level move
```

Applying only the updated non-Playwright repro commit
`f1cec5bf167` to current `origin/trunk`
`ebc3c0a46634b1b0e435d7e6a4d997c6869a8a71` in
`/private/tmp/gutenberg-07f8-pass95-trunk-testonly.MRTKtO/repo` exits `1`.
The new proof fails as:

```text
expected "https://example.com/sibling-remote.jpg"
received "https://example.com/sibling.jpg"
```

The broader focused repro set on current trunk fails five focused proofs:

```text
does not encode top-level block moves as sibling content rewrites
encodes top-level block moves as array operations instead of rich-text rewrites
preserves applied remote rich-text edits when a stale local snapshot reports a top-level move
preserves applied remote rich-text edits on the moved block when a stale local snapshot reports a top-level move
preserves applied remote primitive attribute edits when a stale local snapshot reports a top-level move
```

Applying the same updated repro commit to the known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` in
`/private/tmp/gutenberg-07f8-pass95-knownfix-testonly.lM80f3/repo` also exits
`1` for the broader focused set. That base happens to pass the new primitive
attribute subcase, but still fails the operation-shape guards and the exact
two-doc collaborative structural edit repro:

```text
does not encode top-level block moves as sibling content rewrites:
  yblocks.get(0) is still the original integrated Y.Map after the move
encodes top-level block moves as array operations instead of rich-text rewrites:
  expected true, received false
keeps peers converged when a top-level move follows remote insertions and deletions:
  received [ "Inserted paragraph", "Moved paragraph", "Moved paragraph" ]
```

Fresh pass-95 known-fixes browser repro:

```text
WP_BASE_URL=http://localhost:9601 RTC_MANIFEST_WS_START_PORT=20595 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=.../pass-95/knownfix-output npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: exit `1` after 43.9s with the same split as the source run:

```text
primary:   [ inserted paragraph 1, sibling paragraph, moved paragraph ]
secondary: [ inserted paragraph 1, moved paragraph, moved paragraph ]
```

The PR branch remains in exactly the requested three-commit order:

```text
f1cec5bf167 Add RTC top-level block move unit repro
f3da646c164 Add RTC top-level block move Playwright repro
7620200b191 Fix RTC top-level block move reconciliation
```

Fresh pass-95 fixed-branch checks on `7620200b191`:

```text
git diff --check origin/trunk..HEAD: EXIT=0
rg build/scripts/core-data packages/core-data/build*: found getClientIdReorderRange, replaceYBlockRange, and currentBlocksByClientId
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath: EXIT=0, 80/80 passed
npm run lint:js -- changed files: EXIT=0
WP_ENV_PORT=9900 ... Chromium natural-user Playwright repro: EXIT=0, 1 passed in 22.2s
```

Pass 95 did not change the fix plan. The additional primitive-attribute proof
supports the existing root cause: the positional merge path encodes a
same-clientId top-level move as in-place content replacement on whatever
integrated Y.Map happens to occupy the index, so the failure is a structural
identity bug rather than a paragraph/rich-text-only bug.

## Pass 94 update

Pass 94 re-read the pass-93 summary, source JSONL row, generated source
Playwright spec, source log, source error context, screenshots, source trace
archive, current PR branch, explanation branch, `crdt-blocks` implementation,
local history/blame, and GitHub metadata for #72262. The classification remains
a real Gutenberg RTC product bug.

Pass-94-specific addition: I added a stronger low-level proof to the unit repro
commit. Earlier passes proved that a stale local top-level move can erase a peer
edit on the sibling. The new test proves the same failure mode for the moved
block itself:

```text
preserves applied remote rich-text edits on the moved block when a stale local snapshot reports a top-level move
```

Applying only the updated unit repro commit
`b75390399d26f2787cef63b631a8d13b8f836628` to current `origin/trunk`
`ebc3c0a46634b1b0e435d7e6a4d997c6869a8a71` in
`/private/tmp/gutenberg-07f8-pass94-trunk-testonly.rwzNfM` exits `1`.
Current trunk now fails four focused proofs:

```text
does not encode top-level block moves as sibling content rewrites:
  yblocks.get(0) is still the original integrated Y.Map after the move
encodes top-level block moves as array operations instead of rich-text rewrites:
  expected true, received false
preserves applied remote rich-text edits when a stale local snapshot reports a top-level move:
  expected "Sibling paragraph with remote edit"
  received "Sibling paragraph"
preserves applied remote rich-text edits on the moved block when a stale local snapshot reports a top-level move:
  expected "Moved paragraph with remote edit"
  received "Moved paragraph"
```

Applying the same updated unit repro commit to the known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` in
`/private/tmp/gutenberg-07f8-pass94-knownfix-testonly.78iafN` also exits `1`.
That base still fails the operation-shape guards and the exact two-doc
collaborative structural edit repro:

```text
[ "Inserted paragraph", "Moved paragraph", "Moved paragraph" ]
```

The PR branch was rewritten back into exactly the requested three-commit order:

```text
b75390399d2 Add RTC top-level block move unit repro
1f2fe1c1cb2 Add RTC top-level block move Playwright repro
70bb670cb76 Fix RTC top-level block move reconciliation
```

Fresh pass-94 fixed-branch checks on
`70bb670cb762928e22bd4c4906bf16e9b59d3e24`:

```text
git diff --check origin/trunk..HEAD: EXIT=0
rg build/scripts/core-data: found getClientIdReorderRange and replaceYBlockRange
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath: EXIT=0, 79/79 passed
npm run lint:js -- changed files: EXIT=0
WP_ENV_PORT=9900 ... Chromium natural-user Playwright repro: EXIT=0, 1 passed in 25.0s
```

The source trace was re-extracted in pass 94 and still records only normal
editor actions before the corruption:

```text
primary:      click "Seed 950301 multibyte heading"
primary:      click toolbar "Options"
primary:      click menuitem "Delete"
collaborator: click "Emoji and multibyte"
collaborator: click toolbar "Options"
collaborator: click menuitem "Add before"
collaborator: keyboardType "RTC ec47 realistic inserted paragraph 1"
primary:      click "Emoji and multibyte"
primary:      click toolbar "Move down"
```

The pass-94 annotated headless stitched video is:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-94/video/07f8eb5c4218-pass94-annotated.mp4
```

`ffprobe` reports H.264, `2560x1440`, 30 fps, 12.03s. Frame inspection of the
pass-94 still frame confirms both source editor panes, trace-derived natural
action log, pass-94 moved-block stale-edit proof, trunk and known-fixes negative
controls, fixed-branch checks, origin note, and expected final order are
visible.

Origin metadata was refreshed with the GitHub connector. #72262 remains merged:

```text
https://github.com/WordPress/gutenberg/pull/72262
84019935998c16f877e976ad85e84748355d7282 Improve CRDT "merge logic" for post entities (#72262)
merged_at=2025-10-14T17:38:19Z
changed_files=13 additions=1526 deletions=97
```

The origin analysis is unchanged but now has a narrower stale-edit proof. The
positional merge introduced by #72262 still treats same-clientId top-level
reorders as in-place updates to existing Y.Map objects. That can rewrite the
block at index 0 from the moved paragraph into the sibling, and rewrite the
block at index 1 from the sibling into the moved paragraph. A stale local
snapshot therefore can erase either a peer edit on the sibling or a peer edit
on the moved block.

## Pass 93 update

Pass 93 independently re-read the pass-92 summary, source JSONL row, generated
source Playwright spec, source log, source error context, screenshots, trace
archive, current explanation branch, current PR branch, `crdt-blocks` code,
local history/blame, and GitHub metadata for #72262. The classification remains
a real Gutenberg RTC product bug.

Pass-93-specific addition: I freshly verified that the existing branch, built
browser bundle, video standard, and fix still satisfy the requested standard on
current `origin/trunk` `ebc3c0a46634b1b0e435d7e6a4d997c6869a8a71`, instead of
relying on pass-92 artifacts.

The source run still rules out harness explanations. Re-extracting both page
trace streams from the source `trace.zip` records only normal editor actions
before the failure:

```text
primary:      click "Seed 950301 multibyte heading"
primary:      click toolbar "Options"
primary:      click menuitem "Delete"
collaborator: click "Emoji and multibyte"
collaborator: click toolbar "Options"
collaborator: click menuitem "Add before"
collaborator: keyboardType "RTC ec47 realistic inserted paragraph 1"
primary:      click "Emoji and multibyte"
primary:      click toolbar "Move down"
```

The failure then occurs in the convergence comparator after a 20s stable
divergence:

```text
primary:      [ inserted, sibling, moved ]
collaborator: [ inserted, moved, moved ]
```

Fresh pass-93 low-level negative controls:

```text
current trunk test-only worktree:
/private/tmp/gutenberg-07f8-pass93-trunk-testonly.PHfpla
CHERRY_EXIT=0
TEST_EXIT=1
3 failed, 2 passed, 73 skipped

known-fixes base test-only worktree:
/private/tmp/gutenberg-07f8-pass93-knownfix-testonly.Zy5y9s
CHERRY_EXIT=0
TEST_EXIT=1
3 failed, 2 passed, 77 skipped
```

Current trunk still fails the operation-shape and stale-snapshot proof:

```text
does not encode top-level block moves as sibling content rewrites:
  yblocks.get(0) is still the original integrated Y.Map after the move
encodes top-level block moves as array operations instead of rich-text rewrites:
  expected true, received false
preserves applied remote rich-text edits when a stale local snapshot reports a top-level move:
  expected "Sibling paragraph with remote edit"
  received "Sibling paragraph"
```

The known-fixes base still fails the operation-shape guards and the exact
two-doc collaborative structural edit repro:

```text
received [ "Inserted paragraph", "Moved paragraph", "Moved paragraph" ]
```

Fresh pass-93 fixed-branch checks on
`fa6f46fcdc78a897eb14e659fa020275f7949180`:

```text
git diff --check origin/trunk..HEAD: EXIT=0
rg build/scripts/core-data: found getClientIdReorderRange and replaceYBlockRange
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath: EXIT=0, 78/78 passed
npm run lint:js -- changed files: EXIT=0
WP_ENV_PORT=9900 ... Chromium natural-user Playwright repro: EXIT=0, 1 passed in 23.0s
```

Pass 93 also refreshed origin metadata. Local `git log`/`git show` and GitHub
metadata continue to identify the introducing PR and merge commit as:

```text
https://github.com/WordPress/gutenberg/pull/72262
84019935998c16f877e976ad85e84748355d7282 Improve CRDT "merge logic" for post entities (#72262)
merged_at=2025-10-14T17:38:19Z
```

`git blame origin/trunk -- packages/core-data/src/utils/crdt-blocks.ts` still
anchors the top-level left/right positional merge loop and in-place update loop
to that merge commit. Later RTC commits improved text and nested attribute
handling, but the relevant top-level behavior remained: when the same clientIds
appear at different top-level indexes, the generic update loop rewrites the
integrated Y.Map at the existing position instead of emitting a top-level
Y.Array delete/insert for the moved block range.

The pass-93 annotated headless stitched video is:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-93/video/07f8eb5c4218-pass93-annotated.mp4
```

`ffprobe` reports H.264, `2560x1360`, 30 fps, 12.03s. Frame inspection of the
pass-93 still frame confirms both source panes, the trace action log, fresh
negative controls, fixed branch checks, origin note, and expected final order
are visible.

## Pass 92 update

Pass 92 re-read the pass-91 summary, source JSONL row, generated source
Playwright spec, source log, error context, screenshots, trace archive, current
PR branch, explanation branch, `crdt-blocks` implementation, and local
history/blame. The classification remains a real Gutenberg RTC product bug.

Pass-92-specific addition: I extracted the source Playwright trace actions
directly with `jq`, independent of the generated spec text. The recorded user
actions before corruption are ordinary editor operations:

```text
primary:      click "Seed 950301 multibyte heading"
primary:      click toolbar "Options"
primary:      click menuitem "Delete"
collaborator: click "Emoji and multibyte"
collaborator: click toolbar "Options"
collaborator: click menuitem "Add before"
collaborator: keyboardType "RTC ec47 realistic inserted paragraph 1"
primary:      click "Emoji and multibyte"
primary:      click toolbar "Move down"
```

That trace-level route rules out the remaining harness explanations more
directly than the spec text alone: the failing run reached the intended toolbar
and keyboard actions and then timed out only while comparing two stable,
divergent block trees.

Fresh pass-92 low-level negative controls still fail. Applying only the
low-level repro commit `fe85d7a4555` to current `origin/trunk`
`ebc3c0a46634b1b0e435d7e6a4d997c6869a8a71` in
`/private/tmp/gutenberg-07f8-pass92-trunk-testonly.g6bnC9` exits `1`:

```text
does not encode top-level block moves as sibling content rewrites:
  yblocks.get(0) is still the original integrated Y.Map after the move
encodes top-level block moves as array operations instead of rich-text rewrites:
  expected a top-level Y.Array delete/insert delta, received false
preserves applied remote rich-text edits when a stale local snapshot reports a top-level move:
  expected "Sibling paragraph with remote edit"
  received "Sibling paragraph"
```

Applying the same repro commit to the known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` in
`/private/tmp/gutenberg-07f8-pass92-knownfix-testonly.wwVxqv` also exits `1`.
It still fails the operation-shape guards and the exact two-doc corruption
repro:

```text
[ "Inserted paragraph", "Moved paragraph", "Moved paragraph" ]
```

Fresh fixed-branch checks on
`fa6f46fcdc78a897eb14e659fa020275f7949180`:

```text
git diff --check origin/trunk..HEAD: EXIT=0
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath: EXIT=0, 78/78 passed
npm run lint:js -- changed files: EXIT=0
WP_ENV_PORT=9900 ... Chromium natural-user Playwright repro: EXIT=0, 1 passed in 22.8s
```

The first pass-92 Playwright fixed-branch rerun failed with the old
inserted/moved/moved state because I had restored `build/` from the known-fixes
base before rebuilding. `npx wp-build --help` then behaved as a build command,
rebuilt `build/scripts/core-data`, and stopped later on unrelated missing package dependencies
(`framer-motion`, `react-colorful`, `@emotion/css`, and `postcss-urlrebase`);
after confirming the rebuilt `build/scripts/core-data/index.js` contained
`getClientIdReorderRange`, the same headless Chromium natural-action repro
passed.

The pass-92 annotated headless stitched video is:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-92/video/07f8eb5c4218-pass92-annotated.mp4
```

`ffprobe` reports H.264, `2560x1320`, 30 fps, 12.03s. Frame inspection shows
both source editor panes, the trace-derived natural action log, the bad
primary/collaborator orders, the fresh pass-92 trunk and known-fixes negative
controls, and the fixed branch unit/lint/e2e results.

## Pass 91 update

Pass 91 independently re-read the pass-90 summary, source JSONL row, generated
source Playwright spec, source log, source error context, source screenshots,
source trace archive, the current explanation branch, the current PR branch,
`crdt-blocks` code, local history/blame, and GitHub metadata for #72262. The
classification remains a real product bug.

Pass-91-specific addition: I freshly verified that the existing branch, video,
and fix still satisfy the requested standard on unchanged current `origin/trunk`
`ebc3c0a46634b1b0e435d7e6a4d997c6869a8a71`, rather than relying on the
previous pass.

Applying only the low-level repro commit to current trunk in
`/private/tmp/gutenberg-07f8-pass91-trunk-testonly.3x3xvB` exits `1`. Current
trunk still fails the narrower root-cause proof:

```text
does not encode top-level block moves as sibling content rewrites:
  yblocks.get(0) is still the original integrated Y.Map after the move
encodes top-level block moves as array operations instead of rich-text rewrites:
  expected a top-level Y.Array delete/insert delta, received false
preserves applied remote rich-text edits when a stale local snapshot reports a top-level move:
  expected "Sibling paragraph with remote edit"
  received "Sibling paragraph"
```

Applying the same repro commit to the known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` in
`/private/tmp/gutenberg-07f8-pass91-knownfix-testonly.kifYNx` also exits `1`;
the known-fixes base still fails the operation-shape guards and the exact
two-doc convergence repro, producing:

```text
[ "Inserted paragraph", "Moved paragraph", "Moved paragraph" ]
```

Fresh pass-91 fixed-branch checks passed:

```text
git diff --check origin/trunk..HEAD: EXIT=0
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath: EXIT=0, 78/78 passed
npm run lint:js -- changed files: EXIT=0
WP_ENV_PORT=9900 ... npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1 --trace=on: EXIT=0, 1 passed in 24.9s
```

The source trace and screenshots still show a natural user path: primary deletes
the heading through the block toolbar menu, the collaborator inserts a paragraph
before the moved paragraph through the toolbar menu and keyboard typing, and
the primary moves the paragraph down through the toolbar Move down button. The
20s convergence failure reports stable divergent block trees, not a readiness
wait, action locator error, malformed generated spec, environment failure,
inverted assertion, or expected behavior.

The pass-91 annotated headless stitched video is:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-91/video/07f8eb5c4218-pass91-annotated.mp4
```

`ffprobe` reports H.264, `2560x1260`, 30 fps, 12.03s. Frame inspection shows
both source editor panes, the natural action log, the bad primary/collaborator
orders, the pass-91 trunk and known-fixes negative controls, and the fixed
branch unit/lint/e2e results.

## Pass 90 update

Pass 90 re-read the pass-89 summary, source JSONL row, generated source
Playwright spec, source error context, screenshots, source trace action
records, current PR branch, explanation branch, `crdt-blocks` implementation,
local history/blame, and GitHub metadata for #72262. The classification remains
a real product bug.

Pass-90-specific addition: I rebased the three-commit PR branch on current
`origin/trunk` `ebc3c0a46634b1b0e435d7e6a4d997c6869a8a71` and reran the
negative and positive controls. The required PR branch order is now:

```text
fe85d7a4555 Add RTC top-level block move unit repro
3dc22ea8b5a Add RTC top-level block move Playwright repro
fa6f46fcdc7 Fix RTC top-level block move reconciliation
```

Applying only the low-level repro commit to current trunk in
`/private/tmp/gutenberg-07f8-pass90-trunk-testonly.klsRl2` exits `1`.
Current trunk still fails the narrower root-cause proof:

```text
does not encode top-level block moves as sibling content rewrites:
  yblocks.get(0) is still the original integrated Y.Map after the move
encodes top-level block moves as array operations instead of rich-text rewrites:
  expected a top-level Y.Array delete/insert delta, received false
preserves applied remote rich-text edits when a stale local snapshot reports a top-level move:
  expected "Sibling paragraph with remote edit"
  received "Sibling paragraph"
```

The exact two-doc insert/delete/move text repro now passes on current trunk, so
pass 90 relies on the narrower operation-shape and stale-snapshot failures as
the independent proof that the same top-level move bug is still unresolved
there. Applying the same repro commit to the known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` in
`/private/tmp/gutenberg-07f8-pass90-knownfix-testonly.byFUBQ` also exits `1`;
the known-fixes base still fails the operation-shape guards and the exact
two-doc convergence repro, producing:

```text
[ "Inserted paragraph", "Moved paragraph", "Moved paragraph" ]
```

Fresh pass-90 fixed-branch checks passed after the rebase:

```text
git diff --check origin/trunk..HEAD: EXIT=0
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath: EXIT=0, 78/78 passed
npm run lint:js -- changed files: EXIT=0
WP_ENV_PORT=9900 ... npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1 --trace=on: EXIT=0, 1 passed
```

The source trace still records ordinary user-level editor actions before the
failure: primary clicks the heading and deletes it through the block toolbar
menu, the collaborator clicks the moved paragraph and uses Add before plus
keyboard typing, and the primary clicks the moved paragraph and uses the toolbar
Move down button. The failure remains a stable divergent block tree, not a
readiness wait, locator/action error, malformed generated spec, environment
failure, inverted assertion, or expected behavior.

The pass-90 annotated headless stitched video is:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-90/video/07f8eb5c4218-pass90-annotated.mp4
```

`ffprobe` reports H.264, `2560x1220`, 30 fps, 12.03s. Frame inspection shows
both source editor panes, the natural action log, the bad primary/collaborator
orders, and the pass-90 trunk/known-fixes/fixed-branch verification results.

## Pass 89 update

Pass 89 independently re-read the pass-88 summary, source JSONL row, generated
source Playwright spec, source error context, source trace action records,
source screenshots, current PR branch, explanation branch, `crdt-blocks` code,
local history/blame, and GitHub metadata for #72262. The classification remains
a real product bug, and the existing three-commit PR branch still satisfies the
requested standard.

Pass-89-specific addition: I refreshed the negative and positive controls on
current `origin/trunk` `4425c07cbc701bb57acc5fa65aabeb256b5285db` and
known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908`. Applying only the
low-level repro commit to current trunk in
`/private/tmp/gutenberg-07f8-pass89-trunk-testonly.mf6QGR` exits `1`: the
operation-shape tests still prove that a top-level move is encoded as in-place
sibling content rewrites, and the stale-snapshot test still drops a remote
rich-text edit. Applying the same test-only commit to the known-fixes base in
`/private/tmp/gutenberg-07f8-pass89-knownfix-testonly.V8tgpA` also exits `1`:
the operation-shape tests fail, and the exact two-doc collaborative structural
edit repro still produces:

```text
[ "Inserted paragraph", "Moved paragraph", "Moved paragraph" ]
```

Fresh pass-89 fixed-branch checks passed: `git diff --check origin/trunk..HEAD`,
the full `packages/core-data/src/utils/test/crdt-blocks.ts` unit file (`78/78`),
focused JS lint over all changed files, and the headless Chromium natural-user
Playwright repro on `WP_ENV_PORT=9900` (`1 passed`, 21.9s).

The source trace action records again show only normal editor actions before
the state divergence: primary deletes the heading through the block toolbar,
the collaborator inserts a paragraph before the moved paragraph through the
toolbar menu and keyboard typing, and the primary uses the toolbar Move down
button. The source failure remains stable content corruption, not a readiness
wait, locator/action failure, malformed generated spec, environment failure,
inverted assertion, or expected behavior.

The pass-89 annotated headless stitched video is:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-89/video/07f8eb5c4218-pass89-annotated.mp4
```

`ffprobe` reports H.264, `2560x1220`, 30 fps, 12.03s. Frame inspection shows
both editor panes, the natural action log, expected order, observed
known-fixes/source split, and pass-89 verification results.

## Pass 88 update

Pass 88 re-read the pass-87 summary, source JSONL row, generated source
Playwright spec, source error context, source screenshots, source trace archive,
current PR branch, explanation branch, `crdt-blocks` code, local history/blame,
and GitHub metadata for #72262. The classification remains a real product bug.

Pass-88-specific addition: I added a narrower root-cause proof and a fresh
browser-level known-fixes negative control. Applying only the low-level repro
commit to current `origin/trunk`
`4425c07cbc701bb57acc5fa65aabeb256b5285db` in
`/private/tmp/gutenberg-07f8-pass88-trunk-testonly.F5KnjO` exits `1`. The first
new operation-shape test fails because `yblocks.get(0)` is still the exact
integrated `Y.Map` object captured before the move, but that object now
serializes as the sibling paragraph:

```text
expect( yblocks.get( 0 ) ).not.toBe( originalFirstBlock )
Expected: not {"attributes":{"content":"Sibling paragraph"},"clientId":"sibling-paragraph",...}
```

That is the direct local proof of the defect: the old positional sweep does not
represent the top-level move as a structural `Y.Array` change. It rewrites the
existing block map in place, so the old moved paragraph slot becomes the sibling
paragraph. The companion observer test also fails because no top-level
delete/insert array operation is emitted, and the stale-snapshot test shows a
remote rich-text edit being overwritten.

The known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` still fails at both levels. The
low-level test-only worktree
`/private/tmp/gutenberg-07f8-pass88-knownfix-testonly.e6hLbO` exits `1` and
reproduces the exact two-doc bad state:

```text
[ "Inserted paragraph", "Moved paragraph", "Moved paragraph" ]
```

I also reran the archived realistic browser spec against an already-running
known-fixes shard at `http://localhost:9601` with
`RTC_EC47_ATTEMPTS=1`. It exits `1` and records the same split as the original
source failure:

```text
primary:      [ inserted, sibling, moved ]
collaborator: [ inserted, moved, moved ]
```

Fresh pass-88 fixed-branch checks passed on the existing three-commit PR branch:

```text
1c9be0db488 Add RTC top-level block move unit repro
d5525115650 Add RTC top-level block move Playwright repro
ade22ab5255 Fix RTC top-level block move reconciliation
```

The full `packages/core-data/src/utils/test/crdt-blocks.ts` unit file passes
`78/78`, focused JS lint over the changed source/test files exits `0`, and the
headless Chromium natural-user Playwright repro passes twice on
`WP_ENV_PORT=9900`. A full `npm run build` completed its JS and PHP bundle
steps but then failed in unrelated primitive color token generation with
`TypeError: [object Object] is not a valid color space`; no RTC or changed file
was implicated.

The fix plan remains the revised narrow plan: detect reorder-only top-level
block updates when both sides have unique non-empty matching clientId sets,
replace only the differing middle range structurally, rebuild that range from
current CRDT state to avoid clobbering peer edits, preserve stable prefix/suffix
Y objects, and allow only the selected local rich-text attribute through when a
move and edit occur in the same update. This keeps the implementation local and
linear, avoids a general move/LCS engine, and falls back to the existing merge
path when the proof of a pure reorder is absent.

The pass-88 audit did not change the fix. Kernel-maintainer review favors the
strict preconditions, small write surface, and fallback path. Jepsen-style
review favors rebuilding moved blocks from already-merged CRDT state so stale
local snapshots cannot erase peer edits. Dan-Luu-style review favors the O(n)
middle-range replacement over a broader move engine with more edge cases and
larger constant factors.

Origin analysis is unchanged. `84019935998c16f877e976ad85e84748355d7282`
(`Improve CRDT "merge logic" for post entities`, #72262) introduced
`packages/core-data/src/utils/crdt-blocks.ts` and its positional left/right
block sweep on 2025-10-14. GitHub metadata for #72262 says it recursively
inspected `blocks` and represented block data with Y.js shared types; that new
custom merge path never separated same-clientId top-level reorders from
same-position content edits. Later rich-text/table fixes adjusted nested
attributes, but the top-level positional sweep remained capable of encoding a
move as sibling content rewrites until the PR branch fix.

## Pass 87 update

Pass 87 independently re-read the pass-86 summary, source JSONL row, generated
source Playwright spec, source error context, screenshots, trace archive, the
current PR branch, the explanation branch, the video artifact, relevant
`crdt-blocks` code, local Git history/blame, and GitHub PR metadata for
#72262. The classification remains a real product bug.

Pass-87-specific addition: I freshly verified that the existing PR branch,
video, and fix already satisfy the requested standard on current
`origin/trunk` `4425c07cbc701bb57acc5fa65aabeb256b5285db`. The branch remains
exactly three commits ahead of trunk:

```text
1c9be0db488 Add RTC top-level block move unit repro
d5525115650 Add RTC top-level block move Playwright repro
ade22ab5255 Fix RTC top-level block move reconciliation
```

Applying only the low-level repro commit to current trunk in
`/private/tmp/gutenberg-07f8-pass87-trunk-testonly.pHypOS` exits `1`. Current
trunk still fails the narrow operation-shape and stale-snapshot proofs:

```text
does not encode top-level block moves as sibling content rewrites:
  yblocks.get(0) is still the original first Y.Map
encodes top-level block moves as array operations instead of rich-text rewrites:
  observed top-level Y.Array delete/insert is false
preserves applied remote rich-text edits when a stale local snapshot reports a top-level move:
  expected "Sibling paragraph with remote edit"
  received "Sibling paragraph"
```

Applying the same repro commit to known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` in
`/private/tmp/gutenberg-07f8-pass87-knownfix-testonly.Fl4bUp` also exits `1`.
The known-fixes base still fails the operation-shape guards and the exact
two-doc convergence repro:

```text
[ "Inserted paragraph", "Moved paragraph", "Moved paragraph" ]
```

Fresh pass-87 fixed-branch checks passed: `git diff --check
origin/trunk..HEAD`, the full `packages/core-data/src/utils/test/crdt-blocks.ts`
unit file (`78/78`), focused JS lint over all changed files, and the headless
Chromium natural-user Playwright repro on `WP_ENV_PORT=9900` (`1 passed`,
20.7s). The source trace again records only normal editor actions before the
failure: delete heading, collaborator inserts before the paragraph, primary
moves the paragraph down, then the convergence check sees
`primary=[inserted,sibling,moved]` and
`collaborator=[inserted,moved,moved]`.

The annotated headless video was reverified with `ffprobe`, `ffmpeg`, `sips`,
and frame inspection: H.264, `2560x900`, 30 fps, 360 frames, 12.0s, with both
editor panes, the natural-action summary, expected primary order, and
collaborator duplicate-moved-paragraph result visible.

Local blame still anchors the positional `mergeCrdtBlocks()` sweep to
`84019935998c16f877e976ad85e84748355d7282`, `Improve CRDT "merge logic" for
post entities (#72262)`. GitHub metadata confirms that PR merged on
2025-10-14, changed 13 files, and introduced the recursive block/Y.js merge
logic for post entities. Later commits adjusted rich-text and attribute
handling, but the failing positional top-level block sweep remained until the
pass-87 PR branch fix.

## Pass 86 update

Pass 86 re-read the pass-85 summary, source JSONL row, generated realistic
Playwright spec, source error context, source screenshots, source trace archive,
current PR branch, explanation branch, video artifact, `crdt-blocks` code, and
Git/GitHub origin metadata. The classification remains a real product bug.

Pass-86-specific addition: I refreshed the negative controls on the current
`origin/trunk` after it advanced to
`4425c07cbc701bb57acc5fa65aabeb256b5285db`, and then rebased both branches on
that trunk. Applying only the low-level repro commit to current trunk in
`/private/tmp/gutenberg-07f8-pass86-trunk-testonly.Ba8X3p` exits `1`. The old
merge path still:

```text
keeps the same integrated Y.Map at the moved index
emits no top-level Y.Array delete/insert operation
reverts "Sibling paragraph with remote edit" to "Sibling paragraph"
```

Applying the same repro commit to known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` in
`/private/tmp/gutenberg-07f8-pass86-knownfix-testonly.I4f1zB` also exits `1`.
The known-fixes base still fails the operation-shape guards and the exact
two-doc convergence repro:

```text
[ "Inserted paragraph", "Moved paragraph", "Moved paragraph" ]
```

I also attempted a fresh isolated natural-action Playwright negative repro
against current trunk with only the unit and Playwright repro commits applied in
`/private/tmp/gutenberg-07f8-pass86-trunk-playwright.w8hzds`. That setup was
blocked before test execution by local Docker capacity, not by the product or
test:

```text
Error response from daemon: all predefined address pools have been fully subnetted
```

I inspected Docker networks and removed none, because every `wp-env` network on
the host had live containers. I did not stop unrelated running environments.

The fixed PR branch is now rebased onto current `origin/trunk` and still has
the required three commits:

```text
1c9be0db488 Add RTC top-level block move unit repro
d5525115650 Add RTC top-level block move Playwright repro
ade22ab5255 Fix RTC top-level block move reconciliation
```

Fresh pass-86 fixed-branch checks passed: `git diff --check
origin/trunk..HEAD`, the full `packages/core-data/src/utils/test/crdt-blocks.ts`
unit file (`78/78`), focused JS lint over all changed files, and the headless
Chromium natural-user Playwright repro on `WP_ENV_PORT=9900` (`1 passed`,
20.9s). The annotated headless video was reverified with `ffprobe`, `ffmpeg`,
`sips`, and frame inspection: H.264, `2560x900`, 30 fps, 360 frames, 12.0s,
with both editor panes, the natural-action summary, expected primary order, and
collaborator duplicate-moved-paragraph result visible.

## Pass 85 update

Pass 85 independently re-read the pass-84 summary, source JSONL row, source
error context, source screenshots, source trace archive, source generated
realistic Playwright spec, current PR branch commits, current explanation
branch, video artifact, relevant `crdt-blocks` code, and Git/GitHub origin
metadata. The classification remains a real product bug.

Pass-85-specific addition: I regenerated a compact action log directly from
the archived Playwright `test.trace`, rather than relying on the prior extracted
file. It records only normal editor/user actions before the failing convergence
wait:

```text
primary:      click heading, toolbar Options, menuitem Delete
collaborator: click moved paragraph, toolbar Options, menuitem Add before, type inserted paragraph
primary:      click moved paragraph, toolbar Move down
```

The extracted pass-85 trace log is:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-85/logs/07f8-pass85-source-test-trace-user-actions.tsv
```

The same trace's final error records stable state corruption, not a readiness
wait, locator failure, malformed generated spec, environment failure, inverted
assertion, or expected behavior:

```text
primary:      [ inserted, sibling, moved ]
collaborator: [ inserted, moved, moved ]
```

Fresh pass-85 controls again confirm the bug is not fixed by current trunk or
the known-fixes base. Applying only repro commit `ef47db4b57f` to current
`origin/trunk` `369e71ec725855b95d11b46174aef436fa7f75c8` in
`/private/tmp/gutenberg-07f8-pass85-trunk-testonly.PTGINx` exits `1`. Current
trunk fails the operation-shape and stale-snapshot guards:

```text
does not encode top-level block moves as sibling content rewrites:
  yblocks.get(0) is the original first block
encodes top-level block moves as array operations instead of rich-text rewrites:
  observed top-level array operation is false
preserves applied remote rich-text edits when a stale local snapshot reports a top-level move:
  expected "Sibling paragraph with remote edit"
  received "Sibling paragraph"
```

Applying the same test-only repro commit to known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` in
`/private/tmp/gutenberg-07f8-pass85-knownfix-testonly.8C6BDy` also exits `1`.
The known-fixes base still fails the operation-shape guards and the exact
two-doc convergence repro:

```text
[ "Inserted paragraph", "Moved paragraph", "Moved paragraph" ]
```

The fixed PR branch remains the required three commits:

```text
ef47db4b57f Add RTC top-level block move unit repro
cff7f45bdb0 Add RTC top-level block move Playwright repro
5721a2ebdb6 Fix RTC top-level block move reconciliation
```

Fresh pass-85 fixed-branch checks passed: `git diff --check
origin/trunk..HEAD`, the full `packages/core-data/src/utils/test/crdt-blocks.ts`
unit file (`78/78`), focused JS lint over all changed files, and the headless
Chromium natural-user Playwright repro on `WP_ENV_PORT=9900` (`1 passed`,
21.8s). The existing annotated headless video was reverified with `ffprobe`,
`ffmpeg`, `sips`, and frame inspection: H.264, `2560x900`, 30 fps, 360 frames,
12.0s, with both editor panes, the natural-action summary, the expected primary
order, and the collaborator duplicate-moved-paragraph result visible.

## Pass 84 update

Pass 84 re-read the pass-83 summary, source JSONL row, source error context,
source screenshots, source trace archive, generated realistic Playwright spec,
current PR branch commits, current explanation branch, video artifact, relevant
`crdt-blocks` code, Git history/blame, and GitHub metadata for PR #72262. The
classification remains a real product bug. The source trace was parsed again at
the Playwright test-event level, which is an additional negative check against
readiness waits, bad locators, malformed specs, inverted assertions, and
environment failures. The trace records ordinary editor actions before the final
timeout:

```text
primary:      click heading, toolbar Options, menuitem Delete
collaborator: click moved paragraph, toolbar Options, menuitem Add before, type inserted paragraph
primary:      click moved paragraph, toolbar Move down
```

The subsequent repeated polling is only the convergence wait. The archived DOM
snapshot and screenshots show the stable split:

```text
primary:      [ inserted, sibling, moved ]
collaborator: [ inserted, moved, moved ]
```

Pass 84 reran the low-level controls on the current bases. Applying only repro
commit `ef47db4b57f` to current `origin/trunk`
`369e71ec725855b95d11b46174aef436fa7f75c8` in
`/private/tmp/gutenberg-07f8-pass84-trunk-testonly.NbNw2Y` exits `1`. Current
trunk still fails the operation-shape and stale-snapshot guards:

```text
does not encode top-level block moves as sibling content rewrites:
  yblocks.get(0) is the original first block
encodes top-level block moves as array operations instead of rich-text rewrites:
  observed top-level array operation is false
preserves applied remote rich-text edits when a stale local snapshot reports a top-level move:
  expected "Sibling paragraph with remote edit"
  received "Sibling paragraph"
```

Applying the same test-only repro commit to known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` in
`/private/tmp/gutenberg-07f8-pass84-knownfix-testonly.FiYCQ6` also exits `1`.
The known-fixes base still fails the operation-shape guards and the exact
two-doc convergence repro:

```text
[ "Inserted paragraph", "Moved paragraph", "Moved paragraph" ]
```

The fixed PR branch remains the required three commits:

```text
ef47db4b57f Add RTC top-level block move unit repro
cff7f45bdb0 Add RTC top-level block move Playwright repro
5721a2ebdb6 Fix RTC top-level block move reconciliation
```

Fresh pass-84 fixed-branch checks passed: `git diff --check
origin/trunk..HEAD`, the full `packages/core-data/src/utils/test/crdt-blocks.ts`
unit file (`78/78`), focused JS lint over all changed files, and the headless
Chromium natural-user Playwright repro on `WP_ENV_PORT=9900` (`1 passed`,
24.7s). The existing annotated headless video was reverified with `ffprobe`,
`ffmpeg`, `sips`, and frame inspection: H.264, `2560x900`, 30 fps, 360 frames,
12.0s, with both editor panes, the natural-action summary, the expected primary
order, and the collaborator duplicate-moved-paragraph result visible.

## Pass 83 update

Pass 83 independently re-read the pass-82 summary, source JSONL row, source
failure log, error context, trace archive, generated natural-action spec, PR
branch commits, explanation branch, video artifact, and the relevant
`crdt-blocks` implementation. The classification remains a real product bug.
The source run completed ordinary toolbar actions before the failure: primary
deleted the heading, the collaborator inserted a paragraph before the moved
paragraph, and primary clicked `Move down`. The only failure is the final
convergence wait, which records stable corruption:

```text
primary:      [ inserted, sibling, moved ]
collaborator: [ inserted, moved, moved ]
```

Pass 83 adds a fresh verification that the existing branch, video, and fix still
satisfy the requested standard. Applying only repro commit `ef47db4b57f` to
current `origin/trunk` `369e71ec725855b95d11b46174aef436fa7f75c8` in
`/private/tmp/gutenberg-07f8-pass83-trunk-testonly.jUyLkp` exits `1`. Current
trunk still fails the operation-shape and stale-snapshot guards: the old path
keeps the original integrated `Y.Map` instance at the reordered index, emits no
top-level `Y.Array` delete/insert operation, and reverts
`Sibling paragraph with remote edit` to `Sibling paragraph`.

Applying the same test-only repro commit to known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` in
`/private/tmp/gutenberg-07f8-pass83-knownfix-testonly.FLpro1` also exits `1`.
Known-fixes still fails the operation-shape guards, and the exact two-doc
convergence repro still ends with the source corruption:

```text
[ "Inserted paragraph", "Moved paragraph", "Moved paragraph" ]
```

The fixed PR branch remains the required three commits:

```text
ef47db4b57f Add RTC top-level block move unit repro
cff7f45bdb0 Add RTC top-level block move Playwright repro
5721a2ebdb6 Fix RTC top-level block move reconciliation
```

Fresh pass-83 fixed-branch verification passed: `git diff --check
origin/trunk..HEAD`, the full `packages/core-data/src/utils/test/crdt-blocks.ts`
unit file (`78/78`), focused JS lint over all changed files, and the headless
Chromium natural-user Playwright repro on `WP_ENV_PORT=9900` (`1 passed`,
21.1s). The annotated headless video was reverified with `ffprobe`, `ffmpeg`,
and frame inspection: H.264, `2560x900`, 30 fps, 360 frames, 12.0s, with both
editor panes, the natural-action summary, the expected primary order, and the
collaborator duplicate-moved-paragraph result visible.

## Pass 82 update

Pass 82 re-read the pass-81 summary, source JSONL row, generated
natural-action spec, source log, error context, screenshots, trace action log,
current explanation branch, PR branch, `crdt-blocks` code, Git history/blame,
and GitHub PR #72262 metadata. The classification remains a real product bug,
not a readiness wait, locator failure, malformed generated spec, environment
failure, inverted assertion, or expected behavior. The trace still shows only
ordinary editor actions before the failure: toolbar Delete on the heading,
collaborator toolbar Add before plus keyboard typing, then primary toolbar Move
down. The failure is the final stable convergence split:

```text
primary:      [ inserted, sibling, moved ]
collaborator: [ inserted, moved, moved ]
```

Pass 82 adds a fresh narrower root-cause proof against the current bases.
Applying only repro commit `ef47db4b57f` to current `origin/trunk`
`369e71ec725855b95d11b46174aef436fa7f75c8` in
`/private/tmp/gutenberg-07f8-pass82-trunk-testonly.VlD9pF` exits `1`. The
single-file focused unit run proves the old code keeps the same integrated
`Y.Map` object for the reordered index, emits no top-level `Y.Array`
delete/insert operation, and reverts a peer's already-applied rich-text edit:

```text
does not encode top-level block moves as sibling content rewrites: yblocks.get(0) is the original first block
encodes top-level block moves as array operations instead of rich-text rewrites: observed top-level array operation is false
preserves applied remote rich-text edits when a stale local snapshot reports a top-level move:
  expected "Sibling paragraph with remote edit"
  received "Sibling paragraph"
```

Applying the same test-only repro commit to known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` in
`/private/tmp/gutenberg-07f8-pass82-knownfix-testonly.CeUuzi` also exits `1`.
Known-fixes still fails the operation-shape guards, and the exact two-doc
convergence repro ends with the source corruption:

```text
[ "Inserted paragraph", "Moved paragraph", "Moved paragraph" ]
```

The fixed PR branch remains the required three commits:

```text
ef47db4b57f Add RTC top-level block move unit repro
cff7f45bdb0 Add RTC top-level block move Playwright repro
5721a2ebdb6 Fix RTC top-level block move reconciliation
```

Fresh pass-82 fixed-branch verification passed: `git diff --check
origin/trunk..HEAD`, the full `crdt-blocks.ts` unit file (`78/78`), focused JS
lint over all changed files, and the headless Chromium natural-user Playwright
repro on `WP_ENV_PORT=9900` (`1 passed`, 21.6s). The existing annotated
headless video was reverified with `ffprobe`, `ffmpeg`, `sips`, and frame
inspection: H.264, `2560x900`, 30 fps, 360 frames, 12.0s, with both editor
panes, the natural-action summary, expected primary order, and collaborator
duplicate-moved-paragraph result visible.

## Pass 81 update

Pass 81 independently re-read the pass-80 summary, source JSONL row, original
generated natural-action spec, source log, error context, screenshots, trace
metadata/action log, current explanation branch, current PR branch, relevant
`crdt-blocks` code, Git history/blame, and GitHub PR #72262 metadata. The
classification remains a real product bug. The source run completed normal
editor UI actions before the failure: toolbar Delete on the heading,
collaborator toolbar Add before plus keyboard typing, and primary toolbar Move
down. The only failure is the final convergence wait, whose stable states are:

```text
primary:      [ inserted, sibling, moved ]
collaborator: [ inserted, moved, moved ]
```

Pass 81 adds a fresh verification that the existing branch, video, and fix still
satisfy the requested standard. Applying only repro commit `ef47db4b57f` to
current `origin/trunk` `369e71ec725855b95d11b46174aef436fa7f75c8` in
`/private/tmp/gutenberg-07f8-pass81-trunk-testonly.GjvJ6R` exits `1`. Current
trunk still fails the two operation-shape guards and the stale local move guard:
the old path keeps the same integrated `Y.Map` instances, emits no top-level
`Y.Array` delete/insert operation, and rewrites
`Sibling paragraph with remote edit` back to `Sibling paragraph`.

Applying the same test-only repro commit to known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` in
`/private/tmp/gutenberg-07f8-pass81-knownfix-testonly.IyxTBC` also exits `1`.
Known-fixes still fails the operation-shape guards and the exact two-doc
convergence repro:

```text
[ "Inserted paragraph", "Moved paragraph", "Moved paragraph" ]
```

The fixed PR branch remains the required three commits:

```text
ef47db4b57f Add RTC top-level block move unit repro
cff7f45bdb0 Add RTC top-level block move Playwright repro
5721a2ebdb6 Fix RTC top-level block move reconciliation
```

Fresh fixed-branch checks passed in pass 81: `git diff --check
origin/trunk..HEAD`, the full `crdt-blocks.ts` unit file (`78/78`), focused JS
lint over all changed files, and the headless Chromium natural-user Playwright
repro on `WP_ENV_PORT=9900` (`1 passed`, 22.2s). The existing annotated
headless video was rechecked with `ffprobe`, `ffmpeg`, `sips`, and frame
inspection: H.264, `2560x900`, 30 fps, 360 frames, 12.0s, with both editor
panes, natural-action summary, expected primary order, and collaborator
duplicate-moved-paragraph result visible.

## Pass 80 update

Pass 80 independently re-read the pass-79 summary, source JSONL row, original
generated natural-action spec, source log, error context, screenshots, trace
metadata/action log, existing explanation branch, PR branch, `crdt-blocks`
code, Git history, and GitHub PR #72262 metadata. The classification remains a
real product bug. The source trace shows normal editor UI actions completing:
delete the heading through the toolbar, insert a paragraph before the moved
paragraph through the collaborator's block toolbar and keyboard input, then move
the original paragraph down through the primary toolbar. The failure occurs only
after that, during convergence polling, with stable corruption:

```text
primary:      [ inserted, sibling, moved ]
collaborator: [ inserted, moved, moved ]
```

The pass-80 addition is a fresh browser negative control on the known-fixes base
plus fresh low-level and fixed-branch verification. On known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908`, with `wp-env` running on port
`9903`, the original natural-action Playwright spec was rerun with
`RTC_EC47_ATTEMPTS=1` and exited `1` after the final convergence wait. The
attempt JSON for `postId=598` again shows the exact source failure:

```text
primary:      [ inserted, sibling, moved ]
collaborator: [ inserted, moved, moved ]
```

Fresh pass-80 low-level controls applied only repro commit `ef47db4b57f` to
current `origin/trunk` `369e71ec725855b95d11b46174aef436fa7f75c8` and to the
known-fixes base. Current trunk exits `1`, failing the operation-shape guards
and the stale local move guard. Known-fixes exits `1`, failing the
operation-shape guards and the exact two-doc convergence repro:

```text
[ "Inserted paragraph", "Moved paragraph", "Moved paragraph" ]
```

This pass also revalidated the existing PR branch. `git diff --check
origin/trunk..HEAD` exited `0`, the full `crdt-blocks.ts` unit file passed
`78/78`, focused JS lint exited `0`, and the headless Chromium natural-user
Playwright repro on port `9900` passed (`1 passed`, 21.2s). The annotated
headless video was rechecked with `ffprobe`, `sips`, and frame inspection:
H.264, `2560x900`, 30 fps, 360 frames, 12.0s, with both editor panes, action
summary, expected primary order, and duplicate collaborator order visible.

## Pass 79 update

Pass 79 re-read the pass-78 summary, source JSONL row, original generated
natural-action spec, source log, error context, screenshots, trace action log,
current PR branch, current explanation branch, relevant `crdt-blocks` history,
and GitHub metadata for PR #72262. The classification is still a real product
bug. The source trace completed normal editor actions, then failed only during
the final convergence wait. The final states are stable corruption, not a
locator/readiness/environment failure:

```text
primary:      [ inserted, sibling, moved ]
collaborator: [ inserted, moved, moved ]
```

The pass-79 addition is an independent current verification plus a narrower
root-cause check against the exact current bases. Applying only the unit repro
commit `ef47db4b57f` to current `origin/trunk`
`369e71ec725855b95d11b46174aef436fa7f75c8` still exits `1`. It fails the two
operation-shape guards because the old merge path keeps the same integrated
`Y.Map` instances for the reordered pair and emits no top-level `Y.Array`
delete/insert delta; it also fails the stale local move guard by reverting
`Sibling paragraph with remote edit` to `Sibling paragraph`. Applying the same
test-only commit to known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` also exits `1`: it fails the same
operation-shape guards and the exact two-doc convergence repro ends with the
duplicate moved paragraph:

```text
[ "Inserted paragraph", "Moved paragraph", "Moved paragraph" ]
```

The root cause remains the positional left/right sweep introduced with
`packages/core-data/src/utils/crdt-blocks.ts` in
`84019935998c16f877e976ad85e84748355d7282` / PR #72262. For a top-level
same-clientId reorder, `mergeCrdtBlocks()` reaches the update loop with the
array identities in the old order and incoming blocks in the new order. The old
code therefore mutates existing array entries at their positions rather than
moving the entries. Peers can keep the old array identity shape while receiving
sibling content rewrites, matching the observed collaborator state.

Fresh pass-79 fixed-branch checks passed: `git diff --check origin/trunk..HEAD`,
the full `crdt-blocks.ts` unit file (`78/78`), focused JS lint for the changed
files, and the headless Chromium natural-user Playwright repro on port `9900`
(`1 passed`, 21.8s). The existing annotated headless video was reverified with
`ffprobe`, `sips`, and frame inspection: H.264, `2560x900`, 30 fps, 360 frames,
12.0s, showing both editor panes and the expected/observed final orders.

## Pass 78 update

Pass 78 independently re-read the pass-77 summary, source result row, generated
natural-action spec, source failure log, error context, source screenshots,
trace metadata, existing PR branch, current explanation branch, relevant
`crdt-blocks` code, Git history, and GitHub metadata for PR #72262. The
classification remains a real product bug. The original HTTP run completed
ordinary editor actions and failed only at final convergence: the primary editor
held `[ inserted, sibling, moved ]`, while the collaborator held
`[ inserted, moved, moved ]`.

The pass-78 addition is a fresh verification that the existing branch, video,
and fix still satisfy the requested standard on current `origin/trunk`
`369e71ec725855b95d11b46174aef436fa7f75c8`. Applying only repro commit
`ef47db4b57f` to current trunk still exits `1`: the old path keeps the original
integrated `Y.Map` objects for a same-clientId top-level move, emits no
top-level `Y.Array` delete/insert operation, and loses the remote rich-text edit
in the stale local move snapshot guard. Applying the same repro commit to
known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908` also exits `1`:
it fails the operation-shape guards and the exact two-doc repro still ends with
`[ "Inserted paragraph", "Moved paragraph", "Moved paragraph" ]`.

The fixed PR branch remains the required three commits:

```text
ef47db4b57f Add RTC top-level block move unit repro
cff7f45bdb0 Add RTC top-level block move Playwright repro
5721a2ebdb6 Fix RTC top-level block move reconciliation
```

Fresh pass-78 fixed-branch checks passed: `git diff --check
origin/trunk..HEAD`, the full `crdt-blocks.ts` unit file (`78/78`), focused JS
lint over the changed files, and the headless Chromium natural-user Playwright
repro on port `9900` (`1 passed`, 25.9s). The existing annotated headless video
was reverified with `ffprobe`, `sips`, and frame inspection: H.264, `2560x900`,
30 fps, 360 frames, 12.0s, showing both editor panes, the action summary, and
the expected/observed final orders.

## Pass 77 update

Pass 77 re-read the pass-76 summary, source JSONL row, source log, source
error context, source screenshots, trace archive metadata, generated natural
action spec, current PR branch, current explanation branch, `origin/trunk`,
known-fixes base, and the relevant `crdt-blocks` code. The classification
remains a real product bug. The trace shows the generated test successfully
completed normal editor actions: toolbar Delete, toolbar Add before plus real
typing, toolbar Move down, then repeated state polling during the final
convergence wait. The failure is the stable post-state split, not a locator,
readiness, malformed-spec, environment, or inverted-assertion issue.

The pass-77 addition is a narrower root-cause proof against current
`origin/trunk` `369e71ec725855b95d11b46174aef436fa7f75c8`. In the old
`mergeCrdtBlocks()` path, a two-block swap with the same `clientId` set has
`left = 0`, `right = 0`, and `numOfUpdatesNeeded = 2`; the update loop then
rewrites the integrated `Y.Map` at index 0 with the incoming sibling block and
the integrated `Y.Map` at index 1 with the incoming moved block. That encodes
the move as attribute/rich-text changes on existing array elements instead of a
top-level `Y.Array` delete/insert. A peer can therefore retain the old array
identity shape while receiving sibling content rewrites, which explains the
observed `[ inserted, moved, moved ]` collaborator state.

Fresh pass-77 low-level negative controls applied only repro commit
`ef47db4b57f` to current trunk and to known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908`. Current trunk still exits `1`:
it reuses the original integrated `Y.Map` objects, emits no top-level array
operation, and loses the remote rich-text edit in the stale-move guard.
Known-fixes also exits `1`: it fails the operation-shape guards and the exact
two-doc convergence repro, ending with
`[ "Inserted paragraph", "Moved paragraph", "Moved paragraph" ]`. A pass-77
known-fixes browser retry was not used as product evidence because it failed
earlier on HTTP polling awareness readiness/permission, before reaching the
move sequence; the original source run and the fresh low-level known-fixes
control still prove known-fixes does not contain this fix.

Fresh pass-77 fixed-branch checks passed: `git diff --check origin/trunk..HEAD`,
full `crdt-blocks.ts` unit tests (`78/78`), focused JS lint, regenerated
`core-data` browser/package artifact checks, and the headless Chromium
natural-user Playwright repro on port `9900` (`1 passed`, 21.7s). The existing
annotated headless video was reverified with `ffprobe` and frame inspection:
H.264, `2560x900`, 30 fps, 360 frames, 12.0s, with both editor panes, action
summary, and expected/observed final orders visible.

## Pass 76 update

Pass 76 independently re-read the pass-75 summary, source JSONL row, source
log, error context, source screenshots, generated natural-action spec, current
PR branch, current explanation branch, current `origin/trunk`, and the
known-fixes checkout. The classification remains a real product bug, not a
readiness wait, action locator error, malformed spec, environment failure,
inverted assertion, or expected behavior.

The pass-76 addition is a fresh browser-level known-fixes negative control plus
a fresh fixed-branch verification after a build-artifact refresh. The
known-fixes checkout was already running on port `9903`; with
`RTC_EC47_ATTEMPTS=1` and `RTC_MANIFEST_WS_START_PORT=21976`, the original
natural-action Playwright spec exited `1` in 44.1s and wrote
`/tmp/07f8-pass76-knownfix-e2e/attempt-1.json` with `postId=541`.

The saved attempt exactly matches the source failure:

```text
primary:      [ inserted, sibling, moved ]
collaborator: [ inserted, moved, moved ]
```

Pass 76 also re-applied only the repro-test commit `ef47db4b57f` to current
`origin/trunk` `369e71ec725855b95d11b46174aef436fa7f75c8` and to known-fixes
base `3cba2b1e56a98787de08dc6c7df2434759e8f908`. Current trunk still fails
the operation-shape guards and the stale-snapshot rich-text guard; known-fixes
still fails the operation-shape guards and the exact two-doc convergence repro,
ending with `[ "Inserted paragraph", "Moved paragraph", "Moved paragraph" ]`.

Fresh fixed-branch checks passed: `git diff --check origin/trunk..HEAD`, the
focused operation-shape/convergence/stale-snapshot guards, the full
`crdt-blocks.ts` unit file (`78/78`), focused JS lint, and the headless
Chromium natural-user Playwright repro on port `9900` (`1 passed`, 21.4s).
A full `npm run build -- --skip-types` still failed in the unrelated theme
primitive token generator with `TypeError: [object Object] is not a valid color
space` after `build:js` and `build:php` completed. A direct `wp-build` pass
reported the known optional dependency bundling errors, but it regenerated the
`core-data` package and browser artifacts; those regenerated artifacts contain
`getClientIdReorderRange`, `replaceYBlockRange`, and
`getBlockForReorderDiff`. After restoring the ignored root build assets around
that fixed `core-data` bundle, REST discovery returned `200 OK` with the
expected `Link` header and the natural-user Chromium repro passed again.

## Pass 75 update

Pass 75 re-ran the disproof and verification checks after `origin/trunk`
advanced to `369e71ec725855b95d11b46174aef436fa7f75c8`
(`Fix: Buttons block shows inserter picker when multiple allowed blocks are
registered (#77858)`). That commit only changes
`packages/block-library/src/buttons/edit.js`; it does not touch
`packages/core-data/src/utils/crdt-blocks.ts`,
`packages/core-data/src/utils/test/crdt-blocks.ts`, or RTC sync code.

The explanation branch and PR branch were both rebased onto that trunk head.
The rebased PR branch still has exactly the required commit order:

```text
ef47db4b57f Add RTC top-level block move unit repro
cff7f45bdb0 Add RTC top-level block move Playwright repro
5721a2ebdb6 Fix RTC top-level block move reconciliation
```

Fresh pass-75 negative controls:

```bash
git worktree add --detach /private/tmp/gutenberg-07f8-pass75-trunk-testonly.53hL8Z origin/trunk
git -C /private/tmp/gutenberg-07f8-pass75-trunk-testonly.53hL8Z cherry-pick -n ef47db4b57f
npm --prefix /private/tmp/gutenberg-07f8-pass75-trunk-testonly.53hL8Z run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='handles block reordering|does not encode top-level block moves as sibling content rewrites|encodes top-level block moves as array operations instead of rich-text rewrites|keeps peers converged when a top-level move follows remote insertions and deletions|preserves applied remote rich-text edits when a stale local snapshot reports a top-level move|preserves incoming content edits on a block moved in the same update'
```

Result on current trunk: exit code `1`. The old local reorder and two-doc
content smoke checks passed, but trunk still fails the operation-shape guards
and stale-snapshot rich-text guard: it reuses the wrong integrated `Y.Map`,
emits no top-level `Y.Array` delete/insert delta, and loses the remote sibling
edit in the stale move case.

```bash
git -C /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505 worktree add --detach /private/tmp/gutenberg-07f8-pass75-knownfix-testonly.gkfC6h 3cba2b1e56a98787de08dc6c7df2434759e8f908
git -C /private/tmp/gutenberg-07f8-pass75-knownfix-testonly.gkfC6h cherry-pick -n ef47db4b57f
npm --prefix /private/tmp/gutenberg-07f8-pass75-knownfix-testonly.gkfC6h run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='handles block reordering|does not encode top-level block moves as sibling content rewrites|encodes top-level block moves as array operations instead of rich-text rewrites|keeps peers converged when a top-level move follows remote insertions and deletions|preserves applied remote rich-text edits when a stale local snapshot reports a top-level move|preserves incoming content edits on a block moved in the same update'
```

Result on the known-fixes base: exit code `1`. It still fails the two
operation-shape guards and the exact two-doc convergence repro, ending with
`[ "Inserted paragraph", "Moved paragraph", "Moved paragraph" ]`.

Fresh pass-75 browser negative on known-fixes also matched the original source
bug. Against the existing HTTP server at `http://localhost:9601`, the one
attempt Playwright run exited `1` in 43.6s and wrote
`/tmp/07f8-pass75-knownfix-e2e/attempt-1.json` with:

```text
primary:      [ inserted, sibling, moved ]
collaborator: [ inserted, moved, moved ]
```

Fresh pass-75 fixed-branch checks passed on the rebased branch: `git diff
--check origin/trunk..HEAD`, full `crdt-blocks.ts` unit tests `78/78`, focused
JS lint, and the headless Chromium natural-user repro on port `9900` (`1
passed`, 22.3s). The built `core-data` bundles still contain
`getClientIdReorderRange`, `replaceYBlockRange`, and
`getBlockForReorderDiff`. The annotated headless video was rechecked: H.264,
`2560x900`, 30 fps, 360 frames, 12.0s, with both editor panes and the
action/result annotations visible.

## Pass 74 update

Pass 74 independently re-read the source result row, source log, error context,
screenshots, trace archive metadata, generated natural-action spec, unit repros,
fix, blame/log history, known-fixes base, and the existing video. The
classification remains a real product bug. The source and fresh known-fixes
browser repros both fail after normal editor UI actions and report the same
stable divergence:

```text
primary:      [ inserted, sibling, moved ]
collaborator: [ inserted, moved, moved ]
```

The new pass-74 evidence is a fresh verification that the existing
branch/video/fix still satisfy the requested standard. Applying only the unit
repro commit `ea763db2e3e` to current `origin/trunk`
`85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5` still fails the top-level move
operation-shape guard and stale-snapshot rich-text guard. Applying the same
test-only commit to known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` still fails the operation-shape
guards and the exact two-doc convergence repro, producing
`[ inserted, moved, moved ]`.

The known-fixes natural-user Playwright repro was also rerun on port `9903`
with `RTC_EC47_ATTEMPTS=1`; it exited `1` and wrote
`/tmp/07f8-pass74-knownfix-e2e/attempt-1.json`, whose primary and secondary
states match the source failure. The fixed PR branch still has exactly these
three commits:

```text
ea763db2e3e Add RTC top-level block move unit repro
4451437b6b0 Add RTC top-level block move Playwright repro
0e5345d0265 Fix RTC top-level block move reconciliation
```

Fresh fixed-branch checks passed: `git diff --check origin/trunk..HEAD`,
focused unit guards `6/6`, full `crdt-blocks.ts` unit tests `78/78`, focused
JS lint, and the headless Chromium natural-user repro on port `9900`. The
existing annotated headless video was rechecked with `ffprobe` and by inspecting
the frame: H.264, `2560x900`, 30 fps, 360 frames, 12.0s duration, with both
editor panes and action/result annotations visible.

## Pass 73 update

Pass 73 re-read the previous summary, source JSONL row, source log, error
context, screenshots, trace archive, generated spec, current PR branch, current
upstream history, and known-fixes base. The classification is still unchanged:
this is a product bug in top-level block reconciliation, not a readiness wait,
action locator problem, malformed generated test, environment failure, inverted
assertion, or expected behavior.

The source evidence still shows ordinary editor interactions only: create a post
with a heading and two paragraphs, delete the heading through the toolbar, insert
a paragraph before the moved paragraph in the collaborator through the block
toolbar and typing, then move the paragraph down in the primary editor through
the toolbar. The final state remains stable but divergent: primary converges to
`[ inserted, sibling, moved ]`, while the collaborator converges to
`[ inserted, moved, moved ]`.

The pass-73 addition is an improved fix audit. The previous fix rebuilt a
reordered middle range from the current CRDT state, which was the right default
for stale move snapshots, but it was too strict when the same local editor update
both moved a block and edited that moved block's selected rich-text attribute. I
added a focused unit guard for that path:

```text
preserves incoming content edits on a block moved in the same update
```

The revised fix keeps reordered ranges structural-only by default, but, when
`applyPostChangesToCRDTDoc` supplies a `MergeCursorPosition`, it copies exactly
the selected incoming rich-text attribute for the matching moved block. This
keeps remote edits already present in the CRDT from being overwritten by stale
move snapshots while preserving an actual local text edit bundled with a move.

Current PR branch commit order after the pass-73 rewrite:

```text
ea763db2e3e Add RTC top-level block move unit repro
4451437b6b0 Add RTC top-level block move Playwright repro
0e5345d0265 Fix RTC top-level block move reconciliation
```

Pass-73 negative controls:

```bash
TMPDIR=/private/tmp/gutenberg-07f8-pass73-trunk-testonly.5ZOVLv
git -C /Users/danluu/dev/fuzz/gutenberg worktree add --detach "$TMPDIR" origin/trunk
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules "$TMPDIR/node_modules" || true
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/vendor "$TMPDIR/vendor" || true
git -C "$TMPDIR" cherry-pick -n 9b6ed6cd5d6
npm --prefix "$TMPDIR" run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='handles block reordering|does not encode top-level block moves as sibling content rewrites|encodes top-level block moves as array operations instead of rich-text rewrites|keeps peers converged when a top-level move follows remote insertions and deletions|preserves applied remote rich-text edits when a stale local snapshot reports a top-level move|preserves incoming content edits on a block moved in the same update'
```

Result: cherry-pick exited `0`; unit run exited `1` on current
`origin/trunk` `85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5`. The old local
reorder test and new same-update local edit guard passed, but current trunk
still reused the wrong integrated `Y.Map`, emitted no top-level `Y.Array`
insert/delete delta, and lost the remote rich-text edit in the stale-move guard.

```bash
TMPDIR=/private/tmp/gutenberg-07f8-pass73-knownfix-testonly.uwEQgh
git -C /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505 worktree add --detach "$TMPDIR" 3cba2b1e56a98787de08dc6c7df2434759e8f908
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules "$TMPDIR/node_modules" || true
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/vendor "$TMPDIR/vendor" || true
git -C "$TMPDIR" cherry-pick -n 9b6ed6cd5d6
npm --prefix "$TMPDIR" run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='handles block reordering|does not encode top-level block moves as sibling content rewrites|encodes top-level block moves as array operations instead of rich-text rewrites|keeps peers converged when a top-level move follows remote insertions and deletions|preserves applied remote rich-text edits when a stale local snapshot reports a top-level move|preserves incoming content edits on a block moved in the same update'
```

Result: cherry-pick exited `0`; unit run exited `1` on known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908`. The known-fixes base still failed
the operation-shape checks and the two-doc convergence guard, ending with the
duplicated moved paragraph on the collaborator side.

Fresh fixed-branch checks:

```bash
git diff --check origin/trunk..HEAD
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='preserves incoming content edits on a block moved in the same update|preserves applied remote rich-text edits when a stale local snapshot reports a top-level move|keeps peers converged when a top-level move follows remote insertions and deletions'
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ENV_PHPMYADMIN_PORT=9090 npm run wp-env start
curl -I http://localhost:9900/wp-json/
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ENV_PHPMYADMIN_PORT=9090 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass73-fixed-pr-e2e npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: whitespace check exited `0`; the full `crdt-blocks.ts` unit file
passed `78/78`; the focused new and existing convergence guards passed `3/3`;
focused JS lint exited `0`; wp-env started at `http://localhost:9900`; REST
discovery returned `200 OK`; and the natural-user Chromium Playwright repro
passed in 21.2s.

I also reran the workspace build checks. `npm run build -- --skip-types`
reported successful `build:js` and `build:php`, then failed in the unrelated
theme primitive token generator with `TypeError: [object Object] is not a valid
color space`. A direct `npx wp-build` emitted the updated `core-data` browser
bundle before later failing on unrelated missing optional UI package imports;
the non-core-data build tree was restored from the known-fixes checkout, and
the focused browser repro then passed against the updated `core-data` bundle.

The origin analysis is unchanged. Commit
`84019935998c16f877e976ad85e84748355d7282` / PR #72262 introduced the custom
post-entity CRDT block merge path that uses a positional diff over
`packages/core-data/src/utils/crdt-blocks.ts`. Later RTC fixes, including
known-fixes commit `02bfdaa5ca96...` / PR #77980 and current trunk commit
`85cbd148b1c...` / PR #77966, do not change this block move operation-shape
problem.

## Pass 72 update

Pass 72 re-checked the source failure, screenshots, current upstream head, the
known-fixes base, the PR branch, and the annotated video. The classification is
unchanged: this is still a real product bug in top-level block reconciliation,
not a readiness wait, action locator error, malformed spec, environment failure,
inverted assertion, or expected behavior.

The extra pass-72 evidence is a fresh known-fixes browser negative control in
addition to the low-level Y.Doc controls. On
`/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505` with
wp-env already running on port `9903`, the original natural-user generated spec
still failed after ordinary toolbar and typing actions:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 npm run wp-env status
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 WP_ENV_PHPMYADMIN_PORT=9026 RTC_MANIFEST_WS_START_PORT=21872 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass72-knownfix-e2e npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: wp-env reported `http port: 9903`; Playwright exited `1` after 43.9s.
The saved attempt `postId` was `497`. The primary editor ended as
`[ inserted, sibling, moved ]`, while the collaborator ended as
`[ inserted, moved, moved ]`; the sibling paragraph was dropped on the
collaborator. The pass-72 artifacts were copied to:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-72/artifacts-knownfix/test-results/editor-collaboration-triag-c1f21-ic-ec47-realistic-attempt-1-chromium/
```

Pass 72 also reran the operation-shape unit controls by applying only the unit
repro commit `8f751b39527` to current `origin/trunk`
`85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5` and to known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908`. Both cherry-picks exited `0`, and
both focused unit runs exited `1`. Current trunk still reuses the existing
integrated `Y.Map` for a same-identity top-level move and emits no top-level
`Y.Array` insert/delete delta; it additionally loses a remote rich-text edit
from a stale move snapshot. The known-fixes base still fails the same
operation-shape checks, and the two-doc reproduction still converges to the
duplicated moved paragraph.

The existing PR branch remains exactly three commits on top of current trunk:

```text
8f751b39527 Add RTC top-level block move unit repro
e915e8d7eb5 Add RTC top-level block move Playwright repro
c27acdaa82f Fix RTC top-level block move reconciliation
```

Fresh pass-72 fixed-branch checks:

```bash
git diff --check origin/trunk..HEAD
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='does not encode top-level block moves as sibling content rewrites|encodes top-level block moves as array operations instead of rich-text rewrites|preserves unchanged top-level edges when block moves rebuild the reordered middle|merges stable edge content changes when block moves rebuild the reordered middle|keeps peers converged when a top-level move follows remote insertions and deletions|preserves applied remote rich-text edits when a stale local snapshot reports a top-level move|handles block reordering'
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ENV_PHPMYADMIN_PORT=9090 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass72-fixed-pr-e2e npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: whitespace check exited `0`; focused unit checks passed `7/7`; the
full `crdt-blocks.ts` unit file passed `77/77`; focused JS lint exited `0`;
wp-env was running at `http://localhost:9900`; and the focused natural-user
Chromium Playwright repro passed in 21.1s.

I also reran `npm run build`. `build:js` and `build:php` both exited `0`, but
the workspace build failed in the unrelated theme primitive token generator
with `TypeError: [object Object] is not a valid color space`. This branch
touches only `packages/core-data/src/utils/crdt-blocks.ts`,
`packages/core-data/src/utils/test/crdt-blocks.ts`, and the focused
collaboration test helpers/spec, and the worktree remained clean after the
failed build.

The existing annotated video was re-verified with `ffprobe` and by inspecting
the frame image. It is still present at:

```text
/Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218/artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4
```

with H.264 video, `2560x900`, `30/1` fps, `360` frames, 12.0s duration, and a
matching `2560 x 900` PNG frame showing both editors and the action/result
annotations.

## Pass 71 update

Pass 71 independently refreshed the classification after `origin/trunk`
advanced to `85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5`
(`RTC: Attach sync observers after hydrating persisted CRDT doc (#77966)`).
The result is still a real product bug, and the existing branch/video/fix
still satisfy the requested standard after rebasing onto current trunk.

The new pass-71 negative control was current `origin/trunk` plus only the
unit-repro commit. That isolates the production code at current upstream head
from the fix. The test-only worktree was
`/private/tmp/gutenberg-07f8-pass71-trunk-testonly.pegU1O`; cherry-pick of the
rebased unit repro commit `8f751b39527` exited `0`; the focused unit command
exited `1`:

```bash
git -C /Users/danluu/dev/fuzz/gutenberg worktree add --detach "$TMPDIR_PATH" origin/trunk
git -C "$TMPDIR_PATH" cherry-pick -n 8f751b39527
npm --prefix "$TMPDIR_PATH" run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='handles block reordering|does not encode top-level block moves as sibling content rewrites|encodes top-level block moves as array operations instead of rich-text rewrites|keeps peers converged when a top-level move follows remote insertions and deletions|preserves applied remote rich-text edits when a stale local snapshot reports a top-level move'
```

Result on current trunk: `handles block reordering` passed, but the top-level
move still reused the original integrated `Y.Map` at index 0, emitted no
top-level `Y.Array` insert/delete delta, and the stale-snapshot rich-text guard
lost the remote sibling edit. This proves #77966 did not fix the operation
shape problem.

Pass 71 also reran the known-fixes base control at
`3cba2b1e56a98787de08dc6c7df2434759e8f908` in
`/private/tmp/gutenberg-07f8-pass71-knownfix-testonly.g5PGBY`. Cherry-pick of
`8f751b39527` exited `0`; the same focused unit command exited `1`. The old
local reorder test passed, while the operation-shape tests failed and the
two-doc replication test still ended with the duplicated paragraph shape:

```text
[ "Inserted paragraph", "Moved paragraph", "Moved paragraph" ]
```

The PR branch was rebased cleanly onto current trunk and remains exactly three
commits:

```text
8f751b39527 Add RTC top-level block move unit repro
e915e8d7eb5 Add RTC top-level block move Playwright repro
c27acdaa82f Fix RTC top-level block move reconciliation
```

Fresh fixed-branch checks on `c27acdaa82f`:

```bash
git diff --check origin/trunk..HEAD
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='does not encode top-level block moves as sibling content rewrites|encodes top-level block moves as array operations instead of rich-text rewrites|keeps peers converged when a top-level move follows remote insertions and deletions|preserves applied remote rich-text edits when a stale local snapshot reports a top-level move|handles block reordering'
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ENV_PHPMYADMIN_PORT=9090 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass71-fixed-pr-e2e npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: whitespace check exited `0`; focused unit checks passed `5/5`; the
full `crdt-blocks.ts` unit file passed `77/77`; focused JS lint exited `0`;
wp-env was running at `http://localhost:9900`; and the natural-user Chromium
Playwright repro passed in 25.9s. The repro still uses only ordinary editor UI
actions: toolbar delete, toolbar add-before/insert-before, typing, and toolbar
Move down.

The annotated headless video artifact was re-verified and remains valid:

```text
/Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218/artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4
H.264, 2560x900, 30 fps, 360 frames, 12.0s, 296057 bytes
```

Pass 71 refreshed GitHub metadata with the installed GitHub connector. PR
https://github.com/WordPress/gutenberg/pull/72262 remains the origin of the
block CRDT merge logic. PR https://github.com/WordPress/gutenberg/pull/77980
is still a transport compaction fix that does not touch `crdt-blocks.ts`. PR
https://github.com/WordPress/gutenberg/pull/77966 only changes
`packages/sync/src/manager.ts`; the pass-71 trunk-only control confirms it
does not fix this block move operation-shape bug.

## Pass 70 update

Pass 70 re-read the pass-69 summary, source JSONL row, source log, source
error context, source trace archive, generated source spec, PR branch code and
tests, existing video artifact, origin history, and GitHub metadata for the
origin and nearby known-fixes PRs. The classification remains a real product
bug.

The source row is still a failed, non-timeout run:

```text
result=failed exitCode=1 timedOut=false durationMs=47666
startedAt=2026-05-05T10:14:48.655Z
completedAt=2026-05-05T10:15:36.321Z
```

The source trace confirms ordinary editor actions before the convergence
failure: REST post creation with the heading plus two paragraphs; click the
heading; choose `Delete`; click the multibyte paragraph in the second editor;
choose `Add before`; type `RTC ec47 realistic inserted paragraph 1`; click the
multibyte paragraph in the first editor; click toolbar `Move down`. The final
wait then loops on two stable but different editor states, so this is not a
readiness, locator, malformed-spec, or startup failure.

Pass 70 added a narrower root-cause proof over pass 69. I ran the pre-existing
local-only unit check, `handles block reordering`, side by side with the new
operation-shape and two-doc invariants on the known-fixes base with only the
first repro-test commit applied:

```bash
TMPDIR_PATH=$(mktemp -d /private/tmp/gutenberg-07f8-pass70-knownfix-shape.XXXXXX)
git -C /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505 worktree add --detach "$TMPDIR_PATH" 3cba2b1e56a98787de08dc6c7df2434759e8f908
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules "$TMPDIR_PATH/node_modules"
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/vendor "$TMPDIR_PATH/vendor"
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/build "$TMPDIR_PATH/build"
git -C "$TMPDIR_PATH" cherry-pick -n 83a8f05dc91
npm --prefix "$TMPDIR_PATH" run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='handles block reordering|does not encode top-level block moves as sibling content rewrites|encodes top-level block moves as array operations instead of rich-text rewrites|keeps peers converged when a top-level move follows remote insertions and deletions|preserves applied remote rich-text edits when a stale local snapshot reports a top-level move'
```

Result: exit code `1` in
`/private/tmp/gutenberg-07f8-pass70-knownfix-shape.POVKMJ`. The old local
reorder test passed, and the stale remote-rich-text guard passed. The three
RTC-specific tests failed:

```text
handles block reordering: passed
does not encode top-level block moves as sibling content rewrites: failed
encodes top-level block moves as array operations instead of rich-text rewrites: failed
keeps peers converged when a top-level move follows remote insertions and deletions: failed
preserves applied remote rich-text edits when a stale local snapshot reports a top-level move: passed
```

The failure details are the important proof. The unfixed writer keeps the
original integrated `Y.Map` at position 0 when the incoming same-identity block
order is reversed; the observer sees no top-level `Y.Array` insert/delete
delta; and the two-doc sequence ends with:

```text
[ "Inserted paragraph", "Moved paragraph", "Moved paragraph" ]
```

That means a local final-JSON reorder can appear correct while the replicated
operation is still wrong. The product defect is the operation shape emitted for
a same-`clientId` top-level reorder, not a generic inability to compute the
local reordered block array.

Fresh known-fixes browser control on the same base still fails:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=21767 RTC_MANIFEST_WS_FIXED_PORT=1 npm run wp-env status
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 WP_ENV_PHPMYADMIN_PORT=9026 RTC_MANIFEST_WS_START_PORT=21790 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass70-knownfix-e2e npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
sed -n '1,260p' /tmp/07f8-pass70-knownfix-e2e/attempt-1.json
```

Results: wp-env was running at `http://localhost:9903`; Playwright exited `1`
after 44.2s; saved attempt post ID was `473`; primary was
`[ inserted, sibling, moved ]`; secondary was
`[ inserted, moved, moved ]`. Fresh artifacts under
`test/e2e/artifacts/test-results/editor-collaboration-triag-c1f21-ic-ec47-realistic-attempt-1-chromium/`
include two `1280 x 720` PNG screenshots and a readable ZIP trace.

Fresh fixed-branch checks on PR head
`9490b2b7af1eff177c25306690efab05134f1e72`:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218
git fetch origin trunk
git fetch danluu try/rtc-top-level-block-move-duplicates-paragraph-and-drops-si-07f8eb5c4218 try/rtc-top-level-block-move-duplicates-paragraph-and-drops-si-07f8eb5c4218-pr
git status --short --branch
git rev-parse HEAD origin/trunk danluu/try/rtc-top-level-block-move-duplicates-paragraph-and-drops-si-07f8eb5c4218 danluu/try/rtc-top-level-block-move-duplicates-paragraph-and-drops-si-07f8eb5c4218-pr
git rev-list --left-right --count origin/trunk...HEAD
git diff --check origin/trunk..HEAD
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='does not encode top-level block moves as sibling content rewrites|encodes top-level block moves as array operations instead of rich-text rewrites|keeps peers converged when a top-level move follows remote insertions and deletions|preserves applied remote rich-text edits when a stale local snapshot reports a top-level move|handles block reordering'
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ENV_PHPMYADMIN_PORT=9090 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass70-fixed-pr-e2e npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: worktree clean; `origin/trunk` was
`64575b44eb6a18f9324a84a634d70ddbaee3b748`; explanation remote was
`f27265d6c52f0af250f1543d03cdac6fe8b27f4c`; PR remote was
`9490b2b7af1eff177c25306690efab05134f1e72`; PR branch remained `0 3` ahead of
`origin/trunk`; `git diff --check` exited `0`; focused unit run passed `5/5`;
full `crdt-blocks.ts` unit suite passed `77/77`; focused JS lint exited `0`;
wp-env was running at `http://localhost:9900`; and the natural-user Playwright
repro passed in Chromium in 22.0s.

The existing annotated headless video remains valid:

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames -show_entries format=duration,size -of default=noprint_wrappers=1 artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4
file artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218-frame.png artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4
ls -l artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4 artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218-frame.png
```

Result: H.264, `2560x900`, 30 fps, 360 frames, 12.0s, 296057 bytes; companion
frame is a `2560 x 900` PNG; both files are present under
`/Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218/artifacts/fuzz-bug-videos/`.

Origin analysis is unchanged after a fresh pass:

- `84019935998c16f877e976ad85e84748355d7282`, PR
  https://github.com/WordPress/gutenberg/pull/72262, introduced
  `packages/core-data/src/utils/crdt-blocks.ts` on 2025-10-14 with 503 new
  lines. GitHub metadata says it recursively inspected `blocks`, isolated
  atomic changes, and represented data with Y.js shared types.
- `git blame origin/trunk -L 415,635 -- packages/core-data/src/utils/crdt-blocks.ts`
  keeps the left/right positional sweep, update loop, delete/insert sections,
  and duplicate-clientId cleanup rooted in that original commit, with later
  rich-text/schema edits layered on top.
- Nearby known-fixes PR
  https://github.com/WordPress/gutenberg/pull/77980, merged as
  `02bfdaa5ca96deb050cd0c40bad1c1da75858caf` on 2026-05-05, changes only the
  HTTP polling sync server compaction path and a backport changelog. It does
  not touch `crdt-blocks.ts`, and the pass-70 controls confirm it does not fix
  this bug.

The fix plan remains the existing three-commit PR branch. The pass-70 negative
control makes the plan more precise: tests must assert replicated operation
shape and two-doc convergence, because checking only the local reordered JSON
misses the defect. The current fix detects unique same-length top-level
`clientId` reorders, rebuilds only the moved middle range as structural
`Y.Array` delete/insert operations, sources rebuilt moved blocks from current
CRDT state by `clientId`, and makes the later content diff compare against that
rebuilt state.

## Pass 69 update

Pass 69 independently re-read the pass-68 summary, source JSONL row, source
log, error context, source screenshots/trace location, generated source spec,
current PR branch, current explanation branch, CRDT merge code, and origin
history. The result is a verification pass: the existing branch/video/fix still
satisfy the requested standard, and the source failure remains a real product
bug rather than a readiness, locator, generated-spec, environment, or inverted
assertion issue.

Fresh source-row and artifact inspection still shows a failed non-timeout run
that reaches final state comparison. The source log reports `exitCode=1`,
`timedOut=false`, and a 47.666s duration. The error context shows loaded editor
UI with final blocks rendered, not startup failure. The failure state is still:

```text
primary:   [ inserted paragraph, sibling paragraph, moved paragraph ]
secondary: [ inserted paragraph, moved paragraph, moved paragraph ]
```

Pass 69 refreshed refs:

```bash
git fetch origin trunk
git fetch danluu try/rtc-top-level-block-move-duplicates-paragraph-and-drops-si-07f8eb5c4218 try/rtc-top-level-block-move-duplicates-paragraph-and-drops-si-07f8eb5c4218-pr
git status --short --branch
git rev-parse HEAD origin/trunk danluu/try/rtc-top-level-block-move-duplicates-paragraph-and-drops-si-07f8eb5c4218 danluu/try/rtc-top-level-block-move-duplicates-paragraph-and-drops-si-07f8eb5c4218-pr
git rev-list --left-right --count origin/trunk...HEAD
```

Results: `origin/trunk` is still
`64575b44eb6a18f9324a84a634d70ddbaee3b748`; the PR branch is
`9490b2b7af1eff177c25306690efab05134f1e72`; the remote `danluu` PR ref also
points at `9490b2b7af1eff177c25306690efab05134f1e72`; the explanation remote
still pointed at pass-68 head before this update; and the PR branch is exactly
`0 3` against `origin/trunk`.

Fresh fixed-branch verification on PR head `9490b2b7af1`:

```bash
git diff --check origin/trunk..HEAD
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='does not encode top-level block moves as sibling content rewrites|encodes top-level block moves as array operations instead of rich-text rewrites|keeps peers converged when a top-level move follows remote insertions and deletions|preserves applied remote rich-text edits when a stale local snapshot reports a top-level move'
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ENV_PHPMYADMIN_PORT=9090 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass69-fixed-pr-e2e npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: whitespace check exited `0`; focused unit invariants passed `4/4`;
the full `crdt-blocks.ts` unit suite passed `77/77`; focused JS lint exited
`0`; wp-env was running at `http://localhost:9900`; and the natural-user
Playwright repro passed in Chromium in 23.1s. The Playwright repro still uses
ordinary editor actions only: delete heading through block toolbar options,
insert paragraph before via menu, type text, and click Move down.

Fresh known-fixes low-level control used base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` in
`/private/tmp/gutenberg-07f8-pass69-knownfix-testonly.e3I7lQ`:

```bash
TMPDIR_PATH=$(mktemp -d /private/tmp/gutenberg-07f8-pass69-knownfix-testonly.XXXXXX)
git -C /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505 worktree add --detach "$TMPDIR_PATH" 3cba2b1e56a98787de08dc6c7df2434759e8f908
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules "$TMPDIR_PATH/node_modules"
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/vendor "$TMPDIR_PATH/vendor"
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/build "$TMPDIR_PATH/build"
git -C "$TMPDIR_PATH" cherry-pick -n 83a8f05dc91
npm --prefix "$TMPDIR_PATH" run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='does not encode top-level block moves as sibling content rewrites|encodes top-level block moves as array operations instead of rich-text rewrites|keeps peers converged when a top-level move follows remote insertions and deletions|preserves applied remote rich-text edits when a stale local snapshot reports a top-level move'
```

Result: exit code `1`. Three proof tests fail on known-fixes: the original
integrated `Y.Map` remains at the moved position, no top-level `Y.Array`
insert/delete delta fires, and the two-doc convergence test ends with
`[ "Inserted paragraph", "Moved paragraph", "Moved paragraph" ]`.

Fresh known-fixes browser control on the same base also still fails:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=21767 RTC_MANIFEST_WS_FIXED_PORT=1 npm run wp-env status
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 WP_ENV_PHPMYADMIN_PORT=9026 RTC_MANIFEST_WS_START_PORT=21770 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass69-knownfix-e2e npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
sed -n '1,260p' /tmp/07f8-pass69-knownfix-e2e/attempt-1.json
```

Results: wp-env was running at `http://localhost:9903`; Playwright failed with
exit code `1` after 44.0s at final convergence; saved attempt post ID was
`457`; primary was `[ inserted, sibling, moved ]`; secondary was
`[ inserted, moved, moved ]`. The generated artifacts exist under
`/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/test/e2e/artifacts/test-results/editor-collaboration-triag-c1f21-ic-ec47-realistic-attempt-1-chromium/`;
both screenshots are `1280 x 720` PNGs and `trace.zip` is readable.

The existing annotated headless video remains present and valid:

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames -show_entries format=duration,size -of default=noprint_wrappers=1 artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4
file artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218-frame.png artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4
ls -l artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4 artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218-frame.png
```

Result: H.264, `2560x900`, 30 fps, 360 frames, 12.0s, 296057 bytes; companion
frame is a `2560 x 900` PNG; both files are present under
`/Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218/artifacts/fuzz-bug-videos/`.

Fresh origin analysis still pins introduction to
`84019935998c16f877e976ad85e84748355d7282`, PR
https://github.com/WordPress/gutenberg/pull/72262, merged 2025-10-14.
`git log --follow -- packages/core-data/src/utils/crdt-blocks.ts` shows that
commit as the file introduction. `git show --stat` shows it added
`packages/core-data/src/utils/crdt-blocks.ts` with 503 lines. GitHub connector
metadata describes the PR as recursively inspecting `blocks`, isolating atomic
changes, and representing data with Y.js shared types. `git blame origin/trunk
-L 415,635 -- packages/core-data/src/utils/crdt-blocks.ts` attributes the
left/right positional sweep, update loop, delete/insert shape, and duplicate
clientId cleanup to that original commit, with later rich-text/schema changes
layered on top. The missing invariant is structural: when the same unique
`clientId` set appears in a different order, the writer must emit top-level
array operations, not mutate the `Y.Map` already occupying each slot.

Nearby known-fixes PR https://github.com/WordPress/gutenberg/pull/77980 merged
as `02bfdaa5ca96deb050cd0c40bad1c1da75858caf` on 2026-05-05. GitHub connector
metadata and `git show --stat` confirm it changes the HTTP polling sync server
compaction path and a backport changelog only, not `crdt-blocks.ts`. The
pass-69 controls confirm it does not fix this operation-shape bug. `gh` itself
was not installed in the environment (`zsh:1: command not found: gh`), so PR
metadata came from the installed GitHub connector.

## Pass 68 update

Pass 68 re-read the pass-67 summary, source JSONL row, source log, error
context, failure screenshots, trace action stream, source spec, current PR
branch, CRDT merge code, and GitHub metadata for the origin and nearby
known-fixes PRs. The classification remains a real RTC product bug.

The fresh source-row check still shows a failed, non-timeout browser run:

```bash
rg '07f8eb5c4218' /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1/fuzz-handoff/distinct-manifest-20260505/results-refresh-http-shard-1/results.jsonl | jq -r '"result=\(.result) exitCode=\(.exitCode) timedOut=\(.timedOut) durationMs=\(.durationMs) startedAt=\(.startedAt) completedAt=\(.completedAt)"'
```

Result:

```text
result=failed exitCode=1 timedOut=false durationMs=47666 startedAt=2026-05-05T10:14:48.655Z completedAt=2026-05-05T10:15:36.321Z
```

The source trace and screenshots show ordinary editor actions only: create the
post through REST setup, open two editor sessions, delete the heading with
Block tools -> Options -> Delete, insert a paragraph with Options -> Add
before, type the inserted paragraph, then click the toolbar Move down button.
The final editor state is materialized on both pages, but the pages disagree:

```text
primary:   [ inserted paragraph, sibling paragraph, moved paragraph ]
secondary: [ inserted paragraph, moved paragraph, moved paragraph ]
```

Pass 68 added a narrower root-cause verification over pass 67 by rerunning the
same first-commit repro tests against the known-fixes base with four focused
invariants, including the direct object-identity check:

```bash
TMPDIR_PATH=$(mktemp -d /private/tmp/gutenberg-07f8-pass68-knownfix-testonly.XXXXXX)
git worktree add --detach "$TMPDIR_PATH" 3cba2b1e56a98787de08dc6c7df2434759e8f908
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules "$TMPDIR_PATH/node_modules"
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/vendor "$TMPDIR_PATH/vendor"
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/build "$TMPDIR_PATH/build"
git -C "$TMPDIR_PATH" cherry-pick -n 83a8f05dc91
cd /private/tmp/gutenberg-07f8-pass68-knownfix-testonly.A7201k
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='does not encode top-level block moves as sibling content rewrites|encodes top-level block moves as array operations instead of rich-text rewrites|keeps peers converged when a top-level move follows remote insertions and deletions|preserves applied remote rich-text edits when a stale local snapshot reports a top-level move'
```

Result: exit code `1`. Three tests fail on known-fixes:

- `does not encode top-level block moves as sibling content rewrites`: the
  unfixed writer keeps the original integrated `Y.Map` objects at positions 0
  and 1, proving the local "move" was implemented as positional content
  replacement.
- `encodes top-level block moves as array operations instead of rich-text
  rewrites`: no top-level `Y.Array` insert/delete delta is observed.
- `keeps peers converged when a top-level move follows remote insertions and
  deletions`: the two-doc sequence ends at
  `[ "Inserted paragraph", "Moved paragraph", "Moved paragraph" ]` instead of
  `[ "Inserted paragraph", "Sibling paragraph", "Moved paragraph" ]`.

The stale remote-rich-text preservation guard passes on known-fixes, which is
expected; it is a guard for the chosen fix, not the original duplicate/drop
defect.

Fresh known-fixes browser control also still fails on base
`3cba2b1e56a98787de08dc6c7df2434759e8f908`:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=21767 RTC_MANIFEST_WS_FIXED_PORT=1 npm run wp-env status
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 WP_ENV_PHPMYADMIN_PORT=9026 RTC_MANIFEST_WS_START_PORT=21770 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass68-knownfix-e2e npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: wp-env was already running at `http://localhost:9903`; the browser
run failed with exit code `1` after 44.7s. The saved attempt at
`/tmp/07f8-pass68-knownfix-e2e/attempt-1.json` has primary
`[ inserted, sibling, moved ]` and secondary `[ inserted, moved, moved ]`.

The PR branch still has exactly the requested three-commit order on top of
`origin/trunk`:

```text
83a8f05dc91 Add RTC top-level block move unit repro
b5f65cb9968 Add RTC top-level block move Playwright repro
9490b2b7af1 Fix RTC top-level block move reconciliation
```

Fresh pass-68 verification on PR head `9490b2b7af1`:

```bash
git diff --check origin/trunk..HEAD
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='does not encode top-level block moves as sibling content rewrites|encodes top-level block moves as array operations instead of rich-text rewrites|keeps peers converged when a top-level move follows remote insertions and deletions|preserves applied remote rich-text edits when a stale local snapshot reports a top-level move'
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 npm run wp-env status
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ENV_PHPMYADMIN_PORT=9090 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass68-fixed-pr-e2e npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: whitespace check passed; the focused unit run passed `4 passed`; the
full `crdt-blocks.ts` suite passed `77 passed`; focused JS lint exited `0`;
wp-env was running at `http://localhost:9900`; the natural-user Playwright
repro passed in 21.8s.

The existing annotated headless video still satisfies the artifact requirement:

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames -show_entries format=duration,size -of default=noprint_wrappers=1 artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4
file artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218-frame.png artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4
```

Result: H.264, `2560x900`, 30 fps, 360 frames, 12.0s, 296057 bytes; frame PNG
is `2560 x 900`; MP4 is ISO Media.

Origin analysis remains pinned to
`84019935998c16f877e976ad85e84748355d7282`, `Improve CRDT "merge logic" for
post entities (#72262)`, merged 2025-10-14. GitHub metadata for
https://github.com/WordPress/gutenberg/pull/72262 says the PR introduced
recursive block inspection and Y.js shared types for post entities. `git show`
confirms that commit created `packages/core-data/src/utils/crdt-blocks.ts`.
`git blame origin/trunk -L 415,635 -- packages/core-data/src/utils/crdt-blocks.ts`
keeps the left/right sweep structure, update loop, delete, insert, and duplicate
clientId cleanup attributed to `84019935998c` with later edits layered on top.
That original positional sweep updates the existing `Y.Map` at a slot when two
same-identity blocks are presented in a different order; it has no invariant
that a same-`clientId` reorder must emit a structural `Y.Array` operation.

Nearby known-fixes commit
`02bfdaa5ca96deb050cd0c40bad1c1da75858caf`, PR
https://github.com/WordPress/gutenberg/pull/77980, was merged on 2026-05-05
for simultaneous offline reconnect compaction handling. GitHub metadata and
`git show --stat` both show it only changes the HTTP polling sync server and a
backport changelog, not `crdt-blocks.ts`; the pass-68 known-fixes controls
confirm it does not fix this operation-shape bug.

## Pass 67 update

Pass 67 re-read the pass-66 summary, source JSONL row, source failure log,
source error context, source screenshots, source Playwright trace action stream,
the known-fixes spec, the PR branch code/tests, and the explanation branch. The
classification remains a real RTC product bug. The source run had
`timedOut:false` and failed only after the natural editor action sequence
completed and final editor states differed:

```text
primary:   [ inserted paragraph, sibling paragraph, moved paragraph ]
secondary: [ inserted paragraph, moved paragraph, moved paragraph ]
```

Pass 67 found one procedural gap in the existing PR branch: extra non-Playwright
regression tests were in the fix commit. I rewrote the PR branch to preserve the
same final tree while making the requested commit layering exact:

```text
83a8f05dc91 Add RTC top-level block move unit repro
b5f65cb9968 Add RTC top-level block move Playwright repro
9490b2b7af1 Fix RTC top-level block move reconciliation
```

The known-fixes low-level control was rerun against base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` with only the new first commit
applied in
`/private/tmp/gutenberg-07f8-pass67-knownfix-reordered-commit1.m1jkXP`:

```bash
git worktree add --detach /private/tmp/gutenberg-07f8-pass67-knownfix-reordered-commit1.m1jkXP 3cba2b1e56a98787de08dc6c7df2434759e8f908
cd /private/tmp/gutenberg-07f8-pass67-knownfix-reordered-commit1.m1jkXP
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/vendor vendor
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/build build
git cherry-pick -n 83a8f05dc91
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='preserves applied remote rich-text edits when a stale local snapshot reports a top-level move|keeps peers converged when a top-level move follows remote insertions and deletions|encodes top-level block moves as array operations instead of rich-text rewrites'
```

Result: exit code `1`. The operation-shape check still observed no structural
top-level `Y.Array` delta on known-fixes, and the two-doc repro still ended at
`[ inserted, moved, moved ]` instead of `[ inserted, sibling, moved ]`.

Fresh known-fixes natural browser control on the same base also still failed:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=21767 RTC_MANIFEST_WS_FIXED_PORT=1 npm run wp-env status
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 WP_ENV_PHPMYADMIN_PORT=9026 RTC_MANIFEST_WS_START_PORT=21770 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass67-knownfix-e2e npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: wp-env was running at `http://localhost:9903`; the Playwright repro
failed after 43.6s at final convergence. The saved attempt at
`/tmp/07f8-pass67-knownfix-e2e/attempt-1.json` again has primary
`[ inserted, sibling, moved ]` and secondary `[ inserted, moved, moved ]`.

Fresh fixed-head verification on rewritten PR head `9490b2b7af1`:

```bash
git diff --check origin/trunk..HEAD
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 npm run wp-env status
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ENV_PHPMYADMIN_PORT=9090 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass67-fixed-pr-e2e-9490 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: whitespace check passed; full `crdt-blocks.ts` suite passed with
`77 passed`; focused JS lint exited `0`; wp-env was running at
`http://localhost:9900`; and the natural-user Playwright repro passed in
21.8s.

The annotated headless video remains present and readable:

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames -show_entries format=duration,size -of default=noprint_wrappers=1 artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4
file artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218-frame.png
```

Result: H.264, `2560x900`, 30 fps, 360 frames, 12.0s, 296057 bytes; companion
frame PNG is `2560 x 900`.

## Pass 66 update

Pass 66 independently re-read the pass-65 summary, the source JSONL row, the
source failure log, source error context, both failure screenshots, the
Playwright trace action stream, the current PR branch, and the current
explanation branch. The classification remains a real Gutenberg RTC product
bug. The trace shows ordinary editor UI operations only: delete the heading via
the block options menu, insert a paragraph with the Add before menu item, type
the inserted paragraph, then click the toolbar Move down button. The failure is
not a timeout, malformed spec, locator issue, readiness wait, inverted
assertion, or expected collaborative result; the run reaches final state
comparison and one peer has duplicated the moved paragraph while dropping the
sibling paragraph.

Current `origin/trunk` is still
`64575b44eb6a18f9324a84a634d70ddbaee3b748`, and the PR branch remains exactly
three commits on top of it:

```text
ce44c9e0e4d Add RTC top-level block move unit repro
2958607bd22 Add RTC top-level block move Playwright repro
9b48765544e Fix RTC top-level block move reconciliation
```

Fresh pass-66 known-fixes low-level control used base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` in
`/private/tmp/gutenberg-07f8-pass66-knownfix-testonly.dRpgip`. Applying only
the unit-repro commit and running the focused invariants failed with the same
operation-shape proof as pass 65:

```bash
git worktree add --detach /private/tmp/gutenberg-07f8-pass66-knownfix-testonly.dRpgip 3cba2b1e56a98787de08dc6c7df2434759e8f908
cd /private/tmp/gutenberg-07f8-pass66-knownfix-testonly.dRpgip
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/vendor vendor
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/build build
git cherry-pick -n ce44c9e0e4d
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='does not encode top-level block moves|encodes top-level block moves|keeps peers converged'
```

Result: exit code `1`. The unfixed writer retained original top-level
`Y.Map` identities, did not emit a top-level `Y.Array` structural delta, and
left the two-doc sequence at `[ inserted, moved, moved ]`.

Fresh pass-66 known-fixes browser reproduction first hit an early transport
readiness failure after the heading delete; the clean rerun reached the final
move and reproduced the product bug:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 WP_ENV_PHPMYADMIN_PORT=9026 RTC_MANIFEST_WS_START_PORT=21767 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass66-knownfix-e2e-rerun npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: exit code `1` after 43.7s. Saved state at
`/tmp/07f8-pass66-knownfix-e2e-rerun/attempt-1.json` showed primary
`[ inserted, sibling, moved ]` and secondary
`[ inserted, moved, moved ]`.

Fresh pass-66 fixed-branch verification on PR head `9b48765544e`:

```bash
git diff --check origin/trunk..HEAD
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ENV_PHPMYADMIN_PORT=9090 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass66-fixed-pr-e2e npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: whitespace check passed; the full `crdt-blocks.ts` suite passed with
`77 passed`; focused JS lint exited `0`; and the natural-user Playwright repro
passed in 21.2s.

Pass 66 also verified the existing annotated headless video is still present
and readable:

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames -show_entries format=duration,size -of default=noprint_wrappers=1 artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4
```

Result: H.264, `2560x900`, 30 fps, 360 frames, 12.0s, 296057 bytes. The
companion frame
`artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218-frame.png`
shows both editor screens, labels the primary expected order and collaborator
duplicate order, and includes the action/result annotation.

The origin analysis remains pinned to
`84019935998c16f877e976ad85e84748355d7282`, merged via
https://github.com/WordPress/gutenberg/pull/72262 on 2025-10-14. That PR
introduced `packages/core-data/src/utils/crdt-blocks.ts` and the positional
merge loop. GitHub metadata describes the PR as recursively inspecting `blocks`
to isolate atomic changes and representing data with Y.js shared types; the
missing invariant is that a same-`clientId` top-level reorder must be encoded
as a structural array change, not as content replacement of the Y.Map already
occupying that slot. The nearby
https://github.com/WordPress/gutenberg/pull/77980 fix for simultaneous offline
reconnect compactions was merged on 2026-05-05 but does not touch
`crdt-blocks.ts` and does not address this operation-shape bug.

## Pass 65 update

Pass 65 re-read the pass-64 summary, the source result JSONL row, source
failure log, source error context, trace listing, current PR branch, current
explanation branch, and CRDT merge code. The classification is still a real
Gutenberg RTC product bug. The source and fresh known-fixes browser runs both
complete the natural user action sequence and fail only at the final convergence
check:

```text
primary:   [ inserted paragraph, sibling paragraph, moved paragraph ]
secondary: [ inserted paragraph, moved paragraph, moved paragraph ]
```

`origin/trunk` had advanced to
`64575b44eb6a18f9324a84a634d70ddbaee3b748`, so pass 65 rebased both branches
onto that trunk tip. The PR branch still has exactly three commits:

```text
ce44c9e0e4d Add RTC top-level block move unit repro
2958607bd22 Add RTC top-level block move Playwright repro
9b48765544e Fix RTC top-level block move reconciliation
```

Pass 65 added a new independent lower-level proof in a throwaway known-fixes
worktree at `/private/tmp/gutenberg-07f8-pass65-knownfix-testonly.opLQhy`.
Applying only the unit-repro commit to base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` still failed the expected
correctness tests:

```bash
git worktree add --detach /private/tmp/gutenberg-07f8-pass65-knownfix-testonly.opLQhy 3cba2b1e56a98787de08dc6c7df2434759e8f908
cd /private/tmp/gutenberg-07f8-pass65-knownfix-testonly.opLQhy
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/vendor vendor
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/build build
git cherry-pick -n ce44c9e0e4d
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='does not encode top-level block moves|encodes top-level block moves|keeps peers converged'
```

Result: exit code `1`. The unfixed code kept the original `Y.Map` identities,
observed no top-level `Y.Array` insert/delete delta, and left the two-doc
sequence at `[ inserted, moved, moved ]`.

The pass-65-only proof test then asserted the broken operation shape directly
and passed on known-fixes:

```bash
npm run test:unit -- packages/core-data/src/utils/test/pass65-top-level-move-proof.ts --runTestsByPath
```

It verifies the writer's local JSON appears reordered while `yblocks.get(0)`
and `yblocks.get(1)` remain the original integrated `Y.Map` objects, no
top-level `Y.Array` structural delta fires, and a `Y.Text` update does fire.
That is the causality chain behind the browser split: the writer rewrites block
contents in place instead of broadcasting a structural array operation.

Fresh pass-65 known-fixes browser reproduction:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 WP_ENV_PHPMYADMIN_PORT=9023 RTC_MANIFEST_WS_START_PORT=21665 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass65-knownfix-e2e npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: exit code `1` after 44.2s, with saved state at
`/tmp/07f8-pass65-knownfix-e2e/attempt-1.json` showing the same primary
`[ inserted, sibling, moved ]` and secondary `[ inserted, moved, moved ]`
split.

While re-verifying the rebased PR branch, the first browser reruns failed before
the action sequence because the branch's fixture waited for the rendered
`Collaborators list` button. The source known-fixes fixture had already been
hardened to wait for transport-level awareness peer count, which is the
readiness condition the repro actually needs. Pass 65 folded that readiness
wait into the Playwright repro commit. This does not inject state or mutate
blocks; the browser repro still uses normal editor actions for delete, insert
before, and move down.

Fresh fixed-branch verification on PR head
`9b48765544e`:

```bash
git diff --check origin/trunk..HEAD
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 WP_ENV_PHPMYADMIN_PORT=9090 RTC_MANIFEST_WS_START_PORT=20466 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass65-fixed-pr-fresh2 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: whitespace check passed; the full `crdt-blocks.ts` suite passed with
`77 passed`; focused JS lint exited `0`; and the natural-user Playwright repro
passed in 21.6s. The local wp-env had to be restarted after freeing one stale
Docker bridge network; phpMyAdmin was moved to port `9090` because port `9000`
was occupied.

Video verification remains valid:

```bash
ffprobe -v error -show_entries stream=codec_name,width,height,nb_frames,r_frame_rate -show_entries format=duration,size -of default=noprint_wrappers=1 artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4
file artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218-frame.png
```

Result: H.264, `2560x900`, 30 fps, 360 frames, 12.0s, 296057 bytes; companion
PNG is `2560 x 900`.

## Pass 64 update

Pass 64 independently re-read the pass-63 summary, the source JSONL row, the
source failure log, the source error context, both source failure screenshots,
the extracted Playwright trace listing, the current PR branch, the current
explanation branch, and the CRDT merge implementation. The classification is
still a real Gutenberg RTC product bug, not a timeout, locator miss, malformed
generated spec, inverted assertion, or expected behavior. The source run had
`timedOut:false`, exited `1`, and failed only after both editors were loaded and
the final collaborative states differed:

```text
primary:   [ inserted paragraph, sibling paragraph, moved paragraph ]
secondary: [ inserted paragraph, moved paragraph, moved paragraph ]
```

Fresh pass-64 known-fixes low-level control used base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` in
`/private/tmp/gutenberg-07f8-pass64-knownfix-testonly.m4siu8`. Applying only
unit-repro commit `6191854a170` and running the focused invariants still failed
all three checks:

```bash
git worktree add --detach /private/tmp/gutenberg-07f8-pass64-knownfix-testonly.m4siu8 3cba2b1e56a98787de08dc6c7df2434759e8f908
cd /private/tmp/gutenberg-07f8-pass64-knownfix-testonly.m4siu8
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/vendor vendor
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/build build
git cherry-pick -n 6191854a170e8f1110f3a7a4dc66d5f0d037aaa4
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='does not encode top-level block moves|encodes top-level block moves|keeps peers converged'
```

Result: exit code `1`. The unfixed merge kept the original `Y.Map` identity for
the first reordered block, observed no top-level `Y.Array` insert/delete delta,
and left the two-doc sequence at `[ inserted, moved, moved ]`.

Fresh pass-64 known-fixes natural-user browser rerun:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=21664 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass64-knownfix-e2e npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: exit code `1` after 44.2s with the same split. The saved state is
`/tmp/07f8-pass64-knownfix-e2e/attempt-1.json`, and the pass-64 artifacts
include trace/screenshots under
`fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-64/known-fixes-e2e-rerun/`.

Fresh pass-64 fixed-branch verification on PR head
`86824261224e1a6cf344202f38cd87b014a36c52`:

```bash
git diff --check origin/trunk..HEAD
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass64-fixed-pr npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: whitespace check passed; full `crdt-blocks.ts` unit suite passed with
`77 passed`; focused JS lint exited `0`; and the natural-user Playwright repro
passed in 21.2s. `ffprobe` verified the existing annotated headless video as
H.264, 2560x900, 30 fps, 360 frames, 12.0s. No PR-branch code changes were
needed in pass 64 because the existing three-commit branch still satisfies the
requested standard:

```text
6191854a170 Add RTC top-level block move unit repro
f48329c0def Add RTC top-level block move Playwright repro
86824261224 Fix RTC top-level block move reconciliation
```

## Pass 63 update

Pass 63 re-read the pass-62 summary, source result row, source failure log,
error context, source/current specs, CRDT merge implementation, known-fixes
base, current PR branch, and the video artifact. The classification is still a
real Gutenberg RTC product bug. The source run and a fresh known-fixes rerun
both finish the natural user action sequence and fail only when final
collaborative state is compared:

```text
primary:   [ inserted paragraph, sibling paragraph, moved paragraph ]
secondary: [ inserted paragraph, moved paragraph, moved paragraph ]
```

Fresh pass-63 known-fixes low-level control used base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` in
`/private/tmp/gutenberg-07f8-pass63-knownfix-testonly.Qc2OXi`. Applying only
unit-repro commit `6191854a170` and running the focused invariants still failed
all three checks:

```bash
git worktree add --detach /private/tmp/gutenberg-07f8-pass63-knownfix-testonly.Qc2OXi 3cba2b1e56a98787de08dc6c7df2434759e8f908
cd /private/tmp/gutenberg-07f8-pass63-knownfix-testonly.Qc2OXi
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules 2>/dev/null || true
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/vendor vendor 2>/dev/null || true
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/build build 2>/dev/null || true
git cherry-pick -n 6191854a170
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='does not encode top-level block moves|encodes top-level block moves|keeps peers converged'
```

Result: exit code `1`. The unfixed code keeps the original `Y.Map` identities
during a same-`clientId` reorder, emits no top-level `Y.Array` delete/insert
delta, and leaves the two-doc sequence at
`[ inserted, moved, moved ]` instead of `[ inserted, sibling, moved ]`.

Fresh pass-63 known-fixes natural-user browser rerun:

```bash
rm -rf /tmp/07f8-pass63-knownfix-source
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=21663 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass63-knownfix-source npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: exit code `1` in 43.7s with the same final split. The saved attempt JSON
is `/tmp/07f8-pass63-knownfix-source/attempt-1.json`.

Pass 63 adds an improved fix on top of the previous PR branch. The previous fix
rebuilt the reordered range from the incoming editor snapshot. A new focused
unit test showed a narrower failure mode: if the Y.Doc already contains a peer
rich-text edit but the local editor snapshot reporting the move is stale, that
snapshot can overwrite the peer edit while rebuilding the moved range. The fix
commit now rebuilds the moved range from the current CRDT block state keyed by
`clientId`, then treats that range as structural-only for the remainder of the
same merge pass. Stable prefix/suffix blocks still flow through the normal diff,
so same-snapshot edits on stable edges continue to merge.

The intentionally stronger throwaway check for a truly unseen concurrent edit to
the moved item still fails with any delete+insert representation: Yjs `Array`
does not expose a move primitive, and deleting the original item tombstones
unseen edits to that item. That remains a model-level residual risk of the
current block-as-array-item representation, not a regression in this patch.

Fresh fixed-branch verification on PR head
`86824261224e6c151c4f6cac5b1322255410a02c`:

```bash
git diff --check origin/trunk..HEAD
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
rm -rf /tmp/07f8-pass63-fixed-pr
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass63-fixed-pr npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: whitespace check passed; the full `crdt-blocks.ts` suite passed with
`77 passed`; focused JS lint exited `0`; and the natural-user Playwright repro
passed in 20.5s. A root `node ./bin/build.mjs --help` probe entered the build
path and failed before production bundling in unrelated theme color-token
generation with `TypeError: [object Object] is not a valid color space`; no
generated build artifacts were committed.

The PR branch still has the requested three-commit order:

```text
6191854a170 Add RTC top-level block move unit repro
f48329c0def Add RTC top-level block move Playwright repro
86824261224 Fix RTC top-level block move reconciliation
```

The annotated headless video remains:
`/Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218/artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4`.

## Pass 62 update

Pass 62 independently rechecked the source row, source failure log, current
spec, CRDT merge code, current PR branch, current explanation branch, and the
existing video artifact. The classification remains a real product defect, not
a malformed generated spec, readiness-only wait, locator failure, environment
failure, inverted assertion, or expected behavior. The source and fresh
known-fixes runs both reach loaded editor states and then fail because the two
peers disagree on the final block list:

```text
primary:   [ inserted paragraph, sibling paragraph, moved paragraph ]
secondary: [ inserted paragraph, moved paragraph, moved paragraph ]
```

The pass-62 known-fixes low-level control used a fresh throwaway worktree at
`/private/tmp/gutenberg-07f8-pass62-knownfix-testonly.vqqQfn`. Applying only
the unit-repro commit `6191854a170` to base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` and running the focused tests still
failed all three expected-correctness invariants:

```bash
git worktree add --detach /private/tmp/gutenberg-07f8-pass62-knownfix-testonly.vqqQfn 3cba2b1e56a98787de08dc6c7df2434759e8f908
cd /private/tmp/gutenberg-07f8-pass62-knownfix-testonly.vqqQfn
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules 2>/dev/null || true
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/vendor vendor 2>/dev/null || true
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/build build 2>/dev/null || true
git cherry-pick -n 6191854a170
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='does not encode top-level block moves|encodes top-level block moves|keeps peers converged'
```

Result: exit code `1`. The first block kept the original `Y.Map`, no
top-level `Y.Array` insert/delete delta was observed, and the two-document
sequence ended with `[ inserted, moved, moved ]`.

Pass 62 also reran the natural-user browser repro on the known-fixes base using
the already-running wp-env on HTTP port `9903`:

```bash
rm -rf /tmp/07f8-pass62-knownfix-source
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=21662 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass62-knownfix-source npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: exit code `1` in 43.6s. The saved state at
`/tmp/07f8-pass62-knownfix-source/attempt-1.json` has the same split shown
above.

Fresh fixed-branch verification on PR head
`6bdd62e6595123dd3320df4737397261ca3b3d77`:

```bash
git diff --check origin/trunk..HEAD
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
rm -rf /tmp/07f8-pass62-fixed-pr
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass62-fixed-pr npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: whitespace check passed; the full `crdt-blocks.ts` suite passed with
`76 passed`; focused JS lint exited `0`; and the natural-user Playwright repro
passed in 22.2s. `origin/trunk` remained
`0742e801c4e12ee31316faa1f8ed9be11a4782c7`, so the PR branch still contains
exactly the requested three commits:

```text
6191854a170 Add RTC top-level block move unit repro
f48329c0def Add RTC top-level block move Playwright repro
6bdd62e6595 Fix RTC top-level block move reconciliation
```

The existing annotated headless video remains valid:
`/Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218/artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4`.
`ffprobe` reports H.264, 2560x900, 30 fps, 360 frames, 12.0s, 296057 bytes;
the companion frame is a 2560x900 PNG.

## Pass 61 update

Pass 61 re-read the pass-60 summary, source JSONL row, archived failure log,
source spec, error context, screenshots, trace archive listing, current PR
branch, current explanation branch, CRDT merge code, test coverage, and the
existing annotated video. The source failure still classifies as a real product
defect. The generated spec uses normal editor actions only: delete the heading
through the block toolbar menu, insert a paragraph before the collaborator's
selected paragraph, then move the original paragraph down through the toolbar.
It does not inject malformed blocks, mutate the block tree directly, or assert
an inverted expected state.

Fresh pass-61 known-fixes browser reproduction on base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` used the already-running wp-env on
HTTP port `9903`:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 npm run wp-env status
rm -rf /tmp/07f8-pass61-knownfix-source
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=21610 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass61-knownfix-source npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: `wp-env` was already running; the e2e command exited `1` in 44.7s.
The console logged a late `HttpPollingProvider` 403, but the run reached and
recorded the same product split as the archived source failure. The saved
attempt JSON at `/tmp/07f8-pass61-knownfix-source/attempt-1.json` showed:

```text
primary:   [ inserted paragraph, sibling paragraph, moved paragraph ]
secondary: [ inserted paragraph, moved paragraph, moved paragraph ]
```

The fresh screenshots at
`/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/test/e2e/artifacts/test-results/editor-collaboration-triag-c1f21-ic-ec47-realistic-attempt-1-chromium/test-failed-1.png`
and `test-failed-2.png` show loaded editors with the same final visible block
lists. The trace archive is present at the same directory as `trace.zip`.

Pass 61 also added a narrower root-cause proof in a throwaway known-fixes
worktree. First, applying only PR commit `6191854a170` and running the
expected-correctness invariants still failed:

```bash
tmpdir=$(mktemp -d /private/tmp/gutenberg-07f8-pass61-knownfix.XXXXXX)
git worktree add --detach "$tmpdir" 3cba2b1e56a98787de08dc6c7df2434759e8f908
cd "$tmpdir"
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules 2>/dev/null || true
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/vendor vendor 2>/dev/null || true
cp -R /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/build build 2>/dev/null || true
git cherry-pick -n 6191854a170
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='does not encode top-level block moves|encodes top-level block moves|keeps peers converged'
```

Result: exit code `1` in
`/private/tmp/gutenberg-07f8-pass61-knownfix.asDGW9`. The three failed
assertions were the expected unfixed behavior: the same-clientId reorder kept
the original `Y.Map` instance, no top-level `Y.Array` insert/delete delta was
observed, and the two-document sequence ended as
`[ inserted, moved, moved ]`.

Then a pass-61-only temporary test asserted the broken operation shape
directly:

```bash
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='pass 61 proof'
```

Result: exit code `0`, `1 passed`. The proof test swapped two top-level blocks
with the same unique `clientId` set and verified all of the following on the
known-fixes base:

```text
yblocks.get(0) is still the original first Y.Map
yblocks.get(1) is still the original second Y.Map
the writer's local JSON nevertheless appears reordered
no top-level Y.Array delete/insert delta fires
at least one Y.Text event fires
```

That is the minimal causality chain: the writer's local JSON can look correct
because existing block maps are rewritten in place, while a peer receives text
and map rewrites attached to stale block identities instead of the structural
array operation needed to represent the move.

Fresh fixed-branch verification on PR head
`6bdd62e6595123dd3320df4737397261ca3b3d77`:

```bash
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
git diff --check origin/trunk..HEAD
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
rm -rf /tmp/07f8-pass61-fixed-pr
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass61-fixed-pr npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: `wp-env` was already running on HTTP port `9900`; whitespace check
passed; the full `crdt-blocks.ts` suite passed with `76 passed`; focused JS
lint exited `0`; and the natural-user Playwright repro passed in 20.9s.
The PR branch still contains exactly the requested three commits:

```text
6191854a170 Add RTC top-level block move unit repro
f48329c0def Add RTC top-level block move Playwright repro
6bdd62e6595 Fix RTC top-level block move reconciliation
```

Pass 61 rechecked the annotated headless video at
`/Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218/artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4`.
`ffprobe` reports H.264, 2560x900, 30 fps, 360 frames, 12.0s, 296057 bytes.
The companion frame shows both editor panes, the natural action log, and the
observed secondary duplicate/missing-sibling state.

## Pass 60 update

Pass 60 independently re-read the pass-59 summary, source JSONL row, archived
failure log, source spec, error context, screenshots, trace archive listing,
current PR branch, current explanation branch, CRDT merge code, and test
coverage. The archived failure still classifies as a real product defect. The
source run did not hit the global timeout, the actions were normal editor
operations, both screenshots show a loaded editor after the action sequence,
and the only meaningful failure is the final convergence split:

```text
primary:   [ inserted paragraph, sibling paragraph, moved paragraph ]
secondary: [ inserted paragraph, moved paragraph, moved paragraph ]
```

The pass-60 low-level known-fixes negative control still reproduces the
operation-shape bug on base `3cba2b1e56a98787de08dc6c7df2434759e8f908`.
Applying only PR commit `6191854a170` to a clean temporary worktree and running
the focused tests failed all three invariants:

```bash
tmpdir=$(mktemp -d /private/tmp/gutenberg-07f8-pass60-knownfix-testonly.XXXXXX)
git worktree add --detach "$tmpdir" 3cba2b1e56a98787de08dc6c7df2434759e8f908
cd "$tmpdir"
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules 2>/dev/null || true
git cherry-pick -n 6191854a170
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='does not encode top-level block moves|encodes top-level block moves|keeps peers converged'
```

Result: exit code `1` in
`/private/tmp/gutenberg-07f8-pass60-knownfix-testonly.bTsOXX`. The failures
showed the unpatched behavior directly: the first block kept the old `Y.Map`
identity, no top-level `Y.Array` insert/delete delta was observed, and the
two-document sequence ended as `[ inserted, moved, moved ]` instead of
`[ inserted, sibling, moved ]`.

The pass-60 known-fixes browser reruns on HTTP port `9903` were not used as
product-bug evidence because both hit a separate readiness/authorization path:
`HttpPollingProvider` returned 403 during mutual discovery before the final
move-corruption check. The archived source run and pass-59 known-fixes browser
run remain valid natural-user browser evidence for the defect; pass 60 adds the
fresh low-level negative control above and a fresh fixed-branch browser
positive control below.

Fresh fixed-branch verification on PR head
`6bdd62e6595123dd3320df4737397261ca3b3d77`:

```bash
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 npm run wp-env status
git diff --check origin/trunk..HEAD
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass60-fixed-pr npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: `wp-env` was already running on HTTP port `9900`, whitespace check
passed, the full `crdt-blocks.ts` suite passed with `76 passed`, focused JS
lint exited `0`, and the natural-user Playwright repro passed in 21.6s. The PR
branch still contains exactly the requested three commits:

```text
6191854a170 Add RTC top-level block move unit repro
f48329c0def Add RTC top-level block move Playwright repro
6bdd62e6595 Fix RTC top-level block move reconciliation
```

Pass 60 also rechecked the existing annotated headless video rather than
regenerating it. The file is still present at
`/Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218/artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4`
and `ffprobe` reports H.264, 2560x900, 30 fps, 360 frames, 12.0s. The companion
frame shows both editor panes, the natural action log, and the observed
secondary duplicate/missing-sibling state.

## Pass 59 update

Pass 59 re-read the source result row, the source spec, the source failure log,
the failure screenshots, the error context, the trace archive listing, the
pass-58 summary, the current PR branch, and current `origin/trunk`. The source
failure is still a product defect, not a readiness wait, locator problem,
malformed generated spec, environment failure, inverted assertion, or expected
behavior. The failing run completed the natural editor actions and then failed
only while waiting for convergence. The saved source state split is:

```text
primary:   [ inserted paragraph, sibling paragraph, moved paragraph ]
secondary: [ inserted paragraph, moved paragraph, moved paragraph ]
```

Pass 59 adds a narrower root-cause proof. The minimal bad case is not general
block insertion/deletion. It is a same-length top-level reorder where the
current and incoming block arrays contain the same unique `clientId` set in a
different order. In unpatched code, the left/right equal-block sweep reaches
the update loop with no array insertion or deletion to perform, so the update
loop mutates each existing `Y.Map` at its position into the incoming sibling.
That makes the writer's final JSON look plausible locally, but peers receive
rich-text/map rewrites on the old block identities rather than a top-level
`Y.Array` structural change. This is why one peer can retain
`[ inserted, sibling, moved ]` while the other receives
`[ inserted, moved, moved ]`.

Fresh known-fixes negative controls on base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` still reproduce the bug. Applying
only PR commit `6191854a170` to a clean temporary worktree and running the
focused unit repro failed all three checks:

```bash
git worktree add --detach /private/tmp/gutenberg-07f8-pass59-knownfix-testonly.lDCDuu 3cba2b1e56a98787de08dc6c7df2434759e8f908
cd /private/tmp/gutenberg-07f8-pass59-knownfix-testonly.lDCDuu
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules 2>/dev/null || true
git cherry-pick -n 6191854a170
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='does not encode top-level block moves|encodes top-level block moves|keeps peers converged'
```

Result: exit code `1`. The failures were the expected operation-shape
invariant breaks: the moved block kept the original `Y.Map`, no top-level
`Y.Array` insert/delete delta was observed, and the two-document repro ended
with `[ inserted, moved, moved ]` instead of
`[ inserted, sibling, moved ]`.

The archived natural-user browser repro was also rerun against the same
known-fixes base with `wp-env` already running on HTTP port `9903`:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=21479 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass59-knownfix-source npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: exit code `1` in 43.4s. The saved attempt JSON at
`/tmp/07f8-pass59-knownfix-source/attempt-1.json` showed the same stable split:
the primary editor had the inserted paragraph, the sibling paragraph, then the
moved paragraph; the secondary editor had the inserted paragraph followed by
two copies of the moved paragraph.

Fresh fixed-branch verification on PR head
`6bdd62e6595123dd3320df4737397261ca3b3d77`:

```bash
git diff --check origin/trunk..HEAD
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass59-fixed-pr npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: whitespace check passed, the full `crdt-blocks.ts` suite passed with
`76 passed`, focused JS lint exited `0`, and the natural-user Playwright repro
passed in 20.8s. `origin/trunk` is still
`0742e801c4e12ee31316faa1f8ed9be11a4782c7`; the PR branch remains the requested
three commits. The annotated headless video remains valid at
`/Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218/artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4`
and was rechecked as H.264, 2560x900, 30 fps, 360 frames, 12.0s.

## Pass 58 update

Pass 58 re-read the pass-57 summary, the source JSONL row, archived source
spec, failure log, error context, screenshots, trace archive, current CRDT
merge code, current PR branch diff, `git blame`, `git log`, and GitHub
metadata for WordPress/gutenberg#72262. The source failure still classifies as
a real product defect: the natural editor actions completed, then convergence
polling found a stable split where the primary editor had
`[ inserted, sibling, moved ]` and the secondary editor had
`[ inserted, moved, moved ]`.

Pass 58 also rebased the PR branch onto current `origin/trunk`
`0742e801c4e12ee31316faa1f8ed9be11a4782c7` after trunk advanced by the
unrelated media-editor commit `0742e801c4e` (#77906). The PR branch remains
exactly three commits:

```text
6191854a170 Add RTC top-level block move unit repro
f48329c0def Add RTC top-level block move Playwright repro
6bdd62e6595 Fix RTC top-level block move reconciliation
```

Fresh known-fixes negative controls still reproduce the bug. Applying only the
rebased unit repro commit `6191854a170` to known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` failed all three focused
low-level tests. The failures prove the operation-shape bug directly: the
same-clientId top-level reorder keeps the original `Y.Map` instances, emits no
top-level `Y.Array` insert/delete delta, and the two-document sequence ends
with `[ inserted, moved, moved ]` instead of
`[ inserted, sibling, moved ]`.

The archived natural-user browser repro was rerun against the same known-fixes
base on HTTP port `9903` with one attempt:

```bash
WP_ENV_PORT=9903 WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=21459 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass58-knownfix-source npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: exit code `1`; `/tmp/07f8-pass58-knownfix-source/attempt-1.json`
again showed:

```text
primary:   [ inserted paragraph, sibling paragraph, moved paragraph ]
secondary: [ inserted paragraph, moved paragraph, moved paragraph ]
```

Fresh fixed-branch verification after the rebase:

```bash
git diff --check origin/trunk..HEAD
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass58-fixed-pr npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: whitespace check passed, full `crdt-blocks.ts` passed with
`76 passed`, focused JS lint exited `0`, and the natural-user Playwright repro
passed in 21.4s. The existing annotated headless video remains valid at
`/Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218/artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4`;
pass 58 verified it as H.264, 2560x900, 30 fps, 360 frames, 12.0s, with both
editor panes and expected/observed annotations visible in the mid-frame.

## Pass 57 update

Pass 57 re-read the pass-56 summary, the source JSONL row, archived source
spec, failure log, error context, screenshots, trace action records, current
PR branch diff, current explanation branch, video still frame, CRDT merge code,
`git blame`, and GitHub metadata for WordPress/gutenberg#72262. The source
failure is still a product-shaped RTC convergence bug, not a generated-spec or
environment artifact: the Playwright trace records normal editor toolbar/menu
actions completing before the final convergence wait, and the screenshots show
the final split with the collaborator missing the sibling paragraph.

Fresh known-fixes negative controls still reproduce the defect. Applying the
test-only repro commit `31b8c119558a3261618ec93ef6fb032552b5ac86` to
known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908` failed all three
focused low-level tests:

```text
does not encode top-level block moves as sibling content rewrites
encodes top-level block moves as array operations instead of rich-text rewrites
keeps peers converged when a top-level move follows remote insertions and deletions
```

The low-level failure is the same invariant break: the same-clientId reorder
keeps the original first `Y.Map`, emits no top-level `Y.Array` insert/delete
delta, and the two-document sequence ends as
`[ inserted, moved, moved ]` instead of
`[ inserted, sibling, moved ]`.

The natural-user browser repro against the same known-fixes base also failed in
44.1s with the same stable split:

```text
primary:   [ inserted paragraph, sibling paragraph, moved paragraph ]
secondary: [ inserted paragraph, moved paragraph, moved paragraph ]
```

Fresh fixed-branch verification at pass 57:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218
git diff --check origin/trunk..HEAD
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass57-fixed-pr npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: whitespace check passed, full `crdt-blocks.ts` passed with
`76 passed`, focused JS lint exited `0`, and the natural-user Playwright repro
passed in 20.2s. `origin/trunk` remains
`02bfdaa5ca96deb050cd0c40bad1c1da75858caf`; the PR branch remains exactly the
requested three commits. The existing annotated headless video is still valid:
H.264, 2560x900, 30 fps, 360 frames, 12.0s, and its mid-frame shows both editor
panes plus expected/observed annotations.

## Pass 56 update

Pass 56 independently re-read the pass-55 summary, source JSONL row, archived
source spec, failure log, screenshots, error context, trace action records,
current explanation branch, PR branch, CRDT merge code, and origin metadata.
The source trace confirms the failing path used normal editor operations only:
toolbar-menu Delete for the seed heading, toolbar-menu Add before plus typing
for the collaborator insertion, and toolbar Move down for the original
paragraph. No locator/action failed before the final convergence check.

Fresh known-fixes negative controls still reproduce the defect at both levels.
Applying the test-only repro commit
`31b8c119558a3261618ec93ef6fb032552b5ac86` to known-fixes base
`3cba2b1e56a98787de08dc6c7df2434759e8f908` failed the focused CRDT tests: the
same-clientId reorder kept the original first `Y.Map`, emitted no top-level
`Y.Array` insert/delete delta, and the two-document sequence ended
`[ inserted, moved, moved ]` instead of `[ inserted, sibling, moved ]`.

The natural-user browser repro against the same known-fixes base failed in
43.4s with the same split:

```text
primary:   [ inserted paragraph, sibling paragraph, moved paragraph ]
secondary: [ inserted paragraph, moved paragraph, moved paragraph ]
```

Fresh fixed-branch verification at pass 56:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218
git diff --check origin/trunk..HEAD
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass56-fixed-pr npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: whitespace check passed, full `crdt-blocks.ts` passed with
`76 passed`, focused JS lint exited `0`, and the natural-user Playwright repro
passed in 19.7s. `origin/trunk` is still
`02bfdaa5ca96deb050cd0c40bad1c1da75858caf`; the PR branch remains exactly the
requested three commits, and the existing annotated headless video remains
valid at
`/Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218/artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4`.

## Pass 55 update

Pass 55 added a fresh side-by-side operation-shape check. At the test-only
repro commit `31b8c119558a3261618ec93ef6fb032552b5ac86`, the focused tests:

```bash
cd /private/tmp/gutenberg-07f8-pass55-prefix.RXAW4Y
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='does not encode top-level block moves|encodes top-level block moves'
```

failed with the exact low-level invariant break: after a top-level reorder,
`yblocks.get( 0 )` was still the original first `Y.Map`, and no top-level
`Y.Array` insert/delete delta was observed. Running the same two tests at fixed
PR head `2cea4b0ed14343e3df03335d7a4a28cf96309898` passed.

I also rechecked the supplied known-fixes base `3cba2b1e56a98787de08dc6c7df2434759e8f908`.
Applying the test-only repro commit in a fresh worktree and running the focused
low-level repro failed with three product-shaped failures, including the
two-document convergence check ending as:

```text
[ inserted, moved, moved ]
```

instead of:

```text
[ inserted, sibling, moved ]
```

The natural-user browser repro against the same known-fixes base also failed in
43.5s with the same stable editor split. This is not a readiness-only failure.

Fresh fixed-branch verification at pass 55:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218
git diff --check origin/trunk..HEAD
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass55-fixed-pr npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: whitespace check passed, the full `crdt-blocks.ts` suite passed with
`76 passed`, focused JS lint exited `0`, and the natural-user Playwright repro
passed in 20.3s. The existing annotated video remains valid:
`/Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218/artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4`.

## Pass 54 update

Pass 54 added an independent known-fixes-base low-level proof. I applied the
test-only repro commit `31b8c119558a3261618ec93ef6fb032552b5ac86` to a fresh
temporary worktree at known-fixes base `3cba2b1e56a` and ran:

```bash
cd /private/tmp/gutenberg-07f8-pass54-knownfix-testonly.N6KGuN
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='top-level block moves|keeps peers converged|preserves unchanged top-level edges|stable edge content changes'
```

Result: exit code `1`. The known-fixes base still rewrites sibling block maps
in place, emits no top-level `Y.Array` insert/delete delta for the move, and
the two-document convergence repro ends with `[ inserted, moved, moved ]`
instead of `[ inserted, sibling, moved ]`.

I also reran the natural-user browser path on the known-fixes base:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20965 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass54-knownfix-base-rerun npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
sed -n '1,260p' /tmp/07f8-pass54-knownfix-base-rerun/attempt-1.json
```

Result: exit code `1`; the attempt JSON again showed:

```text
primary:   [ inserted paragraph, sibling paragraph, moved paragraph ]
secondary: [ inserted paragraph, moved paragraph, moved paragraph ]
```

The fixed PR branch still passes the full low-level suite, lint, and the
natural-user Playwright repro:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass54-fixed-pr npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: `76 passed` for `crdt-blocks.ts`, JS lint exit code `0`, and the
natural-user Playwright repro passed in 20.6s. `gh` is not installed in this
environment, so pass 54 used the GitHub connector to re-check
WordPress/gutenberg#72262 metadata: it was created on 2025-10-10, merged on
2025-10-14, and merged as
`84019935998c16f877e976ad85e84748355d7282`.

## Pass 53 update

Pass 53 independently re-read the pass-52 summary, source JSONL entry, archived
source spec, source failure log, error context, screenshots, trace archive
listing, relevant CRDT code, current explanation branch, current PR branch, and
the annotated video still frame. The bug still classifies as a real RTC product
defect, not a generated-test or environment artifact.

Pass-53 addition beyond pass 52: fresh verification that the existing branch,
tests, fix, and video still satisfy the requested standard, plus GitHub
connector metadata for the introducing PR. The connector reports
WordPress/gutenberg#72262, `Improve CRDT "merge logic" for post entities`, was
merged on 2025-10-14 with merge commit
`84019935998c16f877e976ad85e84748355d7282`. Its stated goal was to recursively
inspect `blocks` and represent data with appropriate Yjs shared types; the
positional block-array merge introduced there still does not represent
top-level reorders as top-level Y.Array structural operations.

Fresh source and artifact checks:

```bash
sed -n '1,260p' /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-52/07f8eb5c4218.summary.md
rg -n "07f8eb5c4218|rtc_top_level_block_move_duplicates_paragraph|ec47d94c5251|drops_sibling" /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1/fuzz-handoff/distinct-manifest-20260505/results-refresh-http-shard-1/results.jsonl
sed -n '1,360p' /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1/test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
sed -n '1,260p' /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1/fuzz-handoff/distinct-manifest-20260505/results-refresh-http-shard-1/logs/0010-07f8eb5c4218-rtc-top-level-block-move-duplicates-paragraph-and-drops-sibling-after-collaborative-structural-edits.log
sed -n '1,260p' /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1/fuzz-handoff/distinct-manifest-20260505/results-refresh-http-shard-1/outputs/0010-07f8eb5c4218/playwright-artifacts/test-results/editor-collaboration-triag-c1f21-ic-ec47-realistic-attempt-1-chromium/error-context.md
find /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1/fuzz-handoff/distinct-manifest-20260505/results-refresh-http-shard-1/outputs/0010-07f8eb5c4218 -maxdepth 6 -type f
unzip -l /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1/fuzz-handoff/distinct-manifest-20260505/results-refresh-http-shard-1/outputs/0010-07f8eb5c4218/playwright-artifacts/test-results/editor-collaboration-triag-c1f21-ic-ec47-realistic-attempt-1-chromium/trace.zip
```

The source test uses natural editor actions only: toolbar delete of the initial
heading, toolbar/menu insertion before the first paragraph by the collaborator,
and toolbar move-down of the original paragraph by the primary editor. The
source result did not hit the global timeout (`timedOut:false`), and both the
source log and screenshots show a completed action sequence with a stable split:

```text
primary:   [ inserted paragraph, sibling paragraph, moved paragraph ]
secondary: [ inserted paragraph, moved paragraph, moved paragraph ]
```

Fresh known-fixes-base browser repro:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
npm run wp-env status
WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20953 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass53-knownfix-base npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
sed -n '1,260p' /tmp/07f8-pass53-knownfix-base/attempt-1.json
```

Result: known-fixes `wp-env` was already running on port `9903`; the test
failed in 43.0s with the same split above. This confirms the supplied
known-fixes base still does not fix this bug.

Fresh non-Playwright operation-shape repro:

```bash
cd /private/tmp/gutenberg-07f8-pass46-unit-repro-07f8
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='top-level block moves|keeps peers converged|preserves unchanged top-level edges|stable edge content changes'
```

Result at test-only commit `31b8c119558a3261618ec93ef6fb032552b5ac86`: exit
code `1`. The identity check failed because `yblocks.get( 0 )` was still the
original first Y.Map after a top-level move, and the operation-shape check
failed because no top-level Y.Array insert/delete delta was observed. The
two-doc convergence smoke and stable-edge preservation checks passed, which
narrows the defect to operation encoding rather than a simple final-JSON
calculation error.

Fresh origin analysis:

```bash
git fetch origin trunk
git rev-parse origin/trunk
git show origin/trunk:packages/core-data/src/utils/crdt-blocks.ts
git blame origin/trunk -L 520,651 -- packages/core-data/src/utils/crdt-blocks.ts
git log --oneline --decorate -- packages/core-data/src/utils/crdt-blocks.ts
git show --stat --oneline 84019935998c16f877e976ad85e84748355d7282
git show -s --format=%B 84019935998c16f877e976ad85e84748355d7282
```

Result: `origin/trunk` is still
`02bfdaa5ca96deb050cd0c40bad1c1da75858caf`. `git blame` attributes the
positional update/delete/insert skeleton to
`84019935998c16f877e976ad85e84748355d7282`, with later commits adjusting
attribute and rich-text handling but not adding a top-level move operation.

Fresh fixed-branch verification:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218
npm run wp-env status
git status --short --branch
git log --oneline --reverse origin/trunk..HEAD
git diff --check origin/trunk..HEAD
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='top-level block moves|keeps peers converged|preserves unchanged top-level edges|stable edge content changes'
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass53-fixed-pr npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: PR `wp-env` was already running on port `9900`; worktree clean;
`git diff --check` passed; focused unit passed (`5 passed`, `71 skipped`);
full `crdt-blocks.ts` passed (`76 passed`); focused JS lint passed; and the
natural-user Playwright repro passed (`1 passed`, 20.4s). The PR branch still
has exactly the requested commit order:

```text
31b8c119558 Add RTC top-level block move unit repro
29f92800391 Add RTC top-level block move Playwright repro
2cea4b0ed14 Fix RTC top-level block move reconciliation
```

Video verification:

```bash
ffprobe -v error -show_entries stream=codec_name,width,height,nb_frames -show_entries format=duration,size -of default=noprint_wrappers=1 /Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218/artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4
```

Result: H.264, `2560x900`, 360 frames, 12.0s, 296057 bytes. The pass-53 still
frame inspection again shows both editor panes plus the natural action and
expected/observed annotations. The existing annotated headless video remains
the correct artifact:
`/Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218/artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4`.

## Pass 52 update

Pass 52 re-read the pass-51 summary, source JSONL entry, archived source spec,
source failure log, error context, trace/screenshot artifact list, current PR
branch, current explanation branch, and `mergeCrdtBlocks()` again. The bug
still classifies as a real RTC product defect. The existing PR branch, Markdown
explanation branch, and annotated headless video still satisfy the requested
standard.

Fresh source/negative-classification checks:

```bash
sed -n '1,240p' /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-51/07f8eb5c4218.summary.md
rg -n "07f8eb5c4218|rtc_top_level_block_move_duplicates_paragraph_and_drops_sibling_after_collaborative_structural_edits|triage-ec47d94c5251" /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1/fuzz-handoff/distinct-manifest-20260505/results-refresh-http-shard-1/results.jsonl /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505 -g '*.md' -g '*.jsonl' -g '*.spec.ts'
sed -n '1,360p' /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1/test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
sed -n '1,260p' /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1/fuzz-handoff/distinct-manifest-20260505/results-refresh-http-shard-1/logs/0010-07f8eb5c4218-rtc-top-level-block-move-duplicates-paragraph-and-drops-sibling-after-collaborative-structural-edits.log
sed -n '1,220p' /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1/fuzz-handoff/distinct-manifest-20260505/results-refresh-http-shard-1/outputs/0010-07f8eb5c4218/playwright-artifacts/test-results/editor-collaboration-triag-c1f21-ic-ec47-realistic-attempt-1-chromium/error-context.md
find /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1/fuzz-handoff/distinct-manifest-20260505/results-refresh-http-shard-1/outputs/0010-07f8eb5c4218 -maxdepth 5 -type f | sort | sed -n '1,200p'
```

The archived source spec uses normal editor actions only: delete the initial
heading through the block toolbar menu, insert a paragraph before the original
first paragraph through the block toolbar menu, and move the original paragraph
down with the toolbar. The source result did not time out globally
(`timedOut:false`), and the failure log plus error context capture a stable live
editor split after those actions completed:

```text
primary:   [ inserted paragraph, sibling paragraph, moved paragraph ]
secondary: [ inserted paragraph, moved paragraph, moved paragraph ]
```

That rules out the main false-positive explanations again: no malformed block
tree injection, no direct state mutation, no locator-only failure, no inverted
assertion, and no expected behavior.

Fresh environment and known-fixes checks:

```bash
cd /Users/danluu/dev/fuzz/gutenberg
git fetch origin trunk
git rev-parse origin/trunk

cd /Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218
npm run wp-env status

cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
npm run wp-env status
WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20852 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass52-knownfix-base npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
sed -n '1,260p' /tmp/07f8-pass52-knownfix-base/attempt-1.json
```

Results: `origin/trunk` remained
`02bfdaa5ca96deb050cd0c40bad1c1da75858caf`. The PR worktree `wp-env` was
running on port `9900`; the known-fixes base was running on port `9903`.
Known-fixes failed in 43.1s with the same primary/secondary split above, proving
the bug is not fixed by the supplied known-fixes base.

Pass-52 addition: a fresh root-cause audit tied the source behavior to the
lowest-level failed invariant. In `origin/trunk`, a pure reorder of two
top-level blocks makes the left/right sweep in `mergeCrdtBlocks()` choose
`left = 0`, `right = 0`, `numOfUpdatesNeeded = 2`,
`numOfInsertionsNeeded = 0`, and `numOfDeletionsNeeded = 0`. The loop at
`packages/core-data/src/utils/crdt-blocks.ts:494` then writes incoming block
fields into `yblocks.get( 0 )` and `yblocks.get( 1 )` in place, so the Yjs
document emits child map/rich-text rewrites instead of a top-level `Y.Array`
structural change. The duplicate-clientId cleanup cannot repair this because
the final clientId set remains unique after the identity swap. `git blame`
shows that update path came from
`84019935998c16f877e976ad85e84748355d7282` (`Improve CRDT "merge logic" for
post entities (#72262)`). `gh` is not installed in this environment, so the PR
metadata check was limited to local git commit metadata and history.

Root-cause commands:

```bash
git show origin/trunk:packages/core-data/src/utils/crdt-blocks.ts | nl -ba | sed -n '420,650p'
git blame -L 520,651 -- packages/core-data/src/utils/crdt-blocks.ts
git log --oneline --decorate -- packages/core-data/src/utils/crdt-blocks.ts | sed -n '1,40p'
git show -s --format='%H%n%an%n%ad%n%s' --date=iso-strict 84019935998c16f877e976ad85e84748355d7282
git show -s --format='%B' 84019935998c16f877e976ad85e84748355d7282 | sed -n '1,80p'
```

Fresh low-level pre-fix repro:

```bash
cd /private/tmp/gutenberg-07f8-pass46-unit-repro-07f8
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='top-level block moves|keeps peers converged|preserves unchanged top-level edges'
```

Result at `31b8c119558a3261618ec93ef6fb032552b5ac86`: exit code `1`.
The object-identity and top-level-array operation-shape checks failed, while
the two-doc convergence smoke and stable-edge preservation checks passed. This
is the narrowest useful non-Playwright proof: pre-fix local JSON can look
plausible while the CRDT operation shape is wrong.

Fresh fixed-branch checks:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218
git status --short --branch
git log --oneline --reverse origin/trunk..HEAD
git diff --check origin/trunk..HEAD
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern='top-level block moves|keeps peers converged|preserves unchanged top-level edges|stable edge content changes'
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass52-fixed-pr npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: worktree clean; `git diff --check` passed; focused unit passed
(`5 passed`); full `crdt-blocks.ts` passed (`76 passed`); focused JS lint
passed; and the natural-user Playwright repro passed (`1 passed`, 20.9s). The
PR branch still has exactly the requested commit order:

```text
31b8c119558 Add RTC top-level block move unit repro
29f92800391 Add RTC top-level block move Playwright repro
2cea4b0ed14 Fix RTC top-level block move reconciliation
```

Video verification:

```bash
ffprobe -v error -show_entries stream=codec_name,width,height,nb_frames -show_entries format=duration,size -of default=noprint_wrappers=1 /Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218/artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4
sips -g pixelWidth -g pixelHeight /Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218/artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218-frame.png
```

Result: H.264, `2560x900`, 360 frames, 12.0s, 296057 bytes; verified still
frame `2560x900`. Headless frame inspection shows both editor panes, the
natural action sequence, and the expected/observed duplicate/drop annotation.

## Pass 51 update

Pass 51 independently re-read the source result JSONL entry, archived source
spec, source log, error context, screenshots, trace archive listing, current
PR-branch tests, and `mergeCrdtBlocks()` again. The bug remains a real RTC
product defect, and the existing explanation branch, PR branch, and annotated
headless video still satisfy the requested standard.

Fresh known-fixes-base command:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20851 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass51-knownfix-base npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: exit code `1`, one failed test after 42.9s. The fresh dump at
`/tmp/07f8-pass51-knownfix-base/attempt-1.json` again shows:

```text
primary:   [ inserted paragraph, sibling paragraph, moved paragraph ]
secondary: [ inserted paragraph, moved paragraph, moved paragraph ]
```

The archived source trace is present and contains Playwright trace files,
network logs, page snapshots, and screenshot resources. The source spec and
fresh rerun both use normal editor actions only: delete the heading from the
block toolbar, insert a paragraph before the first paragraph from the block
options menu, and move the original paragraph down with the toolbar. The final
failure is read from both live editor states after action completion, so this is
not a readiness wait, action-locator-only error, malformed block injection,
inverted assertion, environment failure, or expected behavior.

Fresh low-level pre-fix command:

```bash
cd /private/tmp/gutenberg-07f8-pass46-unit-repro-07f8
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="top-level block moves|keeps peers converged|preserves unchanged top-level edges"
```

Result at `31b8c119558a3261618ec93ef6fb032552b5ac86`: exit code `1`. The
identity and operation-shape checks failed, while the two-doc final-state smoke
and stable-edge check passed. This keeps the narrow root-cause proof intact:
the pre-fix code can produce locally plausible block JSON while emitting the
wrong CRDT operation shape.

Fresh fixed-branch checks:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="top-level block moves|keeps peers converged|preserves unchanged top-level edges|stable edge content changes"
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass51-fixed-pr npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: focused unit check passed (`5 passed`), full `crdt-blocks.ts` passed
(`76 passed`), focused JS lint passed, `git diff --check` passed, and the
natural-user Playwright repro passed (`1 passed`, 20.9s total). The PR branch
still has exactly the requested three commits:

```text
31b8c119558 Add RTC top-level block move unit repro
29f92800391 Add RTC top-level block move Playwright repro
2cea4b0ed14 Fix RTC top-level block move reconciliation
```

Pass 51 also rechecked the annotated video artifact with `ffprobe`, `sips`, and
visual frame inspection. It remains H.264 `2560x900`, 360 frames, 12.0s, and
the still frame shows both editor panes, the natural action log, and the
expected/observed duplicate/drop outcome.

## Pass 50 update

Pass 50 re-read the pass-49 summary, source JSONL entry, generated source
spec, archived source failure log, source error context, fresh branch state,
current PR-branch tests, and `mergeCrdtBlocks()` again. The bug still
classifies as a real RTC product defect.

Fresh known-fixes-base command:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20850 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass50-knownfix-base npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: exit code `1`, one failed test after 44.7s. The fresh dump at
`/tmp/07f8-pass50-knownfix-base/attempt-1.json` again shows the stable
non-converged split:

```text
primary:   [ inserted paragraph, sibling paragraph, moved paragraph ]
secondary: [ inserted paragraph, moved paragraph, moved paragraph ]
```

This was run after `npm run wp-env status` confirmed the known-fixes wp-env was
already running on port `9903`. The failure happened after the natural editor
actions completed and the convergence helper read both live editor states, so
this is not a readiness wait, locator failure, malformed block injection,
inverted assertion, or expected behavior.

Pass 50's added root-cause proof is a line-level audit of the pre-fix merge
loop. In `origin/trunk`, `git blame -L 520,651 -- packages/core-data/src/utils/crdt-blocks.ts`
shows the left/right positional update loop descends from
`84019935998c16f877e976ad85e84748355d7282` (`Improve CRDT "merge logic" for
post entities (#72262)`) with later attribute-type edits layered on top. For a
pure two-block reorder, `left` and `right` both stay `0`,
`numOfUpdatesNeeded` becomes `2`, and both insertion/deletion counts are `0`.
The update loop then sets `localYBlock = yblocks.get( left )` and overwrites
that existing map with the incoming block at the same position. That mutates
the map that used to be the moved paragraph into the sibling paragraph, and
then mutates the sibling map into the moved paragraph. Since the final clientId
set is still unique, the duplicate-clientId cleanup never repairs the identity
swap. Peers receive child attribute/rich-text rewrites rather than a top-level
block-array structural change.

Fresh pre-fix low-level command:

```bash
cd /private/tmp/gutenberg-07f8-pass46-unit-repro-07f8
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="top-level block moves|keeps peers converged|preserves unchanged top-level edges"
```

Result at `31b8c119558a3261618ec93ef6fb032552b5ac86`: exit code `1`. The
identity proof and top-level `Y.Array` operation-shape proof failed, while the
two-doc final JSON convergence smoke and stable-edge preservation tests passed.
This is the important narrow failure mode: the old code can make local block
JSON look correct while still emitting the wrong CRDT operations.

Fresh fixed-branch checks:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="top-level block moves|keeps peers converged|preserves unchanged top-level edges|stable edge content changes"
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass50-fixed-pr npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: focused unit check passed (`5 passed`), full `crdt-blocks.ts` passed
(`76 passed`), focused JS lint passed, `git diff --check` passed, and the
natural-user Playwright repro passed (`1 passed`, 21.5s total). The PR branch
still has exactly the requested three commits:

```text
31b8c119558 Add RTC top-level block move unit repro
29f92800391 Add RTC top-level block move Playwright repro
2cea4b0ed14 Fix RTC top-level block move reconciliation
```

Remote `danluu` already matched the local PR branch at
`2cea4b0ed14343e3df03335d7a4a28cf96309898` before the pass-50 explanation
update. The existing annotated headless video remains the correct artifact for
this bug: `/Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218/artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4`.

## Pass 49 update

Pass 49 independently re-read the pass-48 summary, source result JSONL entry,
source spec, source failure log, error context, current explanation Markdown,
PR-branch diff, and CRDT merge code. The source and fresh failure both still
show the same non-converged final state:

```text
primary:   [ inserted paragraph, sibling paragraph, moved paragraph ]
secondary: [ inserted paragraph, moved paragraph, moved paragraph ]
```

The source spec uses normal editor actions only: delete the heading from the
block toolbar, insert a paragraph before the first paragraph from the block
options menu, and move the original paragraph down with the block toolbar. The
failure occurs after those actions complete and after the convergence wait reads
both live editors. This rules out a malformed generated block tree, direct state
mutation, locator-only error, inverted assertion, or expected behavior.

Fresh known-fixes-base command:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20849 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass49-knownfix-base npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: exit code `1`, one failed test after 43.4s. The fresh dump at
`/tmp/07f8-pass49-knownfix-base/attempt-1.json` again shows primary
`[ inserted, sibling, moved ]` and secondary `[ inserted, moved, moved ]`.
Fresh artifacts were written under
`/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/test/e2e/artifacts/test-results/editor-collaboration-triag-c1f21-ic-ec47-realistic-attempt-1-chromium/`.

Fresh low-level repro-only command:

```bash
cd /private/tmp/gutenberg-07f8-pass46-unit-repro-07f8
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="top-level block moves|keeps peers converged|preserves unchanged top-level edges"
```

Result at `31b8c119558`: exit code `1`. The object-identity and top-level
`Y.Array` operation-shape tests failed, while the two-doc final JSON convergence
smoke and stable-edge preservation test passed. This independently confirms the
old code can reach the right local JSON while encoding the top-level move as
wrong child-object rewrites.

Fresh fixed-branch checks:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="top-level block moves|keeps peers converged|preserves unchanged top-level edges|stable edge content changes"
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: focused unit check passed (`5 passed`), full `crdt-blocks.ts` passed
(`76 passed`), focused JS lint passed, `git diff --check` passed, and the
natural-user Playwright repro passed (`1 passed`, 20.3s total). `origin/trunk`
remained `02bfdaa5ca96deb050cd0c40bad1c1da75858caf`, and the PR branch still
has exactly the requested three commits:

```text
31b8c119558 Add RTC top-level block move unit repro
29f92800391 Add RTC top-level block move Playwright repro
2cea4b0ed14 Fix RTC top-level block move reconciliation
```

The pass-49 conclusion is that the existing PR branch, explanation branch, and
annotated headless video satisfy the requested standard. The new evidence is a
fresh known-fixes failure plus fresh pre-fix/fixed low-level and Playwright
verification against the same branch heads.

## Pass 48 update

Pass 48 re-read the source failure, screenshots, current branch contents, and
CRDT merge code, then added a new detached low-level event-shape proof.
`origin/trunk` remained `02bfdaa5ca96deb050cd0c40bad1c1da75858caf`
(`RTC: Fix divergence when two offline users reconnect (#77980)`), and the PR
branch still has the intended three-commit order:

```text
31b8c119558 Add RTC top-level block move unit repro
29f92800391 Add RTC top-level block move Playwright repro
2cea4b0ed14 Fix RTC top-level block move reconciliation
```

Fresh known-fixes-base command:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505
WP_BASE_URL=http://localhost:9903 RTC_MANIFEST_WS_START_PORT=20848 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass48-knownfix-base npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: exit code `1`, one failed test after 43.5s. The fresh dump at
`/tmp/07f8-pass48-knownfix-base/attempt-1.json` again showed primary
`[ inserted, sibling, moved ]` and secondary `[ inserted, moved, moved ]`.
This rerun used the requested known-fixes base checkout and its running wp-env
on port `9903`.

New pass-48 low-level proof: I added a temporary instrumented unit test in
detached worktrees at the repro-only commit and fixed commit. It observes the
deep Yjs events emitted by a two-block top-level reorder.

Pre-fix detached worktree:

```bash
cd /private/tmp/gutenberg-07f8-pass48-proof-prefix
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="logs pass 48 top-level block move event shape" --silent=false
```

At `31b8c119558`, the event summary was:

```json
[
  { "target": "y-map", "delta": [] },
  { "target": "y-text", "delta": [ { "insertLength": 7 }, { "delete": 5 } ] },
  { "target": "y-map", "delta": [] },
  { "target": "y-text", "delta": [ { "insertLength": 5 }, { "delete": 7 } ] }
]
```

There was no top-level block-array delete/insert event. The old algorithm
encoded the reorder as two child rich-text rewrites.

Fixed detached worktree:

```bash
cd /private/tmp/gutenberg-07f8-pass48-proof-fixed
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="logs pass 48 top-level block move event shape" --silent=false
```

At `2cea4b0ed14`, the event summary was:

```json
[
  { "target": "top-level-blocks-array", "delta": [ { "delete": 2 } ] },
  { "target": "top-level-blocks-array", "delta": [ { "insertLength": 2 } ] }
]
```

This is the narrower root-cause proof added in pass 48: the product failure is
not caused by the Playwright wait, locator sequence, or assertion. The pre-fix
merge emits the wrong CRDT operation shape for a normal top-level move.

Fresh fixed-branch checks:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="top-level block moves|keeps peers converged|preserves unchanged top-level edges|stable edge content changes"
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
git diff --check origin/trunk..HEAD
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: focused unit check passed (`5 passed`), full `crdt-blocks.ts` unit
file passed (`76 passed`), focused JS lint passed, and `git diff --check`
passed. The fixed natural-user Playwright repro passed (`1 passed`, 20.4s
total, 19.0s test time). The headless video was rechecked with
`ffprobe`/`sips`: H.264, `2560x900`, `360` frames, `12.000000s`, `296057`
bytes; verified still frame `2560x900`.

## Pass 47 update

Pass 47 independently rechecked the existing branches after fetching
`origin/trunk`; trunk remained `02bfdaa5ca96deb050cd0c40bad1c1da75858caf`, and
the PR branch remained exactly three commits ahead with the intended order:

```text
31b8c119558 Add RTC top-level block move unit repro
29f92800391 Add RTC top-level block move Playwright repro
2cea4b0ed14 Fix RTC top-level block move reconciliation
```

Fresh known-fixes command:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1
WP_BASE_URL=http://localhost:9601 RTC_MANIFEST_WS_START_PORT=20747 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass47-knownfix npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: exit code `1`, one failed test after 43.2s. The fresh state dump at
`/tmp/07f8-pass47-knownfix/attempt-1.json` again showed primary
`[ inserted, sibling, moved ]` and secondary `[ inserted, moved, moved ]`.
The fresh Playwright artifacts were written under
`test/e2e/artifacts/test-results/editor-collaboration-triag-c1f21-ic-ec47-realistic-attempt-1-chromium/`.

Fresh pre-fix unit command:

```bash
cd /private/tmp/gutenberg-07f8-pass46-unit-repro-07f8
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="top-level block moves|keeps peers converged|preserves unchanged top-level edges"
```

Result: exit code `1`. The identity proof and top-level Y.Array operation-shape
proof failed before the fix, while the two-doc JSON convergence smoke still
passed. This reconfirms that the low-level defect is not merely final JSON
ordering, but the wrong operation encoded into the Yjs document.

Fresh fixed-branch checks on `2cea4b0ed14`:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="top-level block moves|keeps peers converged|preserves unchanged top-level edges|stable edge content changes"
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
git diff --check origin/trunk..HEAD
```

Results: focused unit check passed (`5 passed`), full `crdt-blocks.ts` unit
file passed (`76 passed`), focused JS lint passed, natural-user Playwright repro
passed (`1 passed`, 20.7s total), and `git diff --check` passed.

Pass 47 also verified the existing annotated headless video:

```bash
ffprobe -v error -show_entries stream=codec_name,width,height,nb_frames -show_entries format=duration,size -of default=noprint_wrappers=1 artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4
sips -g pixelWidth -g pixelHeight artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218-frame.png
```

Result: H.264 video, `2560x900`, `360` frames, `12.000000s`, `296057` bytes;
the verified still frame is `2560x900` and shows both editor panes plus action
and result annotations.

## Pass 46 update

Pass 46 reconfirmed the bug on the refreshed known-fixes checkout and tightened
the PR-branch fix.

Fresh known-fixes command:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1
WP_BASE_URL=http://localhost:9601 RTC_MANIFEST_WS_START_PORT=20646 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass46-knownfix npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: exit code `1` after 42.7s. The primary editor ended with
`[ inserted, sibling, moved ]`, while the secondary editor ended with
`[ inserted, moved, moved ]`. The failed convergence state is recorded in
`/tmp/07f8-pass46-knownfix/attempt-1.json`.

Lowest-level pass-46 repro:

```bash
cd /private/tmp/gutenberg-07f8-pass46-unit-repro-07f8
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="top-level block moves|keeps peers converged|preserves unchanged top-level edges"
```

Run at `31b8c119558a3261618ec93ef6fb032552b5ac86`, this failed the Y.Map
identity check and the top-level Y.Array operation-shape check. The two-doc JSON
convergence smoke in that same run passed, which is the key narrow proof: final
serialized block order can look correct locally while the Yjs update encodes the
move as content rewrites on the wrong objects.

Pass 46 also found and fixed a weakness in the earlier repair: after rebuilding
the reordered middle range, the guard returned immediately. That preserved
stable prefix/suffix Y.Maps but could drop same-snapshot content changes on
those stable edges. The current PR branch removes that early return, lets the
normal diff merge stable-edge edits after the reorder repair, and adds
`merges stable edge content changes when block moves rebuild the reordered middle`.

Current PR-branch commit order:

```text
31b8c119558 Add RTC top-level block move unit repro
29f92800391 Add RTC top-level block move Playwright repro
2cea4b0ed14 Fix RTC top-level block move reconciliation
```

Fresh fixed-branch checks on `2cea4b0ed14`:

```bash
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: full `crdt-blocks.ts` unit file passed (`76 passed`), focused JS lint
passed, and the natural-action Playwright repro passed (`1 passed`, 21.3s).

## Source result

The source manifest entry was:

```json
{"key":"rtc_top_level_block_move_duplicates_paragraph_and_drops_sibling_after_collaborative_structural_edits::07f8eb5c4218::test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts","bugType":"rtc_top_level_block_move_duplicates_paragraph_and_drops_sibling_after_collaborative_structural_edits","signature":"07f8eb5c4218","specPath":"test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts","transport":"http","result":"failed","exitCode":1,"timedOut":false,"durationMs":47666,"startedAt":"2026-05-05T10:14:48.655Z","completedAt":"2026-05-05T10:15:36.321Z"}
```

## Reproductions

Low-level repro:

```bash
git checkout try/rtc-top-level-block-move-duplicates-paragraph-and-drops-si-07f8eb5c4218-pr
git checkout 79de3c4c40e
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="does not encode top-level block moves"
```

On the repro commit, the test fails because `mergeCrdtBlocks()` mutates the original Y.Map for the moved paragraph into the sibling paragraph instead of encoding a block move. The final `toJSON()` order can look correct, but the CRDT object identity is wrong.

Natural Playwright repro:

```bash
git checkout try/rtc-top-level-block-move-duplicates-paragraph-and-drops-si-07f8eb5c4218-pr
git checkout d34200f84a2
export WP_ENV_PORT=9911
export WP_BASE_URL=http://localhost:9911
export RTC_MANIFEST_WS_START_PORT=20488
export RTC_MANIFEST_WS_FIXED_PORT=1
npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

The Playwright repro uses normal editor actions only:

1. Primary editor deletes the seed heading with the block toolbar.
2. Collaborator inserts a paragraph before the first paragraph with the block options menu.
3. Primary editor moves the original paragraph down with the toolbar move-down button.
4. Both editors should converge to `[ inserted, sibling, moved ]`.

Without the fix, the secondary editor converges to `[ inserted, moved, moved ]`: the sibling paragraph disappears and the moved paragraph is duplicated.

## Known-fixes verification

The refreshed known-fixes base contains current `origin/trunk` plus the issue `#77716` known-fix stack. This bug still reproduces there.

Exact command:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1
WP_BASE_URL=http://localhost:9601 RTC_MANIFEST_WS_START_PORT=19800 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result on 2026-05-05: exit code `1`, one failed test. The failure was a non-convergence/divergence assertion:

```text
primary:   [ "RTC ec47 realistic inserted paragraph 1",
             "Another paragraph exists so the top-level list is not degenerate.",
             "Emoji and multibyte: hi ..., cafe, naive, ..." ]
secondary: [ "RTC ec47 realistic inserted paragraph 1",
             "Emoji and multibyte: hi ..., cafe, naive, ...",
             "Emoji and multibyte: hi ..., cafe, naive, ..." ]
```

Pass 38 repeated the same known-fixes command against `http://localhost:9601`
after the branches were rebased to current `origin/trunk`; it still failed
with the same primary/secondary split.

## Root cause

The structural bug is in `packages/core-data/src/utils/crdt-blocks.ts`, in `mergeCrdtBlocks()`.

`git blame` shows the left/right positional merge algorithm came from commit `84019935998c16f877e976ad85e84748355d7282`, `Improve CRDT "merge logic" for post entities (#72262)`: <https://github.com/WordPress/gutenberg/pull/72262>. That commit added the current `crdt-blocks.ts` utility and its initial unit tests.

The important pieces introduced by `#72262` are:

- `areBlocksEqual()` intentionally ignores `clientId`, because client IDs cannot be generated consistently across peers.
- `mergeCrdtBlocks()` finds equal prefixes and suffixes, then treats the remaining middle section as positional updates, followed by deletes and inserts.
- The update loop writes every incoming block property into the existing `Y.Map` at that index.

That combination is unsafe for reorders. In the failing shape, a peer has a local Y.Array equivalent to:

```text
[ inserted, moved, sibling ]
```

and then syncs an editor state equivalent to:

```text
[ inserted, sibling, moved ]
```

Because `clientId` is ignored for equality, the algorithm recognizes only the left `inserted` block as stable. The middle update loop then mutates the Y.Map that represented `moved` so it now contains `sibling`, and mutates the Y.Map that represented `sibling` so it now contains `moved`. That is not a move; it is a pair of content rewrites attached to the wrong CRDT objects.

This can escape simple JSON-order tests because `toJSON()` after a local reorder can still look like `[ inserted, sibling, moved ]`. Under collaboration, though, the Yjs update stream has communicated replacement of object contents rather than object ordering. Another peer can then merge the wrong identity changes and end up with a duplicate moved paragraph and a missing sibling.

Commit `128a3c29b7f1db4f35faf9e326dd1e5e7ac11104`, `Real-time collaboration: Expand mergeCrdtBlocks() automated testing (#75923)`, added useful edge coverage, including complex reorder checks. It did not assert that stable block IDs map to stable Y.Map identities. As a result, the test suite accepted the positional rewrite as long as the final serialized contents matched.

Commit `2eb9db13382153e3870951dc6d0f50c9ee5c916c`, `RTC: Enable RTC by default (#75739)`, did not introduce the merge algorithm, but it made this class of failure much more visible by enabling the RTC path by default.

The recent issue `#77716` known-fix stack did not address this because it focused on rich-text/cursor scoping and adjacent CRDT update issues. The relevant recent commit in this area, `54af1ce400687f2ba51fee6c440207a07af5d55f`, changed rich-text attribute update scoping, but it left the top-level block array's positional update semantics intact.

## Initial fix plan

1. Add a low-level repro that catches the identity bug directly: after a top-level reorder with unique `clientId`s, the old Y.Map at index 0 must not simply be rewritten into the block now expected at index 0.
2. Add a natural Playwright repro using toolbar delete, options-menu insert-before, and toolbar move-down.
3. In `mergeCrdtBlocks()`, detect a pure reorder when the current Y.Array and incoming block array have the same length, every block has a unique non-empty `clientId`, the sets match, and the order differs.
4. For that case, avoid the positional update loop. Yjs integrated array elements cannot be moved in place, so rebuild the reordered slice with fresh Y.Maps in incoming order.
5. Leave missing or duplicate clientId cases on the existing path, because the identity signal is not strong enough there.

## Audit

Kernel-maintainer robustness lens: the bad behavior comes from treating a move as a content rewrite. A robust fix should not rely on content similarity to infer identity when stable IDs exist. It should validate the identity signal before acting on it and avoid broad behavior changes for malformed or duplicate IDs.

Jepsen-style distributed-systems correctness lens: local JSON equality is not enough. The operation encoded into the shared document matters. Rewriting two CRDT objects can converge locally while communicating the wrong causal update to other replicas. Repro coverage needs at least one two-doc convergence check and one identity-preservation check.

Dan-Luu-style simplicity/performance/failure-mode skepticism lens: a full order-CRDT redesign would be cleaner semantically, but it is too large for this bug fix. A clever pseudo-move of integrated Yjs objects is risky because Yjs arrays do not support reinserting already-integrated types. Rebuilding the same-ID reordered slice is blunt, but the condition is narrow and the failure mode is understandable. The main cost is that rich-text CRDT identity inside moved blocks is replaced for this operation.

## Revised fix plan

The PR branch implements the narrow reorder guard:

- Add `getUniqueClientIdsFromBlocks()`, `getUniqueClientIdsFromYBlocks()`, and `getClientIdReorderRange()` helpers.
- Before the left/right positional merge, check for same-length, unique-clientId, same-set, different-order top-level arrays.
- If detected, replace only the changed middle range with freshly-created YBlocks in incoming order, preserving any unchanged prefix and suffix Y.Map identities.
- Add the low-level identity repro, an operation-shape repro, a stable-edge regression check, and a two-doc convergence check.
- Add the natural Playwright repro.

This is the smallest fix that stops encoding a move as sibling content replacement. The longer-term design should split block identity/content from block order, or implement an ID-aware array diff that can model moves without throwing away nested CRDT identity.

## Verification on the fix branch

Pass 37 rebased the explanation and PR branches onto `origin/trunk`
`384489f49ba` (`Fix flaky Menu test (#77972)`). The PR branch now contains
only the intended three commits:

```text
79de3c4c40e Add RTC top-level block move unit repro
d34200f84a2 Add RTC top-level block move Playwright repro
c93783a700b Fix RTC top-level block move reconciliation
```

Focused and full unit checks:

```bash
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="does not encode top-level block moves|keeps peers converged"
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
```

Result: both passed. Full file result was `73 passed`.

The rebased repro-only unit commit still fails before the fix:

```bash
git checkout 79de3c4c40e
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="does not encode top-level block moves|keeps peers converged"
```

Result: exit code `1`. The identity assertion fails because the Y.Map at index
0 remains the original moved paragraph object after the reorder. That is the
lowest-level proof that the old algorithm encodes the move as a sibling content
rewrite.

Headless Playwright check:

```bash
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 npm run wp-env start
WP_ENV_PORT=9900 WP_ENV_PHPMYADMIN_PORT=9092 docker compose -f /Users/danluu/.wp-env/wp-env-gutenberg-bug-07f8eb5c4218-8cecaee9/docker-compose.yml -p wp-env-gutenberg-bug-07f8eb5c4218-8cecaee9 exec -T cli wp option update wp_collaboration_enabled 1 --path=/var/www/html
WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result on the rebased PR branch `c93783a700b`: `1 passed` (`RTC top-level structural reconciliation › keeps a sibling after a paragraph is moved below it following collaborative edits`, 21.3s test time).

Pass 38 re-ran the fixed-branch checks on 2026-05-05:

```bash
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="does not encode top-level block moves|keeps peers converged"
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
git checkout 79de3c4c40e
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="does not encode top-level block moves|keeps peers converged"
git checkout try/rtc-top-level-block-move-duplicates-paragraph-and-drops-si-07f8eb5c4218-pr
WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
```

Results: focused unit check passed (`2 passed`), the full `crdt-blocks.ts`
unit file passed (`73 passed`), the repro-only unit commit failed before the
fix at `expect( yblocks.get( 0 ) ).not.toBe( originalFirstBlock )`, the fixed
natural-action Playwright repro passed (`1 passed`, 19.1s test time), and the
focused JS lint command passed.

The local Docker daemon had exhausted its predefined network pools, so the
pass-38 run used the same isolated workaround as pass 36/37: add an explicit
`192.168.250.0/24` subnet to this generated wp-env compose file and bring up
only this project with `docker compose up -d`. The existing wp-env volume also
still contained `WP_HOME`/`WP_SITEURL` constants for port `9911`; these generated
constants were changed to `9900` before the passing run.

Focused JS lint:

```bash
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
```

Result: passed.

Build note: `npm run build` failed in this local shared-dependency setup after `build:js` and `build:php` completed, while generating theme primitive color tokens (`colorjs.io` rejected a color space object). Direct `wp-build` also required package-local dependency symlinks and still stopped later on unrelated optional package-local dependencies. For the e2e check, I used the generated fixed `build/scripts/core-data` bundle together with the complete known-good build directory.

Annotated video:

```text
/Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218/artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4
```

Pass 39 re-verified the existing branches and video on 2026-05-05.

Source artifact review:

```bash
rg -n "07f8eb5c4218|ec47d94c5251|rtc_top_level_block_move_duplicates" /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1/fuzz-handoff/distinct-manifest-20260505/results-refresh-http-shard-1/results.jsonl
sed -n '1,260p' /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1/fuzz-handoff/distinct-manifest-20260505/results-refresh-http-shard-1/logs/0010-07f8eb5c4218-rtc-top-level-block-move-duplicates-paragraph-and-drops-sibling-after-collaborative-structural-edits.log
sed -n '1,240p' /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1/fuzz-handoff/distinct-manifest-20260505/results-refresh-http-shard-1/outputs/0010-07f8eb5c4218/playwright-artifacts/test-results/editor-collaboration-triag-c1f21-ic-ec47-realistic-attempt-1-chromium/error-context.md
unzip -l /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1/fuzz-handoff/distinct-manifest-20260505/results-refresh-http-shard-1/outputs/0010-07f8eb5c4218/playwright-artifacts/test-results/editor-collaboration-triag-c1f21-ic-ec47-realistic-attempt-1-chromium/trace.zip
```

The original shard result still shows a completed action path and then a final
convergence failure, not a readiness wait, locator miss, malformed generated
spec, environment failure, or inverted assertion. The visible final editor state
is split exactly as the normalized assertion reports.

Fresh pass-39 known-fixes rerun:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1
npm run wp-env status
curl -I --max-time 5 http://localhost:9601/wp-login.php
WP_BASE_URL=http://localhost:9601 RTC_MANIFEST_WS_START_PORT=20480 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass39-knownfix npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

`wp-env status` reported that checkout as uninitialized, but the test WordPress
container was still live on `localhost:9601`. The one-attempt rerun failed in
43.7s with the same product-state split:

```text
primary:   [ inserted paragraph 1, sibling paragraph, moved paragraph ]
secondary: [ inserted paragraph 1, moved paragraph, moved paragraph ]
```

Fresh pass-39 fixed-branch verification:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="does not encode top-level block moves|keeps peers converged"
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
```

Results: focused unit check passed (`2 passed`), and the full
`crdt-blocks.ts` unit file passed (`73 passed`).

Fresh pass-39 pre-fix repro check:

```bash
git worktree add --detach /private/tmp/gutenberg-07f8-pass39-prefix.fdpCqY/repo 79de3c4c40e
cd /private/tmp/gutenberg-07f8-pass39-prefix.fdpCqY/repo
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/vendor vendor
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/build build
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="does not encode top-level block moves|keeps peers converged"
```

Result: exit code `1`; the identity assertion failed at
`expect( yblocks.get( 0 ) ).not.toBe( originalFirstBlock )`. The companion
two-doc contents smoke check passed, reinforcing that content-only assertions
can miss the bad operation encoding.

Fresh pass-39 natural Playwright verification:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218
npm run wp-env status
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: the fixed natural-user-action repro passed (`1 passed`, 20.5s total).

Fresh pass-39 lint and video verification:

```bash
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
ls -l artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4 artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218-frame.png
ffprobe -v error -show_entries stream=codec_name,width,height -show_entries format=duration,size -of default=noprint_wrappers=1 artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4
```

Result: focused JS lint passed. The annotated video and verified frame are
present. `ffprobe` reported H.264, `2560x900`, `12.000000s`, `296057` bytes.

Pass-39 conclusion: the existing explanation branch, PR branch, and annotated
video already satisfy the requested standard. The added independent value in
this pass is a fresh known-fixes browser failure, fresh fixed-branch unit/e2e
passes, and a fresh pre-fix identity failure showing why the old positional
merge can look correct in JSON while still encoding the wrong CRDT operation.

Pass 40 rebased both branches onto current `origin/trunk`
`e7f55c1b4d2` (`Widget Types: server-side registry, decouple wp-build pages
(#77958)`) and added a narrower operation-level unit proof. The PR branch now
has this commit order:

```text
bad0f6893e6 Add RTC top-level block move unit repro
debd44478c0 Add RTC top-level block move Playwright repro
763af6e7649 Fix RTC top-level block move reconciliation
```

The new unit repro observes the Yjs transaction generated by a same-ID
top-level reorder. The fixed behavior must emit a top-level Y.Array operation
for the moved blocks and must not encode the move as nested rich-text rewrites.
The exact repro-only commit fails before the fix:

```bash
git worktree add --detach /private/tmp/gutenberg-07f8-pass40-prefix-final.HPuiLN/repo bad0f6893e6
cd /private/tmp/gutenberg-07f8-pass40-prefix-final.HPuiLN/repo
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/vendor vendor
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/build build
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="top-level block moves|keeps peers converged"
```

Result: exit code `1`. The original identity assertion failed, and the new
transaction assertion failed because no top-level array delete/insert operation
was observed for the reorder:

```text
expect( yblocks.get( 0 ) ).not.toBe( originalFirstBlock )
Expected: true
Received: false
```

Pass-40 fixed-branch verification:

```bash
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="top-level block moves|keeps peers converged"
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: focused unit repro set passed (`3 passed`), full `crdt-blocks.ts`
unit file passed (`74 passed`), focused JS lint passed, and the fixed
natural-user Playwright repro passed (`1 passed`, 23.0s total, 19.8s test
time).

Pass-40 known-fixes verification:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1
npm run wp-env status
curl -I --max-time 5 http://localhost:9601/wp-login.php
WP_BASE_URL=http://localhost:9601 RTC_MANIFEST_WS_START_PORT=20480 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass40-knownfix npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

`wp-env status` still reported the known-fixes checkout as uninitialized, but
`curl` returned HTTP `200 OK` from `localhost:9601`. The one-attempt browser
repro failed in 42.9s with the same product-state split:

```text
primary:   [ inserted paragraph 1, sibling paragraph, moved paragraph ]
secondary: [ inserted paragraph 1, moved paragraph, moved paragraph ]
```

Build note from pass 40: `npm run build` still failed after `build:js` and
`build:php` completed because theme primitive token generation hit the local
`colorjs.io` color-space error. Direct `npx wp-build` transpiled and bundled
`core-data`, then failed later on unrelated optional package-local dependencies
(`framer-motion`, `react-colorful`, `@emotion/css`, and `postcss-urlrebase`).
The e2e run used the refreshed `build/scripts/core-data` bundle, confirmed to
contain `isClientIdReorder()`.

Pass 42 rebased both branches onto current `origin/trunk` `02bfdaa5ca9`
(`RTC: Fix divergence when two offline users reconnect (#77980)`) and narrowed
the fix. The upstream commit only changes HTTP polling compaction retention in
`lib/compat/wordpress-7.0/class-wp-http-polling-sync-server.php`; it does not
change `mergeCrdtBlocks()` or the top-level block-array semantics.

The pass-42 PR branch commit order is:

```text
31b8c119558 Add RTC top-level block move unit repro
29f92800391 Add RTC top-level block move Playwright repro
5c8f82ab271 Fix RTC top-level block move reconciliation
```

The pass-42 fix still refuses to treat a same-ID reorder as positional content
updates, but it now computes the first and last changed `clientId` positions and
rebuilds only that middle range. This preserves stable edge blocks such as the
already-converged inserted paragraph in the original failure shape
`[ inserted, moved, sibling ] -> [ inserted, sibling, moved ]`.

Additional pass-42 root-cause proof:

```bash
node -e "const Y=require('yjs'); const doc=new Y.Doc(); const a=doc.getArray('a'); const m1=new Y.Map(); m1.set('id','one'); const m2=new Y.Map(); m2.set('id','two'); a.insert(0,[m1,m2]); const x=a.get(0); a.delete(0,1); a.insert(1,[x]);"
```

Result: Yjs throws while reinserting the already-integrated `Y.Map`
(`Cannot read properties of null (reading 'forEach')`). That confirms why the
fix cannot safely implement a literal in-place move of existing Yjs block maps.

Pass-42 verification:

```bash
npx wp-build
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="top-level block moves|keeps peers converged|preserves unchanged top-level edges"
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Results: the focused unit repro set passed (`4 passed`), the full
`crdt-blocks.ts` unit file passed (`75 passed`), focused JS lint passed, and the
fixed natural-user Playwright repro passed (`1 passed`, 20.8s total). `npx
wp-build` transpiled and bundled `core-data`, then failed later on unrelated
missing optional package-local dependencies (`framer-motion`, `react-colorful`,
`@emotion/css`, and `postcss-urlrebase`). The e2e run used the refreshed
`build/scripts/core-data` bundle, confirmed to contain
`getClientIdReorderRange()` and `replaceYBlockRange()`.

The pass-42 repro-only commit fails before the fix:

```bash
git worktree add --detach /private/tmp/gutenberg-07f8-pass42-prefix.UOPiFx/repo 31b8c119558
cd /private/tmp/gutenberg-07f8-pass42-prefix.UOPiFx/repo
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/vendor vendor
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/build build
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="top-level block moves|keeps peers converged|preserves unchanged top-level edges"
```

Result: exit code `1`; the identity and top-level array-operation assertions
failed before the fix. The stable-edge check and two-doc content smoke passed,
which is useful context: the old code could preserve edges locally and still
encode the reordered middle as wrong-object content rewrites.

Fresh pass-42 known-fixes browser check:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1
npm run wp-env status
curl -I --max-time 5 http://localhost:9601/wp-login.php
WP_BASE_URL=http://localhost:9601 RTC_MANIFEST_WS_START_PORT=20560 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass42-knownfix-rerun npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

`wp-env status` still reports the known-fixes checkout as uninitialized, but
`curl` returned HTTP `200 OK` from `localhost:9601`. An initial pass-42 rerun
failed too early in `waitForAwarenessPeerCount()` after a room permission
warning, so it was not counted as product evidence. The second rerun reached the
final convergence check and failed with the same product split as the source:

```text
primary:   [ inserted paragraph 1, sibling paragraph, moved paragraph ]
secondary: [ inserted paragraph 1, moved paragraph, moved paragraph ]
```

Pass 43 independently re-verified that the existing branches, video, and fix
still satisfy the requested standard on `origin/trunk` `02bfdaa5ca9`.

Additional pass-43 checks:

```bash
git fetch origin trunk
git fetch danluu try/rtc-top-level-block-move-duplicates-paragraph-and-drops-si-07f8eb5c4218 try/rtc-top-level-block-move-duplicates-paragraph-and-drops-si-07f8eb5c4218-pr
git log --oneline --decorate --reverse origin/trunk..try/rtc-top-level-block-move-duplicates-paragraph-and-drops-si-07f8eb5c4218-pr
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="top-level block moves|keeps peers converged|preserves unchanged top-level edges"
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
WP_BASE_URL=http://localhost:9601 RTC_MANIFEST_WS_START_PORT=20640 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass43-knownfix npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
```

Results: the PR branch is still exactly the three requested commits; focused
unit coverage passed (`4 passed`, `71 skipped`), the full `crdt-blocks.ts` unit
file passed (`75 passed`), the known-fixes browser repro failed again with the
same primary/secondary split, the fixed natural-user browser repro passed (`1
passed`, 21.2s total), and focused JS lint passed. The existing annotated video
is present and readable as H.264 `2560x900`, 12 seconds, with side-by-side final
editor states and action labels.

Pass 44 independently re-read the source result, source log, error context,
trace listing, generated spec, fix branch, and root-cause history. The source
failure is still a completed natural editor action path followed by state
divergence, not a readiness wait, locator failure, malformed spec, environment
failure, inverted assertion, or expected behavior. The source error context
shows the secondary editor with the inserted paragraph followed by two copies
of the moved paragraph.

Fresh pass-44 low-level repro-only check:

```bash
git worktree add --detach /private/tmp/gutenberg-07f8-pass44-prefix.gI9e0e/repo 31b8c119558
cd /private/tmp/gutenberg-07f8-pass44-prefix.gI9e0e/repo
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/node_modules node_modules
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/vendor vendor
ln -s /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/build build
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="top-level block moves|keeps peers converged|preserves unchanged top-level edges"
```

Result: exit code `1`. The two structural assertions failed before the fix:
the first Y.Map object was rewritten in place instead of replaced, and no
top-level Y.Array delete/insert event was observed. The stable-edge and
two-doc content smoke checks passed, which further narrows the root cause: the
old algorithm can produce plausible local JSON while still encoding the wrong
CRDT operation.

Fresh pass-44 known-fixes browser check:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1
npm run wp-env status
curl -I --max-time 5 http://localhost:9601/wp-login.php
WP_BASE_URL=http://localhost:9601 RTC_MANIFEST_WS_START_PORT=20680 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass44-knownfix npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

`wp-env status` still reported that checkout as uninitialized, but `curl`
returned HTTP `200 OK`. The one-attempt browser repro failed in 43.5s with the
same product-state split:

```text
primary:   [ inserted paragraph 1, sibling paragraph, moved paragraph ]
secondary: [ inserted paragraph 1, moved paragraph, moved paragraph ]
```

Fresh pass-44 fixed-branch verification:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="top-level block moves|keeps peers converged|preserves unchanged top-level edges"
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
rg -n "getClientIdReorderRange|replaceYBlockRange" build/scripts/core-data/index.js packages/core-data/build-module/utils/crdt-blocks.mjs packages/core-data/build/utils/crdt-blocks.cjs
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
git diff --check origin/trunk..HEAD
```

Results: focused unit coverage passed (`4 passed`, `71 skipped`), the full
`crdt-blocks.ts` unit file passed (`75 passed`), all checked build bundles
contain `getClientIdReorderRange()` and `replaceYBlockRange()`, the fixed
natural-user Playwright repro passed (`1 passed`, 21.7s total), focused JS lint
passed, and `git diff --check` reported no whitespace errors.

Fresh pass-44 video verification:

```bash
ffprobe -v error -show_entries stream=codec_name,width,height,nb_frames -show_entries format=duration,size -of default=noprint_wrappers=1 artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4
sips -g pixelWidth -g pixelHeight artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218-frame.png
```

Result: the annotated headless video is present as H.264 `2560x900`, `360`
frames, `12.000000s`, `296057` bytes. The verified still frame is also
`2560x900`.

Pass 45 repeated the disproof and verification checks against current
`origin/trunk` `02bfdaa5ca96deb050cd0c40bad1c1da75858caf`. This pass added a
fresh same-day known-fixes browser rerun and rechecked the pre-fix operation
shape failure rather than relying on the prior summaries.

Source artifact and generated-spec review:

```bash
sed -n '1,240p' /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-44/07f8eb5c4218.summary.md
rg -n "07f8eb5c4218|rtc_top_level_block_move_duplicates_paragraph_and_drops_sibling" /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1/fuzz-handoff/distinct-manifest-20260505/results-refresh-http-shard-1/results.jsonl
sed -n '1,260p' /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1/fuzz-handoff/distinct-manifest-20260505/results-refresh-http-shard-1/logs/0010-07f8eb5c4218-rtc-top-level-block-move-duplicates-paragraph-and-drops-sibling-after-collaborative-structural-edits.log
sed -n '1,320p' /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1/test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
```

Result: the source result is a completed `http` Playwright run with exit code
`1`, not a timeout. The generated source spec uses natural editor operations
only: toolbar delete, options-menu insert-before, toolbar move-down, and
convergence waits between structural edits.

Fresh pass-45 known-fixes browser check:

```bash
cd /Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505-http-1
npm run wp-env status
curl -I --max-time 5 http://localhost:9601/wp-login.php
WP_BASE_URL=http://localhost:9601 RTC_MANIFEST_WS_START_PORT=20690 RTC_MANIFEST_WS_FIXED_PORT=1 RTC_EC47_ATTEMPTS=1 RTC_EC47_OUTPUT_DIR=/tmp/07f8-pass45-knownfix npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
sed -n '1,260p' /tmp/07f8-pass45-knownfix/attempt-1.json
```

`wp-env status` still reported that checkout as uninitialized, but `curl`
returned HTTP `200 OK`. The one-attempt browser repro failed in 43.8s with the
same product-state split:

```text
primary:   [ inserted paragraph 1, sibling paragraph, moved paragraph ]
secondary: [ inserted paragraph 1, moved paragraph, moved paragraph ]
```

Pass-45 root-cause checks:

```bash
git log --oneline --decorate -- packages/core-data/src/utils/crdt-blocks.ts
git blame -L 239,520 -- packages/core-data/src/utils/crdt-blocks.ts
git show --stat --format=fuller 84019935998c16f877e976ad85e84748355d7282 -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts
git show --stat --format=fuller 128a3c29b7f1db4f35faf9e326dd1e5e7ac11104 -- packages/core-data/src/utils/test/crdt-blocks.ts
git show --stat --format=fuller 02bfdaa5ca96deb050cd0c40bad1c1da75858caf -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts
```

Result: the positional `mergeCrdtBlocks()` algorithm and the clientId-ignoring
`areBlocksEqual()` logic trace to `84019935998c`, `Improve CRDT "merge logic"
for post entities (#72262)`. The expanded tests from `128a3c29b7f`,
`Real-time collaboration: Expand mergeCrdtBlocks() automated testing (#75923)`,
added content-level coverage but did not assert CRDT object identity or
top-level Y.Array operation shape. Current trunk commit `02bfdaa5ca96` does
not change `crdt-blocks.ts` or its tests.

Fresh pass-45 low-level and fixed-branch verification:

```bash
cd /private/tmp/gutenberg-07f8-pass44-prefix.gI9e0e/repo
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="top-level block moves|keeps peers converged|preserves unchanged top-level edges"

cd /Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218
npm run wp-env status
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath --testNamePattern="top-level block moves|keeps peers converged|preserves unchanged top-level edges"
npm run test:unit -- packages/core-data/src/utils/test/crdt-blocks.ts --runTestsByPath
rg -n "getClientIdReorderRange|replaceYBlockRange" build/scripts/core-data/index.js packages/core-data/build-module/utils/crdt-blocks.mjs packages/core-data/build/utils/crdt-blocks.cjs
WP_ENV_PORT=9900 WP_BASE_URL=http://localhost:9900 RTC_MANIFEST_WS_START_PORT=20400 RTC_MANIFEST_WS_FIXED_PORT=1 npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts --project=chromium --workers=1
```

Result: the repro-only commit failed before the fix on the two structural
assertions: the original Y.Map was rewritten in place and no top-level Y.Array
delete/insert event was emitted. On the fixed PR branch, the focused unit set
passed (`4 passed`, `71 skipped`), the full `crdt-blocks.ts` unit file passed
(`75 passed`), and the built core-data bundles contain the reorder helpers. The
fixed natural-user Playwright repro passed (`1 passed`, 21.5s total).

Pass-45 lint, whitespace, and video checks:

```bash
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/test/crdt-blocks.ts test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
git diff --check origin/trunk..HEAD
ffprobe -v error -show_entries stream=codec_name,width,height,nb_frames -show_entries format=duration,size -of default=noprint_wrappers=1 artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4
sips -g pixelWidth -g pixelHeight artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218-frame.png
```

Result: focused JS lint passed, `git diff --check` passed, and the existing
annotated headless video remains present as H.264 `2560x900`, `360` frames,
`12.000000s`, `296057` bytes. The verified still frame is `2560x900`.
