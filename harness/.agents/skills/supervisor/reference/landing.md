# Landing work on the integration branch

Read before merging anything into the branch other agents also merge into,
whether the repository calls it `master`, `main` or something else, and
again on any resume that happens while a landing is in flight.

Parallel agents in separate worktrees are cheap and safe right up to the last
step. Then all of them want the same branch. What follows is not a merge-conflict
problem; it is a turn-taking problem, and agents are unusually bad at it: each
one either waits out of politeness for a signal that never comes, or merges into
a checkout another session is actively editing. Both outcomes look like a stall
to the owner, who then has to arbitrate by hand.

`agent-merge-lock` (shipped at `harness/bin/agent-merge-lock`, installed as
`.agents/bin/agent-merge-lock`) is the turn-taking mechanism. It is not
`agent-lease`: a lease lives exactly as long as the command it wraps, while
landing work spans many separate tool calls with model thinking in between and
must survive the session being killed part-way through.

## The rule

Every merge into the integration branch happens while holding that project's
merge lock, and the slow half of the work happens **before** the lock is taken.

## Two halves, and only the second one is locked

The lock is short on purpose. Everything expensive, meaning merging the current
integration tip into the feature branch, resolving conflicts, running the full
suite, happens in the agent's own worktree while no lock is held, so agents do
that concurrently instead of queueing for it. Only the last few seconds are
exclusive.

```text
outside the lock, in my own worktree:
    git merge master            # bring the integration tip in
    resolve conflicts, run the required checks
    git diff --name-only master...HEAD | grep '^\.agents/state/'   # must print NOTHING
    git rev-parse master        # remember this as the base

under the lock, seconds:
    agent-merge-lock land --branch <mine> --base <that sha>
```

The `.agents/state/` check is there because it has already gone wrong once: a
worktree had committed its own topic directory, and landing that branch carried
run state into the integration branch through an ordinary merge — past the rule
that says the main checkout holds only `agent-state` symlinks, with nobody doing
anything wrong. Git cannot see the harness's rule, so the repository has to
gitignore `.agents/state/` and the landing has to look. If the grep prints
anything, take those files out of the branch first: a plan that must outlive the
run belongs to the project trace or is handed to the next worktree by hand
(`reference/state-layout.md`, "Three lifetimes").

`land` takes the lock, refuses if the integration branch moved past `--base`,
refuses if the tip was never merged into the branch (that means the tested tree
is not the tree that would land), merges `--no-ff`, and releases. A landing that
cannot proceed gives the lock back by default, because whatever needs fixing is
fixed outside the lock and a queue waiting on that fix is exactly the failure
being prevented.

## The commands

```sh
agent-merge-lock status                     # first command after any interruption
agent-merge-lock acquire --wait 540         # take a turn, or exit 75 keeping the queue place
agent-merge-lock land --branch NAME --base SHA [--verify CMD]
agent-merge-lock release                    # always, when done or when giving up
agent-merge-lock queue                      # who holds it, who is waiting
```

Each command ends with one machine-readable line out of `ACQUIRED`, `WAITING`,
`STALE`, `NOT_PREPARED`, `CONFLICT`, `BLOCKED`, `LANDED` and `RELEASED`, and exits
with a code that says the same thing: `0` done, `75` still waiting (call again),
`65` real work is needed (moved tip, conflict, failed check), `66` blocked by
another session's uncommitted files, `69` not the owner.

Waiting is normal and is not a failure. A single `acquire` call waits up to 540
seconds so it fits inside one tool-call timeout, then exits `75` with the queue
place preserved on disk; call it again, or run it with `--wait 0` in the
background to wait indefinitely. The queue is first-come-first-served, so a
waiting agent cannot be starved by luckier ones.

## Ownership is a worktree, not a process

This is what makes the mechanism survive a session limit. The lock file names
the worktree that holds it, so when a killed session is restarted with
`continue`, the very first command answers the only question that matters:

| `status` says | What it means | What to do |
|---|---|---|
| `HELD_BY_ME` | The lock survived the interruption and is still this worktree's | Check whether the merge already happened (`git log <target>`), then finish it or `release` |
| `HELD_BY_OTHER` | Somebody else is landing now | `acquire` again and wait; do not touch the integration branch |
| `QUEUED` | The place in line survived, the lock is free | `acquire`, the turn is available |
| `FREE` | Nothing was in flight | Start the normal two-half sequence |

Never begin a resume by inspecting git; begin it with `status`. A lock held by
this worktree and a lock held by a neighbour look identical in `git log`.

## A dead owner does not stop the queue

The lock carries an expiry, one hour by default, pushed back by every command
its owner runs. An owner that goes silent past it is taken over by the next
agent in line, which prints the takeover and records it in `history.log` beside
the lock. So a session killed by a limit and never resumed costs the queue one
hour, not an afternoon; `renew --ttl` extends a deliberately long hold, and
`break --reason TEXT` takes a lock away on purpose.

A held lock is a promise to come back. Release it as soon as the merge is in,
and release it rather than holding it across a long fix.

## When the integration branch is checked out elsewhere

Usually the integration branch is checked out in the main working copy, which
often belongs to a different session with uncommitted work in it, the ordinary
state of a machine running several agents. `land` merges there anyway and lets
git make the safety call: if the incoming merge would touch files that session
has uncommitted, git refuses and changes nothing, and the run reports `BLOCKED`
with the file names and the checkout path. If there is no overlap, the merge
lands and that session's own uncommitted files are left exactly as they were.

When nobody has the integration branch checked out, `land` creates a private
worktree for the merge and removes it afterwards. No agent ever needs to check
out the integration branch by hand to land work.

## In briefs and reports

Give the brief the landing sequence, not a branch name and a hope. A report says
which state word the landing ended on, and a blocked landing names the holder or
the checkout that stands in the way, since `queue` prints both, instead of saying a
merge "was not possible".

Repositories with a different integration branch pass `--into NAME`, and the
lock files live inside that project's own shared git directory, so two projects
on one machine never queue behind each other.
