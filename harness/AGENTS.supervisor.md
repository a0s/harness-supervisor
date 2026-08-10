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
- Repository-specific product, safety, trace, test, and Git rules belong in the
  repository's own `AGENTS.md` and override the harness.
