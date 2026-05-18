# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T09:42:06Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-18T09:31:55Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`, latest samples
  `2026-05-18T09:40:00Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage. Across `2238` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-18T09:31:55Z`, coverage
files grew from `272` to `51591`, a delta of `51319`. The monitor's visible
likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and action
depth.

The latest plotted live duplicate/noise point is clean on the current-output-dir
metric: `duplicateShareCurrent=0.0000`, while current summary startup failures
remain `0`. The last twelve current-output duplicate-share samples are all
`0.0000`, so the graph shows current-output recovery but still is not durable
duplicate/noise recovery evidence by itself.
The latest pass has `0` quality issues, `0` warnings, `404.3G` free
memory, and a false monitor headroom flag. This report uses current-output
duplicate/noise and summary startup failures for live health.
Historical aggregate duplicate/noise is context only; its latest duplicate share
is `0.3433` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence to evaluate, and it still rejects
reading startup-failure suppression as durable recovery by itself. The newest
duplicate/noise synthesis, `20260518T090427Z`, says the remaining
duplicate/noise leak is producer/scheduler-side: strict no-product
`pre_action_bootstrap_stall` failures are mostly suppressed before analysis, but
the control plane can still refill capacity with new no-product startup-noise
groups. It recommends Jetstream2-scoped first-hit producer cooldown and novelty
refill blocking for groups without product evidence. The matching feedback
action reports that bounded supervisor/novelty control-plane fix was applied and
validated, so this report treats the graph's clean latest current-output samples
as live recovery evidence to keep watching, not as a durable closed issue yet.

The PR-split persona loop rejects a filing-ready interpretation. The latest
synthesis, `20260518T091835Z`, keeps the Cycle324/i40 ungrouped topology but
says the written split basis is stale: replace the `084407Z` 63-row basis with
the newer `20260518T091416Z` 66-row finalization and prove it with a fresh
bundle/manifest audit before filing or final-stack validation. It still blocks
GitHub filing and broad final-stack fuzzing on PR07 runtime evidence and seed
`1020002`, rejects grouped `PR06/PR11/PR12/PR15`, raw `PR07D`, `PR17`, `PR18`,
and `PR18x`, and keeps reload/search/rich-text rows diagnostic until owner
comparison proves a product delta. The matching `20260518T091835Z`
feedback-action says the requested `091416Z` basis audit verified the 66-row
manifest shape but found freshness failures from newer deferred reports, then
updated the current completed basis to nonzero `092419Z` rows where covered.

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
`404.3G`, and headroom false. The last twelve current-output duplicate-share
samples are all `0.0000`, while startup failures remain suppressed.
The health graph does not use historical aggregate duplicate/noise as the
plotted live signal.

The refreshed copied novelty-state summary does not list a current enabled
group, while enabled-group history most recently added
`novelty-ws-multi-reload-lifecycle`. Current-output duplicate share is `0.0000`
and current summary startup failures are `0`. The latest duplicate/noise
synthesis rejects reading clean startup-failure suppression as full recovery by
itself, while the matching feedback-action says the bounded producer/refill fix
has been applied. The next check is sustained low current-output duplicate share
while productive groups keep advancing, not whether historical aggregate
duplicate share falls.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T09:40:00Z` show bursty CPU. The
latest 25 CPU samples range from `72.45%` to `87.68%` utilization, with the
latest sample at `85.17%`. Over those same 25 samples, one-minute load exceeded
the `64` logical CPU count in `20` windows, five-minute load in `24`, 15-minute
load in `25`, and at least one load window exceeded it in all `25`. The newest
1/5/15-minute load sample is `107.32`, `96.79`, and `97.00`; all three load
windows are above the logical CPU count.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty-state summary has no current enabled group
listed; the most recent enabled-group event is
`novelty-ws-multi-reload-lifecycle`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `25` browser/e2e lanes across `25` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live fuzzing is still concentrated in browser/e2e lanes in the committed graph,
with a narrow lower-level presence: `unit-property` and one
`coverage-guided-lower-level` lane are graph-visible. `transport-integration`
has historical execution/output data but no current counted rate.
`backend-api`, `protocol-server`, and standalone fuzz-only assertion work remain
at `0` in the committed graph counters.

The persona-loop evidence is more specific than the plotted lane mix and partly
contradicts it. The latest level-mix synthesis, `20260518T091703Z`, rejects a
broad rebalance and says to keep browser/e2e protected at `>=24`, cap
lower-level lanes, keep backend/protocol as one-lane sentinels, and keep
standalone `fuzz-assertion=0` until audited. It also says mix decisions should
wait for active-current browser yield parsing and supervisor/novelty invariant
repair. The latest non-empty feedback-action, `20260518T084749Z`, reports a
narrow supervisor repair, restored browser materialization, a live sample of
`26` active browser dirs, and backend/API plus protocol/server reconciliation as
`ok`; standalone `fuzz-assertion` remains intentionally unaudited and counted as
zero. The committed graph agrees browser/e2e is above the floor, but still has
zero collector-visible protocol-server, backend/API, or standalone
`fuzz-assertion` executions.

The latest native-harness synthesis, `20260518T092447Z`, again names the
rich-text CRDT merge harness as the first ready isolated coverage-guided
lower-level target, labeled as a V8/Node coverage-guided mutator rather than
true AFL/libFuzzer. The latest action file is empty; the latest substantive
action, `20260518T085813Z`, reports the harness and launcher
implemented/adopted, normal and fuzz-gated validation passing, root and lane
`events.ndjson` emitted with `fuzzLevel="coverage-guided-lower-level"`, and
continuous lower-level sessions observed for parser, query-array, rich-text
CRDT, and rich-text multiblock. The committed graph still has only one
collector-visible coverage-guided lower-level lane and no current lower-level
execution rate.

The latest protocol-server synthesis file, `20260518T093326Z`, is empty; the
latest substantive synthesis, `20260518T092325Z`, recommends the HTTP polling
REST endpoint harness first, through `WP_REST_Request`,
`WP_HTTP_Polling_Sync_Server`, and `WP_Sync_Post_Meta_Storage`, and specifies a
durable state-machine oracle plus event-accounting requirements. The matching
action reports the protocol/server harness implemented and bounded tmux
validation passing with root/lane `events.ndjson`, but the graph still has `0`
protocol-server cumulative executions and no current protocol rate because that
work is not yet collector-visible trend evidence. The latest fuzz-only
assertion apply file, `20260518T074700Z`, added browser-gated assertions,
retuned noisy parser representation checks under fuzz-only runs, rebuilt, and
restarted affected browser fuzz producers. Standalone `fuzz-assertion`
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

The latest collected execution data has about `5,647,374` completed test
executions: `181,537` browser/e2e, `3,006` transport/integration, `5,015,008`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `4,748` browser/e2e test executions/hour,
`12,032` unit-property executions/hour, and `0` coverage-guided-lower-level
executions/hour, with `0` current rate for transport/integration, backend/API,
protocol-server, and standalone `fuzz-assertion`. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` remain at `0` cumulative
executions in this counter despite persona-loop evidence that backend/protocol
lanes were launched.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graphs are triage-output metrics only. They count only
non-duplicate `.triage-watcher/**/result.json` rows classified `likely_real` per
100 runner-hours, deduped by canonical bug key and attributed to the failure
first-seen time. They are not total bug-finding graphs, not per-core efficiency,
and not a count of all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates: `724` unique
likely-real findings over about `2,224.2` runner-hours, or `32.55` per 100
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

Current unique bug-output candidate rates are: browser/e2e `5,843` candidates
over `2,224.2` runner-hours (`262.70` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `36.5` runner-hours
(`13.72` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the latest per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`179`), three-user late join (`125`), real-user
editing (`97`), permissions/auth/locks (`87`), and parser serialization (`44`).
The broader unique-output candidate view is led by three-user late join (`807`),
session lifecycle (`741`), real-user editing (`686`), revision persistence
(`509`), and permissions/auth/locks (`459`), with
lower-level lanes showing only small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `7063.8` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `1969.7` for unit/property.

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
| `multi-reload-lifecycle` | 3771 | 155 | 0 | 4.1% |
| `revision-persistence` | 5690 | 240 | 0 | 4.2% |
| `parser-serialization` | 3781 | 236 | 0 | 6.2% |
| `real-user-editing` | 8124 | 605 | 0 | 7.4% |
| `common-blocks` | 4499 | 485 | 0 | 10.8% |
| `parser-transform` | 4775 | 517 | 0 | 10.8% |
| `long-session-large-doc` | 3493 | 582 | 0 | 16.7% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6761 | 1278 | 0 | 18.9% |
| `session-lifecycle` | 8915 | 2657 | 0 | 29.8% |
| `media-cross-entity` | 495 | 160 | 0 | 32.3% |
| `persistence-no-title` | 3725 | 1207 | 0 | 32.4% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| action reload-post-action next 2000 tier | 1104 | 2000 |
| real-user title save/reload next 1000 tier | 559 | 1000 |
| successful real-user-editing records next 1000 tier | 605 | 1000 |
| real-user body save/reload next 1000 tier | 618 | 1000 |
| action ui-format-paragraph next 2000 tier | 1948 | 2000 |

The remaining queue mixes real-user save/reload lifecycle depth, real-user
editing completion, and action depth.

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

The highest-volume feature categories are history, operation-ledger, invariant,
action pairs, block depth, block, action, other, transport, collaborator,
revision, and payload-size observations. The plot separates breadth (`keys`)
from repeated observations (`total_count`) so broad coverage is not hidden
inside raw event volume.

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
took roughly `7.6` to `16.3` minutes in this snapshot. The newest completed
review cycle, `20260518T091835Z`, took `10.8` minutes. The latest synthesis
rejects a filing-ready interpretation: Cycle324/i40 ungrouped remains the
active product topology, but the written basis must move from `084407Z` / 63
rows to the newer `20260518T091416Z` / 66-row finalization after a fresh
bundle/manifest audit. `PR07B1A` is still runtime-gated after `PR07B1`;
`HOLD-07B2`, `HOLD-07C`, reload/search/rich-text rows, and raw `PR07D` remain
diagnostic or held without owner-comparison proof. Filing, broad final-stack
fuzzing, and stack-wide validation remain blocked by PR07 owner/runtime evidence
and seed `1020002`. The matching `20260518T091835Z` feedback-action audited the
requested `091416Z` basis, found it stale against newer deferred reports, and
moved covered current rows to the nonzero `092419Z` basis.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T09:35:46Z`, has `8`
suggested rows totaling `2,152` net LOC. The largest current rows by net LOC are
`PR 13A` (`1126`), `PR 14` (`276`), `PR 9` (`183`), `PR 1` (`162`),
`PR 4` (`159`), `PR 10` (`141`), `PR 3` (`53`), and `PR 2` (`52`). These charts
remain size telemetry from parsed status snapshots, not filing authority for
split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction, but live
health should not be read as durably clean. The latest plotted duplicate/noise
sample uses the current-output-dir metric: startup failures are `0` and
current-output duplicate share is `0.0000`; the last twelve current-output
duplicate-share samples are all `0.0000`. The latest full health sample has
headroom false, quality issues `0`, warnings `0`, and `404.3G` free memory. The
latest 1/5/15-minute load windows are `107.32`,
`96.79`, and `97.00`; all three are above the `64` logical CPU count.
Historical aggregate duplicate/noise is not the live health signal.

The duplicate/noise persona loop rejects converting startup-failure suppression
into a durable recovery claim. The latest synthesis says the remaining primary
risk is a producer/scheduler leak where no-product strict startup stalls can
still consume new browser capacity after the first hit. The matching
duplicate/noise feedback-action reports that the bounded producer/refill fix was
implemented and validated, but the refreshed graph's clean latest current-output
samples are still only live recovery evidence. Both graph and persona-loop
evidence keep the next check focused on sustained low current-output duplicate
share while useful fuzzing advances, not historical aggregate duplicate/noise.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest `20260518T091835Z` synthesis keeps the Cycle324/i40 ungrouped topology,
but requires replacing the stale `084407Z` / 63-row written basis with the
`20260518T091416Z` / 66-row finalization and a fresh audit. The matching action
found that audited basis already stale from newer deferred reports and moved the
covered current basis to nonzero `092419Z` rows. `PR07B1A` remains runtime-gated
after `PR07B1`; held PR07 siblings stay held, and reload/search plus rich-text
rows remain diagnostic until owner comparison proves a product delta. Seed
`1020002` blocks filing, broad final-stack fuzzing, and stack-wide validation
only; independent audit, deferred refresh, PR07 preflight repair, and loop
repair should continue.

The committed fuzzing graph is still browser/e2e-heavy: `25` current browser/e2e
lanes across `25` groups, `1` `unit-property` lane, and `1`
`coverage-guided-lower-level` lane.
Transport is historical-only in the latest rate, and `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` are still zero in the trend
counters. Persona-loop feedback says backend/API and protocol/server reconcile
as live in fresh context, fuzz-only assertion work has been added to browser
producers, and continuous lower-level sessions are active beyond the one
collector-visible lower-level lane. That contradicts the committed graph
counters, so the report treats those as live persona-loop evidence but not yet
sustained collector-visible graph evidence. The next narrow checks are sustained
current-output duplicate/noise health, collector-visible backend/protocol and
assertion counts, replacement PR07 owner replay evidence, and fresh
manifest/finalization audit before any filing or final-stack claim.
