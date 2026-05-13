# RTC title reload divergence with stale persisted title

Bug signature: `4fd77a5be5ae`

Bug type: `rtc_title_reload_divergence_with_stale_persisted_title`

Transport: HTTP polling RTC provider

## Summary

This is a real RTC title reload bug family. A collaborator can receive an
unsaved title through RTC, reload or rejoin while the REST post title is still
the old persisted value, and then have the reloaded session treat that old REST
title as an authoritative change. Body blocks can converge while the title falls
back to the initial persisted title.

The handoff row marks the signature high-confidence and runnable. The generated
observer spec uses normal editor actions: create a draft, open two editor
sessions, type into the title field, edit paragraph body content, reload one
session, and record both visible and edited title state. The observer itself is
not a failing assertion, but the workflow is a natural user workflow rather than
a malformed-block or direct-state harness failure.

## Practical Impact

Real-user likelihood: low.

The workflow requires RTC collaboration, two open sessions on the same draft,
an unsaved title update that has propagated through RTC, and a reload/rejoin
while the REST title still has the older persisted value. Editing titles,
editing paragraph body content, saving drafts, and refreshing a browser tab are
ordinary editor actions. The narrower requirement is the timing window: reload
must land while live RTC state is newer than the bootstrap REST title.

The blast radius is bounded but user-visible. The immediate failure is title
divergence. If the stale session later saves or publishes, the old title can be
persisted again. I did not find evidence for duplicate body content, general
block corruption, save loops, performance risk, or OOM in this title-only
signature. Recovery before a stale save is to use the tab that still has the
newer title or retype the title. After save or publish, recovery is manual
correction or post revisions.

## Root Cause

The vulnerable reload path is in the sync manager's persisted-document
application. After applying a persisted CRDT document, it compares that document
with the raw REST record and treats mismatches as invalidations. For title,
that means an updated CRDT title can be compared with the older REST title and
then overwritten by `record.title`.

Separately, the background CRDT persistence save can serialize a stale CRDT
snapshot if it does not merge the record currently being saved into the document
before writing `_crdt_document`.

The May 7 known-fixes base includes important adjacent safeguards, including
skipping save-response replay into the sync document and, in its final
integration commit, a meta-only CRDT persistence request. Those safeguards block
one stale save-response route, but they do not pass the persisted raw record
into CRDT diffing and do not serialize the current save payload into the CRDT
document before persisting it. The same-family fix branch adds both pieces.

## Fix Plan

Keep the fix narrow:

1. Let record handlers expose the current persisted/raw entity record.
2. Pass that persisted record into `getChangesFromCRDTDoc`.
3. For raw post fields (`title`, `content`, `excerpt`), suppress only exact
   replays of the persisted value when the current edited value is dirty.
4. When serializing `_crdt_document` during save, merge the record being saved
   into the Y.Doc before serialization so the persisted CRDT document reflects
   the active title/body edits, not an older local snapshot.

Robustness audit:

- This is not a timer or transport heuristic; it is based on record lineage.
- The stale-value guard is scoped to exact persisted-value replays for raw post
  fields.
- The serialization step is synchronous with the existing save path and does
  not add polling or retries.
- The main tradeoff is an intentional exact-revert case: if a remote user
  deliberately changes a dirty title back to exactly the persisted title, the
  dirty local value can win until a later explicit edit/save resolves it. That
  is narrower and safer than allowing stale bootstrap state to erase active
  unsaved edits.
