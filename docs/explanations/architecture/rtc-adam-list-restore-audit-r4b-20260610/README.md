# Adam Single-User List Restore Candidate: r4b Validity Audit

Date: 2026-06-10

## Bottom Line

This is not a clean repro of Adam's exact production bug.

The r4b persona loop converged on the same narrower verdict:

- C1 local persistence: valid.
- C2 Adam-like bug class: plausible, but needs more proof.
- C3 self-heal narrative: invalid.
- C4 exact wp.com Atomic production claim: invalid.

The valid claim is narrow: in a local single-user Atomic-like harness, a revision restore can leave a persisted mixed state where the title/restored marker is v1 but the post content/list items are v3. That mixed state survives idle, reload, code editor inspection, REST reads, and later DB reads.

The invalid claim is the stronger self-heal story. The evidence does not show v1 content being correctly restored and later reverting. It shows v3 content already present immediately after the restore write.

## Persona Verdicts

### Validity Skeptic

Overall: `plausible-but-needs-more-proof`

- C1 local persistence: `valid`
- C2 Adam-like bug class: `plausible-but-needs-more-proof`
- C3 self-heal narrative: `invalid`
- C4 exact production claim: `invalid`

Strongest point: visible v1 restore selection and restore notice, followed by an HTTP 200 restore-phase write containing v3 content, REST v1-title/v3-content state, code editor v3 markup after reload, and later DB reads with v1 title and v3 content.

### Product Path

Overall: `plausible-but-needs-more-proof`

- C1 local persistence: `valid`
- C2 Adam-like bug class: `plausible-but-needs-more-proof`
- C3 self-heal narrative: `invalid`
- C4 exact production claim: `invalid`

Strongest user-visible point: the candidate uses the visible revision browser/settings/sidebar path, visible revision slider/iframe selection, visible Restore button, and visible restore notice. After reload, the code editor textarea contains v3 markup while the restored title/marker is v1.

Main product gap: it does not prove Adam's precise cross-list item transposition. It proves versioned list content persistence/mismatch.

### Harness Artifact

Overall: `plausible-but-needs-more-proof`

- C1 local persistence: `valid`
- C2 Adam-like bug class: `plausible-but-needs-more-proof`
- C3 self-heal narrative: `invalid`
- C4 exact production claim: `invalid`

Main artifact risks:

- Revisions are REST-seeded before editor open.
- Shared Playwright config disables global setup/web server.
- Normal setup would reset WS/plugin/posts, so stale state remains a material risk.
- No fresh DB read is possible now because local `wp-env` is not initialized.

These risks scope the claim; they do not erase the local persistence evidence.

## Evidence Summary

The candidate report states one editor page only, no collaborator or same-user second tab, no direct `_crdt_document` mutation, and evidence from UI restore/reload plus REST/code snapshots.

The spec creates v1/v2/v3 list revisions through REST before editor open, then uses the visible revision UI to select a v1 revision while excluding v2/v3 markers. It clicks the visible Restore button and waits for a visible "Restored to revision" notice.

Immediately after restore:

- The v1 revision exists with v1 title/content.
- The UI reports "Restored to revision".
- The restore-phase HTTP 200 write includes v3 content, not v1/v2.
- REST shows v1 title with v3 content/list items.

After 180 seconds idle:

- A stale CRDT/autosave 409/update failure appears.
- REST still shows v1 title with v3 content/list items.

After reload:

- Code editor content is v3 list markup.
- REST still shows v1 title with v3 content/list items.
- The report summary says expected v1 restored items are absent, latest v3 items are present, and `persistedBadState` is `true`.

Later WP-CLI reads:

- After the probe and again about 18 minutes after the final write, DB reads still show v1 title with v3 content markers/items.

## What This Does Not Prove

- It does not prove Adam's exact `adamadam.blog` production incident.
- It does not prove wp.com Atomic production parity.
- It does not prove the exact "items from another list got replaced by the third list" cascade.
- It does not prove a delayed self-heal/revert sequence.
- It does not prove normal visual-canvas post-reload state independently of store diagnostics; the strongest product-visible post-reload evidence is code editor text mode.

## Recommendation

Keep this as a strong local lead for a single-user revision restore/list persistence bug. Do not present it as the final Adam repro without a cleaner follow-up that uses product-created revisions, a hermetic environment/global setup, direct visual-canvas evidence, and a list fixture that reproduces cross-list item transposition rather than only versioned list content persistence.
