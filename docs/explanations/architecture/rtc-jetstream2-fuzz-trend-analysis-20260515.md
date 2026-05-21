# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-21T21:17:00Z`

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

The monitor data is current through `2026-05-21T21:06:48Z`, and the latest
current-run accounting row was sampled at `2026-05-21T21:10:50Z` for
`run-20260521T205928Z` after a completed full pass. The monitor has `3,885`
passes from `2026-05-15T01:21:42Z` onward. Cumulative coverage record
observations are `273,985`; current-scan coverage files are `824`. The monitor
reports `40` unmet live coverage items, while the parsed coverage-goal table has
`51` unmet target rows out of `136`.

Current-run duplicate/noise accounting is trusted for the newest active root:
`current_run_metrics_trusted` is `TRUE` and `pending_until_first_pass` is
`FALSE`. The latest completed monitor pass reports `duplicateShareCurrent` `1`
and summary startup failures `0`; the current-run denominator is one signature,
one actionable signature, and one product-evidence signature, with top duplicate
share `1`. Treat the high duplicate share as a one-signature current-run sample,
not a broad duplicate storm. Historical duplicate share is `0.3333` for context
only; it is not the plotted live health signal. The immediately preceding
`21:02:50Z` row for the same root was still pending its first full pass, so the
accounting-completeness health signal remains useful during root rollover. The
latest duplicate/noise synthesis rejects a pure triage-reporting interpretation
and identifies producer admission for no-product startup holds as the
control-plane leak. The latest feedback action patched the supervisor
startup-noise bypass, then reported current-root gate-only triage with current
family `assertion`, top duplicate family share `0`, strict startup suppressed
records `0`, and no `pre_action_bootstrap_stall` state references; that feedback
therefore rejects interpreting the refreshed high duplicate-share row as a
startup-noise storm.

Resource state still needs watching. The latest sample has `422.3G` free memory,
`92.8GiB` free on `/`, and `558.8GiB` free on
`/media/volume/danluu-fuzz-data`. The latest CPU utilization sample is `66.22%`.
The latest load averages are `52.96`, `52.98`, and `51.81` on `64` logical CPUs,
so load remains under core count while the system is still busy.

The latest graph-counted fuzzing mix has `25` browser/e2e lanes across `25`
groups, plus one `unit-property` lane, one `coverage-guided-lower-level` lane,
and one `protocol-server` lane. The execution counter has about `16.549M`
estimated individual executions. Lower-level execution counts are approximate
when they are reconstructed from batch metadata or legacy batch-count fields.
The graph-counted mix is concentrated in browser/e2e lanes, including current
coverage-guided, focused-shards, gap-booster, and strict-expansion browser
groups. Current graph-counted lower-level work remains narrow:
`unit-property-table-query-array-crdt`,
`coverage-guided-lower-level-rich-text-crdt`, and
`protocol-server-http-polling` are active, while `transport-integration`,
`backend-api`, and standalone `fuzz-assertion` have no current lane. The latest
level-mix persona feedback rejects treating raw graph rows as trusted useful
capacity: it says the live context was browser-light, with `browser-e2e=8`
against a `24` lane floor and PID-backed evidence closer to `7`, and that stale
roots, dead PIDs, missing artifacts, and root rollover must fail closed. The
feedback recommends recovering targeted HTTP browser correctness first, keeping
HTTP polling-manager as a one-lane lower-level sentinel, and not expanding
generic lower-level work now. The refreshed graph's `25` browser/e2e rows
therefore do not prove sufficient useful live capacity by themselves. The graph
still shows the current coverage-guided lower-level row as rich-text CRDT, so
the HTTP polling-manager restart remains persona evidence to reconcile, not
graph-counted sustained capacity. Native-harness synthesis recommends parser
serialization as the first isolated V8 coverage-guided harness; the latest
native action file is empty, and the latest non-empty native action validated
parser serialization in bounded smoke without starting an unbounded held parser
campaign. The latest protocol synthesis selects HTTP polling REST as the ready
v1 protocol/server harness; the latest protocol action implemented collection
history/compaction cases and validated the harness with one seed, `25` cases,
and `2,469` preflight assertions.

The PR-focused data is live again. The controller table has `21` distinct work
items: `13` high-priority ready-product PR rows marked published, `5`
high-priority ready-product rows held by the controller, `1` runtime-gated row
consumed/held, and `2` deferred-family rows. The current push manifest is empty,
so the controller is not advertising any fresh branch-publish rows in this
snapshot. The critical-path executor has `6` blockers: `1` runnable
benchmark-canary blocker, `1` active reload-hydration blocker, `1` queued
`PR07C` owner-matrix blocker, and `3` terminal blockers.

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
latest sample for `run-20260521T205928Z` is trusted: it was sampled at
`2026-05-21T21:10:50Z` with `current_run_metrics_trusted` `TRUE` and
`pending_until_first_pass` `FALSE`. Its latest completed monitor-pass values
are `duplicateShareCurrent` `1` and summary startup failures `0`, but that high
duplicate share has a one-signature denominator: one current-run signature, one
actionable signature, one product-evidence signature, and top duplicate share
`1`. The immediately preceding `21:02:50Z` sample for the same root was
incomplete with the first full pass still pending. The latest persona action
also reports current-root gate-only triage with top duplicate family share `0`
and no startup-stall state, so it rejects interpreting this graph row as a broad
startup-noise duplicate storm.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. The data volume is
around `84.2%` used and root is around `39.7%` used. Root pressure remains
stable, but output-size budgeting still matters on the data volume.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

Current coverage-guided groups cover WS parser serialization, WS multi-reload
lifecycle, thirty-user and many-user lifecycle variants, collaboration UI
signals, HTTP title reload convergence, and HTTP large-post lifecycle.
Historical enabled events cover additional real-user editing/rich-text/save-reload
bridges, async-server-blocks bridges, permissions/auth/locks, media cross-entity,
same-user lifecycle, HTTP table stale snapshots, block-gauntlet,
revision/autosave/recovery, parser transform, and same-user surfaces.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector now reads recent and current `supervisor-groups.json` files
instead of scanning unbounded history. The latest graph-counted mix is
concentrated in browser/e2e: `25` graph-counted browser/e2e lanes across `25`
groups, nominally exceeding the `24` lane floor called out by persona feedback.
Lower-level work is active but narrow: `unit-property`,
`coverage-guided-lower-level`, and `protocol-server` each have one current
graph-counted lane. The current graph-counted lower-level targets are
table-query-array CRDT, rich-text CRDT, and HTTP polling protocol/server.
`transport-integration`, `backend-api`, and standalone `fuzz-assertion` have no
current graph-counted lane in this snapshot. Level-mix synthesis still treats
backend/API and fuzz-assertion as zero useful lanes until they have fresh
process and event evidence, and it treats protocol/server as a validated smoke
plus graph row rather than fully proven sustained live capacity.

Persona-loop evidence rejects the simple interpretation that graph-counted rows
equal trusted useful live capacity. The latest level-mix feedback says the
effective active mix was browser-light for the active HTTP correctness
regression, with `browser-e2e=8` against a `24` lane floor and live PID evidence
closer to `7`. It also says stale roots, dead PIDs, missing artifacts, and root
rollover make raw supervisor rows suspect. It recommends repairing the
coverage-guided watchdog and exact operator-correctness browser sessions first,
then adding at most one admitted `large-http-lifecycle` focused shard if needed;
the refreshed graph now includes one `focused-large-http-lifecycle` row.
It explicitly rejects expanding generic lower-level capacity now and keeps HTTP
polling-manager as a one-lane lower-level sentinel. The refreshed graph's `25`
browser/e2e rows therefore do not prove sufficient useful live capacity by
themselves. Duplicate/noise feedback points to the same control-plane class: the
latest synthesis says no-product startup holds leaked through producer
admission before supervisor enforcement; the newest active root is now trusted
but has a one-signature high duplicate-share row, and the latest feedback action
reports no current startup-stall state.

Native-harness synthesis recommends parser serialization as the first isolated
V8 coverage-guided harness; rich-text CRDT should be second after
parser/serialization accounting is clean. The latest native action file is
empty; the latest non-empty native action implemented and validated the
parser-serialization harness in bounded smoke with nonzero V8 coverage, but did
not start an unbounded campaign because the production parser lane is held. The
current graph-counted coverage-guided lower-level row remains rich-text CRDT, so
parser serialization is validated by persona evidence but not active as a
current graph-counted lane.
The latest protocol synthesis selects HTTP polling REST over the WebSocket/Yjs
relay as the ready v1 protocol/server harness, and the latest protocol action
implemented collection-history and compaction cases. The bounded smoke
validated one seed, `25` cases, `2,469` preflight assertions, populated
root/lane `events.ndjson`, and a `protocol-server` supervisor row.
Fuzz-only assertion work is not graph-counted as active; the latest assertion
action added two gated assertions, while level-mix feedback says the
fuzz-assertion loop remains held/stale. The latest level-mix feedback keeps HTTP
polling-manager as sentinel lower-level evidence, but the refreshed graph still
shows rich-text CRDT as the current coverage-guided lower-level row, so this is
evidence to reconcile rather than current graph-counted capacity.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus generated
cases, coverage-guided inputs, and protocol/backend cases. Lower-level rows are
approximate when reconstructed from batch metadata or legacy batch-count fields.
The latest totals are approximately `40,601` browser/e2e, `5,617,920`
unit-property, `458,097` coverage-guided lower-level, and `10,432,329`
protocol-server executions. Transport-integration, backend-api, fuzz-assertion,
and other buckets are `0` in the current reconstructed table. The current
15-minute rate bucket has `91` browser/e2e executions, or about `364`
executions/hour. Protocol-server's latest nonzero bucket is
`2026-05-21T21:00:00Z` with `265` cases, or about `1,060` executions/hour.
Unit-property's latest nonzero bucket is
`2026-05-21T16:15:00Z` with `160` reconstructed executions, or about `640`
executions/hour; coverage-guided lower-level's latest graph-counted nonzero
bucket is `2026-05-21T11:00:00Z` with `2` executions, or about `8`
executions/hour. Lower-level counts remain approximate when reconstructed from
batch metadata or legacy batch-count fields.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `183` likely-real findings
over about `787.0` runner-hours, or `23.25` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output is `1,747`
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
the current sample: collaboration UI signals, parser transform, parser
serialization, block-gauntlet, common blocks, many-user lifecycle, and table
stale snapshot HTTP. Multi-reload lifecycle and media cross-entity each have
`1` successful record, three-user late join has `2`, revision persistence has
`4`, large HTTP lifecycle has `14`, full-profile rows have `16`, long-session
large docs have `24`, permissions/auth/locks have `29`, real-user editing has
`36`, async/server blocks have `47`, session lifecycle has `95`, and
persistence-no-title has `162`. This
argues for completion-depth repair in existing covered surfaces before adding
another broad surface class.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Largest current unmet goal gaps:

| Goal | Current | Target |
| --- | ---: | ---: |
| revision restore eligible | 270 | 500 |
| same-user two-tab mode | 57 | 150 |
| multi reload | 24 | 100 |
| three-user late join | 232 | 300 |
| successful parser-serialization records | 0 | 50 |
| successful multi-reload-lifecycle records | 1 | 50 |
| successful real-user-editing records | 36 | 80 |
| successful collaboration-ui-signals records | 0 | 25 |
| remote selection and cursor visible | 1 | 25 |
| successful media-cross-entity records | 1 | 25 |
| successful three-user late-join records | 2 | 25 |
| async/server block core/template-part | 0 | 20 |
| remote and local autosave checkpoints | 5 | 25 |
| local post recovery autosave | 5 | 25 |
| gauntlet block core/details | 3 | 20 |
| gauntlet block core/more | 3 | 20 |
| gauntlet block core/file | 4 | 20 |
| gauntlet block core/gallery | 4 | 20 |
| gauntlet block core/shortcode | 4 | 20 |
| gauntlet block core/media-text | 5 | 20 |

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
coverage-promotion blocker, one active reload-hydration blocker, one queued
`PR07C` owner-matrix blocker, and three terminal blockers. Repeated no-progress
artifacts are dominated by `benchmark-canary-fuzzer-gap/zero_executor_artifact`
with `68` rows, followed by PR17 and seed-reducer pre-oracle/preflight rows.

## Interpretation

The immediate graph-loop bug was in the updater, not in ggplot. There was no
durable local tmux refresh session, the collector could scan too much historical
state and stall, the R script failed on boolean-like string columns in fresh
CSV input, and the collector was accidentally dropping all supervisor group
paths. After those fixes, the collector also needed to copy PR-focused raw
inputs so PR queue, blocker, and artifact graphs update from current controller
state.

Current-run duplicate/noise is measurable again for the newest active root:
`run-20260521T205928Z` has `current_run_metrics_trusted` `TRUE` and
`pending_until_first_pass` `FALSE` at `21:10:50Z`. The graph shows
`duplicateShareCurrent` `1` and summary startup failures `0`, but the denominator
is only one current-run signature, one actionable signature, and one
product-evidence signature. That high row is a narrow sample, not evidence of a
broad duplicate storm. The immediately preceding `21:02:50Z` row for the same
root was incomplete while the first full pass was still pending, which is why
pending accounting remains its own health signal. Persona feedback reinforces
the control-plane framing: the latest duplicate/noise synthesis rejects a pure
reporting explanation and identifies no-product startup-hold producer admission
as the control-plane failure mode. The latest duplicate/noise feedback action
patched the supervisor startup-noise bypass and reports current-root gate-only
triage with current family `assertion`, top duplicate family share `0`, no
strict startup suppression, and no `pre_action_bootstrap_stall` state; that
feedback rejects interpreting the refreshed graph row as a current startup-noise
storm.

The current fuzzing mix is browser/e2e-heavy by graph row count, with `25`
browser/e2e lanes plus one lane each for unit-property,
coverage-guided-lower-level, and protocol-server. Browser/e2e is still the only
level producing triaged likely-real findings in the committed triage-output
metric, while lower-level lanes produce broader candidate output but little
confirmed output. The latest rate bucket shows `91` browser/e2e executions, or
`364` executions/hour, and `265` protocol-server cases, or `1,060`
executions/hour. Persona evidence rejects treating those rows as trusted live
capacity by themselves: the latest level-mix feedback says the live browser
signal was `8` lanes, with PID-backed evidence closer to `7`, against a `24`
lane floor. It recommends recovering targeted HTTP browser correctness first
and explicitly rejects expanding generic lower-level capacity now; the refreshed
graph now has one focused `large-http-lifecycle` row, but raw supervisor rows
still do not prove useful live capacity. The refreshed graph also still shows
rich-text CRDT, not HTTP polling-manager or parser serialization, as the current
coverage-guided lower-level row. The latest native action file is empty; the
latest non-empty native action validates parser serialization in bounded smoke,
but the production parser lane is held and is not yet visible as a current
graph-counted lane. The latest protocol action has advanced from smoke-only
guidance to implementation: HTTP polling REST now has collection-history cases,
`caseIndex` accounting, populated root/lane events, and a one-lane graph row.
The next useful accounting change is still fail-closed live-lane validation plus
recovery of Docker, resource autoscaling, and browser HTTP correctness capacity.

PR progress is visible again, but the controller is not currently advertising a
non-empty push manifest. The PR-split persona feedback keeps the fileable prefix
through `PR15C` and rejects `PR16-RLH` as fileable until strict seed `6000007`
reaches the final persistence oracle and owner rows prove it. Cycle 446 launched
one bounded repair job for that strict-head proof, but the report was still
pending in the copied evidence. The PR loop still needs to turn held
ready-product rows, the benchmark-canary blocker, the active reload-hydration
blocker, and the queued PR07C blocker into validated publishable branches rather
than just accumulating blocked or no-progress artifacts.
