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
  the submitted CRDT projection, submitted empty/omitted content when the same
  submitted CRDT deterministically projects to non-empty ordinary blocks, or
  malformed/flattened block markup that cannot be the serialization of the
  submitted CRDT's valid ordinary block tree. Byte-for-byte HTML differences,
  parser normalization, default blocks, freeform/invalid block repair,
  deprecated block migrations, filters, and unregistered blocks are not enough
  by themselves.
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

The broader mitigation therefore needs a new server-side invariant, not just a
larger version of the current `_crdt_document` check. The invariant is: "this
save was derived from the same editor-content-bundle state that is still
current at commit time, and the submitted bundle is internally coherent."

### Concrete mitigation shape

The impact estimates below assume an implementation closer to a guarded commit
protocol than to another validation filter:

1. **Read shape.** Edit-context REST responses expose an opaque
   `editor_content_bundle` object for the protected fields, for example a
   server-owned `token` plus `fields: [ "content", "title", "excerpt",
   "meta._crdt_document" ]`. The token is not `post_modified`; it is a
   server-owned version row/counter or equivalent CAS primitive computed from
   canonical raw DB values plus the CRDT document version.
2. **Write shape.** Collaborative saves include the base bundle version, the
   intended protected-field write set, and the serialized `_crdt_document`,
   for example a private `_editor_content_bundle` write arg with `base_token`
   and `fields`. `_crdt_document.baseVersion` can remain as a compatibility
   guard, but the bundle token is the authoritative CAS token. Partial saves,
   autosaves, code-editor writes, revision restores, and non-REST writes either
   opt out explicitly or follow a separate policy that still bumps or
   invalidates the bundle version.
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
   for example, a submitted `post_content` that is empty while the submitted or
   current CRDT projection deterministically contains non-empty ordinary blocks.
   It does not reject merely because serialized HTML differs from a projection.
6. **No-op CRDT persistence.** If the only difference is known-volatile save
   metadata, the server preserves or returns a stable stored CRDT representation
   so the client stops dirtying the post. If the incoming Yjs document contains
   additional causal state, the server must merge, reject/refetch, or accept it
   as a real update rather than discard it as a no-op.

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

This is the base estimate, not a server-only estimate. It assumes both the
server-side invariants above and client behavior that turns 409/no-op responses
into a clean editor state.

| Estimate band | Fully fixed | Partially mitigated | Touched/contained | Interpretation |
| --- | ---: | ---: | ---: | --- |
| Strict bug-resolution | 6 rows / 14 weighted | 12 rows / 18 weighted | 18 rows / 32 weighted | Counts only the higher-confidence rows with direct stale-save, CRDT-churn, or empty/corrupt persistence evidence. |
| Base estimate | 9 rows / 17 weighted | 28 rows / 41 weighted | 37 rows / 58 weighted | The central estimate used in this section. |
| Optimistic durable-containment | 9 rows / 17 weighted | 28 rows / 41 weighted | 45 rows / 93 weighted | Adds containment-only rows where the server might block durable bad state but not resolve the visible bug. |

Strict full rows: `8`, `23`, `90`, `156`, `227`, `243`. Strict partial rows:
`15`, `18`, `37`, `54`, `60`, `61`, `64`, `67`, `196`, `211`, `241`,
`242`.

### Mechanism sensitivity

The 9/28/242 estimate assumes all three layers in the assumed design exist.
If the implementation ships only part of the design, the impact drops quickly.

| Implemented layer | Rows improved | Weighted | What it actually catches |
| --- | ---: | ---: | --- |
| Current narrow `_crdt_document` stale guard only | 3 | 3 | One direct CRDT-meta clobber row plus two weak/partial CRDT-adjacent rows from the first analysis. |
| Atomic bundle versioning only | about 7-8 | about 13-14 | Named base-conflict candidates are `8`, `52`, `63`, `141`, `155`, `156`, and `243`; include row `99` only if the bundle token also covers direct CRDT-meta clobber. This does not detect a self-consistent but wrong bundle. |
| Bundle versioning plus projection validation | 32 | 48 | All bug-resolution rows except the CRDT no-op/canonicalization rows. This adds many empty, malformed, stale, or content-vs-CRDT inconsistent save payloads, but mostly as partial fixes because live editor state can already be broken. |
| Safe CRDT no-op/canonicalization handling | 5 | 10 | Rows `23`, `45`, `90`, `187`, and `227`, where semantically stable visible content may keep dirtying the entity through CRDT or canonicalization churn. |
| Full assumed mitigation | 37 bug-resolution rows | 58 | The 9 full plus 28 partial rows in the table above. |
| Full assumed mitigation plus containment-only rows | 45 touched rows | 93 | Adds weak cases where durable bad writes can be rejected, but the visible bug is still live CRDT or reload instability. |

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
| `8`, `52`, `63`, `141`, `155`, `156`, `243` | Reject stale or internally inconsistent bundle writes. | Refetch, apply persisted CRDT, rematerialize title/content/meta, and retry or surface a clear conflict. Without this, full rows become "bad write blocked but save failed." |
| `23`, `45`, `90`, `187`, `227` | Preserve or return a stable no-op CRDT representation when only non-semantic save metadata changed. | Stop marking the entity dirty after the no-op response. Without this, the server may accept harmless writes while the editor keeps spinning. |
| `15`, `18`, `29`, `32`, `37`, `40`, `43`, `54`, `60`, `61`, `62`, `64`, `67`, `69`, `94`, `136`, `138`, `196`, `211`, `212`, `216`, `228`, `241`, `242` | Reject provably empty, stale, flattened, or malformed durable content. | Repair the live editor state that generated the bad payload; otherwise the user may still see a collapsed or corrupt editor. |

Layer-specific downgrades:

| Missing layer | Rows downgraded | Expected downgrade |
| --- | --- | --- |
| Client conflict repair | `8`, `52`, `99`, `155`, `156`, `243` | Full becomes partial: the bad write is blocked, but the user-visible save may fail. |
| Projection/cross-field validation | `15`, `18`, `29`, `32`, `37`, `40`, `43`, `54`, `60`, `61`, `62`, `64`, `67`, `69`, `94`, `136`, `138`, `196`, `211`, `212`, `216`, `228`, `241`, `242` | Partial rows mostly become unimpacted because a pure version check cannot prove content is impossible. |
| Safe CRDT no-op settlement | `23`, `90`, `227`; also `45`, `187` | Full no-op rows become partial or unimpacted; weak partial save-loop rows mostly become unimpacted. |
| Atomic post-fields-plus-meta commit | `8`, `52`, `63`, `141`, `155`, `156`, `243` | Split bundles can still persist, so the server may only reduce some races. |
| Bypass policy for legacy/full-record/non-REST writes | `8`, `52`, `155`, `156`, `243`, plus unknown plugin paths | Stale protected fields can still be written outside the guarded RTC path. |

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

Full-fix confidence:

| Confidence | Rows | Weighted | Why |
| --- | --- | ---: | --- |
| Higher | `8`, `23`, `90`, `156`, `227`, `243` | 14 | These have direct evidence of stale accepted saves, repeated same-content CRDT save churn, or double-PUT clobbering that maps cleanly to the assumed guard or no-op behavior. |
| Medium | `52`, `99`, `155` | 3 | These fit the mechanism, but evidence is weaker: row 52 is intermittent read-after-save divergence, row 99 did not reproduce in isolated probes, and row 155 relies on archived trace evidence. |

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

Partial-fix confidence:

| Confidence | Rows | Why |
| --- | --- | --- |
| Higher containment confidence | `15`, `18`, `37`, `54`, `60`, `61`, `64`, `67`, `196`, `211`, `241`, `242` | The manifest summaries explicitly mention empty content, malformed markup, invalid serialized blocks, or save-looping after corrupted markup. A server invariant can plausibly refuse the durable write, even though live editor state remains suspect. |
| Medium containment confidence | `29`, `32`, `40`, `43`, `62`, `63`, `94`, `136`, `138`, `228` | These look like stale/empty/corrupt content persistence families, but many are downstream of reload, live CRDT collapse, or title split behavior, so the server may only contain some runs. |
| Weak/conditional | `45`, `69`, `141`, `187`, `212`, `216` | These depend on details outside a simple bundle check: entity normalization, sync-fault/reload ambiguity, persisted CRDT divergence, unresolved requests, or save-storm state. |

Representative decision evidence:

| Row | Decision | Evidence | Remaining blocker |
| ---: | --- | --- | --- |
| 8 | Full | Save persisted initial title and old content while `_crdt_document` had advanced. | Client still needs conflict refetch/reapply/retry after rejection. |
| 52 | Full, conditional | Save response and editor had checkpoint state, but later REST reads returned original title/content while CRDT was advanced. | Intermittent; could be cache/read-after-write or persistence-order, so atomic bundle persistence is the relevant assumption. |
| 63 | Partial | Follow-up saves persisted `content: ""` with populated CRDT; realistic repro also showed title split. | Server can reject impossible persistence, but live save serialization/title state remains faulty. |
| 89 | Unimpacted | Fresh collaborative draft opened into title/content/CRDT from an unrelated document. | Incoming bundle can be internally coherent; needs document identity or room scoping. |
| 155 | Full, conditional | WebSocket save accepted stale pre-checkpoint content with checkpoint title and newer CRDT. | Needs title/content/CRDT bundle coverage; evidence is archived trace rather than durable UI repro. |
| 207 | Unimpacted | Realistic repro clicked Save draft but emitted no post save request and REST stayed unchanged. | Server cannot reject a missing request; dirty/save integration must be fixed client-side. |
| 45 | Partial | Save loop also involves entity/HTML normalization and attribute ordering. | Needs deterministic parser/serializer/CRDT projection canonicalization. |
| 227 | Full | Repeated saves had identical title/content and changing `_crdt_document`; unit repro tied dirtiness to `markEntityAsSaved()`. | Client and server must agree on safe CRDT no-op semantics. |

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
| `/wp-sync` transport/delivery/OOM/storage | 17 | 38 | These are update delivery, room-history, route, or memory failures, not editor-content-bundle save consistency. |
| Table/Y.Array merge | 14 | 15 | The bad state comes from nested CRDT array merge behavior before server persistence. |
| Revision/post-lock/code-editor/session | 8 | 8 | Different editor/session flows, not normal collaborative post save consistency. |
| Live CRDT merge/stale-local/reconciliation | 168 | 250 | Lost deletes, duplicated blocks, wrong moves, stale local snapshots, block identity smears, and nonconvergence happen before the server can validate a save. |
| Fresh-post foreign document contamination | 1 | 1 | Row 89 can submit title/content/CRDT that are internally consistent for the wrong collaborative document. Containing it requires document identity, room scoping, or post-bound CRDT provenance in addition to bundle versioning. |
| No useful post save request | 1 | 1 | Row 207's realistic repro leaves REST state unchanged without emitting a post save request, so a REST pre-insert guard cannot resolve that user-visible failure. |
| Other unaddressed residual | 1 | 1 | Remaining row outside the touched sets and major near-miss buckets. |

Complete row-ID accounting:

- Full bug-resolution rows: `8`, `23`, `52`, `90`, `99`, `155`, `156`,
  `227`, `243`.
- Partial bug-resolution rows: `15`, `18`, `29`, `32`, `37`, `40`, `43`,
  `45`, `54`, `60`, `61`, `62`, `63`, `64`, `67`, `69`, `94`, `136`,
  `138`, `141`, `187`, `196`, `211`, `212`, `216`, `228`, `241`, `242`.
- Additional containment-only rows: `2`, `5`, `17`, `19`, `27`, `56`, `57`,
  `100`.
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
- Other unaddressed residual: `199`.
- Live CRDT merge/stale-local/reconciliation: `3`, `6`, `7`, `10`, `11`,
  `12`, `13`, `14`, `16`, `20`, `21`, `22`, `24`, `25`, `26`, `28`, `30`,
  `31`, `33`, `34`, `35`, `36`, `38`, `39`, `41`, `42`, `44`, `46`, `49`,
  `51`, `55`, `58`, `65`, `66`, `68`, `70`, `71`, `72`, `73`, `74`, `75`,
  `76`, `78`, `79`, `82`, `83`, `84`, `85`, `86`, `87`, `88`, `91`, `92`,
  `93`, `95`, `96`, `97`, `101`, `102`, `103`, `104`, `105`, `106`, `107`,
  `114`, `115`, `116`, `117`, `118`, `119`, `120`, `121`, `122`, `123`,
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

| Candidate class | Required trace evidence | Test shape |
| --- | --- | --- |
| Stale title/content/full-record writes | A write carries old title/content or a stale bundle token while the server has newer protected fields; the server returns 409 and no protected DB field changes. | REST integration test with two concurrent saves, then focused e2e replay for rows `8`, `52`, `155`, `156`, and `243`. |
| Empty/corrupt content containment | Submitted content is empty, flattened, or malformed while the decoded CRDT projection or current bundle proves non-empty ordinary blocks; the server rejects the write. | REST projection-validation tests plus e2e replay for rows `15`, `18`, `37`, `196`, `241`, and `242`. |
| CRDT no-op save loops | Consecutive saves have stable visible title/content and only known non-semantic CRDT save metadata changes; the response stops dirtying the record. | Unit tests around CRDT serialization/no-op response handling plus e2e or integration replays for rows `23`, `90`, and `227`. |
| Client conflict repair | After a 409, the client refetches, applies persisted CRDT, recomputes intended fields, retries once with the new bundle token, and does not apply the rejected response into the live sync doc. | `core-data` action tests extending the existing stale-CRDT retry test, plus manual-save e2e with a forced conflict. |
| Exclusions | No protected-field request reaches the guarded path, or the submitted bundle is internally coherent but belongs to the wrong document, or the live editor diverges before save. | Negative tests for rows `89`, `207`, and `240`, ensuring the report does not claim save validation fixes them. |

Minimum server tests:

- stale bundle token rejects before any post fields or `_crdt_document` meta are
  written;
- conflict detected at meta-update time cannot leave already-written
  `post_title`/`post_content` behind;
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
