import { Worker } from 'worker_threads'
import path from 'path'
import fs from 'fs'
import { pathToFileURL, fileURLToPath } from 'url'
import { EXTRACTED_DIR } from '../config/paths.js'
import { bundleExtensionBackend } from '../extensions/bundle-backend.js'
import { kernelLogger } from '@nuxyorg/core'
import {
  activeWorkers,
  workerExitListeners,
  workerRegistryErrorListeners,
  suppressedWorkerExits,
} from './active-workers.js'
import { migrateLegacyData } from './migrate-data.js'
import {
  mergeRuntimeSync,
  clearFailed,
  markFailed,
  getExtensionById,
  validateIpcSync,
} from '../extensions/registry.js'
import { handleHostCall } from './host-handlers.js'
import type { WorkerToHostMessage } from '@nuxyorg/core'

export { activeWorkers } from './active-workers.js'

const log = kernelLogger.child('Spawn')

/** dist-electron/worker/extension-host.js (built from @nuxyorg/extension-host) */
const hostScript = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'worker',
  'extension-host.js'
)

export async function spawnExtension(
  extId: string,
  folderName: string,
  entryFile: string,
  permissions: string[] = []
): Promise<Worker> {
  const extDir = path.join(EXTRACTED_DIR, folderName)
  const entryPath = path.join(extDir, entryFile)

  // If the packaging step pre-bundled the backend (extension had its own npm deps),
  // use that artifact directly. Otherwise fall back to runtime bundleExtensionBackend.
  const preBundlePath = path.join(extDir, '_backend.bundle.mjs')
  const bundledPath = fs.existsSync(preBundlePath)
    ? preBundlePath
    : await bundleExtensionBackend(entryPath, extDir)
  log.info(
    `Spawning worker for extension "${extId}" (folder: ${folderName}) → ${entryPath} (bundled: ${bundledPath})`
  )

  migrateLegacyData(extId, folderName)

  const logLevel = process.env.LOG_LEVEL ?? 'warn'

  const worker = new Worker(hostScript, {
    workerData: {
      extId,
      absolutePath: pathToFileURL(bundledPath).href,
      extDir,
      logLevel,
      permissions,
    },
  })

  worker.on('message', async (msg: WorkerToHostMessage) => {
    if (!msg) return

    if (msg.type === 'registry:sync') {
      const ext = getExtensionById(extId)
      if (ext) {
        const validation = validateIpcSync(extId, ext.manifest.ipc, {
          publicIpcChannels: msg.publicIpcChannels ?? [],
        })
        for (const warning of validation.warnings) {
          log.warn(`IPC surface warning for "${extId}": ${warning}`)
        }
        if (!validation.ok) {
          const message = validation.errors.join('; ')
          log.error(`IPC surface violation for "${extId}": ${message}`)
          markFailed(extId, message)
          return
        }
      }

      mergeRuntimeSync(extId, {
        ipcChannels: msg.ipcChannels ?? [],
        privateIpcChannels: msg.privateIpcChannels ?? [],
        publicIpcChannels: msg.publicIpcChannels ?? [],
        displayName: msg.displayName,
        registeredEntries: msg.registeredEntries,
      })
      clearFailed(extId)
      log.silly(`Registry sync for "${extId}"`, msg.ipcChannels)
      return
    }

    if (msg.type === 'registry:error') {
      log.error(`Extension "${extId}" failed to load: ${msg.error}`)
      activeWorkers.delete(extId)
      for (const listener of workerRegistryErrorListeners) {
        try {
          listener(extId)
        } catch (err) {
          log.error(`Registry error listener failed for "${extId}"`, err)
        }
      }
      return
    }

    if (msg.type !== 'host:call') return
    const { id, channel, payload } = msg
    const reply = await handleHostCall(extId, channel, payload)
    worker.postMessage({ kind: 'reply', type: 'host:reply', id, ...reply })
  })

  worker.on('error', (err: Error) => {
    log.error(`Worker for "${extId}" emitted an error`, {
      message: err.message,
      stack: err.stack,
    })
    activeWorkers.delete(extId)
    for (const listener of workerRegistryErrorListeners) {
      try {
        listener(extId)
      } catch (e) {
        log.error(`Registry error listener failed for "${extId}"`, e)
      }
    }
  })

  worker.on('exit', (code) => {
    if (code !== 0 && !suppressedWorkerExits.has(extId)) {
      log.warn(`Worker for "${extId}" exited with code ${code}`)
    } else {
      log.silly(`Worker for "${extId}" exited cleanly.`)
    }
    for (const [key, val] of activeWorkers.entries()) {
      if (val === worker) activeWorkers.delete(key)
    }
    for (const listener of workerExitListeners) {
      try {
        listener(extId, code)
      } catch (err) {
        log.error(`Worker exit listener failed for "${extId}"`, err)
      }
    }
  })

  worker.setMaxListeners(100)
  activeWorkers.set(extId, worker)
  log.silly(`Worker registered. Active: ${[...activeWorkers.keys()].join(', ')}`)
  return worker
}
