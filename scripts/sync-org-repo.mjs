#!/usr/bin/env node
/**
 * Sync a monorepo subtree to an org GitHub repo.
 * Rewrites workspace:* deps in package.json on the split branch before push.
 *
 * Usage: node scripts/sync-org-repo.mjs <prefix> <org/repo>
 * Env:   NUXYORG_SYNC_TOKEN (required)
 */
import { execSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { readNuxyVersions } from './npm-packages.mjs'
import { rewriteDepsInPackage } from './rewrite-workspace-deps.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const prefix = process.argv[2]
const repo = process.argv[3]
const token = process.env.NUXYORG_SYNC_TOKEN

if (!prefix || !repo) {
  console.error('Usage: node scripts/sync-org-repo.mjs <prefix> <org/repo>')
  process.exit(1)
}

if (!token) {
  console.error('NUXYORG_SYNC_TOKEN is required')
  process.exit(1)
}

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', cwd: root, ...opts })
}

function runCapture(cmd) {
  return execSync(cmd, { cwd: root, encoding: 'utf8' }).trim()
}

console.log(`\n▶ Sync ${prefix} → ${repo}`)

const status = runCapture(
  `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer ${token}" https://api.github.com/repos/${repo}`
)

if (status === '404') {
  const repoName = repo.split('/')[1]
  const response = runCapture(
    `curl -s -w "\\n%{http_code}" -X POST -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" https://api.github.com/orgs/nuxyorg/repos -d "{\\"name\\": \\"${repoName}\\", \\"private\\": false, \\"auto_init\\": false}"`
  )
  const lines = response.split('\n')
  const createStatus = lines.at(-1)
  if (createStatus !== '201') {
    console.error(`Failed to create repo ${repo}: ${lines.slice(0, -1).join('\n')}`)
    process.exit(1)
  }
  console.log(`Created repo ${repo}`)
}

const branch = `sync-${repo.replace('/', '-')}`
const pkgInPrefix = path.join(prefix, 'package.json')
const versions = readNuxyVersions()

run(`git subtree split --prefix=${prefix} -b ${branch}`)

if (existsSync(path.join(root, pkgInPrefix))) {
  run(`git checkout ${branch}`)
  try {
    const splitPkgPath = path.join(root, 'package.json')
    const pkg = JSON.parse(readFileSync(splitPkgPath, 'utf8'))
    const changed = rewriteDepsInPackage(pkg, versions, { channel: 'stable' })
    if (changed) {
      writeFileSync(splitPkgPath, JSON.stringify(pkg, null, 2) + '\n')
      run('git add package.json')
      run('git commit --amend --no-edit')
    }
  } finally {
    run('git checkout -')
  }
}

run(`git push https://x-access-token:${token}@github.com/${repo}.git ${branch}:main --force`)
run(`git branch -D ${branch}`)

console.log(`✔ Synced ${repo}`)
