# RTC rank 7 cause report: `14bf369fe913`

Date: 2026-05-15

This report investigates rank 7 from
`docs/explanations/architecture/rtc-score4-likelihood-ranking-20260514.md`:

```text
HTTP top-level order divergence after append paragraph plus insert heading.
```

The short answer is:

- The rank 7 bug does not reproduce on current trunk in the tested matrix.
- The original rank 7 failure was not caused by PR #77924.
- The non-trunk fix-set commit that introduced the divergent-order behavior is
  `7bc178d07b781ce5c24a7597e8e5c412534806d0`, "Preserve saved content from
  stale form snapshots".
- That commit introduced a stale full-snapshot reconciliation path that preserves
  remote-only blocks, but without exact snapshot provenance it also preserves
  peer-specific top-level order. That is the rank 7 failure mode.

## Original failure

The original deep recheck artifact was:

```text
artifacts/rtc-browser-fuzz/mixed-http-ws-supervised-20260502-0007/novelty-live-20260507T1715Z/novelty-http-persistence-probe-gen-1-20260511T194038Z/lane-0/seed-1030005/analysis-2-deeper-recheck/
```

Replay metadata:

```text
repoCommit:              2f59cd94b1ba41b004f4707ff25674506c81d796
seed:                    1030005
transport:               http
actionProfile:           persistence-no-title
collaboratorMode:        distinct-user
convergenceTimeoutMs:    30000
disable sync faults:     yes
disable parser stress:   yes
use websocket provider:  no
```

Actions before failure:

```text
step 0, user 1: append-paragraph
step 1, user 1: insert-heading
```

No save checkpoint ran, no sync fault ran, and no reload was executed before the
divergence. The stored plan had `reloadStep: 6`, but the failure occurred after
step 1 while waiting for convergence.

Failure shape:

```text
Collaborative state did not converge within 30000ms
```

The two peers contained the same logical blocks but with different top-level
order:

```text
peer 0:
  inserted heading
  original heading
  original paragraph
  original paragraph
  appended paragraph

peer 1:
  original heading
  original paragraph
  original paragraph
  inserted heading
  appended paragraph
```

## Trunk revalidation

I used Codex in tmux to run parallel trunk checks against `9dc8762a35f1`.

Results:

```text
trunk-sweep-a: 20 targeted + 5 random passed
trunk-sweep-b: 20 targeted + 5 random passed
trunk-sweep-c: 20 targeted + 5 random passed
```

Coverage:

```text
targeted seeds: 1030000..1030059
random seeds:   2030000..2030014
total:          75/75 passed
```

The original seed `1030005` was also run in isolated forced rank-7 mode with
extended convergence waits:

```text
120000 ms: passed
180000 ms: passed
240000 ms: passed
```

All of these forced runs used the rank-7 action shape:

```text
append-paragraph, then insert-heading
```

with no sync faults, no save checkpoints, and no executed reloads.

Artifacts:

```text
/tmp/rank7-tmux/trunk-sweep-a-final.md
/tmp/rank7-tmux/trunk-sweep-b-final.md
/tmp/rank7-tmux/trunk-sweep-c-final.md
/tmp/rank7-tmux/iso-a-final.md
/tmp/rank7-tmux/iso-b-final.md
/tmp/rank7-tmux/iso-c-final.md
```

## PR #77924 is not the cause

The original failing commit predates PR #77924.

Relevant commits:

```text
2f59cd94b1ba41b004f4707ff25674506c81d796
  2026-05-02 12:48:25 -0700
  Add local RTC WebSocket e2e suite

1bda16e1a1921c35d84bfb11cfac025400ee15ae
  2026-05-12 14:25:01 -0700
  RTC: Migrate websocket regression fixes to trunk
  PR #77924 head

f2d4c8168fac01db97794df4ec9c9e7bc2ecf7a3
  2026-05-13 12:45:37 -0700
  Merge remote-tracking branch 'origin/pr/77924' into try/rtc-77716-fixes-20260513
```

Ancestry checks:

```text
git merge-base --is-ancestor 1bda16e1 2f59cd94 => exit 1
git merge-base --is-ancestor f2d4c816 2f59cd94 => exit 1
```

`exit 1` means "not an ancestor". Therefore neither the PR #77924 head nor its
merge is present in the original failing build.

The PR #77924 code path also does not contain the old helper pair that produces
this failure:

```text
git grep 'getRemoteBlockInsertIndex\|reconcileStaleLocalBlocks' 1bda16e1 -- packages/core-data/src/utils/crdt-blocks.ts
# no matches

git grep 'getRemoteBlockInsertIndex\|reconcileStaleLocalBlocks' f2d4c816 -- packages/core-data/src/utils/crdt-blocks.ts
# no matches
```

I also tested `f2d4c816` directly under the forced rank-7 matrix. Indexes
`0..3`, seeds `1030005..1030007`, all passed.

Artifacts:

```text
/tmp/rank7-tmux/cand-f2d4-final.md
/tmp/rank7-tmux/cand-head-final.md
/tmp/rank7-codex-proof-20260515/pr77924.md
```

## First bad non-trunk fix-set commit

The first bad non-trunk commit is:

```text
7bc178d07b781ce5c24a7597e8e5c412534806d0
Preserve saved content from stale form snapshots
```

Commit metadata:

```text
parent: 48a94c5b5a58d4912cf2dd1922850cdc64e61d90
date:   2026-05-01 10:39:30 -0700
body:   cherry picked from commit cd6822b89c95050e56d39cd217a6bf9e036af315
```

`git log -S` identifies this as the first local introduction of the relevant
helper path:

```text
git log --reverse -S'function reconcileStaleLocalBlocks' -- packages/core-data/src/utils/crdt-blocks.ts
=> 7bc178d07b7 Preserve saved content from stale form snapshots

git log --reverse -S'getRemoteBlockInsertIndex' -- packages/core-data/src/utils/crdt-blocks.ts
=> 7bc178d07b7 Preserve saved content from stale form snapshots
```

The parent `48a94c5` does not contain these symbols. `7bc178d` adds:

```text
previousBlocksByYArray
getRemoteBlockInsertIndex
reconcileStaleLocalBlocks
mergeCrdtBlocks -> reconcileStaleLocalBlocks
```

The `7bc` diff touches:

```text
packages/core-data/src/entities.js
packages/core-data/src/utils/crdt-blocks.ts
packages/core-data/src/utils/crdt.ts
packages/sync/src/manager.ts
packages/sync/src/types.ts
```

with 430 insertions and 5 deletions.

## Executable A/B proof

I added a focused diagnostic unit test to two scratch worktrees:

```text
/private/tmp/rank7-ab-exec-20260515-parent @ 48a94c5
/private/tmp/rank7-ab-exec-20260515-7bc    @ 7bc178d
```

The test uses the real `mergeCrdtBlocks()` implementation in each worktree and
simulates the rank-7 state:

```text
previous base:       A B C
stale local append:  A B C P

peer0 current:       H A B C
peer1 current:       A B C H
```

The parent behavior is convergence to the same order:

```text
48a94c5:
peer0 => A B C P
peer1 => A B C P
```

The `7bc` behavior is the rank-7 stable divergence:

```text
7bc178d:
peer0 => H A B C P
peer1 => A B C H P
```

Both focused unit tests passed with these opposite expected outcomes:

```text
/tmp/rank7-ab-parent-test-20260515.exit => 0
/tmp/rank7-ab-7bc-test-20260515.exit   => 0
```

This is the key proof: the same minimized state converges on the parent and
preserves divergent top-level order on `7bc`.

## Why the fix causes the bug

Before `7bc`, `mergeCrdtBlocks()` used the incoming local block snapshot
directly:

```text
const blocksToSync = serializableBlocksCache.get( incomingBlocks ) ?? [];
```

`7bc` changes this to:

```text
const localBlocksToSync =
    serializableBlocksCache.get( incomingBlocks ) ?? [];
const blocksToSync = reconcileStaleLocalBlocks(
    yblocks,
    localBlocksToSync
);
```

The intent is reasonable: Gutenberg sends full block snapshots, not explicit
operations. If a local editor sends a stale snapshot that does not yet include a
remote block, blindly applying that full snapshot can drop remote work. The new
code tries to preserve remote-only top-level blocks by splicing them from the
current Yjs state into the stale local snapshot before the Y.Array merge.

The bug is that this code has no exact provenance for the outgoing local
snapshot. It knows:

- the previous local snapshot cached for this Y.Array;
- the current Yjs block array;
- the next local full snapshot.

It does not know the exact editor-visible base that produced the outgoing
snapshot, or whether a missing/reordered block is:

- unseen remote work to preserve;
- observed local deletion;
- local move/reorder;
- stale local order that should be refreshed.

`getRemoteBlockInsertIndex()` inserts the remote-only block relative to the
nearest block in each peer's current local order. If the two peers already
disagree about where the inserted heading lives, the reconciliation preserves
that disagreement:

```text
previous base:       A B C
stale local append:  A B C P

peer0 current:       H A B C  -> H A B C P
peer1 current:       A B C H  -> A B C H P
```

That is exactly the rank-7 failure: same blocks, different top-level order after
`append-paragraph` plus `insert-heading`.

## PR analysis

The local first-bad commit `7bc178d` was cherry-picked from
`cd6822b89c95050e56d39cd217a6bf9e036af315` on
`try/form-content-overwrite-pr`. I did not find a standalone GitHub PR for that
exact cherry-pick on `danluu/gutenberg`.

The same stale snapshot repair line appears in WordPress/Gutenberg PR #77876,
"RTC: fix stale block snapshot overwriting newer state":

```text
https://github.com/WordPress/gutenberg/pull/77876
```

PR #77876 carries the same relevant helper path in its head:

```text
previousBlocksByYArray
getRemoteBlockInsertIndex
reconcileStaleLocalBlocks
```

That PR's discussion identifies the underlying risk: saves and sync operate on
full snapshots, there is no server-side compare-and-set for the full content
body, client IDs are local/session-derived, serialized HTML does not carry
operations, and the system cannot reliably distinguish stale no-op omission
from intentional deletion or movement without more provenance.

The rank-7 bug is therefore not an independent trunk regression. It is a
regression caused by a non-trunk stale-snapshot fix. The fix repairs one side of
the stale full-snapshot problem, but it does so with a heuristic that can
preserve peer-specific local order.

## Why this is not in trunk

Current trunk does not contain the `7bc` stale-reconciliation helper path in the
rank-7-tested code. PR #77924 and its merge also do not contain it.

The direct trunk repro attempts passed:

```text
75/75 sweep cases passed
1030005 passed with 120s, 180s, and 240s waits
```

The direct `f2d4c816` and fix-set-head forced rank-7 checks also passed. This
matches the code evidence: the problematic helper pair is absent from those refs.

## Caveat on same hash in later known-fixes runs

There are later known-fixes artifacts with the same issue hash that can fail
around other save/checkpoint/fault shapes. Those are not the rank-7 row described
here.

The original rank-7 row is specifically:

```text
HTTP top-level order divergence after append paragraph plus insert heading
no save checkpoint
no sync fault
no executed reload
```

The `7bc` A/B proof matches that order-divergence shape directly.

## Artifacts

Proof and replay summaries:

```text
/private/tmp/rank7-proof-20260515/
/tmp/rank7-codex-proof-20260515/
```

Trunk and candidate tmux/Codex run summaries:

```text
/tmp/rank7-tmux/
```

Executable A/B diagnostic worktrees and logs:

```text
/private/tmp/rank7-ab-exec-20260515-parent
/private/tmp/rank7-ab-exec-20260515-7bc
/tmp/rank7-ab-parent-test-20260515.log
/tmp/rank7-ab-7bc-test-20260515.log
```

No rank-7 tmux or Codex sessions were left running after the investigation.
