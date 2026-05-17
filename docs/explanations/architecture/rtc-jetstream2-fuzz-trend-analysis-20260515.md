# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T22:19:39Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-17T22:16:58Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage. Across `2130` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-17T22:16:58Z`, coverage
files grew from `272` to `47899`, a delta of `47627`. The monitor's visible
likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted live duplicate/noise gate is clean on the current-output-dir
metric: the newest sample has `duplicateShareCurrent=0.0000` and current summary
startup failures `0`. The same pass has `1` quality issue, `1` warning,
`427.9G` free memory, and a true monitor headroom flag. This report
uses current-output-dir duplicate/noise and summary startup failures for live
health. Historical aggregate duplicate/noise is context only; its latest
duplicate share is `0.3462` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence, not as an override. The latest
duplicate/noise synthesis, `20260517T220328Z`, rejects treating the producer
path as fixed: mixed product-evidence producers can classify current no-product
`pre_action_bootstrap_stall` as `known-noise`, write a product-preserving
`no-analysis.json`, and keep browser capacity running. The matching
feedback-action file is empty; the previous `20260517T212928Z` feedback-action
patched and restarted the novelty monitor path. The refreshed graph shows
`0` startup failures and `duplicateShareCurrent=0.0000`, so the graph is clean
for the latest live sample, but the persona loop still rejects a durable
all-clear until the producer pause/block gates cover this known-noise startup
hold while preserving product-evidence signatures.

The PR-split persona loop also rejects a filing-ready interpretation. The
latest synthesis, `20260517T220648Z`, says Cycle293 must stay historical and the
Cycle306 `fresh-prset/iteration-23/*` replacement is not filing-ready. It keeps
common work through clean grouped `PR06A-D`, `PR06E` as a `PR06D` sidecar, PR07
as a runtime-gated lane, and independent `PR09` through `PR15C` CRDT/data-loss
work based on `PR06D`. It also says PR07 ownership is still setup-only
(`collaborationEnabled=null`), the manifest is stale relative to the deferred
queue, and seed `1020002` should block only final-stack fuzz, filing, and rebuilt
stack validation. The latest feedback-action, `20260517T213858Z`, applied the
previous split note, fixed the review-loop `rg` invocation, and launched one
bounded audit/PR07 owner-matrix job, but the newer synthesis supersedes that as
filing evidence.

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
startup failures `0`, quality issue count `1`, warning count `1`, free memory
`427.9G`, and headroom true. The health graph does not use historical
aggregate duplicate/noise as the plotted live signal.

The copied novelty state currently lists `novelty-ws-parser-serialization` and
`novelty-ws-three-user-late-join` as enabled groups. Current-output duplicate
share is `0.0000` and current summary startup failures are `0`. The
duplicate/noise persona-loop synthesis still rejects a durable all-clear because
producer scheduling can leak current no-product startup holds when mixed
product-evidence signatures are present. The refreshed graph therefore reads as
a clean latest live duplicate/startup sample with a remaining producer-gate risk,
not as proof that the fix is durable.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T22:10:00Z` show bursty CPU. The latest
25 CPU samples range from `55.4%` to `80.1%` utilization, with the latest sample
at `66.2%`. Over those same 25 samples, one-minute, five-minute, and 15-minute
load all exceeded the `64` logical CPU count in `3` windows, and at least one
load window exceeded it in `9`. The newest 1/5/15-minute load sample is
`51.62`, `50.65`, and `53.44`, so the latest one-, five-, and 15-minute windows
are all below the logical CPU count.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has two enabled groups:
`novelty-ws-parser-serialization` and `novelty-ws-three-user-late-join`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted mix shows `27`
browser/e2e lanes across `27` groups, plus `1` `unit-property` lane and `1`
`coverage-guided-lower-level` lane.

Live fuzzing remains concentrated in browser/e2e lanes in the committed graph.
Lower-level targets visible in the graph are active but narrow:
`unit-property` and one `coverage-guided-lower-level` lane. `transport-integration`
has historical execution/output data but no current counted rate.
`backend-api`, `protocol-server`, and standalone fuzz-only assertion work remain
`0` in the committed graph counters.

The latest level-mix synthesis, `20260517T220124Z`, rejects trusting mix totals
as live materialization proof. It says context can report browser healthy while
live `lanes.json` PID checks are below floor; its reports found only `7` browser
PIDs even though the context said `25/26`. Its concrete recommendation is to
repair existing focused, strict, and gap browser watchdog/materialization paths,
keep `unit-property=1`, keep coverage-guided lower-level lanes capped, and leave
`protocol-server`, `backend-api`, and standalone `fuzz-assertion` at `0` until
audited. The previous `20260517T211719Z` feedback-action had repaired root disk
and reported `25` live browser PIDs. Treat the graph as supervisor-history
accounting, not live PID proof.

The latest native-harness synthesis and action, `20260517T215700Z`, selected,
implemented, validated, and launched the rich-text CRDT merge target as an
isolated Node/V8 coverage-guided lower-level lane with root/lane `events.ndjson`
records marked `coverage-guided-lower-level`. The latest committed execution-rate
bucket still shows `0` coverage-guided lower-level executions/hour, so this is
fresh persona-loop harness evidence that has not yet appeared as latest-rate
collector-visible trend activity. The latest protocol-server synthesis,
`20260517T221253Z`, is empty; the previous `20260517T215952Z` action reports a
validated `POST /wp-sync/v1/updates` HTTP-polling protocol/server harness with a
2-seed / 13-case smoke and focused REST/storage regressions. The level-mix
synthesis still says protocol/server should remain blocked until audited, and
the refreshed graph has `0` counted `protocol-server` executions, so
protocol-server remains harness evidence rather than collector-visible live
trend activity. The latest fuzz-only assertion apply file is empty; the previous
`20260517T195944Z` apply added browser-lane assertion diagnostics, while the
standalone `fuzz-assertion` execution counter remains `0`.

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

The latest collected execution data has about `5,373,067` completed test
executions: `124,446` browser/e2e, `3,006` transport/integration, `4,817,280`
unit-property, and `428,335` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `372` browser/e2e test executions/hour, `2,688`
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

On that triage-output metric, browser/e2e currently dominates: `618` unique
likely-real findings over about `1,954.3` runner-hours, or `31.62` per 100
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

Current unique bug-output candidate rates are: browser/e2e `5391` candidates
over `1,954.3` runner-hours (`275.85` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `19.4` runner-hours
(`10.32` per 100 runner-hours), and unit/property `5` over `25.6` runner-hours
(`19.56` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the current per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`132`), three-user late join (`111`),
permissions/auth/locks (`86`), real-user editing (`81`), and parser
serialization (`38`). The broader unique-output candidate view is led by
three-user late join, session lifecycle, real-user editing, revision
persistence, and permissions/auth/locks, with lower-level lanes showing only
small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `5180.0` for browser/e2e, `4537.5` for transport/integration,
`820.3` for coverage-guided lower-level, and `2656.6` for unit/property.

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
| `parser-serialization` | 3428 | 200 | 7 | 5.8% |
| `real-user-editing` | 7346 | 592 | 0 | 8.1% |
| `parser-transform` | 4278 | 440 | 0 | 10.3% |
| `common-blocks` | 4183 | 451 | 0 | 10.8% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6302 | 1172 | 0 | 18.6% |
| `long-session-large-doc` | 2931 | 577 | 0 | 19.7% |
| `persistence-no-title` | 3355 | 902 | 0 | 26.9% |
| `session-lifecycle` | 8293 | 2503 | 0 | 30.2% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next 1000 tier | 523 | 1000 |
| action reload-post-action next 2000 tier | 1067 | 2000 |
| real-user body save/reload next 1000 tier | 582 | 1000 |
| successful real-user-editing records next 1000 tier | 592 | 1000 |
| action ui-format-paragraph next 2000 tier | 1664 | 2000 |

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
review cycle, `20260517T220648Z`, took `8.5` minutes from
`2026-05-17T22:06:48Z` to `2026-05-17T22:15:16Z`. The latest synthesis rejects
Cycle293 as active filing evidence and keeps the Cycle306 replacement split:
common work through grouped `PR06A-D`, `PR06E` as a `PR06D` sidecar, PR07 in a
runtime-gated lane, and independent CRDT/data-loss work from `PR09` through
`PR15C`. It also says PR07 is setup-only until collaboration readiness is true,
the current manifest is stale relative to deferred queue accounting, and seed
`1020002` must not block independent branch/audit/manifest/deferred work.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T22:08:14Z`, has `6`
suggested rows totaling `1828` net LOC. The largest current rows by net LOC are
`PR 13A` (`1126`), `PR 14` (`276`), `PR 1` (`162`), `PR 4` (`159`), `PR 3`
(`53`), and `PR 2` (`52`). These charts remain size telemetry from parsed
status snapshots, not filing authority for split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction. The latest
plotted live duplicate/noise sample is clean on the current-output-dir metric:
startup failures are `0` and current-output duplicate share is `0.0000`. The
latest full health sample has headroom true, quality issues `1`, warnings `1`,
and `427.9G` free memory. The latest one-, five-, and 15-minute load windows are
all below the `64` logical CPU count. Historical aggregate duplicate/noise is not
the live health signal.

The duplicate/noise persona loop still rejects converting the current live
graph into a durable all-clear. The latest synthesis says producer-side
scheduling can still leak mixed product-evidence runs when no-product
`pre_action_bootstrap_stall` is classified as `known-noise`; the matching
feedback-action file is empty, while the previous feedback-action patched and
restarted the monitor path. The next duplicate/noise check is whether
current-output duplicate share stays low after the producer pause, re-enable, and
coverage-Codex gates handle this startup hold without hiding product-evidence
failures.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest synthesis keeps Cycle293 historical and says the Cycle306 replacement
split is not filing-ready: common work through grouped `PR06A-D`, `PR06E` as a
`PR06D` sidecar, runtime-gated PR07 work, and independent `PR09` through `PR15C`
CRDT/data-loss work based on `PR06D`. PR07 ownership is still setup-only, the
manifest is stale, and seed `1020002` should block only filing/final-stack work.
Publication and final validation still wait for fresh manifest/deferred audit
evidence, PR07 collaboration-ready owner evidence, and final-stack gate
resolution.

The committed fuzzing graph is still browser/e2e-heavy. `unit-property` and one
`coverage-guided-lower-level` lane are active lower-level graph signals, while
transport is historical-only in the latest rate and `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` are still zero in the trend
counters. Persona-loop evidence includes validated rich-text lower-level and HTTP
polling protocol harness work, but the graph still shows `0` latest-rate
coverage-guided lower-level and `0` cumulative protocol-server executions.
Protocol/server readiness is contradictory across persona files, and the latest
level-mix synthesis says browser PID accounting itself needs repair, so the
report treats those outputs as harness evidence until collector-visible protocol
counts and live PID checks agree. The next narrow checks are duplicate-share
stability, lower-level/protocol counts becoming collector-visible, and PR07
root/runtime plus replay evidence before any filing or final-stack claim.
