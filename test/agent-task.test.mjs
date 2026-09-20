import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { temp, run, tool, cleanup, root } from './helpers.mjs'

test('task revision, approval, and open decision gate', () => {
  const dir = temp(), file = join(dir, 'task.json')
  try {
    const example = JSON.parse(readFileSync(join(root, 'docs', 'tasks', 'feature.json')))
    writeFileSync(file, JSON.stringify(example))
    assert.equal(run(tool('agent-task'), ['validate', file]).status, 0)
    assert.equal(run(tool('agent-task'), ['ready', file, 'planner', 'Criterion has an observable check']).status, 0)
    assert.equal(run(tool('agent-task'), ['validate', file]).status, 0)
    const changed = JSON.parse(readFileSync(file))
    changed.behavior = 'A different behavior'
    writeFileSync(file, JSON.stringify(changed))
    assert.notEqual(run(tool('agent-task'), ['validate', file]).status, 0)
    assert.equal(run(tool('agent-task'), ['stamp', file]).status, 0)
    const draft = JSON.parse(readFileSync(file))
    draft.decisions = [{ id: 'architecture', status: 'open', summary: 'Choose a schema' }]
    writeFileSync(file, JSON.stringify(draft))
    assert.equal(run(tool('agent-task'), ['stamp', file]).status, 0)
    assert.notEqual(run(tool('agent-task'), ['ready', file, 'planner', 'Looks okay']).status, 0)
  } finally { cleanup(dir) }
})
