# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-21T19:47:36Z`

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

The monitor data is current through `2026-05-21T19:31:58Z`, and the latest
current-run accounting row was sampled at `2026-05-21T19:32:54Z` after a
completed full pass at `2026-05-21T19:31:58Z`. The monitor has `3,857` passes
from `2026-05-15T01:21:42Z` onward. Cumulative coverage record observations are
`273,609`; current-scan coverage files are `443`. The monitor reports `40`
unmet live coverage items, while the parsed coverage-goal table has `71` unmet
target rows out of `137`.

Current-run duplicate/noise accounting is trusted for the active root. The
latest current-output-dir row is still `run-20260521T184706Z`, with
`current_run_metrics_trusted` `TRUE`, `pending_until_first_pass` `FALSE`,
`duplicateShareCurrent` `0`, summary startup failures `0`, current-run
signatures `0`, actionable signatures `0`, product-evidence signatures `0`, and
top duplicate share `0`. The latest monitor sample has `0` quality issues.
Historical duplicate share is `0.5` for context, but it is not the plotted live
health signal. Earlier rows still matter as evidence: the trusted `19:12:54Z`
and `19:20:56Z` rows had `duplicateShareCurrent` `1`, but only `1`
current/actionable signature, so those were one-signature samples rather than a
broad duplicate storm; the untrusted `run-20260521T183957Z` row remains
incomplete current-run accounting rather than product duplicate measurement.
The latest duplicate/noise synthesis rejects a pure triage-reporting
interpretation: it says producer groups can still bypass current-run duplicate
no-analysis pauses for product-evidence benchmark/canary work. That contradicts
the latest clean graph row only in timing; the graph says the current completed
pass is clean, while persona feedback says the control-plane bypass still needs
a narrow fix. The prior feedback-action applied the startup-noise control-plane
fix for no-product bootstrap stalls and restarted the active coverage-guided
sessions; older inactive sessions may still need their own restart cycle.

Resource state still needs watching. The latest sample has `372.5G` free memory,
`22.4GiB` free on `/`, and `605.7GiB` free on
`/media/volume/danluu-fuzz-data`. The latest CPU utilization sample is
`41.71%`. The latest load averages are `28.86`, `36.94`, and `39.76` on `64`
logical CPUs.

The latest graph-counted fuzzing mix has `24` browser/e2e lanes across `21`
groups, plus one `unit-property` lane, one `coverage-guided-lower-level` lane,
and one `protocol-server` lane. The execution counter has about `16.548M`
estimated individual executions. Lower-level execution counts are approximate
when they are reconstructed from batch metadata or legacy batch-count fields.
The graph-counted mix is now concentrated in browser/e2e lanes, including the
current coverage-guided, focused-shards, gap-booster, and strict-expansion
browser groups.
Current graph-counted lower-level work remains narrow:
`unit-property-table-query-array-crdt`,
`coverage-guided-lower-level-rich-text-crdt`, and
`protocol-server-http-polling` are active, while `transport-integration`,
`backend-api`, and standalone `fuzz-assertion` have no current lane. The latest
level-mix synthesis rejects treating those graph-counted rows as trusted useful
live capacity: it reported browser/e2e at `8` active lanes against the `24`-lane
floor, with lower-level volume overweighted, and recommended exactly one
admission-gated focused HTTP browser shard rather than generic lower-level
expansion. The newest level-mix feedback-action file is empty; the latest
non-empty action says the launcher handoff was fixed and a focused
`large-http-lifecycle` shard plus an HTTP polling-manager lower-level target
were added, but browser/e2e was still only `6` active lanes against the floor.
That feedback rejects the refreshed raw graph row count as sufficient evidence
of useful live capacity; capacity accounting still needs fail-closed live-lane
validation. Native-harness
synthesis recommends parser serialization as the first isolated V8
coverage-guided harness, and its action validated that harness in bounded smoke,
while the current graph-counted lower-level row remains rich-text CRDT.
Protocol-server synthesis still recommends HTTP polling REST as the first
protocol/server target; the latest protocol action validated HTTP polling REST
and event accounting with one seed, `22` cases, and `1,694` assertions.

The PR-focused data is live again. The controller table has `21` distinct work
items: `13` high-priority ready-product PR rows marked published, `5`
high-priority ready-product rows held by the controller, `1` runtime-gated row
consumed/held, and `2` deferred-family rows. The current push manifest is empty,
so the controller is not advertising any fresh branch-publish rows in this
snapshot. The critical-path executor has `6` blockers: `1` active reload
hydration blocker, `1` queued PR07C owner-matrix blocker, `1` runnable benchmark
canary blocker, and `3` terminal blockers.

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
`2026-05-21T19:31:58Z` with `duplicateShareCurrent` `0`, startup failures `0`,
current-run signatures `0`, actionable signatures `0`, product-evidence
signatures `0`, and top duplicate share `0`. The prior trusted high rows at
`19:12:54Z` and `19:20:56Z` had `duplicateShareCurrent` `1`, but each had only
`1` current/actionable signature, so they were one-signature current samples
rather than broad duplicate storms. The earlier trusted `0.3333` row had `3`
current/actionable signatures. The previous untrusted row,
`run-20260521T183957Z`, had current-output duplicate share `1` with no
current-run signature/actionable-signature denominator yet, so that row should
be read as incomplete accounting rather than duplicate measurement.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. The data volume is
around `82.9%` used and root is around `85.4%` used, so cleanup and output-size
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
concentrated in browser/e2e: `24` graph-counted browser/e2e lanes across `21`
groups, nominally meeting the `24` lane floor called out by persona feedback.
Lower-level work is active but narrow: `unit-property`,
`coverage-guided-lower-level`, and `protocol-server` each have one current
graph-counted lane. The current graph-counted lower-level targets are
table-query-array CRDT, rich-text CRDT, and HTTP polling protocol/server.
`transport-integration`, `backend-api`, and standalone `fuzz-assertion` have no
current graph-counted lane in this snapshot.

Persona-loop evidence rejects the simple interpretation that these graph-counted
rows equal trusted useful live capacity. The latest level-mix synthesis
diagnosed the effective mix as browser-light for the priority HTTP correctness
class, with browser/e2e at `8` active lanes against the `24` lane floor and
lower-level volume being overweighted. The newest feedback-action file is empty.
The latest non-empty feedback-action says the launcher/supervisor `wp-env`
config handoff was repaired, one focused `large-http-lifecycle` shard was added,
and browser/operator/focused/lower-level events reconciled, but browser/e2e was
still only `6` active lanes and below floor. That feedback should be read as
rejecting unvalidated capacity interpretation rather than rejecting that the raw
graph has `24` browser/e2e lanes. Duplicate/noise feedback points to the
same control-plane class: the latest synthesis says current-run product-evidence
duplicate/no-analysis producer bypasses still need a narrow hard block, while
the latest graph row is trusted and clean with zero current signatures.

Native-harness synthesis recommends parser serialization as the first isolated
V8 coverage-guided harness; rich-text CRDT should be second after
parser/serialization accounting is clean. Its action implemented and validated
the parser serialization harness in bounded smoke with nonzero V8 coverage, but
did not start an unbounded campaign. The current graph-counted coverage-guided
lower-level row remains rich-text CRDT even though level-mix feedback-action says
a fresh HTTP polling-manager lower-level root reached `864` executions. That
contradiction is evidence of lower-level accounting lag or collection scope
gaps, not proof that the raw graph fully captures useful lower-level work.
Protocol-server synthesis continues to select HTTP polling REST over the
WebSocket relay, and the latest action validated that target with one seed, `22`
cases, `1,694` assertions, and passing event-contract checks. Fuzz-only
assertion work is not graph-counted as active; the latest assertion action added
two gated assertions, while level-mix feedback says the fuzz-assertion loop
remains held/stale.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus generated
cases, coverage-guided inputs, and protocol/backend cases. Lower-level rows are
approximate when reconstructed from batch metadata or legacy batch-count fields.
The latest totals are approximately `40,072` browser/e2e, `5,617,920`
unit-property, `458,097` coverage-guided lower-level, and `10,432,020`
protocol-server executions. Transport-integration, backend-api, fuzz-assertion,
and other buckets are `0` in the current reconstructed table. The current
15-minute rate bucket has `16` browser/e2e executions, or about `64`
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
triaged likely-real output is still all browser/e2e: `177` likely-real findings
over about `776.7` runner-hours, or `22.79` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output is `1,644`
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
has `13`, full-profile rows and async/server blocks have `16` each, session
lifecycle has `42`, and persistence-no-title has `118`. This
argues for completion-depth repair in existing covered surfaces before adding
another broad surface class.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Largest current unmet goal gaps:

| Goal | Current | Target |
| --- | ---: | ---: |
| revision restore eligible | 134 | 500 |
| three-user late join | 115 | 300 |
| same-user two-tab mode | 28 | 150 |
| multi reload | 14 | 100 |
| successful real-user-editing records | 3 | 80 |
| successful parser-serialization records | 0 | 50 |
| successful multi-reload-lifecycle records | 0 | 50 |
| successful collaboration-ui-signals records | 0 | 25 |
| successful three-user late-join records | 0 | 25 |
| remote selection and cursor visible | 0 | 25 |
| successful media-cross-entity records | 1 | 25 |
| successful same-user tab documents | 2 | 25 |
| long session | 3 | 25 |
| local post recovery autosave | 3 | 25 |
| limited permission collaborator | 3 | 25 |
| remote and local autosave checkpoints | 3 | 25 |
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

The current push manifest is empty, so there are no graph-counted publishable
branch rows in this snapshot. Published and held branches are still visible in
the progress table. The latest PR-split persona feedback also rejects promoting
`PR16-RLH` as fileable: the ready prefix remains through `PR15C`, while
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
coverage-promotion blocker, one queued PR07C owner matrix blocker, one active
reload-hydration blocker, and three terminal blockers. Repeated no-progress
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

Current-run duplicate/noise is measurable for the active root, and the latest
trusted row is clean: `run-20260521T184706Z` completed a full pass at
`2026-05-21T19:31:58Z` with `duplicateShareCurrent` `0`, current summary startup
failures `0`, current-run signatures `0`, actionable signatures `0`, and top
duplicate share `0`. The earlier trusted rows with duplicate share `1` each had
only one current/actionable signature, so they were one-signature samples rather
than broad duplicate storms. The earlier untrusted root with duplicate share `1`
remains a control-plane/accounting completeness sample rather than a measured
duplicate storm. Persona feedback reinforces the control-plane framing: the
startup-noise producer leak was narrowed by same-profile cooldowns and
supervisor startup-noise classification, but the latest duplicate/noise
synthesis still rejects a pure reporting explanation and asks for a hard block
on current-run product-evidence duplicate/no-analysis producer bypasses.

The current fuzzing mix is browser/e2e-heavy by graph row count, with `24`
browser/e2e lanes plus one lane each for unit-property,
coverage-guided-lower-level, and protocol-server. Browser/e2e is still the only
level producing triaged likely-real findings in the committed triage-output
metric, while lower-level lanes produce broader candidate output but little
confirmed output. The current rate bucket shows `16` browser/e2e executions and
`22` protocol-server executions. Persona evidence rejects
treating those rows as trusted live capacity by themselves: the synthesis says
browser/e2e has only `8` active lanes against the floor, the newest
feedback-action file is empty, and the latest non-empty feedback-action after
repair reported only `6` active browser/e2e lanes. It also reports a fresh HTTP
polling-manager lower-level root that the graph has not counted yet. The native
harness action validated parser serialization in bounded smoke, but that work is
not yet visible as a current graph-counted lane. The next useful accounting
change is still fail-closed live-lane validation plus recovery of operator HTTP
correctness and browser lane count.

PR progress is visible again, but the controller is not currently advertising a
non-empty push manifest. The PR-split persona feedback keeps the fileable prefix
through `PR15C` and rejects `PR16-RLH` as fileable until strict seed `6000007`
reaches the final persistence oracle and owner rows prove it. Cycle 446 launched
one bounded repair job for that strict-head proof, but the report was still
pending in the copied evidence. The PR loop still needs to turn held
ready-product rows, the benchmark-canary blocker, the active reload-hydration
blocker, and the queued PR07C blocker into validated publishable branches rather
than just accumulating blocked or no-progress artifacts.
