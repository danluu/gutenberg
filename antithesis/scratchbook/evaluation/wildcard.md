# Evaluation Lens: Wildcard

## Summary

The most non-obvious risks in this system are not generic "CRDT bugs"; they are boundary bugs where the system intentionally cheats around missing primitives:

- PHP is only a message relay, not a CRDT engine
- queue release for secondary rooms is gated on primary-room collaborator detection
- autosave logic is patched because WordPress's normal author/lock model does not fit RTC

## Findings

### Cross-cutting observations

- The paused-queue design for collection rooms is unusual and easy to miss in a conventional property pass. It creates a failure class where document sync is healthy but secondary state is silently starved.
- Prefix-colliding room names (`postType/post:1` vs `postType/post:10`) create a subtle error-isolation hazard that is not obvious from the permission model alone.
- The autosave workaround is a hidden architectural seam: if it regresses, reload corruption appears later and may be misdiagnosed as a CRDT merge bug.

## Actions Taken

- Kept explicit properties for collection-room release, forbidden-room isolation, and draft autosave isolation.

## Passes

- The catalog captures both browser-side and PHP-side weirdness.

## Uncertainties

- None blocking.
