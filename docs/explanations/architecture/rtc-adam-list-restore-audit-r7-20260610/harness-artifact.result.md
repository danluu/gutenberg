verdict: invalid

C0/C1/C2/C3/C4 verdicts:
- C0 final Adam repro: invalid
- C1 local persistence lead: valid
- C2 family similarity: plausible-but-needs-more-proof
- C3 delayed self-heal: invalid
- C4 production parity: invalid

artifact risks that only scope C1:
- REST-seeded v1/v2/v3 revisions before editor open.
- One page, no collaborator, no direct CRDT inspection.
- Logger starts after seeding, so it only covers post-seed editor behavior.
- Store diagnostics are internal reads.
- Code editor helper changes mode through `wp.data` and reads the product textarea.
- Shared config disables normal global setup/web server, creating a local harness variant.
- Current wp-env not initialized, so there is no fresh DB confirmation.

artifact blockers that make C0 invalid:
- Missing exact cross-list transposition.
- Missing normal product-created revision history.
- Missing production parity.
- Missing delayed self-heal evidence.
- Missing fresh current DB confirmation.
- No collaborator and no direct CRDT path, so it cannot establish the Adam failure mode as a final repro.
- Artificial REST revision seeding means the candidate cannot prove the bug arises under the claimed natural workflow without new evidence.

final recommendation:
Stop continued audits of this same candidate as a final Adam repro unless new evidence is added. Keep it classified as a valid local persistence lead and possible family-similarity artifact, but not C0.