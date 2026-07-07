# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-07-07T07:08:13Z`

This report summarizes the Jetstream2 RTC fuzzing, coverage-guidance,
resource, and PR-progress logs. The refreshed CSVs and plots are committed
under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

Source inputs include the coverage-guided run root, novelty state, PR split
review loop, standard persona-loop outputs, resource autoscaler disk samples,
PR progress controller snapshots, critical-path executor queues, and artifact
index snapshots. CPU and load-average CSVs are populated from sysstat when available and from resource-autoscaler telemetry on hosts without sysstat.

## High-Level Readout

The graph-refresh pipeline is current through the last completed monitor pass
at `2026-07-07T07:06:06Z`. There are `2,574` monitor
passes from `2026-06-23T12:08:03Z` onward. Cumulative coverage record
observations rose from `515` to
`103,420`, current-scan coverage files rose from
`890` to `4,693`, and
unmet goals are `11` of `162`.

Live health needs a bounded read. The latest plotted current-output duplicate
share is `0.3333`, while historical duplicate
share is `0.2143`. Current summary startup
failures are `0`, quality issues are
`0`, and free memory is
`176.4GiB`. Because this snapshot has no
`current_run_accounting.csv`, treat the current duplicate/noise value as a
current-output signal that needs direct current-run triage, not as broad proof
of product duplicate failures.

The latest CPU/load telemetry sample has CPU utilization `63.3`, load1/load5/load15 `65.49`/`65.21`/`61.55`, and `64` logical cores.

The latest disk sample is `2026-07-07T07:06:42Z`: root has `66.9GiB` free and is `52.9%` used; the data volume has `277.6GiB` free and is `92.2%` used.

The latest graph-counted fuzzing mix is: `browser-e2e=29 lanes/24 groups; protocol-server=1 lanes/1 groups`.
Browser/e2e remains the dominant live surface, with bounded lower-level and
protocol-server coverage still active.

Approximate execution counts now total
`13,130,421` individual test or case executions.
The latest cumulative/rate summary is:
`browser-e2e=19361 cumulative/364 per-hour; transport-integration=0 cumulative/0 per-hour; unit-property=0 cumulative/0 per-hour; coverage-guided-lower-level=0 cumulative/0 per-hour; backend-api=0 cumulative/0 per-hour; protocol-server=13111060 cumulative/0 per-hour; fuzz-assertion=0 cumulative/0 per-hour; other=0 cumulative/0 per-hour`. Some lower-level rows are approximate
because they are reconstructed from batch metadata or legacy batch-count fields.

Bug and candidate output graphing is current. The latest summary has
`269` triaged bug-finding rows,
`111` unique likely-real findings,
`673` bug-output rows, and
`540` unique output candidates.

PR-controller graph inputs are present. The controller snapshot has
`22` items:
`deferred-family/downscoped/medium=2; ready-product-pr/held-by-controller/high=3; ready-product-pr/published/high=14; ready-product-pr/superseded/low=1; ready-product-pr/superseded-by-repair/low=1; runtime-gated-pr/runtime-held-consumed/high=1`. The artifact index contributes
`5,042` rows. The critical-path snapshot has
`9` blockers:
`active=2; runnable=2; terminal=5`.

The suggested PR net-LOC graph has
`1` snapshot with a latest total of
`4,583` net LOC. Treat it as a size
signal for current split shape, not filing readiness.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

## Health And Resources

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

CPU and load plots are populated from the best available host telemetry source.
The disk free-space data is populated in `data/disk_free_space.csv`.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Coverage Surface

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

![Feature coverage by category](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

![Coverage goal progress](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current enabled groups: `novelty-ws-real-user-editing,novelty-http-plain-editor-product-smoke,novelty-http-real-world-editor-usability,novelty-ws-same-user-lifecycle,novelty-ws-same-user-separate-context-lifecycle,novelty-http-rtc-reference-oracle,novelty-ws-thirty-user-lifecycle,novelty-ws-thirty-user-lifecycle-completion,novelty-ws-collaboration-ui-signals,novelty-ws-real-user-rich-text,novelty-ws-many-user-lifecycle-completion,novelty-ws-many-user-lifecycle,novelty-ws-revision-recovery,novelty-http-table-stale-snapshot,novelty-http-large-post-lifecycle-completion,novelty-http-large-post-lifecycle,novelty-http-title-reload-convergence,novelty-http-existing-post-crdt-metadata,novelty-ws-parser-transform,novelty-ws-multi-reload-lifecycle,novelty-ws-media-cross-entity-completion,novelty-ws-three-user-late-join,novelty-ws-structure,novelty-ws-real-user-coverage-bridge,novelty-ws-real-user-save-reload,novelty-ws-common-blocks,novelty-ws-block-gauntlet,novelty-ws-async-server-blocks,novelty-ws-long-session-large-doc,novelty-http-persistence-probe`.

The largest unmet goals are tracked in `data/coverage_goals.csv`; review that
CSV with the coverage-goal plot before adding another broad class of actions.

## Fuzzing Mix And Executions

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

![Fuzz executions cumulative by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

## Effectiveness

![Likely-real bug effectiveness by level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-likely-real-by-level.png)

![Likely-real bug effectiveness by profile within level](rtc-jetstream2-fuzz-trends-20260515/plots/bug-effectiveness-by-profile-within-level.png)

![Failure-candidate effectiveness by level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-level.png)

![Failure-candidate effectiveness by profile within level](rtc-jetstream2-fuzz-trends-20260515/plots/failure-candidate-effectiveness-by-profile-within-level.png)

![Unique bug-output cumulative by level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-level.png)

![Unique bug-output rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-level.png)

![Unique bug-output cumulative by profile within level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-cumulative-by-profile-within-level.png)

![Unique bug-output rate by profile within level](rtc-jetstream2-fuzz-trends-20260515/plots/unique-bug-output-rate-by-profile-within-level.png)

![Profile success scatter](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

![Successful actions by profile](rtc-jetstream2-fuzz-trends-20260515/plots/successful-actions-by-profile.png)

## PR Progress

![PR review loop events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-events.png)

![PR review loop durations](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-durations.png)

![PR progress current state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-current-state.png)

![PR progress controller events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-controller-events.png)

![PR loop current queue depth](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-queue-depth-current.png)

![PR loop blocked control decisions](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-blocked-control-decisions.png)

![PR progress publishable diff size](rtc-jetstream2-fuzz-trends-20260515/plots/pr-progress-publishable-diff-size.png)

![PR artifact index growth](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-growth.png)

![PR artifact index scope](rtc-jetstream2-fuzz-trends-20260515/plots/pr-artifact-index-scope.png)

![PR critical blocker state](rtc-jetstream2-fuzz-trends-20260515/plots/pr-critical-blocker-state.png)

![PR loop no-progress artifacts](rtc-jetstream2-fuzz-trends-20260515/plots/pr-loop-no-progress-artifacts.png)

The current controller has `2`
publishable branches and `1,253` net LOC
in `data/pr_progress_push_manifest.csv`; publication remains policy-gated
unless the controller and critical-path evidence agree.

## Suggested PR Size

![Suggested PR total net LOC over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-total-net-loc-over-time.png)

![Suggested PR net LOC by PR over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-net-loc-by-pr-over-time.png)

The latest suggested split totals `4,583`
net LOC. This graph should be read with the PR controller and critical-path
state above; size alone does not imply that a branch is fileable or publishable.

## Interpretation To Challenge

- Treat current-run duplicate/noise separately from historical aggregate
  duplicate/noise.
- Because `current_run_accounting.csv` is absent, verify the current output root
  directly before making broad claims from `duplicateShareCurrent=0.3333`.
- Prioritize completion-depth fixes for profiles with many records but low
  success rate before adding another broad class of actions.
- Challenge whether the current fuzzing mix is too browser/e2e-heavy. If it is,
  propose a bounded lower-level target with a clear oracle instead of merely
  adding more browser lanes.
- Keep PR publication decisions tied to controller, critical-path, and
  branch-audit evidence, not to graph shape alone.
