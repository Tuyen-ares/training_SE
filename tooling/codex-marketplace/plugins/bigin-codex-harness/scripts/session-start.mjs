#!/usr/bin/env node

import {
  detectRepositoryProfile,
  readHookInput,
  repositoryContext,
} from './repo-profile.mjs'

const input = await readHookInput()
const profile = detectRepositoryProfile(input.cwd ?? process.cwd())

if (profile.matched) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: repositoryContext(profile),
      },
    }),
  )
}
