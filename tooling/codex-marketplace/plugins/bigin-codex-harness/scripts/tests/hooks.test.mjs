import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const pluginRoot = path.resolve(testDirectory, '..', '..')
const rootResult = spawnSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
  windowsHide: true,
})
assert.equal(rootResult.status, 0, rootResult.stderr)
const repositoryRoot = rootResult.stdout.trim()
const guardScript = path.join(pluginRoot, 'scripts', 'pre-tool-guard.mjs')
const sessionScript = path.join(pluginRoot, 'scripts', 'session-start.mjs')

function invoke(script, payload) {
  const result = spawnSync(process.execPath, [script], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    input: JSON.stringify(payload),
  })

  assert.equal(result.status, 0, result.stderr)
  return result.stdout ? JSON.parse(result.stdout) : null
}

function bash(command) {
  return {
    cwd: repositoryRoot,
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command },
  }
}

function write(filePath) {
  return {
    cwd: repositoryRoot,
    hook_event_name: 'PreToolUse',
    tool_name: 'Write',
    tool_input: { file_path: filePath },
  }
}

test('blocks destructive git commands', () => {
  const reset = invoke(guardScript, bash('git reset --hard HEAD~1'))
  const forcePush = invoke(guardScript, bash('git push origin main --force'))
  const removeGit = invoke(guardScript, bash('Remove-Item -Recurse -Force .git'))

  assert.equal(reset.hookSpecificOutput.permissionDecision, 'deny')
  assert.equal(forcePush.hookSpecificOutput.permissionDecision, 'deny')
  assert.equal(removeGit.hookSpecificOutput.permissionDecision, 'deny')
})

test('requests confirmation for force-with-lease', () => {
  const output = invoke(guardScript, bash('git push origin feature --force-with-lease'))
  assert.equal(output.hookSpecificOutput.permissionDecision, 'ask')
})

test('does not block safe commands or text searches', () => {
  assert.equal(invoke(guardScript, bash('git status --short')), null)
  assert.equal(invoke(guardScript, bash('rg "git reset --hard" docs')), null)
})

test('protects generated code and real environment files', () => {
  const generated = invoke(
    guardScript,
    write('apps/backend/generated/prisma/client.ts'),
  )
  const environment = invoke(guardScript, write('apps/backend/.env.local'))
  const patch = invoke(guardScript, {
    cwd: repositoryRoot,
    hook_event_name: 'PreToolUse',
    tool_name: 'apply_patch',
    tool_input: {
      input: '*** Begin Patch\n*** Update File: apps/backend/.env\n*** End Patch',
    },
  })

  assert.equal(generated.hookSpecificOutput.permissionDecision, 'deny')
  assert.equal(environment.hookSpecificOutput.permissionDecision, 'deny')
  assert.equal(patch.hookSpecificOutput.permissionDecision, 'deny')
  assert.equal(invoke(guardScript, write('apps/backend/.env.example')), null)
})

test('injects context only for the supported repository profile', () => {
  const matched = invoke(sessionScript, {
    cwd: repositoryRoot,
    hook_event_name: 'SessionStart',
  })
  const unmatched = invoke(sessionScript, {
    cwd: os.tmpdir(),
    hook_event_name: 'SessionStart',
  })

  assert.match(
    matched.hookSpecificOutput.additionalContext,
    /routes -> controllers -> services -> repositories -> Prisma/,
  )
  assert.equal(unmatched, null)
})
