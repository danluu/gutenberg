# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-24T01:14:24Z`

This report summarizes the Jetstream2 RTC fuzzing, coverage-guidance,
resource, and PR-progress logs. The summarized CSVs and plots are committed
under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/);
raw inputs are copied into the refresh workspace for each run.

Source inputs include the coverage-guided run root, sysstat CPU/load samples,
the resource autoscaler disk samples, PR progress controller snapshots,
critical-path executor queues, artifact-index snapshots, and the copied
standard persona-loop outputs. The collector copies `raw/pr-focused/...`
inputs so PR-controller graphs track current raw state instead of stale local
state.

## High-Level Readout

The graph-refresh pipeline is current through `2026-05-24T00:08:54Z` for
monitor passes, with the latest current-run accounting sample at
`2026-05-24T00:49:03Z`. The active accounting row has advanced to
`run-20260524T004854Z`, but its first full duplicate/noise pass is still
pending: `current_run_metrics_trusted_last` is `FALSE`, the latest completed
duplicate/noise pass is still `2026-05-24T00:08:16Z`, and sampled
completed-pass lag is about `40.8` minutes. The monitor has `4,302` passes
from `2026-05-15T01:21:42Z` onward, cumulative coverage record observations
are `291,426`, current-scan coverage files are `7,118`, and the parsed
coverage-goal table has `8` unmet rows out of `149`.

The live duplicate/noise signal is current-output-dir accounting, not the
historical aggregate. Because the active row is still pending its first full
pass, the current duplicate/noise share is incomplete accounting and should be
read as a control-plane health issue until the pass completes. The row carries
forward the latest completed-pass duplicate share `0.0` and summary startup
failures `0`, but current signatures, actionable signatures, product-evidence
signatures, and top duplicate share are not yet available. The active row sees
`0` active run dirs, no supervisor-groups file value, and `21` observed roots,
so the missing denominator is accounting/startup incompleteness, not evidence
of a broad duplicate storm. The prior trusted sample at
`2026-05-24T00:12:42Z` had `0` current signatures; the earlier trusted
`2026-05-23T21:21:48Z` sample had a `1/1` duplicate/noise point, so the
available trusted data still looks like a transient one-signature
control-plane blip rather than broad duplicate pressure.

The latest duplicate/noise synthesis rejects a product-bug or broad product
duplicate-storm interpretation. It points instead to a producer/control-plane
leak in novelty-monitor and supervisor publication: benchmark canary forcing,
non-authoritative `supervisor-groups.json`, lost pause metadata, narrow
duplicate-family holds, and startup-ish `editor_open_post_timeout` can keep
producers alive. The latest feedback-action says the scheduler fix was
patched and restarted and saw actionable duplicate share below threshold. The
prior trusted graph sample agreed with that status; the newest row is not yet
trusted and should be treated as pending current-run accounting, not as a
measured product duplicate/noise rate.

Disk remains the resource constraint, while CPU/load eased in the newest
sample. Latest CPU utilization is `6.00%`, with `0.01%` iowait. Latest load
averages are `3.67`, `5.78`, and `9.78` on `64` logical CPUs, with `0`
blocked tasks. Root has `89.0GiB` free and the data volume has `20.8GiB` free
while `99.4%` used.

The latest graph-counted fuzzing mix is still browser/e2e-heavy and remains
below the plotted `24`-lane persona-loop floor: `19` browser/e2e lanes across
`19` is-latest groups, with only the `11` coverage-guided rows sampled at
`2026-05-24T00:39:19Z` clearly current and the remaining focused/gap/strict
rows older. Current lower-level graph residency is narrow: one bounded
`unit-property` HTTP polling canary row, one current `protocol-server` HTTP
polling row, and one stale `coverage-guided-lower-level` rich-text CRDT row.
`transport-integration`, `backend-api`, and standalone fuzz-only assertion
work have no current graph-counted lane. Persona-loop evidence rejects treating
the lane count as a reason to expand: the latest feedback-action chose
deadline-mode tightening, terminalized PR07C owner-matrix work from green
no-product owner evidence, noted a fresh coverage-guided root with `11`
groups still starting and `0` running, and kept broad backfill/lower-level
expansion held under high disk pressure.

The execution counter has `17,311,544` estimated individual executions. The
partial latest plotted `2026-05-24T00:30:00Z` bucket has `18` browser/e2e
executions and no lower-level executions. The preceding `00:15` bucket had
`26` browser/e2e executions and `3` unit-property executions; the `00:00`
bucket had `35` browser/e2e and `2,005` protocol-server executions. Recent
buckets are still browser/e2e plus protocol-server, with bounded
unit-property blips.

The PR-focused critical-path data is live again. The current PR-progress
state counts have `35` counted items: `27` published ready-product rows, `4`
held-by-controller ready-product rows, `1` superseded ready-product row, `1`
runtime-held-consumed PR07C owner-matrix row, and `2` deferred-family rows
split across needs-product-decision and diagnostic states. The current push
manifest still has `0` graph-counted publishable branches and `0` publishable
net LOC.
PR-split feedback keeps the fileable prefix through `PR15C` and rejects
`PR16-RLH` as fileable until strict seed `6000007` reaches the final
persistence oracle and owner rows prove it.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

The current coverage-file value is a current-scan count, not a cumulative
total. It can fall when the active output root changes or cleanup removes old
per-run files. Cumulative coverage record observations are the better
long-term intake signal.

## Health And Resources

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

![Current-run accounting completeness over time](rtc-jetstream2-fuzz-trends-20260515/plots/current-run-accounting-completeness.png)

The duplicate/noise graph uses current-output-dir accounting for live status.
Pending/incomplete accounting is tracked as its own health signal and should
not be read as a measured product duplicate/noise rate. If
`current_run_metrics_trusted_last` is `FALSE`, treat the duplicate/noise share
as incomplete current-run accounting and as a control-plane health issue until
the active run completes a full pass.

The latest current-run accounting sample for `run-20260524T004854Z` was taken
at `2026-05-24T00:49:03Z`. The active row is available, but it has not
completed a full pass: `current_run_metrics_trusted_last` is `FALSE`,
`pending_until_first_pass` is `TRUE`, the latest completed full
duplicate/noise pass recorded in the row is still
`2026-05-24T00:08:16Z`, and the sampled completed-pass lag is about `0.7`
minutes at `23:46:14Z`, `1.5` minutes at `23:58:28Z`, `4.4` minutes at
`00:12:42Z`, `12.1` minutes at `00:20:24Z`, `20.4` minutes at `00:28:41Z`,
`25.4` minutes at `00:33:41Z`, and `40.8` minutes in the latest sample. The
row has `0` active run dirs, no supervisor-groups file value, and `21`
observed roots; it carries forward latest completed-pass
`duplicateShareCurrent` `0.0` and summary startup failures `0`, but current
signatures, actionable signatures, product-evidence signatures, and top
duplicate share are incomplete. The prior trusted sample at
`2026-05-24T00:12:42Z` had a zero-signature denominator; the earlier trusted
sample at `2026-05-23T21:21:48Z` had a `1/1` duplicate/noise point. Until the
active run completes a full pass, this is an
accounting-completeness/control-plane startup health signal rather than a
measured current product duplicate/noise rate.

The latest duplicate/noise persona synthesis rejects a product-bug or broad
product duplicate-storm interpretation and calls the remaining issue a
novelty-monitor producer/supervisor scheduling leak. Its requested fixes are
pause-metadata preservation, authoritative post-policy supervisor publication,
product-evidence duplicate holds that include `editor_open_post_timeout`, and
one representative per meaningful product family. The latest feedback-action
says the scheduler patch was syntax-checked and restarted and reported
actionable share `0.25`, below threshold. The prior trusted graph sample
supports that live-status claim; the newest graph row is pending and should
not be used to accept or reject the duplicate/noise rate until the full pass
finishes.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

![Free disk space over time](rtc-jetstream2-fuzz-trends-20260515/plots/disk-free-space-over-time.png)

The disk graph tracks both root and the mounted data volume. Root pressure is
stable at `89.0GiB` free and `42.2%` used; the data volume is now at
`20.8GiB` free and `99.4%` used in the latest sample. That is no longer a
hard-zero free-space sample, but output-size budgeting remains the dominant
live resource constraint.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The latest enabled-group event count is `1,910`. The current enabled-groups
summary names WebSocket block-gauntlet, many-user lifecycle, and many-user
lifecycle-completion groups, plus HTTP large-post readiness,
provider-persisted large-post, existing-post CRDT metadata, list-move refresh,
title-reload convergence, large-post lifecycle, large-post lifecycle
completion, and table stale-snapshot groups. Current lane residency is still
better read from the fuzzing-level mix table below than from historical enable
events. Persona feedback still says benchmark canary coverage readiness must
fail closed until current-run HTTP records and strict oracles prove it; lane
presence is not the same thing as strict benchmark coverage.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The collector reads recent and current `supervisor-groups.json` files instead
of scanning unbounded history. The latest graph-counted mix is browser/e2e
dominant but below the plotted `24`-lane floor: `19` browser/e2e lanes across
`19` is-latest groups. Current browser/e2e rows include `11`
coverage-guided lanes sampled at `2026-05-24T00:39:19Z` for block gauntlet,
large-post readiness, provider-persisted large-post, many-user lifecycle,
existing-post CRDT metadata, list-move refresh, title-reload convergence,
large-post lifecycle, large-post lifecycle completion, table stale-snapshot,
and many-user lifecycle completion. The remaining browser/e2e is-latest rows
are older: one focused-shard HTTP same-user stale-tabs lane, six gap-booster
WebSocket lanes for real-user title/rich-text, three-user late-join, revision
autosave recovery, async/server blocks, permissions/auth-locks, and
long-session large-doc, plus one strict-expansion HTTP large-lifecycle lane.

Lower-level graph residency is still narrow. `unit-property` has a current
HTTP polling canary row from `2026-05-24T00:19:43Z`, and `protocol-server` has
a current HTTP polling row sampled at `2026-05-24T00:07:17Z`. The lone
graph-counted `coverage-guided-lower-level` row is still stale rich-text CRDT
from `2026-05-21T11:14:10Z`. `transport-integration`, `backend-api`, and
standalone fuzz-only assertion work have no current graph-counted lane. Live
graph-counted fuzzing is therefore concentrated in browser/e2e, with bounded
active lower-level action evidence in `unit-property`, `protocol-server`, and
native parser/serialization smoke validation, stale
`coverage-guided-lower-level` residency in the plotted mix, and no live graph
evidence for `transport-integration`, `backend-api`, or `fuzz-assertion`.

Persona-loop evidence rejects the simple interpretation that graph-counted
rows equal trusted useful capacity. The latest level-mix synthesis asks for
deadline-mode tightening, not more fuzz volume: keep current browser/e2e lanes
running without backfilling under feedback-time full-disk pressure, keep
backend/API and protocol/server as one-lane sentinels, cap unit/property to
bounded replay, hold persistent lower-level fuzzing except bounded HTTP
polling replay/minimization, and keep fuzz-assertion held. It also says mix
totals are not yet trustworthy when stale roots are counted without live
PID/session evidence. The latest level-mix feedback-action agrees with that
interpretation: it chooses deadline-mode tightening, keeps backend/API and
protocol/server at
sentinel budget, caps unit/property to bounded replay/canary, holds persistent
coverage-guided lower-level and fuzz-assertion expansion, and terminalizes
PR07C owner-matrix work from current-head green owner evidence with
`product_owned_rows=0`. It also notes the fresh coverage-guided root had `11`
groups still starting and `0` running at `2026-05-24T00:39:20Z`, and observed
severe disk pressure at feedback time. The refreshed mix graph has `19`
browser/e2e is-latest lanes and the latest resource graph has `20.8GiB` free
on a `99.4%` used data volume; treat that as continued evidence for
disk-constrained, bounded-lane operation rather than broad expansion.

The latest native-harness synthesis selects
`coverage-guided-lower-level-block-parser-serialization` as the first bounded
Node/V8 parser/serialization harness and says the next engineering change is
to cap duplicate `RTC_BLOCK_PARSER_*` isolation/minimization before sustained
runs. The latest native-harness action file is empty, so the latest non-empty
action remains the bounded `20260523T232127Z` parser/serialization validation:
the bounded smoke wrote `supervisor-groups.json`, root/lane `events.ndjson`,
`seed-attempt-complete`, `coverageKeys=192`, `featureKeys=38`, and
`productYield=true`, and the ordinary unit-run gate skipped the fuzz target
without fuzz flags. It did not start an unbounded tmux loop because the parser
group is still held.
The graph-counted coverage-guided lower-level lane still remains the stale
rich-text CRDT row, and the latest execution buckets have zero
coverage-guided-lower-level executions, so this should not be read as
sustained coverage-guided lower-level residency. The latest protocol-server
synthesis selects `POST /wp-sync/v1/updates` through real REST dispatch and
durable post-meta storage as the first protocol/server target, with WebSocket
relay left as a later transport target. The latest protocol-server action file
is empty, so the latest non-empty action remains the bounded syntax/preflight
smoke that stopped at the global CPU admission gate. The graph has a current
`protocol-server-http-polling` row sampled at `2026-05-24T00:07:17Z` from the
review run and sustained recent protocol-server execution volume through the
`00:00` bucket.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The execution metric estimates individual test/case executions from lane
`events.ndjson`: browser seed attempts, unit/property fixed tests plus
generated cases, coverage-guided inputs, or protocol/backend cases.
Lower-level counts are approximate when reconstructed from batch metadata or
legacy batch-count fields.

Latest cumulative totals are approximately `4,831,353` browser/e2e,
`1,132,740` unit-property, `458,097` coverage-guided lower-level, and
`10,889,354` protocol-server executions. Transport-integration, backend-api,
fuzz-assertion, and other buckets are `0` in the reconstructed table.

The partial latest `2026-05-24T00:30:00Z` bucket has `18` browser/e2e
executions (`72`/hour), with zero unit-property, protocol-server,
coverage-guided-lower-level, backend-api, transport-integration, and
fuzz-assertion executions. The preceding `00:15` bucket had `26` browser/e2e
and `3` unit-property executions; `00:00` had `35` browser/e2e and `2,005`
protocol-server executions; `23:45` had `90` browser/e2e and `3,780`
protocol-server executions; `23:30` had `123` browser/e2e and `3,830`
protocol-server executions.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graph is a triage-output metric only. It counts non-duplicate
`.triage-watcher/**/result.json` rows classified `likely_real`, deduped by
canonical bug key and attributed to first-seen time. The latest collected
triaged likely-real output is still all browser/e2e: `168` likely-real
findings over about `803.4` runner-hours, or `20.91` per 100 runner-hours.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The broader unique-output graphs include untriaged raw signatures and
lower-level assertion failures. Current unique candidate output has `1,879`
raw candidates. The by-level rate table attributes `1,872` browser/e2e
candidates, `5` unit-property candidates, and `2` coverage-guided-lower-level
candidates. Backend-api, protocol-server, transport-integration, standalone
fuzz-assertion, and other buckets have no unique candidates in the latest
graph-counted data.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

Failure-candidate rates are pre-triage lead indicators, not confirmed bug
counts.

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

The latest weak-completion profiles have successful record counts at zero for
list-move refresh HTTP (`331` records) and collaboration UI signals (`1,649`
records). Current-run summary startup failures are `0`; the profile table has
some historical startup failures in individual profile rows, but live health
should continue to use the current-run summary metric above.
Table stale snapshot HTTP has `602` successful records from `924` records and
has cleared its `10`-record goal. Full profile has `16` from `207`,
long-session large-doc has `39` from `646`, common-blocks has `45` from `92`,
code-editor smoke has `64` from `80`, parser transform has `93` from `200`,
many-user lifecycle has `132` from `305`, parser serialization has reached
`150` from `514`, media cross-entity has `229` from `413`, three-user
late-join has `182` from `333`, async-server blocks has `155` from `966`,
revision persistence has `310` from `683`, the adjacent large-post three-user
HTTP profile has `226` successful records from `2,118` records,
permissions/auth-locks has `299` from `901`, block gauntlet has `662` from
`996`, real-user editing has `989` from `2,207`, multi-reload lifecycle has
`684` from `1,102`, session lifecycle has `2,091` from `3,297`, and
persistence-no-title has `1,397` from `2,633`.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

![Combined-ingredient fuzzing progress](rtc-jetstream2-fuzz-trends-20260515/plots/combined-ingredient-fuzz-progress.png)

![Combined-ingredient fuzzing goal progress](rtc-jetstream2-fuzz-trends-20260515/plots/combined-ingredient-fuzz-goal-progress.png)

![Combined-ingredient fuzzing count criteria](rtc-jetstream2-fuzz-trends-20260515/plots/combined-ingredient-fuzz-requirements.png)

The combined-ingredient graphs are generated by
`rtc-jetstream2-fuzz-trends-20260515/scripts/plot-rtc-jetstream2-fuzz-trends.R`
from the novelty-state feature key
`cross-product:large-post-three-user-http-lifecycle`. They track the strict
conjunction: HTTP polling, large initial post, at least three browser users,
lifecycle reloads, save/autosave checkpoints, strict persistence oracles, and
a passed run. Separate ingredient-lane hits do not increment this
cross-product count.

Latest combined progress is `0`/`25` strict cross-product records. The
combined group is now marked enabled in the sampled progress table, and the
adjacent large-post three-user HTTP profile has `2,118` records seen with
`226` successful records. Those adjacent hits still do not count as completed
combined coverage unless the strict feature key records the whole conjunction.

![Many-user active-editing progress](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-progress.png)

![Many-user active-editing cross-product goals](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-cross-products.png)

![Many-user active-editing count criteria](rtc-jetstream2-fuzz-trends-20260515/plots/many-user-active-editing-requirements.png)

The many-user active-editing graphs track distinct users who edited, not just
users present in a room. Active-editor counts exclude final UI
witness-sweep-only edits. Latest many-user active-editing progress is `0`/`25`
records at six active editors, `0`/`10` at ten active editors, `0`/`10` at
twelve active editors, and `0`/`3` at thirty active editors.

The rich/list, synced notes, HTTP polling, HTTP client-limit override,
same-user tabs, mixed same/distinct identities, revision restore, publish
transition, UI-signal, save/reload/autosave, concurrent
save/autosave/publish races, late-join, large-document, same-block contention,
note reply/resolve/delete lifecycle, WS reconnect/background churn, HTTP 413
compaction, title/content/excerpt boundary, visible remote delete,
code-editor embed stability, nested table awareness, and strict 30-user
operation-ledger cross-products remain `0` at the 6/10/12/30 active-editor
thresholds where they apply. The active-editing groups are not currently
marked enabled in the active-editing progress table.

Largest current unmet goal and active-editing gaps:

| Goal                                                        | Current | Target |
| ----------------------------------------------------------- | ------: | -----: |
| action ui-type-title next coverage tier                     |   1,735 |  2,000 |
| action ui-undo-redo-paragraph next coverage tier            |     649 |  1,000 |
| action ui-heading-shortcut next coverage tier               |     446 |    500 |
| action ui-format-paragraph next coverage tier               |     475 |    500 |
| successful real-user-editing records next coverage tier     |     989 |  1,000 |
| successful collaboration-ui-signals records                 |       0 |     25 |
| strict combined HTTP large-post three-user lifecycle        |       0 |     25 |
| many-user active-editing records                            |       0 |     25 |
| six-active-editor lifecycle cross-product                   |       0 |     25 |
| six-active-editor rich/list/lifecycle cross-product         |       0 |     25 |
| six-active-editor UI-signal cross-product                   |       0 |     25 |
| six-active-editor large-document cross-product              |       0 |     25 |
| six-active-editor visible remote delete cross-product       |       0 |     25 |
| six-active-editor code-editor embed stability cross-product |       0 |     25 |
| six-active-editor nested table awareness cross-product      |       0 |     25 |
| remote selection and cursor visible                         |       2 |     25 |
| async/server block core/template-part                       |       0 |     20 |
| ten-active-editor progress                                  |       0 |     10 |
| twelve-active-editor progress                               |       0 |     10 |
| six-active-editor synced-notes/lifecycle cross-product      |       0 |     10 |
| six-active-editor HTTP polling lifecycle cross-product      |       0 |     10 |
| HTTP client-limit override for active editing               |       0 |     10 |
| ten-active-editor lifecycle cross-product                   |       0 |     10 |
| twelve-active-editor lifecycle cross-product                |       0 |     10 |
| ten-active-editor rich/list/lifecycle cross-product         |       0 |     10 |
| twelve-active-editor rich/list/lifecycle cross-product      |       0 |     10 |
| ten-active-editor UI-signal cross-product                   |       0 |     10 |
| twelve-active-editor UI-signal cross-product                |       0 |     10 |
| ten-active-editor large-document cross-product              |       0 |     10 |
| twelve-active-editor large-document cross-product           |       0 |     10 |
| six-active-editor same-user-tab lifecycle cross-product     |       0 |     10 |
| six-active-editor revision-restore cross-product            |       0 |     10 |
| six-active-editor publish-transition cross-product          |       0 |     10 |
| six-active-editor mixed-identity lifecycle cross-product    |       0 |     10 |
| six-active-editor same-block contention cross-product       |       0 |     10 |
| six-active-editor note-thread lifecycle cross-product       |       0 |     10 |
| six-active-editor persistence-race cross-product            |       0 |     10 |
| six-active-editor WS reconnect/background cross-product     |       0 |     10 |
| six-active-editor HTTP 413 compaction cross-product         |       0 |     10 |
| six-active-editor post-field boundary cross-product         |       0 |     10 |
| twelve-active-editor synced-notes/lifecycle cross-product   |       0 |      5 |
| thirty-active-editor progress                               |       0 |      3 |
| thirty-active-editor 50-block documents                     |       0 |      3 |
| thirty-active-editor lifecycle cross-product                |       0 |      3 |
| thirty-active-editor rich/list/lifecycle cross-product      |       0 |      3 |
| thirty-active-editor UI-signal cross-product                |       0 |      3 |
| thirty-active-editor large-document cross-product           |       0 |      3 |
| strict 30-user operation ledger                             |       0 |      3 |

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
`PR 14` at `276`, followed by `PR 9` at `183`.

## PR-Focused Controller

![PR-focused controller current work state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-current-state.png)

![PR loop current queue depth](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-queue-depth-current.png)

The current PR-progress controller snapshot is populated again. The
state-count table has `35` counted items: `27` published ready-product rows,
`4` held-by-controller ready-product rows, `1` superseded ready-product row,
`1` runtime-held-consumed PR07C owner-matrix row, and `2` deferred-family rows
split across needs-product-decision and diagnostic states.

![PR-focused controller events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-controller-events.png)

![PR blocker and stall events over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-blocker-stall-events-over-time.png)

Use the blocker/stall timeline when asking whether exact-stack gates, deferred
family budget gates, resource reserve, single-flight guards, or repeated
critical-path continuations are slowing progress.

![Controller-publishable PR branch diff sizes](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-publishable-diff-size.png)

The current push manifest has `0` graph-counted publishable branches and `0`
publishable net LOC. The controller is populated, but its current rows do not
produce a graph-counted publishable filing surface.
The latest PR-split persona feedback rejects promoting `PR16-RLH` as fileable:
the ready prefix remains through `PR15C`, while `RLH-6000007-candidate` is
blocked pending strict seed `6000007` proof and owner rows. The feedback
requests exactly one bounded strict-head reproduction repair job for
`8fb598778357` / seed `6000007`.

![PR artifact index scope by source tree](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-scope.png)

![PR artifact index refresh size](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-growth.png)

The artifact index has `3,291` current artifact rows across `23` root/kind
buckets.

![Critical PR blocker state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-critical-blocker-state.png)

![PR loop blocked control decisions](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-blocked-control-decisions.png)

![Repeated critical-path branch validation results](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-repeated-validation-results.png)

![Repeated critical-path no-progress artifacts](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-no-progress-artifacts.png)

The critical-path blocker table has `6` rows: one runnable benchmark-canary
exact-stack promotion repair, one held deferred-family `reload-hydration` row,
and four terminal blockers (`PR17` seed `1020002`, PR07C owner-matrix
no-product evidence, `seed-5200005-reducer`, and `seed-1060015-reducer`). The
repeated no-progress summary now has three rows: benchmark-canary exact-stack
promotion blocked without active repair, benchmark-canary zero executor
artifact, and productive-analysis zero current input. The latest PR-split
feedback rejects `PR16-RLH` as fileable and says the strict seed `6000007`
repair job was launched but still pending; treat queued, held, or blocked rows
as unresolved until row-bearing owner evidence appears, while PR07C
owner-matrix should stay terminal unless newer current-head owner evidence
appears.

## Interpretation

The latest active current-output-dir accounting row is for
`run-20260524T004854Z`, and it is not trusted yet:
`current_run_metrics_trusted_last` is `FALSE`,
`pending_until_first_pass` is `TRUE`, and startup status says the monitor has
started but the full coverage pass is pending in the latest
`2026-05-24T00:49:03Z` sample. The latest completed full pass remains
`2026-05-24T00:08:16Z`, with about `40.8` minutes of sampled completed-pass
lag. The row carries forward completed-pass `duplicateShareCurrent` `0.0` and
summary startup failures `0`,
but the current-run signature, actionable-signature, product-evidence, and top
duplicate-share denominators are incomplete. It shows `0` active run dirs, no
supervisor-groups file value, and `21` observed roots. The prior trusted
`00:12:42Z` sample had a zero-signature denominator; the earlier `21:21:48Z`
trusted sample had a `1/1` duplicate/noise point. The live health
interpretation is therefore pending accounting/control-plane startup
completeness, not broad measured duplicate pressure.

The duplicate/noise persona evidence rejects a product-bug interpretation and
supports a control-plane producer-leak interpretation in the novelty-monitor
scheduler and supervisor publication path. The latest feedback-action says a
scheduler fix was applied and validated and saw duplicate share below
threshold; the last trusted graph sample was compatible with that, while the
new active run still needs its first full pass before the duplicate/noise rate
can be trusted. The remaining health item is producer/control-plane hardening:
preserve pause metadata, keep post-policy supervisor publication
authoritative, and keep startup-ish duplicate producers held unless there is
strong product evidence.

The resource picture is disk-constrained but no longer CPU/load-bound in the
newest sample: latest CPU utilization is `6.00%`, iowait is `0.01%`,
one-minute load is `3.67` on `64` logical CPUs with `0` blocked tasks, and
the data volume is `99.4%` used with `20.8GiB` free. Optional browser
admission should still respect load, iowait, and output-volume pressure.

The graph-counted fuzzing mix is browser/e2e-heavy but below the plotted
`24`-lane browser/e2e floor with `19` is-latest lanes across `19` groups. The
clearly current rows are the `11` coverage-guided lanes sampled at
`2026-05-24T00:39:19Z`: WebSocket block gauntlet, many-user lifecycle, and
many-user lifecycle completion, plus HTTP large-post readiness,
provider-persisted large-post, existing-post CRDT metadata, list-move refresh,
title-reload convergence, large-post lifecycle/completion, and table
stale-snapshot. The focused, gap-booster, and strict-expansion rows are older
is-latest rows. The latest level-mix synthesis rejects trusting stale raw row
counts until active-dir/current-root reconciliation and benchmark readiness are
fail-closed. It also says deadline-mode tightening should keep current
browser/e2e lanes running without backfill while disk pressure is severe. The
latest feedback-action agrees, keeping sentinel lower-level budgets,
terminalizing PR07C owner-matrix work from current-head green owner evidence
with `product_owned_rows=0`, and treating the fresh root's `11` starting
groups and `0` running groups as not safe for expansion.

Current lower-level evidence remains limited. Unit-property has a bounded HTTP
polling canary row and no executions in the latest partial bucket.
Protocol-server has a current HTTP polling row and recent execution volume,
including `2,005` executions in the `00:00` bucket, but the latest `00:30`
bucket has `0` protocol-server executions. The latest native-harness synthesis
selects the parser/serialization Node/V8 harness. The latest native action
file is empty, so the latest non-empty action remains the bounded parser
validation with event/supervisor accounting, `coverageKeys=192`,
`featureKeys=38`, and `productYield=true` without starting an unbounded lane.
The latest protocol-server synthesis selects the HTTP polling REST endpoint
through real REST dispatch and durable post-meta storage; the latest action
file is empty, so the latest non-empty protocol action remains the syntax
checks plus one-seed launcher smoke that stopped at the global CPU admission
gate. The graph-counted
coverage-guided lower-level residency is still the stale rich-text CRDT row and
recent execution buckets are zero, so only protocol-server has sustained
recent lower-level execution evidence. Transport-integration, backend-api, and
fuzz-assertion remain graph-inactive.

Browser/e2e remains the only level producing triaged likely-real findings in
the committed triage-output metric. The latest execution bucket has `18`
browser/e2e and `0` lower-level executions; the prior bucket had `26`
browser/e2e and `3` unit-property executions, and the `00:00` bucket had `35`
browser/e2e and `2,005` protocol-server executions.
Lower-level counts remain approximate where reconstructed from batch metadata
or legacy batch-count fields.

Coverage-goal pressure remains at the strict cross-product edges.
`cross-product:large-post-three-user-http-lifecycle` remains `0`/`25`, even
though the adjacent large-post three-user HTTP profile has `2,118` records and
`226` successful records; the combined group is marked enabled in the sampled
progress table, but separate ingredient hits still are not strict combined
coverage. Many-user active editing is also still `0` at the 6/10/12/30
active-editor thresholds. Those counts require distinct users who actually
edited, excluding final UI witness-sweep-only edits, not merely users present
in the room.

PR progress has current graph-counted controller state but no current
graph-counted filing surface: the controller has `35` counted items, while the
push manifest still has `0` publishable branches and `0` publishable net LOC.
Persona feedback still rejects `PR16-RLH` as fileable until strict seed
`6000007` reaches the final persistence oracle and owner rows prove it, and
the feedback-action says the bounded repair job is active with the report
still pending. The PR loop still needs to advance the runnable
benchmark-canary exact-stack repair, keep PR07C owner-matrix terminal unless
newer current-head owner evidence appears, and move held reload-hydration work
toward validated publishable branches instead of more blocked or no-progress
artifacts. The critical-path blocker table is `6` rows:
one active benchmark-canary coverage-promotion repair, one held
reload-hydration deferred-family row, one terminal PR07C owner-matrix
no-product row, one terminal `PR17` final-stack row, and two terminal
reducers; the no-progress summary has three rows, topped by benchmark-canary
exact-stack promotion blocked without active repair.
