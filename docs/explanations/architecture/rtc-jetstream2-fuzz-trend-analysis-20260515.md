# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-21T19:14:12Z`

This report summarizes the Jetstream2 RTC fuzzing, coverage-guidance, resource,
and PR-progress logs. The plotting data is generated with R, ggplot2, tidyverse
packages, and ColorBrewer palettes. The summarized CSVs and plots are committed
under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/);
raw inputs are copied into the refresh workspace for each run.

Source inputs include the coverage-guided run root, sysstat CPU/load samples,
the resource autoscaler disk samples, PR progress controller snapshots,
critical-path executor queues, artifact-index snapshots, and the latest copied
standard persona-loop outputs. The refreshed collector now copies
`raw/pr-focused/...` inputs instead of leaving PR-controller graphs to drift from
old local state.

## High-Level Readout

The monitor data is current through `2026-05-21T19:12:28Z`, and current-run
accounting through `2026-05-21T19:12:54Z`. The monitor has `3,841` passes from
`2026-05-15T01:21:42Z` onward. Cumulative coverage record observations are
`273,547`; current-scan coverage files are `382`. The monitor reports `40`
unmet live coverage items, while the parsed coverage-goal table has `71` unmet
target rows out of `137`.

Current-run duplicate/noise accounting is trusted for the active root. The
latest current-output-dir row is still `run-20260521T184706Z`, now completed at
`2026-05-21T19:12:28Z`, with `current_run_metrics_trusted` `TRUE`,
`pending_until_first_pass` `FALSE`, `duplicateShareCurrent` `1`, summary startup
failures `0`, current-run signatures `1`, actionable signatures `1`,
product-evidence signatures `1`, and top duplicate share `1`. That is a
one-signature denominator, not evidence of a broad duplicate storm. The latest
monitor sample has `0` quality issues. Historical duplicate share is `0.5` for
context, but it is not the plotted live health signal. Earlier rows still matter
as control-plane evidence: the trusted `2026-05-21T18:52:42Z` row had
`duplicateShareCurrent` `0.3333` with `3` current/actionable signatures, and
`run-20260521T183957Z` had current-output duplicate share `1` with an
unavailable signature denominator, so that row remains incomplete current-run
accounting rather than product duplicate measurement. The latest duplicate/noise
synthesis still frames strict no-product `pre_action_bootstrap_stall` as a
producer/control-plane admission problem. Its latest feedback-action file is
empty, so the latest non-empty action remains the bounded producer-side
quarantine; later level-mix feedback says the launcher/default-`wp-env-test`
handoff was repaired, but browser capacity is still below floor.

Resource state still needs watching. The latest sample has `372.0G` free memory,
`21.7GiB` free on `/`, and `658.9GiB` free on
`/media/volume/danluu-fuzz-data`. The latest CPU utilization sample is
`51.05%`. The latest load averages are `44.05`, `41.11`, and `37.58` on `64`
logical CPUs.

The latest graph-counted fuzzing mix has `21` browser/e2e lanes across `21`
groups, plus one `unit-property` lane, one `coverage-guided-lower-level` lane,
and one `protocol-server` lane. The execution counter has about `16.548M`
estimated individual executions. Lower-level execution counts are approximate
when they are reconstructed from batch metadata or legacy batch-count fields.
The graph-counted mix is now concentrated in browser/e2e lanes, including the
focused `large-http-lifecycle` shard and current coverage-guided browser groups.
Current graph-counted lower-level work remains narrow:
`unit-property-table-query-array-crdt`,
`coverage-guided-lower-level-rich-text-crdt`, and
`protocol-server-http-polling` are active, while `transport-integration`,
`backend-api`, and standalone `fuzz-assertion` have no current lane. The latest
level-mix synthesis rejects treating those graph-counted rows as trusted useful
live capacity: it reported browser/e2e at `7` active lanes against the `24`-lane
floor and said generic lower-level expansion is not the next useful move. Its
later feedback-action says the launcher handoff was fixed and regenerated
context reconciled browser/operator/focused/lower-level events, but browser/e2e
was still only `6` active lanes against the floor. That feedback conflicts with
the refreshed graph row count and should be treated as evidence that capacity
accounting still needs fail-closed live-lane validation. Native-harness
synthesis recommends parser serialization as the first isolated V8
coverage-guided harness, while the current graph-counted lower-level row remains
rich-text CRDT. Protocol-server feedback validated HTTP polling REST and event
accounting with one seed and `22` cases; level-mix feedback still says
backend/protocol live capacity is zero unless exact sessions are allocated.

The PR-focused data is live again. The controller table has `21` distinct work
items: `13` high-priority ready-product PR rows marked published, `5`
high-priority ready-product rows held by the controller, `1` runtime-gated row
consumed/held, and `2` deferred-family rows. The current push manifest is empty,
so the controller is not advertising any fresh branch-publish rows in this
snapshot. The critical-path executor has `6` blockers: `2` queued, `1`
runnable, and `3` terminal.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

The current coverage-file value is a current-scan count, not a cumulative total.
It can fall when the active output root changes or when a cleanup pass removes
old per-run files. Cumulative coverage record observations are the better
long-term intake signal.

## Health And Resources

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

![Current-run accounting completeness over time](rtc-jetstream2-fuzz-trends-20260515/plots/current-run-accounting-completeness.png)

The duplicate/noise graph uses current-output-dir accounting for live status.
When current-run accounting is pending, duplicate/noise should be read as a
control-plane completeness problem rather than a measured product duplicate
rate. Pending/incomplete accounting is tracked as its own health signal. The
latest sample is trusted for current-run duplicate/noise measurement:
`run-20260521T184706Z` completed another full pass at
`2026-05-21T19:12:28Z` with `duplicateShareCurrent` `1`, startup failures `0`,
current-run signatures `1`, actionable signatures `1`, product-evidence
signatures `1`, and top duplicate share `1`. Because the denominator is one
current/actionable signature, this is a one-signature current sample rather than
a broad duplicate storm. The prior trusted `0.3333` row had `3`
current/actionable signatures. The previous untrusted row,
`run-20260521T183957Z`, had current-output duplicate share `1` with no
current-run signature/actionable-signature denominator yet, so that row should
be read as incomplete accounting rather than duplicate measurement.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. The data volume is
around `81.4%` used and root is around `85.9%` used, so cleanup and output-size
budgeting still matter.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

Current coverage-guided groups cover HTTP title reload convergence, persistence
probes, and existing-post CRDT metadata. Historical enabled events cover
additional
real-user editing/rich-text/save-reload bridges, async-server-blocks bridges,
permissions/auth/locks, media cross-entity, same-user lifecycle, HTTP table
stale snapshots, block-gauntlet, revision/autosave/recovery, parser transform,
multi-reload lifecycle, and same-user surfaces.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector now reads recent and current `supervisor-groups.json` files
instead of scanning unbounded history. The latest graph-counted mix is
concentrated in browser/e2e at `21` of `24` lanes, below the `24` lane floor
called out by persona feedback. Lower-level work is active but narrow:
`unit-property`, `coverage-guided-lower-level`, and `protocol-server` each have
one current graph-counted lane. The current graph-counted lower-level targets
are table-query-array CRDT, rich-text CRDT, and HTTP polling protocol/server.
`transport-integration`, `backend-api`, and standalone `fuzz-assertion` have no
current graph-counted lane in this snapshot.

Persona-loop evidence rejects the simple interpretation that these graph-counted
rows equal trusted useful live capacity. The latest level-mix synthesis
diagnosed the effective mix as browser-light for the priority HTTP correctness
class, with browser/e2e at `7` active lanes against the `24` lane floor and
lower-level volume being overweighted. Its later feedback-action says the
launcher/supervisor `wp-env` config handoff was repaired, one focused
`large-http-lifecycle` shard was added, and browser/operator/focused/lower-level
events reconciled, but browser/e2e was still only `6` active lanes and below
floor. That feedback should be read as rejecting unvalidated capacity
interpretation rather than rejecting the raw graph row count. Duplicate/noise
feedback points to the same control-plane class: producer-side startup-noise
quarantine narrowed the leak, while current duplicate/noise accounting is
trusted but has a one-signature duplicate denominator in the latest row.

Native-harness synthesis recommends parser serialization as the first isolated
V8 coverage-guided harness; rich-text CRDT should be second after
parser/serialization accounting is clean. The current graph-counted
coverage-guided lower-level row remains rich-text CRDT even though level-mix
feedback-action says a fresh HTTP polling-manager lower-level root reached
`864` executions. That contradiction is evidence of lower-level accounting lag
or collection scope gaps, not proof that the raw graph fully captures useful
lower-level work. Protocol-server feedback validated HTTP polling REST with one
seed, `22` cases, `1,694` assertions, and passing event-contract checks, but
level-mix feedback still says the protocol row is execution evidence, not
trusted live capacity by itself. Fuzz-only assertion work is not graph-counted
as active; the latest assertion action added two gated assertions, while
level-mix feedback says the fuzz-assertion loop remains held/stale.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus generated
cases, coverage-guided inputs, and protocol/backend cases. Lower-level rows are
approximate when reconstructed from batch metadata or legacy batch-count fields.
The latest totals are approximately `39,997` browser/e2e, `5,617,920`
unit-property, `458,097` coverage-guided lower-level, and `10,431,998`
protocol-server executions. Transport-integration, backend-api, fuzz-assertion,
and other buckets are `0` in the current reconstructed table. The current
15-minute rate bucket has `43` browser/e2e executions, or about `172`
executions/hour. Protocol-server's current bucket has `22` cases, or about `88`
executions/hour.
Unit-property's latest nonzero bucket is
`2026-05-21T16:15:00Z` with `160` reconstructed executions, or about `640`
executions/hour; coverage-guided lower-level's latest graph-counted nonzero
bucket is `2026-05-21T11:00:00Z` with `2` executions, or about `8`
executions/hour. Level-mix feedback-action reports a fresher HTTP
polling-manager lower-level root at `864` executions, so the committed execution
CSV is not yet counting that lane.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `176` likely-real findings
over about `775.3` runner-hours, or `22.70` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output is `1,638`
browser/e2e candidates, `6` unit-property candidates, and `2`
coverage-guided-lower-level candidates. Transport-integration, backend-api,
protocol-server, standalone fuzz-assertion, and other buckets have no unique
candidates in the latest graph-counted data.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

Failure-candidate rates are pre-triage lead indicators, not confirmed bug
counts. They remain useful for spotting whether a lane is producing work worth
triaging before duplicate/noise filtering catches up.

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

The latest weak-completion profiles have successful record counts at zero in
the current sample: long-session large docs, permissions/auth/locks, table stale
snapshot HTTP, many-user lifecycle, common blocks, multi-reload lifecycle,
block-gauntlet, parser serialization, parser transform, three-user late join,
and collaboration UI signals. Media cross-entity has `1` successful record,
revision persistence and real-user editing have `3` each, large HTTP lifecycle
has `13`, session lifecycle has `19`, and async/server blocks has `16`. This
argues for completion-depth repair in existing covered surfaces before adding
another broad surface class.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Largest current unmet goal gaps:

| Goal | Current | Target |
| --- | ---: | ---: |
| revision restore eligible | 117 | 500 |
| three-user late join | 70 | 300 |
| same-user two-tab mode | 28 | 150 |
| multi reload | 14 | 100 |
| successful real-user-editing records | 3 | 80 |
| successful parser-serialization records | 0 | 50 |
| successful multi-reload-lifecycle records | 0 | 50 |
| successful two-user documents | 72 | 100 |
| remote selection and cursor visible | 0 | 25 |
| successful three-user late-join records | 0 | 25 |
| successful collaboration-ui-signals records | 0 | 25 |
| successful media-cross-entity records | 1 | 25 |
| successful same-user tab documents | 2 | 25 |
| remote and local autosave checkpoints | 3 | 25 |
| local post recovery autosave | 3 | 25 |
| auth/session expiry probe | 3 | 25 |

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

![Successful actions within weak-completion profiles](rtc-jetstream2-fuzz-trends-20260515/plots/successful-actions-by-profile.png)

These plots separate breadth from repeated observations and focus action
completion on weak profiles so high-volume successful lanes do not hide stalled
profiles.

## PR Review Loop

![PR split review loop events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-events.png)

![PR split loop duration by phase](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-durations.png)

![Suggested PR set net LOC over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-total-net-loc-over-time.png)

![Suggested PR net LOC by PR over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-net-loc-by-pr-over-time.png)

The parsed suggested-PR split history still has `457` snapshots. The latest
parsed proposed split totals `4,114` net LOC. These charts are size telemetry
from parsed status snapshots, not filing authority. The largest latest rows are
`PR 13B` at `1,668` net LOC, `PR 13A` at `1,126`, `PR 13C` at `294`, and
`PR 14` at `276`.

## PR-Focused Controller

![PR-focused controller current work state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-current-state.png)

![PR loop current queue depth](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-queue-depth-current.png)

The current controller state has `21` distinct work items. The most important
live queue entries are `5` high-priority ready-product PR rows held by the
controller, `13` published ready-product rows still under validation, `1`
runtime-gated row, `1` high-priority deferred-family product-decision row, and
`1` medium-priority deferred-family diagnostic row.

![PR-focused controller events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-controller-events.png)

![Controller-publishable PR branch diff sizes](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-publishable-diff-size.png)

The current push manifest has only a header row, so there are no graph-counted
publishable branch rows in this snapshot. Published and held branches are still
visible in the progress table. The latest PR-split persona feedback also rejects
promoting `PR16-RLH` as fileable: the ready prefix remains through `PR15C`, while
`RLH-6000007-candidate` is blocked pending strict seed `6000007` proof and owner
rows. Cycle 446 applied that split state and launched one bounded strict-head
repair job for `8fb598778357` / seed `6000007`; its report was still pending in
the copied persona evidence.

![PR artifact index scope by source tree](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-scope.png)

![PR artifact index refresh size](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-growth.png)

The artifact index has `3,291` current artifact rows across `23` root/kind
buckets.

![Critical PR blocker state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-critical-blocker-state.png)

![PR loop blocked control decisions](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-blocked-control-decisions.png)

![Repeated critical-path branch validation results](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-repeated-validation-results.png)

![Repeated critical-path no-progress artifacts](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-no-progress-artifacts.png)

The critical-path executor has `6` blockers: one runnable benchmark-canary
coverage-promotion blocker, two queued blockers for PR07C owner matrix and
reload hydration, and three terminal blockers. Repeated no-progress
artifacts are dominated by `benchmark-canary-fuzzer-gap/zero_executor_artifact`
with `65` rows, followed by PR17 and seed-reducer pre-oracle/preflight rows.

## Interpretation

The immediate graph-loop bug was in the updater, not in ggplot. There was no
durable local tmux refresh session, the collector could scan too much historical
state and stall, the R script failed on boolean-like string columns in fresh
CSV input, and the collector was accidentally dropping all supervisor group
paths. After those fixes, the collector also needed to copy PR-focused raw
inputs so PR queue, blocker, and artifact graphs update from current controller
state.

Current-run duplicate/noise is measurable for the active root, but the latest
sample is a one-signature duplicate denominator. `run-20260521T184706Z`
completed a full pass at `2026-05-21T19:12:28Z` with `duplicateShareCurrent`
`1`, current summary startup failures `0`, current-run signatures `1`,
actionable signatures `1`, product-evidence signatures `1`, and top duplicate
share `1`. The prior trusted `0.3333` row had three current/actionable
signatures, so its top family was one signature rather than a broad duplicate
storm. The earlier untrusted root with duplicate share `1` remains a
control-plane/accounting completeness sample rather than a measured duplicate
storm. Persona feedback reinforces the control-plane framing for startup noise:
the strict no-product startup-noise producer leak was narrowed, and the launcher
config handoff was later repaired.

The current fuzzing mix is browser/e2e-heavy by graph row count, with `21`
browser/e2e lanes plus one lane each for unit-property,
coverage-guided-lower-level, and protocol-server. Browser/e2e is still the only
level producing triaged likely-real findings in the committed triage-output
metric, while lower-level lanes produce broader candidate output but little
confirmed output. The current rate bucket shows `43` browser/e2e executions;
protocol-server's current bucket has `22` cases. Persona evidence rejects
treating those rows as trusted live capacity by themselves: the synthesis
says browser/e2e is still below floor, and the feedback-action after repair
reported only `6` active browser/e2e lanes against the `24`-lane floor. It also
reports a fresh HTTP polling-manager lower-level root that the graph has not
counted yet. The next useful accounting change is still fail-closed live-lane
validation plus recovery of operator HTTP correctness and browser lane count.

PR progress is visible again, but the controller is not currently advertising a
non-empty push manifest. The PR-split persona feedback keeps the fileable prefix
through `PR15C` and rejects `PR16-RLH` as fileable until strict seed `6000007`
reaches the final persistence oracle and owner rows prove it. Cycle 446 launched
one bounded repair job for that strict-head proof, but the report was still
pending in the copied evidence. The PR loop still needs to turn held
ready-product rows, the benchmark-canary blocker, and the queued reload-hydration
plus PR07C blockers into validated publishable branches rather than just
accumulating blocked or no-progress artifacts.
