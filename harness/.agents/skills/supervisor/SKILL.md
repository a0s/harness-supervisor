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

## References: read only when triggered

| File | Read it when |
|---|---|
| `reference/runtime.md` | The delegated lane is selected; before the first spawn or any cross-runtime resume |
| `reference/state-layout.md` | Writing durable plans, WP state, ledgers, briefs, or decision records |
| `reference/continuity.md` | Resuming or rotating near 45% context |
| `reference/failure-modes.md` | A run failed, or before the first supervisor brief for unfamiliar work |
| `reference/host-resources.md` | Before running a server, external application, or heavy test runner another agent could also be running |
| `reference/landing.md` | Before merging into the integration branch, and on any resume that may have a landing in flight |

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
- Never let two agents edit the same file, or share a worktree, concurrently,
  including after a restart, when a misjudged liveness call is likeliest.
- A worktree isolates files, not the machine. Lease every host-global resource a
  command touches: ports, an external application, a device, heavy runner
  slots. Never hardcode or hand-pick a port.
- The integration branch is one more shared resource. Merge into it only while
  holding the project's merge lock, do the preparation and the checks outside
  that lock, and release it as soon as the merge is in. Reviewed work that never
  reaches the integration branch is not done.
- Waiting is not work, and a tool call is not free. A wait belongs inside ONE
  blocking command, never in a loop of calls that each cost a model turn.
- A claim, green build, or agent summary is not verification.
- Nothing needed for recovery may exist only in a conversation context, and
  nothing in flight may be visible only inside the worktree that owns it.
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

## Phase 0: anchor to the goal

Read the injected project goal/status/plan. State in one line whether the task
serves it, is owner-approved adjacent work, or conflicts with it. Ask only when
the priority really branches the work. Standing fences: no adjacent refactor,
unrequested feature, dependency update, or widened blast radius.

## Phase 1: diagnose before planning

Read the source. For each symptom, give the cause with `file:line` and mechanism.
Never delegate that judgment. A scout may return exact locations or command
output when the search itself is mechanical.

## Phase 2: resolve branching decisions

Ask only about choices that lead to materially different work. Recommend one
option first; for layout or interaction choices, include a small ASCII preview.
Decide non-branching defaults and state them.

Record durable architecture choices, rejected approaches, and costly
workarounds as decision records using `reference/state-layout.md`.

## Phase 3: write durable intent

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

State written inside a worktree is published to the main checkout the moment the
topic directory exists, with `.agents/bin/agent-state link` from that worktree,
and unpublished with `agent-state unlink` when the topic closes or the worktree
is torn down. The owner watches one directory rather than walking every worktree;
`agent-state list` prints every topic in the project with its work-package counts
and anything blocked.

None of it is ever committed: gitignore `.agents/state/` in the repository,
because a tracked topic directory rides an ordinary merge into the integration
branch and lands past that rule unnoticed. Git is therefore not a backup of it
either, so a plan that outlives its run — a roadmap of blocks, one worktree
each — is handed to the next block's worktree with `agent-state handover
<topic> <worktree>` as part of landing that block, never left behind in a
worktree about to be removed. Read `reference/state-layout.md` before writing
one.

## Phase 4: brief narrowly

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

## Waiting for a run, a lock, or another agent

Waiting is the one activity where an agent can spend real money and produce
nothing at all. Every tool call is a billed model round trip — including `true`,
`echo waiting`, `date`, and re-reading a log that has not changed. A dozen of
them in a row is not patience, it is the most expensive possible way to do
nothing, and it is invisible in any log that only records what changed.

**Default: put the whole wait inside ONE command.** One call, one round trip,
however long the wait lasts:

```sh
timeout -s KILL 1800 sh -c 'until <condition>; do sleep 20; done; <report>'
```

`<condition>` is the thing actually being waited on — a summary line reaching a
log, `git rev-parse <branch>` changing, a lock leaving `HELD_BY_OTHER`, a pid
disappearing. Print the result in the same command, so the waiting and the
reading of the answer are a single call. This form needs no assumption about
the runtime and works everywhere.

A runtime may auto-background a foreground wait that outlives its own per-call
limit. That is not a failure and not a stall: it silently becomes the background
form, so where re-invocation is observed the notification still arrives, and
where it is not, the log file on disk is still the answer. Read the log; do not
restart the run and do not start polling because a call "detached".

**The background form is allowed only where re-invocation is a known fact.**
Some runtimes wake an agent when a background task completes; others leave it
asleep for ever, and an agent that ends its turn "waiting" in one of those has
simply stopped. Establish which one you are in ONCE, from an observed
notification, not from hope. Where it holds, arm exactly one watcher and end the
turn with prose and no tool call. Never arm a watcher and then keep checking on
it: that is both forms at once, and it pays for the expensive one.

The two roles do not get the same answer. Root is normally re-invoked; a
**subagent normally is not** — it ends its turn "waiting", and nothing ever
wakes it, so its run finishes into an empty room and its supervisor waits for a
report that will never come. Treat the foreground blocking form as the ONLY
form available to a subagent, say so in its brief, and check on one that has
gone quiet rather than assuming it is thinking.

**Two tool calls in a row that changed nothing mean you are in a poll loop.**
Stop at the second, not the tenth, and replace the loop with a single blocking
wait. Re-checking a condition you have already armed a watcher for is the same
mistake wearing a different hat.

Bound every wait with a deadline chosen before it starts. A wait that runs out
is a finding — a stalled agent, a wedged lock, a run that died — and is reported
as one. It is never a reason to start waiting again.

## Stalls, recovery, and rotation

After two non-converging briefs, stop repeating: write the blocker, split the WP,
or return the unresolved decision to root/user. Mark it `blocked` with a reason.

On continuation with unfinished `.agents/state/`, or near 45% context, read
`reference/continuity.md`. Checkpoint first, then rotate. Root restores the
agents it spawned; each supervisor restores its own children before new work.

## Report and close

Require a compact supervisor report:

1. Per WP: changed files, behavior, exact checks/results, deliberate exclusions.
2. Final health-check counts and failures, rather than "all passed".
3. Plan deviations and unplanned findings, with no unprompted fix.
4. Manual eyeball items and continuity events.
5. Runtime, role, requested/effective model and effort, and usage when exposed.

Root reads the diff and real output before relaying what shipped, what is
verified, and what is blocked. Update project plan/log/decision records, then
delete finished `.agents/state/<topic>/` and remove its published link
(`agent-state unlink`, or `agent-state prune` after a worktree is gone); stale
recovery state is misinformation, and so is a link into a tree that no longer
exists.

Before switching topics, persist or close the current one explicitly.

## Commits and landing

Before any edit, inspect status and preserve inherited changes. Isolated work
uses a separate worktree when the repository and runtime support it: branch from
the current local integration branch rather than a potentially stale remote,
publish its state with `agent-state link`, commit the reviewed result there,
merge it into the local integration branch when done, then hand on or delete
anything in its state that must outlive the run — for a roadmap that is
`agent-state handover <topic> <next-worktree>`, and it happens before the tree
goes, because the state is unversioned and goes with it — and finish with
`agent-state unlink` and removing the worktree. Follow repository instructions
when they define a different branch or worktree command.

The last step is where parallel agents collide, so it is queued rather than
negotiated. Prepare outside the lock, where merging the integration tip into the
branch, resolving conflicts and running the checks all happen, then land under
it:

```sh
git merge master && <checks>                       # in the agent's own worktree
base=$(git rev-parse master)
.agents/bin/agent-merge-lock land --branch <mine> --base "$base"
```

`land` waits for its turn, refuses a tip that moved past `--base` or a branch
that was never tested against it, merges `--no-ff`, and releases. Exit 75 means
the turn has not come yet and the queue place is saved: call it again. After any
interruption the first command is `agent-merge-lock status`, before any git
inspection. Read `reference/landing.md` for the state words, the resume table,
and what happens when the integration branch is checked out in another session's
working copy.

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
