# WordPress.com real-time collaboration Tracks event plan

## Status

This plan supersedes the earlier bucket-first RTC metrics plan.

Tracks should be treated as an event log: one row per validated event, with the
acting user and site context supplied through Tracks' normal user and blog fields
and event-specific context in scalar event properties. The canonical warehouse
table, `tracks.prod_events`, stores one row per validated Tracks event with an
`eventprops` map.

References:

- [Internal Data, Stats, and Logging](https://fieldguide.automattic.com/data-at-a8c/data-engineering-architecture/internal-stats/)
- [Registering Tracks Events](https://fieldguide.automattic.com/data-at-a8c/data-tools/tracks/tracks-for-developers-product-teams/registering-tracks-events/)
- [tracks.prod_events data docs](https://datadocsp2.wordpress.com/avrodoc/tracks/tracks_prod_events/)

Alerting is explicitly out of scope for the initial implementation.

## Goals

The first implementation should answer these questions:

1. How often is RTC eligible, enabled, attempted, joined, blocked, connected,
   disconnected, recovered, and ended?
2. How many editor instances and distinct users are concurrently editing the
   same post?
3. How often does one user open the same post in multiple tabs or windows, and
   how often does that consume the collaborator limit?
4. How often do users hit visible failure states, especially the connection lost
   modal and the collaborator-limit modal?
5. Which broad failure class is responsible when RTC fails, blocks, or falls
   back?
6. How often are there simultaneous editors and simultaneous edit activity on a
   post?

## Why not store a contributor list?

A proposed model was:

- emit a join event for the acting user;
- include `contributors: [ A, A, B ]` on that event;
- emit a blocked event with the same contributor list when the room is full.

The useful part of that proposal is that it records a user-level join event and
captures room state at the time of the join or block. The shortcomings are:

- contributor arrays are awkward for Tracks registration and querying;
- arrays or JSON blobs make event properties less searchable and harder to
  validate;
- a list of other users is more sensitive than the analysis requires;
- a join-only model cannot measure duration, leave behavior, or time spent at a
  given occupancy;
- client-computed contributor lists can be stale during races;
- client-only events are vulnerable to ad blockers and page lifecycle loss;
- without a per-tab/editor-instance identifier, the data cannot reliably
  distinguish one user in two tabs from two users in one tab each;
- without scalar counts at block time, it is hard to answer whether a block was
  caused by duplicate tabs or genuinely too many distinct users.

Instead, emit row-level lifecycle events and scalar room-state properties. For
the example where A opens the post twice, B joins, and C is blocked at a limit of
3 editor instances, the events should look like this conceptually:

| Event | Tracks user | Post | participant_count | distinct_user_count | current_user_active_instance_count | duplicate_user_instance_count | result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `wpcom_rtc_room_joined` | A | X | 1 | 1 | 1 | 0 | joined |
| `wpcom_rtc_room_joined` | A | X | 2 | 1 | 2 | 1 | joined |
| `wpcom_rtc_room_joined` | B | X | 3 | 2 | 1 | 1 | joined |
| `wpcom_rtc_room_join_blocked` | C | X | 3 | 2 | 0 | 1 | blocked |

This answers the same question as the contributor-list proposal without storing
a contributor array. The active membership can also be reconstructed from join
and leave intervals keyed by user, blog, post, and editor instance.

## Data model

### Tracks identity

Use normal Tracks identity and site fields:

- Tracks `userid` identifies the acting user;
- Tracks `blogid` identifies the site;
- event `ts` identifies event time;
- `eventname` identifies the user action or lifecycle transition.

Use scalar event properties for RTC-specific context:

- `schema_version`;
- `post_id`;
- `post_type`;
- `editor_context`, such as `post_editor` or `site_editor`;
- `rtc_session_id`, a random per-editor-load identifier;
- `editor_instance_id`, a random per-tab/window identifier, if distinct from
  `rtc_session_id`;
- `room_scope`, such as `primary_post`, `comments`, `notes`, or `attachment`;
- `transport`, such as `websocket` or `http_polling`;
- `provider`, such as `pinghub` or `http_polling`;
- `event_emitter`, such as `client` or `server`;
- `rollout_group`, if used;
- `plan_group`, if needed for packaging analysis.
- `plugin_context_available`, when plugin inventory or causal plugin context can
  be attached;
- `active_plugin_count`, when available.

`rtc_session_id` and `editor_instance_id` must be random, per-load values. Do
not derive them from user IDs, site IDs, post IDs, room names, tokens, or other
stable identifiers.

### Room count definitions

Use exact integer counts in Tracks where the values are small, bounded, and not
sensitive. Derive buckets later in SQL or Looker unless a Tracks UI absolutely
requires a bucket property.

Definitions:

- `participant_count`: active editor instances in the room, including duplicate
  tabs/windows for the same user.
- `distinct_user_count`: unique users represented by active editor instances.
- `current_user_active_instance_count`: active editor instances in the room for
  the acting Tracks user.
- `other_distinct_user_count`: distinct active users excluding the acting user.
- `duplicate_user_instance_count`: `participant_count - distinct_user_count`.
- `configured_participant_limit`: the effective room/editor-instance limit.
- `limit_remaining`: `configured_participant_limit - participant_count`, clamped
  at zero when reported after a join decision.

For accepted joins, counts should describe the state after the join. For blocked
joins, counts should describe the state at the admission decision, before the
blocked user is admitted.

### Durations

Use integer durations in milliseconds or seconds, rounded to a reasonable
precision. Prefer raw numeric duration fields over bucket-only values:

- `time_to_connect_ms`;
- `connected_duration_ms`;
- `disconnected_duration_ms`;
- `collaborative_duration_ms`;
- `recovery_time_ms`;
- `retry_time_to_result_ms`;
- `session_duration_ms`.

If a dashboard needs stable buckets, compute them downstream from the numeric
value. If a bucket property is added for convenience, keep the numeric property
as the source of truth.

### Plugin context

Record plugin context when it is available because it is important for debugging
and error tracking. Keep it Tracks-consistent by using scalar event properties
or separate rows, not arrays or JSON blobs.

When one plugin is directly involved in an event, attach scalar properties to
that event:

- `plugin_slug`;
- `plugin_version`;
- `plugin_role`, such as `rtc_provider`, `connection_error_handler`,
  `editor_extension`, `transport_override`, or `unknown`;
- `plugin_active`;
- `plugin_context_source`, such as `server_inventory`, `client_registry`,
  `filter_callback`, or `known_integration`.

Examples:

- a plugin suppresses the default connection modal through
  `editor.isSyncConnectionErrorHandled`;
- a plugin provides or overrides RTC transport behavior;
- a plugin is identified by server-side diagnostics as the source of an RTC
  permission, token, REST, or sync failure.

When the active plugin set is needed for correlation, emit a separate
`wpcom_rtc_plugin_context_observed` row per plugin instead of attaching
`plugins: [ ... ]` to another event. Emit those rows only once per RTC session
when one of these is true:

- an RTC connection problem occurs;
- an RTC join is blocked;
- an RTC error modal is shown;
- a transport fallback occurs;
- a small sampled healthy-session baseline is needed for denominator analysis.

This gives analysts plugin-level joins without making the main event payloads
large or hard to register.

## Tracks events

All events should be registered and validated with descriptions, owners, code
links, and event property definitions.

### `wpcom_rtc_editor_eligibility_evaluated`

Fire once per editor load after RTC eligibility is known.

Suggested properties:

- common identity/context properties;
- `rtc_eligible`;
- `rtc_enabled`;
- `disabled_reason`;
- `selected_transport`;
- `preferred_transport`;
- `fallback_reason`;
- `kill_switch_active`.
- `plugin_context_available`;
- `active_plugin_count`.

### `wpcom_rtc_room_join_attempted`

Fire when the user attempts to enter the RTC room. Prefer a server-side event if
the server receives an explicit admission request. If the client emits this
event, use it only for funnel analysis; do not use it as the source of truth for
room occupancy.

Suggested properties:

- common identity/context properties;
- `attempt_number`;
- `transport`;
- `provider`;
- `attempt_source`, such as `initial_load`, `retry`, or `transport_fallback`.

### `wpcom_rtc_room_joined`

Fire when the user/editor instance is admitted to the RTC room. Prefer
server-side emission from the room admission point because it is less affected by
ad blockers and client lifecycle loss.

Suggested properties:

- common identity/context properties;
- `participant_count`;
- `distinct_user_count`;
- `current_user_active_instance_count`;
- `other_distinct_user_count`;
- `duplicate_user_instance_count`;
- `configured_participant_limit`;
- `limit_remaining`;
- `join_latency_ms`;
- `transport`;
- `provider`;
- `joined_via_fallback`;
- `fallback_from`.

### `wpcom_rtc_room_join_blocked`

Fire when an editor instance cannot join the RTC room.

Suggested properties:

- common identity/context properties;
- `block_reason`, such as `participant_limit`, `permission`, `auth`,
  `document_size`, `room_count`, `protocol_mismatch`, or `unknown`;
- `connection_error_code`, when applicable;
- `participant_count`;
- `distinct_user_count`;
- `current_user_active_instance_count`;
- `other_distinct_user_count`;
- `duplicate_user_instance_count`;
- `configured_participant_limit`;
- `limit_remaining`;
- `transport`;
- `provider`;
- `modal_expected`;
- `upgrade_available`;
- `plan_group`.

This event directly answers whether a user was blocked because the room had too
many editor instances, too many distinct users, or duplicate tabs consuming the
limit.

### `wpcom_rtc_room_left`

Fire when an editor instance leaves the RTC room. Prefer server-side emission for
WebSocket close, explicit leave, or polling TTL expiry. Client `pagehide` can be
used as an additional best-effort signal but should not be the only source of
truth.

Suggested properties:

- common identity/context properties;
- `leave_reason`, such as `pagehide`, `unload`, `websocket_close`,
  `polling_ttl_expired`, `provider_destroy`, `error`, or `unknown`;
- `session_duration_ms`;
- `connected_duration_ms`;
- `participant_count_after_leave`;
- `distinct_user_count_after_leave`;
- `transport`;
- `provider`;
- `close_code_class`, if applicable and allowlisted.

### `wpcom_rtc_connection_problem`

Fire once per meaningful connection problem episode, not once per status poll or
retry timer tick.

Suggested properties:

- common identity/context properties;
- `rtc_problem_id`, random per problem episode;
- `connection_error_code`;
- `failure_phase`, such as `token_fetch`, `websocket_connect`, `room_join`,
  `poll`, `send_update`, `receive_update`, `awareness`, `permission_check`,
  `reconnect`, or `unknown`;
- `transport`;
- `provider`;
- `participant_count`;
- `distinct_user_count`;
- `current_user_active_instance_count`;
- `can_manually_retry`;
- `background_retries_failed`;
- `consecutive_failure_count`;
- `will_auto_retry_in_ms`;
- `visibility_state`;
- `network_state`.
- plugin context fields, if a plugin is directly implicated.

### `wpcom_rtc_connection_recovered`

Fire when a connection problem episode returns to connected.

Suggested properties:

- common identity/context properties;
- `rtc_problem_id`;
- `previous_connection_error_code`;
- `recovered_by`, such as `automatic`, `manual_retry`, or `transport_fallback`;
- `recovery_time_ms`;
- `transport`;
- `provider`;
- `was_modal_shown`.

### `wpcom_rtc_connection_modal_viewed`

Fire when default, WordPress.com, or plugin-handled RTC error UI appears.

Suggested properties:

- common identity/context properties;
- `modal_type`, such as `connection_lost`, `too_many_editors`,
  `plugin_handled`, or `protocol_mismatch`;
- `connection_error_code`;
- `participant_count`;
- `distinct_user_count`;
- `current_user_active_instance_count`;
- `duplicate_user_instance_count`;
- `can_manually_retry`;
- `background_retries_failed`;
- `handled_by_plugin`.
- plugin context fields, if a plugin handled or caused the modal.

### `wpcom_rtc_connection_modal_action`

Fire when the user acts on an RTC connection modal.

Suggested properties:

- common identity/context properties;
- `modal_type`;
- `action`, such as `retry`, `copy_post_content`, `back_to_posts`, `dismiss`,
  or `plugin_action`;
- `connection_error_code`;
- `retry_attempt_number`;
- plugin context fields, if the action is plugin-provided.

### `wpcom_rtc_plugin_context_observed`

Fire one row per plugin when plugin context is needed for RTC debugging or error
correlation. Do not fire this for every editor load by default unless volume and
privacy review explicitly allow it.

Suggested properties:

- common identity/context properties;
- `plugin_slug`;
- `plugin_version`;
- `plugin_role`, such as `rtc_provider`, `connection_error_handler`,
  `editor_extension`, `transport_override`, `active_plugin`, or `unknown`;
- `plugin_active`;
- `plugin_context_reason`, such as `connection_problem`, `join_blocked`,
  `modal_viewed`, `transport_fallback`, or `healthy_session_sample`;
- `connection_error_code`, when applicable;
- `block_reason`, when applicable;
- `transport`;
- `provider`.

### `wpcom_rtc_manual_retry_result`

Fire when a manual retry connects, fails, times out, or is abandoned.

Suggested properties:

- common identity/context properties;
- `result`, such as `connected`, `failed`, `timed_out`, or `abandoned`;
- `previous_connection_error_code`;
- `retry_attempt_number`;
- `retry_time_to_result_ms`;
- `transport_before_retry`;
- `transport_after_retry`.

### `wpcom_rtc_edit_activity_window`

Fire at most once per fixed activity window, such as 30 or 60 seconds, and only
if there was local or remote edit activity. Do not fire on every keystroke, Yjs
update, or awareness update.

Suggested properties:

- common identity/context properties;
- `window_duration_ms`;
- `participant_count`;
- `distinct_user_count`;
- `current_user_active_instance_count`;
- `local_edit_operation_count`;
- `remote_edit_operation_count`;
- `local_changed_field_count`;
- `remote_changed_field_count`;
- `had_local_edit_activity`;
- `had_remote_edit_activity`;
- `simultaneous_edit_activity_observed`.

This gives a queryable approximation for simultaneous edits while keeping volume
bounded.

### `wpcom_rtc_session_ended`

Fire once per editor instance when the session ends, and best-effort on
`pagehide` for client-side coverage. Prefer server-side close/expiry for final
join duration where available.

Suggested properties:

- common identity/context properties;
- `session_duration_ms`;
- `connected_duration_ms`;
- `disconnected_duration_ms`;
- `collaborative_duration_ms`;
- `peak_participant_count`;
- `peak_distinct_user_count`;
- `peak_current_user_active_instance_count`;
- `peak_duplicate_user_instance_count`;
- `connection_problem_count`;
- `connection_recovery_count`;
- `modal_view_count`;
- `manual_retry_count`;
- `local_edit_activity_window_count`;
- `remote_edit_activity_window_count`;
- `simultaneous_edit_activity_window_count`;
- `ended_status`;
- `session_outcome`, such as `healthy_collaboration`, `solo_success`,
  `blocked`, `modal_harm`, `ended_disconnected`, or `unknown`.

## MC Stats, StatsD, and logs

Tracks should answer user/session/product questions. It should not be the only
instrumentation for operational reliability.

Use MC Stats or StatsD/Grafana for aggregate service counters and rates:

- token request, success, and failure;
- WebSocket open, join, close, abnormal close, and fallback;
- HTTP polling request, success, failure, 4xx, and 5xx;
- join accepted and join blocked by reason;
- collaborator-limit and document-size-limit counts;
- server-side ad-block-resistant counts that can be compared with client Tracks
  events.

Use structured logs for debugging details that should not become Tracks
properties:

- raw WebSocket close reason text;
- exception messages;
- stack traces;
- token diagnostics;
- room names;
- Yjs payload details.

Structured logs may include richer plugin diagnostics when needed, but the
Tracks layer should still record plugin slug/version context when available so
product and support analysis can correlate RTC failures with installed plugins.

## Privacy and data minimization

It is acceptable and useful to rely on normal Tracks user and blog identity for
this analysis. The plan should still avoid collecting more user-to-user detail
than needed.

Do record:

- acting user through normal Tracks identity;
- site through normal Tracks blog identity;
- `post_id` as a scalar event property;
- random per-load/session IDs;
- scalar counts and durations;
- allowlisted enum values;
- plugin slugs and versions when available, either as scalar properties on a
  plugin-causal event or as one row per plugin in
  `wpcom_rtc_plugin_context_observed`.

Do not record:

- contributor arrays;
- other users' IDs as a list or JSON blob;
- usernames;
- emails;
- display names;
- post titles;
- post content;
- raw URLs;
- room names when they contain derived object identifiers or implementation
  details;
- client IDs from awareness protocols;
- tokens;
- raw error text;
- stack traces;
- stable hashes of forbidden values.

If `post_id` is considered too sensitive for a specific surface, use a
surface-specific privacy review before shipping. Without `post_id`, exact
same-post concurrency and duplicate-tab analysis becomes much weaker.

## Query examples

Same user opening the same post in multiple tabs/windows:

- query `wpcom_rtc_room_joined`;
- group by `userid`, `blogid`, `post_id`;
- filter for `current_user_active_instance_count >= 2`;
- use `rtc_session_id` or `editor_instance_id` to distinguish editor instances.

Blocked joins caused by duplicate tabs:

- query `wpcom_rtc_room_join_blocked`;
- filter `block_reason = 'participant_limit'`;
- compare `participant_count` with `distinct_user_count`;
- `duplicate_user_instance_count > 0` means duplicate tabs/windows were consuming
  part of the limit.

Posts reaching at least five distinct collaborators:

- query `wpcom_rtc_room_joined` and `wpcom_rtc_session_ended`;
- group by `blogid`, `post_id`;
- compute `max(distinct_user_count)` or `max(peak_distinct_user_count) >= 5`.

Visible RTC harm rate:

- numerator: users or sessions with `wpcom_rtc_connection_modal_viewed` or
  `wpcom_rtc_room_join_blocked`;
- denominator: users or sessions with `wpcom_rtc_room_join_attempted` or
  `wpcom_rtc_room_joined`;
- segment by transport, provider, post type, plan group, and room count.

Simultaneous edit activity:

- query `wpcom_rtc_edit_activity_window`;
- filter `simultaneous_edit_activity_observed = true`;
- segment by `distinct_user_count` and transport.

## Accuracy notes

The most accurate occupancy source should be server-side admission and leave
events. Client-side awareness is useful for UI and fallback context, but it can
be stale, blocked, or lost during page close.

Join/leave interval reconstruction is only as accurate as leave detection. For
WebSocket, server close events should be strong. For HTTP polling, TTL expiry
should be recorded with a `leave_reason` like `polling_ttl_expired` so analysts
can account for delayed leave detection.

Counts on `wpcom_rtc_room_joined` and `wpcom_rtc_room_join_blocked` should be
computed at the server admission point whenever possible. This avoids races where
two clients both think they are the Nth participant.

Raw numeric counts and durations make downstream distributions and intersections
more accurate than bucket-only event properties. Buckets can be derived later.

## Initial implementation sequence

1. Register the V1 Tracks events and scalar event properties.
2. Add a WordPress.com RTC event adapter that records Tracks in WP.com-owned
   integration code. Generic Gutenberg should continue to expose lifecycle hooks
   or callbacks, but should not call WP.com Tracks directly.
3. Add server-side join, joined, blocked, left, and transport counters at the RTC
   admission layer.
4. Add client-side UI harm events for modal viewed, modal action, manual retry
   result, and edit activity windows.
5. Add session-ended summaries with raw durations and peak counts.
6. Add MC Stats or StatsD counters for aggregate operational health.
7. Validate with forced cases before dashboarding:
   - same user opens two tabs on the same post;
   - two distinct users join the same post;
   - collaborator limit reached by duplicate tabs;
   - collaborator limit reached by distinct users;
   - blocked join;
   - authentication failure;
   - connection expiration;
   - PingHub token failure;
   - WebSocket abnormal close;
   - HTTP polling failure;
   - document size limit;
   - plugin-handled modal;
   - manual retry success and failure;
   - pagehide close;
   - HTTP polling TTL expiry.

## Persona review summary

This plan was reviewed through an in-process persona loop rather than subagents.
The review changed the plan in the following ways:

- Product analytics: keep user, blog, post, and editor-instance context so the
  core product questions can be answered directly.
- Data engineering: avoid contributor arrays and JSON blobs; use registered
  scalar event properties and queryable lifecycle rows.
- Privacy: rely on normal Tracks identity, but do not store lists of other users,
  names, emails, titles, content, room names, or protocol client IDs.
- Debugging/support: record plugin slug and version context when available, using
  scalar properties or one row per plugin rather than arrays.
- Reliability engineering: make server-side join, blocked, and leave events the
  source of truth; use MC Stats or StatsD for operational counters.
- Gutenberg/package maintainer: keep WP.com Tracks calls out of generic
  Gutenberg packages.
- Dan Luu: preserve enough raw structure to answer the actual questions later;
  do not collapse away exact counts and durations before storage.
- Contrarian volume reviewer: throttle edit activity into windows and avoid
  awareness-update events.
- Contrarian privacy reviewer: reject contributor lists even though Tracks has
  user identity, because the list is not needed for the target analyses.
- Contrarian analytics reviewer: add leave/session-ended events so join events
  are not mistaken for occupancy duration.
- Contrarian implementation reviewer: phase the work around join/joined/blocked
  first, then add richer edit-activity windows and summaries.
- Contrarian operations reviewer: keep service failure rates in MC Stats or
  StatsD, not only in client Tracks events.
