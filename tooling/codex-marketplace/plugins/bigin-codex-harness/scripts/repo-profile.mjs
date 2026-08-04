import fs from 'node:fs'
import path from 'node:path'

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

function dependenciesOf(packageJson) {
  return {
    ...(packageJson?.dependencies ?? {}),
    ...(packageJson?.devDependencies ?? {}),
  }
}

export function findRepositoryRoot(startDirectory) {
  let current = path.resolve(startDirectory || process.cwd())

  while (true) {
    const rootPackage = readJson(path.join(current, 'package.json'))
    const backendPackage = path.join(current, 'apps', 'backend', 'package.json')
    const frontendPackage = path.join(current, 'apps', 'frontend', 'package.json')

    if (rootPackage && fs.existsSync(backendPackage) && fs.existsSync(frontendPackage)) {
      return current
    }

    const parent = path.dirname(current)
    if (parent === current) return null
    current = parent
  }
}

export function detectRepositoryProfile(startDirectory) {
  const root = findRepositoryRoot(startDirectory)
  if (!root) return { matched: false, root: null }

  const rootPackage = readJson(path.join(root, 'package.json'))
  const backendPackage = readJson(path.join(root, 'apps', 'backend', 'package.json'))
  const frontendPackage = readJson(path.join(root, 'apps', 'frontend', 'package.json'))
  const backendDependencies = dependenciesOf(backendPackage)
  const frontendDependencies = dependenciesOf(frontendPackage)

  const matched = Boolean(
    rootPackage?.private &&
      backendDependencies.express &&
      backendDependencies['@prisma/client'] &&
      frontendDependencies.vue &&
      frontendDependencies.vite,
  )

  return {
    matched,
    root,
    packageName: rootPackage?.name ?? null,
    backend: {
      express: backendDependencies.express ?? null,
      prisma: backendDependencies['@prisma/client'] ?? null,
      typecheck: backendPackage?.scripts?.typecheck ?? null,
    },
    frontend: {
      vue: frontendDependencies.vue ?? null,
      vite: frontendDependencies.vite ?? null,
      build: frontendPackage?.scripts?.build ?? null,
    },
  }
}

export function repositoryContext(profile) {
  return [
    `BigIn Vue/Express repository detected at ${profile.root}.`,
    'Use pnpm from the workspace root.',
    'Backend flow: routes -> controllers -> services -> repositories -> Prisma.',
    'Only repositories may call Prisma; new backend files should be TypeScript.',
    'Frontend flow: views orchestrate routes, feature components render UI, services own API calls.',
    'Astryx is design guidance only here; do not add React or @astryxdesign/core to the Vue app.',
    'Available checks: pnpm --filter backend typecheck; pnpm build:frontend.',
    'There is no working lint or test suite. Do not invent pnpm lint or pnpm test.',
    'Do not edit generated Prisma output, real .env files, or the reference boilerplate unless explicitly asked.',
  ].join('\n')
}

export async function readHookInput() {
  let raw = ''
  for await (const chunk of process.stdin) raw += chunk
  if (!raw.trim()) return {}

  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}
