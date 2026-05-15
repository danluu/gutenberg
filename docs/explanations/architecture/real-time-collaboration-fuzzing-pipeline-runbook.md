# RTC Browser Fuzzing Pipeline Runbook

This runbook captures the local long-running Gutenberg RTC browser fuzzing setup
used for the multi-day HTTP, WebSocket, multi-level triage, and monitoring
campaigns. It is intended to be enough for another agent or another machine to
start, stop, resume, monitor, and extend the same pipeline without relying on
chat history.

The pipeline has four durable parts:

-   A fixed fuzz base branch that contains trunk plus only intended RTC fixes.
-   A supervised browser fuzz campaign with HTTP, HTTP-persistence, and WebSocket groups.
-   A multi-level triage system that separates cheap Codex-only analysis from expensive browser repro work.
-   A periodic monitor that watches resources, queues, stale lanes, duplicate gating, and job recovery.

For a long run, treat each durable part as a service with a tmux owner. Do not
leave one-shot commands as the only copy of an important process.

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
git push danluu HEAD:try/jetstream-fuzz
```

Keep a short base note in the run root, for example `base-update.md`, with:

-   branch and remote ref
-   head commit
-   trunk base commit
-   included PRs
-   explicitly excluded commits
-   verification commands and results

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

## Process Ownership

Use separate long-running processes with clear ownership. This avoids monitors
fighting each other and makes recovery auditable.

-   `rtc-browser-fuzz-supervisor.mjs` owns active fuzz groups, lane replacement,
    shared `wp-env` health repair, WS relay startup, and per-group plugin
    activation.
-   `rtc-browser-fuzz-watchdog.mjs` owns supervisor liveness checks and stale
    stopped `wp-env` cleanup. It should restart a missing or stale supervisor,
    not run fuzz lanes itself.
-   `rtc-browser-fuzz-live-analysis-monitor.mjs` owns Codex-only first-level
    analysis for the currently active generation directories. It runs the
    triage watcher only in `--gate-only` mode.
-   `rtc-browser-fuzz-deep-analysis-tier.mjs` owns second-level Codex-only
    analysis for likely-real and uncertain candidates. Start it separately for
    generation dirs with a real backlog.
-   `rtc-browser-fuzz-triage-watcher.mjs` without `--gate-only` owns
    browser-heavy repro work. Keep its parallelism low.
-   `rtc-browser-fuzz-novelty-monitor.mjs` owns novelty-guided group generation
    and the novelty supervisor session.
-   A periodic Codex monitor owns human-readable status updates and bounded job
    adjustments. It should append every decision to `monitor-status.md`.

## Jetstream Remote Scripts

The Jetstream2 run uses `/media/volume/danluu-fuzz-data` for the repository and
run roots. Keep the reusable scripts on `danluu/try/jetstream-fuzz`, then copy
them from a local checkout to the remote machine because the remote fuzz host is
not expected to have GitHub write access.

```bash
JETSTREAM=exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org
REMOTE_REPO=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo

git fetch danluu try/jetstream-fuzz
git archive --format=tar FETCH_HEAD \
	bin/rtc-*-remote.sh \
	bin/rtc-browser-*.schema.json \
	bin/rtc-browser-fuzz-analysis-guard-bin \
	bin/rtc-browser-fuzz-*.mjs \
	bin/rtc-fuzz-*.mjs \
	bin/rtc-test-ws-sync-server.mjs \
	test/e2e/playwright.rtc-websocket.config.ts \
	test/e2e/specs/editor/collaboration/collaboration-fuzz.spec.ts \
	test/e2e/specs/editor/collaboration/fixtures/collaboration-utils.ts \
	lib/compat/wordpress-7.0/class-wp-http-polling-sync-server.php \
	| ssh "$JETSTREAM" "cd '$REMOTE_REPO' && tar -xf -"
```

Install stable `/tmp` launchers after copying. The top-level guard script calls
these names directly when it detects a missing or stale service.

```bash
ssh "$JETSTREAM" "
REMOTE_REPO='$REMOTE_REPO'
install -m 755 \"\$REMOTE_REPO/bin/rtc-coverage-guided-start-remote.sh\" /tmp/start_rtc_coverage_guided_remote.sh
install -m 755 \"\$REMOTE_REPO/bin/rtc-coverage-guided-cleanup-remote.sh\" /tmp/cleanup_rtc_coverage_guided_remote.sh
install -m 755 \"\$REMOTE_REPO/bin/rtc-coverage-guided-watchdog-start-remote.sh\" /tmp/start_rtc_coverage_guided_watchdog_remote.sh
install -m 755 \"\$REMOTE_REPO/bin/rtc-strict-expansion-start-remote.sh\" /tmp/start_rtc_strict_expansion.sh
install -m 755 \"\$REMOTE_REPO/bin/rtc-focused-shards-start-remote.sh\" /tmp/start_rtc_focused_shards.sh
install -m 755 \"\$REMOTE_REPO/bin/rtc-focused-shards-cleanup-remote.sh\" /tmp/cleanup_rtc_focused_shards.sh
install -m 755 \"\$REMOTE_REPO/bin/rtc-focused-shards-gap-codex-loop-remote.sh\" /tmp/start_rtc_focused_gap_codex_loop.sh
install -m 755 \"\$REMOTE_REPO/bin/rtc-gap-booster-start-remote.sh\" /tmp/start_rtc_gap_booster.sh
install -m 755 \"\$REMOTE_REPO/bin/rtc-jetstream-guard-remote.sh\" /tmp/start_rtc_jetstream_guard.sh
"
```

The remote launchers are intentionally split by ownership:

-   `rtc-coverage-guided-start-remote.sh` starts the coverage-guided novelty
    monitor and its generated supervisor groups.
-   `rtc-coverage-guided-watchdog-start-remote.sh` runs
    `rtc-browser-fuzz-session-watchdog.mjs` and restarts the coverage-guided
    session through the stable `/tmp` launchers.
-   `rtc-strict-expansion-start-remote.sh`, `rtc-focused-shards-start-remote.sh`,
    and `rtc-gap-booster-start-remote.sh` start independent fuzz campaigns for
    high-value gaps.
-   `rtc-focused-shards-gap-codex-loop-remote.sh` keeps Codex analysis focused
    on deferred coverage gaps and feeds the results back into the focused shard
    setup.
-   `rtc-jetstream-guard-remote.sh` is the top-level guard. Run it in tmux and
    let it restart missing sessions instead of manually restarting individual
    fuzzers.

Start or refresh the guard after installing the launchers:

```bash
ssh "$JETSTREAM" "tmux kill-session -t rtc-jetstream-guard 2>/dev/null || true; tmux new-session -d -s rtc-jetstream-guard /tmp/start_rtc_jetstream_guard.sh"
```

## Stale wp-env Cleanup

Long fuzz and triage campaigns can leave old `wp-env` Docker Compose projects
behind. Stopped containers can keep old compose networks attached, which can
eventually exhaust Docker/OrbStack bridge network address space.

The watchdog runs a conservative cleanup pass by default:

```bash
node bin/rtc-fuzz-cleanup-stale-wp-env.mjs --apply --json --min-age-hours=24
```

Safety properties:

-   only resources with Docker Compose labels whose working dir/config is under `~/.wp-env`, or whose compose project has a matching directory under `~/.wp-env`, are considered
-   running containers are never stopped or removed
-   a compose project is protected if any container in that project is running
-   only stopped containers older than the age threshold are removed
-   only unused wp-env compose networks older than the age threshold are removed
-   unused wp-env Docker volumes from inactive projects are reported by default
    and removed only when volume pruning is explicitly enabled
-   orphaned `~/.wp-env` directories with no Docker resources attached are
    reported by default and removed only when directory pruning is explicitly
    enabled

Useful manual dry run:

```bash
node bin/rtc-fuzz-cleanup-stale-wp-env.mjs --json --min-age-hours=24
```

Useful manual apply when disk pressure is from stale `wp-env` volumes:

```bash
node bin/rtc-fuzz-cleanup-stale-wp-env.mjs --apply --prune-volumes --json --min-age-hours=24
```

Useful manual apply when disk pressure is from orphaned generated `~/.wp-env`
directories:

```bash
node bin/rtc-fuzz-cleanup-stale-wp-env.mjs --apply --prune-directories --json --min-age-hours=24
```

Watchdog controls:

-   `RTC_FUZZ_WATCHDOG_CLEANUP_STALE_WP_ENV=0`: disable cleanup
-   `RTC_FUZZ_WATCHDOG_CLEANUP_STALE_WP_ENV_INTERVAL_MS=1800000`: cleanup interval
-   `RTC_FUZZ_WATCHDOG_CLEANUP_STALE_WP_ENV_MIN_AGE_HOURS=24`: minimum resource age
-   `RTC_FUZZ_WATCHDOG_CLEANUP_STALE_WP_ENV_VOLUMES=1`: also remove unused
    stale `wp-env` Docker volumes from inactive projects. Leave this disabled if
    you want the monitor to report volume candidates but require a manual prune.
-   `RTC_FUZZ_WATCHDOG_CLEANUP_STALE_WP_ENV_DIRECTORIES=1`: also remove
    orphaned generated `~/.wp-env` directories that have no Docker resources
    attached. Leave this disabled if you want a manual confirmation step.

## Low-Disk Fuzzing Mode

The default Gutenberg Playwright config keeps `trace.zip` for every failing
test. That is useful for one-off failures, but long fuzz runs intentionally
produce many candidates and traces can dominate disk usage. A broad discovery
generation can run in low-disk mode:

```bash
export RTC_FUZZ_LOW_DISK_MODE=1
export RTC_FUZZ_ANALYSIS_RECHECKS=1
```

`RTC_FUZZ_LOW_DISK_MODE=1` makes the runner pass `--trace off --video off` to
Playwright while keeping the default screenshot behavior. Use explicit
overrides when needed:

```bash
export RTC_FUZZ_PLAYWRIGHT_TRACE=retain-on-failure
export RTC_FUZZ_PLAYWRIGHT_SCREENSHOT=only-on-failure
export RTC_FUZZ_PLAYWRIGHT_VIDEO=off
```

Use low-disk mode for wide exploration when disk pressure matters. For a
canonical repro or report candidate, rerun the selected seed with
`RTC_FUZZ_PLAYWRIGHT_TRACE=retain-on-failure` or `--trace retain-on-failure` so
the report still has a trace when that trace is useful.

## Active wp-env And Docker Repair

The supervisor owns active shared `wp-env` repair. Humans and Codex analysis
jobs should not manually clean or restart active shared environments while lanes
are running.

The supervisor first tries normal `wp-env` commands. If `wp-env start` or the
REST health probe fails, it can parse the `install path:` from `wp-env status`
and use the generated Docker Compose file directly:

```bash
docker compose -f "$INSTALL_PATH/docker-compose.yml" -p "$( basename "$INSTALL_PATH" )" ...
```

The generated-compose fallback intentionally targets only the core services it
needs. It prefers `mysql`, `tests-mysql`, `wordpress`, `tests-wordpress`, `cli`,
and `tests-cli`; if those names are not present, it excludes phpMyAdmin when
selecting fallback services. This avoids failing a fuzz run because an optional
phpMyAdmin image cannot be pulled.

Repair controls:

-   `RTC_FUZZ_SUPERVISOR_AUTO_REPAIR_WP_ENV=0`: disable generated-compose
    active `wp-env` repair.
-   `RTC_FUZZ_SUPERVISOR_AUTO_REPAIR_ORBSTACK_DOCKER=0`: disable OrbStack Docker
    restart repair.
-   `RTC_FUZZ_SUPERVISOR_ORBSTACK_DOCKER_RESTART_COOLDOWN_MS=600000`: minimum
    delay between automatic `orb restart docker` attempts.

Repair actions are logged in `events.ndjson` with `kind=repair` and in
per-group files such as:

-   `<group>-wp-env-compose-services.log`
-   `<group>-wp-env-compose-up.log`
-   `<group>-wp-env-compose-restart.log`
-   `<group>-wp-env-compose-force-recreate.log`
-   `<group>-wp-env-compose-down-stale-endpoint.log`
-   `<group>-wp-env-compose-up-after-orbstack-restart.log`
-   `<group>-orbstack-docker-restart.log`

If Docker layer, volume, or WordPress database pressure is detected, the
supervisor may run safe Docker pruning commands:

-   `docker container prune -f`
-   `docker image prune -af`
-   `docker builder prune -af`
-   `docker volume prune -f`

Those logs are written as `<group>-docker-<container|image|builder|volume>-prune.log`.
This is intentionally narrower than deleting run artifacts or active compose
projects.

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

Start the supervisor in a durable tmux loop. The loop matters: if the
supervisor exits after a recoverable local failure, tmux keeps the service owner
alive and the watchdog has a stable session to inspect.

```bash
tmux new-session -d -s rtc-fuzz-supervisor "bash -lc '
cd /path/to/gutenberg
export RTC_FUZZ_SUPERVISOR_OUTPUT_DIR=\"$RUN_ROOT\"
export RTC_FUZZ_SUPERVISOR_GROUPS_PATH=\"$RUN_ROOT/supervisor-groups.json\"
export RTC_FUZZ_SUPERVISOR_DURATION_HOURS=14
export RTC_FUZZ_SUPERVISOR_POLL_MS=60000
while true; do
	node bin/rtc-browser-fuzz-supervisor.mjs
	code=\$?
	echo SUPERVISOR_EXIT:\$code \$( date -u +%Y-%m-%dT%H:%M:%SZ )
	sleep 30
done
'"
```

Start the watchdog in a separate tmux session. It restarts the supervisor if the
tmux session disappears or `supervisor-state.json` stops updating.

```bash
tmux new-session -d -s rtc-fuzz-watchdog "bash -lc '
cd /path/to/gutenberg
while true; do
	RTC_FUZZ_WATCHDOG_OUTPUT_DIR=\"$RUN_ROOT\" \
	RTC_FUZZ_WATCHDOG_GROUPS_PATH=\"$RUN_ROOT/supervisor-groups.json\" \
	RTC_FUZZ_WATCHDOG_SESSION=rtc-fuzz-supervisor \
	RTC_FUZZ_WATCHDOG_DURATION_HOURS=14 \
	RTC_FUZZ_WATCHDOG_POLL_MS=60000 \
	node bin/rtc-browser-fuzz-watchdog.mjs
	code=\$?
	echo WATCHDOG_EXIT:\$code \$( date -u +%Y-%m-%dT%H:%M:%SZ )
	sleep 30
done
'"
```

The supervisor writes:

-   `supervisor-state.json`
-   `supervisor.log`
-   `events.ndjson`
-   `<group>-wp-env-status.log`
-   `<group>-wp-env-start.log`
-   `<group>-ws-relay.log` for WS groups
-   one generation directory per launched group, for example `ws-gen-20-...`

The supervisor is resumable. Reusing the same output dir and groups path causes
it to read `supervisor-state.json`, preserve active run dirs, and continue from
the next known seed.

## Raw Fuzzer Lanes

The supervisor launches `bin/rtc-browser-fuzz-launcher.mjs`, which creates one
detached lane process per lane. Each lane runs
`bin/rtc-browser-fuzz-runner.mjs`.

Important runner defaults and controls:

-   `RTC_FUZZ_INLINE_CODEX=0`: keep fuzzing lanes moving; triage is handled by watchers.
-   `RTC_FUZZ_SKIP_GLOBAL_POST_CLEANUP=1`: parallel lanes do not delete one another's posts.
-   `RTC_FUZZ_HEALTH_CHECK_INTERVAL_SEEDS=1`: probe HTTP health between seeds.
-   `RTC_FUZZ_STEP_COUNT=12`: current default action depth.
-   `RTC_FUZZ_ACTION_PROFILE` or `GUTENBERG_RTC_BROWSER_ACTION_PROFILE`: use `full`, `persistence`, `structure`, or `session-lifecycle`.
-   `GUTENBERG_RTC_BROWSER_COLLECT_CDP_COVERAGE=1`: collect Chrome coverage for novelty-guided runs.
-   `GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MODE=auto`: track semantic
    witness markers for low-noise operations. `auto` hard-fails only on
    low-noise/parser-stress-free profiles and records shadow-only observations
    elsewhere. Set `fail`, `shadow`, or `off` explicitly when comparing modes.
-   `GUTENBERG_RTC_BROWSER_OPERATION_LEDGER_MAX_LIVE=128`: cap the number of
    live witness markers checked after convergence, reload, save, and revision
    restore.
-   `GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE=off|shadow|fail`: after
    final convergence, explicitly save from one browser and compare canonical
    REST content, title, `_crdt_document` presence, and persisted live operation
    witnesses. Keep this off by default for broad/parser-stress runs; use `fail`
    in low-noise persistence/revision/same-user lanes.
-   `GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION=1`: after a forced late join
    settles, make the late-joining browser append a witnessed paragraph and run
    the normal convergence/invariant path. This checks that late joiners can
    contribute new state, not just receive it.
-   `GUTENBERG_RTC_BROWSER_CONVERGENCE_STABLE_SAMPLES=1` and
    `GUTENBERG_RTC_BROWSER_CONVERGENCE_STABLE_INTERVAL_MS=250`: require
    multiple consecutive equal normalized editor samples before declaring
    convergence. Increase samples only for focused flake investigation because
    it adds latency to every convergence wait.

The operation ledger is deliberately narrow. It creates deterministic ASCII
witness markers for low-noise actions such as paragraph/heading insertion,
nested group insertion, paragraph/table edits, concurrent paragraph insertion,
title writes, late-join post actions, and save checkpoints. A marker is
acknowledged only after the user action returns,
collaboration convergence succeeds, and the normalized editor state contains
the marker. Later convergence, reload, save-persistence, late-join, final-state,
and revision-restore checks verify that still-live witnesses survive. Broad
parser, common-block, block-gauntlet, move, and delete actions invalidate the
relevant content scope instead of guessing causal targets. Title witnesses use a
last-writer-wins rule: a new witnessed title retires older live title witnesses.

Coverage output includes compact `operationLedger` summary fields and
`operationEvents` with marker hashes only. Do not add raw marker strings to
novelty keys; unique marker bodies would make novelty look better without
improving coverage.

Current focused action profiles:

-   `full`: default mixed editor actions.
-   `persistence`: save/reload persistence with title edits.
-   `persistence-no-title`: save/reload persistence without title edits.
-   `structure`: nested group, move, delete, and tree-shape actions.
-   `session-lifecycle`: late join, reload, and reconnect actions.
-   `three-user-late-join`: three-user coverage with a forced late join. Novelty
    runs should set `GUTENBERG_RTC_BROWSER_LATE_JOIN_POST_ACTION=1` so the late
    joiner also performs a witnessed mutation.
-   `multi-reload-lifecycle`: two browser reload checkpoints in one seed.
-   `common-blocks`: common block-library surfaces such as image, buttons,
    columns, code, and preformatted blocks.
-   `block-gauntlet`: broader block-library surfaces such as details, cover,
    media-text, gallery, file, social links, spacer, HTML, shortcode, more,
    quote, separator, and verse.
-   `parser-serialization`: parser and serialization stress mixed into normal
    actions.
-   `parser-transform`: focused load/reparse transform coverage. This heavily
    weights `append-parser-stress-content` and `reparse-edited-content`, and
    uses post contents with HTML character references, deprecated block forms,
    built-in validation fixes, equivalent HTML, and freeform parser content.

Each lane writes:

-   `lane-N/state.json`
-   `lane-N/runner.log`
-   `lane-N/summary.ndjson`
-   `lane-N/events.ndjson`
-   `lane-N/seed-<seed>/...`
-   `lane-N/seed-<seed>/<attempt>/replay.json`
-   `lane-N/seed-<seed>/<attempt>/artifacts/rtc-behavioral-coverage.ndjson` when behavioral coverage is enabled

`summary.ndjson` is the queue source for triage. It contains successful attempts,
infra failures, uncertain failures, real-bug records, and Codex classifications
when inline Codex is enabled.

`events.ndjson` is the durable event stream for the lane. It records runner
start/stop, seed start, attempt start/finish, infra failures, and classification
events. Prefer it over reverse-engineering progress from `runner.log`.

`replay.json` is the per-attempt handoff manifest. It captures the repo commit,
spec path, seed, action profile, transport, selected environment variables,
timeouts, artifact paths, behavioral coverage summary, and the recorded action
history when the test reached the browser.

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

-   `$RUN_DIR/.triage-watcher/state.json`
-   `$RUN_DIR/.triage-watcher/signatures/<hash>/failure.json`
-   `$RUN_DIR/.triage-watcher/signatures/<hash>/prompt.txt`
-   `$RUN_DIR/.triage-watcher/signatures/<hash>/STATUS.md`
-   `$RUN_DIR/.triage-watcher/signatures/<hash>/result.json`

Browser triage requirements are strict:

-   classify real, not real, infra, or uncertain
-   compare examples for duplicates and distinct root causes
-   attempt useful repro levels: unit, REST/API, manual browser, and Playwright
-   Playwright repros must use real user/editor actions and real sync behavior
-   do not use fault injection, artificial route blocking, direct store mutation, or artificial sleeps as the cause of a browser repro
-   if a realistic repro cannot be found within the time budget, mark that explicitly instead of pretending the issue is confirmed

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

-   `$RUN_DIR/.triage-watcher/analysis-tier/state.json`
-   `$RUN_DIR/.triage-watcher/analysis-tier/signatures/<hash>/result.json`
-   `$RUN_DIR/.triage-watcher/analysis-tier/signatures/<hash>/analysis.md`
-   `$RUN_DIR/.triage-watcher/analysis-tier/signatures/<hash>/handoff.md`

The first-level schema classifies signatures as:

-   `likely_real`
-   `likely_infra`
-   `likely_not_real`
-   `uncertain`

It also emits `shouldDeepTriage` and one of:

-   `prioritize_deep_triage`
-   `normal_deep_triage`
-   `suppress_as_infra`
-   `merge_with_duplicate`
-   `keep_collecting`

Every analysis result must also include `userHitLikelihoodScore` and
`userHitLikelihoodRationale`. The score is `0..5`: `0` means harness-only or
not user-visible, `1` means very rare or developer-only, `2` means an uncommon
edge workflow, `3` means a plausible normal collaborative editing workflow, `4`
means a common workflow or common content shape, and `5` means very likely in
default/common use. Deep-analysis jobs use this score as a tie-breaker so common
likely-real bugs are processed before rare likely-real bugs with the same
priority and confidence.

The triage watcher gates duplicate/noise decisions from this tier as
`analysis-gated`, so browser triage capacity is reserved for likely-real
signatures.

The analysis tier automatically prepends
`bin/rtc-browser-fuzz-analysis-guard-bin` to `PATH` for Codex jobs. The guard
wrappers refuse broad `find` or `rg` roots such as `artifacts`,
`artifacts/rtc-browser-fuzz`, and `test/e2e/artifacts`. Do not bypass this for
normal analysis jobs; inspect a specific seed, lane, signature, source file, or
small artifact subtree instead.

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

-   `$RUN_DIR/.triage-watcher/deep-analysis-tier/state.json`
-   `$RUN_DIR/.triage-watcher/deep-analysis-tier/signatures/<hash>/result.json`
-   `$RUN_DIR/.triage-watcher/deep-analysis-tier/signatures/<hash>/deep-analysis.md`
-   `$RUN_DIR/.triage-watcher/deep-analysis-tier/signatures/<hash>/repro-handoff.md`

Candidate statuses:

-   `confirmed_likely_real`
-   `likely_duplicate`
-   `likely_false_positive`
-   `needs_more_evidence`
-   `needs_realistic_repro_search`

Deep-analysis duplicate and false-positive decisions are folded back by the
triage watcher. Confirmed likely-real and realistic-repro-search decisions stay
eligible for browser-heavy work.

If older result artifacts predate the likelihood fields, backfill them before
building handoff manifests or filing issues:

```bash
node bin/rtc-fuzz-backfill-user-hit-likelihood.mjs "$RUN_ROOT"
```

The backfill updates completed result JSON, visible `STATUS.md` files, embedded
triage watcher gate state, and writes
`$RUN_ROOT/user-hit-likelihood-backfill.json` grouped by distinct likely-real bug
type.

For long runs, keep deep analysis alive in tmux and point it at only the active
generation dirs that have likely-real or uncertain backlog:

```bash
tmux new-session -d -s rtc-deep-analysis-current "bash -lc '
cd /path/to/gutenberg
while true; do
	RTC_FUZZ_DEEP_ANALYSIS_MAX_PARALLEL=4 \
	RTC_FUZZ_DEEP_ANALYSIS_MAX_ATTEMPTS=2 \
	RTC_FUZZ_DEEP_ANALYSIS_INTERVAL_MS=45000 \
	RTC_FUZZ_DEEP_ANALYSIS_CODEX_TIMEOUT_MS=5400000 \
	RTC_FUZZ_DEEP_ANALYSIS_MODEL=gpt-5.4 \
	RTC_FUZZ_DEEP_ANALYSIS_REASONING_EFFORT=xhigh \
	node bin/rtc-browser-fuzz-deep-analysis-tier.mjs \"$RUN_DIR\"
	code=\$?
	echo DEEP_ANALYSIS_EXIT:\$code \$( date -u +%Y-%m-%dT%H:%M:%SZ )
	sleep 30
done
'"
```

### Job Startup Failures

The analysis tiers treat transient Codex startup/connectivity failures as
retryable. Examples include failed model refresh, websocket disconnects, DNS
lookup failures, and startup policy fetch failures. These are recorded as
`transientFailureReason=codex-startup-connectivity` with a backoff rather than
consuming the normal attempt budget.

### Active Generation Attachment

Use `bin/rtc-browser-fuzz-live-analysis-monitor.mjs` for supervised runs where
the current generation directories change over time. It reads
`supervisor-state.json`, discovers each active generation directory, runs
gate-only signature discovery, and keeps one Codex-only analysis-tier tmux
session attached to each active directory.

```bash
tmux new-session -d -s rtc-live-analysis-active "bash -lc '
cd /path/to/gutenberg
while true; do
	RTC_FUZZ_LIVE_ANALYSIS_INTERVAL_MS=120000 \
	RTC_FUZZ_LIVE_ANALYSIS_MAX_PARALLEL=4 \
	RTC_FUZZ_LIVE_ANALYSIS_MAX_ATTEMPTS=4 \
	RTC_FUZZ_LIVE_ANALYSIS_CODEX_TIMEOUT_MS=2700000 \
	node bin/rtc-browser-fuzz-live-analysis-monitor.mjs \"$RUN_ROOT\"
	code=\$?
	echo LIVE_ANALYSIS_EXIT:\$code \$( date -u +%Y-%m-%dT%H:%M:%SZ )
	sleep 30
done
'"
```

If a novelty supervisor writes into a subdirectory under the same run root,
start a second live-analysis monitor with a different tmux prefix so per-run
analysis session names cannot collide:

```bash
tmux new-session -d -s rtc-live-analysis-novelty "bash -lc '
cd /path/to/gutenberg
while true; do
	RTC_FUZZ_LIVE_ANALYSIS_INTERVAL_MS=120000 \
	RTC_FUZZ_LIVE_ANALYSIS_MAX_PARALLEL=2 \
	RTC_FUZZ_LIVE_ANALYSIS_MAX_ATTEMPTS=4 \
	RTC_FUZZ_LIVE_ANALYSIS_CODEX_TIMEOUT_MS=2700000 \
	RTC_FUZZ_LIVE_ANALYSIS_TMUX_PREFIX=rtc-analysis-live-novelty \
	node bin/rtc-browser-fuzz-live-analysis-monitor.mjs \"$RUN_ROOT/novelty-live\"
	code=\$?
	echo LIVE_ANALYSIS_NOVELTY_EXIT:\$code \$( date -u +%Y-%m-%dT%H:%M:%SZ )
	sleep 30
done
'"
```

The monitor writes:

-   `$RUN_ROOT/live-analysis-monitor.log`
-   `$RUN_ROOT/live-analysis-monitor-events.ndjson`
-   `$RUN_ROOT/live-analysis-monitor-state.json`
-   per-generation `$RUN_DIR/.triage-watcher/state.json`
-   per-generation `$RUN_DIR/.triage-watcher/analysis-tier/state.json`

This monitor is intentionally Codex-heavy and browser-light. It uses the triage
watcher only in `--gate-only` mode, so it does not start browser repro jobs. Run
browser-heavy triage separately after the analysis tiers identify high-value
likely-real candidates.

## Recommended Tmux Layout

For each current generation directory, use separate named sessions. Prefer the
live-analysis monitor for first-level analysis because it follows current
generation dirs automatically. Use direct per-generation sessions for deep
analysis and browser-heavy triage. Example ad hoc sessions:

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
root. It is the place to record human-readable health, queue state, and job
adjustments.

Create a run-specific prompt at `$RUN_ROOT/periodic-codex-monitor-prompt.md`.
Keep it concrete: list the repo path, run root, active service ports, current
baseline tmux sessions that must not be killed, hard safety constraints, and the
exact status file to append.

Minimum prompt requirements:

-   check machine health, service health, lane freshness, queue sizes, and
    analysis/deep-analysis state
-   kill only narrow pathological child searches or clearly failed one-shot
    boost wrappers
-   launch Codex-only work before browser-heavy work when the bottleneck is
    analysis
-   fold completed duplicate/noise decisions back into triage state
-   append a timestamped section to `monitor-status.md`
-   report actions taken, current bottleneck, and current policy

Start the periodic monitor in a durable tmux loop. This template stores each
Codex pass under `$RUN_ROOT/periodic-codex-monitor/<timestamp>/`.

```bash
tmux new-session -d -s rtc-periodic-codex-monitor "bash -lc '
set -u
REPO=/path/to/gutenberg
RUN_ROOT=/path/to/gutenberg/artifacts/rtc-browser-fuzz/current-run
PROMPT=\"\$RUN_ROOT/periodic-codex-monitor-prompt.md\"
LOG_ROOT=\"\$RUN_ROOT/periodic-codex-monitor\"
INTERVAL_SECONDS=\"\${RTC_PERIODIC_CODEX_MONITOR_INTERVAL_SECONDS:-900}\"
mkdir -p \"\$LOG_ROOT\"
while true; do
	ts=\$( date -u +%Y%m%dT%H%M%SZ )
	pass_dir=\"\$LOG_ROOT/\$ts\"
	mkdir -p \"\$pass_dir\"
	codex exec \
		-C \"\$REPO\" \
		-m gpt-5.4 \
		-c model_reasoning_effort=\\\"high\\\" \
		--dangerously-bypass-approvals-and-sandbox \
		--output-last-message \"\$pass_dir/final.md\" \
		--json \
		\"\$( cat \"\$PROMPT\" )\" \
		> \"\$pass_dir/events.jsonl\" \
		2> \"\$pass_dir/stderr.log\"
	code=\$?
	echo \"\$code\" > \"\$pass_dir/exit-code.txt\"
	echo PERIODIC_CODEX_MONITOR_EXIT:\$code \$( date -u +%Y-%m-%dT%H:%M:%SZ )
	sleep \"\$INTERVAL_SECONDS\"
done
'"
```

Each pass should include:

-   watchdog status and age
-   HTTP, WS, and relay reachability
-   lane state and stale lane ages
-   triage counts by status
-   analysis-tier counts by status
-   deep-analysis-tier counts by status
-   queued signatures split by no-analysis, analysis-running, analysis-failed, and analysis-completed
-   resource snapshot
-   actions taken
-   current policy

Minimum resource checks:

```bash
uptime
top -l 1 -n 15 -o cpu -stats pid,ppid,state,time,cpu,mem,command
memory_pressure
vm_stat -c 6 1
sysctl vm.swapusage
pgrep -af "codex exec" | wc -l
pgrep -af "chrome|headless|playwright" | wc -l
node bin/rtc-fuzz-cleanup-stale-wp-env.mjs --json --min-age-hours=24
node bin/rtc-fuzz-prune-completed-codex-events.mjs "$RUN_ROOT" --json --min-age-minutes=30
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

Completed Codex raw event streams can become large. It is safe to prune them
after durable outputs exist:

```bash
node bin/rtc-fuzz-prune-completed-codex-events.mjs "$RUN_ROOT" --apply --json --min-age-minutes=30
```

This removes only raw `events.jsonl` / monitor stderr files for completed
periodic monitor, analysis-tier, and deep-analysis-tier jobs. It keeps
`final.md`, `exit-code.txt`, `result.json`, `analysis.md`, `handoff.md`,
`deep-analysis.md`, and `repro-handoff.md`.

## Scaling Policy

Adjust work according to the bottleneck.

Prefer adding Codex-only analysis when:

-   CPU and memory have headroom
-   many signatures have no first-level analysis
-   browser/Playwright pressure is already high
-   it is unclear whether extra work should be browser-heavy

Prefer adding second-level analysis when:

-   first-level analysis is caught up
-   likely-real or uncertain candidates are accumulating
-   browser repro queue is deeper than browser capacity
-   candidate distinctness is unclear

Prefer adding browser-heavy triage when:

-   first-level or second-level analysis marked candidates `prioritize_deep_triage`
-   CPU idle and memory are healthy
-   Chrome/Playwright process counts are not already high
-   there is a concrete realistic repro strategy to try

Prefer adding raw fuzz lanes only when:

-   existing lanes are healthy
-   triage and analysis queues are not growing faster than they drain
-   the current failure distribution is not dominated by one known issue
-   there is a new action profile or transport surface worth exploring

Hold steady when:

-   CPU idle is below roughly 10%
-   macOS VM pressure shows active memory distress: `memory_pressure` free
    below roughly 30%, nonzero throttled pages, sustained swapout above roughly
    1 MB/s, pageout above roughly 5 MB/s, decompression churn above roughly
    250 MB/s, or active swapout while swap free is below roughly 0.5 GB
-   Chrome/Playwright process count is high
-   `wp-env` is unstable
-   queue growth is from analysis/repro backlog rather than lack of raw findings

Do not use macOS `unused` or `free` memory alone as the headroom signal. macOS
often runs with very low unused pages while memory pressure is still green. The
novelty monitor samples `memory_pressure`, `vm_stat -c 6 1`, and
`vm.swapusage`; it permits more work when unused RAM is low but swap/pageout
rates are quiet, and holds back when VM rates indicate the machine is moving
toward thrashing.

If one issue dominates:

-   confirm it is one distinct bug family, not several bugs with the same symptom
-   add temporary gating or suppression only if it is an infra/noise signature
-   if it is real and already understood, keep one canonical repro and gate
    duplicates so the run can find other classes
-   if a temporary product workaround is needed to keep fuzzing, keep it local,
    document it, and do not merge it into the base unless it is an intended fix

## Novelty-Guided Expansion

Use `bin/rtc-browser-fuzz-novelty-monitor.mjs` when raw fuzzing is returning
little new signal. It observes `rtc-behavioral-coverage.ndjson`, tracks action
profiles, block types, action pairs, lifecycle events, fault types, and CDP
coverage hashes, then can enable additional supervisor groups when novelty
stalls and resources permit.

Optional expansion controls:

-   `RTC_FUZZ_NOVELTY_ENABLE_SAME_USER=1`: after the forced three-user late-join
    lane reaches its lifecycle target, hand that browser slot to a same-user
    lifecycle lane. This exercises two browser contexts using the same WordPress
    account. Do not require distinct-user presence semantics in this lane.
-   `RTC_FUZZ_NOVELTY_ENABLE_HTTP_PROBE=1`: add a low-fault HTTP persistence
    probe only when there is spare browser budget.
-   `RTC_FUZZ_NOVELTY_COMMON_BLOCK_MIN_RECORDS=25` and
    `RTC_FUZZ_NOVELTY_BLOCK_GAUNTLET_MIN_RECORDS=20`: per-block coverage floors
    for spare-slot top-offs. The monitor should not treat aggregate block counts
    as complete if individual blocks such as `core/file`, `core/html`,
    `core/preformatted`, or `core/column` are still thin.
-   `RTC_FUZZ_NOVELTY_LATE_JOIN_MIN_RECORDS=300`: lifecycle-event target for
    forced three-user late joins. The policy uses the actual late-join lifecycle
    key, not just `users:3`.
-   `RTC_FUZZ_NOVELTY_AUTO_GOAL_EXPANSION=1` and
    `RTC_FUZZ_NOVELTY_AUTO_GOAL_EXPANSION_THRESHOLD=8`: keep the coverage queue
    from going empty. Each monitor pass checks the current unmet coverage-goal
    count after ingesting coverage. If the count is at or below the threshold,
    the monitor persists a bounded wave of new explicit goals in
    `novelty-state.json` and immediately includes those goals in
    `novelty-status.md`, `coverageGuidance`, and subsequent scheduling
    decisions. Codex coverage-guidance reports should recommend changing the
    threshold if the loop is either overfeeding low-value work or letting the
    queue drain.
-   `RTC_FUZZ_NOVELTY_AUTO_GOAL_EXPANSION_BATCH_SIZE=12` and
    `RTC_FUZZ_NOVELTY_AUTO_GOAL_EXPANSION_MAX_WAVES_PER_PASS=2`: bound how many
    automatic goals can be added in one monitor pass. The first automatic goals
    are high-risk combinations such as rich-text action pairs, parser-transform
    completed records, revision-restore history events, media/cross-entity
    history events, operation-ledger coverage, and very-large-document coverage.
    After those are exhausted, the monitor ratchets already-met goals to the
    next count tier instead of reporting zero unmet goals.
-   `RTC_FUZZ_NOVELTY_COVERAGE_QUALITY_ISSUE_PASSES=2`: run coverage-guidance
    Codex when completion or health quality issues persist, even if feature keys
    are still increasing. This catches the case where the fuzzer is broadening
    but not completing valuable profiles such as media/cross-entity,
    multi-reload lifecycle, parser serialization, or real-user editing.

Example durable novelty monitor:

```bash
tmux new-session -d -s rtc-fuzz-novelty-monitor "bash -lc '
cd /path/to/gutenberg
while true; do
	RTC_FUZZ_NOVELTY_OUTPUT_DIR=\"$RUN_ROOT/novelty-live\" \
	RTC_FUZZ_NOVELTY_GROUPS_PATH=\"$RUN_ROOT/novelty-live/supervisor-groups.json\" \
	RTC_FUZZ_NOVELTY_OBSERVED_RUN_DIRS=\"$RUN_ROOT\" \
	RTC_FUZZ_NOVELTY_BASE_URL=http://localhost:8889 \
	RTC_FUZZ_NOVELTY_WP_ENV_PORT=8889 \
	RTC_FUZZ_NOVELTY_WS_PORT=18991 \
	RTC_FUZZ_NOVELTY_AUTO_GOAL_EXPANSION=1 \
	RTC_FUZZ_NOVELTY_AUTO_GOAL_EXPANSION_THRESHOLD=8 \
	RTC_FUZZ_NOVELTY_SUPERVISOR_SESSION=rtc-fuzz-novelty-supervisor \
	node bin/rtc-browser-fuzz-novelty-monitor.mjs
	code=\$?
	echo NOVELTY_MONITOR_EXIT:\$code \$( date -u +%Y-%m-%dT%H:%M:%SZ )
	sleep 30
done
'"
```

The novelty monitor writes `novelty-state.json`, `novelty-status.md`,
`novelty-monitor.log`, and a generated `supervisor-groups.json`. It starts or
keeps alive the tmux session named by `RTC_FUZZ_NOVELTY_SUPERVISOR_SESSION`.
That supervisor session then writes its own `supervisor-state.json` under the
novelty output directory. Attach a separate live-analysis monitor to that
novelty output directory if novelty groups are expected to produce triage
backlog.

Automatic coverage-goal expansion is persisted in
`novelty-state.json.autoCoverageGoals` and
`novelty-state.json.autoCoverageGoalWaves`. Do not clear those fields during a
restart unless the goal wave itself was bad; clearing them makes trend graphs
look artificially complete again until the threshold is crossed on a later pass.
The coverage-guided remote starter copies the previous `novelty-state.json` into
the new output directory and preserves cumulative `observed-roots.txt` entries
across restarts. That keeps quality and auto-goal decisions based on the full
run history instead of only the immediately previous monitor output.

The implemented novelty profiles are:

-   `structure`: nested groups, nested edits, group moves, deletes, and other
    tree-shape operations.
-   `session-lifecycle`: late join, reload, and reconnect style coverage.
-   `persistence-no-title`: save/reload persistence without title edits, to
    avoid dominating on known title-only persistence noise.
-   `revision-persistence`: save/reload plus revision-restore coverage. This
    should stay enabled unless a real revision bug or a specific harness issue
    is documented.
-   `three-user-late-join`: a third collaborator joins after editing has
    started and then performs a witnessed post-join mutation.
-   `same-user-lifecycle`: optional same-account multi-tab lifecycle coverage.
    Enable with `RTC_FUZZ_NOVELTY_ENABLE_SAME_USER=1`; the monitor schedules it
    as a handoff after late-join coverage has reached the configured target.
-   `common-blocks`: focused coverage for common blocks that were under-sampled
    by the default action mix.
-   `block-gauntlet`: focused coverage for broader block-library surfaces,
    including details, cover, media-text, gallery, file, social links, spacer,
    HTML, shortcode, more, quote, separator, and verse.
-   `parser-serialization`: parser and serialization stress without sync fault
    injection.
-   `parser-transform`: focused coverage for editor load/reparse transforms.
    This is the lane to use for parser suggestions involving optional-semicolon
    HTML character references, entity references in attributes, deprecated block
    save forms, built-in validation fixes, equivalent HTML, freeform content,
    and code-editor-to-visual-editor transitions. Run it with sync faults
    disabled first so parser/RTC correctness bugs are not confused with
    injected transport failures.
-   `multi-reload-lifecycle`: more than one real browser reload during a seed.
-   `novelty-http-persistence-probe`: optional HTTP probe. Enable it with
    `RTC_FUZZ_NOVELTY_ENABLE_HTTP_PROBE=1`, preferably in a separate HTTP-only
    supervisor/env so switching provider plugins does not disrupt active WS
    groups.

These profiles are meant to broaden surface area, not to replace the full or
persistence profiles.

The novelty policy uses one spare fourth browser slot, when VM/load headroom is
available, to top off under-covered common/block-gauntlet surfaces. It should
not rotate out currently useful parser-transform, late-join, or multi-reload
lanes just because a single block family is thin. Same-user coverage replaces a
completed late-join lane instead of competing with it from startup.

The novelty monitor tracks offsets per coverage file and skips triage/recheck
directories by default. This keeps deep-triage reruns from inflating exploration
coverage. Set `RTC_FUZZ_NOVELTY_INCLUDE_RECHECK_COVERAGE=1` only when you
explicitly want recheck/repro coverage to affect novelty scoring.

The novelty status file includes health warnings when enabled profiles do not
produce ingested coverage or when a profile requests CDP coverage but no CDP
hashes are observed. Treat those warnings as instrumentation failures before
making scheduling decisions from novelty counts.

The parser-transform lane can produce a high volume of likely-real but
duplicative failures. In recent runs, the common families were:

-   HTML entity/reference normalization divergence after a parse/reset.
-   Deprecated `core/verse` line-break divergence (`\n` versus `<br>`).
-   Stale-prefix or stale-tail duplication after full-document parse/reset.
-   Top-level ordering/index drift after reparse/freeform boundaries.

When one of those dominates, keep one canonical signature for deep repro work
and gate duplicate signatures in the analysis tier so the lane can continue
exploring adjacent parser-transform cases.

The novelty monitor also tracks pre-action startup failures by profile. A
pre-action startup failure is a run that fails before any user action and before
any collaborator is recorded, usually while waiting for WS mutual discovery. By
default, `RTC_FUZZ_NOVELTY_PAUSE_ON_STARTUP_FAILURE=1` pauses a profile after
`RTC_FUZZ_NOVELTY_STARTUP_FAILURE_LIMIT=2` such failures, removes it from the
generated supervisor groups, and sends `SIGTERM` to its active lanes. When the
machine has no resource headroom and more than five novelty groups are enabled,
the monitor can also temporarily pause lower-priority profiles that have already
hit one startup failure. Paused groups are written to `novelty-status.md` and
`novelty-state.json`; clear the `pausedGroups` entry only after the startup
failure is understood or the resource mix has been reduced.

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

To stop monitors and analysis services, kill their tmux sessions:

```bash
tmux kill-session -t rtc-live-analysis-active
tmux kill-session -t rtc-live-analysis-novelty
tmux kill-session -t rtc-fuzz-novelty-monitor
tmux kill-session -t rtc-fuzz-novelty-supervisor
tmux kill-session -t rtc-periodic-codex-monitor
```

To stop individual per-generation analysis or triage, kill those tmux sessions.
Do not delete `.triage-watcher`; it is the durable queue and result store.

To resume:

1. Restart the same supervisor/watchdog with the same `RUN_ROOT` and groups path.
2. Restart the live-analysis monitor for the supervised run root.
3. Restart the novelty monitor if novelty-guided expansion was enabled.
4. Read active/current generation dirs from `supervisor-state.json`.
5. Restart browser-heavy triage and deep-analysis sessions for active dirs that
   still have likely-real or uncertain backlog.
6. Restart the periodic Codex monitor.
7. Append a resume entry to `monitor-status.md`.

For another machine, hand off:

-   the base branch ref and head commit
-   `base-update.md`
-   `supervisor-groups.json`
-   `monitor-status.md`
-   current `supervisor-state.json`
-   all `.triage-watcher/**/result.json`, `analysis.md`, `deep-analysis.md`, `handoff.md`, and `repro-handoff.md`
-   one canonical seed/artifact directory per likely-real distinct bug family
-   a manifest mapping distinct bug type to canonical repro candidate and commands

## Remote Publishing

Keep the reproducible fuzzer code on `danluu/try/jetstream-fuzz`:

```bash
git push danluu HEAD:try/jetstream-fuzz
```

Run status and human-readable explanations should be published on a separate
explanation branch so they do not churn the fuzzer branch. Use a branch name
with a date and run id, for example:

```bash
git switch -c explain/rtc-fuzz-run-$( date -u +%Y%m%d )
git add docs/explanations/architecture/real-time-collaboration-fuzzing-pipeline-runbook.md
git add -f "$RUN_ROOT/monitor-status.md" "$RUN_ROOT/base-update.md"
git commit -m "Document RTC fuzz run status"
git push danluu HEAD
```

Do not add the full artifact tree to Git. Publish compact status, manifests,
handoff files, and canonical repro artifacts only when they are small enough to
review.

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

-   Do not manually clean or restart shared `wp-env`s while lanes or browser
    triage are running. The supervisor's bounded active-environment repair is
    the exception and should be recorded through its repair logs/events.
-   Do not disable revision restore unless a documented known bug requires it.
-   Do not revert unrelated worktree changes while updating the fuzz base or scripts.
-   Do not let analysis-only tiers run Playwright, Chrome, Docker, `wp-env`, or tests.
-   Do not bypass the analysis guard-bin wrappers for normal Codex-only
    analysis. Broad artifact scans have previously starved useful work.
-   Do not file a bug from a candidate that only has a fault-injected or state-mutating repro.
-   Do not delete run dirs, lane dirs, or `.triage-watcher` while a run may be resumed.
-   Keep every monitor action durable in `monitor-status.md`.
