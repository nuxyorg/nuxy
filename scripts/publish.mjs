#!/usr/bin/env node
/**
 * Publish all public @nuxyorg packages to npm in dependency order.
 *
 * Usage:
 *   node scripts/publish.mjs                    # dry run
 *   node scripts/publish.mjs --publish          # publish at current versions
 *   node scripts/publish.mjs --publish patch    # bump patch + publish
 *   node scripts/publish.mjs --publish minor    # bump minor + publish
 *   node scripts/publish.mjs --publish major    # bump major + publish
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const DRY = !process.argv.includes('--publish')
const BUMP = ['patch', 'minor', 'major'].find((b) => process.argv.includes(b))

// Publish order matters: dependencies must be published before dependents.
// Each package's prepublishOnly handles its own build step.
const PACKAGES = [
  { name: '@nuxyorg/core',          dir: 'packages/core' },
  { name: '@nuxyorg/extension-sdk', dir: 'packages/extension-sdk' },
  { name: '@nuxyorg/ui-default',    dir: 'extensions/ui-default' },
  { name: '@nuxyorg/nxt',           dir: 'packages/nxt' },
  { name: '@nuxyorg/ext-devserver', dir: 'packages/ext-devserver' },
]

function run(cmd, cwd) {
  execSync(cmd, { cwd, stdio: 'inherit' })
}

function log(msg) {
  console.log(`\n\x1b[36m▶ ${msg}\x1b[0m`)
}

function ok(msg) {
  console.log(`\x1b[32m✔ ${msg}\x1b[0m`)
}

function bumpVersion(pkgPath, type) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  const [major, minor, patch] = pkg.version.split('.').map(Number)
  if (type === 'major') pkg.version = `${major + 1}.0.0`
  else if (type === 'minor') pkg.version = `${major}.${minor + 1}.0`
  else pkg.version = `${major}.${minor}.${patch + 1}`
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  return pkg.version
}

if (DRY) {
  console.log('\x1b[33m⚠  Dry run — pass --publish to actually publish\x1b[0m')
}

if (BUMP && !DRY) {
  log(`Bumping ${BUMP} version across all packages`)
  for (const pkg of PACKAGES) {
    const pkgPath = path.join(root, pkg.dir, 'package.json')
    const next = bumpVersion(pkgPath, BUMP)
    console.log(`  ${pkg.name} → ${next}`)
  }
}

for (const pkg of PACKAGES) {
  const cwd = path.join(root, pkg.dir)

  log(`${pkg.name}`)

  const flags = ['--access', 'public', '--no-git-checks']
  if (DRY) flags.push('--dry-run')

  run(`pnpm publish ${flags.join(' ')}`, cwd)

  ok(`${pkg.name} ${DRY ? '(dry run)' : 'published'}`)
}

console.log(`\n\x1b[32m✔ Done${DRY ? ' (dry run — re-run with --publish to publish)' : ''}\x1b[0m`)
