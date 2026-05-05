# PR 77658 Dennis Snell Change Audit

Audit target: <https://github.com/WordPress/gutenberg/pull/77658>

PR head audited: `fa211dd8315288a789ea34eec553c6f4106510d9`
Base at fetch time: `eff36b477eb788b03171f4d4b181f2ec164bc423`

## Scope

Dennis-authored commits considered:

- `2b7ae957852` - `Merge remote-tracking branch 'origin/trunk' into try/offset-space-bug-pr`
- `000f37eb785` - `PR Feedback, updates to naming, docblocks`
- `fa211dd8315` - `Fix moved export of WPBlockSelection in test code`

The handwritten audit is focused on `000f37eb785` and `fa211dd8315`. The merge commit was treated as integration context rather than a new authored logic change; the final PR head was still verified.

The requested personas were used as review lenses, not as impersonated voices. I ran ten passes through each lens before writing this report:

- Torvalds lens: API boundaries, needless complexity, type contract drift.
- Kingsbury lens: state-machine and CRDT invariants, convergence hazards, stale cursor scope.
- Brooker lens: failure modes, fallback behavior, blast radius, recovery on malformed deltas.
- Ghemawat lens: distributed data model simplicity, update locality, long-term maintainability.
- Luu lens: empirical evidence, test representativeness, "what did we actually prove?"

## Findings

No blocking correctness findings in Dennis's two non-merge commits.

I would not request changes for `000f37eb785` or `fa211dd8315` based on this audit. The behavioral change in Dennis's diff is the `mergeRichTextUpdate()` refactor from building a temporary `Y.Text` for the updated string to constructing `new Delta( [ { insert: updatedValue } ] )` directly. For the current representation, where the rich-text Y value stores serialized HTML as a plain string, that is equivalent for the covered cases and passed the targeted tests.

## Non-Blocking Notes

1. The `MergeCursorPosition` type now aliases the broad public `WPBlockSelection | null` in `packages/core-data/src/utils/crdt-blocks.ts:78`. That is runtime-safe because `parseCursorSelection()` and `resolveRichTextCursorPosition()` revalidate and rebrand the offset, but it weakens the internal type boundary that previously expressed "this is already a rich-text cursor hint." If the goal is to preserve the branded-type protection added earlier in the PR, consider keeping a narrowed internal type after parsing from `WPBlockSelection`.

2. `resolveRichTextCursorPosition()` now defensively checks `typeof offset === 'number'` and `Number.isInteger()` before converting the rich-text offset to an HTML string index. That is good hardening, but the need for the check is a symptom of note 1: internal merge code is now accepting a public selection shape instead of a parsed cursor shape.

3. The `mergeRichTextUpdate()` refactor is reasonable only as long as the updated value is a plain serialized HTML string. If `Y.Text` attributes ever become semantically meaningful here, both the old and new paths would need reconsideration, but the direct `Delta` construction makes that assumption more visible.

4. Minor documentation issue: `packages/core-data/src/utils/crdt-blocks.ts:132` says `Eemove`. This is cosmetic.

## Verification

Local verification was run in a temporary worktree at `/private/tmp/gutenberg-pr-77658-audit`.

Commands that passed:

```bash
npm ci
npm run test:unit -- packages/core-data/src/utils/test/rtc-rich-text-offset-space.test.js packages/core-data/src/test/rtc-rich-text-offset-space.test.js packages/core-data/src/utils/test/crdt-utils.ts packages/core-data/src/utils/test/crdt-blocks.ts
npm run lint:js -- packages/core-data/src/utils/crdt-blocks.ts packages/core-data/src/utils/crdt.ts packages/core-data/src/utils/crdt-utils.ts packages/core-data/src/awareness/post-editor-awareness.ts packages/core-data/src/utils/block-selection-history.ts packages/core-data/src/utils/crdt-selection.ts packages/core-data/src/utils/crdt-user-selections.ts packages/core-data/src/utils/test/crdt-blocks.ts packages/core-data/src/utils/test/crdt-utils.ts packages/sync/src/quill-delta/Delta.ts packages/block-editor/src/store/actions.js
git diff --check 000f37eb785^ 000f37eb785
git diff --check fa211dd8315^ fa211dd8315
git diff --check origin/trunk...HEAD
```

Targeted unit test result:

- 4 suites passed.
- 125 tests passed.

GitHub Actions at the audited head showed the PR unit-test workflow completed successfully. The Static Analysis workflow was marked failed, but the inspected Linux log ended with a runner shutdown/cancellation during type generation, while completed lint/package-lock/tsconfig steps were green. I did not find a static-analysis failure attributable to Dennis's changes.

## Conclusion

Dennis's non-merge changes look safe to keep. The only substantive concern is that the internal cursor type became less precise by aliasing `WPBlockSelection`; current guards and tests cover the behavior, so this is a maintainability/type-safety note rather than a correctness blocker.
