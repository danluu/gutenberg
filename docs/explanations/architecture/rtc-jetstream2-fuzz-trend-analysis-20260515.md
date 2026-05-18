# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T23:58:17Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-17T23:54:37Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage. Across `2151` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-17T23:54:37Z`, coverage
files grew from `272` to `48343`, a delta of `48071`. The monitor's visible
likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted live duplicate/noise point is noisy on the current-output-dir
metric: the newest sample has `duplicateShareCurrent=1.0000` and current summary
startup failures `0`. The same pass has `0` quality issues, `0` warnings,
`423.7G` free memory, and a true monitor headroom flag. This report uses
current-output-dir duplicate/noise and summary startup failures for live health.
Historical aggregate duplicate/noise is context only; its latest duplicate
share is `0.3455` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence, not as an override. The latest
duplicate/noise synthesis, `20260517T233909Z`, says the remaining leak is in the
novelty-monitor producer/scheduler path, not the normal triage or analysis
consumers. It says strict no-product startup suppression is mostly blocked from
Codex, but producer scheduling can still re-enable or continue noisy groups
inside mixed product-evidence runs, after output-root changes, or through
sibling real-user groups. That synthesis rejects broad new fuzzing before a
producer-side fix is validated. The earlier `20260517T231501Z` feedback-action
implemented a bounded consumer cap, but the refreshed graph now has two latest
current duplicate-share samples at `1.0000`, so the persona loop rejects any
durable recovery interpretation.

The PR-split persona loop rejects a filing-ready interpretation. The latest
synthesis, `20260517T234303Z`, moves the active target to
`fresh-prset/iteration-35/*`, promotes `PR07B2` to an explicit runtime-gated
slot, keeps `PR07C` held, and rejects Cycle293/Cycle306/Cycle312, stale local
publish manifests, raw deferred/candidate refs, fallback-tail `PR05D`, raw
`PR07D`, `PR17`, `PR18`, and `PR18x` as filing sources. The prior feedback-action
made i34 active and audited `31` manifest rows with `8` topology checks passing,
but that is now provenance. Filing, broad final-stack fuzzing, and rebuilt
stack validation remain blocked on a fresh i35 audit/manifest, PR07 runtime
owner evidence with `collaborationEnabled=true`, and seed `1020002`.

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
and summary startup failures: `duplicateShareCurrent=1.0000`, current summary
startup failures `0`, quality issue count `0`, warning count `0`, free memory
`423.7G`, and headroom true. The previous sample was also
`duplicateShareCurrent=1.0000`; the two samples before that were clean, and the
one before those was `0.8333`. The newest points therefore show a current
duplicate/noise regression without startup failures, not sustained cleanliness.
The health graph does not use historical aggregate duplicate/noise as the
plotted live signal.

The copied novelty state currently lists `novelty-http-persistence-probe` and
`novelty-ws-real-user-save-reload` as enabled groups. Current-output duplicate
share is `1.0000` and current summary startup failures are `0`. The
duplicate/noise feedback-action implemented source-stable first-level cap keys
and terminal `family-capped` handling for active-only product-evidence
duplicates while preserving representative product-evidence signatures. The
latest synthesis says that consumer-side fix is not enough: the next narrow
check is producer-side startup/noise pause behavior for mixed product-evidence
and sibling real-user groups.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T23:50:00Z` show bursty CPU. The latest
25 CPU samples range from `55.4%` to `84.1%` utilization, with the latest sample
at `72.9%`. Over those same 25 samples, one-minute, five-minute, and 15-minute
load all exceeded the `64` logical CPU count in `3` windows, and at least one
load window exceeded it in `9`. The newest 1/5/15-minute load sample is
`63.87`, `58.10`, and `62.89`, so the latest load windows are just below the
logical CPU count.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has two enabled groups:
`novelty-http-persistence-probe` and `novelty-ws-real-user-save-reload`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `28` browser/e2e lanes across `27` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live fuzzing remains concentrated in browser/e2e lanes in the committed graph.
Lower-level targets visible in the graph are active but narrow:
`unit-property` and one `coverage-guided-lower-level` lane. `transport-integration`
has historical execution/output data but no current counted rate.
`protocol-server`, `backend-api`, and standalone fuzz-only assertion work remain
at `0` in the committed graph counters.

The persona-loop evidence is intentionally more cautious than the plotted lane
mix. The latest level-mix synthesis, `20260517T233611Z`, says the next change
should be browser/e2e materialization repair, not lower-level expansion. It
reports live browser PID counts around `15` to `17`, below the `24` lane floor,
and recommends bounded product-evidence-capable backfill before any JS
lower-level expansion. It also says to keep `unit-property=1`, avoid expanding
coverage-guided lower-level beyond the audited rich-text CRDT lane, and leave
backend/API, protocol-server, and fuzz-assertion capacity out of the trusted mix
until their wiring and preflight are collector-visible. This report treats the
graph as browser/e2e-heavy configured-capacity telemetry and does not claim
stable live PID materialization.

The latest native-harness action implemented, validated, and started a
continuous rich-text CRDT coverage-guided lower-level lane. The latest
protocol-server action implemented and validated the HTTP polling REST
state-machine harness with a bounded smoke that emits
`fuzzLevel: "protocol-server"` events, but it did not start a long-lived
protocol/server fuzzing session. The latest fuzz-only assertion action added
gated diagnostics and restarted the browser coverage loop. Those are harness
and assertion evidence, not yet collector-visible protocol/backend throughput in
this graph: the refreshed counters still show `0` `protocol-server`, `0`
`backend-api`, and `0` standalone `fuzz-assertion` executions.

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

The latest collected execution data has about `5,402,453` completed test
executions: `130,472` browser/e2e, `3,006` transport/integration, `4,840,640`
unit-property, and `428,335` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `2,012` browser/e2e test executions/hour and
`15,488` unit-property executions/hour, with `0` current rate for
transport/integration, coverage-guided-lower-level, backend/API,
protocol-server, and standalone `fuzz-assertion`. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` remain at `0` cumulative
executions in this counter.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graphs are triage-output metrics only. They count only
non-duplicate `.triage-watcher/**/result.json` rows classified `likely_real` per
100 runner-hours, deduped by canonical bug key and attributed to the failure
first-seen time. They are not total bug-finding graphs, not per-core efficiency,
and not a count of all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates: `635` unique
likely-real findings over about `1,975.2` runner-hours, or `32.15` per 100
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

Current unique bug-output candidate rates are: browser/e2e `5,471` candidates
over `1,975.2` runner-hours (`276.98` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `19.4` runner-hours
(`10.32` per 100 runner-hours), and unit/property `5` over `26.7` runner-hours
(`18.62` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the current per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`142`), three-user late join (`112`),
permissions/auth/locks (`86`), real-user editing (`82`), and parser
serialization (`39`). The broader unique-output candidate view is led by
three-user late join (`738`), session lifecycle (`676`), real-user editing
(`650`), revision persistence (`448`), and permissions/auth/locks (`435`), with
lower-level lanes showing only small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `5424.9` for browser/e2e, `4537.5` for transport/integration,
`820.3` for coverage-guided lower-level, and `2673.1` for unit/property.

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
| `multi-reload-lifecycle` | 3363 | 123 | 0 | 3.7% |
| `revision-persistence` | 4690 | 179 | 0 | 3.8% |
| `parser-serialization` | 3474 | 204 | 0 | 5.9% |
| `real-user-editing` | 7441 | 601 | 0 | 8.1% |
| `parser-transform` | 4310 | 447 | 0 | 10.4% |
| `common-blocks` | 4218 | 454 | 0 | 10.8% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6334 | 1180 | 0 | 18.6% |
| `long-session-large-doc` | 3008 | 577 | 0 | 19.2% |
| `persistence-no-title` | 3427 | 944 | 1 | 27.5% |
| `session-lifecycle` | 8359 | 2521 | 0 | 30.2% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next 1000 tier | 536 | 1000 |
| action reload-post-action next 2000 tier | 1080 | 2000 |
| real-user body save/reload next 1000 tier | 595 | 1000 |
| successful real-user-editing records next 1000 tier | 601 | 1000 |
| action ui-format-paragraph next 2000 tier | 1712 | 2000 |

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
took roughly `7.2` to `12.7` minutes in this snapshot. The newest completed
review cycle, `20260517T234303Z`, took `10.0` minutes from
`2026-05-17T23:43:03Z` to `2026-05-17T23:53:03Z`. The latest synthesis rejects a
filing-ready interpretation and says the active target is now
`fresh-prset/iteration-35/*`, not the stale Cycle293/Cycle306/Cycle312 or i34
sources. It promotes `PR07B2` to an explicit runtime-gated PR slot, keeps
`PR07C` held, forks PR09-PR15 from PR06, and rejects raw deferred/candidate refs,
fallback-tail `PR05D`, raw `PR07D`, `PR17`, `PR18`, and `PR18x` as filing
sources. The prior i34 feedback-action and clean 31-row audit remain provenance,
but filing remains deferred until i35 has a fresh audit/manifest, PR07 owner
replay proves `collaborationEnabled=true`, and seed `1020002` is resolved.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T23:40:47Z`, has `11`
suggested rows totaling `2,621` net LOC. The largest current rows by net LOC are
`PR 13A` (`1126`), `PR 14` (`276`), `PR 15B` (`193`), `PR 9` (`183`),
`PR 1` (`162`), and `PR 4` (`159`). These charts remain size telemetry from
parsed status snapshots, not filing authority for split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction. The latest
plotted live duplicate/noise sample is noisy on the current-output-dir metric:
startup failures are `0` and current-output duplicate share is `1.0000`. The
latest full health sample has headroom true, quality issues `0`, warnings `0`,
and `423.7G` free memory. The latest 1/5/15-minute load windows are `63.87`,
`58.10`, and `62.89`, so all three are just below the `64` logical CPU count.
Historical aggregate duplicate/noise is not the live health signal.

The duplicate/noise persona loop rejects converting the current live graph into
a durable all-clear. The latest synthesis says the remaining leak is producer
and scheduler behavior in the novelty monitor: no-product startup suppression is
mostly blocked from Codex, but mixed product-evidence runs, output-root changes,
and sibling real-user groups can keep repeated representatives alive. The
earlier consumer feedback-action implemented source-stable family caps, but the
latest graph now has the last two `duplicateShareCurrent` values at `1.0000`.
The next check is producer-side pause/rotation behavior and sustained
active/current cleanliness, not declaring the duplicate/noise issue closed.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest synthesis supersedes i34 with active i35, promotes `PR07B2` to a
runtime-gated slot, and keeps `PR07C` held. It rejects stale Cycle293, Cycle306,
and Cycle312 sources, stale publish manifests, raw deferred/candidate refs,
fallback-tail `PR05D`, raw `PR07D`, `PR17`, `PR18`, and `PR18x` as filing
authority. Filing remains blocked by a fresh i35 audit/manifest, PR07 runtime
owner replay with `collaborationEnabled=true`, seed `1020002`, final-stack fuzz,
and rebuilt validation.

The committed fuzzing graph is still browser/e2e-heavy. `unit-property` and one
`coverage-guided-lower-level` lane are active lower-level graph signals, while
transport is historical-only in the latest rate and `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` are still zero in the trend
counters. Persona-loop evidence now includes a selected rich-text CRDT
coverage-guided lower-level harness with a continuous lane and a validated HTTP
polling protocol smoke, but the latest level-mix synthesis says trusted live
browser PID materialization was still below the `24` lane floor and should be
repaired before capacity expansion. The report therefore treats lower-level and
protocol outputs as harness evidence until collector-visible lower-level/
protocol counts and live PID checks agree. The next narrow checks are
producer-side duplicate/noise stability, browser PID materialization,
collector-visible lower-level/protocol counts, and PR07 root/runtime plus replay
evidence before any filing or final-stack claim.
