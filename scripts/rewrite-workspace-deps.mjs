#!/usr/bin/env node
/**
 * Replace workspace:* @nuxyorg/* deps with semver ranges for split-repo / npm publish.
 *
 * Usage: node scripts/rewrite-workspace-deps.mjs <path/to/package.json>
 */
import { readFileSync, writeFileSync } from 'fs'
import { readNuxyVersions } from './npm-packages.mjs'

/**
 * @param {Record<string, unknown>} pkg
 * @param {Record<string, string>} versions
 * @param {{ channel?: 'stable' | 'nightly' }} opts
 * @returns {boolean}
 */
export function rewriteDepsInPackage(pkg, versions, { channel = 'stable' } = {}) {
  let changed = false

  function depSpec(version) {
    return channel === 'nightly' ? version : `^${version}`
  }

  function rewriteSection(section) {
    if (!section || typeof section !== 'object') return
    for (const [name, spec] of Object.entries(section)) {
      if (!name.startsWith('@nuxyorg/')) continue
      if (typeof spec !== 'string' || !spec.startsWith('workspace:')) continue
      const version = versions[name]
      if (!version) {
        console.warn(`No version found for ${name}; leaving ${spec}`)
        continue
      }
      section[name] = depSpec(version)
      changed = true
      console.log(`  ${name}: ${spec} → ${section[name]}`)
    }
  }

  rewriteSection(pkg.dependencies)
  rewriteSection(pkg.devDependencies)
  rewriteSection(pkg.peerDependencies)
  return changed
}

/**
 * @param {string} pkgPath
 * @param {Record<string, string>} [versions]
 * @param {{ channel?: 'stable' | 'nightly' }} [opts]
 * @returns {boolean}
 */
export function rewriteWorkspaceDeps(pkgPath, versions = readNuxyVersions(), opts = {}) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  const changed = rewriteDepsInPackage(pkg, versions, opts)
  if (changed) {
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
    console.log(`Rewrote workspace deps in ${pkgPath}`)
  } else {
    console.log(`No workspace deps to rewrite in ${pkgPath}`)
  }
  return changed
}

if (process.argv[1]?.endsWith('rewrite-workspace-deps.mjs')) {
  const pkgPath = process.argv[2]
  if (!pkgPath) {
    console.error('Usage: node scripts/rewrite-workspace-deps.mjs <package.json>')
    process.exit(1)
  }
  rewriteWorkspaceDeps(pkgPath)
}
