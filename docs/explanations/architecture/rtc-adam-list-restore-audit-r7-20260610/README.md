# Adam Single-User List Restore Candidate: r7 Validity Audit

Date: 2026-06-10

## Bottom Line

The r7 audit found **no new evidence that changes r6**.

This candidate should be **retired as Adam's specific repro** unless new evidence is added. It remains useful as a local lead for a broader revision/list persistence corruption family.

## r7 Claim Verdicts

### C0: Final Adam Repro

**Invalid.**

The candidate does not demonstrate Adam's exact report:

- no demonstrated cross-list replacement/cascade,
- no normal product-created revision history,
- no wp.com Atomic production parity,
- no delayed v1-then-v3 self-heal,
- no visual-canvas proof after reload,
- no direct evidence tying the mechanism to Adam's suspected RTC/single-user production path.

### C1: Local Persistence Lead

**Valid.**

The local evidence remains strong:

- v1 revision content exists,
- visible restore UI selects v1 and reports success,
- immediately after restore, the post has v1 title/restored marker with v3 content,
- idle/reload/code editor/REST preserve that mixed state,
- later DB reads still show v1 title with v3 content markers/items.

### C2: Family Similarity

**Plausible / needs more proof.**

The candidate is plausibly in the broader family of single-user revision/list restore corruption, but broad-family similarity is not enough for the requested final Adam repro.

### C3: Delayed Self-Heal

**Invalid.**

The bad v3 content is present immediately after restore. The later idle/reload/DB evidence proves persistence, not delayed revert/self-heal.

### C4: Production Parity

**Invalid.**

All evidence is local wp-env/harness evidence. It does not prove behavior on Adam's wp.com Atomic production site.

## Persona Results

### Validity Skeptic

Overall: `invalid`.

Key conclusion:

> Retire this as Adam's specific repro. Keep it as a valuable local lead for a broader revision/list corruption family.

Decisive blockers:

- no cross-list replacement/cascade,
- REST-seeded revisions,
- no production Atomic parity,
- no delayed self-heal,
- one local page with no direct CRDT evidence.

### Product Path

Overall: `plausible-but-needs-more-proof`, with C0 invalid.

Strongest product evidence:

- visible revision restore path,
- visible v1 selection and restore notice,
- wrong code editor content after restore/reload,
- REST/DB corroboration.

Decisive product gaps:

- no normal writing/saving-created revision path,
- no Adam-style cross-list transposition,
- no wp.com Atomic parity,
- no post-reload visual-canvas proof,
- no delayed v1-then-v3 sequence.

### Harness Artifact

Overall: `invalid` for C0, valid for C1.

Key conclusion:

> Stop continued audits of this same candidate as a final Adam repro unless new evidence is added.

Artifact risks that only scope C1:

- REST-seeded revisions,
- logger starts after seeding,
- internal store diagnostics,
- code editor mode switching via `wp.data`,
- disabled normal setup/web server,
- no fresh DB confirmation because wp-env is not initialized.

Artifact blockers for C0:

- missing exact cross-list transposition,
- missing normal product-created revision history,
- missing production parity,
- missing delayed self-heal,
- artificial REST revision seeding.

## Recommendation

Stop spending validation cycles on this candidate as Adam's final repro. Keep it as a local evidence artifact for a narrower restore/list persistence defect. A valid Adam repro still needs a normal writing/saving workflow, exact cross-list replacement/cascade, code view and visual evidence after reload, and Atomic/wp.com parity or direct production-side evidence.
