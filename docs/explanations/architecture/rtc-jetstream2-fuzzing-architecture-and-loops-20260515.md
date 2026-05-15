# RTC Jetstream2 fuzzing architecture and active loops

Snapshot time: `2026-05-15T19:24:42Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Data root:
`/media/volume/danluu-fuzz-data`

Remote working repo used by most loops:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Current fuzz code under test in active lanes:
`try/rtc-fix-stack-validation` at
`72854f05ed20106daac3d125206f2643dac41677`.

## System Shape

The Jetstream2 setup is a set of independent long-running loops, each with one
clear owner. The important split is:

- Fuzz supervisors own browser fuzz lanes and `wp-env`/WebSocket setup.
- Coverage-guided novelty owns which coverage groups should run.
- Watchdogs own process/session recovery.
- Analysis loops own first-pass triage and Codex review work.
- Run roots own all durable state, so another agent can reconstruct what was
  running without chat history.

High-level flow:

```text
start scripts
  -> tmux owner sessions
    -> novelty monitor / supervisors / watchdogs / analysis monitors
      -> per-group generation directories
        -> per-lane seed directories
          -> Playwright artifacts, behavioral coverage, summaries, triage state
      -> novelty-status.md and supervisor-state.json
```

The main state files are:

```text
<run-root>/supervisor-groups.json
<run-root>/supervisor-state.json
<run-root>/events.ndjson
<run-root>/novelty-status.md
<run-root>/novelty-state.json
<generation>/lanes.json
<generation>/lane-*/summary.ndjson
<generation>/lane-*/state.json
<generation>/lane-*/seed-*/primary/artifacts/rtc-behavioral-coverage*.json
```

The current coverage-guided root is:

```text
/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260515T184650Z
```

The coverage-guided monitor consumes both the current root and prior roots via
`observed-roots.txt`, so restarting the monitor does not throw away accumulated
coverage.

## Control Plane

The remote scripts that start or restart the durable loops are:

```text
/tmp/start_rtc_coverage_guided_remote.sh
/tmp/cleanup_rtc_coverage_guided_remote.sh
/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo/bin/rtc-focused-shards-start-remote.sh
/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo/bin/rtc-gap-booster-start-remote.sh
/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo/bin/rtc-strict-expansion-start-remote.sh
```

The start scripts set up a tmux wrapper at:

```text
/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin/tmux
```

That wrapper forces the `rtc-fuzz` tmux socket, which keeps the long-running
Jetstream2 sessions separate from unrelated tmux sessions.

The durable loop implementations live in the remote repo under `bin/`:

```text
rtc-browser-fuzz-novelty-monitor.mjs
rtc-browser-fuzz-supervisor.mjs
rtc-browser-fuzz-watchdog.mjs
rtc-browser-fuzz-session-watchdog.mjs
rtc-browser-fuzz-live-analysis-monitor.mjs
rtc-browser-fuzz-triage-watcher.mjs
rtc-test-ws-sync-server.mjs
```

## Fuzz Execution Loop

`rtc-browser-fuzz-supervisor.mjs` is the owner for fuzz execution. For each
group in `supervisor-groups.json`, it:

- starts or verifies the group's `wp-env`;
- starts the WebSocket relay when the group uses WebSocket transport;
- launches one or more browser fuzz lanes;
- records launch state in `supervisor-state.json`;
- replaces missing lanes;
- rotates groups after duration expiry;
- reduces lanes after repeated fast failures;
- keeps per-generation and per-lane metadata auditable.

The supervisor does not decide what should be interesting to fuzz next. That is
owned by coverage-guided novelty. The supervisor just runs the policy it is
given and repairs execution failures.

## Coverage-Guided Novelty Loop

`rtc-browser-fuzz-novelty-monitor.mjs` owns the coverage-guided loop. It:

- scans behavioral coverage artifacts from observed run roots;
- computes coverage goals and unmet gaps;
- writes `novelty-status.md`;
- writes or updates `supervisor-groups.json`;
- starts `rtc-coverage-guided-supervisor`;
- rotates enabled groups as coverage fills in;
- invokes coverage-guidance Codex jobs when progress stalls.

Current coverage-guided status:

```text
Updated: 2026-05-15T19:24:04.794Z
coverage files: 8147
total records seen: 15868
records processed this pass: 28
new behavioral feature keys this pass: 2
new CDP coverage hashes this pass: 1
unmet goals: 0
recommended groups: none
harness-work candidates: 0
likely-real visible: 0
```

Current enabled coverage-guided groups:

```text
novelty-ws-structure
novelty-ws-lifecycle
novelty-ws-persistence-no-title
novelty-ws-real-user-editing
novelty-http-persistence-probe
```

The monitor currently reports that triage yield is duplicate/noise dominated:

```text
bootstrap stalls: 5634
normalization-noise candidates: 150
top duplicate family share: 0.627
```

Because coverage goals are full and there are no recommended groups, the current
policy is to keep the existing loops running instead of adding broad new lanes.

## Watchdog Loops

There are two watchdog styles.

`rtc-browser-fuzz-watchdog.mjs` watches a supervisor session and its run root.
It restarts stale or missing supervisors and performs conservative cleanup for
stale stopped `wp-env` resources.

`rtc-browser-fuzz-session-watchdog.mjs` watches a top-level tmux session. For
coverage-guided fuzzing, it watches `rtc-coverage-guided-novelty` and runs:

```text
start command: /tmp/start_rtc_coverage_guided_remote.sh
cleanup command: /tmp/cleanup_rtc_coverage_guided_remote.sh
stale status path: novelty-status.md
stale state path: novelty-state.json
```

This is why the coverage-guided run automatically came back after the novelty
tmux session disappeared earlier. The monitor was later patched so a `SIGHUP`
requests natural shutdown rather than calling `process.exit()` from the signal
handler, avoiding the Node `ResetStdio` assertion seen during cleanup.

## Analysis Loops

`rtc-browser-fuzz-live-analysis-monitor.mjs` runs first-pass analysis for active
generation directories. It uses the triage watcher in gate-only mode and starts
bounded Codex analysis jobs for candidate failures. It is intentionally separate
from the fuzz supervisors so that analysis failures do not stop fuzzing.

There are currently live-analysis loops for:

```text
rtc-focused-shards-analysis
rtc-gap-booster-analysis
rtc-fuzz-strict-expansion-analysis
```

There is also a focused gap-Codex loop:

```text
rtc-focused-shards-gap-codex-loop
```

That loop periodically asks Codex to inspect focused fuzzing results and suggest
new focused coverage work when useful.

The remote also has a fix-planning Codex job still running from the broader RTC
fix planning work:

```text
/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514/run-codex.sh
```

At snapshot time, there were also active Codex review processes under:

```text
/home/exouser/wp-gym-continuous/runs/20260515T192242Z/
```

Those are outside the main RTC fuzz tmux namespace but are consuming Codex and
CPU resources on the same host. They appear to be independent review/persona
jobs rather than fuzz lane owners.

## Active Loops At Snapshot

Current tmux sessions:

```text
rtc-coverage-guided-novelty
rtc-coverage-guided-supervisor
rtc-coverage-guided-watchdog
rtc-focused-shards
rtc-focused-shards-watchdog
rtc-focused-shards-analysis
rtc-focused-shards-gap-codex-loop
rtc-gap-booster
rtc-gap-booster-watchdog
rtc-gap-booster-analysis
rtc-fuzz-strict-expansion
rtc-fuzz-strict-expansion-watchdog
rtc-fuzz-strict-expansion-analysis
```

Coverage-guided state:

```text
root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260515T184650Z
updated: 2026-05-15T19:24:13.368Z
groups: 5
running: 5
disabled: 0
```

Running coverage-guided groups:

```text
novelty-ws-structure
novelty-ws-lifecycle
novelty-ws-persistence-no-title
novelty-ws-real-user-editing
novelty-http-persistence-probe
```

Focused shards state:

```text
root: /media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515/runs/focused-shards-20260515T081620Z
updated: 2026-05-15T19:24:36.425Z
groups: 14
running: 9
disabled: 5
```

Running focused groups:

```text
focused-auth-locks-b
focused-auth-locks-a
focused-async-server-b
focused-async-server-a
focused-rich-text-b
focused-long-doc-b
focused-late-join-b
focused-same-user-stale-tabs
focused-late-join-a
```

Disabled focused groups:

```text
focused-late-join-c
focused-long-doc-a
focused-revision-recovery-a
focused-revision-recovery-b
focused-rich-text-a
```

Gap booster state:

```text
root: /media/volume/danluu-fuzz-data/rtc-gap-booster-20260515/runs/gap-booster-20260515T065220Z
updated: 2026-05-15T19:24:17.668Z
groups: 10
running: 6
disabled: 4
```

Running gap-booster groups:

```text
boost-real-user-title-rich-text
boost-three-user-late-join
boost-revision-autosave-recovery
boost-async-server-blocks-template-parts
boost-permissions-auth-locks
boost-long-session-large-doc
```

Disabled gap-booster groups:

```text
boost-block-gauntlet-async-ish
boost-multi-reload-lifecycle
boost-parser-reparse
boost-same-user-stale-tabs
```

Strict expansion state:

```text
root: /media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515/runs/strict-expansion-20260515T055909Z
updated: 2026-05-15T19:24:27.817Z
groups: 10
running: 10
disabled: 0
```

Running strict-expansion groups:

```text
ws-real-user-editing
ws-same-user-lifecycle
ws-three-user-late-join
ws-revision-persistence
ws-parser-transform
ws-parser-serialization
ws-block-gauntlet
ws-common-blocks
ws-multi-reload-lifecycle
http-persistence-probe
```

## Data Roots

Important top-level roots:

```text
/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515
/media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515
/media/volume/danluu-fuzz-data/rtc-gap-booster-20260515
/media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515
/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515
/media/volume/danluu-fuzz-data/rtc-jetstream-guard-20260515
/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514
```

The current-root pointer files are:

```text
/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/current-output-dir.txt
/media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515/current-run-root.txt
/media/volume/danluu-fuzz-data/rtc-gap-booster-20260515/current-run-root.txt
/media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515/current-run-root.txt
```

Use those pointer files instead of guessing the latest directory by timestamp.

## Operational Invariants

The loops are intended to preserve these invariants:

- A missing top-level novelty session is restarted by the session watchdog.
- A missing or stale supervisor is restarted by the per-run watchdog.
- Coverage-guided restarts preserve history through observed roots.
- Active fuzz lanes are not manually killed unless their owning supervisor or
  group config is being intentionally changed.
- Focused and gap-booster disabled groups are left disabled unless a new
  coverage gap specifically calls for them.
- Contributor auth coverage remains enabled for auth/permissions groups.
- Broad new lanes are added only when the coverage monitor reports an unmet
  goal, a recommendation, or a harness-work candidate.

## Inspection Commands

Check current coverage-guided status:

```bash
BASE=/media/volume/danluu-fuzz-data
COV=$(cat "$BASE/rtc-coverage-guided-20260515/current-output-dir.txt")
sed -n '1,180p' "$COV/novelty-status.md"
```

Check tmux loops:

```bash
export PATH=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin:$PATH
tmux ls | sort | grep -E 'rtc-coverage-guided|rtc-focused|rtc-gap|rtc-fuzz-strict'
```

Check supervisor state summaries:

```bash
BASE=/media/volume/danluu-fuzz-data
for root in \
  "$(cat "$BASE/rtc-coverage-guided-20260515/current-output-dir.txt")" \
  "$(cat "$BASE/rtc-fuzz-focused-shards-20260515/current-run-root.txt")" \
  "$(cat "$BASE/rtc-gap-booster-20260515/current-run-root.txt")" \
  "$(cat "$BASE/rtc-fuzz-strict-expansion-20260515/current-run-root.txt")"
do
  echo "== $root =="
  node -e '
    const fs = require("fs");
    const state = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    for (const g of state.groups || []) {
      console.log(`${g.name}\t${g.status}\tactive=${(g.activeRunDirs || []).length}\tlanes=${g.lanes}`);
    }
  ' "$root/supervisor-state.json"
done
```

Restart coverage-guided if both the session and watchdog fail:

```bash
/tmp/start_rtc_coverage_guided_remote.sh
```

Avoid running `wp-env clean` or global Docker cleanup while these loops are
active. Use the existing watchdog cleanup path or a targeted stale `wp-env`
cleanup script instead.
