#!/bin/sh
set -eu

usage() {
  printf 'Usage: %s [--relink-from /old/harness/checkout] /absolute/path/to/repository\n' "$0" >&2
  exit 64
}

old_root=
if [ "${1:-}" = '--relink-from' ]; then
  [ "$#" -eq 3 ] || usage
  old_root=$2
  shift 2
  case "$old_root" in /*) ;; *) usage ;; esac
fi
[ "$#" -eq 1 ] || usage

case "$1" in
  /*) target_repo=$1 ;;
  *) printf 'Target repository path must be absolute: %s\n' "$1" >&2; exit 64 ;;
esac

[ -d "$target_repo" ] || {
  printf 'Target repository does not exist: %s\n' "$target_repo" >&2
  exit 66
}

script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
harness_dir=$script_dir/harness
skill_source=$harness_dir/.agents/skills/supervisor
claude_source=$harness_dir/.claude/agents
lease_source=$harness_dir/bin/agent-lease
merge_lock_source=$harness_dir/bin/agent-merge-lock
state_source=$harness_dir/bin/agent-state
task_source=$harness_dir/bin/agent-task
verify_source=$harness_dir/bin/agent-verify
doctor_source=$harness_dir/bin/agent-doctor

[ -f "$skill_source/SKILL.md" ] || {
  printf 'Harness skill is missing: %s\n' "$skill_source/SKILL.md" >&2
  exit 66
}

for tool_path in "$lease_source" "$merge_lock_source" "$state_source" "$task_source" "$verify_source" "$doctor_source"; do
  [ -x "$tool_path" ] || {
    printf 'Harness tool is missing or not executable: %s\n' "$tool_path" >&2
    exit 66
  }
done

check_target() {
  source_path=$1
  target_path=$2

  if [ -L "$target_path" ]; then
    current_source=$(readlink "$target_path")
    if [ "$current_source" = "$source_path" ]; then
      return 0
    fi
    if [ -n "$old_root" ]; then
      old_source=$old_root/${source_path#"$script_dir"/}
      if [ "$current_source" = "$old_source" ]; then
        return 0
      fi
    fi
    printf 'Refusing to replace foreign symlink: %s -> %s\n' "$target_path" "$current_source" >&2
    exit 73
  fi

  if [ -e "$target_path" ]; then
    printf 'Refusing to overwrite existing path: %s\n' "$target_path" >&2
    exit 73
  fi
}

ensure_link() {
  source_path=$1
  target_path=$2

  if [ -L "$target_path" ]; then
    [ "$(readlink "$target_path")" = "$source_path" ] && return 0
    rm "$target_path"
  fi
  ln -s "$source_path" "$target_path"
}

mkdir -p \
  "$target_repo/.agents/bin" \
  "$target_repo/.agents/skills" \
  "$target_repo/.agents/state" \
  "$target_repo/.claude/agents" \
  "$target_repo/.claude/skills"

for source_path in "$claude_source"/supervisor-*.md; do
  [ -f "$source_path" ] || {
    printf 'No Claude supervisor definitions found in %s\n' "$claude_source" >&2
    exit 66
  }
done

check_target "$skill_source" "$target_repo/.agents/skills/supervisor"
check_target "$skill_source" "$target_repo/.claude/skills/supervisor"
check_target "$lease_source" "$target_repo/.agents/bin/agent-lease"
check_target "$merge_lock_source" "$target_repo/.agents/bin/agent-merge-lock"
check_target "$state_source" "$target_repo/.agents/bin/agent-state"
check_target "$task_source" "$target_repo/.agents/bin/agent-task"
check_target "$verify_source" "$target_repo/.agents/bin/agent-verify"
check_target "$doctor_source" "$target_repo/.agents/bin/agent-doctor"
for source_path in "$claude_source"/supervisor-*.md; do
  check_target "$source_path" "$target_repo/.claude/agents/$(basename "$source_path")"
done

ensure_link "$skill_source" "$target_repo/.agents/skills/supervisor"
ensure_link "$skill_source" "$target_repo/.claude/skills/supervisor"
ensure_link "$lease_source" "$target_repo/.agents/bin/agent-lease"
ensure_link "$merge_lock_source" "$target_repo/.agents/bin/agent-merge-lock"
ensure_link "$state_source" "$target_repo/.agents/bin/agent-state"
ensure_link "$task_source" "$target_repo/.agents/bin/agent-task"
ensure_link "$verify_source" "$target_repo/.agents/bin/agent-verify"
ensure_link "$doctor_source" "$target_repo/.agents/bin/agent-doctor"
for source_path in "$claude_source"/supervisor-*.md; do
  ensure_link "$source_path" "$target_repo/.claude/agents/$(basename "$source_path")"
done

printf 'Supervisor harness linked into %s\n' "$target_repo"
printf 'Merge %s into the repository AGENTS.md if not already present.\n' "$harness_dir/AGENTS.supervisor.md"
printf 'For Claude Code, confirm instruction loading in a fresh session; merge or reference the same rules in CLAUDE.md if needed.\n'
