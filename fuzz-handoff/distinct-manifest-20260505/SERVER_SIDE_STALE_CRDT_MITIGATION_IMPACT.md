# Impact of server-side stale persisted CRDT rejection

Date: 2026-05-06

This report estimates how much of
[`LIKELY_REAL_ISSUES_HANDOFF.md`](./LIKELY_REAL_ISSUES_HANDOFF.md) would be
mitigated by a robust version of WordPress/gutenberg#77890, "RTC: Reject stale
persisted CRDT documents".

The analyzed corpus is
[`likely-real-issues.jsonl`](./likely-real-issues.jsonl) from this handoff:

- Distinct likely-real issue rows: 279
- STATUS-count weighted real failures: 452
- Manifest base commit: `345baea61cd`
- PR #77890 draft head at analysis time: `bd511b424f1e7077a59fb7f61f2f24cbd3b3c7eb`

## Assumed mitigation scope

For this report, a "fixed and good" version of #77890 means:

- the server atomically rejects stale updates to post meta key
  `_crdt_document`;
- stale rejection uses a real compare-and-swap or equivalent atomic predicate,
  not only a read-then-write check;
- the REST save path returns a conflict, and the client refetches, merges the
  current persisted CRDT document, recomputes the persisted CRDT meta, and
  retries.

The mitigation is not assumed to add optimistic locking for `post_title`,
`post_content`, `excerpt`, or the whole REST post record. It is also not assumed
to fix live CRDT merge/reconciliation, table/Y.Array merge behavior,
reload/autosave title state, post-lock/revision flows, or `/wp-sync` transport
and storage failures.

That distinction matters because many rows are "stale" in a local/live-state
sense, not stale relative to the server's latest persisted `_crdt_document`.

## Best estimate

The best planning estimate is that this mitigation touches only a narrow slice
of the handoff.

| Outcome | Distinct rows | Fraction | STATUS-weighted | Weighted fraction |
| --- | ---: | ---: | ---: | ---: |
| Fully fixed | 1 / 279 | 0.36% | 1 / 452 | 0.22% |
| Partially mitigated | 2 / 279 | 0.72% | 2 / 452 | 0.44% |
| Unimpacted | 276 / 279 | 98.92% | 449 / 452 | 99.34% |

The one fully fixed row is medium confidence. Under a stricter interpretation
where only incoming stale request payloads count, it should be downgraded to
unimpacted or partial. Under a more generous interpretation that counts weak
CRDT-adjacent save-loop effects, the partial count could rise to roughly four
rows. Even that generous model leaves about 99% of weighted failures unfixed.

## Rows likely fixed or partially mitigated

| Row | STATUS count | Classification | Rationale |
| ---: | ---: | --- | --- |
| 99 | 1 | Full, medium confidence | `rtc_save_response_clears_crdt_document_while_title_and_content_survive`. The trace evidence is narrow metadata loss: a save request carried a non-empty `_crdt_document`, the immediate REST response returned an empty `_crdt_document`, and title/content remained correct. A robust persisted-CRDT freshness guard should prevent this stale or empty CRDT-meta clobber. |
| 61 | 1 | Partial | `rtc_checkpoint_save_reload_partial_serialized_body_behind_visible_block_tree`. Stale `_crdt_document` snapshots are present, but the browser also serializes and persists only a stale/partial post body behind a fuller visible block tree. Rejecting stale CRDT meta helps one bad path but does not fix stale `post_content` serialization. |
| 90 | 1 | Partial, weak | `rtc_persisted_crdt_doc_ping_pong_save_loop`. Peers repeatedly save the same visible title/content with different `_crdt_document` metadata. Rejection/refetch may dampen server-side CRDT-meta ping-pong, but the remaining root cause appears to be dirty-state or noncanonical CRDT serialization churn. |

## Important near misses

These rows look related to persistence, but the proposed server-side mitigation
does not address the actual bad field or does not have a stale server-side
`_crdt_document` write to reject.

| Row | STATUS count | Why not counted as fixed |
| ---: | ---: | --- |
| 8 | 7 | Stale title/content are saved while `_crdt_document` has already advanced to the checkpoint state. A CRDT freshness check would likely accept the request. |
| 52 | 1 | Save response contains the checkpoint state, but later REST reads return stale title/content while `_crdt_document` is advanced. The failing field is canonical title/content state, not a stale CRDT-meta write. |
| 63 | 1 | Follow-up saves persist `content: ""` while `_crdt_document` remains populated. This is a stale full-record/content clobber, not proven stale CRDT meta. |
| 89 | 1 | Opening a fresh collaborative draft can persist foreign whole-record state. Because the fresh post has no meaningful prior `_crdt_document` base to compare against, a stale-CRDT CAS is not a reliable blocker. |
| 141 | 1 | Some reproductions have CRDT divergence, but at least one confirmation has matching CRDT while `content.raw` remains stale. This is at most partial under a broader interpretation. |
| 155 | 1 | Stale `post_content` is saved with a newer `_crdt_document`. The CRDT meta is not stale in the way the guard protects. |
| 156 | 1 | Stale title/content revert while the collaborative `_crdt_document` advances. The stale fields are outside the mitigation. |
| 187 | 3 | Save storm/stuck saving appears to come from local dirty-state and CRDT metadata churn, not from a clearly stale server-side `_crdt_document` overwrite. |
| 207 | 1 | The explicit save path either used old title/content or emitted no post save request in the realistic repro. A REST pre-insert guard cannot reject a request that is never sent. |
| 227 | 1 | `markEntityAsSaved()` changes serialized CRDT save metadata after a save, re-dirtying the entity. Server CAS does not canonicalize that local churn. |
| 243 | 1 | A second save reverts the title while keeping the newer body and current/newer CRDT state. The proposed mitigation does not lock `title`. |

## Denominator breakdown

The handoff is dominated by bug families outside persisted CRDT freshness.
The following buckets assign every manifest row once and sum to the manifest
totals of 279 rows and 452 weighted STATUS rows.

| Bucket | Rows | STATUS-weighted | Expected impact |
| --- | ---: | ---: | --- |
| Full fix candidate | 1 | 1 | Fixed if the mitigation blocks stale/empty `_crdt_document` clobbers, not only incoming stale request payloads. |
| Partial candidates | 2 | 2 | Some bad CRDT-meta writes are blocked, but independent bad title/content/body or dirty-state behavior remains. |
| Stale title/content/full-record save | 10 | 16 | Unimpacted. The stale fields are `title`, `content`, or the whole edited record, often paired with current/newer CRDT meta. |
| Empty/corrupt content or serialized markup | 32 | 69 | Unimpacted. The bad persisted field is `post_content` or block markup. |
| Title reload/autosave divergence | 24 | 45 | Unimpacted. Blocks and CRDT often already match while title state diverges. |
| Save-loop/dirty-state CRDT churn | 4 | 9 | Mostly unimpacted. Server rejection does not remove noncanonical local CRDT save metadata or repeated dirty-state scheduling. |
| `/wp-sync` OOM/transport/storage | 16 | 37 | Unimpacted. These are backend room history, polling, route, or update-delivery failures. |
| Table/Y.Array merge | 14 | 15 | Unimpacted. The failure is nested CRDT array merge behavior. |
| Revision/post-lock/code-editor/session | 8 | 8 | Unimpacted. These are different editor/session flows. |
| Live CRDT merge/stale-local/reconciliation | 168 | 250 | Unimpacted. The largest bucket: lost deletes, duplicated blocks, wrong moves, stale local snapshots, block identity smears, and nonconvergence before persistence freshness matters. |

## Sensitivity range

| Interpretation | Full | Partial | Unimpacted |
| --- | ---: | ---: | ---: |
| Strict incoming stale-CRDT request guard only | 0 | 2 | 277 |
| Best estimate | 1 | 2 | 276 |
| Broader CRDT-meta clobber and weak save-loop effects | 1 | 4 | 274 |
| Very generous CRDT-adjacent reading | 1 | about 8 | about 270 |

The strict and best-estimate models are the most defensible. The broader models
count rows where the fix may block a bad CRDT-meta write in some executions, but
the user-visible bug would still remain unless a separate save serialization,
title/content freshness, or dirty-state bug is fixed.

## Practical conclusion

The server-side mitigation is worth doing because it closes a real and dangerous
persistence race. It should not be expected to materially reduce the current
handoff backlog.

For planning purposes:

- expected fully fixed rows: 0-1;
- expected partially mitigated rows: 2, maybe 4 under a broader interpretation;
- expected unaffected rows: roughly 99% of the weighted handoff.

The next higher-leverage areas are live CRDT reconciliation, projection of live
collaborative state into `post_content`/`post_title` save payloads, title
reload/autosave state, and `/wp-sync` room-history storage limits.

## Second analysis: broader whole-entity server-side mitigation

The narrow mitigation above protects only `_crdt_document`. A broader
server-side mitigation would protect the saved post entity as a consistency
unit. This section estimates the impact of that broader class of mitigation.

For this second analysis, the assumed mitigation is:

- every save carries a server-issued base version for the whole post entity,
  covering at least `post_title`, `post_content`, `excerpt`, and
  `_crdt_document`;
- the server atomically rejects a save when any protected field changed since
  the submitted base version;
- `post_title`, `post_content`, `excerpt`, and `_crdt_document` are persisted
  as a single consistency bundle, not as independently fresh fields from
  different logical document states;
- the server validates cross-field consistency and rejects impossible payloads,
  for example `post_content: ""` while the submitted CRDT document projects to
  non-empty blocks, or stale title/content paired with a newer CRDT projection;
- semantically identical CRDT documents are canonicalized or treated as no-op
  writes so volatile save metadata cannot keep the entity dirty forever.

This still does not make the server an authoritative live CRDT merge engine.
It would not fix block move/delete/insert reconciliation bugs that happen
before save, table/Y.Array merge bugs, `/wp-sync` transport and storage bugs,
or revision/post-lock/session bugs.

### Expected impact

This broader mitigation would touch far more of the handoff than the narrow
`_crdt_document` CAS, but still far from a majority. There are two useful ways
to score it:

- **Bug-resolution score:** count a row as full when the server rejection plus
  client conflict handling should make the user-visible save failure or save
  loop disappear.
- **Durable-persistence containment score:** count rows where the server would
  prevent bad state from being durably written, even if the editor remains
  visibly corrupted or stuck until a client-side bug is fixed.

The bug-resolution estimate is:

| Outcome | Distinct rows | Fraction | STATUS-weighted | Weighted fraction |
| --- | ---: | ---: | ---: | ---: |
| Fully fixed | 9 / 279 | 3.23% | 18 / 452 | 3.98% |
| Partially mitigated | 30 / 279 | 10.75% | 42 / 452 | 9.29% |
| Unimpacted | 240 / 279 | 86.02% | 392 / 452 | 86.73% |

The durable-persistence containment estimate is broader:

| Outcome | Distinct rows | Fraction | STATUS-weighted | Weighted fraction |
| --- | ---: | ---: | ---: | ---: |
| Fully fixed | 1 / 279 | 0.36% | 1 / 452 | 0.22% |
| Partially mitigated or contained | about 46 / 279 | about 16.49% | about 94 / 452 | about 20.80% |
| Unimpacted | about 232 / 279 | about 83.15% | about 357 / 452 | about 78.98% |

The difference is mostly classification, not disagreement about mechanism. A
server can often reject a stale or inconsistent save, preventing durable data
loss. Whether that is a "full fix" depends on whether the client can refetch,
reconcile, and retry to a clean user-visible state.

### Layered impact

| Mitigation layer | Rows touched | Weighted count | Expected effect |
| --- | ---: | ---: | --- |
| Narrow `_crdt_document` CAS from the first analysis | 3 | 3 | Fixes or partially mitigates only direct stale CRDT-meta persistence. |
| Whole-record optimistic concurrency | about 9 | about 15 | Rejects stale title/content/full-record saves when the client is saving from an old base or pairing old fields with a newer CRDT projection. |
| Cross-field consistency validation | about 24-32 | about 34-69 | Rejects empty, stale, or malformed `post_content` when the submitted CRDT or server base proves the payload is inconsistent. The lower number counts likely bug-resolution rows; the higher number counts durable-persistence containment. |
| CRDT canonical/no-op save handling | about 4-5 | about 7-10 | Reduces or fixes save-loop and dirty-state failures caused by semantically identical but byte-different CRDT metadata. The wider range depends on whether row 187 is treated as CRDT churn or as a broader save-storm failure. |
| Server-owned CRDT materialization | not counted separately | not counted separately | Could convert some partials into full fixes, but only if the server can authoritatively materialize title/content from a valid CRDT state. |

### Candidate rows by impact class

The rows most likely to move from unimpacted to fixed or partially mitigated
are the persistence/save-path rows, not the live merge rows.

| Row set | Rows | Weighted | Why the broader mitigation helps |
| --- | ---: | ---: | --- |
| Likely full fixes from stale title/content/full-record rejection | 4 | 10 | Rows 8, 155, 156, and 243 explicitly show stale title/content accepted while `_crdt_document` had advanced. Whole-record concurrency or title/content-vs-CRDT projection validation should reject these saves and force a refetch/retry. |
| Likely full fixes from CRDT canonical/no-op save handling | 4 | 7 | Rows 23, 45, 90, and 227 are save-loop/churn cases where visible title/content are stable and only CRDT metadata keeps changing. Canonical semantic no-op handling should let these saves settle. |
| Existing direct CRDT-meta clobber | 1 | 1 | Row 99 remains the cleanest full fix candidate. |
| Stale/inconsistent whole-record cases with weaker evidence | 5 | 5 | Rows 52, 63, 89, 141, and 207 are likely partials. The server can prevent some bad persistence, but evidence suggests remaining client-side stale save, fresh-post contamination, or no-request behavior. |
| Empty/corrupt content or serialized markup, likely bug-resolution subset | 24 | 34 | Rows 15, 18, 29, 32, 37, 40, 43, 54, 60, 61, 62, 64, 67, 69, 94, 136, 138, 196, 211, 212, 216, 228, 241, and 242 can likely be protected from durable bad writes, but live editor corruption may remain. |
| Additional content/serialization containment rows | about 8 | about 35 | A stricter bug-resolution score leaves these out; a data-loss-containment score includes additional malformed or partial persistence cases where the server can reject bad durable state but not repair the originating client state. |
| Stuck-save case with mixed evidence | 1 | 3 | Row 187 may improve under CRDT canonical/no-op handling, but the trace also includes unresolved requests and save-storm behavior beyond a simple stale write. |

Rows 207 and 240 are the weakest cases in this broader model. Row 207 is
included only in the partial range because the fuzz trace has stale explicit
save evidence; its realistic repro emits no useful post save request, so the
server has nothing to reject in that reproduction. Row 240 persists a checkpoint
correctly but leaves live editors on stale state, so whole-record persistence
does not address the visible bug and it is not counted above.

### Why the broader mitigation still leaves most rows unfixed

The largest bucket remains live CRDT merge and stale-local reconciliation:
168 rows, 250 weighted STATUS failures. These include lost deletes, duplicated
blocks, wrong move targets, block identity smears, stale local snapshots, and
nonconvergence. A whole-record server save guard may prevent some corrupted
states from becoming durable, but it cannot decide which live block tree is
correct without becoming the authoritative CRDT merge participant.

The other large unaffected buckets also remain outside this server-side save
guard:

- title reload/autosave divergence: 24 rows, 45 weighted;
- `/wp-sync` OOM/transport/storage: 16 rows, 37 weighted;
- table/Y.Array merge: 14 rows, 15 weighted;
- revision/post-lock/code-editor/session: 8 rows, 8 weighted.

### Practical conclusion for the broader mitigation

A whole-entity server-side persistence guard is a much higher-leverage
mitigation than `_crdt_document` CAS alone. Under a bug-resolution score, it
could plausibly fully fix about 3-4% of rows and partially mitigate another
9-11%. Under a data-loss-containment score, it could touch about one sixth of
distinct handoff rows and about one fifth of weighted failures, mostly by
preventing stale or internally inconsistent saves from becoming durable.

It should be treated as a data-loss containment layer, not as a complete RTC
correctness fix. The dominant remaining work would still be client/live CRDT
reconciliation and transport/storage fixes.
