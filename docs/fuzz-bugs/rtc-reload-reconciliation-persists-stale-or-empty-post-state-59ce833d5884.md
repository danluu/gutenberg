# RTC reload reconciliation can persist stale or corrupted post state

Bug signature: `59ce833d5884`

Transport: HTTP collaboration polling.

## Summary

The original fuzz row reported a late delete followed by reload collapsing both editors to an empty block tree while the saved title and persisted CRDT document survived. The original generated artifact is no longer present, but a natural-user reconstruction on the current known-fixes base (`f256024286dd80a4c0e2579f658c109256abf648`) reproduces the same reload/save reconciliation class with ordinary paragraph blocks.

The current known-fixes base includes the stale-save protection stack from PR `77876`. That code prevents one stale-save failure mode, but it also contains two gaps that let a realistic two-user workflow save the wrong body:

1. A reloaded editor can apply an unchanged persisted CRDT document during an unrelated local save and replay stale server body state into the live CRDT document.
2. The serialized fallback merge treats a shorter all-paragraph local body as a stale prefix based only on block name. A real middle deletion of `Alpha, Beta, Gamma` to `Alpha, Gamma` is therefore merged as `Alpha, Gamma, Gamma`. A later pass also showed that an exact-prefix trailing deletion, `Alpha, Beta, Gamma` to `Alpha, Beta`, hits the same branch unless exact shorter prefixes are treated as deletes.

## User Workflow

1. Two collaborators open the same draft post.
2. The post contains ordinary top-level `core/paragraph` blocks.
3. One collaborator deletes the middle paragraph with the block toolbar.
4. The other collaborator sees convergence, reloads the editor, changes only the title, and saves.

No malformed blocks, direct store mutation, network fault injection, or generated block trees are needed. The workflow does require RTC collaboration, two active editors, a reload between an unsaved remote structural edit and a later save, and then a save from the reloaded editor.

## Impact

The defect is not UI-only. In the reconstructed failure, the saved REST body became:

```text
Alpha, Gamma, Gamma
```

while the intended collaborative body was:

```text
Alpha, Gamma
```

Before the full fix, one half of the patch prevented the primary editor from resurrecting the deleted `Beta` block, but the database still persisted the duplicated `Gamma` block. A user can manually repair the post if they notice the corruption; otherwise the draft content is silently wrong.

## Root Cause

The stale-save protection path in `packages/core-data/src/entities.js` fetches the latest REST record before save and reconciles it with the local CRDT state.

In the reproduced sequence, the REST body is still the old three-block body because the collaborator's delete has not been saved to the server. The reloaded editor's live block tree has correctly converged to two blocks through RTC. During the title-only save, the save preparation code should serialize the local two-block CRDT state. Instead:

- It applies the latest persisted CRDT document even when that document is unchanged from the editor's base record, so stale server body state can be replayed.
- Its serialized content fallback appends the latest trailing block when `latest.length > local.length` and the overlapping block names match. For same-type paragraph blocks, that cannot distinguish a stale prefix from a middle deletion. An exact shorter prefix is also ambiguous; in the RTC reload/save path, treating that as a real deletion is safer because stale title-only saves should not need to submit unchanged content.

`git blame` on the known-fixes base points both stale-save protection and the serialized fallback merge to `5bda437f0cc4` / PR `77876` (`Preserve saved content from stale editor snapshots`), with related regression coverage in `6aad4e5801af`.

## Fix Plan

The fix is intentionally narrow:

1. Only apply the latest persisted CRDT document during pre-save reconciliation if the saved fields changed on the server or the latest CRDT document differs from the base record's CRDT document.
2. Keep the stale-content fallback for shorter bodies that actually changed overlapping content, but refuse to append latest trailing blocks when the shorter local serialized block list is an exact prefix or a subsequence of the latest saved block list. Those cases are more consistent with real deletes or reorders in the RTC reload/save path than with a stale truncated snapshot.
3. Cover both decisions in `packages/core-data/src/test/entities.js`.
4. Add a Playwright regression using normal editor actions and assert the final persisted REST body, not only the visible editor state.

## Practical Likelihood

Likelihood: `medium` for RTC-enabled collaborative editing sessions, and effectively not exposed to single-user or non-RTC editing.

The ingredients are common inside collaborative editing: two active editors, normal paragraph deletion, reload, title edit, and save. The timing window is narrower than a normal save bug because the remote body edit must have converged through RTC while the REST record still has the old body. That window is still plausible in ordinary editing because RTC convergence is immediate while draft saves are separate REST operations.
