# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T21:27:25Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-17T21:27:25Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage. Across `2116` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-17T21:25:04Z`, coverage
files grew from `272` to `47782`, a delta of `47510`. The monitor's visible
likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The live duplicate/noise gate is clean in the latest refreshed sample, but this
is a live sample rather than proof that the producer path is permanently fixed.
The latest current-output-dir sample has `duplicateShareCurrent=0.0000` and
current summary startup failures of `0`; the same pass has `0` quality issues,
`0` warnings, `426.2G` free memory, and a true monitor headroom flag. This
report uses current-output-dir duplicate/noise and summary startup failures for
live health. Historical aggregate duplicate/noise is context only; its latest
duplicate share is `0.3461` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence, not as an override. The latest
duplicate/noise synthesis, `20260517T204820Z`, rejects treating the producer
path as fixed until novelty scheduling treats active noise cooldowns as hard
stops. The matching feedback-action patched the novelty monitor, supervisor,
analysis tier, and live-analysis monitor, then restarted the coverage-guided
services. It reports noisy save/reload and rich-text groups paused while clean
parser groups continued, with product-evidence signatures preserved. The graph
now shows `0` startup failures and `duplicateShareCurrent=0.0000`, so the live
gate is clean; the persona loop still rejects a permanent all-clear until the
new hard-stop behavior survives further monitor passes without materialization
floor churn.

The PR-split persona loop also rejects a filing-ready interpretation. The
latest synthesis, `20260517T210532Z`, says Cycle293 is no longer the best active
shape because it serializes PR09+ behind PR07B1. It prefers the fresh
`iteration-20` topology, keeps PR07 in a runtime-gated lane, leaves PR07C held,
and keeps filing plus final-stack fuzzing blocked until PR07 ownership,
root-space, manifest, and validation evidence are refreshed. The previous
feedback-action, `20260517T203617Z`, generated a manifest at
`2026-05-17T20:52:49Z` with `38` rows and no base/clean-PR05D or
repo/head/bundle/manifest failures, but the latest synthesis rejects using older
Cycle293/Cycle302-style evidence as current filing authority.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The bottom facet is the operational queue: unmet goals fell from `24` to `5`
after restarts, expansion, and auto-ratcheting. The top facet shows continued
coverage-file growth. Dense monitor-pass points are intentionally small and
partially transparent so repeated samples do not visually turn into a misleading
line.

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

Per-pass yield is split out from cumulative state. `processed`, `new_features`,
`new_cdp`, and coverage-file deltas are shown on a `log1p` scale. Negative
coverage-file deltas are reset/restart artifacts and are marked separately.

## Health And Yield

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

The latest plotted live sample uses current-output-dir duplicate/noise metrics
and summary startup failures: `duplicateShareCurrent=0.0000`, current summary
startup failures `0`, quality issue count `0`, warning count `0`, free memory
`426.2G`, and headroom true. The health graph does not use historical aggregate
duplicate/noise as the plotted live signal.

The copied novelty state currently lists `novelty-ws-real-user-editing`,
`novelty-ws-block-gauntlet`, and `novelty-ws-parser-serialization` as enabled
groups. The latest graph has no current duplicate/noise share, so there is no
current-output duplicate family to treat as the live plotted health signal. The
duplicate/noise persona-loop feedback says product-evidence signatures must
remain visible and the producer scheduler must not use materialization pressure
to re-enable actively paused noisy groups. The refreshed graph supports the
post-action live clean read, but the persona loop rejects promoting that to a
durable fix without more clean passes.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T21:20:01Z` show bursty CPU with the
latest load point back below the `64` logical CPU count. The latest 25 CPU
samples range from `39.9%` to `80.1%` utilization, with the latest sample at
`62.0%`. Over those same 25 samples, one-minute, five-minute, and 15-minute load
all exceeded the `64` logical CPU count in `3` windows, and at least one load
window exceeded it in `9`. The newest 1/5/15-minute load sample is `39.67`,
`48.34`, and `57.82`, so the latest load point is below the logical CPU count in
all three windows.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has three enabled groups:
`novelty-ws-real-user-editing`, `novelty-ws-block-gauntlet`, and
`novelty-ws-parser-serialization`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted mix shows `31`
browser/e2e lanes across `27` groups, plus `1` `unit-property` lane and `1`
`coverage-guided-lower-level` lane.

Live fuzzing remains concentrated in browser/e2e lanes in the committed graph.
Lower-level targets visible in the graph are active but narrow:
`unit-property` and one `coverage-guided-lower-level` lane. `transport-integration`
has historical execution/output data but no current counted rate.
`backend-api`, `protocol-server`, and standalone fuzz-only assertion work remain
`0` in the committed graph counters.

The latest level-mix synthesis file is empty, so the latest non-empty synthesis,
`20260517T210714Z`, is the usable evidence. It keeps `browser-e2e >= 24`,
`coverage-guided-lower-level=2`, and `unit-property=1`, rejects adding more JS
lower-level capacity, and says the next useful change is exactly one audited
continuous `protocol-server-http-polling` lane after root disk, protocol
bootstrap, and browser live-PID checks pass. The latest feedback-action restored
focused/strict/gap browser sessions, reported active mix `browser-e2e=26`,
`coverage-guided-lower-level=2`, `unit-property=1`, and launched one bounded
protocol-server target. The refreshed graph is browser-heavy again, but the
synthesis rejects trusting the supervisor-lane graph as browser materialization
proof until deduped live PIDs are counted fail-closed across roots.

The latest native-harness synthesis, `20260517T210605Z`, keeps the rich-text
CRDT merge target as the first ready isolated lower-level coverage-guided
harness. The latest non-empty action, `20260517T210605Z`, implemented and
validated it as an in-process V8/Node coverage-feedback harness, not
AFL/libFuzzer, and its smoke roots wrote `supervisor-groups.json` plus root/lane
`events.ndjson` events marked `coverage-guided-lower-level`. That is real
harness evidence, while the latest committed execution-rate bucket still shows
`0` coverage-guided lower-level executions/hour. The latest protocol-server
synthesis file is empty, so the latest non-empty synthesis,
`20260517T210825Z`, and the latest action, `20260517T205533Z`, are the usable
evidence. They keep `POST /wp-sync/v1/updates` over HTTP polling as the first
protocol/server path and implemented the seeded PHPUnit REST dispatch harness
with root/lane `seed-attempt-complete` event accounting, concrete oracles, and a
bounded passing smoke. The refreshed graph still has `0` counted
`protocol-server` executions, so protocol-server remains validated harness
evidence rather than collector-visible live trend activity. The latest
fuzz-only assertion apply file, `20260517T195944Z`, added a current-post
identity assertion, tightened save/autosave marker diagnostics, and restarted
affected browser loops. That is active fuzz-only assertion work, but the
standalone `fuzz-assertion` execution counter remains `0` because those
diagnostics are running through browser/e2e lanes rather than a standalone
assertion harness.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The current execution metric is estimated individual test/case executions
derived from lane `events.ndjson` files: browser seed attempts, unit/property
fixed tests plus generated fuzz cases, coverage-guided lower-level inputs, or
protocol/backend cases. Rechecks count as executions. This is more precise than
supervisor launches or lane counts, but it only covers fuzzers that emit lane
events. Lower-level counts are approximate when reconstructed from batch
metadata or legacy batch-count fields.

The latest collected execution data has about `5,362,407` completed test
executions: `122,554` browser/e2e, `3,006` transport/integration, `4,808,512`
unit-property, and `428,335` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `1936` browser/e2e test executions/hour, `6400`
unit-property executions/hour, and `0` for transport/integration,
coverage-guided-lower-level, backend/API, protocol-server, and standalone
`fuzz-assertion`. `backend-api`, `protocol-server`, and standalone
`fuzz-assertion` remain at `0` cumulative executions in this counter.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graphs are triage-output metrics only. They count only
non-duplicate `.triage-watcher/**/result.json` rows classified `likely_real` per
100 runner-hours, deduped by canonical bug key and attributed to the failure
first-seen time. They are not total bug-finding graphs, not per-core efficiency,
and not a count of all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates: `613` unique
likely-real findings over about `1,944.7` runner-hours, or `31.52` per 100
runner-hours. `transport-integration`, `unit-property`,
`coverage-guided-lower-level`, `backend-api`, `protocol-server`, and standalone
`fuzz-assertion` still have `0` triaged likely-real outputs in the collected
triage rows. That does not prove the lower-level lanes are unproductive; it
means their findings have not yet flowed through the same non-duplicate
likely-real triage result path.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The unique bug-output candidate graphs are broader. They dedupe non-infra
`likely_real` or `uncertain` triage rows, untriaged raw browser/transport failure
signatures, and lower-level assertion failures by canonical output key. These
graphs are intentionally broader than confirmed bugs and narrower than raw
failed attempts; untriaged candidates are not confirmed bugs.

Current unique bug-output candidate rates are: browser/e2e `5354` candidates
over `1,944.7` runner-hours (`275.31` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `19.4` runner-hours
(`10.32` per 100 runner-hours), and unit/property `4` over `25.1` runner-hours
(`15.94` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the current per-profile rows, browser/e2e likely-real triage output is
led by real-user editing (`80`), parser serialization (`38`), block-gauntlet
(`29`), parser transform (`22`), and async/server-backed blocks (`18`). The
broader unique-output candidate view is led by real-user editing,
block-gauntlet, parser serialization, async/server-backed blocks, and parser
transform, with lower-level lanes showing only small nonzero candidate totals so
far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `5113.1` for browser/e2e, `4537.5` for transport/integration,
`820.3` for coverage-guided lower-level, and `2523.2` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

Lower-level and transport lanes should continue to be judged partly by the
unique-output candidate graphs until their triage pipeline is producing
comparable likely-real and non-duplicate results.

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

Low-completion profiles are still the next depth targets:

| Profile | Seen | Successful | Startup failures | Success rate |
| --- | ---: | ---: | ---: | ---: |
| `full` | 840 | 18 | 0 | 2.1% |
| `multi-reload-lifecycle` | 3340 | 121 | 0 | 3.6% |
| `revision-persistence` | 4634 | 178 | 0 | 3.8% |
| `parser-serialization` | 3390 | 185 | 1 | 5.5% |
| `real-user-editing` | 7332 | 587 | 0 | 8.0% |
| `parser-transform` | 4275 | 438 | 0 | 10.2% |
| `common-blocks` | 4178 | 450 | 0 | 10.8% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6290 | 1165 | 0 | 18.5% |
| `long-session-large-doc` | 2931 | 577 | 0 | 19.7% |
| `persistence-no-title` | 3352 | 902 | 0 | 26.9% |
| `session-lifecycle` | 8293 | 2503 | 0 | 30.2% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next 1000 tier | 514 | 1000 |
| action reload-post-action next 2000 tier | 1058 | 2000 |
| real-user body save/reload next 1000 tier | 573 | 1000 |
| successful real-user-editing records next 1000 tier | 587 | 1000 |
| action ui-format-paragraph next 2000 tier | 1652 | 2000 |

The remaining queue mixes real-user save/reload lifecycle depth, real-user
editing completion, and action depth.

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

The feature-key breadth is led by code coverage, action pairs, real-user UI,
history, operation-ledger, payload-size, block-depth, invariant, block, action,
and transport observations. The plot separates breadth (`keys`) from repeated
observations (`total_count`) so broad coverage is not hidden inside raw event
volume.

![Successful actions within weak-completion profiles](rtc-jetstream2-fuzz-trends-20260515/plots/successful-actions-by-profile.png)

The successful-action plot is restricted to weak-completion profiles instead of
global top actions, so high-volume async and permissions lanes no longer hide
the profiles that still need more completed full records.

## PR Review Loop

![PR split review loop events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-events.png)

![PR split loop duration by phase](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-durations.png)

![Suggested PR set net LOC over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-total-net-loc-over-time.png)

![Suggested PR net LOC by PR over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-net-loc-by-pr-over-time.png)

With the live loop at `max_parallel=6`, the last 20 completed review cycles
took roughly `7.5` to `12.7` minutes in this snapshot. The newest completed
review cycle, `20260517T210532Z`, took `12.7` minutes from
`2026-05-17T21:05:32Z` to `2026-05-17T21:18:13Z`. The latest synthesis says
Cycle293 is no longer the best primary split because it serializes PR09+ behind
PR07B1; the fresh `iteration-20` source set keeps PR09 independent of the PR07
runtime lane. It still rejects PR filing and broad final-stack fuzzing. The
previous feedback-action produced a manifest at `2026-05-17T20:52:49Z` with
`38` rows and `0` base/clean-PR05D or repo/head/bundle/manifest failures, but
the latest synthesis rejects using older Cycle293/Cycle302-style manifests as
current filing evidence.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T21:18:56Z`, has `6`
suggested rows totaling `1828` net LOC. The largest current rows by net LOC are
`PR 13A` (`1126`), `PR 14` (`276`), `PR 1` (`162`), `PR 4` (`159`), `PR 3`
(`53`), and `PR 2` (`52`). These charts remain size telemetry from parsed
status snapshots, not filing authority for split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction, but the
latest live duplicate/noise sample is clean. Startup failures are `0`,
current-output duplicate share is `0.0000`, headroom is true, and the latest
load sample is below the `64` logical CPU count in all three load windows;
quality issues and warnings are both `0`. Historical aggregate duplicate/noise
is not the live health signal.

The duplicate/noise persona loop rejects converting the clean live graph into a
durable all-clear. The latest synthesis says strict no-product startup noise is
mostly gated, but materialization-floor scheduling can re-enable groups under
active duplicate/noise holds unless the new scheduler patch is respected. The
latest feedback-action applied that bounded control-plane patch while preserving
product evidence. The next duplicate/noise check is whether clean current-output
passes continue without hiding product-evidence failures or reintroducing noisy
save/reload and rich-text groups.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest synthesis rejects Cycle293 as the primary shape and prefers the fresh
`iteration-20` topology so PR09-PR15 are not serialized behind PR07B1. PR07
remains a runtime-gated side lane: PR07C stays held, PR07 reload/post-save/rejoin
ownership remains unproven, and root space remains below the browser replay
threshold. Publication and final validation still wait for fresh split evidence,
PR07 collaboration-ready owner evidence, and root/runtime readiness.

The committed fuzzing graph is still browser/e2e-heavy. `unit-property` and one
`coverage-guided-lower-level` lane are active lower-level graph signals, while
transport is historical-only in the latest rate and `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` are still zero in the trend
counters. Persona-loop evidence now includes validated rich-text lower-level
and HTTP polling protocol harnesses, but the graph still shows `0` latest-rate
coverage-guided lower-level and `0` cumulative protocol-server executions.
Standalone fuzz-only assertion diagnostics are active through browser lanes,
not through a standalone assertion harness. The level-mix persona loop also
rejects trusting the supervisor lane graph as browser materialization proof
until deduped live PIDs meet the browser floor. The next narrow checks are the
novelty hard-stop validation, browser live-PID accounting, protocol counts
becoming collector-visible, root disk recovery, and PR07 root/runtime plus
replay evidence before any filing or final-stack claim.
