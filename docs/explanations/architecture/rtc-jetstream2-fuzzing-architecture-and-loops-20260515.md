# RTC Jetstream2 fuzzing architecture and active loops

Snapshot time: `2026-07-10T03:22Z`

Blocker-history update: `2026-07-10T03:22Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Jetstream data root:
`/media/volume/danluu-fuzz-data`

Remote working repo used by most loops:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Reusable Jetstream scripts, this runbook, and the published explanation docs are
kept on:
[`explain/rtc-jetstream2-fuzz-progress-20260515`](https://github.com/danluu/gutenberg/tree/explain/rtc-jetstream2-fuzz-progress-20260515)

Older fuzz-bootstrap scripts may still exist on
[`try/jetstream-fuzz`](https://github.com/danluu/gutenberg/tree/try/jetstream-fuzz),
but the `explain/*` branch is the current published runbook/status branch.

Primary progress and graph docs:

- [Trend analysis and graphs](https://github.com/danluu/gutenberg/blob/explain/rtc-jetstream2-fuzz-progress-20260515/docs/explanations/architecture/rtc-jetstream2-fuzz-trend-analysis-20260515.md)
- [PR status](https://github.com/danluu/gutenberg/blob/explain/rtc-jetstream2-fuzz-progress-20260515/docs/explanations/architecture/rtc-jetstream2-fix-pr-status-20260515.md)
- [Productive analysis loop](https://github.com/danluu/gutenberg/blob/explain/rtc-jetstream2-fuzz-progress-20260515/docs/explanations/architecture/rtc-jetstream2-productive-analysis-loop-20260521.md)

## Short Version

The project now runs as a two-host system.

Jetstream2 owns CPU-heavy fuzzing, durable artifact storage, PR blocker
continuation work, persona-guided control decisions, lower-level harness work,
and health monitoring. The local machine owns GitHub publication, some extra
coverage lanes, benchmark gating, report publication, and a bridge that feeds
local results back to Jetstream.

The important rule is unchanged: every loop owns one kind of decision, writes
durable evidence, and leaves enough state for another process to reject stale or
incorrect interpretations. Graphs and prose reports are not the API by
themselves; controller decisions must be traceable to TSV, JSON, or run
artifacts under the data root.

## 2026-07-10 Effectiveness Audit And Repair

The July 9-10 audit found that low useful output was caused by control-plane and
source-provenance failures, not by a lack of candidate bugs:

- Six-persona review loops ran continuously and consumed roughly 17 CPU cores,
  while browser tests used roughly two. Generic reviews are now opt-in;
  evidence-owned critical repair remains active and productive analysis defaults
  to one lane.
- The novelty monitor advertised more groups than the resource budget, and the
  autoscaler repeatedly removed groups while repository, WordPress, and browser
  setup was still running. Publication is now capped at the effective budget,
  materializing groups are retained through their first record, and plain-editor
  plus real-world product smoke reserve slots until each has a current-run green.
- Isolated repo preparation copied a dirty checkout with over one thousand
  generated/untracked paths and took minutes. The product under test is now an
  exact detached worktree of
  `refs/heads/js2/all-merged-rebased-20260701`; only named test-harness paths are
  overlaid. Independent 140 MB group copies prepared in about two seconds each.
- The exact checkout initially had no ignored build output. Reusing build output
  and `node_modules` from the dirty checkout was not valid: the first exact build
  proved dependency skew through a `colorjs` API mismatch and missing
  `wasm-vips`. A commit-keyed `npm ci` took about 49 seconds and the exact
  production build took about 63 seconds. That snapshot and dependency set are
  reused, while group repos symlink the exact dependencies.
- A one-shot `RTC_COVERAGE_FORCE_RESTART=1` leaked into the permanent session
  watchdog, causing every normal recovery to replace the run it had just
  started. The launcher now clears the flag before spawning children and the
  watchdog explicitly sets it to zero.
- The productive-analysis, deferred-promotion, and resource-autoscaler loops
  survived tmux loss as parentless singleton lock holders. Their recovery paths
  now terminate only validated matching orphan controllers before relaunch.
- Core recovery was suppressed for 15 minutes by the same cooldown as optional
  analysis. Required controllers now use a 120-second cooldown; optional work
  retains the 900-second cooldown.
- The autoscaler treated a two-minute setup as failed materialization and also
  fought the launcher's five-slot benchmark policy with an immediate 12-slot
  restart. A 900-second startup grace now blocks materialization remediation and
  upward budget replacement while still allowing pressure-driven scale-down.
- The shared tmux server dumped core at `2026-07-09T23:29:27Z` and again at
  `2026-07-10T00:00:10Z` in `cmd_capture_pane_exec`. Live analysis moved to the
  `rtc-analysis` socket, read-only clients are serialized, and `capture-pane` is
  rejected on the `rtc-fuzz` core socket. The outside guard records server PID
  replacement and restores required services.
- Supervisor launch commands did not pass the authoritative
  `current-output-dir.txt` pointer. A surviving supervisor therefore could not
  reject its own stale output after a run replacement. Novelty and guard launch
  paths now pass the pointer and the supervisor exits after terminating stale
  lanes when the pointer no longer names its output directory.
- A failed human smoke preflight wrote actionable behavioral evidence, but its
  lane exit was still reported as `runner-error`. The supervisor relaunched the
  same seed and repeated the same expensive browser workflow. It now counts
  failed product-evidence records separately and moves that group to
  `paused-product-failure` for the lifetime of the candidate. The critical
  repair controller owns the one actionable failure; other groups continue.
- Quarantined failures initially still counted against the five-group producer
  budget. The novelty scheduler now keeps those failures as publication gates
  in durable state while removing them from `supervisor-groups.json`; it
  backfills the vacated slots with runnable coverage groups.
- A fresh run root initially erased that quarantine because its empty supervisor
  state replaced the carried scheduler list. Quarantines are now monotonic for
  one candidate head, survive supervisor/run-root replacement, and are excluded
  during bootstrap as well as normal publication. A candidate-head change is
  the operation that clears them.
- Killing a novelty tmux session could leave its Node child parented by PID 1.
  A replacement then raced the orphan while both rewrote `novelty-state.json`
  and `supervisor-groups.json`. Each run now has an exclusive
  `.novelty-monitor-process.json` owner. The guard validates provenance, stops a
  matching orphan, and reattaches the monitor to the same run before considering
  a full campaign replacement.
- The generic session watchdog still bypassed that guard and launched a new run
  whenever the tmux session disappeared. Its recovery command now tries
  `reattach-coverage-once` first and creates a new campaign only when the current
  root or provenance is invalid. Reattach is idempotent and counts only monitor
  processes that own the named root.
- The generated monitor ran from the mutable all-merge control checkout even
  though its product source pointed at the exact candidate worktree. Runtime
  `bin/rtc-*` files now come from the validation/scripts repo, are frozen into
  the candidate worktree, and both the monitor and live analysis execute there.
  `source-manifest.tsv` records the monitor repo and SHA-256 hashes for the
  novelty monitor, live-analysis monitor, runner, supervisor, and triage
  watcher; the guard rejects drift.
- The guard preferred `/tmp/start_rtc_pr_progress_controller.sh`, whose stale
  default launched six PR personas and a synthesis job every two cycles. It now
  installs the versioned controller from the validation repo, propagates a zero
  persona cadence, verifies the live controller path/environment, and replaces
  stale runtimes automatically. Versioned critical and productive-analysis
  launchers also take precedence over `/tmp` copies.
- The supervisor iterated a dynamically reordered group array by numeric index,
  which could skip the newly promoted product-smoke gate for a full startup
  pass. It now processes each group name once per pass, even when policy changes
  order during serialized setup.
- Active-continuation accounting added tmux sessions and their matching Codex
  worktrees, double-counting every repair and silently suppressing the next
  forced repair at the cap. It now counts the union of normalized session and
  worktree identities. Plain-editor ownership also matches only its critical
  continuation session/worktree, not every triage command line that happens to
  mention the group name.
- Structural health counted the timeout wrapper, JavaScript launcher, and native
  Codex binary as three workers. It now counts only leaf Codex workers, avoiding
  false over-cap alerts and unnecessary analysis suppression.
- PR status could leave an already incorporated repair at `needs-validation`
  because it trusted only the local push manifest. Both critical routing and the
  human-readable PR table now treat a repair commit that is an ancestor of the
  current release-candidate head as `adopted-to-release-candidate`.
- The first plain-editor continuation reproduced the product failure but ended
  `blocked_specific` after asking for the REST/PHP stack. A repeat now enters a
  distinct server-error repair pass: it must capture the wp-sync response,
  owning callback, source location, and PHP stack in `server-error.tsv`, then
  create a focused fix branch or a source-backed `product_bug_reduced` artifact.
  The runner rewrites a repeat result to `followup_incomplete` when that artifact
  is absent.
- Same-candidate closure history marked four benchmark lanes deferred while
  current-root status correctly required fresh proof. Generic coverage-gap
  reservation then consumed the final five producer slots and displaced all
  four promotion blockers. Current open status now overrides deferred history,
  protected promotion lanes are ordered ahead of generic backfill at the final
  cap, and both the monitor and structural watchdog report a publication
  invariant when an open blocker is not scheduled.
- The resource autoscaler requested a 12-group productive budget after startup
  grace, while the deadline start policy authoritatively clamped the same run
  back to five groups. Every attempted scale-up therefore replaced the
  same-head root, lost current-run proof, and still returned to five groups.
  The autoscaler now treats the active deadline-capped run budget as
  authoritative. The guard will not reattach an old root while the serialized
  coverage start lock is held, stale-root novelty monitors terminate when the
  current-output pointer changes, and the structural watchdog detects both
  stale monitor ownership and deadline-budget disagreement.
- PR17 was correctly held behind the plain-editor and benchmark gates in
  `blockers.tsv`, but its queue row and launch condition ignored that state.
  Queue state now mirrors the blocker, and launch admission requires the
  blocker row itself to be `runnable`, so a held final-stack proof cannot consume
  a Codex worker.
- A plain-editor save follow-up can fail before the save request is reached.
  Future continuations must write `server-error.tsv` immediately; a pre-save
  readiness failure is recorded as `not_reached` with the earliest source
  evidence and reduced directly instead of waiting for a nonexistent REST
  response.
- A protected canary could remain in `supervisor-groups.json` and report
  `scheduled=yes` while the supervisor held it for six hours after one
  no-product startup-noise seed. Open promotion groups now bypass both the
  startup-stall cooldown and its seed-drain hold, so the failed seed is marked
  no-analysis and the next seed runs. Structural health separately reports
  promotion rows that are scheduled but paused.
- The runner labeled every full preflight failure `kind=infra`, including a
  human product smoke where three tests passed and the editor workflow produced
  runtime errors and HTTP 500. Those records caused same-seed relaunch loops
  instead of product quarantine and repair routing. Test-list, harness, and
  environment failures remain infra; an executed human smoke with actionable
  editor failure now writes failed behavioral coverage and `real-bug` evidence,
  preserves its product stop reason, and feeds the existing quarantine/critical
  repair path.
- The browser runner itself was missing from the source manifest. Its live copy
  had accumulated useful runtime fixes that were neither present on the
  published scripts branch nor protected from drift, so a campaign could change
  classification behavior without failing source validation. The live runner is
  now preserved on the scripts branch, hashed in every run manifest, and checked
  by the guard alongside the monitor, supervisor, and triage watcher.
- Dynamic group synchronization disabled old groups correctly, but also ran two
  Docker inventory commands for every already-disabled group before every
  active group. Eight historical groups turned a nominal 60-second supervisor
  poll into minutes of repeated cleanup scans and delayed both seed advancement
  and product quarantine. Removed-group cleanup is now memoized per policy
  transition, failed cleanup retries have a 15-minute backoff, and structural
  health reports a mature run whose disabled groups lack cleanup memos.
- The novelty monitor invoked the triage watcher with `--gate-only`, but the
  watcher ignored that flag and launched an xhigh Codex deep-triage job for each
  current run. Refreshes then timed out serially after two minutes and killed
  only the parent, so a five-group pass could spend ten minutes in triage while
  leaked descendants pushed analysis over its worker cap. Gate-only now updates
  signature state without launching Codex, refreshes run with bounded
  concurrency and a 30-second timeout, and timeout/shutdown terminates the whole
  refresh process group. Structural health reports any gate-only watcher that
  lives for a minute or has a Codex descendant.
- Full novelty passes can still be doing bounded triage when the supervisor
  discovers a product failure. The 60-second status heartbeat now synchronizes
  product-failure quarantine and republishes the producer set immediately.
  Quarantined groups remain release gates, but they no longer consume browser
  slots; structural health reports a quarantine retained in
  `supervisor-groups.json` for more than two minutes.
- Policy-required usability/oracle groups could bypass the monitor's publication
  noise filter but still enter the supervisor without startup-stall bypass
  flags. A selected group then occupied a slot during the same six-hour hold
  that publication had intentionally bypassed. The seed-drain flags were not
  enough when the group had already entered the full no-product guard, so
  published policy-required/open-promotion groups now carry an explicit
  no-product-guard bypass and advance past the failed seed. Health reports any
  published group left in a startup-stall hold for two minutes.
- The live-analysis monitor was another active runtime file present only in the
  mutable JS2 checkouts. It is now preserved on the scripts branch and included
  in the run manifest/guard hash invariant, so its gate and analysis admission
  behavior cannot drift silently from the published runbook.
- Isolated group reuse checked only for `package.json`. A group prepared before
  a runner/oracle fix could be disabled and later republished with the old
  harness; this is why the replacement reference-oracle lane still emitted the
  pre-fix `kind=infra` record. The monitor now content-hashes a bounded overlay
  of `bin/rtc-*`, editor collaboration tests/config, wp-env config, and the test
  provider; it atomically synchronizes changed files, records a per-repo
  manifest, and terminates lanes that loaded stale code. Supervisor admission
  requires the published overlay signature, and structural health compares
  critical files in every published repo with the frozen candidate.
- A live harness deployment briefly changes the frozen file before atomically
  replacing `source-manifest.tsv`. The guard previously interpreted that
  seconds-long window as durable drift and replaced the same-candidate campaign
  at `2026-07-10T02:42:50Z`. Fresh hash mismatches now receive a 180-second
  publication grace; if the manifest is still inconsistent after the grace,
  the normal forced restart remains in effect.
- Same-candidate product quarantines survived a run-root replacement, but the
  benchmark status writer only counted evidence still present in current run
  directories. Health therefore reported four intentionally quarantined lanes
  as unscheduled. The carried quarantine set now contributes retained product
  evidence, preserving the release gate without demanding another producer
  slot or spawning a false structural repair.
- The local publisher read its TSV with standard input attached to the whole
  loop. The first `ssh` probe consumed the remaining rows, so standalone repair
  publication could work while the following release-candidate destination was
  silently skipped. Manifest reads now use a dedicated file descriptor and
  remote probes close standard input. A persistent local publisher is running,
  and the structural watchdog reports either an unpublished validated repair or
  a published commit that has not reached the JS2 candidate ref after ten
  minutes.
- Repair branches appeared in `queue.tsv`, but `launch_validation_jobs` only
  iterated the static candidate branch set. Adopted repair branches are now the
  first validation class admitted under the six-job cap. Empty tracked
  `vendor/` directories also prevented dependency symlinks and made focused PHP
  validation look unavailable; empty dependency placeholders are now replaced
  with links to the matching source checkout.
- Adopted branch export initially compared repairs with Gutenberg trunk. That
  turned a one-line fix into a 5,035-file diff and a false `diff-check rc=2`.
  Repair validation now uses the merge base with the current all-merge
  candidate, falling back to the repair parent only when the candidate ref is
  unavailable.
- PR progress previously treated `central_present` as sufficient validation
  and emitted publish rows before the adoption continuation accepted the fix.
  It now requires a matching `repair_branch_adopted` classification and
  `push-manifest.tsv` for the exact branch and commit. The guard also compares
  the versioned PR-progress controller with its runtime copy and replaces drift.
- The launcher preserved a same-head root only while the novelty tmux session
  existed. A session-watchdog start could therefore race a guard reattach and
  replace a valid campaign during a brief monitor deployment. A fresh valid
  same-head root is now preserved for reattachment for up to 13 hours even when
  its tmux session is momentarily absent; only an explicit forced restart or a
  candidate-head change replaces it. Structural promotion scheduling also has a
  five-minute startup grace so mandatory human gates do not create a false
  unscheduled-canary repair while the first supervisor pass is still serially
  starting WordPress environments.
- Repair adoption was branch-aware but not candidate-aware. After `5a33df1e`
  still failed, workers could continue adopting sibling commits based on
  `1582cdec` that contained the same ineffective patch. Adoption state now
  marks a repair already present in the release candidate as terminal evidence,
  marks old-head siblings `stale-candidate-base`, and admits only descendants of
  the current candidate to validation/publication. Current repair worktrees also
  replace the tracked `vendor/.gitignore` placeholder with the matching source
  dependency tree, so focused PHP tests are actually available.

The first exact-candidate run found a reproducible product failure within
minutes: `/wp-json/wp-sync/v1/save` returned HTTP 500 during the plain-editor
save/reload/collaborator smoke workflow. The run wrote a failed behavioral
record for seed `1255001`, promoted `plain-editor-product-smoke` to a publication
gate, and launched a bounded critical continuation. The triage normalizer now
classifies this family as `rtc-save-rest-500` instead of `unknown`.

Run `run-20260710T004959Z` independently reproduced failed product evidence in
both plain-editor and real-world editor workflows and quarantined each after
generation 1. Later same-head runs expanded that quarantine to nine product
workflow/canary groups while continuing to backfill runnable producer slots.
Those failures produced three committed repair heads for the same
`/wp-sync/v1/save` meta-unslashing bug. Two independent reductions changed the
failing `200/500 rest_crdt_save_failed` sequence to `200/200`, and the repair
tree also passed a direct plain-editor edit/save/reload smoke.

At `2026-07-10T03:00Z`, the repaired local publisher fast-forwarded
`js2/all-merged-rebased-20260701` from `1582cdec4f27` to
`5a33df1eb773`. JS2 then started exact-candidate run
`run-20260710T030340Z` at that head. Its initial five slots are the plain-editor
product smoke, real-world editor usability, large-post lifecycle, title reload
convergence, and persistence probe. All five reproduced the same
`/wp-sync/v1/save` HTTP 500; the plain-editor result arrived about 90 seconds
after its runner started, and each lane was classified as a real product bug
and quarantined after generation 1. Three bounded repair jobs based on
`5a33df1e` launched within minutes. This proves that the prior direct reduction
was insufficient while also demonstrating that the repaired product gate now
catches the discrepancy promptly.

A controlled monitor deployment exposed the final same-head start race and
created `run-20260710T031406Z` before the launcher guard above was installed.
That run retained all five quarantines, completed a full pass with 288 carried
records, and backfilled five runnable groups. A direct no-force launcher test
then preserved the exact root and pointer, confirming the race fix.

The source invariant is recorded in every run's `source-manifest.tsv`. It names
the candidate ref/head/tree, exact product worktree, control and harness
checkouts, overlay count, monitor worktree, critical harness hashes, and mode
`exact-candidate-plus-harness-overlay`. The guard restarts a run when the named
candidate ref advances, the snapshot head differs, the manifest is absent, the
monitor is not executing from the frozen worktree, a harness hash differs, or
an undeclared product path changes.

```mermaid
flowchart TB
    Ref[js2/all-merged-rebased-20260701] --> Exact[exact detached candidate worktree]
    Harness[versioned validation harness] --> Frozen[frozen named harness overlay]
    Frozen --> Exact
    Deps[commit-keyed npm ci and production build] --> Exact
    Exact --> G1[plain-editor product smoke]
    Exact --> G2[real-world editor usability]
    Exact --> G3[RTC collaboration groups]

    subgraph Core[rtc-fuzz core socket]
        Monitor[novelty monitor]
        Supervisor[browser supervisor]
        Resource[resource autoscaler]
        Watchdog[session watchdog]
    end

    subgraph Analysis[rtc-analysis socket]
        Live[live failure analysis]
    end

    G1 --> Supervisor
    G2 --> Supervisor
    G3 --> Supervisor
    Supervisor --> Monitor
    Monitor --> Live
    Guard[outside-tmux guard] --> Core
    Guard --> Analysis
```

Current feeds and speeds after the audit:

| Control | Value |
| --- | --- |
| Browser publication budget | 5 groups at the current benchmark cap |
| Mandatory product workflows | 2 slots until first current-run green |
| Supervisor poll | 60 seconds |
| Autoscaler/guard poll | about 120 seconds |
| Materialization startup grace | 900 seconds |
| Core restart cooldown | 120 seconds |
| Optional restart cooldown | 900 seconds |
| Productive-analysis concurrency | 1 lane |
| Live analysis concurrency | 2 evidence-triggered jobs |
| Structural Codex cap | 8 leaf workers; wrappers are not counted |
| Current product failures | 5 generation-1 groups on `5a33df1e`, all the same save HTTP 500 family; 3 same-head repair jobs active |
| Exact dependency install | about 49 seconds on first use per head |
| Exact production build | about 63 seconds on first use per head |
| Isolated group repo preparation | about 2 seconds per group after caching |

## 2026-07-08 Live Update

The current JS2 run is no longer just producing analysis loops. The control
plane now has an explicit repair-branch adoption path, fail-closed checks for
continuations that claim to have created a repair branch, bounded continuation
prompts, and recovery for orphaned continuation processes. At this snapshot:

- `rtc-critical-path-pr-executor-loop` is running in the `rtc-fuzz` tmux socket
  with the v2 reconcile lock path
  `/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/critical-path-pr-executor-reconcile.v2.lock`.
- Detached critical-path tmux launches close reconcile fd 8 and main-loop fd 9
  before `tmux new-session`, so long-lived continuation, validation,
  feedback-refresh, and controller sessions cannot inherit executor locks.
- `rtc-pr-progress-controller-loop` is expected to run in the same tmux socket;
  its status path explicitly reports a singleton running without tmux when a
  stale pid or lock holder exists.
- The current coverage-guided run root is
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260708T180419Z`.
- The critical-path executor reports `max active continuations: 3`,
  `max active validations: 6`, `cycle sleep seconds: 60`, and
  `reconcile timeout seconds: 300`.
- The all-merge candidate branch is `js2/all-merged-rebased-20260701` at
  `efe27afe3aebe2a9c04e95fd696de1ed052dfebc`.
- The latest candidate fast-forwards in the previous 48 hours landed two fix
  branches and four commits: rich-text entity normalization, HTTP polling queue
  resume for object rooms, faster HTTP collaborator polling in background tabs,
  and recoverable HTTP polling retry logging.
- The plain editor product smoke lane is a publication gate. A stale orphaned
  pre-guard smoke continuation was killed, recorded as `stale_orphan_killed`,
  and the current active smoke continuation is
  `rtc-critical-continuation-plain-editor-product-smoke-20260708T182113Z` with
  the bounded search prompt.
- Current known benchmark progress blocker:
  `benchmark-canary-fuzzer-gap`, owned by the coverage controller until the
  current run has green evidence or explicit downscope for every open
  promotion-blocking/status-only primary forced canary row. At
  `2026-07-08T18:23Z`, three forced HTTP canary rows had direct current-run
  green evidence, while `novelty-http-large-post-lifecycle` remained open and
  promotion-blocking.
- Current known product-repair blocker:
  `benchmark-canary-product-failure`, with product evidence in
  `novelty-http-large-post-lifecycle-completion`,
  `novelty-http-persistence-probe`, and
  `novelty-http-title-reload-convergence`. The latest repair-adoption row is
  `pa-exact-benchmark-canary-product-failure` in `central_present` state; it
  must still be validated, merged into the candidate, converted into a push
  manifest, or rejected with exact evidence.

Current controller topology:

```mermaid
flowchart TB
    subgraph JS2["Jetstream2 rtc-fuzz tmux socket"]
        Coverage[rtc-coverage-guided-supervisor]
        Novelty[rtc-coverage-guided-novelty]
        Analysis[rtc-coverage-guided-analysis]
        Critical[rtc-critical-path-pr-executor-loop]
        PRProgress[rtc-pr-progress-controller-loop]
        Continuations[bounded critical continuation sessions]
    end

    RunRoot[(current coverage run root)]
    Status[(current status TSV/MD files)]
    Decisions[(current-control-decisions.tsv)]
    Adoptions[(current-repair-branch-adoptions.tsv)]
    PRTable[(current-pr-progress.tsv)]

    Coverage --> RunRoot
    Novelty --> RunRoot
    Analysis --> RunRoot
    RunRoot --> Critical
    RunRoot --> PRProgress
    PRProgress --> Decisions
    Decisions --> Critical
    Critical --> Continuations
    Continuations --> Adoptions
    Adoptions --> Critical
    Adoptions --> PRProgress
    Critical --> Status
    PRProgress --> PRTable
```

Critical-path continuation recovery path:

```mermaid
flowchart TD
    Launch[critical continuation tmux session] --> Codex[Codex process in continuation worktree]
    Launch --> Prompt[bounded prompt with repository/artifact search limits]
    Codex --> Artifacts[classification.tsv, validation.tsv, report.md, repair-branch.txt]

    Codex -->|tmux gone, parent PID 1, grace exceeded| Orphan[stale orphan detector]
    Orphan --> Kill[kill process group]
    Kill --> Stale[write stale_orphan_killed artifacts]
    Stale --> Relaunch{blocker still open?}
    Relaunch -->|yes| NewPrompt[relaunch immediately, bypass recent-launch dedupe]
    Relaunch -->|no| Terminal[leave terminal evidence]

    Critical[critical executor reconcile] --> Lock[v2 reconcile lock]
    Critical --> TmuxWrap[tmux_new_session_detached closes fd 8 and fd 9]
    TmuxWrap --> Launch
```

Repair branch adoption path:

```mermaid
flowchart LR
    Continuation[continuation report] --> Claim{repair_branch_created?}
    Claim -->|missing repair-branch.txt| Invalid[repair_branch_invalid]
    Claim -->|branch does not resolve| Invalid
    Claim -->|head equals start head| Invalid
    Claim -->|committed delta| Adoption[current-repair-branch-adoptions.tsv]

    Adoption --> Central{central validation ref present?}
    Central -->|missing| Import[import source branch without overwriting conflicts]
    Central -->|present| Validate[branch validation lane]
    Import --> Validate

    Validate --> Result{validated?}
    Result -->|yes| Publish[publish or consume push manifest]
    Result -->|needs replay| Replay[bounded exact replay, e.g. parser seed 1010203]
    Result -->|no| Reject[explicit rejection with evidence]

    Publish --> AllMerge[current all-merge candidate]
    Replay --> AllMerge
    Reject --> Status[terminal status row]
```

Current publication gate path:

```mermaid
flowchart TB
    Candidate[js2/all-merged-rebased-20260701 at 5a33df1e] --> CoverageRun[coverage-guided run run-20260710T031406Z]
    CoverageRun --> CanaryStatus[benchmark-canary-coverage-status.tsv]
    CoverageRun --> SmokeStatus[novelty-status.md plain-editor smoke row]
    CoverageRun --> ProductEvidence[current product-failure evidence]

    CanaryStatus --> CanaryGate{all forced canaries current-run green or downscoped?}
    SmokeStatus --> SmokeGate{plain editor edit/save/reload green?}
    ProductEvidence --> ProductGate{product failures repaired or downscoped?}

    CanaryGate -->|no| FuzzerGap[benchmark-canary-fuzzer-gap]
    SmokeGate -->|no| PlainSmoke[plain-editor-product-smoke continuation]
    ProductGate -->|no| ProductRepair[benchmark-canary-product-failure repair/adoption]

    FuzzerGap --> Critical[critical-path executor]
    PlainSmoke --> Critical
    ProductRepair --> Critical
    Critical --> Adoption[current-repair-branch-adoptions.tsv]
    Adoption --> Candidate

    CanaryGate -->|yes| PublishReady[publication confidence]
    SmokeGate -->|yes| PublishReady
    ProductGate -->|yes| PublishReady
    PublishReady --> MaintainerPR[human-reviewable PR set]
```

Current feeds and speeds:

| Loop or feed | Current cadence / cap | Current state |
| --- | --- | --- |
| `rtc-critical-path-pr-executor-loop` | 60 second cycle, 300 second reconcile timeout | Running; opens/updates blockers and bounded continuation jobs |
| Critical continuations | Max 3 active | One evidence-owned `plain-editor-product-smoke` repair is active; held PR17 work is no longer admitted |
| Critical validations | Max 6 active | Used for adopted repair branches and ready branch checks |
| `rtc-pr-progress-controller-loop` | 120 second cycle, max 2 active PR jobs | Running; reserves discovery and exposes repair-adoption rows |
| Discovery reserve | Minimum 3 active discovery sessions | Healthy at 4 active discovery sessions |
| Coverage-guided novelty | Current run root updates status every monitor pass | Running on `run-20260710T031406Z`; five product failures are quarantined and five runnable replacement groups are materializing |
| Plain editor smoke | Publication gate | Failed on repaired candidate in about 90 seconds with the same save HTTP 500; correctly retained as a release gate |
| Product repair feed | Rewritten each critical reconcile | Three current-head repairs started within minutes; sibling prior-head repairs no longer consume fuzz slots |
| Repair adoption feed | Rewritten each critical reconcile | Exact adoption manifests are required; `5a33df1e` was published locally and adopted into the release candidate |

## Blocker Age And Failed Mitigations

As of 2026-07-08 UTC, the JS2 RTC fuzz pipeline has been dealing with the same
broad blocker class for roughly six weeks. The durable fuzzing roots started
around 2026-05-15, the benchmark canary feedback root started on 2026-05-20,
and the all-merge fuzz stack started on 2026-05-26. The specific stale feedback
that most recently kept reopening work was last written on 2026-05-24 in
`/media/volume/danluu-fuzz-data/rtc-benchmark-canary-feedback-20260520/current-feedback.tsv`,
so it was about 40 days old by 2026-07-03 and referred to the older
`2f8247258316bde60869c06c383090904e9426bd` candidate, not the current rebased
all-merge branch head.

The repeated failure mode was not simply lack of CPU or lack of fuzzing volume.
Several mitigations were tried and were insufficient:

- raising browser fuzz caps and resuming lanes, which increased activity but did
  not clear false control-plane gates;
- scheduler tweaks, which could not help while inherited benchmark feedback was
  being interpreted as live product failure evidence;
- exact-stack or benchmark reruns by themselves, because coverage-status rows
  and inherited `current-feedback.tsv` rows could still be converted into
  blockers;
- treating `exact_stack_green` as product confidence, which confused repair
  evidence for a known stack with current-run product coverage;
- product repair fanout, which wasted Codex cycles when stale, green, or
  non-promotion-blocking rows were accepted as open product blockers;
- killing tmux sessions only, which missed orphaned Codex process groups that
  active-job detection later adopted;
- productive-analysis classifications alone, which churned while feedback
  hashes and mtimes reopened rows;
- hardcoded monitor restart wrappers, which could restart a monitor against an
  old output directory;
- broad directory/artifact scans, which were too slow and noisy for health
  decisions.

The July 2026 recurrence guards are now: ignore stale or inherited feedback that
does not match the current branch head; never infer exact-stack blockers from
coverage-status rows or reason prose; require open, non-green,
`promotion_blocked=yes` product evidence before launching product repair; keep
`downscoped_to_coverage_materialization` terminal when the live canary has no
effective product blocker; kill orphaned process groups as well as tmux
sessions; and read the current output directory dynamically when restarting the
novelty monitor. The additional 2026-07-08 guards make
`repair_branch_created` fail closed unless a committed branch head differs from
the continuation start head, surface repair-branch adoption as first-class PR
progress rows, cache continuation classification lookups, and report
parentless PR-progress controllers as `running without tmux` until the `start`
path clears matching stale lock holders and relaunches the durable session.
The late 2026-07-08 critical-path guardrail adds bounded continuation prompts,
`stale_orphan_killed` artifacts for orphaned Codex processes, immediate relaunch
after stale-orphan cleanup, and v2 reconcile locking with fd-closing tmux
launches so long-lived tmux children cannot hold the reconcile lock.

When CPU is unexpectedly idle or a blocker looks old, check blocker age and live
evidence first. The detailed checklist and commands are in
[`real-time-collaboration-fuzzing-pipeline-runbook.md`](real-time-collaboration-fuzzing-pipeline-runbook.md).

## Two-Host System Map

```mermaid
flowchart TB
    User[human requests] --> Local[local machine]
    Local --> GitHub[(danluu/gutenberg)]
    GitHub --> Explain[explain/rtc-jetstream2-fuzz-progress-20260515]
    GitHub --> Scripts[try/jetstream-fuzz]
    GitHub --> Branches[ready and stack branches]

    subgraph LocalHost["local machine"]
        LocalTmux[tmux sessions]
        LocalCoverage[local coverage lanes]
        BenchmarkGate[maintainer snapshot benchmark gate]
        LocalBridge[local triage and coverage bridge]
        TrendPublisher[trend graph updater]
        ReportPublisher[productive report publisher]
        LocalPersona[local Jetstream productivity persona loop]
        LocalPruner[artifact pruner and restore logger]

        LocalTmux --> LocalCoverage
        LocalTmux --> BenchmarkGate
        LocalTmux --> LocalBridge
        LocalTmux --> TrendPublisher
        LocalTmux --> ReportPublisher
        LocalTmux --> LocalPersona
        LocalTmux --> LocalPruner
    end

    subgraph Jetstream2["Jetstream2 /media/volume/danluu-fuzz-data"]
        JTmux[tmux socket rtc-fuzz]
        Resource[global CPU and resource autoscaler]
        Browser[browser and e2e fuzz supervisors]
        Lower[lower-level and protocol fuzzing]
        PRLoops[PR progress and blocker loops]
        Analysis[persona and productive analysis loops]
        Health[guard, structural watchdog, disk maintenance]
        Artifacts[(durable run artifacts, TSVs, JSON, coverage)]

        JTmux --> Resource
        JTmux --> Browser
        JTmux --> Lower
        JTmux --> PRLoops
        JTmux --> Analysis
        JTmux --> Health

        Resource --> Artifacts
        Browser --> Artifacts
        Lower --> Artifacts
        PRLoops --> Artifacts
        Analysis --> Artifacts
        Health --> Artifacts
    end

    LocalBridge -->|scp/ssh result feed| Artifacts
    BenchmarkGate -->|benchmark-canary feedback| Artifacts
    ReportPublisher -->|push markdown| Explain
    TrendPublisher -->|push plots and markdown| Explain
    PRLoops -->|push manifests and handoff files| LocalBridge
    Local -->|push branch contents| Branches
    Scripts -->|deploy/update scripts| Jetstream2
```

## Jetstream Control Plane

```mermaid
flowchart TB
    Artifacts[(durable state under data root)]

    Guard[rtc-jetstream guard and watchdog launchers] --> Sessions[exact tmux session checks]
    Sessions --> Restart[bounded restart via stable launchers]
    Restart --> Artifacts

    Autoscaler[rtc-resource-autoscaler] --> Metrics[CPU, load, memory, root disk, data disk]
    Metrics --> Budget[current and desired browser budgets]
    Budget --> SupervisorGroups[browser supervisor group materialization]
    SupervisorGroups --> Artifacts

    Structural[rtc-structural-issue-watchdog] --> AliveWrong[alive-but-wrong checks]
    AliveWrong --> RootAgreement[current-root and supervisor agreement]
    AliveWrong --> Runaway[runaway scans and stale statuses]
    AliveWrong --> ControllerPathologies[controller churn and stale blockers]
    Structural --> Repairs[bounded structural repair Codex jobs]
    Repairs --> Artifacts

    Productive[rtc-productive-analysis-loop] --> Actions[current-actions.tsv]
    Actions --> Critical[critical-path feedback]
    Actions --> DeferredFeed[deferred-family gates]
    Actions --> LowerFeed[lower-level retargeting]
    Actions --> PRFeed[PR controller rule updates]
    Productive --> Artifacts

    LevelMix[rtc-fuzz-level-mix-persona-loop] --> FuzzMix[fuzzing mix decisions]
    FuzzMix --> Browser
    FuzzMix --> Lower
    FuzzMix --> Artifacts

    Browser[browser/e2e supervisors]
    Lower[lower-level fuzz loops]

    Artifacts --> Structural
    Artifacts --> Productive
    Artifacts --> LevelMix
    Artifacts --> Autoscaler
```

Current autoscaler status at the snapshot:

```text
updated: 2026-07-08T03:49:29Z
cpu_percent: 50.4
load1: 47.36 / 64 cores
load5: 38.42 / 64 cores
load15: 32.39 / 64 cores
mem_available_gib: 196.2
root_disk_available_gib: 68.9
data_disk_available_gib: 280.3
docker_root_dir: /var/lib/docker
enabled_groups: 16
current_budget: target=16 max=16
desired_budget: target=16 max=16
materialized_active_run_dirs: 11
materialized_running_groups: 14
paused_infra_startup_groups: 0
supervisor_state_age_seconds: 25
supervisor_status_counts: disabled:6|recovering:3|running:11|waiting-repo-prep:2
last_action: observe
reason: deadline_benchmark_canary_finalization_ceiling
```

The resource controller is responsible for capacity and scale only. It should
not decide that analysis should stop. The mix loop decides what work is useful;
the autoscaler decides how much CPU-heavy work can run safely.

## Browser And Coverage Fuzz Data Flow

```mermaid
flowchart LR
    Groups[supervisor-groups.json] --> Supervisor[rtc-browser-fuzz-supervisor.mjs]
    Supervisor --> Env[wp-env, browser, optional WS relay]
    Env --> Gen[generation directory]
    Gen --> Lanes[lane processes]
    Lanes --> Seeds[seed attempts]
    Seeds --> Coverage[rtc-behavioral-coverage*.json]
    Seeds --> Summary[summary.ndjson]
    Seeds --> PW[Playwright traces and artifacts]

    Coverage --> Novelty[novelty monitor]
    Summary --> Triage[triage watcher and analysis tier]
    PW --> Triage

    Novelty --> Goals[coverage goals, novelty, unmet-goal count]
    Goals --> Groups
    Triage --> Results[likely-real, uncertain, duplicate, noise]
    Results --> BugIndex[bug and artifact indexes]
    Results --> Deferred[deferred work promotion]
    Results --> PRProgress[PR progress controller]
```

Current high-level browser and coverage families include:

- `rtc-coverage-guided-*`: coverage-goal and novelty guided browser fuzzing.
- `rtc-fuzz-strict-expansion`: broad strict RTC coverage.
- `rtc-focused-shards`: focused high-value product and benchmark-derived shards.
- `rtc-gap-booster`: targeted coverage gaps.
- `rtc-operator-correctness-fuzz-*`: operator correctness and regression probes.
- `rtc-backend-api-fuzz`: server/API-heavy coverage.
- local coverage lanes for same-user tabs, revisions/autosave, rich UI actions,
  block coverage, permissions/auth, async/server blocks, and three-user late
  joins.

## Lower-Level And Protocol Fuzzing

```mermaid
flowchart TB
    Mix[rtc-fuzz-level-mix-persona-loop] --> Unit[unit/property fuzzing]
    Mix --> CGLower[coverage-guided lower-level fuzzing]
    Mix --> Native[native harness builders]
    Mix --> Protocol[protocol/server fuzzing]
    Mix --> Asserts[fuzz-only assertion loop]

    Productive[productive analysis retargeting] --> CGLower
    Productive --> Protocol
    Productive --> Unit

    CGLower --> HttpPolling[http polling manager lane]
    CGLower --> Parser[parser and serialization targets]
    CGLower --> Query[query array and rich text targets]
    Protocol --> Server[server sync and persistence oracles]
    Native --> NativeHarness[native harness experiments]
    Asserts --> AssertNoise[assert noise triage and tweaks]

    Unit --> Events[events and execution counts]
    HttpPolling --> Events
    Parser --> Events
    Query --> Events
    Server --> Events
    NativeHarness --> Events
    AssertNoise --> Events
```

At this snapshot, lower-level work is primarily represented by productive
analysis action rows and controller retargeting, not by a single obvious
dedicated lower-level tmux session in the filtered live-session view. When a
lower-level lane is active, it should consume canary-derived reload,
parser/serialization, and persisted-CRDT oracles instead of allowing generic
exploration to count as progress for the benchmark canary gap.

Lower-level and protocol work should be evaluated by bug output and oracle
quality, not just by wrapper invocation counts.

## PR Progress And Promotion

```mermaid
flowchart LR
    Triage[(triage results and bug families)] --> Deferred[rtc-deferred-work-promotion-loop]
    Triage --> Critical[rtc-critical-path-pr-executor-loop]
    Benchmark[local benchmark gate feedback] --> Critical
    Productive[productive analysis actions] --> Critical
    Productive --> Deferred
    Productive --> PRController[rtc-pr-progress-controller-loop]

    PRController --> PersonaWave[parallel persona reviews plus synthesis]
    PersonaWave --> Decisions[current-control-decisions.tsv]
    Decisions --> Critical
    Decisions --> Deferred
    Decisions --> Manifest[current-push-manifest.tsv]

    Deferred --> Candidate[candidate heads and downscope evidence]
    Critical --> Validation[per-PR validation and exact-stack closure]
    Validation --> Finalization[rtc-pr-finalization-loop]
    Finalization --> Manifest

    Manifest --> LocalPublisher[local publisher with GitHub access]
    LocalPublisher --> Branches[ready branches and all-merged stack]
```

Current PR progress controller status at the snapshot:

```text
updated: 2026-07-08T03:50:16Z
cycle sleep seconds: 120
max active PR jobs: 2
active PR jobs: 0
active discovery sessions: 4
min discovery sessions: 3
discovery protected: no
resource reason: deadline_benchmark_canary_finalization_ceiling
```

Important live PR/progress decisions:

- Reserve at least three discovery sessions; the reserve is currently healthy
  with four active discovery sessions.
- Treat
  `repair/benchmark-canary-richtext-entity-canonical-20260708T025216Z@a51898eb5ee1d0f0cd009baebeb73f5e00558112`
  as the next P0 product-progress repair branch to validate, adopt, publish, or
  explicitly reject.
- Keep the aggregate `benchmark-canary-product-failure` blocker open until live
  materialized canary evidence is repaired or explicitly downscoped.
- Block duplicate heavy benchmark-canary repair while the central-present
  repair branch and canary materialization are pending.
- Keep `benchmark-canary-fuzzer-gap` consuming protected capacity until every
  promotion-blocked or status-only primary canary row is current-run green or
  explicitly downscoped.
- Select at most one focused canary child after a materialized reread; otherwise
  keep the aggregate owner to avoid sibling fanout churn.

## Productive Analysis Loop

```mermaid
flowchart TB
    Inputs[graphs, blocker TSVs, benchmark feedback, triage, lower-level yield] --> Scheduler[rtc-productive-analysis-loop]
    Scheduler --> Lane1[PR blocker router]
    Scheduler --> Lane2[benchmark-to-fuzzer closure]
    Scheduler --> Lane3[deferred-family reducer]
    Scheduler --> Lane4[lower-level yield retarget]

    Lane1 --> Actions[current-actions.tsv]
    Lane2 --> Actions
    Lane3 --> Actions
    Lane4 --> Actions

    Actions --> Critical[critical-path executor]
    Actions --> PRProgress[PR progress controller]
    Actions --> Deferred[deferred promotion loop]
    Actions --> Coverage[coverage and lower-level controllers]

    Scheduler --> Report[current-report.md]
    Report --> LocalReportPublisher[local report publisher]
    LocalReportPublisher --> GitHubReport[productive analysis report doc]
```

At the snapshot:

```text
updated: 2026-07-08T03:44:36Z
active lane jobs: 4
current action rows: 79
high-priority controller rows: 71
```

The loop currently emits actions for exact-stack benchmark-canary closure,
benchmark-canary product repair, deferred-family hard gates, PR07C
owner-evidence consumption, terminal reducer classification consumption,
publication holds, and lower-level oracle retargeting. Current P0 rows keep the
aggregate `benchmark-canary-product-failure` owner open until a live reread
shows no retained/nonzero/product-failure rows or a validated repair/downscope
clears them.

## Local Machine Loops

```mermaid
flowchart TB
    LocalTmux[local tmux sessions]

    LocalTmux --> SameUser[rtc-local-cov-same-user-stale-tabs]
    LocalTmux --> Revision[rtc-local-cov-revision-autosave]
    LocalTmux --> RealUI[rtc-local-cov-real-user-core-editing]
    LocalTmux --> Blocks[rtc-local-cov-block-gauntlet]
    LocalTmux --> Async[rtc-local-cov-async-server-blocks]
    LocalTmux --> Perms[rtc-local-cov-permissions-auth]
    LocalTmux --> ThreeUser[rtc-local-cov-three-user-late-join]

    SameUser --> LocalResults[(local fuzz and coverage results)]
    Revision --> LocalResults
    RealUI --> LocalResults
    Blocks --> LocalResults
    Async --> LocalResults
    Perms --> LocalResults
    ThreeUser --> LocalResults

    LocalTmux --> BenchmarkGate[rtc-maintainer-snapshot-benchmark-gate]
    LocalTmux --> Bridge[rtc-local-triage-jetstream-bridge]
    LocalTmux --> Trend[rtc-trend-autoupdate]
    LocalTmux --> ProductivePublisher[rtc-productive-analysis-report-publisher]
    LocalTmux --> Productivity[local-jetstream-productivity]
    LocalTmux --> RepairPersona[rtc-local-fuzz-repair-persona-loop]
    LocalTmux --> Pruner[rtc-local-artifact-pruner]
    LocalTmux --> RestoreLog[rtc-pr-fuzz-restore-logger]

    LocalResults --> Bridge
    BenchmarkGate --> Bridge
    Bridge --> JetstreamArtifacts[Jetstream durable artifacts]
    Trend --> ExplainBranch[explanation branch]
    ProductivePublisher --> ExplainBranch
    Productivity --> JetstreamArtifacts
    RepairPersona --> JetstreamArtifacts
```

Local coverage loops are intentionally not duplicates of Jetstream groups. They
cover cases that were missing or underrepresented in Jetstream scheduling, then
feed result summaries and triage back to Jetstream so the controllers see the
whole project state.

Current local tmux sessions at the snapshot:

```text
local-action-accelerator
local-jetstream-productivity
rtc-fuzz-handoff-1
rtc-local-artifact-pruner
rtc-local-cov-async-server-blocks
rtc-local-cov-block-gauntlet
rtc-local-cov-permissions-auth
rtc-local-cov-real-user-core-editing
rtc-local-cov-revision-autosave
rtc-local-cov-same-user-stale-tabs
rtc-local-cov-three-user-late-join
rtc-local-fuzz-repair-persona-loop
rtc-local-triage-jetstream-bridge
rtc-maintainer-snapshot-benchmark-gate
rtc-pr-fuzz-restore-logger
rtc-productive-analysis-report-publisher
rtc-trend-autoupdate
zendesk-rtc-bug-agents
```

The `rtc-maintainer-snapshot-benchmark-gate` loop publishes canary feedback to
Jetstream under `/media/volume/danluu-fuzz-data/rtc-benchmark-canary-feedback-20260520`.
The `rtc-local-triage-jetstream-bridge` loop is the main backfeed from local
coverage and local triage into the Jetstream control plane.

## Active Jetstream Loop Inventory

Current Jetstream tmux sessions at `2026-07-08T18:23Z`:

```text
rtc-coverage-guided-analysis
rtc-coverage-guided-novelty
rtc-coverage-guided-supervisor
rtc-coverage-guided-watchdog
rtc-critical-continuation-plain-editor-product-smoke-20260708T182113Z
rtc-critical-continuation-productive-analysis-action-20260708T182136Z
rtc-critical-path-pr-executor-loop
rtc-pr-progress-controller-loop
```

Short-lived persona worker sessions also appear during PR progress, duplicate
noise review, deferred work, native/protocol work, and targeted repair. The
`rtc-critical-continuation-*` rows above are short-lived work sessions from the
current cycle, not durable owners. The durable owner loops must adopt, time out,
or replace them.

## Current Data Roots

Use pointer files instead of guessing the latest timestamp.

```text
/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/current-output-dir.txt
/media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515/current-run-root.txt
/media/volume/danluu-fuzz-data/rtc-gap-booster-20260515/current-run-root.txt
/media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515/current-run-root.txt
```

Important top-level roots:

```text
/media/volume/danluu-fuzz-data/rtc-benchmark-canary-feedback-20260520
/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515
/media/volume/danluu-fuzz-data/rtc-coverage-guided-lower-level-http-polling-manager-20260520
/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517
/media/volume/danluu-fuzz-data/rtc-deferred-work-promotion-20260516
/media/volume/danluu-fuzz-data/rtc-fuzz-focused-shards-20260515
/media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515
/media/volume/danluu-fuzz-data/rtc-gap-booster-20260515
/media/volume/danluu-fuzz-data/rtc-native-assert-protocol-20260516
/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516
/media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518
/media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521
/media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516
/media/volume/danluu-fuzz-data/rtc-structural-watchdog-20260518
```

## Durable State Contract

The durable state files are the API between loops:

```text
<campaign-root>/current-output-dir.txt or current-run-root.txt
<run-root>/supervisor-groups.json
<run-root>/supervisor-state.json
<run-root>/events.ndjson
<run-root>/novelty-status.md
<run-root>/novelty-state.json
<generation>/lanes.json
<generation>/lane-*/summary.ndjson
<generation>/lane-*/state.json
<generation>/lane-*/seed-*/primary/artifacts/rtc-behavioral-coverage*.json
<generation>/.triage-watcher/**/result.json
<controller-root>/current-*.tsv
<controller-root>/current-*.md
```

If a loop makes a decision from a graph, a status document, or a persona report,
it must also retain enough raw state in these files to reject stale or incorrect
interpretations.

## Operational Invariants

- Top-level Jetstream loops live in the `rtc-fuzz` tmux socket and use exact
  session name checks.
- Local loops live in the local tmux server and publish or bridge results instead
  of directly mutating Jetstream state without durable evidence.
- `supervisor-state.json.outputDir` must match the current root before a
  supervisor is considered healthy.
- Requested browser budget is not success unless the supervisor has live run
  directories or running groups.
- Startup-only status must not overwrite a completed full status for the same
  output root.
- Historical duplicate/noise metrics can inform policy, but active health and
  restart decisions must use current-run scope.
- Autoscaling changes capacity; fuzz-level mix changes what kinds of CPU-heavy
  work are useful.
- Analysis jobs are cheap on CPU unless they launch tests. They should not be
  throttled just because browser fuzzing is under load.
- Jetstream writes handoff artifacts and push manifests; the local machine pushes
  branches to GitHub.
- Local benchmark failures are not a quality gate in place of fuzzing. They are
  high-signal evidence that the fuzzer is missing coverage or oracle strength,
  and that evidence must feed back into Jetstream controllers.

## Inspection Commands

Check current Jetstream tmux loops:

```bash
ssh exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org \
  'tmux -L rtc-fuzz list-sessions | cut -d: -f1 | sort'
```

Check local tmux loops:

```bash
tmux list-sessions | cut -d: -f1 | sort
```

Check autoscaler:

```bash
ssh exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org \
  'cat /media/volume/danluu-fuzz-data/rtc-resource-autoscaler-20260516/resource-autoscaler-status.md'
```

Check PR progress controller:

```bash
ssh exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org \
  'sed -n "1,120p" /media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518/current-pr-progress-controller-status.md'
```

Check productive analysis:

```bash
ssh exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org \
  'sed -n "1,120p" /media/volume/danluu-fuzz-data/rtc-productive-analysis-20260521/current-status.md'
```

Check structural watchdog:

```bash
ssh exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org \
  'sed -n "1,140p" /media/volume/danluu-fuzz-data/rtc-structural-watchdog-20260518/current-structural-watchdog-status.md'
```

Avoid running `wp-env clean` or global Docker cleanup while these loops are
active. Use the existing watchdog cleanup path or a targeted stale `wp-env`
cleanup script instead.
