# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T00:22:53Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-18T00:16:52Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage. Across `2156` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-18T00:16:52Z`, coverage
files grew from `272` to `48441`, a delta of `48169`. The monitor's visible
likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted live duplicate/noise point is clean on the current-output-dir
metric, but not stable enough to call recovery: the newest sample has
`duplicateShareCurrent=0.0000` and current summary startup failures `0`, after
two immediately prior samples at `0.6667` and, before an intervening clean
point, two earlier samples at `1.0000`.
The same latest pass has `1` quality issue, `1` warning, `423.7G` free memory,
and a true monitor headroom flag. This report uses current-output-dir
duplicate/noise and summary startup failures for live health. Historical
aggregate duplicate/noise is context only; its latest duplicate share is
`0.3454` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence to evaluate, and it rejects reading
the transient clean point as recovery. The latest duplicate/noise synthesis,
`20260517T235105Z`, says the remaining problem is producer/control-plane
steering: strict no-product `pre_action_bootstrap_stall` is mostly suppressed
before expensive analysis, but the coverage-guided scheduler can still keep or
re-enable noisy browser producers. It recommends enabling novelty pause guards,
letting startup/noise pauses drop below the materialization floor when needed,
and running bounded live analysis for product-evidence timeout signatures. The
matching latest feedback-action file is empty, so the synthesis is the current
actionable duplicate/noise evidence.

The PR-split persona loop rejects a filing-ready interpretation. The latest
synthesis, `20260517T235308Z`, replaces the i35 direction with an i36 target,
rejects i35's premature `PR07B2` promotion, keeps `PR07B2` and `PR07C` held
off `PR07B1`, and keeps PR09-PR15 forked from PR06. It rejects stale/local
manifests unless regenerated from the selected i36 target, fallback-tail
`PR05D`, raw `PR07D`, `PR17`, `PR18`, and `PR18x` as filing sources. The latest
feedback-action applied the i36 target and reports a completed `31`-row fresh
i36 audit/manifest, but PR07 owner replay was still deferred. Filing, broad
final-stack fuzzing, and rebuilt stack validation remain blocked on PR07 owner
evidence and the remaining final-stack gates.

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
`423.7G`, and headroom true. The immediately preceding two samples were
`0.6667`, with two earlier `1.0000` points before an intervening clean point, so
the latest graph shows a clean current-output sample but not sustained
cleanliness. The health graph does not use historical aggregate duplicate/noise
as the plotted live signal.

The copied novelty state currently lists `novelty-ws-parser-serialization` and
`novelty-ws-lifecycle` as enabled groups. Current-output duplicate share is
`0.0000` and current summary startup failures are `0`. The latest
duplicate/noise synthesis says the consumer/analysis side is not the main
remaining leak; the next narrow check is producer/control-plane behavior:
novelty pause guards, startup/noise pauses below the materialization floor when
needed, and bounded live analysis for product-evidence timeout signatures.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T00:20:00Z` show bursty CPU. The
latest 25 CPU samples range from `55.4%` to `84.1%` utilization, with the latest
sample at `66.5%`. Over those same 25 samples, one-minute, five-minute, and
15-minute load all exceeded the `64` logical CPU count in `4` windows, and at
least one load window exceeded it in `9`. The newest 1/5/15-minute load sample
is `41.74`, `51.10`, and `60.98`, so the latest load windows are below the
logical CPU count after the previous overloaded sample at `00:10:00Z`.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has two enabled groups:
`novelty-ws-parser-serialization` and `novelty-ws-lifecycle`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `27` browser/e2e lanes across `27` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live fuzzing remains concentrated in browser/e2e lanes in the committed graph.
Lower-level targets visible in the graph are active but narrow:
`unit-property` and one `coverage-guided-lower-level` lane. `transport-integration`
has historical execution/output data but no current counted rate.
`protocol-server`, `backend-api`, and standalone fuzz-only assertion work remain
at `0` in the committed graph counters.

The persona-loop evidence is more specific than the plotted lane mix. The latest
level-mix synthesis, `20260518T000604Z`, agrees browser/e2e recovered above the
`24` lane floor, rejects adding more browser or JS/Jest lower-level capacity,
and says the actual mix gap is `protocol-server=0`. It recommends exactly one
audited `protocol-server-http-polling` lane, preferably capacity-neutral by
retiring a duplicate rich-text CRDT lower-level lane if load stays high.

The latest native-harness evidence keeps rich-text CRDT as the first ready
coverage-guided lower-level target and reports fresh lower-level runs. The
latest protocol-server action validated a bounded HTTP polling REST smoke with
`fuzzLevel: "protocol-server"` events, but the newest protocol-server synthesis
file is empty and the committed counters still show `0` `protocol-server`
executions. The latest fuzz-only assertion action added gated rich-text marker
diagnostics and restarted browser loops. These are harness and assertion
evidence, not yet collector-visible protocol/backend throughput in this graph:
the refreshed counters still show `0` `protocol-server`, `0` `backend-api`, and
`0` standalone `fuzz-assertion` executions.

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

The latest collected execution data has about `5,420,544` completed test
executions: `131,539` browser/e2e, `3,006` transport/integration, `4,848,736`
unit-property, and `437,263` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `296` browser/e2e test executions/hour,
`9,472` unit-property executions/hour, and `12,544` coverage-guided-lower-level
executions/hour, with `0` current rate for transport/integration, backend/API,
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

On that triage-output metric, browser/e2e currently dominates: `640` unique
likely-real findings over about `1,981.2` runner-hours, or `32.30` per 100
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

Current unique bug-output candidate rates are: browser/e2e `5,481` candidates
over `1,981.2` runner-hours (`276.65` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.1` runner-hours
(`9.95` per 100 runner-hours), and unit/property `5` over `27.3` runner-hours
(`18.33` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the current per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`144`), three-user late join (`112`),
permissions/auth/locks (`86`), real-user editing (`83`), and parser
serialization (`39`). The broader unique-output candidate view is led by
three-user late join (`739`), session lifecycle (`678`), real-user editing
(`652`), revision persistence (`448`), and permissions/auth/locks (`436`), with
lower-level lanes showing only small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `5460.7` for browser/e2e, `4537.5` for transport/integration,
`791.4` for coverage-guided lower-level, and `2632.7` for unit/property.

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
| `multi-reload-lifecycle` | 3372 | 124 | 0 | 3.7% |
| `revision-persistence` | 4706 | 181 | 0 | 3.8% |
| `parser-serialization` | 3485 | 205 | 0 | 5.9% |
| `real-user-editing` | 7474 | 602 | 0 | 8.1% |
| `parser-transform` | 4321 | 450 | 0 | 10.4% |
| `common-blocks` | 4228 | 454 | 0 | 10.7% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6346 | 1182 | 0 | 18.6% |
| `long-session-large-doc` | 3020 | 577 | 0 | 19.1% |
| `persistence-no-title` | 3445 | 953 | 0 | 27.7% |
| `session-lifecycle` | 8376 | 2525 | 0 | 30.1% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next 1000 tier | 538 | 1000 |
| action reload-post-action next 2000 tier | 1082 | 2000 |
| real-user body save/reload next 1000 tier | 597 | 1000 |
| successful real-user-editing records next 1000 tier | 602 | 1000 |
| action ui-format-paragraph next 2000 tier | 1733 | 2000 |

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
review cycle, `20260517T235308Z`, took `8.8` minutes from
`2026-05-17T23:53:08Z` to `2026-05-18T00:01:57Z`. The latest synthesis rejects a
filing-ready interpretation and says the active target should move to i36, not
the stale Cycle293/Cycle306/Cycle312, i34, or i35 sources. It rejects i35's
premature `PR07B2` promotion, keeps `PR07B2` and `PR07C` held off `PR07B1`,
keeps PR09-PR15 forked from PR06, and rejects stale/local manifests,
fallback-tail `PR05D`, raw `PR07D`, `PR17`, `PR18`, and `PR18x` as filing
sources. The latest feedback-action says `current-pr-split.md` now targets i36
and the i36 audit/manifest job completed with `31` rows, fresh checks all yes,
and no hard failures. Filing remains deferred until PR07 owner replay and the
remaining final-stack gates pass.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T00:02:56Z`, has `11`
suggested rows totaling `5,411` net LOC. The largest current rows by net LOC are
`PR 12` (`1386`), `PR 11` (`1141`), `PR 13A` (`1126`), `PR 6` (`732`),
`PR 14` (`276`), and `PR 9` (`183`). These charts remain size telemetry from
parsed status snapshots, not filing authority for split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction, and the latest
plotted live duplicate/noise sample is clean on the current-output-dir metric:
startup failures are `0` and current-output duplicate share is `0.0000`. That is
not a durable all-clear because the two immediately prior samples were `0.6667`
and earlier points were `1.0000`. The latest full health sample has headroom
true, quality issues `1`, warnings `1`, and `423.7G` free memory. The latest
1/5/15-minute load windows are `41.74`, `51.10`, and `60.98`, below the `64`
logical CPU count after an overloaded previous sample. Historical aggregate
duplicate/noise is not the live health signal.

The duplicate/noise persona loop rejects converting the current live graph into
a durable all-clear. The latest synthesis says the remaining leak is
producer/control-plane behavior: no-product startup suppression is mostly blocked
from expensive analysis, but coverage-guided scheduling, materialization-floor
pause behavior, and missing bounded live analysis can still keep noisy browser
producers alive. The next check is producer-side pause/rotation behavior and
sustained active/current cleanliness; the newest graph now supports that caution
because the clean point follows two noisy `0.6667` current-output samples.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest synthesis supersedes i34/i35 with an i36 target, demotes `PR07B2` back to
held status, and keeps `PR07C` held. It rejects stale Cycle293, Cycle306, and
Cycle312 sources, stale/local manifests, fallback-tail `PR05D`, raw `PR07D`,
`PR17`, `PR18`, and `PR18x` as filing authority. The latest feedback-action says
the fresh i36 audit/manifest completed cleanly, but filing remains blocked by
PR07 owner replay, final-stack fuzz, and rebuilt validation.

The committed fuzzing graph is still browser/e2e-heavy. `unit-property` and one
`coverage-guided-lower-level` lane are active lower-level graph signals, while
transport is historical-only in the latest rate and `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` are still zero in the trend
counters. Persona-loop evidence now includes selected rich-text CRDT
coverage-guided lower-level runs, browser active lanes above the `24` floor, and
a validated HTTP polling protocol/server smoke. The level-mix feedback rejects
more browser/e2e expansion and recommends one audited protocol-server lane, but
the report still treats protocol/backend outputs as harness evidence until
collector-visible protocol counts appear. The next narrow checks are
producer-side duplicate/noise stability, collector-visible lower-level/protocol
counts, and PR07 replay evidence before any filing or final-stack claim.
