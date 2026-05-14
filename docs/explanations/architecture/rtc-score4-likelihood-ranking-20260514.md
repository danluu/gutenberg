# RTC score-4 likelihood ranking, 2026-05-14

This report ranks the most user-likely score-4 RTC fuzz bugs after reclassification on the known-fixes integration base.

## Baseline

- Worktree used for reclassification: `/Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513`
- Branch: `try/rtc-77716-fixes-20260513`
- Head: `2f0367297effc509fd9cd90bee0a18b6b8e9803e`
- Base trunk: `8c3581c285e`
- Integrated PRs: #77723, #77724, #77775, #77866, #77874, #77876, #77887, #77890, #77924, #78251
- Skipped PR: #77889, because it is a draft alternative to #77890
- Input ledger: `artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-reclassification-20260513.jsonl`
- Score-4 input size: 932 row-local score-4 entries

Score 4 means a common workflow or common content shape with user-visible content, save, reload, or convergence impact. Score 5 is intentionally stricter: very common/default workflow and a realistic manual or Playwright repro. Under that stricter rubric, there are currently no score-5 issues.

## Ranking

| Rank | Representative issue | User-facing family | Why users are likely to hit it | Evidence | Caveats |
|---:|---|---|---|---|---|
| 1 | `890d98d04cda` | Top-level delete propagation leaves a stale block on a peer. Related clean representatives: `3ac375556552`, `007e79caf228`. | One user appends or inserts a paragraph/heading and another deletes it through normal block UI. This is an ordinary two-user editing flow, with no reload, parser edge case, revision restore, special block, or injected transport fault required in the clean representatives. | `890d98d04cda` reproduced 5/5 in a realistic Playwright UI repro. `3ac375556552` has a related no-fault append/delete repro reported 6/6. The original `890d98d04cda` seed diverged after only two actions: append paragraph, delete block. | Signature splitting understates incidence. This is best treated as the top-level stale-delete family, not only one exact hash. |
| 2 | `af5e0f7f3fce` | Collaborative save stuck/save loop after a save that appears to propagate to the peer. Related representatives include `fe67e654ee5e` and other save-stuck signatures. | Saving is a default workflow. The user-visible symptom is obvious: the initiating tab stays in `Saving` / `isSavingPost()` while the collaborator sees the draft saved. | Original analysis reports 45 same-run save timeouts with the same `saveDraft -> saveCheckpointAndVerify` shape, including seeds without injected sync faults on the save step. Multiple score-4 audit passes independently ranked this family near the top. | One current known-fixes replay for the exact `af5e0f7f3fce` command drifted into parser/entity content nonconvergence, so this should be handed off as the broader save-stuck family. |
| 3 | `86a2aac99e27` | Top-level paragraph insert order drift, often frontloading a new paragraph on the passive peer. Duplicate/related: `380b9696ecd9`. | Adding paragraphs around existing content is basic collaborative editing. The failure is visible ordering divergence. | No faults before divergence, exact store replay evidence, and a real-user keyboard repro. | One menu-driven repro converged, so the insertion route matters. |
| 4 | `1a34d7bcf4d5` / family `46f8a1924911` | Reload/local-autosave restore corrupts post state and persisted content after rejoin. | Reload/rejoin plus local autosave or browser backup recovery is common in long editing sessions. The user-visible impact is severe because persisted content can be truncated. | Realistic WebSocket Playwright repro hit 5/5 with edit, autosave, reload, and follow-up edit. | Depends on local autosave/browser backup state, so pure incidence is below basic delete/save flows. |
| 5 | `19e3206c0aba` | WebSocket nonconvergence after insert then edit. | Append then edit a prior paragraph is ordinary collaboration. | Realistic no-fault WebSocket repro hit 3/3; peers had matching CRDT/update identifiers while editor block state differed. | HTTP controls did not reproduce, so this may be WebSocket-specific. |
| 6 | `da9e95b74781` / family `a910f9f0c99d` | Top-level move duplicates a block and drops a sibling. Related move/reorder signatures include `062d1b861312` and `e2e33c526e4a`. | Block moves are common enough for editors who rearrange content, and duplicate/drop corruption is highly visible. | Multiple score-4 rows and a realistic two-user Playwright family repro hit 5/5. | Original seed had prior structural edits and a retriable sync fault, so it ranks below simpler insert/delete/save families. |
| 7 | `14bf369fe913` | HTTP top-level order divergence after append paragraph plus insert heading. | Append paragraph and insert heading are ordinary operations. | Primary run plus two rechecks reproduced with sync faults disabled and no reload/save path. | HTTP-polling specific and only medium confidence. |
| 8 | `7d6faa1f8935` | Checkpoint save can serialize stale full-record fields and clobber content/title state. Related empty-content variants include `08c123e6966a`. | Save draft is a default workflow and the impact can be content loss. | Trace evidence shows a good save followed by accepted stale `content:""` saves; a UI-only isolated Playwright repro hit a related save-state split. | Exact content-loss variant is timing-sensitive and less cleanly UI-reproduced than the top issues. |
| 9 | `e86f08576521` | WebSocket checkpoint body corruption after reload: title survives while body inserts disappear. | Save/reload/rejoin is normal RTC behavior, especially in long sessions. | Related `6a8ab2e09b56` and `f9012fe22f5d` show title surviving while body inserts disappear; realistic WebSocket repro failed 5/5 historically. | Known-fixes revalidation partially fixed or made one wrapper variant inconclusive, so this is a runner-up rather than top-tier. |
| 10 | `0524a603bf29` | Opening a fresh collaborative post can persist foreign stale state. | Opening a collaborative draft is a first-run/default workflow. | Realistic open-only repro overwrote visible and persisted post state with foreign RTC state before edits. | Needs more confidence that stale cross-document state is production-real rather than test-environment contamination. |

## Broader user-facing buckets

Exact hashes understate incidence because the watcher split similar user symptoms across many signatures. Grouping by user-facing behavior gives this conservative score-4 incidence picture:

| User-facing bucket | Conservative score-4 incidence | Representative hashes | Reason to prioritize |
|---|---:|---|---|
| Flat top-level insert/move/order divergence | 18 seeds | `f65b44dd3b5`, `86a2aac99e27`, `fa621013afa9`, `cda9feafe80e` | Paragraph/heading insert or move leaves peers with different order or duplicated/dropped paragraphs. |
| Save stuck / save loop after successful persist | 18 seeds | `a0bace0c91b7`, `a80360c99de2`, `18e6f469955c`, `fe67e654ee5e`, `5d1a7466f14c` | Saver remains in `Saving` / `isSavingPost()` while the peer is saved and post data is already persisted. |
| Empty body / zero-block content loss after save/reload/edit | 9 seeds | `a168ba286e58`, `1133c7f51e41`, `08c123e6966a`, `13fb213d0c04`, `e87fc90859a8` | Normal save/reload/follow-up edit paths collapse the block tree to zero blocks or persist empty content while title/CRDT survive. |
| Delete propagation / stale deleted block | 6 seeds | `890d98d04cda`, `fa0afe003474`, `185aeebeb2a3`, `66b2fa516ba5` | Ordinary delete of a paragraph or heading applies locally but is retained by another peer. |

Parser/revision/oversize-only families and CRDT-only divergence without visible editor impact were not promoted in this ranking.

## Audit method

The ranking used a score-4-only audit over the known-fixes reclassification ledger. Ten separate tmux-spawned Codex workers reviewed the score-4 set from different angles:

- exact issue ranking;
- duplicate/family grouping;
- WebSocket simple-action bugs;
- HTTP simple-action bugs;
- save/reload bugs;
- realistic-repro strength;
- repetition across seeds;
- evidence sanity;
- overlooked common families;
- final head-to-head comparison.

The strongest consensus was that the top two are:

1. WebSocket top-level stale delete propagation, represented by `890d98d04cda` and related hashes.
2. Collaboration save stuck/save-loop, represented by `af5e0f7f3fce` and related hashes.

