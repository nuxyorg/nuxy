/// <reference types="vite/client" />
import fs from 'fs'
import path from 'path'
import module from 'module'
import { EXTENSION_DIR } from '../config/paths.js'
import { spawnExtension, activeWorkers } from '../spawn/spawn.js'
import { getMainWindow } from '../window/manager.js'
import { registerExtension, clearRegistry } from './registry.js'
import { seedBundledExtensions } from './seed-bundled.js'
import { registerExtensionTheme, clearExtensionThemes } from '../themes/extension-themes.js'
import { registerIconPack, clearIconRegistry } from '../icons/registry.js'
import { kernelLogger } from '@nuxy/core'
import type {
  ExtensionManifest,
  LoadedExtension,
  ThemeDefinition,
  IconPackDefinition,
  ExtensionSettingsSchema,
} from '@nuxy/core'

export { loadedExtensions } from './registry.js'

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
])

const BUILTIN_LIST = new Set([
  ...module.builtinModules,
  ...module.builtinModules.map((m) => `node:${m}`),
])

export function detectNodeImports(code: string): string[] {
  const cleanCode = code
    .replace(/\/\*[\s\S]*?\*\//g, '') // remove multi-line comments
    .replace(/\/\/.*$/gm, '')        // remove single-line comments

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

let watchDebounce: ReturnType<typeof setTimeout> | null = null
let watcherStarted = false

export async function rescanExtensions(): Promise<void> {
  for (const [, worker] of activeWorkers) {
    await worker.terminate()
  }
  activeWorkers.clear()
  await scanExtensions()
  getMainWindow()?.webContents.reload()
}

function startExtensionWatcher(): void {
  if (!import.meta.env.DEV || watcherStarted) return
  if (!fs.existsSync(EXTENSION_DIR)) return
  watcherStarted = true

  fs.watch(EXTENSION_DIR, { recursive: true }, () => {
    if (watchDebounce) clearTimeout(watchDebounce)
    watchDebounce = setTimeout(() => {
      log.info('Extension directory changed — rescanning')
      void rescanExtensions()
    }, 500)
  })
  log.silly('Watching extension directory for changes')
}

export async function scanExtensions(): Promise<void> {
  log.info(`Scanning extension directory: ${EXTENSION_DIR}`)
  clearRegistry()
  clearExtensionThemes()
  clearIconRegistry()

  if (import.meta.env.DEV) {
    try {
      const { copyDefaultExtensions } = await import('../dev/extensions.js')
      copyDefaultExtensions()
    } catch (err) {
      log.error('Failed to run developer-only setup:', err)
    }
  } else {
    seedBundledExtensions()
    if (!fs.existsSync(EXTENSION_DIR)) {
      log.warn(`Extension directory not found — creating: ${EXTENSION_DIR}`)
      fs.mkdirSync(EXTENSION_DIR, { recursive: true })
    }
  }

  const items = fs.readdirSync(EXTENSION_DIR)
  log.silly(`Found ${items.length} item(s) in extension dir`, items)

  for (const folderName of items) {
    const itemPath = path.join(EXTENSION_DIR, folderName)
    if (!fs.statSync(itemPath).isDirectory()) {
      log.silly(`Skipping non-directory item: ${folderName}`)
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
        const details = violations.map(v => `${path.basename(v.file)}: imports ${v.imports.join(', ')}`).join('; ')
        throw new Error(`Security Violation: Extension imports forbidden Node.js built-in module(s) (${details})`)
      }

      const extId = manifest.id || folderName
      if (!manifest.id) {
        log.warn(`Extension "${folderName}" has no manifest.id — using folder name`)
      }

      const loaded: LoadedExtension = {
        id: extId,
        folderName,
        manifest: { ...manifest, id: extId },
      }

      if (manifest.type === 'theme' && manifest.entry?.theme) {
        const themePath = path.join(itemPath, manifest.entry.theme)
        if (fs.existsSync(themePath)) {
          try {
            const def = JSON.parse(fs.readFileSync(themePath, 'utf8')) as ThemeDefinition
            registerExtensionTheme(def)
            log.info(`Loaded theme "${def.name}" from extension: ${extId}`)
          } catch (e) {
            log.error(`Failed to parse theme file for "${extId}"`, e)
          }
        }
      } else if (manifest.type === 'iconpack' && manifest.entry?.icons) {
        const iconsPath = path.join(itemPath, manifest.entry.icons)
        if (fs.existsSync(iconsPath)) {
          try {
            const def = JSON.parse(fs.readFileSync(iconsPath, 'utf8')) as IconPackDefinition
            registerIconPack(def)
            log.info(`Loaded icon pack "${def.name}" from extension: ${extId}`)
          } catch (e) {
            log.error(`Failed to parse icons file for "${extId}"`, e)
          }
        }
      } else if (manifest.type === 'uikit') {
        // uikit extensions are pure renderer-side — no backend worker.
        // The renderer loads their frontend.js early, before the shell bootstrap,
        // allowing them to extend or override window.UI components at runtime.
        if (!manifest.entry?.frontend) {
          log.warn(`UIKit extension "${extId}" has no frontend entry — it will have no effect.`)
        } else {
          log.info(`UIKit extension registered: ${extId} (frontend: ${manifest.entry.frontend})`)
        }
      } else if (manifest.type === 'helper') {
        // helper extensions provide utility services to other extensions.
        // Their frontend (if any) is loaded early alongside uikit extensions.
        // A backend worker is spawned only when a backend entry is declared.
        if (manifest.entry?.backend) {
          log.info(`Loading helper extension: ${extId} (backend: ${manifest.entry.backend})`)
          spawnExtension(extId, folderName, manifest.entry.backend, manifest.permissions ?? [])
          log.info(`Sandboxed worker started for helper: ${extId}`)
        } else {
          log.info(`Helper extension registered: ${extId} (frontend-only)`)
        }
      } else if (manifest.entry?.backend) {
        log.info(`Loading extension: ${extId} (backend: ${manifest.entry.backend})`)
        spawnExtension(extId, folderName, manifest.entry.backend, manifest.permissions ?? [])
        log.info(`Sandboxed worker started for: ${extId}`)
      } else if (manifest.type !== 'theme' && manifest.type !== 'iconpack') {
        log.warn(`Extension "${extId}" has no backend entry — skipping worker.`)
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

      registerExtension(loaded)
    } catch (e) {
      log.error(`Failed to load extension "${folderName}"`, e)
    }
  }

  log.info(`Extension scan complete. Loaded: ${[...activeWorkers.keys()].join(', ') || '(none)'}`)

  startExtensionWatcher()
}
