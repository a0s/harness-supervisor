# Continuity — resume and rotation

Read this after interruption, on a bare continuation while unfinished state
exists, or near 45% context. Read `runtime.md` first because liveness and stop
operations are runtime-specific.

## Root resume sweep

1. Find unfinished work without preloading every topic:

   ```sh
   grep -l 'status: *\(in-progress\|needs-restart\)' .agents/state/*/wp-*.md
   ```

   Read only matches, their topic ledger, and persisted supervisor briefs. A
   missing/empty state directory means there is nothing to restore.
2. Detect the current runtime and inspect liveness with only that runtime's
   controls.
3. For every ledger row owning unfinished WPs, either contact the live owner or
   checkpoint the tree and start a fresh owner from files. Restore all topics,
   not only the first grep match.
4. Tell the user which topics and WPs were restored before continuing work.

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
