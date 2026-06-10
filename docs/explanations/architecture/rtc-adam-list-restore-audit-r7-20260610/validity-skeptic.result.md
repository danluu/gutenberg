1. `verdict: invalid`

2. C0/C1/C2/C3/C4 verdicts

- C0 final Adam repro: invalid
- C1 local persistence lead: valid
- C2 family similarity: plausible-but-needs-more-proof; broad-family only
- C3 delayed self-heal: invalid
- C4 production parity: invalid

3. No new r7 evidence changes r6. The embedded evidence still supports a local mixed persisted state, but it does not bridge the exact Adam gaps.

4. Decisive C0 blockers

- No demonstrated cross-list replacement or cascade: Adam described list A replaced by list B, then after revision restore list B replaced by list C. This candidate shows v1 title/restored marker with v3 content, not that cascade.
- Revisions are REST-seeded before editor open, not normally product-created through Adam’s writing/editing workflow.
- No production Atomic parity: this is local wp-env evidence, not wp.com Atomic behavior.
- No delayed self-heal: v3 content is already present immediately after restore; the later idle/reload/DB checks prove persistence, not a delayed revert.
- One editor page only, with no collaborator, same-user second tab, or direct `_crdt_document` evidence, so it does not isolate Adam’s suspected RTC/single-user mechanism.

5. Final recommendation

Retire this as Adam’s specific repro. Keep it as a valuable local lead for a broader revision/list corruption family, because C1 is strong, but do not call C0 valid without a repro that uses normal product-created revisions and shows Adam’s exact cross-list cascade on wp.com Atomic or a demonstrably equivalent environment.