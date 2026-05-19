/// <reference types="vite/client" />
import fs from 'fs'
import path from 'path'
import { EXTENSION_DIR } from '../config/paths.js'
import { spawnExtension, activeWorkers } from '../spawn/spawn.js'
import { registerExtension, clearRegistry } from './registry.js'
import { seedBundledExtensions } from './seed-bundled.js'
import { kernelLogger } from '@nuxy/core'
import type {
  ExtensionManifest,
  LoadedExtension
} from '@nuxy/core'

export { loadedExtensions } from './registry.js'

const log = kernelLogger.child('Scanner')

let watchDebounce: ReturnType<typeof setTimeout> | null = null
let watcherStarted = false

export async function rescanExtensions(): Promise<void> {
  for (const [, worker] of activeWorkers) {
    await worker.terminate()
  }
  activeWorkers.clear()
  await scanExtensions()
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
      const manifest = JSON.parse(
        fs.readFileSync(manifestPath, 'utf8')
      ) as ExtensionManifest
      log.silly(`Parsed manifest for "${folderName}"`, manifest)

      const extId = manifest.id || folderName
      if (!manifest.id) {
        log.warn(
          `Extension "${folderName}" has no manifest.id — using folder name`
        )
      }

      const loaded: LoadedExtension = {
        id: extId,
        folderName,
        manifest: { ...manifest, id: extId }
      }

      if (manifest.entry?.backend) {
        log.info(
          `Loading extension: ${extId} (backend: ${manifest.entry.backend})`
        )
        spawnExtension(extId, folderName, manifest.entry.backend)
        log.info(`Sandboxed worker started for: ${extId}`)
      } else {
        log.warn(`Extension "${extId}" has no backend entry — skipping worker.`)
      }

      registerExtension(loaded)
    } catch (e) {
      log.error(`Failed to load extension "${folderName}"`, e)
    }
  }

  log.info(
    `Extension scan complete. Loaded: ${[...activeWorkers.keys()].join(', ') || '(none)'}`
  )

  startExtensionWatcher()
}
