#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const args = new Set(process.argv.slice(2))
const supported = new Set([
  '--all',
  '--backend',
  '--frontend',
  '--harness',
  '--dry-run',
  '--help',
])

for (const argument of args) {
  if (!supported.has(argument)) {
    process.stderr.write(`Unknown option: ${argument}\nUse --help for usage.\n`)
    process.exit(2)
  }
}

if (args.has('--help')) {
  process.stdout.write(`Usage: node verify.mjs [options]

Options:
  --all       Run all repository checks
  --backend   Run the backend typecheck
  --frontend  Run the frontend production build
  --harness   Run Codex harness hook tests
  --dry-run   Show changed files and selected checks without running them
  --help      Show this help
`)
  process.exit(0)
}

function capture(command, commandArgs, cwd) {
  const result = spawnSync(command, commandArgs, {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
  })

  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `${command} exited with ${result.status}`)
  }

  return result.stdout
}

function repositoryRoot() {
  try {
    return capture('git', ['rev-parse', '--show-toplevel'], process.cwd()).trim()
  } catch (error) {
    process.stderr.write(`Unable to locate Git repository: ${error.message}\n`)
    process.exit(2)
  }
}

function lines(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function changedFiles(root) {
  const commands = [
    ['diff', '--name-only'],
    ['diff', '--cached', '--name-only'],
    ['ls-files', '--others', '--exclude-standard'],
  ]
  const files = new Set()

  for (const commandArgs of commands) {
    for (const file of lines(capture('git', commandArgs, root))) {
      files.add(file.replaceAll('\\', '/'))
    }
  }

  return [...files].sort()
}

function selectedAreas(files) {
  const rootDependencyChange = files.some((file) =>
    ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'].includes(file),
  )

  return {
    backend:
      args.has('--all') ||
      args.has('--backend') ||
      rootDependencyChange ||
      files.some((file) => file.startsWith('apps/backend/')),
    frontend:
      args.has('--all') ||
      args.has('--frontend') ||
      rootDependencyChange ||
      files.some((file) => file.startsWith('apps/frontend/')),
    harness:
      args.has('--all') ||
      args.has('--harness') ||
      files.some((file) => file.startsWith('tooling/codex-marketplace/')),
  }
}

function runCheck(check, root) {
  process.stdout.write(`\n[RUN] ${check.label}\n`)
  const result = spawnSync(check.command, check.args, {
    cwd: root,
    stdio: 'inherit',
    windowsHide: true,
  })

  if (result.error) {
    process.stderr.write(`[FAIL] ${check.label}: ${result.error.message}\n`)
    return false
  }

  if (result.status !== 0) {
    process.stderr.write(`[FAIL] ${check.label}: exit ${result.status}\n`)
    return false
  }

  process.stdout.write(`[PASS] ${check.label}\n`)
  return true
}

const root = repositoryRoot()
const files = changedFiles(root)
const areas = selectedAreas(files)
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const pluginRoot = path.resolve(scriptDirectory, '..', '..', '..')

function pnpmCheck(label, pnpmArgs) {
  if (process.platform !== 'win32') {
    return {
      label,
      command: 'pnpm',
      args: pnpmArgs,
      display: `pnpm ${pnpmArgs.join(' ')}`,
    }
  }

  return {
    label,
    command: process.env.ComSpec || 'cmd.exe',
    args: ['/d', '/s', '/c', `pnpm.cmd ${pnpmArgs.join(' ')}`],
    display: `pnpm.cmd ${pnpmArgs.join(' ')}`,
  }
}

const checks = []
if (areas.backend) {
  checks.push(
    pnpmCheck('Backend typecheck', ['--filter', 'backend', 'typecheck']),
  )
}
if (areas.frontend) {
  checks.push(pnpmCheck('Frontend production build', ['build:frontend']))
}
if (areas.harness) {
  checks.push({
    label: 'Codex harness hook tests',
    command: process.execPath,
    args: [path.join(pluginRoot, 'scripts', 'tests', 'hooks.test.mjs')],
    display: `${process.execPath} ${path.join(pluginRoot, 'scripts', 'tests', 'hooks.test.mjs')}`,
  })
}

process.stdout.write(`Repository: ${root}\n`)
process.stdout.write(`Changed files: ${files.length}\n`)
for (const file of files) process.stdout.write(`  - ${file}\n`)

if (checks.length === 0) {
  process.stdout.write('Selected checks: none\n')
  process.exit(0)
}

process.stdout.write('Selected checks:\n')
for (const check of checks) {
  process.stdout.write(`  - ${check.display}\n`)
}

if (args.has('--dry-run')) process.exit(0)

let passed = true
for (const check of checks) passed = runCheck(check, root) && passed
process.exit(passed ? 0 : 1)
