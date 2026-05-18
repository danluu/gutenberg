# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T12:29:18Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-18T12:19:24Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`, latest samples
  `2026-05-18T12:20:00Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage. Across `2253` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-18T12:19:24Z`, coverage
files grew from `272` to `52506`, a delta of `52234`. The monitor's visible
likely-real maximum reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `4` unmet goals. The remaining
goals are real-user save/reload depth, real-user editing completion, and
reload-post action depth.

The latest plotted live duplicate/noise point is noisy on the
current-output-dir metric: `duplicateShareCurrent=1`, while current summary
startup failures remain `0`. The four immediately preceding current-output
duplicate-share samples were `0`, so the latest point is a regression rather
than a durable recovery signal. The latest pass has `0` quality issues, `0`
warnings, `411.3G` free memory, `no_progress=0`, and `headroom=false`. This
report uses current-output duplicate/noise and summary startup failures for live
health. Historical aggregate duplicate/noise is context only; its latest
duplicate share is `0.3427` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence to evaluate, and it rejects reading
startup-failure suppression as durable recovery by itself. The latest
duplicate/noise synthesis, `20260518T120846Z`, identifies a producer/control-plane
leak: empty materialization/bootstrap rescue can bypass no-product startup-noise
holds and refill capacity with known startup-noise producers before current
product evidence exists. It recommends making those startup holds hard capacity
blockers for rescue paths while preserving failures that have product evidence.
The newest duplicate/noise feedback-action file, `20260518T120846Z`, is empty;
the latest nonempty feedback-action remains `20260518T113229Z`, which
implemented narrower producer backpressure as local noise policy `26`, but did
not yet produce a completed post-action yield measurement. The graph's latest
`duplicateShareCurrent=1` means live current-output health is still noisy even
though summary startup failures are suppressed.

The PR-split persona loop still rejects a filing-ready interpretation. The
latest synthesis, `20260518T120257Z`, says the ready/local and CRDT lanes remain
usable but the PR07 tail is not review-safe: current `PR07B1A` does not cover
`111430`/`114448`, patch IDs differ, and restacking conflicts in
`packages/sync/src/test/manager.ts`. It says not to start broad final-stack
fuzzing, stack-wide validation, GitHub filing, or PR07 filing while seed
`1020002`, PR07 ownership, and deferred freshness remain unresolved. The latest
feedback-action, `20260518T120257Z`, applied that split change, launched the
PR07 restack/owner replay and deferred bundle audit, and still left filing,
broad final-stack fuzzing, and stack-wide validation blocked. The restack job
passed mechanically but produced no replacement candidate because the conflict
remained; the audit passed with warnings. Raw `PR07D`, `PR17`, `PR18`, and
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
and summary startup failures: `duplicateShareCurrent=1`, current summary startup
failures `0`, quality issue count `0`, warning count `0`, free memory `411.3G`,
`no_progress=0`, and `headroom=false`. The four immediately preceding
current-output duplicate-share samples were `0`; the newest sample reintroduces
current-output duplicate/noise while startup failures remain suppressed.
The health graph does not use historical aggregate duplicate/noise as the
plotted live signal.

The refreshed copied novelty-state summary lists two current enabled groups,
`novelty-http-persistence-probe` and `novelty-ws-permissions-auth-locks`, after
the earlier noise-policy `26` validation had found no enabled groups and no
active current-run dirs. Current-output duplicate share is `1` and current
summary startup failures are `0`. The latest duplicate/noise synthesis rejects
reading startup-failure suppression as full recovery by itself and points to
bootstrap/materialization rescue bypassing current no-product startup holds. The
latest feedback-action file is empty, and the latest nonempty feedback-action
was a startup-state check rather than a completed post-action yield measurement.
The report treats the current enabled groups plus noisy current duplicate-share
point as incomplete remediation evidence; the next check is sustained low
current-output duplicate share while useful fuzzing advances, not whether
historical aggregate duplicate/noise falls.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T12:20:00Z` show bursty CPU. The
latest 25 CPU samples range from `44.96%` to `87.69%` utilization, with the
latest sample at `82.78%`. Over those same 25 samples, one-minute load exceeded
the `64` logical CPU count in `20` windows, five-minute load in `20`, 15-minute
load in `20`, and at least one load window exceeded it in `22`. The newest
1/5/15-minute load sample is `73.47`, `79.51`, and `76.68`; all three load
windows exceed the logical CPU count, with `3` blocked tasks in the latest
sample.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty-state summary lists
`novelty-http-persistence-probe` and `novelty-ws-permissions-auth-locks` as the
current enabled groups.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `27` browser/e2e lanes across `27` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live fuzzing is still concentrated in browser/e2e lanes in the committed graph,
with a narrow graph-visible lower-level presence: `unit-property` and one
`coverage-guided-lower-level` lane. `transport-integration` has historical
execution/output data but no current counted rate. `backend-api`,
`protocol-server`, and standalone fuzz-only assertion work remain at `0` in the
committed graph counters.

The persona-loop evidence is more specific than the plotted lane mix and partly
contradicts it. The latest level-mix synthesis file, `20260518T122130Z`, is
empty; the latest nonempty synthesis, `20260518T121224Z`, rejects a broad
rebalance or adding lower-level lanes now. It says to restore browser/e2e
materialization to the `>=24` floor and fix accounting first, while keeping
`coverage-guided-lower-level=4`, `unit-property=1`, `backend-api=1`,
`protocol-server=1`, and standalone `fuzz-assertion=0` until audited. It also
flags supervisor-state/accounting defects and inflated lower-level uniqueness as
reasons not to trust mix changes yet. The latest level-mix feedback-action,
`20260518T113210Z`, applied a narrow browser/materialization repair and restarted
only affected coverage/gap paths. It reports no new lower-level target launched,
`fuzz-assertion` still unaudited and counted as zero, and browser/e2e still
below the protected floor in its sampled final context (`21` versus `24`). The
committed graph now shows `27` browser/e2e lanes but still only one graph-visible
lower-level lane and zero collector-visible protocol-server, backend/API, or
standalone `fuzz-assertion` executions, so the report treats the controller fix
as live remediation evidence rather than a graph-visible rebalance.

The latest native-harness synthesis, `20260518T121409Z`, still names the
rich-text CRDT merge harness as the first ready isolated coverage-guided
lower-level target, labeled as a V8/Node coverage-guided mutator rather than
true AFL/libFuzzer. The latest native-harness action file, `20260518T121409Z`,
is empty; the latest nonempty action, `20260518T115107Z`, reports the harness
adopted and validated with root/lane `events.ndjson` emitted as
`fuzzLevel="coverage-guided-lower-level"`, a successful smoke run, and an
already-advancing continuous lower-level lane with sibling parser, query-array,
and rich-text multiblock sessions observed. The committed graph has one
collector-visible coverage-guided lower-level lane and `0` current lower-level
execution rate in the latest bucket.

The latest protocol-server synthesis, `20260518T121219Z`, recommends the HTTP
polling REST endpoint harness first, through real REST dispatch,
`WP_HTTP_Polling_Sync_Server`, and `WP_Sync_Post_Meta_Storage`, with durable
state-machine oracles and collector-compatible event accounting. The latest
action, `20260518T121219Z`, reports the protocol/server harness implemented and
validated with preflight, a passing bounded seed `1779107113`, `20` protocol
cases, root/lane `events.ndjson`, and no infra or oracle failures. The graph
still has `0`
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

The latest collected execution data has about `5,709,006` completed test
executions: `196,097` browser/e2e, `3,006` transport/integration, `5,062,080`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `5,508` browser/e2e test executions/hour, `14,336`
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

On that triage-output metric, browser/e2e currently dominates: `742` unique
likely-real findings over about `2,283.2` runner-hours, or `32.50` per 100
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

Current unique bug-output candidate rates are: browser/e2e `5,922` candidates
over `2,283.2` runner-hours (`259.37` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `39.2` runner-hours
(`12.76` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the latest per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`190`), three-user late join (`126`), real-user
editing (`99`), permissions/auth/locks (`88`), and revision persistence (`31`).
The broader unique-output candidate view is led by three-user late join (`814`),
session lifecycle (`764`), real-user editing (`694`), revision persistence
(`517`), and permissions/auth/locks (`466`), with
lower-level lanes showing only small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `7506.7` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `1831.9` for unit/property.

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
| `multi-reload-lifecycle` | 3878 | 157 | 0 | 4.0% |
| `revision-persistence` | 5979 | 254 | 0 | 4.2% |
| `parser-serialization` | 3895 | 248 | 0 | 6.4% |
| `real-user-editing` | 8389 | 609 | 0 | 7.3% |
| `common-blocks` | 4597 | 491 | 0 | 10.7% |
| `parser-transform` | 4918 | 535 | 0 | 10.9% |
| `long-session-large-doc` | 3670 | 592 | 0 | 16.1% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6898 | 1299 | 0 | 18.8% |
| `session-lifecycle` | 9137 | 2703 | 0 | 29.6% |
| `media-cross-entity` | 495 | 160 | 0 | 32.3% |
| `persistence-no-title` | 3814 | 1289 | 0 | 33.8% |

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
review cycle, `20260518T120257Z`, took `12.6` minutes. The latest synthesis
rejects a filing-ready interpretation: filing, final-stack fuzzing, PR07 filing,
and stack-wide validation remain blocked. It keeps the ready/local and CRDT
lanes usable, but says the PR07 tail must become a decision fork after
`PR07B1`: current `PR07B1A` is not file-ready because `111430`/`114448` has a
different patch-id and the restack conflicts in
`packages/sync/src/test/manager.ts`. The latest feedback-action,
`20260518T120257Z`, applied that decision fork and launched the bounded PR07
restack/owner replay plus the post-`120507` deferred bundle audit. The feedback
narrows the audit concern by verifying `70` manifest rows, but it still blocks
broad final-stack fuzzing, filing, and stack-wide validation because seed
`1020002`, PR07 ownership, and deferred freshness remain unresolved. Raw
`PR07D`, `PR17`, `PR18`, and `PR18x` remain rejected.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T12:16:21Z`, has `10`
suggested rows totaling `4,114` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 13A` (`1126`), `PR 13C` (`294`), `PR 14` (`276`),
`PR 9` (`183`), `PR 1` (`162`), `PR 4` (`159`), `PR 10` (`141`), `PR 3`
(`53`), and `PR 2` (`52`). These charts remain size telemetry from parsed
status snapshots, not filing authority for split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction, but live
health is mixed. The latest plotted duplicate/noise sample uses the
current-output-dir metric: startup failures are `0` and current-output duplicate
share is `1`, after four immediately preceding current-output duplicate-share
samples at `0`. The latest full health sample has `headroom=false`, quality
issues `0`, warnings `0`, `no_progress=0`, and `411.3G` free memory. The latest
1/5/15-minute load windows are `73.47`, `79.51`, and `76.68`, so all three
exceed the `64` logical CPU count.
Historical aggregate duplicate/noise is not the live health signal.

The duplicate/noise persona loop rejects converting startup-failure suppression
into a durable recovery claim. The latest synthesis, `20260518T120846Z`, says
empty materialization/bootstrap rescue can bypass no-product startup-noise holds
and refill capacity with known startup-noise producers before current product
evidence exists. The latest feedback-action file is empty, and the latest
nonempty feedback-action was still a startup-state check rather than a completed
post-action yield measurement. The refreshed graph now has
`novelty-http-persistence-probe` and `novelty-ws-permissions-auth-locks` enabled
plus a noisy current-output duplicate/noise point. The next check is sustained
low current-output duplicate share while useful fuzzing advances, not historical
aggregate duplicate/noise.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest `20260518T120257Z` synthesis keeps the ready/local and CRDT lanes usable,
but says the current `PR07B1 -> PR07B1A` tail is not review-safe because
`111430`/`114448` has a different patch-id and the restack conflicts. The
`20260518T120257Z` feedback-action applied the decision fork, launched the PR07
restack/owner replay and deferred bundle audit, and partially contradicts the
older stale-audit concern by verifying `70` manifest rows. It still does not make
the stack file-ready: the restack produced no replacement candidate due to the
conflict, and seed `1020002`, PR07 ownership, and deferred freshness still block
final-stack fuzz/filing/stack-wide validation. Ready/local and CRDT work can
continue independently; the useful next work is resolving or downscoping the PR07
restack/owner replay and enforcing the loop against stale or nonterminal cycles.

The committed fuzzing graph is still browser/e2e-heavy: `27` current browser/e2e
lanes across `27` groups, `1` `unit-property` lane, and `1`
`coverage-guided-lower-level` lane.
Transport is historical-only in the latest rate, and `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` are still zero in the trend
counters. Persona-loop feedback says not to rebalance broadly: keep the current
mix, repair browser controller/materialization first, keep backend/API and
protocol/server sentinels, and count standalone `fuzz-assertion` as zero until
audited; the latest nonempty feedback-action still found browser/e2e below the
protected floor in its sampled context, while the graph now shows a later
collector snapshot above that floor. The protocol action reports preflight and a
passing bounded `20`-case validation with root/lane events, fuzz-only assertion
work has been added inside browser producers, and the native-harness nonempty
action reports the rich-text coverage-guided lower-level target adopted,
validated, and already advancing alongside sibling lower-level sessions. That
contradicts the committed graph counters for protocol and assertion execution,
so the report treats those as live persona-loop evidence but not yet sustained
collector-visible graph evidence.
The next narrow checks are sustained current-output duplicate/noise health,
collector-visible backend/protocol and assertion counts, PR07 owner replay
evidence, the PR07B1A/`111430`/`114448` conflict, and the `1020002` blocker
before any filing or final-stack claim.
