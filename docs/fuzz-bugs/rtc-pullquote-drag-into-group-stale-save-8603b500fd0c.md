# RTC Pullquote Drag Into Group Can Persist a Stale Top-Level Duplicate

Bug signature: `8603b500fd0c`

The original handoff described a collaboration bug where a Pullquote inserted by
one editor and dragged into a Group by another editor could leave a stale
top-level duplicate. The straightforward convergence path is covered by the
stale top-level block reconciliation work in `pr/77876`, but pass 172 found a
remaining persistence race on the current known-fixes stack.

## Practical Trigger

1. Open the post editor with RTC collaboration enabled over the HTTP polling
   transport.
2. Use two browser sessions or users on the same draft.
3. Start with a Heading, a Group containing two Paragraph blocks, and a tail
   Paragraph.
4. One collaborator inserts a top-level Pullquote after the tail Paragraph using
   normal editor UI.
5. The other collaborator drags the Pullquote into the existing Group using the
   block toolbar drag handle.
6. Before the stale collaborator receives the move, the stale collaborator
   clicks Save draft.
7. After convergence, another Save draft and reload can persist both the nested
   Pullquote and the stale top-level Pullquote.

No malformed block markup, direct store mutation, synthetic block trees, or
network fault injection is required. The narrow part is the save timing: the
stale collaborator has to save after the other editor moves the Pullquote but
before the local HTTP polling session has applied that move.

## Evidence

Pass 172 reproduced the surviving bug on the current known-fixes base
`f256024286dd80a4c0e2579f658c109256abf648`, which includes the `pr/77876`
stale top-level reconciliation changes.

The corrected post-convergence persistence check passed:

```bash
RTC_8603_REPRO_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-172/8603-knownfix-persist-results \
WP_ENV_PORT=9990 WP_ENV_PHPMYADMIN_PORT=9992 WP_BASE_URL=http://localhost:9990 \
npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-8603b500fd0c-pass172-persist.spec.ts --reporter=line
```

Result: `2 passed`.

The fast-save variant failed on the same base:

```bash
RTC_8603_REPRO_DIR=/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-172/8603-knownfix-immediate-save-results \
WP_ENV_PORT=9990 WP_ENV_PHPMYADMIN_PORT=9992 WP_BASE_URL=http://localhost:9990 \
npm run test:e2e -- test/e2e/specs/editor/collaboration/triage-8603b500fd0c-pass172-immediate-save.spec.ts --reporter=line
```

The captured final persisted content contained one Pullquote nested in the
Group and a second stale top-level Pullquote after the tail Paragraph:

```html
<!-- wp:group {"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
<!-- wp:pullquote -->
<figure class="wp-block-pullquote"><blockquote><p><em>alpha</em><strong>beta</strong></p><cite>plain <strong>text</strong></cite></blockquote></figure>
<!-- /wp:pullquote --></div>
<!-- /wp:group -->

<!-- wp:paragraph -->
<p>Tail paragraph kept for save and reload stability checks.</p>
<!-- /wp:paragraph -->

<!-- wp:pullquote -->
<figure class="wp-block-pullquote"><blockquote><p><em>alpha</em><strong>beta</strong></p><cite>plain <strong>text</strong></cite></blockquote></figure>
<!-- /wp:pullquote -->
```

## Root-Cause Hypothesis

The stale save writes an older persisted CRDT snapshot whose content still has
the Pullquote as a top-level block. After the live editor CRDT converges to the
correct nested shape, a later save re-applies or otherwise merges that stale
persisted snapshot with the current live document. The save then serializes the
union: the correct nested Pullquote plus the stale top-level Pullquote.

The relevant path is `prePersistPostType` in `packages/core-data/src/entities.js`,
which fetches the latest REST record and calls
`syncManager.applyPersistedCRDTDoc` before serializing the CRDT document for
save. `packages/sync/src/manager.ts` has a guard intended to avoid replaying
persisted snapshots after a provider has already applied remote state:
`hasProviderSyncedRemoteState`. The WebSocket e2e provider sets this metadata
when applying remote state, but the HTTP polling provider does not set it in
trunk. A pass-172 candidate that set the same metadata in the HTTP polling
provider passed the polling-manager unit test but did not yet fix the natural
fast-save Playwright repro, so the persistence path needs a deeper audit before
landing a fix.

## Impact

This is persistent content duplication/corruption, not just a transient UI-only
divergence. It does not look like a save loop, OOM, or performance failure.
Recovery is straightforward before persistence: wait for convergence or reload.
After persistence, recovery requires manually deleting the duplicate block and
saving again.

The likely real-user frequency is medium: the block actions are normal editor
operations, and two collaborative sessions are a supported RTC workflow. The
timing requirement is narrower than ordinary editing because the stale peer must
save before receiving the move.
