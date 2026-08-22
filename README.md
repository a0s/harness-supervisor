# harness-supervisor

A reusable supervision process for Codex and Claude Code: one canonical skill,
runtime-specific role routing, durable recovery state, and Claude subagent
definitions, shared by every project without sharing any project's live state or
settings.

In practice: `link.sh` installs it into a repository as symlinks, `/supervisor`
runs it, and the sections below are the mechanisms that keep several agents
from tripping over each other on one machine.

## What it gives you

- goal anchoring, diagnosis before planning, root-owned design decisions;
- root-only versus delegated lane gates;
- worktree-local `.agents/state/<topic>/` plans, WP checkpoints, ledgers, and recovery;
- narrow briefs, file ownership, diff review, evidence-based verification;
- exact current Codex and Claude model/effort routing;
- context rotation and cross-runtime recovery;
- isolated worktrees, English commits, evidence-bearing commit bodies;
- leases for the host-global resources a worktree cannot isolate;
- a queue for the integration branch, so every agent's work actually lands;
- one directory where the owner sees what every agent is doing;
- one rule for waiting, so an agent cannot bill a poll loop for doing nothing.

Each consumer repository still defines its own product boundaries, trace file,
test layers, branch names, merge-request policy, and any stricter safety rules.

## Install in a repository

```sh
./link.sh /absolute/path/to/repository
```

Then merge `harness/AGENTS.supervisor.md` into that repository's own `AGENTS.md`
and keep its project-specific rules beside it. Claude settings stay local,
because hooks and permissions vary by repository.

The command is idempotent for links this checkout already owns and refuses to
overwrite a real file, directory, or foreign link. If a repository already has
copied supervisor assets, review them, remove those exact copies, and run the
installer again.

Links are absolute, so a consumer can live anywhere. If this checkout moves,
remove the old broken links and rerun `link.sh` from the new location.

## How to use it

Open the repository in Claude Code or Codex and give the skill a task:

```
/supervisor The CSV export times out on accounts with more than 50k rows.
Fix it, and migrate the two remaining date pickers to the new component.
```

What happens after Enter:

1. The agent states in one line whether the task serves the project goal, then
   diagnoses before planning: it reads the source and names each cause with
   `file:line`. If a real decision branches the work, it asks once and
   recommends an option. Everything else it decides and states.
2. It picks the cheapest safe lane. Work stays in the root context only when it
   is safe in the local integration checkout. Any implementation that needs
   isolation creates a dedicated worktree and a supervisor to own it, even when
   it is one sequential work package.
3. In each delegated worktree it writes `.agents/state/<topic>/TODO.md`, then
   publishes that directory into the main checkout as a symlink. The timeout
   fix and picker migration share no files, so each can run in its own worktree;
   a small change safe in the integration checkout needs no agent or topic.
4. While delegated work runs, test servers take their ports through `agent-lease`, and
   each worktree publishes its state into the main checkout. `agent-state
   list` shows every topic, its progress, and anything blocked, on one screen.
5. Finished work queues on `agent-merge-lock` and lands on the integration
   branch one merge at a time, verified against real command output before it
   goes in.

If the session dies part-way, open a new one and ask it to continue. The plan,
the work-package state, a place in the merge queue, and even a held merge lock
are all on disk, and the resume sweep starts from them.

## How projects link to the harness

![Project A and Project B symlink their shared supervisor entries to the
harness-supervisor checkout, while each project keeps its own state and
settings](docs/link-layout.svg)

The arrows are the installed symlinks, Claude definitions map one-to-one by
basename, and entries without arrows stay owned by the consumer. Only immutable
shared assets are linked. The canonical skill lands in
`.agents/skills/supervisor` for Codex and `.claude/skills/supervisor` for Claude
Code, where it is available as `/supervisor`. `.agents/state/` is created as a
real local directory, and `AGENTS.md`, `WORKLOG.md`, `.claude/settings.json` and
every run-state file are left alone.

## How agents form a task tree

![A root agent delegates two independent work packages through a supervisor,
with an optional scout and an implementer-to-verifier sequence in each
supervisor-owned lane](docs/agent-tree.svg)

A delegated high-risk task with two independent work packages. Only the active
runtime's row is used. The scout is optional, and the verifiers are there
because the independent-verifier risk gate fired.

## Host resources

![Two agents that hard-code port 5199 collide on one machine and one of them
tests the other's server, while agent-lease gives each agent its own leased
port from a host-global registry](docs/host-resources.svg)

A worktree isolates files, not the machine. Ports, a single external
application, and CPU stay shared, so two agents on unrelated branches still
collide through them. The usual outcome is silent: a test runner attaches to a
development server another worktree had already started, and reports a result
about the wrong code.

`harness/bin/agent-lease`, installed as `.agents/bin/agent-lease`, hands those
resources out one owner at a time:

```sh
agent-lease port --env PLAYWRIGHT_PORT -- npx playwright test
agent-lease hold rhino -- npm run parity
agent-lease list
```

It leases, runs one command, and releases on exit or crash. Leases are files in
`~/.agents/leases`, created with `O_EXCL` so a claim is atomic, and each carries
its owner's pid so a dead run never burns a resource. The registry layout is the
contract, so a repository that must run its tests without the harness installed
can vendor an equivalent tool and still interoperate.
`reference/host-resources.md` has the rule and the wiring checklist.

## Landing on the integration branch

![Three agents prepare their merges concurrently with no lock held, then take
the merge lock one at a time for a few seconds each; a resumed session asks
status and gets one of four state words](docs/landing.svg)

Parallel agents are cheap and safe until the last step, when all of them want to
merge into the same branch. Then they stall: each waits for a turn nobody hands
out, or merges into a working copy another session is still editing, and the
owner ends up arbitrating by hand.

`harness/bin/agent-merge-lock`, installed as `.agents/bin/agent-merge-lock`,
makes that a queue:

```sh
git merge master && npm test          # prepare and check outside the lock
agent-merge-lock land --branch mine --base "$(git rev-parse master)"
agent-merge-lock status               # first command after any interruption
agent-merge-lock queue                # who holds it, who is waiting
```

What makes it survive an agent's real life:

- The lock is short. Merging the tip in, resolving conflicts, and running the
  suite all happen in the agent's own worktree with no lock held. Only the merge
  itself is exclusive, so agents queue for seconds instead of for a test run.
- A worktree owns the lock, not a process. When a session dies to a usage limit
  mid-landing and comes back with `continue`, a lock taken before the
  interruption is still there, and `status` says which of `HELD_BY_ME`,
  `HELD_BY_OTHER`, `QUEUED` or `FREE` the agent is looking at.
- Waiting is a normal answer. One `acquire` waits up to 540 seconds so it fits
  in a tool-call timeout, then exits 75 with the queue place kept on disk, and
  `--wait 0` waits indefinitely in the background. The queue is
  first-come-first-served, so nobody is starved.
- A dead owner does not freeze the queue. The lock expires after an hour by
  default, every command its owner runs pushes that back, and the next agent
  takes it over, printing the takeover and recording it in `history.log`.
- Nothing lands untested or unnoticed. `land` refuses a tip that moved past
  `--base` and a branch that never merged that tip, and every failed landing
  hands the lock straight back, because the fix belongs outside it.
- Somebody else's uncommitted work is safe. The integration branch is usually
  checked out in a working copy another session is editing. `land` merges there
  and lets git make the call, so an overlap is refused without changing a file
  and no overlap lands cleanly. With the branch checked out nowhere, it merges
  in a private worktree and removes it afterwards.

Lock files live inside the project's own shared git directory, so two projects on
one machine never queue behind each other and no `git add -A` can sweep them up.
`reference/landing.md` has the sequence, the state words, and the resume table.

## Watching every agent from one directory

![The main checkout's state directory holds one symlink per worktree topic, each
named topic-at-worktree and pointing at the real directory inside the worktree
that owns it, next to the one-screen summary agent-state list prints](docs/state-visibility.svg)

Run state belongs beside the work it describes, so an agent in its own worktree
writes `.agents/state/<topic>/` inside that worktree. That is right for recovery
and useless for the person supervising: with five agents running, the owner has
to walk five directories to learn what is in flight and how much is left.

`harness/bin/agent-state`, installed as `.agents/bin/agent-state`, publishes each
worktree's topics into the main checkout as symlinks the moment they exist:

```sh
agent-state link          # inside a worktree, after creating .agents/state/<topic>/
agent-state list          # every topic in the project, in one screen
agent-state handover <topic> <worktree>   # give it to the worktree taking over
agent-state unlink        # when the topic closes or the worktree is torn down
agent-state prune         # drop links whose worktree is gone
```

- A link named `<topic>@<worktree>` points at the real directory, never at a
  copy, so opening it from the main checkout puts the owner inside the agent's
  own files, always current, with no second version to drift.
- The links stay out of git history. Real topics never contain `@`, so one rule
  in the repository's local `info/exclude` covers every link and no
  `git add -A` can stage one.
- The state itself stays untracked too. Run state is scaffolding, not history:
  the repository gitignores `.agents/state/`, because a tracked topic directory
  rides an ordinary merge onto the integration branch and lands there
  unnoticed, past the rule that the main checkout holds only links. Every
  command says so when it finds tracked state, and the landing sequence checks
  before merging.
- A handover moves state in one step. Git is not a backup once state is
  unversioned, so a plan that outlives one run (a roadmap worked one block per
  worktree) moves with `handover`: the directory, the new link and the old link
  together, in a command that either does all three or changes nothing, instead
  of three things to remember while tearing a worktree down. `unlink` warns
  when the topic it is dropping carries a `ROADMAP.md`.
- `list` reads every worktree, not just the published ones, so a topic an
  interrupted agent never linked still shows up, marked as not linked. Each row
  carries work-package counts, whatever is blocked, an in-flight
  landing, and how long ago it moved.
- Inherited copies stay quiet. A worktree branched from a repository that tracked
  its state before the rule above carries every committed topic, and `link` and
  `list` skip the ones this worktree has not touched, so only real work shows.

The links are part of the process itself: the skill
publishes state when a worktree topic is created, `agent-state list` opens the
resume sweep, and unlinking belongs to tearing a worktree down, because a link
into a deleted worktree is the same misinformation as a stale plan.
