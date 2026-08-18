# Supervisor harness

Project skills live in `.agents/skills/<name>/SKILL.md`, shared by Codex and
Claude Code rather than stored as Claude-only skills. Read a matching
`SKILL.md` in full before work it covers; read its `reference/` files only
when the skill routes to them.

- `supervisor` is the repository's single process skill for multi-step work,
  architectural decisions, durable recovery, or genuinely independent
  workstreams: goal check → diagnosis → plan on disk → selective delegation →
  verification.
- Keep concrete run state local to this repository under
  `.agents/state/<topic>/`. The shared harness defines its schema but never
  shares state files between repositories.
- A worktree isolates files, not the machine. Lease every host-global resource a
  command touches — ports, an external application, heavy runner slots — through
  `.agents/bin/agent-lease`, and never hardcode or hand-pick a port. Wire the
  lease into the repository's own commands so the documented invocation is
  already safe to type.
- Merging into the integration branch is queued, not negotiated. Prepare and run
  the checks in your own worktree, then land through
  `.agents/bin/agent-merge-lock land --branch <mine> --base <sha>`, and release
  the lock as soon as the merge is in. After any interruption, run
  `.agents/bin/agent-merge-lock status` before inspecting git.
- Repository-specific product, safety, trace, test, and Git rules belong in the
  repository's own `AGENTS.md` and override the harness.
