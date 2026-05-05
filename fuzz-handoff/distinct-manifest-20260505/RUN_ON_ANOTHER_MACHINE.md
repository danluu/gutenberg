# RTC distinct-bug repro manifest handoff

Date: 2026-05-05

Purpose: let another machine start rerunning one canonical repro per distinct `Classification: real` RTC bug type against the refreshed fixed base.

Primary queue for issue-confirmation/reporting work:

- `LIKELY_REAL_ISSUES_HANDOFF.md` is the human handoff. It lists every fully triaged `Classification: real` issue group.
- `likely-real-issues.jsonl` is the same queue in machine-readable form.
- `analysis-tier-likely-real-supplement.jsonl` lists first-level `classification: likely_real` analysis outputs that were not necessarily promoted to full triage. Treat it as a lower-confidence follow-up queue, not report-ready evidence.

## Branch

```bash
git clone git@github.com:danluu/gutenberg.git
cd gutenberg
git checkout try/fuzz-fixed-base-20260505
```

Expected handoff branch contents:

- `fuzz-handoff/distinct-manifest-20260505/distinct-bug-manifest.json`
- `fuzz-handoff/distinct-manifest-20260505/distinct-bug-manifest.md`
- `fuzz-handoff/distinct-manifest-20260505/runnable-http.txt`
- `fuzz-handoff/distinct-manifest-20260505/runnable-websocket.txt`
- `fuzz-handoff/distinct-manifest-20260505/LIKELY_REAL_ISSUES_HANDOFF.md`
- `fuzz-handoff/distinct-manifest-20260505/likely-real-issues.jsonl`
- `fuzz-handoff/distinct-manifest-20260505/analysis-tier-likely-real-supplement.jsonl`
- Materialized canonical repro specs under `test/e2e/specs/editor/collaboration/`
- Runner scripts:
  - `bin/rtc-browser-fuzz-distinct-manifest.mjs`
  - `bin/rtc-browser-fuzz-rerun-manifest.mjs`

Manifest summary at creation time:

```text
STATUS files scanned: 5083
Classification: real files: 452
Distinct bug types: 279
Runnable canonical repros materialized: 184
HTTP runnable repros: 75
WebSocket runnable repros: 109
Groups without an existing canonical spec: 95
```

## Setup

Use the e2e wp-env config, not the default `.wp-env.json`. The e2e config mounts `packages/e2e-tests/plugins`, including the RTC WebSocket provider plugin expected by global setup.

Pick a free WordPress port per machine/worktree:

```bash
npm install
composer install
WP_ENV_PORT=9492 npm run wp-env-test start
WP_ENV_PORT=9492 npm run wp-env-test status
```

Set `WP_BASE_URL` to the same port in every rerun command:

```bash
export WP_ENV_PORT=9492
export WP_BASE_URL=http://localhost:9492
```

Do not share one `wp-env` between concurrent manifest runners. For parallel work, use separate worktrees and separate `WP_ENV_PORT` values.

## Inspect The Work Queue

```bash
jq '.summary' fuzz-handoff/distinct-manifest-20260505/distinct-bug-manifest.json
sed -n '1,140p' fuzz-handoff/distinct-manifest-20260505/distinct-bug-manifest.md
cat fuzz-handoff/distinct-manifest-20260505/runnable-http.txt
cat fuzz-handoff/distinct-manifest-20260505/runnable-websocket.txt
cat fuzz-handoff/distinct-manifest-20260505/unrunnable-bug-types.txt
```

## Start With A Small Smoke

HTTP:

```bash
RTC_MANIFEST_REPRO_TIMEOUT_MS=360000 \
node bin/rtc-browser-fuzz-rerun-manifest.mjs \
  --manifest fuzz-handoff/distinct-manifest-20260505/distinct-bug-manifest.json \
  --results-dir fuzz-handoff/distinct-manifest-20260505/results-http-smoke \
  --transport http \
  --limit 5
```

WebSocket:

```bash
RTC_MANIFEST_REPRO_TIMEOUT_MS=420000 \
RTC_MANIFEST_WS_START_PORT=19391 \
node bin/rtc-browser-fuzz-rerun-manifest.mjs \
  --manifest fuzz-handoff/distinct-manifest-20260505/distinct-bug-manifest.json \
  --results-dir fuzz-handoff/distinct-manifest-20260505/results-ws-smoke \
  --transport websocket \
  --limit 5
```

The runner starts a local test WebSocket sync server for each WebSocket repro and activates the test provider plugin through Playwright global setup.

## Run The Full Queue

HTTP:

```bash
RTC_MANIFEST_REPRO_TIMEOUT_MS=360000 \
node bin/rtc-browser-fuzz-rerun-manifest.mjs \
  --manifest fuzz-handoff/distinct-manifest-20260505/distinct-bug-manifest.json \
  --results-dir fuzz-handoff/distinct-manifest-20260505/results-http \
  --transport http
```

WebSocket:

```bash
RTC_MANIFEST_REPRO_TIMEOUT_MS=420000 \
RTC_MANIFEST_WS_START_PORT=19391 \
node bin/rtc-browser-fuzz-rerun-manifest.mjs \
  --manifest fuzz-handoff/distinct-manifest-20260505/distinct-bug-manifest.json \
  --results-dir fuzz-handoff/distinct-manifest-20260505/results-websocket \
  --transport websocket
```

## Shard Across Machines

Use the same branch and manifest on each machine, but different result directories and different `--shard-index` values.

Example for four shards:

```bash
RTC_MANIFEST_REPRO_TIMEOUT_MS=360000 \
node bin/rtc-browser-fuzz-rerun-manifest.mjs \
  --manifest fuzz-handoff/distinct-manifest-20260505/distinct-bug-manifest.json \
  --results-dir fuzz-handoff/distinct-manifest-20260505/results-http-shard-0 \
  --transport http \
  --shard-count 4 \
  --shard-index 0
```

Run the same command on other machines with `--shard-index 1`, `2`, and `3`. Use unique `WP_ENV_PORT` values per machine/worktree.

## Resume

The runner appends one JSON record per completed canonical repro to:

```text
<results-dir>/results.jsonl
```

It writes live state to:

```text
<results-dir>/status.json
```

To resume, rerun the exact same command with the same `--results-dir`; completed keys in `results.jsonl` are skipped.

Logs and Playwright artifacts are under:

```text
<results-dir>/logs/
<results-dir>/outputs/
```

## Interpreting Results

In `results.jsonl`:

- `passed` means the canonical repro spec completed successfully on the refreshed base. For many generated repro specs this means "the repro expectation did not fire"; inspect the spec and log before calling it fixed.
- `failed` means the spec failed. Inspect the corresponding log and Playwright trace under `outputs/`.
- `timedOut: true` means rerun with a larger `RTC_MANIFEST_REPRO_TIMEOUT_MS` before classifying the bug.
- `missing-spec` means the manifest entry points to a materialized path that is absent and should be treated as handoff/tooling cleanup.

First-pass priority:

1. Run HTTP smoke and WebSocket smoke.
2. Run all HTTP repros.
3. Run all WebSocket repros.
4. For failures, consolidate by `bugType` and compare against `distinct-bug-manifest.md`.
5. For the 95 non-runnable groups, use `unrunnable-bug-types.txt` as a queue for manual artifact-based repro reconstruction.
