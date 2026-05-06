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

This is better described as a bundle protocol than as a pure server CAS. A pure
CAS detects only "my base bundle is older than the currently persisted bundle."
Several credited rows also need projection checks, read-set/write-set intent,
and CRDT no-op settlement. Those are separate mechanisms and are separated
below because their failure modes differ.

Operationally, the three layers above break down into separate protocol
concerns: bundle CAS, atomic protected-field commit, read/write-set discipline,
validation-only projection, server-side materialization from CRDT, CRDT no-op
settlement, and post-bound CRDT provenance. The base estimate assumes bundle
CAS, atomic commit, read/write-set discipline, validation-only projection, and
no-op settlement. It does not assume server materialization from CRDT or
post-bound provenance except where explicitly called out as stronger variants.

The third layer has important constraints:

- A version conflict catches lost updates, but it does not by itself catch a
  client that submits stale `post_content` and a newer `_crdt_document` from
  the same base. Those cases need projection or cross-field validation.
- Projection validation assumes the server can deterministically decode enough
  of `_crdt_document` to compare it with `post_title`/`post_content`. If title
  is not represented in the CRDT document, title validation must come from the
  bundle version, not from CRDT projection.
- Projection validation must compare fields inside the same submitted
  editor-content bundle after the bundle base token has been validated. It
  should not compare incoming `post_content` against the current persisted CRDT
  projection as a standalone rule, because legitimate edits can intentionally
  differ from the current projection.
- Validation must avoid false positives for legitimate empty posts, code
  editor flows, invalid/freeform blocks, synced/reusable blocks, autosaves, and
  partial-save flows. Empty `post_content` with a non-empty `_crdt_document` is
  not automatically invalid; the server should reject only contradictions it
  can prove from the decoded CRDT projection and submitted bundle base.
- Safe projection rejects are narrow: submitted title/excerpt disagreeing with
  the submitted CRDT projection, an explicit content write that is empty when
  the same submitted CRDT deterministically projects to non-empty ordinary
  blocks, or malformed/flattened block markup that cannot be the serialization
  of the submitted CRDT's valid ordinary block tree. Omitted fields in a
  partial save mean "not writing that field"; they are not contradictions.
  Byte-for-byte HTML differences, parser normalization, default blocks,
  freeform/invalid block repair, deprecated block migrations, filters, and
  unregistered blocks are not enough by themselves.
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
  fix can ignore wrapper-only churn such as `updateId`, but save markers such
  as `savedAt` and `savedBy` are written inside the Y.Doc itself. Those fields
  help drive save awareness/refetch behavior, so the no-op rule cannot be a
  simple JSON-wrapper comparison or a blanket "same rendered content" test.

More detailed code-path constraints:

- Normal editor saves materialize `content` from
  `select.getEditedPostContent()` immediately before `saveEntityRecord()`
  (`packages/editor/src/store/actions.js`). `blocks` is transient and does not
  go to REST as the authoritative saved value. A server mitigation that wants
  to reject or repair empty/corrupt content must therefore inspect the actual
  submitted `content` field or independently materialize content from CRDT.
- `prePersistPostType()` adds `_crdt_document` later in Core Data
  (`packages/core-data/src/entities.js`) and the current best-effort stale-save
  protection runs only for `post`/`page`, only when `title`, `excerpt`, or
  `content` is edited. It fetches latest state, may apply latest CRDT and
  rewrite saved fields, and intentionally swallows freshness-check failures.
- Core Data autosaves bypass `__unstablePrePersist`; they build a payload from
  `title`, `excerpt`, `content`, and existing `meta` and POST it to the
  autosaves endpoint. Gutenberg's RTC autosave override updates the parent
  post only for auto-draft promotion; otherwise autosaves are per-user
  revisions.
- `_crdt_document` is registered with revisions disabled, while revision
  restore applies `title`, `excerpt`, `content`, and available `meta` from the
  revision and then saves. Revision restore therefore needs an explicit bundle
  invalidation/rebase policy; it cannot rely on revisioned CRDT meta.

The broader mitigation therefore needs a new server-side invariant, not just a
larger version of the current `_crdt_document` check. The invariant is: "this
save was derived from the same editor-content-bundle state that is still
current at commit time, and the submitted bundle is internally coherent."

### Implementability: plugin hooks vs real commit-time CAS

The current Gutenberg plugin surface can prototype tokens, preflight
validation, client retry, and shadow-mode telemetry. It cannot, by ordinary
hooks alone, make the normal WordPress REST post save path a true commit-time
editor-content-bundle CAS.

The existing stale-CRDT guard runs in two kinds of places:

- `rest_pre_insert_{$post_type}` can reject before `wp_update_post()`, but it
  cannot prove the bundle is still current when the post row is actually
  written.
- `update_post_metadata` and `add_post_metadata` filters can reject
  `_crdt_document` meta writes, but those filters run during the separate meta
  update path, after the REST controller may already have written
  `post_title`, `post_content`, or `post_excerpt`.

The core REST post update path is split: the controller prepares the post,
calls `wp_update_post()`, and then handles side effects such as format,
featured media, terms, meta, additional fields, `rest_after_insert_*`, and
`wp_after_insert_post()`. `wp_update_post()` ultimately updates the `wp_posts`
row without a bundle-token predicate, and REST meta persistence calls the meta
API separately. A stale request can therefore pass preflight and be invalidated
before the post row write, or a later meta conflict can be discovered after
post fields have already changed.

A plugin-level lock could serialize cooperating REST requests, and a custom
Gutenberg endpoint could prototype a stricter transactional write. That is not
the same as making the normal WordPress post save path CAS-protected.
Non-participating writes through Classic Editor, WP-CLI, XML-RPC,
`wp_update_post()`, direct meta APIs, autosaves, revision restore, and other
plugins would still need explicit invalidation or token-bump policy.

Therefore the robust version of this mitigation should be treated as a
WordPress core REST/controller/database change, or as a new dedicated
controller that owns the whole editor-content-bundle commit. It needs a
server-owned monotonic bundle version, a commit-time predicate in the same
database operation or transaction that writes the protected fields, and defined
rollback/error behavior for every post/meta side effect.

Implementation options have different mitigation value:

| Architecture | What it can do | What it cannot do | Impact implication |
| --- | --- | --- | --- |
| Plugin preflight using REST/meta filters | Reject some obviously stale or malformed requests before normal REST writes, and reject stale `_crdt_document` meta writes. | Guarantee commit-time freshness or atomicity across post fields and meta. | Useful shadow/prototype path, but too weak for the base estimate. |
| Plugin-level cooperative lock | Serialize Gutenberg RTC clients that use the normal REST path. | Cover non-participating writers, direct `wp_update_post()`, WP-CLI, XML-RPC, Classic Editor, or plugin writes; recover from process death without careful lock expiry. | Reduces races among cooperating clients, but still needs token invalidation for external writes. |
| Bundle version stored as post meta | Maintain an opaque version in familiar storage. | Atomically update `wp_posts` fields and the version meta together through normal REST flow. | Can expose/read a token, but is not sufficient for commit-time CAS by itself. |
| Dedicated bundle-version table/row | Provide a monotonic version and a row that can be locked or CAS-updated. | Automatically make the existing REST controller write post fields and meta transactionally. | Good primitive for a dedicated endpoint or core change; weak if only observed by filters. |
| Dedicated RTC bundle endpoint | Own the whole guarded write, including post fields, `_crdt_document`, token advance, and rollback. | Automatically protect legacy and non-RTC write paths unless they also invalidate the token. | Plausible Gutenberg-first implementation if normal REST saves are routed through it for RTC clients. |
| Core REST/controller/database change | Put the CAS predicate and protected-field commit inside the normal post update path. | Avoid defining policy for legacy partial writes, autosaves, revisions, and plugin side effects. | Closest to the base estimate's assumptions. |

The practical migration path is therefore: prototype with preflight/shadow
telemetry, add token-aware client retry, introduce a dedicated guarded RTC save
path or core commit primitive, then treat every unguarded writer as a token
invalidator until it participates in the protocol.

### Concrete mitigation shape

The impact estimates below assume an implementation closer to a guarded commit
protocol than to another validation filter:

1. **Read shape.** Edit-context REST responses expose an opaque
   `editor_content_bundle` object for the protected fields, for example a
   server-owned `token` plus `fields: [ "content", "title", "excerpt",
   "meta._crdt_document" ]`. The token is not `post_modified`, and should not
   be only a content hash. It should be a monotonic server-owned generation
   row/counter or equivalent CAS primitive. A hash of raw values is useful for
   diagnostics, but it cannot prove "no protected field changed since base" in
   ABA cases or when byte-different CRDT state renders the same content.
2. **Write shape.** Collaborative saves include the base bundle version, the
   intended protected-field write set, and the serialized `_crdt_document`,
   for example a private `_editor_content_bundle` write arg with `base_token`
   and `fields`. `_crdt_document.baseVersion` can remain as a compatibility
   guard, but the bundle token is the authoritative CAS token. The submitted
   write set matters: missing `content` means "do not change content", not
   "write empty content." Partial saves, autosaves, code-editor writes,
   revision restores, and non-REST writes either opt out explicitly or follow a
   separate policy that still bumps or invalidates the bundle version.
   The submitted token must be the base for every protected field being
   written. If the client can assemble `title`, `content`, and `_crdt_document`
   from different local snapshots, the protocol needs per-field generations or
   an explicit read-set/write-set contract. A fresh bundle token cannot prove
   that an individual submitted title is current unless that title was read
   from the same bundle generation.
3. **Commit shape.** The server checks the base token at the same point it
   commits `post_title`, `post_content`, `post_excerpt`, and `_crdt_document`.
   If the token is stale, no protected field changes. If validation passes, all
   protected fields commit together and the bundle version advances.
4. **Conflict response.** A rejected save returns a 409 carrying the current
   bundle version and enough current state for the editor to refetch, apply the
   persisted CRDT document, rematerialize title/content/meta, and retry. A
   retry loop must be bounded; repeated conflicts should surface a real editor
   error instead of silently spinning.
5. **Projection checks.** The server rejects only contradictions it can prove:
   for example, a submitted `post_content` that is explicitly empty while the
   submitted CRDT projection deterministically contains non-empty ordinary
   blocks. It does not reject merely because serialized HTML differs from a
   projection. It also does not compare incoming content against the current
   persisted CRDT projection except as part of a validated-base or
   conflict/refetch path.
6. **No-op CRDT persistence.** If the only difference is known-volatile save
   metadata, the server preserves or returns a stable stored CRDT representation
   so the client stops dirtying the post. If the incoming Yjs document contains
   additional causal state, the server must merge, reject/refetch, or accept it
   as a real update rather than discard it as a no-op.

No-op settlement needs an acknowledgement model, not just an equality
predicate. One safe direction is to move save-awareness metadata outside the
authoritative persisted CRDT document. Another is to preserve the current
stored CRDT value and return a separate "no semantic CRDT change accepted"
acknowledgement that lets the client mark the entity clean. The client must
not infer semantic no-op from rendered HTML equality alone; byte-different Yjs
state may carry clocks, delete sets, tombstones, or future merge information.

No-op policy affects row credit:

| Policy | Impact on rows `23`, `90`, `227`, `45` |
| --- | --- |
| Stale `_crdt_document` CAS only | `90` remains at most weak partial; `23`, `227`, and `45` are effectively unimpacted. |
| Wrapper-only no-op | Safely ignores JSON formatting, wrapper `updateId`, recomputable wrapper `version`, and `baseVersion` when embedded `document` bytes are identical; this is at most weak partial for `23`/`90` and does not fix `227` or `45`. |
| Proven save-marker-only no-op plus client dirty settlement | Counts `23`, `90`, and `227` as full; `45` remains partial. This requires proving the only causal Yjs difference is save-marker state, or moving save markers out of the persisted CRDT. |
| Same rendered title/content/block projection no-op | Unsafe and should not be credited; byte-different Yjs state can carry real causal information while rendering the same post. |
| CRDT no-op plus separate safe HTML/entity canonicalization | Could make `45` stronger, but that is an additional canonicalization fix outside CRDT no-op settlement alone. |

Under this design, rows are credited to the mitigation only when the bad state
passes through the guarded save path. Rows whose visible failure occurs before
save, or whose realistic repro emits no useful post update request, stay
unimpacted.

The field intent matters. A taxonomy/status-only save should not need the
bundle token and should not overwrite current content fields. Conversely, a
legacy full-record payload that includes stale protected fields should either
be rejected in strict RTC mode or have unlisted protected fields ignored by the
new RTC save path; otherwise the server can still persist stale fields merely
because the client sent a broad record object.

### Deeper mechanism split

The row estimates below use the full bundle protocol, not just a bundle CAS.
The mechanisms should be evaluated independently:

| Mechanism | What it proves | Rows it can credibly move | What remains if absent |
| --- | --- | --- | --- |
| Bundle CAS | The client's declared protected-field read base is still current at commit time. | Direct stale save rows such as `8`, `155`, `156`, `243`, plus direct CRDT-meta row `99`. | Same-token stale local payloads and internally coherent but wrong bundles still pass. CAS alone also does not prevent split post/meta writes. |
| Atomic protected-field commit | `post_title`, `post_content`, `post_excerpt`, and `_crdt_document` are committed or rejected as one unit. | Split post/meta persistence rows such as `52`, `63`, and `141`. | A conflict discovered during meta update can leave already-written `wp_posts` fields behind. |
| Read-set/write-set contract | The server validates the fields the client read, but mutates only fields the client intentionally writes. | Prevents broad REST record payloads from overwriting current title/content by accident. | A status, taxonomy, or meta-only save can still smuggle stale protected fields. |
| Projection/cross-field validation | The submitted serialized content is not provably impossible given the submitted CRDT document. | Empty, flattened, stale, or malformed persisted content rows such as `15`, `18`, `19`, `37`, `61`, `196`, `241`, and `242`. | Bad content can be saved with a fresh token if the client already generated a wrong payload. |
| CRDT no-op settlement | Repeated saves that only change known non-semantic persistence metadata settle without re-dirtying the entity. | Save-loop rows `23`, `90`, `227`, and weakly `45`. | The server may avoid data loss while the client still spins in `Saving`. |
| Post-bound CRDT provenance | The CRDT document belongs to this post/site/room generation. | A different server-side mitigation could address row `89`. | Bundle CAS alone cannot reject an internally coherent foreign document on a fresh post. |

This split changes the interpretation of the percentages. The headline
"full" rows are full only if the needed mechanism and client conflict/no-op
handling both exist. A server-only guard often turns a data-loss bug into a
visible save conflict, which is a partial mitigation unless the client
refetches, reapplies the user's intended edit, and clears dirty state.

### Protocol variants and impact ladder

The second mitigation should not be treated as a single switch. It is a ladder
of increasingly strong server protocols:

| Variant | Bug-resolution impact | Durable-containment impact | Main rows | Main limitation |
| --- | ---: | ---: | --- | --- |
| Current `_crdt_document` guard | 3 rows / 3 weighted touched | 3 rows / 3 weighted | `99`, `61`, `90` | Protects only CRDT meta freshness; stale title/content can still save. |
| Bundle CAS only | About 7-8 rows / 13-14 weighted touched | Same | `8`, `52`, `63`, `99`, `141`, `155`, `156`, `243` | Catches stale bases, but not same-token wrong serialization or CRDT no-op churn. If implemented only as pre-insert/meta filters rather than atomic commit-time CAS, the defensible set drops toward 5 rows / 11 weighted because split rows `52`, `63`, and `141` can still partially commit. |
| Bundle CAS plus read/write-set discipline | Same row count, higher confidence | Same | Same rows, especially `8`, `155`, `156`, `243` | Prevents broad payload clobbers, but still trusts submitted content. |
| Bundle CAS plus projection validation | About 33 rows / 51 weighted touched | About 33 rows / 51 weighted | Adds `15`, `18`, `19`, `29`, `32`, `37`, `40`, `43`, `54`, `60`, `61`, `62`, `64`, `67`, `69`, `94`, `136`, `138`, `196`, `211`, `212`, `216`, `228`, `241`, `242` | Mostly containment; live editor or CRDT state may already be wrong. |
| Full assumed bundle protocol | 37 rows / 58 weighted touched; 8 full, 29 partial | 43 rows / 89 weighted touched | Adds no-op rows `23`, `45`, `90`, `227` and containment-only rows `2`, `5`, `17`, `27`, `56`, `57` | Still not a live CRDT merge arbiter. |
| Server materializes saved fields from submitted CRDT | Base touched count unchanged; conservatively promotes 2 rows / 4 weighted from partial to full | Same or slightly higher confidence for content-loss rows | Strongest candidates: `29`, `196`; weaker candidates for stronger containment: `15`, `18`, `32`, `37`, `54`, `69`, `94`, `138` | Only helps when the submitted CRDT is correct. If CRDT already lost blocks, the server faithfully persists the wrong state. |
| Post-bound CRDT provenance | Adds 1 row / 1 weighted under a separate mitigation | Same | `89` | Rejects foreign-document contamination, but does not address stale saves or live merge bugs. |

The "server materializes saved fields from submitted CRDT" variant is stronger
than projection validation. Projection validation says "reject if impossible."
Materialization says "ignore the client's serialized `post_content` and derive
canonical `post_content`, and maybe title/excerpt, from the submitted CRDT."
That could turn rows such as `29` and `196` from partial to full because the
visible or CRDT state appears to retain blocks while the serialized save field
is wrong. Rows `15`, `18`, `32`, `37`, `54`, `69`, `94`, and `138` are weaker
materialization candidates for stronger containment, not proven full fixes.
Row `61` is deliberately not promoted here because its submitted
`_crdt_document` snapshots are described as stale; materializing from stale
CRDT can preserve the stale body. The materialization variant does not move
most empty/corrupt-content rows to full because many already have collapsed
live editors, malformed CRDT/block state, reload divergence, or missing
convergence before the save reaches the server.

The strongest materialization design can prove only this invariant: at commit
time, for the declared protected-field write set, every committed protected
field is either unchanged or equals the server's deterministic projection of
the accepted CRDT document under the server's declared projection policy.
Projection validation is weaker: it can reject only when a submitted protected
field is provably outside the accepted projection set of the submitted CRDT
document. Neither variant proves that the CRDT is correct, current relative to
live editor state, equivalent to every editor-side JavaScript serialization, or
equal to frontend rendered output.

This variant also raises the implementation bar substantially. The server would
need deterministic Yjs decoding, post entity extraction, block serialization,
block registry behavior, deprecated-block handling, invalid/freeform behavior,
and filter policy that match the editor closely enough not to corrupt valid
content. A mismatch between server materialization and editor serialization can
create a new data-loss path.

Safe materialization is limited to declared content-bundle fields: `post_title`
from decoded title state, `post_excerpt` from decoded excerpt state,
`post_content` from decoded ordinary block state using an editor-compatible
serializer, and `_crdt_document` as the accepted CRDT itself. The server should
not materialize rendered dynamic block HTML, expanded synced-pattern contents,
transient `blocks` editor state, status, slug, dates, author, featured media,
taxonomies, or arbitrary meta as part of this mitigation. Freeform, invalid,
deprecated, unregistered, dynamic, and filtered blocks should be treated as
opaque unless the server has a matching registry/filter policy and an explicit
safe projection rule.

The credited row groups depend on different mechanisms:

| Row group | Rows | Required mechanism | Why weaker variants are insufficient |
| --- | --- | --- | --- |
| Stale title/content/full-record saves | `8`, `155`, `156`, `243` | Commit-time bundle CAS, read/write-set discipline, and client repair; per-field base tracking or CRDT projection for mixed-base title/body cases. | `_crdt_document` CAS alone accepts current/newer CRDT meta paired with stale title/content. |
| Split or ambiguous post/meta persistence | `52`, `63`, `141` | Atomic protected-field commit plus conflict repair. | Preflight can pass and meta conflict can arrive after `wp_posts` fields changed. |
| Direct CRDT-meta clobber | `99` | `_crdt_document` guard or bundle CAS covering CRDT meta. | Does not require full projection, but bypass paths can still clobber meta. |
| Empty/corrupt serialized content | `15`, `18`, `19`, `29`, `32`, `37`, `40`, `43`, `54`, `60`, `61`, `62`, `64`, `67`, `69`, `94`, `136`, `138`, `196`, `211`, `212`, `216`, `228`, `241`, `242` | Projection validation for containment; server materialization only for the subset whose submitted CRDT remains trustworthy. | Bundle CAS cannot reject a fresh-token empty or malformed payload unless it is also stale. |
| CRDT save-loop settlement | `23`, `90`, `227`; weakly `45` | Proven save-marker-only no-op settlement plus client dirty-state handling. | Rendered-content equality is unsafe, and wrapper-only equality is too weak for `savedAt`/`savedBy` churn. |
| Containment-only live corruption | `2`, `5`, `17`, `27`, `56`, `57` | Same projection/commit machinery, but only as durable-write containment. | The visible/live CRDT bug happens before persistence, so rejecting a save does not repair the editor. |
| Foreign fresh-post contamination | `89` | Post-bound CRDT provenance. | A fresh post can have no stale bundle base; title/content/CRDT may be internally coherent for the wrong document. |

### Assumptions ledger

These assumptions are part of the base estimate. If they fail, downgrade the
affected rows before using the percentages as an implementation forecast.

| Assumption | Rows affected | Downgrade if false |
| --- | --- | --- |
| The server-owned token is checked at commit time, and protected post fields plus `_crdt_document` commit or reject as one unit. | `8`, `52`, `63`, `141`, `155`, `156`, `243`, `99` | Split post/meta rows become containment-only or unimpacted, and stale-save full rows become server-rejection-only partials. |
| Submitted protected fields are known to be derived from the same bundle token, or the protocol carries per-field base generations. | `8`, `155`, `156`, `243` | Fresh-token mixed-base title/body payloads can pass CAS; rows need projection, per-field tracking, or drop to partial/unimpacted. |
| Non-RTC, legacy, plugin, WP-CLI, Classic Editor, XML-RPC, autosave, and revision-restore writes bump or invalidate the bundle token. | All stale-save rows, plus unknown plugin paths | Guarded RTC clients can later overwrite external changes with apparently valid tokens. |
| Title and excerpt are either represented in CRDT projection or covered by bundle/per-field generations. | `8`, `52`, `63`, `155`, `156`, `243` | Projection cannot prove stale title/excerpt; only token-based evidence remains. |
| Projection validation is conservative for freeform, invalid, deprecated, unregistered, dynamic, filtered, and code-editor content. | Empty/corrupt-content partial rows | False positives make enforcement unsafe; these rows fall back to shadow-mode evidence or containment only. |
| Server materialization is used only when the submitted CRDT is trustworthy and projectable under the declared policy. | `29`, `196`, weaker candidates `15`, `18`, `32`, `37`, `54`, `69`, `94`, `138` | Materialization can faithfully persist already-wrong CRDT state, so it should not be credited as a full fix. |
| CRDT no-op settlement proves save-marker-only or wrapper-only churn and has client dirty-state acknowledgement. | `23`, `90`, `227` | Save-loop rows drop to partial or unimpacted. |
| Row `45` is credited only if the mitigation also includes safe HTML/entity/block canonicalization, not CRDT no-op alone. | `45` | Remove 1 partial row / 2 weighted from the base estimate if canonicalization is out of scope. |
| Client 409/no-op handling refetches, rebases, retries once, clears dirty state, and does not apply rejected payloads locally. | All full rows | Server-only rejection is durable containment, not full bug resolution. |
| Rows `52`, `56`, `57`, `69`, `141`, `155`, and `243` keep their current classification only when trace evidence confirms the guarded bad-save path. | `52`, `56`, `57`, `69`, `141`, `155`, `243` | Otherwise downgrade them to containment-only, partial, or unimpacted depending on whether the row is actually read-after-write, reload, title split, or live-CRDT divergence. |

The base estimate is intentionally cumulative: a row is first counted in
full, else partial, else containment-only, else excluded. It is not additive
across mechanism tables. For example, row `45` is in the partial count only
under the stronger no-op-plus-canonicalization assumption; under CRDT no-op
alone it should be removed from the bug-resolution numerator.

### Expected impact: bug-resolution score

This score counts a row as **full** only when the broader server mitigation
plus client conflict handling should make the user-visible save failure or save
loop disappear. It counts a row as **partial** when the server can prevent or
reduce durable bad persistence, but the editor may still be visibly corrupted,
divergent, or stuck until a client/live-merge bug is fixed.

| Outcome | Distinct rows | Fraction | STATUS-weighted | Weighted fraction |
| --- | ---: | ---: | ---: | ---: |
| Fully fixed | 8 / 279 | 2.87% | 16 / 452 | 3.54% |
| Partially mitigated | 29 / 279 | 10.39% | 42 / 452 | 9.29% |
| Unimpacted | 242 / 279 | 86.74% | 394 / 452 | 87.17% |

This is the base estimate, not a server-only estimate. It assumes both the
server-side invariants above and client behavior that turns 409/no-op responses
into a clean editor state.

Scoring definitions:

- **Full fix** means the user-visible save failure or save loop should
  disappear after client refetch/rebase/retry or CRDT no-op settlement.
- **Partial mitigation** means a bad durable write is blocked or reduced, but
  the editor may remain visibly corrupt, divergent, or failed-to-save.
- **Containment only** means possible database damage is avoided in some runs,
  but the causal live/editor bug remains.

| Estimate band | Fully fixed | Partially mitigated | Touched/contained | Interpretation |
| --- | ---: | ---: | ---: | --- |
| Strict bug-resolution | 6 rows / 14 weighted | 12 rows / 18 weighted | 18 rows / 32 weighted | Counts only the higher-confidence rows with direct stale-save, CRDT-churn, or empty/corrupt persistence evidence. |
| Base estimate | 8 rows / 16 weighted | 29 rows / 42 weighted | 37 rows / 58 weighted | The central estimate used in this section after the conservative row re-audit. |
| Optimistic durable-containment | 8 rows / 16 weighted | 29 rows / 42 weighted | 43 rows / 89 weighted | Adds containment-only rows where the server might block durable bad state but not resolve the visible bug. |

Strict full rows: `8`, `23`, `90`, `156`, `227`, `243`. Strict partial rows:
`15`, `18`, `37`, `54`, `60`, `61`, `64`, `67`, `196`, `211`, `241`,
`242`.

The deeper row re-audit changed classification, but not the total
bug-resolution touched count. Row `52` is now partial because the evidence is
stale later REST reads after an apparently good save response, not a proven
stale incoming bundle write. Row `19` moves from containment-only to partial
because the handoff reports a realistic UI-only persisted `content.raw` loss
that is comparable to other corrupted-persistence rows. Row `187` moves out of
partial because the manifest only proves reload plus second-save stuck-saving
behavior, not same-content CRDT-only churn. Row `100` leaves the containment
upper bound because its evidence is synthetic/fault-dependent merge corruption
and the closest realistic reduction converged cleanly.

### Mechanism sensitivity

The 8/29/242 estimate assumes all three layers in the assumed design exist.
If the implementation ships only part of the design, the impact drops quickly.

| Implemented layer | Rows improved | Weighted | What it actually catches |
| --- | ---: | ---: | --- |
| Current narrow `_crdt_document` stale guard only | 3 | 3 | One direct CRDT-meta clobber row plus two weak/partial CRDT-adjacent rows from the first analysis. |
| Atomic bundle versioning only | about 7-8 | about 13-14 | Named base-conflict candidates are `8`, `52`, `63`, `141`, `155`, `156`, and `243`; include row `99` only if the bundle token also covers direct CRDT-meta clobber. This does not detect a self-consistent but wrong bundle. |
| Bundle versioning plus projection validation | 33 | 51 | All bug-resolution rows except the CRDT no-op/canonicalization rows. This adds many empty, malformed, stale, or content-vs-CRDT inconsistent save payloads, but mostly as partial fixes because live editor state can already be broken. |
| Safe CRDT no-op/canonicalization handling | 4 | 7 | Rows `23`, `45`, `90`, and `227`, where semantically stable visible content may keep dirtying the entity through CRDT or canonicalization churn. |
| Full assumed mitigation | 37 bug-resolution rows | 58 | The 8 full plus 29 partial rows in the table above. |
| Full assumed mitigation plus containment-only rows | 43 touched rows | 89 | Adds weak cases where durable bad writes can be rejected, but the visible bug is still live CRDT or reload instability. |

Two downgrade rules matter:

- Without client refetch/reconcile/retry after a bundle conflict, many "full"
  stale-save rows become partial operationally: the server prevents the bad
  write, but the user may still see a failed save.
- Without server-side projection or cross-field checks, stale `post_content`
  paired with a current/newer `_crdt_document` can still pass a pure version
  check if the client generated both fields from the same stale local view.

Server-only protection is not enough for many credited rows:

| Rows | Server-side action | Client-side action required for full value |
| --- | --- | --- |
| `8`, `52`, `63`, `141`, `155`, `156`, `243` | Reject stale or internally inconsistent bundle writes. | Refetch, apply persisted CRDT, rematerialize title/content/meta, and retry or surface a clear conflict. Without this, credited rows become "bad write blocked but save failed." |
| `23`, `45`, `90`, `227` | Preserve or return a stable no-op CRDT representation when only non-semantic save metadata changed. | Stop marking the entity dirty after the no-op response. Without this, the server may accept harmless writes while the editor keeps spinning. |
| `15`, `18`, `19`, `29`, `32`, `37`, `40`, `43`, `54`, `60`, `61`, `62`, `64`, `67`, `69`, `94`, `136`, `138`, `196`, `211`, `212`, `216`, `228`, `241`, `242` | Reject provably empty, stale, flattened, or malformed durable content. | Repair the live editor state that generated the bad payload; otherwise the user may still see a collapsed or corrupt editor. |

Layer-specific downgrades:

| Missing layer | Rows downgraded | Expected downgrade |
| --- | --- | --- |
| Client conflict repair | `8`, `52`, `99`, `155`, `156`, `243` | Credited rows become weaker: the bad write is blocked, but the user-visible save may fail. |
| Projection/cross-field validation | `15`, `18`, `19`, `29`, `32`, `37`, `40`, `43`, `54`, `60`, `61`, `62`, `64`, `67`, `69`, `94`, `136`, `138`, `196`, `211`, `212`, `216`, `228`, `241`, `242` | Partial rows mostly become unimpacted because a pure version check cannot prove content is impossible. |
| Safe CRDT no-op settlement | `23`, `90`, `227`; also `45` | Full no-op rows become partial or unimpacted; weak partial save-loop rows mostly become unimpacted. |
| Atomic post-fields-plus-meta commit | `8`, `52`, `63`, `141`, `155`, `156`, `243` | Split bundles can still persist, so the server may only reduce some races. |
| Bypass policy for legacy/full-record/non-REST writes | `8`, `52`, `155`, `156`, `243`, plus unknown plugin paths | Stale protected fields can still be written outside the guarded RTC path. |

#### Full candidates

| Row set | Rows | Weighted | Why these can become full fixes |
| --- | ---: | ---: | --- |
| Stale title/content/full-record writes | 4 | 10 | Rows 8, 155, 156, and 243 show stale title/content or double-PUT clobbering while `_crdt_document` had advanced. Bundle versioning, atomic bundle persistence, or title/content-vs-CRDT consistency should reject these writes and force a refetch/retry. |
| CRDT save-loop churn | 3 | 5 | Rows 23, 90, and 227 repeatedly save stable visible title/content while only CRDT save metadata changes. Safe CRDT canonical/no-op handling should let these saves settle. |
| Direct CRDT-meta clobber | 1 | 1 | Row 99 remains the cleanest direct metadata clobber case. |

Full candidate row IDs:

- `8`, `23`, `90`, `99`, `155`, `156`, `227`, `243`.

Full-fix preconditions by mechanism:

| Rows | Required server behavior | Required client behavior | Main downgrade risk |
| --- | --- | --- | --- |
| `8`, `155`, `156`, `243` | Reject stale title/content/full-bundle writes even when `_crdt_document` is current or newer, and prevent a later partial post/meta commit from splitting the bundle. | Refetch the current bundle, reapply the local CRDT/editor changes, recompute title/content/meta, and retry. | If the bad payload is internally consistent and carries a current bundle token, only stronger projection, per-field base tracking, or document-identity checks can catch it. |
| `23`, `90`, `227` | Treat same-document CRDT persistence as a no-op despite volatile wrapper metadata. | Stop marking the record dirty after a no-op CRDT persistence response. | If byte-different CRDT documents contain meaningful causal state, no-op handling is unsafe and these rows fall back to partial or unimpacted. |
| `99` | Prevent `_crdt_document` from being cleared or clobbered while title/content survive. | Retry or refresh after the conflict response. | If the clear comes through a path that bypasses REST/meta guards, this is only partial. |

Full-fix confidence:

| Confidence | Rows | Weighted | Why |
| --- | --- | ---: | --- |
| Higher | `8`, `23`, `90`, `156`, `227`, `243` | 14 | These have direct evidence of stale accepted saves, repeated same-content CRDT save churn, or double-PUT clobbering that maps cleanly to the assumed guard or no-op behavior. |
| Medium | `99`, `155` | 2 | These fit the mechanism, but evidence is weaker: row 99 did not reproduce in isolated probes, and row 155 relies on archived trace evidence. |

#### Partial candidates

| Row set | Rows | Weighted | Why these remain partial |
| --- | ---: | ---: | --- |
| Stale/inconsistent bundle cases with weaker evidence | 3 | 3 | Rows 52, 63, and 141 likely benefit from rejecting bad persistence or split persistence, but the evidence also points at stale client state, title split behavior, reload/read-after-save divergence, or CRDT divergence without content repair. |
| Empty/corrupt content or serialized markup | 25 | 37 | Rows 15, 18, 19, 29, 32, 37, 40, 43, 54, 60, 61, 62, 64, 67, 69, 94, 136, 138, 196, 211, 212, 216, 228, 241, and 242 can likely be protected from durable bad writes, but the live editor state that generated the bad payload may still be collapsed or corrupted. |
| Stuck-save/canonicalization with mixed evidence | 1 | 2 | Row 45 may improve under CRDT no-op handling, but it also looks like entity/HTML normalization churn. |

Partial candidate row IDs:

- `15`, `18`, `19`, `29`, `32`, `37`, `40`, `43`, `45`, `52`, `54`,
  `60`, `61`, `62`, `63`, `64`, `67`, `69`, `94`, `136`, `138`, `141`,
  `196`, `211`, `212`, `216`, `228`, `241`, `242`.

Partial rows fall into three different failure shapes:

| Rows | What the server can contain | What remains unfixed |
| --- | --- | --- |
| `52`, `63`, `141` | Stale persisted title/content/CRDT combinations can be rejected when they conflict with the current bundle version or projection. | The traces also show reload/read-after-save divergence and stale client/editor state, so save rejection alone may not get collaborators back to a clean state. Row `52` is especially conditional because it may be read-after-write/cache behavior rather than raw DB split persistence. |
| `15`, `18`, `19`, `29`, `32`, `37`, `40`, `43`, `54`, `60`, `61`, `62`, `64`, `67`, `69`, `94`, `136`, `138`, `196`, `211`, `212`, `216`, `228`, `241`, `242` | Empty content, malformed block comments, flattened content, or stale serialized markup can be refused when the submitted CRDT/server base proves the payload is impossible. | The editor or CRDT state that generated the bad serialized content can still be collapsed, malformed, or divergent. Projection validation only helps when the submitted or validated-base CRDT projection is trustworthy; if the CRDT has already lost or duplicated blocks, the server can faithfully accept the wrong bundle. |
| `45` | Same-document CRDT churn may be reduced. | This also requires deterministic HTML/entity/block-attribute canonicalization across parse, serialize, CRDT projection, and REST persistence. |

Partial-fix confidence:

| Confidence | Rows | Why |
| --- | --- | --- |
| Higher containment confidence | `15`, `18`, `37`, `54`, `60`, `61`, `64`, `67`, `196`, `211`, `241`, `242` | The manifest summaries explicitly mention empty content, malformed markup, invalid serialized blocks, or save-looping after corrupted markup. A server invariant can plausibly refuse the durable write, even though live editor state remains suspect. |
| Medium containment confidence | `19`, `29`, `32`, `40`, `43`, `52`, `62`, `63`, `94`, `136`, `138`, `228` | These look like stale/empty/corrupt content persistence or split-persistence families, but many are downstream of reload, live CRDT collapse, title split behavior, or read-after-save ambiguity, so the server may only contain some runs. |
| Weak/conditional | `45`, `69`, `141`, `212`, `216` | These depend on details outside a simple bundle check: entity normalization, sync-fault/reload ambiguity, persisted CRDT divergence, or save-storm state. |

Representative decision evidence:

| Row | Decision | Evidence | Remaining blocker |
| ---: | --- | --- | --- |
| 8 | Full | Save persisted initial title and old content while `_crdt_document` had advanced. | Client still needs conflict refetch/reapply/retry after rejection. |
| 19 | Partial | Realistic UI-only repro lost checkpoint content from persisted `content.raw` after save/reload corruption. | The submitted CRDT may already be corrupt; projection helps only if a trusted submitted/base projection still contains the lost blocks. |
| 52 | Partial | Save response and editor had checkpoint state, but later REST reads returned original title/content while CRDT was advanced. | Intermittent; could be cache/read-after-write rather than raw DB split persistence, so atomic bundle persistence is only one possible fix. |
| 63 | Partial | Follow-up saves persisted `content: ""` with populated CRDT; realistic repro also showed title split. | Server can reject impossible persistence, but live save serialization/title state remains faulty. |
| 89 | Unimpacted | Fresh collaborative draft opened into title/content/CRDT from an unrelated document. | Incoming bundle can be internally coherent; needs document identity or room scoping. |
| 155 | Full, conditional | WebSocket save accepted stale pre-checkpoint content with checkpoint title and newer CRDT. | Needs title/content/CRDT bundle coverage; evidence is archived trace rather than durable UI repro. |
| 207 | Unimpacted | Realistic repro clicked Save draft but emitted no post save request and REST stayed unchanged. | Server cannot reject a missing request; dirty/save integration must be fixed client-side. |
| 45 | Partial | Save loop also involves entity/HTML normalization and attribute ordering. | Needs deterministic parser/serializer/CRDT projection canonicalization. |
| 187 | Unimpacted, weak near miss | Manifest evidence only proves reload plus second-save stuck-saving behavior. | No confirmed same-content CRDT-only churn; this likely needs client dirty-state or request lifecycle repair. |
| 227 | Full | Repeated saves had identical title/content and changing `_crdt_document`; unit repro tied dirtiness to `markEntityAsSaved()`. | Client and server must agree on safe CRDT no-op semantics. |
| 243 | Full, conditional | Same collaborator emitted a second stale title update while keeping newer body content. | If title is not represented in CRDT and the request has a fresh bundle token, only per-field base tracking or title projection can prove staleness. |

### Durable-persistence containment score

A looser data-loss-containment score asks a different question: would the
server prevent bad state from being durably written, even if the editor still
needs client-side repair? Under that score, add six weak partial rows:

- `2`, `5`, `17`, `27`, `56`, `57`.

These add 6 distinct rows and 31 weighted STATUS failures. They are not counted
in the bug-resolution partial set because the evidence points more strongly at
live CRDT corruption or save/reload instability than at a server-invariant
violation the mitigation can reliably resolve.

| Durable containment outcome | Distinct rows | Fraction | STATUS-weighted | Weighted fraction |
| --- | ---: | ---: | ---: | ---: |
| Bug likely resolved | 8 / 279 | 2.87% | 16 / 452 | 3.54% |
| Potential bad durable save contained, not fully resolved | 35 / 279 | 12.54% | 73 / 452 | 16.15% |
| Still unaddressed | 236 / 279 | 84.59% | 363 / 452 | 80.31% |

Total rows touched under this containment score: 43 / 279 rows, or 15.41%.
Weighted total touched: 89 / 452 STATUS rows, or 19.69%.

The containment-only rows are excluded from the bug-resolution table because
their saved-state symptoms are downstream of earlier live-state corruption.
They are an upper-bound sensitivity set, not rows the server would certainly
contain:

| Rows | Weighted | Why containment-only |
| --- | ---: | --- |
| `2`, `5`, `17`, `27` | 29 | These are checkpoint/save/reload corruption families where the server may refuse a later bad durable write, but the block tree has already diverged or corrupted before persistence. |
| `56`, `57` | 2 | These are weaker save/reload cases where stale or missing body state may be contained, but the evidence does not prove a server-invariant violation sufficient for bug resolution. |

If the live CRDT state itself has already lost, duplicated, or malformed the
content, bundle validation may faithfully accept the wrong state.

Complete accounting bridge:

| Bucket | Rows | Weighted |
| --- | ---: | ---: |
| Full bug resolution | 8 | 16 |
| Partial bug-resolution mitigation | 29 | 42 |
| Additional containment-only sensitivity rows | 6 | 31 |
| Excluded near-miss buckets listed below | 236 | 363 |
| Total manifest | 279 | 452 |

### Important excluded near misses

The remaining rows are not counted because the proposed server bundle guard
does not address their root cause.

| Excluded bucket | Rows | Weighted | Why excluded |
| --- | ---: | ---: | --- |
| Title reload/autosave/session title state | 24 | 45 | Blocks and CRDT often already match, while title rehydration or local autosave state diverges. Server save validation does not fix reload/session title state. |
| `/wp-sync` transport/delivery/OOM/storage | 17 | 38 | These are update delivery, room-history, route, or memory failures, not editor-content-bundle save consistency. |
| Table/Y.Array merge | 14 | 15 | The bad state comes from nested CRDT array merge behavior before server persistence. |
| Revision/post-lock/code-editor/session | 8 | 8 | Different editor/session flows, not normal collaborative post save consistency. |
| Live CRDT merge/stale-local/reconciliation | 169 | 251 | Lost deletes, duplicated blocks, wrong moves, stale local snapshots, block identity smears, and nonconvergence happen before the server can validate a save. |
| Fresh-post foreign document contamination | 1 | 1 | Row 89 can submit title/content/CRDT that are internally consistent for the wrong collaborative document. Containing it requires document identity, room scoping, or post-bound CRDT provenance in addition to bundle versioning. |
| No useful post save request | 1 | 1 | Row 207's realistic repro leaves REST state unchanged without emitting a post save request, so a REST pre-insert guard cannot resolve that user-visible failure. |
| Other unaddressed residual | 2 | 4 | Remaining rows outside the touched sets and major near-miss buckets, including a stuck-saving row without confirmed CRDT-only no-op churn. |

Complete row-ID accounting:

- Full bug-resolution rows: `8`, `23`, `90`, `99`, `155`, `156`, `227`,
  `243`.
- Partial bug-resolution rows: `15`, `18`, `19`, `29`, `32`, `37`, `40`,
  `43`, `45`, `52`, `54`, `60`, `61`, `62`, `63`, `64`, `67`, `69`, `94`,
  `136`, `138`, `141`, `196`, `211`, `212`, `216`, `228`, `241`, `242`.
- Additional containment-only rows: `2`, `5`, `17`, `27`, `56`, `57`.
- Title reload/autosave/session title state: `4`, `9`, `53`, `77`, `81`,
  `112`, `113`, `176`, `185`, `193`, `194`, `208`, `210`, `232`, `235`,
  `236`, `245`, `249`, `250`, `251`, `252`, `253`, `265`, `273`.
- `/wp-sync` transport/delivery/OOM/storage: `1`, `80`, `108`, `171`, `191`,
  `197`, `198`, `200`, `202`, `219`, `220`, `221`, `222`, `267`, `268`,
  `269`, `279`.
- Table/Y.Array merge: `47`, `50`, `59`, `98`, `109`, `110`, `111`, `162`,
  `182`, `201`, `204`, `247`, `263`, `277`.
- Revision/post-lock/code-editor/session: `48`, `175`, `203`, `205`, `209`,
  `233`, `238`, `239`.
- Fresh-post foreign document contamination: `89`.
- No useful post save request: `207`.
- Other unaddressed residual: `187`, `199`.
- Live CRDT merge/stale-local/reconciliation: `3`, `6`, `7`, `10`, `11`,
  `12`, `13`, `14`, `16`, `20`, `21`, `22`, `24`, `25`, `26`, `28`, `30`,
  `31`, `33`, `34`, `35`, `36`, `38`, `39`, `41`, `42`, `44`, `46`, `49`,
  `51`, `55`, `58`, `65`, `66`, `68`, `70`, `71`, `72`, `73`, `74`, `75`,
  `76`, `78`, `79`, `82`, `83`, `84`, `85`, `86`, `87`, `88`, `91`, `92`,
  `93`, `95`, `96`, `97`, `100`, `101`, `102`, `103`, `104`, `105`, `106`,
  `107`, `114`, `115`, `116`, `117`, `118`, `119`, `120`, `121`, `122`, `123`,
  `124`, `125`, `126`, `127`, `128`, `129`, `130`, `131`, `132`, `133`,
  `134`, `135`, `137`, `139`, `140`, `142`, `143`, `144`, `145`, `146`,
  `147`, `148`, `149`, `150`, `151`, `152`, `153`, `154`, `157`, `158`,
  `159`, `160`, `161`, `163`, `164`, `165`, `166`, `167`, `168`, `169`,
  `170`, `172`, `173`, `174`, `177`, `178`, `179`, `180`, `181`, `183`,
  `184`, `186`, `188`, `189`, `190`, `192`, `195`, `206`, `213`, `214`,
  `215`, `217`, `218`, `223`, `224`, `225`, `226`, `229`, `230`, `231`,
  `234`, `237`, `240`, `244`, `246`, `248`, `254`, `255`, `256`, `257`,
  `258`, `259`, `260`, `261`, `262`, `264`, `266`, `270`, `271`, `272`,
  `274`, `275`, `276`, `278`.

Row 240 is a useful example of the exclusion rule. It persists a checkpoint
correctly, but leaves live editors on stale state. Whole-bundle server
persistence does not address that visible bug.

Row 89 is a different kind of server-addressable problem, but not by this
bundle CAS. A post-bound CRDT provenance check, such as a site/post/room
generation nonce embedded in `_crdt_document`, could reject a foreign document
on a fresh post. That would be a third mitigation layered on top of bundle
versioning, not evidence that editor-content-bundle CAS fixes fresh-post
contamination.

#### Separate provenance guard

Post-bound CRDT provenance is a separate server invariant: a persisted CRDT
document and live sync room must belong to the site, post, and collaboration
generation currently being edited. It answers "is this the right document for
this post generation?", while bundle CAS answers "was this save derived from
the current protected-field state?"

A plausible design would store a server-owned provenance record for RTC-enabled
post entities, such as a stable `site_uuid`, `postType/<post_type>:<post_id>`,
random `document_generation`, optional `room_generation`, and schema version.
The serialized `_crdt_document` should carry that identity inside the Y.Doc
state map and mirror it in the JSON wrapper. The wrapper value must be copied
from the Y.Doc state, not supplied independently from the current post object;
otherwise a buggy save path could wrap a foreign Y.Doc with the current post's
identity and bypass the check.

Server enforcement should reject `_crdt_document` writes whose provenance does
not match the server record, with no mutation to `post_title`, `post_content`,
`excerpt`, or `_crdt_document`. A stronger version also gates `/wp-sync` room
updates by `room_generation`, either by including the generation in room
identity or by adding a validated request field. Current room parsing assumes
`postType/post:<numeric-id>`, so embedding generation in the room string would
need a route/schema/parser change.

The impact is intentionally narrow:

| Design | Bug-resolution impact | Durable-containment impact | Rows |
| --- | ---: | ---: | --- |
| REST save provenance only | 0 full, 1 partial | 1 row / 1 weighted | `89` |
| Provenance plus sync-room generation gating and client reload repair | 1 full / 1 weighted | 1 row / 1 weighted | `89` |

No other manifest rows should be credited to provenance. Same-post stale
title/content rows such as `8`, `155`, `156`, and `243` need bundle CAS or
per-field freshness. Empty/corrupt-content rows need projection validation.
Live merge, table/Y.Array, autosave/title reload, and reconciliation rows would
normally carry matching post provenance. Row `237` mentions stale-foreign
contamination during isolated repro attempts, but the underlying failure is a
same-post RTC convergence/delete issue, so provenance may improve triage
stability without moving the row in the impact table.

If combined with the full editor-content-bundle protocol, provenance would
promote the broader estimate from 8 full rows / 16 weighted to 9 full rows /
17 weighted, leaving the 29 partial rows unchanged. It should run before
bundle CAS: a provenance mismatch is not a normal stale-base conflict to merge;
the client should discard the foreign local document, refetch the canonical
post/provenance, and rejoin the correct room.

The dominant excluded category is not "saves the server failed to reject"; it
is "the live shared document is already wrong." For those rows, a successful
server rejection changes the persistence outcome but not the causal bug. The
server would need to become a live CRDT arbiter, or the client merge code would
need to stop producing the wrong block tree, before those rows move into the
fixed category.

### Confirmation and test plan

The mitigation should be evaluated with instrumentation before treating the
fractions above as measured impact. For each candidate row, confirmation runs
should capture request body, response body/status, bundle token before the
write, bundle token after the write, raw `post_title`, raw `post_content`, raw
`post_excerpt`, and raw `_crdt_document`.

Useful per-save trace fields: timestamp, actor/tab, trigger reason, retry
number, REST error code, title/content hashes and block counts, submitted base
token, server current token, CRDT wrapper `updateId`, decoded document version,
`savedAt`, `savedBy`, pre/post DB field hashes, visible block-tree hash,
edited-entity dirty flags, `isSavingPost()`, immediate response body, post-save
REST GET, and final visible/persisted state on both peers.

Each logical save should also have a `save_attempt_id` that joins server, REST,
client, and e2e events. The server should emit one primary outcome per attempt:
`reject_stale_bundle`, `reject_projection_mismatch`,
`canonicalize_crdt_noop`, `accepted_real_update`, or
`bypass_unguarded_path`. Decision precedence matters: stale bundle is decided
before projection; projection runs only after the base token is current and the
write set explicitly includes the contradicted field; CRDT no-op is a
successful no-mutation or canonicalized response, not a conflict. Client repair
is a multi-request outcome tied to the same logical save, not a server outcome.

| Candidate class | Required trace evidence | Test shape |
| --- | --- | --- |
| Bundle CAS | A write carries old title/content or a stale bundle token while the server has newer protected fields; the server returns 409 and no protected DB field changes. | REST integration test with two concurrent saves, then focused e2e replay for rows `8`, `155`, `156`, and `243`. |
| Atomic protected-field commit | A conflict discovered while writing meta or related side effects cannot leave changed post fields behind. | Forced post-field/meta split tests covering rows `52`, `63`, and `141`. |
| Projection validation | Submitted content is empty, flattened, or malformed while the accepted/submitted CRDT projection or validated-base projection proves non-empty ordinary blocks; the server rejects the write and does not rewrite content. | REST projection-validation tests plus e2e replay for rows `15`, `18`, `19`, `37`, `196`, `241`, and `242`. |
| Server materialization | The accepted CRDT serializes to canonical `post_content`; submitted stale or empty content is ignored or repaired according to policy. | Materialization tests for rows `29` and `196`, plus negative tests for malformed/freeform/unregistered/deprecated blocks. |
| CRDT no-op save loops | Consecutive saves have stable visible title/content and only known non-semantic CRDT save metadata changes; the response stops dirtying the record. | Unit tests around CRDT serialization/no-op response handling plus e2e or integration replays for rows `23`, `90`, and `227`. |
| Client conflict repair | After a 409, the client refetches, applies persisted CRDT, recomputes intended fields, retries once with the new bundle token, and does not apply the rejected response into the live sync doc. | `core-data` action tests extending the existing stale-CRDT retry test, plus manual-save e2e with a forced conflict. |
| Post-bound CRDT provenance | A fresh-post foreign CRDT is rejected even when title/content/CRDT are internally coherent. | Provenance tests for row `89`, with explicit clone/template/import exceptions. |
| Exclusions | No protected-field request reaches the guarded path, or the live editor diverges before save. | Negative tests for rows `207` and `240`, ensuring the report does not claim save validation fixes them. |

#### Measurement design

The estimate should become a measured impact number only after candidate rows
run through the same instrumented classification pipeline:

1. **Freeze the denominator.** Keep the 279-row / 452-weight manifest as the
   planning denominator. Mark a row as measured only when its baseline failure
   reproduces under instrumentation, or when a reduced fixture preserves the
   same protected-field evidence.
2. **Build fixtures by mechanism.** For each full, partial, and
   containment-only candidate, keep a materialized e2e replay and, where
   possible, a reduced REST/server fixture. Each fixture declares protected
   fields, write set, base token, expected current token, expected server
   decision, final DB oracle, peer-visible oracle, and dirty/save-settlement
   oracle.
3. **Run three modes.** Baseline proves the original failure. Shadow mode emits
   would-reject or would-no-op decisions without changing behavior. Enforced
   mode proves whether rejection, canonicalization, no-op settlement, and
   client repair change the final outcome.
4. **Classify observed outcomes.** Full requires the user-visible failure to
   disappear and final peer/editor/DB state to be clean. Partial means a bad
   durable write is blocked but the editor remains corrupt, divergent,
   failed-to-save, or dirty. Containment-only means the server avoids damage in
   some runs while the causal live/editor bug remains.
5. **Report measured and unmeasured separately.** Publish measured full,
   partial, containment-only, and unimpacted fractions over the frozen
   manifest, plus an eligible-runnable fraction over rows whose baseline
   fixture reproduced. Do not fold unrunnable or non-reproducing rows into the
   measured numerator.

Fixture coverage should include positive fixtures for bundle-CAS rows `8`,
`155`, `156`, and `243`; direct CRDT-meta row `99`; atomic split rows `52`,
`63`, and `141`; projection rows `15`, `18`, `19`, `29`, `32`, `37`, `40`,
`43`, `54`, `60`, `61`, `62`, `64`, `67`, `69`, `94`, `136`, `138`, `196`,
`211`, `212`, `216`, `228`, `241`, and `242`; CRDT no-op rows `23`, `90`, and
`227`; row `45` only when canonicalization is in scope; and containment-only
rows `2`, `5`, `17`, `27`, `56`, and `57`.

Negative controls should include row `207`, row `240`, row `89` unless
post-bound provenance is in scope, representative title reload/session rows,
`/wp-sync` transport rows, table/Y.Array rows, revision/post-lock/code-editor
rows, and live-CRDT reconciliation rows. Benign valid-write controls should
include legitimate empty posts, invalid/freeform blocks, deprecated and
unregistered blocks, code-editor saves, autosaves, revision restores,
status/taxonomy-only saves, legacy full-record writes, and direct non-RTC
writes that should invalidate rather than reject the token.

Shadow classifiers should be first-class outputs:
`would_reject_stale_bundle`, `would_reject_split_bundle_commit`,
`would_reject_projection_mismatch`, `would_canonicalize_crdt_noop`,
`would_accept_real_update`, `would_bypass_unguarded_path`,
`not_applicable_live_diverged_before_save`,
`not_applicable_no_protected_write`, and
`not_applicable_no_save_request`.

Race injection should cover delays after token preflight before post-row write,
between `wp_update_post()` and `_crdt_document` meta persistence, concurrent
token-advancing saves during either delay, failures in meta/term/side-effect
writes after protected fields begin committing, delayed or reordered
`/wp-sync` and post-save REST responses, repeated same-content saves with only
CRDT save-marker/wrapper churn, and both HTTP polling and WebSocket modes where
the original row has coverage.

Success criteria for a full measured fix: baseline failure reproduces; server
decision matches the expected mechanism; no protected DB field is partially
committed on conflict; final `post_title`, `post_content`, `post_excerpt`, and
`_crdt_document` match the clean bundle; both peers converge to the expected
visible block tree/title; `isSavingPost()` and dirty flags clear; and retry
count is bounded. Partial means the server blocks or canonicalizes the bad
durable write but any peer remains visibly corrupt, divergent, dirty, or
failed-to-save.

Minimum server tests:

- stale bundle token rejects before any post fields or `_crdt_document` meta are
  written;
- conflict detected at meta-update time cannot leave already-written
  `post_title`/`post_content` behind;
- term/meta failures after the guarded post-field write cannot leave a partially
  committed editor-content bundle;
- validator field normalization matches the REST controller's
  `prepare_item_for_database()` handling of raw title/content/excerpt values;
- status/taxonomy-only saves do not require a bundle token and do not overwrite
  protected fields;
- legacy full-record payloads with stale protected fields are rejected or have
  unlisted protected fields ignored by the RTC save path;
- autosaves and revision restores either use their own policy or explicitly
  invalidate/bump the canonical bundle token.

Minimum client tests:

- `rest_editor_content_bundle_stale` follows the same one-shot refetch, merge,
  recompute, retry pattern as `rest_crdt_document_stale`;
- a second 409 does not spin indefinitely;
- a no-op CRDT persistence response leaves the edited entity clean;
- rejected stale responses are not applied into the local CRDT/sync manager.

### Rollout and telemetry

This mitigation should roll out as a capability-gated protocol, not a hard
global requirement on every post write. A practical rollout sequence is:

1. **Shadow mode.** Compute and return bundle tokens, accept token-bearing
   writes, and log would-reject decisions for missing, stale, or malformed
   tokens without rejecting them.
2. **Token-aware client support.** Ship client retry handling for
   `rest_editor_content_bundle_stale` before strict enforcement, so conflicts
   become refetch/rebase/retry flows instead of user-visible save failures.
3. **Strict RTC editor enforcement.** Enforce only for opted-in collaborative
   editor saves whose clients advertise bundle-token support.
4. **Expand cautiously.** Gradually include additional REST clients and write
   paths after telemetry shows low missing-token rates and high retry success.

Old clients, Classic Editor, WP-CLI, XML-RPC, direct `wp_update_post()`, direct
meta writers, and plugins must remain compatible. Initially, treat those writes
as legacy external mutations: allow the write, advance or invalidate the bundle
version, and force token-aware RTC clients to refetch/reconcile before their
next guarded save. Do not silently preserve an old `_crdt_document` as
authoritative after a legacy write changes `post_title`, `post_content`, or
`excerpt`.

Autosaves and revision restores need explicit policy. Per-user autosave
revisions should not advance the canonical parent bundle token unless they
actually update the parent post, such as auto-draft promotion. Revision restore
should advance or invalidate the bundle token because `_crdt_document` revisions
are disabled; after restore, RTC clients need to refetch and rebase the current
CRDT document onto restored post fields.

Telemetry should avoid raw content and CRDT payloads. Record field names,
payload sizes, hashes, token presence/match/conflict rates, shadow reject
reasons, enforced reject reasons, retry success/failure, endpoint/write source,
post type/status, RTC-enabled state, legacy invalidations, autosave/revision
participation, CRDT no-op outcomes, and split-bundle attempts.

Telemetry dimensions should include `save_attempt_id`, `logical_save_id`,
`actor_tab`, `server_decision`, `decision_stage`, `enforced_vs_shadow`,
`base_token_match`, `write_set`, `fields_mutated`, `token_advanced`,
`projection_mismatch_kind`, `crdt_noop_kind`, `retry_index`, `repair_result`,
`final_dirty_state`, `pre_save_visible_hash`, `post_repair_visible_hash`, and
`guarded_path_present`. Count server containment and client repair separately:
a 409 proves rejection, not user-visible repair.

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
- The normal REST controller also has side effects after the post write, such
  as term and meta updates. A bundle guard must define rollback, repair, or
  retry behavior for failures after `wp_update_post()` has changed
  `wp_posts.post_title`, `wp_posts.post_content`, or `wp_posts.post_excerpt`.
- REST request shape must mirror what the controller will actually write.
  `content.raw` and `excerpt.raw` are handled differently from rendered values,
  and title handling has its own non-empty/raw-value behavior. A validator that
  normalizes fields differently from `prepare_item_for_database()` can reject
  legitimate writes or validate fields that are never committed.
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
- Some byte differences in `_crdt_document` are volatile metadata, but a
  byte-different Yjs document can also encode real causal state, delete sets,
  clocks, tombstones, schema changes, unknown state-map keys, or block/rich-text
  mutations while rendering the same title/content. Treating arbitrary
  byte-different CRDT documents as no-ops can resurrect deleted content or lose
  future merge information. A safe rule can ignore JSON formatting, wrapper
  `updateId`, and recomputable wrapper `version`; it can treat `savedAt` and
  `savedBy` as ignorable only under a narrow persistence-settlement rule that
  preserves the current stored CRDT value or returns a response that does not
  dirty the client again.
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
