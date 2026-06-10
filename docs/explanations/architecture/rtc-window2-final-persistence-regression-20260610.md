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

## Trunk Audit

The exact bad loop does not appear on first-parent `origin/trunk`.

These searches returned no first-parent trunk commits:

```bash
git log --first-parent -S'newEdits[ key ] = crdtValue' origin/trunk -- packages/core-data/src/entities.js
git log --first-parent -S'crdtSnapshotSyncManager' origin/trunk -- packages/core-data/src/entities.js
git log --first-parent -S'latestRecordForCRDTSnapshot' origin/trunk -- packages/core-data/src/entities.js
```

Current `origin/trunk`
[`2cbccc116ba`](https://github.com/WordPress/gutenberg/commit/2cbccc116ba)
also passes the two checked window-2 seeds under the final persistence oracle:

| Commit | Seed | Result |
| --- | --- | --- |
| `2cbccc116ba` | `8970053` | good |
| `2cbccc116ba` | `8970017` | good |

The parent of
[`05bf6da85b4`](https://github.com/WordPress/gutenberg/commit/05bf6da85b4)
(`#78891`) also passed seed `8970053`.

So there is no trunk commit hash or WordPress PR that introduced the exact
window-2 bug isolated here. It was introduced by the uncommitted dirty RTC
product overlay / danluu PR-stack code path, not by current first-parent trunk.

## Related Trunk PRs

The adjacent trunk CRDT persistence history is:

- [`2d8b22633dd`](https://github.com/WordPress/gutenberg/commit/2d8b22633dd3889e1a4405dcc7ebfd4bb8dbf71c),
  [WordPress/gutenberg#72373](https://github.com/WordPress/gutenberg/pull/72373):
  introduced CRDT persistence for collaborative editing.
- [`83a8f448995`](https://github.com/WordPress/gutenberg/commit/83a8f448995bede00097ac61a340b12e3e09401b),
  [WordPress/gutenberg#75846](https://github.com/WordPress/gutenberg/pull/75846):
  moved the WordPress CRDT meta key from `sync` to `core-data`.
- [`8051e14451c`](https://github.com/WordPress/gutenberg/commit/8051e14451cf85c5e6713bf2098149f30229e47b),
  [WordPress/gutenberg#75975](https://github.com/WordPress/gutenberg/pull/75975):
  made CRDT document creation asynchronous so pending deferred Y.Doc updates
  flush before save-time serialization.
- [`05bf6da85b4`](https://github.com/WordPress/gutenberg/commit/05bf6da85b4d5ec7465f59c0c915614bddbae70d),
  [WordPress/gutenberg#78891](https://github.com/WordPress/gutenberg/pull/78891):
  added a separate CRDT document persistence endpoint.

These are useful context, but they are not the first bad trunk commit for this
window-2 repro because the repro passes on current trunk and the isolated bad
loop is absent from trunk history.

## Local PR-Stack Introduction

The same loop appears in the local/danluu PR-stack history at:

[`f89f5c4583f206bc6ddf1cf539d2f95ef2f8bf27`](https://github.com/danluu/gutenberg/commit/f89f5c4583f206bc6ddf1cf539d2f95ef2f8bf27)
(`Snapshot RTC save payload before CRDT persistence`).

That commit is reachable through danluu PR-stack artifact branches such as:

[`rtc-pr-stack-20260520T084045Z-all-merged-pr07b0-srh`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260520T084045Z-all-merged-pr07b0-srh)

and:

[`rtc-pr-stack-20260522T175152Z-all-merged-pr07c-reload-record-snapshots`](https://github.com/danluu/gutenberg/tree/rtc-pr-stack-20260522T175152Z-all-merged-pr07c-reload-record-snapshots)

I did not find a corresponding public `origin/pr/*` ref for `f89f5c4583f`
itself. It appears to be from the danluu RTC PR-stack artifact branch set rather
than a WordPress/gutenberg pull request ref.

Related public WordPress PR refs in the older stale-save ancestry are:

- [`origin/pr/77876`](https://github.com/WordPress/gutenberg/pull/77876):
  stale save regression coverage.
- [`origin/pr/77890`](https://github.com/WordPress/gutenberg/pull/77890):
  stale persisted CRDT document rejection.
- [`origin/pr/77924`](https://github.com/WordPress/gutenberg/pull/77924):
  websocket regression migration.
- [`origin/pr/78251`](https://github.com/WordPress/gutenberg/pull/78251):
  nested cursor awareness merge input in the same stale-save branch ancestry.

The exact currently reproduced window-2 failure is not a clean committed trunk
regression. It is introduced by the uncommitted dirty RTC product overlay
applied on top of clean `2f59cd94b1b`, and the minimal source is the
`newEdits[ key ] = crdtValue` reconciliation loop above.

## Notes About Commit-Level Testing

I also tested `f89f5c4583f` and its parent
[`b68ca0bf04eb4675c4699abc7d78922a5b634a7c`](https://github.com/danluu/gutenberg/commit/b68ca0bf04eb4675c4699abc7d78922a5b634a7c)
with the modern final-persistence oracle. Both were already bad under that
modern oracle, so the historical branch cannot provide a clean good/bad boundary
for this exact oracle. The reliable boundary for window 2 is the overlay/hunk
bisect against clean `2f59cd94b1b`.

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
