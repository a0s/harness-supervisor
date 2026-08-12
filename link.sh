#!/bin/sh
set -eu

usage() {
  printf 'Usage: %s /absolute/path/to/repository\n' "$0" >&2
  exit 64
}

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

[ -f "$skill_source/SKILL.md" ] || {
  printf 'Harness skill is missing: %s\n' "$skill_source/SKILL.md" >&2
  exit 66
}

check_target() {
  source_path=$1
  target_path=$2

  if [ -L "$target_path" ]; then
    current_source=$(readlink "$target_path")
    if [ "$current_source" = "$source_path" ]; then
      return 0
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

  [ -L "$target_path" ] && return 0
  ln -s "$source_path" "$target_path"
}

mkdir -p \
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
for source_path in "$claude_source"/supervisor-*.md; do
  check_target "$source_path" "$target_repo/.claude/agents/$(basename "$source_path")"
done

ensure_link "$skill_source" "$target_repo/.agents/skills/supervisor"
ensure_link "$skill_source" "$target_repo/.claude/skills/supervisor"
for source_path in "$claude_source"/supervisor-*.md; do
  ensure_link "$source_path" "$target_repo/.claude/agents/$(basename "$source_path")"
done

printf 'Supervisor harness linked into %s\n' "$target_repo"
printf 'Merge %s into the repository AGENTS.md if not already present.\n' "$harness_dir/AGENTS.supervisor.md"
