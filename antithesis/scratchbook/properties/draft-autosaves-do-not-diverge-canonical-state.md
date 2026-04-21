# draft-autosaves-do-not-diverge-canonical-state

## Summary

RTC-enabled draft autosaves should not make the canonical post advance in a way that leaves the persisted CRDT document behind.

## Evidence

- `lib/compat/wordpress-7.0/class-gutenberg-rest-autosaves-controller.php` contains extensive comments describing this exact divergence bug.
- `lib/compat/wordpress-7.0/rest-api.php` globally overrides the autosaves controller to preserve RTC semantics.
- The failure is explicitly described as leading to duplicate inserts or deletions on reload.

## Relevant Code Paths

- `Gutenberg_REST_Autosaves_Controller::create_item()`
- `wp_is_collaboration_enabled()`
- persisted-doc reload path in `SyncManager`

## Failure Mode

The saved post and persisted CRDT document drift apart, and the next reload or join corrupts the editor state.

## Planned Instrumentation

- Add a PHP-side `Reachable` marker when RTC forces the autosave-revision branch.
- Add workload-side `Always` assertions comparing canonical post content, autosave behavior, and post-reload convergence.

## Existing Antithesis Instrumentation Status

- Missing.

## Assumptions

- The workload can trigger autosaves from multiple users while RTC is enabled.

## Open Questions

- None.
