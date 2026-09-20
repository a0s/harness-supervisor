import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readlinkSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { repo, run, cleanup, root, tool } from './helpers.mjs'

test('repeated install preserves CLAUDE.md; relocation is explicit and diagnosed', () => {
  const target = repo()
  try {
    writeFileSync(join(target, 'CLAUDE.md'), 'owner instructions\n')
    const link = join(root, 'link.sh')
    assert.equal(run(link, [target]).status, 0)
    assert.equal(run(link, [target]).status, 0)
    assert.equal(readFileSync(join(target, 'CLAUDE.md'), 'utf8'), 'owner instructions\n')
    const installed = join(target, '.agents', 'bin', 'agent-task')
    unlinkSync(installed)
    symlinkSync('/old/harness-supervisor/harness/bin/agent-task', installed)
    const before = JSON.parse(run(tool('agent-doctor'), [target, '--json']).stdout)
    assert.equal(before.links.find(item => item.path === installed).state, 'broken')
    assert.notEqual(run(link, [target]).status, 0)
    assert.equal(run(link, ['--relink-from', '/old/harness-supervisor', target]).status, 0)
    assert.equal(readlinkSync(installed), join(root, 'harness', 'bin', 'agent-task'))
    const after = JSON.parse(run(tool('agent-doctor'), [target, '--json']).stdout)
    assert.equal(after.links.find(item => item.path === installed).state, 'ok')
    assert.equal(after.instructions.claude, true)
    const overridden = JSON.parse(run(tool('agent-doctor'), [target, '--json'], undefined,
      { CLAUDE_CODE_SUBAGENT_MODEL: 'haiku', CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH: '1' }).stdout)
    assert.match(overridden.overrides.conflicts.join(' '), /overrides role model routing/)
    assert.equal(overridden.capability.claudeNestedDelegation, 'disabled by depth setting')
  } finally { cleanup(target) }
})
