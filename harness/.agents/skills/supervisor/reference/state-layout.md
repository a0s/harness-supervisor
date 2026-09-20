# Durable backlog and local run state

Read this when writing a task, work package, brief, ledger, or checkpoint.

| Lifetime | Store | Contents |
|---|---|---|
| Across runs | A repository-tracked plan or issue tracker | Goal, accepted decisions, task IDs, status, outstanding work |
| One run | Ignored `.agents/state/<topic>/` | Task reference, WPs, agent ledger, exact briefs, recovery facts |
| Verification | Shared Git directory `agent-verification/` | Evidence JSON and full check output for one source/base/task revision |

A task in local state references its Git backlog ID and plan revision and the
exact ready task revision. Changing any of them invalidates old verification.
Never leave future work only in a worktree that may be removed. Commit backlog
updates with the code or as a separate durable plan change. Do not commit
`.agents/state/`; add it to `.gitignore` and untrack any inherited tracked copy.

## Topic layout

```text
.agents/state/<topic>/
  TODO.md                 run scope and task ID / plan revision / task revision
  AGENTS.md               agent ledger and ownership
  BRIEF_<agent>.md         exact launch brief
  wp-1.md                 mutable work package checkpoint
```

Write a WP after a material transition and before handing off. One agent owns
one WP file. A useful checkpoint has:

```text
# WP-1: task title
status:      in-progress | blocked | needs-restart | verified | landed
backlog:     task ID and Git plan revision
revision:    ready task revision
owner:       runtime, role, agent ID
last-good:   work actually completed
next-action: one concrete next action while unfinished
files:       changed paths
worktree:    absolute path and branch, if any
landing:     not-started | prepared base=<sha> | landed <sha>
traps:       blocker or failed approach
verified:    evidence path, source SHA/tree, base SHA, commands and results
updated:     ISO timestamp
```

`verified` means checks succeeded for the exact task and Git revisions. It does
not mean integration occurred. `landed` requires the merge result. A `blocked`
WP includes its reason in `traps`; `agent-state list` shows blocked counts and
reasons. The older `done` value is still parsed for recovery, but is not proof
of verification or landing. Never carry an evidence path to a revised task as
if it remained current; run `agent-verify check` and record new evidence.

The agent ledger records role, runtime, requested and effective model/effort,
owned WPs, exact brief, agent ID, worktree, last seen time, and lifecycle state.
Append a new identity on restart instead of erasing the old one.

## Visibility and legacy migration

A worktree publishes a topic with `agent-state link`; its symlink appears in the
main checkout. `agent-state list` also finds unlinked topics. Unlink before
tearing down a worktree; prune links whose targets disappeared.

Legacy `TODO.md` and `wp-*.md` remain readable. A legacy `ROADMAP.md` is not
migrated or deleted automatically. Review it against the tracked backlog,
write missing future tasks and decisions into Git, commit them, then remove the
obsolete local roadmap and worktree. `agent-state handover` remains available
for unfinished local state; it is a recoverable multi-step copy, not an atomic
filesystem transaction. Retry after an interruption and inspect both trees
before removing either one.
