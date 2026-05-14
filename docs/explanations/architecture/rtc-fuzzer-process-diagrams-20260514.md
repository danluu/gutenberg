# RTC Fuzzer Process Diagrams

Snapshot date: 2026-05-14

This document explains the moving parts in the local Gutenberg RTC browser
fuzzing pipeline. It is intended for someone who needs to understand what is
running, what is monitored, what restarts what, and where durable state lives.

For commands and exact environment variables, use the companion runbook:
[real-time-collaboration-fuzzing-pipeline-runbook.md](./real-time-collaboration-fuzzing-pipeline-runbook.md).

## High-Level Topology

The pipeline is intentionally split into services. Browser lanes keep finding
failures. Codex-heavy tiers classify and deduplicate failures. Browser-heavy
triage is reserved for candidates that survive analysis. Monitors keep the
system healthy and write durable status.

```mermaid
flowchart TB
	subgraph Base["Auditable fuzz base"]
		Trunk["origin/trunk"]
		Fixes["selected RTC fixes"]
		BaseBranch["try/fuzz or known-fixes branch"]
		Trunk --> BaseBranch
		Fixes --> BaseBranch
	end

	subgraph Services["Local services"]
		HttpEnv["wp-env HTTP test site"]
		WsEnv["wp-env WS test site"]
		WsRelay["rtc-test-ws-sync-server.mjs"]
		OrbStack["OrbStack / Docker"]
	end

	subgraph BrowserFuzz["Browser fuzz execution"]
		Supervisor["rtc-browser-fuzz-supervisor.mjs"]
		Launcher["rtc-browser-fuzz-launcher.mjs"]
		RunnerHttp["rtc-browser-fuzz-runner.mjs HTTP lanes"]
		RunnerWs["rtc-browser-fuzz-runner.mjs WS lanes"]
	end

	subgraph Artifacts["Durable run artifacts"]
		SupState["supervisor-state.json"]
		Events["events.ndjson"]
		Summary["lane summary.ndjson"]
		Replay["seed replay.json"]
		Coverage["rtc-behavioral-coverage.ndjson"]
		TriageState[".triage-watcher/state.json"]
	end

	subgraph Analysis["Triage and analysis"]
		Gate["triage-watcher --gate-only"]
		AnalysisTier["analysis-tier Codex-only"]
		DeepTier["deep-analysis-tier Codex-only"]
		BrowserTriage["triage-watcher browser repro"]
		Handoff["handoff / bug reports"]
	end

	subgraph Monitors["Monitoring and repair"]
		Watchdog["rtc-browser-fuzz-watchdog.mjs"]
		LiveAnalysis["rtc-browser-fuzz-live-analysis-monitor.mjs"]
		Novelty["rtc-browser-fuzz-novelty-monitor.mjs"]
		Periodic["periodic Codex monitor"]
		Cleanup["wp-env cleanup and event pruning"]
	end

	BaseBranch --> Supervisor
	Supervisor --> HttpEnv
	Supervisor --> WsEnv
	Supervisor --> WsRelay
	Supervisor --> Launcher
	Launcher --> RunnerHttp
	Launcher --> RunnerWs
	RunnerHttp --> Summary
	RunnerWs --> Summary
	RunnerHttp --> Replay
	RunnerWs --> Replay
	RunnerHttp --> Coverage
	RunnerWs --> Coverage
	Supervisor --> SupState
	Supervisor --> Events

	Summary --> Gate
	Gate --> TriageState
	TriageState --> AnalysisTier
	AnalysisTier --> DeepTier
	AnalysisTier --> BrowserTriage
	DeepTier --> BrowserTriage
	BrowserTriage --> Handoff

	SupState --> Watchdog
	Watchdog --> Supervisor
	Watchdog --> Cleanup
	SupState --> LiveAnalysis
	LiveAnalysis --> Gate
	LiveAnalysis --> AnalysisTier
	LiveAnalysis --> DeepTier
	Coverage --> Novelty
	Novelty --> Supervisor
	Periodic --> Cleanup
	Periodic --> AnalysisTier
	Periodic --> BrowserTriage
	Periodic --> Handoff
	OrbStack --> HttpEnv
	OrbStack --> WsEnv
	Cleanup --> OrbStack
```

## Process Ownership

Every long-running service has one owner. This avoids two processes trying to
repair the same environment or consume the same queue.

```mermaid
flowchart LR
	subgraph Tmux["tmux service owners"]
		SupTmux["rtc-fuzz-supervisor"]
		WatchTmux["rtc-fuzz-watchdog"]
		LiveTmux["rtc-live-analysis-*"]
		TriageTmux["rtc-triage-*"]
		NoveltyTmux["rtc-fuzz-novelty-monitor"]
		NoveltySupTmux["rtc-fuzz-novelty-supervisor"]
		PeriodicTmux["rtc-periodic-codex-monitor-*"]
	end

	SupTmux -->|"owns group launch, lane replacement, wp-env repair, WS relay"| Supervisor["supervisor"]
	WatchTmux -->|"owns supervisor liveness and stale wp-env cleanup"| Watchdog["watchdog"]
	LiveTmux -->|"owns gate-only signature discovery and Codex-only analysis"| LiveAnalysis["live analysis monitor"]
	TriageTmux -->|"owns browser-heavy repro attempts"| BrowserTriage["triage watcher without --gate-only"]
	NoveltyTmux -->|"owns coverage policy and generated novelty groups"| Novelty["novelty monitor"]
	NoveltySupTmux -->|"owns browser lanes for novelty groups"| NoveltySupervisor["novelty supervisor"]
	PeriodicTmux -->|"owns resource review, queue adjustments, status notes"| Periodic["periodic monitor"]

	Watchdog -->|"restart if missing or stale"| SupTmux
	LiveAnalysis -->|"spawn per-generation analysis tmux sessions"| AnalysisSessions["rtc-analysis-*"]
	Novelty -->|"start or update"| NoveltySupTmux
	Periodic -->|"append decisions"| Status["monitor-status.md"]
```

Example live sessions from the current campaign included:

- `rtc-known-fixes-fuzz-matrix-20260514`: known-fixes browser matrix.
- `rtc-known-fixes-matrix-codex-20260514`: 6 first-level analysis panes and 6 deep-analysis panes.
- `rtc-periodic-codex-monitor-mixed-20260502`: resource and queue monitor for the mixed long run.
- `rtc-known-fixes-ledger-refresh-20260514`: refreshes the known-fixes all-issue ledger.
- Older `rtc-analysis-*` and `rtc-live-analysis-*` sessions for historical mixed-run generations.

Treat those names as examples. The durable contract is the state files and run
roots, not the exact tmux session name.

## Browser Lane Loop

Each browser lane runs one seed at a time. The runner is designed to keep
fuzzing even when failures are found. Detailed analysis is normally disabled in
the runner with `RTC_FUZZ_INLINE_CODEX=0` so browser time is not blocked by
analysis.

```mermaid
sequenceDiagram
	participant S as supervisor
	participant L as launcher
	participant R as runner lane
	participant E as wp-env / WS relay
	participant P as Playwright browsers
	participant A as artifact dir

	S->>E: check status, start or repair if needed
	S->>L: launch generation with start seeds and stride
	L->>R: start lane process
	loop until duration or stop reason
		R->>E: HTTP health and service readiness checks
		R->>P: run collaboration-fuzz.spec.ts for seed
		P->>E: real editor actions over HTTP polling or WS provider
		P-->>R: pass, failure, timeout, or infra error
		R->>A: write seed replay.json, command log, artifacts
		R->>A: append summary.ndjson and events.ndjson
		R->>A: update lane state.json
	end
	R-->>S: process exits
	S->>S: mark generation complete or launch replacement
```

Important lane outputs:

- `state.json`: current seed, counters, last update, stop reason.
- `summary.ndjson`: compact queue source for triage.
- `events.ndjson`: durable event stream for progress and repair events.
- `seed-<seed>/<attempt>/replay.json`: exact replay manifest.
- `rtc-behavioral-coverage.ndjson`: behavioral and optional CDP coverage for novelty.

## Supervisor And Watchdog Loop

The supervisor owns active fuzz groups. The watchdog owns supervisor liveness
and conservative stale `wp-env` cleanup. Humans and Codex jobs should not run
`wp-env clean` or restart shared fuzz environments while lanes are active.

```mermaid
flowchart TD
	Start["watchdog tick"]
	CheckTmux{"supervisor tmux session exists?"}
	CheckState{"supervisor-state.json fresh?"}
	StartSupervisor["start supervisor tmux loop"]
	RestartSupervisor["kill and restart supervisor tmux loop"]
	RunCleanup["run rtc-fuzz-cleanup-stale-wp-env.mjs"]
	WriteWatch["write watchdog-state.json and watchdog-events.ndjson"]
	Sleep["sleep RTC_FUZZ_WATCHDOG_POLL_MS"]

	Start --> CheckTmux
	CheckTmux -- no --> StartSupervisor
	CheckTmux -- yes --> CheckState
	CheckState -- stale --> RestartSupervisor
	CheckState -- fresh --> RunCleanup
	StartSupervisor --> RunCleanup
	RestartSupervisor --> RunCleanup
	RunCleanup --> WriteWatch
	WriteWatch --> Sleep
	Sleep --> Start
```

Supervisor repair is bounded and active-environment aware:

- It checks `wp-env status` before starting anything.
- It can use generated Docker Compose files for active `wp-env` repair.
- It may restart OrbStack Docker only with a cooldown and only for stale Docker endpoint cases.
- It writes repair events to `events.ndjson` and group-specific logs.

Watchdog cleanup is conservative:

- It never removes running containers.
- It protects a compose project if any container in that project is running.
- It removes stale stopped wp-env containers and networks older than the threshold.
- Volume and `~/.wp-env` directory pruning are opt-in.

## Multi-Level Triage Loop

The triage system separates cheap analysis from expensive browser repros. This
is the main reason the pipeline can use many Codex jobs without starting many
more Chrome instances.

```mermaid
flowchart TB
	Summary["summary.ndjson"]
	Discover["triage-watcher scans summaries"]
	Normalize["normalize error text and group signatures"]
	SignatureState[".triage-watcher/state.json"]
	GateOnly{"gate-only mode?"}
	BrowserQueue["browser-heavy repro queue"]
	AnalysisQueue["analysis-tier queue"]
	Analysis["Codex-only first-level analysis"]
	AnalysisResult["result.json, analysis.md, handoff.md"]
	Decision{"recommended action"}
	Suppress["suppress_as_infra -> analysis-gated"]
	Merge["merge_with_duplicate -> analysis-gated"]
	Collect["keep_collecting -> analysis-gated or wait"]
	Deep["deep-analysis-tier Codex-only"]
	DeepResult["deep result and repro-handoff"]
	Browser["browser repro triage"]
	Status["STATUS.md and result.json"]

	Summary --> Discover --> Normalize --> SignatureState
	SignatureState --> GateOnly
	GateOnly -- yes --> AnalysisQueue
	GateOnly -- no --> BrowserQueue
	AnalysisQueue --> Analysis --> AnalysisResult --> Decision
	Decision -- suppress_as_infra --> Suppress --> SignatureState
	Decision -- merge_with_duplicate --> Merge --> SignatureState
	Decision -- keep_collecting --> Collect --> SignatureState
	Decision -- normal_deep_triage --> Deep
	Decision -- prioritize_deep_triage --> Deep
	Deep --> DeepResult --> Browser
	BrowserQueue --> Browser
	Browser --> Status --> SignatureState
```

Level responsibilities:

- Level 0, signature discovery: `rtc-browser-fuzz-triage-watcher.mjs --gate-only`.
- Level 0, browser repro: `rtc-browser-fuzz-triage-watcher.mjs` without `--gate-only`.
- Level 1: `rtc-browser-fuzz-analysis-tier.mjs`, high-parallel Codex-only analysis.
- Level 2: `rtc-browser-fuzz-deep-analysis-tier.mjs`, slower skeptical Codex-only analysis.

The analysis tiers must not run browsers, Docker, `wp-env`, Playwright, or test
commands. They inspect compact context, bounded logs, source files, and existing
artifacts. Guard wrappers in `bin/rtc-browser-fuzz-analysis-guard-bin` block
broad artifact scans from normal analysis jobs.

## Live Analysis Monitor Loop

The live analysis monitor attaches analysis to whatever generations are active
in `supervisor-state.json`. It is browser-light: it runs the watcher in
`--gate-only` mode, then starts Codex-only tiers.

```mermaid
flowchart TD
	Tick["live-analysis monitor tick"]
	ReadSup["read supervisor-state.json"]
	ActiveDirs["active generation directories"]
	CleanupSessions["cleanup stale analysis tmux sessions"]
	Gate["run triage-watcher --gate-only per active dir"]
	First["ensure analysis-tier tmux session per active dir"]
	Second["ensure deep-analysis-tier tmux session per active dir"]
	Summarize["write live-analysis-monitor-state.json and events"]
	Wait["sleep interval"]

	Tick --> ReadSup --> ActiveDirs --> CleanupSessions
	CleanupSessions --> Gate --> First --> Second --> Summarize --> Wait --> Tick
```

This monitor is the preferred way to add Codex work when the machine has
headroom but Chrome/Playwright pressure is already high.

## Periodic Monitor Decision Loop

The periodic Codex monitor is the human-readable control loop. It checks
resources, queue sizes, stale lanes, cleanup opportunities, and whether to
increase or decrease work. Every decision should be appended to
`monitor-status.md`.

```mermaid
flowchart TD
	Tick["periodic Codex monitor pass"]
	Resources["sample top, memory_pressure, vm_stat, df, docker system df"]
	Processes["count Codex, Playwright, Chrome, Docker, broad searches"]
	Queues["read supervisor, lane, triage, analysis, deep-analysis states"]
	CleanupDry["dry-run stale wp-env cleanup and Codex event pruning"]
	Health{"health issue?"}
	Repair["bounded repair or kill only pathological child process"]
	Backlog{"analysis backlog and headroom?"}
	AddCodex["launch or increase Codex-only analysis"]
	BrowserBacklog{"deep-triage backlog and browser headroom?"}
	AddBrowser["launch limited browser-heavy repro"]
	Hold["hold or reduce parallelism"]
	Write["append monitor-status.md"]

	Tick --> Resources --> Processes --> Queues --> CleanupDry --> Health
	Health -- yes --> Repair --> Write
	Health -- no --> Backlog
	Backlog -- yes --> AddCodex --> BrowserBacklog
	Backlog -- no --> BrowserBacklog
	BrowserBacklog -- yes --> AddBrowser --> Write
	BrowserBacklog -- no --> Hold --> Write
	Write --> Tick
```

Resource policy:

- Prefer Codex-only analysis when CPU and memory have headroom but browser load is high.
- Prefer browser-heavy triage only after analysis marks candidates high value.
- Kill broad `find` or `rg` child processes that scan historical artifacts and
  saturate the machine.
- Do not kill baseline fuzz, supervisor, watchdog, or shared services unless
  their owner process says they are stale or unhealthy.
- Use macOS `memory_pressure` and `vm_stat` trends instead of free memory alone.

## Novelty-Guided Expansion Loop

When fuzzing keeps finding the same buckets, the novelty monitor looks at
behavioral coverage and starts focused groups that cover under-sampled surfaces.

```mermaid
flowchart TB
	Coverage["rtc-behavioral-coverage.ndjson from successful and failed seeds"]
	Ingest["novelty monitor ingests new coverage offsets"]
	Score["update coverage hashes, action profiles, block/action counters"]
	Noise["read triage duplicate/noise dominance"]
	Headroom["sample resource headroom"]
	Policy{"coverage gap or plateau?"}
	Generate["write novelty supervisor-groups.json"]
	Start["start or update novelty supervisor tmux"]
	Pause{"startup failures or no headroom?"}
	Paused["pause noisy group and record cooldown"]
	Status["write novelty-state.json and novelty-status.md"]

	Coverage --> Ingest --> Score --> Noise --> Headroom --> Policy
	Policy -- yes --> Generate --> Pause
	Policy -- no --> Status
	Pause -- yes --> Paused --> Status
	Pause -- no --> Start --> Status
	Status --> Coverage
```

Current expansion targets include:

- `real-user-editing`: keyboard/UI-heavy ordinary editing.
- `persistence-no-title`: save/reload body persistence without title noise.
- `session-lifecycle`: late join, reload, reconnect.
- `three-user-late-join`: three participants with a forced late join.
- `multi-reload-lifecycle`: multiple reload checkpoints in one seed.
- `revision-persistence`: save/reload plus revision restore.
- `same-user-lifecycle`: two tabs under one account.
- `common-blocks`: common block-library surfaces.
- `block-gauntlet`: broader block-library surfaces.
- `parser-transform`: HTML references, deprecated blocks, validation fixes,
  equivalent HTML, and code-editor reparse.
- `http-persistence-probe`: HTTP transport canary.

The novelty loop should not treat every new marker string as novelty. It uses
coverage summaries and bounded hashes so unique fuzz data does not inflate the
coverage signal.

## Artifact And Resume Model

The pipeline is designed so it can be stopped and resumed from files on disk.

```mermaid
flowchart LR
	subgraph RunRoot["RUN_ROOT"]
		SupervisorState["supervisor-state.json"]
		WatchdogState["watchdog-state.json"]
		MonitorStatus["monitor-status.md"]
		NoveltyState["novelty-state.json"]
	end

	subgraph Generation["generation dir, e.g. ws-gen-20"]
		LaneState["state.json"]
		Summary["summary.ndjson"]
		Events["events.ndjson"]
		SeedDirs["seed-<seed>/..."]
	end

	subgraph Seed["seed attempt"]
		Replay["replay.json"]
		CommandLog["command.log"]
		PwArtifacts["Playwright artifacts"]
		BehaviorCoverage["rtc-behavioral-coverage.ndjson"]
	end

	subgraph Triage[".triage-watcher"]
		TriageState["state.json"]
		Failure["signatures/<hash>/failure.json"]
		AnalysisState["analysis-tier/state.json"]
		AnalysisResult["analysis-tier/signatures/<hash>/result.json"]
		DeepState["deep-analysis-tier/state.json"]
		DeepResult["deep-analysis-tier/signatures/<hash>/result.json"]
		StatusMd["signatures/<hash>/STATUS.md"]
	end

	SupervisorState --> Generation
	Generation --> Seed
	Summary --> TriageState
	Replay --> Failure
	TriageState --> AnalysisState
	AnalysisState --> AnalysisResult
	AnalysisResult --> DeepState
	DeepState --> DeepResult
	DeepResult --> StatusMd
	MonitorStatus --> Triage
	NoveltyState --> Generation
```

Resume checklist:

1. Restart supervisor and watchdog with the same `RUN_ROOT` and groups path.
2. Read active/current generation directories from `supervisor-state.json`.
3. Restart live-analysis monitor for the same `RUN_ROOT`.
4. Restart deep-analysis and browser triage for generation dirs with backlog.
5. Restart novelty monitor if novelty-guided expansion was enabled.
6. Append a resume note to `monitor-status.md`.

Do not delete `.triage-watcher`, lane dirs, seed dirs, or replay manifests while
the run may need to be resumed or handed off.

## Known-Fixes Revalidation Loop

The current known-fixes campaign runs a second loop on a clean integration
branch. Its purpose is to avoid filing bugs that are already fixed by the
current fix stack.

```mermaid
flowchart TB
	OldArtifacts["historical mixed-run signatures and handoffs"]
	Manifest["replay queue and issue ledger"]
	KnownBase["clean known-fixes worktree"]
	IsolatedEnv["isolated wp-env-test port with E2E helper plugins"]
	Replay["exact replay of seed/spec/env"]
	Result{"result"}
	Fixed["fixed: exact repro no longer triggers original failure"]
	Live["still live: failing command, seed, logs, evidence"]
	Infra["invalid infra: wrong env, missing plugin, setup failure"]
	Inconclusive["inconclusive: timeout/setup before original assertion or missing seed"]
	Ledger["all-issues-reclassification JSONL/TSV"]
	Handoff["likely-real bug handoff report"]

	OldArtifacts --> Manifest --> KnownBase --> IsolatedEnv --> Replay --> Result
	Result -- pass against original invariant --> Fixed --> Ledger
	Result -- same or equivalent user-visible failure --> Live --> Ledger
	Result -- setup failure --> Infra --> Ledger
	Result -- not enough evidence --> Inconclusive --> Ledger
	Ledger --> Handoff
```

Rules:

- Do not count plugin-missing, wrong-port, or wrong-`wp-env` runs as live bugs.
- Mark fixed only when the exact repro no longer triggers the original failure.
- Mark live only with command, seed/spec, artifact path, logs/screenshots/traces,
  and a short explanation of real-user reachability.
- Deduplicate by canonical family/signature so old duplicates do not inflate the
  live count.

## What Another Team Should Monitor

For a running campaign, the minimum useful dashboard is:

| Area | Primary files or commands | Healthy signal |
| --- | --- | --- |
| Supervisor | `supervisor-state.json`, `events.ndjson`, tmux session | state updates within stale threshold; groups have active generation dirs |
| Watchdog | `watchdog-state.json`, `watchdog-events.ndjson` | supervisor not stale; cleanup removes only inactive wp-env resources |
| Lanes | `lane/state.json`, `summary.ndjson`, `events.ndjson` | current seed advances; failures are classified into useful buckets |
| Triage queue | `.triage-watcher/state.json` | duplicate/noise signatures become `analysis-gated`; high-value ones stay queued |
| First-level analysis | `.triage-watcher/analysis-tier/state.json` | completed count grows; failures are not dominated by schema/startup errors |
| Deep analysis | `.triage-watcher/deep-analysis-tier/state.json` | likely-real candidates get confirmed, deduped, or marked needing repro |
| Browser triage | `.triage-watcher/signatures/*/STATUS.md` | only high-value candidates spend Chrome time |
| Novelty | `novelty-state.json`, `novelty-status.md` | coverage gaps produce focused groups; noisy startup profiles get paused |
| Resources | `top`, `memory_pressure`, `vm_stat`, `df`, `docker system df` | enough memory headroom, no runaway broad artifact scans, disk not filling |
| Handoff | Markdown/TSV/JSONL reports under `docs/explanations/architecture` or run artifacts | live likely-real rows include evidence paths and grouping hints |

## Common Failure Modes

```mermaid
flowchart TD
	Schema["Codex output schema rejected"]
	SchemaFix["patch schema or disable unsupported combinators, move invalid attempts aside"]
	Find["Codex worker runs broad find/rg over artifacts"]
	FindFix["kill only broad search child process; rely on guard-bin; keep worker if possible"]
	Port["wp-env port or plugin mapping wrong"]
	PortFix["create isolated test config on free port; mount e2e helper plugins"]
	Disk["disk or Docker network pressure"]
	DiskFix["run dry-run cleanup, then bounded stale wp-env cleanup or Codex event pruning"]
	Noise["one signature dominates"]
	NoiseFix["analysis-gate duplicates, add temporary suppressor or novelty profile, avoid more same lanes"]
	Stale["supervisor state stale"]
	StaleFix["watchdog restarts supervisor tmux loop with same RUN_ROOT"]

	Schema --> SchemaFix
	Find --> FindFix
	Port --> PortFix
	Disk --> DiskFix
	Noise --> NoiseFix
	Stale --> StaleFix
```

The important operational rule is to preserve durable artifacts before changing
the amount of work. If a process dies, restart from the same run root. If a
failure is invalid infrastructure, mark it that way and keep it out of live bug
counts.
