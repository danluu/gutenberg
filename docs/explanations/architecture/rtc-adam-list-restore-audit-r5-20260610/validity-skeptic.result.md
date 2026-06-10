1. `verdict: plausible-but-needs-more-proof`

2. Claim verdicts:
- C0: invalid as stated. Strong local lead, but not proven to match Adam’s specific cross-list second/third list replacement.
- C1: valid. Embedded evidence shows persistent local v1 title/restored marker with v3 content across restore, idle, reload, REST/code editor, and later DB reads.
- C2: valid. It fits the broad single-user list/revision-restore content replacement family.
- C3: invalid. Evidence says v3 content was present immediately after restore; no proven v1-then-later-revert/self-heal sequence.
- C4: invalid. No wp.com Atomic production parity or exact `adamadam.blog` proof.

3. Invalidators for Adam-repro validity:
- Exact cross-list slot transposition not shown: present.
- Production wp.com Atomic parity not shown: present.
- Revisions were REST-seeded before editor open rather than naturally created through Adam’s workflow: present.
- No visual-canvas proof after reload: present.
- No v1 restored first, then later reverted to v3: present.
- Single-page/no-collaborator/no-direct-CRDT does not invalidate Adam if his bug is single-user: not present as an invalidator.

4. Strongest evidence surviving skeptical audit:
The local harness demonstrates a durable revision-restore corruption: v1 revision content existed, restore UI was used, but immediately after restore the editor/REST/write path contained v3 content with v1 title, persisted through idle, reload, code editor, REST, and later DB reads.

5. Material gaps preventing final Adam-repro validity:
The candidate proves a valid local lead and broad bug-family repro, not Adam’s exact requested repro. It does not prove cross-list second/third list replacement, wp.com Atomic production behavior, Adam’s actual site conditions, or the claimed self-heal sequence.