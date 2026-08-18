# State layout

Read this when writing a plan, WP status, agent ledger, persisted brief, or
decision record.

## Three lifetimes

| Lifetime | Store | Contents |
|---|---|---|
| Project | `WORKLOG.md` or the repository's equivalent | Goal, durable status, dated log, decisions, key coordinates |
| One run | `.agents/state/<topic>/` | Batch plan, per-WP status, agent ledger, exact spawn briefs |
| Many runs — a **roadmap** | `.agents/state/<topic>/TODO.md`, owned by the worktree working the current block | Goal, the owner's standing rulings, the blocks NOT yet done, constraints that still bite |

Run state is recovery scaffolding. Delete a finished topic after its durable
result has reached the project log; an empty `.agents/state/` is normal. Do not
invent generic goal/current-state/context-summary files when the repository
already defines a project trace.

A roadmap is the third case and the one that gets lost, because it looks like run
state and outlives every run that touches it: work planned as N blocks, one
worktree per block, weeks apart. Four rules keep it honest.

**It only holds what exists nowhere else.** Goal, the owner's rulings and
decisions that are not yet code, the blocks still to do, and the traps that still
bite. What a finished block learned is not repeated: what shipped is a line in the
project log, a measured difference is an entry wherever the repository records
those, a recovered law is a comment beside the code implementing it. So a roadmap
SHRINKS as the work lands. One that grows is duplicating a record that already
exists somewhere it will be read.

**Emptying it is part of landing a block, not a later tidy.** The block that lands
moves its own findings out and deletes its section in the same commit. Left for
later, the deletion never happens and the file becomes a second, drifting history.

**One owner, always the worktree working the current block.** Publish it with
`agent-state link` from there. Landing a block hands it to the next block's
worktree by hand — copy in under the next name, link from there, delete from
here — or deletes it if nothing is left to do. A roadmap with no worktree is
nobody's, and the next reader cannot tell whether it is live or abandoned.

**It never enters version control.** This is the rule the other three depend on and
the one a repository has to enforce, because git cannot see the harness: with the
topic directory tracked, landing a branch carries it into the integration branch
through an ordinary merge, straight past "the main checkout holds only links".
Gitignore `.agents/state/` in the repository, and check the branch carries none of
it before landing.

## Topic directory

```text
.agents/state/<topic>/
  TODO.md                 immutable intent and WP list
  AGENTS.md               root-owned agent ledger
  BRIEF_supervisor-1.md   exact persisted spawn brief
  wp-3.md                 mutable truth for one WP
```

Use one writer per WP file and never let agents sharing a file edit in parallel.
The plan says what should happen; the WP file says what has happened.

## State in a worktree stays visible from the main checkout

A topic worked in a worktree keeps its state inside that worktree, next to the
work it describes. That is right for recovery and invisible to the owner, who
would otherwise have to walk every worktree to learn what is in flight. So the
worktree publishes it, immediately after creating the topic directory:

```sh
.agents/bin/agent-state link          # from inside the worktree
.agents/bin/agent-state list          # every topic in the project, one screen
```

`link` puts a symlink named `<topic>@<worktree>` in the main checkout's own
`.agents/state/`, pointing at the real directory. The owner browses one place
and still opens the true files; nothing is copied, so there is no second version
to drift. Links are named with `@`, which no real topic uses, and the tool adds
one rule to the repository's local `info/exclude`, so `git add -A` can never
stage one.

Remove the link when the topic closes or the worktree is torn down: run
`agent-state unlink` in that worktree, or `agent-state prune` from anywhere to
drop links whose target is gone. A link pointing at a deleted worktree is the
same misinformation as a stale WP file.

## WP status

Rewrite the whole `wp-N.md` after each material transition and before handoff:

```text
# WP-3: scroll position preservation
status:      in-progress | done | blocked | needs-restart
owner:       supervisor-1 <agent-id> / implementer <agent-id>
last-good:   work actually finished and verified
next-action: one concrete action a fresh agent can execute
files:       touched paths in the inherited dirty tree
worktree:    absolute path + branch, when this WP owns one
landing:     not-started | prepared base=<sha> | lock-held | landed <sha>
traps:       failed approaches or current blocker
verified:    commands and real output, including counts/status
updated:     <ISO timestamp>
```

Rules:

- Keep `next-action` non-empty while work is in progress.
- Require real output in `verified` before `done`.
- Put a reason in `traps` before `blocked`.
- Move `landing` on every transition, and never call a WP `done` while its
  `landing` says `lock-held`: a lock nobody releases stops every other agent.
- Update on changed code, completed checks, failed attempts that constrain the
  next step, handoff, rotation, or blocker. Do not journal scout chatter.
- Read one WP during routine work; grep all WPs only during a resume sweep.

## Root-owned agent ledger

Persist the brief before spawning. Append a ledger row; never erase history:

```text
| supervisor-1 | WP-1,WP-2 | runtime: codex | role: supervisor |
  requested: gpt-5.6-sol/low | effective: gpt-5.6-sol/low |
  brief: BRIEF_supervisor-1.md | agent: <id> | spawned | last-seen: <ISO> |
```

Use one physical Markdown table row in the real file. Record:

- owned WPs and persisted brief;
- runtime and role/agent type;
- requested model and effort;
- effective model/effort or a known environment override;
- runtime task/agent id, lifecycle state, and last-seen time;
- the worktree path and branch when the agent owns one, so a resume never has
  to guess which tree belongs to which WP.

Lifecycle is `spawned | reported | resumed | rotated | dead`. Append a new row
or transition entry when identity changes. IDs are runtime-local: never pass a
Claude agent id to Codex or a Codex task name to Claude.

## Decisions and progress

Record only decisions whose rejected alternatives matter:

```markdown
## {date}: {short decision title}
- **Context:** {why it arose}
- **Decision:** {what was chosen}
- **Result:** {outcome and what was rejected, with reason}
```

Append; do not rewrite history. Strike a cancelled plan item with its reason.
Use one dated project-log line per shipped milestone. Follow the repository's
own log rules when they are more specific.

## Commits

Normally commit run state with the work it describes. If the owner explicitly
requests a state-only commit, use the runtime-neutral `meta(supervisor):` prefix.
Never commit a `done` status without the corresponding work in that tree.
Commit messages use an English subject and a useful body derived from the
reviewed diff and real checks: why, what, and how verified. Repository rules may
add a stricter prefix or workflow.
