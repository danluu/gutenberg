# RTC likely-real bug handoff - 2026-05-14

Snapshot generated: 2026-05-14T20:25:57.501Z

This report is for a follow-on agent that will group likely-real RTC bugs into a smaller set of fix areas. It intentionally does not do final grouping; it preserves every currently believed-real row plus the existing duplicate/family hints.

## Source baseline

- Worktree used for revalidation/fuzzing: `/Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513`
- Branch under test: `try/rtc-77716-fixes-20260513`
- Expected tested head: `2f0367297effc509fd9cd90bee0a18b6b8e9803e`
- Base trunk: `8c3581c285e`
- Integrated fixes: #77723, #77724, #77775, #77866, #77874, #77876, #77887, #77890, #77924, #78251
- Main ledger: `/Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-reclassification-20260513.jsonl`
- Current matrix supplement: `/Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/fuzz-matrix-20260514T162812Z`

## Files

- Full TSV: [rtc-likely-real-bug-handoff-20260514.tsv](./rtc-likely-real-bug-handoff-20260514.tsv)
- Full JSONL: [rtc-likely-real-bug-handoff-20260514.jsonl](./rtc-likely-real-bug-handoff-20260514.jsonl)

Use the TSV for spreadsheet-style triage and the JSONL for scripting. Both contain the same rows and include local artifact paths.

## Scope

- Ledger likely-real/live rows: 2842
- Current matrix likely-real analysis rows not yet folded into the ledger: 102
- Total report rows: 2944
- Approximate family keys represented: 2122
- Excluded: rows marked `fixed_exact_replay_passed` or `fixed_manual_realistic_replay_passed`, and rows whose classification is only `uncertain`.
- Included caveat: rows marked `pending_manual_reconstruction_missing_seed` are believed real historically but still need exact reconstruction on this base.
- Current matrix rows are analysis-tier candidates from the active known-fixes matrix. They are useful hints, but many still need deep replay before filing bugs.

### Rows By Row User-Hit Likelihood Score

| value | rows |
| --- | ---: |
| 4 | 932 |
| 3 | 763 |
| 2 | 1094 |
| 1 | 150 |
| 0 | 5 |

### Rows By Family Priority Score

| value | rows |
| --- | ---: |
| 4 | 1346 |
| 3 | 699 |
| 2 | 800 |
| 1 | 96 |
| 0 | 3 |

### Rows By Known-Fixes Status

| value | rows |
| --- | ---: |
| still_live_exact_replay_candidate | 2790 |
| active_matrix_analysis_candidate | 102 |
| pending_manual_reconstruction_missing_seed | 48 |
| still_live_new_post_fix_family | 3 |
| partial_fixed_variant_but_canonical_inconclusive | 1 |

### Rows By Transport

| value | rows |
| --- | ---: |
| ws | 2615 |
| http | 329 |

## Column Guide

- `issueHash`: original signature hash from the triage/analysis system.
- `relation`, `duplicateOf`, `familyKey`, `canonicalFamily`: existing grouping hints. The next agent should start grouping with these but should not treat them as final.
- `rowUserHitLikelihoodScore`: current row-local likelihood score. `5` requires both common/default exposure and realistic UI reproduction; this stricter pass currently leaves no score-5 rows in the live ledger.
- `familyPriorityScore`: highest live score currently known for that duplicate family. This is useful for ordering work, not proof of distinctness.
- `knownFixesStatus`: whether the row still reproduces, is a current matrix candidate, or needs manual reconstruction.
- `tags`: generated helper tags from existing labels/summaries, intended only to speed grouping.
- `evidenceAbs` and `sourceResultPath`: local paths another agent can open on this machine.

## Suggested Grouping Workflow

1. Sort by `familyPriorityScore`, then `rowUserHitLikelihoodScore`, then `knownFixesStatus`.
2. Cluster by `familyKey`/`duplicateOf`, then merge across similar `canonicalFamily` names and `tags`.
3. For each cluster, inspect `sourceResultPath`, `evidenceAbs`, and any replay result under the known-fixes artifact root.
4. Prefer clusters with `still_live_exact_replay_candidate` or `still_live_new_post_fix_family` over `pending_manual_reconstruction_missing_seed`.
5. Treat `active_matrix_analysis_candidate` rows as new leads: confirm with replay before using them as primary fix targets.

## Highest-Priority Sample Rows

| issue | score | family priority | status | transport | family/canonical label | duplicateOf | tags | evidence |
| --- | ---: | ---: | --- | --- | --- | --- | --- | --- |
| `007e79caf228` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_insert_before_then_delete_original_first_paragraph_not_propagated |  | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,block-order-move,insert-del | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513- |
| `00acd65a857b` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc-collaboration-save-loop-after-reload-keeps-isSavingPost-true | `18e6f469955c` | transport:ws,profile:default,duplicate-row,save,reload-rejoin,stuck-saving,nested-structure,http-ove | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `00ff587d9379` | 4 | 4 | still_live_exact_replay_candidate | ws | collaboration title desync after save checkpoint and collaborator reload |  | transport:ws,profile:default,save,reload-rejoin,title,nonconvergence,nested-structure,awareness-disc | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `00ff770eeb4a` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_title_sync_merge_corruption |  | transport:ws,profile:default,save,reload-rejoin,persistence,title,body-content,nonconvergence,rich-t | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513- |
| `012a79cadefd` | 4 | 4 | still_live_exact_replay_candidate | ws | reload-time hidden persisted _crdt_document divergence across pages despite visible editor | `70bf44bb5bad` | transport:ws,profile:session-lifecycle,duplicate-row,reload-rejoin,persistence,crdt-meta,nonconverge | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `0150ea978454` | 4 | 4 | still_live_exact_replay_candidate | http | rtc_title_diverges_after_reload_without_save | `7305b6972580` | transport:http,profile:default,duplicate-row,save,reload-rejoin,persistence,title,body-content,crdt- | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `0172cd9f2bb6` | 4 | 4 | still_live_exact_replay_candidate | ws | collaboration_reload_hybrid_title_corruption_after_multiple_title_edits | `f06174934dd4` | transport:ws,profile:session-lifecycle,duplicate-row,reload-rejoin,title,body-content,block-order-mo | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `01bf995e5ef6` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_move_into_group_drops_top_level_source_after_fallback_group_insert |  | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,nonconvergence,block-order- | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `01c07e207740` | 4 | 4 | still_live_exact_replay_candidate | ws | save-checkpoint post-save convergence drops newly inserted checkpoint blocks on one peer w | `7daba3c05a7e` | transport:ws,profile:default,duplicate-row,save,persistence,title,crdt-meta,insert-delete,awareness- | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `01ca37c5165b` | 4 | 4 | still_live_exact_replay_candidate | ws | RTC collaboration non-convergence after full-document parse/reset canonicalizes entity-hea | `5343cf9079c1` | transport:ws,profile:default,duplicate-row,persistence,body-content,nonconvergence,rich-text-html,ne | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `01cfc985a98f` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_top_level_insert_order_divergence |  | transport:ws,profile:default,reload-rejoin,persistence,body-content,nonconvergence,block-order-move, | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `01f80d2f28b5` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_save_checkpoint_title_regresses_to_older_pre_checkpoint_value_after_reload_while_new_b | `c85df9d75fc2` | transport:ws,profile:default,duplicate-row,save,reload-rejoin,title,body-content,websocket | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `02289235f55f` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_ws_persisted_block_markup_corruption_stuck_save |  | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,stuck-saving,rich-text-html | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `0281368b9b97` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_remote_delete_after_recent_top_level_insert_applies_inconsistently_across_replicas_aft | `495bed413df8` | transport:ws,profile:default,duplicate-row,save,reload-rejoin,nonconvergence,block-order-move,insert | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `030e27958e7c` | 4 | 4 | still_live_exact_replay_candidate | ws | deprecated_verse_linebreak_canonicalization_nonconvergence | `f660d46be744` | transport:ws,profile:default,duplicate-row,persistence,body-content,nonconvergence,rich-text-html,ne | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `0310b28ad2e9` | 4 | 4 | still_live_exact_replay_candidate | http | rtc-title-diverges-after-reload-under-transient-sync-fault | `fbf767d46692` | transport:http,profile:default,duplicate-row,save,reload-rejoin,persistence,title,body-content,nonco | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `033f093d60f7` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_reload_corrupts_common_block_serialization_into_invalid_button_and_freeform_blocks | `d4fbf9c7b082` | transport:ws,profile:default,duplicate-row,reload-rejoin,persistence,body-content,insert-delete,rich | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `0383c38fde36` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_pullquote_delete_leaves_remote_peer_with_stale_top_level_pullquote | `acf2880f01d6` | transport:ws,profile:default,duplicate-row,save,reload-rejoin,persistence,body-content,block-order-m | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `03a13c97789c` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_collaboration_block_tree_corruption_after_nested_move |  | transport:ws,profile:default,reload-rejoin,body-content,block-order-move,nested-structure,awareness- | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513- |
| `03e9439360ac` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_collaboration_block_type_corruption_group_replaced_by_table_after_move_sequence |  | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,nonconvergence,block-order- | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `03f0624907c8` | 4 | 4 | still_live_exact_replay_candidate | ws | RTC stale move/reload reconciliation corrupts block identity so a core/search absorbs core |  | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,crdt-meta,nonconvergence,bl | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513- |
| `0401b7f960a5` | 4 | 4 | still_live_exact_replay_candidate | ws | Top-level stale-local reconciliation cancels a later local delete of a remotely inserted b | `12ec8c36ed8d` | transport:ws,profile:default,duplicate-row,save,reload-rejoin,persistence,body-content,insert-delete | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `042071503b01` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_post_save_persists_divergent_crdt_snapshots_with_visible_state_converged | `f623504dc9c6` | transport:ws,profile:default,duplicate-row,save,reload-rejoin,persistence,title,body-content,crdt-me | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `04ac84e75930` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_move_reconciliation_corruption_after_transient_ws_disconnect |  | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,nonconvergence,block-order- | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513- |
| `04cb3b53b722` | 4 | 4 | still_live_exact_replay_candidate | ws | RTC root-to-group paragraph move preserves a stale top-level copy on one replica | `130a60214fea` | transport:ws,profile:default,duplicate-row,save,reload-rejoin,persistence,body-content,block-order-m | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `05240885987d` | 4 | 4 | still_live_exact_replay_candidate | ws | collaboration-state-collapse-saves-empty-post-content |  | transport:ws,profile:default,save,reload-rejoin,persistence,title,body-content,crdt-meta,nested-stru | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `0524a603bf29` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_opening_fresh_collab_post_can_persist_foreign_stale_state |  | transport:ws,profile:default,save,reload-rejoin,persistence,title,body-content,crdt-meta,nonconverge | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `056f27d241c2` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_live_move_block_into_group_duplicate_survivor_divergence_with_stale_top_level_preforma | `5bc0b23debdd` | transport:ws,profile:default,duplicate-row,save,persistence,body-content,nonconvergence,block-order- | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `05cf7e6e9a31` | 4 | 4 | pending_manual_reconstruction_missing_seed | ws | persisted CRDT document divergence after checkpoint reload despite visible editor converge | `fa80f806cfc1` | transport:ws,profile:default,duplicate-row,save,reload-rejoin,persistence,title,body-content,crdt-me | /Users/danluu/dev/fuzz/gutenberg/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-15-20260503T125422Z/.triage-watche |
| `05f594c537f7` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_top_level_reorder_after_concurrent_insert_smears_moved_paragraph_over_sibling |  | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,block-order-move,insert-del | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `062d1b861312` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_top_level_delete_then_reorder_then_reorder_duplicates_remote_paragraph |  | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,nonconvergence,block-order- | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513- |
| `062f431fa42f` | 4 | 4 | still_live_exact_replay_candidate | ws | collaboration_crdt_save_lifecycle_timeout_after_reload | `e1af6d1461bd` | transport:ws,profile:default,duplicate-row,save,reload-rejoin,persistence,title,body-content,crdt-me | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `0643e3fba726` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_reparse_resetblocks_duplicate_block_suffix_after_cross_peer_reparse_with_possible_crdt |  | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,crdt-meta,rich-text-html,ne | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513- |
| `0664e30db41f` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_ws_participant_state_read_stall_after_save_checkpoint_delete_block | `128f084401c0` | transport:ws,profile:default,duplicate-row,save,reload-rejoin,insert-delete,websocket | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `06970bc4f230` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_top_level_delete_resurrects_recent_paragraph_after_clean_append |  | transport:ws,profile:default,save,reload-rejoin,nonconvergence,insert-delete,nested-structure,awaren | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513- |
| `06ad9594b636` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_structural_group_to_quote_rewrite_divergence |  | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,nonconvergence,insert-delet | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513- |
| `075b1615ac1b` | 4 | 4 | still_live_exact_replay_candidate | ws | collaboration_convergence_divergence_missing_search_block_after_reload_and_move |  | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,nonconvergence,block-order- | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `0807b990d645` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_top_level_insert_order_nonconvergence_after_delayed_sync |  | transport:ws,profile:default,save,reload-rejoin,title,nonconvergence,block-order-move,insert-delete, | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513- |
| `08173e44f606` | 4 | 4 | still_live_exact_replay_candidate | ws | reload_time_empty_content_save_clobbers_persisted_post_while_crdt_document_survives | `e14385ab560d` | transport:ws,profile:default,duplicate-row,save,reload-rejoin,persistence,title,body-content,crdt-me | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `085c79ded48e` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_stale_snapshot_top_level_move_cross_type_table_attr_smear_on_neighboring_heading | `7892f5ef7d92` | transport:ws,profile:default,duplicate-row,save,reload-rejoin,persistence,body-content,block-order-m | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `0886b31519f0` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_move_block_after_concurrent_top_level_paragraph_inserts_duplicates_one_paragraph_and_d |  | transport:ws,profile:default,block-order-move,insert-delete,websocket | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `08c123e6966a` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_save_path_empty_content_clobber_after_title_edit_under_sync_fault |  | transport:ws,profile:default,save,reload-rejoin,persistence,title,body-content,nonconvergence,rich-t | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `08c123e6966a` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_save_path_persists_empty_content_while_title_and_crdt_survive |  | transport:ws,profile:default,save,reload-rejoin,persistence,title,body-content,crdt-meta,rich-text-h | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `08d727bc099b` | 4 | 4 | still_live_exact_replay_candidate | ws | collaboration ordering divergence after save/reload |  | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,nonconvergence,block-order- | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `08eb116f4d40` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_collaboration_checkpoint_save_title_regresses_to_stale_title | `08357dab27be` | transport:ws,profile:default,duplicate-row,save,reload-rejoin,persistence,title,websocket | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `092f1f0588ba` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc-post-move-hidden-order-drift-causing-insert-position-divergence |  | transport:ws,profile:default,persistence,body-content,nonconvergence,block-order-move,insert-delete, | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513- |
| `0932bed35c7a` | 4 | 4 | still_live_exact_replay_candidate | ws | checkpoint_search_insert_collapses_live_document_to_single_search_block_before_save | `ddf9559af37e` | transport:ws,profile:default,duplicate-row,save,reload-rejoin,insert-delete,awareness-discovery,webs | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `0933b1515586` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_ws_save_checkpoint_serialization_drops_marker_with_corrupted_blocks_after_reload_delet | `3bfd65548df5` | transport:ws,profile:session-lifecycle,duplicate-row,save,reload-rejoin,persistence,body-content,ins | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `0967934e4888` | 4 | 4 | still_live_exact_replay_candidate | ws | Collaborative non-convergence after collaborator-local parse/reset canonicalizes pre-exist | `22246ab1475e` | transport:ws,profile:default,duplicate-row,persistence,body-content,nonconvergence,stuck-saving,rich | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `09b39d9dd65e` | 4 | 4 | still_live_exact_replay_candidate | ws | RTC collaboration cross-parent block move leaves one replica with a stale top-level copy a | `8ac6cb436758` | transport:ws,profile:default,duplicate-row,body-content,nonconvergence,block-order-move,rich-text-ht | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `09d12db3c047` | 4 | 4 | still_live_exact_replay_candidate | http | rtc_title_divergence_after_reload_with_unsaved_state_and_retriable_sync_fault | `11ec0666ffd0` | transport:http,profile:default,duplicate-row,save,reload-rejoin,persistence,title,crdt-meta,nonconve | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `0a0ae12a9605` | 4 | 4 | pending_manual_reconstruction_missing_seed | ws | rtc_ws_save_checkpoint_initiator_stuck_saving_after_successful_persist |  | transport:ws,profile:default,save,reload-rejoin,persistence,stuck-saving,awareness-discovery,websock | /Users/danluu/dev/fuzz/gutenberg/artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/ws-gen-31-20260507T200403Z/.triage-watche |
| `0a4b453766e2` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_move_block_duplicates_new_checkpoint_search_and_smears_checkpoint_paragraph_into_searc |  | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,nonconvergence,block-order- | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `0b2f823412eb` | 4 | 4 | still_live_exact_replay_candidate | ws | RTC persistence/hydration writes or serves empty post content while preserving title and _ | `d23bf20abd7d` | transport:ws,profile:default,duplicate-row,save,reload-rejoin,persistence,title,body-content,crdt-me | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `0b5870df80ad` | 4 | 4 | still_live_exact_replay_candidate | ws | live_collaboration_concurrent_top_level_insert_missing_on_one_peer_after_prior_save_checkp | `c8919a9ed3a3` | transport:ws,profile:default,duplicate-row,save,reload-rejoin,persistence,body-content,insert-delete | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `0b7d323b924e` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_post_checkpoint_live_block_store_collapse_to_empty_while_persisted_post_remains_non_em |  | transport:ws,profile:default,save,persistence,title,body-content,crdt-meta,nested-structure,websocke | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513- |
| `0b9eadcf4133` | 4 | 4 | still_live_exact_replay_candidate | ws | quote_legacy_value_attribute_drift_after_save_checkpoint | `65c32a4039f8` | transport:ws,profile:default,duplicate-row,save,reload-rejoin,persistence,title,body-content,crdt-me | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `0c02a1ab8f0e` | 4 | 4 | still_live_exact_replay_candidate | ws | collaboration_reload_checkpoint_autosave_content_store_divergence |  | transport:ws,profile:session-lifecycle,save,reload-rejoin,persistence,body-content,nonconvergence,we | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `0cca6d3c1316` | 4 | 4 | still_live_exact_replay_candidate | ws | RTC multiline content normalization divergence (`<br>` vs `\\n`) across peers | `c54fff0a0d67` | transport:ws,profile:default,duplicate-row,persistence,body-content,nonconvergence,rich-text-html,aw | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |
| `0d27c057d6ea` | 4 | 4 | still_live_exact_replay_candidate | ws | rtc_ws_checkpoint_search_move_duplicates_search_and_drops_inserted_heading |  | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,stuck-saving,block-order-mo | /Users/danluu/dev/fuzz/gutenberg-rtc-77716-fixes-20260513/artifacts/rtc-browser-fuzz/known-fixes-20260513-201544/all-issues-replay-20260513/ |

## Highest-Priority Family Hints

These are representative rows per existing `familyKey`, not a final grouping.

| familyKey | family priority | sample issue | row score | canonical label | tags |
| --- | ---: | --- | ---: | --- | --- |
| `ddf9559af37e` | 4 | `0932bed35c7a` | 4 | checkpoint_search_insert_collapses_live_document_to_single_search_block_before_save | transport:ws,profile:default,duplicate-row,save,reload-rejoin,insert-delete,awareness-discovery,websocket |
| `1c6e2823fe24` | 4 | `1c6e2823fe24` | 4 | Collaboration non-convergence caused by HTML entity normalization drift in invalid-block parser/repa | transport:ws,profile:default,persistence,body-content,nonconvergence,stuck-saving,block-order-move,rich-text-html,nested |
| `08d727bc099b` | 4 | `08d727bc099b` | 4 | collaboration ordering divergence after save/reload | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,nonconvergence,block-order-move,insert-delete,r |
| `4d98d5b59e0b` | 4 | `4d98d5b59e0b` | 4 | collaboration parser-transform non-convergence after resetBlocks(parse(content)) with invalid blocks | transport:ws,profile:default,persistence,body-content,nonconvergence,rich-text-html,nested-structure,http-oversize,webso |
| `837fd094fb42` | 4 | `837fd094fb42` | 4 | Collaboration reload/reconciliation corrupts block serialization and leaves core/editor save state s | transport:ws,profile:session-lifecycle,save,reload-rejoin,persistence,body-content,stuck-saving,block-order-move,insert- |
| `45588743a7b8` | 4 | `d4cdb50624a9` | 4 | collaboration save persists newer state only to autosave while canonical post/revisions remain stale | transport:http,profile:default,duplicate-row,save,reload-rejoin,persistence,body-content,rich-text-html,http-oversize |
| `8f5032c13f1b` | 4 | `b61c393447f5` | 4 | collaboration save/content serialization desync causing blank post content while block state still e | transport:ws,profile:default,duplicate-row,save,persistence,title,body-content,crdt-meta,nonconvergence,rich-text-html,w |
| `00ff587d9379` | 4 | `00ff587d9379` | 4 | collaboration title desync after save checkpoint and collaborator reload | transport:ws,profile:default,save,reload-rejoin,title,nonconvergence,nested-structure,awareness-discovery,websocket |
| `e86f08576521` | 4 | `6a8ab2e09b56` | 4 | collaboration_checkpoint_block_inserts_lost_while_title_syncs | transport:ws,profile:default,duplicate-row,historical-high-priority,save,reload-rejoin,title,nonconvergence,insert-delet |
| `56b4d8f2257d` | 4 | `56b4d8f2257d` | 4 | collaboration_checkpoint_insert_lost_before_save | transport:ws,profile:default,historical-high-priority,save,reload-rejoin,title,body-content,insert-delete,nested-structu |
| `d9ae42a09907` | 4 | `d9ae42a09907` | 4 | collaboration_checkpoint_reload_restores_stale_prior_title | transport:ws,profile:session-lifecycle,save,reload-rejoin,persistence,title,body-content,nested-structure,websocket |
| `86000062da44` | 4 | `86000062da44` | 4 | collaboration_checkpoint_save_persists_but_core_editor_isSavingPost_never_settles | transport:ws,profile:default,save,reload-rejoin,persistence,title,body-content,stuck-saving,websocket |
| `a168ba286e58` | 4 | `a168ba286e58` | 4 | collaboration_content_loss_after_reload_and_followup_edit | transport:ws,profile:default,save,reload-rejoin,persistence,title,body-content,awareness-discovery,websocket |
| `075b1615ac1b` | 4 | `075b1615ac1b` | 4 | collaboration_convergence_divergence_missing_search_block_after_reload_and_move | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,nonconvergence,block-order-move,insert-delete,r |
| `e1af6d1461bd` | 4 | `062f431fa42f` | 4 | collaboration_crdt_save_lifecycle_timeout_after_reload | transport:ws,profile:default,duplicate-row,save,reload-rejoin,persistence,title,body-content,crdt-meta,stuck-saving,webs |
| `6af33ce2ed51` | 4 | `6af33ce2ed51` | 4 | collaboration_delete_drops_recent_remote_paragraph | transport:ws,profile:default,body-content,nonconvergence,insert-delete,nested-structure,awareness-discovery,websocket |
| `82033634e347` | 4 | `82033634e347` | 4 | collaboration_delete_of_recently_synced_block_not_propagated | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,nonconvergence,insert-delete,rich-text-html,nes |
| `e87fc90859a8` | 4 | `1d3071c4aa50` | 4 | collaboration_empty_content_save_with_nonempty_crdt_and_zero_block_convergence | transport:ws,profile:default,duplicate-row,historical-high-priority,save,reload-rejoin,persistence,title,body-content,cr |
| `de6814f71174` | 4 | `de6814f71174` | 4 | collaboration_http_move_block_top_level_order_divergence_table_pullquote | transport:http,profile:default,save,reload-rejoin,persistence,body-content,nonconvergence,block-order-move,rich-text-htm |
| `3c19bc47d6b9` | 4 | `3c19bc47d6b9` | 4 | collaboration_move_block_into_group_duplicates_moved_heading_after_save_reload | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,block-order-move,rich-text-html,nested-structur |
| `b3c0a9f2c370` | 4 | `b3c0a9f2c370` | 4 | collaboration_move_reconciliation_corrupts_remote_block_identity | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,nonconvergence,block-order-move,rich-text-html, |
| `0f44e4d158a3` | 4 | `0f44e4d158a3` | 4 | collaboration_move_reconciliation_cross_block_type_corruption_after_pullquote_edit | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,block-order-move,rich-text-html,nested-structur |
| `14bf369fe913` | 4 | `14bf369fe913` | 4 | collaboration_non_convergence_due_to_top_level_block_order_divergence | transport:http,profile:default,nonconvergence,stuck-saving,block-order-move,insert-delete,nested-structure |
| `f9e1478bd9b2` | 4 | `f9e1478bd9b2` | 4 | collaboration_non_convergence_saved_search_block_delete_after_reload | transport:ws,profile:default,save,reload-rejoin,nonconvergence,insert-delete,websocket |
| `28a72ac10e63` | 4 | `28a72ac10e63` | 4 | collaboration_nonconvergence_after_reparse_resetblocks_duplicates_code_block | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,nonconvergence,rich-text-html,awareness-discove |
| `d1e4329f90fb` | 4 | `d1e4329f90fb` | 4 | collaboration_persisted_crdt_document_diverges_after_repeated_save_reload | transport:ws,profile:default,save,reload-rejoin,persistence,title,body-content,crdt-meta,nonconvergence,rich-text-html,n |
| `0f727757c114` | 4 | `781d36a12394` | 4 | collaboration_post_reload_concurrent_insert_lost_update | transport:ws,profile:session-lifecycle,duplicate-row,save,reload-rejoin,persistence,body-content,insert-delete,websocket |
| `0c02a1ab8f0e` | 4 | `0c02a1ab8f0e` | 4 | collaboration_reload_checkpoint_autosave_content_store_divergence | transport:ws,profile:session-lifecycle,save,reload-rejoin,persistence,body-content,nonconvergence,websocket |
| `f06174934dd4` | 4 | `0172cd9f2bb6` | 4 | collaboration_reload_hybrid_title_corruption_after_multiple_title_edits | transport:ws,profile:session-lifecycle,duplicate-row,reload-rejoin,title,body-content,block-order-move,nested-structure, |
| `cff45917db50` | 4 | `25f85885e326` | 4 | collaboration_reload_persists_stale_post_title_while_live_rtc_title_converges | transport:ws,profile:session-lifecycle,duplicate-row,reload-rejoin,persistence,title,body-content,crdt-meta,nonconvergen |
| `58b782e101aa` | 4 | `58b782e101aa` | 4 | collaboration_revision_restore_reload_resurrects_newer_blocks | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,rich-text-html,nested-structure,websocket |
| `5acf14696835` | 4 | `5acf14696835` | 4 | collaboration_revision_restore_remote_rollback_not_applied_to_live_peer | transport:http,profile:default,save,reload-rejoin,persistence,body-content,rich-text-html,awareness-discovery |
| `556ecdc36b2e` | 4 | `26611d0dbac1` | 4 | collaboration_save_checkpoint_title_rollback_after_save | transport:ws,profile:session-lifecycle,duplicate-row,save,reload-rejoin,persistence,title,body-content,nested-structure, |
| `892da7fd55d3` | 4 | `892da7fd55d3` | 4 | collaboration_save_race_stale_title_overwrite | transport:ws,profile:default,save,reload-rejoin,persistence,title,body-content,websocket |
| `a044862c2701` | 4 | `a044862c2701` | 4 | collaboration_save_state_stuck_after_reload_and_second_checkpoint_save | transport:ws,profile:default,save,reload-rejoin,persistence,stuck-saving,nested-structure,websocket |
| `a0bace0c91b7` | 4 | `db9a64aa3fb1` | 4 | collaboration_save_state_stuck_after_successful_draft_save | transport:ws,profile:default,duplicate-row,save,reload-rejoin,stuck-saving,websocket |
| `af5e0f7f3fce` | 4 | `af5e0f7f3fce` | 4 | collaboration_save_stuck_isSavingPost_pending | transport:ws,profile:default,save,reload-rejoin,persistence,title,body-content,stuck-saving,rich-text-html,nested-struct |
| `34bf4b7ce6d7` | 4 | `34bf4b7ce6d7` | 4 | collaboration_stale_save_response_overwrites_persisted_state_after_reload | transport:http,profile:default,save,reload-rejoin,persistence,title,body-content,rich-text-html |
| `bf3f130c8505` | 4 | `bf3f130c8505` | 4 | collaboration_state_divergence_missing_group_child_after_reload | transport:ws,profile:default,save,reload-rejoin,persistence,title,body-content,nonconvergence,block-order-move,insert-de |
| `3c4f5e2ad775` | 4 | `3c4f5e2ad775` | 4 | collaboration_title_corruption_after_reload | transport:ws,profile:default,save,reload-rejoin,persistence,title,body-content,rich-text-html,websocket |
| `cc9352f66288` | 4 | `9e0f2b3a4a32` | 4 | collaboration_title_save_race_reverts_to_initial_title | transport:ws,profile:default,duplicate-row,historical-high-priority,save,reload-rejoin,persistence,title,body-content,ne |
| `985d2912229c` | 4 | `985d2912229c` | 4 | collaboration_top_level_block_order_divergence_after_delete_then_append | transport:ws,profile:default,save,reload-rejoin,nonconvergence,block-order-move,insert-delete,awareness-discovery,websoc |
| `47cce74672f0` | 4 | `47cce74672f0` | 4 | collaboration_two_tab_live_move_block_mutates_paragraph_into_group_after_nested_group_insert | transport:ws,profile:session-lifecycle,save,reload-rejoin,body-content,block-order-move,insert-delete,nested-structure,w |
| `81e11bd95b58` | 4 | `22e66c93a42d` | 4 | collaboration_ws_reload_heading_markup_corruption_after_structural_edits | transport:ws,profile:session-lifecycle,duplicate-row,reload-rejoin,persistence,body-content,rich-text-html,nested-struct |
| `f3651c01aa62` | 4 | `f3651c01aa62` | 4 | collaboration_ws_reload_heading_serialization_corruption | transport:ws,profile:session-lifecycle,reload-rejoin,persistence,body-content,rich-text-html,nested-structure,websocket |
| `a5fd385d2868` | 4 | `a5fd385d2868` | 4 | collaboration_ws_reload_reconnect_timeout | transport:ws,profile:session-lifecycle,reload-rejoin,persistence,body-content,rich-text-html,websocket |
| `b78a40d0e13b` | 4 | `55ed03b94732` | 4 | collaboration-delete-nonconvergence | transport:ws,profile:default,duplicate-row,reload-rejoin,persistence,body-content,nonconvergence,insert-delete,rich-text |
| `d06e509df5fa` | 4 | `d06e509df5fa` | 4 | collaboration-non-convergence-on-cross-parent-move-into-group | transport:http,profile:default,save,reload-rejoin,persistence,body-content,nonconvergence,block-order-move,rich-text-htm |
| `5cfba3e8c019` | 4 | `5cfba3e8c019` | 4 | collaboration-save-checkpoint data loss persists empty post.content while CRDT/title advance | transport:ws,profile:default,save,persistence,title,body-content,crdt-meta,insert-delete,websocket |
| `1344866193d7` | 4 | `1344866193d7` | 4 | collaboration-save-stale-title-regression | transport:ws,profile:default,save,reload-rejoin,persistence,title,body-content,nonconvergence,rich-text-html,nested-stru |
| `05240885987d` | 4 | `05240885987d` | 4 | collaboration-state-collapse-saves-empty-post-content | transport:ws,profile:default,save,reload-rejoin,persistence,title,body-content,crdt-meta,nested-structure,websocket |
| `2bd52f2df00c` | 4 | `2bd52f2df00c` | 4 | collaborative newline-sensitive block serialization divergence | transport:ws,profile:default,persistence,body-content,nonconvergence,insert-delete,rich-text-html,nested-structure,webso |
| `22246ab1475e` | 4 | `0967934e4888` | 4 | Collaborative non-convergence after collaborator-local parse/reset canonicalizes pre-existing entity | transport:ws,profile:default,duplicate-row,persistence,body-content,nonconvergence,stuck-saving,rich-text-html,nested-st |
| `adbc8b352c04` | 4 | `adbc8b352c04` | 4 | Collaborative non-convergence where deleting a nested child leaves peers split on `core/buttons.inne | transport:ws,profile:default,save,reload-rejoin,title,body-content,nonconvergence,block-order-move,insert-delete,nested- |
| `a5a87139fc92` | 4 | `a5a87139fc92` | 4 | Collaborative reload-plus-move-block reconciliation drops a newly inserted paragraph checkpoint whil | transport:ws,profile:default,save,reload-rejoin,title,body-content,block-order-move,insert-delete,awareness-discovery,we |
| `72311bfac17c` | 4 | `72311bfac17c` | 4 | Collaborative reload/edit corruption of post content, with paragraph markers merged into a trailing  | transport:ws,profile:real-user-editing,save,reload-rejoin,persistence,title,body-content,nonconvergence,websocket |
| `d3273f68ee65` | 4 | `d3273f68ee65` | 4 | Collaborative revision restore applies the old title but merges newer live CRDT/body content back in | transport:ws,profile:default,save,reload-rejoin,persistence,title,body-content,crdt-meta,rich-text-html,websocket |
| `764569beccd9` | 4 | `764569beccd9` | 4 | Collaborative revision restore preserves and can duplicate newer CRDT-backed block content after res | transport:ws,profile:default,save,persistence,title,body-content,crdt-meta,nonconvergence,block-order-move,rich-text-htm |
| `5c5f942efa88` | 4 | `1313a66ada62` | 4 | Collaborative revision restore preserves newer block content after restoring an older revision, prod | transport:ws,profile:default,duplicate-row,save,persistence,title,body-content,rich-text-html,awareness-discovery,websoc |
| `b48a01bb63b0` | 4 | `b48a01bb63b0` | 4 | Collaborative save/checkpoint intermittently drops paragraph/block content while preserving other ch | transport:ws,profile:default,save,reload-rejoin,persistence,title,body-content,insert-delete,rich-text-html,nested-struc |
| `ae02c7bf87e0` | 4 | `ae02c7bf87e0` | 4 | collaborative_save_loop_keeps_isSavingPost_true | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,stuck-saving,nested-structure,websocket |
| `42cdc08a959b` | 4 | `42cdc08a959b` | 4 | Collaborator REST nonce/auth refresh failure during WS collaboration bootstrap | transport:ws,profile:default,reload-rejoin,persistence,nested-structure,websocket |
| `db46948c4d37` | 4 | `db46948c4d37` | 4 | collaborator_entity_record_keeps_stale_crdt_meta_after_peer_save | transport:ws,profile:default,save,reload-rejoin,persistence,title,body-content,crdt-meta,nonconvergence,stuck-saving,ric |
| `6225e8a46ea1` | 4 | `6225e8a46ea1` | 4 | CRDT top-level block reorder corrupts block identity across collaborators, causing quote-to-heading  | transport:ws,profile:default,persistence,crdt-meta,nonconvergence,block-order-move,rich-text-html,websocket |
| `650f130c341d` | 4 | `650f130c341d` | 4 | crdt_hybrid_block_type_attribute_desync | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,crdt-meta,nonconvergence,rich-text-html,nested- |
| `2f1615fef9d1` | 4 | `2f1615fef9d1` | 4 | crdt_top_level_reorder_reconcile_overwrites_heading_with_duplicate_paragraph | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,crdt-meta,block-order-move,rich-text-html,aware |
| `12d69c064637` | 4 | `12d69c064637` | 4 | cross_parent_move_into_group_nonconvergence_after_reload | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,nonconvergence,block-order-move,rich-text-html, |
| `d465f26f6b79` | 4 | `72391323d472` | 4 | cross_scope_move_keeps_stale_top_level_paragraph_after_move_into_group | transport:ws,profile:default,duplicate-row,save,reload-rejoin,persistence,body-content,block-order-move,insert-delete,ri |
| `309dc7a91593` | 4 | `195b4fecc0d2` | 4 | cross-page raw/canonical content divergence from `core/preformatted` newline vs `<br>` serialization | transport:ws,profile:default,duplicate-row,persistence,body-content,nonconvergence,rich-text-html,nested-structure,aware |
| `2b8be38d97ff` | 4 | `c008989d8c1d` | 4 | cross-page-core-verse-newline-normalization-divergence-after-reload | transport:ws,profile:default,duplicate-row,save,reload-rejoin,persistence,body-content,nonconvergence,rich-text-html,awa |
| `f660d46be744` | 4 | `030e27958e7c` | 4 | deprecated_verse_linebreak_canonicalization_nonconvergence | transport:ws,profile:default,duplicate-row,persistence,body-content,nonconvergence,rich-text-html,nested-structure,aware |
| `4687876b3c05` | 4 | `4687876b3c05` | 4 | Deterministic RTC collaboration move corruption where a top-level move causes cross-block structural | transport:ws,profile:default,save,reload-rejoin,body-content,nonconvergence,block-order-move,insert-delete,rich-text-htm |
| `c2ad0cb9293d` | 4 | `c2ad0cb9293d` | 4 | distinct-user RTC title edit stops syncing after save checkpoint | transport:ws,profile:default,save,reload-rejoin,title,body-content,nonconvergence,websocket |
| `402237348285` | 4 | `402237348285` | 4 | editor_data_store_removeBlocks_null_deref_on_stale_client_id_with_truthy_empty_removal_rules | transport:ws,profile:default,save,reload-rejoin,persistence,body-content,block-order-move,insert-delete,rich-text-html,w |
| `e513c02f22e6` | 4 | `35dcdb7f231a` | 4 | entity_roundtrip_invalidates_blocks_and_breaks_collaboration_convergence | transport:ws,profile:default,duplicate-row,save,reload-rejoin,persistence,title,body-content,block-order-move,rich-text- |
| `db5b24ecab20` | 4 | `2f232274c4f9` | 4 | Equivalent HTML entity spellings in a paragraph invalidate the block after collaborative save+reload | transport:ws,profile:default,duplicate-row,save,reload-rejoin,persistence,body-content,rich-text-html,nested-structure,w |
| `83f499a6e979` | 4 | `dc1c01adf5a1` | 4 | html-entity-reference initial-content invalidation with cross-page normalized block-content divergen | transport:ws,profile:default,duplicate-row,persistence,body-content,nonconvergence,rich-text-html,nested-structure,webso |
| `be0be3fe4f2d` | 4 | `be0be3fe4f2d` | 4 | http_collaboration_delete_propagation_nonconvergence | transport:http,profile:default,save,reload-rejoin,persistence,nonconvergence,insert-delete,nested-structure |
| `7218207e82be` | 4 | `93ce634d0604` | 4 | http_polling_oversized_generated_update_in_secondary_collection_room_poisoning_batched_sync_requests | transport:http,profile:default,duplicate-row,save,reload-rejoin,persistence,body-content,nonconvergence,rich-text-html,n |
| `6789127d994d` | 4 | `6789127d994d` | 4 | http_polling_oversized_non_primary_room_update_blocks_primary_room_convergence | transport:http,profile:default,save,reload-rejoin,persistence,body-content,nonconvergence,rich-text-html,http-oversize |

## Notes For The Next Agent

- This file is a handoff inventory, not a bug-filing document. It deliberately includes duplicates so the next agent can decide the smallest fix set.
- The ledger was generated after the known-fixes branch landed; fixed rows are excluded from this report.
- Some row-local scores are lower than family priority because duplicates are scored independently. Use family priority for ordering and row score for the concrete row.
- Local paths under `/Users/danluu/dev/fuzz/gutenberg` refer to historical artifacts in the dirty checkout; do not mutate that checkout.
