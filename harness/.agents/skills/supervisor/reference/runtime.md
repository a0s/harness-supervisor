# Runtime adapter — Codex and Claude Code

Read this once when the delegated lane is selected, before spawning anything,
and again when a run resumes under a different harness.

## Detect the runtime

- Claude Code: `$CLAUDECODE` is set, or the harness exposes the `Agent` tool and
  identifies itself as Claude Code.
- Codex: the harness identifies itself as Codex, exposes collaboration tools such
  as `spawn_agent`/`list_agents`, or sets a `$CODEX_*` variable.
- If signals conflict, trust the harness identity shown to the root. Never pass a
  Claude alias to Codex or a GPT model id to Claude Code.

Record the runtime in the topic ledger before the first spawn. A cross-runtime
resume starts fresh agents from files; it never tries to reuse another runtime's
in-memory context.

## Model and effort routing

Effort names are calibrated per model. `medium` on Claude is not a promise of the
same capability or token use as `medium` on GPT. Treat the tables as separate.

### Codex

| Role | Default | Escalate when |
|---|---|---|
| Root | Session model; expected `gpt-5.6-sol` | Root effort is chosen when the session starts; use higher effort for difficult diagnosis/design |
| Supervisor | `gpt-5.6-sol`, `low` | `medium` for ambiguous integration, contradictory evidence, or a failed WP |
| Implementer | `gpt-5.6-terra`, `medium` | `low` only for exact mechanical edits; `high` for high-risk or failed work |
| Verifier/test author | `gpt-5.6-terra`, `high` | A separate verifier already means the risk gate fired; do not lower without eval evidence |
| Scout | `gpt-5.6-luna`, `low` | Escalate only when the task stopped being mechanical |

Pass the full model id and `reasoning_effort` on every spawn. Because model
overrides are incompatible with a full-history fork in Codex, use
`fork_turns: "none"` when the persisted brief is sufficient, or the smallest
positive turn count that contains required user context. Never fork all history
merely for convenience.

Codex escalation changes one variable at a time: first effort, then model tier if
the role itself was underspecified. Repeating the same model, effort, and brief is
not an escalation.

### Claude Code

| Role | Default | Escalate when |
|---|---|---|
| Root | Session model; expected `opus` at `high` | `xhigh` for the hardest architecture, debugging, or long-horizon reasoning; `fable` only by explicit quality-first choice |
| Supervisor | `opus`, `medium` | Use `supervisor-coordinator-high` (`opus`, `high`) for ambiguous integration, contradictory evidence, or a failed WP |
| Implementer | `sonnet`, `medium` | Use `supervisor-implementer-high` (`sonnet`, `high`) for high-risk or failed work |
| Verifier/test author | `sonnet`, `high` | `xhigh` only after a measured miss; the default verifier already receives high effort |
| Scout | `haiku`, no effort field | Haiku 4.5 does not support the current effort control; escalate to Sonnet only if judgment is required |

Claude effort affects thinking, visible output, tool arguments, and how many tool
calls the model makes. Do not map Codex's `Sol low` mechanically to `Opus low`:
a supervisor at Claude `low` can perform a shallower tool sweep. `medium` is the
cost-saving supervisor default; `high` is Claude's normal complex coding default.

Use the installed role definitions under `.claude/agents/`:

| Role | Agent type |
|---|---|
| Supervisor | `supervisor-coordinator` |
| Escalated supervisor | `supervisor-coordinator-high` |
| Implementer | `supervisor-implementer` |
| Escalated implementer | `supervisor-implementer-high` |
| Verifier/test author | `supervisor-verifier` |
| Scout | `supervisor-scout` |

Their frontmatter supplies the intended `model` and `effort`; the task prompt
points at the persisted run brief or WP brief. Do not paste those files into the
prompt. Omit the optional per-invocation Claude `model` argument: it has higher
precedence than the definition and would defeat role routing.

Runtime configuration can silently defeat role routing:

- `CLAUDE_CODE_SUBAGENT_MODEL` overrides the agent definition's model.
- `CLAUDE_CODE_EFFORT_LEVEL` overrides frontmatter effort.
- An organization `availableModels` allowlist may substitute or reject the
  requested family.

At the first delegated spawn, check whether either is set. Do not mutate the
owner's environment. Record the override in the ledger and report it; if it
makes a required quality tier impossible, stop before claiming the intended
configuration ran. The effective Claude effort is exposed as `CLAUDE_EFFORT`
inside tool calls on supported models.

Keep effort constant within one long Claude conversation when prompt caching
matters. Escalate by checkpointing and relaunching the high-effort role variant,
not by changing effort repeatedly mid-context.

## Spawn and control operations

Use behavior, not copied tool names, in plans and briefs. This table is the
runtime translation.

| Operation | Codex | Claude Code |
|---|---|---|
| Spawn | `spawn_agent` with `model`, `reasoning_effort`, minimal `fork_turns` | `Agent` with the named `supervisor-*` `subagent_type`; omit its optional model argument so model/effort come from frontmatter |
| List live agents | `list_agents` | Use `ListAgents` when exposed; otherwise `/agents` is the user-visible source and a recorded id must be probed |
| Message a running agent | `send_message` | `SendMessage` when exposed; if unavailable, do not assume the agent is reachable |
| Continue an idle known agent | `followup_task` | `SendMessage` resumes a stopped subagent when available; otherwise respawn from its checkpoint |
| Stop/rotate | `interrupt_agent` | `TaskStop` for a recorded background task; otherwise use the runtime's agent stop control |
| Wait | `wait_agent` | foreground Agent return, background task/agent panel, or the available task wait/output mechanism |

Claude `TaskList` is a task-list API, not proof that it enumerates every
subagent. Codex task names are not Claude agent ids. Never use one runtime's
liveness assumption in the other.

## Nested delegation capability

Codex supervisors may spawn their own children through the same collaboration
tools when the harness allows it.

Current Claude Code supports nested subagents by default, but the owner can cap
`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`. Before a Claude supervisor delegates,
confirm that `Agent` is present at its depth. If it is missing or spawning fails
because of the depth limit, do not loop on the failure: checkpoint the supervisor,
flatten to root → implementer/verifier, and let root perform integration review.

## Calibration

Defaults are hypotheses until measured on this repo. When usage is exposed,
reports include runtime, role, requested/effective model and effort, input/output
or reasoning tokens, rebriefs, and defects caught after implementation. Compare
the same task class at the current setting and one level lower. Restore the
higher setting when misses or rework erase the saving.
