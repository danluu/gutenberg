# RTC top-level move stale pre-move order

Bug signature: `c71d49e9ecf9`

Bug type: `rtc_top_level_move_reconciliation_leaves_peer_on_pre_move_order_after_remote_structural_edits`

The failure is a product-level RTC convergence bug, not a readiness wait,
locator issue, malformed generated fixture, or inverted assertion.

## Evidence

The source HTTP refresh result failed without timing out:

```text
result=failed exitCode=1 timedOut=false durationMs=47036
spec=test/e2e/specs/editor/collaboration/triage-ec47d94c5251-realistic.spec.ts
```

The natural-user Playwright flow creates a post, opens a second collaborator,
deletes the initial heading from one editor, inserts a paragraph before the
first remaining paragraph from the other editor, and then moves that original
paragraph down with the block toolbar move control.

The failure happens after the actions complete and `waitForConvergence()` reads
valid editor state from both browsers. The acting editor has the intended order:

```text
Inserted paragraph
Another paragraph
Emoji/multibyte paragraph
```

The peer remains divergent and duplicates the moved paragraph:

```text
Inserted paragraph
Emoji/multibyte paragraph
Emoji/multibyte paragraph
```

A pass-39 rerun against the known-fixes base on a freshly started HTTP wp-env at
`http://localhost:9910` reproduced the same split. That run used the same
natural user actions as the source repro and failed after 43.3s with primary
state `[inserted paragraph, another paragraph, emoji paragraph]` and secondary
state `[inserted paragraph, emoji paragraph, emoji paragraph]`.

Pass 40 rechecked the evidence after rebasing both branches onto
`origin/trunk` at `e7f55c1b4d2`. The original source log and Playwright trace
again show completed user actions followed by a state assertion failure, not a
timeout or missing locator. A fresh HTTP rerun against the known-fixes base at
`http://localhost:9908` failed in 42.8s with the same primary/secondary split.
Applying only the non-Playwright regression-test commit to the known-fixes base
failed the same-array-reference reorder case with expected
`[Inserted, Another, Emoji]` and received `[Inserted, Emoji, Another]`. The
fixed branch then passed the focused regression tests, the full
`crdt-blocks.ts` unit suite, JS lint for the touched files, and the natural-user
Playwright repro on the same HTTP transport.

Pass 41 rebased both branches onto `origin/trunk` at `02bfdaa5ca9`, which is
PR #77980's HTTP polling compaction fix for offline reconnects. That upstream
change does not touch `crdt-blocks.ts`. Applying only the non-Playwright
regression-test commit to the new trunk still fails the stale top-level move
case and the same-array-reference reorder case with the stale order
`[Inserted, Emoji, Another]`. The rebased fix branch passes the full
`crdt-blocks.ts` unit suite and JS lint, and the same natural-user Playwright
repro passed before the rebase; the rebase only added the unrelated server-side
compaction change beneath the three repro/fix commits.

Pass 42 independently reran the low-level negative controls and a browser
negative control. Applying only the non-Playwright regression-test commit to
current trunk `02bfdaa5ca9` still fails the stale top-level move case and the
same-array-reference reorder case. Applying that same test commit to the
known-fixes base `3cba2b1e56a` still fails the reused mutable array reorder
case, which confirms that the known-fixes base does not fully fix this bug.
A fresh headless HTTP Playwright rerun against the already-running known-fixes
environment at `http://localhost:9601` failed after the same natural user
actions with primary state `[Inserted, Another, Emoji]` and secondary state
`[Inserted, Emoji, Emoji]`. A fresh post-rebase fixed-branch browser rerun was
attempted on `WP_ENV_PORT=9907`, but Docker could not create a new wp-env
network because the predefined address pools were exhausted by unrelated
running wp-env environments. The fixed branch still passes the focused
low-level cases, the full `crdt-blocks.ts` unit suite, and touched-file JS
lint; its built artifacts contain `previousBlocksByYArray`, so a browser
rerun on that worktree would exercise the fixed code once a clean wp-env can be
allocated.

The narrowest pass-39 proof is lower than Playwright: applying only the
regression-test commit to the known-fixes base shows that the base already
survives the pure stale-snapshot interleaving when each editor emits a fresh
block array, but still fails when the editor reuses the same mutable block array
reference across a reorder. That isolates the remaining defect to the cached
serializable block snapshot, not to action locators, readiness waits, or the
browser harness.

Pass 42 sharpened that proof by rerunning the same test-only commit on both
current trunk and the known-fixes base. Trunk fails both the stale interleaving
and the reused-array reorder; the known-fixes base passes the stale
interleaving but fails the reused-array reorder. That A/B result isolates the
remaining known-fixes defect to the `serializableBlocksCache` keying by the
mutable incoming block array reference.

## Root cause

Top-level post blocks are synced as full snapshots through
`editEntityRecord()`, `SyncManager.update()`, `applyPostChangesToCRDTDoc()`, and
`mergeCrdtBlocks()`. `SyncManager.update()` intentionally defers local CRDT
updates to the next event-loop turn. That means a local full-block snapshot can
be based on the editor state before a remote structural edit, but be merged into
a Yjs block array that has already received the remote edit.

The original `mergeCrdtBlocks()` had no base snapshot for the incoming local
snapshot. It treated `incomingBlocks` as the whole desired CRDT value and
performed a positional left/right diff. For same-length middle regions it
updated existing `Y.Map` instances in place. After a remote insertion and
deletion, a later top-level move could therefore be interpreted as content
replacement at the old positions rather than as an order change over block
identities. On the receiving peer, an older local snapshot with the pre-move
order could then rewrite the newly-received order and leave the peer with stale
order and duplicated content.

The known-fixes base contains an earlier merge-base reconciliation attempt, but
it still memoizes `makeBlocksSerializable( incomingBlocks )` in
`serializableBlocksCache` by the mutable `incomingBlocks` array object. When the
block editor reuses that array reference and mutates its order, the cached
serializable copy still has the pre-move order. The final top-level move is then
invisible to reconciliation, so the peer can remain on the pre-move order and
duplicate the moved paragraph.

The behavior originates with `84019935998c16f877e976ad85e84748355d7282`
("Improve CRDT \"merge logic\" for post entities", PR #72262), which introduced
the generic block merge path and positional `mergeCrdtBlocks()` algorithm.
Later RTC changes improved text handling and array attribute stability, notably
`22e067b02438e110efc39de2ff1c7b4d23eb74c3` (PR #75448) and
`a6bfd3e55432981c7c2cb09190ee77954530b1a5` (PR #77164), but they do not give
top-level block snapshots a merge base.

## Fix plan

Initial tempting fix: detect same-client-id reorders and rebuild the Y.Array
instead of updating existing Y.Map objects by position.

Audit result: that is too narrow. It fixes the acting editor's local reorder,
but it does not solve the distributed-systems problem where the receiving
editor later emits an older full-block snapshot based on the pre-move order. A
stale snapshot can still roll back a causally newer remote move.

Revised fix: keep the previous local block snapshot per `Y.Array` in a
`WeakMap`, and reconcile each incoming local full-block snapshot against that
base and the current CRDT value before running the existing merge. If a local
field or relative order is unchanged from the previous base, preserve the
current remote value instead of treating the old local value as authoritative.
If the local relative order of shared blocks actually changed, apply that move
while retaining unrelated remote insertions and deletions. Remove the old
`WeakMap` cache for serializable blocks because a reused mutable block array can
otherwise hide a real reorder.

Residual risk: the reconciliation relies on unique stable `clientId` values. If
blocks do not have unique IDs, the code intentionally falls back to the existing
positional merge behavior rather than guessing.
