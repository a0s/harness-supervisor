# Continuity: resume and rotation

Read this after interruption, on a bare continuation while unfinished state
exists, or near 45% context. Read `runtime.md` first because liveness and stop
operations are runtime-specific.

## Root resume sweep

1. Ask whether a landing was interrupted, before inspecting git at all:

   ```sh
   .agents/bin/agent-merge-lock status
   ```

   The lock belongs to a worktree rather than to a process, so an interruption
   does not lose it. `HELD_BY_ME` means this worktree still owns the integration
   branch and must either finish the merge or release it; `QUEUED` means the
   place in line survived; `HELD_BY_OTHER` means another agent is landing right
   now and this one must not touch the branch. `reference/landing.md` holds the
   full table.
2. Find unfinished work without preloading every topic:

   ```sh
   grep -l 'status: *\(in-progress\|needs-restart\)' .agents/state/*/wp-*.md
   ```

   Read only matches, their topic ledger, and persisted supervisor briefs. A
   missing/empty state directory means there is nothing to restore.
3. Detect the current runtime and inspect liveness with only that runtime's
   controls.
4. For every ledger row owning unfinished WPs, either contact the live owner or
   checkpoint the tree and start a fresh owner from files. Restore every topic
   the sweep finds, rather than stopping at the first grep match.
5. Tell the user which topics and WPs were restored before continuing work, and
   name any landing that was still in flight.

### Liveness by runtime

**Codex**

- Use `list_agents` to inspect the tree.
- Use `send_message` for a running known agent and `followup_task` for an idle
  known agent. Do not spawn a duplicate.
- Use `interrupt_agent` only after a usable checkpoint when rotating.

**Claude Code**

- Use `ListAgents` when the harness exposes it. Otherwise use a recorded agent
  or background-task id with the available agent/task panel and controls.
- Use `SendMessage` when exposed. If it is unavailable, do not infer reachability
  from `TaskList`: task-list items are not a complete subagent-liveness API.
- Use `TaskStop` only for a recorded background task that the runtime can resolve;
  otherwise use the agent stop control exposed by that Claude Code version.
- If no liveness operation is exposed after an interruption, first inspect
  `git status`, `git diff`, and WP files. Mark the old identity unreachable, then
  respawn from the checkpoint rather than guessing it is live.

A cross-runtime resume always creates fresh agents from the ledger, brief, WP
files, and dirty tree. In-memory agent identities are never portable.

## One worktree, one agent, especially after a restart

A misjudged liveness call is survivable. Two agents writing one worktree is not:
their edits interleave inside files, so the loser's work is not overwritten but
silently blended, and no later diff can separate the two. Make sharing
impossible instead of making the liveness call perfect.

### Record the tree

A WP that owns a worktree carries `worktree:` in its WP file
and in its ledger row: absolute path plus branch. A resume that cannot say which
tree belongs to which WP will guess, and guessing is how two agents end up in one.

### Claim it

The agent working a tree owns `.agents/wt-owner` inside that tree,
holding runtime, agent id, WP and an ISO timestamp, written before its first
edit. Read that file before spawning into any existing tree: a marker naming a
different agent means do not spawn there, whatever the liveness check concluded.
An agent that finds a foreign marker under itself stops and reports rather than
working around it. The marker is scratch, not history: never stage or commit it,
and remove it when the tree is torn down.

### Never relaunch into the interrupted agent's tree

On restore, checkpoint the
dirty tree first as a commit on its own branch, labelled honestly as unreviewed,
then branch a FRESH worktree from that commit for the new agent. If the old agent
later wakes, the two write to different trees and their work reconciles by merge
instead of by corruption. This costs one commit and one worktree; the alternative
costs an afternoon of forensics.

### Absence of writes is not death

A tree with no recent file changes and a clean
`git status` may be an agent that has not written yet, or one that is reading,
measuring, or waiting on a shared resource. Sample twice over a real interval, and
prefer a runtime liveness control over any filesystem inference. In particular, an
agent resumed by a message keeps its old task-output file frozen at the moment it
first stopped: after any resume, that file's timestamp is not a liveness signal at
all.

## Restore rule

| State | Action |
|---|---|
| Owner provably live | Message it to flush WP state, then continue it |
| Owner unreachable; WP current | Relaunch the current runtime's matching role from persisted brief plus resume delta |
| WP stale or missing | Reconstruct from `git status`, `git diff`, test artifacts, and reachable task output; write WP state; then relaunch |
| Ledger reported and WPs done | Do not redo; independently rerun required integration checks |

The resume delta names owned WP files first, freezes `done` WPs, starts each
unfinished WP at `next-action`, warns that a dirty tree is expected, restates
scope fences, and names the current runtime role. It does not reproduce the old
conversation.

## Restore downward before new work

Each restored supervisor first restores the children it spawned using the same
rules. It checkpoints live children and relaunches unreachable ones from their
WP files before starting new WPs.

If Claude Code does not expose `Agent` at supervisor depth, or a configured
spawn-depth cap rejects nesting, checkpoint once and flatten the wave: root
spawns implementers/verifiers and performs integration review. Do not retry a
known depth failure.

## Rotate near 45% context

Context percentage can be exact or a conservative estimate from a long run,
large outputs, and repeated review cycles. Rotation preserves a role; it is not
an escalation.

1. Ask the agent to stop starting work and rewrite its WP with `last-good`,
   concrete `next-action`, `files`, `traps`, and real `verified` output.
2. Read the checkpoint. Request one correction if it is not independently
   actionable.
3. Stop the old agent with the current runtime's control.
4. Relaunch the same role/model/effort from the persisted brief and WP file.
5. Update the root ledger with old and new runtime ids.

The supervisor rotates its children; root rotates supervisors; every agent asks
for rotation when it approaches the threshold. Root also flushes its plan and
ledger before handing the session to a fresh root context.
