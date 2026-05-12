# RTC table move can be deleted by a stale explicit base record

Bug signature: `dc4c01ff87b0`

The archived fuzz result reported an RTC top-level order split after ordinary editor operations: append a paragraph, insert a Table block, then move that Table block to top-level index 2. The actor saw the intended `heading > paragraph > table > paragraph > paragraph` order, while the peer saw a divergent order.

Earlier analysis found that the May 7 known-fixes stack fixed the no-base helper replay through stale top-level reconciliation. Pass 176 found a remaining production-path gap: `editEntityRecord()` passes an explicit `baseRecord` into the sync manager, and `mergeCrdtBlocks()` used that explicit base directly instead of applying the same stale-local reconciliation used for cached previous snapshots.

The failing interleaving is:

1. Both collaborators converge on `heading, paragraph-a, paragraph-b`.
2. One collaborator appends `paragraph-c`.
3. The same collaborator inserts a Table block and moves it to index 2.
4. The peer receives the Yjs update but still publishes a stale block snapshot based on the pre-table `baseRecord`.
5. The explicit-base path treats the missing Table block as a local deletion, so the shared block tree loses the remote table.

This is a real RTC content-corruption risk, but the practical likelihood is low: it needs RTC collaboration, a normal top-level Table insert/move, and a tight stale-store/local-edit timing window. A later save from the corrupted peer can persist the wrong content. Recovery is manual reorder/reinsert, undo if still available, or post revisions after save.

The targeted regression is in `packages/core-data/src/utils/test/crdt-dc4c01ff87b0-table-move-repro.test.ts` on branch `try/rtc-table-move-applies-at-wrong-top-level-index-on-peer-dc4c01ff87b0-pr`.

Pass 178 rechecked the exact base and adjacent fix status. The regression still fails on `f256024286dd80a4c0e2579f658c109256abf648` plus only the test commit, and passes on the existing fix branch commit `09505fda98a2907f6c219576082de3add2943afe`. It also passes on the related branch commit `c8af86c24a5c70784e4604b66b772a0511859a00`, whose narrower change makes explicit base records go through stale-local reconciliation.

Pass 178 could not produce a clean exact-base browser video. A built exact-base worktree loaded the editor, but `wp_is_collaboration_enabled()` was not defined in WP-CLI/admin because `lib/compat/wordpress-7.0/collaboration.php` is required under the `class_exists( 'WP_REST_Controller' )` loader branch. The collaboration option was therefore absent and the editor never set `window._wpCollaborationEnabled`. That is an RTC test-environment/readiness blocker, not evidence against the CRDT replay.
