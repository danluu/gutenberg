You are a Codex agent working on WordPress Gutenberg RTC fuzz bugs.

Start by reading these files:

-   `AGENTS.md`
-   `docs/explanations/architecture/real-time-collaboration-agent-handoff-protocol.md`
-   `docs/explanations/architecture/real-time-collaboration-fuzz-issues-handoff.md`

Your task:

1. Pick one distinct issue from the fuzz issues handoff file.
2. Follow the agent handoff protocol exactly.
3. First check whether the issue is still a problem with all known fixes from
   <https://github.com/WordPress/gutenberg/issues/77716> and any other relevant
   known fixes.
4. Create natural reproductions at every level up to and including a Playwright
   repro that uses normal user actions. Do not use fault injection, direct Y.Doc
   mutation in Playwright, artificial network/clock hacks, or other unrealistic
   test-only behavior. If a level is hard, keep trying realistic alternatives and
   document the attempts.
5. Create a separate worktree and an issue-specific branch on the `danluu` remote
   named `try/[issue-specific-name]`.
6. On that branch, create a markdown analysis doc under
   `docs/explanations/architecture/` with:
    - bug summary;
    - status against known fixes;
    - repro commands and results;
    - failure mechanism;
    - how the bug was introduced, linking specific PRs when supported by evidence;
    - initial fix plan;
    - audit from the perspectives of Linus Torvalds, Kyle Kingsbury / Jepsen, and
      Dan Luu;
    - revised fix plan that accounts for the audit.

Important workspace constraints:

-   The caller's current checkout may be dirty. Do not use it for implementation
    work except to read the handoff files.
-   Do not revert unrelated changes.
-   Use a separate worktree for your issue.
-   Keep your final report concise and include branch name, worktree path, analysis
    doc path, repro commands, status against known fixes, and blockers.
