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

## Fuzzing Level Mix

Supervisor group JSON should include `fuzzLevel`. Existing browser campaigns use
`browser-e2e`, but the policy loop should reason about more than browser action
profiles. When coverage stalls or duplicate/noise dominates, ask whether the
next useful work belongs at one of these levels:

-   `browser-e2e`: Playwright RTC flows through the editor UI.
-   `transport-integration`: HTTP/WS persistence and sync probes that still
    exercise WordPress services but avoid full UI breadth.
-   `unit-property`: seeded Jest/property checks for CRDT, parser,
    serialization, rich-text, and selection logic.
-   `coverage-guided-lower-level`: libFuzzer/AFL-style in-process harnesses, or
    equivalent JS/PHP coverage-guided loops, for isolated parser,
    serialization, rich-text, CRDT, sync-message, or API codec logic.
-   `backend-api`: PHP or REST/API checks for post locks, autosaves,
    revisions, permissions, nonces, and entity persistence.
-   `protocol-server`: sync server, provider, and message-ordering checks.
-   `fuzz-assertion`: fuzz-only assertions and oracles added to surface latent
    invariants during any of the above runs.

The focused gap Codex loop is responsible for making this decision whenever it
runs. It should not automatically start a broad new campaign; the default
action is a bounded lower-level target with a clear oracle, or a group-policy
change that shifts a small amount of work from over-saturated levels to the
blocked one. When lower-level code can be isolated enough to run in process, the
loop should explicitly consider libFuzzer-style coverage guidance before
settling for random seed replay. The trend graph report includes the observed
level mix over time so reviewers can see whether all live work is still
concentrated in browser/e2e lanes.

The graph refresh watcher uses `bin/rtc-trend-collect-graph-inputs.sh` to copy
supervisor group history from Jetstream and write
`data/fuzz_level_mix.csv`. It also derives `data/fuzz_level_executions.csv`
from lane `events.ndjson` files. The execution metric is a level-specific
runner counter, not just a supervisor launch count: browser/e2e lanes count
completed seed attempts, unit/property lanes count generated unit/property
cases, coverage-guided lower-level lanes count covered inputs when emitted, and
backend/protocol lanes count emitted cases. Rechecks count as executions.
`bin/rtc-trend-run-codex-refresh.sh` tells the graph refresh Codex job to
preserve and interpret the level-mix and execution-rate plots, and
`bin/rtc-trend-generate-evidence.sh` includes the latest level-mix and
execution summaries in the persona-loop evidence packet.
The collector also copies recent PR-split, duplicate/noise, level-mix,
native-harness, protocol-server, and fuzz-only-assertion synthesis/action
reports into the graph refresh persona-input directory. Graph interpretation
jobs should treat those reports as controller evidence and may reject the graph
summary if it disagrees with live loop state.
The collector also writes `data/bug_findings.csv`,
`data/bug_outputs.csv`, `data/bug_effectiveness_by_level.csv`,
`data/bug_effectiveness_by_profile.csv`,
`data/bug_output_effectiveness_by_level.csv`, and
`data/bug_output_effectiveness_by_profile.csv`. The likely-real graphs are
triage-output metrics only: they count non-duplicate `.triage-watcher`
`result.json` rows classified `likely_real` per 100 runner-hours. The unique
bug-output candidate graphs are broader and dedupe non-infra likely-real or
uncertain triage rows, untriaged raw browser/transport failure signatures, and
lower-level assertion failures by canonical output key. The report also keeps
the pre-triage failed-attempt graphs as lead indicators, but those are not
confirmed bug counts.

The lower-level rich-text/CRDT coverage-guided lane uses
`bin/rtc-coverage-guided-lower-level-runner.mjs` with V8 coverage and semantic
feature feedback from profile-specific unit/property harnesses such as
`packages/core-data/src/utils/test/rtc-rich-text-crdt-merge.coverage-fuzz.test.js`
and
`packages/core-data/src/utils/test/rtc-table-query-array-crdt.coverage-fuzz.test.js`.
The runner writes `GUTENBERG_RTC_CG_FEATURE_FILE` for each batch and retains
corpus inputs when they discover either new V8 ranges or new domain features
such as cursor position classes, entity/formatting shapes, text-growth classes,
query-array table shapes, and oracle paths. Its `events.ndjson` and
`status.tsv` rows include `featureKeys` and `newFeatureKeys` next to the
coverage counters.

`bin/rtc-fuzz-level-mix-persona-loop-remote.sh` starts the continuous
fuzz-level mix controller on Jetstream2. This loop must not wait for stalls,
errors, or harness-work candidates before reviewing the mix. Every cycle it:

-   builds context from the current coverage-guided, focused, strict-expansion,
    gap-booster, unit/property, coverage-guided lower-level, and native sidecar
    run roots;
-   performs a control-plane self-audit before making mix recommendations:
    expected controller tmux sessions must be exact matches, not prefix matches;
    an alive watchdog must not mask a missing main loop; coverage-guided novelty
    must not sit with an empty `supervisor-groups.json` or zero materialized
    supervisor groups when current-run duplicate/noise is clear; and historical
    known-noise holds must not starve current clean runs. The audit also checks
    whether the duplicate/noise singleton lock is held without a live controller
    PID, which usually means a long-running child inherited the lock and will
    block restart attempts. A stale duplicate/noise per-cycle `loop.lock` with
    no live owner is also an action item because it prevents review/action cycles
    from running even when the main tmux session exists;
-   reconciles root inventory against live tmux/process state and marks
    `TELEMETRY-INVARIANT-FAIL` when a live event-producing sidecar is not
    visible through `events.ndjson`;
-   records the active lane mix and current-root execution counters by fuzzing
    level;
-   includes coverage-guided lower-level quality counters such as recent
    `newCoverageKeys`, `newFeatureKeys`, input count, nonzero exits, and corpus
    growth so "lane is running" is not treated as sufficient progress;
-   includes a bug-finding yield gate that makes unique maintainer-relevant
    product bugs and triage-ready assertion families the primary optimization
    target. Raw execution count, semantic feature novelty, and lane diversity
    are supporting signals only. Infra/harness failures such as missing tests,
    module load failures, startup stalls, and wp-env/REST bootstrap failures are
    treated as blockers, not bug yield;
-   includes a lower-level output effectiveness gate that separates semantic
    feature outputs from bug/assertion outputs. High execution volume that
    produces feature novelty but no triage-ready bug/assertion families is
    marked `ACTION-NEEDED` even when the lane is alive and fast;
-   includes runner throughput diagnostics: recent batch duration, approximate
    milliseconds per individual execution/input, executions per hour per lane,
    fixed normal-path sleeps, and command shape. If the loop sees per-batch
    `npm run test:unit`/Jest startup dominating a lower-level runner, or a fixed
    sleep between useful batches, it marks that as `ACTION-NEEDED`;
-   launches one xhigh Codex tmux session per standard persona, with
    `RTC_FUZZ_LEVEL_MIX_MAX_PARALLEL=6` by default so all six personas think in
    parallel;
-   synthesizes the six reports;
-   after every two review cycles, launches one action Codex job that must make
    a concrete control decision.

The action job should first repair any telemetry invariant failure, then either
add or launch the smallest bounded lower-level target with a clear oracle, or
write the exact blocker and next command/code change needed. A mix with zero
active `unit-property`, `coverage-guided-lower-level`, `backend-api`,
`protocol-server`, and `fuzz-assertion` lanes is an actionable control-loop
input, not merely a graph annotation. A visible lower-level lane is necessary
but not sufficient: if novelty or useful execution quality stalls, the action
job should improve guidance, target shape, mutation, corpus selection, or
oracle coverage. If lower-level executions collapse to too few unique semantic
outputs, the action job should add or improve a bounded target/oracle, semantic
failure key, mutation strategy, or triage-ready failure artifact before
claiming the lower-level lane is productive. If runner throughput is
overhead-dominated, the action job
should remove unnecessary sleeps, amortize startup with larger useful batches,
or build a persistent/direct lower-level harness before claiming the lower-level
lane is productive. The browser/e2e fuzzers should continue running while
lower-level targets are added unless there is clear evidence that they are
blocking the lower-level work.

The launcher also starts `rtc-fuzz-level-mix-persona-loop-watchdog`, which
restarts `rtc-fuzz-level-mix-persona-loop` if the controller exits. A missing
level-mix tmux session is a service failure, not a state that should wait for a
human prompt. Watchdogs and guards must use exact session-name checks, because
`tmux has-session -t name` can prefix-match `name-watchdog` and falsely report
that the main session exists. Long-running child processes launched by singleton
controllers must close the controller lock file descriptor before running Codex
or tests; otherwise a killed parent can leave an orphan child holding the lock
and make every subsequent restart exit immediately.

`bin/rtc-native-assert-protocol-work-start-remote.sh` starts three additional
parallel Jetstream2 workstreams:

-   a native/coverage-guided lower-level harness loop using the standard six
    personas at `MAX_PARALLEL=6`; after every two review cycles it runs an
    action job to build a ready harness rather than treating missing native
    harness setup as a blocker;
-   a protocol/server fuzz loop using the same standard persona cadence; after
    two review cycles it builds the smallest ready protocol/server harness with
    concrete oracle and event accounting;
-   fuzz-only assertion unblock/repair Codex jobs, used for live blockage such
    as stale `rtc-fuzz-asserts-*` tmux sessions and loop timeout hardening.

These jobs write under
`/media/volume/danluu-fuzz-data/rtc-native-assert-protocol-20260516/`. They
should not stop productive browser fuzzing. Native and protocol harness action
jobs must write `supervisor-groups.json` and `events.ndjson` with the appropriate
fuzzing level so trend graphs can show the new executions.

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
	bin/rtc-coverage-guided-lower-level-runner.mjs \
	bin/rtc-fuzz-*.mjs \
	bin/rtc-test-ws-sync-server.mjs \
	packages/core-data/src/utils/test/rtc-rich-text-crdt-merge.coverage-fuzz.test.js \
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
mkdir -p \"\${HOME:-/home/exouser}/.local/bin\"
npm install -g --prefix \"\${HOME:-/home/exouser}/.local\" @openai/codex@0.130.0
install -m 755 \"\$REMOTE_REPO/bin/rtc-coverage-guided-start-remote.sh\" /tmp/start_rtc_coverage_guided_remote.sh
install -m 755 \"\$REMOTE_REPO/bin/rtc-coverage-guided-lower-level-start-remote.sh\" /tmp/start_rtc_coverage_guided_lower_level.sh
install -m 755 \"\$REMOTE_REPO/bin/rtc-coverage-guided-cleanup-remote.sh\" /tmp/cleanup_rtc_coverage_guided_remote.sh
install -m 755 \"\$REMOTE_REPO/bin/rtc-coverage-guided-watchdog-start-remote.sh\" /tmp/start_rtc_coverage_guided_watchdog_remote.sh
install -m 755 \"\$REMOTE_REPO/bin/rtc-resource-autoscaler-remote.sh\" /tmp/start_rtc_resource_autoscaler.sh
install -m 755 \"\$REMOTE_REPO/bin/rtc-strict-expansion-start-remote.sh\" /tmp/start_rtc_strict_expansion.sh
install -m 755 \"\$REMOTE_REPO/bin/rtc-focused-shards-start-remote.sh\" /tmp/start_rtc_focused_shards.sh
install -m 755 \"\$REMOTE_REPO/bin/rtc-focused-shards-cleanup-remote.sh\" /tmp/cleanup_rtc_focused_shards.sh
install -m 755 \"\$REMOTE_REPO/bin/rtc-focused-shards-gap-codex-loop-remote.sh\" /tmp/start_rtc_focused_gap_codex_loop.sh
install -m 755 \"\$REMOTE_REPO/bin/rtc-fuzz-only-asserts-loop-remote.sh\" /tmp/start_rtc_fuzz_only_asserts_loop.sh
install -m 755 \"\$REMOTE_REPO/bin/rtc-gap-booster-start-remote.sh\" /tmp/start_rtc_gap_booster.sh
install -m 755 \"\$REMOTE_REPO/bin/rtc-duplicate-noise-persona-loop-remote.sh\" /tmp/start_rtc_duplicate_noise_persona_loop.sh
install -m 755 \"\$REMOTE_REPO/bin/rtc-fuzz-level-mix-persona-loop-remote.sh\" /tmp/start_rtc_fuzz_level_mix_persona_loop.sh
install -m 755 \"\$REMOTE_REPO/bin/rtc-native-assert-protocol-work-start-remote.sh\" /tmp/start_rtc_native_assert_protocol_work.sh
install -m 755 \"\$REMOTE_REPO/bin/rtc-deferred-work-promotion-loop-remote.sh\" /tmp/start_rtc_deferred_work_promotion_loop.sh
install -m 755 \"\$REMOTE_REPO/bin/rtc-pr-finalization-loop-remote.sh\" /tmp/start_rtc_pr_finalization_loop.sh
install -m 755 \"\$REMOTE_REPO/bin/rtc-critical-path-pr-executor-loop-remote.sh\" /tmp/start_rtc_critical_path_pr_executor_loop.sh
install -m 755 \"\$REMOTE_REPO/bin/rtc-structural-issue-watchdog-remote.sh\" /tmp/start_rtc_structural_watchdog.sh
install -m 755 \"\$REMOTE_REPO/bin/rtc-jetstream-guard-remote.sh\" /tmp/start_rtc_jetstream_guard.sh
"
```

The remote scripts put `${HOME:-/home/exouser}/.local/bin` first in `PATH` and
also pass `RTC_FUZZ_CODEX_BIN` to Codex-owning monitors. If Codex is absent or
not on that path, analysis loops can appear to launch while producing empty
reports with `codex: command not found`.

The remote launchers are intentionally split by ownership:

-   `rtc-coverage-guided-start-remote.sh` starts the coverage-guided novelty
    monitor and its generated supervisor groups.
-   `rtc-coverage-guided-lower-level-start-remote.sh` starts the isolated
    rich-text/CRDT lower-level runner. It emits V8 coverage counters and
    semantic feature counters, and keeps corpus inputs for either kind of new
    feedback.
-   `rtc-coverage-guided-watchdog-start-remote.sh` runs
    `rtc-browser-fuzz-session-watchdog.mjs` and restarts the coverage-guided
    session through the stable `/tmp` launchers.
-   `rtc-resource-autoscaler-remote.sh` watches CPU, memory, requested
    coverage-guided budget, and browser/e2e materialization. It does not treat
    requested budget as success unless `supervisor-state.json` shows live run
    directories or running groups. If the novelty monitor is alive but the
    supervisor is stale, has zero active run dirs, or all groups are paused on
    infra startup, it writes
    `/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516/materialization/latest.md`
    and restarts the coverage-guided path after the remediation cooldown. If all
    enabled coverage groups are paused on wp-env infra startup and no browser
    runner is using the affected repo cwd, it can run
    `npm run wp-env-test -- destroy --force` before restarting. That reset is
    cooldown-limited and is intended for persistent test-environment corruption
    such as a MariaDB volume that repeatedly exits during `wp-env start`.
    Resource pressure decisions use 1-, 5-, and 15-minute load averages. Severe
    pressure drops the coverage-guided budget to the minimum browser/e2e floor,
    high pressure keeps it near that floor, and pressure keeps it below the
    steady-state budget. Scale-up is blocked while the 1-, 5-, or 15-minute load
    averages still show a backlog, so the controller cannot increase browser
    work merely because a severe spike decayed into a still-overloaded high
    pressure state.
    During severe pressure it can also stop optional browser/e2e supervisors
    (`gap-booster`, `focused-shards`, and `strict-expansion`) without stopping
    analysis-only loops. The Jetstream guard consults the autoscaler status and
    does not restart those optional browser pools while the autoscaler reports
    high or severe pressure.
    Coverage-guided historical duplicate/noise is advisory unless the
    current-run duplicate/noise gate is also active; otherwise the loop must keep
    at least one bounded browser/e2e lane materialized.
-   `rtc-strict-expansion-start-remote.sh`, `rtc-focused-shards-start-remote.sh`,
    and `rtc-gap-booster-start-remote.sh` start independent fuzz campaigns for
    high-value gaps.
-   `rtc-focused-shards-gap-codex-loop-remote.sh` keeps Codex analysis focused
    on deferred coverage gaps and feeds the results back into the focused shard
    setup.
-   `rtc-fuzz-only-asserts-loop-remote.sh` runs the high-parallel fuzz-only
    assertion analysis and critique loop. Only its final applier job should edit
    files or restart fuzzing. Timed-out round sessions are killed before the
    next cycle so stale assertion analysis cannot block the loop forever.
-   `rtc-duplicate-noise-persona-loop-remote.sh` runs the duplicate/noise
    remediation persona loop. It should run under the named
    `rtc-duplicate-noise-persona-loop` tmux session, takes a process singleton
    lock, and has bounded Codex action timeouts so one hung action cannot block
    the loop indefinitely.
-   `rtc-fuzz-level-mix-persona-loop-remote.sh` runs the level-mix controller
    and its watchdog. The top-level guard should restart the existing generated
    loop/watchdog scripts when possible instead of rerunning the destructive
    launcher while a review cycle is active. Its persona, synthesis, and action
    Codex jobs are bounded by timeout so a hung review cannot prevent the next
    control decision.
-   `rtc-native-assert-protocol-work-start-remote.sh` creates the native-harness
    and protocol-server persona loops. The top-level guard restarts the
    generated loop scripts if those controllers disappear. Generated native and
    protocol Codex jobs are also timeout-bounded.
-   `rtc-deferred-work-promotion-loop-remote.sh` turns deferred bug families
    into local candidate branches, targeted diagnostics, or explicit downscope
    reports. It reads current fuzz output and PR-split reports, creates one
    worktree per job, and keeps default Codex concurrency conservative. It does
    not apply an independent load-average launch gate; resource pressure is
    observed in status/context and handled by the shared scaling policy.
-   `rtc-pr-finalization-loop-remote.sh` audits candidate branches and produces
    branch-split corrections, diffstats, validation notes, and push commands for
    the local host. It does not push from Jetstream and does not independently
    throttle analysis jobs based on load average.
-   `rtc-critical-path-pr-executor-loop-remote.sh` consumes PR-split,
    finalization, deferred-work, coverage, resource, tmux, and guard artifacts
    into typed blocker/lane/queue state. It keeps branch audit and push-manifest
    export lanes parallel, adopts active blocker jobs before launching new ones,
    and can launch bounded continuation jobs for critical blockers such as
    PR17/seed `1020002`. It writes local-host handoff artifacts only and never
    pushes from Jetstream.
-   `rtc-pr-split-review-loop-remote.sh` runs bounded persona, synthesis,
    feedback, and progress-unblock Codex jobs. A single hung review or action
    must not pin the PR split loop indefinitely.
-   `rtc-structural-issue-watchdog-remote.sh` detects alive-but-wrong
    control-plane failures that ordinary process watchdogs miss: stale status
    with a live tmux session, recent reconcile/temp-file errors, prefix tmux
    session masking, repeated guard restarts, passive PR07C/runtime-readiness
    classifications, and current-run duplicate/noise dominance that is still
    visible in `novelty-status.md`. It writes
    `/media/volume/danluu-fuzz-data/rtc-structural-watchdog-20260518/current-structural-watchdog-status.md`
    and launches bounded `rtc-structural-repair-*` Codex jobs for high-severity
    findings. Those jobs may patch Jetstream scripts and restart only the
    affected loop, then leave file lists or patches for persistence to
    `try/jetstream-fuzz`.
-   `rtc-jetstream-guard-remote.sh` is the top-level guard. Run it in tmux and
    let it restart missing sessions instead of manually restarting individual
    fuzzers. The guard supervises coverage-guided, strict-expansion, focused
    shards, gap booster, lower-level unit/property and coverage-guided lanes,
    the focused gap Codex loop, duplicate/noise remediation, level-mix,
    native/protocol harness loops, the fuzz-only assertion loop, the
    deferred-work promotion loop, the PR-finalization loop, the critical-path PR
    executor, the structural watchdog, and the resource autoscaler. It uses
    exact tmux session-name checks and treats a coverage-guided novelty run with
    an empty work queue and clear current-run noise as a materialization stall
    to restart and escalate.

Start or refresh the guard after installing the launchers. `stop` exits the
guard process after killing its sleeping child, so a refresh should not leave an
orphaned `sleep` process holding `guard.lock`. `start` also clears the known
stale-lock cases where an older guard left a parentless `sleep` or pid-file-less
guard `run` process holding the lock.

```bash
ssh "$JETSTREAM" "
/tmp/start_rtc_jetstream_guard.sh stop || true
/tmp/start_rtc_jetstream_guard.sh start
/tmp/start_rtc_jetstream_guard.sh status
"
```

## Deferred Work And PR Finalization Loops

`rtc-deferred-work-promotion-loop-remote.sh` owns the path from "deferred" to
"reviewable branch". It runs as `rtc-deferred-work-promotion-loop`, writes
status to
`/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/current-deferred-status.md`,
and launches bounded jobs named `rtc-deferred-job-*`.

Each deferred job gets a separate worktree under
`/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/worktrees/`
and a local branch named `deferred/rtc-<family>-<timestamp>`. Jobs must use that
worktree for code changes so the live fuzzer checkout is not disturbed. The
default families are:

-   `reload-hydration`
-   `pre-save-search-live-collapse`
-   `rich-text-suffix-corruption`
-   `malformed-save-payload`
-   `http-room-isolation`

The loop also writes
`/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516/current-deferred-queue.tsv`.
That queue combines the fixed deferred families with current novelty, focused,
and strict-expansion fuzz output, so jobs see the latest fuzzing feedback instead
of only stale report text.

Useful controls:

-   `RTC_DEFERRED_WORK_MAX_ACTIVE_JOBS=2`: maximum concurrent deferred Codex jobs.
-   `RTC_DEFERRED_WORK_CYCLE_SLEEP_SECONDS=900`: delay between queue passes.
-   `RTC_DEFERRED_WORK_MIN_FAMILY_INTERVAL_SECONDS=1800`: per-family launch
    cooldown.
-   `RTC_DEFERRED_WORK_FAMILIES="..."`: override the family list.

`rtc-pr-finalization-loop-remote.sh` runs as `rtc-pr-finalization-loop`, writes
status to
`/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516/current-finalization-status.md`,
and launches one `rtc-pr-finalize-job-*` by default. Its job is branch hygiene:
detect branches that accidentally contain the whole stack, create or correct
local split branches when safe, record file counts and diffstats, and write exact
push commands for the local host. It should not push from Jetstream.

Useful controls:

-   `RTC_PR_FINALIZATION_MAX_ACTIVE_JOBS=1`: maximum concurrent finalization jobs.
-   `RTC_PR_FINALIZATION_CYCLE_SLEEP_SECONDS=1200`: delay between finalization
    passes.
-   `RTC_PR_FINALIZATION_MIN_INTERVAL_SECONDS=1800`: launch cooldown.

`rtc-critical-path-pr-executor-loop-remote.sh` runs as
`rtc-critical-path-pr-executor-loop`, writes status to
`/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/current-critical-path-status.md`,
and writes machine-readable state next to it:

-   `inputs.tsv`: status/report/artifact inputs with size, mtime, hash, and
    present/zero/missing status.
-   `blockers.tsv`: typed blockers such as PR17/seed `1020002`, PR07C browser
    environment gating, residual reducers, and deferred-family blockers.
-   `lanes.tsv`: per-PR or per-seed lanes with resource class and publication
    class.
-   `queue.tsv`: runnable, active, gated, or adopted work items with dedupe keys.
-   `active-jobs.tsv`: exact tmux sessions adopted from the existing system.
-   `current-branch-audit.tsv`, `current-push-manifest.tsv`, and
    `current-validation-matrix.tsv`: local-host handoff artifacts generated by
    parallel branch validation/export lanes.
-   `no-progress.tsv`: zero-byte, temporary, or otherwise non-terminal artifacts
    that must not be counted as progress.

The executor exists to turn blocker reports into continuation work and local-host
handoff artifacts. It must not become another passive report loop:

-   It adopts equivalent active jobs before launching anything.
-   It dedupes by blocker/action/ref/SHA/input fingerprint.
-   It keeps branch audit/export moving even while PR17/seed `1020002` blocks
    final-stack validation, final fuzzing, or filing.
-   It runs each reconcile pass under a hard timeout, and the PR17 fresh
    evidence check uses a bounded scan over historical artifacts. A stale
    historical artifact walk must not prevent PR07C repair or branch validation
    scheduling.
-   It gates browser/e2e work behind the resource autoscaler, but the PR07C
    browser lane is a repair lane, not a passive preflight. A
    `runtime-readiness-blocked` artifact, including `_wpCollaborationEnabled`
    remaining `null`, must be treated as the environment bug to repair before
    PR07C/seed `7510029` ownership evidence can be accepted.
-   It never pushes from Jetstream and must not mark raw `deferred/*`,
    `try/*`, `finalize/*`, `validation/*`, old polluted PR refs, or
    `candidate/*` refs as product-ready without classification.

Useful controls:

-   `RTC_CRITICAL_PR_EXECUTOR_MAX_ACTIVE_CONTINUATIONS=2`: maximum concurrent
    Codex continuation jobs.
-   `RTC_CRITICAL_PR_EXECUTOR_MAX_ACTIVE_VALIDATIONS=6`: maximum concurrent
    branch validation/export jobs.
-   `RTC_CRITICAL_PR_EXECUTOR_CYCLE_SLEEP_SECONDS=60`: delay between reconcile
    passes.
-   `RTC_CRITICAL_PR_EXECUTOR_RECONCILE_TIMEOUT_SECONDS=300`: upper bound for a
    single reconcile pass before the loop logs the stall and continues.
-   `RTC_CRITICAL_PR_EXECUTOR_FRESH_EVIDENCE_SCAN_TIMEOUT_SECONDS=12`: upper
    bound for historical fresh-evidence artifact scans.
-   `RTC_CRITICAL_PR_EXECUTOR_MIN_TASK_INTERVAL_SECONDS=900`: per-dedupe-key
    launch cooldown.
-   `RTC_CRITICAL_PR_EXECUTOR_ENABLE_BROWSER_PREFLIGHT=0`: browser preflight is
    represented as a gated lane by default; set to `1` only when the operator
    wants the executor to launch that named heavy lane under autoscaler headroom.

These Codex-heavy loops are intentionally not separately throttled by load
average. The standard policy is: decide the work mix first, keep analysis moving
unless it launches CPU-intensive tests, and let the resource autoscaler scale
browser/e2e materialization when the machine is under pressure.

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

The long-running Jetstream2 strict-expansion, focused-shards, gap-booster, and
coverage-guided browser loops should all run broad discovery in low-disk mode.
If artifact growth accelerates, first verify the tmux pane environment for
`RTC_FUZZ_LOW_DISK_MODE=1` and `RTC_FUZZ_PLAYWRIGHT_VIDEO=off` before deleting
run outputs.

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
-   `GUTENBERG_RTC_BROWSER_REAL_USER_TYPING_DELAY_MS=0`: do not add an
    artificial per-character delay to real-user keyboard actions. Raise this
    only for focused slow-typing coverage.
-   `GUTENBERG_RTC_BROWSER_PERSISTED_POST_MARKER_POLL_INTERVAL_MS=50`: poll
    REST persistence/revision marker checks quickly. This is a polling interval,
    not a required settle sleep.
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

Strict pre-action startup/discovery failures are control-plane telemetry, not
normal product-failure signatures. The triage watcher aggregates these under
`metrics.suppressedKnownNoise.strictPreActionStartup` and prunes any stale
strict-startup signatures from `.triage-watcher/state.json`. They should not
enter browser triage, first-level analysis, deep analysis, live-analysis
startup, or the current-run duplicate-share denominator. Product-evidence
failures after users/actions/reload/save/revision/fault operations must remain
visible.

The duplicate/noise persona loop treats current-run duplicate dominance as a
hard action gate. If `novelty-status.md` reports top duplicate family share
`>= 0.50` with at least three current-run signatures, that is action-needed even
when likely-real or product-evidence representatives are visible. The loop must
preserve at least one representative and then fix the producer/consumer leak with
family caps, producer rotation, or live-analysis accounting. If
`pre_action_bootstrap_stall` is still the current-run top family after strict
startup suppression, the next feedback action must make or restart a bounded
control-plane change instead of only writing analysis.

The PR split review loop has a separate parallel-progress gate. A final-stack
blocker such as seed `1020002` may stop filing, final-stack fuzz, and rebuilt
full-stack validation, but it must not stop independent branch audit/linking,
push-manifest generation, PR02A/PR5/PR11 branch shaping, deferred candidate
promotion, or loop self-repair. If the loop emits wait-only feedback while
`current-pr-split.md` still has `No verified branch link yet` rows or the
deferred promotion loop has validated candidates, the loop launches a bounded
progress-unblock job under the review run's `jobs/` directory. Jetstream jobs
write push manifests for the local machine instead of pushing to GitHub. The
PR split and deferred promotion controllers both take singleton locks before
entering their main loops, so persona/guard jobs can patch or restart a
controller but cannot accidentally leave competing controller copies running.

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
    `RTC_FUZZ_NOVELTY_AUTO_GOAL_EXPANSION_THRESHOLD=3`: keep the coverage queue
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
-   `RTC_FUZZ_NOVELTY_COVERAGE_QUALITY_MAX_ENABLED_GROUPS=8`: when quality
    issues persist and the host has no headroom, keep the current gap groups
    running and rotate out extra canary/top-off groups so browser slots produce
    completed coverage records instead of startup stalls.

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
	RTC_FUZZ_NOVELTY_AUTO_GOAL_EXPANSION_THRESHOLD=3 \
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
the new output directory and carries a capped recent `observed-roots.txt` window
across restarts. The cumulative feature, hash, auto-goal, and `recordsSeen`
state lives in `novelty-state.json`; the root window is intentionally bounded so
the monitor does not rescan days of coverage files on every restart. The
`coverage files` line in `novelty-status.md` and `files=` field in monitor pass
logs are current-scan file counts, not cumulative coverage. Use
`recordsSeen`/`total records seen` for live monitor state. For trend graphs that
span logs from before `recordsSeen=` was emitted in pass lines, use monotonic
cumulative processed-record observations and keep the live state counter
separate in the CSV.

## Fuzz-Only Assertion Loop

Use `bin/rtc-fuzz-only-asserts-loop-remote.sh` on Jetstream2 to continuously
look for assertions that can be added only to fuzzing. The loop writes cycles
under `/media/volume/danluu-fuzz-data/rtc-fuzz-only-asserts-20260515/cycles/`.
Each cycle:

-   collects current novelty status, recent assertion/invariant failures,
    existing assertion sites, git status, and prior assertion-loop reports;
-   launches one xhigh Codex analysis in tmux for each of `linus torvalds`,
    `kyle kingsbury`, `marc brooker`, `dan luu`, `tptacek`, and `contrarian`;
-   runs two review rounds over the responses. By default round two analyzes
    every round-one response, so the fan-out is intentionally large and should
    run only on Jetstream2;
-   launches one applier Codex job after the analysis rounds finish. That job is
    the only job allowed to edit files. It must add assertions only behind the
    RTC fuzzing harness or explicit fuzz-only guards, and it must remove or
    tighten noisy fuzz-only assertions when current logs show duplicate/noise
    dominated failures.

The loop session is `rtc-fuzz-only-asserts-loop`; per-cycle jobs use
`rtc-fuzz-asserts-*` tmux sessions. Reports are `round0/*.report.md`,
`round1/*.report.md`, `round2/*.report.md`, and `apply.report.md` inside each
cycle directory. If a cycle modifies active fuzzing behavior, the applier should
restart only the affected RTC fuzz loop with the existing `/tmp/start_*` scripts.

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
making scheduling decisions from novelty counts. Also check the resource
autoscaler status before concluding that CPU headroom means usable browser/e2e
capacity. A live novelty monitor with `materialized_active_run_dirs: 0`, stale
`supervisor-state.json`, or nonzero `paused_infra_startup_groups` is a
materialization failure, not a successful high-level fuzzing run.

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

## Fix-Progress Controllers

The Jetstream fix-progress loops are intentionally separate from the fuzzing
lanes, but they must share state. In particular:

-   `bin/rtc-critical-path-pr-executor-loop-remote.sh` consumes the local
    publication manifest at
    `/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516/latest-local-publish-manifest.tsv`.
    It enables the reserved `PR07C` browser readiness repair lane by default
    and only gates that reserved slot under severe or unknown resource pressure.
    The lane must produce `validation.tsv`, `classification.tsv`,
    `repair-branch.txt`, and `report.md`; it must not classify an existing
    `runtime-readiness-blocked` replay as completed progress.
-   `bin/rtc-pr-finalization-loop-remote.sh` runs two finalization jobs at most,
    checks every five minutes, and includes the local publication manifest in
    its context so GitHub publishing from the local host clears stale
    publication blockers.
-   `bin/rtc-deferred-work-promotion-loop-remote.sh` runs up to three deferred
    promotion jobs, rotates families every five minutes, and records loop pid
    and script mtime in status so a patched-but-not-restarted loop is visible.
-   `bin/rtc-pr-split-review-loop-remote.sh` includes the local publication
    manifest in review context. A feedback action that creates no independent
    progress now launches a bounded progress-unblock job, not only actions that
    contain obvious wait-only wording.
-   Local branch publication should be invoked by the same local loop that
    publishes
    `docs/explanations/architecture/rtc-jetstream2-fix-pr-status-20260515.md`.
    The helper is `bin/rtc-local-pr-branch-publisher-loop.sh`; use `once` mode
    after a status refresh rather than running it as a separate polling daemon.
    It reads Jetstream push manifests, asks Codex for a conservative push plan,
    validates refs and SHAs deterministically, pushes safe branches to `danluu`,
    and writes the resulting local publish manifest back to Jetstream.

After changing one of these scripts on Jetstream, restart the matching tmux
session on the `rtc-fuzz` socket and confirm that the status file shows the new
script behavior. Do not treat a script copy as deployed until the live status
shows the new pid, script mtime, or new setting.

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
