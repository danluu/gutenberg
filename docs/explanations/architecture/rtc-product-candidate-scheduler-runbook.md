# RTC Product Candidate Scheduler Runbook

This runbook replaces JS2 readiness-by-activity with an exact-SHA product-candidate merge train.

The goal is not to delete the existing Playwright, fuzz, replay, exact-stack, or deploy executors immediately. The goal is to remove their authority. They become leased workers that write evidence into one scheduler ledger. Only the scheduler can decide whether a branch is human-testable.

## Maintainer Contract

There is one human-testable ref:

```bash
refs/heads/rtc-product-candidate
```

That ref means:

- The exact candidate SHA passed product acceptance.
- The exact candidate SHA passed required RTC conformance gates.
- Required evidence is fresh for the trunk SHA, manifest hash, profiles, fixture set, build/lock hashes, gate-policy version, and oracle version.
- No active P0/P1 blocker remains attached to the candidate.

Anything else is not human-testable by default.

In particular:

- `all-merge` is a diagnostic stress artifact with a TTL.
- `fuzz-green` is not human-testable.
- `P0_smoke` is admission only.
- `exact-stack pending` is not a readiness state.

## First-Time Setup On JS2

From the Gutenberg checkout that contains these scripts:

```bash
export RTC_REPO=/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo
export RTC_SCHEDULER_BASE=/media/volume/danluu-fuzz-data/rtc-product-candidate-scheduler-20260702
export RTC_SCHEDULER_DB=$RTC_SCHEDULER_BASE/ledger.sqlite

bin/rtc-product-candidate-controller-remote.sh init
bin/rtc-product-candidate-controller-remote.sh legacy-tag
```

The init command creates:

- `$RTC_SCHEDULER_BASE/ledger.sqlite`
- `$RTC_SCHEDULER_BASE/env`
- `$RTC_SCHEDULER_BASE/runs/`
- `$RTC_SCHEDULER_BASE/artifacts/`

## Admit A Candidate

Use this for the current checkout head:

```bash
candidate_id="$(
	bin/rtc-product-candidate-controller-remote.sh admit-current \
		plain-wp-fast,rtc-local \
		rtc,editor-save-reload,product-acceptance
)"
printf '%s\n' "$candidate_id"
```

For an explicit SHA, call the scheduler directly:

```bash
node bin/rtc-product-candidate-scheduler.mjs \
	--db "$RTC_SCHEDULER_DB" \
	admit-candidate \
	--sha "$candidate_sha" \
	--trunk-sha "$trunk_sha" \
	--manifest "$manifest" \
	--branch "$branch" \
	--profiles plain-wp-fast,rtc-local \
	--risk-tags rtc,editor-save-reload \
	--fixture-set rtc-product-acceptance-20260702 \
	--oracle-version rtc-product-state-oracle-20260702.1 \
	--gate-policy-version 2026-07-02.1
```

## Import Known Blockers

Until each historical product/RTC failure has a narrower replay, import it as a named blocker:

```bash
bin/rtc-product-candidate-controller-remote.sh open-known-blockers "$candidate_id"
```

The imported blockers include:

- parser serialization exact canary
- RTC reference oracle exact canary
- stale draft/title dirty state after Save Draft
- title reload convergence
- existing-post CRDT metadata init/preservation
- table stale snapshot
- large-post lifecycle
- `SANDBOXED [READ-ONLY]` editor lockout
- Jetpack/WP.com post-new failure
- multi-tab propagation failure
- takeover-modal/video reproduction gap

These blockers intentionally prevent a candidate from being called human-testable until the failures are fixed or explicitly classified out of scope.

## Record Gate Evidence

Every trusted gate result must include a candidate, gate, profile, result, command, and artifacts.

Example:

```bash
node bin/rtc-product-candidate-scheduler.mjs \
	--db "$RTC_SCHEDULER_DB" \
	record-gate \
	--candidate "$candidate_id" \
	--gate P0_smoke \
	--profile plain-wp-fast \
	--baseline-result pass \
	--result pass \
	--command "npm run test:e2e -- test/e2e/specs/editor/collaboration/collaboration-human-smoke.spec.ts" \
	--artifacts "$RTC_SCHEDULER_BASE/artifacts/$candidate_id/p0-smoke" \
	--fingerprint "$candidate_id-p0-smoke-plain-wp-fast"
```

Required product gates:

- `preflight`
- `P0_smoke`
- `product_acceptance`
- `rtc_conformance`

Gate meanings:

- `preflight`: the result can be trusted.
- `P0_smoke`: the candidate may enter deeper testing.
- `product_acceptance`: the candidate is human-testable.
- `rtc_conformance`: the candidate is RTC-safe for train movement.
- `publication_validation`: the candidate is externally publishable for a scoped target.

## Product Acceptance Requirements

Product acceptance must include deterministic fixtures for the failures humans found:

- post-new loads
- existing-post editor loads
- writable canvas
- no white screen
- no fatal JavaScript/PHP/REST/bootstrap/websocket error
- no unexpected `SANDBOXED [READ-ONLY]`
- basic title/body edit
- Save Draft completes
- Save Draft reload, persistence, and dirty-state clear
- publish/update lifecycle
- existing-post edit/update/reload
- title reload convergence
- parser `serialize -> parse -> serialize`
- existing-post CRDT metadata init/preservation
- table edit/save/reload stale snapshot fixture
- large-post load/edit/save/reload
- fixture for every severe human-found regression

## RTC Conformance Requirements

RTC conformance uses real browser contexts and canonical product-state snapshots:

- RTC-off reference flow
- RTC-on single-user equivalence
- same-user two-tab convergence
- multi-user/multi-context websocket convergence
- cross-window propagation
- ordered concurrent title/body/table schedules
- disconnect/reconnect convergence
- collaborative save/reload
- takeover modal with retained trace/video

The oracle must snapshot:

- editor store
- block-editor store
- REST/DB post state
- serialized blocks
- title/body/status
- dirty/autosave/save state
- lock/read-only state
- CRDT metadata
- websocket schedule/order
- client convergence
- quiescence

Oracle/comparator changes stale prior evidence.

## Worker Lease Pattern

Before a legacy executor starts:

```bash
lease_id="$(
	node bin/rtc-product-candidate-scheduler.mjs \
		--db "$RTC_SCHEDULER_DB" \
		lease-start \
		--worker "coverage-controller" \
		--kind "product_acceptance" \
		--candidate "$candidate_id" \
		--ttl-seconds 7200 \
		--worktree "$worktree" \
		--namespace "$docker_namespace" \
		--artifact-dir "$artifact_dir" \
		--pid "$$" \
		--process-group "$$"
)"
```

During long work:

```bash
node bin/rtc-product-candidate-scheduler.mjs --db "$RTC_SCHEDULER_DB" lease-heartbeat --lease "$lease_id"
```

At completion:

```bash
node bin/rtc-product-candidate-scheduler.mjs --db "$RTC_SCHEDULER_DB" lease-finish --lease "$lease_id" --result pass
```

Periodically:

```bash
bin/rtc-product-candidate-controller-remote.sh expire-leases
```

Use `expire-leases --kill` only after verifying the lease owns the process group and namespace.

## Readiness And Promotion

Check readiness:

```bash
bin/rtc-product-candidate-controller-remote.sh ready "$candidate_id"
```

Promote only through the scheduler:

```bash
bin/rtc-product-candidate-controller-remote.sh promote "$candidate_id"
```

The promote command refuses to move `refs/heads/rtc-product-candidate` unless all required product/RTC gates pass and no active P0/P1 blocker remains.

Push the promoted ref only after local promotion succeeds:

```bash
git push danluu refs/heads/rtc-product-candidate:refs/heads/rtc-product-candidate
```

## Status

Use:

```bash
bin/rtc-product-candidate-controller-remote.sh status
```

The top line should answer:

```text
rtc-product-candidate <sha>: human-testable yes/no; publication-ready yes/no; first blocker/gate; repro command; next action
```

Bad status:

```text
23 fuzz lanes running; exact-stack pending.
```

Good status:

```text
rtc-product-candidate abc123 human-testable yes, publication-ready no.
B-142 Jetpack post-new read-only blocks WP.com publication only.
Repro ./js2 replay B-142. fix/B-142 passes narrow and accumulated gates.
wpcom-deploy-smoke running 38m.
```

## Migration Order

1. Initialize the scheduler ledger.
2. Create/push the legacy tag.
3. Admit the current candidate.
4. Import known blockers.
5. Put current workers behind leases.
6. Record preflight and P0 smoke before any fuzz/discovery work.
7. Stop broad fuzz on product-red SHAs.
8. Redirect capacity to replay, minimization, first-bad isolation, prevalence, and fix validation.
9. Add deterministic fixtures for every severe human-found failure.
10. Retire old controllers transition by transition after equivalent scheduler transitions exist.

## Non-Negotiable Invariants

- Only the scheduler CAS ref mover updates maintainer refs.
- Evidence is valid only for exact SHA, trunk SHA, manifest hash, profile, fixture set, lock/build hashes, env/tool versions, gate-policy version, and oracle version.
- Product-green means accumulated train head green.
- Same-profile trunk red is `BASELINE_INVALID`.
- Product-red SHAs get replay/minimization/isolation/fix validation, not broad fuzz.
- Exact-stack/WP.com blocks only named blockers, fixes, promotions, or publication decisions.
- Superseded jobs are killed and cleaned by owned process group/namespace.
- All-merge red becomes named blockers, bounded interaction isolation, or expires.
