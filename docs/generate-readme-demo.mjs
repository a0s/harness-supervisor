#!/usr/bin/env node
/**
 * Documentation-only asset generator.
 *
 * Requires librsvg (`rsvg-convert`) and ImageMagick (`magick`).
 * It writes docs/supervisor-demo.gif.
 * Run: ./docs/generate-readme-demo.mjs
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const docs = dirname(fileURLToPath(import.meta.url))
const output = join(docs, 'supervisor-demo.gif')
const [checkOnly] = process.argv.slice(2)

if (checkOnly && checkOnly !== '--check') {
  console.error('usage: generate-readme-demo.mjs [--check]')
  process.exit(64)
}

function check() {
  if (!existsSync(output) || readFileSync(output).subarray(0, 6).toString() !== 'GIF89a') {
    throw Error(`missing or invalid GIF: ${output}`)
  }
  const frames = Number(execFileSync('magick', ['identify', '-format', '%n\\n', output], { encoding: 'utf8' }).trim().split(/\s+/)[0])
  if (frames < 12) throw Error(`expected at least 12 frames, found ${frames}`)
  console.log(`ok: ${output} (${frames} frames)`)
}

if (checkOnly) {
  check()
  process.exit(0)
}

// A classic 4:3 terminal canvas. At the chosen monospace size the layout reads
// like a roughly 120 × 50-cell terminal, split into work and live-tree panes.
const width = 1200
const height = 900
// Keep this to the SVG generic family: ImageMagick resolves it on macOS and Linux.
const mono = 'monospace'
const stages = [
  {
    command: 'agent-task ready docs/tasks/feature.json',
    lines: [
      ['muted', 'Preparing a supervised run…'],
      ['blue', '  ✓ task contract loaded  ·  T1 / revision 6a2f'],
      ['prompt', '  starting supervisor']
    ],
    agents: [['session', 'supervisor', 'running']],
    meter: 8,
    label: 'planning'
  },
  {
    command: 'agent-supervisor run T1',
    lines: [
      ['blue', '  ✓ task T1 is ready  ·  checks are settled'],
      ['muted', '  creating isolated worktree  feature/T1'],
      ['green', '  ✓ worktree ready'],
      ['prompt', '  delegating independent work…']
    ],
    agents: [['session', 'supervisor', 'running']],
    meter: 17,
    label: 'delegating'
  },
  {
    command: 'agent-supervisor run T1',
    lines: [
      ['blue', '  ✓ task T1 is ready  ·  checks are settled'],
      ['muted', '  creating isolated worktree  feature/T1'],
      ['green', '  ✓ worktree ready'],
      ['purple', '  ↳ planner: mapping interfaces and risks'],
      ['prompt', '  supervisor is coordinating']
    ],
    agents: [['session', 'supervisor', 'running'], ['child', 'planner', 'running']],
    meter: 25,
    label: 'delegating'
  },
  {
    command: 'agent-supervisor run T1',
    lines: [
      ['blue', '  ✓ task T1 is ready  ·  checks are settled'],
      ['purple', '  ↳ planner: interface map ready'],
      ['cyan', '  ↳ implementer: changing state renderer'],
      ['prompt', '  2 agents working in parallel']
    ],
    agents: [['session', 'supervisor', 'running'], ['child', 'planner', 'running'], ['child', 'implementer', 'running']],
    meter: 36,
    label: 'working'
  },
  {
    command: 'agent-supervisor run T1',
    lines: [
      ['purple', '  ✓ planner: interface map ready'],
      ['cyan', '  ↳ implementer: rendering live agent state'],
      ['yellow', '  ↳ verifier: preparing isolated checks'],
      ['prompt', '  3 agents working in parallel']
    ],
    agents: [['session', 'supervisor', 'running'], ['child', 'planner', 'stopped'], ['child', 'implementer', 'running'], ['child', 'verifier', 'running']],
    meter: 49,
    label: 'working'
  },
  {
    command: 'agent-supervisor run T1',
    lines: [
      ['purple', '  ✓ planner: interface map ready'],
      ['cyan', '  ↳ implementer: 3 files changed'],
      ['yellow', '  ↳ verifier: npm test'],
      ['muted', '    … agent-tree shows active children'],
      ['prompt', '  gathering evidence']
    ],
    agents: [['session', 'supervisor', 'running'], ['child', 'planner', 'stopped'], ['child', 'implementer', 'running'], ['child', 'verifier', 'running'], ['grandchild', 'test-runner', 'running']],
    meter: 63,
    label: 'verifying'
  },
  {
    command: 'agent-supervisor run T1',
    lines: [
      ['purple', '  ✓ planner: interface map ready'],
      ['green', '  ✓ implementer: patch prepared'],
      ['yellow', '  ↳ verifier: npm test  18 passed'],
      ['muted', '    recording evidence against 6a2f…'],
      ['prompt', '  waiting for verification']
    ],
    agents: [['session', 'supervisor', 'running'], ['child', 'planner', 'stopped'], ['child', 'implementer', 'stopped'], ['child', 'verifier', 'running'], ['grandchild', 'test-runner', 'stopped']],
    meter: 76,
    label: 'verifying'
  },
  {
    command: 'agent-supervisor run T1',
    lines: [
      ['green', '  ✓ implementer: patch prepared'],
      ['green', '  ✓ verifier: 18 checks passed'],
      ['green', '  ✓ evidence recorded  ·  exact source + base'],
      ['blue', '  → acquiring integration lock…'],
      ['prompt', '  ready to land']
    ],
    agents: [['session', 'supervisor', 'running'], ['child', 'planner', 'stopped'], ['child', 'implementer', 'stopped'], ['child', 'verifier', 'stopped'], ['grandchild', 'test-runner', 'stopped']],
    meter: 89,
    label: 'landing'
  },
  {
    command: 'agent-supervisor run T1',
    lines: [
      ['green', '  ✓ verifier: 18 checks passed'],
      ['green', '  ✓ evidence recorded  ·  exact source + base'],
      ['green', '  ✓ landed T1  →  main @ 9bc1'],
      ['muted', '  run state saved for the next session'],
      ['prompt', '  done']
    ],
    agents: [['session', 'supervisor', 'stopped'], ['child', 'planner', 'stopped'], ['child', 'implementer', 'stopped'], ['child', 'verifier', 'stopped'], ['grandchild', 'test-runner', 'stopped']],
    meter: 100,
    label: 'landed'
  }
]

const color = {
  muted: '#8b949e', blue: '#58a6ff', green: '#3fb950', purple: '#d2a8ff', cyan: '#79c0ff', yellow: '#e3b341', prompt: '#c9d1d9'
}

const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const text = (x, y, value, fill, size = 16, weight = 400) =>
  `<text x="${x}" y="${y}" fill="${fill}" font-family="${mono}" font-size="${size}" font-weight="${weight}">${escape(value)}</text>`

function treeRow(x, y, prefix, name, state, depth) {
  const running = state === 'running'
  const dot = running ? '#3fb950' : '#6e7681'
  const tone = running ? '#c9d1d9' : '#8b949e'
  const stateTone = running ? '#3fb950' : '#8b949e'
  return [
    text(x + depth * 18, y, prefix, '#6e7681', 14),
    `<circle cx="${x + depth * 18 + 56}" cy="${y - 5}" r="4" fill="${dot}"/>`,
    text(x + depth * 18 + 68, y, `codex  ${name}`, tone, 14),
    text(1055, y, `[${state}]`, stateTone, 13)
  ].join('')
}

function frame(stage, index) {
  const cursor = index % 2 ? '▋' : ' '
  const command = index === 0 ? stage.command.slice(0, 19) : stage.command
  const log = stage.lines.map(([kind, value], line) => text(64, 222 + line * 35, value, color[kind], 15)).join('')
  const tree = stage.agents.map(([kind, name, state], row) => {
    const prefix = kind === 'session' ? '└─' : kind === 'child' ? '├─' : '└─'
    const depth = kind === 'grandchild' ? 1 : 0
    return treeRow(762, 213 + row * 39, prefix, name, state, depth)
  }).join('')
  const meterWidth = Math.round(536 * stage.meter / 100)
  const time = `00:${String(Math.min(index * 2, 18)).padStart(2, '0')}`
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="glow" x1="0" x2="1"><stop stop-color="#1f6feb"/><stop offset="1" stop-color="#8957e5"/></linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#0d1117" flood-opacity=".26"/></filter>
  </defs>
  <rect width="1200" height="700" fill="#f6f8fa"/>
  <rect x="28" y="26" width="1144" height="848" rx="16" fill="#0d1117" filter="url(#shadow)"/>
  <rect x="28" y="26" width="1144" height="54" rx="16" fill="#161b22"/>
  <path d="M28 64h1144v16H28z" fill="#161b22"/>
  <circle cx="57" cy="53" r="6" fill="#ff7b72"/><circle cx="79" cy="53" r="6" fill="#e3b341"/><circle cx="101" cy="53" r="6" fill="#3fb950"/>
  <rect x="154" y="38" width="330" height="28" rx="7" fill="#0d1117"/>
  ${text(174, 57, 'harness-supervisor  ·  live run', '#c9d1d9', 13)}
  <rect x="1018" y="40" width="118" height="24" rx="12" fill="#173c2b"/>
  ${text(1034, 57, stage.label.toUpperCase(), '#3fb950', 11, 700)}
  <rect x="48" y="100" width="662" height="748" rx="10" fill="#0d1117" stroke="#30363d"/>
  <rect x="730" y="100" width="422" height="748" rx="10" fill="#161b22" stroke="#30363d"/>
  <rect x="48" y="100" width="662" height="48" rx="10" fill="#161b22"/>
  <path d="M48 138h662v10H48z" fill="#161b22"/>
  ${text(68, 130, 'SUPERVISOR', '#8b949e', 12, 700)}
  ${text(590, 130, time, '#8b949e', 12)}
  <rect x="730" y="100" width="422" height="48" rx="10" fill="#1c2128"/>
  <path d="M730 138h422v10H730z" fill="#1c2128"/>
  ${text(750, 130, 'AGENT TREE', '#8b949e', 12, 700)}
  ${text(1036, 130, '2s refresh', '#8b949e', 12)}
  ${text(64, 183, '$', '#3fb950', 16, 700)}
  ${text(84, 183, command + cursor, '#f0f6fc', 16)}
  ${log}
  <rect x="64" y="760" width="536" height="8" rx="4" fill="#21262d"/>
  <rect x="64" y="760" width="${meterWidth}" height="8" rx="4" fill="url(#glow)"/>
  ${text(64, 800, `run T1  ·  ${stage.meter}%  ·  ${stage.agents.filter(([, , state]) => state === 'running').length} active`, '#8b949e', 13)}
  ${text(752, 174, '/worktrees/feature-T1', '#8b949e', 13)}
  ${tree}
  <rect x="752" y="774" width="378" height="1" fill="#30363d"/>
  ${text(752, 806, 'state: shared across worktrees', '#8b949e', 13)}
</svg>`
}

const temp = mkdtempSync(join(tmpdir(), 'supervisor-demo-'))
try {
  const framePaths = []
  for (let index = 0; index < stages.length; index += 1) {
    for (let repeat = 0; repeat < 2; repeat += 1) {
      const path = join(temp, `frame-${String(framePaths.length).padStart(2, '0')}.svg`)
      writeFileSync(path, frame(stages[index], index + repeat))
      const png = path.replace(/\.svg$/, '.png')
      execFileSync('rsvg-convert', ['--width', String(width), '--height', String(height), '--output', png, path], { stdio: 'inherit' })
      framePaths.push(png)
    }
  }
  execFileSync('magick', [...framePaths, '-resize', '1200x900', '-layers', 'Optimize', '-delay', '14', '-loop', '0', output], { stdio: 'inherit' })
  check()
} finally {
  rmSync(temp, { recursive: true, force: true })
}
