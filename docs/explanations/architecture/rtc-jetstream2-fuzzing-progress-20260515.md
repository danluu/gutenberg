# RTC Jetstream2 fuzzing progress report

Snapshot time: `2026-05-15T19:22:14Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Data root:
`/media/volume/danluu-fuzz-data`

Fuzz code under test in current lanes:
`try/rtc-fix-stack-validation` at
`72854f05ed20106daac3d125206f2643dac41677`.

## Current Status

The Jetstream2 fuzzing campaign is running and healthy. The current
coverage-guided monitor reports no unmet coverage goals, no recommended new
groups, no harness-work candidates, and no currently visible likely-real bugs.

Current coverage-guided run root:

```text
/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260515T184650Z
```

Current resource snapshot:

```text
load average: 45.28, 45.09, 48.14
memory: 436 GiB available / 492 GiB total
disk: 99 GiB used / 3.5 TiB total on /media/volume/danluu-fuzz-data
chrome/chromium processes: 398
runner-related commands: 437
codex-related commands: 6
```

Coverage monitor snapshot:

```text
coverage files: 8100
total records seen: 15816
records processed this pass: 24
new behavioral feature keys this pass: 2
new CDP coverage hashes this pass: 2
unmet goals: 0
recommended groups: none
harness-work candidates: 0
likely-real visible: 0
likely-real merged duplicates: 0
likely-real oracle/noise questions: 0
```

The latest monitor warning is that triage yield is duplicate/noise dominated.
That is currently expected for this phase because coverage goals are satisfied
and most remaining failures are repeated bootstrap or awareness stalls rather
than new high-signal findings.

## Running Services

Long-running services are owned by tmux sessions on the remote host:

```text
rtc-coverage-guided-novelty
rtc-coverage-guided-supervisor
rtc-coverage-guided-watchdog
rtc-focused-shards
rtc-focused-shards-watchdog
rtc-focused-shards-analysis
rtc-focused-shards-gap-codex-loop
rtc-gap-booster
rtc-gap-booster-watchdog
rtc-gap-booster-analysis
rtc-fuzz-strict-expansion
rtc-fuzz-strict-expansion-watchdog
rtc-fuzz-strict-expansion-analysis
```

Coverage-guided is currently running five groups:

```text
novelty-ws-structure
novelty-ws-lifecycle
novelty-ws-persistence-no-title
novelty-ws-real-user-editing
novelty-http-persistence-probe
```

Focused shards are running nine groups and have five old duplicate/broken
groups disabled:

```text
running: 9
disabled:
  focused-late-join-c
  focused-long-doc-a
  focused-revision-recovery-a
  focused-revision-recovery-b
  focused-rich-text-a
```

The disabled focused groups had repeated isolated `wp-env` database connection
problems and overlapped active coverage from the strict, gap-booster, and
coverage-guided lanes. Equivalent surfaces are still covered by active groups.

Gap booster is running six groups and has four old lower-value duplicate groups
disabled:

```text
running: 6
disabled:
  boost-block-gauntlet-async-ish
  boost-multi-reload-lifecycle
  boost-parser-reparse
  boost-same-user-stale-tabs
```

Strict expansion is running ten groups, with none disabled.

## Coverage Added

The Jetstream2 run was expanded beyond the local machine's narrower matrix. In
particular, the following surfaces are now covered by some combination of
coverage-guided, strict expansion, focused shards, and gap booster runs:

- Same user in multiple tabs via `focused-same-user-stale-tabs` and
  same-user/lifecycle records.
- Revision restore, autosave, reload, and post recovery via strict
  `ws-revision-persistence` and gap-booster
  `boost-revision-autosave-recovery`.
- Rich text through real UI actions, including paste, link editing, lists,
  composition, toolbar formatting, cut/copy, table-cell editing, undo/redo, and
  reload actions.
- Parser, serialization, deprecation, validation, and reparse paths through
  parser transform and parser serialization profiles.
- Async and server-backed blocks through async-server block profiles and
  template-part/media-style coverage.
- Permissions, locks, and auth/session expiry through contributor auth lanes
  with `GUTENBERG_RTC_BROWSER_COLLABORATOR_ROLES=contributor` and auth sync
  failures enabled.
- Long sessions and large documents through long-session/large-document
  profiles.

The current aggregate profile counts include:

```json
{
  "persistence-no-title": 368,
  "async-server-blocks": 1626,
  "block-gauntlet": 1636,
  "common-blocks": 510,
  "session-lifecycle": 1673,
  "long-session-large-doc": 815,
  "parser-transform": 1290,
  "real-user-editing": 1374,
  "structure": 45,
  "permissions-auth-locks": 1405,
  "three-user-late-join": 2160,
  "multi-reload-lifecycle": 1098,
  "parser-serialization": 432,
  "revision-persistence": 1177,
  "full": 207
}
```

Successful record counts include:

```json
{
  "async-server-blocks": 957,
  "block-gauntlet": 103,
  "common-blocks": 36,
  "session-lifecycle": 391,
  "long-session-large-doc": 177,
  "parser-transform": 52,
  "persistence-no-title": 200,
  "real-user-editing": 26,
  "structure": 10,
  "permissions-auth-locks": 708,
  "three-user-late-join": 657,
  "multi-reload-lifecycle": 12,
  "parser-serialization": 13,
  "revision-persistence": 26,
  "full": 16
}
```

Real-user action counts are now above the explicit action coverage thresholds:

```json
{
  "ui-type-paragraph": 28,
  "ui-format-paragraph": 14,
  "ui-heading-shortcut": 14,
  "reload-post-action": 35,
  "ui-paste-paragraph": 55,
  "ui-link-paragraph": 55,
  "ui-list-indent": 38,
  "ui-composition-paragraph": 38,
  "ui-toolbar-format-paragraph": 38,
  "ui-cut-copy-paragraph": 38,
  "ui-table-cell-edit": 36,
  "ui-undo-redo-paragraph": 36
}
```

## Monitor And Recovery Changes

Several changes were made to keep the run useful without manual intervention:

- Added coverage-guided expansion that reads prior run roots, uses observed
  coverage, starts only the currently useful groups, and keeps coverage state
  across restarts.
- Added watchdogs for the coverage-guided monitor and supervisors, plus focused
  and gap-booster watchdogs.
- Added a session watchdog so a missing coverage-guided tmux session is detected
  and restarted automatically.
- Added live Codex analysis monitors for focused and gap-booster results.
- Restarted auth/permissions lanes with contributor collaborators after finding
  that the active lanes were still editor-only. This closed the
  `collaborator-role:contributor` coverage gap.
- Patched the novelty monitor signal path so a `SIGHUP` requests natural
  shutdown instead of calling `process.exit()` from the signal handler. This
  avoids the Node `ResetStdio` assertion observed during tmux/session cleanup.
- Restarted coverage-guided into `run-20260515T184650Z` with the patched
  monitor while preserving history through observed run roots.

## Triage Yield

No likely-real candidate is currently visible in the monitor output. The top
semantic families are still dominated by duplicate/noise classes:

```json
[
  { "family": "pre_action_bootstrap_stall", "count": 5427 },
  { "family": "late_session_awareness_stall", "count": 1710 },
  { "family": "timeout", "count": 459 },
  { "family": "collaboration_non_convergence", "count": 407 },
  { "family": "unknown", "count": 334 },
  { "family": "linebreak_representation_drift", "count": 150 },
  { "family": "assertion", "count": 141 },
  { "family": "rest_meta_database_error", "count": 13 }
]
```

The current top duplicate family share is `0.6281`. That share has been slowly
falling as coverage grows, but the run is still mostly producing already-known
or low-signal failure families.

## Current Decision

Do not add broad fuzzing lanes right now. The machine has memory and disk
headroom, but the coverage-guided monitor reports:

```text
unmet goals: 0
recommended groups: none
harness-work candidates: 0
likely-real visible: 0
```

Adding more broad lanes would mostly increase duplicate bootstrap and awareness
noise. The better next work is:

- Keep the current run alive.
- Let the existing watchdogs and analysis monitors react if new likely-real
  candidates appear.
- Reduce duplicate/noise yield separately, especially the pre-action bootstrap
  stall family.
- Continue turning the validated RTC fix set into small, reviewable PR branches
  once current high-signal findings are mapped to specific code paths.

## Handoff Commands

Check current coverage-guided status:

```bash
BASE=/media/volume/danluu-fuzz-data
COV=$(cat "$BASE/rtc-coverage-guided-20260515/current-output-dir.txt")
sed -n '1,180p' "$COV/novelty-status.md"
```

Check active tmux services:

```bash
export PATH=/media/volume/danluu-fuzz-data/rtc-tmux-wrapper/bin:$PATH
tmux ls | sort | grep -E 'rtc-coverage-guided|rtc-focused|rtc-gap|rtc-fuzz-strict'
```

Restart coverage-guided if needed:

```bash
/tmp/start_rtc_coverage_guided_remote.sh
```

The remote monitor and supervisor scripts live in:

```text
/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo/bin/
```

