# RTC stale post_content repro tests

These files are intentionally on the explanation/report branch, not on the PR
branch. They are Playwright repro runners used to produce the current trunk
videos and JSON evidence for the RTC stale `post_content` overwrite.

## Environment

Start the current-trunk wp-env instance used by these repros:

```bash
npx wp-env --config .wp-env.stale-save-current-trunk.json start
```

The repros default to:

- WordPress URL: `http://localhost:8891`
- admin username/password: `admin` / `password`
- `wp_collaboration_enabled=1`

If the wp-env CLI container name differs from the default in the scripts, pass
`WP_CLI_CONTAINER=<container-name>`.

## Final focused browser repros

The focused runner is:

```bash
artifacts/current-trunk-rtc-repro-video/make-browser-window-outcome-video.mjs
```

It opens two normal editor browser contexts as the same admin user, confirms
RTC `/wp-sync` traffic, holds window B's `/wp-sync` response to model slow
polling, has A type and save `A-SAVED-THEN-LOST-*`, has B naturally type and
save `B-STAYS-SAVED-*` while stale, then closes/reopens and records the
canonical post content and revisions/autosaves via WP-CLI.

Bad-autosave case, where canonical `post_content` is B-only and the autosave is
A-only:

```bash
SCENARIO=bad-autosave \
MAX_ATTEMPTS=10 \
ALLOW_OVERWRITE_VIDEO=1 \
VIDEO_PATH=artifacts/current-trunk-rtc-repro-video/current-trunk-rtc-natural-full-sequence-bad-autosave-agent-a.mp4 \
EVIDENCE_PATH=artifacts/current-trunk-rtc-repro-video/current-trunk-rtc-natural-full-sequence-bad-autosave-agent-a.evidence.json \
FRAMES_DIR=artifacts/current-trunk-rtc-repro-video/frames-current-trunk-rtc-natural-full-sequence-bad-autosave-agent-a \
node artifacts/current-trunk-rtc-repro-video/make-browser-window-outcome-video.mjs
```

No-autosave case, where canonical `post_content` is B-only and there is no
autosave notice/row after close/reopen:

```bash
SCENARIO=no-autosave \
MAX_ATTEMPTS=10 \
ALLOW_OVERWRITE_VIDEO=1 \
VIDEO_PATH=artifacts/current-trunk-rtc-repro-video/current-trunk-rtc-natural-full-sequence-no-autosave.mp4 \
EVIDENCE_PATH=artifacts/current-trunk-rtc-repro-video/current-trunk-rtc-natural-full-sequence-no-autosave.evidence.json \
FRAMES_DIR=artifacts/current-trunk-rtc-repro-video/frames-current-trunk-rtc-natural-full-sequence-no-autosave \
node artifacts/current-trunk-rtc-repro-video/make-browser-window-outcome-video.mjs
```

Known-good outputs committed with this branch:

- `current-trunk-rtc-natural-full-sequence-bad-autosave-agent-a.mp4`
- `current-trunk-rtc-natural-full-sequence-bad-autosave-agent-a.evidence.json`
- `current-trunk-rtc-natural-full-sequence-no-autosave.mp4`
- `current-trunk-rtc-natural-full-sequence-no-autosave.evidence.json`

## Timing matrix runner

The matrix runner used to search for autosave outcomes is:

```bash
artifacts/current-trunk-rtc-repro-video/experiment-autosave-outcomes.mjs
```

The bad-autosave JSON outcome used for earlier analysis was produced with this
shape:

```bash
EXPERIMENT_NAME=eight-sec-close \
START_DELAY_MS=32000 \
WAIT_AFTER_HEAL_BEFORE_CLOSE_MS=8000 \
OUTPUT_PATH=artifacts/current-trunk-rtc-repro-video/autosave-outcome-experiments/20260506-164859-staggered-matrix/eight-sec-close.json \
node artifacts/current-trunk-rtc-repro-video/experiment-autosave-outcomes.mjs
```

The no-autosave JSON outcome used for earlier analysis was produced with this
shape:

```bash
EXPERIMENT_NAME=fc-h1000-pb0 \
START_DELAY_MS=18000 \
CLOSE_BEFORE_POST_HEAL_INSPECTION=1 \
SKIP_PRE_SAVE_INSPECTION=1 \
SKIP_PRE_RELEASE_INSPECTION=1 \
WAIT_FOR_HEAL_TIMEOUT_MS=1000 \
OUTPUT_PATH=artifacts/current-trunk-rtc-repro-video/autosave-outcome-experiments/20260506-165431-fast-close/fc-h1000-pb0.json \
node artifacts/current-trunk-rtc-repro-video/experiment-autosave-outcomes.mjs
```

Those matrix outputs are useful for inspecting raw database state without
watching a video. The focused browser runner above is the clearer repro for
review because it records the full natural user sequence.
