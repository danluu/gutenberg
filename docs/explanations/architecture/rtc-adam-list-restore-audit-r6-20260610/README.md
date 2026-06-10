# Adam Single-User List Restore Candidate: r6 Validity Audit

Date: 2026-06-10

## Bottom Line

This candidate is **invalid as the final requested repro for Adam's specific report**.

It is still a **valid local persistence lead**: the harness demonstrates a durable local mixed state where a visible v1 restore ends with v1 title/restored marker but v3 content/list items, and that state persists through idle, reload, code editor, REST, and later DB reads.

The r6 audit is stricter than r5: it asks whether any remaining interpretation can rescue this as Adam's repro. The answer from all three personas is no.

## r6 Claim Verdicts

### C0: Final Adam Repro

**Invalid.**

The candidate does not reproduce Adam's specific reported shape:

- no exact cross-list second/third list replacement,
- no wp.com Atomic production parity,
- no product-created revision history through normal writing/saving,
- no direct visual-canvas proof after reload,
- no delayed v1-then-v3 self-heal sequence.

### C1: Local Persistence Lead

**Valid.**

The local harness evidence supports a real persisted mixed state:

- v1 revision payload existed,
- visible restore UI selected/restored v1,
- immediate restore write/REST/editor state contained v3 content with v1 title,
- idle/reload preserved the mixed state,
- later DB reads still showed v1 title with v3 markers/items.

### C2: Family Similarity

**Plausible / broad-family only.**

The candidate plausibly belongs to the broader class of single-user revision/list restore corruption, but broad family similarity is not enough for the user's requested Adam repro.

### C3: Delayed Self-Heal

**Invalid.**

The bad v3 state appears immediately after restore. The evidence does not show v1 content restored correctly first and only later reverting/self-healing to v3.

### C4: Production Parity

**Invalid.**

All evidence is local harness evidence. It does not prove Adam's wp.com Atomic production behavior.

## Persona Conclusions

### Validity Skeptic

Overall: `invalid`

Key conclusion:

> Do not call this the final Adam repro. Keep it as a useful local lead for revision-restore/list-content corruption.

Decisive invalidators:

- bad state appears immediately after restore,
- no delayed self-heal/reversion,
- REST-seeded revisions,
- local wp-env rather than wp.com Atomic,
- plausibly same family is not enough for the requested final repro.

### Product Path

Overall: `invalid`

Key conclusion:

> Product-visible restore notice plus wrong code editor content is real evidence, but not sufficient for Adam repro validity.

Real product-path evidence:

- visible revision browser,
- visible v1 selection excluding v2/v3,
- Restore action and restore notice,
- code editor shows wrong v3 content after reload,
- REST/DB corroborate persistence.

Decisive product gaps:

- revisions were REST-seeded before opening the editor,
- no normal single-user writing/saving path,
- no exact cross-list transposition,
- no Atomic production parity,
- no delayed v1-then-v3 sequence.

### Harness Artifact

Overall: `invalid as final Adam repro`; `valid as local persistence lead`.

Key conclusion:

> Treat this as a strong local persistence lead, not Adam's final repro.

Artifact risks that do not kill C1 but kill C0:

- REST-seeded revision history,
- logger starts only after seeding,
- disabled normal global setup/web server reset,
- local wp-env not currently initialized for fresh DB read,
- no production parity,
- no exact cross-list transposition.

## Final Recommendation

Do not spend more time trying to validate this candidate as Adam's final repro. Keep it as evidence for a local restore/list persistence defect, but continue searching for a cleaner repro that:

- uses product-created revisions through normal writing/saving,
- demonstrates the exact cross-list replacement/cascade,
- includes code-view and visual-canvas evidence after reload,
- runs in a hermetic environment,
- establishes Atomic/wp.com parity or uses direct production-side evidence,
- distinguishes immediate wrong restore from delayed self-heal/reversion.
