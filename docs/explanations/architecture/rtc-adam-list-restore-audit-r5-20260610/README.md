# Adam Single-User List Restore Candidate: r5 Validity Audit

Date: 2026-06-10

## Bottom Line

This candidate is **not valid as the requested final repro for Adam's specific bug**.

It remains a valid local lead for a narrower single-user restore/list persistence bug:

- A v1 revision exists.
- The visible revision UI selects/restores v1.
- The restore reports success.
- The resulting persisted state is v1 title/restored marker with v3 content/list items.
- That mixed state survives idle, reload, code editor inspection, REST reads, and later DB reads.

However, Adam's report described a production wp.com Atomic site and a specific cross-list replacement/cascade. This candidate does not prove that exact shape.

## r5 Claim Verdicts

### C0: Final Adam Repro

**Invalid.**

All three r5 personas agree this is too scoped/synthetic to count as the requested repro for Adam's specific reported bug.

Reasons:

- It does not reproduce the exact cross-list second/third list replacement pattern Adam described.
- It does not establish wp.com Atomic production parity.
- It uses REST-seeded revisions before editor open.
- It lacks direct post-reload visual-canvas proof.
- It does not prove the delayed self-heal/revert sequence.

### C1: Local Persistence

**Valid.**

The local evidence supports a durable mixed state: v1 title/restored marker with v3 content across restore, idle, reload, REST/code editor, and later DB reads.

### C2: Broad Adam-Like Bug Family

**Plausible / needs more proof.**

The candidate follows a visible revision restore path and produces wrong list content visible in code view, which is in the same broad family. But the exact product/user shape is not proven.

### C3: Self-Heal Narrative

**Invalid.**

The bad v3 content is already present immediately after restore, including in the restore-phase HTTP 200 write. There is no evidence that v1 content was correctly restored first and only later reverted.

### C4: Exact wp.com Atomic Production Behavior

**Invalid.**

All evidence is local harness evidence. It does not prove Adam's exact production site behavior on `adamadam.blog`.

## Persona Summaries

### Validity Skeptic

Overall: `plausible-but-needs-more-proof`

Key judgment:

> Strong local lead, but not proven to match Adam's specific cross-list second/third list replacement.

Strongest surviving evidence:

- v1 revision content existed.
- Restore UI was used.
- Immediately after restore, editor/REST/write path contained v3 content with v1 title.
- The state persisted through idle, reload, code editor, REST, and later DB reads.

### Product Path

Overall: `plausible-but-needs-more-proof`

Key judgment:

> It follows a visible revision-restore path and produces user-visible wrong content/code-view state, but seeded revisions and the weaker fixture keep it from proving the same product family.

Strongest user-visible evidence:

- Visible revision browser path.
- Visible v1 revision selection excluding v2/v3.
- Visible restore notice.
- Post-reload code editor textarea contains v3 markup while restored title is v1.

### Harness Artifact

Overall: `plausible-but-needs-more-proof`

Key judgment:

> Good local persistence repro, but not a final Adam repro.

Main artifact risks:

- REST-seeded revision history before editor open.
- Logger starts only after seeding.
- Shared config disables normal global setup/web server reset.
- Local wp-env is not initialized now, so no fresh DB read was possible.
- No exact cross-list transposition.
- No delayed self-heal sequence.

## What Would Be Needed For a Valid Adam Repro

A stronger repro should demonstrate:

- Product-created revisions through normal writing/saving, not REST-seeded revisions.
- A clean/hermetic environment with normal setup/reset accounted for.
- The exact cross-list item replacement/cascade Adam described.
- Code view and preferably visual-canvas evidence after reload.
- No second tab/collaborator unless deliberately testing that hypothesis.
- Durable persisted state with fresh DB/REST confirmation.
- Clear production-parity argument for wp.com Atomic, or direct production-side evidence if available.

## Published r4b Baseline

Previous r4b report:

https://github.com/danluu/gutenberg/blob/493ab1dfce88ef0046ac8e574265497f8d9fef7c/docs/explanations/architecture/rtc-adam-list-restore-audit-r4b-20260610/README.md
