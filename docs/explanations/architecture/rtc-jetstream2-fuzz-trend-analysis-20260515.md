# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T04:39:26Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-17T04:24:59.833Z`,
  `lastUpdatedAt=2026-05-17T04:35:02.632Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1837` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T04:35:02Z`, coverage files grew from `272` to `40057`, a delta of
`39785`. The monitor's visible likely-real count reached `1`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, action depth, and completed-record depth
for real-user editing.

The latest plotted current-output-dir duplicate/noise and startup sample is now
mixed rather than clean: `duplicateShareCurrent` is `0.5`, while current summary
startup failures are `0`. The same monitor pass has `0` quality issues, `0`
warnings, a false headroom flag, and `420.2G` free memory. This report treats
current-output-dir duplicate/noise and summary startup failure metrics as live
graph status; historical aggregate duplicate/noise is only context.

Persona-loop evidence still rejects a graph-only closure or broad-expansion
conclusion. The newest duplicate/noise synthesis, `20260517T042417Z`, says the
active issue is control-plane noise recycling rather than a product-failure
signal: current-run triage is not showing likely-real product failures, but the
producer/scheduler can still re-enable or preserve recently noisy real-user
groups after output-root rotation, dedupe migration, or fallback selection. The
synthesis says to preserve unexpired startup-noise pauses, avoid fallback
overrides that re-enable noisy groups, and keep product-evidence failures
visible.

The newest PR-split synthesis, `20260517T042625Z`, rejects a filing-ready,
final-stack-fuzz, or wait-only interpretation. It replaces the stale PR14/PR15
plan with `PR14 -> PR14B -> PR15A-on-PR14B -> PR15B-on-PR14B ->
PR15C-on-PR14B`, keeps PR6B as only the minimal sidecar, and says old PR6B,
old PR15A/B/C, old PR16, raw deferred refs, wildcard `final/*`, and validation
heads are not product PRs. PR17/seed `1020002` still blocks final-stack fuzz
and filing, but independent audits, PR07C validation, and reducers for
`5200005`, `1060015`, and `7510029` should proceed now.

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

The latest plotted current-output-dir sample has `duplicateShareCurrent=0.5`
and current summary startup failures of `0`. It also has `0` quality issues,
`0` warnings, `420.2G` free memory, and a false monitor headroom flag. The plot
uses `duplicateShareCurrent` and current summary startup failures for the live
health view; it does not use historical aggregate duplicate/noise as the plotted
live signal.

The copied novelty state reports `currentRunDirSource` as
`supervisor-active-run-dirs`. Current-output triage has `2` roots, `2` files,
`2` signatures, `0` visible likely-real failures, and top duplicate family
share `0.5`. The state has two enabled groups,
`novelty-http-persistence-probe` and `novelty-ws-real-user-editing`, and two
active supervisor run dirs. Two groups remain paused for startup/discovery
noise: `novelty-ws-persistence-no-title` until `2026-05-17T07:30:30Z` and
`novelty-ws-lifecycle` until `2026-05-17T06:31:45Z`. The latest duplicate/noise
synthesis rejects closure: downstream no-product suppression is not enough if
the scheduler can recycle noisy producer lanes. Product-evidence failures must
remain visible and should not be suppressed by family name alone.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T04:30:00Z` show heavy CPU and load
pressure. The latest 25 CPU samples range from `55.0%` to `96.5%` utilization,
with the latest sample at `88.5%`. One-minute load exceeded the logical CPU
count in `19` of those `25` sampled windows, while the latest sampled
1/5/15-minute load is `116.34`, `113.58`, and `122.28` against `64` logical
CPUs. Raw memory remains ample, but the latest monitor headroom flag is false
and all three load windows remain above core count.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has two active supervisor run dirs
and two enabled groups: `novelty-http-persistence-probe` and
`novelty-ws-real-user-editing`.
Two groups are paused after strict pre-action discovery/startup failures:
`novelty-ws-persistence-no-title` until `2026-05-17T07:30:30Z` and
`novelty-ws-lifecycle` until `2026-05-17T06:31:45Z`.

The duplicate/noise persona loop is stricter than a graph-only read. Current
live graph status comes from `duplicateShareCurrent=0.5` and current summary
startup failures of `0`; historical raw `pre_action_bootstrap_stall` remains
context, not the plotted live signal. The current-output state has `2`
signatures across `2` current roots/files and `0` visible likely-real failures.
The newest synthesis rejects closure because stale control-plane state can still
recycle recently noisy producer groups even after downstream consumers suppress
strict no-product noise. Product-evidence failures should remain visible rather
than being blanket-suppressed.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the plot shows `27` browser/e2e lanes across `27` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane. The latest
browser/e2e lanes are `2` coverage-guided, `9` focused-shards, `6`
gap-booster, and `10` strict-expansion.

The graph says live fuzzing is still concentrated in browser/e2e lanes, with
lower-level activity in `unit-property` and `coverage-guided-lower-level`. The
latest level-mix persona synthesis rejects trusting that graph interpretation
as live-productive capacity: it says browser, protocol, and lower-level counts
are inflated by stale/configured roots, gap-booster is not useful live work, and
telemetry should fail closed before capacity tuning. It recommends no new
capacity now, keeping b64 CRDT and parser/serialization lower-level lanes, and
removing only the duplicate batch-16 CRDT lane after accounting is fixed.
Lower-level targets are active through `unit-property` and
`coverage-guided-lower-level`; `transport-integration` has historical activity
but no current counted rate, while `backend-api`, `protocol-server`, and
standalone `fuzz-assertion` still have `0` counted graph activity.

The lower-level persona outputs are not fully aligned. The native-harness
synthesis promotes rich-text CRDT merge as the first ready isolated
coverage-guided lower-level harness, with parser/serialization as the next
target. The protocol-server synthesis selects the HTTP polling REST target as
the first ready protocol/server harness, but the refreshed level-mix and
execution counters still show `protocol-server`, `backend-api`, and standalone
`fuzz-assertion` at `0` counted graph activity. Fuzz-only assertion work is
active as browser/lower-level gate hardening, not as a separate counted
`fuzz-assertion` lane in these graphs.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The current execution metric is estimated individual test/case executions
derived from lane `events.ndjson` files: browser seed attempts, unit/property
fixed tests plus generated fuzz cases, coverage-guided lower-level inputs, or
protocol/backend cases. Rechecks count as executions. This is more precise than
supervisor launches or lane counts, but it only covers fuzzers that emit these
lane events. Lower-level counts reconstructed from batch metadata or legacy
batch-count fields are approximate.

The latest collected execution data has about `3,436,178` completed test
executions: `97,463` browser/e2e, `3,006` transport/integration, `2,965,936`
unit-property, and `369,773` coverage-guided-lower-level. The latest
15-minute bucket reports about `568` browser/e2e test executions/hour,
`105,952` unit-property test executions/hour, `21,184`
coverage-guided-lower-level test executions/hour, and `0`
transport/integration test executions/hour. `backend-api`, `protocol-server`,
and standalone `fuzz-assertion` levels remain at `0` executions in this
counter.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

This graph has been relabeled because it is not a total bug-finding graph. It
counts only non-duplicate `.triage-watcher/**/result.json` rows classified
`likely_real` per 100 runner-hours, deduped by canonical bug key and attributed
to the failure first-seen time. The compute proxy is summed runner wall-clock
`durationMs` from lane `events.ndjson`, reported as runner-hours. This is best
interpreted as per-runner triage-output efficiency, not per-core efficiency and
not all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates:
`288` unique likely-real outputs over about `1,680.5` runner-hours, or `17.14`
likely-real outputs per 100 runner-hours. `transport-integration`,
`unit-property`, `coverage-guided-lower-level`, `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` still have `0` triaged
likely-real outputs in the collected triage rows. That does not prove the
lower-level lanes are unproductive; it means their findings have not yet flowed
through the same non-duplicate likely-real triage result path.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The two unique bug-output candidate plots are the broader effectiveness view.
They dedupe by canonical output key and include non-infra likely-real/uncertain
triage rows, untriaged raw browser or transport failure signatures, and
lower-level assertion failures. Obvious infra, harness, and no-product-output
classifications are excluded from the candidate count. This is intentionally
broader than confirmed bugs and narrower than raw failed attempts; untriaged
candidates are not confirmed bugs and still need follow-up before being treated
as maintainer-ready bugs.

Current unique bug-output candidate rates are: browser/e2e `4,387` candidates
over `1,680.5` runner-hours (`261.05` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `17.3` runner-hours
(`11.58` per 100 runner-hours), and unit/property `1` over `12.8` runner-hours
(`7.82` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within-level candidate output is still dominated by browser/e2e raw signatures,
with transport/integration also producing a visible raw-signature stream. The
lower-level lanes now show nonzero assertion-output candidates, but the counts
are small because those lanes are much newer and still lack the same mature
promotion path into `.triage-watcher` likely-real results.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `4,720.6` for browser/e2e,
`4,537.5` for transport/integration, `920.7` for coverage-guided lower-level,
and `820.7` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

Within browser/e2e, the strongest profiles by likely-real triage
output per 100 runner-hours are session lifecycle, permissions/auth/locks,
persistence-no-title, three-user late-join, and block-gauntlet. The pre-triage
failure-candidate view has similar but not identical pressure:
`permissions-auth-locks`, `async-server-blocks`, `three-user-late-join`,
`long-session-large-doc`, and `persistence-no-title` are the top current
browser/e2e sources. Lower-level and transport lanes should continue to be
judged partly by the new unique-output candidate graphs until their triage
pipeline is producing comparable likely-real/non-duplicate results.

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

Profiles with high successful counts include async/server blocks,
permissions/auth/locks, same-user/session lifecycle, three-user late join, and
HTTP persistence. The scatter uses records seen on the x-axis, completion rate
on the y-axis, startup-failure rate as point size, and unmet success goals as
triangle markers. Low-completion profiles are the next depth targets:

| Profile | Seen | Successful | Startup failures | Success rate |
| --- | ---: | ---: | ---: | ---: |
| `full` | 840 | 18 | 0 | 2.1% |
| `multi-reload-lifecycle` | 3054 | 97 | 0 | 3.2% |
| `revision-persistence` | 4090 | 140 | 0 | 3.4% |
| `parser-serialization` | 2944 | 136 | 0 | 4.6% |
| `real-user-editing` | 5929 | 435 | 0 | 7.3% |
| `parser-transform` | 3892 | 376 | 0 | 9.7% |
| `common-blocks` | 3701 | 374 | 0 | 10.1% |
| `long-session-large-doc` | 2358 | 384 | 0 | 16.3% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `persistence-no-title` | 2837 | 506 | 0 | 17.8% |
| `block-gauntlet` | 5815 | 1047 | 0 | 18.0% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next coverage tier | 296 | 500 |
| real-user body save/reload next coverage tier | 355 | 500 |
| action ui-heading-shortcut next coverage tier | 740 | 1000 |
| action reload-post-action next coverage tier | 745 | 1000 |
| successful real-user-editing records next coverage tier | 435 | 500 |

The remaining queue mixes real-user save/reload lifecycle depth, action depth,
and completed-record depth for real-user editing.

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

The feature-key mix is dominated by history, operation-ledger, invariant,
action-pair, block-depth, block, and action observations. That is the right
shape for RTC data-loss work because the harness observes both semantic state
transitions and low-level block/action combinations. The plot separates breadth
(`keys`) from repeated observations (`total_count`) so broad coverage is not
hidden inside raw event volume.

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
took roughly `5.8` to `11.2` minutes in this snapshot; the latest completed
review, `20260517T042625Z`, took `10.2` minutes. The newest event window shows
feedback action for cycle 230 finishing at `2026-05-17T04:19:28Z`, review cycle
`20260517T041933Z` running from `2026-05-17T04:19:33Z` to
`2026-05-17T04:26:17Z`, and review cycle `20260517T042625Z` running from
`2026-05-17T04:26:25Z` to `2026-05-17T04:36:36Z`. A feedback action for cycle
232 started at `2026-05-17T04:36:36Z`; the collected event log has no finish
event for that action yet.

The newest PR-split synthesis, `20260517T042625Z`, says the split still needs
change before filing and final-stack validation remains blocked. It replaces
the old PR14/PR15 shape with required PR14B and the `*-on-pr14b` PR15 refs from
`20260517T034240Z`, keeps PR6B as only the minimal sidecar, and treats PR07C as
a conditional PR07B sidecar that still needs installed-clone validation. It
rejects old PR6B, old PR15A/B/C, old PR16, raw deferred refs, wildcard
`final/*`, and validation heads as product PRs. PR17/seed `1020002` still
blocks final fuzz and filing, but independent audits and reducers for
`5200005`, `1060015`, and `7510029` should run now. The latest non-empty
feedback-action, `20260517T040415Z`, launched bounded PR14B/PR15B conflict,
`7510029`, and safe-controller-restart jobs; newer collected feedback-action
files are empty or not yet finished.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T04:27:19Z`, has `24`
suggested rows totaling `10890` net LOC. The largest current rows by net LOC
are `PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`),
and `PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, visible likely-real failures reached
`1`, and unmet goals are down from the initial `24` to `5`. Live health is
mixed on the current-output-dir duplicate/noise and startup metrics: the latest
plotted sample has `duplicateShareCurrent=0.5` and current summary startup
failures of `0`. The same sample has `0` quality issues, `0` warnings, a false
headroom flag, and `420.2G` free memory. The copied novelty state shows `2`
current roots/files, `2` current signatures, and `0` visible likely-real
failures. Historical aggregate duplicate/noise remains context; the live graph
status comes from current-output-dir duplicate share and current summary startup
failures.

The duplicate/noise persona loop rejects both raw historical duplicate/noise as
a live health signal and an unqualified graph-only closure conclusion. The
newest duplicate/noise synthesis, `20260517T042417Z`, says managed consumers
mostly suppress strict no-product startup noise, but the producer/scheduler can
still recycle noisy real-user lanes after output-root rotation, dedupe
migration, or fallback selection. It asks for a narrow scheduler fix that
preserves unexpired startup-noise pauses and prevents fallback from overriding
those pauses; it rejects broad consumer suppression unless a concrete stale-root
leak is reproduced.

The PR-split persona loop rejects a filing-ready read, a final-stack-fuzz read,
and a wait-only read. The newest synthesis, `20260517T042625Z`, makes PR14B and
the `*-on-pr14b` PR15 topology canonical, keeps only the minimal PR6B sidecar,
and treats PR07C as conditional on installed-clone validation. It leaves
PR17/seed `1020002` as a final-stack/filing blocker, but rejects serializing
all work behind `1020002`: manifest audits, PR07C validation, and reducers for
`5200005`, `1060015`, and `7510029` should continue now.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still concentrated in browser/e2e in the plotted mix snapshots, with
unit-property and coverage-guided-lower-level lanes active. The latest
level-mix persona synthesis rejects trusting that graph at face value: it says
browser/gap/protocol accounting is stale and must fail closed before capacity
tuning. It recommends no more browser capacity and, after accounting repair,
stopping only the duplicate batch-16 CRDT lower-level lane while keeping b64
CRDT plus parser/serialization running. The native-harness synthesis promotes
rich-text CRDT merge first; the protocol-server synthesis selects HTTP polling
REST first. The refreshed graph still has `0` counted `protocol-server`,
`backend-api`, and standalone `fuzz-assertion` executions. The latest execution
bucket has about `568` browser/e2e, `105,952` unit-property, and `21,184`
coverage-guided-lower-level test executions/hour, with `0`
transport/integration in that bucket. The next narrow operational checks are
preserving startup-noise pauses, repairing mix telemetry, resolving the
lower-level/protocol accounting gap, continuing PR split/reducer gates, and
rebuilding validation before any final-stack fuzz or filing claim.
