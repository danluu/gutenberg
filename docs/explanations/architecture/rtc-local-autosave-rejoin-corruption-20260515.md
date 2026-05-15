# RTC local autosave rejoin corruption

## Summary

`1a34d7bcf4d5` is a high-confidence real RTC/editor correctness bug. It is not just a stale warning notice and it does not require clicking "Restore the backup". A normal collaboration flow can leave the editor and persisted REST content inconsistent, or collapse content to a prefix, after one user has a browser local autosave, reloads/rejoins, and edits again.

The natural action sequence is:

1. Two users edit the same draft through the WebSocket RTC provider.
2. One user edits content.
3. The collaborator's browser writes the normal `sessionStorage` local autosave for that post.
4. The collaborator reloads the editor page and rejoins RTC.
5. The collaborator edits the same paragraph again.
6. A save/autosave or internal CRDT persistence path persists a stale or prefix-only version of the post.

The timing is nondeterministic. The targeted repro makes it easier by waiting until the browser local autosave key exists before reload, but it does not inject browser, network, server, or clock faults. A user can hit the same condition naturally by leaving the editor open long enough for browser local autosave, refreshing, and continuing to edit while RTC hydration/save reconciliation is still in a bad ordering.

`46f8a1924911` is related or adjacent, but not a confirmed duplicate. Its artifact includes injected `delay` and `429` faults and nested block/type smearing. Treat it as part of the broader reload/stale-state family unless a shared failing transition is proven.

## Primary Evidence

The cleanest evidence is the local no-fault WebSocket repro output:

```text
artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-17-20260504T165737Z/.triage-watcher/signatures/1a34d7bcf4d5/repro-output/triage-1a34d7-ws-v2/
```

The repro spec is:

```text
test/e2e/specs/editor/collaboration/websocket/collaboration-triage-1a34d7bcf4d5-realistic.spec.ts
```

It creates a draft, opens two RTC users, performs normal edits, waits until the collaborator has a browser local autosave, reloads the collaborator, edits again, and snapshots editor state plus REST `content.raw`. It currently records the failure internally but only asserts `postId`, so it is diagnostic evidence, not yet a regression test.

Observed attempts:

| Attempt | Local autosave before reload | Editor state after step 5 | Persisted REST content |
| --- | --- | --- | --- |
| 1 | yes | both editors show the step-5 paragraph; surrounding blocks are gone | `<p>See</p>` |
| 2 | yes | both editors show the four-block document with the step-5 paragraph | first paragraph persisted as `<p>Seed</p>` |
| 3 | yes | both editors show the four-block document with the step-5 paragraph | first paragraph persisted as `<p>Seed 9566</p>` |
| 4 | yes | after-reload divergence, then both editors collapse to `See` | `<p>See</p>` |
| 5 | yes | both editors show the step-5 paragraph; surrounding blocks are gone | `<p>See</p>` |

The original fuzz artifact for `1a34d7bcf4d5` is supporting evidence, not primary proof, because it included a `delay:delay` fault. It did show visible invalid block corruption, a browser backup notice, and non-convergence after a reload.

## What Is Proven

- Normal user actions can trigger the bug: type, wait long enough for browser local autosave, reload, type again.
- Artificial fault injection is not required for the clean `1a34d7bcf4d5` reproduction.
- Browser local autosave existed before reload in the no-fault attempts.
- After the reload/edit sequence, editor block trees and REST `content.raw` can diverge.
- REST can persist a prefix or collapsed paragraph even when editor state shows newer text.
- The current repro is nondeterministic and needs repeated attempts or a timing gate such as "wait until local autosave exists".

## What Is Not Proven

- It is not proven that clicking "Restore the backup" causes this corruption. The no-fault repro does not click Restore.
- It is not proven that local autosave alone is sufficient. The stronger statement is that browser local autosave state interacts with RTC hydration/save reconciliation.
- It is not proven that `46f8a1924911` has the same root cause.
- It is not proven that current trunk is still unfixed without rerunning the repro against current trunk and relevant fix branches.

## Relevant Code

Browser local autosave stores only the post fields, not RTC causality:

```text
packages/editor/src/store/local-autosave.js
```

`autosave( { local: true } )` writes current edited `title`, `content`, and `excerpt` to browser storage:

```text
packages/editor/src/store/actions.js
```

The monitor compares stored values against current edited post fields and creates a backup notice. The destructive block replacement only happens inside the Restore button handler:

```text
packages/editor/src/components/local-autosave-monitor/index.js
```

RTC entity loading is started from the core-data resolver but is not awaited as a complete readiness barrier:

```text
packages/core-data/src/resolvers.js
```

The internal CRDT persistence path resolves the current edited record and calls `saveEntityRecord` on the full record:

```text
packages/core-data/src/resolvers.js
```

The sync manager can call that persistence path while applying or invalidating persisted CRDT docs:

```text
packages/sync/src/manager.ts
```

The RTC autosaves controller has a related invariant comment from #75105: saved post content getting ahead of persisted CRDT state can cause reload diffs to damage the document. That fix targeted server autosave revision behavior, not browser `sessionStorage` local autosaves:

```text
lib/compat/wordpress-7.0/class-gutenberg-rest-autosaves-controller.php
```

## How The Bug Was Introduced

This is the best current causality chain. A direct historical Playwright bisect is
not a reliable proof vehicle for this bug because the current repro spec is a
diagnostic artifact, not a hard-failing test; the local WebSocket harness was
added after parts of the relevant history; the repro is timing-sensitive; and the
untracked repro depends on current fixture APIs. The stronger proof is the code
transition below: #75841 changes the RTC persistence callback from "save current
unsaved edits" to "save the whole current edited entity record", while the sync
manager already calls that callback from reload/rejoin CRDT persistence paths.

| Change | Link | Role |
| --- | --- | --- |
| Browser local autosave | [#16490](https://github.com/WordPress/gutenberg/pull/16490), [e99c21244741cba21b9dfab1cc90951b7ed2524f](https://github.com/WordPress/gutenberg/commit/e99c21244741cba21b9dfab1cc90951b7ed2524f) | Introduced the `sessionStorage` backup mechanism. This predates RTC and is not itself the bug. |
| Remote/local autosave conflict fix | [#17501](https://github.com/WordPress/gutenberg/pull/17501), [3e43bccd1b51f11f6acf7f8eea5f70e3753444d5](https://github.com/WordPress/gutenberg/commit/3e43bccd1b51f11f6acf7f8eea5f70e3753444d5) | Established non-RTC local-vs-remote autosave behavior. Still has no RTC causal metadata. |
| Auto-draft local autosave protection | [#23928](https://github.com/WordPress/gutenberg/pull/23928), [95e4f3f06a449b9f8dd44654b5f9443c465ba354](https://github.com/WordPress/gutenberg/commit/95e4f3f06a449b9f8dd44654b5f9443c465ba354) | Another pre-RTC browser backup protection. Helpful for single-user recovery, but not safe as RTC authority. |
| CRDT persistence | [#72373](https://github.com/WordPress/gutenberg/pull/72373), [2d8b22633dd3889e1a4405dcc7ebfd4bb8dbf71c](https://github.com/WordPress/gutenberg/commit/2d8b22633dd3889e1a4405dcc7ebfd4bb8dbf71c) | Made the class possible by adding persisted `_crdt_document` and reload reconciliation. |
| RTC enabled by default | [#74562](https://github.com/WordPress/gutenberg/pull/74562), [8a511c5cced55e1cbbf3cda39340f03f6d356950](https://github.com/WordPress/gutenberg/commit/8a511c5cced55e1cbbf3cda39340f03f6d356950) | Increased exposure of the RTC path. |
| Default HTTP polling provider | [#74564](https://github.com/WordPress/gutenberg/pull/74564), [48ce44dac7981eb730079563a3a2975b89840fac](https://github.com/WordPress/gutenberg/commit/48ce44dac7981eb730079563a3a2975b89840fac) | Related RTC rollout context. |
| Refetch entity when saved by peer | [#74637](https://github.com/WordPress/gutenberg/pull/74637), [be1c20e213e7d2a2858d6ec92da23268ea0a8127](https://github.com/WordPress/gutenberg/commit/be1c20e213e7d2a2858d6ec92da23268ea0a8127) | Related reload/save reconciliation context. |
| Initial CRDT persistence save changed to full entity save | [#75841](https://github.com/WordPress/gutenberg/pull/75841), [ea2cfb87be4a91c9de5ce6430d1cda9ff9d0553c](https://github.com/WordPress/gutenberg/commit/ea2cfb87be4a91c9de5ce6430d1cda9ff9d0553c) | Closest identified root-cause change. It changed the path toward saving the full edited entity record during CRDT persistence instead of only edited fields. On reload/rejoin, that can persist a transient or stale editor snapshot. |
| Renamed/preserved `persistCRDTDoc` behavior | [#76311](https://github.com/WordPress/gutenberg/pull/76311), [22e3d7f93663d1eab574e49f5840f7d8d7384ed1](https://github.com/WordPress/gutenberg/commit/22e3d7f93663d1eab574e49f5840f7d8d7384ed1) | Kept the full-record persistence behavior under clearer naming and guard rails. |
| Always target autosave revision | [#75105](https://github.com/WordPress/gutenberg/pull/75105), [9df142b839320316b406ee1a02e23704d42f8719](https://github.com/WordPress/gutenberg/commit/9df142b839320316b406ee1a02e23704d42f8719) | Important partial fix for server autosaves. It documents the saved-post-vs-persisted-CRDT invariant, but does not cover browser local autosave. |
| Flush deferred Y.Doc updates before CRDT serialization | [#75975](https://github.com/WordPress/gutenberg/pull/75975), [8051e14451cf85c5e6713bf2098149f30229e47b](https://github.com/WordPress/gutenberg/commit/8051e14451cf85c5e6713bf2098149f30229e47b) | Related RTC persistence fix, but not sufficient for this local-autosave/rejoin case. |
| Refresh sync issue on reload | [#76017](https://github.com/WordPress/gutenberg/pull/76017), [9375c0e0148517257ee4178ea7f709aad7deb7c8](https://github.com/WordPress/gutenberg/commit/9375c0e0148517257ee4178ea7f709aad7deb7c8) | Related reload fix. |
| Attach observers after persisted CRDT hydration | [#77966](https://github.com/WordPress/gutenberg/pull/77966), [61c1dded0c8f69f1d7c5dd1bdcdaab4b1e6fcbf3](https://github.com/WordPress/gutenberg/commit/61c1dded0c8f69f1d7c5dd1bdcdaab4b1e6fcbf3) | Related hydration-order fix. |

The likely introduction is not "local autosave was added". The older local autosave system became dangerous when RTC added persisted CRDT state and later full-record CRDT persistence saves. The most suspicious transition is #75841: reload/rejoin can ask core-data to persist a CRDT document by saving the current edited record, while the current edited record may still reflect a pre-hydration or stale browser-local snapshot.

## Introduction Proof

`ea2cfb87be4a91c9de5ce6430d1cda9ff9d0553c` / [#75841](https://github.com/WordPress/gutenberg/pull/75841) is the sharp introduction point for this specific persisted stale/prefix-content failure mode.

Immediately before #75841, the core-data handler used by the sync manager saved only the entity's unsaved edits:

```js
// ea2cfb87be4^:packages/core-data/src/resolvers.js
saveRecord: () => {
	dispatch.saveEditedEntityRecord( kind, name, key );
},
```

In #75841, the same handler changed to resolve the current edited entity record and save it as a full entity:

```js
// ea2cfb87be4:packages/core-data/src/resolvers.js
saveRecord: () => {
	resolveSelect
		.getEditedEntityRecord( kind, name, key )
		.then( ( editedRecord ) => {
			dispatch.saveEntityRecord( kind, name, editedRecord );
		} );
},
```

That is not a naming-only change. In core-data, `getEditedEntityRecord` returns the raw record merged with current edits, and `saveEntityRecord` sends that record as the save request body. By contrast, `saveEditedEntityRecord` computes non-transient edits and saves only `{ id, ...edits }`.

The sync manager already calls this callback from the persisted CRDT load path. If no persisted CRDT doc exists, or if the persisted doc is invalidated against the current record, it applies record changes to the Y.Doc and invokes `handlers.saveRecord()`. That path is reached by a newly joining or refreshing editor. Therefore:

1. #72373 introduced the persisted CRDT reload/rejoin path and made the class of bug possible.
2. Before #75841, that path could only ask core-data to save current unsaved edits.
3. #75841 changed the callback to save the whole current edited entity record, whether or not there were unsaved edits.
4. #76311 later renamed the callback to `persistCRDTDoc` and retained the same full-record `saveEntityRecord( ..., editedRecord )` behavior.
5. The no-fault repro shows exactly the resulting failure: after local autosave, reload/rejoin, and another normal edit, both editors can show the step-5 paragraph while REST persists older full-record content that does not include step 5.

Commands that prove the relevant transition:

```sh
git show ea2cfb87be4^:packages/core-data/src/resolvers.js | nl -ba | sed -n '232,235p'
git show ea2cfb87be4:packages/core-data/src/resolvers.js | nl -ba | sed -n '232,244p'
git show 22e3d7f93663:packages/core-data/src/resolvers.js | nl -ba | sed -n '239,258p'
git show ea2cfb87be4^:packages/sync/src/manager.ts | nl -ba | sed -n '479,485p'
```

The old local autosave commits are not the introduction point:

- [#16490](https://github.com/WordPress/gutenberg/pull/16490) / `e99c21244741cba21b9dfab1cc90951b7ed2524f` added browser `sessionStorage` local autosave.
- [#17501](https://github.com/WordPress/gutenberg/pull/17501) / `3e43bccd1b51f11f6acf7f8eea5f70e3753444d5` separated local autosave helpers and remote/local autosave behavior.
- [#23928](https://github.com/WordPress/gutenberg/pull/23928) / `95e4f3f06a449b9f8dd44654b5f9443c465ba354` added auto-draft key behavior.

Those commits added a single-user recovery mechanism. They did not have RTC persisted CRDT state, reload/rejoin CRDT reconciliation, or the full edited-record persistence callback. They are trigger/enabler context for this repro, not the introduction of the RTC corruption bug.

## Initial Fix Plan

1. Add a per-entity RTC readiness barrier.
   - REST record resolved.
   - Persisted CRDT doc applied, or explicitly absent for a first document.
   - Provider initial state reconciled, or provider unavailable/offline state explicitly selected.
   - Pending Y.Doc and store updates flushed.
   - Browser local autosave reconciled.

2. Before that barrier completes, no browser backup or pre-hydration edited record may become authoritative for synced `title`, `content`, or `excerpt`.
   - Do not show the backup notice from a pre-ready comparison.
   - Do not restore pre-ready browser content into blocks.
   - Do not let normal save, server autosave, or `persistCRDTDoc` persist pre-ready `title/content/excerpt`.

3. After readiness, reconcile browser local autosave.
   - Clear it if normalized parsed content is equal to current hydrated state.
   - Clear or suppress it if real RTC causal metadata proves it is included.
   - Keep legacy or incomparable backups non-authoritative.
   - If recovery is offered, make it an explicit post-readiness operation that becomes a normal CRDT edit or a merge/rebase flow.

4. Fix notice lifecycle.
   - If storage is purged because the post becomes clean, remove the `wpEditorAutosaveRestore` notice too.
   - Do not leave a stale notice after the backing storage key is gone.

5. Preserve #75105.
   - RTC server autosaves for existing drafts must continue targeting autosave revisions rather than overwriting the post content ahead of persisted CRDT state.

6. Turn the repro into assertions.
   - Fail if REST content lacks the full step-5 paragraph.
   - Fail if a browser backup notice is visible after reconciliation.
   - Fail if invalid/unsupported block UI appears.
   - Fail if editor states diverge.
   - Fail if stale/prefix `PUT /wp/v2/posts/:id` or autosave payloads are sent during reload/rejoin.

## Audit Method

I launched independent `codex exec` jobs in `tmux`, with `model_reasoning_effort=xhigh`, and did not use subagents. The raw local outputs are under:

```text
/tmp/rtc1a34-agent-audits-20260515/
```

Runs:

- Initial fix-plan review: Linus Torvalds, Kyle Kingsbury, Marc Brooker, Dan Luu, tptacek.
- Initial real-bug/false-positive review: Linus Torvalds, Kyle Kingsbury, Marc Brooker, Dan Luu, tptacek.
- Cross-analysis round 1 for each set: Linus Torvalds, Kyle Kingsbury, Marc Brooker, Dan Luu, tptacek, Contrarian.
- Cross-analysis round 2 for each set: Linus Torvalds, Kyle Kingsbury, Marc Brooker, Dan Luu, tptacek, Contrarian.

## Fix Plan Audit

### Initial review

**Linus Torvalds**

- Keep the authority invariant: a browser backup must not become CRDT or REST authority.
- Do not pretend the bug is only a stale notice.
- Define readiness concretely; "connected" is not enough.
- Avoid a fix that blocks all saves forever in offline/provider-error cases.

**Kyle Kingsbury**

- Do not use `post.modified`, revision ids, or autosave ids as RTC causal clocks.
- If causal metadata is added, capture it atomically with the serialized backup after pending Yjs updates flush.
- Prove the fix through request payload assertions, not just final editor equality.

**Marc Brooker**

- No-click persistence is the core risk. The fix must cover normal save/autosave and `persistCRDTDoc`, not only the Restore button.
- Pagehide/unload flushing is not a fix. It can make stale snapshots more reliable if authority is still wrong.
- Keep #75105 behavior intact.

**Dan Luu**

- The missing invariant is broader than local autosave: no backup comparison, notice, restore, save, or CRDT persistence should use pre-barrier `content/title/excerpt`.
- Raw field comparison is brittle; use parsed/normalized content where possible.
- Add an A/B test that clears `wp-autosave-block-editor-post-${postId}` before reload.

**tptacek**

- The restore path is destructive full-state replacement, but the repro does not click it.
- The internal full-record save path is a high-priority risk.
- A good fix must include notice lifecycle and degraded/offline semantics.

### Cross-analysis rounds

**Linus Torvalds**

- The final fix must say "no browser backup or pre-hydration edited record may become CRDT/REST authority before readiness".
- Metadata is required to prove causality, but normalized equality can clear equal backups without metadata.
- `46f8a1924911` needs separate nested block coverage.

**Kyle Kingsbury**

- All responses converged on the same invariant.
- The current repro must fail on behavior, not just `postId`.
- Restore can be allowed only as an explicit post-readiness edit/merge path.

**Marc Brooker**

- Keep request-level assertions for stale/prefix `PUT` and autosave payloads.
- Qualify provider sync with offline/unavailable states.
- Preserve server autosave revision behavior from #75105.

**Dan Luu**

- The plan should be framed as RTC readiness/authority, not notice cleanup.
- Raw serialized HTML equality is too weak for reconciliation.
- Unload flushing should not be in the causal fix.

**tptacek**

- The final plan must include normal save, server autosave, and `persistCRDTDoc`.
- Notice purging and storage clearing must be linked.
- Backups that cannot be proven safe should remain recoverable but non-authoritative.

**Contrarian**

- Do not overstate mandatory metadata: equality is sufficient for equal-state clearing.
- Do not deadlock legitimate local-only recovery.
- Keep `46f8a1924911` out of the fix claim unless nested block identity is tested.

## Revised Fix Plan

1. Introduce a per-entity RTC readiness/reconciliation state.
   - Track it in the RTC/core-data integration, not only in UI components.
   - Required states: REST entity loaded, persisted CRDT document applied or known absent, provider initial state reconciled or explicitly unavailable, pending Y.Doc/store updates flushed, local backup reconciliation complete.
   - Expose an explicit degraded mode for offline/provider-unavailable cases so saves do not deadlock silently.

2. Gate authority for synced fields.
   - For RTC-enabled entities, pre-ready `content`, `title`, and `excerpt` are not safe save payload sources.
   - Gate normal `savePost`, server autosave payload construction, and `persistCRDTDoc`.
   - If a save is requested before readiness, either delay it until readiness or persist only fields known to be safe. Do not persist stale `content/title/excerpt`.

3. Reconcile browser local autosave only after readiness.
   - Read the `sessionStorage` backup after the hydrated editor/CRDT state is stable.
   - If parsed/normalized content and scalar fields equal the hydrated state, clear storage and remove any stale notice.
   - If causal metadata is available and proves the backup is included or older, clear/suppress it.
   - If the backup is legacy or incomparable, keep it non-authoritative and offer recovery only after readiness.

4. Restore semantics.
   - Restore must never run automatically.
   - Restore before readiness should be disabled or deferred.
   - Restore after readiness should be an explicit user operation that becomes a normal CRDT edit or a merge/rebase flow.
   - A deliberate overwrite may be acceptable UX if clear, but it must not be a silent save payload.

5. Local autosave write policy.
   - Do not overwrite a useful old local backup with a pre-ready transient snapshot.
   - Once readiness completes, write local autosaves with enough metadata to make future reconciliation safer.
   - Metadata is useful for causality, but the code should still handle older metadata-less backups conservatively.

6. Notice lifecycle.
   - Clearing the browser storage key must also dismiss `wpEditorAutosaveRestore`.
   - A visible notice must be tied to a current, unreconciled backup.

7. Tests.
   - Convert `collaboration-triage-1a34d7bcf4d5-realistic.spec.ts` into a regression test with hard assertions.
   - Add an A/B test clearing `wp-autosave-block-editor-post-${postId}` before reload.
   - Record actual sessionStorage payloads, not only boolean presence.
   - Record REST save/autosave payloads, responses, and save wait results.
   - Verify a fresh REST fetch and fresh editor reload after quiescence.
   - Add unit/integration tests for normalized-equal backup clearing, legacy backup quarantine, local-only/offline recovery, notice removal after purge, normal save, server autosave, `persistCRDTDoc`, and #75105.
   - Add separate coverage for `46f8a1924911` nested move/block identity before claiming that case is fixed.

## Real Bug / False Positive Analysis

### Initial review

**Linus Torvalds**

- Real bug, high confidence for `1a34d7bcf4d5`.
- Strongest proof is the no-fault v2 output, not the original faulted seed.
- Root cause is not fully proven; do not claim restore caused corruption.

**Kyle Kingsbury**

- Real bug. The user workflow is normal but timing-sensitive.
- Attempts 1, 2, 3, and 5 show persisted content that does not include the visible step-5 edit.
- `46f8a1924911` should not be collapsed into the same bug without a shared invariant.

**Marc Brooker**

- Real bug for `1a34d7bcf4d5`; current-head status unknown.
- The spec uses `Promise.allSettled`, so durability language should be careful until save-settle results and fresh reloads are captured.
- Original seed is supporting evidence only because it had a delay fault.

**Dan Luu**

- Real bug. The best causal discriminator is clearing the local autosave key before reload and comparing outcome.
- Need actual sessionStorage content, REST payloads, `_crdt_document`, and block trees at each checkpoint.
- Overclaiming `46f8a1924911` as the same family is risky.

**tptacek**

- Real bug, but root cause remains an inference.
- The repro artifact is more important than the spec assertion because the spec only asserts `postId`.
- Distinguish backup notice visibility from live storage and from Restore being clicked.

### Cross-analysis rounds

**Linus Torvalds**

- Final classification should be "real bug, high confidence".
- Do not claim current trunk unfixed without a rerun.
- Include attempts 1/5 deleting surrounding blocks, attempts 2/3 prefix persistence, and attempt 4 collapse.

**Kyle Kingsbury**

- Proven: normal reload/edit sequence can produce editor/REST inconsistency or collapse.
- Proven: browser local autosave existed before reload.
- Not proven: Restore button path executed or local autosave alone caused corruption.

**Marc Brooker**

- Keep evidence order: no-fault v2 attempts first, original faulted seed second.
- Use "REST snapshot after attempted save-settle" until explicit save fulfillment and fresh DB/reload evidence is added.
- `46f8a1924911` is related/possible sibling, not a duplicate.

**Dan Luu**

- The verdict should be stronger than "candidate": `1a34d7bcf4d5` is real.
- The mechanism wording should remain cautious: reload/rejoin with browser local-autosave state interacting with RTC hydration/save reconciliation.
- Add a local-autosave-clear A/B test.

**tptacek**

- The natural sequence is enough: type, local autosave, reload, type.
- Do not say "all five attempts fail the same way"; they show several failure modes.
- Require current trunk reruns before fixed/unfixed claims.

**Contrarian**

- Primary evidence: attempts 1/2/3/5 for persisted-content failure, attempt 4 for collapse/divergence.
- The code boundary matters: the monitor only mutates blocks in the Restore click handler.
- Local autosave is correlated and probably relevant, but causality must be proven with the A/B.

## Final Verdict

This is a real bug, not a false positive, for `1a34d7bcf4d5`.

The bug can happen through natural user actions and natural timing. It is nondeterministic because it depends on the reload/rejoin, browser local autosave, RTC hydration, and save/persistence ordering. A deterministic test may wait for the local autosave key before reload, but that wait only selects a state real users can reach without fault injection.

The safest mechanism statement is:

> During RTC reload/rejoin, browser local-autosave state and pre-hydration edited records can interact with RTC hydration/save reconciliation so that stale or prefix-only `content/title/excerpt` becomes a CRDT update or REST save payload.

The fix should enforce the authority invariant:

> For RTC entities, no browser backup or pre-hydration edited record may become a CRDT update or persisted REST payload until RTC readiness and local-backup reconciliation are complete or an explicit degraded mode has been chosen.

## Follow-Up Work

- Rerun the no-fault repro on current trunk and relevant fix branches.
- Add the local-autosave-clear A/B.
- Instrument actual sessionStorage payloads, Restore button clicks, REST save/autosave payloads, `_crdt_document`, block trees, save wait fulfillment, and a fresh reload after quiescence.
- Add separate nested block/move tests for `46f8a1924911`.
