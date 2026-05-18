# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T10:47:59Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-18T10:39:10Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`, latest samples
  `2026-05-18T10:40:01Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage. Across `2244` monitor
passes from `2026-05-15T01:21:42Z` through `2026-05-18T10:38:05Z`, coverage
files grew from `272` to `52010`, a delta of `51738`. The monitor's visible
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
The latest pass has `1` quality issue, `1` warning, `423.1G` free memory,
`no_progress=0`, and a true monitor headroom flag. This report uses
current-output duplicate/noise and summary startup failures for live health.
Historical aggregate duplicate/noise is context only; its latest duplicate share
is `0.3432` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence to evaluate, and it still rejects
reading startup-failure suppression as durable recovery by itself. The newest
duplicate/noise synthesis, `20260518T094242Z`, names the novelty-monitor
materialization rescue as the control-plane leak: drain-only no-product startup
noise can refill browser capacity unless rescue, fallback, and materialization
respect current startup holds and cooldowns. The matching feedback-action
reports that the rescue/cooldown leak and live-analysis retry leak were patched,
validated, and restarted into a fail-closed state with zero active browser run
dirs while noisy candidates are held. This report therefore treats the graph's
clean latest current-output samples as live recovery evidence to keep watching,
not as a durable closed issue yet.

The PR-split persona loop still rejects a filing-ready interpretation. The
latest synthesis, `20260518T102142Z`, keeps the Cycle324/i40 ungrouped topology
but says the written basis is stale: `20260518T101435Z` is audited with `69`
historical manifest rows but predates the completed `101357Z` reload-hydration
report, while `20260518T102438Z` is zero-byte and not evidence. The latest
feedback-action is still the earlier `20260518T095036Z` file: it selected a
now-nonzero `095429Z` finalization with `68` manifest rows and no live-head,
base-allowlist, branch-audit, bundle/head/manifest, shape-policy, or deferred
freshness failures. The newer synthesis supersedes that as current-basis
evidence. Filing, broad final-stack fuzzing, and stack-wide validation remain
blocked by seed `1020002` and by the need to refresh/audit PR07B1A against the
`101357Z` candidate; raw `PR07D`, `PR17`, `PR18`, and `PR18x` remain rejected.

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
`423.1G`, `no_progress=0`, and headroom true. The last twelve current-output
duplicate-share samples are all `0.0000`, while startup failures remain
suppressed.
The health graph does not use historical aggregate duplicate/noise as the
plotted live signal.

The refreshed copied novelty-state summary lists
`novelty-ws-real-user-rich-text` as the current enabled group; enabled history
most recently added `novelty-ws-lifecycle` and
`novelty-ws-real-user-save-reload` at `2026-05-18T10:17:44Z`.
Current-output duplicate share is `0.0000` and current summary startup failures
are `0`. The latest duplicate/noise synthesis rejects reading clean
startup-failure suppression as full recovery by itself. The latest
duplicate/noise feedback-action says the rescue/cooldown bypass has been
patched and the current state is intentionally fail-closed while startup-noise
cooldowns hold browser candidates. The next check is sustained low
current-output duplicate share while productive groups resume and advance, not
whether historical aggregate duplicate share falls.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T10:40:01Z` show bursty CPU. The
latest 25 CPU samples range from `44.96%` to `87.69%` utilization, with the
latest sample at `72.02%`. Over those same 25 samples, one-minute load exceeded
the `64` logical CPU count in `19` windows, five-minute load in `21`, 15-minute
load in `21`, and at least one load window exceeded it in `23`. The newest
1/5/15-minute load sample is `73.52`, `64.44`, and `61.67`; the one- and
five-minute load windows are above the logical CPU count, while the 15-minute
window is below it.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty-state summary lists
`novelty-ws-real-user-rich-text` as the current enabled group; the most recent
enabled-group events are `novelty-ws-lifecycle` and
`novelty-ws-real-user-save-reload` at `2026-05-18T10:17:44Z`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `29` browser/e2e lanes across `26` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live fuzzing is still concentrated in browser/e2e lanes in the committed graph,
with a narrow lower-level presence: `unit-property` and one
`coverage-guided-lower-level` lane are graph-visible. `transport-integration`
has historical execution/output data but no current counted rate.
`backend-api`, `protocol-server`, and standalone fuzz-only assertion work remain
at `0` in the committed graph counters.

The persona-loop evidence is more specific than the plotted lane mix and partly
contradicts it. The latest level-mix synthesis, `20260518T102333Z`, rejects a
broad rebalance and says to keep browser/e2e protected at `>=24`, make
coverage-guided browser materialization nonzero, cap coverage-guided lower-level
at `4`, keep `unit-property=1`, keep backend/API and protocol/server as one-lane
sentinels, and keep standalone `fuzz-assertion=0` until audited. Its
feedback-action file is empty; the latest non-empty feedback-action,
`20260518T084749Z`, reports the narrow supervisor repair, restored browser
materialization, a live sample of `26` active browser dirs, and backend/API plus
protocol/server reconciliation as `ok`; standalone `fuzz-assertion` remains
intentionally unaudited and counted as zero. The committed graph now agrees
browser/e2e is above the floor, but still has zero collector-visible
protocol-server, backend/API, or standalone `fuzz-assertion` executions.

The latest native-harness synthesis, `20260518T103115Z`, again names the
rich-text CRDT merge harness as the first ready isolated coverage-guided
lower-level target, labeled as a V8/Node coverage-guided mutator rather than
true AFL/libFuzzer. The latest action file, `20260518T101333Z`, reports that
the harness was adopted, validation passed through syntax, Prettier, dependency,
unit, smoke, `git diff --check`, and build checks, and root/lane
`events.ndjson` records were emitted with
`fuzzLevel="coverage-guided-lower-level"`. It also reports the continuous
rich-text CRDT lane alive and advancing, with parser, query-array, and
rich-text multiblock lower-level sessions observed. The newest synthesis says
the corpus is already at the `5000` cap and parser/table/query-array lanes are
useful second targets, but they should not block the first RTC-specific harness.
The committed graph still has only one collector-visible coverage-guided
lower-level lane and no current lower-level execution rate.

The latest protocol-server synthesis file, `20260518T104057Z`, is empty. The
latest non-empty synthesis, `20260518T103335Z`, recommends the HTTP polling REST
endpoint harness first, through real REST dispatch,
`WP_HTTP_Polling_Sync_Server`, and `WP_Sync_Post_Meta_Storage`, with durable
state-machine oracles and collector-compatible event accounting. The matching
`20260518T101612Z` action reports the protocol/server harness
implemented/revalidated in an isolated running wp-env on port `9540`; one
bounded validation seed passed `20` cases with root/lane `events.ndjson` and no
infra or oracle failures. The graph still has `0` protocol-server cumulative
executions and no current protocol rate because that work is not yet
collector-visible sustained trend evidence. The latest fuzz-only assertion apply
file, `20260518T092942Z`, added browser-gated assertions, stale CRDT hydration
diagnostics, HTTP polling cursor diagnostics, and a real-user undo/redo marker
assertion, then rebuilt and restarted affected browser fuzz producers.
Standalone `fuzz-assertion` executions remain `0`.

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

The latest collected execution data has about `5,670,407` completed test
executions: `185,594` browser/e2e, `3,006` transport/integration, `5,033,984`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `860` browser/e2e test executions/hour,
`2,688` unit-property executions/hour, and `0` coverage-guided-lower-level
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

On that triage-output metric, browser/e2e currently dominates: `730` unique
likely-real findings over about `2,243.2` runner-hours, or `32.54` per 100
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

Current unique bug-output candidate rates are: browser/e2e `5,862` candidates
over `2,243.2` runner-hours (`261.33` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `37.5` runner-hours
(`13.32` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the latest per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`184`), three-user late join (`126`), real-user
editing (`100`), permissions/auth/locks (`87`), and parser serialization (`45`).
The broader unique-output candidate view is led by three-user late join (`809`),
session lifecycle (`747`), real-user editing (`690`), revision persistence
(`510`), and permissions/auth/locks (`459`), with
lower-level lanes showing only small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `7181.2` for browser/e2e, `4537.5` for transport/integration,
`759.3` for coverage-guided lower-level, and `1912.7` for unit/property.

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
| `multi-reload-lifecycle` | 3818 | 155 | 0 | 4.1% |
| `revision-persistence` | 5793 | 242 | 0 | 4.2% |
| `parser-serialization` | 3814 | 240 | 0 | 6.3% |
| `real-user-editing` | 8264 | 609 | 0 | 7.4% |
| `common-blocks` | 4517 | 485 | 0 | 10.7% |
| `parser-transform` | 4821 | 524 | 0 | 10.9% |
| `long-session-large-doc` | 3556 | 586 | 0 | 16.5% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 6817 | 1286 | 0 | 18.9% |
| `session-lifecycle` | 8970 | 2662 | 0 | 29.7% |
| `media-cross-entity` | 495 | 160 | 0 | 32.3% |
| `persistence-no-title` | 3752 | 1233 | 0 | 32.9% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| action reload-post-action next 2000 tier | 1112 | 2000 |
| real-user title save/reload next 1000 tier | 567 | 1000 |
| successful real-user-editing records next 1000 tier | 609 | 1000 |
| real-user body save/reload next 1000 tier | 626 | 1000 |
| action ui-format-paragraph next 2000 tier | 1985 | 2000 |

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
review cycle, `20260518T102142Z`, took `12.4` minutes. The latest synthesis
rejects a filing-ready interpretation: Cycle324/i40 ungrouped remains the
active product topology, but the written basis is stale because `101435Z`
predates the completed `101357Z` reload-hydration candidate and `102438Z` is
zero-byte. The latest feedback-action is still the earlier `20260518T095036Z`
file; it selected a now-nonzero `095429Z` finalization, verified `68` manifest
rows and `68` branch-audit rows, and found no live-head, base-allowlist,
branch-audit, head/bundle/manifest, shape-policy, or deferred-freshness
failures. The newer synthesis supersedes that as the current basis. Filing,
broad final-stack fuzzing, and stack-wide validation remain blocked by seed
`1020002`; the next split work is PR07B1A refresh/audit against `101357Z`, PR07
owner replay now that runtime readiness is repaired-ready, and strict
PR05B/PR05C/clean-PR05D owner comparison before any PR18x claim.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T10:35:24Z`, has `10`
suggested rows totaling `4,114` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 13A` (`1126`), `PR 13C` (`294`), `PR 14` (`276`),
`PR 9` (`183`), `PR 1` (`162`), `PR 4` (`159`), `PR 10` (`141`), `PR 3`
(`53`), and `PR 2` (`52`). These charts remain size telemetry from parsed
status snapshots, not filing authority for split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction, but live
health should not be read as durably clean. The latest plotted duplicate/noise
sample uses the current-output-dir metric: startup failures are `0` and
current-output duplicate share is `0.0000`; the last twelve current-output
duplicate-share samples are all `0.0000`. The latest full health sample has
headroom true, quality issues `1`, warnings `1`, `no_progress=0`, and `423.1G`
free memory. The latest 1/5/15-minute load windows are `73.52`, `64.44`, and
`61.67`; the one- and five-minute windows are above the `64` logical CPU count.
Historical aggregate
duplicate/noise is not the live health signal.

The duplicate/noise persona loop rejects converting startup-failure suppression
into a durable recovery claim. The latest synthesis says the remaining primary
risk is a producer/control-plane leak where drain-only no-product startup noise
can starve or refill browser capacity unless novelty bootstrap/refill is
drain-aware and bounded. The latest duplicate/noise feedback-action reports
that the bounded rescue/cooldown fix was implemented, live-analysis retry
relaunch was tightened, and the current root is fail-closed with no active
browser dirs while cooldown-held candidates are skipped. The refreshed graph's
clean latest current-output samples are still only live recovery evidence. Both
graph and persona-loop evidence keep the next check focused on sustained low
current-output duplicate share while useful fuzzing resumes and advances, not
historical aggregate duplicate/noise.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest `20260518T102142Z` synthesis keeps the Cycle324/i40 ungrouped topology
but rejects the written basis as stale: `101435Z` is audited but predates the
completed `101357Z` reload-hydration candidate, and `102438Z` is zero-byte. The
`20260518T095036Z` feedback-action still proves the earlier `095429Z` artifact
was nonzero and audit-clean, but the current basis now needs PR07B1A refresh and
manifest audit against `101357Z`. Seed `1020002` still blocks filing, broad
final-stack fuzzing, and stack-wide validation; PR07 owner replay after the
runtime-readiness repair and strict PR05B/PR05C/clean-PR05D owner comparison
should continue.

The committed fuzzing graph is still browser/e2e-heavy: `29` current browser/e2e
lanes across `26` groups, `1` `unit-property` lane, and `1`
`coverage-guided-lower-level` lane.
Transport is historical-only in the latest rate, and `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` are still zero in the trend
counters. Persona-loop feedback says backend/API and protocol/server should stay
as one-lane sentinels, the latest protocol action reports a passing
protocol-server bounded validation with root/lane events, fuzz-only assertion
work has been added to browser producers, and the latest native-harness action
reports continuous lower-level sessions beyond the one collector-visible
lower-level lane. That contradicts the committed graph counters, so the report
treats those as live persona-loop evidence but not yet sustained
collector-visible graph evidence. The next narrow checks are sustained
current-output duplicate/noise health, collector-visible backend/protocol and
assertion counts, PR07B1A refresh/owner replay evidence, and fresh
manifest/finalization audit before any filing or final-stack claim.
