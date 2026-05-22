# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-22T20:33:20Z`

This report summarizes the Jetstream2 RTC fuzzing, coverage-guidance,
resource, and PR-progress logs. The summarized CSVs and plots are committed
under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/);
raw inputs are copied into the refresh workspace for each run.

Source inputs include the coverage-guided run root, sysstat CPU/load samples,
the resource autoscaler disk samples, PR progress controller snapshots,
critical-path executor queues, artifact-index snapshots, and the latest copied
standard persona-loop outputs. The collector copies `raw/pr-focused/...`
inputs so PR-controller graphs track current raw state instead of stale local
state.

## High-Level Readout

The graph-refresh pipeline is current through `2026-05-22T20:31:31Z` for
current-run accounting and `2026-05-22T20:26:49Z` for monitor passes. The
monitor has `4,085` passes from `2026-05-15T01:21:42Z` onward, cumulative
coverage record observations are `279,881`, and current-scan coverage files are
`1,434`. The parsed coverage-goal table has `11` unmet target rows out of
`136`.

The live duplicate/noise signal is current-output-dir accounting, not the
historical aggregate. The latest active run is `run-20260522T192827Z`; its
current-run accounting row at `2026-05-22T20:31:31Z` is trusted
(`current_run_metrics_trusted` `TRUE`, `full_pass_pending` `FALSE`,
`pending_until_first_pass` `FALSE`). It reports `duplicateShareCurrent` `1`,
summary startup failures `0`, and `1` current signature / `1` actionable
signature / `1` product-evidence signature, with
`current_run_top_duplicate_share` `1`. This is a one-signature denominator, not
a broad duplicate storm. The earlier `2026-05-22T19:31:05Z` row for the same
run was an untrusted first-pass-pending sample with no current-run signature
denominator. Later trusted rows moved through one-signature, two-signature, and
zero-signature samples before returning to this one-signature warning sample.
Historical duplicate share is `0.1538` for context only and is not the plotted
live health signal.

The latest duplicate/noise synthesis rejects a product-bug or broad
product-duplicate-storm interpretation and identifies a novelty-monitor
control-plane scheduling/accounting leak: success-deficit/bootstrap paths can
revive noisy groups, product-evidence `assertion` duplicates are not
consistently capped to one representative, and weak signals such as
`family-capped` can be treated too strongly. The latest non-empty
duplicate/noise feedback-action applied an earlier bounded fix, but the later
synthesis still asks for stricter producer/action-gate predicates. The refreshed
graph has a live duplicate/noise warning, but the denominator is one current
product-evidence/actionable signature; it does not prove a broad product
duplicate storm.

Resource state is usable, with I/O pressure still visible. The latest monitor
sample has `388.2G` free memory; the latest disk sample has `90.4GiB` free on
`/` and `450.9GiB` free on `/media/volume/danluu-fuzz-data`. Latest CPU
utilization is `66.6%`, with `17.32%` iowait. Latest load averages are `49.95`,
`55.42`, and `57.62` on `64` logical CPUs, with `2` blocked tasks in the same
sample.

The latest graph-counted fuzzing mix is still concentrated in browser/e2e:
`23` browser/e2e lanes across `23` groups, plus one `unit-property` lane, one
`protocol-server` lane, and one stale `coverage-guided-lower-level` row.
Browser/e2e remains below the persona loop's `24`-lane floor. The current
active accounting root has `11` browser/e2e coverage-guided groups:
large-post HTTP readiness/lifecycle/completion, same-user stale draft,
title/reload convergence, block gauntlet, long-session large document,
many-user lifecycle, media cross-entity, parser transform, and permissions/auth
locks. Graph-latest append campaigns also contribute three focused rows, six
gap-booster rows, and three strict HTTP expansion rows. Current
graph-confirmed lower-level work is narrow: one rich-text CRDT unit/property
lane, one stale coverage-guided lower-level row, and one HTTP polling
protocol-server row. The latest level-mix
synthesis rejects treating focused/strict browser row counts as useful capacity
while unsupported Playwright artifact args are still causing startup failures.
`transport-integration`, `backend-api`, and standalone fuzz-only assertion work
have no current graph-counted lane. Persona/action evidence reports bounded
parser lower-level validation, but the refreshed live mix still has only a
stale parser-adjacent coverage-guided-lower-level row and the latest execution
bucket has zero coverage-guided-lower-level executions; keep it as action
evidence until graph-visible residency appears.

The execution counter has `16,897,948` estimated individual executions. These
are reconstructed from lane `events.ndjson`: browser seed attempts,
unit/property fixed tests plus generated cases, coverage-guided inputs, and
protocol/backend cases. Lower-level counts are approximate when reconstructed
from batch metadata or legacy batch-count fields. The latest partial bucket at
`2026-05-22T20:30:00Z` has `28` browser/e2e executions and `448` unit-property
executions, about `112`/hour and `1,792`/hour; protocol-server was zero in that
partial bucket after the `2026-05-22T20:00:00Z` bucket contributed `730`
protocol-server executions. The latest bucket has zero
coverage-guided lower-level, backend-api, transport-integration, and
fuzz-assertion executions.

The PR-focused data is live. The controller table has `26` distinct work items
in `26` current rows: `13` high-priority ready-product PR rows marked
published, `5` high-priority ready-product rows held by the controller, `1`
runtime-held consumed row, one exact-stack-needed reload-hydration row, two
diagnostic-ready deferred-manifest rows, two downscoped deferred-manifest rows,
and deferred-family diagnostic plus needs-product-decision rows. The current
push manifest has no graph-counted publishable branch. The critical-path
executor has `7` blockers: two active blockers (`productive-analysis-action`
and `benchmark-canary-fuzzer-gap`), one held reload-hydration item, and four
terminal blockers. PR17
seed `1020002`, PR07C owner-matrix, seed `5200005`, and seed `1060015` are
terminal. PR07C is now classified as product-owned red, benchmark-canary
exact-stack promotion repair is active, and reload-hydration is held by a
single-flight manifest. The latest PR-split feedback keeps the fileable prefix
through `PR15C` and rejects `PR16-RLH` as fileable until strict seed `6000007`
reaches the final persistence oracle and owner rows prove it.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

The current coverage-file value is a current-scan count, not a cumulative
total. It can fall when the active output root changes or when a cleanup pass
removes old per-run files. Cumulative coverage record observations are the
better long-term intake signal.

## Health And Resources

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

![Current-run accounting completeness over time](rtc-jetstream2-fuzz-trends-20260515/plots/current-run-accounting-completeness.png)

The duplicate/noise graph uses current-output-dir accounting for live status.
Pending/incomplete accounting is tracked as its own health signal and should
not be read as a measured product duplicate/noise rate. If
`current_run_metrics_trusted` is `FALSE`, treat the duplicate/noise share as
incomplete current-run accounting and as a control-plane health issue until the
active run completes a full pass.

The latest sample for `run-20260522T192827Z` was taken at
`2026-05-22T20:31:31Z`; it reports `current_run_metrics_trusted` `TRUE`,
`pending_until_first_pass` `FALSE`, and `full_pass_pending` `FALSE`. The live
duplicate share is `1`, summary startup failures are `0`, and the current-run
denominator is `1` current signature / `1` actionable signature / `1`
product-evidence signature. The earlier `19:31:05Z` row for the same active run
was pending first-pass accounting with no current-run signature denominator, and
should be read as a control-plane accounting completeness signal rather than a
measured product duplicate/noise rate. The trusted `19:39:44Z`, `19:46:08Z`,
`19:54:08Z`, and `20:02:08Z` rows were one-signature samples; the `20:09:08Z`
and `20:17:12Z` trusted rows were two-signature samples at duplicate share
`0.5`; `20:24:31Z` was a zero-signature sample, and the latest row is a
one-signature warning sample.

The latest duplicate/noise synthesis rejects a product-bug or broad product
duplicate-storm interpretation. It says the stronger root cause is still in the
control plane: success-deficit/bootstrap scheduling can bypass startup-noise
holds, product-evidence duplicate holds can lose representative metadata, and
`assertion` families are not consistently capped as active-only product-evidence
duplicates. The latest non-empty duplicate/noise feedback-action reports that
an earlier bounded fix was implemented, including `repos` scan pruning and a
benchmark-canary bypass stop once current product evidence exists. The later
synthesis asks for a stricter follow-up, so keep the control-plane risk on
watch. The latest live duplicate/noise share is high, but it is high on a
one-signature product-evidence/actionable denominator rather than broad current
run duplication.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. The latest sample
has `90.4GiB` free on root and `450.9GiB` free on the data volume; the data
volume is around `87.3%` used and root is around `41.3%` used. Root pressure
remains stable, but output-size budgeting still matters on the data volume.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,802`. Current enabled groups in the
summary are:
`novelty-ws-real-user-coverage-bridge`,
`novelty-ws-parser-transform`,
`novelty-http-same-user-stale-draft`,
`novelty-http-title-reload-convergence`,
`novelty-ws-long-session-large-doc`,
`novelty-ws-media-cross-entity`,
`novelty-ws-block-gauntlet`, and
`novelty-ws-many-user-lifecycle`.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted mix is concentrated in
browser/e2e: `23` browser/e2e lanes across `23` groups. Lower-level work is
narrow: `unit-property` and `protocol-server` each have one current
graph-counted row, while the lone `coverage-guided-lower-level` row is stale
from `2026-05-21T11:14:10Z`. `transport-integration`, `backend-api`, and
standalone fuzz-only `fuzz-assertion` work have no current graph-counted lane
in this snapshot.

The active accounting root is `run-20260522T192827Z`. Current graph-counted
browser/e2e supervisor rows include `11` current coverage-guided groups, three
focused rows, six gap-booster rows, and three strict HTTP expansion rows. Those
rows cover hard large-post HTTP readiness, large-post HTTP
lifecycle/completion, same-user stale-draft HTTP, title/reload convergence,
block gauntlet, long-doc, many-user lifecycle, media cross-entity, parser
transform, permissions/auth locks, async/server blocks, collaboration UI
signals, real-user title/rich-text editing, revision/autosave recovery,
three-user late join, and persistence probing. The graph also sees a current
protocol-server HTTP polling row.

Persona-loop evidence rejects the simple interpretation that graph-counted rows
equal trusted useful live capacity. The latest non-empty level-mix synthesis
rejects broad lower-level expansion, keeps `unit-property` capped at one smoke
lane, keeps backend/API and protocol-server at sentinel scale, counts stale
`fuzz-assertion` as zero useful capacity, and keeps browser/e2e as the
admission-gated priority because it remains below the `24`-lane floor. The
refreshed graph sees `23`, still below that floor. The same synthesis rejects
crediting focused/strict browser lanes whose command logs still fail on
unsupported Playwright `--video` / `--screenshot` args; fix the runner args
before counting that capacity. It says the current coverage
`novelty-http-large-post-readiness` row is already running, so the next
browser shard should be same-user stale tabs rather than another readiness
duplicate.

The latest level-mix feedback-action file is empty; the latest non-empty action
says the parser oracle was tightened and a bounded 32-input parser canary was
launched with `new_coverage_keys=4`, `admitted_new_feature_keys=15`, and
`product_yield=1`. It also says the parser run should contribute lower-level
executions. The refreshed graph confirms active hard/browser readiness,
same-user/title HTTP browser coverage, and protocol-server telemetry, but it
still has no current coverage-guided-lower-level execution bucket and the
graph-counted coverage-guided-lower-level row remains stale. Treat the
block-parser result as action evidence until graph-visible current residency
appears.

The latest native-harness synthesis selects
`coverage-guided-lower-level-block-parser-serialization` as the first ready
isolated Node/V8 coverage-guided lower-level target. The latest native action
implemented and smoke-validated that harness, emitted collector-style
`fuzzLevel: "coverage-guided-lower-level"` events, and reported `coverageKeys`
`192`, `featureKeys` `38`, and `productYield` `true`; it did not start an
unattended continuous run because a production hold remains. The graph still
rejects treating that as sustained live lower-level residency because the
latest graph-counted coverage-guided lower-level row is stale and current
execution buckets remain zero.

The latest protocol-server synthesis file is empty; the latest non-empty
protocol-server synthesis selects the HTTP polling REST harness for
`POST /wp-sync/v1/updates`. The latest action implemented and validated that
protocol-server fuzz harness with a passing 10-case smoke seed, collector-style
root/lane artifacts, and `fuzzLevel: "protocol-server"` events; it did not start
a long-running tmux fuzz session or update current-run pointers. The refreshed
graph has a protocol-server row and execution buckets through
`2026-05-22T20:30:00Z`; the latest protocol-server bucket is zero after a
nonzero `20:00` bucket, so protocol-server telemetry is present but still
sentinel-scale rather than broad expansion.

Fuzz-only assertion work is not graph-counted as active. The latest assertion
action added two gated assertions; level-mix evidence still treats
`fuzz-assertion` as stale rather than current graph capacity.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus
generated cases, coverage-guided inputs, and protocol/backend cases.
Lower-level rows are approximate when reconstructed from batch metadata or
legacy batch-count fields. The latest totals are approximately `89,350`
browser/e2e, `5,787,616` unit-property, `458,097`
coverage-guided lower-level, and `10,562,885`
protocol-server executions. Transport-integration, backend-api,
fuzz-assertion, and other buckets are `0` in the current reconstructed table.

The latest 15-minute bucket at `2026-05-22T20:30:00Z` is partial and has `28`
browser/e2e executions (`112`/hour) and `448` unit-property executions
(`1,792`/hour). Protocol-server is zero in that latest bucket, after `730`
executions (`2,920`/hour) in the `20:00` bucket. Coverage-guided lower-level,
backend-api, transport-integration, and fuzz-assertion are zero in the latest
bucket. The persona feedback reports a bounded parser lower-level canary, but
the committed execution-count graph has not yet shown it as a current bucket;
this is a graph/persona evidence mismatch to resolve in the next accounting
pass.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `127` likely-real
findings over about `581.3` runner-hours, or `21.85` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `1,187`
total candidates: `1,179` browser/e2e candidates, `6` unit-property
candidates, and `2` coverage-guided-lower-level candidates. Backend-api,
protocol-server, transport-integration, standalone fuzz-assertion, and other
buckets have no unique candidates in the latest graph-counted data.

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

The latest weak-completion profiles have successful record counts at zero for
collaboration UI signals (`101` records). Table stale snapshot HTTP now has
`1` successful record from `15` records. Revision persistence has `4`
successful records, full-profile rows have `16`, parser serialization has
`21`, multi-reload lifecycle has `37`, long-session large-doc has `39`,
many-user lifecycle has `41`, common blocks have `43`, code-editor smoke has
`64`, large-post three-user HTTP has `67`, parser transform has `68`,
block-gauntlet has `106`, three-user late join has `106`, media
cross-entity has `111`, async/server blocks have `143`, and
permissions/auth/locks has `265`. This
still argues for completion-depth repair in existing covered surfaces before
adding another broad surface class.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

![Combined-ingredient fuzzing progress](rtc-jetstream2-fuzz-trends-20260515/plots/combined-ingredient-fuzz-progress.png)

![Combined-ingredient fuzzing goal progress](rtc-jetstream2-fuzz-trends-20260515/plots/combined-ingredient-fuzz-goal-progress.png)

![Combined-ingredient fuzzing count criteria](rtc-jetstream2-fuzz-trends-20260515/plots/combined-ingredient-fuzz-requirements.png)

The combined-ingredient graphs are generated by
`rtc-jetstream2-fuzz-trends-20260515/scripts/plot-rtc-jetstream2-fuzz-trends.R`
from the novelty-state feature key
`cross-product:large-post-three-user-http-lifecycle`. They track the
benchmark-like conjunction: HTTP polling, large initial post, at least three
browser users, lifecycle reloads, save/autosave checkpoints, strict
persistence oracles, and a passed run. Separate ingredient-lane hits do not
increment this cross-product count. The goal-progress graph also includes
nearby large-post, HTTP, and three-user goals so already-running combined-ish
lanes remain visible while the stricter cross-product key ramps up.

Latest combined progress is `0`/`25` strict cross-product records. The
combined group is not currently marked enabled in the sampled state, and the
adjacent large-post three-user HTTP profile has `754` records seen with `67`
successful records. Those adjacent hits still do not count as completed
combined coverage unless the strict feature key records the whole conjunction.

![Many-user active-editing progress](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-progress.png)

![Many-user active-editing cross-product goals](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-cross-products.png)

![Many-user active-editing count criteria](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-requirements.png)

The many-user active-editing graphs track a stricter scale dimension than the
older many-user document counts. Users present in a room are not enough. A run
only contributes to the active-user series when distinct browser users
actually perform successful editing actions, and final UI witness-sweep-only
edits do not count as active-editor evidence. The cross-product rows require
the same active-editor threshold together with realistic editing ingredients:
save/reload lifecycle, late join, autosave, rich text/list/table editing,
synced notes, collaboration UI signals, large-document setup, HTTP polling
with an explicit client-limit override, same-user tabs, mixed same/distinct
identities, revision restore, publish transition, persistence races,
same-block contention, note reply/resolve/delete lifecycle, WS
reconnect/background churn, HTTP 413 compaction, title/content/excerpt
boundaries, strict 30-user operation ledgers, and a passed fuzz record.

Latest many-user active-editing progress is `0`/`25` records at six active
editors, `0`/`10` at ten active editors, `0`/`10` at twelve active editors,
and `0`/`3` at thirty active editors. The rich/list, synced notes, HTTP
polling, HTTP client-limit override, same-user tabs, same/distinct identity
mix, revision restore, publish transition, UI-signal, save/reload/autosave,
concurrent save/autosave/publish races, late-join, large-document, same-block
contention, note reply/resolve/delete lifecycle, WS reconnect/background churn,
HTTP 413 compaction, title/content/excerpt boundary, and strict 30-user
operation-ledger cross-products remain `0` at the 6/10/12/30 active-editor
thresholds where they apply. The active-editing groups are not currently marked
enabled in the active-editing progress table, so these graphs should remain red
until the monitor admits the six-, twelve-, and thirty-active-editor lanes and
they start producing passed records.

Largest current unmet goal and active-editing gaps:

| Goal                                                    | Current | Target |
| ------------------------------------------------------- | ------: | -----: |
| successful parser-serialization records                 |      21 |     50 |
| successful multi-reload-lifecycle records               |      37 |     50 |
| successful collaboration-ui-signals records             |       0 |     25 |
| strict combined HTTP large-post three-user lifecycle    |       0 |     25 |
| many-user active-editing records                        |       0 |     25 |
| six-active-editor lifecycle cross-product               |       0 |     25 |
| six-active-editor rich/list/lifecycle cross-product     |       0 |     25 |
| six-active-editor UI-signal cross-product               |       0 |     25 |
| six-active-editor large-document cross-product          |       0 |     25 |
| remote selection and cursor visible                     |       1 |     25 |
| remote and local autosave checkpoints                   |      11 |     25 |
| local post recovery autosave                            |      12 |     25 |
| successful three-user late-join records                 |      10 |     25 |
| async/server block core/template-part                   |       0 |     20 |
| successful table-stale-snapshot-http records            |       1 |     10 |
| table stale snapshot oracle                             |       0 |     10 |
| ten-active-editor progress                              |       0 |     10 |
| twelve-active-editor progress                           |       0 |     10 |
| six-active-editor synced-notes/lifecycle cross-product  |       0 |     10 |
| six-active-editor HTTP polling lifecycle cross-product  |       0 |     10 |
| HTTP client-limit override for active editing           |       0 |     10 |
| six-active-editor same-user-tab lifecycle cross-product |       0 |     10 |
| six-active-editor revision-restore cross-product        |       0 |     10 |
| six-active-editor publish-transition cross-product      |       0 |     10 |
| six-active-editor mixed-identity lifecycle cross-product |       0 |     10 |
| six-active-editor same-block contention cross-product   |       0 |     10 |
| six-active-editor note-thread lifecycle cross-product   |       0 |     10 |
| six-active-editor persistence-race cross-product        |       0 |     10 |
| six-active-editor WS reconnect/background cross-product |       0 |     10 |
| six-active-editor HTTP 413 compaction cross-product     |       0 |     10 |
| six-active-editor post-field boundary cross-product     |       0 |     10 |
| action table-stale-snapshot-html                        |       4 |     10 |
| twelve-active-editor synced-notes/lifecycle cross-product |       0 |      5 |
| thirty-active-editor progress                           |       0 |      3 |
| strict 30-user operation ledger                         |       0 |      3 |

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

The parsed suggested-PR split history has `457` snapshots. The latest parsed
proposed split totals `4,114` net LOC. These charts are size telemetry from
parsed status snapshots, not filing authority. The largest latest rows are
`PR 13B` at `1,668` net LOC, `PR 13A` at `1,126`, `PR 13C` at `294`, and
`PR 14` at `276`.

## PR-Focused Controller

![PR-focused controller current work state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-current-state.png)

![PR loop current queue depth](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-queue-depth-current.png)

The current controller state has `26` distinct work items in `26` current
rows. The most important live queue entries are `5` high-priority
ready-product PR rows held by the controller, `13` published ready-product
rows still under validation, `1` high-priority runtime-held consumed row, one
exact-stack-needed reload-hydration row, two diagnostic-ready deferred-manifest
rows, two downscoped deferred-manifest rows, and deferred-family diagnostic
plus needs-product-decision rows.

![PR-focused controller events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-controller-events.png)

![PR blocker and stall events over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-blocker-stall-events-over-time.png)

Use the blocker/stall timeline when asking whether exact-stack gates, deferred
family budget gates, resource reserve, single-flight guards, or repeated
critical-path continuations are slowing progress. It buckets controller stalls
and critical-path blocker launches by 30-minute UTC windows. A spike is not
automatically bad, but repeated spikes for the same blocker class mean the loop
is spending capacity on a gate or relaunch pattern that should be consumed,
downscoped, or converted into exact evidence.

![Controller-publishable PR branch diff sizes](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-publishable-diff-size.png)

The current push manifest has no graph-counted publishable branch. Published
and held branches remain visible in the progress table. The latest PR-split
persona feedback rejects promoting
`PR16-RLH` as fileable: the ready prefix remains through `PR15C`, while
`RLH-6000007-candidate` is blocked pending strict seed `6000007` proof and
owner rows. The copied feedback requests exactly one bounded strict-head
reproduction repair job for `8fb598778357` / seed `6000007`; do not treat
wait-only or no-progress cycles as acceptance while actionable rows remain.

![PR artifact index scope by source tree](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-scope.png)

![PR artifact index refresh size](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-growth.png)

The artifact index has `3,291` current artifact rows across `23` root/kind
buckets.

![Critical PR blocker state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-critical-blocker-state.png)

![PR loop blocked control decisions](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-blocked-control-decisions.png)

![Repeated critical-path branch validation results](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-repeated-validation-results.png)

![Repeated critical-path no-progress artifacts](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-no-progress-artifacts.png)

The critical-path executor has `7` blockers: two active blockers
(`productive-analysis-action` and `benchmark-canary-fuzzer-gap`), one held
deferred-family blocker
(`reload-hydration`), and four terminal blockers (`PR17` seed `1020002`,
`pr07c-owner-matrix`, `seed-5200005-reducer`, and `seed-1060015-reducer`).
The current active job sessions include the critical-path loop, benchmark-canary
and productive-analysis continuations, level-mix loop/watchdog, and three
deferred/unblock sessions. PR07C owner matrix is terminal with
`product_owned_repro`, benchmark-canary fuzzer-gap exact-stack promotion repair
is active, and reload-hydration is gated by a single-flight manifest.
The repeated no-progress table currently has one `benchmark-canary-fuzzer-gap`
row: `pre_oracle_or_preflight_only`.

## Interpretation

The active coverage root is `run-20260522T192827Z`, and its latest accounting
row is trusted. The row was sampled at `2026-05-22T20:31:31Z`; it reports
`full_pass_pending` `FALSE`, `pending_until_first_pass` `FALSE`,
`duplicateShareCurrent` `1`, summary startup failures `0`, and `1` current
signature / `1` actionable signature / `1` product-evidence signature. The
prior `19:31:05Z` row for the same run was incomplete first-pass-pending
accounting and remains useful as a control-plane accounting completeness signal;
the `20:09:08Z` and `20:17:12Z` trusted rows were small-denominator warning
samples at duplicate share `0.5` with `2` current/actionable/product-evidence
signatures, followed by a zero-signature row at `20:24:31Z`. The latest trusted
row is complete current-run accounting, but its `duplicateShareCurrent` `1` is
from a one-signature denominator and should not be read as a broad duplicate
storm. Historical aggregate duplicate/noise remains context only.

The duplicate/noise persona synthesis rejects a product-bug reading and points
at a control-plane leak in novelty-monitor scheduling/accounting:
success-deficit/bootstrap paths can bypass startup-noise holds, product-evidence
duplicate holds can lose representative metadata, and `assertion` families are
not consistently capped as active-only product-evidence duplicates. The latest
non-empty duplicate/noise feedback-action says an earlier bounded fix has been
applied, including `repos` scan pruning and a benchmark-canary bypass stop once
current product evidence exists. The later synthesis still recommends stricter
producer/action-gate predicates, so keep the control-plane risk on watch even
though the latest current-run warning is only one current
product-evidence/actionable signature.

The resource picture is usable but still has I/O pressure: latest CPU
utilization is `66.6%`, with `17.32%` iowait; load is `49.95`, `55.42`, and
`57.62` on `64` logical CPUs, with `2` blocked tasks. Five-minute load is below
the core count, but iowait is elevated and optional browser admission still
needs to respect
short-window load, blocked-task, and iowait pressure.

The graph-counted fuzzing mix is browser/e2e-heavy: `23` browser/e2e lanes,
plus one current unit-property lane, one current protocol-server lane, and one
stale coverage-guided lower-level row. Persona evidence is stricter than the
graph and rejects raw row counts as trusted useful capacity unless roots,
sessions, PIDs, events, and summaries reconcile. The latest level-mix synthesis
keeps browser/e2e underfilled and rejects broad lower-level expansion. It also
rejects crediting focused/strict browser lanes while unsupported Playwright
artifact args are causing startup failures; the active coverage supervisor
already has `novelty-http-large-post-readiness`, so the suggested next browser
shard is same-user stale tabs after the runner-arg fix. The latest non-empty
level-mix feedback-action reports a bounded parser lower-level canary with
product yield and says it should contribute lower-level executions; the latest
native-harness action now reports a validated isolated block-parser lower-level
harness with collector-style events and product yield. The refreshed graph still
does not confirm sustained current coverage-guided lower-level residency or a
current execution bucket because that action did not start a continuous run. The
graph confirms hard readiness, same-user/title HTTP browser coverage, strict
HTTP expansion, many-user lifecycle, and protocol-server telemetry, but it does
not confirm backend/API, transport-integration, standalone fuzz-only assertion
work, or current-bucket coverage-guided lower-level execution.

Browser/e2e remains the only level producing triaged likely-real findings in
the committed triage-output metric. The latest execution bucket is partial:
the `2026-05-22T20:30:00Z` bucket has `28` browser/e2e executions and `448`
unit-property executions; protocol-server is zero there after `730` executions
in the prior `20:00` bucket.
Lower-level counts remain approximate where reconstructed from batch metadata
or legacy batch-count fields.

Coverage-goal pressure remains at the strict cross-product edges.
`cross-product:large-post-three-user-http-lifecycle` remains `0`/`25`, even
though the adjacent large-post three-user HTTP profile has `754` records and
`67` successful records. Many-user active editing is also still `0` at the
6/10/12/30 active-editor thresholds. Those counts require distinct users who
actually edited, excluding final UI witness-sweep-only edits, not merely users
present in the room.

PR progress is visible, but the current push manifest advertises no
publishable branch. The PR-split persona feedback keeps the fileable prefix
through `PR15C` and rejects `PR16-RLH` as fileable until strict seed `6000007`
reaches the final persistence oracle and owner rows prove it; the
feedback-action launched one
bounded strict-head repair job for that family. The PR loop still needs to
convert held ready-product rows, active productive-analysis feedback, active
benchmark-canary exact-stack promotion repair, and held reload-hydration work
into validated publishable branches rather than more blocked or no-progress
artifacts. Seed `5200005` is now terminal, and PR07C owner-matrix work is
terminal with product-owned repro evidence.
