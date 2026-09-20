import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { temp, run, tool, cleanup } from './helpers.mjs'

function owner(dir) {
  const child = spawn(tool('agent-lease'), ['hold', 'race', '--wait', '0', '--', process.execPath, '-e', "process.stdout.write('owned\\n'); setInterval(()=>{},1000)"],
    { env: { ...process.env, AGENT_LEASE_DIR: dir }, stdio: ['ignore', 'pipe', 'pipe'] })
  const ready = new Promise((resolve, reject) => {
    child.stdout.once('data', data => data.toString().includes('owned') ? resolve() : reject(new Error(data.toString())))
    child.once('error', reject)
  })
  return { child, ready }
}
function stop(child) { return new Promise(resolve => { child.once('exit', resolve); child.kill('SIGTERM') }) }

test('two contenders cannot claim during the publication window', async () => {
  const dir = temp()
  const paused = spawn(tool('agent-lease'), ['hold', 'race', '--wait', '0', '--', 'true'],
    { env: { ...process.env, AGENT_LEASE_DIR: dir, AGENT_LEASE_TEST_PAUSE_BEFORE_PUBLISH_MS: '800' }, stdio: 'pipe' })
  let winner
  try {
    for (let i = 0; i < 100 && !readdirSync(dir).some(name => name.startsWith('.pending-')); i++) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    assert.ok(readdirSync(dir).some(name => name.startsWith('.pending-')))
    winner = owner(dir)
    await winner.ready
    const exit = await new Promise(resolve => paused.once('exit', resolve))
    assert.equal(exit, 75)
    assert.ok(JSON.parse(readFileSync(join(dir, 'hold-race--0.json'), 'utf8')).id)
  } finally { if (winner) await stop(winner.child); if (paused.exitCode === null) paused.kill(); cleanup(dir) }
})

test('crash before publication leaves the slot recoverable', async () => {
  const dir = temp()
  const paused = spawn(tool('agent-lease'), ['hold', 'race', '--wait', '0', '--', 'true'],
    { env: { ...process.env, AGENT_LEASE_DIR: dir, AGENT_LEASE_TEST_PAUSE_BEFORE_PUBLISH_MS: '5000' }, stdio: 'pipe' })
  try {
    for (let i = 0; i < 100 && !readdirSync(dir).some(name => name.startsWith('.pending-')); i++) await new Promise(resolve => setTimeout(resolve, 10))
    assert.ok(readdirSync(dir).some(name => name.startsWith('.pending-')))
    await new Promise(resolve => { paused.once('exit', resolve); paused.kill('SIGKILL') })
    assert.equal(run(tool('agent-lease'), ['hold', 'race', '--wait', '0', '--', 'true'], undefined, { AGENT_LEASE_DIR: dir }).status, 0)
  } finally { if (paused.exitCode === null) paused.kill(); cleanup(dir) }
})

test('complete record is published before another contender sees it', async () => {
  const dir = temp(), a = owner(dir)
  try {
    await a.ready
    const file = join(dir, 'hold-race--0.json')
    const record = JSON.parse(readFileSync(file, 'utf8'))
    assert.ok(record.id)
    const b = run(tool('agent-lease'), ['hold', 'race', '--wait', '0', '--', 'true'], undefined, { AGENT_LEASE_DIR: dir })
    assert.equal(b.status, 75)
    assert.equal(JSON.parse(readFileSync(file, 'utf8')).id, record.id)
  } finally { await stop(a.child); cleanup(dir) }
})

test('old owner cannot remove a replacement lease', async () => {
  const dir = temp(), a = owner(dir)
  try {
    await a.ready
    const file = join(dir, 'hold-race--0.json')
    const replacement = { ...JSON.parse(readFileSync(file, 'utf8')), id: 'replacement-owner' }
    writeFileSync(file, JSON.stringify(replacement))
    await stop(a.child)
    assert.equal(JSON.parse(readFileSync(file, 'utf8')).id, replacement.id)
  } finally { if (a.child.exitCode === null) await stop(a.child); cleanup(dir) }
})

test('corrupt lease is preserved; dead owner is recovered', () => {
  const dir = temp()
  try {
    mkdirSync(dir, { recursive: true })
    const file = join(dir, 'hold-race--0.json')
    writeFileSync(file, '{')
    assert.equal(run(tool('agent-lease'), ['hold', 'race', '--wait', '0', '--', 'true'], undefined, { AGENT_LEASE_DIR: dir }).status, 75)
    assert.equal(run(tool('agent-lease'), ['reap'], undefined, { AGENT_LEASE_DIR: dir }).status, 0)
    assert.equal(readFileSync(file, 'utf8'), '{')
    writeFileSync(file, JSON.stringify({ id: 'dead', pid: 99999999, since: new Date().toISOString() }))
    assert.equal(run(tool('agent-lease'), ['hold', 'race', '--wait', '0', '--', 'true'], undefined, { AGENT_LEASE_DIR: dir }).status, 0)
    assert.equal(existsSync(file), false)
  } finally { cleanup(dir) }
})

test('two stale reclaimers do not obtain one slot', async () => {
  const dir = temp()
  try {
    writeFileSync(join(dir, 'hold-race--0.json'), JSON.stringify({ id: 'dead', pid: 99999999, since: new Date().toISOString() }))
    const contenders = [0, 1].map(() => {
      const child = spawn(tool('agent-lease'), ['hold', 'race', '--wait', '0', '--', process.execPath, '-e', "setTimeout(()=>{},300)"],
        { env: { ...process.env, AGENT_LEASE_DIR: dir }, stdio: 'pipe' })
      return new Promise(resolve => child.once('exit', code => resolve(code)))
    })
    const results = await Promise.all(contenders)
    assert.deepEqual(results.sort(), [0, 75])
  } finally { cleanup(dir) }
})
