# RTC Fuzz History Coverage Additions

This note records the GitHub RTC history review that led to the latest browser-fuzzer coverage additions. The focus was not to add more generic random operations, but to turn real bug classes from prior RTC issues and PRs into recurring, history-backed coverage targets.

## History Reviewed

- [PR #78320](https://github.com/WordPress/gutenberg/pull/78320): stale visible delete propagation could leave remote users with diverged or resurrected blocks.
- [PR #78483](https://github.com/WordPress/gutenberg/pull/78483): code-editor content-only updates could reparse `content` with `blocks: undefined`, remounting embeds and changing block identity.
- [PR #77673](https://github.com/WordPress/gutenberg/pull/77673) and [PR #78251](https://github.com/WordPress/gutenberg/pull/78251): nested/table RichText awareness bugs around stale or missing attribute keys.
- [PR #78145](https://github.com/WordPress/gutenberg/pull/78145) and [issue #78093](https://github.com/WordPress/gutenberg/issues/78093): incompatible metaboxes partially disabled collaboration while sync state could still be active.
- [PR #77865](https://github.com/WordPress/gutenberg/pull/77865): first autosave/recoverability bugs for RTC auto-draft flows.
- Persistence/history fixes including [PR #77050](https://github.com/WordPress/gutenberg/pull/77050), [PR #77666](https://github.com/WordPress/gutenberg/pull/77666), [PR #77876](https://github.com/WordPress/gutenberg/pull/77876), [PR #77924](https://github.com/WordPress/gutenberg/pull/77924), and [PR #77503](https://github.com/WordPress/gutenberg/pull/77503).

## Newly Added Coverage

| New fuzz action/profile | Historical bug class | Existing coverage before this change | Gap closed now |
| --- | --- | --- | --- |
| `ui-delete-visible-remote-block` in `novelty-ws-visible-delete-active-editing` | Visible remote delete propagation, PR #78320 | Generic `delete-block` and random structure edits existed, but they did not require a block inserted by one visible user to be deleted through another user's UI and disappear for every participant. | Inserts a remote visible paragraph, deletes it through another user's block UI, waits for marker absence on every page, and records `visible-remote-delete` history. |
| `code-editor-content-only-update` in `novelty-ws-code-editor-embed-stability-active-editing` | Code-editor content-only reparsing and embed remounts, PR #78483 | Parser/reparse fuzzing and real-user editing existed, but no recurring oracle checked `editEntityRecord( ..., { content, blocks: undefined } )` against remote embed identity. | Creates an embed, performs a content-only code-editor-style update, then asserts the remote embed block `clientId` is unchanged and records `code-editor-content-only-embed-stability`. |
| `assert-nested-table-selection-cursor` in `novelty-ws-nested-awareness-active-editing` | Nested RichText/table selection awareness, PRs #77673 and #78251 | Presence and cursor coverage only proved generic paragraph selection; table mutations edited attributes but did not assert nested attribute-key awareness overlays. | Creates a table, selects `body.1.cells.1.content`, requires remote selection/cursor UI, and records `nested-table-selection-cursor`. |

Each new class is also promoted into many-user active-editing scheduling, required coverage breadth, zero-coverage priority, success-deficit bootstrap groups, and scalar cross-product goals. A passed run must now prove these cases in the same record as a realistic active-editor lifecycle, not as isolated ingredient hits.

## Contrast With Existing Coverage

The earlier fuzzing expansion already covered broad active-editing combinations: six/twelve/thirty active editors, rich text/list actions, synced notes, same-block contention, save/autosave/publish races, reconnect/background churn, HTTP 413 compaction, post-field boundaries, and strict thirty-user operation-ledger checks.

The new additions are narrower and history-derived. They cover user-visible semantics that generic convergence can miss:

- Deletion correctness is not just serialized content convergence; it must prove a block visibly inserted by another collaborator can be deleted from the UI and removed everywhere.
- Code-editor correctness is not just parser stability; it must prove content-only editor state does not remount embed blocks for remote collaborators.
- Awareness correctness is not just a cursor rectangle somewhere; it must prove nested RichText attribute paths inside table cells propagate to remote overlays.

## Still Separate Harness Work

The review also found important history classes that should not be treated as covered by these three browser actions:

- Auto-draft first-autosave recovery needs a dedicated new-post/autosave harness because existing seeded-post active-editing profiles do not exercise the same recoverability path.
- Incompatible metabox half-disable behavior needs a metabox/plugin fixture and a collaboration-disable oracle, not just normal editor fuzzing.
- Persisted-document false-dirty and minimal CRDT payload bugs need lower-level core-data/persistence property tests in addition to browser coverage.

The new graph/report loop prompt and live autoupdate scripts now call out visible remote delete, code-editor embed stability, and nested table awareness as many-user active-editing cross-products, so regular trend refreshes should not drop these dimensions once runs start producing data.
