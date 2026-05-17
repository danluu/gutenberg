# RTC Jetstream2 All Fuzzer Bugs / Signature Inventory

Snapshot: 2026-05-17T05:40Z

This report uses the fuzzer's raw-signature view, not the maintainer PR view. It
is meant to answer why the fuzzer can report thousands of distinct bugs while
the running PR report lists a much smaller set of product bug families.

Short version: the PR report is counting maintainer-sized product bug families,
while the fuzzer's "thousands of distinct bugs" is counting fuzzer-distinct
failure signatures, observations, seeds, and sometimes source/run variants of
the same underlying behavior. Those are useful for fuzzing and triage, but they
are not one-to-one with reviewable Gutenberg fixes.

## Source Inputs

- Current monitor state:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T053102Z/novelty-state.json`
- Current status summary:
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T053102Z/novelty-status.md`
- Product-family bug report:
  `docs/explanations/architecture/rtc-jetstream2-found-bugs-running-report-20260517.md`
- PR split/status report:
  `docs/explanations/architecture/rtc-jetstream2-fix-pr-status-20260515.md`
- Current critical-path executor status:
  `/media/volume/danluu-fuzz-data/rtc-critical-path-pr-executor-20260517/current-critical-path-status.md`

The canonical counters below come from `triageYieldCombined` in the current
novelty state. A direct scan of `.triage-watcher/state.json` files under the
main fuzz roots found 462 state files, 16,954 signature hashes, and 37,056 raw
observations. That scan is a lower-level artifact inventory, not the policy
counter, because the monitor also merges historical roots, suppresses strict
startup noise, cleans inactive sources, and classifies stale/source-gated
signatures.

## Counting Units

| Counting unit | Current count | Meaning |
| --- | ---: | --- |
| Raw fuzzer signatures | 27,555 | Fuzzer-distinct failure records before the maintainer-facing product-family collapse. |
| Actionable signatures | 9,834 | Raw signatures that survived current non-actionable/noise filters. |
| Raw product-evidence signatures | 12,704 | Raw signatures with some product-evidence signal before final policy filtering. |
| Product-evidence signatures | 9,698 | Product-evidence signatures after policy filtering. |
| Visible likely-real bug families | 70 | Current likely-real entries exposed after triage/family collapse. |
| Likely-real merged duplicates | 1,264 | Duplicate likely-real signatures merged into visible likely-real families. |
| Oracle/noise questions | 16 | Still-open cases where the fuzzer may be right, the oracle may be wrong, or both. |
| Current proposed PR rows | 31 | Maintainer-sized review units in the status report, including active gates/sidecars. |

The important comparison is `27,555` versus `70` versus `31`: those are not
conflicting numbers. They are three different levels of aggregation.

## Triage Policy Buckets

| Bucket | Count | Treatment |
| --- | ---: | --- |
| Raw signatures | 27,555 | Input population for this report. |
| Actionable signatures | 9,834 | Kept for product/diagnostic triage. |
| Non-actionable signatures | 17,721 | Not a maintainer bug unless a reducer later proves product ownership. |
| Known-infra signatures | 524 | Fuzzer/runtime/infrastructure bucket. |
| Bootstrap-stall signatures | 14,397 | Startup/discovery failure bucket, not a content-collaboration product bug. |
| Family-capped signatures | 777 | Duplicates intentionally capped to avoid spending analysis on the same family. |
| Source-suppressed signatures | 100 | Suppressed by source/run policy. |
| Stale-source signatures | 86 | Old run source no longer active enough for current filing decisions. |
| Analysis-gated non-actionable signatures | 1,550 | Held back until analysis produces stronger product evidence. |
| Normalization-noise signatures | 287 | HTML/parser representation noise or oracle mismatch. |
| Normalization-noise candidates | 624 | Suspected normalization/oracle cases still needing exact classification. |
| Bootstrap stalls | 14,433 | Raw bootstrap stall observations. |
| Suppressed strict-startup records | 14,134 | Startup records suppressed before product triage. |
| Suppressed strict-startup identities | 7,081 | Distinct startup identities suppressed by startup-noise policy. |

## Raw Top Semantic Families

These are fuzzer-facing families. The `Raw count` column is how many raw
signatures or observations currently land in that family after monitor
normalization. The `Maintainer disposition` column says how the family maps into
product PRs, diagnostics, or noise.

| Raw family | Raw count | Maintainer disposition |
| --- | ---: | --- |
| `pre_action_bootstrap_stall` | 13,847 | Startup/discovery noise. Kept as a fuzzer health signal, not a product PR. |
| `late_session_awareness_stall` | 4,009 | Mixed awareness/runtime signal. Mostly diagnostic unless paired with content divergence. |
| `unknown` | 2,739 | Classifier/reducer backlog. This is a triage problem, not one product bug. |
| `timeout` | 2,117 | Broad timeout symptom. Requires reducer evidence before product ownership. |
| `collaboration_non_convergence` | 1,683 | Broad symptom that collapses into PR05, PR06, PR07, PR11-PR15, and evidence gates. |
| `assertion` | 809 | Broad assertion bucket. Some are product bugs; many are oracle/assert hygiene. |
| `linebreak_representation_drift` | 513 | Mostly PR05C or strict-oracle downscope. |
| `rest_meta_database_error` | 344 | Infrastructure/REST-meta/database failure unless reproduced as healthy-user data loss. |
| `reload_rejoin_awareness_stall` | 312 | Reload/awareness diagnostic; product only if content authority diverges. |
| `awareness_loss_after_save_reload` | 199 | Reload/awareness diagnostic; product only with durable save/reload divergence. |
| `test_oracle_false_negative_marker_split_by_inline_markup` | 43 | Oracle false-negative bucket. |
| `entity_canonicalization_drift_causes_collaboration_non_convergence` | 34 | PR05A. |
| `rtc_reload_rehydration_race_after_save` | 33 | PR07B/PR07C/reload-hydration evidence. |
| `post_save_stale_persisted_crdt_document_propagation_between_collaborators` | 27 | PR07B and reload/save-response hydration evidence. |
| `rtc_revision_restore_leaves_newer_collaborative_content_in_the_editor_after_restoring_an_older_revision` | 22 | PR03 revision-restore CRDT reset. |
| `post_reload_stale_block_tree_despite_matching_persisted_crdt_document` | 21 | PR07C or reload-record snapshot evidence gate. |
| `revision_restore_mixed_state_after_reload_normalization_duplicate` | 18 | PR03 plus normalization duplicate evidence. |
| `revision_restore_reverts_block_content_to_an_older_checkpoint_but_leaves_the_editor_title_at_a_newer_checkpoint_title` | 17 | Revision/title restore evidence gate; not yet a separate product PR. |
| `ws_test_provider_awareness_recovery_stall` | 16 | WebSocket test-provider/awareness health bucket. |
| `test_oracle_revision_selection_ambiguity` | 15 | Oracle ambiguity around revision selection. |

The raw top duplicate family share is 50.25%. After actionability filtering,
the top duplicate family share is 35.22%. This is still high enough that the
duplicate/noise loop should keep treating duplicate reduction as a live control
problem, but it also shows why raw fuzzer counts should not be read as product
bug counts.

## Actionable Top Semantic Families

| Actionable family | Count | Current handling |
| --- | ---: | --- |
| `late_session_awareness_stall` | 3,464 | Diagnostic/reducer lane; product only with content divergence. |
| `unknown` | 2,093 | Needs classifier/reducer ownership. |
| `timeout` | 1,998 | Needs reducer split between runtime slowness, oracle, and product. |
| `collaboration_non_convergence` | 1,517 | Main product bug source; split into PR05-PR15 families and evidence gates. |
| `assertion` | 746 | Mixed product/oracle bucket. |
| `rtc_fuzz_revision_selector_ambiguously_restores_intermediate_checkpoint` | 1 | Revision oracle ambiguity, near PR03. |
| `fuzz_harness_false_positive_where_ui_toolbar_format_paragraph_splits_the_marker_before_bold_markup_but_waitforeditedcontentmarker_still_requires_the_full_contiguous_marker_in_html` | 1 | Harness/oracle false positive. |
| `save_checkpoint_convergence_compares_unsynced_persisted_crdt_meta_across_pages` | 1 | Save-checkpoint oracle/meta comparison issue. |
| `fuzz_only_exact_rich_text_convergence_false_positive_on_dom_equivalent_entity_normalization_after_local_reparse_of_invalid_blocks` | 1 | Rich-text/parser oracle equivalence issue. |
| `rtc_test_ws_provider_missing_after_reload` | 1 | Test-provider/reload diagnostic. |
| `rtc_fuzz_revision_restore_selector_accepts_intermediate_cumulative_revision` | 1 | Revision selector oracle issue. |
| `test_harness_async_embed_preview_convergence_race` | 1 | Async embed preview harness race. |
| `reload_specific_ws_test_provider_oracle_mismatch_with_http_polling_activity_on_the_collaborator_page` | 1 | Transport/oracle mismatch diagnostic. |
| `final_persistence_oracle_equivalence_gap_for_parser_transform_invalid_content` | 1 | Parser transform oracle gap. |
| `rtc_final_persistence_oracle_false_positive_on_invalid_block_normalization` | 1 | Invalid-block normalization oracle false positive. |
| `harness_typing_surface_misselection_sends_list_indent_keys_into_trailing_button_text_instead_of_a_paragraph_list_caret` | 1 | Harness typing/caret target bug. |
| `rtc_harness_false_convergence_after_async_nested_delete` | 1 | Harness false-convergence issue. |
| `reload_rejoin_awareness_stall` | 1 | Reload awareness diagnostic. |
| `cross_peer_crdt_meta_cache_staleness_assertion` | 1 | Possible CRDT-meta cache staleness assertion; reducer needed. |
| `ws_test_provider_rejoin_awareness_wait_flake` | 1 | WebSocket provider rejoin flake. |

## Product Bug Families Covered By Proposed PRs

These are the maintainer-sized product families, not the raw fuzzer signatures.
The latest PR status report is the source of truth for branch links, diff size,
and filing gates.

| PR family | Product bug covered |
| --- | --- |
| PR01 | HTTP polling generated update payloads can grow without a useful bound. |
| PR02 | HTTP polling storage reads can scan too much historical state. |
| PR02A | Auxiliary HTTP polling rooms can regress primary-room isolation assumptions. |
| PR03 | Revision restore does not reset persisted CRDT document metadata cleanly. |
| PR04 | Persisted CRDT save metadata churns when content is unchanged. |
| PR05A | Persisted entity reference normalization can cause save loops or false divergence. |
| PR05B | Rich-text HTML that is semantically equivalent is treated as a CRDT change. |
| PR05C | Preserve-whitespace and linebreak-equivalent rich text is treated as divergent. |
| PR06 | Save projection can use stale or malformed raw content instead of CRDT block state. |
| PR06A | Empty persisted content can overwrite a non-empty persisted CRDT body. |
| PR06B | Malformed evaluated content can be serialized into outgoing RTC save payloads. |
| PR07A | Save responses can apply stale titles, stale content, stale CRDT block content, or stale base versions. |
| PR07B | Saved CRDT responses can be hydrated through invalidation/base-record paths that preserve stale state. |
| PR07C | Reload record snapshots can be lost or built from the wrong raw fields. |
| PR09 | Store locks can favor newer pending writes over older pending locks. |
| PR10 | Stale CRDT block identity rebasing can attach edits to the wrong block identity. |
| PR11A | Stale-base local suffix appends can be dropped. |
| PR11B | Stale-base top-level deletes can be lost. |
| PR11C | Stale-base middle inserts can land incorrectly or disappear. |
| PR11D | Stale explicit-base top-level moves can reorder incorrectly. |
| PR11E | Delete plus insert-anchor interactions can revive or misplace blocks. |
| PR12 | Previous-local cache handling can lose deletes or reorders. |
| PR13A | Observed top-level deletes lack enough provenance to prevent resurrection. |
| PR13B0/PR13B1/PR13B2/PR13B3 | Cross-parent source and block-identity retirement can smear, duplicate, or revive stale block state. |
| PR14 | Stale table body-array merges can produce wrong table content/order. |
| PR14B | Table query-array local suffix appends can be dropped after PR14. |
| PR15A | Fallback-created top-level group moves can be lost. |
| PR15B | Fallback group insert anchors can point at stale remote state. |
| PR15C | Fallback group deletes can be lost after restacking. |

## Evidence Gates Still Not Product PRs

| Gate | Raw fuzzer signal | Current disposition |
| --- | --- | --- |
| PR17 / seed `1020002` | WebSocket/Yjs marker divergence. | Active final-stack blocker. Latest evidence leans follower-side provider/Yjs application or reclassification, but no filing-ready product/non-product decision yet. |
| Seed `5200005` | Same-user post-reload table-delete residual. | Latest executor classification treats it as PR12 previous-local-cache coverage, not a new PR, if the reducer report is accepted. |
| Seed `1060015` | Invalid-block collaboration/reload residual near parser/normalization behavior. | Needs focused WebSocket/browser evidence before naming PR05D or another product branch. |
| Seed `7510029` | Nested child delete residual after nested edit. | Evidence-only until a UI/source red test proves it is not already covered by PR11/PR13/PR14B/PR15/PR17. |
| Reload-hydration seeds, including `7700005`/`7700055` references in prior reports | Stale reload/table/query-array residuals. | Compare against PR07C, PR14, and PR14B before promoting a separate product PR. |

## Why The Raw Count Is Large

The fuzzer generates a new signature when enough of the failure context differs:
seed, action profile, transport, final action, block mix, oracle path, stack
shape, artifact source, or normalization output. That is correct for fuzzing
because different seeds can uncover new evidence. It is wrong for PR planning
unless the signatures are collapsed by product owner and minimal fix.

Common reasons one product bug expands into many fuzzer-distinct bugs:

- The same root bug fires under `ws` and `http` transports.
- The same divergence appears after different last actions, such as save,
  reload, move, delete, or revision restore.
- One product issue creates multiple symptoms: timeout, assertion, stale
  persisted CRDT meta, content mismatch, and save-checkpoint mismatch.
- Startup or awareness failures create many seed-specific rows before a product
  action occurs.
- Parser/HTML normalization changes the serialized witness without changing the
  underlying editor state.
- Old run directories and inactive sources leave stale signatures that are
  useful as history but should not drive filing.

## Current Interpretation

The current all-fuzzer-bug inventory is therefore:

1. 27,555 raw fuzzer signatures.
2. 9,834 actionable signatures after current filters.
3. 70 visible likely-real families after duplicate merging.
4. About 30 maintainer-sized product fix units, with PR17 and a few sidecars
   still gated on proof, branch-link validation, or focused replay.

The report with proposed PRs should keep using maintainer-sized product bug
families. This report should be used when someone asks where the "thousands" of
fuzzer bugs went: most are duplicate, startup, stale-source, oracle, or symptom
variants, and the remaining product evidence collapses into the proposed PR
families above.

## Update Procedure

Refresh this report from Jetstream with:

```bash
latest=$(
  find /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515 \
    -name novelty-state.json -type f -printf '%T@ %p\n' |
    sort -nr | head -1 | cut -d' ' -f2-
)
node -e 'const fs=require("fs"); const s=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); console.log(JSON.stringify({triageYieldCombined:s.triageYieldCombined, triageYieldHistorical:s.triageYieldHistorical, triageYieldCurrent:s.triageYieldCurrent},null,2));' "$latest"
```

When updating, keep the raw-signature counters separate from the product-family
PR table. Mixing those two counting units is the failure mode this report is
intended to prevent.
