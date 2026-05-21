# RTC Jetstream2 Productive Analysis Loop

This is the running report for the Jetstream2 loop added on May 21, 2026 to
turn high-level observations into controller-visible actions.

## Purpose

The new loop is not a passive status writer. It runs targeted Codex analysis
lanes that must emit machine-readable action rows. Those rows are fed into
controllers that can change scheduling, blocker state, branch work, or fuzzing
coverage.

The loop runs on Jetstream2 as:

- tmux session: `rtc-productive-analysis-loop`
- base directory:
  `/media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521`
- current status:
  `/media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/current-status.md`
- current human report:
  `/media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/current-report.md`
- all action rows:
  `/media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/current-actions.tsv`
- high-priority controller feedback:
  `/media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/critical-path-feedback.tsv`

Script branch:
[`try/jetstream-fuzz`](https://github.com/danluu/gutenberg/tree/try/jetstream-fuzz)

## Analysis Lanes

The loop currently starts four bounded lanes per cycle, capped at four active
lane jobs:

- `pr-blocker-router`: finds PR blockers with wrong ownership, stale evidence,
  or a next action that cannot move a branch.
- `benchmark-to-fuzz-closure`: turns benchmark/canary failures into fuzzing,
  coverage, blocker, or promotion-loop changes.
- `deferred-family-reducer`: stops repeated deferred-family analysis when the
  family should instead become an exact gate, a candidate branch, or a
  downscope.
- `lower-level-yield-retarget`: looks for lower-level fuzzing with low bug
  yield because the target, oracle, corpus, or accounting is wrong.

Lane jobs are analysis-only. They do not run broad browser tests or broad
filesystem scans. The action feed is the handoff to controllers that can act.

## Control Wiring

The action feed is consumed in these places:

- `rtc-critical-path-pr-executor-loop-remote.sh` reads
  `critical-path-feedback.tsv`. If it contains high-priority rows, the executor
  creates a `productive-analysis-action` blocker and queue entry and can launch
  a bounded continuation job to implement or reject the action with evidence.
- `rtc-pr-progress-controller-remote.sh` includes `current-actions.tsv` and
  `current-report.md` in its controller context. Persona decisions must act on
  targeted rows or reject them in the decision TSV.
- `rtc-deferred-work-promotion-loop-remote.sh` includes the same feed in each
  family context. Deferred jobs must implement targeted actions or explicitly
  reject them with evidence.
- `rtc-fuzz-level-mix-persona-loop-remote.sh` includes the feed in level-mix
  context, so coverage, lower-level, and level-mix rows can affect fuzzing mix
  decisions.
- `rtc-jetstream-guard-remote.sh` now supervises
  `rtc-productive-analysis-loop`.
- `rtc-structural-issue-watchdog-remote.sh` checks the productive-analysis
  status file for freshness.

## First Live Result

Initial verified state on May 21, 2026 at about 22:28 UTC:

- `rtc-productive-analysis-loop` was running.
- Four lane jobs launched in tmux.
- The merged feed contained six P0 action rows.
- The critical-path executor had consumed the feed and added
  `productive-analysis-action` to both `blockers.tsv` and `queue.tsv`.

Current first-cycle action rows:

| action_id | target_loop | priority | action_kind | effect |
| --- | --- | --- | --- | --- |
| `benchmark-canary-critical-exact-stack-gate` | `critical-path` | `P0` | `promotion-blocker-tighten` | Tighten the benchmark-canary blocker so exact-stack title reload and existing-post CRDT HTTP evidence must pass before coverage confidence or snapshot publication unblocks. |
| `benchmark-canary-focused-http-replay` | `deferred` | `P0` | `exact-stack-focused-replay` | Run the focused HTTP replay rows against the exact all-merged stack and keep promotion blocked until green. |
| `dfr-20260521T222503Z-family-budget-exact-gate` | `deferred` | `P0` | `family-budget-hard-gate` | Stop generic interval relaunches for over-budget deferred families unless there is new product evidence, exact-stack green evidence, or downscope evidence. |
| `dfr-20260521T222503Z-operator-regression-exact-gates` | `coverage` | `P0` | `convert-deferred-family-to-exact-coverage-gate` | Convert operator-correctness-regression into exact large-post and list-item ordering coverage gates. |
| `pr07c-consume-owner-evidence` | `pr-progress` | `P0` | `ownership-reconcile` | Consume the existing PR07C owner replay evidence and stop relaunching owner-matrix work until fresher product-owned evidence exists. |
| `reload-hydration-exact-stack-gate` | `deferred` | `P0` | `exact-stack-promotion-gate` | Stop generic reload-hydration relaunches and require exact-stack green focused rows before keeping the family promotable. |

## Structural Fixes Made While Adding It

While wiring this loop in, the critical-path executor was found to start and
then vanish because a descendant broad scan held
`critical-path-pr-executor.lock` after the tmux session was gone. That would
have prevented productive-analysis output from affecting critical-path work.

Two changes were made:

- the critical-path executor now uses indexed or bounded recent-run lookup for
  the latest PR-split progress-unblock artifact and continuation
  `classification.tsv` files instead of unbounded deep scans of all historical
  run output;
- the structural watchdog now emits a high-severity finding when the critical
  executor lock is held without the `rtc-critical-path-pr-executor-loop` tmux
  session.

The stale lock holders were cleared once, and the executor restarted. After the
restart, `inputs.tsv` included the productive-analysis files and
`blockers.tsv`/`queue.tsv` included `productive-analysis-action`.

## Operating Notes

The loop is intentionally small and controller-oriented. Adding another lane
should require a clear control path. A lane that only writes commentary should
not be added here; it belongs in a separate report loop unless its output is
converted into an action TSV consumed by a controller.

The current script and runbook updates are on
[`try/jetstream-fuzz`](https://github.com/danluu/gutenberg/tree/try/jetstream-fuzz).
