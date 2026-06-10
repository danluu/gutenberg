1. `verdict: plausible-but-needs-more-proof`

2. C1/C2/C3/C4 verdicts with one-line rationale each

- C1 local persistence: `valid` - embedded local evidence shows v1 title/restored marker with v3 content in editor state, REST, reload/code editor, and later WP-CLI DB reads.
- C2 Adam-like bug class: `plausible-but-needs-more-proof` - the local symptom matches the broad class of list/revision content replacement, but only in a controlled single-user harness, not Adam production.
- C3 self-heal narrative: `invalid` - evidence shows content was v3 immediately after restore; there is no proof v1 content was correctly restored first and only later reverted.
- C4 exact production claim: `invalid` - no production-site evidence from `adamadam.blog`; local Atomic-like behavior cannot prove Adam’s exact wp.com Atomic bug.

3. invalidators that would kill the repro and whether each is present

- Wrong revision selected: not present. Evidence says visible v1 selection excluded v2/v3.
- v1 revision did not contain v1 content: not present. Report shows v1 revision exists with v1 content.
- Restore action did not actually run: not present. Visible Restore and success notice are recorded.
- Bad state only existed in editor memory: not present. REST, reload/code editor, and WP-CLI DB reads all show persisted v3 content with v1 title.
- External collaborator, second tab, or direct `_crdt_document` mutation caused it: not present in embedded evidence. It was one editor page, no same-user second tab/collaborator, no direct `_crdt_document`.
- Diagnostics contaminated the result: not present as a killer. Store reads and code-editor read could observe state, but persistence is independently shown through REST and DB.
- Logger missed the decisive write: not present as a killer. It captured non-GET post responses, and restore-phase HTTP 200 includes v3 marker.
- Test environment contamination from skipped global setup: possible but not proven. Shared config disables global setup/web server, while normal setup resets state; this weakens isolation unless the spec itself fully reset the needed state.
- Inability to refresh live DB now: present as a gap, not a killer. Later WP-CLI reads already support persistence, but current confirmation is unavailable.

4. strongest surviving evidence

The strongest local evidence is the immediate post-restore mismatch: v1 was visibly selected/restored, but the restore-phase HTTP 200 write contained v3 marker, REST returned v1 title with v3 content/list items, reload/code editor still showed v3 list markup, and later WP-CLI DB reads again showed v1 title with v3 markers/items.

5. remaining material gaps

- No proof Adam’s production incident had the same mechanism.
- No evidence that v1 content ever restored correctly before reverting, so the self-heal story should be dropped.
- Isolation is weakened by disabled global setup unless the embedded spec reset fully covers WS/plugin/posts.
- No live DB refresh now because `wp-env status` says the environment is not initialized.
- The repro supports a single-user local Atomic-like revision/list replacement bug class, not an exact wp.com Atomic production-site claim.