# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T13:10:35Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest novelty state:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T121121Z/novelty-state.json`
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1503` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T13:10:03Z`, coverage files grew from `272` to `32170`, a delta of
`31898`. The monitor's visible likely-real count stayed at `0` throughout this
window.

Coverage-goal pressure changed in phases. The monitor log shows unmet coverage
goals falling from `24` to `0` earlier in the run, then rising again when new
surfaces and auto-ratcheted targets were enabled. The latest copied
coverage-guidance state has `120` total goals and `7` unmet goals.

The run has broad historical coverage, but the current active output directory
is `run-20260516T121121Z` and remains a live-health check, not a mature sample.
The latest copied enabled set is `novelty-ws-lifecycle`,
`novelty-http-persistence-probe`, `novelty-ws-real-user-editing`,
`novelty-ws-real-user-rich-text`, `novelty-ws-block-gauntlet`,
`novelty-ws-common-blocks`, `novelty-ws-parser-transform`, and
`novelty-ws-async-server-blocks`. The latest current-output-dir health sample
has `duplicateShareCurrent` `0`, summary startup failures `0`, quality issues
`1`, warnings `1`, and resource headroom true. That latest point is cleaner than
the two preceding startup-noisy samples, but it is one live point, not proof
that duplicate/noise is resolved. Persona evidence also rejects treating
duplicate/noise as resolved: the latest duplicate/noise synthesis,
`20260516T125511Z`, says strict no-user/no-action startup stalls still need one
shared pre-analysis predicate in triage and analysis. The latest duplicate/noise
feedback-action file, `20260516T123229Z`, edited only the novelty monitor: it
made startup probation profile-scoped, restarted
`rtc-coverage-guided-novelty`, paused `novelty-ws-common-blocks`, and left the
triage and analysis-tier suppression work unapplied. The main remaining
coverage gaps are depth targets for real-user editing, gauntlet blocks, CDP
coverage records, reload-post actions, and the heading shortcut action.
Previously weak media/cross-entity, parser-serialization, and
paragraph-formatting targets have improved enough that they are no longer in the
unmet-goal table, but their completion rates remain worth watching.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The important trend is the bottom facet: unmet goals trended down materially,
then rose after the latest surface expansion. The top facet shows the coverage
file corpus growing steadily after restarts and expansions. Dense monitor-pass
points are intentionally small and partially transparent so repeated samples do
not visually turn into a misleading line.

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

Per-pass yield is split out from cumulative state. `processed`, `new_features`,
`new_cdp`, and coverage-file deltas are shown on a `log1p` scale. Negative
coverage-file deltas are reset/restart artifacts and are marked separately.

## Health And Yield

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

The current loop is not finding visible likely-real failures. That is good for
the active coverage run, but it is not final-stack validation. Free memory
remained high at the end of the snapshot, around `425G`, so the remaining
bottleneck is more about useful work selection, fresh-output health, CPU/load
pressure, and completion rate than raw RAM.

The stale aggregate duplicate/noise series has been replaced in this plot with
the live current-output-dir metric, `duplicateShareCurrent`, plus current summary
startup failures. The latest pass has current-output duplicate/noise share
`0`, `0` summary startup failures, `1` quality issue, `1` warning, and
the resource headroom flag true. That current-output-dir series, not historical
aggregate duplicate/noise, is the live health signal for the current output
directory.
After the latest roll to `run-20260516T121121Z`, the current-output series had
one noisy point, then a mostly downward duplicate-share trend with a brief
startup-noisy rebound. The latest samples were `0.152`, `0.1449`, `0.1333`,
`0.1313`, `0.1264`, `0.1164`, `0.11`, `0.1111`, `0.1504`, and `0`. The latest
point is cleaner, but the two preceding passes reported `10` and `12` summary
startup failures, so this is still not a sustained clean duplicate/noise canary.

The latest duplicate/noise synthesis, `20260516T125511Z`, says the consensus
root cause is still inconsistent startup-noise gating, not a product failure:
strict zero-user/zero-action startup stalls are recognized by some gates but not
consistently suppressed by the triage watcher or analysis tier. It reports no
blocking disagreement for the next action: add one strict pre-action startup
predicate to triage and analysis, while keeping product-evidence failures out of
that suppression family. The latest duplicate/noise feedback-action file,
`20260516T123229Z`, applied only the novelty-monitor part of the broader plan:
it tracked known startup noise by profile, released probation per profile
instead of globally, restarted the novelty monitor, paused the noisy
common-blocks group, and left triage/analysis gates unresolved. The persona
evidence therefore rejects any graph-only interpretation that the
duplicate/noise canary is resolved or that more browser fuzzing is the fix.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

CPU utilization rose materially later in the run. Current-run sysstat samples
from `2026-05-15T01:30:00Z` through `2026-05-16T13:10:02Z` average about
`61.3%`, peak around `84.9%`, and end near `71.0%`. This says the machine is
being used more aggressively than the earlier memory view alone implied; spare
RAM does not necessarily mean spare browser/CPU capacity.

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Load average tells a similar story with more queueing detail. In the plotted
current-run window, the 1-minute, 5-minute, and 15-minute load averages average
about `60.4`, `60.5`, and `60.1`, against `64` logical CPUs. The latest sampled
load is `56.26`, `61.34`, and `69.40` for 1/5/15 minutes respectively. The
15-minute load is still above the `64`-core reference line, and the previous
sample was higher across all three load windows, so extra browser capacity
should be justified by a clean health canary and product coverage, not spare RAM
alone.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`, `focused-shards`,
`gap-booster`, and `strict-expansion`. They show `32` browser/e2e lanes and
`1` transport-integration lane. The current coverage-guided enabled set is
still narrower than the historical coverage envelope but broader than the prior
canary: `novelty-ws-lifecycle`, `novelty-http-persistence-probe`,
`novelty-ws-real-user-editing`, `novelty-ws-real-user-rich-text`,
`novelty-ws-block-gauntlet`, `novelty-ws-common-blocks`,
`novelty-ws-parser-transform`, and `novelty-ws-async-server-blocks`. The broader
latest cross-campaign snapshots are still concentrated in browser/e2e lanes,
with one lower-level transport-integration lane active. Lower-level work is
active only in that transport-integration lane; there are no latest active
`unit-property`, `coverage-guided-lower-level`, `backend-api`,
`protocol-server`, or standalone `fuzz-assertion` fuzz-only assertion lanes in
the committed snapshot.

This does not mean lower-level checks are useless; it means the current active
compute mix is still dominated by browser Playwright RTC fuzzing. The focused
gap loop should now treat that as an explicit control variable: when browser
lanes stall or only rediscover known failures, it should consider a bounded
lower-level target with a clear oracle instead of only adding or reshuffling
browser action profiles. For isolated lower-level code, that target should
include the option of a libFuzzer/AFL-style coverage-guided harness, or an
equivalent JS/PHP coverage-guided loop if native libFuzzer is not practical.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The current execution metric is completed `seed-attempt-complete` events from
lane `events.ndjson` files. The plots count completed seed attempts, with
rechecks counted as executions, and bucket rates in 15-minute windows scaled to
attempts per hour. This is more precise than supervisor launches or lane counts,
but it only covers fuzzers that emit these lane events.

The latest collected execution data has `50,903` completed attempts:
`47,910` browser/e2e and `2,993` transport/integration. The latest 15-minute
bucket in the committed counter reports about `880` browser/e2e attempts/hour
and `20` transport/integration attempts/hour. `unit-property`,
`coverage-guided-lower-level`, `backend-api`, `protocol-server`, and standalone
`fuzz-assertion` levels are still at `0` executions in this counter.

The latest copied state reports this current enabled set:

- `novelty-ws-lifecycle`
- `novelty-http-persistence-probe`
- `novelty-ws-real-user-editing`
- `novelty-ws-real-user-rich-text`
- `novelty-ws-block-gauntlet`
- `novelty-ws-common-blocks`
- `novelty-ws-parser-transform`
- `novelty-ws-async-server-blocks`

The current active output directory is very young, so this enabled set is a live
scheduling snapshot rather than proof that the active output directory has
useful depth. The latest duplicate/noise feedback action made the
novelty-monitor probation change and paused current startup-noisy profiles, but
the latest synthesis still asks for triage-side strict startup suppression, an
analysis-tier backstop, and validation before treating the canary as clean. The
duplicate/noise synthesis rejects reading any transient lower live duplicate
share as a clean canary until strict startup signatures are deduplicated and
suppressed before analysis.

The historical enabled set covers the user-requested missing areas:
same-user/reload lifecycle, revision/autosave/recovery, real UI rich text,
parser/serialization transforms, async/server-backed blocks,
permissions/auth/locks, and long/large sessions. The current coverage-guided
novelty state is narrower than the full historical set, but the broader latest
mix snapshots still include browser/e2e parser-transform, parser-serialization,
multi-reload lifecycle, revision-persistence, and session-lifecycle lanes. Those
are active as browser/e2e lanes, not lower-level harnesses. The plot is one row
per group at first enable time; point size reflects repeated enable log events,
which are mostly restart/re-enable noise rather than new coverage launches.

The weakest newly-added area is not absence of launch coverage, but low
successful completion for the heaviest browser/UI and cross-entity profiles.

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

Profiles with high successful counts include async/server blocks,
permissions/auth/locks, same-user/session lifecycle, three-user late join, and
HTTP persistence. The scatter now uses records seen on the x-axis, completion
rate on the y-axis, startup-failure rate as point size, and unmet success goals
as triangle markers. Startup failures are one diagnostic signal, not the whole
cause of low completion. Profiles with low success rates are the places to
target next:

| Profile | Seen | Successful | Startup failures | Success rate |
| --- | ---: | ---: | ---: | ---: |
| `full` | 840 | 18 | 0 | 2.1% |
| `revision-persistence` | 3266 | 76 | 0 | 2.3% |
| `multi-reload-lifecycle` | 2435 | 58 | 0 | 2.4% |
| `parser-serialization` | 1899 | 60 | 0 | 3.2% |
| `real-user-editing` | 4923 | 280 | 0 | 5.7% |
| `common-blocks` | 2931 | 254 | 0 | 8.7% |
| `parser-transform` | 3129 | 279 | 0 | 8.9% |
| `long-session-large-doc` | 2074 | 280 | 0 | 13.5% |
| `block-gauntlet` | 3756 | 541 | 0 | 14.4% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `persistence-no-title` | 1919 | 346 | 0 | 18.0% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| successful real-user-editing records next coverage tier | 280 | 500 |
| gauntlet block core/html next coverage tier | 352 | 500 |
| gauntlet block core/details next coverage tier | 403 | 500 |
| gauntlet block core/more next coverage tier | 408 | 500 |
| CDP coverage records next coverage tier | 4763 | 5000 |
| action ui-heading-shortcut next coverage tier | 484 | 500 |
| action reload-post-action next coverage tier | 493 | 500 |

The chart is an unmet-work queue rather than a capped all-goals ratio plot. The
remaining work now mixes completed-record depth for expensive profiles with
auto-ratcheted depth targets for CDP hashes, real-user actions, and gauntlet
blocks.

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

The feature-key mix is dominated by history, operation-ledger, invariant,
action-pair, block-depth, block, and action observations. That is the right
shape for RTC data-loss work because it means the harness is observing both
semantic state transitions and low-level block/action combinations. The plot
separates breadth (`keys`) from repeated observations (`total_count`) so broad
coverage is not hidden inside raw event volume.

![Successful actions within weak-completion profiles](rtc-jetstream2-fuzz-trends-20260515/plots/successful-actions-by-profile.png)

The successful-action plot is restricted to weak-completion profiles instead of
global top actions, so high-volume async and permissions lanes no longer hide
the profiles that still need more completed full records. `media-cross-entity`
has moved out of the unmet-goal set in this snapshot; parser-serialization has
also met its explicit completed-record goal, while real-user editing still needs
completed-record depth.

## PR Review Loop

![PR split review loop events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-events.png)

![PR split loop duration by phase](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-durations.png)

![Suggested PR set net LOC over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-total-net-loc-over-time.png)

![Suggested PR net LOC by PR over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-net-loc-by-pr-over-time.png)

After the loop was corrected to `max_parallel=6` and `interval=0s`, `140`
completed review cycles took roughly `2.9` to `11.4` minutes in this snapshot;
the latest completed review took `7.5` minutes. Feedback actions ran every two
cycles and took roughly `1.8` to `13.8` minutes in the completed duration data,
with the latest completed feedback action in the duration data taking `3.2`
minutes. The newest PR-split synthesis, `20260516T125324Z`, says the Cycle
134/138 explicit 28-head allow-list remains the right split shape, but filing is
blocked because final-stack fuzz against
`validation/rtc-final-combined-stack-post-pr11-20260516T110608Z` /
`921f093cc47b46844bf8fb48552483686c55ef6b` is still invalid due
collaboration/bootstrap failure. It rejects treating `0` visible likely-real
failures from that run as approval. The active bootstrap-repair session is still
the only work item, and its `report.md` was still missing in the synthesis. The
latest PR-split feedback-action file, `20260516T125324Z`, applied the Cycle 140
review note to `current-pr-split.md`, made no durable product-code or fuzz
harness changes, and launched no new jobs because the bounded
collaboration-bootstrap repair/smoke job was already active and still lacked a
report. It rejects duplicate split-review, reload diagnostics, PR13
repair/import, PR6B replay, PR6C promotion, broad fuzz expansion, or extra lanes
while that repair is active.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The total chart sums additions minus deletions across the whole
suggested PR set for each status snapshot; the faceted chart shows the same net
LOC series per PR. The latest parsed snapshot, `2026-05-16T13:03:07Z`, has `26`
suggested rows totaling `11244` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), and
`PR 5B` (`883`). The latest PR-split persona synthesis supersedes the graph-only
branch-shape read: the latest parsed size telemetry still carries aggregate
`PR 13B` and `PR 13C` rows, but the persona files require the green
PR13A/B0/B1/B2/B3 -> PR14 -> PR15A/B/C continuation and reject reviving old
aggregate/red PR13 heads as filing targets. Aggregate `PR 11` must stay out of
filing in favor of replacement PR11A-E, former `PR 6B` remains dropped, and
late malformed-save work is not consensus `PR 6C` without focused replay
evidence. The persona files reject filing
`shape/*`, `finalize/*`, `deferred/*`, dirty worktrees, wildcard
`final/rtc-pr*`, old aggregate `PR 11`, old aggregate `PR 15`,
`try/rtc-fix-stack-validation`, `PR 1A`, `PR 6B`, `PR 6C`, broad `PR 8`, and
deferred reload-hydration, pre-save, broad rich-text, malformed-save, or HTTP
room-isolation evidence. The LOC chart remains size telemetry from the parsed
status snapshots, not filing authority for split shape.

## Interpretation

The coverage data says the harness is broad enough to exercise the major
surfaces requested earlier, but the current live output directory is too young
and narrow to treat as a mature health sample. The active fuzz has `0` visible
likely-real failures, `7` unmet goals, current-output duplicate share `0`,
`0` summary startup failures in the latest plotted pass, `1` quality issue,
`1` warning, and the resource headroom flag true. The current-output
duplicate/share and startup-failure metrics are the live health signal; the
historical duplicate/noise aggregate is reporting context only. The latest graph
shows the live duplicate share in `run-20260516T121121Z` reaching `0`, but the
two preceding passes had `10` and `12` summary startup failures. Persona-loop
evidence still blocks reading startup-noise handling as resolved.

The duplicate/noise persona evidence rejects the graph-only interpretation that
any transient lower live duplicate share is a clean canary or that more browser
fuzzing is the fix. The latest synthesis, `20260516T125511Z`, says strict
pre-action startup variants still need one shared predicate before triage and
analysis, while preserving all failures with product evidence. It reports no
blocking disagreement on that watcher plus analysis-tier guard. The latest
feedback-action file, `20260516T123229Z`, implemented the
novelty-monitor/profile-scoped probation part and restarted the novelty monitor,
but explicitly left the triage-boundary and analysis-tier backstop requests
unresolved in the persona-loop evidence.

The PR-split persona evidence also rejects a graph-only filing-ready read. The
latest PR-split synthesis, `20260516T125324Z`, says the split shape has
converged but final-stack validation has not. PR13 now has a green
identity-first sequence and PR14/PR15 are reattached. PR5 is
split as PR5A/B/C, former PR6B is dropped, broad PR8 is out, and PR8A remains
blocked/deferred. The clean
post-PR11 validation-stack rebuild exists at
`validation/rtc-final-combined-stack-post-pr11-20260516T110608Z` /
`921f093cc47b46844bf8fb48552483686c55ef6b`, but final-stack fuzz from that ref
is bootstrap dominated. The active bootstrap-repair job had no report yet in the
latest synthesis, so the stack is still not whole-stack filing-ready until a
bounded collaboration-bootstrap repair proves WS and HTTP smoke seeds get past
collaboration readiness and the same final-stack fuzz produces useful product
coverage. Do not duplicate split-review, rebuild, PR13 repair, PR6B replay,
reload diagnostic, broad-lane work, PR6C promotion, or late malformed-save PR6C
work without focused replay evidence. Do not file the old aggregate
`PR 13B`, old `PR13C` wording/head, red Cycle 110 PR13B heads, aggregate
`PR 11`, `shape/*`, `finalize/*`,
`deferred/*`, dirty worktrees, old aggregate `PR 15`, `PR 1A`, wildcard
`final/rtc-pr*`, `try/rtc-fix-stack-validation`, broad `PR 8`, `PR 6B`, or
`PR 6C`. The latest copied feedback-action file for `20260516T125324Z` says no
new jobs were launched because the bounded
`rtc-final-stack-fuzz-collab-bootstrap-repair-post-pr11-20260516T122029Z` job
is already active and still has no report, and it made no product-code or
durable fuzz-harness repo changes.

The remaining fuzzing weakness is depth and completion, not missing high-level
surface labels. Real-user editing is the largest explicit unmet depth target;
gauntlet block depth, CDP coverage, heading shortcut, and reload-post actions
still need more observations. Live fuzzing remains concentrated in `32`
browser/e2e lanes, with only one transport-integration lower-level lane active
and no active `unit-property`, `coverage-guided-lower-level`, `backend-api`,
`protocol-server`, or standalone `fuzz-assertion` lane in the latest snapshot.
The execution counter shows the same skew: `47,910` browser/e2e completed seed
attempts versus `2,993` transport/integration attempts and `0` for the other
lower-level buckets.

The next operational change should stay narrow. PR6B is now recorded as dropped,
seed `5500002` is its own follow-up, and the current PR-stack action is one
bounded collaboration-bootstrap repair/smoke job against the rebuilt allow-list
ref before rerunning the same final-stack fuzz. For coverage-guided fuzzing,
spend capacity on completion-focused lanes for the unmet profiles only after the
duplicate/noise canary has a sustained clean current-output trend; the latest
1/5/15-minute load samples are `56.26`, `61.34`, and `69.40`, so the immediate
blocker is canary quality and product coverage rather than raw load headroom.
