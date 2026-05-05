# RTC Browser Fuzzing Pipeline Runbook

This runbook captures the local long-running Gutenberg RTC browser fuzzing setup
used for the multi-day HTTP, WebSocket, multi-level triage, and monitoring
campaigns. It is intended to be enough for another agent or another machine to
start, stop, resume, monitor, and extend the same pipeline without relying on
chat history.

The pipeline has four durable parts:

- A fixed fuzz base branch that contains trunk plus only intended RTC fixes.
- A supervised browser fuzz campaign with HTTP, HTTP-persistence, and WebSocket groups.
- A multi-level triage system that separates cheap Codex-only analysis from expensive browser repro work.
- A periodic monitor that watches resources, queues, stale lanes, duplicate gating, and job recovery.

## Base Branch

Use a fuzz base that is close to trunk and auditable.

1. Fetch trunk and the remote used for handoffs.

```bash
git fetch origin
git fetch danluu
```

2. Start from current trunk unless the run is explicitly meant to compare an
   older base.

```bash
git switch -c try/fuzz-fixed-base-$( date -u +%Y%m%d ) origin/trunk
```

3. Add only fixes that are either already in trunk or are fixes being pushed to
   PRs for the tracked bug set. For the recent RTC campaign, this meant pulling
   newer fixes from `https://github.com/WordPress/gutenberg/issues/77716` and
   explicitly excluding commits that were neither in trunk nor part of the
   intended PR set.

4. Audit the base before fuzzing.

```bash
git log --oneline --decorate origin/trunk..HEAD
git branch --contains 7cbe36591fa2c2986693c9c90f2606e65b567aff
git diff --check HEAD
```

The excluded commit check should report that the fuzz base does not contain
`7cbe36591fa2c2986693c9c90f2606e65b567aff` unless that commit later lands in
trunk or becomes part of the intended PR set.

5. Push the fuzzer code and base metadata to `danluu` so the run can be
   reconstructed elsewhere.

```bash
git push danluu HEAD:try/fuzz
```

Keep a short base note in the run root, for example `base-update.md`, with:

- branch and remote ref
- head commit
- trunk base commit
- included PRs
- explicitly excluded commits
- verification commands and results

## Required Local Services

Use separate `wp-env` instances for independent HTTP and WebSocket runs. Always
check status before starting.

```bash
WP_ENV_PORT=8950 npm run wp-env-test -- status
WP_ENV_PORT=8950 npm run wp-env-test -- start
```

For WebSocket runs, the supervisor can start the local test relay:

```bash
node bin/rtc-test-ws-sync-server.mjs --port 18991
```

The supervisor activates `gutenberg-test-plugins/rtc-websocket-provider` for WS
groups and deactivates it for HTTP groups. That lets one campaign test both
transport stacks without mixing them in the same `wp-env`.

Do not run `wp-env clean`, stop shared fuzz `wp-env`s, or restart shared services
while lanes or browser triage jobs are active.

## Stale wp-env Cleanup

Long fuzz and triage campaigns can leave old `wp-env` Docker Compose projects
behind. Stopped containers can keep old compose networks attached, which can
eventually exhaust Docker/OrbStack bridge network address space.

The watchdog runs a conservative cleanup pass by default:

```bash
node bin/rtc-fuzz-cleanup-stale-wp-env.mjs --apply --json --min-age-hours=24
```

Safety properties:

- only resources with Docker Compose labels whose working dir/config is under `~/.wp-env`, or whose compose project has a matching directory under `~/.wp-env`, are considered
- running containers are never stopped or removed
- a compose project is protected if any container in that project is running
- only stopped containers older than the age threshold are removed
- only unused wp-env compose networks older than the age threshold are removed
- Docker volumes and `~/.wp-env` directories are reported but not deleted

Useful manual dry run:

```bash
node bin/rtc-fuzz-cleanup-stale-wp-env.mjs --json --min-age-hours=24
```

Watchdog controls:

- `RTC_FUZZ_WATCHDOG_CLEANUP_STALE_WP_ENV=0`: disable cleanup
- `RTC_FUZZ_WATCHDOG_CLEANUP_STALE_WP_ENV_INTERVAL_MS=1800000`: cleanup interval
- `RTC_FUZZ_WATCHDOG_CLEANUP_STALE_WP_ENV_MIN_AGE_HOURS=24`: minimum resource age

## Group Config

The supervisor reads `RTC_FUZZ_SUPERVISOR_GROUPS_PATH` or
`RTC_FUZZ_SUPERVISOR_GROUPS_JSON`. A typical mixed run uses three groups:

```json
[
	{
		"name": "http",
		"repoRoot": "/path/to/gutenberg-http-worktree",
		"transport": "http",
		"lanes": 1,
		"startSeed": 930866,
		"stepCount": 12,
		"env": {
			"WP_ENV_PORT": "8950",
			"WP_BASE_URL": "http://localhost:8950",
			"RTC_FUZZ_BASE_URL": "http://localhost:8950",
			"GUTENBERG_RTC_BROWSER_DISABLE_PARSER_STRESS": "1"
		}
	},
	{
		"name": "http-persistence",
		"repoRoot": "/path/to/gutenberg-http-worktree",
		"transport": "http",
		"lanes": 1,
		"startSeed": 931000,
		"stepCount": 12,
		"env": {
			"WP_ENV_PORT": "8950",
			"WP_BASE_URL": "http://localhost:8950",
			"RTC_FUZZ_BASE_URL": "http://localhost:8950",
			"GUTENBERG_RTC_BROWSER_ACTION_PROFILE": "persistence",
			"GUTENBERG_RTC_BROWSER_DISABLE_PARSER_STRESS": "1"
		}
	},
	{
		"name": "ws",
		"repoRoot": "/path/to/gutenberg-ws-worktree",
		"wsServerRepoRoot": "/path/to/gutenberg-with-ws-server",
		"transport": "ws",
		"lanes": 3,
		"startSeed": 950001,
		"stepCount": 12,
		"wsPort": 18991,
		"env": {
			"WP_ENV_PORT": "8889",
			"WP_BASE_URL": "http://localhost:8889",
			"RTC_FUZZ_BASE_URL": "http://localhost:8889",
			"GUTENBERG_RTC_BROWSER_DISABLE_PARSER_STRESS": "1",
			"GUTENBERG_RTC_TEST_WS_PROVIDER": "1",
			"GUTENBERG_RTC_TEST_WS_PORT": "18991",
			"GUTENBERG_RTC_TEST_WS_URL": "ws://127.0.0.1:18991"
		}
	}
]
```

Do not disable revision restore by default. Use
`RTC_FUZZ_DISABLE_REVISION_RESTORE=1` or
`GUTENBERG_RTC_BROWSER_DISABLE_REVISION_RESTORE=1` only for a documented known
bug or a temporary harness workaround, and record the reason in `monitor-status.md`.

## Start The Supervised Run

Create a durable run root and write the group config there.

```bash
export RUN_ROOT=/path/to/gutenberg/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-$( date -u +%Y%m%d-%H%M )
mkdir -p "$RUN_ROOT"
$EDITOR "$RUN_ROOT/supervisor-groups.json"
```

Start the supervisor in tmux:

```bash
tmux new-session -d -s rtc-fuzz-supervisor \
	"cd /path/to/gutenberg; \
	RTC_FUZZ_SUPERVISOR_OUTPUT_DIR='$RUN_ROOT' \
	RTC_FUZZ_SUPERVISOR_GROUPS_PATH='$RUN_ROOT/supervisor-groups.json' \
	RTC_FUZZ_SUPERVISOR_DURATION_HOURS=14 \
	RTC_FUZZ_SUPERVISOR_POLL_MS=60000 \
	node bin/rtc-browser-fuzz-supervisor.mjs"
```

Start the watchdog in a separate tmux session. It restarts the supervisor if the
tmux session disappears or `supervisor-state.json` stops updating.

```bash
tmux new-session -d -s rtc-fuzz-watchdog \
	"cd /path/to/gutenberg; \
	RTC_FUZZ_WATCHDOG_OUTPUT_DIR='$RUN_ROOT' \
	RTC_FUZZ_WATCHDOG_GROUPS_PATH='$RUN_ROOT/supervisor-groups.json' \
	RTC_FUZZ_WATCHDOG_SESSION=rtc-fuzz-supervisor \
	RTC_FUZZ_WATCHDOG_DURATION_HOURS=14 \
	node bin/rtc-browser-fuzz-watchdog.mjs"
```

The supervisor writes:

- `supervisor-state.json`
- `supervisor.log`
- `events.ndjson`
- `<group>-wp-env-status.log`
- `<group>-wp-env-start.log`
- `<group>-ws-relay.log` for WS groups
- one generation directory per launched group, for example `ws-gen-20-...`

The supervisor is resumable. Reusing the same output dir and groups path causes
it to read `supervisor-state.json`, preserve active run dirs, and continue from
the next known seed.

## Raw Fuzzer Lanes

The supervisor launches `bin/rtc-browser-fuzz-launcher.mjs`, which creates one
detached lane process per lane. Each lane runs
`bin/rtc-browser-fuzz-runner.mjs`.

Important runner defaults and controls:

- `RTC_FUZZ_INLINE_CODEX=0`: keep fuzzing lanes moving; triage is handled by watchers.
- `RTC_FUZZ_SKIP_GLOBAL_POST_CLEANUP=1`: parallel lanes do not delete one another's posts.
- `RTC_FUZZ_HEALTH_CHECK_INTERVAL_SEEDS=1`: probe HTTP health between seeds.
- `RTC_FUZZ_STEP_COUNT=12`: current default action depth.
- `RTC_FUZZ_ACTION_PROFILE` or `GUTENBERG_RTC_BROWSER_ACTION_PROFILE`: use `full`, `persistence`, `structure`, or `session-lifecycle`.
- `GUTENBERG_RTC_BROWSER_COLLECT_CDP_COVERAGE=1`: collect Chrome coverage for novelty-guided runs.

Each lane writes:

- `lane-N/state.json`
- `lane-N/runner.log`
- `lane-N/summary.ndjson`
- `lane-N/seed-<seed>/...`
- `lane-N/seed-<seed>/rtc-behavioral-coverage.ndjson` when behavioral coverage is enabled

`summary.ndjson` is the queue source for triage. It contains successful attempts,
infra failures, uncertain failures, real-bug records, and Codex classifications
when inline Codex is enabled.

## Multi-Level Triage

Run triage per active generation directory, not just per top-level run root. The
current generation dirs can be read from `supervisor-state.json`.

### Level 0: Signature Discovery And Browser Repro

`bin/rtc-browser-fuzz-triage-watcher.mjs` scans `summary.ndjson`, normalizes
failure text, groups distinct signatures, and launches lower-parallel Codex jobs
that may run browser repro attempts.

```bash
RTC_FUZZ_TRIAGE_MAX_PARALLEL=1 \
RTC_FUZZ_TRIAGE_REPRO_HOURS=3 \
node bin/rtc-browser-fuzz-triage-watcher.mjs "$RUN_DIR"
```

Use `--gate-only` when you only want the watcher to discover signatures and fold
completed analysis decisions without launching browser-heavy repro jobs:

```bash
node bin/rtc-browser-fuzz-triage-watcher.mjs "$RUN_DIR" --gate-only
```

The watcher writes:

- `$RUN_DIR/.triage-watcher/state.json`
- `$RUN_DIR/.triage-watcher/signatures/<hash>/failure.json`
- `$RUN_DIR/.triage-watcher/signatures/<hash>/prompt.txt`
- `$RUN_DIR/.triage-watcher/signatures/<hash>/STATUS.md`
- `$RUN_DIR/.triage-watcher/signatures/<hash>/result.json`

Browser triage requirements are strict:

- classify real, not real, infra, or uncertain
- compare examples for duplicates and distinct root causes
- attempt useful repro levels: unit, REST/API, manual browser, and Playwright
- Playwright repros must use real user/editor actions and real sync behavior
- do not use fault injection, artificial route blocking, direct store mutation, or artificial sleeps as the cause of a browser repro
- if a realistic repro cannot be found within the time budget, mark that explicitly instead of pretending the issue is confirmed

### Level 1: High-Parallel Codex-Only Analysis

`bin/rtc-browser-fuzz-analysis-tier.mjs` consumes the triage watcher state and
launches many cheap Codex-only analysis jobs. These jobs must not run browsers,
Playwright, `wp-env`, Docker, or tests. They inspect logs and source only.

```bash
RTC_FUZZ_ANALYSIS_MAX_PARALLEL=12 \
RTC_FUZZ_ANALYSIS_CODEX_TIMEOUT_MS=2700000 \
node bin/rtc-browser-fuzz-analysis-tier.mjs "$RUN_DIR"
```

Outputs are under:

- `$RUN_DIR/.triage-watcher/analysis-tier/state.json`
- `$RUN_DIR/.triage-watcher/analysis-tier/signatures/<hash>/result.json`
- `$RUN_DIR/.triage-watcher/analysis-tier/signatures/<hash>/analysis.md`
- `$RUN_DIR/.triage-watcher/analysis-tier/signatures/<hash>/handoff.md`

The first-level schema classifies signatures as:

- `likely_real`
- `likely_infra`
- `likely_not_real`
- `uncertain`

It also emits `shouldDeepTriage` and one of:

- `prioritize_deep_triage`
- `normal_deep_triage`
- `suppress_as_infra`
- `merge_with_duplicate`
- `keep_collecting`

The triage watcher gates duplicate/noise decisions from this tier as
`analysis-gated`, so browser triage capacity is reserved for likely-real
signatures.

### Level 2: Deeper Codex-Only Analysis

`bin/rtc-browser-fuzz-deep-analysis-tier.mjs` consumes completed first-level
analysis results and performs a second, more skeptical Codex-only pass for
likely-real and uncertain candidates.

```bash
RTC_FUZZ_DEEP_ANALYSIS_MAX_PARALLEL=4 \
RTC_FUZZ_DEEP_ANALYSIS_CODEX_TIMEOUT_MS=5400000 \
RTC_FUZZ_DEEP_ANALYSIS_MODEL=gpt-5.4 \
RTC_FUZZ_DEEP_ANALYSIS_REASONING_EFFORT=xhigh \
node bin/rtc-browser-fuzz-deep-analysis-tier.mjs "$RUN_DIR"
```

Outputs are under:

- `$RUN_DIR/.triage-watcher/deep-analysis-tier/state.json`
- `$RUN_DIR/.triage-watcher/deep-analysis-tier/signatures/<hash>/result.json`
- `$RUN_DIR/.triage-watcher/deep-analysis-tier/signatures/<hash>/deep-analysis.md`
- `$RUN_DIR/.triage-watcher/deep-analysis-tier/signatures/<hash>/repro-handoff.md`

Candidate statuses:

- `confirmed_likely_real`
- `likely_duplicate`
- `likely_false_positive`
- `needs_more_evidence`
- `needs_realistic_repro_search`

Deep-analysis duplicate and false-positive decisions are folded back by the
triage watcher. Confirmed likely-real and realistic-repro-search decisions stay
eligible for browser-heavy work.

### Job Startup Failures

The analysis tiers treat transient Codex startup/connectivity failures as
retryable. Examples include failed model refresh, websocket disconnects, DNS
lookup failures, and startup policy fetch failures. These are recorded as
`transientFailureReason=codex-startup-connectivity` with a backoff rather than
consuming the normal attempt budget.

## Recommended Tmux Layout

For each current generation directory, use separate named sessions. Example:

```bash
tmux new-session -d -s rtc-analysis-ws-current \
	"cd /path/to/gutenberg; RTC_FUZZ_ANALYSIS_MAX_PARALLEL=12 node bin/rtc-browser-fuzz-analysis-tier.mjs '$RUN_DIR'"

tmux new-session -d -s rtc-deep-analysis-ws-current \
	"cd /path/to/gutenberg; RTC_FUZZ_DEEP_ANALYSIS_MAX_PARALLEL=4 node bin/rtc-browser-fuzz-deep-analysis-tier.mjs '$RUN_DIR'"

tmux new-session -d -s rtc-triage-ws-current \
	"cd /path/to/gutenberg; RTC_FUZZ_TRIAGE_MAX_PARALLEL=1 RTC_FUZZ_TRIAGE_REPRO_HOURS=3 node bin/rtc-browser-fuzz-triage-watcher.mjs '$RUN_DIR'"
```

Use lower browser triage parallelism than Codex-only analysis. Browser jobs are
expensive because each can spawn Playwright, Chrome, and shared `wp-env` load.

## Periodic Monitoring

The periodic monitor should append every pass to `monitor-status.md` in the run
root. Each pass should include:

- watchdog status and age
- HTTP, WS, and relay reachability
- lane state and stale lane ages
- triage counts by status
- analysis-tier counts by status
- deep-analysis-tier counts by status
- queued signatures split by no-analysis, analysis-running, analysis-failed, and analysis-completed
- resource snapshot
- actions taken
- current policy

Minimum resource checks:

```bash
uptime
top -l 1 -n 15 -o cpu -stats pid,ppid,state,time,cpu,mem,command
memory_pressure
pgrep -af "codex exec" | wc -l
pgrep -af "chrome|headless|playwright" | wc -l
```

Minimum service checks:

```bash
cat "$RUN_ROOT/watchdog-state.json"
curl -fsS http://localhost:8950/wp-json/ >/dev/null
curl -fsS http://localhost:8889/wp-json/ >/dev/null
curl -fsS http://127.0.0.1:18991/health >/dev/null
```

Avoid broad scans over historical artifact trees. If a monitor or Codex worker
starts a long-lived broad `find` or `rg` over `artifacts/rtc-browser-fuzz`,
terminate that child process. If one analysis worker repeatedly respawns
pathological scans, mark only that job failed and leave the rest of the pipeline
running.

## Scaling Policy

Adjust work according to the bottleneck.

Prefer adding Codex-only analysis when:

- CPU and memory have headroom
- many signatures have no first-level analysis
- browser/Playwright pressure is already high
- it is unclear whether extra work should be browser-heavy

Prefer adding second-level analysis when:

- first-level analysis is caught up
- likely-real or uncertain candidates are accumulating
- browser repro queue is deeper than browser capacity
- candidate distinctness is unclear

Prefer adding browser-heavy triage when:

- first-level or second-level analysis marked candidates `prioritize_deep_triage`
- CPU idle and memory are healthy
- Chrome/Playwright process counts are not already high
- there is a concrete realistic repro strategy to try

Prefer adding raw fuzz lanes only when:

- existing lanes are healthy
- triage and analysis queues are not growing faster than they drain
- the current failure distribution is not dominated by one known issue
- there is a new action profile or transport surface worth exploring

Hold steady when:

- CPU idle is below roughly 10%
- unused RAM is below roughly 3 GB
- Chrome/Playwright process count is high
- `wp-env` is unstable
- queue growth is from analysis/repro backlog rather than lack of raw findings

If one issue dominates:

- confirm it is one distinct bug family, not several bugs with the same symptom
- add temporary gating or suppression only if it is an infra/noise signature
- if it is real and already understood, keep one canonical repro and gate
  duplicates so the run can find other classes
- if a temporary product workaround is needed to keep fuzzing, keep it local,
  document it, and do not merge it into the base unless it is an intended fix

## Novelty-Guided Expansion

Use `bin/rtc-browser-fuzz-novelty-monitor.mjs` when raw fuzzing is returning
little new signal. It observes `rtc-behavioral-coverage.ndjson`, tracks action
profiles, block types, action pairs, lifecycle events, fault types, and CDP
coverage hashes, then can enable additional supervisor groups when novelty
stalls and resources permit.

Example:

```bash
RTC_FUZZ_NOVELTY_OUTPUT_DIR="$RUN_ROOT/novelty" \
RTC_FUZZ_NOVELTY_GROUPS_PATH="$RUN_ROOT/novelty/supervisor-groups.json" \
RTC_FUZZ_NOVELTY_OBSERVED_RUN_DIRS="$RUN_ROOT" \
RTC_FUZZ_NOVELTY_BASE_URL=http://localhost:8889 \
RTC_FUZZ_NOVELTY_WP_ENV_PORT=8889 \
RTC_FUZZ_NOVELTY_WS_PORT=18991 \
node bin/rtc-browser-fuzz-novelty-monitor.mjs
```

The implemented novelty profiles are `structure` and `session-lifecycle`. They
are meant to broaden surface area, not to replace the full or persistence
profiles.

## Stop, Resume, And Handoff

To stop raw lanes safely, read PIDs from each generation `lanes.json`.

```bash
jq -r '.lanes[].pid' "$RUN_DIR/lanes.json" | xargs kill
```

To stop supervisor and watchdog:

```bash
tmux kill-session -t rtc-fuzz-supervisor
tmux kill-session -t rtc-fuzz-watchdog
```

To stop analysis or triage, kill their tmux sessions. Do not delete
`.triage-watcher`; it is the durable queue and result store.

To resume:

1. Restart the same supervisor/watchdog with the same `RUN_ROOT` and groups path.
2. Read active/current generation dirs from `supervisor-state.json`.
3. Restart triage, analysis, and deep-analysis sessions for the active dirs.
4. Append a resume entry to `monitor-status.md`.

For another machine, hand off:

- the base branch ref and head commit
- `base-update.md`
- `supervisor-groups.json`
- `monitor-status.md`
- current `supervisor-state.json`
- all `.triage-watcher/**/result.json`, `analysis.md`, `deep-analysis.md`, `handoff.md`, and `repro-handoff.md`
- one canonical seed/artifact directory per likely-real distinct bug family
- a manifest mapping distinct bug type to canonical repro candidate and commands

## Status Commands

Useful quick checks:

```bash
RUN_DIR=/path/to/current/generation-dir node - <<'NODE'
const fs = require('fs');
const run = process.env.RUN_DIR;
if (!run) throw new Error('Set RUN_DIR to a generation directory.');
for (const tier of ['', 'analysis-tier', 'deep-analysis-tier']) {
	const path = tier
		? `${run}/.triage-watcher/${tier}/state.json`
		: `${run}/.triage-watcher/state.json`;
	if (!fs.existsSync(path)) continue;
	const state = JSON.parse(fs.readFileSync(path, 'utf8'));
	const values = tier ? Object.values(state.jobs || {}) : Object.values(state.signatures || {});
	const counts = {};
	for (const item of values) counts[item.status] = (counts[item.status] || 0) + 1;
	console.log(tier || 'triage', counts);
}
NODE
```

```bash
node - "$RUN_ROOT/supervisor-state.json" <<'NODE'
const fs = require('fs');
const state = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const group of state.groups || []) {
	console.log(group.name, group.status, group.currentRunDir, group.nextStartSeed, group.lastReason);
}
NODE
```

## Safety Rules

- Do not clean or restart shared `wp-env`s while lanes or browser triage are running.
- Do not disable revision restore unless a documented known bug requires it.
- Do not revert unrelated worktree changes while updating the fuzz base or scripts.
- Do not let analysis-only tiers run Playwright, Chrome, Docker, `wp-env`, or tests.
- Do not file a bug from a candidate that only has a fault-injected or state-mutating repro.
- Do not delete run dirs, lane dirs, or `.triage-watcher` while a run may be resumed.
- Keep every monitor action durable in `monitor-status.md`.
