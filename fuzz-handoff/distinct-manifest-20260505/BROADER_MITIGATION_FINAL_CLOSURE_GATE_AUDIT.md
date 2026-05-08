# Broader Mitigation Final Closure-Gate Audit

This pass is a final maintainer-facing closure gate for the broader
server-side stale-CRDT/editor-content-bundle mitigation. Each of the 279
manifest rows was assigned to a separate tmux-backed Codex worker. The worker
received the source mitigation text, the manifest row, the canonical status
excerpt, and prior ledgers for comparison only.

The question for each row was: if the broader plan landed, would the original
filed user-visible issue be closed as fixed? The prompt explicitly separated
that final quoted numerator from expected deployed credit, high-side credit,
and durable containment.

The aggregate has 279 valid JSON outputs and no parse, enum, ordering,
status-count, cap, value, or text validation errors.

## Final Answer

The final closure-gate pass confirms the stricter survival-proof estimate:

| Metric | Row-equivalent | Row % | Weighted-equivalent | Weighted % |
|---|---:|---:|---:|---:|
| Current/proof-gated close credit | 1.50 / 279 | 0.5376% | 1.50 / 452 | 0.3319% |
| CAS/projection only, no no-op/canonicalization | 2.05 / 279 | 0.7348% | 7.45 / 452 | 1.6482% |
| Final quoted fixed credit | 3.05 / 279 | 1.0932% | 8.45 / 452 | 1.8695% |
| Expected deployed fixed credit, not headline | 3.75 / 279 | 1.3441% | 9.55 / 452 | 2.1128% |
| High-side fixed credit, not headline | 6.40 / 279 | 2.2939% | 14.20 / 452 | 3.1416% |
| Durable containment, not fixed-bug credit | 18.00 / 279 | 6.4516% | 37.60 / 452 | 8.3186% |

The number to quote for "what fraction of found bugs would the broader
mitigation plan fix?" is therefore **3.05 / 279 = 1.0932%**, or **8.45 / 452 =
1.8695% STATUS-weighted**.

## Comparison To Prior Passes

This pass exactly matches the survival-proof pass:

| Comparison | Row delta | Weighted delta |
|---|---:|---:|
| Final quoted vs survival-proof | 0.00 | 0.00 |
| Final quoted vs blind-adjudicated/de-novo reconciled ledger | -0.30 | -0.30 |
| Expected deployed vs reconciled ledger | +0.40 | +0.80 |

The final quoted estimate is lower than the blind-adjudicated expected estimate
because it removes tiny credits where the issue would likely remain open under
a maintainer closure standard:

| Row | Delta | Why lowered |
|---:|---:|---|
| 90 | -0.05 | CRDT ping-pong save loop still needs decoded semantic no-op proof plus dirty/isSaving repair. |
| 141 | -0.05 | Reload/live stale persisted-content report remains fileable; narrow bundle credit is expected-side only. |
| 155 | -0.10 | Stale content bundle is guardable, but clean repair, reload state, dirty settlement, and peer convergence remain unwitnessed. |
| 242 | -0.05 | Projection validation may contain bad persistence, but pullquote zero-block/plain-text collapse can still survive. |
| 243 | -0.05 | Stale-title/newer-body PUT is directly guarded, but conflict repair and title-intent settlement are unwitnessed. |

## Rows Counted In The Final Quote

Only five rows retain nonzero final quoted fixed credit:

| Row | Weight | Credit | Weighted | Verdict | Basis | Rationale |
|---:|---:|---:|---:|---|---|---|
| 227 | 1 | 1.00 | 1.00 | close | Safe CRDT no-op settlement | Semantic CRDT-only post-save dirty/Saving loop with unchanged title/content; safe no-op settlement plus coherent repair directly removes it. |
| 8 | 7 | 0.90 | 6.30 | close | Direct guarded bundle | Stale protected title/content/_crdt_document persistence bug; guarded freshness plus atomic commit should reject before wrong title/content becomes durable. |
| 243 | 1 | 0.55 | 0.55 | partial_close | Direct guarded bundle | Stale-title/newer-body second PUT is directly guarded, but terminal editor settlement is unwitnessed. |
| 156 | 1 | 0.45 | 0.45 | partial_close | Direct guarded bundle | Stale title/content while `_crdt_document` advances is directly in scope, with terminal repair discount. |
| 155 | 1 | 0.15 | 0.15 | partial_close | Direct guarded bundle | Mixed stale post_content plus advanced `_crdt_document` is guardable, but repair/reload/dirty/peer settlement is missing. |

These five rows sum to **3.05 row-equivalents** and **8.45
weighted-equivalents**. Row 8 dominates the weighted result because it carries
seven STATUS instances.

## Closure Taxonomy

Final maintainer-facing verdicts:

| Verdict | Rows | Weighted |
|---|---:|---:|
| close | 2 | 8 |
| partial_close | 5 | 7 |
| keep_open | 272 | 437 |

Closure basis:

| Basis | Rows |
|---|---:|
| Outside plan | 247 |
| Containment only | 20 |
| Insufficient evidence | 5 |
| Direct guarded bundle | 4 |
| Projection validation | 2 |
| Safe no-op settlement | 1 |

Dominant survival paths for rows that remain open:

| Survival path | Rows |
|---|---:|
| Live CRDT/editor merge | 161 |
| Peer divergence | 23 |
| Reload/title state | 18 |
| `/wp-sync` transport | 16 |
| Terminal witness missing | 16 |
| Table/Y.Array | 13 |
| Title/autosave | 12 |
| Multiple excluded paths | 9 |

The required extra component taxonomy tells the same story: 189 rows need live
CRDT merge/materialization work, 24 need reload/title-state work, 16 need
`/wp-sync`, 13 need table/Y.Array behavior, and 19 need a terminal witness or
client-repair proof before a small in-scope credit can be promoted.

## Interpretation

This final gate confirms that the broader mitigation fixes only a small slice
of found bugs. It is meaningful for direct stale/split protected
title/content/_crdt_document saves and one safe CRDT no-op save-loop row. Most
found issues still survive because they are live CRDT convergence, peer
divergence, reload/title state, `/wp-sync`, table/Y.Array, serialization,
revision/post-lock, provenance, no-save, or terminal repair problems outside
the scoped broader plan.

Use **1.0932% distinct-row fixed** and **1.8695% STATUS-weighted fixed** as
the final quoted fraction. Treat **1.3441% distinct / 2.1128% weighted** as a
non-headline expected-deployed sensitivity and **6.4516% distinct / 8.3186%
weighted** as durable containment only.
