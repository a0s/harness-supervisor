# Failure modes

Read before the first supervisor brief for unfamiliar delegated work, or after
a run fails. Apply the matching fix; do not turn every historical failure into
an unconditional agent or ceremony.

## Planning and evidence

| Symptom | Cause | Fix |
|---|---|---|
| Plausible code solves the wrong problem | Diagnosis or design was delegated | Root owns cause and decisions; scouts return facts only |
| Supervisor reports success but behavior is broken | It reviewed summaries, not artifacts | Read the diff and real output; compare behavior to the WP |
| Tests mirror implementation and miss the defect | No independent observable-behavior check | Fire the verifier gate and brief a fresh black-box verifier |
| Ordinary work pays for two full implementations | Test author split by title, not risk | Implementer writes focused tests; separate verifier only when the risk gate fires |
| Scope creep | Brief omitted frozen boundaries | Add per-WP allowed files and **Do NOT** fences |
| Agents conflict | Parallel topics touch the same files | Sequence by file ownership, not topic name |
| Done without runnable evidence | Missing runner treated as success | Use `blocked`; name the unavailable check and normal remedy tried |
| Rebriefs repeat without convergence | Same scope/model/effort/brief repeated | After two misses, split or block; escalate one variable with a reason |
| Supervisor context fills with logs | Mechanical searches ran at supervisor rates | Assign bounded grep/count/output extraction to a scout |

## Runtime and routing

| Symptom | Cause | Fix |
|---|---|---|
| Codex worker receives Claude alias, or vice versa | Runtime tables were translated by analogy | Detect runtime and use only its exact role map |
| Codex model override fails or carries huge context | Spawn used full-history fork | Use `fork_turns: "none"` or the smallest positive fork with explicit model/effort |
| Claude role silently runs a different tier | Environment, per-invocation model, or organization allowlist overrides frontmatter | Omit invocation model; record requested/effective values; report other overrides; stop if they invalidate the quality gate |
| Claude supervisor stops searching too early | `low` effort was copied from Sol without calibration | Default Claude supervisor to Opus `medium`; raise to its high role after ambiguity or failure |
| Scout spawn rejects effort | Haiku role was given a control it does not support | Omit effort in `supervisor-scout`; use Sonnet when judgment is required |
| Claude supervisor cannot spawn children | Nested `Agent` absent or depth capped | Check once, checkpoint, flatten to root → workers |
| Resume duplicates agents | Claude task list or stale ids were treated as liveness proof | Use runtime liveness controls; if absent, checkpoint tree then mark unreachable |
| Cross-runtime resume sends to old id | Agent identity assumed portable | Recreate agents from files under the current runtime |

## State and continuity

| Symptom | Cause | Fix |
|---|---|---|
| Work disappears after a limit | State existed only in conversation | Persist exact brief and rewrite WP after material transitions |
| Concurrent journal writes collide | Multiple writers share one status file | One WP, one file, one owner |
| Journaling burns context | Whole run history is reread for each update | Read/rewrite one WP; grep only during resume sweep |
| Bare "continue" gets a clarification question | Unfinished state was ignored | Sweep `.agents/state/` first |
| Restored supervisor starts fresh WPs | Children were not restored downward | Restore what you spawned before spawning new work |
| Finished work is redone | Resume starts from plan, not WP truth | Read WP first; freeze `done`; use `next-action` |
| One of several topics is dropped | Resume stops at first match | Sweep and resolve every unfinished WP/ledger owner |
| Late report drifts from tree | Agent ran beyond healthy context | Checkpoint, verify, stop, relaunch near 45% |
| Relaunched agent starts from zero | Old agent stopped before usable checkpoint | Status first; stop second |
| Stale topic resurrects shipped work | Finished scaffolding was kept | Move durable residue to project log and delete finished topic |
| Settled choice is relitigated | Rejected option and reason were not recorded | Append a decision record |

## Host resources

| Symptom | Cause | Fix |
|---|---|---|
| Tests pass or fail against code the branch does not contain | Runner reused a development server another worktree had already started | Lease the port and turn server reuse off; see `host-resources.md` |
| Parallel agents fail on a port that was free a moment ago | Port picked by hand from an instruction file every agent reads | `agent-lease port --env <VAR> -- <command>` |
| Instructions accumulate "use port X, but not Y" notes | Port ownership tracked in prose instead of a registry | Replace the note with the lease; `agent-lease list` is the record |
| Runs against one external application interleave and wedge it | A host-global singleton was treated as per-worktree | `agent-lease hold <name> -- <command>` |
| Unrelated heavy tests time out under parallel load | Too many concurrent runners for the machine | `agent-lease hold <name> --slots N` as a semaphore |
| A crashed run makes a resource unusable until reboot | Ownership recorded without liveness | Leases carry a pid; dead owners are reclaimed, `agent-lease reap` forces it |
