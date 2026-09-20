import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { repo, worktree, run, tool, cleanup } from './helpers.mjs'

function fixture() {
  const main = repo(), source = worktree(main, 'source'), dest = worktree(main, 'dest')
  const topic = join(source, '.agents', 'state', 'topic')
  mkdirSync(topic, { recursive: true })
  writeFileSync(join(topic, 'wp-1.md'), 'status: blocked\ntraps: waiting for input\n')
  assert.equal(run(tool('agent-state'), ['link', '--topic', 'topic'], source).status, 0)
  return { main, source, dest, topic }
}

for (const step of ['mark', 'copy', 'publish', 'link', 'unlink', 'remove']) {
  test(`handover resumes after ${step}`, () => {
    const f = fixture()
    try {
      const args = ['handover', 'topic', f.dest]
      assert.notEqual(run(tool('agent-state'), args, f.main, { AGENT_STATE_FAIL_AFTER: step }).status, 0)
      const resumed = run(tool('agent-state'), args, f.main)
      assert.equal(resumed.status, 0, resumed.stderr + resumed.stdout)
      assert.equal(readFileSync(join(f.dest, '.agents', 'state', 'topic', 'wp-1.md'), 'utf8').includes('blocked'), true)
      assert.equal(existsSync(f.topic), false)
      const link = join(f.main, '.agents', 'state', `topic@${f.dest.split('/').at(-1)}`)
      assert.equal(realpathSync(link), realpathSync(join(f.dest, '.agents', 'state', 'topic')))
      assert.equal(run(tool('agent-state'), args, f.main).status, 0)
    } finally { cleanup(f.source, f.dest, f.main) }
  })
}

test('handover rejects traversal, escaping state root, and foreign destination', () => {
  const f = fixture()
  try {
    for (const bad of ['..', 'a/b', '../outside']) {
      assert.notEqual(run(tool('agent-state'), ['handover', bad, f.dest], f.main).status, 0)
      assert.notEqual(run(tool('agent-state'), ['handover', 'topic', f.dest, '--rename', bad], f.main).status, 0)
    }
    const target = join(f.dest, '.agents', 'state', 'topic')
    mkdirSync(target, { recursive: true })
    writeFileSync(join(target, 'foreign'), 'keep')
    assert.notEqual(run(tool('agent-state'), ['handover', 'topic', f.dest], f.main).status, 0)
    assert.equal(readFileSync(join(target, 'foreign'), 'utf8'), 'keep')
    cleanup(target)
    symlinkSync(f.main, target)
    assert.notEqual(run(tool('agent-state'), ['handover', 'topic', f.dest], f.main).status, 0)
    cleanup(target)
    const newLink = join(f.main, '.agents', 'state', `topic@${f.dest.split('/').at(-1)}`)
    symlinkSync(f.main, newLink)
    assert.notEqual(run(tool('agent-state'), ['handover', 'topic', f.dest], f.main).status, 0)
    cleanup(newLink)
    cleanup(join(f.dest, '.agents', 'state'))
    symlinkSync(f.main, join(f.dest, '.agents', 'state'))
    assert.notEqual(run(tool('agent-state'), ['handover', 'topic', f.dest], f.main).status, 0)
    assert.equal(existsSync(f.topic), true)
  } finally { cleanup(f.source, f.dest, f.main) }
})

test('recovery list exposes legacy blocked work and its reason', () => {
  const f = fixture()
  try {
    const listed = run(tool('agent-state'), ['list', '--json'], f.main)
    assert.equal(listed.status, 0, listed.stderr)
    const topic = JSON.parse(listed.stdout).topics.find(item => item.topic === 'topic')
    assert.equal(topic.counts.blocked, 1)
    assert.equal(topic.blockers[0].reason, 'waiting for input')
  } finally { cleanup(f.source, f.dest, f.main) }
})
