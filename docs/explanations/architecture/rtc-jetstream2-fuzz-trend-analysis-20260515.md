# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T12:09:20Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-18T12:01:47Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`, latest samples
  `2026-05-18T12:00:00Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage. Across `2251` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-18T12:01:47Z`, coverage
files grew from `272` to `52431`, a delta of `52159`. The monitor's visible
likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `4` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and
reload-post action depth.

The latest plotted live duplicate/noise point is clean on the current-output-dir
metric: `duplicateShareCurrent=0`, while current summary startup failures
remain `0`. The two immediately preceding current-output duplicate-share
samples were also `0`, after noisy `1.0000` samples earlier in the hour, so the
current-output signal is improving but not yet durably clear.
The latest pass has `1` quality issue, `1` warning, `416.3G` free memory,
`no_progress=0`, and `headroom=true`. This report uses
current-output duplicate/noise and summary startup failures for live health.
Historical aggregate duplicate/noise is context only; its latest duplicate share
is `0.3427` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence to evaluate, and it rejects reading
startup-failure suppression as durable recovery by itself. The newest
duplicate/noise synthesis file, `20260518T115752Z`, is empty; the latest
nonempty synthesis, `20260518T113229Z`, says strict no-product
`pre_action_bootstrap_stall` is mostly fixed in consumers; the remaining leak is
producer/control-plane behavior in the novelty monitor. It recommends a
current-run-scoped producer hold that preserves one product-evidence
representative, then pauses or rotates active duplicate/noise producers and
prevents immediate top-off re-enable. The same-cycle feedback-action says that
bounded fuzzer-side fix was implemented in the novelty monitor as local noise
policy `26`; validation found no enabled groups and no active current-run dirs,
so duplicate share was not yet a completed post-action yield measurement. The
graph's latest `duplicateShareCurrent=0` is a clean current point, not enough by
itself to prove durable producer recovery after the recent noisy samples.

The PR-split persona loop still rejects a filing-ready interpretation. The
latest synthesis, `20260518T115149Z`, says the Cycle325/i40 parallel-lane shape
mostly holds but the current linear `PR07B1 -> PR07B1A` tail is not file-ready
because `111430`/`114448` has a different patch-id and restacks conflict in
`packages/sync/src/test/manager.ts`. It says not to start broad final-stack
fuzzing, stack-wide validation, GitHub filing, or PR07 filing while `1020002`
and PR07 ownership remain unresolved. The latest feedback-action,
`20260518T113235Z`, partially contradicts the prior cycle by treating
`20260518T113458Z` as nonzero and passing a post-`113458` bundle/head/manifest
audit for `70` manifest rows, but it still leaves filing, broad final-stack
fuzzing, and stack-wide validation blocked. Raw `PR07D`, `PR17`, `PR18`, and
`PR18x` remain rejected.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The bottom facet is the operational queue: unmet goals fell from `24` to `5`
after restarts, expansion, and auto-ratcheting, and then to `4` in the latest
sample. The top facet shows continued coverage-file growth. Dense monitor-pass
points are intentionally small and
partially transparent so repeated samples do not visually turn into a misleading
line.

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

Per-pass yield is split out from cumulative state. `processed`, `new_features`,
`new_cdp`, and coverage-file deltas are shown on a `log1p` scale. Negative
coverage-file deltas are reset/restart artifacts and are marked separately.

## Health And Yield

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

The latest plotted live sample uses current-output-dir duplicate/noise metrics
and summary startup failures: `duplicateShareCurrent=0`, current summary startup
failures `0`, quality issue count `1`, warning count `1`, free memory `416.3G`,
`no_progress=0`, and `headroom=true`. The two immediately preceding
current-output duplicate-share samples were `0`; noisy `1.0000` samples still
appeared earlier in the hour while startup failures remained suppressed. The
latest duplicate/noise state is clean on the current-output metric, but recent
oscillation and the nonzero quality/warning counts mean it is not yet a durable
recovery point.
The health graph does not use historical aggregate duplicate/noise as the
plotted live signal.

The refreshed copied novelty-state summary lists one current enabled group,
`novelty-ws-real-user-rich-text`, after the earlier noise-policy `26`
validation had found no enabled groups and no active current-run dirs.
Current-output duplicate share is `0` and current summary startup failures are
`0`. The latest nonempty duplicate/noise synthesis rejects reading
startup-failure suppression as full recovery by itself and points to mixed
producers that keep running after startup noise is suppressed and
product-evidence duplicate families already have a representative or have hit a
family cap. The latest feedback-action implemented that producer backpressure as
policy `26`, but its validation was a startup-state check rather than a
completed post-action yield measurement. The report treats the current resumed
group plus clean duplicate/noise point as remediation evidence, not proof of
durable recovery; the next check is sustained low current-output duplicate
share while useful fuzzing advances, not whether historical aggregate duplicate
share falls.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T12:00:00Z` show bursty CPU. The
latest 25 CPU samples range from `44.96%` to `87.69%` utilization, with the
latest sample at `74.73%`. Over those same 25 samples, one-minute load exceeded
the `64` logical CPU count in `20` windows, five-minute load in `20`, 15-minute
load in `20`, and at least one load window exceeded it in `22`. The newest
1/5/15-minute load sample is `45.54`, `58.94`, and `67.00`; only the 15-minute
load window exceeds the logical CPU count, with `1` blocked task in the latest
sample.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty-state summary lists
`novelty-ws-real-user-rich-text` as the current enabled group.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `29` browser/e2e lanes across `26` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live fuzzing is still concentrated in browser/e2e lanes in the committed graph,
with a narrow graph-visible lower-level presence: `unit-property` and one
`coverage-guided-lower-level` lane. `transport-integration` has historical
execution/output data but no current counted rate. `backend-api`,
`protocol-server`, and standalone fuzz-only assertion work remain at `0` in the
committed graph counters.

The persona-loop evidence is more specific than the plotted lane mix and partly
contradicts it. The latest level-mix synthesis, `20260518T113210Z`, rejects a
broad rebalance, says not to add lower-level capacity yet, and keeps the intended
posture of browser/e2e at or above `24` lanes with `coverage-guided-lower-level=4`,
`unit-property=1`, `backend-api=1`, `protocol-server=1`, and standalone
`fuzz-assertion=0` until audited. It says gap groups parked as
`paused-startup-stall` make the next useful change controller/materialization
repair, not lane reallocation. The latest level-mix feedback-action file is
zero bytes; the latest nonempty action, `20260518T110312Z`, fixed a stale
coverage-guided session binding and restarted only that path. The committed
graph still shows only one lower-level lane and zero collector-visible
protocol-server, backend/API, or standalone `fuzz-assertion` executions, so the
report treats the controller fix as live remediation evidence rather than a
graph-visible rebalance.

The latest native-harness synthesis, `20260518T115107Z`, still names the
rich-text CRDT merge harness as the first ready isolated coverage-guided
lower-level target, labeled as a V8/Node coverage-guided mutator rather than
true AFL/libFuzzer. The matching action reports the harness adopted and
validated with root/lane `events.ndjson` emitted as
`fuzzLevel="coverage-guided-lower-level"`, a successful smoke run, and an
already-advancing continuous lower-level lane with sibling parser, query-array,
and rich-text multiblock sessions observed. The committed graph has one
collector-visible coverage-guided lower-level lane and `0` current lower-level
execution rate in the latest bucket.

The latest protocol-server synthesis, `20260518T114906Z`, recommends the HTTP
polling REST endpoint harness first, through real REST dispatch,
`WP_HTTP_Polling_Sync_Server`, and `WP_Sync_Post_Meta_Storage`, with durable
state-machine oracles and collector-compatible event accounting. The matching
action reports the protocol/server harness implemented and validated with
preflight, a passing bounded seed `1779105587`, `20` protocol cases, root/lane
`events.ndjson`, and no infra or oracle failures. The graph still has `0`
protocol-server cumulative executions and no current protocol rate because that
bounded validation left the protocol `current-run-root.txt` unchanged and is not
yet collector-visible sustained trend evidence. The latest fuzz-only assertion
apply file, `20260518T105350Z`, added two browser-gated assertions and restarted
affected browser fuzz loops. Standalone `fuzz-assertion` executions remain `0`
because that work is still inside browser producers rather than a separately
audited lane.

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

The latest collected execution data has about `5,701,830` completed test
executions: `194,105` browser/e2e, `3,006` transport/integration, `5,056,896`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `4,256` browser/e2e test executions/hour, `9,856`
unit-property executions/hour, and `0` coverage-guided-lower-level
executions/hour, with `0` current rate for transport/integration, backend/API,
protocol-server, and standalone `fuzz-assertion`. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` remain at `0` cumulative
executions in this counter despite persona-loop evidence for protocol validation
and browser-gated fuzz-only assertion work.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graphs are triage-output metrics only. They count only
non-duplicate `.triage-watcher/**/result.json` rows classified `likely_real` per
100 runner-hours, deduped by canonical bug key and attributed to the failure
first-seen time. They are not total bug-finding graphs, not per-core efficiency,
and not a count of all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates: `739` unique
likely-real findings over about `2,273.8` runner-hours, or `32.50` per 100
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

Current unique bug-output candidate rates are: browser/e2e `5,916` candidates
over `2,273.8` runner-hours (`260.18` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `38.9` runner-hours
(`12.86` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the latest per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`187`), three-user late join (`126`), real-user
editing (`99`), permissions/auth/locks (`88`), and parser-serialization (`46`).
The broader unique-output candidate view is led by three-user late join (`813`),
session lifecycle (`762`), real-user editing (`694`), revision persistence
(`517`), and permissions/auth/locks (`465`), with
lower-level lanes showing only small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `7451.7` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `1846.9` for unit/property.

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
| `multi-reload-lifecycle` | 3872 | 157 | 0 | 4.1% |
| `revision-persistence` | 5930 | 253 | 0 | 4.3% |
| `parser-serialization` | 3890 | 248 | 0 | 6.4% |
| `real-user-editing` | 8360 | 609 | 0 | 7.3% |
| `common-blocks` | 4577 | 491 | 0 | 10.7% |
| `parser-transform` | 4905 | 534 | 0 | 10.9% |
| `long-session-large-doc` | 3648 | 591 | 0 | 16.2% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6878 | 1298 | 0 | 18.9% |
| `session-lifecycle` | 9120 | 2701 | 0 | 29.6% |
| `media-cross-entity` | 495 | 160 | 0 | 32.3% |
| `persistence-no-title` | 3806 | 1282 | 0 | 33.7% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| action reload-post-action next 2000 tier | 1114 | 2000 |
| real-user title save/reload next 1000 tier | 569 | 1000 |
| successful real-user-editing records next 1000 tier | 609 | 1000 |
| real-user body save/reload next 1000 tier | 628 | 1000 |

The remaining queue mixes real-user save/reload lifecycle depth, real-user
editing completion, and reload-post action depth.

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
review cycle, `20260518T115149Z`, took `11.1` minutes. The latest synthesis
rejects a filing-ready interpretation: filing, final-stack fuzzing, PR07 filing,
and stack-wide validation remain blocked. It keeps the Cycle325/i40 split as
parallel ready/local, CRDT, and runtime-gated PR07 lanes, but says current
`PR07B1A` is not file-ready because `111430`/`114448` has a different patch-id
and the restack conflicts in `packages/sync/src/test/manager.ts`. The latest
feedback-action, `20260518T113235Z`, partly contradicts the prior cycle by
treating `20260518T113458Z` as nonzero and passing a post-`113458`
bundle/head/manifest audit for `70` manifest rows, but it still leaves broad
final-stack fuzzing, filing, and stack-wide validation blocked by seed
`1020002` and unresolved PR07 ownership. Raw `PR07D`, `PR17`, `PR18`, and
`PR18x` remain rejected.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T11:58:47Z`, has `10`
suggested rows totaling `4,114` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 13A` (`1126`), `PR 13C` (`294`), `PR 14` (`276`),
`PR 9` (`183`), `PR 1` (`162`), `PR 4` (`159`), `PR 10` (`141`), `PR 3`
(`53`), and `PR 2` (`52`). These charts remain size telemetry from parsed
status snapshots, not filing authority for split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction. The latest
plotted duplicate/noise sample uses the current-output-dir metric: startup
failures are `0` and current-output duplicate share is `0`; the two immediately
preceding current-output duplicate-share samples were also `0`, after earlier
noisy `1.0000` samples. The latest full health sample has `headroom=true`,
quality issues `1`, warnings `1`, `no_progress=0`, and `416.3G` free memory. The latest
1/5/15-minute load windows are `45.54`, `58.94`, and `67.00`; only the
15-minute load exceeds the `64` logical CPU count.
Historical aggregate duplicate/noise is not the live health signal.

The duplicate/noise persona loop rejects converting startup-failure suppression
into a durable recovery claim. The newest duplicate/noise synthesis file is
empty, so the latest nonempty synthesis remains `20260518T113229Z`: strict
no-product startup stalls are mostly fixed in consumers, but mixed producers can
still consume capacity with suppressed startup noise plus product-evidence
duplicate families after a representative exists or the family is capped. The
feedback-action implemented novelty-monitor producer backpressure as local
noise policy `26`; validation saw no enabled groups and no active current-run
dirs, so duplicate share was not yet a completed post-action yield measurement.
The refreshed graph now has `novelty-ws-real-user-rich-text` enabled and a
clean current-output duplicate/noise point, which is useful remediation
evidence, but the next check is still sustained low current-output duplicate
share while useful fuzzing advances, not historical aggregate duplicate/noise.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest `20260518T115149Z` synthesis keeps the audited Cycle325/i40 basis as
parallel ready/local, CRDT, and runtime-gated PR07 lanes, but says the current
`PR07B1 -> PR07B1A` tail is not file-ready because `111430`/`114448` has a
different patch-id and the restack conflicts. The `20260518T113235Z`
feedback-action partially rejects the prior graph/readout state by treating
`20260518T113458Z` as nonzero and reporting a passing post-`113458`
bundle/head/manifest audit for `70` manifest rows. That narrows the audit
concern, but does not make the stack file-ready: seed `1020002` still blocks
final-stack fuzz/filing/stack-wide validation, and PR07 ownership remains
unresolved. Ready/local and CRDT work can continue independently; the useful
next work is resolving or downscoping the PR07 restack/owner replay and
enforcing the loop against stale or nonterminal cycles.

The committed fuzzing graph is still browser/e2e-heavy: `29` current browser/e2e
lanes across `26` groups, `1` `unit-property` lane, and `1`
`coverage-guided-lower-level` lane.
Transport is historical-only in the latest rate, and `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` are still zero in the trend
counters. Persona-loop feedback says not to rebalance broadly: keep the current
mix, repair browser controller/materialization first, keep backend/API and
protocol/server sentinels, and count standalone `fuzz-assertion` as zero until
audited. The protocol action reports preflight and a passing bounded
`20`-case validation with root/lane events, fuzz-only assertion work has been
added inside browser producers, and the native-harness action reports the
rich-text coverage-guided lower-level target adopted, validated, and already
advancing alongside sibling lower-level sessions. That contradicts the committed
graph counters for protocol and assertion execution, so the report treats those
as live persona-loop evidence but not yet sustained collector-visible graph
evidence.
The next narrow checks are sustained current-output duplicate/noise health,
collector-visible backend/protocol and assertion counts, PR07 owner replay
evidence, the PR07B1A/`111430`/`114448` conflict, and the `1020002` blocker
before any filing or final-stack claim.
