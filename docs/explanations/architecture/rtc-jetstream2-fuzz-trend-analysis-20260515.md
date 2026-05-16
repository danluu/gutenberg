# RTC Jetstream2 fuzz trend analysis

Snapshot generated: `2026-05-16T18:30:45Z`

This report summarizes the Jetstream2 coverage-guided fuzzing and PR-review
loop logs using R, ggplot2, tidyverse data manipulation packages, and
ColorBrewer palettes. The plots prefer scatter/dot encodings over line plots;
dense time-series points use partial transparency.

Source inputs:

- coverage monitor log:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/logs/monitor.log`
- latest copied novelty state:
  current coverage output-dir state (`startedAt=2026-05-16T17:55:45.877Z`)
- PR split review loop log:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/logs/loop.log`
- CPU and load-average history:
  `/var/log/sysstat/sa15` and `/var/log/sysstat/sa16`

The plotting script and summarized CSV inputs are committed under
[`rtc-jetstream2-fuzz-trends-20260515/`](rtc-jetstream2-fuzz-trends-20260515/).

## High-level readout

The coverage-guided loop is still expanding coverage, not merely cycling. Across
`1642` monitor passes from `2026-05-15T01:21:42Z` through
`2026-05-16T18:28:54Z`, coverage files grew from `272` to `34975`, a delta of
`34703`. The monitor's visible likely-real count stayed at `0`.

Coverage-goal pressure is down but not finished. The latest copied
coverage-guidance state has `120` total goals and `4` unmet goals. The remaining
goals are depth targets for real-user editing and gauntlet blocks.

The latest plotted current-output-dir sample is improved on startup cleanliness
but not clean on duplicate/noise: `duplicateShareCurrent` is `0.3088` and
current summary startup failures are `0`. The same sample has `0` quality
issues, `0` warnings, `426G` free memory, and the monitor headroom flag is
false. The copied novelty state has six enabled coverage-guided browser groups
after the latest output-dir reset. This report treats current-output-dir
duplicate/noise and startup-failure metrics as live status; historical aggregate
duplicate/noise is only context.

Persona-loop evidence still rejects a graph-only "resolved" interpretation. The
latest duplicate/noise synthesis, `20260516T180428Z`, says the problem is
primarily a control-plane leak, not a product failure: stale triage and
live-analysis consumers can remain attached to old run roots while the current
output root lacks current watcher state. It also identifies a narrow producer /
consumer gap where zero-product-evidence startup-phase timeout or unknown
records can still be queued if the derived signature text does not match. The
latest duplicate/noise feedback-action, also `20260516T180428Z`, reports that a
bounded control-plane fix was implemented, stale current-root consumers were
cleaned up, and post-respawn startup failures were `0`. The refreshed graph
agrees that startup pollution is cleared in the latest sample, but
`duplicateShareCurrent=0.3088`; the persona-loop evidence says this is
probationary containment, not proof that current-root consumer ownership is
permanent for future output roots.

The latest usable PR-split synthesis, `20260516T181436Z`, says the explicit
28-head split is only a known-fix prefix, not a complete filing split. A later
`20260516T182326Z` synthesis file exists in the copied persona inputs but is
empty, so it is not useful evidence. Seed `1020002` remains product-confirmed
WebSocket/Yjs marker divergence, so filing stays blocked until a narrow
post-PR15C repair passes the focused seed gate or the failure is explicitly
reclassified. The latest feedback-action applied Cycle 178 feedback, launched
no new job, and says the already-active bounded repair job
`rtc-ws-seed-1020002-crdt-array-semantic-diff-repair-20260516T180529Z` still had
no usable report. It keeps the next step narrow: consume that repair, validate
the focused seed, then rebuild the combined stack only if the gate passes or the
failure is explicitly reclassified.

## Coverage Intake

![Coverage-guided fuzz intake over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-coverage-intake.png)

The bottom facet is the operational queue: unmet goals fell from `24` to `4`
after restarts, expansion, and auto-ratcheting. The top facet shows continued
coverage-file growth. Dense monitor-pass points are intentionally small and
partially transparent so repeated samples do not visually turn into a misleading
line.

![Per-pass fuzz yield over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-per-pass-yield.png)

Per-pass yield is split out from cumulative state. `processed`, `new_features`,
`new_cdp`, and coverage-file deltas are shown on a `log1p` scale. Negative
coverage-file deltas are reset/restart artifacts and are marked separately.

## Health And Yield

![Fuzz yield and resource health over time](rtc-jetstream2-fuzz-trends-20260515/plots/monitor-health-yield.png)

The latest current-output-dir sample has a clean startup summary but not a zero
current duplicate share: `duplicateShareCurrent=0.3088` and current summary
startup failures are `0`. The sample has `0` quality issues and `0` warnings,
with `426G` free memory and the monitor headroom flag false. The plot uses
`duplicateShareCurrent` and current summary startup failures for the live health
view; it does not use historical aggregate duplicate/noise as the plotted live
signal.

The latest duplicate/noise synthesis is the operative persona evidence. It
rejects treating zero visible likely-real count as enough. It says the
consensus root cause is stale current-run ownership, with old
triage/live-analysis tmux sessions still attached to historical roots and a
record-level startup suppression gap in `rtc-browser-fuzz-triage-watcher.mjs`.
The latest feedback-action reports that the bounded watcher/novelty fix was
implemented, `node --check` passed, stale triage was killed, current-root live
analysis was started, and the immediate post-respawn pass had
`duplicateShareCurrent=0.2979` with `summaryStartupFailures=0`. The refreshed
graph's latest sample is consistent on startup cleanup but still has
`duplicateShareCurrent=0.3088`. Because the feedback-action explicitly notes
that coverage start/cleanup shell scripts were not permanently changed, the
persona evidence still rejects a graph-only resolved read.

![CPU utilization over time](rtc-jetstream2-fuzz-trends-20260515/plots/cpu-utilization-over-time.png)

![Load average over time](rtc-jetstream2-fuzz-trends-20260515/plots/load-average-over-time.png)

Recent sysstat samples through `2026-05-16T18:30:00Z` show sustained CPU
pressure: the 16:30-18:30 samples range from `64.9%` to `81.8%` utilization,
with the latest sample at `79.6%`. Load exceeded the logical CPU count in
multiple sampled windows, and the latest sampled 1/5/15-minute load is `72.2`,
`76.9`, and `75.3` against `64` logical CPUs.
The immediate blocker is still duplicate/noise containment, coverage depth, and
the PR-split repair decision rather than raw memory headroom.

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-cumulative.png)

![](rtc-jetstream2-fuzz-trends-20260515/plots/project-activity-rate.png)

## Enabled Surfaces

![Coverage-guided groups by first enable time](rtc-jetstream2-fuzz-trends-20260515/plots/enabled-groups-over-time.png)

The historical enabled set still covers the requested missing areas:
same-user/reload lifecycle, revision/autosave/recovery, real UI rich text,
parser/serialization transforms, async/server-backed blocks,
permissions/auth/locks, and long/large sessions. The current copied novelty
state has six enabled coverage-guided browser groups: real-user-editing,
real-user-rich-text, common-blocks, async-server-blocks,
long-session-large-doc, and block-gauntlet. The duplicate/noise persona loop is
stricter than a graph-only read: the latest synthesis says the startup
classifier should stay narrow, but coverage start/cleanup must own the
current-root triage and live-analysis consumers so stale sessions do not
dominate policy. The latest feedback-action implemented the bounded watcher /
novelty suppression and restarted current-root analysis for the active root, but
it did not make future start/cleanup scripts own that permanently. The latest
current-output sample has `duplicateShareCurrent=0.3088` and `0` current summary
startup failures. Startup pollution is improved, but the enabled browser groups
are still probationary until current-root consumer ownership is permanent.

## Fuzzing Level Mix

![Fuzzing level mix over time](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-mix-over-time.png)

The level-mix plot reads supervisor group history, not just the novelty monitor
log. The latest copied snapshots cover `coverage-guided`,
`coverage-guided-lower-level`, `focused-shards`, `gap-booster`,
`strict-expansion`, and `unit-property`. Across the latest copied campaign
snapshots, the mix shows `31` browser/e2e lanes across `31` groups, plus `1`
`unit-property` lane and `1` `coverage-guided-lower-level` lane. The browser/e2e
lanes are `6` coverage-guided, `9` focused-shards, `6` gap-booster, and `10`
strict-expansion.

The latest per-campaign mix is still concentrated in browser/e2e lanes, but
lower-level work is active in `unit-property` and
`coverage-guided-lower-level`, including the rich-text CRDT lower-level lane.
No active `transport-integration`, `backend-api`, `protocol-server`, or
standalone `fuzz-assertion` fuzz-only assertion lanes appear in the latest
level-mix snapshot.

## Fuzzing Level Executions

![Cumulative fuzz executions by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-executions-cumulative.png)

![Fuzz execution rate by level](rtc-jetstream2-fuzz-trends-20260515/plots/fuzz-level-execution-rate.png)

The current execution metric is estimated individual test/case executions
derived from lane `events.ndjson` files: browser seed attempts, unit/property
fixed tests plus generated fuzz cases, coverage-guided lower-level inputs, or
protocol/backend cases. Rechecks count as executions. This is more precise than
supervisor launches or lane counts, but it only covers fuzzers that emit these
lane events. Lower-level counts reconstructed from batch metadata or legacy
batch-count fields are approximate.

The latest collected execution data has about `1,166,451` completed test
executions: `63,943` browser/e2e, `3,006` transport/integration, `1,061,208`
unit-property, and `38,294` coverage-guided-lower-level. The latest 15-minute
bucket reports about `176` browser/e2e test executions/hour, `4,816`
unit-property test executions/hour, `768` coverage-guided-lower-level test
executions/hour, and `0` transport/integration test executions/hour.
`backend-api`, `protocol-server`, and standalone `fuzz-assertion` levels remain
at `0` executions in this counter.

## Profile Completion

![Profile completion bottlenecks](rtc-jetstream2-fuzz-trends-20260515/plots/profile-success-scatter.png)

Profiles with high successful counts include async/server blocks,
permissions/auth/locks, same-user/session lifecycle, three-user late join, and
HTTP persistence. The scatter uses records seen on the x-axis, completion rate
on the y-axis, startup-failure rate as point size, and unmet success goals as
triangle markers. Low-completion profiles are the next depth targets:

| Profile | Seen | Successful | Startup failures | Success rate |
| --- | ---: | ---: | ---: | ---: |
| `full` | 840 | 18 | 0 | 2.1% |
| `revision-persistence` | 3596 | 103 | 0 | 2.9% |
| `multi-reload-lifecycle` | 2721 | 80 | 0 | 2.9% |
| `parser-serialization` | 2249 | 75 | 0 | 3.3% |
| `real-user-editing` | 5346 | 299 | 0 | 5.6% |
| `common-blocks` | 3275 | 310 | 0 | 9.5% |
| `parser-transform` | 3448 | 332 | 2 | 9.6% |
| `long-session-large-doc` | 2201 | 319 | 0 | 14.5% |
| `block-gauntlet` | 4318 | 672 | 0 | 15.6% |
| `structure` | 536 | 95 | 0 | 17.7% |
| `persistence-no-title` | 2259 | 431 | 0 | 19.1% |

The data suggests the next productive improvement is less about adding brand-new
surface labels and more about increasing completed records for existing
expensive profiles.

## Coverage Goals

![Remaining unmet coverage goals](rtc-jetstream2-fuzz-trends-20260515/plots/coverage-goal-progress.png)

Current unmet goals from the latest state:

| Goal | Current | Target |
| --- | ---: | ---: |
| successful real-user-editing records next coverage tier | 299 | 500 |
| gauntlet block core/html next coverage tier | 405 | 500 |
| gauntlet block core/details next coverage tier | 451 | 500 |
| gauntlet block core/more next coverage tier | 499 | 500 |

Reload-post action, heading-shortcut action, and CDP coverage records have moved
out of the unmet set in this snapshot. The remaining queue mixes
completed-record depth for real-user editing with auto-ratcheted depth targets
for gauntlet blocks.

## Feature Mix

![Feature coverage breadth vs repetition](rtc-jetstream2-fuzz-trends-20260515/plots/feature-category-coverage.png)

The feature-key mix is dominated by history, operation-ledger, invariant,
action-pair, block-depth, block, and action observations. That is the right
shape for RTC data-loss work because the harness observes both semantic state
transitions and low-level block/action combinations. The plot separates breadth
(`keys`) from repeated observations (`total_count`) so broad coverage is not
hidden inside raw event volume.

![Successful actions within weak-completion profiles](rtc-jetstream2-fuzz-trends-20260515/plots/successful-actions-by-profile.png)

The successful-action plot is restricted to weak-completion profiles instead of
global top actions, so high-volume async and permissions lanes no longer hide
the profiles that still need more completed full records.

## PR Review Loop

![PR split review loop events](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-events.png)

![PR split loop duration by phase](rtc-jetstream2-fuzz-trends-20260515/plots/pr-review-loop-durations.png)

![Suggested PR set net LOC over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-total-net-loc-over-time.png)

![Suggested PR net LOC by PR over time](rtc-jetstream2-fuzz-trends-20260515/plots/pr-suggested-net-loc-by-pr-over-time.png)

After the loop was corrected to `max_parallel=6` and `interval=0s`, `178`
completed review cycles took roughly `2.9` to `11.4` minutes in this snapshot;
the latest completed review, `20260516T181436Z`, took `5.5` minutes, and the
latest completed feedback-action cycle `178` took `3.2` minutes. The latest
usable PR-split synthesis, `20260516T181436Z`, preserves the consensus that the
28-head allow-list is only a known-fix prefix and says seed `1020002` still
blocks filing until a narrow post-PR15C repair is validated or the failure is
explicitly reclassified. A later `20260516T182326Z` synthesis file is present
but empty. The latest feedback-action applied Cycle 178 feedback, launched no
new job, and says the existing seed `1020002` CRDT array semantic-diff repair
job is still active with no usable report.

The latest usable PR-split synthesis says the split design is not filing-ready
and preserves the explicit 28-head allow-list only as a known-fix prefix:
`PR01-04`, `PR05A/B/C`, `PR06/06A`, `PR07A/B`, `PR09`, `PR10`,
`PR11A/B/C/D/E`, `PR12`, `PR13A`, `PR13B0/B1/B2/B3`, `PR14`, and
`PR15A/B/C`. It rejects wildcard `final/rtc-pr*`, aggregate PR5/PR11/PR15,
aggregate PR13B, old/red PR13 heads, broad PR8, PR8A as filing material for
now, former PR6B, PR6C, PR1A, old PR16, reload hydration, pre-save collapse,
rich-text suffix, malformed-save residuals, HTTP room-isolation residuals,
dirty worktrees, and `try/rtc-fix-stack-validation`.

The same synthesis rejects treating the final-stack graph's `0` visible
likely-real failures as filing approval. Seed `1020002` is product-confirmed
WebSocket/Yjs marker divergence: page 0 advertises state-vector coverage for
the marker-bearing peer update but stores that peer range fully deleted, while
page 1 and the relay retain the marker. The current shape remains "28-head
known-fix prefix plus a required post-PR15C repair." The latest synthesis says
the bounded successor repair job was still active and its expected report was
missing or empty at the check. The next step is consuming that active repair,
running a focused seed `1020002` gate, then rebuilding the combined stack only
if the gate passes or the failure is explicitly reclassified. Do not start
broad final-stack fuzz, extra fuzz lanes, reload diagnostics, PR13
repair/import, PR6B/PR6C replay, old PR16 replay, or another split-review loop
before that repair is validated.

The suggested-PR size charts are parsed from the status report's proposed PR
split history. The latest parsed snapshot, `2026-05-16T18:26:03Z`, has `26`
suggested rows totaling `11244` net LOC. The largest current rows by net LOC are
`PR 13B` (`1668`), `PR 12` (`1386`), `PR 7A` (`1331`), `PR 13A` (`1126`), and
`PR 5B` (`883`). These charts remain size telemetry from parsed status
snapshots, not filing authority for split shape.

## Interpretation

The coverage graph is still positive on breadth and depth intake: files and
coverage observations continue to grow, likely-real visible failures remain
`0`, and unmet goals are down to `4`. The latest live current-output sample has
current duplicate share at `duplicateShareCurrent=0.3088`, with latest current
summary startup failures at `0`. The latest monitor row has `0` quality issues
and `0` warnings, with `426G` free memory and the headroom flag false.

The duplicate/noise persona loop rejects a graph-only "resolved" read. The
latest synthesis says the main unresolved issue is coverage-guided control-plane
ownership: current-root triage and bounded live-analysis consumers need to be
started and cleaned up with the output root, and zero-product-evidence
`pre-action-bootstrap-stall` records should be suppressed before enqueue. The
latest feedback-action says the bounded watcher/novelty fix was implemented and
the current-root analysis session was started for this active output root. The
current copied state has six enabled coverage-guided browser groups. The
refreshed graph shows latest `summary_startup_failures=0`, but latest
`duplicateShareCurrent=0.3088`; the feedback-action also says permanent
start/cleanup ownership was outside that pass. The correct live read is startup
pollution improved, duplicate/noise still visible, and containment still
probationary for future roots.

The PR-split persona loop also rejects a filing-ready read. The split shape has
converged only as a known-fix prefix plus a required seed `1020002`
WebSocket/Yjs marker-propagation repair. The latest usable synthesis,
`20260516T181436Z`, says all six reports agree the 28-head stack is only a
known-fix prefix and seed `1020002` remains a confirmed WebSocket/Yjs product
divergence; the later `20260516T182326Z` synthesis file is empty. The latest
feedback-action applied the prefix-plus-repair consensus to the split note,
launched no new job, and says the already-active repair job still lacked a
usable report. The next gate is consuming that repair and rerunning focused seed
validation, not filing or broad final-stack fuzz.

The remaining fuzzing weakness is completion depth and level diversity. Live
work is still mostly browser/e2e in the latest mix snapshots, but unit-property
and coverage-guided-lower-level lanes are active. Transport-integration has
historical completed executions but no latest-bucket rate; the latest execution
bucket has about `176` browser/e2e test executions/hour, `4,816`
unit-property test executions/hour, `768` coverage-guided-lower-level test
executions/hour, `0` transport/integration test executions/hour, and `0`
backend-api/protocol-server/fuzz-assertion executions.
The next narrow operational checks are current-root triage/live-analysis
ownership follow-ups and seed `1020002` Gutenberg-origin store-to-CRDT/Yjs
repair evidence.
