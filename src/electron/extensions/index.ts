import fs from 'fs'
import { EXTENSION_DIR, EXTRACTED_DIR } from '../config/paths.js'
import { activeWorkers } from '../spawn/spawn.js'
import { workerExitListeners, workerRegistryErrorListeners } from '../spawn/active-workers.js'
import {
  onExtensionWorkerExit,
  clearExtensionWatchers,
  terminateExtensionWorker,
} from './extension-reload.js'
import { getMainWindow } from '../window/manager.js'
import { setRescanFn } from './rescan-hook.js'
import { clearRegistry, markFailed } from './registry.js'
import { clearExtensionThemes } from './theme-registrar.js'
import { clearIconRegistry } from './icon-registrar.js'
import { loadStateCache, saveStateCache, updateRevocationList } from '../security/security.js'
import { kernelLogger } from '@nuxyorg/core'
import {
  dedupeExtractedByManifestId,
  prepareExtensionDirs,
  cleanStaleExtractedFolders,
  extractAndSecureExtensions,
  loadAndRegisterExtensions,
} from './manifest-loader.js'
import { startExtensionWatcher } from './dev-sync.js'

export { loadedExtensions } from './registry.js'
export { detectNodeImports } from './manifest-loader.js'

const log = kernelLogger.child('Scanner')

export async function rescanExtensions(): Promise<void> {
  const workerIds = [...activeWorkers.keys()]
  clearExtensionWatchers()
  for (const extId of workerIds) {
    await terminateExtensionWorker(extId)
  }
  await scanExtensions()
  getMainWindow()?.webContents.reload()
}

setRescanFn(rescanExtensions)

workerExitListeners.add(onExtensionWorkerExit)

workerRegistryErrorListeners.add((extId) => {
  log.info(`Extension "${extId}" failed to register — restart scheduled on worker exit`)
  markFailed(extId, 'Failed to register with the extension host')
})

export async function scanExtensions(): Promise<void> {
  log.info(`Scanning extension directory: ${EXTENSION_DIR}`)
  clearRegistry()
  clearExtensionThemes()
  clearIconRegistry()

  // Update revocation list in background (fails silently if offline)
  await updateRevocationList().catch(() => {})

  const stateCache = loadStateCache()
  const items = prepareExtensionDirs()

  const { activeFolders, newStateCache, aborted } = await extractAndSecureExtensions(
    items,
    stateCache
  )
  if (aborted) return // Publisher-trust prompt triggered a rescan; abort this run cleanly.

  // When both legacy (com.nuxy.foo) and versioned (com.nuxy.foo-1.0.0) extracts exist, keep the best one.
  dedupeExtractedByManifestId(activeFolders)

  cleanStaleExtractedFolders(activeFolders)
  saveStateCache(newStateCache)

  const extractedItems = fs.readdirSync(EXTRACTED_DIR)
  log.silly(`Found ${extractedItems.length} extracted item(s) in EXTRACTED_DIR`, extractedItems)
  loadAndRegisterExtensions(extractedItems)

  log.info(`Extension scan complete. Loaded: ${[...activeWorkers.keys()].join(', ') || '(none)'}`)

  startExtensionWatcher()
}
