/// <reference types="vite/client" />
import fs from 'fs'
import path from 'path'
import module from 'module'
import { dialog } from 'electron'
import { EXTENSION_DIR, EXTRACTED_DIR } from '../config/paths.js'
import { scoreExtensionFolder } from '../protocol/resolve.js'
import { spawnExtension } from '../spawn/spawn.js'
import { getMainWindow } from '../window/manager.js'
import { sha256 } from '../security/sign-tool.js'
import {
  isKeyTrusted,
  addTrustedKey,
  isRevoked,
  verifyDirectoryIntegrity,
  makeDirectoryReadOnly,
} from '../security/security.js'
import { kernelLogger } from '@nuxyorg/core'
import { invokeRescan } from './rescan-hook.js'
import { readDisabledList } from './disabled.js'
import { registerExtension } from './registry.js'
import { registerExtensionByType } from './worker-manager.js'
import { seedBundledExtensions } from './seed-bundled.js'
import AdmZip from 'adm-zip'
import type { ExtensionManifest, LoadedExtension, ExtensionSettingsSchema } from '@nuxyorg/core'

const log = kernelLogger.child('Scanner')

export const ALLOWED_PERMISSIONS = new Set([
  'storage',
  'clipboard',
  'network',
  'notifications',
  'media',
  'shell',
  'db',
  'fs',
  'settings.read',
  'settings.write',
  'extensions.manage',
])

const BUILTIN_LIST = new Set([
  ...module.builtinModules,
  ...module.builtinModules.map((m) => `node:${m}`),
])

export function detectNodeImports(code: string): string[] {
  const cleanCode = code
    .replace(/\/\*[\s\S]*?\*\//g, '') // remove multi-line comments
    .replace(/\/\/.*$/gm, '') // remove single-line comments

  const found: string[] = []

  // 1. Match ES imports:
  // e.g. import fs from 'fs';
  const esImportRegex = /\bimport\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g
  let match: RegExpExecArray | null
  while ((match = esImportRegex.exec(cleanCode)) !== null) {
    const importPath = match[1]
    const baseModule = importPath.split('/')[0]
    if (BUILTIN_LIST.has(importPath) || BUILTIN_LIST.has(baseModule)) {
      found.push(importPath)
    }
  }

  // 2. Match requires:
  // e.g. require('fs');
  const requireRegex = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  while ((match = requireRegex.exec(cleanCode)) !== null) {
    const importPath = match[1]
    const baseModule = importPath.split('/')[0]
    if (BUILTIN_LIST.has(importPath) || BUILTIN_LIST.has(baseModule)) {
      found.push(importPath)
    }
  }

  // 3. Match dynamic imports:
  // e.g. import('fs');
  const dynamicImportRegex = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  while ((match = dynamicImportRegex.exec(cleanCode)) !== null) {
    const importPath = match[1]
    const baseModule = importPath.split('/')[0]
    if (BUILTIN_LIST.has(importPath) || BUILTIN_LIST.has(baseModule)) {
      found.push(importPath)
    }
  }

  return [...new Set(found)]
}

export function scanDirectoryForNodeImports(dir: string): { file: string; imports: string[] }[] {
  const violations: { file: string; imports: string[] }[] = []

  function walk(currentDir: string) {
    if (!fs.existsSync(currentDir)) return
    const items = fs.readdirSync(currentDir)
    for (const item of items) {
      const itemPath = path.join(currentDir, item)
      const stat = fs.statSync(itemPath)

      if (stat.isDirectory()) {
        if (
          item === 'node_modules' ||
          item === '.git' ||
          item === 'scripts' ||
          item === 'dist' ||
          item === 'build'
        ) {
          continue
        }
        walk(itemPath)
      } else if (stat.isFile()) {
        if (item.startsWith('.') || item.includes('.config.')) {
          continue
        }
        if (
          /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(item) &&
          !item.endsWith('.test.ts') &&
          !item.endsWith('.spec.ts') &&
          !item.endsWith('.test.js') &&
          !item.endsWith('.spec.js')
        ) {
          try {
            const content = fs.readFileSync(itemPath, 'utf8')
            const imports = detectNodeImports(content)
            if (imports.length > 0) {
              violations.push({ file: itemPath, imports })
            }
          } catch (err) {
            log.error(`Failed to scan file for Node imports: ${itemPath}`, err)
          }
        }
      }
    }
  }

  walk(dir)
  return violations
}

export function restoreWritable(p: string): void {
  try {
    fs.chmodSync(p, 0o755)
    if (fs.statSync(p).isDirectory()) {
      for (const item of fs.readdirSync(p)) {
        restoreWritable(path.join(p, item))
      }
    }
  } catch {}
}

export function dedupeExtractedByManifestId(activeFolders: Set<string>): void {
  const byExtId = new Map<string, Array<{ folderName: string; score: number }>>()

  for (const folderName of activeFolders) {
    const itemPath = path.join(EXTRACTED_DIR, folderName)
    const manifestPath = path.join(itemPath, 'manifest.json')
    if (!fs.existsSync(manifestPath)) continue
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { id?: string }
      const extId = manifest.id || folderName
      const score = scoreExtensionFolder(itemPath, folderName)
      const list = byExtId.get(extId) ?? []
      list.push({ folderName, score })
      byExtId.set(extId, list)
    } catch {
      /* skip unreadable manifests */
    }
  }

  for (const folders of byExtId.values()) {
    if (folders.length <= 1) continue
    folders.sort((a, b) => b.score - a.score)
    for (const loser of folders.slice(1)) {
      const fullPath = path.join(EXTRACTED_DIR, loser.folderName)
      try {
        restoreWritable(fullPath)
        fs.rmSync(fullPath, { recursive: true, force: true })
        activeFolders.delete(loser.folderName)
        log.info(`Removed duplicate extract folder: ${loser.folderName}`)
      } catch (err) {
        log.warn(`Failed to remove duplicate extract folder: ${loser.folderName}`, err)
      }
    }
  }
}

export function promptTrustPublisherKey(extensionId: string, publicKeyPem: string): boolean {
  if (process.env.NODE_ENV === 'test') {
    return true
  }
  const win = getMainWindow()
  const hash = sha256(publicKeyPem)
  try {
    const choice = dialog.showMessageBoxSync(win!, {
      type: 'warning',
      buttons: ['Trust & Install', 'Block'],
      defaultId: 0,
      title: 'Untrusted Publisher Key',
      message: `Extension "${extensionId}" is signed by an untrusted publisher key.\n\nKey Hash: ${hash}\n\nDo you want to trust this publisher and install the extension?`,
    })
    return choice === 0
  } catch (err) {
    log.error('Failed to show message box dialog (auto-blocking publisher key):', err)
    return false
  }
}

/**
 * Phase 3 + Phase 4: Verify directory integrity, check revocation, prompt for publisher trust,
 * and enforce read-only permissions on the final target path.
 *
 * Returns `{ trusted: true }` when the extension passed all checks and has been moved to
 * `targetPath` with read-only permissions applied.
 * Returns `{ trusted: false, reason }` when the extension must be skipped (tempPath is already
 * cleaned up by this function before returning).
 * Throws on unexpected fatal errors.
 */
export async function verifyAndSecureExtension(
  folderName: string,
  tempPath: string,
  targetPath: string
): Promise<{ trusted: boolean; reason?: string }> {
  // 1. Verify directory integrity & signature
  const verification = verifyDirectoryIntegrity(tempPath)
  if (!verification.success) {
    log.error(`Security validation failed for "${folderName}": ${verification.error}`)
    fs.rmSync(tempPath, { recursive: true, force: true })
    return { trusted: false, reason: verification.error }
  }

  const { publicKey, hash } = verification
  if (!publicKey || !hash) {
    log.error(`Security check for "${folderName}" returned empty signature properties.`)
    fs.rmSync(tempPath, { recursive: true, force: true })
    return { trusted: false, reason: 'Empty signature properties' }
  }

  // 2. Check revocation list
  if (isRevoked(folderName, hash, publicKey)) {
    log.error(`Security Violation: Extension "${folderName}" is revoked/blacklisted.`)
    fs.rmSync(tempPath, { recursive: true, force: true })
    return { trusted: false, reason: 'Revoked/blacklisted' }
  }

  // 3. Verify public key trust (Self-Signed user approval prompt)
  const trusted = isKeyTrusted(publicKey)
  if (!trusted) {
    const approved = promptTrustPublisherKey(folderName, publicKey)
    if (approved) {
      addTrustedKey(publicKey)
      log.info(
        `Publisher key trusted for "${folderName}". Restarting scan to initialize extensions cleanly.`
      )
      setTimeout(() => {
        void invokeRescan()
      }, 100)
      fs.rmSync(tempPath, { recursive: true, force: true })
      // Signal to caller that a rescan was triggered and the current scan should abort
      return { trusted: false, reason: 'rescan-triggered' }
    } else {
      log.warn(`Installation blocked: Publisher key for "${folderName}" is untrusted.`)
      fs.rmSync(tempPath, { recursive: true, force: true })
      return { trusted: false, reason: 'Publisher key untrusted' }
    }
  }

  // Move temp folder to final destination path
  if (fs.existsSync(targetPath)) {
    // Restore write permissions before removal — makeDirectoryReadOnly sets 0o555
    // and rmSync cannot delete files inside read-only directories on Linux.
    restoreWritable(targetPath)
    fs.rmSync(targetPath, { recursive: true, force: true })
  }
  fs.renameSync(tempPath, targetPath)

  // 4. Enforce read-only permissions
  makeDirectoryReadOnly(targetPath)

  return { trusted: true }
}

/**
 * Extracts `.nuxyext` zips / copies plain folders from `EXTENSION_DIR` into
 * `EXTRACTED_DIR`, running integrity verification on each new/changed item.
 *
 * Returns the set of folder names that are active after this pass, the
 * updated state cache to persist, and whether a publisher-trust prompt
 * triggered a rescan (in which case the caller must abort the current scan).
 */
export async function extractAndSecureExtensions(
  items: string[],
  stateCache: Record<string, string>
): Promise<{
  activeFolders: Set<string>
  newStateCache: Record<string, string>
  aborted: boolean
}> {
  const activeFolders = new Set<string>()
  const newStateCache: Record<string, string> = {}

  for (const itemName of items) {
    const itemPath = path.join(EXTENSION_DIR, itemName)
    try {
      const stat = fs.statSync(itemPath)
      const isZip = itemName.endsWith('.nuxyext') && stat.isFile()
      const isDir = stat.isDirectory()

      if (!isZip && !isDir) continue

      const folderName = itemName.replace(/\.nuxyext$/, '')
      const targetPath = path.join(EXTRACTED_DIR, folderName)

      // Calculate ZIP hash for state cache (if zip)
      let zipHash = ''
      if (isZip) {
        zipHash = sha256(fs.readFileSync(itemPath))
      }

      // Check state cache to see if we can skip verification/extraction
      const isCached = isZip && stateCache[folderName] === zipHash && fs.existsSync(targetPath)

      if (isCached) {
        log.info(`Extension "${folderName}" verified via state cache (Skipped extraction).`)
        newStateCache[folderName] = zipHash
        activeFolders.add(folderName)
        continue
      }

      // Extract to a temp folder first for verification
      const tempPath = path.join(EXTRACTED_DIR, `.tmp_${folderName}`)
      if (fs.existsSync(tempPath)) {
        fs.rmSync(tempPath, { recursive: true, force: true })
      }
      fs.mkdirSync(tempPath, { recursive: true })

      if (isZip) {
        const zip = new AdmZip(itemPath)
        zip.extractAllTo(tempPath, true)
      } else {
        fs.cpSync(itemPath, tempPath, { recursive: true })
      }

      const secResult = await verifyAndSecureExtension(folderName, tempPath, targetPath)
      if (!secResult.trusted) {
        if (secResult.reason === 'rescan-triggered') {
          return { activeFolders, newStateCache, aborted: true }
        }
        continue
      }

      log.info(`Extracted packaged extension: ${itemName} → ${targetPath}`)
      if (isZip) {
        newStateCache[folderName] = zipHash
      }
      activeFolders.add(folderName)
    } catch (err) {
      log.error(`Failed to process extension item ${itemName}:`, err)
    }
  }

  return { activeFolders, newStateCache, aborted: false }
}

/**
 * Parses each extracted extension's manifest, validates permissions and the
 * Node-builtin-import security scan, dispatches type-based registration via
 * `registerExtensionByType`, and registers the result in the extension
 * registry. Mirrors the original `scanExtensions()` registration loop.
 */
export function loadAndRegisterExtensions(extractedItems: string[]): void {
  for (const folderName of extractedItems) {
    if (folderName.startsWith('.')) {
      log.silly(`Skipping hidden/temp folder in EXTRACTED_DIR: ${folderName}`)
      continue
    }
    const itemPath = path.join(EXTRACTED_DIR, folderName)
    if (!fs.statSync(itemPath).isDirectory()) {
      log.silly(`Skipping non-directory extracted item: ${folderName}`)
      continue
    }

    const manifestPath = path.join(itemPath, 'manifest.json')
    if (!fs.existsSync(manifestPath)) {
      log.silly(`No manifest.json for: ${folderName} — skipping.`)
      continue
    }

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as ExtensionManifest
      log.silly(`Parsed manifest for "${folderName}"`, manifest)

      // Validate permissions
      if (manifest.permissions) {
        if (!Array.isArray(manifest.permissions)) {
          throw new Error('Manifest validation failed: "permissions" must be an array of strings')
        }
        for (const p of manifest.permissions) {
          if (typeof p !== 'string' || !ALLOWED_PERMISSIONS.has(p)) {
            throw new Error(`Manifest validation failed: Invalid permission "${p}"`)
          }
        }
      }

      // Security check: Scan for forbidden Node.js built-in imports
      const violations = scanDirectoryForNodeImports(itemPath)
      if (violations.length > 0) {
        const details = violations
          .map((v) => `${path.basename(v.file)}: imports ${v.imports.join(', ')}`)
          .join('; ')
        throw new Error(
          `Security Violation: Extension imports forbidden Node.js built-in module(s) (${details})`
        )
      }

      const extId = manifest.id || folderName
      if (!manifest.id) {
        log.warn(`Extension "${folderName}" has no manifest.id — using folder name`)
      }

      const disabledSet = readDisabledList()
      const isDisabled = !manifest.bootstrap && disabledSet.has(extId)

      const loaded: LoadedExtension = {
        id: extId,
        folderName,
        manifest: { ...manifest, id: extId },
        ...(isDisabled ? { disabled: true } : {}),
      }

      if (isDisabled) {
        log.info(`Extension "${extId}" is disabled — skipping activation`)
      } else {
        registerExtensionByType(manifest, extId, folderName, itemPath, spawnExtension)
      }

      if (manifest.entry?.settings) {
        const settingsPath = path.join(itemPath, manifest.entry.settings)
        if (fs.existsSync(settingsPath)) {
          try {
            const schema = JSON.parse(
              fs.readFileSync(settingsPath, 'utf8')
            ) as ExtensionSettingsSchema
            loaded.settingsSchema = schema
            log.info(`Loaded settings schema for extension: ${extId}`)
          } catch (e) {
            log.error(`Failed to parse settings schema for "${extId}"`, e)
          }
        }
      }

      if (manifest.locales) {
        const localesDir = manifest.locales.dir ?? 'locales'
        for (const locale of manifest.locales.supported) {
          const localePath = path.join(itemPath, localesDir, `${locale}.json`)
          if (!fs.existsSync(localePath)) {
            log.warn(
              `Extension "${extId}" declares locale "${locale}" but "${localesDir}/${locale}.json" was not found`
            )
          }
        }
        const defaultPath = path.join(itemPath, localesDir, `${manifest.locales.default}.json`)
        if (!fs.existsSync(defaultPath)) {
          log.error(
            `Extension "${extId}" default locale "${manifest.locales.default}" has no translation file — i18n will not work`
          )
        }
        log.info(
          `Extension "${extId}" supports locales: [${manifest.locales.supported.join(', ')}], default: ${manifest.locales.default}`
        )
      }

      registerExtension(loaded)
    } catch (e) {
      log.error(`Failed to load extension "${folderName}"`, e)
    }
  }
}

/** Seeds/prepares EXTENSION_DIR and EXTRACTED_DIR, returning the items found in EXTENSION_DIR. */
export function prepareExtensionDirs(): string[] {
  try {
    if (!fs.existsSync(EXTRACTED_DIR)) {
      fs.mkdirSync(EXTRACTED_DIR, { recursive: true })
    }
  } catch (err) {
    log.error(`Failed to initialize extracted directory ${EXTRACTED_DIR}:`, err)
  }

  // Copy shared loose files (e.g. ui-hooks.ts) from EXTENSION_DIR root to EXTRACTED_DIR.
  // These are not packaged extensions — they're shared modules imported by extension frontends.
  try {
    for (const name of fs.readdirSync(EXTENSION_DIR)) {
      const src = path.join(EXTENSION_DIR, name)
      if (fs.statSync(src).isFile() && !name.endsWith('.nuxyext')) {
        fs.copyFileSync(src, path.join(EXTRACTED_DIR, name))
      }
    }
  } catch (err) {
    log.warn('Failed to copy shared extension files to extracted dir:', err)
  }

  if (import.meta.env.DEV) {
    // In dev mode, the symlink-extensions Vite plugin handles zipping extensions
    // into .nuxyext files in dist/extensions and symlinking it to EXTENSION_DIR.
  } else {
    seedBundledExtensions()
    if (!fs.existsSync(EXTENSION_DIR)) {
      log.warn(`Extension directory not found — creating: ${EXTENSION_DIR}`)
      fs.mkdirSync(EXTENSION_DIR, { recursive: true })
    }
  }

  const items = fs.readdirSync(EXTENSION_DIR)
  log.silly(`Found ${items.length} item(s) in extension dir`, items)
  return items
}

/** Removes EXTRACTED_DIR entries that are no longer active (including leftover .tmp_ folders). */
export function cleanStaleExtractedFolders(activeFolders: Set<string>): void {
  try {
    const extractedDirs = fs.readdirSync(EXTRACTED_DIR)
    for (const extDir of extractedDirs) {
      if (activeFolders.has(extDir)) continue
      const fullPath = path.join(EXTRACTED_DIR, extDir)
      try {
        if (fs.statSync(fullPath).isDirectory()) {
          restoreWritable(fullPath)
          fs.rmSync(fullPath, { recursive: true, force: true })
          log.info(`Cleaned stale extracted folder: ${extDir}`)
        }
      } catch (err) {
        log.warn(`Failed to clean stale folder: ${extDir}`, err)
      }
    }
  } catch {}
}
