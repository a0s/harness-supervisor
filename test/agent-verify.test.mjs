import test from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { repo, worktree, run, tool, cleanup } from './helpers.mjs'

function fixture() {
  const main = repo(), feature = worktree(main, 'feature')
  writeFileSync(join(feature, 'change.txt'), 'checked change\n')
  run('git', ['add', '.'], feature)
  run('git', ['commit', '-m', 'change'], feature)
  const record = run(tool('agent-verify'), ['record', '--base', 'main', '--task-id', 'T1', '--task-revision', 'r1', '--check', 'test -f change.txt'], feature)
  assert.equal(record.status, 0, record.stderr)
  const evidence = /evidence=(\S+)/.exec(record.stdout)?.[1]
  assert.ok(evidence)
  return { main, feature, evidence }
}

test('evidence becomes stale when source or task revision changes', () => {
  const f = fixture()
  try {
    assert.equal(run(tool('agent-verify'), ['check', '--base', 'main', '--evidence', f.evidence, '--task-revision', 'r1'], f.feature).status, 0)
    assert.notEqual(run(tool('agent-verify'), ['check', '--base', 'main', '--evidence', f.evidence, '--task-revision', 'r2'], f.feature).status, 0)
    writeFileSync(join(f.feature, 'change.txt'), 'new revision\n')
    run('git', ['commit', '-am', 'change again'], f.feature)
    assert.notEqual(run(tool('agent-verify'), ['check', '--base', 'main', '--evidence', f.evidence], f.feature).status, 0)
    assert.notEqual(run(tool('agent-merge-lock'), ['land', '--branch', 'feature', '--into', 'main', '--evidence', f.evidence, '--task-id', 'T1', '--task-revision', 'r1'], f.feature).status, 0)
  } finally { cleanup(f.feature, f.main) }
})

test('verified branch lands; moved base is rejected', () => {
  const f = fixture()
  try {
    const base = run('git', ['rev-parse', 'main'], f.feature).stdout.trim()
    const landed = run(tool('agent-merge-lock'), ['land', '--branch', 'feature', '--into', 'main', '--base', base, '--evidence', f.evidence, '--task-id', 'T1', '--task-revision', 'r1'], f.feature)
    assert.equal(landed.status, 0, landed.stderr + landed.stdout)
  } finally { cleanup(f.feature, f.main) }
  const g = fixture()
  try {
    writeFileSync(join(g.main, 'base.txt'), 'moved\n')
    run('git', ['add', '.'], g.main)
    run('git', ['commit', '-m', 'base moved'], g.main)
    assert.notEqual(run(tool('agent-merge-lock'), ['land', '--branch', 'feature', '--into', 'main', '--evidence', g.evidence, '--task-id', 'T1', '--task-revision', 'r1'], g.feature).status, 0)
  } finally { cleanup(g.feature, g.main) }
})

test('failed checks and a different task ID never count as verification', () => {
  const f = fixture()
  try {
    const failed = run(tool('agent-verify'), ['record', '--base', 'main', '--task-id', 'T1', '--task-revision', 'r1', '--check', 'false'], f.feature)
    assert.notEqual(failed.status, 0)
    const badEvidence = /evidence=(\S+)/.exec(failed.stdout)?.[1]
    assert.ok(badEvidence)
    assert.notEqual(run(tool('agent-verify'), ['check', '--base', 'main', '--evidence', badEvidence], f.feature).status, 0)
    assert.notEqual(run(tool('agent-merge-lock'), ['land', '--branch', 'feature', '--into', 'main', '--evidence', f.evidence, '--task-id', 'another-task', '--task-revision', 'r1'], f.feature).status, 0)
  } finally { cleanup(f.feature, f.main) }
})

test('unchanged checks reuse evidence unless a new reason is recorded', () => {
  const f = fixture()
  try {
    const args = ['record', '--base', 'main', '--task-id', 'T1', '--task-revision', 'r1', '--check', 'test -f change.txt']
    const reused = run(tool('agent-verify'), args, f.feature)
    assert.match(reused.stdout, /^REUSED evidence=/)
    assert.match(reused.stdout, new RegExp(f.evidence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    const rerun = run(tool('agent-verify'), [...args, '--reason', 'Investigating a flaky failure'], f.feature)
    assert.match(rerun.stdout, /^VERIFIED evidence=/)
  } finally { cleanup(f.feature, f.main) }
})
