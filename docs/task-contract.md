# Task contract v2

The planner writes a JSON task before starting a cheap execution session. The
same file is used by Codex and Claude Code. `id` and `planRevision` tie a run to
the durable backlog; `revision` is a SHA-256 digest of all task content except
the digest and `plannerReview`. Any edit invalidates approval.

Required fields are demonstrated by [bug.json](tasks/bug.json),
[feature.json](tasks/feature.json), and [research.json](tasks/research.json).
Use `none` for a genuinely empty interface or dependency. Every numbered,
observable criterion names at least one check. A diagnosed bug needs `cause`;
new work and research need facts or hypotheses, but no invented defect cause.

```sh
./harness/bin/agent-task stamp docs/tasks/bug.json
./harness/bin/agent-task validate docs/tasks/bug.json
./harness/bin/agent-task ready docs/tasks/bug.json planner 'The checks observe the stated behavior and the interfaces are settled.'
```

`stamp` creates a draft and clears old review. Before `ready`, the planner must
inspect the facts against source, resolve every architecture decision, judge
whether the behavior is observable and the checks independent, and write a
substantive assessment. The validator checks structure, references, open
decisions and revision freshness. It cannot judge whether an acceptance check
is strong enough. The execution agent may edit a task only by returning it to
draft for a new planner review. A run records the exact `id`, `planRevision`,
and `revision` in local state; evidence for one revision cannot verify another.
