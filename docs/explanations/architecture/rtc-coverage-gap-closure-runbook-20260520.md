# RTC Coverage Gap Closure Runbook

This runbook describes the Jetstream2 process that forces the missing coverage
items from `jetstream2-rtc-fuzzing-coverage-report.md` into concrete tests or
fuzz harness work within one day.

Start it on Jetstream2:

```bash
cd /media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
bash bin/rtc-coverage-gap-closure-start-remote.sh
```

The process writes state under:

```text
/media/volume/danluu-fuzz-data/rtc-coverage-gap-closure-20260520
```

Important files:

- `work-items.tsv`: one coverage family per row, with the exact checklist.
- `status/coverage-gap-closure-status.md`: current status table.
- `reports/*.report.md`: worker and integrator reports.
- `worktrees/*`: isolated Git worktrees for each coverage family.
- `logs/controller.log`: launch/retry history.

The controller launches one Codex/tmux worker per coverage family:

- list and nested structure regressions;
- high-backlog transport and compaction;
- sync and polling state-machine fuzzing;
- save-payload correctness;
- parser and semantic-equivalence edge cases;
- wider product coverage queue.

Workers may mark an item done only when every checklist entry is covered by a
concrete test or harness change, or when a precise blocker is written with a
minimal continuation step. An integrator Codex session runs periodically to
audit reports, remove weak `done` markings, and write continuation notes.
During the last four hours before the deadline, the controller switches to a
shorter relaunch and integrator cadence so weak or missing coverage is surfaced
before the one-day window expires.

The process is intentionally not a broad browser-fuzz launcher. Browser-heavy
gates should be queued or run through the existing fuzz controllers. This loop
is responsible for closing the missing-test backlog and producing reviewable
branches/worktrees.
