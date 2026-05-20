# RTC reviewer repro and video runbook

This runbook is for preparing fuzzer PR evidence that a Gutenberg RTC reviewer
can actually use. It is based on Alec's feedback in
[PR #78320](https://github.com/WordPress/gutenberg/pull/78320#issuecomment-4461537016)
and [issue #77716](https://github.com/WordPress/gutenberg/issues/77716#issuecomment-4464309206).

The goal is not to make a persuasive video. The goal is to make the critical
bug path understandable, repeatable, and falsifiable by a human reviewer.

## Minimum Bar

Every fuzzer PR should ship a reviewer packet with these pieces:

1. A repro that fails on `trunk`.
2. The same repro result on the PR branch, or a clear statement that the PR
   branch result is unknown, flaky, or still failing.
3. A video tied to exact steps or exact test code.
4. Human-readable steps a reviewer can follow.
5. Full disclosure of any non-human setup, including debug patches, artificial
   delays, CLI-only state, generated posts, direct store mutation, transport
   faults, browser reload timing, or changed built-in limits.

If any piece is missing, say so directly. A missing piece is acceptable; a
hidden piece is not.

## Evidence Priority

Prefer evidence in this order:

1. Normal user steps that fail on `trunk` and pass on the PR branch.
2. An e2e test that fails on `trunk` and passes on the PR branch.
3. A manual repro that needs special setup, such as adding a delay or using a
   CLI-created post.
4. A lower-level unit or integration test, with an explanation for why a human
   UI repro is not available.
5. A diagnostic-only video or trace.

Do not present a video by itself as the repro. If a reviewer cannot find the
exact steps or test code behind the video, the video is not enough.

## Worktree Setup

Use separate worktrees for `trunk` and the PR branch. Record the exact commits
before running anything:

```bash
git rev-parse HEAD
git status --short
```

For each worktree:

1. Check the environment first:

   ```bash
   npm run wp-env status
   ```

2. Start `wp-env` only if it is not already running:

   ```bash
   npm run wp-env start
   ```

3. Build the assets the browser will load:

   ```bash
   npm run build
   ```

4. If using RTC WebSocket tests, use the repo's WebSocket setup instead of a
   hand-rolled transport:

   ```bash
   npm run rtc:ws
   ```

5. If bypassing the repo's Playwright global setup, verify the WebSocket test
   provider is pointed at the right server. The provider reads:

   ```text
   packages/e2e-tests/plugins/rtc-websocket-provider/build/runtime-config.json
   ```

   That file must contain the same URL as the server used by the browser, for
   example:

   ```json
   { "url": "ws://127.0.0.1:18991" }
   ```

6. Confirm Gutenberg and any required test plugins are active in the wp-env
   instance being recorded:

   ```bash
   ./node_modules/.bin/wp-env run cli wp plugin list --status=active --field=name
   ```

If setup fails, stop and record the setup failure as a setup failure. Do not
label it as a bug repro.

## Repro Reduction

Reduce until the critical path is obvious:

1. Use stable, unique content strings such as `P1`, `P2`, and
   `P3 (delete this)`.
2. Make every required wait explicit: "wait until user B sees P3", "wait until
   `[remote update applied]` appears", or "wait for this e2e assertion".
3. Use different users when the bug depends on collaboration identity.
4. Avoid multi-bug repros. If the video shows several failures, split them into
   separate repros.
5. Keep any debug code minimal and paste the exact patch into the packet.

For a timing bug, include the timing control. For example, if a 10-second
delay is needed between a Yjs update and `updateEntityRecord()`, show that
patch and say that the repro is not a pure user repro.

## E2E Test Rules

When possible, create an e2e test or a repro branch containing the e2e test.
The test does not have to be committed to the final PR if it is only a
diagnostic, but the reviewer needs a link or path.

Before using the test as evidence:

1. Run it on `trunk`.
2. Run it on the PR branch.
3. Save the command, commit SHA, and result for both runs.
4. If the test is flaky, report the observed rate. For example, "failed 4/5 on
   trunk and passed 5/5 on the branch".
5. If the test does not reliably fail on `trunk`, do not call it a proof.

A useful e2e evidence block looks like:

```text
Test path:
test/e2e/specs/editor/collaboration/websocket/<slug>.spec.ts

Trunk:
commit <sha>
command <command>
result failed 5/5 with <assertion>

PR branch:
commit <sha>
command <command>
result passed 5/5
```

## Video Rules

Record the shortest video that proves the critical path.

The video should show:

1. The exact branch or commit, either in an intro frame, terminal pane, or
   companion doc.
2. The relevant setup: WebSocket enabled, two users, generated post, debug
   delay, or any special condition.
3. Each action that matters.
4. Each wait condition that matters.
5. The expected final state.
6. The actual final state.

For RTC bugs, use a two-pane layout whenever possible:

- left pane: user A editor;
- right pane: user B editor;
- bottom or side pane: step log with the current action and assertion.

The step log should include concrete text, not vague narration. Good examples:

```text
Step 4: User B deletes P3 (delete this).
Step 5: User A edits P1 during the 10s updateEntityRecord delay.
Expected: ["P1 - User A makes local changes", "P2"].
Actual: ["P1 - User A makes local changes", "P2", "P3 (delete this)"].
```

If browser console markers are part of the repro, make them visible or record
them in a companion log. A reviewer should not have to infer when the timing
window happened.

Do not over-edit the video. It is better to leave a few seconds of waiting
than to cut out the timing condition that makes the repro understandable.

## Manual Steps Format

Always include a numbered list. Each step should be executable by a human.

Use this shape:

```text
Setup:
- branch/commit:
- build command:
- wp-env URL:
- required plugins:
- required debug patch:
- required generated data:

Steps:
1. Open <URL> as user A.
2. Open the same post as user B.
3. ...

Expected:
- ...

Actual on trunk:
- ...

Actual on PR branch:
- ...
```

If a step cannot be performed by a human, say that explicitly. Examples:

- "This post must be CLI-created and never opened before the repro."
- "This requires a temporary 10-second delay patch."
- "This requires lowering a built-in limit."
- "This requires direct CRDT state construction and has no known UI path."

## Repro Soundness Checks

Before publishing or linking the packet, check for these common failure modes:

1. The video was recorded on the wrong branch.
2. Gutenberg was inactive, so the browser used core assets.
3. The browser loaded stale built assets.
4. The WebSocket provider connected to the wrong port.
5. The two editors were not actually in the same RTC room.
6. The post content was not the content described in the steps.
7. The e2e test was changed to pass after the failing behavior was removed
   from the assertion.
8. The PR includes dead code from an older failing approach after the test was
   changed.
9. The repro only works because of direct state mutation, but the packet
   presents it as normal UI behavior.
10. A failure is dismissed as flaky without rerunning enough times to support
    that claim.

For WebSocket RTC videos, verify the browser page exposes a connected room in:

```js
window.__gutenbergTestWebSocketSync
```

For collaboration-enabled editor pages, verify:

```js
window._wpCollaborationEnabled === true
```

If those checks fail, fix the setup before recording.

## Packet Template

Use this template in the PR description, a linked gist, or a doc branch:

```markdown
### Reviewer Repro

Summary:
- Bug:
- Why this matters:
- Repro kind: normal UI / e2e / debug-delay / lower-level only

Branches:
- trunk commit:
- PR branch commit:

Video:
- failing trunk video:
- PR branch video:
- control video, if any:

Executable repro:
- test path or branch:
- trunk command and result:
- PR branch command and result:

Manual steps:
1. ...

Expected:
- ...

Actual on trunk:
- ...

Actual on PR branch:
- ...

Special setup:
- ...

Known caveats:
- ...
```

## When No Good Repro Exists

If no normal UI repro or e2e repro is available, still make the packet useful:

1. Say what was tried and failed.
2. Explain the smallest lower-level operation sequence that demonstrates the
   bug.
3. Explain why that sequence is believed to be reachable or why reachability is
   unknown.
4. List the missing evidence that would upgrade confidence.
5. Avoid asking the reviewer to trust a prose root-cause explanation without a
   runnable check.

Good wording:

```text
I do not have a human UI repro. The only current repro is a unit-level CRDT
sequence. It fails on trunk and passes on this branch. I tried the normal UI
sequence below three times on trunk and it converged each time. This should be
reviewed as a lower-level correctness fix, not as a proven user-facing UI
failure.
```

Bad wording:

```text
The video proves the bug.
```

The video proves only what it visibly shows. The packet proves the repro by
connecting the video, steps, code, branch, and assertion.
