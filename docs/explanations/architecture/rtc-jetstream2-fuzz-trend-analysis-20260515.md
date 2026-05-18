# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T08:01:03Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-18T07:58:25Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`, latest samples
  `2026-05-18T08:00:00Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage. Across `2225` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-18T07:58:25Z`, coverage
files grew from `272` to `51111`, a delta of `50839`. The monitor's visible
likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted live duplicate/noise point is clean on the current-output-dir
metric: `duplicateShareCurrent=0.0000`, while current summary startup failures
remain `0`. The last twelve current-output duplicate-share samples include
eight `0.0000` samples, three recent `1.0000` recurrence samples, and one
`0.5000` recurrence sample, so the latest clean point is not durable
duplicate/noise recovery evidence by itself.
The latest pass has `0` quality issues, `0` warnings, `416.8G` free
memory, and a true monitor headroom flag. This report uses current-output
duplicate/noise and summary startup failures for live health.
Historical aggregate duplicate/noise is context only; its latest duplicate share
is `0.3435` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence to evaluate, and it still rejects
reading startup-failure suppression as durable recovery. The latest
duplicate/noise synthesis, `20260518T073243Z`, says strict no-product startup
noise is mostly suppressed before analysis, but stale or malformed
`.triage-watcher/no-analysis.json` sentinels can still leak through drain,
scheduler, or live-analysis paths. It recommends one current-output-root and
time-bounded active-sentinel rule, while explicitly rejecting broad suppression
of unknown, timeout, reload/rejoin, or product-evidence failures. The latest
feedback-action file is empty; the latest non-empty feedback-action,
`20260518T064914Z`, patched the startup-drain cooldown and restarted the
coverage-guided control plane.

The PR-split persona loop rejects a filing-ready interpretation. The latest
synthesis, `20260518T074559Z`, keeps the usable basis on the Cycle324/i40
ungrouped split with `PR07B1A` after `PR07B1`, holds `HOLD-07B2` and `HOLD-07C`,
and keeps reload/search/rich-text rows diagnostic-only. It treats the nonzero
`20260518T074350Z` finalization as useful but stale because it did not consume
the completed `20260518T073736Z` search and `20260518T074239Z` rich-text
diagnostics, and rejects the zero-byte `20260518T075352Z` report as evidence.
Broad final-stack fuzzing, GitHub filing, and rebuilt stack-wide validation
remain blocked by PR07 owner evidence, seed `1020002`, route diagnostics,
strict stale replay, and rebuilt validation.

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
`416.8G`, and headroom true. The last twelve current-output duplicate-share
samples include eight `0.0000` samples, three recent `1.0000` recurrence
samples, and one `0.5000` recurrence sample. The latest graph therefore shows a
clean current-output point after a short recurrence, while startup failures
remain suppressed.
The health graph does not use historical aggregate duplicate/noise as the
plotted live signal.

The refreshed copied novelty-state summary does not list active enabled group
names; the enabled-event history still ends at `novelty-ws-block-gauntlet`.
Current-output duplicate share is `0.0000` and current summary startup failures
are `0`. The latest duplicate/noise synthesis says stale no-analysis sentinels
still need a consistent current-output-root and expiry rule across novelty,
live-analysis, triage watcher, analysis tier, and deep-analysis tier. The recent
recurrence keeps the next check focused on sustained low current-output
duplicate share and active drain blocking, not whether the historical aggregate
duplicate share falls.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T08:00:00Z` show bursty CPU. The
latest 25 CPU samples range from `68.6%` to `83.3%` utilization, with the latest
sample at `77.3%`. Over those same 25 samples, one-minute load exceeded the
`64` logical CPU count in `17` windows, five-minute load in `22`, 15-minute load
in `25`, and at least one load window exceeded it in all `25`. The newest
1/5/15-minute load sample is `83.71`, `73.14`, and `69.04`; all three load
windows are above the logical CPU count.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty-state summary does not list active group
names in this refresh. The most recent enabled event in the history is
`novelty-ws-block-gauntlet`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `25` browser/e2e lanes across `25` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live fuzzing remains concentrated in browser/e2e lanes in the committed graph.
Lower-level targets visible in the graph are active but narrow:
`unit-property` and one `coverage-guided-lower-level` lane. `transport-integration`
has historical execution/output data but no current counted rate.
`protocol-server`, `backend-api`, and standalone fuzz-only assertion work remain
at `0` in the committed graph counters.

The persona-loop evidence is more specific than the plotted lane mix and partly
contradicts it. The latest level-mix synthesis, `20260518T071443Z`, recommends a
narrow mix only: browser/e2e at or above `24`, `coverage-guided-lower-level=4`
capped, `unit-property=1`, `backend-api=1`, `protocol-server=1`, and standalone
`fuzz-assertion=0` until audited. It rejects broad rebalancing and more JS/Jest
lower-level lanes. It also says backend/protocol exact tmux sessions were absent
after infra failures, and that protocol/backend should only count as active with
exact sessions plus advancing `status.tsv` and `events.ndjson`. The matching
`20260518T071443Z` feedback-action says it fixed the accounting blind spot and
launched one backend/API lane plus one protocol/server lane, with final context
showing `backend-api: 1` and `protocol-server: 1`. That contradicts the
committed trend graph, which still shows zero collector-visible protocol-server,
backend/API, or standalone fuzz-assertion executions. Treat those new lanes as
persona-loop live evidence until the next collector-visible graph refresh.

The latest native-harness synthesis, `20260518T074603Z`, still names the
rich-text CRDT merge harness as the first ready isolated coverage-guided
lower-level target, labeled as a V8/Node coverage-guided mutator rather than
AFL/libFuzzer. Its matching action file is empty. The graph still has only one
collector-visible coverage-guided lower-level lane.

The latest protocol-server synthesis, `20260518T075501Z`, is empty; the latest
non-empty protocol action, `20260518T072828Z`, implemented and validated the
HTTP polling REST endpoint harness. The graph still has `0` protocol-server
cumulative executions and no current protocol rate. The latest fuzz-only
assertion apply, `20260518T061350Z`, added browser-gated assertions and
restarted affected browser fuzz producers, while standalone `fuzz-assertion`
executions remain `0`.

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

The latest collected execution data has about `5,608,902` completed test
executions: `170,681` browser/e2e, `3,006` transport/integration, `4,987,392`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `72` browser/e2e test executions/hour, `256`
unit-property executions/hour, and `0` coverage-guided-lower-level
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

On that triage-output metric, browser/e2e currently dominates: `712` unique
likely-real findings over about `2,174.4` runner-hours, or `32.74` per 100
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

Current unique bug-output candidate rates are: browser/e2e `5,778` candidates
over `2,174.4` runner-hours (`265.73` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `34.8` runner-hours
(`14.37` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the latest per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`174`), three-user late join (`124`), real-user
editing (`95`), permissions/auth/locks (`86`), and parser serialization (`43`).
The broader unique-output candidate view is led by three-user late join (`794`),
session lifecycle (`730`), real-user editing (`677`), revision persistence
(`499`), and permissions/auth/locks (`454`), with
lower-level lanes showing only small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `6706.7` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `2063.7` for unit/property.

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
| `multi-reload-lifecycle` | 3722 | 154 | 0 | 4.1% |
| `revision-persistence` | 5589 | 235 | 0 | 4.2% |
| `parser-serialization` | 3732 | 231 | 0 | 6.2% |
| `real-user-editing` | 7942 | 603 | 0 | 7.6% |
| `common-blocks` | 4446 | 481 | 0 | 10.8% |
| `parser-transform` | 4678 | 509 | 0 | 10.9% |
| `long-session-large-doc` | 3441 | 581 | 0 | 16.9% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6700 | 1262 | 0 | 18.8% |
| `session-lifecycle` | 8840 | 2642 | 0 | 29.9% |
| `persistence-no-title` | 3670 | 1156 | 0 | 31.5% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| action reload-post-action next 2000 tier | 1098 | 2000 |
| real-user title save/reload next 1000 tier | 554 | 1000 |
| successful real-user-editing records next 1000 tier | 603 | 1000 |
| real-user body save/reload next 1000 tier | 613 | 1000 |
| action ui-format-paragraph next 2000 tier | 1899 | 2000 |

The remaining queue mixes real-user save/reload lifecycle depth, real-user
editing completion, and action depth.

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

The feature-key breadth is led by code coverage, action pairs, real-user,
history, operation-ledger, payload-size, block-depth, other, invariant, block,
action, and transport observations. The plot separates breadth (`keys`) from
repeated observations (`total_count`) so broad coverage is not hidden inside raw
event volume.

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
took roughly `8.6` to `16.3` minutes in this snapshot. The newest completed
review cycle, `20260518T074559Z`, took `11.6` minutes. The latest synthesis
rejects a filing-ready interpretation and keeps PR07 on the Cycle324/i40
ungrouped base with `PR07B1A` after `PR07B1`; `HOLD-07B2` and `HOLD-07C` remain
held, and reload/search/rich-text rows remain diagnostic-only without first-loss
ownership evidence. Filing, broad final-stack fuzzing, and rebuilt stack
validation remain blocked by PR07 owner evidence, seed `1020002`, route
diagnostics, strict stale replay, and rebuilt validation. The synthesis treats
the nonzero `20260518T074350Z` finalization as useful but stale until deferred
search and rich-text diagnostics are consumed, and rejects the zero-byte
`20260518T075352Z` report; the latest non-empty feedback action remains
`20260518T070538Z`, which applied `PR07B1A` and completed a bundle/manifest
audit while deferring owner replay and the `1030002` diagnostic.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T07:47:20Z`, has `8`
suggested rows totaling `2,152` net LOC. The largest current rows by net LOC are
`PR 13A` (`1126`), `PR 14` (`276`), `PR 9` (`183`), `PR 1` (`162`),
`PR 4` (`159`), `PR 10` (`141`), `PR 3` (`53`), and `PR 2` (`52`). These charts
remain size telemetry from parsed status snapshots, not filing authority for
split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction, but live
health should not be read as durably clean. The latest plotted duplicate/noise
sample uses the current-output-dir metric: startup failures are `0` and
current-output duplicate share is `0.0000`, after three `1.0000` recurrence
samples and one `0.5000` recurrence sample in the last twelve samples. The
latest full health sample has headroom true, quality issues `0`, warnings `0`,
and `416.8G` free memory. The latest 1/5/15-minute load windows are `83.71`,
`73.14`, and `69.04`; all three are above the `64` logical CPU count.
Historical aggregate duplicate/noise is not the live health signal.

The duplicate/noise persona loop rejects converting startup-failure suppression
into a durable recovery claim. The latest synthesis says strict no-product
startup records are mostly suppressed before analysis, but stale no-analysis
sentinels can still leak through drain, scheduler, or live-analysis paths. The
latest feedback-action file is empty; the latest non-empty feedback-action
patched the startup-drain cooldown and restarted the affected control plane.
The refreshed graph now has a clean latest current-output point after a recent
recurrence, so both graph and persona-loop evidence keep the next check focused
on sustained low current-output duplicate share and a current-output-root,
time-bounded active-sentinel rule, not historical aggregate duplicate/noise.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest `20260518T074559Z` synthesis keeps PR07 on Cycle324/i40 with `PR07B1A`
after `PR07B1`; held PR07 siblings stay held and reload/search/rich-text rows
remain diagnostic. It treats the nonzero `20260518T074350Z` finalization as
useful but stale until the deferred `20260518T073736Z` search and
`20260518T074239Z` rich-text diagnostics are consumed, and rejects the zero-byte
`20260518T075352Z` report. Filing and broad final-stack fuzzing remain blocked
on PR07 owner evidence, seed `1020002`, route diagnostics, strict stale replay,
and rebuilt validation.

The committed fuzzing graph is still browser/e2e-heavy: `25` current browser/e2e
lanes, `1` `unit-property` lane, and `1` `coverage-guided-lower-level` lane.
Transport is historical-only in the latest rate, and `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` are still zero in the trend
counters. Persona-loop feedback now says one backend/API lane and one
protocol/server lane were launched after accounting fixes, and protocol-server
validation passed. That contradicts the committed graph, so the report treats
backend/protocol as live persona-loop evidence but not yet sustained
collector-visible graph evidence. The next narrow checks are sustained
current-output duplicate/noise health, collector-visible protocol/backend and
assertion counts, PR07 replay evidence, and rebuilt validation before any filing
or final-stack claim.
