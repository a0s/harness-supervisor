---
name: supervisor
description: Plan and execute multi-step repository work with durable task contracts, selective delegation, verification evidence, and recovery. Skip for questions and small edits.
---

# Supervised work

Use this skill for work whose plan, decisions, or recovery must survive a session. Keep the task's scope and the owner's instructions above this process. Work that needs isolation uses a supervisor-owned worktree; root does not implement inside that worktree.

## Choose the execution mode

1. **Simple:** one Terra or Sonnet executor handles sequential work and runs the agreed checks. Root may work only in the local integration checkout when no other agent can collide with it. Isolation requires a supervisor-owned worktree, even for one sequential work package.
2. **Independent verification:** add a fresh Terra or Sonnet verifier when the change affects concurrency, persistent data, auth, public contracts, destructive operations, money, GUI/accessibility, or when tests do not convincingly observe the acceptance criteria. Give it the task, artifact, and checks without the implementer's self-assessment.
3. **Parallel:** use a Terra or Sonnet coordinator for isolated work or genuinely independent packages with distinct file ownership. Resolve shared interfaces first. Mechanical searches may use Luna or Haiku.

Record the reason for each extra agent. Model class alone does not trigger a verifier. Strong Sol or Opus resolves architecture conflicts and difficult diagnosis; routine execution and coordination use cheap models. When a strong planning session has approved a task, checkpoint it and start a fresh cheap execution session instead of keeping the strong planner in every step. Read [runtime.md](reference/runtime.md) before any spawn, cross-runtime resume, or model choice.

The integration checkout's `.agents/state/` contains only symlinks published
from owning worktrees. Never create a real topic directory there.

## Anchor, diagnose, and approve

Read the repository goal and durable backlog. State how this task serves it. Inspect current status before edits and preserve inherited changes. For a bug, identify the mechanism and source location. For a feature or research task, record facts and hypotheses without inventing a defect cause. The planner resolves choices that materially change the work; ask the owner only when their decision is needed.

Write the shared task contract described in `docs/task-contract.md` when installed, or use `agent-task` from this harness. It needs goal, observable behavior, facts, boundaries, interfaces/dependencies, numbered criteria tied to checks, and escalation conditions. Record the task ID, backlog revision, and task revision. `agent-task validate` checks structure; the planner must also judge the meaning and independence of checks. An open architecture decision prevents `ready`. Any task edit creates a draft revision and requires new review. Give an executor a ready contract, not a transcript of planning.

Keep permanent backlog and decisions in Git. Store only live run state, briefs, agent ledger, and checkpoints under ignored `.agents/state/<topic>/`; it references the task ID and revision. Read [state-layout.md](reference/state-layout.md) when writing it. Legacy `wp-*.md` remains readable; migrate an old untracked roadmap explicitly into the Git backlog before deleting its worktree. A completed worktree must never be the sole store of future work.

## Execute and verify

Assign non-overlapping files. A worker owns implementation and focused tests; a verifier judges observable behavior independently. Read actual diffs and command output. Run targeted checks after a material artifact change. Do not rerun an unchanged artifact without a stated new reason. Run integration checks once after the integrated diff; a failed or unavailable required check is not a pass.

A work package has distinct `in-progress`, `blocked`, `verified`, and `landed` states. `verified` requires successful evidence for the exact task revision, source SHA/tree, and base SHA. `landed` additionally requires the integration branch to contain it. A legacy `done` value is only a historical status, not proof of either. Use `agent-verify record --base <branch> --task-id <id> --task-revision <revision> --check '<command>'` outside the merge lock. Keep its output path; `agent-verify check` confirms freshness. After source, base, task, or checks change, record new evidence. Do not describe an optional or failed check as passed.

Lease machine-wide ports, applications, and heavy runner slots with `agent-lease`; read [host-resources.md](reference/host-resources.md) before using one. Prepare the merge in the worktree and read [landing.md](reference/landing.md) before landing. Pass the exact evidence file to `agent-merge-lock land --branch <branch> --base <sha> --evidence <file> --task-id <id> --task-revision <revision>`. Long checks happen before acquiring the lock. Review the resulting tree and record the landed SHA.

## Recover and report

Use `agent-state list` to see local topics, including blocked work. On interruption read [continuity.md](reference/continuity.md), restore from the task revision and WP checkpoints, and inspect the existing tree before launching another worker. Rotate context only when an actual context limit or observed degradation justifies it; unknown capacity is not a percentage. Read [failure-modes.md](reference/failure-modes.md) only when a run fails or stalls.

Keep waits inside one bounded command; do not poll with repeated tool calls. Stop a stalled approach after two non-converging attempts and record the blocker or request the missing decision. Do not silently expand scope.

Report what changed, the exact checks and results, task revision, evidence path, landed SHA or reason it remains unlanded, unresolved risks, and model/usage when available. Claims and agent summaries are not verification. Finish by moving durable findings into the Git backlog, clearing stale local state and links, and preserving any remaining unfinished work.
