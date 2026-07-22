#!/usr/bin/env node

import path from 'node:path'

import { readHookInput } from './repo-profile.mjs'

function respond(permissionDecision, reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision,
        permissionDecisionReason: reason,
      },
    }),
  )
}

function shellCommand(toolInput) {
  if (typeof toolInput?.command === 'string') return toolInput.command
  if (typeof toolInput?.cmd === 'string') return toolInput.cmd
  if (Array.isArray(toolInput?.command)) return toolInput.command.join(' ')
  return ''
}

function gitInvocations(command) {
  return command
    .split(/&&|\|\||[;\r\n]/)
    .map((segment) => segment.trim().replace(/^&\s*/, ''))
    .map((segment) =>
      segment.match(
        /^git(?:\.exe)?(?:\s+-C\s+(?:"[^"]*"|'[^']*'|\S+))?\s+([a-z-]+)\b([\s\S]*)$/i,
      ),
    )
    .filter(Boolean)
    .map((match) => ({ subcommand: match[1].toLowerCase(), args: match[2] }))
}

function guardShell(command) {
  for (const invocation of gitInvocations(command)) {
    const { subcommand, args } = invocation

    if (subcommand === 'commit' && /(?:^|\s)--no-verify(?:\s|$)/i.test(args)) {
      return ['deny', 'Do not bypass repository verification with git commit --no-verify.']
    }

    if (subcommand === 'reset' && /(?:^|\s)--hard(?:\s|$)/i.test(args)) {
      return ['deny', 'git reset --hard can destroy uncommitted work and is blocked by the BigIn harness.']
    }

    if (
      subcommand === 'clean' &&
      /(?:^|\s)(?:--force|-[a-z]*f[a-z]*)(?:\s|$)/i.test(args)
    ) {
      return ['deny', 'Forced git clean can delete untracked work and is blocked by the BigIn harness.']
    }

    if (subcommand === 'push' && /(?:^|\s)--force-with-lease(?:[=\s]|$)/i.test(args)) {
      return ['ask', 'Force-with-lease rewrites remote history. Confirm the target branch and intent.']
    }

    if (
      subcommand === 'push' &&
      /(?:^|\s)(?:--force(?:[=\s]|$)|-f(?:\s|$))/i.test(args)
    ) {
      return ['deny', 'Unrestricted force push is blocked. Use a reviewed alternative when history must change.']
    }
  }

  const destructiveSegments = command
    .split(/&&|\|\||[;\r\n]/)
    .map((segment) => segment.trim())

  if (
    destructiveSegments.some((segment) =>
      /^(?:rm|rmdir|remove-item)\b[\s\S]*(?:[\s'"\\/])\.git(?:[\s'"\\/]|$)/i.test(segment),
    )
  ) {
    return ['deny', 'Deleting repository metadata is blocked by the BigIn harness.']
  }

  return null
}

function candidatePaths(toolInput) {
  const values = []
  for (const key of ['file_path', 'filePath', 'path', 'target_path', 'targetPath']) {
    if (typeof toolInput?.[key] === 'string') values.push(toolInput[key])
  }

  for (const key of ['patch', 'input', 'diff']) {
    const patch = typeof toolInput?.[key] === 'string' ? toolInput[key] : ''
    for (const match of patch.matchAll(/^\*\*\* (?:Add|Update|Delete) File:\s*(.+)$/gm)) {
      values.push(match[1].trim())
    }
  }

  return values
}

function guardPath(filePath) {
  const normalized = filePath.replaceAll('\\', '/').replace(/^['"]|['"]$/g, '')
  const lower = normalized.toLowerCase()
  const basename = path.posix.basename(lower)

  if (
    lower.includes('/apps/backend/generated/') ||
    lower.startsWith('apps/backend/generated/') ||
    lower.includes('/generated/prisma/') ||
    lower.startsWith('generated/prisma/')
  ) {
    return 'Generated Prisma output must be regenerated, not edited by hand.'
  }

  if (/^\.env(?:\.|$)/.test(basename) && !basename.endsWith('.example')) {
    return 'Real environment files may contain secrets. Edit .env.example or request explicit approval.'
  }

  if (lower.includes('/.git/') || lower.startsWith('.git/')) {
    return 'Direct writes inside .git are blocked by the BigIn harness.'
  }

  return null
}

const input = await readHookInput()
const toolName = input.tool_name ?? ''

if (toolName === 'Bash') {
  const decision = guardShell(shellCommand(input.tool_input))
  if (decision) respond(decision[0], decision[1])
} else {
  for (const filePath of candidatePaths(input.tool_input)) {
    const reason = guardPath(filePath)
    if (reason) {
      respond('deny', reason)
      break
    }
  }
}
