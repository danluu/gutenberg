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

## Second analysis: broader editor-content-bundle server-side mitigation

The narrow mitigation above protects only `_crdt_document`. A broader
server-side mitigation would protect the editor content bundle as one
consistency unit. In this report, "editor content bundle" means only:

- `post_title`;
- `post_content`;
- `excerpt`;
- post meta `_crdt_document`.

It does not mean the whole WordPress post object. This analysis does not assume
server-side protection for status, slug, taxonomies, featured media, template,
autosaves, revisions, post-lock state, or editor preferences.

### Assumed design

For this second analysis, the assumed mitigation has three layers:

1. **Atomic bundle versioning.** Each edit-context REST response returns an
   opaque server version for the editor content bundle. Each save submits the
   base version it was derived from. The server rejects the save if any
   protected field changed since that base version.
2. **Atomic bundle persistence.** The server commits `post_title`,
   `post_content`, `excerpt`, and `_crdt_document` as one guarded bundle. This
   likely needs a real DB-level version row/counter or transaction-like guard,
   because WordPress post fields and post meta are not naturally one atomic
   storage unit.
3. **Cross-field validation and CRDT no-op handling.** The server rejects
   internally inconsistent bundles when it can prove they are inconsistent,
   and treats semantically identical CRDT persistence writes as no-ops instead
   of dirtying the entity forever.

The third layer has important constraints:

- A version conflict catches lost updates, but it does not by itself catch a
  client that submits stale `post_content` and a newer `_crdt_document` from
  the same base. Those cases need projection or cross-field validation.
- Projection validation assumes the server can deterministically decode enough
  of `_crdt_document` to compare it with `post_title`/`post_content`. If title
  is not represented in the CRDT document, title validation must come from the
  bundle version, not from CRDT projection.
- Validation must avoid false positives for legitimate empty posts, code
  editor flows, invalid/freeform blocks, synced/reusable blocks, autosaves, and
  partial-save flows. Empty `post_content` with a non-empty `_crdt_document` is
  not automatically invalid; the server should reject only contradictions it
  can prove from the decoded CRDT projection and submitted bundle base.
- CRDT no-op handling cannot simply ignore byte differences. It must ignore
  only volatile save metadata, or use a safe semantic equality rule that does
  not discard causal CRDT state.

This broader mitigation still does not make the server an authoritative live
CRDT merge participant. It does not fix block move/delete/insert reconciliation
before save, table/Y.Array merge bugs, `/wp-sync` transport/storage failures,
or revision/post-lock/session bugs.

### Current implementation gap this would close

The current narrow stale-CRDT work is a useful starting point but is not this
broader mitigation. In the current branch:

- `lib/compat/wordpress-7.0/collaboration.php` validates only the
  `_crdt_document` meta value. The server computes a version from the serialized
  CRDT `document` field, accepts writes whose `baseVersion` matches the current
  document, and rejects stale CRDT meta writes with
  `rest_crdt_document_stale`.
- The same file hooks both REST pre-insert and post-meta add/update paths, but
  it does not create an atomic transaction across `wp_posts.post_title`,
  `wp_posts.post_content`, `wp_posts.post_excerpt`, and post meta.
- `packages/core-data/src/actions.js` already has client handling for
  `rest_crdt_document_stale`: refetch, apply the persisted CRDT document,
  recompute edits, and retry. A broader bundle guard would need the same
  conflict-repair behavior for a new whole-bundle conflict code.
- `packages/core-data/src/entities.js` already tries to reduce stale saves by
  fetching the latest record, applying the latest persisted CRDT, and merging
  stale serialized block content before save. That logic is best-effort and
  explicitly does not block saving if the freshness check fails.
- `packages/sync/src/utils.ts` serializes CRDT docs with a random `updateId`
  plus a semantic `version` derived from the document payload. A no-op save-loop
  fix needs to preserve or ignore only volatile wrapper metadata such as
  `updateId`; it must not throw away real Yjs causal state. Some save markers
  are written inside the Y.Doc itself, so the no-op rule cannot be a simple
  JSON-wrapper comparison.

The broader mitigation therefore needs a new server-side invariant, not just a
larger version of the current `_crdt_document` check. The invariant is: "this
save was derived from the same editor-content-bundle state that is still
current at commit time, and the submitted bundle is internally coherent."

### Expected impact: bug-resolution score

This score counts a row as **full** only when the broader server mitigation
plus client conflict handling should make the user-visible save failure or save
loop disappear. It counts a row as **partial** when the server can prevent or
reduce durable bad persistence, but the editor may still be visibly corrupted,
divergent, or stuck until a client/live-merge bug is fixed.

| Outcome | Distinct rows | Fraction | STATUS-weighted | Weighted fraction |
| --- | ---: | ---: | ---: | ---: |
| Fully fixed | 9 / 279 | 3.23% | 17 / 452 | 3.76% |
| Partially mitigated | 28 / 279 | 10.04% | 41 / 452 | 9.07% |
| Unimpacted | 242 / 279 | 86.74% | 394 / 452 | 87.17% |

### Mechanism sensitivity

The 9/28/242 estimate assumes all three layers in the assumed design exist.
If the implementation ships only part of the design, the impact drops quickly.

| Implemented layer | Rows improved | Weighted | What it actually catches |
| --- | ---: | ---: | --- |
| Current narrow `_crdt_document` stale guard only | 3 | 3 | Direct stale CRDT-meta writes; this is the first-section result. |
| Atomic bundle versioning only | about 9-14 | about 15-20 | Lost updates where the bad save is based on an older title/content/CRDT bundle. It does not detect a self-consistent but wrong bundle. |
| Bundle versioning plus projection validation | about 34-39 | about 55-60 | Adds many empty, malformed, stale, or content-vs-CRDT inconsistent save payloads, but mostly as partial fixes because live editor state can already be broken. |
| Bundle versioning plus safe CRDT no-op persistence | about 13-18 | about 22-30 | Adds the CRDT save-loop rows if semantically identical documents stop dirtying the entity. |
| Full assumed mitigation | 37 bug-resolution rows | 58 | The 9 full plus 28 partial rows in the table above. |
| Full assumed mitigation plus containment-only rows | 45 touched rows | 93 | Adds weak cases where durable bad writes can be rejected, but the visible bug is still live CRDT or reload instability. |

Two downgrade rules matter:

- Without client refetch/reconcile/retry after a bundle conflict, many "full"
  stale-save rows become partial operationally: the server prevents the bad
  write, but the user may still see a failed save.
- Without server-side projection or cross-field checks, stale `post_content`
  paired with a current/newer `_crdt_document` can still pass a pure version
  check if the client generated both fields from the same stale local view.

#### Full candidates

| Row set | Rows | Weighted | Why these can become full fixes |
| --- | ---: | ---: | --- |
| Stale title/content/full-record writes | 5 | 11 | Rows 8, 52, 155, 156, and 243 show stale title/content, stale reads after an apparently correct save response, or double-PUT clobbering while `_crdt_document` had advanced. Bundle versioning, atomic bundle persistence, or title/content-vs-CRDT consistency should reject these writes and force a refetch/retry. |
| CRDT save-loop churn | 3 | 5 | Rows 23, 90, and 227 repeatedly save stable visible title/content while only CRDT save metadata changes. Safe CRDT canonical/no-op handling should let these saves settle. |
| Direct CRDT-meta clobber | 1 | 1 | Row 99 remains the cleanest direct metadata clobber case. |

Full candidate row IDs:

- `8`, `23`, `52`, `90`, `99`, `155`, `156`, `227`, `243`.

Full-fix preconditions by mechanism:

| Rows | Required server behavior | Required client behavior | Main downgrade risk |
| --- | --- | --- | --- |
| `8`, `52`, `155`, `156`, `243` | Reject stale title/content/full-bundle writes even when `_crdt_document` is current or newer, and prevent a later partial post/meta commit from splitting the bundle. | Refetch the current bundle, reapply the local CRDT/editor changes, recompute title/content/meta, and retry. | If the bad payload is internally consistent and carries a current bundle token, only stronger projection or document-identity checks can catch it. |
| `23`, `90`, `227` | Treat same-document CRDT persistence as a no-op despite volatile wrapper metadata. | Stop marking the record dirty after a no-op CRDT persistence response. | If byte-different CRDT documents contain meaningful causal state, no-op handling is unsafe and these rows fall back to partial or unimpacted. |
| `99` | Prevent `_crdt_document` from being cleared or clobbered while title/content survive. | Retry or refresh after the conflict response. | If the clear comes through a path that bypasses REST/meta guards, this is only partial. |

#### Partial candidates

| Row set | Rows | Weighted | Why these remain partial |
| --- | ---: | ---: | --- |
| Stale/inconsistent bundle cases with weaker evidence | 2 | 2 | Rows 63 and 141 likely benefit from rejecting bad persistence, but the evidence also points at stale client state, title split behavior, reload/read-after-save divergence, or CRDT divergence without content repair. |
| Empty/corrupt content or serialized markup | 24 | 34 | Rows 15, 18, 29, 32, 37, 40, 43, 54, 60, 61, 62, 64, 67, 69, 94, 136, 138, 196, 211, 212, 216, 228, 241, and 242 can likely be protected from durable bad writes, but the live editor state that generated the bad payload may still be collapsed or corrupted. |
| Stuck-save/canonicalization with mixed evidence | 2 | 5 | Rows 45 and 187 may improve under CRDT no-op handling, but row 45 also looks like entity/HTML normalization churn and row 187 has unresolved requests and broader save-storm behavior. |

Partial candidate row IDs:

- `15`, `18`, `29`, `32`, `37`, `40`, `43`, `45`, `54`, `60`,
  `61`, `62`, `63`, `64`, `67`, `69`, `94`, `136`, `138`, `141`,
  `187`, `196`, `211`, `212`, `216`, `228`, `241`, `242`.

Partial rows fall into three different failure shapes:

| Rows | What the server can contain | What remains unfixed |
| --- | --- | --- |
| `63`, `141` | Stale persisted title/content/CRDT combinations can be rejected when they conflict with the current bundle version or projection. | The traces also show reload/read-after-save divergence and stale client/editor state, so save rejection alone may not get collaborators back to a clean state. |
| `15`, `18`, `29`, `32`, `37`, `40`, `43`, `54`, `60`, `61`, `62`, `64`, `67`, `69`, `94`, `136`, `138`, `196`, `211`, `212`, `216`, `228`, `241`, `242` | Empty content, malformed block comments, flattened content, or stale serialized markup can be refused when the submitted CRDT/server base proves the payload is impossible. | The editor or CRDT state that generated the bad serialized content can still be collapsed, malformed, or divergent. |
| `45`, `187` | Same-document CRDT churn may be reduced. | Row 45 also requires deterministic HTML/entity/block-attribute canonicalization across parse, serialize, CRDT projection, and REST persistence. Row 187 also has unresolved request/save-storm behavior, so no-op handling may only reduce symptoms. |

### Durable-persistence containment score

A looser data-loss-containment score asks a different question: would the
server prevent bad state from being durably written, even if the editor still
needs client-side repair? Under that score, add eight weak partial rows:

- `2`, `5`, `17`, `19`, `27`, `56`, `57`, `100`.

These add 8 distinct rows and 35 weighted STATUS failures. They are not counted
in the bug-resolution partial set because the evidence points more strongly at
live CRDT corruption or save/reload instability than at a server-invariant
violation the mitigation can reliably resolve.

| Durable containment outcome | Distinct rows | Fraction | STATUS-weighted | Weighted fraction |
| --- | ---: | ---: | ---: | ---: |
| Bug likely resolved | 9 / 279 | 3.23% | 17 / 452 | 3.76% |
| Bad durable save contained, not fully resolved | 36 / 279 | 12.90% | 76 / 452 | 16.81% |
| Still unaddressed | 234 / 279 | 83.87% | 359 / 452 | 79.42% |

Total rows touched under this containment score: 45 / 279 rows, or 16.13%.
Weighted total touched: 93 / 452 STATUS rows, or 20.58%.

The containment-only rows are excluded from the bug-resolution table because
their saved-state symptoms are downstream of earlier live-state corruption.
They are an upper-bound sensitivity set, not rows the server would certainly
contain:

| Rows | Weighted | Why containment-only |
| --- | ---: | --- |
| `2`, `5`, `17`, `19`, `27` | 32 | These are checkpoint/save/reload corruption families where the server may refuse a later bad durable write, but the block tree has already diverged or corrupted before persistence. |
| `56`, `57`, `100` | 3 | These are weaker save/reload cases where stale or missing body state may be contained, but the evidence does not prove a server-invariant violation sufficient for bug resolution. |

If the live CRDT state itself has already lost, duplicated, or malformed the
content, bundle validation may faithfully accept the wrong state.

Complete accounting bridge:

| Bucket | Rows | Weighted |
| --- | ---: | ---: |
| Full bug resolution | 9 | 17 |
| Partial bug-resolution mitigation | 28 | 41 |
| Additional containment-only sensitivity rows | 8 | 35 |
| Excluded near-miss buckets listed below | 234 | 359 |
| Total manifest | 279 | 452 |

### Important excluded near misses

The remaining rows are not counted because the proposed server bundle guard
does not address their root cause.

| Excluded bucket | Rows | Weighted | Why excluded |
| --- | ---: | ---: | --- |
| Title reload/autosave/session title state | 24 | 45 | Blocks and CRDT often already match, while title rehydration or local autosave state diverges. Server save validation does not fix reload/session title state. |
| `/wp-sync` transport/OOM/storage | 16 | 37 | These are update delivery, room-history, route, or memory failures, not editor-content-bundle save consistency. |
| Table/Y.Array merge | 14 | 15 | The bad state comes from nested CRDT array merge behavior before server persistence. |
| Revision/post-lock/code-editor/session | 8 | 8 | Different editor/session flows, not normal collaborative post save consistency. |
| Live CRDT merge/stale-local/reconciliation | 168 | 250 | Lost deletes, duplicated blocks, wrong moves, stale local snapshots, block identity smears, and nonconvergence happen before the server can validate a save. |
| Fresh-post foreign document contamination | 1 | 1 | Row 89 can submit title/content/CRDT that are internally consistent for the wrong collaborative document. Containing it requires document identity, room scoping, or post-bound CRDT provenance in addition to bundle versioning. |
| No useful post save request | 1 | 1 | Row 207's realistic repro leaves REST state unchanged without emitting a post save request, so a REST pre-insert guard cannot resolve that user-visible failure. |
| Other unaddressed residual | 2 | 2 | Remaining rows outside the touched sets and major near-miss buckets. |

Row 240 is a useful example of the exclusion rule. It persists a checkpoint
correctly, but leaves live editors on stale state. Whole-bundle server
persistence does not address that visible bug.

The dominant excluded category is not "saves the server failed to reject"; it
is "the live shared document is already wrong." For those rows, a successful
server rejection changes the persistence outcome but not the causal bug. The
server would need to become a live CRDT arbiter, or the client merge code would
need to stop producing the wrong block tree, before those rows move into the
fixed category.

### Implementation risks that affect the estimate

The estimate above assumes a stronger implementation than a conventional REST
pre-insert validation callback:

- The bundle version has to be checked at commit time, or a race can pass
  validation and then be invalidated by another request before post fields and
  meta are written.
- Post fields and post meta need a shared version. A version stored only in
  `_crdt_document` cannot protect title/content writes that omit or preserve
  CRDT meta.
- A guard implemented only as `rest_pre_insert_*` plus meta filters is not
  enough for atomicity. In the normal REST post flow, post fields can be written
  before meta is updated; discovering the conflict at meta-update time can leave
  a split bundle unless the write path can roll back or commit atomically.
- `post_modified`/`post_modified_gmt` are weak bundle versions: they have coarse
  granularity and are affected by unrelated post updates, server filters,
  autosaves, and plugin writes.
- The server needs to decide what to do with partial saves. Saving only title,
  only content, autosaves, revisions, and code-editor flows cannot all be
  treated as normal collaborative bundle commits.
- PHP currently parses/checksums the serialized CRDT JSON wrapper; it does not
  decode the Yjs document enough to validate title/content projection. Adding
  projection validation is therefore a new server capability.
- Projection validation needs a narrow, auditable rule set. A false positive
  that rejects legitimate empty content or invalid/freeform block repair would
  be worse than leaving that row partial.
- A no-op CRDT write should ideally preserve the current stored meta value or
  return a response that does not make the client dirty again. Merely accepting
  a same-document write with a new `updateId` may continue the save loop.
- REST-only protection must define bypass policy for classic editor, WP-CLI,
  XML-RPC, direct `wp_update_post()`, plugin meta writes, autosaves, and
  revision restore. Otherwise those paths can change part of the bundle without
  bumping or checking the bundle version.

### Practical conclusion for the broader mitigation

The broader mitigation is much higher leverage than `_crdt_document` CAS alone,
but it is still primarily a persistence containment layer.

Under the bug-resolution score, it could plausibly fully fix about 3% of
manifest rows and partially mitigate another 10%. Under the durable containment
score, it could touch about one sixth of distinct rows and about one fifth of
weighted failures.

The remaining majority is still client/live-system work: live CRDT
reconciliation, table/Y.Array merge behavior, title reload/autosave state,
`/wp-sync` transport and storage, and revision/session flows.
