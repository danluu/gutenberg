# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-21T20:50:46Z`

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

The monitor data is current through `2026-05-21T20:41:15Z`, and the latest
current-run accounting row was sampled at `2026-05-21T20:48:23Z` for
`run-20260521T204514Z` while its first full pass was still pending. The monitor
has `3,883` passes from `2026-05-15T01:21:42Z` onward. Cumulative coverage record
observations are `273,901`; current-scan coverage files are `721`. The monitor
reports `40` unmet live coverage items, while the parsed coverage-goal table has
`52` unmet target rows out of `136`.

Current-run duplicate/noise accounting is incomplete for the newest active root:
`current_run_metrics_trusted` is `FALSE`, `pending_until_first_pass` is `TRUE`,
and the current-run signature/actionable-signature denominators are not yet
available. The latest completed monitor sample still reports
`duplicateShareCurrent` `0`, summary startup failures `0`, and `0` quality
issues, but that is not a trusted current-run duplicate/noise measurement for
the new root until a full pass completes. Historical duplicate share is `0.2222`
for context only; it is not the plotted live health signal. The last trusted
completed accounting row, `run-20260521T202349Z` at `20:28:02Z`, had
`duplicateShareCurrent` `0`, startup failures `0`, current-run signatures `0`,
actionable signatures `0`, product-evidence signatures `0`, and top duplicate
share `0`. The prior trusted `20:11:53Z` spike had duplicate share `1` with one
current-run signature, one actionable signature, and one product-evidence
signature, so it was a one-signature sample rather than a broad duplicate storm.
The latest duplicate/noise synthesis rejects a pure triage-reporting
interpretation and identifies producer admission for no-product startup holds as
the control-plane leak. The newest duplicate/noise feedback-action file is
empty; the latest non-empty feedback action patched supervisor/novelty bypasses
and reported early clean checks, while the newest graph row is again pending
accounting after root rollover.

Resource state still needs watching. The latest sample has `424.1G` free memory,
`92.9GiB` free on `/`, and `585.3GiB` free on
`/media/volume/danluu-fuzz-data`. The latest CPU utilization sample is `65.73%`.
The latest load averages are `48.22`, `53.63`, and `52.65` on `64` logical CPUs,
so one-minute load is under core count while the longer windows still show
backlog.

The latest graph-counted fuzzing mix has `28` browser/e2e lanes across `28`
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
level-mix synthesis rejects treating raw graph rows as trusted useful capacity:
it says the binding live signal was still browser-light and that stale roots,
dead PIDs, missing artifacts, and root rollover must fail closed. The latest
level-mix feedback action started one focused `large-http-lifecycle` browser
shard and restarted HTTP polling-manager lower-level work, but it reported
regenerated context with only `16` active browser/e2e lanes against a `24` lane
floor. The refreshed graph now shows `28` browser/e2e rows, but persona-loop
feedback rejects using that count alone as proof of useful live capacity. The
graph still shows the current coverage-guided lower-level row as rich-text CRDT,
so the HTTP polling-manager restart remains persona evidence to reconcile, not
graph-counted sustained capacity. Native-harness synthesis recommends parser
serialization as the first isolated V8 coverage-guided harness; the latest
native action file is empty, and the latest non-empty native action validated
parser serialization in bounded smoke without starting an unbounded held parser
campaign. The latest protocol synthesis file is empty; the latest non-empty
synthesis selected HTTP polling REST, and the latest protocol action validated it
with one seed, `22` cases, and `1,694` assertions.

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
latest sample is not trusted for current-run duplicate/noise measurement:
`run-20260521T204514Z` was sampled at `2026-05-21T20:48:23Z` with
`current_run_metrics_trusted` `FALSE` and `pending_until_first_pass` `TRUE`.
The completed monitor pass at `2026-05-21T20:41:15Z` reports
`duplicateShareCurrent` `0` and summary startup failures `0`, but current-run
signatures, actionable signatures, product-evidence signatures, and top
duplicate share are unavailable until the active root finishes a full pass. The
latest trusted completed row is still `run-20260521T202349Z` at
`2026-05-21T20:28:02Z`, with `duplicateShareCurrent` `0`, startup failures `0`,
current-run signatures `0`, actionable signatures `0`, product-evidence
signatures `0`, and top duplicate share `0`. The prior trusted `20:11:53Z` row
had duplicate share `1` with one current-run signature and one actionable
signature, so that earlier high row was a one-signature current sample rather
than a broad duplicate storm.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. The data volume is
around `83.5%` used and root is around `39.6%` used. Root pressure remains
stable, but output-size budgeting still matters on the data volume.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

Current coverage-guided groups cover WS parser serialization, WS multi-reload
lifecycle, thirty-user and many-user lifecycle variants, collaboration UI
signals, and HTTP title reload convergence. Historical enabled events cover
additional real-user editing/rich-text/save-reload bridges, async-server-blocks
bridges, permissions/auth/locks, media cross-entity, same-user lifecycle, HTTP
table stale snapshots, block-gauntlet, revision/autosave/recovery, parser
transform, large-post HTTP lifecycle, and same-user surfaces.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector now reads recent and current `supervisor-groups.json` files
instead of scanning unbounded history. The latest graph-counted mix is
concentrated in browser/e2e: `28` graph-counted browser/e2e lanes across `28`
groups, nominally exceeding the `24` lane floor called out by earlier persona
feedback.
Lower-level work is active but narrow: `unit-property`,
`coverage-guided-lower-level`, and `protocol-server` each have one current
graph-counted lane. The current graph-counted lower-level targets are
table-query-array CRDT, rich-text CRDT, and HTTP polling protocol/server.
`transport-integration`, `backend-api`, and standalone `fuzz-assertion` have no
current graph-counted lane in this snapshot. Level-mix synthesis still treats
backend/API and fuzz-assertion as zero useful lanes until they have fresh
process and event evidence, and it treats protocol/server as a validated smoke
plus graph row rather than sustained live capacity.

Persona-loop evidence rejects the simple interpretation that these graph-counted
rows equal trusted useful live capacity. The latest level-mix synthesis says the
effective active mix was still browser-light for the active HTTP
operator-correctness alert, with stale roots, dead PIDs, missing artifacts, and
root rollover making raw supervisor rows suspect. It recommends fail-closed lane
accounting, recovering operator HTTP first, and adding at most one admitted
`large-http-lifecycle` focused shard if needed. The latest feedback-action
applied that direction by starting one focused `large-http-lifecycle` browser
shard and restarting HTTP polling-manager lower-level work. That action still
reported regenerated context with `16` active browser/e2e lanes against a `24`
lane floor, so it rejects the interpretation that the raw graph's `28`
browser/e2e rows prove sufficient useful live capacity.
Duplicate/noise feedback points to the same control-plane class: the latest
synthesis says no-product startup holds leaked through producer admission
before supervisor enforcement, while the latest active root has pending
accounting rather than a trusted duplicate/noise denominator.

Native-harness synthesis recommends parser serialization as the first isolated
V8 coverage-guided harness; rich-text CRDT should be second after
parser/serialization accounting is clean. The latest native action file is
empty; the latest non-empty native action implemented and validated the
parser-serialization harness in bounded smoke with nonzero V8 coverage, but did
not start an unbounded campaign because the production parser lane is held. The
current graph-counted coverage-guided lower-level row remains rich-text CRDT, so
parser serialization is validated by persona evidence but not active as a
current graph-counted lane.
The latest protocol synthesis file is empty; the latest non-empty protocol
synthesis selected HTTP polling REST over the WebSocket relay, and the latest
protocol action validated that target with one seed, `22` cases, `1,694`
assertions, and passing event-contract checks. Fuzz-only assertion work is not
graph-counted as active; the latest assertion action added two gated assertions,
while level-mix feedback says the fuzz-assertion loop remains held/stale. The
latest level-mix feedback says the restarted HTTP polling-manager lower-level
lane emitted new signal, but the refreshed graph still shows rich-text CRDT as
the current coverage-guided lower-level row, so this is evidence to reconcile
rather than current graph-counted capacity.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus generated
cases, coverage-guided inputs, and protocol/backend cases. Lower-level rows are
approximate when reconstructed from batch metadata or legacy batch-count fields.
The latest totals are approximately `40,430` browser/e2e, `5,617,920`
unit-property, `458,097` coverage-guided lower-level, and `10,432,064`
protocol-server executions. Transport-integration, backend-api, fuzz-assertion,
and other buckets are `0` in the current reconstructed table. The current
15-minute rate bucket has `20` browser/e2e executions, or about `80`
executions/hour. Protocol-server's latest nonzero bucket is
`2026-05-21T20:15:00Z` with `22` cases, or about `88` executions/hour.
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
triaged likely-real output is still all browser/e2e: `181` likely-real findings
over about `783.3` runner-hours, or `23.11` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output is `1,716`
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
serialization, block-gauntlet, multi-reload lifecycle, common blocks,
many-user lifecycle, and table stale snapshot HTTP. Media cross-entity has `1`
successful record, three-user late join has `2`, revision persistence has `4`,
real-user editing and large HTTP lifecycle each have `14`, long-session large
docs have `14`, full-profile rows have `16`, permissions/auth/locks have `29`,
async/server blocks have `47`, session lifecycle has `82`, and
persistence-no-title has `155`. This
argues for completion-depth repair in existing covered surfaces before adding
another broad surface class.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Largest current unmet goal gaps:

| Goal | Current | Target |
| --- | ---: | ---: |
| revision restore eligible | 236 | 500 |
| three-user late join | 200 | 300 |
| same-user two-tab mode | 55 | 150 |
| multi reload | 22 | 100 |
| successful real-user-editing records | 14 | 80 |
| successful parser-serialization records | 0 | 50 |
| successful multi-reload-lifecycle records | 0 | 50 |
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

Current-run duplicate/noise is not yet measurable for the newest active root:
`run-20260521T204514Z` has `current_run_metrics_trusted` `FALSE` and
`pending_until_first_pass` `TRUE`. The latest completed monitor sample reports
`duplicateShareCurrent` `0` and summary startup failures `0`, but the current-run
signature/actionable-signature denominator is unavailable until the active root
completes a full pass. The last trusted row remains clean:
`run-20260521T202349Z` completed a full pass at `2026-05-21T20:27:57Z` and the
`20:28:02Z` accounting row has `duplicateShareCurrent` `0`, current summary
startup failures `0`, current-run signatures `0`, actionable signatures `0`,
product-evidence signatures `0`, and top duplicate share `0`. The prior
`20:11:53Z` duplicate-share `1` row had a one-signature current/actionable
denominator, so it was a narrow sample rather than a broad duplicate storm.
Persona feedback reinforces the control-plane framing: the latest duplicate/noise
synthesis rejects a pure reporting explanation and identifies no-product
startup-hold producer admission as the control-plane failure mode. The latest
duplicate/noise feedback-action file is empty; the latest non-empty action says
the supervisor/novelty bypass leak was patched and early post-restart checks
were clean, while the refreshed latest row now shows accounting pending after
another root rollover.

The current fuzzing mix is browser/e2e-heavy by graph row count, with `28`
browser/e2e lanes plus one lane each for unit-property,
coverage-guided-lower-level, and protocol-server. Browser/e2e is still the only
level producing triaged likely-real findings in the committed triage-output
metric, while lower-level lanes produce broader candidate output but little
confirmed output. The latest rate bucket shows `20` browser/e2e executions, or
`80` executions/hour. Protocol-server's latest nonzero bucket shows `22` cases
at `20:15Z`. Persona
evidence rejects treating those rows as trusted live capacity by themselves: the
latest level-mix synthesis says root rollover, stale roots, dead PIDs, and
missing live artifact evidence can make browser/e2e capacity look healthier than
it is. The latest level-mix feedback action applied the targeted HTTP direction
by starting one focused `large-http-lifecycle` browser shard and restarting HTTP
polling-manager lower-level work, but its regenerated context still reported
`16` active browser/e2e lanes against a `24` lane floor. The refreshed graph
also still shows rich-text CRDT, not HTTP polling-manager, as the current
coverage-guided lower-level row. The latest native action file is empty; the
latest non-empty native action validates parser serialization in bounded smoke,
but the production parser lane is held and is not yet visible as a current
graph-counted lane. The latest protocol synthesis file is empty; the latest
protocol action validates the HTTP polling REST protocol/server harness, but
sustained protocol/server capacity still needs live-lane accounting. The next
useful accounting change is still fail-closed live-lane validation plus recovery
of Docker, resource autoscaling, and browser HTTP correctness capacity.

PR progress is visible again, but the controller is not currently advertising a
non-empty push manifest. The PR-split persona feedback keeps the fileable prefix
through `PR15C` and rejects `PR16-RLH` as fileable until strict seed `6000007`
reaches the final persistence oracle and owner rows prove it. Cycle 446 launched
one bounded repair job for that strict-head proof, but the report was still
pending in the copied evidence. The PR loop still needs to turn held
ready-product rows, the benchmark-canary blocker, the active reload-hydration
blocker, and the queued PR07C blocker into validated publishable branches rather
than just accumulating blocked or no-progress artifacts.
