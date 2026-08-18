# harness-supervisor

A reusable supervision process for Codex and Claude Code. The repository keeps
one canonical skill, runtime-specific role routing, durable recovery state, and
Claude subagent definitions without sharing a consumer repository's live state
or settings.

## How projects link to the harness

![Project A and Project B symlink their shared supervisor entries to the
harness-supervisor checkout, while each project keeps its own state and
settings](docs/link-layout.svg)

The arrows are the installed symlinks. Claude definitions map one-to-one by
basename. Entries without arrows remain owned by each consumer repository.

## How agents form a task tree

![A root agent delegates two independent work packages through a supervisor,
with an optional scout and an implementer-to-verifier sequence in each
supervisor-owned lane](docs/agent-tree.svg)

This example shows a delegated high-risk task with two independent work
packages. Only the active runtime's row is used. The scout is optional, and the
verifiers appear because the independent-verifier risk gate fired.

The installer links only immutable shared assets. The canonical supervisor
skill is linked into both `.agents/skills/supervisor` for Codex and
`.claude/skills/supervisor` for Claude Code, where it is available as the
`/supervisor` skill. It creates `.agents/state/` as a real local directory in
every consumer. It does not link or modify the consumer's `AGENTS.md`,
`WORKLOG.md`, `.claude/settings.json`, or any run-state file.

## Install in a repository

```sh
./link.sh /absolute/path/to/repository
```

The command is idempotent for links already owned by this checkout and refuses
to overwrite a real file, directory, or foreign link. For a repository that
already contains copied supervisor assets, review them, remove only those exact
copies, and run the installer again.

Merge the relevant text from `harness/AGENTS.supervisor.md` into the consumer's
own `AGENTS.md`; keep all project-specific rules beside it. Claude settings
remain local because hooks and permissions vary by repository.

The links are absolute so every consumer can live anywhere. If this checkout is
moved, rerun `link.sh` from its new location after removing the old broken
supervisor links.

## What is universal

- goal anchoring, diagnosis before planning, and root-owned design decisions;
- root-only versus delegated lane gates;
- local `.agents/state/<topic>/` plans, WP checkpoints, ledgers, and recovery;
- narrow briefs, file ownership, diff review, and evidence-based verification;
- exact current Codex and Claude model/effort routing;
- context rotation and cross-runtime recovery;
- isolated worktrees, English commits, and evidence-bearing commit bodies;
- leasing the host-global resources a worktree cannot isolate;
- taking turns on the integration branch so every agent's work actually lands.

## Host resources

A worktree isolates files, not the machine. Ports, a single external
application, and CPU stay shared, so two agents on unrelated branches still
collide through them — most often silently, when a test runner attaches to a
development server another worktree had already started and reports a result
about the wrong code.

`harness/bin/agent-lease` is installed as `.agents/bin/agent-lease` and hands
those resources out one owner at a time:

```sh
agent-lease port --env PLAYWRIGHT_PORT -- npx playwright test
agent-lease hold rhino -- npm run parity
agent-lease list
```

It leases, runs one command, and releases on exit or crash. Leases are files in
`~/.agents/leases`, created with `O_EXCL` so a claim is atomic, and each carries
its owner's pid so a dead run never burns a resource. The registry layout is the
contract: a repository that must run its tests without the harness installed may
vendor an equivalent tool and still interoperate. `reference/host-resources.md`
holds the rule and the wiring checklist.

## Landing on the integration branch

Parallel agents are cheap and safe until the last step, when all of them want to
merge into the same branch. Then they stall: each waits for a turn nobody hands
out, or merges into a working copy another session is still editing, and the
owner ends up arbitrating by hand.

`harness/bin/agent-merge-lock` is installed as `.agents/bin/agent-merge-lock` and
makes that a queue:

```sh
git merge master && npm test          # prepare and check outside the lock
agent-merge-lock land --branch mine --base "$(git rev-parse master)"
agent-merge-lock status               # first command after any interruption
agent-merge-lock queue                # who holds it, who is waiting
```

What makes it survive an agent's real life:

- **The lock is short.** Merging the tip in, resolving conflicts and running the
  suite all happen in the agent's own worktree with no lock held; only the merge
  itself is exclusive, so agents queue for seconds rather than for a test run.
- **A worktree owns the lock, not a process.** When a session dies to a usage
  limit mid-landing and comes back with `continue`, `status` answers the only
  question that matters — `HELD_BY_ME`, `HELD_BY_OTHER`, `QUEUED` or `FREE` — and
  a lock taken before the interruption is still there.
- **Waiting is a normal answer.** One `acquire` waits up to 540 seconds so it
  fits in a tool-call timeout, then exits 75 with the queue place kept on disk;
  `--wait 0` waits indefinitely in the background. The queue is
  first-come-first-served, so nobody is starved.
- **A dead owner does not freeze the queue.** The lock expires (an hour by
  default, pushed back by every command its owner runs) and the next agent takes
  it over, printing the takeover and recording it in `history.log`.
- **Nothing lands untested or unnoticed.** `land` refuses a tip that moved past
  `--base` and a branch that never merged that tip, and every unsuccessful
  landing hands the lock straight back, because the fix belongs outside it.
- **Somebody else's uncommitted work is safe.** The integration branch is usually
  checked out in a working copy another session is editing; `land` merges there
  and lets git make the call, so an overlap is refused without changing a file
  and no overlap lands cleanly. With the branch checked out nowhere, it merges in
  a private worktree it removes afterwards.

Lock files live inside the project's own shared git directory, so two projects on
one machine never queue behind each other and no `git add -A` can sweep them up.
`reference/landing.md` holds the sequence, the state words and the resume table.

Consumer repositories still define their product boundaries, trace file,
available test layers, branch names, merge-request policy, and any stricter
safety rules.
