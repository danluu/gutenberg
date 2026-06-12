# WordPress.com RTC metrics implementation diff explanation

This document explains the implementation diff in the separate
`try/rtc-wp-metrics` branch. It intentionally lives on the plan branch
(`try/rtc-wp-metrics-explanation`) so reviewers can understand the proposed
implementation without mixing explanatory material into the code branch.

## High-level shape

The implementation adds generic RTC metric signals to Gutenberg. It does not
record WordPress.com Tracks events or MC Stats directly. Instead, it emits a
single JavaScript hook action:

`sync.metricEvent`

The hook receives:

1. a metric event name, such as `rtc_session_started`;
2. a payload with `schema_version: 1` and only enum or bucketed properties.

This keeps the generic Gutenberg packages free of WordPress.com analytics code.
WordPress.com can subscribe to `sync.metricEvent` in its editor integration and
translate these generic signals into Tracks events, MC Stats counters, or both.

No alerting is implemented.

## Files changed

### `packages/sync/src/metrics.ts`

This is the new central metrics helper for RTC sync instrumentation.

It defines:

- `SYNC_METRIC_EVENT_ACTION`, currently `sync.metricEvent`;
- `SYNC_METRIC_SCHEMA_VERSION`, currently `1`;
- `recordSyncMetricEvent()`, a thin wrapper around `@wordpress/hooks` `doAction`;
- normalizers and bucket helpers for safe analytics properties;
- `createSyncMetricsSession()`, which summarizes sync-manager lifecycle state.

The helper deliberately avoids content, IDs, raw room names, raw error text,
stack traces, and other high-cardinality or sensitive values. It only emits
event names and bucketed or allowlisted values.

Important bucket helpers:

- `getCountBucket()`: `0`, `1`, `2`, `3_4`, `5_9`, `10_plus`, `unknown`;
- `getDurationBucket()`: `lt_2s`, `2_10s`, `10_30s`, `30_60s`, `1_5m`,
  `5_30m`, `30m_plus`, `unknown`;
- `getByteSizeBucket()`: `lt_1kb`, `1_10kb`, `10_100kb`, `100kb_1mb`,
  `1mb_plus`, `unknown`.

The connection error normalizer maps Gutenberg's hyphenated sync error codes to
Tracks-safe underscore values:

- `authentication-failed` to `authentication_failed`;
- `connection-expired` to `connection_expired`;
- `connection-limit-exceeded` to `connection_limit_exceeded`;
- `document-size-limit-exceeded` to `document_size_limit_exceeded`;
- `protocol-mismatch` to `protocol_mismatch`;
- unknown or missing values to `unknown_error`.

### `packages/sync/src/manager.ts`

The sync manager is the best existing place to observe session-level lifecycle
state because it creates providers, receives provider status changes, applies
local changes to CRDT documents, and applies remote changes back to edited
records.

The diff adds one `createSyncMetricsSession()` instance per sync manager.

It emits:

- `rtc_session_started` when the first record or collection enters sync;
- `rtc_session_connected` on the first connected status;
- `rtc_connection_problem` once per disconnected episode;
- `rtc_connection_recovered` when a disconnected episode returns to connected;
- `rtc_session_summary` on `pagehide` or `unloadAll`.

The manager also increments session-summary counters for:

- local edit activity, when local changes are applied to the CRDT document;
- remote edit activity, when CRDT document changes update the local record.

The summary payload includes:

- `duration_bucket`;
- `connected`;
- `connection_problem_count_bucket`;
- `connection_recovery_count_bucket`;
- `local_edit_activity_count_bucket`;
- `remote_edit_activity_count_bucket`;
- `simultaneous_editing_observed`;
- `ended_status`.

There is a suppression guard around provider destruction during normal unload.
Without this, provider cleanup could emit a synthetic `disconnected` status and
inflate connection-problem metrics.

### `packages/sync/src/providers/http-polling/polling-manager.ts`

The HTTP polling manager is the code path that has room awareness and knows
about HTTP-polling-specific limits. The implementation adds three metric
families here.

First, collaborator occupancy:

- `rtc_collaboration_observed` fires once when the primary room has at least one
  remote collaborator.
- `rtc_room_occupancy_sampled` fires when the primary room first reaches a new
  remote-collaborator bucket.

This answers distribution questions such as:

- how many sessions reached 1 remote collaborator;
- how many reached 2;
- how many reached 3 to 4;
- how many reached 5 to 9;
- how many reached 10 or more.

It does not record room IDs, collaborator IDs, user IDs, names, or emails.

Second, connection-limit failures:

- `rtc_limit_hit` fires before disconnecting for
  `connection-limit-exceeded`;
- payload includes `limit_type: "connection"`,
  `observed_count_bucket`, and `configured_limit_bucket`.

Third, document-size failures:

- `rtc_limit_hit` fires before disconnecting for
  `document-size-limit-exceeded`;
- payload includes `limit_type: "document_size"`,
  `observed_size_bucket`, and `configured_size_bucket`.

The implementation resets per-session occupancy state when the last polling
room unregisters, so a later editor session can emit its own occupancy buckets.

### `packages/editor/src/components/sync-connection-error-modal/index.tsx`

The connection lost modal is the user-visible failure path, so the
implementation records modal harm signals here.

It emits:

- `rtc_connection_modal_viewed` when the default RTC error modal is shown;
- `rtc_connection_modal_viewed` with `handled_by_plugin: true` when a plugin
  handles the modal through `editor.isSyncConnectionErrorHandled`;
- `rtc_connection_modal_action` when the user clicks retry, copy post content,
  or back to posts;
- `rtc_manual_retry_result` when a manual retry succeeds or fails after it has
  actually moved through a connecting state.

The modal path includes:

- `modal_type`, using `connection_lost`, `too_many_editors`, or
  `plugin_handled`;
- normalized `connection_error_code`;
- retry attempt buckets;
- manual retry time-to-result buckets.

The code records copy-post-content only from the `useCopyToClipboard` success
callback, so failed copy attempts are not counted as successful copy actions.

### `packages/sync/src/private-apis.ts`

The sync metric helpers are exposed as private APIs so higher packages can reuse
the same schema version, normalizers, bucket helpers, and hook emitter.

This avoids duplicating metric helper logic in `@wordpress/editor` and reduces
the chance that modal metrics drift from sync-manager and polling-manager
metrics.

### `packages/core-data/src/sync.ts`

Core-data already bridges private sync APIs into editor-facing code. The diff
passes through the sync metric helpers here.

### `packages/core-data/src/private-apis.ts`

The editor modal already unlocks `coreDataPrivateApis` for
`retrySyncConnection`. The diff adds the metric helpers to that same private API
surface, so the modal can use central sync metric helpers without importing from
lower-level internals directly.

### Tests

`packages/sync/src/test/metrics.ts` covers:

- event schema version;
- connection error normalization;
- count and duration buckets;
- disconnected episode deduping;
- suppression of cleanup disconnects;
- session summary edit-activity buckets.

`packages/sync/src/providers/http-polling/test/polling-manager.test.ts` now
covers:

- `rtc_limit_hit` for document-size failures;
- `rtc_limit_hit` for collaborator-limit failures;
- `rtc_collaboration_observed` and `rtc_room_occupancy_sampled` when the
  primary room has remote collaborators.

## Event coverage in the implementation

The implementation covers the first phase of the metrics plan:

- session lifecycle;
- connection health;
- connection lost modal harm;
- manual retry outcome;
- plugin-handled modal suppression;
- room occupancy distribution;
- local and remote edit activity;
- simultaneous editing summary;
- collaborator and document-size limit hits.

It intentionally does not implement:

- WordPress.com Tracks recording;
- MC Stats recording;
- alerting;
- upgrade or purchase attribution;
- transport cost dashboards;
- raw WebSocket close diagnostics;
- room IDs, post IDs, collaborator IDs, or content-level telemetry.

## Why use a generic hook instead of direct Tracks calls?

Direct Tracks calls would couple Gutenberg packages to WordPress.com analytics.
That would be the wrong package boundary because these packages are published
and consumed outside WordPress.com.

The hook approach keeps the implementation generic:

- Gutenberg emits lifecycle signals;
- WordPress.com decides whether to record Tracks, MC Stats, both, or neither;
- tests can assert metric behavior without loading WP.com analytics code;
- privacy constraints can be enforced at the generic signal boundary.

## Why the diff uses buckets

The metrics plan requires the ability to query collaborator distributions, such
as sessions with at least 5 or 10 collaborators. The implementation supports
this through buckets rather than exact IDs or exact room membership:

- `3_4`;
- `5_9`;
- `10_plus`.

This is enough for product and reliability questions while avoiding
high-cardinality tracking and unnecessary personal data.

## Known limitations

The implementation observes the primary HTTP polling room using the existing
"first loaded room is primary" assumption. This matches the current connection
limit logic, but it is still an approximation. If Gutenberg later adds explicit
primary entity annotations, occupancy metrics should move to that stronger
signal.

`simultaneous_editing_observed` is session-level. It means the session observed
both local edit activity and remote-applied edit activity. It is not a
keystroke-level or per-Yjs-update concurrency measure.

The generic hook emits events in process. It does not persist them, retry them,
or send them over the network. That responsibility belongs to the WP.com
integration layer.

## Verification performed

The following passed in the implementation worktree:

- `npm run test:unit packages/sync/src/test/metrics.ts packages/sync/src/providers/http-polling/test/polling-manager.test.ts`
- `npx tsc -p packages/sync/tsconfig.json --noEmit`
- Prettier check for touched files
- `git diff --check`

The following typechecks still fail on unrelated existing files:

- `npx tsc -p packages/core-data/tsconfig.json --noEmit`
- `npx tsc -p packages/editor/tsconfig.json --noEmit`

The touched core-data and editor files are not part of those reported failures.

