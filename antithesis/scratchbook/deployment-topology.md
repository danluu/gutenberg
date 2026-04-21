# RCE Deployment Topology

## Summary

The minimal useful topology for Gutenberg real-time collaboration testing is a three-container setup:

- one WordPress application container running Gutenberg and the RTC relay
- one database container
- one workload container that drives at least two authenticated editor sessions

This is the smallest topology that still exposes the important fault boundaries:

- client <-> WordPress polling and editor traffic
- WordPress <-> database persistence and relay storage
- application process failure separate from the workload driver

## Components

### `wp-app`

- **Role**: Service
- **Image source**: New Antithesis Dockerfile built from this repo
- **What it runs**: WordPress + Gutenberg plugin + built JS assets + PHP/Apache or php-fpm entrypoint
- **Why it exists**: This single service hosts the post editor, REST API, autosaves controller override, RTC room relay, awareness merge logic, and sync-storage CPT registration.
- **Network connections**: Receives HTTP from `workload`; connects to `db`
- **Replica count**: 1
- **Notes**:
  - Keep RTC enabled for post editing
  - Ensure the plugin is activated at container start
  - Ensure `_wpCollaborationEnabled` is true in the post editor and false in site editor contexts

### `db`

- **Role**: Dependency
- **Image source**: Official MySQL or MariaDB image
- **What it runs**: WordPress persistence for posts, post meta, and sync relay storage
- **Why it exists**: CRDT persistence (`_crdt_document`) and relay log storage (`wp_sync_storage` post meta) must cross a real process boundary to make network and restart faults meaningful.
- **Network connections**: Accepts connections from `wp-app`
- **Replica count**: 1

### `workload`

- **Role**: Client
- **Image source**: New Node-based client image for Antithesis
- **What it runs**: Test commands plus a browser harness capable of opening at least two authenticated editor sessions against `wp-app`
- **Network connections**: Connects to `wp-app`
- **Replica count**: 1
- **Notes**:
  - Emit `setup_complete` before Antithesis test-template commands run
  - Prefer one client container that internally drives multiple sessions over multiple client containers; the important concurrency is in the editors, not between workload processes
  - The client image should include either Playwright or an equivalent browser-capable harness because the RCE code under test is browser-resident

## Why This Topology Is Minimal

- A separate sync relay container is unnecessary because WordPress already hosts the relay endpoint.
- A second WordPress replica is unnecessary for the initial RCE pass; the collaboration system is not a replicated multi-node service.
- A separate browser container per collaborator is unnecessary for the first iteration because a single workload container can manage multiple browser contexts.

## Fault Model Relevance

Most valuable Antithesis faults for this topology:

- **Network faults** between `workload` and `wp-app`: transport retries, awareness expiry, unload disconnect loss, compaction recovery
- **Network faults** between `wp-app` and `db`: save/autosave divergence, persisted-doc repair, relay storage races
- **Node hangs / throttling** on `wp-app`: delayed polls, delayed autosave, stale awareness, save notification lag
- **Node hangs / throttling** on `db`: delayed persistence and relay log operations

Optional but useful if enabled:

- **Node termination** on `wp-app` to stress startup/rejoin with persisted CRDT documents
- **Node termination** on `db` only if the harness can tolerate database recovery semantics

## SDK And Instrumentation Placement

- **Workload container**: Antithesis SDK required for assertions and lifecycle hooks
- **`wp-app` service**: likely needs surgical SDK assertions in both TypeScript and PHP-adjacent observable points, especially around persisted-doc repair, transport recovery, and awareness cleanup

## Recommended First Workload Shape

Use one test template that:

- creates or loads a post
- opens two browser sessions against the same post
- performs overlapping edits, save/autosave actions, refreshes, and reconnects
- validates convergence, persistence, and presence outcomes

Use targeted helper commands or secondary phases for transport-specific properties such as 403 isolation and client-ID ownership.

## Assumptions

- Browser automation is available inside the workload container.
- The initial harness only needs post-editor RCE, not site-editor coverage.

## Open Questions

- None blocking. The setup phase will still need to choose the exact base image and browser tooling.
