# JS2 Legacy Architecture Restore Notes

The product-candidate scheduler migration deliberately keeps the legacy JS2 architecture restorable.

## Tags

Committed repo state before the scheduler migration:

```text
js2-legacy-architecture-base-20260702T075839Z
15c08b883c8903b04caf3265244bfc3a8f36db83
```

Legacy script/runbook snapshot in this branch:

```text
tools/rtc-js2-legacy-architecture-20260702/
```

The snapshot exists because the active JS2 scripts and runbooks were mostly untracked in the working tree. A normal git tag alone would not preserve them.

## Snapshot Contents

```text
tools/rtc-js2-legacy-architecture-20260702/bin/
tools/rtc-js2-legacy-architecture-20260702/codex-analysis/
tools/rtc-js2-legacy-architecture-20260702/runbooks/
tools/rtc-js2-legacy-architecture-20260702/manifest.sha256
```

The manifest contains SHA-256 checksums for every archived file.

## Restore The Committed Repo State

```bash
git fetch danluu tag js2-legacy-architecture-base-20260702T075839Z
git switch -c restore-js2-legacy js2-legacy-architecture-base-20260702T075839Z
```

This restores the committed repository state. It does not restore the previously untracked JS2 scripts unless they are copied from the snapshot below.

## Restore The Legacy JS2 Scripts

From a checkout containing this branch:

```bash
legacy_dir=tools/rtc-js2-legacy-architecture-20260702

cp -p "$legacy_dir"/bin/rtc-* bin/
cp -Rp "$legacy_dir"/codex-analysis ./
cp -p "$legacy_dir"/runbooks/JS2_RESUME_SAVE.md ./
cp -p "$legacy_dir"/runbooks/rtc-less-busy-benchmark-handoff-20260519.md \
	docs/explanations/architecture/
```

Verify the archive before copying if there is any concern about local edits:

```bash
(
	cd tools/rtc-js2-legacy-architecture-20260702
	shasum -a 256 -c manifest.sha256
)
```

## Return To The New Scheduler

```bash
git fetch danluu
git switch codex/js2-product-candidate-scheduler-20260702T075839Z
```

Then follow `docs/explanations/architecture/rtc-product-candidate-scheduler-runbook.md`.

## Operational Difference

The legacy architecture treated these surfaces as partial authority:

- run directories
- tmux sessions
- branch names
- current-run symlinks/files
- deferred manifests
- progress/finalization/accounting loops
- fuzz activity
- exact-stack limbo

The scheduler architecture treats those as artifacts only. The scheduler ledger is the authority, and `rtc-product-candidate` is the only human-testable ref.
