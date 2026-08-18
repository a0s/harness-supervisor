# harness-supervisor

A reusable supervision process for Codex and Claude Code: one canonical skill,
runtime-specific role routing, durable recovery state, and Claude subagent
definitions, shared by every project without sharing any project's live state or
settings.

## What it gives you

- goal anchoring, diagnosis before planning, root-owned design decisions;
- root-only versus delegated lane gates;
- local `.agents/state/<topic>/` plans, WP checkpoints, ledgers, and recovery;
- narrow briefs, file ownership, diff review, evidence-based verification;
- exact current Codex and Claude model/effort routing;
- context rotation and cross-runtime recovery;
- isolated worktrees, English commits, evidence-bearing commit bodies;
- leases for the host-global resources a worktree cannot isolate;
- a queue for the integration branch, so every agent's work actually lands.

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
