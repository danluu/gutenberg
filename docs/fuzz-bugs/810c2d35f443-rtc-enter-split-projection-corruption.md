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

## Remaining Risk

This does not prove every historical seed-953009 family artifact is false. The
manifest still links `810c2d35f443` to broader concurrent same-anchor paragraph
insert/typing failures, and the old simultaneous Add-after shortcut path does
not rely on `End`.

However, pass 172 also reran the Add-after shortcut as a single-active-writer
case with a connected second WebSocket RTC session:

```text
RTC_810C_PASS171_SKIP_SECONDARY_ACTION=1
RTC_810C_PASS171_TYPE_DELAY_MS=160
npm run test:e2e:rtc-websocket -- \
  specs/editor/collaboration/websocket/collaboration-triage-810c2d35f443-pass171-delay-probe.spec.ts \
  --project=chromium --workers=1 --reporter=line --grep shortcut-after-anchor
```

Command result: `1 passed`.

Result path:

```text
/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-172/810c-pass172-singlewriter-shortcut-results/shortcut-after-anchor.json
```

That result had `convergenceError: null`, `statesEqual: true`, and
`exactTextsPresentOnBoth: true`. The remaining plausible product issue is
therefore much narrower: simultaneous same-anchor paragraph insertion/typing by
two users, likely a duplicate of the broader concurrent paragraph insertion
family rather than a standalone 810c single-writer corruption bug.

## Practical Classification

The pass-171 `high` practical-impact classification should be withdrawn for
this signature. The single-active-writer Enter workflow is expected editor
behavior once the `End` key semantics are accounted for.

For the residual concurrent same-anchor Add-after/typing family, practical
likelihood is `low`: it requires WebSocket RTC, two active users or tabs,
ordinary paragraph blocks, and closely overlapping edits at the same insertion
surface. It does not require malformed blocks or direct state mutation, but the
timing and same-anchor overlap are fuzz-like compared with normal collaborative
editing.

## Filing Guidance

Do not file `810c2d35f443` as "single active writer pressing Enter corrupts the
post". That repro is invalid.

If this family is filed or fixed, use a repro that avoids `End` ambiguity, such
as toolbar/shortcut Add-after with two concurrent writers, and assert character
preservation rather than preserving an unsplit paragraph after a deliberate
line-end paragraph split.
