1. verdict: plausible-but-needs-more-proof

2. C0/C1/C2/C3/C4 verdicts

C0 final Adam repro: invalid as final repro. REST seeding, one-page/no-collaborator scope, disabled normal setup, and missing production parity/cross-list path prevent it from satisfying Adam’s requested repro.

C1 local persistence lead: valid. The embedded evidence supports real local persistence of mixed title/content state.

C2 family similarity: plausible. Same broad failure family may fit, but exact transposition and normal product-created history are missing.

C3 delayed self-heal: unproven. Eighteen-minute persistence argues against quick self-heal, but no delayed recovery was demonstrated.

C4 production parity: unproven. Harness config and REST seeding leave parity unresolved.

3. artifact risks that scope C1 but do not kill it

- Revisions were REST-seeded before editor open.
- Logger started only after seeding.
- Store diagnostics and code-editor reads are harness/internal observations.
- Single page, no collaborator, no direct CRDT reproduction.
- Disabled shared global setup means the environment differs from normal reset/setup flow.
- No fresh current DB read because wp-env is not initialized.

These narrow confidence and generality, but they do not erase the reported persisted mixed state: v1 title with v3 content, HTTP restore using v3 content, reload showing v3 content, REST consistency, and later DB reads.

4. artifact risks that kill C0

- Missing exact cross-list transposition.
- Missing normal product-created revision history.
- Missing production parity.
- Missing delayed self-heal evidence.
- REST-seeded revision history is not Adam’s natural repro path.
- Disabled normal setup/web server weakens the claim that this is the requested end-to-end repro rather than a harness-shaped artifact.

5. final recommendation

Treat this as a strong local persistence lead, not Adam’s final repro. Keep C1, downgrade C0 to invalid, and require a fresh repro using the normal setup/product path with production-parity conditions, current DB confirmation, and evidence for or against delayed self-heal.