# Runtime setup and cheap execution handoff

Run `harness/bin/agent-doctor /absolute/repository/path --json` before first use.
It reports missing, broken, and foreign links; Codex and Claude CLI versions;
`AGENTS.md` and `CLAUDE.md` presence; model overrides; and known delegation
limits. It does not change settings. A present file or CLI does not prove that
an active model loaded it or can delegate.

Install with `./link.sh /absolute/repository/path`; running it twice is safe.
If this harness checkout moved, inspect doctor output, then explicitly run
`./link.sh --relink-from /absolute/old/harness/checkout /absolute/repository/path`.
The old prefix must match every link being replaced; foreign links are refused.
An existing `CLAUDE.md` is left alone. Merge project instructions manually.
In the measured Claude Code 2.1.273 setup, `AGENTS.md` alone was not applied;
an existing `CLAUDE.md` was applied. Confirm instruction loading in the target
runtime before relying on it.

## Handoff

1. In a strong Sol/Opus planning session, resolve architecture decisions and
   write the task JSON. Run `agent-task stamp`, inspect the source and checks,
   then `agent-task ready ...` with a substantive planner assessment. Commit the
   Git backlog and task contract. Record its task ID, backlog Git SHA, and task
   revision in the next session prompt.
2. Start a **new** execution session: `codex -m gpt-5.6-terra -c 'model_reasoning_effort="medium"'` or
   `claude --model sonnet --effort medium`. Ask it to read the ready task and
   execute within its boundaries. A local isolated worktree needs no extra
   supervisor. If parallel packages need a coordinator, use Terra/Sonnet.
   Codex's [configuration reference](https://learn.chatgpt.com/docs/config-file/config-sample)
   names `model_reasoning_effort`; its CLI supports one-run overrides through
   [`-c`](https://learn.chatgpt.com/docs/config-file/config-advanced).
3. Before accepting a result, run the recorded checks on the exact source/base
   with `agent-verify record`. Use a fresh verifier only when the risk gate in
   the skill applies. Land with `agent-merge-lock` and the evidence path.

## Active-session probes

Run these in disposable repositories and keep the transcripts outside the
repository's tracked files.
Do not infer capability from environment variables alone.

| Case | Observation to record |
|---|---|
| Codex and Claude with installed links | Ask each session to name the task contract field and skill path it actually loaded; verify against a harmless unique fixture instruction. |
| Claude with and without an existing `CLAUDE.md` | Record whether `AGENTS.md`, `CLAUDE.md`, or both were applied. Do not overwrite the file. |
| Claude coordinator with Agent available and with spawn depth 1 | Attempt one harmless nested delegation; record tool availability or the exact refusal. Flatten to root on refusal. |
| Codex delegation available and unavailable | Record the tool list and whether the simple mode proceeds without spawning. |
| Claude model/effort environment overrides and `availableModels` | Compare requested and effective model/effort in the transcript; mark the run invalid for the intended mode if routing changed. |

The doctor can identify a depth setting that disables nested delegation, but
model availability, effective model, and instruction loading require these
runtime probes. Unknown stays unknown in the report.
