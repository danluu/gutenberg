# RTC websocket save checkpoint can expose stale block state

Bug signature: `a0555cca5e5d`

Fuzz type: `rtc_ws_checkpoint_reload_then_later_append_resurrects_stale_top_level_subtree`

## Verdict

This is a real RTC correctness bug on the current known-fixes base
`f256024286dd80a4c0e2579f658c109256abf648`. The current base includes the
May 7 backlink-aware RTC fix stack, but it still lets a successful draft save
clear the current synced `blocks` edit while retaining an older raw `blocks`
array on the post record.

Pass 170 showed live divergence after the first save: the saving editor rolled
back from six blocks to the stale four-block checkpoint while the collaborator
and REST content still had six blocks. Pass 171 added the shortest practical
impact experiment: after that rollback, edit and save again from the stale
editor. The second save persisted content that dropped the previously saved
checkpoint paragraph.

Pass 174 rebased the PR branch onto current `origin/trunk`
`b38f9b4d86d0505199f5efd78c2adf213e428e78` and reran both committed
WebSocket browser scenarios on the fixed branch. The preseeded Pullquote and
UI-created Pullquote variants both converged through save, collaborator reload,
formatted append after Search, and final convergence.

Pass 177 rebased both the explanation branch and the PR branch onto
`origin/trunk` `23f840960ebf80b59832a0d724fa1c018e79a186`. The focused
core-data reducer regression still passes on the rebased PR branch.

Pass 179 rebased both branches onto `origin/trunk`
`976f7e9f8748add32960dfefec9423320e0331d6`. Current trunk already contains the
shared WebSocket test harness, so the repro commit now only adds the a0555 spec
and includes it in the WebSocket config. The focused core-data reducer
regression still passes on the rebased PR branch.

Pass 180 rebased both branches onto `origin/trunk`
`d9c0340d5a68c34d340d30ac61e8f58e8bf9bd56`. The intervening trunk commits do
not touch the affected core-data reducer/entity paths or the RTC WebSocket test
harness paths. The exact known-fixes source probe still exposes stale raw
`blocks` after a save response with fresh `content` and omitted `blocks`, and
the focused reducer regression still passes on the rebased PR branch.

## Natural Workflow

The repro uses ordinary post-editor actions over the WebSocket RTC transport:

1. Two browser sessions open the same draft.
2. The draft initially contains Paragraph, Heading, Paragraph, and Pullquote.
3. User A appends a paragraph and inserts a Search block.
4. Both editors converge on the six-block state.
5. User A changes the title and clicks Save Draft.
6. User A rolls back to the stale four-block state while User B remains on the
   six-block state.
7. User A appends a follow-up paragraph from the rolled-back state and clicks
   Save Draft again.

No malformed block markup, direct store mutation, artificial fault injection, or
synthetic block tree mutation is needed for the browser repro.

## Impact

The pass-171 rerun persisted this REST transition:

Before the second save, REST content contained the checkpoint paragraph and
Search block:

```html
<!-- wp:paragraph -->
<p>rtc-save-paragraph-marker-953507-1-0-end</p>
<!-- /wp:paragraph -->

<!-- wp:search {"label":"Search","buttonText":"Search"} /-->
```

After saving from the rolled-back editor, REST content no longer contained the
checkpoint paragraph and instead contained the follow-up paragraph plus Search:

```html
<!-- wp:paragraph -->
<p>rtc-followup-after-rollback-marker-953507-1-0-end</p>
<!-- /wp:paragraph -->

<!-- wp:search {"label":"Search","buttonText":"Search"} /-->
```

That makes the blast radius persistent content loss/corruption, not just a
temporary UI-only split. While the post can still be repaired from revisions,
the active editor state after the second save also remains inconsistent between
the two editors.

## Root Cause

For post entities, `blocks` is a transient edit derived from `content`. A save
response updates `content` but can omit `blocks`. The core-data receive path then
uses `conservativeMapItem()` to preserve omitted fields from the previous raw
record. If that previous raw record has stale `blocks`, the save response gets a
fresh `content` value and an old `blocks` value.

The edit reducer clears the matching saved `blocks` edit because
`saveEntityRecord()` passes the submitted edits as `persistedEdits`. The visible
edited record then falls back to the preserved stale raw `blocks` value.

Relevant files:

- `packages/core-data/src/actions.js`
- `packages/core-data/src/reducer.js`
- `packages/core-data/src/queried-data/reducer.js`
- `packages/core-data/src/utils/conservative-map-item.js`
- `packages/core-data/src/entities.js`

## Fix Direction

The PR branch adds a reducer regression and hydrates readable transient fields
on received entity records before the edit-clearing comparison runs. For posts,
that means a REST response with updated `content` and omitted `blocks` receives
fresh derived `blocks` instead of preserving an older raw block tree.

This keeps the invariant local: if an entity config declares a readable transient
field, and the received record has enough source data to derive that field, the
raw record should not keep a stale older transient value.

## Evidence

Known-fixes base:

- `/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-current-20260507`
- SHA `f256024286dd80a4c0e2579f658c109256abf648`

Pass-171 JSON artifact:

- `/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-171/a0555-knownfix-followup-save-results-rerun/preseed-pullquote-save-reload-formatted-attempt-0.json`

Observed snapshot sequence:

- `after-open`: 4 blocks / 4 blocks
- `before-save`: 6 blocks / 6 blocks
- `after-save-failed-convergence`: 4 blocks / 6 blocks
- `after-followup-edit-in-rolled-back-primary`: 5 blocks / 5 blocks
- `after-second-save-from-rolled-back-primary`: both report 6 blocks, but disagree
  on the checkpoint paragraph versus follow-up paragraph

The focused unit test added on the PR branch passes with:

```bash
npm run test:unit packages/core-data/src/test/reducer.js -- --testNamePattern="hydrates readable transient edits before clearing persisted edits"
```

Pass 174 also applied that test commit cleanly to exact known-fixes SHA
`f256024286dd80a4c0e2579f658c109256abf648`. Running the full Jest assertion was
blocked by unrelated local generated-artifact/dependency setup, but the
dependency-light source check using exact `conservativeMapItem()` reproduced the
stale transition:

```json
{
  "mergedRawBlockTexts": [ "old" ],
  "rawContentHasNewParagraph": true,
  "editsAfterReceive": {},
  "visibleBlockTexts": [ "old" ],
  "reproduced": true
}
```

Pass-179 rebased PR branch head:

```text
b175fcd7a54b35f0c5f9da9d24ce0154e249e887 Hydrate readable transient fields on received entities
85ee624996266ea7c5d307331dbe3b6bdaabab40 Add RTC stale subtree Playwright regression
cd273bb06e1258dc263ae5fa3e56966a1751666b Add stale transient blocks receive regression test
```
