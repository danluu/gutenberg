# Broader Mitigation Final Definition Triangulation Audit

Date: 2026-05-08

This pass re-ran the broader mitigation impact analysis with one Codex-in-tmux
worker per manifest issue.  Each worker saw the issue row plus the prior
maintainer-gate, consensus, required-fixset, adjudicated, counterfactual,
sensitivity, report-trigger, and acceptance-axis outputs, then assigned credits
under six explicit counting definitions.

The key question is "what fraction of found bugs would the broader mitigation
fix?".  My recommended answer is the **final-report user-visible closure**
definition:

> **3.90 row-equivalent bugs out of 279, or 1.40% of distinct found bugs.**
>
> Weighted by `statusCount`, **10.55 out of 452, or 2.33% of found statuses.**

That is the best single-number claim for "fixed by the broader mitigation" in a
report.  The expected-probability view is slightly higher, but includes cases
where the same report might not be filed even though the current evidence is not
strong enough for a maintainer-facing fix claim.  The durable-containment view is
higher still, but it is not a fixed-bug metric because many of those reports
would remain user-visible through reload, convergence, title, table, sync, or
save-state failures.

## Run Shape And Validation

- Manifest denominator: 279 issue rows.
- Weighted denominator: 452 total `statusCount`.
- Worker shape: 279 tmux windows in session `broader-mitigation-final-definition-01`.
- Completion: 279 worker logs with `EXIT_CODE=0`.
- Outputs: 279 per-issue JSON classifications in `work/outputs/`.
- Aggregate validation: 279 classified rows, no missing rows, no extra rows, no parse errors, no enum errors, no numeric step errors, no ordering errors, no missing required text.
- Active tmux state after completion: no `broader-mitigation-final-definition` sessions remained.

The aggregate artifact is:

- `work/final_definition_triangulation_aggregate.json`

## Headline Fractions

All row counts below are partial-credit row equivalents.  Weighted counts multiply
each issue credit by `statusCount`.

| Definition | Row equiv. | Row % | Weighted equiv. | Weighted % | Use |
|---|---:|---:|---:|---:|---|
| Close now | 1.50 / 279 | 0.5376% | 7.50 / 452 | 1.6593% | Only what current evidence could close immediately. |
| Maintainer claim | 3.20 / 279 | 1.1470% | 9.55 / 452 | 2.1128% | Strict maintainer-facing partial claim. |
| Final report | 3.90 / 279 | 1.3978% | 10.55 / 452 | 2.3341% | Recommended "fraction fixed" number. |
| Expected | 5.00 / 279 | 1.7921% | 11.80 / 452 | 2.6106% | Probability mass that the original report would not be filed. |
| Optimistic ceiling | 14.65 / 279 | 5.2509% | 24.90 / 452 | 5.5088% | Proof-gated in-scope upper bound, not a claim. |
| Durable containment | 11.80 / 279 | 4.2294% | 29.25 / 452 | 6.4712% | Protected-field durability improvement, not bug closure. |

The final-report number is only 0.05 row-equivalent lower than the prior
consensus recommended point estimate and is much stricter than the earlier
required-fixset/counterfactual best case.

## Counting Interpretation

Use these numbers for different audiences:

- **Immediate closeable fixed bugs:** 0.54% distinct / 1.66% weighted.
- **Conservative maintainer-facing partial claim:** 1.15% distinct / 2.11% weighted.
- **Recommended report answer:** 1.40% distinct / 2.33% weighted.
- **Expected report-prevention mass:** 1.79% distinct / 2.61% weighted.
- **Optimistic in-scope ceiling:** 5.25% distinct / 5.51% weighted.

I would not phrase the broader mitigation as fixing more than about **1.4% of
distinct found bugs** unless the text clearly says it is using expected
probability mass rather than current proof.  I would not use the 4.23% durable
number as a fixed-bug fraction.

## Bucket Distributions

| Bucket | Rows | Weighted |
|---|---:|---:|
| Closeable | 1 | 7 |
| Claimable partial | 6 | 9 |
| Expected only | 14 | 16 |
| Durable only | 15 | 39 |
| Excluded not fixed | 170 | 259 |
| Not on path | 73 | 122 |

Policy buckets:

| Final policy | Rows | Weighted |
|---|---:|---:|
| Use close-now | 1 | 7 |
| Use maintainer-claim | 2 | 2 |
| Use final-report | 8 | 9 |
| Use expected | 9 | 14 |
| Durable only | 12 | 33 |
| Use zero | 247 | 387 |

Claim status:

| Claim status | Rows | Weighted |
|---|---:|---:|
| Safe to claim fixed | 1 | 7 |
| Safe to claim partial | 13 | 16 |
| Durable improvement only | 15 | 39 |
| Do not claim fixed | 250 | 390 |

Expected status:

| Expected status | Rows | Weighted |
|---|---:|---:|
| Expected fixed | 1 | 7 |
| Expected partial | 23 | 30 |
| Expected zero | 255 | 415 |

## Why Most Bugs Are Not Fixed

The dominant blockers are outside the broader mitigation.  The broader plan
covers protected-field bundle CAS, atomic protected-field commit, read/write-set
discipline, coherent save response, client conflict refetch/repair/retry,
conservative same-submission CRDT projection validation, safe CRDT no-op
settlement, and narrow HTML/entity canonicalization.  It excludes the main
failure classes below.

| Primary blocker | Rows | Weighted |
|---|---:|---:|
| Live CRDT materialization/convergence fix | 200 | 314 |
| Reload/peer/title terminal proof or title path | 22 | 43 |
| `/wp-sync` transport/storage/history fix | 14 | 35 |
| Table / Y.Array merge fix | 11 | 12 |
| Multiple blockers | 11 | 16 |
| Same-submission CRDT replay proof | 9 | 12 |
| Policy/no-save/revision/session path | 5 | 5 |
| Terminal acceptance axes | 3 | 5 |
| Raw save-to-DB replay proof | 2 | 2 |
| Provenance fix | 1 | 1 |
| None | 1 | 7 |

The surviving visible failures tell the same story:

| Remaining visible failure | Rows | Weighted |
|---|---:|---:|
| Peer nonconvergence | 145 | 212 |
| Live divergence | 40 | 62 |
| Wrong title | 23 | 44 |
| Reload corruption | 22 | 36 |
| Lost intent | 17 | 31 |
| Transport failure | 12 | 32 |
| Stuck saving | 9 | 15 |
| Bad persisted content | 5 | 7 |
| Unsupported/malformed blocks | 2 | 3 |
| Acceptable conflict retry | 1 | 1 |
| Provenance mixup | 1 | 1 |
| Other | 1 | 1 |
| None | 1 | 7 |

Only 37 rows had an in-scope mechanism assigned at all:

| Included mechanism | Rows | Weighted |
|---|---:|---:|
| Projection validation | 26 | 52 |
| Bundle CAS | 5 | 11 |
| Safe no-op HTML/CRDT settlement | 5 | 8 |
| Client repair response | 1 | 1 |
| None | 242 | 380 |

Overclaim risk is concentrated in the small nonzero/near-nonzero set:

| Overclaim risk | Rows | Weighted |
|---|---:|---:|
| High | 70 | 139 |
| Medium | 2 | 2 |
| Low | 1 | 7 |
| None | 206 | 304 |

## Nonzero Final-Report Rows

These are the 20 rows with `final_report_credit >= 0.05`.

| Index | `statusCount` | Bug type | Final | Expected | Ceiling | Durable | Mechanism | Blocker | Remaining failure |
|---:|---:|---|---:|---:|---:|---:|---|---|---|
| 8 | 7 | `rtc_collab_save_stale_title_content_after_real_edits` | 1.00 | 1.00 | 1.00 | 1.00 | Bundle CAS | None | None |
| 243 | 1 | `rtc_save_stale_title_newer_body_double_put` | 0.60 | 0.70 | 0.90 | 1.00 | Bundle CAS | Terminal axes | Stuck saving |
| 156 | 1 | `rtc_ws_save_reverts_post_title_and_content_to_stale_snapshot_while_crdt_document_advances` | 0.50 | 0.55 | 1.00 | 0.70 | Bundle CAS | Raw save/DB replay | Acceptable conflict retry |
| 155 | 1 | `rtc_ws_save_persists_stale_post_content_with_advanced_crdt_document` | 0.45 | 0.45 | 1.00 | 0.50 | Projection validation | Multiple | Peer nonconvergence |
| 45 | 2 | `rtc-entity-normalization-save-loop` | 0.25 | 0.35 | 1.00 | 0.50 | Safe no-op HTML | Multiple | Stuck saving |
| 196 | 2 | `rtc-empty-content-save-with-nonempty-blocks` | 0.20 | 0.20 | 0.50 | 0.40 | Projection validation | Multiple | Reload corruption |
| 211 | 1 | `rtc_concurrent_paragraph_save_reload_corruption_empty_block_list` | 0.10 | 0.10 | 0.50 | 0.30 | Projection validation | Same-submission CRDT replay | Reload corruption |
| 63 | 1 | `rtc_checkpoint_save_stale_full_record_clobbers_fields` | 0.10 | 0.20 | 0.50 | 0.50 | Projection validation | Multiple | Peer nonconvergence |
| 62 | 1 | `rtc_checkpoint_save_reload_persisted_markup_corruption` | 0.10 | 0.15 | 0.50 | 0.50 | Projection validation | Same-submission CRDT replay | Reload corruption |
| 61 | 1 | `rtc_checkpoint_save_reload_partial_serialized_body_behind_visible_block_tree` | 0.10 | 0.20 | 0.50 | 0.25 | Projection validation | Same-submission CRDT replay | Bad persisted content |
| 23 | 3 | `rtc_ws_crdt_state_churn_save_loop_after_collaborator_save` | 0.05 | 0.05 | 0.50 | 0.00 | Safe no-op HTML | Same-submission CRDT replay | Stuck saving |
| 18 | 3 | `rtc_save_path_persists_empty_content_while_title_and_crdt_survive` | 0.05 | 0.05 | 0.50 | 0.25 | Projection validation | Multiple | Bad persisted content |
| 242 | 1 | `rtc_save_serialization_collapses_to_plain_text_then_empty_after_pullquote_edit` | 0.05 | 0.10 | 0.50 | 0.00 | Projection validation | Same-submission CRDT replay | Reload corruption |
| 212 | 1 | `rtc_corrupts_serialized_block_markup_then_save_loops` | 0.05 | 0.05 | 0.25 | 0.00 | Projection validation | Multiple | Stuck saving |
| 199 | 1 | `editor_html_entity_canonicalization_invalidates_blocks` | 0.05 | 0.10 | 0.50 | 0.00 | Safe no-op HTML | Terminal axes | Unsupported/malformed blocks |
| 141 | 1 | `rtc_ws_collaborator_reload_stale_persisted_content_and_crdt` | 0.05 | 0.10 | 0.50 | 0.50 | Bundle CAS | Multiple | Bad persisted content |
| 99 | 1 | `rtc_save_response_clears_crdt_document_while_title_and_content_survive` | 0.05 | 0.10 | 1.00 | 0.05 | Client repair response | Multiple | Stuck saving |
| 90 | 1 | `rtc_persisted_crdt_doc_ping_pong_save_loop` | 0.05 | 0.05 | 0.25 | 0.00 | Safe no-op HTML | Same-submission CRDT replay | Stuck saving |
| 64 | 1 | `rtc_checkpoint_second_save_content_collapse_after_reload` | 0.05 | 0.05 | 0.25 | 0.00 | Projection validation | Multiple | Reload corruption |
| 60 | 1 | `rtc_checkpoint_save_oscillates_between_corrupted_title_and_empty_content_after_reload` | 0.05 | 0.05 | 0.50 | 0.45 | Projection validation | Multiple | Reload corruption |

Weighted contribution is dominated by issue 8 because it has `statusCount=7`
and receives full credit.  Without issue 8, the recommended final-report impact
falls from 10.55 weighted-equivalent statuses to 3.55.

## Reconciliation With Prior Passes

The final-report definition lands close to the consensus recommended point and
below the required-fixset/counterfactual best-case point:

| Prior comparison | Prior rows | Prior weighted | Final-report delta rows | Final-report delta weighted | Expected delta rows | Expected delta weighted |
|---|---:|---:|---:|---:|---:|---:|
| Maintainer recommended | 3.65 | 10.30 | +0.25 | +0.25 | +1.35 | +1.50 |
| Consensus recommended | 3.95 | 10.60 | -0.05 | -0.05 | +1.05 | +1.20 |
| Adjudicated best | 4.45 | 11.20 | -0.55 | -0.65 | +0.55 | +0.60 |
| Required best-fix | 4.85 | 11.60 | -0.95 | -1.05 | +0.15 | +0.20 |
| Counterfactual best-fix | 4.85 | 11.60 | -0.95 | -1.05 | +0.15 | +0.20 |
| Maintainer expected | 5.00 | 11.80 | -1.10 | -1.25 | 0.00 | 0.00 |
| Consensus expected | 5.00 | 11.80 | -1.10 | -1.25 | 0.00 | 0.00 |

The expected definition exactly reconciles with the prior expected passes:
5.00 row-equivalent and 11.80 weighted-equivalent.  The final-report definition
is lower because it avoids counting proof-gated expected-only rows as present
fix claims.

## Final Recommendation

Use this wording:

> The broader mitigation would fix about **1.4% of distinct found bugs** in this
> corpus, or **2.3% when weighted by duplicate/status count**.  If counted as
> expected report-prevention probability rather than proof-backed fix credit,
> the estimate rises to **1.8% distinct / 2.6% weighted**.  The optimistic
> in-scope ceiling is **5.3% distinct / 5.5% weighted**, but that requires
> proof-gated assumptions and should not be presented as fixed bugs.  Durable
> protected-field containment is **4.2% distinct / 6.5% weighted**, but many of
> those reports remain visibly broken and should be tracked separately.

The broader mitigation is useful for a narrow stale protected-field/save-boundary
family, especially issue 8 and a handful of stale-bundle or projection-validation
partials.  It does not materially reduce the broader found-bug corpus because
most bugs require excluded work: live CRDT convergence/materialization,
`/wp-sync`, table/Y.Array handling, title/reload/autosave/session policy,
provenance, or terminal dirty/reload/peer proof.
