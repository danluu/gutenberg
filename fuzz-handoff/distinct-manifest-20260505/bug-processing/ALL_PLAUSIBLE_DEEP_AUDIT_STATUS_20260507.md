# All-Plausible Deep Audit Status - 2026-05-07

Status: the repeated eight-issue likelihood loop has been stopped and replaced
with a broad deep-analysis pass over every likely-real handoff group.

What changed:

- Stopped the `rtc-likelihood-*` sessions that repeatedly looped over
  `confirmed-real-candidates.tsv`.
- Updated `run-worker-health-monitor.sh` so it no longer restarts
  `rtc-likelihood-supervisor`.
- Created `all-plausible-candidates.tsv` from the full
  `likely-real-issues.jsonl` manifest.
- Updated `run-deep-dispatcher.sh` so real-user-likelihood mode seeds from
  `all-plausible-candidates.tsv`, not `confirmed-real-candidates.tsv`.
- Updated `run-deep-worker.sh` so workers know that the broad queue includes
  already-analyzed bugs, runnable repros that passed on the refreshed known-fixes
  base, and non-runnable groups needing repro reconstruction.
- Restarted deep processing at pass 170.

Current broad queue:

- Candidate file: `deep-state/pass-170/candidates.tsv`
- Candidate count: 279
- Source queue: `all-plausible-candidates.tsv`
- Old repeated-likelihood sessions: 0
- Deep worker target: resource-adjusted, up to 8 active `deep-p170-*` tmux
  windows
- Missing-coverage queue remains active separately on `rtc-handoff-coverage`
  with 166 candidates.

Worker requirements:

- Use the current known-fixes base, intended to represent recent `origin/trunk`
  plus the body/comment/backlink-aware #77716 fix set.
- Read `KNOWN_FIXES_BASE_STATUS_20260507.md` before claiming a bug survives all
  known/proposed fixes.
- Classify practical real-user likelihood for every plausible issue.
- For still-real or unresolved bugs, produce natural-user-action Playwright
  repros, explanation branches, PR branches, videos, root-cause analysis, and
  fix plans as specified in the handoff instructions.

