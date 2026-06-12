# WordPress.com real-time collaboration metrics plan

## Goal

Measure whether real-time collaboration is usable and reliable on WordPress.com before using the data for packaging, pricing, or growth work.

The first implementation should answer four questions:

1. How often is RTC eligible, enabled, attempted, and connected?
2. How often does RTC become an actual collaborative editing session?
3. How often do users hit visible failure states, especially the connection lost modal?
4. Which broad failure class is responsible when RTC fails or falls back?
5. What is the distribution of concurrent collaborators in RTC rooms?
6. How often do sessions have local and remote edit activity while collaborators are present?

Alerting is explicitly out of scope for the initial implementation. The first phase should collect clean events and counters, validate them against known forced failure cases, and build dashboards only after the data contract is stable.

## Phase naming

This document uses "V1" to mean the first metrics schema and implementation phase. It is not a permanent API name and does not imply that all future metrics are already designed.

Expected later phases are:

- reliability refinements after validating V1 against forced failure cases;
- pricing and upgrade attribution after reliability is healthy;
- transport cost analysis after usage volume is understood;
- deeper collaboration-shape metrics if V1 shows substantial multi-editor usage.

Every event should include a `schema_version` value so consumers can distinguish V1 data from later schema revisions.

## Primary metric

Use this as the first north-star metric:

`healthy_collaborative_sessions / eligible_rtc_editor_loads`

A healthy collaborative session is an eligible editor load that:

- creates an RTC session;
- reaches `connected`;
- observes at least one remote collaborator for at least 10 seconds;
- does not show an RTC connection modal;
- does not hit a terminal RTC disconnect;
- does not end while disconnected.

This intentionally centers reliability and user harm rather than upgrade conversion.

## Event model

Use Tracks for user/session funnel analysis and MC Stats for aggregate transport/server health. Do not emit Tracks for every status change, retry timer, Yjs update, awareness update, collaborator flap, or polling request.

Client-side Tracks should be emitted by WordPress.com editor integration code, not directly from generic Gutenberg packages. Generic Gutenberg may expose hooks or lifecycle signals if needed, but WP.com-specific event recording should stay in WP.com-owned code.

## Tracks events

### `wpcom_rtc_availability_evaluated`

Fire once per editor load after RTC eligibility is known.

Suggested properties:

- `rtc_enabled`
- `disabled_reason`
- `selected_transport`
- `fallback_reason`
- `kill_switch_active`
- `room_count_bucket`
- `document_size_bucket`

### `wpcom_rtc_transport_selected`

Fire when the transport/provider decision is made.

Suggested properties:

- `transport`
- `preferred_transport`
- `is_fallback`
- `fallback_from`
- `fallback_reason`
- `rollout_group`

### `wpcom_rtc_session_started`

Fire when an RTC provider/session is created.

Suggested properties:

- `rtc_session_id`
- `transport`
- `room_count_bucket`
- `has_attachment_rooms`
- `has_notes_rooms`

### `wpcom_rtc_session_connected`

Fire once when the session first reaches `connected`.

Suggested properties:

- `rtc_session_id`
- `transport`
- `time_to_connect_bucket`
- `connection_attempt_bucket`
- `fallback_used`

### `wpcom_rtc_collaboration_observed`

Fire once when at least one remote collaborator is present for at least 10 seconds.

Suggested properties:

- `rtc_session_id`
- `transport`
- `time_to_first_collaborator_bucket`
- `remote_collaborators_bucket`

### `wpcom_rtc_room_occupancy_sampled`

Fire when a room first enters a higher remote-collaborator bucket during the session. Do not fire on every awareness update.

This event supports queries such as "how many sessions reached at least five collaborators?" and "how many sessions reached at least ten collaborators?" without recording collaborator IDs or room IDs.

Suggested properties:

- `rtc_session_id`
- `transport`
- `remote_collaborators_bucket`
- `room_scope`
- `had_local_edit_activity`
- `had_remote_edit_activity`

### `wpcom_rtc_connection_problem`

Fire once per meaningful disconnected/problem episode, with per-session caps to prevent floods.

Suggested properties:

- `rtc_session_id`
- `transport`
- `connection_error_code`
- `failure_phase`
- `failure_type`
- `retry_state`
- `can_manually_retry`
- `background_retries_failed`
- `consecutive_failures_bucket`
- `had_remote_collaborator`
- `visibility_state`
- `network_state`
- `modal_eligible`
- `handled_by_plugin`

### `wpcom_rtc_connection_recovered`

Fire when a connection problem episode reconnects.

Suggested properties:

- `rtc_session_id`
- `transport`
- `previous_connection_error_code`
- `recovered_by`
- `recovery_time_bucket`
- `was_modal_shown`

### `wpcom_rtc_connection_modal_viewed`

Fire when default, WP.com, or plugin-handled RTC error UI appears.

Suggested properties:

- `rtc_session_id`
- `transport`
- `modal_type`
- `connection_error_code`
- `can_manually_retry`
- `background_retries_failed`
- `remote_collaborators_bucket`
- `handled_by_plugin`

### `wpcom_rtc_connection_modal_action`

Fire when the user acts on an RTC connection modal.

Suggested properties:

- `rtc_session_id`
- `transport`
- `modal_type`
- `action`
- `connection_error_code`
- `retry_attempt_bucket`

Suggested `action` values:

- `retry`
- `copy_post_content`
- `back_to_posts`
- `dismiss`
- `plugin_action`

### `wpcom_rtc_manual_retry_result`

Fire when a manual retry connects, fails, stays disconnected, times out, or is abandoned.

Suggested properties:

- `rtc_session_id`
- `transport`
- `result`
- `previous_connection_error_code`
- `time_to_result_bucket`
- `retry_attempt_bucket`

### `wpcom_rtc_limit_hit`

Fire when a collaborator, room, request, or document limit blocks RTC.

Suggested properties:

- `rtc_session_id`
- `transport`
- `limit_type`
- `connection_error_code`
- `observed_count_bucket`
- `configured_limit_bucket`
- `modal_type`
- `upgrade_available`
- `plan_group`

### `wpcom_rtc_session_summary`

Fire best-effort on page hide and periodically every five minutes for long sessions.

Suggested properties:

- `rtc_session_id`
- `transport`
- `duration_bucket`
- `connected_duration_bucket`
- `disconnected_duration_bucket`
- `active_collab_duration_bucket`
- `saw_remote_collaborator`
- `peak_remote_collaborators_bucket`
- `max_remote_collaborators_bucket`
- `local_edit_activity_count_bucket`
- `remote_edit_activity_count_bucket`
- `simultaneous_editing_observed`
- `disconnect_count_bucket`
- `modal_count_bucket`
- `manual_retry_count_bucket`
- `ended_status`
- `session_outcome`

## Concurrent collaborators and edit activity

The initial implementation should support distribution queries without high-cardinality identifiers:

- "sessions that reached at least N collaborators" should use `peak_remote_collaborators_bucket` or `wpcom_rtc_room_occupancy_sampled`;
- "rooms with at least N remote collaborators" should use bucketed occupancy samples from the primary RTC awareness surface;
- "sessions with simultaneous editors" should mean remote collaborators were present while the local user had edit activity;
- "sessions with simultaneous edits" should mean local edit activity and remote-applied edit activity were both observed in the same session.

Until the current WordPress.com maximum collaborator limit is available to the
metrics code, use collaborator buckets up to `30_plus`: `0`, `1`, `2`, `3_4`,
`5_9`, `10_14`, `15_19`, `20_24`, `25_29`, and `30_plus`. If the allowed
maximum is later confirmed or increased, revise the upper buckets rather than
collapsing all higher occupancy into `10_plus`.

The implementation should not attempt to count every keystroke or every Yjs update as a product metric. It should keep session-level counters and emit only bucketed summaries.

## Error taxonomy

Normalize Gutenberg connection error codes into Tracks-safe values:

- `authentication_failed`
- `connection_expired`
- `connection_limit_exceeded`
- `document_size_limit_exceeded`
- `unknown_error`

Track lower-level failure shape separately with allowlisted values such as:

- `token_fetch`
- `websocket_connect`
- `room_join`
- `poll`
- `send_update`
- `receive_update`
- `awareness`
- `permission_check`
- `reconnect`
- `unknown`

## MC Stats counters

Use MC Stats only for aggregate counts. Suggested stat groups and bins:

- `wpcom_rtc_session`: `eligible`, `enabled`, `start_ws`, `start_poll`, `connected`, `collab`, `fallback_poll`, `end_bad`
- `wpcom_rtc_conn`: `disconnect`, `recover`, `retry_auto`, `retry_exhaust`, `manual_try`, `manual_ok`, `manual_fail`
- `wpcom_rtc_modal`: `conn_lost`, `too_many`, `retry`, `copy`, `back`, `plugin_handled`
- `wpcom_rtc_error`: `auth`, `expired`, `conn_limit`, `doc_size`, `token_fail`, `ws_fail`, `poll_fail`, `perm`, `network`, `unknown`
- `wpcom_rtc_ws`: `token_req`, `token_ok`, `token_fail`, `open_ok`, `open_fail`, `join_ok`, `join_fail`, `close_abn`
- `wpcom_rtc_poll`: `req`, `ok`, `fail`, `4xx`, `5xx`, `body_16mb`, `rooms_50`, `update_1mb`, `storage_fail`

## Privacy and data minimization

Do not record:

- content;
- titles;
- post IDs;
- room IDs;
- client IDs;
- collaborator IDs;
- usernames;
- emails;
- tokens;
- raw URLs;
- raw user agents;
- raw errors;
- stack traces;
- plugin slugs;
- WebSocket close reason text;
- Yjs payloads;
- stable hashes of any forbidden value.

Use bucketed counts, bucketed durations, and allowlisted enum values. If `rtc_session_id` is used, generate it randomly per editor load, do not persist it, do not derive it from user/site/post data, and do not send it to MC Stats.

## Initial implementation sequence

1. Define a shared RTC metrics schema with event names, enum values, bucket helpers, and a small recording interface.
2. Add client lifecycle instrumentation for eligibility, transport choice, session start, first connection, collaboration observed, connection problem episodes, recovery, modal view/action, manual retry result, limit hit, and session summary.
3. Add aggregate MC Stats at transport and server boundaries.
4. Add focused tests for enum normalization, bucket boundaries, episode deduping, modal actions, manual retry result, and session summary generation.
5. Validate with forced cases before using the data for dashboards:
   - authentication failure;
   - connection expiration;
   - PingHub token failure;
   - HTTP polling failure;
   - collaborator limit;
   - document size limit;
   - room overflow;
   - plugin-handled modal;
   - manual retry success and failure;
   - backgrounded mobile Safari;
   - desktop app;
   - local user fallback.
