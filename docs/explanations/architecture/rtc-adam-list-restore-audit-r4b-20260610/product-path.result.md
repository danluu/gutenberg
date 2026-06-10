1. `verdict: plausible-but-needs-more-proof`

2. C1/C2/C3/C4 verdicts with one-line rationale each

C1: valid. Embedded evidence supports a local single-user restore ending in persisted v1 title/restored marker with v3 content across REST, reload, code editor textarea, and later DB reads.

C2: plausible-but-needs-more-proof. It follows a real revision-browser restore path and matches the broad single-user content-replacement family, but does not prove Adam’s exact visible list corruption shape.

C3: invalid. The evidence says content was already v3 immediately after restore; it does not show v1 content correctly restored first and only later reverting.

C4: invalid. No embedded evidence establishes wp.com Atomic production-site parity or Adam’s exact production bug.

3. product-path checklist

- Single page, no collaborator, no direct CRDT path: yes.
- Revisions seeded before editor open, with v1 present: yes.
- User-visible revision browser/settings/sidebar path: yes.
- Visible iframe/slider revision selection targeting v1 while excluding v2/v3: yes.
- Visible restore notice: yes.
- Persistence checked after restore, idle, reload, REST/code editor, and DB reads: yes.
- Product-visible post-reload canvas proof: missing.
- Code editor textarea proof of v3 markup: yes.
- Cross-list slot transposition proof: missing.
- wp.com Atomic production parity: missing.

4. strongest user-visible evidence

The strongest evidence is the visible revision restore flow followed by a restore notice, then post-reload code editor textarea showing v3 markup while the restored title/marker remains from v1. That is a real product path and a user-visible persisted mismatch, not just an internal diagnostic.

5. remaining material product gaps

- No direct visual-canvas proof after reload; list items after reload come from store diagnostics.
- Fixture proves versioned list content, not Adam-style cross-list slot transposition.
- No wp.com Atomic production-site parity evidence.
- No evidence for the self-heal sequence; the bad v3 content appears immediately after restore.