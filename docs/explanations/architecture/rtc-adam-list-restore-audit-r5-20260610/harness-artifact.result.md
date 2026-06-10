1. verdict: plausible-but-needs-more-proof

2. C0/C1/C2/C3/C4 verdicts with one-line rationale each

C0: invalid - Strong local mixed-state evidence exists, but REST seeding, disabled setup, no collaborator/direct CRDT, no production parity, and no exact Adam transposition block final Adam-repro status.

C1: valid - Embedded evidence supports persistent local v1 title/v3 content through restore, idle, reload, REST, code editor, and later DB reads.

C2: plausible-but-needs-more-proof - The failure resembles a broader restore/mixed-state family, but the setup is synthetic and lacks the original Adam path.

C3: invalid - Evidence shows persistence, stale CRDT/autosave conflict, and no delayed self-heal sequence.

C4: invalid - All evidence is local wp-env/harness scoped, with explicit no production parity and no exact wp.com confirmation.

3. artifact-risk checklist

- REST-seeded revision history before editor open.
- Logger starts only after seeding.
- Shared config disables normal global setup/web server reset.
- One page, no collaborator, no direct CRDT path.
- Internal `wp.data` diagnostics and code editor mode switching are harness-visible interventions.
- Local wp-env currently not initialized, so no fresh DB read.
- Local wp-env behavior is not wp.com production behavior.
- No exact cross-list transposition.
- No delayed self-heal sequence.

4. robust evidence despite artifacts

- Visible UI restore path, selection, and notice were exercised.
- Restore write returned HTTP 200 and wrote v3 content, not expected v1/v2.
- REST immediately showed mixed v1 title with v3 content.
- Idle/reload retained v3 content in editor/code editor and REST.
- Summary recorded expected v1 absent, latest v3 present, `persistedBadState: true`.
- Later DB reads confirmed v1 title/v3 content after probe and 18 minutes later.

5. material artifact risks that prevent final Adam-repro validity

The candidate is a good local persistence repro, but not a final Adam repro. The revision history was harness-created through REST before editor open, normal setup/reset was disabled, and the observed path lacks Adam-critical evidence: collaborator/direct CRDT involvement, exact cross-list transposition, wp.com production parity, and self-heal timing. These gaps leave the result too harness-scoped to count as Adam’s requested repro.