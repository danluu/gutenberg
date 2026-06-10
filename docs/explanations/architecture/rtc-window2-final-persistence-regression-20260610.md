# RTC Window 2 Final Persistence Regression

Date: 2026-06-10

This note explains the "repro window 2" RTC browser fuzz failure found by the
atomic-sites profile. The symptom is a final persistence oracle failure: the
editor has converged on one canonical post content value, but the REST-persisted
post content contains a different value after the final save.

## Repro

The stable reproducer used for the bisect was seed `8970053` from:

```text
.codex_tmp/adam-single-user-list-fuzz-final-persistence-20260610T211000Z/lane-5/seed-8970053/primary
```

Relevant environment:

```text
GUTENBERG_RTC_BROWSER_ACTION_PROFILE=atomic-sites
GUTENBERG_RTC_BROWSER_BASE_COLLABORATORS=0
GUTENBERG_RTC_BROWSER_EXTRA_COLLABORATORS=0
GUTENBERG_RTC_BROWSER_DISABLE_SYNC_FAULTS=1
GUTENBERG_RTC_BROWSER_DISABLE_RELOAD=1
GUTENBERG_RTC_BROWSER_DISABLE_REVISION_RESTORE=1
GUTENBERG_RTC_BROWSER_FINAL_PERSISTENCE_ORACLE=fail
GUTENBERG_RTC_BROWSER_SAVE_CHECKPOINT_COUNT=0
GUTENBERG_RTC_BROWSER_STEPS=6
```

The action sequence was:

```text
move-block
append-paragraph
concurrent-paragraphs
edit-title
append-paragraph
append-paragraph
```

The failing invariant was:

```text
final-persistence-canonical-content
```

In the isolated `entities.js` + CRDT helper reproduction, the final editor
content hash was:

```text
e6881db97602746beee68b83603e4d2f04ec559569a10a4d15a9a181c9ab2d9c
```

The persisted post content hash was the initial snapshot:

```text
dca8c69040506a2681db5d70cfa4bbd4cdcef7e752dec396a876da75913fccda
```

The operation ledger showed four content markers missing from persisted content.

## Bisect Result

The clean committed branch head
[`2f59cd94b1ba41b004f4707ff25674506c81d796`](https://github.com/danluu/gutenberg/commit/2f59cd94b1ba41b004f4707ff25674506c81d796)
passed with the dirty fuzz harness and seed `8970053`.

Applying the full dirty RTC product diff to that same clean commit reproduced
the failure.

The product diff was then split:

| Candidate | Result |
| --- | --- |
| clean `2f59cd94b1b` | good |
| clean `2f59cd94b1b` + full dirty RTC product diff | bad |
| core-data runtime diff only | bad |
| `packages/core-data/src/actions.js` only | good |
| CRDT utility helpers only | good |
| `packages/core-data/src/entities.js` plus required CRDT helpers | bad |
| same patch with the save-time CRDT snapshot update block removed | good |
| same patch with the snapshot update kept but the inner `newEdits` reconciliation loop removed | good |

That isolates the bug to the inner reconciliation loop in
`packages/core-data/src/entities.js`.

## Bad Code Path

The problematic path is in `prePersistPostType`, inside the save-time CRDT
snapshot update block:

```js
if (
	crdtSnapshotSyncManager?.update &&
	latestRecordForCRDTSnapshot?.meta?.[
		POST_META_KEY_FOR_CRDT_DOC_PERSISTENCE
	]
) {
	const crdtRecord = crdtSnapshotSyncManager?.getCRDTRecordData?.(
		objectType,
		objectId
	);

	for ( const key of locallyChangedSavedFields ) {
		if ( ! hasCRDTRawPostValue( crdtRecord, key ) ) {
			continue;
		}

		const crdtValue = getCRDTRawPostValue( crdtRecord, key );
		const editValue = getRawPostValue(
			key in newEdits ? newEdits[ key ] : edits[ key ]
		);

		if ( crdtValue !== editValue ) {
			newEdits[ key ] = crdtValue;
		}
	}
}
```

For this repro, that loop reads a CRDT-derived raw content value after mutating
the local CRDT snapshot for save, decides it differs from the outgoing edit, and
writes it back into `newEdits.content`. The value copied into `newEdits` is not
the live editor content that should be persisted. The final save succeeds, but
the REST post content remains stale while the editor has converged on the newer
content.

Removing the entire snapshot-update block fixes the repro. More importantly,
keeping the snapshot mutation and only removing this inner loop also fixes the
repro. That makes the loop, not the snapshot serialization itself, the direct
cause.

## Trunk Introduction

The trunk-introducing commit for the stale-window save/persistence bug is:

[`2d8b22633dd3889e1a4405dcc7ebfd4bb8dbf71c`](https://github.com/WordPress/gutenberg/commit/2d8b22633dd3889e1a4405dcc7ebfd4bb8dbf71c)
from [WordPress/gutenberg#72373](https://github.com/WordPress/gutenberg/pull/72373),
`Real-time collaboration: Implement CRDT persistence for collaborative editing`.

That commit added the save-time behavior that made the stale-window overwrite
class possible on trunk:

- `prePersistPostType` started adding persisted CRDT document meta to normal
  post saves.
- `SyncManager#createMeta` serialized the local Y.Doc for the post.
- The normal REST save still sent the editor window's full serialized `content`
  snapshot.
- There was no save-time fetch/rebase against the latest server record and
  persisted CRDT document before constructing the outgoing REST payload.

The exact local `newEdits[ key ] = crdtValue` loop isolated above is not the
trunk introduction. It is an attempted local/PR-stack repair path for this
same stale-window class. The underlying trunk issue predates that local loop.

## Why This Commit

The public stale-save PR describes the introduction as an architectural gap
across multiple RTC changes, but identifies
[`2d8b22633dd`](https://github.com/WordPress/gutenberg/commit/2d8b22633dd3889e1a4405dcc7ebfd4bb8dbf71c)
/ [#72373](https://github.com/WordPress/gutenberg/pull/72373) as the commit
that added the important save-time behavior: serializing the local CRDT document
through `prePersistPostType` and persisting it in post meta as `_crdt_document`
during a normal toolbar save.

The prerequisite trunk commits are:

- [`c214929139f50337250efe2bb24ff82c3ff2b6aa`](https://github.com/WordPress/gutenberg/commit/c214929139f50337250efe2bb24ff82c3ff2b6aa),
  [WordPress/gutenberg#72114](https://github.com/WordPress/gutenberg/pull/72114):
  made syncing a side concern layered over normal editor/core-data state. This
  left normal saves sending full serialized `content` snapshots.
- [`84019935998c16f877e976ad85e84748355d7282`](https://github.com/WordPress/gutenberg/commit/84019935998c16f877e976ad85e84748355d7282),
  [WordPress/gutenberg#72262](https://github.com/WordPress/gutenberg/pull/72262):
  introduced the post-entity CRDT block merge path that operates on full block
  snapshots.

Those commits are prerequisites, but
[`2d8b22633dd`](https://github.com/WordPress/gutenberg/commit/2d8b22633dd3889e1a4405dcc7ebfd4bb8dbf71c)
is the first trunk commit where a stale editor window can persist its stale
local CRDT document during a normal post save without first rebasing against the
latest saved server state.

Later related trunk commits:

- [`8051e14451cf85c5e6713bf2098149f30229e47b`](https://github.com/WordPress/gutenberg/commit/8051e14451cf85c5e6713bf2098149f30229e47b),
  [WordPress/gutenberg#75975](https://github.com/WordPress/gutenberg/pull/75975):
  fixed a different stale-doc problem by flushing deferred local Y.Doc updates
  before serialization. It did not fetch and merge a newer server CRDT document
  from another same-account/support window before saving.
- [`05bf6da85b4d5ec7465f59c0c915614bddbae70d`](https://github.com/WordPress/gutenberg/commit/05bf6da85b4d5ec7465f59c0c915614bddbae70d),
  [WordPress/gutenberg#78891](https://github.com/WordPress/gutenberg/pull/78891):
  added a separate CRDT document persistence endpoint. This is adjacent
  persistence work, not the introduction.

## Local PR-Stack Hunk

The local loop appears in the danluu PR-stack history at:

[`f89f5c4583f206bc6ddf1cf539d2f95ef2f8bf27`](https://github.com/danluu/gutenberg/commit/f89f5c4583f206bc6ddf1cf539d2f95ef2f8bf27)
(`Snapshot RTC save payload before CRDT persistence`).

That commit is reachable through danluu PR-stack artifact branches such as:

[`rtc-pr-stack-20260520T084045Z-all-merged-pr07b0-srh`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260520T084045Z-all-merged-pr07b0-srh)

and:

[`rtc-pr-stack-20260522T175152Z-all-merged-pr07c-reload-record-snapshots`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260522T175152Z-all-merged-pr07c-reload-record-snapshots)

I did not find a corresponding public `origin/pr/*` ref for `f89f5c4583f`
itself. It appears to be from the danluu RTC PR-stack artifact branch set rather
than a WordPress/gutenberg pull request ref.

Related public WordPress PR refs in this stale-save ancestry are:

- [`origin/pr/77876`](https://github.com/WordPress/gutenberg/pull/77876):
  stale save regression coverage.
- [`origin/pr/77890`](https://github.com/WordPress/gutenberg/pull/77890):
  stale persisted CRDT document rejection.
- [`origin/pr/77924`](https://github.com/WordPress/gutenberg/pull/77924):
  websocket regression migration.
- [`origin/pr/78251`](https://github.com/WordPress/gutenberg/pull/78251):
  nested cursor awareness merge input in the same stale-save branch ancestry.

The local hunk bisect above is still useful for evaluating the PR-stack repair
attempt, but it is not the trunk introduction. The trunk introduction is
[`2d8b22633dd`](https://github.com/WordPress/gutenberg/commit/2d8b22633dd3889e1a4405dcc7ebfd4bb8dbf71c)
from [WordPress/gutenberg#72373](https://github.com/WordPress/gutenberg/pull/72373).

## Notes About Commit-Level Testing

I also tested the local repair-stack commit `f89f5c4583f` and its parent
[`b68ca0bf04eb4675c4699abc7d78922a5b634a7c`](https://github.com/danluu/gutenberg/commit/b68ca0bf04eb4675c4699abc7d78922a5b634a7c)
with the modern final-persistence oracle. Both were already bad under that
modern oracle, so the local branch cannot provide a clean committed good/bad
boundary for the repair-stack hunk. That result should not be used as the trunk
introduction. The trunk introduction is the save-time CRDT persistence behavior
added by
[`2d8b22633dd`](https://github.com/WordPress/gutenberg/commit/2d8b22633dd3889e1a4405dcc7ebfd4bb8dbf71c)
from [WordPress/gutenberg#72373](https://github.com/WordPress/gutenberg/pull/72373).

The branch path later carried the loop through commits such as:

- [`60480b8cb2a2f48e00967ac42c335f0f75900901`](https://github.com/danluu/gutenberg/commit/60480b8cb2a2f48e00967ac42c335f0f75900901)
  (`Use latest CRDT base for save snapshots`)
- [`b8ca68ad22c01ffa19cbe08a8d56651e5d1ea638`](https://github.com/danluu/gutenberg/commit/b8ca68ad22c01ffa19cbe08a8d56651e5d1ea638)
  (`Preserve RTC record snapshots through reload`)

## Suggested Fix Direction

Do not copy CRDT raw field values back into `newEdits` from the post-update
CRDT snapshot in `prePersistPostType`. The save payload should continue to use
the explicit outgoing edit value unless a separately proven stale-save merge
step has produced a replacement content value.

The persisted CRDT document can still be regenerated after the save snapshot is
updated, but the CRDT snapshot should not be treated as an authoritative source
for replacing the REST raw fields in the same save payload.
