# Broader Mitigation Safe-Enforcement Audit

Date: 2026-05-07

This pass audits whether each credited row can be enforced by a
false-positive-safe server rule. It is stricter than the adjudication,
interval, and ablation passes: workers were asked not merely whether the
broader mitigation could help, but whether the server can safely fire using the
evidence available for that row.

Each issue row got one tmux/Codex worker. Workers received the row plus the
expected, adversarial, consensus, mechanism-ladder, probability, boundary,
counterfactual replay, interval, ablation, and adjudication outputs.

## Run

- 279 / 279 rows classified
- one tmux/Codex worker per issue row
- 9 bounded tmux waves including retries for two stuck/403 workers
- 0 missing outputs
- 0 parse errors
- 0 invalid numeric values
- 0 bad safe/aggressive ordering values

Committed artifacts:

- Aggregate:
  [`BROADER_MITIGATION_SAFE_ENFORCEMENT_AGGREGATE.json`](./BROADER_MITIGATION_SAFE_ENFORCEMENT_AGGREGATE.json)

The per-issue worker outputs were generated locally under
`/Users/danluu/tmp/gutenberg-broader-safe-enforcement-analysis/work/outputs`;
the committed aggregate contains the row lists, bucket totals, weighted totals,
and validation status needed to audit the report-level claims.

## Safe-Enforceable Result

Under strict false-positive-safe enforcement, only two rows get nonzero
bug-resolution credit:

- `8`: full safe fix credit;
- `243`: partial safe fix credit.

| Metric | Row-equivalent | Row fraction | Weighted equivalent | Weighted fraction |
| --- | ---: | ---: | ---: | ---: |
| Safe bug-resolution credit | 1.50 / 279 | 0.54% | 7.50 / 452 | 1.66% |
| Safe durable containment credit | 2.00 / 279 | 0.72% | 8.00 / 452 | 1.77% |

Bucket shape under safe enforcement:

| Safe bucket | Rows | Weighted STATUS |
| --- | ---: | ---: |
| Fixed | 1 | 7 |
| Partial | 1 | 1 |
| Speculative-only | 40 | 78 |
| Separate provenance | 1 | 1 |
| No impact | 236 | 365 |

This is not the expected planning estimate. It is a hard, current-evidence
estimate: rows only get credit when the worker found a safe firing rule from
the embedded evidence.

## Why It Drops

The stricter rule blocks many earlier central/partial rows because they depend
on proof that is not in the handoff:

- exact protected-field request and base-token evidence;
- raw DB before/after showing the rejected write would have mutated protected
  fields;
- decoded same-submission CRDT projection proving a contradiction;
- proof that CRDT no-op diffs are non-semantic and settlement clears dirty/save
  state;
- proof that client 409 repair/retry converges peers, reload, dirty/save, and
  local intent.

False-positive risk classification:

| Risk | Rows | Weighted STATUS |
| --- | ---: | ---: |
| Low | 1 | 7 |
| Medium | 4 | 4 |
| High | 41 | 81 |
| Not applicable | 233 | 360 |

Blocked by safe-rule proof requirements:

| Blocked | Rows | Weighted STATUS |
| --- | ---: | ---: |
| Yes | 51 | 97 |
| No | 228 | 355 |

## Safe Rules Identified

| Safe enforcement rule | Rows | Weighted STATUS |
| --- | ---: | ---: |
| Bundle CAS | 3 | 9 |
| Same-submission projection | 25 | 54 |
| Proved CRDT no-op | 3 | 5 |
| HTML/entity canonicalization | 1 | 1 |
| Post-bound provenance | 1 | 1 |
| None | 246 | 382 |

Most projection/no-op rows remain speculative under safe enforcement because
the row evidence does not yet prove the exact same-submission contradiction or
non-semantic CRDT churn needed for a low-false-positive rule.

## Aggressive Upper Comparison

The raw aggressive column asked workers what could be counted if proof gaps
resolved favorably. A few workers over-expanded no-impact title/reload cases,
so the aggregate also includes a prior-bounded aggressive value capped by the
previous interval pass's per-row upper bounds.

| Upper comparison | Row-equivalent | Row fraction | Weighted equivalent | Weighted fraction |
| --- | ---: | ---: | ---: | ---: |
| Prior-bounded aggressive fix | 14.50 / 279 | 5.20% | 24.00 / 452 | 5.31% |
| Prior-bounded aggressive durable | 28.05 / 279 | 10.05% | 61.30 / 452 | 13.56% |

This bounded aggressive comparison is consistent with the earlier
probability/interval range. It should be read as an upper comparison, not as
the expected rate.

## Boundary Check

Earliest wrong transition:

| Earliest wrong transition | Rows | Weighted STATUS |
| --- | ---: | ---: |
| Live CRDT/editor | 203 | 318 |
| Save request construction | 17 | 29 |
| Title autosave/reload | 14 | 23 |
| `/wp-sync` transport/storage | 14 | 35 |
| Post-save read/response settlement | 12 | 17 |
| Table/Y.Array merge | 10 | 11 |
| No save request | 3 | 13 |
| Revision/session policy | 3 | 3 |
| Wrong document/room provenance | 1 | 1 |
| Unknown/other | 2 | 2 |

The main blocker is unchanged: most rows first go wrong before a
protected-field server save boundary can safely fire.

## Reconciled Answer

This pass adds a new lower bound:

- strict safe-enforceable today: 0.54% rows, 1.66% weighted;
- adjudicated central from the previous pass: 3.23% rows, 3.82% weighted;
- interval/ablation central: about 3.5-3.7% rows, 4.0-4.1% weighted;
- prior-bounded aggressive comparison: 5.20% rows, 5.31% weighted.

For planning, I would still use **3-5%** as the expected fix range. The new
safe-enforcement pass says something different and useful: **only about 0.5%
of rows are currently hard-safe to count without additional request/DB/decoded
CRDT/repair proof.**

Durable containment is likewise much lower under hard-safe evidence, but can
rise into the 9-14% range if projection/no-op proof gaps are resolved.
