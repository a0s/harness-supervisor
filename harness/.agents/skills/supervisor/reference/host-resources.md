# Host resources

Read before running a server, an external application, or a heavy test runner
in work that may execute beside another agent.

This is about resources shared across the whole machine. The one resource shared
inside a single project, its integration branch, which every agent eventually
merges into, is queued rather than leased; `landing.md` covers it.

A worktree isolates files. It does not isolate the machine. TCP ports, a single
external application, a device, a shared database, and CPU are host-global: two
agents on unrelated branches still collide through them. The collision is worse
than a crash, because the usual outcome is silent. A test runner that finds a
development server already listening on the expected port will happily attach to
it and test **another worktree's code**, then report a pass or an impossible
failure that no diff explains.

## The rule

Never hardcode a port and never pick one by hand. Any host-global resource used
by an agent-run command is leased for the lifetime of that command, and the
lease is visible to every other agent on the machine.

Hand-picking is the failure, not the number. Two agents reading the same
instruction file choose the same "free" port, and a note that says *use 5199*
ages into a note that says *anything but 5199*, then into a table of numbers
nobody can verify. The registry replaces the note.

## The mechanism

`agent-lease` (shipped at `harness/bin/agent-lease`, installed as
`.agents/bin/agent-lease`) leases a resource, runs one command, and releases on
exit, including on a signal or a crash.

```sh
agent-lease port --env PLAYWRIGHT_PORT -- npx playwright test
agent-lease hold rhino -- npm run parity
agent-lease hold heavy-tests --slots 2 -- npm run test:unit
agent-lease list
agent-lease reap
```

- `port` finds a port that is both unleased and **actually bindable**, so it
  skips one an unrelated application already holds. It exports the number as
  `AGENT_LEASE_PORT` plus every name given to `--env`.
- `hold NAME` is a mutex over anything that is not a port: one Rhino, one
  device, one shared account. `--slots N` makes it a counting semaphore, which
  is how a machine caps concurrent heavy runners.
- Both are re-entrant within one process tree, so a wrapped script may lease the
  same name again without deadlocking.
- Leases live in `~/.agents/leases`, host-global on purpose, because the
  conflict is host-global. One file per resource, created with `O_EXCL`, so the
  claim is atomic and needs no registry lock.
- A lease whose owner process is gone is reclaimed automatically. A crashed run
  never burns a resource permanently.

The registry layout is the contract, not the implementation. A repository whose
tests must run without the harness installed may vendor its own copy of the
tool; as long as it writes the same lease files, both interoperate.

## Wiring a repository

Put the lease in the **command the repository already documents**, not in the
instructions an agent is asked to remember. `npm test` must be safe to type; a
rule that says "remember to pass a port" will be broken by the next agent, and
by this one after a context rotation.

Three checks for a correctly wired runner:

1. The default invocation leases its own port. No environment variable is
   required for correctness.
2. Reuse of an already-running server is **off**. Silent attachment to a foreign
   server is the exact bug being fixed; a stale server must produce a loud
   error, not a quiet pass.
3. The server is started with an explicit port and a strict-port flag, so it can
   never drift onto a neighbour's number.

## Brief and report

A brief that hands out a fixed port number is a defect. Give the lease command
instead. When a run is blocked waiting for a held resource, say which pid and
which working directory hold it, since `agent-lease list` prints both, rather than
reporting a timeout with no owner.
