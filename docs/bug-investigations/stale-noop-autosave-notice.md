# Stale newer-autosave notice with no content diff

## Summary

The bug is a stale/no-op remote autosave warning. A published post can show:

> There is an autosave of this post that is more recent than the version below.

Clicking the warning opens the classic revision screen for that autosave. The revision screen shows a `Title` comparison but no `Content` comparison, because the autosave content is byte-for-byte the same as the saved parent post content.

The visible failure is therefore not that the revision screen loses content. The revision screen is accurately showing that there is no content diff for the selected autosave. The bad behavior is that the editor offers a newer-autosave warning for an autosave that does not contain newer revisioned content.

## Why the repro is the same bug

The repro does not need to replay the exact user history from the original recording. It reproduces the same invalid state:

1. Start with a published post.
2. Save a normal content edit through the editor UI.
3. Make a normal non-content post edit through the editor UI.
4. Wait for the default autosave monitor. No direct autosave call, timer override, or fault injection is used.
5. The editor naturally sends an autosave request.
6. The resulting autosave has the same saved `title` and `content` as the parent post.
7. Reloading the editor shows the newer-autosave notice.
8. Following the notice opens `revision.php` for that autosave, where `Content` is absent because there is no content diff.

The e2e test asserts the key invariant directly: before clicking the notice, it fetches the autosave and saved post through REST and checks that their raw `content` and `title` fields match. It then verifies the newer-autosave notice and the no-`Content` revision screen.

## Root Cause

There are two independent pieces that combine into the bug:

1. The editor can naturally create an autosave after a post is dirty for a non-content reason. The autosave payload still includes the current serialized content, so the server can store a newer autosave revision whose revisioned fields match the saved post.
2. The editor-load path treats any autosave newer than the parent post as warning-worthy. It does not check whether the autosave differs from the parent in fields shown by the revision UI.

Once those conditions happen together, the editor warning links to a revision that has no content change to show.

## Introducing Change

The user-visible bug was introduced by:

- Commit: [`7141ce69260848cbe9ec5a47f2c51bd078b98a2e`](https://github.com/WordPress/gutenberg/commit/7141ce69260848cbe9ec5a47f2c51bd078b98a2e)
- PR: [#4218, "Show autosave message when autosave exists"](https://github.com/WordPress/gutenberg/pull/4218)
- Parent tested: [`aa5cc43e13c3ed59864dd2a042e7876b0b3b3d6c`](https://github.com/WordPress/gutenberg/commit/aa5cc43e13c3ed59864dd2a042e7876b0b3b3d6c)

That commit added `get_autosave_newer_than_post_save()` in `lib/client-assets.php`, set `$editor_settings['autosave']` whenever a stored autosave was newer than the post, and added the warning/link in the editor setup flow. The helper only checked timestamps. It did not compare revisioned fields such as title, content, or excerpt.

The commit history also notes that the field-change check was removed while preparing #4218. That is the core mistake: freshness was treated as enough evidence to show a restore/view-autosave warning.

## Provenance Test

I added and ran:

```sh
node tools/bug-investigations/check-autosave-notice-introduction.mjs
```

Result:

```text
PASS parent aa5cc43e13c3ed59864dd2a042e7876b0b3b3d6c has no newer-autosave helper and does not wire editorSettings.autosave.
PASS commit 7141ce69260848cbe9ec5a47f2c51bd078b98a2e adds the helper, editor setting, notice, and link.
PASS introduced helper returns a same-content autosave solely because it is newer, and rejects an older one.
```

This verifies the alleged introducing commit directly:

- The parent lacks the warning-setting path.
- The commit adds the warning-setting path.
- The added helper returns a newer autosave even when the saved fields used in the test are unchanged.

## Repro Verification

The focused natural repro was run with the default autosave interval:

```sh
WP_ENV_PORT=8897 WP_BASE_URL=http://localhost:8897 WP_E2E_USE_DEFAULT_AUTOSAVE_INTERVAL=1 npm run test:e2e -- test/e2e/specs/editor/various/autosave-revision-screen.spec.ts --project=chromium --workers=1 --grep "normal category edit"
```

Result:

```text
1 passed
```

The repro text in the test was changed to neutral placeholder prose and is intentionally not repeated here.

## Relationship To Recent RTC PRs

This is not the same bug as the recent RTC content-loss/list-table issues. In particular:

- [#77866](https://github.com/WordPress/gutenberg/pull/77866) is about RTC duplicate-table/content-loss behavior.
- [#77924](https://github.com/WordPress/gutenberg/pull/77924) is about RTC/WebSocket stale CRDT behavior.
- The autosave/revision-adjacent RTC work is related in area, but not the introducing change for this warning. The stale warning behavior goes back to the timestamp-only newer-autosave detection added in #4218.
