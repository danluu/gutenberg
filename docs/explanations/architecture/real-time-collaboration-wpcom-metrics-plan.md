# WordPress.com real-time collaboration metrics plan

## Goal

Measure whether real-time collaboration is usable and reliable on WordPress.com before using the data for packaging, pricing, or growth work.

The first implementation should answer four questions:

1. How often is RTC eligible, enabled, attempted, and connected?
2. How often does RTC become an actual collaborative editing session?
3. How often do users hit visible failure states, especially the connection lost modal?
4. Which broad failure class is responsible when RTC fails or falls back?

Alerting is explicitly out of scope for the initial implementation. The first phase should collect clean events and counters, validate them against known forced failure cases, and build dashboards only after the data contract is stable.

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
- `max_remote_collaborators_bucket`
- `disconnect_count_bucket`
- `modal_count_bucket`
- `manual_retry_count_bucket`
- `ended_status`
- `session_outcome`

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

