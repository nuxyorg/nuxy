#!/usr/bin/env node
/**
 * Publish @nuxyorg npm packages in dependency order from the monorepo.
 *
 * Usage:
 *   node scripts/publish-npm.mjs --channel nightly --publish
 *   node scripts/publish-npm.mjs --channel stable --publish
 *   node scripts/publish-npm.mjs --channel stable            # dry run
 *
 * Env:
 *   NODE_AUTH_TOKEN or NPM_TOKEN — npm registry token
 *   GITHUB_RUN_NUMBER — used in nightly version suffix (optional)
 */
import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { NPM_PACKAGES, readNuxyVersions } from './npm-packages.mjs'
import { rewriteDepsInPackage } from './rewrite-workspace-deps.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const args = process.argv.slice(2)
const channel = args.includes('--channel') ? args[args.indexOf('--channel') + 1] : 'stable'
const publish = args.includes('--publish')

if (!['nightly', 'stable'].includes(channel)) {
  console.error('--channel must be "nightly" or "stable"')
  process.exit(1)
}

const token = process.env.NODE_AUTH_TOKEN || process.env.NPM_TOKEN
if (publish && !token) {
  console.error('NODE_AUTH_TOKEN or NPM_TOKEN is required to publish')
  process.exit(1)
}

function run(cmd, cwd) {
  execSync(cmd, {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_AUTH_TOKEN: token,
    },
  })
}

function readPackageJson(cwd) {
  return JSON.parse(readFileSync(path.join(cwd, 'package.json'), 'utf8'))
}

const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
const runNumber = process.env.GITHUB_RUN_NUMBER ?? '0'
const distTag = channel === 'nightly' ? 'nightly' : 'latest'
const baseVersions = readNuxyVersions()
const publishedVersions = {}

console.log(
  `\n${publish ? 'Publishing' : 'Dry run'} @nuxyorg packages (${channel}, tag: ${distTag})\n`
)

for (const pkg of NPM_PACKAGES) {
  const cwd = path.join(root, pkg.dir)
  const pkgPath = path.join(cwd, 'package.json')
  const originalPkg = readFileSync(pkgPath, 'utf8')
  const manifest = readPackageJson(cwd)
  const baseVersion = manifest.version
  const publishVersion =
    channel === 'nightly' ? `${baseVersion}-nightly.${date}.${runNumber}` : baseVersion

  console.log(`▶ ${pkg.dir} @ ${publishVersion}`)

  try {
    const pkgObj = JSON.parse(originalPkg)
    pkgObj.version = publishVersion
    rewriteDepsInPackage(pkgObj, { ...baseVersions, ...publishedVersions }, { channel })
    writeFileSync(pkgPath, JSON.stringify(pkgObj, null, 2) + '\n')

    const flags = ['--access', 'public', '--no-git-checks', '--tag', distTag]
    if (!publish) flags.push('--dry-run')
    run(`pnpm publish ${flags.join(' ')}`, cwd)
    publishedVersions[manifest.name] = publishVersion
    console.log(`✔ ${pkg.dir}`)
  } finally {
    writeFileSync(pkgPath, originalPkg)
  }
}

console.log(`\n✔ Done${publish ? '' : ' (dry run — pass --publish to publish)'}\n`)
