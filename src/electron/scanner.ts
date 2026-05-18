/// <reference types="vite/client" />
import fs from 'fs'
import path from 'path'
import { EXTENSION_DIR } from './paths.js'
import { spawnExtension, activeWorkers } from './worker/spawn.js'
import { registerExtension, clearRegistry } from './registry.js'
import { kernelLogger } from '@nuxy/core'
import type {
  ExtensionManifest,
  LoadedExtension
} from '@nuxy/core'

export { loadedExtensions } from './registry.js'

const log = kernelLogger.child('Scanner')

export async function scanExtensions() {
  log.info(`Scanning extension directory: ${EXTENSION_DIR}`)
  clearRegistry()

  if (import.meta.env.DEV) {
    try {
      const { copyDefaultExtensions } = await import('./dev/extensions.js')
      copyDefaultExtensions()
    } catch (err) {
      log.error('Failed to run developer-only setup:', err)
    }
  } else if (!fs.existsSync(EXTENSION_DIR)) {
    log.warn(`Extension directory not found — creating: ${EXTENSION_DIR}`)
    fs.mkdirSync(EXTENSION_DIR, { recursive: true })
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
}
