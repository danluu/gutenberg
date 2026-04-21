# client-id-hijack-is-rejected

## Summary

A WordPress user should not be able to join a room by reusing another user's Yjs client ID.

## Evidence

- `WP_HTTP_Polling_Sync_Server::check_permissions()` inspects existing awareness state and rejects a request if the same `client_id` is already owned by another `wp_user_id`.
- This is one of the few server-side integrity checks that ties Yjs client identity to WordPress user identity.

## Relevant Code Paths

- `check_permissions()`
- awareness-state lookup in `WP_Sync_Post_Meta_Storage`

## Failure Mode

Cross-user client-ID reuse could let one user impersonate another collaborator within the same room or corrupt room identity assumptions.

## Planned Instrumentation

- Add a PHP-side `Reachable` marker when duplicate client ID reuse is detected.
- Add workload-side `Always` assertions that the second user receives rejection and cannot participate in sync for that claimed ID.

## Existing Antithesis Instrumentation Status

- Missing.

## Assumptions

- The workload can control session cookies for multiple users and force a client ID reuse attempt.

## Open Questions

- None.
