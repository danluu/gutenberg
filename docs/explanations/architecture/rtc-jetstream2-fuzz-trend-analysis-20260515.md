# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T05:58:47Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-17T05:42:48.200Z`,
  `lastUpdatedAt=2026-05-17T05:53:34.533Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1856` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T05:53:34Z`, coverage files grew from `272` to `40802`, a delta of
`40530`. The monitor's visible likely-real count reached `2`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, action depth, and completed-record depth
for real-user editing.

The latest plotted current-output-dir duplicate/noise and startup sample is
clean on those two live signals: `duplicateShareCurrent` is `0`, and current
summary startup failures are `0`. The same monitor pass has `0` quality issues,
`0` warnings, a true headroom flag, and `429.6G` free memory. This report
treats current-output-dir duplicate/noise and summary startup failure metrics as
live graph status; historical aggregate duplicate/noise is only context.

Persona-loop evidence still rejects a graph-only closure or broad-expansion
conclusion. The latest duplicate/noise synthesis, `20260517T053845Z`, says the
remaining leak is control-plane scoping: repeated same-family product-evidence
analysis can still consume capacity across sibling run directories, especially
`late_session_awareness_stall`. The latest duplicate/noise feedback-action
remains `20260517T051517Z`; it applied the no-product producer hold patch and
restarted the coverage-guided control plane, but it had not yet observed a fresh
no-product duplicate-dominated producer after the change. The synthesis now asks
for a root-wide semantic-family cap across live, first-level, and deep analysis,
so this is current live status, not graph-level closure.

The newest PR-split synthesis, `20260517T054316Z`, still rejects a filing-ready
or broad/final-stack-fuzz interpretation. The stack through
`PR15C-on-PR14B` remains the working spine, while PR17/seed `1020002`,
candidate PR16, generic PR18/PR18x, wildcard final branches, raw deferred
branches, and validation-only heads are not product filing targets. Remaining
pre-final gates are PR07C browser replay, `1060015`, `7510029`, `045710`
diagnostics, strict `5200005` only if `a914c862c29e` is still live,
adjacent-base validation repair, and a fresh manifest before rebuilt combined
validation and final fuzz/filing. The latest feedback-action remains
`20260517T051532Z`; it predates this synthesis and launched the bounded PR07C
environment/manifest job without broad or final-stack fuzz.

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
current summary startup failures of `0`. It also has `0` quality issues, `0`
warnings, `429.6G` free memory, and a true monitor headroom flag. The plot
uses `duplicateShareCurrent` and current summary startup failures for the live
health view; it does not use historical aggregate duplicate/noise as the plotted
live signal.

The copied novelty state reports `currentRunDirSource` as
`supervisor-active-run-dirs` and lists two enabled groups:
`novelty-ws-real-user-editing` and `novelty-ws-real-user-rich-text`; the copied
state does not include a detailed group/paused-group block. The latest
duplicate/noise synthesis rejects treating clean plotted duplicate/startup
signals as closure: it says no-product producer holds improved, but sibling run
directories can still fan out same-family product-evidence analysis. The
remaining requested fix is a supervised-root semantic-family cap across live,
first-level, and deep analysis while preserving distinct product-evidence
failures.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T05:50:00Z` still show heavy recent
CPU and load pressure, though the latest point eased. The latest 25 CPU samples
range from `45.9%` to `96.5%` utilization, with the latest sample at `45.9%`.
One-minute load exceeded the logical CPU count in `18` of those `25` sampled
windows, five-minute load in `20`, and 15-minute load in `22`. The latest
sampled 1/5/15-minute load is `38.74`, `42.39`, and `53.21` against `64`
logical CPUs. Raw memory remains ample and the latest monitor headroom flag is
true, but most recent load windows were still above core count.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state is in `supervisor-active-run-dirs`
mode and has two enabled groups: `novelty-ws-real-user-editing` and
`novelty-ws-real-user-rich-text`; the copied state does not include a detailed
group/paused-group block.

The duplicate/noise persona loop is stricter than a graph-only read. Current
live graph status comes from `duplicateShareCurrent=0` and current summary
startup failures of `0`; historical raw `pre_action_bootstrap_stall` remains
context, not the plotted live signal. The latest duplicate/noise feedback-action
implemented the producer-side hold patch and restarted the control plane; the
latest synthesis says the remaining leak is now root-wide analysis fan-out
across sibling run directories, so the next control-plane check is a
supervised-root semantic-family cap without suppressing distinct product
evidence.

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
latest level-mix persona synthesis, `20260517T051110Z`, rejects trusting that
graph interpretation as live-productive capacity: it says the control plane
must fail closed first, count only live materialized browser groups, and surface
root/session mismatches as telemetry failures before capacity tuning. It
recommends no browser/protocol/backend capacity expansion now. The matching
feedback-action made the fail-closed accounting and parser lower-level yield
changes, reported no `TELEMETRY-INVARIANT-FAIL`, and kept focused/strict
browser fuzzing plus lower-level lanes running.

Lower-level targets are active through `unit-property` and
`coverage-guided-lower-level`. The native-harness persona loop continues to
label the lower-level work honestly as Node/Jest plus V8 coverage rather than
AFL/libFuzzer; its latest action smoke-validated the rich-text CRDT merge lane
and left continuous lower-level sessions running. `transport-integration` has
historical activity but no current counted rate. `protocol-server` now has a
validated HTTP polling REST harness and tmux smoke from the latest action, but
the refreshed graph still has `0` counted `protocol-server` executions.
`backend-api` and standalone `fuzz-assertion` also remain at `0` counted graph
activity. The latest fuzz-only assertion apply added core-data hydration,
query-array, and WebSocket diagnostic gates and restarted affected browser
loops, but this is browser/lower-level gate hardening, not a separate counted
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

The latest collected execution data has about `3,774,385` completed test
executions: `98,284` browser/e2e, `3,006` transport/integration, `3,257,304`
unit-property, and `415,791` coverage-guided-lower-level. The latest
15-minute bucket reports about `300` browser/e2e test executions/hour,
`187,824` unit-property test executions/hour, `26,624`
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
`336` unique likely-real outputs over about `1,704.2` runner-hours, or `19.72`
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

Current unique bug-output candidate rates are: browser/e2e `4,491` candidates
over `1,704.2` runner-hours (`263.53` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `18.9` runner-hours
(`10.56` per 100 runner-hours), and unit/property `1` over `14.1` runner-hours
(`7.11` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `4,673.5` for browser/e2e,
`4,537.5` for transport/integration, `839.3` for coverage-guided lower-level,
and `781.7` for unit/property.

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
| `multi-reload-lifecycle` | 3101 | 100 | 0 | 3.2% |
| `revision-persistence` | 4153 | 142 | 0 | 3.4% |
| `parser-serialization` | 3001 | 140 | 0 | 4.7% |
| `real-user-editing` | 6038 | 437 | 1 | 7.2% |
| `parser-transform` | 3957 | 386 | 0 | 9.8% |
| `common-blocks` | 3762 | 378 | 0 | 10.0% |
| `long-session-large-doc` | 2392 | 407 | 0 | 17.0% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 5880 | 1060 | 0 | 18.0% |
| `persistence-no-title` | 2902 | 559 | 0 | 19.3% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| real-user title save/reload next coverage tier | 303 | 500 |
| real-user body save/reload next coverage tier | 362 | 500 |
| action ui-heading-shortcut next coverage tier | 754 | 1000 |
| action reload-post-action next coverage tier | 765 | 1000 |
| successful real-user-editing records next coverage tier | 437 | 500 |

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
took roughly `5.8` to `12.2` minutes in this snapshot; the latest completed
review, `20260517T054316Z`, took `8.0` minutes. The newest event window shows
review cycle `20260517T053057Z` running from `2026-05-17T05:30:57Z` to
`2026-05-17T05:43:11Z`, review cycle `20260517T054316Z` running from
`2026-05-17T05:43:16Z` to `2026-05-17T05:51:13Z`, and feedback action for
cycle 238 starting at `2026-05-17T05:51:13Z`.

The newest PR-split synthesis, `20260517T054316Z`, says the split still needs
change and is not filing-ready. It keeps the PR01-through-`PR15C-on-PR14B`
spine but rejects the stale tail: PR17/seed `1020002`, candidate PR16, generic
PR18/PR18x, wildcard final branches, raw deferred branches, and validation-only
heads should not be product filings. Old `5200005` is PR12-covered, and strict
`5200005` only remains if `a914c862c29e` is still live. It still requires PR07C
browser replay, `1060015` PR05-near browser/source-owner proof, `7510029` UI
discrimination, `045710` diagnostics, adjacent-base validation repair, current
blocker scanning, a fresh manifest, rebuilt combined validation, then final
fuzz/filing. The latest available feedback-action remains `20260517T051532Z`,
which launched the bounded PR07C environment/manifest job and did not launch
broad or final-stack fuzz; that action predates the latest synthesis.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T05:45:31Z`, has `23`
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
failures of `0`. The same sample has `0` quality issues, `0` warnings, a true
headroom flag, and `429.6G` free memory. The copied novelty state is in
`supervisor-active-run-dirs` mode with two enabled coverage-guided browser
groups and no detailed group/paused-group block. Historical aggregate
duplicate/noise remains context; the live graph status comes from
current-output-dir duplicate share and current summary startup failures.

The duplicate/noise persona loop rejects both raw historical duplicate/noise as
a live health signal and an unqualified graph-only closure conclusion. The
latest duplicate/noise synthesis, `20260517T053845Z`, says the remaining
problem is root-wide analysis fan-out across sibling run directories, not the
current duplicate/startup graph. The `20260517T051517Z` feedback-action applied
the narrow no-product producer-side patch, validated syntax and one bounded
live-analysis pass, and restarted the coverage-guided control plane. The next
requested control-plane fix is a supervised-root semantic-family cap across
live, first-level, and deep analysis while preserving distinct product-evidence
failures, so this report treats the clean graph as current live status, not
accepted closure.

The PR-split persona loop rejects a filing-ready read and a broad/final-stack
fuzz read. The newest synthesis, `20260517T054316Z`, keeps the stack through
`PR15C-on-PR14B` but rejects stale tail filings: PR17/seed `1020002`, candidate
PR16, generic PR18/PR18x, wildcard final branches, raw deferred branches, and
validation-only heads are not product filing targets. Remaining pre-final gates
are PR07C browser replay, `1060015`, `7510029`, `045710` diagnostics, strict
`5200005` only if `a914c862c29e` is still live, adjacent-base validation
repair, current blocker scanning, and a fresh manifest before rebuilt combined
validation and final fuzz/filing. The latest feedback-action available in the
inputs is older than this synthesis and did not launch broad or final-stack
fuzz.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still concentrated in browser/e2e in the plotted mix snapshots, with
unit-property and coverage-guided-lower-level lanes active. The latest
level-mix persona synthesis rejects trusting that graph at face value: it says
browser/gap/protocol accounting is stale and must fail closed before capacity
tuning. Its feedback-action made the fail-closed accounting and parser
lower-level yield changes, while the native-harness action smoke-validated the
rich-text CRDT merge lower-level lane. The protocol-server action validated an
HTTP polling REST harness and tmux smoke, but the refreshed graph still has `0`
counted `protocol-server`, `backend-api`, and standalone `fuzz-assertion`
executions, so protocol-server remains an accounting or continuity gap in this
report. The latest execution bucket has about `300` browser/e2e, `187,824`
unit-property, and `26,624` coverage-guided-lower-level test executions/hour,
with `0` transport/integration in that bucket. The next narrow operational
checks are adding the root-wide analysis family cap, watching for fresh
duplicate/noise control-plane leakage, resolving protocol accounting/continuity,
continuing PR split gates, and rebuilding validation before any final-stack fuzz
or filing claim.
