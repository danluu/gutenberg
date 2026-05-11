# RTC 810c End-Key Triage

Bug signature: `810c2d35f443`

Bug type: `rtc_ws_top_level_paragraph_insert_reconciliation_corruption`

Transport: WebSocket RTC sync

## Summary

Pass 172 falsified the strongest pass-171 claim for this signature. The
single-active-writer Enter repro is not RTC content corruption. It is ordinary
paragraph splitting at the wrapped visual line end selected by the `End` key.

The observed shape was:

```text
First paragraph after Enter:
Another paragraph exists so the to

New paragraph after typing:
Seed 953009 pass172 primary enter-after-anchorp-level list is not degenerate.
```

That looks like a spliced suffix only if the test assumes `End` means
"paragraph end". In this editor surface it moved the caret to the end of the
current wrapped line, after `to` in `top-level`. Pressing Enter there correctly
split the paragraph and placed the suffix `p-level list is not degenerate.`
after the caret. Typing then inserted the marker before that suffix.

## Pass 172 Control

The no-collaborator control used the same initial content and the same natural
keyboard sequence, but opened only one editor session:

1. Create the post.
2. Enable collaboration runtime, but do not join a second browser/user.
3. Click the final paragraph.
4. Press `End`.
5. Press `Enter`.
6. Type at 160 ms per key.
7. Read the block tree.

Command result: `1 passed`.

Result path:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-172/810c-pass172-end-key-control-results/end-key-no-collaborator-control.json
```

The control produced exactly the pass-171/pass-172 Enter shape:

```json
{
  "fullAnchorStillPresent": false,
  "matchesPass172Shape": true,
  "paragraphContents": [
    "Seed 953009 multibyte heading",
    "Emoji and multibyte: hi ..., cafe, naive, ...",
    "Another paragraph exists so the to",
    "Seed 953009 pass172 primary enter-after-anchorp-level list is not degenerate."
  ]
}
```

This means the Enter-path assertion was checking the wrong expected behavior.
The saved/reloaded pass-172 Enter result persisted because the editor saved a
normal paragraph split at the caret position, not because RTC moved text.

## Pass 177 Update

Pass 177 confirms that the `End` route above is still a false positive, but the
broader 810c same-anchor Add-after family is a real RTC product bug.

The remaining realistic route is:

```text
Two WebSocket RTC collaborators select the same paragraph, invoke Insert after,
and type into the new paragraph before both local and remote updates settle.
```

On the backlink-aware known-fixes checkout, after the structural same-anchor
block preservation fix at `c8af86c24a5`, the browser-level shortcut repro still
converged to a wrong state:

```text
Seed 953009 pass171 collaborator shortcut-after-anchor
eed 953009 pass171 primary shortcut-after-anchor
```

That result had `convergenceError: null` and `statesEqual: true`, so the peers
agreed on corrupted content. A same-checkout single-writer Add-after shortcut
control passed.

Pass 177 isolated a lower-level race in the proposed known-fixes sync-manager
stack: `editEntityRecord()` schedules local CRDT writes with a zero-delay timer,
but a remote `blocks` update can be reconciled into the local store before that
queued local write runs. The remote reconciliation then overwrites the local
typed first character. The later queued local write is either filtered out as a
stale same-key update, or arrives too late to repair the already-overwritten
editor state. This explains the observed `Seed` -> `eed` loss without requiring
malformed blocks, direct state mutation, or a rich-text delta corruption.

The pass-177 unit probe against `c8af86c24a5` reproduced the loss with:

1. Initial paragraph plus shared anchor.
2. Queued local `blocks` update inserting `primary-insert` with content `S`.
3. Remote same-anchor insert applied before the queued local update timer fires.
4. Local edited record and CRDT both missing `S`.

A candidate fix in a detached probe preserved the character by batching remote
store reconciliation through the same event-loop boundary as local CRDT writes,
and by allowing rebaseable `blocks` updates with `baseRecord.blocks` through the
stale-key filter. The new unit repro and existing
`packages/sync/src/test/manager.ts` both passed with that candidate.

## Remaining Risk

This does not revive the invalid single-writer Enter claim. It does mean
`810c2d35f443` should remain attached to the real concurrent same-anchor
paragraph insertion/typing family, which is user-reachable through the editor's
registered Insert-after command.

## Practical Classification

The single-active-writer Enter workflow remains expected editor behavior.

For the concurrent same-anchor Add-after/typing family, practical likelihood is
`medium`: it requires WebSocket RTC, two active users or tabs, ordinary
paragraph blocks, and closely overlapping edits at the same insertion point. The
overlap is narrower than typical solo editing, but the action itself is a normal
editor command and the bad outcome is converged content corruption, not a
test-only readiness failure.

## Filing Guidance

Do not file `810c2d35f443` as "single active writer pressing Enter corrupts the
post". That repro is invalid.

If this family is filed or fixed, use a repro that avoids `End` ambiguity, such
as toolbar/shortcut Add-after with two concurrent writers, and assert character
preservation rather than preserving an unsplit paragraph after a deliberate
line-end paragraph split.
