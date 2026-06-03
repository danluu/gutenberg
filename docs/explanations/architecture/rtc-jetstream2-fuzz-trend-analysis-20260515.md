# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-06-03T07:16:55Z`

This report summarizes the Jetstream2 RTC fuzzing, coverage-guidance,
resource, and PR-progress logs. The refreshed CSVs and plots are committed
under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

Source inputs include the coverage-guided run root, novelty state, PR split
review loop, standard persona-loop outputs, resource autoscaler disk samples,
PR progress controller snapshots, critical-path executor queues, and artifact
index snapshots. CPU and load-average CSVs are present but empty in this
snapshot, so current CPU/load values are unavailable from the committed graph
data.

## High-Level Readout

The graph-refresh pipeline is current through the last completed monitor pass
at `2026-06-03T07:02:34Z`. There are `5,544` monitor passes from
`2026-05-15T01:21:42Z` onward. Cumulative coverage record observations rose
from `782` to `397,201`, current-scan coverage files rose from `272` to
`10,837`, and unmet goals are `34` of `136`.

Live health needs a bounded read. The latest plotted current-output duplicate
share is `1`, while historical duplicate share is `0.4444`. Current summary
startup failures are `0`, quality issues are `0`, and free memory is `226GiB`.
Because this snapshot has no `current_run_accounting.csv`, treat the current
duplicate/noise value as a current-output signal that needs direct current-run
triage, not as broad proof of product duplicate failures.

The latest disk sample is `2026-06-03T07:16:15Z`: root has `118.6GiB` free and
is `16.4%` used; the data volume has `248.6GiB` free and is `93.0%` used.

The latest graph-counted fuzzing mix has `27` lanes: `24` browser/e2e lanes,
`1` unit-property lane, `1` coverage-guided-lower-level lane, and `1`
protocol-server lane. Browser/e2e remains the dominant live surface, with
bounded lower-level and protocol-server coverage still active.

Approximate execution counts now total `18,634,563` individual test or case
executions. The latest cumulative counts are `692,655` browser/e2e,
`5,838,464` unit-property, `623,766` coverage-guided-lower-level, and
`11,479,678` protocol-server. Some lower-level rows are approximate because
they are reconstructed from batch metadata or legacy batch-count fields.

Bug and candidate output graphing is current. The latest summary has `334`
triaged bug-finding rows, `195` unique likely-real findings, `1,761` bug-output
rows, and `1,422` unique output candidates. Browser/e2e is the only level with
likely-real findings in this snapshot; coverage-guided-lower-level and
unit-property contribute smaller unique-candidate output counts.

PR-controller graph inputs are now present. The controller snapshot has `22`
items: `13` published high-priority ready-product PRs, `4` high-priority
ready-product PRs held by controller policy, `1` superseded PR07C row, `1`
runtime-held PR07C owner-matrix row, and `3` deferred-family rows. The
artifact index contributes `5,042` rows. The critical-path snapshot has `8`
blockers: `1` active, `1` held, `1` runnable, and `5` terminal.

The suggested PR net-LOC graph has `1` snapshot with a latest total of `4,583`
net LOC. Treat it as a size signal for current split shape, not filing
readiness.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

## Health And Resources

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

CPU and load plots are kept in place for continuity, but the current committed
CSV inputs contain only headers. The disk free-space data is populated in
`data/disk_free_space.csv`.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Coverage Surface

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

![Feature coverage by category](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

![Coverage goal progress](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current enabled groups:

- `novelty-http-rtc-reference-oracle`
- `novelty-http-large-post-lifecycle`
- `novelty-http-title-reload-convergence`
- `novelty-http-same-user-stale-draft`
- `novelty-http-table-stale-snapshot`
- `novelty-http-existing-post-crdt-metadata`
- `novelty-http-persistence-probe`
- `novelty-ws-parser-serialization`

The largest unmet goals are real-user editing, media/cross-entity completion,
three-user late-join completion, local autosave, autosave checkpoints, several
gauntlet blocks, 12-user sessions, and HTTP table stale-snapshot coverage.

## Fuzzing Mix And Executions

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

![Fuzz executions cumulative by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The latest execution-rate sample is quiet for most lower-level surfaces:
browser/e2e shows `4` per hour, while transport-integration, unit-property,
coverage-guided-lower-level, backend-api, protocol-server, fuzz-assertion, and
other all show `0` per hour in the latest bucket.

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

Weak completion profiles in the current snapshot are `async-server-blocks`,
`long-session-large-doc`, `permissions-auth-locks`,
`large-post-three-user-http-lifecycle`, and `full`.

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

The current controller has no publishable branches in
`data/pr_progress_push_manifest.csv`; publication remains policy-gated rather
than graph-authorized. Blocked decisions include publish-ready, repair-branch,
and owner-matrix rows.

## Suggested PR Size

![Suggested PR total net LOC over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-total-net-loc-over-time.png)

![Suggested PR net LOC by PR over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-net-loc-by-pr-over-time.png)

The latest suggested split totals `4,583` net LOC. This graph should be read
with the PR controller and critical-path state above; size alone does not imply
that a branch is fileable or publishable.

## Interpretation To Challenge

- Treat current-run duplicate/noise separately from historical aggregate
  duplicate/noise.
- Because `current_run_accounting.csv` is absent, verify the current output root
  directly before making broad claims from `duplicateShareCurrent=1`.
- Prioritize completion-depth fixes for profiles with many records but low
  success rate before adding another broad class of actions.
- Challenge whether the current fuzzing mix is too browser/e2e-heavy. If it is,
  propose a bounded lower-level target with a clear oracle instead of merely
  adding more browser lanes.
- Keep PR publication decisions tied to controller, critical-path, and
  branch-audit evidence, not to graph shape alone.
