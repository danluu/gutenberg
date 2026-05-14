# RTC repeated autosave loop, 2026-05-14

This rewrites the earlier "stuck Saving spinner" explanation after a stricter
`origin/trunk` repro. The trunk-confirmed bug is an RTC repeated autosave loop
after normal user actions stop. A visibly stuck `Saving...` spinner remains a
related symptom to keep investigating, but it is not confirmed on trunk by the
current evidence.

## Summary

The bug is a real RTC save convergence failure on `origin/trunk` commit
[`2b5a7a9930490b13933a89c69f4455252072c14d`](https://github.com/WordPress/gutenberg/commit/2b5a7a9930490b13933a89c69f4455252072c14d).
With RTC enabled, two visible editors, normal typing, and normal `Save draft`
clicks, the editor can continue posting successful autosaves after the final
user action.

The strongest local evidence is seed `954547`:

-   Video:
    `artifacts/rtc-save-loop-video/probe-record-954547-final-evidence.mp4`
-   JSON:
    `artifacts/rtc-save-loop-video/probe-hit-record-954547-final.json`
-   Verification frame:
    `artifacts/rtc-save-loop-video/probe-record-954547-final-verification-frame.png`
-   Final user-action marker: `2026-05-14T23:52:31.711Z`
-   After that marker, Editor A continued successful
    `POST /wp/v2/posts/859/autosaves?_locale=user` requests at approximately
    `23:52:37`, `23:52:47`, `23:52:57`, `23:53:07`, `23:53:17`,
    `23:53:27`, and `23:53:37`.

Eight strict current-trunk runs hit the repeated save loop. The visible
`Saving...` spinner was searched separately with natural reload/retry paths and
was not confirmed on trunk.

## How It Was Introduced

The loop is not caused by the save button rendering. The visible save controls
are downstream of the editor dirty/save state. The confirmed trunk symptom is
that the autosave machinery continues to believe there is autosave-worthy state
after normal RTC editing should have converged.

The relevant code path is:

1. `AutosaveMonitor` calls `props.autosave()` when the post is dirty and
   `editsReference` changes. See
   [`packages/editor/src/components/autosave-monitor/index.js`](https://github.com/WordPress/gutenberg/blob/2b5a7a9930490b13933a89c69f4455252072c14d/packages/editor/src/components/autosave-monitor/index.js#L39-L75).
2. `core/editor.autosave()` delegates remote autosaves to
   `dispatch.savePost( { isAutosave: true } )`. See
   [`packages/editor/src/store/actions.js`](https://github.com/WordPress/gutenberg/blob/2b5a7a9930490b13933a89c69f4455252072c14d/packages/editor/src/store/actions.js#L457-L470).
3. Remote autosaves are sent to `/autosaves` from `core-data.saveEntityRecord`.
   See
   [`packages/core-data/src/actions.js`](https://github.com/WordPress/gutenberg/blob/2b5a7a9930490b13933a89c69f4455252072c14d/packages/core-data/src/actions.js#L683-L768).
4. Dirty state comes from `core-data.hasEditsForEntityRecord()`, which is true
   while the entity is saving or has non-transient edits. See
   [`packages/core-data/src/selectors.ts`](https://github.com/WordPress/gutenberg/blob/2b5a7a9930490b13933a89c69f4455252072c14d/packages/core-data/src/selectors.ts#L925-L938).
5. RTC persisted-doc reconciliation reports block changes by serializing
   persisted CRDT `blocks` and comparing them to saved post `content`. See
   [`packages/core-data/src/utils/crdt.ts`](https://github.com/WordPress/gutenberg/blob/2b5a7a9930490b13933a89c69f4455252072c14d/packages/core-data/src/utils/crdt.ts#L321-L348).

The trunk-only introduction chain is:

1. [WordPress/gutenberg#72373](https://github.com/WordPress/gutenberg/pull/72373),
   commit
   [`2d8b22633dd3889e1a4405dcc7ebfd4bb8dbf71c`](https://github.com/WordPress/gutenberg/commit/2d8b22633dd3889e1a4405dcc7ebfd4bb8dbf71c),
   added persisted CRDT documents. This made `_crdt_document` part of the post
   persistence model.
2. [WordPress/gutenberg#74637](https://github.com/WordPress/gutenberg/pull/74637),
   commit
   [`be1c20e213e7d2a2858d6ec92da23268ea0a8127`](https://github.com/WordPress/gutenberg/commit/be1c20e213e7d2a2858d6ec92da23268ea0a8127),
   made peer saves refetch the entity. This added another normal RTC path that
   can interleave save completion, remote save notices, and reconciliation.
3. [WordPress/gutenberg#74668](https://github.com/WordPress/gutenberg/pull/74668),
   commit
   [`50b0a31ec012cf262960e52a252428c4a50a7a2d`](https://github.com/WordPress/gutenberg/commit/50b0a31ec012cf262960e52a252428c4a50a7a2d),
   changed persisted CRDT hydration to apply only detected changes. That made
   the correctness of "detected changes" central to whether hydration creates
   new entity edits.
4. [WordPress/gutenberg#75841](https://github.com/WordPress/gutenberg/pull/75841),
   commit
   [`ea2cfb87be4a91c9de5ce6430d1cda9ff9d0553c`](https://github.com/WordPress/gutenberg/commit/ea2cfb87be4a91c9de5ce6430d1cda9ff9d0553c),
   made initial CRDT persistence save the entity record. This put first
   persistence and persisted-doc reconciliation into the normal save path.
5. [WordPress/gutenberg#75846](https://github.com/WordPress/gutenberg/pull/75846),
   commit
   [`83a8f448995bede00097ac61a340b12e3e09401b`](https://github.com/WordPress/gutenberg/commit/83a8f448995bede00097ac61a340b12e3e09401b),
   moved the `_crdt_document` meta key into `core-data`. `prePersistPostType()`
   now adds serialized CRDT metadata to post saves.
6. [WordPress/gutenberg#75922](https://github.com/WordPress/gutenberg/pull/75922),
   commit
   [`c691adacd011be144b0115f696ade658f5cefba4`](https://github.com/WordPress/gutenberg/commit/c691adacd011be144b0115f696ade658f5cefba4),
   fixed persisted-doc lookup so the sync manager reliably reads the CRDT doc
   from `record.meta`.
7. [WordPress/gutenberg#75975](https://github.com/WordPress/gutenberg/pull/75975),
   commit
   [`8051e14451cf85c5e6713bf2098149f30229e47b`](https://github.com/WordPress/gutenberg/commit/8051e14451cf85c5e6713bf2098149f30229e47b),
   made CRDT persistence async so deferred Y.Doc updates flush before
   serialization. The commit message explicitly says stale persisted CRDT docs
   caused unnecessary reconciliation saves, which is the same class of failure.
8. [WordPress/gutenberg#76624](https://github.com/WordPress/gutenberg/pull/76624),
   commit
   [`d9a7a986466ea967be267d641b4df931ef60d99c`](https://github.com/WordPress/gutenberg/commit/d9a7a986466ea967be267d641b4df931ef60d99c),
   fixed autosaves for draft and auto-draft posts by editing post content before
   autosave. Its regression test documents that, with RTC enabled, autosaving a
   draft can leave the editor dirty because RTC autosaves target an autosave
   revision. This makes false dirty-state convergence especially important.
9. [WordPress/gutenberg#77529](https://github.com/WordPress/gutenberg/pull/77529),
   commit
   [`a0c7c38face25a84c83a43d996f2e8e90371a2db`](https://github.com/WordPress/gutenberg/commit/a0c7c38face25a84c83a43d996f2e8e90371a2db),
   fixed orphaned CRDT meta causing a permanently dirty editor. This is direct
   prior evidence that equivalent or stale RTC metadata can keep dirty state
   alive.
10. [WordPress/gutenberg#77966](https://github.com/WordPress/gutenberg/pull/77966),
    commit
    [`85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5`](https://github.com/WordPress/gutenberg/commit/85cbd148b1c71bc0bfc28943e6d1c9d1e2fddbb5),
    fixed persisted-doc hydration observer ordering after hydration itself
    dispatched redundant edits. This again confirms that persisted CRDT
    hydration can create spurious edit/save effects if it observes equivalent
    state as a change.
11. [WordPress/gutenberg#77666](https://github.com/WordPress/gutenberg/pull/77666),
    commit
    [`114082fd16895304936ddd048e617891ab8f9f48`](https://github.com/WordPress/gutenberg/commit/114082fd16895304936ddd048e617891ab8f9f48),
    added `__unstableSkipSyncUpdate` so background persisted-doc saves do not
    feed their server response back into sync. This is another trunk commit
    showing that RTC save response handling already needed loop prevention.

The immediate root-cause hypothesis is narrower than the previous spinner doc:
`getPostChangesFromCRDTDoc()` compares
`__unstableSerializeAndClean( persistedBlocks ).trim()` to the saved raw
content. For invalid blocks, `originalContent` can preserve the pre-normalized
HTML needed to avoid data loss, while a save round trip can canonicalize
equivalent HTML entities or markup. If the comparison treats that canonicalized
but semantically identical content as a real `blocks` change, it dispatches a
new entity edit. `AutosaveMonitor` then sees dirty state / a changed edit
reference and sends another autosave on the normal interval. The autosave
succeeds, but the comparison re-dirties the editor, so the loop continues.

Excluded from this trunk-only chain:

-   [WordPress/gutenberg#77890](https://github.com/WordPress/gutenberg/pull/77890)
    and commit
    [`bd511b424f1e7077a59fb7f61f2f24cbd3b3c7eb`](https://github.com/WordPress/gutenberg/commit/bd511b424f1e7077a59fb7f61f2f24cbd3b3c7eb).
    It is not an ancestor of the trunk commit used by the repro.
-   Local stale-snapshot preservation commits such as
    [`fdd92d72e6b3a5034cccabae98e1762b40bff66a`](https://github.com/danluu/gutenberg/commit/fdd92d72e6b3a5034cccabae98e1762b40bff66a).
    They are useful related context but not part of the trunk repro chain.

## Initial Fix Plan

1. Confirm the dirty source before changing behavior.

    - Trace `getPostChangesFromCRDTDoc()` decisions for `blocks`, `content`, and
      `meta`.
    - Record the stable hash of saved raw content, the serialized CRDT blocks,
      whether any invalid block has `originalContent`, and whether the detected
      delta is only canonicalization.
    - Trace `editsReference`, `isEditedPostDirty()`, and autosave requests across
      a quiet window after the final user action.

2. Fix semantic equality at the RTC persisted-block comparison.

    - Do not hide the loop in `AutosaveMonitor` or the toolbar UI.
    - In `packages/core-data/src/utils/crdt.ts`, make the persisted-CRDT block
      comparison stable for invalid-block canonicalization.
    - The comparison must be conservative: an invalid block is not "unchanged"
      just because parsing or serialization is hard. It is unchanged only when
      the raw saved content and the generated block serialization represent the
      same persisted content under the known canonicalization artifact.

3. Add guardrail tests around the comparison.

    - Positive case: a seed-derived invalid block whose `originalContent`
      differs syntactically from the server-canonical saved content but
      serializes to the same canonical content should not report `blocks` as
      changed.
    - Negative case: a real edit inside an invalid block must still report a
      change and be saved.
    - Negative case: a parse or serialization failure must not silently mark all
      invalid content unchanged.

4. Add an end-to-end RTC regression.

    - Use two visible editors, RTC enabled, ordinary typing, and ordinary
      `Save draft` clicks.
    - After a final no-action marker, assert that no editor continues to send
      repeated `/autosaves` POSTs during the quiet window.
    - Assert the bug by network behavior and dirty-state convergence, not by a
      visible spinner claim.

5. Keep save transaction tracing secondary.
    - If the comparison fix does not stop the loop, add transaction IDs around
      explicit saves and autosaves to distinguish "one save never settled" from
      "equivalent edits keep starting new saves".
    - Do not merge broad tracing unless it is gated behind an explicit debug
      path.

## Fix Plan Audit

The audit was run with independent tmux-launched xhigh Codex jobs. The local
outputs are under `artifacts/rtc-save-loop-doc-audits-20260514/`.

Main objections that changed the plan:

-   `linus-torvalds`: Good direction, but the equality contract must be sharper.
    The plan must not become "invalid blocks never dirty"; add convergence and
    negative tests.
-   `kyle-kingsbury`: Targeting data equality is correct, but parse failure must
    not mean unchanged. The test matrix needs same-canonical-content and
    real-change cases.
-   `marc-brooker`: Prefer a minimal semantic-equality fix in `crdt.ts` with
    seed-derived fixtures. Remove temporary tracing before merge unless explicitly
    gated.
-   `dan-luu`: Prove the repeated autosave is from false re-dirtying, not merely
    repeated save starts. The quiet-window test should assert store convergence,
    not only wall-clock network counts.
-   `tptacek`: Verify that the same logical edit is not being reintroduced on
    each cycle. The durable fix may need idempotent reconciliation if equality
    alone is not enough.
-   Contrarian passes: A comparison-layer fix can mask a deeper persistence bug if
    used too broadly. The final plan must preserve data-loss protection for
    invalid block content.

## Revised Fix Plan

1. Build a reduced unit fixture from the trunk repro.

    - Capture the specific invalid-block / canonicalized-content pair from the
      seed `954547` family or a smaller equivalent fixture.
    - Assert that current trunk reports a `blocks` change for equivalent saved
      content and persisted CRDT blocks.

2. Implement conservative persisted-block equality.

    - Keep the current direct comparison first:
      serialized persisted blocks equal saved raw content means unchanged.
    - If that fails and there are invalid blocks with `originalContent`, compare
      a generated serialization that removes invalid-block parser bookkeeping
      against the saved raw content.
    - Return unchanged only when that generated serialization matches the saved
      raw content.
    - If serialization throws, or the generated serialization differs, treat it
      as changed.

3. Preserve negative behavior.

    - A real edit inside an invalid block must still dirty and save.
    - A content change outside the invalid-block canonicalization artifact must
      still dirty and save.
    - Unregistered meta and volatile CRDT metadata should remain excluded only by
      explicit rules, not by broad equality shortcuts.

4. Add convergence assertions.

    - Unit: `getPostChangesFromCRDTDoc()` returns no `blocks` change for the
      equivalent invalid-block fixture.
    - Unit: it returns a `blocks` change for a real invalid-block edit.
    - E2E: after normal two-editor RTC editing and save clicks, no editor sends
      an unbounded `/autosaves` stream after the final no-action marker.
    - E2E/store probe: `isEditedPostDirty()` and `editsReference` stop changing
      during the quiet window, or the test records which field re-dirties the
      editor.

5. Add transaction tracing only if the above does not close the loop.
    - Trace save ownership and start/finish pairs to distinguish a stuck pending
      save from repeated new autosaves.
    - Keep the tracing out of the final patch unless it is intentionally gated.

## False Positive Analysis

Verdict: real bug, with the trunk-confirmed symptom narrowed to repeated
autosave loop.

Evidence for a real bug:

-   The repro ran on `origin/trunk`
    [`2b5a7a9930490b13933a89c69f4455252072c14d`](https://github.com/WordPress/gutenberg/commit/2b5a7a9930490b13933a89c69f4455252072c14d).
-   The video shows two visible editors with RTC enabled.
-   Actions are normal editor actions: typing and clicking `Save draft`.
-   There are no artificial request blocks, network failures, or fault injection.
-   The final no-action marker is concrete:
    `2026-05-14T23:52:31.711Z`.
-   After that marker, successful autosave POSTs continue for more than a minute.
-   The same repeated-save signature reproduced across eight strict current-trunk
    runs.

False-positive risks:

-   Autosave every 10 seconds can be normal when a post is legitimately dirty.
-   RTC may leave a draft dirty if a peer has unsaved or newly received changes.
-   The current evidence proves network-level repeated autosaves more strongly
    than visible user-facing harm.
-   The visible stuck `Saving...` spinner is not confirmed on trunk.

Why the risks do not dismiss the bug:

-   The loop starts after explicit `Save draft` clicks and a final no-action
    marker.
-   The POSTs are full autosave writes, not lightweight RTC presence or heartbeat
    traffic.
-   A healthy RTC editor should converge after successful saves when users stop
    acting.
-   Repeated successful autosave writes after quiescence are product-impacting:
    unnecessary REST traffic, autosave churn, server load, and evidence that
    dirty-state convergence is broken.

What would disprove the current root-cause hypothesis:

-   Instrumentation showing that `getPostChangesFromCRDTDoc()` is not reintroducing
    equivalent `blocks`, `content`, or `meta` edits during the quiet window.
-   Evidence that each autosave body contains a legitimate new user-visible edit
    after the final marker.
-   A reduced normal-action RTC repro on the same trunk commit where
    `isEditedPostDirty()` converges and the autosave POST loop never appears.

Until then, this should be tracked as a real RTC repeated autosave / dirty-state
non-convergence bug. The earlier visible spinner wording should not be used as
the primary claim for the trunk repro.
