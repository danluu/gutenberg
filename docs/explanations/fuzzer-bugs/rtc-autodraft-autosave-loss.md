# RTC auto-draft first-autosave content loss

## Summary

When real-time collaboration (RTC) is enabled, a brand-new post opened via `post-new.php` starts as an `auto-draft`. If the user types a title and body and then the first server autosave runs, the parent post remains an `auto-draft` with title `Auto Draft` and empty content. The user's edits are stored only in an autosave revision.

That is a content-loss bug for normal users because `auto-draft` posts are hidden from the normal Drafts and Revisions recovery flows. A user who closes the editor or loses the URL has no ordinary UI path to rediscover the work, even though an autosave revision exists in the database.

The bug is user-triggerable with normal actions:

1. Enable RTC.
2. Open Add New Post.
3. Type title and content.
4. Wait for the editor's automatic server autosave.

No network fault, request stubbing, synthetic browser state, or direct database mutation is required.

## How the bug was introduced

The relevant code is `Gutenberg_REST_Autosaves_Controller::create_item()` in [`lib/compat/wordpress-7.0/class-gutenberg-rest-autosaves-controller.php`](../../../lib/compat/wordpress-7.0/class-gutenberg-rest-autosaves-controller.php). It computes:

```php
$is_draft = 'draft' === $post->post_status || 'auto-draft' === $post->post_status;
```

Then it only uses the parent-updating `wp_update_post()` path when RTC is disabled:

```php
if ( $is_draft && (int) $post->post_author === $user_id && ! $post_lock && ! $is_collaboration_enabled ) {
	$autosave_id = wp_update_post( wp_slash( (array) $prepared_post ), true );
} else {
	$autosave_id = $this->create_post_autosave( (array) $prepared_post, (array) $request->get_param( 'meta' ) );
}
```

This behavior was introduced by [WordPress/gutenberg#75105](https://github.com/WordPress/gutenberg/pull/75105), commit [`9df142b8393`](https://github.com/WordPress/gutenberg/commit/9df142b839320316b406ee1a02e23704d42f8719), "Real-time collaboration: Always target autosave revision." The PR fixed a real RTC bug: for existing draft posts, the original author could autosave directly into the saved post while other collaborators wrote autosave revisions. That made the saved post diverge from the persisted CRDT document and could duplicate content on reload.

The regression is that #75105 collapsed two different states into one `$is_draft` branch:

- `draft`: a visible, discoverable post. RTC should usually avoid direct parent writes on autosave to prevent the CRDT divergence fixed by #75105.
- `auto-draft`: a hidden placeholder. The first autosave has historically promoted it to a visible `draft`; otherwise the user has no normal recovery path.

Follow-up PRs preserved or moved the same behavior rather than introducing the loss independently:

- [WordPress/gutenberg#75366](https://github.com/WordPress/gutenberg/pull/75366), commit [`69699955ed0`](https://github.com/WordPress/gutenberg/commit/69699955ed0c4e667e24041a36cd54b650f0dbfe), moved the RTC PHP code from experimental sync code to `lib/compat/wordpress-7.0/`.
- [WordPress/gutenberg#75837](https://github.com/WordPress/gutenberg/pull/75837), commit [`056d9335b5b`](https://github.com/WordPress/gutenberg/commit/056d9335b5ba6745b37f866a0438c7e9ec926f9e), renamed the RTC option.
- [WordPress/gutenberg#76643](https://github.com/WordPress/gutenberg/pull/76643), commit [`9afdce8c0cc`](https://github.com/WordPress/gutenberg/commit/9afdce8c0cca3d6ab1527452ed145ac4e1797964), renamed the option again to `wp_collaboration_enabled`.
- [WordPress/gutenberg#76716](https://github.com/WordPress/gutenberg/pull/76716), commit [`4f4a7b18306`](https://github.com/WordPress/gutenberg/commit/4f4a7b183063af63646edfb7f5e6168d74395804), added the `WP_ALLOW_COLLABORATION` backport gate. This is not causal but affects whether the buggy path is reachable.

The older core behavior, also described in [WordPress/gutenberg#75751](https://github.com/WordPress/gutenberg/pull/75751), was that an autosave by the author for a `draft` or `auto-draft` could update the parent post directly. That behavior was unsafe for RTC on existing drafts, but it was also the mechanism that made a new `auto-draft` discoverable.

## Why this is distinct from similar bugs

This is not the same as the duplication bug fixed by [#75105](https://github.com/WordPress/gutenberg/pull/75105). That bug made the saved post too far ahead of the persisted CRDT document, so reloads could duplicate content. This bug leaves the saved parent too far behind: the autosaved content exists only in an autosave revision whose parent is still hidden.

This is not the local autosave refresh bug fixed by [#23928](https://github.com/WordPress/gutenberg/pull/23928). That older bug was about sessionStorage keys for unsaved auto-draft recovery after refresh. This one occurs after a successful server autosave and persists in the database.

This is not the draft/auto-draft dirty-state bug fixed by [#76624](https://github.com/WordPress/gutenberg/pull/76624). That bug was about editor dirty-state cleanup after autosaving. Here the parent database row remains `auto-draft`, so the post is not discoverable as a draft.

This is related to, but distinct from, the RTC test expectation updates in [#75751](https://github.com/WordPress/gutenberg/pull/75751) and [#75733](https://github.com/WordPress/gutenberg/pull/75733). Those PRs recognized that RTC changed autosave behavior, and #75751 explicitly mentions avoiding CRDT persistence for auto-drafts. They did not assert the user-facing invariant that the first server autosave of a new post must leave a recoverable draft.

This is not primarily a multi-user race. A single browser session can trigger it. Multi-user RTC can make consequences worse, but is not required.

This is not the broader `persistCRDTDoc` full-record write issue in [#77049](https://github.com/WordPress/gutenberg/issues/77049). That issue is about invalid REST payloads when persisting `_crdt_document`; this issue is about the autosave controller choosing an autosave revision instead of promoting an auto-draft parent.

## Initial fix plan

1. Add regression coverage before changing behavior:
   - A PHP REST-controller test: RTC disabled first autosave of an auto-draft promotes the parent; RTC enabled must do the same.
   - A Playwright test that uses the editor autosave action to isolate the editor-to-REST path.
   - A full Playwright browser test that opens `post-new.php`, types title/content, waits for the real automatic autosave request, and verifies the post is a visible `draft` with the typed content.
2. Split `draft` from `auto-draft` in `Gutenberg_REST_Autosaves_Controller::create_item()`.
3. Preserve #75105 behavior for existing `draft` posts under RTC: autosaves should continue to target autosave revisions, not the parent post.
4. For `auto-draft` under RTC, promote the parent to `draft` on first autosave so the post becomes discoverable.
5. Add a no-regression RTC reload test that exercises the #75105 scenario: existing draft, unsaved edit, autosave, collaborator or reload joins, no duplicated title/content.

## Audit of the initial plan

These are perspective audits, not statements by the named people.

### Linus Torvalds lens

The plan has the right instinct but is too hand-wavy around state transitions. The bug exists because the code used a sloppy boolean, `$is_draft`, for two states with different invariants. The fix should encode the state machine explicitly:

- `auto-draft` first autosave is a promotion transition.
- existing `draft` autosave is a revision transition under RTC.
- published or pending posts remain revision transitions.

Avoid spreading special cases into unrelated client code unless server-side behavior forces it. The server owns post status and discoverability, so the controller should make the post-state decision.

### Kyle Kingsbury / Jepsen lens

The plan needs an invariant, not just examples. The invariant is: after any successful server autosave response for user-authored new-post content, either the content is reachable through a normal user recovery path or the response must not be considered a successful durability signal.

Tests should check externally visible state, not only response codes:

- parent status and content;
- draft-list discoverability;
- autosave revision presence;
- reload and collaborator join behavior;
- absence of duplicated content after reload.

The plan should also test concurrency around the promotion boundary: two tabs or peers editing the same auto-draft should not create two visible drafts, orphan autosaves, or divergent CRDT rooms.

### Dan Luu lens

The plan should account for why this escaped. Existing tests were close to the bug but asserted implementation details or changed expectations after RTC became default. They did not encode the user-support invariant: if a user waits for "Saved" or autosave has completed, their new draft must be findable later.

The fix should include a targeted product-level regression test, not just a unit test. It should also document the support implication: "content exists in an autosave revision" is not an acceptable recovery story if the parent remains a hidden auto-draft and the user does not have the edit URL.

## Updated fix plan

1. Add the PHP and Playwright repro tests described above and keep the full automatic-autosave browser repro in the suite. The browser test is the user contract.
2. Change the controller from a single `$is_draft` branch to explicit state checks:
   - `$is_auto_draft = 'auto-draft' === $post->post_status;`
   - `$is_draft = 'draft' === $post->post_status;`
3. In `create_item()`, allow the normal parent update path for `auto-draft` promotion even when RTC is enabled, subject to the same author and lock checks that core uses for direct parent autosaves.
4. Keep RTC's always-revision behavior for existing `draft` posts so #75105 does not regress.
5. After implementing the server change, run a focused CRDT audit:
   - Open a new post with RTC enabled.
   - Type content.
   - Let automatic autosave promote the parent.
   - Reload the editor.
   - Join with a second user.
   - Assert no duplicated title/content and no deletion of the autosaved content.
6. If the audit shows the promoted parent lacks a current `_crdt_document` and reload/join can reproduce #75105-style duplication, add the smallest client-side follow-up: when an autosave response updates the parent from `auto-draft` to `draft`, treat that one transition as save-like for the sync manager and persist a matching CRDT document. Do not generalize this to existing draft autosaves.
7. Verify user recovery, not just data placement:
   - the post appears in the Posts > Drafts list;
   - reopening the draft shows the typed title/content without requiring the hidden auto-draft URL;
   - normal revision/autosave UI does not present stale empty content as authoritative.
8. Add a short inline comment near the controller branch explaining why `auto-draft` is not grouped with `draft` under RTC. The comment should point to the user-visible discoverability invariant, not just the implementation mechanics.

## Expected fix shape

The likely server-side shape is:

```php
$is_auto_draft = 'auto-draft' === $post->post_status;
$is_draft      = 'draft' === $post->post_status;

if (
	( $is_auto_draft || ( $is_draft && ! $is_collaboration_enabled ) ) &&
	(int) $post->post_author === $user_id &&
	! $post_lock
) {
	$autosave_id = wp_update_post( wp_slash( (array) $prepared_post ), true );
} else {
	$autosave_id = $this->create_post_autosave( (array) $prepared_post, (array) $request->get_param( 'meta' ) );
}
```

This is intentionally conservative: it changes only the `auto-draft` RTC transition while preserving the existing RTC revision path for visible drafts.

The open question is whether the auto-draft promotion path also needs an immediate `_crdt_document` persistence step. That should be decided by the reload/join no-duplication test, not by assumption.
