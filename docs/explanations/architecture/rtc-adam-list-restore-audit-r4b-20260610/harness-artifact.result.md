verdict: plausible-but-needs-more-proof

C1: valid - Embedded evidence supports a persistent local mixed state: v1 title/restored marker with v3 content across restore, idle, reload, REST/code-editor checks, and later DB reads.

C2: plausible-but-needs-more-proof - The observed single-user restore/content replacement behavior is in the same broad bug family, but the embedded evidence does not prove it is the same mechanism as Adam's report.

C3: invalid - The self-heal narrative is contradicted by immediate restore evidence showing v3 content already present right after restore, including the restore-phase HTTP 200 write.

C4: invalid - The evidence does not prove Adam's exact wp.com Atomic production-site bug; this is a local Atomic-like harness with REST-seeded revisions and altered setup behavior.

artifact-risk checklist

- REST-seeded revision setup: material artifact risk.
- Logger starts only after seeding: cannot audit seed-time writes.
- One page, no collaborator, no direct CRDT constraints: limits production equivalence.
- Store diagnostics are internal/read-only: useful but not independent enough alone.
- Code editor helper mutates editor mode via `wp.data`: low-to-medium interaction risk.
- Logger records non-GET post endpoints, including autosaves: useful, but autosave/CRDT 409s may be harness-relevant.
- Shared config disables global setup/web server: material environment divergence.
- Normal setup would reset WS/plugin/posts, but was disabled: material stale-state risk.
- Current `wp-env` not initialized, so no fresh DB read: no current independent confirmation.

robust evidence despite artifacts

- Restore used visible UI path and produced visible notice.
- Immediate post-restore evidence already shows mixed state, before idle/reload narratives.
- Restore-phase HTTP 200 write reportedly contains v3 content, not v1/v2.
- REST confirms v3 content with v1 title immediately after restore.
- Idle and reload checks preserve the same mixed state.
- Later DB reads confirm the same v1 title/v3 content after probe and 18 minutes later.
- Summary explicitly records expected v1 absent, latest v3 present, `persistedBadState: true`.

remaining material artifact risks

- The strongest evidence supports a local harness reproduction, not production identity.
- REST seeding may have created revision/state relationships unlike the production case.
- Disabled global setup may allow stale WS/plugin/post state to influence results.
- No fresh DB read in a newly initialized environment leaves persistence confirmation incomplete.
- The observed write path suggests immediate incorrect restore/write, not delayed self-heal.
- Lack of collaborator/direct CRDT constraints weakens claims tied to production sync behavior.