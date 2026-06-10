1. `verdict: invalid`

2. C0/C1/C2/C3/C4 verdicts  
C0 invalid; C1 valid; C2 plausible-but-needs-more-proof; C3 invalid; C4 invalid.

3. product-path evidence that is real  
C0 does show a real product-visible restore path: one editor page, visible revision UI, visible v1 selection excluding v2/v3, Restore action, restore notice, then persisted wrong code-editor/REST content. The durable v1-title/v3-content state is backed by post-restore REST, reload/code-editor checks, and later DB reads.

4. product-path gaps that are decisive  
The decisive gap is that C0 does not reproduce Adam’s requested user workflow. It REST-seeds revisions before opening the editor instead of creating revisions through normal single-user writing/saving on a personal wp.com Atomic site. It also does not show Adam’s exact cross-list transposition, does not prove wp.com Atomic production parity, lacks direct visual-canvas proof after reload, and does not capture the delayed v1-then-v3 self-heal sequence.

5. final recommendation  
Do not count C0 as Adam’s user-visible repro. Treat it as a strong local/product-path lead for a restore bug, but the valid Adam repro still needs normal product-created revisions on Atomic and the observed cross-list replacement pattern.