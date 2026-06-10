verdict: invalid

2. C0/C1/C2/C3/C4 verdicts

C0 final Adam repro: invalid  
C1 local persistence lead: valid  
C2 family similarity: plausible/valid only at broad-family level  
C3 delayed self-heal: invalid  
C4 production parity: invalid

3. decisive invalidators for C0

- The bad state appears immediately after restore: restore-phase write is HTTP 200 but contains v3 content, not v1/v2. That does not prove Adam’s “restored first list, then later another list got replaced” sequence.
- No proof of delayed self-heal/reversion. The 180s idle period only shows stale CRDT/update/autosave 409 while REST remains v3.
- The setup is synthetic: v1/v2/v3 revisions were REST-seeded before opening the editor.
- Only one local editor page was used, with no collaborator, no same-user second tab, and no direct `_crdt_document` inspection.
- It proves local wp-env behavior, not Adam’s wp.com Atomic production behavior.
- “Plausibly same family” is not enough for the requested final repro of Adam’s specific report.

4. strongest surviving local evidence

The candidate strongly proves a local single-user mixed persisted state: visible revision restore selected v1, the v1 revision payload existed, but the post ended up with v1 title/restored marker and v3 list/content. That state survived REST checks, idle, reload, code editor inspection, and later DB reads.

5. final recommendation

Do not call this the final Adam repro. Keep it as a useful local lead for revision-restore/list-content corruption, then build a stricter repro that shows the correct restored v1 content first and only later mutates/reverts, preferably with direct CRDT evidence and parity against the Atomic/wp.com path Adam used.