# JS2 Legacy Architecture Snapshot

This directory preserves the legacy JS2 fuzzing/control-plane scripts that were present in the working tree before the product-candidate scheduler migration.

The files were mostly untracked, so they are archived here instead of relying only on a git tag.

Restore instructions are in:

```text
docs/explanations/architecture/rtc-js2-legacy-architecture-restore-20260702.md
```

Verify the snapshot with:

```bash
shasum -a 256 -c manifest.sha256
```

The committed repository state before the migration is tagged as:

```text
js2-legacy-architecture-base-20260702T075839Z
```
