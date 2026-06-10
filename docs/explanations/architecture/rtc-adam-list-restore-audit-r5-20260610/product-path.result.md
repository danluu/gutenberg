verdict: plausible-but-needs-more-proof

C0: invalid - It does not establish Adam’s exact repro: no Atomic parity, no product-created revisions, no collaborator/CRDT path, and no proven Adam-style cross-list slot transposition.

C1: valid - Local persistence is well supported: after restore, store/REST/write/DB all show v1 title with v3 content, and reload preserves it.

C2: plausible-but-needs-more-proof - It follows a visible revision-restore path and produces user-visible wrong content/code-view state, but the seeded revisions and weaker fixture keep it from proving the same product family.

C3: invalid - The evidence shows persistence after idle/reload, not a self-heal sequence.

C4: invalid - No wp.com Atomic production-site parity evidence is available.

product-path checklist

- Visible user path to revision browser/settings/sidebar: yes.
- Visible selection of v1 revision through revision iframe/slider: yes.
- Visible restore notice: yes.
- Product code editor textarea checked after reload: yes.
- Persistence across reload/REST/DB: yes.
- Revisions created through normal writing/saving: no.
- wp.com Atomic parity: no.
- Collaborator/direct CRDT path: no.
- Visual canvas proof after reload: no direct proof.
- Adam-style cross-list replacement/transposition: not proven.

strongest user-visible evidence

The candidate uses the visible revision browser path, selects v1 while excluding v2/v3, restores it, gets a visible restore notice, then after reload the product code editor textarea contains v3 markup while the restored title is v1. The persisted REST/DB state corroborates v1 title plus v3 content.

material product gaps that prevent final Adam-repro validity

The setup REST-seeds revisions before editor open rather than proving normal product-created revisions. The fixture only shows versioned list content, not Adam’s reported cross-list list-item replacement pattern. There is no direct visual canvas proof after reload, no collaborator/CRDT evidence, and no wp.com Atomic production parity.