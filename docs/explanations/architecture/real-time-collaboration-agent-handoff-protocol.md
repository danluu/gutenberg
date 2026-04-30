# Real-time collaboration agent handoff protocol

Use this protocol when handing RTC fuzz bugs to another agent.

## Inputs

-   Bug list: `docs/explanations/architecture/real-time-collaboration-fuzz-issues-handoff.md`
-   Fuzz test: `packages/core-data/src/utils/test/crdt-blocks.fuzz.test.ts`
-   Upstream tracking issue: <https://github.com/WordPress/gutenberg/issues/77716>
-   Launch prompt:
    `docs/explanations/architecture/real-time-collaboration-agent-launch-prompt.md`

## Launching agents in tmux

When handing off the full RTC fuzz issue set, create one tmux session with one
window per issue. Treat tmux windows as the issue tabs. Do not launch one agent
to pick issues sequentially unless the user explicitly asks for serial work.

Default session name:

```text
rtc-fuzz-handoff-1
```

Default window assignments:

```text
issue1-rich-text-sibling
issue2-object-query
issue3-query-array
issue4-top-level-blocks
issue5-html-corruption
```

Each window should start a separate Codex process. Append an issue-specific
assignment to the shared launch prompt so each agent is pinned to one issue and
does not choose another issue from the handoff file.

Example launch template:

```bash
session=rtc-fuzz-handoff-1
repo=/Users/danluu/dev/fuzz/gutenberg
prompt=docs/explanations/architecture/real-time-collaboration-agent-launch-prompt.md

tmux new-session -d -s "$session" -c "$repo" \
	-n "issue1-rich-text-sibling" \
	"codex --search --ask-for-approval never --sandbox danger-full-access --cd '$repo' \"\$(cat '$prompt'; printf '\\n\\nAssigned issue: Issue 1: Stale local snapshots overwrite remote rich-text sibling attributes. Do not pick any other issue. Use branch try/stale-rich-text-sibling unless that branch exists.\\n')\""

tmux new-window -d -t "$session" -c "$repo" \
	-n "issue2-object-query" \
	"codex --search --ask-for-approval never --sandbox danger-full-access --cd '$repo' \"\$(cat '$prompt'; printf '\\n\\nAssigned issue: Issue 2: Stale local snapshots overwrite object+query map operations. Do not pick any other issue. Use branch try/stale-query-object-map unless that branch exists.\\n')\""

tmux new-window -d -t "$session" -c "$repo" \
	-n "issue3-query-array" \
	"codex --search --ask-for-approval never --sandbox danger-full-access --cd '$repo' \"\$(cat '$prompt'; printf '\\n\\nAssigned issue: Issue 3: Stale local snapshots overwrite nested query-array operations. Do not pick any other issue. Use branch try/stale-query-array unless that branch exists.\\n')\""

tmux new-window -d -t "$session" -c "$repo" \
	-n "issue4-top-level-blocks" \
	"codex --search --ask-for-approval never --sandbox danger-full-access --cd '$repo' \"\$(cat '$prompt'; printf '\\n\\nAssigned issue: Issue 4: Stale local snapshots overwrite top-level block array operations. Do not pick any other issue. Use branch try/stale-top-level-blocks unless that branch exists.\\n')\""

tmux new-window -d -t "$session" -c "$repo" \
	-n "issue5-html-corruption" \
	"codex --search --ask-for-approval never --sandbox danger-full-access --cd '$repo' \"\$(cat '$prompt'; printf '\\n\\nAssigned issue: Issue 5: Rich-text merge corrupts valid HTML closing tags. Do not pick any other issue. Use branch try/rich-text-html-corruption unless that branch exists.\\n')\""

for window in \
	issue1-rich-text-sibling \
	issue2-object-query \
	issue3-query-array \
	issue4-top-level-blocks \
	issue5-html-corruption
do
	tmux set-window-option -t "$session:$window" allow-rename off
	tmux set-window-option -t "$session:$window" automatic-rename off
done
```

If the session already exists, add missing windows to the existing session instead
of creating a second session. After launching, verify the layout:

```bash
tmux list-windows -t rtc-fuzz-handoff-1 \
	-F '#{window_index}: #{window_name} panes=#{window_panes}'
```

Attach to monitor the agents:

```bash
tmux attach -t rtc-fuzz-handoff-1
```

## Workspace rules

1. Do not use the caller's dirty checkout for implementation work.
2. Create a separate worktree for the assigned issue.
3. Create an issue-specific branch on the `danluu` remote named
   `try/[issue-specific-name]`.
4. Do not revert unrelated changes in the original checkout.
5. Keep one issue per branch unless explicitly asked to batch issues.

Suggested setup:

```bash
git fetch origin
git fetch danluu
git worktree add ../gutenberg-[issue-specific-name] -b try/[issue-specific-name] origin/trunk
cd ../gutenberg-[issue-specific-name]
```

If `origin/trunk` is not the right base for the known fixes being checked, pick
the branch or PR merge base that contains those fixes and document why.

## Required workflow for each issue

### 1. Check whether the issue is already fixed

Before implementing anything:

1. Read <https://github.com/WordPress/gutenberg/issues/77716>, including linked
   PRs, comments, and references.
2. Search the repo history and open PRs for related RTC fixes.
3. Test the issue against all known fixes from that issue and any other relevant
   fix branches or commits.
4. Record the exact base commit, branch, or PR ref tested.

Useful commands:

```bash
gh issue view 77716 --repo WordPress/gutenberg --comments
gh pr list --repo WordPress/gutenberg --search "77716 RTC CRDT stale snapshot rich text"
git log --oneline --grep="RTC" --grep="CRDT" --grep="collaboration" --all
```

If GitHub CLI is not authenticated or unavailable, use the browser or web search
and cite the exact URLs in the analysis doc.

### 2. Build repros at every realistic level

Create repros at every level up to and including Playwright.

Expected levels:

-   focused unit/model repro near the failing merge function;
-   package-level repro around `mergeCrdtBlocks()` or the relevant RTC adapter;
-   integration repro that exercises the editor data flow naturally where possible;
-   Playwright repro using normal user actions.

The Playwright repro must use realistic user behavior. Do not use fault
injection, direct Y.Doc mutation from the test, artificial clock/network hacks,
or other non-user actions. If a level is hard to reproduce, keep trying realistic
alternatives and document the failed attempts and why they were insufficient.

For each repro, record:

-   command to run it;
-   expected result;
-   actual result on the broken base;
-   result after applying known fixes, if any;
-   why the repro is natural for that layer.

### 3. Write an issue analysis document

On the issue branch, create a markdown document under
`docs/explanations/architecture/` with this structure:

```markdown
# [Issue title]

## Summary

## Status against known fixes

## Reproductions

## Failure mechanism

## How this was introduced

## Initial fix plan

## Fix plan audit

### Linus Torvalds lens

### Kyle Kingsbury / Jepsen lens

### Dan Luu lens

## Revised fix plan

## Open questions
```

For "How this was introduced", link to specific PRs using normal markdown links
that work in GitHub-rendered markdown. If the exact introducing PR is uncertain,
state the evidence and uncertainty instead of guessing.

### 4. Audit the fix plan

Audit the initial plan from these perspectives:

-   Linus Torvalds: data structure invariants, minimality, avoiding clever
    special cases, correctness before cosmetics.
-   Kyle Kingsbury / Jepsen: histories, causality, acknowledgements, convergence
    versus data loss, operation preservation.
-   Dan Luu: production interleavings, debuggability, blast radius, tests that
    prevent plausible regressions.

Then write a revised fix plan that explicitly addresses the audit.

### 5. Branch and handoff output

Before finishing:

1. Ensure the branch is named `try/[issue-specific-name]`.
2. Push it to `danluu` if credentials allow:

    ```bash
    git push -u danluu try/[issue-specific-name]
    ```

3. Report:

    - branch name;
    - worktree path;
    - analysis doc path;
    - repro commands;
    - whether the issue still reproduces with known fixes;
    - any blockers.

Do not mark the issue fixed unless at least one natural Playwright-level repro
passes on the fix and fails on the broken base, or the analysis doc explains why
that level cannot be made realistic.
