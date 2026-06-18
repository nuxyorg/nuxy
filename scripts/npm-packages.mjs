#!/usr/bin/env node
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Publish order — dependencies first. */
export const NPM_PACKAGES = [
  { dir: 'packages/core', repo: 'nuxyorg/core' },
  { dir: 'packages/extension-sdk', repo: 'nuxyorg/extension-sdk' },
  { dir: 'extensions/ui-default', repo: 'nuxyorg/ui-default' },
  { dir: 'packages/nxt', repo: 'nuxyorg/nxt' },
  { dir: 'packages/ext-devserver', repo: 'nuxyorg/ext-devserver' },
]

export const EXTENSION_SYNC_TARGETS = [
  { dir: 'extensions/calculator', repo: 'nuxyorg/ext-calculator' },
  { dir: 'extensions/file-transfer', repo: 'nuxyorg/ext-file-transfer' },
  { dir: 'extensions/gradient', repo: 'nuxyorg/ext-gradient' },
  { dir: 'extensions/icon-browser', repo: 'nuxyorg/ext-icon-browser' },
  { dir: 'extensions/icons-default', repo: 'nuxyorg/ext-icons-default' },
  { dir: 'extensions/notes', repo: 'nuxyorg/ext-notes' },
  { dir: 'extensions/nyaa', repo: 'nuxyorg/ext-nyaa' },
  { dir: 'extensions/settings', repo: 'nuxyorg/ext-settings' },
  { dir: 'extensions/shell', repo: 'nuxyorg/ext-shell' },
  { dir: 'extensions/theme-sakura', repo: 'nuxyorg/ext-theme-sakura' },
]

export function readPackageJson(dir) {
  const pkgPath = path.join(root, dir, 'package.json')
  return JSON.parse(readFileSync(pkgPath, 'utf8'))
}

/** @returns {Record<string, string>} */
export function readNuxyVersions() {
  const versions = {}
  for (const pkg of NPM_PACKAGES) {
    const manifest = readPackageJson(pkg.dir)
    versions[manifest.name] = manifest.version
  }
  return versions
}
