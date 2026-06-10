import fs from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'
import { EXTENSION_DIR, EXTRACTED_DIR } from '../config/paths.js'
import { spawnExtension, activeWorkers } from '../spawn/spawn.js'
import {
  registerExtension,
  unregisterExtension,
  getExtensionById,
  resolveExtensionId,
} from './registry.js'
import { registerExtensionTheme } from '../themes/extension-themes.js'
import { registerIconPack } from '../icons/registry.js'
import { readDisabledList } from './disabled.js'
import { kernelLogger } from '@nuxy/core'
import {
  verifyDirectoryIntegrity,
  isKeyTrusted,
  isRevoked,
  makeDirectoryReadOnly,
} from '../security/security.js'
import type { ExtensionManifest, LoadedExtension, ExtensionSettingsSchema } from '@nuxy/core'

const log = kernelLogger.child('ExtensionReload')

/** Debounced worker restarts after crash or reload. */
const workerRestartTimers = new Map<string, ReturnType<typeof setTimeout>>()
const folderReloadTimers = new Map<string, ReturnType<typeof setTimeout>>()

/** Suppress crash-restart while intentionally terminating for hot reload. */
const suppressWorkerRestart = new Set<string>()

const activeExtensionWatchers = new Set<fs.FSWatcher>()
const watchedExtensionFolders = new Set<string>()
let devWatchDebounce: ReturnType<typeof setTimeout> | null = null

export function isReloadTriggerFile(filename: string | null, backendEntry?: string): boolean {
  if (!filename) return true
  const base = path.basename(filename)
  if (base === 'manifest.json') return true
  if (base.endsWith('.nuxyext')) return true
  if (backendEntry && base === backendEntry) return true
  return false
}

export function clearExtensionWatchers(): void {
  for (const watcher of activeExtensionWatchers) {
    try {
      watcher.close()
    } catch {}
  }
  activeExtensionWatchers.clear()
  watchedExtensionFolders.clear()
  if (devWatchDebounce) {
    clearTimeout(devWatchDebounce)
    devWatchDebounce = null
  }
}

function readBackendEntry(folderPath: string): string | undefined {
  const manifestPath = path.join(folderPath, 'manifest.json')
  if (!fs.existsSync(manifestPath)) return undefined
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as ExtensionManifest
    return manifest.entry?.backend
  } catch {
    return undefined
  }
}

function watchProductionExtensionFolder(folderName: string): void {
  if (watchedExtensionFolders.has(folderName)) return

  const itemPath = path.join(EXTENSION_DIR, folderName)
  if (!fs.existsSync(itemPath) || !fs.statSync(itemPath).isDirectory()) return

  const backendEntry = readBackendEntry(itemPath)
  try {
    const watcher = fs.watch(itemPath, { recursive: false }, (_event, filename) => {
      if (!isReloadTriggerFile(filename ?? null, backendEntry)) return
      log.info(`Extension folder changed for "${folderName}" — scheduling reload`)
      scheduleFolderReload(folderName)
    })
    activeExtensionWatchers.add(watcher)
    watchedExtensionFolders.add(folderName)
  } catch (err) {
    log.error(`Failed to watch extension folder: ${itemPath}`, err)
  }
}

/** Whether a dev-mode fs.watch event should trigger a full extension rescan. */
export function shouldTriggerDevExtensionRescan(
  filename: string | null,
  extensionsRoot: string,
  readType: (folderName: string) => string | null = (folderName) =>
    readExtensionType(extensionsRoot, folderName)
): boolean {
  // Linux inotify often omits the changed filename — ignore to avoid rescan loops.
  if (!filename) return false

  const topLevel = filename.split(/[/\\]/)[0]
  const folderName = folderNameFromWatchFilename(topLevel)
  if (!folderName) return false

  // Loose shared modules copied to the extensions root are not installable packages.
  if (!filename.includes('/') && !filename.includes('\\') && !filename.endsWith('.nuxyext')) {
    return false
  }

  if (readType(folderName) === 'uikit') return false

  // Mid-write .nuxyext installs can be unreadable briefly — never rescan on that.
  if (filename.endsWith('.nuxyext') && readType(folderName) === null) return false

  return true
}

function readExtensionType(extDir: string, folderName: string): string | null {
  // Case 1: directory-based extension
  const manifestPath = path.join(extDir, folderName, 'manifest.json')
  if (fs.existsSync(manifestPath)) {
    try {
      const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { type?: string }
      return m.type ?? null
    } catch {
      return null
    }
  }

  // Case 2: .nuxyext zip file
  const zipPath = path.join(extDir, `${folderName}.nuxyext`)
  if (fs.existsSync(zipPath)) {
    try {
      const zip = new AdmZip(zipPath)
      const entry = zip.getEntry('manifest.json')
      if (!entry) return null
      const m = JSON.parse(entry.getData().toString('utf8')) as { type?: string }
      return m.type ?? null
    } catch {
      return null
    }
  }

  return null
}

function startDevExtensionWatcher(onRescan: () => void): void {
  const skipDirs = new Set(['node_modules', '.git'])

  let resolvedDir = EXTENSION_DIR
  try {
    resolvedDir = fs.realpathSync(EXTENSION_DIR)
  } catch (err) {
    log.error(`Failed to resolve real path of ${EXTENSION_DIR}:`, err)
  }

  const watchRecursive = (dir: string) => {
    try {
      const watcher = fs.watch(dir, { recursive: false }, (_event, filename) => {
        const shouldRescan = shouldTriggerDevExtensionRescan(filename ?? null, resolvedDir)
        if (!shouldRescan) {
          return
        }

        if (devWatchDebounce) clearTimeout(devWatchDebounce)
        devWatchDebounce = setTimeout(() => {
          log.info('Extension directory changed — rescanning')
          onRescan()
        }, 500)
      })
      activeExtensionWatchers.add(watcher)
    } catch (err) {
      log.error(`Failed to watch directory: ${dir}`, err)
    }

    try {
      for (const item of fs.readdirSync(dir)) {
        if (skipDirs.has(item)) continue
        const fullPath = path.join(dir, item)
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
          watchRecursive(fullPath)
        }
      }
    } catch {}
  }

  log.info(
    `Watching extension directory recursively: ${resolvedDir} (resolved from ${EXTENSION_DIR})`
  )
  watchRecursive(resolvedDir)
}

function startProductionExtensionWatcher(): void {
  try {
    const rootWatcher = fs.watch(EXTENSION_DIR, { recursive: false }, (_event, filename) => {
      const folderName = folderNameFromWatchFilename(filename ?? '')
      if (!folderName) return
      watchProductionExtensionFolder(folderName)
      if (isReloadTriggerFile(filename ?? null)) {
        log.info(`Extension source changed for "${folderName}" — scheduling reload`)
        scheduleFolderReload(folderName)
      }
    })
    activeExtensionWatchers.add(rootWatcher)
  } catch (err) {
    log.error(`Failed to watch extension directory: ${EXTENSION_DIR}`, err)
  }

  try {
    for (const itemName of fs.readdirSync(EXTENSION_DIR)) {
      const itemPath = path.join(EXTENSION_DIR, itemName)
      if (!fs.existsSync(itemPath)) continue
      if (!fs.statSync(itemPath).isDirectory()) continue
      watchProductionExtensionFolder(itemName)
    }
    log.info(`Watching extension directory (production): ${EXTENSION_DIR}`)
  } catch (err) {
    log.error(`Failed to enumerate extension directory: ${EXTENSION_DIR}`, err)
  }
}

export function startExtensionDirectoryWatcher(
  isDev: boolean,
  onDevRescan: () => void = () => {}
): void {
  if (!fs.existsSync(EXTENSION_DIR)) return
  clearExtensionWatchers()
  if (isDev) {
    startDevExtensionWatcher(onDevRescan)
  } else {
    startProductionExtensionWatcher()
  }
}

export function onExtensionWorkerExit(extId: string, code: number): void {
  if (code === 0 || suppressWorkerRestart.has(extId)) return
  log.info(`Extension worker "${extId}" exited with code ${code} — scheduling restart`)
  scheduleWorkerRestart(extId)
}

export function folderNameFromWatchFilename(filename: string): string | null {
  if (!filename || filename.startsWith('.')) return null
  const base = filename.split(/[/\\]/)[0]
  if (!base) return null
  return base.replace(/\.nuxyext$/, '') || null
}

export async function terminateExtensionWorker(extId: string): Promise<void> {
  const worker = activeWorkers.get(extId)
  if (!worker) return
  suppressWorkerRestart.add(extId)
  try {
    await worker.terminate()
    activeWorkers.delete(extId)
  } finally {
    setImmediate(() => suppressWorkerRestart.delete(extId))
  }
}

export function scheduleWorkerRestart(extId: string, delayMs = 500): void {
  const existing = workerRestartTimers.get(extId)
  if (existing) clearTimeout(existing)
  workerRestartTimers.set(
    extId,
    setTimeout(() => {
      workerRestartTimers.delete(extId)
      void restartExtensionWorker(extId)
    }, delayMs)
  )
}

function scheduleFolderReload(folderName: string, delayMs = 500): void {
  const existing = folderReloadTimers.get(folderName)
  if (existing) clearTimeout(existing)
  folderReloadTimers.set(
    folderName,
    setTimeout(() => {
      folderReloadTimers.delete(folderName)
      void reloadExtensionFolder(folderName)
    }, delayMs)
  )
}

export async function restartExtensionWorker(extId: string): Promise<void> {
  const ext = getExtensionById(extId)
  if (!ext || ext.disabled) return
  const backend = ext.manifest.entry?.backend
  if (!backend) return

  await terminateExtensionWorker(extId)
  log.info(`Restarting worker for extension "${extId}"`)
  registerExtensionByType(
    ext.manifest,
    extId,
    ext.folderName,
    path.join(EXTRACTED_DIR, ext.folderName)
  )
}

export async function reloadExtensionFolder(folderName: string): Promise<void> {
  const itemName = resolveExtensionDirItem(folderName)
  if (!itemName) {
    log.warn(`Cannot reload "${folderName}": not found under ${EXTENSION_DIR}`)
    return
  }

  const extId = resolveExtensionId(folderName) ?? folderName
  await terminateExtensionWorker(extId)

  const synced = await syncExtensionItem(itemName, { bypassCache: true })
  if (!synced) {
    log.warn(`Reload skipped: failed to sync "${folderName}" from ${EXTENSION_DIR}`)
    return
  }

  await activateExtractedExtension(folderName)
  log.info(`Reloaded extension folder "${folderName}"`)
}

function resolveExtensionDirItem(folderName: string): string | null {
  const dirPath = path.join(EXTENSION_DIR, folderName)
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    return folderName
  }
  const zipName = `${folderName}.nuxyext`
  const zipPath = path.join(EXTENSION_DIR, zipName)
  if (fs.existsSync(zipPath) && fs.statSync(zipPath).isFile()) {
    return zipName
  }
  return null
}

async function syncExtensionItem(
  itemName: string,
  opts: { bypassCache?: boolean } = {}
): Promise<boolean> {
  const itemPath = path.join(EXTENSION_DIR, itemName)
  if (!fs.existsSync(itemPath)) return false

  const stat = fs.statSync(itemPath)
  const isZip = itemName.endsWith('.nuxyext') && stat.isFile()
  const isDir = stat.isDirectory()
  if (!isZip && !isDir) return false

  const folderName = itemName.replace(/\.nuxyext$/, '')
  const targetPath = path.join(EXTRACTED_DIR, folderName)
  const tempPath = path.join(EXTRACTED_DIR, `.tmp_${folderName}`)

  if (fs.existsSync(tempPath)) {
    fs.rmSync(tempPath, { recursive: true, force: true })
  }
  fs.mkdirSync(tempPath, { recursive: true })

  try {
    if (isZip) {
      const zip = new AdmZip(itemPath)
      zip.extractAllTo(tempPath, true)
    } else {
      fs.cpSync(itemPath, tempPath, { recursive: true })
    }

    const verification = verifyDirectoryIntegrity(tempPath)
    if (!verification.success) {
      log.error(`Reload security check failed for "${folderName}": ${verification.error}`)
      fs.rmSync(tempPath, { recursive: true, force: true })
      return false
    }

    const { publicKey, hash } = verification
    if (!publicKey || !hash) {
      fs.rmSync(tempPath, { recursive: true, force: true })
      return false
    }

    if (isRevoked(folderName, hash, publicKey)) {
      log.error(`Reload blocked: extension "${folderName}" is revoked`)
      fs.rmSync(tempPath, { recursive: true, force: true })
      return false
    }

    if (!isKeyTrusted(publicKey)) {
      log.warn(`Reload blocked: untrusted publisher for "${folderName}"`)
      fs.rmSync(tempPath, { recursive: true, force: true })
      return false
    }

    if (fs.existsSync(targetPath)) {
      restoreWritable(targetPath)
      fs.rmSync(targetPath, { recursive: true, force: true })
    }
    fs.renameSync(tempPath, targetPath)
    makeDirectoryReadOnly(targetPath)
    return true
  } catch (err) {
    log.error(`Failed to sync extension item "${itemName}"`, err)
    if (fs.existsSync(tempPath)) {
      fs.rmSync(tempPath, { recursive: true, force: true })
    }
    return false
  }
}

function restoreWritable(p: string): void {
  try {
    fs.chmodSync(p, 0o755)
    if (fs.statSync(p).isDirectory()) {
      for (const item of fs.readdirSync(p)) {
        restoreWritable(path.join(p, item))
      }
    }
  } catch {}
}

async function activateExtractedExtension(folderName: string): Promise<void> {
  const itemPath = path.join(EXTRACTED_DIR, folderName)
  if (!fs.existsSync(itemPath) || !fs.statSync(itemPath).isDirectory()) return

  const manifestPath = path.join(itemPath, 'manifest.json')
  if (!fs.existsSync(manifestPath)) return

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as ExtensionManifest
    const extId = manifest.id || folderName
    unregisterExtension(extId)

    const disabledSet = readDisabledList()
    const isDisabled = !manifest.bootstrap && disabledSet.has(extId)

    const loaded: LoadedExtension = {
      id: extId,
      folderName,
      manifest: { ...manifest, id: extId },
      ...(isDisabled ? { disabled: true } : {}),
    }

    if (!isDisabled) {
      registerExtensionByType(manifest, extId, folderName, itemPath)
    }

    if (manifest.entry?.settings) {
      const settingsPath = path.join(itemPath, manifest.entry.settings)
      if (fs.existsSync(settingsPath)) {
        try {
          loaded.settingsSchema = JSON.parse(
            fs.readFileSync(settingsPath, 'utf8')
          ) as ExtensionSettingsSchema
        } catch (e) {
          log.error(`Failed to parse settings schema for "${extId}"`, e)
        }
      }
    }

    registerExtension(loaded)
  } catch (e) {
    log.error(`Failed to activate extension "${folderName}" after reload`, e)
  }
}

function registerExtensionByType(
  manifest: ExtensionManifest,
  extId: string,
  folderName: string,
  itemPath: string
): void {
  const { type, entry } = manifest

  if (type === 'theme') {
    if (!entry?.theme) return
    const themePath = path.join(itemPath, entry.theme)
    if (fs.existsSync(themePath)) {
      try {
        const def = JSON.parse(fs.readFileSync(themePath, 'utf8'))
        registerExtensionTheme(def)
      } catch (e) {
        log.error(`Failed to parse theme for "${extId}"`, e)
      }
    }
    return
  }

  if (type === 'iconpack') {
    if (!entry?.icons) return
    const iconsPath = path.join(itemPath, entry.icons)
    if (fs.existsSync(iconsPath)) {
      try {
        const def = JSON.parse(fs.readFileSync(iconsPath, 'utf8'))
        registerIconPack(def)
      } catch (e) {
        log.error(`Failed to parse icon pack for "${extId}"`, e)
      }
    }
    return
  }

  if (type === 'uikit') return

  if (entry?.backend) {
    void spawnExtension(extId, folderName, entry.backend, manifest.permissions ?? [])
  }
}
