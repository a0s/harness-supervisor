---
name: supervisor
description: >
  The single process skill for goal anchoring, diagnosis, planning, durable
  state, selective delegation, verification, and recovery. Use for multi-part
  work that needs an on-disk plan, genuinely independent workstreams, context
  isolation, an architectural decision, recovery after interruption, or a
  stalled work package. Applying the skill does not automatically mean spawning
  agents: tightly coupled sequential work stays in the root context. Do not use
  for questions or small single-file changes.
---

# Supervised work

Separate **diagnosis**, **decision**, **execution**, and **verification** only
where separation adds evidence or protects context. Agent count is not a goal;
every handoff duplicates context and can lose detail.

This harness is designed to be the repository's single process skill. Repository
instructions always override it.

## References — read only when triggered

| File | Read it when |
|---|---|
| `reference/runtime.md` | The delegated lane is selected; before the first spawn or any cross-runtime resume |
| `reference/state-layout.md` | Writing durable plans, WP state, ledgers, briefs, or decision records |
| `reference/continuity.md` | Resuming or rotating near 45% context |
| `reference/failure-modes.md` | A run failed, or before the first supervisor brief for unfamiliar work |
| `reference/host-resources.md` | Before running a server, external application, or heavy test runner another agent could also be running |

Do not preload all references. Historical fixes in `failure-modes.md` are
evidence, not unconditional reasons to add agents; the gates below decide.

## Invariants

- Root diagnoses and resolves design decisions with the user. A scout may locate
  facts; it does not decide what they mean.
- Never delegate design decisions or work whose hard part is deciding what to
  build.
- A supervisor reviews diffs and real output. It does not write production code,
  except a tiny correction after an implementer has landed almost all of a WP.
- Never pay reasoning-model rates for grep, counts, monitoring, or rerunning one
  known command.
- Never let two agents edit the same file, or share a worktree, concurrently —
  including after a restart, when a misjudged liveness call is likeliest.
- A worktree isolates files, not the machine. Lease every host-global resource a
  command touches — ports, an external application, a device, heavy runner
  slots — and never hardcode or hand-pick a port.
- A claim, green build, or agent summary is not verification.
- Nothing needed for recovery may exist only in a conversation context.
- Out-of-scope findings are reported, not silently fixed.

## Choose the lane before planning

Use the cheapest lane that preserves the needed context and evidence.

### Root-only lane

Keep execution in root when work is sequential, tightly coupled, or fits cleanly
in the current context. This includes diagnosis, architecture, and most one-WP
changes. A three-step checklist alone is not a reason to create a three-level
agent tree. Root may use one bounded direct scout or black-box verifier; that
alone does not justify an extra supervisor context.

Root still writes a durable plan when the task may outlive the session and still
runs the required checks.

### Delegated lane

Spawn a supervisor only when at least one condition is true:

1. Two or more WPs are genuinely independent and can run concurrently without
   shared files or frequent synchronization.
2. A subtask produces a large context that root should receive only as a compact
   result: searches, logs, generated artifacts, or large test output.
3. Several executors would otherwise flood root with intermediate output while
   one supervisor can integrate compact results and own recovery.
4. An interrupted run already has supervisors recorded in durable state, or the
   user explicitly requested supervised parallel delegation.

If work is sequential and shares reasoning or state, do not insert a supervisor
merely to relay messages. Work that cannot be split by context should not be
split by role.

When this lane is selected, read `reference/runtime.md` once before spawning.
Use its exact runtime-specific models, effort fields, role names, and tool map;
never translate model tiers by analogy.

## Phase 0 — Anchor to the goal

Read the injected project goal/status/plan. State in one line whether the task
serves it, is owner-approved adjacent work, or conflicts with it. Ask only when
the priority really branches the work. Standing fences: no adjacent refactor,
unrequested feature, dependency update, or widened blast radius.

## Phase 1 — Diagnose before planning

Read the source. For each symptom, give the cause with `file:line` and mechanism.
Never delegate that judgment. A scout may return exact locations or command
output when the search itself is mechanical.

## Phase 2 — Resolve branching decisions

Ask only about choices that lead to materially different work. Recommend one
option first; for layout or interaction choices, include a small ASCII preview.
Decide non-branching defaults and state them.

Record durable architecture choices, rejected approaches, and costly
workarounds as decision records using `reference/state-layout.md`.

## Phase 3 — Write durable intent

For delegated or interruption-prone work, create
`.agents/state/<topic>/TODO.md` before execution. Each WP contains only:

- **Cause:** `file:line`, mechanism.
- **Do:** concrete files and behavior.
- **Verify:** exact minimum commands and passing shape.
- **Do NOT:** frozen boundaries.

At top level add hard constraints, definition of done, file-based execution
order, and out-of-scope findings. Use per-WP status and the root-owned ledger as
defined in `reference/state-layout.md`. Root-only work that is short and
recoverable may use the harness checklist without delegation state.

The plan holds intent; WP files hold mutable truth. Update a WP after a material
state transition and before handing it to another agent. Do not journal scout
chatter that changes neither `last-good` nor `next-action`.

## Phase 4 — Brief narrowly

Before spawning, persist `BRIEF_<supervisor-id>.md` and ledger ownership. Record
runtime, role definition, requested model/effort, effective overrides if known,
and task/agent id. A supervisor brief contains:

1. Role, owned WPs, runtime role routing, and the no-production-code boundary.
2. Read-first paths: repo rules, plan, owned WP files, then named source.
3. Only global safety constraints and fences relevant to its WPs. Do not paste
   the full plan twice.
4. Exact targeted checks and the once-per-run integration checks.
5. Named traps that diagnosis actually found.
6. Compact continuity contract: read owned WP state first; checkpoint before a
   handoff or 45% rotation; restore in-flight work before starting new work.
7. Report schema and: *do not report completion for anything you did not verify;
   if a check fails, quote the output.*

Each child gets a minimal WP brief: objective, cause, allowed files, success
criteria, exact checks, relevant traps, and scope fences. It does not receive
the full project plan, unrelated WPs, all locale rules for a server-only task,
or previous agents' reasoning transcript.

For Codex use a no-history or smallest-possible fork and pass model plus
`reasoning_effort` explicitly. For Claude Code use the installed
`supervisor-*` agent definitions; their frontmatter supplies the intended model
and effort unless a higher-precedence runtime setting overrides it. If
Claude nesting is unavailable at supervisor depth, flatten the tree: root
spawns workers directly and performs supervisor review itself.

Launch independent WPs concurrently in one wave. Sequence by overlapping files,
not topic labels.

## Per-WP execution and verification

Default loop:

1. Implementer reads named source and owns production code plus focused tests.
2. Supervisor reads the actual diff and tests, checking scope and behavior
   against the WP rather than the summary.
3. Supervisor runs targeted checks and records real output.
4. If the independent-verifier gate fires, a fresh verifier receives only the
   artifact, requirements, changed files, and black-box success criteria.
5. Supervisor reviews any verifier diff, reruns relevant checks, and rebriefs a
   fix when needed.

Use a separate verifier/test author when any of these is true:

- the WP involves async/concurrency, cross-layer state, persistence/migration,
  auth, destructive operations, money, public schemas, or flaky failures;
- the implementer's tests mirror implementation rather than observable behavior;
- GUI/e2e, accessibility, race/failure behavior, or a public contract needs an
  adversarial pass;
- the first attempt failed or the supervisor cannot explain how the tests catch
  the original bug;
- the supervisor runs below the expected top tier.

Otherwise the implementer writes tests and the supervisor independently reviews
them. Do not split implementation and ordinary test writing merely by job title;
they share context. A black-box verifier works because it judges end state
without implementation history.

### Definition of done

A WP is done only when change-appropriate checks exist and pass and the
supervisor has seen real output. Choose observable-behavior coverage from the
layers the repository actually has: unit/component, integration, contract,
GUI/e2e, accessibility, migration, or another project-defined layer. A changed
cross-layer contract normally needs evidence from each affected side. Never
invent a GUI, server, or test layer that does not exist merely to satisfy the
harness; record why a seemingly relevant layer is not applicable or unavailable.

Run targeted checks per WP. Run the full suite, typecheck/build, and repository
health checks once after the integrated diff unless the plan names an earlier
gate. A runner that remains unavailable after the normal remedy makes the WP
`blocked`, not done.

## Stalls, recovery, and rotation

After two non-converging briefs, stop repeating: write the blocker, split the WP,
or return the unresolved decision to root/user. Mark it `blocked` with a reason.

On continuation with unfinished `.agents/state/`, or near 45% context, read
`reference/continuity.md`. Checkpoint first, then rotate. Root restores the
agents it spawned; each supervisor restores its own children before new work.

## Report and close

Require a compact supervisor report:

1. Per WP: changed files, behavior, exact checks/results, deliberate exclusions.
2. Final health-check counts and failures, not “all passed.”
3. Plan deviations and unplanned findings, with no unprompted fix.
4. Manual eyeball items and continuity events.
5. Runtime, role, requested/effective model and effort, and usage when exposed.

Root reads the diff and real output before relaying what shipped, what is
verified, and what is blocked. Update project plan/log/decision records, then
delete finished `.agents/state/<topic>/`; stale recovery state is misinformation.

Before switching topics, persist or close the current one explicitly.

## Commits

Before any edit, inspect status and preserve inherited changes. Isolated work
uses a separate worktree when the repository and runtime support it: branch from
the current local integration branch rather than a potentially stale remote,
commit the reviewed result there, merge it into the local integration branch
when done, then remove the worktree. Follow repository instructions when they
define a different branch or worktree command.

No non-merge commit is ready without a useful English subject and body written
from the reviewed diff and checks: **why**, **what**, and **how verified**,
including any unrun/failing check and important scope limit. Do not push unless
the owner explicitly asks.

After three or more long debugging rounds, record root cause and fix without raw
logs and suggest `/compact`.

## When not to use delegation

Questions, small single-file edits, one tightly coupled feature, and work whose
hard part is diagnosis or design. If transferring briefs costs more context than
isolation saves, keep the work in root.
