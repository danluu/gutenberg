# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-17T06:41:32Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-17T06:22:09.349Z`,
  `lastUpdatedAt=2026-05-17T06:40:22.777Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15`, `/var/log/sysstat/sa16`, and `/var/log/sysstat/sa17`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1871` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-17T06:40:22Z`, coverage files grew from `272` to `41012`, a delta of
`40740`. The monitor's visible likely-real count reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `126` total goals and `5` unmet goals. The remaining
goals are real-user save/reload depth, action depth, and completed-record depth
for real-user editing.

The latest plotted current-output-dir duplicate/noise and startup sample is
mixed: `duplicateShareCurrent` is `1`, while current summary startup failures
are `0`. The same monitor pass has `0` quality issues, `0` warnings, a true
headroom flag, and `442.6G` free memory. This report treats
current-output-dir duplicate/noise and summary startup failure metrics as live
graph status; historical aggregate duplicate/noise is only context. The current
duplicate-share spike is from one current raw/product-evidence signature in a
sparse active root, not from the historical aggregate duplicate/noise series.

Persona-loop evidence still rejects a graph-only closure or broad-expansion
conclusion. The newest copied duplicate/noise synthesis,
`20260517T061907Z`, says this is primarily a control-plane state-scope problem:
empty, fallback, or paused current-run evidence can make duplicate/noise look
cleaner than it is, while repeated product-evidence families can still spend
analysis across generations. No matching feedback-action file is present for
that synthesis. The latest duplicate/noise feedback-action,
`20260517T054934Z`, patched the novelty monitor, restarted the control plane,
and reported no current raw, no-product, suppressed-startup, or product-evidence
signatures at `2026-05-17T06:15:28Z`. The refreshed graph at
`2026-05-17T06:40:22Z` now has one current raw/product-evidence signature and
`duplicateShareCurrent=1`, so the live status is current and sparse rather than
accepted closure.

The newest PR-split synthesis, `20260517T062723Z`, still rejects a filing-ready
or final-stack-fuzz interpretation. The `PR01` through `PR15C-on-PR14B` spine
remains usable, PR07C is accepted as a PR07B sidecar, PR17/seed `1020002` is
final-stack-only rather than product work, `5700084` is consumed as
PR05C-covered/oracle-equivalence downscope, and `a914c862c29e` remains the main
owner gate. The latest PR-split feedback-action, `20260517T061137Z`, applied the
Cycle 240 split-tail update, wrote fresh manifest and owner-comparison
artifacts, and deferred final-stack fuzz, rebuilt combined validation, and
filing until the residual gates are consumed.

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

The latest plotted current-output-dir sample has `duplicateShareCurrent=1` and
current summary startup failures of `0`. It also has `0` quality issues, `0`
warnings, `442.6G` free memory, and a true monitor headroom flag. The plot uses
`duplicateShareCurrent` and current summary startup failures for the live
health view; it does not use historical aggregate duplicate/noise as the plotted
live signal.

The copied novelty state reports `currentRunDirSource` as
`supervisor-active-run-dirs` and lists one enabled group:
`novelty-ws-real-user-rich-text`; the copied state does not list current
startup-noise pauses. The latest duplicate/noise synthesis rejects treating
clean-looking duplicate/startup signals as closure because current-run evidence
can be empty, fallback-based, or cleared by pause handling. The latest
feedback-action says the monitor-side no-product accounting patch is applied,
but the refreshed graph has one current product-evidence signature, so the live
status remains current and sparse rather than accepted closure.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-17T06:40:08Z` still show bursty CPU and
load pressure. The latest 25 CPU samples range from `37.5%` to `96.5%`
utilization, with the latest sample at `37.5%`. One-minute, five-minute, and
15-minute load all exceeded the logical CPU count in `14` of those `25`
sampled windows, and at least one of the three load windows exceeded it in
`20` of `25`. The latest sampled 1/5/15-minute load is `36.58`, `30.10`, and
`38.10` against `64` logical CPUs. Raw memory remains ample, and the latest
monitor headroom flag is true.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. The current copied novelty state is in `supervisor-active-run-dirs`
mode and has one enabled group: `novelty-ws-real-user-rich-text`.

The duplicate/noise persona loop is stricter than a graph-only read. Current
live graph status comes from `duplicateShareCurrent=1` and current summary
startup failures of `0`; historical raw `pre_action_bootstrap_stall` remains
context, not the plotted live signal. The latest duplicate/noise synthesis says
the residual problem is current-run state scope plus cross-generation
product-evidence duplicate-family churn. The latest duplicate/noise
feedback-action implemented the monitor-side no-product accounting patch, wrote
`preserveProductEvidence: true` sentinels for strict no-product startup stalls,
and restarted the coverage-guided control plane. It reported empty current
triage queues at `2026-05-17T06:15:28Z`, but the refreshed graph now has one
current product-evidence signature. The residual risk remains sparse-root and
family-cap accounting, not a historical aggregate duplicate/noise health signal.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the plot shows `26` browser/e2e lanes across `26` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane. The latest
browser/e2e lanes are `1` coverage-guided, `9` focused-shards, `6`
gap-booster, and `10` strict-expansion.

The graph says live fuzzing is still concentrated in browser/e2e lanes, with
lower-level activity in `unit-property` and one plotted
`coverage-guided-lower-level` lane. The latest level-mix synthesis and
feedback-action, `20260517T055918Z`, reject expanding capacity. The
feedback-action kept browser/protocol fuzzing running, kept the parser
coverage-guided lower-level lane, held the stale CRDT lower-level lane, and
restarted only the unit/property lane on a clean root. It also fixed
protocol/unit execution accounting, lower-level semantic key extraction, and
zero-lane status wording so backend/API and fuzz-assertion are `blocked` rather
than falsely `ok`. This report therefore treats the graph as a concentration
signal, not a reason to add browser, protocol, backend/API, or fuzz-assertion
lanes.

Lower-level targets are active through `unit-property` and
`coverage-guided-lower-level`; live fuzzing is still concentrated in
browser/e2e lanes. The native-harness persona loop labels the lower-level work
honestly as Node/Jest plus V8 coverage rather than AFL/libFuzzer. The latest
nonempty native-harness synthesis selected the rich-text CRDT merge harness as
the first isolated lower-level target and the parser/serialization harness
second; the latest action implemented and validated that harness. It started a
rich-text CRDT continuous lane, observed eight clean completion records, and
left the level-mix controller's hold in place after the controller found no
recent novelty; the level-mix feedback says the parser lower-level lane remains
active. `transport-integration` has historical activity but no current counted
rate. `protocol-server` now has a validated HTTP polling REST harness, event
accounting, direct smoke, launcher smoke, and storage regression evidence from
the latest action, but the refreshed graph still has `0` counted
`protocol-server` executions. `backend-api` and standalone `fuzz-assertion`
also remain at `0` counted graph activity. The latest fuzz-only assertion apply
added core-data hydration, query-array, and WebSocket diagnostic gates and
restarted affected browser loops, but this is browser/lower-level gate
hardening, not a separate counted `fuzz-assertion` lane in these graphs.

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

The latest collected execution data has about `3,959,396` completed test
executions: `98,579` browser/e2e, `3,006` transport/integration, `3,429,476`
unit-property, and `428,335` coverage-guided-lower-level. The latest
15-minute bucket reports about `92` browser/e2e test executions/hour,
`197,456` unit-property test executions/hour, `0`
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
`377` unique likely-real outputs over about `1,713.4` runner-hours, or `22.00`
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

Current unique bug-output candidate rates are: browser/e2e `4,548` candidates
over `1,713.4` runner-hours (`265.43` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `19.4` runner-hours
(`10.32` per 100 runner-hours), and unit/property `2` over `14.8` runner-hours
(`13.55` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
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
are about `4,655.8` for browser/e2e,
`4,537.5` for transport/integration, `820.3` for coverage-guided lower-level,
and `772.1` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

Within browser/e2e, the strongest profiles by likely-real triage output per 100
runner-hours are session lifecycle, permissions/auth/locks, three-user
late-join, persistence-no-title, and parser serialization. The broader
unique-output view ranks media-cross-entity, session lifecycle, multi-reload
lifecycle, block gauntlet, and parser serialization highest. Lower-level and
transport lanes should continue to be judged partly by the new unique-output
candidate graphs until their triage pipeline is producing comparable
likely-real and non-duplicate results.

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
| `multi-reload-lifecycle` | 3111 | 102 | 0 | 3.3% |
| `revision-persistence` | 4175 | 144 | 0 | 3.4% |
| `parser-serialization` | 3010 | 140 | 0 | 4.7% |
| `real-user-editing` | 6072 | 437 | 0 | 7.2% |
| `parser-transform` | 3970 | 389 | 0 | 9.8% |
| `common-blocks` | 3774 | 379 | 0 | 10.0% |
| `long-session-large-doc` | 2421 | 412 | 0 | 17.0% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 5886 | 1060 | 0 | 18.0% |
| `persistence-no-title` | 2913 | 567 | 0 | 19.5% |

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
| action ui-heading-shortcut next coverage tier | 757 | 1000 |
| action reload-post-action next coverage tier | 770 | 1000 |
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
took roughly `6.2` to `12.2` minutes in this snapshot; the latest completed
review, `20260517T062723Z`, took `10.2` minutes. The newest completed window
shows review cycle `20260517T060214Z` running from `2026-05-17T06:02:14Z` to
`2026-05-17T06:11:32Z`, review cycle `20260517T061137Z` running from
`2026-05-17T06:11:37Z` to `2026-05-17T06:20:03Z`, and review cycle
`20260517T062723Z` running from `2026-05-17T06:27:23Z` to
`2026-05-17T06:37:34Z`.

The newest PR-split synthesis, `20260517T062723Z`, says the split is still
blocked for filing and final-stack fuzz. It keeps the PR01 through
`PR15C-on-PR14B` spine, accepts PR07C as a PR07B sidecar, removes PR17/seed
`1020002` as product work, consumes `5700084` as
PR05C-covered/oracle-equivalence downscope, keeps `045710`/`055716`
diagnostic-only unless a newer nonempty report changes that, and keeps
`a914c862c29e`/seed `5200005` as the main unresolved owner gate. It also
rejects generic PR18x planning and says fresh strict/focused likely-real rows
are owner-triage inputs, not new PRs. The latest feedback-action,
`20260517T061137Z`, applied the Cycle 240 decisions, validated the manifest,
wrote nonempty reports for the manifest and owner-comparison jobs, and still
deferred final-stack fuzz, product-code edits, and any new `1020002` work.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-17T06:25:48Z`, has `23`
suggested rows totaling `10775` net LOC. The largest current rows by net LOC
are `PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`),
and `PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, visible likely-real failures reached
`4`, and unmet goals are down from the initial `24` to `5`. Live health is
mixed on the current-output-dir duplicate/noise and startup metrics: the latest
plotted sample has `duplicateShareCurrent=1` and current summary startup
failures of `0`. The same sample has `0` quality issues, `0` warnings, a true
headroom flag, and `442.6G` free memory. The copied novelty state is in
`supervisor-active-run-dirs` mode with one enabled coverage-guided browser
group and no listed startup-noise pauses. Historical aggregate duplicate/noise
remains context; the live graph status comes from current-output-dir duplicate
share and current summary startup failures.

The duplicate/noise persona loop rejects both raw historical duplicate/noise as
a live health signal and an unqualified graph-only closure conclusion. The
newest copied duplicate/noise synthesis file, `20260517T061907Z`, says the
remaining problem is control-plane state scope plus cross-generation
product-evidence duplicate-family churn. The latest feedback-action,
`20260517T054934Z`, applied the monitor-side no-product fix, validated syntax,
restarted the coverage-guided control plane, and reported empty current triage
queues at `2026-05-17T06:15:28Z`. Because the refreshed graph now has one
current product-evidence signature and the active root is young, this report
treats the graph as current live status, not accepted closure.

The PR-split persona loop rejects a filing-ready read and a broad/final-stack
fuzz read. The newest synthesis, `20260517T062723Z`, keeps the stack through
`PR15C-on-PR14B`, accepts PR07C as a sidecar, removes PR17/seed `1020002` as
product work, consumes `5700084`, and leaves `a914c862c29e` as the main owner
gate before refreshed validation. The latest completed feedback-action applied
the earlier split-tail update, validated the refreshed manifest, and completed
only bounded repair/owner-comparison work, not broad or final-stack fuzz.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still concentrated in browser/e2e in the plotted mix snapshots, with
unit-property and coverage-guided-lower-level lanes active. The latest
level-mix persona feedback rejects capacity expansion: it fixed accounting,
held stale CRDT lower-level work, kept the parser lower-level lane, and
restarted only the unit/property lane. The native-harness action smoke-validated
the rich-text CRDT merge lower-level lane, then left the level-mix hold in
place after eight clean completion records. The protocol-server action
validated an HTTP polling REST harness with direct smoke, launcher smoke, and a
storage regression, but the refreshed graph still has `0` counted
`protocol-server`, `backend-api`, and standalone `fuzz-assertion` executions.
Protocol-server therefore remains an accounting or continuity gap in this
report. The latest execution bucket has about `92` browser/e2e and `197,456`
unit-property test executions/hour, with `0` coverage-guided-lower-level and
`0` transport/integration in that bucket. The next narrow operational checks
are watching the patched duplicate/noise monitor on a less sparse root,
maintaining the corrected level-mix view, resolving protocol
accounting/continuity, continuing PR split gates, and rebuilding validation
before any final-stack fuzz or filing claim.
