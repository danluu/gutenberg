# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-18T15:53:02Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state through `2026-05-18T15:48:39Z`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` through `/var/log/sysstat/sa18`, latest sample
  `2026-05-18T15:50:00Z`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

Coverage intake is still moving. Across `2271` monitor passes from
`2026-05-15T01:21:42Z` through `2026-05-18T15:48:39Z`, coverage files grew from
`272` to `53834`, a delta of `53562`. The monitor's visible likely-real maximum
reached `4`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `131` total goals and `4` unmet goals: real-user
save/reload depth, real-user editing completion, and reload-post action depth.

The latest plotted live health point is clean on the current-output-dir metric:
current summary startup failures are `0` and `duplicateShareCurrent=0`. All of
the latest ten current-output duplicate-share samples were clean after the
`2026-05-18T14:13:44Z` regression. The latest pass has `0` quality issues, `0`
warnings, `402.6G` free memory, `no_progress=0`, and `headroom=false`. This
report uses current-output duplicate/noise and summary startup failures for
live health. Historical aggregate duplicate/noise is context only; its latest
duplicate share is `0.3419` and is not the plotted live health signal.

Persona-loop evidence is treated as evidence to evaluate, and it rejects a
durable recovery read. The latest duplicate/noise synthesis file,
`20260518T153904Z`, is empty; the latest non-empty synthesis,
`20260518T152708Z`, says strict no-product startup stalls are mostly suppressed
before expensive analysis but still leak into producer scheduling: novelty can
treat suppressed startup counters as a current duplicate/noise hold and drain
productive mixed runs. The latest feedback-action, `20260518T145858Z`,
implemented the bounded consumer-side family cap, restarted analysis, and
measured the moving current root with `rawSignatures=1`,
`noProductQueuedOrRunning=0`, `productEvidenceQueuedOrRunning=1`, and zero deep
jobs. The refreshed graph has startup failures still suppressed and latest
current-output duplicate share at `0`, but the synthesis means the right read is
improving live health, not durable recovery yet.

The PR-split persona loop still rejects a filing-ready interpretation. The
latest synthesis, `20260518T153253Z`, says the active replacement remains the
Cycle370/Cycle372 decision-fork shape: `PR02B` is a blocked-validation sidecar
and `PR07` is not a linear tail. It says the `20260518T153610Z` finalization is
zero-byte evidence and the post-`152607` state is not durable publish proof
until a fresh bundle, manifest, head, base-allowlist, local-publish, and
deferred-freshness audit passes. Broad final-stack fuzzing, GitHub filing, and
rebuilt stack-wide validation remain blocked by `1020002`, while bounded PR02B,
PR07 owner-matrix, diagnostic replay, post-152607 audit, and loop-repair work
should continue. The latest feedback-action, `20260518T150146Z`, passed the
post-150601 audit with `0` hard failures and `6` warnings, but it still keeps
`PR02B`, `PR07`, filing, and full-stack validation deferred.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The bottom facet is the operational queue: unmet goals fell from `24` to `5`
after restarts, expansion, and auto-ratcheting, and then to `4` in the latest
sample. The top facet shows continued coverage-file growth to `53834` files.
Dense monitor-pass points are intentionally small and partially transparent so
repeated samples do not visually turn into a misleading line.

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

Per-pass yield is split out from cumulative state. `processed`, `new_features`,
`new_cdp`, and coverage-file deltas are shown on a `log1p` scale. Negative
coverage-file deltas are reset/restart artifacts and are marked separately.

## Health And Yield

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

The latest plotted live sample uses current-output-dir duplicate/noise metrics
and summary startup failures: `duplicateShareCurrent=0`, current summary startup
failures `0`, quality issue count `0`, warning count `0`, free memory `402.6G`,
`no_progress=0`, and `headroom=false`. All latest ten current-output
duplicate-share samples were clean, and startup failures remain suppressed, but
the `2026-05-18T14:13:44Z` duplicate-share regression and persona-loop
scheduler concern mean this is not durable recovery. The health graph does not
use historical aggregate duplicate/noise as the plotted live signal.

The enabled-groups summary field has only `novelty-ws-long-session-large-doc` in
the latest collection, so full current surface state is read from
supervisor/lane snapshots in the level-mix section rather than from the
historical enable log alone. The latest non-empty duplicate/noise synthesis
rejects reading startup-failure suppression as full recovery by itself and points to
novelty producer scheduling that can still treat suppressed startup noise as a
current hold for mixed product-evidence work. The next check is sustained low
current-output duplicate share while useful fuzzing advances, not whether
historical aggregate duplicate/noise falls.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-18T15:50:00Z` show bursty CPU. The
latest 25 CPU samples range from `67.16%` to `86.24%` utilization, with the
latest sample at `82.80%`. Over those same 25 samples, one-minute load exceeded
the `64` logical CPU count in `20` windows, five-minute load in `23`,
15-minute load in `23`, and at least one load window exceeded it in `24`. The
newest 1/5/15-minute load sample is `80.50`, `86.88`, and `90.66`; all three
latest load windows are above the logical CPU count, with `1` blocked task in
the latest sample.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers same-user/reload lifecycle,
revision/autosave/recovery, real UI rich text, parser/serialization transforms,
async/server-backed blocks, permissions/auth/locks, persistence, and long/large
sessions. Recent enable events include `novelty-ws-async-server-blocks`,
`novelty-ws-permissions-auth-locks`, `novelty-ws-long-session-large-doc`, and
`novelty-ws-media-cross-entity`. The refreshed summary's
`enabled_groups_current` value is only `novelty-ws-long-session-large-doc`, so
current surface state is read from supervisor/group snapshots and lane events
rather than from the historical enable log alone.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. The latest plotted `is_latest` mix
shows `26` browser/e2e lanes across `26` groups, plus `1` `unit-property` lane
and `1` `coverage-guided-lower-level` lane.

Live fuzzing remains concentrated in browser/e2e lanes in the committed graph:
`26` of the latest `28` graph-visible lanes are browser/e2e. The graph-visible
lower-level activity is narrow: one `unit-property` lane and one
`coverage-guided-lower-level` lane. `transport-integration` has historical
execution/output data but no current counted rate. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` remain at `0` in the
committed graph counters, even though persona-loop action evidence reports
backend oracle work, protocol-server validation, and browser-gated fuzz-only
assertions.

The persona-loop evidence is more specific than the plotted lane mix and partly
contradicts it. The latest level-mix synthesis, `20260518T154021Z`, says not to
change lane counts now: keep browser/e2e protected at `>=24` active dirs, cap
non-browser lanes at one each, and fix fuzz-assertion heartbeat/accounting
before trusting that lane as active. It treats the next change as telemetry and
query-array canonicalization, not broad capacity movement. The latest
feedback-action, `20260518T150406Z`, reports a clean persona-context mix:
`browser-e2e=26`, plus `backend-api`, `coverage-guided-lower-level`,
`fuzz-assertion`, `protocol-server`, and `unit-property` all active at one lane.
It also reports `1024` table/query-array lower-level executions and `22` unique
canonical outputs. The committed graph still shows only the collector-visible
`26` browser/e2e lanes, one `coverage-guided-lower-level` lane, and one
`unit-property` lane, so the right read is "browser-heavy in the graph with
active lower-level/backend/protocol/assertion evidence in persona context", not
"safe to rebalance broadly."

The latest native-harness synthesis, `20260518T153435Z`, keeps the rich-text
CRDT multiblock harness as the first ready isolated coverage-guided-lower-level
target and says to label it honestly as `v8-node-coverage-guided-mutator`, not
AFL/libFuzzer. The latest action, also `20260518T153435Z`, adopted the harness,
validated root/lane `events.ndjson`, reported
`fuzzLevel: "coverage-guided-lower-level"`, `testExecutionCount=2`, `334`
coverage keys, `107` feature keys, and a successful build. It did not start a
duplicate rich-text long run because table/query-array lower-level was already
the active held lane. The committed graph has one
collector-visible coverage-guided-lower-level lane but `0` current lower-level
execution rate in the latest bucket, so this is active persona-loop evidence
rather than sustained trend evidence.

The latest protocol-server synthesis, `20260518T153507Z`, keeps the HTTP
polling REST endpoint harness first, through real REST dispatch,
`WP_HTTP_Polling_Sync_Server`, and `WP_Sync_Post_Meta_Storage`. The latest
action, also `20260518T153507Z`, put the harness in place, fixed no-summary
infra accounting to count `0` executed cases, passed syntax/style/PHPCS and a
bounded tmux smoke on `WP_ENV_PORT=9540`, and verified root/lane `events.ndjson`
with `fuzzLevel: "protocol-server"` for two passing seeds of `16` cases each.
The graph still has `0` protocol-server cumulative executions and no current
protocol rate. Protocol work is therefore strong persona-loop evidence but not
collector-visible sustained trend evidence. The latest fuzz-only assertion
apply file, `20260518T141616Z`, is empty; the latest non-empty apply,
`20260518T123807Z`, added three browser-gated diagnostics and restarted
affected browser fuzz loops. Standalone `fuzz-assertion` executions remain `0`
in the graph.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The current execution metric is estimated individual test/case executions
derived from lane `events.ndjson` files: browser seed attempts, unit/property
fixed tests plus generated fuzz cases, coverage-guided lower-level inputs, or
protocol/backend cases. Rechecks count as executions. This is more precise than
supervisor launches or lane counts, but it only covers fuzzers that emit lane
events. Lower-level counts are approximate when reconstructed from batch
metadata or legacy batch-count fields.

The latest collected execution data has about `5,789,150` completed test
executions: `220,721` browser/e2e, `3,006` transport/integration, `5,117,600`
unit-property, and `447,823` coverage-guided-lower-level. The latest partial
15-minute bucket reports about `3,392` browser/e2e test executions/hour and
`6,784` unit-property executions/hour, with `0` current rate for
coverage-guided-lower-level, transport/integration, backend/API,
protocol-server, and standalone `fuzz-assertion`. `backend-api`,
`protocol-server`, and standalone `fuzz-assertion` remain at `0` cumulative
executions in this counter despite persona-loop evidence for backend oracle
work, protocol validation, and browser-gated/audited fuzz-only assertion work.

## Fuzz Output Effectiveness

![Triaged likely-real output rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

The likely-real graphs are triage-output metrics only. They count only
non-duplicate `.triage-watcher/**/result.json` rows classified `likely_real` per
100 runner-hours, deduped by canonical bug key and attributed to the failure
first-seen time. They are not total bug-finding graphs, not per-core
efficiency, and not a count of all bugs found by fuzzing.

On that triage-output metric, browser/e2e currently dominates: `762` unique
likely-real findings over about `2,390.9` runner-hours, or `31.87` per 100
runner-hours. `transport-integration`, `unit-property`,
`coverage-guided-lower-level`, `backend-api`, `protocol-server`, and standalone
`fuzz-assertion` still have `0` triaged likely-real outputs in the collected
triage rows. That does not prove the lower-level lanes are unproductive; it
means their findings have not yet flowed through the same non-duplicate
likely-real triage result path.

![Unique bug-output candidates by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output candidate rate by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

The unique bug-output candidate graphs are broader. They dedupe non-infra
`likely_real` or `uncertain` triage rows, untriaged raw browser/transport
failure signatures, and lower-level assertion failures by canonical output key.
These graphs are intentionally broader than confirmed bugs and narrower than
raw failed attempts; untriaged candidates are not confirmed bugs.

Current unique bug-output candidate rates are: browser/e2e `6,054` candidates
over `2,390.9` runner-hours (`253.21` per 100 runner-hours),
transport/integration `106` over `59.5` runner-hours (`178.14` per 100
runner-hours), coverage-guided lower-level `2` over `20.9` runner-hours
(`9.55` per 100 runner-hours), and unit/property `5` over `42.5` runner-hours
(`11.75` per 100 runner-hours). `backend-api`, `protocol-server`, standalone
`fuzz-assertion`, and `other` remain at `0` in this candidate-output metric.

![Unique bug-output candidates within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output candidate rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

Within the latest per-profile rows, browser/e2e likely-real triage output is
led by session lifecycle (`199`), three-user late join (`126`), real-user
editing (`102`), permissions/auth/locks (`88`), and parser serialization (`46`).
The broader unique-output candidate view is led by three-user late join (`832`),
session lifecycle (`777`), real-user editing (`710`), revision persistence
(`544`), and permissions/auth/locks (`473`), with lower-level lanes showing only
small nonzero candidate totals so far.

![Failure-candidate effectiveness by fuzzing level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

The failure-candidate plot is a pre-triage lead indicator: failed seed or batch
attempts per 100 runner-hours before duplicate/noise triage. It is useful for
comparing where the system is still producing interesting work before
duplicate/noise analysis, but it is not a confirmed bug count. Current rates
are about `8186.1` for browser/e2e, `4537.5` for transport/integration, `759.3`
for coverage-guided lower-level, and `1688.0` for unit/property.

![Triaged likely-real output rate within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness within fuzzing levels](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

Lower-level and transport lanes should continue to be judged partly by the
unique-output candidate graphs until their triage pipeline is producing
comparable likely-real and non-duplicate results.

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

Low-completion profiles are still the next depth targets:

| Profile | Seen | Successful | Startup failures | Success rate |
| --- | ---: | ---: | ---: | ---: |
| `full` | 840 | 18 | 0 | 2.1% |
| `multi-reload-lifecycle` | 3966 | 161 | 0 | 4.1% |
| `revision-persistence` | 6473 | 280 | 0 | 4.3% |
| `parser-serialization` | 3984 | 251 | 0 | 6.3% |
| `real-user-editing` | 8675 | 611 | 0 | 7.0% |
| `common-blocks` | 4772 | 500 | 0 | 10.5% |
| `parser-transform` | 5101 | 549 | 0 | 10.8% |
| `long-session-large-doc` | 3870 | 593 | 0 | 15.3% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `block-gauntlet` | 7109 | 1333 | 0 | 18.8% |
| `session-lifecycle` | 9362 | 2730 | 0 | 29.2% |
| `media-cross-entity` | 501 | 160 | 0 | 31.9% |
| `three-user-late-join` | 11230 | 3928 | 0 | 35.0% |
| `persistence-no-title` | 3928 | 1376 | 0 | 35.0% |

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| action reload-post-action next 2000 tier | 1127 | 2000 |
| real-user title save/reload next 1000 tier | 582 | 1000 |
| successful real-user-editing records next 1000 tier | 611 | 1000 |
| real-user body save/reload next 1000 tier | 641 | 1000 |

The remaining queue mixes real-user save/reload lifecycle depth, real-user
editing completion, and reload-post action depth.

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

The highest-volume feature categories are history, operation-ledger, invariant,
action pairs, block depth, block, action, other, transport, collaborator,
revision, and payload-size observations. The plot separates breadth (`keys`)
from repeated observations (`total_count`) so broad coverage is not hidden
inside raw event volume.

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
took roughly `8.1` to `15.4` minutes in this snapshot. The newest completed
review cycle, `20260518T153253Z`, took `9.8` minutes.

The latest synthesis rejects a filing-ready interpretation. It says the split
is not fileable and should use the Cycle370/Cycle372 decision-fork shape.
`PR02B` stays a blocked-validation sidecar, and `PR07` stays a decision fork.
Raw `PR07D`, raw `deferred/*`, `PR17`, `PR18`, `PR18x`, stale/fallback
manifests, and zero-byte reports remain rejected. The synthesis says
`20260518T153610Z` is zero-byte evidence and the post-`152607` state is
unaudited until a fresh bundle, manifest, head, base-allowlist, local-publish,
and deferred-freshness audit passes. Broad final-stack fuzzing, GitHub filing,
and rebuilt stack validation remain deferred behind seed `1020002`;
independent PR07 owner-matrix work, PR02B validation, post-152607 audit,
targeted diagnostics, and loop durable progress repair should continue. The
latest feedback-action passed the post-150601 audit with `0` hard failures and
`6` warnings, but it still keeps filing and final-stack validation deferred.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-18T15:43:50Z`, has `10`
suggested rows totaling `4,114` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 13A` (`1126`), `PR 13C` (`294`), `PR 14` (`276`),
`PR 9` (`183`), `PR 1` (`162`), `PR 4` (`159`), `PR 10` (`141`), `PR 3`
(`53`), and `PR 2` (`52`). These charts remain size telemetry from parsed
status snapshots, not filing authority for split shape.

## Interpretation

The graph remains positive on coverage intake and goal reduction, and the
latest live health point is clean, but the run is not yet durable. The latest
plotted duplicate/noise sample uses the current-output-dir metric: startup
failures are `0` and current-output duplicate share is `0`.
`2026-05-18T14:13:44Z` briefly regressed to duplicate share `1`, but the latest
sample is clean. The latest full health sample has `headroom=false`, quality
issues `0`, warnings `0`, `no_progress=0`, and `402.6G` free memory. The latest
sysstat 1/5/15-minute load windows are `80.50`, `86.88`, and `90.66`; all three
are above the `64`
logical CPU count. Historical aggregate duplicate/noise is not the live health
signal.

The duplicate/noise persona loop rejects converting startup-failure suppression
into a durable recovery claim. The graph now shows startup failures still
suppressed and latest current-output duplicate share back at `0`. The latest
synthesis points specifically at novelty producer scheduling treating suppressed
startup noise as a current hold for mixed product-evidence work, so more monitor
passes and the scheduler fix are needed before
claiming recovery.

The PR-split persona loop rejects filing or broad final-stack fuzzing. The
latest synthesis says the split needs the Cycle370/Cycle372 decision-fork
shape, PR02B remains blocked-validation work, PR07 remains a decision fork with
unresolved ownership, the `153610` finalization is zero-byte evidence, and the
post-`152607` state is unaudited until a fresh bundle/manifest/head audit
passes. Seed `1020002` still blocks final-stack fuzzing, filing, and rebuilt
stack-wide validation, but not independent PR02B audit, PR07 owner work,
deferred-bundle audit, targeted diagnostics, or loop repair. The latest
feedback-action says the post-150601 audit passed with warnings, but that does
not make the split filing-ready.

The committed fuzzing graph is still browser/e2e-heavy: `26` current browser/e2e
lanes across `26` groups, `1` `unit-property` lane, and `1`
`coverage-guided-lower-level` lane. Transport is historical-only in the latest
rate, and `protocol-server`, `backend-api`, and standalone `fuzz-assertion` are
still zero in the trend counters. Persona-loop feedback says not to rebalance
broadly: keep browser/e2e at or above `24`, cap the other levels at one lane
each, and use current-root/status/events reconciliation before trusting a mix
decision. Native-harness evidence reports a validated rich-text CRDT lower-level
harness, while level-mix feedback reports audited backend/API, browser,
lower-level, fuzz-assertion, protocol/server, and unit/property lanes in persona
context, including a table/query-array lower-level lane with `1024` executions
and `22` unique canonical outputs. Protocol action evidence reports a bounded
validated HTTP polling REST harness with `fuzzLevel: "protocol-server"` and two
passing `16`-case seeds, and fuzz-only assertion evidence reports three newer
browser-gated diagnostics.
Collector-visible trend counters still show zero current lower-level rate and
zero protocol/backend/assertion executions. The latest execution-rate bucket has
`3,392` browser/e2e executions/hour and `6,784` unit-property executions/hour;
coverage-guided-lower-level, transport-integration, backend/API,
protocol-server, and standalone `fuzz-assertion` are at `0` current rate in the
committed counters. The next narrow checks are
sustained current-output duplicate/noise health, collector-visible backend,
protocol, or assertion counts, continued lower-level output accounting, and the
`1020002` blocker before any filing or final-stack claim.
