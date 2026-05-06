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
- Bundle conflict retry has to rerun this final protected-field shaping. The
  existing stale-CRDT retry lives inside `core-data`: it can refetch, apply the
  persisted CRDT, rerun `__unstablePrePersist`, and retry once, but it does not
  naturally bubble back through the editor-layer `savePost()` path that
  materialized `content` and ran `editor.preSavePost`. A broader bundle retry
  should either return to `editor.savePost()` or move all bundle-sensitive
  shaping into the retrying layer; otherwise the retry can validate a fresh
  token while resubmitting stale serialized content.
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
- Legacy metabox persistence is another side effect outside the core REST
  entity save. The editor saves metabox form data after the entity save
  succeeds. If metabox or plugin code can touch protected fields, the bundle
  protocol must classify that write as an external invalidation or route it
  through the same guarded endpoint.
- The rollout scope has to match actual save surfaces. Current stale-save
  client preflight is limited to `post` and `page`, while server-side
  `_crdt_document` registration and post-type entity sync config can apply more
  broadly to REST-visible post types. Generic Core Data saves and site-editor
  quick-edit flows can call `editEntityRecord()` / `saveEditedEntityRecord()`
  directly without going through the editor manual-save action. Bundle
  enforcement therefore belongs at the Core Data/REST protocol boundary, or
  each half-participating CPT/template/quick-edit path must explicitly opt out
  and invalidate the token when protected fields change.
- Core Data batching is not a transaction across subrequests. If guarded
  bundle saves can travel through the REST batch transport, each subrequest
  still needs the same conflict semantics, canonical token response, and
  idempotency behavior. Otherwise guarded RTC saves should opt out of batching
  so a bundle conflict is not hidden inside a partially successful batch.

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

### Storage and transaction design

The base estimate assumes more than "there is a token somewhere." It assumes a
storage primitive that can prove and update bundle freshness at the same
boundary as protected-field mutation.

A plausible primitive is a dedicated bundle-version row keyed by site and
entity, not ordinary post meta:

| Field | Purpose |
| --- | --- |
| `site_uuid` or blog/site id | Separates multisite and migrated installs; should not be derived only from URL. |
| `entity_type`, `post_type`, `post_id` | Identifies the guarded post-type entity. |
| `document_generation`, `room_generation` | Links bundle freshness to the provenance generation when provenance is in scope. |
| `bundle_generation` | Monotonic opaque CAS value. It should never be reused, even if protected values return to old hashes. |
| `protected_hashes` | Diagnostic hashes of normalized title/content/excerpt/CRDT, not the authoritative CAS token. |
| `projection_policy_version` | Invalidates tokens when block registry, projection, sanitizer, or feature-flag policy changes. |
| `last_mutation_id` / idempotency ledger pointer | Lets duplicate network retries return the same canonical response without committing twice. |
| `updated_by`, `updated_at`, source | Telemetry and recovery audit, not freshness. |

For multisite, the table must either be per-site using the site `$wpdb->prefix`
or include `blog_id`/site identity in the primary key. Posts and postmeta are
per-site tables; a network-global version table keyed only by `post_id` would
collide across blogs. The primary key should make no-row initialization atomic,
for example `(site_id, entity_type, post_type, post_id)`.

No-row initialization is a real race. Treating a missing version row as token
`0` lets two first guarded saves both pass. The server should create the
version row with an atomic insert/upsert before commit validation, then use
either a locking read on that row or a single conditional update on an indexed
row and check affected rows.

The guarded commit can be implemented with pessimistic row locking or an
optimistic compare-and-update, but the correctness condition is the same: no
protected field changes unless the submitted base token still owns the version
row, and the token advance plus protected-field writes are committed together.

| Pattern | Required property | Main risk |
| --- | --- | --- |
| `SELECT ... FOR UPDATE` on a bundle-version row, then protected writes, then token advance | All guarded writers take the same row lock before mutating protected fields. | Long projection/CRDT decode inside the lock can create contention; decode should happen before locking when possible, then revalidate under lock. |
| Optimistic `UPDATE version_row SET token = next WHERE token = base` plus protected writes | The successful CAS and protected writes are in the same transaction, or the token advance is not visible without the protected writes. | Advancing the token before later post/meta failure can strand clients on a token for a state that never committed. |
| Custom endpoint writes protected fields directly | Endpoint controls lock order, write set, token advance, and response. | Must replicate or deliberately bypass enough REST controller behavior, permissions, sanitization, hooks, revisions, and side effects. |
| Normal REST controller with filters observing the token | Can log and reject some requests. | Does not own the final commit boundary, so it is not the base-estimate mitigation. |

Idempotency should use a bounded attempts table, not only one
`last_save_attempt_id` on the version row. A later valid save can advance the
bundle before an HTTP retry of an older accepted attempt arrives. Store
attempts keyed by site/entity/save-attempt id with payload hash, base token,
write set, outcome, result token, and canonical response hash or body pointer.
This table needs retention limits: expire old successful attempts after the
client retry window, retain failed/conflict attempts only long enough for
diagnostics, and cap per-post/per-user attempt counts so a stuck client cannot
grow unbounded storage.

The version row should also store server-computed hashes of canonical
`post_title`, `post_content`, `post_excerpt`, and `_crdt_document`. These hashes
are not the CAS token, but they let legacy invalidation hooks tell whether a
non-guarded write actually changed protected fields instead of bumping the
token for every status, taxonomy, or unrelated meta update.

Transaction isolation and deployment topology are part of the guarantee:

- The version row, `wp_posts` row, and `_crdt_document` storage must be in
  transactional tables on the same transactional boundary. If a HyperDB,
  sharding, or multi-database deployment can place them on different
  connections, the implementation is no longer a true bundle CAS.
- Every writer webhead must either enforce the bundle protocol or invalidate
  the token before strict mode is enabled. A mixed rolling deploy where one
  server issues tokens and an older server writes protected fields without
  advancing them can make a later guarded save incorrectly pass.
- Edit-context reads and conflict-repair reads should use the primary, or a
  read path with proven read-your-writes semantics for the bundle row,
  `wp_posts`, and `_crdt_document`. A lagging replica can manufacture
  row `52`/`141`-style symptoms: stale title/content with advanced CRDT, false
  conflicts, or retry loops after a successful guarded commit.
- Lock ordering should be fixed, for example bundle-version row first, then
  post row, then meta rows, to avoid deadlocks under concurrent saves.
- A non-locking `SELECT version` followed by a later `UPDATE` is not CAS. Use a
  locking read or a single-statement conditional update on an indexed row. If
  the table is not transactional and row-locking, strict enforcement should
  stay shadow-only.
- Projection/CRDT decode should not hold the DB lock unless unavoidable. Decode
  and classify first, enter the guarded section, re-check token/provenance, and
  commit quickly.
- Object-cache invalidation should happen only after commit, and read-path
  token assembly should not serve cached fields from a previous generation.
- If the guarded endpoint writes `wp_posts` or `wp_postmeta` directly instead
  of through ordinary APIs, it must perform the inverse cache policy of
  high-frequency sync storage: invalidate post and post-meta caches after
  commit, including the equivalent of `clean_post_cache()`.
- Crash recovery should be explicit. After a PHP fatal, database disconnect, or
  timeout, the system should be able to tell whether the mutation committed,
  replay the idempotent response, or mark the bundle token invalid. Ambiguous
  partial commits should be counted as invariant violations.

Lazy migration is safer than trying to rewrite every post up front. On first
edit-context read for an RTC-enabled post with no bundle-version row, the
server should mint a generation from the current raw protected fields and
return that token. A first token-bearing save should fail closed if the version
row disappeared or was concurrently initialized from different protected
values. Legacy writes before initialization should initialize from the post's
current DB state, not from stale REST preload or client state.

The lifecycle policy should be explicit:

| Lifecycle event | Version/provenance policy |
| --- | --- |
| Trash | Invalidate the active bundle token and force RTC clients to leave or refetch before any further guarded save. Preserve rows for recovery/diagnostics, but do not let active collaborators save protected fields back onto a trashed post with old tokens. |
| Untrash/restore from trash | Mint or invalidate the bundle generation, revalidate protected hashes against DB state, and force clients to refetch. If restore also restores revisions/meta, follow the revision-restore policy. |
| Permanent delete | Delete or tombstone bundle-version rows, idempotency attempts, provenance records, and room-history keys so a recreated/imported entity cannot inherit stale collaboration state. Late retries after delete must not recreate the version row or resurrect protected fields. |
| Auto-draft cleanup | Remove orphaned bundle/provenance/attempt rows with the auto-draft, or mark them expired before the post id can be reused by import tooling. |
| Duplicate/clone/import | Mint new provenance and bundle token unless this is an explicit same-site identity-preserving migration. |
| Post type change or cross-site move | Treat as a new entity generation; invalidate old tokens and room keys. |

Cleanup should be idempotent and retryable. It is acceptable for tombstones to
outlive the post for diagnostics, but strict reads must not treat a tombstoned
or deleted generation as current. Periodic cleanup jobs should report orphaned
version rows, orphaned attempts, room-history entries with no live post, and
late retry attempts against deleted generations.

Permission and cheap validation should happen before expensive projection or
lock acquisition. The endpoint should check object-level `edit_post`
capability before returning token mismatch details, current hashes, or raw
protected fields. REST schema, payload-size limits, and malformed wrapper
checks should run before acquiring the bundle-version row lock; otherwise a
large or malformed CRDT can become a lock-holding save-path DoS. Payload
normalization and sanitization must run before payload hashing, projection
checks, and committed-value hashing so hashes describe what would actually be
stored.

Security boundary:

- Bundle tokens, provenance tuples, room generations, and `save_attempt_id`
  values are freshness/correlation data, not authorization credentials. Every
  mutation still needs nonce/session auth, object-level `edit_post` checks on
  the actual post id, and field/status capability checks at commit time.
- Idempotency records should be scoped by site, post, authenticated
  user/session class, and attempt id. Replays must re-run authorization before
  returning a stored canonical response; a user who lost access should get an
  auth failure, not a replayed title/content/CRDT body.
- Private protocol fields should be request-body or header fields, not query
  args, because URLs are logged and leaked more widely. Conflict diagnostics
  should not reveal post ids, room ids, token state, or whether the hidden
  reason was stale-token, provenance, or projection failure to users who cannot
  edit the post.
- A transactional endpoint that writes post fields or `_crdt_document` directly
  must explicitly preserve registered post/meta authorization and sanitization
  rules. Direct SQL must not bypass the `_crdt_document` meta auth callback or
  normal post-content filtering.
- Rate-limit failed attempts as well as accepted saves: malformed payloads,
  stale-token conflicts, idempotency replays, projection failures, and lock
  waits should be counted by user/post/IP and capped before they can grow the
  attempts table or hold locks.

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
   The write set must be captured from caller intent before protocol metadata
   is appended. Inferring it from the final REST body is unsafe because
   `__unstablePrePersist` can append `_crdt_document` meta to otherwise narrow
   post saves.
3. **Commit shape.** The server checks the base token at the same point it
   commits `post_title`, `post_content`, `post_excerpt`, and `_crdt_document`.
   If the token is stale, no protected field changes. If validation passes, all
   protected fields commit together and the bundle version advances.
4. **Conflict response.** A rejected save returns a 409 carrying the current
   bundle version and enough current state for the editor to refetch, apply the
   persisted CRDT document, rematerialize title/content/meta, and retry. A
   retry loop must be bounded; repeated conflicts should surface a real editor
   error instead of silently spinning.
   Successful mutation responses must also carry the next bundle token and the
   canonical protected-field state. If the token is exposed only on edit-context
   GETs, Core Data can store a mutation response that has already lost the
   fresh token immediately after a successful save.
   REST `_fields` and `context` filtering must not silently drop protocol state
   needed by token-aware clients. Authenticated RTC reads and mutation responses
   should either force-include the private bundle response object, or clients
   must request it explicitly and avoid replacing a cached token with a
   filtered response that omitted it. Public/read contexts should not expose
   bundle hashes, provenance details, or token mismatch diagnostics.
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

The guarded commit should behave like a small state machine, not a collection
of independent filters:

1. Normalize the REST payload into the same raw `title`, `content`, `excerpt`,
   and meta values the controller would commit.
2. Derive the protected-field write set from explicit client intent, not from
   every field present in a broad record object.
3. Reject provenance mismatches before treating the request as a normal stale
   base conflict.
4. Enter the guarded commit section and compare the submitted bundle token
   against the current server-owned token.
5. Run projection/materialization/no-op policy only after token/provenance
   checks have established which CRDT document is being accepted.
6. Commit all protected-field mutations and the next bundle token together, or
   commit none of them.
7. Run non-protected side effects under a policy that cannot leave protected
   fields committed after a later meta/term/additional-field failure.
8. Return a response that tells the client which state is authoritative:
   conflict/refetch, accepted update, accepted no-op, or legacy invalidation.

This ordering matters for row credit. Projection run before the token check can
compare against the wrong current document. A no-op decision made before
provenance can bless a foreign document. A meta conflict discovered after
`wp_update_post()` can still produce the split-bundle cases the mitigation is
supposed to prevent.

The write-source policy also has to be explicit:

| Write source | Bundle-token policy | Why |
| --- | --- | --- |
| RTC editor save with protected fields | Require base token, declared write set, guarded commit, and client repair on 409. | This is the path credited by the base estimate. |
| RTC status/taxonomy-only save | Do not require a bundle token; ignore omitted protected fields and do not advance the token. | Otherwise non-content workflow updates become unnecessary conflicts. |
| Legacy full-record REST save | Either reject stale protected fields in strict RTC mode, or treat it as an external mutation that advances/invalidates the token. | Broad records can carry stale title/content accidentally. |
| Direct `wp_update_post()` or plugin meta write | Allow for compatibility, but invalidate or advance the bundle token when protected fields change. | Guarded RTC clients must not later overwrite these changes with old tokens. |
| Per-user autosave revision | Do not advance the canonical parent bundle token unless it updates the parent post. | Autosaves are not the canonical collaborative document. |
| Auto-draft promotion or revision restore | Advance or invalidate the canonical token and force RTC clients to refetch/rebase. | These flows can replace title/content without revisioned `_crdt_document`. |
| Code-editor save | Either opt out and invalidate the token, or participate with a content-only write set. | Code editor content may be intentionally opaque to block/CRDT projection. |

The bundle token should not live in normal editable `meta`. Post-type entity
saves merge edited meta, and protocol metadata appended during pre-persist can
be replayed, dirtied, or cleared like user meta. Use a private top-level
request/response field that is stripped from entity edits and handled by the
REST/controller protocol layer.

Token granularity is a design choice, and it changes both correctness and
false-conflict behavior:

| Token shape | What it buys | Main risk | Impact on this estimate |
| --- | --- | --- | --- |
| Single scalar bundle generation | Simple all-or-nothing freshness for the protected bundle. | Rejects non-overlapping title/content/excerpt/CRDT edits that could have merged, and cannot prove a submitted field came from the same local snapshot as the token. | Sufficient for the base stale-save rows only when the client read and wrote the whole protected bundle coherently. |
| Per-field generations plus declared read/write set | Can reject mixed-base fields and avoid conflicts for omitted or non-overlapping protected fields. | More protocol state, more downgrade cases when a client sends broad record payloads without declaring intent. | Stronger for conditional title/content rows `155` and `243`, especially if title is not authoritative in CRDT projection. |
| CRDT projection hash or content hash | Useful diagnostic for "does this submitted content match this submitted CRDT?" | Not a freshness token; ABA and byte-different same-rendered states can pass or fail for the wrong reason. | Helps projection rows only after provenance and bundle freshness are established. |
| `post_modified`, `post_modified_gmt`, or raw value hash | Easy to compute with existing fields. | Clock granularity, unrelated writes, filters, autosaves, ABA, and same-rendered byte churn make it unreliable as CAS. | Should not be credited for the base estimate. |

The scalar bundle token is intentionally conservative. It may increase visible
409s for otherwise mergeable non-overlapping writes, but that is safer than
silently accepting stale protected fields. A per-field generation protocol can
reduce false conflicts, but only if the client reliably declares which fields
it read and which fields it intends to mutate. Otherwise per-field tokens can
create a new stale-write path by treating an accidental stale broad field as a
deliberate write.

Duplicate requests need an idempotency rule separate from freshness. A
network-timeout retry of the same save attempt should not advance the bundle
version twice or write a second CRDT save marker. Token-aware collaborative
saves should include a `save_attempt_id` or mutation id. If the server has
already accepted that exact attempt for the same base token and write set, it
should return the original canonical response. If the same id arrives with a
different payload, provenance, base token, or write set, the server should
reject it as an invalid duplicate rather than treating it as a new save.

The server response has to be authoritative enough for the client to settle:

| Server outcome | Response contract | Client consequence |
| --- | --- | --- |
| `reject_provenance_mismatch` | No protected fields changed; include canonical provenance and enough state to discard/rejoin. | Discard foreign local doc, refetch, and rejoin the correct room; do not merge as stale state. |
| `reject_stale_bundle` | No protected fields changed; include current token and current raw protected fields or a refetch target. | Refetch/rebase/rematerialize once, then retry with a new token. |
| `reject_projection_mismatch` | No protected fields changed; include mismatch class, write set, and current token. | Surface conflict or repair live editor state; do not retry the same impossible payload. |
| `accepted_real_update` | Include canonical raw protected fields, accepted `_crdt_document`, new token, and whether token advanced. | Replace local saved markers with server canonical state and clear dirty state only after this response. |
| `accepted_crdt_noop` | Include stable stored CRDT or no-op acknowledgement, unchanged or explicitly advanced token policy, and dirty-settlement marker. | Mark the entity clean without overwriting meaningful causal CRDT state. |
| `legacy_invalidated` | Include new/invalidated token and the fields whose external mutation forced invalidation. | Refetch before the next guarded RTC save. |

Client conflict handling needs a data-preservation contract, not only a retry
loop. A correct server rejection must not discard the user's unsaved local
intent. The client should classify a conflict into three outcomes:

| Client outcome | When it is allowed | Required state after handling |
| --- | --- | --- |
| Automatic repair and retry | Current CRDT applies cleanly, local intent can be rematerialized, capabilities still allow the write, and retry budget remains. | One new guarded attempt with a fresh token; rejected payload is not applied locally. |
| User-visible conflict with local draft preserved | Rebase is ambiguous, projection is unknown, capability changed, second 409 occurs, or provenance mismatch requires discard/rejoin. | `isSavingPost()` clears, dirty state remains, unload protection stays active, and local changes are recoverable. |
| No-op settlement | Server proves only non-semantic save metadata changed and returns a clean-settlement response. | Dirty state and save markers clear without changing meaningful CRDT state. |

This affects row scoring. A server-side 409 by itself is not a full fix: the
client must either retry to a clean saved state or preserve the local draft and
surface an explicit conflict. Applying the rejected payload to the sync doc,
clearing dirty state before a canonical success response, or leaving
`isSavingPost()` stuck turns a would-be full mitigation into partial
containment.

Multiple same-user tabs need the same contract. A token accepted in one tab
should make other tabs refetch or expect a 409 before their next guarded save;
local cross-tab broadcast is useful for reducing conflicts, but correctness
must still come from the server token. Offline or resumed tabs should treat
their old token as a conflict candidate and preserve local edits rather than
silently overwriting current protected fields.

The read path needs the same coherence discipline as the write path. A save
response or edit-context REST response can stitch together `wp_posts` fields,
post meta, object-cache state, REST preloads, and Core Data resolver caches. If
those sources are stale independently, the client can receive title/content
from one generation and `_crdt_document` or bundle token from another. A later
CAS check can then validate a base that never existed as one coherent server
state.

A robust implementation needs either an atomic protected-field read snapshot or
a post-read verification loop:

1. Read protected fields and bundle token from the same server-owned
   generation.
2. Re-read or reject the response if the token changes while assembling
   title/content/excerpt/meta.
3. Invalidate object cache, REST preload data, and Core Data resolver state on
   every token bump or legacy invalidation.
4. Audit save response bodies against raw protected-field values and token
   state, not only against the just-submitted payload.

This matters for row credit. Rows `52` and `141` are read-path sensitive
because their evidence includes save/REST divergence after an apparently good
save. They stay conditional until raw DB traces distinguish split durable
persistence from incoherent reads. Row `99` likewise needs a DB-level oracle
proving `_crdt_document` was actually committed empty, not merely returned empty
in an incoherent save response.

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
| CRDT no-op settlement | Repeated saves that only change known non-semantic persistence metadata settle without re-dirtying the entity. | Save-loop rows `23`, `90`, and `227`. | The server may avoid data loss while the client still spins in `Saving`; row `45` needs separate HTML/entity canonicalization. |
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
| Bundle CAS plus atomic protected-field commit | About 7-8 rows / 13-14 weighted touched | Same | `8`, `52`, `63`, `99`, `141`, `155`, `156`, `243` | Catches stale bases and split post/meta commits, but not same-token wrong serialization or CRDT no-op churn. If implemented only as pre-insert/meta filters rather than atomic commit-time CAS, the defensible set drops toward 5 rows / 11 weighted because split rows `52`, `63`, and `141` can still partially commit. |
| Bundle CAS plus read/write-set discipline | Same row count, higher confidence | Same | Same rows, especially `8`, `155`, `156`, `243` | Prevents broad payload clobbers, but still trusts submitted content. |
| Bundle CAS plus projection validation | About 33 rows / 51 weighted touched | About 33 rows / 51 weighted | Adds `15`, `18`, `19`, `29`, `32`, `37`, `40`, `43`, `54`, `60`, `61`, `62`, `64`, `67`, `69`, `94`, `136`, `138`, `196`, `211`, `212`, `216`, `228`, `241`, `242` | Mostly containment; live editor or CRDT state may already be wrong. |
| Full assumed bundle protocol | 37 rows / 58 weighted touched; 8 full, 29 partial | 43 rows / 89 weighted touched | Adds CRDT no-op rows `23`, `90`, `227`, canonicalization row `45`, and containment-only rows `2`, `5`, `17`, `27`, `56`, `57` | Still not a live CRDT merge arbiter. |
| Server materializes saved fields from submitted CRDT | 0-2 conditional full promotions outside the base estimate | Higher confidence for some empty-content containment rows | Strongest candidate: `29`; weaker and needs decoded request proof: `196` | Only helps when the submitted CRDT is correct, projectable, and newer than the bad serialized field. It faithfully persists stale, foreign, malformed, or collapsed CRDT state. |
| Post-bound CRDT provenance | Adds 1 row / 1 weighted under a separate mitigation | Same | `89` | Rejects foreign-document contamination, but does not address stale saves or live merge bugs. |

The "server materializes saved fields from submitted CRDT" variant is stronger
than projection validation. Projection validation says "reject if impossible."
Materialization says "ignore the client's serialized `post_content` and derive
canonical `post_content`, and maybe title/excerpt, from the submitted CRDT."
That could turn row `29`, and possibly row `196`, from partial to full because
the visible or CRDT state appears to retain blocks while the serialized save
field is wrong. This is a sensitivity band, not part of the base estimate. Row
`29` is the strongest candidate because the evidence says the converged block
tree retained checkpoint content while `getEditedPostContent()` regressed
before save. Row `196` is weaker because the summary says RTC state still
carried non-empty blocks, but the row is unrunnable and does not by itself
prove that the submitted `_crdt_document` at the accepted save contained a
projectable non-empty block tree. Promote either row only after decoding the
archived submitted CRDT for the bad save. Rows `15`, `18`, `32`, `37`, `54`,
`69`, `94`, and `138` are weaker materialization candidates for stronger
containment, not proven full fixes.
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

Projection risk is asymmetric: a false negative leaves a row partial or
unfixed, but a false positive can reject valid user content. The server should
therefore define a policy by content class before enforcement:

| Area | False-positive risk | Safe policy |
| --- | --- | --- |
| Ordinary static core blocks | Moderate if parser/serializer versions differ or defaults are elided differently. | Strict projection is plausible only with a versioned editor-compatible registry and serializer. |
| Empty/default block states | Empty `post_content` can be legitimate for a new or cleared post. | Reject only when the same accepted/submitted CRDT deterministically projects to non-empty ordinary blocks and the write set explicitly includes `content`. |
| Dynamic blocks | Saved markup can be a delimiter/fallback, not rendered frontend HTML. | Never materialize rendered output; validate only saved block delimiter/attribute shape when the block is registered and static enough. |
| Freeform and invalid blocks | The editor may preserve original content specifically to avoid data loss. | Treat as opaque except for narrow "impossible empty when CRDT has ordinary blocks" evidence. |
| Synced patterns / reusable blocks | Host post stores a reference, while rendered output expands another post. | Validate only the reference placeholder unless the referenced `wp_block` has its own guarded protocol. |
| Deprecated blocks | Client migrations depend on registry version and deprecated save definitions. | Do not require canonical migration during save unless the server uses the same migration-capable registry. |
| Unregistered or plugin blocks | Server may not know the client block's save function or attributes. | Preserve original serialized content; do not materialize or canonicalize unknown blocks. |
| Filters and block hooks | Client save filters and PHP render filters are different surfaces. | Enforce only on declared save serialization, not render output or hook-expanded frontend content. |
| Raw code-editor content | User may intentionally save markup the block editor would parse differently. | Opt out of projection or require a content-only token invalidation path. |

Projection must name its source explicitly. The only defensible source for
cross-field validation is the accepted CRDT for the same logical save: after
provenance, base-token, write-set, malformed-document, and projectability checks
have passed, but before any protected field is committed. Do not project from
the current persisted CRDT as a standalone rule. Do not project from the
incoming CRDT wrapper before confirming it is the document the server is
willing to accept. For ordinary block content, decoded `blocks` plus an
editor-compatible serializer should be authoritative over a cached serialized
CRDT `content` string; if decoded `blocks` and decoded `content` disagree,
classify that as `crdt_internal_projection_mismatch`, not as automatic repair.

Projection should be tri-state, not boolean:

| Result | Enforcement policy |
| --- | --- |
| `match` | Submitted protected field matches the accepted CRDT projection under the declared policy. |
| `mismatch` | Submitted protected field is provably impossible under the accepted CRDT projection; eligible for reject or materialization depending on policy. |
| `unknown` | Server cannot safely prove either direction; do not reject or materialize, fall back to bundle CAS/atomic commit and telemetry. |

Before enforcement, the server should also compute projectability:

| Projectability class | Policy |
| --- | --- |
| `projectable_static_blocks` | Eligible for strict content projection, and for materialization only when row-specific evidence shows serialized field, not CRDT, is wrong. |
| `projectable_title_excerpt_only` | Use projection for title/excerpt only; do not infer content correctness. |
| `opaque_block_subtree` | Do not reject on content mismatch; bundle CAS only. |
| `crdt_internal_mismatch` | Conflict or ask client to repair CRDT first; do not materialize blindly. |
| `decode_failed_or_limited` | Treat projection as unavailable, or return a distinct malformed/limit error if strict mode requires it. |

This gate should be logged per save attempt. Row credit for projection or
materialization should require `projectable_static_blocks`, not merely a
non-empty CRDT.

Projection is registry- and pipeline-relative. The persisted CRDT block tree
does not carry every fact needed to serialize every block: full block metadata,
attribute sources, defaults, deprecated save functions, supports, local
attribute rules, editor settings, and client pre-save transforms can all affect
the final persisted content. The projection policy therefore needs a fingerprint
of the derivation pipeline: block registry, serializer, block supports,
theme/editor settings, deprecated migrations, client pre-save transforms that
affect persisted fields, server pre-persist normalization, and sanitizer policy.
A registry miss, deprecated migration mismatch, or schema gap should produce
`unknown`, not `mismatch`.

The comparison point must also be fixed. Project candidate content, run the
same save-time normalization and sanitization that the REST controller would
apply for the saving actor, then compare and commit the sanitized projection.
Validating pre-sanitized projection but committing post-sanitized content can
create false mismatches; committing pre-sanitized projection can bypass KSES or
capability-dependent filtering.

Materialization has an attribution problem in collaborative editing. The CRDT
state may contain edits authored by users other than the user pressing save.
Either materialization persists the whole projected payload under the saving
actor's capabilities, requires all contributing actors in the accepted CRDT
interval to be authorized for the affected fields, or refuses materialization
when authorship/capability cannot be proven. The chosen policy affects whether
materialization can be enabled beyond controlled fixtures.

An "all contributors authorized" policy is not enforceable unless the persisted
CRDT carries tamper-resistant contributor identity for the accepted update
interval. Yjs client ids are not security identities. Without signed or
server-stamped operation authorship, materialization can safely use only the
saving actor's capabilities or refuse higher-risk materialization.

KSES attribution is a special case. If a high-privilege user inserts HTML that
requires `unfiltered_html` and a lower-privilege user later saves, saving-actor
KSES may strip it. If the server instead uses highest-contributor privilege,
the lower-privilege saver can persist HTML they could not save alone. The
mitigation therefore needs an explicit KSES attribution rule; per-fragment KSES
should be treated as unavailable unless authenticated range authorship exists.

Materialized content should be distinguishable in revisions and audit logs from
ordinary user-submitted serialized content. Record that the field was
server-materialized, which actor triggered it, which projection policy was
used, and whether contributor attribution was unavailable.

Bindings can add read and write dependencies. Bound attributes may depend on
post data, post meta, term data, pattern override context, permissions, and
registered binding sources; some binding sources can also write through setters
or `canUserEditValue` checks. Projection should treat binding sources as an
additional read set or mark the subtree opaque. Materialization must not invoke
binding setters unless those secondary writes have their own declared write
set, freshness token, capability check, and atomic commit.

If the server materializes `post_content` from CRDT `blocks`, it must not leave
a stale authoritative CRDT `content` cache behind. Either update the accepted
CRDT's canonical serialized content consistently with `blocks`, or declare
CRDT `content` non-authoritative and ensure readers ignore it. If the server
canonicalizes the Yjs document itself, it becomes a CRDT writer and needs a
stable server origin, causal-clock compatibility, and a merge rule for
server-authored repair updates. Otherwise a repair can introduce duplicate
operations or future conflict amplification.

Hash taxonomy should stay explicit. Do not reuse one hash for CAS, projection,
telemetry, and idempotency. Keep separate raw REST payload hash, sanitized
persisted-field hash, CRDT document version/hash, semantic block-tree hash that
excludes volatile identity, and projection-policy hash. Collapsing these makes
both false positives and incident diagnosis worse.

Projection also has important false negatives:

| Risk | False-negative shape | Needed mechanism |
| --- | --- | --- |
| Stale-but-coherent bundle | Submitted `post_content` and CRDT are both from the same old snapshot, so projection passes. | Bundle CAS or per-field base generations. |
| Already-corrupt CRDT | CRDT blocks are empty, malformed, duplicated, or missing the user's block; materialization saves that bad state. | Client/live CRDT fix; server can only contain if a trusted prior/base projection is available. |
| Foreign CRDT | Title/content/CRDT are internally coherent but belong to another post/session. | Post-bound CRDT provenance, not projection. |
| Opaque block content | Freeform, invalid, unregistered, deprecated, dynamic, or filtered blocks cannot be safely projected. | Shadow telemetry or block-specific validators. |
| Reusable block target changed | Host `core/block` projection is valid while the referenced `wp_block` is stale or corrupt. | Separate bundle guard for the referenced entity. |
| Title not represented or mixed-base | Fresh content token with stale title can pass if title projection is absent. | Bundle/per-field generations; CRDT title projection only if authoritative. |
| No save request | Server never sees a protected-field write. | Client save integration fix; projection cannot help. |

This is why materialization promotes only a very small subset of rows in the
impact ladder. It is safest for rows where the submitted CRDT is known-good and
contains ordinary static blocks, while the submitted serialized `post_content`
is empty or stale. It should not be used as a general repair mechanism for
rows where live CRDT state has already collapsed, duplicated, or imported the
wrong document.

Materialization promotion audit:

| Rows | Recommendation | Reason |
| --- | --- | --- |
| `29` | Conditional full under materialization sensitivity only. | Best evidence: converged block tree retained checkpoint content while `getEditedPostContent()` regressed. Needs proof submitted CRDT blocks were projectable at save time. |
| `196` | Keep partial in base; conditional full only with archived CRDT decode. | Summary says non-empty RTC state, but row is unrunnable and does not prove the accepted submitted CRDT projection. |
| `15`, `32` | Do not promote to full. | Requests reportedly still carried blocks/CRDT, but editors had already collapsed to empty canvas. Materialization may preserve DB content, not repair live state. |
| `18`, `37`, `54`, `69`, `94`, `138`, `216`, `228` | Do not promote. | Empty-content symptoms are downstream of reload/live collapse; CRDT may be stale or already wrong. |
| `19`, `40`, `43`, `62`, `64`, `67`, `136`, `211`, `212`, `241`, `242` | Do not promote. | Malformed, flattened, plain-text, or invalid-markup rows are projection-containment candidates; materializing risks preserving corrupted CRDT/block state. |
| `60`, `63`, `141` | Do not promote through materialization. | These need atomic bundle persistence and client repair; evidence includes split or oscillating state. |
| `61` | Explicitly not promoted. | Submitted `_crdt_document` snapshots are described as stale; materializing from stale CRDT can persist the stale body. |
| `2`, `5`, `17`, `27`, `56`, `57` | Containment-only, not promoted. | Live/shared state is already wrong before persistence. |
| `8`, `155`, `156`, `243` | Full only through bundle/per-field freshness, not materialization alone. | Main defect is stale title/content with advanced or current CRDT. |
| `89` | Not projection/materialization. | Needs provenance; materialization would faithfully save the foreign document. |
| `23`, `45`, `90`, `227` | Not materialization. | These are CRDT no-op or dirty-settlement rows. |

The credited row groups depend on different mechanisms:

| Row group | Rows | Required mechanism | Why weaker variants are insufficient |
| --- | --- | --- | --- |
| Stale title/content/full-record saves | `8`, `155`, `156`, `243` | Commit-time bundle CAS, read/write-set discipline, and client repair; per-field base tracking or CRDT projection for mixed-base title/body cases. | `_crdt_document` CAS alone accepts current/newer CRDT meta paired with stale title/content. |
| Split or ambiguous post/meta persistence | `52`, `63`, `141` | Atomic protected-field commit plus conflict repair. | Preflight can pass and meta conflict can arrive after `wp_posts` fields changed. |
| Direct CRDT-meta clobber | `99` | `_crdt_document` guard or bundle CAS covering CRDT meta. | Does not require full projection, but bypass paths can still clobber meta. |
| Empty/corrupt serialized content | `15`, `18`, `19`, `29`, `32`, `37`, `40`, `43`, `54`, `60`, `61`, `62`, `64`, `67`, `69`, `94`, `136`, `138`, `196`, `211`, `212`, `216`, `228`, `241`, `242` | Projection validation for containment; server materialization only for the subset whose submitted CRDT remains trustworthy. | Bundle CAS cannot reject a fresh-token empty or malformed payload unless it is also stale. |
| CRDT save-loop settlement | `23`, `90`, `227` | Proven save-marker-only no-op settlement plus client dirty-state handling. | Rendered-content equality is unsafe, and wrapper-only equality is too weak for `savedAt`/`savedBy` churn. |
| HTML/entity canonicalization | `45` | Separate canonicalization across entity normalization, HTML, block attributes, and dirty-state handling. | CRDT no-op alone does not fix this family. |
| Containment-only live corruption | `2`, `5`, `17`, `27`, `56`, `57` | Same projection/commit machinery, but only as durable-write containment. | The visible/live CRDT bug happens before persistence, so rejecting a save does not repair the editor. |
| Foreign fresh-post contamination | `89` | Post-bound CRDT provenance. | A fresh post can have no stale bundle base; title/content/CRDT may be internally coherent for the wrong document. |

### Assumptions ledger

These assumptions are part of the base estimate. If they fail, downgrade the
affected rows before using the percentages as an implementation forecast.

| Assumption | Rows affected | Downgrade if false |
| --- | --- | --- |
| The server-owned token is checked at commit time, and protected post fields plus `_crdt_document` commit or reject as one unit. | `8`, `52`, `63`, `141`, `155`, `156`, `243`, `99` | Split post/meta rows become containment-only or unimpacted, and stale-save full rows become server-rejection-only partials. |
| Edit-context reads and save responses assemble protected fields plus bundle token from one coherent generation. | `52`, `99`, `141`, plus all client-retry rows | Apparent stale saves may be read-path/cache incoherence, and clients can retry from a base that never existed. |
| Submitted protected fields are known to be derived from the same bundle token, or the protocol carries per-field base generations. | `8`, `155`, `156`, `243` | Fresh-token mixed-base title/body payloads can pass CAS; rows need projection, per-field tracking, or drop to partial/unimpacted. |
| Non-RTC, legacy, plugin, WP-CLI, Classic Editor, XML-RPC, autosave, and revision-restore writes bump or invalidate the bundle token. | All stale-save rows, plus unknown plugin paths | Guarded RTC clients can later overwrite external changes with apparently valid tokens. |
| Title and excerpt are either represented in CRDT projection or covered by bundle/per-field generations. | `8`, `52`, `63`, `155`, `156`, `243` | Projection cannot prove stale title/excerpt; only token-based evidence remains. |
| Projection validation is conservative for freeform, invalid, deprecated, unregistered, dynamic, filtered, and code-editor content. | Empty/corrupt-content partial rows | False positives make enforcement unsafe; these rows fall back to shadow-mode evidence or containment only. |
| Server materialization is used only when the submitted CRDT is trustworthy and projectable under the declared policy. | `29`, `196`, weaker candidates `15`, `18`, `32`, `37`, `54`, `69`, `94`, `138` | Materialization can faithfully persist already-wrong CRDT state, so it should not be credited as a full fix. |
| CRDT no-op settlement proves save-marker-only or wrapper-only churn and has client dirty-state acknowledgement. | `23`, `90`, `227` | Save-loop rows drop to partial or unimpacted. |
| Row `45` is credited only if the mitigation also includes safe HTML/entity/block canonicalization, not CRDT no-op alone. | `45` | Remove 1 partial row / 2 weighted from the base estimate if canonicalization is out of scope. |
| Client 409/no-op handling refetches, rebases, retries once, clears dirty state, and does not apply rejected payloads locally. | All full rows | Server-only rejection is durable containment, not full bug resolution. |
| Conditional rows keep their current classification only when trace evidence confirms the guarded bad-save path. | `2`, `5`, `17`, `27`, `52`, `56`, `57`, `69`, `141`, `155`, `243` | Otherwise downgrade them to containment-only, partial, or unimpacted depending on whether the row is actually read-after-write, reload, title split, or live-CRDT divergence. |

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
| Strict bug-resolution | 6 rows / 14 weighted | 12 rows / 18 weighted | 18 rows / 32 weighted | Counts only rows with higher mitigation-mechanism evidence: direct stale-save, CRDT-churn, or empty/corrupt persistence evidence. This is not the same as the handoff's `Confidence` column. |
| Base estimate | 8 rows / 16 weighted | 29 rows / 42 weighted | 37 rows / 58 weighted | The central estimate used in this section after the conservative row re-audit. |
| Optimistic durable-containment | 8 rows / 16 weighted | 29 rows / 42 weighted | 43 rows / 89 weighted | Adds containment-only rows where the server might block durable bad state but not resolve the visible bug. |

Strict full rows: `8`, `23`, `90`, `156`, `227`, `243`. Strict partial rows:
`15`, `18`, `37`, `54`, `60`, `61`, `64`, `67`, `196`, `211`, `241`,
`242`.

A more evidence-hardened sensitivity band treats undecoded CRDT no-op rows and
ambiguous read-after-write/split rows as conditional rather than credited in
the central bucket:

| Sensitivity adjustment | Fully fixed | Partially mitigated | Touched/contained | Notes |
| --- | ---: | ---: | ---: | --- |
| Base estimate | 8 rows / 16 weighted | 29 rows / 42 weighted | 37 rows / 58 weighted | Assumes decoded no-op proof, guarded bad-save path for conditional rows, and canonicalization for row `45`. |
| No CRDT no-op or canonicalization credit | 5 rows / 11 weighted | 28 rows / 40 weighted | 33 rows / 51 weighted | Counts bundle CAS, atomic commit, and projection only; removes `23`, `45`, `90`, and `227`. |
| No-op proof required | 6 rows / 12 weighted | 31 rows / 46 weighted | 37 rows / 58 weighted | Moves `23` and `90` from full to partial until decoded Yjs diffs prove save-marker-only churn; row `227` remains full because it has stronger dirty-settlement evidence. |
| Guarded-save evidence required | 5 rows / 11 weighted | 28 rows / 42 weighted | 33 rows / 53 weighted | Also treats row `99` as partial unless DB meta clobber is confirmed, removes row `45` without canonicalization, and removes or downgrades `52`, `69`, and `141` unless traces prove an accepted guarded bad save. |
| Containment upper bound with strict proof | 5 rows / 11 weighted | 28 rows / 42 weighted | 36 rows / 79 weighted | Keeps containment rows `2`, `5`, and `17`, but treats `27`, `56`, and `57` as unmeasured upper-bound rows until request/DB traces prove later durable bad saves. |

This stricter table does not replace the base estimate; it describes what to
report if the measurement pipeline cannot prove the assumptions in the ledger.

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
| Bundle versioning with atomic protected-field commit only | about 7-8 | about 13-14 | Named base-conflict candidates are `8`, `52`, `63`, `141`, `155`, `156`, and `243`; include row `99` only if the bundle token also covers direct CRDT-meta clobber. If this is only preflight versioning without atomic protected-field commit, split rows `52`, `63`, and `141` drop out and the sensitivity falls toward 5 rows / 11 weighted. |
| Bundle versioning plus projection validation | 33 | 51 | All bug-resolution rows except the CRDT no-op/canonicalization rows. This adds many empty, malformed, stale, or content-vs-CRDT inconsistent save payloads, but mostly as partial fixes because live editor state can already be broken. |
| Safe CRDT save-marker no-op settlement | 3 | 5 | Rows `23`, `90`, and `227`, where stable visible content keeps dirtying the entity through known non-semantic CRDT persistence churn. |
| HTML/entity canonicalization | 1 | 2 | Row `45`, which is an entity-normalization save-loop family and should not be credited to CRDT no-op alone. |
| Full assumed mitigation | 37 bug-resolution rows | 58 | The 8 full plus 29 partial rows in the table above. |
| Full assumed mitigation plus containment-only rows | 43 touched rows | 89 | Adds weak cases where durable bad writes can be rejected, but the visible bug is still live CRDT or reload instability. |

Mechanism-separated accumulation:

| Variant | Full | Partial | Containment-only | Total touched |
| --- | ---: | ---: | ---: | ---: |
| Bundle CAS plus projection, no no-op/canonicalization | 5 / 11 | 28 / 40 | 0 / 0 | 33 / 51 |
| Add CRDT save-marker no-op settlement | 8 / 16 | 28 / 40 | 0 / 0 | 36 / 56 |
| Add HTML/entity canonicalization row `45` | 8 / 16 | 29 / 42 | 0 / 0 | 37 / 58 |
| Add containment-only upper bound | 8 / 16 | 29 / 42 | 6 / 31 | 43 / 89 |
| Add strong separate provenance guard for `89` | 9 / 17 | 29 / 42 | 6 / 31 | 44 / 90 |

Row `45` is deliberately separate from the CRDT no-op rows. Row `199` is also
an HTML/entity-canonicalization residual but stays excluded because the current
mitigation is scoped to the editor-content bundle and the handoff evidence does
not show the same guarded CRDT save-marker settlement path. If canonicalization
becomes an explicit third mechanism, both rows should be re-audited together.

Degraded deployment modes should be reported separately from the base estimate:

| Degraded mode | Expected impact accounting |
| --- | --- |
| Token emission without enforcement | No mitigation credit; useful only for shadow classification. |
| Enforcement without coherent read/mutation token responses | Full rows become at best partial, because clients cannot reliably repair after a conflict. |
| CAS without atomic protected-field commit | Drop split rows `52`, `63`, and `141`; sensitivity falls toward 5 rows / 11 weighted before projection/no-op layers. |
| CAS without projection/projectability | Projection-content partial rows drop out; only stale-base, direct CRDT-meta, and no-op/canonicalization rows remain. |
| Projection without projectability/unknown handling | Do not enforce; false positives can be worse than the bug being mitigated. |
| Client repair disabled or mixed-version participants active | Server containment may remain, but bug-resolution full rows should be counted as partial or unmeasured. |
| Lifecycle cleanup or legacy invalidation broken | Strict enforcement should be disabled because stale tokens can survive delete/clone/import/legacy writes. |

Operational degraded behavior should also be specified:

| Condition | Degraded behavior | Metric |
| --- | --- | --- |
| Bundle token store unavailable | Disable enforcement for RTC saves, emit shadow decision, and force post-save refetch. | `degraded_token_store_unavailable` |
| Commit-time lock unavailable or timed out | Return a retryable guarded-save error; do not silently accept protected fields. | `degraded_lock_timeout` |
| Projection decoder unavailable or over limit | Keep CAS enforcement, classify projection as `unknown`, and skip projection enforcement. | `degraded_projection_unavailable` |
| Mixed-version collaborators | Keep token emission, disable strict enforcement for the session unless compatibility is proven. | `degraded_mixed_client_session` |
| Object-cache/preload incoherence detected | Serve uncached edit-context reads or force refetch before save. | `degraded_cache_incoherence` |
| Capability/KSES/authorship policy unavailable | Disable materialization; keep only CAS/projection telemetry that is safe under normal REST permissions. | `degraded_materialization_security_policy_unavailable` |

A degraded accept should not be counted as mitigation success. Telemetry should
record `degraded_reason`, `degraded_decision`, `protected_fields_written`,
`client_refetch_forced`, and `save_completed_after_degrade`.

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
| `23`, `90`, `227` | Preserve or return a stable no-op CRDT representation when only non-semantic save metadata changed. | Stop marking the entity dirty after the no-op response. Without this, the server may accept harmless writes while the editor keeps spinning. |
| `45` | Apply separate safe HTML/entity/block canonicalization in addition to any CRDT no-op handling. | Stop re-dirtying the record after canonical equivalent content is acknowledged. This is not fixed by CRDT no-op alone. |
| `15`, `18`, `19`, `29`, `32`, `37`, `40`, `43`, `54`, `60`, `61`, `62`, `64`, `67`, `69`, `94`, `136`, `138`, `196`, `211`, `212`, `216`, `228`, `241`, `242` | Reject provably empty, stale, flattened, or malformed durable content. | Repair the live editor state that generated the bad payload; otherwise the user may still see a collapsed or corrupt editor. |

Layer-specific downgrades:

| Missing layer | Rows downgraded | Expected downgrade |
| --- | --- | --- |
| Client conflict repair | `8`, `52`, `63`, `99`, `141`, `155`, `156`, `243` | Credited rows become weaker: the bad write is blocked, but the user-visible save may fail. Rows already classified as partial remain partial, but with lower operational value. |
| Projection/cross-field validation | `15`, `18`, `19`, `29`, `32`, `37`, `40`, `43`, `54`, `60`, `61`, `62`, `64`, `67`, `69`, `94`, `136`, `138`, `196`, `211`, `212`, `216`, `228`, `241`, `242` | Partial rows mostly become unimpacted because a pure version check cannot prove content is impossible. |
| Safe CRDT no-op settlement | `23`, `90`, `227` | Full no-op rows become partial or unimpacted if save-marker-only churn is not proven. |
| HTML/entity canonicalization | `45` | Row `45` drops out unless canonicalization is explicitly in scope. |
| Atomic post-fields-plus-meta commit | `8`, `52`, `63`, `141`, `155`, `156`, `243` | Split bundles can still persist, so the server may only reduce some races. |
| Bypass policy for legacy/full-record/non-REST writes | `8`, `52`, `63`, `99`, `141`, `155`, `156`, `243`, plus unknown plugin paths | Stale protected fields or CRDT meta can still be written outside the guarded RTC path. |

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

Rows `136` and `241` also need a scope caveat. They remain partial only for
content/markup containment. Any slug, status, or non-content entity corruption
in those failures remains outside the editor-content-bundle mitigation, and
title symptoms require either title projection or per-field generations.

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

Provenance needs an explicit threat model. `document_generation` and
`room_generation` are client-visible isolation labels, not authorization
credentials. Possession of a room generation or embedded provenance tuple must
never authorize `/wp-sync` or REST writes; normal `edit_post` capability,
nonce/session checks, and post-status access checks still gate every read and
write. Unsigned labels catch accidental foreign-document contamination, not
deliberate forgery by an authorized client.

If unforgeability is required, provenance needs a server-stamped proof separate
from the plain identity tuple, such as a key-versioned HMAC over site/blog id,
entity type, post type, post id, document generation, room generation, schema
version, and purpose. The server record remains authoritative: a valid proof
for an old, tombstoned, deleted, or rotated generation must still be rejected.
A signed tuple prevents blind forgery, but not copy/replay of a valid proof
unless it is also bound to the accepted document base, canonical Y.Doc hash, or
a server-applied update chain.

Embedded provenance needs canonical decoding rules. The Y.Doc should contain
exactly one provenance record in a reserved namespace that normal block/user
data cannot shadow, duplicate, or override. Wrapper provenance must be derived
from that embedded record. Missing, duplicate, undecodable, schema-unknown, or
wrapper/embedded-mismatched provenance should quarantine or reject before
projection/no-op handling; it should not fall back to trusting the JSON
wrapper.

Server enforcement should reject `_crdt_document` writes whose provenance does
not match the server record, with no mutation to `post_title`, `post_content`,
`excerpt`, or `_crdt_document`. A stronger version also gates `/wp-sync` room
updates by `room_generation`, either by including the generation in room
identity or by adding a validated request field. Current room parsing assumes
`postType/post:<numeric-id>`, so embedding generation in the room string would
need a route/schema/parser change.

Bootstrap/read policy is part of provenance. The server must validate or
initialize provenance before the client applies a persisted `_crdt_document` or
joins a sync room. On edit-context read, a missing or mismatched provenance
record should cause the server to mint or rotate the post's provenance and
either omit the stale `_crdt_document` or mark it invalid, not return it as
canonical state. Save-time provenance alone is only durable containment; it
cannot fully fix row `89` if the editor already hydrated the foreign Y.Doc
during open.

Provenance must also be server-verifiable for full credit. Checking only a
client-writable JSON-wrapper provenance field is not enough if a buggy save
path can wrap a foreign Y.Doc with the current post's identity. The server
either needs to decode enough of the Yjs state map to verify that wrapper
provenance matches embedded document provenance, or the implementation must
explicitly treat wrapper/Y.Doc agreement as a trusted client invariant and cover
it with negative tests. Without that, provenance should remain partial or
telemetry-grade.

Rotating `document_generation` or `room_generation` must invalidate outstanding
editor-content bundle tokens, `_crdt_document.baseVersion` values, room
cursors, and room-history cache keys for the old generation. Otherwise an old
client can hold a still-valid bundle token while carrying the wrong
collaboration generation, or can re-consume old room updates after the server
has decided the document identity changed.

Legacy provenance migration needs an adoption path. Existing persisted
`_crdt_document` values will not carry post-bound provenance. On first
provenance-aware edit-context read, "missing provenance" should not be treated
the same as "mismatched provenance" unless the server can prove the document is
foreign. A safe path is to mint the server provenance record from current raw
protected fields, mark the existing CRDT as legacy-adopted for that post
generation, require the next guarded save to stamp or verifiably embed
provenance, and quarantine rather than silently discard when title/content/CRDT
projection is incoherent. Otherwise rollout can create false row-`89`-style
resets for valid pre-provenance posts.

Multisite and site-clone identity must be explicit. `site_uuid` should identify
a single blog/site, not only a network, domain, or post-id namespace. Room
names, bundle-version rows, object-cache keys, REST preload keys, and
provenance records must include the same site discriminator and remain correct
across `switch_to_blog()`. A database clone to staging is a special case:
either intentionally preserve the site UUID as a same-site restore, or rotate
`site_uuid`, `document_generation`, `room_generation`, bundle tokens, and room
history together. Preserving production `site_uuid` while using a shared sync
backend can make a staging clone eligible to consume production room state.

Schema-version migration should invalidate tokens by capability, not just by
stored document shape. A provenance schema bump, CRDT schema bump, room-name
schema bump, or projection-policy version bump must invalidate outstanding
bundle tokens and require clients to advertise support before strict writes are
accepted. Mixed-version clients that cannot read/write embedded provenance
should be treated as legacy external writers: allow only in compatibility mode,
advance or invalidate the bundle generation on protected-field mutation, and
force provenance-aware clients to refetch before their next guarded save.

The provenance reject must happen before, or atomically with, protected
post-field mutation. A provenance check that runs only during `_crdt_document`
meta update is not sufficient for row `89`: a foreign whole-record REST payload
could still write `post_title` and `post_content` before the meta write is
rejected. For impact credit, `reject_provenance_mismatch` must leave all
protected fields unchanged.

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

If combined with the full editor-content-bundle protocol, provenance changes
the broader estimate only for row `89`, and the result depends on provenance
scope:

| Combined design | Full | Partial | Unimpacted |
| --- | ---: | ---: | ---: |
| Full bundle protocol plus REST-save provenance only | 8 rows / 16 weighted | 30 rows / 43 weighted | 241 rows / 393 weighted |
| Full bundle protocol plus sync-room generation gating and client discard/refetch/rejoin | 9 rows / 17 weighted | 29 rows / 42 weighted | 241 rows / 393 weighted |

REST-save provenance is partial because it can reject a durable foreign
`_crdt_document` write, but stale room history or a foreign in-memory Y.Doc may
already have contaminated the live editor. Row `89` should be counted as full
only when the mitigation also prevents joining or applying updates from the
wrong room generation and the client discards the foreign local document before
rejoining.

Provenance should run before bundle CAS: a provenance mismatch is not a normal
stale-base conflict to merge; it is wrong-document state.

Compatibility policy is part of the invariant:

| Flow | Policy |
| --- | --- |
| Duplicate/clone | Copy title/content/excerpt as source material, but strip `_crdt_document` and mint new `document_generation`/`room_generation`. Generic duplicate flows must not copy source CRDT provenance. |
| Template/pattern creation | Initialize a new CRDT document for the destination entity; do not preserve source provenance from template content. |
| Import/migration | Default imports strip or quarantine `_crdt_document`; trusted same-site migrations may preserve provenance only when intentionally preserving exact site/post identity. |
| Auto-draft promotion | Mint provenance after a canonical post ID exists. If promotion keeps the same post ID, keep the generation; if it creates or remaps the entity, rotate it. |
| Revision restore | Because `_crdt_document` revisions are disabled, restore title/content/excerpt into the current provenance generation or rotate `room_generation` and force clients to reload; do not restore stale CRDT provenance from revision data. |

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
`reject_provenance_mismatch`, `reject_stale_bundle`,
`reject_projection_mismatch`, `canonicalize_crdt_noop`,
`accepted_real_update`, or `bypass_unguarded_path`. Decision precedence
matters: provenance mismatch is decided first when provenance is in scope, stale
bundle is decided before projection, projection runs only after the base token
is current and the write set explicitly includes the contradicted field, and
CRDT no-op is a successful no-mutation or canonicalized response, not a
conflict. Client repair is a multi-request outcome tied to the same logical
save, not a server outcome.

Projection-specific outcomes should separate "proved bad" from "cannot prove":
`projection_unknown_opaque_content`, `projection_unavailable_decode_failed`,
`projection_unavailable_limit`, `projection_policy_changed`,
`crdt_internal_projection_mismatch`, `materialized_from_projectable_crdt`, and
`materialization_refused_unprojectable_crdt`. Without this separation,
shadow-mode telemetry will overcount projection as if every non-empty CRDT were
safely enforceable.

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

Each measured fixture should also emit a machine-readable outcome ledger:
`baseline_reproduced`, `guarded_path_observed`, `shadow_decision`,
`enforced_decision`, `server_contained`, `client_repaired`, `final_db_clean`,
`final_peers_clean`, `measured_bucket`, and `downgrade_reason`. Rows with
`baseline_reproduced=false` or `guarded_path_observed=false` should be reported
separately from fixed, partial, and unimpacted rows. A reduced REST fixture can
validate the guard, but it should not promote the original row if the reduction
changes the mechanism from reload/live-CRDT corruption into a synthetic
stale-token conflict.

Shadow mode should be evaluated as a classifier before enforcement. For each
candidate row and negative-control family, publish a confusion matrix by
mechanism: stale bundle, split commit, projection mismatch, CRDT no-op, bypass,
live-diverged-before-save, and no-save-request. Promotion from shadow to
enforcement should require zero enforced-action false positives in negative
controls, no projection rejects for valid opaque content classes, high
agreement with positive-row fixture oracles, low unguarded-bypass rate for
opted-in RTC saves, and measured client repair success after stale-bundle
conflicts.

Race fixtures should use explicit barriers rather than sleeps when possible:
pause after token read, before commit-time token check, before `wp_posts`
mutation, between `wp_posts` mutation and `_crdt_document` meta mutation, and
after protected fields mutate but before REST side effects complete. Inject a
competing token-advancing save and a legacy/direct token-invalidation write at
each barrier. A race fixture passes only if protected-field mutation is
all-or-nothing and the final token history has no ABA ambiguity.

Measured impact should include repeat counts and uncertainty, not just a
single pass/fail result. For stochastic e2e fixtures, report
`baseline_repro_rate`, `enforced_failure_rate`, and a confidence interval for
the delta. Rows with low or unstable baseline reproduction should be marked
`measurement_inconclusive`, not promoted or demoted by one clean enforced run.
For ambiguous rows, keep a short adjudication note linked to the row ID with
guarded-path evidence, final DB evidence, final peer evidence, and downgrade
reason.

Publish measured fractions overall and by stratum: HTTP polling vs WebSocket,
manual save vs reconciliation save vs autosave promotion vs retry save,
mechanism family, post lifecycle, and write source. A mitigation that performs
well overall but fails one stratum, such as WebSocket retry saves or auto-draft
promotion, should remain scoped away from that stratum.

Minimum server tests:

- stale bundle token rejects before any post fields or `_crdt_document` meta are
  written;
- edit-context REST responses and save responses contain protected fields and
  bundle token from the same generation, even with object-cache, preload, and
  Core Data resolver cache invalidation in play;
- row `52`/`141`-style save/REST divergence tests record raw DB values so
  read-path incoherence is separated from split durable persistence;
- duplicate delivery of an already accepted `save_attempt_id` returns the same
  canonical response without advancing the token or rewriting CRDT save markers;
- reuse of a `save_attempt_id` with a different payload, base token, provenance,
  or write set is rejected;
- first guarded save on a post without an existing version row uses atomic
  insert/upsert and cannot let two concurrent initializers both commit;
- unauthorized users cannot distinguish stale-token, provenance, or projection
  mismatch details for posts they cannot edit;
- idempotency replays rerun authorization and do not return stored canonical
  responses after access is revoked;
- `save_attempt_id` collisions are scoped by site, post, user/session class,
  and attempt id; unauthorized requests cannot reserve or poison attempt ids;
- malformed or oversized CRDT/projection payloads are rejected before acquiring
  the bundle-version lock;
- scalar bundle tokens reject mixed-base protected fields, or per-field
  generations prove the submitted title/content/excerpt/CRDT values came from
  compatible bases;
- conflict detected at meta-update time cannot leave already-written
  `post_title`/`post_content` behind;
- term/meta failures after the guarded post-field write cannot leave a partially
  committed editor-content bundle;
- ordinary WordPress hooks, REST additional fields, metabox AJAX, and plugin
  observers cannot observe or persist a protected-field write that later rolls
  back as a bundle conflict;
- validator field normalization matches the REST controller's
  `prepare_item_for_database()` handling of raw title/content/excerpt values;
- status/taxonomy-only saves do not require a bundle token and do not overwrite
  protected fields;
- legacy full-record payloads with stale protected fields are rejected or have
  unlisted protected fields ignored by the RTC save path;
- autosaves and revision restores either use their own policy or explicitly
  invalidate/bump the canonical bundle token.
- auto-draft autosave promotion is guarded by the parent bundle token or avoids
  writing protected fields.
- projection enforcement records `match`, `mismatch`, or `unknown` plus
  projectability class, and never rejects or materializes `unknown`;
- projection policy changes, block-registry changes, and projection resource
  limit hits produce distinct outcomes rather than generic mismatches.
- authenticated mutation responses return the next bundle token and canonical
  protected-field state, not only edit-context GET responses;
- private protocol fields are not accepted only through query args, and access
  logs cannot reconstruct tokens/provenance/attempt ids from URLs;
- `_fields`, sparse-field, and non-edit-context REST responses do not erase
  cached bundle tokens for token-aware clients, and public contexts do not leak
  private token/provenance diagnostics;
- CPT/template/quick-edit/generic Core Data save paths are either guarded by
  the same protocol or explicitly invalidate the token when protected fields
  change.
- REST batch transport either preserves per-save bundle conflict semantics or
  is bypassed for guarded RTC saves;
- direct guarded writes invalidate post and post-meta caches after commit.
- trash, untrash, permanent delete, auto-draft cleanup, duplicate/import, and
  cross-site move paths clean up or rotate bundle/provenance/attempt state as
  specified.

Minimum client tests:

- `rest_editor_content_bundle_stale` follows the same one-shot refetch, merge,
  recompute, retry pattern as `rest_crdt_document_stale`;
- network retry of the same logical save reuses the same idempotency key, while
  conflict repair uses a new guarded attempt tied to the repaired base token;
- successful saves retain the returned bundle token in client state after the
  mutation response is stored as the raw record;
- rejected saves preserve the user's local edits and leave unload protection
  active unless an automatic repair retry reaches canonical success;
- ambiguous rebase, provenance mismatch, capability change, or repeated 409
  exits the save loop with a user-visible conflict instead of clearing dirty
  state or spinning;
- stale same-user tabs and resumed/offline tabs either receive a 409 and
  preserve local edits or refetch before guarded save;
- bundle retry reruns editor-layer content materialization and
  `editor.preSavePost`, or proves those transformations have moved into the
  retrying layer;
- a second 409 does not spin indefinitely;
- a no-op CRDT persistence response leaves the edited entity clean;
- rejected stale responses are not applied into the local CRDT/sync manager.
- successful server response, not local optimistic retry setup, is what clears
  dirty state and updates sync-manager saved markers.

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

For token-granularity rollout, also record whether the request used scalar or
per-field generations, which protected fields were in the declared read set,
which were in the write set, whether a conflict was overlapping or
non-overlapping, whether the response was an idempotent replay, and whether a
legacy invalidation followed a direct write. These dimensions are needed to
separate real stale-write prevention from newly introduced false conflicts.

Production rollout should keep a deterministic holdback cohort, keyed by
site/post/session so retries and reloads stay in the same cohort. Compare
enforced clients against shadow-only holdback on save failure rate, repeated
save rate, dirty-state duration, post-reload divergence, and legacy
invalidation rate. Mixed-version sessions need their own reporting buckets:
one upgraded collaborator plus one old collaborator, all upgraded, and all old.
Strict enforcement should stay disabled for a session unless every active RTC
participant advertises bundle-token and conflict-repair support, or the server
has a proven compatibility path for mixed clients.

Add a low-volume invariant audit independent of request handling. Sample
RTC-enabled posts and verify that the stored bundle token, protected-field
hashes, and `_crdt_document` metadata agree with the last recorded protected
mutation. Count protected-field changes without token advance, token advances
without protected-field mutation, token regressions, and legacy writes that do
not invalidate before the next guarded RTC save as
`bundle_token_invariant_violation`.

For clustered deployments, add deployment-health outcomes:
`bundle_schema_unavailable`, `old_server_unguarded_write`,
`replica_lag_token_mismatch`, and `primary_read_required`. Rolling-deploy tests
should include one webhead enforcing, one only invalidating, and one old/unaware
server. Strict mode should not start until all write-serving webheads have
compatible code and conflict-repair reads are pinned to a coherent read path.

Lifecycle telemetry should include `bundle_row_orphaned`,
`attempt_row_orphaned`, `room_history_orphaned`, `token_filtered_from_response`,
`token_lost_after_sparse_response`, `tombstoned_generation_read`, and
`legacy_adoption_required`. These are not expected bug fixes, but they catch
conditions that would make the measured mitigation unsafe to enforce.

Track bundle-token lifecycle transitions as first-class metrics:
`token_initialized`, `token_advanced_guarded_save`,
`token_invalidated_legacy_write`, `token_rotated_provenance_change`,
`token_reused_idempotent_replay`, `token_rejected_stale`,
`token_missing_expected`, and `token_retired_cleanup`. For each transition,
record write source, protected fields changed, and whether active RTC sessions
were present. Stale-token reuse after invalidation is distinct from a normal
409 because it means the server had already declared the generation obsolete.

Telemetry should include cost signals: token read latency, commit-check
latency, lock wait time, projection-validation time, CRDT decode time, retry
delay, and response payload size. Report these separately for accepted saves,
rejected conflicts, no-op CRDT settlements, and legacy invalidations. A
correctness mitigation that materially increases save latency or lock
contention can create new repeated-save or timeout behavior.

Strict enforcement should not use the estimated 8/29/242 split as readiness
evidence. Canary rollout should require high guarded-path coverage for opted-in
RTC saves, explainable missing-token and bypass events, stale-bundle 409s that
usually end in one-shot repair, bounded repeated conflicts that surface a real
editor conflict instead of a save loop, CRDT no-op responses that clear dirty
state without dropping causal updates, and zero negative-control false
positives through shadow and canary traffic.

Rollback should be mechanism-scoped, not a single global switch. Keep separate
flags for token emission, client token submission, bundle-CAS enforcement,
projection enforcement, CRDT no-op settlement, provenance enforcement, and
guarded-endpoint routing. Roll back enforcement before token emission, so
upgraded clients keep receiving tokens and telemetry remains comparable while
hard rejects become shadow decisions. Projection and provenance enforcement
should roll back independently from bundle CAS because their false-positive
risks are different.

Initial enforcement should stay in the lowest-ambiguity segment: `post` and
`page`, existing draft/published posts, no active revision restore or
auto-draft promotion, no incompatible metabox/custom REST overrides,
projectable content below decode/projection limits, all active collaborators
advertising the same protocol version, and matching provenance generation.
Hold back CPTs, templates, synced patterns, multisite, large documents,
unprojectable content, and mixed-version sessions until they have separate
baselines and negative controls.

Automatic safety stops should be defined before canary. Mechanism-scoped
disable conditions include any protected-field mutation after enforced
rejection, any unexplained `bundle_token_invariant_violation`, conflict storms
above the save-failure budget, p95 save latency or lock wait beyond budget,
stale-bundle repair success below threshold, any projection false positive
against benign opaque-content controls, or sustained increases in dirty-state
duration, save-loop detections, or unload-with-unsaved-changes prompts.

Every enforced rejection should return a stable diagnostic code and redacted
diagnostic id that joins server logs, client logs, and support reports. The
diagnostic record should include mechanism, write set, token match state,
projection class, retry count, and whether any protected field mutated, without
logging raw post content or CRDT payloads.

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
- A database transaction wrapped around ordinary WordPress APIs is not
  automatically sufficient. Hooks, cache invalidation, revision creation,
  REST additional fields, term/meta callbacks, metabox AJAX, and external
  plugin observers can run before rollback and can emit side effects the
  database transaction cannot undo. The guarded endpoint should either perform
  protected storage mutation before side-effect hooks and emit hooks after
  commit, or explicitly document which side effects are outside the atomicity
  guarantee.
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
