# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T05:39:05Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-17T05:31:13.734Z`,
  `lastUpdatedAt=2026-05-17T05:37:11.077Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1851` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T05:37:11Z`, coverage files grew from `272` to `40721`, a delta of
`40449`. The monitor's visible likely-real count reached `2`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, action depth, and completed-record depth
for real-user editing.

The latest plotted current-output-dir duplicate/noise and startup sample is
clean on those two live signals: `duplicateShareCurrent` is `0`, and current
summary startup failures are `0`. The same monitor pass still has `1` quality
issue, `1` warning, a false headroom flag, and `428.4G` free memory. This report
treats current-output-dir duplicate/noise and summary startup failure metrics as
live graph status; historical aggregate duplicate/noise is only context.

Persona-loop evidence still rejects a graph-only closure or broad-expansion
conclusion. The latest duplicate/noise synthesis, `20260517T051517Z`, says
the current signal is mostly a control-plane leak, not a product-failure signal:
no-product startup noise is mostly suppressed in consumers, but producer-side
holds and supervisor config enforcement still need to be durable and
per-group. The `20260517T051517Z` feedback-action file is empty; the last
non-empty feedback-action, `20260517T042417Z`, restored startup-noise cooldown
handling. The refreshed copied state now has HTTP persistence plus two
real-user browser groups enabled, so this report treats the action as evidence
of the intended fix, not graph-level closure.

The newest PR-split synthesis, `20260517T051532Z`, rejects a filing-ready,
final-stack-fuzz, or wait-only interpretation. It keeps the Cycle 232/234
replacement topology with `PR6B minimal` as a PR06A sidecar, conditional
`PR07C`, then `PR14 -> PR14B -> PR15A/B/C-on-PR14B`, followed by
validation-only combined head and pre-final gates. `5200005` is now
PR12-covered if the reducer report is accepted, but PR17/seed `1020002`, PR07C
browser evidence, `1060015`, `7510029`, and manifest freshness still block
final-stack fuzz and filing. The latest non-empty matching feedback-action,
`20260517T051532Z`, applied the Cycle 236 feedback, kept the replacement
topology, marked `5200005` as PR12-covered, refreshed the branch audit and push
manifest, and launched the bounded PR07C environment/manifest job without broad
or final-stack fuzz.

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

The latest plotted current-output-dir sample has `duplicateShareCurrent=0` and
current summary startup failures of `0`. It also has `1` quality issue, `1`
warning, `428.4G` free memory, and a false monitor headroom flag. The plot
uses `duplicateShareCurrent` and current summary startup failures for the live
health view; it does not use historical aggregate duplicate/noise as the plotted
live signal.

The copied novelty state reports `currentRunDirSource` as
`supervisor-active-run-dirs` for output dir
`/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T053102Z`.
Current-output triage has `3` roots, `1` file, `0` signatures, `0` visible
likely-real failures, and top duplicate family share `0`. The state has three
enabled groups: `novelty-http-persistence-probe`,
`novelty-ws-real-user-editing`, and `novelty-ws-real-user-rich-text`. Two
groups remain paused for startup/discovery noise:
`novelty-ws-persistence-no-title` until `2026-05-17T07:30:30Z` and
`novelty-ws-lifecycle` until `2026-05-17T06:31:45Z`. The latest duplicate/noise
synthesis rejects treating this as closed: it says the remaining problem is a
producer/supervisor control-plane leak and calls for durable per-group
no-product duplicate/noise holds with product evidence preserved. The current
output dir still has a no-behavioral-coverage health warning.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T05:30:00Z` show heavy CPU and load
pressure. The latest 25 CPU samples range from `46.5%` to `96.5%` utilization,
with the latest sample at `70.3%`. One-minute load exceeded the logical CPU
count in `19` of those `25` sampled windows, five-minute load in `21`, and
15-minute load in `23`. The latest sampled 1/5/15-minute load is `85.60`,
`65.00`, and `57.85` against `64` logical CPUs. Raw memory remains ample, but
the latest monitor headroom flag is false and the latest 1-minute and 5-minute
load windows are above core count.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state has three supervisor-active run dirs
under the latest output dir and three enabled groups: `novelty-http-persistence-probe`,
`novelty-ws-real-user-editing`, and `novelty-ws-real-user-rich-text`. Two
groups are paused after strict pre-action discovery/startup failures:
`novelty-ws-persistence-no-title` until `2026-05-17T07:30:30Z` and
`novelty-ws-lifecycle` until `2026-05-17T06:31:45Z`.

The duplicate/noise persona loop is stricter than a graph-only read. Current
live graph status comes from `duplicateShareCurrent=0` and current summary
startup failures of `0`; historical raw `pre_action_bootstrap_stall` remains
context, not the plotted live signal. The current-output state has `0`
signatures across `3` current roots and `1` file, and `0` visible likely-real
failures. The latest duplicate/noise synthesis rejects proof of closure because
producer-side no-product holds still need to be durable, enforced per group, and
honored by the running supervisor.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the plot shows `28` browser/e2e lanes across `28` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane. The latest
browser/e2e lanes are `3` coverage-guided, `9` focused-shards, `6`
gap-booster, and `10` strict-expansion.

The graph says live fuzzing is still concentrated in browser/e2e lanes, with
lower-level activity in `unit-property` and `coverage-guided-lower-level`. The
latest level-mix persona synthesis, `20260517T051110Z`, rejects trusting that
graph interpretation as live-productive capacity: it says the control plane
must fail closed first, count only live materialized browser groups, and surface
root/session mismatches as telemetry failures before capacity tuning. It
recommends no browser/protocol/backend capacity expansion now, keeping
focused/strict browser fuzzing and lower-level lanes running, then fixing
fail-closed accounting plus parser lower-level yield before adding targets.

Lower-level targets are active through `unit-property` and
`coverage-guided-lower-level`; the latest native-harness synthesis recommends
the rich-text CRDT merge harness as the first ready isolated lower-level target
and explicitly describes it as Node/Jest plus `NODE_V8_COVERAGE`, not
AFL/libFuzzer. `transport-integration` has historical activity but no current
counted rate. `backend-api`, `protocol-server`, and standalone
`fuzz-assertion` still have `0` counted graph activity. The latest
protocol-server action reports an implemented and smoke-validated HTTP polling
REST harness and says the trend collector now scans that protocol root, but the
refreshed graph still has `0` counted `protocol-server` executions. Fuzz-only
assertion work is active as browser and lower-level gate hardening, not as a
separate counted `fuzz-assertion` lane in these graphs.

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

The latest collected execution data has about `3,689,137` completed test
executions: `98,180` browser/e2e, `3,006` transport/integration, `3,182,656`
unit-property, and `405,295` coverage-guided-lower-level. The latest
15-minute bucket reports about `464` browser/e2e test executions/hour, `120,400`
unit-property test executions/hour, `17,152` coverage-guided-lower-level test
executions/hour, and `0`
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
`323` unique likely-real outputs over about `1,700.8` runner-hours, or `18.99`
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

Current unique bug-output candidate rates are: browser/e2e `4,464` candidates
over `1,700.8` runner-hours (`262.46` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `18.6` runner-hours
(`10.74` per 100 runner-hours), and unit/property `1` over `13.8` runner-hours
(`7.27` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `4,679.9` for browser/e2e,
`4,537.5` for transport/integration, `853.5` for coverage-guided lower-level,
and `799.7` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

Within browser/e2e, the strongest profiles by likely-real triage output per 100
runner-hours are permissions/auth/locks, session lifecycle,
three-user late-join, persistence-no-title, and block gauntlet. The broader
unique-output view ranks multi-reload lifecycle, session lifecycle,
block gauntlet, parser serialization, and common blocks highest. Lower-level
and transport lanes should continue to be judged partly by the new unique-output
candidate graphs until their triage pipeline is producing comparable
likely-real/non-duplicate results.

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
| `multi-reload-lifecycle` | 3098 | 100 | 0 | 3.2% |
| `revision-persistence` | 4148 | 142 | 0 | 3.4% |
| `parser-serialization` | 2998 | 140 | 0 | 4.7% |
| `real-user-editing` | 6022 | 435 | 0 | 7.2% |
| `parser-transform` | 3953 | 385 | 0 | 9.7% |
| `common-blocks` | 3759 | 378 | 0 | 10.1% |
| `long-session-large-doc` | 2387 | 403 | 0 | 16.9% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 5874 | 1058 | 0 | 18.0% |
| `persistence-no-title` | 2895 | 555 | 0 | 19.2% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next coverage tier | 300 | 500 |
| real-user body save/reload next coverage tier | 359 | 500 |
| action ui-heading-shortcut next coverage tier | 751 | 1000 |
| action reload-post-action next coverage tier | 762 | 1000 |
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
review, `20260517T051532Z`, took `8.0` minutes. The newest event window shows
feedback action for cycle 234 finishing at `2026-05-17T05:08:30Z`, review
cycle `20260517T050846Z` running from `2026-05-17T05:08:46Z` to
`2026-05-17T05:15:27Z`, review cycle `20260517T051532Z` running from
`2026-05-17T05:15:32Z` to `2026-05-17T05:23:29Z`, feedback action for
cycle 236 finishing at `2026-05-17T05:30:52Z`, and review cycle
`20260517T053057Z` starting at `2026-05-17T05:30:57Z`.

The newest PR-split synthesis, `20260517T051532Z`, says the split is blocked,
not filing-ready. It keeps the Cycle 232/234 replacement topology: `PR6B
minimal` as a PR06A sidecar, `PR07A/B` with conditional `PR07C`, then `PR14 ->
PR14B -> PR15A/B/C-on-PR14B`, followed by validation-only combined head and
pre-final gates. It rejects old PR15 refs, polluted PR6B, candidate PR16,
wildcard `final/*`, `try/*`, raw deferred refs, validation-only heads, and
generic PR18/PR18x branches as product PRs. `5200005` should be treated as
PR12-covered if the new reducer report is accepted, but PR17/seed `1020002`,
PR07C browser evidence, `1060015`, `7510029`, and manifest freshness still
block final fuzz and filing. The matching `20260517T051532Z` feedback-action
applied the Cycle 236 feedback, marked `5200005` as PR12-covered, kept
`1060015` and `7510029` gated on browser/UI evidence, classified the
`045710` reload-hydration report as nonempty diagnostic evidence, refreshed the
branch audit and push manifest, and launched the bounded PR07C
environment/manifest job. It did not launch broad or final-stack fuzz.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T05:24:37Z`, has `23`
suggested rows totaling `10775` net LOC. The largest current rows by net LOC
are `PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`),
and `PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, visible likely-real failures reached
`2`, and unmet goals are down from the initial `24` to `5`. Live health is
clean on the current-output-dir duplicate/noise and startup metrics: the latest
plotted sample has `duplicateShareCurrent=0` and current summary startup
failures of `0`. The same sample has `1` quality issue, `1` warning, a false
headroom flag, and `428.4G` free memory. The copied novelty state shows `3`
current roots, `1` file, `0` current signatures, `0` visible likely-real
failures, three enabled coverage-guided browser groups, and two browser groups
paused for startup-noise cooldown. Historical aggregate duplicate/noise remains
context; the live graph status comes from current-output-dir duplicate share
and current summary startup failures.

The duplicate/noise persona loop rejects both raw historical duplicate/noise as
a live health signal and an unqualified graph-only closure conclusion. The
latest duplicate/noise synthesis, `20260517T051517Z`, says the remaining
problem is primarily a control-plane leak: producer-side no-product
duplicate/noise holds need to be durable, per-group, and enforced by the running
supervisor while product-evidence failures stay analyzable. The
`20260517T051517Z` feedback-action file is empty; the last non-empty
feedback-action, `20260517T042417Z`, applied the narrow scheduler fix to
preserve unexpired startup-noise pauses, recover recently cleared pauses, and
avoid fallback overriding active cooldowns. The refreshed state now has
real-user groups enabled again, so this report preserves the control-plane
noise warning rather than treating the graph as accepted closure.

The PR-split persona loop rejects a filing-ready read, a final-stack-fuzz read,
and a wait-only read. The newest synthesis, `20260517T051532Z`, keeps the Cycle
232/234 replacement topology canonical, treats `5200005` as PR12-covered if the
new reducer report is accepted, leaves PR17/seed `1020002` as the final-stack
blocker, and still requires PR07C browser evidence, `1060015`, `7510029`, and a
fresh manifest before filing. The matching feedback-action refreshed the branch
audit and push manifest and launched the bounded PR07C environment/manifest job,
but it did not remove the final-stack blockers or launch broad fuzz. It rejects
serializing all work behind `1020002`; independent reducer,
browser-environment, and manifest-refresh work should continue.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still concentrated in browser/e2e in the plotted mix snapshots, with
unit-property and coverage-guided-lower-level lanes active. The latest
level-mix persona synthesis rejects trusting that graph at face value: it says
browser/gap/protocol accounting is stale and must fail closed before capacity
tuning. It recommends no browser/protocol/backend capacity expansion, keeping
focused/strict browser fuzzing and lower-level lanes running, and fixing
fail-closed accounting plus parser yield before adding targets. The
native-harness synthesis recommends the rich-text CRDT merge lower-level
harness as the first ready isolated target; the protocol-server action reports
a validated HTTP polling REST state-machine harness and a collector scan update.
The refreshed graph still has `0` counted `protocol-server`, `backend-api`, and
standalone `fuzz-assertion` executions, so protocol-server remains an
accounting or continuity gap in this report. The latest execution bucket has
about `464` browser/e2e, `120,400` unit-property, and `17,152`
coverage-guided-lower-level test executions/hour, with `0`
transport/integration in that bucket. The next narrow operational checks are
preserving startup-noise pauses, repairing mix telemetry, resolving the
lower-level/protocol accounting gap, continuing PR split/reducer gates, and
rebuilding validation before any final-stack fuzz or filing claim.
