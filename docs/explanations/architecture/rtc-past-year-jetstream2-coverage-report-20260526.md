# RTC Fuzzing Coverage From Past-Year Support Issues

Generated: 2026-05-26

This report turns the local Zendesk analysis into a Jetstream2 fuzzing plan for
finding more real-time collaboration bugs. The recommendation is not limited to
tickets that support explicitly identified as RTC. User behaviors that stress
the editor state graph, save/publish lifecycle, auth/session state, provider
retry behavior, and product launch surfaces are in scope if they can expose RTC
bugs.

The "already added" section is intentionally limited to surfaces that came from
the previous RTC-focused ticket analysis. It does not count broader non-RTC
ticket-derived recommendations as already covered.

## Inputs

Primary local inputs:

- `/Users/danluu/rtc-zendesk-analysis/data/rtc-fuzz-coverage-gap-analysis.json`
- `/Users/danluu/rtc-zendesk-analysis/reports/rtc-fuzz-coverage-gap-analysis.md`
- `/Users/danluu/rtc-zendesk-analysis/data/bug-symptom-repro-fix-classification.json`
- `/Users/danluu/rtc-zendesk-analysis/analysis/exploratory-10k/fuzzer-ingredients/all-downloaded-fuzzer-ingredients-summary.json`
- Jetstream2/Gutenberg RTC fuzzing sources in `test/e2e/specs/editor/collaboration/collaboration-fuzz.spec.ts`
- Jetstream2 novelty-monitor coverage goals in `bin/rtc-browser-fuzz-novelty-monitor.mjs`

The RTC-specific analysis grouped 1,163 saved tickets by symptom and repro
shape. The strongest RTC-adjacent symptom clusters were:

- `rtc_connection_interrupted`
- `save_success_but_changes_lost`
- `publish_save_cta_drift`
- `post_meta_or_crdt_save_failure`
- `false_dirty_unsaved_changes`
- `media_insertion_triggers_state_change`
- `block_inserter_or_block_missing`
- `editor_crash_or_blank_editor`
- `multi_editor_conflict_or_limit`

The broader past-year fuzzer-ingredient export also points at behaviors that
can reveal RTC failures even when the ticket was not labeled RTC: plugin/theme
interop, backup/restore-style state integrity, auth/session transitions,
mobile/client differences, editor save/publish regressions, media shape, and
performance/capacity.

## RTC-Only Surfaces Already Added To Jetstream2

The previous RTC bug analysis already produced concrete Jetstream2 coverage in
the local fuzz harness. These are the surfaces that should be treated as
present before adding new work.

### Profiles

`zendesk-current-regression`

- Purpose: current-branch regression profile using RTC ticket ingredients, not
  old-version replay.
- Default shape: extra collaborator, forced late join, lifecycle reloads,
  save checkpoints, autosave checkpoint, auth sync failures, and final
  persistence/operation-ledger witnesses.
- Action mix: async/server blocks, media/cross-entity blocks, meta schema
  drift, provider retry bursts, runtime origin worker probe, custom rich-text
  object-shape block, real-user paste/link/toolbar/table actions, concurrent
  edits, title edits, moves, deletes, and headings.

`implied-ticket-coverage`

- Purpose: cover RTC ingredients implied by support symptoms, including tickets
  where support did not identify RTC as the cause.
- Default shape: extra collaborator, late join, two lifecycle reloads, three
  save checkpoints, one autosave checkpoint, auth sync failures, product-surface
  probes, and operation-ledger witnesses.
- Action mix weights the ticket-derived probes more heavily than the current
  regression profile: meta schema drift, provider retry bursts, runtime origin
  worker behavior, and custom rich-text object attributes.

### Ticket-Derived Action Surfaces

`probe-meta-schema-drift`

- Targets: false dirty state, Save versus Publish CTA drift, post-meta/CRDT save
  loops, and tickets where `_crdt_document` or orphaned meta caused the editor
  to think there were unsaved changes.
- Mechanism: injects a volatile unregistered meta key into edited post meta,
  removes it, records whether `_crdt_document` is present, and fails if the
  volatile marker remains in edited meta.
- Covered RTC family: persisted/orphaned meta drift between CRDT state and the
  REST edited record.

`inject-provider-retry-burst`

- Targets: connection-interrupted modals, retry storms, and endpoint-pressure
  symptoms.
- Mechanism: intercepts `wp-sync` POSTs, injects a short burst of `429` or
  `503` failures, then inserts a witnessed paragraph and verifies that the run
  settles.
- Covered RTC family: provider retry/backoff behavior adjacent to PingHub
  reconnect and token-pressure failures.

`probe-runtime-origin-worker`

- Targets: cross-origin Worker/CSP failures seen in production-style asset
  loading.
- Mechanism: records script origins, verifies whether a cross-origin worker is
  blocked, and separately checks whether a Blob worker path works.
- Covered RTC family: cross-origin keepalive worker and fallback behavior.

`insert-custom-rich-text-shape-block`

- Targets: rich-text object shape loss where custom or non-core blocks expect
  object-valued rich-text-like attributes rather than plain strings.
- Mechanism: registers a runtime fuzz block with an object-valued `content`
  attribute containing `html` and `text`, inserts it, and fails if the shape is
  not preserved.
- Covered RTC family: custom block/RichTextData object-shape corruption.

`maybeRunProductSurfaceProbes`

- Targets: RTC bugs outside the editor canvas.
- Mechanism: visits `/wp-admin/edit.php` and records the Posts list Edit/Join
  product surface; visits `/wp-admin/options-writing.php` and records whether
  RTC-related settings copy/control are visible.
- Covered RTC families: Posts list `EditJoin` CSS/product regression and
  Settings -> Writing RTC toggle visibility.

### Existing Profiles Reused By The RTC-Only Additions

The RTC-only additions also reuse existing Jetstream2 coverage rather than
duplicating it:

- `async-server-blocks`: entity-backed/server-rendered blocks such as embed,
  latest posts, query, search, calendar, categories, template part, and reusable
  block references.
- `media-cross-entity`: media upload/insertion and media-backed blocks,
  including image, gallery, file, media-text, and reusable-block interactions.
- `permissions-auth-locks`: auth and permission failure lanes, including
  focused `401` and `403` sync failures.
- `same-user` collaborator mode and lifecycle profiles: same account in more
  than one tab, late join, reload, reconnect, save/autosave, and persistence
  checks.
- `large-post-three-user-http-lifecycle`: HTTP polling, large initial post,
  three users, lifecycle reloads, save/autosave checkpoints, operation-ledger
  witnesses, and final persistence checks.
- `revision-persistence`: save, autosave, reload, and revision-restore
  witnesses.
- `parser-transform`, `parser-serialization`, and `real-user-editing`: parser
  stress, validation/equivalence transforms, UI typing, paste, link, toolbar,
  composition, undo/redo, list, and table editing.

## RTC Families Covered Only Partially

These surfaces are now represented, but should not be considered complete.

Post-meta and CRDT schema drift

- Added: volatile unregistered meta probe plus save/reload/persistence oracles.
- Still missing: WordPress.com-only meta registration/removal matrix,
  publish-time server mutations, Simple/Atomic/WoW differences, and product
  deployment-channel variation.

Rich text and custom block object shapes

- Added: runtime custom block with object-valued rich-text-like attribute.
- Still missing: broader third-party block schemas, Jetpack enhanced-code-like
  edit functions, transforms, and object shape preservation after full
  sync/reload/late-join cycles across more block vocabularies.

Provider retry and PingHub pressure

- Added: short `wp-sync` `429`/`503` retry bursts.
- Still missing: PingHub token/JWT state machine, stable-connection threshold
  for backoff reset, attachment-room fanout, stale JS after RTC disablement,
  and explicit endpoint call-rate oracle.

Cross-origin runtime behavior

- Added: cross-origin worker blocked path and Blob worker viability probe.
- Still missing: production-like split origins, CSP matrix, static asset origin
  variation, and modal-churn oracle under actual provider initialization.

Room limits, role churn, and support/SU sessions

- Added: extra collaborator, late join, same-user mode, auth failure lanes.
- Still missing: support/SU identity semantics, per-room versus global room
  limits, collection rooms versus entity rooms, and cleanup after close/reload.

Uneditable template/entity failures

- Added: permissions/auth lanes and async/server block coverage that can reach
  template-part references.
- Still missing: deterministic editor role with assigned page template,
  `wp_template`/`wp_template_part` room returning `403`, and assertion that a
  failed auxiliary room does not poison the editable post/page room.

Product surfaces

- Added: Posts list Edit/Join DOM probe and Writing settings RTC toggle probe.
- Still missing: WordPress.com Simple/Atomic/WoW product matrix, real CSS asset
  loading assertions, RTC disabled rollout cohorts, Desktop app gating, and
  Sensei/custom post type modal behavior.

## Coverage To Add Next

### 1. Provider/runtime state-machine fuzzing

Add a lower-level provider fuzzer that can explore far more schedules than the
browser route interceptor:

- PingHub token/JWT fetch success/failure/retry/backoff.
- Backoff reset only after a stable connection lifetime threshold.
- Room registration/unregistration for post, attachment, taxonomy, template,
  and collection rooms.
- Stale JavaScript tab after server-side RTC disablement.
- Page origin versus static asset origin, Worker constructor failure, CSP, Blob
  worker fallback, and no-worker fallback.
- Oracle: bounded token calls per tab/site, no repeated modal churn, no healthy
  primary-room disconnect when an auxiliary room fails.

### 2. Natural UI lifecycle and stale-state data loss

Expand browser fuzzing around workflows users actually follow:

- Create draft through UI, edit, autosave, manual save, close, reopen from the
  Posts list, publish, schedule, trash, restore, duplicate, and restore
  revision.
- Same user in two or three tabs with stale blank/title/body states.
- Support/SU observer or alternate identity opens the same entity and must not
  become a writer or erase content.
- Oracle: editor blocks, REST raw content, `_crdt_document`, autosave, revision
  content, and fresh-open UI all agree; stale tabs cannot overwrite live
  content.

### 3. Site editor and cross-entity save graph

The support symptoms were often Save/Publish drift or lost changes on the site
editor rather than only the post editor. Add deterministic and fuzz lanes for:

- Templates, template parts, navigation menus, global styles, reusable/synced
  patterns, categories/tags, featured image, and post meta.
- Mixed editable and forbidden rooms in one sync batch.
- Publish/update workflows where the server mutates slug, status, link, date,
  or related scalar fields.
- Oracle: forbidden auxiliary entity isolated; no false dirty state; no
  Save/Publish CTA drift; post/page room stays healthy.

### 4. Media-heavy RTC workflows

The ticket clusters included media insertion triggering state changes. Add:

- Upload, insert, replace, delete, and retry for image, gallery, file, video,
  media-text, captions, alt text, links, and attachment metadata.
- Many attachments in one post to exercise room fanout.
- Concurrent media edits during save/publish/reload/late-join.
- Oracle: media block attributes, attachment IDs, captions, alt text, rendered
  content, REST content, and fresh-open editor state agree.

### 5. Plugin/theme/custom block interop

Past-year issues outside strict RTC labels show that plugin/theme changes are a
good way to expose RTC failures:

- Third-party/custom blocks with object attributes, server-rendered blocks,
  custom post types, and plugin-provided editor surfaces.
- Theme switch or block registration changes while the editor is open.
- Woo/Sensei/MailPoet-like editor surfaces if those can load the block editor.
- Oracle: no blank editor, no missing inserter, no invalid block explosion, no
  React boundary crash, and no content loss after reload.

### 6. Auth/session/role churn

Add schedules for:

- Nonce expiry, logout/login, role downgrade/upgrade, permission revocation,
  `401`, `403`, `429`, and `5xx` across sync and REST save paths.
- Same account multi-tab versus distinct users versus support/SU identity.
- Oracle: no privilege leak, no stale overwrite, no global room-limit failure,
  and clean room cleanup after close/reload.

### 7. Real input and device diversity

RTC bugs can hide behind input semantics:

- Mobile/touch editing and WordPress.com Desktop user-agent gating.
- Non-Chromium browser lane if feasible.
- Paste rich HTML, IME/composition, undo/redo, cut/copy, drag/drop, slash
  inserter, toolbar formatting, list editing, and table editing.
- Cross-product these actions with save, autosave, reload, late join, and
  provider failures rather than running them only as isolated UI smoke tests.

### 8. Admin/product launch surfaces

Add or strengthen:

- Posts list Edit/Join visual/CSS assertions.
- Settings -> Writing RTC toggle visibility and persistence.
- Simple versus Atomic/WoW configuration matrix.
- Editor launched from list table, product setup flows, quick links, and
  custom post type admin screens.
- Oracle: correct Edit/Join display, explicit disablement respected, and
  product surfaces do not silently put users into broken RTC sessions.

### 9. Long-session and capacity lanes

Add longer campaigns with:

- Hundreds of blocks and many entity rooms.
- Large media-heavy posts.
- Background/foreground tab scheduling.
- Slow selectors/server-rendered blocks.
- Long idle periods followed by reconnect/save/publish.
- Oracle: bounded memory/time, no editor blanking, no save-payload truncation,
  and no convergence to the wrong content.

## Coverage Not Worth Adding As Old-Version Replay

Old ticket versions are useful for ingredients, not as fuzz targets. Do not add
coverage that pins the harness to an outdated Gutenberg release such as a
specific historical version. Convert those tickets into current-branch
ingredients instead: old-theme-like shape, media-heavy content, large posts,
code-editor/menu rendering paths, parser transforms, and error-boundary
capture.

## Suggested Priority

P0:

- Provider/runtime state-machine fuzzing.
- Natural UI lifecycle and stale-state data-loss coverage.
- Site editor/cross-entity save graph.
- Media-heavy workflows with persistence oracles.

P1:

- Plugin/theme/custom block interop.
- Auth/session/role churn.
- Admin/product launch surfaces.

P2:

- Mobile/Desktop/browser diversity.
- Long-session/capacity lanes.
- Broader Woo/Sensei/MailPoet-like editor surface coverage.

The main engineering rule is that every new surface should add an oracle, not
only an action. For RTC, convergence is not enough: peers can converge on the
wrong content. The high-signal witnesses are REST raw content, fresh-open editor
state, `_crdt_document`, autosaves, revisions, rendered/preview content, room
health, and provider call-rate/modal-churn bounds.
